# 工作流节点 API 参考

## Edge Functions API

### workflow-llm-call

调用大语言模型进行文本生成。

**端点**: `POST /functions/v1/workflow-llm-call`

**请求体**:
```json
{
  "model": "google/gemini-2.5-flash",
  "systemPrompt": "你是一个有用的助手",
  "userInput": "用户输入内容",
  "context": {},
  "temperature": 0.7,
  "topP": 0.9,
  "maxTokens": 2048,
  "structuredOutput": false,
  "outputSchema": null
}
```

**响应**:
```json
{
  "text": "生成的文本内容",
  "structured": null,
  "usage": {
    "promptTokens": 100,
    "completionTokens": 50,
    "totalTokens": 150
  }
}
```

---

### workflow-http-request

代理 HTTP 请求到外部服务。

**端点**: `POST /functions/v1/workflow-http-request`

**请求体**:
```json
{
  "method": "GET",
  "url": "https://api.example.com/data",
  "headers": {
    "Authorization": "Bearer token"
  },
  "body": null,
  "timeout": 30000
}
```

**响应**:
```json
{
  "status": 200,
  "headers": {
    "content-type": "application/json"
  },
  "body": {
    "data": "响应数据"
  }
}
```

---

### workflow-code-executor

在安全沙箱中执行 JavaScript 代码。

**端点**: `POST /functions/v1/workflow-code-executor`

**请求体**:
```json
{
  "language": "javascript",
  "code": "function main(inputs) { return { result: inputs.value * 2 }; }",
  "inputs": {
    "value": 21
  },
  "timeout": 10000
}
```

**响应**:
```json
{
  "result": {
    "result": 42
  },
  "logs": ["执行日志"],
  "error": null,
  "executionTimeMs": 15
}
```

---

## 错误响应格式

所有边缘函数使用统一的错误响应格式：

```json
{
  "error": true,
  "code": "ERROR_CODE",
  "message": "人类可读的错误描述",
  "details": {}
}
```

**错误代码**:
| 代码 | 说明 |
|------|------|
| `VALIDATION_ERROR` | 请求参数验证失败 |
| `RATE_LIMIT_EXCEEDED` | 超过速率限制 |
| `TIMEOUT` | 执行超时 |
| `INTERNAL_ERROR` | 内部服务错误 |
| `MODEL_ERROR` | 模型调用失败 |
| `HTTP_ERROR` | HTTP 请求失败 |
| `CODE_EXECUTION_ERROR` | 代码执行错误 |

---

## TypeScript 类型定义

```typescript
// Node 数据类型
export type NodeType = 
  | 'trigger' | 'agent' | 'skill' | 'mcp_action' 
  | 'knowledge' | 'condition' | 'parallel' 
  | 'intervention' | 'output' | 'intent_router'
  | 'llm' | 'http_request' | 'code' | 'parameter_extractor'
  | 'template' | 'variable_aggregator' | 'variable_assigner' 
  | 'doc_extractor' | 'iterator' | 'loop';

// 端口类型
export type PortType = 
  | "data"       // 数据传输
  | "control"    // 控制流
  | "perception" // RAG 上下文
  | "file"       // 文件传输
  | "array"      // 数组数据
  | "streaming"; // 流式数据
```
