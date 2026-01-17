// =====================================================
// 上传引导卡片 - 空白区时提示用户上传文件
// Upload Guide Card - Prompt user to upload when no KB matches
// =====================================================

import { useState, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { 
  Upload, 
  FileText, 
  MessageSquare, 
  Loader2, 
  CheckCircle2,
  Brain,
  File
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

interface UploadGuideCardProps {
  onUpload: (files: FileList) => Promise<any>;
  onSkip: () => void;
  uploadProgress?: number;
  uploadStatus?: 'idle' | 'uploading' | 'indexing' | 'complete' | 'error';
  uploadedFileName?: string;
  className?: string;
}

export function UploadGuideCard({
  onUpload,
  onSkip,
  uploadProgress = 0,
  uploadStatus = 'idle',
  uploadedFileName,
  className,
}: UploadGuideCardProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isSkipping, setIsSkipping] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      await onUpload(files);
    }
  }, [onUpload]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      await onUpload(files);
    }
  };

  const handleSkip = async () => {
    setIsSkipping(true);
    await new Promise(resolve => setTimeout(resolve, 200));
    onSkip();
  };

  const isProcessing = uploadStatus === 'uploading' || uploadStatus === 'indexing';
  const isComplete = uploadStatus === 'complete';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.98 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className={cn("w-full max-w-md mx-auto", className)}
    >
      <div className="bg-card/80 backdrop-blur-xl border border-border/50 rounded-2xl p-5 shadow-lg">
        {/* AI Avatar and Message */}
        <div className="flex items-start gap-3 mb-5">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
            className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/30 flex items-center justify-center flex-shrink-0"
          >
            <Brain className="h-5 w-5 text-primary" />
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15 }}
            className="flex-1"
          >
            <p className="text-sm text-foreground leading-relaxed">
              我没有找到相关资料。您可以直接把文件拖给我，我立马学习！
            </p>
          </motion.div>
        </div>

        {/* Upload Zone */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className={cn(
            "relative border-2 border-dashed rounded-xl p-6 mb-4 transition-all duration-200",
            isDragging 
              ? "border-primary bg-primary/5" 
              : "border-border/50 hover:border-primary/40 hover:bg-muted/30",
            isProcessing && "pointer-events-none",
            isComplete && "border-green-500/50 bg-green-500/5"
          )}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept=".pdf,.md,.txt,.doc,.docx"
            onChange={handleFileSelect}
            disabled={isProcessing || isComplete}
          />

          <div className="flex flex-col items-center text-center">
            {isComplete ? (
              // Complete state
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200 }}
              >
                <CheckCircle2 className="h-10 w-10 text-green-500 mb-3" />
              </motion.div>
            ) : isProcessing ? (
              // Processing state
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="mb-3"
              >
                <Loader2 className="h-10 w-10 text-primary" />
              </motion.div>
            ) : (
              // Idle state
              <motion.div
                animate={isDragging ? { scale: 1.1, y: -5 } : { scale: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 300 }}
                className="mb-3"
              >
                <Upload className={cn(
                  "h-10 w-10 transition-colors",
                  isDragging ? "text-primary" : "text-muted-foreground"
                )} />
              </motion.div>
            )}

            {isComplete ? (
              <div className="flex items-center gap-2">
                <File className="h-4 w-4 text-green-500" />
                <span className="text-sm font-medium text-green-500">
                  {uploadedFileName || "文件已上传"}
                </span>
              </div>
            ) : isProcessing ? (
              <>
                <p className="text-sm font-medium text-primary mb-2">
                  {uploadStatus === 'uploading' 
                    ? '正在上传...' 
                    : uploadProgress < 80 
                      ? '正在学习文件内容 (AI 向量化中)...'
                      : '即将完成索引...'}
                </p>
                <Progress value={uploadProgress} className="w-full max-w-[200px] h-1.5" />
                <p className="text-xs text-muted-foreground mt-1.5">
                  {uploadProgress}%
                </p>
              </>
            ) : (
              <>
                <p className={cn(
                  "text-sm font-medium mb-1 transition-colors",
                  isDragging ? "text-primary" : "text-foreground"
                )}>
                  {isDragging ? "松开即可上传" : "拖拽文件到此处"}
                </p>
                <p className="text-xs text-muted-foreground mb-3">
                  或点击选择文件
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs"
                >
                  <FileText className="h-3.5 w-3.5 mr-1.5" />
                  选择文件
                </Button>
                <p className="text-xs text-muted-foreground/60 mt-3">
                  支持 PDF, Markdown, TXT（最大 20MB）
                </p>
              </>
            )}
          </div>
        </motion.div>

        {/* Alternative Actions */}
        {!isProcessing && !isComplete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="flex flex-col gap-2"
          >
            <p className="text-xs text-muted-foreground text-center mb-1">
              或者：
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSkip}
                disabled={isSkipping}
                className="flex-1 text-muted-foreground hover:text-foreground"
              >
                <MessageSquare className="h-3.5 w-3.5 mr-1.5" />
                使用纯对话模式
              </Button>
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
