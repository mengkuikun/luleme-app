import React from 'react';

interface Props {
  onClose: () => void;
  darkMode: boolean;
}

const ChangeLog: React.FC<Props> = ({ onClose, darkMode }) => {
  const changes = [
    {
      version: '1.4.4',
      date: '2026-01-27',
      title: '长按打卡交互优化与UI改进',
      items: [
        '✅ 修复：长按打卡进度环动画卡顿和提前触发问题',
        '✨ 优化：长按逻辑统一使用指针事件（PointerDown/PointerUp），移除onClick直接调用',
        '✨ 优化：短按打卡在指针松开时触发（onPointerUp），长按完成后再触发UI',
        '✨ 优化：细节文本"写点什么吗？"更改为"🦌后感"，增强主题感',
        '✅ 修复：长按时中途抬起不再打卡，需完成整个长按进度',
        '✨ 新增：日历选择器支持按年份和月份快速跳转，可以直接跳转到任意日期',
      ]
    },
    {
      version: '1.4.3',
      date: '2026-01-25',
      title: '导出功能重构 & 时区问题修复',
      items: [
        '✅ 修复：CSV 导出在 Android WebView 中无法工作的问题',
        '✨ 新增：使用 Capacitor Filesystem API 实现原生文件保存',
        '✨ 新增：导出文件自动保存到 Download/lululu 文件夹',
        '✨ 新增：独立的"分享文件"功能，支持分享已导出的数据',
        '✨ 优化：Toast 提示支持多行显示和向上滑入动画',
        '✅ 修复：打卡日期与实际时间不匹配的时区问题（UTC → 本地时间）',
        '✨ 优化：导出失败时自动回退到 Cache 目录',
      ]
    },
    {
      version: '1.4.2',
      date: '2026-01-25',
      title: '滑动交互与统计页稳定性修复',
      items: [
        '✨ 新增：底部导航支持左右滑动切换（拖动跟随 + 松手切换）',
        '✅ 修复：统计页面"一言"在半拖状态下频繁跳动的问题（useMemo 缓存）',
        '✨ 优化：将组件注释改为中文，提升可读性（StatsView）',
        '✨ 新增：应用鹿主题图标（🦌 SVG 设计，覆盖各密度 Android mipmap）',
        '✨ 优化：版本号升级至 1.4.2，同步 Android versionCode、versionName、package.json',
      ]
    },
    {
      version: '1.4.0',
      date: '2026-01-25',
      title: '音效系统优化 & 启动性能改进',
      items: [
        '✅ 修复：关闭打卡反馈音时，打卡仍有音效的问题',
        '✅ 修复：添加自定义音效后，打卡仍播放原音效的问题',
        '✅ 优化：音效缓存机制，防止重复创建Audio对象',
        '✅ 修复：应用启动时年龄询问页面闪屏的问题',
        '✅ 优化：启动性能，直接从localStorage初始化状态',
      ]
    },
    {
      version: '1.3.4',
      date: '2026-01-20',
      title: '初始版本发布',
      items: [
        '✨ 核心打卡功能',
        '✨ 日历视图和统计分析',
        '✨ 自定义打卡图标和音效',
        '✨ PIN 码隐私保护',
        '✨ 黑暗模式支持',
      ]
    },
  ];

  return (
    <div className={`fixed inset-0 z-[70] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 ${darkMode ? 'dark' : ''}`} onClick={onClose}>
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-[2.5rem] p-6 shadow-2xl animate-in zoom-in-95 duration-200 border border-green-100 dark:border-slate-800 max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-2xl flex items-center justify-center">
              <i className="fa-solid fa-scroll"></i>
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">更新日志</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
          >
            <i className="fa-solid fa-xmark text-gray-500 dark:text-slate-400"></i>
          </button>
        </div>

        {/* Changes List */}
        <div className="space-y-6">
          {changes.map((change, index) => (
            <div
              key={index}
              className="pb-6 border-b border-gray-100 dark:border-slate-800 last:border-b-0 last:pb-0"
            >
              {/* Version Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 rounded-full text-xs font-bold">
                    v{change.version}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-slate-400">
                    {change.date}
                  </span>
                </div>
              </div>

              {/* Version Title */}
              <h3 className="font-bold text-gray-800 dark:text-slate-200 mb-3">
                {change.title}
              </h3>

              {/* Change Items */}
              <ul className="space-y-2">
                {change.items.map((item, itemIndex) => (
                  <li
                    key={itemIndex}
                    className="text-xs text-gray-600 dark:text-slate-400 leading-relaxed flex gap-2"
                  >
                    <span className="flex-shrink-0 w-4 text-green-600 dark:text-green-400">
                      {item.startsWith('✅') ? '✅' : '✨'}
                    </span>
                    <span>{item.replace(/^[✅✨]\s*/, '')}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-gray-100 dark:border-slate-800">
          <button
            onClick={onClose}
            className="w-full py-3 bg-green-500 hover:bg-green-600 text-white font-bold rounded-2xl transition-colors active:scale-95"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChangeLog;
