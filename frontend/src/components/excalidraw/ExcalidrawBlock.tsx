import { useState, useCallback, useMemo, lazy, Suspense, useRef, useEffect } from 'react';
import type { Block } from '../../types';

// 懒加载 Excalidraw 以减小初始包体积
const ExcalidrawWrapper = lazy(async () => {
  await import('@excalidraw/excalidraw/index.css');
  const module = await import('@excalidraw/excalidraw');
  return { default: module.Excalidraw };
});

interface ExcalidrawBlockProps {
  block?: Block;
  blockId?: string;
  content?: string;
  onUpdate: ((content: string) => void) | ((blockId: string, content: string) => void);
  onDelete?: () => void;
  readOnly?: boolean;
}

export default function ExcalidrawBlock({
  block,
  blockId: directBlockId,
  content: directContent,
  onUpdate,
  onDelete,
  readOnly = false,
}: ExcalidrawBlockProps) {
  const blockId = block?.id || directBlockId || '';
  const content = block?.content || directContent || '{}';
  const [isExpanded, setIsExpanded] = useState(false);

  // 防抖定时器引用
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // 存储待保存的数据
  const pendingDataRef = useRef<string | null>(null);

  // 解析存储的场景数据
  const initialData = useMemo(() => {
    try {
      const parsed = JSON.parse(content);
      if (parsed.excalidraw) {
        return {
          elements: parsed.excalidraw.elements || [],
          appState: parsed.excalidraw.appState || { viewBackgroundColor: '#ffffff' },
          files: parsed.excalidraw.files || {},
        };
      }
    } catch {}
    return undefined;
  }, [content]);

  // 保存数据的函数
  const saveData = useCallback((contentStr: string) => {
    if (onUpdate.length === 1) {
      (onUpdate as (content: string) => void)(contentStr);
    } else {
      (onUpdate as (blockId: string, content: string) => void)(blockId, contentStr);
    }
  }, [blockId, onUpdate]);

  // 组件卸载时清理定时器
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // 防抖保存 - 1秒后才真正保存
  const handleChange = useCallback(
    (elements: readonly any[], appState: any, files: any) => {
      const contentObj = {
        excalidraw: {
          elements,
          appState: { viewBackgroundColor: appState.viewBackgroundColor },
          files,
        },
      };
      const contentStr = JSON.stringify(contentObj);
      pendingDataRef.current = contentStr;

      // 清除之前的定时器
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      // 设置新的定时器 - 1秒后保存
      debounceTimerRef.current = setTimeout(() => {
        if (pendingDataRef.current) {
          saveData(pendingDataRef.current);
          pendingDataRef.current = null;
        }
      }, 1000);
    },
    [saveData]
  );

  // 收起时立即保存
  const handleCollapse = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    if (pendingDataRef.current) {
      saveData(pendingDataRef.current);
      pendingDataRef.current = null;
    }
    setIsExpanded(false);
  }, [saveData]);

  const elementCount = initialData?.elements?.length || 0;

  return (
    <div className="my-2 border border-gray-200 rounded-lg overflow-hidden bg-white">
      {/* 画板头部 */}
      <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <span className="text-base">🎨</span>
          <span className="text-sm font-medium text-gray-600">画板</span>
          {elementCount > 0 && (
            <span className="text-xs text-gray-400">({elementCount} 个元素)</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => isExpanded ? handleCollapse() : setIsExpanded(true)}
            className="text-xs text-blue-600 hover:text-blue-700"
          >
            {isExpanded ? '收起' : '展开编辑'}
          </button>
          {onDelete && (
            <button
              onClick={onDelete}
              className="text-xs text-red-500 hover:text-red-700"
              title="删除画板"
            >
              删除
            </button>
          )}
        </div>
      </div>

      {/* 画板内容区域 */}
      {isExpanded ? (
        <div style={{ height: '500px', width: '100%' }}>
          <Suspense
            fallback={
              <div className="w-full h-full flex items-center justify-center bg-gray-50">
                <div className="text-center">
                  <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
                  <span className="text-gray-400 text-sm">加载画板中...</span>
                </div>
              </div>
            }
          >
            <ExcalidrawWrapper
              key={blockId} // 使用 key 确保每个画板独立
              initialData={initialData}
              onChange={handleChange}
              viewModeEnabled={readOnly}
              UIOptions={{
                canvasActions: {
                  loadScene: false,
                },
              }}
            />
          </Suspense>
        </div>
      ) : (
        /* 画板预览 */
        <div
          className="w-full h-24 flex items-center justify-center bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors"
          onClick={() => setIsExpanded(true)}
        >
          <div className="text-center">
            <p className="text-sm text-gray-500">点击展开画板进行编辑</p>
            {elementCount > 0 && (
              <p className="text-xs text-gray-400 mt-1">{elementCount} 个元素</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
