import { useState, useCallback } from 'react';
import type { Block } from '../../types';

interface EmbedBlockProps {
  block?: Block;
  content?: string;
  onUpdate: (content: string) => void;
  onDelete?: () => void;
}

interface EmbedData {
  url: string;
  title?: string;
}

function parseEmbedContent(content: string): EmbedData {
  try {
    const parsed = JSON.parse(content);
    if (parsed.embed) {
      return {
        url: parsed.embed.url || '',
        title: parsed.embed.title || '',
      };
    }
  } catch {}
  return { url: '' };
}

// 获取嵌入类型图标
function getEmbedIcon(url: string): string {
  if (url.includes('youtube.com') || url.includes('youtu.be')) return '▶️';
  if (url.includes('twitter.com') || url.includes('x.com')) return '🐦';
  if (url.includes('github.com')) return '🐙';
  if (url.includes('codepen.io')) return '✏️';
  if (url.includes('figma.com')) return '🎨';
  if (url.includes('docs.google.com')) return '📄';
  if (url.includes('maps.google') || url.includes('openstreetmap')) return '🗺️';
  return '🔗';
}

// 获取网站标题
function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace('www.', '');
  } catch {
    return url;
  }
}

export default function EmbedBlock({
  block,
  content: directContent,
  onUpdate,
  onDelete,
}: EmbedBlockProps) {
  const content = block?.content || directContent || '{}';
  const embedData = parseEmbedContent(content);
  const [isEditing, setIsEditing] = useState(!embedData.url);
  const [inputUrl, setInputUrl] = useState(embedData.url);

  const handleSave = useCallback(() => {
    if (inputUrl.trim()) {
      const data: EmbedData = {
        url: inputUrl.trim(),
        title: extractDomain(inputUrl.trim()),
      };
      onUpdate(JSON.stringify({ embed: data }));
      setIsEditing(false);
    }
  }, [inputUrl, onUpdate]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setInputUrl(embedData.url);
    }
  };

  if (isEditing || !embedData.url) {
    return (
      <div className="embed-block p-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-lg">🔗</span>
          <span className="text-sm font-medium text-gray-700">嵌入网站</span>
        </div>
        <div className="flex gap-2">
          <input
            type="url"
            value={inputUrl}
            onChange={(e) => setInputUrl(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入网站 URL，如 https://example.com"
            className="flex-1 input text-sm"
            autoFocus
          />
          <button
            onClick={handleSave}
            disabled={!inputUrl.trim()}
            className="btn btn-primary disabled:opacity-50"
          >
            嵌入
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-2">
          支持 YouTube、Twitter、GitHub、CodePen 等网站
        </p>
      </div>
    );
  }

  return (
    <div className="embed-block group">
      <div className="embed-block-header">
        <div className="flex items-center gap-2">
          <span>{getEmbedIcon(embedData.url)}</span>
          <a
            href={embedData.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-blue-600 hover:underline truncate max-w-xs"
          >
            {embedData.title || extractDomain(embedData.url)}
          </a>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => setIsEditing(true)}
            className="btn btn-ghost text-xs px-2 py-1"
          >
            编辑
          </button>
          {onDelete && (
            <button
              onClick={onDelete}
              className="btn btn-ghost text-xs px-2 py-1 text-red-500 hover:text-red-700"
            >
              删除
            </button>
          )}
        </div>
      </div>
      <div className="embed-block-content">
        <iframe
          src={embedData.url}
          title={embedData.title || '嵌入内容'}
          className="w-full h-96"
          frameBorder="0"
          allowFullScreen
          sandbox="allow-scripts allow-same-origin allow-forms"
          loading="lazy"
        />
      </div>
    </div>
  );
}
