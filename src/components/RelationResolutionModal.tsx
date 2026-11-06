
import React, { useState } from 'react';
import { Character, Enemy, Companion, RelationType, Stats } from '../types';
import { X, Skull, Sword, Shield, AlertTriangle, HeartCrack, Gavel, ArrowRight, UserMinus, UserCheck, Flame, UserPlus } from 'lucide-react';
import ActionResultModal, { ResultData } from './ActionResultModal';

interface Props {
    character: Character;
    targetId: string;
    enemy: Enemy;
    onClose: () => void;
    onUpdateCharacter: (newChar: Character, logMsg: string) => void;
}

const RelationResolutionModal: React.FC<Props> = ({ character, targetId, enemy, onClose, onUpdateCharacter }) => {
    const [resultData, setResultData] = useState<ResultData | null>(null);

    // 데이터 소스 통합 검색
    const allPossibleTargets = [
        ...(character.schoolData?.classmates || []),
        ...(character.clubData?.clubMembers || []),
        ...(character.socialNetwork || []),
        ...Object.values(character.base?.templeVisitors || {}).flat()
    ] as any[];

    const targetNpc = allPossibleTargets.find(t => t.id === targetId);
    
    // 플레이어와의 현재 관계 파악
    const getRelationType = (c: any): RelationType => {
        if (c.affection <= -80) return RelationType.ENEMY;
        return RelationType.CONFLICT;
    };

    if (!targetNpc) {
        return (
            <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in">
                <div className="bg-slate-900 border border-slate-700 p-6 rounded-xl text-center">
                    <p className="text-slate-400">데이터를 찾을 수 없습니다.</p>
                    <button onClick={onClose} className="mt-4 px-4 py-2 bg-slate-800 rounded">닫기</button>
                </div>
            </div>
        );
    }

    const relType = getRelationType(targetNpc);
    const isEnemy = relType === RelationType.ENEMY;

    /**
     * [CORE] 캐릭터 상태 내의 특정 ID를 찾아 업데이트를 적용하는 헬퍼
     */
    const applyUpdateToCharacter = (char: Character, id: string, updater: (target: any) => void) => {
        if (char.schoolData?.classmates) {
            const idx = char.schoolData.classmates.findIndex(s => s.id === id);
            if (idx !== -1) {
                const updatedList = [...char.schoolData.classmates];
                const updatedItem = { ...updatedList[idx] };
                updater(updatedItem);
                updatedList[idx] = updatedItem;
                char.schoolData.classmates = updatedList;
                return;
            }
        }
        if (char.clubData?.clubMembers) {
            const idx = char.clubData.clubMembers.findIndex(m => m.id === id);
            if (idx !== -1) {
                const updatedList = [...char.clubData.clubMembers];
                const updatedItem = { ...updatedList[idx] };
                updater(updatedItem);
                updatedList[idx] = updatedItem;
                char.clubData.clubMembers = updatedList;
                return;
            }
        }
        if (char.base?.templeVisitors) {
            const newVisitors = { ...char.base.templeVisitors };
            Object.keys(newVisitors).forEach(key => {
                const idx = newVisitors[key].findIndex((v: any) => v.id === id);
                if (idx !== -1) {
                    const updatedList = [...newVisitors[key]];
                    const updatedItem = { ...updatedList[idx] };
                    updater(updatedItem);
                    updatedList[idx] = updatedItem;
                    newVisitors[key] = updatedList;
                }
            });
            char.base.templeVisitors = newVisitors;
        }
        if (char.socialNetwork) {
            const idx = char.socialNetwork.findIndex(n => n.id === id);
            if (idx !== -1) {
                const updatedList = [...char.socialNetwork];
                const updatedItem = { ...updatedList[idx] };
                updater(updatedItem);
                updatedList[idx] = updatedItem;
                char.socialNetwork = updatedList;
                return;
            }
        }
    };

    // 1. 갈등 심화 (Conflict -> Worsen)
    const handleWorsenConflict = () => {
        const newChar = JSON.parse(JSON.stringify(character)) as Character;
        let finalMsg = "";

        const updateFn = (target: any) => {
            target.affection = Math.max(-100, target.affection - 30);
            if (target.affection <= -80) {
                finalMsg = `${target.name}와(과) 돌이킬 수 없는 원수가 되었습니다.`;
            } else {
                finalMsg = `${target.name}와(과)의 갈등이 극에 달했습니다.`;
            }
        };

        applyUpdateToCharacter(newChar, targetId, updateFn);
        onUpdateCharacter(newChar, `[갈등 폭발] ${finalMsg}`);

        setResultData({
            type: 'failure',
            title: '갈등 심화',
            message: `전투에서 승리하여 ${targetNpc.name}을(를) 굴복시켰으나, 상대의 마음속에는 깊은 증오가 싹텄습니다.`,
            items: [
                { label: '호감도', after: '-30' },
            ]
        });
    };

    // 2. 처단 (Enemy -> Execute)
    const handleExecute = () => {
        const currentTargetInfamy = targetNpc.infamy || 0;
        const infamyGain = Math.max(0, 500 - currentTargetInfamy);
        
        const newChar = JSON.parse(JSON.stringify(character)) as Character;
        newChar.infamy = (newChar.infamy || 0) + infamyGain;

        if (targetNpc.isEternalRival) {
            newChar.hasEternalRivalDied = true;
        }

        // [MODIFIED] 묘비명 패턴 적용: 인물 말소 대신 isPurged 설정 및 socialNetwork 아카이빙
        if (!newChar.socialNetwork) newChar.socialNetwork = [];
        
        const purgedNpc = { 
            ...targetNpc, 
            isPurged: true, 
            purgedReason: '처단' 
        };

        const existingIdx = newChar.socialNetwork.findIndex(n => n.id === targetId);
        if (existingIdx !== -1) {
            newChar.socialNetwork[existingIdx] = purgedNpc;
        } else {
            newChar.socialNetwork.push(purgedNpc);
        }

        // 학교/동아리/성전 등 활성 명단에서는 제거
        if (newChar.schoolData) newChar.schoolData.classmates = newChar.schoolData.classmates.filter(s => s.id !== targetId);
        if (newChar.clubData) newChar.clubData.clubMembers = newChar.clubData.clubMembers?.filter(m => m.id !== targetId);
        if (newChar.base?.templeVisitors) {
            Object.keys(newChar.base.templeVisitors).forEach(k => {
                newChar.base!.templeVisitors![k] = newChar.base!.templeVisitors![k].filter(v => v.id !== targetId);
            });
        }

        onUpdateCharacter(newChar, `[인연 처단] 원수 '${targetNpc.name}'을(를) 영구히 제거했습니다. (악명 +${infamyGain})`);
        
        setResultData({
            type: 'destroy',
            title: '원수 처단 완료',
            message: `지긋지긋한 악연의 고리를 끊어냈습니다. ${targetNpc.name}은(는) 이제 당신의 인생에서 '사망' 처리되어 기록에만 남게 됩니다.\n사회는 당신의 행동을 살인으로 규정했습니다.`,
            items: [
                { label: '악명 상승', after: `+${infamyGain}` },
                { label: '상태', after: '고인' }
            ]
        });
    };

    // 3. 자비 (Forgive)
    const handleSpare = () => {
        const newChar = JSON.parse(JSON.stringify(character)) as Character;
        const updateFn = (target: any) => {
            target.affection = Math.min(100, target.affection + 10);
            target.respect = (target.respect || 0) + 10;
        };
        applyUpdateToCharacter(newChar, targetId, updateFn);
        onUpdateCharacter(newChar, `[자비] 패배한 ${targetNpc.name}에게 자비를 베풀었습니다.`);
        
        setResultData({
            type: 'success',
            title: '뜻밖의 자비',
            message: `쓰러진 ${targetNpc.name}에게 손을 내밀었습니다.\n상대는 당혹스러워하면서도 당신의 도량에 일말의 존경심을 느낍니다.`,
            items: [
                { label: '호감도', after: '+10' },
                { label: '존중도', after: '+10' }
            ]
        });
    };

    // 4. 라이벌 전용: 실력 인정 (Mercy to Rival)
    const handleSpareRival = () => {
        const newChar = JSON.parse(JSON.stringify(character)) as Character;
        const updateFn = (target: any) => {
            target.affection = Math.min(100, target.affection + 10);
            target.respect = Math.min(100, (target.respect || 0) + 10); 
            target.tension = Math.max(0, (target.tension || 0) - 10);
            if (target.rivalData) {
                target.rivalData.playerWins = (target.rivalData.playerWins || 0) + 1;
                target.rivalData.lastDuelDate = newChar.currentDate;
            }
        };
        applyUpdateToCharacter(newChar, targetId, updateFn);
        onUpdateCharacter(newChar, `[인정] 패배한 라이벌 ${targetNpc.name}에게 손을 내밀어 실력을 칭찬했습니다.`);
        
        setResultData({
            type: 'success',
            title: '진정한 라이벌',
            message: `${targetNpc.name}이(가) 당신의 실력을 인정하기 시작했습니다.\n"이번은 네가 이겼지만, 다음엔 내가 이긴다!"`,
            items: [
                { label: '존중도', after: '+10' },
                { label: '긴장도', after: '-10' },
                { label: '호감도', after: '+10' }
            ]
        });
    };

    // 5. 라이벌 전용: 철저한 비웃음 (Humiliate Rival)
    const handleHumiliateRival = () => {
        const newChar = JSON.parse(JSON.stringify(character)) as Character;
        const updateFn = (target: any) => {
            target.affection = Math.max(-100, target.affection - 20);
            target.tension = Math.min(100, (target.tension || 0) + 30); 
            target.respect = Math.max(0, (target.respect || 0) - 10);
            if (target.rivalData) {
                target.rivalData.playerWins = (target.rivalData.playerWins || 0) + 1;
                target.rivalData.lastDuelDate = newChar.currentDate;
            }
        };
        applyUpdateToCharacter(newChar, targetId, updateFn);
        onUpdateCharacter(newChar, `[굴욕] 패배한 라이벌 ${targetNpc.name}을(를) 철저히 비웃어 주었습니다.`);
        
        setResultData({
            type: 'failure',
            title: '타오르는 적개심',
            message: `${targetNpc.name}은(는) 굴욕감에 몸을 떨며 자리를 떠났습니다.\n"이 수치는 반드시 네놈의 피로 씻어주마...!"`,
            items: [
                { label: '긴장도', after: '+30' },
                { label: '호감도', after: '-20' },
                { label: '존중도', after: '-10' }
            ]
        });
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in">
            {resultData && <ActionResultModal data={resultData} onClose={onClose} />}

            <div className={`bg-slate-900 border-2 w-full max-w-lg rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden relative ${isEnemy ? 'border-red-600' : 'border-red-900/50'}`}>
                <div className={`p-8 border-b bg-red-950/20 flex flex-col items-center text-center gap-2 ${isEnemy ? 'border-red-900/50' : 'border-slate-800'}`}>
                    {isEnemy ? <Skull size={48} className="text-red-500 animate-pulse" /> : <AlertTriangle size={48} className="text-orange-500" />}
                    <h2 className="text-2xl font-bold text-white font-cinzel">Relation Resolution</h2>
                    <p className="text-xs text-slate-400">전투 승리 - 대상의 처분을 결정하십시오.</p>
                </div>

                <div className="p-8 space-y-8 flex-1 overflow-y-auto custom-scrollbar">
                    <div className="text-center space-y-2">
                        <h3 className="text-3xl font-black text-white">{targetNpc.name}</h3>
                        <p className={`text-sm font-bold ${targetNpc.isEternalRival ? 'text-red-500 animate-pulse' : isEnemy ? 'text-red-500' : targetNpc.isRival ? 'text-orange-400' : 'text-orange-400'}`}>
                            현재 관계: {targetNpc.isEternalRival ? '🔥 영원의 라이벌 (Eternal Rival)' : isEnemy ? '원수 (Enemy)' : targetNpc.isRival ? '라이벌 (Rival)' : '갈등 (Conflict)'}
                        </p>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                        {targetNpc.isEternalRival ? (
                            <>
                                <button 
                                    onClick={handleSpareRival}
                                    className="p-6 bg-slate-800 hover:bg-blue-900/30 border-2 border-slate-700 hover:border-blue-500 rounded-3xl flex flex-col items-center gap-3 transition-all group"
                                >
                                    <UserCheck size={32} className="text-blue-400 group-hover:scale-110 transition-transform" />
                                    <div className="text-center">
                                        <h4 className="font-bold text-white text-lg">실력 인정하고 격려하기</h4>
                                        <p className="text-[10px] text-blue-300">실력을 칭찬하고 다음 승부를 기약합니다. (존중도 상승)</p>
                                    </div>
                                </button>
                                <button 
                                    onClick={handleHumiliateRival}
                                    className="p-6 bg-slate-800 hover:bg-red-900/40 border-2 border-slate-700 hover:border-red-500 rounded-3xl flex flex-col items-center gap-3 transition-all group"
                                >
                                    <Flame size={32} className="text-orange-500 group-hover:scale-110 transition-transform" />
                                    <div className="text-center">
                                        <h4 className="font-bold text-white text-lg">철저히 비웃어주기</h4>
                                        <p className="text-[10px] text-red-400">패배한 상대를 조롱합니다. (긴장도 상승)</p>
                                    </div>
                                </button>
                                <button 
                                    onClick={handleExecute}
                                    className="p-6 bg-red-950/40 hover:bg-red-900/50 border-2 border-red-700 hover:border-red-500 rounded-3xl flex flex-col items-center gap-3 transition-all group"
                                >
                                    <Skull size={32} className="text-red-500 group-hover:scale-110 transition-transform" />
                                    <div className="text-center">
                                        <h4 className="font-bold text-white text-lg text-red-400">영원의 라이벌 처단하기</h4>
                                        <p className="text-[10px] text-red-300">숙적의 목숨을 끊어 운명의 굴레를 영원히 끊어냅니다. (이후 재등장 불가)</p>
                                    </div>
                                </button>
                            </>
                        ) : isEnemy ? (
                            <>
                                <button 
                                    onClick={handleExecute}
                                    className="p-6 bg-red-900/40 hover:bg-red-800 border-2 border-red-700 rounded-3xl flex flex-col items-center gap-3 transition-all group"
                                >
                                    <Skull size={32} className="text-red-500 group-hover:scale-110 transition-transform" />
                                    <div className="text-center">
                                        <h4 className="font-bold text-white text-lg">처단하기</h4>
                                        <p className="text-[10px] text-red-300">세상에서 영구히 제거합니다. (악명도 대폭 상승)</p>
                                    </div>
                                </button>
                                <button 
                                    onClick={handleSpare}
                                    className="p-6 bg-slate-800 hover:bg-green-900/30 border-2 border-slate-700 hover:border-green-500 rounded-3xl flex flex-col items-center gap-3 transition-all group"
                                >
                                    <HeartCrack size={32} className="text-green-500 group-hover:scale-110 transition-transform" />
                                    <div className="text-center">
                                        <h4 className="font-bold text-white text-lg">자비 베풀기</h4>
                                        <p className="text-[10px] text-slate-400">살려보내고 유대감 회복의 기회를 얻습니다.</p>
                                    </div>
                                </button>
                            </>
                        ) : targetNpc.isRival ? (
                            <>
                                <button 
                                    onClick={handleSpareRival}
                                    className="p-6 bg-slate-800 hover:bg-blue-900/30 border-2 border-slate-700 hover:border-blue-500 rounded-3xl flex flex-col items-center gap-3 transition-all group"
                                >
                                    <UserCheck size={32} className="text-blue-400 group-hover:scale-110 transition-transform" />
                                    <div className="text-center">
                                        <h4 className="font-bold text-white text-lg">실력 인정하고 격려하기</h4>
                                        <p className="text-[10px] text-blue-300">존중도가 크게 오르고 긴장도가 낮아집니다.</p>
                                    </div>
                                </button>
                                <button 
                                    onClick={handleHumiliateRival}
                                    className="p-6 bg-slate-800 hover:bg-red-900/40 border-2 border-slate-700 hover:border-red-500 rounded-3xl flex flex-col items-center gap-3 transition-all group"
                                >
                                    <Flame size={32} className="text-orange-500 group-hover:scale-110 transition-transform" />
                                    <div className="text-center">
                                        <h4 className="font-bold text-white text-lg">철저히 비웃어주기</h4>
                                        <p className="text-[10px] text-red-400">긴장도가 폭등하고 호감도가 깎입니다.</p>
                                    </div>
                                </button>
                            </>
                        ) : (
                            <>
                                <button 
                                    onClick={handleWorsenConflict}
                                    className="p-6 bg-slate-800 hover:bg-red-900/40 border-2 border-red-700 rounded-3xl flex flex-col items-center gap-3 transition-all group"
                                >
                                    <Flame size={32} className="text-orange-500 group-hover:scale-110 transition-transform" />
                                    <div className="text-center">
                                        <h4 className="font-bold text-white text-lg">철저히 짓밟기</h4>
                                        <p className="text-[10px] text-slate-400">상대에게 굴욕을 주어 관계를 최악으로 만듭니다.</p>
                                    </div>
                                </button>
                                <button 
                                    onClick={handleSpare}
                                    className="p-6 bg-slate-800 hover:bg-green-900/30 border-2 border-slate-700 hover:border-green-500 rounded-3xl flex flex-col items-center gap-3 transition-all group"
                                >
                                    <UserCheck size={32} className="text-blue-400 group-hover:scale-110 transition-transform" />
                                    <div className="text-center">
                                        <h4 className="font-bold text-white text-lg">훈계하고 놓아주기</h4>
                                        <p className="text-[10px] text-slate-500">무력 시위 후 자비를 베풀어 공포와 존경을 섞습니다.</p>
                                    </div>
                                </button>
                            </>
                        )}
                    </div>
                </div>

                <div className="p-8 bg-slate-950 border-t border-slate-800 text-center">
                    <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest">Moral Choice System v1.1</p>
                </div>
            </div>
        </div>
    );
};

export default RelationResolutionModal;
