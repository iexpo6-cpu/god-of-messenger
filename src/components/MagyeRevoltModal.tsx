
import React, { useState } from 'react';
import { Character, MagyeRevolt, Enemy, JobType, Companion } from '../types';
import { X, Skull, Flame, ShieldAlert, Sword, Users,Info, ShieldCheck, AlertTriangle, Loader2, Sparkles, Crown, Zap, ChevronRight, TrendingDown } from 'lucide-react';
import ActionResultModal, { ResultData } from './ActionResultModal';
import { handleMagyeDemotion } from '../magyeInternalWarSystem';

interface Props {
    character: Character;
    revolt: MagyeRevolt;
    onClose: () => void;
    onBattle: (enemy: Enemy | Enemy[], type: string, source: string, city: string, rebelRankIdx: number) => void;
    onUpdateCharacter: (newChar: Character, logMsg: string) => void;
}

const MagyeRevoltModal: React.FC<Props> = ({ character, revolt, onClose, onBattle, onUpdateCharacter }) => {
    const [isSimulating, setIsSimulating] = useState(false);
    const [resultData, setResultData] = useState<ResultData | null>(null);

    const dominion = character.magyeDominions?.[revolt.city];
    const personnel = dominion?.personnel;
    const allComps = [...character.companions, ...(character.inactiveCompanions || [])];

    // 자동 진압 성공률 계산
    const calculateSuccessRate = () => {
        if (!personnel) return 5; // 기본 5% (지배자가 혼자 싸우는 격)

        const getStatsSum = (id: string) => {
            const c = allComps.find(comp => comp.id === id);
            return c ? (c.stats.str + c.stats.def + c.stats.agi + c.stats.ctrl) : 0;
        };

        let defensePower = 0;
        personnel.overseerIds.forEach(id => defensePower += getStatsSum(id));
        personnel.executionerIds.forEach(id => defensePower += getStatsSum(id) * 1.5);
        if (personnel.tormentorId) defensePower += getStatsSum(personnel.tormentorId) * 0.8;

        const boss = revolt.enemies[0];
        const bossLevel = boss?.level || 100;
        
        // 공식: (방어전력 / (보스레벨 * 100)) * 100
        const rate = (defensePower / (bossLevel * 100)) * 100;
        return Math.min(90, Math.max(5, Math.floor(rate)));
    };

    const successRate = calculateSuccessRate();

    const handleDirectBattle = () => {
         onBattle(revolt.enemies, 'magye_revolt', revolt.rebelLeaderName, revolt.city, revolt.rebelRankIdx);
    };

    const handleEntrust = () => {
        setIsSimulating(true);
        setTimeout(() => {
            const roll = Math.random() * 100;
            const success = roll < successRate;

            if (success) {
                const newChar = JSON.parse(JSON.stringify(character)) as Character;
                const dom = newChar.magyeDominions![revolt.city];
                
                dom.fear = Math.min(1000, dom.fear + 200);
                dom.corruption = Math.min(1000, dom.corruption + 100);
                newChar.pendingMagyeRevolt = undefined;

                onUpdateCharacter(newChar, `[반란 진압] 성전의 군사들이 ${revolt.rebelLeaderName}의 반란을 성공적으로 진압했습니다! (공포도 +200)`);
                setResultData({
                    type: 'success',
                    title: '반란 진압 성공',
                    message: `배신자 ${revolt.rebelLeaderName}의 목을 효수하여 도시의 기강을 잡았습니다.`,
                    items: [
                        { label: '승률', after: `${successRate}%` },
                        { label: '공포도 상승', after: '+200' },
                        { label: '타락도 상승', after: '+100' }
                    ]
                });
            } else {
                // 패배 시 강등 처리
                const demotionUpdate = handleMagyeDemotion(character, revolt.rebelRankIdx, revolt.city);
                const newChar = { ...character, ...demotionUpdate, pendingMagyeRevolt: undefined };
                
                onUpdateCharacter(newChar, `[반란 패배] ${revolt.rebelLeaderName}에게 패배하여 직위를 찬탈당했습니다...`);
                setResultData({
                    type: 'destroy',
                    title: '하극상 발생: 권력 찬탈',
                    message: `반란군이 성전을 점령했습니다. 당신은 비참하게 쫓겨나 서열에서 밀려났습니다.`,
                    items: [
                        { label: '변경된 직업', before: character.job, after: newChar.job }
                    ]
                });
            }
            setIsSimulating(false);
        }, 2000);
    };

    return (
        <div className="fixed inset-0 z-[250] flex items-center justify-center bg-black/95 backdrop-blur-2xl p-4 animate-in fade-in">
            {resultData && <ActionResultModal data={resultData} onClose={() => { setResultData(null); if (resultData.type !== 'failure') onClose(); }} />}

            <div className="bg-slate-900 border-2 border-red-600 w-full max-w-2xl rounded-[2.5rem] shadow-[0_0_150px_rgba(220,38,38,0.5)] flex flex-col overflow-hidden relative">
                {/* Cracks Effect Background */}
                <div className="absolute inset-0 opacity-20 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/cracked-dirt.png')]"></div>
                <div className="absolute inset-0 bg-gradient-to-b from-red-950/40 via-transparent to-black/80 pointer-events-none"></div>

                <div className="p-8 border-b border-red-900/50 bg-red-950/40 flex justify-between items-center relative z-10">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-red-600 rounded-2xl shadow-lg animate-pulse">
                            <ShieldAlert size={32} className="text-white" />
                        </div>
                        <div>
                            <h2 className="text-3xl font-bold text-white font-cinzel tracking-tighter">REVOLT DETECTED</h2>
                            <p className="text-sm text-red-400 font-bold uppercase tracking-widest">마계 내부 하극상 발생</p>
                        </div>
                    </div>
                </div>

                <div className="p-8 flex-1 overflow-y-auto custom-scrollbar space-y-8 relative z-10">
                    <div className="bg-black/60 p-6 rounded-3xl border border-red-500/30 text-center space-y-4">
                        <div className="relative inline-block">
                            <Skull size={64} className="text-red-600 mb-2 animate-bounce-short" />
                            <div className="absolute -top-2 -right-2 bg-red-600 text-white text-[8px] px-2 py-1 rounded-full font-black">REBEL</div>
                        </div>
                        <h3 className="text-2xl font-black text-white leading-tight">
                            {revolt.city}의 <span className="text-red-500">{revolt.rebelLeaderName}</span>가<br/>당신의 자리를 노리고 반란을 일으켰습니다!
                        </h3>
                        <p className="text-sm text-slate-400 italic">
                            "지배자의 공포가 식어버린 땅에 새로운 주인이 필요하다!"
                        </p>
                        <div className="flex justify-center gap-4 mt-4">
                            <span className="bg-red-955 text-red-400 px-3 py-1 rounded-full border border-red-900 text-xs font-bold uppercase">{revolt.rebelJob}</span>
                            <span className="bg-slate-900 text-slate-400 px-3 py-1 rounded-full border border-slate-800 text-xs font-bold uppercase">Target: {revolt.city}</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Entrust Option */}
                        <div className="bg-slate-950 p-6 rounded-3xl border border-indigo-500/30 shadow-lg flex flex-col group hover:border-indigo-500 transition-all">
                            <div className="flex justify-between items-start mb-4">
                                <Users size={32} className="text-indigo-400 group-hover:scale-110 transition-transform" />
                                <div className="text-right">
                                    <div className="text-[10px] text-slate-500 uppercase font-bold">Suppress Chance</div>
                                    <div className={`text-2xl font-mono font-bold ${successRate >= 70 ? 'text-green-400' : successRate >= 40 ? 'text-yellow-400' : 'text-red-400'}`}>
                                        {successRate}%
                                    </div>
                                </div>
                            </div>
                            <h4 className="text-xl font-bold text-white mb-2">대원들에게 진압 명령</h4>
                            <p className="text-[11px] text-slate-500 mb-6 leading-relaxed">
                                성전에 배치된 감독관과 처형인들이 반란군을 저지합니다.<br/>
                                <span className="text-indigo-400 font-bold">성공 시:</span> 공포도가 상승하고 통치권이 안정됩니다.<br/>
                                <span className="text-red-500 font-bold">실패 시:</span> 즉시 서열에서 강등됩니다.
                            </p>
                            <button 
                                onClick={handleEntrust}
                                disabled={isSimulating}
                                className="mt-auto py-4 bg-indigo-700 hover:bg-indigo-600 text-white rounded-2xl font-bold text-sm shadow-xl transition-all flex items-center justify-center gap-2 transform active:scale-95"
                            >
                                {isSimulating ? <Loader2 size={18} className="animate-spin" /> : <ShieldCheck size={18}/>}
                                대리 진압 수행 (Suppress)
                            </button>
                        </div>

                        {/* Direct Battle Option */}
                        <div className="bg-slate-950 p-6 rounded-3xl border border-red-500/30 shadow-lg flex flex-col group hover:border-red-500 transition-all">
                            <div className="flex justify-between items-start mb-4">
                                <Sword size={32} className="text-red-600 group-hover:scale-110 transition-transform" />
                                <span className="text-[10px] text-red-500 font-bold uppercase tracking-widest bg-red-950/50 px-2 py-0.5 rounded border border-red-900">Direct Execution</span>
                            </div>
                            <h4 className="text-xl font-bold text-white mb-2">지배자가 직접 처단</h4>
                            <p className="text-[11px] text-slate-500 mb-6 leading-relaxed">
                                반역자의 숨통을 직접 끊어 지배자의 위엄을 증명합니다.<br/>
                                강력한 반란군 수장과 정예병들이 당신을 기다립니다.<br/>
                                <span className="text-amber-500 font-bold">직접 전투 시 더 높은 보상을 얻을 수 있습니다.</span>
                            </p>
                            <button 
                                onClick={handleDirectBattle}
                                className="mt-auto py-4 bg-red-700 hover:bg-red-600 text-white rounded-2xl font-bold text-sm shadow-xl shadow-red-900/40 transition-all flex items-center justify-center gap-2 transform active:scale-95"
                            >
                                <Zap size={18}/>
                                반역자 직접 처단 (Direct)
                            </button>
                        </div>
                    </div>

                    <div className="bg-black/30 p-4 rounded-2xl border border-white/5 flex gap-3 items-start">
                        <Info size={16} className="text-red-500 shrink-0 mt-0.5" />
                        <div className="text-[10px] text-slate-500 leading-relaxed space-y-1">
                            <p>• 마계는 힘의 논리가 지배하는 곳입니다. 공포 정치를 소홀히 하면 하극상이 발생합니다.</p>
                            <p>• 반란 진압에 실패할 경우, 플레이어의 직업은 해당 반란군의 서열보다 한 단계 낮은 직위로 <span className="text-red-400 font-bold text-xs">즉시 강등</span>됩니다.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MagyeRevoltModal;
