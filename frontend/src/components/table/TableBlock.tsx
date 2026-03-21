import { useState, useCallback, useMemo } from 'react';
import type { Block } from '../../types';

interface TableBlockProps {
  block?: Block;
  content?: string;
  onUpdate: (content: string) => void;
  onDelete?: () => void;
}

interface TableCell {
  content: string;
}

interface TableData {
  rows: number;
  cols: number;
  cells: TableCell[][];
  headers: string[];
}

const DEFAULT_TABLE: TableData = {
  rows: 3,
  cols: 3,
  cells: Array(3).fill(null).map(() => Array(3).fill(null).map(() => ({ content: '' }))),
  headers: ['列1', '列2', '列3'],
};

function parseTableContent(content: string): TableData {
  try {
    const parsed = JSON.parse(content);
    if (parsed.table) {
      return {
        rows: parsed.table.rows || 3,
        cols: parsed.table.cols || 3,
        cells: parsed.table.cells || DEFAULT_TABLE.cells,
        headers: parsed.table.headers || DEFAULT_TABLE.headers,
      };
    }
  } catch {}
  return DEFAULT_TABLE;
}

export default function TableBlock({
  block,
  content: directContent,
  onUpdate,
  onDelete,
}: TableBlockProps) {
  const content = block?.content || directContent || '{}';
  const tableData = useMemo(() => parseTableContent(content), [content]);
  const [editingCell, setEditingCell] = useState<{ row: number; col: number } | null>(null);

  const saveTable = useCallback((newData: TableData) => {
    const contentObj = { table: newData };
    onUpdate(JSON.stringify(contentObj));
  }, [onUpdate]);

  const handleCellChange = useCallback((row: number, col: number, value: string) => {
    const newCells = tableData.cells.map((r, i) =>
      r.map((c, j) => (i === row && j === col ? { content: value } : c))
    );
    saveTable({ ...tableData, cells: newCells });
  }, [tableData, saveTable]);

  const handleHeaderChange = useCallback((col: number, value: string) => {
    const newHeaders = [...tableData.headers];
    newHeaders[col] = value;
    saveTable({ ...tableData, headers: newHeaders });
  }, [tableData, saveTable]);

  const addRow = useCallback(() => {
    const newRow = Array(tableData.cols).fill(null).map(() => ({ content: '' }));
    saveTable({
      ...tableData,
      rows: tableData.rows + 1,
      cells: [...tableData.cells, newRow],
    });
  }, [tableData, saveTable]);

  const addColumn = useCallback(() => {
    const newCells = tableData.cells.map(row => [...row, { content: '' }]);
    saveTable({
      ...tableData,
      cols: tableData.cols + 1,
      cells: newCells,
      headers: [...tableData.headers, `列${tableData.cols + 1}`],
    });
  }, [tableData, saveTable]);

  const removeRow = useCallback((rowIndex: number) => {
    if (tableData.rows <= 1) return;
    const newCells = tableData.cells.filter((_, i) => i !== rowIndex);
    saveTable({
      ...tableData,
      rows: tableData.rows - 1,
      cells: newCells,
    });
  }, [tableData, saveTable]);

  const removeColumn = useCallback((colIndex: number) => {
    if (tableData.cols <= 1) return;
    const newCells = tableData.cells.map(row => row.filter((_, j) => j !== colIndex));
    const newHeaders = tableData.headers.filter((_, i) => i !== colIndex);
    saveTable({
      ...tableData,
      cols: tableData.cols - 1,
      cells: newCells,
      headers: newHeaders,
    });
  }, [tableData, saveTable]);

  return (
    <div className="my-2 border border-gray-200 rounded-lg overflow-hidden">
      {/* 表格工具栏 */}
      <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <span className="text-base">📊</span>
          <span className="text-sm font-medium text-gray-600">表格</span>
          <span className="text-xs text-gray-400">({tableData.rows}行 × {tableData.cols}列)</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={addRow}
            className="text-xs text-blue-600 hover:text-blue-700"
            title="添加行"
          >
            + 行
          </button>
          <button
            onClick={addColumn}
            className="text-xs text-blue-600 hover:text-blue-700"
            title="添加列"
          >
            + 列
          </button>
          {onDelete && (
            <button
              onClick={onDelete}
              className="text-xs text-red-500 hover:text-red-700"
              title="删除表格"
            >
              删除
            </button>
          )}
        </div>
      </div>

      {/* 表格内容 */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              {tableData.headers.map((header, colIndex) => (
                <th
                  key={colIndex}
                  className="border border-gray-200 bg-gray-50 px-2 py-1 text-left relative group"
                >
                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      value={header}
                      onChange={(e) => handleHeaderChange(colIndex, e.target.value)}
                      className="flex-1 bg-transparent outline-none text-sm font-medium min-w-0"
                    />
                    <button
                      onClick={() => removeColumn(colIndex)}
                      className="w-4 h-4 bg-red-500 text-white rounded-full text-xs opacity-0 group-hover:opacity-100 flex items-center justify-center flex-shrink-0"
                      title="删除列"
                    >
                      ×
                    </button>
                  </div>
                </th>
              ))}
              <th className="border-0 w-8 bg-gray-50"></th>
            </tr>
          </thead>
          <tbody>
            {tableData.cells.map((row, rowIndex) => (
              <tr key={rowIndex} className="group/row">
                {row.map((cell, colIndex) => (
                  <td
                    key={colIndex}
                    className="border border-gray-200 px-2 py-1 relative"
                    onClick={() => setEditingCell({ row: rowIndex, col: colIndex })}
                  >
                    <input
                      type="text"
                      value={cell.content}
                      onChange={(e) => handleCellChange(rowIndex, colIndex, e.target.value)}
                      onFocus={() => setEditingCell({ row: rowIndex, col: colIndex })}
                      onBlur={() => setEditingCell(null)}
                      className={`w-full bg-transparent outline-none text-sm ${
                        editingCell?.row === rowIndex && editingCell?.col === colIndex
                          ? 'bg-blue-50'
                          : ''
                      }`}
                      placeholder="输入内容..."
                    />
                  </td>
                ))}
                <td className="border-0 w-6">
                  <button
                    onClick={() => removeRow(rowIndex)}
                    className="w-5 h-5 bg-red-500 text-white rounded-full text-xs opacity-0 group-hover/row:opacity-100 flex items-center justify-center"
                    title="删除行"
                  >
                    ×
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
