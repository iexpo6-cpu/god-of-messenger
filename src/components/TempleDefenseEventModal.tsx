
import React, { useState } from 'react';
import { Character, Enemy, TemplePersonnel, Companion, JobType } from '../types';
import { X, ShieldAlert, Sword, Users, ShieldCheck, AlertTriangle, Loader2, Flame, Skull, Target, Info, Crown, Sparkles } from 'lucide-react';
import ActionResultModal, { ResultData } from './ActionResultModal';

interface Props {
    character: Character;
    event: { enemies: Enemy[], log: string, source: string, targetCity: string, targetNation: string };
    onClose: () => void;
    onBattle: (enemy: Enemy | Enemy[], type: string, source: string, city: string, nation: string) => void;
    onUpdateCharacter: (newChar: Character, logMsg: string) => void;
}

const TempleDefenseEventModal: React.FC<Props> = ({ character, event, onClose, onBattle, onUpdateCharacter }) => {
    const [isSimulating, setIsSimulating] = useState(false);
    const [resultData, setResultData] = useState<ResultData | null>(null);
    const [isFailed, setIsFailed] = useState(false);

    const messenger = [character, ...character.companions, ...(character.inactiveCompanions || [])].find(m => {
        const job = m.job;
        return job && [
            JobType.SOLAR_MESSENGER, JobType.FIRE_MESSENGER, JobType.RADIANT_MESSENGER,
            JobType.MOONLIGHT_MESSENGER, JobType.ELECTRIC_MESSENGER, JobType.EARTH_MESSENGER,
            JobType.GALE_MESSENGER, JobType.ICE_MESSENGER, JobType.SEA_MESSENGER,
            JobType.STEEL_MESSENGER, JobType.DARK_MESSENGER, JobType.NATURE_MESSENGER,
            JobType.VOID_MESSENGER
        ].includes(job);
    });

    const templeCity = event.targetCity || messenger?.nation || "신의 거처";
    const templeKey = `${event.targetNation || character.nation}_${templeCity}`;
    const personnel = character.base?.templePersonnel?.[templeKey];
    const templeLevel = character.base?.facilityLevels?.[`temple_size_${templeKey}`] || 1;
    
    // 방어력 계산 (TempleDefenseModal의 로직과 동일)
    const allComps = [...character.companions, ...(character.inactiveCompanions || [])];
    let defenseScore = 0;
    if (personnel) {
        const getStatsSum = (id: string) => {
            const c = allComps.find(comp => comp.id === id);
            return c ? (c.stats.str + c.stats.int + c.stats.wis + c.stats.def + c.stats.agi + c.stats.ctrl) : 0;
        };
        personnel.knightIds.forEach(id => defenseScore += getStatsSum(id) * 1.5);
        personnel.butlerIds.forEach(id => defenseScore += getStatsSum(id) * 1.0);
        personnel.maidIds.forEach(id => defenseScore += getStatsSum(id) * 1.0);
    }

    const boss = event.enemies[0];
    const bossLevel = boss?.level || 100;
    
    // 공식: 기본성공률 0% + (성전방어도 - 보스레벨) * 0.1%
    const successRate = Math.min(95, Math.max(0, Math.floor((defenseScore - bossLevel) * 0.1)));

    const handleEntrust = () => {
        setIsSimulating(true);
        setTimeout(() => {
            const roll = Math.random() * 100;
            const success = roll < successRate;

            if (success) {
                const newChar = { ...character };
                let majestyGain = 100;
                if (event.source === '마신' || event.source === '타락한 신성') majestyGain = 1000;
                else if (event.source === '마계' || event.source === '타 성전') majestyGain = 500;

                if (newChar.base?.templePersonnel?.[templeKey]) {
                    newChar.base.templePersonnel[templeKey].majesty = (newChar.base.templePersonnel[templeKey].majesty || 0) + majestyGain;
                }
                
                newChar.pendingDefenseEvent = undefined;
                onUpdateCharacter(newChar, `[성전 수호 성공] 대원들이 힘을 합쳐 ${event.source}의 공세를 막아냈습니다! (위엄도 +${majestyGain})`);
                
                setResultData({
                    type: 'success',
                    title: '성전 방어 성공',
                    message: '대원들이 당신의 지휘 아래 성역을 무사히 지켜냈습니다.',
                    items: [
                        { label: '승률', after: `${successRate}%` },
                        { label: '위엄도 상승', after: `+${majestyGain}` }
                    ]
                });
            } else {
                setIsFailed(true);
                setResultData({
                    type: 'failure',
                    title: '방어선 붕괴',
                    message: '대원들이 침공을 막아내지 못하고 후퇴했습니다!\n적군이 성전 내부로 진입하고 있습니다. 사자가 직접 나서야 합니다!',
                    items: [{ label: '승률', after: `${successRate}%` }, { label: '결과', after: '방어 실패' }]
                });
            }
            setIsSimulating(false);
        }, 2000);
    };

    const handleDirectBattle = () => {
        onBattle(event.enemies, 'temple_defense', event.source, event.targetCity, event.targetNation);
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/95 backdrop-blur-xl p-4 animate-in fade-in">
            {resultData && (
                <ActionResultModal 
                    data={resultData} 
                    onClose={() => {
                        setResultData(null);
                        if (!isFailed) onClose(); 
                    }} 
                />
            )}

            <div className="bg-slate-900 border-2 border-red-600 w-full max-w-2xl rounded-2xl sm:rounded-[2.5rem] shadow-[0_0_100px_rgba(220,38,38,0.4)] flex flex-col overflow-hidden relative max-h-[90vh]">
                <div className="absolute inset-0 bg-gradient-to-b from-red-950/20 to-transparent pointer-events-none"></div>
                
                <div className="p-4 sm:p-6 border-b border-red-900/50 bg-red-950/30 flex justify-between items-center relative z-10">
                    <div className="flex items-center gap-3">
                        <Flame size={32} className="text-red-500 shrink-0 animate-pulse" />
                        <div>
                            <h2 className="text-lg sm:text-2xl font-bold text-white tracking-tighter">TEMPLE UNDER ATTACK</h2>
                            <p className="text-[10px] sm:text-xs text-red-400 font-bold uppercase tracking-widest">성전 긴급 방어 프로토콜 가동</p>
                        </div>
                    </div>
                </div>

                <div className="p-4 sm:p-6 flex-1 overflow-y-auto custom-scrollbar space-y-4 sm:space-y-6 relative z-10">
                    <div className="bg-black/40 p-6 rounded-3xl border border-red-500/20 text-center space-y-4">
                        <div className="inline-block p-3 bg-red-900/20 rounded-2xl mb-2">
                            <ShieldAlert size={48} className="text-red-500 animate-bounce-short" />
                        </div>
                        <p className="text-lg text-red-200 font-bold leading-relaxed whitespace-pre-wrap">
                            {event.log}
                        </p>
                        <div className="flex justify-center gap-4">
                            <span className="bg-red-950 text-red-400 px-3 py-1 rounded-full border border-red-900 text-xs font-bold">침공 근원: {event.source}</span>
                            <span className="bg-slate-900 text-slate-400 px-3 py-1 rounded-full border border-slate-800 text-xs font-bold">대상: {templeCity}</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className={`bg-slate-950 p-6 rounded-3xl border transition-all flex flex-col ${isFailed ? 'opacity-30 grayscale border-slate-800' : 'border-indigo-500/30 shadow-lg'}`}>
                            <div className="flex justify-between items-start mb-4">
                                <Users size={32} className="text-indigo-400" />
                                <div className="text-right">
                                    <div className="text-[10px] text-slate-500 uppercase font-bold">Success Rate</div>
                                    <div className={`text-2xl font-mono font-bold ${successRate >= 70 ? 'text-green-400' : successRate >= 40 ? 'text-yellow-400' : 'text-red-400'}`}>
                                        {successRate}%
                                    </div>
                                </div>
                            </div>
                            <h4 className="text-xl font-bold text-white mb-2">대원들에게 일임</h4>
                            <p className="text-xs text-slate-500 mb-6 leading-relaxed">
                                성전에 배치된 수호기사, 집사, 메이드들이 방어선을 형성합니다.<br/>
                                <span className="text-indigo-400">성전 방어도({Math.floor(defenseScore)})</span>에 따라 성공 여부가 결정됩니다.
                            </p>
                            <button 
                                onClick={handleEntrust}
                                disabled={isSimulating || isFailed}
                                className={`mt-auto py-4 rounded-2xl font-bold text-sm shadow-xl transition-all flex items-center justify-center gap-2 ${isFailed ? 'bg-slate-800 text-slate-600' : 'bg-indigo-700 hover:bg-indigo-600 text-white'}`}
                            >
                                {isSimulating ? <Loader2 size={18} className="animate-spin" /> : <ShieldCheck size={18}/>}
                                {isFailed ? '방어선 붕괴됨' : '방어 지휘 (Entrust)'}
                            </button>
                        </div>

                        <div className="bg-slate-950 p-6 rounded-3xl border border-red-500/30 shadow-lg flex flex-col">
                            <div className="flex justify-between items-start mb-4">
                                <Sword size={32} className="text-red-500 animate-pulse" />
                                <span className="text-[10px] text-red-500 font-bold uppercase tracking-widest bg-red-950/50 px-2 py-1 rounded border border-red-900">Direct Combat</span>
                            </div>
                            <h4 className="text-xl font-bold text-white mb-2">신의 사자 강림</h4>
                            <p className="text-xs text-slate-500 mb-6 leading-relaxed">
                                사자가 직접 무기를 들고 전면에 나섭니다.<br/>
                                적군을 직접 처단하여 성전의 위엄을 만천하에 과시하십시오.
                            </p>
                            <button 
                                onClick={handleDirectBattle}
                                className="mt-auto py-4 bg-red-700 hover:bg-red-600 text-white rounded-2xl font-bold text-sm shadow-xl shadow-red-900/40 transition-all flex items-center justify-center gap-2 transform active:scale-95"
                            >
                                <Target size={18}/>
                                직접 전투 개시 (Direct)
                            </button>
                        </div>
                    </div>

                    <div className="bg-black/20 p-4 rounded-2xl border border-white/5 flex gap-3 items-start">
                        <Info size={16} className="text-amber-500 shrink-0 mt-0.5" />
                        <div className="text-[10px] text-slate-500 leading-relaxed">
                            <p>• 방어 성공 시 침공 근원에 따라 위엄도가 상승합니다. (+100 ~ +1000)</p>
                            <p>• 전투 패배 시 위엄도가 <span className="text-red-400">500 하락</span>하며, 위엄도가 0이 되면 <span className="text-red-500 font-bold">사자 직위를 박탈</span>당합니다.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TempleDefenseEventModal;
