
import React, { useState } from 'react';
import { Character, CapturedMonster, DominionData, Stats, ItemRarity } from '../types';
import { X, Skull, Zap, Flame, Shield, Sword, Heart, Activity, Ghost, UserPlus,LogOut, Target,ShieldCheck, RefreshCw, AlertTriangle, CheckCircle, Info, Loader2, Package, TrendingUp } from 'lucide-react';
import ActionResultModal, { ResultData } from './ActionResultModal';

interface Props {
    character: Character;
    city: string;
    onClose: () => void;
    onUpdateCharacter: (newChar: Character, logMsg: string) => void;
}

const MAX_TRAIN_LIMIT = 50;

const MagyeBeastManagementModal: React.FC<Props> = ({ character, city, onClose, onUpdateCharacter }) => {
    const [resultData, setResultData] = useState<ResultData | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [showRegistration, setShowRegistration] = useState(false);

    const dominion = character.magyeDominions?.[city];
    const guardian = dominion?.guardian;

    // 가용 몬스터 목록 (사육소에 있는 몬스터)
    const availableMonsters = character.base?.capturedMonsters?.filter(m => m.stage !== '알' as any) || [];

    const handleRegisterBeast = (monster: CapturedMonster) => {
        setIsProcessing(true);
        setTimeout(() => {
            const newChar = JSON.parse(JSON.stringify(character)) as Character;
            if (!newChar.magyeDominions) newChar.magyeDominions = {};
            if (!newChar.magyeDominions[city]) {
                newChar.magyeDominions[city] = { 
                    fear: 500, corruption: 500, 
                    facilityLevels: { harvester: 1, breeder: 1, torture: 1 },
                    personnel: { overseerIds: [], executionerIds: [] }
                };
            }

            // 기존 마수가 있다면 사육소로 복구
            const prevGuardian = newChar.magyeDominions[city].guardian;
            if (prevGuardian) {
                if (!newChar.base) newChar.base = {} as any;
                if (!newChar.base!.capturedMonsters) newChar.base!.capturedMonsters = [];
                newChar.base!.capturedMonsters.push(prevGuardian);
            }

            // 새 마수 등록
            newChar.magyeDominions[city].guardian = monster;
            
            // 사육소에서 제거
            if (newChar.base?.capturedMonsters) {
                newChar.base.capturedMonsters = newChar.base.capturedMonsters.filter(m => m.id !== monster.id);
            }

            onUpdateCharacter(newChar, `[마계 통치] '${monster.name}'을(를) ${city}의 수호 마수로 임명했습니다.`);
            setResultData({
                type: 'success',
                title: '마수 임명 완료',
                message: `${monster.name}이(가) 지배지의 어둠을 지키는 수호자가 되었습니다.`,
                items: [{ label: '대상', after: monster.name }, { label: '등급', after: monster.rank }]
            });
            setIsProcessing(false);
            setShowRegistration(false);
        }, 1000);
    };

    const handleUnregister = () => {
        if (!guardian) return;
        
        setIsProcessing(true);
        setTimeout(() => {
            const newChar = JSON.parse(JSON.stringify(character)) as Character;
            const targetDom = newChar.magyeDominions?.[city];
            if (!targetDom || !targetDom.guardian) return;

            const removedBeast = targetDom.guardian;
            targetDom.guardian = undefined;

            if (!newChar.base) newChar.base = {} as any;
            if (!newChar.base!.capturedMonsters) newChar.base!.capturedMonsters = [];
            newChar.base!.capturedMonsters.push(removedBeast);

            onUpdateCharacter(newChar, `[마계 통치] ${removedBeast.name}의 마수 보직을 해제하고 사육소로 복귀시켰습니다.`);
            setResultData({
                type: 'info',
                title: '마수 해임',
                message: `${removedBeast.name}이(가) 수호 마수 보직에서 해제되었습니다.`,
                items: [{ label: '대상', after: removedBeast.name }]
            });
            setIsProcessing(false);
        }, 1000);
    };

    const handleTrain = (statKey: keyof Stats) => {
        if (!guardian) return;
        
        const crystalCost = 20;
        const corruptionCost = 10;
        const curCrystals = character.base?.resources.manaCrystal || 0;

        if (curCrystals < crystalCost || dominion!.corruption < corruptionCost) {
            alert("자원이 부족합니다. (마정석 20, 타락도 10 필요)");
            return;
        }

        setIsProcessing(true);
        setTimeout(() => {
            const newChar = JSON.parse(JSON.stringify(character)) as Character;
            const targetDom = newChar.magyeDominions![city];
            const targetBeast = targetDom.guardian!;
            
            const boost = 50;
            targetBeast.stats[statKey] += boost;
            if (statKey === 'maxHp') targetBeast.hp += boost;

            newChar.base!.resources.manaCrystal -= crystalCost;
            targetDom.corruption -= corruptionCost;
            targetBeast.affection = Math.min(200, (targetBeast.affection || 0) + 2);

            onUpdateCharacter(newChar, `[마수 육성] 심연의 기운을 주입하여 ${targetBeast.name}의 ${statKey.toUpperCase()}가 ${boost} 상승했습니다.`);
            setResultData({
                type: 'levelup',
                title: '심연 강화 성공',
                message: '도시의 타락한 에너지가 마수의 육신을 재편했습니다.',
                items: [
                    { label: statKey.toUpperCase(), after: `+${boost}` },
                    { label: '소모 타락도', after: `-${corruptionCost}` }
                ]
            });
            setIsProcessing(false);
        }, 800);
    };

    return (
        <div className="fixed inset-0 z-[160] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-in fade-in">
            {resultData && <ActionResultModal data={resultData} onClose={() => setResultData(null)} />}

            <div className="bg-slate-900 border-2 border-purple-600 w-full max-w-4xl h-[85vh] rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden relative">
                
                <div className="p-6 border-b border-purple-900/50 bg-red-950/20 flex justify-between items-center shrink-0 z-10">
                    <div className="flex items-center gap-4">
                        <Skull className="text-red-500 animate-pulse" size={32} />
                        <div>
                            <h2 className="text-2xl font-bold text-white font-cinzel tracking-widest">BEAST CONTROL</h2>
                            <p className="text-xs text-red-400 font-bold uppercase">{city} 수호 마수 관리 시스템</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-slate-500 hover:text-white p-2 rounded-full hover:bg-slate-800 transition-colors"><X size={28}/></button>
                </div>

                <div className="flex-1 overflow-y-auto p-8 bg-slate-900 custom-scrollbar z-10">
                    {!guardian ? (
                        <div className="h-full flex flex-col items-center justify-center text-center space-y-8 animate-in zoom-in-95">
                            <div className="relative">
                                <Ghost size={80} className="text-slate-700 opacity-50" />
                                <div className="absolute inset-0 bg-red-500 blur-[60px] opacity-10"></div>
                            </div>
                            <div className="max-w-md">
                                <h3 className="text-2xl font-bold text-white mb-2">공석인 마수의 자리</h3>
                                <p className="text-sm text-slate-400 leading-relaxed">
                                    도시를 수호하고 지배력을 강화할 강력한 마수가 필요합니다.<br/>
                                    사육소에 있는 몬스터 중 하나를 선택하여 지배지에 배치하십시오.
                                </p>
                            </div>
                            
                            {showRegistration ? (
                                <div className="w-full max-w-2xl space-y-4 animate-in slide-in-from-bottom-4">
                                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest text-left px-1">배치 가능 몬스터</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-64 overflow-y-auto custom-scrollbar pr-2">
                                        {availableMonsters.map(m => {
                                            const imgUrl = m.visualUrl || m.imageUrl;
                                            return (
                                                <button
                                                    key={m.id}
                                                    onClick={() => handleRegisterBeast(m)}
                                                    className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 hover:border-red-500 transition-all text-left flex justify-between items-center group shadow-md"
                                                >
                                                    <div className="flex items-center gap-3 min-w-0">
                                                        {imgUrl ? (
                                                            <img 
                                                                src={imgUrl} 
                                                                alt={m.name} 
                                                                className="w-12 h-12 rounded-xl object-cover border border-red-900/50 group-hover:scale-105 transition-transform shrink-0" 
                                                            />
                                                        ) : (
                                                            <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0">
                                                                <Ghost size={20} className="text-slate-600" />
                                                            </div>
                                                        )}
                                                        <div className="min-w-0">
                                                            <div className="font-bold text-white group-hover:text-red-400 transition-colors text-sm truncate">{m.nickname || m.name}</div>
                                                            <div className="text-[11px] text-slate-400 mt-0.5">{m.stage || '성체'} • Lv.{m.level} • {m.rank} 등급</div>
                                                        </div>
                                                    </div>
                                                    <UserPlus size={18} className="text-slate-600 group-hover:text-red-500 transition-colors shrink-0 ml-2" />
                                                </button>
                                            );
                                        })}
                                        {availableMonsters.length === 0 && (
                                            <div className="col-span-2 py-10 bg-slate-950/50 rounded-2xl border border-dashed border-slate-800 text-center">
                                                <p className="text-xs text-slate-500">사육소에 배치 가능한 성장한 몬스터가 없습니다.</p>
                                            </div>
                                        )}
                                    </div>
                                    <button onClick={() => setShowRegistration(false)} className="text-xs text-slate-500 underline hover:text-white">취소하기</button>
                                </div>
                            ) : (
                                <button 
                                    onClick={() => setShowRegistration(true)}
                                    className="px-12 py-5 bg-red-800 hover:bg-red-700 text-white font-bold rounded-2xl shadow-xl shadow-red-900/30 transition-all transform hover:scale-105 active:scale-95 flex items-center gap-3"
                                >
                                    <UserPlus size={24}/> 마수 임명하기
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in">
                            {/* Left: Beast Profile */}
                            <div className="lg:col-span-1 space-y-6">
                                <div className="aspect-square rounded-3xl overflow-hidden border-2 border-red-600/50 shadow-2xl relative group bg-slate-950 flex items-center justify-center">
                                    {(guardian.visualUrl || guardian.imageUrl) ? (
                                        <img 
                                            src={guardian.visualUrl || guardian.imageUrl} 
                                            alt={guardian.name} 
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                                        />
                                    ) : (
                                        <Ghost size={72} className="text-red-950 animate-pulse" />
                                    )}
                                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent opacity-90"></div>
                                    <div className="absolute bottom-6 left-6 right-6 z-10">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-[10px] bg-red-900/90 text-red-100 px-2 py-0.5 rounded font-black border border-red-700">{guardian.rank} 등급</span>
                                            <span className="text-[10px] bg-purple-900/90 text-purple-100 px-2 py-0.5 rounded font-bold border border-purple-700">{guardian.stage || '성체'}</span>
                                        </div>
                                        <h3 className="text-2xl font-black text-white">{guardian.nickname || guardian.name}</h3>
                                        <p className="text-xs text-slate-300 mt-1">Lv.{guardian.level} • {guardian.shinryokuType || '마계 속성'}</p>
                                    </div>
                                </div>

                                <div className="bg-slate-950 p-5 rounded-3xl border border-slate-800 space-y-4 shadow-inner">
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs text-slate-400 font-bold">호감도 수치</span>
                                        <span className="text-sm font-bold text-pink-500">{guardian.affection || 0} / 200</span>
                                    </div>
                                    <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                                        <div className="h-full bg-pink-600 shadow-[0_0_10px_rgba(219,39,119,0.5)]" style={{ width: `${((guardian.affection || 0) / 200) * 100}%` }}></div>
                                    </div>
                                </div>

                                <button 
                                    onClick={handleUnregister}
                                    disabled={isProcessing}
                                    className="w-full py-4 bg-slate-800 hover:bg-red-900/30 border border-slate-700 hover:border-red-600 text-slate-300 hover:text-red-400 rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-2"
                                >
                                    <LogOut size={18}/> 보직 해임 (사육소 복귀)
                                </button>
                            </div>

                            {/* Right: Management & Training */}
                            <div className="lg:col-span-2 space-y-8">
                                <div className="bg-slate-950 p-8 rounded-[2.5rem] border border-red-900/30 space-y-6">
                                    <div className="flex justify-between items-center border-b border-slate-800 pb-4">
                                        <h4 className="text-lg font-bold text-white flex items-center gap-3">
                                            <Flame className="text-red-500" size={24}/> 심연 강화 (Abyssal Training)
                                        </h4>
                                        <div className="flex gap-4">
                                            <div className="flex items-center gap-1.5 text-xs text-purple-400 font-mono">
                                                <Zap size={14}/> 20
                                            </div>
                                            <div className="flex items-center gap-1.5 text-xs text-red-400 font-mono">
                                                <Skull size={14}/> 10
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {[
                                            { k: 'str', l: '공격력 (STR)', i: Sword, c: 'text-red-500' },
                                            { k: 'def', l: '방어력 (DEF)', i: Shield, c: 'text-blue-500' },
                                            { k: 'int', l: '지능 (INT)', i: Zap, c: 'text-purple-500' },
                                            { k: 'maxHp', l: '생명력 (HP)', i: Heart, c: 'text-rose-500' },
                                            { k: 'agi', l: '스피드 (AGI)', i: Activity, c: 'text-yellow-500' },
                                            { k: 'ctrl', l: '신력 제어력 (CTRL)', i: Target, c: 'text-cyan-500' }
                                        ].map(stat => (
                                            <div key={stat.k} className="bg-slate-900 p-4 rounded-2xl border border-slate-800 flex justify-between items-center group hover:border-red-500/50 transition-all">
                                                <div className="flex items-center gap-3">
                                                    <div className={`p-2 rounded-lg bg-black/40 ${stat.c}`}><stat.i size={18}/></div>
                                                    <div className="flex flex-col">
                                                        <span className="text-[10px] text-slate-500 font-bold uppercase">{stat.l}</span>
                                                        <span className="text-sm font-bold text-slate-200 font-mono">{(guardian.stats as any)[stat.k]}</span>
                                                    </div>
                                                </div>
                                                <button 
                                                    onClick={() => handleTrain(stat.k as any)}
                                                    disabled={isProcessing}
                                                    className="px-4 py-2 bg-slate-800 hover:bg-red-900 text-white rounded-xl text-[10px] font-bold shadow-lg transition-all"
                                                >
                                                    주입
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                    <p className="text-[9px] text-slate-600 italic">* 강화 시 마정석 20개와 도시 타락도 10이 소모됩니다. (확률 100%)</p>
                                </div>

                                <div className="bg-slate-950 p-6 rounded-[2rem] border border-slate-800">
                                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                                        <Info size={16} className="text-indigo-400"/> 마수 특수 능력
                                    </h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800">
                                            <div className="flex items-center gap-2 mb-1">
                                                <ShieldCheck size={14} className="text-green-400"/>
                                                <span className="text-xs font-bold text-white">도시 방어 보너스</span>
                                            </div>
                                            <p className="text-[10px] text-slate-500 leading-relaxed">지배지에 침공 발생 시 마수가 선봉에 서서 적의 공격을 분산시킵니다.</p>
                                        </div>
                                        <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800">
                                            <div className="flex items-center gap-2 mb-1">
                                                <TrendingUp size={14} className="text-amber-400"/>
                                                <span className="text-xs font-bold text-white">지배력 유지</span>
                                            </div>
                                            <p className="text-[10px] text-slate-500 leading-relaxed">마수의 레벨이 높을수록 도시의 공포도가 매달 자동으로 소폭 상승합니다.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-6 bg-slate-950 border-t border-purple-900/50 flex justify-between items-center shrink-0 z-10">
                    <div className="flex gap-8">
                        <div className="flex items-center gap-2">
                            <div className="p-2 bg-purple-900/30 rounded-lg"><Zap size={16} className="text-purple-400"/></div>
                            <div>
                                <p className="text-[10px] text-slate-500 uppercase font-bold">Mana Crystals</p>
                                <p className="text-sm font-mono font-bold text-purple-300">{character.base?.resources.manaCrystal || 0}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="p-2 bg-red-900/30 rounded-lg"><Flame size={16} className="text-red-400"/></div>
                            <div>
                                <p className="text-[10px] text-slate-500 uppercase font-bold">Dominion Corruption</p>
                                <p className="text-sm font-mono font-bold text-red-300">{dominion?.corruption || 0}</p>
                            </div>
                        </div>
                    </div>
                    <button onClick={onClose} className="px-10 py-3 bg-purple-700 hover:bg-purple-600 text-white rounded-xl font-bold shadow-lg transition-all active:scale-95">관리 종료</button>
                </div>

                {isProcessing && (
                    <div className="absolute inset-0 bg-black/60 z-[180] flex flex-col items-center justify-center">
                        <Loader2 size={48} className="animate-spin text-red-500 mb-4" />
                        <p className="text-white font-bold tracking-widest animate-pulse">심연의 계약을 갱신 중...</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MagyeBeastManagementModal;
