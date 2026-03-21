import { useState, useEffect } from 'react';
import { adminApi } from './AdminDashboardPage';

interface SensitiveWord {
  id: string;
  word: string;
  level: string;
  created_at: string;
}

export default function AdminSensitivePage() {
  const [words, setWords] = useState<SensitiveWord[]>([]);
  const [loading, setLoading] = useState(true);
  const [newWord, setNewWord] = useState('');
  const [newLevel, setNewLevel] = useState('warning');

  useEffect(() => {
    loadWords();
  }, []);

  const loadWords = async () => {
    try {
      const { data } = await adminApi.get('/sensitive-words');
      setWords(data || []);
    } catch (err) {
      console.error('加载敏感词失败:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddWord = async () => {
    if (!newWord.trim()) return;
    try {
      await adminApi.post('/sensitive-words', { word: newWord.trim(), level: newLevel });
      setNewWord('');
      loadWords();
    } catch (err: any) {
      alert(err.response?.data?.error || '添加失败');
    }
  };

  const handleDeleteWord = async (id: string) => {
    if (!confirm('确定要删除这个敏感词吗？')) return;
    try {
      await adminApi.delete(`/sensitive-words/${id}`);
      setWords((prev) => prev.filter((w) => w.id !== id));
    } catch (err: any) {
      alert(err.response?.data?.error || '删除失败');
    }
  };

  const levelColors: Record<string, string> = {
    warning: 'bg-yellow-100 text-yellow-700',
    block: 'bg-orange-100 text-orange-700',
    delete: 'bg-red-100 text-red-700',
  };

  const levelLabels: Record<string, string> = {
    warning: '警告',
    block: '拦截',
    delete: '删除',
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-[var(--color-text-primary)] mb-6">敏感词管理</h2>

      {/* 添加敏感词 */}
      <div className="bg-white rounded-2xl border border-[var(--color-border)] p-6 mb-6">
        <h3 className="font-semibold text-[var(--color-text-primary)] mb-4">添加敏感词</h3>
        <div className="flex gap-4">
          <input
            type="text"
            value={newWord}
            onChange={(e) => setNewWord(e.target.value)}
            placeholder="输入敏感词"
            className="flex-1 px-4 py-3 border border-[var(--color-border)] rounded-xl outline-none focus:border-[var(--color-primary)]"
          />
          <select
            value={newLevel}
            onChange={(e) => setNewLevel(e.target.value)}
            className="px-4 py-3 border border-[var(--color-border)] rounded-xl outline-none focus:border-[var(--color-primary)]"
          >
            <option value="warning">警告</option>
            <option value="block">拦截</option>
            <option value="delete">删除</option>
          </select>
          <button
            onClick={handleAddWord}
            disabled={!newWord.trim()}
            className="px-6 py-3 bg-gradient-to-r from-[#832FFF] to-[#4c53ff] text-white rounded-xl font-medium hover:shadow-lg transition-all disabled:opacity-50"
          >
            添加
          </button>
        </div>
      </div>

      {/* 敏感词列表 */}
      <div className="bg-white rounded-2xl border border-[var(--color-border)] overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-[var(--color-bg-secondary)]">
              <th className="px-6 py-4 text-left text-sm font-semibold text-[var(--color-text-primary)]">敏感词</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-[var(--color-text-primary)]">级别</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-[var(--color-text-primary)]">添加时间</th>
              <th className="px-6 py-4 text-right text-sm font-semibold text-[var(--color-text-primary)]">操作</th>
            </tr>
          </thead>
          <tbody>
            {words.map((word) => (
              <tr key={word.id} className="border-t border-[var(--color-border-light)] hover:bg-[var(--color-bg-hover)]">
                <td className="px-6 py-4 font-medium text-[var(--color-text-primary)]">{word.word}</td>
                <td className="px-6 py-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${levelColors[word.level]}`}>
                    {levelLabels[word.level]}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-[var(--color-text-muted)]">
                  {new Date(word.created_at).toLocaleString('zh-CN')}
                </td>
                <td className="px-6 py-4 text-right">
                  <button
                    onClick={() => handleDeleteWord(word.id)}
                    className="px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-xl transition-all"
                  >
                    删除
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {words.length === 0 && (
          <div className="p-12 text-center">
            <p className="text-[var(--color-text-muted)]">暂无敏感词</p>
          </div>
        )}
      </div>
    </div>
  );
}
