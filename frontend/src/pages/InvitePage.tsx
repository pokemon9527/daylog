import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { invitationApi } from '../api/client';
import { useAuthStore } from '../stores';
import type { InvitationInfo } from '../types';

export default function InvitePage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();
  const [invitation, setInvitation] = useState<InvitationInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (token) {
      loadInvitation();
    }
  }, [token]);

  const loadInvitation = async () => {
    try {
      const { data } = await invitationApi.getByToken(token!);
      setInvitation(data);
    } catch (err: any) {
      setError(err.response?.data?.error || '邀请不存在或已过期');
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async () => {
    if (!isAuthenticated) {
      // 保存 token 到 localStorage，登录后继续
      localStorage.setItem('pendingInvitation', token!);
      navigate('/login');
      return;
    }

    setProcessing(true);
    try {
      await invitationApi.accept(token!);
      setSuccess('已成功加入工作空间！');
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
    } catch (err: any) {
      setError(err.response?.data?.error || '接受邀请失败');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    setProcessing(true);
    try {
      await invitationApi.reject(token!);
      setSuccess('已拒绝邀请');
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
    } catch (err: any) {
      setError(err.response?.data?.error || '拒绝邀请失败');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg-secondary)]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-[var(--color-text-muted)]">加载中...</p>
        </div>
      </div>
    );
  }

  if (error && !invitation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg-secondary)]">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-[var(--color-text-primary)] mb-2">邀请无效</h1>
          <p className="text-[var(--color-text-secondary)] mb-6">{error}</p>
          <Link
            to="/login"
            className="inline-block px-6 py-3 bg-gradient-to-r from-[#832FFF] to-[#4c53ff] text-white rounded-xl font-medium hover:shadow-lg transition-all"
          >
            前往登录
          </Link>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg-secondary)]">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-[var(--color-text-primary)] mb-2">{success}</h1>
          <p className="text-[var(--color-text-muted)]">正在跳转...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg-secondary)]">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full">
        {/* 品牌标识 */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-gradient-to-br from-[#832FFF] to-[#4c53ff] rounded-xl flex items-center justify-center mx-auto mb-3">
            <span className="text-white text-xl">📝</span>
          </div>
          <h1 className="text-lg font-bold text-[var(--color-text-primary)]">DayLog</h1>
        </div>

        {/* 邀请信息 */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-gradient-to-r from-[rgba(131,47,255,0.1)] to-[rgba(76,83,255,0.1)] rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">{invitation?.workspace_icon || '📁'}</span>
          </div>
          <h2 className="text-xl font-bold text-[var(--color-text-primary)] mb-2">
            {invitation?.inviter_name} 邀请你加入
          </h2>
          <p className="text-2xl font-bold bg-gradient-to-r from-[#832FFF] to-[#4c53ff] bg-clip-text text-transparent">
            {invitation?.workspace_name}
          </p>
          <p className="text-sm text-[var(--color-text-muted)] mt-2">
            角色：{invitation?.role === 'admin' ? '管理员' : invitation?.role === 'member' ? '成员' : '访客'}
          </p>
        </div>

        {/* 邮箱验证 */}
        {invitation && user && user.email !== invitation.invitee_email && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-4">
            <p className="text-sm text-yellow-700">
              此邀请是发送给 <strong>{invitation.invitee_email}</strong> 的，
              当前登录的账号是 <strong>{user.email}</strong>
            </p>
          </div>
        )}

        {/* 错误提示 */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* 操作按钮 */}
        <div className="flex gap-3">
          <button
            onClick={handleReject}
            disabled={processing}
            className="flex-1 px-6 py-3 border border-[var(--color-border)] text-[var(--color-text-secondary)] rounded-xl font-medium hover:bg-[var(--color-bg-hover)] transition-all disabled:opacity-50"
          >
            拒绝
          </button>
          <button
            onClick={handleAccept}
            disabled={processing || !!(invitation && user && user.email !== invitation.invitee_email)}
            className="flex-1 px-6 py-3 bg-gradient-to-r from-[#832FFF] to-[#4c53ff] text-white rounded-xl font-medium hover:shadow-lg transition-all disabled:opacity-50"
          >
            {processing ? '处理中...' : isAuthenticated ? '接受邀请' : '登录并接受'}
          </button>
        </div>

        {/* 底部提示 */}
        <p className="text-xs text-center text-[var(--color-text-muted)] mt-6">
          邀请有效期至 {invitation && new Date(invitation.expires_at).toLocaleDateString('zh-CN')}
        </p>
      </div>
    </div>
  );
}
