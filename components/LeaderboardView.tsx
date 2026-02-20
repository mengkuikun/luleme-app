import React, { useEffect, useMemo, useState } from 'react';
import { fetchOverallLeaderboard, fetchPublicStats, fetchRegionLeaderboard, RegionLeaderboardRow, UserLeaderboardRow } from '../utils/api';

const LeaderboardView: React.FC = () => {
  const [overall, setOverall] = useState<UserLeaderboardRow[]>([]);
  const [region, setRegion] = useState<RegionLeaderboardRow[]>([]);
  const [stats, setStats] = useState<{ total_users: number; total_checkins: number; today_checkins: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<'overall' | 'region'>('overall');

  const reload = async () => {
    setLoading(true);
    setError(null);
    try {
      const [o, r, s] = await Promise.all([fetchOverallLeaderboard(), fetchRegionLeaderboard(), fetchPublicStats()]);
      setOverall(o);
      setRegion(r);
      setStats(s);
    } catch (e) {
      setError(e instanceof Error ? e.message : '排行榜加载失败');
      setOverall([]);
      setRegion([]);
      setStats(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void reload();
  }, []);

  const rows = useMemo(() => (tab === 'overall' ? overall : region), [overall, region, tab]);

  return (
    <div className="p-4 pb-28 space-y-4 bg-gradient-to-b from-amber-50/60 to-transparent">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-green-700">🏆 联网排行榜</h2>
        <button onClick={() => void reload()} className="text-xs px-3 py-1 rounded-lg bg-emerald-100 text-emerald-700">刷新</button>
      </div>

      {stats && (
        <div className="bg-white rounded-2xl p-3 shadow text-xs text-gray-600 grid grid-cols-3 gap-2 text-center border border-emerald-100">
          <div><p className="font-bold text-green-700 text-sm">{stats.total_users}</p><p>活跃用户</p></div>
          <div><p className="font-bold text-green-700 text-sm">{stats.total_checkins}</p><p>总打卡</p></div>
          <div><p className="font-bold text-green-700 text-sm">{stats.today_checkins}</p><p>今日打卡</p></div>
        </div>
      )}

      <div className="grid grid-cols-2 bg-green-50 rounded-xl p-1">
        <button onClick={() => setTab('overall')} className={`py-2 rounded-lg text-sm font-semibold transition ${tab === 'overall' ? 'bg-green-600 text-white' : 'text-green-700'}`}>总排行</button>
        <button onClick={() => setTab('region')} className={`py-2 rounded-lg text-sm font-semibold transition ${tab === 'region' ? 'bg-green-600 text-white' : 'text-green-700'}`}>地区排行</button>
      </div>

      {error && <div className="bg-red-50 border border-red-200 rounded-2xl p-3 text-sm text-red-700">{error}</div>}

      {loading ? (
        <div className="bg-white rounded-2xl shadow p-4 text-sm text-gray-500">正在加载排行榜...</div>
      ) : rows.length === 0 ? (
        <div className="bg-white rounded-2xl shadow p-4 text-sm text-gray-500">暂无排行数据，先去打卡吧。</div>
      ) : (
        <div className="bg-white rounded-2xl shadow p-3 space-y-2 border border-emerald-100">
          {rows.map((item: UserLeaderboardRow | RegionLeaderboardRow, idx) => (
            <div key={`${tab}-${idx}`} className="flex items-center justify-between border-b last:border-b-0 py-2">
              <div>
                <p className="font-semibold text-sm">#{idx + 1} {tab === 'overall' ? (item as UserLeaderboardRow).email : (item as RegionLeaderboardRow).region || '未设置地区'}</p>
                <p className="text-xs text-gray-500">{tab === 'overall' ? `地区：${(item as UserLeaderboardRow).region || '未设置'}` : `上榜人数：${(item as RegionLeaderboardRow).users}`}</p>
              </div>
              <p className="text-green-700 font-bold">{item.total_checkins} 次</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default LeaderboardView;
