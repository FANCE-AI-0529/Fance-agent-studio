import { useState, useCallback } from "react";
import { Upload, FileText, File, Loader2, X, Link, Type } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCreateDocument, useIngestDocument } from "@/hooks/useKnowledgeDocuments";
import { useKnowledgeStore } from "@/stores/knowledgeStore";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface DocumentUploaderProps {
  knowledgeBaseId: string;
}

const ACCEPTED_EXTENSIONS = [".pdf", ".txt", ".md", ".json"];

/**
 * 将文件名转换为 Storage 安全路径
 * Supabase Storage 不支持中文等非 ASCII 字符作为 key
 * 使用 UUID 前缀 + 原始扩展名确保唯一且安全
 */
function sanitizeFileName(originalName: string): string {
  const extension = originalName.split('.').pop()?.toLowerCase() || 'bin';
  // 使用 UUID 作为文件名，附带原始扩展名
  const safeId = crypto.randomUUID().slice(0, 12);
  return `${safeId}.${extension}`;
}

function getMimeTypeForFile(file: File): string {
  const extension = file.name.split('.').pop()?.toLowerCase();
  const mimeMap: Record<string, string> = {
    'pdf': 'application/pdf',
    'txt': 'text/plain',
    'md': 'text/markdown',
    'json': 'application/json',
  };
  if (file.type && file.type !== 'application/octet-stream' && file.type !== '') {
    return file.type;
  }
  return mimeMap[extension || ''] || 'text/plain';
}

export function DocumentUploader({ knowledgeBaseId }: DocumentUploaderProps) {
  const { user } = useAuth();
  const [isDragging, setIsDragging] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<
    { id: string; name: string; progress: number; status: string }[]
  >([]);
  const [pasteTitle, setPasteTitle] = useState("");
  const [pasteContent, setPasteContent] = useState("");
  const [pasteLoading, setPasteLoading] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [urlLoading, setUrlLoading] = useState(false);

  const createDocument = useCreateDocument();
  const ingestDocument = useIngestDocument();
  const { setUploading } = useKnowledgeStore();

  const validateFile = (file: File): boolean => {
    const maxSize = 20 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error(`文件 "${file.name}" 超过 20MB 限制`);
      return false;
    }
    const extension = "." + file.name.split(".").pop()?.toLowerCase();
    if (!ACCEPTED_EXTENSIONS.includes(extension)) {
      toast.error(`不支持的文件类型: ${file.name}`);
      return false;
    }
    return true;
  };

  const readFileContent = async (file: File): Promise<string> => {
    const extension = file.name.split(".").pop()?.toLowerCase();
    if (!["txt", "md", "json"].includes(extension || "")) return "";
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsText(file);
    });
  };

  const uploadFileToStorage = async (file: File, retries = 2): Promise<string> => {
    if (!user) throw new Error("用户未登录");
    const safeFileName = sanitizeFileName(file.name);
    const storagePath = `${user.id}/${knowledgeBaseId}/${safeFileName}`;
    const mimeType = getMimeTypeForFile(file);
    const fileToUpload = mimeType !== file.type
      ? new Blob([await file.arrayBuffer()], { type: mimeType })
      : file;

    for (let attempt = 0; attempt <= retries; attempt++) {
      const { error } = await supabase.storage
        .from('knowledge-documents')
        .upload(storagePath, fileToUpload, {
          cacheControl: '3600',
          upsert: true,
          contentType: mimeType,
        });

      if (!error) return storagePath;
      console.error(`Storage upload attempt ${attempt + 1} failed:`, error);
      if (attempt === retries) throw new Error(`文件上传到存储失败: ${error.message}`);
    }
    throw new Error("文件上传失败");
  };

  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      const fileArray = Array.from(files).filter(validateFile);
      if (fileArray.length === 0) return;
      setUploading(true);

      for (const file of fileArray) {
        const fileId = crypto.randomUUID();
        setUploadingFiles((prev) => [
          ...prev,
          { id: fileId, name: file.name, progress: 0, status: "上传中" },
        ]);

        try {
          // Check duplicates
          const { data: existingDocs } = await supabase
            .from("knowledge_documents")
            .select("id")
            .eq("knowledge_base_id", knowledgeBaseId)
            .eq("name", file.name);
          if (existingDocs && existingDocs.length > 0) {
            toast.warning(`文件 "${file.name}" 已存在，将覆盖旧文档`);
            for (const doc of existingDocs) {
              await supabase.from("knowledge_documents").delete().eq("id", doc.id);
            }
          }

          let content: string | undefined;
          const extension = file.name.split(".").pop()?.toLowerCase();
          if (["txt", "md", "json"].includes(extension || "")) {
            content = await readFileContent(file);
          }

          setUploadingFiles((prev) =>
            prev.map((f) => f.id === fileId ? { ...f, progress: 30, status: "上传文件" } : f)
          );

          // Upload to storage - MUST succeed
          const filePath = await uploadFileToStorage(file);

          setUploadingFiles((prev) =>
            prev.map((f) => f.id === fileId ? { ...f, progress: 60, status: "创建文档" } : f)
          );

          const doc = await createDocument.mutateAsync({
            knowledge_base_id: knowledgeBaseId,
            name: file.name,
            source_type: "upload",
            content,
            file_path: filePath,
            file_size: file.size,
            mime_type: getMimeTypeForFile(file),
          });

          setUploadingFiles((prev) =>
            prev.map((f) => f.id === fileId ? { ...f, progress: 80, status: "索引中" } : f)
          );

          await ingestDocument.mutateAsync(doc.id);

          setUploadingFiles((prev) =>
            prev.map((f) => f.id === fileId ? { ...f, progress: 100, status: "完成" } : f)
          );
          setTimeout(() => {
            setUploadingFiles((prev) => prev.filter((f) => f.id !== fileId));
          }, 2000);
        } catch (error: any) {
          toast.error(error?.message || "上传失败");
          setUploadingFiles((prev) =>
            prev.map((f) => f.id === fileId ? { ...f, status: "失败" } : f)
          );
        }
      }
      setUploading(false);
    },
    [knowledgeBaseId, createDocument, ingestDocument, setUploading]
  );

  const handlePasteSubmit = async () => {
    if (!pasteTitle.trim() || !pasteContent.trim()) {
      toast.error("请输入文档名称和内容");
      return;
    }
    setPasteLoading(true);
    try {
      const doc = await createDocument.mutateAsync({
        knowledge_base_id: knowledgeBaseId,
        name: pasteTitle.trim(),
        source_type: "paste",
        content: pasteContent.trim(),
      });
      await ingestDocument.mutateAsync(doc.id);
      setPasteTitle("");
      setPasteContent("");
      toast.success("文本文档已添加并开始索引");
    } catch (error: any) {
      toast.error(error?.message || "添加失败");
    } finally {
      setPasteLoading(false);
    }
  };

  const handleUrlSubmit = async () => {
    if (!urlInput.trim()) {
      toast.error("请输入 URL");
      return;
    }
    setUrlLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("kb-url-fetch", {
        body: { url: urlInput.trim() },
      });
      if (error) throw error;
      if (!data?.content || data.content.trim().length < 10) {
        toast.error("无法从该 URL 提取有效内容");
        return;
      }
      const doc = await createDocument.mutateAsync({
        knowledge_base_id: knowledgeBaseId,
        name: data.title || urlInput.trim(),
        source_type: "url",
        source_url: urlInput.trim(),
        content: data.content,
      });
      await ingestDocument.mutateAsync(doc.id);
      setUrlInput("");
      toast.success("URL 内容已导入并开始索引");
    } catch (error: any) {
      toast.error(error?.message || "URL 导入失败");
    } finally {
      setUrlLoading(false);
    }
  };

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles]
  );

  return (
    <Tabs defaultValue="upload" className="w-full">
      <TabsList className="w-full">
        <TabsTrigger value="upload" className="flex-1 gap-1.5">
          <Upload className="h-3.5 w-3.5" />
          文件上传
        </TabsTrigger>
        <TabsTrigger value="paste" className="flex-1 gap-1.5">
          <Type className="h-3.5 w-3.5" />
          文本输入
        </TabsTrigger>
        <TabsTrigger value="url" className="flex-1 gap-1.5">
          <Link className="h-3.5 w-3.5" />
          URL 导入
        </TabsTrigger>
      </TabsList>

      <TabsContent value="upload" className="mt-3 space-y-3">
        <div
          onDrop={handleDrop}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
          className={cn(
            "relative border-2 border-dashed rounded-xl p-6 transition-all text-center",
            isDragging ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/50"
          )}
        >
          <input
            type="file"
            multiple
            accept={ACCEPTED_EXTENSIONS.join(",")}
            onChange={(e) => e.target.files && handleFiles(e.target.files)}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          <div className="flex flex-col items-center gap-2">
            <div className={cn(
              "w-12 h-12 rounded-xl flex items-center justify-center transition-colors",
              isDragging ? "bg-primary/20" : "bg-muted"
            )}>
              <Upload className={cn("h-6 w-6 transition-colors", isDragging ? "text-primary" : "text-muted-foreground")} />
            </div>
            <div>
              <p className="font-medium text-sm">
                拖拽文件到此处，或 <span className="text-primary">点击上传</span>
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                支持 PDF, Markdown, TXT, JSON（单文件最大 20MB）
              </p>
            </div>
          </div>
        </div>

        {uploadingFiles.length > 0 && (
          <div className="space-y-2">
            {uploadingFiles.map((file) => (
              <div key={file.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border border-border">
                <File className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium truncate">{file.name}</span>
                    <span className="text-xs text-muted-foreground">{file.status}</span>
                  </div>
                  <Progress value={file.progress} className="h-1.5" />
                </div>
                {file.status === "完成" && <span className="text-status-executing text-xs">✓</span>}
                {file.status === "失败" && <span className="text-destructive text-xs">✗</span>}
              </div>
            ))}
          </div>
        )}
      </TabsContent>

      <TabsContent value="paste" className="mt-3 space-y-3">
        <Input
          placeholder="文档名称 *"
          value={pasteTitle}
          onChange={(e) => setPasteTitle(e.target.value)}
        />
        <Textarea
          placeholder="粘贴文档内容..."
          value={pasteContent}
          onChange={(e) => setPasteContent(e.target.value)}
          rows={6}
          className="resize-none"
        />
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {pasteContent.length > 0 ? `${pasteContent.length} 字符` : ""}
          </span>
          <Button
            onClick={handlePasteSubmit}
            disabled={pasteLoading || !pasteTitle.trim() || !pasteContent.trim()}
            size="sm"
          >
            {pasteLoading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
            添加文档
          </Button>
        </div>
      </TabsContent>

      <TabsContent value="url" className="mt-3 space-y-3">
        <div className="flex gap-2">
          <Input
            placeholder="https://example.com/article"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            className="flex-1"
          />
          <Button
            onClick={handleUrlSubmit}
            disabled={urlLoading || !urlInput.trim()}
            size="sm"
          >
            {urlLoading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
            导入
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          输入网页 URL，系统将自动抓取并提取正文内容
        </p>
      </TabsContent>
    </Tabs>
  );
}
