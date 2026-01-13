// SSE 事件类型
export type StreamEventType = 
  | 'thinking'      // AI 思考过程
  | 'node'          // 生成节点
  | 'edge'          // 生成连线
  | 'config'        // 配置信息
  | 'progress'      // 进度更新
  | 'complete'      // 完成
  | 'error';        // 错误

// 思考类别
export type ThinkingCategory = 'analyze' | 'decide' | 'create' | 'connect' | 'validate';

// 思考事件
export interface ThinkingEvent {
  type: 'thinking';
  thought: string;
  category?: ThinkingCategory;
  timestamp?: number;
}

// 节点状态
export type NodeStatus = 'ghost' | 'materializing' | 'solid';

// 流式节点
export interface StreamingNode {
  id: string;
  nodeType: string;
  label: string;
  description?: string;
  position: { x: number; y: number };
  status: NodeStatus;
  data?: Record<string, unknown>;
  createdAt?: number;
}

// 节点事件
export interface NodeEvent {
  type: 'node';
  node: StreamingNode;
  action: 'add' | 'update' | 'finalize';
}

// 连线状态
export type EdgeStatus = 'drawing' | 'solid';

// 流式连线
export interface StreamingEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  status: EdgeStatus;
  edgeType?: string;
  createdAt?: number;
}

// 连线事件
export interface EdgeEvent {
  type: 'edge';
  edge: StreamingEdge;
  action: 'add' | 'finalize';
}

// 配置事件
export interface ConfigEvent {
  type: 'config';
  config: Record<string, unknown>;
  section: string;
}

// 进度事件
export interface ProgressEvent {
  type: 'progress';
  step: string;
  progress: number;       // 0-100
  estimatedRemaining?: number;  // 预计剩余秒数
  message?: string;
}

// 完成摘要
export interface CompletionSummary {
  totalNodes: number;
  totalEdges: number;
  generationTime: number;
  nodeTypes: Record<string, number>;
}

// 完成事件
export interface CompleteEvent {
  type: 'complete';
  agentConfig: Record<string, unknown>;
  summary: CompletionSummary;
}

// 错误事件
export interface ErrorEvent {
  type: 'error';
  message: string;
  code?: string;
  recoverable?: boolean;
}

// 联合类型
export type StreamEvent = 
  | ThinkingEvent 
  | NodeEvent 
  | EdgeEvent 
  | ConfigEvent
  | ProgressEvent 
  | CompleteEvent
  | ErrorEvent;

// 生成阶段
export type GenerationPhase = 
  | 'idle'
  | 'analyzing'      // 分析需求
  | 'planning'       // 规划结构
  | 'generating'     // 生成节点
  | 'connecting'     // 建立连接
  | 'configuring'    // 配置属性
  | 'validating'     // 验证结果
  | 'completed'
  | 'error';

// 流式状态
export interface StreamingState {
  // 基础状态
  isStreaming: boolean;
  sessionId: string | null;
  startTime: number | null;
  
  // 当前阶段
  phase: GenerationPhase;
  
  // 节点和连线
  nodes: Map<string, StreamingNode>;
  edges: Map<string, StreamingEdge>;
  
  // 思考过程
  thoughts: ThinkingEvent[];
  currentThought: string;
  
  // 进度
  progress: number;
  currentStep: string;
  estimatedRemaining: number | null;
  
  // 最终结果
  agentConfig: Record<string, unknown> | null;
  summary: CompletionSummary | null;
  
  // 错误
  error: string | null;
  errorRecoverable: boolean;
}

// 流式生成请求
export interface StreamingGeneratorRequest {
  description: string;
  generateFullWorkflow?: boolean;
  agentId?: string;
  options?: {
    maxNodes?: number;
    includeDefaultNodes?: boolean;
    autoLayout?: boolean;
  };
}

// 流式生成响应（初始化）
export interface StreamingInitResponse {
  sessionId: string;
  estimatedDuration: number;
}

// 节点类型图标映射
export const NODE_TYPE_ICONS: Record<string, string> = {
  input: 'MessageSquare',
  output: 'Send',
  agent: 'Bot',
  skill: 'Sparkles',
  knowledge: 'Database',
  condition: 'GitBranch',
  loop: 'RefreshCw',
  api: 'Globe',
  transform: 'Shuffle',
  trigger: 'Zap',
  default: 'Circle',
};

// 阶段消息映射
export const PHASE_MESSAGES: Record<GenerationPhase, string> = {
  idle: '等待开始',
  analyzing: '正在分析您的需求...',
  planning: '正在规划智能体结构...',
  generating: '正在生成节点...',
  connecting: '正在建立节点连接...',
  configuring: '正在配置节点属性...',
  validating: '正在验证生成结果...',
  completed: '生成完成！',
  error: '生成过程中出错',
};

// 工具函数：计算节点位置
export function calculateNodePosition(
  index: number, 
  options: { 
    startX?: number; 
    startY?: number; 
    spacingX?: number; 
    spacingY?: number;
    columns?: number;
  } = {}
): { x: number; y: number } {
  const {
    startX = 100,
    startY = 100,
    spacingX = 250,
    spacingY = 150,
    columns = 3,
  } = options;
  
  const col = index % columns;
  const row = Math.floor(index / columns);
  
  return {
    x: startX + col * spacingX,
    y: startY + row * spacingY,
  };
}

// 工具函数：生成唯一 ID
export function generateStreamingId(prefix: string = 'stream'): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// 工具函数：解析 SSE 事件
export function parseSSEEvent(data: string): StreamEvent | null {
  try {
    const parsed = JSON.parse(data);
    if (parsed && typeof parsed.type === 'string') {
      return parsed as StreamEvent;
    }
    return null;
  } catch {
    return null;
  }
}

// 工具函数：创建初始流式状态
export function createInitialStreamingState(): StreamingState {
  return {
    isStreaming: false,
    sessionId: null,
    startTime: null,
    phase: 'idle',
    nodes: new Map(),
    edges: new Map(),
    thoughts: [],
    currentThought: '',
    progress: 0,
    currentStep: '',
    estimatedRemaining: null,
    agentConfig: null,
    summary: null,
    error: null,
    errorRecoverable: false,
  };
}
