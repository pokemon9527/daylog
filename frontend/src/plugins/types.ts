import type { ComponentType, LazyExoticComponent } from 'react';
import type { Block, BlockType } from '../types';

// 块属性接口
export interface BlockProps {
  block: Block;
  onUpdate: (content: string) => void;
  onDelete?: () => void;
  onSlashCommand?: () => void;
  readOnly?: boolean;
}

// 工具栏项接口
export interface ToolbarItem {
  label: string;
  icon: string;
  action: (block: Block, update: (content: string) => void) => void;
}

// 快捷键配置接口
export interface ShortcutConfig {
  key: string;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  action: (block: Block, update: (content: string) => void) => void;
}

// 块插件接口
export interface BlockPlugin {
  // 基本信息
  type: BlockType;
  name: string;
  icon: string;
  description?: string;
  
  // 组件
  component: LazyExoticComponent<ComponentType<BlockProps>> | ComponentType<BlockProps>;
  
  // 生命周期钩子
  onCreate?: () => { content: string; props: string };
  onSerialize?: (data: any) => string;
  onDeserialize?: (json: string) => any;
  
  // 扩展功能
  toolbar?: ToolbarItem[];
  shortcuts?: ShortcutConfig[];
  
  // 样式
  className?: string;
  
  // 是否支持嵌套
  supportsChildren?: boolean;
  
  // 是否可以转换为其他类型
  convertibleTo?: BlockType[];
  
  // 优先级（用于排序和冲突解决）
  priority?: number;
}

// 插件注册选项
export interface PluginRegistrationOptions {
  overwrite?: boolean;
  priority?: number;
}

// 插件事件类型
export type PluginEventType = 
  | 'onRegister'
  | 'onUnregister'
  | 'onActivate'
  | 'onDeactivate'
  | 'onCreate'
  | 'onUpdate'
  | 'onDelete';

// 插件事件处理器
export interface PluginEventHandler {
  type: PluginEventType;
  handler: (plugin: BlockPlugin, data?: any) => void;
}

// 插件配置
export interface PluginConfig {
  enabled: boolean;
  options?: Record<string, any>;
}

// 插件系统配置
export interface PluginSystemConfig {
  autoRegister?: boolean;
  strictMode?: boolean;
  maxPlugins?: number;
}
