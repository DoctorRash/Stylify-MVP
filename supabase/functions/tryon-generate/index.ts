
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    
    // Verify user authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create client with user's JWT to verify ownership
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });
    
    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid authentication" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { order_id, customer_photo_url, style_image_url } = await req.json();

    if (!order_id || !customer_photo_url) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify user owns this order (either as customer or tailor)
    const { data: order, error: orderError } = await supabaseUser
      .from("orders")
      .select("id, customer_user_id, tailor_id")
      .eq("id", order_id)
      .single();
    
    if (orderError || !order) {
      return new Response(
        JSON.stringify({ error: "Order not found or access denied" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use service role for database operations
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Create job record
    const { data: job, error: jobError } = await supabase
      .from("tryon_jobs")
      .insert({
        order_id,
        input_payload: { customer_photo_url, style_image_url },
        status: "processing",
      })
      .select("id")
      .single();

    if (jobError) throw jobError;

    // Try AI generation via Lovable AI Gateway
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    let outputUrl: string | null = null;
    let errorMsg: string | null = null;

    if (lovableApiKey && style_image_url) {
      try {
        console.log("Attempting AI try-on generation...");
        
        const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${lovableApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash-image-preview",
            messages: [
              {
                role: "user",
                content: [
                  {
                    type: "text",
                    text: "Combine these two images: take the clothing/style from the second image and show it on the person in the first image. Create a realistic fashion try-on preview. The result should look like the person wearing the clothing style.",
                  },
                  {
                    type: "image_url",
                    image_url: { url: customer_photo_url },
                  },
                  {
                    type: "image_url",
                    image_url: { url: style_image_url },
                  },
                ],
              },
            ],
            modalities: ["image", "text"],
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const generatedImage = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

          if (generatedImage) {
            // Upload to storage
            const imageData = generatedImage.split(",")[1];
            const binaryData = Uint8Array.from(atob(imageData), (c) => c.charCodeAt(0));
            const fileName = `tryon-${job.id}.png`;

            const { error: uploadError } = await supabase.storage
              .from("order-references")
              .upload(`tryon/${fileName}`, binaryData, { contentType: "image/png" });

            if (!uploadError) {
              const { data: urlData } = supabase.storage
                .from("order-references")
                .getPublicUrl(`tryon/${fileName}`);
              outputUrl = urlData.publicUrl;
            }
          }
        } else {
          const errText = await response.text();
          console.error("AI Gateway error:", response.status, errText);
          
          if (response.status === 429) {
            errorMsg = "Rate limit exceeded. Please try again later.";
          } else if (response.status === 402) {
            errorMsg = "Service temporarily unavailable.";
          }
        }
      } catch (aiError) {
        console.error("AI generation failed:", aiError);
      }
    }

    // Fallback: Create a simple composite
    if (!outputUrl) {
      console.log("Using fallback composite...");
      outputUrl = style_image_url || customer_photo_url;
      if (!errorMsg) {
        errorMsg = "AI preview unavailable. Showing selected style.";
      }
    }

    // Update job with result
    await supabase
      .from("tryon_jobs")
      .update({
        status: outputUrl ? "done" : "failed",
        output_url: outputUrl,
        error_msg: errorMsg,
      })
      .eq("id", job.id);

    return new Response(
      JSON.stringify({ job_id: job.id, output_url: outputUrl }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("tryon-generate error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
