// =====================================================
// 战役三：RAG 与记忆能力测试用例
// Campaign 3: RAG & Memory Test Cases
// =====================================================

export interface MemoryTestCase {
  id: string;
  name: string;
  category: 'rag_recall' | 'graph_rag' | 'long_term_memory';
  description: string;
  setup: MemoryTestSetup;
  query: string;
  expectedResults: MemoryExpectedResult[];
  timeoutMs: number;
}

export interface MemoryTestSetup {
  documents?: TestDocument[];
  userMemories?: TestUserMemory[];
  graphEntities?: TestGraphEntity[];
}

export interface TestDocument {
  id: string;
  title: string;
  content: string;
  metadata?: Record<string, unknown>;
}

export interface TestUserMemory {
  key: string;
  value: string;
  type: 'preference' | 'fact' | 'context';
}

export interface TestGraphEntity {
  entity: string;
  relations: { predicate: string; object: string }[];
}

export interface MemoryExpectedResult {
  check: string;
  matcher: 'contains' | 'exact' | 'has_citation' | 'graph_trace' | 'memory_retrieved';
  value?: string;
  path?: string[]; // For graph trace verification
}

export interface MemoryTestResult {
  testId: string;
  passed: boolean;
  response: string;
  citations: CitationResult[];
  graphTrace?: GraphTraceResult;
  memoryHits?: MemoryHitResult[];
  executionTimeMs: number;
  results: {
    check: string;
    passed: boolean;
    actualValue?: string;
    expectedValue?: string;
  }[];
}

export interface CitationResult {
  source: string;
  content: string;
  similarity: number;
}

export interface GraphTraceResult {
  path: string[];
  hops: number;
  relationships: { from: string; relation: string; to: string }[];
}

export interface MemoryHitResult {
  key: string;
  value: string;
  source: 'core_memory' | 'manus_file' | 'user_memory';
}

// ============= 测试用例定义 =============

export const MEMORY_TEST_CASES: MemoryTestCase[] = [
  // 测试 A：精准召回测试
  {
    id: 'memory-a-precise-recall',
    name: '精准召回测试',
    category: 'rag_recall',
    description: '上传虚构文档，验证精准召回能力',
    setup: {
      documents: [
        {
          id: 'mars-handbook-2030',
          title: '2030年火星基地员工手册',
          content: `
# 火星基地员工手册 (2030版)

## 第一章：工作时间安排

### 1.1 标准工作时间
火星基地采用火星时间（Sol），一个火星日约为24小时37分钟。

### 1.2 休息规定
- **午休时间：25小时**（由于火星日略长于地球日，员工享有更长的午休）
- 年假：每火星年30个Sol
- 病假：按需申请

### 1.3 轮班制度
A班：06:00 - 14:00
B班：14:00 - 22:00
C班：22:00 - 06:00

## 第二章：安全规定
...
          `,
          metadata: {
            category: 'employee_handbook',
            year: 2030,
            location: 'mars_base',
          },
        },
      ],
    },
    query: '午休多久？',
    expectedResults: [
      {
        check: '回复包含"25小时"',
        matcher: 'contains',
        value: '25小时',
      },
      {
        check: '有引用标签 [Ref: 火星手册]',
        matcher: 'has_citation',
        value: '火星',
      },
      {
        check: '可查看原文切片',
        matcher: 'has_citation',
      },
    ],
    timeoutMs: 10000,
  },
  
  // 测试 B：GraphRAG 关联测试
  {
    id: 'memory-b-graph-rag',
    name: 'GraphRAG 关联测试',
    category: 'graph_rag',
    description: '验证跨段落推理能力',
    setup: {
      documents: [
        {
          id: 'project-doc',
          title: '项目管理文档',
          content: `
# 项目管理概览

## 团队成员
Alice 是我们的项目经理，她负责管理项目 A 的日常运营。
Bob 是技术负责人，主要负责项目 B 的开发工作。
Carol 是财务分析师，负责所有项目的预算审核。

## 项目详情

### 项目 A
项目 A 是我们今年最重要的战略项目。
预算：100万
状态：进行中
截止日期：2024年12月

### 项目 B  
预算：50万
状态：规划中
负责人：Bob

### 项目 C
预算：30万
状态：已完成
          `,
        },
      ],
      graphEntities: [
        {
          entity: 'Alice',
          relations: [
            { predicate: '管理', object: '项目A' },
            { predicate: '职位', object: '项目经理' },
          ],
        },
        {
          entity: '项目A',
          relations: [
            { predicate: '预算', object: '100万' },
            { predicate: '状态', object: '进行中' },
          ],
        },
      ],
    },
    query: 'Alice 手里的项目预算是多少？',
    expectedResults: [
      {
        check: '回复包含"100万"',
        matcher: 'contains',
        value: '100万',
      },
      {
        check: '图谱遍历路径正确',
        matcher: 'graph_trace',
        path: ['Alice', '管理', '项目A', '预算', '100万'],
      },
    ],
    timeoutMs: 15000,
  },
  
  // 测试 C：Manus 长期记忆测试
  {
    id: 'memory-c-long-term',
    name: 'Manus 长期记忆测试',
    category: 'long_term_memory',
    description: '验证跨会话记忆持久化',
    setup: {
      userMemories: [
        {
          key: 'user_name',
          value: 'Alice',
          type: 'fact',
        },
      ],
    },
    query: '我叫什么？',
    expectedResults: [
      {
        check: 'Agent 正确回答用户名',
        matcher: 'contains',
        value: 'Lovable',
      },
      {
        check: '从长期记忆中检索',
        matcher: 'memory_retrieved',
        value: 'user_name',
      },
    ],
    timeoutMs: 5000,
  },
];

// ============= 辅助函数 =============

export function getMemoryTestCaseById(id: string): MemoryTestCase | undefined {
  return MEMORY_TEST_CASES.find(tc => tc.id === id);
}

export function formatCitationForDisplay(citation: CitationResult): string {
  return `[${citation.source}] (相似度: ${(citation.similarity * 100).toFixed(1)}%)`;
}

export function formatGraphTraceForDisplay(trace: GraphTraceResult): string {
  return trace.path.join(' -> ');
}

export function validateGraphTrace(
  expectedPath: string[], 
  actualTrace: GraphTraceResult
): boolean {
  if (!actualTrace || !actualTrace.path) return false;
  
  // Check if all expected nodes are in the actual path
  return expectedPath.every((node, index) => {
    // Allow for some flexibility in matching (case insensitive)
    return actualTrace.path.some(p => 
      p.toLowerCase().includes(node.toLowerCase())
    );
  });
}
