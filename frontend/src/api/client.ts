import axios from 'axios';
import type { AuthResponse, Page, Block, FileAttachment, Workspace, WorkspaceMemberInfo } from '../types';

const api = axios.create({
  baseURL: '/api/v1',
  timeout: 30000,
});

// 请求拦截器：添加 token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 响应拦截器：处理 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// 认证 API
export const authApi = {
  register: (data: { email: string; password: string; display_name: string }) =>
    api.post<AuthResponse>('/auth/register', data),

  login: (data: { email: string; password: string }) =>
    api.post<AuthResponse>('/auth/login', data),

  getMe: () => api.get('/me'),
};

// 页面 API
export const pageApi = {
  create: (data: { workspace_id: string; parent_page_id?: string; title: string; icon_emoji?: string }) =>
    api.post<Page>('/pages', data),

  get: (id: string) => api.get<Page>(`/pages/${id}`),

  list: (workspaceId: string) =>
    api.get<Page[]>(`/pages?workspace_id=${workspaceId}`),

  update: (id: string, data: { title?: string; icon_emoji?: string }) =>
    api.put(`/pages/${id}`, data),

  delete: (id: string) => api.delete(`/pages/${id}`),
};

// 块 API
export const blockApi = {
  create: (data: { page_id: string; parent_block_id?: string; block_type: string; content?: string; props?: string }) =>
    api.post<Block>('/blocks', data),

  batchCreate: (blocks: Array<{ page_id: string; block_type: string; content?: string; props?: string }>) =>
    api.post<Block[]>('/blocks/batch', blocks),

  list: (pageId: string) =>
    api.get<Block[]>(`/blocks?page_id=${pageId}`),

  get: (id: string) => api.get<Block>(`/blocks/${id}`),

  update: (id: string, data: { block_type?: string; content?: string; props?: string }) =>
    api.put(`/blocks/${id}`, data),

  delete: (id: string) => api.delete(`/blocks/${id}`),

  reorder: (data: { block_ids: string[]; sort_order: number[] }) =>
    api.post('/blocks/reorder', data),
};

// 文件 API
export const fileApi = {
  upload: (file: File, workspaceId: string, pageId?: string) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('workspace_id', workspaceId);
    if (pageId) formData.append('page_id', pageId);
    return api.post<FileAttachment>('/files/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  download: async (id: string, filename?: string) => {
    const token = localStorage.getItem('token');
    const resp = await fetch(`${api.defaults.baseURL}/files/${id}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!resp.ok) throw new Error('下载失败');
    const blob = await resp.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || 'download';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  },

  preview: (id: string) => `${api.defaults.baseURL}/files/${id}/preview`,

  list: (pageId: string) =>
    api.get<FileAttachment[]>(`/files?page_id=${pageId}`),

  delete: (id: string) => api.delete(`/files/${id}`),
};

// 工作空间 API
export const workspaceApi = {
  create: (data: { name: string; icon_emoji?: string }) =>
    api.post<Workspace>('/workspaces', data),

  list: () => api.get<Workspace[]>('/workspaces'),

  get: (id: string) => api.get<Workspace>(`/workspaces/${id}`),

  update: (id: string, data: { name?: string; icon_emoji?: string }) =>
    api.put(`/workspaces/${id}`, data),

  getMembers: (id: string) =>
    api.get<WorkspaceMemberInfo[]>(`/workspaces/${id}/members`),

  addMember: (id: string, data: { email: string; role: string }) =>
    api.post(`/workspaces/${id}/members`, data),

  updateMemberRole: (id: string, userId: string, data: { role: string }) =>
    api.put(`/workspaces/${id}/members/${userId}`, data),

  removeMember: (id: string, userId: string) =>
    api.delete(`/workspaces/${id}/members/${userId}`),
};

// 搜索 API
export const searchApi = {
  search: (query: string, workspaceId: string) =>
    api.get<{ page_id: string; title: string; preview: string; score: number }[]>(
      `/search?q=${encodeURIComponent(query)}&workspace_id=${workspaceId}`
    ),
};

// 权限 API
export const permissionApi = {
  getPagePermissions: (pageId: string) =>
    api.get(`/pages/${pageId}/permissions`),

  addPagePermission: (pageId: string, data: { user_id?: string; role_granted?: string; level: string }) =>
    api.post(`/pages/${pageId}/permissions`, data),

  removePagePermission: (pageId: string, permId: string) =>
    api.delete(`/pages/${pageId}/permissions/${permId}`),

  checkPermission: (pageId: string) =>
    api.get<{ page_id: string; permission: string }>(`/pages/${pageId}/permissions/check`),
};

export default api;
