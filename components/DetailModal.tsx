
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { RecordEntry, RecordEntryDraft } from '../types';
import FaIcon from './FaIcon';

interface Props {
  date: string;
  records: RecordEntry[];
  onClose: () => void;
  onDelete: (id: string) => void;
  onAdd: (draft: RecordEntryDraft) => boolean;
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

const DURATION_OPTIONS = [5, 10, 20, 30, 45, 60];
const MOVIE_CATEGORY_OPTIONS = ['日韩', '欧美', '国产', '动漫', '其他', '自定义'] as const;
const DETAIL_MODAL_EXIT_MS = 220;
const DETAIL_MODAL_TOP_GAP_PX = 12;

const DetailModal: React.FC<Props> = ({ date, records, onClose, onDelete, onAdd, darkMode, initialAddMode }) => {
  const [isAdding, setIsAdding] = useState(initialAddMode || false);
  const [selectedMood, setSelectedMood] = useState('放松');
  const [note, setNote] = useState('');
  const [durationInput, setDurationInput] = useState('');
  const [watchedMovie, setWatchedMovie] = useState(false);
  const [movieCategory, setMovieCategory] = useState<(typeof MOVIE_CATEGORY_OPTIONS)[number]>('日韩');
  const [customMovieCategory, setCustomMovieCategory] = useState('');
  const [armedDeleteId, setArmedDeleteId] = useState<string | null>(null);
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const [isClosing, setIsClosing] = useState(false);
  const closeTimerRef = useRef<number | null>(null);

  // Synchronize internal state with prop if it changes
  useEffect(() => {
    if (initialAddMode) setIsAdding(true);
  }, [initialAddMode]);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current != null) {
        window.clearTimeout(closeTimerRef.current);
      }
    };
  }, []);

  const requestClose = useCallback(() => {
    if (isClosing) return;
    setIsClosing(true);
    closeTimerRef.current = window.setTimeout(() => {
      onClose();
    }, DETAIL_MODAL_EXIT_MS);
  }, [isClosing, onClose]);

  const handleSave = () => {
    const parsedDuration = Number(durationInput.trim());
    const durationMinutes =
      durationInput.trim() && Number.isFinite(parsedDuration) && parsedDuration > 0
        ? Math.round(parsedDuration)
        : undefined;
    const resolvedMovieCategory = watchedMovie
      ? movieCategory === '自定义'
        ? customMovieCategory.trim() || '自定义'
        : movieCategory
      : undefined;

    const added = onAdd({
      date,
      mood: selectedMood,
      note,
      durationMinutes,
      watchedMovie,
      movieCategory: resolvedMovieCategory,
    });
    if (!added) return;
    setIsAdding(false);
    setNote('');
    setDurationInput('');
    setWatchedMovie(false);
    setMovieCategory('日韩');
    setCustomMovieCategory('');
    // If we were in initialAddMode (triggered by long press from main screen), close the modal after saving
    if (initialAddMode) {
      requestClose();
    }
  };

  const animateDelete = (id: string) => {
    setDeletingIds(prev => new Set(prev).add(id));
    setArmedDeleteId(null);
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
          requestClose();
        }, 100);
      }
    }, 300);
  };

  const formatMovieCategory = (record: RecordEntry) =>
    record.watchedMovie ? record.movieCategory || '已观看影片' : '未观看影片';

  const sheetMaxHeight = `calc(100dvh - env(safe-area-inset-top, 0px) - ${DETAIL_MODAL_TOP_GAP_PX}px)`;

  return (
    <div
      className={`fixed inset-0 z-40 flex items-end justify-center bg-black/40 dark:bg-black/60 backdrop-blur-sm ${
        isClosing ? 'detail-modal-backdrop-out' : 'detail-modal-backdrop'
      }`}
      style={{
        paddingTop: `calc(env(safe-area-inset-top, 0px) + ${DETAIL_MODAL_TOP_GAP_PX}px)`,
      }}
      onClick={requestClose}
    >
      <div
        className={`w-full max-w-md bg-white dark:bg-slate-900 rounded-t-[3rem] shadow-2xl border-t dark:border-slate-800 flex flex-col overflow-hidden ${
          isClosing ? 'detail-modal-sheet-out' : 'detail-modal-sheet'
        }`}
        style={{ maxHeight: sheetMaxHeight }}
        onClick={e => e.stopPropagation()}
      >
        <div className="shrink-0 px-6 pt-4 pb-4 bg-white/96 dark:bg-slate-900/96 backdrop-blur-xl border-b border-gray-100/80 dark:border-slate-800/80">
          <div className="w-12 h-1.5 bg-gray-200 dark:bg-slate-700 rounded-full mx-auto mb-6"></div>
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-2xl font-bold text-gray-800 dark:text-slate-100">{date}</h3>
              <p className="text-sm text-gray-500 dark:text-slate-400">
                {isAdding ? '记录此下的瞬间' : `当日共有 ${records.length} 条记录`}
              </p>
            </div>
            <button
              onClick={isAdding && !initialAddMode ? () => setIsAdding(false) : requestClose}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-400 transition-colors"
            >
              <FaIcon name={isAdding && !initialAddMode ? 'arrow-left' : 'xmark'} className="text-xl" />
            </button>
          </div>
        </div>

        {isAdding ? (
          <>
            <div className="flex-1 overflow-y-auto detail-list-scroll px-6 py-5 pr-5">
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
              <label className="block text-sm font-bold text-gray-600 dark:text-slate-400 mb-3">本次时长（分钟）</label>
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  {DURATION_OPTIONS.map((minutes) => (
                    <button
                      key={minutes}
                      type="button"
                      onClick={() => setDurationInput(String(minutes))}
                      className={`rounded-2xl border px-3 py-2.5 text-sm font-bold transition-all ${
                        durationInput === String(minutes)
                          ? 'border-green-500 bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300'
                          : 'border-green-100 bg-white/70 text-gray-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
                      }`}
                    >
                      {minutes} 分钟
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  inputMode="numeric"
                  min="1"
                  step="1"
                  value={durationInput}
                  onChange={(e) => setDurationInput(e.target.value)}
                  placeholder="自定义时长，例如 25"
                  className="w-full p-4 bg-gray-50 dark:bg-slate-800 border-none rounded-2xl text-gray-800 dark:text-slate-200 focus:ring-2 focus:ring-green-500 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-600 dark:text-slate-400 mb-3">是否观看影片？</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setWatchedMovie(true)}
                  className={`rounded-2xl border px-4 py-3 text-sm font-bold transition-all ${
                    watchedMovie
                      ? 'border-green-500 bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300'
                      : 'border-green-100 bg-white/70 text-gray-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
                  }`}
                >
                  是，已观看
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setWatchedMovie(false);
                    setCustomMovieCategory('');
                  }}
                  className={`rounded-2xl border px-4 py-3 text-sm font-bold transition-all ${
                    !watchedMovie
                      ? 'border-green-500 bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300'
                      : 'border-green-100 bg-white/70 text-gray-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
                  }`}
                >
                  否，没有观看
                </button>
              </div>
            </div>

            {watchedMovie && (
              <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div>
                  <label className="block text-sm font-bold text-gray-600 dark:text-slate-400 mb-3">观看类型</label>
                  <div className="grid grid-cols-3 gap-2">
                    {MOVIE_CATEGORY_OPTIONS.map((category) => (
                      <button
                        key={category}
                        type="button"
                        onClick={() => setMovieCategory(category)}
                        className={`rounded-2xl border px-3 py-2.5 text-sm font-bold transition-all ${
                          movieCategory === category
                            ? 'border-green-500 bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300'
                            : 'border-green-100 bg-white/70 text-gray-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
                        }`}
                      >
                        {category}
                      </button>
                    ))}
                  </div>
                </div>

                {movieCategory === '自定义' && (
                  <input
                    type="text"
                    value={customMovieCategory}
                    onChange={(e) => setCustomMovieCategory(e.target.value)}
                    placeholder="输入自定义类型"
                    className="w-full p-4 bg-gray-50 dark:bg-slate-800 border-none rounded-2xl text-gray-800 dark:text-slate-200 focus:ring-2 focus:ring-green-500 text-sm"
                  />
                )}
              </div>
            )}

            <div>
              <label className="block text-sm font-bold text-gray-600 dark:text-slate-400 mb-3">🦌后感（可选）</label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="这一刻的心情或感受..."
                className="w-full p-4 bg-gray-50 dark:bg-slate-800 border-none rounded-2xl text-gray-800 dark:text-slate-200 focus:ring-2 focus:ring-green-500 min-h-[100px] resize-none text-sm"
              />
                </div>
              </div>
            </div>

            <div className="shrink-0 px-6 pb-6 pt-4 bg-white/96 dark:bg-slate-900/96 backdrop-blur-xl border-t border-gray-100/80 dark:border-slate-800/80">
              <button 
                onClick={handleSave}
                className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-4 rounded-2xl shadow-lg shadow-green-500/20 transition-all flex items-center justify-center gap-2"
              >
                <FaIcon name="check" />
                完成记录
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto detail-list-scroll px-6 py-5 pr-5 flex flex-col gap-3">
              {records.length > 0 ? (
                [...records].sort((a, b) => b.timestamp - a.timestamp).map(record => (
                  <div 
                    key={record.id} 
                    onClick={() => {
                      if (deletingIds.has(record.id)) return;
                      setArmedDeleteId(prev => (prev === record.id ? null : record.id));
                    }}
                    className={`flex flex-col p-4 rounded-2xl border transition-all cursor-pointer ${
                      armedDeleteId === record.id
                        ? 'bg-red-50/90 border-red-200 dark:bg-red-950/20 dark:border-red-900/40 shadow-[0_8px_24px_rgba(239,68,68,0.12)]'
                        : 'bg-green-50 dark:bg-slate-800/50 border-green-100 dark:border-slate-800 hover:shadow-md'
                    } ${deletingIds.has(record.id) ? 'animate-delete' : ''}`}
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
                          <div className="mt-1 flex flex-wrap gap-1.5">
                            <span className="text-[10px] uppercase font-bold text-green-600 dark:text-green-400 tracking-wider">
                              心情: {record.mood || '放松'}
                            </span>
                            {record.durationMinutes != null && (
                              <span className="px-2 py-0.5 rounded-full bg-white/80 text-[10px] font-bold text-gray-500 dark:bg-slate-900/80 dark:text-slate-300">
                                {record.durationMinutes} 分钟
                              </span>
                            )}
                            <span className="px-2 py-0.5 rounded-full bg-white/80 text-[10px] font-bold text-gray-500 dark:bg-slate-900/80 dark:text-slate-300">
                              {formatMovieCategory(record)}
                            </span>
                          </div>
                        </div>
                      </div>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          if (armedDeleteId !== record.id) return;
                          animateDelete(record.id);
                        }}
                        disabled={deletingIds.has(record.id)}
                        className={`w-9 h-9 flex items-center justify-center rounded-full transition-all disabled:opacity-50 ${
                          armedDeleteId === record.id
                            ? 'pointer-events-auto bg-red-500 text-white shadow-lg shadow-red-500/25 scale-100'
                            : 'pointer-events-none bg-red-50 text-red-300 opacity-0 scale-75'
                        }`}
                      >
                        <FaIcon name="trash-can" className="text-sm" />
                      </button>
                    </div>
                    {armedDeleteId === record.id && (
                      <div className="mb-2 text-[11px] font-bold text-red-500 dark:text-red-300 animate-in fade-in slide-in-from-top-1 duration-200">
                        再点一次右侧删除按钮，即可删除这条记录
                      </div>
                    )}
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

            <div className="shrink-0 px-6 pb-6 pt-4 bg-white/96 dark:bg-slate-900/96 backdrop-blur-xl border-t border-gray-100/80 dark:border-slate-800/80">
              <button 
                onClick={() => setIsAdding(true)}
                className="w-full bg-yellow-400 hover:bg-yellow-500 dark:bg-yellow-600 dark:hover:bg-yellow-700 text-yellow-900 dark:text-yellow-50 font-bold py-4 rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 group"
              >
                <FaIcon name="plus" className="group-hover:rotate-90 transition-transform" />
                补录其它心情
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default DetailModal;
