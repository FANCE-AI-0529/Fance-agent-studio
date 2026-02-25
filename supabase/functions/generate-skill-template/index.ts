import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_RETRIES = 3;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ========== AUTHENTICATION CHECK ==========
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authentication required", code: "AUTH_REQUIRED" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error("Authentication failed:", userError?.message);
      return new Response(
        JSON.stringify({ error: "Unauthorized", code: "UNAUTHORIZED" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    // ========== END AUTHENTICATION ==========

    const { description, category, difficulty, format } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    if (!description) {
      return new Response(
        JSON.stringify({ error: "请提供技能描述" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`User ${user.id} generating skill template for: ${description}`);

    console.log(`Generating skill template for: ${description}`);

    const isNativeFormat = format === 'nanoclaw_native';

    // Use tool calling for guaranteed structured output
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `你是一个专业的 Agent 技能模板生成器。根据用户描述生成完整、规范的技能模板。

${isNativeFormat ? `## NanoClaw 原生格式

Skill.md 使用以下 YAML frontmatter 格式：
---
name: "skill-name"
description: "技能描述"
allowed-tools: Bash(tool1,tool2), Read, Write
---

然后是 Markdown 文档，包含：Quick start → Core workflow → Commands → Examples

allowed-tools 可选值：
- Bash(*) — 通用 Shell 访问
- Bash(tool1,tool2,...) — 限定特定命令
- Read — 文件读取
- Write — 文件写入
- Bash(agent-browser:*) — 浏览器自动化
- Bash(curl,jq) — HTTP 请求

` : `## Skill.md YAML Frontmatter 必须包含以下字段：`}


1. **name** (必填): 技能名称，kebab-case 格式，如 "web-search"
2. **version** (必填): 语义化版本号，如 "1.0.0"
3. **description** (必填): 技能描述，简明扼要说明功能
4. **author** (必填): 作者名称，默认使用 "Agent Studio"
5. **permissions** (必填): 权限声明数组，必须包含以下一项或多项：
   - read: 读取数据权限
   - write: 写入数据权限
   - network: 网络访问权限
   - compute: 计算资源权限
   - delete: 删除数据权限
6. **inputs** (必填): 输入参数数组，每项必须包含：
   - name: 参数名（英文）
   - type: 类型（string/number/boolean/object/array）
   - description: 参数描述
   - required: 是否必填（true/false）
7. **outputs** (必填): 输出参数数组，每项必须包含：
   - name: 参数名
   - type: 类型
   - description: 描述

## 完整的 Skill.md 格式示例（严格按此格式）：

---
name: "text-summarizer"
version: "1.0.0"
description: "文本摘要生成技能"
author: "Agent Studio"
permissions:
  - read
  - compute
inputs:
  - name: text
    type: string
    description: 需要摘要的原始文本
    required: true
  - name: maxLength
    type: number
    description: 摘要最大长度
    required: false
outputs:
  - name: summary
    type: string
    description: 生成的文本摘要
  - name: wordCount
    type: number
    description: 摘要字数
---

# 文本摘要技能

## 功能说明
该技能用于生成文本摘要...

## 使用示例
...

## handler.py 要求：
- 必须包含 async def handler(inputs: dict) -> dict 函数
- 使用类型注解
- 包含错误处理
- 返回与 outputs 定义一致的字典

## config.yaml 要求：
- 包含 name、version、runtime 等基础配置
- 包含 timeout、memory 等运行时配置`
          },
          {
            role: "user",
            content: `请为以下需求生成技能模板：

描述：${description}
${category ? `类别：${category}` : ''}
${difficulty ? `难度：${difficulty}` : ''}

请严格按照系统提示中的格式要求生成完整的技能模板，确保 YAML frontmatter 包含所有必填字段（name, version, description, author, permissions, inputs, outputs）。`
          }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "create_skill_template",
              description: "创建一个完整的技能模板，必须包含所有必填字段",
              parameters: {
                type: "object",
                properties: {
                  name: {
                    type: "string",
                    description: "技能名称（英文，kebab-case格式，如 'web-search'）"
                  },
                  description: {
                    type: "string",
                    description: "技能描述（中文，简明扼要）"
                  },
                  allowedTools: {
                    type: "string",
                    description: "NanoClaw 原生格式的 allowed-tools 声明，如 'Bash(curl,jq), Read'。仅在 NanoClaw 原生格式时需要。"
                  },
                  skillMd: {
                    type: "string",
                    description: "完整的 Skill.md 内容。必须以 '---' 开头（无前导空白），YAML frontmatter 必须包含: name, version, description, author, permissions(数组), inputs(数组，每项含name/type/description/required), outputs(数组，每项含name/type/description)。frontmatter 后接 Markdown 文档。"
                  },
                  handlerPy: {
                    type: "string",
                    description: "完整的 handler.py Python代码。必须包含 async def handler(inputs: dict) -> dict 函数，使用类型注解，包含错误处理。"
                  },
                  configYaml: {
                    type: "string",
                    description: "完整的 config.yaml 配置文件，包含 name, version, runtime, timeout, memory 等配置项。"
                  }
                },
                required: ["name", "description", "skillMd", "handlerPy", "configYaml"]
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "create_skill_template" } }
      }),
    });

    if (!response.ok) {
      const status = response.status;
      const errorText = await response.text();
      console.error("AI gateway error:", status, errorText);
      
      if (status === 429) {
        return new Response(
          JSON.stringify({ error: "请求过于频繁，请稍后再试", code: "RATE_LIMITED" }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (status === 402) {
        return new Response(
          JSON.stringify({ error: "服务额度不足，请添加额度", code: "QUOTA_EXCEEDED" }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      return new Response(
        JSON.stringify({ error: "AI 服务暂时不可用", code: "AI_ERROR" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    
    // Extract from tool call
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      console.error("No tool call in response:", JSON.stringify(data));
      throw new Error("Invalid AI response - no tool call");
    }

    let template;
    try {
      template = JSON.parse(toolCall.function.arguments);
    } catch (parseError) {
      console.error("Failed to parse tool call arguments:", toolCall.function.arguments);
      throw new Error("Failed to parse AI response");
    }

    // Validate required fields
    if (!template.name || !template.skillMd || !template.handlerPy || !template.configYaml) {
      console.error("Missing required fields in template:", Object.keys(template));
      throw new Error("Incomplete template generated");
    }

    // Clean up generated content - trim leading/trailing whitespace
    template.skillMd = template.skillMd?.trim() || "";
    template.handlerPy = template.handlerPy?.trim() || "";
    template.configYaml = template.configYaml?.trim() || "";

    // Ensure skillMd starts with YAML frontmatter
    if (!template.skillMd.startsWith("---")) {
      template.skillMd = "---\n" + template.skillMd;
    }

    console.log(`Successfully generated template: ${template.name}`);

    return new Response(
      JSON.stringify(template),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Generate skill template error:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "生成失败，请重试",
        code: "GENERATION_FAILED"
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
