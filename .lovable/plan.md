

# BUG 修复：智能体首条问候语与所选智能体不匹配

## 问题根因

在 `src/pages/Runtime.tsx` 中存在一个**竞态条件 + 逻辑缺陷**：

1. **竞态**：组件挂载时，`selectedAgent` 为 `null`，欢迎消息 useEffect（第 509 行）立即触发，生成默认的 "Fance 智能助手" 平台向导问候语
2. **不重置**：随后 URL 参数加载 effect（第 534 行）调用 `handleAgentChange`，它尝试查找/创建 session。若找到 session 但消息为空，`localMessages` 不会被清空，旧的默认问候语保留
3. **未使用能力提取器**：即使自定义智能体的欢迎消息成功触发（第 518 行），也只输出一句通用的"很高兴为您服务"，完全没有调用已有的 `extractAgentCapabilities()` 来生成基于系统提示词和 manifest 的个性化问候

## 修复方案

### 修改文件：`src/pages/Runtime.tsx`

**核心变更**：重构欢迎消息生成逻辑，分为三步：

1. **消除竞态**：在 `handleAgentChange` 中，无论 session 状态如何，都显式清空 `localMessages`，确保欢迎 effect 重新触发

2. **使用能力提取器生成问候语**：当 `selectedAgent` 存在时，调用 `extractAgentCapabilities()` 获取基于 systemPrompt 和 manifest 的个性化 `greeting`，替代当前硬编码的通用文本

3. **增加依赖守卫**：在欢迎 useEffect 中添加对 `selectedAgent?.id` 的依赖跟踪，确保智能体切换时始终重新生成匹配的问候语

**具体逻辑**：

```text
欢迎消息生成流程：
┌─ selectedAgent 为 null？
│   └─ YES → 使用默认 "Fance 智能助手" 平台向导模板
│   └─ NO  → 调用 extractAgentCapabilities(agent.name, systemPrompt, manifest)
│            └─ 返回 capabilities.greeting（基于角色/职责的个性化问候）
```

**handleAgentChange 修复**：
- 在 `setSelectedAgent(agent)` 后，始终执行 `setLocalMessages([])`
- 删除 session 查找成功时跳过清空的分支逻辑

## 技术细节

- 引入 `extractAgentCapabilities` 从 `@/utils/capabilityExtractor`
- 欢迎 useEffect 的依赖数组添加 `selectedAgent?.id`，使用 ref 追踪上一次 agent id 避免无限循环
- `EnhancedWelcomeCard` 组件（第一条消息下方的能力卡片）已经正确使用了能力提取器，修复后两者将保持一致

