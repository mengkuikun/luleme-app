import { RecordEntry } from '../types';

export interface AuthUser {
  id: string;
  email: string;
  role: 'user' | 'admin' | string;
  region: string;
  status: 'active' | 'disabled' | string;
  permissions: string[];
}

interface LoginResponse {
  accessToken: string;
  accessExpiresAt: number;
  refreshToken: string;
  refreshExpiresAt: number;
  user: AuthUser;
}

export interface UserLeaderboardRow { id: string; email: string; region: string; total_checkins: number; }
export interface RegionLeaderboardRow { region: string; total_checkins: number; users: number; }
export interface AchievementItem { id: string; title: string; unlocked: boolean; desc: string; }
export interface GamificationData {
  totalCheckins: number;
  currentStreak: number;
  longestStreak: number;
  breakDays: number;
  cultivationLevel: string;
  achievements: AchievementItem[];
}

export interface AdminUserRow {
  id: string;
  email: string;
  role: string;
  region: string;
  status: string;
  permissions: string;
  total_checkins: number;
  last_checkin_at?: number;
  last_login_at?: number;
  created_at: number;
}

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') || '';
const ACCESS_TOKEN_KEY = 'lulemo_access_token';
const REFRESH_TOKEN_KEY = 'lulemo_refresh_token';
const ACCESS_EXPIRES_KEY = 'lulemo_access_exp';

function getAccessToken() { return localStorage.getItem(ACCESS_TOKEN_KEY); }
function getRefreshToken() { return localStorage.getItem(REFRESH_TOKEN_KEY); }
function saveTokens(payload: { accessToken: string; accessExpiresAt: number; refreshToken?: string }) {
  localStorage.setItem(ACCESS_TOKEN_KEY, payload.accessToken);
  localStorage.setItem(ACCESS_EXPIRES_KEY, String(payload.accessExpiresAt));
  if (payload.refreshToken) localStorage.setItem(REFRESH_TOKEN_KEY, payload.refreshToken);
}

async function request<T>(path: string, init: RequestInit = {}, retry = true): Promise<T> {
  const headers = new Headers(init.headers ?? {});
  headers.set('content-type', 'application/json');
  const accessToken = getAccessToken();
  if (accessToken) headers.set('authorization', `Bearer ${accessToken}`);
  const response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers });
  if (response.status === 401 && retry && getRefreshToken()) {
    await refreshSession();
    return request<T>(path, init, false);
  }
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error || '请求失败');
  }
  return response.json() as Promise<T>;
}

export async function sendRegisterCode(email: string): Promise<{ devCode?: string }> {
  return request('/api/auth/send-code', { method: 'POST', body: JSON.stringify({ email }) });
}

export async function register(email: string, password: string, code: string): Promise<void> {
  await request('/api/auth/register', { method: 'POST', body: JSON.stringify({ email, password, code, region: '未设置' }) });
}


export async function sendResetCode(email: string): Promise<{ devCode?: string }> {
  return request('/api/auth/send-reset-code', { method: 'POST', body: JSON.stringify({ email }) });
}

export async function resetPassword(email: string, code: string, password: string): Promise<void> {
  await request('/api/auth/reset-password', { method: 'POST', body: JSON.stringify({ email, code, password }) });
}

export async function login(email: string, password: string): Promise<AuthUser> {
  const payload = await request<LoginResponse>('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
  saveTokens(payload);
  return payload.user;
}

export async function refreshSession(): Promise<void> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) throw new Error('未登录');
  const payload = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ refreshToken }),
  });
  if (!payload.ok) {
    clearSession();
    throw new Error('会话已过期');
  }
  const data = (await payload.json()) as { accessToken: string; accessExpiresAt: number };
  saveTokens(data);
}

export async function getCurrentUser(): Promise<AuthUser> {
  const payload = await request<{ user: AuthUser }>('/api/auth/me', { method: 'GET' });
  return payload.user;
}

export async function updateMyRegion(region: string): Promise<void> {
  await request('/api/user/region', { method: 'POST', body: JSON.stringify({ region }) });
}

export async function logout(): Promise<void> {
  const refreshToken = getRefreshToken();
  if (refreshToken) await fetch(`${API_BASE_URL}/api/auth/logout`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ refreshToken }) });
  clearSession();
}

export function clearSession() { localStorage.removeItem(ACCESS_TOKEN_KEY); localStorage.removeItem(REFRESH_TOKEN_KEY); localStorage.removeItem(ACCESS_EXPIRES_KEY); }
export function hasSession() { return !!getAccessToken() && !!getRefreshToken(); }

export async function fetchRecords(): Promise<RecordEntry[]> { const payload = await request<{ records: RecordEntry[] }>('/api/records', { method: 'GET' }); return payload.records ?? []; }
export async function createRecord(record: RecordEntry): Promise<void> { await request('/api/records', { method: 'POST', body: JSON.stringify(record) }); }
export async function deleteRecord(recordId: string): Promise<void> { await request(`/api/records/${recordId}`, { method: 'DELETE' }); }
export async function bulkUpsertRecords(records: RecordEntry[]): Promise<void> { await request('/api/records/bulk', { method: 'POST', body: JSON.stringify({ records }) }); }

export async function fetchOverallLeaderboard(): Promise<UserLeaderboardRow[]> { const payload = await request<{ leaderboard: UserLeaderboardRow[] }>('/api/leaderboard/overall', { method: 'GET' }); return payload.leaderboard ?? []; }
export async function fetchRegionLeaderboard(): Promise<RegionLeaderboardRow[]> { const payload = await request<{ leaderboard: RegionLeaderboardRow[] }>('/api/leaderboard/region', { method: 'GET' }); return payload.leaderboard ?? []; }
export async function fetchGamification(): Promise<GamificationData> { return request<GamificationData>('/api/gamification/me', { method: 'GET' }); }

export async function fetchAdminUsers(): Promise<{ users: AdminUserRow[]; permissionTemplates: string[] }> { return request('/api/admin/users', { method: 'GET' }); }
export async function updateAdminUser(userId: string, payload: { role: string; status: string; permissions: string[] }) { await request(`/api/admin/users/${userId}`, { method: 'POST', body: JSON.stringify(payload) }); }

export async function askAi(question: string): Promise<{ answer: string; model: string }> { return request('/api/ai/ask', { method: 'POST', body: JSON.stringify({ question }) }); }
export async function fetchPublicStats(): Promise<{ total_users: number; total_checkins: number; today_checkins: number }> { const payload = await request<{ stats: { total_users: number; total_checkins: number; today_checkins: number } }>('/api/public/stats', { method: 'GET' }); return payload.stats; }

export async function fetchAppVersion(): Promise<{ currentVersion: string; latestVersion: string; hasUpdate: boolean; downloadUrl: string; releaseNotes: string }> {
  return request('/api/app/version', { method: 'GET' });
}
