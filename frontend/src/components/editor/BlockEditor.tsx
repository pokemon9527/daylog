import { useCallback, useRef, useState } from 'react';
import type { Block, BlockType } from '../../types';

interface BlockEditorProps {
  blocks: Block[];
  onCreateBlock: (blockType: string, afterBlockId?: string) => Promise<Block | undefined>;
  onUpdateBlock: (blockId: string, updates: { content?: string; props?: string; block_type?: string }) => Promise<void>;
  onDeleteBlock: (blockId: string) => Promise<void>;
}

// 块类型对应的工具栏按钮
const BLOCK_TYPES: { type: BlockType; label: string; icon: string }[] = [
  { type: 'paragraph', label: '段落', icon: '¶' },
  { type: 'heading_1', label: '标题1', icon: 'H1' },
  { type: 'heading_2', label: '标题2', icon: 'H2' },
  { type: 'heading_3', label: '标题3', icon: 'H3' },
  { type: 'bulleted_list_item', label: '无序列表', icon: '•' },
  { type: 'numbered_list_item', label: '有序列表', icon: '1.' },
  { type: 'to_do', label: '待办', icon: '☐' },
  { type: 'code', label: '代码', icon: '</>' },
  { type: 'quote', label: '引用', icon: '"' },
  { type: 'divider', label: '分割线', icon: '—' },
  { type: 'canvas', label: '画板', icon: '🎨' },
];

// 解析块内容为纯文本
function getBlockText(block: Block): string {
  try {
    const content = JSON.parse(block.content);
    if (content.rich_text && content.rich_text.length > 0) {
      return content.rich_text.map((t: any) => t.text?.content || '').join('');
    }
  } catch {}
  return '';
}

// 获取块的样式类
function getBlockClass(type: BlockType): string {
  switch (type) {
    case 'heading_1':
      return 'text-3xl font-bold';
    case 'heading_2':
      return 'text-2xl font-bold';
    case 'heading_3':
      return 'text-xl font-semibold';
    case 'code':
      return 'font-mono text-sm bg-gray-900 text-gray-100 p-4 rounded-lg';
    case 'quote':
      return 'border-l-4 border-blue-500 pl-4 text-gray-600 italic';
    default:
      return '';
  }
}

export default function BlockEditor({
  blocks,
  onCreateBlock,
  onUpdateBlock,
  onDeleteBlock,
}: BlockEditorProps) {
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
  const [showToolbar, setShowToolbar] = useState(false);
  const [toolbarBlockId, setToolbarBlockId] = useState<string | null>(null);

  // 用 ref 存储块 DOM 元素，避免 dangerouslySetInnerHTML 在重渲染时重置内容
  const blockRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // ref 回调：挂载时设置初始内容，后续重渲染不再修改 DOM
  const setBlockRef = useCallback(
    (blockId: string, text: string) => (el: HTMLDivElement | null) => {
      if (el) {
        blockRefs.current.set(blockId, el);
        // 仅在挂载时设置内容（el 当前为空）
        if (!el.textContent && text) {
          el.textContent = text;
        }
      } else {
        blockRefs.current.delete(blockId);
      }
    },
    []
  );

  // 保存块内容
  const handleBlockInput = useCallback(
    (blockId: string, content: string) => {
      const contentObj = {
        rich_text: [
          {
            type: 'text',
            text: { content },
            plain_text: content,
          },
        ],
      };
      onUpdateBlock(blockId, { content: JSON.stringify(contentObj) });
    },
    [onUpdateBlock]
  );

  // 处理 Enter 键创建新块
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, blockId: string) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        onCreateBlock('paragraph', blockId);
      }

      // Backspace 删除空块
      if (e.key === 'Backspace') {
        const target = e.target as HTMLElement;
        if (target.textContent === '' && blocks.length > 1) {
          e.preventDefault();
          onDeleteBlock(blockId);
        }
      }
    },
    [blocks.length, onCreateBlock, onDeleteBlock]
  );

  // 创建新块类型
  const handleCreateBlockType = async (type: BlockType) => {
    await onCreateBlock(type, toolbarBlockId || undefined);
    setShowToolbar(false);
    setToolbarBlockId(null);
  };

  // 排序块
  const sortedBlocks = [...blocks].sort((a, b) => a.sort_order - b.sort_order);

  return (
    <div className="space-y-1">
      {sortedBlocks.map((block) => (
        <div
          key={block.id}
          className="group relative"
          onMouseEnter={() => setActiveBlockId(block.id)}
          onMouseLeave={() => setActiveBlockId(null)}
        >
          {/* 块操作按钮 */}
          <div
            className={`absolute -left-8 top-1 flex items-center gap-1 transition-opacity ${
              activeBlockId === block.id ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <button
              onClick={() => {
                setToolbarBlockId(block.id);
                setShowToolbar(!showToolbar);
              }}
              className="w-6 h-6 flex items-center justify-center rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 text-sm"
              title="添加块"
            >
              +
            </button>
            <button
              className="w-6 h-6 flex items-center justify-center rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 cursor-grab"
              title="拖拽排序"
            >
              :::
            </button>
          </div>

          {/* 块内容 */}
          {block.block_type === 'divider' ? (
            <hr className="my-4 border-gray-200" />
          ) : block.block_type === 'canvas' ? (
            <div className="excalidraw-wrapper my-2">
              <div className="w-full h-full flex items-center justify-center bg-gray-50 text-gray-400 border border-dashed border-gray-300 rounded-lg">
                <p>画板区域 - 请在完整版中集成 Excalidraw</p>
              </div>
            </div>
          ) : block.block_type === 'to_do' ? (
            <div className="flex items-start gap-2">
              <input
                type="checkbox"
                className="mt-1.5 w-4 h-4 rounded border-gray-300"
                onChange={(e) => {
                  const props = JSON.stringify({ checked: e.target.checked });
                  onUpdateBlock(block.id, { props });
                }}
              />
              <div
                ref={setBlockRef(block.id, getBlockText(block))}
                contentEditable
                suppressContentEditableWarning
                className={`flex-1 outline-none min-h-[1.5em] ${getBlockClass(block.block_type)}`}
                onBlur={(e) => handleBlockInput(block.id, e.currentTarget.textContent || '')}
                onKeyDown={(e) => handleKeyDown(e, block.id)}
              />
            </div>
          ) : (
            <div
              ref={setBlockRef(block.id, getBlockText(block))}
              contentEditable
              suppressContentEditableWarning
              className={`outline-none min-h-[1.5em] py-1 px-2 -mx-2 rounded hover:bg-gray-50 focus:bg-gray-50 ${getBlockClass(
                block.block_type
              )}`}
              data-placeholder={block.block_type === 'paragraph' ? '输入文字，或按 / 查看命令' : ''}
              onBlur={(e) => handleBlockInput(block.id, e.currentTarget.textContent || '')}
              onKeyDown={(e) => handleKeyDown(e, block.id)}
            />
          )}
        </div>
      ))}

      {/* 添加块按钮 */}
      <button
        onClick={() => onCreateBlock('paragraph')}
        className="w-full py-3 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg text-sm transition-colors"
      >
        + 添加新块
      </button>

      {/* 块类型选择器弹窗 */}
      {showToolbar && (
        <div className="fixed inset-0 z-50" onClick={() => setShowToolbar(false)}>
          <div
            className="absolute bg-white rounded-lg shadow-xl border border-gray-200 p-2 w-64"
            style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-xs text-gray-500 px-2 py-1 mb-1">选择块类型</p>
            {BLOCK_TYPES.map((bt) => (
              <button
                key={bt.type}
                onClick={() => handleCreateBlockType(bt.type)}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-md hover:bg-gray-100 text-left"
              >
                <span className="w-8 h-8 flex items-center justify-center bg-gray-100 rounded text-sm">
                  {bt.icon}
                </span>
                <span className="text-sm text-gray-700">{bt.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
