

# 知识库模块工业级改进方案 — 对标 Dify

## 现状诊断：12 个阻塞生产使用的关键问题

经过完整代码审查，当前知识库模块存在以下严重问题，无法投入真实场景使用：

### P0 - 致命缺陷（完全无法正常工作）

| # | 问题 | 影响 | 证据 |
|---|------|------|------|
| 1 | **上传 PDF 后 `file_path` 为 null** | 文档上传完成但 Storage 路径丢失，导致 rag-ingest 无法获取文件内容。数据库显示 `file_path: null, status: pending, chunks_count: 0` | 网络请求中可见实际数据 |
| 2 | **处理进度条是假的** | `DocumentProcessingProgress` 使用 `setInterval` 模拟进度动画，不反映真实处理状态。代码注释明确写着 "Simulate progress" | DocumentProcessingProgress.tsx 第 23-54 行 |
| 3 | **ChunkPreview 语义标签是随机生成的** | `generateMockTags()` 用 `Math.random()` 生成假标签，`semanticWeight` 也是随机数 0.6-1.0 | ChunkPreview.tsx 第 234-244 行 |
| 4 | **上传失败静默吞错** | `uploadFileToStorage` 返回 null 时，代码继续创建文档记录（file_path=null），用户看到"成功"提示但实际数据不可用 | DocumentUploader.tsx 第 166-183 行 |

### P1 - 功能缺失（与 Dify 差距巨大）

| # | 问题 | Dify 对标 |
|---|------|-----------|
| 5 | **无文本粘贴/URL 导入** | Dify 支持粘贴文本、URL 爬取、Notion 同步 |
| 6 | **不支持 DOCX/CSV/XLSX/HTML** | Dify 支持 15+ 种文件格式 |
| 7 | **PDF 解析极不可靠** | 正则提取 PDF 文本在 CJK/扫描 PDF 上几乎完全失败；AI 解析限 3MB | 
| 8 | **无检索测试（Hit Testing）** | Dify 核心功能：输入问题，立即看到检索到的切片和相似度 |
| 9 | **修改分块参数后不重新索引** | 编辑 chunk_size/overlap 后现有文档不会重新处理 |
| 10 | **无文档处理状态实时更新** | 没有 Realtime 订阅或轮询，用户必须手动刷新页面 |

### P2 - 体验问题

| # | 问题 |
|---|------|
| 11 | **5MB 文件大小硬限制** 太小，生产环境需要至少 15MB |
| 12 | **无批量操作** 无法多选文档进行批量删除/重新索引 |

---

## 分阶段实施计划

### 第一阶段：修复致命缺陷（P0）

#### 任务 1.1: 修复上传流程 — 文件路径丢失问题

**文件**: `src/components/knowledge/DocumentUploader.tsx`

- `uploadFileToStorage` 返回 null 时**中止上传流程**，而不是继续创建文档记录
- 添加明确的错误提示："文件上传到存储失败，请重试"
- 添加重试逻辑（最多 2 次）
- 确保 `file_path` 非 null 才调用 `createDocument`

#### 任务 1.2: 实现真实处理进度 — 替换模拟动画

**文件**: `src/components/knowledge/DocumentProcessingProgress.tsx`, `src/components/knowledge/DocumentList.tsx`

- 删除所有 `setInterval` 模拟代码
- 改为通过 Realtime 订阅 `knowledge_documents` 表的状态变化：

```text
状态映射：
  pending    → 阶段 0（排队）
  processing → 阶段 1-3（解析/切片/向量化，根据 chunks_count 判断）
  indexed    → 阶段 4（完成）
  failed     → 错误状态
```

- 使用 Supabase Realtime 监听 `knowledge_documents` 的 `UPDATE` 事件
- 需要先启用该表的 Realtime：`ALTER PUBLICATION supabase_realtime ADD TABLE public.knowledge_documents;`

#### 任务 1.3: 移除 ChunkPreview 的假数据

**文件**: `src/components/knowledge/ChunkPreview.tsx`

- 删除 `generateMockTags()` 函数和 `Math.random()` 语义权重
- 直接使用数据库中切片的真实 `metadata` 和 `token_count`
- 移除假的"语义权重"进度条（此数据不存在于数据库中）
- 改为显示切片的实际信息：chunk_index、token_count、内容预览

### 第二阶段：补齐核心功能（P1）

#### 任务 2.1: 添加文本粘贴输入方式

**文件**: `src/components/knowledge/DocumentUploader.tsx`

- 在拖拽上传区域下方添加 Tabs 切换：`文件上传 | 文本输入`
- 文本输入模式：textarea + 文档名称 input
- 调用 `createDocument({ source_type: "paste", content: text, name: "..." })`
- 粘贴的文本直接存入 `content` 字段，无需 Storage

#### 任务 2.2: 添加 URL 导入功能

**文件**: `src/components/knowledge/DocumentUploader.tsx`

- 在 Tabs 中添加第三项：`URL 导入`
- 输入 URL → 调用新的 edge function `kb-url-fetch` 抓取网页内容
- 返回纯文本内容后按标准流程创建文档

**新文件**: `supabase/functions/kb-url-fetch/index.ts`

- 接收 URL 参数
- 使用 `fetch` 获取 HTML
- 提取正文文本（去除导航、脚本等）
- 返回清洗后的文本内容

#### 任务 2.3: 改进 PDF 解析 — 使用 AI 多页解析

**文件**: `supabase/functions/rag-ingest/index.ts`, `supabase/functions/_shared/embed-with-gateway.ts`

- 将 AI PDF 解析大小限制从 3MB 提升到 10MB
- 对超大 PDF 采用分页策略：将 PDF 拆分为多个小段发送给 AI
- 对于纯图片 PDF，使用 `google/gemini-2.5-flash`（支持 PDF 原生输入）进行 OCR
- 提升 `MAX_PROCESSABLE_SIZE` 从 5MB 到 15MB

#### 任务 2.4: 实现检索测试面板（Hit Testing）

**新文件**: `src/components/knowledge/RetrievalTest.tsx`

- 在知识库详情的 Tabs 中添加"检索测试"标签页
- 输入测试问题 → 调用 `rag-query` edge function
- 显示返回的切片列表，包含：
  - 相似度分数（百分比 + 颜色条）
  - 切片内容预览
  - 所属文档名称
  - chunk_index
- 支持调整 topK 和 threshold 参数

**修改文件**: `src/components/knowledge/KnowledgeBaseDetail.tsx`

- 在 TabsList 中添加"检索测试"TabsTrigger

#### 任务 2.5: 文档状态实时订阅

**数据库迁移**: 启用 `knowledge_documents` 表的 Realtime

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE public.knowledge_documents;
```

**文件**: `src/hooks/useKnowledgeDocuments.ts`

- 添加 `useDocumentRealtimeUpdates(knowledgeBaseId)` hook
- 订阅 `knowledge_documents` 表的 postgres_changes 事件
- 当状态从 `processing` 变为 `indexed` 或 `failed` 时自动刷新缓存

### 第三阶段：体验优化（P2）

#### 任务 3.1: 配置变更后自动重索引提示

**文件**: `src/components/knowledge/EditKnowledgeBaseDialog.tsx`

- 当 chunk_size 或 chunk_overlap 被修改时，显示警告："更改分块参数将导致所有文档重新索引"
- 确认后触发所有文档的 re-ingest

#### 任务 3.2: 批量操作支持

**文件**: `src/components/knowledge/DocumentList.tsx`

- 添加多选 checkbox
- 底部浮动操作栏：批量删除、批量重新索引
- 全选/取消全选

---

## 技术细节

### 涉及的文件变更总览

| 文件 | 操作 | 优先级 |
|------|------|--------|
| `src/components/knowledge/DocumentUploader.tsx` | 重构：修复上传流程 + 添加文本/URL 输入 | P0+P1 |
| `src/components/knowledge/DocumentProcessingProgress.tsx` | 重写：替换模拟为真实状态 | P0 |
| `src/components/knowledge/ChunkPreview.tsx` | 修复：移除假数据 | P0 |
| `src/components/knowledge/DocumentList.tsx` | 增强：Realtime + 批量操作 | P1+P2 |
| `src/components/knowledge/KnowledgeBaseDetail.tsx` | 增强：添加检索测试 Tab | P1 |
| `src/components/knowledge/RetrievalTest.tsx` | **新建**：检索测试面板 | P1 |
| `src/hooks/useKnowledgeDocuments.ts` | 增强：Realtime 订阅 | P1 |
| `supabase/functions/rag-ingest/index.ts` | 修复：提升文件大小限制 + PDF 解析 | P1 |
| `supabase/functions/_shared/embed-with-gateway.ts` | 修复：提升 AI 解析限制 | P1 |
| `supabase/functions/kb-url-fetch/index.ts` | **新建**：URL 内容抓取 | P1 |
| `src/components/knowledge/EditKnowledgeBaseDialog.tsx` | 增强：重索引提示 | P2 |

### 数据库迁移

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE public.knowledge_documents;
```

### 不涉及的更改
- 不修改数据库表结构（现有 schema 足够）
- 不修改 `supabase/config.toml` 或 `client.ts`
- 不引入新的 npm 依赖

### 建议实施顺序
1. 先实施 P0（任务 1.1-1.3），立即修复"系统根本不工作"的问题
2. 再实施 P1 的核心功能（2.1, 2.4, 2.5），达到基本可用
3. 最后实施 P1 剩余（2.2, 2.3）和 P2，达到生产就绪

