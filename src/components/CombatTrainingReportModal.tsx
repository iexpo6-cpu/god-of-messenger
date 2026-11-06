import React, { useState } from 'react';
import { X, Award, CheckCircle2, TrendingUp, Sparkles, User, Calendar, Flame, Shield, Brain, Wind, Heart, Zap, Sword, Activity, ArrowUpCircle, History, Clock, ChevronRight } from 'lucide-react';
import { Character, CombatTrainingReportItem, CombatTrainingTrainee, Companion, WeaponType } from '../types';
import { calculateFinalStats } from '../utils';
import { WEAPON_TYPE_KOREAN } from '../constants';
import { getUnifiedCombatTrainingData, getCombatTrainingEfficiencyBonus, getCombatTrainingTrainerInfo } from '../services/trainingService';

interface CombatTrainingReportModalProps {
    character: Character;
    instanceId?: string;
    isOpen?: boolean;
    onClose: () => void;
}

export const CombatTrainingReportModal: React.FC<CombatTrainingReportModalProps> = ({
    character,
    instanceId,
    isOpen = true,
    onClose
}) => {
    const [selectedTab, setSelectedTab] = useState<'trainees' | 'history'>('trainees');

    if (!isOpen) return null;

    const unified = getUnifiedCombatTrainingData(character);
    const facilityCount = unified.facilityCount;
    const facilityLevel = unified.bestFacilityLevel;
    const maxTrainees = unified.maxTrainees;
    const trainees = unified.trainees;
    const recentReports = unified.recentReports;
    const manager = unified.bestManager;

    const efficiencyBonus = getCombatTrainingEfficiencyBonus(manager);
    const trainerInfo = getCombatTrainingTrainerInfo(manager);
    const baseGain = 10 * facilityLevel;
    const dailyPoint = Math.floor(baseGain * (1 + efficiencyBonus));

    const STAT_LABELS: Record<string, string> = {
        exp: '경험치',
        str: '근력',
        int: '지능',
        agi: '민첩',
        wis: '지혜',
        def: '방어',
        ctrl: '제어',
        weapon: '무기 숙련도',
        skill: '스킬 숙련도'
    };

    const STAT_COLORS: Record<string, string> = {
        exp: 'text-cyan-400 border-cyan-500/40 bg-cyan-950/40',
        str: 'text-red-400 border-red-500/40 bg-red-950/40',
        int: 'text-blue-400 border-blue-500/40 bg-blue-950/40',
        agi: 'text-emerald-400 border-emerald-500/40 bg-emerald-950/40',
        wis: 'text-purple-400 border-purple-500/40 bg-purple-950/40',
        def: 'text-amber-400 border-amber-500/40 bg-amber-950/40',
        ctrl: 'text-pink-400 border-pink-500/40 bg-pink-950/40',
        weapon: 'text-orange-400 border-orange-500/40 bg-orange-950/40',
        skill: 'text-violet-400 border-violet-500/40 bg-violet-950/40'
    };

    return (
        <div className="fixed inset-0 z-[1200] flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
            <div className="w-full max-w-lg bg-slate-950 border border-cyan-500/40 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] my-auto animate-in zoom-in-95 duration-200">
                
                {/* 헤더 */}
                <div className="p-4 sm:p-5 bg-gradient-to-b from-cyan-950/80 via-slate-900 to-slate-950 border-b border-slate-800 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-2xl bg-cyan-900/40 border border-cyan-500/50 flex items-center justify-center text-cyan-400 shadow-inner">
                            <Sword size={24} />
                        </div>
                        <div>
                            <div className="flex items-center gap-1.5">
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-900/60 text-cyan-300 border border-cyan-700/50">
                                    {facilityCount > 1 ? `통합 ${facilityCount}개소 운영` : '기지 시설'}
                                </span>
                                <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-0.5">
                                    <CheckCircle2 size={12} /> 자동 훈련 가동 중 ({trainees.length}/{maxTrainees}명)
                                </span>
                            </div>
                            <h3 className="text-base sm:text-lg font-black text-white mt-0.5">
                                전투 훈련소 훈련 결과 보고서
                            </h3>
                        </div>
                    </div>

                    <button
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-white hover:bg-slate-800/80 rounded-full transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                        aria-label="닫기"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* 요약 현황 바 */}
                <div className="grid grid-cols-3 gap-2 p-3 bg-slate-900/60 border-b border-slate-800/80 text-center shrink-0">
                    <div className="bg-slate-950/60 p-2 rounded-xl border border-slate-800">
                        <div className="text-[10px] text-slate-400 font-medium">{facilityCount > 1 ? '최고 레벨' : '시설 레벨'}</div>
                        <div className="text-sm font-bold text-white">{facilityLevel}단계</div>
                    </div>
                    <div className="bg-slate-950/60 p-2 rounded-xl border border-slate-800">
                        <div className="text-[10px] text-amber-400 font-medium">관리자 보너스</div>
                        <div className="text-sm font-bold text-amber-300">
                            {manager ? `+${trainerInfo.bonusPercent}%` : '없음'}
                        </div>
                    </div>
                    <div className="bg-slate-950/60 p-2 rounded-xl border border-slate-800">
                        <div className="text-[10px] text-cyan-400 font-medium">일일 기본 점수</div>
                        <div className="text-sm font-bold text-cyan-300">{dailyPoint}점</div>
                    </div>
                </div>

                {/* 탭 전환 버튼 */}
                <div className="flex border-b border-slate-800 bg-slate-950 px-4 pt-2 gap-2 shrink-0">
                    <button
                        onClick={() => setSelectedTab('trainees')}
                        className={`flex-1 py-2.5 text-xs font-bold rounded-t-xl transition-all flex items-center justify-center gap-1.5 border-t border-x ${
                            selectedTab === 'trainees'
                                ? 'bg-slate-900 text-cyan-300 border-cyan-500/50 shadow-sm'
                                : 'bg-transparent text-slate-400 border-transparent hover:text-slate-200'
                        }`}
                    >
                        <Award size={14} />
                        <span>대원별 훈련 성과 ({trainees.length})</span>
                    </button>
                    <button
                        onClick={() => setSelectedTab('history')}
                        className={`flex-1 py-2.5 text-xs font-bold rounded-t-xl transition-all flex items-center justify-center gap-1.5 border-t border-x ${
                            selectedTab === 'history'
                                ? 'bg-slate-900 text-cyan-300 border-cyan-500/50 shadow-sm'
                                : 'bg-transparent text-slate-400 border-transparent hover:text-slate-200'
                        }`}
                    >
                        <History size={14} />
                        <span>일일 기록 로그 ({recentReports.length})</span>
                    </button>
                </div>

                {/* 본문 콘텐츠 */}
                <div className="p-3 sm:p-4 overflow-y-auto custom-scrollbar flex-1 space-y-3">
                    {selectedTab === 'trainees' && (
                        <>
                            {trainees.length === 0 ? (
                                <div className="py-12 text-center border-2 border-dashed border-slate-800 rounded-2xl p-6 space-y-2">
                                    <div className="w-12 h-12 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 mx-auto">
                                        <User size={24} />
                                    </div>
                                    <p className="text-sm font-bold text-slate-300">현재 등록된 훈련 대원이 없습니다.</p>
                                    <p className="text-xs text-slate-500 leading-relaxed max-w-xs mx-auto">
                                        기지 전투 훈련소에서 대기 중인 동료를 훈련생으로 등록하면, 주간 시간(06:00 ~ 22:00) 동안 훈련 시간이 누적되며 12시간을 채울 때마다 능력치가 상승하고 상세 보고서가 기록됩니다.
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {trainees.map((t, idx) => {
                                        const comp = (character.inactiveCompanions || []).find(c => c.id === t.companionId);
                                        if (!comp) return null;

                                        const targetLabel = STAT_LABELS[t.targetStat] || t.targetStat;
                                        const colorClass = STAT_COLORS[t.targetStat] || 'text-cyan-400 border-cyan-500/40 bg-cyan-950/40';
                                        const isExp = t.targetStat === 'exp';
                                        const isWeapon = t.targetStat === 'weapon';
                                        const isSkill = t.targetStat === 'skill';
                                        const expPct = isExp && comp.maxExp ? Math.min(100, Math.round((comp.currentExp / comp.maxExp) * 100)) : 0;
                                        const currentStatVal = (!isExp && !isWeapon && !isSkill) ? (comp.stats as any)[t.targetStat] : null;

                                        // 무기 숙련도 정보
                                        const currentWeaponType: WeaponType = t.targetWeaponType || (comp.equipment?.weapon?.weaponType as WeaponType) || 'Sword';
                                        const currentWeaponName = WEAPON_TYPE_KOREAN[currentWeaponType] || currentWeaponType;
                                        const weaponMasteryInfo = comp.weaponMastery?.[currentWeaponType] || { level: 0, currentExp: 0 };
                                        const weaponReqExp = (weaponMasteryInfo.level + 4) * 10;
                                        const weaponPct = Math.min(100, Math.round((weaponMasteryInfo.currentExp / weaponReqExp) * 100));

                                        // 스킬 숙련도 정보
                                        const compSkills = comp.skills || [];
                                        const currentSkill = compSkills.find(s => s.name === t.targetSkillName) || compSkills[0];
                                        const skillReqMastery = currentSkill ? 20 * (currentSkill.level + 4) : 100;
                                        const skillPct = currentSkill ? Math.min(100, Math.round(((currentSkill.currentMastery || 0) / skillReqMastery) * 100)) : 0;

                                        const gainUnit = (isExp || isWeapon) ? 'EXP' : isSkill ? '숙련도' : '';
                                        const displayBadgeLabel = isWeapon 
                                            ? `무기: ${currentWeaponName}`
                                            : isSkill 
                                                ? `스킬: ${currentSkill?.name || '미지정'}`
                                                : `목표: ${targetLabel}`;

                                        return (
                                            <div
                                                key={idx}
                                                className="bg-slate-900/90 border border-slate-800 hover:border-cyan-500/40 rounded-2xl p-3.5 space-y-2.5 transition-all shadow-md"
                                            >
                                                {/* 상단 프로필 및 목표 */}
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2.5">
                                                        <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-200 font-bold text-xs">
                                                            {comp.name.charAt(0)}
                                                        </div>
                                                        <div>
                                                            <div className="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5">
                                                                <span>{comp.name}</span>
                                                                <span className="text-[10px] px-1.5 py-0.2 bg-slate-800 text-amber-400 rounded border border-slate-700">
                                                                    Lv.{comp.level}
                                                                </span>
                                                            </div>
                                                            <div className="text-[10px] text-slate-400">
                                                                수련 시작: {t.startDate} {t.totalDaysTrained ? `(${t.totalDaysTrained}일차)` : ''}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className={`text-[10px] font-bold px-2 py-1 rounded-lg border truncate max-w-[140px] ${colorClass}`}>
                                                        {displayBadgeLabel}
                                                    </div>
                                                </div>

                                                {/* 진행 상태 바 or 수치 */}
                                                {isExp ? (
                                                    <div className="bg-slate-950/70 p-2.5 rounded-xl border border-slate-800/80 space-y-1">
                                                        <div className="flex justify-between text-[11px]">
                                                            <span className="text-slate-400">경험치 진행도</span>
                                                            <span className="font-bold text-cyan-300">
                                                                {comp.currentExp.toLocaleString()} / {comp.maxExp.toLocaleString()} ({expPct}%)
                                                            </span>
                                                        </div>
                                                        <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                                                            <div
                                                                className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-500"
                                                                style={{ width: `${expPct}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                ) : isWeapon ? (
                                                    <div className="bg-slate-950/70 p-2.5 rounded-xl border border-slate-800/80 space-y-1">
                                                        <div className="flex justify-between text-[11px]">
                                                            <span className="text-orange-400 font-bold">[{currentWeaponName}] 숙련도 Lv.{weaponMasteryInfo.level}</span>
                                                            <span className="font-bold text-orange-300">
                                                                {weaponMasteryInfo.currentExp} / {weaponReqExp} EXP ({weaponPct}%)
                                                            </span>
                                                        </div>
                                                        <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                                                            <div
                                                                className="h-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-500"
                                                                style={{ width: `${weaponPct}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                ) : isSkill ? (
                                                    currentSkill ? (
                                                        <div className="bg-slate-950/70 p-2.5 rounded-xl border border-slate-800/80 space-y-1">
                                                            <div className="flex justify-between text-[11px]">
                                                                <span className="text-violet-400 font-bold truncate max-w-[130px]">[{currentSkill.name}] Lv.{currentSkill.level}</span>
                                                                <span className="font-bold text-violet-300">
                                                                    {currentSkill.currentMastery || 0} / {skillReqMastery} ({skillPct}%)
                                                                </span>
                                                            </div>
                                                            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                                                                <div
                                                                    className="h-full bg-gradient-to-r from-purple-500 to-violet-500 transition-all duration-500"
                                                                    style={{ width: `${skillPct}%` }}
                                                                />
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="bg-slate-950/70 p-2.5 rounded-xl border border-slate-800/80 text-[11px] text-slate-500">
                                                            습득한 스킬이 없습니다.
                                                        </div>
                                                    )
                                                ) : (
                                                    <div className="bg-slate-950/70 p-2.5 rounded-xl border border-slate-800/80 flex items-center justify-between">
                                                        <span className="text-[11px] text-slate-400">현재 {targetLabel} 능력치</span>
                                                        <span className="text-xs font-bold text-emerald-400">
                                                            {currentStatVal !== null ? currentStatVal : '-'}
                                                        </span>
                                                    </div>
                                                )}

                                                {/* [NEW] 누적 훈련 시간 게이지 (12시간 달성 시 능력치 상승) */}
                                                <div className="bg-slate-950/70 p-2.5 rounded-xl border border-slate-800/80 space-y-1">
                                                    <div className="flex justify-between items-center text-[11px]">
                                                        <span className="text-amber-400 font-bold flex items-center gap-1">
                                                            <Clock size={11} className="text-amber-400 shrink-0" />
                                                            <span>누적 훈련 시간</span>
                                                            <span className="text-[9px] text-slate-500 font-normal">(주간 06:00~22:00 누적)</span>
                                                        </span>
                                                        <span className="font-bold text-amber-300 font-mono">
                                                            {Math.floor((t.accumulatedMinutes || 0) / 60)}시간 {(t.accumulatedMinutes || 0) % 60}분 / 12시간 ({Math.min(100, Math.round(((t.accumulatedMinutes || 0) / 720) * 100))}%)
                                                        </span>
                                                    </div>
                                                    <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden border border-slate-800">
                                                        <div
                                                            className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 transition-all duration-300"
                                                            style={{ width: `${Math.min(100, Math.round(((t.accumulatedMinutes || 0) / 720) * 100))}%` }}
                                                        />
                                                    </div>
                                                </div>

                                                {/* 성과 요약 배지 */}
                                                <div className="grid grid-cols-2 gap-2 pt-1">
                                                    <div className="bg-slate-950/50 p-2 rounded-lg border border-slate-800/60 flex items-center justify-between">
                                                        <span className="text-[10px] text-slate-400">최근 1회 획득</span>
                                                        <span className="text-xs font-bold text-cyan-400">
                                                            {t.lastGain ? `+${t.lastGain.toLocaleString()} ${gainUnit}`.trim() : '대기 중'}
                                                        </span>
                                                    </div>
                                                    <div className="bg-slate-950/50 p-2 rounded-lg border border-slate-800/60 flex items-center justify-between">
                                                        <span className="text-[10px] text-slate-400">누적 총 획득</span>
                                                        <span className="text-xs font-bold text-amber-300">
                                                            {t.accumulatedGain ? `+${t.accumulatedGain.toLocaleString()} ${gainUnit}`.trim() : '0'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </>
                    )}

                    {selectedTab === 'history' && (
                        <>
                            {recentReports.length === 0 ? (
                                <div className="py-12 text-center border-2 border-dashed border-slate-800 rounded-2xl p-6 space-y-2">
                                    <Clock size={24} className="text-slate-500 mx-auto" />
                                    <p className="text-sm font-bold text-slate-300">아직 기록된 일일 훈련 내역이 없습니다.</p>
                                    <p className="text-xs text-slate-500 leading-relaxed max-w-xs mx-auto">
                                        날짜가 지나 하루가 완료되면 자동으로 훈련 결과가 이곳에 기록됩니다.
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {recentReports.map((report, idx) => {
                                        const isExp = report.targetStat === 'exp';
                                        return (
                                            <div
                                                key={idx}
                                                className="bg-slate-900/80 border border-slate-800/90 rounded-xl p-3 flex items-center justify-between gap-2 hover:border-slate-700 transition-all text-xs"
                                            >
                                                <div className="flex items-center gap-2.5 min-w-0">
                                                    <div className="w-7 h-7 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-cyan-400 shrink-0">
                                                        {report.leveledUp ? <Sparkles size={14} className="text-amber-400 animate-pulse" /> : <Award size={14} />}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="font-bold text-white flex items-center gap-1.5 truncate">
                                                            <span>{report.companionName}</span>
                                                            <span className="text-[10px] text-slate-400">({report.date})</span>
                                                        </div>
                                                        <div className="text-[10px] text-slate-400 truncate">
                                                            {report.targetStatLabel} 수련 진행
                                                            {report.leveledUp && (
                                                                <span className="ml-1.5 text-amber-400 font-bold">
                                                                    레벨업 달성 (Lv.{report.oldLevel} ➔ Lv.{report.currentLevel})
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="text-right shrink-0">
                                                    <div className="font-bold text-cyan-300">
                                                        +{report.gain.toLocaleString()} {(report.targetStat === 'exp' || report.targetStat === 'weapon') ? 'EXP' : report.targetStat === 'skill' ? '숙련도' : ''}
                                                    </div>
                                                    <div className="text-[9px] text-slate-500">
                                                        누적: +{report.accumulatedGain?.toLocaleString() || report.gain} {(report.targetStat === 'exp' || report.targetStat === 'weapon') ? 'EXP' : report.targetStat === 'skill' ? '숙련도' : ''}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* 하단 닫기 버튼 */}
                <div className="p-3 sm:p-4 bg-slate-950 border-t border-slate-800 shrink-0">
                    <button
                        onClick={onClose}
                        className="w-full py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl font-bold text-xs sm:text-sm shadow-md active:scale-98 transition-all min-h-[44px] flex items-center justify-center"
                    >
                        확인 완료
                    </button>
                </div>
            </div>
        </div>
    );
};
