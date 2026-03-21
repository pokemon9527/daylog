import type { Block } from '../types';

// TipTap 节点转 Markdown
function nodeToMarkdown(node: any, depth: number = 0): string {
  const indent = '  '.repeat(depth);
  
  switch (node.type) {
    case 'doc':
      return (node.content || []).map((n: any) => nodeToMarkdown(n, depth)).join('\n\n');
    
    case 'paragraph':
      const text = (node.content || []).map((n: any) => nodeToMarkdown(n, depth)).join('');
      return text || '';
    
    case 'heading':
      const level = node.attrs?.level || 1;
      const headingText = (node.content || []).map((n: any) => nodeToMarkdown(n, depth)).join('');
      return `${'#'.repeat(level)} ${headingText}`;
    
    case 'text':
      let textContent = node.text || '';
      if (node.marks) {
        for (const mark of node.marks) {
          switch (mark.type) {
            case 'bold':
              textContent = `**${textContent}**`;
              break;
            case 'italic':
              textContent = `*${textContent}*`;
              break;
            case 'strike':
              textContent = `~~${textContent}~~`;
              break;
            case 'code':
              textContent = `\`${textContent}\``;
              break;
            case 'link':
              textContent = `[${textContent}](${mark.attrs?.href || ''})`;
              break;
            case 'highlight':
              textContent = `==${textContent}==`;
              break;
          }
        }
      }
      return textContent;
    
    case 'bulletList':
      return (node.content || []).map((n: any) => nodeToMarkdown(n, depth)).join('\n');
    
    case 'orderedList':
      return (node.content || []).map((n: any, i: number) => {
        const itemText = nodeToMarkdown(n, depth);
        return `${indent}${i + 1}. ${itemText.replace(/^\s*- /, '')}`;
      }).join('\n');
    
    case 'listItem':
      const itemContent = (node.content || []).map((n: any) => nodeToMarkdown(n, depth + 1)).join('\n');
      return `${indent}- ${itemContent}`;
    
    case 'taskList':
      return (node.content || []).map((n: any) => nodeToMarkdown(n, depth)).join('\n');
    
    case 'taskItem':
      const checked = node.attrs?.checked ? 'x' : ' ';
      const taskContent = (node.content || []).map((n: any) => nodeToMarkdown(n, depth + 1)).join('\n');
      return `${indent}- [${checked}] ${taskContent}`;
    
    case 'blockquote':
      const quoteContent = (node.content || []).map((n: any) => nodeToMarkdown(n, depth)).join('\n');
      return quoteContent.split('\n').map((line: string) => `> ${line}`).join('\n');
    
    case 'codeBlock':
      const lang = node.attrs?.language || '';
      const codeContent = (node.content || []).map((n: any) => n.text || '').join('\n');
      return `\`\`\`${lang}\n${codeContent}\n\`\`\``;
    
    case 'hardBreak':
      return '\n';
    
    case 'horizontalRule':
      return '---';
    
    case 'image':
      const alt = node.attrs?.alt || '';
      const src = node.attrs?.src || '';
      return `![${alt}](${src})`;
    
    default:
      return (node.content || []).map((n: any) => nodeToMarkdown(n, depth)).join('');
  }
}

// 块内容转 Markdown
function blockToMarkdown(block: Block): string {
  // 处理画板块
  if (block.block_type === 'canvas') {
    return '> 🎨 画板内容（暂不支持导出）';
  }
  
  // 处理分割线
  if (block.block_type === 'divider') {
    return '---';
  }
  
  // 处理 TipTap 格式
  try {
    const parsed = JSON.parse(block.content);
    if (parsed.tiptap?.doc) {
      return nodeToMarkdown(parsed.tiptap.doc);
    }
    // 兼容旧格式 rich_text
    if (parsed.rich_text && parsed.rich_text.length > 0) {
      const text = parsed.rich_text.map((t: any) => t.text?.content || '').join('');
      
      // 根据块类型添加 Markdown 前缀
      switch (block.block_type) {
        case 'heading_1':
          return `# ${text}`;
        case 'heading_2':
          return `## ${text}`;
        case 'heading_3':
          return `### ${text}`;
        case 'quote':
          return `> ${text}`;
        case 'code':
          return `\`\`\`\n${text}\n\`\`\``;
        case 'bulleted_list_item':
          return `- ${text}`;
        case 'numbered_list_item':
          return `1. ${text}`;
        case 'to_do':
          const props = JSON.parse(block.props || '{}');
          const checked = props.checked ? 'x' : ' ';
          return `- [${checked}] ${text}`;
        default:
          return text;
      }
    }
  } catch {}
  
  return '';
}

// 导出为 Markdown 文件
export function exportToMarkdown(blocks: Block[], pageTitle: string): void {
  const sortedBlocks = [...blocks].sort((a, b) => a.sort_order - b.sort_order);
  
  const markdownContent = [
    `# ${pageTitle || '未命名页面'}`,
    '',
    ...sortedBlocks.map(blockToMarkdown),
  ].join('\n');
  
  // 创建下载链接
  const blob = new Blob([markdownContent], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${pageTitle || 'untitled'}.md`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// Markdown 解析为块内容
function parseMarkdownLine(line: string): { type: string; content: string; props?: string } {
  const trimmed = line.trim();
  
  // 标题
  const headingMatch = trimmed.match(/^(#{1,3})\s+(.+)$/);
  if (headingMatch) {
    const level = headingMatch[1].length;
    return {
      type: `heading_${level}`,
      content: createTipTapContent(headingMatch[2]),
    };
  }
  
  // 待办事项
  const taskMatch = trimmed.match(/^-\s+\[([ x])\]\s+(.+)$/i);
  if (taskMatch) {
    const checked = taskMatch[1].toLowerCase() === 'x';
    return {
      type: 'to_do',
      content: createTipTapContent(taskMatch[2]),
      props: JSON.stringify({ checked }),
    };
  }
  
  // 无序列表
  const bulletMatch = trimmed.match(/^[-*]\s+(.+)$/);
  if (bulletMatch) {
    return {
      type: 'bulleted_list_item',
      content: createTipTapContent(bulletMatch[1]),
    };
  }
  
  // 有序列表
  const orderedMatch = trimmed.match(/^\d+\.\s+(.+)$/);
  if (orderedMatch) {
    return {
      type: 'numbered_list_item',
      content: createTipTapContent(orderedMatch[1]),
    };
  }
  
  // 引用
  const quoteMatch = trimmed.match(/^>\s+(.+)$/);
  if (quoteMatch) {
    return {
      type: 'quote',
      content: createTipTapContent(quoteMatch[1]),
    };
  }
  
  // 分割线
  if (trimmed === '---' || trimmed === '***' || trimmed === '___') {
    return {
      type: 'divider',
      content: '{}',
    };
  }
  
  // 普通段落
  return {
    type: 'paragraph',
    content: createTipTapContent(trimmed),
  };
}

// 创建 TipTap JSON 内容
function createTipTapContent(text: string): string {
  const doc = {
    type: 'doc',
    content: [
      {
        type: 'paragraph',
        content: text ? [{ type: 'text', text }] : undefined,
      },
    ],
  };
  
  return JSON.stringify({
    tiptap: {
      doc,
      plain_text: text,
    },
  });
}

// 导入 Markdown 文件
export function importFromMarkdown(file: File): Promise<{ title: string; blocks: Array<{ type: string; content: string; props?: string }> }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split('\n');
        
        let title = '导入的文档';
        const blocks: Array<{ type: string; content: string; props?: string }> = [];
        
        let inCodeBlock = false;
        let codeBlockContent: string[] = [];
        
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          
          // 处理代码块
          if (line.trim().startsWith('```')) {
            if (inCodeBlock) {
              // 结束代码块
              blocks.push({
                type: 'code',
                content: createTipTapContent(codeBlockContent.join('\n')),
              });
              inCodeBlock = false;
              codeBlockContent = [];
            } else {
              // 开始代码块
              inCodeBlock = true;
            }
            continue;
          }
          
          if (inCodeBlock) {
            codeBlockContent.push(line);
            continue;
          }
          
          // 跳过空行
          if (!line.trim()) {
            continue;
          }
          
          // 第一个标题作为文档标题
          const headingMatch = line.trim().match(/^#\s+(.+)$/);
          if (headingMatch && i === 0) {
            title = headingMatch[1];
            continue;
          }
          
          // 解析行内容
          const parsed = parseMarkdownLine(line);
          blocks.push(parsed);
        }
        
        // 处理未关闭的代码块
        if (inCodeBlock && codeBlockContent.length > 0) {
          blocks.push({
            type: 'code',
            content: createTipTapContent(codeBlockContent.join('\n')),
          });
        }
        
        resolve({ title, blocks });
      } catch (err) {
        reject(new Error('解析 Markdown 文件失败'));
      }
    };
    
    reader.onerror = () => reject(new Error('读取文件失败'));
    reader.readAsText(file);
  });
}

// 导出为纯 Markdown 字符串（不包含下载）
export function blocksToMarkdown(blocks: Block[]): string {
  const sortedBlocks = [...blocks].sort((a, b) => a.sort_order - b.sort_order);
  return sortedBlocks.map(blockToMarkdown).join('\n\n');
}
