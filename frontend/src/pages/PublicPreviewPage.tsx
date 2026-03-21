import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import type { Block, Page } from '../types';

// 公开预览页面，无需登录
export default function PublicPreviewPage() {
  const { id } = useParams<{ id: string }>();
  const [page, setPage] = useState<Page | null>(null);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [canvasImages, setCanvasImages] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    if (id) {
      loadData(id);
    }
  }, [id]);

  // 渲染画板为 SVG
  useEffect(() => {
    const renderCanvases = () => {
      const canvasBlocks = blocks.filter(b => b.block_type === 'canvas');
      const newCanvasImages = new Map<string, string>();
      
      for (const block of canvasBlocks) {
        try {
          const parsed = JSON.parse(block.content);
          if (parsed.excalidraw && parsed.excalidraw.elements) {
            const svg = renderExcalidrawToSvg(parsed.excalidraw.elements);
            if (svg) {
              newCanvasImages.set(block.id, svg);
            }
          }
        } catch {}
      }
      
      setCanvasImages(newCanvasImages);
    };
    
    renderCanvases();
  }, [blocks]);

  const loadData = async (pageId: string) => {
    try {
      const baseUrl = import.meta.env.VITE_API_BASE_URL || '/api/v1';
      
      const pageRes = await fetch(`${baseUrl}/public/pages/${pageId}`);
      if (!pageRes.ok) {
        throw new Error('页面不存在或未公开');
      }
      const pageData = await pageRes.json();
      setPage(pageData);

      const blocksRes = await fetch(`${baseUrl}/public/pages/${pageId}/blocks`);
      if (blocksRes.ok) {
        const blocksData = await blocksRes.json();
        setBlocks(blocksData || []);
      }
    } catch (err: any) {
      console.error('加载失败:', err);
      setError(err.message || '加载失败');
    } finally {
      setLoading(false);
    }
  };

  // 简单的 Excalidraw 元素转 SVG
  const renderExcalidrawToSvg = (elements: any[]): string | null => {
    if (!elements || elements.length === 0) return null;

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    
    elements.forEach(el => {
      if (!el.isDeleted) {
        minX = Math.min(minX, el.x);
        minY = Math.min(minY, el.y);
        maxX = Math.max(maxX, el.x + (el.width || 0));
        maxY = Math.max(maxY, el.y + (el.height || 0));
      }
    });

    const padding = 20;
    const width = Math.max(maxX - minX + padding * 2, 100);
    const height = Math.max(maxY - minY + padding * 2, 100);

    let svgContent = '';
    
    elements.forEach(el => {
      if (el.isDeleted) return;
      
      const x = el.x - minX + padding;
      const y = el.y - minY + padding;
      const strokeColor = el.strokeColor || '#000000';
      const fillColor = el.backgroundColor === 'transparent' ? 'none' : el.backgroundColor;
      
      switch (el.type) {
        case 'rectangle':
          svgContent += `<rect x="${x}" y="${y}" width="${el.width}" height="${el.height}" 
            fill="${fillColor}" stroke="${strokeColor}" stroke-width="${el.strokeWidth || 2}" rx="2"/>`;
          break;
        case 'ellipse':
          svgContent += `<ellipse cx="${x + el.width/2}" cy="${y + el.height/2}" 
            rx="${el.width/2}" ry="${el.height/2}" fill="${fillColor}" stroke="${strokeColor}" 
            stroke-width="${el.strokeWidth || 2}"/>`;
          break;
        case 'diamond':
          const cx = x + el.width/2;
          const cy = y + el.height/2;
          svgContent += `<polygon points="${cx},${y} ${x + el.width},${cy} ${cx},${y + el.height} ${x},${cy}" 
            fill="${fillColor}" stroke="${strokeColor}" stroke-width="${el.strokeWidth || 2}"/>`;
          break;
        case 'line':
        case 'arrow':
          if (el.points && el.points.length > 0) {
            const points = el.points.map((p: number[]) => `${x + p[0]},${y + p[1]}`).join(' ');
            svgContent += `<polyline points="${points}" fill="none" stroke="${strokeColor}" 
              stroke-width="${el.strokeWidth || 2}" stroke-linecap="round" stroke-linejoin="round"/>`;
          }
          break;
        case 'text':
          if (el.text) {
            svgContent += `<text x="${x}" y="${y + (el.fontSize || 20)}" 
              font-size="${el.fontSize || 20}" fill="${strokeColor}">${escapeHtml(el.text)}</text>`;
          }
          break;
        case 'freedraw':
          if (el.points && el.points.length > 0) {
            const pathData = el.points.map((p: number[], i: number) => 
              `${i === 0 ? 'M' : 'L'} ${x + p[0]} ${y + p[1]}`
            ).join(' ');
            svgContent += `<path d="${pathData}" fill="none" stroke="${strokeColor}" 
              stroke-width="${el.strokeWidth || 2}" stroke-linecap="round" stroke-linejoin="round"/>`;
          }
          break;
      }
    });

    return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${svgContent}</svg>`;
  };

  const escapeHtml = (text: string): string => {
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
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

  const renderBlock = (block: Block) => {
    switch (block.block_type) {
      case 'divider':
        return <hr className="my-6 border-gray-200" />;
      case 'heading_1':
        return <h1 className="text-3xl font-bold mt-8 mb-4">{getPlainText(block)}</h1>;
      case 'heading_2':
        return <h2 className="text-2xl font-bold mt-6 mb-3">{getPlainText(block)}</h2>;
      case 'heading_3':
        return <h3 className="text-xl font-semibold mt-4 mb-2">{getPlainText(block)}</h3>;
      case 'quote':
        return (
          <blockquote className="border-l-4 border-blue-500 pl-4 my-4 text-gray-600 italic">
            {getPlainText(block)}
          </blockquote>
        );
      case 'code':
        return (
          <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg my-4 overflow-x-auto">
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
          <div className="flex items-center gap-2 my-2">
            <input type="checkbox" checked={checked} readOnly className="w-4 h-4 rounded" />
            <span className={checked ? 'line-through text-gray-400' : ''}>{getPlainText(block)}</span>
          </div>
        );
      case 'bulleted_list_item':
        return <li className="ml-6 my-1 list-disc">{getPlainText(block)}</li>;
      case 'numbered_list_item':
        return <li className="ml-6 my-1 list-decimal">{getPlainText(block)}</li>;
      case 'canvas':
        const canvasSvg = canvasImages.get(block.id);
        if (canvasSvg) {
          return (
            <div className="my-4 p-4 bg-white rounded-lg border shadow-sm">
              <div className="flex items-center gap-2 mb-3 text-gray-500 text-sm">
                <span>🎨</span>
                <span>画板</span>
              </div>
              <div 
                className="flex justify-center"
                dangerouslySetInnerHTML={{ __html: canvasSvg }}
              />
            </div>
          );
        }
        return (
          <div className="my-4 p-8 bg-gray-50 rounded-lg border text-center text-gray-400">
            <span className="text-4xl">🎨</span>
            <p className="mt-2">空画板</p>
          </div>
        );
      case 'table':
        try {
          const tableData = JSON.parse(block.content).table;
          if (tableData) {
            return (
              <div className="my-4 overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      {tableData.headers.map((h: string, i: number) => (
                        <th key={i} className="border border-gray-200 bg-gray-50 px-3 py-2 text-left text-sm font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {tableData.cells.map((row: any[], ri: number) => (
                      <tr key={ri}>
                        {row.map((cell: any, ci: number) => (
                          <td key={ci} className="border border-gray-200 px-3 py-2 text-sm">{cell.content}</td>
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
        return <p className="my-2 leading-relaxed">{getPlainText(block)}</p>;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white">
        <div className="text-6xl mb-4">🔒</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">无法访问</h1>
        <p className="text-gray-500 mb-6">{error}</p>
        <Link to="/" className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors">
          返回首页
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* 顶部导航 */}
      <nav className="border-b bg-white sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">📝</span>
            <span className="font-semibold text-gray-900">DayLog</span>
          </div>
          <Link to="/" className="text-sm text-blue-600 hover:text-blue-700">
            登录查看更多
          </Link>
        </div>
      </nav>

      {/* 内容 */}
      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-5xl">{page?.icon_emoji || '📄'}</span>
          </div>
          <h1 className="text-4xl font-bold text-gray-900">{page?.title || '未命名页面'}</h1>
          <p className="text-sm text-gray-400 mt-2">
            最后编辑：{page?.updated_at ? new Date(page.updated_at).toLocaleString('zh-CN') : '-'}
          </p>
        </div>

        <div className="prose prose-lg max-w-none">
          {blocks.sort((a, b) => a.sort_order - b.sort_order).map((block) => (
            <div key={block.id}>
              {renderBlock(block)}
            </div>
          ))}
        </div>
      </main>

      {/* 底部 */}
      <footer className="border-t mt-12 py-6">
        <div className="max-w-4xl mx-auto px-6 text-center text-sm text-gray-400">
          由 <span className="font-medium">DayLog</span> 提供支持
        </div>
      </footer>
    </div>
  );
}
