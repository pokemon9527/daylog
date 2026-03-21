import { useState, useEffect } from 'react';
import { adminApi } from './AdminDashboardPage';

interface User {
  id: string;
  email: string;
  display_name: string;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

interface UserStats {
  user_id: string;
  workspace_count: number;
  page_count: number;
  block_count: number;
  file_count: number;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userStats, setUserStats] = useState<UserStats | null>(null);

  useEffect(() => {
    loadUsers();
  }, [search]);

  const loadUsers = async () => {
    try {
      const params: any = { limit: 100 };
      if (search) params.search = search;
      
      const { data } = await adminApi.get('/users', { params });
      setUsers(data || []);
    } catch (err) {
      console.error('加载用户失败:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadUserStats = async (userId: string) => {
    try {
      const { data } = await adminApi.get(`/users/${userId}/stats`);
      setUserStats(data);
    } catch (err) {
      console.error('加载用户统计失败:', err);
    }
  };

  const handleViewUser = (user: User) => {
    setSelectedUser(user);
    loadUserStats(user.id);
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
        <h2 className="text-2xl font-bold text-[var(--color-text-primary)]">用户管理</h2>
        <div className="flex items-center gap-4">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜索用户..."
              className="pl-10 pr-4 py-2 border border-[var(--color-border)] rounded-xl outline-none focus:border-[var(--color-primary)] w-64"
            />
          </div>
          <span className="text-sm text-[var(--color-text-muted)]">
            共 {users.length} 个用户
          </span>
        </div>
      </div>

      {/* 用户列表 */}
      <div className="bg-white rounded-2xl border border-[var(--color-border)] overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-[var(--color-bg-secondary)]">
              <th className="px-6 py-4 text-left text-sm font-semibold text-[var(--color-text-primary)]">用户</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-[var(--color-text-primary)]">邮箱</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-[var(--color-text-primary)]">注册时间</th>
              <th className="px-6 py-4 text-right text-sm font-semibold text-[var(--color-text-primary)]">操作</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-t border-[var(--color-border-light)] hover:bg-[var(--color-bg-hover)]">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-[#FF5374] to-[#FF8C42] rounded-xl flex items-center justify-center text-white font-semibold">
                      {user.display_name?.charAt(0) || '?'}
                    </div>
                    <span className="font-medium text-[var(--color-text-primary)]">{user.display_name}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-[var(--color-text-secondary)]">{user.email}</td>
                <td className="px-6 py-4 text-sm text-[var(--color-text-muted)]">
                  {new Date(user.created_at).toLocaleString('zh-CN')}
                </td>
                <td className="px-6 py-4 text-right">
                  <button
                    onClick={() => handleViewUser(user)}
                    className="px-4 py-2 text-sm text-[var(--color-primary)] hover:bg-[var(--color-bg-hover)] rounded-xl transition-all"
                  >
                    查看详情
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {users.length === 0 && (
          <div className="p-12 text-center">
            <p className="text-[var(--color-text-muted)]">暂无用户</p>
          </div>
        )}
      </div>

      {/* 用户详情弹窗 */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setSelectedUser(null)}>
          <div className="bg-white rounded-2xl shadow-xl p-6 w-[500px] max-w-[90vw]" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-[var(--color-text-primary)]">用户详情</h3>
              <button
                onClick={() => setSelectedUser(null)}
                className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* 用户信息 */}
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-[#FF5374] to-[#FF8C42] rounded-2xl flex items-center justify-center text-white text-2xl font-bold">
                {selectedUser.display_name?.charAt(0) || '?'}
              </div>
              <div>
                <h4 className="text-xl font-bold text-[var(--color-text-primary)]">{selectedUser.display_name}</h4>
                <p className="text-sm text-[var(--color-text-muted)]">{selectedUser.email}</p>
              </div>
            </div>

            {/* 用户统计 */}
            {userStats && (
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-[var(--color-bg-secondary)] rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-[var(--color-primary)]">{userStats.workspace_count}</p>
                  <p className="text-sm text-[var(--color-text-muted)]">工作空间</p>
                </div>
                <div className="bg-[var(--color-bg-secondary)] rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-[var(--color-primary)]">{userStats.page_count}</p>
                  <p className="text-sm text-[var(--color-text-muted)]">页面</p>
                </div>
                <div className="bg-[var(--color-bg-secondary)] rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-[var(--color-primary)]">{userStats.block_count}</p>
                  <p className="text-sm text-[var(--color-text-muted)]">块</p>
                </div>
                <div className="bg-[var(--color-bg-secondary)] rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-[var(--color-primary)]">{userStats.file_count}</p>
                  <p className="text-sm text-[var(--color-text-muted)]">文件</p>
                </div>
              </div>
            )}

            {/* 用户信息详情 */}
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-[var(--color-text-muted)]">用户 ID</span>
                <span className="text-[var(--color-text-primary)] font-mono text-xs">{selectedUser.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--color-text-muted)]">注册时间</span>
                <span className="text-[var(--color-text-primary)]">{new Date(selectedUser.created_at).toLocaleString('zh-CN')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--color-text-muted)]">最后更新</span>
                <span className="text-[var(--color-text-primary)]">{new Date(selectedUser.updated_at).toLocaleString('zh-CN')}</span>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setSelectedUser(null)}
                className="px-6 py-2 bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)] rounded-xl hover:bg-[var(--color-bg-hover)] transition-all"
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
