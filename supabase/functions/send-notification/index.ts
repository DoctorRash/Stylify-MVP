import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  type: "order_created" | "order_status" | "new_message" | "order_accepted" | "order_in_progress" | "order_completed";
  recipient_email?: string;
  recipient_phone?: string;
  order_id?: string;
  message?: string;
  tailor_name?: string;
  customer_name?: string;
  status?: string;
  sender_name?: string;
  recipient_name?: string;
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
    const { 
      type, 
      recipient_email, 
      recipient_phone, 
      order_id, 
      message, 
      tailor_name, 
      customer_name, 
      status,
      sender_name,
      recipient_name 
    } = body;

    console.log("Notification request:", { type, recipient_email, recipient_phone, order_id });

    const results: { email?: boolean; whatsapp?: boolean } = {};

    // Send Email notification if email provided
    if (recipient_email) {
      try {
        let subject = "";
        let htmlContent = "";
        const appUrl = "https://stylify.lovable.app"; // Update with your actual app URL

        switch (type) {
          case "order_created":
            subject = `New Order from ${customer_name} - Stylify`;
            htmlContent = `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background: linear-gradient(135deg, #B497E7 0%, #D4AF37 100%); padding: 30px; border-radius: 10px 10px 0 0;">
                  <h1 style="color: white; margin: 0;">🎉 New Order Received!</h1>
                </div>
                <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
                  <p style="font-size: 16px; color: #333;">Hello ${tailor_name || 'there'},</p>
                  <p style="font-size: 16px; color: #333;">You have received a new order from <strong>${customer_name}</strong>.</p>
                  <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <p style="margin: 0; color: #666;">Order ID:</p>
                    <p style="margin: 5px 0 0 0; font-family: monospace; font-size: 14px; color: #B497E7;">${order_id}</p>
                  </div>
                  <p style="font-size: 16px; color: #333;">Please log in to your dashboard to view the order details and respond to your customer.</p>
                  <a href="${appUrl}/tailor/orders" style="display: inline-block; background: #B497E7; color: white; padding: 12px 30px; border-radius: 25px; text-decoration: none; margin-top: 20px; font-weight: bold;">View Order</a>
                </div>
                <p style="color: #999; font-size: 12px; text-align: center; margin-top: 20px;">This is an automated message from Stylify. Please do not reply to this email.</p>
              </div>
            `;
            break;

          case "order_status":
          case "order_accepted":
          case "order_in_progress":
          case "order_completed":
            const statusDisplay = status?.replace('_', ' ').toUpperCase() || type.replace('order_', '').replace('_', ' ').toUpperCase();
            const statusEmoji = status === 'completed' ? '✅' : status === 'in_progress' ? '🔄' : status === 'cancelled' ? '❌' : '📦';
            
            subject = `Order Status Update: ${statusDisplay} - Stylify`;
            htmlContent = `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background: linear-gradient(135deg, #B497E7 0%, #D4AF37 100%); padding: 30px; border-radius: 10px 10px 0 0;">
                  <h1 style="color: white; margin: 0;">${statusEmoji} Order Status Updated</h1>
                </div>
                <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
                  <p style="font-size: 16px; color: #333;">Hello ${customer_name || recipient_name || 'there'},</p>
                  <p style="font-size: 16px; color: #333;">Your order status has been updated!</p>
                  <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
                    <p style="margin: 0; color: #666; font-size: 14px;">Current Status</p>
                    <p style="margin: 10px 0 0 0; font-size: 24px; font-weight: bold; color: #B497E7;">${statusDisplay}</p>
                  </div>
                  <div style="background: white; padding: 15px; border-radius: 8px; margin: 20px 0;">
                    <p style="margin: 0; color: #666; font-size: 12px;">Order ID:</p>
                    <p style="margin: 5px 0 0 0; font-family: monospace; font-size: 14px;">${order_id}</p>
                  </div>
                  ${message ? `
                  <div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #D4AF37;">
                    <p style="margin: 0; color: #856404; font-size: 14px;"><strong>Note from tailor:</strong></p>
                    <p style="margin: 5px 0 0 0; color: #856404;">${message}</p>
                  </div>
                  ` : ''}
                  <a href="${appUrl}/customer/orders" style="display: inline-block; background: #B497E7; color: white; padding: 12px 30px; border-radius: 25px; text-decoration: none; margin-top: 20px; font-weight: bold;">View Order Details</a>
                </div>
                <p style="color: #999; font-size: 12px; text-align: center; margin-top: 20px;">This is an automated message from Stylify. Please do not reply to this email.</p>
              </div>
            `;
            break;

          case "new_message":
            subject = `New Message from ${sender_name || 'Someone'} - Stylify`;
            htmlContent = `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background: linear-gradient(135deg, #B497E7 0%, #D4AF37 100%); padding: 30px; border-radius: 10px 10px 0 0;">
                  <h1 style="color: white; margin: 0;">💬 New Message</h1>
                </div>
                <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
                  <p style="font-size: 16px; color: #333;">Hello ${recipient_name || 'there'},</p>
                  <p style="font-size: 16px; color: #333;">You have received a new message from <strong>${sender_name}</strong> regarding your order.</p>
                  ${message ? `
                  <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #B497E7;">
                    <p style="margin: 0; color: #333; font-style: italic;">"${message.length > 200 ? message.substring(0, 200) + '...' : message}"</p>
                  </div>
                  ` : ''}
                  <div style="background: white; padding: 15px; border-radius: 8px; margin: 20px 0;">
                    <p style="margin: 0; color: #666; font-size: 12px;">Order ID:</p>
                    <p style="margin: 5px 0 0 0; font-family: monospace; font-size: 14px;">${order_id}</p>
                  </div>
                  <p style="font-size: 16px; color: #333;">Log in to Stylify to reply and view the full conversation.</p>
                  <a href="${appUrl}" style="display: inline-block; background: #B497E7; color: white; padding: 12px 30px; border-radius: 25px; text-decoration: none; margin-top: 20px; font-weight: bold;">Reply Now</a>
                </div>
                <p style="color: #999; font-size: 12px; text-align: center; margin-top: 20px;">This is an automated message from Stylify. Please do not reply to this email.</p>
              </div>
            `;
            break;
        }

        console.log("Email notification prepared:", { to: recipient_email, subject });
        
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
            console.log("Email sent successfully to:", recipient_email);
            results.email = true;
          } else {
            const errorText = await emailResponse.text();
            console.error("Email send failed:", errorText);
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
          case "order_accepted":
          case "order_in_progress":
          case "order_completed":
            const statusText = status?.replace('_', ' ').toUpperCase() || type.replace('order_', '').replace('_', ' ').toUpperCase();
            whatsappMessage = `📦 *Order Status Update*\n\nHello ${customer_name || recipient_name || 'there'},\n\nYour order status: *${statusText}*\nOrder ID: ${order_id}\n${message ? `\nNote: ${message}` : ''}\n\nCheck your Stylify account for details.`;
            break;
          case "new_message":
            whatsappMessage = `💬 *New Message from ${sender_name}*\n\nYou have a new message for order ${order_id}.\n${message ? `\n"${message.substring(0, 100)}${message.length > 100 ? '...' : ''}"` : ''}\n\nReply in your Stylify account.`;
            break;
        }

        const cleanPhone = recipient_phone.replace(/\D/g, '');
        const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(whatsappMessage)}`;
        
        console.log("WhatsApp notification prepared:", { phone: cleanPhone, messagePreview: whatsappMessage.substring(0, 50) });
        results.whatsapp = true;

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
