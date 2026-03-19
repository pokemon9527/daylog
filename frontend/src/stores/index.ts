import { create } from 'zustand';
import type { User, Workspace, Page } from '../types';

// 认证状态
interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (user: User, token: string) => void;
  logout: () => void;
  loadFromStorage: () => void;
}

// 同步从 localStorage 初始化状态
function loadInitialState(): { user: User | null; token: string | null; isAuthenticated: boolean } {
  const token = localStorage.getItem('token');
  const userStr = localStorage.getItem('user');
  if (token && userStr) {
    try {
      const user = JSON.parse(userStr);
      return { user, token, isAuthenticated: true };
    } catch {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
  }
  return { user: null, token: null, isAuthenticated: false };
}

export const useAuthStore = create<AuthState>((set) => ({
  ...loadInitialState(),

  login: (user, token) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    set({ user, token, isAuthenticated: true });
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    set({ user: null, token: null, isAuthenticated: false });
  },

  loadFromStorage: () => {
    const state = loadInitialState();
    set(state);
  },
}));

// 应用状态
interface AppState {
  currentWorkspace: Workspace | null;
  currentPage: Page | null;
  sidebarOpen: boolean;
  setCurrentWorkspace: (ws: Workspace | null) => void;
  setCurrentPage: (page: Page | null) => void;
  toggleSidebar: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  currentWorkspace: null,
  currentPage: null,
  sidebarOpen: true,

  setCurrentWorkspace: (ws) => set({ currentWorkspace: ws }),
  setCurrentPage: (page) => set({ currentPage: page }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
}));
