

# 核心底层机制验证报告 (Backend Core Test Suite Report)

## 审计前提

经过对项目全量代码的深度扫描（`src/services/`、`src/types/`、`supabase/functions/`、`src/hooks/`），我必须首先指出一个**关键架构事实**：

**本项目（Agent OS Studio / "Shell" 层）中不存在 `apply.ts`、`lock.ts`、`merge.ts`、`file-ops.ts`、`customize.ts` 这些底层引擎文件。** 这些模块属于 **NanoClaw 内核（"Kernel" 层）**，运行在自托管的 Docker/Apple 容器内部，不属于本前端代码仓库。

本仓库的职责是"Shell"层：

- `src/types/nanoclawSkills.ts` — 仅是 NanoClaw 内核的 **TypeScript 类型映射**（interface 定义），不含任何运行逻辑
- `src/services/skillInjector.ts` — 通过 HTTP 代理（`nanoclaw-gateway`）向远程容器发送指令
- `src/services/skillCrafter.ts` — 调用 Edge Function 生成技能，然后代理写入容器
- `src/services/nanoclawRuntime.ts` — WebSocket/HTTP 客户端，连接远程 NanoClaw 实例
- `supabase/functions/nanoclaw-gateway/index.ts` — HTTP 代理，转发请求到用户自托管的 NanoClaw endpoint

**所有 6 个测试用例所考察的机制（原子回滚、文件锁、路径遍历防御、三向合并、依赖校验、自定义会话互斥）全部是容器内核逻辑，本仓库中完全没有对应实现。**

---

## 逐用例执行报告

### Test Case 1: 原子化事务回滚测试 (Atomic Rollback on Test Failure)

**Execution Status:** 🔴 FAIL — **机制不存在**

**Underlying Mechanism Traced:**
- `skillCrafter.ts` 第 131-135 行：`applySkillInContainer()` 失败时只抛出异常 `throw new Error('Apply failed: ...')`
- **没有任何文件清理、备份恢复、或 state.yaml 回退逻辑**
- 第 140-154 行：测试失败（`exitCode !== 0`）时仅输出日志 `测试失败 (exit: N)`，**不会触发回滚**，技能仍然被标记为"锻造完成"
- `skillInjector.ts` 第 33-42 行：注入失败时 `push` 到 `failed` 数组，但已注入的技能不会被撤销

**State/File System Verification:** 无本地 state.yaml 管理。`syncSkillState()` 只是 `read_file` 远程容器内的 state.yaml，本地无回退能力。

**Found Vulnerabilities / Bugs:**
1. **🔴 严重**：`craftSkill()` 在测试失败后不回滚。Phase 3（apply）成功 → Phase 4（test）失败 → 技能已被应用到容器但测试不通过 → 无撤销
2. **🔴 严重**：没有实现 `restoreBackup()` 或 `undoApply()` 的客户端调用
3. **🟡 中等**：`writeSkillToContainer()` 写入多个文件时非原子操作——写到第 2 个文件失败后，第 1 个文件已在容器中残留

---

### Test Case 2: 并发锁与僵尸进程防范 (Concurrency & Stale Lock Prevention)

**Execution Status:** 🔴 FAIL — **机制不存在**

**Underlying Mechanism Traced:**
- `NANOCLAW_PATHS.LOCK_FILE` 定义为 `'.nanoclaw/lock'`，但仅作为常量存在于 `types/nanoclawSkills.ts`
- **整个 `src/` 目录中没有任何锁获取（acquire）、锁释放（release）、PID 检测、或 stale timeout 的代码**
- `nanoclaw-gateway` Edge Function 接受并发请求时没有任何互斥保护——两个客户端可以同时发送 `apply_skill` 到同一容器
- `skillInjector.injectCoreSkills()` 使用 `for...of` 串行循环，但没有分布式锁保护

**State/File System Verification:** 无锁文件管理。`LOCK_FILE` 常量从未被引用。

**Found Vulnerabilities / Bugs:**
1. **🔴 严重**：Shell 层完全没有并发控制。两个浏览器标签页可以同时调用 `skillInjector.injectCoreSkills()` 向同一容器注入相互冲突的技能
2. **🔴 严重**：`nanoclaw-gateway` 作为代理层没有实现请求队列或乐观锁，直接转发所有请求到 NanoClaw endpoint

---

### Test Case 3: 沙箱逃逸与目录遍历防御 (Path Traversal Security)

**Execution Status:** 🔴 FAIL — **机制不存在**

**Underlying Mechanism Traced:**
- `nanoclaw-gateway/index.ts` 第 46-52 行：仅对 `nanoclawEndpoint` URL 做了简单的 hostname 黑名单检查（`169.254.169.254`, `metadata.google.internal`）
- **`write_file` action（第 132-145 行）直接将 `params.filePath` 和 `params.content` 转发到远程 NanoClaw API，没有对路径做任何校验**
- **`read_file` action（第 122-130 行）同样直接传递 `params.filePath`，无 `safePath()` 检查**
- 搜索 `safePath`、`resolveRealPath`、`symlink` 在整个仓库中零匹配

**State/File System Verification:** N/A — 无路径校验逻辑存在。

**Found Vulnerabilities / Bugs:**
1. **🔴 致命**：任何经过认证的用户可以通过 `nanoclaw-gateway` 向容器发送 `write_file` 请求，filePath 为 `../../../etc/passwd` 或 `/etc/shadow`。防御完全依赖远程 NanoClaw 内核
2. **🔴 致命**：Gateway 的 hostname 黑名单不完整——缺少 `127.0.0.1`、`localhost`、`0.0.0.0`、`10.x.x.x`、`172.16-31.x.x`、`192.168.x.x` 等内网 CIDR 段，存在 SSRF 风险
3. **🟡 中等**：`delete_file` action 不存在于 gateway 中（不支持），但 `file_ops` 类型定义包含 `delete` 操作，说明这部分功能设计了但未实现

---

### Test Case 4: 三向合并与代码漂移冲突 (Three-Way Merge & Drift Resolution)

**Execution Status:** 🔴 FAIL — **机制不存在**

**Underlying Mechanism Traced:**
- `MergeResult` 类型定义了 `merged`、`hasConflicts`、`conflictMarkers` 字段
- `ApplyResult` 类型定义了 `mergeConflicts`、`backupPending`、`untrackedChanges` 字段
- **但整个仓库中没有任何实现了 `computeFileHash()`、`diffFiles()`、或 `git merge-file` 调用的代码**
- `nanoclaw-gateway` 的 `apply_skill` action 只是简单 POST 到远程 `/containers/{id}/skills/apply`，不做任何本地合并逻辑

**State/File System Verification:** `AppliedSkill.file_hashes` 字段已定义但从未被填充或校验。

**Found Vulnerabilities / Bugs:**
1. **🔴 严重**：哈希对比漂移检测未实现。Shell 层盲目信任远程结果
2. **🟡 中等**：`skillInjector.preflightCheck()` 只检查"是否已安装"（名称去重），不检查文件哈希漂移

---

### Test Case 5: 依赖链与系统版本严格校验 (Manifest Strict Validations)

**Execution Status:** 🔴 FAIL — **机制不存在**

**Underlying Mechanism Traced:**
- `NanoClawSkillManifest` 定义了 `depends_on`、`conflicts_with`、`min_system_version`、`min_core_version` 字段
- `SkillState` 定义了 `skills_system_version`、`core_version` 字段
- `skillInjector.preflightCheck()` 第 105-141 行：**仅检查技能是否已安装（名称匹配）**，完全跳过了：
  - `depends_on` 依赖链校验
  - `conflicts_with` 冲突检测
  - `min_system_version` 版本比较
  - `min_core_version` 版本比较
- `DependencyManager.tsx` 第 90 行注释写明：`// Simulate checking dependencies (in real scenario, this would call an API)` — 是模拟代码

**State/File System Verification:** 版本和依赖字段在类型中定义但从未被读取或校验。

**Found Vulnerabilities / Bugs:**
1. **🔴 严重**：`preflightCheck()` 名不副实——声称"检查依赖和冲突"但只做名称去重
2. **🔴 严重**：可以安装与已有技能冲突的技能（`conflicts_with` 被忽略）
3. **🔴 严重**：可以安装依赖未满足的技能（`depends_on` 被忽略）
4. **🟡 中等**：版本不兼容的技能可以被强行注入，可能破坏容器状态

---

### Test Case 6: 自定义会话互斥锁 (Customize Session Mutex)

**Execution Status:** 🔴 FAIL — **机制不存在**

**Underlying Mechanism Traced:**
- `CustomModification` 类型已定义（`name`、`description`、`files_changed`、`applied_at`）
- `NANOCLAW_PATHS.CUSTOM_DIR` 定义为 `'.nanoclaw/custom'`
- **整个仓库中不存在 `startCustomize()`、`commitCustomize()`、`abortCustomize()` 的任何实现**
- 没有 `pending.yaml` 的读取、写入、或检查逻辑
- `applySkill` 流程中没有检查自定义会话状态的预置条件

**State/File System Verification:** `CUSTOM_DIR` 常量从未被使用。`custom_modifications` 字段从未被写入。

**Found Vulnerabilities / Bugs:**
1. **🔴 严重**：自定义会话系统完全未实现，仅有类型骨架
2. **🔴 严重**：无互斥机制——标准技能安装和自定义修改可以同时进行，可能导致状态不一致

---

## 综合安全评估

```text
┌────────────────────────────────────────────────────────────────┐
│              OVERALL ASSESSMENT: 6/6 FAIL                      │
│                                                                │
│  Root Cause: Shell-Kernel 职责分离                              │
│                                                                │
│  Shell (本仓库) 定义了完整的类型系统和接口契约，                   │
│  但底层安全机制的实现全部委托给 NanoClaw Kernel（容器内核），       │
│  而 Shell 层自身缺乏必要的客户端侧防护。                          │
│                                                                │
│  ┌─ 类型定义 ──────── ✅ 完整（14 接口 + 6 结果类型）            │
│  ├─ 客户端防护 ────── ❌ 缺失（无路径校验、无锁、无回滚）         │
│  ├─ 预检逻辑 ──────── ⚠️ 部分（仅名称去重，无依赖/版本/冲突）     │
│  └─ Gateway 安全 ──── ⚠️ 最小化（hostname 黑名单不完整）         │
└────────────────────────────────────────────────────────────────┘
```

### 需要实施的修复优先级

| 优先级 | 修复项 | 影响范围 |
|--------|--------|---------|
| P0 | Gateway SSRF 防御：扩展 `blockedHosts` 为完整 CIDR 私有地址段检查 | `nanoclaw-gateway/index.ts` |
| P0 | Gateway 路径校验：`write_file`/`read_file` 前校验 `filePath` 不含 `..` 或绝对路径 | `nanoclaw-gateway/index.ts` |
| P1 | `preflightCheck()` 补全：依赖链、冲突检测、版本校验 | `skillInjector.ts` |
| P1 | `craftSkill()` 回滚：测试失败后清理已写入的文件 | `skillCrafter.ts` |
| P2 | 客户端并发锁：前端层面的 mutex 防止重复提交 | `skillInjector.ts` |
| P2 | 自定义会话互斥实现 | 新增 `customizeManager.ts` |
| P3 | 哈希漂移检测客户端实现 | `skillInjector.ts` |

