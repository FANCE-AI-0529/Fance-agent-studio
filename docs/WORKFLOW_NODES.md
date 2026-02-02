# Agent Studio 工作流节点使用文档

## 概述

Agent Studio 提供了丰富的工作流节点库，支持从简单的 LLM 调用到复杂的数据处理流程。本文档详细介绍了所有可用节点的功能、配置项和使用示例。

---

## 目录

1. [核心节点 (Phase 1)](#核心节点)
   - [LLM 节点](#llm-节点)
   - [HTTP Request 节点](#http-request-节点)
   - [Code 节点](#code-节点)
   - [Parameter Extractor 节点](#parameter-extractor-节点)
2. [辅助节点 (Phase 2)](#辅助节点)
   - [Template 节点](#template-节点)
   - [Variable Aggregator 节点](#variable-aggregator-节点)
   - [Variable Assigner 节点](#variable-assigner-节点)
   - [Document Extractor 节点](#document-extractor-节点)
   - [Iterator 节点](#iterator-节点)
   - [Loop 节点](#loop-节点)
3. [端口类型说明](#端口类型说明)
4. [最佳实践](#最佳实践)

---

## 核心节点

### LLM 节点

**功能描述**：独立调用大语言模型，支持多种模型选择和结构化输出。

**图标**：🧠 Brain（蓝色）

**适用场景**：
- 文本生成、总结、翻译
- 多步推理中的中间调用
- 结构化 JSON 输出提取
- 视觉多模态处理

**输入端口**：
| 端口 ID | 类型 | 说明 |
|---------|------|------|
| `control-in` | 控制流 | 触发节点执行 |
| `system-prompt` | 数据 | 系统提示词 |
| `user-input` | 数据 | 用户输入 |
| `context` | 感知 | 上下文数据 |
| `files` | 文件 | 可选的文件/图片输入 |

**输出端口**：
| 端口 ID | 类型 | 说明 |
|---------|------|------|
| `control-out` | 控制流 | 完成信号 |
| `text-out` | 数据 | 文本输出 |
| `structured-out` | 数据 | 结构化 JSON 输出 |
| `metadata` | 数据 | Token 使用量等元数据 |

**配置项**：

```typescript
interface LLMNodeConfig {
  model: string;              // 模型选择
  temperature: number;        // 0-1, 创造性程度
  topP: number;              // 0-1, 核采样
  maxTokens: number;         // 最大输出 Token 数
  systemPrompt: string;      // 系统提示
  structuredOutput: boolean; // 是否启用结构化输出
  outputSchema: object;      // JSON Schema 定义
  enableStreaming: boolean;  // 是否流式输出
  enableMemory: boolean;     // 是否注入对话历史
}
```

**支持的模型**：
- `google/gemini-2.5-flash` - 快速高效
- `google/gemini-2.5-pro` - 高质量推理
- `google/gemini-3-flash-preview` - 最新预览
- `openai/gpt-5` - 强大通用
- `openai/gpt-5-mini` - 平衡性能
- `openai/gpt-5-nano` - 极速响应

---

### HTTP Request 节点

**功能描述**：调用外部 REST/GraphQL API。

**图标**：🌐 Globe（绿色）

**适用场景**：
- 调用第三方 API
- 获取实时数据（天气、股票等）
- Webhook 发送
- 内部服务集成

**输入端口**：
| 端口 ID | 类型 | 说明 |
|---------|------|------|
| `control-in` | 控制流 | 触发请求 |
| `url` | 数据 | 动态 URL |
| `headers` | 数据 | 请求头对象 |
| `body` | 数据 | 请求体 |
| `query-params` | 数据 | 查询参数 |

**输出端口**：
| 端口 ID | 类型 | 说明 |
|---------|------|------|
| `control-out` | 控制流 | 完成信号 |
| `response-body` | 数据 | 响应体 |
| `status-code` | 数据 | HTTP 状态码 |
| `error` | 数据 | 错误信息 |

**配置项**：

```typescript
interface HTTPRequestNodeConfig {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  baseUrl: string;
  timeout: number;        // 毫秒
  retryCount: number;     // 重试次数
  authType: 'none' | 'bearer' | 'basic' | 'apiKey';
  authConfig: {
    token?: string;       // Bearer token
    username?: string;    // Basic auth
    password?: string;
    apiKey?: string;
    apiKeyHeader?: string;
  };
  responseType: 'json' | 'text' | 'xml';
}
```

---

### Code 节点

**功能描述**：在安全沙箱中执行 JavaScript 代码。

**图标**：💻 Terminal（紫色）

**适用场景**：
- 数据转换和处理
- 复杂业务逻辑
- 数学计算
- 格式化输出

**输入端口**：
| 端口 ID | 类型 | 说明 |
|---------|------|------|
| `control-in` | 控制流 | 触发执行 |
| `variables` | 数据 | 输入变量对象 |

**输出端口**：
| 端口 ID | 类型 | 说明 |
|---------|------|------|
| `control-out` | 控制流 | 完成信号 |
| `result` | 数据 | 执行结果 |
| `logs` | 数据 | 执行日志 |
| `error` | 数据 | 错误信息 |

**配置项**：

```typescript
interface CodeNodeConfig {
  language: 'javascript';  // 当前仅支持 JavaScript
  code: string;           // 代码内容
  inputVariables: string[]; // 输入变量声明
  outputVariables: string[]; // 输出变量声明
  timeout: number;        // 执行超时（毫秒）
}
```

**代码模板**：

```javascript
function main(inputs) {
  const { data, options } = inputs;
  
  // 你的业务逻辑
  const result = processData(data);
  
  return {
    result: result,
    metadata: {
      processedAt: new Date().toISOString()
    }
  };
}
```

---

### Parameter Extractor 节点

**功能描述**：利用 LLM 从文本中提取结构化参数。

**图标**：🎯 Target（橙色）

**适用场景**：
- 从用户输入提取实体（姓名、日期、地点）
- 意图槽位填充
- 表单自动填充
- 对话状态追踪

**输入端口**：
| 端口 ID | 类型 | 说明 |
|---------|------|------|
| `control-in` | 控制流 | 触发提取 |
| `text-in` | 数据 | 待提取文本 |
| `context` | 感知 | 上下文信息 |

**输出端口**：
| 端口 ID | 类型 | 说明 |
|---------|------|------|
| `control-out` | 控制流 | 完成信号 |
| `extracted-params` | 数据 | 提取的参数对象 |
| `confidence` | 数据 | 置信度分数 |

**配置项**：

```typescript
interface ParameterExtractorConfig {
  parameters: Array<{
    name: string;
    type: 'string' | 'number' | 'boolean' | 'enum';
    required: boolean;
    description: string;
    enumValues?: string[]; // 当 type 为 enum 时
  }>;
  model: string;
  extractionPrompt: string;
}
```

---

## 辅助节点

### Template 节点

**功能描述**：使用 Jinja2/Handlebars 语法格式化文本。

**图标**：📝 FileCode2（翠绿色）

**输入端口**：
| 端口 ID | 类型 | 说明 |
|---------|------|------|
| `control-in` | 控制流 | 触发渲染 |
| `variables-in` | 数据 | 变量对象 |

**输出端口**：
| 端口 ID | 类型 | 说明 |
|---------|------|------|
| `control-out` | 控制流 | 完成信号 |
| `rendered-out` | 数据 | 渲染后文本 |

**模板语法示例**：

```jinja2
你好，{{ user_name }}！

今天是 {{ date }}，天气{{ weather }}。

您的任务列表：
{% for task in tasks %}
- {{ task.title }} ({{ task.priority }})
{% endfor %}
```

---

### Variable Aggregator 节点

**功能描述**：合并多个分支的变量为单一输出。

**图标**：🔗 Variable（紫罗兰色）

**聚合模式**：
- **merge**：合并对象，后者覆盖前者
- **concat**：数组拼接
- **first**：取第一个非空值

**输入端口**：动态生成多个输入源端口

**输出端口**：
| 端口 ID | 类型 | 说明 |
|---------|------|------|
| `control-out` | 控制流 | 完成信号 |
| `aggregated-data` | 数据 | 聚合后的数据 |

---

### Variable Assigner 节点

**功能描述**：设置或修改工作流变量。

**图标**：📌 Pin（靛蓝色）

**配置项**：
- 目标变量名
- 赋值表达式
- 数据类型

---

### Document Extractor 节点

**功能描述**：从文件中提取文本内容。

**图标**：📄 FileText（橙色）

**支持格式**：
- PDF (.pdf)
- Word (.docx)
- Excel (.xlsx)
- PowerPoint (.pptx)
- 纯文本 (.txt)
- Markdown (.md)

**提取模式**：
- **full**：全文提取
- **pages**：分页提取
- **structured**：结构化提取（标题、段落、表格）

**输出端口**：
| 端口 ID | 类型 | 说明 |
|---------|------|------|
| `text-out` | 数据 | 提取的文本 |
| `metadata-out` | 数据 | 文档元数据 |

---

### Iterator 节点

**功能描述**：对数组逐项执行子工作流。

**图标**：🔄 Repeat（青色）

**配置项**：
- **parallelism**：并行度（1-10）
- **errorStrategy**：
  - `fail-fast`：失败即停
  - `continue`：忽略错误继续
  - `retry`：重试失败项
- **maxIterations**：最大迭代次数

**输出端口**：
| 端口 ID | 类型 | 说明 |
|---------|------|------|
| `current-item` | 数据 | 当前迭代项 |
| `index` | 数据 | 当前索引 |
| `aggregated-results` | 数组 | 所有结果集合 |

---

### Loop 节点

**功能描述**：基于条件重复执行。

**图标**：♾️ RefreshCw（琥珀色）

**配置项**：
- **conditionExpression**：循环条件表达式
- **maxIterations**：最大迭代次数（防止无限循环）
- **stateVariables**：状态变量列表

**输出端口**：
| 端口 ID | 类型 | 说明 |
|---------|------|------|
| `loop-body` | 控制流 | 循环体入口 |
| `control-out` | 控制流 | 循环完成 |
| `final-state` | 数据 | 最终状态 |

---

## 端口类型说明

| 端口类型 | 颜色 | 说明 |
|----------|------|------|
| `control` | 🟣 紫色 | 控制流，决定执行顺序 |
| `data` | 🔵 蓝色 | 通用数据传输 |
| `perception` | 🟠 橙色 | RAG 上下文/感知数据 |
| `file` | 🟢 绿色 | 文件传输 |
| `array` | 🔷 青色 | 数组数据 |
| `streaming` | 🟡 黄色 | 流式数据 |

---

## 最佳实践

### 1. 节点命名规范
- 使用描述性名称，如 "提取用户信息" 而非 "LLM-1"
- 在复杂工作流中添加节点描述

### 2. 错误处理
- 为 HTTP 请求节点配置重试策略
- 使用 Iterator 的 `continue` 策略处理部分失败场景
- Loop 节点务必设置 `maxIterations` 防止无限循环

### 3. 性能优化
- 合理使用 Iterator 的并行度
- 对大文档使用分页提取模式
- LLM 节点按需选择模型（简单任务用 Flash，复杂任务用 Pro）

### 4. 变量管理
- 使用 Variable Aggregator 统一多分支输出
- 使用 Template 节点格式化最终输出
- 保持变量命名一致性

---

## 更新日志

- **v2.0.0** (2026-02-02)
  - 新增 Phase 1 核心节点（LLM、HTTP Request、Code、Parameter Extractor）
  - 新增 Phase 2 辅助节点（Template、Variable Aggregator 等 6 个节点）
  - 扩展端口类型系统（file、array、streaming）
  - 完整的单元测试和集成测试覆盖
