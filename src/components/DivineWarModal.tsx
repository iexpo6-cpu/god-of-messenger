
import React, { useState } from 'react';
import { Character, Enemy, CombatState } from '../types';
import { X, Flame, Skull, Sparkles, Sword, Coins, ShieldAlert, Crown, AlertTriangle, Loader2, Gift, Gem } from 'lucide-react';
import { DIVINE_WAR_CONSTANTS, generateDivineWarEnemies } from '../divineWarSystem';
import ActionResultModal, { ResultData } from './ActionResultModal';
import { WORLD_GEOGRAPHY } from '../constants';

interface Props {
    character: Character;
    targetId: 'god' | string;
    onClose: () => void;
    onUpdateCharacter: (newChar: Character, logMsg: string) => void;
    onBattle: (enemy: Enemy | Enemy[], combatType: CombatState['type'], source: string, city?: string, nation?: string) => void;
}

const DivineWarModal: React.FC<Props> = ({ character, targetId, onClose, onUpdateCharacter, onBattle }) => {
    const [isProcessing, setIsProcessing] = useState(false);
    const [resultData, setResultData] = useState<ResultData | null>(null);

    const isGod = targetId === 'god';
    const targetName = isGod ? "절대신 엘라" : targetId;
    const relation = isGod 
        ? (character.divineRelations?.god || { affection: 0, status: '중립' })
        : (character.divineRelations?.temples?.[targetId] || { affection: 0, status: '중립' });

    const handleSendGift = () => {
        const { GIFT_COST_GOLD, GIFT_COST_CRYSTAL } = DIVINE_WAR_CONSTANTS;
        const currentGold = character.money || 0;
        const currentCrystal = character.base?.resources?.manaCrystal || 0;

        if (currentGold < GIFT_COST_GOLD || currentCrystal < GIFT_COST_CRYSTAL) {
            alert(`친선 예물을 보내기 위한 자원이 부족합니다.\n필요 자원: 골드 ${(GIFT_COST_GOLD / 10000).toLocaleString()}만 G / 마정석 ${GIFT_COST_CRYSTAL.toLocaleString()}개\n현재 보유: 골드 ${currentGold.toLocaleString()} G / 마정석 ${currentCrystal.toLocaleString()}개`);
            return;
        }

        setIsProcessing(true);
        setTimeout(() => {
            const newChar = JSON.parse(JSON.stringify(character)) as Character;
            newChar.money -= GIFT_COST_GOLD;
            if (newChar.base) newChar.base.resources.manaCrystal -= GIFT_COST_CRYSTAL;

            const boost = 10;
            if (isGod) {
                if (!newChar.divineRelations) newChar.divineRelations = { god: { affection: 0, status: '중립' }, temples: {} };
                newChar.divineRelations.god.affection = Math.min(100, newChar.divineRelations.god.affection + boost);
            } else {
                if (!newChar.divineRelations) newChar.divineRelations = { god: { affection: 0, status: '중립' }, temples: {} };
                if (!newChar.divineRelations.temples[targetId]) newChar.divineRelations.temples[targetId] = { affection: 0, status: '중립' };
                newChar.divineRelations.temples[targetId].affection = Math.min(100, newChar.divineRelations.temples[targetId].affection + boost);
            }

            onUpdateCharacter(newChar, `[신성 친선] ${targetName}에게 골드 1,000만 G와 마정석 5,000개로 구성된 귀중한 예물 세트를 증정하여 유대를 다졌습니다. (친밀도 +${boost})`);
            setResultData({
                type: 'success',
                title: '친선 예물 증정 완료',
                message: `${targetName}에게 순금 보화와 고순도 마정석 예물 세트를 전달했습니다.\n상대의 기운이 온화해졌습니다.`,
                items: [
                    { label: '친밀도', before: relation.affection, after: relation.affection + boost },
                    { label: '소모 골드', after: `-${(GIFT_COST_GOLD / 10000).toLocaleString()}만 G` },
                    { label: '소모 마정석', after: `-${GIFT_COST_CRYSTAL.toLocaleString()}개` }
                ]
            });
            setIsProcessing(false);
        }, 800);
    };

    const handleStartInvasion = () => {
        const combatType: CombatState['type'] = isGod ? 'god_rebellion' : 'temple_invasion';
        const infamyGain = isGod ? DIVINE_WAR_CONSTANTS.GOD_REBELLION_INFAMY : DIVINE_WAR_CONSTANTS.TEMPLE_INVASION_INFAMY;
        
        const actualInfamy = relation.affection <= -100 ? 0 : infamyGain;

        const newChar = { ...character };
        newChar.infamy = (newChar.infamy || 0) + actualInfamy;

        // 신성 전쟁 개시 시 참가 동료들의 악명도도 함께 상승
        if (actualInfamy > 0) {
            newChar.companions = newChar.companions.map(c => ({
                ...c,
                infamy: (c.infamy || 0) + actualInfamy
            }));
            if (newChar.inactiveCompanions) {
                newChar.inactiveCompanions = newChar.inactiveCompanions.map(c => ({
                    ...c,
                    infamy: (c.infamy || 0) + actualInfamy
                }));
            }
        }
        
        if (isGod) {
            if (!newChar.divineRelations) newChar.divineRelations = { god: { affection: 0, status: '중립' }, temples: {} };
            newChar.divineRelations.god.affection = -100;
            newChar.divineRelations.god.status = "적대";
        } else {
            if (!newChar.divineRelations) newChar.divineRelations = { god: { affection: 0, status: '중립' }, temples: {} };
            if (!newChar.divineRelations.temples[targetId]) newChar.divineRelations.temples[targetId] = { affection: 0, status: '중립' };
            newChar.divineRelations.temples[targetId].affection = -100;
            newChar.divineRelations.temples[targetId].status = "적대";
        }

        let nation = "신계";
        let city = isGod ? "신의 거처" : targetId;
        
        if (!isGod) {
            for (const r in WORLD_GEOGRAPHY) {
                for (const n in WORLD_GEOGRAPHY[r]) {
                    if (WORLD_GEOGRAPHY[r][n].cities.includes(targetId)) {
                        nation = n;
                        break;
                    }
                }
            }
        }

        const enemies = generateDivineWarEnemies(isGod ? 'GOD' : 'TEMPLE', nation, city, character.level);
        
        onUpdateCharacter(newChar, `[${isGod ? '신의 반란' : '성전 침공'}] ${targetName}에 대한 무력 행사를 개시합니다!`);
        onBattle(enemies, combatType, targetName, city, nation);
        onClose();
    };

    const userGold = character.money || 0;
    const userCrystal = character.base?.resources?.manaCrystal || 0;
    const hasEnoughForGift = userGold >= DIVINE_WAR_CONSTANTS.GIFT_COST_GOLD && userCrystal >= DIVINE_WAR_CONSTANTS.GIFT_COST_CRYSTAL;

    return (
        <div className="fixed inset-0 z-[170] flex items-center justify-center bg-black/90 backdrop-blur-md p-2 sm:p-4 animate-in fade-in duration-300">
            {resultData && <ActionResultModal data={resultData} onClose={() => { setResultData(null); onClose(); }} />}

            <div className={`w-full max-w-lg h-[92vh] sm:h-auto sm:max-h-[90vh] rounded-3xl border shadow-2xl flex flex-col overflow-hidden relative transition-all duration-300 ${isGod ? 'bg-slate-950 border-red-500/40' : 'bg-slate-950 border-indigo-500/40'}`}>
                
                {/* Header */}
                <div className={`px-4 py-3.5 sm:px-6 sm:py-4 border-b flex justify-between items-center shrink-0 ${isGod ? 'bg-gradient-to-r from-red-950/60 via-slate-900 to-red-950/40 border-red-500/30' : 'bg-gradient-to-r from-indigo-950/60 via-slate-900 to-amber-950/40 border-indigo-500/30'}`}>
                    <div className="flex items-center gap-3">
                        <div className={`p-2.5 rounded-xl border ${isGod ? 'bg-red-500/10 border-red-500/30 text-red-400' : 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400'}`}>
                            {isGod ? <Flame size={20} className="animate-pulse" /> : <Crown size={20} />}
                        </div>
                        <div>
                            <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                                {isGod ? '천계 반역 및 신성 외교' : '성전 외교 및 무력 침공'}
                            </h2>
                            <p className="text-[11px] text-slate-400 font-medium">
                                {targetName}과의 의사결정
                            </p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose} 
                        className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800/80 transition-colors"
                        aria-label="닫기"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Body Content */}
                <div className="p-4 sm:p-6 space-y-5 flex-1 overflow-y-auto custom-scrollbar">
                    
                    {/* Status Display Card */}
                    <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 text-center space-y-2">
                        <span className="text-[11px] text-slate-400 font-medium block">현재 호감도 현황</span>
                        <div className="flex items-center justify-center gap-2">
                            <span className={`text-3xl font-mono font-bold ${relation.affection >= 0 ? 'text-pink-300' : 'text-red-400'}`}>
                                {relation.affection}
                            </span>
                            <span className="text-pink-400 text-xl">♥</span>
                        </div>
                        <div>
                            <span className={`inline-block px-3 py-0.5 rounded-full border text-xs font-bold ${relation.affection >= 50 ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300' : relation.affection <= -50 ? 'bg-red-950/60 border-red-500/40 text-red-300' : 'bg-slate-800/80 border-slate-700 text-slate-300'}`}>
                                {relation.status} 상태
                            </span>
                        </div>
                    </div>

                    <div className="space-y-4">
                        {/* Friendly Gift Option */}
                        <div className="bg-slate-900/90 p-4 sm:p-5 rounded-2xl border border-emerald-500/20 hover:border-emerald-500/40 transition-all space-y-3">
                            <div className="flex justify-between items-start">
                                <div className="flex items-center gap-2.5">
                                    <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                                        <Gift size={20} />
                                    </div>
                                    <div>
                                        <h3 className="text-xs sm:text-sm font-bold text-emerald-300">친선 예물 증정</h3>
                                        <span className="text-[10px] text-slate-400">순금 보화 및 고급 마정석 세트</span>
                                    </div>
                                </div>
                                <span className="text-xs font-bold text-emerald-400 bg-emerald-950/60 px-2.5 py-1 rounded-lg border border-emerald-500/30">
                                    친밀도 +10
                                </span>
                            </div>

                            <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                                "1,000만 골드의 순금 보화와 고순도 마정석 5,000개로 구성된 최고급 예물 세트를 증정하여 유대를 두텁게 합니다."
                            </p>

                            {/* Required Resource Tags */}
                            <div className="grid grid-cols-2 gap-2 text-xs font-medium">
                                <div className={`p-2 rounded-xl border flex items-center justify-between ${userGold >= DIVINE_WAR_CONSTANTS.GIFT_COST_GOLD ? 'bg-slate-950 border-amber-500/30 text-amber-300' : 'bg-red-950/30 border-red-500/30 text-red-400'}`}>
                                    <span className="flex items-center gap-1.5 text-[11px]">
                                        <Coins size={14} className="text-amber-400" /> 소모 골드
                                    </span>
                                    <span className="font-mono font-bold text-xs">1,000만 G</span>
                                </div>
                                <div className={`p-2 rounded-xl border flex items-center justify-between ${userCrystal >= DIVINE_WAR_CONSTANTS.GIFT_COST_CRYSTAL ? 'bg-slate-950 border-cyan-500/30 text-cyan-300' : 'bg-red-950/30 border-red-500/30 text-red-400'}`}>
                                    <span className="flex items-center gap-1.5 text-[11px]">
                                        <Gem size={14} className="text-cyan-400" /> 소모 마정석
                                    </span>
                                    <span className="font-mono font-bold text-xs">5,000개</span>
                                </div>
                            </div>

                            <button 
                                onClick={handleSendGift}
                                disabled={isProcessing || !hasEnoughForGift}
                                className={`w-full py-3 rounded-xl font-bold text-xs sm:text-sm shadow-lg transition-all flex items-center justify-center gap-2 ${hasEnoughForGift ? 'bg-emerald-600 hover:bg-emerald-500 text-white active:scale-98' : 'bg-slate-800 text-slate-500 cursor-not-allowed'}`}
                            >
                                <Gift size={16} />
                                <span>친선 예물 세트 전송</span>
                            </button>
                        </div>

                        {/* Hostile Invasion Option */}
                        <div className={`p-4 sm:p-5 rounded-2xl border transition-all space-y-3 ${isGod ? 'bg-red-950/20 border-red-500/40 hover:border-red-500/60' : 'bg-slate-900/90 border-slate-800 hover:border-red-500/40'}`}>
                            <div className="flex justify-between items-start">
                                <div className="flex items-center gap-2.5">
                                    <div className="p-2 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400">
                                        <Sword size={20} />
                                    </div>
                                    <div>
                                        <h3 className="text-xs sm:text-sm font-bold text-red-400">
                                            {isGod ? '천계 반역 선포' : '성전 무력 침공'}
                                        </h3>
                                        <span className="text-[10px] text-slate-400">적대적 결전 개시</span>
                                    </div>
                                </div>
                                <span className="text-xs font-bold text-red-400 bg-red-950/60 px-2.5 py-1 rounded-lg border border-red-500/30">
                                    {isGod ? '천계 전복' : '성전 약탈'}
                                </span>
                            </div>

                            <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                                {isGod 
                                    ? "신의 권위에 정면으로 도전합니다. 승리 시 창조신의 권능(모든 능력치 +10만)을 차지하지만, 패배 시 성전의 위엄이 실추됩니다." 
                                    : "성전의 사자와 수호수에게 도전합니다. 승리 시 성전 인원을 포섭하고 막대한 위엄을 과시합니다."}
                            </p>

                            <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 space-y-1.5 text-[11px]">
                                <div className="flex justify-between items-center text-red-400 font-medium">
                                    <span className="flex items-center gap-1">
                                        <ShieldAlert size={12} /> 예상 악명 상승
                                    </span>
                                    <span className="font-mono font-bold">+{isGod ? '10,000' : '500'}</span>
                                </div>
                                <div className="flex justify-between items-center text-amber-400 font-medium">
                                    <span className="flex items-center gap-1">
                                        <AlertTriangle size={12} /> 패배 시 위엄 감소
                                    </span>
                                    <span className="font-mono font-bold">{isGod ? '-5,000' : '-2,000'}</span>
                                </div>
                                {isGod && (
                                    <div className="flex justify-between items-center text-emerald-400 font-medium">
                                        <span className="flex items-center gap-1">
                                            <Sparkles size={12} /> 승리 시 보상
                                        </span>
                                        <span className="font-mono font-bold">전능력치 +100,000</span>
                                    </div>
                                )}
                            </div>

                            <button 
                                onClick={handleStartInvasion}
                                disabled={isProcessing}
                                className={`w-full py-3 rounded-xl font-bold text-xs sm:text-sm shadow-lg transition-all flex items-center justify-center gap-2 active:scale-98 ${isGod ? 'bg-red-600 hover:bg-red-500 text-white' : 'bg-red-900/80 hover:bg-red-800 text-white border border-red-700/50'}`}
                            >
                                <Skull size={16} />
                                <span>{isGod ? '신에 대한 반역 개시' : '성전 침공 명령'}</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Loading Overlay */}
                {isProcessing && (
                    <div className="absolute inset-0 bg-black/80 z-[180] flex flex-col items-center justify-center gap-3">
                        <Loader2 size={36} className="animate-spin text-amber-400" />
                        <p className="text-white text-xs font-bold tracking-wider animate-pulse">의사 결정을 전달하는 중입니다...</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DivineWarModal;

