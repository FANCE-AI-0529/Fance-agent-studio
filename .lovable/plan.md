

# 全系统 Markdown 格式清除 & 语义标签统一计划

## 问题根因

从用户截图可见，构建完成的智能体回复中仍大量使用 `**双星号加粗**` 格式，这是因为：

1. `agent-chat/index.ts` 第 419-420 行：当智能体配置了自定义 `systemPrompt` 时，返回的提示词中 **缺失** `TERMINAL_STYLE_INSTRUCTIONS` 和 `ROLE_META_INSTRUCTIONS`，导致 LLM 完全不知道要用语义标签
2. `sandbox-validate/index.ts`：直接使用 `agentConfig.systemPrompt` 发送给 AI，同样无终端风格指令注入
3. `FormattedText.tsx` 第 51 行：`**bold**` 仍作为兜底渲染（type `"bold"`），只是普通 `font-medium` 灰色文字，无语义颜色区分
4. `coreSkillPrompts.ts`：16 个核心技能的 SKILL.md 内容本身也大量使用 `**bold**` Markdown 格式

## 修复方案

### 1. 修复 agent-chat Edge Function（核心修复）

**修改** `supabase/functions/agent-chat/index.ts`

- 第 419-420 行：自定义 systemPrompt 路径追加 `TERMINAL_STYLE_INSTRUCTIONS` + `ROLE_META_INSTRUCTIONS`
- 确保所有 3 条路径（无配置 / 有自定义 prompt / 默认 prompt）都注入终端风格指令

变更前：
```
if (config?.systemPrompt) {
    return `${config.systemPrompt}${skillsSection}${webSearchSection}${multimodalInstructions}${PRIVACY_PROTECTION_INSTRUCTIONS}`;
}
```

变更后：
```
if (config?.systemPrompt) {
    return `${config.systemPrompt}${skillsSection}${webSearchSection}${multimodalInstructions}${PRIVACY_PROTECTION_INSTRUCTIONS}${TERMINAL_STYLE_INSTRUCTIONS}${ROLE_META_INSTRUCTIONS}`;
}
```

### 2. 强化 TERMINAL_STYLE_INSTRUCTIONS 提示词

**修改** `supabase/functions/agent-chat/index.ts` 中的 `TERMINAL_STYLE_INSTRUCTIONS` 常量

- 加强禁令措辞，明确"这是硬性规定"
- 增加更多 **错误 vs 正确** 对比示例
- 新增"遇到重点内容用不同颜色标签替代加粗"的明确指令

### 3. 修复 sandbox-validate Edge Function

**修改** `supabase/functions/sandbox-validate/index.ts`

- 在 `enhancedSystemPrompt` 末尾追加终端风格指令（复用 compact 版本）

### 4. 升级 FormattedText 渲染层（前端兜底）

**修改** `src/components/runtime/FormattedText.tsx`

- 将 `**bold**` 的渲染从 `font-medium text-foreground`（灰色无差异）改为自动转换成 `<h-entity>` 风格的彩色高亮胶囊
- 这样即使 LLM 仍然输出 `**text**`，前端也会自动以彩色呈现，而非灰色加粗

变更前（第 198-205 行）：
```tsx
case "bold":
case "emphasis":
  parts.push(
    <span key={keyIndex++} className="font-medium text-foreground">
      {match.content}
    </span>
  );
```

变更后：
```tsx
case "bold":
case "emphasis":
  parts.push(
    <span key={keyIndex++} className="inline bg-indigo-500/15 text-indigo-300 px-1.5 py-0.5 rounded-md font-medium text-sm border border-indigo-500/20">
      {match.content}
    </span>
  );
```

### 5. 清理 coreSkillPrompts.ts 中的 Markdown 格式

**修改** `src/constants/coreSkillPrompts.ts`

- 将所有 `**bold text**` 替换为对应的语义标签或 `[方括号]` 格式
- 约 159 处 `**...**` 需替换

---

## 文件变更清单

| 文件 | 变更类型 | 说明 |
|------|---------|------|
| `supabase/functions/agent-chat/index.ts` | 修改 | 自定义 prompt 路径注入终端风格指令；强化 TERMINAL_STYLE_INSTRUCTIONS 措辞 |
| `supabase/functions/sandbox-validate/index.ts` | 修改 | enhancedSystemPrompt 末尾追加终端风格指令 |
| `src/components/runtime/FormattedText.tsx` | 修改 | `**bold**` 渲染改为彩色高亮胶囊（前端兜底） |
| `src/constants/coreSkillPrompts.ts` | 修改 | 清除 159 处 `**...**` Markdown 加粗，替换为 `[方括号]` 或语义标签 |

