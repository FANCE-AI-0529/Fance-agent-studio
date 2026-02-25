

# ConsumerRuntime 消息渲染管线修复计划

## 问题根因

从浏览器截图和代码审查中发现：**ConsumerRuntime 组件根本没有使用 FormattedText 或任何格式化组件来渲染消息**。

`src/components/runtime/ConsumerRuntime.tsx` 第 770-772 行：
```tsx
<p className="whitespace-pre-wrap text-sm leading-relaxed">
  {message.content}
</p>
```

所有消息（历史 + 实时）都用原始 `<p>` 标签直接输出 `message.content`，导致：
1. `**bold**` 以原始双星号文字显示
2. `<meta role="..." />` 标签以原始文字显示（未被 `parseAgentMeta` 剥离）
3. `<h-entity>...</h-entity>` 语义标签以原始文字显示（未被 FormattedText 渲染为彩色高亮）

同样，流式内容（第 796-798 行）也是原始文字渲染：
```tsx
<p className="whitespace-pre-wrap text-sm leading-relaxed">
  {streamingContent}
</p>
```

系统已有 `FormattedText`、`SmartChatBubble`、`parseAgentMeta` 等完整的渲染管线，但 ConsumerRuntime **完全绕过**了这些组件。

---

## 修复方案

### 修改文件：`src/components/runtime/ConsumerRuntime.tsx`

#### 变更 1：导入 FormattedText 和 parseAgentMeta

在文件顶部新增导入：
- `FormattedText` from `./FormattedText`
- `parseAgentMeta` from `@/constants/agentRoleThemes`

#### 变更 2：修复历史消息渲染（第 770-772 行）

将原始 `<p>{message.content}</p>` 替换为：

对于 assistant 消息：
1. 调用 `parseAgentMeta(message.content)` 剥离 `<meta>` 标签
2. 使用 `<FormattedText content={cleanContent} />` 渲染，自动处理 `<h-entity>`、`**bold**` 等格式

对于 user 消息：保留原始文本渲染（用户消息无需格式化）。

#### 变更 3：修复流式内容渲染（第 796-798 行）

将 `{streamingContent}` 替换为 `<FormattedText content={cleanContent} />`，其中 cleanContent 经过 `parseAgentMeta` 处理。

---

## 文件变更清单

| 文件 | 变更类型 | 说明 |
|------|---------|------|
| `src/components/runtime/ConsumerRuntime.tsx` | 修改 | 导入 FormattedText + parseAgentMeta；替换历史消息和流式内容的原始渲染为格式化渲染 |

只需修改 1 个文件，约 15 行代码变更。

