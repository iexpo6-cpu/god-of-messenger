import React, { useState } from 'react';
import { Character, Quest, Enemy, MilitaryRank } from '../types';
import { Shield, Flag, Eye, Hammer, Moon, Swords, CheckCircle2, Clock, Sparkles, AlertTriangle, X, Check, PackageCheck, Crosshair, MapPin } from 'lucide-react';
import { advanceGameTime } from '../services/gameTimeService';
import { generateEnemyStats } from '../utils';
import { MILITARY_RANK_ORDER } from '../constants';

import { ActivityProgressModal } from './ActivityProgressModal';

interface Props {
    character: Character;
    onUpdateCharacter: (updatedChar: Character, logMessage: string) => void;
    onStartBattle?: (enemies: Enemy[], battleType: string, sourceId?: string) => void;
    onClose?: () => void;
    onOpenInfiltrationModal?: () => void;
}

export const MilitaryCityActionPanel: React.FC<Props> = ({
    character,
    onUpdateCharacter,
    onStartBattle,
    onClose,
    onOpenInfiltrationModal
}) => {
    const loc = character.currentLocation || { nation: '대한민국', city: '서울' };
    const militaryRank = character.militaryRank;
    const currentRankIdx = militaryRank ? MILITARY_RANK_ORDER.indexOf(militaryRank) : 0;
    const captainRankIdx = MILITARY_RANK_ORDER.indexOf(MilitaryRank.CPT);

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

    // 심야 시간 판별 (21:00 ~ 05:00)
    const currentHour = parseInt((character.currentTime || "08:00").split(':')[0], 10);
    const isNightTime = currentHour >= 21 || currentHour < 5;

    // 현재 수락된 군대 의뢰 중, 아직 완료되지 않은(currentAmount < targetAmount) 작전만 필터링
    const activeMissions = character.militaryData?.activeMissions || [];
    
    const isPending = (q?: Quest) => Boolean(q && (q.currentAmount || 0) < (q.targetAmount || 1));

    const reconQuest = currentRankIdx <= captainRankIdx
        ? activeMissions.find(m => m.type === 'MilitaryRecon' && (!m.location?.city || m.location.city === loc.city) && isPending(m))
        : undefined;
    const infiltrationQuest = activeMissions.find(m => m.type === 'MilitaryInfiltration' && isPending(m));
    const wallRepairQuest = activeMissions.find(m => m.type === 'MilitaryWallRepair' && (!m.location?.city || m.location.city === loc.city) && isPending(m));
    const nightPatrolQuest = activeMissions.find(m => m.type === 'MilitaryNightPatrol' && (!m.location?.city || m.location.city === loc.city) && isNightTime && isPending(m));

    // 진행 중인 관련 작전이 없으면 패널을 렌더링하지 않음
    const hasAnyActiveCityMission = Boolean(reconQuest || infiltrationQuest || wallRepairQuest || nightPatrolQuest);

    if (!militaryRank || !hasAnyActiveCityMission) {
        return null;
    }

    // 퀘스트 진척도 완료 처리 헬퍼 (targetAmount 달성 처리 -> 퀘스트일지 모달과 연동)
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

    // 계급에 부합하는 적정 적 레벨 범위 산출
    const getRankAppropriateEnemyLevel = (): number => {
        const rankIdx = militaryRank ? MILITARY_RANK_ORDER.indexOf(militaryRank) : 0;
        const minLevel = Math.max(5, rankIdx * 7 + 5);
        const maxLevel = minLevel + 12;
        return Math.floor(Math.random() * (maxLevel - minLevel + 1)) + minLevel;
    };

    // 1. 국경 정찰 실행 (MilitaryRecon) - 3시간(180분) 소요 (대위 이하 계급 전용)
    const executeReconAction = () => {
        if (!reconQuest || currentRankIdx > captainRankIdx) return;
        let newChar = JSON.parse(JSON.stringify(character)) as Character;
        
        // 3시간(180분) 시간 전진
        const timeRes = advanceGameTime(newChar, 180, { activityName: `${loc.city} 국경 정찰` });
        newChar = timeRes.updatedCharacter;

        // 퀘스트 완료 가능 상태로 변경
        newChar = markQuestAsReady(newChar, reconQuest.id);

        // 전투 확률 35%
        const isBattle = Math.random() < 0.35; 
        let logMsg = `[국경 정찰] ${loc.city} 국경 정찰 임무를 3시간 동안 수행하였습니다. (의뢰일지 완수 가능 상태 변경)`;

        if (isBattle && onStartBattle) {
            const eLevel = getRankAppropriateEnemyLevel();
            const eStats = generateEnemyStats(eLevel);
            const enemy: Enemy = {
                name: '국경 침범 무장 기습대',
                level: eLevel,
                hp: eStats.hp,
                maxHp: eStats.hp,
                stats: eStats,
                statusEffects: [],
                description: `계급(${militaryRank}) 적정 위협 수준(Lv.${eLevel})의 국경 침범 적국 기습대입니다.`,
                skills: []
            };
            onUpdateCharacter(newChar, logMsg);
            onStartBattle([enemy], 'military_recon', `recon_${Date.now()}`);
            setActionMessage(`국경 정찰 중 침범 대원(Lv.${eLevel})과 조우하여 전투가 발생했습니다!`);
        } else {
            onUpdateCharacter(newChar, logMsg);
            setActionMessage('3시간 동안 국경 정찰을 무사히 마치고 이상 없음을 보고했습니다. (의뢰일지 모달에서 보고 및 보상 수령 가능)');
        }
    };

    const handleReconAction = () => {
        if (!reconQuest || currentRankIdx > captainRankIdx) return;
        setProgressData({
            isOpen: true,
            title: `${loc.city} 국경 정찰 수행`,
            subtitle: '국경 우발 지역을 순찰하고 이상 징후를 감시하는 중입니다.',
            totalHours: 3,
            activityType: 'patrol',
            onComplete: () => {
                setProgressData(null);
                executeReconAction();
            }
        });
    };

    // 2. 적국 첩보 실행 (MilitaryInfiltration) - 4시간(240분) 소요
    const executeInfiltrationAction = () => {
        if (!infiltrationQuest) return;

        let newChar = JSON.parse(JSON.stringify(character)) as Character;
        
        // 4시간(240분) 시간 전진
        const timeRes = advanceGameTime(newChar, 240, { activityName: `${loc.nation} ${loc.city} 기밀 첩보` });
        newChar = timeRes.updatedCharacter;

        // 퀘스트 완료 가능 상태로 변경
        newChar = markQuestAsReady(newChar, infiltrationQuest.id);

        const isBattle = Math.random() < 0.45; // 45% 확률로 적국 경비병에게 발각
        let logMsg = `[적국 첩보] ${loc.nation} ${loc.city}에서 기밀 첩보 임무를 4시간 동안 수행하였습니다.`;

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
            setActionMessage('첩보 활동 중 적국 경비대에게 발각되어 발각 탈출 전투가 진행됩니다!');
        } else {
            onUpdateCharacter(newChar, logMsg);
            setActionMessage('4시간 동안 적국의 기밀 문서와 군사 동향을 성공적으로 확보했습니다. (의뢰일지 모달에서 보고 및 보상 수령 가능)');
        }
    };

    const handleInfiltrationAction = () => {
        if (!infiltrationQuest) return;

        const reqNation = infiltrationQuest.location?.nation;
        const reqCity = infiltrationQuest.location?.city;

        if (reqNation && reqNation !== loc.nation) {
            alert(`[적국 첩보] 현재 위치가 지정 적국(${reqNation})이 아닙니다.\n${reqNation} ${reqCity || ''}(으)로 이동하여 첩보를 수행하십시오.`);
            return;
        }

        setProgressData({
            isOpen: true,
            title: `${loc.nation} ${loc.city} 기밀 첩보 침투`,
            subtitle: '적국 주요 군사 기지 및 기밀 문서에 침투하여 수집 중입니다.',
            totalHours: 4,
            activityType: 'espionage',
            onComplete: () => {
                setProgressData(null);
                executeInfiltrationAction();
            }
        });
    };

    // 3. 전선 방벽 복구 실행 (MilitaryWallRepair) - 석재, 철광석, 목재, 마정석 소모 + 4시간 소요
    const handleWallRepairAction = () => {
        if (!wallRepairQuest) return;
        let newChar = JSON.parse(JSON.stringify(character)) as Character;

        const reqs = wallRepairQuest.requiredResources || {
            stone: 20,
            iron: 15,
            wood: 25,
            manaCrystal: 3
        };

        const res = newChar.base?.resources || {
            stone: 0,
            iron: 0,
            wood: 0,
            manaCrystal: 0,
            food: 0,
            herbs: 0
        };

        // 필요 자원 보유량 검사
        const missingList: string[] = [];
        if ((res.stone || 0) < (reqs.stone || 0)) missingList.push(`석재 ${(reqs.stone || 0) - (res.stone || 0)}개`);
        if ((res.iron || 0) < (reqs.iron || 0)) missingList.push(`철광석 ${(reqs.iron || 0) - (res.iron || 0)}개`);
        if ((res.wood || 0) < (reqs.wood || 0)) missingList.push(`목재 ${(reqs.wood || 0) - (res.wood || 0)}개`);
        if ((res.manaCrystal || 0) < (reqs.manaCrystal || 0)) missingList.push(`마정석 ${(reqs.manaCrystal || 0) - (res.manaCrystal || 0)}개`);

        if (missingList.length > 0) {
            alert(`전선 방벽 복구에 필요한 군수 자원이 부족합니다!\n부족한 자원: ${missingList.join(', ')}`);
            return;
        }

        setProgressData({
            isOpen: true,
            title: `${loc.city} 방벽 복구 공사`,
            subtitle: '군수 자원을 투입하여 성벽 및 방벽을 복구하는 중입니다.',
            totalHours: 4,
            activityType: 'general',
            onComplete: () => {
                setProgressData(null);
                // 자원 차감 소모
                if (newChar.base) {
                    newChar.base.resources.stone = Math.max(0, (newChar.base.resources.stone || 0) - (reqs.stone || 0));
                    newChar.base.resources.iron = Math.max(0, (newChar.base.resources.iron || 0) - (reqs.iron || 0));
                    newChar.base.resources.wood = Math.max(0, (newChar.base.resources.wood || 0) - (reqs.wood || 0));
                    newChar.base.resources.manaCrystal = Math.max(0, (newChar.base.resources.manaCrystal || 0) - (reqs.manaCrystal || 0));
                }

                // 4시간(240분) 시간 전진
                const timeRes = advanceGameTime(newChar, 240, { activityName: `${loc.city} 방벽 복구 공사` });
                newChar = timeRes.updatedCharacter;

                newChar = markQuestAsReady(newChar, wallRepairQuest.id);

                let logMsg = `[방벽 복구] ${loc.city} 전선 방벽 보수 공사에 석재 ${reqs.stone || 0}개, 철광석 ${reqs.iron || 0}개, 목재 ${reqs.wood || 0}개, 마정석 ${reqs.manaCrystal || 0}개를 지원하고 4시간 공사를 완공하였습니다.`;

                onUpdateCharacter(newChar, logMsg);
                setActionMessage(`지정된 군수 자원을 전선 공병대에 지원하고 4시간 동안 성벽 및 방벽 보수 공사를 완공했습니다! (의뢰일지 모달에서 보상 수령 가능)`);
            }
        });
    };

    // 4. 심야 치안 순찰 & 암시장 단속 (MilitaryNightPatrol) - 3시간 소요
    const executeNightPatrolAction = (bustBlackMarket: boolean = false) => {
        if (!nightPatrolQuest) return;
        let newChar = JSON.parse(JSON.stringify(character)) as Character;

        // 3시간(180분) 시간 전진
        const timeRes = advanceGameTime(newChar, 180, { activityName: `${loc.city} 심야 순찰 및 단속` });
        newChar = timeRes.updatedCharacter;

        newChar = markQuestAsReady(newChar, nightPatrolQuest.id);

        let logMsg = bustBlackMarket
            ? `[암시장 단속] ${loc.city} 심야 암시장을 급습하여 불법 밀매품을 적발 단속했습니다.`
            : `[심야 순찰] ${loc.city} 심야 우범지대 순찰을 3시간 동안 진행했습니다.`;

        const isBattle = Math.random() < 0.40;
        if (isBattle && onStartBattle) {
            const eLevel = getRankAppropriateEnemyLevel();
            const eStats = generateEnemyStats(eLevel);
            const enemyName = bustBlackMarket ? '암시장 불법 밀매 조직원' : '심야 무법자 조직원';
            const enemy: Enemy = {
                name: enemyName,
                level: eLevel,
                hp: eStats.hp,
                maxHp: eStats.hp,
                stats: eStats,
                statusEffects: [],
                description: '심야 단속 중 저항해오는 범죄 조직원입니다.',
                skills: []
            };
            onUpdateCharacter(newChar, logMsg);
            onStartBattle([enemy], 'military_night_patrol', `night_${Date.now()}`);
            setActionMessage('단속 중 저항하는 범죄 조직원과 교전이 시작됩니다!');
        } else {
            onUpdateCharacter(newChar, logMsg);
            setActionMessage(bustBlackMarket ? '3시간 단속 끝에 불법 암시장을 봉쇄하고 치안을 대폭 향상시켰습니다!' : '3시간 동안 밤거리를 순찰하여 주민들의 안전을 확보했습니다.');
        }
    };

    const handleNightPatrolAction = (bustBlackMarket: boolean = false) => {
        if (!nightPatrolQuest) return;

        setProgressData({
            isOpen: true,
            title: bustBlackMarket ? `${loc.city} 심야 암시장 급습 단속` : `${loc.city} 심야 우범지대 순찰`,
            subtitle: bustBlackMarket ? '불법 암시장 밀매 현장을 적발하고 단속하는 중입니다.' : '심야 밤거리를 순찰하여 주민들의 안전을 점검하는 중입니다.',
            totalHours: 3,
            activityType: 'patrol',
            onComplete: () => {
                setProgressData(null);
                executeNightPatrolAction(bustBlackMarket);
            }
        });
    };

    const res = character.base?.resources || { stone: 0, iron: 0, wood: 0, manaCrystal: 0 };

    return (
        <div className="w-full bg-slate-900/95 border border-emerald-600/60 rounded-2xl p-4 shadow-2xl mb-4 font-sans text-slate-100 backdrop-blur-md">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
                <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-emerald-950 border border-emerald-500 text-emerald-400">
                        <Shield size={18} />
                    </div>
                    <div>
                        <div className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                            <span>군사 수락 의뢰 작전구역</span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-900 text-emerald-200 border border-emerald-600 font-extrabold">
                                {militaryRank}
                            </span>
                        </div>
                        <div className="text-sm font-black text-white">
                            {loc.city} 수락 군대 임무 수행
                        </div>
                    </div>
                </div>
                {onClose && (
                    <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800">
                        <X size={16} />
                    </button>
                )}
            </div>

            {/* 활성화되고 미완료 상태인 퀘스트 항목만 각 카드 형태로 출력 */}
            <div className="grid grid-cols-1 gap-3">
                {/* 1. 국경 정찰 (MilitaryRecon) */}
                {reconQuest && (
                    <div className="p-3.5 rounded-xl border border-emerald-500/80 bg-emerald-950/40 flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Flag size={18} className="text-emerald-400 shrink-0" />
                                <span className="text-xs font-black text-white">{reconQuest.title}</span>
                                <span className="text-[9px] bg-emerald-600 text-white px-1.5 py-0.2 rounded font-extrabold">수락 진행 중</span>
                            </div>
                            <div className="flex items-center gap-1 text-[11px] text-emerald-300 font-mono">
                                <Clock size={12} />
                                <span>3시간 소요</span>
                            </div>
                        </div>
                        <p className="text-xs text-slate-300">{reconQuest.details}</p>
                        <div className="flex items-center justify-between pt-1 flex-wrap gap-2">
                            <div className="text-[11px] text-amber-300 font-bold">
                                보상: {reconQuest.rewardGold.toLocaleString()} 골드 | +{reconQuest.rewardExp.toLocaleString()} EXP | 공적치 +{reconQuest.rewardMerit || 30}
                            </div>
                            <button
                                onClick={handleReconAction}
                                className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-black shadow-lg shadow-emerald-950/50 transition-all active:scale-95 flex items-center gap-1.5"
                            >
                                <Flag size={14} />
                                <span>국경 정찰 개시 (3시간 진행)</span>
                            </button>
                        </div>
                    </div>
                )}

                {/* 2. 적국 첩보 (MilitaryInfiltration) */}
                {infiltrationQuest && (() => {
                    const reqNation = infiltrationQuest.location?.nation;
                    const reqCity = infiltrationQuest.location?.city;
                    const isAtTargetLocation = (!reqNation || reqNation === loc.nation) && (!reqCity || reqCity === loc.city);

                    return (
                        <div className="p-3.5 rounded-xl border border-amber-500/80 bg-amber-950/40 flex flex-col gap-2">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Eye size={18} className="text-amber-400 shrink-0" />
                                    <span className="text-xs font-black text-white">{infiltrationQuest.title}</span>
                                    <span className="text-[9px] bg-amber-600 text-white px-1.5 py-0.2 rounded font-extrabold">수락 진행 중</span>
                                </div>
                                <div className="flex items-center gap-1 text-[11px] text-amber-300 font-mono">
                                    <Clock size={12} />
                                    <span>4시간 소요</span>
                                </div>
                            </div>
                            <p className="text-xs text-slate-300">{infiltrationQuest.details}</p>

                            {!isAtTargetLocation && (
                                <div className="p-2 rounded-lg bg-amber-950/80 border border-amber-600/50 text-[11px] text-amber-300 flex items-center gap-1.5 font-bold">
                                    <MapPin size={14} className="text-amber-400 shrink-0" />
                                    <span>첩보 목표 위치: {reqNation} {reqCity} (지정 도시 진입 시 작전 가능)</span>
                                </div>
                            )}

                            <div className="flex items-center justify-between pt-1 flex-wrap gap-2">
                                <div className="text-[11px] text-amber-300 font-bold">
                                    보상: {infiltrationQuest.rewardGold.toLocaleString()} 골드 | +{infiltrationQuest.rewardExp.toLocaleString()} EXP | 공적치 +{infiltrationQuest.rewardMerit || 60}
                                </div>
                                <button
                                    onClick={onOpenInfiltrationModal || handleInfiltrationAction}
                                    disabled={!isAtTargetLocation}
                                    className={`px-4 py-2 text-white rounded-xl text-xs font-black shadow-lg transition-all flex items-center gap-1.5 active:scale-95 ${
                                        isAtTargetLocation
                                            ? 'bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 shadow-amber-950/50'
                                            : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                                    }`}
                                >
                                    <Eye size={14} />
                                    <span>{isAtTargetLocation ? '기밀 첩보 침투 (4시간 진행)' : '목표 적국 도시로 이동 필요'}</span>
                                </button>
                            </div>
                        </div>
                    );
                })()}



                {/* 4. 전선 방벽 복구 (MilitaryWallRepair) */}
                {wallRepairQuest && (() => {
                    const reqs = wallRepairQuest.requiredResources || { stone: 20, iron: 15, wood: 25, manaCrystal: 3 };
                    const hasStone = (res.stone || 0) >= (reqs.stone || 0);
                    const hasIron = (res.iron || 0) >= (reqs.iron || 0);
                    const hasWood = (res.wood || 0) >= (reqs.wood || 0);
                    const hasMana = (res.manaCrystal || 0) >= (reqs.manaCrystal || 0);
                    const canAfford = hasStone && hasIron && hasWood && hasMana;

                    return (
                        <div className="p-3.5 rounded-xl border border-blue-500/80 bg-blue-950/40 flex flex-col gap-2">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Hammer size={18} className="text-blue-400 shrink-0" />
                                    <span className="text-xs font-black text-white">{wallRepairQuest.title}</span>
                                    <span className="text-[9px] bg-blue-600 text-white px-1.5 py-0.2 rounded font-extrabold">수락 진행 중</span>
                                </div>
                                <div className="flex items-center gap-1 text-[11px] text-blue-300 font-mono">
                                    <Clock size={12} />
                                    <span>4시간 소요</span>
                                </div>
                            </div>
                            <p className="text-xs text-slate-300">{wallRepairQuest.details}</p>

                            {/* 필요한 4가지 군수 자원 수량 비교 표시 */}
                            <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-2 my-1">
                                <div className="text-[11px] flex items-center justify-between bg-slate-900/80 px-2 py-1 rounded-lg">
                                    <span className="text-slate-400">석재</span>
                                    <span className={hasStone ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold'}>
                                        {res.stone || 0} / {reqs.stone || 0}개
                                    </span>
                                </div>
                                <div className="text-[11px] flex items-center justify-between bg-slate-900/80 px-2 py-1 rounded-lg">
                                    <span className="text-slate-400">철광석</span>
                                    <span className={hasIron ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold'}>
                                        {res.iron || 0} / {reqs.iron || 0}개
                                    </span>
                                </div>
                                <div className="text-[11px] flex items-center justify-between bg-slate-900/80 px-2 py-1 rounded-lg">
                                    <span className="text-slate-400">목재</span>
                                    <span className={hasWood ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold'}>
                                        {res.wood || 0} / {reqs.wood || 0}개
                                    </span>
                                </div>
                                <div className="text-[11px] flex items-center justify-between bg-slate-900/80 px-2 py-1 rounded-lg">
                                    <span className="text-slate-400">마정석</span>
                                    <span className={hasMana ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold'}>
                                        {res.manaCrystal || 0} / {reqs.manaCrystal || 0}개
                                    </span>
                                </div>
                            </div>

                            <div className="flex items-center justify-between pt-1 flex-wrap gap-2">
                                <div className="text-[11px] text-amber-300 font-bold">
                                    보상: {wallRepairQuest.rewardGold.toLocaleString()} 골드 | +{wallRepairQuest.rewardExp.toLocaleString()} EXP | 공적치 +{wallRepairQuest.rewardMerit || 45}
                                </div>
                                <button
                                    onClick={handleWallRepairAction}
                                    disabled={!canAfford}
                                    className={`px-4 py-2 text-white rounded-xl text-xs font-black shadow-lg transition-all flex items-center gap-1.5 active:scale-95 ${
                                        canAfford
                                            ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-blue-950/50'
                                            : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                                    }`}
                                >
                                    <PackageCheck size={14} />
                                    <span>{canAfford ? '군수 자원 투입 및 방벽 공사 (4시간 진행)' : '필요 자원 부족'}</span>
                                </button>
                            </div>
                        </div>
                    );
                })()}

                {/* 5. 심야 치안 유지 및 암시장 단속 (MilitaryNightPatrol) */}
                {nightPatrolQuest && (
                    <div className="p-3.5 rounded-xl border border-indigo-500/80 bg-indigo-950/40 flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Moon size={18} className="text-indigo-400 shrink-0" />
                                <span className="text-xs font-black text-white">{nightPatrolQuest.title}</span>
                                <span className="text-[9px] bg-indigo-600 text-white px-1.5 py-0.2 rounded font-extrabold">수락 진행 중</span>
                            </div>
                            <div className="flex items-center gap-1 text-[11px] text-indigo-300 font-mono">
                                <Clock size={12} />
                                <span>3시간 소요</span>
                            </div>
                        </div>
                        <p className="text-xs text-slate-300">{nightPatrolQuest.details}</p>
                        <div className="flex gap-2 pt-1 flex-col sm:flex-row">
                            <button
                                onClick={() => handleNightPatrolAction(false)}
                                className="flex-1 py-2 bg-gradient-to-r from-indigo-700 to-purple-700 hover:from-indigo-600 hover:to-purple-600 text-white rounded-xl text-xs font-black transition-all border border-indigo-500 active:scale-95 shadow-lg shadow-indigo-950/50"
                            >
                                🌙 심야 거주지 순찰 (3시간 진행)
                            </button>
                            <button
                                onClick={() => handleNightPatrolAction(true)}
                                className="flex-1 py-2 bg-gradient-to-r from-rose-700 to-pink-700 hover:from-rose-600 hover:to-pink-600 text-white rounded-xl text-xs font-black transition-all border border-rose-500 active:scale-95 shadow-lg shadow-rose-950/50"
                            >
                                💰 불법 암시장 습격 단속 (3시간 진행)
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* 처리 결과 메시지 팝업 */}
            {actionMessage && (
                <div className="mt-3 p-2.5 rounded-xl bg-slate-950 border border-emerald-500/80 text-xs text-emerald-300 flex items-center justify-between animate-in fade-in">
                    <div className="flex items-center gap-2">
                        <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                        <span>{actionMessage}</span>
                    </div>
                    <button onClick={() => setActionMessage(null)} className="text-slate-500 hover:text-white text-[10px]">
                        닫기
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
    );
};

export default MilitaryCityActionPanel;
