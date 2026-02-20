
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { RecordEntry } from '../types';
import { PIN_KEY, SECURITY_QUESTION_KEY, SECURITY_ANSWER_KEY, SECURITY_QUESTIONS } from '../constants';
import { hashSecret } from '../utils/secret';
import { BIOMETRY_LABEL, getBiometricAvailability } from '../utils/biometric';

type CollapsibleSectionKey = 'security' | 'habit' | 'appearance' | 'data';
type AlertState = { open: boolean; closing: boolean; title: string; message: string };

interface Props {
  onClear: () => void;
  records: RecordEntry[];
  darkMode: boolean;
  toggleDarkMode: () => void;
  soundEnabled: boolean;
  toggleSound: () => void;
  customIcon: string | null;
  setCustomIcon: (icon: string | null) => void;
  customBackground: string | null;
  setCustomBackground: (url: string | null) => void;
  customSound: string | null;
  setCustomSound: (sound: string | null) => void;
  onImportRecords?: (newRecords: RecordEntry[]) => void;
  onExportRequest?: () => void;
  onShareExport?: () => void;
  onTestSound?: () => void;
  onShowChangeLog?: () => void;
  onRemovePinRequest?: () => void;
  currentPin: string | null;
  onPinChange: (pin: string | null) => void;
  biometricUnlockEnabled: boolean;
  onBiometricUnlockEnabledChange: (enabled: boolean) => void;
  sageModeEnabled: boolean;
  onSageModeEnabledChange: (enabled: boolean) => void;
  sageModeDurationMinutes: number;
  onSageModeDurationChange: (minutes: number) => void;
}

const COLLAPSIBLE_KEYS: CollapsibleSectionKey[] = ['security', 'habit', 'appearance', 'data'];

const SettingsView: React.FC<Props> = ({
  onClear,
  records,
  darkMode,
  toggleDarkMode,
  soundEnabled,
  toggleSound,
  customIcon,
  setCustomIcon,
  customBackground,
  setCustomBackground,
  customSound,
  setCustomSound,
  onImportRecords,
  onExportRequest,
  onShareExport,
  onTestSound,
  onShowChangeLog,
  onRemovePinRequest,
  currentPin,
  onPinChange,
  biometricUnlockEnabled,
  onBiometricUnlockEnabledChange,
  sageModeEnabled,
  onSageModeEnabledChange,
  sageModeDurationMinutes,
  onSageModeDurationChange,
}) => {
  const [isSettingPin, setIsSettingPin] = useState(false);
  const [tempPin, setTempPin] = useState('');
  const [tempSecurityQuestionId, setTempSecurityQuestionId] = useState<string>(SECURITY_QUESTIONS[0].id);
  const [tempSecurityAnswer, setTempSecurityAnswer] = useState('');
  const [enableSecurityQuestion, setEnableSecurityQuestion] = useState(false);

  const [showSecurityQuestionPicker, setShowSecurityQuestionPicker] = useState(false);
  const [isSecurityQuestionPickerClosing, setIsSecurityQuestionPickerClosing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [openSections, setOpenSections] = useState<Record<CollapsibleSectionKey, boolean>>({
    security: true,
    habit: true,
    appearance: true,
    data: true,
  });
  const [alertState, setAlertState] = useState<AlertState>({
    open: false,
    closing: false,
    title: '',
    message: '',
  });

  const [isBiometricAvailable, setIsBiometricAvailable] = useState(false);
  const [isCheckingBiometric, setIsCheckingBiometric] = useState(false);
  const [biometricLabel, setBiometricLabel] = useState('生物识别');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const soundInputRef = useRef<HTMLInputElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);
  const backgroundInputRef = useRef<HTMLInputElement>(null);
  const pickerCloseTimerRef = useRef<number | null>(null);
  const alertCloseTimerRef = useRef<number | null>(null);

  const [backgroundUrlInput, setBackgroundUrlInput] = useState('');

  const normalizedSearch = searchQuery.trim().toLowerCase();
  const searching = normalizedSearch.length > 0;

  const sectionKeywords: Record<CollapsibleSectionKey, string[]> = useMemo(
    () => ({
      security: ['安全', '隐私', 'pin', '生物', '解锁', '安全问题', '重置'],
      habit: ['贤者', '倒计时', '打卡', '音效', '声音', '反馈'],
      appearance: ['外观', '主题', '背景', '图标', '深色', '暗黑'],
      data: ['数据', '导入', '导出', '清除', 'csv', '分享'],
    }),
    []
  );
  const aboutKeywords = useMemo(() => ['关于', '版本', '更新', '日志', 'github'], []);

  const sectionMatchesSearch = (key: CollapsibleSectionKey) => {
    if (!searching) return true;
    return sectionKeywords[key].some((k) => k.toLowerCase().includes(normalizedSearch));
  };

  const isSectionOpen = (key: CollapsibleSectionKey) => (searching ? sectionMatchesSearch(key) : openSections[key]);
  const showSection = (key: CollapsibleSectionKey) => sectionMatchesSearch(key);
  const showAboutSection = !searching || aboutKeywords.some((k) => k.toLowerCase().includes(normalizedSearch));
  const hasSearchResult =
    showSection('security') || showSection('habit') || showSection('appearance') || showSection('data') || showAboutSection;

  const getSectionBodyClass = (isOpen: boolean) =>
    `overflow-hidden transition-[max-height,opacity,transform] duration-[320ms] ease-[cubic-bezier(0.25,0.1,0.25,1)] ${
      isOpen ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-1 pointer-events-none'
    }`;

  const getSectionBodyStyle = (isOpen: boolean, maxHeight = 1400): React.CSSProperties => ({
    maxHeight: isOpen ? `${maxHeight}px` : '0px',
  });

  const toggleSection = (key: CollapsibleSectionKey) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const allExpanded = COLLAPSIBLE_KEYS.every((k) => openSections[k]);
  const toggleAllSections = () => {
    const next = !allExpanded;
    setOpenSections({ security: next, habit: next, appearance: next, data: next });
  };

  const showAppAlert = (title: string, message: string) => {
    if (alertCloseTimerRef.current !== null && typeof window !== 'undefined') {
      window.clearTimeout(alertCloseTimerRef.current);
      alertCloseTimerRef.current = null;
    }
    setAlertState({ open: true, closing: false, title, message });
  };

  const closeAppAlert = () => {
    if (!alertState.open) return;
    setAlertState((prev) => ({ ...prev, closing: true }));
    if (typeof window !== 'undefined') {
      alertCloseTimerRef.current = window.setTimeout(() => {
        setAlertState((prev) => ({ ...prev, open: false, closing: false }));
        alertCloseTimerRef.current = null;
      }, 220);
    } else {
      setAlertState((prev) => ({ ...prev, open: false, closing: false }));
    }
  };

  const refreshBiometricAvailability = async () => {
    setIsCheckingBiometric(true);
    try {
      const result = await getBiometricAvailability();
      setIsBiometricAvailable(result.isAvailable);
      setBiometricLabel(BIOMETRY_LABEL[result.biometryType] ?? '生物识别');
      return result;
    } finally {
      setIsCheckingBiometric(false);
    }
  };

  const handleBiometricSwitch = async () => {
    if (biometricUnlockEnabled) {
      onBiometricUnlockEnabledChange(false);
      return;
    }

    if (!currentPin) {
      showAppAlert('无法开启生物识别', '请先开启 PIN 码锁定，再启用生物识别解锁。');
      return;
    }

    const availability = await refreshBiometricAvailability();
    if (!availability.isAvailable) {
      showAppAlert('设备暂不支持', '请先在系统设置中录入并启用生物识别后再试。');
      return;
    }

    onBiometricUnlockEnabledChange(true);
  };
  const openSecurityQuestionPicker = () => {
    if (pickerCloseTimerRef.current !== null && typeof window !== 'undefined') {
      window.clearTimeout(pickerCloseTimerRef.current);
      pickerCloseTimerRef.current = null;
    }
    setIsSecurityQuestionPickerClosing(false);
    setShowSecurityQuestionPicker(true);
  };

  const closeSecurityQuestionPicker = () => {
    if (!showSecurityQuestionPicker) return;
    if (pickerCloseTimerRef.current !== null && typeof window !== 'undefined') {
      window.clearTimeout(pickerCloseTimerRef.current);
      pickerCloseTimerRef.current = null;
    }
    setIsSecurityQuestionPickerClosing(true);
    if (typeof window !== 'undefined') {
      pickerCloseTimerRef.current = window.setTimeout(() => {
        setShowSecurityQuestionPicker(false);
        setIsSecurityQuestionPickerClosing(false);
        pickerCloseTimerRef.current = null;
      }, 220);
    } else {
      setShowSecurityQuestionPicker(false);
      setIsSecurityQuestionPickerClosing(false);
    }
  };

  useEffect(() => {
    return () => {
      if (pickerCloseTimerRef.current !== null && typeof window !== 'undefined') {
        window.clearTimeout(pickerCloseTimerRef.current);
      }
      if (alertCloseTimerRef.current !== null && typeof window !== 'undefined') {
        window.clearTimeout(alertCloseTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    void refreshBiometricAvailability();
  }, []);

  useEffect(() => {
    if (!currentPin && biometricUnlockEnabled) {
      onBiometricUnlockEnabledChange(false);
    }
  }, [currentPin, biometricUnlockEnabled, onBiometricUnlockEnabledChange]);

  const applySageDuration = (minutes: number) => {
    const next = Math.max(1, Math.min(1440, Math.round(minutes)));
    onSageModeDurationChange(next);
  };

  const handlePinSubmit = async () => {
    if (tempPin.length !== 4) {
      showAppAlert('PIN 格式错误', '请输入4位数字 PIN。');
      return;
    }
    if (enableSecurityQuestion && !tempSecurityAnswer.trim()) {
      showAppAlert('缺少安全答案', '你已启用安全问题，请填写答案后再保存。');
      return;
    }
    try {
      const hashedPin = await hashSecret(tempPin);
      localStorage.setItem(PIN_KEY, hashedPin);

      const answer = tempSecurityAnswer.trim();
      if (enableSecurityQuestion && answer) {
        const hashedAnswer = await hashSecret(answer);
        localStorage.setItem(SECURITY_QUESTION_KEY, tempSecurityQuestionId);
        localStorage.setItem(SECURITY_ANSWER_KEY, hashedAnswer);
      } else {
        localStorage.removeItem(SECURITY_QUESTION_KEY);
        localStorage.removeItem(SECURITY_ANSWER_KEY);
      }

      onPinChange('__configured__');
      setIsSettingPin(false);
      setTempPin('');
      setTempSecurityAnswer('');
    } catch (e) {
      console.error('PIN hash failed', e);
      showAppAlert('设置失败', '设置 PIN 失败，请重试。');
    }
  };

  const handleBackgroundUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1024 * 1024 * 5) {
        showAppAlert('图片过大', '背景图片最大支持 5MB。');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => setCustomBackground(reader.result as string);
      reader.readAsDataURL(file);
    }
    if (e.target) e.target.value = '';
  };

  const handleIconUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1024 * 1024 * 2) {
        showAppAlert('图片过大', '图标最大支持 2MB。');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => setCustomIcon(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSoundUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1024 * 1024 * 3) {
        showAppAlert('音频过大', '音频文件最大支持 3MB。');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => setCustomSound(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const lines = text.split('\n');
        const newRecords: RecordEntry[] = [];

        for (let i = 1; i < lines.length; i += 1) {
          const line = lines[i].trim();
          if (!line) continue;
          const match = line.match(/^([^,]+),([^,]+),([^,]+),([^,]+),([^,]*),(.*)$/);
          if (!match) continue;

          const [, id, timestamp, , , mood, note] = match;
          if (id && timestamp && !Number.isNaN(Number(timestamp))) {
            newRecords.push({
              id,
              timestamp: Number(timestamp),
              mood: mood || '放松',
              note: note ? note.trim() : undefined,
            });
          }
        }

        if (newRecords.length > 0 && onImportRecords) {
          onImportRecords(newRecords);
        } else {
          showAppAlert('导入失败', '文件格式不正确或没有有效记录。');
        }
        if (importInputRef.current) importInputRef.current.value = '';
      } catch (error) {
        console.error('CSV import error:', error);
        showAppAlert('导入失败', '文件解析错误，请检查 CSV 内容。');
        if (importInputRef.current) importInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="p-6 space-y-5">
      <h2 className="text-2xl font-bold text-green-800 dark:text-green-400">设置</h2>

      <div className="bg-white/80 dark:bg-slate-900/80 rounded-[1.6rem] shadow-sm border border-green-100 dark:border-slate-800 p-4 space-y-3">
        <div className="relative">
          <i className="fa-solid fa-magnifying-glass text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 text-sm"></i>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索设置项，如：PIN / 贤者 / 导出 / 背景"
            className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-gray-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-green-400"
          />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500 dark:text-slate-400">
            {searching ? '搜索模式下会自动展开匹配分组' : '可一键展开或收起可折叠分组'}
          </span>
          <button
            type="button"
            onClick={toggleAllSections}
            disabled={searching}
            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border border-green-100 dark:border-green-800 disabled:opacity-50"
          >
            {allExpanded ? '全部收起' : '全部展开'}
          </button>
        </div>
      </div>

      {!hasSearchResult && (
        <div className="bg-white/80 dark:bg-slate-900/80 rounded-[1.6rem] border border-gray-200 dark:border-slate-700 p-5 text-sm text-gray-500 dark:text-slate-400">
          没有匹配到相关设置项，请换一个关键词。
        </div>
      )}
      {showSection('security') && (
        <div className="bg-white/80 dark:bg-slate-900/80 rounded-[2rem] shadow-sm border border-green-100 dark:border-slate-800 overflow-hidden">
          <button type="button" onClick={() => toggleSection('security')} className="w-full px-5 py-4 flex items-center justify-between text-left">
            <h3 className="text-xs font-bold text-green-600 dark:text-green-500 uppercase tracking-wider">安全与解锁</h3>
            <i className={`fa-solid fa-chevron-down text-green-500 transition-transform duration-300 ${isSectionOpen('security') ? 'rotate-180' : ''}`}></i>
          </button>
          <div className={getSectionBodyClass(isSectionOpen('security'))} style={getSectionBodyStyle(isSectionOpen('security'), 980)}>
            <div className="px-5 pb-5">
              <div className="mb-4 p-3 rounded-2xl bg-gray-50 dark:bg-slate-800/80 border border-gray-200 dark:border-slate-700">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center">
                      <i className="fa-solid fa-fingerprint"></i>
                    </div>
                    <div>
                      <div className="font-bold text-gray-800 dark:text-slate-200">生物识别解锁</div>
                      <div className="text-xs text-gray-500 dark:text-slate-400">
                        {!currentPin
                          ? '需先开启 PIN 码'
                          : isCheckingBiometric
                            ? '正在检测设备能力...'
                            : isBiometricAvailable
                              ? `可用：${biometricLabel}`
                              : '设备暂不可用'}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleBiometricSwitch()}
                    disabled={isCheckingBiometric}
                    className={`w-14 h-8 rounded-full transition-all relative disabled:opacity-50 ${
                      biometricUnlockEnabled ? 'bg-green-500 shadow-inner' : 'bg-gray-300 dark:bg-slate-700'
                    }`}
                    aria-label="切换生物识别解锁"
                  >
                    <div className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow-sm transition-transform ${biometricUnlockEnabled ? 'translate-x-7' : 'translate-x-1'}`}></div>
                  </button>
                </div>
              </div>

              {!isSettingPin ? (
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-2xl flex items-center justify-center">
                      <i className="fa-solid fa-lock"></i>
                    </div>
                    <div>
                      <div className="font-bold text-gray-800 dark:text-slate-200">PIN 码锁定</div>
                      <div className="text-xs text-gray-500 dark:text-slate-400">{currentPin ? '已开启' : '未开启'}</div>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      if (currentPin) onRemovePinRequest?.();
                      else {
                        setIsSettingPin(true);
                        setTempSecurityQuestionId(localStorage.getItem(SECURITY_QUESTION_KEY) || SECURITY_QUESTIONS[0].id);
                        setEnableSecurityQuestion(!!localStorage.getItem(SECURITY_ANSWER_KEY));
                        setTempSecurityAnswer('');
                      }
                    }}
                    className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors ${
                      currentPin ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400' : 'bg-green-500 text-white'
                    }`}
                  >
                    {currentPin ? '移除' : '去开启'}
                  </button>
                </div>
              ) : (
                <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                  <input
                    type="password"
                    maxLength={4}
                    placeholder="设置4位数字 PIN"
                    className="w-full p-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-center text-2xl tracking-widest font-bold focus:outline-none focus:ring-2 focus:ring-green-400 text-gray-800 dark:text-white"
                    value={tempPin}
                    onChange={(e) => setTempPin(e.target.value.replace(/[^0-9]/g, ''))}
                  />

                  <button
                    type="button"
                    onClick={() => {
                      setEnableSecurityQuestion((prev) => {
                        const next = !prev;
                        if (!next) closeSecurityQuestionPicker();
                        return next;
                      });
                    }}
                    className="w-full p-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 flex items-center gap-3 text-left"
                  >
                    <span
                      className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${
                        enableSecurityQuestion ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300 dark:border-slate-600 text-transparent'
                      }`}
                    >
                      <i className="fa-solid fa-check text-[10px]"></i>
                    </span>
                    <span className="text-sm font-bold text-gray-700 dark:text-slate-300">启用安全问题重置 PIN</span>
                  </button>

                  {enableSecurityQuestion && (
                    <div className="animate-in fade-in slide-in-from-top-1 duration-300">
                      <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 mb-1.5">安全问题（忘记 PIN 时用于验证）</label>
                      <button
                        type="button"
                        onClick={openSecurityQuestionPicker}
                        className="w-full p-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm font-medium text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-400 flex items-center justify-between gap-3"
                      >
                        <span className="text-left">{SECURITY_QUESTIONS.find((q) => q.id === tempSecurityQuestionId)?.label ?? SECURITY_QUESTIONS[0].label}</span>
                        <i className={`fa-solid fa-chevron-down text-green-500 transition-transform duration-300 ${showSecurityQuestionPicker ? 'rotate-180' : ''}`}></i>
                      </button>
                      <input
                        type="text"
                        placeholder="请输入安全问题答案"
                        className="w-full mt-2 p-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-400 placeholder:text-gray-400"
                        value={tempSecurityAnswer}
                        onChange={(e) => setTempSecurityAnswer(e.target.value)}
                      />
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button onClick={handlePinSubmit} className="flex-1 bg-green-500 text-white font-bold py-2 rounded-xl">保存</button>
                    <button
                      onClick={() => {
                        setIsSettingPin(false);
                        setEnableSecurityQuestion(false);
                        closeSecurityQuestionPicker();
                        setTempSecurityAnswer('');
                      }}
                      className="flex-1 bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-slate-400 font-bold py-2 rounded-xl"
                    >
                      取消
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showSection('habit') && (
        <div className="bg-white/80 dark:bg-slate-900/80 rounded-[2rem] shadow-sm border border-green-100 dark:border-slate-800 overflow-hidden">
          <button type="button" onClick={() => toggleSection('habit')} className="w-full px-5 py-4 flex items-center justify-between text-left">
            <h3 className="text-xs font-bold text-green-600 dark:text-green-500 uppercase tracking-wider">打卡行为与反馈</h3>
            <i className={`fa-solid fa-chevron-down text-green-500 transition-transform duration-300 ${isSectionOpen('habit') ? 'rotate-180' : ''}`}></i>
          </button>
          <div className={getSectionBodyClass(isSectionOpen('habit'))} style={getSectionBodyStyle(isSectionOpen('habit'), 780)}>
            <div className="px-5 pb-5 space-y-5">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center">
                      <i className={`fa-solid ${soundEnabled ? 'fa-volume-high' : 'fa-volume-xmark'}`}></i>
                    </div>
                    <div>
                      <div className="font-bold text-gray-800 dark:text-slate-200">打卡反馈音</div>
                      <div className="text-xs text-gray-500 dark:text-slate-400">{soundEnabled ? (customSound ? '自定义音效' : '灵动鹿鸣') : '已静音'}</div>
                    </div>
                  </div>
                  <button onClick={toggleSound} className={`w-14 h-8 rounded-full transition-all relative ${soundEnabled ? 'bg-green-500 shadow-inner' : 'bg-gray-300 dark:bg-slate-700'}`}>
                    <div className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow-sm transition-transform ${soundEnabled ? 'translate-x-7' : 'translate-x-1'}`}></div>
                  </button>
                </div>
                {soundEnabled && (
                  <div className="pt-1 flex flex-col gap-2 animate-in fade-in slide-in-from-top-1 duration-300">
                    <div className="flex gap-2">
                      <button onClick={onTestSound} className="flex-1 py-2.5 bg-green-50 dark:bg-green-900/10 text-green-700 dark:text-green-400 rounded-xl text-xs font-bold border border-green-100 dark:border-green-800/50 flex items-center justify-center gap-2 active:scale-95 transition-transform">
                        <i className="fa-solid fa-play"></i>试听反馈
                      </button>
                      <button onClick={() => soundInputRef.current?.click()} className="flex-1 py-2.5 bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 active:scale-95 transition-transform">
                        <i className="fa-solid fa-upload"></i>上传音效
                      </button>
                    </div>
                    {customSound && (
                      <button onClick={() => setCustomSound(null)} className="w-full py-2 bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-400 rounded-lg text-[10px] font-bold">
                        重置为默认鹿鸣音
                      </button>
                    )}
                    <input type="file" ref={soundInputRef} onChange={handleSoundUpload} className="hidden" accept="audio/*" />
                  </div>
                )}
              </div>
              <div className="space-y-3 pt-2 border-t border-gray-100 dark:border-slate-800">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 rounded-2xl flex items-center justify-center">
                      <i className="fa-solid fa-hourglass-half"></i>
                    </div>
                    <div>
                      <div className="font-bold text-gray-800 dark:text-slate-200">启用贤者模式</div>
                      <div className="text-xs text-gray-500 dark:text-slate-400">{sageModeEnabled ? '已开启' : '已关闭'}</div>
                    </div>
                  </div>
                  <button type="button" onClick={() => onSageModeEnabledChange(!sageModeEnabled)} className={`w-14 h-8 rounded-full transition-all relative ${sageModeEnabled ? 'bg-green-500 shadow-inner' : 'bg-gray-300 dark:bg-slate-700'}`}>
                    <div className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow-sm transition-transform ${sageModeEnabled ? 'translate-x-7' : 'translate-x-1'}`}></div>
                  </button>
                </div>
                <div className="text-sm text-gray-600 dark:text-slate-400 leading-relaxed">
                  {sageModeEnabled ? '每次打卡后进入倒计时，倒计时结束前不可再次打卡。' : '贤者模式已关闭，可连续打卡。'}
                </div>
                <div className={`overflow-hidden transition-[max-height,opacity,transform] duration-[320ms] ease-[cubic-bezier(0.25,0.1,0.25,1)] ${sageModeEnabled ? 'max-h-[320px] opacity-100 translate-y-0' : 'max-h-0 opacity-0 translate-y-1 pointer-events-none'}`}>
                  <div className={`space-y-3 pt-1 transition-[opacity,transform] duration-[320ms] ease-[cubic-bezier(0.25,0.1,0.25,1)] ${sageModeEnabled ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-1'}`}>
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => applySageDuration(sageModeDurationMinutes - 1)} className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 font-bold">-</button>
                      <input
                        type="number"
                        min={1}
                        max={1440}
                        value={sageModeDurationMinutes}
                        onChange={(e) => {
                          const n = Number(e.target.value);
                          if (Number.isFinite(n)) applySageDuration(n);
                        }}
                        className="flex-1 p-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-center text-sm font-bold text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-400"
                      />
                      <button type="button" onClick={() => applySageDuration(sageModeDurationMinutes + 1)} className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 font-bold">+</button>
                    </div>
                    <div className="text-xs text-gray-500 dark:text-slate-400">当前时长：{sageModeDurationMinutes} 分钟</div>
                    <div className="flex flex-wrap gap-2">
                      {[5, 15, 30, 60].map((v) => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => applySageDuration(v)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                            sageModeDurationMinutes === v
                              ? 'bg-green-500 text-white border-green-500'
                              : 'bg-green-50 dark:bg-slate-800 text-green-700 dark:text-green-400 border-green-100 dark:border-slate-700'
                          }`}
                        >
                          {v} 分钟
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showSection('appearance') && (
        <div className="bg-white/80 dark:bg-slate-900/80 rounded-[2rem] shadow-sm border border-green-100 dark:border-slate-800 overflow-hidden">
          <button type="button" onClick={() => toggleSection('appearance')} className="w-full px-5 py-4 flex items-center justify-between text-left">
            <h3 className="text-xs font-bold text-green-600 dark:text-green-500 uppercase tracking-wider">外观与体验</h3>
            <i className={`fa-solid fa-chevron-down text-green-500 transition-transform duration-300 ${isSectionOpen('appearance') ? 'rotate-180' : ''}`}></i>
          </button>
          <div className={getSectionBodyClass(isSectionOpen('appearance'))} style={getSectionBodyStyle(isSectionOpen('appearance'), 520)}>
            <div className="px-5 pb-5 space-y-5">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-slate-800 border border-green-50 dark:border-slate-700 flex items-center justify-center overflow-hidden shadow-inner">
                  {customIcon ? (
                    <img src={customIcon} alt="预览图标" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-3xl leading-none" aria-hidden="true">
                      🦌
                    </span>
                  )}
                </div>
                <div className="flex-1 space-y-2">
                  <div className="font-bold text-sm text-gray-800 dark:text-slate-200">打卡图标</div>
                  <div className="flex gap-2">
                    <button onClick={() => fileInputRef.current?.click()} className="px-3 py-1.5 bg-green-500 text-white text-xs font-bold rounded-lg hover:bg-green-600 transition-colors">更换图标</button>
                    {customIcon && <button onClick={() => setCustomIcon(null)} className="px-3 py-1.5 bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-400 text-xs font-bold rounded-lg transition-colors">恢复默认</button>}
                  </div>
                  <input type="file" ref={fileInputRef} onChange={handleIconUpload} className="hidden" accept="image/*" />
                </div>
              </div>

              <div className="space-y-3 pt-2 border-t border-gray-100 dark:border-slate-800">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-slate-800 border border-green-50 dark:border-slate-700 overflow-hidden shrink-0 shadow-inner flex items-center justify-center">
                    {customBackground ? (
                      <img src={customBackground} alt="背景预览" className="w-full h-full object-cover" />
                    ) : (
                      <span className="w-full h-full flex items-center justify-center text-2xl leading-none" aria-hidden="true">
                        🖼️
                      </span>
                    )}
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="font-bold text-sm text-gray-800 dark:text-slate-200">自定义背景图</div>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => backgroundInputRef.current?.click()} className="px-3 py-1.5 bg-green-500 text-white text-xs font-bold rounded-lg hover:bg-green-600 transition-colors">上传图片</button>
                      {customBackground && (
                        <button type="button" onClick={() => setCustomBackground(null)} className="px-3 py-1.5 bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-400 text-xs font-bold rounded-lg transition-colors">
                          恢复默认
                        </button>
                      )}
                    </div>
                    <p className="text-[10px] text-gray-500 dark:text-slate-400">支持 JPG/PNG，最大 5MB</p>
                  </div>
                  <input type="file" ref={backgroundInputRef} onChange={handleBackgroundUpload} className="hidden" accept="image/*" />
                </div>
                <div className="flex gap-2">
                  <input
                    type="url"
                    placeholder="或粘贴图片链接"
                    className="flex-1 p-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm text-gray-800 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-green-400"
                    value={backgroundUrlInput}
                    onChange={(e) => setBackgroundUrlInput(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const url = backgroundUrlInput.trim();
                      if (url) {
                        setCustomBackground(url);
                        setBackgroundUrlInput('');
                      }
                    }}
                    className="px-4 py-2.5 bg-green-500 text-white text-xs font-bold rounded-xl shrink-0"
                  >
                    使用
                  </button>
                </div>
              </div>

              <div className="pt-2 border-t border-gray-100 dark:border-slate-800 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-orange-50 dark:bg-slate-800 text-orange-600 dark:text-orange-400 rounded-2xl flex items-center justify-center">
                    <i className="fa-solid fa-moon"></i>
                  </div>
                  <div>
                    <div className="font-bold text-gray-800 dark:text-slate-200">暗黑模式</div>
                    <div className="text-xs text-gray-500 dark:text-slate-400">更舒适的夜间记录体验</div>
                  </div>
                </div>
                <button type="button" onClick={toggleDarkMode} className={`w-14 h-8 rounded-full transition-colors duration-500 ease-linear relative ${darkMode ? 'bg-green-500' : 'bg-gray-300 dark:bg-slate-700'}`}>
                  <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-transform ${darkMode ? 'translate-x-7' : 'translate-x-1'}`}></div>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {showSection('data') && (
        <div className="bg-white/80 dark:bg-slate-900/80 rounded-[2rem] shadow-sm border border-green-100 dark:border-slate-800 overflow-hidden">
          <button type="button" onClick={() => toggleSection('data')} className="w-full px-5 py-4 flex items-center justify-between text-left">
            <h3 className="text-xs font-bold text-green-600 dark:text-green-500 uppercase tracking-wider">数据管理</h3>
            <i className={`fa-solid fa-chevron-down text-green-500 transition-transform duration-300 ${isSectionOpen('data') ? 'rotate-180' : ''}`}></i>
          </button>
          <div className={getSectionBodyClass(isSectionOpen('data'))} style={getSectionBodyStyle(isSectionOpen('data'), 520)}>
            <div className="px-5 pb-5">
              <div className="grid grid-cols-2 gap-3 mb-4">
                <button onClick={() => onExportRequest?.()} className="flex flex-col items-center justify-center p-4 bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800 rounded-2xl hover:bg-green-100 dark:hover:bg-green-900/30 transition-all group">
                  <i className="fa-solid fa-file-export text-xl text-green-600 dark:text-green-400 mb-2 group-active:scale-90 transition-transform"></i>
                  <span className="text-xs font-bold text-green-800 dark:text-green-300">导出 CSV</span>
                </button>
                <button onClick={() => onShareExport?.()} className="flex flex-col items-center justify-center p-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800 rounded-2xl hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-all group">
                  <i className="fa-solid fa-share text-xl text-purple-600 dark:text-purple-400 mb-2 group-active:scale-90 transition-transform"></i>
                  <span className="text-xs font-bold text-purple-800 dark:text-purple-300">分享文件</span>
                </button>
              </div>
              <div className="grid grid-cols-1 gap-3 mb-4">
                <button onClick={() => importInputRef.current?.click()} className="flex flex-col items-center justify-center p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-2xl hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-all group">
                  <i className="fa-solid fa-file-import text-xl text-blue-600 dark:text-blue-400 mb-2 group-active:scale-90 transition-transform"></i>
                  <span className="text-xs font-bold text-blue-800 dark:text-blue-300">导入 CSV</span>
                </button>
              </div>
              <input type="file" ref={importInputRef} onChange={handleImportData} className="hidden" accept=".csv" />
              <button onClick={onClear} className="w-full p-4 flex items-center justify-center gap-3 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-800/50 rounded-2xl hover:bg-red-100 dark:hover:bg-red-900/20 transition-colors">
                <i className="fa-solid fa-trash-arrow-up text-red-600 dark:text-red-400"></i>
                <span className="text-xs font-bold text-red-600 dark:text-red-400">清除所有本地记录</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {showAboutSection && (
        <div className="space-y-4">
          <button onClick={onShowChangeLog} className="w-full bg-white/80 dark:bg-slate-900/80 rounded-[2rem] shadow-sm border border-green-100 dark:border-slate-800 overflow-hidden hover:shadow-md transition-shadow">
            <div className="p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center">
                  <i className="fa-solid fa-scroll"></i>
                </div>
                <div className="text-left">
                  <div className="font-bold text-gray-800 dark:text-slate-200">更新日志</div>
                  <div className="text-xs text-gray-500 dark:text-slate-400">查看最新功能和修复</div>
                </div>
              </div>
              <i className="fa-solid fa-chevron-right text-gray-400 dark:text-slate-600"></i>
            </div>
          </button>

          <div className="relative overflow-hidden bg-white/45 dark:bg-slate-900/40 backdrop-blur-xl rounded-3xl p-6 text-center border border-white/55 dark:border-slate-700/60 shadow-[0_10px_30px_rgba(2,8,23,0.12)]">
            <div className="pointer-events-none absolute left-6 right-6 top-0 h-px bg-gradient-to-r from-transparent via-white/90 dark:via-slate-300/30 to-transparent"></div>
            <h4 className="font-bold text-green-900 dark:text-green-400 mb-1">关于鹿了么</h4>
            <p className="text-xs text-green-800/60 dark:text-green-400/40 mb-4">
              <a href="https://github.com/mengkuikun" target="_blank" rel="noopener noreferrer" className="font-semibold hover:text-green-700 dark:hover:text-green-300 transition-colors">
                版本 1.6.0
              </a>
            </p>
            <p className="text-xs text-green-800/80 dark:text-green-400/60 leading-relaxed italic px-4">"隐私是我们的最高准则。您的数据永远只会留在您的手机上。"</p>
          </div>
        </div>
      )}

      {enableSecurityQuestion && showSecurityQuestionPicker && typeof document !== 'undefined' && createPortal(
        <div
          className={`${darkMode ? 'dark ' : ''}fixed inset-0 z-[9999] p-6 flex items-center justify-center bg-black/55 backdrop-blur-sm ${isSecurityQuestionPickerClosing ? 'animate-picker-fade-out' : 'animate-picker-fade'}`}
          onClick={closeSecurityQuestionPicker}
        >
          <div
            className={`w-full max-w-md bg-white dark:bg-slate-900 border border-green-100 dark:border-slate-700 rounded-[1.75rem] overflow-hidden shadow-2xl ${isSecurityQuestionPickerClosing ? 'animate-picker-sheet-out' : 'animate-picker-sheet'}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between">
              <h4 className="text-base font-black text-gray-800 dark:text-slate-200">选择安全问题</h4>
              <button type="button" onClick={closeSecurityQuestionPicker} className="w-8 h-8 rounded-full bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-400 flex items-center justify-center" aria-label="关闭安全问题选择器">
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
            <div className="max-h-[55vh] overflow-y-auto">
              {SECURITY_QUESTIONS.map((q) => {
                const checked = tempSecurityQuestionId === q.id;
                return (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => {
                      setTempSecurityQuestionId(q.id);
                      closeSecurityQuestionPicker();
                    }}
                    className={`w-full px-5 py-4 flex items-center justify-between gap-3 text-left transition-colors border-b border-gray-100 dark:border-slate-800 last:border-b-0 ${
                      checked ? 'bg-green-50 dark:bg-green-900/20' : 'bg-white dark:bg-slate-900'
                    }`}
                  >
                    <span className={`text-base font-bold ${checked ? 'text-green-700 dark:text-green-300' : 'text-gray-800 dark:text-slate-200'}`}>{q.label}</span>
                    <span className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${checked ? 'border-green-600 dark:border-green-400' : 'border-gray-400 dark:border-slate-500'}`}>
                      <span className={`w-3 h-3 rounded-full transition-all ${checked ? 'bg-green-600 dark:bg-green-400 scale-100' : 'bg-transparent scale-50'}`}></span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>,
        document.body
      )}

      {alertState.open && typeof document !== 'undefined' && createPortal(
        <div
          className={`${darkMode ? 'dark ' : ''}fixed inset-0 z-[10000] p-5 flex items-center justify-center bg-black/45 backdrop-blur-sm ${alertState.closing ? 'animate-appalert-fade-out' : 'animate-appalert-fade-in'}`}
          onClick={closeAppAlert}
        >
          <div
            className={`w-full max-w-sm bg-white dark:bg-slate-900 border border-green-100 dark:border-slate-700 rounded-[1.5rem] shadow-2xl overflow-hidden ${alertState.closing ? 'animate-appalert-sheet-out' : 'animate-appalert-sheet-in'}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-gray-100 dark:border-slate-800">
              <h4 className="text-base font-black text-gray-800 dark:text-slate-200">{alertState.title}</h4>
            </div>
            <div className="px-5 py-4 text-sm text-gray-600 dark:text-slate-300 leading-relaxed">{alertState.message}</div>
            <div className="px-5 pb-5">
              <button type="button" onClick={closeAppAlert} className="w-full py-2.5 bg-green-500 text-white font-bold rounded-xl">我知道了</button>
            </div>
          </div>
        </div>,
        document.body
      )}

      <style>{`
        @keyframes pickerFadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes pickerFadeOut { from { opacity: 1; } to { opacity: 0; } }
        @keyframes pickerSheetIn { from { opacity: 0; transform: translateY(8px) scale(0.97); } to { opacity: 1; transform: translateY(0) scale(1); } }
        @keyframes pickerSheetOut { from { opacity: 1; transform: translateY(0) scale(1); } to { opacity: 0; transform: translateY(8px) scale(0.97); } }
        @keyframes appAlertFadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes appAlertFadeOut { from { opacity: 1; } to { opacity: 0; } }
        @keyframes appAlertSheetIn { from { opacity: 0; transform: translateY(10px) scale(0.97); } to { opacity: 1; transform: translateY(0) scale(1); } }
        @keyframes appAlertSheetOut { from { opacity: 1; transform: translateY(0) scale(1); } to { opacity: 0; transform: translateY(10px) scale(0.97); } }
        .animate-picker-fade { animation: pickerFadeIn 0.2s ease-out forwards; }
        .animate-picker-fade-out { animation: pickerFadeOut 0.18s ease-in forwards; }
        .animate-picker-sheet { animation: pickerSheetIn 0.24s cubic-bezier(0.2, 0.85, 0.2, 1) forwards; }
        .animate-picker-sheet-out { animation: pickerSheetOut 0.2s ease-in forwards; }
        .animate-appalert-fade-in { animation: appAlertFadeIn 0.2s ease-out forwards; }
        .animate-appalert-fade-out { animation: appAlertFadeOut 0.18s ease-in forwards; }
        .animate-appalert-sheet-in { animation: appAlertSheetIn 0.22s cubic-bezier(0.2, 0.85, 0.2, 1) forwards; }
        .animate-appalert-sheet-out { animation: appAlertSheetOut 0.2s ease-in forwards; }
      `}</style>
    </div>
  );
};

export default SettingsView;
