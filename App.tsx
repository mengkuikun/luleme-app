import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { ViewType, RecordEntry } from './types';
import {
  STORAGE_KEY,
  PIN_KEY,
  THEME_KEY,
  ICON_KEY,
  SOUND_KEY,
  CUSTOM_SOUND_KEY,
  AGE_VERIFIED_KEY,
  LONG_PRESS_THRESHOLD,
  LAST_EXPORT_FILE_KEY,
  LAST_EXPORT_FILENAME_KEY,
  SECURITY_QUESTION_KEY,
  SECURITY_ANSWER_KEY,
  CUSTOM_BACKGROUND_KEY,
  getLocalDateString,
} from './constants';
import CalendarView from './components/CalendarView';
import StatsView from './components/StatsView';
import SettingsView from './components/SettingsView';
import SplashScreen from './components/SplashScreen';
import DetailModal from './components/DetailModal';
import LockScreen from './components/LockScreen';
import ChangeLog from './components/ChangeLog';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

const App: React.FC = () => {
  // 直接从 localStorage 初始化，避免闪屏
  const isAgeVerifiedOnLoad = localStorage.getItem(AGE_VERIFIED_KEY) === 'true';
  
  const [showSplash, setShowSplash] = useState(!isAgeVerifiedOnLoad);
  const [isLocked, setIsLocked] = useState(false);
  const [currentView, setCurrentView] = useState<ViewType>('calendar');
  const [records, setRecords] = useState<RecordEntry[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [forceAddMode, setForceAddMode] = useState(false);
  const [stampAnimationDate, setStampAnimationDate] = useState<string | null>(null);
  const [darkMode, setDarkMode] = useState(false);
  const [customIcon, setCustomIcon] = useState<string | null>(null);
  const [customSound, setCustomSound] = useState<string | null>(null);
  const [customBackground, setCustomBackground] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [showChangeLog, setShowChangeLog] = useState(false);
  const [currentPin, setCurrentPin] = useState<string | null>(null);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

  // Modals state
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showExportConfirm, setShowExportConfirm] = useState(false);
  const [showNoDataAlert, setShowNoDataAlert] = useState(false);
  const [showRemovePinConfirm, setShowRemovePinConfirm] = useState(false);

  // Refs for Long Press & Progress Ring (避免 setState 导致重绘卡顿，用 rAF + DOM 直接更新)
  const longPressTimer = useRef<number | null>(null);
  const progressAnimationRef = useRef<number | null>(null);
  const progressRingCircleRef = useRef<SVGCircleElement>(null);
  const startTimeRef = useRef<number>(0);
  const isLongPressActive = useRef(false);
  const isCurrentlyPressing = useRef(false);
  
  // Audio playback refs - Fix for sound bugs
  const audioCache = useRef<HTMLAudioElement | null>(null);
  const cachedSoundUrl = useRef<string | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const oscillatorRef = useRef<OscillatorNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const lastPlayTime = useRef<number>(0);
  const isPlayingAudio = useRef(false);
  const isPlayingOscillator = useRef(false);
  const minPlayIntervalMs = 100;

  // Swipe navigation refs
  const swipeStartX = useRef<number | null>(null);
  const swipeStartY = useRef<number | null>(null);
  const isHorizontalSwipe = useRef<boolean>(false);
  const mainRef = useRef<HTMLDivElement | null>(null);
  const slidesRef = useRef<HTMLDivElement | null>(null);
  const viewWidthRef = useRef<number>(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragDX, setDragDX] = useState(0);

  // Load Initial Data
  useEffect(() => {
    try {
      const savedRecords = localStorage.getItem(STORAGE_KEY);
      if (savedRecords) {
        try {
          setRecords(JSON.parse(savedRecords));
        } catch (e) {
          console.error("Failed to parse records", e);
        }
      }

      const pin = localStorage.getItem(PIN_KEY);
      if (pin) {
        setIsLocked(true);
        setCurrentPin(pin);
      }

      const savedTheme = localStorage.getItem(THEME_KEY);
      if (savedTheme === 'true') setDarkMode(true);

      const savedIcon = localStorage.getItem(ICON_KEY);
      if (savedIcon) setCustomIcon(savedIcon);

      const savedSoundData = localStorage.getItem(CUSTOM_SOUND_KEY);
      if (savedSoundData) setCustomSound(savedSoundData);

      const savedBg = localStorage.getItem(CUSTOM_BACKGROUND_KEY);
      if (savedBg) setCustomBackground(savedBg);

      const savedSound = localStorage.getItem(SOUND_KEY);
      if (savedSound !== null) {
        setSoundEnabled(savedSound === 'true');
      }
    } catch (e) {
      console.error('❌ localStorage access failed:', e);
      // localStorage可能被禁用或已满，使用默认值
    }
    
    setIsInitialized(true);
  }, []);

  const showToast = useCallback((message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  }, []);

  // Persist Data
  useEffect(() => {
    // CRITICAL: Stop persistence if we are in the middle of clearing
    if (isInitialized && !isClearing) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
        localStorage.setItem(THEME_KEY, String(darkMode));
        localStorage.setItem(SOUND_KEY, String(soundEnabled));
        if (customIcon) localStorage.setItem(ICON_KEY, customIcon);
        else localStorage.removeItem(ICON_KEY);
        if (customSound) localStorage.setItem(CUSTOM_SOUND_KEY, customSound);
        else localStorage.removeItem(CUSTOM_SOUND_KEY);
        if (customBackground) localStorage.setItem(CUSTOM_BACKGROUND_KEY, customBackground);
        else localStorage.removeItem(CUSTOM_BACKGROUND_KEY);
      } catch (e: unknown) {
        console.error('localStorage write failed:', e);
        if (e instanceof DOMException && e.name === 'QuotaExceededError') {
          showToast('存储空间已满，请清理数据');
        }
      }
    }
  }, [records, darkMode, customIcon, customSound, customBackground, soundEnabled, isInitialized, isClearing, showToast]);

  const playPunchSound = useCallback((force = false) => {
    const currentSoundEnabled = localStorage.getItem(SOUND_KEY) === 'true';
    const currentCustomSound = localStorage.getItem(CUSTOM_SOUND_KEY);

    if (!currentSoundEnabled && !force) return;

    const now = Date.now();
    if (now - lastPlayTime.current < minPlayIntervalMs) return;
    lastPlayTime.current = now;

    if (currentCustomSound) {
      if (cachedSoundUrl.current !== currentCustomSound) {
        if (audioCache.current) {
          audioCache.current.pause();
          audioCache.current.currentTime = 0;
        }
        audioCache.current = new Audio(currentCustomSound);
        cachedSoundUrl.current = currentCustomSound;
        audioCache.current.volume = 1;
        audioCache.current.onended = () => {
          isPlayingAudio.current = false;
        };
      }

      if (audioCache.current) {
        audioCache.current.currentTime = 0;
        isPlayingAudio.current = true;
        audioCache.current.play().catch(() => {
          // 用户未交互或权限问题，静默失败
        });
      }
      return;
    }

    try {
      // 重用AudioContext而不是每次创建新的
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      
      // 停止之前的振荡器
      if (oscillatorRef.current && isPlayingOscillator.current) {
        try {
          oscillatorRef.current.stop();
          isPlayingOscillator.current = false;
        } catch (e) {
          // oscillator 已停止
        }
      }

      const audioCtx = audioContextRef.current;
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(523.25, audioCtx.currentTime); 
      oscillator.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.1); 
      
      gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.2, audioCtx.currentTime + 0.05);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.4);
      
      oscillatorRef.current = oscillator;
      gainNodeRef.current = gainNode;
      isPlayingOscillator.current = true;
      
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.4);

      setTimeout(() => {
        isPlayingOscillator.current = false;
      }, 400);
    } catch (e) {
      console.error('Audio playback failed', e);
    }
  }, []);

  const handleAgeConfirm = () => {
    localStorage.setItem(AGE_VERIFIED_KEY, 'true');
    setShowSplash(false);
  };

  const addRecord = useCallback((dateStr?: string, mood?: string, note?: string) => {
    const now = new Date();
    const targetDate = dateStr ? new Date(dateStr) : now;
    if (dateStr) {
      targetDate.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());
    }
    const newRecord: RecordEntry = {
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
      timestamp: targetDate.getTime(),
      mood: mood || '放松',
      note,
    };
    setRecords(prev => [...prev, newRecord]);
    const formattedDate = getLocalDateString(targetDate);
    setStampAnimationDate(formattedDate);
    setTimeout(() => setStampAnimationDate(null), 1500);
    playPunchSound();
  }, [playPunchSound]);

  const circumference = 78 * 2 * Math.PI;

  const clearTimers = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    if (progressAnimationRef.current != null) {
      cancelAnimationFrame(progressAnimationRef.current);
      progressAnimationRef.current = null;
    }
    const circle = progressRingCircleRef.current;
    if (circle) {
      circle.style.strokeDashoffset = String(circumference);
    }
  }, []);

  const startPress = useCallback(() => {
    isLongPressActive.current = false;
    isCurrentlyPressing.current = true;

    const circle = progressRingCircleRef.current;
    if (circle) {
      circle.style.strokeDashoffset = String(circumference);
    }

    startTimeRef.current = Date.now();

    const tick = () => {
      const elapsed = Date.now() - startTimeRef.current;
      const progress = Math.min((elapsed / LONG_PRESS_THRESHOLD) * 100, 100);
      const offset = circumference - (progress / 100) * circumference;
      const el = progressRingCircleRef.current;
      if (el) {
        el.style.strokeDashoffset = String(offset);
      }
      if (progress >= 100) {
        progressAnimationRef.current = null;
        return;
      }
      progressAnimationRef.current = requestAnimationFrame(tick);
    };
    progressAnimationRef.current = requestAnimationFrame(tick);

    longPressTimer.current = window.setTimeout(() => {
      isLongPressActive.current = true;
      clearTimers();

      if (navigator.vibrate) navigator.vibrate(50);
      setSelectedDate(getLocalDateString());
      setForceAddMode(true);
      setIsDetailOpen(true);
      isCurrentlyPressing.current = false;
    }, LONG_PRESS_THRESHOLD);
  }, [clearTimers]);

  const endPress = useCallback(() => {
    if (!isCurrentlyPressing.current) return;

    const wasLong = isLongPressActive.current;
    clearTimers();

    if (!wasLong) {
      addRecord();
    }

    isLongPressActive.current = false;
    isCurrentlyPressing.current = false;
  }, [clearTimers, addRecord]);

  // Helpers for swipe navigation
  const setViewByIndex = (i: number) => {
    setCurrentView(i === 0 ? 'calendar' : i === 1 ? 'stats' : 'settings');
  };

  const handleSwipeStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    swipeStartX.current = t.clientX;
    swipeStartY.current = t.clientY;
    isHorizontalSwipe.current = false;
    viewWidthRef.current = mainRef.current?.offsetWidth || window.innerWidth;
    setDragDX(0);
    setIsDragging(false);
  };

  const handleSwipeMove = (e: React.TouchEvent) => {
    if (swipeStartX.current == null || swipeStartY.current == null) return;
    const t = e.touches[0];
    const dx = t.clientX - swipeStartX.current;
    const dy = t.clientY - swipeStartY.current;
    if (!isHorizontalSwipe.current) {
      // Decide gesture axis with a small deadzone
      if (Math.abs(dx) > 20 && Math.abs(dx) > Math.abs(dy)) {
        isHorizontalSwipe.current = true;
      }
    }
    if (isHorizontalSwipe.current) {
      // Follow finger; disable default scroll
      e.preventDefault();
      setIsDragging(true);
      setDragDX(dx);
    }
  };

  const handleSwipeEnd = (e: React.TouchEvent) => {
    if (swipeStartX.current == null || swipeStartY.current == null) return;
    const t = e.changedTouches && e.changedTouches[0] ? e.changedTouches[0] : e.touches[0];
    const endX = t ? t.clientX : swipeStartX.current;
    const endY = t ? t.clientY : swipeStartY.current;
    const dx = (endX as number) - (swipeStartX.current as number);
    const dy = (endY as number) - (swipeStartY.current as number);
    const threshold = Math.max(60, viewWidthRef.current * 0.2); // min distance to trigger

    if (Math.abs(dx) > threshold && Math.abs(dx) > Math.abs(dy)) {
      const index = getViewIndex();
      const nextIndex = Math.max(0, Math.min(2, index + (dx < 0 ? 1 : -1)));
      setViewByIndex(nextIndex);
    }

    swipeStartX.current = null;
    swipeStartY.current = null;
    isHorizontalSwipe.current = false;
    setIsDragging(false);
    setDragDX(0);
  };

  const handleCancelPress = useCallback(() => {
    clearTimers();
    isLongPressActive.current = false;
    isCurrentlyPressing.current = false;
  }, [clearTimers]);

  const clearAll = useCallback(() => {
    // 1. 设置清除中标识，防止 Effect 触发写回 localStorage
    setIsClearing(true);
    
    // 2. 清空物理存储
    localStorage.clear();
    
    // 3. 重置内存中的所有状态到初始值
    setRecords([]);
    setCustomIcon(null);
    setCustomSound(null);
    setCustomBackground(null);
    setDarkMode(false);
    setSoundEnabled(true);
    setIsLocked(false);
    setCurrentView('calendar');
    
    localStorage.removeItem(LAST_EXPORT_FILE_KEY);
    localStorage.removeItem(LAST_EXPORT_FILENAME_KEY);

    setTimeout(() => {
      setShowSplash(true);
      setIsClearing(false);
      showToast('所有本地记录已清除');
    }, 200);
  }, [showToast]);

  const executeExport = async () => {
    if (records.length === 0) {
      showToast('没有记录可供导出');
      return;
    }

    try {
      // 生成 CSV 内容
      const csvContent = "ID,Timestamp,Date,Time,Mood,Note\n" 
        + records.map(r => {
          const d = new Date(r.timestamp);
          const mood = r.mood || '放松';
          const note = r.note ? r.note.replace(/,/g, ' ') : '';
          return `${r.id},${r.timestamp},${getLocalDateString(d)},${d.toLocaleTimeString()},${mood},${note}`;
        }).join("\n");
      
      const filename = `lulemo_export_${getLocalDateString()}.csv`;
      
      try {
        // 先尝试创建 Download/lululu 文件夹（如果不存在）
        try {
          await Filesystem.mkdir({
            path: 'Download/lululu',
            directory: Directory.ExternalStorage,
            recursive: true
          });
        } catch {
          // 文件夹可能已存在，继续执行
        }

        const result = await Filesystem.writeFile({
          path: `Download/lululu/${filename}`,
          data: csvContent,
          directory: Directory.ExternalStorage,
          encoding: Encoding.UTF8,
        });
        
        setShowExportConfirm(false);

        localStorage.setItem(LAST_EXPORT_FILE_KEY, result.uri);
        localStorage.setItem(LAST_EXPORT_FILENAME_KEY, filename);
        
        // 简化提示信息
        showToast(`✨ 已保存\n📁 Download/lululu\n📄 ${filename}`);
        
      } catch (fsError: unknown) {
        const msg = fsError instanceof Error ? fsError.message : '';
        console.error('Download write failed, trying Cache:', msg);

        // 备选方案：保存到缓存目录
        try {
          const cacheResult = await Filesystem.writeFile({
            path: filename,
            data: csvContent,
            directory: Directory.Cache,
            encoding: Encoding.UTF8,
          });
          
          console.log('✅ File saved to Cache:', cacheResult.uri);
          
          setShowExportConfirm(false);
          localStorage.setItem(LAST_EXPORT_FILE_KEY, cacheResult.uri);
          localStorage.setItem(LAST_EXPORT_FILENAME_KEY, filename);
          
          showToast(`✨ 已保存\n📄 ${filename}`);
        } catch (cacheError: unknown) {
          const msg = cacheError instanceof Error ? cacheError.message : '未知错误';
          console.error('Cache write failed:', msg);
          setShowExportConfirm(false);
          showToast(`导出失败: ${msg}`);
        }
      }
    } catch (e: unknown) {
      console.error('Export error:', e instanceof Error ? e.message : e);
      setShowExportConfirm(false);
      showToast('导出失败，请重试');
    }
  };

  const shareLastExport = async () => {
    const fileUri = localStorage.getItem(LAST_EXPORT_FILE_KEY);
    const filename = localStorage.getItem(LAST_EXPORT_FILENAME_KEY);

    if (!fileUri) {
      showToast('没有可分享的文件，请先导出数据');
      return;
    }

    try {
      await Share.share({
        title: '分享鹿了么数据',
        text: `导出数据：${filename ?? ''}`,
        url: fileUri,
        dialogTitle: '选择分享方式',
      });
      showToast('✨ 分享成功');
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : '';
      if (/cancel/i.test(msg)) {
        showToast('已取消分享');
      } else {
        showToast('分享失败，请重试');
      }
    }
  };

  const removePin = () => {
    localStorage.removeItem(PIN_KEY);
    localStorage.removeItem(SECURITY_QUESTION_KEY);
    localStorage.removeItem(SECURITY_ANSWER_KEY);
    setCurrentPin(null);
    setShowRemovePinConfirm(false);
    showToast('已移除 PIN 码锁定');
  };

  const radius = 80;
  const stroke = 3;
  const normalizedRadius = 78;

  const selectedDateRecords = useMemo(() => {
    if (!selectedDate) return [];
    return records.filter(r => getLocalDateString(new Date(r.timestamp)) === selectedDate);
  }, [records, selectedDate]);

  const getViewIndex = () => {
    switch(currentView) {
      case 'calendar': return 0;
      case 'stats': return 1;
      case 'settings': return 2;
      default: return 0;
    }
  };

  return (
    <div
      className={`${darkMode ? 'dark' : ''}`}
      style={{ transition: 'background-color 0.5s linear, color 0.5s linear' }}
    >
      <div
        className="flex flex-col h-screen max-w-md mx-auto forest-bg shadow-2xl relative overflow-hidden transition-colors duration-500 ease-linear"
        style={{
          transitionProperty: 'background-color, border-color, color, box-shadow',
          ...(customBackground
            ? {
                backgroundImage: darkMode
                  ? `linear-gradient(rgba(10,15,11,0.92), rgba(13,22,15,0.88)), url(${customBackground})`
                  : `linear-gradient(rgba(241,248,233,0.88), rgba(241,248,233,0.82)), url(${customBackground})`,
                backgroundSize: 'cover',
                backgroundAttachment: 'fixed',
              }
            : undefined),
        }}
      >
        <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md p-4 flex justify-between items-center border-b border-green-100 dark:border-slate-800 z-10 shrink-0 transition-all duration-500 ease-linear"
                style={{ transitionProperty: 'background-color, border-color, color' }}>
          <h1 className="text-xl font-bold text-green-800 dark:text-green-400 flex items-center gap-2 transition-colors duration-500 ease-linear">
            <span>🦌</span> 了么
          </h1>
          <div className="text-xs text-green-600 dark:text-green-500 bg-green-50 dark:bg-green-900/30 px-3 py-1 rounded-full font-bold transition-all duration-500 ease-linear">隐私模式</div>
        </header>

          <main ref={mainRef} className="flex-1 relative overflow-hidden"
            onTouchStart={handleSwipeStart}
            onTouchMove={handleSwipeMove}
            onTouchEnd={handleSwipeEnd}
          >
          <div 
              ref={slidesRef}
              className={`flex h-full w-[300%] ${isDragging ? '' : 'transition-transform duration-500 ease-out'}`}
              style={{ 
                transform: isDragging 
                  ? `translateX(${-(getViewIndex() * (viewWidthRef.current || 0)) + dragDX}px)` 
                  : `translateX(-${getViewIndex() * 33.333}%)`
              }}
          >
            <div className="w-1/3 h-full overflow-y-auto pb-48 px-0 custom-scroll">
              <CalendarView 
                records={records} 
                onDateClick={(date) => {
                  setSelectedDate(date);
                  setForceAddMode(false);
                  setIsDetailOpen(true);
                }}
                stampAnimationDate={stampAnimationDate}
                onDatePickerOpenChange={setIsDatePickerOpen}
              />
            </div>
            <div className="w-1/3 h-full overflow-y-auto pb-48 px-0 custom-scroll">
              <StatsView records={records} darkMode={darkMode} />
            </div>
            <div className="w-1/3 h-full overflow-y-auto pb-48 px-0 custom-scroll">
              <SettingsView 
                onClear={() => setShowClearConfirm(true)} 
                records={records} 
                darkMode={darkMode}
                toggleDarkMode={() => setDarkMode(!darkMode)} 
                soundEnabled={soundEnabled}
                toggleSound={() => setSoundEnabled(!soundEnabled)}
                onTestSound={() => playPunchSound(true)}
                customSound={customSound}
                setCustomSound={setCustomSound}
                customIcon={customIcon}
                setCustomIcon={setCustomIcon}
                customBackground={customBackground}
                setCustomBackground={setCustomBackground}
                onImportRecords={(nr) => {
                  setRecords(prev => [...prev, ...nr]);
                  showToast(`成功导入 ${nr.length} 条数据`);
                }}
                onExportRequest={() => {
                  if (records.length === 0) setShowNoDataAlert(true);
                  else setShowExportConfirm(true);
                }}
                onShareExport={shareLastExport}
                onShowChangeLog={() => setShowChangeLog(true)}
                onRemovePinRequest={() => setShowRemovePinConfirm(true)}
                currentPin={currentPin}
                onPinChange={(pin) => setCurrentPin(pin)}
              />
            </div>
          </div>
        </main>

        <div
          className={`fixed bottom-32 left-1/2 -translate-x-1/2 z-30 origin-center ${
            currentView === 'calendar' && !isDatePickerOpen
              ? 'opacity-100 scale-100'
              : 'opacity-0 scale-0 pointer-events-none'
          }`}
          style={{ transition: 'opacity 0.45s linear, transform 0.45s linear' }}
        >
          <div className="punch-btn-container group">
            <svg height={radius * 2} width={radius * 2} className="progress-ring absolute pointer-events-none overflow-visible">
              <circle
                stroke={darkMode ? '#4ade8022' : '#4CAF5022'}
                strokeDasharray={`${circumference} ${circumference}`}
                style={{ strokeDashoffset: 0 }}
                strokeWidth={1}
                fill="transparent"
                r={normalizedRadius}
                cx={radius}
                cy={radius}
              />
              <circle
                ref={progressRingCircleRef}
                className="progress-ring__circle"
                stroke={darkMode ? '#4ade80' : '#4CAF50'}
                strokeDasharray={`${circumference} ${circumference}`}
                style={{ strokeDashoffset: circumference }}
                strokeWidth={stroke}
                strokeLinecap="round"
                fill="transparent"
                r={normalizedRadius}
                cx={radius}
                cy={radius}
              />
            </svg>

            <div className="ripple-effect"></div>
            <div className="active-ripple"></div>
            <div className="button-bg-circle shadow-lg ring-4 ring-white/50 dark:ring-slate-800/50">
              {customIcon ? (
                <img src={customIcon} alt="图标" className="deer-icon-img" />
              ) : (
                <span className="text-6xl animate-pulse select-none">🦌</span>
              )}
            </div>
            <button 
              onMouseDown={startPress}
              onMouseUp={endPress}
              onMouseLeave={handleCancelPress}
              onTouchStart={(e) => { e.preventDefault(); startPress(); }}
              onTouchEnd={(e) => { e.preventDefault(); endPress(); }}
              className="absolute inset-0 z-20 rounded-full outline-none select-none touch-none"
              aria-label="打卡"
            />
          </div>
        </div>

        <nav className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-green-100 dark:border-slate-800 flex justify-around py-4 shrink-0 z-20 shadow-[0_-5px_15px_rgba(0,0,0,0.05)]">
          <button onClick={() => setCurrentView('calendar')} className={`flex flex-col items-center gap-1 transition-colors duration-300 ${currentView === 'calendar' ? 'text-green-600' : 'text-gray-400'}`}>
            <i className={`fa-solid fa-calendar-days text-xl transition-transform ${currentView === 'calendar' ? 'scale-110' : ''}`}></i>
            <span className="text-[10px] font-bold">日历</span>
          </button>
          <button onClick={() => setCurrentView('stats')} className={`flex flex-col items-center gap-1 transition-colors duration-300 ${currentView === 'stats' ? 'text-green-600' : 'text-gray-400'}`}>
            <i className={`fa-solid fa-chart-simple text-xl transition-transform ${currentView === 'stats' ? 'scale-110' : ''}`}></i>
            <span className="text-[10px] font-bold">统计</span>
          </button>
          <button onClick={() => setCurrentView('settings')} className={`flex flex-col items-center gap-1 transition-colors duration-300 ${currentView === 'settings' ? 'text-green-600' : 'text-gray-400'}`}>
            <i className={`fa-solid fa-gear text-xl transition-transform ${currentView === 'settings' ? 'scale-110' : ''}`}></i>
            <span className="text-[10px] font-bold">设置</span>
          </button>
        </nav>

        {toast && (
          <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[60] animate-in slide-in-from-bottom-4 fade-in duration-300">
            <div className="bg-green-600 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-start gap-3 border border-green-500/50 backdrop-blur-sm max-w-xs">
              <i className="fa-solid fa-circle-check mt-0.5 flex-shrink-0"></i>
              <span className="text-sm font-bold whitespace-pre-line leading-relaxed">{toast}</span>
            </div>
          </div>
        )}

        {isDetailOpen && selectedDate && (
          <DetailModal 
            date={selectedDate}
            records={selectedDateRecords}
            onClose={() => { setIsDetailOpen(false); setForceAddMode(false); }}
            onDelete={(id) => setRecords(prev => prev.filter(r => r.id !== id))}
            onAdd={addRecord}
            darkMode={darkMode}
            initialAddMode={forceAddMode}
          />
        )}

        {showExportConfirm && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setShowExportConfirm(false)}>
            <div className="w-full max-w-xs bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 shadow-2xl animate-in zoom-in-95 duration-200 border border-green-100 dark:border-slate-800" onClick={e => e.stopPropagation()}>
              <div className="text-center">
                <span className="text-5xl block mb-4">🦌📄</span>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">确认导出数据？</h3>
                <p className="text-sm text-gray-500 dark:text-slate-400 mb-8 leading-relaxed">
                  您的记录将以 CSV 文件格式下载到此设备。
                </p>
                <div className="space-y-3">
                  <button 
                    onClick={() => executeExport()}
                    className="w-full py-4 bg-green-500 hover:bg-green-600 text-white font-bold rounded-2xl shadow-lg shadow-green-500/30 transition-all active:scale-95"
                  >
                    导出
                  </button>
                  <button 
                    onClick={() => setShowExportConfirm(false)}
                    className="w-full py-4 bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 font-bold rounded-2xl transition-all active:scale-95"
                  >
                    取消
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {showNoDataAlert && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setShowNoDataAlert(false)}>
            <div className="w-full max-w-xs bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 shadow-2xl animate-in zoom-in-95 duration-200 border border-yellow-100 dark:border-yellow-900/30" onClick={e => e.stopPropagation()}>
              <div className="text-center">
                <span className="text-5xl block mb-4">🦌💨</span>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">暂无数据</h3>
                <p className="text-sm text-gray-500 dark:text-slate-400 mb-8 leading-relaxed">
                  还没有任何打卡记录，先去主页打个卡吧！
                </p>
                <button 
                  onClick={() => setShowNoDataAlert(false)}
                  className="w-full py-4 bg-yellow-400 hover:bg-yellow-500 text-yellow-900 font-bold rounded-2xl shadow-lg shadow-yellow-500/30 transition-all active:scale-95"
                >
                  我知道了
                </button>
              </div>
            </div>
          </div>
        )}

        {showClearConfirm && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setShowClearConfirm(false)}>
            <div className="w-full max-w-xs bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 shadow-2xl animate-in zoom-in-95 duration-200 border border-red-100 dark:border-red-900/30" onClick={e => e.stopPropagation()}>
              <div className="text-center">
                <span className="text-5xl block mb-4">🦌💧</span>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">真的要再见吗？</h3>
                <p className="text-sm text-gray-500 dark:text-slate-400 mb-8 leading-relaxed">
                  此操作将永久删除所有打卡数据、PIN 码和个性化设置。数据不可恢复。
                </p>
                <div className="space-y-3">
                  <button 
                    onClick={() => {
                      clearAll();
                      setShowClearConfirm(false);
                    }}
                    className="w-full py-4 bg-red-500 hover:bg-red-600 text-white font-bold rounded-2xl shadow-lg shadow-red-500/30 transition-all active:scale-95"
                  >
                    确定永久清除
                  </button>
                  <button 
                    onClick={() => setShowClearConfirm(false)}
                    className="w-full py-4 bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 font-bold rounded-2xl transition-all active:scale-95"
                  >
                    我点错了，回去
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {showRemovePinConfirm && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setShowRemovePinConfirm(false)}>
            <div className="w-full max-w-xs bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 shadow-2xl animate-in zoom-in-95 duration-200 border border-purple-100 dark:border-purple-900/30" onClick={e => e.stopPropagation()}>
              <div className="text-center">
                <span className="text-5xl block mb-4">🔓</span>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">移除 PIN 码锁定？</h3>
                <p className="text-sm text-gray-500 dark:text-slate-400 mb-8 leading-relaxed">
                  移除后将不再需要输入 PIN 码即可进入应用。
                </p>
                <div className="space-y-3">
                  <button 
                    onClick={removePin}
                    className="w-full py-4 bg-red-500 hover:bg-red-600 text-white font-bold rounded-2xl shadow-lg shadow-red-500/30 transition-all active:scale-95"
                  >
                    确定移除
                  </button>
                  <button 
                    onClick={() => setShowRemovePinConfirm(false)}
                    className="w-full py-4 bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 font-bold rounded-2xl transition-all active:scale-95"
                  >
                    取消
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {showChangeLog && (
          <ChangeLog 
            onClose={() => setShowChangeLog(false)}
            darkMode={darkMode}
          />
        )}
        
        {showSplash && <SplashScreen onConfirm={handleAgeConfirm} />}
        {isLocked && (
          <LockScreen
            onUnlock={() => setIsLocked(false)}
            onResetPin={() => {
              localStorage.removeItem(PIN_KEY);
              localStorage.removeItem(SECURITY_QUESTION_KEY);
              localStorage.removeItem(SECURITY_ANSWER_KEY);
              setCurrentPin(null);
              setIsLocked(false);
              showToast('已重置 PIN，可在设置中重新设置');
            }}
          />
        )}
      </div>
    </div>
  );
};

export default App;
