

# Swarm 执行链路补全实施计划

## 现状分析

当前系统中 Swarm 相关链路的完成度：

| 层级 | 组件 | 状态 |
|------|------|------|
| UI 展示层 | `SwarmNode.tsx` (画布节点) | 已完成 |
| UI 展示层 | `SwarmStatusPanel.tsx` (运行时面板) | 已完成 |
| 类型定义 | `types/swarms.ts` (全部类型) | 已完成 |
| 编译层 | `swarmCompiler.ts` (画布→YAML) | 已完成 |
| **状态管理** | **swarmStore** (Swarm 运行时状态) | **缺失** |
| **编排引擎** | **useSwarmRunner** (成员→容器映射 + 调度) | **缺失** |
| **消息路由** | **SwarmMessage IPC 转发** | **缺失** |
| **Kernel API** | **Swarm 批量编排端点** | **缺失** |
| **Gateway 代理** | **nanoclaw-gateway 新 action** | **缺失** |

核心断裂点：`swarmCompiler` 生成了 `SwarmDefinition`，但没有任何组件消费它来创建容器、分派任务、路由成员间通信。

---

## 实施内容

### 1. 新建 `swarmStore` — Swarm 运行时状态管理

**新文件**: `src/stores/swarmStore.ts`

管理所有活跃 Swarm 的生命周期状态：

- `activeSwarms: Map<swarmId, SwarmRuntimeState>` — 当前运行的 Swarm 列表
- `startSwarm(definition: SwarmDefinition)` — 初始化运行时状态，所有成员设为 `idle`
- `updateMemberState(swarmId, memberId, updates)` — 更新单个成员的 `status`、`progress`、`currentTask`
- `addMessage(swarmId, message: SwarmMessage)` — 记录成员间通信
- `setSwarmState(swarmId, state)` — 切换全局状态（`running`→`completed` 等）
- `getActiveSwarm()` — 获取当前焦点 Swarm
- `resetSwarm(swarmId)` — 清理完成的 Swarm

### 2. 新建 `useSwarmRunner` Hook — 编排引擎

**新文件**: `src/hooks/useSwarmRunner.ts`

这是核心调度器，将 `SwarmDefinition` 转化为真实的容器操作序列：

**职责**:
- 消费 `SwarmDefinition`（由 `swarmCompiler` 生成）
- 按 `communicationMode` 调度执行策略：
  - `sequential`: 逐个成员依次执行，前一个完成后启动下一个
  - `parallel`: 所有成员同时创建容器并执行
  - `hierarchical`: Leader 先执行，分析任务后向 Workers 分派子任务
  - `consensus`: 所有成员执行后收集结果，发起投票汇总
- 为每个 `SwarmMember` 调用 `nanoclaw-gateway` 的 `create_container` 创建隔离容器
- 通过 `useTerminalStream` 向各容器发送命令并接收 SSE 输出
- 将各容器的输出路由为 `SwarmMessage` 写入 `swarmStore`
- 当所有成员完成（或超时/失败），汇总为 `SwarmResult`

**关键接口**:
```text
startSwarm(definition) → swarmId
pauseMember(swarmId, memberId)
resumeMember(swarmId, memberId)  
cancelSwarm(swarmId)
```

### 3. 扩展 NanoClaw Kernel API — 批量编排端点

**修改文件**: `docs/nanoclaw-kernel/src/api-server.ts`

新增 3 个端点：

| 端点 | 方法 | 说明 |
|------|------|------|
| `/swarm/create` | POST | 批量创建容器组，接收 `SwarmDefinition`，为每个 member 创建容器，返回 `{ swarmId, containerMap: { memberId → containerId } }` |
| `/swarm/dispatch` | POST | 向指定 member 的容器发送命令，`{ swarmId, memberId, command }` |
| `/swarm/status` | GET | 查询 Swarm 下所有容器的聚合状态 |

这将 N 次独立 `create_container` 调用合并为一次原子操作，减少网络往返。

### 4. 扩展 nanoclaw-gateway — 新增 Swarm 代理 action

**修改文件**: `supabase/functions/nanoclaw-gateway/index.ts`

在 `switch(action)` 中新增 3 个 case：

- `action: 'swarm_create'` → 代理 `POST /swarm/create`
- `action: 'swarm_dispatch'` → 代理 `POST /swarm/dispatch`  
- `action: 'swarm_status'` → 代理 `GET /swarm/status`

沿用现有的 SSRF 防护和 JWT 验证链路。

### 5. 接入点 — Agent Studio 画布触发 Swarm 执行

**修改文件**: `src/pages/Runtime.tsx` (或 Agent Studio 中的画布操作按钮)

在 swarmCompiler 编译成功后，增加"部署 Swarm"操作：

- 调用 `compileCanvasToSwarm(nodes, edges, options)` 获取 `SwarmDefinition`
- 检查 `runtimeStore.mode === 'nanoclaw'` 且已连接
- 调用 `useSwarmRunner.startSwarm(definition)`
- 在 Runtime 页面挂载 `SwarmStatusPanel`，绑定 `swarmStore` 的实时状态

### 6. SwarmStatusPanel 接入真实数据

**修改文件**: `src/components/runtime/SwarmStatusPanel.tsx` 的使用方式

当前 `SwarmStatusPanel` 接收 props 但无人传递真实数据。计划：

- 在 Runtime 页面中，当存在活跃 Swarm 时渲染 `SwarmStatusPanel`
- 从 `swarmStore` 读取 `SwarmRuntimeState` 作为 props
- `onPauseMember` / `onResumeMember` 回调绑定到 `useSwarmRunner` 的控制方法

---

## 涉及文件清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `src/stores/swarmStore.ts` | **新建** | Swarm 运行时状态管理 |
| `src/hooks/useSwarmRunner.ts` | **新建** | 编排引擎 Hook（核心调度器） |
| `docs/nanoclaw-kernel/src/api-server.ts` | 修改 | 新增 `/swarm/*` 批量端点 |
| `supabase/functions/nanoclaw-gateway/index.ts` | 修改 | 新增 swarm_* action 代理 |
| `src/pages/Runtime.tsx` | 修改 | 挂载 SwarmStatusPanel、添加 Swarm 启动入口 |

## 不变的部分

- `swarmCompiler.ts` — 编译逻辑已完整，无需修改
- `SwarmNode.tsx` — 画布展示节点无需变更
- `SwarmStatusPanel.tsx` — 组件本身无需改动，只需在正确位置传入真实数据
- `types/swarms.ts` — 类型定义已覆盖所有场景
- 现有 `nanoclaw-gateway` 的 13 个 action 不变
- `useTerminalStream` / `useNanoClawExecutor` 不变（被 `useSwarmRunner` 内部调用）

## 数据流总览

```text
Agent Studio 画布
  │ (nodes + edges)
  ▼
swarmCompiler.compileCanvasToSwarm()
  │ (SwarmDefinition)
  ▼
useSwarmRunner.startSwarm(definition)
  │
  ├─ swarmStore.startSwarm() ← 初始化运行时状态
  │
  ├─ nanoclaw-gateway (swarm_create) → Kernel /swarm/create
  │     └─ 返回 containerMap: { memberId → containerId }
  │
  ├─ 按 communicationMode 调度:
  │     ├─ sequential: 逐个 dispatch
  │     ├─ parallel:   并发 dispatch
  │     ├─ hierarchical: Leader 先行，再分派
  │     └─ consensus:  全员执行后投票
  │
  ├─ useTerminalStream (SSE) ← 每个成员的实时输出
  │     └─ swarmStore.updateMemberState() ← 更新进度
  │     └─ swarmStore.addMessage() ← 记录通信
  │
  └─ 完成 → swarmStore.setSwarmState('completed')
              └─ SwarmStatusPanel 显示最终结果
```

