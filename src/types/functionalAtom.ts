// =====================================================
// 功能原子类型定义 - 混合编排引擎核心
// Functional Atom Types - Hybrid Orchestration Engine
// 统一 Skill、MCP、Knowledge 的抽象接口
// =====================================================

// ========== 原子类型 ==========

/** 原子类型 - 抹平底层差异 */
export type AtomType = 'NATIVE_SKILL' | 'MCP_TOOL' | 'KNOWLEDGE_BASE' | 'ROUTER';

/** 功能槽位类型 - 基于"感知-决策-行动"三层架构 */
export type SlotType = 'perception' | 'decision' | 'action' | 'hybrid';

// ========== 标准化 IO 规范 ==========

/** Schema 属性定义 */
export interface SchemaProperty {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description?: string;
  default?: unknown;
  enum?: unknown[];
  required?: boolean;
}

/** Schema 定义 */
export interface SchemaDefinition {
  type: 'object' | 'array' | 'string' | 'number' | 'boolean';
  properties?: Record<string, SchemaProperty>;
  required?: string[];
  items?: SchemaDefinition;
  description?: string;
}

/** 标准化 IO 规范 - 用于自动连线 */
export interface IOSpec {
  input: SchemaDefinition;
  output: SchemaDefinition;
}

// ========== 功能原子统一接口 ==========

/** 
 * 功能原子 - 统一接口
 * 将 Skill、MCP、Knowledge 抽象为相同结构，放入同一向量空间检索
 */
export interface FunctionalAtom {
  /** 唯一标识符 */
  id: string;
  
  /** 原子类型 */
  type: AtomType;
  
  /** 显示名称 */
  name: string;
  
  /** 描述 - 用于向量检索 */
  description: string;
  
  /** IO 规范 - 用于自动连线 */
  io_spec: IOSpec;
  
  /** 槽位类型 - 用于架构图填充 */
  slot_type: SlotType;
  
  /** 能力标签 */
  tags: string[];
  
  /** 原始资产 ID */
  asset_id: string;
  
  /** 原始资产类型 */
  asset_type: 'skill' | 'mcp_tool' | 'knowledge_base';
  
  /** 检索相似度得分 */
  similarity?: number;
  
  /** 匹配原因 */
  match_reason?: string;
  
  /** 风险等级 */
  risk_level: 'low' | 'medium' | 'high';
  
  /** 类别 */
  category?: string;
  
  /** 是否为 AI 即时生成 */
  is_generated?: boolean;
  
  /** 扩展元数据 */
  metadata?: Record<string, unknown>;
}

// ========== 槽位匹配结果 ==========

/** 按槽位分组的检索结果 */
export interface SlotMatchResult {
  /** 感知层 - RAG、数据读取 */
  perception: FunctionalAtom[];
  
  /** 决策层 - 分析、判断、路由 */
  decision: FunctionalAtom[];
  
  /** 行动层 - 写入、发送、执行 */
  action: FunctionalAtom[];
  
  /** 混合/未分类 */
  hybrid: FunctionalAtom[];
}

// ========== IO 兼容性分析 ==========

/** IO 兼容的资产对 */
export interface CompatiblePair {
  /** 源原子 */
  source: FunctionalAtom;
  
  /** 目标原子 */
  target: FunctionalAtom;
  
  /** 匹配的字段 */
  matchedFields: string[];
  
  /** 兼容性得分 (0-1) */
  compatibilityScore: number;
}

/** IO 兼容性分析结果 */
export interface IOCompatibilityAnalysis {
  /** 可兼容的资产对列表 */
  compatiblePairs: CompatiblePair[];
  
  /** 自动连线建议 */
  autoWireSuggestions: Array<{
    sourceId: string;
    targetId: string;
    reason: string;
  }>;
}

// ========== 缺口分析 ==========

/** 能力缺口分析 */
export interface GapAnalysis {
  /** 缺失的槽位类型 */
  missingSlots: SlotType[];
  
  /** 建议添加的原子 */
  suggestedAtoms: Array<{
    name: string;
    type: AtomType;
    slot_type: SlotType;
    reason: string;
    priority: 'high' | 'medium' | 'low';
  }>;
  
  /** 覆盖度评分 (0-1) */
  coverageScore: number;
}

// ========== 混合检索请求 ==========

/** 面向 Meta-Builder 的高级检索请求 */
export interface HybridRetrievalRequest {
  /** 自然语言查询 */
  query: string;
  
  /** 用户 ID */
  userId: string;
  
  /** 需要的槽位类型 */
  requiredSlots?: SlotType[];
  
  /** 期望的输入类型 (用于 IO 兼容性过滤) */
  expectInputType?: string;
  
  /** 期望的输出类型 */
  expectOutputType?: string;
  
  /** 每个槽位最多返回几个 */
  maxPerSlot?: number;
  
  /** 最小相似度阈值 */
  minSimilarity?: number;
  
  /** 是否包含即时生成建议 */
  includeSuggestions?: boolean;
  
  /** 资产类型过滤 */
  assetTypes?: ('skill' | 'mcp_tool' | 'knowledge_base')[];
}

/** 混合检索结果 */
export interface HybridRetrievalResult {
  /** 按槽位分组的结果 */
  slotMatches: SlotMatchResult;
  
  /** 合并的 FunctionalAtom 列表 */
  allAtoms: FunctionalAtom[];
  
  /** IO 兼容性分析 */
  ioCompatibility: IOCompatibilityAnalysis;
  
  /** 缺口分析 */
  gaps: GapAnalysis;
  
  /** 检索统计 */
  stats: {
    totalFound: number;
    perceptionCount: number;
    decisionCount: number;
    actionCount: number;
    hybridCount: number;
    queryTimeMs: number;
  };
}

// ========== 辅助函数类型 ==========

/** 槽位推断关键词配置 */
export interface SlotInferenceConfig {
  perception: string[];
  decision: string[];
  action: string[];
}

/** 默认的槽位推断关键词 */
export const DEFAULT_SLOT_KEYWORDS: SlotInferenceConfig = {
  perception: [
    '查询', '检索', '获取', '读取', '搜索', '知识',
    'get', 'fetch', 'read', 'search', 'retrieve', 'query', 'rag', 'find'
  ],
  decision: [
    '分析', '判断', '路由', '评估', '分类', '决策',
    'analyze', 'decide', 'route', 'classify', 'evaluate', 'assess', 'determine'
  ],
  action: [
    '发送', '写入', '创建', '删除', '更新', '执行', '推送',
    'send', 'write', 'create', 'delete', 'update', 'execute', 'post', 'put', 'push'
  ],
};
