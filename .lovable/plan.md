

# FormattedText 精细化渲染优化计划

## 问题分析

从截图中识别到以下视觉问题：

### 问题 1：TypewriterFormattedText 缺失语义标签支持（严重）
`TypewriterFormattedText.tsx` 的 `FormattedContent` 组件**完全缺失**所有语义标签的解析：
- 没有 `<h-entity>`、`<h-alert>`、`<h-data>`、`<h-status>` 核心标签
- 没有 `<h-link>`、`<h-code>`、`<h-quote>`、`<h-action>` 扩展标签
- 没有 `**bold**` 到胶囊的自动转换
- 这意味着**流式回复期间所有语义高亮都是失效的**，只在流式结束变为历史消息后才生效

### 问题 2：树形结构排版粗糙
- `├─` / `└─` 箱线符与内容之间缺乏适当间距
- 箱线符颜色 `text-border` 太暗淡，与内容对比度不足
- 树形子项缺少左侧缩进，层级不明显

### 问题 3：编号标题缺乏视觉层级
- `1. 初步医疗信息` 这类编号段落标题被当作普通 `<h-entity>` 胶囊渲染
- 应该作为独立的段落标题行，具有更强视觉权重

### 问题 4：`*` 星号列表未处理
- LLM 输出的 `* 内容` 格式被原样显示为文本 `*`
- 应转换为圆点符号并增加缩进

### 问题 5：段落间距不足
- 各树形结构段落之间缺少视觉分隔
- 内容密度过高，阅读疲劳

---

## 修复方案

### 修改 1：TypewriterFormattedText 补全语义标签（关键修复）

**文件**：`src/components/runtime/TypewriterFormattedText.tsx`

在 `FormattedContent` 的 `patterns` 数组中补入全部 8 个语义标签模式（与 FormattedText 保持一致）：
- `<h-entity>`, `<h-alert>`, `<h-data>`, `<h-status>`
- `<h-link>`, `<h-code>`, `<h-quote>`, `<h-action>`
- `**bold**` 自动转为胶囊

在 `switch` 语句中补入对应的渲染分支，样式与 `FormattedText.tsx` 完全一致。

同时导入 `AlertCircle` 图标用于 `h-alert` 渲染。

### 修改 2：FormattedText 树形结构精细化

**文件**：`src/components/runtime/FormattedText.tsx`

- 箱线符渲染增加右侧间距：`mr-1.5`
- 箱线符颜色升级：`text-border` → `text-muted-foreground/60`
- 树形行增加左缩进 `pl-2` 营造层级感
- 空行前后增加 `my-1` 间距

### 修改 3：新增列表符号模式

**文件**：`src/components/runtime/FormattedText.tsx` 和 `TypewriterFormattedText.tsx`

在 `formatWithBoxChars` / 行级处理中新增：
- `^\d+\.\s+` 编号行 → 渲染为带左侧色条的段落标题
- `^\*\s+` 星号列表 → 转为 `•` 圆点 + 缩进
- `^-\s+` 短横列表 → 转为 `•` 圆点 + 缩进

### 修改 4：段落间距优化

在行级渲染中，检测空行（`/^\s*$/`）并渲染为 `<div className="h-2" />` 增加段间距。

---

## 文件变更清单

| 文件 | 变更说明 |
|------|---------|
| `src/components/runtime/TypewriterFormattedText.tsx` | 补全 8 个语义标签 + bold 转胶囊 + 导入 AlertCircle |
| `src/components/runtime/FormattedText.tsx` | 树形结构间距/颜色优化 + 列表符号处理 + 段落间距 |

共 2 个文件修改。

