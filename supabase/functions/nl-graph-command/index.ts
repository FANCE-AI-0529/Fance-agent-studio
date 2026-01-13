// =====================================================
// NL Graph Command Edge Function
// Parse Natural Language to Graph Commands using AI
// =====================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NLGraphRequest {
  message: string;
  agentId: string;
  currentNodes: Array<{
    id: string;
    type: string;
    name: string;
  }>;
  context?: {
    recentMessages?: string[];
    agentName?: string;
  };
}

interface GraphCommand {
  action: string;
  nodeType?: string;
  nodeData?: Record<string, unknown>;
  confidence: number;
  description: string;
  autoConnect?: boolean;
  requiresConfirmation?: boolean;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, agentId, currentNodes, context }: NLGraphRequest = await req.json();

    if (!message) {
      return new Response(
        JSON.stringify({ error: 'Message is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build analysis prompt
    const prompt = buildAnalysisPrompt(message, currentNodes, context);

    // Call AI for intent analysis
    const aiResult = await analyzeWithAI(prompt);

    if (!aiResult.hasIntent) {
      return new Response(
        JSON.stringify({ hasIntent: false }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        hasIntent: true,
        command: aiResult.command,
        reasoning: aiResult.reasoning,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('NL Graph Command error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage, hasIntent: false }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function buildAnalysisPrompt(
  message: string,
  currentNodes: Array<{ id: string; type: string; name: string }>,
  context?: { recentMessages?: string[]; agentName?: string }
): string {
  const nodeList = currentNodes.length > 0
    ? currentNodes.map(n => `- ${n.name} (${n.type})`).join('\n')
    : '(暂无节点)';

  return `你是一个 Agent 架构分析器。分析用户消息，判断是否包含对 Agent 架构的修改意图。

用户消息: "${message}"

当前 Agent 架构节点:
${nodeList}

${context?.agentName ? `Agent 名称: ${context.agentName}` : ''}

## 任务
判断用户是否想要修改 Agent 的能力/架构（如添加技能、知识库、MCP 工具、触发器等）。

## 意图模式参考
- "加个XX功能" → add_node, nodeType: skill
- "让它能XX" → add_node, nodeType: skill
- "连接XX服务/工具" → add_node, nodeType: mcp_action
- "用XX知识库" → add_node, nodeType: knowledge
- "去掉XX" → remove_node
- "每天/定时XX" → add_node, nodeType: trigger
- "添加分支/路由" → add_node, nodeType: router

## 响应格式
如果用户想要修改架构，返回 JSON:
{
  "hasIntent": true,
  "command": {
    "action": "add_node" | "remove_node" | "update_node",
    "nodeType": "skill" | "knowledge" | "mcp_action" | "trigger" | "router",
    "nodeData": { "name": "节点名称", "description": "可选描述" },
    "autoConnect": true,
    "confidence": 0.0-1.0,
    "description": "人类可读的操作描述",
    "requiresConfirmation": true
  },
  "reasoning": "简短说明判断理由"
}

如果是普通对话（不涉及架构修改），返回:
{ "hasIntent": false, "reasoning": "这是普通对话" }

只返回 JSON，不要其他内容。`;
}

async function analyzeWithAI(prompt: string): Promise<{
  hasIntent: boolean;
  command?: GraphCommand;
  reasoning?: string;
}> {
  // Use Lovable AI Gateway
  const gatewayUrl = Deno.env.get('LOVABLE_AI_GATEWAY_URL');
  const gatewayKey = Deno.env.get('LOVABLE_AI_GATEWAY_KEY');

  if (!gatewayUrl || !gatewayKey) {
    console.warn('AI Gateway not configured, falling back to pattern matching');
    return { hasIntent: false };
  }

  try {
    const response = await fetch(`${gatewayUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${gatewayKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'user', content: prompt }
        ],
        temperature: 0.1,
        max_tokens: 500,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return { hasIntent: false };
    }

    // Parse JSON response
    const parsed = JSON.parse(content);
    return {
      hasIntent: parsed.hasIntent === true,
      command: parsed.command,
      reasoning: parsed.reasoning,
    };
  } catch (error) {
    console.error('AI analysis failed:', error);
    return { hasIntent: false };
  }
}
