import { useCallback, useEffect, useState, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { fileApi } from '../../api/client';
import type { FileAttachment } from '../../types';

interface FileUploadProps {
  workspaceId: string;
  pageId?: string;
}

// 可排序的图片组件
function SortableImage({
  file,
  url,
  onPreview,
  onDownload,
  onDelete,
}: {
  file: FileAttachment;
  url: string;
  onPreview: (url: string) => void;
  onDownload: (file: FileAttachment) => void;
  onDelete: (fileId: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: file.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : 0,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group relative aspect-square bg-gray-100 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow"
    >
      {url ? (
        <img
          src={url}
          alt={file.original_name}
          className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
          onClick={() => onPreview(url)}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full"></div>
        </div>
      )}
      
      {/* 悬停操作 */}
      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
        {/* 拖拽把手 */}
        <button
          className="p-2 bg-white/90 rounded-full hover:bg-white cursor-grab active:cursor-grabbing touch-none"
          title="拖拽排序"
          {...attributes}
          {...listeners}
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="9" cy="6" r="1.5" />
            <circle cx="15" cy="6" r="1.5" />
            <circle cx="9" cy="12" r="1.5" />
            <circle cx="15" cy="12" r="1.5" />
            <circle cx="9" cy="18" r="1.5" />
            <circle cx="15" cy="18" r="1.5" />
          </svg>
        </button>
        <button
          onClick={() => onPreview(url)}
          className="p-2 bg-white/90 rounded-full hover:bg-white"
          title="预览"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
        </button>
        <button
          onClick={() => onDownload(file)}
          className="p-2 bg-white/90 rounded-full hover:bg-white"
          title="下载"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
        </button>
        <button
          onClick={() => onDelete(file.id)}
          className="p-2 bg-red-500/90 text-white rounded-full hover:bg-red-500"
          title="删除"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
      
      {/* 文件名 */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
        <p className="text-xs text-white truncate">{file.original_name}</p>
      </div>
    </div>
  );
}

export default function FileUpload({ workspaceId, pageId }: FileUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [files, setFiles] = useState<FileAttachment[]>([]);
  const [error, setError] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('grid');
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [imageUrls, setImageUrls] = useState<Map<string, string>>(new Map());
  const urlMapRef = useRef<Map<string, string>>(new Map());

  const isImage = (mimeType: string) => mimeType.startsWith('image/');

  // 拖拽传感器
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 3,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // 加载文件列表
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

  // 加载图片预览 URL
  useEffect(() => {
    const loadImageUrls = async () => {
      const imageFiles = files.filter(f => isImage(f.mime_type));
      const newUrls = new Map(urlMapRef.current);
      
      for (const file of imageFiles) {
        if (!newUrls.has(file.id)) {
          try {
            const url = await fileApi.getPreviewUrl(file.id);
            newUrls.set(file.id, url);
          } catch (err) {
            console.error('加载图片预览失败:', file.original_name, err);
          }
        }
      }
      
      urlMapRef.current = newUrls;
      setImageUrls(new Map(newUrls));
    };
    
    if (files.length > 0) {
      loadImageUrls();
    }
  }, [files]);

  // 清理 blob URLs
  useEffect(() => {
    return () => {
      urlMapRef.current.forEach(url => URL.revokeObjectURL(url));
    };
  }, []);

  const getUrl = (fileId: string) => imageUrls.get(fileId) || '';

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      setError('');
      setUploading(true);

      for (const file of acceptedFiles) {
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
    maxSize: 10 * 1024 * 1024,
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
      const url = urlMapRef.current.get(fileId);
      if (url) {
        URL.revokeObjectURL(url);
        const newUrls = new Map(urlMapRef.current);
        newUrls.delete(fileId);
        urlMapRef.current = newUrls;
        setImageUrls(new Map(newUrls));
      }
    } catch (err: any) {
      setError(err.response?.data?.error || '删除文件失败');
    }
  };

  // 处理拖拽结束
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const newFiles = (() => {
        const imageFiles = files.filter(f => isImage(f.mime_type));
        const otherFiles = files.filter(f => !isImage(f.mime_type));
        
        const oldIndex = imageFiles.findIndex((f) => f.id === active.id);
        const newIndex = imageFiles.findIndex((f) => f.id === over.id);
        
        const newImageFiles = arrayMove(imageFiles, oldIndex, newIndex);
        return [...newImageFiles, ...otherFiles];
      })();
      
      setFiles(newFiles);

      // 保存排序到后端
      try {
        const imageFiles = newFiles.filter(f => isImage(f.mime_type));
        const fileIds = imageFiles.map(f => f.id);
        const sortOrders = imageFiles.map((_, index) => (index + 1) * 1000);
        await fileApi.reorder(fileIds, sortOrders);
      } catch (err: any) {
        console.error('保存排序失败:', err);
        // 不显示错误给用户，因为排序已经生效
      }
    }
  };

  const imageFiles = files.filter(f => isImage(f.mime_type));
  const otherFiles = files.filter(f => !isImage(f.mime_type));

  return (
    <div className="space-y-4">
      {/* 标题和视图切换 */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-700">
          附件 {files.length > 0 && <span className="text-gray-400">({files.length})</span>}
        </h3>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-1.5 rounded ${viewMode === 'grid' ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
            title="网格视图"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-1.5 rounded ${viewMode === 'list' ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
            title="列表视图"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>

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
            <p className="text-gray-500">拖拽文件或图片到此处，或点击选择</p>
            <p className="text-xs text-gray-400 mt-1">支持图片、文档等，最大 10MB</p>
          </div>
        )}
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError('')} className="text-red-400 hover:text-red-600">✕</button>
        </div>
      )}

      {/* 图片照片墙 - 支持拖拽排序 */}
      {imageFiles.length > 0 && (
        <div>
          <h4 className="text-xs font-medium text-gray-500 mb-2">图片（可拖拽排序）</h4>
          {viewMode === 'grid' ? (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={imageFiles.map(f => f.id)}
                strategy={rectSortingStrategy}
              >
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {imageFiles.map((file) => (
                    <SortableImage
                      key={file.id}
                      file={file}
                      url={getUrl(file.id)}
                      onPreview={setPreviewImage}
                      onDownload={(f) => fileApi.download(f.id, f.original_name)}
                      onDelete={handleDeleteFile}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          ) : (
            <div className="space-y-2">
              {imageFiles.map((file) => (
                <div key={file.id} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                  {getUrl(file.id) ? (
                    <img src={getUrl(file.id)} alt={file.original_name} className="w-12 h-12 object-cover rounded cursor-pointer" onClick={() => setPreviewImage(getUrl(file.id))} />
                  ) : (
                    <div className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center">
                      <div className="animate-spin w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{file.original_name}</p>
                    <p className="text-xs text-gray-500">{formatFileSize(file.file_size)}</p>
                  </div>
                  <button onClick={() => fileApi.download(file.id, file.original_name)} className="text-sm text-blue-600 hover:underline">下载</button>
                  <button onClick={() => handleDeleteFile(file.id)} className="text-sm text-red-600 hover:underline">删除</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 其他文件列表 */}
      {otherFiles.length > 0 && (
        <div>
          <h4 className="text-xs font-medium text-gray-500 mb-2">文件</h4>
          <div className="space-y-2">
            {otherFiles.map((file) => (
              <div key={file.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <span className="text-2xl">{file.mime_type.includes('pdf') ? '📄' : '📎'}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{file.original_name}</p>
                  <p className="text-xs text-gray-500">{formatFileSize(file.file_size)}</p>
                </div>
                <button onClick={() => fileApi.download(file.id, file.original_name)} className="text-sm text-blue-600 hover:underline">下载</button>
                <button onClick={() => handleDeleteFile(file.id)} className="text-sm text-red-600 hover:underline">删除</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 图片预览模态框 */}
      {previewImage && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setPreviewImage(null)}>
          <div className="relative max-w-4xl max-h-full">
            <img src={previewImage} alt="预览" className="max-w-full max-h-[90vh] object-contain rounded-lg" />
            <button onClick={() => setPreviewImage(null)} className="absolute top-4 right-4 p-2 bg-black/50 text-white rounded-full hover:bg-black/70">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
