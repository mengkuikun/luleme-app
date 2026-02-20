import React, { useMemo, useState } from 'react';
import { resetPassword, sendRegisterCode, sendResetCode } from '../utils/api';

interface Props {
  onLogin: (email: string, password: string) => Promise<void>;
  onRegister: (email: string, password: string, code: string) => Promise<void>;
}

type AuthMode = 'login' | 'register' | 'forgot';

const AuthScreen: React.FC<Props> = ({ onLogin, onRegister }) => {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [codeTip, setCodeTip] = useState<string>('');

  const canSendCode = useMemo(() => /^\S+@\S+\.\S+$/.test(email), [email]);

  const handleSendCode = async () => {
    if (!canSendCode) {
      setError('请先输入合法邮箱');
      return;
    }
    setError(null);
    setSendingCode(true);
    setCodeTip('');
    try {
      const result = mode === 'register' ? await sendRegisterCode(email) : await sendResetCode(email);
      const text = mode === 'register' ? '注册验证码已发送，请查收邮箱' : '重置密码验证码已发送，请查收邮箱';
      setCodeTip(result.devCode ? `${text}（开发模式）：${result.devCode}` : text);
    } catch (e) {
      setError(e instanceof Error ? e.message : '发送失败');
    } finally {
      setSendingCode(false);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (mode === 'login') {
        await onLogin(email, password);
      } else if (mode === 'register') {
        await onRegister(email, password, code.trim());
      } else {
        await resetPassword(email, code.trim(), password);
        setMode('login');
        setCode('');
        setCodeTip('密码已重置，请使用新密码登录');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '请求失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 via-emerald-50 to-teal-100 flex items-center justify-center p-4" style={{ paddingTop: "calc(var(--safe-top, 0px) + 16px)", paddingBottom: "calc(var(--safe-bottom, 0px) + 16px)" }}>
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl p-6 border border-emerald-100">
        <h1 className="text-2xl font-extrabold text-green-700 text-center">鹿了么 · 联网版</h1>
        <p className="text-center text-xs text-gray-500 mt-1 mb-5">邮箱验证码注册 · 支持忘记密码找回</p>


        <p className="text-center text-[11px] text-emerald-700/80 mt-1 mb-4 bg-emerald-50 rounded-lg px-2 py-1">
          登录仅需邮箱+密码；验证码只在“注册”与“忘记密码”时使用。
        </p>

        <div className="grid grid-cols-2 mb-5 bg-green-50 rounded-xl p-1">
          <button type="button" onClick={() => setMode('login')} className={`py-2 rounded-lg text-sm font-semibold transition ${mode === 'login' ? 'bg-green-600 text-white shadow' : 'text-green-700'}`}>登录</button>
          <button type="button" onClick={() => setMode('register')} className={`py-2 rounded-lg text-sm font-semibold transition ${mode === 'register' ? 'bg-green-600 text-white shadow' : 'text-green-700'}`}>注册</button>
        </div>

        <form onSubmit={submit} className="space-y-3">
          <input className="w-full border border-gray-300 rounded-xl px-4 py-3" type="email" placeholder="邮箱" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <input className="w-full border border-gray-300 rounded-xl px-4 py-3" type="password" minLength={8} placeholder={mode === 'forgot' ? '新密码（至少 8 位）' : '密码（至少 8 位）'} value={password} onChange={(e) => setPassword(e.target.value)} required />

          {(mode === 'register' || mode === 'forgot') && (
            <div className="space-y-2">
              <div className="flex gap-2">
                <input className="flex-1 border border-gray-300 rounded-xl px-4 py-3" placeholder={mode === 'register' ? '注册验证码' : '重置验证码'} value={code} onChange={(e) => setCode(e.target.value)} required />
                <button type="button" onClick={() => void handleSendCode()} disabled={sendingCode || !canSendCode} className="px-3 py-2 rounded-xl bg-emerald-100 text-emerald-700 text-xs font-semibold disabled:opacity-50">
                  {sendingCode ? '发送中' : '发送验证码'}
                </button>
              </div>
              {codeTip && <div className="text-xs text-emerald-600 bg-emerald-50 rounded-lg px-2 py-1">{codeTip}</div>}
            </div>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button className="w-full py-3 rounded-xl bg-green-600 text-white font-semibold disabled:opacity-60" type="submit" disabled={loading}>
            {loading ? '请稍候...' : mode === 'login' ? '进入应用' : mode === 'register' ? '创建账号' : '重置密码'}
          </button>

          {mode === 'login' && (
            <button type="button" onClick={() => { setMode('forgot'); setCodeTip(''); setError(null); }} className="w-full text-sm text-emerald-700 hover:text-emerald-900">
              忘记密码？通过邮箱验证码找回
            </button>
          )}

          {mode === 'forgot' && (
            <button type="button" onClick={() => { setMode('login'); setCodeTip(''); setError(null); }} className="w-full text-sm text-gray-500 hover:text-gray-700">
              返回登录
            </button>
          )}
        </form>
      </div>
    </div>
  );
};

export default AuthScreen;
