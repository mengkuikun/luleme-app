
import React, { useState, useEffect } from 'react';
import { RecordEntry } from '../types';
import FaIcon from './FaIcon';

interface Props {
  date: string;
  records: RecordEntry[];
  onClose: () => void;
  onDelete: (id: string) => void;
  onAdd: (date: string, mood: string, note: string) => boolean;
  darkMode?: boolean;
  initialAddMode?: boolean;
}

const MOOD_OPTIONS = [
  { label: '开心', emoji: '😊' },
  { label: '放松', emoji: '😌' },
  { label: '疲惫', emoji: '😫' },
  { label: '兴奋', emoji: '🤩' },
  { label: '平静', emoji: '😐' },
  { label: '空虚', emoji: '🌫️' }
];

const DetailModal: React.FC<Props> = ({ date, records, onClose, onDelete, onAdd, darkMode, initialAddMode }) => {
  const [isAdding, setIsAdding] = useState(initialAddMode || false);
  const [selectedMood, setSelectedMood] = useState('放松');
  const [note, setNote] = useState('');
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());

  // Synchronize internal state with prop if it changes
  useEffect(() => {
    if (initialAddMode) setIsAdding(true);
  }, [initialAddMode]);

  const handleSave = () => {
    const added = onAdd(date, selectedMood, note);
    if (!added) return;
    setIsAdding(false);
    setNote('');
    // If we were in initialAddMode (triggered by long press from main screen), close the modal after saving
    if (initialAddMode) {
      onClose();
    }
  };

  const animateDelete = (id: string) => {
    setDeletingIds(prev => new Set(prev).add(id));
    // Wait for the animation (300ms) before calling the actual delete function
    setTimeout(() => {
      onDelete(id);
      setDeletingIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      
      // 如果删除后没有记录了，自动关闭modal
      if (records.length === 1) {
        setTimeout(() => {
          onClose();
        }, 100);
      }
    }, 300);
  };

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 dark:bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <style>{`
        @keyframes fadeSlideUp {
          0% { transform: translateY(0); opacity: 1; height: auto; margin-bottom: 0.75rem; }
          100% { transform: translateY(-20px); opacity: 0; height: 0; margin-bottom: 0; overflow: hidden; padding-top: 0; padding-bottom: 0; }
        }
        .animate-delete {
          animation: fadeSlideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards;
        }
        /* Scoped scrollbar for detail list */
        .detail-list-scroll::-webkit-scrollbar {
          width: 4px;
        }
        .detail-list-scroll::-webkit-scrollbar-thumb {
          background: rgba(76, 175, 80, 0.15);
          border-radius: 10px;
        }
      `}</style>
      <div 
        className="w-full max-w-md bg-white dark:bg-slate-900 rounded-t-[3rem] p-6 shadow-2xl animate-in slide-in-from-bottom duration-300 border-t dark:border-slate-800" 
        onClick={e => e.stopPropagation()}
      >
        <div className="w-12 h-1.5 bg-gray-200 dark:bg-slate-700 rounded-full mx-auto mb-6"></div>
        
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-2xl font-bold text-gray-800 dark:text-slate-100">{date}</h3>
            <p className="text-sm text-gray-500 dark:text-slate-400">
              {isAdding ? '记录此下的瞬间' : `当日共有 ${records.length} 条记录`}
            </p>
          </div>
          <button 
            onClick={isAdding && !initialAddMode ? () => setIsAdding(false) : onClose} 
            className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-400 transition-colors"
          >
            <FaIcon name={isAdding && !initialAddMode ? 'arrow-left' : 'xmark'} className="text-xl" />
          </button>
        </div>

        {isAdding ? (
          <div className="space-y-6 animate-in fade-in slide-in-from-right duration-300">
            <div>
              <label className="block text-sm font-bold text-gray-600 dark:text-slate-400 mb-3">心情怎么样？</label>
              <div className="grid grid-cols-3 gap-3">
                {MOOD_OPTIONS.map((mood) => (
                  <button
                    key={mood.label}
                    onClick={() => setSelectedMood(mood.label)}
                    className={`flex flex-col items-center p-3 rounded-2xl border-2 transition-all ${
                      selectedMood === mood.label 
                      ? 'border-green-500 bg-green-50 dark:bg-green-900/20 shadow-sm' 
                      : 'border-transparent bg-gray-50 dark:bg-slate-800 text-gray-400'
                    }`}
                  >
                    <span className="text-2xl mb-1">{mood.emoji}</span>
                    <span className={`text-xs font-bold ${selectedMood === mood.label ? 'text-green-700 dark:text-green-400' : ''}`}>
                      {mood.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-600 dark:text-slate-400 mb-3">🦌后感（可选）</label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="这一刻的心情或感受..."
                className="w-full p-4 bg-gray-50 dark:bg-slate-800 border-none rounded-2xl text-gray-800 dark:text-slate-200 focus:ring-2 focus:ring-green-500 min-h-[100px] resize-none text-sm"
              />
            </div>

            <button 
              onClick={handleSave}
              className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-4 rounded-2xl shadow-lg shadow-green-500/20 transition-all flex items-center justify-center gap-2"
            >
              <FaIcon name="check" />
              完成记录
            </button>
          </div>
        ) : (
          <>
            <div className="max-h-[350px] overflow-y-auto detail-list-scroll mb-6 flex flex-col gap-3 pr-1">
              {records.length > 0 ? (
                [...records].sort((a, b) => b.timestamp - a.timestamp).map(record => (
                  <div 
                    key={record.id} 
                    className={`flex flex-col p-4 bg-green-50 dark:bg-slate-800/50 rounded-2xl border border-green-100 dark:border-slate-800 group transition-all hover:shadow-md ${deletingIds.has(record.id) ? 'animate-delete' : ''}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white dark:bg-slate-700 rounded-full flex items-center justify-center shadow-sm">
                          <span className="text-xl">
                            {MOOD_OPTIONS.find(m => m.label === record.mood)?.emoji || '🦌'}
                          </span>
                        </div>
                        <div>
                          <div className="text-gray-800 dark:text-slate-200 font-bold text-sm">
                            {new Date(record.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                          <div className="text-[10px] uppercase font-bold text-green-600 dark:text-green-400 tracking-wider">
                            心情: {record.mood || '放松'}
                          </div>
                        </div>
                      </div>
                      <button 
                        onClick={() => animateDelete(record.id)}
                        disabled={deletingIds.has(record.id)}
                        className="w-8 h-8 flex items-center justify-center text-red-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-all opacity-0 group-hover:opacity-100 disabled:opacity-50"
                      >
                        <FaIcon name="trash-can" className="text-sm" />
                      </button>
                    </div>
                    {record.note && (
                      <div className="mt-1 pl-1 text-sm text-gray-600 dark:text-slate-400 italic bg-white/40 dark:bg-slate-900/40 p-3 rounded-xl">
                        "{record.note}"
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="py-12 text-center text-gray-400 dark:text-slate-600">
                  <div className="w-16 h-16 bg-gray-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 opacity-50">
                    <FaIcon name="calendar-day" className="text-3xl" />
                  </div>
                  <p className="font-medium text-sm">这天还没有打卡记录哦</p>
                </div>
              )}
            </div>

            <button 
              onClick={() => setIsAdding(true)}
              className="w-full bg-yellow-400 hover:bg-yellow-500 dark:bg-yellow-600 dark:hover:bg-yellow-700 text-yellow-900 dark:text-yellow-50 font-bold py-4 rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 group"
            >
              <FaIcon name="plus" className="group-hover:rotate-90 transition-transform" />
              补录其它心情
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default DetailModal;
