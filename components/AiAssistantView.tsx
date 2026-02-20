import React, { useState } from 'react';
import { askAi } from '../utils/api';

type Message = { role: 'user' | 'assistant'; content: string };

const quickPrompts = [
  '给我一个 7 天打卡计划',
  '我总是中断打卡，怎么恢复？',
  '请根据修仙系统给我激励话术',
  '如何减少拖延并坚持习惯？',
];

const AiAssistantView: React.FC = () => {
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: '你好，我是鹿了么 AI 助手。你可以问我如何养成稳定打卡习惯。' },
  ]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = question.trim();
    if (!q) return;
    setQuestion('');
    setMessages((prev) => [...prev, { role: 'user', content: q }]);
    setLoading(true);
    try {
      const res = await askAi(q);
      setMessages((prev) => [...prev, { role: 'assistant', content: res.answer }]);
    } catch (e) {
      setMessages((prev) => [...prev, { role: 'assistant', content: e instanceof Error ? e.message : 'AI 调用失败' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 pb-28 space-y-4 bg-gradient-to-b from-cyan-50/60 to-transparent">
      <h2 className="text-lg font-bold text-green-700">🤖 通义千问助手</h2>

      <div className="bg-white rounded-2xl p-3 shadow border border-emerald-100">
        <p className="text-xs text-gray-500 mb-2">快捷提问</p>
        <div className="flex flex-wrap gap-2">
          {quickPrompts.map((prompt) => (
            <button key={prompt} type="button" onClick={() => setQuestion(prompt)} className="px-2 py-1 text-xs rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
              {prompt}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl p-4 shadow border border-emerald-100 space-y-3 max-h-[50vh] overflow-y-auto">
        {messages.map((m, idx) => (
          <div key={idx} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[88%] px-3 py-2 rounded-xl text-sm whitespace-pre-wrap ${m.role === 'user' ? 'bg-green-600 text-white' : 'bg-green-50 text-gray-700 border border-green-100'}`}>
              {m.content}
            </div>
          </div>
        ))}
        {loading && <p className="text-xs text-gray-400">AI 思考中...</p>}
      </div>

      <form onSubmit={submit} className="bg-white rounded-2xl p-3 shadow border border-emerald-100 flex gap-2">
        <input className="flex-1 border rounded-xl px-3 py-2 text-sm" value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="例如：给我一个 7 天打卡计划" />
        <button className="px-4 py-2 rounded-xl bg-green-600 text-white text-sm" disabled={loading || !question.trim()}>发送</button>
      </form>
    </div>
  );
};

export default AiAssistantView;
