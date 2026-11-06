
import React, { useState, useEffect } from 'react';
import { Character, Companion, MercenaryRank, Quest, GroupMission, ClassTier, JobType } from '../types';
import { X, Crown, Users, ScrollText, Send, CheckCircle, Shield, Sword, Coins, AlertTriangle, UserCheck, Package, Clock, LogOut, Lock, UserPlus, RefreshCw, Loader2, Calendar, Search, Skull, PlusCircle, Dumbbell, TowerControl } from 'lucide-react';
import { addDays, generateName, generateCompanionStats, generateLevelByRank, getTierByLevel, generateDefaultVisualUrl, assignRandomCombatStyle, calculateTotalHousingCapacity } from '../utils';
import { NATION_THEMES, HUNT_LEVEL_BANDS } from '../monsterfield';
import { WORLD_LOOT_TABLES } from '../monsterLootTable';
import ActionResultModal, { ResultData } from './ActionResultModal';
import MercenaryTrainingModal from './MercenaryTrainingModal'; // [ADDED]
import { QUEST_RANK_INDEX, QUEST_DANGER_INDEX, SHINRYOKU_TYPES_LIST, MERCENARY_RANK_SCORE, COMBAT_STYLE_CONFIG } from '../constants';

interface Props {
    character: Character;
    onClose: () => void;
    onUpdateCharacter: (newChar: Character, logMsg: string) => void;
}

type Tab = 'manage' | 'dispatch' | 'recruit';

const RANK_ORDER: MercenaryRank[] = [
    MercenaryRank.F, MercenaryRank.E, MercenaryRank.D, MercenaryRank.C, 
    MercenaryRank.B, MercenaryRank.A, MercenaryRank.S, MercenaryRank.SS, MercenaryRank.SSS
];

const MercenaryGroupModal: React.FC<Props> = ({ character, onClose, onUpdateCharacter }) => {
    const [activeTab, setActiveTab] = useState<Tab>('manage');
    const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
    const [groupNameInput, setGroupNameInput] = useState('');
    const [resultData, setResultData] = useState<ResultData | null>(null);
    
    // Training Modal State
    const [isTrainingModalOpen, setIsTrainingModalOpen] = useState(false); // [ADDED]

    // Recruitment State
    const [recruits, setRecruits] = useState<Companion[]>([]);
    const [isRecruitLoading, setIsRecruitLoading] = useState(false);
    
    // Dispatch State (Multiple Selection)
    const [dispatchMemberIds, setDispatchMemberIds] = useState<string[]>([]);
    const [dispatchQuestId, setDispatchQuestId] = useState<string | null>(null);

    const mData = character.mercenaryData;
    const isOwner = mData?.isGroupLeader || false;
    const currentGroupMembers = mData?.groupMembers || [];
    const activeMissions = mData?.groupMissions || [];
    const availableQuests = mData?.availableQuests || [];
    const currentRank = mData?.rank || 'F';
    
    // Only Mercenaries can be selected for Group creation/management
    const allPotentialMercenaries = [...character.companions, ...(character.inactiveCompanions || [])]
        .filter(c => !c.isDead && !c.classType.includes('자녀') && c.job === JobType.MERCENARY);

    const canCreate = MERCENARY_RANK_SCORE[currentRank as keyof typeof MERCENARY_RANK_SCORE] >= 20; // S rank or higher

    const handleRefreshRecruits = async () => {
        if (character.money < 10000) {
            alert("골드가 부족합니다. (10,000 G 필요)");
            return;
        }
        const newChar = { ...character, money: character.money - 10000 };
        onUpdateCharacter(newChar, `[용병단] 신입 모집 공고를 냈습니다. (-10,000 G)`);
        await generateGroupRecruits();
    };

    const generateGroupRecruits = async () => {
        setIsRecruitLoading(true);
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
        const newRecruits: Companion[] = [];
        
        for (let i = 0; i < 4; i++) {
            const rankIdx = Math.max(0, RANK_ORDER.indexOf(currentRank as MercenaryRank) - 1);
            const rank = RANK_ORDER[Math.min(RANK_ORDER.length - 1, rankIdx + Math.floor(Math.random() * 3))];
            
            const gender = Math.random() < 0.5 ? '남성' : '여성';
            const name = generateName(character.currentLocation?.nation || character.nation, gender === '남성' ? 'male' : 'female');
            const level = generateLevelByRank(rank);
            const tier = getTierByLevel(level);
            
            newRecruits.push(assignRandomCombatStyle({
                id: `group_merc_${Math.random().toString(36).substring(7)}`,
                name,
                age: `${20 + Math.floor(Math.random()*10)}세`,
                gender: gender,
                race: character.race,
                appearance: "용병단 합류를 희망하는 노련한 용병",
                personality: MBTI_OPTIONS[Math.floor(Math.random() * MBTI_OPTIONS.length)],
                classType: "용병단원",
                job: JobType.MERCENARY,
                level: level,
                currentExp: 0, maxExp: level * 100, statPoints: 0, classTier: tier,
                shinryokuType: tier !== ClassTier.NONE ? SHINRYOKU_TYPES_LIST[Math.floor(Math.random()*SHINRYOKU_TYPES_LIST.length)] : undefined,
                stats: generateCompanionStats(level),
                skills: [], equipment: {}, inventory: [], affection: 40, loyalty: 60, mercenaryRank: rank
            }, true, true));
        }

        setRecruits(newRecruits.map(r => assignRandomCombatStyle(r, true, true)));
        setIsRecruitLoading(false);
    };

    const toggleMemberSelection = (id: string) => {
        if (selectedMemberIds.includes(id)) {
            setSelectedMemberIds(prev => prev.filter(mid => mid !== id));
        } else {
            setSelectedMemberIds(prev => [...prev, id]);
        }
    };

    const toggleDispatchMemberSelection = (id: string) => {
        if (dispatchMemberIds.includes(id)) {
            setDispatchMemberIds(prev => prev.filter(mid => mid !== id));
        } else {
            if (dispatchMemberIds.length < 3) {
                setDispatchMemberIds(prev => [...prev, id]);
            }
        }
    };

    const calculateDispatchMetrics = () => {
        if (dispatchMemberIds.length === 0 || !dispatchQuestId) return null;
        
        const quest = availableQuests.find(q => q.id === dispatchQuestId);
        const members = allPotentialMercenaries.filter(c => dispatchMemberIds.includes(c.id));
        if (!quest || members.length === 0) return null;

        const questScore = MERCENARY_RANK_SCORE[quest.rank] || 1;
        const rankScores = members.map(m => MERCENARY_RANK_SCORE[m.mercenaryRank!] || 1);
        const maxMercScore = Math.max(...rankScores);
        const totalLevel = members.reduce((sum, m) => sum + m.level, 0);
        
        const rate = 30 + (maxMercScore - questScore) + members.length + (totalLevel * 0.05);
        const finalRate = Math.min(100, Math.max(0, Math.floor(rate)));

        const dangerMult = quest.danger === 'Extreme' ? 4 : quest.danger === 'High' ? 3 : quest.danger === 'Mid' ? 2 : 1;
        let baseDays = (questScore * dangerMult) + 7;
        baseDays = Math.min(90, baseDays); 

        const memberBonus = [1, 0.8, 0.6][members.length - 1]; 
        const finalDays = Math.max(1, Math.floor(baseDays * memberBonus));

        return { success: finalRate, days: finalDays };
    };

    const handleCreateGroup = () => {
        if (selectedMemberIds.length < 5) {
            alert("용병단 창설에는 최소 5명의 '용병' 직업 단원이 필요합니다.");
            return;
        }
        if (!groupNameInput.trim()) {
            alert("용병단 이름을 입력해주세요.");
            return;
        }

        const cost = 50000 + (selectedMemberIds.length * 10000);
        if (character.money < cost) {
            alert(`자금이 부족합니다. (필요: ${cost.toLocaleString()} G)`);
            return;
        }

        const newChar = { ...character };
        newChar.money -= cost;
        newChar.mercenaryData = {
            ...newChar.mercenaryData!,
            isGroupLeader: true,
            groupName: groupNameInput.trim(),
            groupMembers: selectedMemberIds,
            groupMissions: []
        };

        const selectedInParty = newChar.companions.filter(c => selectedMemberIds.includes(c.id));
        if (selectedInParty.length > 0) {
            newChar.companions = newChar.companions.filter(c => !selectedMemberIds.includes(c.id));
            if (!newChar.inactiveCompanions) newChar.inactiveCompanions = [];
            newChar.inactiveCompanions = [...newChar.inactiveCompanions, ...selectedInParty];
        }

        onUpdateCharacter(newChar, `[용병단] '${groupNameInput}' 용병단을 창설했습니다! (단원 ${selectedMemberIds.length}명)`);
        setResultData({
            type: 'success',
            title: '용병단 창설 성공',
            message: `이제 '${groupNameInput}'의 단장으로서 명성을 떨칠 시간입니다.\n창립 단원들은 기지(대기)로 이동되었습니다.`,
            items: [
                { label: '용병단 이름', after: groupNameInput },
                { label: '초기 단원', after: `${selectedMemberIds.length}명` }
            ]
        });
    };

    const handleAddExistingMember = (companionId: string) => {
        if (!mData) return;
        const newChar = { ...character };
        const members = mData.groupMembers || [];
        
        if (members.includes(companionId)) return;
        
        newChar.mercenaryData = {
            ...newChar.mercenaryData!,
            groupMembers: [...members, companionId]
        };
        
        const comp = allPotentialMercenaries.find(c => c.id === companionId);
        onUpdateCharacter(newChar, `[용병단] 기존 동료 '${comp?.name}'을(를) 단원으로 등록했습니다.`);
        setResultData({
            type: 'success',
            title: '단원 등록 완료',
            message: `'${comp?.name}' 용병을 우리 용병단 명단에 올렸습니다.`,
            items: [{ label: '대상', after: comp?.name || '동료' }]
        });
    };

    const handleDispatch = () => {
        const metrics = calculateDispatchMetrics();
        if (!metrics || dispatchMemberIds.length === 0 || !dispatchQuestId) return;

        const quest = availableQuests.find(q => q.id === dispatchQuestId)!;
        const returnDate = addDays(character.currentDate || '2000-01-01', metrics.days);
        
        const newMission: GroupMission = {
            id: Math.random().toString(36).substring(7),
            questId: quest.id,
            memberIds: dispatchMemberIds,
            startTime: character.currentDate!,
            returnDate: returnDate,
            rewardGold: quest.rewardGold,
            rewardExp: quest.rewardExp,
            title: quest.title,
            successRate: metrics.success
        };

        const newChar = { ...character };
        if (!newChar.mercenaryData!.groupMissions) newChar.mercenaryData!.groupMissions = [];
        newChar.mercenaryData!.groupMissions.push(newMission);
        newChar.mercenaryData!.availableQuests = availableQuests.filter(q => q.id !== quest.id);

        const dispatchedInParty = newChar.companions.filter(c => dispatchMemberIds.includes(c.id));
        if (dispatchedInParty.length > 0) {
            newChar.companions = newChar.companions.filter(c => !dispatchMemberIds.includes(c.id));
            if (!newChar.inactiveCompanions) newChar.inactiveCompanions = [];
            newChar.inactiveCompanions = [...newChar.inactiveCompanions, ...dispatchedInParty];
        }

        if (newChar.base) {
            const baseCopy = { ...newChar.base };
            if (!baseCopy.assignments) baseCopy.assignments = {};
            else baseCopy.assignments = { ...baseCopy.assignments };
            
            dispatchMemberIds.forEach(mid => {
                baseCopy.assignments[`dispatch_group_${newMission.id}_${mid}`] = mid;
            });
            newChar.base = baseCopy;
        }

        onUpdateCharacter(newChar, `[용병단 파견] ${dispatchMemberIds.length}명의 단원을 '${quest.title}'에 파견했습니다. (성공률 ${metrics.success}%)`);
        setDispatchMemberIds([]);
        setDispatchQuestId(null);
        
        setResultData({
            type: 'info',
            title: '분대 파견 완료',
            message: `단원들이 의뢰 수행을 위해 떠났습니다. 파견된 단원들은 복귀 전까지 파티에 합류할 수 없습니다.`,
            items: [
                { label: '파견 인원', after: `${dispatchMemberIds.length}명` },
                { label: '예상 성공률', after: `${metrics.success}%` },
                { label: '복귀 예정', after: returnDate }
            ]
        });
    };

    const handleCompleteMission = (mission: GroupMission) => {
        const newChar = { ...character };
        
        const successRate = mission.successRate || 50;
        const roll = Math.random() * 100;
        const isSuccess = roll < successRate;
        const isGreat = isSuccess && roll < (successRate * 0.2); 

        let goldMult = 1.0;
        let expMult = 1.0;
        let repMult = 1.0;
        let outcomeTitle = "의뢰 완료 보고";
        let outcomeMsg = "단원들이 임무를 마치고 무사히 복귀했습니다.";
        let resultType: ResultData['type'] = 'success';

        const casualties: Companion[] = [];

        if (isGreat) {
            goldMult = 1.2; expMult = 1.2; repMult = 2.0;
            outcomeTitle = "의뢰 대성공!";
            outcomeMsg = "단원들이 기대 이상의 뛰어난 성과를 거두며 복귀했습니다!";
        } else if (!isSuccess) {
            goldMult = 0; expMult = 0; repMult = 0;
            outcomeTitle = "의뢰 실패...";
            outcomeMsg = "단원들이 임무 수행 중 강력한 적을 만나 성과를 거두지 못했습니다.";
            resultType = 'failure';

            mission.memberIds.forEach(mid => {
                if (Math.random() < 0.1) {
                    const comp = [...newChar.companions, ...(newChar.inactiveCompanions || [])].find(c => c.id === mid);
                    if (comp) casualties.push(comp);
                }
            });
        }

        const finalGold = Math.floor(mission.rewardGold * goldMult);
        const finalExp = Math.floor(mission.rewardExp * expMult);
        const finalRep = 5 * mission.memberIds.length * repMult;

        newChar.money += finalGold;
        const playerExpGain = Math.floor(finalExp * 0.3);
        newChar.currentExp += playerExpGain; 
        
        const allComps = [...newChar.companions, ...(newChar.inactiveCompanions || [])];
        const perMemberExp = Math.floor(finalExp / mission.memberIds.length);

        mission.memberIds.forEach(mid => {
            const member = allComps.find(c => c.id === mid);
            if (member && !casualties.some(c => c.id === member.id)) {
                member.currentExp += perMemberExp;
                member.reputation = (member.reputation || 0) + finalRep;
            }
        });

        if (casualties.length > 0) {
            const casualtyIds = casualties.map(c => c.id);
            newChar.companions = newChar.companions.filter(c => !casualtyIds.includes(c.id));
            if (newChar.inactiveCompanions) {
                newChar.inactiveCompanions = newChar.inactiveCompanions.filter(c => !casualtyIds.includes(c.id));
            }
              // [MODIFIED] 전사 시 사회적 관계망에 고인으로 등록
            if (!newChar.socialNetwork) newChar.socialNetwork = [];
            
            casualties.forEach(comp => {
                const bond: any = assignRandomCombatStyle({
                    id: comp.id,
                    name: comp.name,
                    age: comp.age,
                    birthYear: comp.birthYear,
                    gender: comp.gender,
                    nation: comp.nation || 'Unknown',
                    level: comp.level,
                    race: comp.race,
                    personality: comp.personality || "평범함",
                    appearance: comp.appearance,
                    classType: comp.classType || "용병",
                    stats: { ...comp.stats },
                    affection: comp.affection,
                    job: comp.job || JobType.MERCENARY,
                    origin: "MercenaryGroup",
                    isPurged: true,
                    purgedReason: "용병단 임무 중 전사",
                    combatStyle: comp.combatStyle
                }, false);
                newChar.socialNetwork!.push(bond);
            });

            if (newChar.mercenaryData) {
                newChar.mercenaryData.groupMembers = newChar.mercenaryData.groupMembers?.filter(mid => !casualtyIds.includes(mid));
            }
            outcomeMsg += `\n\n[비보] 임무 중 안타깝게도 ${casualties.map(c => c.name).join(', ')} 단원이 전사했습니다.`;
            resultType = 'destroy';
        }

        newChar.mercenaryData = {
            ...newChar.mercenaryData!,
            groupMissions: activeMissions.filter(m => m.id !== mission.id),
            completedQuests: (newChar.mercenaryData?.completedQuests || 0) + (isSuccess ? 1 : 0),
            reputation: (newChar.mercenaryData?.reputation || 0) + finalRep
        };

        if (newChar.base && newChar.base.assignments) {
            const baseCopy = { ...newChar.base };
            baseCopy.assignments = { ...baseCopy.assignments };
            mission.memberIds.forEach(mid => {
                delete baseCopy.assignments[`dispatch_group_${mission.id}_${mid}`];
            });
            newChar.base = baseCopy;
        }

        const logMsg = `[용병단 보고] ${mission.title} 결과: ${isGreat ? '대성공' : isSuccess ? '성공' : '실패'}! (골드 +${finalGold}, 명성 +${finalRep})${casualties.length > 0 ? ` [사망자: ${casualties.join(',')}]` : ''}`;
        onUpdateCharacter(newChar, logMsg);
        
        setResultData({
            type: resultType,
            title: outcomeTitle,
            message: outcomeMsg,
            items: [
                { label: '획득 골드', after: `${finalGold.toLocaleString()} G` },
                { label: '단원 획득 경험치', after: `${perMemberExp.toLocaleString()} EXP (인당)` },
                { label: '나의 획득 경험치', after: `${playerExpGain.toLocaleString()} EXP` },
                { label: '용병단 명성', after: `+${finalRep}` },
                ...(casualties.length > 0 ? [{ label: '사망자', after: casualties.map(c => c.name).join(', ') }] : [])
            ]
        });
    };

    const handleHireMember = (merc: Companion) => {
        const hireCost = (RANK_ORDER.indexOf(merc.mercenaryRank!) + 1) * 15000;
        
        const housingCapacity = calculateTotalHousingCapacity(character.base, character.inactiveCompanions || []);
        const currentResidents = character.inactiveCompanions?.length || 0;

        if (character.base && currentResidents >= housingCapacity) {
            alert(`기지(숙소) 정원이 꽉 찼습니다. (최대 ${housingCapacity}명)`);
            return;
        }

        if (character.money < hireCost) {
            setResultData({
                type: 'warning',
                title: '자금 부족',
                message: '단원 영입을 위한 자금이 부족합니다.',
                items: [{ label: '필요 골드', after: `${hireCost.toLocaleString()} G` }]
            });
            return;
        }

        const newChar = { ...character };
        newChar.money -= hireCost;
        
        const preppedMerc = assignRandomCombatStyle(merc, true, true);
        if (!newChar.inactiveCompanions) newChar.inactiveCompanions = [];
        newChar.inactiveCompanions = [...newChar.inactiveCompanions, preppedMerc];

        if (newChar.mercenaryData) {
            const members = newChar.mercenaryData.groupMembers || [];
            newChar.mercenaryData.groupMembers = [...members, merc.id];
        }

        setRecruits(prev => prev.filter(r => r.id !== merc.id));
        
        onUpdateCharacter(newChar, `[용병단] 신입 단원 '${merc.name}'을(를) 영입했습니다. (-${hireCost.toLocaleString()} G)`);
        
        setResultData({
            type: 'success',
            title: '단원 영입 성공',
            message: `${merc.name} 용병이 '${mData?.groupName}'의 새로운 단원이 되었습니다.`,
            items: [{ label: '소모 자금', after: `${hireCost.toLocaleString()} G` }]
        });
    };

    const metrics = calculateDispatchMetrics();

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-in fade-in">
            {resultData && <ActionResultModal data={resultData} onClose={() => setResultData(null)} />}
            
            {/* [ADDED] Training Modal */}
            {isTrainingModalOpen && <MercenaryTrainingModal character={character} onClose={() => setIsTrainingModalOpen(false)} onUpdateCharacter={onUpdateCharacter} />}

            <div className="bg-slate-900 border border-red-500/50 w-full max-w-4xl h-[85vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden relative">
                <div className="p-4 sm:p-6 border-b border-rose-950/40 bg-gradient-to-r from-rose-950/40 via-slate-900 to-amber-950/30 flex justify-between items-center shrink-0">
                    <div className="flex items-center">
                        <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 mr-3 sm:mr-4">
                            <Crown size={26} className="text-amber-400" />
                        </div>
                        <div>
                            <h2 className="text-lg sm:text-2xl font-bold text-white tracking-tight">
                                {isOwner ? `${mData?.groupName}` : "용병단 창설"}
                            </h2>
                            <p className="text-xs text-slate-400 mt-0.5">
                                {isOwner ? `${currentGroupMembers.length}명의 정예 단원을 보유 중` : "S등급 이상의 용병만 용병단을 창설할 수 있습니다."}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {!isOwner ? (
                    <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-900 custom-scrollbar flex flex-col">
                        {!canCreate ? (
                            <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4 py-12">
                                <div className="p-4 rounded-2xl bg-rose-950/30 border border-rose-900/30 mb-2">
                                    <Lock size={48} className="text-rose-500/70" />
                                </div>
                                <h3 className="text-lg sm:text-xl font-bold text-rose-400">창설 자격 부족</h3>
                                <p className="text-slate-300 text-sm">용병단 창설은 용병 등급 <span className="text-amber-400 font-bold">S등급 이상</span>만 가능합니다.</p>
                                <p className="text-xs text-slate-500 mt-1">현재 등급: {currentRank}등급</p>
                            </div>
                        ) : (
                            <div className="max-w-2xl mx-auto w-full space-y-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-amber-400 tracking-wider block">용병단 명칭</label>
                                    <input 
                                        type="text" 
                                        value={groupNameInput}
                                        onChange={(e) => setGroupNameInput(e.target.value)}
                                        className="w-full bg-slate-950 border border-slate-700/80 rounded-xl p-3.5 text-white text-base sm:text-lg font-bold focus:border-amber-500 outline-none transition-colors"
                                        placeholder="용병단의 이름을 입력하세요"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <div className="flex justify-between items-center">
                                        <label className="text-xs font-bold text-slate-300 tracking-wider block">창립 단원 (용병 직업 필수, 최소 5명)</label>
                                        <span className={`text-xs font-bold ${selectedMemberIds.length >= 5 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                            선택됨: {selectedMemberIds.length}명
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-60 overflow-y-auto custom-scrollbar p-2.5 bg-slate-950 rounded-xl border border-slate-800">
                                        {allPotentialMercenaries.map(comp => {
                                            const isSelected = selectedMemberIds.includes(comp.id);
                                            return (
                                                <button
                                                    key={comp.id}
                                                    onClick={() => toggleMemberSelection(comp.id)}
                                                    className={`p-3 rounded-lg border text-left flex justify-between items-center transition-all ${isSelected ? 'bg-amber-950/30 border-amber-500 text-white' : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'}`}
                                                >
                                                    <div>
                                                        <div className="font-bold text-xs sm:text-sm text-slate-200">{comp.name} {character.companions.some(pc => pc.id === comp.id) && <span className="text-[10px] text-amber-400 font-normal">(파티 중)</span>}</div>
                                                        <div className="text-[10px] text-slate-400">{comp.mercenaryRank}등급 • 레벨 {comp.level}</div>
                                                    </div>
                                                    {isSelected && <CheckCircle size={16} className="text-amber-400"/>}
                                                </button>
                                            );
                                        })}
                                        {allPotentialMercenaries.length === 0 && (
                                            <p className="col-span-2 py-8 text-center text-xs text-slate-500">선택 가능한 '용병' 직업 동료가 없습니다.</p>
                                        )}
                                    </div>
                                </div>

                                <div className="bg-slate-950/90 p-4 sm:p-5 rounded-2xl border border-slate-800 space-y-2">
                                    <div className="flex justify-between text-xs sm:text-sm">
                                        <span className="text-slate-400">기본 창설 비용</span>
                                        <span className="text-white font-mono font-bold">50,000 골드</span>
                                    </div>
                                    <div className="flex justify-between text-xs sm:text-sm">
                                        <span className="text-slate-400">단원 초기 활동비</span>
                                        <span className="text-white font-mono font-bold">{(selectedMemberIds.length * 10000).toLocaleString()} 골드</span>
                                    </div>
                                    <div className="h-px bg-slate-800 my-2"></div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm sm:text-base font-bold text-slate-200">총 필요 자금</span>
                                        <span className={`text-xl sm:text-2xl font-bold font-mono ${character.money >= (50000 + selectedMemberIds.length * 10000) ? 'text-amber-400' : 'text-rose-400'}`}>
                                            {(50000 + selectedMemberIds.length * 10000).toLocaleString()} 골드
                                        </span>
                                    </div>
                                </div>

                                <button 
                                    onClick={handleCreateGroup}
                                    disabled={selectedMemberIds.length < 5 || !groupNameInput.trim() || character.money < (50000 + selectedMemberIds.length * 10000)}
                                    className="w-full py-4 bg-gradient-to-r from-rose-700 to-amber-600 hover:from-rose-600 hover:to-amber-500 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-500 text-white font-bold rounded-xl shadow-lg transition-all active:scale-95"
                                >
                                    정식 용병단 창설
                                </button>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
                        <div className="w-full md:w-48 bg-slate-950 border-b md:border-b-0 md:border-r border-slate-800 flex flex-row md:flex-col shrink-0 overflow-x-auto p-1 md:p-2 gap-1">
                            <button 
                                onClick={() => setActiveTab('manage')}
                                className={`flex-1 md:flex-none p-3 rounded-xl font-bold flex items-center justify-center md:justify-start transition-all text-xs sm:text-sm ${activeTab === 'manage' ? 'bg-rose-950/40 text-rose-300 border border-rose-800/60' : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'}`}
                            >
                                <Users size={16} className="mr-1.5 md:mr-2.5 text-rose-400"/> <span>단원 관리</span>
                            </button>
                            <button 
                                onClick={() => setActiveTab('recruit')}
                                className={`flex-1 md:flex-none p-3 rounded-xl font-bold flex items-center justify-center md:justify-start transition-all text-xs sm:text-sm ${activeTab === 'recruit' ? 'bg-rose-950/40 text-rose-300 border border-rose-800/60' : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'}`}
                            >
                                <UserPlus size={16} className="mr-1.5 md:mr-2.5 text-rose-400"/> <span>신입 모집</span>
                            </button>
                            <button 
                                onClick={() => setActiveTab('dispatch')}
                                className={`flex-1 md:flex-none p-3 rounded-xl font-bold flex items-center justify-center md:justify-start transition-all text-xs sm:text-sm ${activeTab === 'dispatch' ? 'bg-rose-950/40 text-rose-300 border border-rose-800/60' : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'}`}
                            >
                                <Send size={16} className="mr-1.5 md:mr-2.5 text-rose-400"/> <span>분대 파견</span>
                            </button>
                        </div>

                        <div className="flex-1 p-6 overflow-y-auto custom-scrollbar">
                            {activeTab === 'manage' && (
                                <div className="space-y-8">
                                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                                        <h3 className="text-base sm:text-lg font-bold text-white flex items-center">
                                            <Users size={20} className="mr-2 text-rose-400"/> 소속 단원 ({currentGroupMembers.length}명)
                                        </h3>
                                        <button 
                                            onClick={() => setIsTrainingModalOpen(true)}
                                            className="w-full sm:w-auto px-4 py-2 bg-gradient-to-r from-rose-700 to-amber-600 hover:from-rose-600 hover:to-amber-500 text-white rounded-xl font-bold text-xs shadow-md flex items-center justify-center gap-2 transition-all active:scale-95"
                                        >
                                            <Dumbbell size={16}/> 용병단 훈련
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                                        {currentGroupMembers.map(mid => {
                                            const member = allPotentialMercenaries.find(c => c.id === mid);
                                            if (!member) return null;
                                            const isDispatched = activeMissions.some(m => m.memberIds.includes(mid));

                                            return (
                                                <div key={mid} className="bg-slate-950/80 p-3.5 sm:p-4 rounded-xl border border-slate-800/80 flex gap-3.5 hover:border-rose-500/40 transition-all">
                                                    <img 
                                                        src={member.visualUrl || generateDefaultVisualUrl(member.name, member.nation || '아시아', member.race, member.gender)} 
                                                        alt={member.name}
                                                        className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl object-cover border border-slate-800 shrink-0"
                                                        referrerPolicy="no-referrer"
                                                    />
                                                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                                                        <h4 className="font-bold text-slate-200 truncate text-sm sm:text-base">{member.name}</h4>
                                                        <div className="text-[11px] text-rose-400 font-bold uppercase mt-0.5">{member.mercenaryRank}등급 • 레벨 {member.level}</div>
                                                        <div className="mt-1.5">
                                                            {isDispatched ? (
                                                                <span className="text-[10px] text-amber-400 font-medium inline-flex items-center bg-amber-950/40 px-2 py-0.5 rounded border border-amber-800/40"><Clock size={11} className="mr-1"/> 임무 수행 중</span>
                                                            ) : (
                                                                <span className="text-[10px] text-emerald-400 font-medium inline-flex items-center bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-800/40"><CheckCircle size={11} className="mr-1"/> 기지 대기 중</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {/* 기존 동료 중 등록되지 않은 용병 목록 */}
                                    {allPotentialMercenaries.filter(c => !currentGroupMembers.includes(c.id)).length > 0 && (
                                        <div className="space-y-4 pt-4 border-t border-slate-800/80">
                                            <h3 className="text-xs sm:text-sm font-bold text-amber-400 uppercase flex items-center"><UserPlus size={16} className="mr-2"/> 단원 등록 가능 동료</h3>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                {allPotentialMercenaries
                                                    .filter(c => !currentGroupMembers.includes(c.id))
                                                    .map(comp => (
                                                        <div key={comp.id} className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 flex justify-between items-center hover:border-amber-500/40 transition-all">
                                                            <div className="flex items-center gap-3 min-w-0">
                                                                <img 
                                                                    src={comp.visualUrl || generateDefaultVisualUrl(comp.name, comp.nation || '아시아', comp.race, comp.gender)} 
                                                                    alt={comp.name}
                                                                    className="w-10 h-10 rounded-lg object-cover border border-slate-800 shrink-0"
                                                                    referrerPolicy="no-referrer"
                                                                />
                                                                <div className="min-w-0">
                                                                    <div className="text-xs sm:text-sm font-bold text-slate-200 truncate">{comp.name}</div>
                                                                    <div className="text-[10px] text-slate-400 font-bold">{comp.mercenaryRank}등급 • 레벨 {comp.level}</div>
                                                                </div>
                                                            </div>
                                                            <button 
                                                                onClick={() => handleAddExistingMember(comp.id)}
                                                                className="px-3 py-1.5 bg-amber-900/30 hover:bg-amber-800/40 text-amber-300 border border-amber-700/50 rounded-lg text-xs font-bold flex items-center shrink-0 transition-all active:scale-95"
                                                            >
                                                                <PlusCircle size={13} className="mr-1"/> 단원 등록
                                                            </button>
                                                        </div>
                                                    ))
                                                }
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {activeTab === 'recruit' && (
                                <div className="space-y-6">
                                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-2">
                                        <h3 className="text-base sm:text-lg font-bold text-white flex items-center">
                                            <UserPlus size={20} className="mr-2 text-rose-400"/> 지원자 명단 (용병 전용)
                                        </h3>
                                        <button onClick={handleRefreshRecruits} disabled={isRecruitLoading} className="text-xs text-slate-400 hover:text-amber-400 flex items-center bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800 transition-colors">
                                            {isRecruitLoading ? <Loader2 size={13} className="animate-spin mr-1.5 text-rose-400"/> : <RefreshCw size={13} className="mr-1.5"/>} 지원자 갱신 (10,000 골드)
                                        </button>
                                    </div>
                                    
                                    {isRecruitLoading ? (
                                        <div className="flex flex-col items-center justify-center py-16 sm:py-20 text-slate-500 space-y-4">
                                            <Loader2 size={40} className="animate-spin text-rose-500/70"/>
                                            <p className="text-xs sm:text-sm animate-pulse text-slate-400">우수한 용병들을 검토 중입니다...</p>
                                        </div>
                                    ) : recruits.length > 0 ? (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                                            {recruits.map(merc => {
                                                const hireCost = (RANK_ORDER.indexOf(merc.mercenaryRank!) + 1) * 15000;
                                                return (
                                                    <div key={merc.id} className="bg-slate-950/80 p-3.5 sm:p-4 rounded-xl border border-slate-800 hover:border-rose-500/40 transition-all flex flex-col justify-between">
                                                        <div className="flex gap-3.5 mb-3">
                                                            <img 
                                                                src={merc.visualUrl || generateDefaultVisualUrl(merc.name, merc.nation || '아시아', merc.race, merc.gender)} 
                                                                alt={merc.name}
                                                                className="w-14 h-14 rounded-xl object-cover border border-slate-800 shrink-0"
                                                                referrerPolicy="no-referrer"
                                                            />
                                                            <div className="flex-1 min-w-0">
                                                                <h4 className="font-bold text-slate-200 truncate text-sm sm:text-base">{merc.name}</h4>
                                                                <span className="text-[11px] text-rose-400 font-bold">{merc.mercenaryRank}등급 용병</span>
                                                                <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                                                    <span className="text-[10px] text-amber-400 font-bold bg-amber-950/30 px-1.5 py-0.5 rounded border border-amber-900/40">레벨 {merc.level}</span>
                                                                    {merc.combatStyle && COMBAT_STYLE_CONFIG[merc.combatStyle] && (
                                                                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${COMBAT_STYLE_CONFIG[merc.combatStyle].bgColor} ${COMBAT_STYLE_CONFIG[merc.combatStyle].borderColor} ${COMBAT_STYLE_CONFIG[merc.combatStyle].color}`} title={`특화 무기: ${COMBAT_STYLE_CONFIG[merc.combatStyle].specialtyText}`}>⚔️ {COMBAT_STYLE_CONFIG[merc.combatStyle].label}</span>
                                                                    )}
                                                                </div>
                                                                <p className="text-[10px] text-slate-400 mt-1 line-clamp-1">{merc.personality}</p>
                                                            </div>
                                                        </div>
                                                        <div className="mt-auto pt-3 border-t border-slate-800/80 flex justify-between items-center">
                                                            <span className="text-xs sm:text-sm text-amber-400 font-mono font-bold">{hireCost.toLocaleString()} 골드</span>
                                                            <button 
                                                                onClick={() => handleHireMember(merc)}
                                                                className="px-3.5 py-1.5 bg-rose-900/30 hover:bg-rose-800/50 text-rose-300 border border-rose-700/60 rounded-lg text-xs font-bold transition-all active:scale-95"
                                                            >
                                                                단원 영입
                                                            </button>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center py-16 text-slate-500 border border-dashed border-slate-800 rounded-2xl">
                                            <Search size={40} className="mb-3 opacity-30 text-slate-400"/>
                                            <p className="text-sm font-bold text-slate-400">현재 지원자가 없습니다.</p>
                                            <p className="text-xs text-slate-500 mt-1">상단의 '지원자 갱신' 버튼을 눌러 모집을 시작하세요.</p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {activeTab === 'dispatch' && (
                                <div className="space-y-6">
                                    {activeMissions.length > 0 && (
                                        <div className="space-y-3">
                                            <h3 className="text-xs sm:text-sm font-bold text-amber-400 uppercase tracking-wider flex items-center"><Clock size={16} className="mr-2"/> 활성 분대 임무 ({activeMissions.length}건)</h3>
                                            <div className="grid grid-cols-1 gap-3">
                                                {activeMissions.map(mission => {
                                                    const isDone = character.currentDate! >= mission.returnDate;
                                                    return (
                                                        <div key={mission.id} className={`p-4 rounded-xl border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 transition-all ${isDone ? 'bg-emerald-950/30 border-emerald-500/60' : 'bg-slate-950 border-slate-800'}`}>
                                                            <div>
                                                                <div className="font-bold text-slate-200 text-sm sm:text-base">{mission.title}</div>
                                                                <div className="text-xs text-slate-400 mt-0.5">인원: {mission.memberIds.length}명 • 복귀일: {mission.returnDate}</div>
                                                            </div>
                                                            {isDone ? (
                                                                <button onClick={() => handleCompleteMission(mission)} className="w-full sm:w-auto px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-xs shadow-md animate-pulse transition-all">완료 보고</button>
                                                            ) : (
                                                                <span className="text-xs text-slate-400 bg-slate-900 px-2.5 py-1 rounded border border-slate-800">임무 수행 중</span>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    <div className="bg-slate-950/90 p-4 sm:p-6 rounded-2xl border border-rose-900/30">
                                        <h3 className="text-base sm:text-lg font-bold text-rose-400 mb-4 sm:mb-6 flex items-center"><Send size={20} className="mr-2"/> 분대 파견 (최대 3명)</h3>
                                        
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                                            <div className="space-y-2.5">
                                                <label className="text-xs text-slate-400 font-bold">파견 분대원 선택 ({dispatchMemberIds.length}/3명)</label>
                                                <div className="space-y-1.5 max-h-48 overflow-y-auto custom-scrollbar p-2 bg-slate-900 rounded-xl border border-slate-800">
                                                    {currentGroupMembers.map(mid => {
                                                        const member = allPotentialMercenaries.find(c => c.id === mid);
                                                        if (!member) return null;
                                                        const isBusy = activeMissions.some(m => m.memberIds.includes(mid));
                                                        const isSelected = dispatchMemberIds.includes(mid);
                                                        
                                                        return (
                                                            <button 
                                                                key={mid}
                                                                disabled={isBusy || (!isSelected && dispatchMemberIds.length >= 3)}
                                                                onClick={() => toggleDispatchMemberSelection(mid)}
                                                                className={`w-full p-2.5 rounded-lg text-left flex justify-between items-center text-xs transition-all ${isSelected ? 'bg-rose-900/40 border border-rose-500 text-white font-bold' : isBusy ? 'opacity-30 grayscale cursor-not-allowed bg-slate-950' : 'bg-slate-950/60 border border-transparent text-slate-300 hover:border-slate-700'}`}
                                                            >
                                                                <span>{member.name} ({member.mercenaryRank}등급, 레벨 {member.level})</span>
                                                                {isSelected && <CheckCircle size={14} className="text-rose-400"/>}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>

                                            <div className="space-y-2.5">
                                                <label className="text-xs text-slate-400 font-bold">대상 의뢰 선택</label>
                                                <div className="space-y-1.5 max-h-48 overflow-y-auto custom-scrollbar p-2 bg-slate-900 rounded-xl border border-slate-800">
                                                    {availableQuests.map(quest => (
                                                        <button 
                                                            key={quest.id}
                                                            onClick={() => setDispatchQuestId(quest.id)}
                                                            className={`w-full p-2.5 rounded-lg text-left flex justify-between items-center text-xs transition-all ${dispatchQuestId === quest.id ? 'bg-amber-900/40 border border-amber-500 text-white font-bold' : 'bg-slate-950/60 border border-transparent text-slate-300 hover:border-slate-700'}`}
                                                        >
                                                            <span className="truncate pr-2">{quest.title} ({quest.rank}등급)</span>
                                                            <span className="font-mono text-amber-400 shrink-0">{quest.rewardGold.toLocaleString()} 골드</span>
                                                        </button>
                                                    ))}
                                                    {availableQuests.length === 0 && (
                                                        <div className="p-4 text-center text-xs text-slate-500">수행 가능한 의뢰가 없습니다.</div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {metrics && (
                                            <div className="mt-6 bg-slate-900/90 p-4 rounded-xl border border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-4">
                                                <div className="flex gap-6 sm:gap-8 w-full sm:w-auto justify-around">
                                                    <div className="text-center">
                                                        <span className="text-[11px] text-slate-400 font-bold">예상 성공률</span>
                                                        <p className={`text-lg sm:text-xl font-bold font-mono ${metrics.success >= 80 ? 'text-emerald-400' : metrics.success >= 50 ? 'text-amber-400' : 'text-rose-400'}`}>
                                                            {metrics.success}%
                                                        </p>
                                                    </div>
                                                    <div className="text-center">
                                                        <span className="text-[11px] text-slate-400 font-bold">소요 기간</span>
                                                        <p className="text-lg sm:text-xl font-bold font-mono text-cyan-400">
                                                            {metrics.days}일
                                                        </p>
                                                    </div>
                                                </div>
                                                <button 
                                                    onClick={handleDispatch}
                                                    className="w-full sm:w-auto px-6 py-2.5 bg-rose-700 hover:bg-rose-600 text-white font-bold rounded-xl shadow-lg transition-all active:scale-95"
                                                >
                                                    파견 개시
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MercenaryGroupModal;
