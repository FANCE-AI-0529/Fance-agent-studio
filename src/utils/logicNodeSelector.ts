// =====================================================
// 智能逻辑节点选择器
// Logic Node Selector - Dynamic Routing for Agent Building
// =====================================================

/**
 * 逻辑节点类型
 */
export type LogicNodeType = 'intent_router' | 'condition' | 'parallel' | 'loop';

/**
 * 逻辑节点候选结果
 */
export interface LogicNodeCandidate {
  type: LogicNodeType;
  name: string;
  confidence: number;
  matchReason: string;
  suggestedConfig: Record<string, unknown>;
  priority: number;
}

/**
 * 匹配模式定义
 */
interface MatchPattern {
  pattern: RegExp;
  confidence: number;
  reason: string;
}

// ========== 意图路由器匹配规则 ==========

const INTENT_ROUTER_PATTERNS: MatchPattern[] = [
  { pattern: /根据.*(?:意图|类型|种类).*(?:分类|路由|分流|处理)/i, confidence: 0.95, reason: '基于意图分类的智能路由' },
  { pattern: /(?:识别|判断|分析).*(?:意图|需求|类型)/i, confidence: 0.85, reason: '意图识别与分类' },
  { pattern: /(?:用户|客户).*(?:询问|咨询|请求).*(?:不同|多种|各类)/i, confidence: 0.8, reason: '多类型用户请求处理' },
  { pattern: /(?:分流|转发|路由).*(?:到|至|给).*(?:不同|对应|相应)/i, confidence: 0.85, reason: '智能请求分流' },
  { pattern: /(?:智能|自动).*(?:识别|判断).*(?:并|然后).*(?:处理|执行)/i, confidence: 0.75, reason: '自动识别并执行' },
  { pattern: /根据.*(?:问题|请求|输入).*(?:类型|种类)/i, confidence: 0.8, reason: '请求类型识别' },
  { pattern: /(?:多|多个).*(?:意图|分支|路径).*(?:处理|响应)/i, confidence: 0.85, reason: '多意图分支处理' },
];

// ========== 条件判断匹配规则 ==========

const CONDITION_PATTERNS: MatchPattern[] = [
  { pattern: /如果.*(?:就|则).*(?:否则|不然|反之)/i, confidence: 0.95, reason: 'IF-ELSE 条件逻辑' },
  { pattern: /(?:当|如果|若).*(?:大于|小于|等于|超过|低于|达到)/i, confidence: 0.9, reason: '数值条件判断' },
  { pattern: /(?:满足|符合|达到).*条件.*(?:执行|操作|触发)/i, confidence: 0.85, reason: '条件触发执行' },
  { pattern: /(?:判断|检查|验证).*(?:是否|有没有|能不能)/i, confidence: 0.8, reason: '布尔条件验证' },
  { pattern: /(?:如果|当).*(?:成功|失败|通过|不通过)/i, confidence: 0.85, reason: '状态条件判断' },
  { pattern: /(?:库存|余额|数量|金额).*(?:大于|小于|超过|低于)/i, confidence: 0.9, reason: '业务指标阈值判断' },
  { pattern: /(?:满足|不满足).*(?:要求|标准|条件)/i, confidence: 0.85, reason: '条件满足性检查' },
  { pattern: /(?:根据|基于).*(?:结果|状态).*(?:决定|选择)/i, confidence: 0.75, reason: '基于结果决策' },
];

// ========== 并发执行匹配规则 ==========

const PARALLEL_PATTERNS: MatchPattern[] = [
  { pattern: /同时.*(?:执行|发送|处理|通知|调用)/i, confidence: 0.95, reason: '同时执行多任务' },
  { pattern: /(?:并行|并发).*(?:处理|执行|运行)/i, confidence: 0.95, reason: '并行处理' },
  { pattern: /(?:一起|同步|同时).*(?:通知|发送|推送)/i, confidence: 0.9, reason: '同步发送通知' },
  { pattern: /(?:同时|一起).*(?:和|与|以及).*(?:发送|执行|处理)/i, confidence: 0.9, reason: '多渠道同时操作' },
  { pattern: /(?:邮件|Slack|微信|短信).*(?:和|与).*(?:邮件|Slack|微信|短信)/i, confidence: 0.85, reason: '多渠道通知' },
  { pattern: /(?:批量|批次).*(?:处理|执行|发送)/i, confidence: 0.8, reason: '批量并行处理' },
  { pattern: /(?:多个|多项).*(?:任务|操作).*(?:同时|并行)/i, confidence: 0.85, reason: '多任务并行' },
];

// ========== 循环执行匹配规则 ==========

const LOOP_PATTERNS: MatchPattern[] = [
  { pattern: /(?:循环|遍历|逐一|逐个).*(?:处理|执行|检查)/i, confidence: 0.9, reason: '循环处理' },
  { pattern: /(?:对每个|对于每|针对每).*(?:执行|进行|处理)/i, confidence: 0.9, reason: 'ForEach 循环' },
  { pattern: /(?:重复|反复).*(?:执行|尝试|检查)/i, confidence: 0.85, reason: '重复执行' },
  { pattern: /(?:直到|直至).*(?:完成|成功|满足)/i, confidence: 0.8, reason: '条件循环' },
  { pattern: /(?:每个|所有|全部).*(?:项目|记录|数据).*(?:处理|操作)/i, confidence: 0.85, reason: '批量循环处理' },
];

/**
 * 计算模式匹配得分
 */
function calculatePatternScore(description: string, patterns: MatchPattern[]): { score: number; bestMatch: MatchPattern | null } {
  let maxScore = 0;
  let bestMatch: MatchPattern | null = null;
  
  for (const pattern of patterns) {
    if (pattern.pattern.test(description)) {
      if (pattern.confidence > maxScore) {
        maxScore = pattern.confidence;
        bestMatch = pattern;
      }
    }
  }
  
  return { score: maxScore, bestMatch };
}

/**
 * 关键词加权匹配
 */
function calculateKeywordBonus(description: string, keywords: string[], weight: number = 0.05): number {
  const descLower = description.toLowerCase();
  let bonus = 0;
  
  for (const keyword of keywords) {
    if (descLower.includes(keyword.toLowerCase())) {
      bonus += weight;
    }
  }
  
  return Math.min(bonus, 0.2); // Cap at 0.2
}

/**
 * 根据用户描述智能选择最适合的逻辑节点
 */
export function selectLogicNode(description: string): LogicNodeCandidate | null {
  if (!description || description.length < 10) {
    return null;
  }
  
  const candidates: LogicNodeCandidate[] = [];
  
  // 1. 检测意图路由器
  const routerResult = calculatePatternScore(description, INTENT_ROUTER_PATTERNS);
  if (routerResult.bestMatch) {
    const keywordBonus = calculateKeywordBonus(description, ['意图', '路由', '分类', '分流', '智能']);
    candidates.push({
      type: 'intent_router',
      name: '意图路由器',
      confidence: Math.min(routerResult.score + keywordBonus, 1.0),
      matchReason: routerResult.bestMatch.reason,
      suggestedConfig: generateRouterConfig(description),
      priority: 1,
    });
  }
  
  // 2. 检测条件判断
  const conditionResult = calculatePatternScore(description, CONDITION_PATTERNS);
  if (conditionResult.bestMatch) {
    const keywordBonus = calculateKeywordBonus(description, ['如果', '否则', '条件', '判断', '阈值']);
    candidates.push({
      type: 'condition',
      name: '条件判断',
      confidence: Math.min(conditionResult.score + keywordBonus, 1.0),
      matchReason: conditionResult.bestMatch.reason,
      suggestedConfig: generateConditionConfig(description),
      priority: 2,
    });
  }
  
  // 3. 检测并发执行
  const parallelResult = calculatePatternScore(description, PARALLEL_PATTERNS);
  if (parallelResult.bestMatch) {
    const keywordBonus = calculateKeywordBonus(description, ['同时', '并行', '并发', '一起', '同步']);
    candidates.push({
      type: 'parallel',
      name: '并发执行',
      confidence: Math.min(parallelResult.score + keywordBonus, 1.0),
      matchReason: parallelResult.bestMatch.reason,
      suggestedConfig: generateParallelConfig(description),
      priority: 3,
    });
  }
  
  // 4. 检测循环执行
  const loopResult = calculatePatternScore(description, LOOP_PATTERNS);
  if (loopResult.bestMatch) {
    const keywordBonus = calculateKeywordBonus(description, ['循环', '遍历', '每个', '重复']);
    candidates.push({
      type: 'loop',
      name: '循环执行',
      confidence: Math.min(loopResult.score + keywordBonus, 1.0),
      matchReason: loopResult.bestMatch.reason,
      suggestedConfig: generateLoopConfig(description),
      priority: 4,
    });
  }
  
  // 如果没有候选，返回 null
  if (candidates.length === 0) {
    return null;
  }
  
  // 按置信度排序，返回最高的
  candidates.sort((a, b) => {
    // 首先按置信度排序
    if (b.confidence !== a.confidence) {
      return b.confidence - a.confidence;
    }
    // 置信度相同时按优先级排序
    return a.priority - b.priority;
  });
  
  // 只有置信度 >= 0.6 才返回
  const best = candidates[0];
  if (best.confidence >= 0.6) {
    return best;
  }
  
  return null;
}

/**
 * 选择多个逻辑节点（支持复合场景）
 */
export function selectMultipleLogicNodes(description: string): LogicNodeCandidate[] {
  const candidates: LogicNodeCandidate[] = [];
  
  // 检测意图路由器
  const routerResult = calculatePatternScore(description, INTENT_ROUTER_PATTERNS);
  if (routerResult.bestMatch && routerResult.score >= 0.6) {
    candidates.push({
      type: 'intent_router',
      name: '意图路由器',
      confidence: routerResult.score,
      matchReason: routerResult.bestMatch.reason,
      suggestedConfig: generateRouterConfig(description),
      priority: 1,
    });
  }
  
  // 检测条件判断
  const conditionResult = calculatePatternScore(description, CONDITION_PATTERNS);
  if (conditionResult.bestMatch && conditionResult.score >= 0.6) {
    candidates.push({
      type: 'condition',
      name: '条件判断',
      confidence: conditionResult.score,
      matchReason: conditionResult.bestMatch.reason,
      suggestedConfig: generateConditionConfig(description),
      priority: 2,
    });
  }
  
  // 检测并发执行
  const parallelResult = calculatePatternScore(description, PARALLEL_PATTERNS);
  if (parallelResult.bestMatch && parallelResult.score >= 0.6) {
    candidates.push({
      type: 'parallel',
      name: '并发执行',
      confidence: parallelResult.score,
      matchReason: parallelResult.bestMatch.reason,
      suggestedConfig: generateParallelConfig(description),
      priority: 3,
    });
  }
  
  // 检测循环执行
  const loopResult = calculatePatternScore(description, LOOP_PATTERNS);
  if (loopResult.bestMatch && loopResult.score >= 0.6) {
    candidates.push({
      type: 'loop',
      name: '循环执行',
      confidence: loopResult.score,
      matchReason: loopResult.bestMatch.reason,
      suggestedConfig: generateLoopConfig(description),
      priority: 4,
    });
  }
  
  // 按优先级排序
  return candidates.sort((a, b) => a.priority - b.priority);
}

// ========== 配置生成辅助函数 ==========

/**
 * 生成意图路由器配置
 */
function generateRouterConfig(description: string): Record<string, unknown> {
  const routes: Array<{ id: string; name: string; keywords: string[] }> = [];
  
  // 从描述中提取可能的路由
  const routePatterns = [
    { pattern: /(?:查询|询问).*(?:价格|报价)/i, id: 'price', name: '价格查询', keywords: ['价格', '报价', '多少钱'] },
    { pattern: /(?:查询|询问).*(?:库存|数量)/i, id: 'inventory', name: '库存查询', keywords: ['库存', '数量', '有没有'] },
    { pattern: /(?:咨询|询问).*(?:产品|商品)/i, id: 'product', name: '产品咨询', keywords: ['产品', '商品', '功能'] },
    { pattern: /(?:投诉|反馈|问题)/i, id: 'complaint', name: '投诉处理', keywords: ['投诉', '问题', '不满'] },
    { pattern: /(?:技术|故障|修复)/i, id: 'technical', name: '技术支持', keywords: ['技术', '故障', '修复'] },
  ];
  
  for (const rp of routePatterns) {
    if (rp.pattern.test(description)) {
      routes.push({ id: rp.id, name: rp.name, keywords: rp.keywords });
    }
  }
  
  // 如果没有匹配到具体路由，添加默认路由
  if (routes.length === 0) {
    routes.push(
      { id: 'intent_a', name: '意图A', keywords: [] },
      { id: 'intent_b', name: '意图B', keywords: [] }
    );
  }
  
  return {
    mode: 'semantic',
    routes,
    defaultRoute: 'fallback',
    confidenceThreshold: 0.7,
  };
}

/**
 * 生成条件判断配置
 */
function generateConditionConfig(description: string): Record<string, unknown> {
  const config: Record<string, unknown> = {
    mode: 'simple',
    rules: [],
  };
  
  // 尝试提取数值阈值
  const thresholdMatch = description.match(/(?:大于|小于|超过|低于|达到|等于)\s*(\d+)/);
  if (thresholdMatch) {
    const value = parseInt(thresholdMatch[1], 10);
    const operator = /小于|低于/.test(description) ? 'less_than' 
      : /大于|超过|达到/.test(description) ? 'greater_than' 
      : 'equals';
    
    config.rules = [{
      field: 'value',
      operator,
      value,
    }];
    config.expression = `value ${operator === 'greater_than' ? '>' : operator === 'less_than' ? '<' : '='} ${value}`;
  }
  
  return config;
}

/**
 * 生成并发执行配置
 */
function generateParallelConfig(description: string): Record<string, unknown> {
  const branches: string[] = [];
  
  // 检测通知渠道
  if (/邮件|email/i.test(description)) branches.push('email');
  if (/Slack/i.test(description)) branches.push('slack');
  if (/微信|wechat/i.test(description)) branches.push('wechat');
  if (/短信|SMS/i.test(description)) branches.push('sms');
  if (/钉钉|dingtalk/i.test(description)) branches.push('dingtalk');
  
  // 如果没有检测到具体渠道，添加默认分支
  if (branches.length === 0) {
    branches.push('branch_1', 'branch_2');
  }
  
  return {
    mode: 'fork',
    branches,
    waitAll: true,
    failFast: false,
    maxConcurrency: branches.length,
  };
}

/**
 * 生成循环执行配置
 */
function generateLoopConfig(description: string): Record<string, unknown> {
  const config: Record<string, unknown> = {
    mode: 'foreach',
    iteratorVariable: 'item',
    maxIterations: 100,
  };
  
  // 检测集合表达式
  const collectionPatterns = [
    { pattern: /(?:每个|所有|全部).*(?:用户|客户)/i, expression: '{{users}}' },
    { pattern: /(?:每个|所有|全部).*(?:订单|记录)/i, expression: '{{orders}}' },
    { pattern: /(?:每个|所有|全部).*(?:项目|任务)/i, expression: '{{items}}' },
    { pattern: /(?:每个|所有|全部).*(?:文件|文档)/i, expression: '{{files}}' },
  ];
  
  for (const cp of collectionPatterns) {
    if (cp.pattern.test(description)) {
      config.collectionExpression = cp.expression;
      break;
    }
  }
  
  return config;
}

/**
 * 检查描述是否需要逻辑节点
 */
export function needsLogicNode(description: string): boolean {
  if (!description) return false;
  
  const allPatterns = [
    ...INTENT_ROUTER_PATTERNS,
    ...CONDITION_PATTERNS,
    ...PARALLEL_PATTERNS,
    ...LOOP_PATTERNS,
  ];
  
  for (const pattern of allPatterns) {
    if (pattern.pattern.test(description) && pattern.confidence >= 0.7) {
      return true;
    }
  }
  
  return false;
}

/**
 * 获取逻辑节点类型的中文名称
 */
export function getLogicNodeTypeName(type: LogicNodeType): string {
  const names: Record<LogicNodeType, string> = {
    intent_router: '意图路由器',
    condition: '条件判断',
    parallel: '并发执行',
    loop: '循环执行',
  };
  return names[type] || type;
}

/**
 * 获取逻辑节点类型的图标 ID
 */
export function getLogicNodeIcon(type: LogicNodeType): string {
  const icons: Record<LogicNodeType, string> = {
    intent_router: 'GitBranch',
    condition: 'GitFork',
    parallel: 'Layers',
    loop: 'Repeat',
  };
  return icons[type] || 'Box';
}

// ========== Phase 3: 编程任务专用逻辑节点选择 ==========

export type ProgrammingTaskType = 'generation' | 'modification' | 'bugfix' | 'development';

/**
 * 编程任务专用逻辑节点选择
 */
export function selectProgrammingLogicNodes(
  description: string,
  taskType: ProgrammingTaskType
): LogicNodeCandidate[] {
  const candidates: LogicNodeCandidate[] = [];
  
  // 编程任务始终需要条件判断（成功/失败分支）
  candidates.push({
    type: 'condition',
    name: '执行结果判断',
    confidence: 0.9,
    matchReason: '编程任务需要检查执行结果',
    suggestedConfig: {
      mode: 'result_check',
      successCondition: 'result.success === true',
      failureAction: 'retry_or_rollback',
    },
    priority: 1,
  });
  
  // Bug 修复任务可能需要循环尝试
  if (taskType === 'bugfix') {
    candidates.push({
      type: 'loop',
      name: '修复尝试循环',
      confidence: 0.75,
      matchReason: 'Bug 修复可能需要多次尝试',
      suggestedConfig: {
        mode: 'retry',
        maxRetries: 3,
        exitCondition: 'tests_pass',
      },
      priority: 2,
    });
  }
  
  // 开发任务可能需要并行执行（前后端同时开发）
  if (taskType === 'development') {
    // 检查是否涉及多个组件或并行开发
    if (/(?:前端|后端).*(?:和|与|及).*(?:前端|后端)/i.test(description) ||
        /(?:同时|并行).*(?:开发|实现)/i.test(description)) {
      candidates.push({
        type: 'parallel',
        name: '并行开发',
        confidence: 0.7,
        matchReason: '多模块并行开发',
        suggestedConfig: {
          mode: 'fork',
          branches: ['frontend', 'backend'],
          waitAll: true,
        },
        priority: 3,
      });
    }
  }
  
  return candidates;
}

/**
 * 检测编程意图
 */
export function detectProgrammingIntent(description: string): {
  isProgramming: boolean;
  taskType: ProgrammingTaskType | null;
  confidence: number;
  matchReason: string;
} {
  const programmingPatterns = {
    generation: [
      { pattern: /(?:写|编写|生成|创建).*(?:代码|程序|脚本)/i, confidence: 0.95, reason: '代码生成任务' },
      { pattern: /(?:实现|开发).*(?:功能|模块|组件|API)/i, confidence: 0.9, reason: '功能开发任务' },
      { pattern: /coding|programming|implement|develop/i, confidence: 0.85, reason: 'Programming task' },
    ],
    modification: [
      { pattern: /(?:修改|编辑|更新|改动).*(?:代码|文件|函数)/i, confidence: 0.95, reason: '代码修改任务' },
      { pattern: /(?:重构|优化|改进).*(?:代码|结构|性能)/i, confidence: 0.9, reason: '代码重构任务' },
      { pattern: /refactor|optimize|improve.*code/i, confidence: 0.85, reason: 'Code refactoring' },
    ],
    bugfix: [
      { pattern: /(?:修复|解决|处理).*(?:Bug|错误|问题|异常)/i, confidence: 0.95, reason: 'Bug 修复任务' },
      { pattern: /(?:调试|Debug|排查).*(?:问题|错误)/i, confidence: 0.9, reason: '代码调试任务' },
      { pattern: /fix.*(?:bug|error|issue)/i, confidence: 0.85, reason: 'Bug fix task' },
    ],
    development: [
      { pattern: /(?:开发|构建|创建).*(?:App|应用|网站|系统)/i, confidence: 0.9, reason: '应用开发任务' },
      { pattern: /(?:搭建|部署).*(?:项目|环境|服务)/i, confidence: 0.85, reason: '项目搭建任务' },
      { pattern: /build.*(?:app|application|website)/i, confidence: 0.85, reason: 'App development' },
    ],
  };

  let maxConfidence = 0;
  let taskType: ProgrammingTaskType | null = null;
  let matchReason = '';

  for (const [type, patterns] of Object.entries(programmingPatterns)) {
    for (const { pattern, confidence, reason } of patterns) {
      if (pattern.test(description) && confidence > maxConfidence) {
        maxConfidence = confidence;
        taskType = type as ProgrammingTaskType;
        matchReason = reason;
      }
    }
  }

  return {
    isProgramming: maxConfidence >= 0.7,
    taskType,
    confidence: maxConfidence,
    matchReason,
  };
}
