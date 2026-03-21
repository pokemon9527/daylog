import { useCallback, useState, Suspense, useEffect } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Block, BlockType } from '../../types';
import { pluginRegistry, initializePlugins } from '../../plugins';
import type { BlockPlugin } from '../../plugins';

interface BlockEditorProps {
  blocks: Block[];
  onCreateBlock: (blockType: string, afterBlockId?: string) => Promise<Block | undefined>;
  onUpdateBlock: (blockId: string, updates: { content?: string; props?: string; block_type?: string }) => Promise<void>;
  onDeleteBlock: (blockId: string) => Promise<void>;
  onReorderBlocks?: (blockId: string, newSortOrder: number) => Promise<void>;
}

// 初始化插件系统
initializePlugins();

// 可排序的块组件
function SortableBlock({
  block,
  isSelectMode,
  isSelected,
  onToggleSelect,
  onShowToolbar,
  renderContent,
}: {
  block: Block;
  isSelectMode: boolean;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
  onShowToolbar: (id?: string) => void;
  renderContent: (block: Block) => React.ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: block.id, disabled: isSelectMode });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative pl-8 ${isSelectMode ? 'cursor-pointer' : ''} ${
        isSelected ? 'bg-blue-50 -mx-2 px-10 py-1 rounded-lg' : ''
      }`}
      onClick={() => isSelectMode && onToggleSelect(block.id)}
    >
      {/* 块操作按钮 */}
      {!isSelectMode && (
        <div className="absolute left-0 top-0.5 flex items-center">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onShowToolbar(block.id);
            }}
            className="w-6 h-6 flex items-center justify-center rounded hover:bg-gray-100 text-gray-300 hover:text-gray-600 text-sm opacity-0 group-hover:opacity-100 transition-opacity"
            title="添加块"
          >
            +
          </button>
          <button
            className="w-6 h-6 flex items-center justify-center rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 cursor-grab touch-none active:cursor-grabbing"
            title="拖拽排序"
            {...attributes}
            {...listeners}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="9" cy="6" r="1.5" />
              <circle cx="15" cy="6" r="1.5" />
              <circle cx="9" cy="12" r="1.5" />
              <circle cx="15" cy="12" r="1.5" />
              <circle cx="9" cy="18" r="1.5" />
              <circle cx="15" cy="18" r="1.5" />
            </svg>
          </button>
        </div>
      )}

      {/* 选择框 */}
      {isSelectMode && (
        <div className="absolute left-0 top-1">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onToggleSelect(block.id)}
            className="w-4 h-4 rounded border-gray-300"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* 块内容 */}
      {renderContent(block)}
    </div>
  );
}

export default function BlockEditor({
  blocks,
  onCreateBlock,
  onUpdateBlock,
  onDeleteBlock,
  onReorderBlocks,
}: BlockEditorProps) {
  const [showToolbar, setShowToolbar] = useState(false);
  const [toolbarBlockId, setToolbarBlockId] = useState<string | null>(null);
  const [plugins, setPlugins] = useState<BlockPlugin[]>([]);
  
  // 批量选择相关状态
  const [selectedBlocks, setSelectedBlocks] = useState<Set<string>>(new Set());
  const [isSelectMode, setIsSelectMode] = useState(false);
  
  // 本地排序状态
  const [localBlocks, setLocalBlocks] = useState<Block[]>([]);

  // 拖拽传感器
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 3, // 减小激活距离
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // 同步外部 blocks 到本地状态
  useEffect(() => {
    setLocalBlocks([...blocks].sort((a, b) => a.sort_order - b.sort_order));
  }, [blocks]);

  // 获取所有注册的插件
  useEffect(() => {
    setPlugins(pluginRegistry.getAll());
  }, []);

  // 处理拖拽结束
  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;

      if (over && active.id !== over.id) {
        const oldIndex = localBlocks.findIndex((b) => b.id === active.id);
        const newIndex = localBlocks.findIndex((b) => b.id === over.id);

        const newBlocks = arrayMove(localBlocks, oldIndex, newIndex);
        setLocalBlocks(newBlocks);

        // 计算新的 sort_order
        if (onReorderBlocks) {
          let newSortOrder: number;
          
          if (newIndex === 0) {
            // 移动到第一个位置
            const firstOrder = newBlocks[1]?.sort_order || 1000;
            newSortOrder = firstOrder / 2;
          } else if (newIndex === newBlocks.length - 1) {
            // 移动到最后一个位置
            const lastOrder = newBlocks[newBlocks.length - 2]?.sort_order || 0;
            newSortOrder = lastOrder + 1000;
          } else {
            // 移动到中间位置
            const prevOrder = newBlocks[newIndex - 1]?.sort_order || 0;
            const nextOrder = newBlocks[newIndex + 1]?.sort_order || 1000;
            newSortOrder = (prevOrder + nextOrder) / 2;
          }

          await onReorderBlocks(active.id as string, newSortOrder);
        }
      }
    },
    [localBlocks, onReorderBlocks]
  );

  // 处理内容更新
  const handleContentUpdate = useCallback(
    (blockId: string, content: string) => {
      onUpdateBlock(blockId, { content });
    },
    [onUpdateBlock]
  );

  // 处理删除块
  const handleDeleteBlock = useCallback(
    (blockId: string) => {
      if (blocks.length > 1) {
        onDeleteBlock(blockId);
      }
    },
    [blocks.length, onDeleteBlock]
  );

  // 处理待办复选框变化
  const handleTodoCheck = useCallback(
    (blockId: string, checked: boolean) => {
      const props = JSON.stringify({ checked });
      onUpdateBlock(blockId, { props });
    },
    [onUpdateBlock]
  );

  // 显示块类型选择器
  const handleShowToolbar = useCallback((blockId?: string) => {
    setToolbarBlockId(blockId || null);
    setShowToolbar(true);
  }, []);

  // 创建新块类型
  const handleCreateBlockType = async (type: BlockType) => {
    const plugin = pluginRegistry.get(type);
    if (plugin?.onCreate) {
      plugin.onCreate();
    }
    await onCreateBlock(type, toolbarBlockId || undefined);
    setShowToolbar(false);
    setToolbarBlockId(null);
  };

  // 切换选择模式
  const toggleSelectMode = useCallback(() => {
    setIsSelectMode((prev) => !prev);
    if (isSelectMode) {
      setSelectedBlocks(new Set());
    }
  }, [isSelectMode]);

  // 切换块选中状态
  const toggleBlockSelection = useCallback((blockId: string) => {
    setSelectedBlocks((prev) => {
      const next = new Set(prev);
      if (next.has(blockId)) {
        next.delete(blockId);
      } else {
        next.add(blockId);
      }
      return next;
    });
  }, []);

  // 全选/取消全选
  const toggleSelectAll = useCallback(() => {
    if (selectedBlocks.size === blocks.length) {
      setSelectedBlocks(new Set());
    } else {
      setSelectedBlocks(new Set(blocks.map((b) => b.id)));
    }
  }, [blocks, selectedBlocks.size]);

  // 批量删除选中的块
  const handleBatchDelete = useCallback(async () => {
    if (selectedBlocks.size === 0) return;

    const confirmDelete = window.confirm(`确定要删除选中的 ${selectedBlocks.size} 个块吗？`);
    if (!confirmDelete) return;

    const blocksToDelete = Array.from(selectedBlocks);
    const remainingCount = blocks.length - blocksToDelete.length;

    if (remainingCount < 1) {
      alert('至少需要保留一个块');
      return;
    }

    for (const blockId of blocksToDelete) {
      await onDeleteBlock(blockId);
    }

    setSelectedBlocks(new Set());
    setIsSelectMode(false);
  }, [selectedBlocks, blocks.length, onDeleteBlock]);

  // 渲染块内容
  const renderBlockContent = (block: Block) => {
    const plugin = pluginRegistry.get(block.block_type);

    if (!plugin) {
      const defaultPlugin = pluginRegistry.get('paragraph');
      if (!defaultPlugin) {
        return <div>未知块类型: {block.block_type}</div>;
      }
    }

    const currentPlugin = plugin || pluginRegistry.get('paragraph')!;

    // 特殊处理：待办事项
    if (block.block_type === 'to_do') {
      let checked = false;
      try {
        const props = JSON.parse(block.props || '{}');
        checked = props.checked || false;
      } catch {}

      return (
        <div className="flex items-start gap-2">
          <input
            type="checkbox"
            checked={checked}
            className="mt-1.5 w-4 h-4 rounded border-gray-300"
            onChange={(e) => handleTodoCheck(block.id, e.target.checked)}
          />
          <div className="flex-1">
            <Suspense fallback={<div className="animate-pulse bg-gray-100 h-6 rounded" />}>
              <PluginComponent
                plugin={currentPlugin}
                block={block}
                onUpdate={(content) => handleContentUpdate(block.id, content)}
                onDelete={() => handleDeleteBlock(block.id)}
                onSlashCommand={() => handleShowToolbar(block.id)}
              />
            </Suspense>
          </div>
        </div>
      );
    }

    return (
      <Suspense fallback={<div className="animate-pulse bg-gray-100 h-6 rounded" />}>
        <PluginComponent
          plugin={currentPlugin}
          block={block}
          onUpdate={(content) => handleContentUpdate(block.id, content)}
          onDelete={() => handleDeleteBlock(block.id)}
          onSlashCommand={() => handleShowToolbar(block.id)}
        />
      </Suspense>
    );
  };

  // 渲染块
  const renderBlock = (block: Block) => {
    if (block.block_type === 'divider') {
      return (
        <div className="group/divider relative py-1">
          <hr className="border-gray-200" />
          {!isSelectMode && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteBlock(block.id);
              }}
              className="absolute right-0 top-1/2 -translate-y-1/2 opacity-0 group-hover/divider:opacity-100 text-xs text-red-500 hover:text-red-700 bg-white px-2 py-1 rounded shadow-sm border"
              title="删除分割线"
            >
              删除
            </button>
          )}
        </div>
      );
    }

    return renderBlockContent(block);
  };

  return (
    <div className="space-y-0.5">
      {/* 批量操作工具栏 */}
      <div className="flex items-center justify-between mb-2 pb-2 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <button
            onClick={toggleSelectMode}
            className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
              isSelectMode
                ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {isSelectMode ? '取消选择' : '批量选择'}
          </button>

          {isSelectMode && (
            <>
              <button
                onClick={toggleSelectAll}
                className="px-3 py-1.5 text-sm bg-gray-100 text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
              >
                {selectedBlocks.size === blocks.length ? '取消全选' : '全选'}
              </button>

              {selectedBlocks.size > 0 && (
                <button
                  onClick={handleBatchDelete}
                  className="px-3 py-1.5 text-sm bg-red-100 text-red-600 hover:bg-red-200 rounded-lg transition-colors"
                >
                  删除选中 ({selectedBlocks.size})
                </button>
              )}
            </>
          )}
        </div>

        <button
          onClick={() => handleShowToolbar()}
          className="px-3 py-1.5 text-sm bg-blue-500 text-white hover:bg-blue-600 rounded-lg transition-colors"
        >
          + 添加块
        </button>
      </div>

      {/* 块列表 - 拖拽排序 */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={localBlocks.map((b) => b.id)}
          strategy={verticalListSortingStrategy}
        >
          {localBlocks.map((block) => (
            <SortableBlock
              key={block.id}
              block={block}
              isSelectMode={isSelectMode}
              isSelected={selectedBlocks.has(block.id)}
              onToggleSelect={toggleBlockSelection}
              onShowToolbar={handleShowToolbar}
              renderContent={renderBlock}
            />
          ))}
        </SortableContext>
      </DndContext>

      {/* 块类型选择器弹窗 */}
      {showToolbar && (
        <div className="fixed inset-0 z-50" onClick={() => setShowToolbar(false)}>
          <div
            className="absolute bg-white rounded-lg shadow-xl border border-gray-200 p-2 w-64 max-h-96 overflow-y-auto"
            style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-xs text-gray-500 px-2 py-1 mb-1">选择块类型</p>
            {plugins.map((plugin) => (
              <button
                key={plugin.type}
                onClick={() => handleCreateBlockType(plugin.type)}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-md hover:bg-gray-100 text-left"
              >
                <span className="w-8 h-8 flex items-center justify-center bg-gray-100 rounded text-sm">
                  {plugin.icon}
                </span>
                <div className="flex-1">
                  <span className="text-sm text-gray-700">{plugin.name}</span>
                  {plugin.description && (
                    <p className="text-xs text-gray-400 mt-0.5">{plugin.description}</p>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// 插件组件包装器
function PluginComponent({
  plugin,
  block,
  onUpdate,
  onDelete,
  onSlashCommand,
}: {
  plugin: BlockPlugin;
  block: Block;
  onUpdate: (content: string) => void;
  onDelete: () => void;
  onSlashCommand: () => void;
}) {
  const Component = plugin.component;

  if (block.block_type === 'divider') {
    return <hr className={plugin.className || 'my-1 border-gray-200'} />;
  }

  return (
    <Suspense fallback={<div className="animate-pulse bg-gray-100 h-6 rounded" />}>
      <Component
        block={block}
        onUpdate={onUpdate}
        onDelete={onDelete}
        onSlashCommand={onSlashCommand}
      />
    </Suspense>
  );
}
