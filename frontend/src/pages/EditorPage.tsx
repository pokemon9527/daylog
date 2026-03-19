import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { pageApi, blockApi } from '../api/client';
import { useAppStore } from '../stores';
import type { Block, BlockType, Page } from '../types';
import Sidebar from '../components/sidebar/Sidebar';
import BlockEditor from '../components/editor/BlockEditor';
import FileUpload from '../components/file-upload/FileUpload';

export default function EditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [page, setPage] = useState<Page | null>(null);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [error, setError] = useState('');
  const { currentWorkspace, setCurrentPage } = useAppStore();

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
      navigate('/');
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
          await pageApi.update(id, { title: newTitle });
        } catch (err) {
          console.error('更新标题失败:', err);
        }
      }
    },
    [id]
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

  if (loading) {
    return (
      <div className="flex h-screen bg-gray-50">
        <Sidebar />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-gray-500">加载中...</div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />

      <main className="flex-1 overflow-auto">
        <div className="max-w-4xl mx-auto p-8">
          {/* 页面标题 */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-3xl">{page?.icon_emoji || '📄'}</span>
              <input
                type="text"
                value={title}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="未命名页面"
                className="text-3xl font-bold text-gray-900 bg-transparent border-none outline-none w-full placeholder-gray-300"
              />
            </div>
            <p className="text-xs text-gray-400 ml-11">
              最后编辑：{page?.updated_at ? new Date(page.updated_at).toLocaleString('zh-CN') : '-'}
            </p>
          </div>

          {error && (
            <div className="mb-4 bg-red-50 text-red-600 p-3 rounded-lg text-sm flex items-center justify-between">
              <span>{error}</span>
              <button onClick={() => setError('')} className="text-red-400 hover:text-red-600">✕</button>
            </div>
          )}

          {/* 块编辑器 */}
          <BlockEditor
            blocks={blocks}
            onCreateBlock={handleCreateBlock}
            onUpdateBlock={handleUpdateBlock}
            onDeleteBlock={handleDeleteBlock}
          />

          {/* 文件上传 */}
          {currentWorkspace && (
            <div className="mt-8">
              <FileUpload workspaceId={currentWorkspace.id} pageId={id} />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
