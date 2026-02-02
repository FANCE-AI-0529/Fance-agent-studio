

# Agent Studio 智能体架构增强方案
## 基于 Dify 架构的底层能力扩展与节点丰富

---

## 一、现状分析

### 1.1 当前 Agent Studio 节点体系

| 节点类型 | 功能 | 对标 Dify |
|---------|------|----------|
| `agent` | 智能体核心 | ✅ Agent |
| `skill` | 技能执行 | ≈ Tools |
| `knowledge` | 知识库检索 | ✅ Knowledge Retrieval |
| `trigger` | 触发器 | ✅ Trigger |
| `output` | 输出终端 | ✅ Output/Answer |
| `condition` | 条件判断 | ✅ If-Else |
| `parallel` | 并行执行 | ≈ Iteration |
| `intentRouter` | 意图路由 | ✅ Question Classifier |
| `mcpAction` | MCP 工具 | ✅ Tools |
| `intervention` | 人工介入 | ❌ Dify 无此节点 |
| `manus` | Manus 内核 | ❌ 独有创新 |
| `generatedSkill` | 即时生成技能 | ❌ 独有创新 |

### 1.2 对比 Dify 缺失的核心节点

| Dify 节点 | 功能 | 重要性 | Agent Studio 现状 |
|-----------|------|--------|------------------|
| **LLM** | 独立 LLM 调用 | 🔴 高 | 嵌入在 Agent 中 |
| **HTTP Request** | HTTP 接口调用 | 🔴 高 | 无 |
| **Code** | Python/JS 代码执行 | 🔴 高 | 仅技能代码 |
| **Template** | Jinja2 模板转换 | 🟡 中 | 无 |
| **Variable Aggregator** | 变量聚合 | 🟡 中 | 无 |
| **Variable Assigner** | 变量赋值 | 🟡 中 | 无 |
| **Document Extractor** | 文档解析 | 🟡 中 | 知识库内置 |
| **Parameter Extractor** | 参数提取 | 🔴 高 | 无 |
| **Iteration** | 数组迭代 | 🟡 中 | Parallel 部分覆盖 |
| **Loop** | 循环执行 | 🟡 中 | 无 |
| **List Operator** | 列表操作 | 🟢 低 | 无 |

---

## 二、增强方案设计

### 2.1 新增核心节点（Phase 1 - 必须）

#### 2.1.1 LLM Node（大模型调用节点）

**功能**：独立的 LLM 调用，支持多模型切换、结构化输出

```text
用途场景：
- 独立的文本生成/总结/翻译
- 多步推理中的中间 LLM 调用
- 结构化 JSON 输出
- 视觉多模态处理

输入端口：
├── control-in (控制流)
├── system-prompt (系统提示)
├── user-input (用户输入)
├── context (上下文数据)
└── files (可选: 文件/图片)

输出端口：
├── control-out (完成信号)
├── text-out (文本输出)
├── structured-out (结构化输出)
└── metadata (Token 使用等元数据)

配置项：
- 模型选择 (gemini-2.5-flash, gpt-5 等)
- Temperature / Top-P
- Max Tokens
- 结构化输出 Schema (JSON Schema)
- 记忆开关 (是否注入历史)
```

**文件**: `src/components/builder/nodes/LLMNode.tsx`

---

#### 2.1.2 HTTP Request Node（HTTP 请求节点）

**功能**：调用外部 API，支持 REST/GraphQL

```text
用途场景：
- 调用第三方 API
- 获取实时数据 (天气、股票等)
- Webhook 发送
- 与内部服务集成

输入端口：
├── control-in (触发)
├── url (动态 URL)
├── headers (请求头)
├── body (请求体)
└── query-params (查询参数)

输出端口：
├── control-out (完成)
├── response-body (响应体)
├── status-code (状态码)
└── error (错误信息)

配置项：
- HTTP 方法 (GET/POST/PUT/DELETE/PATCH)
- 超时时间
- 重试策略
- 认证方式 (Bearer/Basic/API Key)
- 响应解析 (JSON/XML/Text)
```

**文件**: `src/components/builder/nodes/HTTPRequestNode.tsx`

---

#### 2.1.3 Code Node（代码执行节点）

**功能**：执行 JavaScript/Python 代码片段

```text
用途场景：
- 数据转换和处理
- 复杂业务逻辑
- 数学计算
- 格式化输出

输入端口：
├── control-in (触发)
└── variables (输入变量对象)

输出端口：
├── control-out (完成)
├── result (执行结果)
└── error (错误信息)

配置项：
- 代码语言 (JavaScript / Python)
- 代码编辑器 (Monaco Editor)
- 输入变量声明
- 输出变量声明
- 超时时间

代码模板：
function main(inputs) {
  const { data, options } = inputs;
  // 业务逻辑处理
  return {
    result: processedData,
    metadata: { ... }
  };
}
```

**文件**: `src/components/builder/nodes/CodeNode.tsx`

---

#### 2.1.4 Parameter Extractor Node（参数提取器）

**功能**：利用 LLM 从文本中提取结构化参数

```text
用途场景：
- 从用户输入提取实体 (姓名、日期、地点)
- 意图槽位填充
- 表单自动填充
- 对话状态追踪

输入端口：
├── control-in (触发)
├── text-in (待提取文本)
└── context (上下文)

输出端口：
├── control-out (完成)
├── extracted-params (提取的参数对象)
└── confidence (置信度)

配置项：
- 提取参数 Schema
  - 参数名
  - 参数类型 (string/number/boolean/enum)
  - 是否必填
  - 描述
- 使用的模型
- 提取指令 (Prompt)
```

**文件**: `src/components/builder/nodes/ParameterExtractorNode.tsx`

---

### 2.2 新增辅助节点（Phase 2 - 增强）

#### 2.2.1 Template Node（模板转换节点）

**功能**：使用 Jinja2/Handlebars 语法格式化输出

```text
输入端口：
├── control-in
└── variables (变量对象)

输出端口：
├── control-out
└── rendered (渲染后文本)

配置项：
- 模板内容 (支持 Jinja2 语法)
- 变量映射
```

**文件**: `src/components/builder/nodes/TemplateNode.tsx`

---

#### 2.2.2 Variable Aggregator Node（变量聚合器）

**功能**：合并多个分支的变量为单一输出

```text
用途场景：
- 并行分支结果合并
- 多来源数据整合
- 条件分支汇聚

输入端口：
├── control-in-1
├── control-in-2
├── ...
├── data-in-1
└── data-in-2

输出端口：
├── control-out
└── aggregated-data

配置项：
- 聚合模式 (merge/concat/pick-first)
- 字段映射
```

**文件**: `src/components/builder/nodes/VariableAggregatorNode.tsx`

---

#### 2.2.3 Variable Assigner Node（变量赋值器）

**功能**：设置/修改工作流变量

```text
输入端口：
├── control-in
└── source-value

输出端口：
├── control-out
└── assigned-value

配置项：
- 目标变量名
- 赋值表达式
- 数据类型
```

**文件**: `src/components/builder/nodes/VariableAssignerNode.tsx`

---

#### 2.2.4 Document Extractor Node（文档提取器）

**功能**：从文件中提取文本内容

```text
用途场景：
- PDF 文本提取
- Word/Excel 解析
- 图片 OCR

输入端口：
├── control-in
└── file-in (File 对象)

输出端口：
├── control-out
├── text-content (提取的文本)
└── metadata (页数、大小等)

配置项：
- 支持格式选择
- OCR 开关
- 提取模式 (全文/分页)
```

**文件**: `src/components/builder/nodes/DocExtractorNode.tsx`

---

#### 2.2.5 Iterator Node（迭代器节点）

**功能**：对数组逐项执行子工作流

```text
用途场景：
- 批量处理数据
- 逐条分析文档
- 批量 API 调用

输入端口：
├── control-in
└── array-in (数组数据)

输出端口：
├── control-out
├── current-item (当前项)
├── index (当前索引)
└── aggregated-results (聚合结果)

配置项：
- 并行度
- 错误处理策略
- 最大迭代次数
```

**文件**: `src/components/builder/nodes/IteratorNode.tsx`

---

#### 2.2.6 Loop Node（循环节点）

**功能**：基于条件重复执行

```text
输入端口：
├── control-in
└── initial-state

输出端口：
├── loop-body (循环体)
├── control-out (完成)
└── final-state

配置项：
- 循环条件表达式
- 最大迭代次数
- 状态变量
```

**文件**: `src/components/builder/nodes/LoopNode.tsx`

---

### 2.3 端口系统增强

```typescript
// 新增端口类型
export type PortType = 
  | "data"       // 蓝色 - 数据传输
  | "control"    // 紫色 - 控制流
  | "perception" // 橙色 - RAG 上下文
  | "file"       // 绿色 - 文件传输 (新增)
  | "array"      // 青色 - 数组数据 (新增)
  | "streaming"; // 黄色 - 流式数据 (新增)

// 文件: src/components/builder/ports/portTypes.ts
```

---

### 2.4 类型系统扩展

```typescript
// 扩展 NodeType
export type NodeType = 
  // 现有节点
  | 'trigger' | 'agent' | 'skill' | 'mcp_action' 
  | 'knowledge' | 'condition' | 'parallel' 
  | 'intervention' | 'output' | 'intent_router'
  | 'generated_skill' | 'placeholder'
  // 新增节点 (Phase 1)
  | 'llm'              // LLM 调用
  | 'http_request'     // HTTP 请求
  | 'code'             // 代码执行
  | 'parameter_extractor' // 参数提取
  // 新增节点 (Phase 2)
  | 'template'         // 模板转换
  | 'variable_aggregator' // 变量聚合
  | 'variable_assigner'   // 变量赋值
  | 'doc_extractor'    // 文档提取
  | 'iterator'         // 迭代器
  | 'loop';            // 循环

// 文件: src/types/workflowDSL.ts
```

---

## 三、底层架构增强

### 3.1 工作流执行引擎增强

```typescript
// 新增执行上下文类型
interface WorkflowExecutionContext {
  // 现有字段
  variables: Map<string, unknown>;
  nodeOutputs: Map<string, unknown>;
  
  // 新增字段
  httpClient: HTTPClient;           // HTTP 请求客户端
  codeExecutor: CodeExecutor;       // 代码执行器
  llmGateway: LLMGateway;          // LLM 统一网关
  fileProcessor: FileProcessor;     // 文件处理器
  
  // 迭代状态
  iterationStack: IterationState[];
  loopStack: LoopState[];
}
```

### 3.2 新增边缘函数

| 函数名 | 功能 | 对应节点 |
|--------|------|----------|
| `workflow-llm-call` | LLM 统一调用 | LLM Node |
| `workflow-http-request` | HTTP 代理请求 | HTTP Request Node |
| `workflow-code-executor` | 沙箱代码执行 | Code Node |
| `workflow-doc-extractor` | 文档解析 | Doc Extractor Node |

---

## 四、实施计划

### Phase 1：核心节点（2 周）

| 任务 | 工时 | 优先级 |
|------|------|--------|
| LLMNode 组件开发 | 6h | P0 |
| HTTPRequestNode 组件开发 | 6h | P0 |
| CodeNode 组件开发 | 8h | P0 |
| ParameterExtractorNode 组件开发 | 6h | P0 |
| 端口类型扩展 | 3h | P0 |
| Builder.tsx 节点注册 | 2h | P0 |
| workflowDSL.ts 类型扩展 | 2h | P0 |
| 边缘函数开发 | 8h | P0 |
| **小计** | **41h** | |

### Phase 2：辅助节点（1.5 周）

| 任务 | 工时 | 优先级 |
|------|------|--------|
| TemplateNode 开发 | 4h | P1 |
| VariableAggregatorNode 开发 | 4h | P1 |
| VariableAssignerNode 开发 | 3h | P1 |
| DocExtractorNode 开发 | 5h | P1 |
| IteratorNode 开发 | 6h | P1 |
| LoopNode 开发 | 5h | P1 |
| 节点工具栏集成 | 3h | P1 |
| **小计** | **30h** | |

### Phase 3：测试与文档（0.5 周）

| 任务 | 工时 | 优先级 |
|------|------|--------|
| 单元测试编写 | 6h | P2 |
| 集成测试 | 4h | P2 |
| 节点使用文档 | 4h | P2 |
| **小计** | **14h** | |

---

## 五、文件变更清单

### 新建文件

| 文件路径 | 说明 |
|----------|------|
| `src/components/builder/nodes/LLMNode.tsx` | LLM 调用节点 |
| `src/components/builder/nodes/HTTPRequestNode.tsx` | HTTP 请求节点 |
| `src/components/builder/nodes/CodeNode.tsx` | 代码执行节点 |
| `src/components/builder/nodes/ParameterExtractorNode.tsx` | 参数提取器 |
| `src/components/builder/nodes/TemplateNode.tsx` | 模板转换节点 |
| `src/components/builder/nodes/VariableAggregatorNode.tsx` | 变量聚合器 |
| `src/components/builder/nodes/VariableAssignerNode.tsx` | 变量赋值器 |
| `src/components/builder/nodes/DocExtractorNode.tsx` | 文档提取器 |
| `src/components/builder/nodes/IteratorNode.tsx` | 迭代器节点 |
| `src/components/builder/nodes/LoopNode.tsx` | 循环节点 |
| `supabase/functions/workflow-llm-call/index.ts` | LLM 调用边缘函数 |
| `supabase/functions/workflow-http-request/index.ts` | HTTP 代理边缘函数 |
| `supabase/functions/workflow-code-executor/index.ts` | 代码执行边缘函数 |
| `supabase/functions/workflow-doc-extractor/index.ts` | 文档解析边缘函数 |

### 修改文件

| 文件路径 | 改动说明 |
|----------|----------|
| `src/types/workflowDSL.ts` | 扩展 NodeType 枚举，新增节点配置类型 |
| `src/components/builder/ports/portTypes.ts` | 新增端口类型和标准端口配置 |
| `src/pages/Builder.tsx` | 注册新节点类型到 nodeTypes |
| `src/components/builder/SkillMarketplace.tsx` | 节点工具栏添加新节点入口 |

---

## 六、预期成果

完成后 Agent Studio 将拥有与 Dify 对等的工作流能力：

| 能力 | 完成后 |
|------|--------|
| 独立 LLM 调用 | ✅ |
| HTTP API 集成 | ✅ |
| 代码执行 | ✅ |
| 参数提取 | ✅ |
| 模板转换 | ✅ |
| 变量操作 | ✅ |
| 文档解析 | ✅ |
| 数据迭代 | ✅ |
| 循环控制 | ✅ |

**同时保留 Agent Studio 独有优势**：
- Manus 内核 - 文件规划系统
- 即时技能生成 - AI 自动生成技能
- 人工介入节点 - MPLP 安全协议
- 意图路由器 - 语义级别路由

---

## 七、总工时

| 阶段 | 工时 |
|------|------|
| Phase 1: 核心节点 | 41h |
| Phase 2: 辅助节点 | 30h |
| Phase 3: 测试文档 | 14h |
| **总计** | **~85h** |

