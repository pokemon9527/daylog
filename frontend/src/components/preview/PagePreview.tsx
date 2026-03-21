import { useState, useEffect, useRef } from 'react';
import { pageApi, blockApi, fileApi } from '../../api/client';
import type { Block, Page, FileAttachment } from '../../types';

interface PagePreviewProps {
  pageId: string;
  onClose: () => void;
}

export default function PagePreview({ pageId, onClose }: PagePreviewProps) {
  const [page, setPage] = useState<Page | null>(null);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [files, setFiles] = useState<FileAttachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [imageUrls, setImageUrls] = useState<Map<string, string>>(new Map());
  const [canvasSvgs, setCanvasSvgs] = useState<Map<string, string>>(new Map());
  const canvasRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadData();
  }, [pageId]);

  // 加载图片预览
  useEffect(() => {
    const loadImages = async () => {
      const imageFiles = files.filter(f => f.mime_type.startsWith('image/'));
      const newUrls = new Map<string, string>();
      
      for (const file of imageFiles) {
        try {
          const url = await fileApi.getPreviewUrl(file.id);
          newUrls.set(file.id, url);
        } catch (err) {
          console.error('加载图片预览失败:', file.original_name);
        }
      }
      
      setImageUrls(newUrls);
    };
    
    if (files.length > 0) {
      loadImages();
    }
  }, [files]);

  // 使用 Excalidraw 渲染画板
  useEffect(() => {
    const renderCanvases = async () => {
      const canvasBlocks = blocks.filter(b => b.block_type === 'canvas');
      if (canvasBlocks.length === 0) return;

      try {
        // 动态导入 Excalidraw
        const { exportToSvg } = await import('@excalidraw/excalidraw');
        
        const newSvgs = new Map<string, string>();
        
        for (const block of canvasBlocks) {
          try {
            const parsed = JSON.parse(block.content);
            if (parsed.excalidraw && parsed.excalidraw.elements) {
              const elements = parsed.excalidraw.elements.filter((el: any) => !el.isDeleted);
              if (elements.length > 0) {
                const svg = await exportToSvg({
                  elements,
                  appState: {
                    viewBackgroundColor: '#ffffff',
                    exportBackground: true,
                    exportWithDarkMode: false,
                    exportScale: 1,
                  },
                  files: parsed.excalidraw.files || {},
                  exportPadding: 20,
                });
                
                // 将 SVG 元素转换为字符串
                const serializer = new XMLSerializer();
                const svgString = serializer.serializeToString(svg);
                newSvgs.set(block.id, svgString);
              }
            }
          } catch (err) {
            console.error('渲染画板失败:', err);
          }
        }
        
        setCanvasSvgs(newSvgs);
      } catch (err) {
        console.error('加载 Excalidraw 失败:', err);
      }
    };

    renderCanvases();
  }, [blocks]);

  const loadData = async () => {
    try {
      const [pageRes, blocksRes, filesRes] = await Promise.all([
        pageApi.get(pageId),
        blockApi.list(pageId),
        fileApi.list(pageId).catch(() => ({ data: [] })),
      ]);
      setPage(pageRes.data);
      setBlocks(blocksRes.data || []);
      setFiles(filesRes.data || []);
    } catch (err) {
      console.error('加载失败:', err);
    } finally {
      setLoading(false);
    }
  };

  const getPlainText = (block: Block): string => {
    try {
      const content = JSON.parse(block.content);
      if (content.tiptap?.plain_text) return content.tiptap.plain_text;
      if (content.rich_text && content.rich_text.length > 0) {
        return content.rich_text.map((t: any) => t.text?.content || '').join('');
      }
    } catch {}
    return '';
  };

  // 获取嵌入块的 URL
  const getEmbedUrl = (block: Block): string => {
    try {
      const parsed = JSON.parse(block.content);
      if (parsed.embed?.url) return parsed.embed.url;
      if (parsed.map) {
        const mapData = parsed.map;
        const provider = mapData.provider || 'amap';
        
        if (provider === 'amap') {
          if (mapData.lat && mapData.lng) {
            return `https://uri.amap.com/marker?position=${mapData.lng},${mapData.lat}&name=${encodeURIComponent(mapData.location)}&coordinate=gaode&callnative=0`;
          }
          return `https://uri.amap.com/search?keyword=${encodeURIComponent(mapData.location)}`;
        }
        if (provider === 'baidu') {
          if (mapData.lat && mapData.lng) {
            return `https://api.map.baidu.com/marker?location=${mapData.lat},${mapData.lng}&title=${encodeURIComponent(mapData.location)}&output=html&src=daylog`;
          }
          return `https://api.map.baidu.com/geocoder?address=${encodeURIComponent(mapData.location)}&output=html&src=daylog`;
        }
        if (provider === 'google') {
          if (mapData.lat && mapData.lng) {
            return `https://maps.google.com/maps?q=${mapData.lat},${mapData.lng}&z=${mapData.zoom || 14}&output=embed`;
          }
          return `https://maps.google.com/maps?q=${encodeURIComponent(mapData.location)}&z=${mapData.zoom || 14}&output=embed`;
        }
        // 默认 OpenStreetMap
        if (mapData.lat && mapData.lng) {
          return `https://www.openstreetmap.org/export/embed.html?bbox=${mapData.lng - 0.01},${mapData.lat - 0.01},${mapData.lng + 0.01},${mapData.lat + 0.01}&layer=mapnik&marker=${mapData.lat},${mapData.lng}`;
        }
        return `https://www.openstreetmap.org/export/embed.html?bbox=116.3,39.9,116.5,40.1&layer=mapnik`;
      }
    } catch {}
    return '';
  };

  const getEmbedTitle = (block: Block): string => {
    try {
      const parsed = JSON.parse(block.content);
      if (parsed.embed?.url) {
        try {
          return new URL(parsed.embed.url).hostname;
        } catch {
          return parsed.embed.url;
        }
      }
      if (parsed.map?.location) return parsed.map.location;
    } catch {}
    return '嵌入内容';
  };

  const getEmbedIcon = (block: Block): string => {
    try {
      const parsed = JSON.parse(block.content);
      if (parsed.embed?.url) {
        const url = parsed.embed.url;
        if (url.includes('youtube.com') || url.includes('youtu.be')) return '▶️';
        if (url.includes('twitter.com') || url.includes('x.com')) return '🐦';
        if (url.includes('github.com')) return '🐙';
        if (url.includes('bilibili.com')) return '📺';
        return '🔗';
      }
      if (parsed.map) return '🗺️';
    } catch {}
    return '🔗';
  };

  const renderBlock = (block: Block) => {
    switch (block.block_type) {
      case 'divider':
        return <hr className="my-6 border-[var(--color-border)]" />;
      
      case 'heading_1':
        return <h1 className="text-3xl font-bold mt-8 mb-4 bg-gradient-to-r from-[var(--color-text-primary)] to-[var(--color-primary)] bg-clip-text text-transparent">{getPlainText(block)}</h1>;
      
      case 'heading_2':
        return <h2 className="text-2xl font-bold mt-6 mb-3 text-[var(--color-text-primary)]">{getPlainText(block)}</h2>;
      
      case 'heading_3':
        return <h3 className="text-xl font-semibold mt-4 mb-2 text-[var(--color-text-primary)]">{getPlainText(block)}</h3>;
      
      case 'quote':
        return (
          <blockquote className="border-l-4 border-[var(--color-primary)] pl-4 my-4 text-[var(--color-text-secondary)] italic bg-[var(--color-bg-secondary)] py-2 rounded-r-lg">
            {getPlainText(block)}
          </blockquote>
        );
      
      case 'code':
        return (
          <pre className="bg-gradient-to-br from-[#1e192c] to-[#2d2a3d] text-gray-100 p-5 rounded-2xl my-4 overflow-x-auto shadow-lg">
            <code className="text-sm font-mono">{getPlainText(block)}</code>
          </pre>
        );
      
      case 'to_do':
        let checked = false;
        try {
          const props = JSON.parse(block.props || '{}');
          checked = props.checked || false;
        } catch {}
        return (
          <div className="flex items-center gap-3 my-2">
            <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all duration-200 ${
              checked 
                ? 'bg-gradient-to-r from-[#832FFF] to-[#4c53ff] border-transparent' 
                : 'border-[var(--color-border)]'
            }`}>
              {checked && (
                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
            <span className={checked ? 'line-through text-[var(--color-text-muted)]' : ''}>{getPlainText(block)}</span>
          </div>
        );
      
      case 'bulleted_list_item':
        return (
          <div className="flex items-start gap-3 my-2 ml-4">
            <div className="w-2 h-2 rounded-full bg-gradient-to-r from-[#832FFF] to-[#4c53ff] mt-2.5 flex-shrink-0"></div>
            <span>{getPlainText(block)}</span>
          </div>
        );
      
      case 'numbered_list_item':
        return <li className="ml-6 my-2 marker:text-[var(--color-primary)] marker:font-semibold">{getPlainText(block)}</li>;
      
      case 'canvas':
        const svgContent = canvasSvgs.get(block.id);
        if (svgContent) {
          return (
            <div className="my-6 bg-white rounded-2xl border border-[var(--color-border)] shadow-[var(--shadow-md)] overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 bg-[var(--color-bg-secondary)] border-b border-[var(--color-border)]">
                <span className="w-6 h-6 bg-gradient-to-r from-[#832FFF] to-[#4c53ff] rounded-lg flex items-center justify-center text-white text-xs">🎨</span>
                <span className="font-medium text-[var(--color-text-primary)]">画板</span>
              </div>
              <div 
                className="p-4 flex justify-center bg-white"
                dangerouslySetInnerHTML={{ __html: svgContent }}
                ref={block.id === blocks.find(b => b.block_type === 'canvas')?.id ? canvasRef : undefined}
              />
            </div>
          );
        }
        return (
          <div className="my-6 p-8 bg-[var(--color-bg-secondary)] rounded-2xl border border-[var(--color-border)] text-center">
            <div className="w-16 h-16 bg-gradient-to-r from-[rgba(131,47,255,0.1)] to-[rgba(76,83,255,0.1)] rounded-2xl flex items-center justify-center mx-auto mb-3">
              <span className="text-3xl">🎨</span>
            </div>
            <p className="text-[var(--color-text-muted)]">空画板</p>
          </div>
        );
      
      case 'embed':
      case 'map':
        const embedUrl = getEmbedUrl(block);
        const embedTitle = getEmbedTitle(block);
        const embedIcon = getEmbedIcon(block);
        
        if (embedUrl) {
          // 检查是否是 URI 协议（会打开外部应用）
          const isUriProtocol = embedUrl.startsWith('https://uri.amap.com') || 
                                embedUrl.startsWith('https://api.map.baidu.com');
          
          if (isUriProtocol) {
            return (
              <div className="my-6 bg-white rounded-2xl border border-[var(--color-border)] shadow-[var(--shadow-md)] overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-3 bg-[var(--color-bg-secondary)] border-b border-[var(--color-border)]">
                  <span className="text-lg">{embedIcon}</span>
                  <span className="font-medium text-[var(--color-text-primary)]">{embedTitle}</span>
                </div>
                <div className="p-6 text-center">
                  <p className="text-[var(--color-text-muted)] mb-3">此地图需要在新窗口中打开</p>
                  <a 
                    href={embedUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#832FFF] to-[#4c53ff] text-white rounded-xl hover:shadow-[var(--shadow-glow)] transition-all duration-200"
                  >
                    <span>打开地图</span>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                </div>
              </div>
            );
          }
          
          return (
            <div className="my-6 bg-white rounded-2xl border border-[var(--color-border)] shadow-[var(--shadow-md)] overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 bg-[var(--color-bg-secondary)] border-b border-[var(--color-border)]">
                <span className="text-lg">{embedIcon}</span>
                <span className="font-medium text-[var(--color-text-primary)]">{embedTitle}</span>
              </div>
              <iframe
                src={embedUrl}
                title={embedTitle}
                className="w-full h-80 border-0"
                allowFullScreen
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                loading="lazy"
              />
            </div>
          );
        }
        return (
          <div className="my-6 p-8 bg-[var(--color-bg-secondary)] rounded-2xl border border-[var(--color-border)] text-center">
            <div className="w-16 h-16 bg-gradient-to-r from-[rgba(131,47,255,0.1)] to-[rgba(76,83,255,0.1)] rounded-2xl flex items-center justify-center mx-auto mb-3">
              <span className="text-3xl">{embedIcon}</span>
            </div>
            <p className="text-[var(--color-text-muted)]">未设置嵌入内容</p>
          </div>
        );
      
      case 'table':
        try {
          const tableData = JSON.parse(block.content).table;
          if (tableData) {
            return (
              <div className="my-6 overflow-x-auto rounded-2xl border border-[var(--color-border)] shadow-[var(--shadow-sm)]">
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      {tableData.headers.map((h: string, i: number) => (
                        <th key={i} className="border-b border-[var(--color-border)] bg-gradient-to-r from-[var(--color-bg-secondary)] to-[var(--color-bg-tertiary)] px-4 py-3 text-left text-sm font-semibold text-[var(--color-text-primary)]">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {tableData.cells.map((row: any[], ri: number) => (
                      <tr key={ri} className="hover:bg-[var(--color-bg-hover)] transition-colors">
                        {row.map((cell: any, ci: number) => (
                          <td key={ci} className="border-b border-[var(--color-border-light)] px-4 py-3 text-sm">{cell.content}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          }
        } catch {}
        return null;
      
      default:
        return <p className="my-2 leading-relaxed text-[var(--color-text-primary)]">{getPlainText(block)}</p>;
    }
  };

  const imageFiles = files.filter(f => f.mime_type.startsWith('image/'));

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 bg-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-[var(--color-text-muted)]">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-[var(--color-bg-primary)] overflow-auto">
      {/* 顶部工具栏 */}
      <div className="sticky top-0 z-10 bg-white/90 backdrop-blur-lg border-b border-[var(--color-border)]">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-r from-[#832FFF] to-[#4c53ff] rounded-xl flex items-center justify-center text-white">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </div>
            <h1 className="text-lg font-semibold text-[var(--color-text-primary)]">{page?.title || '未命名页面'}</h1>
            <span className="px-3 py-1 bg-gradient-to-r from-[rgba(131,47,255,0.1)] to-[rgba(76,83,255,0.1)] text-[var(--color-primary)] text-xs font-medium rounded-full">预览模式</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[var(--color-bg-primary)] hover:bg-[var(--color-bg-hover)] border border-[var(--color-border)] rounded-xl text-sm font-medium text-[var(--color-text-secondary)] flex items-center gap-2 transition-all duration-200 hover:shadow-[var(--shadow-sm)]"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 17l-5-5m0 0l5-5m-5 5h12" />
            </svg>
            返回编辑
          </button>
        </div>
      </div>

      {/* 内容区域 */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="mb-10">
          <div className="flex items-center gap-4 mb-4">
            <span className="text-6xl hover:scale-110 transition-transform duration-200 cursor-pointer">{page?.icon_emoji || '📄'}</span>
          </div>
          <h1 className="text-5xl font-bold bg-gradient-to-r from-[var(--color-text-primary)] to-[var(--color-primary)] bg-clip-text text-transparent">
            {page?.title || '未命名页面'}
          </h1>
          <div className="flex items-center gap-2 mt-3 text-sm text-[var(--color-text-muted)]">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            最后编辑：{page?.updated_at ? new Date(page.updated_at).toLocaleString('zh-CN') : '-'}
          </div>
        </div>

        {/* 块内容 */}
        <div className="prose prose-lg max-w-none">
          {blocks.sort((a, b) => a.sort_order - b.sort_order).map((block) => (
            <div key={block.id}>
              {renderBlock(block)}
            </div>
          ))}
        </div>

        {/* 照片墙 */}
        {imageFiles.length > 0 && (
          <div className="mt-12">
            <h3 className="text-lg font-semibold mb-6 flex items-center gap-2 text-[var(--color-text-primary)]">
              <div className="w-8 h-8 bg-gradient-to-r from-[#FF5374] to-[#FF8C42] rounded-xl flex items-center justify-center text-white">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <span>图片附件</span>
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {imageFiles.map((file) => {
                const url = imageUrls.get(file.id);
                return (
                  <div key={file.id} className="group aspect-square bg-[var(--color-bg-secondary)] rounded-2xl overflow-hidden shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-lg)] transition-all duration-300 hover:-translate-y-1">
                    {url ? (
                      <img
                        src={url}
                        alt={file.original_name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <div className="w-8 h-8 border-3 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin"></div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
