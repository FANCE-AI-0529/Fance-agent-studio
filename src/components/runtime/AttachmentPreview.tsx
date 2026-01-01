import React from 'react';
import { X, FileText, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { UploadedFile } from '@/hooks/useFileUpload';

interface AttachmentPreviewProps {
  files: UploadedFile[];
  onRemove: (fileId: string) => void;
  isUploading?: boolean;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1024 / 1024).toFixed(1) + ' MB';
}

export function AttachmentPreview({
  files,
  onRemove,
  isUploading = false,
}: AttachmentPreviewProps) {
  if (files.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 p-2 border-b border-border/50 bg-muted/30">
      {files.map((file) => (
        <div
          key={file.id}
          className="relative group flex items-center gap-2 px-3 py-2 bg-background rounded-lg border border-border/50 shadow-sm"
        >
          {file.type === 'image' ? (
            <div className="relative w-12 h-12 rounded overflow-hidden bg-muted">
              <img
                src={file.preview}
                alt={file.name}
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className="w-12 h-12 rounded bg-muted flex items-center justify-center">
              <FileText className="h-6 w-6 text-muted-foreground" />
            </div>
          )}

          <div className="flex flex-col min-w-0 max-w-[120px]">
            <span className="text-sm font-medium truncate">{file.name}</span>
            <span className="text-xs text-muted-foreground">
              {formatFileSize(file.size)}
            </span>
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-destructive text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={() => onRemove(file.id)}
            disabled={isUploading}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      ))}

      {isUploading && (
        <div className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground">
          <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
          处理中...
        </div>
      )}
    </div>
  );
}
