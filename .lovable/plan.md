

# FormattedText 精细化渲染优化 — 实施计划

## 变更概述

两个文件的全面优化，解决流式渲染语义标签缺失、树形结构排版粗糙、列表符号未处理、段落间距不足四大问题。

---

## 修改 1：TypewriterFormattedText.tsx（完整重写 FormattedContent）

**核心问题**：流式渲染期间所有语义高亮完全失效

**变更内容**：

1. 新增 `import { AlertCircle } from "lucide-react"`

2. `FormattedContent` 的 `patterns` 数组从 8 个模式扩展为 18 个，补入全部语义标签：
   - `<h-entity>`, `<h-alert>`, `<h-data>`, `<h-status>` 核心标签
   - `<h-link>`, `<h-code>`, `<h-quote>`, `<h-action>` 扩展标签
   - `^\[([^\]]+)\]$` header 匹配
   - `\*\*(.+?)\*\*` bold 自动转胶囊

3. `Match` 接口的 `type` 联合类型扩展，新增 `refSource` 字段

4. `switch` 语句补入 12 个渲染分支，样式与 FormattedText.tsx 完全一致：
   - `h-entity` → indigo 胶囊
   - `h-alert` → rose 胶囊 + AlertCircle 图标
   - `h-data` → cyan 等宽粗体
   - `h-status` → emerald 中粗
   - `h-link` → blue 下划线
   - `h-code` → cyan 代码框
   - `h-quote` → 斜体 + 左边框
   - `h-action` → primary 圆角标签
   - `bold/emphasis` → indigo 胶囊（与 h-entity 同风格）
   - `header` → TERMINAL_CLASSES.header

5. 行级渲染优化（terminal style 分支）：
   - 空行 → `<div className="h-2" />` 段间距
   - 箱线符 → `text-muted-foreground/60 mr-1.5`（提升对比度 + 间距）
   - 分隔线 → `my-3`（增加间距）
   - 编号标题 `^\d+\.\s+` → 左侧色条段落标题
   - 列表符号 `^[*-]\s+` → 圆点 `●` + 缩进

---

## 修改 2：FormattedText.tsx（formatWithBoxChars 优化）

**变更内容**（仅 `formatWithBoxChars` 函数，约 40 行替换为 60 行）：

1. 箱线符颜色：`TERMINAL_CLASSES.boxChar` → `"text-muted-foreground/60 mr-1.5"`
2. 分隔线间距：`my-2` → `my-3`
3. 新增空行检测：`/^\s*$/` → `<div className="h-2" />`
4. 新增编号标题：`/^\d+\.\s+/` → 带 `border-l-2 border-primary/40` 的段落标题
5. 新增列表符号：`/^[*-]\s+/` → 圆点 `●` + `pl-4` 缩进

---

## 技术细节

### 编号标题渲染结构
```text
<div class="flex items-start gap-2 mt-2 mb-1 border-l-2 border-primary/40 pl-2">
  <span class="text-primary font-bold text-sm">1.</span>
  <span class="text-primary font-medium text-sm">{内容}</span>
</div>
```

### 列表符号渲染结构
```text
<div class="flex items-start gap-2 pl-4">
  <span class="text-muted-foreground mt-1.5 text-[6px]">●</span>
  <span>{内容}</span>
</div>
```

### 行级处理优先级（从上到下）
```text
1. 空行         → 段间距 spacer
2. 箱线符行     → 树形结构渲染
3. 分隔线 ---   → <hr>
4. [Header]     → 标题高亮
5. 编号 1.      → 段落标题
6. 列表 * / -   → 圆点列表
7. 普通行       → formatContent 内联解析
```

---

## 文件变更清单

| 文件 | 变更说明 |
|------|---------|
| `src/components/runtime/TypewriterFormattedText.tsx` | 补全全部 8+2 语义标签 + bold 转胶囊 + 导入 AlertCircle + 行级列表/编号/空行处理 |
| `src/components/runtime/FormattedText.tsx` | formatWithBoxChars 优化：箱线符颜色间距 + 编号标题 + 列表符号 + 段落间距 |

共 2 个文件修改。

