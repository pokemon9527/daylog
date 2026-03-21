import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { pageApi, workspaceApi, searchApi, invitationApi } from '../../api/client';
import { useAppStore, useAuthStore } from '../../stores';
import type { Page, Workspace, WorkspaceMemberInfo, InvitationInfo } from '../../types';
import NotificationBell from '../notification/NotificationBell';

export default function Sidebar() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [members, setMembers] = useState<WorkspaceMemberInfo[]>([]);
  const [invitations, setInvitations] = useState<InvitationInfo[]>([]);
  const [showWsMenu, setShowWsMenu] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [newWsName, setNewWsName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('member');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{ page_id: string; title: string; preview: string }[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const navigate = useNavigate();
  const { sidebarOpen, currentWorkspace, currentPage, pages, setCurrentPage, setCurrentWorkspace, setPages } = useAppStore();
  const { user, logout } = useAuthStore();

  useEffect(() => {
    loadWorkspaces();
  }, []);

  useEffect(() => {
    if (currentPage && workspaces.length > 0) {
      const pageWorkspace = workspaces.find(ws => ws.id === currentPage.workspace_id);
      if (pageWorkspace && (!currentWorkspace || currentWorkspace.id !== pageWorkspace.id)) {
        setCurrentWorkspace(pageWorkspace);
      }
    }
  }, [currentPage, workspaces]);

  useEffect(() => {
    if (currentWorkspace) {
      loadPages();
      loadMembers();
      loadInvitations();
    } else {
      setMembers([]);
      setInvitations([]);
    }
  }, [currentWorkspace]);

  const loadWorkspaces = async () => {
    try {
      const { data } = await workspaceApi.list();
      const wsList = data || [];
      setWorkspaces(wsList);
      if (!currentWorkspace && wsList.length > 0) {
        setCurrentWorkspace(wsList[0]);
      }
    } catch (err) {
      console.error('加载工作空间失败:', err);
    }
  };

  const loadPages = async () => {
    if (!currentWorkspace) return;
    try {
      const { data } = await pageApi.list(currentWorkspace.id);
      setPages(data || []);
    } catch (err) {
      console.error('加载页面列表失败:', err);
    }
  };

  const loadMembers = async () => {
    if (!currentWorkspace) return;
    try {
      const { data } = await workspaceApi.getMembers(currentWorkspace.id);
      setMembers(data || []);
    } catch (err) {
      console.error('加载成员失败:', err);
    }
  };

  const loadInvitations = async () => {
    if (!currentWorkspace) return;
    try {
      const { data } = await invitationApi.list(currentWorkspace.id);
      setInvitations(data || []);
    } catch (err) {
      console.error('加载邀请列表失败:', err);
    }
  };

  // 发送邀请
  const handleInviteMember = async () => {
    if (!currentWorkspace || !inviteEmail.trim()) return;
    try {
      await invitationApi.create(currentWorkspace.id, {
        email: inviteEmail.trim(),
        role: inviteRole,
      });
      setInviteEmail('');
      setInviteRole('member');
      setShowInviteModal(false);
      loadInvitations();
      alert('邀请已发送！');
    } catch (err: any) {
      console.error('发送邀请失败:', err);
      alert(err.response?.data?.error || '发送邀请失败');
    }
  };

  // 取消邀请
  const handleCancelInvitation = async (invitationId: string) => {
    if (!currentWorkspace) return;
    if (!confirm('确定要取消这个邀请吗？')) return;
    try {
      await invitationApi.cancel(currentWorkspace.id, invitationId);
      setInvitations((prev) => prev.filter((i) => i.id !== invitationId));
    } catch (err) {
      console.error('取消邀请失败:', err);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!currentWorkspace) return;
    if (!confirm('确定要移除这个成员吗？')) return;
    try {
      await workspaceApi.removeMember(currentWorkspace.id, userId);
      setMembers((prev) => prev.filter((m) => m.user_id !== userId));
    } catch (err) {
      console.error('移除成员失败:', err);
    }
  };

  const handleCreateWorkspace = async () => {
    if (!newWsName.trim()) return;
    try {
      const { data } = await workspaceApi.create({ name: newWsName.trim() });
      setWorkspaces((prev) => [...prev, data]);
      setCurrentWorkspace(data);
      setNewWsName('');
      setShowWsMenu(false);
    } catch (err) {
      console.error('创建工作空间失败:', err);
    }
  };

  const handleCreatePage = async () => {
    if (!currentWorkspace) return;
    try {
      const { data } = await pageApi.create({
        workspace_id: currentWorkspace.id,
        title: '',
      });
      setPages((prev) => [...prev, data]);
      setCurrentPage(data);
      navigate(`/page/${data.id}`);
    } catch (err) {
      console.error('创建页面失败:', err);
    }
  };

  const handleDeletePage = async (e: React.MouseEvent, pageId: string) => {
    e.stopPropagation();
    if (!confirm('确定要删除这个页面吗？')) return;
    try {
      await pageApi.delete(pageId);
      setPages((prev) => prev.filter((p) => p.id !== pageId));
      if (currentPage?.id === pageId) {
        const remaining = pages.filter((p) => p.id !== pageId);
        if (remaining.length > 0) {
          handleSelectPage(remaining[0]);
        } else {
          navigate('/dashboard');
        }
      }
    } catch (err) {
      console.error('删除页面失败:', err);
    }
  };

  const handleSelectPage = (page: Page) => {
    setCurrentPage(page);
    navigate(`/page/${page.id}`);
  };

  useEffect(() => {
    if (!searchQuery.trim() || !currentWorkspace) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const { data } = await searchApi.search(searchQuery, currentWorkspace.id);
        setSearchResults(data || []);
      } catch {
        setSearchResults([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, currentWorkspace]);

  if (!sidebarOpen) return null;

  return (
    <aside className="w-60 h-screen flex flex-col border-r border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
      {/* 品牌头部 */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#832FFF] via-[#a65ef7] to-[#4c53ff] opacity-90"></div>
        <div className="relative px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
              <span className="text-white text-lg">📝</span>
            </div>
            <div>
              <h1 className="text-white font-bold text-lg tracking-tight">DayLog</h1>
              <p className="text-white/70 text-xs">协作笔记平台</p>
            </div>
          </div>
        </div>
      </div>

      {/* 用户信息和通知 */}
      <div className="px-3 py-2 flex items-center justify-between">
        <div className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-[var(--color-bg-hover)] cursor-pointer transition-all duration-200 flex-1">
          <div className="w-8 h-8 bg-gradient-to-br from-[#FF5374] to-[#FF8C42] rounded-lg flex items-center justify-center text-white text-sm font-semibold shadow-sm">
            {user?.display_name?.charAt(0) || '?'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-[var(--color-text-primary)] truncate">
              {user?.display_name || '用户'}
            </p>
          </div>
        </div>
        {/* 通知铃铛 */}
        <NotificationBell />
      </div>

      {/* 搜索框 */}
      <div className="px-3 py-1">
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setShowSearch(true);
            }}
            onFocus={() => setShowSearch(true)}
            placeholder="搜索页面..."
            className="w-full pl-9 pr-3 py-2 text-sm bg-[var(--color-bg-tertiary)] rounded-xl border border-transparent focus:bg-white focus:border-[var(--color-primary)] focus:shadow-[var(--shadow-glow-sm)] outline-none transition-all duration-200 placeholder-[var(--color-text-placeholder)]"
          />
        </div>

        {/* 搜索结果 */}
        {showSearch && searchResults.length > 0 && (
          <div className="absolute left-2 right-2 mt-2 bg-white border border-[var(--color-border)] rounded-2xl shadow-[var(--shadow-lg)] max-h-64 overflow-y-auto z-50">
            <div className="p-2">
              {searchResults.map((r) => (
                <button
                  key={r.page_id}
                  onClick={() => {
                    const page = pages.find((p) => p.id === r.page_id);
                    if (page) handleSelectPage(page);
                    else navigate(`/page/${r.page_id}`);
                    setShowSearch(false);
                    setSearchQuery('');
                  }}
                  className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-[var(--color-bg-hover)] transition-colors duration-150"
                >
                  <p className="text-sm font-medium text-[var(--color-text-primary)] truncate">{r.title || '未命名'}</p>
                  {r.preview && (
                    <p className="text-xs text-[var(--color-text-muted)] truncate mt-0.5">{r.preview}</p>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 工作空间列表 */}
      <div className="px-3 py-1">
        <div className="flex items-center justify-between px-3 py-1.5">
          <span className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">工作空间</span>
          <button
            onClick={() => setShowWsMenu(!showWsMenu)}
            className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-[var(--color-bg-hover)] text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-all duration-200"
          >
            <svg className={`w-4 h-4 transition-transform duration-200 ${showWsMenu ? 'rotate-45' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </button>
        </div>

        {/* 工作空间菜单 */}
        {showWsMenu && (
          <div className="ml-2 mb-2 bg-white border border-[var(--color-border)] rounded-2xl shadow-[var(--shadow-lg)] p-2">
            {workspaces.map((ws) => (
              <button
                key={ws.id}
                onClick={() => {
                  setCurrentWorkspace(ws);
                  setShowWsMenu(false);
                }}
                className={`w-full text-left px-3 py-2 rounded-xl text-sm flex items-center gap-2 transition-all duration-150 ${
                  currentWorkspace?.id === ws.id
                    ? 'bg-gradient-to-r from-[rgba(131,47,255,0.1)] to-[rgba(76,83,255,0.1)] text-[var(--color-primary)]'
                    : 'text-[var(--color-text-primary)] hover:bg-[var(--color-bg-hover)]'
                }`}
              >
                <span className="w-6 h-6 flex items-center justify-center rounded-lg bg-[var(--color-bg-tertiary)] text-sm">{ws.icon_emoji || '📁'}</span>
                <span className="truncate font-medium">{ws.name}</span>
              </button>
            ))}
            <div className="my-2 h-px bg-[var(--color-border)]"></div>
            <div className="flex gap-2 px-2">
              <input
                type="text"
                value={newWsName}
                onChange={(e) => setNewWsName(e.target.value)}
                placeholder="新工作空间"
                className="flex-1 px-3 py-1.5 text-sm bg-[var(--color-bg-tertiary)] rounded-xl outline-none"
                onKeyDown={(e) => e.key === 'Enter' && handleCreateWorkspace()}
              />
              <button
                onClick={handleCreateWorkspace}
                className="px-3 py-1.5 text-sm bg-gradient-to-r from-[#832FFF] to-[#4c53ff] text-white rounded-xl font-medium"
              >
                创建
              </button>
            </div>
          </div>
        )}

        {/* 当前工作空间 */}
        {currentWorkspace && !showWsMenu && (
          <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-gradient-to-r from-[rgba(131,47,255,0.06)] to-[rgba(76,83,255,0.06)] border border-[rgba(131,47,255,0.1)]">
            <span className="w-7 h-7 flex items-center justify-center rounded-lg bg-white shadow-sm text-sm">
              {currentWorkspace.icon_emoji || '📁'}
            </span>
            <span className="text-sm font-semibold text-[var(--color-text-primary)] truncate">{currentWorkspace.name}</span>
          </div>
        )}
      </div>

      {/* 页面列表 */}
      <div className="flex-1 overflow-y-auto px-3 py-2">
        <div className="flex items-center justify-between px-3 py-1.5">
          <span className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">页面</span>
          <button
            onClick={handleCreatePage}
            disabled={!currentWorkspace}
            className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-[var(--color-primary)] hover:text-white text-[var(--color-text-muted)] disabled:opacity-30 transition-all duration-200"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </button>
        </div>

        <div className="space-y-0.5">
          {pages.map((page) => (
            <div
              key={page.id}
              onClick={() => handleSelectPage(page)}
              className={`group flex items-center gap-2.5 px-3 py-2 rounded-xl cursor-pointer transition-all duration-200 ${
                currentPage?.id === page.id
                  ? 'bg-gradient-to-r from-[rgba(131,47,255,0.12)] to-[rgba(76,83,255,0.08)] text-[var(--color-primary)]'
                  : 'text-[var(--color-text-primary)] hover:bg-[var(--color-bg-hover)]'
              }`}
            >
              <span className="text-base">{page.icon_emoji || '📄'}</span>
              <span className="flex-1 text-sm font-medium truncate">{page.title || '未命名页面'}</span>
              <button
                onClick={(e) => handleDeletePage(e, page.id)}
                className="opacity-0 group-hover:opacity-100 w-6 h-6 flex items-center justify-center rounded-lg hover:bg-red-100 text-[var(--color-text-muted)] hover:text-red-500 transition-all duration-200"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>

        {pages.length === 0 && currentWorkspace && (
          <div className="px-3 py-6 text-center">
            <div className="w-12 h-12 bg-gradient-to-br from-[rgba(131,47,255,0.1)] to-[rgba(76,83,255,0.1)] rounded-2xl flex items-center justify-center mx-auto mb-3">
              <span className="text-2xl">📝</span>
            </div>
            <p className="text-sm text-[var(--color-text-muted)]">暂无页面</p>
            <button onClick={handleCreatePage} className="text-sm text-[var(--color-primary)] hover:underline mt-2 font-medium">
              创建新页面
            </button>
          </div>
        )}
      </div>

      {/* 成员管理 */}
      {currentWorkspace && (
        <div className="border-t border-[var(--color-border)]">
          <button
            onClick={() => setShowMembers(!showMembers)}
            className="w-full flex items-center justify-between px-4 py-2.5 text-xs text-[var(--color-text-muted)] hover:bg-[var(--color-bg-hover)] transition-colors duration-200"
          >
            <span className="font-medium">成员 ({members.length})</span>
            <svg className={`w-3.5 h-3.5 transition-transform duration-200 ${showMembers ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {showMembers && (
            <div className="px-3 pb-3 max-h-64 overflow-y-auto">
              {/* 成员列表 */}
              {members.map((m) => (
                <div key={m.user_id} className="flex items-center gap-2.5 px-3 py-2 rounded-xl group hover:bg-[var(--color-bg-hover)] transition-colors duration-200">
                  <div className="w-7 h-7 bg-gradient-to-br from-[#00D4AA] to-[#5594FF] rounded-lg flex items-center justify-center text-xs text-white font-semibold">
                    {m.display_name?.charAt(0) || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-[var(--color-text-primary)] truncate">{m.display_name}</p>
                    <p className="text-[10px] text-[var(--color-text-muted)]">
                      {m.role === 'owner' ? '拥有者' : m.role === 'admin' ? '管理员' : '成员'}
                    </p>
                  </div>
                  {m.role !== 'owner' && user?.id === currentWorkspace.owner_id && (
                    <button
                      onClick={() => handleRemoveMember(m.user_id)}
                      className="opacity-0 group-hover:opacity-100 text-[var(--color-text-muted)] hover:text-red-500 transition-all duration-200"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              ))}

              {/* 待处理邀请 */}
              {invitations.filter(i => i.status === 'pending').length > 0 && (
                <>
                  <div className="px-3 py-2 text-xs text-[var(--color-text-muted)] font-medium">待处理邀请</div>
                  {invitations.filter(i => i.status === 'pending').map((inv) => (
                    <div key={inv.id} className="flex items-center gap-2.5 px-3 py-2 rounded-xl group hover:bg-[var(--color-bg-hover)]">
                      <div className="w-7 h-7 bg-[var(--color-bg-tertiary)] rounded-lg flex items-center justify-center text-xs text-[var(--color-text-muted)]">
                        ⏳
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-[var(--color-text-primary)] truncate">{inv.invitee_email}</p>
                        <p className="text-[10px] text-[var(--color-text-muted)]">等待接受</p>
                      </div>
                      <button
                        onClick={() => handleCancelInvitation(inv.id)}
                        className="opacity-0 group-hover:opacity-100 text-xs text-red-500 hover:text-red-700"
                      >
                        取消
                      </button>
                    </div>
                  ))}
                </>
              )}

              {/* 邀请按钮 */}
              {user?.id === currentWorkspace.owner_id && (
                <button
                  onClick={() => setShowInviteModal(true)}
                  className="w-full mt-2 px-3 py-2 text-xs text-[var(--color-primary)] hover:bg-[var(--color-bg-hover)] rounded-xl flex items-center justify-center gap-2 transition-all duration-200"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                  </svg>
                  邀请成员
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* 底部操作 */}
      <div className="px-3 py-3 border-t border-[var(--color-border)]">
        <button
          onClick={() => {
            logout();
            navigate('/login');
          }}
          className="w-full flex items-center gap-3 px-3 py-2 text-sm text-[var(--color-text-secondary)] hover:bg-red-50 hover:text-red-500 rounded-xl transition-all duration-200"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          <span className="font-medium">退出登录</span>
        </button>
      </div>

      {/* 邀请成员弹窗 */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setShowInviteModal(false)}>
          <div className="bg-white rounded-2xl shadow-xl p-6 w-96 max-w-[90vw]" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-[var(--color-text-primary)] mb-4">邀请成员</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">邮箱地址</label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="输入被邀请人的邮箱"
                  className="w-full px-4 py-2 border border-[var(--color-border)] rounded-xl outline-none focus:border-[var(--color-primary)]"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">角色</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  className="w-full px-4 py-2 border border-[var(--color-border)] rounded-xl outline-none focus:border-[var(--color-primary)]"
                >
                  <option value="member">成员</option>
                  <option value="admin">管理员</option>
                  <option value="guest">访客</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowInviteModal(false)}
                  className="flex-1 px-4 py-2 border border-[var(--color-border)] text-[var(--color-text-secondary)] rounded-xl hover:bg-[var(--color-bg-hover)] transition-all"
                >
                  取消
                </button>
                <button
                  onClick={handleInviteMember}
                  disabled={!inviteEmail.trim()}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-[#832FFF] to-[#4c53ff] text-white rounded-xl font-medium hover:shadow-lg transition-all disabled:opacity-50"
                >
                  发送邀请
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
