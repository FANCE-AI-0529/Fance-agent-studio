

# NanoClaw 内核 API 化与 Shell 联调实施计划

## 背景理解

用户提供了一份完整的 NanoClaw Kernel 部署与 API 化指南（分为三个阶段）。其中**阶段一和阶段二**属于 NanoClaw 服务器端的独立工作（Express API 适配器 + Docker 部署），不在本项目代码范围内。**阶段三**是本项目（FANCE Studio / Shell 端）需要执行的联调改造。

本计划聚焦于阶段三：在 FANCE Studio 中打通与真实 NanoClaw Kernel 的联调。

---

## 需要改造的内容

### 1. RuntimeSettings — 真实健康检查（替换模拟）

**文件**: `src/components/settings/RuntimeSettings.tsx`

当前 `handleTestConnection` 是纯模拟（`setTimeout 2s`）。改为通过 `nanoclaw-gateway` Edge Function 调用真实 `/health` 端点：

- 调用 `supabase.functions.invoke('nanoclaw-gateway', { body: { action: 'health', nanoclawEndpoint, authToken } })`
- 成功时从返回数据中提取 `version` 并写入 store
- 失败时显示具体错误信息（网络不通 / 401 / 超时等）
- 显示延迟 (latency) 信息

### 2. Runtime.tsx — 移除 MPLP 模拟，接入真实执行路径

**文件**: `src/pages/Runtime.tsx`

当前 `sendMessage` 的执行流程：
```text
用户输入 → matchScenario() → 命中关键词 → 返回 mockResponse（带 🎭 演示模式标签）
                            → 未命中 → AI 对话（真实）
```

改造后：
```text
用户输入 → runtimeStore.mode 检查
  ├─ mode === 'cloud' → 保持现有 AI 对话流程（不变）
  └─ mode === 'nanoclaw' + 已连接 →
       → MPLP 意图识别（保留 scenario 匹配逻辑用于风险分级和权限检查）
       → 高风险操作仍弹出 ConfirmCard 等待授权
       → 授权通过后，通过 useTerminalStream 将命令发往真实 NanoClaw 容器
       → SSE 流式输出实时渲染到消息区域
```

具体变更：
- 引入 `useRuntimeStore` 读取当前模式和配置
- `executeScenario` 函数增加分支：当 `mode === 'nanoclaw'` 且 `connectionStatus === 'connected'` 时，调用 `useTerminalStream.executeStream()` 而非返回 `mockResponse`
- 将 SSE 流的 stdout/stderr 实时拼接为消息内容
- 移除 `🎭 演示模式` 前缀标记，改为显示真实执行结果
- 当 `mode === 'nanoclaw'` 但未连接时，提示用户先在设置中配置并测试连接

### 3. 新增 useNanoClawExecutor Hook

**新建文件**: `src/hooks/useNanoClawExecutor.ts`

封装 NanoClaw 模式下的完整执行流程：
- 从 `runtimeStore` 读取端点和 token 配置
- 包装 `useTerminalStream`，提供简化的 `execute(command)` 接口
- 处理容器选择逻辑（使用 `activeContainerId` 或自动创建临时容器）
- 将 SSE 流事件转换为消息格式返回给 Runtime
- 集成 Vibe Loop 自愈：执行失败时自动触发 `vibeLoopEngine` 重试

### 4. 更新跨模块导航提示

**文件**: `src/pages/Runtime.tsx`

当用户处于 NanoClaw 模式但未连接时，在聊天区域顶部显示一个 Banner：
- "NanoClaw 未连接 — 前往设置配置端点"
- 点击跳转到 HIVE 设置页面或弹出 RuntimeSettings

### 5. nanoclaw-gateway CORS 头更新

**文件**: `supabase/functions/nanoclaw-gateway/index.ts`

当前 CORS `Access-Control-Allow-Headers` 缺少 Supabase 客户端自动发送的额外头：

```
当前: 'authorization, x-client-info, apikey, content-type'
需要: 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version'
```

同样更新 `nanoclaw-stream/index.ts` 的 CORS 头。

---

## 涉及文件清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `src/hooks/useNanoClawExecutor.ts` | 新建 | NanoClaw 执行封装 Hook |
| `src/components/settings/RuntimeSettings.tsx` | 修改 | 真实健康检查替换模拟 |
| `src/pages/Runtime.tsx` | 修改 | 增加 NanoClaw 模式执行分支，移除模拟 |
| `supabase/functions/nanoclaw-gateway/index.ts` | 修改 | CORS 头补全 |
| `supabase/functions/nanoclaw-stream/index.ts` | 修改 | CORS 头补全 |

## 不变的部分

- `nanoclaw-gateway` 的所有 13 个 action 代理逻辑不变（已完整实现）
- `nanoclaw-stream` 的 SSE 透传逻辑不变
- `useTerminalStream` Hook 不变（已完整实现）
- `vibeLoopEngine` 不变
- `NanoClawClient` 类不变
- `runtimeStore` 不变
- MPLP 的 ConfirmCard / ThinkingProcess / TraceTree UI 组件不变

## 安全保障

- NanoClaw 端点的 SSRF 防护（已在 gateway 中实现）保持不变
- 用户 JWT 验证链路不变
- 高风险操作仍需 ConfirmCard 人类授权

