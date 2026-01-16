import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AgentSkill {
  name: string;
  description?: string;
  permissions?: string[];
  inputSchema?: Record<string, unknown>;
}

interface MCPAction {
  id: string;
  name: string;
  serverId?: string;
  toolName?: string;
  description?: string;
  inputSchema?: Record<string, unknown>;
  riskLevel?: string;
}

interface AgentManifest {
  name?: string;
  systemPrompt?: string;
  skills?: string[] | AgentSkill[];
  mcpActions?: MCPAction[];
  knowledgeBases?: Array<{ id: string; name: string }>;
}

interface AgentConfig {
  name?: string;
  systemPrompt?: string;
  model?: string;
  skills?: AgentSkill[];
  mplpPolicy?: string;
  manifest?: AgentManifest;
}

// Tool definition for Function Calling
interface ToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

// Multimodal message content types
type TextContent = { type: "text"; text: string };
type ImageContent = { type: "image_url"; image_url: { url: string } };
type MessageContent = string | (TextContent | ImageContent)[];

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: MessageContent;
}

// Available models - all support multimodal
const validModels = [
  "google/gemini-2.5-flash",
  "google/gemini-2.5-pro",
  "google/gemini-2.5-flash-lite",
  "google/gemini-3-pro-preview",
  "google/gemini-3-flash-preview",
  "openai/gpt-5",
  "openai/gpt-5-mini",
  "openai/gpt-5-nano",
  "openai/gpt-5.2",
];

const VALID_MPLP_POLICIES = ['default', 'standard', 'strict'];

// 模型映射函数 - 将无效模型名映射为有效模型
function mapToValidModel(model?: string): string {
  if (!model) return 'google/gemini-2.5-flash';
  
  // 已经是有效模型
  if (validModels.includes(model)) {
    return model;
  }
  
  // 映射常见的无效模型名
  const modelLower = model.toLowerCase();
  
  if (modelLower.includes('claude')) {
    return 'google/gemini-2.5-flash';
  }
  if (modelLower.includes('gpt-4') || modelLower.includes('gpt4')) {
    return 'openai/gpt-5-mini';
  }
  if (modelLower.includes('gpt-3') || modelLower.includes('gpt3')) {
    return 'google/gemini-2.5-flash-lite';
  }
  
  return 'google/gemini-2.5-flash';
}

function getValidModel(requestedModel?: string): string {
  return mapToValidModel(requestedModel);
}

// Validate and sanitize agent configuration to prevent injection attacks
function validateAgentConfig(config?: AgentConfig): AgentConfig | undefined {
  if (!config) return undefined;
  
  return {
    name: config.name ? String(config.name).slice(0, 100) : undefined,
    systemPrompt: config.systemPrompt ? String(config.systemPrompt).slice(0, 8000) : undefined,
    model: validModels.includes(config.model || '') ? config.model : undefined,
    mplpPolicy: VALID_MPLP_POLICIES.includes(config.mplpPolicy || '') 
      ? config.mplpPolicy : 'standard',
    skills: Array.isArray(config.skills) 
      ? config.skills.slice(0, 20).map(s => ({
          name: String(s.name || '').slice(0, 100),
          description: String(s.description || '').slice(0, 500),
          permissions: Array.isArray(s.permissions) 
            ? s.permissions.slice(0, 10).map(p => String(p).slice(0, 50))
            : [],
          inputSchema: s.inputSchema,
        }))
      : [],
    manifest: config.manifest,
  };
}

// 🆕 Build tool definitions from agent manifest for Function Calling
function buildToolDefinitions(config?: AgentConfig): ToolDefinition[] {
  const tools: ToolDefinition[] = [];
  
  if (!config) return tools;
  
  // Extract from skills array
  const skills = config.skills || [];
  for (const skill of skills) {
    tools.push({
      type: 'function',
      function: {
        name: skill.name.toLowerCase().replace(/\s+/g, '_'),
        description: skill.description || `执行 ${skill.name} 技能`,
        parameters: skill.inputSchema || {
          type: 'object',
          properties: {},
          required: [],
        },
      },
    });
  }
  
  // Extract from manifest.mcpActions
  const manifest = config.manifest;
  if (manifest?.mcpActions && Array.isArray(manifest.mcpActions)) {
    for (const mcp of manifest.mcpActions) {
      tools.push({
        type: 'function',
        function: {
          name: `mcp_${mcp.id || mcp.toolName || 'unknown'}`.replace(/[^a-zA-Z0-9_]/g, '_'),
          description: mcp.description || `调用 ${mcp.name || mcp.toolName} MCP 工具`,
          parameters: mcp.inputSchema || {
            type: 'object',
            properties: {},
            required: [],
          },
        },
      });
    }
  }
  
  // Extract from manifest.skills (if string array, convert to basic tools)
  if (manifest?.skills && Array.isArray(manifest.skills)) {
    for (const skill of manifest.skills) {
      if (typeof skill === 'string') {
        // Check if already added from config.skills
        const skillName = skill.toLowerCase().replace(/\s+/g, '_');
        if (!tools.some(t => t.function.name === skillName)) {
          tools.push({
            type: 'function',
            function: {
              name: skillName,
              description: `执行 ${skill} 技能`,
              parameters: {
                type: 'object',
                properties: {},
                required: [],
              },
            },
          });
        }
      }
    }
  }
  
  return tools;
}

// Check if message contains multimodal content
function hasMultimodalContent(messages: ChatMessage[]): boolean {
  return messages.some(msg => {
    if (Array.isArray(msg.content)) {
      return msg.content.some(c => c.type === 'image_url');
    }
    return false;
  });
}

// Terminal Style Instructions (injected into all prompts)
const TERMINAL_STYLE_INSTRUCTIONS = `
## 响应格式规范

严格遵守以下格式规范：
- 禁止使用 # 标题语法，改用 [标题]
- 禁止口语化废话，直接输出结果
- 使用 [v] (成功), [x] (失败), (!) (警告) 状态符号
- 使用 ┌─ ├─ └─ │ 表示层级结构
- 使用 --- 分隔章节
- 使用 (Ref: 来源) 标注引用
- 用 **双星号** 包裹关键实体（文件名、金额、API名称等），前端会将其渲染为高亮色块
`;

// Role Meta Protocol Instructions
const ROLE_META_INSTRUCTIONS = `
## 响应元数据协议

每次回复开头必须包含隐藏的元数据标签，用于前端主题切换：

当你在规划架构、设计蓝图时:
<meta role="architect" mood="neutral" />

当你在编写代码、执行命令、调试时:
<meta role="engineer" mood="neutral" />

当你在检索知识、引用文档、RAG查询时:
<meta role="researcher" mood="neutral" />

当你发出安全警告、拦截操作、MPLP审计时:
<meta role="auditor" mood="warning" />

重要：这个 meta 标签必须是回复的第一行，不要有任何其他内容在它之前。
`;

// Fance 智能助手专属系统提示词 (平台导航员)
const fanceGuideSystemPrompt = `你是 Fance 智能助手，Fance OS 平台的官方向导。

## 你的角色
你是一位友好、专业的平台顾问，帮助用户了解和使用 Fance OS 智能体平台。

## 核心职责
1. 构建指导: 详细解释如何创建智能体，包括配置、技能选择、系统提示词编写
2. 功能介绍: 介绍平台的各种功能：构建器、技能工坊、能力包、运行环境
3. 最佳实践: 提供智能体设计和配置的建议
4. 问题解答: 回答用户关于平台使用的任何问题

## 平台核心概念
- 智能体 (Agent): 可配置的 AI 助手，具备特定技能和个性
- 技能 (Skill): 智能体可以执行的具体能力，如数据查询、表单生成、API调用
- 能力包 (Bundle): 多个相关技能的集合，便于批量安装
- 系统提示词: 定义智能体行为和个性的核心配置
- MPLP 协议: 多方生命周期协议，确保敏感操作需要用户确认

## 常见问题解答

如何创建智能体？
1. 进入「构建器」页面
2. 选择模板或从零开始
3. 配置基本信息：名称、描述、部门
4. 编写系统提示词定义智能体行为
5. 从技能商店选择需要的技能
6. 测试并部署智能体

什么是技能？
技能是智能体可以执行的具体能力，例如：
- 数据查询：从数据库检索信息
- 表单生成：创建各类申请表单
- API调用：与外部服务集成
- 文件处理：读取和分析文档

什么是能力包？
能力包是多个相关技能的集合。例如「政务服务包」可能包含证件办理、政策查询、表单生成等多个技能。用户可以一键安装整个能力包。

## 回答风格
- 友好亲切，使用简单易懂的语言
- 提供具体的操作步骤和示例
- 主动询问用户需求，提供个性化建议
- 避免使用过多技术术语
${TERMINAL_STYLE_INSTRUCTIONS}
${ROLE_META_INSTRUCTIONS}
请记住：你的目标是帮助用户快速上手 Fance OS 平台，让他们能够轻松构建自己的智能体。`;

function buildSystemPrompt(config?: AgentConfig, isMultimodal?: boolean): string {
  const agentName = config?.name || "Fance 智能助手";
  const skills = config?.skills || [];
  const mplpPolicy = config?.mplpPolicy || "standard";
  
  // If no custom config provided, use Fance Guide prompt
  if (!config?.name && !config?.systemPrompt) {
    return fanceGuideSystemPrompt + (isMultimodal ? `

## 图像分析能力
当用户发送图片时，请仔细观察并提供有价值的分析和建议。` : '');
  }
  
  // Build skills section
  const skillsSection = skills.length > 0
    ? `\n\n可用技能：\n${skills.map((s, i) => 
        `${i + 1}. ${s.name}${s.description ? ` - ${s.description}` : ''}${s.permissions?.length ? ` (权限: ${s.permissions.join(', ')})` : ''}`
      ).join('\n')}`
    : '';

  // Multimodal instructions
  const multimodalInstructions = isMultimodal ? `

## 图像分析能力

当用户发送图片时，请：
1. 仔细观察图片的所有细节
2. 描述图片的主要内容和关键元素
3. 根据上下文提供有价值的分析和建议
4. 如果是代码截图，提供代码相关的帮助
5. 如果是图表/数据，提供数据分析
6. 如果是设计稿，提供设计反馈` : '';

  // Custom system prompt takes precedence
  if (config?.systemPrompt) {
    return `${config.systemPrompt}${skillsSection}${multimodalInstructions}`;
  }

  // Default Agent system prompt for custom agents
  return `你是 ${agentName}，运行在 Fance OS 平台上的智能助手。

## 工作原则

1. 安全第一：涉及敏感操作（写入、删除、执行、支付）时，明确告知用户风险
2. 透明可控：清晰说明你将执行的操作和所需权限
3. 高效专业：给出简洁、可操作的回复
4. 友好耐心：保持专业且友善的沟通风格

## MPLP 权限级别

- [v] 低风险 (read): 读取文件、查询数据 - 可直接执行
- (!) 中风险 (write/network): 写入数据、调用外部API - 需用户确认
- [x] 高风险 (execute/admin): 执行脚本、删除数据、支付 - 需严格确认

## 当前 MPLP 策略: ${mplpPolicy}
${skillsSection}
${multimodalInstructions}
${TERMINAL_STYLE_INSTRUCTIONS}
${ROLE_META_INSTRUCTIONS}
请根据用户的问题，选择合适的技能来回答。如果用户的请求涉及敏感操作，请先说明所需权限和可能的影响。`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // === SECURITY FIX 1: Verify user authentication ===
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("[agent-chat] No authorization header");
      return new Response(
        JSON.stringify({ error: "未授权访问", code: "UNAUTHORIZED" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      console.error("[agent-chat] Invalid auth token:", userError?.message);
      return new Response(
        JSON.stringify({ error: "无效的认证令牌", code: "INVALID_TOKEN" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[agent-chat] Authenticated user: ${user.id}`);

    const { messages, agentConfig } = await req.json() as {
      messages: ChatMessage[];
      agentConfig?: AgentConfig;
    };
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY is not configured");
      throw new Error("AI 服务未配置");
    }

    // === SECURITY FIX 2: Validate and sanitize agent configuration ===
    const validatedConfig = validateAgentConfig(agentConfig);

    // Check if this is a multimodal request
    const isMultimodal = hasMultimodalContent(messages);
    const systemPrompt = buildSystemPrompt(validatedConfig, isMultimodal);
    const model = getValidModel(validatedConfig?.model);

    console.log(`[agent-chat] User ${user.id} starting ${isMultimodal ? 'multimodal' : 'text'} chat with model: ${model}, agent: ${validatedConfig?.name || 'default'}`);
    console.log(`[agent-chat] Message count: ${messages?.length || 0}`);

    // Build messages array
    const apiMessages: ChatMessage[] = [
      { role: "system", content: systemPrompt },
      ...messages,
    ];

    // 🆕 Build tool definitions for Function Calling
    const tools = buildToolDefinitions(validatedConfig);
    const hasTools = tools.length > 0;
    
    console.log(`[agent-chat] Tools available: ${tools.length}`, tools.map(t => t.function.name));

    const requestBody: Record<string, unknown> = {
      model,
      messages: apiMessages,
      stream: true,
    };
    
    // Only add tools if there are any defined
    if (hasTools) {
      requestBody.tools = tools;
      requestBody.tool_choice = 'auto';
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const statusCode = response.status;
      console.error(`[agent-chat] AI gateway error: ${statusCode}`);
      
      if (statusCode === 429) {
        return new Response(
          JSON.stringify({ error: "请求过于频繁，请稍后再试", code: "RATE_LIMITED" }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (statusCode === 402) {
        return new Response(
          JSON.stringify({ error: "服务额度不足，请在设置中添加额度", code: "PAYMENT_REQUIRED" }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      const errorText = await response.text();
      console.error(`[agent-chat] Error details: ${errorText}`);
      
      return new Response(
        JSON.stringify({ error: "AI 服务暂时不可用，请稍后重试", code: "SERVICE_ERROR" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[agent-chat] Streaming response started for user ${user.id} with model: ${model}, multimodal: ${isMultimodal}`);
    
    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("[agent-chat] Error:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "未知错误",
        code: "UNKNOWN_ERROR"
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
