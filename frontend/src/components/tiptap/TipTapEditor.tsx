import { useEditor, EditorContent, Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import Highlight from '@tiptap/extension-highlight';
import Underline from '@tiptap/extension-underline';
import Placeholder from '@tiptap/extension-placeholder';
import { common, createLowlight } from 'lowlight';
import { useEffect, useCallback } from 'react';
import type { Block } from '../../types';

const lowlight = createLowlight(common);

interface TipTapEditorProps {
  // 支持 BlockPlugin 接口
  block?: Block;
  // 支持直接传入内容
  content?: string;
  onUpdate: (content: string) => void;
  onDelete?: () => void;  // 删除空块回调
  onSlashCommand?: () => void;  // `/` 命令回调
  placeholder?: string;
  editable?: boolean;
  blockType?: string;
}

// 解析 TipTap JSON 内容
function parseTipTapContent(content: string): object | null {
  try {
    const parsed = JSON.parse(content);
    if (parsed.tiptap?.doc) {
      return parsed.tiptap.doc;
    }
    // 兼容旧格式 rich_text
    if (parsed.rich_text && parsed.rich_text.length > 0) {
      const text = parsed.rich_text.map((t: any) => t.text?.content || '').join('');
      return {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: text ? [{ type: 'text', text }] : undefined,
          },
        ],
      };
    }
  } catch {}
  return null;
}

// 提取纯文本
function extractPlainText(doc: any): string {
  if (!doc) return '';
  
  const extract = (node: any): string => {
    if (node.type === 'text') return node.text || '';
    if (node.content) return node.content.map(extract).join('');
    return '';
  };
  
  return extract(doc);
}

export default function TipTapEditor({
  block,
  content: directContent,
  onUpdate,
  onDelete,
  onSlashCommand,
  placeholder = '输入文字，或按 / 查看命令',
  editable = true,
  blockType: directBlockType,
}: TipTapEditorProps) {
  // 从 block 或直接参数获取内容和块类型
  const content = block?.content || directContent || '{}';
  const blockType = block?.block_type || directBlockType || 'paragraph';
  const getPlaceholder = useCallback(() => {
    switch (blockType) {
      case 'heading_1':
        return '标题 1';
      case 'heading_2':
        return '标题 2';
      case 'heading_3':
        return '标题 3';
      case 'code':
        return '输入代码...';
      case 'quote':
        return '输入引用...';
      case 'to_do':
        return '待办事项';
      default:
        return placeholder;
    }
  }, [blockType, placeholder]);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
        codeBlock: false, // 使用 lowlight 版本
      }),
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      CodeBlockLowlight.configure({
        lowlight,
      }),
      Highlight,
      Underline,
      Placeholder.configure({
        placeholder: getPlaceholder(),
      }),
    ],
    content: parseTipTapContent(content),
    editable,
    onUpdate: ({ editor }) => {
      const json = editor.getJSON();
      const plainText = extractPlainText(json);
      const contentObj = {
        tiptap: {
          doc: json,
          plain_text: plainText,
        },
      };
      onUpdate(JSON.stringify(contentObj));
    },
    editorProps: {
      attributes: {
        class: 'tiptap prose prose-sm max-w-none focus:outline-none',
      },
      handleKeyDown: (_view, event) => {
        // Enter 键创建新块
        if (event.key === 'Enter' && !event.shiftKey) {
          const isEmpty = editor?.isEmpty;
          
          // 如果不是空块，交给父组件处理
          if (!isEmpty) {
            return false; // 让父组件处理创建新块
          }
        }
        
        // Backspace 删除空块
        if (event.key === 'Backspace' && editor?.isEmpty && onDelete) {
          event.preventDefault();
          onDelete();
          return true;
        }
        
        // `/` 触发块类型选择器
        if (event.key === '/' && editor?.isEmpty && onSlashCommand) {
          event.preventDefault();
          onSlashCommand();
          return true;
        }
        
        return false;
      },
    },
  });

  // 同步外部 content 变化
  useEffect(() => {
    if (editor && !editor.isFocused) {
      const newContent = parseTipTapContent(content);
      const currentContent = editor.getJSON();
      
      // 仅在内容实际变化时更新
      if (JSON.stringify(newContent) !== JSON.stringify(currentContent)) {
        editor.commands.setContent(newContent || '');
      }
    }
  }, [content, editor]);

  // 同步 editable 状态
  useEffect(() => {
    if (editor) {
      editor.setEditable(editable);
    }
  }, [editable, editor]);

  if (!editor) {
    return null;
  }

  return (
    <div className="tiptap-wrapper">
      <EditorContent editor={editor} />
    </div>
  );
}

// 导出编辑器实例类型供外部使用
export type { Editor };
