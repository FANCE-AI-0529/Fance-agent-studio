

# 第三轮安全审计报告 — Fance Studio

经过对前两轮修复后的代码库进行全面重新审查，以下是当前仍然存在的漏洞清单。

---

## 🔴 CRITICAL（3 项）

### C1. `manage-api-keys` 仍使用 XOR 加密

**文件**: `supabase/functions/manage-api-keys/index.ts:46-80`

`llm-gateway` 已升级为 AES-256-GCM，但 `manage-api-keys` 仍然使用 XOR 加密存储用户 API Key，且注释中写着"用于演示"。同一系统中两套加密方案不一致。

**修复**: 将 `manage-api-keys` 的 `encryptApiKey`/`decryptApiKey` 替换为与 `llm-gateway` 相同的 AES-256-GCM 实现（提取到 `_shared/crypto.ts`）。

---

### C2. `workflow-llm-call` 和 `vibe-loop-reflect` 完全无认证

**文件**: `supabase/functions/workflow-llm-call/index.ts`、`supabase/functions/vibe-loop-reflect/index.ts`

这两个函数直接使用 `LOVABLE_API_KEY` 调用 AI Gateway，但无任何 JWT 验证。任何人可以直接调用这两个端点消耗 AI 额度。

**修复**: 添加与 `workflow-code-executor` 相同的 `getClaims()` 认证逻辑。

---

### C3. `sandbox-validate` 完全无认证 + 硬编码 Gateway URL

**文件**: `supabase/functions/sandbox-validate/index.ts`

无 JWT 验证，且 AI Gateway URL 硬编码为 `https://ai.gateway.lovable.dev/v1/chat/completions`。

**修复**: 添加认证 + 将 URL 改为 `Deno.env.get("AI_GATEWAY_URL")` 并回退到硬编码值。

---

## 🟠 HIGH（5 项）

### H1. `task-delegation` 认证可选 — 允许无身份操作

**文件**: `supabase/functions/task-delegation/index.ts:119-127`

`if (authHeader)` 逻辑意味着无 auth header 时 `userId = null`，后续虽在 delegate 操作中检查 `!userId`，但 `list` 和 `status` 操作可能泄露数据。

**修复**: 将认证改为强制，无 token 直接返回 401。

---

### H2. 共享 CORS 模块 `_shared/cors.ts` 创建后从未被使用

**文件**: 69 个 Edge Function 中仍硬编码 `Access-Control-Allow-Origin: *`

上一轮创建了 `_shared/cors.ts` 但没有任何函数引用它。CORS 保护形同虚设。

**修复**: 批量替换所有 Edge Function 中的硬编码 `corsHeaders`，改为 `import { getCorsHeaders, handleCorsPreflightIfNeeded } from "../_shared/cors.ts"`。

---

### H3. `LOVABLE_API_KEY` 仍在 24 个 Edge Function 中使用

**文件**: `agent-chat`、`workflow-llm-call`、`vibe-loop-reflect`、`sandbox-validate`、`sync-asset-index`、`_shared/embed-with-gateway.ts` 等 24 个文件

品牌去耦合不完整。Secret 名称和代码中引用均未统一为 `FANCE_API_KEY`。

**修复**: 
1. 添加新 Secret `FANCE_API_KEY`
2. 所有函数改为 `Deno.env.get("FANCE_API_KEY") || Deno.env.get("LOVABLE_API_KEY")`（向后兼容）
3. 日志和错误消息中移除 "LOVABLE" 字样

---

### H4. `UserManagementDialog` 管理员检查使用可篡改的 `user_metadata`

**文件**: `src/components/user/UserManagementDialog.tsx:68`

```typescript
const isAdmin = user?.user_metadata?.is_admin === true;
```

用户可通过 `supabase.auth.updateUser({ data: { is_admin: true } })` 自行提权，暴露管理员面板。

**修复**: 替换为已有的 `useIsAdmin()` hook（查询 `user_roles` 表）。

---

### H5. 9 个 Edge Function 仍使用 `getUser(token)` 而非 `getClaims()`

**文件**: `manage-api-keys`、`task-delegation`、`agent-handshake`、`drift-detection`、`workflow-generator`、`agent-config-generator`、`rag-query`、`rag-ingest`、`generate-skill-template`

每次 `getUser()` 会触发数据库查询，在高并发下可被利用为慢速 DoS 攻击向量。

**修复**: 统一替换为 `getClaims()`（纯 JWT 解析，零数据库开销）。

---

## 🟡 MEDIUM（5 项）

### M1. 邀请码枚举 — 验证端点返回详细状态信息

**文件**: `supabase/functions/validate-invite-code/index.ts`

不同的错误消息（"不存在"、"已使用"、"已过期"）允许攻击者枚举有效邀请码。

**修复**: 统一返回 `邀请码无效或已过期`。

---

### M2. 日志表 INSERT 策略过于宽松

**表**: `webhook_logs`、`security_audit_logs` 使用 `WITH CHECK (true)`

可被用于日志注入、存储耗尽攻击。

**修复**: `webhook_logs` 改为仅允许 `service_role` 插入；`security_audit_logs` 添加速率限制。

---

### M3. Edge Function 日志泄露 `user.id`

**文件**: 9 个函数中 `console.log` 直接输出完整 user UUID

**修复**: 截断为 `userId.slice(0, 8) + '...'` 或使用哈希。

---

### M4. 43 个 `SECURITY DEFINER` 函数需要持续审计

所有函数已正确设置 `search_path`，但缺少自动化审计机制。

**修复**: 添加一条 SQL 注释策略文档 + 在 CI 中检测新增 DEFINER 函数。

---

### M5. `_shared/config.ts` 仍引用 `openai.com` 默认端点

**文件**: `supabase/functions/_shared/config.ts`

`AI_GATEWAY_URL` 默认值为 `https://api.openai.com/v1/chat/completions`，与 Fance AI Gateway 架构不一致，且可能导致错误路由。

**修复**: 默认值改为空字符串或 Fance Gateway URL。

---

## 🔵 LOW（3 项）

### L1. 泄露密码保护未启用

安全扫描器报告 `Leaked Password Protection` 为 disabled。

**修复**: 通过 `configure_auth` 工具启用。

---

### L2. `LOVABLE_API_KEY` Secret 名称残留

与品牌去耦合不一致，开源后会暴露平台依赖。

**修复**: 与 H3 合并处理。

---

### L3. `workflow-code-executor` 的 `new Function()` 沙箱可被绕过

虽然已添加正则黑名单，但高级攻击者可通过 Unicode 编码、字符串拼接等绕过静态正则检查。

**修复**: 考虑使用 Deno 的 `--allow-*` 权限模型或 Web Worker 隔离执行。当前方案可接受但应在文档中标注风险。

---

## 修复计划

按优先级分批实施：

**批次 1（Critical + High 认证类）**: C1 + C2 + C3 + H1 + H4 — 修复 7 个文件
- 提取 AES-256-GCM 到 `_shared/crypto.ts`，`manage-api-keys` 引用
- `workflow-llm-call`、`vibe-loop-reflect`、`sandbox-validate`、`task-delegation` 添加强制认证
- `UserManagementDialog` 改用 `useIsAdmin()`

**批次 2（High 批量类）**: H2 + H3 + H5 — 批量修改 ~50 个文件
- 所有 Edge Function 引用 `_shared/cors.ts`
- `LOVABLE_API_KEY` → `FANCE_API_KEY` 兼容引用
- `getUser()` → `getClaims()` 统一替换

**批次 3（Medium）**: M1 + M2 + M3 + M5 — 修复 ~12 个文件 + 1 个迁移
- 邀请码通用错误消息
- 日志表 RLS 加固
- 日志脱敏
- 默认端点修正

**批次 4（Low）**: L1 — 配置变更

预计修改 **~60 个文件**，零功能变更。

