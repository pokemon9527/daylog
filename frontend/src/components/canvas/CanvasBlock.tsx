import { useState, useCallback } from 'react';

interface CanvasBlockProps {
  blockId: string;
  onUpdate: (blockId: string, data: string) => void;
}

// 画板组件 - 简化版，使用 Canvas API
// 生产环境建议集成 @excalidraw/excalidraw
export default function CanvasBlock({ blockId, onUpdate }: CanvasBlockProps) {
  const [isDrawing, setIsDrawing] = useState(false);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const canvas = e.currentTarget;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.beginPath();
      ctx.moveTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
    }
  }, []);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!isDrawing) return;
      const canvas = e.currentTarget;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.lineTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
        ctx.stroke();
      }
    },
    [isDrawing]
  );

  const handleMouseUp = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      setIsDrawing(false);
      const canvas = e.currentTarget;
      const dataUrl = canvas.toDataURL();
      onUpdate(blockId, dataUrl);
    },
    [blockId, onUpdate]
  );

  const handleClear = useCallback(() => {
    const canvas = document.querySelector(`#canvas-${blockId}`) as HTMLCanvasElement;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        onUpdate(blockId, '');
      }
    }
  }, [blockId, onUpdate]);

  return (
    <div className="my-2 border border-gray-200 rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-b border-gray-200">
        <span className="text-sm font-medium text-gray-600">画板</span>
        <button
          onClick={handleClear}
          className="text-xs text-gray-500 hover:text-red-500"
        >
          清除
        </button>
      </div>
      <canvas
        id={`canvas-${blockId}`}
        width={800}
        height={400}
        className="w-full bg-white cursor-crosshair"
        style={{ touchAction: 'none' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => setIsDrawing(false)}
      />
    </div>
  );
}
