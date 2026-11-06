
import React, { useState, useEffect } from 'react';
import { Character, Enemy, Stats, Companion, ClassTier, JobType } from '../types';
import { X, Shield, Sword, Heart, Target, Sparkles, UserPlus, Zap, Activity, Brain, User, AlertCircle, CheckCircle, Info, Loader2, Coins, Flame, Gem, Package, TrendingUp } from 'lucide-react';
import ActionResultModal, { ResultData } from './ActionResultModal';
import { BossData } from '../bossMonsters';
import { assignRandomCombatStyle } from '../utils';

interface Props {
    character: Character;
    bossData: BossData;
    onClose: () => void;
    onUpdateCharacter: (newChar: Character, logMsg: string) => void;
    materialName?: string; 
    messengerName?: string;
}

const MAX_TRAIN_COUNT = 100;

const GuardianManagementModal: React.FC<Props> = ({ character, bossData, onClose, onUpdateCharacter, materialName, messengerName }) => {
    const [resultData, setResultData] = useState<ResultData | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    const guardianId = `${bossData.name}_${character.currentLocation?.nation}`;
    const localGuardian = character.base?.guardianData?.[guardianId] || {
        level: bossData.level,
        stats: {
            hp: bossData.level * 10000,
            maxHp: bossData.level * 10000,
            mp: bossData.level * 2000,
            maxMp: bossData.level * 2000,
            str: Math.floor(bossData.level * 50),
            int: Math.floor(bossData.level * 50),
            wis: bossData.level * 100,
            def: bossData.level * 100,
            agi: Math.floor(bossData.level * 25),
            ctrl: bossData.level * 100
        },
        affection: 100,
        trainCount: 0 
    };

    // 정식 동료 영입 여부 판별
    const isRecruited = character.companions.some(c => c.name.includes(bossData.name)) || 
                      character.inactiveCompanions?.some(c => c.name.includes(bossData.name));

    const trainCount = localGuardian.trainCount || 0;
    const successRate = 20 + (MAX_TRAIN_COUNT - trainCount) * 0.8;

    const handleTrainStat = (statKey: keyof Stats) => {
        if (isRecruited) return;
        if (trainCount >= MAX_TRAIN_COUNT) {
            alert("이미 최대 성장 한도(100회)에 도달했습니다.");
            return;
        }

        const costMana = 50;
        const currentMana = character.base?.resources.manaCrystal || 0;
        
        const materialIdx = materialName ? character.inventory.findIndex(i => i.name === materialName) : -1;

        const missing = [];
        if (currentMana < costMana) missing.push(`마정석 ${costMana - currentMana}개`);
        if (materialName && materialIdx === -1) missing.push(`${materialName} 1개`);

        if (missing.length > 0) {
            setResultData({ 
                type: 'warning', 
                title: '재료 부족', 
                message: '성장을 위해 마정석과 사자의 정수가 모두 필요합니다.', 
                items: missing.map(m => ({ label: '부족', after: m })) 
            });
            return;
        }

        const newChar = JSON.parse(JSON.stringify(character)) as Character;
        if (!newChar.base) return;
        if (!newChar.base.resources) newChar.base.resources = {} as any;
        newChar.base.resources.manaCrystal = (newChar.base.resources.manaCrystal || 0) - costMana;
        
        if (materialIdx !== -1) {
            let removed = false;
            newChar.inventory = newChar.inventory.filter(item => {
                if (!removed && item.name === materialName) {
                    removed = true;
                    return false;
                }
                return true;
            });
        }

        const roll = Math.random() * 100;
        const isSuccess = roll < successRate;

        if (isSuccess) {
            const boost = Math.floor(localGuardian.level * 0.5) + 10;
            const newStats = { ...localGuardian.stats };
            newStats[statKey] = (newStats[statKey] || 0) + boost;
            if (statKey === 'maxHp') newStats.hp = (newStats.hp || 0) + boost;
            if (statKey === 'maxMp') newStats.mp = (newStats.mp || 0) + boost;

            if (!newChar.base.guardianData) newChar.base.guardianData = {};
            newChar.base.guardianData[guardianId] = { 
                ...localGuardian, 
                stats: newStats, 
                trainCount: trainCount + 1 
            };

            const logMsg = `[수호수 성장] ${materialName || '사자의 정수'}와 마정석을 사용하여 ${bossData.name}의 ${statKey.toUpperCase()}가 ${boost} 상승했습니다. (성공)`;
            onUpdateCharacter(newChar, logMsg);
            
            setResultData({
                type: 'success',
                title: '성장 성공!',
                message: '사자의 정수와 마력이 조화를 이루어 수호수가 강력해졌습니다.',
                items: [
                    { label: statKey.toUpperCase(), after: `+${boost}` },
                    { label: '성장 횟수', before: `${trainCount}/100`, after: `${trainCount + 1}/100` },
                    { label: '확률', after: `${successRate.toFixed(1)}%` }
                ]
            });
        } else {
            const logMsg = `[수호수 성장] ${bossData.name}의 능력치 강화에 실패했습니다. (확률: ${successRate.toFixed(1)}%)`;
            onUpdateCharacter(newChar, logMsg);
            
            setResultData({
                type: 'failure',
                title: '성장 실패',
                message: '마력이 불안정하여 정수가 흩어졌습니다. 재료만 소모되었습니다.',
                items: [{ label: '성공 확률', after: `${successRate.toFixed(1)}%` }]
            });
        }
    };

    const handleCommunion = () => {
        if (isRecruited) return;
        const costFaith = 10;
        if ((character.faith || 0) < costFaith) {
            setResultData({ 
                type: 'warning', 
                title: '신앙심 부족', 
                message: '신의 뜻을 전달할 신앙심이 부족합니다.', 
                items: [{ label: '필요 신앙심', after: `${costFaith}` }] 
            });
            return;
        }

        const newChar = JSON.parse(JSON.stringify(character)) as Character;
        newChar.faith = (newChar.faith || 0) - costFaith;

        const boost = 5;
        const newAffection = Math.min(200, localGuardian.affection + boost);

        if (!newChar.base) newChar.base = { level: 0, resources: {} as any, residents: [], facilities: [], assignments: {}, storage: [], facilityLevels: {}, dailyCounts: {}, elementalShards: {}, capturedMonsters: [], gridSize: 2, layout: [] };
        if (!newChar.base.guardianData) newChar.base.guardianData = {};
        newChar.base.guardianData[guardianId] = { 
            ...localGuardian, 
            affection: newAffection 
        };

        const logMsg = `[수호수 관리] 신앙심을 소모하여 ${bossData.name}와 정신적으로 교감했습니다.`;
        onUpdateCharacter(newChar, logMsg);

        setResultData({ 
            type: 'info', 
            title: '정신적 교감', 
            message: '사자의 의지가 수호수에게 전달되어 깊은 유대감을 형성했습니다.', 
            items: [
                { label: '친밀도', before: localGuardian.affection, after: newAffection }, 
                { label: '소모 신앙심', after: `${costFaith}` }
            ] 
        });
    };

    const handleRecruit = () => {
        if (isRecruited) return;
        if (localGuardian.affection < 150) {
            setResultData({ 
                type: 'warning', 
                title: '유대감 부족', 
                message: '수호수와의 유대감이 부족합니다. (친밀도 150 이상 필요)', 
                items: [{ label: '현재 친밀도', after: localGuardian.affection }] 
            });
            return;
        }

        setIsProcessing(true);
        setTimeout(() => {
            const newChar = JSON.parse(JSON.stringify(character)) as Character;
            const newCompanion: Companion = {
                id: `guardian_${guardianId}`,
                name: `[수호수] ${bossData.name}`,
                age: "측정 불가",
                gender: "무성",
                race: "몬스터",
                appearance: bossData.description,
                personality: "충직함",
                classType: "성전 수호자",
                job: JobType.UNEMPLOYED, 
                level: localGuardian.level,
                currentExp: 0,
                maxExp: localGuardian.level * 1000,
                statPoints: 0,
                classTier: ClassTier.FINAL,
                shinryokuType: bossData.shinryokuType,
                stats: { ...localGuardian.stats },
                skills: bossData.skills,
                equipment: {},
                inventory: [],
                affection: 100,
                loyalty: 100,
                isMonster: true,
                monsterData: {
                    ...localGuardian,
                    id: `guardian_${guardianId}`,
                    name: bossData.name,
                    hp: localGuardian.stats.hp,
                    maxHp: localGuardian.stats.maxHp,
                    statusEffects: [],
                    isTamed: true,
                    capturedDate: character.currentDate || '',
                    rank: 'SSS',
                    visualUrl: bossData.visualUrl
                } as any
            };

            const preppedCompanion = assignRandomCombatStyle(newCompanion, true, true);
            if (newChar.companions.length < 5) {
                newChar.companions.push(preppedCompanion);
            } else {
                if (!newChar.inactiveCompanions) newChar.inactiveCompanions = [];
                newChar.inactiveCompanions.push(preppedCompanion);
            }

            onUpdateCharacter(newChar, `[영입] 성전의 수호수 ${bossData.name}가 정식으로 당신의 여정에 합류했습니다.`);
            setResultData({
                type: 'success',
                title: '영입 대성공',
                message: `${bossData.name}이(가) 당신의 권능을 인정하고 곁을 지키기로 맹세했습니다.`,
                items: [{ label: '영입 대상', after: bossData.name }, { label: '등급', after: '신성수' }]
            });
            setIsProcessing(false);
        }, 1500);
    };

    const allStatsList: { k: keyof Stats, l: string, i: any, c: string }[] = [
        { k: 'maxHp', l: 'HP (최대 생명력)', i: Heart, c: 'text-rose-500' },
        { k: 'maxMp', l: 'MP (최대 마력)', i: Gem, c: 'text-cyan-400' },
        { k: 'str', l: 'STR (물리 공격력)', i: Sword, c: 'text-red-500' },
        { k: 'int', l: 'INT (마법 공격력)', i: Zap, c: 'text-purple-500' },
        { k: 'def', l: 'DEF (방어력)', i: Shield, c: 'text-green-500' },
        { k: 'agi', l: 'AGI (민첩성)', i: Activity, c: 'text-yellow-400' },
        { k: 'wis', l: 'WIS (지혜)', i: Brain, c: 'text-blue-400' },
        { k: 'ctrl', l: 'CTRL (통제력)', i: Target, c: 'text-emerald-400' }
    ];

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/90 backdrop-blur-sm p-3 sm:p-4 animate-in fade-in">
            {resultData && <ActionResultModal data={resultData} onClose={() => setResultData(null)} />}

            <div className="bg-slate-900 border-2 border-indigo-500 w-full max-w-5xl h-[90vh] md:h-[88vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden relative">
                <div className="p-4 sm:p-6 border-b border-indigo-900/50 bg-indigo-950/20 flex justify-between items-center shrink-0">
                    <div className="flex items-center min-w-0">
                        <Target size={28} className="text-indigo-400 mr-3 shrink-0 animate-pulse" />
                        <div className="min-w-0">
                            <h2 className="text-lg sm:text-2xl font-bold text-white font-cinzel truncate">수호수 관리</h2>
                            <p className="text-xs text-indigo-300 font-bold tracking-wider truncate">
                                {bossData.name} - {isRecruited ? '정식 동료 합류 상태' : '성전 대기 상태'}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-slate-500 hover:text-white p-2 rounded-full hover:bg-slate-800 transition-colors shrink-0"><X size={24} /></button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 bg-slate-900 custom-scrollbar">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        
                        <div className="lg:col-span-1 space-y-5">
                            <div className="aspect-square rounded-2xl overflow-hidden border-2 border-indigo-500/30 shadow-2xl relative group max-w-sm mx-auto lg:max-w-none">
                                <img src={bossData.visualUrl} alt="Guardian" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 to-transparent"></div>
                                <div className="absolute bottom-4 left-4 right-4">
                                    <span className="text-[10px] text-indigo-400 font-bold bg-indigo-950/80 px-2 py-0.5 rounded border border-indigo-800">레벨 {localGuardian.level}</span>
                                    <h3 className="text-lg sm:text-xl font-bold text-white mt-1 truncate">{bossData.name}</h3>
                                </div>
                            </div>

                            <div className="bg-slate-950 p-4 rounded-2xl border border-indigo-500/30 space-y-3">
                                <div className="flex justify-between items-center">
                                    <span className="text-xs text-indigo-400 font-bold">성장 진행도</span>
                                    <span className="text-xs font-mono text-white">{trainCount} / {MAX_TRAIN_COUNT}</span>
                                </div>
                                <div className="h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                                    <div className="h-full bg-indigo-500 transition-all duration-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]" style={{ width: `${(trainCount / MAX_TRAIN_COUNT) * 100}%` }}></div>
                                </div>
                                <div className="flex justify-between items-center pt-1">
                                    <span className="text-[10px] text-slate-500">성공 확률</span>
                                    <span className={`text-xs font-bold ${successRate > 70 ? 'text-green-400' : successRate > 40 ? 'text-yellow-400' : 'text-red-400'}`}>{successRate.toFixed(1)}%</span>
                                </div>
                            </div>

                            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3 shadow-inner">
                                <div className="flex justify-between items-center">
                                    <span className="text-xs text-slate-400 font-bold">친밀도</span>
                                    <span className="text-sm font-bold text-pink-400">{localGuardian.affection} / 200</span>
                                </div>
                                <div className="h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                                    <div className="h-full bg-pink-600 transition-all duration-500 shadow-[0_0_10px_rgba(219,39,119,0.5)]" style={{ width: `${(localGuardian.affection / 200) * 100}%` }}></div>
                                </div>
                            </div>

                            <button 
                                onClick={handleRecruit}
                                disabled={isProcessing || localGuardian.affection < 150 || isRecruited}
                                className={`w-full py-3.5 rounded-xl font-bold text-xs sm:text-sm shadow-lg transition-all flex items-center justify-center gap-2 ${isRecruited ? 'bg-green-900/40 text-green-300 border border-green-700/50 cursor-default' : localGuardian.affection >= 150 ? 'bg-gradient-to-r from-amber-700 to-amber-500 text-white hover:scale-105 active:scale-95' : 'bg-slate-800 text-slate-600 cursor-not-allowed border border-slate-700'}`}
                            >
                                {isProcessing ? <Loader2 size={18} className="animate-spin"/> : isRecruited ? <CheckCircle size={18}/> : <UserPlus size={18}/>}
                                {isRecruited ? "이미 합류한 상태" : "정식 동료로 영입"}
                            </button>
                        </div>

                        <div className="lg:col-span-2 space-y-6">
                            {/* 8개 능력치 모두 표시되는 성장 훈련 섹션 */}
                            <div className={`bg-slate-950 p-4 sm:p-6 rounded-2xl border border-slate-800 space-y-4 relative ${isRecruited ? 'opacity-50' : ''}`}>
                                <div className="flex justify-between items-center border-b border-slate-800 pb-3 flex-wrap gap-2">
                                    <h4 className="font-bold text-slate-200 flex items-center text-sm sm:text-base">
                                        <Activity size={18} className="mr-2 text-indigo-400"/> 수호수 성장 훈련 (모든 능력치)
                                    </h4>
                                    <div className="flex items-center gap-3 bg-slate-900 px-3 py-1 rounded-lg border border-slate-800 text-[10px] text-slate-400 font-bold">
                                        <span>필요 자원:</span>
                                        <div className="flex items-center text-purple-400"><Gem size={10} className="mr-0.5"/>50</div>
                                        <div className="flex items-center text-amber-500"><Package size={10} className="mr-0.5"/>1</div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[320px] overflow-y-auto custom-scrollbar pr-1">
                                    {allStatsList.map(s => {
                                        const currentVal = (localGuardian.stats[s.k as keyof Stats] || 0);
                                        return (
                                            <div key={s.k} className="flex justify-between items-center p-2.5 bg-slate-900 rounded-xl border border-slate-800 group hover:border-indigo-500/30 transition-all">
                                                <div className="flex items-center min-w-0 pr-2">
                                                    <s.i size={16} className={`${s.c} mr-2 shrink-0`}/>
                                                    <div className="flex flex-col min-w-0">
                                                        <span className="text-[11px] text-slate-300 font-bold truncate">{s.l}</span>
                                                        <span className="text-xs font-mono font-bold text-indigo-300">
                                                            {currentVal.toLocaleString()}
                                                        </span>
                                                    </div>
                                                </div>
                                                <button 
                                                    onClick={() => handleTrainStat(s.k as keyof Stats)}
                                                    disabled={trainCount >= MAX_TRAIN_COUNT || isRecruited}
                                                    className={`px-3 py-1.5 rounded-lg border text-[10px] font-bold transition-colors shrink-0 ${trainCount >= MAX_TRAIN_COUNT || isRecruited ? 'bg-slate-950 text-slate-700 border-slate-900 cursor-not-allowed' : 'bg-indigo-900/50 hover:bg-indigo-800 text-indigo-200 border-indigo-700/60 shadow-sm'}`}
                                                >
                                                    {trainCount >= MAX_TRAIN_COUNT ? "한도 도달" : "성장 시도"}
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>

                                {isRecruited && (
                                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center rounded-2xl backdrop-blur-[1px]">
                                        <div className="bg-slate-900 border border-amber-500/50 p-3 rounded-lg flex items-center gap-2">
                                            <Info size={14} className="text-amber-400" />
                                            <span className="text-[10px] text-slate-200 font-bold">동료 상태에서는 파티 메뉴에서 성장시키세요.</span>
                                        </div>
                                    </div>
                                )}
                                <p className="text-[10px] text-slate-500 italic">* 마정석 50개와 {materialName || '사자의 정수'} 1개가 소모됩니다.</p>
                            </div>

                            {/* 교감 섹션 (신의 사자와의 교감) */}
                            <div className={`bg-slate-950 p-5 sm:p-6 rounded-2xl border border-slate-800 space-y-4 relative ${isRecruited ? 'opacity-50' : ''}`}>
                                <h4 className="font-bold text-slate-200 flex items-center border-b border-slate-800 pb-2 text-sm sm:text-base">
                                    <Heart size={18} className="mr-2 text-pink-500"/> 
                                    {messengerName ? `신의 사자 (${messengerName})와의 교감` : '신의 사자와의 교감'}
                                </h4>
                                <div className="flex flex-col items-center justify-center space-y-3 py-3">
                                    <Sparkles size={40} className="text-amber-500 animate-pulse" />
                                    <p className="text-xs text-slate-400 text-center leading-relaxed">
                                        "신의 사자의 의지를 수호수에게 직접 전달하여<br/>영적인 연결 고리를 강화합니다."
                                    </p>
                                    <button 
                                        onClick={handleCommunion}
                                        disabled={isRecruited}
                                        className={`px-8 py-2.5 rounded-xl font-bold text-xs transition-all shadow-md ${isRecruited ? 'bg-slate-800 text-slate-600 border-slate-700 cursor-not-allowed' : 'bg-pink-900/40 hover:bg-pink-800 text-pink-200 border border-pink-700/50 active:scale-95'}`}
                                    >
                                        정신적 교감 수행 (신앙심 10 소모)
                                    </button>
                                </div>
                                {isRecruited && (
                                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center rounded-2xl backdrop-blur-[1px]">
                                        <div className="bg-slate-900 border border-pink-500/50 p-3 rounded-lg flex items-center gap-2">
                                            <Heart size={14} className="text-pink-400" />
                                            <span className="text-[10px] text-slate-200 font-bold">합류한 동료와는 대화로 교감하세요.</span>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* 전체 능력치 오버뷰 */}
                            <div className="bg-slate-950 p-4 sm:p-5 rounded-2xl border border-indigo-900/30">
                                <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-3 flex items-center">
                                    <Brain size={14} className="mr-2"/> 수호수 전체 능력치 개요
                                </h4>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                                    {allStatsList.map(s => (
                                        <div key={s.k} className="p-2.5 bg-slate-900 rounded-xl border border-slate-800 text-center">
                                            <span className="text-[10px] text-slate-400 block font-bold">{s.l.split(' ')[0]}</span>
                                            <span className="text-xs font-bold text-indigo-200 font-mono">
                                                {(localGuardian.stats[s.k as keyof Stats] || 0).toLocaleString()}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-4 border-t border-slate-800 bg-slate-950 flex flex-wrap justify-between items-center gap-3 shrink-0">
                    <div className="flex flex-wrap gap-2.5 items-center">
                        <div className="flex items-center text-xs text-purple-300 font-mono bg-slate-900 px-3 py-1.5 rounded-full border border-slate-800">
                            <Gem size={14} className="mr-1.5"/> 마정석: {(character.base?.resources?.manaCrystal || 0).toLocaleString()}
                        </div>
                        <div className="flex items-center text-xs text-orange-300 font-mono bg-slate-900 px-3 py-1.5 rounded-full border border-slate-800">
                            <Package size={14} className="mr-1.5"/> {materialName || '사자의 정수'}: {character.inventory.filter(i => i.name === materialName).length}
                        </div>
                        <div className="flex items-center text-xs text-amber-300 font-mono bg-slate-900 px-3 py-1.5 rounded-full border border-slate-800">
                            <Flame size={14} className="mr-1.5"/> 신앙심: {(character.faith || 0).toLocaleString()}
                        </div>
                    </div>
                    <button onClick={onClose} className="px-6 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-bold text-xs transition-colors">닫기</button>
                </div>
            </div>
        </div>
    );
};

export default GuardianManagementModal;
