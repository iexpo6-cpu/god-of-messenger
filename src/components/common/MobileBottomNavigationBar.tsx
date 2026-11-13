import React from 'react';
import { User, Backpack, Swords, BookOpen, Compass, Save } from 'lucide-react';

interface Props {
  sceneType?: string;
  onOpenCharacter: () => void;
  onOpenInventory: () => void;
  onOpenHunt: () => void;
  onOpenSkills: () => void;
  onOpenMap: () => void;
  onSave?: () => void;
  activeTab?: 'character' | 'inventory' | 'hunt' | 'skills' | 'map' | 'save' | null;
}

export const MobileBottomNavigationBar: React.FC<Props> = ({
  sceneType,
  onOpenCharacter,
  onOpenInventory,
  onOpenHunt,
  onOpenSkills,
  onOpenMap,
  onSave,
  activeTab = null
}) => {
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
      id: 'skills',
      label: '스킬북',
      icon: BookOpen,
      color: 'text-emerald-400 group-hover:text-emerald-300',
      activeBg: 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300',
      action: () => {
        triggerHaptic();
        onOpenSkills();
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
      className="md:hidden fixed bottom-0 left-0 right-0 z-[95] backdrop-blur-xl bg-slate-950/92 border-t border-slate-800/80 shadow-[0_-4px_25px_rgba(0,0,0,0.6)] px-2 pt-1.5 pb-2 transition-all duration-300"
      style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 8px)' }}
      aria-label="모바일 하단 내비게이션 바"
    >
      <div className="flex items-center justify-around max-w-md mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          if (item.isProminent) {
            return (
              <button
                key={item.id}
                onClick={item.action}
                className="group relative -top-3.5 flex flex-col items-center justify-center p-1.5 active:scale-90 transition-all select-none"
                aria-label={item.label}
              >
                <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-rose-600 via-red-500 to-amber-500 p-0.5 shadow-[0_0_20px_rgba(244,63,94,0.45)] border border-rose-400/50 flex items-center justify-center animate-pulse">
                  <div className="w-full h-full bg-slate-950/70 rounded-[14px] flex items-center justify-center">
                    <Icon size={22} className="text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.8)]" />
                  </div>
                </div>
                <span className="text-[10px] font-black text-rose-300 mt-1 drop-shadow-md">
                  {item.label}
                </span>
              </button>
            );
          }

          return (
            <button
              key={item.id}
              onClick={item.action}
              className={`group flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all active:scale-90 select-none ${
                isActive
                  ? item.activeBg + ' border shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              aria-label={item.label}
            >
              <div className="p-1 rounded-lg">
                <Icon size={19} className={isActive ? 'scale-110 transition-transform' : item.color} />
              </div>
              <span className={`text-[10px] font-bold tracking-tight ${isActive ? 'font-black' : 'text-slate-400'}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
