import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { description, category, difficulty } = await req.json();
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

    const systemPrompt = `你是一个专业的 Agent 技能模板生成器。用户会描述一个技能需求，你需要生成完整的技能模板，包含三个部分：

1. **Skill.md** - 技能定义文件，使用 YAML frontmatter + Markdown 格式
2. **handler.py** - Python 处理器代码
3. **config.yaml** - 运行配置文件

## Skill.md 格式要求

\`\`\`markdown
---
name: "skill-name"
version: "1.0.0"
description: "技能描述"
author: "Agent OS Studio"
permissions:
  - permission_1
  - permission_2
inputs:
  - name: param_name
    type: string|number|boolean|array|object
    description: 参数描述
    required: true|false
    default: 默认值（可选）
outputs:
  - name: output_name
    type: string|number|boolean|array|object
    description: 输出描述
---

# 技能名称

## 能力描述

详细描述技能能做什么...

## 使用示例

展示使用场景...

## 注意事项

使用限制和注意事项...
\`\`\`

## handler.py 格式要求

\`\`\`python
"""
技能处理器
"""

import os
from typing import Dict, Any

async def handle(inputs: Dict[str, Any]) -> Dict[str, Any]:
    """
    技能主入口
    
    Args:
        inputs: 输入参数字典
        
    Returns:
        输出结果字典
    """
    # 实现逻辑
    pass

def validate_inputs(inputs: Dict[str, Any]) -> bool:
    """验证输入参数"""
    pass
\`\`\`

## config.yaml 格式要求

\`\`\`yaml
runtime:
  python_version: "3.11"
  timeout_seconds: 30
  memory_mb: 256

dependencies:
  - package>=version

environment:
  ENV_VAR: "\${ENV_VAR}"
\`\`\`

请根据用户描述生成完整、可用的技能模板。确保代码是真实可运行的，不要使用占位符。

返回格式必须是以下 JSON：
{
  "name": "技能名称",
  "description": "技能描述",
  "skillMd": "完整的 Skill.md 内容",
  "handlerPy": "完整的 handler.py 内容",
  "configYaml": "完整的 config.yaml 内容"
}`;

    const userPrompt = `请为以下需求生成技能模板：

描述：${description}
${category ? `类别：${category}` : ''}
${difficulty ? `难度：${difficulty}` : ''}

请生成完整的、真实可用的技能模板代码。`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
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
          JSON.stringify({ error: "服务额度不足，请添加额度" }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "AI 服务暂时不可用" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return new Response(
        JSON.stringify({ error: "生成失败，请重试" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse the JSON response
    let template;
    try {
      template = JSON.parse(content);
    } catch {
      // Try to extract JSON from markdown code blocks
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        template = JSON.parse(jsonMatch[1]);
      } else {
        template = JSON.parse(content);
      }
    }

    return new Response(
      JSON.stringify(template),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Generate skill template error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "生成失败" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
