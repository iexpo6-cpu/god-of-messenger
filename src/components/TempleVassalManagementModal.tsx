
import React, { useState } from 'react';
import { Character, DivineDiplomacyStatus, DivineRelation, JobType, Companion, ClassTier, ItemRarity } from '../types';
import { X, Gavel, Coins, Zap, Package, Skull, AlertTriangle, Flame, UserMinus, ShieldAlert, Loader2, Sparkles, Crown, Link, Lock, UserPlus } from 'lucide-react';
import ActionResultModal, { ResultData } from './ActionResultModal';
import { getYear, generateName, generateCompanionStats, getTierByLevel, assignRandomCombatStyle } from '../utils';
import { SHINRYOKU_TYPES_LIST, HUMANOID_CLASSES } from '../constants';

interface Props {
    character: Character;
    targetNation: string;
    onClose: () => void;
    onUpdateCharacter: (newChar: Character, logMsg: string) => void;
}

const TempleVassalManagementModal: React.FC<Props> = ({ character, targetNation, onClose, onUpdateCharacter }) => {
    const [resultData, setResultData] = useState<ResultData | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    const rel = character.templeDiplomacy?.[targetNation];
    if (!rel || rel.status !== DivineDiplomacyStatus.SUBJUGATED) return null;

    const currentYear = getYear(character.currentDate || '2000-01-01');
    
    // 수거 가능 여부 체크 (1년에 한 번)
    const canPlunder = rel.lastPlunderYear !== currentYear;
    const canEnslave = rel.lastEnslaveYear !== currentYear;

    const plunderFaithCost = 20000;
    const enslaveFaithCost = 30000;

    // 수탈 예상 보상 계산
    const getPlunderRewards = () => {
        const lv = character.level;
        return {
            gold: lv * 500,
            manaCrystal: Math.floor(lv / 2) + 50,
            iron: lv * 20,
            wood: lv * 20
        };
    };

    const handlePlunder = () => {
        const currentFaith = character.faith || 0;
        if (currentFaith < plunderFaithCost) {
            alert(`신앙심이 부족합니다. (필요: ${plunderFaithCost.toLocaleString()})`);
            return;
        }

        setIsProcessing(true);
        setTimeout(() => {
            const rewards = getPlunderRewards();
            const newChar = JSON.parse(JSON.stringify(character)) as Character;
            
            // 자원 추가
            newChar.money += rewards.gold;
            if (newChar.base) {
                newChar.base.resources.manaCrystal += rewards.manaCrystal;
                newChar.base.resources.iron += rewards.iron;
                newChar.base.resources.wood += rewards.wood;
            }
            
            // 신앙심 소모 및 기록
            newChar.faith = currentFaith - plunderFaithCost;
            newChar.templeDiplomacy![targetNation].lastPlunderYear = currentYear;
            newChar.infamy = (newChar.infamy || 0) + 50; // 수탈로 인한 악명 상승

            onUpdateCharacter(newChar, `[신성 수탈] ${targetNation}의 모든 국고를 비웠습니다. 대량의 자원을 성전으로 운송했습니다.`);
            setResultData({
                type: 'success',
                title: '대규모 수탈 완료',
                message: `${targetNation}의 비명 섞인 자원들이 성전의 제단에 쌓였습니다.`,
                items: [
                    { label: '획득 골드', after: `${rewards.gold.toLocaleString()} G` },
                    { label: '획득 마정석', after: `+${rewards.manaCrystal}` },
                    { label: '악명 상승', after: '+50' }
                ]
            });
            setIsProcessing(false);
        }, 1500);
    };

    const handleEnslaveTalent = () => {
        const currentFaith = character.faith || 0;
        if (currentFaith < enslaveFaithCost) {
            alert(`신앙심이 부족합니다. (필요: ${enslaveFaithCost.toLocaleString()})`);
            return;
        }

        if (character.companions.length >= 5 && (character.inactiveCompanions?.length || 0) >= 100) {
            alert("영입 가능한 동료 슬롯이 없습니다.");
            return;
        }

        setIsProcessing(true);
        setTimeout(() => {
            const newChar = JSON.parse(JSON.stringify(character)) as Character;
            const MBTI_OPTIONS = [
    "ISTJ (신중하고 성실함)",
    "ISFJ (용감하고 온화함)",
    "INFJ (통찰력 있고 신비함)",
    "INTJ (용의주도한 전략가)",
    "ISTP (만능 재주꾼)",
    "ISFP (호기심 많은 예술가)",
    "INFP (열정적인 중재자)",
    "INTP (논리적인 사색가)",
    "ESTP (모험을 즐기는 사업가)",
    "ESFP (자유로운 영혼)",
    "ENFP (재기발랄한 활동가)",
    "ENTP (뜨거운 논쟁을 즐김)",
    "ESTJ (엄격한 관리자)",
    "ESFJ (사교적인 외교관)",
    "ENFJ (정의로운 사회운동가)",
    "ENTJ (대담한 통솔자)"
];
            // 인재 생성
            const targetLevel = 200 + Math.floor(Math.random() * 10);
            const randomType = SHINRYOKU_TYPES_LIST[Math.floor(Math.random() * SHINRYOKU_TYPES_LIST.length)];
            const className = (HUMANOID_CLASSES[randomType] || ["전설적 기사"])[0];
            const gender = Math.random() < 0.5 ? "남성" : "여성";
            const name = generateName(targetNation, gender === "남성" ? "male" : "female");
             const ageNum = 20 + Math.floor(Math.random() * 40);
                const currentYear = getYear(character.currentDate || '2000-01-01');
            const slave: Companion = {
                id: `enslaved_${Date.now()}`,
                name: name,
                age: `${ageNum}세`,
                birthYear: currentYear - ageNum,
                gender: gender,
                race: "인간",
                appearance: `${targetNation}의 촉망받던 ${className}였으나, 지금은 신의 권능 아래 무릎 꿇었습니다.`,
                personality: MBTI_OPTIONS[Math.floor(Math.random() * MBTI_OPTIONS.length)],
                classType: `(${className})`,
                nation: targetNation,
                job: JobType.SLAVE,
                level: targetLevel,
                currentExp: 0,
                maxExp: targetLevel * 100,
                statPoints: 0,
                classTier: ClassTier.LAST,
                shinryokuType: randomType,
                stats: generateCompanionStats(targetLevel),
                skills: [],
                equipment: {},
                inventory: [],
                affection: -50,
                loyalty: 10
            };

            const preppedSlave = assignRandomCombatStyle(slave, true, true);
            if (newChar.companions.length < 5) newChar.companions.push(preppedSlave);
            else {
                if (!newChar.inactiveCompanions) newChar.inactiveCompanions = [];
                newChar.inactiveCompanions.push(preppedSlave);
            }

            newChar.faith = currentFaith - enslaveFaithCost;
            newChar.templeDiplomacy![targetNation].lastEnslaveYear = currentYear;
            newChar.infamy = (newChar.infamy || 0) + 100;

            onUpdateCharacter(newChar, `[인재 강탈] ${targetNation}의 핵심 전력인 ${name}을(를) 노예로 길들여 영입했습니다.`);
            setResultData({
                type: 'levelup',
                title: '국가 인재 노예화',
                message: `${targetNation}의 자부심이었던 자가 이제 당신의 발치를 핥는 노예가 되었습니다.`,
                items: [
                    { label: '영입 인원', after: slave.name },
                    { label: '레벨', after: `Lv.${targetLevel}` },
                    { label: '악명 상승', after: '+100' }
                ]
            });
            setIsProcessing(false);
        }, 2000);
    };

    return (
        <div className="fixed inset-0 z-[160] flex items-center justify-center bg-black/95 p-3 sm:p-4 animate-in fade-in">
            {resultData && <ActionResultModal data={resultData} onClose={() => setResultData(null)} />}

            <div className="bg-slate-900 border border-rose-600/50 w-full max-w-md max-h-[92vh] rounded-3xl shadow-[0_0_60px_rgba(225,29,72,0.25)] flex flex-col overflow-hidden relative">
                {/* 헤더 */}
                <div className="p-4 sm:p-5 border-b border-rose-900/40 bg-rose-950/20 flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-2.5">
                        <Skull className="text-rose-500" size={24} />
                        <div>
                            <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">속국 복종 관리</h2>
                            <p className="text-[11px] text-rose-400/80 font-medium">성전의 무력에 굴복한 속령</p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose} 
                        className="p-2 text-slate-400 hover:text-white rounded-full hover:bg-slate-800 transition-colors"
                    >
                        <X size={20}/>
                    </button>
                </div>

                {/* 본문 */}
                <div className="p-4 sm:p-6 space-y-5 sm:space-y-6 flex-1 overflow-y-auto custom-scrollbar overscroll-contain">
                    {/* 영지 명칭 */}
                    <div className="text-center bg-slate-950/60 p-4 rounded-2xl border border-slate-800">
                        <span className="text-[11px] text-slate-400 font-bold tracking-wider block mb-0.5">속국 영지</span>
                        <h3 className="text-2xl font-black text-white mb-1">{targetNation}</h3>
                        <p className="text-xs font-medium text-rose-400 flex items-center justify-center gap-1.5">
                            <Link size={13}/> 성역의 사슬에 묶인 복종의 땅 <Link size={13}/>
                        </p>
                    </div>

                    {/* 신성 수탈 카드 */}
                    <div className="bg-slate-950 p-4 sm:p-5 rounded-2xl border border-rose-900/30 space-y-3.5 relative overflow-hidden">
                        <div className="flex justify-between items-center">
                            <h4 className="text-xs font-bold text-amber-400 tracking-wide flex items-center gap-1.5">
                                <Gavel size={16}/> 신성 수탈
                            </h4>
                            <span className="text-[10px] text-slate-500 font-mono">{currentYear}년도</span>
                        </div>
                        
                        <p className="text-xs text-slate-400 leading-relaxed">
                            국가의 모든 가용 자원을 신의 이름으로 강탈합니다.<br/>
                            막대한 골드와 마정석, 자재를 즉시 확보합니다.
                        </p>

                        <button 
                            onClick={handlePlunder}
                            disabled={!canPlunder || isProcessing}
                            className={`w-full py-3.5 rounded-xl font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 min-h-[44px] ${canPlunder ? 'bg-amber-600 hover:bg-amber-500 text-white active:scale-98' : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'}`}
                        >
                            <Coins size={16}/> {canPlunder ? `자원 수탈 (신앙심 ${plunderFaithCost.toLocaleString()} 소모)` : "올해 수탈 완료"}
                        </button>
                    </div>

                    {/* 인재 노예화 카드 */}
                    <div className="bg-slate-950 p-4 sm:p-5 rounded-2xl border border-rose-900/30 space-y-3.5 relative overflow-hidden">
                        <div className="flex justify-between items-center">
                            <h4 className="text-xs font-bold text-rose-400 tracking-wide flex items-center gap-1.5">
                                <Link size={16}/> 인재 노예화
                            </h4>
                            <span className="text-[10px] text-slate-500 font-mono">{currentYear}년도</span>
                        </div>
                        
                        <p className="text-xs text-slate-400 leading-relaxed">
                            국가의 상징적인 강자를 정신적으로 굴복시킵니다.<br/>
                            <span className="text-rose-400 font-medium">Lv.{character.level + 20}+</span>의 강력한 노예 동료를 획득합니다.
                        </p>

                        <button 
                            onClick={handleEnslaveTalent}
                            disabled={!canEnslave || isProcessing}
                            className={`w-full py-3.5 rounded-xl font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 min-h-[44px] ${canEnslave ? 'bg-rose-700 hover:bg-rose-600 text-white active:scale-98' : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'}`}
                        >
                            <UserPlus size={16}/> {canEnslave ? `인재 강탈 (신앙심 ${enslaveFaithCost.toLocaleString()} 소모)` : "올해 영입 완료"}
                        </button>
                    </div>

                    {/* 주의 안내 */}
                    <div className="bg-rose-950/20 p-3.5 rounded-xl border border-rose-900/30 flex gap-2.5 items-start">
                        <AlertTriangle size={16} className="text-rose-400 shrink-0 mt-0.5"/>
                        <div className="text-[11px] text-slate-400 space-y-1 leading-relaxed">
                            <p>• 수탈 및 노예화 명령은 <span className="text-rose-400 font-medium">대량의 신앙심</span>을 소모합니다.</p>
                            <p>• 모든 행위는 <span className="text-rose-400 font-medium">악명도</span>를 상승시키며, 주변 국가의 경계심을 부릅니다.</p>
                            <p>• 각 명령은 성역 시간 기준 1년에 단 한 번씩만 집행 가능합니다.</p>
                        </div>
                    </div>
                </div>

                {/* 하단 바 */}
                <div className="p-3.5 sm:p-4 bg-slate-950 border-t border-slate-800 flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-2 text-xs font-bold text-pink-400">
                        <Flame size={14} className="text-pink-500"/> 보유 신앙심: {(character.faith || 0).toLocaleString()}
                    </div>
                    <button 
                        onClick={onClose} 
                        className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold text-xs transition-colors min-h-[36px]"
                    >
                        닫기
                    </button>
                </div>

                {isProcessing && (
                    <div className="absolute inset-0 bg-black/85 z-[170] flex flex-col items-center justify-center">
                        <Loader2 size={40} className="animate-spin text-rose-500 mb-3" />
                        <p className="text-white font-bold text-sm tracking-wide animate-pulse">사슬을 채우는 중...</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TempleVassalManagementModal;
