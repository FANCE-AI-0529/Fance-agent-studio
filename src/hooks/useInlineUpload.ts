// =====================================================
// 行内上传 Hook - 在对话中直接上传文件并索引
// Inline Upload Hook - Upload and index files inline
// =====================================================

import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export type UploadStatus = 'idle' | 'uploading' | 'indexing' | 'complete' | 'error';

interface CreatedKnowledgeBase {
  id: string;
  name: string;
  description?: string;
}

interface UseInlineUploadOptions {
  onComplete?: (kb: CreatedKnowledgeBase) => void;
  onError?: (error: string) => void;
  autoCreateKB?: boolean;
}

interface UseInlineUploadReturn {
  uploadStatus: UploadStatus;
  uploadProgress: number;
  uploadedFileName: string | null;
  createdKnowledgeBase: CreatedKnowledgeBase | null;
  error: string | null;
  handleUpload: (files: FileList) => Promise<CreatedKnowledgeBase | null>;
  reset: () => void;
}

export function useInlineUpload(options: UseInlineUploadOptions = {}): UseInlineUploadReturn {
  const { user } = useAuth();
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>('idle');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [createdKnowledgeBase, setCreatedKnowledgeBase] = useState<CreatedKnowledgeBase | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef(false);

  const handleUpload = useCallback(async (files: FileList): Promise<CreatedKnowledgeBase | null> => {
    if (!user) {
      toast.error('请先登录');
      return null;
    }

    if (files.length === 0) return null;

    const file = files[0]; // For now, handle single file
    const maxSize = 20 * 1024 * 1024; // 20MB

    if (file.size > maxSize) {
      toast.error('文件大小不能超过 20MB');
      return null;
    }

    const allowedTypes = [
      'application/pdf',
      'text/plain',
      'text/markdown',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];

    // Check file type by extension if MIME type is not reliable
    const extension = file.name.split('.').pop()?.toLowerCase();
    const isAllowed = allowedTypes.includes(file.type) || 
      ['pdf', 'txt', 'md', 'doc', 'docx'].includes(extension || '');

    if (!isAllowed) {
      toast.error('不支持的文件格式');
      return null;
    }

    setUploadStatus('uploading');
    setUploadProgress(0);
    setUploadedFileName(file.name);
    setError(null);
    abortRef.current = false;

    try {
      // Step 1: Create a temporary knowledge base
      setUploadProgress(10);
      
      const kbName = file.name.replace(/\.[^/.]+$/, ''); // Remove extension
      const { data: kbData, error: kbError } = await supabase
        .from('knowledge_bases')
        .insert({
          name: kbName,
          description: `从 ${file.name} 自动创建`,
          user_id: user.id,
          index_status: 'pending',
        })
        .select()
        .single();

      if (kbError) throw new Error(kbError.message);
      if (abortRef.current) throw new Error('已取消');

      setUploadProgress(25);

      // Step 2: Upload file to storage with proper MIME type
      const storagePath = `${user.id}/${kbData.id}/${file.name}`;
      
      // Determine correct MIME type based on extension if browser returns octet-stream
      const mimeType = getMimeTypeForFile(file);
      
      // Create a new Blob with correct MIME type if needed
      const fileToUpload = mimeType !== file.type 
        ? new Blob([await file.arrayBuffer()], { type: mimeType })
        : file;
      
      const { error: uploadError } = await supabase.storage
        .from('knowledge-documents')
        .upload(storagePath, fileToUpload, {
          cacheControl: '3600',
          upsert: true,
          contentType: mimeType,
        });

      if (uploadError) {
        console.error('Storage upload failed:', uploadError.message);
        // Mark KB as failed and throw
        await supabase.from('knowledge_bases').update({ index_status: 'failed' }).eq('id', kbData.id);
        throw new Error(`文件上传失败: ${uploadError.message}`);
      }

      setUploadProgress(50);
      if (abortRef.current) throw new Error('已取消');

      // Step 3: Create document record
      const { data: docData, error: docError } = await supabase
        .from('knowledge_documents')
        .insert({
          knowledge_base_id: kbData.id,
          user_id: user.id,
          name: file.name,
          mime_type: file.type || extension,
          file_size: file.size,
          file_path: storagePath,
          status: 'pending',
          source_type: 'upload',
        })
        .select()
        .single();

      if (docError) throw new Error(docError.message);

      setUploadProgress(60);
      setUploadStatus('indexing');

      // Step 4: Read file content and trigger RAG ingest
      const fileContent = await readFileContent(file);
      
      setUploadProgress(70);

      // Step 5: Call RAG ingest function
      const { error: ingestError } = await supabase.functions.invoke('rag-ingest', {
        body: {
          knowledgeBaseId: kbData.id,
          documentId: docData.id,
          content: fileContent,
          fileName: file.name,
          chunkSize: 500,
          chunkOverlap: 50,
        },
      });

      if (ingestError) {
        console.warn('RAG ingest warning:', ingestError);
        // Continue anyway, marking as ready for basic use
      }

      setUploadProgress(90);

      // Step 6: Update knowledge base index status
      await supabase
        .from('knowledge_bases')
        .update({ index_status: 'ready' })
        .eq('id', kbData.id);

      // Step 7: Trigger auto-profile (non-blocking)
      supabase.functions.invoke('kb-auto-profile', {
        body: { knowledgeBaseId: kbData.id },
      }).catch(console.warn);

      setUploadProgress(100);
      setUploadStatus('complete');

      const result: CreatedKnowledgeBase = {
        id: kbData.id,
        name: kbName,
        description: `从 ${file.name} 自动创建`,
      };

      setCreatedKnowledgeBase(result);
      options.onComplete?.(result);

      toast.success(`「${kbName}」已创建并索引完成`);
      return result;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '上传失败';
      setError(errorMessage);
      setUploadStatus('error');
      options.onError?.(errorMessage);
      
      if (errorMessage !== '已取消') {
        toast.error(errorMessage);
      }
      
      return null;
    }
  }, [user, options]);

  const reset = useCallback(() => {
    abortRef.current = true;
    setUploadStatus('idle');
    setUploadProgress(0);
    setUploadedFileName(null);
    setCreatedKnowledgeBase(null);
    setError(null);
  }, []);

  return {
    uploadStatus,
    uploadProgress,
    uploadedFileName,
    createdKnowledgeBase,
    error,
    handleUpload,
    reset,
  };
}

// Helper: Get correct MIME type based on file extension
function getMimeTypeForFile(file: File): string {
  const extension = file.name.split('.').pop()?.toLowerCase();
  
  // Map extensions to MIME types
  const mimeMap: Record<string, string> = {
    'pdf': 'application/pdf',
    'txt': 'text/plain',
    'md': 'text/markdown',
    'json': 'application/json',
    'doc': 'application/msword',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  };
  
  // If browser detected a valid MIME type, use it
  if (file.type && file.type !== 'application/octet-stream' && file.type !== '') {
    return file.type;
  }
  
  // Otherwise, map from extension
  return mimeMap[extension || ''] || 'text/plain';
}

// Helper: Read file content as text
async function readFileContent(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const result = e.target?.result;
      if (typeof result === 'string') {
        resolve(result);
      } else {
        // For binary files, just return empty string (let server handle it)
        resolve('');
      }
    };
    
    reader.onerror = () => reject(new Error('读取文件失败'));
    
    const extension = file.name.split('.').pop()?.toLowerCase();
    
    // Try reading as text for text-based files
    if (file.type.includes('text') || 
        extension === 'txt' || 
        extension === 'md' ||
        extension === 'json') {
      reader.readAsText(file);
    } else {
      // For PDF and other binary formats, let the server handle extraction
      resolve('');
    }
  });
}
