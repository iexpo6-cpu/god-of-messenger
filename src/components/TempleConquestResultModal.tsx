
import React, { useState } from 'react';
import { Character, Companion, JobType } from '../types';
import { X, Skull, UserPlus, Coins, Zap, ShieldAlert, Heart, Flame, Landmark, Loader2, Crown, Sparkles } from 'lucide-react';
import ActionResultModal, { ResultData } from './ActionResultModal';
import { generateLootedStaff } from '../divineWarSystem';
import { assignRandomCombatStyle } from '../utils';

interface Props {
    character: Character;
    targetTempleName: string; // 침공한 성전 도시 이름
    onClose: () => void;
    onUpdateCharacter: (newChar: Character, logMsg: string) => void;
}

const TempleConquestResultModal: React.FC<Props> = ({ character, targetTempleName, onClose, onUpdateCharacter }) => {
    const [isProcessing, setIsProcessing] = useState(false);
    const [resultData, setResultData] = useState<ResultData | null>(null);

    // 마계 지배자(마신 또는 제너럴) 여부 판별
    const isMagyeLeader = [
        JobType.DEMON_GOD,
        JobType.MAGYE_GENERAL_1, JobType.MAGYE_GENERAL_2, JobType.MAGYE_GENERAL_3,
        JobType.MAGYE_GENERAL_4, JobType.MAGYE_GENERAL_5, JobType.MAGYE_GENERAL_6,
        JobType.MAGYE_GENERAL_7, JobType.MAGYE_GENERAL_8, JobType.MAGYE_GENERAL_9,
        JobType.MAGYE_GENERAL_10, JobType.MAGYE_GENERAL_11
    ].includes(character.job);

    const handlePlunder = () => {
        setIsProcessing(true);
        setTimeout(() => {
            const newChar = JSON.parse(JSON.stringify(character)) as Character;
            const lv = newChar.level || 1;
            
            // 보상: 레벨 비례 대량 자원
            const goldGain = lv * 2000;
            const crystalGain = Math.floor(lv / 5) + 10;
            
            newChar.money += goldGain;
            if (newChar.base) {
                newChar.base.resources.manaCrystal += crystalGain;
            }
            
            // 악명 상승
            newChar.infamy = (newChar.infamy || 0) + 100;
            
            onUpdateCharacter(newChar, `[성전 약탈] ${targetTempleName}의 보물고를 털어 ${goldGain.toLocaleString()}G와 마정석 ${crystalGain}개를 탈취했습니다. (악명 +100)`);
            
            setResultData({
                type: 'success',
                title: '약탈 완료',
                message: '성전의 신성한 보물들이 당신의 손에 들어왔습니다. 세간의 평판은 극도로 악화되었습니다.',
                items: [
                    { label: '획득 골드', after: `+${goldGain.toLocaleString()} G` },
                    { label: '획득 마정석', after: `+${crystalGain}` },
                    { label: '악명도 상승', after: '+100' }
                ]
            });
            setIsProcessing(false);
        }, 1500);
    };

    const handleEnslave = () => {
        setIsProcessing(true);
        setTimeout(() => {
            const newChar = JSON.parse(JSON.stringify(character)) as Character;
            
            // 인재 납치 (집사/메이드 랜덤 1인)
            const lootedStaff = generateLootedStaff(targetTempleName, newChar.level);
            
            const preppedStaff = assignRandomCombatStyle(lootedStaff, true, true);
            if (newChar.companions.length < 5) {
                newChar.companions.push(preppedStaff);
            } else {
                if (!newChar.inactiveCompanions) newChar.inactiveCompanions = [];
                newChar.inactiveCompanions.push(preppedStaff);
            }
            
            // 악명 상승
            newChar.infamy = (newChar.infamy || 0) + 100;
            
            onUpdateCharacter(newChar, `[인원 납치] ${targetTempleName}의 숙련된 ${lootedStaff.classType} '${lootedStaff.name}'을(를) 강제로 노예화하여 끌고 왔습니다. (악명 +100)`);
            
            setResultData({
                type: 'levelup',
                title: '노예화 성공',
                message: `성전의 인원을 강제로 복속시켰습니다. ${lootedStaff.name}은(는) 이제 당신의 명령에 따라야 합니다.`,
                items: [
                    { label: '납치 인원', after: lootedStaff.name },
                    { label: '역할', after: lootedStaff.classType },
                    { label: '악명도 상승', after: '+100' }
                ]
            });
            setIsProcessing(false);
        }, 1500);
    };

    const handleMercy = () => {
        const newChar = { ...character };
        let infamyReduction = 0;

        if (isMagyeLeader) {
            infamyReduction = 500;
            newChar.infamy = Math.max(0, (newChar.infamy || 0) - infamyReduction);
        }
        
        newChar.faith = (newChar.faith || 0) + 50; // 자비의 대가로 신앙심 상승
        
        const logMsg = isMagyeLeader 
            ? `[지배자의 관용] 함락시킨 ${targetTempleName}의 백성들을 조건 없이 방면했습니다. 공포에 떨던 민중들은 당신의 예상치 못한 자비에 경악하며 찬사를 보냅니다. (악명 -${infamyReduction})`
            : `[신성한 자비] 함락시킨 ${targetTempleName}의 백성들을 방면했습니다. 신의 자애로움이 널리 알려집니다.`;
        
        onUpdateCharacter(newChar, logMsg);
        
        setResultData({
            type: 'success',
            title: isMagyeLeader ? '지배자의 관용' : '관용의 사자',
            message: isMagyeLeader 
                ? '무력으로 굴복시킨 자들을 너그럽게 용서했습니다. 공포의 대명사였던 당신의 악명이 크게 희석됩니다.'
                : '패배한 자들을 용서하고 놓아주었습니다. 당신의 자비로움에 성전의 명예가 드높아집니다.',
            items: [
                { label: '신앙심 획득', after: '+50' },
                { label: '악명도 변화', after: isMagyeLeader ? `-${infamyReduction}` : '변동 없음' }
            ]
        });
    };

    return (
        <div className="fixed inset-0 z-[1250] flex items-center justify-center bg-black/95 backdrop-blur-xl p-4 animate-in fade-in">
            {resultData && <ActionResultModal data={resultData} onClose={onClose} />}

            <div className="bg-slate-900 border-2 border-amber-500 w-full max-w-lg rounded-[2.5rem] shadow-[0_0_80px_rgba(245,158,11,0.3)] flex flex-col overflow-hidden relative">
                <div className="absolute inset-0 bg-gradient-to-b from-amber-900/10 to-transparent pointer-events-none"></div>

                <div className="p-8 border-b border-amber-900/50 bg-amber-950/20 text-center shrink-0">
                    <Crown size={48} className="mx-auto text-amber-400 mb-4 animate-bounce-short" />
                    <h2 className="text-3xl font-bold text-white font-cinzel tracking-tighter">VICTORY OVER TEMPLE</h2>
                    <p className="text-sm text-amber-400 font-bold uppercase tracking-widest mt-2">함락된 성전: {targetTempleName}</p>
                </div>

                <div className="p-8 space-y-8 flex-1 overflow-y-auto custom-scrollbar">
                    <p className="text-center text-slate-300 leading-relaxed">
                        성전의 방어선을 무너뜨리고 사자를 굴복시켰습니다.<br/>
                        함락된 성전의 운명은 이제 당신의 손에 달려 있습니다.
                    </p>

                    <div className="grid grid-cols-1 gap-4">
                        <button 
                            onClick={handlePlunder}
                            disabled={isProcessing}
                            className="p-6 bg-slate-800 hover:bg-amber-900/40 border-2 border-slate-700 hover:border-amber-500 rounded-3xl flex flex-col items-center gap-3 transition-all group"
                        >
                            <Coins size={32} className="text-amber-400 group-hover:scale-110 transition-transform"/>
                            <div className="text-center">
                                <h4 className="font-bold text-white text-lg">성전 약탈 (Plunder)</h4>
                                <p className="text-[10px] text-slate-500">대량의 골드와 마정석을 수탈합니다. (악명 +100)</p>
                            </div>
                        </button>

                        <button 
                            onClick={handleEnslave}
                            disabled={isProcessing}
                            className="p-6 bg-slate-800 hover:bg-red-900/40 border-2 border-slate-700 hover:border-red-500 rounded-3xl flex flex-col items-center gap-3 transition-all group"
                        >
                            <UserPlus size={32} className="text-red-400 group-hover:scale-110 transition-transform"/>
                            <div className="text-center">
                                <h4 className="font-bold text-white text-lg">인재 노예화 (Enslave)</h4>
                                <p className="text-[10px] text-slate-500">성전 인원을 노예 동료로 끌고 옵니다. (악명 +100)</p>
                            </div>
                        </button>

                        <button 
                            onClick={handleMercy}
                            disabled={isProcessing}
                            className="p-6 bg-slate-800 hover:bg-green-900/40 border-2 border-slate-700 hover:border-green-500 rounded-3xl flex flex-col items-center gap-3 transition-all group"
                        >
                            <Sparkles size={32} className="text-green-400 group-hover:scale-110 transition-transform"/>
                            <div className="text-center">
                                <h4 className="font-bold text-white text-lg">{isMagyeLeader ? '지배자의 관용 (Clemency)' : '성스러운 자비 (Mercy)'}</h4>
                                <p className="text-[10px] text-slate-500">
                                    {isMagyeLeader ? '패배한 자들을 놓아주어 악명을 희석합니다. (악명 -500)' : '아무것도 취하지 않고 방면합니다. (신앙심 +50)'}
                                </p>
                            </div>
                        </button>
                    </div>
                </div>

                {isProcessing && (
                    <div className="absolute inset-0 bg-black/60 z-20 flex flex-col items-center justify-center">
                        <Loader2 size={48} className="animate-spin text-amber-500 mb-4"/>
                        <p className="text-white font-bold animate-pulse">결과 처리 중...</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TempleConquestResultModal;
