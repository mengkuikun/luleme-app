
import React, { useState, useEffect } from 'react';

interface Props {
  onUnlock: () => void;
}

const LockScreen: React.FC<Props> = ({ onUnlock }) => {
  const [input, setInput] = useState('');
  const [error, setError] = useState(false);
  const correctPin = localStorage.getItem('lulemo_pin');

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
