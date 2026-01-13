import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CanvasNodeConfig {
  id: string;
  type: string;
  data: Record<string, unknown>;
}

interface CanvasEdgeConfig {
  id: string;
  source: string;
  sourceHandle?: string;
  target: string;
  targetHandle?: string;
}

interface MCPActionSuggestion {
  serverId: string;
  serverName: string;
  toolName: string;
  reason: string;
  riskLevel: "low" | "medium" | "high";
}

interface KnowledgeBaseSuggestion {
  name: string;
  description: string;
  retrievalMode: "vector" | "graph" | "hybrid";
}

interface GeneratedConfig {
  name: string;
  department: string;
  systemPrompt: string;
  suggestedSkills: string[];
  personalityConfig: {
    professional: number;
    detailed: number;
    humor: number;
    creative: number;
    preset?: string;
  };
  canvasNodes?: CanvasNodeConfig[];
  canvasEdges?: CanvasEdgeConfig[];
  suggestedMCPActions?: MCPActionSuggestion[];
  suggestedKnowledgeBases?: KnowledgeBaseSuggestion[];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { description, currentConfig, generateFullWorkflow = false } = await req.json();

    if (!description || typeof description !== "string") {
      return new Response(
        JSON.stringify({ error: "description is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Manus Protocol instruction - mandatory for all agents
    const MANUS_PROTOCOL_INSTRUCTION = `
## [Manus Protocol] - 强制架构规范
作为 Agent OS 架构师，构建智能体时你必须遵循以下协议：

**第一步（强制）- Manus 内核挂载**：
- 所有生成的 Agent 都会自动注入 Manus Kernel (core-manus-planning)
- Manus 节点是智能体的"大脑"，提供：
  - task_plan.md (任务规划板)
  - findings.md (知识发现库)  
  - progress.md (进度追踪器)

**第二步（业务）- 技能挂载**：
- 根据用户需求推荐 Skill 或 MCP 工具
- 所有业务逻辑都通过 Manus 内核协调

**第三步（System Prompt 设计）**：
- 生成的 systemPrompt 应该强调 Agent 需要维护自己的状态文件
- 鼓励 Agent 在每次操作后更新 findings.md 和 progress.md

`;

    // Extended prompt for full workflow generation
    const systemPromptForGenerator = generateFullWorkflow 
      ? `${MANUS_PROTOCOL_INSTRUCTION}
你是一个AI Agent配置和工作流设计专家。用户会用自然语言描述他们想要的Agent，你需要分析需求并生成完整的配置和工作流设计。

请根据用户描述生成以下配置（使用JSON格式）：

## 基础配置
1. name: Agent的名称（简短、有特色）
2. department: 所属部门（如：营销部、技术部、客服部、内容部等）
3. systemPrompt: 系统提示词（详细描述Agent的角色、能力和行为准则，100-200字。必须包含"你需要维护自己的状态文件"这个概念）
4. suggestedSkills: 推荐的技能列表（字符串数组，如：["文案写作", "数据分析"]）
5. personalityConfig: 性格配置
   - professional: 0-1（0=活泼，1=专业）
   - detailed: 0-1（0=简洁，1=详细）
   - humor: 0-1（0=严肃，1=幽默）
   - creative: 0-1（0=保守，1=创意）

## MCP动作推荐（如果需要外部系统集成）
6. suggestedMCPActions: 推荐的MCP动作列表
   每个动作包含：
   - serverId: 服务器ID（如 "database", "email", "github", "google-calendar", "slack", "notion"）
   - serverName: 服务器名称（如 "数据库", "邮件服务"）
   - toolName: 工具名称（如 "query_database", "send_email"）
   - reason: 推荐原因
   - riskLevel: 风险级别 "low" | "medium" | "high"

分析关键词映射MCP：
- 邮件/通知/发送 -> email服务
- 订单/库存/查询 -> database服务  
- GitHub/Issue/代码 -> github服务
- 日历/日程/会议 -> google-calendar服务
- Slack/消息/通知 -> slack服务
- Notion/文档/笔记 -> notion服务
- 删除/退款/支付 -> 标记为high风险

## 知识库推荐（如果需要知识检索）
7. suggestedKnowledgeBases: 推荐的知识库列表
   每个知识库包含：
   - name: 知识库名称
   - description: 知识库描述
   - retrievalMode: 检索模式 "vector" | "graph" | "hybrid"

分析关键词映射知识库：
- FAQ/常见问题 -> FAQ知识库, hybrid模式
- 文档/手册/规范 -> 产品文档, vector模式
- 研究/分析/论文 -> 研究资料, graph模式

直接返回JSON对象，不要包含其他文字。确保JSON格式正确。`
      : `${MANUS_PROTOCOL_INSTRUCTION}
你是一个AI Agent配置生成专家。用户会用自然语言描述他们想要的Agent，你需要分析需求并生成配置。

请根据用户描述生成以下配置（使用JSON格式）：
1. name: Agent的名称（简短、有特色）
2. department: 所属部门（如：营销部、技术部、客服部、内容部等）
3. systemPrompt: 系统提示词（详细描述Agent的角色、能力和行为准则，100-200字。必须包含"你需要维护自己的状态文件"这个概念）
4. suggestedSkills: 推荐的技能列表（字符串数组，如：["文案写作", "数据分析"]）
5. personalityConfig: 性格配置
   - professional: 0-1（0=活泼，1=专业）
   - detailed: 0-1（0=简洁，1=详细）
   - humor: 0-1（0=严肃，1=幽默）
   - creative: 0-1（0=保守，1=创意）
   - preset: 可选的预设名称（expert/bestie/comedian/consultant/mentor/creative）

直接返回JSON对象，不要包含其他文字。`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPromptForGenerator },
          { role: "user", content: `用户需求描述：${description}\n\n${currentConfig ? `当前配置参考：${JSON.stringify(currentConfig)}` : ""}` }
        ],
        temperature: 0.7,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "请求过于频繁，请稍后再试" }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "API额度不足" }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("AI service error");
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No content in response");
    }

    // Parse the JSON response
    let generatedConfig: GeneratedConfig;
    try {
      // Try to extract JSON from the response (handle potential markdown code blocks)
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        generatedConfig = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found in response");
      }
    } catch (parseError) {
      console.error("Failed to parse AI response:", content);
      // Return a default config based on description
      generatedConfig = {
        name: "AI助手",
        department: "通用部门",
        systemPrompt: `你是一个${description}。请尽力帮助用户完成相关任务。`,
        suggestedSkills: [],
        personalityConfig: {
          professional: 0.5,
          detailed: 0.5,
          humor: 0.3,
          creative: 0.5
        }
      };
    }

    // Validate and sanitize the response - including MCP and Knowledge Base suggestions
    const validatedConfig: GeneratedConfig = {
      name: String(generatedConfig.name || "AI助手").slice(0, 50),
      department: String(generatedConfig.department || "通用部门").slice(0, 30),
      systemPrompt: String(generatedConfig.systemPrompt || "").slice(0, 2000),
      suggestedSkills: Array.isArray(generatedConfig.suggestedSkills) 
        ? generatedConfig.suggestedSkills.slice(0, 10).map(s => String(s))
        : [],
      personalityConfig: {
        professional: Math.max(0, Math.min(1, Number(generatedConfig.personalityConfig?.professional) || 0.5)),
        detailed: Math.max(0, Math.min(1, Number(generatedConfig.personalityConfig?.detailed) || 0.5)),
        humor: Math.max(0, Math.min(1, Number(generatedConfig.personalityConfig?.humor) || 0.3)),
        creative: Math.max(0, Math.min(1, Number(generatedConfig.personalityConfig?.creative) || 0.5)),
        preset: generatedConfig.personalityConfig?.preset
      },
      // Include MCP action suggestions
      suggestedMCPActions: Array.isArray(generatedConfig.suggestedMCPActions) 
        ? generatedConfig.suggestedMCPActions.slice(0, 10).map(action => ({
            serverId: String(action.serverId || ""),
            serverName: String(action.serverName || ""),
            toolName: String(action.toolName || ""),
            reason: String(action.reason || ""),
            riskLevel: (["low", "medium", "high"].includes(action.riskLevel) ? action.riskLevel : "low") as "low" | "medium" | "high"
          }))
        : [],
      // Include Knowledge Base suggestions
      suggestedKnowledgeBases: Array.isArray(generatedConfig.suggestedKnowledgeBases)
        ? generatedConfig.suggestedKnowledgeBases.slice(0, 5).map(kb => ({
            name: String(kb.name || "知识库"),
            description: String(kb.description || ""),
            retrievalMode: (["vector", "graph", "hybrid"].includes(kb.retrievalMode) ? kb.retrievalMode : "vector") as "vector" | "graph" | "hybrid"
          }))
        : []
    };

    console.log("Generated config:", validatedConfig);

    return new Response(
      JSON.stringify(validatedConfig),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in agent-config-generator:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
