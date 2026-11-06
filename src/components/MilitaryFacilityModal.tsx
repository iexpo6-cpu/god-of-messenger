
import React, { useState, useMemo, useEffect } from 'react';
import { Character, MilitaryRank, Companion, JobType, ClassTier, Location, Stats, SimpleStudent, RelationType } from '../types';
import { X, Shield, Sword, Crown, MapPin, Users, Send, Target, Medal, AlertTriangle,ArrowRight,Coins, CheckCircle, Search, Loader2, Building2, TowerControl, ListOrdered, Award, UserPlus, Star, Lock, Info, Flame, ShieldCheck, LogOut, RefreshCw, UserCheck, Sparkles, UserMinus, ShieldAlert, ChevronRight, Globe, UserX } from 'lucide-react';
import { WORLD_GEOGRAPHY, MILITARY_RANK_ORDER, SHINRYOKU_TYPES_LIST, MILITARY_RANK_THRESHOLD } from '../constants';
import { generateName, generateCompanionStats, getTierByLevel, generateMilitaryLevelByRank, addDays, getYear, generateDefaultVisualUrl, getRaceByNation, assignRandomCombatStyle } from '../utils';
import ActionResultModal, { ResultData } from './ActionResultModal';
import MilitaryDispatchModal from './MilitaryDispatchModal';
import MilitarySpecialDispatchModal from './MilitarySpecialDispatchModal';

interface Props {
    character: Character;
    onClose: () => void;
    onUpdateCharacter: (newChar: Character, logMsg: string) => void;
    effectiveCommander?: { id: string; name: string; rank: MilitaryRank; rankIdx: number };
}

const MilitaryFacilityModal: React.FC<Props> = ({ character, onClose, onUpdateCharacter, effectiveCommander }) => {
    const [activeTab, setActiveTab] = useState<'appointment' | 'command' | 'general' | 'special'>('command');
    const [resultData, setResultData] = useState<ResultData | null>(null);
    const [isDispatchOpen, setIsDispatchOpen] = useState(false);
    const [isSpecialDispatchOpen, setIsSpecialDispatchOpen] = useState(false);
    
    const [selectedMemberId, setSelectedMemberId] = useState<string>('player');
    const [selectedRegion, setSelectedRegion] = useState<string>(character.currentLocation?.region || '아시아');
    const [selectedCity, setSelectedCity] = useState<string>(character.currentLocation?.city || '');
    const [appointmentType, setAppointmentType] = useState<'Commander' | 'Vice'>('Commander');

    const [isProcessing, setIsProcessing] = useState(false);

    const fallbackCommander = useMemo(() => {
        if (effectiveCommander) return effectiveCommander;
        const playerRank = character.militaryRank || MilitaryRank.PVT;
        const pRankIdx = MILITARY_RANK_ORDER.indexOf(playerRank);
        return {
            id: 'player',
            name: character.name,
            rank: playerRank,
            rankIdx: pRankIdx >= 0 ? pRankIdx : 0
        };
    }, [effectiveCommander, character]);

    const mData = character.militaryData;
    const rank = fallbackCommander.rank;
    const rankIdx = fallbackCommander.rankIdx;

    const isOfficer = rankIdx >= MILITARY_RANK_ORDER.indexOf(MilitaryRank.SLT); 
    const isGeneralRank = rankIdx >= MILITARY_RANK_ORDER.indexOf(MilitaryRank.BG); 
    const showAppointmentTab = isOfficer; 
    
    const isMajorGeneral = rankIdx === MILITARY_RANK_ORDER.indexOf(MilitaryRank.MG); 
    const isLtGeneral = rankIdx === MILITARY_RANK_ORDER.indexOf(MilitaryRank.LG); 
    const isGeneral = rankIdx === MILITARY_RANK_ORDER.indexOf(MilitaryRank.GEN); 

    const nation = character.currentLocation?.nation || character.nation;
    const allComps = [...character.companions, ...(character.inactiveCompanions || [])];

    const allMilitaryPotentials = useMemo(() => {
        const playerEntry = (character.job === JobType.SOLDIER && character.nation === nation) ? [{ 
            id: 'player', 
            name: `${character.name} (나)`, 
            militaryRank: character.militaryRank || MilitaryRank.PVT, 
            level: character.level, 
            shinryokuType: character.shinryokuType 
        }] : [];

        const companionEntries = allComps.filter(c => c.job === JobType.SOLDIER && c.nation === nation && !c.isDead);
        
        const socialEntries = (character.socialNetwork || [])
            .filter(n => n.job === JobType.SOLDIER && n.nation === nation && !n.isPurged);
            
        return [...playerEntry, ...companionEntries, ...socialEntries];
    }, [character, allComps, nation]);

    useEffect(() => {
        if (!mData || !character.currentLocation) return;
        
        const currentNation = character.currentLocation.nation;
        const currentRegion = character.currentLocation.region;
        const nationCities = WORLD_GEOGRAPHY[currentRegion]?.[currentNation]?.cities || [];
        
        if (nationCities.length === 0) return;

        let needsUpdate = false;
        const newChar = JSON.parse(JSON.stringify(character)) as Character;
        
        const cYear = getYear(newChar.currentDate || '2000-01-01');
        const MBTI_LIST = ["INTJ", "INFJ", "ENTJ", "ENFJ", "ISTJ", "ISFJ", "ESTJ", "ESFJ", "ISTP", "ISFP", "ESTP", "ESFP", "INTP", "INFP", "ENTP", "ENFP"];

        if (!newChar.socialNetwork) newChar.socialNetwork = [];
        if (!newChar.militaryData) {
            newChar.militaryData = { rank: (newChar.militaryRank || MilitaryRank.PVT), enlistedDate: newChar.currentDate || '2000-01-01', merit: 0, completedMissions: 0, availableMissions: [], activeMissions: [] };
        }
        if (!newChar.militaryData.regionalAppointments) newChar.militaryData.regionalAppointments = {};
        if (!newChar.militaryData.regionalViceAppointments) newChar.militaryData.regionalViceAppointments = {};

        nationCities.forEach(city => {
            if (!newChar.militaryData!.regionalAppointments![city]) {
                const isCapital = WORLD_GEOGRAPHY[currentRegion][currentNation].capital === city;
                const rRank = isCapital ? MilitaryRank.COL : [MilitaryRank.MAJ, MilitaryRank.LTC][Math.floor(Math.random() * 2)];
                const level = generateMilitaryLevelByRank(rRank);
                const id = `npc_auto_cmdr_${city}_${currentNation}`;
                
                const gender = Math.random() > 0.5 ? "남성" : "여성";
                const genderParam = gender === "남성" ? "male" : "female";
                const name = generateName(currentNation, genderParam);
                const race = getRaceByNation(currentNation);
                const npc: SimpleStudent = assignRandomCombatStyle({
                    id, name, age: `${35 + Math.floor(Math.random() * 15)}세`,
                    birthYear: cYear - (35 + Math.floor(Math.random() * 15)), gender,
                    race: race, nation: currentNation, level, classType: "군인",
                    personality: MBTI_LIST[Math.floor(Math.random() * MBTI_LIST.length)],
                    appearance: `${city}의 안보를 책임지는 노련한 지휘관입니다.`,
                    stats: generateCompanionStats(level), affection: 0, job: JobType.SOLDIER,
                    militaryRank: rRank, merit: MILITARY_RANK_THRESHOLD[rRank], isStaticRank: true, origin: "군대", originName: `${city} 지휘부`,
                    visualUrl: generateDefaultVisualUrl(name, currentNation, race, gender)
                }, true);
                newChar.socialNetwork!.push(npc);
                newChar.militaryData!.regionalAppointments![city] = id;
                needsUpdate = true;
            }

            if (!newChar.militaryData!.regionalViceAppointments![city]) {
                const rRank = [MilitaryRank.SLT, MilitaryRank.FLT, MilitaryRank.CPT][Math.floor(Math.random() * 3)];
                const level = generateMilitaryLevelByRank(rRank);
                const id = `npc_auto_vice_${city}_${currentNation}`;
                
                const gender = Math.random() > 0.5 ? "남성" : "여성";
                const genderParam = gender === "남성" ? "male" : "female";
                const name = generateName(currentNation, genderParam);
                const race = getRaceByNation(currentNation);
                const npc: SimpleStudent = assignRandomCombatStyle({
                    id, name, age: `${24 + Math.floor(Math.random() * 10)}세`,
                    birthYear: cYear - (24 + Math.floor(Math.random() * 10)), gender,
                    race: race, nation: currentNation, level, classType: "군인",
                    personality: MBTI_LIST[Math.floor(Math.random() * MBTI_LIST.length)],
                    appearance: `${city} 지휘부를 보좌하는 유능한 장교입니다.`,
                    stats: generateCompanionStats(level), affection: 0, job: JobType.SOLDIER,
                    militaryRank: rRank, merit: MILITARY_RANK_THRESHOLD[rRank], isStaticRank: true, origin: "군대", originName: `${city} 지휘부`,
                    visualUrl: generateDefaultVisualUrl(name, currentNation, race, gender)
                }, true);
                newChar.socialNetwork!.push(npc);
                newChar.militaryData!.regionalViceAppointments![city] = id;
                needsUpdate = true;
            }
        });

        if (needsUpdate) {
            onUpdateCharacter(newChar, "");
        }
    }, []);

    const isRegionalCommander = useMemo(() => {
        if (!mData) return false;
        const currentLocCity = character.currentLocation?.city;
        if (!currentLocCity) return false;

        const cmdrId = mData.regionalAppointments?.[currentLocCity];
        const viceId = mData.regionalViceAppointments?.[currentLocCity];

        return cmdrId === fallbackCommander.id || viceId === fallbackCommander.id;
    }, [mData, character.currentLocation, fallbackCommander.id]);
    const isMemberBusy = (id: string) => {
        if (character.base?.dispatched?.some(d => d.companionId === id)) return true;
        if (Object.values(character.base?.assignments || {}).includes(id)) return true;
        return false;
    };

    const eligibleOfficers = useMemo(() => {
        return allMilitaryPotentials.filter(o => {
            const oRank = (o as any).militaryRank || MilitaryRank.PVT;
            const oRankIdx = MILITARY_RANK_ORDER.indexOf(oRank);
            const isAtLeastOfficer = oRankIdx >= MILITARY_RANK_ORDER.indexOf(MilitaryRank.SLT);
            const isNotTooHigh = oRankIdx < MILITARY_RANK_ORDER.indexOf(MilitaryRank.MG); 
            return isAtLeastOfficer && isNotTooHigh;
        });
    }, [allMilitaryPotentials]);

    const getPositionTitle = () => {
        if (!mData) return "";
        if (rank === MilitaryRank.GEN) return "국가 군사총괄대장";
        if (rank === MilitaryRank.LG) return "국가 친위대장";
        if (rank === MilitaryRank.MG) return "국가 정예부대장";
        return isRegionalCommander ? "지역 사령관(대장)" : "관할 구역 지휘부";
    };

    const handleAssignRegion = () => {
        if (!selectedCity) {
            setResultData({ type: 'warning', title: '지역 미선택', message: '부임할 도시를 목록에서 선택해주세요.', items: [] });
            return;
        }
        
        const targetOfficer = eligibleOfficers.find(o => o.id === selectedMemberId);
        if (!targetOfficer) return;

        const targetRank = (targetOfficer as any).militaryRank || MilitaryRank.PVT;
        const targetRankIdx = MILITARY_RANK_ORDER.indexOf(targetRank);

        if (targetRankIdx >= MILITARY_RANK_ORDER.indexOf(MilitaryRank.MG)) {
            setResultData({ type: 'warning', title: '임명 제한', message: '소장(MG) 이상의 고위 장성은 국가 지휘부 보직만 가능합니다.', items: [] });
            return;
        }

        const isCapital = WORLD_GEOGRAPHY[selectedRegion]?.[nation]?.capital === selectedCity;
        let jobTitle = "";

        if (appointmentType === 'Vice') {
            if (targetRankIdx >= MILITARY_RANK_ORDER.indexOf(MilitaryRank.SLT) && targetRankIdx <= MILITARY_RANK_ORDER.indexOf(MilitaryRank.CPT)) {
                jobTitle = "지역 부대장";
            } else {
                setResultData({ type: 'warning', title: '자격 부적합', message: '지역 부대장은 소위~대위 계급의 장교가 적합합니다.', items: [] });
                return;
            }
        } else {
            const isMajToLtc = targetRankIdx >= MILITARY_RANK_ORDER.indexOf(MilitaryRank.MAJ) && targetRankIdx <= MILITARY_RANK_ORDER.indexOf(MilitaryRank.LTC);
            const isCol = targetRankIdx === MILITARY_RANK_ORDER.indexOf(MilitaryRank.COL);

            if (isMajToLtc) {
                if (isCapital) {
                    setResultData({ type: 'warning', title: '임명 제한', message: '수도 사령관은 대령 이상의 지휘관이 필요합니다.', items: [] });
                    return;
                }
                jobTitle = "지역 대장";
            } else if (isCol) {
                jobTitle = isCapital ? "수도 사령관(대장)" : "지역 대장";
            } else {
                setResultData({ type: 'warning', title: '자격 부적합', message: '지역 대장은 소령 이상의 지휘관이 필요합니다.', items: [] });
                return;
            }
        }

        setIsProcessing(true);
        setTimeout(() => {
            const newChar = JSON.parse(JSON.stringify(character)) as Character;
                  
            if (!newChar.militaryData) {
                newChar.militaryData = { rank: (newChar.militaryRank || MilitaryRank.PVT), enlistedDate: newChar.currentDate || '2000-01-01', merit: 0, completedMissions: 0, availableMissions: [], activeMissions: [] };
            }
            if (!newChar.militaryData.regionalAppointments) newChar.militaryData.regionalAppointments = {};
            if (!newChar.militaryData.regionalViceAppointments) newChar.militaryData.regionalViceAppointments = {};
            if (!newChar.militaryData.regionStats) newChar.militaryData.regionStats = {};

            if (!newChar.militaryData.regionStats[selectedCity]) {
                newChar.militaryData.regionStats[selectedCity] = { budget: 50000, security: 50, sentiment: 50, taxRate: 10 };
            }

            let logMsg = `[군사 인사] ${fallbackCommander.name} 지휘관이 ${targetOfficer.name} 대원을 ${selectedCity}의 ${jobTitle}(으)로 발령했습니다.`;

            // [NEW] 부대장 임명 시 해당 지역 대장과의 인연 등록 로직
            if (appointmentType === 'Vice') {
                const commanderId = newChar.militaryData?.regionalAppointments?.[selectedCity];
                if (commanderId) {
                    const cmdrInPotentials = allMilitaryPotentials.find(p => p.id === commanderId);
                    if (cmdrInPotentials) {
                        // 1. 부대장(Appointee)의 관계 설정
                        const updateRelation = (entity: any) => {
                            if (!entity.relations) entity.relations = {};
                            entity.relations[commanderId] = { targetId: commanderId, affection: 10, type: RelationType.ALLY };
                        };

                        if (selectedMemberId === 'player') updateRelation(newChar);
                        else {
                            const cIdx = newChar.companions.findIndex(c => c.id === selectedMemberId);
                            if (cIdx !== -1) updateRelation(newChar.companions[cIdx]);
                            else if (newChar.inactiveCompanions) {
                                const iIdx = newChar.inactiveCompanions.findIndex(c => c.id === selectedMemberId);
                                if (iIdx !== -1) updateRelation(newChar.inactiveCompanions[iIdx]);
                            }
                        }

                        // 2. 대장(Commander)의 관계 설정
                        if (commanderId.startsWith('npc_')) {
                            const npcIdx = newChar.socialNetwork?.findIndex(n => n.id === commanderId);
                            if (npcIdx !== undefined && npcIdx !== -1) {
                                const npc = newChar.socialNetwork![npcIdx];
                                if (!npc.relations) npc.relations = {};
                                npc.relations[selectedMemberId] = { targetId: selectedMemberId, affection: 10, type: RelationType.ALLY };
                                // [CORE] 관계가 형성되었으므로 호감도 1 부여 (목록 노출 트리거)
                                npc.affection = 1;
                            }
                        } else {
                            // 동료 대장인 경우
                            const updateCmdr = (c: any) => {
                                if (!c.relations) c.relations = {};
                                c.relations[selectedMemberId] = { targetId: selectedMemberId, affection: 10, type: RelationType.ALLY };
                            };
                            const cIdx = newChar.companions.findIndex(c => c.id === commanderId);
                            if (cIdx !== -1) updateCmdr(newChar.companions[cIdx]);
                        }
                        logMsg += `\n(부임지 대장인 '${cmdrInPotentials.name}'와(과) 긴밀한 지휘 체계를 형성했습니다.)`;
                    }
                }
            }
   // [MODIFIED] 보직 데이터 주입 로직 강화
            if (appointmentType === 'Commander') {
                newChar.militaryData.regionalAppointments[selectedCity] = selectedMemberId;
            } else {
                newChar.militaryData.regionalViceAppointments[selectedCity] = selectedMemberId;
            }
            if (selectedMemberId === 'player') {
                newChar.militaryData = { 
                    ...newChar.militaryData!, 
                    assignedCity: selectedCity,
                    assignedDistrict: isCapital ? "수도 방위 사령부" : "지역 사령부"
                };
                newChar.classType = `군인 (${targetRank}) [${jobTitle}]`;
            } else {
                if (appointmentType === 'Commander') {
                    if (!newChar.militaryData!.regionalAppointments) newChar.militaryData!.regionalAppointments = {};
                    newChar.militaryData!.regionalAppointments[selectedCity] = selectedMemberId;
                } else {
                    if (!newChar.militaryData!.regionalViceAppointments) newChar.militaryData!.regionalViceAppointments = {};
                    newChar.militaryData!.regionalViceAppointments[selectedCity] = selectedMemberId;
                }
                
                const updateMember = (c: Companion) => {
                    if (c.id === selectedMemberId) {
                        c.loyalty = Math.min(100, c.loyalty + 15);
                        c.classType = `군인 (${c.militaryRank}) [${jobTitle}]`;
                    }
                    return c;
                };
                newChar.companions = newChar.companions.map(updateMember);
                if (newChar.inactiveCompanions) newChar.inactiveCompanions = newChar.inactiveCompanions.map(updateMember);
            }

            onUpdateCharacter(newChar, logMsg);
            setResultData({
                type: 'success',
                title: '보직 임명 완료',
                message: `${targetOfficer.name} 대원을 ${selectedCity}의 ${jobTitle}(으)로 임명했습니다.`,
                items: [{ label: '대상', after: targetOfficer.name }, { label: '부임지', after: selectedCity }, { label: '보직', after: jobTitle }]
            });
            setIsProcessing(false);
        }, 1000);
    };

    const handleAppointDeputy = (companionId?: string) => {
        if (!isRegionalCommander) {
            setResultData({ type: 'warning', title: '권한 부족', message: '부대장 선임은 지역 \'대장\' 보직 수행자만 가능합니다.', items: [] });
            return;
        }
        const currentCity = mData?.assignedCity || character.currentLocation?.city;
        if (!currentCity) return;
        const newChar = { ...character };
        let deputy: any;
        if (companionId) {
            if (companionId === 'player') { deputy = newChar; } 
            else {
                const found = allComps.find(c => c.id === companionId);
                if (!found) return;
                deputy = found;
                deputy.loyalty = Math.min(100, deputy.loyalty + 20);
            }
        } else {
            const level = generateMilitaryLevelByRank(MilitaryRank.SLT);
            const gender = Math.random() > 0.5 ? "남성" : "여성";
            const genderParam = gender === "남성" ? "male" : "female";
            deputy = assignRandomCombatStyle({
                id: `mil_npc_${Math.random().toString(36).substring(7)}`,
                name: generateName(nation, genderParam), age: "28세", gender, race: "인간",
                appearance: `소위 제복을 입은 신임 장교.`, personality: "성실함", classType: `장교 (소위)`, job: JobType.SOLDIER,
                militaryRank: MilitaryRank.SLT, level, currentExp: 0, maxExp: level * 100, statPoints: 0,
                classTier: getTierByLevel(level), shinryokuType: SHINRYOKU_TYPES_LIST[Math.floor(Math.random()*SHINRYOKU_TYPES_LIST.length)],
                stats: generateCompanionStats(level), skills: [], equipment: {}, inventory: [], affection: 40, loyalty: 100, nation: nation
            } as Companion, true, true);
            if (!newChar.inactiveCompanions) newChar.inactiveCompanions = [];
            newChar.inactiveCompanions.push(deputy);
        }
        if (!newChar.militaryData!.regionalViceAppointments) newChar.militaryData!.regionalViceAppointments = {};
        newChar.militaryData!.regionalViceAppointments[currentCity] = companionId || deputy.id;
        onUpdateCharacter(newChar, `[군사 인사] ${fallbackCommander.name} 지휘관이 ${deputy.name} 대원을 ${currentCity} 부대장으로 선임했습니다.`);
        setResultData({ type: 'success', title: '부좌 선임 완료', message: `${deputy.name}이(가) 지휘부의 부대장이 되었습니다.`, items: [{ label: '이름', after: deputy.name }, { label: '부임지', after: currentCity }] });
    };

    const handleAppointSpecialMember = (type: 'Elite' | 'Royal', targetId: string) => {
        const newChar = { ...character };
        let targetEntity: any = targetId === 'player' ? newChar : allComps.find(c => c.id === targetId);
        if (!targetEntity) return;
        if (type === 'Royal') {
            const targetRank = targetEntity.militaryRank || MilitaryRank.PVT;
            const targetRankIdx = MILITARY_RANK_ORDER.indexOf(targetRank);
            if (targetRankIdx >= MILITARY_RANK_ORDER.indexOf(MilitaryRank.LG)) {
                setResultData({ type: 'warning', title: '선임 불가', message: '중장 이상의 지휘관은 친위대로 편성할 수 없습니다.', items: [] });
                return;
            }
        }
        if (targetId !== 'player') targetEntity.loyalty = 100;
        if (type === 'Elite') {
            if (!newChar.militaryData!.eliteMemberIds) newChar.militaryData!.eliteMemberIds = [];
            if (newChar.militaryData!.eliteMemberIds.length >= 3) { setResultData({ type: 'warning', title: '정원 초과', message: '정예 대원은 최대 3명입니다.', items: [] }); return; }
            if (!newChar.militaryData!.eliteMemberIds.includes(targetId)) newChar.militaryData!.eliteMemberIds.push(targetId);
        } else {
            if (!newChar.militaryData!.royalGuardMemberIds) newChar.militaryData!.royalGuardMemberIds = [];
            if (newChar.militaryData!.royalGuardMemberIds.length >= 5) { setResultData({ type: 'warning', title: '정원 초과', message: '친위 대원은 최대 5명입니다.', items: [] }); return; }
            if (!newChar.militaryData!.royalGuardMemberIds.includes(targetId)) newChar.militaryData!.royalGuardMemberIds.push(targetId);
        }
        onUpdateCharacter(newChar, `[특수 부대 편성] ${targetEntity.name}을(를) ${type === 'Elite' ? '정예' : '친위'} 대원으로 선임했습니다.`);
        setResultData({ type: 'success', title: '특수 대원 선임', message: `${targetEntity.name}이(가) 특수 부대원이 되었습니다.`, items: [] });
    };

    const handleDismissSpecialMember = (type: 'Elite' | 'Royal', targetId: string) => {
        const newChar = { ...character };
        let targetName = targetId === 'player' ? newChar.name : allComps.find(c => c.id === targetId)?.name || 'Unknown';
        if (type === 'Elite') newChar.militaryData!.eliteMemberIds = newChar.militaryData!.eliteMemberIds?.filter(id => id !== targetId);
        else newChar.militaryData!.royalGuardMemberIds = newChar.militaryData!.royalGuardMemberIds?.filter(id => id !== targetId);
        onUpdateCharacter(newChar, `[특수 부대 해체] ${targetName} 대원을 해임했습니다.`);
        setResultData({ type: 'info', title: '선발 해제 완료', message: `${targetName} 대원을 제외했습니다.`, items: [] });
    };

    const handleGeneralAppointment = (type: 'Regional' | 'Elite' | 'Royal', city?: string, targetId?: string) => {
        if (!targetId) return;
        const newChar = { ...character };
        let targetName = "";
        let targetRank: MilitaryRank;
        if (targetId === 'player') { targetName = newChar.name; targetRank = newChar.militaryRank || MilitaryRank.PVT; } 
        else {
            const companion = allComps.find(c => c.id === targetId);
            if (!companion) return;
            targetName = companion.name;
            targetRank = companion.militaryRank || MilitaryRank.PVT;
            companion.loyalty = 100;
        }
        const cRankIdx = MILITARY_RANK_ORDER.indexOf(targetRank);
        if (type === 'Regional' && cRankIdx >= MILITARY_RANK_ORDER.indexOf(MilitaryRank.MG)) {
            setResultData({ type: 'warning', title: '임명 불가', message: '소장 이상의 지휘관은 지역 보직에 임명할 수 없습니다.', items: [] });
            return;
        }
        if (type === 'Regional') {
            if (cRankIdx < MILITARY_RANK_ORDER.indexOf(MilitaryRank.MAJ) || cRankIdx > MILITARY_RANK_ORDER.indexOf(MilitaryRank.COL)) {
                setResultData({ type: 'warning', title: '계급 불일치', message: '지역 사령관은 소령~대령만 가능합니다.', items: [] });
                return;
            }
            if (!newChar.militaryData!.regionalAppointments) newChar.militaryData!.regionalAppointments = {};
            newChar.militaryData!.regionalAppointments[city!] = targetId;
        } else if (type === 'Elite') {
            if (cRankIdx !== MILITARY_RANK_ORDER.indexOf(MilitaryRank.MG)) {
                setResultData({ type: 'warning', title: '계급 불일치', message: '정예부대장은 소장만 가능합니다.', items: [] });
                return;
            }
            newChar.militaryData!.eliteCommanderId = targetId;
        } else if (type === 'Royal') {
            if (cRankIdx !== MILITARY_RANK_ORDER.indexOf(MilitaryRank.LG)) {
                setResultData({ type: 'warning', title: '계급 불일치', message: '친위대장은 중장만 가능합니다.', items: [] });
                return;
            }
            newChar.militaryData!.royalGuardCommanderId = targetId;
        }
        onUpdateCharacter(newChar, `[인사 발령] ${targetName}을(를) 보직 임명했습니다.`);
        setResultData({ type: 'success', title: '인사 발령 성공', message: `${targetName}에게 임무를 부여했습니다.`, items: [] });
    };

    const allCompsInMilitary = allComps.filter(c => c.job === JobType.SOLDIER && c.nation === nation);

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-in fade-in">
            {resultData && <ActionResultModal data={resultData} onClose={() => setResultData(null)} />}
            {isDispatchOpen && <MilitaryDispatchModal character={character} onClose={() => setIsDispatchOpen(false)} onUpdateCharacter={onUpdateCharacter} />}
            {isSpecialDispatchOpen && <MilitarySpecialDispatchModal character={character} onClose={() => setIsSpecialDispatchOpen(false)} onUpdateCharacter={onUpdateCharacter} />}

            <div className="bg-slate-900 border border-slate-800 w-full max-w-5xl h-[90vh] md:h-[85vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden relative">
                <div className="p-4 md:p-5 border-b border-slate-800 bg-slate-950/80 flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-sky-950/60 border border-sky-800/60 flex items-center justify-center text-sky-400">
                            <TowerControl size={20} />
                        </div>
                        <div>
                            <h2 className="text-base md:text-xl font-bold text-white">군사 시설 및 보직 관리</h2>
                            <p className="text-[11px] text-slate-400">지휘관: {fallbackCommander.name} ({fallbackCommander.rank}) · 직책: {getPositionTitle()}</p>
                        </div>
                    </div>
                    <button type="button" onClick={onClose} className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition-colors"><X size={20} /></button>
                </div>

                <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
                    <div className="w-full md:w-48 bg-slate-950/90 border-b md:border-b-0 md:border-r border-slate-800 flex flex-row md:flex-col shrink-0 overflow-x-auto md:overflow-visible no-scrollbar p-2 gap-1.5">
                        {showAppointmentTab && (
                            <button 
                                type="button"
                                onClick={() => setActiveTab('appointment')} 
                                className={`flex-1 md:flex-none p-2.5 md:p-3 rounded-xl font-bold flex items-center justify-center md:justify-start transition-all whitespace-nowrap text-xs md:text-sm gap-2 ${activeTab === 'appointment' ? 'bg-sky-950/70 border border-sky-500/60 text-sky-400' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'}`}
                            >
                                <MapPin size={16} className="shrink-0"/> <span>보직 및 부임</span>
                            </button>
                        )}
                        {isOfficer && (
                            <button 
                                type="button"
                                onClick={() => setActiveTab('command')} 
                                className={`flex-1 md:flex-none p-2.5 md:p-3 rounded-xl font-bold flex items-center justify-center md:justify-start transition-all whitespace-nowrap text-xs md:text-sm gap-2 ${activeTab === 'command' ? 'bg-sky-950/70 border border-sky-500/60 text-sky-400' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'}`}
                            >
                                <Users size={16} className="shrink-0"/> <span>부대 작전</span>
                            </button>
                        )}
                        {(isMajorGeneral || isLtGeneral || isGeneral) && (
                            <button 
                                type="button"
                                onClick={() => setActiveTab('special')} 
                                className={`flex-1 md:flex-none p-2.5 md:p-3 rounded-xl font-bold flex items-center justify-center md:justify-start transition-all whitespace-nowrap text-xs md:text-sm gap-2 ${activeTab === 'special' ? 'bg-amber-950/70 border border-amber-500/60 text-amber-400' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'}`}
                            >
                                <Star size={16} className="shrink-0"/> <span>특수 부대</span>
                            </button>
                        )}
                        {isGeneral && (
                            <button 
                                type="button"
                                onClick={() => setActiveTab('general')} 
                                className={`flex-1 md:flex-none p-2.5 md:p-3 rounded-xl font-bold flex items-center justify-center md:justify-start transition-all whitespace-nowrap text-xs md:text-sm gap-2 ${activeTab === 'general' ? 'bg-rose-950/70 border border-rose-500/60 text-rose-400' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'}`}
                            >
                                <Crown size={16} className="shrink-0"/> <span>전군 지휘</span>
                            </button>
                        )}
                    </div>

                    <div className="flex-1 p-4 md:p-6 overflow-y-auto bg-slate-900/40">
                        {activeTab === 'appointment' && (
                            <div className="space-y-6">
                                <div className="text-center">
                                    <Building2 size={36} className="mx-auto text-sky-400 mb-2 opacity-60" />
                                    <h3 className="text-base md:text-lg font-bold text-white">지역 보직 인사 센터</h3>
                                    <p className="text-xs text-slate-400 mt-1">지휘관 및 부관을 관할 지역에 부임시킵니다.</p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <div className="space-y-4">
                                        <h4 className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                                            <Users size={14} className="text-sky-400"/> 대상 장교 선택
                                        </h4>
                                        <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto pr-1">
                                            {eligibleOfficers.map(off => {
                                                const isSelected = selectedMemberId === off.id;
                                                const busy = isMemberBusy(off.id);
                                                return (
                                                    <button
                                                        key={off.id}
                                                        type="button"
                                                        onClick={() => setSelectedMemberId(off.id)}
                                                        disabled={busy}
                                                        className={`p-3 rounded-xl border text-left transition-all flex items-center justify-between ${isSelected ? 'bg-sky-950/50 border-sky-500 shadow-sm' : busy ? 'opacity-40 border-slate-800 bg-slate-950/30' : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'}`}
                                                    >
                                                        <div className="flex items-center gap-2.5">
                                                            <div className={`p-1.5 rounded-lg ${isSelected ? 'bg-sky-600 text-white' : 'bg-slate-900 text-slate-400'}`}>
                                                                <UserCheck size={16}/>
                                                            </div>
                                                            <div>
                                                                <div className="font-bold text-xs md:text-sm text-slate-200">{off.name}</div>
                                                                <div className="text-[10px] text-slate-400">{(off as any).militaryRank}</div>
                                                            </div>
                                                        </div>
                                                        {busy ? <Lock size={14} className="text-rose-400"/> : isSelected && <CheckCircle size={16} className="text-sky-400"/>}
                                                    </button>
                                                );
                                            })}
                                        </div>

                                        <h4 className="text-xs font-bold text-slate-300 flex items-center gap-1.5 mt-4">
                                            <ListOrdered size={14} className="text-sky-400"/> 지역별 임명 현황
                                        </h4>
                                        <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 max-h-48 overflow-y-auto space-y-1.5">
                                            {WORLD_GEOGRAPHY[selectedRegion]?.[nation]?.cities.map(cityName => {
                                                const cmdrId = mData?.regionalAppointments?.[cityName];
                                                const viceId = mData?.regionalViceAppointments?.[cityName];
                                                const cmdr = allMilitaryPotentials.find(p => p.id === cmdrId);
                                                const vice = allMilitaryPotentials.find(p => p.id === viceId);
                                                if (!cmdr && !vice) return null;
                                                return (
                                                    <div key={cityName} className="p-2 border-b border-slate-800/80 last:border-0 flex justify-between items-center text-xs">
                                                        <span className="font-bold text-sky-400 w-20 truncate">{cityName}</span>
                                                        <div className="flex-1 flex gap-3 justify-end text-[11px]">
                                                            <span className="text-slate-300">대장: {cmdr ? cmdr.name : '공석'}</span>
                                                            <span className="text-slate-400">부대장: {vice ? vice.name : '공석'}</span>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <h4 className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                                            <MapPin size={14} className="text-sky-400"/> 부임 지역 및 보직 설정
                                        </h4>
                                        <div className="bg-slate-950/80 p-5 rounded-2xl border border-slate-800 space-y-4">
                                            <div className="flex gap-2 p-1 bg-slate-900 rounded-xl border border-slate-800">
                                                <button 
                                                    type="button"
                                                    onClick={() => setAppointmentType('Commander')} 
                                                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${appointmentType === 'Commander' ? 'bg-sky-600 text-white' : 'text-slate-400'}`}
                                                >
                                                    지역 대장
                                                </button>
                                                <button 
                                                    type="button"
                                                    onClick={() => setAppointmentType('Vice')} 
                                                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${appointmentType === 'Vice' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}
                                                >
                                                    지역 부대장
                                                </button>
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[11px] text-slate-400 font-bold">대륙 권역</label>
                                                <select className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white text-xs outline-none focus:border-sky-500" value={selectedRegion} onChange={e => setSelectedRegion(e.target.value)}>{Object.keys(WORLD_GEOGRAPHY).map(r => <option key={r} value={r}>{r}</option>)}</select>
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[11px] text-slate-400 font-bold">부임 도시</label>
                                                <select className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white text-xs outline-none focus:border-sky-500" value={selectedCity} onChange={e => setSelectedCity(e.target.value)}><option value="">도시 선택</option>{(WORLD_GEOGRAPHY[selectedRegion]?.[nation]?.cities || []).map(c => <option key={c} value={c}>{c}</option>)}</select>
                                            </div>
                                            <button 
                                                type="button"
                                                onClick={handleAssignRegion} 
                                                disabled={isProcessing || !selectedCity || !selectedMemberId} 
                                                className="w-full py-3 bg-sky-600 hover:bg-sky-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 text-xs md:text-sm active:scale-[0.99]"
                                            >
                                                {isProcessing ? <Loader2 size={16} className="animate-spin"/> : <MapPin size={16}/>} 보직 임명 및 발령
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'special' && (
                            <div className="space-y-6">
                                <div className="text-center">
                                    <Sparkles size={36} className="mx-auto text-amber-400 mb-2" />
                                    <h3 className="text-base md:text-lg font-bold text-white">특수 부대 선발</h3>
                                    <p className="text-xs text-slate-400 mt-1">최정예 병력을 직접 선발하여 특수 부대를 편성합니다.</p>
                                </div>
                                <div className="bg-slate-950/80 p-4 md:p-5 rounded-2xl border border-slate-800 space-y-4">
                                    <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                                        <h4 className="text-xs md:text-sm font-bold text-amber-400 flex items-center gap-1.5">
                                            {isLtGeneral || isGeneral ? <><ShieldCheck size={16}/> 국왕 친위대 선발</> : <><Target size={16}/> 국가 정예 대원 선발</>}
                                        </h4>
                                        <span className="text-xs font-mono text-amber-400 font-bold">
                                            {isLtGeneral || isGeneral ? `${mData?.royalGuardMemberIds?.length || 0}/5` : `${mData?.eliteMemberIds?.length || 0}/3`}
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-1 gap-2.5 max-h-80 overflow-y-auto pr-1">
                                        {allMilitaryPotentials.map(p => {
                                            const isElite = mData?.eliteMemberIds?.includes(p.id);
                                            const isRoyal = mData?.royalGuardMemberIds?.includes(p.id);
                                            const isSpecial = isElite || isRoyal;
                                            const busy = isMemberBusy(p.id);
                                            return (
                                                <div key={p.id} className={`p-3 rounded-xl border flex justify-between items-center transition-all ${isSpecial ? 'border-amber-500/50 bg-amber-950/30' : 'border-slate-800 bg-slate-900/60'}`}>
                                                    <div className="flex items-center gap-3">
                                                        <div className={`p-2 rounded-lg ${isSpecial ? 'bg-amber-900/40 text-amber-400' : 'bg-slate-800 text-slate-400'}`}>
                                                            {isRoyal ? <ShieldCheck size={20}/> : <Medal size={20}/>}
                                                        </div>
                                                        <div>
                                                            <div className="text-xs md:text-sm font-bold text-white">{p.name}</div>
                                                            <div className="text-[10px] text-slate-400">{(p as any).militaryRank} · Lv.{p.level}</div>
                                                        </div>
                                                    </div>
                                                    {isSpecial ? (
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-[10px] font-bold text-amber-300 bg-amber-950 border border-amber-800 px-2 py-0.5 rounded">
                                                                {isRoyal ? '친위대' : '정예'}
                                                            </span>
                                                            <button 
                                                                type="button"
                                                                onClick={() => handleDismissSpecialMember(isRoyal ? 'Royal' : 'Elite', p.id)} 
                                                                className="p-1.5 bg-rose-950/40 hover:bg-rose-900/60 text-rose-400 border border-rose-800/50 rounded-lg transition-all"
                                                            >
                                                                <UserMinus size={15}/>
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <button 
                                                            type="button"
                                                            disabled={busy} 
                                                            onClick={() => handleAppointSpecialMember(isLtGeneral || isGeneral ? 'Royal' : 'Elite', p.id)} 
                                                            className={`px-4 py-2 rounded-lg font-bold text-xs shadow-md transition-all ${busy ? 'bg-slate-800 text-slate-500 cursor-not-allowed' : 'bg-amber-600 hover:bg-amber-500 text-slate-950'}`}
                                                        >
                                                            {busy ? '임무 중' : '선발'}
                                                        </button>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'command' && (
                            <div className="space-y-4">
                                <div className="bg-slate-950/80 p-5 rounded-2xl border border-slate-800 flex flex-col gap-3">
                                    <div className="flex items-center gap-3">
                                        <div className="p-3 bg-sky-950/60 border border-sky-800/60 rounded-xl text-sky-400">
                                            <Send size={20}/>
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-xs md:text-sm text-white">군사 작전 파견</h4>
                                            <p className="text-xs text-slate-400">소속 부대원들을 전선으로 파견하여 공적치와 자금을 획득합니다.</p>
                                        </div>
                                    </div>
                                    <button 
                                        type="button"
                                        onClick={() => setIsDispatchOpen(true)} 
                                        className="w-full py-3 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-xl text-xs md:text-sm shadow-md transition-all active:scale-[0.99]"
                                    >
                                        작전 파견 관리실 입장
                                    </button>
                                </div>

                                {(mData?.eliteMemberIds?.length! > 0 || mData?.royalGuardMemberIds?.length! > 0) && (
                                    <div className="bg-slate-950/80 p-5 rounded-2xl border border-slate-800 flex flex-col gap-3">
                                        <div className="flex items-center gap-3">
                                            <div className="p-3 bg-rose-950/60 border border-rose-800/60 rounded-xl text-rose-400">
                                                <ShieldAlert size={20}/>
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-xs md:text-sm text-white">기밀 특수 작전</h4>
                                                <p className="text-xs text-slate-400">정예 및 친위 대원을 국가적 기밀 임무에 투입합니다.</p>
                                            </div>
                                        </div>
                                        <button 
                                            type="button"
                                            onClick={() => setIsSpecialDispatchOpen(true)} 
                                            className="w-full py-3 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-xs md:text-sm shadow-md transition-all active:scale-[0.99]"
                                        >
                                            특수 작전실 개방
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'general' && (
                            <div className="space-y-6">
                                <div className="text-center">
                                    <div className="w-14 h-14 rounded-2xl bg-rose-950/60 border border-rose-800/60 flex items-center justify-center mx-auto mb-2 text-rose-400">
                                        <Crown size={28} />
                                    </div>
                                    <h3 className="text-base md:text-lg font-bold text-white">전군 인사 통제소</h3>
                                    <p className="text-xs text-slate-400 mt-1">국가 군사총괄대장의 최고 권한으로 전국의 지휘관 배치를 통제합니다.</p>
                                </div>

                                <div className="space-y-5">
                                    <div className="bg-slate-950/80 p-5 rounded-2xl border border-slate-800 space-y-4">
                                        <h4 className="text-xs md:text-sm font-bold text-amber-400 flex items-center gap-1.5">
                                            <ShieldAlert size={16}/> 국가 최고 지휘부 인사
                                        </h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="bg-slate-900/70 p-4 rounded-xl border border-slate-800 space-y-2">
                                                <label className="text-[11px] text-slate-400 font-bold block">국가 정예부대장 (소장 필요)</label>
                                                {mData?.eliteCommanderId ? (
                                                    <div className="flex justify-between items-center bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                                                        <span className="text-xs font-bold text-white">
                                                            {allMilitaryPotentials.find(p => p.id === mData.eliteCommanderId)?.name || '지휘관'}
                                                        </span>
                                                        <button type="button" onClick={() => handleGeneralAppointment('Elite', undefined, 'player')} className="text-[11px] text-rose-400 font-bold hover:underline">해임</button>
                                                    </div>
                                                ) : (
                                                    <select 
                                                        className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-slate-300 outline-none focus:border-sky-500"
                                                        onChange={(e) => handleGeneralAppointment('Elite', undefined, e.target.value)}
                                                        defaultValue=""
                                                    >
                                                        <option value="" disabled>사령관 선택 (소장 전용)</option>
                                                        {allMilitaryPotentials.filter(p => (p as any).militaryRank === MilitaryRank.MG).map(p => <option key={p.id} value={p.id}>{p.name} ({(p as any).militaryRank})</option>)}
                                                    </select>
                                                )}
                                            </div>

                                            <div className="bg-slate-900/70 p-4 rounded-xl border border-slate-800 space-y-2">
                                                <label className="text-[11px] text-slate-400 font-bold block">국가 친위대장 (중장 필요)</label>
                                                {mData?.royalGuardCommanderId ? (
                                                    <div className="flex justify-between items-center bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                                                        <span className="text-xs font-bold text-white">
                                                            {allMilitaryPotentials.find(p => p.id === mData.royalGuardCommanderId)?.name || '지휘관'}
                                                        </span>
                                                        <button type="button" onClick={() => handleGeneralAppointment('Royal', undefined, 'player')} className="text-[11px] text-rose-400 font-bold hover:underline">해임</button>
                                                    </div>
                                                ) : (
                                                    <select 
                                                        className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-slate-300 outline-none focus:border-amber-500"
                                                        onChange={(e) => handleGeneralAppointment('Royal', undefined, e.target.value)}
                                                        defaultValue=""
                                                    >
                                                        <option value="" disabled>사령관 선택 (중장 전용)</option>
                                                        {allMilitaryPotentials.filter(p => (p as any).militaryRank === MilitaryRank.LG).map(p => <option key={p.id} value={p.id}>{p.name} ({(p as any).militaryRank})</option>)}
                                                    </select>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* 지역 대장 배치 */}
                                    <div className="bg-slate-950/80 p-5 rounded-2xl border border-slate-800 space-y-3">
                                        <h4 className="text-xs md:text-sm font-bold text-sky-400 flex items-center gap-1.5">
                                            <MapPin size={16}/> 지역 대장 배치 현황 (소령~대령)
                                        </h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                                            {WORLD_GEOGRAPHY[selectedRegion]?.[nation]?.cities.map(cityName => {
                                                const assignedId = mData?.regionalAppointments?.[cityName];
                                                const assignedP = allMilitaryPotentials.find(p => p.id === assignedId);
                                                return (
                                                    <div key={cityName} className="p-3 bg-slate-900/70 rounded-xl border border-slate-800 flex flex-col gap-2">
                                                        <div className="flex justify-between items-center border-b border-slate-800 pb-1.5">
                                                            <span className="text-xs font-bold text-slate-200">{cityName}</span>
                                                            <span className="text-[10px] bg-sky-950 text-sky-300 border border-sky-800 px-1.5 py-0.5 rounded font-bold">지역 대장</span>
                                                        </div>
                                                        {assignedP ? (
                                                            <div className="flex justify-between items-center text-xs">
                                                                <span className="font-bold text-white">{assignedP.name} ({(assignedP as any).militaryRank})</span>
                                                                <button type="button" onClick={() => {
                                                                    const newApps = {...mData!.regionalAppointments};
                                                                    delete newApps[cityName];
                                                                    onUpdateCharacter({...character, militaryData: {...mData!, regionalAppointments: newApps}}, `${cityName} 대장을 보직 해임했습니다.`);
                                                                }} className="text-[11px] text-rose-400 hover:underline">해임</button>
                                                            </div>
                                                        ) : (
                                                            <p className="text-[11px] text-slate-500">임명된 지휘관 없음</p>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* 지역 부대장 배치 */}
                                    <div className="bg-slate-950/80 p-5 rounded-2xl border border-slate-800 space-y-3">
                                        <h4 className="text-xs md:text-sm font-bold text-indigo-400 flex items-center gap-1.5">
                                            <Shield size={16}/> 지역 부대장 배치 현황 (소위~대위)
                                        </h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                                            {WORLD_GEOGRAPHY[selectedRegion]?.[nation]?.cities.map(cityName => {
                                                const assignedId = mData?.regionalViceAppointments?.[cityName];
                                                const assignedP = allMilitaryPotentials.find(p => p.id === assignedId);
                                                return (
                                                    <div key={cityName} className="p-3 bg-slate-900/70 rounded-xl border border-slate-800 flex flex-col gap-2">
                                                        <div className="flex justify-between items-center border-b border-slate-800 pb-1.5">
                                                            <span className="text-xs font-bold text-slate-200">{cityName}</span>
                                                            <span className="text-[10px] bg-indigo-950 text-indigo-300 border border-indigo-800 px-1.5 py-0.5 rounded font-bold">지역 부대장</span>
                                                        </div>
                                                        {assignedP ? (
                                                            <div className="flex justify-between items-center text-xs">
                                                                <span className="font-bold text-white">{assignedP.name} ({(assignedP as any).militaryRank})</span>
                                                                <button type="button" onClick={() => {
                                                                    const newApps = {...mData!.regionalViceAppointments};
                                                                    delete newApps[cityName];
                                                                    onUpdateCharacter({...character, militaryData: {...mData!, regionalViceAppointments: newApps}}, `${cityName} 부대장을 보직 해임했습니다.`);
                                                                }} className="text-[11px] text-rose-400 hover:underline">해임</button>
                                                            </div>
                                                        ) : (
                                                            <p className="text-[11px] text-slate-500">임명된 부대장 없음</p>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="p-4 bg-slate-950 border-t border-slate-800 flex justify-between items-center shrink-0">
                    <div className="flex gap-2 md:gap-4">
                         <div className="flex items-center text-xs text-amber-400 font-mono bg-amber-950/40 px-2.5 py-1 rounded-lg border border-amber-800/50">
                             <Coins size={13} className="mr-1.5"/> 보유 골드: {character.money.toLocaleString()} 골드
                         </div>
                         <div className="flex items-center text-xs text-sky-400 font-mono bg-sky-950/40 px-2.5 py-1 rounded-lg border border-sky-800/50">
                             <Medal size={13} className="mr-1.5"/> 공적치: {character.militaryData?.merit || 0}
                         </div>
                    </div>
                    <button type="button" onClick={onClose} className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold text-xs border border-slate-700 transition-colors">닫기</button>
                </div>
            </div>
        </div>
    );
};

export default MilitaryFacilityModal;
