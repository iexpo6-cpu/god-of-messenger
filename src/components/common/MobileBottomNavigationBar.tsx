import React, { useState } from 'react';
import { User, Backpack, Swords, Compass, Save, Home, Users, ChevronUp, ChevronDown } from 'lucide-react';

interface Props {
  sceneType?: string;
  onOpenCharacter: () => void;
  onOpenInventory: () => void;
  onOpenBase: () => void;
  onOpenCompanion: () => void;
  onOpenHunt: () => void;
  onOpenSkills?: () => void;
  onOpenMap: () => void;
  onSave?: () => void;
  activeTab?: 'character' | 'inventory' | 'base' | 'companion' | 'hunt' | 'skills' | 'map' | 'save' | null;
}

export const MobileBottomNavigationBar: React.FC<Props> = ({
  sceneType,
  onOpenCharacter,
  onOpenInventory,
  onOpenBase,
  onOpenCompanion,
  onOpenHunt,
  onOpenMap,
  onSave,
  activeTab = null
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  // 합의된 스펙: 전투 진행 중에는 전투 조작 공간 확보를 위해 자동 숨김
  if (sceneType === 'combat') {
    return null;
  }

  const triggerHaptic = () => {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(12);
      } catch {
        // Haptic not supported or blocked
      }
    }
  };

  const navItems = [
    {
      id: 'character',
      label: '상태',
      icon: User,
      color: 'text-sky-400 group-hover:text-sky-300',
      activeBg: 'bg-sky-500/15 border-sky-500/40 text-sky-300',
      action: () => {
        triggerHaptic();
        onOpenCharacter();
      }
    },
    {
      id: 'inventory',
      label: '가방',
      icon: Backpack,
      color: 'text-amber-400 group-hover:text-amber-300',
      activeBg: 'bg-amber-500/15 border-amber-500/40 text-amber-300',
      action: () => {
        triggerHaptic();
        onOpenInventory();
      }
    },
    {
      id: 'base',
      label: '기지',
      icon: Home,
      color: 'text-indigo-400 group-hover:text-indigo-300',
      activeBg: 'bg-indigo-500/15 border-indigo-500/40 text-indigo-300',
      action: () => {
        triggerHaptic();
        onOpenBase();
      }
    },
    {
      id: 'companion',
      label: '동료',
      icon: Users,
      color: 'text-violet-400 group-hover:text-violet-300',
      activeBg: 'bg-violet-500/15 border-violet-500/40 text-violet-300',
      action: () => {
        triggerHaptic();
        onOpenCompanion();
      }
    },
    {
      id: 'hunt',
      label: '사냥',
      icon: Swords,
      color: 'text-rose-400 group-hover:text-rose-300',
      activeBg: 'bg-rose-500/20 border-rose-500/50 text-rose-300',
      isProminent: true,
      action: () => {
        triggerHaptic();
        onOpenHunt();
      }
    },
    {
      id: 'map',
      label: '지도',
      icon: Compass,
      color: 'text-teal-400 group-hover:text-teal-300',
      activeBg: 'bg-teal-500/15 border-teal-500/40 text-teal-300',
      action: () => {
        triggerHaptic();
        onOpenMap();
      }
    },
    {
      id: 'save',
      label: '저장',
      icon: Save,
      color: 'text-amber-400 group-hover:text-amber-300',
      activeBg: 'bg-amber-500/15 border-amber-500/40 text-amber-300',
      action: () => {
        triggerHaptic();
        if (onSave) onSave();
      }
    }
  ];

  return (
    <nav
      className={`md:hidden fixed bottom-0 left-0 right-0 z-[95] backdrop-blur-xl bg-slate-950/95 border-t border-slate-800/80 shadow-[0_-4px_25px_rgba(0,0,0,0.7)] px-1 pt-1 transition-transform duration-300 ease-in-out select-none ${
        isCollapsed ? 'translate-y-full' : 'translate-y-0'
      }`}
      style={{ paddingBottom: isCollapsed ? '0px' : 'max(env(safe-area-inset-bottom, 0px), 6px)' }}
      aria-label="모바일 하단 내비게이션 바"
    >
      {/* 상단 접기/펼치기 토글 핸들 탭 */}
      <button
        type="button"
        onClick={() => {
          triggerHaptic();
          setIsCollapsed(!isCollapsed);
        }}
        className="absolute -top-6 left-1/2 -translate-x-1/2 h-6 px-3 bg-slate-950/95 border border-slate-700/80 border-b-0 rounded-t-lg flex items-center justify-center gap-1 text-[11px] font-bold text-slate-300 hover:text-white shadow-[-2px_-4px_12px_rgba(0,0,0,0.6)] cursor-pointer select-none active:scale-95 transition-all z-10"
        aria-label={isCollapsed ? '메뉴 열기' : '메뉴 접기'}
      >
        {isCollapsed ? (
          <>
            <ChevronUp size={13} className="text-amber-400" />
            <span className="text-amber-300">메뉴 열기</span>
          </>
        ) : (
          <>
            <ChevronDown size={13} className="text-slate-400" />
            <span>접기</span>
          </>
        )}
      </button>

      <div className="flex items-center justify-between w-full max-w-md mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          if (item.isProminent) {
            return (
              <button
                key={item.id}
                onClick={item.action}
                className="group relative -top-3 flex flex-col items-center justify-center px-0.5 active:scale-90 transition-all select-none shrink-0"
                aria-label={item.label}
              >
                <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-rose-600 via-red-500 to-amber-500 p-0.5 shadow-[0_0_16px_rgba(244,63,94,0.45)] border border-rose-400/50 flex items-center justify-center animate-pulse">
                  <div className="w-full h-full bg-slate-950/70 rounded-[10px] flex items-center justify-center">
                    <Icon size={19} className="text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]" />
                  </div>
                </div>
                <span className="text-[9px] font-black text-rose-300 mt-0.5 drop-shadow-md">
                  {item.label}
                </span>
              </button>
            );
          }

          return (
            <button
              key={item.id}
              onClick={item.action}
              className={`group flex-1 flex flex-col items-center justify-center py-0.5 px-0.5 rounded-lg transition-all active:scale-90 select-none min-w-0 ${
                isActive
                  ? item.activeBg + ' border shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              aria-label={item.label}
            >
              <div className="p-0.5 rounded-md">
                <Icon size={17} className={isActive ? 'scale-110 transition-transform' : item.color} />
              </div>
              <span className={`text-[9px] font-bold tracking-tight truncate ${isActive ? 'font-black' : 'text-slate-400'}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
