import React, { useState } from 'react';
import { X, Award, TrendingUp, BookOpen, Hammer, Leaf, Pickaxe, FlaskConical, PawPrint, ChefHat, Star, Zap, Target, Shield, Info, ChevronRight, Sparkles } from 'lucide-react';
import { Character } from '../types';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  character: Character;
}

const PROFESSION_DETAILS: Record<string, { description: string, bonuses: string[], icon: any, color: string }> = {
  farming: { 
    description: '작물을 재배하고 수확하는 기술입니다. 대지의 기운을 이해하여 더 풍성한 결실을 맺습니다.', 
    bonuses: [
      '레벨당 수확량 보너스 증가 (Lv.2당 +1)',
      '고등급 작물 수확 확률 증가'
    ],
    icon: Leaf,
    color: 'text-green-400'
  },
  mining: { 
    description: '광석을 채굴하고 정제하는 기술입니다. 암석의 결을 읽어 희귀한 보석과 광물을 찾아냅니다.', 
    bonuses: [
      '레벨당 채굴량 보너스 증가 (2%)',
      '레벨당 희귀 보석 발견 확률 증가 (1%)'
    ],
    icon: Pickaxe,
    color: 'text-blue-400'
  },
  crafting: { 
    description: '장비를 제작하고 강화하는 기술입니다. 금속을 다루는 숙련도가 높아질수록 완벽한 장비를 만들어냅니다.', 
    bonuses: [
      '레벨당 제작 성공률 증가 (1.5%)',
      '레벨당 장비 강화 성공률 증가 (1.5%)',
      '고등급 장비 제작 가능 (숙련도 레벨 제한)'
    ],
    icon: Hammer,
    color: 'text-slate-400'
  },
  alchemy: { 
    description: '신비로운 약물을 제조하고 외형을 변환하는 기술입니다. 물질의 본질을 꿰뚫어 강력한 비약을 만듭니다.', 
    bonuses: [
      '레벨당 연금술 성공률 증가 (2%)',
      '고등급 포션 제조 및 속성 부여 가능',
      '장비 및 외형 변환 숙련도 영향'
    ],
    icon: FlaskConical,
    color: 'text-purple-400'
  },
  research: { 
    description: '스킬의 원리를 탐구하고 한계를 돌파하는 기술입니다. 지식의 깊이가 깊어질수록 스킬의 진정한 위력이 발휘됩니다.', 
    bonuses: [
      '스킬 연마 시 숙련도 획득량 증가',
      '연구 대성공 확률 증가 (숙련도 레벨 비례)',
      '대성공 시 숙련도 획득량 2배 및 즉시 레벨업 가능'
    ],
    icon: BookOpen,
    color: 'text-indigo-400'
  },
  taming: { 
    description: '몬스터를 길들이고 육성하는 기술입니다. 야생의 본능을 잠재우고 강력한 동료로 성장시킵니다.', 
    bonuses: [
      '레벨당 몬스터 포획 확률 증가 (1%)',
      '레벨당 몬스터 훈련 효과 증가 (2%)',
      '레벨 10당 몬스터 수확량 증가 (+1)'
    ],
    icon: PawPrint,
    color: 'text-amber-400'
  },
  cooking: { 
    description: '다양한 식재료로 요리를 만드는 기술입니다. 정성이 담긴 음식은 모험가에게 강력한 힘을 부여합니다.', 
    bonuses: [
      '레벨당 요리 효과 증가 (5%)',
      '숙련도 레벨에 따른 고급 레시피 해금',
      '고급 요리 도구 사용 가능 여부 영향'
    ],
    icon: ChefHat,
    color: 'text-orange-400'
  },
};

const getRankLabel = (level: number, id: string): { label: string, color: string } => {
    if (id === 'cooking') {
        if (level >= 100) return { label: '전설 요리사', color: 'text-amber-500' };
        if (level >= 80) return { label: '명인 요리사', color: 'text-amber-400' };
        if (level >= 60) return { label: '장인 요리사', color: 'text-orange-500' };
        if (level >= 40) return { label: '숙련 요리사', color: 'text-red-500' };
        if (level >= 20) return { label: '일반 요리사', color: 'text-blue-500' };
        return { label: '견습 요리사', color: 'text-slate-400' };
    }
    if (id === 'farming') {
        if (level >= 100) return { label: '전설 농부', color: 'text-amber-400' };
        if (level >= 80) return { label: '명인 농부', color: 'text-orange-400' };
        if (level >= 50) return { label: '장인 농부', color: 'text-red-400' };
        if (level >= 20) return { label: '숙련 농부', color: 'text-green-400' };
        if (level >= 10) return { label: '일반 농부', color: 'text-blue-400' };
        return { label: '견습 농부', color: 'text-slate-400' };
    }
    if (id === 'alchemy') {
        if (level >= 100) return { label: '대현자', color: 'text-purple-400' };
        if (level >= 80) return { label: '최상급 연금술사', color: 'text-indigo-400' };
        if (level >= 50) return { label: '상급 연금술사', color: 'text-blue-400' };
        if (level >= 20) return { label: '중급 연금술사', color: 'text-green-400' };
        return { label: '초급 연금술사', color: 'text-slate-400' };
    }
    if (id === 'crafting') {
        if (level >= 100) return { label: '명공 대장장이', color: 'text-amber-400' };
        if (level >= 80) return { label: '최상급 대장장이', color: 'text-orange-400' };
        if (level >= 50) return { label: '상급 대장장이', color: 'text-red-400' };
        if (level >= 20) return { label: '중급 대장장이', color: 'text-blue-400' };
        return { label: '초급 대장장이', color: 'text-slate-400' };
    }
    
    if (level >= 100) return { label: '그랜드 마스터', color: 'text-amber-400' };
    if (level >= 80) return { label: '마스터', color: 'text-orange-400' };
    if (level >= 50) return { label: '전문가', color: 'text-blue-400' };
    if (level >= 20) return { label: '숙련자', color: 'text-green-400' };
    return { label: '입문자', color: 'text-slate-400' };
};

const ProfessionMasteryModalComponent: React.FC<Props> = ({ isOpen, onClose, character }) => {
  const [selectedProf, setSelectedProf] = useState<string>('farming');
  
  if (!isOpen) return null;

  const professions = character.professions || {};
  const professionList = [
    { id: 'farming', name: '농사' },
    { id: 'mining', name: '채굴' },
    { id: 'crafting', name: '제작' },
    { id: 'alchemy', name: '연금술' },
    { id: 'research', name: '연구' },
    { id: 'taming', name: '테이밍' },
    { id: 'cooking', name: '요리' },
  ];

  const selectedData = (professions[selectedProf as keyof typeof professions] as any) || { level: 1, exp: 0, maxExp: 1000 };
  const detail = PROFESSION_DETAILS[selectedProf];
  const rank = getRankLabel(selectedData.level, selectedProf);

  return (
    <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-[150] p-4 backdrop-blur-md">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-slate-950 border border-slate-800 rounded-3xl w-full max-w-5xl h-[90vh] md:h-[85vh] max-h-[800px] shadow-[0_0_50px_rgba(0,0,0,0.5)] flex flex-col md:flex-row overflow-hidden relative"
      >
        {/* Background Decorative Elements */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-indigo-500 to-transparent opacity-50" />
        <div className="absolute -top-24 -left-24 w-64 h-64 bg-indigo-600/10 blur-[100px] rounded-full" />
        <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-amber-600/10 blur-[100px] rounded-full" />

        {/* Sidebar - Profession List */}
        <div className="w-full md:w-64 lg:w-80 border-b md:border-b-0 md:border-r border-slate-800 flex flex-col bg-slate-950/50 backdrop-blur-sm shrink-0">
          <div className="p-4 md:p-6 border-b border-slate-800/50 flex justify-between items-center md:block">
            <div>
              <h2 className="text-lg md:text-xl font-black text-white flex items-center gap-3 tracking-tighter">
                <div className="p-1.5 md:p-2 bg-indigo-500/20 rounded-lg border border-indigo-500/30">
                  <Award className="text-indigo-400" size={18} />
                </div>
                전문기술
              </h2>
              <p className="hidden md:block text-[10px] text-slate-500 mt-1 font-mono uppercase tracking-widest">Mastery & Specialization</p>
            </div>
            <button onClick={onClose} className="md:hidden text-slate-400 p-2"><X size={20} /></button>
          </div>

          <div className="flex-1 overflow-x-auto md:overflow-y-auto p-2 md:p-3 flex md:flex-col gap-2 custom-scrollbar">
            {professionList.map((prof) => {
              const data = (professions[prof.id as keyof typeof professions] as any) || { level: 1, exp: 0 };
              const profDetail = PROFESSION_DETAILS[prof.id];
              const Icon = profDetail.icon;
              const isActive = selectedProf === prof.id;
              const profRank = getRankLabel(data.level, prof.id);

              return (
                <button 
                  key={prof.id} 
                  onClick={() => setSelectedProf(prof.id)}
                  className={`shrink-0 md:w-full group relative p-3 md:p-4 rounded-xl md:rounded-2xl transition-all duration-300 flex items-center gap-3 md:gap-4 overflow-hidden ${
                    isActive 
                    ? 'bg-indigo-500/10 border border-indigo-500/50 shadow-[0_0_20px_rgba(99,102,241,0.1)]' 
                    : 'hover:bg-slate-900/50 border border-transparent hover:border-slate-800'
                  }`}
                >
                  {isActive && (
                    <motion.div 
                      layoutId="active-pill"
                      className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500 hidden md:block"
                    />
                  )}
                  
                  <div className={`p-2 rounded-lg md:rounded-xl transition-colors duration-300 ${isActive ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'bg-slate-900 text-slate-500 group-hover:text-slate-300'}`}>
                    <Icon size={18} />
                  </div>

                  <div className="text-left flex-1 min-w-[80px] md:min-w-0">
                    <div className={`font-bold text-xs md:text-sm transition-colors ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'}`}>{prof.name}</div>
                    <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-amber-500 font-mono text-[9px] md:text-[10px] font-bold">Lv.{data.level}</span>
                        <span className={`hidden md:inline text-[9px] font-medium truncate ${profRank.color}`}>{profRank.label}</span>
                    </div>
                  </div>

                  <ChevronRight size={14} className={`hidden md:block transition-transform duration-300 ${isActive ? 'text-indigo-400 translate-x-0' : 'text-slate-700 translate-x-2 opacity-0 group-hover:opacity-100 group-hover:translate-x-0'}`} />
                </button>
              );
            })}
          </div>

          <div className="hidden md:block p-4 border-t border-slate-800/50">
            <button 
              onClick={onClose}
              className="w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-sm font-bold transition-all flex items-center justify-center gap-2 border border-slate-800"
            >
              <X size={18} /> 닫기
            </button>
          </div>
        </div>
        
        {/* Main Content - Detail View */}
        <div className="flex-1 flex flex-col bg-slate-950 overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div 
              key={selectedProf}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="flex-1 p-8 md:p-12 overflow-y-auto custom-scrollbar"
            >
              {/* Header Section */}
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
                <div className="flex items-center gap-6">
                    <div className={`p-5 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl ${detail.color}`}>
                        <detail.icon size={48} />
                    </div>
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <h3 className="text-4xl font-black text-white tracking-tighter">{professionList.find(p => p.id === selectedProf)?.name}</h3>
                            <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${rank.color} bg-slate-900/50`}>
                                {rank.label}
                            </div>
                        </div>
                        <p className="text-slate-400 text-sm max-w-md leading-relaxed">{detail.description}</p>
                    </div>
                </div>

                <div className="text-right">
                    <div className="text-slate-500 text-[10px] font-mono uppercase tracking-widest mb-1">Current Level</div>
                    <div className="text-6xl font-black text-white tracking-tighter flex items-baseline gap-2">
                        <span className="text-indigo-500 text-2xl">Lv.</span>
                        {selectedData.level}
                    </div>
                </div>
              </div>

              {/* Progress Section */}
              <div className="mb-12">
                <div className="flex justify-between items-end mb-3">
                    <div className="flex items-center gap-2">
                        <TrendingUp size={16} className="text-indigo-400" />
                        <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Experience Progress</span>
                    </div>
                    <div className="text-xs font-mono text-slate-400">
                        <span className="text-white font-bold">{selectedData.exp.toLocaleString()}</span>
                        <span className="mx-1">/</span>
                        {selectedData.maxExp.toLocaleString()}
                    </div>
                </div>
                <div className="h-4 w-full bg-slate-900 rounded-full p-1 border border-slate-800 shadow-inner">
                    <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(100, (selectedData.exp / selectedData.maxExp) * 100)}%` }}
                        transition={{ duration: 1, ease: "easeOut" }}
                        className="h-full bg-gradient-to-r from-indigo-600 to-indigo-400 rounded-full shadow-[0_0_15px_rgba(99,102,241,0.5)] relative overflow-hidden"
                    >
                        <div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(255,255,255,0.1)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.1)_50%,rgba(255,255,255,0.1)_75%,transparent_75%,transparent)] bg-[length:20px_20px] animate-[move-stripe_2s_linear_infinite]" />
                    </motion.div>
                </div>
              </div>

              {/* Bonuses Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                    <h4 className="text-xs font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
                        <Sparkles size={14} className="text-amber-400" /> Mastery Bonuses
                    </h4>
                    <div className="space-y-3">
                        {detail.bonuses.map((bonus, idx) => (
                            <motion.div 
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.1 }}
                                key={idx} 
                                className="flex items-start gap-3 p-4 bg-slate-900/50 rounded-2xl border border-slate-800/50 hover:border-indigo-500/30 transition-colors group"
                            >
                                <div className="mt-1 p-1 bg-indigo-500/10 rounded-md text-indigo-400 group-hover:bg-indigo-500 group-hover:text-white transition-colors">
                                    <Zap size={12} />
                                </div>
                                <span className="text-sm text-slate-300 leading-snug">{bonus}</span>
                            </motion.div>
                        ))}
                    </div>
                </div>

                <div className="space-y-4">
                    <h4 className="text-xs font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
                        <Info size={14} className="text-blue-400" /> System Info
                    </h4>
                    <div className="p-6 bg-indigo-950/20 rounded-3xl border border-indigo-500/20 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <Info size={80} />
                        </div>
                        <p className="text-xs text-indigo-300 leading-relaxed relative z-10">
                            전문 기술 숙련도는 해당 활동을 수행할 때마다 상승합니다. 숙련도가 높아질수록 더 효율적인 작업이 가능해지며, 특정 임계점(Lv.20, 50, 80, 100)에 도달할 때마다 새로운 칭호와 함께 비약적인 보너스를 획득합니다.
                        </p>
                        <div className="mt-4 flex items-center gap-2 relative z-10">
                            <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                            <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Active Specialization</span>
                        </div>
                    </div>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </motion.div>

      <style>{`
        @keyframes move-stripe {
          0% { background-position: 0 0; }
          100% { background-position: 40px 0; }
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #1e293b;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #334155;
        }
      `}</style>
    </div>
  );
};

export const ProfessionMasteryModal = React.memo(ProfessionMasteryModalComponent, (prev, next) => {
  if (!prev.isOpen && !next.isOpen) return true;
  return false;
});
