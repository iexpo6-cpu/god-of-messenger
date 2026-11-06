
import React, { useState } from 'react';
import { Character, DiplomaticStatus, Enemy, DivineDiplomacyStatus, DivineRelation } from '../types';
import { X, Globe, ShieldCheck, Sword, Skull, Flame, Sparkles, Crown, Lock, Link, Coins, Zap, AlertTriangle, UserMinus, Heart, Info, ArrowRight, Loader2, ShieldAlert, MapPin, Gavel, TrendingUp, Handshake, CheckCircle, Clock, Users2, Settings } from 'lucide-react';
import { NATION_LIST } from '../nationalDiplomacy';
import { processDivineProtection, processDivineInvasion } from '../services/templeForeignService';
import ActionResultModal, { ResultData } from './ActionResultModal';
import { calculateTempleMajesty } from '../templedefensesystem';
import { SHINRYOKU_TYPES_LIST, SHINRYOKU_UI_CONFIG, WORLD_GEOGRAPHY } from '../constants';
import { generateNationalLeader } from '../warleadersystem';
import VassalManagementModal from './VassalManagementModal';
import DivineRelationshipModal from './DivineRelationshipModal'; 
import ProtectedNationManagementModal from './ProtectedNationManagementModal';
import TempleVassalManagementModal from './TempleVassalManagementModal';
import { getDaysDiff, addDays } from '../utils';

interface Props {
    character: Character;
    templeCity: string;
    onClose: () => void;
    onUpdateCharacter: (newChar: Character, logMsg: string) => void;
    onBattle?: (enemy: Enemy | Enemy[], type: string, source: string, targetCity?: string, targetNation?: string) => void;
}

const STATUS_STYLE_DIVINE: Record<DivineDiplomacyStatus, { color: string, bg: string, border: string, icon: any, label: string }> = {
    [DivineDiplomacyStatus.BLESSED]: { color: 'text-green-400', bg: 'bg-green-950/20', border: 'border-green-500/50', icon: ShieldCheck, label: '비호 중' },
    [DivineDiplomacyStatus.NEUTRAL]: { color: 'text-blue-400', bg: 'bg-blue-950/20', border: 'border-blue-500/50', icon: Globe, label: '포교 중' },
    [DivineDiplomacyStatus.SUBJUGATED]: { color: 'text-amber-400', bg: 'bg-amber-950/20', border: 'border-amber-500/50', icon: Crown, label: '굴복함' },
    [DivineDiplomacyStatus.CORRUPTED]: { color: 'text-red-500', bg: 'bg-red-950/30', border: 'border-red-600/50', icon: Skull, label: '타락함' }
};

const TempleForeignAffairsModal: React.FC<Props> = ({ character, templeCity, onClose, onUpdateCharacter, onBattle }) => {
    const [selectedNation, setSelectedNation] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [resultData, setResultData] = useState<ResultData | null>(null);
    const [confirmAction, setConfirmAction] = useState<(() => void) | null>(null);
    const [isVassalModalOpen, setIsVassalModalOpen] = useState(false);
    const [isDivineRelModalOpen, setIsDivineRelModalOpen] = useState(false); 
    const [isProtectedModalOpen, setIsProtectedModalOpen] = useState(false);
    const [isTempleVassalModalOpen, setIsTempleVassalModalOpen] = useState(false);

    const templeKey = `${character.currentLocation?.nation}_${templeCity}`;
    const currentMajesty = calculateTempleMajesty(character, templeKey);
    const templeDiplomacy = character.templeDiplomacy || {};

    const templeElement = SHINRYOKU_TYPES_LIST.find(type => templeCity.includes(type.replace('계', ''))) || "광휘계";
    const uiConfig = SHINRYOKU_UI_CONFIG[templeElement] || SHINRYOKU_UI_CONFIG.default;

    const handleAction = (type: 'Protect' | 'Invade') => {
        if (!selectedNation) {
            setResultData({
                type: 'info',
                title: '대상 미선택',
                message: '사자의 권능을 행사할 국가를 먼저 선택하십시오.',
                items: []
            });
            return;
        }

        const rel = templeDiplomacy[selectedNation] || { status: DivineDiplomacyStatus.NEUTRAL };

        if (type === 'Protect' && rel.status === DivineDiplomacyStatus.SUBJUGATED) {
            setResultData({
                type: 'warning',
                title: '의식 불가',
                message: '이미 굴복하여 지배 중인 국가에는 비호 의식을 거행할 수 없습니다.',
                items: [{ label: '현재 상태', after: '굴복/성역' }]
            });
            return;
        }

        if (type === 'Invade' && rel.status === DivineDiplomacyStatus.BLESSED) {
            setResultData({
                type: 'warning',
                title: '명령 불가',
                message: '사자의 비호를 약속한 국가를 침공하는 것은 신성 모독입니다.',
                items: [{ label: '현재 상태', after: '축복/비호' }]
            });
            return;
        }

        const currentFaith = Number(character.faith || 0);

        if (type === 'Protect' && currentFaith < 50000) {
            setResultData({
                type: 'warning',
                title: '신앙심 부족',
                message: '국가를 비호하기 위한 대규모 신성 기운(신앙심)이 부족합니다.',
                items: [
                    { label: '필요 신앙심', after: '50,000' },
                    { label: '현재 신앙심', after: `${currentFaith.toLocaleString()}` }
                ]
            });
            return;
        }

        if (type === 'Invade' && currentFaith < 100) {
            setResultData({
                type: 'warning',
                title: '신앙심 부족',
                message: '국가를 정벌하기 위한 신성한 기운(신앙심)이 부족합니다.',
                items: [
                    { label: '필요 신앙심', after: '100' },
                    { label: '현재 신앙심', after: `${currentFaith}` }
                ]
            });
            return;
        }

        if (type === 'Invade' && currentMajesty < 2000) {
            setResultData({
                type: 'warning',
                title: '위엄도 부족',
                message: '국가를 무력으로 굴복시키기에는 성전의 위엄이 아직 부족합니다.',
                items: [
                    { label: '필요 위엄도', after: '2,000' },
                    { label: '현재 위엄도', after: `${Math.floor(currentMajesty)}` }
                ]
            });
            return;
        }

        const execute = () => {
            const targetNationName = selectedNation; 
            if (!targetNationName) return;

            let targetCapital = "";
            let targetRegion = "";
            for (const r in WORLD_GEOGRAPHY) {
                if (WORLD_GEOGRAPHY[r][targetNationName]) {
                    targetCapital = WORLD_GEOGRAPHY[r][targetNationName].capital;
                    targetRegion = r;
                    break;
                }
            }

            const nextCharacterState = { 
                ...character,
                currentLocation: targetCapital ? { 
                    region: targetRegion, 
                    nation: targetNationName, 
                    city: targetCapital 
                } : character.currentLocation,
                faith: Math.max(0, (character.faith || 0) - (type === 'Invade' ? 100 : 50000))
            };

            if (type === 'Invade') {
                if (onBattle) {
                    onUpdateCharacter(nextCharacterState, `[신성 정벌] ${targetNationName} 정벌 작전 개시...`);
                    const leader = generateNationalLeader(targetNationName, character.level);
                    onBattle(
                        [leader],           
                        'divine_invasion',  
                        targetNationName, 
                        targetCapital,      
                        targetNationName    
                    );
                    onClose();
                }
                return;
            }

            setIsProcessing(true);
            setTimeout(() => {
                const { newChar: protectedChar, result } = processDivineProtection(character, selectedNation!);
                
                if (!result) {
                    setResultData({
                        type: 'warning',
                        title: '의식 중단',
                        message: '성전의 기반 시설 정보가 부족하여 의식을 진행할 수 없습니다.',
                        items: []
                    });
                    setIsProcessing(false);
                    return;
                }

                const isMagyeInvolved = result.majestyChange < 0;
            
                onUpdateCharacter(protectedChar, `[성전 비호] ${selectedNation}을(를) 신의 가호 아래 두었습니다. 성전의 위엄이 ${result.majestyChange > 0 ? '상승' : '하락'}했습니다.`);
                setResultData({
                    type: isMagyeInvolved ? 'failure' : 'levelup',
                    title: isMagyeInvolved ? '불경한 비호' : '신의 가호 선포',
                    message: isMagyeInvolved 
                        ? `${selectedNation}과 같은 불경한 세력을 비호한 대가로 성전의 위엄이 크게 실추되었습니다.\n백성들의 원성이 자자합니다.`
                        : `${selectedNation}이(가) 사자님의 비호를 받게 되었습니다.\n향후 5년간 성전의 보호를 받으며 평화를 유지할 것입니다.`,
                    items: [
                        { label: '위엄도 변화', after: result.majestyChange > 0 ? `+${result.majestyChange}` : `${result.majestyChange}` },
                        { label: '소모 신앙심', after: '-50,000' },
                        ...(result.rewardItem ? [{ label: '기증 성물', after: result.rewardItem.name }] : [])
                    ]
                });
                setIsProcessing(false);
            }, 1500);
        };

        setConfirmAction(() => execute);
        setResultData({
            type: 'warning',
            title: type === 'Protect' ? '비호 의식 확정' : '침략 명령 확정',
            message: `${selectedNation}을(를) 대상으로 ${type === 'Protect' ? '대규모 비호 의식을 거행' : '무력 침공을 개시'}하시겠습니까?`,
            items: [
                { label: '대상 국가', after: selectedNation },
                { label: '소모 신앙심', after: type === 'Protect' ? '50,000' : '100' }
            ]
        });
    };

    const handleModalClose = () => {
        setResultData(null);
        setConfirmAction(null);
    };

    return (
        <div className="fixed inset-0 z-[140] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-in fade-in zoom-in-95">
            {resultData && (
                <ActionResultModal 
                    data={resultData} 
                    onClose={handleModalClose} 
                    onContinue={confirmAction ? () => { confirmAction(); handleModalClose(); } : undefined} 
                />
            )}

            {isVassalModalOpen && selectedNation && (
                <VassalManagementModal 
                    character={character}
                    targetNation={selectedNation}
                    onClose={() => setIsVassalModalOpen(false)}
                    onUpdateCharacter={onUpdateCharacter}
                />
            )}

            {isDivineRelModalOpen && (
                <DivineRelationshipModal
                    character={character}
                    onClose={() => setIsDivineRelModalOpen(false)}
                    onUpdateCharacter={onUpdateCharacter}
                    onBattle={(enemy, type, source, targetCity, targetNation) => onBattle!(enemy, type, source, targetCity, targetNation)}
                />
            )}

            {isProtectedModalOpen && selectedNation && (
                <ProtectedNationManagementModal
                    character={character}
                    targetNation={selectedNation}
                    templeElement={templeElement}
                    onClose={() => setIsProtectedModalOpen(false)}
                    onUpdateCharacter={onUpdateCharacter}
                />
            )}

            {isTempleVassalModalOpen && selectedNation && (
                <TempleVassalManagementModal
                    character={character}
                    targetNation={selectedNation}
                    onClose={() => setIsTempleVassalModalOpen(false)}
                    onUpdateCharacter={onUpdateCharacter}
                />
            )}
            
            <div className={`bg-slate-900 border-2 w-full max-w-5xl h-[92vh] md:h-[85vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden relative ${uiConfig.border}`}>
                
                <div className={`p-4 md:p-6 border-b bg-slate-950 flex justify-between items-center shrink-0 ${uiConfig.border}`}>
                    <div className="flex items-center">
                        <Globe size={24} className={`${uiConfig.text} mr-3 md:mr-4 animate-spin-slow`} />
                        <div>
                             <h2 className="text-lg md:text-2xl font-bold text-white tracking-widest">신성 외교</h2>
                            <p className={`text-[10px] md:text-xs font-bold ${uiConfig.text}`}>{templeElement} 성전: 사자의 신성 외교 상황실</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-slate-500 hover:text-white p-1.5 md:p-2 rounded-full hover:bg-slate-800 transition-colors"><X className="w-5 h-5 md:w-6 md:h-6" /></button>
                </div>

                <div className="flex flex-1 overflow-hidden flex-col md:flex-row">
                    <div className={`w-full md:w-80 border-r border-slate-800 p-4 overflow-y-auto custom-scrollbar shrink-0 bg-slate-950/30 flex flex-col overscroll-contain h-full ${selectedNation ? 'hidden md:flex' : 'flex'}`}>
                        <h3 className="text-xs font-bold text-slate-500 uppercase mb-4 flex items-center gap-2">
                            <MapPin size={14} className="text-amber-500"/> 포교 및 관리 대상
                        </h3>
                        <div className="space-y-2">
                            {NATION_LIST.map((name, idx) => {
                                const rel = templeDiplomacy[name] || { status: DivineDiplomacyStatus.NEUTRAL, faithPoints: 50, influence: 10, tension: 0 };
                                const style = STATUS_STYLE_DIVINE[rel.status];
                                const isMyNation = name === character.nation;
                                return (
                                    <button
                                        key={`${name}-${idx}`}
                                        onClick={() => setSelectedNation(name)}
                                        className={`w-full p-3 rounded-xl border text-left transition-all flex flex-col gap-1 ${selectedNation === name ? 'bg-indigo-900/40 border-indigo-500 shadow-lg' : 'bg-slate-900 border border-slate-800 hover:border-slate-700'} ${rel.status === DivineDiplomacyStatus.CORRUPTED ? 'border-red-900/50' : ''}`}
                                    >
                                        <div className="flex justify-between items-center w-full">
                                            <span className={`font-bold text-sm truncate ${isMyNation ? 'text-blue-400' : 'text-slate-200'}`}>
                                                {name}
                                            </span>
                                            {rel.status === DivineDiplomacyStatus.SUBJUGATED && <Crown size={12} className="text-amber-400" />}
                                            {rel.status === DivineDiplomacyStatus.BLESSED && <Sparkles size={12} className="text-green-400" />}
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className={`text-[9px] font-bold ${style.color}`}>{style.label}</span>
                                            <div className="flex items-center gap-1">
                                                <Heart size={8} className="text-pink-500 fill-pink-500"/>
                                                <span className="text-[9px] font-mono text-slate-500">{rel.faithPoints}</span>
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className={`flex-1 p-4 md:p-8 overflow-y-auto custom-scrollbar bg-slate-900 flex flex-col overscroll-contain h-full ${selectedNation ? 'flex' : 'hidden md:flex'}`}>
                        {selectedNation && (
                            <button 
                                onClick={() => setSelectedNation(null)}
                                className="md:hidden flex items-center text-slate-400 hover:text-white mb-4 bg-slate-800/50 w-fit px-3 py-1.5 rounded-lg border border-slate-700"
                            >
                                <ArrowRight size={18} className="rotate-180 mr-2" /> 국가 목록으로
                            </button>
                        )}
                        {selectedNation ? (
                            <div className="max-w-2xl mx-auto w-full space-y-8 animate-in slide-in-from-right-4 pb-10">
                                {(() => {
                                    const rel = templeDiplomacy[selectedNation] || { status: DivineDiplomacyStatus.NEUTRAL, faithPoints: 50, influence: 10, tributeLevel: 0, tension: 0 };
                                    const style = STATUS_STYLE_DIVINE[rel.status];
                                    const StatusIcon = style.icon;
                                    const isSubjugated = rel.status === DivineDiplomacyStatus.SUBJUGATED;
                                    const isBlessed = rel.status === DivineDiplomacyStatus.BLESSED;

                                    const today = character.currentDate || '2000-01-01';
                                    const fallbackEndDate = isBlessed 
                                        ? (rel.protectionStartDate ? addDays(rel.protectionStartDate, 1825) : addDays(today, (rel.protectionYears || 5) * 365))
                                        : (rel.subjugatedStartDate ? addDays(rel.subjugatedStartDate, 1825) : addDays(today, (rel.subjugatedYears || 5) * 365));
                                    
                                    const expiryDate = isBlessed ? (rel.protectionEndDate || fallbackEndDate) : (rel.subjugatedEndDate || fallbackEndDate);
                                    
                                    const daysLeft = getDaysDiff(today, expiryDate);
                                    const totalDays = 1825; 
                                    const progressPercent = Math.max(0, Math.min(100, (1 - daysLeft / totalDays) * 100));

                                    return (
                                        <>
                                            <div className={`p-6 md:p-8 rounded-3xl border ${style.border} ${style.bg} relative overflow-hidden backdrop-blur-md shadow-2xl`}>
                                                <div className="absolute top-0 right-0 p-8 opacity-5"><StatusIcon size={160} /></div>
                                                <div className="relative z-10">
                                                    <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-6">
                                                        <div>
                                                            <span className={`text-xs font-bold px-3 py-1 rounded-full border ${style.border} ${style.color} bg-slate-950/80 shadow-sm`}>
                                                                {style.label} (성역 상태)
                                                            </span>
                                                            <h3 className="text-2xl md:text-3xl font-bold text-white mt-3 font-cinzel">{selectedNation}</h3>
                                                            <p className="text-xs text-slate-400 mt-1">해당 국가 내 신성 영향력 및 포교 현황 보고</p>
                                                        </div>
                                                        <div className="text-left md:text-right bg-slate-950/60 p-3.5 rounded-2xl border border-white/5">
                                                            <div className="text-[11px] text-slate-400 font-bold mb-1">보유 신앙심</div>
                                                            <div className={`text-xl md:text-3xl font-mono font-bold ${rel.faithPoints > 500 ? 'text-green-400' : rel.faithPoints > 200 ? 'text-blue-400' : 'text-slate-400'}`}>
                                                                {rel.faithPoints.toLocaleString()}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="bg-slate-950/70 p-4 md:p-5 rounded-2xl border border-white/10 grid grid-cols-2 gap-4">
                                                        <div className="text-center border-r border-white/10 pr-2">
                                                            <div className="text-[11px] text-slate-400 font-bold mb-1">성전 영향력</div>
                                                            <div className="text-lg md:text-xl font-bold text-indigo-300 font-mono">{rel.influence}%</div>
                                                        </div>
                                                        <div className="text-center pl-2">
                                                            <div className="text-[11px] text-slate-400 font-bold mb-1">기여 등급</div>
                                                            <div className="text-lg md:text-xl font-bold text-amber-400 font-mono">계급 {rel.tributeLevel}</div>
                                                        </div>
                                                    </div>

                                                    {(isBlessed || isSubjugated) && (
                                                        <div className="mt-5 space-y-2.5 bg-slate-950/80 p-4 rounded-2xl border border-white/10 shadow-lg animate-in fade-in">
                                                            <div className="flex justify-between items-center flex-wrap gap-2">
                                                                <div className="flex items-center gap-2">
                                                                    <Clock size={16} className="text-blue-400" />
                                                                    <span className="text-xs text-slate-200 font-bold">
                                                                        {isBlessed ? '비호 만료 잔여 기간' : '지배 만료 잔여 기간'}
                                                                    </span>
                                                                </div>
                                                                <span className={`text-xs sm:text-sm font-black font-mono ${daysLeft > 365 ? 'text-blue-400' : 'text-red-400 animate-pulse'}`}>
                                                                    남은 기간 {daysLeft}일 ({Math.ceil(daysLeft/30)}개월)
                                                                </span>
                                                            </div>
                                                            <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                                                                <div 
                                                                    className={`h-full transition-all duration-1000 ${isBlessed ? 'bg-gradient-to-r from-green-900 to-green-400' : 'bg-gradient-to-r from-indigo-900 to-indigo-400'}`}
                                                                    style={{ width: `${progressPercent}%` }}
                                                                ></div>
                                                            </div>
                                                            <div className="flex justify-between text-[10px] text-slate-400 font-bold">
                                                                <span>시작일: {isBlessed ? rel.protectionStartDate || '기록 없음' : rel.subjugatedStartDate || '기록 없음'}</span>
                                                                <span>만료 예정일: {expiryDate}</span>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                {/* 신의 비호 카드 */}
                                                <div className={`bg-slate-950 p-6 rounded-3xl border border-indigo-500/40 flex flex-col group hover:border-indigo-400 transition-all shadow-xl relative overflow-hidden ${isSubjugated ? 'opacity-50 grayscale' : ''}`}>
                                                    <div className="flex items-center justify-between mb-3">
                                                        <div className="flex items-center gap-2">
                                                            <Sparkles size={28} className="text-indigo-400 group-hover:scale-110 transition-transform" />
                                                            <h4 className="text-lg font-bold text-white">신의 비호</h4>
                                                        </div>
                                                        <span className="text-[10px] font-bold text-amber-300 bg-amber-950/80 px-2.5 py-1 rounded-lg border border-amber-500/40 flex items-center gap-1 shadow-sm">
                                                            <Flame size={12} className="text-amber-400 fill-amber-400" /> 신앙심 50,000 소모
                                                        </span>
                                                    </div>

                                                    <p className="text-xs text-slate-300 mb-4 leading-relaxed">
                                                        대규모 신성 의식을 거행하여 선택한 국가에 신의 가호를 내립니다. 성전의 위엄이 상승하며 해당 국가를 축복 상태로 지속 관리할 수 있습니다.
                                                    </p>

                                                    <div className="bg-indigo-950/50 border border-indigo-500/30 rounded-xl p-3 my-2 flex items-center justify-between">
                                                        <span className="text-xs font-bold text-indigo-200 flex items-center gap-1.5">
                                                            <Flame size={14} className="text-amber-400 animate-pulse" /> 의식 필요 신앙심
                                                        </span>
                                                        <span className="text-sm font-black font-mono text-amber-300">
                                                            50,000 신앙심
                                                        </span>
                                                    </div>

                                                    <div className="mt-auto pt-3">
                                                        {isBlessed ? (
                                                            <button 
                                                                onClick={() => setIsProtectedModalOpen(true)}
                                                                className="w-full py-3.5 bg-green-700 hover:bg-green-600 text-white rounded-xl font-bold text-xs sm:text-sm shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2"
                                                            >
                                                                <Settings size={18}/> 비호 국가 세부 관리
                                                            </button>
                                                        ) : (
                                                            <button 
                                                                onClick={() => handleAction('Protect')}
                                                                disabled={isProcessing || isSubjugated}
                                                                className={`w-full py-3.5 rounded-xl font-bold text-xs sm:text-sm shadow-lg transition-all active:scale-95 ${isSubjugated ? 'bg-slate-800 text-slate-600 cursor-not-allowed border border-slate-700' : 'bg-indigo-600 hover:bg-indigo-500 text-white border border-indigo-400/50'} flex items-center justify-center gap-2`}
                                                            >
                                                                {isSubjugated ? <><Lock size={18}/> 굴복 중으로 의식 불가</> : <><Handshake size={18}/> 비호 의식 거행 (신앙심 50,000 소모)</>}
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* 신성 정벌 카드 */}
                                                <div className={`bg-slate-950 p-6 rounded-3xl border border-red-900/40 flex flex-col group hover:border-red-600 transition-all shadow-xl relative overflow-hidden ${isBlessed ? 'opacity-50 grayscale' : ''}`}>
                                                    <div className="flex items-center justify-between mb-3">
                                                        <div className="flex items-center gap-2">
                                                            <Skull size={28} className="text-red-500 group-hover:scale-110 transition-transform" />
                                                            <h4 className="text-lg font-bold text-white">신성 정벌</h4>
                                                        </div>
                                                        <span className="text-[10px] font-bold text-red-300 bg-red-950/80 px-2.5 py-1 rounded-lg border border-red-500/40 flex items-center gap-1 shadow-sm">
                                                            <Flame size={12} className="text-red-400 fill-red-400" /> 신앙심 100 소모
                                                        </span>
                                                    </div>

                                                    <p className="text-xs text-slate-300 mb-4 leading-relaxed">
                                                        신성한 무력으로 오만한 자들을 굴복시킵니다. 정벌 성공 시 속국으로 삼아 매년 세금과 물자를 수탈할 수 있습니다.
                                                    </p>

                                                    <div className="bg-red-950/50 border border-red-500/30 rounded-xl p-3 my-2 flex items-center justify-between">
                                                        <span className="text-xs font-bold text-red-200 flex items-center gap-1.5">
                                                            <Crown size={14} className="text-amber-400" /> 최소 필요 조건
                                                        </span>
                                                        <span className="text-xs font-bold font-mono text-red-300">
                                                            신앙심 100 / 위엄도 2,000
                                                        </span>
                                                    </div>

                                                    <div className="mt-auto pt-3">
                                                        {isSubjugated ? (
                                                            <button 
                                                                onClick={() => setIsTempleVassalModalOpen(true)}
                                                                className="w-full py-3.5 bg-red-900 hover:bg-red-800 text-white rounded-xl font-bold text-xs sm:text-sm shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2"
                                                            >
                                                                <Link size={18}/> 성역 속국 조공 관리
                                                            </button>
                                                        ) : (
                                                            <button 
                                                                onClick={() => handleAction('Invade')}
                                                                disabled={isProcessing || isSubjugated || isBlessed || currentMajesty < 2000}
                                                                className={`w-full py-3.5 rounded-xl font-bold text-xs sm:text-sm shadow-lg transition-all active:scale-95 ${isSubjugated || isBlessed || currentMajesty < 2000 ? 'bg-slate-800 text-slate-600 cursor-not-allowed border border-slate-700' : 'bg-red-800 hover:bg-red-700 text-white border border-red-500/50'} flex items-center justify-center gap-2`}
                                                            >
                                                                {isSubjugated ? <><Crown size={18}/> 이미 굴복함</> : isBlessed ? <><ShieldCheck size={18}/> 비호 중 정벌 불가</> : currentMajesty < 2000 ? '위엄도 부족 (2,000 필요)' : <><Sword size={18}/> 신성 정벌 개시 (신앙심 100 소모)</>}
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex justify-between items-center">
                                                <div className="flex items-center gap-2">
                                                    <ShieldAlert size={16} className="text-red-500" />
                                                    <span className="text-xs text-slate-300 font-bold">성전 긴장도</span>
                                                </div>
                                                <div className="flex items-center gap-3 flex-1 max-w-[200px] ml-4">
                                                    <div className="h-1.5 flex-1 bg-slate-800 rounded-full overflow-hidden">
                                                        <div className="h-full bg-red-600 transition-all duration-500" style={{ width: `${rel.tension || 0}%` }}></div>
                                                    </div>
                                                    <span className="text-xs font-mono font-bold text-red-400">{rel.tension || 0}%</span>
                                                </div>
                                            </div>

                                            {isSubjugated && (
                                                <button 
                                                    onClick={() => setIsVassalModalOpen(true)}
                                                    className="w-full py-3.5 bg-amber-700 hover:bg-amber-600 text-white font-bold rounded-2xl shadow-xl flex items-center justify-center gap-2 transition-all text-xs sm:text-sm"
                                                >
                                                    <Gavel size={18}/> 속국 조공 및 행정 명령 관리
                                                </button>
                                            )}
                                        </>
                                    );
                                })()}
                            </div>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-slate-500 opacity-60 gap-4 py-12">
                                <Globe size={70} className="animate-spin-slow text-indigo-400" />
                                <div className="text-center">
                                    <p className="text-lg font-bold text-slate-200">신성 외교 상황판</p>
                                    <p className="text-xs mt-1 text-slate-400">좌측 목록에서 사자의 권능을 행사할 국가를 선택하십시오.</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="p-3 md:p-4 bg-slate-950 border-t border-slate-800 flex flex-wrap justify-between items-center gap-3 shrink-0">
                    <div className="flex flex-wrap gap-3 sm:gap-6 items-center">
                        <div className="flex items-center text-xs text-amber-300 font-mono bg-slate-900 px-3.5 py-1.5 rounded-full border border-amber-500/30">
                            <Crown size={14} className="mr-2 text-amber-400"/> 위엄도: {Math.floor(currentMajesty).toLocaleString()}
                        </div>
                        <div className="flex items-center text-xs text-pink-300 font-mono bg-slate-900 px-3.5 py-1.5 rounded-full border border-pink-500/30">
                            <Zap size={14} className="mr-2 text-pink-400"/> 신앙심: {Number(character.faith || 0).toLocaleString()}
                        </div>
                    </div>
                    <button onClick={onClose} className="px-8 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold text-xs border border-slate-700 transition-colors">닫기</button>
                </div>

                {isProcessing && (
                    <div className="absolute inset-0 bg-black/70 z-[150] flex flex-col items-center justify-center">
                        <Loader2 size={48} className="animate-spin text-amber-500 mb-4" />
                        <p className="text-white font-bold tracking-widest animate-pulse">신의 뜻을 전파하는 중...</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TempleForeignAffairsModal;
