
import React, { useState, useMemo } from 'react';
import { Character, DiplomaticStatus, NationRelation, MilitaryRank, Companion, JobType, Enemy, CombatState } from '../types';
import { X, Globe, ShieldAlert, Gavel, ShieldCheck, AlertTriangle, Flame, Target, TrendingUp, TrendingDown, Info, Medal, TowerControl, ChevronRight, Activity, Coins, Package, Zap, Gift, Sword, Crown, Skull, UserCheck, MessageSquare, Loader2, Lock, Clock, Trees, PawPrint, Ghost, RefreshCw, CloudSun, Sparkles, CheckCircle } from 'lucide-react';
import { attemptDeescalation, DIPLOMACY_GIFT_COST } from '../services/diplomacyService';
import ActionResultModal, { ResultData } from './ActionResultModal';
import FrontlineModal from './FrontlineModal';
import VassalManagementModal from './VassalManagementModal';
import { MILITARY_RANK_ORDER, MAGYE_LEADERS, NATION_INFO, TEMPLE_MESSENGER_MAP, WORLD_GEOGRAPHY } from '../constants';
import { addDays, getDaysDiff } from '../utils';
import { generateInitialDiplomacy } from '../nationalDiplomacy';
import { generateDivineWarEnemies } from '../divineWarSystem';

interface Props {
    character: Character;
    onClose: () => void;
    onUpdateCharacter: (newChar: Character, logMsg: string) => void;
    onBattle?: (enemy: Enemy | Enemy[], type: CombatState['type'], source: string, city?: string, nation?: string) => void;
    onAction: (action: string) => void;
}

const STATUS_STYLE: Record<DiplomaticStatus, { color: string, bg: string, border: string, icon: any }> = {
    [DiplomaticStatus.ALLIANCE]: { color: 'text-green-400', bg: 'bg-green-950/20', border: 'border-green-500/50', icon: ShieldCheck },
    [DiplomaticStatus.NEUTRAL]: { color: 'text-blue-400', bg: 'bg-blue-950/20', border: 'border-blue-500/50', icon: Globe },
    [DiplomaticStatus.HOSTILE]: { color: 'text-orange-400', bg: 'bg-orange-950/20', border: 'border-orange-500/50', icon: AlertTriangle },
    [DiplomaticStatus.WAR]: { color: 'text-red-500', bg: 'bg-red-950/30', border: 'border-red-600/50', icon: Flame },
    [DiplomaticStatus.VASSAL_OWNER]: { color: 'text-amber-400', bg: 'bg-amber-950/20', border: 'border-amber-500/50', icon: Crown },
    [DiplomaticStatus.VASSAL_SUBJECT]: { color: 'text-red-400', bg: 'bg-red-950/20', border: 'border-red-500/50', icon: Skull }
};

const MagyeWarModal: React.FC<Props> = ({ character, onClose, onAction, onUpdateCharacter, onBattle }) => {
    const [activeTab, setActiveTab] = useState<'targets' | 'war' | 'heaven'>('targets');
    const [selectedNation, setSelectedNation] = useState<string | null>(null);
    const [selectedTemple, setSelectedTemple] = useState<string | null>(null);
    const [resultData, setResultData] = useState<ResultData | null>(null);
    const [confirmAction, setConfirmAction] = useState<(() => void) | null>(null);
    const [isFrontlineOpen, setIsFrontlineOpen] = useState(false);
    const [isVassalModalOpen, setIsVassalModalOpen] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);

    const mData = character.militaryData;
    const diplomacy = mData?.diplomacy || {};
    const pendingInvasions = character.militaryData?.pendingInvasions || [];
    const allMembers = [character, ...character.companions, ...(character.inactiveCompanions || [])];
    const isGodDefeated = character.isGodDefeated || false;
    
    // 성전 목록
    const temples = Object.keys(TEMPLE_MESSENGER_MAP);

    const nationList = Object.keys(diplomacy)
        .filter(n => n !== "임페리얼 제국")
        .sort((a, b) => {
            const relA = diplomacy[a];
            const relB = diplomacy[b];
            if (relA.status === DiplomaticStatus.WAR && relB.status !== DiplomaticStatus.WAR) return -1;
            if (relB.status === DiplomaticStatus.WAR && relA.status !== DiplomaticStatus.WAR) return 1;
            return relB.tension - relA.tension;
        });

    const handleModalClose = () => {
        setResultData(null);
        setConfirmAction(null);
    };

    const handleModalContinue = () => {
        if (confirmAction) confirmAction();
        handleModalClose();
    };

    const getNationTypeIcon = (nation: string) => {
        const info = NATION_INFO[nation];
        if (!info) return <Globe size={14} className="text-slate-400"/>;
        if (info.rulerRace === 'Elf') return <Trees size={14} className="text-emerald-500"/>;
        if (info.rulerRace === 'Monster' || info.rulerRace === 'Beast') return <PawPrint size={14} className="text-orange-500"/>;
        if (nation === '네크로디움 제국') return <Ghost size={14} className="text-purple-500"/>;
        return <Globe size={14} className="text-blue-400"/>;
    };

    const handleForceInitDiplomacy = () => {
        const newChar = { ...character };
        if (!newChar.militaryData) {
            newChar.militaryData = {
                rank: character.militaryRank || MilitaryRank.PVT,
                enlistedDate: character.currentDate || '2000-01-01',
                merit: 0,
                completedMissions: 0,
                availableMissions: [],
                activeMissions: []
            };
        }
        newChar.militaryData.diplomacy = generateInitialDiplomacy(newChar.nation);
        onUpdateCharacter(newChar, "[제국 정보망] 전 세계 국가들의 동태 파악이 완료되었습니다.");
        setResultData({
            type: 'success',
            title: '외교 정보망 활성화',
            message: '전 세계의 지도와 외교 관계 데이터를 확보했습니다.',
            items: [{ label: '확보 국가 수', after: `${Object.keys(newChar.militaryData.diplomacy).length}개` }]
        });
    };

    const handleImperialGift = (target: string) => {
        const result = attemptDeescalation(character, target);
        if (result.success) {
            const newChar = { ...character };
            newChar.money -= DIPLOMACY_GIFT_COST.gold;
            if (newChar.base) {
                newChar.base.resources.manaCrystal -= DIPLOMACY_GIFT_COST.manaCrystal;
            }
            
            const reduction = 20;
            const rel = { ...newChar.militaryData!.diplomacy![target] };
            rel.tension = Math.max(0, rel.tension - reduction);
            newChar.militaryData!.diplomacy![target] = rel;
            
            onUpdateCharacter(newChar, `[제국 회유] ${target}에 압도적인 부를 과시하며 회유를 시도했습니다. (긴장도 -${reduction})`);
            setResultData({
                type: 'success',
                title: '회유 성공',
                message: `${target}의 지도층이 제국의 막대한 자금력 앞에 흔들리고 있습니다.`,
                items: [{ label: '긴장도 하락', after: `-${reduction}%` }]
            });
        } else {
            setResultData({
                type: 'failure',
                title: '회유 실패',
                message: `${target} 측에서 제국의 제안을 단호히 거절했습니다.`,
                items: [{ label: '결과', after: '적개심 유지' }]
            });
        }
    };

    const handleDeclareWar = (target: string) => {
        setResultData({
            type: 'warning',
            title: '침공 선포 (DECALRE WAR)',
            message: `${target}을(를) 제국의 영토로 편입하기 위한 전쟁을 개시하시겠습니까?`,
            items: [{ label: '목표 국가', after: target }]
        });
        setConfirmAction(() => () => {
            const newChar = { ...character };
            const rel = { ...newChar.militaryData!.diplomacy![target] };
            rel.status = DiplomaticStatus.WAR;
            rel.tension = 100;
            rel.occupation = 0;
            newChar.militaryData!.diplomacy![target] = rel;
            onUpdateCharacter(newChar, `[마계 침공] ${target}에 대한 대규모 침공 명령을 하달했습니다!`);
            setResultData({
                type: 'destroy',
                title: '전쟁 개시',
                message: `제국의 군단이 ${target} 국경을 넘기 시작했습니다.`,
                items: [{ label: '상태', after: '전쟁 중' }]
            });
        });
    };

    const handleInvasionHeaven = (templeName: string) => {
        if (templeName === '신의 거처' && isGodDefeated) return;
        
        const job = TEMPLE_MESSENGER_MAP[templeName];
        const isAlly = allMembers.some(m => m.job === job);

        if (isAlly) {
            setResultData({
                type: 'info',
                title: '강제 동맹 구역',
                message: '해당 성전의 사자가 이미 당신의 동료입니다. 마계의 충직한 동맹이 된 성전은 공격할 수 없습니다.',
                items: [{ label: '상태', after: '평화 유지' }]
            });
            return;
        }

        const isGod = templeName === '신의 거처';
        if (isGod) {
            const isFinalClassLiberated =
                character.classTier === '파이널 클래스' ||
                (character.classTier as any) === 'FINAL' ||
                Boolean(character.finalClassName);
            if (!isFinalClassLiberated) {
                setResultData({
                    type: 'warning',
                    title: '파이널 클래스 해방 필요',
                    message: '절대신을 처단하고 마신으로 등극하려면 먼저 파이널 클래스 해방 상태여야 합니다.',
                    items: [{ label: '현재 클래스 단계', after: character.classTier || '미해방' }]
                });
                return;
            }
        }
        const combatType: CombatState['type'] = isGod ? 'magye_god_slaying' : 'magye_temple_invasion';
        
        setResultData({
            type: 'warning',
            title: isGod ? '절대신 살해 작전' : '성전 정벌 개시',
            message: `${templeName}의 신성을 파괴하고 제국의 영토로 편입하시겠습니까?`,
            items: [
                { label: '목표', after: templeName },
                { label: '예상 악명 상승', after: `+${isGod ? '10,000' : '1,000'}` }
            ]
        });

        setConfirmAction(() => () => {
            const newChar = { ...character };
            newChar.infamy = (newChar.infamy || 0) + (isGod ? 10000 : 1000);
            
            let nation = "신계";
            for (const r in WORLD_GEOGRAPHY) {
                for (const n in WORLD_GEOGRAPHY[r]) {
                    if (WORLD_GEOGRAPHY[r][n].cities.includes(templeName)) {
                        nation = n;
                        break;
                    }
                }
            }

            const enemies = generateDivineWarEnemies(isGod ? 'GOD' : 'TEMPLE', nation, templeName, character.level);
            onUpdateCharacter(newChar, `[제국 선전포고] ${templeName}을(를) 향한 대규모 침공군을 발령했습니다!`);
            if (onBattle) onBattle(enemies, combatType, templeName, templeName, nation);
            onClose();
        });
    };

    const handleDefendInvasion = (targetNation: string) => {
        onAction(`[전쟁 방어] 침공군 격퇴: ${targetNation}`);
        onClose(); 
    };

    const handleIgnoreInvasion = (targetNation: string) => {
        const newChar = { ...character };
        if (!newChar.militaryData?.diplomacy?.[targetNation]) return;
        
        const rel = { ...newChar.militaryData.diplomacy[targetNation] };
        rel.occupation = Math.max(-100, (rel.occupation || 0) - 10);
        newChar.militaryData.diplomacy[targetNation] = rel;
        newChar.militaryData.pendingInvasions = pendingInvasions.filter(n => n !== targetNation);
        
        onUpdateCharacter(newChar, `[침공 방치] ${targetNation}의 공세를 무시하여 전선 점유율이 10% 하락했습니다.`);
        setResultData({
            type: 'failure',
            title: '방어선 후퇴',
            message: `${targetNation}의 반격을 저지하지 못해 점령지 일부를 상실했습니다.`,
            items: [{ label: '점유율 변동', after: '-10% (후퇴)' }]
        });
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
                        onUpdateCharacter(character, `[제국 진격] ${selectedNation} 전선 섬멸 작전을 개시합니다.`);
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

            <div className="bg-slate-950 border-2 border-red-600 w-full max-w-5xl h-[85vh] rounded-[2.5rem] shadow-[0_0_80px_rgba(220,38,38,0.4)] flex flex-col overflow-hidden relative">
                <div className="p-6 border-b border-red-900/50 bg-red-950/20 flex justify-between items-center shrink-0 z-10">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-red-700 rounded-2xl shadow-lg">
                            <TowerControl size={32} className="text-white animate-pulse" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-white font-cinzel tracking-widest uppercase">IMPERIAL WAR COMMAND</h2>
                            <p className="text-xs text-red-500 font-bold">제국 총사령부: 정벌 작전 및 전선 방어 통제실</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-slate-500 hover:text-white p-1 rounded-full hover:bg-slate-800 transition-colors"><X size={24} /></button>
                </div>

                <div className="flex border-b border-slate-800 bg-slate-900 shrink-0 overflow-x-auto no-scrollbar">
                    <button onClick={() => setActiveTab('targets')} className={`flex-1 py-4 px-4 text-xs font-bold transition-all border-b-2 flex items-center justify-center gap-2 whitespace-nowrap ${activeTab === 'targets' ? 'text-red-400 border-red-500 bg-slate-900' : 'text-slate-500 border-transparent hover:text-slate-300'}`}>
                        <Target size={14}/> 정벌 목표 (인간계)
                    </button>
                    <button onClick={() => setActiveTab('heaven')} className={`flex-1 py-4 px-4 text-xs font-bold transition-all border-b-2 flex items-center justify-center gap-2 whitespace-nowrap ${activeTab === 'heaven' ? 'text-amber-400 border-amber-500 bg-slate-900' : 'text-slate-500 border-transparent hover:text-slate-300'}`}>
                        <CloudSun size={14}/> 신계 정벌
                    </button>
                    <button onClick={() => setActiveTab('war')} className={`flex-1 py-4 px-4 text-xs font-bold transition-all border-b-2 flex items-center justify-center gap-2 relative whitespace-nowrap ${activeTab === 'war' ? 'text-red-400 border-red-500 bg-slate-900' : 'text-slate-500 border-transparent hover:text-slate-300'}`}>
                        <ShieldAlert size={14}/> 전선 상황 
                        {pendingInvasions.length > 0 && <span className="absolute top-3 right-1/4 w-2.5 h-2.5 bg-red-600 rounded-full animate-ping"></span>}
                    </button>
                </div>

                <div className="flex flex-1 overflow-hidden">
                    {activeTab === 'targets' ? (
                        <>
                            <div className="w-full md:w-80 border-r border-red-900/30 p-4 overflow-y-auto custom-scrollbar shrink-0 bg-black/40 flex flex-col">
                                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                                    <ShieldAlert size={14} className="text-red-600"/> 정벌 대상 국가
                                </h3>
                                <div className="flex-1 space-y-2">
                                    {nationList.length > 0 ? nationList.map((name, idx) => {
                                        const rel = diplomacy[name];
                                        const style = STATUS_STYLE[rel.status];
                                        return (
                                            <button
                                                key={`${name}-${idx}`}
                                                onClick={() => setSelectedNation(name)}
                                                className={`w-full p-3 rounded-2xl border text-left transition-all flex flex-col gap-2 ${selectedNation === name ? 'bg-red-900/20 border-red-500 shadow-lg' : 'bg-slate-900 border border-slate-800 hover:border-red-900/30'}`}
                                            >
                                                <div className="flex justify-between items-center w-full">
                                                    <div className="flex items-center gap-2">
                                                        {getNationTypeIcon(name)}
                                                        <span className="font-bold text-sm text-slate-200">{name}</span>
                                                    </div>
                                                    <span className={`text-[9px] font-bold px-1.5 rounded border ${style.color} ${style.border}`}>{rel.status}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <div className="flex-1 h-1 bg-slate-800 rounded-full overflow-hidden">
                                                        <div className={`h-full ${rel.tension > 80 ? 'bg-red-500' : 'bg-orange-500'}`} style={{ width: `${rel.tension}%` }}></div>
                                                    </div>
                                                    <span className="text-[10px] font-mono text-slate-500">{rel.tension}%</span>
                                                </div>
                                            </button>
                                        );
                                    }) : (
                                        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-4">
                                            <AlertTriangle size={48} className="text-red-600/50 animate-pulse" />
                                            <button onClick={handleForceInitDiplomacy} className="w-full py-3 bg-red-900/40 hover:bg-red-800 text-red-200 border border-red-700 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all">
                                                <RefreshCw size={14}/> 외교 정보망 활성화
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="flex-1 p-8 overflow-y-auto custom-scrollbar bg-slate-900 flex flex-col">
                                {selectedNation ? (
                                    <div className="space-y-8 animate-in slide-in-from-right-4">
                                        <div className={`p-8 rounded-[2.5rem] border ${STATUS_STYLE[diplomacy[selectedNation].status].border} ${STATUS_STYLE[diplomacy[selectedNation].status].bg} relative overflow-hidden`}>
                                            <div className="absolute top-0 right-0 p-10 opacity-5"><Sword size={180} /></div>
                                            <div className="relative z-10">
                                                <span className="text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full border border-red-500 text-red-400 bg-black/40">Target Assessment</span>
                                                <h3 className="text-4xl font-bold text-white mt-4 flex items-center gap-3">{selectedNation} {getNationTypeIcon(selectedNation)}</h3>
                                                <div className="mt-8 bg-black/40 p-5 rounded-2xl border border-white/5 backdrop-blur-sm">
                                                    <p className="text-sm text-slate-200 leading-relaxed italic">"{diplomacy[selectedNation].lastEvent || "제국의 위엄에 눌려 조용히 동태를 살피는 중입니다."}"</p>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="bg-slate-950 p-6 rounded-3xl border border-red-900/30 flex flex-col justify-between">
                                                <h4 className="font-bold text-red-400 mb-4 flex items-center gap-2"><Sword size={20}/> 정벌 작전</h4>
                                                <p className="text-xs text-slate-500 mb-6 leading-relaxed">
                                                    {diplomacy[selectedNation].status === DiplomaticStatus.WAR ? '전선을 돌파하여 수도를 함락시키십시오.' : '해당 국가에 정식으로 전쟁을 선포합니다.'}
                                                </p>
                                                <button onClick={() => diplomacy[selectedNation].status === DiplomaticStatus.WAR ? setIsFrontlineOpen(true) : handleDeclareWar(selectedNation)} className="w-full py-4 bg-red-800 hover:bg-red-700 text-white font-bold rounded-xl shadow-lg transition-all transform active:scale-95 flex items-center justify-center gap-2">
                                                    {diplomacy[selectedNation].status === DiplomaticStatus.WAR ? <><Target size={18}/> 전선 상황실</> : <><Flame size={18}/> 선전포고</>}
                                                </button>
                                            </div>
                                            <div className="bg-slate-950 p-6 rounded-3xl border border-amber-900/30 flex flex-col justify-between">
                                                <h4 className="font-bold text-amber-500 mb-4 flex items-center gap-2"><Crown size={20}/> 회유 및 지배</h4>
                                                <p className="text-xs text-slate-500 mb-6 leading-relaxed">
                                                    {diplomacy[selectedNation].status === DiplomaticStatus.VASSAL_OWNER ? '속국으로부터 조공을 수거합니다.' : '압도적인 자금으로 적의 의지를 꺾습니다.'}
                                                </p>
                                                <button onClick={() => diplomacy[selectedNation].status === DiplomaticStatus.VASSAL_OWNER ? setIsVassalModalOpen(true) : handleImperialGift(selectedNation)} className="w-full py-4 bg-slate-800 hover:bg-amber-700 text-white font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2">
                                                    {diplomacy[selectedNation].status === DiplomaticStatus.VASSAL_OWNER ? <><Gavel size={18}/> 수탈 관리</> : <><Gift size={18}/> 제국 회유</>}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex-1 flex flex-col items-center justify-center text-slate-600 opacity-50 gap-4">
                                        <Skull size={80} className="animate-pulse" />
                                        <p className="text-xl font-cinzel">Select Target to Subjugate</p>
                                    </div>
                                )}
                            </div>
                        </>
                    ) : activeTab === 'heaven' ? (
                        <>
                            {/* Heavenly Targets List */}
                            <div className="w-full md:w-80 border-r border-red-900/30 p-6 overflow-y-auto custom-scrollbar shrink-0 bg-black/40">
                                <h3 className="text-xs font-bold text-slate-500 uppercase mb-6 flex items-center gap-2">
                                    <Target size={14} className="text-red-600"/> 신계 정벌 대상 (Celestial)
                                </h3>
                                
                                <div className="space-y-3">
                                    <button 
                                        onClick={() => setSelectedTemple('신의 거처')}
                                        className={`w-full p-4 rounded-2xl border transition-all flex items-center gap-4 ${selectedTemple === '신의 거처' ? 'bg-red-900/40 border-red-500 shadow-lg ring-2 ring-red-600' : 'bg-slate-900 border border-slate-800 hover:border-red-900/50'} ${isGodDefeated ? 'opacity-60 border-amber-500/50' : ''}`}
                                    >
                                        <div className={`p-2 rounded-lg shadow-md ${isGodDefeated ? 'bg-amber-600 text-white' : 'bg-red-600 text-white'}`}>
                                            {isGodDefeated ? <CheckCircle size={20}/> : <Crown size={20}/>}
                                        </div>
                                        <div className="text-left">
                                            <div className={`font-bold text-sm ${isGodDefeated ? 'text-amber-400' : 'text-white'}`}>신의 거처</div>
                                            <div className={`text-[10px] font-bold uppercase ${isGodDefeated ? 'text-amber-600' : 'text-red-400'}`}>
                                                {isGodDefeated ? 'Conquered' : 'Ultimate Target'}
                                            </div>
                                        </div>
                                    </button>

                                    <div className="h-px bg-red-900/30 my-4"></div>

                                    {temples.map((name, idx) => {
                                        const job = TEMPLE_MESSENGER_MAP[name];
                                        const isAlly = allMembers.some(m => m.job === job);
                                        return (
                                            <button
                                                key={`${name}-${idx}`}
                                                onClick={() => setSelectedTemple(name)}
                                                className={`w-full p-3 rounded-xl border text-left transition-all flex items-center gap-3 ${selectedTemple === name ? 'bg-indigo-900/40 border-indigo-500 shadow-md' : isAlly ? 'bg-green-950/20 border-green-900/50' : 'bg-slate-900 border border-slate-800 hover:border-slate-700'}`}
                                            >
                                                <div className={`p-1.5 rounded-lg ${isAlly ? 'bg-green-900 text-green-400' : 'bg-slate-800 text-slate-500'}`}>
                                                    {isAlly ? <ShieldCheck size={16}/> : <Flame size={16}/>}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="text-xs font-bold text-slate-200 truncate">{name}</div>
                                                    {isAlly && <span className="text-[8px] text-green-500 font-bold uppercase">Alliance</span>}
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Heavenly Strategy View */}
                            <div className="flex-1 p-10 overflow-y-auto custom-scrollbar bg-slate-900/50 flex flex-col items-center justify-center">
                                {selectedTemple ? (
                                    <div className="max-w-xl w-full space-y-8 animate-in zoom-in-95">
                                        <div className="text-center space-y-4">
                                            <div className={`inline-block p-4 rounded-full border mb-2 ${selectedTemple === '신의 거처' ? (isGodDefeated ? 'bg-amber-900/20 border-amber-500/30' : 'bg-red-900/20 border-red-500/30') : 'bg-red-900/20 border-red-500/30'}`}>
                                                {selectedTemple === '신의 거처' ? (isGodDefeated ? <CheckCircle size={64} className="text-amber-500"/> : <Skull size={64} className="text-red-500 animate-pulse"/>) : <Sword size={64} className="text-red-400"/>}
                                            </div>
                                            <h3 className={`text-3xl font-black font-cinzel ${selectedTemple === '신의 거처' && isGodDefeated ? 'text-amber-400' : 'text-white'}`}>
                                                {selectedTemple}
                                                {selectedTemple === '신의 거처' && isGodDefeated && " (함락됨)"}
                                            </h3>
                                            <p className="text-sm text-slate-400 leading-relaxed italic">
                                                {selectedTemple === '신의 거처' 
                                                    ? (isGodDefeated 
                                                        ? "절대신 엘라는 이미 당신의 권능 앞에 소멸했습니다. 이제 이곳은 당신의 영토입니다."
                                                        : "절대신의 권능을 거두고 마계의 질서를 온 세상에 주입할 최후의 전장입니다.")
                                                    : "신의 대행자가 거주하는 성역입니다. 이곳을 점령하면 성전의 자원과 인력을 제국의 것으로 만들 수 있습니다."}
                                            </p>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="bg-slate-950 p-5 rounded-3xl border border-red-900/30 text-center">
                                                <div className="text-[10px] text-slate-500 uppercase font-bold mb-1">Invasion Risk</div>
                                                <div className={`text-2xl font-mono font-bold ${selectedTemple === '신의 거처' && isGodDefeated ? 'text-slate-600' : 'text-red-500'}`}>
                                                    {selectedTemple === '신의 거처' ? (isGodDefeated ? 'NONE' : 'EXTREME') : 'HIGH'}
                                                </div>
                                            </div>
                                            <div className="bg-slate-950 p-5 rounded-3xl border border-amber-900/30 text-center">
                                                <div className="text-[10px] text-slate-500 uppercase font-bold mb-1">Status</div>
                                                <div className={`text-2xl font-mono font-bold ${selectedTemple === '신의 거처' && isGodDefeated ? 'text-amber-500' : 'text-slate-400'}`}>
                                                    {selectedTemple === '신의 거처' && isGodDefeated ? 'OCCUPIED' : 'ACTIVE'}
                                                </div>
                                            </div>
                                        </div>

                                        {selectedTemple === '신의 거처' && isGodDefeated ? (
                                            <div className="bg-amber-950/20 border-2 border-amber-500/30 p-6 rounded-3xl text-center animate-in fade-in">
                                                <Crown size={32} className="text-amber-500 mx-auto mb-2" />
                                                <p className="text-sm text-amber-200 font-bold">"이미 신좌를 찬탈했습니다."</p>
                                                <p className="text-[10px] text-slate-500 mt-1">더 이상 이 구역에 대한 침공은 무의미합니다.</p>
                                            </div>
                                        ) : (
                                            <button 
                                                onClick={() => handleInvasionHeaven(selectedTemple)}
                                                className="w-full py-6 bg-gradient-to-r from-red-800 via-red-600 to-red-800 hover:from-red-700 hover:to-red-500 text-white font-black text-xl rounded-3xl shadow-[0_0_50px_rgba(220,38,38,0.5)] transition-all transform hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-4 group"
                                            >
                                                <Flame size={28} className="group-hover:rotate-12 transition-transform" />
                                                <span>침공 개시 (Invasion)</span>
                                            </button>
                                        )}

                                        <div className="bg-black/40 p-4 rounded-2xl border border-white/5 flex gap-3 items-start text-left">
                                            <Info size={16} className="text-red-500 shrink-0 mt-0.5" />
                                            <p className="text-[10px] text-slate-500 leading-relaxed italic">
                                                {selectedTemple === '신의 거처' && isGodDefeated 
                                                    ? "찬탈된 신계의 중심지입니다. 제국의 위엄도가 극도로 높게 유지됩니다."
                                                    : "성전 침공은 사자의 부하들과 직접 대적하는 행위입니다. 승리 시 해당 성전의 모든 기능을 정지시키고 대원들을 납치할 수 있습니다."}
                                            </p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center text-slate-700 opacity-50 space-y-6">
                                        <Globe size={100} className="mx-auto animate-spin-slow" />
                                        <div className="space-y-1">
                                            <p className="text-xl font-cinzel font-bold">Select Subjugation Target</p>
                                            <p className="text-sm">정벌할 성전 혹은 신의 거처를 선택하십시오.</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 p-8 overflow-y-auto custom-scrollbar bg-slate-900 space-y-6">
                            <h3 className="text-lg font-bold text-red-400 flex items-center gap-2 mb-4"><ShieldAlert size={20}/> 긴급 침공 방어 상황</h3>
                            {pendingInvasions.length > 0 ? (
                                <div className="grid grid-cols-1 gap-4">
                                    {pendingInvasions.map(nationName => (
                                        <div key={nationName} className="bg-red-955/20 border border-red-600/50 p-6 rounded-[2.5rem] flex flex-col md:flex-row justify-between items-center gap-6 group hover:border-red-500 transition-all shadow-lg">
                                            <div className="flex items-center gap-5">
                                                <div className="p-4 bg-red-900/40 rounded-2xl border border-red-500 shadow-inner group-hover:scale-105 transition-transform">
                                                    <Skull size={32} className="text-red-400 animate-pulse"/>
                                                </div>
                                                <div>
                                                    <h4 className="text-xl font-bold text-white flex items-center gap-2">
                                                        {nationName} 역습 부대 출현 
                                                        <span className="text-[10px] bg-red-600 text-white px-2 py-0.5 rounded font-bold animate-bounce">EMERGENCY</span>
                                                    </h4>
                                                    <p className="text-xs text-red-300 mt-1 leading-relaxed max-w-md">적군이 제국 영토를 향해 전진 중입니다. 방치 시 전선 점유율이 10% 하락합니다.</p>
                                                </div>
                                            </div>
                                            <div className="flex gap-2 w-full md:w-auto">
                                                <button onClick={() => handleIgnoreInvasion(nationName)} className="flex-1 md:flex-none px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold transition-all">방치</button>
                                                <button onClick={() => handleDefendInvasion(nationName)} className="flex-1 md:flex-none px-8 py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold shadow-lg shadow-red-900/30 transition-all flex items-center justify-center gap-2 transform hover:scale-105"><Sword size={18}/> 방어전 수행</button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="py-20 text-center text-slate-700 border-2 border-dashed border-slate-800 rounded-[3rem]">
                                    <ShieldCheck size={64} className="mx-auto mb-4 opacity-10"/>
                                    <p className="text-lg font-bold">전선 이상 없음</p>
                                    <p className="text-xs mt-1">제국의 국경은 현재 평온합니다.</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="p-4 bg-slate-950 border-t border-red-900/50 flex justify-between items-center shrink-0 px-8">
                    <div className="flex gap-6 text-xs font-mono">
                        <div className="flex items-center text-amber-500 bg-red-900/10 px-3 py-1 rounded-full border border-red-900/30"><Coins size={14} className="mr-2"/> 제국 자금: {character.money.toLocaleString()}G</div>
                        <div className="flex items-center text-red-400 bg-red-900/10 px-3 py-1 rounded-full border border-red-900/30"><Skull size={14} className="mr-2"/> 나의 악명: {character.infamy || 0}</div>
                    </div>
                    <button onClick={onClose} className="px-8 py-2 bg-slate-800 hover:bg-red-900 text-slate-300 hover:text-white rounded-xl font-bold text-xs border border-slate-700 transition-colors">명령 종료</button>
                </div>
            </div>
        </div>
    );
};

export default MagyeWarModal;
