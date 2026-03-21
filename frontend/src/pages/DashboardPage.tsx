import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { pageApi } from '../api/client';
import { useAppStore, useAuthStore } from '../stores';
import type { Page } from '../types';
import Sidebar from '../components/sidebar/Sidebar';

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { currentWorkspace, pages, setCurrentPage, setPages } = useAppStore();
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    if (currentWorkspace) {
      loadPages();
    }
  }, [currentWorkspace]);

  const loadPages = async () => {
    if (!currentWorkspace) return;
    try {
      const { data } = await pageApi.list(currentWorkspace.id);
      setPages(data || []);
    } catch (err) {
      console.error('加载页面失败:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePage = async () => {
    if (!currentWorkspace) return;
    try {
      const { data } = await pageApi.create({
        workspace_id: currentWorkspace.id,
        title: '未命名页面',
      });
      setCurrentPage(data);
      navigate(`/page/${data.id}`);
    } catch (err) {
      console.error('创建页面失败:', err);
    }
  };

  const handleOpenPage = (page: Page) => {
    setCurrentPage(page);
    navigate(`/page/${page.id}`);
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />

      <main className="flex-1 overflow-auto">
        <div className="max-w-4xl mx-auto p-8">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900">
              欢迎回来，{user?.display_name}
            </h1>
            <p className="text-gray-600 mt-1">
              {currentWorkspace?.name || '选择一个工作空间开始使用'}
            </p>
          </div>

          {currentWorkspace ? (
            <>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-gray-800">页面</h2>
                <button
                  onClick={handleCreatePage}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
                >
                  + 新建页面
                </button>
              </div>

              {loading ? (
                <div className="text-center py-12 text-gray-500">加载中...</div>
              ) : pages.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-gray-400 text-6xl mb-4">📝</div>
                  <p className="text-gray-500 mb-4">还没有页面</p>
                  <button
                    onClick={handleCreatePage}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
                  >
                    创建第一个页面
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {pages.map((page) => (
                    <div
                      key={page.id}
                      onClick={() => handleOpenPage(page)}
                      className="p-4 bg-white rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-md cursor-pointer transition-all"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xl">{page.icon_emoji || '📄'}</span>
                        <h3 className="font-medium text-gray-900 truncate">
                          {page.title || '未命名页面'}
                        </h3>
                      </div>
                      <p className="text-xs text-gray-400">
                        {new Date(page.updated_at).toLocaleString('zh-CN')}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12">
              <div className="text-gray-400 text-6xl mb-4">📂</div>
              <p className="text-gray-500">请从侧边栏选择或创建工作空间</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
