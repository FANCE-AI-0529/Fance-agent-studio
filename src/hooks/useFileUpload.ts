import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface UploadedFile {
  id: string;
  file: File;
  preview: string;
  type: 'image' | 'document';
  name: string;
  size: number;
  mimeType: string;
}

interface UseFileUploadOptions {
  maxFileSize?: number; // in bytes
  maxFiles?: number;
  allowedTypes?: string[];
}

const DEFAULT_MAX_SIZE = 10 * 1024 * 1024; // 10MB
const DEFAULT_MAX_FILES = 5;
const DEFAULT_ALLOWED_TYPES = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
  'application/pdf',
  'text/plain',
  'text/markdown',
];

export function useFileUpload(options: UseFileUploadOptions = {}) {
  const {
    maxFileSize = DEFAULT_MAX_SIZE,
    maxFiles = DEFAULT_MAX_FILES,
    allowedTypes = DEFAULT_ALLOWED_TYPES,
  } = options;

  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  const fileToBase64 = useCallback((file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }, []);

  const validateFile = useCallback((file: File): string | null => {
    // File size limit
    if (file.size > maxFileSize) {
      return `文件 "${file.name}" (${(file.size / 1024 / 1024).toFixed(2)}MB) 超过最大限制 ${Math.round(maxFileSize / 1024 / 1024)}MB`;
    }
    
    // File type whitelist
    if (!allowedTypes.includes(file.type)) {
      return `不支持的文件类型: ${file.type || '未知类型'}`;
    }
    
    // Filename length check
    if (file.name.length > 255) {
      return '文件名过长';
    }
    
    // Dangerous file extension check
    const dangerousExtensions = ['.exe', '.bat', '.sh', '.ps1', '.cmd', '.vbs', '.jar'];
    if (dangerousExtensions.some(ext => file.name.toLowerCase().endsWith(ext))) {
      return '不允许上传可执行文件';
    }
    
    return null;
  }, [maxFileSize, allowedTypes]);

  const getFileType = useCallback((mimeType: string): 'image' | 'document' => {
    return mimeType.startsWith('image/') ? 'image' : 'document';
  }, []);

  const addFiles = useCallback(async (newFiles: FileList | File[]) => {
    const fileArray = Array.from(newFiles);
    
    if (files.length + fileArray.length > maxFiles) {
      toast({
        title: "文件数量超限",
        description: `最多只能上传 ${maxFiles} 个文件`,
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);

    try {
      const processedFiles: UploadedFile[] = [];

      for (const file of fileArray) {
        const error = validateFile(file);
        if (error) {
          toast({
            title: "文件验证失败",
            description: error,
            variant: "destructive",
          });
          continue;
        }

        const preview = await fileToBase64(file);
        const uploadedFile: UploadedFile = {
          id: crypto.randomUUID(),
          file,
          preview,
          type: getFileType(file.type),
          name: file.name,
          size: file.size,
          mimeType: file.type,
        };

        processedFiles.push(uploadedFile);
      }

      setFiles(prev => [...prev, ...processedFiles]);
    } catch (error) {
      console.error('Error processing files:', error);
      toast({
        title: "处理文件失败",
        description: "请重试",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  }, [files.length, maxFiles, validateFile, fileToBase64, getFileType, toast]);

  const removeFile = useCallback((fileId: string) => {
    setFiles(prev => prev.filter(f => f.id !== fileId));
  }, []);

  const clearFiles = useCallback(() => {
    setFiles([]);
  }, []);

  // Optional: Upload to Supabase Storage for persistence
  const uploadToStorage = useCallback(async (file: UploadedFile, userId: string): Promise<string | null> => {
    try {
      const filePath = `${userId}/${file.id}-${file.name}`;
      const { data, error } = await supabase.storage
        .from('chat-attachments')
        .upload(filePath, file.file);

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from('chat-attachments')
        .getPublicUrl(data.path);

      return urlData.publicUrl;
    } catch (error) {
      console.error('Error uploading to storage:', error);
      return null;
    }
  }, []);

  return {
    files,
    isUploading,
    addFiles,
    removeFile,
    clearFiles,
    uploadToStorage,
  };
}
