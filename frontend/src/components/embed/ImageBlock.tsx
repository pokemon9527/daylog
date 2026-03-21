import { useState, useCallback, useRef } from 'react';
import { fileApi } from '../../api/client';
import type { Block } from '../../types';

interface ImageBlockProps {
  block?: Block;
  content?: string;
  onUpdate: (content: string) => void;
  onDelete?: () => void;
  workspaceId?: string;
  pageId?: string;
}

interface ImageData {
  fileId?: string;
  url?: string;
  caption?: string;
  width?: number;
}

function parseImageContent(content: string): ImageData {
  try {
    const parsed = JSON.parse(content);
    if (parsed.image) {
      return {
        fileId: parsed.image.fileId,
        url: parsed.image.url,
        caption: parsed.image.caption || '',
        width: parsed.image.width,
      };
    }
  } catch {}
  return { caption: '' };
}

export default function ImageBlock({
  block,
  content: directContent,
  onUpdate,
  onDelete,
  workspaceId,
  pageId,
}: ImageBlockProps) {
  const content = block?.content || directContent || '{}';
  const imageData = parseImageContent(content);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [caption, setCaption] = useState(imageData.caption || '');
  const [isUploading, setIsUploading] = useState(false);
  const [isEditingCaption, setIsEditingCaption] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 加载图片预览
  const loadImagePreview = useCallback(async (fileId: string) => {
    try {
      const url = await fileApi.getPreviewUrl(fileId);
      setPreviewUrl(url);
    } catch (err) {
      console.error('加载图片预览失败:', err);
    }
  }, []);

  // 初始化加载图片
  useState(() => {
    if (imageData.fileId) {
      loadImagePreview(imageData.fileId);
    } else if (imageData.url) {
      setPreviewUrl(imageData.url);
    }
  });

  // 处理文件上传
  const handleFileUpload = useCallback(
    async (file: File) => {
      if (!workspaceId) return;

      setIsUploading(true);
      try {
        const { data } = await fileApi.upload(file, workspaceId, pageId);
        const newImageData: ImageData = {
          fileId: data.id,
          caption: caption,
        };
        onUpdate(JSON.stringify({ image: newImageData }));
        
        // 加载预览
        const url = await fileApi.getPreviewUrl(data.id);
        setPreviewUrl(url);
      } catch (err: any) {
        console.error('上传图片失败:', err);
        alert('上传图片失败: ' + (err.response?.data?.error || err.message));
      } finally {
        setIsUploading(false);
      }
    },
    [workspaceId, pageId, caption, onUpdate, loadImagePreview]
  );

  // 处理 URL 输入
  const handleUrlSubmit = useCallback(
    (url: string) => {
      const newImageData: ImageData = {
        url: url,
        caption: caption,
      };
      onUpdate(JSON.stringify({ image: newImageData }));
      setPreviewUrl(url);
    },
    [caption, onUpdate]
  );

  // 更新标题
  const handleCaptionChange = useCallback(
    (newCaption: string) => {
      setCaption(newCaption);
      const newImageData: ImageData = {
        ...imageData,
        caption: newCaption,
      };
      onUpdate(JSON.stringify({ image: newImageData }));
    },
    [imageData, onUpdate]
  );

  // 处理文件选择
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  // 如果没有图片，显示上传界面
  if (!previewUrl) {
    return (
      <div className="image-block border border-dashed border-gray-300 rounded-lg p-8 text-center">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />
        <input
          type="text"
          placeholder="输入图片 URL"
          className="input w-full max-w-md mb-4"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.target as HTMLInputElement).value) {
              handleUrlSubmit((e.target as HTMLInputElement).value);
            }
          }}
        />
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="btn btn-primary"
          >
            {isUploading ? '上传中...' : '上传图片'}
          </button>
          {onDelete && (
            <button onClick={onDelete} className="btn btn-ghost text-red-500">
              删除
            </button>
          )}
        </div>
        <p className="text-xs text-gray-400 mt-3">
          支持 JPG、PNG、GIF、WebP 格式，最大 10MB
        </p>
      </div>
    );
  }

  return (
    <div className="image-block group">
      <div className="relative">
        <img
          src={previewUrl}
          alt={caption || '图片'}
          className="max-w-full rounded-lg cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => window.open(previewUrl, '_blank')}
        />
        {/* 悬停操作按钮 */}
        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="btn btn-secondary text-xs px-2 py-1 bg-white/90 backdrop-blur-sm"
          >
            替换
          </button>
          {onDelete && (
            <button
              onClick={onDelete}
              className="btn btn-ghost text-xs px-2 py-1 bg-white/90 backdrop-blur-sm text-red-500"
            >
              删除
            </button>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>
      {/* 图片标题 */}
      {isEditingCaption ? (
        <input
          type="text"
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          onBlur={() => {
            handleCaptionChange(caption);
            setIsEditingCaption(false);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleCaptionChange(caption);
              setIsEditingCaption(false);
            }
          }}
          placeholder="添加标题..."
          className="image-block-caption w-full text-center border-none outline-none bg-transparent"
          autoFocus
        />
      ) : (
        <p
          className="image-block-caption cursor-text"
          onClick={() => setIsEditingCaption(true)}
        >
          {caption || '点击添加标题...'}
        </p>
      )}
    </div>
  );
}
