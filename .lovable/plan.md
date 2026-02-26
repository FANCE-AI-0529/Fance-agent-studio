

# 知识库模块三按钮修复 + 全面改进方案

## 问题分析

从截图可见，知识库列表项上有三个右键菜单按钮（查看详情、配置、删除），但当前 `KnowledgeBaseList.tsx` 代码中**完全没有**这三个按钮的实现 — 只是一个简单的点击选择按钮。这意味着：

1. **查看详情** — 没有独立的详情查看弹窗，只能通过左侧点击选中
2. **配置** — 不存在任何编辑/配置知识库的对话框（创建对话框有参数设置，但没有编辑版本）
3. **删除** — 删除功能仅存在于右侧 `KnowledgeBaseDetail` 头部，列表项本身不能直接删除

## 实施计划

### 任务 1: 为知识库列表项添加三点菜单（DropdownMenu）

**文件**: `src/components/knowledge/KnowledgeBaseList.tsx`

- 在每个知识库列表项右上角添加 `⋮` 三点按钮，使用 `DropdownMenu` 组件
- 三个菜单项：
  - **查看详情** (`Eye` 图标) — 选中该知识库并切换到详情视图
  - **配置** (`Settings2` 图标) — 打开配置对话框
  - **删除** (`Trash2` 图标，红色) — 打开删除确认对话框
- 阻止菜单按钮的点击事件冒泡，避免触发选择

### 任务 2: 创建知识库配置对话框

**新文件**: `src/components/knowledge/EditKnowledgeBaseDialog.tsx`

- 复用 `CreateKnowledgeBaseDialog` 的表单结构
- 预填充当前知识库的名称、描述、部门、chunk_size、chunk_overlap、实体提取开关
- 调用 `useUpdateKnowledgeBase` hook 保存修改
- 字段：名称、描述、分类、分块大小、分块重叠、实体提取开关

### 任务 3: 在列表项集成删除确认对话框

**文件**: `src/components/knowledge/KnowledgeBaseList.tsx`

- 添加 `AlertDialog` 删除确认，调用 `useDeleteKnowledgeBase`
- 删除后如果当前选中的就是被删的知识库，清空选中状态
- 添加删除中 loading 状态

### 任务 4: 查看详情功能完善

- 点击"查看详情"时，选中该知识库（等同于点击列表项），同时在右侧显示详情面板
- 如果右侧已显示该知识库，则无额外操作

---

## 二次审查发现的额外问题

### 问题 A: `graph-search` 中 edges 查询仍使用字符串拼接 IN

**文件**: `supabase/functions/graph-search/index.ts` 第 154 行

```ts
.or(`source_node_id.in.(${allNodeIds.join(",")}),target_node_id.in.(${allNodeIds.join(",")})`)
```

当节点数量大时可能超出 URL 长度限制。将改为分批查询或使用 RPC。

### 问题 B: `graph-extract` 仍仅处理第一个批次的文本用于 AI 提取

**文件**: `supabase/functions/graph-extract/index.ts` 第 100 行

`combinedContent = chunkBatches[0]` 只使用了第一批（10 个 chunks）的内容发送给 AI。虽然循环结构存在，但实际上 AI 调用只处理了第一个批次的文本。

### 问题 C: DocumentList 中文档无法查看原始文件内容

当前 `Eye` 按钮只显示"查看切片"，但没有提供查看原始文档内容的方式（如 PDF 预览）。`DocumentPreview.tsx` 文件存在但未在文档列表中使用。

---

## 技术细节

### 需要新增的组件依赖
- `DropdownMenu` (已安装 `@radix-ui/react-dropdown-menu`)
- `AlertDialog` (已安装)

### 涉及修改的文件
| 文件 | 操作 |
|------|------|
| `src/components/knowledge/KnowledgeBaseList.tsx` | 重构：添加三点菜单、删除确认 |
| `src/components/knowledge/EditKnowledgeBaseDialog.tsx` | **新建**：配置/编辑对话框 |
| `supabase/functions/graph-extract/index.ts` | 修复：合并所有批次文本 |
| `supabase/functions/graph-search/index.ts` | 优化：分批查询 edges |

### 不需要数据库迁移
所有修改在前端组件和现有 Edge Functions 层面完成，`useUpdateKnowledgeBase` hook 已存在。

