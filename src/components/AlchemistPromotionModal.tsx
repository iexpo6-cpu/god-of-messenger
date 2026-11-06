import React, { useState } from 'react';
import { Character, Companion } from '../types';
import { 
    X, Sparkles, User, ArrowUpCircle, CheckCircle, 
    AlertCircle, ShieldAlert, Award, ChevronRight, Info
} from 'lucide-react';
import { 
    checkAlchemistPromotionEligibility, 
    executeAlchemistPromotion, 
    ALCHEMIST_RANK_CONFIG, 
    AlchemistPromotionStatus 
} from '../services/alchemistPromotionService';
import { ResultData } from './ActionResultModal';

interface AlchemistPromotionModalProps {
    isOpen: boolean;
    onClose: () => void;
    character: Character;
    assignedAlchemistIds: string[];
    onUpdateCharacter: (newChar: Character, logMsg: string) => void;
    onShowResult?: (data: ResultData) => void;
}

export const AlchemistPromotionModal: React.FC<AlchemistPromotionModalProps> = ({
    isOpen,
    onClose,
    character,
    assignedAlchemistIds,
    onUpdateCharacter,
    onShowResult
}) => {
    const [selectedCompanionId, setSelectedCompanionId] = useState<string | null>(null);
    const [actionNotice, setActionNotice] = useState<string | null>(null);

    if (!isOpen) return null;

    const allCompanions: Companion[] = [
        ...(character.companions || []),
        ...(character.inactiveCompanions || [])
    ];

    // 연금술사 직업인 동료 추출
    const alchemists = allCompanions.filter(c => c.job === '연금술사' && !c.isDead && !c.isMonster);

    // 승급 상태 계산
    const alchemistStatuses: AlchemistPromotionStatus[] = alchemists.map(c => 
        checkAlchemistPromotionEligibility(c)
    );

    // 선택된 동료가 없으면 첫 번째 동료 자동 선택
    const activeTargetId = selectedCompanionId || (alchemists[0]?.id ?? null);
    const activeStatus = alchemistStatuses.find(s => s.companion.id === activeTargetId);

    const handlePromote = (compId: string) => {
        const result = executeAlchemistPromotion(compId, character);
        if (result.success && result.newChar) {
            onUpdateCharacter(result.newChar, result.message);
            if (result.resultData && onShowResult) {
                onShowResult(result.resultData);
            }
            setActionNotice(result.message);
            setTimeout(() => setActionNotice(null), 4000);
        } else {
            setActionNotice(result.message);
            setTimeout(() => setActionNotice(null), 4000);
        }
    };

    return (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/85 backdrop-blur-sm p-2 sm:p-4 animate-in fade-in">
            <div className="bg-slate-900 border border-purple-500/50 rounded-2xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl shadow-purple-950/50 overflow-hidden">
                {/* 헤더 */}
                <div className="flex items-center justify-between p-3.5 sm:p-4 bg-slate-950 border-b border-purple-500/30 shrink-0">
                    <div className="flex items-center gap-2 min-w-0">
                        <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-purple-950/80 border border-purple-500/60 flex items-center justify-center text-purple-300 shrink-0 shadow-md">
                            <Sparkles size={18} />
                        </div>
                        <div className="min-w-0">
                            <h3 className="text-sm sm:text-base font-bold text-slate-100 flex items-center gap-1.5 truncate">
                                <span>연금술사 승급 심사 및 관리</span>
                                <span className="text-[10px] sm:text-xs font-normal text-purple-300 bg-purple-950/70 border border-purple-700/60 px-2 py-0.5 rounded-full">
                                    연금술사 {alchemists.length}명
                                </span>
                            </h3>
                            <p className="text-[10px] sm:text-[11px] text-slate-400 truncate">
                                자격 조건(레벨, 제어, 지혜)을 심사하여 상위 연금술사로 승급시킵니다.
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
                        aria-label="닫기"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* 알림 메시지 */}
                {actionNotice && (
                    <div className="bg-purple-950/90 border-b border-purple-500/50 px-3 py-2 text-xs text-purple-200 flex items-center gap-1.5 animate-in fade-in shrink-0">
                        <Info size={14} className="text-purple-400 shrink-0" />
                        <span className="truncate">{actionNotice}</span>
                    </div>
                )}

                {/* 본문 영역 */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-3 sm:p-4 space-y-4">
                    {alchemists.length === 0 ? (
                        <div className="py-12 text-center text-slate-500 space-y-2">
                            <User size={36} className="mx-auto text-slate-600 opacity-60" />
                            <p className="text-sm font-semibold text-slate-400">보유한 연금술사 동료가 없습니다.</p>
                            <p className="text-xs text-slate-500 max-w-sm mx-auto">
                                주점이나 영입을 통해 직업이 [연금술사]인 동료를 맞이하면 실험실에 배치하고 승급 심사를 진행할 수 있습니다.
                            </p>
                        </div>
                    ) : (
                        <>
                            {/* 연금술사 탭 목록 (가로 스크롤 가능) */}
                            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
                                {alchemistStatuses.map(status => {
                                    const isSelected = status.companion.id === activeTargetId;
                                    const isAssigned = assignedAlchemistIds.includes(status.companion.id);

                                    return (
                                        <button
                                            key={status.companion.id}
                                            type="button"
                                            onClick={() => setSelectedCompanionId(status.companion.id)}
                                            className={`px-3 py-2 rounded-xl border text-left transition-all shrink-0 flex items-center gap-2 ${
                                                isSelected
                                                    ? 'bg-purple-900/60 border-purple-400 text-white shadow-md shadow-purple-900/30'
                                                    : 'bg-slate-950/70 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                                            }`}
                                        >
                                            <div className="w-6 h-6 rounded-full bg-purple-950/80 border border-purple-500/40 flex items-center justify-center text-[10px] font-bold text-purple-300">
                                                {status.companion.name.charAt(0)}
                                            </div>
                                            <div className="min-w-0">
                                                <div className="text-xs font-bold truncate flex items-center gap-1">
                                                    <span>{status.companion.name}</span>
                                                    {status.canPromote && (
                                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                                                    )}
                                                </div>
                                                <div className="text-[10px] text-slate-400 flex items-center gap-1">
                                                    <span className="text-purple-300">{status.currentConfig.label}</span>
                                                    {isAssigned && (
                                                        <span className="text-[9px] text-emerald-400 bg-emerald-950/80 px-1 rounded">배치중</span>
                                                    )}
                                                </div>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>

                            {/* 활성 연금술사 상세 심사 카드 */}
                            {activeStatus && (
                                <div className="space-y-4">
                                    {/* 기본 정보 카드 */}
                                    <div className="bg-slate-950/80 border border-purple-500/30 rounded-xl p-3.5 sm:p-4 space-y-3">
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                            <div className="flex items-center gap-3">
                                                <div className="w-12 h-12 rounded-xl bg-purple-950/70 border border-purple-500/40 flex items-center justify-center text-purple-300 text-lg font-bold shadow-inner">
                                                    {activeStatus.companion.name.charAt(0)}
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <h4 className="text-sm sm:text-base font-bold text-slate-100">
                                                            {activeStatus.companion.name}
                                                        </h4>
                                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-900/60 border border-purple-500/50 text-purple-200">
                                                            {activeStatus.currentConfig.label}
                                                        </span>
                                                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-amber-300 border border-slate-700">
                                                            연금 Lv.{activeStatus.currentLevel}
                                                        </span>
                                                    </div>
                                                    <p className="text-[11px] text-slate-400 mt-0.5">
                                                        {activeStatus.currentConfig.desc}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* 추가 생산 보너스 표시 */}
                                            <div className="bg-purple-950/60 border border-purple-800/50 rounded-lg px-3 py-1.5 text-right self-start sm:self-auto shrink-0">
                                                <div className="text-[10px] text-slate-400">마정석 생산 보너스</div>
                                                <div className="text-xs sm:text-sm font-bold text-purple-300">
                                                    +{activeStatus.currentConfig.bonusProduction} 개 / 회
                                                </div>
                                            </div>
                                        </div>

                                        {/* 연금술 경험치 게이지 */}
                                        <div className="space-y-1">
                                            <div className="flex justify-between text-[11px]">
                                                <span className="text-slate-400">연금술 숙련도 경험치</span>
                                                <span className="font-mono text-purple-300 font-bold">
                                                    {activeStatus.currentExp} / {activeStatus.maxExp} EXP ({Math.min(100, Math.round((activeStatus.currentExp / (activeStatus.maxExp || 100)) * 100))}%)
                                                </span>
                                            </div>
                                            <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                                                <div
                                                    className="h-full bg-gradient-to-r from-purple-600 to-indigo-500 transition-all duration-300"
                                                    style={{ width: `${Math.min(100, (activeStatus.currentExp / (activeStatus.maxExp || 100)) * 100)}%` }}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* 승급 심사 조건 카드 */}
                                    <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 sm:p-4 space-y-3">
                                        <div className="flex items-center justify-between">
                                            <h5 className="text-xs sm:text-sm font-bold text-amber-400 flex items-center gap-1.5">
                                                <Award size={16} />
                                                <span>
                                                    {activeStatus.nextConfig 
                                                        ? `[${activeStatus.nextConfig.label}] 승급 심사 기준` 
                                                        : '최고 승급 단계 달성'}
                                                </span>
                                            </h5>
                                            {activeStatus.nextConfig && (
                                                <span className="text-[10px] text-slate-400">
                                                    * 모든 조건을 달성하고 승급 버튼을 눌러야 승급됩니다.
                                                </span>
                                            )}
                                        </div>

                                        {activeStatus.nextConfig ? (
                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                                                {/* 1. 연금술 레벨 조건 */}
                                                <div className={`p-3 rounded-xl border flex flex-col justify-between gap-1 transition-all ${
                                                    activeStatus.isLevelMet
                                                        ? 'bg-emerald-950/30 border-emerald-500/50 text-emerald-200'
                                                        : 'bg-slate-900/80 border-slate-800 text-slate-300'
                                                }`}>
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-[11px] font-bold">1. 연금술 레벨</span>
                                                        {activeStatus.isLevelMet ? (
                                                            <CheckCircle size={14} className="text-emerald-400" />
                                                        ) : (
                                                            <AlertCircle size={14} className="text-amber-400" />
                                                        )}
                                                    </div>
                                                    <div className="text-xs sm:text-sm font-mono font-bold mt-1">
                                                        Lv.{activeStatus.currentLevel} / Lv.{activeStatus.reqLevel}
                                                    </div>
                                                    <div className="text-[10px]">
                                                        {activeStatus.isLevelMet ? (
                                                            <span className="text-emerald-400 font-bold">기준 충족 완료</span>
                                                        ) : (
                                                            <span className="text-amber-400">레벨 {activeStatus.shortageLevel} 필요</span>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* 2. 제어 능력치 (CTRL) */}
                                                <div className={`p-3 rounded-xl border flex flex-col justify-between gap-1 transition-all ${
                                                    activeStatus.isCtrlMet
                                                        ? 'bg-emerald-950/30 border-emerald-500/50 text-emerald-200'
                                                        : 'bg-slate-900/80 border-slate-800 text-slate-300'
                                                }`}>
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-[11px] font-bold">2. 제어 (CTRL)</span>
                                                        {activeStatus.isCtrlMet ? (
                                                            <CheckCircle size={14} className="text-emerald-400" />
                                                        ) : (
                                                            <AlertCircle size={14} className="text-rose-400" />
                                                        )}
                                                    </div>
                                                    <div className="text-xs sm:text-sm font-mono font-bold mt-1">
                                                        {activeStatus.currentCtrl} / {activeStatus.reqCtrl}
                                                    </div>
                                                    <div className="text-[10px]">
                                                        {activeStatus.isCtrlMet ? (
                                                            <span className="text-emerald-400 font-bold">능력치 충족 완료</span>
                                                        ) : (
                                                            <span className="text-rose-400">제어 +{activeStatus.shortageCtrl} 부족</span>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* 3. 지혜 능력치 (WIS) */}
                                                <div className={`p-3 rounded-xl border flex flex-col justify-between gap-1 transition-all ${
                                                    activeStatus.isWisMet
                                                        ? 'bg-emerald-950/30 border-emerald-500/50 text-emerald-200'
                                                        : 'bg-slate-900/80 border-slate-800 text-slate-300'
                                                }`}>
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-[11px] font-bold">3. 지혜 (WIS)</span>
                                                        {activeStatus.isWisMet ? (
                                                            <CheckCircle size={14} className="text-emerald-400" />
                                                        ) : (
                                                            <AlertCircle size={14} className="text-rose-400" />
                                                        )}
                                                    </div>
                                                    <div className="text-xs sm:text-sm font-mono font-bold mt-1">
                                                        {activeStatus.currentWis} / {activeStatus.reqWis}
                                                    </div>
                                                    <div className="text-[10px]">
                                                        {activeStatus.isWisMet ? (
                                                            <span className="text-emerald-400 font-bold">능력치 충족 완료</span>
                                                        ) : (
                                                            <span className="text-rose-400">지혜 +{activeStatus.shortageWis} 부족</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="p-4 bg-purple-950/40 border border-purple-500/40 rounded-xl text-center space-y-1">
                                                <div className="text-amber-300 font-bold text-sm">
                                                    ★ 만물의 이치를 꿰뚫은 대현자 ★
                                                </div>
                                                <p className="text-xs text-slate-300">
                                                    이 연금술사는 최고 등급에 도달하여 연금술의 궁극을 발휘하고 있습니다.
                                                </p>
                                            </div>
                                        )}

                                        {/* 다음 등급 특전 안내 */}
                                        {activeStatus.nextConfig && (
                                            <div className="p-3 bg-purple-950/30 border border-purple-500/20 rounded-xl space-y-1.5">
                                                <div className="text-[11px] font-bold text-purple-300 flex items-center gap-1">
                                                    <ChevronRight size={13} />
                                                    <span>[{activeStatus.nextConfig.label}] 승급 시 개방되는 혜택</span>
                                                </div>
                                                <ul className="text-[10px] sm:text-[11px] text-slate-300 space-y-0.5 list-disc list-inside">
                                                    {activeStatus.nextConfig.perks.map((perk, pIdx) => (
                                                        <li key={pIdx}>{perk}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}

                                        {/* 승급 실행 버튼 */}
                                        {activeStatus.nextConfig && (
                                            <div className="pt-2">
                                                {activeStatus.canPromote ? (
                                                    <button
                                                        type="button"
                                                        onClick={() => handlePromote(activeStatus.companion.id)}
                                                        className="w-full py-3 px-4 bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 hover:from-purple-500 hover:via-indigo-500 hover:to-purple-500 text-white font-bold text-sm rounded-xl shadow-lg shadow-purple-900/40 flex items-center justify-center gap-2 transition-all active:scale-[0.98] animate-pulse"
                                                    >
                                                        <ArrowUpCircle size={18} />
                                                        <span>[{activeStatus.nextConfig.label}] 승급하기</span>
                                                    </button>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const reasons: string[] = [];
                                                            if (!activeStatus.isLevelMet) reasons.push(`연금술 레벨 ${activeStatus.shortageLevel} 부족`);
                                                            if (!activeStatus.isCtrlMet) reasons.push(`제어(CTRL) ${activeStatus.shortageCtrl} 부족`);
                                                            if (!activeStatus.isWisMet) reasons.push(`지혜(WIS) ${activeStatus.shortageWis} 부족`);
                                                            setActionNotice(`승급 조건을 먼저 충족해야 합니다: ${reasons.join(', ')}`);
                                                            setTimeout(() => setActionNotice(null), 3500);
                                                        }}
                                                        className="w-full py-3 px-4 bg-slate-800/80 border border-slate-700 text-slate-400 font-semibold text-xs sm:text-sm rounded-xl flex items-center justify-center gap-2 hover:bg-slate-800 transition-colors"
                                                    >
                                                        <ShieldAlert size={16} className="text-amber-400" />
                                                        <span>승급 심사 조건 미달성 (상세 조건 확인)</span>
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* 모바일 최적화 하단 닫기 바 */}
                <div className="p-3 bg-slate-950 border-t border-purple-500/20 flex justify-end shrink-0">
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-full sm:w-auto px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs sm:text-sm font-bold rounded-xl transition-colors text-center"
                    >
                        닫기
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AlchemistPromotionModal;
