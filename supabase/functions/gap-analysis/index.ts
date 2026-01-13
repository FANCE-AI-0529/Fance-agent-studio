// =====================================================
// 缺口分析 Edge Function
// Gap Analysis - AI 驱动的资产能力缺口分析
// =====================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface GapAnalysisRequest {
  description: string;
  userId: string;
  existingAssets?: SemanticAsset[];
}

interface SemanticAsset {
  id: string;
  assetType: 'skill' | 'mcp_tool' | 'knowledge_base';
  assetId: string;
  name: string;
  description?: string;
  capabilities: string[];
}

interface SkillSuggestion {
  name: string;
  description: string;
  category: string;
  capabilities: string[];
  requiredInputs: Array<{ name: string; type: string; description: string }>;
  expectedOutputs: Array<{ name: string; type: string; description: string }>;
  reason: string;
  priority: 'high' | 'medium' | 'low';
}

interface KnowledgeBaseSuggestion {
  id?: string;
  name: string;
  description: string;
  retrievalMode: 'vector' | 'graph' | 'hybrid';
  intentTags: string[];
  contextHook: string;
  autoInject: boolean;
  matchScore?: number;
}

// 能力关键词映射
const CAPABILITY_KEYWORDS: Record<string, string[]> = {
  '数据分析': ['分析', '统计', '报告', '数据', 'analytics', 'analyze', '报表'],
  '邮件发送': ['邮件', 'email', '发送', '通知', 'send', 'notify', 'smtp'],
  '文件处理': ['文件', '文档', 'pdf', 'excel', 'csv', 'file', '附件'],
  '数据查询': ['查询', '搜索', 'query', 'search', 'find', '检索'],
  '支付处理': ['支付', '付款', 'payment', 'pay', '结账', '收款'],
  '退款处理': ['退款', 'refund', '退货', 'return', '退回'],
  '订单管理': ['订单', 'order', '交易', 'transaction', '购买'],
  '用户认证': ['登录', '认证', 'auth', 'login', '验证', '权限'],
  '图像处理': ['图像', '图片', 'image', '图形', '视觉', '识别'],
  '文本生成': ['生成', '创建', 'generate', 'create', '写作', '撰写'],
  '翻译': ['翻译', 'translate', '多语言', '语言转换'],
  '摘要': ['摘要', 'summary', '总结', '概括', '提炼'],
  'API调用': ['api', 'http', 'webhook', '接口', '调用'],
  '数据库操作': ['数据库', 'database', 'sql', '存储', '持久化'],
  '知识检索': ['知识', 'rag', 'faq', '问答', '检索', '知识库'],
  '股票分析': ['股票', 'stock', '行情', '金融', '投资', '证券'],
  '天气查询': ['天气', 'weather', '气温', '气象'],
  '日程管理': ['日程', '日历', 'calendar', '提醒', '会议'],
  '客服处理': ['客服', '客户', '服务', 'support', 'customer'],
  '自动化': ['自动', 'automation', '定时', '调度', 'cron'],
};

// 知识库意图映射
const KNOWLEDGE_INTENT_MAP: Record<string, { name: string; tags: string[]; hook: string }> = {
  '公司政策': { name: '企业政策知识库', tags: ['company_policy', 'hr_rules'], hook: '用户询问公司规定或政策时自动注入' },
  '产品信息': { name: '产品知识库', tags: ['product', 'catalog'], hook: '用户询问产品详情时自动注入' },
  '技术文档': { name: '技术文档库', tags: ['technical', 'documentation'], hook: '用户询问技术问题时自动注入' },
  '财务规定': { name: '财务知识库', tags: ['finance', 'expense', 'reimbursement'], hook: '用户询问报销或财务问题时自动注入' },
  '法律合规': { name: '法规知识库', tags: ['legal', 'compliance'], hook: '用户询问法律或合规问题时自动注入' },
  '客户服务': { name: '客服FAQ库', tags: ['customer', 'faq', 'support'], hook: '用户咨询常见问题时自动注入' },
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const request: GapAnalysisRequest = await req.json();
    const { description, userId, existingAssets = [] } = request;

    if (!description || !userId) {
      return new Response(
        JSON.stringify({ error: "description and userId are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 1. 提取需求中的能力
    const requiredCapabilities = extractRequiredCapabilities(description);
    
    // 2. 获取用户现有资产（如果没有传入）
    let allAssets = existingAssets;
    if (allAssets.length === 0) {
      const { data: assets } = await supabase
        .from('asset_semantic_index')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true);
      
      allAssets = (assets || []).map(a => ({
        id: a.id,
        assetType: a.asset_type,
        assetId: a.asset_id,
        name: a.name,
        description: a.description,
        capabilities: a.capabilities || [],
      }));
    }

    // 3. 计算覆盖的能力
    const coveredCapabilities = new Set<string>();
    allAssets.forEach(asset => {
      asset.capabilities.forEach(cap => {
        coveredCapabilities.add(cap.toLowerCase());
        // 也检查关键词匹配
        for (const [capability, keywords] of Object.entries(CAPABILITY_KEYWORDS)) {
          if (keywords.some(kw => cap.toLowerCase().includes(kw.toLowerCase()))) {
            coveredCapabilities.add(capability.toLowerCase());
          }
        }
      });
    });

    // 4. 找出缺失的能力
    const missingCapabilities = requiredCapabilities.filter(
      cap => !coveredCapabilities.has(cap.toLowerCase())
    );

    // 5. 计算覆盖度
    const coverageScore = requiredCapabilities.length > 0
      ? (requiredCapabilities.length - missingCapabilities.length) / requiredCapabilities.length
      : 1;

    // 6. 生成技能建议
    const suggestedSkills = generateSkillSuggestions(missingCapabilities, description);

    // 7. 匹配和推荐知识库
    const suggestedKnowledgeBases = await matchKnowledgeBases(supabase, userId, description, allAssets);

    // 8. 返回分析结果
    return new Response(
      JSON.stringify({
        coverageScore,
        matchedAssets: allAssets.filter(a => 
          a.capabilities.some(c => requiredCapabilities.some(rc => 
            c.toLowerCase().includes(rc.toLowerCase()) || rc.toLowerCase().includes(c.toLowerCase())
          ))
        ),
        missingCapabilities,
        suggestedSkills,
        suggestedKnowledgeBases,
        requiredCapabilities,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Gap analysis error:", error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// 提取需求中的能力
function extractRequiredCapabilities(description: string): string[] {
  const capabilities: string[] = [];
  const descLower = description.toLowerCase();

  for (const [capability, keywords] of Object.entries(CAPABILITY_KEYWORDS)) {
    if (keywords.some(kw => descLower.includes(kw.toLowerCase()))) {
      capabilities.push(capability);
    }
  }

  return [...new Set(capabilities)];
}

// 生成技能建议
function generateSkillSuggestions(
  missingCapabilities: string[],
  description: string
): SkillSuggestion[] {
  const descLower = description.toLowerCase();
  
  return missingCapabilities.map(capability => {
    const category = inferCategory(capability);
    const isHighRisk = /支付|退款|删除|转账|敏感/.test(capability);
    const isMentionedDirectly = descLower.includes(capability.toLowerCase());
    
    return {
      name: `${capability}处理器`,
      description: `自动生成的${capability}处理技能，用于处理${capability}相关任务`,
      category,
      capabilities: [capability],
      requiredInputs: generateInputsForCapability(capability),
      expectedOutputs: generateOutputsForCapability(capability),
      reason: `需求描述中涉及"${capability}"功能，但现有资产库中缺少此能力`,
      priority: isHighRisk ? 'high' : isMentionedDirectly ? 'high' : 'medium',
    };
  });
}

// 匹配知识库
async function matchKnowledgeBases(
  supabase: any,
  userId: string,
  description: string,
  existingAssets: SemanticAsset[]
): Promise<KnowledgeBaseSuggestion[]> {
  const suggestions: KnowledgeBaseSuggestion[] = [];
  const descLower = description.toLowerCase();
  
  // 检测需要的知识库类型
  for (const [pattern, config] of Object.entries(KNOWLEDGE_INTENT_MAP)) {
    const patternLower = pattern.toLowerCase();
    const keywords = patternLower.split('');
    
    // 检查描述中是否包含相关关键词
    if (config.tags.some(tag => descLower.includes(tag)) || 
        descLower.includes(patternLower)) {
      
      // 检查现有资产中是否已有此类知识库
      const existingKB = existingAssets.find(a => 
        a.assetType === 'knowledge_base' && 
        config.tags.some(tag => 
          a.name.toLowerCase().includes(tag) || 
          (a.description || '').toLowerCase().includes(tag)
        )
      );
      
      if (existingKB) {
        suggestions.push({
          id: existingKB.assetId,
          name: existingKB.name,
          description: existingKB.description || config.hook,
          retrievalMode: 'hybrid',
          intentTags: config.tags,
          contextHook: config.hook,
          autoInject: true,
          matchScore: 0.9,
        });
      } else {
        // 推荐创建新知识库
        suggestions.push({
          name: config.name,
          description: `建议创建: ${config.name}`,
          retrievalMode: 'hybrid',
          intentTags: config.tags,
          contextHook: config.hook,
          autoInject: true,
          matchScore: 0.7,
        });
      }
    }
  }
  
  // 如果描述中提到知识库/RAG/问答，但没有具体匹配，推荐通用知识库
  if (suggestions.length === 0 && /知识|rag|faq|问答|文档|检索/.test(descLower)) {
    suggestions.push({
      name: '通用知识库',
      description: '存储和检索相关领域知识',
      retrievalMode: 'hybrid',
      intentTags: ['general', 'knowledge'],
      contextHook: '用户询问相关知识时自动注入',
      autoInject: true,
      matchScore: 0.5,
    });
  }
  
  return suggestions.sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));
}

// 推断类别
function inferCategory(capability: string): string {
  const categoryMap: Record<string, string> = {
    '数据分析': 'analysis',
    '邮件发送': 'communication',
    '支付处理': 'finance',
    '退款处理': 'finance',
    '订单管理': 'commerce',
    '股票分析': 'finance',
    '图像处理': 'vision',
    '文本生成': 'generation',
    '翻译': 'language',
    '知识检索': 'knowledge',
    '客服处理': 'support',
    '自动化': 'automation',
  };
  return categoryMap[capability] || 'general';
}

// 生成输入参数
function generateInputsForCapability(capability: string): Array<{ name: string; type: string; description: string }> {
  const inputsMap: Record<string, Array<{ name: string; type: string; description: string }>> = {
    '数据分析': [{ name: 'data', type: 'object', description: '待分析的数据' }],
    '邮件发送': [
      { name: 'to', type: 'string', description: '收件人邮箱' },
      { name: 'subject', type: 'string', description: '邮件主题' },
      { name: 'body', type: 'string', description: '邮件内容' },
    ],
    '支付处理': [
      { name: 'amount', type: 'number', description: '支付金额' },
      { name: 'orderId', type: 'string', description: '订单ID' },
    ],
    '退款处理': [
      { name: 'orderId', type: 'string', description: '订单ID' },
      { name: 'reason', type: 'string', description: '退款原因' },
    ],
  };
  return inputsMap[capability] || [{ name: 'input', type: 'string', description: '输入参数' }];
}

// 生成输出参数
function generateOutputsForCapability(capability: string): Array<{ name: string; type: string; description: string }> {
  const outputsMap: Record<string, Array<{ name: string; type: string; description: string }>> = {
    '数据分析': [{ name: 'report', type: 'object', description: '分析报告' }],
    '邮件发送': [{ name: 'success', type: 'boolean', description: '是否发送成功' }],
    '支付处理': [{ name: 'transactionId', type: 'string', description: '交易ID' }],
    '退款处理': [{ name: 'refundId', type: 'string', description: '退款ID' }],
  };
  return outputsMap[capability] || [{ name: 'result', type: 'object', description: '处理结果' }];
}
