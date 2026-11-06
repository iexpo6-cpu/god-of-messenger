
import React, { useState, useEffect, useMemo } from 'react';
import { Character, MercenaryGroup, Companion, JobType, MercenaryRank, ClassTier, Stats, SimpleStudent, RelationType } from '../types';
import { X, Globe, Shield, Users, UserPlus, Lock, Crown, LogOut, Sword, MessageCircle, Heart, UserCheck, MapPin,Loader2, Sparkles, Activity, Brain, User, Medal, AlertCircle, CheckCircle, Info, AlertTriangle } from 'lucide-react';
import { REGIONAL_MERCENARY_GROUPS, DEFAULT_MERCENARY_GROUPS } from '../worldguild.ts';
import { SHINRYOKU_TYPES_LIST, MAX_PARTY_SIZE, MERCENARY_RANK_SCORE } from '../constants';
import { generateCompanionStats, generateLevelByRank, getTierByLevel, generateName, getYear, generateDefaultVisualUrl, getRaceByNation, assignRandomCombatStyle } from '../utils';
import { MERCENARY_RANK_THRESHOLD } from '../mercenaryRankUp';
import ActionResultModal, { ResultData } from './ActionResultModal';

interface Props {
    character: Character;
    onClose: () => void;
    onUpdateCharacter: (newChar: Character, logMsg: string) => void;
}

const MercenaryFactionModal: React.FC<Props> = ({ character, onClose, onUpdateCharacter }) => {
    const [resultData, setResultData] = useState<ResultData | null>(null);
    const [npcList, setNpcList] = useState<Companion[]>([]);
    const [isLoadingNpcs, setIsLoadingNpcs] = useState(false);

    const mData = character.mercenaryData;
     const isViceCaptain = mData?.isViceCaptain || false;
    const isGroupLeader = mData?.isGroupLeader || false;
    const loc = character.currentLocation || { region: '아시아', nation: '대한민국', city: '서울' };
    const joinedGroupId = mData?.joinedGroupId;
    
    // [MODIFIED] 현재 위치와 상관없이 플레이어가 가입한 그룹을 전역적으로 검색
    const joinedGroup = useMemo(() => {
        if (!joinedGroupId) return null;

        // 1. 사전 정의된 모든 지역 그룹에서 검색
        for (const cityKey in REGIONAL_MERCENARY_GROUPS) {
            const found = REGIONAL_MERCENARY_GROUPS[cityKey].find(g => g.id === joinedGroupId);
            if (found) return found;
        }

        // 2. 검색 실패 시 가입 당시 생성된 기본 용병단일 가능성이 큼
        // 아이디 규칙이 ${city}_l1 형태이므로 역추적 시도 (fallback)
        const cityFromId = joinedGroupId.split('_')[0];
        const defaultGroups = DEFAULT_MERCENARY_GROUPS(character.nation, cityFromId);
        return defaultGroups.find(g => g.id === joinedGroupId) || null;
    }, [joinedGroupId, character.nation]);

    // 가입하지 않은 상태일 때 현재 도시에서 가입 가능한 목록
    const joinableGroups = REGIONAL_MERCENARY_GROUPS[loc.city] || DEFAULT_MERCENARY_GROUPS(loc.nation, loc.city);

    // [NEW] Helper: Convert socialNetwork bond to Companion object for list consistency
    const convertBondToCompanion = (bond: SimpleStudent, title: string, isCore: boolean): Companion => {
        const level = bond.level;
        const tier = getTierByLevel(level);
        return {
            id: bond.id,
            name: bond.name,
            age: bond.age,
            birthYear: bond.birthYear,
            gender: bond.gender,
            race: "인간",
            appearance: bond.appearance,
            personality: bond.personality,
            classType: title,
            job: JobType.MERCENARY,
            level: level,
            currentExp: 0,
            maxExp: level * 100,
            statPoints: 0,
            classTier: tier,
            shinryokuType: bond.shinryokuType || (tier !== ClassTier.NONE ? SHINRYOKU_TYPES_LIST[Math.floor(Math.random()*SHINRYOKU_TYPES_LIST.length)] : "미개방"),
            stats: bond.stats as Stats,
            skills: [],
            equipment: {},
            inventory: [],
            affection: bond.affection,
            loyalty: 50,
            mercenaryRank: bond.mercenaryRank,
            reputation: bond.reputation || 0,
            factionId: joinedGroupId,
            isCoreMember: isCore
        };
    };

    // Generate NPCs if joined
    useEffect(() => {
        if (joinedGroup && npcList.length === 0) {
            generateNpcs();
        }
    }, [joinedGroup, character.socialNetwork]); 

    const generateNpcs = () => {
        if (!joinedGroup) return;
        setIsLoadingNpcs(true);
        const group = joinedGroup;
        const npcs: Companion[] = [];

        // [CORE] 지배자급 ID 규칙 통일
        const capId = `faction_core_${group.id}_Captain`;
        const viceId = `faction_core_${group.id}_Vice`;

        // 관계망에서 이미 생성된 정보가 있는지 확인
        const capBond = character.socialNetwork?.find(n => n.id === capId);
        const viceBond = character.socialNetwork?.find(n => n.id === viceId);

        // 1. Captain
        if (capBond) {
            npcs.push(convertBondToCompanion(capBond, "용병단장", true));
        } else {
            const capRank = group.size === 'Large' ? MercenaryRank.S : MercenaryRank.A;
            npcs.push(createNpc(group.captain || "강대장", capRank, generateLevelByRank(capRank), "용병단장", true, capId));
        }

        // 2. Vice-Captain
        if (viceBond) {
            npcs.push(convertBondToCompanion(viceBond, "부단장", true));
        } else {
            const viceRank = group.size === 'Large' ? MercenaryRank.A : MercenaryRank.B;
            npcs.push(createNpc(group.viceCaptain || "부단장", viceRank, generateLevelByRank(viceRank), "부단장", true, viceId));
        }

        // 3. Normal Members (랜덤 생성)
        for (let i = 0; i < 5; i++) {
            const rank = [MercenaryRank.F, MercenaryRank.E, MercenaryRank.D, MercenaryRank.C][Math.floor(Math.random() * 4)];
            const gender = Math.random() > 0.5 ? "남성" : "여성";
            const genderParam = gender === "남성" ? "male" : "female";
            npcs.push(createNpc(generateName(group.nation, genderParam), rank, generateLevelByRank(rank), "단원", false, undefined, gender));
        }

        setNpcList(npcs);
        setIsLoadingNpcs(false);
    };

    const createNpc = (name: string, rank: MercenaryRank, level: number, title: string, isCore: boolean, customId?: string, forceGender?: string): Companion => {
        const tier = getTierByLevel(level);
        const stats = generateCompanionStats(level);
        const gender = forceGender || (Math.random() > 0.5 ? "남성" : "여성");
        return {
            id: customId || `npc_${joinedGroupId}_${name}_${rank}_${Math.random().toString(36).substring(7)}`,
            name, age: `${20 + Math.floor(Math.random()*10)}세`, gender, race: "인간", 
            appearance: isCore ? `${title}의 위엄이 서린 노련한 용모.` : "강인한 인상의 현역 용병.",
            personality: isCore ? "엄격함" : "호전적", classType: title, job: JobType.MERCENARY,
            level, currentExp: 0, maxExp: level * 100, statPoints: 0, classTier: tier,
            shinryokuType: tier !== ClassTier.NONE ? SHINRYOKU_TYPES_LIST[Math.floor(Math.random()*SHINRYOKU_TYPES_LIST.length)] : "미개방",
            stats: stats, skills: [], equipment: {}, inventory: [], affection: 20, loyalty: 20,
            mercenaryRank: rank, reputation: 0, factionId: joinedGroupId, isCoreMember: isCore
        };
    };

    const handleJoin = (group: MercenaryGroup) => {
        if (isGroupLeader) {
            setResultData({
                type: 'warning',
                title: '가입 불가',
                message: '이미 자신만의 용병단을 이끄는 리더는 다른 세력에 가입할 수 없습니다.',
                items: [{ label: '현재 상태', after: '용병단 리더' }]
            });
            return;
        }

        if (character.level < group.minLevel) {
            setResultData({
                type: 'warning',
                title: '자격 부족',
                message: `'${group.name}'은(는) 더 강력한 용병을 원합니다.`,
                items: [{ label: '요구 레벨', after: `Lv.${group.minLevel}` }, { label: '현재 레벨', after: `Lv.${character.level}` }]
            });
            return;
        }

        const newChar = { ...character };
        if (!newChar.mercenaryData) {
            setResultData({
                type: 'warning',
                title: '길드 미등록',
                message: '용병 세력에 가입하려면 먼저 용병 길드에 등록해야 합니다.',
                items: []
            });
            return;
        }

        newChar.mercenaryData = { ...newChar.mercenaryData, joinedGroupId: group.id };

        if (!newChar.socialNetwork) newChar.socialNetwork = [];
        
        const currentYear = getYear(character.currentDate || '2000-01-01');
        const capRank = group.size === 'Large' ? MercenaryRank.S : MercenaryRank.A;
        const viceRank = group.size === 'Large' ? MercenaryRank.A : MercenaryRank.B;
        const MBTI_LIST = ["INTJ", "INFJ", "ENTJ", "ENFJ", "ISTJ", "ISFJ", "ESTJ", "ESFJ", "ISTP", "ISFP", "ESTP", "ESFP", "INTP", "INFP", "ENTP", "ENFP"];

        const createBond = (id: string, name: string, rank: MercenaryRank, roleTitle: string): SimpleStudent => {
            const level = generateLevelByRank(rank);
            const stats = generateCompanionStats(level);
            const race = getRaceByNation(group.nation);
            const gender = Math.random() > 0.5 ? "남성" : "여성";
            return assignRandomCombatStyle({
                id: id,
                name: name,
                age: `${30 + Math.floor(Math.random() * 10)}세`,
                birthYear: currentYear - (30 + Math.floor(Math.random() * 10)),
                gender: gender,
                nation: group.nation,
                race: race,
                level: level,
                classType: "용병", 
                personality: MBTI_LIST[Math.floor(Math.random() * MBTI_LIST.length)],
                appearance: `${group.name}의 ${roleTitle}입니다.`,
                stats: { ...stats },
                affection: 10,
                job: JobType.MERCENARY,
                mercenaryRank: rank,
                reputation: MERCENARY_RANK_THRESHOLD[rank],
                isStaticRank: true,
                visualUrl: generateDefaultVisualUrl(name, group.nation, race, gender)
            }, true, true);
        };

        const capId = `faction_core_${group.id}_Captain`;
        const viceId = `faction_core_${group.id}_Vice`;
        
        const captainName = group.captain || "무명의 단장";
        const viceName = group.viceCaptain || "무명의 부단장";

        const captainBond = createBond(capId, captainName, capRank, "단장");
        const viceCaptainBond = createBond(viceId, viceName, viceRank, "부단장");

        [captainBond, viceCaptainBond].forEach(bond => {
            if (!newChar.socialNetwork!.some(sn => sn.id === bond.id)) {
                newChar.socialNetwork!.push(bond);
            }
        });

        onUpdateCharacter(newChar, `[용병단 세력] '${group.name}'에 정식으로 가입했습니다. 단장 ${captainName}와(과) 인연이 맺어졌습니다.`);
        
        setResultData({
            type: 'success',
            title: '세력 가입 성공',
            message: `'${group.name}'의 일원이 되었습니다. 이제 용병단 전용 혜택을 누릴 수 있으며, 핵심 인물들이 당신의 인물 관계망에 등록되었습니다.`,
            items: [
                { label: '소속', after: group.name },
                { label: '인연 등록', after: captainName },
                { label: '인연 등록', after: viceName }
            ]
        });
    };

    const handleRecruitTemp = (npc: Companion) => {
        const isAlreadyInParty = character.companions.some(c => c.id === npc.id);
        const isAlreadyInBase = character.inactiveCompanions?.some(c => c.id === npc.id);
        
        if (isAlreadyInParty || isAlreadyInBase) {
            setResultData({
                type: 'info',
                title: '이미 소속됨',
                message: `${npc.name}은(는) 이미 당신의 파티에 합류한 상태입니다.`,
                items: []
            });
            return;
        }

        if (character.companions.length >= MAX_PARTY_SIZE) {
            setResultData({
                type: 'warning',
                title: '파티 가득 참',
                message: '현재 파티 인원이 최대입니다. 동료를 기지로 보낸 후 다시 시도하세요.',
                items: [{ label: '최대 인원', after: '5명' }]
            });
            return;
        }

        if (npc.isCoreMember) {
            const playerRank = mData?.rank || MercenaryRank.F;
            const playerRankScore = MERCENARY_RANK_SCORE[playerRank];
            const requiredScore = MERCENARY_RANK_SCORE[MercenaryRank.A];

            if (playerRankScore < requiredScore) {
                setResultData({
                    type: 'warning',
                    title: '권한 부족',
                    message: '단장급 핵심 인물의 임시 영입 권한은 용병 등급 A급부터 주어집니다.',
                    items: [{ label: '필요 등급', after: 'A Rank' }, { label: '내 등급', after: playerRank }]
                });
                return;
            } 
        }

        const newChar = { ...character };
        const tempNpc = assignRandomCombatStyle({ ...npc, isTemporary: true }, true, true);
        newChar.companions.push(tempNpc);
        onUpdateCharacter(newChar, `[용병단 협력] ${npc.name} 단원을 임시 동료로 영입했습니다.`);
        
        setResultData({
            type: 'success',
            title: '임시 영입 성공',
            message: `${npc.name}이(가) 용병단의 지시에 따라 당신의 여정에 동행합니다.`,
            items: [{ label: '영입 대상', after: npc.name }, { label: '상태', after: '임시 동료' }]
        });
    };

    const handleLeaveGroup = (withCompanions: boolean) => {
        const newChar = { ...character };
        if (!newChar.socialNetwork) newChar.socialNetwork = [];
        const playerRankScore = MERCENARY_RANK_SCORE[mData?.rank || MercenaryRank.F];
        let recruitedNames: string[] = [];
        let failedNames: string[] = [];
        
        const processList = (list: Companion[]) => {
            return list.map(c => {
                if (c.isTemporary && c.factionId === joinedGroupId) {
                    if (withCompanions) {
                        const isPersuadable = MERCENARY_RANK_SCORE[c.mercenaryRank || MercenaryRank.F] <= playerRankScore;
                        const chance = (c.affection + c.loyalty) * 0.5;
                        const roll = Math.random() * 100;

                        if (isPersuadable && roll < chance) {
                            recruitedNames.push(c.name);
                            return { ...c, isTemporary: false, factionId: undefined };
                        }
                    }
                    failedNames.push(c.name); 
                    
                    // [MODIFIED] 설득 실패한 임시 동료를 과거 인연으로 등록
                    const bond: SimpleStudent = assignRandomCombatStyle({
                        id: c.id,
                        name: c.name,
                        age: c.age,
                        birthYear: c.birthYear,
                        gender: c.gender,
                        race: c.race,
                        nation: c.nation || loc.nation,
                        level: c.level,
                        classType: c.classType,
                        personality: c.personality || "평범함",
                        appearance: c.appearance,
                        stats: { ...c.stats },
                        affection: Math.max(-100, c.affection - 10), // 작별로 인한 호감도 하락
                        job: JobType.MERCENARY,
                        mercenaryRank: c.mercenaryRank,
                        isStaticRank: true,
                        visualUrl: c.visualUrl,
                        combatStyle: c.combatStyle
                    }, false);
                    newChar.socialNetwork!.push(bond);

                    return null;
                }
                return c;
            }).filter(c => c !== null) as Companion[];
        };

        if (!withCompanions) {
            newChar.companions = processList(newChar.companions);
            if (newChar.inactiveCompanions) newChar.inactiveCompanions = processList(newChar.inactiveCompanions);
            newChar.mercenaryData!.joinedGroupId = undefined;
                newChar.mercenaryData!.isViceCaptain = false;
            onUpdateCharacter(newChar, `[용병단 탈퇴] 홀로 용병단을 떠났습니다. 임시 동료들은 소속으로 복귀했으며 과거 인연으로 기록되었습니다.`);
            onClose();
        } else {
            newChar.companions = processList(newChar.companions);
            if (newChar.inactiveCompanions) newChar.inactiveCompanions = processList(newChar.inactiveCompanions);
            newChar.mercenaryData!.joinedGroupId = undefined;

            if (recruitedNames.length > 0) {
                onUpdateCharacter(newChar, `[용병단 탈퇴] ${recruitedNames.join(', ')}와(과) 함께 용병단을 떠나 새로운 시작을 합니다. 설득에 실패한 인원들은 과거 인연이 되었습니다.`);
                setResultData({
                    type: 'success',
                    title: '동반 탈퇴 및 영입 완료',
                    message: `당신을 믿고 따르던 ${recruitedNames.length}명의 동료가 정식으로 합류했습니다!${failedNames.length > 0 ? `\n(${failedNames.join(', ')}은(는) 소속에 남았으며 과거 인연으로 기록됩니다.)` : ''}`,
                    items: [{ label: '영입 인원', after: `${recruitedNames.length}명` }]
                });
                onClose();
            } else {
                onUpdateCharacter(newChar, `[용병단 탈퇴] 동료들을 설득하는 데 실패하고 홀로 떠났습니다. 이탈한 인원들은 과거 인연으로 남습니다.`);
                setResultData({
                    type: 'failure',
                    title: '동반 탈퇴 실패',
                    message: `동료들은 용병단에 남기로 결정했습니다. (호감도와 충성도가 부족했거나 당신보다 등급이 높은 용병입니다.) 이들은 과거 인연으로 기록되었습니다.`,
                    items: []
                });
                onClose();
            }
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm p-2 sm:p-4 animate-in fade-in">
            {resultData && <ActionResultModal data={resultData} onClose={() => setResultData(null)} />}

            <div className="bg-slate-900 border border-red-500/40 w-full max-w-5xl max-h-[92vh] rounded-2xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden relative">
                <div className="p-4 sm:p-6 border-b border-rose-950/40 bg-gradient-to-r from-rose-955/40 via-slate-900 to-amber-950/30 flex justify-between items-center shrink-0">
                    <div className="flex items-center">
                        <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 mr-3 sm:mr-4">
                            <Globe size={24} className="text-rose-400" />
                        </div>
                        <div>
                            <h2 className="text-lg sm:text-2xl font-bold text-white tracking-tight">용병 세력</h2>
                            <p className="text-xs text-slate-400 mt-0.5">{joinedGroup ? `소속: ${joinedGroup.name} (${joinedGroup.city})` : `${loc.city} 지역의 주요 용병단 세력`}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition-colors"><X size={20} /></button>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col md:flex-row">
                    {!joinedGroupId ? (
                        <div className="flex-1 p-4 sm:p-8">
                            {isGroupLeader && (
                                <div className="mb-4 sm:mb-6 bg-amber-950/30 border border-amber-500/40 p-3.5 sm:p-4 rounded-xl flex items-center gap-3 text-amber-200">
                                    <AlertTriangle className="shrink-0 text-amber-400" size={18}/>
                                    <p className="text-xs sm:text-sm font-bold">자신만의 용병단을 운영 중인 리더는 타 세력에 가입할 수 없습니다.</p>
                                </div>
                            )}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
                                {joinableGroups.map(group => {
                                    const isLocked = character.level < group.minLevel;
                                    const sizeLabel = group.size === 'Large' ? '대형' : group.size === 'Medium' ? '중형' : '소형';
                                    return (
                                        <div key={group.id} className={`bg-slate-950/90 p-4 sm:p-6 rounded-2xl border transition-all relative flex flex-col justify-between ${isLocked || isGroupLeader ? 'opacity-60 border-slate-800' : 'border-slate-800 hover:border-rose-500/50 shadow-lg'}`}>
                                            <div>
                                                <div className="flex justify-between items-start mb-3 sm:mb-4">
                                                    <div className={`p-2.5 rounded-xl bg-slate-900 border ${isLocked || isGroupLeader ? 'border-slate-800 text-slate-600' : 'border-rose-900/50 text-rose-400'}`}>
                                                        <Shield size={20}/>
                                                    </div>
                                                    <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-md border ${group.size === 'Large' ? 'bg-amber-950/40 text-amber-400 border-amber-800/60' : group.size === 'Medium' ? 'bg-sky-950/40 text-sky-400 border-sky-800/60' : 'bg-slate-900 text-slate-400 border-slate-800'}`}>
                                                        {sizeLabel} 세력
                                                    </span>
                                                </div>
                                                <h3 className="text-base sm:text-lg font-bold text-white mb-1.5">{group.name}</h3>
                                                <p className="text-xs text-slate-400 leading-relaxed mb-4 italic min-h-[3rem]">"{group.description}"</p>
                                                
                                                <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800 mb-4 space-y-1.5">
                                                    <div className="flex justify-between text-xs">
                                                        <span className="text-slate-400">요구 레벨</span>
                                                        <span className={isLocked ? 'text-rose-400 font-bold' : 'text-emerald-400 font-bold'}>레벨 {group.minLevel}</span>
                                                    </div>
                                                    <div className="flex justify-between text-xs">
                                                        <span className="text-slate-400">단장</span>
                                                        <span className="text-slate-200 font-bold">{group.captain}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {isLocked ? (
                                                <div className="w-full py-2.5 bg-slate-900 text-slate-500 rounded-xl flex items-center justify-center gap-2 cursor-not-allowed border border-slate-800 text-xs font-bold">
                                                    <Lock size={14}/> 입단 자격 미달
                                                </div>
                                            ) : isGroupLeader ? (
                                                <div className="w-full py-2.5 bg-slate-900 text-slate-500 rounded-xl flex items-center justify-center gap-2 cursor-not-allowed border border-slate-800 text-xs font-bold">
                                                    <Crown size={14}/> 리더 가입 불가
                                                </div>
                                            ) : (
                                                <button 
                                                    onClick={() => handleJoin(group)}
                                                    className="w-full py-2.5 bg-rose-700 hover:bg-rose-600 text-white rounded-xl font-bold shadow-lg transition-all flex items-center justify-center gap-2 active:scale-95 text-xs sm:text-sm"
                                                >
                                                    <UserPlus size={15}/> 용병단 입단
                                                </button>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    ) : (
                         <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
                            <div className="w-full md:w-72 border-b md:border-b-0 md:border-r border-slate-800 p-4 sm:p-6 flex flex-col bg-slate-950/40 shrink-0">
                                <div className="text-center mb-4 sm:mb-6">
                                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-rose-950/30 border-2 border-rose-500/50 flex items-center justify-center mx-auto mb-3">
                                        <Crown size={36} className="text-rose-400"/>
                                    </div>
                                    <h3 className="text-base sm:text-lg font-bold text-white mb-1.5">{joinedGroup?.name}</h3>
                                    <div className="flex flex-col items-center gap-1.5">
                                        {isViceCaptain && (
                                            <span className="text-[10px] bg-indigo-950/60 text-indigo-300 px-3 py-0.5 rounded-full border border-indigo-700/60 font-bold flex items-center gap-1">
                                                <Medal size={11}/> 부단장
                                            </span>
                                        )}
                                        <p className="text-[10px] text-rose-400 font-bold bg-rose-950/40 px-3 py-0.5 rounded-full border border-rose-900/50 inline-block">정식 단원</p>
                                    </div>
                                </div>

                                <div className="space-y-2 mb-auto">
                                    <button 
                                        onClick={() => handleLeaveGroup(false)}
                                        className="w-full py-2.5 bg-slate-900 hover:bg-rose-950/40 text-rose-400 border border-rose-900/30 rounded-xl font-bold text-xs transition-all active:scale-95"
                                    >
                                        용병단 탈퇴
                                    </button>
                                    <button 
                                        onClick={() => handleLeaveGroup(true)}
                                        className="w-full py-2.5 bg-rose-800 hover:bg-rose-700 text-white border border-rose-600/50 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-md active:scale-95"
                                    >
                                        <Users size={14}/> 동료와 함께 탈퇴
                                    </button>
                                </div>

                                <div className="mt-4 sm:mt-6 p-3.5 bg-slate-900/80 rounded-xl border border-slate-800">
                                    <h4 className="text-[10px] text-slate-400 font-bold uppercase mb-2 flex items-center"><Info size={12} className="mr-1.5 text-rose-400"/> 세력 규정</h4>
                                    <ul className="space-y-1.5 text-xs text-slate-300">
                                        <li className="flex items-start"><CheckCircle size={12} className="mr-2 text-emerald-400 mt-0.5 shrink-0"/> <span>일반 단원 임시 협력 영입 가능</span></li>
                                        <li className="flex items-start"><CheckCircle size={12} className="mr-2 text-emerald-400 mt-0.5 shrink-0"/> <span>핵심 인물은 A등급 이상부터</span></li>
                                        <li className="flex items-start"><CheckCircle size={12} className="mr-2 text-emerald-400 mt-0.5 shrink-0"/> <span>탈퇴 시 신뢰도에 따른 영입</span></li>
                                    </ul>
                                </div>
                            </div>

                            <div className="flex-1 p-4 sm:p-6 overflow-y-auto custom-scrollbar bg-slate-900/30">
                                <h3 className="text-base sm:text-lg font-bold text-white mb-4 flex items-center"><Users size={20} className="mr-2 text-rose-400"/> 세력 구성원</h3>
                                
                                {isLoadingNpcs ? (
                                    <div className="flex flex-col items-center justify-center py-16 text-slate-500">
                                        <Loader2 size={32} className="animate-spin text-rose-400 mb-3"/>
                                        <p className="text-xs text-slate-400">용병 명단을 검토 중입니다...</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 gap-3 sm:gap-4">
                                        {npcList.map(npc => {
                                            const alreadyRecruited = character.companions.some(c => c.id === npc.id) || character.inactiveCompanions?.some(c => c.id === npc.id);
                                            const chance = (npc.affection + npc.loyalty) * 0.5;
                                            return (
                                                <div key={npc.id} className="bg-slate-950/80 p-3.5 sm:p-4 rounded-xl border border-slate-800 flex flex-col gap-3 hover:border-rose-500/40 transition-all relative">
                                                    {alreadyRecruited && <div className="absolute top-3 right-3 bg-emerald-950/80 text-emerald-300 text-[10px] px-2 py-0.5 rounded border border-emerald-500/40 font-bold">합류 완료</div>}
                                                    
                                                    <div className="flex items-start gap-3 sm:gap-4">
                                                        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-slate-900 border border-slate-800 shrink-0 overflow-hidden">
                                                            <img 
                                                                src={npc.visualUrl || generateDefaultVisualUrl(npc.name, npc.nation || '아시아', npc.race, npc.gender)} 
                                                                alt={npc.name}
                                                                className="w-full h-full object-cover"
                                                                referrerPolicy="no-referrer"
                                                            />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-2 mb-0.5">
                                                                <h4 className="font-bold text-sm sm:text-base text-slate-100 truncate">{npc.name}</h4>
                                                                <span className="text-[10px] bg-rose-950/60 text-rose-400 px-2 py-0.5 rounded border border-rose-900/50 font-bold">{npc.mercenaryRank}등급</span>
                                                            </div>
                                                            <div className="flex flex-wrap gap-1.5 text-xs mb-1.5 text-slate-300">
                                                                <span className="text-amber-400 font-bold">레벨 {npc.level}</span>
                                                                <span className="text-slate-600">•</span>
                                                                <span className="text-indigo-300 font-medium">{npc.classType}</span>
                                                                <span className="text-slate-600">•</span>
                                                                <span className="text-cyan-300">{npc.shinryokuType}</span>
                                                            </div>
                                                            <div className="flex items-center gap-3">
                                                                <div className="flex items-center text-xs text-pink-400"><Heart size={12} className="mr-1 fill-pink-500/20"/> 호감도 {npc.affection}</div>
                                                                <div className="flex items-center text-xs text-sky-400"><Shield size={12} className="mr-1 fill-sky-500/20"/> 충성도 {npc.loyalty}</div>
                                                                <div className="text-xs text-amber-400 font-bold">합류 성공률: {chance}%</div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="grid grid-cols-4 gap-1.5 bg-black/40 p-2 sm:p-2.5 rounded-lg border border-slate-800/80">
                                                        <div className="text-center"><p className="text-[9px] text-slate-400 font-bold">근력</p><p className="text-xs font-bold text-rose-400 font-mono">{npc.stats.str}</p></div>
                                                        <div className="text-center"><p className="text-[9px] text-slate-400 font-bold">지력</p><p className="text-xs font-bold text-purple-400 font-mono">{npc.stats.int}</p></div>
                                                        <div className="text-center"><p className="text-[9px] text-slate-400 font-bold">방어</p><p className="text-xs font-bold text-emerald-400 font-mono">{npc.stats.def}</p></div>
                                                        <div className="text-center"><p className="text-[9px] text-slate-400 font-bold">민첩</p><p className="text-xs font-bold text-amber-400 font-mono">{npc.stats.agi}</p></div>
                                                    </div>

                                                    <div className="flex justify-end items-center mt-1">
                                                        <button 
                                                            onClick={() => handleRecruitTemp(npc)}
                                                            disabled={alreadyRecruited}
                                                            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all shadow-md flex items-center justify-center gap-1.5 ${alreadyRecruited ? 'bg-slate-900 text-slate-600 border border-slate-800 cursor-not-allowed' : 'bg-rose-700 hover:bg-rose-600 text-white active:scale-95'}`}
                                                        >
                                                            {alreadyRecruited ? '합류 완료' : <><Sword size={13}/> 협력 영입</>}
                                                        </button>
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MercenaryFactionModal;
