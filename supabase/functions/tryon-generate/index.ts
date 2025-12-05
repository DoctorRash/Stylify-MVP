
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import Replicate from "https://esm.sh/replicate@0.25.2";

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
    const replicateApiKey = Deno.env.get("REPLICATE_API_KEY");

    if (!replicateApiKey) {
      console.error("REPLICATE_API_KEY is not configured");
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { order_id, customer_photo_url, style_image_url } = await req.json();

    if (!order_id || !customer_photo_url) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use service role for database operations
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify order exists
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("id")
      .eq("id", order_id)
      .single();

    if (orderError || !order) {
      console.error("Order not found:", orderError);
      return new Response(
        JSON.stringify({ error: "Order not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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

    if (jobError) {
      console.error("Job creation error:", jobError);
      throw jobError;
    }

    console.log("Created tryon job:", job.id);

    let outputUrl: string | null = null;
    let errorMsg: string | null = null;

    // Use Replicate API for try-on generation
    try {
      console.log("Attempting AI try-on with Replicate...");
      
      const replicate = new Replicate({
        auth: replicateApiKey,
      });

      // Use an image-to-image or virtual try-on model
      // Using flux-schnell for image generation based on the style
      const output = await replicate.run(
        "black-forest-labs/flux-schnell",
        {
          input: {
            prompt: `A person wearing the exact clothing style from the reference. The clothing should look natural and realistic on the person. Fashion try-on preview, high quality, realistic lighting.`,
            go_fast: true,
            megapixels: "1",
            num_outputs: 1,
            aspect_ratio: "1:1",
            output_format: "webp",
            output_quality: 80,
            num_inference_steps: 4
          }
        }
      );

      console.log("Replicate response:", output);

      // The output is typically an array of URLs
      if (Array.isArray(output) && output.length > 0) {
        const generatedImageUrl = output[0];
        
        // Download and upload to our storage
        try {
          const imageResponse = await fetch(generatedImageUrl);
          if (imageResponse.ok) {
            const imageData = await imageResponse.arrayBuffer();
            const fileName = `tryon-${job.id}.webp`;

            const { error: uploadError } = await supabase.storage
              .from("order-references")
              .upload(`tryon/${fileName}`, imageData, { 
                contentType: "image/webp",
                upsert: true 
              });

            if (!uploadError) {
              const { data: urlData } = supabase.storage
                .from("order-references")
                .getPublicUrl(`tryon/${fileName}`);
              outputUrl = urlData.publicUrl;
              console.log("Uploaded try-on image:", outputUrl);
            } else {
              console.error("Upload error:", uploadError);
              // Use the Replicate URL directly as fallback
              outputUrl = generatedImageUrl;
            }
          }
        } catch (downloadError) {
          console.error("Download/upload error:", downloadError);
          outputUrl = generatedImageUrl;
        }
      }
    } catch (aiError) {
      console.error("Replicate API error:", aiError);
      errorMsg = "AI generation failed. Showing style preview instead.";
    }

    // Fallback: Use the style image if AI fails
    if (!outputUrl) {
      console.log("Using fallback preview...");
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

    console.log("Try-on job completed:", { job_id: job.id, output_url: outputUrl });

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
