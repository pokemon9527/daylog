// 用户类型
export interface User {
  id: string;
  email: string;
  display_name: string;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

// 认证响应
export interface AuthResponse {
  token: string;
  user: User;
}

// 工作空间
export interface Workspace {
  id: string;
  name: string;
  icon_emoji: string | null;
  owner_id: string;
  settings: string;
  created_at: string;
  updated_at: string;
}

// 工作空间成员
export interface WorkspaceMemberInfo {
  workspace_id: string;
  user_id: string;
  email: string;
  display_name: string;
  avatar_url: string | null;
  role: string;
  joined_at: string;
}

// 页面
export interface Page {
  id: string;
  workspace_id: string;
  parent_page_id: string | null;
  title: string;
  icon_emoji: string | null;
  sort_order: number;
  is_archived: boolean;
  is_trash: boolean;
  created_by: string;
  last_edited_by: string | null;
  created_at: string;
  updated_at: string;
}

// 块类型
export type BlockType =
  | 'paragraph'
  | 'heading_1'
  | 'heading_2'
  | 'heading_3'
  | 'bulleted_list_item'
  | 'numbered_list_item'
  | 'to_do'
  | 'toggle'
  | 'code'
  | 'quote'
  | 'callout'
  | 'divider'
  | 'image'
  | 'file'
  | 'bookmark'
  | 'canvas';

// 块
export interface Block {
  id: string;
  page_id: string;
  parent_block_id: string | null;
  block_type: BlockType;
  sort_order: number;
  content: string;
  props: string;
  is_archived: boolean;
  created_by: string;
  last_edited_by: string | null;
  created_at: string;
  updated_at: string;
}

// 文件附件
export interface FileAttachment {
  id: string;
  workspace_id: string;
  page_id: string | null;
  filename: string;
  original_name: string;
  mime_type: string;
  file_size: number;
  storage_path: string;
  uploaded_by: string;
  created_at: string;
}

// API 错误响应
export interface ApiError {
  error: string;
}
