import { useEffect, useState, useCallback, useRef, lazy, Suspense } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { pageApi, blockApi } from '../api/client';
import { useAppStore } from '../stores';
import type { Block, BlockType, Page } from '../types';
import Sidebar from '../components/sidebar/Sidebar';
import BlockEditor from '../components/editor/BlockEditor';
import FileUpload from '../components/file-upload/FileUpload';
import { exportToMarkdown, importFromMarkdown } from '../utils/markdown';

// 懒加载预览组件
const PagePreview = lazy(() => import('../components/preview/PagePreview'));

export default function EditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [page, setPage] = useState<Page | null>(null);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [error, setError] = useState('');
  const { currentWorkspace, setCurrentPage, updatePage } = useAppStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareLink, setShareLink] = useState('');
  const [shareEnabled, setShareEnabled] = useState(false);

  useEffect(() => {
    if (id) {
      loadPage(id);
      loadBlocks(id);
    }
  }, [id]);

  const loadPage = async (pageId: string) => {
    try {
      const { data } = await pageApi.get(pageId);
      setPage(data);
      setTitle(data.title);
      setCurrentPage(data);
    } catch (err) {
      console.error('加载页面失败:', err);
      navigate('/dashboard');
    }
  };

  const loadBlocks = async (pageId: string) => {
    try {
      const { data } = await blockApi.list(pageId);
      setBlocks(data || []);
    } catch (err) {
      console.error('加载块失败:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleTitleChange = useCallback(
    async (newTitle: string) => {
      setTitle(newTitle);
      if (id) {
        try {
          const { data } = await pageApi.update(id, { title: newTitle });
          // 更新全局状态中的页面列表
          updatePage(data);
          // 更新当前页面状态
          setPage(data);
        } catch (err) {
          console.error('更新标题失败:', err);
        }
      }
    },
    [id, updatePage]
  );

  const handleCreateBlock = useCallback(
    async (blockType: string) => {
      if (!id) return;
      setError('');
      try {
        const { data } = await blockApi.create({
          page_id: id,
          block_type: blockType,
          content: '{}',
          props: '{}',
        });
        setBlocks((prev) => [...prev, data]);
        return data;
      } catch (err: any) {
        const msg = err.response?.data?.error || '创建块失败';
        setError(msg);
        console.error('创建块失败:', err);
      }
    },
    [id]
  );

  const handleUpdateBlock = useCallback(
    async (blockId: string, updates: { content?: string; props?: string; block_type?: string }) => {
      setError('');
      try {
        await blockApi.update(blockId, updates);
        setBlocks((prev) =>
          prev.map((b) =>
            b.id === blockId
              ? { ...b, ...updates, block_type: (updates.block_type ?? b.block_type) as BlockType, updated_at: new Date().toISOString() }
              : b
          )
        );
      } catch (err: any) {
        const msg = err.response?.data?.error || '更新块失败';
        setError(msg);
        console.error('更新块失败:', err);
      }
    },
    []
  );

  // 删除块
  const handleDeleteBlock = useCallback(async (blockId: string) => {
    setError('');
    try {
      await blockApi.delete(blockId);
      setBlocks((prev) => prev.filter((b) => b.id !== blockId));
    } catch (err: any) {
      const msg = err.response?.data?.error || '删除块失败';
      setError(msg);
      console.error('删除块失败:', err);
    }
  }, []);

  // 重排序块
  const handleReorderBlock = useCallback(async (blockId: string, newSortOrder: number) => {
    try {
      await blockApi.update(blockId, { sort_order: newSortOrder });
      setBlocks((prev) =>
        prev.map((b) =>
          b.id === blockId ? { ...b, sort_order: newSortOrder } : b
        )
      );
    } catch (err: any) {
      console.error('重排序失败:', err);
    }
  }, []);

  // 导出为 Markdown
  const handleExportMarkdown = useCallback(() => {
    exportToMarkdown(blocks, title);
  }, [blocks, title]);

  // 导入 Markdown 文件
  const handleImportMarkdown = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !id) return;

    try {
      const { title: importTitle, blocks: importBlocks } = await importFromMarkdown(file);
      
      // 更新页面标题
      if (importTitle && importTitle !== '导入的文档') {
        await handleTitleChange(importTitle);
      }

      // 批量创建块
      const newBlocks: Block[] = [];
      for (let i = 0; i < importBlocks.length; i++) {
        const block = importBlocks[i];
        const { data } = await blockApi.create({
          page_id: id,
          block_type: block.type,
          content: block.content,
          props: block.props || '{}',
        });
        newBlocks.push(data);
      }

      setBlocks((prev) => [...prev, ...newBlocks]);
      alert(`成功导入 ${newBlocks.length} 个块`);
    } catch (err: any) {
      console.error('导入失败:', err);
      setError('导入 Markdown 文件失败: ' + (err.message || '未知错误'));
    }

    // 重置文件输入
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [id, handleTitleChange]);

  // 生成分享链接
  const handleGenerateShareLink = useCallback(() => {
    if (!id) return;
    // 使用页面ID作为分享token（简单实现，生产环境应该使用专门的分享token）
    const link = `${window.location.origin}/share/${id}`;
    setShareLink(link);
    setShareEnabled(true);
  }, [id]);

  // 复制分享链接
  const handleCopyShareLink = useCallback(() => {
    navigator.clipboard.writeText(shareLink).then(() => {
      alert('链接已复制到剪贴板');
    });
  }, [shareLink]);

  // 关闭分享
  const handleDisableShare = useCallback(() => {
    setShareEnabled(false);
    setShareLink('');
  }, []);

  // 如果显示预览模式
  if (showPreview && id) {
    return (
      <Suspense fallback={
        <div className="fixed inset-0 z-50 bg-white flex items-center justify-center">
          <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
        </div>
      }>
        <PagePreview pageId={id} onClose={() => setShowPreview(false)} />
      </Suspense>
    );
  }

  if (loading) {
    return (
      <div className="flex h-screen bg-[var(--color-bg-primary)]">
        <Sidebar />
        <main className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-10 h-10 border-4 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin"></div>
            <p className="text-[var(--color-text-muted)]">加载中...</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[var(--color-bg-primary)]">
      <Sidebar />

      <main className="flex-1 overflow-auto bg-gradient-to-b from-[var(--color-bg-secondary)] to-[var(--color-bg-primary)]">
        <div className="max-w-4xl mx-auto px-8 py-12">
          {/* 页面标题 */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-4xl hover:scale-110 transition-transform duration-200 cursor-pointer">{page?.icon_emoji || '📄'}</span>
              <input
                type="text"
                value={title}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="未命名页面"
                className="text-4xl font-bold bg-transparent border-none outline-none flex-1 placeholder-[var(--color-text-placeholder)] bg-clip-text"
                style={{ 
                  background: 'linear-gradient(135deg, var(--color-text-primary) 0%, var(--color-primary) 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: title ? 'transparent' : 'var(--color-text-placeholder)'
                }}
              />
              {/* 预览和分享按钮 */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowPreview(true)}
                  className="px-4 py-2 bg-[var(--color-bg-primary)] hover:bg-[var(--color-bg-hover)] border border-[var(--color-border)] rounded-xl text-sm font-medium text-[var(--color-text-secondary)] flex items-center gap-2 transition-all duration-200 hover:shadow-[var(--shadow-sm)] hover:border-[rgba(131,47,255,0.2)]"
                  title="预览模式"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  预览
                </button>
                <button
                  onClick={() => setShowShareModal(true)}
                  className="px-4 py-2 bg-gradient-to-r from-[#832FFF] to-[#4c53ff] hover:shadow-[var(--shadow-glow)] rounded-xl text-sm font-medium text-white flex items-center gap-2 transition-all duration-200"
                  title="分享页面"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                  分享
                </button>
              </div>
            </div>
            <div className="flex items-center gap-4 ml-14">
              <p className="text-xs text-[var(--color-text-muted)] flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {page?.updated_at ? new Date(page.updated_at).toLocaleString('zh-CN') : '-'}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleExportMarkdown}
                  className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-primary)] flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-[var(--color-bg-hover)] transition-all duration-200"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  导出
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-primary)] flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-[var(--color-bg-hover)] transition-all duration-200"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  导入
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".md,.markdown"
                  onChange={handleImportMarkdown}
                  className="hidden"
                />
              </div>
            </div>
          </div>

          {error && (
            <div className="mb-6 bg-gradient-to-r from-red-50 to-pink-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm flex items-center justify-between animate-[fadeIn_0.2s_ease]">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{error}</span>
              </div>
              <button onClick={() => setError('')} className="text-red-400 hover:text-red-600 hover:bg-red-100 rounded-lg p-1 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}

          {/* 块编辑器 */}
          <div className="bg-[var(--color-bg-primary)] rounded-2xl border border-[var(--color-border-light)] shadow-[var(--shadow-sm)] p-6">
            <BlockEditor
              blocks={blocks}
              onCreateBlock={handleCreateBlock}
              onUpdateBlock={handleUpdateBlock}
              onDeleteBlock={handleDeleteBlock}
              onReorderBlocks={handleReorderBlock}
            />
          </div>

          {/* 文件上传 */}
          {currentWorkspace && (
            <div className="mt-8 bg-[var(--color-bg-primary)] rounded-2xl border border-[var(--color-border-light)] shadow-[var(--shadow-sm)] p-6">
              <FileUpload workspaceId={currentWorkspace.id} pageId={id} />
            </div>
          )}
        </div>
      </main>

      {/* 分享模态框 */}
      {showShareModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowShareModal(false)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">分享页面</h2>
              <button onClick={() => setShowShareModal(false)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {!shareEnabled ? (
              <div>
                <p className="text-gray-600 mb-4">生成分享链接后，任何人都可以通过链接查看此页面内容（只读）。</p>
                <button
                  onClick={handleGenerateShareLink}
                  className="w-full py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
                >
                  生成分享链接
                </button>
              </div>
            ) : (
              <div>
                <p className="text-gray-600 mb-2">分享链接已生成：</p>
                <div className="flex items-center gap-2 mb-4">
                  <input
                    type="text"
                    value={shareLink}
                    readOnly
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-sm text-gray-600"
                  />
                  <button
                    onClick={handleCopyShareLink}
                    className="px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    复制
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <button
                    onClick={handleDisableShare}
                    className="text-sm text-red-600 hover:text-red-700"
                  >
                    关闭分享
                  </button>
                  <a
                    href={shareLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:text-blue-700"
                  >
                    在新窗口打开 →
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
