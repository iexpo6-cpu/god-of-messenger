
import React, { useState, useMemo } from 'react';
import { Character, Companion, Item, Stats, JobType, SkillType, Skill } from '../types';
import { X, Sparkles, Star, Zap, Sword, Shield, Heart,ArrowRight, Activity, Brain, Users, Lock, User, CheckCircle, Coins, Package, Target, Loader2, Info, AlertTriangle, Crown, Flame, ShieldCheck, HeartPulse, Infinity, ChevronRight, Calculator } from 'lucide-react';
import ActionResultModal, { ResultData } from './ActionResultModal';
import { IMMUNE_JOBS } from '../services/deathTimeEngine';
import { DIVINE_MESSENGER_CONFIG } from '../awakening';

interface Props {
    character: Character;
    onClose: () => void;
    onUpdateCharacter: (newChar: Character, logMsg: string) => void;
}

const GodPowerModal: React.FC<Props> = ({ character, onClose, onUpdateCharacter }) => {
    const [selectedTargetId, setSelectedTargetId] = useState<string>('player');
    const [selectedSkillIdx, setSelectedSkillIdx] = useState<number | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [resultData, setResultData] = useState<ResultData | null>(null);
    const [activeSubTab, setActiveSubTab] = useState<'stats' | 'immortal' | 'skill'>('stats');

    const primordialCount = character.inventory.filter(i => i.name === "태초의 빛").length;

    // 마계의 제너럴이나 마신 판별 헬퍼
    const isForbiddenTarget = (entity: any) => {
        const name = entity.name || "";
        const classType = entity.classType || "";
        const forbiddenKeywords = ["제너럴", "마신", "General", "Demon God"];
        return forbiddenKeywords.some(k => name.includes(k) || classType.includes(k));
    };

    const isImmuneByJob = (entity: any) => {
        return entity.job && IMMUNE_JOBS.includes(entity.job);
    };

    const allPotentials = useMemo(() => {
        const list = [
            { 
                id: 'player', 
                name: `${character.name} (나)`, 
                level: character.level, 
                shinryoku: character.shinryokuType, 
                forbidden: isForbiddenTarget(character), 
                isImmune: isImmuneByJob(character),
                isImmortal: character.isImmortal || false,
                entity: character  
            },
            ...character.companions.map(c => ({ 
                id: c.id, 
                name: c.name, 
                level: c.level, 
                shinryoku: c.shinryokuType, 
                forbidden: isForbiddenTarget(c), 
                isImmune: isImmuneByJob(c),
                isImmortal: c.isImmortal || false,
                entity: c 
            })),
            ...(character.inactiveCompanions || []).map(c => ({ 
                id: c.id, 
                name: c.name, 
                level: c.level, 
                shinryoku: c.shinryokuType, 
                forbidden: isForbiddenTarget(c), 
                isImmune: isImmuneByJob(c),
                isImmortal: c.isImmortal || false,
                entity: c 
            }))
        ];
        return list;
    }, [character]);

    const selectedTarget = allPotentials.find(p => p.id === selectedTargetId);

    // [NEW] 신격화 대상 스킬 필터링
    const targetSkills = useMemo(() => {
        if (!selectedTarget) return [];
        return selectedTarget.entity.skills.filter(s => 
            (s.type === SkillType.PHYSICAL || s.type === SkillType.MAGIC) && 
            !s.name.startsWith('[신]') &&
            !(s.effectFormula || "").includes('[DIVINE]')
        );
    }, [selectedTarget]);

    // [NEW] 신격화 비용 계산
    const getApotheosisCost = () => {
        if (!selectedTarget) return null;
        
        // 계통별 전용 재료 찾기
        const config = Object.values(DIVINE_MESSENGER_CONFIG).find(c => c.elements.includes(selectedTarget.shinryoku));
        if (selectedTarget.shinryoku === '무기강화계' || selectedTarget.shinryoku === '신체강화계') {
            const voidCfg = DIVINE_MESSENGER_CONFIG["무의사자"];
            return {
                primordial: 5,
                mana: 1000,
                shard: 100,
                special: 10,
                gold: 1000000,
                materialName: voidCfg.material
            };
        }

        return {
            primordial: 5,
            mana: 1000,
            shard: 100,
            special: 10,
            gold: 1000000,
            materialName: config?.material || "신의 정수"
        };
    };

    const apotheosisCost = getApotheosisCost();

    const handleGrantPower = () => {
        if (!selectedTarget || selectedTarget.forbidden || primordialCount < 1) return;

        setIsProcessing(true);
        setTimeout(() => {
            const newChar = JSON.parse(JSON.stringify(character)) as Character;
            
            let removed = false;
            newChar.inventory = newChar.inventory.filter(item => {
                if (!removed && item.name === "태초의 빛") {
                    removed = true;
                    return false;
                }
                return true;
            });

            const statBoost = 200;
            const resourceBoost = 2000;

            const applyStats = (stats: Stats) => {
                stats.str += statBoost;
                stats.int += statBoost;
                stats.wis += statBoost;
                stats.def += statBoost;
                stats.agi += statBoost;
                stats.ctrl += statBoost;
                stats.maxHp += resourceBoost;
                stats.hp += resourceBoost;
                stats.maxMp += resourceBoost;
                stats.mp += resourceBoost;
            };

            let finalName = "";
            if (selectedTargetId === 'player') {
                applyStats(newChar.stats);
                finalName = newChar.name;
            } else {
                const activeIdx = newChar.companions.findIndex(c => c.id === selectedTargetId);
                if (activeIdx !== -1) {
                    applyStats(newChar.companions[activeIdx].stats);
                    finalName = newChar.companions[activeIdx].name;
                } else if (newChar.inactiveCompanions) {
                    const inactiveIdx = newChar.inactiveCompanions.findIndex(c => c.id === selectedTargetId);
                    if (inactiveIdx !== -1) {
                        applyStats(newChar.inactiveCompanions[inactiveIdx].stats);
                        finalName = newChar.inactiveCompanions[inactiveIdx].name;
                    }
                }
            }

            onUpdateCharacter(newChar, `[신의 권능] 태초의 빛을 사용하여 ${finalName}의 모든 능력치를 ${statBoost} 상승시켰습니다.`);
            
            setResultData({
                type: 'levelup',
                title: '권능 하사 성공',
                message: `신의 정수인 '태초의 빛'이 영혼에 스며들어 비약적인 성장을 이루었습니다.`,
                items: [
                    { label: '대상', after: finalName },
                    { label: '전 능력치', after: `+${statBoost}` },
                    { label: '생명/마력', after: `+${resourceBoost}` }
                ]
            });
            setIsProcessing(false);
        }, 1500);
    };

    const handleGrantImmortality = () => {
        if (!selectedTarget || selectedTarget.forbidden || selectedTarget.isImmune || selectedTarget.isImmortal || primordialCount < 1) return;

        setIsProcessing(true);
        setTimeout(() => {
            const newChar = JSON.parse(JSON.stringify(character)) as Character;
            
            let removed = false;
            newChar.inventory = newChar.inventory.filter(item => {
                if (!removed && item.name === "태초의 빛") {
                    removed = true;
                    return false;
                }
                return true;
            });

            let finalName = "";
            if (selectedTargetId === 'player') {
                newChar.isImmortal = true;
                finalName = newChar.name;
                if (!newChar.memories) newChar.memories = [];
                newChar.memories.push(`[${character.currentDate}] 신의 권능을 통해 영원한 생명을 얻음.`);
            } else {
                const activeIdx = newChar.companions.findIndex(c => c.id === selectedTargetId);
                if (activeIdx !== -1) {
                    newChar.companions[activeIdx].isImmortal = true;
                    finalName = newChar.companions[activeIdx].name;
                    if (!newChar.companions[activeIdx].memories) newChar.companions[activeIdx].memories = [];
                    newChar.companions[activeIdx].memories!.push(`[${character.currentDate}] 가주로부터 영원한 생명을 하사받음.`);
                } else if (newChar.inactiveCompanions) {
                    const inactiveIdx = newChar.inactiveCompanions.findIndex(c => c.id === selectedTargetId);
                    if (inactiveIdx !== -1) {
                        newChar.inactiveCompanions[inactiveIdx].isImmortal = true;
                        finalName = newChar.inactiveCompanions[inactiveIdx].name;
                        if (!newChar.inactiveCompanions[inactiveIdx].memories) newChar.inactiveCompanions[inactiveIdx].memories = [];
                        newChar.inactiveCompanions[inactiveIdx].memories!.push(`[${character.currentDate}] 가주로부터 영원한 생명을 하사받음.`);
                    }
                }
            }

                onUpdateCharacter(newChar, `[신의 권능] 태초의 빛을 사용하여 ${finalName}에게 영생의 축복을 내렸습니다.`);
            
            setResultData({
                type: 'success',
                title: '영생의 축복 강림',
                message: `이제 ${finalName}은(는) 세월의 흐름을 초월했습니다. 노환으로 인한 죽음은 더 이상 그를 찾아오지 않을 것입니다.`,
                items: [
                    { label: '대상', after: finalName },
                    { label: '부여 권능', after: '영생' },
                    { label: '소모 제물', after: '태초의 빛 1개' }
                ]
            });
            setIsProcessing(false);
        }, 1500);
    };

    // [NEW] 스킬 신격화 처리 핸들러
    const handleSkillApotheosis = () => {
        if (!selectedTarget || selectedSkillIdx === null || !apotheosisCost) return;

        const res = character.base?.resources;
        const currentShard = character.base?.elementalShards?.[selectedTarget.shinryoku] || 0;
        const currentSpecial = character.inventory.filter(i => i.name === apotheosisCost.materialName).length;

        const missing = [];
        if (character.money < apotheosisCost.gold) missing.push(`골드 ${apotheosisCost.gold - character.money}G`);
        if (primordialCount < apotheosisCost.primordial) missing.push(`태초의 빛 ${apotheosisCost.primordial - primordialCount}개`);
        if ((res?.manaCrystal || 0) < apotheosisCost.mana) missing.push(`마정석 ${apotheosisCost.mana - (res?.manaCrystal || 0)}개`);
        if (currentShard < apotheosisCost.shard) missing.push(`${selectedTarget.shinryoku} 조각 ${apotheosisCost.shard - currentShard}개`);
        if (currentSpecial < apotheosisCost.special) missing.push(`${apotheosisCost.materialName} ${apotheosisCost.special - currentSpecial}개`);

        if (missing.length > 0) {
            setResultData({
                type: 'warning',
                title: '신성 제물 부족',
                message: '스킬을 신격화하기 위한 제물이 부족합니다.',
                items: missing.map(m => ({ label: '부족', after: m }))
            });
            return;
        }

        setIsProcessing(true);
        setTimeout(() => {
            const newChar = JSON.parse(JSON.stringify(character)) as Character;
            const targetSkill = targetSkills[selectedSkillIdx];

            // 1. 재료 및 자원 차감
            newChar.money -= apotheosisCost.gold;
            if (newChar.base) {
                newChar.base.resources.manaCrystal -= apotheosisCost.mana;
                newChar.base.elementalShards[selectedTarget.shinryoku] -= apotheosisCost.shard;
            }

            let pRemoved = 0;
            let sRemoved = 0;
            newChar.inventory = newChar.inventory.filter(item => {
                if (item.name === "태초의 빛" && pRemoved < apotheosisCost.primordial) { pRemoved++; return false; }
                if (item.name === apotheosisCost.materialName && sRemoved < apotheosisCost.special) { sRemoved++; return false; }
                return true;
            });

            // 2. 성공 여부 판정 (50%)
            const roll = Math.random() * 100;
            const success = roll < 50;

            if (success) {
                // 스킬 업데이트 로직
                const updateSkill = (skills: any[]) => {
                    const idx = skills.findIndex(s => s.name === targetSkill.name);
                    if (idx !== -1) {
                        const s = skills[idx];
                        s.powerRatio = (s.powerRatio || 100) * 2;
                        s.name = `[신] ${s.name}`;
                        s.effectFormula = (s.effectFormula || "") + " [신의 권능 2배]";
                        s.description = `[신의 권능] ${s.description}`;
                    }
                };

                if (selectedTargetId === 'player') updateSkill(newChar.skills);
                else {
                    const activeIdx = newChar.companions.findIndex(c => c.id === selectedTargetId);
                    if (activeIdx !== -1) updateSkill(newChar.companions[activeIdx].skills);
                    else if (newChar.inactiveCompanions) {
                        const inactiveIdx = newChar.inactiveCompanions.findIndex(c => c.id === selectedTargetId);
                        if (inactiveIdx !== -1) updateSkill(newChar.inactiveCompanions[inactiveIdx].skills);
                    }
                }

                onUpdateCharacter(newChar, `[신격화 성공] ${selectedTarget.name}의 기술 '${targetSkill.name}'이(가) 신의 권능을 입었습니다.`);
                setResultData({
                    type: 'success',
                    title: '스킬 신격화 성공!',
                    message: `성스러운 빛이 기술에 깃들어 위력이 200%로 증폭되었습니다.`,
                    items: [
                        { label: '기술명', after: `[신] ${targetSkill.name}` },
                        { label: '위력', before: `${targetSkill.powerRatio}%`, after: `${targetSkill.powerRatio * 2}%` }
                    ]
                });
            } else {
                onUpdateCharacter(newChar, `[신격화 실패] ${selectedTarget.name}의 기술 신격화 도중 기운이 흩어졌습니다. (재료 소실)`);
                setResultData({
                    type: 'failure',
                    title: '신격화 실패',
                    message: '신성한 기운을 다스리는 데 실패했습니다. 막대한 제물이 허공으로 흩어졌습니다.',
                    items: [{ label: '결과', after: '제물 소실' }]
                });
            }
            
            setSelectedSkillIdx(null);
            setIsProcessing(false);
        }, 2000);
    };

    return (
        <div className="fixed inset-0 z-[140] flex items-center justify-center bg-black/90 backdrop-blur-sm p-3 sm:p-4 animate-in fade-in">
            {resultData && <ActionResultModal data={resultData} onClose={() => { setResultData(null); if (resultData.type === 'success') onClose(); }} />}

            <div className="bg-slate-900 border border-amber-500/50 w-full max-w-4xl max-h-[92vh] rounded-3xl shadow-[0_0_80px_rgba(245,158,11,0.25)] flex flex-col overflow-hidden relative">
                {/* 헤더 */}
                <div className="p-4 sm:p-5 border-b border-amber-900/40 bg-amber-950/20 flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-2.5">
                        <div className="p-2 bg-amber-600/30 border border-amber-500/40 rounded-xl">
                            <Crown size={20} className="text-amber-400" />
                        </div>
                        <div>
                            <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">신의 권능</h2>
                            <p className="text-[11px] text-amber-400/80 font-medium">영혼 축복 및 신격화 의식</p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose} 
                        className="p-2 text-slate-400 hover:text-white rounded-full hover:bg-slate-800 transition-colors"
                    >
                        <X size={20}/>
                    </button>
                </div>

                {/* 메인 레이아웃 (목록 + 컨텐츠) */}
                <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
                    {/* 대상 선택 목록 */}
                    <div className="w-full md:w-72 border-b md:border-b-0 md:border-r border-slate-800 p-3 sm:p-4 overflow-y-auto custom-scrollbar shrink-0 bg-slate-950/40">
                        <h3 className="text-xs font-bold text-slate-400 mb-2.5 flex items-center gap-1.5">
                            <Users size={14} className="text-amber-400"/> 권능 하사 대상
                        </h3>
                        <div className="space-y-1.5">
                            {allPotentials.map(p => (
                                <button
                                    key={p.id}
                                    onClick={() => { setSelectedTargetId(p.id); setSelectedSkillIdx(null); }}
                                    disabled={p.forbidden}
                                    className={`w-full p-2.5 sm:p-3 rounded-xl border text-left transition-all flex flex-col min-h-[44px] justify-center ${selectedTargetId === p.id ? 'bg-amber-950/40 border-amber-500 text-white' : p.forbidden ? 'opacity-30 border-rose-900/50 grayscale cursor-not-allowed bg-slate-950' : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'}`}
                                >
                                    <div className="flex justify-between items-center w-full">
                                        <div className="flex items-center gap-1.5">
                                            <span className="font-bold text-xs sm:text-sm text-white">{p.name}</span>
                                            {p.isImmune && <span title="직업적 불로불사"><ShieldCheck size={12} className="text-sky-400" /></span>}
                                            {p.isImmortal && <span title="부여된 영생"><Star size={12} className="text-amber-400" /></span>}
                                        </div>
                                        {p.forbidden && <Lock size={12} className="text-rose-500" />}
                                        {selectedTargetId === p.id && <CheckCircle size={14} className="text-amber-400"/>}
                                    </div>
                                    <div className="text-[10px] text-slate-400 mt-0.5">{p.shinryoku} • Lv.{p.level}</div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* 권능 작업 영역 */}
                    <div className="flex-1 p-4 sm:p-6 flex flex-col bg-slate-900/40 overflow-y-auto custom-scrollbar">
                        {/* 탭 버튼들 */}
                        <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 mb-4 sm:mb-5 w-full max-w-sm mx-auto shrink-0">
                            <button 
                                onClick={() => setActiveSubTab('stats')}
                                className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all min-h-[36px] ${activeSubTab === 'stats' ? 'bg-amber-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
                            >
                                신체 강화
                            </button>
                            <button 
                                onClick={() => setActiveSubTab('skill')}
                                className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all min-h-[36px] ${activeSubTab === 'skill' ? 'bg-rose-700 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
                            >
                                스킬 신격화
                            </button>
                            <button 
                                onClick={() => setActiveSubTab('immortal')}
                                className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all min-h-[36px] ${activeSubTab === 'immortal' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
                            >
                                영생 부여
                            </button>
                        </div>

                        {selectedTarget ? (
                            <div className="w-full max-w-md mx-auto space-y-4 sm:space-y-5 animate-in zoom-in-95">
                                <div className="text-center">
                                    <div className="w-14 h-14 rounded-2xl bg-amber-950/40 border border-amber-500/40 flex items-center justify-center mx-auto mb-2.5 shadow-[0_0_20px_rgba(245,158,11,0.2)]">
                                        {activeSubTab === 'stats' ? <Star size={28} className="text-amber-400" /> : activeSubTab === 'skill' ? <Zap size={28} className="text-rose-400" /> : <Infinity size={28} className="text-indigo-400" />}
                                    </div>
                                    <h3 className="text-xl sm:text-2xl font-black text-white">{selectedTarget.name}</h3>
                                    <p className="text-xs text-slate-300 mt-1 italic px-2">
                                        {activeSubTab === 'stats' 
                                            ? `"${selectedTarget.name}에게 신의 축복을 내려 한계를 돌파시킵니다."`
                                            : activeSubTab === 'skill'
                                            ? `"${selectedTarget.name}의 기술에 신의 광채를 입혀 파괴적인 위력을 부여합니다."`
                                            : `"${selectedTarget.name}에게 영원한 생명을 하사하여 세월의 굴레에서 벗어나게 합니다."`
                                        }
                                    </p>
                                </div>

                                {activeSubTab === 'stats' && (
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="bg-slate-950 p-4 rounded-2xl border border-amber-900/30 text-center">
                                            <div className="text-[10px] text-slate-400 font-bold mb-1">상승 능력치</div>
                                            <div className="text-lg font-mono font-bold text-emerald-400">+200 모든 능력치</div>
                                        </div>
                                        <div className="bg-slate-950 p-4 rounded-2xl border border-amber-900/30 text-center">
                                            <div className="text-[10px] text-slate-400 font-bold mb-1">자원 증폭</div>
                                            <div className="text-lg font-mono font-bold text-rose-400">+2,000 생명/마력</div>
                                        </div>
                                    </div>
                                )}

                                {activeSubTab === 'immortal' && (
                                    <div className="bg-slate-950 p-5 rounded-2xl border border-indigo-900/30 text-center">
                                        <HeartPulse size={28} className="text-indigo-400 mx-auto mb-2" />
                                        <div className="text-[10px] text-slate-400 font-bold mb-1">영원한 생명의 축복</div>
                                        <div className="text-sm sm:text-base font-bold text-indigo-300">노환 및 수명 고사 면역</div>
                                        {selectedTarget.isImmune || selectedTarget.isImmortal ? (
                                            <div className="mt-3 flex items-center justify-center gap-1.5 text-emerald-400 text-xs font-bold">
                                                <CheckCircle size={14}/> 이미 불로불사의 존재입니다.
                                            </div>
                                        ) : null}
                                    </div>
                                )}

                                {activeSubTab === 'skill' && (
                                    <div className="space-y-3">
                                        <h4 className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
                                            <Sword size={14} className="text-rose-400"/> 승격 가능한 기술 목록
                                        </h4>
                                        <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                                            {targetSkills.map((skill, idx) => (
                                                <button
                                                    key={idx}
                                                    onClick={() => setSelectedSkillIdx(idx)}
                                                    className={`w-full p-3 rounded-xl border text-left transition-all flex justify-between items-center ${selectedSkillIdx === idx ? 'bg-rose-950/40 border-rose-500 shadow-md text-white' : 'bg-slate-950 border-slate-800 hover:border-slate-700 text-slate-300'}`}
                                                >
                                                    <div>
                                                        <div className="font-bold text-xs sm:text-sm text-white">{skill.name}</div>
                                                        <div className="flex gap-2 mt-1">
                                                            <span className="text-[10px] bg-slate-900 text-slate-400 px-1.5 py-0.5 rounded border border-slate-800 font-bold">{skill.type}</span>
                                                            <span className="text-[10px] text-rose-400 font-mono font-bold">위력: {skill.powerRatio}%</span>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="text-[10px] text-slate-400">신격화 시</div>
                                                        <div className="text-xs font-bold text-amber-400 font-mono">x2.0배 증폭</div>
                                                    </div>
                                                </button>
                                            ))}
                                            {targetSkills.length === 0 && (
                                                <div className="py-8 text-center text-slate-500 bg-slate-950/40 border border-dashed border-slate-800 rounded-2xl">
                                                    <Lock size={24} className="mx-auto mb-1.5 opacity-40"/>
                                                    <p className="text-xs">신격화 가능한 공격형 기술이 없습니다.</p>
                                                </div>
                                            )}
                                        </div>

                                        {selectedSkillIdx !== null && apotheosisCost && (
                                            <div className="bg-slate-950 p-4 rounded-2xl border border-rose-900/30 space-y-3">
                                                <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                                                    <h5 className="text-xs font-bold text-rose-300 flex items-center gap-1.5">
                                                        <Sparkles size={14}/> 신격화 의식 정보
                                                    </h5>
                                                    <div className="text-right flex items-center gap-1">
                                                        <span className="text-[10px] text-slate-400">성공 확률:</span>
                                                        <span className="text-sm font-black text-emerald-400 font-mono">50%</span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center justify-between py-1 text-center">
                                                    <div className="flex-1">
                                                        <p className="text-[10px] text-slate-400">기존 위력</p>
                                                        <p className="text-sm sm:text-base font-bold text-slate-300">{targetSkills[selectedSkillIdx].powerRatio}%</p>
                                                    </div>
                                                    <ArrowRight size={16} className="text-slate-600" />
                                                    <div className="flex-1">
                                                        <p className="text-[10px] text-amber-400 font-bold">신격화 위력</p>
                                                        <p className="text-base sm:text-lg font-black text-amber-400">{targetSkills[selectedSkillIdx].powerRatio * 2}%</p>
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-2 gap-1.5 text-[11px] text-slate-400 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/80">
                                                    <div className="flex justify-between"><span className="text-amber-400 font-bold">골드</span> <span className={character.money >= apotheosisCost.gold ? 'text-slate-200 font-mono' : 'text-rose-400 font-mono'}>{apotheosisCost.gold.toLocaleString()}G</span></div>
                                                    <div className="flex justify-between"><span className="text-amber-400 font-bold">태초의 빛</span> <span className={primordialCount >= apotheosisCost.primordial ? 'text-slate-200 font-mono' : 'text-rose-400 font-mono'}>{apotheosisCost.primordial} / {primordialCount}</span></div>
                                                    <div className="flex justify-between"><span className="text-purple-400 font-bold">마정석</span> <span className={(character.base?.resources.manaCrystal || 0) >= apotheosisCost.mana ? 'text-slate-200 font-mono' : 'text-rose-400 font-mono'}>{apotheosisCost.mana} / {character.base?.resources.manaCrystal || 0}</span></div>
                                                    <div className="flex justify-between"><span className="text-indigo-400 font-bold">{selectedTarget.shinryoku.replace('계','')} 조각</span> <span className={(character.base?.elementalShards?.[selectedTarget.shinryoku] || 0) >= apotheosisCost.shard ? 'text-slate-200 font-mono' : 'text-rose-400 font-mono'}>{apotheosisCost.shard} / {character.base?.elementalShards?.[selectedTarget.shinryoku] || 0}</span></div>
                                                    <div className="flex justify-between col-span-2 pt-1 border-t border-slate-800"><span className="text-orange-400 font-bold">{apotheosisCost.materialName}</span> <span className={character.inventory.filter(i => i.name === apotheosisCost.materialName).length >= apotheosisCost.special ? 'text-slate-200 font-mono' : 'text-rose-400 font-mono'}>{apotheosisCost.special} / {character.inventory.filter(i => i.name === apotheosisCost.materialName).length}</span></div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* 제물 요약 카드 */}
                                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2.5">
                                    <h4 className="text-xs text-slate-400 font-bold flex items-center gap-1.5">
                                        <Package size={14} className="text-amber-400"/> {(activeSubTab === 'stats' || activeSubTab === 'immortal') ? '필요 신성 제물' : '의식 요약'}
                                    </h4>
                                    {(activeSubTab === 'stats' || activeSubTab === 'immortal') && (
                                        <div className="flex items-center justify-between p-3 bg-slate-900/70 rounded-xl border border-slate-800">
                                            <div className="flex items-center gap-2.5">
                                                <div className="p-1.5 bg-amber-950/40 rounded-lg border border-amber-500/40">
                                                    <Sparkles size={16} className="text-amber-400"/>
                                                </div>
                                                <div>
                                                    <div className="text-xs font-bold text-white">태초의 빛</div>
                                                    <div className="text-[10px] text-slate-400">신성 제물</div>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <span className={`text-base font-mono font-bold ${primordialCount >= 1 ? 'text-amber-400' : 'text-rose-400'}`}>1 / {primordialCount}</span>
                                            </div>
                                        </div>
                                    )}
                                    {activeSubTab === 'skill' && !selectedSkillIdx && (
                                        <p className="text-xs text-slate-500 text-center py-2">신격화 작업을 진행할 기술을 위 목록에서 선택하십시오.</p>
                                    )}
                                    {activeSubTab === 'skill' && selectedSkillIdx !== null && (
                                        <div className="text-[11px] text-slate-400 leading-relaxed bg-slate-900/50 p-3 rounded-xl border border-slate-800">
                                            <Info size={13} className="inline mr-1 text-rose-400"/>
                                            성공 시 기술 앞에 <strong>[신]</strong> 접두사가 붙으며 평생 단 한 번만 신격화가 가능합니다. <br/>
                                            실패 시 모든 제물이 소멸하지만 기술 자체는 보존됩니다.
                                        </div>
                                    )}
                                </div>

                                {/* 실행 버튼 */}
                                {selectedTarget.forbidden ? (
                                    <div className="bg-rose-950/20 border border-rose-500/40 p-3.5 rounded-xl flex items-center gap-2 text-rose-300 text-xs font-bold">
                                        <AlertTriangle size={16}/>
                                        <span>마계의 군세에는 신의 권능을 내릴 수 없습니다.</span>
                                    </div>
                                ) : activeSubTab === 'stats' ? (
                                    <button 
                                        onClick={handleGrantPower}
                                        disabled={isProcessing || primordialCount < 1}
                                        className="w-full py-3.5 bg-amber-600 hover:bg-amber-500 text-white font-bold text-sm rounded-xl shadow-md transition-all active:scale-98 flex items-center justify-center gap-2 disabled:opacity-30 disabled:grayscale min-h-[44px]"
                                    >
                                        {isProcessing ? <Loader2 size={18} className="animate-spin"/> : <Flame size={18} />}
                                        <span>권능 하사</span>
                                    </button>
                                ) : activeSubTab === 'skill' ? (
                                    <button 
                                        onClick={handleSkillApotheosis}
                                        disabled={isProcessing || selectedSkillIdx === null}
                                        className="w-full py-3.5 bg-rose-700 hover:bg-rose-600 text-white font-bold text-sm rounded-xl shadow-md transition-all active:scale-98 flex items-center justify-center gap-2 disabled:opacity-30 disabled:grayscale min-h-[44px]"
                                    >
                                        {isProcessing ? <Loader2 size={18} className="animate-spin"/> : <Zap size={18} />}
                                        <span>기술 신격화 수행</span>
                                    </button>
                                ) : (
                                    <button 
                                        onClick={handleGrantImmortality}
                                        disabled={isProcessing || primordialCount < 1 || selectedTarget.isImmune || selectedTarget.isImmortal}
                                        className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm rounded-xl shadow-md transition-all active:scale-98 flex items-center justify-center gap-2 disabled:opacity-30 disabled:grayscale min-h-[44px]"
                                    >
                                        {isProcessing ? <Loader2 size={18} className="animate-spin"/> : <Sparkles size={18} />}
                                        <span>영생 부여</span>
                                    </button>
                                )}
                            </div>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-slate-500 py-12">
                                <Sparkles size={48} className="mb-2 opacity-30 text-amber-400" />
                                <p className="text-xs">좌측 목록에서 권능을 받을 대상을 선택하십시오.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* 하단 바 */}
                <div className="p-3 bg-slate-950 border-t border-slate-800 text-center shrink-0">
                    <div className="flex justify-center items-center gap-4 text-xs font-bold text-slate-400">
                        <div className="flex items-center gap-1 text-amber-300 font-mono"><Coins size={13} className="text-amber-500"/> {character.money.toLocaleString()} G</div>
                        <div className="flex items-center gap-1 text-purple-300 font-mono"><Zap size={13} className="text-purple-400"/> 마정석: {character.base?.resources.manaCrystal || 0}</div>
                        <div className="flex items-center gap-1 text-amber-400 font-mono"><Sparkles size={13}/> 태초의 빛: {primordialCount}개</div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GodPowerModal;
