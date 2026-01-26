
import React, { useState, useRef } from 'react';
import { RecordEntry } from '../types';

interface Props {
  onClear: () => void;
  records: RecordEntry[];
  darkMode: boolean;
  toggleDarkMode: () => void;
  soundEnabled: boolean;
  toggleSound: () => void;
  customIcon: string | null;
  setCustomIcon: (icon: string | null) => void;
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
}

const SettingsView: React.FC<Props> = ({ 
  onClear, 
  records, 
  darkMode, 
  toggleDarkMode, 
  soundEnabled,
  toggleSound,
  customIcon, 
  setCustomIcon,
  customSound,
  setCustomSound,
  onImportRecords,
  onExportRequest,
  onShareExport,
  onTestSound,
  onShowChangeLog,
  onRemovePinRequest,
  currentPin,
  onPinChange
}) => {
  const [isSettingPin, setIsSettingPin] = useState(false);
  const [tempPin, setTempPin] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const soundInputRef = useRef<HTMLInputElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

  const handlePinSubmit = () => {
    if (tempPin.length === 4) {
      localStorage.setItem('lulemo_pin', tempPin);
      onPinChange(tempPin);
      setIsSettingPin(false);
      setTempPin('');
    } else {
      alert("请输入4位数字");
    }
  };

  const handleIconUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1024 * 1024 * 2) {
        alert("图片太大啦（最大支持 2MB）");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setCustomIcon(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSoundUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1024 * 1024 * 3) {
        alert("音频文件太大（最大支持 3MB）");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setCustomSound(reader.result as string);
      };
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

        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;

          // 改进的CSV解析：处理可能包含逗号的字段
          // 格式: ID,Timestamp,Date,Time,Mood,Note
          const match = line.match(/^([^,]+),([^,]+),([^,]+),([^,]+),([^,]*),(.*)$/);
          
          if (match) {
            const [, id, timestamp, , , mood, note] = match;
            
            if (id && timestamp && !isNaN(Number(timestamp))) {
              newRecords.push({
                id: id,
                timestamp: Number(timestamp),
                mood: mood || '放松',
                note: note ? note.trim() : undefined
              });
            }
          }
        }

        if (newRecords.length > 0 && onImportRecords) {
          onImportRecords(newRecords);
        } else {
          alert("导入失败：文件格式不正确或没有有效数据。");
        }
        if (importInputRef.current) importInputRef.current.value = '';
      } catch (error) {
        console.error('CSV import error:', error);
        alert("导入失败：文件解析错误。");
        if (importInputRef.current) importInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-2xl font-bold text-green-800 dark:text-green-400 mb-6">设置</h2>

      {/* Security Section */}
      <div className="bg-white/80 dark:bg-slate-900/80 rounded-[2rem] shadow-sm border border-green-100 dark:border-slate-800 overflow-hidden">
        <div className="p-5">
          <h3 className="text-xs font-bold text-green-600 dark:text-green-500 uppercase mb-4 tracking-wider">安全与隐私</h3>
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
                onClick={() => currentPin ? onRemovePinRequest?.() : setIsSettingPin(true)}
                className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors ${currentPin ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400' : 'bg-green-500 text-white'}`}
              >
                {currentPin ? '移除' : '去开启'}
              </button>
            </div>
          ) : (
            <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
              <input 
                type="password" 
                maxLength={4} 
                placeholder="输入4位数字"
                className="w-full p-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-center text-2xl tracking-widest font-bold focus:outline-none focus:ring-2 focus:ring-green-400 text-gray-800 dark:text-white"
                value={tempPin}
                onChange={(e) => setTempPin(e.target.value.replace(/[^0-9]/g, ''))}
              />
              <div className="flex gap-2">
                <button onClick={handlePinSubmit} className="flex-1 bg-green-500 text-white font-bold py-2 rounded-xl">保存</button>
                <button onClick={() => setIsSettingPin(false)} className="flex-1 bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-slate-400 font-bold py-2 rounded-xl">取消</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Sound Settings Section */}
      <div className="bg-white/80 dark:bg-slate-900/80 rounded-[2rem] shadow-sm border border-green-100 dark:border-slate-800 overflow-hidden">
        <div className="p-5">
          <h3 className="text-xs font-bold text-green-600 dark:text-green-500 uppercase mb-4 tracking-wider">音效设置</h3>
          <div className="space-y-4">
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
              <button 
                onClick={toggleSound}
                className={`w-14 h-8 rounded-full transition-all relative ${soundEnabled ? 'bg-green-500 shadow-inner' : 'bg-gray-300 dark:bg-slate-700'}`}
              >
                <div className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow-sm transition-transform ${soundEnabled ? 'translate-x-7' : 'translate-x-1'}`}></div>
              </button>
            </div>
            
            {soundEnabled && (
              <div className="pt-2 flex flex-col gap-2 animate-in fade-in slide-in-from-top-1 duration-300">
                <div className="flex gap-2">
                  <button 
                    onClick={onTestSound}
                    className="flex-1 py-2.5 bg-green-50 dark:bg-green-900/10 text-green-700 dark:text-green-400 rounded-xl text-xs font-bold border border-green-100 dark:border-green-800/50 flex items-center justify-center gap-2 active:scale-95 transition-transform"
                  >
                    <i className="fa-solid fa-play"></i>
                    试听反馈
                  </button>
                  <button 
                    onClick={() => soundInputRef.current?.click()}
                    className="flex-1 py-2.5 bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 active:scale-95 transition-transform"
                  >
                    <i className="fa-solid fa-upload"></i>
                    上传音效
                  </button>
                </div>
                {customSound && (
                  <button 
                    onClick={() => setCustomSound(null)}
                    className="w-full py-2 bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-400 rounded-lg text-[10px] font-bold"
                  >
                    重置为默认鹿鸣音
                  </button>
                )}
                <input 
                  type="file" 
                  ref={soundInputRef} 
                  onChange={handleSoundUpload} 
                  className="hidden" 
                  accept="audio/*"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Appearance Section */}
      <div className="bg-white/80 dark:bg-slate-900/80 rounded-[2rem] shadow-sm border border-green-100 dark:border-slate-800 overflow-hidden">
        <div className="p-5">
          <h3 className="text-xs font-bold text-green-600 dark:text-green-500 uppercase mb-4 tracking-wider">打卡外观</h3>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-slate-800 border border-green-50 dark:border-slate-700 flex items-center justify-center overflow-hidden shadow-inner">
              {customIcon ? (
                <img src={customIcon} alt="Preview" className="w-full h-full object-cover" />
              ) : (
                <span className="text-3xl">🦌</span>
              )}
            </div>
            <div className="flex-1 space-y-2">
              <div className="font-bold text-sm text-gray-800 dark:text-slate-200">打卡图标</div>
              <div className="flex gap-2">
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1.5 bg-green-500 text-white text-xs font-bold rounded-lg hover:bg-green-600 transition-colors"
                >
                  更换图标
                </button>
                {customIcon && (
                  <button 
                    onClick={() => setCustomIcon(null)}
                    className="px-3 py-1.5 bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-400 text-xs font-bold rounded-lg transition-colors"
                  >
                    恢复默认
                  </button>
                )}
              </div>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleIconUpload} 
                className="hidden" 
                accept="image/*"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Theme Section */}
      <div className="bg-white/80 dark:bg-slate-900/80 rounded-[2rem] shadow-sm border border-green-100 dark:border-slate-800 overflow-hidden">
        <div className="p-5 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-50 dark:bg-slate-800 text-orange-600 dark:text-orange-400 rounded-2xl flex items-center justify-center">
                <i className="fa-solid fa-moon"></i>
              </div>
              <div>
                <div className="font-bold text-gray-800 dark:text-slate-200">暗黑模式</div>
                <div className="text-xs text-gray-500 dark:text-slate-400">更舒适的夜间记录体验</div>
              </div>
            </div>
            <button 
              onClick={toggleDarkMode}
              className={`w-14 h-8 rounded-full transition-colors relative ${darkMode ? 'bg-green-500' : 'bg-gray-300 dark:bg-slate-700'}`}
            >
              <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-transform ${darkMode ? 'translate-x-7' : 'translate-x-1'}`}></div>
            </button>
          </div>
      </div>

      {/* Data Management Section */}
      <div className="bg-white/80 dark:bg-slate-900/80 rounded-[2rem] shadow-sm border border-green-100 dark:border-slate-800 overflow-hidden">
        <div className="p-5">
           <h3 className="text-xs font-bold text-green-600 dark:text-green-500 uppercase mb-4 tracking-wider">数据管理</h3>
           <div className="grid grid-cols-2 gap-3 mb-4">
              <button 
                onClick={() => onExportRequest?.()}
                className="flex flex-col items-center justify-center p-4 bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800 rounded-2xl hover:bg-green-100 dark:hover:bg-green-900/30 transition-all group"
              >
                <i className="fa-solid fa-file-export text-xl text-green-600 dark:text-green-400 mb-2 group-active:scale-90 transition-transform"></i>
                <span className="text-xs font-bold text-green-800 dark:text-green-300">导出 CSV</span>
              </button>
              <button 
                onClick={() => onShareExport?.()}
                className="flex flex-col items-center justify-center p-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800 rounded-2xl hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-all group"
              >
                <i className="fa-solid fa-share text-xl text-purple-600 dark:text-purple-400 mb-2 group-active:scale-90 transition-transform"></i>
                <span className="text-xs font-bold text-purple-800 dark:text-purple-300">分享文件</span>
              </button>
           </div>
           <div className="grid grid-cols-1 gap-3 mb-4">
              <button 
                onClick={() => importInputRef.current?.click()}
                className="flex flex-col items-center justify-center p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-2xl hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-all group"
              >
                <i className="fa-solid fa-file-import text-xl text-blue-600 dark:text-blue-400 mb-2 group-active:scale-90 transition-transform"></i>
                <span className="text-xs font-bold text-blue-800 dark:text-blue-300">导入 CSV</span>
              </button>
           </div>
           <input 
              type="file" 
              ref={importInputRef} 
              onChange={handleImportData} 
              className="hidden" 
              accept=".csv"
           />
           <button 
             onClick={onClear}
             className="w-full p-4 flex items-center justify-center gap-3 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-800/50 rounded-2xl hover:bg-red-100 dark:hover:bg-red-900/20 transition-colors"
           >
              <i className="fa-solid fa-trash-arrow-up text-red-600 dark:text-red-400"></i>
              <span className="text-xs font-bold text-red-600 dark:text-red-400">清除所有本地记录</span>
           </button>
        </div>
      </div>

      {/* About Section */}
      <div className="space-y-4">
        <button
          onClick={onShowChangeLog}
          className="w-full bg-white/80 dark:bg-slate-900/80 rounded-[2rem] shadow-sm border border-green-100 dark:border-slate-800 overflow-hidden hover:shadow-md transition-shadow"
        >
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

        <div className="bg-green-900/5 dark:bg-green-400/5 rounded-3xl p-6 text-center">
          <h4 className="font-bold text-green-900 dark:text-green-400 mb-1">关于鹿了么</h4>
          <p className="text-xs text-green-800/60 dark:text-green-400/40 mb-4">版本 1.4.4</p>
          <p className="text-xs text-green-800/80 dark:text-green-400/60 leading-relaxed italic px-4">
            "隐私是我们的最高准则。您的数据永远只会留在您的手机上。"
          </p>
        </div>
      </div>
    </div>
  );
};

export default SettingsView;
