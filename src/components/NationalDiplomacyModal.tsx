
import React, { useState } from 'react';
import { Character, DiplomaticStatus, NationRelation, MilitaryRank, Companion, JobType } from '../types';
import { X, Globe, ShieldAlert, ShieldCheck, AlertTriangle, Flame, TrendingUp, TrendingDown, Info, Medal, TowerControl, ChevronRight, Activity, Coins, Package, Zap, Gift, Sword, Crown, Skull, UserCheck, MessageSquare, Loader2, Lock, Clock } from 'lucide-react';
import { attemptDeescalation, DIPLOMACY_GIFT_COST } from '../services/diplomacyService';
import ActionResultModal, { ResultData } from './ActionResultModal';
import FrontlineModal from './FrontlineModal';
import VassalManagementModal from './VassalManagementModal';
import { MILITARY_RANK_ORDER, MAGYE_LEADERS } from '../constants';
import { addDays, getDaysDiff } from '../utils';

interface Props {
    character: Character;
    onClose: () => void;
    onUpdateCharacter: (newChar: Character, logMsg: string) => void;
}

const STATUS_STYLE: Record<DiplomaticStatus, { color: string, bg: string, border: string, icon: any }> = {
    [DiplomaticStatus.ALLIANCE]: { color: 'text-green-400', bg: 'bg-green-950/20', border: 'border-green-500/50', icon: ShieldCheck },
    [DiplomaticStatus.NEUTRAL]: { color: 'text-blue-400', bg: 'bg-blue-950/20', border: 'border-blue-500/50', icon: Globe },
    [DiplomaticStatus.HOSTILE]: { color: 'text-orange-400', bg: 'bg-orange-950/20', border: 'border-orange-500/50', icon: AlertTriangle },
    [DiplomaticStatus.WAR]: { color: 'text-red-500', bg: 'bg-red-950/30', border: 'border-red-600/50', icon: Flame },
    [DiplomaticStatus.VASSAL_OWNER]: { color: 'text-amber-400', bg: 'bg-amber-950/20', border: 'border-amber-500/50', icon: Crown },
    [DiplomaticStatus.VASSAL_SUBJECT]: { color: 'text-red-400', bg: 'bg-red-950/20', border: 'border-red-500/50', icon: Skull }
};

const NationalDiplomacyModal: React.FC<Props> = ({ character, onClose, onUpdateCharacter }) => {
    const [selectedNation, setSelectedNation] = useState<string | null>(null);
    const [resultData, setResultData] = useState<ResultData | null>(null);
    const [confirmAction, setConfirmAction] = useState<(() => void) | null>(null);
    const [isFrontlineOpen, setIsFrontlineOpen] = useState(false);
    const [isVassalModalOpen, setIsVassalModalOpen] = useState(false);
    const [showEnvoySelector, setShowEnvoySelector] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);

    const mData = character.militaryData;
    const diplomacy = mData?.diplomacy || {};
    const nationList = Object.keys(diplomacy).sort((a, b) => diplomacy[b].tension - diplomacy[a].tension);

    const playerRank = character.militaryRank || MilitaryRank.PVT;
    const rankIdx = MILITARY_RANK_ORDER.indexOf(playerRank);
    const isMagyeLeader = MAGYE_LEADERS.includes(character.job);

    const isGeneral = rankIdx >= MILITARY_RANK_ORDER.indexOf(MilitaryRank.BG);
    const isMGPlus = rankIdx >= MILITARY_RANK_ORDER.indexOf(MilitaryRank.MG); 
    const isLG = playerRank === MilitaryRank.LG;
    const isGEN = playerRank === MilitaryRank.GEN;
    const isLGPlus = isLG || isGEN;
    const isBGPlus = rankIdx >= MILITARY_RANK_ORDER.indexOf(MilitaryRank.BG);
    
    const canNegotiateTruce = rankIdx >= MILITARY_RANK_ORDER.indexOf(MilitaryRank.COL) || isMagyeLeader;

    const handleModalClose = () => {
        setResultData(null);
        setConfirmAction(null);
    };

    const handleModalContinue = () => {
        if (confirmAction) confirmAction();
        handleModalClose();
    };

    const handleDeescalate = (target: string) => {
        const result = attemptDeescalation(character, target);
        if (result.success) {
            const newChar = { ...character };
            newChar.money -= DIPLOMACY_GIFT_COST.gold;
            if (newChar.base) {
                newChar.base.resources.wood -= DIPLOMACY_GIFT_COST.wood;
                newChar.base.resources.iron -= DIPLOMACY_GIFT_COST.iron;
                newChar.base.resources.manaCrystal -= DIPLOMACY_GIFT_COST.manaCrystal;
            }
            
            const reduction = parseInt(result.log.match(/-(\d+)/)?.[1] || "15");
            const rel = { ...newChar.militaryData!.diplomacy![target] };
            rel.tension = Math.max(0, rel.tension - reduction);
            if (rel.tension < 80 && rel.status === DiplomaticStatus.HOSTILE) rel.status = DiplomaticStatus.NEUTRAL;
            newChar.militaryData!.diplomacy![target] = rel;
            
            onUpdateCharacter(newChar, `[외교 예물] ${result.log}`);
            setResultData({
                type: 'success',
                title: '친선 예물 전달 성공',
                message: result.log,
                items: [
                    { label: '긴장도 하락', after: `-${reduction}%` },
                    { label: '소모 골드', after: `-${DIPLOMACY_GIFT_COST.gold.toLocaleString()}G` }
                ]
            });
        } else {
            const newChar = { ...character };
            newChar.money -= Math.floor(DIPLOMACY_GIFT_COST.gold * 0.5);
            if (newChar.base) {
                newChar.base.resources.wood -= Math.floor(DIPLOMACY_GIFT_COST.wood * 0.5);
                newChar.base.resources.iron -= Math.floor(DIPLOMACY_GIFT_COST.iron * 0.5);
            }
            
            onUpdateCharacter(newChar, `[외교 예물] ${result.log}`);
            setResultData({
                type: 'failure',
                title: '친선 시도 실패',
                message: result.log,
                items: [{ label: '결과', after: '반응 냉담' }]
            });
        }
    };

    const requestDeclareWar = (target: string) => {
        if (!isLGPlus) {
            setResultData({
                type: 'warning',
                title: '권한 부족',
                message: '선전포고 권한은 중장(LG) 이상의 최고위 지휘관에게만 부여됩니다.',
                items: [{ label: '현재 계급', after: playerRank }]
            });
            return;
        }

        setResultData({
            type: 'warning',
            title: '선전포고 확인',
            message: `${target}에 공식적으로 선전포고하시겠습니까?\n즉시 국가 간 전쟁 상태에 돌입하며 전선이 형성됩니다.`,
            items: [{ label: '대상 국가', after: target }]
        });
        setConfirmAction(() => () => executeDeclareWar(target));
    };

    const executeDeclareWar = (target: string) => {
        const newChar = { ...character };
        if (!newChar.militaryData) return;

        const newDiplomacy = { ...newChar.militaryData.diplomacy };
        const rel = { ...newDiplomacy[target] };
        
        rel.status = DiplomaticStatus.WAR;
        rel.tension = 100;
        rel.occupation = 0;
        rel.lastEvent = isLG ? "대장의 승인을 받은 공식 선전포고가 전달되었습니다." : "국가 지휘부의 즉각적인 선전포고가 전달되었습니다.";
        
        newDiplomacy[target] = rel;
        newChar.militaryData = {
            ...newChar.militaryData,
            diplomacy: newDiplomacy
        };

        onUpdateCharacter(newChar, `[전쟁 선포] ${target}와의 전쟁을 선포했습니다! 전군, 전투 태세 돌입!`);
        
        setTimeout(() => {
            setResultData({
                type: 'destroy',
                title: '전쟁 발발 (State of WAR)',
                message: `${target}와 공식적인 전쟁 상태에 돌입했습니다.\n이제 국경 전선 상황실에서 해당 국가를 타격할 수 있습니다.`,
                items: [
                    { label: '대상 국가', after: target },
                    { label: '외교 상태', before: '적대', after: '전쟁 (WAR)' },
                    { label: '국가 긴장도', after: '100% (최대)' }
                ]
            });
        }, 100);
    };

    const calculateTruceChance = (envoy: Companion, targetNation: string) => {
        const rel = diplomacy[targetNation];
        if (!rel) return 0;
        
        const base = 20;
        const occupationBonus = (rel.occupation || 0) * 0.5; 
        const wisBonus = (envoy.stats.wis || 0) * 0.1; 
        const playerCtrlBonus = (character.stats.ctrl || 0) * 0.02; 
        
        const total = Math.min(95, Math.max(5, base + occupationBonus + wisBonus + playerCtrlBonus));
        return Math.floor(total);
    };

    const handleTruceEnvoyDispatch = (envoy: Companion) => {
        if (!selectedNation) return;
        
        const cost = 10000;
        if (character.money < cost) {
            alert("협상 자금이 부족합니다. (10,000 G)");
            return;
        }

        setIsProcessing(true);
        const chance = calculateTruceChance(envoy, selectedNation);
        
        setTimeout(() => {
            const roll = Math.random() * 100;
            const success = roll < chance;
            const newChar = { ...character };
            newChar.money -= cost;

            if (success) {
                const rel = { ...newChar.militaryData!.diplomacy![selectedNation] };
                rel.status = DiplomaticStatus.NEUTRAL;
                rel.tension = 50;
                rel.occupation = 0;
                rel.lastEvent = `사절 ${envoy.name}의 활약으로 휴전 협정이 체결되었습니다.`;
                newChar.militaryData!.diplomacy![selectedNation] = rel;

                onUpdateCharacter(newChar, `[휴전 성공] ${selectedNation}와 휴전 협정을 맺었습니다. (사절: ${envoy.name})`);
                setResultData({
                    type: 'success',
                    title: '휴전 협정 체결',
                    message: `${envoy.name} 사절이 뛰어난 협상력으로 ${selectedNation}의 항복 및 휴전을 이끌어냈습니다.`,
                    items: [
                        { label: '협상 사절', after: envoy.name },
                        { label: '외교 상태', after: '중립 (Neutral)' },
                        { label: '성공 확률', after: `${chance}%` }
                    ]
                });
            } else {
                const rel = { ...newChar.militaryData!.diplomacy![selectedNation] };
                rel.lastEvent = `휴전 협상이 결렬되었습니다. 적국은 여전히 강경한 태도입니다.`;
                newChar.militaryData!.diplomacy![selectedNation] = rel;
                
                const inactiveIdx = newChar.inactiveCompanions?.findIndex(c => c.id === envoy.id);
                if (inactiveIdx !== -1 && newChar.inactiveCompanions) {
                    newChar.inactiveCompanions[inactiveIdx].affection = Math.max(-100, newChar.inactiveCompanions[inactiveIdx].affection - 5);
                }

                onUpdateCharacter(newChar, `[휴전 결렬] ${selectedNation}가 휴전 제안을 단호히 거절했습니다.`);
                setResultData({
                    type: 'failure',
                    title: '협상 결렬',
                    message: `사절 ${envoy.name}이(가) 빈손으로 복귀했습니다. 적의 의지는 아직 꺾이지 않았습니다.`,
                    items: [{ label: '성공 확률', after: `${chance}%` }]
                });
            }
            
            newChar.currentDate = addDays(newChar.currentDate || '2000-01-01', 7); 
            setIsProcessing(false);
            setShowEnvoySelector(false);
        }, 2000);
    };

    const hasResources = () => {
        const res = character.base?.resources;
        if (!res) return false;
        return character.money >= DIPLOMACY_GIFT_COST.gold && 
               res.wood >= DIPLOMACY_GIFT_COST.wood && 
               res.iron >= DIPLOMACY_GIFT_COST.iron && 
               res.manaCrystal >= DIPLOMACY_GIFT_COST.manaCrystal;
    };

    return (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-in fade-in">
            {resultData && (
                <ActionResultModal 
                    data={resultData} 
                    onClose={handleModalClose} 
                    onContinue={confirmAction ? handleModalContinue : undefined} 
                />
            )}
            
            {isFrontlineOpen && selectedNation && (
                <FrontlineModal 
                    character={character}
                    targetNation={selectedNation}
                    onClose={() => setIsFrontlineOpen(false)}
                    onAttack={() => {
                        setIsFrontlineOpen(false);
                        onClose();
                        onUpdateCharacter(character, `[군사 작전] ${selectedNation} 전선 돌파 작전을 개시합니다.`);
                    }}
                    onUpdateCharacter={onUpdateCharacter}
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

            {showEnvoySelector && (
                <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/90 p-4 animate-in zoom-in-95">
                    <div className="bg-slate-900 border border-indigo-500 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
                        <div className="p-6 bg-indigo-950/20 border-b border-indigo-900/50 flex justify-between items-center">
                            <h3 className="text-xl font-bold text-white flex items-center gap-2"><UserCheck className="text-indigo-400"/> 휴전 사절단 편성</h3>
                            <button onClick={() => setShowEnvoySelector(false)} className="text-slate-500 hover:text-white"><X/></button>
                        </div>
                        <div className="p-6 flex-1 overflow-y-auto custom-scrollbar space-y-4">
                            <p className="text-sm text-slate-400">협상을 주도할 전권 대사를 선택하십시오. <br/><span className="text-indigo-400 font-bold">지혜(WIS)</span>가 높은 대원이 유리합니다.</p>
                            <div className="space-y-2">
                                {[...character.companions, ...(character.inactiveCompanions || [])]
                                    .filter(c => !c.isDead && !c.isMonster)
                                    .map(comp => {
                                        const chance = selectedNation ? calculateTruceChance(comp, selectedNation) : 0;
                                        return (
                                            <button 
                                                key={comp.id}
                                                onClick={() => handleTruceEnvoyDispatch(comp)}
                                                disabled={isProcessing}
                                                className="w-full p-4 bg-slate-950 border border-slate-800 hover:border-indigo-500 rounded-2xl text-left transition-all group flex justify-between items-center"
                                            >
                                                <div>
                                                    <div className="font-bold text-white group-hover:text-indigo-300">{comp.name}</div>
                                                    <div className="text-[10px] text-slate-500 mt-1">WIS: {comp.stats.wis} | Lv.{comp.level}</div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-[10px] text-slate-500 uppercase font-bold">Expected Success</div>
                                                    <div className={`text-sm font-bold ${chance >= 70 ? 'text-green-400' : chance >= 40 ? 'text-yellow-400' : 'text-red-400'}`}>{chance}%</div>
                                                </div>
                                            </button>
                                        );
                                    })
                                }
                            </div>
                        </div>
                        {isProcessing && (
                            <div className="absolute inset-0 bg-black/60 z-20 flex flex-col items-center justify-center">
                                <Loader2 size={48} className="animate-spin text-indigo-500 mb-4"/>
                                <p className="text-white font-bold animate-pulse">협상 진행 중...</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            <div className="bg-slate-900 border border-blue-500/50 w-full max-w-5xl h-[90vh] md:h-[85vh] rounded-xl md:rounded-3xl shadow-[0_0_80px_rgba(37,99,235,0.2)] flex flex-col overflow-hidden relative">
                <div className="p-4 md:p-6 border-b border-blue-900/50 bg-blue-950/20 flex justify-between items-center shrink-0">
                    <div className="flex items-center">
                        <div className="p-2 md:p-3 bg-blue-900/30 rounded-2xl border border-blue-500/50 mr-3 md:mr-4 shadow-lg">
                            <TowerControl size={24} className="text-blue-400 animate-pulse md:w-8 md:h-8" />
                        </div>
                        <div>
                            <h2 className="text-lg md:text-2xl font-bold text-white font-cinzel tracking-wider uppercase">National Defense</h2>
                            <p className="text-[10px] md:text-xs text-blue-300 font-bold">실시간 국가 외교 상황 및 첩보 시스템</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-slate-500 hover:text-white p-2 rounded-full hover:bg-slate-800 transition-colors"><X size={24} /></button>
                </div>

                <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
                    <div className="w-full md:w-80 h-1/3 md:h-full border-b md:border-b-0 md:border-r border-slate-800 p-2 md:p-4 overflow-y-auto custom-scrollbar shrink-0 bg-slate-950/30 flex flex-col">
                        <div className="p-2 md:p-4 border-b border-slate-800 flex justify-between items-center bg-black/20 sticky top-0 z-10 backdrop-blur-sm">
                            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                <ShieldAlert size={14} className="text-red-500"/> 위험도 순위
                            </h3>
                        </div>
                        <div className="flex-1 p-2 space-y-2">
                            {nationList.map((name, idx) => {
                                const rel = diplomacy[name];
                                const style = STATUS_STYLE[rel.status];
                                return (
                                    <button
                                        key={`${name}-${idx}`}
                                        onClick={() => setSelectedNation(name)}
                                        className={`w-full p-3 rounded-xl md:rounded-2xl border text-left transition-all flex flex-col gap-2 ${selectedNation === name ? 'bg-blue-900/30 border-blue-500 shadow-lg' : 'bg-slate-900 border border-slate-800 hover:border-slate-700'}`}
                                    >
                                        <div className="flex justify-between items-center w-full">
                                            <span className="font-bold text-sm text-slate-200 truncate">{name}</span>
                                            <span className={`text-[10px] font-bold ${style.color}`}>{rel.status}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="flex-1 h-1 bg-slate-800 rounded-full overflow-hidden">
                                                <div className={`h-full ${rel.tension > 80 ? 'bg-red-500' : rel.tension > 40 ? 'bg-yellow-500' : 'bg-blue-500'}`} style={{ width: `${rel.tension}%` }}></div>
                                            </div>
                                            <span className="text-[10px] font-mono text-slate-500">{rel.tension}%</span>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="flex-1 p-4 md:p-8 overflow-y-auto custom-scrollbar bg-slate-900/50 flex flex-col h-2/3 md:h-full">
                        {selectedNation ? (
                            <div className="space-y-4 md:space-y-8 animate-in slide-in-from-right-4 pb-20 md:pb-0">
                                {(() => {
                                    const rel = diplomacy[selectedNation];
                                    const style = STATUS_STYLE[rel.status];
                                    const StatusIcon = style.icon;
                                    const res = character.base?.resources;
                                    const isVassal = rel.status === DiplomaticStatus.VASSAL_OWNER || rel.status === DiplomaticStatus.VASSAL_SUBJECT;
                                    const isWar = rel.status === DiplomaticStatus.WAR;
                                    const isHostile = rel.status === DiplomaticStatus.HOSTILE;

                                    const today = character.currentDate || '2000-01-01';
                                    const fallbackEndDate = rel.vassalStartDate ? addDays(rel.vassalStartDate, 1825) : addDays(today, (rel.vassalYearsRemaining || 5) * 365);
                                    const finalEndDate = rel.vassalEndDate || fallbackEndDate;
                                    
                                    const daysLeft = getDaysDiff(today, finalEndDate);
                                    const totalDays = 1825; 
                                    const progressPercent = Math.max(0, Math.min(100, (1 - daysLeft / totalDays) * 100));

                                    // [NEW] 글로벌 전쟁 진척도 정보 가져오기
                                    const globalWarPairKey = Object.keys(character.militaryData?.globalDiplomacy || {}).find(k => k.includes(selectedNation));
                                    const npcWarProgress = globalWarPairKey ? character.militaryData?.npcWarProgress?.[globalWarPairKey] : null;

                                    return (
                                        <>
                                            <div className={`p-4 md:p-8 rounded-2xl md:rounded-[2.5rem] border ${style.border} ${style.bg} relative overflow-hidden`}>
                                                <div className="absolute top-0 right-0 p-4 md:p-10 opacity-5"><StatusIcon size={100} className="md:w-[180px] md:h-[180px]" /></div>
                                                <div className="relative z-10">
                                                    <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-4 md:mb-6">
                                                        <div>
                                                            <span className={`text-[10px] md:text-xs font-bold uppercase tracking-widest px-2 md:px-3 py-1 rounded-full border ${style.border} ${style.color} bg-black/40`}>
                                                                {rel.status} Relations
                                                            </span>
                                                            <h3 className="text-2xl md:text-4xl font-bold text-white mt-2 md:mt-4">{selectedNation}</h3>
                                                            <p className="text-xs md:text-sm text-slate-400 mt-1 md:mt-2">대상 국가와의 최신 외교 브리핑</p>
                                                        </div>
                                                        <div className="text-right absolute top-0 right-0 md:relative">
                                                            <div className="text-[10px] text-slate-500 uppercase font-bold mb-1 hidden md:block">Tension Level</div>
                                                            <div className={`text-2xl md:text-4xl font-mono font-bold ${rel.tension > 80 ? 'text-red-500 animate-pulse' : rel.tension > 40 ? 'text-yellow-400' : 'text-blue-400'}`}>
                                                                {rel.tension}%
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="bg-black/40 p-3 md:p-5 rounded-xl md:rounded-2xl border border-white/5 backdrop-blur-sm">
                                                        <div className="flex items-center gap-2 mb-2 md:mb-3 text-[10px] md:text-xs font-bold text-slate-500 uppercase">
                                                            <Activity size={12} className="md:w-[14px] md:h-[14px]"/> Recent Intelligence
                                                        </div>
                                                        <p className="text-xs md:text-sm text-slate-200 leading-relaxed italic">
                                                            "{rel.lastEvent || "현재 특별한 동향이 보고되지 않았습니다."}"
                                                        </p>
                                                        {isWar && npcWarProgress !== null && (
                                                            <div className="mt-3 md:mt-4 pt-3 md:pt-4 border-t border-white/10">
                                                                <p className="text-[10px] text-red-400 font-bold uppercase mb-2">Global War Progress (NPC Simulation)</p>
                                                                <div className="flex items-center gap-3">
                                                                    <div className="flex-1 h-1.5 bg-slate-900 rounded-full overflow-hidden">
                                                                        <div className="h-full bg-red-600 animate-pulse" style={{ width: `${Math.abs(npcWarProgress)}%` }}></div>
                                                                    </div>
                                                                    <span className="text-xs font-mono text-red-500 font-bold">{Math.abs(npcWarProgress)}%</span>
                                                                </div>
                                                                <p className="text-[9px] text-slate-500 mt-1 italic">* 이 진척도가 100%에 달하면 한 국가가 완전히 무너집니다.</p>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {isVassal && (
                                                        <div className="mt-6 space-y-3 bg-black/40 p-4 rounded-2xl border border-white/10 shadow-lg animate-in fade-in">
                                                            <div className="flex justify-between items-center">
                                                                <div className="flex items-center gap-2">
                                                                    <Clock size={16} className="text-blue-400" />
                                                                    <span className="text-xs text-slate-300 font-bold uppercase tracking-wider">
                                                                        {rel.status === DiplomaticStatus.VASSAL_OWNER ? '지배 종료 카운트다운' : '속국 해방 카운트다운'}
                                                                    </span>
                                                                </div>
                                                                <span className={`text-sm font-black font-mono ${daysLeft > 365 ? 'text-blue-400' : 'text-red-400 animate-pulse'}`}>
                                                                    D-{daysLeft}일 ({Math.ceil(daysLeft/30)}개월)
                                                                </span>
                                                            </div>
                                                            <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                                                                <div 
                                                                    className="h-full bg-gradient-to-r from-blue-900 to-blue-400 transition-all duration-1000"
                                                                    style={{ width: `${progressPercent}%` }}
                                                                ></div>
                                                            </div>
                                                            <div className="flex justify-between text-[9px] text-slate-500 font-bold uppercase">
                                                                <span>Start: {rel.vassalStartDate || 'N/A'}</span>
                                                                <span>Expiry: {finalEndDate}</span>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div className="bg-slate-950 p-6 rounded-3xl border border-slate-800 space-y-4">
                                                    <h4 className="text-sm font-bold text-amber-500 uppercase tracking-widest flex items-center gap-2">
                                                        <Gift size={16} /> 친선 예물 구성 (Required Resources)
                                                    </h4>
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 flex flex-col items-center">
                                                            <Coins size={14} className="text-amber-400 mb-1"/>
                                                            <span className="text-[10px] text-slate-500">골드</span>
                                                            <span className={`text-xs font-bold ${character.money >= DIPLOMACY_GIFT_COST.gold ? 'text-green-400' : 'text-red-400'}`}>
                                                                {DIPLOMACY_GIFT_COST.gold.toLocaleString()}
                                                            </span>
                                                        </div>
                                                        <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 flex flex-col items-center">
                                                            <Package size={14} className="text-orange-600 mb-1"/>
                                                            <span className="text-[10px] text-slate-500">목재</span>
                                                            <span className={`text-xs font-bold ${res && res.wood >= DIPLOMACY_GIFT_COST.wood ? 'text-green-400' : 'text-red-400'}`}>
                                                                {DIPLOMACY_GIFT_COST.wood}
                                                            </span>
                                                        </div>
                                                        <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 flex flex-col items-center">
                                                            <Package size={14} className="text-blue-400 mb-1"/>
                                                            <span className="text-[10px] text-slate-500">철광석</span>
                                                            <span className={`text-xs font-bold ${res && res.iron >= DIPLOMACY_GIFT_COST.iron ? 'text-green-400' : 'text-red-400'}`}>
                                                                {DIPLOMACY_GIFT_COST.iron}
                                                            </span>
                                                        </div>
                                                        <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 flex flex-col items-center">
                                                            <Zap size={14} className="text-purple-400 mb-1"/>
                                                            <span className="text-[10px] text-slate-500">마정석</span>
                                                            <span className={`text-xs font-bold ${res && res.manaCrystal >= DIPLOMACY_GIFT_COST.manaCrystal ? 'text-green-400' : 'text-red-400'}`}>
                                                                {DIPLOMACY_GIFT_COST.manaCrystal}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="bg-slate-950 p-6 rounded-3xl border border-slate-800 space-y-4">
                                                    <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                                        <TowerControl size={16} className="text-blue-400"/> 외교 및 군사 행동
                                                    </h4>
                                                    
                                                    {isWar ? (
                                                        <div className="space-y-3">
                                                            <button
                                                                onClick={() => setIsFrontlineOpen(true)}
                                                                className="w-full py-4 bg-gradient-to-r from-red-800 to-red-600 hover:from-red-700 hover:to-red-500 text-white font-bold rounded-2xl shadow-xl flex items-center justify-center gap-2 transition-all transform hover:scale-[1.02]"
                                                            >
                                                                <Sword size={20}/> 전선 상황실 진입
                                                            </button>
                                                            <button
                                                                onClick={() => setShowEnvoySelector(true)}
                                                                disabled={!canNegotiateTruce}
                                                                className={`w-full py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md group ${canNegotiateTruce ? 'bg-indigo-900/40 hover:bg-indigo-800 text-indigo-300 border border-indigo-700' : 'bg-slate-800 text-slate-600 border border-slate-700 cursor-not-allowed'}`}
                                                            >
                                                                {canNegotiateTruce ? <MessageSquare size={16} className="group-hover:scale-110 transition-transform"/> : <Lock size={16}/>}
                                                                {canNegotiateTruce ? '휴전 협상 사절 파견' : '대령 이상 또는 지배자만 가능'}
                                                            </button>
                                                        </div>
                                                    ) : isHostile ? (
                                                        <div className="space-y-3">
                                                             <button
                                                                onClick={() => handleDeescalate(selectedNation)}
                                                                disabled={!isGeneral || !hasResources()}
                                                                className={`w-full py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-lg ${isGeneral && hasResources() ? 'bg-amber-700 hover:bg-amber-600 text-white' : 'bg-slate-800 text-slate-600 border border-slate-700 cursor-not-allowed'}`}
                                                            >
                                                                <Gift size={16}/>
                                                                친선 예물 보내기
                                                            </button>
                                                            <button
                                                                onClick={() => requestDeclareWar(selectedNation)}
                                                                className={`w-full py-4 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-lg ${isLGPlus ? 'bg-red-700 hover:bg-red-600 text-white animate-pulse' : 'bg-slate-800 text-slate-600 border border-slate-700 cursor-not-allowed'}`}
                                                            >
                                                                <Flame size={18}/> 선전포고 (Declare War)
                                                            </button>
                                                        </div>
                                                    ) : isVassal ? (
                                                        <button
                                                            onClick={() => setIsVassalModalOpen(true)}
                                                            disabled={!isBGPlus}
                                                            className={`w-full py-4 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-lg ${
                                                                !isBGPlus ? 'bg-slate-800 text-slate-600 border border-slate-700 cursor-not-allowed' :
                                                                rel.status === DiplomaticStatus.VASSAL_OWNER ? 'bg-amber-600 hover:bg-amber-500' : 'bg-red-700 hover:bg-red-600'
                                                            } text-white`}
                                                        >
                                                            {!isBGPlus ? <Lock size={18}/> : rel.status === DiplomaticStatus.VASSAL_OWNER ? <Crown size={18}/> : <Skull size={18}/>}
                                                            {isBGPlus ? '속국 관리 센터' : '속국 관리 센터 (준장 이상)'}
                                                        </button>
                                                    ) : (
                                                        <button
                                                            onClick={() => handleDeescalate(selectedNation)}
                                                            disabled={!isGeneral || !hasResources()}
                                                            className={`w-full py-4 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-lg ${isGeneral && hasResources() ? 'bg-amber-700 hover:bg-amber-600 text-white' : 'bg-slate-800 text-slate-600 border border-slate-700 cursor-not-allowed'}`}
                                                            >
                                                            <Gift size={16}/>
                                                            {isGeneral ? '친선 예물 보내기' : '장성급 권한 필요'}
                                                        </button>
                                                    )}
                                                    
                                                    <p className="text-[10px] text-slate-600 text-center italic leading-relaxed">
                                                        {isWar ? '* 휴전 협상 시 점유율이 높고 사절의 지혜(WIS)가 높을수록 성공률이 상승합니다.' : isHostile ? '* 적대 국가에 선전포고를 하려면 중장 이상의 지휘 권한이 필요합니다.' : isVassal ? '* 속국 상태에 따른 조공 및 자원 관리를 수행합니다. (준장 이상 접근 가능)' : '* 고유 자원을 소모하여 상대국과의 긴장을 완화합니다.'}
                                                    </p>
                                                </div>
                                            </div>
                                        </>
                                    );
                                })()}
                            </div>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-slate-600 opacity-50 gap-4">
                                <Globe size={80} className="animate-spin-slow" />
                                <div className="text-center">
                                    <p className="text-xl font-cinzel">Select Target Nation</p>
                                    <p className="text-xs mt-1">좌측 리스트에서 정보를 확인할 국가를 선택하십시오.</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="p-4 bg-slate-950 border-t border-slate-800 flex justify-between items-center shrink-0">
                    <div className="flex gap-6 items-center">
                         <div className="flex items-center text-xs text-amber-400 font-mono bg-amber-900/10 px-3 py-1 rounded-full border border-amber-500/20">
                            <Coins size={14} className="mr-2"/> 보유 골드: {(character.money || 0).toLocaleString()}G
                         </div>
                         <div className="flex items-center text-xs text-blue-400 font-mono bg-blue-900/10 px-3 py-1 rounded-full border border-blue-500/20">
                            <Medal size={14} className="mr-2"/> 내 공훈: {character.militaryData?.merit || 0}
                         </div>
                    </div>
                    <button onClick={onClose} className="px-8 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold text-xs border border-slate-700 transition-colors">상황 종료</button>
                </div>
            </div>
        </div>
    );
};

export default NationalDiplomacyModal;
