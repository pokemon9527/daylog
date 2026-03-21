import type { BlockPlugin, PluginRegistrationOptions, PluginSystemConfig } from './types';
import type { BlockType } from '../types';

// 插件事件类型
export type PluginEventType = 
  | 'onRegister'
  | 'onUnregister'
  | 'onActivate'
  | 'onDeactivate'
  | 'onCreate'
  | 'onUpdate'
  | 'onDelete';

class PluginRegistry {
  private plugins: Map<BlockType, BlockPlugin> = new Map();
  private eventHandlers: Map<PluginEventType, Set<(plugin: BlockPlugin, data?: any) => void>> = new Map();
  private config: PluginSystemConfig;

  constructor(config: PluginSystemConfig = {}) {
    this.config = {
      autoRegister: true,
      strictMode: false,
      maxPlugins: 50,
      ...config,
    };
  }

  // 注册插件
  register(plugin: BlockPlugin, options: PluginRegistrationOptions = {}): boolean {
    const { overwrite = false, priority } = options;

    // 检查是否已存在
    if (this.plugins.has(plugin.type) && !overwrite) {
      if (this.config.strictMode) {
        throw new Error(`插件 "${plugin.type}" 已注册，使用 overwrite: true 覆盖`);
      }
      console.warn(`插件 "${plugin.type}" 已注册，跳过`);
      return false;
    }

    // 检查插件数量限制
    if (this.plugins.size >= (this.config.maxPlugins || 50)) {
      throw new Error(`已达到最大插件数量限制 (${this.config.maxPlugins})`);
    }

    // 设置优先级
    const finalPlugin: BlockPlugin = {
      ...plugin,
      priority: priority ?? plugin.priority ?? 0,
    };

    this.plugins.set(plugin.type, finalPlugin);
    this.emit('onRegister', finalPlugin);
    
    return true;
  }

  // 注销插件
  unregister(type: BlockType): boolean {
    const plugin = this.plugins.get(type);
    if (!plugin) {
      return false;
    }

    this.plugins.delete(type);
    this.emit('onUnregister', plugin);
    return true;
  }

  // 获取插件
  get(type: BlockType): BlockPlugin | undefined {
    return this.plugins.get(type);
  }

  // 检查插件是否存在
  has(type: BlockType): boolean {
    return this.plugins.has(type);
  }

  // 获取所有插件
  getAll(): BlockPlugin[] {
    return Array.from(this.plugins.values())
      .sort((a, b) => (b.priority || 0) - (a.priority || 0));
  }

  // 获取插件类型列表
  getTypes(): BlockType[] {
    return Array.from(this.plugins.keys());
  }

  // 获取工具栏项
  getToolbarItems(): Array<{ type: BlockType; label: string; icon: string; description?: string }> {
    return this.getAll().map(plugin => ({
      type: plugin.type,
      label: plugin.name,
      icon: plugin.icon,
      description: plugin.description,
    }));
  }

  // 搜索插件
  search(query: string): BlockPlugin[] {
    const lowerQuery = query.toLowerCase();
    return this.getAll().filter(plugin => 
      plugin.name.toLowerCase().includes(lowerQuery) ||
      plugin.type.toLowerCase().includes(lowerQuery) ||
      plugin.description?.toLowerCase().includes(lowerQuery)
    );
  }

  // 获取可转换的目标类型
  getConvertibleTypes(sourceType: BlockType): BlockType[] {
    const plugin = this.get(sourceType);
    return plugin?.convertibleTo || [];
  }

  // 批量注册
  registerAll(plugins: BlockPlugin[]): number {
    let registered = 0;
    for (const plugin of plugins) {
      if (this.register(plugin)) {
        registered++;
      }
    }
    return registered;
  }

  // 清空所有插件
  clear(): void {
    this.plugins.clear();
  }

  // 获取插件数量
  get size(): number {
    return this.plugins.size;
  }

  // 事件系统
  on(type: PluginEventType, handler: (plugin: BlockPlugin, data?: any) => void): () => void {
    if (!this.eventHandlers.has(type)) {
      this.eventHandlers.set(type, new Set());
    }
    this.eventHandlers.get(type)!.add(handler);

    // 返回取消订阅函数
    return () => {
      this.eventHandlers.get(type)?.delete(handler);
    };
  }

  private emit(type: PluginEventType, plugin: BlockPlugin, data?: any): void {
    const handlers = this.eventHandlers.get(type);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(plugin, data);
        } catch (error) {
          console.error(`插件事件处理器错误 (${type}):`, error);
        }
      });
    }
  }

  // 获取配置
  getConfig(): PluginSystemConfig {
    return { ...this.config };
  }

  // 更新配置
  updateConfig(config: Partial<PluginSystemConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

// 创建全局插件注册表实例
export const pluginRegistry = new PluginRegistry();

// 导出类供高级用法
export { PluginRegistry };
