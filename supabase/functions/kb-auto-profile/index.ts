import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// 知识库自动画像生成
// 读取文档内容，调用 LLM 生成 usage_context 和 intent_tags
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { knowledgeBaseId } = await req.json();

    if (!knowledgeBaseId) {
      throw new Error('knowledgeBaseId is required');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 更新状态为 processing
    await supabase
      .from('knowledge_bases')
      .update({ auto_profile_status: 'processing' })
      .eq('id', knowledgeBaseId);

    // 获取知识库信息
    const { data: kb, error: kbError } = await supabase
      .from('knowledge_bases')
      .select('id, name, description')
      .eq('id', knowledgeBaseId)
      .single();

    if (kbError || !kb) {
      throw new Error(`Knowledge base not found: ${kbError?.message}`);
    }

    // 获取该知识库的文档块（前 5000 tokens 约等于前 20 个块）
    const { data: chunks, error: chunksError } = await supabase
      .from('document_chunks')
      .select('content')
      .eq('knowledge_base_id', knowledgeBaseId)
      .order('chunk_index', { ascending: true })
      .limit(20);

    if (chunksError) {
      throw new Error(`Failed to fetch chunks: ${chunksError.message}`);
    }

    // 合并文档内容
    const documentContent = chunks?.map(c => c.content).join('\n\n') || '';
    
    if (!documentContent) {
      // 没有文档内容，使用知识库的名称和描述
      const fallbackContent = `知识库名称: ${kb.name}\n描述: ${kb.description || '无描述'}`;
      
      await supabase
        .from('knowledge_bases')
        .update({
          usage_context: kb.description || `${kb.name} 相关内容`,
          intent_tags: extractBasicTags(kb.name, kb.description),
          auto_profile_status: 'ready',
          last_profiled_at: new Date().toISOString(),
        })
        .eq('id', knowledgeBaseId);

      return new Response(JSON.stringify({
        success: true,
        message: 'Profile generated from metadata (no documents)',
        usage_context: kb.description,
        intent_tags: extractBasicTags(kb.name, kb.description),
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 截取前 5000 字符
    const truncatedContent = documentContent.slice(0, 5000);

    // 调用 Lovable AI Gateway 生成画像
    const aiGatewayUrl = Deno.env.get('AI_GATEWAY_URL') || 'https://ai-gateway.lovable.ai';
    
    const profilePrompt = `分析以下文档内容，生成知识库的语义画像。

文档内容：
${truncatedContent}

请返回 JSON 格式：
{
  "usage_context": "一段50字以内的描述，说明这个知识库适合在什么场景下使用，用户问什么类型的问题时应该查询这个知识库",
  "intent_tags": ["5个以内的意图标签，如 hr, policy, finance, technical, product 等"]
}

只返回 JSON，不要其他内容。`;

    const aiResponse = await fetch(`${aiGatewayUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'user', content: profilePrompt }
        ],
        temperature: 0.3,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI Gateway error:', errorText);
      throw new Error(`AI Gateway failed: ${aiResponse.status}`);
    }

    const aiResult = await aiResponse.json();
    const aiContent = aiResult.choices?.[0]?.message?.content || '';

    // 解析 JSON 结果
    let profile: { usage_context: string; intent_tags: string[] };
    try {
      // 尝试提取 JSON
      const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        profile = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', aiContent);
      // 回退到基础解析
      profile = {
        usage_context: `${kb.name} 相关文档，包含专业知识和参考资料`,
        intent_tags: extractBasicTags(kb.name, kb.description),
      };
    }

    // 生成 usage_context 的向量嵌入
    const embeddingResponse = await fetch(`${supabaseUrl}/functions/v1/embed-text`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify({ text: profile.usage_context }),
    });

    let summaryEmbedding = null;
    if (embeddingResponse.ok) {
      const embeddingResult = await embeddingResponse.json();
      summaryEmbedding = embeddingResult.embedding;
    }

    // 更新知识库
    const { error: updateError } = await supabase
      .from('knowledge_bases')
      .update({
        usage_context: profile.usage_context,
        intent_tags: profile.intent_tags,
        summary_embedding: summaryEmbedding,
        auto_profile_status: 'ready',
        last_profiled_at: new Date().toISOString(),
      })
      .eq('id', knowledgeBaseId);

    if (updateError) {
      throw new Error(`Failed to update knowledge base: ${updateError.message}`);
    }

    return new Response(JSON.stringify({
      success: true,
      usage_context: profile.usage_context,
      intent_tags: profile.intent_tags,
      has_embedding: !!summaryEmbedding,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('kb-auto-profile error:', error);

    // 尝试更新状态为 failed
    try {
      const { knowledgeBaseId } = await req.clone().json();
      if (knowledgeBaseId) {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabase = createClient(supabaseUrl, supabaseKey);
        await supabase
          .from('knowledge_bases')
          .update({ auto_profile_status: 'failed' })
          .eq('id', knowledgeBaseId);
      }
    } catch {}

    return new Response(JSON.stringify({
      success: false,
      error: errorMessage,
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// 基础标签提取（回退方案）
function extractBasicTags(name: string, description?: string | null): string[] {
  const text = `${name} ${description || ''}`.toLowerCase();
  const tagPatterns: Record<string, string[]> = {
    'hr': ['人事', '员工', 'hr', '人力', '招聘', '入职', '离职'],
    'finance': ['财务', '报销', '发票', '预算', '成本', 'finance'],
    'policy': ['政策', '规定', '制度', '规范', 'policy', '流程'],
    'technical': ['技术', '开发', '代码', 'api', '架构', 'technical'],
    'product': ['产品', '功能', '需求', 'product', '设计'],
    'sales': ['销售', '客户', '商务', 'sales', '合同'],
    'legal': ['法务', '合同', '法律', 'legal', '合规'],
    'marketing': ['市场', '营销', '推广', 'marketing', '品牌'],
  };

  const tags: string[] = [];
  for (const [tag, keywords] of Object.entries(tagPatterns)) {
    if (keywords.some(k => text.includes(k))) {
      tags.push(tag);
    }
  }

  return tags.length > 0 ? tags.slice(0, 5) : ['general'];
}
