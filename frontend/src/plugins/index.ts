import { pluginRegistry } from './registry';
import {
  paragraphPlugin,
  heading1Plugin,
  heading2Plugin,
  heading3Plugin,
  bulletListPlugin,
  numberedListPlugin,
  todoPlugin,
  codePlugin,
  quotePlugin,
  dividerPlugin,
  canvasPlugin,
  tablePlugin,
  embedPlugin,
  imagePlugin,
  mapPlugin,
} from './builtin';

// 初始化插件系统
export function initializePlugins(): void {
  // 注册所有内置插件
  const builtinPlugins = [
    paragraphPlugin,
    heading1Plugin,
    heading2Plugin,
    heading3Plugin,
    bulletListPlugin,
    numberedListPlugin,
    todoPlugin,
    codePlugin,
    quotePlugin,
    dividerPlugin,
    canvasPlugin,
    tablePlugin,
    embedPlugin,
    imagePlugin,
    mapPlugin,
  ];

  pluginRegistry.registerAll(builtinPlugins);
  
  console.log(`插件系统初始化完成，已注册 ${pluginRegistry.size} 个插件`);
}

// 导出插件系统
export { pluginRegistry } from './registry';
export type { BlockPlugin, BlockProps, ToolbarItem, ShortcutConfig } from './types';

// 导出内置插件
export * from './builtin';
