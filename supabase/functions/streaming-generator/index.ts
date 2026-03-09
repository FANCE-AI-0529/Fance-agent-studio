import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface StreamingNode {
  id: string;
  nodeType: string;
  label: string;
  description?: string;
  position: { x: number; y: number };
}

interface StreamingEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
}

// 计算节点位置
function calculateNodePosition(index: number): { x: number; y: number } {
  const columns = 3;
  const spacingX = 280;
  const spacingY = 180;
  const startX = 100;
  const startY = 100;
  
  const col = index % columns;
  const row = Math.floor(index / columns);
  
  return {
    x: startX + col * spacingX,
    y: startY + row * spacingY,
  };
}

// 生成唯一 ID
function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// 思考消息模板
const thinkingMessages = {
  analyze: [
    "正在分析您的需求...",
    "理解任务的核心目标...",
    "识别关键功能点...",
  ],
  decide: [
    "规划智能体结构...",
    "确定所需组件...",
    "设计工作流程...",
  ],
  create: [
    "创建核心节点...",
    "构建处理逻辑...",
    "添加必要组件...",
  ],
  connect: [
    "建立节点连接...",
    "配置数据流向...",
    "优化执行路径...",
  ],
  validate: [
    "验证配置完整性...",
    "检查连接关系...",
    "确认生成结果...",
  ],
};

serve(async (req) => {
  // 处理 CORS 预检请求
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // --- Authentication ---
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims?.sub) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { description, generateFullWorkflow = true } = await req.json();
    
    if (!description) {
      return new Response(
        JSON.stringify({ error: 'Description is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'LOVABLE_API_KEY is not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const startTime = Date.now();
    const sessionId = generateId('session');

    // 创建 SSE 流
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        
        const sendEvent = (event: Record<string, unknown>) => {
          const data = JSON.stringify(event);
          controller.enqueue(encoder.encode(`data: ${data}\n\n`));
        };

        try {
          // 1. 发送初始化事件
          sendEvent({
            type: 'progress',
            step: 'init',
            progress: 5,
            message: '开始生成...',
          });

          // 2. 分析阶段
          sendEvent({
            type: 'thinking',
            thought: thinkingMessages.analyze[0],
            category: 'analyze',
            timestamp: Date.now(),
          });

          sendEvent({ type: 'progress', step: 'analyze', progress: 10 });

          // 3. 调用 AI 生成配置
          const systemPrompt = `你是一个智能体架构师，根据用户描述生成智能体工作流配置。

请以 JSON 格式返回以下结构：
{
  "name": "智能体名称",
  "description": "智能体描述",
  "nodes": [
    {
      "id": "唯一ID",
      "nodeType": "agent|skill|knowledge|trigger|condition|api",
      "label": "节点标签",
      "description": "节点描述"
    }
  ],
  "edges": [
    {
      "source": "源节点ID",
      "target": "目标节点ID",
      "label": "连接标签(可选)"
    }
  ],
  "config": {
    "model": "google/gemini-2.5-flash",
    "systemPrompt": "系统提示词"
  }
}

根据用户需求，生成合适的节点和连接关系。常用节点类型：
- trigger: 触发器节点（如用户输入、定时器）
- agent: 主智能体节点
- skill: 技能节点（如搜索、翻译、代码执行）
- knowledge: 知识库节点
- condition: 条件判断节点
- api: API 调用节点

确保生成的工作流逻辑完整、连接正确。`;

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
                { role: "user", content: `请为以下需求生成智能体工作流：\n\n${description}` },
              ],
              stream: false, // 非流式调用以获取完整 JSON
            }),
          });

          if (!response.ok) {
            const errorText = await response.text();
            console.error("AI gateway error:", response.status, errorText);
            
            if (response.status === 429) {
              sendEvent({ type: 'error', message: '请求过于频繁，请稍后重试', code: 'RATE_LIMIT' });
            } else if (response.status === 402) {
              sendEvent({ type: 'error', message: '额度不足，请充值后重试', code: 'PAYMENT_REQUIRED' });
            } else {
              sendEvent({ type: 'error', message: 'AI 服务暂时不可用', code: 'AI_ERROR' });
            }
            controller.close();
            return;
          }

          sendEvent({
            type: 'thinking',
            thought: thinkingMessages.decide[0],
            category: 'decide',
            timestamp: Date.now(),
          });

          sendEvent({ type: 'progress', step: 'plan', progress: 25 });

          const aiResponse = await response.json();
          const content = aiResponse.choices?.[0]?.message?.content || '';
          
          // 解析 JSON
          let config;
          try {
            // 尝试提取 JSON
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              config = JSON.parse(jsonMatch[0]);
            } else {
              throw new Error('No JSON found in response');
            }
          } catch (parseError) {
            console.error("JSON parse error:", parseError);
            // 使用默认配置
            config = {
              name: "智能助手",
              description: description,
              nodes: [
                { id: "trigger", nodeType: "trigger", label: "用户输入", description: "接收用户消息" },
                { id: "agent", nodeType: "agent", label: "主智能体", description: "处理用户请求" },
              ],
              edges: [
                { source: "trigger", target: "agent" }
              ],
              config: {
                model: "google/gemini-2.5-flash",
                systemPrompt: `你是一个智能助手，帮助用户完成：${description}`
              }
            };
          }

          sendEvent({
            type: 'thinking',
            thought: thinkingMessages.create[0],
            category: 'create',
            timestamp: Date.now(),
          });

          sendEvent({ type: 'progress', step: 'generate', progress: 35 });

          // 4. 逐个发送节点
          const nodes: StreamingNode[] = config.nodes || [];
          const processedNodes: StreamingNode[] = [];
          
          for (let i = 0; i < nodes.length; i++) {
            const node = nodes[i];
            const position = calculateNodePosition(i);
            const nodeId = node.id || generateId('node');
            
            const streamingNode: StreamingNode = {
              id: nodeId,
              nodeType: node.nodeType || 'skill',
              label: node.label || `节点 ${i + 1}`,
              description: node.description,
              position,
            };

            // Ghost 状态
            sendEvent({
              type: 'node',
              action: 'add',
              node: { ...streamingNode, status: 'ghost' },
            });

            await new Promise(r => setTimeout(r, 200));

            // Materializing 状态
            sendEvent({
              type: 'node',
              action: 'update',
              node: { ...streamingNode, status: 'materializing' },
            });

            await new Promise(r => setTimeout(r, 150));

            // Solid 状态
            sendEvent({
              type: 'node',
              action: 'finalize',
              node: { ...streamingNode, status: 'solid' },
            });

            processedNodes.push(streamingNode);

            // 更新进度
            const nodeProgress = 35 + ((i + 1) / nodes.length) * 30;
            sendEvent({ 
              type: 'progress', 
              step: 'generate', 
              progress: Math.round(nodeProgress),
              message: `已生成 ${i + 1}/${nodes.length} 个节点`,
            });

            await new Promise(r => setTimeout(r, 100));
          }

          // 5. 发送连线
          sendEvent({
            type: 'thinking',
            thought: thinkingMessages.connect[0],
            category: 'connect',
            timestamp: Date.now(),
          });

          sendEvent({ type: 'progress', step: 'connect', progress: 70 });

          const edges: StreamingEdge[] = config.edges || [];
          const processedEdges: StreamingEdge[] = [];

          for (let i = 0; i < edges.length; i++) {
            const edge = edges[i];
            const edgeId = generateId('edge');
            
            const streamingEdge: StreamingEdge = {
              id: edgeId,
              source: edge.source,
              target: edge.target,
              label: edge.label,
            };

            // Drawing 状态
            sendEvent({
              type: 'edge',
              action: 'add',
              edge: { ...streamingEdge, status: 'drawing', edgeType: 'default' },
            });

            await new Promise(r => setTimeout(r, 120));

            // Solid 状态
            sendEvent({
              type: 'edge',
              action: 'finalize',
              edge: { ...streamingEdge, status: 'solid', edgeType: 'default' },
            });

            processedEdges.push(streamingEdge);

            const edgeProgress = 70 + ((i + 1) / edges.length) * 20;
            sendEvent({ 
              type: 'progress', 
              step: 'connect', 
              progress: Math.round(edgeProgress),
            });

            await new Promise(r => setTimeout(r, 80));
          }

          // 6. 验证阶段
          sendEvent({
            type: 'thinking',
            thought: thinkingMessages.validate[0],
            category: 'validate',
            timestamp: Date.now(),
          });

          sendEvent({ type: 'progress', step: 'validate', progress: 95 });

          await new Promise(r => setTimeout(r, 300));

          // 7. 发送配置信息
          sendEvent({
            type: 'config',
            section: 'agent',
            config: {
              name: config.name || '智能助手',
              description: config.description || description,
              model: config.config?.model || 'google/gemini-2.5-flash',
              systemPrompt: config.config?.systemPrompt || '',
            },
          });

          // 8. 完成
          const generationTime = Date.now() - startTime;
          
          // 统计节点类型
          const nodeTypes: Record<string, number> = {};
          processedNodes.forEach(n => {
            nodeTypes[n.nodeType] = (nodeTypes[n.nodeType] || 0) + 1;
          });

          sendEvent({
            type: 'complete',
            agentConfig: {
              name: config.name,
              description: config.description,
              model: config.config?.model,
              systemPrompt: config.config?.systemPrompt,
            },
            summary: {
              totalNodes: processedNodes.length,
              totalEdges: processedEdges.length,
              generationTime,
              nodeTypes,
            },
          });

          sendEvent({ type: 'progress', step: 'complete', progress: 100 });

        } catch (error) {
          console.error("Streaming error:", error);
          sendEvent({
            type: 'error',
            message: error instanceof Error ? error.message : '生成过程中出错',
            code: 'GENERATION_ERROR',
            recoverable: true,
          });
        }

        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error("Request error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
