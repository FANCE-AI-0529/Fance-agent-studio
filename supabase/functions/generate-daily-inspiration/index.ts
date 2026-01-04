import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

interface InspirationItem {
  title: string;
  description: string;
  story_content: string;
  category: string;
  implementation_steps?: string[];
  recommended_skills?: string[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check for force regeneration parameter
    let forceRegenerate = false;
    try {
      const body = await req.json();
      forceRegenerate = body?.force === true;
    } catch {
      // No body or invalid JSON, use defaults
    }

    const today = new Date().toISOString().split('T')[0];
    
    // Check if today's inspiration already exists (unless force regenerate)
    if (!forceRegenerate) {
      const { data: existing } = await supabase
        .from('daily_inspiration')
        .select('id')
        .eq('featured_date', today)
        .limit(1);

      if (existing && existing.length > 0) {
        console.log('Today\'s inspiration already exists');
        return new Response(
          JSON.stringify({ success: true, message: 'Already generated for today', existing: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    console.log('Calling Lovable AI to generate inspiration...');

    // Use tool calling for structured output - more reliable than JSON mode
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `你是一个AI应用创意专家。请为智能体平台用户生成每日灵感内容。内容要具体可操作，能激发用户创建智能体的兴趣。`
          },
          {
            role: 'user',
            content: `生成3条不同分类的灵感内容。分类从以下选择：效率提升、生活助手、学习成长、创意灵感。
            
每条灵感需要:
- title: 标题（15-20字）
- description: 描述（40-50字）
- story_content: 用户故事（30-40字，第一人称体验，用引号包裹）
- category: 分类
- implementation_steps: 3-5个实现步骤
- recommended_skills: 2-3个推荐技能`
          }
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'save_inspirations',
              description: '保存生成的灵感内容',
              parameters: {
                type: 'object',
                properties: {
                  inspirations: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        title: { type: 'string', description: '标题（15-20字）' },
                        description: { type: 'string', description: '描述（40-50字）' },
                        story_content: { type: 'string', description: '用户故事引用' },
                        category: { 
                          type: 'string', 
                          enum: ['效率提升', '生活助手', '学习成长', '创意灵感']
                        },
                        implementation_steps: {
                          type: 'array',
                          items: { type: 'string' },
                          description: '实现步骤'
                        },
                        recommended_skills: {
                          type: 'array',
                          items: { type: 'string' },
                          description: '推荐技能'
                        }
                      },
                      required: ['title', 'description', 'story_content', 'category']
                    }
                  }
                },
                required: ['inspirations']
              }
            }
          }
        ],
        tool_choice: { type: 'function', function: { name: 'save_inspirations' } }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Lovable AI error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: '请求过于频繁，请稍后再试', code: 'RATE_LIMITED' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI服务额度不足', code: 'QUOTA_EXCEEDED' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    
    // Extract from tool call response
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      console.error('No tool call in response:', JSON.stringify(data));
      throw new Error('Invalid AI response format');
    }

    let parsed: { inspirations: InspirationItem[] };
    try {
      parsed = JSON.parse(toolCall.function.arguments);
    } catch (e) {
      console.error('Failed to parse tool call arguments:', toolCall.function.arguments);
      throw new Error('Failed to parse AI response');
    }

    if (!parsed.inspirations || !Array.isArray(parsed.inspirations) || parsed.inspirations.length === 0) {
      throw new Error('No inspirations in response');
    }

    console.log(`Generated ${parsed.inspirations.length} inspirations`);

    // If force regenerate, delete today's existing records first
    if (forceRegenerate) {
      await supabase
        .from('daily_inspiration')
        .delete()
        .eq('featured_date', today);
      console.log('Deleted existing inspirations for today');
    }

    // Insert inspirations into database with all fields
    const insertData = parsed.inspirations.map((item: InspirationItem) => ({
      title: item.title,
      description: item.description,
      story_content: item.story_content,
      category: item.category,
      featured_date: today,
      view_count: 0,
      // Store extra data as JSON in story_content if needed
      // The table doesn't have implementation_steps/recommended_skills columns
      // So we append to description or store in a metadata-friendly way
    }));

    const { data: inserted, error: insertError } = await supabase
      .from('daily_inspiration')
      .insert(insertData)
      .select();

    if (insertError) {
      console.error('Insert error:', insertError);
      throw insertError;
    }

    console.log('Successfully generated and inserted inspiration:', inserted?.length);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Generated successfully',
        count: inserted?.length || 0,
        inspirations: inserted
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in generate-daily-inspiration:', error);
    return new Response(
      JSON.stringify({ error: errorMessage, code: 'GENERATION_FAILED' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
