import { useState, useEffect } from 'react';
import { adminApi } from './AdminDashboardPage';

interface Block {
  id: string;
  page_id: string;
  block_type: string;
  content: string;
  is_archived: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

const BLOCK_TYPE_LABELS: Record<string, { label: string; icon: string }> = {
  paragraph: { label: '段落', icon: '¶' },
  heading_1: { label: '标题1', icon: 'H1' },
  heading_2: { label: '标题2', icon: 'H2' },
  heading_3: { label: '标题3', icon: 'H3' },
  bulleted_list_item: { label: '无序列表', icon: '•' },
  numbered_list_item: { label: '有序列表', icon: '1.' },
  to_do: { label: '待办', icon: '☐' },
  code: { label: '代码', icon: '</>' },
  quote: { label: '引用', icon: '"' },
  divider: { label: '分割线', icon: '—' },
  canvas: { label: '画板', icon: '🎨' },
  table: { label: '表格', icon: '📊' },
  embed: { label: '嵌入', icon: '🔗' },
  image: { label: '图片', icon: '🖼️' },
  map: { label: '地图', icon: '🗺️' },
};

export default function AdminBlocksPage() {
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [selectedBlock, setSelectedBlock] = useState<Block | null>(null);

  useEffect(() => {
    loadBlocks();
  }, [filterType]);

  const loadBlocks = async () => {
    try {
      const params: any = { limit: 100 };
      if (filterType) params.block_type = filterType;
      
      const { data } = await adminApi.get('/blocks', { params });
      let filteredBlocks = data || [];
      
      // 前端过滤状态
      if (filterStatus === 'hidden') {
        filteredBlocks = filteredBlocks.filter((b: Block) => b.is_archived);
      } else if (filterStatus === 'normal') {
        filteredBlocks = filteredBlocks.filter((b: Block) => !b.is_archived);
      }
      
      setBlocks(filteredBlocks);
    } catch (err) {
      console.error('加载块失败:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleHideBlock = async (blockId: string) => {
    try {
      await adminApi.put(`/blocks/${blockId}/hide`);
      setBlocks(prev => prev.map(b => b.id === blockId ? { ...b, is_archived: true } : b));
    } catch (err: any) {
      alert(err.response?.data?.error || '操作失败');
    }
  };

  const handleUnhideBlock = async (blockId: string) => {
    try {
      await adminApi.put(`/blocks/${blockId}/unhide`);
      setBlocks(prev => prev.map(b => b.id === blockId ? { ...b, is_archived: false } : b));
    } catch (err: any) {
      alert(err.response?.data?.error || '操作失败');
    }
  };

  const getBlockPreview = (block: Block): string => {
    try {
      const parsed = JSON.parse(block.content);
      
      // 处理画板块
      if (block.block_type === 'canvas') {
        if (parsed.excalidraw?.elements) {
          const count = parsed.excalidraw.elements.filter((e: any) => !e.isDeleted).length;
          return `画板 - ${count} 个元素`;
        }
        return '空画板';
      }
      
      // 处理表格
      if (block.block_type === 'table') {
        if (parsed.table) {
          const rows = parsed.table.rows || 0;
          const cols = parsed.table.cols || 0;
          return `表格 ${rows}行 × ${cols}列`;
        }
        return '空表格';
      }
      
      // 处理嵌入
      if (block.block_type === 'embed') {
        if (parsed.embed?.url) {
          return `嵌入: ${parsed.embed.url.slice(0, 40)}...`;
        }
        return '空嵌入';
      }
      
      // 处理地图
      if (block.block_type === 'map') {
        if (parsed.map?.location) {
          return `地图: ${parsed.map.location}`;
        }
        return '空地图';
      }
      
      // 处理图片
      if (block.block_type === 'image') {
        if (parsed.image?.fileId || parsed.image?.url) {
          return '图片附件';
        }
        return '空图片';
      }
      
      // 分割线
      if (block.block_type === 'divider') {
        return '────────────────';
      }
      
      // TipTap 格式
      if (parsed.tiptap?.plain_text) {
        return parsed.tiptap.plain_text.slice(0, 50) + (parsed.tiptap.plain_text.length > 50 ? '...' : '');
      }
      
      // 旧格式 rich_text
      if (parsed.rich_text && parsed.rich_text.length > 0) {
        const text = parsed.rich_text.map((t: any) => t.text?.content || '').join('');
        return text.slice(0, 50) + (text.length > 50 ? '...' : '');
      }
      
      return '[空内容]';
    } catch {
      return '[解析失败]';
    }
  };

  // 生成画板简单预览 SVG
  const getCanvasPreview = (block: Block): string | null => {
    if (block.block_type !== 'canvas') return null;
    
    try {
      const parsed = JSON.parse(block.content);
      if (!parsed.excalidraw?.elements) return null;
      
      const elements = parsed.excalidraw.elements.filter((e: any) => !e.isDeleted);
      if (elements.length === 0) return null;
      
      // 计算边界
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      elements.forEach((el: any) => {
        minX = Math.min(minX, el.x);
        minY = Math.min(minY, el.y);
        maxX = Math.max(maxX, el.x + (el.width || 50));
        maxY = Math.max(maxY, el.y + (el.height || 50));
      });
      
      const width = maxX - minX + 10;
      const height = maxY - minY + 10;
      const scale = Math.min(150 / width, 100 / height, 1);
      
      let svgContent = '';
      elements.slice(0, 20).forEach((el: any) => {
        const x = (el.x - minX + 5) * scale;
        const y = (el.y - minY + 5) * scale;
        const w = (el.width || 50) * scale;
        const h = (el.height || 50) * scale;
        const color = el.strokeColor || '#000';
        
        if (el.type === 'rectangle') {
          svgContent += `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none" stroke="${color}" stroke-width="1"/>`;
        } else if (el.type === 'ellipse') {
          svgContent += `<ellipse cx="${x + w/2}" cy="${y + h/2}" rx="${w/2}" ry="${h/2}" fill="none" stroke="${color}" stroke-width="1"/>`;
        } else if (el.type === 'text' && el.text) {
          svgContent += `<text x="${x}" y="${y + 10}" font-size="8" fill="${color}">${el.text.slice(0, 10)}</text>`;
        } else if (el.type === 'freedraw' && el.points?.length > 0) {
          const path = el.points.map((p: number[], i: number) => 
            `${i === 0 ? 'M' : 'L'} ${(el.x + p[0] - minX + 5) * scale} ${(el.y + p[1] - minY + 5) * scale}`
          ).join(' ');
          svgContent += `<path d="${path}" fill="none" stroke="${color}" stroke-width="1"/>`;
        }
      });
      
      const svgWidth = width * scale + 10;
      const svgHeight = height * scale + 10;
      
      return `<svg width="${svgWidth}" height="${svgHeight}" viewBox="0 0 ${svgWidth} ${svgHeight}" style="background:#fff;border-radius:4px;">${svgContent}</svg>`;
    } catch {
      return null;
    }
  };

  const blockTypes = Object.keys(BLOCK_TYPE_LABELS);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-[var(--color-text-primary)]">块管理</h2>
        <div className="flex items-center gap-4">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-4 py-2 border border-[var(--color-border)] rounded-xl outline-none focus:border-[var(--color-primary)]"
          >
            <option value="">全部类型</option>
            {blockTypes.map((type) => (
              <option key={type} value={type}>
                {BLOCK_TYPE_LABELS[type]?.icon} {BLOCK_TYPE_LABELS[type]?.label}
              </option>
            ))}
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border border-[var(--color-border)] rounded-xl outline-none focus:border-[var(--color-primary)]"
          >
            <option value="">全部状态</option>
            <option value="normal">正常</option>
            <option value="hidden">已隐藏</option>
          </select>
          <span className="text-sm text-[var(--color-text-muted)]">
            共 {blocks.length} 个块
          </span>
        </div>
      </div>

      {/* 块列表 */}
      <div className="bg-white rounded-2xl border border-[var(--color-border)] overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-[var(--color-bg-secondary)]">
              <th className="px-6 py-4 text-left text-sm font-semibold text-[var(--color-text-primary)]">类型</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-[var(--color-text-primary)]">内容预览</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-[var(--color-text-primary)]">状态</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-[var(--color-text-primary)]">创建时间</th>
              <th className="px-6 py-4 text-right text-sm font-semibold text-[var(--color-text-primary)]">操作</th>
            </tr>
          </thead>
          <tbody>
            {blocks.map((block) => {
              const typeInfo = BLOCK_TYPE_LABELS[block.block_type] || { label: block.block_type, icon: '?' };
              const canvasPreview = getCanvasPreview(block);
              
              return (
                <tr key={block.id} className="border-t border-[var(--color-border-light)] hover:bg-[var(--color-bg-hover)]">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className="w-8 h-8 bg-[var(--color-bg-secondary)] rounded-lg flex items-center justify-center text-sm">
                        {typeInfo.icon}
                      </span>
                      <span className="text-sm font-medium">{typeInfo.label}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {canvasPreview ? (
                      <div className="flex items-center gap-3">
                        <div dangerouslySetInnerHTML={{ __html: canvasPreview }} className="border rounded" />
                        <span className="text-xs text-[var(--color-text-muted)]">画板预览</span>
                      </div>
                    ) : (
                      <p className="text-sm text-[var(--color-text-secondary)] max-w-xs truncate">
                        {getBlockPreview(block)}
                      </p>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      block.is_archived
                        ? 'bg-red-100 text-red-600'
                        : 'bg-green-100 text-green-600'
                    }`}>
                      {block.is_archived ? '已隐藏' : '正常'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-[var(--color-text-muted)]">
                    {new Date(block.created_at).toLocaleString('zh-CN')}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setSelectedBlock(block)}
                        className="px-3 py-1.5 text-sm text-[var(--color-primary)] hover:bg-[var(--color-bg-hover)] rounded-lg transition-all"
                      >
                        查看
                      </button>
                      {block.is_archived ? (
                        <button
                          onClick={() => handleUnhideBlock(block.id)}
                          className="px-3 py-1.5 text-sm text-green-600 hover:bg-green-50 rounded-lg transition-all"
                        >
                          恢复
                        </button>
                      ) : (
                        <button
                          onClick={() => handleHideBlock(block.id)}
                          className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-all"
                        >
                          隐藏
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {blocks.length === 0 && (
          <div className="p-12 text-center">
            <p className="text-[var(--color-text-muted)]">暂无块数据</p>
          </div>
        )}
      </div>

      {/* 块详情弹窗 */}
      {selectedBlock && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setSelectedBlock(null)}>
          <div className="bg-white rounded-2xl shadow-xl p-6 w-[600px] max-w-[90vw] max-h-[80vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-[var(--color-text-primary)]">块详情</h3>
              <button
                onClick={() => setSelectedBlock(null)}
                className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-[var(--color-text-muted)]">块 ID</label>
                  <p className="text-sm font-mono break-all">{selectedBlock.id}</p>
                </div>
                <div>
                  <label className="text-xs text-[var(--color-text-muted)]">页面 ID</label>
                  <p className="text-sm font-mono break-all">{selectedBlock.page_id}</p>
                </div>
                <div>
                  <label className="text-xs text-[var(--color-text-muted)]">块类型</label>
                  <p className="text-sm">{BLOCK_TYPE_LABELS[selectedBlock.block_type]?.label || selectedBlock.block_type}</p>
                </div>
                <div>
                  <label className="text-xs text-[var(--color-text-muted)]">状态</label>
                  <p className="text-sm">{selectedBlock.is_archived ? '已隐藏' : '正常'}</p>
                </div>
              </div>

              {/* 画板预览 */}
              {selectedBlock.block_type === 'canvas' && (
                <div>
                  <label className="text-xs text-[var(--color-text-muted)]">画板预览</label>
                  <div className="mt-2 p-4 bg-[var(--color-bg-secondary)] rounded-xl flex justify-center">
                    {getCanvasPreview(selectedBlock) ? (
                      <div dangerouslySetInnerHTML={{ __html: getCanvasPreview(selectedBlock)! }} />
                    ) : (
                      <p className="text-sm text-[var(--color-text-muted)]">空画板</p>
                    )}
                  </div>
                </div>
              )}

              <div>
                <label className="text-xs text-[var(--color-text-muted)]">内容 (JSON)</label>
                <pre className="mt-1 p-4 bg-[var(--color-bg-secondary)] rounded-xl text-xs overflow-auto max-h-60 font-mono">
                  {JSON.stringify(JSON.parse(selectedBlock.content || '{}'), null, 2)}
                </pre>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <label className="text-xs text-[var(--color-text-muted)]">创建时间</label>
                  <p>{new Date(selectedBlock.created_at).toLocaleString('zh-CN')}</p>
                </div>
                <div>
                  <label className="text-xs text-[var(--color-text-muted)]">更新时间</label>
                  <p>{new Date(selectedBlock.updated_at).toLocaleString('zh-CN')}</p>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              {selectedBlock.is_archived ? (
                <button
                  onClick={() => {
                    handleUnhideBlock(selectedBlock.id);
                    setSelectedBlock({ ...selectedBlock, is_archived: false });
                  }}
                  className="px-4 py-2 bg-green-500 text-white rounded-xl hover:bg-green-600"
                >
                  恢复块
                </button>
              ) : (
                <button
                  onClick={() => {
                    handleHideBlock(selectedBlock.id);
                    setSelectedBlock({ ...selectedBlock, is_archived: true });
                  }}
                  className="px-4 py-2 bg-red-500 text-white rounded-xl hover:bg-red-600"
                >
                  隐藏块
                </button>
              )}
              <button
                onClick={() => setSelectedBlock(null)}
                className="px-4 py-2 bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)] rounded-xl hover:bg-[var(--color-bg-hover)]"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
