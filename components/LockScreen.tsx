import React, { useState } from 'react';
import { PIN_KEY, SECURITY_QUESTION_KEY, SECURITY_ANSWER_KEY, SECURITY_QUESTIONS } from '../constants';

interface Props {
  onUnlock: () => void;
  /** 重置 PIN（清除 PIN 与安全问题后解锁） */
  onResetPin?: () => void;
}

const LockScreen: React.FC<Props> = ({ onUnlock, onResetPin }) => {
  const [input, setInput] = useState('');
  const [error, setError] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [securityAnswer, setSecurityAnswer] = useState('');
  const [forgotError, setForgotError] = useState('');
  /** 安全问题验证通过后：显示 PIN 或执行重置 */
  const [showPinReveal, setShowPinReveal] = useState(false);

  const correctPin = localStorage.getItem(PIN_KEY);
  const savedQuestionId = localStorage.getItem(SECURITY_QUESTION_KEY);
  const savedAnswer = localStorage.getItem(SECURITY_ANSWER_KEY);
  const questionLabel = savedQuestionId
    ? (SECURITY_QUESTIONS.find((q) => q.id === savedQuestionId)?.label ?? '')
    : '';

  const handleForgotSubmit = () => {
    const trimmed = securityAnswer.trim();
    if (!savedAnswer || !questionLabel) {
      setForgotError('未设置安全问题，无法通过此方式找回。请回忆 PIN 或清除应用数据。');
      return;
    }
    if (!trimmed) {
      setForgotError('请输入答案');
      return;
    }
    if (trimmed !== savedAnswer) {
      setForgotError('答案错误');
      return;
    }
    setForgotError('');
    setSecurityAnswer('');
    setShowForgot(false);
    setShowPinReveal(true);
  };

  const handleConfirmReveal = () => {
    setShowPinReveal(false);
    onUnlock();
  };

  const handleResetPin = () => {
    setShowPinReveal(false);
    onResetPin?.();
  };

  const handlePress = (num: string) => {
    if (input.length < 4) {
      setError(false);
      const newInput = input + num;
      setInput(newInput);
      
      if (newInput.length === 4) {
        if (newInput === correctPin) {
          onUnlock();
        } else {
          setError(true);
          // Vibrating feedback could be added here if needed
          setTimeout(() => setInput(''), 500);
        }
      }
    }
  };

  const handleDelete = () => {
    setInput(input.slice(0, -1));
    setError(false);
  };

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#F1F8E9] forest-bg p-8">
      <div className="mb-8 text-center animate-in fade-in zoom-in duration-500">
        <span className="text-6xl mb-4 block drop-shadow-lg">🦌</span>
        <h2 className="text-2xl font-bold text-green-800">隐私锁定</h2>
        <p className="text-sm text-green-600 mt-2">请输入 PIN 码解锁</p>
      </div>

      <div className={`flex gap-6 mb-12 ${error ? 'animate-shake' : ''}`}>
        {[0, 1, 2, 3].map((i) => {
          const isActive = input.length > i;
          const isCurrent = input.length === i;
          return (
            <div 
              key={i} 
              className={`
                w-5 h-5 rounded-full border-2 transition-all duration-300 transform
                ${isActive 
                  ? 'bg-green-500 border-green-500 scale-110 shadow-[0_0_15px_rgba(34,197,94,0.6)]' 
                  : 'bg-white/50 border-green-200 scale-100'}
                ${isCurrent ? 'border-green-400 scale-105 animate-pulse' : ''}
                ${error ? 'border-red-500 bg-red-100 shadow-[0_0_10px_rgba(239,68,68,0.4)]' : ''}
              `}
            />
          );
        })}
      </div>

      <div className="grid grid-cols-3 gap-6 animate-in slide-in-from-bottom-10 duration-500 delay-150">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
          <button 
            key={n} 
            onClick={() => handlePress(n.toString())}
            className="w-16 h-16 rounded-full bg-white/80 backdrop-blur-sm shadow-sm border border-green-100 flex items-center justify-center text-xl font-bold text-green-800 active:bg-green-500 active:text-white active:scale-90 transition-all duration-100"
          >
            {n}
          </button>
        ))}
        <div />
        <button 
          onClick={() => handlePress('0')}
          className="w-16 h-16 rounded-full bg-white/80 backdrop-blur-sm shadow-sm border border-green-100 flex items-center justify-center text-xl font-bold text-green-800 active:bg-green-500 active:text-white active:scale-90 transition-all duration-100"
        >
          0
        </button>
        <button 
          onClick={handleDelete}
          className="w-16 h-16 flex items-center justify-center text-green-600 active:scale-75 transition-transform"
          aria-label="Delete"
        >
          <i className="fa-solid fa-delete-left text-2xl"></i>
        </button>
      </div>

      {showPinReveal ? (
        <div className="mt-6 w-full max-w-xs p-5 bg-white/95 dark:bg-slate-800/95 rounded-2xl border-2 border-green-300 dark:border-green-700 shadow-xl">
          <p className="text-sm font-bold text-gray-800 dark:text-slate-200 mb-2">验证成功</p>
          <p className="text-xs text-gray-500 dark:text-slate-400 mb-2">您的 PIN 码是：</p>
          <p className="text-2xl font-black text-green-600 dark:text-green-400 tracking-[0.4em] mb-4">{correctPin ?? '----'}</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleConfirmReveal}
              className="flex-1 py-2.5 bg-green-500 text-white font-bold rounded-xl text-sm"
            >
              确认
            </button>
            <button
              type="button"
              onClick={handleResetPin}
              className="flex-1 py-2.5 bg-amber-500 text-white font-bold rounded-xl text-sm"
            >
              重置 PIN
            </button>
          </div>
        </div>
      ) : !showForgot ? (
        <button
          type="button"
          onClick={() => setShowForgot(true)}
          className="mt-6 text-sm text-green-600 hover:text-green-700 font-bold underline underline-offset-2"
        >
          忘记 PIN？
        </button>
      ) : (
        <div className="mt-6 w-full max-w-xs p-4 bg-white/90 dark:bg-slate-800/90 rounded-2xl border border-green-200 dark:border-slate-700">
          <p className="text-xs text-gray-500 dark:text-slate-400 mb-2">通过安全问题验证</p>
          {questionLabel ? (
            <>
              <p className="text-sm font-bold text-gray-800 dark:text-slate-200 mb-2">{questionLabel}</p>
              <input
                type="text"
                value={securityAnswer}
                onChange={(e) => { setSecurityAnswer(e.target.value); setForgotError(''); }}
                placeholder="请输入答案"
                className="w-full p-3 rounded-xl border border-green-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-800 dark:text-slate-200 text-sm focus:ring-2 focus:ring-green-400"
              />
              {forgotError && <p className="mt-2 text-xs text-red-500">{forgotError}</p>}
              <div className="flex gap-2 mt-3">
                <button
                  type="button"
                  onClick={handleForgotSubmit}
                  className="flex-1 py-2 bg-green-500 text-white font-bold rounded-xl text-sm"
                >
                  验证
                </button>
                <button
                  type="button"
                  onClick={() => { setShowForgot(false); setSecurityAnswer(''); setForgotError(''); }}
                  className="flex-1 py-2 bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-slate-300 font-bold rounded-xl text-sm"
                >
                  返回
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="text-sm text-gray-600 dark:text-slate-400 mb-3">未设置安全问题，无法通过此方式找回。</p>
              <button
                type="button"
                onClick={() => setShowForgot(false)}
                className="w-full py-2 bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-slate-300 font-bold rounded-xl text-sm"
              >
                返回
              </button>
            </>
          )}
        </div>
      )}
      
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-10px); }
          40% { transform: translateX(10px); }
          60% { transform: translateX(-7px); }
          80% { transform: translateX(7px); }
        }
        .animate-shake {
          animation: shake 0.4s ease-in-out;
        }
      `}</style>
    </div>
  );
};

export default LockScreen;
