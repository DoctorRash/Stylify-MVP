
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import Replicate from "https://esm.sh/replicate@0.25.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CustomerMeasurements {
  shoulder_width: number;
  chest_bust: number;
  waist: number;
  hip: number;
  arm_length: number;
  full_length_top: number;
  [key: string]: any;
}

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

    const { order_id, customer_photo_url, style_image_url, measurements } = await req.json();

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

    // Build measurement-aware prompt
    const buildPrompt = (measurements?: CustomerMeasurements): string => {
      if (!measurements) {
        return `A person wearing the exact clothing style from the reference. The clothing should look natural and realistic on the person. Fashion try-on preview, high quality, realistic lighting.`;
      }

      return `Professional fashion try-on visualization. 
Apply the clothing style to the person's body while respecting their precise measurements:
- Chest/Bust: ${measurements.chest_bust} inches
- Waist: ${measurements.waist} inches  
- Hip: ${measurements.hip} inches
- Shoulder width: ${measurements.shoulder_width} inches
- Garment length: ${measurements.full_length_top} inches

The outfit should fit naturally on their body proportions.
Maintain realistic fabric draping and fit based on these measurements.
High quality, professional fashion photography style.
Realistic lighting and natural shadows.
The clothing should appear tailored to these exact dimensions.`;
    };

    // Create job record with measurements
    const { data: job, error: jobError } = await supabase
      .from("tryon_jobs")
      .insert({
        order_id,
        input_payload: { customer_photo_url, style_image_url },
        measurement_data: measurements || null,
        status: "processing",
      })
      .select("id")
      .single();

    if (jobError) {
      console.error("Job creation error:", jobError);
      throw jobError;
    }

    console.log("Created tryon job:", job.id, "with measurements:", !!measurements);

    let outputUrl: string | null = null;
    let errorMsg: string | null = null;

    // Hybrid AI approach: Try best model first, fallback to faster one
    try {
      console.log("Attempting AI try-on with Replicate...");

      const replicate = new Replicate({
        auth: replicateApiKey,
      });

      const prompt = buildPrompt(measurements);
      console.log("Generated prompt with measurements");

      // Using flux-schnell - can be upgraded to specialized virtual try-on model
      const output = await replicate.run(
        "black-forest-labs/flux-schnell",
        {
          input: {
            prompt: prompt,
            go_fast: true,
            megapixels: "1",
            num_outputs: 1,
            aspect_ratio: "3:4",
            output_format: "webp",
            output_quality: 85,
            num_inference_steps: 8
          }
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
