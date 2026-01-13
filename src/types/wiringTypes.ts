// =====================================================
// 连线类型定义 - Wiring Type Definitions
// 智能胶水层的核心类型系统
// =====================================================

// ========== IO 数据类型 ==========

export type IODataType = 
  | 'string' 
  | 'number' 
  | 'boolean' 
  | 'object' 
  | 'array' 
  | 'image' 
  | 'file' 
  | 'any';

// ========== IO 端口定义 ==========

export interface IOPort {
  id: string;
  name: string;
  type: IODataType;
  direction: 'input' | 'output';
  description?: string;
  required?: boolean;
  schema?: SchemaDefinition;
}

export interface SchemaDefinition {
  type?: string;
  properties?: Record<string, SchemaDefinition>;
  items?: SchemaDefinition;
  required?: string[];
  description?: string;
  default?: unknown;
}

// ========== 类型转换规则 ==========

export type ConverterType = 
  | 'direct' 
  | 'llm_transform' 
  | 'stringify' 
  | 'parse' 
  | 'extract'
  | 'format';

export interface TypeConversionRule {
  from: IODataType;
  to: IODataType;
  converter: ConverterType;
  adapterNodeType?: string;
  confidence: number;
  description?: string;
}

// ========== 连线结果 ==========

export type WiringStatus = 'confirmed' | 'draft' | 'needs_adapter';

export interface WiringConnection {
  id: string;
  source: {
    nodeId: string;
    portId: string;
    portName: string;
    dataType: IODataType;
  };
  target: {
    nodeId: string;
    portId: string;
    portName: string;
    dataType: IODataType;
  };
  mapping: string;
  confidence: number;
  status: WiringStatus;
  adapterNode?: AdapterNodeSpec;
  matchReason: string;
}

// ========== 转换适配器节点 ==========

export type AdapterNodeType = 'llm_transform' | 'format_converter' | 'extractor';

export interface AdapterNodeSpec {
  id: string;
  type: AdapterNodeType;
  name: string;
  inputType: IODataType;
  outputType: IODataType;
  config: {
    prompt?: string;
    extractPath?: string;
    formatTemplate?: string;
  };
}

// ========== Manus 集成规则 ==========

export type MCPOperationType = 'write' | 'delete' | 'send' | 'execute' | 'read';

export interface ManusWiringRule {
  trigger: {
    nodeType: string;
    operation: MCPOperationType;
  };
  enforce: {
    preConnection: {
      targetPort: string;
      mappingTemplate: string;
    };
    postConnection?: {
      targetPort: string;
      condition: string;
    };
  };
}

// ========== 智能连线结果 ==========

export interface IntelligentWiringResult {
  connections: WiringConnection[];
  adapterNodes: AdapterNodeSpec[];
  manusNodes: ManusLoggerNodeSpec[];
  warnings: string[];
  statistics: WiringStatistics;
}

export interface WiringStatistics {
  totalConnections: number;
  confirmedConnections: number;
  draftConnections: number;
  adapterCount: number;
  manusNodeCount: number;
  averageConfidence: number;
}

// ========== Manus Logger 节点 ==========

export interface ManusLoggerNodeSpec {
  id: string;
  type: 'manus_logger';
  name: string;
  config: {
    template: string;
    targetFile: string;
  };
  inputMappings: Array<{
    targetField: string;
    sourceExpression: string;
  }>;
  outputKey: string;
}

// ========== 智能连线选项 ==========

export interface IntelligentWiringOptions {
  enableTypeAdapters?: boolean;
  enableManusIntegration?: boolean;
  confidenceThreshold?: number;
  preferredConverters?: ConverterType[];
}

// ========== 端口匹配结果 ==========

export interface PortMatchResult {
  sourcePort: IOPort;
  targetPort: IOPort;
  score: number;
  matchReason: string;
  needsAdapter: boolean;
  conversionRule?: TypeConversionRule;
}

// ========== IO 规格 ==========

export interface IOSpec {
  input?: {
    type: string;
    properties?: Record<string, SchemaDefinition>;
    required?: string[];
  };
  output?: {
    type: string;
    properties?: Record<string, SchemaDefinition>;
    required?: string[];
  };
}

// ========== 节点规格扩展 ==========

export interface NodeWithIO {
  id: string;
  type: string;
  name: string;
  description?: string;
  config?: {
    ioSpec?: IOSpec;
    [key: string]: unknown;
  };
  inputs?: IOPort[];
  outputs?: IOPort[];
}
