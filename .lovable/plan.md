

# 全模块功能排查报告 — Studio 平台工业级审计

## 审计方法
逐模块审查所有页面代码、hooks、edge functions、日志和数据库交互，以真实用户身份走查每个核心流程。

---

## 模块一：工作台（Index / Dashboard）

### 现状
工作台页面功能相对简单，作为导航入口存在。

### 发现的问题

| # | 严重度 | 问题 | 文件 | 详情 |
|---|--------|------|------|------|
| D1 | P2 | **DailyInspiration、TrendingAgents、CommunityStats 无法验证数据真实性** | `src/components/dashboard/` | 这些组件的数据来源需要确认是否有对应的数据库查询或是使用硬编码/模拟数据 |
| D2 | P2 | **"继续对话"按钮跳转 /runtime 但不传 agentId** | `Index.tsx:100` | 点击后用户到达 Runtime 但不知道与哪个智能体继续对话 |
| D3 | P1 | **已部署智能体点击跳转 /runtime 但未选中该智能体** | `Index.tsx:182` | `Link to={agent.status === 'deployed' ? '/runtime' : ...}` 没有传递 agent 信息，用户需要手动选择 |
| D4 | P2 | **删除操作的 DropdownMenu 和"查看全部"按钮缺少 aria-label** | `Index.tsx` | 无障碍访问问题 |

### 改进计划
1. **D3 修复**: 将 `/runtime` 改为 `/runtime?agentId=${agent.id}`，Runtime 页面读取 URL 参数自动选中对应智能体
2. **D2 修复**: "继续对话"按钮跳转时传递最近使用的 agentId
3. 验证所有 Dashboard 组件是否使用真实数据

---

## 模块二：智能体构建器（Builder）

### 现状
2100+ 行巨型组件，集成 ReactFlow 画布、多种节点类型、技能市场、配置面板等。

### 发现的问题

| # | 严重度 | 问题 | 文件 | 详情 |
|---|--------|------|------|------|
| B1 | **P0** | **保存智能体后技能无法正确加载到画布** | `Builder.tsx:395-432` | 加载现有智能体时，每次都用 `Date.now()` 生成新 node id，导致 useEffect 依赖 `existingAgent` 每次重渲染时都重新创建节点 |
| B2 | **P0** | **知识库节点在画布上渲染报 ref 警告** | Console logs | `Badge` 组件被 `KnowledgeBaseNode` 使用时无法接收 ref，导致 ReactFlow 的 tooltip 功能异常 |
| B3 | P1 | **部署后跳转到 Runtime 不传 agentId** | `Builder.tsx` | `setShowDeploySuccessDialog(true)` 后的"开始使用"按钮需确认是否正确传递 |
| B4 | P1 | **Builder 页面 2100 行代码严重影响维护性** | `Builder.tsx` | 应拆分为子组件（Canvas、ToolBar、ConfigPanel 等），当前单文件超过合理阈值 |
| B5 | P2 | **画布上拖放后新节点位置可能重叠** | `Builder.tsx:396-400` | 使用固定公式 `100 + (index % 3) * 180` 计算位置，加载多个技能时位置可能与其他节点重叠 |
| B6 | P1 | **RAG 配置面板与知识库模块未打通** | Builder 中的 `RAGConfigPanel` | 在 Builder 中配置的知识库 ID 是否真正传递到 agent-chat 的 manifest 中需确认 |
| B7 | P2 | **"对话式创建"向导完成后不自动保存** | `ConversationalCreator` | 用户通过对话创建完成后可能忘记手动保存，导致丢失 |

### 改进计划
1. **B1 修复**: 在 `useEffect` 中添加 agentId 的稳定 ref 检查，避免重复生成节点
2. **B2 修复**: 在 `KnowledgeBaseNode.tsx` 中将 Badge 包裹在 span 中以避免 ref 转发问题
3. **B3 修复**: 部署成功对话框的"开始使用"按钮传递 `navigate(/runtime?agentId=${currentAgentId})`
4. **B6 修复**: 确保 `useBuilderKnowledge` 的挂载信息写入 agent manifest 的 `knowledgeBases` 字段，并在 `agent-chat` 中读取
5. **B4**: 长期重构计划，将 Builder 拆分为 5-6 个子组件

---

## 模块三：知识库（Knowledge）

### 现状
经过前几轮修复，基础上传和实时更新已就绪，但仍有关键问题。

### 发现的问题

| # | 严重度 | 问题 | 文件 | 详情 |
|---|--------|------|------|------|
| K1 | **P0** | **向量嵌入 API 401 认证失败** | Edge logs | `rag-ingest` 调用 embedding API 时使用了 `EMBEDDING_CONFIG.API_KEY`（即 `AI_EMBEDDING_KEY` 或 `AI_API_KEY`），但 secrets 中没有配置这些变量！只有 `LOVABLE_API_KEY`。PDF 解析用了 Lovable Gateway 但 embedding 仍走 OpenAI 端点 |
| K2 | **P0** | **Embedding 端点默认指向 `api.openai.com` 但无有效 key** | `_shared/config.ts:37` | `EMBEDDING_CONFIG.ENDPOINT` 默认为 `https://api.openai.com/v1/embeddings`，需要改为 Lovable AI Gateway 的 embedding 端点 |
| K3 | P1 | **左侧列表的"删除"和"配置"菜单项无功能** | `Knowledge.tsx:160-163` | DropdownMenuItem 的 `onClick` 未实现 |
| K4 | P1 | **知识库与 Builder/Runtime 的打通不完整** | 多文件 | Builder 中挂载的知识库 ID 是否会被 agent-chat 读取并执行 RAG 查询，整条链路需验证 |
| K5 | P2 | **左侧面板底部"图谱化"统计标签含义不清** | `Knowledge.tsx:187` | 显示的是 documents_count 的总和，但标签写的是"图谱化"，容易误导 |

### 改进计划
1. **K1+K2 修复（最高优先级）**: 将 `generateBatchEmbeddings` 改为使用 Lovable AI Gateway 的 embedding 端点（`https://ai.gateway.lovable.dev/v1/embeddings`），使用 `LOVABLE_API_KEY`。这是知识库整个 RAG 流程能工作的前提
2. **K3 修复**: 删除菜单连接 `useDeleteKnowledgeBase`，配置菜单打开 `EditKnowledgeBaseDialog`
3. **K4 修复**: 在 Builder 保存时将知识库 ID 写入 manifest.knowledgeBases，agent-chat 已有 RAG 查询逻辑（`performRAGQuery`），确保数据能流通
4. **K5 修复**: 将"图谱化"改为"总文档数"

---

## 模块四：技能工坊（Foundry）

### 现状
功能丰富但复杂度极高（1591 行），包含消费者模式和开发者模式双视图。

### 发现的问题

| # | 严重度 | 问题 | 文件 | 详情 |
|---|--------|------|------|------|
| F1 | P1 | **消费者模式下技能商店 → 点击技能后无安装到智能体的闭环** | `SkillStore.tsx` | 用户可以浏览技能，但安装后如何关联到自己的智能体？缺少"安装到指定智能体"的入口 |
| F2 | P1 | **MCP 模式 Inspect 结果在非开发者模式下不可见** | `Foundry.tsx` | MCP Inspector 仅在开发者模式可用，但消费者模式用户也可能需要查看 MCP 服务器状态 |
| F3 | P2 | **handler.py 和 config.yaml 只存本地状态** | `Foundry.tsx:470-474` | 加载已有 skill 时，只恢复 SKILL.md 内容，handler.py 和 config.yaml 始终用默认模板 |
| F4 | P2 | **技能版本历史按钮可能在无 activeSkillId 时可点击** | `Foundry.tsx` | 需要 disabled 检查 |
| F5 | P1 | **智能体广场导入的技能与 Foundry 技能体系不一致** | `AgentPlazaDetail.tsx` | 广场中从 GitHub 导入的是 agent 配置，但 Foundry 管理的是 skill，两者概念混合 |

### 改进计划
1. **F1 修复**: 在技能商店的"安装"流程后，添加"关联到智能体"的引导，或跳转到 Builder 页面
2. **F3 修复**: 在 skills 表中增加 `handler_code` 和 `config_yaml` 字段，保存和加载时包含这些文件
3. **F5**: 在 UI 上明确区分"技能"（Skill）和"智能体模板"（Agent Template）的概念

---

## 模块五：运行终端（Runtime）

### 现状
1537 行巨型组件，包含完整的 MPLP 流程模拟、AI 流式对话、DevTools 等。

### 发现的问题

| # | 严重度 | 问题 | 文件 | 详情 |
|---|--------|------|------|------|
| R1 | **P0** | **MPLP 技能执行是完全模拟的** | `Runtime.tsx:136-326, 627-690` | `mplpScenarios` 数组中的 `mockResponse` 是硬编码文本。当用户输入匹配关键词时（如"删除""执行"），返回的是假数据而非真实操作结果 |
| R2 | **P0** | **用户消息未持久化到数据库** | `Runtime.tsx:708-883` | `sendMessage` 中只在流程结束后保存了 assistant 消息，但 **用户发送的消息从未调用 addMessage**。这意味着重新加载页面后用户消息丢失 |
| R3 | P1 | **切换智能体后聊天历史同步有延迟** | `Runtime.tsx:517-537` | `handleAgentChange` 调用 `findOrCreateSessionForAgent` 后，`persistedMessages` 的更新依赖 useEffect，可能导致短暂的消息闪烁 |
| R4 | P1 | **DevTools 面板数据与实际执行不一致** | `Runtime.tsx` | Trace 事件、Circuit Breaker、Task Scheduler 等面板显示的数据大多来自本地状态模拟，而非真实后端数据 |
| R5 | P1 | **语音输入按钮在非 HTTPS 环境下静默失败** | `VoiceInputButton.tsx` | 需要在 HTTP 环境下显示明确的不支持提示 |
| R6 | P2 | **消息气泡中的语义化标签可能未正确渲染** | `FormattedText.tsx` | AI 被要求使用 `<h-entity>`, `<h-alert>` 等自定义标签，需确认 FormattedText 组件能正确解析这些标签 |
| R7 | P1 | **URL 参数 agentId 未被读取** | `Runtime.tsx` | 即使从 Builder/Dashboard 传入 `?agentId=xxx`，Runtime 也不会自动选中该智能体 |

### 改进计划
1. **R2 修复（最高优先级）**: 在 `sendMessage` 函数开头添加用户消息的持久化：
```typescript
// 在创建 userMessage 对象后立即保存
if (chatSession) {
  await addMessage({ role: "user", content: messageContent });
}
```
2. **R1 修复**: 将 `mplpScenarios` 改为真正的技能路由机制，或明确标注为"演示模式"，并在有真实技能挂载时优先使用 AI 对话
3. **R7 修复**: 在 Runtime 组件中读取 `useSearchParams` 的 `agentId` 参数，在 `deployedAgents` 加载后自动调用 `handleAgentChange`
4. **R6 验证**: 检查 `FormattedText.tsx` 对自定义语义标签的解析覆盖情况

---

## 跨模块打通问题

### 当前断裂的核心链路

| # | 链路 | 问题 | 影响 |
|---|------|------|------|
| X1 | **Builder → Runtime** | 部署后无法自动跳转到正确的智能体对话 | 用户部署完成后不知道去哪里使用 |
| X2 | **Knowledge → Builder → Runtime** | 知识库挂载信息是否写入 manifest？agent-chat 是否读取？embedding 是否工作？ | **整条 RAG 链路可能完全断裂** |
| X3 | **Foundry → Builder** | 技能安装后如何添加到智能体？ | 用户在技能商店安装的技能无法自动出现在 Builder 的可选列表中 |
| X4 | **Dashboard → Builder/Runtime** | 智能体卡片点击后不携带 agentId | 用户需要手动重新选择 |

### 改进计划（按优先级排序）

1. **X2: 修复 RAG 全链路（P0）**
   - 步骤1: 修改 `embed-with-gateway.ts` 的 embedding 函数使用 Lovable Gateway + LOVABLE_API_KEY
   - 步骤2: 确认 Builder 保存时 manifest 包含 knowledgeBases 数组
   - 步骤3: 确认 agent-chat 的 `performRAGQuery` 正确读取 manifest 中的知识库 ID
   - 步骤4: 部署并端到端测试

2. **X1+X4: 打通智能体跳转（P1）**
   - 在 Dashboard、Builder 的所有"前往 Runtime"操作中传递 `?agentId=xxx`
   - Runtime 组件读取 URL 参数并自动选中

3. **X3: 技能安装到智能体闭环（P1）**
   - 安装技能后显示"添加到智能体"对话框
   - 或在 Builder 的技能市场中标记已安装的技能

---

## 实施优先级总览

### P0 — 必须立即修复（系统不可用）

| 任务 | 模块 | 描述 |
|------|------|------|
| **修复 Embedding API 认证** | Knowledge/RAG | 将 embedding 调用改为 Lovable Gateway，使用 LOVABLE_API_KEY |
| **修复用户消息持久化** | Runtime | sendMessage 中保存用户消息到数据库 |
| **MPLP 模拟数据标注** | Runtime | 明确标注演示模式，或在有真实技能时跳过模拟流程 |

### P1 — 核心流程打通

| 任务 | 模块 | 描述 |
|------|------|------|
| **agentId URL 参数传递** | 全平台 | Dashboard/Builder → Runtime 携带 agentId |
| **Runtime 读取 agentId 参数** | Runtime | 自动选中目标智能体 |
| **Knowledge 列表菜单功能** | Knowledge | 删除和配置菜单绑定实际操作 |
| **RAG 全链路验证** | Builder+Knowledge+Runtime | 知识库 ID → manifest → agent-chat → RAG query |
| **Builder KnowledgeBaseNode ref 警告** | Builder | 修复 Badge ref 转发 |

### P2 — 体验优化

| 任务 | 模块 | 描述 |
|------|------|------|
| 工作台统计标签修正 | Dashboard | "图谱化" → "总文档数" |
| Foundry handler/config 持久化 | Foundry | 保存和加载 handler.py, config.yaml |
| Builder 代码拆分 | Builder | 将 2100 行代码拆分为子组件 |

---

## 涉及文件变更总览

| 文件 | 操作 | 优先级 |
|------|------|--------|
| `supabase/functions/_shared/embed-with-gateway.ts` | **重构**: embedding 使用 Lovable Gateway | P0 |
| `supabase/functions/_shared/config.ts` | 修改: 添加 Lovable Gateway embedding 配置 | P0 |
| `src/pages/Runtime.tsx` | 修复: 用户消息持久化 + agentId 读取 | P0+P1 |
| `src/pages/Index.tsx` | 修复: 跳转传递 agentId | P1 |
| `src/pages/Builder.tsx` | 修复: 部署后跳转传 agentId + ref 警告 | P1 |
| `src/pages/Knowledge.tsx` | 修复: 列表菜单功能 + 统计标签 | P1+P2 |
| `src/components/builder/KnowledgeBaseNode.tsx` | 修复: Badge ref 转发 | P1 |
| `src/hooks/useAgents.ts` | 验证: manifest 中知识库字段 | P1 |

### 建议实施顺序
1. **先修复 P0**: Embedding API 认证 → Runtime 用户消息保存 → 端到端验证 RAG
2. **再打通 P1**: agentId 传递链路 → Knowledge 菜单 → Builder ref 修复
3. **最后优化 P2**: 统计标签、Foundry 持久化、Builder 拆分

