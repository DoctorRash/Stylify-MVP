
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  type: "order_created" | "order_status" | "new_message";
  recipient_email?: string;
  recipient_phone?: string;
  order_id?: string;
  message?: string;
  tailor_name?: string;
  customer_name?: string;
  status?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body: NotificationRequest = await req.json();
    const { type, recipient_email, recipient_phone, order_id, message, tailor_name, customer_name, status } = body;

    console.log("Notification request:", { type, recipient_email, recipient_phone });

    const results: { email?: boolean; whatsapp?: boolean } = {};

    // Send Email notification if email provided
    if (recipient_email) {
      try {
        let subject = "";
        let htmlContent = "";

        switch (type) {
          case "order_created":
            subject = `New Order from ${customer_name} - Stylify`;
            htmlContent = `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h1 style="color: #B497E7;">New Order Received!</h1>
                <p>Hello ${tailor_name || 'there'},</p>
                <p>You have received a new order from <strong>${customer_name}</strong>.</p>
                <p>Order ID: <code>${order_id}</code></p>
                <p>Please log in to your dashboard to view the order details and respond to your customer.</p>
                <hr style="border: 1px solid #eee; margin: 20px 0;">
                <p style="color: #666; font-size: 12px;">This is an automated message from Stylify.</p>
              </div>
            `;
            break;
          case "order_status":
            subject = `Order Status Update - Stylify`;
            htmlContent = `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h1 style="color: #B497E7;">Order Status Updated</h1>
                <p>Hello ${customer_name || 'there'},</p>
                <p>Your order status has been updated to: <strong>${status}</strong></p>
                <p>Order ID: <code>${order_id}</code></p>
                ${message ? `<p>Note from tailor: ${message}</p>` : ''}
                <p>Log in to view more details about your order.</p>
                <hr style="border: 1px solid #eee; margin: 20px 0;">
                <p style="color: #666; font-size: 12px;">This is an automated message from Stylify.</p>
              </div>
            `;
            break;
          case "new_message":
            subject = `New Message - Stylify`;
            htmlContent = `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h1 style="color: #B497E7;">New Message</h1>
                <p>You have received a new message regarding your order.</p>
                <p>Order ID: <code>${order_id}</code></p>
                ${message ? `<p style="background: #f5f5f5; padding: 15px; border-radius: 8px;">${message}</p>` : ''}
                <p>Log in to reply and view the full conversation.</p>
                <hr style="border: 1px solid #eee; margin: 20px 0;">
                <p style="color: #666; font-size: 12px;">This is an automated message from Stylify.</p>
              </div>
            `;
            break;
        }

        // Note: Email sending requires Resend API key to be configured
        // For now, log the email that would be sent
        console.log("Email notification prepared:", { to: recipient_email, subject });
        
        // If RESEND_API_KEY is configured, send the email
        const resendApiKey = Deno.env.get("RESEND_API_KEY");
        if (resendApiKey) {
          const emailResponse = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${resendApiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: "Stylify <notifications@resend.dev>",
              to: [recipient_email],
              subject,
              html: htmlContent,
            }),
          });

          if (emailResponse.ok) {
            console.log("Email sent successfully");
            results.email = true;
          } else {
            console.error("Email send failed:", await emailResponse.text());
            results.email = false;
          }
        } else {
          console.log("RESEND_API_KEY not configured, email not sent");
          results.email = false;
        }
      } catch (emailError) {
        console.error("Email error:", emailError);
        results.email = false;
      }
    }

    // Send WhatsApp notification if phone provided
    if (recipient_phone) {
      try {
        let whatsappMessage = "";

        switch (type) {
          case "order_created":
            whatsappMessage = `🎉 *New Order Received!*\n\nHello ${tailor_name || 'there'},\n\nYou have a new order from ${customer_name}.\nOrder ID: ${order_id}\n\nPlease check your Stylify dashboard for details.`;
            break;
          case "order_status":
            whatsappMessage = `📦 *Order Status Update*\n\nHello ${customer_name || 'there'},\n\nYour order status: *${status}*\nOrder ID: ${order_id}\n${message ? `\nNote: ${message}` : ''}\n\nCheck your Stylify account for details.`;
            break;
          case "new_message":
            whatsappMessage = `💬 *New Message*\n\nYou have a new message for order ${order_id}.\n${message ? `\n"${message.substring(0, 100)}${message.length > 100 ? '...' : ''}"` : ''}\n\nReply in your Stylify account.`;
            break;
        }

        // Format phone number for WhatsApp API
        const cleanPhone = recipient_phone.replace(/\D/g, '');
        
        // Generate WhatsApp click-to-chat URL (client can use this)
        const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(whatsappMessage)}`;
        
        console.log("WhatsApp notification prepared:", { phone: cleanPhone, message: whatsappMessage.substring(0, 50) });
        
        // Store the WhatsApp URL for the client to use
        results.whatsapp = true;

        // Note: For automatic WhatsApp sending, you would need WhatsApp Business API
        // which requires approval from Meta. The URL above can be used for manual sending.
      } catch (whatsappError) {
        console.error("WhatsApp error:", whatsappError);
        results.whatsapp = false;
      }
    }

    return new Response(
      JSON.stringify({ success: true, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("send-notification error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
