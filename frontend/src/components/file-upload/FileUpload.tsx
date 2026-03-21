import { useCallback, useEffect, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { fileApi } from '../../api/client';
import type { FileAttachment } from '../../types';

interface FileUploadProps {
  workspaceId: string;
  pageId?: string;
}

export default function FileUpload({ workspaceId, pageId }: FileUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [files, setFiles] = useState<FileAttachment[]>([]);
  const [error, setError] = useState('');

  // 加载已有文件列表
  useEffect(() => {
    if (!pageId) return;
    let cancelled = false;
    (async () => {
      try {
        const { data } = await fileApi.list(pageId);
        if (!cancelled) setFiles(data || []);
      } catch (err) {
        console.error('加载文件列表失败:', err);
      }
    })();
    return () => { cancelled = true; };
  }, [pageId]);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      setError('');
      setUploading(true);

      for (const file of acceptedFiles) {
        // 前端预检：检查文件大小（10MB）
        if (file.size > 10 * 1024 * 1024) {
          setError(`文件 "${file.name}" 超过 10MB 限制`);
          continue;
        }

        try {
          const { data } = await fileApi.upload(file, workspaceId, pageId);
          setFiles((prev) => [...prev, data]);
        } catch (err: any) {
          setError(err.response?.data?.error || `上传 "${file.name}" 失败`);
        }
      }

      setUploading(false);
    },
    [workspaceId, pageId]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxSize: 10 * 1024 * 1024, // 10MB
  });

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const handleDeleteFile = async (fileId: string) => {
    try {
      await fileApi.delete(fileId);
      setFiles((prev) => prev.filter((f) => f.id !== fileId));
    } catch (err: any) {
      setError(err.response?.data?.error || '删除文件失败');
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-gray-700">附件</h3>

      {/* 上传区域 */}
      <div
        {...getRootProps()}
        className={`dropzone ${isDragActive ? 'active' : ''}`}
      >
        <input {...getInputProps()} />
        {uploading ? (
          <p className="text-gray-500">上传中...</p>
        ) : isDragActive ? (
          <p className="text-blue-600">松开鼠标上传文件</p>
        ) : (
          <div>
            <p className="text-gray-500">拖拽文件到此处，或点击选择文件</p>
            <p className="text-xs text-gray-400 mt-1">最大文件大小：10MB</p>
          </div>
        )}
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">{error}</div>
      )}

      {/* 已上传文件列表 */}
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((file) => (
            <div
              key={file.id}
              className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
            >
              <span className="text-2xl">
                {file.mime_type.startsWith('image/')
                  ? '🖼️'
                  : file.mime_type.includes('pdf')
                  ? '📄'
                  : '📎'}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {file.original_name}
                </p>
                <p className="text-xs text-gray-500">
                  {formatFileSize(file.file_size)}
                </p>
              </div>
              <button
                onClick={() => fileApi.download(file.id, file.original_name)}
                className="text-sm text-blue-600 hover:underline"
              >
                下载
              </button>
              <button
                onClick={() => handleDeleteFile(file.id)}
                className="text-sm text-red-600 hover:underline"
              >
                移除
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
