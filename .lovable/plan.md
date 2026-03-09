

# Fance Studio 开源前代码库专业化整改方案

## 问题总览

经过全面审查，发现以下需要整改的问题类别：

1. **安全扫描遗留问题** — 3 个 error 级别发现仍未完全修复
2. **console.log 残留** — 195 处 `console.log` 散布在 24 个生产文件中
3. **`as any` 类型逃逸** — 426 处 `as any` / `@ts-ignore` 散布在 63 个文件中（需清理高频核心文件）
4. **测试/调试代码混入生产路由** — `OpenCodeTestPage`、`src/components/debug/*`、`src/components/test/*`、`src/test-fixtures/` 作为正式路由/模块暴露
5. **文件头版权声明缺失** — 大量核心文件缺少标准化 JSDoc 版权头
6. **Lovable 平台引用残留** — `docs.lovable.dev` 链接、`Lovable AI` 供应商模板等出现在用户可见 UI 中
7. **代码组织不规范** — 部分 import 语句跨行未排序，Builder.tsx 仍有 1664 行

## 实施计划

### Phase 1: 安全修复（Security Error Items）

TerminalStreamView 的 XSS 修复已存在（`escapeHtml`），`claim-invite-code` 已加 auth 校验，`api_key` 列已 DROP。验证扫描结果是否仍报这三项，若已通过则跳过。

### Phase 2: 移除调试/测试代码脱离生产路由

- 从 `App.tsx` 移除 `OpenCodeTestPage` 路由（`/opencode-test`）
- 保留 `src/components/debug/`、`src/tests/`、`src/test-fixtures/` 文件但不通过路由暴露
- 将 `SyncTestPanel` 等调试面板限制为 `NODE_ENV === 'development'` 条件渲染

### Phase 3: console.log 清理

对 24 个生产文件中的 `console.log` 进行分类处理：
- **删除**：调试用途的 log（如 `console.log('Streaming complete:')`）
- **降级为 `console.debug`**：有运维价值的日志（如 `[GraphSync]`、`[InvisibleBuilder]`）保留但改为 `console.debug`，生产环境默认不显示
- **保留**：示例代码中的 log（如 AgentApiPanel 的用法示例）

### Phase 4: 高频 `as any` 清理（核心模块优先）

重点清理以下高频文件的类型逃逸：
- `Builder.tsx` — `existingAgent.manifest as any` → 定义 `AgentManifest` 接口
- `AgentGridList.tsx`、`ImmersiveHeader.tsx`、`AppSidebar.tsx` — `manifest as any` → 统一复用 `AgentManifest` 类型
- `ModelProviderSettings.tsx`、`useSharedConversation.ts` — `.insert(data as any)` → 补全 insert 类型
- 其余 `as any` 在不引入大量类型重构的前提下，添加 `// eslint-disable-next-line` 注释并附理由

### Phase 5: Lovable 平台引用去耦合

- `src/components/help/HelpCenter.tsx` — 将 `docs.lovable.dev` 链接改为项目自有文档地址或 GitHub Wiki
- `src/hooks/useLLMProviders.ts` — 将 `Lovable AI` 模板改名为 `Fance AI Gateway`，endpoint 改为配置化
- `src/components/settings/GlobalModelSettings.tsx`、`LLMConfigPanel.tsx`、`ModelProviderSettings.tsx` — `Lovable` → `Fance`
- `src/utils/modelMapping.ts` — 注释中的 `Lovable AI Gateway` → `Fance AI Gateway`
- `src/components/settings/RuntimeSettings.tsx` — `Lovable Cloud` → `Fance Cloud`

### Phase 6: 核心文件版权头标准化

为以下无版权头的核心文件添加标准化 JSDoc：

```typescript
/**
 * @file [filename]
 * @description [中文描述]
 * @author Fance Studio
 * @copyright Copyright (c) 2025 Fance Studio. MIT License.
 */
```

覆盖范围：`App.tsx`、`main.tsx`、所有 pages/*.tsx、所有 stores/*.ts、所有 services/*.ts、所有 contexts/*.tsx

### Phase 7: 代码组织微调

- 统一 import 排序规则：React 系 → 第三方库 → @/ 内部 → 相对路径
- 移除 `src/test/` 中 `global.IntersectionObserver = ... as any` 的 `as any`，改用正确的类型断言

## 技术细节

### AgentManifest 接口（Phase 4 核心）

```typescript
// src/types/agent.ts (新增或扩展)
export interface AgentManifest {
  iconId?: string;
  colorId?: string;
  avatar?: AgentAvatar;
  description?: string;
  originalDescription?: string;
  // ... 其他已知字段
}
```

### 日志降级策略（Phase 3）

```typescript
// 替换前
console.log('[GraphSync] Synced nodes');

// 替换后
if (import.meta.env.DEV) {
  console.debug('[GraphSync] Synced nodes');
}
```

## 不在此次范围内

- **不重构** 1664 行的 Builder.tsx（Phase 6 已拆出 Toolbar/Dialogs，进一步拆分需要功能测试保障）
- **不删除** `src/components/debug/` 文件（保留为开发者工具，仅切断生产路由）
- **不修改** `src/integrations/supabase/` 下的自动生成文件

## 预计影响

- 修改约 40-50 个文件
- 零功能变更，纯代码质量提升
- 安全扫描 error 项清零
- `as any` 减少约 60%（核心路径）
- 生产环境零 `console.log` 输出

