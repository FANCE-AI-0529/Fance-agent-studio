import { useState, useCallback } from "react";
import { Upload, FileText, File, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useCreateDocument, useIngestDocument } from "@/hooks/useKnowledgeDocuments";
import { useKnowledgeStore } from "@/stores/knowledgeStore";
import { toast } from "sonner";

interface DocumentUploaderProps {
  knowledgeBaseId: string;
}

const ACCEPTED_TYPES = [
  "application/pdf",
  "text/plain",
  "text/markdown",
  "application/json",
];

const ACCEPTED_EXTENSIONS = [".pdf", ".txt", ".md", ".json"];

export function DocumentUploader({ knowledgeBaseId }: DocumentUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<
    { id: string; name: string; progress: number; status: string }[]
  >([]);

  const createDocument = useCreateDocument();
  const ingestDocument = useIngestDocument();
  const { setUploading, setUploadProgress } = useKnowledgeStore();

  const validateFile = (file: File): boolean => {
    const maxSize = 20 * 1024 * 1024; // 20MB
    if (file.size > maxSize) {
      toast.error(`文件 "${file.name}" 超过 20MB 限制`);
      return false;
    }

    const extension = "." + file.name.split(".").pop()?.toLowerCase();
    if (!ACCEPTED_EXTENSIONS.includes(extension) && !ACCEPTED_TYPES.includes(file.type)) {
      toast.error(`不支持的文件类型: ${file.name}`);
      return false;
    }

    return true;
  };

  const readFileContent = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsText(file);
    });
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
          // Simulate upload progress
          for (let i = 0; i <= 100; i += 20) {
            setUploadingFiles((prev) =>
              prev.map((f) =>
                f.id === fileId ? { ...f, progress: i } : f
              )
            );
            await new Promise((r) => setTimeout(r, 100));
          }

          // Read file content for text files
          let content: string | undefined;
          const extension = file.name.split(".").pop()?.toLowerCase();
          if (["txt", "md", "json"].includes(extension || "")) {
            content = await readFileContent(file);
          }

          setUploadingFiles((prev) =>
            prev.map((f) =>
              f.id === fileId ? { ...f, status: "创建文档" } : f
            )
          );

          // Create document record
          const doc = await createDocument.mutateAsync({
            knowledge_base_id: knowledgeBaseId,
            name: file.name,
            source_type: "upload",
            content,
            file_size: file.size,
            mime_type: file.type || `text/${extension}`,
          });

          setUploadingFiles((prev) =>
            prev.map((f) =>
              f.id === fileId ? { ...f, status: "索引中" } : f
            )
          );

          // Trigger ingestion
          await ingestDocument.mutateAsync(doc.id);

          setUploadingFiles((prev) =>
            prev.map((f) =>
              f.id === fileId ? { ...f, progress: 100, status: "完成" } : f
            )
          );

          // Remove from list after delay
          setTimeout(() => {
            setUploadingFiles((prev) => prev.filter((f) => f.id !== fileId));
          }, 2000);

        } catch (error) {
          setUploadingFiles((prev) =>
            prev.map((f) =>
              f.id === fileId ? { ...f, status: "失败" } : f
            )
          );
        }
      }

      setUploading(false);
    },
    [knowledgeBaseId, createDocument, ingestDocument, setUploading]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        handleFiles(e.target.files);
      }
    },
    [handleFiles]
  );

  return (
    <div className="space-y-3">
      {/* Drop Zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={cn(
          "relative border-2 border-dashed rounded-xl p-6 transition-all text-center",
          isDragging
            ? "border-primary bg-primary/5"
            : "border-border hover:border-muted-foreground/50"
        )}
      >
        <input
          type="file"
          multiple
          accept={ACCEPTED_EXTENSIONS.join(",")}
          onChange={handleInputChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        <div className="flex flex-col items-center gap-2">
          <div
            className={cn(
              "w-12 h-12 rounded-xl flex items-center justify-center transition-colors",
              isDragging ? "bg-primary/20" : "bg-muted"
            )}
          >
            <Upload
              className={cn(
                "h-6 w-6 transition-colors",
                isDragging ? "text-primary" : "text-muted-foreground"
              )}
            />
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

      {/* Upload Progress List */}
      {uploadingFiles.length > 0 && (
        <div className="space-y-2">
          {uploadingFiles.map((file) => (
            <div
              key={file.id}
              className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border border-border"
            >
              <File className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium truncate">{file.name}</span>
                  <span className="text-xs text-muted-foreground">{file.status}</span>
                </div>
                <Progress value={file.progress} className="h-1.5" />
              </div>
              {file.status === "完成" && (
                <span className="text-status-executing text-xs">✓</span>
              )}
              {file.status === "失败" && (
                <span className="text-destructive text-xs">✗</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
