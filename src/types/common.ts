/**
 * 通用类型定义 - Common Types
 * 用于替换代码中的 any 类型
 */

// ============ 基础类型 ============

/** 任何对象的宽泛类型（用于无法立即确定的数据） */
export type AnyObject = Record<string, unknown>;

/** 任何数组 */
export type AnyArray = Array<unknown>;

// ============ API 和数据处理 ============

/** API 错误对象 */
export interface ApiError extends Error {
  name: string;
  message: string;
  code?: string;
  status?: number;
}

/** 通用的 API 响应 */
export interface ApiResponse<T = unknown> {
  data?: T;
  error?: string | ApiError;
  status?: number;
}

/** LLM 提供者的模型配置 */
export interface LLMModel {
  id: string;
  name: string;
  provider: string;
  version?: string;
  available?: boolean;
}

/** 技能配置 */
export interface SkillConfig {
  name: string;
  description?: string;
  details?: SkillDetail[];
  [key: string]: unknown;
}

/** 技能详情 */
export interface SkillDetail {
  name: string;
  description?: string;
  [key: string]: unknown;
}

/** MCP 操作数据 */
export interface MCPAction {
  name: string;
  description?: string;
  type?: string;
  config?: AnyObject;
  [key: string]: unknown;
}

/** 节点数据配置 */
export interface NodeData {
  id?: string;
  name?: string;
  type?: string;
  mcp_server?: string;
  tool_name?: string;
  config?: AnyObject;
  [key: string]: unknown;
}

/** 工作流配置 */
export interface WorkflowConfig {
  nodes?: NodeData[];
  edges?: Array<{ source: string; target: string; [key: string]: unknown }>;
  config?: AnyObject;
  [key: string]: unknown;
}

// ============ 数据转换 ============

/** 数据库快照映射 */
export interface DatabaseSnapshot {
  snapshot_tags?: Array<{ text: string; [key: string]: unknown }>;
  changedFields?: string[];
  manifest?: AnyObject;
  personality_config?: AnyObject;
  [key: string]: unknown;
}

/** 代理清单 */
export interface AgentManifest {
  skills?: SkillConfig;
  mcp_actions?: MCPAction[];
  config?: AnyObject;
  [key: string]: unknown;
}

// ============ 流处理 ============

/** SSE 流事件 */
export interface StreamEventData {
  type: string;
  data?: unknown;
  [key: string]: unknown;
}

/** 任务执行结果 */
export interface TaskResult {
  result?: unknown;
  final_result?: unknown;
  error?: string;
  [key: string]: unknown;
}

// ============ 组件 Props ============

/** 通用的外部接口客户端 */
export interface SupabaseClient {
  functions: {
    invoke(name: string, options?: AnyObject): Promise<ApiResponse>;
  };
  [key: string]: unknown;
}

// ============ 函数签名类型 ============

/** 错误处理回调 */
export type ErrorHandler = (error: ApiError | Error | string) => void;

/** 成功回调 */
export type SuccessHandler<T = unknown> = (data: T) => void;

/** 通用异步操作 */
export type AsyncOperation<T = unknown> = () => Promise<T>;
