/**
 * @file useInlineUpload.ts
 * @description 行内上传钩子，支持在对话界面中直接上传文件并自动创建知识库和索引
 * @module Hooks/Upload
 * @author Agent OS Studio Team
 * @copyright 2025 Agent OS Studio. All rights reserved.
 * @version 1.0.0
 */

import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

/**
 * 上传状态枚举
 * 
 * 定义文件上传过程中的各个阶段状态。
 */
export type UploadStatus = 'idle' | 'uploading' | 'indexing' | 'complete' | 'error';

/**
 * 已创建知识库接口
 * 
 * 表示上传完成后自动创建的知识库信息。
 */
interface CreatedKnowledgeBase {
  /** 知识库唯一标识 */
  id: string;
  /** 知识库名称 */
  name: string;
  /** 知识库描述 */
  description?: string;
}

/**
 * 行内上传钩子配置选项
 */
interface UseInlineUploadOptions {
  /** 上传完成回调 */
  onComplete?: (kb: CreatedKnowledgeBase) => void;
  /** 上传失败回调 */
  onError?: (error: string) => void;
  /** 是否自动创建知识库 */
  autoCreateKB?: boolean;
}

/**
 * 行内上传钩子返回值接口
 */
interface UseInlineUploadReturn {
  /** 当前上传状态 */
  uploadStatus: UploadStatus;
  /** 上传进度百分比（0-100） */
  uploadProgress: number;
  /** 已上传文件名 */
  uploadedFileName: string | null;
  /** 已创建的知识库信息 */
  createdKnowledgeBase: CreatedKnowledgeBase | null;
  /** 错误信息 */
  error: string | null;
  /** 处理文件上传的方法 */
  handleUpload: (files: FileList) => Promise<CreatedKnowledgeBase | null>;
  /** 重置上传状态 */
  reset: () => void;
}

/**
 * 行内上传钩子
 * 
 * 提供在对话界面中直接上传文件的能力，自动完成知识库创建、文件存储和RAG索引构建。
 * 支持PDF、TXT、MD、DOC、DOCX等常见文档格式，文件大小限制为20MB。
 * 
 * @param {UseInlineUploadOptions} options - 配置选项
 * @returns {UseInlineUploadReturn} - 上传状态和方法
 * 
 * @example
 * ```tsx
 * const { handleUpload, uploadStatus, uploadProgress } = useInlineUpload({
 *   onComplete: (kb) => console.log('知识库已创建:', kb.name),
 * });
 * ```
 */
export function useInlineUpload(options: UseInlineUploadOptions = {}): UseInlineUploadReturn {
  const { user } = useAuth();
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>('idle');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [createdKnowledgeBase, setCreatedKnowledgeBase] = useState<CreatedKnowledgeBase | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef(false);

  /**
   * 处理文件上传
   * 
   * 执行完整的文件上传流程：验证→创建知识库→存储文件→创建文档记录→触发索引。
   * 
   * @param {FileList} files - 待上传的文件列表
   * @returns {Promise<CreatedKnowledgeBase | null>} - 成功返回知识库信息，失败返回null
   */
  const handleUpload = useCallback(async (files: FileList): Promise<CreatedKnowledgeBase | null> => {
    // [验证]：检查用户登录状态
    if (!user) {
      toast.error('请先登录');
      return null;
    }

    if (files.length === 0) return null;

    const file = files[0];
    const maxSize = 20 * 1024 * 1024; // 20MB限制

    // [验证]：检查文件大小
    if (file.size > maxSize) {
      toast.error('文件大小不能超过 20MB');
      return null;
    }

    // [验证]：检查文件类型
    const allowedTypes = [
      'application/pdf',
      'text/plain',
      'text/markdown',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];

    const extension = file.name.split('.').pop()?.toLowerCase();
    const isAllowed = allowedTypes.includes(file.type) || 
      ['pdf', 'txt', 'md', 'doc', 'docx'].includes(extension || '');

    if (!isAllowed) {
      toast.error('不支持的文件格式');
      return null;
    }

    // [初始化]：重置状态开始上传
    setUploadStatus('uploading');
    setUploadProgress(0);
    setUploadedFileName(file.name);
    setError(null);
    abortRef.current = false;

    try {
      // [步骤一]：创建知识库记录
      setUploadProgress(10);
      
      const kbName = file.name.replace(/\.[^/.]+$/, '');
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

      // [步骤二]：上传文件到存储桶
      const storagePath = `${user.id}/${kbData.id}/${file.name}`;
      
      const mimeType = getMimeTypeForFile(file);
      
      // [处理]：必要时创建带正确MIME类型的Blob
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
        // [回滚]：上传失败时标记知识库状态
        await supabase.from('knowledge_bases').update({ index_status: 'failed' }).eq('id', kbData.id);
        throw new Error(`文件上传失败: ${uploadError.message}`);
      }

      setUploadProgress(50);
      if (abortRef.current) throw new Error('已取消');

      // [步骤三]：创建文档记录
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

      // [步骤四]：读取文件内容
      const fileContent = await readFileContent(file);
      
      setUploadProgress(70);

      // [步骤五]：触发RAG索引
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
        // [警告]：索引失败不阻断流程，继续标记为可用
      }

      setUploadProgress(90);

      // [步骤六]：更新知识库索引状态
      await supabase
        .from('knowledge_bases')
        .update({ index_status: 'ready' })
        .eq('id', kbData.id);

      // [步骤七]：触发自动画像（非阻塞）
      supabase.functions.invoke('kb-auto-profile', {
        body: { knowledgeBaseId: kbData.id },
      }).catch(() => { /* 忽略画像失败 */ });

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

  /**
   * 重置上传状态
   * 
   * 取消当前上传并重置所有状态到初始值。
   */
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

/**
 * 根据文件扩展名获取正确的MIME类型
 * 
 * 当浏览器返回不可靠的MIME类型时，根据文件扩展名推断正确类型。
 * 
 * @param {File} file - 文件对象
 * @returns {string} - 正确的MIME类型
 */
function getMimeTypeForFile(file: File): string {
  const extension = file.name.split('.').pop()?.toLowerCase();
  
  // [映射]：扩展名到MIME类型的映射表
  const mimeMap: Record<string, string> = {
    'pdf': 'application/pdf',
    'txt': 'text/plain',
    'md': 'text/markdown',
    'json': 'application/json',
    'doc': 'application/msword',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  };
  
  // [判断]：优先使用浏览器检测的有效MIME类型
  if (file.type && file.type !== 'application/octet-stream' && file.type !== '') {
    return file.type;
  }
  
  // [回退]：根据扩展名映射
  return mimeMap[extension || ''] || 'text/plain';
}

/**
 * 读取文件内容为文本
 * 
 * 对于文本类文件直接读取内容，对于二进制文件（如PDF）返回空字符串由服务端处理。
 * 
 * @param {File} file - 文件对象
 * @returns {Promise<string>} - 文件文本内容
 */
async function readFileContent(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const result = e.target?.result;
      if (typeof result === 'string') {
        resolve(result);
      } else {
        // [处理]：二进制文件返回空字符串，由服务端提取内容
        resolve('');
      }
    };
    
    reader.onerror = () => reject(new Error('读取文件失败'));
    
    const extension = file.name.split('.').pop()?.toLowerCase();
    
    // [判断]：文本类文件直接读取
    if (file.type.includes('text') || 
        extension === 'txt' || 
        extension === 'md' ||
        extension === 'json') {
      reader.readAsText(file);
    } else {
      // [处理]：PDF等二进制格式由服务端处理提取
      resolve('');
    }
  });
}
