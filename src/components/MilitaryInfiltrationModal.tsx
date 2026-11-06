import React, { useState } from 'react';
import { Character, Quest, Enemy, MilitaryRank } from '../types';
import { Eye, Shield, Clock, MapPin, Swords, CheckCircle2, AlertTriangle, X, Sparkles, Award } from 'lucide-react';
import { advanceGameTime } from '../services/gameTimeService';
import { generateEnemyStats } from '../utils';
import { MILITARY_RANK_ORDER } from '../constants';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    character: Character;
    quest: Quest;
    onUpdateCharacter: (updatedChar: Character, logMessage: string) => void;
    onStartBattle?: (enemies: Enemy[], battleType: string, sourceId?: string) => void;
}

import { ActivityProgressModal } from './ActivityProgressModal';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    character: Character;
    quest: Quest;
    onUpdateCharacter: (updatedChar: Character, logMessage: string) => void;
    onStartBattle?: (enemies: Enemy[], battleType: string, sourceId?: string) => void;
}

export const MilitaryInfiltrationModal: React.FC<Props> = ({
    isOpen,
    onClose,
    character,
    quest,
    onUpdateCharacter,
    onStartBattle
}) => {
    const [isExecuting, setIsExecuting] = useState(false);
    const [actionMessage, setActionMessage] = useState<string | null>(null);

    // 로딩바 진행 모달 상태
    const [progressData, setProgressData] = useState<{
        isOpen: boolean;
        title: string;
        subtitle?: string;
        totalHours: number;
        activityType: 'tactical' | 'espionage' | 'patrol' | 'general';
        onComplete: () => void;
    } | null>(null);

    if (!isOpen) return null;

    const loc = character.currentLocation || { nation: '대한민국', city: '서울' };
    const reqNation = quest.location?.nation || '';
    const reqCity = quest.location?.city || '';

    const isNationMatch = !reqNation || reqNation.trim() === (loc.nation || '').trim();
    const isCityMatch = !reqCity || reqCity.trim() === (loc.city || '').trim();
    const isAtTargetLocation = isNationMatch && isCityMatch;

    const militaryRank = character.militaryRank || MilitaryRank.PVT;

    // 계급에 부합하는 적정 적 레벨 범위 산출
    const getRankAppropriateEnemyLevel = (): number => {
        const rankIdx = militaryRank ? MILITARY_RANK_ORDER.indexOf(militaryRank) : 0;
        const minLevel = Math.max(5, rankIdx * 7 + 5);
        const maxLevel = minLevel + 12;
        return Math.floor(Math.random() * (maxLevel - minLevel + 1)) + minLevel;
    };

    // 퀘스트 완료 가능 상태로 변경 헬퍼
    const markQuestAsReady = (char: Character, questId: string): Character => {
        if (!char.militaryData?.activeMissions) return char;
        char.militaryData.activeMissions = char.militaryData.activeMissions.map(m => {
            if (m.id === questId) {
                return {
                    ...m,
                    currentAmount: m.targetAmount || 1
                };
            }
            return m;
        });
        return char;
    };

    // 기밀 첩보 침투 실행
    const executeInfiltration = () => {
        setIsExecuting(true);
        let newChar = JSON.parse(JSON.stringify(character)) as Character;

        // 4시간(240분) 시간 전진
        const timeRes = advanceGameTime(newChar, 240, { activityName: `${loc.nation} ${loc.city} 기밀 첩보` });
        newChar = timeRes.updatedCharacter;

        // 퀘스트 완료 가능 상태로 변경
        newChar = markQuestAsReady(newChar, quest.id);

        const isBattle = Math.random() < 0.45; // 45% 확률로 적국 정예 경비대에게 발각
        const logMsg = `[적국 첩보] ${loc.nation} ${loc.city}에서 기밀 첩보 임무를 4시간 동안 수행하였습니다. (의뢰일지에서 보고 및 보상 수령 가능)`;

        if (isBattle && onStartBattle) {
            const eLevel = getRankAppropriateEnemyLevel() + 2;
            const eStats = generateEnemyStats(eLevel, 'elite');
            const enemy: Enemy = {
                name: `${loc.nation} 정예 경비대장`,
                level: eLevel,
                hp: eStats.hp,
                maxHp: eStats.hp,
                stats: eStats,
                statusEffects: [],
                description: '첩보 활동 중 발각되어 공격해오는 적국 정예 경비 대장입니다.',
                skills: []
            };
            onUpdateCharacter(newChar, logMsg);
            onStartBattle([enemy], 'military_infiltrate', `infilt_${Date.now()}`);
            setIsExecuting(false);
            onClose();
        } else {
            onUpdateCharacter(newChar, logMsg);
            setActionMessage('4시간 동안 적국의 기밀 문서와 군사 동향을 성공적으로 확보했습니다!\n의뢰일지 모달에서 군 사령부로 보고하고 보상을 수령하세요.');
            setIsExecuting(false);
        }
    };

    const handleExecuteInfiltration = () => {
        if (!isAtTargetLocation) {
            alert(`[적국 첩보] 현재 위치가 지정 적국 도시가 아닙니다.\n${reqNation} ${reqCity}(으)로 이동 후 작전을 수행하십시오.`);
            return;
        }

        setProgressData({
            isOpen: true,
            title: `${reqNation} ${reqCity} 기밀 첩보 침투`,
            subtitle: '적국 적진에 비밀리에 침투하여 정보를 수집하는 중입니다.',
            totalHours: 4,
            activityType: 'espionage',
            onComplete: () => {
                setProgressData(null);
                executeInfiltration();
            }
        });
    };

    return (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-slate-900 border border-amber-500/60 rounded-2xl max-w-md w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-slate-100">
                {/* 헤더 */}
                <div className="p-4 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-2.5 min-w-0">
                        <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/40 shrink-0">
                            <Eye size={20} />
                        </div>
                        <div className="min-w-0">
                            <h3 className="font-extrabold text-sm sm:text-base text-amber-200 truncate">
                                군대 적국 기밀 첩보 작전
                            </h3>
                            <p className="text-[11px] text-slate-400 truncate">
                                적국 도시에 잠입하여 핵심 군사 기밀을 수집합니다.
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-slate-400 hover:text-white p-2 rounded-full hover:bg-slate-800 transition-colors shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center"
                        aria-label="닫기"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* 본문 스크롤 영역 */}
                <div className="p-4 overflow-y-auto space-y-3.5 custom-scrollbar flex-1 text-xs">
                    {actionMessage ? (
                        <div className="p-4 bg-emerald-950/70 border border-emerald-500/60 rounded-xl space-y-3 text-center animate-in zoom-in-95">
                            <CheckCircle2 size={36} className="text-emerald-400 mx-auto" />
                            <h4 className="font-bold text-sm text-emerald-200">기밀 첩보 수집 완료</h4>
                            <p className="text-slate-300 whitespace-pre-line leading-relaxed text-[11px]">
                                {actionMessage}
                            </p>
                            <button
                                type="button"
                                onClick={onClose}
                                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-xl transition-all shadow-md active:scale-95 min-h-[44px]"
                            >
                                확인 및 작전 종료
                            </button>
                        </div>
                    ) : (
                        <>
                            {/* 작전 개요 카드 */}
                            <div className="bg-slate-950/90 border border-slate-800 p-3 rounded-xl space-y-1.5 shadow-sm">
                                <div className="flex items-center justify-between">
                                    <span className="font-bold text-amber-300 text-xs">{quest.title}</span>
                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40">
                                        작전 진행 중
                                    </span>
                                </div>
                                <p className="text-[11px] text-slate-400 leading-relaxed">
                                    {quest.details}
                                </p>
                            </div>

                            {/* 목표 위치 점검 카드 */}
                            <div className={`p-3 rounded-xl border flex flex-col gap-1.5 ${
                                isAtTargetLocation 
                                    ? 'bg-emerald-950/40 border-emerald-500/60 text-emerald-200' 
                                    : 'bg-amber-950/40 border-amber-500/60 text-amber-200'
                            }`}>
                                <div className="flex items-center justify-between">
                                    <span className="font-bold text-xs flex items-center gap-1.5">
                                        <MapPin size={14} className={isAtTargetLocation ? 'text-emerald-400' : 'text-amber-400'} />
                                        작전 지정 목표 구역
                                    </span>
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                        isAtTargetLocation 
                                            ? 'bg-emerald-900/60 border-emerald-500/80 text-emerald-300' 
                                            : 'bg-rose-900/60 border-rose-500/80 text-rose-300'
                                    }`}>
                                        {isAtTargetLocation ? '현 위치 일치 (작전 가능)' : '목표 위치 불일치'}
                                    </span>
                                </div>
                                <div className="text-[11px] space-y-0.5 pl-5">
                                    <div>지정 목표: <strong className="text-white">{reqNation} {reqCity}</strong></div>
                                    <div>현재 위치: <span className="text-slate-300">{loc.nation} {loc.city}</span></div>
                                </div>
                                {!isAtTargetLocation && (
                                    <p className="text-[10px] text-rose-300 mt-1 pl-5">
                                        ※ 현재 다른 지역에 위치해 있습니다. 다른 지역으로 이동 버튼을 사용하여 <strong>{reqNation} {reqCity}</strong>(으)로 이동하십시오.
                                    </p>
                                )}
                            </div>

                            {/* 소요 시간 및 위험도 안내 카드 */}
                            <div className="grid grid-cols-2 gap-2">
                                <div className="bg-slate-950/80 border border-slate-800 p-2.5 rounded-xl flex flex-col justify-center">
                                    <span className="text-[10px] text-slate-400 flex items-center gap-1">
                                        <Clock size={11} className="text-blue-400" />
                                        소요 시간
                                    </span>
                                    <span className="font-bold text-slate-200 mt-0.5">4시간 소요</span>
                                </div>
                                <div className="bg-slate-950/80 border border-slate-800 p-2.5 rounded-xl flex flex-col justify-center">
                                    <span className="text-[10px] text-slate-400 flex items-center gap-1">
                                        <Swords size={11} className="text-rose-400" />
                                        발각 위험도
                                    </span>
                                    <span className="font-bold text-rose-300 mt-0.5">약 45% (발각 시 전투)</span>
                                </div>
                            </div>

                            {/* 완료 보상 안내 */}
                            <div className="bg-slate-950/60 border border-slate-800/80 p-3 rounded-xl space-y-1">
                                <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1">
                                    <Award size={13} className="text-amber-400" />
                                    작전 완수 시 기대 보상
                                </span>
                                <div className="flex flex-wrap gap-2 text-[11px] text-amber-300 font-mono pt-1">
                                    <span className="bg-amber-950/50 px-2 py-0.5 rounded border border-amber-800/40">
                                        {quest.rewardGold.toLocaleString()} 골드
                                    </span>
                                    <span className="bg-cyan-950/50 px-2 py-0.5 rounded border border-cyan-800/40 text-cyan-300">
                                        +{quest.rewardExp.toLocaleString()} 경험치
                                    </span>
                                    <span className="bg-purple-950/50 px-2 py-0.5 rounded border border-purple-800/40 text-purple-300">
                                        공적치 +{quest.rewardMerit || 60}
                                    </span>
                                </div>
                            </div>
                        </>
                    )}
                </div>

                {/* 하단 버튼 영역 */}
                {!actionMessage && (
                    <div className="p-4 border-t border-slate-800 bg-slate-950/90 flex gap-2 shrink-0">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-3 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-300 font-bold text-xs rounded-xl transition-all min-h-[44px]"
                        >
                            닫기
                        </button>
                        <button
                            type="button"
                            disabled={!isAtTargetLocation || isExecuting}
                            onClick={handleExecuteInfiltration}
                            className={`flex-1 py-3 px-4 rounded-xl font-extrabold text-xs transition-all active:scale-95 shadow-lg flex items-center justify-center gap-1.5 min-h-[44px] ${
                                isAtTargetLocation && !isExecuting
                                    ? 'bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 shadow-amber-500/20'
                                    : 'bg-slate-800 text-slate-600 border border-slate-700 cursor-not-allowed'
                            }`}
                        >
                            <Eye size={16} />
                            <span>
                                {isExecuting 
                                    ? '기밀 첩보 진행 중...' 
                                    : isAtTargetLocation 
                                    ? '기밀 첩보 침투 시작 (4시간 진행)' 
                                    : '목표 적국 도시로 이동 필요'}
                            </span>
                        </button>
                    </div>
                )}

                {/* 진행 상황 로딩 모달 */}
                {progressData && (
                    <ActivityProgressModal
                        isOpen={progressData.isOpen}
                        title={progressData.title}
                        subtitle={progressData.subtitle}
                        totalHours={progressData.totalHours}
                        activityType={progressData.activityType}
                        onComplete={progressData.onComplete}
                    />
                )}
            </div>
        </div>
    );
};

export default MilitaryInfiltrationModal;
