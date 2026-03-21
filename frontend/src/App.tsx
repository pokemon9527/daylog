import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import EditorPage from './pages/EditorPage';
import PublicPreviewPage from './pages/PublicPreviewPage';
import InvitePage from './pages/InvitePage';
import AdminLoginPage from './pages/admin/AdminLoginPage';
import AdminDashboardPage from './pages/admin/AdminDashboardPage';
import AdminUsersPage from './pages/admin/AdminUsersPage';
import AdminPagesPage from './pages/admin/AdminPagesPage';
import AdminBlocksPage from './pages/admin/AdminBlocksPage';
import AdminSensitivePage from './pages/admin/AdminSensitivePage';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* 官网首页 */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        {/* 公开预览页面 - 无需登录 */}
        <Route path="/share/:id" element={<PublicPreviewPage />} />
        {/* 邀请接受页面 */}
        <Route path="/invite/:token" element={<InvitePage />} />
        {/* 工作空间仪表板 - 需要登录 */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        {/* 页面编辑器 - 需要登录 */}
        <Route
          path="/page/:id"
          element={
            <ProtectedRoute>
              <EditorPage />
            </ProtectedRoute>
          }
        />
        {/* 管理员路由 */}
        <Route path="/admin" element={<AdminLoginPage />} />
        <Route path="/admin/dashboard" element={<AdminDashboardPage />}>
          <Route index element={
            <div className="text-center py-12">
              <h3 className="text-xl font-semibold text-[var(--color-text-primary)] mb-2">欢迎使用后台管理系统</h3>
              <p className="text-[var(--color-text-muted)]">请从左侧菜单选择功能</p>
            </div>
          } />
        </Route>
        <Route path="/admin/users" element={<AdminDashboardPage />}>
          <Route index element={<AdminUsersPage />} />
        </Route>
        <Route path="/admin/pages" element={<AdminDashboardPage />}>
          <Route index element={<AdminPagesPage />} />
        </Route>
        <Route path="/admin/blocks" element={<AdminDashboardPage />}>
          <Route index element={<AdminBlocksPage />} />
        </Route>
        <Route path="/admin/sensitive" element={<AdminDashboardPage />}>
          <Route index element={<AdminSensitivePage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
