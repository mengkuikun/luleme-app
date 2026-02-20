import React, { useEffect, useMemo, useState } from 'react';
import { fetchGamification, GamificationData } from '../utils/api';

const CHALLENGE_TARGETS = [7, 14, 30, 60];

const CultivationView: React.FC = () => {
  const [data, setData] = useState<GamificationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchGamification();
      setData(result);
    } catch (e) {
      setData(null);
      setError(e instanceof Error ? e.message : '修仙数据加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void reload();
  }, []);

  const unlockedCount = useMemo(() => data?.achievements.filter((a) => a.unlocked).length ?? 0, [data]);
  const nextChallenge = useMemo(() => {
    if (!data) return null;
    const next = CHALLENGE_TARGETS.find((target) => target > data.currentStreak);
    if (!next) return null;
    return {
      target: next,
      remain: Math.max(0, next - data.currentStreak),
      progress: Math.min(100, Math.round((data.currentStreak / next) * 100)),
    };
  }, [data]);

  if (loading) return <div className="p-4 text-sm text-gray-500">修仙数据加载中...</div>;
  if (!data) {
    return (
      <div className="p-4 space-y-3">
        <p className="text-sm text-gray-500">修仙数据加载失败，请稍后重试。</p>
        {error && <p className="text-xs text-red-600">{error}</p>}
        <button onClick={() => void reload()} className="text-xs px-3 py-1 rounded-lg bg-emerald-100 text-emerald-700">重新加载</button>
      </div>
    );
  }

  return (
    <div className="p-4 pb-28 space-y-4 bg-gradient-to-b from-emerald-50/60 to-transparent">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-green-700">🧘 成就与修仙系统</h2>
        <button onClick={() => void reload()} className="text-xs px-3 py-1 rounded-lg bg-emerald-100 text-emerald-700">刷新</button>
      </div>

      <div className="bg-white rounded-2xl p-4 shadow space-y-2 border border-emerald-100">
        <p>修仙境界：<span className="font-bold text-emerald-700">{data.cultivationLevel}</span></p>
        <p>累计打卡：<span className="font-bold">{data.totalCheckins}</span></p>
        <p>当前连击：<span className="font-bold">{data.currentStreak} 天</span></p>
        <p>最长连击：<span className="font-bold">{data.longestStreak} 天</span></p>
        <p>闭关天数：<span className="font-bold">{data.breakDays} 天</span></p>
        <p>已解锁成就：<span className="font-bold">{unlockedCount}/{data.achievements.length}</span></p>
      </div>

      <div className="bg-white rounded-2xl p-4 shadow border border-emerald-100">
        <h3 className="font-semibold mb-2 text-emerald-700">🎯 连击挑战</h3>
        {nextChallenge ? (
          <div className="space-y-2">
            <p className="text-sm text-gray-700">距离 <span className="font-semibold">{nextChallenge.target} 天连击挑战</span> 还差 {nextChallenge.remain} 天</p>
            <div className="w-full bg-emerald-100 rounded-full h-2">
              <div className="h-2 rounded-full bg-emerald-500" style={{ width: `${nextChallenge.progress}%` }} />
            </div>
            <p className="text-xs text-gray-500">继续保持每日打卡，自动解锁更高境界。</p>
          </div>
        ) : (
          <p className="text-sm text-emerald-700">你已达成顶级连击挑战，继续保持！</p>
        )}
      </div>

      <div className="bg-white rounded-2xl p-4 shadow border border-emerald-100">
        <h3 className="font-semibold mb-2 text-green-700">成就墙</h3>
        <div className="space-y-2">
          {data.achievements.map((a) => (
            <div key={a.id} className={`p-2 rounded-lg border ${a.unlocked ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
              <p className="text-sm font-semibold">{a.unlocked ? '✅' : '⬜'} {a.title}</p>
              <p className="text-xs text-gray-500">{a.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CultivationView;
