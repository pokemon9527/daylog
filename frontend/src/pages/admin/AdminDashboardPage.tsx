import { useState, useEffect } from 'react';
import { useNavigate, Link, Outlet, useLocation } from 'react-router-dom';
import axios from 'axios';

interface AdminInfo {
  id: string;
  username: string;
  display_name: string;
  role: string;
}

interface Stats {
  total_users: number;
  total_pages: number;
  total_blocks: number;
  pending_reviews: number;
  hidden_pages: number;
}

// 创建管理员 API 客户端
const adminApi = axios.create({
  baseURL: '/api/v1/admin',
});

adminApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('adminToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

adminApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('adminToken');
      localStorage.removeItem('adminInfo');
      window.location.href = '/admin';
    }
    return Promise.reject(error);
  }
);

export { adminApi };

export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [admin, setAdmin] = useState<AdminInfo | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 检查登录状态
    const token = localStorage.getItem('adminToken');
    const adminInfo = localStorage.getItem('adminInfo');
    
    if (!token || !adminInfo) {
      navigate('/admin');
      return;
    }

    setAdmin(JSON.parse(adminInfo));
    loadStats();
  }, [navigate]);

  const loadStats = async () => {
    try {
      const { data } = await adminApi.get('/stats');
      setStats(data);
    } catch (err) {
      console.error('加载统计数据失败:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminInfo');
    navigate('/admin');
  };

  const menuItems = [
    { path: '/admin/dashboard', label: '仪表板', icon: '📊' },
    { path: '/admin/users', label: '用户管理', icon: '👥' },
    { path: '/admin/pages', label: '页面管理', icon: '📄' },
    { path: '/admin/blocks', label: '块管理', icon: '📦' },
    { path: '/admin/sensitive', label: '敏感词', icon: '⚠️' },
  ];

  const isActive = (path: string) => location.pathname === path;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg-secondary)]">
        <div className="w-12 h-12 border-4 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-[var(--color-bg-secondary)]">
      {/* 侧边栏 */}
      <aside className="w-64 bg-[#1e192c] text-white flex flex-col">
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-[#832FFF] to-[#4c53ff] rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div>
              <h1 className="font-bold">DayLog</h1>
              <p className="text-xs text-white/60">后台管理</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4">
          <ul className="space-y-2">
            {menuItems.map((item) => (
              <li key={item.path}>
                <Link
                  to={item.path}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                    isActive(item.path)
                      ? 'bg-gradient-to-r from-[#832FFF] to-[#4c53ff] text-white'
                      : 'text-white/70 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <span className="text-lg">{item.icon}</span>
                  <span className="font-medium">{item.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="p-4 border-t border-white/10">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-gradient-to-br from-[#FF5374] to-[#FF8C42] rounded-xl flex items-center justify-center text-white font-bold">
              {admin?.display_name?.charAt(0) || 'A'}
            </div>
            <div>
              <p className="font-medium">{admin?.display_name}</p>
              <p className="text-xs text-white/60">{admin?.role === 'super_admin' ? '超级管理员' : '管理员'}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full py-2 text-sm text-white/70 hover:text-white hover:bg-white/10 rounded-xl transition-all"
          >
            退出登录
          </button>
        </div>
      </aside>

      {/* 主内容区 */}
      <main className="flex-1 overflow-auto">
        {/* 顶部栏 */}
        <header className="bg-white border-b border-[var(--color-border)] px-8 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-[var(--color-text-primary)]">后台管理系统</h2>
            <a
              href="/"
              target="_blank"
              className="text-sm text-[var(--color-primary)] hover:underline"
            >
              访问前台 →
            </a>
          </div>
        </header>

        {/* 内容区 */}
        <div className="p-8">
          {location.pathname === '/admin/dashboard' && stats && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <StatCard title="用户总数" value={stats.total_users} icon="👥" color="from-blue-500 to-cyan-500" />
              <StatCard title="页面总数" value={stats.total_pages} icon="📄" color="from-purple-500 to-pink-500" />
              <StatCard title="块总数" value={stats.total_blocks} icon="📦" color="from-green-500 to-emerald-500" />
              <StatCard title="待审核" value={stats.pending_reviews} icon="⏳" color="from-orange-500 to-red-500" />
            </div>
          )}
          
          <Outlet />
        </div>
      </main>
    </div>
  );
}

function StatCard({ title, value, icon, color }: { title: string; value: number; icon: string; color: string }) {
  return (
    <div className="bg-white rounded-2xl p-6 border border-[var(--color-border)] hover:shadow-lg transition-all">
      <div className="flex items-center justify-between mb-4">
        <div className={`w-12 h-12 bg-gradient-to-br ${color} rounded-xl flex items-center justify-center text-2xl`}>
          {icon}
        </div>
      </div>
      <p className="text-3xl font-bold text-[var(--color-text-primary)]">{value}</p>
      <p className="text-sm text-[var(--color-text-muted)] mt-1">{title}</p>
    </div>
  );
}
