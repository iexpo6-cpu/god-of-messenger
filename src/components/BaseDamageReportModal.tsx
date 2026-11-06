import React, { useState } from 'react';
import { BaseDefenseReportData, Character } from '../types';
import { repairBaseDamages } from '../services/baseDefenseService';
import { 
    AlertOctagon, 
    ShieldAlert, 
    Wrench, 
    Building2, 
    Coins, 
    X, 
    ExternalLink, 
    CheckCircle2, 
    AlertTriangle,
    Skull,
    TrendingDown,
    Flame,
    Box,
    Trees,
    Mountain,
    Utensils,
    Gem,
    Sparkles
} from 'lucide-react';

interface BaseDamageReportModalProps {
    report: BaseDefenseReportData;
    character: Character;
    onClose: () => void;
    onUpdateCharacter?: (newChar: Character, log?: string) => void;
    onOpenBaseManagement?: () => void;
    addToLog?: (msg: string) => void;
}

export const BaseDamageReportModal: React.FC<BaseDamageReportModalProps> = ({
    report: initialReport,
    character,
    onClose,
    onUpdateCharacter,
    onOpenBaseManagement,
    addToLog
}) => {
    const [report, setReport] = useState<BaseDefenseReportData>(initialReport);
    const [repairMessage, setRepairMessage] = useState<string | null>(null);

    const base = character.base;
    const res = base?.resources || {
        gold: 0,
        wood: 0,
        stone: 0,
        iron: 0,
        manaStone: 0,
        manaCrystal: 0,
        food: 0,
        herbs: 0,
        normalCrystal: 0,
        magicCrystal: 0,
        rareCrystal: 0,
        epicCrystal: 0,
        uniqueCrystal: 0,
        legendaryCrystal: 0
    };
    const playerGold = character.money || 0;

    const totalCost = report.totalRepairCost;

    // 자원 충족 여부 점검
    const resourceStatus = [
        {
            key: 'gold',
            name: '골드',
            required: totalCost.gold,
            current: playerGold,
            unit: 'G',
            icon: Coins,
            color: 'text-amber-400',
            bg: 'bg-amber-950/40',
            border: 'border-amber-700/50'
        },
        {
            key: 'food',
            name: '식량',
            required: totalCost.food,
            current: res.food || 0,
            unit: '개',
            icon: Utensils,
            color: 'text-emerald-400',
            bg: 'bg-emerald-950/40',
            border: 'border-emerald-700/50'
        },
        {
            key: 'wood',
            name: '목재',
            required: totalCost.wood,
            current: res.wood || 0,
            unit: '개',
            icon: Trees,
            color: 'text-amber-600',
            bg: 'bg-amber-950/30',
            border: 'border-amber-800/50'
        },
        {
            key: 'stone',
            name: '석재',
            required: totalCost.stone,
            current: res.stone || 0,
            unit: '개',
            icon: Mountain,
            color: 'text-stone-300',
            bg: 'bg-stone-900/50',
            border: 'border-stone-700/50'
        },
        {
            key: 'iron',
            name: '철광석',
            required: totalCost.iron,
            current: res.iron || 0,
            unit: '개',
            icon: Box,
            color: 'text-blue-400',
            bg: 'bg-blue-950/40',
            border: 'border-blue-700/50'
        },
        {
            key: 'manaCost',
            name: '마석',
            required: totalCost.manaCost,
            current: res.manaStone || 0,
            unit: '개',
            icon: Gem,
            color: 'text-purple-400',
            bg: 'bg-purple-950/40',
            border: 'border-purple-700/50'
        },
        {
            key: 'manaCrystal',
            name: '마력 결정',
            required: totalCost.manaCrystal,
            current: res.manaCrystal || 0,
            unit: '개',
            icon: Sparkles,
            color: 'text-cyan-400',
            bg: 'bg-cyan-950/40',
            border: 'border-cyan-700/50'
        }
    ].filter(item => item.required > 0);

    const canAffordAll = resourceStatus.every(item => item.current >= item.required);

    const handleExecuteRepair = () => {
        const result = repairBaseDamages(character, report);
        if (result.success) {
            setReport(prev => ({ ...prev, restored: true }));
            setRepairMessage(result.message);
            if (onUpdateCharacter) {
                onUpdateCharacter(result.updatedCharacter, `[기지 긴급 복구] 모든 시설과 본부의 수리를 성공적으로 마쳤습니다.`);
            }
            if (addToLog) {
                addToLog(`[기지 긴급 복구 완료] 손상된 시설과 기지 본부의 복구가 완료되었습니다.`);
            }
        } else {
            setRepairMessage(result.message);
        }
    };

    // 피해 심각도 판정
    const totalDamageCount = (report.facilityDamages?.length || 0) + (report.baseLevelDamage ? 2 : 0) + (report.casualties.deadCount > 0 ? 2 : 0);
    const severityBadge = totalDamageCount >= 4
        ? { text: '심각한 대규모 피해 (CRITICAL)', color: 'bg-red-950/80 text-red-300 border-red-600' }
        : totalDamageCount >= 2
        ? { text: '중등도 시설 피해 (MODERATE)', color: 'bg-amber-950/80 text-amber-300 border-amber-600' }
        : { text: '경미한 국소 피해 (MINOR)', color: 'bg-yellow-950/80 text-yellow-300 border-yellow-600' };

    return (
        <div className="fixed inset-0 z-[250] flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-5 animate-in fade-in">
            <div className="bg-slate-950 border-2 border-red-600/80 rounded-2xl w-full max-w-3xl shadow-2xl shadow-red-950/90 max-h-[92vh] flex flex-col overflow-hidden">
                {/* 상단 헤더 */}
                <div className="p-4 sm:p-5 bg-gradient-to-r from-red-950/80 via-slate-900 to-slate-950 border-b border-red-800/50 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-red-900/50 border border-red-500 rounded-xl text-red-400">
                            <AlertOctagon size={26} className="animate-pulse" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2 flex-wrap">
                                <h2 className="text-lg sm:text-xl font-black text-white tracking-wide">
                                    기지 방어 실패 피해 통계 리포트
                                </h2>
                                <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${severityBadge.color}`}>
                                    {severityBadge.text}
                                </span>
                            </div>
                            <p className="text-xs text-slate-400 mt-0.5">
                                일시: {report.timestamp} | 위치: {report.locationName} | 방어 형태: {report.defenseType === 'delegated' ? '위임 자동 방어' : '직접 출진 방어'}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800/80 transition-colors"
                        title="닫기"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* 본문 스크롤 영역 */}
                <div className="p-4 sm:p-6 overflow-y-auto space-y-5 text-slate-200 text-xs sm:text-sm">
                    {/* 1. 전투 및 습격 개요 카드 */}
                    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 sm:p-4 space-y-3">
                        <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                            <span className="font-bold text-slate-300 flex items-center gap-1.5">
                                <ShieldAlert size={16} className="text-red-400" /> 공세 및 방어선 비교 분석
                            </span>
                            <span className="text-xs text-red-400 font-semibold flex items-center gap-1">
                                <TrendingDown size={14} /> 방어선 함락
                            </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="bg-slate-950/70 p-3 rounded-lg border border-red-900/40 flex flex-col justify-between">
                                <div className="text-xs text-slate-400">습격 세력 전투력</div>
                                <div className="text-lg sm:text-xl font-black text-red-400 mt-1">
                                    {report.enemyPower.toLocaleString()}
                                </div>
                                <div className="text-[11px] text-slate-400 mt-1">
                                    침입 부대: {report.enemies.map(e => `${e.name}(Lv.${e.level})`).join(', ') || '미상'}
                                </div>
                            </div>

                            <div className="bg-slate-950/70 p-3 rounded-lg border border-blue-900/40 flex flex-col justify-between">
                                <div className="text-xs text-slate-400">아군 기지 방어력</div>
                                <div className="text-lg sm:text-xl font-black text-blue-400 mt-1">
                                    {report.baseDefense.toLocaleString()}
                                </div>
                                <div className="text-[11px] text-slate-400 mt-1">
                                    방어력 부족차: <span className="text-red-400 font-bold">-{Math.max(0, report.enemyPower - report.baseDefense).toLocaleString()}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 2. 피해 세부 내역 (Damage Breakdown) */}
                    <div>
                        <h3 className="font-bold text-sm text-red-400 mb-2.5 flex items-center gap-1.5">
                            <Flame size={16} /> 세부 피해 집계
                        </h3>

                        <div className="space-y-2.5">
                            {/* 시설 손상 목록 */}
                            {report.facilityDamages.length > 0 && (
                                <div className="bg-slate-900/70 border border-red-900/50 rounded-xl p-3.5 space-y-2">
                                    <div className="text-xs font-bold text-red-300 flex items-center gap-1">
                                        <Building2 size={14} /> 시설 파손 및 기능 저하 ({report.facilityDamages.length}개소)
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        {report.facilityDamages.map(dmg => (
                                            <div key={dmg.instanceId} className="bg-slate-950/80 p-2.5 rounded-lg border border-slate-800 flex items-center justify-between">
                                                <div>
                                                    <div className="font-bold text-white text-xs sm:text-sm">{dmg.facilityName}</div>
                                                    <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1.5">
                                                        <span className="text-slate-300">Lv.{dmg.oldLevel}</span>
                                                        <span>➔</span>
                                                        <span className="text-red-400 font-bold">Lv.{dmg.newLevel}</span>
                                                        <span className="text-red-500 font-semibold">(-1 Lv 파손)</span>
                                                    </div>
                                                </div>
                                                <div className="text-right text-[11px] text-slate-400">
                                                    <div className="text-amber-400 font-semibold">{dmg.repairCost.gold.toLocaleString()} G</div>
                                                    <div>목재 {dmg.repairCost.wood} / 석재 {dmg.repairCost.stone}</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* 기지 본부 레벨 손상 */}
                            {report.baseLevelDamage && (
                                <div className="bg-red-950/40 border border-red-700/60 rounded-xl p-3.5 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-red-900/60 rounded-lg text-red-400">
                                            <Building2 size={18} />
                                        </div>
                                        <div>
                                            <div className="font-bold text-red-200">기지 본부(Core Headquarters) 레벨 붕괴</div>
                                            <div className="text-xs text-slate-400 mt-0.5">
                                                Lv.{report.baseLevelDamage.oldLevel} ➔ <span className="text-red-400 font-bold">Lv.{report.baseLevelDamage.newLevel}</span> (-1 Lv)
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right text-xs text-slate-300">
                                        기지 본부의 외벽과 기반 시설이 크게 무너졌습니다.
                                    </div>
                                </div>
                            )}

                            {/* 인명 및 거주민 사상자 */}
                            {report.casualties.deadCount > 0 ? (
                                <div className="bg-slate-900/70 border border-red-900/40 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-red-900/50 rounded-lg text-red-400">
                                            <Skull size={18} />
                                        </div>
                                        <div>
                                            <div className="font-bold text-slate-200 flex items-center gap-2">
                                                <span>거주민 사상자 발생</span>
                                                <span className="text-xs px-2 py-0.5 rounded bg-red-950 text-red-400 font-semibold border border-red-800">
                                                    -{report.casualties.deadCount}명 사망
                                                </span>
                                            </div>
                                            <div className="text-xs text-slate-400 mt-0.5">
                                                희생자: {report.casualties.names.join(', ') || '기지 주민'}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right text-xs text-amber-400 font-semibold">
                                        유가족 위로 및 구호 비용: {report.casualties.reliefCostGold.toLocaleString()} G
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-3 text-xs text-slate-400 flex items-center gap-2">
                                    <CheckCircle2 size={15} className="text-emerald-400" />
                                    <span>거주민 대피가 신속하여 인명 피해는 발생하지 않았습니다.</span>
                                </div>
                            )}

                            {/* 기지 자원 및 창고 수탈 손실 */}
                            {report.plunderedResources.length > 0 ? (
                                <div className="bg-slate-900/80 border border-amber-800/60 rounded-xl p-3.5 space-y-3">
                                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                                        <div className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                                            <Box size={15} /> 기지 자원 및 창고 수탈 피해 ({report.plunderedResources.length}종 강탈)
                                        </div>
                                        <span className="text-[11px] text-red-400 font-semibold">
                                            총 수탈 발생
                                        </span>
                                    </div>

                                    {/* 카테고리별 정렬/그룹화 렌더링 */}
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                                        {report.plunderedResources.map((plunder, idx) => {
                                            const isGold = plunder.category === '금고' || plunder.resourceType.includes('gold');
                                            const isGem = plunder.category === '마력/보석';
                                            const isCrop = plunder.category === '농작물/특산물';
                                            
                                            const badgeColor = isGold 
                                                ? 'border-amber-700/60 bg-amber-950/40 text-amber-300' 
                                                : isGem 
                                                ? 'border-purple-700/60 bg-purple-950/40 text-purple-300'
                                                : isCrop 
                                                ? 'border-emerald-700/60 bg-emerald-950/40 text-emerald-300'
                                                : 'border-slate-700 bg-slate-950/80 text-slate-300';

                                            return (
                                                <div 
                                                    key={`${plunder.resourceType}_${idx}`} 
                                                    className={`p-2 rounded-lg border flex flex-col justify-between ${badgeColor}`}
                                                >
                                                    <div className="flex items-center justify-between text-[11px]">
                                                        <span className="font-semibold truncate">{plunder.resourceName}</span>
                                                        {plunder.category && (
                                                            <span className="text-[9px] px-1 py-0.2 rounded bg-black/40 text-slate-400">
                                                                {plunder.category}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="text-right text-xs font-bold text-red-400 mt-1.5">
                                                        -{plunder.amount.toLocaleString()} {isGold ? 'G' : '개'}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                    <div className="text-[11px] text-slate-400">
                                        * 침략 부대가 방어선을 돌파하고 기지 창고 및 금고 비축 자원을 약탈해 갔습니다.
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-3 text-xs text-slate-400 flex items-center gap-2">
                                    <CheckCircle2 size={15} className="text-emerald-400" />
                                    <span>기지 창고에 약탈 가능한 비축 자원이 없어 자원 수탈은 발생하지 않았습니다.</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* 3. 복구 비용 견적서 (Restoration Cost Sheet) */}
                    <div>
                        <div className="flex items-center justify-between mb-2.5">
                            <h3 className="font-bold text-sm text-slate-200 flex items-center gap-1.5">
                                <Wrench size={16} className="text-amber-400" /> 기지 복구 및 재건 견적서
                            </h3>
                            {report.restored && (
                                <span className="text-xs bg-emerald-950 text-emerald-300 border border-emerald-600 px-2 py-0.5 rounded font-bold flex items-center gap-1">
                                    <CheckCircle2 size={13} /> 복구 완료됨
                                </span>
                            )}
                        </div>

                        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 sm:p-4 space-y-3">
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                                {resourceStatus.map(item => {
                                    const Icon = item.icon;
                                    const isSatisfied = item.current >= item.required;
                                    return (
                                        <div
                                            key={item.key}
                                            className={`${item.bg} border ${item.border} rounded-xl p-2.5 flex flex-col justify-between`}
                                        >
                                            <div className="flex items-center justify-between text-xs">
                                                <span className={`font-semibold flex items-center gap-1 ${item.color}`}>
                                                    <Icon size={14} /> {item.name}
                                                </span>
                                                {isSatisfied ? (
                                                    <span className="text-[10px] text-emerald-400 font-bold">충족</span>
                                                ) : (
                                                    <span className="text-[10px] text-red-400 font-bold">부족</span>
                                                )}
                                            </div>

                                            <div className="mt-2 text-right">
                                                <div className="text-xs text-slate-400">
                                                    필요: <span className="text-white font-bold">{item.required.toLocaleString()}</span> {item.unit}
                                                </div>
                                                <div className="text-[11px] text-slate-400 mt-0.5">
                                                    보유: <span className={isSatisfied ? 'text-emerald-400' : 'text-red-400 font-semibold'}>
                                                        {item.current.toLocaleString()}
                                                    </span> {item.unit}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* 총 필요 골드 요약 바 */}
                            <div className="pt-2 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                <div className="text-xs text-slate-400">
                                    * 시설 레벨 복구 비용 및 거주민 구호비가 모두 합산된 견적입니다.
                                </div>
                                <div className="text-sm font-bold text-white flex items-center gap-2 self-end sm:self-auto">
                                    <span>총 복구 견적:</span>
                                    <span className="text-amber-400 text-base">{totalCost.gold.toLocaleString()} G</span>
                                    {totalCost.wood > 0 && <span className="text-xs text-slate-300">외 자원</span>}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 복구 알림 메시지 */}
                    {repairMessage && (
                        <div className={`p-3 rounded-xl border text-xs font-semibold flex items-center gap-2 ${
                            report.restored
                                ? 'bg-emerald-950/70 border-emerald-600 text-emerald-200'
                                : 'bg-red-950/70 border-red-600 text-red-200'
                        }`}>
                            {report.restored ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
                            <span>{repairMessage}</span>
                        </div>
                    )}
                </div>

                {/* 하단 버튼 액션 영역 */}
                <div className="p-4 bg-slate-950 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
                    <div className="flex items-center gap-2">
                        {onOpenBaseManagement && (
                            <button
                                onClick={() => {
                                    onClose();
                                    onOpenBaseManagement();
                                }}
                                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition-colors border border-slate-700"
                            >
                                <ExternalLink size={15} /> 기지 관리로 이동
                            </button>
                        )}
                    </div>

                    <div className="flex items-center gap-2.5">
                        {!report.restored && (
                            <button
                                onClick={handleExecuteRepair}
                                disabled={!canAffordAll}
                                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-all shadow-lg ${
                                    canAffordAll
                                        ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-900/30 active:scale-95'
                                        : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                                }`}
                                title={canAffordAll ? '모든 시설과 기지를 즉시 원상 복구합니다.' : '복구에 필요한 자원 또는 골드가 부족합니다.'}
                            >
                                <Wrench size={15} /> 즉시 긴급 복구
                            </button>
                        )}

                        <button
                            onClick={onClose}
                            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs sm:text-sm font-semibold transition-colors border border-slate-700"
                        >
                            확인 완료
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
