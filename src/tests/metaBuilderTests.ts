// =====================================================
// Meta-Builder 测试用例定义
// Meta-Builder Test Case Definitions
// =====================================================

export interface TestCase {
  id: string;
  name: string;
  level: 1 | 2 | 3;
  input: string;
  expectedNodes: string[];
  expectedEdges?: Array<{ source: string; target: string; sourceHandle?: string }>;
  expectedMCP?: string | string[];
  shouldHaveRouter: boolean;
  shouldHaveRAG: boolean;
  shouldHaveCondition?: boolean;
  conditionExpression?: string;
  shouldTriggerClarification?: boolean;
  expectedKnowledgeBases?: string[];
  description: string;
}

export interface TestResult {
  testId: string;
  passed: boolean;
  errors: string[];
  warnings: string[];
  actualNodes: string[];
  actualEdges: Array<{ source: string; target: string }>;
  executionTimeMs: number;
  graphSnapshot?: object;
}

// =====================================================
// 测试用例集
// =====================================================

export const META_BUILDER_TEST_CASES: TestCase[] = [
  // =====================================================
  // Level 1: 基础单点任务
  // =====================================================
  {
    id: 'level-1-weather',
    name: '基础单点任务 - 天气查询',
    level: 1,
    input: '帮我查一下北京现在的天气。',
    description: '验证 Meta-Builder 是否能正确识别简单的 MCP 调用需求',
    expectedNodes: ['trigger', 'mcp_action', 'manus', 'output'],
    expectedMCP: 'weather',
    shouldHaveRouter: false,
    shouldHaveRAG: false,
    shouldHaveCondition: false,
  },
  {
    id: 'level-1-search',
    name: '基础单点任务 - 信息搜索',
    level: 1,
    input: '帮我搜索一下 AI 的最新发展动态',
    description: '验证搜索类 MCP 的自动挂载',
    expectedNodes: ['trigger', 'mcp_action', 'manus', 'output'],
    expectedMCP: 'search',
    shouldHaveRouter: false,
    shouldHaveRAG: false,
    shouldHaveCondition: false,
  },
  {
    id: 'level-1-translate',
    name: '基础单点任务 - 翻译',
    level: 1,
    input: '把这段文字翻译成英文',
    description: '验证翻译 Skill 的自动挂载',
    expectedNodes: ['trigger', 'skill', 'manus', 'output'],
    shouldHaveRouter: false,
    shouldHaveRAG: false,
    shouldHaveCondition: false,
  },

  // =====================================================
  // Level 2: 混合编排任务
  // =====================================================
  {
    id: 'level-2-finance-email',
    name: '混合编排任务 - 财报分析 + 条件邮件',
    level: 2,
    input: '分析这份财报，如果利润增长超过 20%，就发邮件给 boss@test.com。',
    description: '验证 PDF 解析 + 条件判断 + 邮件发送的完整链路',
    expectedNodes: ['trigger', 'skill', 'condition', 'mcp_action', 'manus', 'output'],
    expectedMCP: 'email',
    shouldHaveRouter: false,
    shouldHaveRAG: false,
    shouldHaveCondition: true,
    conditionExpression: 'profit_growth > 0.2',
    expectedEdges: [
      { source: 'trigger', target: 'skill' },
      { source: 'skill', target: 'condition' },
      { source: 'condition', target: 'mcp_action', sourceHandle: 'true-out' },
      { source: 'condition', target: 'output', sourceHandle: 'false-out' },
    ],
  },
  {
    id: 'level-2-inventory-alert',
    name: '混合编排任务 - 库存预警',
    level: 2,
    input: '监控库存数据，如果库存数量小于100，就发送 Slack 消息给采购部门',
    description: '验证数据监控 + 条件判断 + Slack 通知',
    expectedNodes: ['trigger', 'mcp_action', 'condition', 'mcp_action', 'output'],
    expectedMCP: ['database', 'slack'],
    shouldHaveRouter: false,
    shouldHaveRAG: false,
    shouldHaveCondition: true,
    conditionExpression: 'inventory < 100',
  },
  {
    id: 'level-2-meeting-calendar',
    name: '混合编排任务 - 会议日程',
    level: 2,
    input: '查询我的日程，如果今天有会议，就帮我整理会议资料',
    description: '验证日历查询 + 条件判断 + 文档处理',
    expectedNodes: ['trigger', 'mcp_action', 'condition', 'skill', 'output'],
    expectedMCP: 'google-calendar',
    shouldHaveRouter: false,
    shouldHaveRAG: false,
    shouldHaveCondition: true,
  },

  // =====================================================
  // Level 3: 模糊需求澄清
  // =====================================================
  {
    id: 'level-3-reimbursement',
    name: '模糊需求澄清 - 报销处理',
    level: 3,
    input: '帮我处理一下报销。',
    description: '验证多知识库匹配时的澄清卡片触发',
    expectedNodes: [], // Initially should have no nodes
    shouldHaveRouter: false,
    shouldHaveRAG: true,
    shouldTriggerClarification: true,
    expectedKnowledgeBases: ['国内报销知识库', '海外报销知识库'],
  },
  {
    id: 'level-3-policy-query',
    name: '模糊需求澄清 - 政策查询',
    level: 3,
    input: '查一下公司政策',
    description: '验证多个政策知识库时的澄清交互',
    expectedNodes: [],
    shouldHaveRouter: false,
    shouldHaveRAG: true,
    shouldTriggerClarification: true,
    expectedKnowledgeBases: ['人事政策', '财务政策', '技术规范'],
  },
  {
    id: 'level-3-no-match',
    name: '模糊需求澄清 - 无匹配建议上传',
    level: 3,
    input: '帮我分析这份合同',
    description: '验证无匹配知识库时的上传建议',
    expectedNodes: [],
    shouldHaveRouter: false,
    shouldHaveRAG: false,
    shouldTriggerClarification: true,
    expectedKnowledgeBases: [],
  },
];

// =====================================================
// 测试验证函数
// =====================================================

export function validateTestResult(testCase: TestCase, result: {
  nodes: Array<{ type: string; data?: { name?: string } }>;
  edges: Array<{ source: string; target: string; sourceHandle?: string }>;
  clarificationTriggered?: boolean;
  clarificationMatches?: Array<{ name: string }>;
}): TestResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const startTime = Date.now();

  // Extract actual node types
  const actualNodes = result.nodes.map(n => n.type);
  const actualEdges = result.edges.map(e => ({ source: e.source, target: e.target }));

  // Check expected nodes
  for (const expectedNode of testCase.expectedNodes) {
    if (!actualNodes.includes(expectedNode)) {
      errors.push(`缺少预期节点类型: ${expectedNode}`);
    }
  }

  // Check no unexpected nodes
  if (testCase.shouldHaveRouter === false && actualNodes.includes('router')) {
    errors.push('不应该包含 Router 节点');
  }

  if (testCase.shouldHaveRAG === false && actualNodes.includes('knowledge')) {
    warnings.push('包含了非预期的知识库节点');
  }

  // Check condition node
  if (testCase.shouldHaveCondition === true && !actualNodes.includes('condition')) {
    errors.push('缺少条件判断节点');
  }

  if (testCase.shouldHaveCondition === false && actualNodes.includes('condition')) {
    errors.push('不应该包含条件判断节点');
  }

  // Check MCP
  if (testCase.expectedMCP) {
    const mcpNodes = result.nodes.filter(n => n.type === 'mcp_action' || n.type === 'mcpAction');
    const expectedMCPs = Array.isArray(testCase.expectedMCP) ? testCase.expectedMCP : [testCase.expectedMCP];
    
    if (mcpNodes.length === 0 && expectedMCPs.length > 0) {
      errors.push(`缺少预期的 MCP 节点: ${expectedMCPs.join(', ')}`);
    }
  }

  // Check clarification
  if (testCase.shouldTriggerClarification === true) {
    if (!result.clarificationTriggered) {
      errors.push('应该触发澄清卡片但未触发');
    }

    if (testCase.expectedKnowledgeBases && testCase.expectedKnowledgeBases.length > 0) {
      const actualKBNames = result.clarificationMatches?.map(m => m.name) || [];
      for (const expectedKB of testCase.expectedKnowledgeBases) {
        if (!actualKBNames.some(name => name.includes(expectedKB) || expectedKB.includes(name))) {
          warnings.push(`澄清选项中缺少预期知识库: ${expectedKB}`);
        }
      }
    }
  }

  // Check edge connections
  if (testCase.expectedEdges) {
    for (const expectedEdge of testCase.expectedEdges) {
      const hasEdge = result.edges.some(e => 
        e.source.includes(expectedEdge.source) && 
        e.target.includes(expectedEdge.target) &&
        (!expectedEdge.sourceHandle || e.sourceHandle === expectedEdge.sourceHandle)
      );
      if (!hasEdge) {
        errors.push(`缺少预期连线: ${expectedEdge.source} -> ${expectedEdge.target}`);
      }
    }
  }

  return {
    testId: testCase.id,
    passed: errors.length === 0,
    errors,
    warnings,
    actualNodes,
    actualEdges,
    executionTimeMs: Date.now() - startTime,
    graphSnapshot: { nodes: result.nodes, edges: result.edges },
  };
}

// =====================================================
// 测试执行器类型
// =====================================================

export interface TestRunner {
  runTest: (testCase: TestCase) => Promise<TestResult>;
  runAllTests: () => Promise<TestResult[]>;
  getTestCases: () => TestCase[];
}

// =====================================================
// 测试报告生成
// =====================================================

export function generateTestReport(results: TestResult[]): {
  total: number;
  passed: number;
  failed: number;
  passRate: string;
  summary: string;
  details: Array<{
    testId: string;
    status: 'passed' | 'failed';
    errors: string[];
    warnings: string[];
  }>;
} {
  const passed = results.filter(r => r.passed).length;
  const failed = results.length - passed;

  return {
    total: results.length,
    passed,
    failed,
    passRate: `${Math.round((passed / results.length) * 100)}%`,
    summary: `测试完成: ${passed}/${results.length} 通过`,
    details: results.map(r => ({
      testId: r.testId,
      status: r.passed ? 'passed' as const : 'failed' as const,
      errors: r.errors,
      warnings: r.warnings,
    })),
  };
}
