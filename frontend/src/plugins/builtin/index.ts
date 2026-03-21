import { lazy } from 'react';
import type { BlockPlugin } from '../types';

// 段落插件
export const paragraphPlugin: BlockPlugin = {
  type: 'paragraph',
  name: '段落',
  icon: '¶',
  description: '普通文本段落',
  component: lazy(() => import('../../components/tiptap/TipTapEditor')),
  onCreate: () => ({
    content: JSON.stringify({
      tiptap: {
        doc: { type: 'doc', content: [{ type: 'paragraph' }] },
        plain_text: '',
      },
    }),
    props: '{}',
  }),
  convertibleTo: ['heading_1', 'heading_2', 'heading_3', 'quote', 'code', 'to_do'],
  priority: 100,
};

// 标题插件
export const heading1Plugin: BlockPlugin = {
  type: 'heading_1',
  name: '标题 1',
  icon: 'H1',
  description: '大标题',
  component: lazy(() => import('../../components/tiptap/TipTapEditor')),
  onCreate: () => ({
    content: JSON.stringify({
      tiptap: {
        doc: { type: 'doc', content: [{ type: 'heading', attrs: { level: 1 } }] },
        plain_text: '',
      },
    }),
    props: '{}',
  }),
  convertibleTo: ['paragraph', 'heading_2', 'heading_3'],
  priority: 90,
};

export const heading2Plugin: BlockPlugin = {
  type: 'heading_2',
  name: '标题 2',
  icon: 'H2',
  description: '中标题',
  component: lazy(() => import('../../components/tiptap/TipTapEditor')),
  onCreate: () => ({
    content: JSON.stringify({
      tiptap: {
        doc: { type: 'doc', content: [{ type: 'heading', attrs: { level: 2 } }] },
        plain_text: '',
      },
    }),
    props: '{}',
  }),
  convertibleTo: ['paragraph', 'heading_1', 'heading_3'],
  priority: 89,
};

export const heading3Plugin: BlockPlugin = {
  type: 'heading_3',
  name: '标题 3',
  icon: 'H3',
  description: '小标题',
  component: lazy(() => import('../../components/tiptap/TipTapEditor')),
  onCreate: () => ({
    content: JSON.stringify({
      tiptap: {
        doc: { type: 'doc', content: [{ type: 'heading', attrs: { level: 3 } }] },
        plain_text: '',
      },
    }),
    props: '{}',
  }),
  convertibleTo: ['paragraph', 'heading_1', 'heading_2'],
  priority: 88,
};

// 列表插件
export const bulletListPlugin: BlockPlugin = {
  type: 'bulleted_list_item',
  name: '无序列表',
  icon: '•',
  description: '无序列表项',
  component: lazy(() => import('../../components/tiptap/TipTapEditor')),
  onCreate: () => ({
    content: JSON.stringify({
      tiptap: {
        doc: { type: 'doc', content: [{ type: 'paragraph' }] },
        plain_text: '',
      },
    }),
    props: '{}',
  }),
  convertibleTo: ['paragraph', 'numbered_list_item', 'to_do'],
  priority: 80,
};

export const numberedListPlugin: BlockPlugin = {
  type: 'numbered_list_item',
  name: '有序列表',
  icon: '1.',
  description: '有序列表项',
  component: lazy(() => import('../../components/tiptap/TipTapEditor')),
  onCreate: () => ({
    content: JSON.stringify({
      tiptap: {
        doc: { type: 'doc', content: [{ type: 'paragraph' }] },
        plain_text: '',
      },
    }),
    props: '{}',
  }),
  convertibleTo: ['paragraph', 'bulleted_list_item', 'to_do'],
  priority: 79,
};

// 待办插件
export const todoPlugin: BlockPlugin = {
  type: 'to_do',
  name: '待办事项',
  icon: '☐',
  description: '可勾选的任务',
  component: lazy(() => import('../../components/tiptap/TipTapEditor')),
  onCreate: () => ({
    content: JSON.stringify({
      tiptap: {
        doc: { type: 'doc', content: [{ type: 'paragraph' }] },
        plain_text: '',
      },
    }),
    props: JSON.stringify({ checked: false }),
  }),
  convertibleTo: ['paragraph', 'bulleted_list_item', 'numbered_list_item'],
  priority: 85,
};

// 代码插件
export const codePlugin: BlockPlugin = {
  type: 'code',
  name: '代码块',
  icon: '</>',
  description: '代码片段，支持语法高亮',
  component: lazy(() => import('../../components/tiptap/TipTapEditor')),
  onCreate: () => ({
    content: JSON.stringify({
      tiptap: {
        doc: { type: 'doc', content: [{ type: 'codeBlock' }] },
        plain_text: '',
      },
    }),
    props: '{}',
  }),
  convertibleTo: ['paragraph'],
  priority: 75,
};

// 引用插件
export const quotePlugin: BlockPlugin = {
  type: 'quote',
  name: '引用',
  icon: '"',
  description: '引用文本',
  component: lazy(() => import('../../components/tiptap/TipTapEditor')),
  onCreate: () => ({
    content: JSON.stringify({
      tiptap: {
        doc: { type: 'doc', content: [{ type: 'blockquote', content: [{ type: 'paragraph' }] }] },
        plain_text: '',
      },
    }),
    props: '{}',
  }),
  convertibleTo: ['paragraph'],
  priority: 70,
};

// 分割线插件
export const dividerPlugin: BlockPlugin = {
  type: 'divider',
  name: '分割线',
  icon: '—',
  description: '水平分割线',
  component: lazy(() => import('../../components/tiptap/TipTapEditor')),
  onCreate: () => ({
    content: '{}',
    props: '{}',
  }),
  convertibleTo: [],
  priority: 60,
  className: 'border-t border-gray-200 my-4',
};

// 画板插件
export const canvasPlugin: BlockPlugin = {
  type: 'canvas',
  name: '画板',
  icon: '🎨',
  description: 'Excalidraw 画板，支持形状、文本、自由绘制',
  component: lazy(() => import('../../components/excalidraw/ExcalidrawBlock')),
  onCreate: () => ({
    content: JSON.stringify({
      excalidraw: {
        elements: [],
        appState: { viewBackgroundColor: '#ffffff' },
        files: {},
      },
    }),
    props: '{}',
  }),
  convertibleTo: [],
  priority: 50,
};

// 表格插件
export const tablePlugin: BlockPlugin = {
  type: 'table',
  name: '表格',
  icon: '📊',
  description: '类似 Notion 的可编辑表格',
  component: lazy(() => import('../../components/table/TableBlock')),
  onCreate: () => ({
    content: JSON.stringify({
      table: {
        rows: 3,
        cols: 3,
        cells: Array(3).fill(null).map(() => Array(3).fill(null).map(() => ({ content: '' }))),
        headers: ['列1', '列2', '列3'],
      },
    }),
    props: '{}',
  }),
  convertibleTo: [],
  priority: 45,
};

// 网站嵌入插件
export const embedPlugin: BlockPlugin = {
  type: 'embed',
  name: '网站嵌入',
  icon: '🔗',
  description: '嵌入网页、视频、社交媒体等',
  component: lazy(() => import('../../components/embed/EmbedBlock')),
  onCreate: () => ({
    content: JSON.stringify({
      embed: {
        url: '',
        title: '',
      },
    }),
    props: '{}',
  }),
  convertibleTo: [],
  priority: 40,
};

// 图片插件
export const imagePlugin: BlockPlugin = {
  type: 'image',
  name: '图片',
  icon: '🖼️',
  description: '上传或链接图片',
  component: lazy(() => import('../../components/embed/ImageBlock')),
  onCreate: () => ({
    content: JSON.stringify({
      image: {
        fileId: '',
        url: '',
        caption: '',
      },
    }),
    props: '{}',
  }),
  convertibleTo: [],
  priority: 85,
};

// 地图插件
export const mapPlugin: BlockPlugin = {
  type: 'map',
  name: '地图',
  icon: '🗺️',
  description: '嵌入 OpenStreetMap 或 Google Maps',
  component: lazy(() => import('../../components/embed/MapBlock')),
  onCreate: () => ({
    content: JSON.stringify({
      map: {
        location: '',
        lat: undefined,
        lng: undefined,
        zoom: 14,
      },
    }),
    props: '{}',
  }),
  convertibleTo: [],
  priority: 35,
};
