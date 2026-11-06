
import React, { useState } from 'react';
import { Character, Companion, WeaponType, WeaponCategory } from '../types';
import { X, Sword, Target, Zap, Info, Shield, Tag, Sparkles, BookOpen } from 'lucide-react';
import { WEAPON_MASTERY_CONFIG, WEAPON_MASTERY_MAX_LEVEL, WEAPON_KEYWORDS } from '../constants';

interface Props {
  character: Character | Companion;
  onClose: () => void;
}

const WEAPON_TYPE_LABELS: Record<WeaponType, string> = {
    'Sword': '검',
    'Spear': '창 / 폴암',
    'Blunt': '둔기',
    'Axe': '도끼',
    'Knuckle': '너클',
    'Bow': '활',
    'Crossbow': '석궁',
    'Thrown': '투척무기',
    'Firearm': '총기',
    'Heavy': '중화기',
    'Staff': '지팡이',
    'Energy': '에너지무기',
    'Grimoire': '마법서',
    'Shield': '방패',
    'Orb': '보주',
    'SubSword': '보조검',
};

const STAT_LABELS: Record<string, string> = {
    'STR': '근력',
    'AGI': '민첩',
    'INT/WIS': '지능 / 지혜',
    'VARIES': '장비 종류별 상이',
};

const WeaponMasteryModal: React.FC<Props> = ({ character, onClose }) => {
  const [activeCategory, setActiveCategory] = useState<WeaponCategory>('Melee');

  const categories: { id: WeaponCategory, label: string, icon: any }[] = [
      { id: 'Melee', label: '근접 무기', icon: Sword },
      { id: 'Ranged', label: '원거리 무기', icon: Target },
      { id: 'Magic', label: '마법 무기', icon: Zap },
      { id: 'Sub', label: '보조 무기', icon: Shield },
  ];

  const getMastery = (type: WeaponType) => {
      return character.weaponMastery?.[type] || { level: 0, currentExp: 0 };
  };

  const getProgress = (level: number, currentExp: number) => {
      if (level >= WEAPON_MASTERY_MAX_LEVEL) return 100;
      const required = (level + 4) * 10;
      return Math.min(100, (currentExp / required) * 100);
  };

  const renderWeaponCard = (type: WeaponType, idx?: number) => {
      const mastery = getMastery(type);
      const progress = getProgress(mastery.level, mastery.currentExp);
      const nextExp = (mastery.level + 4) * 10;
      
      const config = WEAPON_MASTERY_CONFIG[activeCategory];
      const isMagic = activeCategory === 'Magic';
      const isSub = activeCategory === 'Sub';
      const keywords = WEAPON_KEYWORDS[type] || [];

      // Stats Description Logic
      const accBonus = Math.min(100, mastery.level * 1);
      let statDesc = <></>;
      if (isSub) {
          if (type === 'Shield') {
              statDesc = (
                  <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="flex justify-between items-center bg-slate-900/60 p-2 rounded border border-slate-800"><span className="text-slate-300 font-medium">물리 방어력</span><span className="text-slate-100 font-bold font-mono">+{(mastery.level * 0.5).toFixed(1)}%</span></div>
                      <div className="flex justify-between items-center bg-slate-900/60 p-2 rounded border border-slate-800"><span className="text-blue-300 font-medium">마법 방어력</span><span className="text-slate-100 font-bold font-mono">+{(mastery.level * 0.5).toFixed(1)}%</span></div>
                      <div className="flex justify-between items-center bg-slate-900/60 p-2 rounded border border-slate-800 col-span-2"><span className="text-emerald-400 font-medium">물리 / 마법 명중률</span><span className="text-emerald-200 font-bold font-mono">+{accBonus}%</span></div>
                  </div>
              );
          } else if (type === 'Orb') {
              statDesc = (
                  <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="flex justify-between items-center bg-slate-900/60 p-2 rounded border border-slate-800"><span className="text-blue-300 font-medium">마법 방어력</span><span className="text-slate-100 font-bold font-mono">+{(mastery.level * 0.5).toFixed(1)}%</span></div>
                      <div className="flex justify-between items-center bg-slate-900/60 p-2 rounded border border-slate-800"><span className="text-yellow-400 font-medium">치명타 확률</span><span className="text-yellow-200 font-bold font-mono">+{(mastery.level * 0.1).toFixed(1)}%</span></div>
                      <div className="flex justify-between items-center bg-slate-900/60 p-2 rounded border border-slate-800 col-span-2"><span className="text-cyan-400 font-medium">마법 명중률</span><span className="text-cyan-200 font-bold font-mono">+{accBonus}%</span></div>
                  </div>
              );
          } else if (type === 'SubSword') {
              statDesc = (
                  <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="flex justify-between items-center bg-slate-900/60 p-2 rounded border border-slate-800"><span className="text-red-400 font-medium">물리 공격력</span><span className="text-slate-100 font-bold font-mono">+{(mastery.level * 0.5).toFixed(1)}%</span></div>
                      <div className="flex justify-between items-center bg-slate-900/60 p-2 rounded border border-slate-800"><span className="text-yellow-400 font-medium">치명타 확률</span><span className="text-yellow-200 font-bold font-mono">+{(mastery.level * 0.1).toFixed(1)}%</span></div>
                      <div className="flex justify-between items-center bg-slate-900/60 p-2 rounded border border-slate-800 col-span-2"><span className="text-emerald-400 font-medium">물리 명중률</span><span className="text-emerald-200 font-bold font-mono">+{accBonus}%</span></div>
                  </div>
              );
          }
      } else {
          // Standard Weapon Types
          const atkBonus = (mastery.level * 0.5).toFixed(1);
          const critBonus = (mastery.level * 0.1).toFixed(1);
          statDesc = (
              <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex justify-between items-center bg-slate-900/60 p-2 rounded border border-slate-800">
                      <span className={isMagic ? "text-purple-400 font-medium" : "text-red-400 font-medium"}>{isMagic ? "마법 공격력" : "물리 공격력"}</span>
                      <span className="text-slate-100 font-bold font-mono">+{atkBonus}%</span>
                  </div>
                  <div className="flex justify-between items-center bg-slate-900/60 p-2 rounded border border-slate-800">
                      <span className="text-yellow-400 font-medium">치명타 확률</span>
                      <span className="text-yellow-200 font-bold font-mono">+{critBonus}%</span>
                  </div>
                  <div className="flex justify-between items-center bg-slate-900/60 p-2 rounded border border-slate-800 col-span-2">
                      <span className={isMagic ? "text-cyan-400 font-medium" : "text-emerald-400 font-medium"}>{isMagic ? "마법 명중률" : "물리 명중률"}</span>
                      <span className="text-slate-100 font-bold font-mono">+{accBonus}%</span>
                  </div>
              </div>
          );
      }

      const statLabel = STAT_LABELS[config.stat] || config.stat;

      return (
          <div key={`weapon-card-${type}-${idx ?? 0}`} className="bg-slate-900/90 p-4 rounded-xl border border-slate-800 shadow-lg hover:border-amber-500/40 transition-all flex flex-col h-full group">
              <div className="flex justify-between items-start mb-3 pb-2.5 border-b border-slate-800/80">
                  <div>
                      <h4 className="text-slate-100 font-bold text-base sm:text-lg flex items-center gap-1.5">
                          {WEAPON_TYPE_LABELS[type]}
                      </h4>
                      <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                          <span className="text-slate-500">주요 스탯:</span>
                          <span className="text-amber-400 font-bold">{statLabel}</span>
                      </div>
                  </div>
                  <div className="flex flex-col items-end">
                      <div className="flex items-baseline gap-1">
                          <span className="text-xs text-amber-500 font-bold">레벨</span>
                          <span className="text-xl sm:text-2xl font-black text-amber-400 font-mono">{mastery.level}</span>
                      </div>
                      <span className="text-[10px] text-slate-500">최대 레벨 {WEAPON_MASTERY_MAX_LEVEL}</span>
                  </div>
              </div>

              {/* Progress Bar */}
              <div className="mb-3.5">
                  <div className="flex justify-between text-[11px] mb-1">
                      <span className="text-slate-400">숙련도 경험치</span>
                      <span className="text-amber-300 font-mono font-bold">
                          {mastery.level >= WEAPON_MASTERY_MAX_LEVEL ? '최대 단계 달성' : `${mastery.currentExp} / ${nextExp}`}
                      </span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800 relative shadow-inner">
                      <div 
                        className="h-full bg-gradient-to-r from-amber-600 via-amber-500 to-yellow-400 transition-all duration-500 rounded-full shadow-[0_0_8px_rgba(245,158,11,0.5)]"
                        style={{ width: `${progress}%` }}
                      ></div>
                  </div>
              </div>

              {/* Stats Box */}
              <div className="bg-slate-950/70 p-3 rounded-lg border border-slate-800 mb-3">
                  <div className="text-xs font-bold text-amber-300 mb-2 flex items-center gap-1">
                      <Sparkles size={13} className="text-amber-400" /> 패시브 보너스 효과
                  </div>
                  {statDesc}
              </div>

              {/* Keywords Section */}
              <div className="mt-auto pt-2.5 border-t border-slate-800/60">
                  <div className="text-[10px] text-slate-400 font-bold mb-1 flex items-center gap-1">
                      <Tag size={11} className="text-slate-500"/> 해당 무기 분류
                  </div>
                  <div className="text-[11px] text-slate-300 leading-relaxed bg-slate-950/40 p-2 rounded border border-slate-800/50">
                      {keywords.length > 0 ? keywords.join(', ') : '전용 무기 정보 없음'}
                  </div>
              </div>
          </div>
      );
  };

  return (
    <div className="fixed inset-0 z-[220] flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-4 font-sans animate-in fade-in duration-200">
      <div className="bg-slate-950 w-full max-w-4xl h-[85vh] rounded-2xl border border-slate-800 shadow-2xl flex flex-col relative overflow-hidden">
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 bg-slate-900/90 flex justify-between items-center shrink-0">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-inner">
                    <Sword size={22} />
                </div>
                <div>
                    <h2 className="text-lg sm:text-xl font-bold text-slate-100 flex items-center gap-2">
                        무기 숙련도
                    </h2>
                    <p className="text-xs text-slate-400">{character.name} 캐릭터의 무기별 숙련도 현황 및 패시브 효과입니다.</p>
                </div>
            </div>
            <button 
                onClick={onClose} 
                className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition-colors border border-transparent hover:border-slate-700"
                title="닫기"
            >
                <X size={20} />
            </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-900/40 shrink-0 overflow-x-auto">
            {categories.map((cat, catIdx) => {
                const IconComponent = cat.icon;
                const isActive = activeCategory === cat.id;
                return (
                    <button 
                        key={`cat-${cat.id}-${catIdx}`}
                        onClick={() => setActiveCategory(cat.id)}
                        className={`flex-1 min-w-[110px] py-3.5 px-3 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all border-b-2 ${isActive ? 'text-amber-400 border-amber-500 bg-slate-800/80 shadow-sm' : 'text-slate-400 border-transparent hover:text-slate-200 hover:bg-slate-800/40'}`}
                    >
                        <IconComponent size={16} className={isActive ? 'text-amber-400' : 'text-slate-500'} /> 
                        <span>{cat.label}</span>
                    </button>
                );
            })}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-950 custom-scrollbar">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                {WEAPON_MASTERY_CONFIG[activeCategory].types.map((type, typeIdx) => renderWeaponCard(type, typeIdx))}
            </div>
            
            <div className="mt-6 sm:mt-8 bg-slate-900/70 border border-slate-800 p-4 rounded-xl">
                <h4 className="text-xs sm:text-sm font-bold text-amber-300 mb-2 flex items-center gap-1.5">
                    <BookOpen size={16} className="text-amber-400"/> 숙련도 안내 및 규칙
                </h4>
                <ul className="text-xs text-slate-400 space-y-1.5 list-disc list-inside leading-relaxed">
                    <li>해당 계열의 무기를 장착하고 전투(일반 공격 및 스킬 사용) 시 숙련도 경험치를 획득합니다.</li>
                    <li>숙련도 레벨 상승 시 해당 무기를 장착하는 동안 <strong>공격력 / 방어력 증가(%)</strong>, <strong>치명타 확률</strong> 및 <strong>물리 / 마법 명중률(레벨당 +1%, 최대 +100%)</strong> 패시브 효과가 자동 적용됩니다.</li>
                    <li>숙련도 최고 레벨은 100레벨이며, 다음 레벨업 요구 경험치는 (현재 레벨 + 4) × 10 입니다.</li>
                </ul>
            </div>
        </div>

        {/* Bottom Bar */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-900/90 flex justify-end shrink-0">
            <button
                onClick={onClose}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition-colors"
            >
                확인 및 닫기
            </button>
        </div>

      </div>
    </div>
  );
};

export default WeaponMasteryModal;

