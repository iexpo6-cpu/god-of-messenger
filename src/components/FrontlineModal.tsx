
import React from 'react';
import { Character, NationRelation, DiplomaticStatus, MilitaryRank } from '../types';
import { X, Sword, Shield, AlertTriangle, TrendingUp, TrendingDown, Flag, Map, Target, Flame, Skull, Info, ShieldAlert, Gavel, HandCoins, Crown, MessageSquare, Send, Users, Lock } from 'lucide-react';
import { getOccupationStatusText } from '../warsystem';
import VassalManagementModal from './VassalManagementModal';
import NationalDiplomacyModal from './NationalDiplomacyModal';
import WarDispatchModal from './WarDispatchModal';
import { MILITARY_RANK_ORDER, MAGYE_LEADERS } from '../constants';

interface Props {
    character: Character;
    targetNation: string;
    onClose: () => void;
    onAttack: () => void;
    onUpdateCharacter: (newChar: Character, logMsg: string) => void;
}

const FrontlineModal: React.FC<Props> = ({ character, targetNation, onClose, onAttack, onUpdateCharacter }) => {
    const [isVassalModalOpen, setIsVassalModalOpen] = React.useState(false);
    const [isDiplomacyModalOpen, setIsDiplomacyModalOpen] = React.useState(false);
    const [isWarDispatchOpen, setIsWarDispatchOpen] = React.useState(false);
    
    const mData = character.militaryData;
    const relation = mData?.diplomacy?.[targetNation] || { status: DiplomaticStatus.WAR, tension: 100, occupation: 0 };
    const occupation = relation.occupation || 0; 
    const statusInfo = getOccupationStatusText(occupation);
    const isRaidOccupationClaimedToday = relation.lastRaidOccupationDate === (character.currentDate || '2000-01-01');
    
    const progressPos = ((occupation + 100) / 200) * 100;

    const isVassal = relation.status === DiplomaticStatus.VASSAL_OWNER || relation.status === DiplomaticStatus.VASSAL_SUBJECT;
    
    const playerRank = character.militaryRank || MilitaryRank.PVT;
    
    // [MODIFIED] 파견 권한: 대령 이상 이거나 마계 지배자(마신, 제너럴)인 경우 허용
    const isColonelPlus = (MILITARY_RANK_ORDER.indexOf(playerRank) >= MILITARY_RANK_ORDER.indexOf(MilitaryRank.COL)) || MAGYE_LEADERS.includes(character.job);

    return (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in duration-300">
            {isVassalModalOpen && (
                <VassalManagementModal 
                    character={character}
                    targetNation={targetNation}
                    onClose={() => setIsVassalModalOpen(false)}
                    onUpdateCharacter={onUpdateCharacter}
                />
            )}
            
            {isDiplomacyModalOpen && (
                <NationalDiplomacyModal
                    character={character}
                    onClose={() => setIsDiplomacyModalOpen(false)}
                    onUpdateCharacter={onUpdateCharacter}
                />
            )}

            {isWarDispatchOpen && (
                <WarDispatchModal
                    character={character}
                    targetNation={targetNation}
                    onClose={() => setIsWarDispatchOpen(false)}
                    onUpdateCharacter={onUpdateCharacter}
                />
            )}

            <div className="bg-slate-900 border border-red-600/50 w-full max-w-4xl h-[80vh] rounded-3xl shadow-[0_0_80px_rgba(220,38,38,0.2)] flex flex-col relative overflow-hidden">
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/black-scales.png')] opacity-10 pointer-events-none"></div>
                
                <div className="p-6 border-b border-red-900/30 bg-red-950/20 flex justify-between items-center shrink-0 z-10">
                    <div className="flex items-center">
                        <div className="p-3 bg-red-900/30 rounded-xl border border-red-500/50 mr-4 shadow-lg">
                            <Sword size={32} className="text-red-500 animate-pulse" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-white font-cinzel tracking-wider uppercase">{isVassal ? 'Administrative Center' : 'Strategic Frontline'}</h2>
                            <p className="text-xs text-red-400 font-bold">대 {targetNation} {isVassal ? '행정 관리실' : '전선 상황실'}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-slate-500 hover:text-white p-2 rounded-full hover:bg-slate-800 transition-colors">
                        <X size={24} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-8 bg-slate-900 custom-scrollbar z-10 space-y-10">
                    
                    {isVassal ? (
                        <div className="space-y-8 animate-in zoom-in-95">
                            <div className="bg-slate-950 p-8 rounded-[2.5rem] border border-indigo-500/30 text-center relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-10 opacity-5">
                                    {relation.status === DiplomaticStatus.VASSAL_OWNER ? <Crown size={150}/> : <Skull size={150}/>}
                                </div>
                                <div className="relative z-10">
                                    <h3 className="text-3xl font-bold text-white mb-2">지배 구역 관리</h3>
                                    <p className="text-sm text-slate-400 mb-8 max-w-md mx-auto">
                                        {relation.status === DiplomaticStatus.VASSAL_OWNER 
                                            ? `우리의 승리로 ${targetNation}은(는) 속국이 되었습니다. 매년 조공을 거둘 수 있습니다.` 
                                            : `전쟁의 패배로 ${targetNation}의 속국이 되었습니다. 매년 세금을 성실히 납부해야 합니다.`}
                                    </p>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-lg mx-auto">
                                        <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800">
                                            <div className="text-[10px] text-slate-500 uppercase font-bold mb-1">Status</div>
                                            <div className={`text-lg font-bold ${relation.status === DiplomaticStatus.VASSAL_OWNER ? 'text-amber-400' : 'text-red-500'}`}>
                                                {relation.status}
                                            </div>
                                        </div>
                                        <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800">
                                            <div className="text-[10px] text-slate-500 uppercase font-bold mb-1">Years Left</div>
                                            <div className="text-lg font-bold text-white font-mono">
                                                {relation.vassalYearsRemaining} Years
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <button 
                                        onClick={() => setIsVassalModalOpen(true)}
                                        className={`mt-10 px-12 py-5 rounded-2xl font-bold shadow-xl transition-all transform hover:scale-105 active:scale-95 flex items-center gap-3 mx-auto ${relation.status === DiplomaticStatus.VASSAL_OWNER ? 'bg-amber-600 hover:bg-amber-500 text-white' : 'bg-red-700 hover:bg-red-600 text-white'}`}
                                    >
                                        {relation.status === DiplomaticStatus.VASSAL_OWNER ? <><Gavel size={24}/> 자원 수탈 관리</> : <><HandCoins size={24}/> 조공/납세 관리</>}
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="space-y-6">
                                <div className="flex justify-between items-end mb-2">
                                    <div className="text-left">
                                        <div className="flex items-center gap-2 text-blue-400 font-bold mb-1">
                                            <Flag size={18}/> {character.nation} (본국)
                                        </div>
                                        <div className="text-[10px] text-slate-500 uppercase font-bold">Defensive Line</div>
                                    </div>
                                    <div className="text-center">
                                        <div className={`text-xl font-bold font-mono ${statusInfo.color} animate-bounce-short`}>
                                            {statusInfo.label}
                                        </div>
                                        <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Occupation: {occupation}%</div>
                                    </div>
                                    <div className="text-right">
                                        <div className="flex items-center justify-end gap-2 text-red-500 font-bold mb-1">
                                            {targetNation} (적국) <Skull size={18}/>
                                        </div>
                                        <div className="text-[10px] text-slate-500 uppercase font-bold">Offensive Line</div>
                                    </div>
                                </div>

                                <div className="relative h-12 bg-slate-950 rounded-2xl border border-slate-800 p-1 shadow-inner overflow-hidden">
                                    <div 
                                        className="absolute left-1 top-1 bottom-1 bg-gradient-to-r from-blue-900 to-blue-600 rounded-l-xl transition-all duration-1000 ease-out shadow-[0_0_20px_rgba(37,99,235,0.4)]"
                                        style={{ width: `calc(${progressPos}% - 4px)` }}
                                    >
                                        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20"></div>
                                    </div>
                                    
                                    <div className="absolute right-1 left-1 top-1 bottom-1 bg-gradient-to-l from-red-900 to-red-600 rounded-xl -z-10">
                                        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20"></div>
                                    </div>

                                    <div className="absolute left-1/2 top-0 bottom-0 w-1 bg-white/20 -translate-x-1/2 z-20"></div>

                                    <div 
                                        className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-30 transition-all duration-1000 ease-out"
                                        style={{ left: `${progressPos}%` }}
                                    >
                                        <div className="p-2 bg-white rounded-full shadow-[0_0_15px_rgba(255,255,255,0.5)] border-2 border-red-600 animate-pulse">
                                            <Flame size={20} className="text-red-600 fill-red-600" />
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="p-4 bg-slate-950/50 rounded-2xl border border-slate-800 text-center">
                                    <p className="text-sm text-slate-300 leading-relaxed italic">
                                        "{statusInfo.desc}"
                                    </p>
                                    <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-2 text-[10px] font-bold uppercase tracking-tighter">
                                        <div className={`p-2 rounded-lg border ${occupation <= 30 ? 'bg-blue-900/40 border-blue-500 text-white' : 'bg-slate-900 border border-slate-800 text-slate-600'}`}>0-30%: 국경 대치</div>
                                        <div className={`p-2 rounded-lg border ${occupation > 30 && occupation < 100 ? 'bg-indigo-900/40 border-indigo-500 text-white' : 'bg-slate-900 border border-slate-800 text-slate-600'}`}>31-99%: 정예전 및 고지전</div>
                                        <div className={`p-2 rounded-lg border ${occupation >= 100 ? 'bg-amber-900/40 border-amber-500 text-white' : 'bg-slate-900 border border-slate-800 text-slate-600'}`}>100%: 수도 결전 (Raid)</div>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="bg-slate-950 p-6 rounded-3xl border border-red-900/30 flex flex-col relative overflow-hidden">
                                    {occupation >= 100 && <div className="absolute top-2 right-2 bg-amber-600 text-white text-[8px] font-bold px-2 py-0.5 rounded-full animate-bounce">BOSS READY</div>}
                                    <h4 className="font-bold text-red-400 mb-4 flex items-center gap-2">
                                        <Target size={18}/> {occupation >= 100 ? '수도 최종 함락 작전' : '공세 전술'}
                                    </h4>
                                    <p className="text-xs text-slate-500 mb-6 leading-relaxed">
                                        {occupation >= 100 
                                            ? '적국의 숨통을 끊을 때입니다. 지도자와의 최종 결전이 기다립니다.' 
                                            : isRaidOccupationClaimedToday 
                                            ? '오늘 이미 전선 습격을 통해 점유율을 획득했습니다. (전선 점유율은 하루 1회만 획득 가능)' 
                                            : '적의 전선을 직접 타격하여 점유율을 확보합니다. (전선 점유율 획득은 하루 1회 가능)'}
                                    </p>
                                    <button 
                                        onClick={() => {
                                            let newChar = JSON.parse(JSON.stringify(character)) as Character;
                                            let isQuestUpdated = false;
                                            const currentNation = targetNation;
                                            const curOccupation = relation?.occupation || 0;

                                            if (newChar.militaryData?.activeMissions) {
                                                newChar.militaryData.activeMissions = newChar.militaryData.activeMissions.map(m => {
                                                    if (m.type === 'MilitaryAttackShare' && (m.currentAmount || 0) < (m.targetAmount || 1)) {
                                                        const questNation = m.targetNation || m.location?.nation;
                                                        const reqShare = m.requiredTotalShare || ((m.initialShare || 0) + (m.targetShare || 5));
                                                        if (questNation === currentNation && curOccupation >= reqShare) {
                                                            isQuestUpdated = true;
                                                            return {
                                                                ...m,
                                                                currentAmount: m.targetAmount || 1
                                                            };
                                                        }
                                                    }
                                                    return m;
                                                });
                                            }
                                            if (isQuestUpdated) {
                                                onUpdateCharacter(newChar, `[전선 습격] ${currentNation} 전선 돌파로 목표 점유율을 충족했습니다! (전선 공세 퀘스트 완수 가능)`);
                                            }
                                            onAttack();
                                        }}
                                        className="mt-auto py-4 bg-red-800 hover:bg-red-700 text-white font-bold rounded-xl shadow-lg transition-all transform active:scale-95 flex items-center justify-center gap-2"
                                    >
                                        <Sword size={20}/> {occupation >= 100 ? '지도자 처단' : isRaidOccupationClaimedToday ? '전선 돌파 작전 (오늘 점유율 획득 완료)' : '전선 돌파 작전'}
                                    </button>
                                </div>

                                <div className="bg-slate-950 p-6 rounded-3xl border border-blue-900/30 flex flex-col gap-4">
                                    <h4 className="font-bold text-blue-400 mb-2 flex items-center gap-2">
                                        <Shield size={18}/> 전략 및 특수 파견
                                    </h4>
                                    
                                    <button 
                                        onClick={() => setIsWarDispatchOpen(true)}
                                        disabled={!isColonelPlus}
                                        className={`w-full py-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md group ${isColonelPlus ? 'bg-red-900/40 hover:bg-red-800 text-red-100 border border-red-700' : 'bg-slate-800 text-slate-600 border border-slate-700 cursor-not-allowed'}`}
                                    >
                                        {isColonelPlus ? <Send size={18} className="group-hover:scale-110 transition-transform"/> : <Lock size={16}/>}
                                        {isColonelPlus ? '전쟁 병력 파견 (Invasion)' : '대령(COL) 이상 또는 지배자 가능'}
                                    </button>

                                    <div className="flex-1 flex flex-col">
                                        <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                                            대규모 병력을 적지로 파견하여 점유율을 안정적으로 확보합니다. <br/>
                                            다수의 동료를 투입할수록 성공 확률이 상승합니다.
                                        </p>
                                        <button 
                                            onClick={() => setIsDiplomacyModalOpen(true)}
                                            className="mt-auto py-4 bg-indigo-900/40 hover:bg-indigo-800 text-indigo-100 border border-indigo-700 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md group"
                                        >
                                            <MessageSquare size={18}/> 휴전 협상 및 외교 상황실
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-black/20 p-5 rounded-2xl border border-white/5">
                                <h4 className="text-[10px] text-slate-500 font-bold uppercase mb-3 flex items-center gap-2">
                                    <Info size={14}/> Strategic Intelligence
                                </h4>
                                <ul className="text-[10px] text-slate-400 space-y-2 list-disc list-inside">
                                    <li className={occupation >= 31 ? "text-amber-400 font-bold" : ""}>점유율 31% 이상: 적의 <span className="underline">정예 부대</span>와 <span className="underline">네임드 부대장</span>이 전선에 배치됩니다.</li>
                                    <li className={occupation >= 100 ? "text-amber-400 font-bold" : ""}>점유율 100% 도달: 적국 <span className="underline">국가 지도자</span>와의 레이드가 해금됩니다.</li>
                                    <li>병력 파견은 <span className="text-red-400">대령(COL)</span> 이상의 지휘관 또는 <span className="text-amber-400">마계 지배자</span>만 가능하며, 1개월의 시간이 소요됩니다.</li>
                                </ul>
                            </div>
                        </>
                    )}
                </div>

                <div className="p-4 bg-slate-950 border-t border-slate-800 flex justify-end shrink-0">
                    <button onClick={onClose} className="px-8 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold text-xs border border-slate-700 transition-colors">작전실 대기</button>
                </div>
            </div>
        </div>
    );
};

export default FrontlineModal;