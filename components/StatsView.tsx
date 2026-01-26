
import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { RecordEntry } from '../types';

interface Props {
  records: RecordEntry[];
  darkMode?: boolean;
}

const StatsView: React.FC<Props> = ({ records, darkMode }) => {
  const statsData = useMemo(() => {
    const months = ["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"];
    const currentYear = new Date().getFullYear();
    
    return months.map((m, index) => {
      const count = records.filter(r => {
        const d = new Date(r.timestamp);
        return d.getMonth() === index && d.getFullYear() === currentYear;
      }).length;
      return { name: m, count };
    });
  }, [records]);

  const totalCount = records.length;
  const avgMonthly = (totalCount / 12).toFixed(1);

  const quotes = [
    "保持节奏，🦌加油！", 
    "身心愉悦，适度最美。", 
    "鹿鹿大吉，今天也是元气满满！", 
    "听从身体的声音。",
    "健康生活，从了解自己开始。",
    "每一次记录，都是爱自己的证明。",
    "温柔对待自己，你值得被宠爱。",
    "身体是最诚实的朋友。",
    "规律作息，自然舒适。",
    "与自己和解，与身体对话。",
    "慢慢来，比较快。",
    "自律即自由，记录即成长。",
    "倾听内心，尊重感受。",
    "今天也要好好爱自己哦～",
    "每个阶段都有独特的美。",
    "悦纳自己，从记录开始。",
    "你已经做得很好了！",
    "健康的节奏，幸福的生活。",
    "温柔坚定，自在前行。",
    "记录点滴，收获成长。"
  ];
  // 使用 useMemo 缓存“一言”文本，避免拖动时频繁重新渲染导致内容跳动
  const encouragement = useMemo(() => {
    return quotes[Math.floor(Math.random() * quotes.length)];
  }, []);

  const tickColor = darkMode ? '#94a3b8' : '#6B7280';
  const gridColor = darkMode ? '#1e293b' : '#E5E7EB';
  const barColor = darkMode ? '#4ade80' : '#4CAF50';
  const barBgColor = darkMode ? '#334155' : '#E5E7EB';

  return (
    <div className="p-4 space-y-6">
      <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md p-6 rounded-3xl shadow-sm border border-green-100 dark:border-slate-800">
        <h3 className="text-xl font-bold text-green-800 dark:text-green-400 mb-4 flex items-center gap-2">
          <i className="fa-solid fa-chart-line"></i> 年度趋势 ({new Date().getFullYear()})
        </h3>
        {/* 修复：外层包裹 div 设置 overflow hidden 和最小高度，帮助 Recharts 正确计算尺寸 */}
        <div className="h-64 w-full min-w-0 overflow-hidden" style={{ minHeight: '256px' }}>
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <BarChart data={statsData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
              <XAxis 
                dataKey="name" 
                tick={{fontSize: 10, fill: tickColor}} 
                axisLine={false} 
                tickLine={false} 
                interval={0}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{fontSize: 10, fill: tickColor}} 
              />
              <Tooltip 
                cursor={{fill: darkMode ? '#1e293b' : '#F3F4F6'}}
                contentStyle={{
                  borderRadius: '16px', 
                  border: 'none', 
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                  backgroundColor: darkMode ? '#1e293b' : '#ffffff',
                  color: darkMode ? '#f1f5f9' : '#1f2937'
                }}
              />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {statsData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.count > 0 ? barColor : barBgColor} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-green-600 dark:bg-green-700 p-6 rounded-3xl text-white shadow-md">
          <div className="text-xs opacity-80 mb-1">年度累计</div>
          <div className="text-3xl font-black">{totalCount}</div>
          <div className="text-[10px] mt-1 font-bold">次</div>
        </div>
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-green-100 dark:border-slate-800 shadow-sm">
          <div className="text-xs text-gray-500 dark:text-slate-400 mb-1">月平均</div>
          <div className="text-3xl font-black text-green-800 dark:text-green-400">{avgMonthly}</div>
          <div className="text-[10px] text-green-600 dark:text-green-500 font-bold mt-1">次/月</div>
        </div>
      </div>

      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-900/50 p-6 rounded-3xl text-center">
        <span className="text-4xl block mb-2">🦌</span>
        <p className="text-yellow-900 dark:text-yellow-400 font-bold">{encouragement}</p>
      </div>
      
      <div className="space-y-3">
        <h4 className="text-gray-600 dark:text-slate-400 font-bold px-2">每月明细</h4>
        {statsData.filter(d => d.count > 0).reverse().map((m, i) => (
          <div key={i} className="bg-white/60 dark:bg-slate-900/60 p-4 rounded-2xl flex justify-between items-center border border-white/40 dark:border-slate-800">
            <span className="font-bold text-gray-700 dark:text-slate-300">{m.name}</span>
            <span className="bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-400 px-3 py-1 rounded-full text-xs font-bold">{m.count} 次</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default StatsView;
