import React, { useEffect, useRef, useState } from 'react';

interface Props {
  onClose: () => void;
  darkMode: boolean;
}

const ChangeLog: React.FC<Props> = ({ onClose, darkMode }) => {
  const [isClosing, setIsClosing] = useState(false);
  const closeTimerRef = useRef<number | null>(null);

  const requestClose = () => {
    if (isClosing) return;
    setIsClosing(true);
    if (typeof window !== 'undefined') {
      closeTimerRef.current = window.setTimeout(() => {
        onClose();
      }, 360);
    } else {
      onClose();
    }
  };

  useEffect(() => {
    return () => {
      if (closeTimerRef.current !== null && typeof window !== 'undefined') {
        window.clearTimeout(closeTimerRef.current);
      }
    };
  }, []);

  const changes = [
    {
      version: '1.6.0',
      date: '2026-02-08',
      title: '设置中心重构、贤者模式完善与解锁体验升级',
      items: [
        '✨ 新增：贤者模式完整冷却流程，打卡后进入倒计时，冷却结束前禁止再次打卡',
        '✨ 新增：贤者模式总开关（默认开启），可在设置中随时启用/关闭',
        '✨ 新增：贤者模式时长自定义（分钟输入 + 5/15/30/60 快捷档位）',
        '✨ 新增：主打卡按钮在贤者模式期间切换为闹钟倒计时动画与剩余时间显示',
        '✨ 新增：生物识别解锁（与 PIN 联动），支持设备可用性检测与状态提示',
        '✨ 新增：PIN 设置时可选启用安全问题，并支持通过安全问题重置 PIN',
        '✨ 新增：安全问题独立弹层选择器与过渡动画，支持遮罩关闭',
        '✨ 新增：设置页顶部搜索功能，支持关键词快速定位配置项',
        '✨ 新增：设置页一键“全部展开/全部收起”控制',
        '✨ 新增：版本信息外链跳转（GitHub）',
        '✨ 优化：设置页信息架构重组为安全/行为/外观/数据分组，降低信息噪音',
        '✨ 优化：关于模块独立展示，不再折叠，提升可达性',
        '✨ 优化：更新日志弹窗开关动画节奏，过渡更平滑连贯',
        '✨ 优化：日历选择器采用全局遮罩策略，统一跨页面压暗体验',
        '✨ 优化：全局遮罩加入背景模糊，并将日期选择器改为 Portal 渲染，修复层级冲突',
        '✨ 优化：设置页关于卡片升级为毛玻璃风格（半透明 + blur + 高光边界）',
        '✨ 优化：外观区“打卡图标/背景图”预览规格统一（同尺寸、同对齐、同间距）',
        '✅ 修复：设置页安全问题弹窗错位到统计页、暗黑模式不完整等层级与主题问题',
        '✅ 修复：设置页部分文案与提示词不准确（找回/重置等）',
        '✅ 修复：设置页面乱码（编码不一致导致），统一为 UTF-8 后恢复正常显示',
        '✅ 修复：外观区默认占位图标与标题缺失问题',
      ]
    },
    {
      version: '1.5.0',
      date: '2026-01-30',
      title: '统计热力图、PIN 安全与主题过渡',
      items: [
        '✨ 新增：统计页打卡热力图，支持按年/按月切换，六档图例（0～5+ 次）',
        '✨ 新增：PIN 码设置时可选安全问题，忘记 PIN 时通过验证可查看 PIN 或重置',
        '✨ 新增：设置页自定义背景图（上传图片或粘贴链接）',
        '✨ 优化：暗黑模式切换改为整页逐渐过渡（0.5s linear），去除圆形遮罩',
        '✨ 优化：选择日期弹窗内滑动年月列表时阻止误触左右滑动',
        '✨ 优化：打开日期选择时打卡按钮逐渐缩小隐藏，关闭后逐渐显示',
        '✨ 优化：长按打卡进度条改为 requestAnimationFrame 驱动，修复中途卡顿掉帧',
        '✨ 优化：打卡图标与进度环动画采用线性、匀速，更符合大厂 UI 规范',
        '✅ 修复：补录「今天」时记录时间错误（00:00:00）的问题',
        '✅ 修复：DetailModal 列表排序不修改 props 原数组',
        '✨ 优化：常量与 getLocalDateString 抽离至 constants，统一 PIN/导出 Key',
      ]
    },
    {
      version: '1.4.4',
      date: '2026-01-27',
      title: '日历交互优化与UI改进',
      items: [
        '✨ 新增：日历选择器支持按年份和月份快速跳转，可直接跳转到任意日期',
        '✅ 修复：空白日期（无记录）无法点击新建记录的问题',
        '✨ 优化：统一所有日期的点击交互，简化用户操作流程',
        '✨ 优化：DetailModal中的提示文本从"写点什么吗？"改为"🦌后感"',
        '✨ 优化：版本号统一更新至1.4.4（package.json、Android versionCode/versionName、Settings界面）',
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
    <div
      className={`fixed inset-0 z-[70] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm ${
        isClosing ? 'animate-changelog-fade-out' : 'animate-changelog-fade-in'
      } ${darkMode ? 'dark' : ''}`}
      onClick={requestClose}
    >
      <div
        className={`w-full max-w-md bg-white dark:bg-slate-900 rounded-[2.5rem] p-6 shadow-2xl border border-green-100 dark:border-slate-800 max-h-[80vh] overflow-y-auto ${
          isClosing ? 'animate-changelog-sheet-out' : 'animate-changelog-sheet-in'
        }`}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-2xl flex items-center justify-center">
              <i className="fa-solid fa-scroll"></i>
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">更新日志</h2>
          </div>
          <button
            onClick={requestClose}
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
            onClick={requestClose}
            className="w-full py-3 bg-green-500 hover:bg-green-600 text-white font-bold rounded-2xl transition-colors active:scale-95"
          >
            关闭
          </button>
        </div>
      </div>

      <style>{`
        @keyframes changelogFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes changelogFadeOut {
          from { opacity: 1; }
          to { opacity: 0; }
        }
        @keyframes changelogSheetIn {
          from { opacity: 0; transform: translateY(16px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes changelogSheetOut {
          from { opacity: 1; transform: translateY(0) scale(1); }
          to { opacity: 0; transform: translateY(12px) scale(0.97); }
        }
        .animate-changelog-fade-in {
          animation: changelogFadeIn 0.34s ease-out forwards;
        }
        .animate-changelog-fade-out {
          animation: changelogFadeOut 0.28s ease-in forwards;
        }
        .animate-changelog-sheet-in {
          animation: changelogSheetIn 0.42s cubic-bezier(0.2, 0.85, 0.2, 1) forwards;
        }
        .animate-changelog-sheet-out {
          animation: changelogSheetOut 0.34s ease-in forwards;
        }
      `}</style>
    </div>
  );
};

export default ChangeLog;
