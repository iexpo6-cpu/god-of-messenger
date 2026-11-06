import React, { useState } from 'react';
import { Character, SimpleStudent, EternalRivalCompanion, Enemy } from '../types';
import { X, Flame, Shield, Users, MapPin, Target, Award, Heart, Skull, Zap, AlertTriangle, Swords, Compass, FileText, ChevronRight, Sparkles } from 'lucide-react';
import { SHINRYOKU_UI_CONFIG, WORLD_GEOGRAPHY } from '../constants';
import { createRivalEnemies } from '../services/npcLifeEngine';
import { getValidRivalLocation, hasFoughtRivalThisMonth, recordRivalDuel, normalizeShinryokuType } from '../services/rivalLocationService';

interface Props {
    character: Character;
    onClose: () => void;
    onUpdateCharacter?: (newChar: Character, logMsg: string) => void;
    onBattle?: (enemy: Enemy | Enemy[], type?: string, source?: string, targetCity?: string, targetNation?: string) => void;
}

const EternalRivalModal: React.FC<Props> = ({ character, onClose, onUpdateCharacter, onBattle }) => {
    const [activeTab, setActiveTab] = useState<'profile' | 'party' | 'feats'>('profile');

    // 1. 전체 인맥 및 학원 동기에서 영원의 라이벌 검색 (단 1명 원칙)
    const allNpcs = [
        ...(character.socialNetwork || []),
        ...(character.schoolData?.classmates || [])
    ];

    // 영원의 라이벌 탐색 (살아있는 인물 우선, 없으면 사망/처단된 인물 확인)
    const activeEternalRival = allNpcs.find(n => n.isEternalRival && !n.isPurged && !n.isDead);
    const deadEternalRival = allNpcs.find(n => n.isEternalRival && (n.isPurged || n.isDead));
    const isEternalRivalDead = Boolean(character.hasEternalRivalDied || deadEternalRival);

    // 일반 라이벌들 목록 (참고용)
    const normalRivals = allNpcs.filter(n => n.isRival && !n.isEternalRival && !n.isPurged && !n.isDead);

    const rival = activeEternalRival || (isEternalRivalDead ? deadEternalRival : null);
    const rivalData = rival?.rivalData;

    // 플레이어와의 전력 비교 계산
    const getPowerComparison = (rivalLv: number, playerLv: number) => {
        const diff = rivalLv - playerLv;
        if (diff >= 3) return { text: "압도적으로 위협적임", color: "text-red-400 bg-red-950/60 border-red-800" };
        if (diff > 0) return { text: "라이벌이 근소 우세", color: "text-amber-400 bg-amber-950/60 border-amber-800" };
        if (diff === 0) return { text: "완벽히 호각세", color: "text-blue-400 bg-blue-950/60 border-blue-800" };
        return { text: "플레이어가 우세", color: "text-emerald-400 bg-emerald-950/60 border-emerald-800" };
    };

    return (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 backdrop-blur-sm p-2 sm:p-4 animate-in fade-in duration-200">
            <div className="bg-slate-900 border border-red-900/80 rounded-2xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
                
                {/* 상단 헤더 */}
                <div className="p-3 sm:p-4 bg-gradient-to-r from-red-950/80 via-slate-900 to-red-950/80 border-b border-red-800/40 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-red-900/40 border border-red-600/50 flex items-center justify-center text-red-400 shadow-inner">
                            <Flame size={20} className="animate-pulse text-red-400" />
                        </div>
                        <div>
                            <div className="flex items-center gap-1.5">
                                <h2 className="text-base sm:text-lg font-black text-white tracking-wide">
                                    영원의 라이벌
                                </h2>
                                <span className="px-1.5 py-0.5 text-[10px] font-bold bg-red-900/50 text-red-300 border border-red-700/60 rounded">
                                    단 한 명의 숙적
                                </span>
                            </div>
                            <p className="text-[11px] text-slate-400">
                                평생 당신의 발자취를 쫓으며 대결을 펼치는 유일무이한 운명의 호적수
                            </p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose}
                        className="w-8 h-8 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
                        aria-label="닫기"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* 1. 영원의 라이벌이 존재하지 않을 때 (미각성) */}
                {!rival && !isEternalRivalDead && (
                    <div className="p-6 sm:p-8 flex flex-col items-center justify-center text-center space-y-4 my-auto overflow-y-auto">
                        <div className="w-16 h-16 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-center text-slate-500 shadow-inner">
                            <Swords size={32} />
                        </div>
                        <div className="space-y-1.5 max-w-md">
                            <h3 className="text-base sm:text-lg font-bold text-slate-200">
                                현재 각성한 영원의 라이벌이 없습니다
                            </h3>
                            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                                학원이나 세상에서 만난 수많은 라이벌 중, 당신에게 패배하거나 강한 경쟁심을 품은 누군가가 상상을 초월하는 집념으로 각성하면 단 한 명의 <span className="text-red-400 font-semibold">'영원의 라이벌'</span>로 등극합니다.
                            </p>
                        </div>

                        {/* 현재 일반 라이벌 수 안내 카드 */}
                        <div className="w-full max-w-md p-3.5 bg-slate-800/50 border border-slate-700/60 rounded-xl text-left space-y-2">
                            <div className="flex items-center justify-between text-xs text-slate-300">
                                <span className="flex items-center gap-1.5 font-bold">
                                    <Target size={14} className="text-amber-400" /> 현재 대면 중인 일반 라이벌
                                </span>
                                <span className="font-extrabold text-amber-400">{normalRivals.length}명</span>
                            </div>
                            {normalRivals.length > 0 ? (
                                <div className="flex flex-wrap gap-1.5 pt-1">
                                    {normalRivals.map(r => (
                                        <span key={r.id} className="text-[11px] px-2 py-0.5 bg-slate-700/60 border border-slate-600/50 text-slate-200 rounded">
                                            {r.name} (Lv.{r.level})
                                        </span>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-[11px] text-slate-500">
                                    아직 학원이나 세상에서 마주친 라이벌이 없습니다.
                                </p>
                            )}
                        </div>
                    </div>
                )}

                {/* 2. 영원의 라이벌이 사망/처단되었을 때 */}
                {isEternalRivalDead && (
                    <div className="p-6 sm:p-8 flex flex-col items-center justify-center text-center space-y-4 my-auto overflow-y-auto">
                        <div className="w-16 h-16 rounded-2xl bg-red-950/40 border border-red-800/60 flex items-center justify-center text-red-500 shadow-inner">
                            <Skull size={32} />
                        </div>
                        <div className="space-y-1.5 max-w-md">
                            <h3 className="text-base sm:text-lg font-bold text-red-300">
                                영원의 라이벌은 영면에 들었습니다
                            </h3>
                            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                                {rival ? (
                                    <>당신의 손에 쓰러진 숙적 <span className="text-red-400 font-bold">{rival.name}</span>과의 운명의 굴레가 완전히 끊어졌습니다.</>
                                ) : (
                                    <>운명의 숙적과의 치열했던 결투 끝에 라이벌이 사망했습니다.</>
                                )}
                                <br />
                                영원의 라이벌과의 인연이 종결되었으므로, 더 이상 새로운 영원의 라이벌은 나타나지 않습니다.
                            </p>
                        </div>

                        {rival && (
                            <div className="w-full max-w-md p-3.5 bg-red-950/20 border border-red-900/50 rounded-xl text-left space-y-1.5">
                                <div className="text-xs font-bold text-red-400 flex items-center gap-1.5">
                                    <FileText size={13} /> 묘비명 기록
                                </div>
                                <div className="text-[11px] text-slate-300">
                                    • 성명: {rival.name} (최종 레벨: Lv.{rival.level})<br />
                                    • 직업: {rival.job || rival.classType || "전사"}<br />
                                    • 상태: {rival.purgedReason || "결투 후 처단되어 영면"}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* 3. 살아있는 영원의 라이벌이 활성 상태일 때 */}
                {rival && !isEternalRivalDead && (
                    <>
                        {/* 상단 탭 네비게이션 (모바일 가로 스크롤 최적화) */}
                        <div className="flex border-b border-slate-800 bg-slate-950/50 px-3 pt-2 gap-2 overflow-x-auto no-scrollbar">
                            <button
                                onClick={() => setActiveTab('profile')}
                                className={`px-3 py-2 text-xs font-bold rounded-t-lg transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                                    activeTab === 'profile'
                                        ? 'bg-slate-850 text-red-400 border-t-2 border-red-500 bg-slate-900'
                                        : 'text-slate-400 hover:text-slate-200'
                                }`}
                            >
                                <Target size={13} /> 기본 프로필 및 현황
                            </button>
                            <button
                                onClick={() => setActiveTab('party')}
                                className={`px-3 py-2 text-xs font-bold rounded-t-lg transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                                    activeTab === 'party'
                                        ? 'bg-slate-850 text-red-400 border-t-2 border-red-500 bg-slate-900'
                                        : 'text-slate-400 hover:text-slate-200'
                                }`}
                            >
                                <Users size={13} /> 결사대 동료 ({rivalData?.partyMembers?.length || 0}명)
                            </button>
                            <button
                                onClick={() => setActiveTab('feats')}
                                className={`px-3 py-2 text-xs font-bold rounded-t-lg transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                                    activeTab === 'feats'
                                        ? 'bg-slate-850 text-red-400 border-t-2 border-red-500 bg-slate-900'
                                        : 'text-slate-400 hover:text-slate-200'
                                }`}
                            >
                                <FileText size={13} /> 최근 행적 및 전적
                            </button>
                        </div>

                        {/* 본문 콘텐츠 스크롤 영역 */}
                        <div className="p-3.5 sm:p-5 overflow-y-auto space-y-4 flex-1">
                            
                            {/* TAB 1: 기본 프로필 및 현황 */}
                            {activeTab === 'profile' && (
                                <div className="space-y-4">
                                    {/* 라이벌 주요 정보 카드 */}
                                    <div className="p-3.5 sm:p-4 bg-slate-850/80 border border-slate-700/80 rounded-xl flex flex-col sm:flex-row items-center sm:items-start gap-3.5">
                                        <div className="relative">
                                            {rival.visualUrl ? (
                                                <img 
                                                    src={rival.visualUrl} 
                                                    alt={rival.name} 
                                                    className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl object-cover border-2 border-red-500/80 shadow-md"
                                                />
                                            ) : (
                                                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl bg-slate-800 border-2 border-red-500/80 flex items-center justify-center text-red-400 font-black text-xl">
                                                    {rival.name.slice(0, 1)}
                                                </div>
                                            )}
                                            <span className="absolute -bottom-2 -right-1 px-1.5 py-0.5 bg-red-600 text-white font-black text-[10px] rounded-md shadow">
                                                Lv.{rival.level}
                                            </span>
                                        </div>

                                        <div className="flex-1 text-center sm:text-left space-y-1.5 w-full">
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                                                <div>
                                                    <div className="flex items-center justify-center sm:justify-start gap-1.5">
                                                        <h3 className="text-base sm:text-lg font-black text-white">
                                                            {rival.name}
                                                        </h3>
                                                        <span className="px-1.5 py-0.5 bg-amber-950/60 text-amber-400 border border-amber-700/50 rounded text-[10px] font-bold">
                                                            {rival.job || rival.classType || "전사"}
                                                        </span>
                                                    </div>
                                                    <p className="text-[11px] text-slate-400">
                                                        국적: {rival.nation || "제국"} • 성격: {rival.personality || "불굴의 투지"}
                                                    </p>
                                                </div>

                                                {/* 전력 비교 뱃지 */}
                                                {(() => {
                                                    const comp = getPowerComparison(rival.level, character.level);
                                                    return (
                                                        <div className={`px-2 py-1 rounded-lg border text-[11px] font-bold inline-flex items-center justify-center gap-1 ${comp.color}`}>
                                                            <Zap size={12} /> {comp.text}
                                                        </div>
                                                    );
                                                })()}
                                            </div>

                                            {/* 신력 계통 */}
                                            <div className="flex items-center justify-center sm:justify-start gap-2 pt-1">
                                                <span className="text-[11px] text-slate-400 font-semibold">신력 계통:</span>
                                                <span className="text-xs font-bold text-red-300 bg-red-950/40 px-2 py-0.5 rounded border border-red-800/40">
                                                    {rival.shinryokuType || "투기 및 마도 오의"}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* 현재 위치 및 활동 현황 */}
                                    {(() => {
                                        const validLoc = getValidRivalLocation(rivalData?.currentLocation, rival?.nation);
                                        const rivalRegion = validLoc.region;
                                        const rivalNation = validLoc.nation;
                                        const rivalCity = validLoc.city;

                                        if (rivalData && rivalData.currentLocation !== validLoc.formatted) {
                                            rivalData.currentLocation = validLoc.formatted;
                                        }

                                        const playerLoc = character.currentLocation || { region: "아시아", nation: "대한민국", city: "서울" };
                                        const isAtSameLocation = (playerLoc.nation === rivalNation && playerLoc.city === rivalCity);
                                        const hasFoughtThisMonth = hasFoughtRivalThisMonth(rivalData, character.currentDate);

                                        const handleStartDuel = () => {
                                            if (!rival || !onBattle || hasFoughtThisMonth) return;
                                            recordRivalDuel(rival, character.currentDate);
                                            const enemies = createRivalEnemies(rival);
                                            onBattle(enemies, 'relation_battle', rival.id, rivalCity, rivalNation);
                                            onClose();
                                        };

                                        return (
                                            <div className="space-y-2.5">
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                                    <div className="p-3 bg-slate-800/60 border border-slate-700/60 rounded-xl space-y-2">
                                                        <div className="text-xs font-bold text-slate-300 flex items-center justify-between">
                                                            <span className="flex items-center gap-1.5">
                                                                <MapPin size={14} className="text-red-400" /> 현재 위치
                                                            </span>
                                                            {isAtSameLocation ? (
                                                                <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 animate-pulse">
                                                                    현지 체류 중!
                                                                </span>
                                                            ) : (
                                                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-700/60 text-slate-400 border border-slate-600/40">
                                                                    위치 미상
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className="text-sm font-black text-amber-300">
                                                            {isAtSameLocation ? `${rivalNation} ${rivalCity}` : "대륙 어딘가에 체류 중 (위치 미상)"}
                                                        </p>
                                                        {!isEternalRivalDead && rival && (
                                                            <div className="pt-0.5">
                                                                {isAtSameLocation ? (
                                                                    hasFoughtThisMonth ? (
                                                                        <div className="w-full py-2 px-2.5 rounded-lg bg-slate-800/80 border border-slate-700 text-slate-400 text-[11px] font-bold flex items-center justify-center gap-1.5">
                                                                            <Swords size={13} className="text-slate-500" /> 이번 달 결투 완료 (다음 달 재도전 가능)
                                                                        </div>
                                                                    ) : (
                                                                        <button
                                                                            onClick={handleStartDuel}
                                                                            disabled={!onBattle}
                                                                            className="w-full py-2 px-3 rounded-lg bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white text-xs font-black shadow-md flex items-center justify-center gap-1.5 transition transform hover:scale-[1.02] active:scale-95 cursor-pointer"
                                                                        >
                                                                            <Swords size={14} /> 현지에서 결투 신청
                                                                        </button>
                                                                    )
                                                                ) : (
                                                                    <div className="w-full py-1.5 px-2 rounded-lg bg-slate-900/60 border border-slate-700/50 text-slate-400 text-[11px] font-medium flex items-center justify-center gap-1.5">
                                                                        <Compass size={13} className="text-slate-500" /> 해당 도시에 직접 도착 시 위치 감지
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="p-3 bg-slate-800/60 border border-slate-700/60 rounded-xl space-y-1">
                                                        <div className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                                                            <Target size={14} className="text-amber-400" /> 숙적의 궁극적 목표
                                                        </div>
                                                        <p className="text-xs text-slate-200 font-medium leading-relaxed">
                                                            {rivalData?.targetGoal || "플레이어를 뛰어넘어 대륙 최강의 패자가 되는 것"}
                                                        </p>
                                                    </div>
                                                </div>

                                                {/* influence & alignment status card */}
                                                <div className="p-3.5 bg-slate-800/60 border border-slate-700/60 rounded-xl space-y-2">
                                                    <div className="text-xs font-bold text-slate-300 flex items-center justify-between">
                                                        <span className="flex items-center gap-1.5">
                                                            <Sparkles size={14} className="text-amber-400" /> 세력 영향력 및 성향 현황
                                                        </span>
                                                        {(rivalData?.infamy || 0) >= 200 ? (
                                                            <span className="px-2 py-0.5 rounded text-[10px] font-black bg-red-950 text-red-300 border border-red-700 animate-pulse">
                                                                ☠️ 칠흑의 악도 (악행 전념)
                                                            </span>
                                                        ) : (rivalData?.goodWill || 0) >= 200 ? (
                                                            <span className="px-2 py-0.5 rounded text-[10px] font-black bg-emerald-950 text-emerald-300 border border-emerald-700 animate-pulse">
                                                                🌟 확고한 선의 (선행 전념)
                                                            </span>
                                                        ) : (
                                                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                                                                ⚖️ 행적 탐색 중 (중립)
                                                            </span>
                                                        )}
                                                    </div>

                                                    <div className="grid grid-cols-2 gap-2 text-center pt-1">
                                                        <div className="p-2.5 bg-slate-900/80 border border-emerald-500/30 rounded-lg">
                                                            <div className="text-[10px] text-emerald-400 font-bold">선한 영향력 (명성/선행)</div>
                                                            <div className="text-base font-black text-emerald-300 mt-0.5">
                                                                {rivalData?.goodWill || 0} <span className="text-[10px] text-slate-500 font-normal">/ 200</span>
                                                            </div>
                                                            <div className="w-full bg-slate-800 h-1.5 rounded-full mt-1.5 overflow-hidden">
                                                                <div 
                                                                    className="bg-emerald-400 h-full rounded-full transition-all duration-300"
                                                                    style={{ width: `${Math.min(100, ((rivalData?.goodWill || 0) / 200) * 100)}%` }}
                                                                />
                                                            </div>
                                                        </div>

                                                        <div className="p-2.5 bg-slate-900/80 border border-red-500/30 rounded-lg">
                                                            <div className="text-[10px] text-red-400 font-bold">악명도 (악행 수치)</div>
                                                            <div className="text-base font-black text-red-300 mt-0.5">
                                                                {rivalData?.infamy || 0} <span className="text-[10px] text-slate-500 font-normal">/ 200</span>
                                                            </div>
                                                            <div className="w-full bg-slate-800 h-1.5 rounded-full mt-1.5 overflow-hidden">
                                                                <div 
                                                                    className="bg-red-500 h-full rounded-full transition-all duration-300"
                                                                    style={{ width: `${Math.min(100, ((rivalData?.infamy || 0) / 200) * 100)}%` }}
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })()}

                                    {/* 현재 실시간 활동 */}
                                    <div className="p-3.5 bg-slate-800/60 border border-slate-700/60 rounded-xl space-y-1.5">
                                        <div className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                                            <Compass size={14} className="text-cyan-400" /> 현재 수행 중인 활동
                                        </div>
                                        <p className="text-xs text-slate-300 leading-relaxed">
                                            "{rivalData?.currentActivity || "결사대 동료들과 함께 고위 던전의 마수를 토벌하며 극한의 실전을 치르는 중"}"
                                        </p>
                                    </div>

                                    {/* 라이벌 관계 수치 및 심리 상태 */}
                                    <div className="p-3.5 bg-slate-800/60 border border-slate-700/60 rounded-xl space-y-2.5">
                                        <div className="text-xs font-bold text-slate-300 flex items-center justify-between">
                                            <span className="flex items-center gap-1.5">
                                                <Heart size={14} className="text-rose-400" /> 심리 및 관계 현황
                                            </span>
                                        </div>

                                        <div className="grid grid-cols-3 gap-2 text-center">
                                            <div className="p-2 bg-slate-900/70 border border-slate-800 rounded-lg">
                                                <div className="text-[10px] text-slate-400">존중도</div>
                                                <div className="text-sm font-black text-amber-400">{rival.respect || 0}</div>
                                            </div>
                                            <div className="p-2 bg-slate-900/70 border border-slate-800 rounded-lg">
                                                <div className="text-[10px] text-slate-400">긴장도</div>
                                                <div className="text-sm font-black text-red-400">{rival.tension || 0}</div>
                                            </div>
                                            <div className="p-2 bg-slate-900/70 border border-slate-800 rounded-lg">
                                                <div className="text-[10px] text-slate-400">호감도</div>
                                                <div className="text-sm font-black text-slate-200">{rival.affection || 0}</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* TAB 2: 결사대 동료 목록 */}
                            {activeTab === 'party' && (
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between text-xs text-slate-400 px-1">
                                        <span>라이벌이 이끄는 정예 파티원 목록</span>
                                        <span className="text-red-400 font-bold">결투 시 함께 출전 가능</span>
                                    </div>

                                    {(!rivalData?.partyMembers || rivalData.partyMembers.length === 0) ? (
                                        <div className="p-8 text-center bg-slate-850/50 border border-slate-800 rounded-xl space-y-2">
                                            <Users size={24} className="mx-auto text-slate-500" />
                                            <p className="text-xs text-slate-400">
                                                아직 결사대 동료를 꾸리지 않고 홀로 수련 중입니다.
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                            {rivalData.partyMembers.map((comp: EternalRivalCompanion) => (
                                                <div 
                                                    key={comp.id}
                                                    className="p-3 bg-slate-850/90 border border-slate-700/80 rounded-xl flex items-start gap-2.5 shadow-sm"
                                                >
                                                    <div className="w-11 h-11 rounded-lg bg-slate-800 border border-slate-600 flex items-center justify-center text-slate-300 font-bold text-sm shrink-0 overflow-hidden">
                                                        {comp.visualUrl ? (
                                                            <img src={comp.visualUrl} alt={comp.name} className="w-full h-full object-cover" />
                                                        ) : (
                                                            comp.name.slice(0, 1)
                                                        )}
                                                    </div>

                                                    <div className="flex-1 min-w-0 space-y-1">
                                                        <div className="flex items-center justify-between gap-1">
                                                            <div className="font-bold text-xs text-slate-100 truncate">
                                                                {comp.name}
                                                            </div>
                                                            <span className="px-1.5 py-0.2 bg-slate-800 text-slate-300 rounded text-[10px] font-bold shrink-0">
                                                                Lv.{comp.level}
                                                            </span>
                                                        </div>

                                                        <div className="flex items-center gap-1.5 flex-wrap">
                                                            <span className="px-1.5 py-0.5 bg-red-950/60 border border-red-800/50 text-red-300 text-[9px] font-bold rounded">
                                                                {comp.role}
                                                            </span>
                                                            {comp.job && (
                                                                <span className="px-1.5 py-0.5 bg-slate-800 text-slate-400 text-[9px] rounded">
                                                                    {comp.job}
                                                                </span>
                                                            )}
                                                            <span className="px-1.5 py-0.5 bg-indigo-950/60 border border-indigo-800/50 text-indigo-300 text-[9px] font-bold rounded">
                                                                {normalizeShinryokuType(comp.shinryokuType)}
                                                            </span>
                                                        </div>

                                                        <p className="text-[10px] text-slate-400 leading-tight pt-0.5">
                                                            {comp.joinedReason || "라이벌의 신념에 감복하여 합류함"}
                                                        </p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* TAB 3: 최근 행적 및 전적 */}
                            {activeTab === 'feats' && (
                                <div className="space-y-3">
                                    {/* 역대 전적 카드 */}
                                    <div className="p-3.5 bg-slate-850/90 border border-slate-700/80 rounded-xl space-y-2">
                                        <div className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                                            <Swords size={14} className="text-red-400" /> 역대 결투 전적
                                        </div>
                                        <div className="grid grid-cols-3 gap-2 text-center pt-1">
                                            <div className="p-2 bg-slate-900/60 rounded-lg border border-slate-800">
                                                <div className="text-[10px] text-slate-400">총 결투 횟수</div>
                                                <div className="text-sm font-extrabold text-white">{rivalData?.totalDuelsCount || 0}회</div>
                                            </div>
                                            <div className="p-2 bg-slate-900/60 rounded-lg border border-slate-800">
                                                <div className="text-[10px] text-emerald-400">플레이어 승리</div>
                                                <div className="text-sm font-extrabold text-emerald-400">{rivalData?.playerWins || 0}회</div>
                                            </div>
                                            <div className="p-2 bg-slate-900/60 rounded-lg border border-slate-800">
                                                <div className="text-[10px] text-red-400">라이벌 승리</div>
                                                <div className="text-sm font-extrabold text-red-400">{rivalData?.rivalWins || 0}회</div>
                                            </div>
                                        </div>
                                        {rivalData?.lastDuelDate && (
                                            <p className="text-[10px] text-slate-400 text-right">
                                                마지막 대결일: {rivalData.lastDuelDate}
                                            </p>
                                        )}
                                    </div>

                                    {/* 최근 행적 일지 */}
                                    <div className="p-3.5 bg-slate-850/90 border border-slate-700/80 rounded-xl space-y-2">
                                        <div className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                                            <FileText size={14} className="text-amber-400" /> 숙적의 최근 주요 행적
                                        </div>

                                        {(!rivalData?.recentFeats || rivalData.recentFeats.length === 0) ? (
                                            <p className="text-xs text-slate-400 py-3 text-center">
                                                아직 기록된 최근 행적이 없습니다.
                                            </p>
                                        ) : (
                                            <ul className="space-y-1.5">
                                                {rivalData.recentFeats.map((feat: string, idx: number) => (
                                                    <li key={idx} className="text-xs text-slate-300 flex items-start gap-2 bg-slate-900/50 p-2 rounded-lg border border-slate-800">
                                                        <span className="text-red-400 font-bold shrink-0">•</span>
                                                        <span>{feat}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>
                                </div>
                            )}

                        </div>
                    </>
                )}

                {/* 하단 닫기 바 */}
                <div className="p-3 bg-slate-950 border-t border-slate-800 flex justify-end">
                    <button
                        onClick={onClose}
                        className="w-full sm:w-auto px-5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition-colors"
                    >
                        닫기
                    </button>
                </div>

            </div>
        </div>
    );
};

export default EternalRivalModal;
