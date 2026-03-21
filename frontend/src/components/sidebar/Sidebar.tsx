import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { pageApi, workspaceApi, searchApi } from '../../api/client';
import { useAppStore, useAuthStore } from '../../stores';
import type { Page, Workspace, WorkspaceMemberInfo } from '../../types';

export default function Sidebar() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [members, setMembers] = useState<WorkspaceMemberInfo[]>([]);
  const [showWsMenu, setShowWsMenu] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [newWsName, setNewWsName] = useState('');
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberRole, setNewMemberRole] = useState('member');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{ page_id: string; title: string; preview: string }[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const navigate = useNavigate();
  const { sidebarOpen, currentWorkspace, currentPage, pages, setCurrentPage, setCurrentWorkspace, setPages } = useAppStore();
  const { user, logout } = useAuthStore();

  // 加载工作空间列表
  useEffect(() => {
    loadWorkspaces();
  }, []);

  // 加载页面列表
  useEffect(() => {
    if (currentWorkspace) {
      loadPages();
      loadMembers();
    } else {
      setMembers([]);
    }
  }, [currentWorkspace]);

  const loadWorkspaces = async () => {
    try {
      const { data } = await workspaceApi.list();
      const wsList = data || [];
      setWorkspaces(wsList);
      // 如果没有当前工作空间，自动选择第一个
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

  const handleAddMember = async () => {
    if (!currentWorkspace || !newMemberEmail.trim()) return;
    try {
      await workspaceApi.addMember(currentWorkspace.id, {
        email: newMemberEmail.trim(),
        role: newMemberRole,
      });
      setNewMemberEmail('');
      setNewMemberRole('member');
      loadMembers();
    } catch (err: any) {
      console.error('添加成员失败:', err);
      alert(err.response?.data?.error || '添加成员失败');
    }
  };

  const handleUpdateRole = async (userId: string, role: string) => {
    if (!currentWorkspace) return;
    try {
      await workspaceApi.updateMemberRole(currentWorkspace.id, userId, { role });
      setMembers((prev) => prev.map((m) => m.user_id === userId ? { ...m, role } : m));
    } catch (err: any) {
      console.error('更新角色失败:', err);
      alert(err.response?.data?.error || '更新角色失败');
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!currentWorkspace) return;
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

  const handleSelectPage = (page: Page) => {
    setCurrentPage(page);
    navigate(`/page/${page.id}`);
    setShowSearch(false);
    setSearchQuery('');
  };

  const handleDeletePage = async (e: React.MouseEvent, pageId: string) => {
    e.stopPropagation();
    try {
      await pageApi.delete(pageId);
      setPages((prev) => prev.filter((p) => p.id !== pageId));
      if (currentPage?.id === pageId) {
        navigate('/');
      }
    } catch (err) {
      console.error('删除页面失败:', err);
    }
  };

  // 搜索
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
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col h-screen">
      {/* 用户信息 */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
            {user?.display_name?.charAt(0) || '?'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {user?.display_name}
            </p>
            <p className="text-xs text-gray-500 truncate">{user?.email}</p>
          </div>
        </div>
      </div>

      {/* 工作空间选择器 */}
      <div className="px-3 py-2 border-b border-gray-100">
        <button
          onClick={() => setShowWsMenu(!showWsMenu)}
          className="w-full flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-gray-50 text-left"
        >
          <span className="text-sm font-medium text-gray-700 truncate">
            {currentWorkspace?.name || '选择工作空间'}
          </span>
          <span className="text-xs text-gray-400">{showWsMenu ? '▲' : '▼'}</span>
        </button>

        {showWsMenu && (
          <div className="mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-1">
            {workspaces.map((ws) => (
              <button
                key={ws.id}
                onClick={() => {
                  setCurrentWorkspace(ws);
                  setShowWsMenu(false);
                }}
                className={`w-full text-left px-3 py-1.5 rounded text-sm ${
                  currentWorkspace?.id === ws.id
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                {ws.icon_emoji || '📁'} {ws.name}
              </button>
            ))}
            <hr className="my-1 border-gray-100" />
            <div className="flex gap-1 px-1">
              <input
                type="text"
                value={newWsName}
                onChange={(e) => setNewWsName(e.target.value)}
                placeholder="新工作空间名称"
                className="flex-1 px-2 py-1 text-xs border border-gray-200 rounded"
                onKeyDown={(e) => e.key === 'Enter' && handleCreateWorkspace()}
              />
              <button
                onClick={handleCreateWorkspace}
                className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                创建
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 搜索框 */}
      <div className="px-3 py-2">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setShowSearch(true);
          }}
          onFocus={() => setShowSearch(true)}
          placeholder="搜索页面..."
          className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-transparent outline-none"
        />

        {/* 搜索结果 */}
        {showSearch && searchResults.length > 0 && (
          <div className="mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
            {searchResults.map((r) => (
              <button
                key={r.page_id}
                onClick={() => {
                  const page = pages.find((p) => p.id === r.page_id);
                  if (page) handleSelectPage(page);
                  else navigate(`/page/${r.page_id}`);
                }}
                className="w-full text-left px-3 py-2 hover:bg-gray-50 border-b border-gray-50 last:border-0"
              >
                <p className="text-sm font-medium text-gray-900 truncate">{r.title || '未命名'}</p>
                {r.preview && (
                  <p className="text-xs text-gray-500 truncate mt-0.5">{r.preview}</p>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 页面列表 */}
      <div className="flex-1 overflow-y-auto p-2">
        <div className="flex items-center justify-between px-2 py-1 mb-1">
          <span className="text-xs font-medium text-gray-500 uppercase">页面</span>
          <button
            onClick={handleCreatePage}
            disabled={!currentWorkspace}
            className="w-5 h-5 flex items-center justify-center rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 disabled:opacity-30"
            title="新建页面"
          >
            +
          </button>
        </div>

        {pages.map((page) => (
          <div
            key={page.id}
            onClick={() => handleSelectPage(page)}
            className={`flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer group ${
              currentPage?.id === page.id
                ? 'bg-gray-100 text-gray-900'
                : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            <span className="text-sm">{page.icon_emoji || '📄'}</span>
            <span className="flex-1 text-sm truncate">
              {page.title || '未命名页面'}
            </span>
            <button
              onClick={(e) => handleDeletePage(e, page.id)}
              className="opacity-0 group-hover:opacity-100 w-5 h-5 flex items-center justify-center rounded hover:bg-gray-200 text-gray-400 hover:text-red-500 text-xs"
            >
              x
            </button>
          </div>
        ))}

        {pages.length === 0 && currentWorkspace && (
          <p className="text-xs text-gray-400 px-2 py-4 text-center">
            暂无页面，点击 + 创建
          </p>
        )}
      </div>

      {/* 工作空间成员 */}
      {currentWorkspace && (
        <div className="border-t border-gray-100">
          <button
            onClick={() => setShowMembers(!showMembers)}
            className="w-full flex items-center justify-between px-4 py-2 text-xs font-medium text-gray-500 hover:bg-gray-50"
          >
            <span>成员 ({members.length})</span>
            <span>{showMembers ? '▲' : '▼'}</span>
          </button>

          {showMembers && (
            <div className="px-2 pb-2 max-h-64 overflow-y-auto">
              {members.map((m) => (
                <div key={m.user_id} className="flex items-center gap-2 px-2 py-1.5 rounded-md group">
                  <div className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center text-xs text-gray-600 font-medium shrink-0">
                    {m.display_name?.charAt(0) || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-700 truncate">{m.display_name}</p>
                    <p className="text-xs text-gray-400 truncate">
                      {m.role === 'owner' ? '拥有者' : m.role === 'admin' ? '管理员' : m.role === 'member' ? '成员' : '访客'}
                    </p>
                  </div>
                  {m.role !== 'owner' && user?.id === currentWorkspace.owner_id && (
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 shrink-0">
                      <select
                        value={m.role}
                        onChange={(e) => handleUpdateRole(m.user_id, e.target.value)}
                        className="text-xs border border-gray-200 rounded px-1 py-0.5 bg-white"
                      >
                        <option value="admin">管理员</option>
                        <option value="member">成员</option>
                        <option value="guest">访客</option>
                      </select>
                      <button
                        onClick={() => handleRemoveMember(m.user_id)}
                        className="text-xs text-gray-400 hover:text-red-500 px-1"
                        title="移除成员"
                      >
                        x
                      </button>
                    </div>
                  )}
                </div>
              ))}

              {/* 邀请成员 */}
              {user?.id === currentWorkspace.owner_id && (
                <div className="mt-2 px-1 space-y-1">
                  <input
                    type="email"
                    value={newMemberEmail}
                    onChange={(e) => setNewMemberEmail(e.target.value)}
                    placeholder="输入邮箱邀请"
                    className="w-full px-2 py-1 text-xs border border-gray-200 rounded"
                    onKeyDown={(e) => e.key === 'Enter' && handleAddMember()}
                  />
                  <div className="flex gap-1">
                    <select
                      value={newMemberRole}
                      onChange={(e) => setNewMemberRole(e.target.value)}
                      className="flex-1 px-2 py-1 text-xs border border-gray-200 rounded bg-white"
                    >
                      <option value="member">成员</option>
                      <option value="admin">管理员</option>
                      <option value="guest">访客</option>
                    </select>
                    <button
                      onClick={handleAddMember}
                      className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 shrink-0"
                    >
                      邀请
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 底部操作 */}
      <div className="p-3 border-t border-gray-200">
        <button
          onClick={() => {
            logout();
            navigate('/login');
          }}
          className="w-full text-left px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-md"
        >
          退出登录
        </button>
      </div>
    </aside>
  );
}
