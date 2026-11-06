import React, { useState, useEffect } from 'react';
import { ClassTier } from '../types';
import { SHINRYOKU_AFFINITY } from '../constants';
import { generateClassSuggestion, generateClassDescriptionOnly, generateClassNameOnlySuggestion } from '../services/geminiService';
import { Sparkles, Crown, Flame, Zap, Snowflake, Mountain, Eclipse, Sword, Activity, Droplets, Wind, Hammer, Sun, Moon, Leaf, Loader2, Brain, Sparkle, X, Stars } from 'lucide-react';
import ActionResultModal, { ResultData } from './ActionResultModal';

interface Props {
  tier: ClassTier;
  initialName?: string;
  initialDesc?: string;
  onClose?: () => void;
  onSubmit: (name: string, description: string, shinryokuType?: string) => void;
}

const SHINRYOKU_TYPES = [
  { id: '화염계', name: '화염계', icon: Flame, desc: '모든 것을 태우는 불꽃' },
  { id: '광휘계', name: '광휘계', icon: Sparkles, desc: '어둠을 밝히는 성스러운 빛' },
  { id: '전격계', name: '전격계', icon: Zap, desc: '파괴적인 뇌전' },
  { id: '빙결계', name: '빙결계', icon: Snowflake, desc: '절대영도의 한기' },
  { id: '대지계', name: '대지계', icon: Mountain, desc: '흔들리지 않는 대지' },
  { id: '암흑계', name: '암흑계', icon: Eclipse, desc: '깊은 심연의 어둠' },
  { id: '무기강화계', name: '무기강화계', icon: Sword, desc: '무기에 신력을 집중' },
  { id: '신체강화계', name: '신체강화계', icon: Activity, desc: '신체 능력의 한계 돌파' },
  { id: '해수계', name: '해수계', icon: Droplets, desc: '바다와 물의 힘' },
  { id: '질풍계', name: '질풍계', icon: Wind, desc: '몰아치는 바람의 힘' },
  { id: '강철계', name: '강철계', icon: Hammer, desc: '무엇보다 단단한 강철' },
  { id: '태양계', name: '태양계', icon: Sun, desc: '태양의 뜨거운 힘' },
  { id: '월광계', name: '월광계', icon: Moon, desc: '은은한 달의 기운' },
  { id: '초화계', name: '초화계', icon: Leaf, desc: '생명을 피워내는 자연의 힘' },
];

const ClassEvolutionModal: React.FC<Props> = ({ tier, initialName = '', initialDesc = '', onClose, onSubmit }) => {
  const [name, setName] = useState(initialName);
  const [desc, setDesc] = useState(initialDesc);
  const [selectedType, setSelectedType] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDescLoading, setIsDescLoading] = useState(false);
  const [isNameLoading, setIsNameLoading] = useState(false);
  const [actionResult, setActionResult] = useState<ResultData | null>(null);

  useEffect(() => {
    if (initialName) setName(initialName);
    if (initialDesc) setDesc(initialDesc);
  }, [initialName, initialDesc]);

  const isFirstClass = tier === ClassTier.FIRST;

  const handleAiSuggestion = async () => {
      if (isFirstClass && !selectedType) {
          setActionResult({
              type: 'warning',
              title: '신력 계통 미선택',
              message: '먼저 신력 계통을 선택해주세요.'
          });
          return;
      }
      
      setIsGenerating(true);
      const typeToUse = selectedType || "기존 계통";
      const result = await generateClassSuggestion(typeToUse);
      if (result) {
          setName(result.name);
          setDesc(result.description);
      }
      setIsGenerating(false);
  };

  const handleNameSuggestion = async () => {
      if (!desc.trim()) {
          setActionResult({
              type: 'warning',
              title: '입력 필요',
              message: '먼저 능력 묘사를 입력해주세요.'
          });
          return;
      }
      if (isFirstClass && !selectedType) {
          setActionResult({
              type: 'warning',
              title: '신력 계통 미선택',
              message: '먼저 신력 계통을 선택해주세요.'
          });
          return;
      }

      setIsNameLoading(true);
      const typeToUse = selectedType || "기존 계통";
      try {
          const suggestedName = await generateClassNameOnlySuggestion(desc, tier, typeToUse);
          setName(suggestedName);
      } catch (e) {
          setActionResult({
              type: 'failure',
              title: '추천 오류',
              message: '이름을 추천받는 중에 오류가 발생했습니다.'
          });
      } finally {
          setIsNameLoading(false);
      }
  };

  const handleDescSuggestion = async () => {
      if (!name.trim()) {
          setActionResult({
              type: 'warning',
              title: '입력 필요',
              message: '먼저 새로운 클래스 이름을 입력해주세요.'
          });
          return;
      }
      if (isFirstClass && !selectedType) {
          setActionResult({
              type: 'warning',
              title: '신력 계통 미선택',
              message: '먼저 신력 계통을 선택해주세요.'
          });
          return;
      }

      setIsDescLoading(true);
      const typeToUse = selectedType || "기존 계통";
      try {
          const suggestedDesc = await generateClassDescriptionOnly(name, tier, typeToUse);
          setDesc(suggestedDesc);
      } catch (e) {
          setActionResult({
              type: 'failure',
              title: '추천 오류',
              message: '설명을 추천받는 중에 오류가 발생했습니다.'
          });
      } finally {
          setIsDescLoading(false);
      }
  };

  const getThemeVars = () => {
    switch (tier) {
      case ClassTier.FIRST:
        return {
          wrapper: "border-emerald-500/50 shadow-[0_0_30px_rgba(16,185,129,0.2)]",
          bgOverlay: "from-emerald-900/20 to-teal-900/10",
          iconColor: "text-emerald-400",
          title: "text-emerald-100",
          subtitle: "text-emerald-400 border-emerald-500/30 bg-emerald-950/50",
          btnBg: "from-emerald-700 to-teal-600 hover:from-emerald-600 hover:to-teal-500",
          glow: "bg-emerald-500/10",
          inputFocus: "focus:border-emerald-500",
          label: "text-emerald-300/80"
        };
      case ClassTier.SECOND:
        return {
          wrapper: "border-blue-500/60 shadow-[0_0_40px_rgba(59,130,246,0.3)]",
          bgOverlay: "from-blue-900/30 to-indigo-900/20",
          iconColor: "text-blue-400",
          title: "text-blue-100",
          subtitle: "text-blue-400 border-blue-500/30 bg-blue-950/50",
          btnBg: "from-blue-700 to-indigo-600 hover:from-blue-600 hover:to-indigo-500",
          glow: "bg-blue-500/10",
          inputFocus: "focus:border-blue-500",
          label: "text-blue-300/80"
        };
      case ClassTier.LAST:
        return {
          wrapper: "border-rose-500/80 shadow-[0_0_50px_rgba(244,63,94,0.4)]",
          bgOverlay: "from-rose-900/40 to-red-900/20",
          iconColor: "text-rose-400",
          title: "text-rose-100",
          subtitle: "text-rose-400 border-rose-500/30 bg-rose-950/50",
          btnBg: "from-rose-700 to-red-600 hover:from-rose-600 hover:to-red-500",
          glow: "bg-rose-500/15",
          inputFocus: "focus:border-rose-500",
          label: "text-rose-300/80"
        };
      case ClassTier.FINAL:
        return {
          wrapper: "border-amber-400 shadow-[0_0_80px_rgba(245,158,11,0.6)] ring-1 ring-fuchsia-500/30",
          bgOverlay: "from-purple-900/60 via-fuchsia-900/20 to-amber-900/40",
          iconColor: "text-amber-400",
          title: "text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-fuchsia-200 to-amber-200 animate-pulse",
          subtitle: "text-amber-400 border-amber-400/50 bg-amber-950/50 shadow-[0_0_15px_rgba(245,158,11,0.3)]",
          btnBg: "from-amber-600 via-fuchsia-600 to-purple-600 hover:from-amber-500 hover:via-fuchsia-500 hover:to-purple-500 bg-[length:200%_auto] animate-gradient",
          glow: "bg-fuchsia-500/20",
          inputFocus: "focus:border-amber-400 focus:ring-1 focus:ring-amber-400",
          label: "text-amber-300/80"
        };
      default:
        return {
          wrapper: "border-slate-500/50 shadow-lg",
          bgOverlay: "from-slate-900/20 to-transparent",
          iconColor: "text-slate-400",
          title: "text-slate-100",
          subtitle: "text-slate-400 border-slate-500/30 bg-slate-950/50",
          btnBg: "from-slate-700 to-slate-600 hover:from-slate-600 hover:to-slate-500",
          glow: "bg-transparent",
          inputFocus: "focus:border-slate-500",
          label: "text-slate-400"
        };
    }
  };

  const theme = getThemeVars();

  return (
    <div className="fixed inset-0 z-[250] flex items-start sm:items-center justify-center bg-black/95 backdrop-blur-md p-2 sm:p-4 animate-in fade-in duration-300 overflow-y-auto py-2 sm:py-6">
      {actionResult && (
        <ActionResultModal 
          data={actionResult} 
          onClose={() => setActionResult(null)} 
        />
      )}

      <div className={`w-full max-w-2xl bg-slate-900 border ${theme.wrapper} rounded-2xl p-2.5 sm:p-6 md:p-8 text-center relative overflow-hidden sm:my-auto max-h-[96vh] sm:max-h-[92vh] flex flex-col transition-all duration-700 ease-out shrink-0`}>
        
        {/* Animated Background */}
        <div className={`absolute inset-0 bg-gradient-to-br ${theme.bgOverlay} pointer-events-none transition-all duration-700`}></div>
        {tier === ClassTier.FINAL && (
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-20 pointer-events-none animate-pulse"></div>
        )}

        {/* Inner Glow */}
        <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full blur-[100px] ${theme.glow} pointer-events-none transition-colors duration-700`}></div>

        {onClose && (
          <button 
            type="button"
            onClick={onClose}
            className="absolute top-2.5 right-2.5 sm:top-4 sm:right-4 z-20 text-slate-400 hover:text-white p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 transition-colors"
          >
            <X size={18} className="sm:w-[20px] sm:h-[20px]" />
          </button>
        )}

        <div className="relative z-10 flex flex-col flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar pr-1 pt-0.5 sm:pt-1">
            {tier === ClassTier.FINAL ? (
                <Stars size={30} className={`mx-auto ${theme.iconColor} mb-1 sm:mb-3 animate-spin-slow sm:w-[48px] sm:h-[48px]`} />
            ) : (
                <Crown size={28} className={`mx-auto ${theme.iconColor} mb-1 sm:mb-2 animate-bounce sm:w-[40px] sm:h-[40px]`} />
            )}
            
            <h2 className={`text-base sm:text-2xl md:text-3xl font-black ${theme.title} mb-1 sm:mb-2 tracking-wide transition-colors duration-700`}>클래스 해방 및 각성</h2>
            <div className="flex justify-center mb-2 sm:mb-4">
                <span className={`px-2.5 py-0.5 sm:px-4 sm:py-1 rounded-full text-[10px] sm:text-sm font-bold tracking-widest uppercase border ${theme.subtitle} transition-all duration-700`}>
                {tier} 해방
                </span>
            </div>

            {isFirstClass && (
            <div className="mb-2.5 sm:mb-5 bg-slate-950/70 p-2 sm:p-4 rounded-xl border border-emerald-900/50 text-left relative overflow-hidden shrink-0">
                <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500"></div>
                <h3 className="text-emerald-200 font-bold mb-1 sm:mb-1.5 flex items-center justify-center text-xs sm:text-base">
                    <Sparkles size={14} className="mr-1.5 text-emerald-400 sm:w-[16px] sm:h-[16px]"/> 신력 계통 각성
                </h3>
                <p className="text-[10px] sm:text-xs text-slate-400 mb-2 sm:mb-3 text-center leading-tight">
                    잠재된 힘을 깨울 시간입니다. 근원이 될 신력을 선택하십시오.
                </p>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-1.5 sm:gap-2 max-h-48 sm:max-h-56 overflow-y-auto p-1 custom-scrollbar">
                        {SHINRYOKU_TYPES.map((type) => {
                            const Icon = type.icon;
                            const isSelected = selectedType === type.id;
                            const affinity = SHINRYOKU_AFFINITY[type.id];
                            
                            return (
                                <button
                                    key={type.id}
                                    type="button"
                                    onClick={() => setSelectedType(type.id)}
                                    className={`relative group flex flex-col items-center justify-center p-1.5 sm:p-2.5 rounded-lg border transition-all duration-200 min-h-[50px] sm:min-h-[68px] ${
                                        isSelected 
                                        ? 'bg-emerald-900/50 border-emerald-400 text-emerald-200 shadow-[0_0_15px_rgba(16,185,129,0.3)] scale-[1.02] z-10' 
                                        : 'bg-slate-900/80 border-slate-700 text-slate-400 hover:bg-slate-800 hover:border-slate-500'
                                    }`}
                                >
                                    <Icon size={14} className="mb-0.5 sm:mb-1.5 sm:w-[18px] sm:h-[18px]" />
                                    <span className="text-[9px] sm:text-[11px] font-bold whitespace-nowrap">{type.name}</span>
                                    
                                    <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-44 bg-black/95 text-slate-200 text-[10px] p-2 rounded-lg border border-slate-700 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-xl hidden sm:block">
                                        <div className="font-bold text-emerald-400 border-b border-slate-700 pb-1 mb-1">{type.name}</div>
                                        <div className="text-left space-y-0.5">
                                            <div className="flex">
                                                <span className="text-green-400 w-8 shrink-0">우세:</span>
                                                <span className="text-slate-300">{affinity?.strong.join(', ') || '-'}</span>
                                            </div>
                                            <div className="flex">
                                                <span className="text-red-400 w-8 shrink-0">열세:</span>
                                                <span className="text-slate-300">{affinity?.weak.join(', ') || '-'}</span>
                                            </div>
                                        </div>
                                    </div>
                                </button>
                            );
                        })}
                </div>
            </div>
            )}
            
            <div className="space-y-2.5 sm:space-y-4 text-left relative z-10 shrink-0">
                <div className="flex flex-col sm:flex-row sm:justify-end gap-1.5 sm:gap-2">
                    <button 
                        type="button" 
                        onClick={handleAiSuggestion} 
                        disabled={isGenerating || (isFirstClass && !selectedType)}
                        className="text-[11px] flex items-center justify-center bg-indigo-900/50 hover:bg-indigo-800 text-indigo-200 px-3 py-1.5 sm:px-4 sm:py-1.5 rounded-lg border border-indigo-500/50 transition-colors disabled:opacity-50 min-h-[32px] sm:min-h-[36px]"
                    >
                        {isGenerating ? <Loader2 size={12} className="animate-spin mr-1"/> : <Brain size={12} className="mr-1"/>}
                        이름 및 설명 추천
                    </button>
                </div>
                
                <div className="bg-black/20 p-2.5 sm:p-3 rounded-xl border border-white/5">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-1.5 sm:mb-2 gap-1 sm:gap-2">
                        <label className={`text-[11px] sm:text-xs font-bold ${theme.label} flex items-center`}>
                            <Crown size={12} className="mr-1 opacity-70" /> 새로운 클래스 이름
                        </label>
                        <button 
                            type="button" 
                            onClick={handleNameSuggestion}
                            disabled={isNameLoading || !desc.trim() || (isFirstClass && !selectedType)}
                            className="text-[10px] w-full sm:w-auto justify-center flex items-center bg-white/5 hover:bg-white/10 text-white/70 px-2 sm:px-2.5 py-1 sm:py-1.5 rounded border border-white/10 transition-colors disabled:opacity-30"
                        >
                            {isNameLoading ? <Loader2 size={10} className="animate-spin mr-1"/> : <Sparkles size={10} className="mr-1"/>}
                            설명 기반 추천
                        </button>
                    </div>
                    <input 
                        type="text" 
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder={isFirstClass ? "예: 화염 검사" : "클래스 이름 입력"}
                        className={`w-full bg-slate-950/80 border border-slate-700/50 rounded-lg p-2.5 sm:p-3 text-white ${theme.inputFocus} outline-none transition-all font-bold text-xs sm:text-sm`}
                    />
                </div>
            
                <div className="bg-black/20 p-2.5 sm:p-3 rounded-xl border border-white/5">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-1.5 sm:mb-2 gap-1 sm:gap-2">
                        <label className={`text-[11px] sm:text-xs font-bold ${theme.label} flex items-center`}>
                            <Sparkle size={12} className="mr-1 opacity-70" /> 능력에 대한 묘사
                        </label>
                        <button 
                            type="button" 
                            onClick={handleDescSuggestion}
                            disabled={isDescLoading || !name.trim() || (isFirstClass && !selectedType)}
                            className="text-[10px] w-full sm:w-auto justify-center flex items-center bg-white/5 hover:bg-white/10 text-white/70 px-2 sm:px-2.5 py-1 sm:py-1.5 rounded border border-white/10 transition-colors disabled:opacity-30"
                        >
                            {isDescLoading ? <Loader2 size={10} className="animate-spin mr-1"/> : <Sparkle size={10} className="mr-1"/>}
                            이름 기반 추천
                        </button>
                    </div>
                    <textarea 
                        value={desc}
                        onChange={(e) => setDesc(e.target.value)}
                        placeholder={isFirstClass ? "예: 불꽃을 검에 휘감아 폭발적인 화염 타격을 입힌다." : "능력 묘사 입력"}
                        className={`w-full bg-slate-950/80 border border-slate-700/50 rounded-lg p-2.5 sm:p-3 text-slate-200 ${theme.inputFocus} outline-none transition-all resize-none h-16 sm:h-20 text-xs sm:text-sm`}
                    />
                </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 mt-3 sm:mt-6 relative z-10 pt-1 sm:pt-2 shrink-0">
            {onClose && (
                <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-1/3 bg-slate-800/80 hover:bg-slate-700 text-slate-300 font-bold py-2.5 sm:py-3 rounded-lg border border-slate-600 transition-all text-xs sm:text-sm"
                >
                나중에
                </button>
            )}
            <button 
                type="button"
                onClick={() => {
                if (name.trim() && desc.trim()) {
                    if (isFirstClass && !selectedType) return;
                    onSubmit(name, desc, selectedType);
                }
                }}
                disabled={!name.trim() || !desc.trim() || (isFirstClass && !selectedType)}
                className={`${onClose ? 'w-full sm:w-2/3' : 'w-full'} bg-gradient-to-r ${theme.btnBg} text-white font-bold py-2.5 sm:py-3 rounded-lg shadow-lg flex items-center justify-center space-x-2 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.02] active:scale-95 text-xs sm:text-base border border-white/10`}
            >
                {tier === ClassTier.FINAL ? <Stars size={16} className="animate-spin-slow sm:w-[18px] sm:h-[18px]" /> : <Sparkles size={16} className="sm:w-[18px] sm:h-[18px]" />}
                <span>각성 완료</span>
            </button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default ClassEvolutionModal;
