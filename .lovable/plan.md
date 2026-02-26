

# 为文档列表添加原始文件预览功能

## 现状分析

- `DocumentPreview.tsx` 已完整实现，支持 PDF（iframe）、图片（缩放/旋转）、文本文件预览
- `DocumentList.tsx` 当前 `Eye` 按钮只做"查看切片"（`setSelectedDocument`），没有原始文件预览
- 文件存储在 `knowledge-documents` bucket（**私有 bucket**），需要用 `createSignedUrl` 生成临时访问链接
- 文档记录中有 `file_path`、`mime_type` 字段可用于定位文件和判断预览类型

## 实施方案

### 修改 1: `DocumentList.tsx` — 添加预览按钮和预览弹窗

- 在每个文档操作区域新增一个 `FileSearch`（预览原文）按钮，与现有 `Eye`（查看切片）按钮并列
- 条件：文档有 `file_path` 时显示（无论状态）
- 点击后：
  1. 调用 `supabase.storage.from('knowledge-documents').createSignedUrl(doc.file_path, 3600)` 生成 1 小时有效的签名 URL
  2. 将签名 URL、文件名、MIME 类型存入组件 state
  3. 打开 `Dialog` 弹窗渲染 `DocumentPreview` 组件
- 添加 loading 状态防止重复点击

### 修改 2: 状态管理

在 `DocumentList` 组件内添加局部 state：

```ts
const [previewDoc, setPreviewDoc] = useState<{
  url: string;
  fileName: string;
  mimeType: string;
} | null>(null);
```

- 打开预览时设置 `previewDoc`
- 关闭弹窗时设为 `null`

### 修改 3: 预览弹窗渲染

在组件底部添加 `Dialog`：

```tsx
<Dialog open={!!previewDoc} onOpenChange={(open) => !open && setPreviewDoc(null)}>
  <DialogContent className="max-w-4xl max-h-[85vh] p-0">
    <DocumentPreview
      url={previewDoc.url}
      fileName={previewDoc.fileName}
      mimeType={previewDoc.mimeType}
      onClose={() => setPreviewDoc(null)}
    />
  </DialogContent>
</Dialog>
```

### 技术细节

| 项目 | 说明 |
|------|------|
| bucket 权限 | 私有 bucket，使用 `createSignedUrl` 生成临时链接 |
| 签名有效期 | 3600 秒（1 小时） |
| 支持的文件类型 | PDF、图片（jpg/png/webp）、文本（txt/md/json/csv）|
| 不可预览文件 | `DocumentPreview` 内置 `UnsupportedPreview` 兜底 |
| 新增依赖 | 无，所有组件已存在 |

### 涉及文件

| 文件 | 操作 |
|------|------|
| `src/components/knowledge/DocumentList.tsx` | 添加预览按钮 + Dialog + 签名 URL 逻辑 |

无需数据库迁移，无需新建文件。

