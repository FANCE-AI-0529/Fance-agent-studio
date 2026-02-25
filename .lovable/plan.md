

# OpenClaw 级体验复刻计划 (The OpenClaw Vibe Coding Experience)

## 现有基础设施分析

系统已具备：
- `CodingTerminalView` — 基础终端 UI（静态命令列表，无流式）
- `CodingModeLayout` — 可拉伸的终端/Diff 面板布局
- `NanoClawClient` — WebSocket + IPC 通信层，支持 `executeInContainer`
- `nanoclaw-gateway` Edge Function — 代理到 NanoClaw 实例的 REST 网关（无 SSE/流式）
- `useSelfHealing` — 已有自愈 Hook（面向 Studio 生成器，非容器级）
- `useCircuitBreaker` — 已有熔断器状态管理
- `SkillGenerator` + `SkillInjector` — 技能生成与注入管道
- 16 个 NanoClaw 原生 SKILL.md 核心技能

**缺口：**
1. 终端无流式回显（`isTerminalStreaming` 始终为 `false`）
2. 无 SSE 端点，gateway 只返回完整 JSON
3. 自愈 Hook 仅针对 Studio YAML 错误，非容器 Bash 执行错误
4. 无 "Skill Crafter" 自治技能锻造闭环

---

## 阶段一：实时终端流式 UI 与指令穿透

### 1.1 新增 SSE 流式执行 Edge Function

**新建** `supabase/functions/nanoclaw-stream/index.ts`

- 代理到 NanoClaw 的 `/execute/stream` 端点
- 返回 `text/event-stream` 响应，逐行转发容器 stdout/stderr
- SSE 事件格式：`data: {"type":"stdout"|"stderr"|"exit","content":"...","exitCode":0}`
- 含身份验证和安全检查（复用 gateway 逻辑）

### 1.2 新增流式终端 Hook

**新建** `src/hooks/useTerminalStream.ts`

```text
┌─ useTerminalStream(containerId, endpoint, authToken)
├─ startStream(command) → EventSource 连接 nanoclaw-stream
├─ 实时 append stdout/stderr 到 terminalCommands
├─ 自动检测 exitCode → 触发 onComplete/onError 回调
└─ cleanup: 关闭 EventSource
```

- 与 `useOpenCodeRuntime` 的 `addTerminalCommand`/`updateCommandOutput` 对接
- 支持多命令并发流

### 1.3 升级 TerminalStreamView 组件

**新建** `src/components/runtime/TerminalStreamView.tsx`

- 替代当前 `CodingTerminalView` 的静态渲染
- 深色背景 + JetBrains Mono 等宽字体
- 实时逐行滚动（ANSI 转义码解析：颜色、进度条）
- 状态徽章（右上角）：`Compiling...` / `Build Failed` / `Success`，使用语义标签 `<h-status>` / `<h-alert>` / `<h-entity>` 着色
- 折叠机制：成功时自动折叠日志，失败时高亮展开 Error Trace
- 支持用户输入命令（底部输入框，回车发送到容器）

### 1.4 更新 CodingModeLayout 集成

**修改** `src/components/runtime/CodingModeLayout.tsx`

- 将 `CodingTerminalView` 替换为 `TerminalStreamView`
- 传入流式状态和回调

---

## 阶段二：自治技能锻造者 (Agentic Skill Crafter)

### 2.1 新增 Skill Crafter 引擎服务

**新建** `src/services/skillCrafter.ts`

- `craftSkill(naturalLanguageRequest)` — 完整的自治流程：
  1. 调用 LLM 生成 SKILL.md + manifest.yaml
  2. 通过 `nanoclaw-gateway` 写入容器 `.claude/skills/[feature-name]/`
  3. 调用容器内 `apply_nanoclaw_skill` 执行安装
  4. 运行容器内测试验证
  5. 返回结果（成功/失败+日志）
- 内置 system prompt 强制约束："不直接修改文件，只通过 skill 机制注入"

### 2.2 新增 Skill Crafter Edge Function

**新建** `supabase/functions/skill-crafter/index.ts`

- 接收自然语言需求 → 调用 Lovable AI 生成 NanoClaw 原生 SKILL.md
- 返回生成的 skillMd + manifest + 测试代码
- 使用 `LOVABLE_API_KEY` 调用 AI 模型

### 2.3 新增 Skill Crafter UI 面板

**新建** `src/components/runtime/SkillCrafterPanel.tsx`

- 嵌入 ConsumerRuntime 侧边栏
- 输入框："描述你想要的能力..."
- 实时显示锻造进度：生成中 → 注入中 → 测试中 → 完成
- 生成结果预览（SKILL.md 内容 + diff）

### 2.4 更新 nanoclaw-gateway 新增 actions

**修改** `supabase/functions/nanoclaw-gateway/index.ts`

- 新增 `apply_skill` action — 在容器内执行 skill apply 流程
- 新增 `read_file` action — 读取容器内文件（已部分存在于 skillInjector 调用中）
- 新增 `write_file` action — 写入文件到容器

---

## 阶段三：错误自愈无限循环 (Vibe-Loop & Self-Healing)

### 3.1 新增容器级自愈引擎

**新建** `src/services/vibeLoopEngine.ts`

```text
┌─ VibeLoopEngine
├─ executeWithHealing(command, containerId)
│  ├─ 执行命令 → 检查 exitCode
│  ├─ exitCode > 0 → 截取 stderr 前50行+后50行
│  ├─ 构造反思 prompt → 发送给 Agent
│  ├─ Agent 返回修复方案 → 重新执行
│  └─ 循环直到成功或达到 max_retries(3)
├─ 熔断器集成
│  ├─ 复用 useCircuitBreaker 的 recordFailure/recordSuccess
│  └─ 3 次失败 → MPLP 介入，等待人类审批
└─ 事件发射
   ├─ onAttempt(attemptNumber, totalAttempts)
   ├─ onAnalysis(errorAnalysis)
   ├─ onFix(fixPlan)
   └─ onComplete(success, totalAttempts) / onEscalate(error, thinkingProcess)
```

### 3.2 新增 Vibe Loop 反思 Edge Function

**新建** `supabase/functions/vibe-loop-reflect/index.ts`

- 接收 stderr 日志 → 调用 AI 分析错误原因
- 输出：错误分类 + 修复代码 + 重试命令
- 使用 `LOVABLE_API_KEY` 的 gemini-2.5-flash（快速响应）

### 3.3 新增 Vibe Loop UI 组件

**新建** `src/components/runtime/VibeLoopIndicator.tsx`

- 脉冲动画显示自愈进度：`Self-Healing Attempt 1/3`
- 展开时显示：原始错误 → AI 分析 → 修复方案 → 重试结果
- 3 次失败后切换为 MPLP 授权卡片（复用 `IPCAuthorizationCard`）

### 3.4 更新 ConsumerRuntime 集成

**修改** `src/components/runtime/ConsumerRuntime.tsx`

- 集成 `TerminalStreamView` 替代静态终端
- 集成 `SkillCrafterPanel` 到侧边栏
- 集成 `VibeLoopIndicator` 到终端面板
- 新增 "Vibe Mode" 开关 — 启用后所有容器执行自动进入自愈循环

---

## 文件变更清单

### 新建文件 (8 个)

| 文件 | 说明 |
|------|------|
| `supabase/functions/nanoclaw-stream/index.ts` | SSE 流式执行代理 |
| `src/hooks/useTerminalStream.ts` | 流式终端数据 Hook |
| `src/components/runtime/TerminalStreamView.tsx` | 极客风实时终端组件 |
| `src/services/skillCrafter.ts` | 自治技能锻造引擎 |
| `supabase/functions/skill-crafter/index.ts` | AI 技能生成 Edge Function |
| `src/components/runtime/SkillCrafterPanel.tsx` | 技能锻造 UI 面板 |
| `src/services/vibeLoopEngine.ts` | 错误自愈无限循环引擎 |
| `src/components/runtime/VibeLoopIndicator.tsx` | 自愈进度可视化组件 |

### 修改文件 (3 个)

| 文件 | 变更 |
|------|------|
| `supabase/functions/nanoclaw-gateway/index.ts` | 新增 `apply_skill`、`read_file`、`write_file` actions |
| `src/components/runtime/CodingModeLayout.tsx` | 集成 TerminalStreamView 替代 CodingTerminalView |
| `src/components/runtime/ConsumerRuntime.tsx` | 集成 SkillCrafter、VibeLoop、流式终端 |

---

## 技术细节

### SSE 流式协议格式

```text
event: stdout
data: {"content": "Installing dependencies...\n"}

event: stderr
data: {"content": "warn: peer dependency missing\n"}

event: status
data: {"phase": "compiling", "progress": 45}

event: exit
data: {"exitCode": 0, "durationMs": 12340}
```

### Vibe Loop 反思 Prompt 模板

```text
[Execution Failed with Exit Code {code}]
Container: {containerId}
Command: {command}
Attempt: {attempt}/{maxRetries}

[Error Log - First 50 lines]
{stderrHead}

[Error Log - Last 50 lines]
{stderrTail}

Analyze the error, identify root cause, generate a fix, and provide the corrected command to retry.
Output JSON: {"analysis": "...", "fixCode": "...", "retryCommand": "..."}
```

### 熔断器与 MPLP 集成

- 3 次自愈失败 → `useCircuitBreaker.recordFailure()` → 熔断器开启
- 熔断器开启 → 生成 `IPCAuthorizationCard` 展示给用户
- 用户审批后 → 重置熔断器 → 可选继续自愈或手动修复

