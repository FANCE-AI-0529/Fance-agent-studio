/**
 * Unified types for the Decision Tracking (Trace) module
 * Single source of truth for all trace-related types
 */

export type TraceEventType =
  | "intent_detected"
  | "skill_selected"
  | "permission_check"
  | "confirm_requested"
  | "confirm_approved"
  | "confirm_rejected"
  | "execution_started"
  | "execution_completed"
  | "execution_failed"
  | "ai_response_complete"
  | "error"
  // MCP event types
  | "mcp_plan"           // [MPLP:Plan] Selected MCP Tool
  | "mcp_confirm"        // [MPLP:Confirm] User authorized
  | "mcp_execute"        // [MCP:Execute] Sending request
  | "mcp_response"       // [MCP:Response] Received response
  | "mcp_resource_read"  // [MCP:Resource] Reading resource
  | "mcp_error"          // [MCP:Error] MCP call failed
  // RAG event types
  | "rag_vector_search"     // [RAG:Vector] Vector similarity search
  | "rag_graph_traverse"    // [RAG:Graph] Graph traversal
  | "rag_context_inject"    // [MPLP:Trace] Context injection
  | "rag_source_found"      // [RAG:Source] Source document found
  | "rag_entity_match";     // [RAG:Entity] Entity matched

export interface TraceEventData {
  skillName?: string;
  intent?: string;
  permissions?: string[];
  reason?: string;
  duration?: number;
  result?: string;
  tokenCount?: number;
  message?: string;
  code?: string;
  // MCP-specific fields
  mcpServer?: string;           // MCP Server name
  mcpTool?: string;             // MCP Tool name
  mcpMethod?: string;           // MCP method (tools/call, resources/read)
  mcpInputs?: Record<string, unknown>;   // Tool input parameters
  mcpOutputs?: Record<string, unknown>;  // Tool output results
  mcpStatusCode?: number;       // HTTP status code
  mcpResponseSize?: string;     // Response size (e.g., "1.2kb")
  mcpResourceUri?: string;      // Resource URI
  // RAG-specific fields
  ragKnowledgeBaseId?: string;    // Knowledge base ID
  ragKnowledgeBaseName?: string;  // Knowledge base name
  ragChunkId?: string;            // Document chunk ID
  ragChunkContent?: string;       // Chunk content preview
  ragSimilarity?: number;         // Similarity score
  ragNodeId?: string;             // Graph node ID
  ragNodeName?: string;           // Graph node name
  ragNodeType?: string;           // Graph node type
  ragRelationPath?: string;       // Relation path string
  ragTraversalDepth?: number;     // Graph traversal depth
  ragSourceDocumentId?: string;   // Source document ID
  ragSourceDocumentName?: string; // Source document name
  ragChunksCount?: number;        // Number of chunks found
  ragNodesCount?: number;         // Number of nodes found
}

export interface TraceEvent {
  id: string;
  type: TraceEventType;
  timestamp: Date;
  data: TraceEventData;
}

export type TraceSessionStatus = "running" | "completed" | "failed" | "cancelled";

export interface TraceSession {
  id: string;
  query: string;
  startTime: Date;
  endTime?: Date;
  status: TraceSessionStatus;
  events: TraceEvent[];
}
