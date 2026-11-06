import React, { useState, useEffect } from 'react';
import { Character, MilitaryRank, Quest, JobType, Companion, ClassTier, SimpleStudent } from '../types';
import { 
    X, Shield, Sword, Target, Skull, FileText, UserPlus, Users, Info, Clock, 
    CheckCircle, Loader2, Coins, MapPin, Building2, AlertTriangle, ShieldCheck, 
    Crown, RefreshCw, LogOut, ChevronRight, Award, Dumbbell, Globe, Flame, 
    ShieldAlert, Compass, Truck, Package, Eye, Lock, Sparkles, ArrowUpDown, Search
} from 'lucide-react';
import { MILITARY_RANK_THRESHOLD, MILITARY_SALARY, MILITARY_RANK_ORDER, SHINRYOKU_TYPES_LIST, COMBAT_STYLE_CONFIG, HUMANOID_CLASSES, getHumanoidClassByTier } from '../constants';
import { generateName, generateCompanionStats, getTierByLevel, generateMilitaryLevelByRank, getYear, generateDefaultVisualUrl, assignRandomCombatStyle } from '../utils';
import { generateLocalMilitaryMissions } from '../services/militaryService';
import { NATION_THEMES } from '../monsterfield';
import { WORLD_LOOT_TABLES } from '../monsterLootTable';
import { getBossByLocation } from '../bossMonsters';
import { generateInitialDiplomacy } from '../nationalDiplomacy';
import ActionResultResultModal, { ResultData } from './ActionResultModal';
import MilitaryFacilityModal from './MilitaryFacilityModal';
import MilitaryTrainingModal from './MilitaryTrainingModal'; 
import NationalDiplomacyModal from './NationalDiplomacyModal'; 
import WarTacticsModal from './WarTacticsModal'; 
import { getShinryokuThematicClassName, checkAndInitializeLiberationEligibility, getCompanionCP } from '../services/companionGrowthService';
import { determineRecruitClassTier } from '../services/classLiberationHelper';

interface Props {
    character: Character;
    onClose: () => void;
    onUpdateCharacter: (newChar: Character, logMsg: string) => void;
    onAction: (action: string) => void;
}

type Tab = 'enlist' | 'duty' | 'war' | 'promotion' | 'recruit' | 'command';

const MilitaryModal: React.FC<Props> = ({ character, onClose, onUpdateCharacter, onAction }) => {
    const [activeTab, setActiveTab] = useState<Tab>('duty');
    const [resultData, setResultData] = useState<ResultData | null>(null);
    const [isGeneratingMissions, setIsGeneratingMissions] = useState(false);
    const [selectedMission, setSelectedMission] = useState<Quest | null>(null);
    const [recruits, setRecruits] = useState<Companion[]>(character.militaryData?.availableRecruits || []);
    const [isRecruitLoading, setIsRecruitLoading] = useState(false);
    const [confirmAction, setConfirmAction] = useState<(() => void) | null>(null);
    const [isFacilityOpen, setIsFacilityOpen] = useState(false);
    const [isTrainingOpen, setIsTrainingOpen] = useState(false);
    const [isDiplomacyOpen, setIsDiplomacyOpen] = useState(false); 
    const [warTacticsTargetNation, setWarTacticsTargetNation] = useState<string | null>(null); 
    const [selectedEnlisteeId, setSelectedEnlisteeId] = useState<string | null>('player');
    const [enlistSort, setEnlistSort] = useState<'eligibleFirst' | 'playerFirst' | 'partyFirst' | 'levelDesc' | 'levelAsc' | 'cpDesc' | 'cpAsc' | 'nameAsc'>('eligibleFirst');
    const [enlistFilter, setEnlistFilter] = useState<'all' | 'eligible' | 'party' | 'companion' | 'ineligible'>('all');
    const [enlistSearch, setEnlistSearch] = useState<string>('');

    const MissionIcon = ({ type }: { type: Quest['type'] }) => {
        switch(type) {
            case 'Subjugation': return <Skull className="text-rose-400" size={18}/>;
            case 'MilitaryPatrol': return <Compass className="text-sky-400" size={18}/>;
            case 'MilitaryDefense': return <Shield className="text-blue-400" size={18}/>;
            case 'MilitaryEscort': return <Truck className="text-cyan-400" size={18}/>;
            case 'MilitarySupply': return <Package className="text-amber-400" size={18}/>;
            case 'MilitaryRecon': return <Eye className="text-indigo-400" size={18}/>;
            case 'MilitaryRegionalDefense': return <ShieldAlert className="text-rose-500" size={18}/>;
            case 'MilitaryDiplomaticEscort': return <Truck className="text-sky-400" size={18}/>;
            case 'MilitaryDungeonSearch': return <Compass className="text-emerald-400" size={18}/>;
            case 'MilitaryAttackShare': return <Target className="text-rose-400" size={18}/>;
            default: return <FileText className="text-slate-400" size={18}/>;
        }
    };

    const loc = character.currentLocation || { nation: '대한민국', city: '서울' };
    const allComps = [...character.companions, ...(character.inactiveCompanions || [])];
    
    const getCommanderInfo = () => {
        const playerNation = character.nation;
        
        const eligiblePlayer = (character.job === JobType.SOLDIER && character.nation === playerNation) ? {
            id: 'player',
            name: character.name,
            rank: character.militaryRank || MilitaryRank.PVT,
            rankIdx: MILITARY_RANK_ORDER.indexOf(character.militaryRank || MilitaryRank.PVT),
            nation: character.nation
        } : null;

        const eligibleCompanions = allComps
            .filter(c => !c.isDead && c.job === JobType.SOLDIER && c.nation === playerNation && c.militaryRank)
            .map(c => ({
                id: c.id,
                name: c.name,
                rank: c.militaryRank!,
                rankIdx: MILITARY_RANK_ORDER.indexOf(c.militaryRank!),
                nation: c.nation || 'Unknown'
            }));

        const allInNationSoldiers = [...(eligiblePlayer ? [eligiblePlayer] : []), ...eligibleCompanions];
        if (allInNationSoldiers.length === 0) return null;

        return allInNationSoldiers.sort((a, b) => b.rankIdx - a.rankIdx)[0];
    };

    const commander = getCommanderInfo();
    const isEnlistedInParty = !!commander; 
    const isPlayerSoldier = character.job === JobType.SOLDIER && character.nation === loc.nation;
    
    const currentRank = commander?.rank || MilitaryRank.PVT;
    const rankIdx = commander?.rankIdx || 0;
    const currentMonth = character.currentDate?.substring(0, 7);
    const currentYear = getYear(character.currentDate || '2000-01-01');

    const officerRankThresholdIdx = MILITARY_RANK_ORDER.indexOf(MilitaryRank.SLT);
    const isOfficer = rankIdx >= officerRankThresholdIdx;
    
    const pendingInvasions = character.militaryData?.pendingInvasions || [];

    useEffect(() => {
        if (!isEnlistedInParty) {
            setActiveTab('enlist');
        } else {
            if (character.job === JobType.SOLDIER && !character.militaryData?.diplomacy) {
                const newChar = { ...character };
                newChar.militaryData!.diplomacy = generateInitialDiplomacy(character.nation);
                onUpdateCharacter(newChar, "");
            }
        }
    }, [isEnlistedInParty]);

    useEffect(() => {
        if (character.militaryData?.availableRecruits) {
            setRecruits(character.militaryData.availableRecruits);
        }
    }, [character.militaryData?.availableRecruits]);

    useEffect(() => {
        if (isEnlistedInParty && character.militaryData && character.militaryData.availableMissions === undefined) {
            handleRefreshMissions(true);
        }
    }, [isEnlistedInParty, character.militaryData?.availableMissions]);

    const getPositionTitle = () => {
        if (!commander) return "";
        if (currentRank === MilitaryRank.GEN) return "국가 군사총괄대장";
        if (currentRank === MilitaryRank.LG) return "국가 친위대장";
        if (currentRank === MilitaryRank.MG) return "국가 정예부대장";
        
        const mData = character.militaryData;
        const city = mData?.assignedCity || loc.city || "미정";
        const district = mData?.assignedDistrict;
        
        if (district === "수도 방위 사령부") return `${city} 수도 방위 사령관`;
        const isFieldOfficer = rankIdx >= MILITARY_RANK_ORDER.indexOf(MilitaryRank.MAJ);
        if (district === "지역 사령부" && isFieldOfficer) return `${city} 지역 대장`;
        if (district === "지역 사령부") return `${city} 지역 부대장`;
        
        return `${city} 지역 부대원`;
    };

    const handleRefreshMissions = async (isInitial = false) => {
        const mData = character.militaryData;
        if (!isInitial && mData && mData.lastRefreshDate === currentMonth) {
            setResultData({
                type: 'info',
                title: '작전 갱신 불가',
                message: '군사 작전 게시판은 한 달에 한 번만 갱신할 수 있습니다.\n다음 달에 새로운 작전 명령을 확인하십시오.',
                items: [{ label: '최근 갱신일', after: mData.lastRefreshDate || '기록 없음' }]
            });
            return;
        }

        setIsGeneratingMissions(true);
        try {
            const nation = loc.nation;
            const theme = NATION_THEMES[nation] || NATION_THEMES.default;
            
            let targetBands: string[] = [];
            if (rankIdx <= MILITARY_RANK_ORDER.indexOf(MilitaryRank.PFC)) {
                // 이등병 ~ 일병: 초보구역
                targetBands = ['beginner'];
            } else if (rankIdx <= MILITARY_RANK_ORDER.indexOf(MilitaryRank.SGT)) {
                // 상병 ~ 병장: 하급필드
                targetBands = ['lower'];
            } else if (rankIdx <= MILITARY_RANK_ORDER.indexOf(MilitaryRank.SFC)) {
                // 하사 ~ 중사: 중급필드
                targetBands = ['intermediate'];
            } else if (rankIdx <= MILITARY_RANK_ORDER.indexOf(MilitaryRank.WSG)) {
                // 상사 ~ 원사: 상급필드
                targetBands = ['advanced'];
            } else if (rankIdx <= MILITARY_RANK_ORDER.indexOf(MilitaryRank.FLT)) {
                // 소위 ~ 중위: 엘리트필드
                targetBands = ['elite'];
            } else if (rankIdx <= MILITARY_RANK_ORDER.indexOf(MilitaryRank.MAJ)) {
                // 대위 ~ 소령: 재앙지대
                targetBands = ['disaster'];
            } else if (rankIdx <= MILITARY_RANK_ORDER.indexOf(MilitaryRank.COL)) {
                // 중령 ~ 대령: 심연영역
                targetBands = ['abyss'];
            } else {
                // 준장, 소장, 중장, 대장: 신화영역
                targetBands = ['mythic'];
            }

            const monsterPool: string[] = [];
            targetBands.forEach(bId => {
                const pool = theme.monsters[bId] || [];
                monsterPool.push(...pool.map(m => typeof m === 'string' ? m : m.name));
            });
            
            const monthNum = parseInt(character.currentDate?.split('-')[1] || '3');
            const boss = getBossByLocation(loc.nation, loc.city, monthNum);

            const lootPoolSet = new Set<string>();
            const nationLootTable = WORLD_LOOT_TABLES[nation] || [];
            
            monsterPool.forEach(monsterName => {
                nationLootTable.forEach(lootEntry => {
                    if (lootEntry.type === 'Etc' && lootEntry.droppedBy && lootEntry.droppedBy.some((dn: string) => monsterName.includes(dn) || dn.includes(monsterName))) {
                        lootPoolSet.add(lootEntry.item || lootEntry.name);
                    }
                });
            });

            if (lootPoolSet.size === 0) {
                lootPoolSet.add("고기");
                lootPoolSet.add("가죽");
                lootPoolSet.add("철광석");
            }

            const lootPool = Array.from(lootPoolSet);
            const missions = generateLocalMilitaryMissions(character, monsterPool, boss.name, lootPool.length > 0 ? lootPool : ["철광석", "가죽", "식량"]);

            const parsedMissions = missions.map(m => {
                if (m.type === 'MilitarySupply') {
                    const countMatch = m.goal.match(/(\d+)개/);
                    const targetAmount = countMatch ? parseInt(countMatch[1]) : 5;
                    const targetName = m.targetName || m.goal.split(' ')[0];
                    return { ...m, currentAmount: 0, targetAmount: m.targetAmount || targetAmount, targetName };
                }
                if (m.type === 'Subjugation') {
                    const countMatch = m.goal.match(/(\d+)마리/);
                    const targetAmount = countMatch ? parseInt(countMatch[1]) : 5;
                    let targetName = "";
                    monsterPool.forEach(mon => { if(m.goal.includes(mon)) targetName = mon; });
                    return { ...m, currentAmount: 0, targetAmount: m.targetAmount || targetAmount, targetName: m.targetName || targetName };
                }
                if (m.type === 'MilitaryRegionalDefense') {
                    return { ...m, currentAmount: 0, targetAmount: 1, targetName: m.targetName || loc.city };
                }
                return { ...m, currentAmount: 0, targetAmount: m.targetAmount || 1 };
            });

            const newChar = { ...character };
            if (!newChar.militaryData) {
                newChar.militaryData = { rank: MilitaryRank.PVT, enlistedDate: '', merit: 0, completedMissions: 0, availableMissions: [], activeMissions: [] };
            }
            newChar.militaryData.availableMissions = parsedMissions.map(m => ({
                ...m,
                id: m.id || Math.random().toString(36).substring(7),
            }));
            newChar.militaryData.lastRefreshDate = currentMonth;
            onUpdateCharacter(newChar, isInitial ? "" : "[군대] 본부로부터 새로운 작전 지침이 하달되었습니다.");
        } catch (e) {
            console.error("Military mission gen error", e);
        }
        setIsGeneratingMissions(false);
    };

    const handleRefreshRecruits = () => {
        if (rankIdx === 0) {
            setResultData({ type: 'warning', title: '권한 부족', message: '이등병 계급은 독자적인 부대원 충원 권한이 없습니다.', items: [] });
            return;
        }
        const mData = character.militaryData;
        if (mData && mData.lastRecruitRefreshDate === currentMonth) {
            setResultData({
                type: 'info',
                title: '충원 명단 갱신 제한',
                message: '부대원 충원 명단은 한 달에 한 번만 갱신할 수 있습니다.\n다음 달에 새로운 충원 대기자 명단을 확인하십시오.',
                items: [{ label: '최근 갱신일', after: mData.lastRecruitRefreshDate || '기록 없음' }]
            });
            return;
        }

        const MBTI_OPTIONS = [
            "ISTJ (신중하고 성실함)", "ISFJ (용감하고 온화함)", "INFJ (통찰력 있고 신비함)", "INTJ (용의주도한 전략가)",
            "ISTP (만능 재주꾼)", "ISFP (호기심 많은 예술가)", "INFP (열정적인 중재자)", "INTP (논리적인 사색가)",
            "ESTP (모험을 즐기는 사업가)", "ESFP (자유로운 영혼)", "ENFP (재기발랄한 활동가)", "ENTP (뜨거운 논쟁을 즐김)",
            "ESTJ (엄격한 관리자)", "ESFJ (사교적인 외교관)", "ENFJ (정의로운 사회운동가)", "ENTJ (대담한 통솔자)"
        ];
        setIsRecruitLoading(true);
        setTimeout(() => {
            const newRecruits: Companion[] = [];
            const SHINRYOKU_MAP_LOCAL: Record<string, string> = {
                '태양': '광휘계', '화염': '화염계', '광휘': '광휘계', '월광': '암흑계', '전격': '전격계',
                '지령': '대지계', '질풍': '질풍계', '빙결': '빙결계', '해수': '해수계', '강철': '대지계',
                '암연': '암흑계', '초화': '초화계', '무': '일반'
            };

            for (let i = 0; i < 3; i++) {
                const maxIdx = rankIdx; 
                const targetRankIdx = Math.floor(Math.random() * maxIdx);
                const rank = MILITARY_RANK_ORDER[targetRankIdx];
                const level = generateMilitaryLevelByRank(rank);
                const tier = determineRecruitClassTier(level);
                const baseMerit = MILITARY_RANK_THRESHOLD[rank] || 0;
                const gender = Math.random() < 0.5 ? '남성' : '여성';
                const genderParam = gender === '남성' ? 'male' : 'female';
                const shinryokuType = tier !== ClassTier.NONE ? SHINRYOKU_TYPES_LIST[Math.floor(Math.random()*SHINRYOKU_TYPES_LIST.length)] : "미개방";
                const currentTierClass = tier !== ClassTier.NONE ? getHumanoidClassByTier(shinryokuType, tier) : '정예 훈련병';
                const thematicClass = `${currentTierClass} (${rank})`;

                // 클래스 해방 단계별 명칭 설정 (티어별 전용 클래스 매핑)
                let firstClassName: string | undefined = undefined;
                let firstClassDescription: string | undefined = undefined;
                let secondClassName: string | undefined = undefined;
                let secondClassDescription: string | undefined = undefined;
                let lastClassName: string | undefined = undefined;
                let lastClassDescription: string | undefined = undefined;
                let finalClassName: string | undefined = undefined;
                let finalClassDescription: string | undefined = undefined;

                if (tier === ClassTier.FIRST || tier === ClassTier.SECOND || tier === ClassTier.LAST || tier === ClassTier.FINAL) {
                    firstClassName = (tier === ClassTier.FIRST) ? currentTierClass : getHumanoidClassByTier(shinryokuType, ClassTier.FIRST);
                    firstClassDescription = `${shinryokuType} 계통의 1차 클래스 각성`;
                }
                if (tier === ClassTier.SECOND || tier === ClassTier.LAST || tier === ClassTier.FINAL) {
                    secondClassName = (tier === ClassTier.SECOND) ? currentTierClass : getHumanoidClassByTier(shinryokuType, ClassTier.SECOND);
                    secondClassDescription = `${shinryokuType} 계통의 2차 클래스 심화`;
                }
                if (tier === ClassTier.LAST || tier === ClassTier.FINAL) {
                    lastClassName = (tier === ClassTier.LAST) ? currentTierClass : getHumanoidClassByTier(shinryokuType, ClassTier.LAST);
                    lastClassDescription = `${shinryokuType} 계통의 3차 클래스 극의`;
                }
                if (tier === ClassTier.FINAL) {
                    finalClassName = currentTierClass;
                    finalClassDescription = `${shinryokuType} 계통의 궁극 클래스 도달`;
                }

                // 영입 스탯 밸런스 조정 (약 20% 하향 조정)
                const rawStats = generateCompanionStats(level);
                const balancedStats = {
                    hp: Math.max(50, Math.floor(rawStats.hp * 0.8)),
                    maxHp: Math.max(50, Math.floor((rawStats.maxHp || rawStats.hp) * 0.8)),
                    mp: Math.max(20, Math.floor(rawStats.mp * 0.8)),
                    maxMp: Math.max(20, Math.floor((rawStats.maxMp || rawStats.mp) * 0.8)),
                    str: Math.max(1, Math.floor(rawStats.str * 0.8)),
                    int: Math.max(1, Math.floor(rawStats.int * 0.8)),
                    wis: Math.max(1, Math.floor((rawStats.wis || 1) * 0.8)),
                    def: Math.max(1, Math.floor(rawStats.def * 0.8)),
                    agi: Math.max(1, Math.floor(rawStats.agi * 0.8)),
                    ctrl: Math.max(1, Math.floor((rawStats.ctrl || 1) * 0.8))
                };

                const ageVal = 20 + Math.floor(Math.random() * 20);
                const recruitObj: Companion = assignRandomCombatStyle({
                    id: `mil_rec_${Math.random().toString(36).substring(7)}`, name: generateName(loc.nation, genderParam),
                    age: `${ageVal}세`, birthYear: currentYear - ageVal, gender: gender, race: '인간',
                    appearance: "군복을 갖춰 입은 정예 군인", personality: MBTI_OPTIONS[Math.floor(Math.random() * MBTI_OPTIONS.length)], classType: thematicClass,
                    job: JobType.SOLDIER, militaryRank: rank, level, currentExp: 0, maxExp: level * 100, statPoints: 0,
                    classTier: tier, shinryokuType,
                    firstClassName, firstClassDescription,
                    secondClassName, secondClassDescription,
                    lastClassName, lastClassDescription,
                    finalClassName, finalClassDescription,
                    visualUrl: generateDefaultVisualUrl(generateName(loc.nation, genderParam), loc.nation, '인간', gender),
                    stats: balancedStats, skills: [], equipment: {}, inventory: [], affection: 50, loyalty: 100, merit: baseMerit + Math.floor(Math.random() * 20), nation: loc.nation
                }, true) as any;

                checkAndInitializeLiberationEligibility(recruitObj, 0);
                newRecruits.push(recruitObj);
            }
            
            const newChar = { ...character };
            if (!newChar.militaryData) {
                newChar.militaryData = { rank: MilitaryRank.PVT, enlistedDate: '', merit: 0, completedMissions: 0, availableMissions: [], activeMissions: [] };
            }
            newChar.militaryData.availableRecruits = newRecruits;
            newChar.militaryData.lastRecruitRefreshDate = currentMonth;
            
            setRecruits(newRecruits);
            onUpdateCharacter(newChar, "[군대] 새로운 부대원 선발 대기자 명단이 하달되었습니다.");
            setIsRecruitLoading(false);
        }, 800);
    };

    const getEnlistmentCandidates = () => {
        const candidates = [];
        
        const checkEligible = (entity: any) => {
            const age = entity.birthYear ? currentYear - entity.birthYear : (parseInt(entity.age.replace(/[^0-9]/g, '')) || 0);
            const isUnemployed = (entity.job || JobType.UNEMPLOYED) === JobType.UNEMPLOYED;
            const isNationMatch = entity.nation === loc.nation;
            const hasAge = age >= 20;
            return {
                hasAge,
                isUnemployed,
                isNationMatch,
                isEligible: hasAge && isUnemployed && isNationMatch
            };
        };

        const playerCP = getCompanionCP(character as any);
        candidates.push({
            id: 'player',
            name: character.name,
            age: character.age,
            job: character.job,
            nation: character.nation,
            level: character.level || 1,
            classType: character.classType || '모험가',
            cp: playerCP,
            inParty: true,
            isPlayer: true,
            visualUrl: character.visualUrl,
            ...checkEligible(character)
        });

        const activePartyIds = new Set(character.companions.map(c => c.id));

        allComps.filter(c => !c.isMonster && !c.isDead).forEach(c => {
            const cp = getCompanionCP(c);
            candidates.push({
                id: c.id,
                name: c.name,
                age: c.age,
                job: c.job || JobType.UNEMPLOYED,
                nation: c.nation,
                level: c.level || 1,
                classType: c.classType || c.job || '모험가',
                cp: cp,
                inParty: activePartyIds.has(c.id),
                isPlayer: false,
                visualUrl: c.visualUrl,
                ...checkEligible(c)
            });
        });
        
        return candidates;
    };
 
    const handleEnlist = () => {
        if (!selectedEnlisteeId) return;

        const candidates = getEnlistmentCandidates();
        const selected = candidates.find(c => c.id === selectedEnlisteeId);
        if (!selected) return;

        if (!selected.hasAge) { 
            setResultData({ type: 'warning', title: '입대 불가', message: '군 입대는 만 20세 이상의 성인만 가능합니다.', items: [{ label: '대상 나이', after: selected.age }] }); 
            return; 
        }
        if (!selected.isUnemployed) { 
            setResultData({ type: 'warning', title: '입대 불가', message: '현재 소속이 있는 상태입니다. 입대를 위해서는 무직 상태여야 합니다.', items: [{ label: '대상 직업', after: selected.job }] }); 
            return; 
        }
        if (!selected.isNationMatch) { 
            setResultData({ type: 'warning', title: '입대 불가', message: '본인의 국적이 아닌 나라의 군대에는 입대할 수 없습니다.', items: [{ label: '대상 국적', after: selected.nation }, { label: '도시 국적', after: loc.nation }] }); 
            return; 
        }

        const newChar = { ...character };
        let targetName = "";

        const applyEnlistment = (entity: any) => {
            entity.job = JobType.SOLDIER;
            entity.militaryRank = MilitaryRank.PVT;
            entity.classType = `군인 (이등병)`;
            targetName = entity.name;
        };

        if (selectedEnlisteeId === 'player') {
            applyEnlistment(newChar);
        } else {
            const updateC = (c: Companion) => {
                if (c.id === selectedEnlisteeId) {
                    const next = { ...c };
                    applyEnlistment(next);
                    return next;
                }
                return c;
            };
            newChar.companions = newChar.companions.map(updateC);
            if (newChar.inactiveCompanions) newChar.inactiveCompanions = newChar.inactiveCompanions.map(updateC);
        }

        if (!newChar.militaryData) {
            newChar.militaryData = { 
                rank: MilitaryRank.PVT, 
                enlistedDate: character.currentDate || '2000-01-01', 
                merit: 0, 
                completedMissions: 0, 
                assignedCity: loc.city, 
                activeMissions: [], 
                availableMissions: [],
                diplomacy: generateInitialDiplomacy(character.nation)
            };
        }

        onUpdateCharacter(newChar, `[군대] ${targetName} 대원이 ${loc.nation} 국방군에 입대했습니다. 조국에 충성하십시오.`);
        setResultData({ 
            type: 'success', 
            title: '입대 완료', 
            message: `${targetName} 대원이 군인 신분으로 전환되었습니다.`, 
            items: [{ label: '성함', after: targetName }, { label: '계급', after: '이등병' }] 
        });
        setActiveTab('duty');
        setSelectedEnlisteeId(null);
    };

    const handleDischargeRequest = () => {
        setConfirmAction(() => () => {
            const newChar = { ...character };
            newChar.job = JobType.UNEMPLOYED;
            newChar.militaryRank = undefined;
            newChar.militaryData = undefined;
            if (!newChar.socialNetwork) newChar.socialNetwork = [];

            let stayCount = 0; let leaveCount = 0;
            const processMember = (c: Companion) => {
                if (c.job === JobType.SOLDIER && c.nation === loc.nation) {
                    const chance = c.affection * 0.5;
                    const roll = Math.random() * 100;
                    if (roll < chance) { 
                        stayCount++; 
                        return { ...c, job: JobType.UNEMPLOYED, classType: "민간인 (전역)" }; 
                    } else { 
                        leaveCount++; 
                        const bond: SimpleStudent = {
                            id: c.id,
                            name: c.name,
                            age: c.age,
                            birthYear: c.birthYear,
                            gender: c.gender,
                            nation: c.nation || loc.nation,
                            level: c.level,
                            race: c.race,
                            personality: c.personality || "평범함",
                            appearance: c.appearance,
                            classType: c.classType || "군인",
                            stats: { ...c.stats },
                            affection: Math.max(-100, c.affection - 20),
                            job: c.job || JobType.UNEMPLOYED,
                            origin: "군대",
                            isStaticRank: true,
                            visualUrl: c.visualUrl
                        };
                        newChar.socialNetwork!.push(bond);
                        return null; 
                    }
                }
                return c;
            };
            newChar.companions = newChar.companions.map(processMember).filter(c => c !== null) as Companion[];
            if (newChar.inactiveCompanions) newChar.inactiveCompanions = newChar.inactiveCompanions.map(processMember).filter(c => c !== null) as Companion[];
            onUpdateCharacter(newChar, `[군대] 전역 처리가 완료되었습니다. (동료 설득 결과: ${stayCount}명 잔류, ${leaveCount}명 이탈 및 관계망 등록)`);
            setResultData({ type: 'success', title: '전역 완료 및 동료 설득', message: '군 복무를 마치고 사회로 돌아왔습니다. 일부 군인 동료들은 당신의 전역을 따르지 않고 군에 남거나 각자의 길을 떠났습니다. 이탈한 인원들은 과거 인연으로 기록됩니다.', items: [{ label: '잔류 동료', after: `${stayCount}명` }, { label: '이탈 동료', after: `${leaveCount}명` }, { label: '변경된 직업', after: JobType.UNEMPLOYED }] });
            onClose();
        });
        setResultData({ type: 'warning', title: '전역 및 동료 설득', message: '정말로 군대에서 전역하시겠습니까?\n기존의 군인 동료들은 (친밀도 * 0.5)%의 확률로 설득에 성공해야만 당신의 곁에 남습니다.', items: [{ label: '현재 계급', after: currentRank }] });
    };

    const captainRankIdx = MILITARY_RANK_ORDER.indexOf(MilitaryRank.CPT);

    const handleAcceptMission = (mission: Quest) => {
        const mData = character.militaryData;
        if (!mData) return;
        if (mission.type === 'MilitaryDiplomaticEscort' && rankIdx < captainRankIdx) {
            setResultData({
                type: 'warning',
                title: '계급 요건 미달',
                message: '외교 호위 임무는 대위 이상의 계급부터 수행할 수 있습니다.',
                items: [{ label: '현재 계급', after: currentRank }, { label: '요구 계급', after: '대위 이상' }]
            });
            setSelectedMission(null);
            return;
        }
        if (mission.type === 'MilitaryRecon' && rankIdx > captainRankIdx) {
            setResultData({
                type: 'warning',
                title: '계급 조건 제한',
                message: '국경 정찰 임무는 대위 이하의 계급만 수행할 수 있습니다.',
                items: [{ label: '현재 계급', after: currentRank }, { label: '가능 계급', after: '대위 이하' }]
            });
            setSelectedMission(null);
            return;
        }
        const activeMissions = mData.activeMissions || [];
        if (activeMissions.length >= 2) { setResultData({ type: 'warning', title: '작전 수령 한도 초과', message: '동시 수행 가능한 군사 작전 명령은 최대 2개입니다.', items: [{ label: '최대 수령 개수', after: '2개' }] }); return; }
        const newChar = { ...character };
        newChar.militaryData!.activeMissions = [...activeMissions, mission];
        newChar.militaryData!.availableMissions = (newChar.militaryData!.availableMissions || []).filter(m => m.id !== mission.id);
        onUpdateCharacter(newChar, `[군사 작전 수령] ${mission.title}`);
        setResultData({ type: 'success', title: '작전 명령 수령', message: "지휘부 작전 명령을 정식 수령했습니다.", items: [{ label: '작전명', after: mission.title }] });
        setSelectedMission(null);
    };

    const handleStartDiplomaticEscort = (mission: Quest) => {
        const newChar = { ...character };
        if (!newChar.militaryData?.activeMissions) return;
        newChar.militaryData.activeMissions = newChar.militaryData.activeMissions.map(m => {
            if (m.id === mission.id) {
                return { ...m, isEscortStarted: true };
            }
            return m;
        });
        const destNation = mission.destination?.nation || '지정 국가';
        const destCity = mission.destination?.city || '지정 도시';
        onUpdateCharacter(newChar, `[외교 호위] ${destNation} ${destCity}(으)로 향하는 외교 사절단 호위를 개시했습니다.`);
        setResultData({
            type: 'success',
            title: '외교 사절단 호위 개시',
            message: `${destNation} ${destCity}(으)로 향하는 외교 사절단의 호위를 시작했습니다.\n목적지 도시에 안전하게 도착하십시오. (월드 지도에서 ${destCity}(으)로 이동)`,
            items: [
                { label: '호위 대상', after: '외교 사절단' },
                { label: '목적지', after: `${destNation} ${destCity}` }
            ]
        });
    };

    const handleCompleteDiplomaticEscort = (mission: Quest) => {
        const newChar = { ...character };
        if (!newChar.militaryData?.activeMissions) return;
        newChar.militaryData.activeMissions = newChar.militaryData.activeMissions.filter(m => m.id !== mission.id);
        const gold = mission.rewardGold || 0;
        const exp = mission.rewardExp || 0;
        const merit = mission.rewardMerit || 70;
        newChar.money += gold;
        newChar.currentExp = (newChar.currentExp || 0) + exp;
        newChar.militaryData.merit = (newChar.militaryData.merit || 0) + merit;
        newChar.militaryData.completedMissions = (newChar.militaryData.completedMissions || 0) + 1;
        const destCity = mission.destination?.city || loc.city;
        onUpdateCharacter(newChar, `[외교 호위 완료] 외교 사절단을 ${destCity}까지 안전하게 호송 완료했습니다! (골드 +${gold.toLocaleString()}G, 경험치 +${exp.toLocaleString()}, 공적치 +${merit})`);
        setResultData({
            type: 'success',
            title: '외교 호위 완수',
            message: `외교 사절단을 ${destCity}까지 안전하게 호송했습니다!\n사절단장: "목적지에 무사히 도달했습니다. 뛰어난 호위 덕분에 국가 간 회담을 성공적으로 시작할 수 있게 되었습니다."`,
            items: [
                { label: '획득 골드', after: `+${gold.toLocaleString()} G` },
                { label: '획득 경험치', after: `+${exp.toLocaleString()} EXP` },
                { label: '공적치 획득', after: `+${merit} 공적치` }
            ]
        });
    };

    const handlePromoteEntity = (targetId: string) => {
        const newChar = { ...character };
        let name = ""; let currentR: MilitaryRank; let merit = 0;
        const isPlayer = targetId === 'player';
        if (isPlayer) { 
            if (!newChar.militaryData) return; 
            name = newChar.name; 
            currentR = newChar.militaryData.rank || newChar.militaryRank || MilitaryRank.PVT; 
            merit = newChar.militaryData.merit || 0; 
        } else { 
            const comp = [...newChar.companions, ...(newChar.inactiveCompanions || [])].find(c => c.id === targetId); 
            if (!comp) return; 
            name = comp.name; 
            currentR = comp.militaryRank || MilitaryRank.PVT; 
            merit = (comp as any).merit || 0; 
        }
        
        const rankIdxLocal = MILITARY_RANK_ORDER.indexOf(currentR);
        const nextRank = MILITARY_RANK_ORDER[rankIdxLocal + 1];
        if (!nextRank) { 
            setResultData({ type: 'info', title: '최고 계급 도달', message: '이미 군의 최고 정점인 대장 계급입니다.', items: [] }); 
            return; 
        }
        
        const threshold = MILITARY_RANK_THRESHOLD[nextRank];
        if (merit < threshold) { 
            const deficit = threshold - merit;
            setResultData({ 
                type: 'warning', 
                title: '진급 요건 미달', 
                message: `[${nextRank}] 계급으로 진급하기 위한 공적치가 부족합니다.`, 
                items: [
                    { label: '필요 공적치', after: `${threshold.toLocaleString()} 공적치` }, 
                    { label: '현재 공적치', after: `${merit.toLocaleString()} 공적치` },
                    { label: '부족한 공적치', after: `${deficit.toLocaleString()} 공적치` }
                ] 
            }); 
            return; 
        }
        
        if (isPlayer) { 
            newChar.militaryRank = nextRank; 
            newChar.militaryData!.rank = nextRank; 
        } else { 
            const updateC = (c: Companion) => c.id === targetId ? { ...c, militaryRank: nextRank, classType: `군인 (${nextRank})` } : c; 
            newChar.companions = newChar.companions.map(updateC); 
            if (newChar.inactiveCompanions) newChar.inactiveCompanions = newChar.inactiveCompanions.map(updateC); 
        }
        
        onUpdateCharacter(newChar, `[군사 진급] ${name} 대원이 ${nextRank}(으)로 진급했습니다!`);
        setResultData({ 
            type: 'levelup', 
            title: '진급 심사 통과!', 
            message: `${name} 대원이 [${nextRank}] 계급으로 진급했습니다.`, 
            items: [
                { label: '이전 계급', after: currentR },
                { label: '현재 계급', after: nextRank },
                { label: '누적 공적치', after: `${merit.toLocaleString()} 공적치` }
            ] 
        });
    };

    const handleRecruitMilitary = (merc: Companion) => {
        const playerRep = character.mercenaryData?.reputation ?? (character as any).reputation ?? 0;
        const playerMerit = character.militaryData?.merit ?? (character as any).merit ?? 0;
        const targetRep = merc.reputation ?? 0;
        const targetMerit = (merc as any).merit ?? 0;

        if (targetRep > playerRep || targetMerit > playerMerit) {
            const reasons: string[] = [];
            if (targetMerit > playerMerit) {
                reasons.push(`공적치 초과 (대상: ${targetMerit.toLocaleString()} / 플레이어: ${playerMerit.toLocaleString()})`);
            }
            if (targetRep > playerRep) {
                reasons.push(`명성치 초과 (대상: ${targetRep.toLocaleString()} / 플레이어: ${playerRep.toLocaleString()})`);
            }
            setResultData({
                type: 'warning',
                title: '부대 배속 불가',
                message: '플레이어보다 공적치나 명성치가 높은 대원은 부대에 배속할 수 없습니다.',
                items: reasons.map(r => ({ label: '사유', after: r }))
            });
            return;
        }

        if (character.companions.length >= 5) { 
            setResultData({ type: 'warning', title: '분대 편성 불가', message: '현재 분대 인원이 가득 찼습니다.', items: [{ label: '최대 분대원', after: '5명' }] }); 
            return; 
        }
        const newChar = { ...character };
        newChar.companions.push(assignRandomCombatStyle(merc, true));
        const updatedRecruits = recruits.filter(r => r.id !== merc.id);
        setRecruits(updatedRecruits);
        if (newChar.militaryData) {
            newChar.militaryData.availableRecruits = updatedRecruits;
        }
        onUpdateCharacter(newChar, `[군대 영입] ${merc.name} ${merc.militaryRank}을(를) 부대에 배속했습니다.`);
        setResultData({ type: 'success', title: '부대원 배속 완료', message: `${merc.name} 대원이 아군 분대에 배속되었습니다.`, items: [{ label: '성함', after: merc.name }, { label: '계급', after: merc.militaryRank || '이등병' }] });
    };

    const handleIgnoreInvasion = (targetNation: string) => {
        const newChar = { ...character };
        if (!newChar.militaryData?.diplomacy?.[targetNation]) return;
        
        const rel = { ...newChar.militaryData.diplomacy[targetNation] };
        rel.occupation = Math.max(-100, (rel.occupation || 0) - 10);
        newChar.militaryData.diplomacy[targetNation] = rel;
        
        newChar.militaryData.pendingInvasions = pendingInvasions.filter(n => n !== targetNation);
        
        onUpdateCharacter(newChar, `[침공 무시] ${targetNation}의 공세를 방치하여 전선 점유율이 10% 하락했습니다.`);
        setResultData({
            type: 'failure',
            title: '방어선 후퇴',
            message: `${targetNation}의 침공을 저지하지 못해 영토 일부를 빼앗겼습니다.`,
            items: [{ label: '점유율 변동', after: '-10% (후퇴)' }]
        });
    };

    const handleDefendInvasion = (targetNation: string) => {
        onAction(`[전쟁 방어] 침공군 격퇴: ${targetNation}`);
        onClose();
    };

    const handleModalClose = () => {
        setResultData(null);
        setConfirmAction(null);
    };

    const militaryCompanions = allComps.filter(c => c.job === JobType.SOLDIER && c.nation === loc.nation && !c.isDead);
    const enlistmentCandidates = getEnlistmentCandidates();

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-2 sm:p-4 animate-in fade-in duration-200">
            {resultData && <ActionResultResultModal data={resultData} onClose={handleModalClose} onContinue={confirmAction ? () => { confirmAction(); } : undefined} />}
            {isFacilityOpen && <MilitaryFacilityModal character={character} onClose={() => setIsFacilityOpen(false)} onUpdateCharacter={onUpdateCharacter} effectiveCommander={commander!} />}
            {isTrainingOpen && <MilitaryTrainingModal character={character} onClose={() => setIsTrainingOpen(false)} onUpdateCharacter={onUpdateCharacter} effectiveCommander={commander!} />}
            {isDiplomacyOpen && <NationalDiplomacyModal character={character} onClose={() => setIsDiplomacyOpen(false)} onUpdateCharacter={onUpdateCharacter} />}
            {warTacticsTargetNation && (
                <WarTacticsModal
                    isOpen={Boolean(warTacticsTargetNation)}
                    mode="defense"
                    targetNation={warTacticsTargetNation}
                    character={character}
                    onClose={() => setWarTacticsTargetNation(null)}
                    onUpdateCharacter={onUpdateCharacter}
                    onVictory={(occGain, _isVassal, prevOcc, newOcc, rankName) => {
                        setResultData({
                            type: 'success',
                            title: '🛡️ 전술 거점 방어 대승리!',
                            message: `${warTacticsTargetNation} 침공 부대를 완벽히 격퇴하고 전선 지배율을 확보했습니다!`,
                            items: [
                                { label: '적용 계급 규정', after: rankName },
                                { label: '전선 점유율 상승', after: `+${occGain}% 상승!` },
                                { label: '현재 전선 점유율', before: `${prevOcc}%`, after: `${newOcc}%` }
                            ]
                        });
                    }}
                />
            )}

            {/* 작전 브리핑 팝업 */}
            {selectedMission && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in zoom-in-95">
                    <div className="bg-slate-900 border border-sky-500/40 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
                        <div className="p-4 sm:p-5 bg-slate-950 border-b border-slate-800 flex justify-between items-center">
                            <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                                <FileText className="text-sky-400" size={20}/> 작전 명령 브리핑
                            </h3>
                            <button onClick={() => setSelectedMission(null)} className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors">
                                <X size={18}/>
                            </button>
                        </div>
                        <div className="p-4 sm:p-6 space-y-4">
                            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                                <span className="text-[10px] text-sky-400 font-bold uppercase tracking-wider block mb-1">작전명</span>
                                <h4 className="text-sm sm:text-base font-bold text-slate-100 mb-2">{selectedMission.title}</h4>
                                <p className="text-xs text-slate-300 leading-relaxed italic">"{selectedMission.details}"</p>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                                    <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">작전 위험도</span>
                                    <span className={`text-xs font-bold ${selectedMission.danger === 'Extreme' ? 'text-rose-400' : 'text-sky-400'}`}>
                                        {selectedMission.danger === 'Extreme' ? '최고 위험' : (selectedMission.danger as string) === 'Hard' || selectedMission.danger === 'High' ? '위험' : (selectedMission.danger as string) === 'Normal' || selectedMission.danger === 'Mid' ? '보통' : '안전'}
                                    </span>
                                </div>
                                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                                    <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">보상</span>
                                    <div className="text-xs font-bold text-amber-400 font-mono">
                                        +{selectedMission.rewardExp} 경험치
                                    </div>
                                    <div className="text-[11px] text-slate-300 font-mono">
                                        {selectedMission.rewardGold.toLocaleString()} 골드
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="p-4 bg-slate-950 border-t border-slate-800 flex gap-3">
                            <button onClick={() => setSelectedMission(null)} className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold text-xs transition-colors">
                                보류
                            </button>
                            <button onClick={() => handleAcceptMission(selectedMission)} className="flex-1 py-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl font-bold text-xs shadow-lg shadow-sky-900/30 transition-colors">
                                작전 승인
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 메인 모달 프레임 */}
            <div className="bg-slate-900 border border-slate-700/60 w-full max-w-5xl h-[92vh] sm:h-[86vh] rounded-2xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden relative">
                
                {/* 헤더 바 */}
                <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-950/80 flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-sky-950/60 border border-sky-600/40 flex items-center justify-center text-sky-400 shadow-inner">
                            <Shield size={22} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-base sm:text-xl font-bold text-white">{loc.nation} 국방군 사령부</h2>
                                <span className="text-[10px] bg-sky-950 text-sky-300 px-2 py-0.5 rounded-full border border-sky-800/60 font-bold">
                                    {loc.city} 주둔지
                                </span>
                            </div>
                            <p className="text-[11px] text-slate-400 mt-0.5">
                                {getPositionTitle() || '지휘 체계 및 작전 통제실'}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 sm:gap-4">
                        {isEnlistedInParty && (
                            <div className="flex items-center gap-2 sm:gap-3">
                                <div className="bg-slate-900 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl border border-slate-800 flex items-center gap-3">
                                    <div className="text-center">
                                        <p className="text-[9px] text-slate-400 uppercase font-bold">지휘관</p>
                                        <p className="text-xs font-bold text-sky-400">{commander.name}</p>
                                    </div>
                                    <div className="w-px h-5 bg-slate-800"></div>
                                    <div className="text-center">
                                        <p className="text-[9px] text-slate-400 uppercase font-bold">계급</p>
                                        <p className="text-xs font-bold text-amber-400 font-mono">{currentRank}</p>
                                    </div>
                                    {isPlayerSoldier && (
                                        <>
                                            <div className="w-px h-5 bg-slate-800 hidden sm:block"></div>
                                            <div className="text-center hidden sm:block">
                                                <p className="text-[9px] text-slate-400 uppercase font-bold">공적치</p>
                                                <p className="text-xs font-bold text-amber-400 font-mono">
                                                    {(character.militaryData?.merit || 0).toLocaleString()}
                                                </p>
                                            </div>
                                        </>
                                    )}
                                </div>
                                {isPlayerSoldier && (
                                    <button 
                                        onClick={handleDischargeRequest} 
                                        className="p-2 sm:px-3 sm:py-2 bg-slate-900 hover:bg-rose-950/60 text-slate-400 hover:text-rose-300 border border-slate-800 hover:border-rose-800/60 rounded-xl transition-colors flex items-center gap-1.5 text-xs font-bold" 
                                        title="전역 신청"
                                    >
                                        <LogOut size={15} />
                                        <span className="hidden sm:inline">전역 신청</span>
                                    </button>
                                )}
                            </div>
                        )}
                        <button 
                            onClick={onClose} 
                            className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* 탭 내비게이션 */}
                <div className="flex border-b border-slate-800 bg-slate-950 shrink-0 overflow-x-auto no-scrollbar">
                    {!isPlayerSoldier && (
                        <button 
                            onClick={() => setActiveTab('enlist')} 
                            className={`flex-1 min-w-[90px] py-3 text-xs font-bold flex items-center justify-center transition-all whitespace-nowrap gap-1.5 ${activeTab === 'enlist' ? 'text-sky-400 border-b-2 border-sky-500 bg-slate-900/80' : 'text-slate-400 hover:text-slate-200'}`}
                        >
                            <UserPlus size={15}/> 입대 안내
                        </button>
                    )}
                    {isEnlistedInParty && (
                        <>
                            <button 
                                onClick={() => setActiveTab('duty')} 
                                className={`flex-1 min-w-[90px] py-3 text-xs font-bold flex items-center justify-center transition-all whitespace-nowrap gap-1.5 ${activeTab === 'duty' ? 'text-sky-400 border-b-2 border-sky-500 bg-slate-900/80' : 'text-slate-400 hover:text-slate-200'}`}
                            >
                                <Sword size={15}/> 작전 게시판
                            </button>
                            <button 
                                onClick={() => setActiveTab('war')} 
                                className={`flex-1 min-w-[90px] py-3 text-xs font-bold flex items-center justify-center transition-all whitespace-nowrap gap-1.5 relative ${activeTab === 'war' ? 'text-rose-400 border-b-2 border-rose-500 bg-slate-900/80' : 'text-slate-400 hover:text-slate-200'}`}
                            >
                                <Flame size={15}/> 전선 상황 
                                {pendingInvasions.length > 0 && (
                                    <span className="w-2 h-2 bg-rose-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(244,63,94,0.8)]"></span>
                                )}
                            </button>
                            <button 
                                onClick={() => setActiveTab('promotion')} 
                                className={`flex-1 min-w-[90px] py-3 text-xs font-bold flex items-center justify-center transition-all whitespace-nowrap gap-1.5 ${activeTab === 'promotion' ? 'text-sky-400 border-b-2 border-sky-500 bg-slate-900/80' : 'text-slate-400 hover:text-slate-200'}`}
                            >
                                <Award size={15}/> 인사 및 승급
                            </button>
                            <button 
                                onClick={() => setActiveTab('recruit')} 
                                className={`flex-1 min-w-[90px] py-3 text-xs font-bold flex items-center justify-center transition-all whitespace-nowrap gap-1.5 ${activeTab === 'recruit' ? 'text-sky-400 border-b-2 border-sky-500 bg-slate-900/80' : 'text-slate-400 hover:text-slate-200'}`}
                            >
                                <Users size={15}/> 부대원 충원
                            </button>
                            <button 
                                onClick={() => setActiveTab('command')} 
                                className={`flex-1 min-w-[90px] py-3 text-xs font-bold flex items-center justify-center transition-all whitespace-nowrap gap-1.5 ${activeTab === 'command' ? 'text-sky-400 border-b-2 border-sky-500 bg-slate-900/80' : 'text-slate-400 hover:text-slate-200'}`}
                            >
                                <Crown size={15}/> 지휘 통제
                            </button>
                        </>
                    )}
                </div>

                {/* 탭 본문 영역 */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-900 custom-scrollbar">
                    
                    {/* 외교 사절단 호위 작전 진행 중일 때 상시 배너 */}
                    {(() => {
                        const activeDiplomatic = character.militaryData?.activeMissions?.find(m => m.type === 'MilitaryDiplomaticEscort');
                        if (!activeDiplomatic) return null;

                        const destCity = (activeDiplomatic.destination?.city || activeDiplomatic.targetCity || '').trim();
                        const destNation = activeDiplomatic.destination?.nation || activeDiplomatic.targetNation || '';
                        const curCity = (loc.city || '').trim();
                        const isAtDest = Boolean(destCity && curCity && (destCity === curCity || curCity.includes(destCity) || destCity.includes(curCity)));
                        const isEscortStarted = Boolean(activeDiplomatic.isEscortStarted);

                        return (
                            <div className="mb-4 p-3.5 sm:p-4 bg-gradient-to-r from-sky-950/90 via-slate-900/90 to-indigo-950/90 border border-sky-500/50 rounded-2xl shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in">
                                <div className="flex items-center gap-3">
                                    <div className="p-2.5 rounded-xl bg-sky-900/60 border border-sky-400/40 text-sky-300 shrink-0">
                                        <Truck size={20} className={isAtDest ? "text-emerald-400" : isEscortStarted ? "animate-pulse text-amber-300" : "text-sky-300"} />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="text-xs font-black text-white">{activeDiplomatic.title}</span>
                                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${isAtDest ? 'bg-emerald-950 text-emerald-300 border-emerald-500' : isEscortStarted ? 'bg-amber-950 text-amber-300 border-amber-600' : 'bg-sky-950 text-sky-300 border-sky-700'}`}>
                                                {isAtDest ? '목적지 도착' : isEscortStarted ? '호위 이동 중' : '호위 출발 대기'}
                                            </span>
                                        </div>
                                        <div className="text-[11px] text-slate-300 mt-0.5">
                                            목적지: <span className="font-bold text-sky-300">{destNation} {destCity}</span> | 현재 위치: <span className="font-bold text-slate-200">{loc.nation} {loc.city}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="w-full sm:w-auto shrink-0 flex items-center gap-2">
                                    {isAtDest ? (
                                        <button
                                            onClick={() => handleCompleteDiplomaticEscort(activeDiplomatic)}
                                            className="w-full sm:w-auto px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl text-xs shadow-lg flex items-center justify-center gap-1.5 animate-pulse active:scale-95 transition-all"
                                        >
                                            <CheckCircle size={15} /> 외교 사절단 호위 완료 보고
                                        </button>
                                    ) : !isEscortStarted ? (
                                        <button
                                            onClick={() => handleStartDiplomaticEscort(activeDiplomatic)}
                                            className="w-full sm:w-auto px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-xl text-xs shadow-md flex items-center justify-center gap-1.5 active:scale-95 transition-all"
                                        >
                                            <Truck size={15} /> 외교 사절단 호위 출발
                                        </button>
                                    ) : (
                                        <div className="text-xs text-amber-300 font-medium px-3 py-1.5 bg-black/40 rounded-xl border border-amber-500/30">
                                            {destCity}(으)로 이동 중
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })()}

                    {/* 1. 입대 안내 탭 */}
                    {activeTab === 'enlist' && (
                        <div className="max-w-2xl mx-auto space-y-6 animate-in slide-in-from-bottom-3 duration-200">
                            <div className="text-center bg-slate-950 p-6 rounded-2xl border border-slate-800">
                                <div className="w-16 h-16 rounded-2xl bg-sky-950/60 border border-sky-600/40 flex items-center justify-center mx-auto mb-3 shadow-inner">
                                    <UserPlus size={30} className="text-sky-400" />
                                </div>
                                <h3 className="text-lg sm:text-2xl font-bold text-white mb-1">{loc.nation} 국방군 모병 센터</h3>
                                <p className="text-slate-400 text-xs sm:text-sm leading-relaxed">
                                    해당 국가의 국적을 가진 만 20세 이상의 성인이라면 누구나 입대할 수 있습니다.<br/>
                                    입대를 희망하는 인원을 선택하여 신청서를 제출하십시오.
                                </p>
                            </div>

                            <div className="space-y-3">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1">
                                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">입대 신청 대상 명단</h4>
                                    <span className="text-[11px] text-slate-500 font-medium">총 {enlistmentCandidates.length}명</span>
                                </div>

                                {/* 필터, 검색, 정렬 컨트롤 바 */}
                                <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800/80 space-y-2.5">
                                    <div className="flex flex-col sm:flex-row gap-2">
                                        {/* 검색창 */}
                                        <div className="relative flex-1">
                                            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
                                            <input
                                                type="text"
                                                value={enlistSearch}
                                                onChange={(e) => setEnlistSearch(e.target.value)}
                                                placeholder="이름, 직업 검색..."
                                                className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500 transition-colors"
                                            />
                                            {enlistSearch && (
                                                <button
                                                    type="button"
                                                    onClick={() => setEnlistSearch('')}
                                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 text-xs px-1"
                                                >
                                                    ×
                                                </button>
                                            )}
                                        </div>

                                        {/* 정렬 드롭다운 */}
                                        <div className="flex items-center gap-1.5 shrink-0">
                                            <ArrowUpDown size={13} className="text-sky-400 shrink-0" />
                                            <select
                                                value={enlistSort}
                                                onChange={(e) => setEnlistSort(e.target.value as any)}
                                                className="bg-slate-900 border border-slate-800 text-sky-300 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-sky-500 cursor-pointer font-medium"
                                            >
                                                <option value="eligibleFirst">입대가능 우선</option>
                                                <option value="playerFirst">플레이어 우선</option>
                                                <option value="partyFirst">파티 편성 우선</option>
                                                <option value="cpDesc">전투력 높은순</option>
                                                <option value="cpAsc">전투력 낮은순</option>
                                                <option value="levelDesc">레벨 높은순</option>
                                                <option value="levelAsc">레벨 낮은순</option>
                                                <option value="nameAsc">이름 가나다순</option>
                                            </select>
                                        </div>
                                    </div>

                                    {/* 필터 칩 */}
                                    <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pb-1 text-[11px]">
                                        {[
                                            { id: 'all', label: '전체' },
                                            { id: 'eligible', label: '입대 가능만' },
                                            { id: 'party', label: '파티 대원' },
                                            { id: 'companion', label: '동료만' },
                                            { id: 'ineligible', label: '조건 미달' }
                                        ].map(f => (
                                            <button
                                                key={f.id}
                                                type="button"
                                                onClick={() => setEnlistFilter(f.id as any)}
                                                className={`px-2.5 py-1 rounded-md font-medium whitespace-nowrap transition-colors border ${
                                                    enlistFilter === f.id
                                                        ? 'bg-sky-600/30 text-sky-300 border-sky-500/50'
                                                        : 'bg-slate-900/80 text-slate-400 border-slate-800 hover:text-slate-200 hover:bg-slate-800/60'
                                                }`}
                                            >
                                                {f.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* 가공된 후보자 목록 렌더링 */}
                                {(() => {
                                    const processedCandidates = enlistmentCandidates
                                        .filter(can => {
                                            if (enlistFilter === 'eligible' && !can.isEligible) return false;
                                            if (enlistFilter === 'ineligible' && can.isEligible) return false;
                                            if (enlistFilter === 'party' && !can.inParty) return false;
                                            if (enlistFilter === 'companion' && can.isPlayer) return false;

                                            if (enlistSearch.trim()) {
                                                const q = enlistSearch.trim().toLowerCase();
                                                const nameMatch = (can.name || '').toLowerCase().includes(q);
                                                const jobMatch = (can.job || '').toLowerCase().includes(q);
                                                const classMatch = (can.classType || '').toLowerCase().includes(q);
                                                const nationMatch = (can.nation || '').toLowerCase().includes(q);
                                                if (!nameMatch && !jobMatch && !classMatch && !nationMatch) return false;
                                            }
                                            return true;
                                        })
                                        .sort((a, b) => {
                                            if (enlistSort === 'eligibleFirst') {
                                                if (a.isEligible !== b.isEligible) return a.isEligible ? -1 : 1;
                                                if (a.isPlayer !== b.isPlayer) return a.isPlayer ? -1 : 1;
                                                return b.cp - a.cp;
                                            } else if (enlistSort === 'playerFirst') {
                                                if (a.isPlayer !== b.isPlayer) return a.isPlayer ? -1 : 1;
                                                if (a.isEligible !== b.isEligible) return a.isEligible ? -1 : 1;
                                                return b.cp - a.cp;
                                            } else if (enlistSort === 'partyFirst') {
                                                if (a.inParty !== b.inParty) return a.inParty ? -1 : 1;
                                                if (a.isEligible !== b.isEligible) return a.isEligible ? -1 : 1;
                                                return b.cp - a.cp;
                                            } else if (enlistSort === 'cpDesc') {
                                                if (a.cp !== b.cp) return b.cp - a.cp;
                                            } else if (enlistSort === 'cpAsc') {
                                                if (a.cp !== b.cp) return a.cp - b.cp;
                                            } else if (enlistSort === 'levelDesc') {
                                                if (a.level !== b.level) return b.level - a.level;
                                            } else if (enlistSort === 'levelAsc') {
                                                if (a.level !== b.level) return a.level - b.level;
                                            } else if (enlistSort === 'nameAsc') {
                                                return (a.name || '').localeCompare(b.name || '', 'ko');
                                            }
                                            return 0;
                                        });

                                    if (processedCandidates.length === 0) {
                                        return (
                                            <div className="p-8 text-center bg-slate-950/60 border border-slate-800 rounded-2xl">
                                                <Users size={32} className="mx-auto text-slate-600 mb-2 opacity-60" />
                                                <p className="text-xs text-slate-400 font-medium">검색 또는 필터 조건에 일치하는 인원이 없습니다.</p>
                                                <button
                                                    type="button"
                                                    onClick={() => { setEnlistSearch(''); setEnlistFilter('all'); }}
                                                    className="mt-3 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-sky-400 text-xs rounded-lg transition-colors"
                                                >
                                                    필터 초기화
                                                </button>
                                            </div>
                                        );
                                    }

                                    return (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[420px] overflow-y-auto custom-scrollbar pr-1">
                                            {processedCandidates.map(can => (
                                                <button 
                                                    key={can.id}
                                                    type="button"
                                                    onClick={() => setSelectedEnlisteeId(can.id)}
                                                    className={`p-3.5 rounded-2xl border text-left transition-all flex flex-col gap-2 relative overflow-hidden ${selectedEnlisteeId === can.id ? 'bg-sky-950/40 border-sky-500 shadow-md ring-1 ring-sky-500/50' : 'bg-slate-950 border-slate-800 hover:border-slate-700'}`}
                                                >
                                                    <div className="flex justify-between items-start">
                                                        <div className="flex items-center gap-2 min-w-0">
                                                            <div className="font-bold text-white text-base truncate">
                                                                {can.name}
                                                            </div>
                                                            {can.isPlayer ? (
                                                                <span className="text-[10px] bg-sky-900/60 text-sky-300 border border-sky-700/50 px-1.5 py-0.5 rounded shrink-0">본인</span>
                                                            ) : can.inParty ? (
                                                                <span className="text-[10px] bg-emerald-950/60 text-emerald-300 border border-emerald-700/50 px-1.5 py-0.5 rounded shrink-0">파티</span>
                                                            ) : null}
                                                        </div>
                                                        {selectedEnlisteeId === can.id && <CheckCircle size={18} className="text-sky-400 shrink-0"/>}
                                                    </div>

                                                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                                                        <span>Lv.{can.level} · {can.classType}</span>
                                                        <span className="text-amber-400/90 font-mono font-semibold">{can.cp.toLocaleString()} CP</span>
                                                    </div>

                                                    <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs mt-0.5 pt-1.5 border-t border-slate-800/80">
                                                        <div className="flex justify-between"><span className="text-slate-500">나이</span> <span className={can.hasAge ? 'text-emerald-400' : 'text-rose-400'}>{can.age} ({can.hasAge ? '성인' : '미성년'})</span></div>
                                                        <div className="flex justify-between"><span className="text-slate-500">직업</span> <span className={can.isUnemployed ? 'text-emerald-400' : 'text-rose-400'}>{can.job}</span></div>
                                                        <div className="flex justify-between col-span-2"><span className="text-slate-500">국적</span> <span className={can.isNationMatch ? 'text-emerald-400' : 'text-rose-400'}>{can.nation} {can.isNationMatch ? '(일치)' : '(불일치)'}</span></div>
                                                    </div>

                                                    {!can.isEligible && (
                                                        <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center backdrop-blur-[1px] z-10">
                                                            <Lock size={18} className="text-rose-400 mb-1"/>
                                                            <span className="text-[11px] text-white font-bold">입대 요건 미달</span>
                                                        </div>
                                                    )}
                                                </button>
                                            ))}
                                        </div>
                                    );
                                })()}
                            </div>

                            <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-3">
                                <h4 className="text-xs font-bold text-sky-400 uppercase tracking-wider flex items-center gap-1.5">
                                    <Info size={15}/> 군 복무 안내 사항
                                </h4>
                                <ul className="text-xs text-slate-400 space-y-1.5 list-disc list-inside leading-relaxed">
                                    <li>이등병으로 임관하며, 국가 작전 수행을 통해 공적치를 획득합니다.</li>
                                    <li>충분한 공적치를 쌓으면 상급 계급으로 승급 심사를 신청할 수 있습니다.</li>
                                    <li>소위 이상의 장교 계급에 도달하면 부대 시설 관리 및 합동 훈련 권한이 개방됩니다.</li>
                                    <li>전역 시 부대원 동료들은 친밀도에 따라 동행 여부가 결정됩니다.</li>
                                </ul>
                            </div>

                            <button 
                                onClick={handleEnlist} 
                                disabled={!selectedEnlisteeId || !enlistmentCandidates.find(c => c.id === selectedEnlisteeId)?.isEligible}
                                className="w-full py-3.5 bg-sky-600 hover:bg-sky-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 text-sm"
                            >
                                <Sword size={18}/>
                                {selectedEnlisteeId === 'player' ? '본인 입대 신청서 제출' : `${enlistmentCandidates.find(c => c.id === selectedEnlisteeId)?.name} 대원 입대 신청`}
                            </button>
                        </div>
                    )}

                    {/* 2. 작전 게시판 탭 */}
                    {activeTab === 'duty' && isEnlistedInParty && (
                        <div className="space-y-5 animate-in slide-in-from-bottom-3 duration-200">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-slate-950 p-4 rounded-2xl border border-slate-800">
                                <div>
                                    <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                                        <Target size={18} className="text-rose-400"/> 군사 작전 명령서
                                    </h3>
                                    <p className="text-xs text-slate-400 mt-0.5">
                                        사령부에서 하달된 정규 작전을 수행하고 공적치와 보상을 획득하십시오.
                                    </p>
                                </div>
                                <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                                    <div className="text-[11px] text-slate-400 flex items-center gap-1">
                                        <Clock size={13} className="text-sky-400"/> 
                                        {character.militaryData?.lastRefreshDate === currentMonth ? '이번 달 갱신 완료' : '작전 갱신 가능'}
                                    </div>
                                    <button 
                                        onClick={() => handleRefreshMissions(false)} 
                                        disabled={isGeneratingMissions || character.militaryData?.lastRefreshDate === currentMonth} 
                                        className={`text-xs px-3 py-1.5 rounded-xl border flex items-center gap-1.5 transition-colors font-bold ${character.militaryData?.lastRefreshDate === currentMonth ? 'bg-slate-900 text-slate-500 border-slate-800 cursor-not-allowed' : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700 shadow-sm'}`}
                                    >
                                        {isGeneratingMissions ? <Loader2 size={13} className="animate-spin"/> : <RefreshCw size={13} />} 
                                        작전 갱신
                                    </button>
                                </div>
                            </div>

                            {/* 수행 중인 작전 명령 및 외교 호위 진행 패널 */}
                            {(() => {
                                const activeMissions = character.militaryData?.activeMissions || [];
                                if (activeMissions.length === 0) return null;

                                return (
                                    <div className="space-y-3 bg-slate-950/70 p-4 rounded-2xl border border-sky-900/40">
                                        <div className="flex items-center justify-between">
                                            <h4 className="text-xs font-bold text-sky-400 uppercase tracking-wider flex items-center gap-1.5">
                                                <Sword size={14} className="text-sky-400"/> 현재 수행 중인 작전 ({activeMissions.length}/2)
                                            </h4>
                                            <span className="text-[11px] text-slate-500 font-medium">동시 수행 한도 2개</span>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            {activeMissions.map(m => {
                                                const isDiplomatic = m.type === 'MilitaryDiplomaticEscort';
                                                const isEscortStarted = Boolean(m.isEscortStarted);
                                                const isAtDest = Boolean(
                                                    m.destination?.city && 
                                                    loc.city && 
                                                    (loc.city === m.destination.city || loc.city.includes(m.destination.city) || m.destination.city.includes(loc.city))
                                                );

                                                return (
                                                    <div key={m.id} className="bg-slate-900/90 p-4 rounded-xl border border-sky-800/50 flex flex-col justify-between gap-3 shadow-md">
                                                        <div>
                                                            <div className="flex justify-between items-start mb-2">
                                                                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-sky-950 text-sky-300 border border-sky-800">
                                                                    {m.rank} 계급
                                                                </span>
                                                                <span className="text-[10px] font-bold text-amber-400 font-mono">
                                                                    +{m.rewardMerit || 70} 공적치
                                                                </span>
                                                            </div>
                                                            <h4 className="text-sm font-bold text-white mb-1">{m.title}</h4>
                                                            <p className="text-xs text-slate-300 leading-relaxed italic mb-2">"{m.goal}"</p>
                                                            
                                                            {isDiplomatic && (
                                                                <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800 text-xs space-y-1">
                                                                    <div className="flex justify-between text-slate-400">
                                                                        <span>호위 목적지:</span>
                                                                        <span className="font-bold text-sky-300">{m.destination?.nation} {m.destination?.city}</span>
                                                                    </div>
                                                                    <div className="flex justify-between text-slate-400">
                                                                        <span>현재 위치:</span>
                                                                        <span className="font-bold text-slate-300">{loc.nation} {loc.city}</span>
                                                                    </div>
                                                                    <div className="flex justify-between items-center text-slate-400 pt-1 border-t border-slate-800">
                                                                        <span>호위 상태:</span>
                                                                        <span className={isAtDest ? "text-emerald-400 font-bold" : isEscortStarted ? "text-amber-400 font-bold" : "text-slate-400"}>
                                                                            {isAtDest ? "목적지 도착 완료 (완료 보고 가능)" : isEscortStarted ? "호위 이동 진행 중" : "호위 출발 대기"}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* 외교 사절단 호위 전용 버튼 */}
                                                        {isDiplomatic && (
                                                            <div className="pt-2 border-t border-slate-800">
                                                                {isAtDest ? (
                                                                    <button
                                                                        onClick={() => handleCompleteDiplomaticEscort(m)}
                                                                        className="w-full py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-1.5 animate-pulse"
                                                                    >
                                                                        <CheckCircle size={14}/> 외교 사절단 호위 완료 보고
                                                                    </button>
                                                                ) : !isEscortStarted ? (
                                                                    <button
                                                                        onClick={() => handleStartDiplomaticEscort(m)}
                                                                        className="w-full py-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-1.5"
                                                                    >
                                                                        <Truck size={14}/> 외교 사절단 호위 출발
                                                                    </button>
                                                                ) : (
                                                                    <div className="text-center py-2 bg-slate-950/80 rounded-xl border border-slate-800 text-[11px] text-amber-300 font-medium">
                                                                        사절단 대열 호위 중 ({m.destination?.city}(으)로 이동하십시오)
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })()}

                            {isGeneratingMissions ? (
                                <div className="flex flex-col items-center justify-center py-20 text-slate-400 space-y-3">
                                    <Loader2 size={40} className="animate-spin text-sky-400"/>
                                    <p className="text-xs">사령부로부터 새로운 작전 지침을 수신 중입니다...</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                                    {(character.militaryData?.availableMissions || [])
                                        .filter(mission => {
                                            if (mission.type === 'MilitaryDiplomaticEscort' && rankIdx < captainRankIdx) return false;
                                            if (mission.type === 'MilitaryRecon' && rankIdx > captainRankIdx) return false;
                                            return true;
                                        })
                                        .map(mission => (
                                        <button 
                                            key={mission.id} 
                                            onClick={() => setSelectedMission(mission)} 
                                            className="bg-slate-950 p-4 sm:p-5 rounded-2xl border border-slate-800 hover:border-sky-500/60 transition-all text-left group flex flex-col justify-between"
                                        >
                                            <div>
                                                <div className="flex justify-between items-start mb-3">
                                                    <div className="p-2 bg-slate-900 rounded-xl border border-slate-800 group-hover:border-sky-500/40 transition-colors">
                                                        <MissionIcon type={mission.type} />
                                                    </div>
                                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${mission.danger === 'Extreme' ? 'bg-rose-950/60 text-rose-300 border-rose-800/60' : 'bg-sky-950/60 text-sky-300 border-sky-800/60'}`}>
                                                        {mission.danger === 'Extreme' ? '최고 위험' : (mission.danger as string) === 'Hard' || mission.danger === 'High' ? '위험' : (mission.danger as string) === 'Normal' || mission.danger === 'Mid' ? '보통' : '안전'}
                                                    </span>
                                                </div>
                                                <h4 className="font-bold text-slate-100 text-sm mb-1 line-clamp-1 group-hover:text-sky-400 transition-colors">
                                                    {mission.title}
                                                </h4>
                                                <p className="text-xs text-slate-400 line-clamp-2 italic mb-4">
                                                    "{mission.goal}"
                                                </p>
                                            </div>
                                            
                                            <div className="pt-3 border-t border-slate-900 flex justify-between items-center">
                                                <span className="text-[10px] text-slate-500 font-bold uppercase">보상</span>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sky-400 font-mono font-bold text-xs">+{mission.rewardExp} EXP</span>
                                                    <span className="text-amber-400 font-mono font-bold text-xs">{mission.rewardGold.toLocaleString()} G</span>
                                                </div>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* 3. 전선 상황 탭 */}
                    {activeTab === 'war' && isEnlistedInParty && (
                        <div className="space-y-5 animate-in slide-in-from-bottom-3 duration-200">
                            <div className="flex justify-between items-center bg-slate-950 p-4 rounded-2xl border border-slate-800">
                                <div>
                                    <h3 className="text-sm sm:text-base font-bold text-rose-400 flex items-center gap-2">
                                        <ShieldAlert size={18}/> 긴급 침공 및 방어 작전
                                    </h3>
                                    <p className="text-xs text-slate-400 mt-0.5">
                                        적국의 공세로부터 본국 영토를 지키십시오. 방치 시 전선 점유율이 하락합니다.
                                    </p>
                                </div>
                                <span className="text-[10px] text-rose-400 font-bold bg-rose-950/60 border border-rose-800/60 px-2.5 py-1 rounded-full">
                                    위기 대응 태세
                                </span>
                            </div>

                            <div className="grid grid-cols-1 gap-3">
                                {pendingInvasions.length > 0 ? pendingInvasions.map(nationName => (
                                    <div key={nationName} className="bg-slate-950 border border-rose-600/40 p-5 rounded-2xl flex flex-col md:flex-row justify-between items-center gap-4 hover:border-rose-500 transition-all shadow-lg">
                                        <div className="flex items-center gap-4 w-full md:w-auto">
                                            <div className="p-3.5 bg-rose-950/60 rounded-2xl border border-rose-600/50 shrink-0 text-rose-400">
                                                <Skull size={28} className="animate-pulse"/>
                                            </div>
                                            <div>
                                                <h4 className="text-base font-bold text-white flex items-center gap-2">
                                                    {nationName} 대규모 침공
                                                    <span className="text-[10px] bg-rose-600 text-white px-2 py-0.5 rounded font-bold">긴급</span>
                                                </h4>
                                                <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                                                    적군이 국경 방어선을 돌파하여 진입 중입니다. 즉시 대응하지 않으면 전선 점유율이 <span className="text-rose-400 font-bold">10% 하락</span>합니다.
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                                            <button 
                                                onClick={() => handleIgnoreInvasion(nationName)}
                                                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold text-xs transition-colors"
                                            >
                                                방치
                                            </button>
                                            <button 
                                                onClick={() => handleDefendInvasion(nationName)}
                                                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-xl font-bold text-xs transition-colors flex items-center justify-center gap-1.5"
                                            >
                                                <Sword size={13}/> 일반 출격
                                            </button>
                                            <button 
                                                onClick={() => setWarTacticsTargetNation(nationName)}
                                                className="px-4 py-2.5 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white rounded-xl font-bold text-xs shadow-lg shadow-rose-900/40 transition-colors flex items-center justify-center gap-1.5 animate-pulse"
                                            >
                                                <Users size={14}/> 전술판 총력 방어전
                                            </button>
                                        </div>
                                    </div>
                                )) : (
                                    <div className="py-16 text-center text-slate-500 border border-dashed border-slate-800 rounded-2xl bg-slate-950/40">
                                        <ShieldCheck size={48} className="mx-auto mb-3 text-slate-600"/>
                                        <p className="text-sm font-bold text-slate-300">전선 이상 없음</p>
                                        <p className="text-xs text-slate-500 mt-1">현재 감지된 적국의 대규모 침공 시도가 없습니다.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* 4. 인사 및 승급 탭 */}
                    {activeTab === 'promotion' && isEnlistedInParty && (
                        <div className="space-y-6 max-w-3xl mx-auto animate-in slide-in-from-bottom-3 duration-200">
                            
                            {/* 기준표 카드 */}
                            <div className="bg-slate-950 p-4 sm:p-5 rounded-2xl border border-slate-800">
                                <h4 className="text-xs font-bold text-sky-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                                    <Info size={15}/> 계급별 진급 기준 및 월 급여표
                                </h4>
                                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                                    {MILITARY_RANK_ORDER.map((rank) => {
                                        const threshold = MILITARY_RANK_THRESHOLD[rank];
                                        const salary = MILITARY_SALARY[rank];
                                        const isCurrent = character.militaryRank === rank;
                                        return (
                                            <div 
                                                key={rank} 
                                                className={`p-2.5 rounded-xl border text-center ${isCurrent ? 'bg-sky-950/60 border-sky-500 shadow-sm' : 'bg-slate-900 border-slate-800/80'}`}
                                            >
                                                <div className="text-xs font-bold text-slate-100 flex items-center justify-center gap-1">
                                                    {rank}
                                                    {isCurrent && <span className="w-1.5 h-1.5 rounded-full bg-sky-400"></span>}
                                                </div>
                                                <div className="text-[10px] text-amber-400 font-mono mt-1 font-bold">
                                                    {threshold === 0 ? '기본' : `${threshold.toLocaleString()} 공적치`}
                                                </div>
                                                <div className="text-[9px] text-slate-400 font-mono mt-0.5">
                                                    {salary.toLocaleString()} G
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* 승급 대상자 목록 */}
                            <div className="space-y-3">
                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">승급 심사 대상자</h4>
                                
                                {isPlayerSoldier && (
                                    <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                                        <div className="flex items-center gap-3">
                                            <div className="w-11 h-11 rounded-xl bg-sky-950/60 border border-sky-600/40 flex items-center justify-center text-sky-400">
                                                <Users size={20}/>
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <h4 className="font-bold text-white text-sm">{character.name}</h4>
                                                    <span className="text-[10px] bg-sky-900/60 text-sky-300 px-1.5 py-0.5 rounded border border-sky-700/50">본인</span>
                                                </div>
                                                <div className="flex items-center gap-2 mt-0.5 text-xs">
                                                    <span className="text-sky-400 font-bold">{character.militaryRank || '이등병'}</span>
                                                    <span className="text-slate-700">|</span>
                                                    <span className="text-amber-400 font-mono font-bold">
                                                        {(character.militaryData?.merit || 0).toLocaleString()} 공적치
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <button 
                                            onClick={() => handlePromoteEntity('player')} 
                                            className="w-full sm:w-auto px-5 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl font-bold text-xs shadow-md transition-colors"
                                        >
                                            진급 신청
                                        </button>
                                    </div>
                                )}

                                {militaryCompanions.map(merc => {
                                    const rank = merc.militaryRank || MilitaryRank.PVT;
                                    const rankIdxLocal = MILITARY_RANK_ORDER.indexOf(rank);
                                    const nextRank = MILITARY_RANK_ORDER[rankIdxLocal + 1];
                                    const merit = (merc as any).merit || 0;
                                    const threshold = nextRank ? MILITARY_RANK_THRESHOLD[nextRank] : 0;
                                    const canPromo = nextRank && merit >= threshold;

                                    return (
                                        <div key={merc.id} className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-11 h-11 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center overflow-hidden shrink-0">
                                                    {merc.visualUrl ? (
                                                        <img src={merc.visualUrl} alt={merc.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                                    ) : (
                                                        <span className="text-lg">👤</span>
                                                    )}
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-slate-200 text-sm">{merc.name}</h4>
                                                    <div className="flex items-center gap-2 mt-0.5 text-xs">
                                                        <span className="text-sky-300 font-bold">{rank}</span>
                                                        <span className="text-slate-700">|</span>
                                                        <span className="text-amber-400 font-mono font-bold">
                                                            {merit.toLocaleString()} 공적치
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto">
                                                {nextRank && (
                                                    <div className="text-right text-xs">
                                                        <span className={canPromo ? 'text-emerald-400 font-bold' : 'text-slate-500'}>
                                                            {canPromo ? '진급 요건 충족' : `부족: ${(threshold - merit).toLocaleString()} 공적치`}
                                                        </span>
                                                    </div>
                                                )}
                                                <button 
                                                    onClick={() => handlePromoteEntity(merc.id)} 
                                                    className="px-5 py-2 bg-slate-800 hover:bg-sky-900/50 text-slate-200 hover:text-sky-200 border border-slate-700 hover:border-sky-600 rounded-xl font-bold text-xs transition-colors"
                                                >
                                                    진급 심사
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* 5. 부대원 충원 탭 */}
                    {activeTab === 'recruit' && isEnlistedInParty && (
                        <div className="space-y-5 animate-in slide-in-from-bottom-3 duration-200">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-slate-950 p-4 rounded-2xl border border-slate-800">
                                <div>
                                    <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                                        <Users size={18} className="text-sky-400"/> 병력 충원 센터
                                    </h3>
                                    <p className="text-xs text-slate-400 mt-0.5">
                                        {rankIdx > 0 ? '지휘관 권한으로 아군 부대에 배속할 신규 병력을 선발합니다.' : '이등병 계급은 독자적인 병력 충원 권한이 없습니다.'}
                                    </p>
                                </div>
                                {rankIdx > 0 ? (
                                    <button 
                                        onClick={handleRefreshRecruits} 
                                        disabled={isRecruitLoading} 
                                        className="text-xs px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl border border-slate-700 font-bold flex items-center gap-1.5 transition-colors"
                                    >
                                        {isRecruitLoading ? <Loader2 size={13} className="animate-spin"/> : <RefreshCw size={13}/>} 
                                        명단 갱신
                                    </button>
                                ) : (
                                    <span className="text-xs text-rose-400 font-bold flex items-center gap-1 bg-rose-950/40 border border-rose-800/40 px-2.5 py-1 rounded-lg">
                                        <AlertTriangle size={13}/> 권한 없음
                                    </span>
                                )}
                            </div>

                            {isRecruitLoading ? (
                                <div className="flex flex-col items-center justify-center py-20 text-slate-400 space-y-3">
                                    <Loader2 size={40} className="animate-spin text-sky-400"/>
                                    <p className="text-xs">선발 가능한 병력 명단을 확인 중입니다...</p>
                                </div>
                            ) : recruits.length > 0 ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                                    {recruits.map(merc => {
                                        const playerRep = character.mercenaryData?.reputation ?? (character as any).reputation ?? 0;
                                        const playerMerit = character.militaryData?.merit ?? (character as any).merit ?? 0;
                                        const mercRep = merc.reputation ?? 0;
                                        const mercMerit = (merc as any).merit ?? 0;
                                        const isOverRep = mercRep > playerRep;
                                        const isOverMerit = mercMerit > playerMerit;
                                        const cannotRecruit = isOverRep || isOverMerit;

                                        return (
                                            <div 
                                                key={merc.id} 
                                                className={`p-4 rounded-2xl border flex flex-col justify-between transition-all ${
                                                    cannotRecruit 
                                                        ? 'bg-slate-950/80 border-rose-900/40' 
                                                        : 'bg-slate-950 border-slate-800 hover:border-sky-500/40'
                                                }`}
                                            >
                                                <div className="flex gap-3 items-start mb-3">
                                                    <div className="w-14 h-14 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0 overflow-hidden">
                                                        {merc.visualUrl ? (
                                                            <img src={merc.visualUrl} alt={merc.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                                        ) : (
                                                            <span className="text-xl">👤</span>
                                                        )}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex justify-between items-center">
                                                            <h4 className="font-bold text-slate-100 text-sm truncate">{merc.name}</h4>
                                                            <span className="text-[10px] text-sky-400 font-bold">{merc.militaryRank}</span>
                                                        </div>
                                                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                                            <span className="text-[10px] text-amber-400 font-bold bg-amber-950/40 px-1.5 py-0.5 rounded border border-amber-800/40 font-mono">
                                                                레벨.{merc.level}
                                                            </span>
                                                            {merc.combatStyle && COMBAT_STYLE_CONFIG[merc.combatStyle] && (
                                                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${COMBAT_STYLE_CONFIG[merc.combatStyle].bgColor} ${COMBAT_STYLE_CONFIG[merc.combatStyle].borderColor} ${COMBAT_STYLE_CONFIG[merc.combatStyle].color}`}>
                                                                    ⚔️ {COMBAT_STYLE_CONFIG[merc.combatStyle].label}
                                                                </span>
                                                            )}
                                                            {cannotRecruit && (
                                                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-rose-950/70 border border-rose-800/80 text-rose-300 flex items-center gap-1">
                                                                    <AlertTriangle size={10} className="text-rose-400"/>
                                                                    배속 불가 ({isOverMerit && isOverRep ? '공적·명성 초과' : isOverMerit ? '공적 초과' : '명성 초과'})
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="text-[10px] text-slate-400 mt-1 flex flex-wrap gap-x-2">
                                                            <span>
                                                                공적치: <span className={`font-mono font-bold ${isOverMerit ? 'text-rose-400' : 'text-amber-400'}`}>{mercMerit.toLocaleString()}</span>
                                                            </span>
                                                            {mercRep > 0 && (
                                                                <span>
                                                                    명성치: <span className={`font-mono font-bold ${isOverRep ? 'text-rose-400' : 'text-slate-300'}`}>{mercRep.toLocaleString()}</span>
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                                <button 
                                                    onClick={() => handleRecruitMilitary(merc)} 
                                                    disabled={cannotRecruit}
                                                    className={`w-full py-2 rounded-xl border text-xs font-bold transition-colors ${
                                                        cannotRecruit
                                                            ? 'bg-slate-800 text-slate-500 border-slate-700 cursor-not-allowed'
                                                            : 'bg-sky-950/60 hover:bg-sky-700 text-sky-200 hover:text-white border-sky-800/60'
                                                    }`}
                                                >
                                                    {cannotRecruit ? '배속 불가 (공적/명성 초과)' : '부대 배속'}
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="text-center py-16 text-slate-500 border border-dashed border-slate-800 rounded-2xl bg-slate-950/30">
                                    <Users size={40} className="mx-auto mb-2 text-slate-600"/>
                                    <p className="text-xs font-bold text-slate-400">현재 충원 대기 중인 인원이 없습니다.</p>
                                    <p className="text-[11px] text-slate-500 mt-0.5">상단의 [명단 갱신] 버튼을 눌러 인원을 선발하십시오.</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* 6. 지휘 통제 탭 */}
                    {activeTab === 'command' && isEnlistedInParty && (
                        <div className="max-w-2xl mx-auto py-6 space-y-6 animate-in slide-in-from-bottom-3 duration-200">
                            <div className="text-center bg-slate-950 p-6 rounded-2xl border border-slate-800">
                                <div className="w-16 h-16 rounded-2xl bg-sky-950/60 border border-sky-600/40 flex items-center justify-center mx-auto mb-3 shadow-inner">
                                    <Crown size={30} className="text-sky-400" />
                                </div>
                                <h3 className="text-lg sm:text-2xl font-bold text-white mb-1">통합 지휘 통제실</h3>
                                <p className="text-slate-400 text-xs sm:text-sm leading-relaxed">
                                    {isOfficer ? `최고 지휘관 '${commander.name}' (${commander.rank})의 권한으로 부대 시설 및 훈련을 총괄합니다.` : '국가 외교 상황실을 통해 대륙 정세를 파악할 수 있습니다.'}
                                </p>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                                {!isOfficer ? (
                                    <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 text-center col-span-1 sm:col-span-2 space-y-3">
                                        <button 
                                            onClick={() => setIsDiplomacyOpen(true)}
                                            className="w-full p-5 bg-slate-900 hover:bg-slate-850 border border-slate-700 hover:border-sky-500/50 text-white font-bold rounded-2xl shadow-lg flex flex-col items-center justify-center gap-2.5 transition-all"
                                        >
                                            <Globe size={28} className="text-sky-400"/>
                                            <div>
                                                <div className="text-sm font-bold">국가 외교 상황실</div>
                                                <div className="text-[11px] text-slate-400 font-normal mt-0.5">세계 정세 및 국가 관계 확인</div>
                                            </div>
                                        </button>
                                        <div className="flex items-center gap-2 bg-slate-900/60 p-3 rounded-xl border border-slate-800 text-left">
                                            <Lock size={15} className="text-slate-500 shrink-0" />
                                            <p className="text-xs text-slate-400">
                                                부대 시설 관리 및 합동 훈련 권한은 <span className="text-sky-400 font-bold">소위</span> 이상의 장교만 접근할 수 있습니다. (현재: {commander.rank})
                                            </p>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <button 
                                            onClick={() => setIsFacilityOpen(true)} 
                                            className="p-5 bg-slate-950 hover:bg-slate-850 border border-slate-800 hover:border-sky-500/50 text-white font-bold rounded-2xl shadow-lg flex flex-col items-center justify-center gap-2.5 transition-all"
                                        >
                                            <Building2 size={28} className="text-sky-400"/>
                                            <div className="text-center">
                                                <div className="text-sm font-bold">부대 시설 관리</div>
                                                <div className="text-[11px] text-slate-400 font-normal mt-0.5">보직 배정 및 직무 관리</div>
                                            </div>
                                        </button>
                                        <button 
                                            onClick={() => setIsTrainingOpen(true)} 
                                            className="p-5 bg-slate-950 hover:bg-slate-850 border border-slate-800 hover:border-sky-500/50 text-white font-bold rounded-2xl shadow-lg flex flex-col items-center justify-center gap-2.5 transition-all"
                                        >
                                            <Dumbbell size={28} className="text-indigo-400"/>
                                            <div className="text-center">
                                                <div className="text-sm font-bold">부대 합동 훈련</div>
                                                <div className="text-[11px] text-slate-400 font-normal mt-0.5">부대원 역량 및 능력치 강화</div>
                                            </div>
                                        </button>
                                        <button 
                                            onClick={() => setIsDiplomacyOpen(true)}
                                            className="p-5 bg-slate-950 hover:bg-slate-850 border border-slate-800 hover:border-sky-500/50 text-white font-bold rounded-2xl shadow-lg flex flex-col items-center justify-center gap-2.5 transition-all col-span-1 sm:col-span-2"
                                        >
                                            <Globe size={28} className="text-emerald-400"/>
                                            <div className="text-center">
                                                <div className="text-sm font-bold">국가 외교 상황실</div>
                                                <div className="text-[11px] text-slate-400 font-normal mt-0.5">세계 정세 및 국가 관계 총괄</div>
                                            </div>
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MilitaryModal;
