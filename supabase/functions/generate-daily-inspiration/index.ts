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
  implementation_steps: string[];
  recommended_skills: string[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const today = new Date().toISOString().split('T')[0];
    
    // Check if today's inspiration already exists
    const { data: existing } = await supabase
      .from('daily_inspiration')
      .select('id')
      .eq('featured_date', today)
      .limit(1);

    if (existing && existing.length > 0) {
      console.log('Today\'s inspiration already exists');
      return new Response(
        JSON.stringify({ success: true, message: 'Already generated for today' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate new inspiration using Lovable AI
    const prompt = `你是一个AI应用创意专家。请为智能体平台用户生成3条每日灵感内容。

要求：
1. 生成3条不同分类的灵感，分类从以下选择：效率提升、生活助手、学习成长、创意灵感
2. 每条包含：
   - title: 标题（15-20字，吸引人的标题）
   - description: 描述（40-50字，说明这个AI助手能做什么）
   - story_content: 用户故事引用（30-40字，第一人称的真实体验感受，用引号包裹）
   - category: 分类（从上述4个中选择）
   - implementation_steps: 实现步骤（3-5个步骤，每个10-15字）
   - recommended_skills: 推荐技能（2-3个，如"文案写作"、"数据分析"等）
3. 内容要具体可操作，能激发用户创建智能体的兴趣
4. 每条灵感应该是独特的使用场景

请返回JSON格式：
{
  "inspirations": [
    {
      "title": "...",
      "description": "...",
      "story_content": "...",
      "category": "...",
      "implementation_steps": ["步骤1", "步骤2", ...],
      "recommended_skills": ["技能1", "技能2", ...]
    }
  ]
}`;

    console.log('Calling Lovable AI to generate inspiration...');

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'user', content: prompt }
        ],
        response_format: { type: "json_object" }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Lovable AI error:', errorText);
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) {
      throw new Error('No content in AI response');
    }

    console.log('AI response:', content);

    let parsed: { inspirations: InspirationItem[] };
    try {
      parsed = JSON.parse(content);
    } catch (e) {
      console.error('Failed to parse AI response:', e);
      throw new Error('Failed to parse AI response');
    }

    if (!parsed.inspirations || !Array.isArray(parsed.inspirations)) {
      throw new Error('Invalid response format');
    }

    // Insert inspirations into database
    const insertData = parsed.inspirations.map((item: InspirationItem) => ({
      title: item.title,
      description: item.description,
      story_content: item.story_content,
      category: item.category,
      featured_date: today,
      view_count: 0,
    }));

    const { data: inserted, error: insertError } = await supabase
      .from('daily_inspiration')
      .insert(insertData)
      .select();

    if (insertError) {
      console.error('Insert error:', insertError);
      throw insertError;
    }

    console.log('Successfully generated and inserted inspiration:', inserted);

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
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
