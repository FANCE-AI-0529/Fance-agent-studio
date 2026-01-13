// =====================================================
// 战役二：Consumer-Studio 双向同步测试用例
// Campaign 2: Bi-directional Sync Test Cases
// =====================================================

import type { SyncEvent } from '@/stores/globalAgentStore';

export interface SyncTestCase {
  id: string;
  name: string;
  description: string;
  direction: 'consumer-to-studio' | 'studio-to-consumer' | 'mini-map';
  steps: SyncTestStep[];
  expectedResults: SyncExpectedResult[];
  timeoutMs: number;
}

export interface SyncTestStep {
  action: string;
  location: 'consumer' | 'studio';
  input?: string;
  nodeType?: string;
  nodeId?: string;
}

export interface SyncExpectedResult {
  location: 'consumer' | 'studio';
  check: string;
  matcher: 'node_exists' | 'node_removed' | 'toast_shown' | 'edge_exists' | 'latency_under' | 'node_highlighted';
  value?: string | number;
}

export interface SyncTestResult {
  testId: string;
  passed: boolean;
  results: {
    check: string;
    passed: boolean;
    actualValue?: any;
    expectedValue?: any;
    latencyMs?: number;
  }[];
  executionTimeMs: number;
}

// ============= 测试用例定义 =============

export const SYNC_TEST_CASES: SyncTestCase[] = [
  // 测试 A：正向同步 (Consumer -> Studio)
  {
    id: 'sync-a-forward',
    name: '正向同步测试',
    description: '在 Consumer 中请求添加功能，验证 Studio 画布自动更新',
    direction: 'consumer-to-studio',
    steps: [
      {
        action: 'send_message',
        location: 'consumer',
        input: '给这个智能体加一个 Google 日历功能',
      },
    ],
    expectedResults: [
      {
        location: 'studio',
        check: '画布自动刷新',
        matcher: 'node_exists',
        value: 'mcp_action',
      },
      {
        location: 'studio',
        check: 'Calendar MCP 节点存在',
        matcher: 'node_exists',
        value: 'google-calendar',
      },
      {
        location: 'studio',
        check: '连线自动连接',
        matcher: 'edge_exists',
      },
      {
        location: 'studio',
        check: '延迟 < 1秒',
        matcher: 'latency_under',
        value: 1000,
      },
    ],
    timeoutMs: 5000,
  },
  
  // 测试 B：逆向同步 (Studio -> Consumer)
  {
    id: 'sync-b-reverse',
    name: '逆向同步测试',
    description: '在 Studio 中删除节点，验证 Consumer 收到通知',
    direction: 'studio-to-consumer',
    steps: [
      {
        action: 'delete_node',
        location: 'studio',
        nodeId: 'web-search',
        nodeType: 'skill',
      },
    ],
    expectedResults: [
      {
        location: 'consumer',
        check: 'Toast 提示弹出',
        matcher: 'toast_shown',
        value: '联网搜索',
      },
      {
        location: 'studio',
        check: '节点已移除',
        matcher: 'node_removed',
        value: 'web-search',
      },
    ],
    timeoutMs: 3000,
  },
  
  // 测试 C：微型图预览
  {
    id: 'sync-c-minimap',
    name: '微型图预览测试',
    description: '验证执行时节点高亮和跳转功能',
    direction: 'mini-map',
    steps: [
      {
        action: 'trigger_long_task',
        location: 'consumer',
        input: '分析这份复杂的财务报告并生成摘要',
      },
    ],
    expectedResults: [
      {
        location: 'consumer',
        check: '当前执行节点高亮',
        matcher: 'node_highlighted',
      },
      {
        location: 'consumer',
        check: '点击可跳转 Studio',
        matcher: 'node_exists',
      },
    ],
    timeoutMs: 10000,
  },
];

// ============= 测试执行器类型 =============

export interface SyncTestRunner {
  runTest: (testCase: SyncTestCase) => Promise<SyncTestResult>;
  runAllTests: () => Promise<SyncTestResult[]>;
  getCurrentLatency: () => number;
}

// ============= 辅助函数 =============

export function getTestCaseById(id: string): SyncTestCase | undefined {
  return SYNC_TEST_CASES.find(tc => tc.id === id);
}

export function formatSyncEventForTest(event: SyncEvent): string {
  const typeLabels: Record<SyncEvent['type'], string> = {
    node_added: '节点添加',
    node_updated: '节点更新',
    node_removed: '节点移除',
    edge_added: '连线添加',
    edge_updated: '连线更新',
    edge_removed: '连线移除',
    agent_updated: 'Agent更新',
  };
  
  return `[${event.source === 'local' ? '本地' : '远程'}] ${typeLabels[event.type]} - ${new Date(event.timestamp).toLocaleTimeString()}`;
}

export function calculateSyncLatency(sentAt: Date, receivedAt: Date): number {
  return receivedAt.getTime() - sentAt.getTime();
}
