

# 知识库模块后端全面审计报告与优化方案

## 审计摘要

经过对数据库结构、RLS 策略、Edge Functions、前端 Hooks 和上传流程的逐一排查，我发现了 **3 个严重问题**、**5 个中等问题** 和 **4 个优化建议**。以下按严重程度排列。

---

## 一、严重问题 (必须修复)

### P0-1: `embed-text` Edge Function 使用假向量 (MOCK)

**现状**: `supabase/functions/embed-text/index.ts` 中的 `generateMockEmbedding()` 函数生成的是基于字符哈希的伪向量，而非真实语义向量。任何通过此函数生成的 embedding 都不具备语义搜索能力。

**影响**: 如果任何调用方使用了此函数（而非 `_shared/embed-with-gateway.ts`），向量检索结果将完全不可靠。

**修复方案**: 将 `embed-text` 改为调用 `_shared/embed-with-gateway.ts` 中的 `generateEmbedding` / `generateBatchEmbeddings`，统一使用真实 Embedding API。

---

### P0-2: `rag-ingest` 中 chunk 逐条插入，无事务保护

**现状**: `rag-ingest/index.ts` 第 469-488 行，每个 chunk 都单独执行一次 `INSERT`。如果中途失败（例如第 5 个 chunk 出错），前 4 个 chunk 已写入数据库，但文档状态被标记为 `failed`，造成**脏数据**残留。

**影响**: 部分索引的文档在重新索引时虽然会先删除旧 chunks（第 445-448 行），但如果用户不手动重试，数据库中就会残留不完整的 chunks。

**修复方案**: 
- 将批次 INSERT 改为 `supabase.from("document_chunks").insert(batchRecords)`，一次插入整个批次
- 在 `catch` 块中添加 `DELETE FROM document_chunks WHERE document_id = ?` 清理失败数据

---

### P0-3: `graph-extract` SQL 注入风险

**现状**: `graph-search/index.ts` 第 108 行：
```ts
.or(`name.ilike.%${query}%,description.ilike.%${query}%`)
```
用户输入的 `query` 直接拼接进 PostgREST 过滤器字符串，可被恶意构造的查询字符串利用。

**修复方案**: 对 `query` 做严格清理，移除 `%`, `,`, `.`, `(`, `)` 等 PostgREST 特殊字符，或改用参数化 RPC 函数进行关键词搜索。

---

## 二、中等问题

### P1-1: `graph-extract` 只处理前 10 个 chunks

**现状**: `graph-extract/index.ts` 第 92-95 行硬编码 `.slice(0, 10)`，大型知识库的大部分内容被忽略。

**修复方案**: 实现分批处理逻辑 — 每批 10 个 chunks 调用 AI 提取，合并去重后写入。添加参数控制批次上限。

### P1-2: `graph-extract` 节点更新使用了无效的 RPC

**现状**: 第 214-215 行调用了 `supabase.rpc("increment", { x: 1 })`，但数据库中不存在 `increment` 函数。这意味着已存在节点的 `occurrence_count` 不会被更新，而是静默失败。

**修复方案**: 改为直接 SQL 更新：
```ts
.update({ occurrence_count: existing.occurrence_count + 1 })
```
或创建对应的数据库函数。

### P1-3: 无级联删除 Storage 文件

**现状**: 删除文档时只删除数据库记录（`knowledge_documents` 有 CASCADE 到 `document_chunks`），但 Storage bucket 中的实际文件不会被清理。

**修复方案**: 在 `useDeleteDocument` hook 中增加 Storage 文件删除逻辑：
```ts
await supabase.storage.from('knowledge-documents').remove([doc.file_path]);
```

### P1-4: `document_chunks` 缺少 `UPDATE` RLS 策略

**现状**: 五张核心表中，`document_chunks` 没有 UPDATE 策略。虽然当前代码没有直接 UPDATE chunks 的操作，但如果未来需要更新 chunk 内容或元数据，操作会被 RLS 阻止。

**修复方案**: 添加 UPDATE 策略保持一致性：
```sql
CREATE POLICY "Users can update their own chunks" ON public.document_chunks 
FOR UPDATE USING (auth.uid() = user_id);
```

### P1-5: `rag-ingest` 使用 Service Role Key 写入 chunks

**现状**: `rag-ingest` 使用 `SUPABASE_SERVICE_ROLE_KEY` 创建客户端来写入 chunks，这绕过了 RLS。虽然先用 anon key 验证了用户身份，但后续所有写操作都使用 service role，意味着理论上可以写入任意 `user_id` 的数据。

**修复方案**: 确保 INSERT 时 `user_id` 严格使用已验证的 `user.id`（当前代码已这样做，但应添加防御性校验）。或改用带用户 token 的客户端执行写操作。

---

## 三、优化建议

### P2-1: 上传进度条是模拟的

**现状**: `DocumentUploader.tsx` 第 131-138 行使用 `setTimeout` 模拟上传进度（每 100ms 增加 20%），实际上传在另一个步骤中同步完成。用户看到的进度不反映真实状态。

**优化方案**: 使用 `XMLHttpRequest` 或 tus 协议获取真实上传进度，或改为三阶段状态指示器（上传中 → 解析中 → 索引中）。

### P2-2: 缺少文档重复上传检测

**现状**: 同一个知识库可以多次上传同名文件，Storage 使用 `upsert: true` 覆盖文件，但会创建多条文档记录。

**优化方案**: 在创建文档前检查是否已存在同名文档，提示用户选择覆盖或跳过。

### P2-3: 知识库删除时缺少 Storage 批量清理

**现状**: 删除知识库时，CASCADE 删除了所有文档和 chunks 记录，但 Storage 中对应目录 `{user_id}/{kb_id}/` 下的所有文件不会被清理。

**优化方案**: 在 `useDeleteKnowledgeBase` 中添加 Storage 目录清理：
```ts
const { data: files } = await supabase.storage.from('knowledge-documents')
  .list(`${user.id}/${knowledgeBaseId}`);
if (files?.length) {
  await supabase.storage.from('knowledge-documents')
    .remove(files.map(f => `${user.id}/${knowledgeBaseId}/${f.name}`));
}
```

### P2-4: `graph-search` 中 Edge 查询使用字符串拼接 `IN`

**现状**: `graph-search/index.ts` 第 150 行：
```ts
.or(`source_node_id.in.(${allNodeIds.join(",")}),target_node_id.in.(${allNodeIds.join(",")})`)
```
当节点数量很大时，这个 URL 可能超出 HTTP 请求长度限制。

**优化方案**: 改用 RPC 函数传递 UUID 数组参数，避免 URL 长度问题。

---

## 四、实施优先级

```text
优先级    问题编号    预估工时    风险等级
────────────────────────────────────────
立即修复   P0-1       30min      🔴 数据可靠性
立即修复   P0-2       30min      🔴 数据一致性
立即修复   P0-3       15min      🔴 安全漏洞
尽快修复   P1-1       1h         🟡 功能完整性
尽快修复   P1-2       15min      🟡 静默失败
尽快修复   P1-3       30min      🟡 资源泄漏
计划修复   P1-4       10min      🟡 防御性
计划修复   P1-5       30min      🟡 安全加固
优化       P2-1~4     2h         🟢 体验与健壮性
```

---

## 五、数据库与索引评估

**正面发现**（无需修改）：
- 全部 5 张表均已启用 RLS ✅
- RLS 策略完整覆盖 CRUD 操作 ✅
- 向量列（`embedding`）使用 IVFFlat 索引 ✅
- 外键设置了 CASCADE DELETE（知识库→文档→chunks、节点→边）✅
- 文档/节点/边的计数器触发器已正确配置 ✅
- `match_document_chunks` 和 `traverse_knowledge_graph` 函数使用 SECURITY DEFINER + SET search_path ✅

**总结**: 数据库层面的架构设计是合理的，主要问题集中在 Edge Functions 的实现质量和前端资源清理逻辑上。修复上述 P0/P1 问题后，知识库模块即可达到生产可用标准。

