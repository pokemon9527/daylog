import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { notificationApi, invitationApi } from '../../api/client';
import type { Notification as NotificationType } from '../../types';

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<NotificationType[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // 加载通知
  useEffect(() => {
    loadNotifications();
    // 每30秒刷新一次
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  // 点击外部关闭下拉框
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadNotifications = async () => {
    try {
      const { data } = await notificationApi.list();
      setNotifications(data.notifications || []);
      setUnreadCount(data.unread_count || 0);
    } catch (err) {
      console.error('加载通知失败:', err);
    }
  };

  const handleMarkAsRead = async (id: string) => {
    try {
      await notificationApi.markAsRead(id);
      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, is_read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('标记已读失败:', err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationApi.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('标记全部已读失败:', err);
    }
  };

  const handleAcceptInvitation = async (notification: NotificationType) => {
    const token = notification.data?.token;
    if (!token) return;

    setLoading(true);
    try {
      await invitationApi.accept(token);
      handleMarkAsRead(notification.id);
      loadNotifications();
      navigate('/dashboard');
    } catch (err: any) {
      alert(err.response?.data?.error || '接受邀请失败');
    } finally {
      setLoading(false);
    }
  };

  const handleRejectInvitation = async (notification: NotificationType) => {
    const token = notification.data?.token;
    if (!token) return;

    setLoading(true);
    try {
      await invitationApi.reject(token);
      handleMarkAsRead(notification.id);
      loadNotifications();
    } catch (err: any) {
      alert(err.response?.data?.error || '拒绝邀请失败');
    } finally {
      setLoading(false);
    }
  };

  const renderNotification = (notification: NotificationType) => {
    const isInvitation = notification.type === 'workspace_invitation';
    const isPending = notification.data?.status === 'pending' || !notification.is_read;

    return (
      <div
        key={notification.id}
        className={`p-3 border-b border-[var(--color-border-light)] hover:bg-[var(--color-bg-hover)] transition-colors ${
          !notification.is_read ? 'bg-[var(--color-primary-light)]' : ''
        }`}
      >
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 bg-gradient-to-r from-[#832FFF] to-[#4c53ff] rounded-lg flex items-center justify-center text-white text-sm flex-shrink-0">
            {isInvitation ? '📨' : '🔔'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-[var(--color-text-primary)]">{notification.title}</p>
            {notification.content && (
              <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{notification.content}</p>
            )}
            <p className="text-xs text-[var(--color-text-muted)] mt-1">
              {new Date(notification.created_at).toLocaleString('zh-CN')}
            </p>
            
            {/* 邀请操作按钮 */}
            {isInvitation && isPending && (
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => handleAcceptInvitation(notification)}
                  disabled={loading}
                  className="px-3 py-1 text-xs bg-gradient-to-r from-[#832FFF] to-[#4c53ff] text-white rounded-lg hover:shadow-md transition-all disabled:opacity-50"
                >
                  接受
                </button>
                <button
                  onClick={() => handleRejectInvitation(notification)}
                  disabled={loading}
                  className="px-3 py-1 text-xs border border-[var(--color-border)] text-[var(--color-text-secondary)] rounded-lg hover:bg-[var(--color-bg-hover)] transition-all disabled:opacity-50"
                >
                  拒绝
                </button>
              </div>
            )}
          </div>
          {!notification.is_read && (
            <button
              onClick={() => handleMarkAsRead(notification.id)}
              className="w-5 h-5 flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-colors"
              title="标为已读"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* 铃铛按钮 */}
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="relative w-9 h-9 flex items-center justify-center rounded-xl hover:bg-[var(--color-bg-hover)] transition-colors"
      >
        <svg className="w-5 h-5 text-[var(--color-text-secondary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {/* 未读数量徽标 */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-r from-[#FF5374] to-[#FF8C42] text-white text-xs font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* 下拉通知列表 */}
      {showDropdown && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl shadow-xl border border-[var(--color-border)] overflow-hidden z-50 animate-[scaleIn_0.15s_ease]">
          {/* 头部 */}
          <div className="flex items-center justify-between px-4 py-3 bg-[var(--color-bg-secondary)] border-b border-[var(--color-border)]">
            <h3 className="font-semibold text-[var(--color-text-primary)]">通知</h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="text-xs text-[var(--color-primary)] hover:underline"
              >
                全部已读
              </button>
            )}
          </div>

          {/* 通知列表 */}
          <div className="max-h-96 overflow-y-auto">
            {notifications.length > 0 ? (
              notifications.map(renderNotification)
            ) : (
              <div className="p-8 text-center">
                <div className="w-12 h-12 bg-[var(--color-bg-secondary)] rounded-full flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-[var(--color-text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                </div>
                <p className="text-sm text-[var(--color-text-muted)]">暂无通知</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
