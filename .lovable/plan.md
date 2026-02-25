

# Agent OS x NanoClaw: 底层基座融合实施计划

## 架构总览

本次融合将 NanoClaw 的核心能力（容器隔离、IPC 通信、Agent Swarms、文件系统记忆）抽象为 Agent OS Studio 的底层运行时接口，同时保持前端 Web 应用在 Lovable Cloud 上的部署能力。

核心思路：NanoClaw 作为可选的**自托管运行时后端**，通过标准化的 API 契约与 Agent OS Studio 前端对接。Studio 保留现有的 Edge Function 执行路径作为**云端模式**，同时新增 NanoClaw 运行时作为**本地/私有化模式**。

```text
┌─────────────────────────────────────────────────┐
│              Agent OS Studio (前端)              │
│  Canvas │ Runtime Chat │ Foundry │ Knowledge     │
└──────────────┬──────────────────┬────────────────┘
               │                  │
    ┌──────────▼──────┐  ┌───────▼─────────┐
    │  Cloud Runtime  │  │ NanoClaw Runtime │
    │  (Edge Funcs)   │  │  (Self-hosted)   │
    │  sandbox-exec   │  │  container-run   │
    │  task-scheduler │  │  ipc-middleware   │
    │  workflow-*     │  │  agent-swarms     │
    └─────────────────┘  └─────────────────┘
```

---

## 阶段 1: 运行时抽象层与容器接口 (Week 1)

### 1.1 创建统一运行时接口

新建 `src/types/runtime.ts`，定义双模式运行时的类型契约：

- `RuntimeMode`: `'cloud' | 'nanoclaw'`
- `RuntimeConfig`: 统一的运行时配置（含 NanoClaw 连接地址、认证信息）
- `ContainerConfig`: 容器沙箱配置（挂载点、资源限制、隔离级别）
- `ContainerStatus`: 容器状态枚举（Creating、Running、Suspended、Terminated）
- `IPCMessage`: IPC 消息协议类型
- `SwarmConfig`: Agent Swarms 配置类型

### 1.2 创建 NanoClaw 运行时适配器

新建 `src/services/nanoclawRuntime.ts`：

- `NanoClawClient` 类：封装与自托管 NanoClaw 实例的 WebSocket/HTTP 通信
- `createContainer()`: 为智能体创建隔离容器，映射 Agent → Group
- `executeInContainer()`: 在容器内执行代码，替代 Edge Function 的 `sandbox-execute`
- `sendIPCMessage()` / `onIPCMessage()`: IPC 消息收发
- `getContainerStatus()`: 查询容器状态
- 健康检查与自动重连机制

### 1.3 创建运行时 Store

新建 `src/stores/runtimeStore.ts`（Zustand）：

- 当前运行时模式 (`cloud` / `nanoclaw`)
- NanoClaw 连接状态
- 活跃容器列表及其状态
- IPC 消息队列
- 运行时切换逻辑

### 1.4 扩展沙箱类型

修改 `src/types/sandbox.ts`：

- 扩展 `SandboxRuntime` 类型，新增 `'container'` 选项
- 新增 `ContainerMountPoint` 接口（路径、权限、只读标志）
- 新增 `ContainerIsolationLevel`: `'full' | 'network' | 'filesystem'`

### 1.5 创建 NanoClaw 网关 Edge Function

新建 `supabase/functions/nanoclaw-gateway/index.ts`：

- 作为 Studio 前端与自托管 NanoClaw 实例之间的安全代理
- 验证用户身份后转发请求
- 当用户选择 NanoClaw 模式时，将 sandbox-execute 请求路由到用户的 NanoClaw 实例
- 支持 WebSocket 升级以传递实时 IPC 事件

---

## 阶段 2: Agent Swarms 与画布集成 (Week 2)

### 2.1 Swarms 类型定义

新建 `src/types/swarms.ts`：

- `SwarmDefinition`: 集群定义（名称、成员智能体、协作模式）
- `SwarmMember`: 成员定义（角色、CLAUDE.md 路径、能力声明）
- `SwarmCommunicationMode`: `'sequential' | 'parallel' | 'consensus' | 'hierarchical'`
- `SwarmExecutionState`: 集群运行时状态

### 2.2 画布 → Swarms 编译器

新建 `src/utils/swarmCompiler.ts`：

- `compileCanvasToSwarm()`: 将画布上的节点连线关系编译为 NanoClaw Swarms 配置
- 节点角色映射规则：
  - Agent 节点 → Swarm Member
  - Condition 节点 → 路由逻辑
  - Parallel 节点 → 并行 Swarm 组
- 生成 `swarm.yaml` 配置格式
- 验证器：检查循环依赖、未连接节点等

### 2.3 Swarms 状态面板

新建 `src/components/runtime/SwarmStatusPanel.tsx`：

- 实时展示 Swarm 中每个 Agent 的状态（Thinking / Executing / Waiting / Done）
- 成员间通信消息流可视化
- Swarm 整体进度指示器
- 支持暂停/恢复单个 Swarm 成员

### 2.4 Swarm 节点类型

新建 `src/components/builder/nodes/SwarmNode.tsx`：

- 画布上新增 "Agent Swarm" 节点类型
- 可展开查看内部 Swarm 成员
- 配置面板支持：协作模式选择、成员配置、共享上下文设置

---

## 阶段 3: MPLP 对 IPC 的底层劫持 (Week 3)

### 3.1 IPC 中间件系统

新建 `src/services/ipcMiddleware.ts`：

- `IPCMiddleware` 接口：`(message: IPCMessage) => Promise<IPCMessage | null>`
- `MPLPInterceptor`: MPLP 安全拦截中间件
  - 检测高危操作模式（`rm -rf`、`chmod 777`、网络外传等）
  - 匹配到危险操作时挂起 IPC 消息，生成授权请求
  - 通过 WebSocket 推送 `<h-alert>` 授权卡片到前端
  - 等待人类确认后释放或拒绝 IPC 锁
- `AuditLogger`: 所有 IPC 消息的审计记录中间件
- 中间件链管道：`applyMiddleware(message, [interceptor, logger, ...])`

### 3.2 危险操作检测规则

新建 `src/constants/dangerousPatterns.ts`：

- Bash 危险命令模式匹配规则
- 文件系统危险操作模式
- 网络外传检测规则
- 权限提升检测规则
- 每条规则关联风险等级和所需 MPLP 权限

### 3.3 IPC 授权卡片

新建 `src/components/runtime/IPCAuthorizationCard.tsx`：

- 展示被拦截的 IPC 操作详情
- 风险等级可视化（复用现有 MPLP ConfirmCard 设计语言）
- 操作预览（将被执行的命令）
- 批准/拒绝/永久授权三个操作选项
- 超时自动拒绝机制

### 3.4 扩展 MPLP Stepper

修改 `src/components/runtime/MPLPStepper.tsx`：

- 新增 "IPC 拦截" 状态阶段（在 Confirm 和 Executing 之间）
- 支持展示容器内操作上下文

---

## 阶段 4: CLAUDE.md 长期记忆中枢 (Week 3-4)

### 4.1 记忆同步服务

新建 `src/services/memorySync.ts`：

- `MemorySyncService`: 管理 CLAUDE.md 与数据库的双向同步
- `syncToDatabase()`: 解析 CLAUDE.md Markdown 结构，提取关键记忆写入数据库
- `syncFromDatabase()`: 从数据库生成/更新 CLAUDE.md 文件
- 合并策略：处理并发编辑冲突

### 4.2 记忆编辑器

新建 `src/components/runtime/MemoryEditor.tsx`：

- 可视化编辑 Agent 的 CLAUDE.md 长期记忆
- Markdown 编辑器 + 结构化视图双模式
- 记忆片段标签系统（任务计划、进度、偏好、知识）
- 版本历史对比

### 4.3 自动唤醒调度

扩展 `src/hooks/useTaskScheduler.ts`：

- 新增 `agent_self_wake` 任务类型
- 定时读取 CLAUDE.md 中的未完成任务
- 自动创建唤醒任务并通过 NanoClaw 调度器执行
- 与前端通知系统集成

### 4.4 NanoClaw 记忆文件管理

新建 `supabase/functions/nanoclaw-memory/index.ts`：

- 读取/写入指定 Agent Group 的 CLAUDE.md
- 合并 Studio 的 `task_plan.md` 和 `progress.md` 逻辑
- 记忆摘要生成（利用 LLM 压缩过长的记忆文件）

---

## 阶段 5: Vibe Coding 集成 (Week 4)

### 5.1 动态 Skill 生成器

新建 `src/services/skillGenerator.ts`：

- 接收用户自然语言需求描述
- 调用 LLM 生成 `SKILL.md` 格式的技能文件
- 自动注入到 NanoClaw 的 `.claude/skills/` 目录
- 支持技能的热加载与回滚

### 5.2 运行时设置页面

新建 `src/components/settings/RuntimeSettings.tsx`：

- 运行时模式切换（Cloud / NanoClaw）
- NanoClaw 实例连接配置（地址、端口、认证密钥）
- 连接状态指示器与诊断工具
- 容器配额管理

### 5.3 更新 Foundry 技能编辑器

修改 Foundry 模块相关组件：

- 技能编辑器支持 `SKILL.md` 格式（NanoClaw 原生技能格式）
- 技能部署目标选择（Cloud Edge Function / NanoClaw Container）
- 技能预览沙盒支持容器模式

---

## 文件变更清单

### 新建文件 (约 15 个)

| 文件 | 说明 |
|------|------|
| `src/types/runtime.ts` | 运行时接口类型 |
| `src/types/swarms.ts` | Swarms 类型定义 |
| `src/services/nanoclawRuntime.ts` | NanoClaw 客户端 |
| `src/services/ipcMiddleware.ts` | IPC 中间件系统 |
| `src/services/memorySync.ts` | 记忆同步服务 |
| `src/services/skillGenerator.ts` | 动态 Skill 生成器 |
| `src/stores/runtimeStore.ts` | 运行时状态 Store |
| `src/utils/swarmCompiler.ts` | 画布→Swarms 编译器 |
| `src/constants/dangerousPatterns.ts` | 危险操作检测规则 |
| `src/components/runtime/SwarmStatusPanel.tsx` | Swarms 状态面板 |
| `src/components/runtime/IPCAuthorizationCard.tsx` | IPC 授权卡片 |
| `src/components/runtime/MemoryEditor.tsx` | 记忆编辑器 |
| `src/components/builder/nodes/SwarmNode.tsx` | Swarm 画布节点 |
| `src/components/settings/RuntimeSettings.tsx` | 运行时设置页 |
| `supabase/functions/nanoclaw-gateway/index.ts` | 网关 Edge Function |
| `supabase/functions/nanoclaw-memory/index.ts` | 记忆管理 Edge Function |

### 修改文件 (约 8 个)

| 文件 | 变更 |
|------|------|
| `src/types/sandbox.ts` | 扩展运行时类型 |
| `src/stores/sandboxStore.ts` | 集成运行时模式切换 |
| `src/hooks/useSandboxExecution.ts` | 路由到 NanoClaw 运行时 |
| `src/hooks/useTaskScheduler.ts` | 新增自唤醒任务类型 |
| `src/components/runtime/MPLPStepper.tsx` | IPC 拦截状态 |
| `src/types/networkPolicy.ts` | 容器网络策略扩展 |
| `supabase/config.toml` | 注册新 Edge Functions |
| `docs/WORKFLOW_API.md` | 更新 API 文档 |

---

## 技术约束与注意事项

1. **NanoClaw 是可选依赖**：所有现有的 Cloud Runtime 路径保持不变，NanoClaw 集成通过运行时模式开关控制
2. **安全边界**：NanoClaw 网关 Edge Function 必须验证用户身份，不能无限制转发请求
3. **数据库不变**：本方案不需要新建数据库表，利用现有的 `agents`、`skills`、`task_queue` 表
4. **向后兼容**：未配置 NanoClaw 的用户体验完全不受影响

