import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AlertRule {
  id: string;
  agent_id: string;
  user_id: string;
  name: string;
  error_rate_threshold: number;
  latency_threshold_ms: number;
  error_count_threshold: number;
  time_window_minutes: number;
  notification_email: string;
  notification_enabled: boolean;
  cooldown_minutes: number;
  last_triggered_at: string | null;
  total_alerts_sent: number;
  is_active: boolean;
}

interface AlertCheckRequest {
  agent_id?: string;
  rule_id?: string;
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: AlertCheckRequest = await req.json().catch(() => ({}));
    const now = new Date();

    // Build query for alert rules
    let rulesQuery = supabase
      .from("api_alert_rules")
      .select("*")
      .eq("is_active", true)
      .eq("notification_enabled", true);

    if (body.agent_id) {
      rulesQuery = rulesQuery.eq("agent_id", body.agent_id);
    }
    if (body.rule_id) {
      rulesQuery = rulesQuery.eq("id", body.rule_id);
    }

    const { data: rules, error: rulesError } = await rulesQuery;

    if (rulesError) {
      console.error("Error fetching alert rules:", rulesError);
      throw new Error("Failed to fetch alert rules");
    }

    if (!rules || rules.length === 0) {
      return new Response(
        JSON.stringify({ message: "No active alert rules found", alertsTriggered: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const alertsTriggered: any[] = [];
    const resend = resendApiKey ? new Resend(resendApiKey) : null;

    for (const rule of rules as AlertRule[]) {
      // Check cooldown
      if (rule.last_triggered_at) {
        const lastTriggered = new Date(rule.last_triggered_at);
        const cooldownEnd = new Date(lastTriggered.getTime() + rule.cooldown_minutes * 60 * 1000);
        if (now < cooldownEnd) {
          console.log(`Rule ${rule.id} is in cooldown until ${cooldownEnd.toISOString()}`);
          continue;
        }
      }

      // Calculate time window
      const windowStart = new Date(now.getTime() - rule.time_window_minutes * 60 * 1000);

      // Fetch API logs for this agent within the time window
      const { data: logs, error: logsError } = await supabase
        .from("agent_api_logs")
        .select("status_code, latency_ms, created_at")
        .eq("agent_id", rule.agent_id)
        .gte("created_at", windowStart.toISOString())
        .lte("created_at", now.toISOString());

      if (logsError) {
        console.error(`Error fetching logs for rule ${rule.id}:`, logsError);
        continue;
      }

      if (!logs || logs.length === 0) {
        console.log(`No logs found for rule ${rule.id} in time window`);
        continue;
      }

      const totalCalls = logs.length;
      const errorCalls = logs.filter(log => log.status_code >= 400).length;
      const errorRate = (errorCalls / totalCalls) * 100;
      
      const latencies = logs
        .filter(log => log.latency_ms !== null)
        .map(log => log.latency_ms as number);
      const avgLatency = latencies.length > 0 
        ? latencies.reduce((a, b) => a + b, 0) / latencies.length 
        : 0;

      // Check thresholds
      let alertType: string | null = null;
      let thresholdValue = 0;
      let actualValue = 0;

      if (rule.error_rate_threshold && errorRate > rule.error_rate_threshold) {
        alertType = "error_rate";
        thresholdValue = rule.error_rate_threshold;
        actualValue = errorRate;
      } else if (rule.latency_threshold_ms && avgLatency > rule.latency_threshold_ms) {
        alertType = "latency";
        thresholdValue = rule.latency_threshold_ms;
        actualValue = avgLatency;
      } else if (rule.error_count_threshold && errorCalls > rule.error_count_threshold) {
        alertType = "error_count";
        thresholdValue = rule.error_count_threshold;
        actualValue = errorCalls;
      }

      if (alertType) {
        console.log(`Alert triggered for rule ${rule.id}: ${alertType}`);

        // Get agent name
        const { data: agent } = await supabase
          .from("agents")
          .select("name")
          .eq("id", rule.agent_id)
          .single();

        const agentName = agent?.name || "Unknown Agent";

        // Create alert log
        const { data: alertLog, error: alertLogError } = await supabase
          .from("api_alert_logs")
          .insert({
            alert_rule_id: rule.id,
            agent_id: rule.agent_id,
            user_id: rule.user_id,
            alert_type: alertType,
            threshold_value: thresholdValue,
            actual_value: actualValue,
            time_window_start: windowStart.toISOString(),
            time_window_end: now.toISOString(),
            sample_size: totalCalls,
            notification_sent: false,
          })
          .select()
          .single();

        if (alertLogError) {
          console.error(`Error creating alert log:`, alertLogError);
          continue;
        }

        // Send email notification
        let notificationSent = false;
        let notificationError = null;

        if (resend && rule.notification_email) {
          try {
            const alertTypeLabels: Record<string, string> = {
              error_rate: "错误率",
              latency: "延迟",
              error_count: "错误数量",
            };

            const alertTypeUnits: Record<string, string> = {
              error_rate: "%",
              latency: "ms",
              error_count: "个",
            };

            await resend.emails.send({
              from: "Agent OS <alerts@resend.dev>",
              to: [rule.notification_email],
              subject: `🚨 API 告警: ${agentName} - ${alertTypeLabels[alertType]}超过阈值`,
              html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                  <h1 style="color: #dc2626;">🚨 API 性能告警</h1>
                  
                  <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 16px; margin: 16px 0;">
                    <h2 style="margin: 0 0 12px 0; color: #991b1b;">告警详情</h2>
                    <table style="width: 100%; border-collapse: collapse;">
                      <tr>
                        <td style="padding: 8px 0; color: #666;">智能体</td>
                        <td style="padding: 8px 0; font-weight: bold;">${agentName}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #666;">告警规则</td>
                        <td style="padding: 8px 0; font-weight: bold;">${rule.name}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #666;">告警类型</td>
                        <td style="padding: 8px 0; font-weight: bold;">${alertTypeLabels[alertType]}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #666;">阈值</td>
                        <td style="padding: 8px 0;">${thresholdValue}${alertTypeUnits[alertType]}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #666;">实际值</td>
                        <td style="padding: 8px 0; color: #dc2626; font-weight: bold;">${actualValue.toFixed(2)}${alertTypeUnits[alertType]}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #666;">采样大小</td>
                        <td style="padding: 8px 0;">${totalCalls} 次调用</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #666;">时间窗口</td>
                        <td style="padding: 8px 0;">最近 ${rule.time_window_minutes} 分钟</td>
                      </tr>
                    </table>
                  </div>
                  
                  <div style="background: #f3f4f6; border-radius: 8px; padding: 16px; margin: 16px 0;">
                    <h3 style="margin: 0 0 8px 0; color: #374151;">统计摘要</h3>
                    <p style="margin: 0; color: #666;">
                      错误率: ${errorRate.toFixed(2)}% (${errorCalls}/${totalCalls})<br>
                      平均延迟: ${avgLatency.toFixed(0)}ms
                    </p>
                  </div>
                  
                  <p style="color: #666; font-size: 12px; margin-top: 24px;">
                    此告警由 Agent OS 自动发送。冷却时间: ${rule.cooldown_minutes} 分钟。
                  </p>
                </div>
              `,
            });

            notificationSent = true;
            console.log(`Email sent to ${rule.notification_email}`);
          } catch (emailError: any) {
            console.error(`Error sending email:`, emailError);
            notificationError = emailError.message;
          }
        } else if (!resend) {
          notificationError = "RESEND_API_KEY not configured";
        }

        // Update alert log with notification status
        await supabase
          .from("api_alert_logs")
          .update({
            notification_sent: notificationSent,
            notification_error: notificationError,
          })
          .eq("id", alertLog.id);

        // Update rule with last triggered time and increment counter
        await supabase
          .from("api_alert_rules")
          .update({
            last_triggered_at: now.toISOString(),
            total_alerts_sent: rule.total_alerts_sent ? rule.total_alerts_sent + 1 : 1,
          })
          .eq("id", rule.id);

        alertsTriggered.push({
          ruleId: rule.id,
          ruleName: rule.name,
          agentId: rule.agent_id,
          alertType,
          thresholdValue,
          actualValue,
          notificationSent,
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        rulesChecked: rules.length,
        alertsTriggered: alertsTriggered.length,
        alerts: alertsTriggered,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in api-alert-check:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
