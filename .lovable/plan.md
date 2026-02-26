

# 智能体构建模块工业级增强 — 对标 Dify 实施计划

## 现状分析

当前 Builder 已具备的能力：
- 画布节点系统（LLM、HTTP Request、Code、Template、Iterator 等 Dify 核心节点的 **UI 壳**已存在）
- 边缘函数后端（workflow-llm-call、workflow-http-request、workflow-code-executor 已实现基础逻辑）
- 变量系统（variableStore + EdgeMappingPanel）
- 调试工具（断点、变量快照、执行日志）

**与 Dify 的核心差距（按优先级排列）：**

| 差距 | 严重程度 | 说明 |
|------|----------|------|
| 无工作流运行时引擎 | **致命** | 节点只能展示，无法真正按拓扑顺序执行 |
| 节点无配置面板 | **严重** | 点击节点的"配置"按钮无任何响应，无法编辑 LLM prompt、Code 代码、HTTP URL 等 |
| 无变量引用系统 | **严重** | Dify 的 `{{node.output}}` 变量插值机制不存在 |
| 无运行历史/日志 | **重要** | Dify 可查看每次运行的输入输出和耗时 |
| 无发布为 API 的完整链路 | **重要** | 工作流无法作为独立 API endpoint 调用 |
| 无对话型/工作流型模式切换 | **中等** | Dify 支持 Chatflow 和 Workflow 两种模式 |

---

## 实施内容

### Phase 1: 节点配置面板系统（最高优先级）

**新建文件**: `src/components/builder/config-panels/`

为每种节点类型创建可交互配置面板，点击节点或配置按钮时在右侧滑出：

| 面板 | 文件名 | 核心配置项 |
|------|--------|-----------|
| LLM 配置 | `LLMConfigDialog.tsx` | 模型选择、System Prompt（支持变量插值）、温度/TopP/MaxTokens、结构化输出 Schema 编辑器、上下文窗口配置、开启记忆 |
| Code 配置 | `CodeConfigDialog.tsx` | Monaco 代码编辑器（JS/Python）、输入/输出变量声明表、超时设置、依赖库白名单 |
| HTTP 配置 | `HTTPConfigDialog.tsx` | Method 选择、URL（支持变量）、Headers 键值对编辑器、Body 编辑器（JSON/Form/Raw）、认证配置、超时/重试、响应映射 |
| 条件配置 | `ConditionConfigDialog.tsx` | 多条件分支编辑器（IF/ELIF/ELSE）、条件表达式构建器（支持变量引用）|
| 模板配置 | `TemplateConfigDialog.tsx` | Jinja2 模板编辑器、变量引用补全 |
| 参数提取器 | `ExtractorConfigDialog.tsx` | 提取参数列表定义（名称、类型、描述）、提取指令 Prompt、模型选择 |
| 迭代器 | `IteratorConfigDialog.tsx` | 输入数组变量选择、子工作流编辑入口、并行/串行模式 |
| 知识检索 | `KnowledgeConfigDialog.tsx` | 知识库选择、检索模式（向量/图谱/混合）、TopK、相似度阈值、重排序模型 |
| 变量聚合器 | `AggregatorConfigDialog.tsx` | 输入变量多选列表、聚合模式（合并/取最新） |
| 触发器 | `TriggerConfigDialog.tsx` | 输入变量声明（对话型：用户消息+文件；工作流型：自定义字段列表） |

**关键 UI 模式**: 参考 Dify，采用右侧滑出抽屉（Drawer）而非模态对话框，允许用户同时查看画布和编辑配置。

**新建文件**: `src/components/builder/config-panels/NodeConfigDrawer.tsx` — 统一的抽屉容器，根据选中节点类型动态渲染对应配置面板。

**修改文件**: `src/pages/Builder.tsx` — 添加 `onNodeClick` 处理器，打开 NodeConfigDrawer；将节点数据的读写与抽屉双向绑定。

### Phase 2: 变量引用与数据流系统

**新建文件**: `src/components/builder/variables/VariableSelector.tsx`

实现 Dify 风格的变量引用选择器：
- 在任何文本输入框中输入 `{{` 或 `/` 触发变量选择弹出菜单
- 按节点分组显示可引用变量（如 `Start.input`、`LLM_1.output.text`）
- 支持类型校验（string、number、array、object）
- 变量类型颜色标识与 portTypes 一致

**新建文件**: `src/components/builder/variables/VariableInput.tsx`

封装可复用的变量感知输入组件：
- 普通文本与 `{{变量引用}}` 混合渲染
- 变量标签化显示（彩色标签）
- 自动补全与搜索

**修改文件**: `src/stores/variableStore.ts` — 扩展为完整的变量注册表，追踪每个节点的输入/输出 Schema，支持变量解析 `resolveVariable(expression, context)`

### Phase 3: 工作流运行时引擎（核心）

**新建文件**: `supabase/functions/workflow-executor/index.ts`

工作流执行引擎边缘函数，这是整个系统的核心：

职责：
- 接收完整的工作流定义（节点 + 边 + 变量映射）
- 拓扑排序确定执行顺序
- 逐节点执行，解析变量引用，调用对应子函数
- 节点类型路由：`llm` → `workflow-llm-call`、`code` → `workflow-code-executor`、`http_request` → `workflow-http-request`
- 条件分支路由
- 迭代器循环执行
- 并行节点并发执行
- 收集每个节点的执行结果、耗时、token 消耗
- SSE 流式返回执行进度

关键数据结构：
```text
WorkflowExecutionContext {
  workflowId: string
  runId: string
  variables: Map<nodeId, Record<string, any>>  // 每个节点的输出
  status: 'running' | 'completed' | 'failed'
  nodeResults: Array<{
    nodeId, status, output, duration, tokensUsed, error
  }>
}
```

**新建文件**: `src/hooks/useWorkflowExecution.ts`

前端执行控制 Hook：
- `executeWorkflow(nodes, edges, inputs)` — 调用 workflow-executor，接收 SSE
- 实时更新各节点状态（idle → running → completed/failed）
- 每个节点执行时画布节点高亮 + 动画
- 收集运行历史

### Phase 4: 运行历史与日志系统

**数据库迁移**: 创建 `workflow_runs` 表

```text
workflow_runs
  id: uuid (PK)
  workflow_id: uuid (FK → agents.id 或独立 workflow 表)
  user_id: uuid
  status: text (running/completed/failed)
  inputs: jsonb
  outputs: jsonb
  node_results: jsonb[]
  total_duration_ms: integer
  total_tokens_used: integer
  created_at: timestamp
  completed_at: timestamp
```

**新建文件**: `src/components/builder/RunHistoryPanel.tsx`

运行历史面板：
- 时间线式展示所有运行记录
- 点击任一次运行可查看：每个节点的输入/输出、耗时、错误信息
- 支持"回放"功能 — 将历史运行的节点状态映射回画布高亮

### Phase 5: 工作流发布为 API

**新建文件**: `supabase/functions/workflow-api/index.ts`

将已部署的工作流暴露为可调用的 REST API：
- `POST /workflow-api` — 接收 `{ workflowId, inputs }` 
- 通过 API Key 鉴权（复用现有 agent_api_keys 表）
- 内部调用 workflow-executor 执行
- 返回结构化输出

**修改文件**: `src/components/builder/AgentApiPanel.tsx` — 添加"工作流 API"标签页，展示 curl 示例和 SDK 调用代码

### Phase 6: Chatflow / Workflow 模式切换

**修改文件**: `src/pages/Builder.tsx`

在顶部工具栏添加模式切换：
- **Chatflow 模式**：触发器为用户消息，输出为 AI 回复，支持多轮对话上下文
- **Workflow 模式**：触发器为自定义输入变量，输出为结构化数据，单次执行

模式影响：
- Trigger 节点的输入 Schema 不同
- Output 节点的行为不同
- Chatflow 模式自动注入对话记忆变量

### Phase 7: 工作流画布增强

**修改文件**: 多个节点组件

增强画布交互以对标 Dify：
- 节点展开/折叠：折叠时只显示节点名称和状态图标，展开时显示完整配置摘要
- 节点状态指示器：未配置（灰色）/ 已配置（绿色）/ 运行中（蓝色动画）/ 错误（红色）
- 边上显示变量映射标签
- 节点右键菜单：复制、删除、禁用、查看日志
- 批量选择和移动
- 快捷键：Delete 删除、Ctrl+D 复制、Ctrl+Z 撤销

---

## 涉及文件清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `src/components/builder/config-panels/NodeConfigDrawer.tsx` | **新建** | 统一配置抽屉容器 |
| `src/components/builder/config-panels/LLMConfigDialog.tsx` | **新建** | LLM 节点配置面板 |
| `src/components/builder/config-panels/CodeConfigDialog.tsx` | **新建** | 代码节点配置面板（含 Monaco） |
| `src/components/builder/config-panels/HTTPConfigDialog.tsx` | **新建** | HTTP 请求配置面板 |
| `src/components/builder/config-panels/ConditionConfigDialog.tsx` | **新建** | 条件分支配置面板 |
| `src/components/builder/config-panels/TemplateConfigDialog.tsx` | **新建** | 模板节点配置面板 |
| `src/components/builder/config-panels/ExtractorConfigDialog.tsx` | **新建** | 参数提取器配置面板 |
| `src/components/builder/config-panels/IteratorConfigDialog.tsx` | **新建** | 迭代器配置面板 |
| `src/components/builder/config-panels/KnowledgeConfigDialog.tsx` | **新建** | 知识检索配置面板 |
| `src/components/builder/config-panels/AggregatorConfigDialog.tsx` | **新建** | 变量聚合器配置面板 |
| `src/components/builder/config-panels/TriggerConfigDialog.tsx` | **新建** | 触发器配置面板 |
| `src/components/builder/variables/VariableSelector.tsx` | **新建** | 变量选择器弹出菜单 |
| `src/components/builder/variables/VariableInput.tsx` | **新建** | 变量感知输入组件 |
| `src/components/builder/RunHistoryPanel.tsx` | **新建** | 运行历史面板 |
| `supabase/functions/workflow-executor/index.ts` | **新建** | 工作流运行时引擎 |
| `supabase/functions/workflow-api/index.ts` | **新建** | 工作流 API endpoint |
| `src/hooks/useWorkflowExecution.ts` | **新建** | 工作流执行前端 Hook |
| `src/stores/variableStore.ts` | 修改 | 扩展为完整变量注册表 |
| `src/pages/Builder.tsx` | 修改 | 添加节点点击配置、模式切换、运行按钮 |
| `src/components/builder/AgentApiPanel.tsx` | 修改 | 添加工作流 API 标签页 |

## 数据库变更

新建 `workflow_runs` 表用于持久化运行历史，启用 RLS 策略确保用户只能访问自己的运行记录。

## 实施顺序建议

由于变更量极大，建议分批实施：

**第一批（节点可配置化）**: Phase 1 + Phase 2 — 使节点从"展示壳"变为"可交互配置"
**第二批（可执行化）**: Phase 3 + Phase 4 — 工作流引擎 + 运行历史
**第三批（可发布化）**: Phase 5 + Phase 6 + Phase 7 — API 发布 + 模式切换 + 画布交互增强

每批完成后均可独立验证，降低风险。

