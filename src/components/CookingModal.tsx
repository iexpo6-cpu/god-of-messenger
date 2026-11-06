import React, { useState } from 'react';
import { RECIPES, COOKING_TOOLS, getAvailableIngredientCount } from '../recipes';
import { Character, JobType } from '../types';
import { X, Utensils, Lock, Flame, CheckCircle, AlertCircle, Clock, Sparkles, Trash2, ChevronRight } from 'lucide-react';
import { getConstructionRemainingTime, getConstructionProgress } from '../services/baseConstructionService';
import { getRecipeCookingDuration } from '../services/cookingService';

interface CookingModalProps {
    isOpen: boolean;
    onClose: () => void;
    character: Character;
    instanceId?: string;
    onCook: (recipeId: string) => void;
    onClaim?: (jobId: string) => void;
    onCancel?: (jobId: string) => void;
    onBuyTool: (toolId: string) => void;
    onOpenMastery: () => void;
}

export const CookingModal: React.FC<CookingModalProps> = ({
    isOpen,
    onClose,
    character,
    instanceId,
    onCook,
    onClaim,
    onCancel,
    onBuyTool,
    onOpenMastery
}) => {
    const [tab, setTab] = useState<'cook' | 'shop'>('cook');
    
    if (!isOpen) return null;

    const instance = character.base?.layout?.find(inst => inst.id === instanceId);
    const facilityLevel = instance?.level || character.base?.facilityLevels?.['cooking'] || 1;
    
    // 배치된 요리사 확인
    const assignedIds = instanceId ? (character.base?.multiAssignments?.[instanceId] || []) : [];
    const chefs = (character.inactiveCompanions || []).filter(c => assignedIds.includes(c.id) && (c.job === JobType.CHEF || (c.job as string) === '요리사' || (c.job as string) === 'Chef'));
    
    let totalCookingLevel = character.professions?.cooking?.level || 1;
    if (chefs.length > 0) {
        totalCookingLevel = chefs.reduce((acc, c) => acc + (c.professions?.cooking?.level || 1), 0);
    }
    
    const ownedTools = character.base?.cookingTools || [];

    // 현재 이 주방 인스턴스에서 진행 중인 요리 작업 찾기
    const currentKitchenJob = (character.base?.cookingJobs || []).find(job => job.instanceId === instanceId);
    
    // 남은 시간 및 진행률 계산
    let remainingInfo = { remainingMinutes: 0, text: '조리 완료', isCompleted: true };
    let progressPercent = 100;
    
    if (currentKitchenJob) {
        const curDate = character.currentDate || '2000-03-02';
        const curTime = character.currentTime || '08:00';
        remainingInfo = getConstructionRemainingTime(curDate, curTime, currentKitchenJob.completionDate, currentKitchenJob.completionTime);
        progressPercent = getConstructionProgress(currentKitchenJob.totalMinutes, remainingInfo.remainingMinutes);
        if (remainingInfo.isCompleted) {
            currentKitchenJob.isCompleted = true;
        }
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-slate-950 w-full max-w-3xl rounded-2xl sm:rounded-3xl border border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[88vh]">
                {/* 상단 헤더 */}
                <div className="p-4 sm:p-5 border-b border-slate-800 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950">
                    <div className="flex items-center justify-between sm:justify-start gap-3 w-full sm:w-auto">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-orange-600/20 rounded-xl flex items-center justify-center text-orange-400 border border-orange-500/30 shrink-0">
                                <Utensils size={22} />
                            </div>
                            <div>
                                <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">전문 주방</h2>
                                <div className="flex flex-wrap items-center gap-2 mt-0.5">
                                    <span className="text-[10px] text-slate-400 font-medium">시설: Lv.{facilityLevel}</span>
                                    <span className="text-[10px] text-orange-400 font-bold">숙련도: Lv.{totalCookingLevel} {chefs.length > 0 ? `(담당 요리사 ${chefs.length}명)` : '(플레이어)'}</span>
                                    <button onClick={onOpenMastery} className="text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-200 px-2 py-0.5 rounded transition-colors font-medium">숙련도 명부</button>
                                </div>
                            </div>
                        </div>
                        <button onClick={onClose} className="sm:hidden p-2 hover:bg-slate-800 rounded-full text-slate-400 transition-colors">
                            <X size={20} />
                        </button>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto">
                        <div className="flex bg-slate-900 p-1 rounded-lg border border-slate-800 flex-1 sm:flex-initial justify-center">
                            <button 
                                onClick={() => setTab('cook')}
                                className={`flex-1 sm:flex-none px-4 py-1.5 rounded-md text-xs font-bold transition-all ${tab === 'cook' ? 'bg-orange-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}
                            >
                                요리하기
                            </button>
                            <button 
                                onClick={() => setTab('shop')}
                                className={`flex-1 sm:flex-none px-4 py-1.5 rounded-md text-xs font-bold transition-all ${tab === 'shop' ? 'bg-orange-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}
                            >
                                조리 도구
                            </button>
                        </div>
                        <button onClick={onClose} className="hidden sm:block p-2 hover:bg-slate-800 rounded-full text-slate-400 transition-colors">
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* 현재 이 주방의 조리 현황 및 타이머 섹션 */}
                {tab === 'cook' && (
                    <div className="p-3 sm:p-4 bg-slate-900/60 border-b border-slate-800/80 shrink-0">
                        {currentKitchenJob ? (
                            <div className="bg-slate-900 border-2 border-orange-500/40 rounded-xl p-3 sm:p-4 shadow-lg">
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2.5 rounded-xl border ${remainingInfo.isCompleted ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-400' : 'bg-orange-950/80 border-orange-500/40 text-orange-400 animate-pulse'}`}>
                                            {remainingInfo.isCompleted ? <Sparkles size={24} /> : <Flame size={24} />}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h4 className="text-sm font-extrabold text-white">{currentKitchenJob.recipeName}</h4>
                                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${remainingInfo.isCompleted ? 'bg-emerald-950 text-emerald-300 border-emerald-700' : 'bg-orange-950 text-orange-300 border-orange-700 animate-pulse'}`}>
                                                    {remainingInfo.isCompleted ? '조리 완료!' : '조리 진행 중'}
                                                </span>
                                            </div>
                                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-300 mt-1">
                                                <span className="flex items-center gap-1 font-mono">
                                                    <Clock size={13} className="text-orange-400" />
                                                    {remainingInfo.isCompleted ? (
                                                        <strong className="text-emerald-400 font-bold">완성되었습니다. 수령하십시오!</strong>
                                                    ) : (
                                                        <>남은 시간: <strong className="text-amber-300">{remainingInfo.text}</strong></>
                                                    )}
                                                </span>
                                                <span className="text-[11px] text-slate-400">
                                                    (완료 예정: {currentKitchenJob.completionDate} {currentKitchenJob.completionTime})
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* 조리 작업 액션 버튼 */}
                                    <div className="flex items-center gap-2 w-full sm:w-auto">
                                        {remainingInfo.isCompleted ? (
                                            <button
                                                onClick={() => onClaim?.(currentKitchenJob.id)}
                                                className="w-full sm:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-1.5"
                                            >
                                                <Sparkles size={14} /> 요리 수령하기
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => onCancel?.(currentKitchenJob.id)}
                                                className="w-full sm:w-auto px-3.5 py-2 bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 border border-rose-800/50 font-bold text-xs rounded-xl transition-all active:scale-95 flex items-center justify-center gap-1"
                                            >
                                                <Trash2 size={13} /> 조리 취소
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* 프로그레스 바 */}
                                <div className="mt-3">
                                    <div className="flex justify-between items-center text-[10px] text-slate-400 mb-1">
                                        <span>조리 진행도</span>
                                        <span className="font-mono text-orange-400 font-bold">{progressPercent}%</span>
                                    </div>
                                    <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                                        <div 
                                            className={`h-full transition-all duration-500 ${remainingInfo.isCompleted ? 'bg-gradient-to-r from-emerald-500 to-teal-400' : 'bg-gradient-to-r from-orange-500 to-amber-400'}`}
                                            style={{ width: `${progressPercent}%` }}
                                        />
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-3 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                                <Utensils size={15} className="text-slate-500" />
                                <span>현재 주방이 비어 있습니다. 아래 목록에서 원하는 요리를 선택하여 조리를 시작할 수 있습니다.</span>
                            </div>
                        )}
                    </div>
                )}
                
                {tab === 'cook' ? (
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-3 sm:p-5 grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                        {RECIPES.map(recipe => {
                            const ingredientChecks = Object.entries(recipe.ingredients).map(([ing, amount]) => {
                                const count = getAvailableIngredientCount(character, ing);
                                return {
                                    name: ing,
                                    needed: amount,
                                    current: count,
                                    ok: count >= amount
                                };
                            });

                            const hasIngredients = ingredientChecks.every(item => item.ok);
                            const isLevelUnlocked = totalCookingLevel >= recipe.minLevel;
                            const hasTool = !recipe.requiredTool || ownedTools.includes(recipe.requiredTool);
                            const isKitchenBusy = !!(currentKitchenJob && !currentKitchenJob.isCompleted);
                            const canCook = hasIngredients && isLevelUnlocked && hasTool && !isKitchenBusy;

                            const durationMinutes = getRecipeCookingDuration(recipe, totalCookingLevel, facilityLevel);
                            const durationText = durationMinutes >= 60 ? `${Math.floor(durationMinutes / 60)}시간 ${durationMinutes % 60 > 0 ? `${durationMinutes % 60}분` : ''}`.trim() : `${durationMinutes}분`;

                            const toolName = recipe.requiredTool ? COOKING_TOOLS.find(t => t.id === recipe.requiredTool)?.name : null;

                            return (
                                <div 
                                    key={recipe.id} 
                                    className={`p-3.5 sm:p-4 rounded-xl border transition-all duration-300 flex flex-col justify-between ${canCook ? 'bg-slate-900 border-slate-700 hover:border-orange-500 shadow-md' : 'bg-slate-900/50 border-slate-800/80 opacity-80'}`}
                                >
                                    <div>
                                        <div className="flex justify-between items-start mb-2">
                                            <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                                                {recipe.name}
                                                {canCook && <span className="text-[10px] px-1.5 py-0.2 bg-emerald-950 border border-emerald-800/80 text-emerald-400 rounded">제작 가능</span>}
                                            </h3>
                                            {!isLevelUnlocked ? (
                                                <Lock size={14} className="text-slate-500 shrink-0" />
                                            ) : (
                                                <span className="text-[10px] bg-slate-950 border border-slate-800 text-amber-300 px-2 py-0.5 rounded font-mono">
                                                    소요: {durationText}
                                                </span>
                                            )}
                                        </div>
                                        
                                        <div className="space-y-1.5 mb-3">
                                            <div className="text-[11px] text-slate-300 flex flex-wrap items-center gap-1.5">
                                                <span className="text-slate-400 font-medium">필요 재료:</span>
                                                {ingredientChecks.map((ing, idx) => (
                                                    <span 
                                                        key={idx} 
                                                        className={`px-1.5 py-0.5 rounded text-[10px] font-medium border ${ing.ok ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800/50' : 'bg-rose-950/40 text-rose-300 border-rose-800/50'}`}
                                                    >
                                                        {ing.name} {ing.needed}개 ({ing.current}개 보유)
                                                    </span>
                                                ))}
                                            </div>
                                            {recipe.requiredTool && (
                                                <p className={`text-[10px] flex items-center gap-1 font-bold ${hasTool ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                    필요 도구: {toolName} {hasTool ? <CheckCircle size={11}/> : <AlertCircle size={11}/>}
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between">
                                        <button
                                            disabled={!canCook}
                                            onClick={() => {
                                                if (canCook) {
                                                    onCook(recipe.id);
                                                }
                                            }}
                                            className={`w-full py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 active:scale-95 ${canCook ? 'bg-orange-600 hover:bg-orange-500 text-white shadow-md' : 'bg-slate-800 text-slate-500 cursor-not-allowed'}`}
                                        >
                                            {isKitchenBusy ? (
                                                <>주방 조리 중 (대기 필요)</>
                                            ) : isLevelUnlocked ? (
                                                hasTool ? (
                                                    hasIngredients ? <><Flame size={14}/> 조리 시작 (소요 시간: {durationText})</> : <span className="text-rose-400">재료 부족</span>
                                                ) : <span className="text-amber-400">도구 필요</span>
                                            ) : `숙련도 Lv.${recipe.minLevel} 필요`}
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-3 sm:p-6 space-y-4">
                        <div className="bg-orange-600/10 border border-orange-500/20 p-3 sm:p-4 rounded-xl">
                            <p className="text-xs text-orange-200 font-medium">
                                주방 시설 레벨이 높을수록 더 전문적인 요리 도구를 구매하여 특수 요리를 만들 수 있습니다.
                            </p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                            {COOKING_TOOLS.map(tool => {
                                const isOwned = ownedTools.includes(tool.id);
                                const isFacilityUnlocked = facilityLevel >= tool.minFacilityLevel;
                                const canAfford = (character.money || 0) >= tool.price;
                                
                                return (
                                    <div 
                                        key={tool.id} 
                                        className={`p-3.5 sm:p-4 rounded-xl border flex justify-between items-center transition-all ${isOwned ? 'bg-emerald-900/20 border-emerald-500/30' : 'bg-slate-900 border-slate-800'}`}
                                    >
                                        <div>
                                            <h3 className="text-sm font-bold text-white">{tool.name}</h3>
                                            <p className="text-[10px] text-slate-500 mt-0.5">필요 시설: Lv.{tool.minFacilityLevel}</p>
                                        </div>
                                        
                                        {isOwned ? (
                                            <div className="flex items-center gap-1 text-emerald-400 text-[11px] font-bold">
                                                <CheckCircle size={14} /> 보유 중
                                            </div>
                                        ) : (
                                            <button
                                                disabled={!isFacilityUnlocked || !canAfford}
                                                onClick={() => onBuyTool(tool.id)}
                                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${isFacilityUnlocked && canAfford ? 'bg-orange-600 text-white hover:bg-orange-500' : 'bg-slate-800 text-slate-500 cursor-not-allowed'}`}
                                            >
                                                {isFacilityUnlocked ? `${tool.price.toLocaleString()}G 구매` : '시설 레벨 부족'}
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CookingModal;
