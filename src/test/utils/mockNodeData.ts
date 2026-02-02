/**
 * Mock Data Factory for Workflow Node Testing
 */

import type { LLMNodeData } from "@/components/builder/nodes/LLMNode";

// =====================================================
// LLM Node Mock Data
// =====================================================
export const createMockLLMNodeData = (
  overrides?: Partial<LLMNodeData>
): LLMNodeData => ({
  id: "llm-node-1",
  name: "测试 LLM 节点",
  description: "用于单元测试的 LLM 节点",
  config: {
    model: "google/gemini-2.5-flash",
    temperature: 0.7,
    topP: 0.9,
    maxTokens: 2048,
    systemPrompt: "你是一个有用的助手",
    structuredOutput: false,
    enableStreaming: false,
    enableMemory: true,
  },
  ...overrides,
});

// =====================================================
// HTTP Request Node Mock Data
// =====================================================
export interface HTTPRequestNodeData {
  id: string;
  name: string;
  description?: string;
  config?: {
    method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
    url?: string;
    headers?: Record<string, string>;
    timeout?: number;
    retryCount?: number;
    authType?: "none" | "bearer" | "basic" | "apiKey";
  };
  [key: string]: unknown;
}

export const createMockHTTPRequestNodeData = (
  overrides?: Partial<HTTPRequestNodeData>
): HTTPRequestNodeData => ({
  id: "http-node-1",
  name: "测试 HTTP 请求",
  description: "调用外部 API",
  config: {
    method: "GET",
    url: "https://api.example.com/data",
    headers: { "Content-Type": "application/json" },
    timeout: 30000,
    retryCount: 3,
    authType: "bearer",
  },
  ...overrides,
});

// =====================================================
// Code Node Mock Data
// =====================================================
export interface CodeNodeData {
  id: string;
  name: string;
  description?: string;
  config?: {
    language?: "javascript" | "python";
    code?: string;
    inputVariables?: string[];
    outputVariables?: string[];
    timeout?: number;
  };
  [key: string]: unknown;
}

export const createMockCodeNodeData = (
  overrides?: Partial<CodeNodeData>
): CodeNodeData => ({
  id: "code-node-1",
  name: "测试代码执行",
  description: "执行自定义代码",
  config: {
    language: "javascript",
    code: `function main(inputs) {
  const { data } = inputs;
  return { result: data * 2 };
}`,
    inputVariables: ["data"],
    outputVariables: ["result"],
    timeout: 10000,
  },
  ...overrides,
});

// =====================================================
// Parameter Extractor Node Mock Data
// =====================================================
export interface ParameterExtractorNodeData {
  id: string;
  name: string;
  description?: string;
  config?: {
    parameters?: Array<{
      name: string;
      type: "string" | "number" | "boolean" | "enum";
      required: boolean;
      description?: string;
      enumValues?: string[];
    }>;
    model?: string;
    extractionPrompt?: string;
  };
}

export const createMockParameterExtractorNodeData = (
  overrides?: Partial<ParameterExtractorNodeData>
): ParameterExtractorNodeData => ({
  id: "param-extractor-1",
  name: "参数提取器",
  description: "从文本中提取结构化参数",
  config: {
    parameters: [
      { name: "name", type: "string", required: true, description: "用户姓名" },
      { name: "age", type: "number", required: false, description: "年龄" },
      {
        name: "gender",
        type: "enum",
        required: false,
        enumValues: ["male", "female", "other"],
      },
    ],
    model: "google/gemini-2.5-flash",
    extractionPrompt: "请从以下文本中提取用户信息",
  },
  ...overrides,
});

// =====================================================
// Template Node Mock Data
// =====================================================
export interface TemplateNodeData {
  id: string;
  label?: string;
  template?: string;
  variables?: Array<{ name: string; description?: string }>;
  outputFormat?: "text" | "json" | "markdown";
  [key: string]: unknown;
}

export const createMockTemplateNodeData = (
  overrides?: Partial<TemplateNodeData>
): TemplateNodeData => ({
  id: "template-node-1",
  label: "测试模板",
  template: "你好，{{name}}！今天是 {{date}}。",
  variables: [
    { name: "name", description: "用户名" },
    { name: "date", description: "日期" },
  ],
  outputFormat: "text",
  ...overrides,
});

// =====================================================
// Variable Aggregator Node Mock Data
// =====================================================
export interface VariableAggregatorNodeData {
  id: string;
  label?: string;
  aggregationMode?: "merge" | "concat" | "first";
  sourceCount?: number;
  [key: string]: unknown;
}

export const createMockVariableAggregatorNodeData = (
  overrides?: Partial<VariableAggregatorNodeData>
): VariableAggregatorNodeData => ({
  id: "aggregator-node-1",
  label: "变量聚合器",
  aggregationMode: "merge",
  sourceCount: 3,
  ...overrides,
});

// =====================================================
// Iterator Node Mock Data
// =====================================================
export interface IteratorNodeData {
  id: string;
  label?: string;
  parallelism?: number;
  errorStrategy?: "fail-fast" | "continue" | "retry";
  maxIterations?: number;
  [key: string]: unknown;
}

export const createMockIteratorNodeData = (
  overrides?: Partial<IteratorNodeData>
): IteratorNodeData => ({
  id: "iterator-node-1",
  label: "迭代器",
  parallelism: 5,
  errorStrategy: "continue",
  maxIterations: 100,
  ...overrides,
});

// =====================================================
// Loop Node Mock Data
// =====================================================
export interface LoopNodeData {
  id: string;
  label?: string;
  maxIterations?: number;
  conditionExpression?: string;
  stateVariables?: string[];
  [key: string]: unknown;
}

export const createMockLoopNodeData = (
  overrides?: Partial<LoopNodeData>
): LoopNodeData => ({
  id: "loop-node-1",
  label: "循环节点",
  maxIterations: 10,
  conditionExpression: "counter < 10",
  stateVariables: ["counter", "result"],
  ...overrides,
});

// =====================================================
// Document Extractor Node Mock Data
// =====================================================
export interface DocExtractorNodeData {
  id: string;
  label?: string;
  supportedFormats?: string[];
  enableOCR?: boolean;
  extractionMode?: "full" | "pages" | "structured";
  maxPages?: number;
  [key: string]: unknown;
}

export const createMockDocExtractorNodeData = (
  overrides?: Partial<DocExtractorNodeData>
): DocExtractorNodeData => ({
  id: "doc-extractor-1",
  label: "文档提取器",
  supportedFormats: ["pdf", "docx", "txt"],
  enableOCR: false,
  extractionMode: "full",
  maxPages: 50,
  ...overrides,
});
