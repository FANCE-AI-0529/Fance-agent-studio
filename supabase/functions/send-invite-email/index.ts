import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SendInviteRequest {
  emails: string[];
  inviteCodes: string[];
  customMessage?: string;
}

interface EmailResult {
  email: string;
  success: boolean;
  error?: string;
}

// Send email using Resend API with fetch
async function sendEmailWithResend(
  to: string,
  subject: string,
  html: string
): Promise<{ success: boolean; error?: string }> {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  if (!apiKey) {
    return { success: false, error: "RESEND_API_KEY not configured" };
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "AgentOS <noreply@fance-ai.com>",
        to: [to],
        subject,
        html,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Resend API error:", errorData);
      return { success: false, error: errorData.message || "Email send failed" };
    }

    const data = await response.json();
    console.log("Email sent successfully:", data);
    return { success: true };
  } catch (error: any) {
    console.error("Email send error:", error);
    return { success: false, error: error.message };
  }
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get authorization header
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client with user's token
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user is admin
    const { data: adminRole, error: roleError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (roleError || !adminRole) {
      console.error("Admin check failed:", roleError);
      return new Response(
        JSON.stringify({ error: "Only admins can send invite emails" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request body
    const { emails, inviteCodes, customMessage }: SendInviteRequest = await req.json();

    if (!emails || emails.length === 0) {
      return new Response(
        JSON.stringify({ error: "Missing emails" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Rate limiting: max 50 emails per request
    if (emails.length > 50) {
      return new Response(
        JSON.stringify({ error: "Maximum 50 emails per request" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // If no invite codes provided, generate them
    let codesToUse = inviteCodes || [];
    if (codesToUse.length === 0) {
      // Generate new codes for each email
      const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
      for (let i = 0; i < emails.length; i++) {
        let code = "";
        for (let j = 0; j < 8; j++) {
          code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        codesToUse.push(code);
      }

      // Insert generated codes
      const insertData = codesToUse.map(code => ({
        inviter_id: user.id,
        invite_code: code,
        status: "pending",
        source_channel: "email",
      }));

      const { error: insertError } = await supabase
        .from("invitations")
        .insert(insertData);

      if (insertError) {
        console.error("Failed to insert invite codes:", insertError);
        return new Response(
          JSON.stringify({ error: "Failed to generate invite codes" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    if (emails.length !== codesToUse.length) {
      return new Response(
        JSON.stringify({ error: "Email count must match invite code count" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const results: EmailResult[] = [];
    const appUrl = Deno.env.get("APP_URL") || "https://agentos.lovable.app";

    // Send emails
    for (let i = 0; i < emails.length; i++) {
      const email = emails[i].trim().toLowerCase();
      const inviteCode = codesToUse[i];

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        results.push({ email, success: false, error: "Invalid email format" });
        continue;
      }

      const inviteUrl = `${appUrl}/invite?code=${inviteCode}`;
      
      const emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f4f4f5; }
            .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
            .card { background: white; border-radius: 12px; padding: 40px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
            .logo { font-size: 24px; font-weight: bold; color: #6366f1; margin-bottom: 24px; }
            h1 { color: #18181b; font-size: 24px; margin-bottom: 16px; }
            p { color: #52525b; line-height: 1.6; margin-bottom: 16px; }
            .code-box { background: #f4f4f5; border-radius: 8px; padding: 20px; text-align: center; margin: 24px 0; }
            .code { font-family: monospace; font-size: 28px; font-weight: bold; color: #6366f1; letter-spacing: 4px; }
            .button { display: inline-block; background: #6366f1; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 500; margin: 16px 0; }
            .footer { text-align: center; margin-top: 24px; color: #a1a1aa; font-size: 14px; }
            .custom-message { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin: 20px 0; border-radius: 4px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="card">
              <div class="logo">🤖 AgentOS</div>
              <h1>您收到了一个邀请！</h1>
              <p>有人邀请您加入 AgentOS，一个智能 AI Agent 构建与运行平台。</p>
              
              ${customMessage ? `<div class="custom-message">${customMessage}</div>` : ''}
              
              <p>使用以下邀请码注册：</p>
              <div class="code-box">
                <div class="code">${inviteCode}</div>
              </div>
              
              <center>
                <a href="${inviteUrl}" class="button">立即加入 AgentOS</a>
              </center>
              
              <p style="font-size: 14px; color: #a1a1aa;">
                或者复制以下链接到浏览器：<br>
                <a href="${inviteUrl}" style="color: #6366f1;">${inviteUrl}</a>
              </p>
            </div>
            <div class="footer">
              <p>此邮件由 AgentOS 自动发送</p>
            </div>
          </div>
        </body>
        </html>
      `;

      const sendResult = await sendEmailWithResend(
        email,
        "您收到了一个 AgentOS 邀请",
        emailHtml
      );

      if (sendResult.success) {
        // Update invitation record
        const { error: updateError } = await supabase
          .from("invitations")
          .update({
            email_sent_at: new Date().toISOString(),
            email_status: "sent",
            source_channel: "email",
          })
          .eq("invite_code", inviteCode);

        if (updateError) {
          console.error(`Failed to update invitation for ${inviteCode}:`, updateError);
        }

        results.push({ email, success: true });
      } else {
        // Update invitation with error status
        await supabase
          .from("invitations")
          .update({
            email_status: "failed",
          })
          .eq("invite_code", inviteCode);

        results.push({ email, success: false, error: sendResult.error });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    console.log(`Bulk email send complete: ${successCount} success, ${failCount} failed`);

    return new Response(
      JSON.stringify({
        success: true,
        results,
        summary: {
          total: results.length,
          sent: successCount,
          failed: failCount,
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in send-invite-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
