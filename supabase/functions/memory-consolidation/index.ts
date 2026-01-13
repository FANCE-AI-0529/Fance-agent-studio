import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ConsolidationRequest {
  userId: string;
  agentId: string;
  progressContent: string;
  findings: string[];
  questionCount: number;
  messages?: Array<{ role: string; content: string }>;
}

interface ConsolidationResult {
  summary: string;
  keyInsights: string[];
  userPatterns: string[];
  emotionalTone: string;
  topicsDiscussed: string[];
  coreFacts: Array<{
    key: string;
    value: string;
    importance: number;
  }>;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: ConsolidationRequest = await req.json();
    const { progressContent, findings, questionCount, messages } = body;

    // 构建分析内容
    const contentToAnalyze = `
## 进度日志 (progress.md)
${progressContent || '无'}

## 发现/洞察 (findings)
${findings?.length ? findings.join('\n') : '无'}

## 对话消息数
${questionCount || 0}

${messages?.length ? `## 对话历史\n${messages.map(m => `${m.role}: ${m.content}`).join('\n\n')}` : ''}
`;

    // 调用 AI 进行记忆整合
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `你是一个专业的记忆整理专家。请分析以下对话和进度日志，提取关键信息用于长期记忆存储。

你的任务是：
1. 生成简洁的摘要（不超过 100 字）
2. 提取 3-5 条关键洞察
3. 识别用户的行为模式和偏好
4. 判断整体情感基调
5. 列出讨论的主要话题
6. 提取值得长期记住的核心事实（用于 Core Memory）

请使用中文回复。`
          },
          {
            role: "user",
            content: contentToAnalyze
          }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "consolidate_memory",
              description: "整理并结构化记忆信息",
              parameters: {
                type: "object",
                properties: {
                  summary: {
                    type: "string",
                    description: "100字以内的核心摘要"
                  },
                  keyInsights: {
                    type: "array",
                    items: { type: "string" },
                    description: "3-5条关键洞察"
                  },
                  userPatterns: {
                    type: "array",
                    items: { type: "string" },
                    description: "用户行为模式和偏好"
                  },
                  emotionalTone: {
                    type: "string",
                    description: "整体情感基调，如：积极、中性、焦虑、好奇等"
                  },
                  topicsDiscussed: {
                    type: "array",
                    items: { type: "string" },
                    description: "讨论的主要话题"
                  },
                  coreFacts: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        key: { type: "string", description: "事实的简短标识" },
                        value: { type: "string", description: "事实内容" },
                        importance: { type: "number", description: "重要性 1-10" }
                      },
                      required: ["key", "value", "importance"]
                    },
                    description: "值得长期记住的核心事实"
                  }
                },
                required: ["summary", "keyInsights", "userPatterns", "emotionalTone", "topicsDiscussed", "coreFacts"]
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "consolidate_memory" } }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`AI Gateway error: ${response.status} - ${errorText}`);
    }

    const aiResult = await response.json();
    
    // 解析 tool call 结果
    let result: ConsolidationResult;
    
    if (aiResult.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments) {
      try {
        result = JSON.parse(aiResult.choices[0].message.tool_calls[0].function.arguments);
      } catch {
        // 如果解析失败，使用默认值
        result = {
          summary: "会话记忆整理完成",
          keyInsights: [],
          userPatterns: [],
          emotionalTone: "中性",
          topicsDiscussed: [],
          coreFacts: []
        };
      }
    } else {
      // 备用：尝试从普通回复中提取
      result = {
        summary: aiResult.choices?.[0]?.message?.content?.slice(0, 100) || "会话记忆整理完成",
        keyInsights: [],
        userPatterns: [],
        emotionalTone: "中性",
        topicsDiscussed: [],
        coreFacts: []
      };
    }

    console.log('Memory consolidation completed:', {
      summaryLength: result.summary.length,
      insightsCount: result.keyInsights.length,
      patternsCount: result.userPatterns.length,
      coreFactsCount: result.coreFacts.length,
    });

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Memory consolidation error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        summary: "记忆整理失败",
        keyInsights: [],
        userPatterns: [],
        emotionalTone: "中性",
        topicsDiscussed: [],
        coreFacts: []
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
