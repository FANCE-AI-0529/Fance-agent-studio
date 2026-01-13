// =====================================================
// 图谱操作指令类型定义
// Graph Command Types for NL-to-Graph System
// =====================================================

// 图谱操作类型
export type GraphAction = 
  | 'add_node'           // 添加节点
  | 'remove_node'        // 删除节点
  | 'update_node'        // 更新节点
  | 'add_edge'           // 添加连线
  | 'remove_edge'        // 删除连线
  | 'apply_blueprint'    // 应用蓝图
  | 'auto_wire'          // 自动连线
  | 'batch_modify';      // 批量操作

// 节点类型
export type GraphNodeType = 
  | 'manus'              // Manus Core
  | 'skill'              // 技能节点
  | 'knowledge'          // 知识库节点
  | 'mcp_action'         // MCP 行动节点
  | 'router'             // 路由节点
  | 'trigger'            // 触发器节点
  | 'intervention';      // 人工介入节点

// 推荐资产
export interface SuggestedAsset {
  id: string;
  name: string;
  type: 'skill' | 'mcp_tool' | 'knowledge_base';
  similarity: number;
  description?: string;
  category?: string;
}

// 图谱操作指令
export interface GraphCommand {
  action: GraphAction;
  confidence: number;       // AI 置信度 0-1
  
  // 节点操作参数
  nodeType?: GraphNodeType;
  nodeId?: string;
  nodeData?: {
    name: string;
    description?: string;
    category?: string;
    mcp_server?: string;
    tool_name?: string;
    skill_id?: string;
    knowledge_base_id?: string;
    [key: string]: unknown;
  };
  position?: { x: number; y: number };
  
  // 连线操作参数
  edgeId?: string;
  sourceNode?: string;
  targetNode?: string;
  
  // 蓝图操作参数
  blueprintId?: string;
  slotFillings?: Record<string, string>;
  
  // 自动连线参数
  autoConnect?: boolean;       // 是否自动连接到 Manus Core
  autoWire?: boolean;          // 是否触发完整自动连线
  
  // 元信息
  description: string;         // 人类可读描述
  requiresConfirmation: boolean;
  suggestedAssets?: SuggestedAsset[];  // 推荐资产
}

// 批量操作
export interface BatchGraphCommand {
  commands: GraphCommand[];
  description: string;
  requiresConfirmation: boolean;
}

// 解析结果
export interface NLParseResult {
  hasGraphIntent: boolean;
  command: GraphCommand | null;
  batchCommands?: BatchGraphCommand;
  originalMessage: string;
  shouldProceedToChat: boolean;  // 是否继续发送给 Agent 聊天
  parseMethod: 'regex' | 'ai';   // 解析方法
}

// 图谱修改状态
export interface GraphModificationState {
  isModifying: boolean;
  currentOperation?: string;
  progress?: number;
  affectedNodes?: string[];
  affectedEdges?: string[];
}

// 操作结果
export interface GraphOperationResult {
  success: boolean;
  operation: GraphAction;
  nodeId?: string;
  edgeId?: string;
  error?: string;
  timestamp: Date;
}

// AI 解析请求
export interface NLGraphParseRequest {
  message: string;
  agentId: string;
  currentNodes: Array<{
    id: string;
    type: string;
    name: string;
  }>;
  context?: {
    recentMessages?: string[];
    agentName?: string;
    agentDescription?: string;
  };
}

// AI 解析响应
export interface NLGraphParseResponse {
  hasIntent: boolean;
  command?: GraphCommand;
  reasoning?: string;
  alternatives?: GraphCommand[];
}
