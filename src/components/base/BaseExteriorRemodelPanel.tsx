import React, { useMemo, useState } from 'react';
import { Character } from '../../types';
import {
    BASE_BUILDING_SKIN_OPTIONS,
    BaseBuildingSkinOption,
    getBaseBuildingSpriteUrl,
    resolveBuildingPackKey,
    resolveCityCultureKey
} from '../../services/cityAssetManifest';
import {
    calculateCompletionDateTime,
    getConstructionRemainingTime
} from '../../services/baseConstructionService';
import { Hammer, Paintbrush, Check, Clock, ChevronDown, ChevronUp, RotateCcw } from 'lucide-react';

interface BaseExteriorRemodelPanelProps {
    character: Character;
    onUpdateCharacter: (newChar: Character, logMsg?: string) => void;
}

export const BaseExteriorRemodelPanel: React.FC<BaseExteriorRemodelPanelProps> = ({
    character,
    onUpdateCharacter
}) => {
    const base = character.base;
    const [isOpen, setIsOpen] = useState(false);
    const [category, setCategory] = useState<'지구권' | '판타지권' | '신계 성전권'>('지구권');
    const [selectedPack, setSelectedPack] = useState<string>('');

    const baseLevel = Math.max(1, Math.min(5, base?.level || 1));
    const defaultPack = useMemo(() => {
        const loc = base?.location || character.currentLocation;
        const cKey = resolveCityCultureKey(loc?.region, loc?.nation, loc?.city);
        return resolveBuildingPackKey(cKey);
    }, [base?.location, character.currentLocation]);

    const currentPack = base?.customBuildingPack || defaultPack;
    const currentOpt = BASE_BUILDING_SKIN_OPTIONS.find(o => o.packKey === currentPack);

    const goldCost = baseLevel * 50000;
    const woodCost = baseLevel * 20;
    const stoneCost = baseLevel * 20;
    const durationMinutes = baseLevel * 360; // Lv.1: 6시간 ~ Lv.5: 30시간

    if (!base) return null;

    const isRemodeling = Boolean(base.exteriorRemodelUnderConstruction);
    const remainingInfo =
        isRemodeling && base.exteriorRemodelCompletionDate && base.exteriorRemodelCompletionTime
            ? getConstructionRemainingTime(
                  character.currentDate || '2000-03-02',
                  character.currentTime || '08:00',
                  base.exteriorRemodelCompletionDate,
                  base.exteriorRemodelCompletionTime
              )
            : null;

    const curWood = base.resources?.wood || 0;
    const curStone = base.resources?.stone || 0;
    const curGold = character.money || 0;
    const canAfford = curGold >= goldCost && curWood >= woodCost && curStone >= stoneCost;

    const filteredOptions = BASE_BUILDING_SKIN_OPTIONS.filter(o => o.category === category);
    const activeSelection = selectedPack || currentPack;
    const selectedOpt: BaseBuildingSkinOption | undefined = BASE_BUILDING_SKIN_OPTIONS.find(
        o => o.packKey === activeSelection
    );

    const startRemodelConstruction = (targetPackKey: string | undefined, labelName: string) => {
        if (isRemodeling) return;
        if (!canAfford) return;
        const effectiveTarget = targetPackKey || defaultPack;
        if (effectiveTarget === currentPack && (targetPackKey || '') === (base.customBuildingPack || '')) {
            return;
        }

        const startDate = character.currentDate || '2000-03-02';
        const startTime = character.currentTime || '08:00';
        const { completionDate, completionTime } = calculateCompletionDateTime(
            startDate,
            startTime,
            durationMinutes
        );

        const nextChar: Character = {
            ...character,
            money: curGold - goldCost,
            base: {
                ...base,
                resources: {
                    ...base.resources,
                    wood: curWood - woodCost,
                    stone: curStone - stoneCost
                },
                exteriorRemodelUnderConstruction: true,
                targetBuildingPack: targetPackKey,
                exteriorRemodelStartDate: startDate,
                exteriorRemodelStartTime: startTime,
                exteriorRemodelCompletionDate: completionDate,
                exteriorRemodelCompletionTime: completionTime,
                exteriorRemodelTotalMinutes: durationMinutes
            }
        };

        onUpdateCharacter(
            nextChar,
            `[기지 외형 개축] Lv.${baseLevel} 기지를 '${labelName}' 양식으로 개축하는 공사를 시작했습니다! (예상 완공: ${completionDate} ${completionTime})`
        );
    };

    const targetOpt = base.targetBuildingPack
        ? BASE_BUILDING_SKIN_OPTIONS.find(o => o.packKey === base.targetBuildingPack)
        : BASE_BUILDING_SKIN_OPTIONS.find(o => o.packKey === defaultPack);

    return (
        <div className="bg-slate-950/90 rounded-xl border border-indigo-500/30 overflow-hidden shadow-lg">
            <button
                type="button"
                onClick={() => setIsOpen(v => !v)}
                className="w-full px-4 py-3 flex items-center justify-between bg-gradient-to-r from-indigo-950/70 via-slate-900 to-slate-900 hover:from-indigo-900/60 transition-colors text-left"
            >
                <div className="flex items-center gap-3 min-w-0">
                    <div className="w-11 h-11 rounded-lg bg-slate-900 border border-indigo-400/40 flex items-center justify-center overflow-hidden shrink-0">
                        <img
                            src={getBaseBuildingSpriteUrl(currentPack, baseLevel)}
                            alt="현재 기지 외형"
                            className="w-10 h-10 object-contain"
                        />
                    </div>
                    <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-black text-indigo-200 flex items-center gap-1.5">
                                <Paintbrush size={14} className="text-indigo-400" />
                                기지 외형 개축 공사
                            </span>
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-950 border border-indigo-500/40 text-indigo-300">
                                Lv.{baseLevel} 전용
                            </span>
                            {isRemodeling && (
                                <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-amber-950 border border-amber-500/60 text-amber-300 flex items-center gap-1 animate-pulse">
                                    <Hammer size={10} /> 개축 공사 중
                                </span>
                            )}
                        </div>
                        <p className="text-[11px] text-slate-400 truncate mt-0.5">
                            현재 외형: <span className="text-white font-semibold">{currentOpt?.label || currentPack}</span>
                            {base.customBuildingPack ? ' (커스텀 개축)' : ' (지역 기본)'}
                        </p>
                    </div>
                </div>
                <div className="text-slate-400 shrink-0 ml-2">
                    {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </div>
            </button>

            {isOpen && (
                <div className="p-4 space-y-4 border-t border-slate-800">
                    <div className="text-xs text-slate-300 bg-slate-900/80 border border-slate-800 rounded-lg px-3 py-2 flex flex-wrap items-center justify-between gap-2">
                        <span>
                            ※ 현재 기지 레벨(<strong className="text-amber-300">Lv.{baseLevel}</strong>)과{' '}
                            <strong className="text-indigo-300">동일한 레벨</strong>의 타 지역·성전 외형으로만 개축 공사가 가능합니다.
                        </span>
                        <span className="text-[11px] text-slate-400 flex items-center gap-1">
                            <Clock size={12} className="text-amber-400" />
                            공사 기간: <strong className="text-amber-300">{Math.round(durationMinutes / 60)}시간</strong>
                        </span>
                    </div>

                    {isRemodeling && (
                        <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-500/50 flex items-center gap-3">
                            <div className="w-14 h-14 rounded-lg bg-slate-900 border border-amber-400/50 flex items-center justify-center shrink-0">
                                <img
                                    src={getBaseBuildingSpriteUrl(base.targetBuildingPack || defaultPack, baseLevel)}
                                    alt="목표 기지 외형"
                                    className="w-12 h-12 object-contain"
                                />
                            </div>
                            <div className="flex-1 min-w-0 text-xs space-y-1">
                                <div className="font-black text-amber-300 flex items-center gap-1.5">
                                    <Hammer size={13} />
                                    외형 개축 공사 진행 중 → {targetOpt?.label || base.targetBuildingPack || '지역 기본'} (Lv.{baseLevel})
                                </div>
                                <div className="text-slate-300">
                                    완공 예정: <span className="font-mono text-white">{base.exteriorRemodelCompletionDate} {base.exteriorRemodelCompletionTime}</span>
                                    {remainingInfo && !remainingInfo.isCompleted && (
                                        <span className="ml-2 text-amber-200 font-bold">({remainingInfo.remainingText} 남음)</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 카테고리 필터 */}
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex gap-1.5">
                            {(['지구권', '판타지권', '신계 성전권'] as const).map(cat => (
                                <button
                                    key={cat}
                                    type="button"
                                    onClick={() => setCategory(cat)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                                        category === cat
                                            ? 'bg-indigo-600 text-white shadow'
                                            : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                                    }`}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>
                        {base.customBuildingPack && (
                            <button
                                type="button"
                                disabled={isRemodeling || !canAfford}
                                onClick={() => startRemodelConstruction(undefined, '지역 기본 양식')}
                                className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 border border-slate-700 flex items-center gap-1"
                            >
                                <RotateCcw size={12} /> 지역 기본 양식으로 복원 공사
                            </button>
                        )}
                    </div>

                    {/* 동일 레벨 기지 외형 선택 그리드 */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 max-h-64 overflow-y-auto pr-1 custom-scrollbar">
                        {filteredOptions.map(opt => {
                            const isCurrent = opt.packKey === currentPack;
                            const isSelected = opt.packKey === activeSelection;
                            return (
                                <button
                                    key={opt.packKey}
                                    type="button"
                                    onClick={() => setSelectedPack(opt.packKey)}
                                    className={`p-2 rounded-xl border text-left transition-all flex flex-col items-center gap-1.5 relative ${
                                        isSelected
                                            ? 'bg-indigo-950/70 border-indigo-400 ring-1 ring-indigo-400/60'
                                            : 'bg-slate-900/80 border-slate-800 hover:border-slate-600'
                                    }`}
                                >
                                    {isCurrent && (
                                        <span className="absolute top-1.5 right-1.5 text-[9px] font-black px-1.5 py-0.5 rounded bg-emerald-600 text-white flex items-center gap-0.5">
                                            <Check size={9} /> 적용 중
                                        </span>
                                    )}
                                    <div className="w-20 h-20 flex items-center justify-center">
                                        <img
                                            src={getBaseBuildingSpriteUrl(opt.packKey, baseLevel)}
                                            alt={opt.label}
                                            className="w-18 h-18 object-contain"
                                            loading="lazy"
                                        />
                                    </div>
                                    <div className="text-[11px] font-bold text-slate-200 text-center leading-tight">
                                        {opt.label}
                                    </div>
                                    <div className="text-[10px] text-slate-400 font-mono">Lv.{baseLevel}</div>
                                </button>
                            );
                        })}
                    </div>

                    {/* 공사 비용 및 착공 버튼 */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-800">
                        <div className="flex flex-wrap gap-3 text-xs">
                            <span className={curGold >= goldCost ? 'text-amber-300 font-bold' : 'text-rose-400 font-bold'}>
                                골드: {goldCost.toLocaleString()} G
                            </span>
                            <span className={curWood >= woodCost ? 'text-emerald-300 font-bold' : 'text-rose-400 font-bold'}>
                                목재: {woodCost} (보유 {curWood})
                            </span>
                            <span className={curStone >= stoneCost ? 'text-sky-300 font-bold' : 'text-rose-400 font-bold'}>
                                석재: {stoneCost} (보유 {curStone})
                            </span>
                        </div>
                        <button
                            type="button"
                            disabled={isRemodeling || !canAfford || activeSelection === currentPack}
                            onClick={() =>
                                startRemodelConstruction(
                                    activeSelection,
                                    selectedOpt?.label || activeSelection
                                )
                            }
                            className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 text-white text-xs font-black flex items-center justify-center gap-1.5 shadow transition-all shrink-0"
                        >
                            <Hammer size={14} />
                            {isRemodeling
                                ? '개축 공사 진행 중'
                                : activeSelection === currentPack
                                ? '현재 적용 중인 외형'
                                : `'${selectedOpt?.label || activeSelection}' 개축 공사 시작`}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
