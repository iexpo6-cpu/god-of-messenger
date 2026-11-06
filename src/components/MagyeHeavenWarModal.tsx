
import React, { useState } from 'react';
import { Character, JobType, Enemy, CombatState } from '../types';
import { X, Sword, ShieldAlert, Crown, Flame, Skull, Zap, Globe, Target, ShieldCheck, Info, Lock, AlertTriangle, TowerControl, CloudSun, Sparkles, UserCheck, CheckCircle } from 'lucide-react';
import { generateDivineWarEnemies } from '../divineWarSystem';
import { WORLD_GEOGRAPHY, TEMPLE_MESSENGER_MAP } from '../constants';
import ActionResultModal, { ResultData } from './ActionResultModal';

interface Props {
    character: Character;
    onClose: () => void;
    onUpdateCharacter: (newChar: Character, logMsg: string) => void;
    onBattle: (enemy: Enemy | Enemy[], type: CombatState['type'], source: string, city?: string, nation?: string) => void;
}

const MagyeHeavenWarModal: React.FC<Props> = ({ character, onClose, onUpdateCharacter, onBattle }) => {
    const [selectedTemple, setSelectedTemple] = useState<string | null>(null);
    const [resultData, setResultData] = useState<ResultData | null>(null);

    const allMembers = [character, ...character.companions, ...(character.inactiveCompanions || [])];
    const isGodDefeated = character.isGodDefeated || false;

    // 모든 성전 목록 추출
    const temples = Object.keys(TEMPLE_MESSENGER_MAP);

    const handleInvasion = (templeName: string) => {
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
        const combatType: CombatState['type'] = isGod ? 'magye_god_slaying' : 'magye_temple_invasion';
        
        const execute = () => {
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
            onBattle(enemies, combatType, templeName, templeName, nation);
            onClose();
        };

        setResultData({
            type: 'warning',
            title: isGod ? '절대신 살해 작전' : '성전 정벌 개시',
            message: `${templeName}의 신성을 파괴하고 제국의 영토로 편입하시겠습니까?`,
            items: [
                { label: '목표', after: templeName },
                { label: '예상 악명 상승', after: `+${isGod ? '10,000' : '1,000'}` }
            ]
        });
        (window as any).warConfirm = execute;
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/95 backdrop-blur-md p-4 animate-in fade-in">
            {resultData && <ActionResultModal data={resultData} onClose={() => setResultData(null)} onContinue={(window as any).warConfirm} />}

            <div className="bg-slate-950 border-2 border-red-700 w-full max-w-5xl h-[85vh] rounded-[2.5rem] shadow-[0_0_100px_rgba(220,38,38,0.3)] flex flex-col overflow-hidden relative">
                {/* Visual Backdrop */}
                <div className="absolute inset-0 opacity-10 pointer-events-none">
                    <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-red-600 via-transparent to-transparent opacity-40"></div>
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/black-scales.png')]"></div>
                </div>

                <div className="p-8 border-b border-red-900/50 bg-red-950/20 flex justify-between items-center shrink-0 z-10">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-red-800 rounded-2xl shadow-xl animate-pulse">
                            <TowerControl size={32} className="text-white" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-white font-cinzel tracking-widest uppercase">Celestial War Command</h2>
                            <p className="text-xs text-red-400 font-bold">제국 총사령부: 신계 정벌 전략 통제실</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-slate-500 hover:text-white p-2 rounded-full hover:bg-slate-800 transition-colors"><X size={28}/></button>
                </div>

                <div className="flex-1 overflow-hidden flex flex-col md:flex-row z-10">
                    {/* Left: Target List */}
                    <div className="w-full md:w-80 border-r border-red-900/30 p-6 overflow-y-auto custom-scrollbar shrink-0 bg-black/40">
                        <h3 className="text-xs font-bold text-slate-500 uppercase mb-6 flex items-center gap-2">
                            <Target size={14} className="text-red-600"/> 정벌 대상 (Temples)
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

                    {/* Right: Strategy View */}
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
                                        onClick={() => handleInvasion(selectedTemple)}
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
                </div>

                <div className="p-4 bg-slate-950 border-t border-red-900/50 text-center shrink-0 z-10">
                    <p className="text-[9px] text-slate-600 font-bold uppercase tracking-[0.5em] animate-pulse">Eternal War: Pandemonium vs Celestia</p>
                </div>
            </div>
        </div>
    );
};

export default MagyeHeavenWarModal;
