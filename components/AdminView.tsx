import React, { useEffect, useMemo, useState } from 'react';
import { AdminUserRow, fetchAdminUsers, updateAdminUser } from '../utils/api';

const AdminView: React.FC = () => {
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [templates, setTemplates] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  const reload = async () => {
    try {
      const payload = await fetchAdminUsers();
      setUsers(payload.users);
      setTemplates(payload.permissionTemplates || []);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : '加载失败');
    }
  };

  useEffect(() => {
    void reload();
  }, []);

  const filteredUsers = useMemo(
    () => users.filter((u) => !query.trim() || u.email.toLowerCase().includes(query.trim().toLowerCase()) || u.region.includes(query.trim())),
    [users, query]
  );

  const userCount = users.length;
  const activeCount = users.filter((u) => u.status === 'active').length;

  const handleToggleStatus = async (u: AdminUserRow) => {
    setSavingId(u.id);
    try {
      await updateAdminUser(u.id, {
        role: u.role,
        status: u.status === 'active' ? 'disabled' : 'active',
        permissions: JSON.parse(u.permissions || '[]'),
      });
      await reload();
    } finally {
      setSavingId(null);
    }
  };

  const handleToggleRole = async (u: AdminUserRow) => {
    setSavingId(u.id);
    try {
      await updateAdminUser(u.id, {
        role: u.role === 'admin' ? 'user' : 'admin',
        status: u.status,
        permissions: JSON.parse(u.permissions || '[]'),
      });
      await reload();
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="p-4 pb-28 space-y-4 bg-gradient-to-b from-violet-50/50 to-transparent">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-violet-700">🛡️ 管理员控制台（仅管理员可见）</h2>
        <button onClick={() => void reload()} className="text-xs px-3 py-1 rounded-lg bg-violet-100 text-violet-700">刷新</button>
      </div>

      <div className="bg-white rounded-2xl p-3 shadow border border-violet-100 text-xs text-gray-600 grid grid-cols-2 gap-2">
        <p>用户总数：<span className="font-semibold">{userCount}</span></p>
        <p>活跃账号：<span className="font-semibold">{activeCount}</span></p>
        <p className="col-span-2">权限模板：{templates.join('、') || '无'}</p>
      </div>

      <input className="w-full border rounded-xl px-3 py-2 text-sm" placeholder="搜索邮箱或地区" value={query} onChange={(e) => setQuery(e.target.value)} />

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="bg-white rounded-2xl p-3 shadow space-y-3 border border-violet-100">
        {filteredUsers.map((u) => (
          <div key={u.id} className="border rounded-xl p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-1">
                <p className="font-semibold text-sm break-all">{u.email}</p>
                <p className="text-xs text-gray-500">地区：{u.region || '未设置'} ｜ 角色：{u.role} ｜ 状态：{u.status}</p>
                <p className="text-xs text-gray-500">总打卡：{u.total_checkins} ｜ 最后登录：{u.last_login_at ? new Date(u.last_login_at).toLocaleString() : '暂无'}</p>
              </div>
              <div className="flex flex-col gap-1 shrink-0">
                <button disabled={savingId === u.id} onClick={() => void handleToggleRole(u)} className="text-xs px-2 py-1 rounded bg-indigo-100 text-indigo-700 disabled:opacity-50">切换角色</button>
                <button disabled={savingId === u.id} onClick={() => void handleToggleStatus(u)} className="text-xs px-2 py-1 rounded bg-amber-100 text-amber-700 disabled:opacity-50">{u.status === 'active' ? '禁用' : '启用'}</button>
              </div>
            </div>
          </div>
        ))}
        {filteredUsers.length === 0 && <p className="text-sm text-gray-500">没有匹配的用户。</p>}
      </div>
    </div>
  );
};

export default AdminView;
