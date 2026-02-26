

# Consumer-Studio 互通同步审计报告与修复方案

## 当前架构分析

经过对整个代码库的深入审查，以下是 Consumer 页面和 Studio 页面之间数据流动的完整审计结果。

### 已实现的同步机制

1. **`globalAgentStore`** — 中央数据枢纽，通过 Supabase Realtime 订阅 `agent_graph_nodes`、`agent_graph_edges`、`agents` 表的变更
2. **`useStudioSyncNotifications`** — Consumer Runtime 监听 globalAgentStore 的远程事件，生成 SystemBubble 通知（技能上线/下线、配置更新等）
3. **`useAgentContextHotReload`** — Consumer Runtime 检测到 manifest/name/model 变化时热更新 agentConfig
4. **`MiniStudioPreview`** — Consumer 页面嵌入的迷你 ReactFlow 画布，通过 `useAgentSync` 实时展示节点图
5. **`ConsumerSyncBadge`** — 同步状态指示器
6. **`GraphChangeToast`** — 图谱变更弹窗通知
7. **`AgentGridList` / `AgentDock`** — 两者都通过 `useMyAgents()` 查询同一数据源（`agents` 表），天然同步

### 发现的断裂点

**断裂点 1：Builder 完全不使用 `globalAgentStore`**

这是最严重的问题。`Builder.tsx`（2212 行）使用独立的 `useNodesState` / `useEdgesState`（ReactFlow 本地状态），完全不读写 `globalAgentStore`，也不读写 `agent_graph_nodes` / `agent_graph_edges` 数据库表。

- Builder 的节点操作（拖拽、删除、连线）仅存在于 ReactFlow 内存中
- 保存时调用 `useSaveAgentWithSkills`，它更新 `agents` 表和 `agent_skills` 关联表，但不更新 `agent_graph_nodes` / `agent_graph_edges`
- Consumer 的 `useInvisibleBuilder` **会**写入 `agent_graph_nodes` / `agent_graph_edges`，但 Builder 加载时从 `agents.skills` 重建节点而非从图表表读取

结果：Consumer 构建的智能体图数据在 Builder 中不可见；Builder 修改的节点图数据 Consumer 的 MiniStudioPreview 看不到。

**断裂点 2：两套节点数据源不同步**

```text
Consumer (useInvisibleBuilder) → agent_graph_nodes/edges → globalAgentStore
Builder (useNodesState)        → agents.manifest + agent_skills → useAgent hook

两条路径各自独立，数据不互通。
```

**断裂点 3：Builder 保存不触发 Realtime 事件**

Builder 的 `useSaveAgentWithSkills` 更新 `agents` 表时会触发 `agents` 表的 Realtime 事件，但不更新 `agent_graph_nodes`，所以 Consumer 的 MiniStudioPreview 无法感知技能增删。

**断裂点 4：AgentDock 返回 `undefined`**

`AgentDock.tsx` 第 154 行：`return;` — 组件不渲染任何内容，Consumer 首页底部 Dock 完全不可见。

## 修复方案

### Phase A：Builder 写入 `agent_graph_nodes` / `agent_graph_edges`（核心修复）

修改 Builder 的关键操作，使其在本地状态变更的同时写入 globalAgentStore：

1. **Builder 加载时**：当 `existingAgent` 加载完成后，同时调用 `globalAgentStore.setAgentId(agentId)` 来触发图表数据加载，并优先使用 `agent_graph_nodes` 中的数据（如果存在），否则回退到 `agent_skills` 重建。

2. **Builder 保存时**：在 `useSaveAgentWithSkills` 成功后，同步将当前画布的节点和边写入 `agent_graph_nodes` / `agent_graph_edges`（先清除旧数据再写入新数据），确保 Consumer 的 MiniStudioPreview 和 InvisibleBuilder 数据一致。

3. **Builder 节点操作时**：添加 `useEffect` 监听 `nodes` / `edges` 变化，debounce 后批量同步到 globalAgentStore（或至少在保存时同步）。

### Phase B：统一数据读取路径

创建 `useUnifiedAgentGraph` hook，封装以下逻辑：
- 优先读取 `agent_graph_nodes` / `agent_graph_edges`
- 如果图表表为空，从 `agents.skills` + `agent_skills` 回退重建并写入图表表
- 返回 ReactFlow 兼容格式的 nodes/edges

Builder 和 Consumer 都使用此 hook 作为唯一数据来源。

### Phase C：修复 AgentDock 渲染

`AgentDock.tsx` 第 154 行 `return;` 替换为完整的 Dock UI 渲染，使 Consumer 首页底部的智能体快捷栏可见。

### Phase D：Builder 节点变更广播

Builder 中节点增删改时通过 `globalAgentStore._addSyncEvent` 广播事件，使 Consumer 端的 `useStudioSyncNotifications` 能实时收到通知。

## 技术实施细节

### 修改文件清单

| 文件 | 变更类型 | 说明 |
|------|---------|------|
| `src/pages/Builder.tsx` | 修改 | 引入 globalAgentStore，保存时同步图表数据 |
| `src/hooks/useAgents.ts` | 修改 | `useSaveAgentWithSkills` 增加图表同步逻辑 |
| `src/hooks/useUnifiedAgentGraph.ts` | 新建 | 统一图数据读取 hook |
| `src/components/consumer/AgentDock.tsx` | 修改 | 修复 `return;` 使 Dock 正确渲染 |

### 同步流程（修复后）

```text
修复后数据流：

Consumer 构建
  └─ useInvisibleBuilder
      ├─ 写入 agents 表
      ├─ 写入 agent_graph_nodes/edges
      └─ globalAgentStore.addNode/addEdge
            └─ Realtime 广播 → Builder 可感知

Studio Builder 编辑
  └─ ReactFlow 本地状态变更
      └─ 保存时
          ├─ 写入 agents 表
          ├─ 同步写入 agent_graph_nodes/edges
          └─ Realtime 广播 → Consumer MiniPreview/SyncBadge 可感知

双向监听
  └─ globalAgentStore.subscribe()
      ├─ agent_graph_nodes 变更 → _handleNodeChange
      ├─ agent_graph_edges 变更 → _handleEdgeChange
      └─ agents 变更 → _handleAgentChange
```

### 不需要修改的部分（已正确同步）

- `AgentGridList` / `AgentDock`（查询层）— 都用 `useMyAgents()` 查同一表
- `sessions` / `messages` — 聊天历史通过 `useChatSession` 共享同一数据库
- 模式切换（`appModeStore`）— 已通过 `persist` 中间件 + `ejectToStudio`/`returnToConsumer` 正确工作
- 实时订阅基础设施（`globalAgentStore.subscribe`）— 已正确实现

