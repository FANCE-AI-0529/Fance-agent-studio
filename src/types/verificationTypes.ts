// =====================================================
// 组合能力验收类型定义
// Combination Verification Types
// =====================================================

import type { WiringConnection } from './wiringTypes';

// ========== 槽位类型 ==========

export type SlotType = 'perception' | 'decision' | 'action' | 'memory' | 'trigger';

// ========== 节点规格 ==========

export interface NodeSpec {
  id: string;
  type: string;
  name: string;
  description?: string;
  slotType?: SlotType;
  config?: Record<string, unknown>;
}

// ========== 拓扑期望 ==========

export interface TopologyExpectation {
  requiredNodes: Array<{
    type: 'knowledge' | 'skill' | 'router' | 'mcp_action' | 'agent' | 'trigger';
    namePattern?: RegExp;
    slotType?: SlotType;
  }>;
  requiredBranches?: Array<{
    condition: string;
    targetNodeType: string;
  }>;
  minNodes: number;
  maxNodes: number;
}

// ========== Manus 期望 ==========

export interface ManusExpectation {
  planningWithFiles: boolean;
  findingsLogging: boolean;
  progressLogging: boolean;
  requiredLogOperations: Array<'write' | 'send' | 'delete'>;
}

// ========== 连线期望 ==========

export interface WiringExpectation {
  requiredConnections: Array<{
    sourcePattern: string;
    targetPattern: string;
    minConfidence: number;
  }>;
  minCoverage: number;
}

// ========== 地狱级测试场景 ==========

export interface HellTestScenario {
  id: string;
  name: string;
  description: string;
  input: string;
  expectedTopology: TopologyExpectation;
  expectedManus: ManusExpectation;
  expectedWiring: WiringExpectation;
}

// ========== 节点匹配结果 ==========

export interface NodeMatch {
  expected: {
    type: string;
    namePattern?: RegExp;
    slotType?: SlotType;
  };
  actual: NodeSpec;
  match: 'exact' | 'partial' | 'semantic';
}

// ========== 拓扑检查结果 ==========

export interface TopologyCheckResult {
  passed: boolean;
  foundNodes: NodeMatch[];
  missingNodes: string[];
  branchesCorrect: boolean;
  details: string[];
  nodeCount: number;
}

// ========== Manus 合规检查结果 ==========

export interface ManusComplianceResult {
  passed: boolean;
  planningEnabled: boolean;
  loggerNodesInjected: number;
  findingsConnected: boolean;
  progressConnected: boolean;
  operationsCovered: string[];
  missingOperations: string[];
  details: string[];
}

// ========== 连线检查结果 ==========

export interface WiringCheckResult {
  passed: boolean;
  connections: WiringConnection[];
  coveragePercent: number;
  draftEdges: number;
  confirmedEdges: number;
  missingConnections: string[];
  warnings: string[];
}

// ========== 数据流路径 ==========

export interface DataFlowPath {
  id: string;
  nodes: string[];
  edges: string[];
  dataTypes: string[];
  isComplete: boolean;
  description: string;
}

// ========== 数据流分析结果 ==========

export interface DataFlowAnalysis {
  paths: DataFlowPath[];
  highlightedPath: string[];
  entryPoints: string[];
  exitPoints: string[];
  branchPoints: string[];
}

// ========== 工作流 DSL ==========

export interface WorkflowDSL {
  id: string;
  name: string;
  description: string;
  stages: WorkflowStage[];
  edges: WorkflowEdge[];
  metadata?: Record<string, unknown>;
}

export interface WorkflowStage {
  id: string;
  name: string;
  type: 'sequential' | 'parallel' | 'conditional';
  nodes: NodeSpec[];
  branches?: WorkflowBranch[];
}

export interface WorkflowBranch {
  id: string;
  name: string;
  condition: string;
  nodes: NodeSpec[];
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  condition?: string;
  dataMapping?: string;
}

// ========== 验收结果 ==========

export interface VerificationResult {
  scenario: HellTestScenario;
  passed: boolean;
  score: number;
  
  topologyCheck: TopologyCheckResult;
  manusCheck: ManusComplianceResult;
  wiringCheck: WiringCheckResult;
  dataFlow: DataFlowAnalysis;
  
  generatedDSL?: WorkflowDSL;
  blueprintUsed?: string;
  
  warnings: string[];
  suggestions: string[];
  
  timestamp: string;
  duration: number;
}

// ========== 地狱级测试场景库 ==========

export const HELL_TEST_SCENARIOS: HellTestScenario[] = [
  {
    id: 'after-sales-assistant',
    name: '售后助手 (地狱级)',
    description: '验证 Knowledge + Skill + Router + 双 MCP 分支的完整生成能力',
    input: `做一个售后助手。根据产品维修手册(Knowledge)，判断用户发来的图片(Skill)。
            如果是人为损坏，发邮件(MCP)报价；如果是质量问题，登记到Notion(MCP)。`,
    expectedTopology: {
      requiredNodes: [
        { type: 'knowledge', namePattern: /维修|手册|manual|repair/i, slotType: 'perception' },
        { type: 'skill', namePattern: /图片|image|分析|analysis|视觉/i, slotType: 'perception' },
        { type: 'router', namePattern: /判断|路由|router|决策|decision/i, slotType: 'decision' },
        { type: 'mcp_action', namePattern: /邮件|email|mail|发送/i, slotType: 'action' },
        { type: 'mcp_action', namePattern: /notion|登记|记录|write/i, slotType: 'action' },
      ],
      requiredBranches: [
        { condition: '人为损坏', targetNodeType: 'mcp_action' },
        { condition: '质量问题', targetNodeType: 'mcp_action' },
      ],
      minNodes: 5,
      maxNodes: 12,
    },
    expectedManus: {
      planningWithFiles: true,
      findingsLogging: true,
      progressLogging: true,
      requiredLogOperations: ['send', 'write'],
    },
    expectedWiring: {
      requiredConnections: [
        { sourcePattern: 'knowledge', targetPattern: 'router|agent', minConfidence: 0.6 },
        { sourcePattern: 'skill', targetPattern: 'router|agent', minConfidence: 0.5 },
        { sourcePattern: 'router', targetPattern: 'mcp_action', minConfidence: 0.7 },
      ],
      minCoverage: 0.7,
    },
  },
  {
    id: 'research-report-generator',
    name: '研究报告生成器 (地狱级)',
    description: '验证 Web Search + Analysis + File Write 的完整链路',
    input: `创建一个市场研究助手。每周一9点，用Web Search(MCP)收集竞品信息，
            用分析技能(Skill)生成报告，然后写入到 findings.md(MCP)，最后发送邮件(MCP)通知团队。`,
    expectedTopology: {
      requiredNodes: [
        { type: 'trigger', namePattern: /定时|schedule|cron|周一/i, slotType: 'trigger' },
        { type: 'mcp_action', namePattern: /web|search|搜索|tavily/i, slotType: 'perception' },
        { type: 'skill', namePattern: /分析|analysis|报告|report/i, slotType: 'decision' },
        { type: 'mcp_action', namePattern: /write|file|文件|写入|findings/i, slotType: 'action' },
        { type: 'mcp_action', namePattern: /email|邮件|mail|通知/i, slotType: 'action' },
      ],
      minNodes: 4,
      maxNodes: 10,
    },
    expectedManus: {
      planningWithFiles: true,
      findingsLogging: true,
      progressLogging: true,
      requiredLogOperations: ['write', 'send'],
    },
    expectedWiring: {
      requiredConnections: [
        { sourcePattern: 'search|web', targetPattern: 'skill|analysis', minConfidence: 0.6 },
        { sourcePattern: 'skill|analysis', targetPattern: 'write|file', minConfidence: 0.6 },
        { sourcePattern: 'write|file', targetPattern: 'email|mail', minConfidence: 0.5 },
      ],
      minCoverage: 0.8,
    },
  },
  {
    id: 'customer-support-bot',
    name: '客服机器人 (地狱级)',
    description: '验证 多知识库 + 意图识别 + 多工具调用',
    input: `构建一个智能客服。能够回答产品FAQ(Knowledge)，查询订单状态(MCP-Database)，
            处理退款请求(MCP-Stripe)，并在无法解决时转人工(MCP-Slack)。`,
    expectedTopology: {
      requiredNodes: [
        { type: 'knowledge', namePattern: /FAQ|产品|常见问题/i, slotType: 'perception' },
        { type: 'router', namePattern: /意图|intent|路由/i, slotType: 'decision' },
        { type: 'mcp_action', namePattern: /订单|order|database|查询/i, slotType: 'action' },
        { type: 'mcp_action', namePattern: /退款|refund|stripe|支付/i, slotType: 'action' },
        { type: 'mcp_action', namePattern: /人工|slack|转接|通知/i, slotType: 'action' },
      ],
      requiredBranches: [
        { condition: '查询订单', targetNodeType: 'mcp_action' },
        { condition: '退款', targetNodeType: 'mcp_action' },
        { condition: '转人工', targetNodeType: 'mcp_action' },
      ],
      minNodes: 5,
      maxNodes: 15,
    },
    expectedManus: {
      planningWithFiles: true,
      findingsLogging: true,
      progressLogging: true,
      requiredLogOperations: ['write', 'send'],
    },
    expectedWiring: {
      requiredConnections: [
        { sourcePattern: 'knowledge|FAQ', targetPattern: 'router|agent', minConfidence: 0.6 },
        { sourcePattern: 'router', targetPattern: 'mcp_action', minConfidence: 0.7 },
      ],
      minCoverage: 0.65,
    },
  },
];

// ========== 辅助函数 ==========

export function getScenarioById(id: string): HellTestScenario | undefined {
  return HELL_TEST_SCENARIOS.find(s => s.id === id);
}

export function calculateOverallScore(
  topologyCheck: TopologyCheckResult,
  manusCheck: ManusComplianceResult,
  wiringCheck: WiringCheckResult
): number {
  const topologyScore = topologyCheck.passed ? 1 : 
    (topologyCheck.foundNodes.length / (topologyCheck.foundNodes.length + topologyCheck.missingNodes.length));
  
  const manusScore = manusCheck.passed ? 1 : 
    (manusCheck.operationsCovered.length / (manusCheck.operationsCovered.length + manusCheck.missingOperations.length));
  
  const wiringScore = wiringCheck.coveragePercent;
  
  // 加权平均: 拓扑 40%, Manus 30%, 连线 30%
  return topologyScore * 0.4 + manusScore * 0.3 + wiringScore * 0.3;
}
