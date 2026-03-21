import { useState, useEffect } from 'react';
import { adminApi } from './AdminDashboardPage';

interface Page {
  id: string;
  title: string;
  icon_emoji: string | null;
  review_status: string;
  is_hidden: boolean;
  author_name: string;
  author_email: string;
  updated_at: string;
}

export default function AdminPagesPage() {
  const [pages, setPages] = useState<Page[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [hideReason, setHideReason] = useState('');
  const [selectedPage, setSelectedPage] = useState<string | null>(null);

  useEffect(() => {
    loadPages();
  }, [filter]);

  const loadPages = async () => {
    try {
      const params: any = { limit: 100 };
      if (filter) params.status = filter;
      
      const { data } = await adminApi.get('/pages', { params });
      setPages(data || []);
    } catch (err) {
      console.error('加载页面失败:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleHidePage = async (pageId: string) => {
    try {
      await adminApi.put(`/pages/${pageId}/hide`, { reason: hideReason });
      // 更新本地状态
      setPages(prev => prev.map(p => p.id === pageId ? { ...p, is_hidden: true } : p));
      setSelectedPage(null);
      setHideReason('');
    } catch (err: any) {
      alert(err.response?.data?.error || '操作失败');
    }
  };

  const handleUnhidePage = async (pageId: string) => {
    try {
      await adminApi.put(`/pages/${pageId}/unhide`);
      // 更新本地状态
      setPages(prev => prev.map(p => p.id === pageId ? { ...p, is_hidden: false } : p));
    } catch (err: any) {
      alert(err.response?.data?.error || '操作失败');
    }
  };

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
        <h2 className="text-2xl font-bold text-[var(--color-text-primary)]">页面管理</h2>
        <div className="flex gap-2">
          {[
            { value: '', label: '全部' },
            { value: 'published', label: '已发布' },
            { value: 'hidden', label: '已隐藏' },
          ].map((item) => (
            <button
              key={item.value}
              onClick={() => setFilter(item.value)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                filter === item.value
                  ? 'bg-gradient-to-r from-[#832FFF] to-[#4c53ff] text-white'
                  : 'bg-white border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)]'
              }`}
            >
              {item.label}
            </button>
          ))}
          <span className="text-sm text-[var(--color-text-muted)] flex items-center ml-4">
            共 {pages.length} 个页面
          </span>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-[var(--color-border)] overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-[var(--color-bg-secondary)]">
              <th className="px-6 py-4 text-left text-sm font-semibold text-[var(--color-text-primary)]">页面</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-[var(--color-text-primary)]">作者</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-[var(--color-text-primary)]">状态</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-[var(--color-text-primary)]">更新时间</th>
              <th className="px-6 py-4 text-right text-sm font-semibold text-[var(--color-text-primary)]">操作</th>
            </tr>
          </thead>
          <tbody>
            {pages.map((page) => (
              <tr key={page.id} className="border-t border-[var(--color-border-light)] hover:bg-[var(--color-bg-hover)]">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{page.icon_emoji || '📄'}</span>
                    <div>
                      <span className="font-medium text-[var(--color-text-primary)]">{page.title || '未命名页面'}</span>
                      <p className="text-xs text-[var(--color-text-muted)] font-mono">{page.id.slice(0, 8)}...</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <p className="text-sm text-[var(--color-text-primary)]">{page.author_name}</p>
                  <p className="text-xs text-[var(--color-text-muted)]">{page.author_email}</p>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    page.is_hidden
                      ? 'bg-red-100 text-red-600'
                      : 'bg-green-100 text-green-600'
                  }`}>
                    {page.is_hidden ? '已隐藏' : '正常'}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-[var(--color-text-muted)]">
                  {new Date(page.updated_at).toLocaleString('zh-CN')}
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <a
                      href={`/page/${page.id}`}
                      target="_blank"
                      className="px-3 py-1.5 text-sm text-[var(--color-primary)] hover:bg-[var(--color-bg-hover)] rounded-lg transition-all"
                    >
                      查看
                    </a>
                    {page.is_hidden ? (
                      <button
                        onClick={() => handleUnhidePage(page.id)}
                        className="px-3 py-1.5 text-sm text-green-600 hover:bg-green-50 rounded-lg transition-all"
                      >
                        恢复
                      </button>
                    ) : (
                      <button
                        onClick={() => setSelectedPage(page.id)}
                        className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-all"
                      >
                        隐藏
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {pages.length === 0 && (
          <div className="p-12 text-center">
            <p className="text-[var(--color-text-muted)]">暂无页面</p>
          </div>
        )}
      </div>

      {/* 隐藏原因弹窗 */}
      {selectedPage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-96">
            <h3 className="text-lg font-bold text-[var(--color-text-primary)] mb-4">隐藏页面</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">隐藏原因</label>
              <textarea
                value={hideReason}
                onChange={(e) => setHideReason(e.target.value)}
                className="w-full px-4 py-3 border border-[var(--color-border)] rounded-xl outline-none focus:border-[var(--color-primary)] resize-none"
                rows={3}
                placeholder="请输入隐藏原因..."
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setSelectedPage(null);
                  setHideReason('');
                }}
                className="flex-1 px-4 py-2 border border-[var(--color-border)] text-[var(--color-text-secondary)] rounded-xl hover:bg-[var(--color-bg-hover)]"
              >
                取消
              </button>
              <button
                onClick={() => handleHidePage(selectedPage)}
                className="flex-1 px-4 py-2 bg-red-500 text-white rounded-xl hover:bg-red-600"
              >
                确认隐藏
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
