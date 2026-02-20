interface Env {
  DB: D1Database;
  CORS_ORIGIN?: string;
  ADMIN_EMAILS?: string;
  DASHSCOPE_API_KEY?: string;
  QWEN_MODEL?: string;
  RESEND_API_KEY?: string;
  RESEND_FROM?: string;
  DEV_BYPASS_EMAIL?: string;
  APP_LATEST_VERSION?: string;
  APP_DOWNLOAD_URL?: string;
  APP_RELEASE_NOTES?: string;
  ACCESS_TOKEN_SECRET?: string;
}

type SessionUser = { userId: string; email: string };
type AuthBody = { email?: string; password?: string; region?: string; code?: string };
type UserRow = {
  id: string;
  email: string;
  password_hash: string;
  password_salt: string;
  role: string;
  region: string;
  status: string;
  permissions: string;
};

const ACCESS_TOKEN_TTL_MS = 1000 * 60 * 30;
const REFRESH_TOKEN_TTL_MS = 1000 * 60 * 60 * 24 * 14;
const PASSWORD_ITERATIONS = 120_000;
const EMAIL_CODE_TTL_MS = 1000 * 60 * 10;
const ADMIN_PRESET_PERMISSIONS = ['dashboard:view', 'user:view', 'user:edit', 'leaderboard:view'];

function json(data: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: { 'content-type': 'application/json; charset=utf-8', ...(init.headers ?? {}) },
  });
}
function corsHeaders(env: Env): Record<string, string> {
  return {
    'access-control-allow-origin': env.CORS_ORIGIN || '*',
    'access-control-allow-methods': 'GET,POST,DELETE,OPTIONS',
    'access-control-allow-headers': 'content-type,authorization',
  };
}
function withCors(response: Response, env: Env): Response {
  const next = new Response(response.body, response);
  for (const [k, v] of Object.entries(corsHeaders(env))) next.headers.set(k, v);
  return next;
}
async function readJson<T>(request: Request): Promise<T | null> {
  try { return (await request.json()) as T; } catch { return null; }
}
function b64(bytes: Uint8Array): string { let b=''; for (let i=0;i<bytes.length;i++) b += String.fromCharCode(bytes[i]); return btoa(b); }
function b64d(value: string): Uint8Array { const b=atob(value); const out=new Uint8Array(b.length); for (let i=0;i<b.length;i++) out[i]=b.charCodeAt(i); return out; }
function randomId(prefix: string) { const arr = new Uint8Array(16); crypto.getRandomValues(arr); return `${prefix}_${b64(arr).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')}`; }
function parseAdminEmails(env: Env) { return new Set((env.ADMIN_EMAILS || '').split(',').map((x) => x.trim().toLowerCase()).filter(Boolean)); }
function parsePermissions(raw: string | null | undefined): string[] { try { const p=JSON.parse(raw || '[]'); return Array.isArray(p) ? p.filter((x)=>typeof x==='string') : []; } catch { return []; } }
function createCode() { return String(Math.floor(100000 + Math.random() * 900000)); }

async function sha256(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return b64(new Uint8Array(digest));
}
async function hashPassword(password: string, salt?: string) {
  const finalSalt = salt ?? b64(crypto.getRandomValues(new Uint8Array(16)));
  const km = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: b64d(finalSalt), iterations: PASSWORD_ITERATIONS, hash: 'SHA-256' }, km, 256);
  return { hash: b64(new Uint8Array(bits)), salt: finalSalt };
}
async function verifyPassword(password: string, salt: string, hash: string) { const computed = await hashPassword(password, salt); return computed.hash === hash; }

function b64urlEncode(bytes: Uint8Array): string {
  return b64(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}
function b64urlDecode(value: string): Uint8Array {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padding = normalized.length % 4;
  return b64d(`${normalized}${padding ? '='.repeat(4 - padding) : ''}`);
}

async function hmacSign(secret: string, payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
  return b64urlEncode(new Uint8Array(signature));
}

async function createAccessToken(env: Env, userId: string, email: string, expiresAt: number): Promise<string> {
  const secret = env.ACCESS_TOKEN_SECRET || 'dev-access-token-secret';
  const payload = b64urlEncode(new TextEncoder().encode(JSON.stringify({ userId, email, exp: expiresAt })));
  const signature = await hmacSign(secret, payload);
  return `${payload}.${signature}`;
}

async function parseAccessToken(env: Env, token: string): Promise<SessionUser | null> {
  const [payloadPart, signaturePart] = token.split('.');
  if (!payloadPart || !signaturePart) return null;

  const secret = env.ACCESS_TOKEN_SECRET || 'dev-access-token-secret';
  const expectedSignature = await hmacSign(secret, payloadPart);
  if (signaturePart !== expectedSignature) return null;

  try {
    const payloadJson = new TextDecoder().decode(b64urlDecode(payloadPart));
    const parsed = JSON.parse(payloadJson) as { userId: string; email: string; exp: number };
    if (!parsed.userId || !parsed.email || typeof parsed.exp !== 'number' || Date.now() > parsed.exp) return null;
    return { userId: parsed.userId, email: parsed.email };
  } catch {
    return null;
  }
}

async function requireAuth(env: Env, request: Request): Promise<SessionUser | null> {
  const auth = request.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  return parseAccessToken(env, auth.slice(7));
}

async function getUserById(env: Env, userId: string) {
  return env.DB.prepare('SELECT id, email, role, region, status, permissions FROM users WHERE id = ?').bind(userId).first<{
    id: string; email: string; role: string; region: string; status: string; permissions: string;
  }>();
}

async function sendCodeEmail(env: Env, email: string, code: string, scene: 'register' | 'reset') {
  if (env.DEV_BYPASS_EMAIL === 'true') return { bypass: true, code };
  if (!env.RESEND_API_KEY || !env.RESEND_FROM) throw new Error('未配置邮件服务');

  const subject = scene === 'register' ? '鹿了么注册验证码' : '鹿了么重置密码验证码';
  const intro = scene === 'register' ? '用于注册账号' : '用于重置密码';

  const resp = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: env.RESEND_FROM,
      to: email,
      subject,
      html: `<p>你的验证码是：<b>${code}</b></p><p>${intro}，10分钟内有效。</p>`,
    }),
  });
  if (!resp.ok) throw new Error(`邮件发送失败: ${await resp.text()}`);
  return { bypass: false };
}

async function createEmailCode(env: Env, email: string, scene: 'register' | 'reset') {
  const code = createCode();
  const codeHash = await sha256(`${scene}:${email}:${code}`);
  const now = Date.now();
  const expiresAt = now + EMAIL_CODE_TTL_MS;

  await env.DB.prepare('INSERT INTO email_verifications (id, email, purpose, code_hash, expires_at, consumed_at, created_at) VALUES (?, ?, ?, ?, ?, NULL, ?)')
    .bind(randomId('evc'), email, scene, codeHash, expiresAt, now)
    .run();

  return code;
}

async function verifyEmailCode(env: Env, email: string, code: string, scene: 'register' | 'reset') {
  const codeHash = await sha256(`${scene}:${email}:${code}`);
  const now = Date.now();
  const row = await env.DB.prepare(
    `SELECT id FROM email_verifications
     WHERE email = ? AND purpose = ? AND code_hash = ? AND consumed_at IS NULL AND expires_at >= ?
     ORDER BY created_at DESC LIMIT 1`
  ).bind(email, scene, codeHash, now).first<{ id: string }>();

  if (!row) return false;
  await env.DB.prepare('UPDATE email_verifications SET consumed_at = ? WHERE id = ?').bind(now, row.id).run();
  return true;
}

async function sendRegisterCode(env: Env, request: Request) {
  const body = await readJson<{ email?: string }>(request);
  const email = body?.email?.trim().toLowerCase();
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) return json({ error: '邮箱格式无效' }, { status: 400 });

  const exists = await env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(email).first();
  if (exists) return json({ error: '该邮箱已注册，请直接登录' }, { status: 409 });

  const code = await createEmailCode(env, email, 'register');
  const result = await sendCodeEmail(env, email, code, 'register');
  return json({ ok: true, ...(result.bypass ? { devCode: code } : {}) });
}

async function sendResetCode(env: Env, request: Request) {
  const body = await readJson<{ email?: string }>(request);
  const email = body?.email?.trim().toLowerCase();
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) return json({ error: '邮箱格式无效' }, { status: 400 });

  const user = await env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(email).first();
  if (!user) return json({ error: '该邮箱未注册' }, { status: 404 });

  const code = await createEmailCode(env, email, 'reset');
  const result = await sendCodeEmail(env, email, code, 'reset');
  return json({ ok: true, ...(result.bypass ? { devCode: code } : {}) });
}

async function resetPassword(env: Env, request: Request) {
  const body = await readJson<{ email?: string; code?: string; password?: string }>(request);
  const email = body?.email?.trim().toLowerCase();
  const code = body?.code?.trim() || '';
  const password = body?.password ?? '';

  if (!email || !/^\S+@\S+\.\S+$/.test(email)) return json({ error: '邮箱格式无效' }, { status: 400 });
  if (!code) return json({ error: '验证码不能为空' }, { status: 400 });
  if (password.length < 8) return json({ error: '密码至少 8 位' }, { status: 400 });

  const user = await env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(email).first<{ id: string }>();
  if (!user) return json({ error: '该邮箱未注册' }, { status: 404 });

  const codeOK = await verifyEmailCode(env, email, code, 'reset');
  if (!codeOK) return json({ error: '验证码无效或已过期' }, { status: 400 });

  const pwd = await hashPassword(password);
  const now = Date.now();
  await env.DB.prepare('UPDATE users SET password_hash = ?, password_salt = ?, updated_at = ? WHERE id = ?')
    .bind(pwd.hash, pwd.salt, now, user.id)
    .run();
  await env.DB.prepare('UPDATE sessions SET revoked_at = ? WHERE user_id = ? AND revoked_at IS NULL').bind(now, user.id).run();

  return json({ ok: true });
}

async function createSession(env: Env, user: { id: string; email: string; role: string; region: string; status: string; permissions: string[] }) {
  const now = Date.now();
  const accessExpiresAt = now + ACCESS_TOKEN_TTL_MS;
  const refreshToken = randomId('rtk');
  const refreshTokenHash = await sha256(refreshToken);
  const refreshExpiresAt = now + REFRESH_TOKEN_TTL_MS;

  await env.DB.prepare('INSERT INTO sessions (id, user_id, refresh_token_hash, expires_at, created_at, revoked_at) VALUES (?, ?, ?, ?, ?, NULL)')
    .bind(randomId('ses'), user.id, refreshTokenHash, refreshExpiresAt, now)
    .run();

  return { accessToken: await createAccessToken(env, user.id, user.email, accessExpiresAt), accessExpiresAt, refreshToken, refreshExpiresAt, user };
}

async function register(env: Env, body: AuthBody) {
  const email = body.email?.trim().toLowerCase();
  const password = body.password ?? '';
  const region = (body.region || '未知').trim().slice(0, 64) || '未知';
  const code = body.code?.trim() || '';
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) return json({ error: '邮箱格式无效' }, { status: 400 });
  if (!code) return json({ error: '验证码不能为空' }, { status: 400 });
  if (password.length < 8) return json({ error: '密码至少 8 位' }, { status: 400 });

  const exists = await env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(email).first();
  if (exists) return json({ error: '邮箱已注册' }, { status: 409 });

  const codeOK = await verifyEmailCode(env, email, code, 'register');
  if (!codeOK) return json({ error: '验证码无效或已过期' }, { status: 400 });

  const admin = parseAdminEmails(env).has(email);
  const role = admin ? 'admin' : 'user';
  const status = 'active';
  const permissions = admin ? ADMIN_PRESET_PERMISSIONS : ['record:self'];
  const now = Date.now();
  const userId = randomId('usr');
  const pwd = await hashPassword(password);

  await env.DB.prepare('INSERT INTO users (id, email, password_hash, password_salt, role, region, status, permissions, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .bind(userId, email, pwd.hash, pwd.salt, role, region, status, JSON.stringify(permissions), now, now)
    .run();

  return json({ ok: true });
}

async function login(env: Env, body: AuthBody) {
  const email = body.email?.trim().toLowerCase();
  const password = body.password ?? '';
  if (!email || !password) return json({ error: '邮箱和密码必填' }, { status: 400 });

  const user = await env.DB.prepare('SELECT id, email, password_hash, password_salt, role, region, status, permissions FROM users WHERE email = ?').bind(email).first<UserRow>();
  if (!user) return json({ error: '账号或密码错误' }, { status: 401 });
  if (user.status !== 'active') return json({ error: '账号已被禁用，请联系管理员' }, { status: 403 });
  const ok = await verifyPassword(password, user.password_salt, user.password_hash);
  if (!ok) return json({ error: '账号或密码错误' }, { status: 401 });

  return json(await createSession(env, { id: user.id, email: user.email, role: user.role, region: user.region, status: user.status, permissions: parsePermissions(user.permissions) }));
}

async function refresh(env: Env, request: Request) {
  const body = await readJson<{ refreshToken?: string }>(request);
  const refreshToken = body?.refreshToken;
  if (!refreshToken) return json({ error: '缺少 refresh token' }, { status: 400 });

  const now = Date.now();
  const hash = await sha256(refreshToken);
  const session = await env.DB.prepare(
    `SELECT s.user_id, s.expires_at, s.revoked_at, u.email, u.role, u.region, u.status, u.permissions
     FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.refresh_token_hash = ?`
  ).bind(hash).first<{ user_id: string; expires_at: number; revoked_at: number | null; email: string; role: string; region: string; status: string; permissions: string }>();

  if (!session || session.revoked_at || session.expires_at < now) return json({ error: 'refresh token 无效' }, { status: 401 });
  if (session.status !== 'active') return json({ error: '账号已被禁用' }, { status: 403 });

  const accessExpiresAt = now + ACCESS_TOKEN_TTL_MS;
  return json({
    accessToken: await createAccessToken(env, session.user_id, session.email, accessExpiresAt),
    accessExpiresAt,
    user: { id: session.user_id, email: session.email, role: session.role, region: session.region, status: session.status, permissions: parsePermissions(session.permissions) },
  });
}

async function logout(env: Env, request: Request) {
  const body = await readJson<{ refreshToken?: string }>(request);
  if (!body?.refreshToken) return json({ ok: true });
  const hash = await sha256(body.refreshToken);
  await env.DB.prepare('UPDATE sessions SET revoked_at = ? WHERE refresh_token_hash = ?').bind(Date.now(), hash).run();
  return json({ ok: true });
}

async function getMe(env: Env, request: Request) {
  const session = await requireAuth(env, request);
  if (!session) return json({ error: '未登录' }, { status: 401 });
  const user = await getUserById(env, session.userId);
  if (!user) return json({ error: '用户不存在' }, { status: 404 });
  return json({ user: { ...user, permissions: parsePermissions(user.permissions) } });
}

async function updateRegion(env: Env, request: Request) {
  const session = await requireAuth(env, request);
  if (!session) return json({ error: '未登录' }, { status: 401 });
  const body = await readJson<{ region?: string }>(request);
  const region = (body?.region || '').trim().slice(0, 64);
  if (!region) return json({ error: '地区不能为空' }, { status: 400 });
  await env.DB.prepare('UPDATE users SET region = ?, updated_at = ? WHERE id = ?').bind(region, Date.now(), session.userId).run();
  return json({ ok: true });
}

async function listRecords(env: Env, request: Request) {
  const session = await requireAuth(env, request);
  if (!session) return json({ error: '未登录' }, { status: 401 });
  const rows = await env.DB.prepare('SELECT id, timestamp, mood, note FROM records WHERE user_id = ? ORDER BY timestamp DESC').bind(session.userId).all();
  return json({ records: rows.results ?? [] });
}
async function createRecord(env: Env, request: Request) { const session=await requireAuth(env, request); if(!session) return json({error:'未登录'},{status:401}); const body=await readJson<{id?:string;timestamp?:number;mood?:string;note?:string}>(request); if(!body?.id||typeof body.timestamp!=='number') return json({error:'记录参数不正确'},{status:400}); const now=Date.now(); await env.DB.prepare(`INSERT INTO records (id,user_id,timestamp,mood,note,created_at,updated_at) VALUES (?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET timestamp=excluded.timestamp,mood=excluded.mood,note=excluded.note,updated_at=excluded.updated_at`).bind(body.id,session.userId,body.timestamp,body.mood??null,body.note??null,now,now).run(); return json({ok:true}); }
async function bulkCreateRecords(env: Env, request: Request) { const session=await requireAuth(env, request); if(!session) return json({error:'未登录'},{status:401}); const body=await readJson<{records?:Array<{id:string;timestamp:number;mood?:string;note?:string}>}>(request); const records=body?.records??[]; const now=Date.now(); const stmt=env.DB.prepare(`INSERT INTO records (id,user_id,timestamp,mood,note,created_at,updated_at) VALUES (?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET timestamp=excluded.timestamp,mood=excluded.mood,note=excluded.note,updated_at=excluded.updated_at`); for(const item of records){ if(!item?.id||typeof item.timestamp!=='number') continue; await stmt.bind(item.id,session.userId,item.timestamp,item.mood??null,item.note??null,now,now).run(); } return json({ok:true,count:records.length}); }
async function deleteRecord(env: Env, request: Request, id: string) { const session=await requireAuth(env, request); if(!session) return json({error:'未登录'},{status:401}); await env.DB.prepare('DELETE FROM records WHERE id = ? AND user_id = ?').bind(id,session.userId).run(); return json({ok:true}); }

function getDateKey(ts: number) { return new Date(ts).toISOString().slice(0, 10); }
function calcStreaks(timestamps: number[]) { if (!timestamps.length) return { currentStreak: 0, longestStreak: 0, breakDays: 0 }; const days=Array.from(new Set(timestamps.map(getDateKey))).sort(); let run=1,longest=1; for(let i=1;i<days.length;i++){ const d=(new Date(days[i]).getTime()-new Date(days[i-1]).getTime())/86400000; if(d===1){run+=1; longest=Math.max(longest,run);} else run=1; } const last=new Date(days[days.length-1]).getTime(); const breakDays=Math.max(0,Math.floor((Date.now()-last)/86400000)); let current=1; for(let i=days.length-1;i>0;i--){ const d=(new Date(days[i]).getTime()-new Date(days[i-1]).getTime())/86400000; if(d===1) current+=1; else break;} return {currentStreak:current,longestStreak:longest,breakDays}; }
function getCultivationLevel(total: number, breakDays: number) { const score=total*10-breakDays*3; if(score>=1500) return '大乘期'; if(score>=1000) return '化神期'; if(score>=700) return '元婴期'; if(score>=450) return '金丹期'; if(score>=250) return '筑基期'; if(score>=80) return '炼气期'; return '凡人'; }

async function getOverallLeaderboard(env: Env) { const rows=await env.DB.prepare(`SELECT u.id,u.email,u.region,COUNT(r.id) AS total_checkins FROM users u LEFT JOIN records r ON r.user_id=u.id WHERE u.status='active' GROUP BY u.id ORDER BY total_checkins DESC, u.created_at ASC LIMIT 50`).all(); return json({leaderboard:rows.results??[]}); }
async function getRegionLeaderboard(env: Env) { const rows=await env.DB.prepare(`SELECT u.region,COUNT(r.id) AS total_checkins,COUNT(DISTINCT u.id) AS users FROM users u LEFT JOIN records r ON r.user_id=u.id WHERE u.status='active' GROUP BY u.region ORDER BY total_checkins DESC LIMIT 100`).all(); return json({leaderboard:rows.results??[]}); }
async function getGamification(env: Env, request: Request) { const s=await requireAuth(env, request); if(!s) return json({error:'未登录'},{status:401}); const rec=await env.DB.prepare('SELECT timestamp FROM records WHERE user_id = ? ORDER BY timestamp DESC').bind(s.userId).all<{timestamp:number}>(); const ts=(rec.results??[]).map(x=>Number(x.timestamp)).filter(Number.isFinite); const totalCheckins=ts.length; const {currentStreak,longestStreak,breakDays}=calcStreaks(ts); const cultivationLevel=getCultivationLevel(totalCheckins,breakDays); const achievements=[{id:'first',title:'初入江湖',unlocked:totalCheckins>=1,desc:'完成首次打卡'},{id:'total30',title:'勤学不辍',unlocked:totalCheckins>=30,desc:'累计打卡 30 次'},{id:'streak7',title:'七日连修',unlocked:currentStreak>=7,desc:'连续打卡 7 天'},{id:'streak30',title:'月圆无缺',unlocked:longestStreak>=30,desc:'最长连续打卡 30 天'},{id:'silent7',title:'闭关修炼',unlocked:breakDays>=7,desc:'连续 7 天未打卡'}]; return json({totalCheckins,currentStreak,longestStreak,breakDays,cultivationLevel,achievements}); }

async function requireAdmin(env: Env, request: Request) { const s=await requireAuth(env, request); if(!s) return {ok:false as const,res:json({error:'未登录'},{status:401})}; const u=await getUserById(env,s.userId); if(!u||u.role!=='admin') return {ok:false as const,res:json({error:'无管理员权限'},{status:403})}; return {ok:true as const}; }
async function getAdminUsers(env: Env, request: Request) { const g=await requireAdmin(env,request); if(!g.ok) return g.res; const rows=await env.DB.prepare(`SELECT u.id,u.email,u.role,u.region,u.status,u.permissions,u.created_at,COUNT(r.id) AS total_checkins,MAX(r.timestamp) AS last_checkin_at,(SELECT MAX(s.created_at) FROM sessions s WHERE s.user_id=u.id) AS last_login_at FROM users u LEFT JOIN records r ON r.user_id=u.id GROUP BY u.id ORDER BY u.created_at DESC`).all(); return json({users:rows.results??[],permissionTemplates:ADMIN_PRESET_PERMISSIONS}); }
async function updateAdminUser(env: Env, request: Request, userId: string) { const g=await requireAdmin(env,request); if(!g.ok) return g.res; const body=await readJson<{role?:string;status?:string;permissions?:string[]}>(request); if(!body) return json({error:'无效请求'},{status:400}); const role=body.role==='admin'?'admin':'user'; const status=body.status==='disabled'?'disabled':'active'; const perms=Array.isArray(body.permissions)?body.permissions.filter((x)=>typeof x==='string'):[]; await env.DB.prepare('UPDATE users SET role=?, status=?, permissions=?, updated_at=? WHERE id=?').bind(role,status,JSON.stringify(perms),Date.now(),userId).run(); return json({ok:true}); }

async function askQwen(env: Env, request: Request) {
  const s = await requireAuth(env, request);
  if (!s) return json({ error: '未登录' }, { status: 401 });
  const body = await readJson<{ question?: string }>(request);
  const question = body?.question?.trim();
  if (!question) return json({ error: '请输入问题' }, { status: 400 });
  if (!env.DASHSCOPE_API_KEY) return json({ error: '未配置 DASHSCOPE_API_KEY' }, { status: 500 });
  const resp = await fetch('https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${env.DASHSCOPE_API_KEY}` },
    body: JSON.stringify({ model: env.QWEN_MODEL || 'qwen-plus', messages: [{ role: 'system', content: '你是鹿了么健康打卡助手，回答简洁、积极、可执行。' }, { role: 'user', content: question }], temperature: 0.7 }),
  });
  if (!resp.ok) return json({ error: '通义千问调用失败', detail: (await resp.text()).slice(0, 500) }, { status: 502 });
  const data = (await resp.json()) as { choices?: Array<{ message?: { content?: string } }> };
  return json({ answer: data.choices?.[0]?.message?.content?.trim() || '暂无回复', model: env.QWEN_MODEL || 'qwen-plus' });
}

async function getPublicStats(env: Env) { const totals=await env.DB.prepare(`SELECT (SELECT COUNT(*) FROM users WHERE status='active') AS total_users,(SELECT COUNT(*) FROM records) AS total_checkins,(SELECT COUNT(*) FROM records WHERE timestamp >= ?) AS today_checkins`).bind(new Date(new Date().toDateString()).getTime()).first<{total_users:number;total_checkins:number;today_checkins:number}>(); return json({stats:totals??{total_users:0,total_checkins:0,today_checkins:0}}); }
function compareVersion(a: string, b: string) { const A=a.split('.').map(Number), B=b.split('.').map(Number); for(let i=0;i<3;i++){const d=(A[i]||0)-(B[i]||0); if(d!==0) return d;} return 0; }
async function getAppVersion(env: Env) {
  const current = '1.6.0';
  const latest = env.APP_LATEST_VERSION || current;
  const hasUpdate = compareVersion(latest, current) > 0;
  return json({ currentVersion: current, latestVersion: latest, hasUpdate, downloadUrl: env.APP_DOWNLOAD_URL || '', releaseNotes: env.APP_RELEASE_NOTES || '修复问题并优化体验' });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') return withCors(new Response(null, { status: 204 }), env);
    const url = new URL(request.url);
    try {
      let res: Response;
      if (url.pathname === '/api/health') res = json({ ok: true, service: 'luleme-network-api' });
      else if (url.pathname === '/api/public/stats' && request.method === 'GET') res = await getPublicStats(env);
      else if (url.pathname === '/api/app/version' && request.method === 'GET') res = await getAppVersion(env);
      else if (url.pathname === '/api/auth/send-code' && request.method === 'POST') res = await sendRegisterCode(env, request);
      else if (url.pathname === '/api/auth/register' && request.method === 'POST') { const body=await readJson<AuthBody>(request); res=body?await register(env,body):json({error:'无效 JSON'},{status:400}); }
      else if (url.pathname === '/api/auth/send-reset-code' && request.method === 'POST') res = await sendResetCode(env, request);
      else if (url.pathname === '/api/auth/reset-password' && request.method === 'POST') res = await resetPassword(env, request);
      else if (url.pathname === '/api/auth/login' && request.method === 'POST') { const body=await readJson<AuthBody>(request); res=body?await login(env,body):json({error:'无效 JSON'},{status:400}); }
      else if (url.pathname === '/api/auth/refresh' && request.method === 'POST') res = await refresh(env, request);
      else if (url.pathname === '/api/auth/logout' && request.method === 'POST') res = await logout(env, request);
      else if (url.pathname === '/api/auth/me' && request.method === 'GET') res = await getMe(env, request);
      else if (url.pathname === '/api/user/region' && request.method === 'POST') res = await updateRegion(env, request);
      else if (url.pathname === '/api/records' && request.method === 'GET') res = await listRecords(env, request);
      else if (url.pathname === '/api/records' && request.method === 'POST') res = await createRecord(env, request);
      else if (url.pathname === '/api/records/bulk' && request.method === 'POST') res = await bulkCreateRecords(env, request);
      else if (url.pathname.startsWith('/api/records/') && request.method === 'DELETE') res = await deleteRecord(env, request, url.pathname.replace('/api/records/', '').trim());
      else if (url.pathname === '/api/leaderboard/overall' && request.method === 'GET') res = await getOverallLeaderboard(env);
      else if (url.pathname === '/api/leaderboard/region' && request.method === 'GET') res = await getRegionLeaderboard(env);
      else if (url.pathname === '/api/gamification/me' && request.method === 'GET') res = await getGamification(env, request);
      else if (url.pathname === '/api/admin/users' && request.method === 'GET') res = await getAdminUsers(env, request);
      else if (url.pathname.startsWith('/api/admin/users/') && request.method === 'POST') res = await updateAdminUser(env, request, url.pathname.replace('/api/admin/users/', '').trim());
      else if (url.pathname === '/api/ai/ask' && request.method === 'POST') res = await askQwen(env, request);
      else res = json({ error: 'Not found' }, { status: 404 });
      return withCors(res, env);
    } catch (error) {
      return withCors(json({ error: '服务器错误', detail: (error as Error).message }, { status: 500 }), env);
    }
  },
};
