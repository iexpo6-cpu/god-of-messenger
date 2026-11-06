import React, { useState, useEffect } from 'react';
import { Character, MercenaryRank, Quest, Companion, ClassTier, JobType, Criminal, ItemRarity } from '../types';
import { 
    X, ScrollText, Shield, Target, Zap, Skull, Gavel, Users, 
    Coins, Globe, AlertTriangle, ShieldCheck, CheckCircle, Search, 
    UserPlus, Crown, RefreshCw, FileText, Loader2, Lock, Clock, 
    MessageCircle, Heart, User, LayoutGrid, LogOut, ArrowUpCircle, 
    Award, TrendingUp, ShieldAlert, Truck, BookOpen, ChevronRight, 
    Sparkles, Compass, Swords, HelpCircle
} from 'lucide-react';
import { assignRandomCombatStyle, generateName, generateCompanionStats, generateLevelByRank, getTierByLevel, getYear, generateDefaultVisualUrl, generateClassmates, findAvailableBattlePosition } from '../utils';
import { QUEST_RANK_INDEX, QUEST_DANGER_INDEX, SHINRYOKU_TYPES_LIST, INFAMY_CONFIG, WORLD_GEOGRAPHY, COMBAT_STYLE_CONFIG, HUMANOID_CLASSES, getHumanoidClassByTier } from '../constants';
import { NATION_THEMES, HUNT_LEVEL_BANDS } from '../monsterfield';
import { WORLD_LOOT_TABLES } from '../monsterLootTable';
import { getBossByLocation } from '../bossMonsters';
import ActionResultModal, { ResultData } from './ActionResultModal';
import MercenaryGroupModal from './MercenaryGroupModal'; 
import MercenaryFactionModal from './MercenaryFactionModal'; 
import { MERCENARY_RANK_THRESHOLD, getNextMercenaryRank, getReputationRangeByRank } from '../mercenaryRankUp';
import { generateRegionalBlacklist } from '../criminals';
import { getMessengerVisualUrl } from '../messengerofgodvisual';
import { getShinryokuThematicClassName, checkAndInitializeLiberationEligibility } from '../services/companionGrowthService';
import { sanitizeYoungStudents, sanitizeYoungStudent } from '../services/studentMentoringService';
import { determineRecruitClassTier } from '../services/classLiberationHelper';

interface Props { 
    character: Character;
    onClose: () => void;
    onUpdateCharacter: (newChar: Character, logMsg: string) => void;
    onAction: (action: string) => void;
}

type Tab = 'register' | 'board' | 'blacklist' | 'recruit' | 'promotion' | 'group' | 'join';

const RANK_ORDER: MercenaryRank[] = [
    MercenaryRank.F, MercenaryRank.E, MercenaryRank.D, MercenaryRank.C,
    MercenaryRank.B, MercenaryRank.A, MercenaryRank.S, MercenaryRank.SS, MercenaryRank.SSS
];

const RANK_COLORS: Record<MercenaryRank, { badge: string; text: string; bg: string; border: string }> = {
    [MercenaryRank.F]: { badge: 'bg-zinc-800 text-zinc-300 border-zinc-700', text: 'text-zinc-400', bg: 'from-zinc-900 to-zinc-950', border: 'border-zinc-800' },
    [MercenaryRank.E]: { badge: 'bg-emerald-950/80 text-emerald-300 border-emerald-800/60', text: 'text-emerald-400', bg: 'from-emerald-950/40 to-slate-950', border: 'border-emerald-900/50' },
    [MercenaryRank.D]: { badge: 'bg-cyan-950/80 text-cyan-300 border-cyan-800/60', text: 'text-cyan-400', bg: 'from-cyan-950/40 to-slate-950', border: 'border-cyan-900/50' },
    [MercenaryRank.C]: { badge: 'bg-blue-950/80 text-blue-300 border-blue-800/60', text: 'text-blue-400', bg: 'from-blue-950/40 to-slate-950', border: 'border-blue-900/50' },
    [MercenaryRank.B]: { badge: 'bg-purple-950/80 text-purple-300 border-purple-800/60', text: 'text-purple-400', bg: 'from-purple-950/40 to-slate-950', border: 'border-purple-900/50' },
    [MercenaryRank.A]: { badge: 'bg-rose-950/80 text-rose-300 border-rose-800/60', text: 'text-rose-400', bg: 'from-rose-950/40 to-slate-950', border: 'border-rose-900/50' },
    [MercenaryRank.S]: { badge: 'bg-amber-950/80 text-amber-300 border-amber-800/60', text: 'text-amber-400', bg: 'from-amber-950/40 to-slate-950', border: 'border-amber-900/50' },
    [MercenaryRank.SS]: { badge: 'bg-orange-950/80 text-orange-300 border-orange-700/60', text: 'text-orange-400', bg: 'from-orange-950/40 to-slate-950', border: 'border-orange-900/50' },
    [MercenaryRank.SSS]: { badge: 'bg-red-950/90 text-red-200 border-red-600/80 shadow-[0_0_10px_rgba(239,68,68,0.3)]', text: 'text-red-400', bg: 'from-red-950/50 to-slate-950', border: 'border-red-600/60' },
};

const MercenaryGuildModal: React.FC<Props> = ({ character, onClose, onUpdateCharacter, onAction }) => {
    const [activeTab, setActiveTab] = useState<Tab>('board');
    const [recruits, setRecruits] = useState<Companion[]>(() => character.mercenaryData?.availableRecruits || []);
    const [isRecruitLoading, setIsRecruitLoading] = useState(false);
    const [resultData, setResultData] = useState<ResultData | null>(null);
    const [isGeneratingQuests, setIsGeneratingQuests] = useState(false);
    const [isGroupModalOpen, setIsGroupModalOpen] = useState(false); 
    const [isFactionModalOpen, setIsFactionModalOpen] = useState(false); 
    
    const [selectedQuest, setSelectedQuest] = useState<Quest | null>(null);
    const [selectedCriminal, setSelectedCriminal] = useState<Criminal | null>(null);
    const [talkCompanion, setTalkCompanion] = useState<Companion | null>(null);
    const [talkStep, setTalkStep] = useState<'intro' | 'choice' | 'result'>('intro');
    const [talkMessage, setTalkMessage] = useState('');
    const [hasConvinced, setHasConvinced] = useState(false);
    const [confirmAction, setConfirmAction] = useState<(() => void) | null>(null);

    const loc = character.currentLocation || { nation: '대한민국', city: '서울' };
    const mData = character.mercenaryData;
    const currentRank = mData?.rank || MercenaryRank.F;
    const currentMonth = character.currentDate?.substring(0, 7);
    const currentYear = getYear(character.currentDate || '2000-01-01');

    const availableQuests = mData?.availableQuests || [];
    const ageNum = parseInt(character.age.replace(/[^0-9]/g, '')) || 0;
    const canRegisterJob = character.job === JobType.MERCENARY;

    // 플레이어 지명수배 정보 계산
    const getInfamyStage = (val: number = 0) => {
        const { STAGES } = INFAMY_CONFIG;
        if (val >= STAGES.CALAMITY.threshold) return STAGES.CALAMITY;
        if (val >= STAGES.DISASTER.threshold) return STAGES.DISASTER;
        if (val >= STAGES.WANTED.threshold) return STAGES.WANTED;
        if (val >= STAGES.CRIMINAL.threshold) return STAGES.CRIMINAL;
        if (val >= STAGES.SUSPECT.threshold) return STAGES.SUSPECT;
        return STAGES.NONE;
    };
    const infamyStage = getInfamyStage(character.infamy || 0);
    const isPlayerWanted = infamyStage.rank !== 'NONE' as any;
    const playerBounty = (character.infamy || 0) * 500;
    const playerMessengerVisual = character.visualUrl;

    // 블랙리스트 갱신 로직
    const handleRefreshBlacklist = (isInitial = false) => {
        if (!mData) return;

        const lastRefreshYear = mData.lastBlacklistRefreshYear || 0;
        
        // 연간 갱신 제한 체크
        if (!isInitial && lastRefreshYear >= currentYear) {
            setResultData({
                type: 'info',
                title: '갱신 불가',
                message: `블랙리스트 명단은 1년에 한 번만 수동으로 갱신할 수 있습니다.\n다음 갱신은 ${currentYear + 1}년에 가능합니다.`,
                items: [{ label: '최근 갱신일', after: `${lastRefreshYear}년` }]
            });
            return;
        }

        const newBlacklist = generateRegionalBlacklist(loc.nation, character.level, 4);
        const newChar = { ...character };
        newChar.mercenaryData = {
            ...newChar.mercenaryData!,
            blacklist: newBlacklist,
            lastBlacklistRefreshYear: currentYear
        };

        onUpdateCharacter(newChar, isInitial ? "" : `[용병 길드] ${loc.nation} 지부의 블랙리스트 명단이 최신화되었습니다.`);
        
        if (!isInitial) {
            setResultData({
                type: 'success',
                title: '블랙리스트 갱신 완료',
                message: `${loc.nation}의 치안 상황에 맞춘 새로운 수배 명단이 도착했습니다.`,
                items: [{ label: '수배 인원', after: '4명' }, { label: '갱신 연도', after: `${currentYear}년` }]
            });
        }
    };

    // 초기 로드 시 블랙리스트가 없으면 생성
    useEffect(() => {
        if (mData && !mData.blacklist) {
            handleRefreshBlacklist(true);
        }
    }, [mData]);

    const handleRefreshQuests = async (isInitial = false) => {
        if (!isInitial && mData && mData.lastRefreshDate === currentMonth) {
            setResultData({
                type: 'info',
                title: '갱신 불가',
                message: '용병 길드 게시판은 한 달에 한 번만 수동으로 갱신할 수 있습니다.\n다음 달에 다시 확인해주세요.',
                items: [{ label: '최근 갱신일', after: mData.lastRefreshDate }]
            });
            return;
        }

        setIsGeneratingQuests(true);
        try {
            const nation = loc.nation;
            const theme = NATION_THEMES[nation] || NATION_THEMES.default;
            const rankIdxNum = RANK_ORDER.indexOf(currentRank);
            
            let targetBands: string[] = [];
            if (currentRank === MercenaryRank.F) targetBands = ['beginner'];
            else if (currentRank === MercenaryRank.E) targetBands = ['lower'];
            else if (currentRank === MercenaryRank.D) targetBands = ['intermediate'];
            else if (currentRank === MercenaryRank.C) targetBands = ['advanced'];
            else if (currentRank === MercenaryRank.B) targetBands = ['elite', 'disaster'];
            else if (currentRank === MercenaryRank.A) targetBands = ['abyss'];
            else if (currentRank === MercenaryRank.S) targetBands = ['mythic'];
            else if (currentRank === MercenaryRank.SS) targetBands = ['mythic'];
            else if (currentRank === MercenaryRank.SSS) targetBands = ['mythic'];
            else targetBands = ['beginner'];

            const monsterPool: string[] = [];
            targetBands.forEach(bId => {
                const pool = theme.monsters[bId] || [];
                monsterPool.push(...pool.map(m => typeof m === 'string' ? m : m.name));
            });

            const bandNames = targetBands.map(id => HUNT_LEVEL_BANDS.find(b => b.id === id)?.name).join('/');
            const fieldDesc = `${nation}의 ${theme.fieldSuffix} (${bandNames})`;
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

            let aiQuests: Quest[] = [];
            const dangerKeys: (keyof typeof QUEST_DANGER_INDEX)[] = ['Low', 'Mid', 'High', 'Extreme'];
            
            for (let i = 0; i < 5; i++) {
                const targetMonster = monsterPool[Math.floor(Math.random() * monsterPool.length)] || "미확인 생명체";
                const danger = dangerKeys[Math.floor(Math.random() * dangerKeys.length)];
                const count = Math.floor(Math.random() * 5) + 3; // 3~7마리
                const questRank = RANK_ORDER[Math.max(0, Math.min(rankIdxNum, Math.floor(Math.random() * (rankIdxNum + 1))))];
                
                const rankMultiplier = QUEST_RANK_INDEX[questRank] || 800;
                const dangerMultiplier = QUEST_DANGER_INDEX[danger] || 1.0;
                
                const rewardExp = Math.floor(count * rankMultiplier * (2 + Math.random() * 0.35) * dangerMultiplier);
                const rewardGold = Math.floor(count * rankMultiplier * (4 + Math.random() * 2.5) * dangerMultiplier);

                const isInstructor = Math.random() < 0.15;
                
                if (isInstructor) {
                    const availableTiers: ('초급' | '중급' | '고급')[] = [];
                    if (rankIdxNum >= 3) availableTiers.push('초급');
                    if (rankIdxNum >= 4) availableTiers.push('중급');
                    if (rankIdxNum >= 5) availableTiers.push('고급');

                    if (availableTiers.length > 0) {
                        const tier = availableTiers[Math.floor(Math.random() * availableTiers.length)];
                        const cityName = character.currentLocation?.city || nation;
                        const schoolName = `${cityName} ${tier} 레귤러스 학교`;
                        
                        let minRankIdx = 3;
                        if (tier === '중급') minRankIdx = 4;
                        if (tier === '고급') minRankIdx = 5;
                        
                        const questRank = RANK_ORDER[Math.max(minRankIdx, Math.min(rankIdxNum, Math.floor(Math.random() * (rankIdxNum + 1))))];

                        const rawStudents = generateClassmates(character.nation, 5, tier, undefined, [], 1, undefined, true, currentYear);
                        const studentsToTeach = sanitizeYoungStudents(rawStudents);

                        aiQuests.push({
                            id: `local_inst_${Date.now()}_${i}`,
                            type: 'TemporaryInstructor',
                            rank: questRank,
                            title: `[임시 교관] ${schoolName} 강의 지원`,
                            goal: `${schoolName}에서 강의 진행`,
                            details: `${cityName}의 ${tier} 레귤러스 학교에서 학생들에게 실전 지식을 전수해 주세요.`,
                            danger: 'Low' as 'Low' | 'Mid' | 'High' | 'Extreme',
                            rewardGold: tier === '초급' ? 50000 : tier === '중급' ? 120000 : 250000,
                            rewardExp: tier === '초급' ? 10000 : tier === '중급' ? 25000 : 50000,
                            location: { nation: character.nation, city: cityName },
                            schoolName: schoolName,
                            schoolTier: tier,
                            studentsToTeach: studentsToTeach
                        });
                        continue;
                    }
                }
                aiQuests.push({
                    id: `merc_fall_${Date.now()}_${i}`,
                    type: 'Subjugation',
                    rank: questRank,
                    title: `토벌: ${targetMonster} 무리 제거`,
                    goal: `${targetMonster} ${count}마리 처치`,
                    details: `지역 주민들을 괴롭히는 ${targetMonster}들을 처치해달라는 의뢰입니다.`,
                    danger: danger as 'Low' | 'Mid' | 'High' | 'Extreme',
                    rewardGold,
                    rewardExp,
                    currentAmount: 0,
                    targetAmount: count,
                    targetName: targetMonster
                });
            }
            
            const parsedQuests = aiQuests.map(q => {
                if (q.type === 'Collection') {
                    const countMatch = q.goal.match(/(\d+)개/);
                    const targetAmount = countMatch ? parseInt(countMatch[1]) : 10;
                    return { ...q, currentAmount: 0, targetAmount: q.targetAmount || targetAmount, targetName: q.targetName || q.goal.split(' ')[0] };
                }
                const countMatch = q.goal.match(/(\d+)마리/);
                const targetAmount = countMatch ? parseInt(countMatch[1]) : 5;
                let targetName = "";
                monsterPool.forEach(m => { if(q.goal.includes(m)) targetName = m; });
                return { ...q, currentAmount: 0, targetAmount: q.targetAmount || targetAmount, targetName: q.targetName || targetName };
            });

            // 로컬 아이템 수집 의뢰 추가 (3개)
            const lootArray = Array.from(lootPoolSet);
            for (let i = 0; i < 3; i++) {
                const targetItem = lootArray[Math.floor(Math.random() * lootArray.length)] || "고기";
                const count = 3 + Math.floor(Math.random() * 4);
                const questRank = RANK_ORDER[Math.max(0, Math.min(rankIdxNum, Math.floor(Math.random() * (rankIdxNum + 1))))];
                const rankMultiplier = QUEST_RANK_INDEX[questRank] * 2 || 800;
                
                parsedQuests.push({
                    id: `merc_coll_${Date.now()}_${i}`,
                    type: 'Collection',
                    rank: questRank,
                    title: `수집: ${targetItem} 확보`,
                    goal: `${targetItem} ${count}개 수집`,
                    details: `길드에서 연구 및 보급을 위해 ${targetItem} ${count}개가 필요합니다. 해당 지역의 마물들을 사냥하여 확보해주십시오.`,
                    danger: "Low",
                    rewardGold: Math.floor(count * rankMultiplier * 5),
                    rewardExp: Math.floor(count * rankMultiplier * 3),
                    currentAmount: 0,
                    targetAmount: count,
                    targetName: targetItem
                });
            }

            // [신규] 던전 실종자 구출 의뢰 (Rescue)
            const rescueRank = RANK_ORDER[Math.max(0, Math.min(rankIdxNum, Math.floor(Math.random() * (rankIdxNum + 1))))];
            const rescueRankMult = QUEST_RANK_INDEX[rescueRank] || 800;
            const rescueDanger: 'Mid' | 'High' = Math.random() < 0.5 ? 'Mid' : 'High';
            parsedQuests.push({
                id: `merc_rescue_${Date.now()}`,
                type: 'Rescue',
                rank: rescueRank,
                title: `[구출 의뢰] ${loc.city} 던전 실종자 수색 및 구출`,
                goal: `${loc.city} 던전에 고립된 실종자 수색 완료`,
                details: `${loc.city} 던전 탐험 도중 실종되어 조난당한 모험가를 수색하고 무사히 구조하십시오. (${loc.city} 던전에서만 구조 가능)`,
                danger: rescueDanger,
                rewardGold: Math.floor(rescueRankMult * 12 + Math.random() * 2000),
                rewardExp: Math.floor(rescueRankMult * 8 + Math.random() * 1000),
                currentAmount: 0,
                targetAmount: 1,
                targetName: '실종자',
                targetCity: loc.city,
                location: { nation: loc.nation, city: loc.city }
            });

            // SS등급: 신화영역 ~ 수도가 아닌 지역의 보스 토벌 의뢰
            if (currentRank === MercenaryRank.SS) {
                const currentRegion = Object.keys(WORLD_GEOGRAPHY).find(r => Object.keys(WORLD_GEOGRAPHY[r]).includes(loc.nation)) || '아시아';
                const geo = WORLD_GEOGRAPHY[currentRegion]?.[loc.nation] || { capital: loc.city, cities: [loc.city] };
                const nonCapitalCities = geo.cities.filter(c => c !== geo.capital);
                const targetCity = nonCapitalCities.length > 0 ? nonCapitalCities[Math.floor(Math.random() * nonCapitalCities.length)] : loc.city;
                const monthNum = parseInt(character.currentDate?.split('-')[1] || '3');
                const boss = getBossByLocation(loc.nation, targetCity, monthNum);

                parsedQuests.push({
                    id: `merc_boss_ss_${Date.now()}`,
                    type: 'Subjugation',
                    rank: MercenaryRank.SS,
                    title: `[지역 보스 토벌] ${boss.name} 처치 의뢰`,
                    goal: `${boss.name} 1마리 처치`,
                    details: `${loc.nation} ${targetCity} 일대에 출몰한 강력한 우두머리 ${boss.name}을(를) 토벌하는 최고위 의뢰입니다.`,
                    danger: 'Extreme',
                    rewardGold: 1500000,
                    rewardExp: 200000,
                    currentAmount: 0,
                    targetAmount: 1,
                    targetName: boss.name,
                    location: { nation: loc.nation, city: targetCity }
                });
            }

            // SSS등급: 신화영역 ~ 수도지역 보스 토벌 의뢰
            if (currentRank === MercenaryRank.SSS) {
                const currentRegion = Object.keys(WORLD_GEOGRAPHY).find(r => Object.keys(WORLD_GEOGRAPHY[r]).includes(loc.nation)) || '아시아';
                const geo = WORLD_GEOGRAPHY[currentRegion]?.[loc.nation] || { capital: loc.city, cities: [loc.city] };
                const capitalCity = geo.capital || loc.city;
                const monthNum = parseInt(character.currentDate?.split('-')[1] || '3');
                const boss = getBossByLocation(loc.nation, capitalCity, monthNum);

                parsedQuests.push({
                    id: `merc_boss_sss_${Date.now()}`,
                    type: 'Subjugation',
                    rank: MercenaryRank.SSS,
                    title: `[수도 보스 토벌] ${boss.name} 토벌 의뢰`,
                    goal: `${boss.name} 1마리 처치`,
                    details: `${loc.nation}의 수도 ${capitalCity}를 위협하는 거대 우두머리 ${boss.name}을(를) 토벌해 주십시오.`,
                    danger: 'Extreme',
                    rewardGold: 3000000,
                    rewardExp: 500000,
                    currentAmount: 0,
                    targetAmount: 1,
                    targetName: boss.name,
                    location: { nation: loc.nation, city: capitalCity }
                });
            }

            // Escort Missions (호송/호위)
            const regions = Object.keys(WORLD_GEOGRAPHY);
            const reputation = character.mercenaryData?.reputation || 0;

            if (reputation >= 10000) {
                const destRegion = regions[Math.floor(Math.random() * regions.length)];
                const nationsInRegion = Object.keys(WORLD_GEOGRAPHY[destRegion]);
                const destNation = nationsInRegion[Math.floor(Math.random() * nationsInRegion.length)];
                const destCities = WORLD_GEOGRAPHY[destRegion][destNation].cities;
                const destCity = destCities[Math.floor(Math.random() * destCities.length)];
                
                parsedQuests.push({
                    id: `merc_escort_king_${Date.now()}`,
                    type: 'MercenaryEscort',
                    rank: MercenaryRank.SSS,
                    title: `[국왕 호위] ${loc.nation} 국왕의 ${destNation} 극비 순방`,
                    goal: `${destNation} ${destCity}까지 국왕 호위`,
                    details: `${loc.nation}의 국왕 전하께서 ${destNation}과의 정상회담을 위해 친선 행차를 결심하셨습니다. 최고 등급의 용병으로서 신변을 안전하게 보호하십시오.`,
                    danger: 'Extreme',
                    rewardGold: 10000000,
                    rewardExp: 500000,
                    destination: { region: destRegion, nation: destNation, city: destCity },
                    escortTarget: 'King',
                    escortRank: 'SSS'
                } as any);
            }

            if (reputation >= 5000) {
                const destRegion = regions[Math.floor(Math.random() * regions.length)];
                const nationsInRegion = Object.keys(WORLD_GEOGRAPHY[destRegion]);
                const destNation = nationsInRegion[Math.floor(Math.random() * nationsInRegion.length)];
                const destCities = WORLD_GEOGRAPHY[destRegion][destNation].cities;
                const destCity = destCities[Math.floor(Math.random() * destCities.length)];
                
                parsedQuests.push({
                    id: `merc_escort_noble_${Date.now()}`,
                    type: 'MercenaryEscort',
                    rank: MercenaryRank.S,
                    title: `[귀족 호위] 대귀족 가문의 ${destNation} 외교 행차`,
                    goal: `${destNation} ${destCity}까지 귀족 일가 호위`,
                    details: `지역 유력 귀족 가문이 막대한 재물을 싣고 ${destNation}으로 이동합니다. 도적단과 암살자의 습격에 대비해야 합니다.`,
                    danger: 'High',
                    rewardGold: 3000000,
                    rewardExp: 200000,
                    destination: { region: destRegion, nation: destNation, city: destCity },
                    escortTarget: 'Noble',
                    escortRank: 'S'
                } as any);
            }

            if (reputation >= 1000) {
                const currentRegion = Object.keys(WORLD_GEOGRAPHY).find(r => Object.keys(WORLD_GEOGRAPHY[r]).includes(loc.nation)) || regions[0];
                const localNations = Object.keys(WORLD_GEOGRAPHY[currentRegion]);
                const destNation = localNations[Math.floor(Math.random() * localNations.length)];
                const destCities = WORLD_GEOGRAPHY[currentRegion][destNation].cities;
                const destCity = destCities[Math.floor(Math.random() * destCities.length)];
                
                parsedQuests.push({
                    id: `merc_escort_merchant_${Date.now()}`,
                    type: 'MercenaryEscort',
                    rank: MercenaryRank.B,
                    title: `[상단 호위] 거상 상단의 ${destNation} 대규모 물류 호송`,
                    goal: `${destNation} ${destCity}까지 상단 수호`,
                    details: `국경을 넘는 대상단이 신뢰할 수 있는 실력파 용병을 구하고 있습니다. 보급로의 안전을 책임져 주십시오.`,
                    danger: 'Mid',
                    rewardGold: 800000,
                    rewardExp: 80000,
                    destination: { region: currentRegion, nation: destNation, city: destCity },
                    escortTarget: 'Merchant',
                    escortRank: 'B'
                } as any);
            }

            const currentRegion = Object.keys(WORLD_GEOGRAPHY).find(r => Object.keys(WORLD_GEOGRAPHY[r]).includes(loc.nation)) || regions[0];
            const localCities = WORLD_GEOGRAPHY[currentRegion][loc.nation]?.cities || [loc.city];
            const filteredCities = localCities.filter(c => c !== loc.city);
            const targetCity = filteredCities.length > 0 ? filteredCities[Math.floor(Math.random() * filteredCities.length)] : loc.city;

            parsedQuests.push({
                id: `merc_escort_traveler_${Date.now()}`,
                type: 'MercenaryEscort',
                rank: MercenaryRank.D,
                title: `[호송 의뢰] ${targetCity}행 정기 마차길 경호`,
                goal: `${loc.nation} ${targetCity}까지 승객 및 마차 경호`,
                details: `인근 도시로 향하는 순례자들과 여행자들의 마차를 호위하는 기본 의뢰입니다.`,
                danger: 'Low',
                rewardGold: 150000,
                rewardExp: 20000,
                destination: { region: currentRegion, nation: loc.nation, city: targetCity },
                escortTarget: 'Traveler',
                escortRank: 'D'
            } as any);

            const newChar = { ...character };
            newChar.mercenaryData = {
                ...(newChar.mercenaryData || {
                    rank: MercenaryRank.F,
                    registeredDate: character.currentDate || '2000-01-01',
                    completedQuests: 0,
                    reputation: 0,
                    guildId: loc.city,
                    isGroupLeader: false,
                    activeQuests: []
                }),
                availableQuests: parsedQuests,
                lastRefreshDate: currentMonth
            };

            onUpdateCharacter(newChar, isInitial ? "" : `[용병 길드] ${loc.city} 지부의 의뢰 게시판이 최신화되었습니다.`);
            
            if (!isInitial) {
                setResultData({
                    type: 'success',
                    title: '게시판 갱신 완료',
                    message: `${loc.city} 지부에 새로운 의뢰 ${parsedQuests.length}건이 등록되었습니다.`,
                    items: [
                        { label: '등록된 의뢰', after: `${parsedQuests.length}건` },
                        { label: '지역 테마', after: fieldDesc }
                    ]
                });
            }

        } catch (error) {
            console.error("Failed to generate quests", error);
            setResultData({
                type: 'failure',
                title: '갱신 실패',
                message: '의뢰 목록을 불러오는 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
                items: []
            });
        } finally {
            setIsGeneratingQuests(false);
        }
    };

    useEffect(() => {
        if (mData && mData.availableQuests === undefined) {
            handleRefreshQuests(true);
        }
    }, [mData?.availableQuests]);

    const handlePromote = (target: 'player' | string) => {
        if (!mData) return;

        let targetRank: MercenaryRank;
        let currentRep: number;
        let targetName = "";

        if (target === 'player') {
            targetRank = currentRank;
            currentRep = mData.reputation;
            targetName = character.name;
        } else {
            const merc = [...character.companions, ...(character.inactiveCompanions || [])].find(c => c.id === target);
            if (!merc) return;
            targetRank = merc.mercenaryRank || MercenaryRank.F;
            currentRep = merc.reputation !== undefined ? merc.reputation : MERCENARY_RANK_THRESHOLD[targetRank];
            targetName = merc.name;
        }

        const nextRank = getNextMercenaryRank(targetRank);
        if (!nextRank) {
            setResultData({
                type: 'info',
                title: '최고 등급 도달',
                message: `${targetName}님은 이미 용병의 정점인 [${targetRank}] 등급입니다. 더 이상 승급할 수 없습니다.`,
                items: [{ label: '현재 등급', after: targetRank }]
            });
            return;
        }

        const requiredRep = MERCENARY_RANK_THRESHOLD[nextRank];
        if (currentRep < requiredRep) {
            setResultData({
                type: 'warning',
                title: '명성 부족',
                message: `[${nextRank}] 등급으로 승급하기 위해서는 더 많은 명성이 필요합니다.\n의뢰를 완수하여 명성을 쌓으십시오.`,
                items: [
                    { label: '현재 명성', after: `${currentRep.toLocaleString()} 명성도` },
                    { label: '필요 명성', after: `${requiredRep.toLocaleString()} 명성도` },
                    { label: '부족한 명성', after: `${(requiredRep - currentRep).toLocaleString()} 명성도` }
                ]
            });
            return;
        }

        const newChar = { ...character };
        if (target === 'player') {
            newChar.mercenaryData = {
                ...newChar.mercenaryData!,
                rank: nextRank
            };
        } else {
            const updateCompanionList = (list: Companion[]) => list.map(c => {
                if (c.id === target) {
                    return { 
                        ...c, 
                        mercenaryRank: nextRank,
                        reputation: c.reputation !== undefined ? c.reputation : currentRep
                    };
                }
                return c;
            });
            newChar.companions = updateCompanionList(newChar.companions);
            if (newChar.inactiveCompanions) {
                newChar.inactiveCompanions = updateCompanionList(newChar.inactiveCompanions);
            }
        }

        onUpdateCharacter(newChar, `[용병 승급] ${targetName}님이 [${nextRank}] 등급으로 승급했습니다! 축하합니다.`);
        setResultData({
            type: 'success',
            title: '용병 승급 성공!',
            message: `축하합니다! ${targetName}님의 실력과 명성이 인정받아 [${nextRank}] 등급 용병으로 공식 승급되었습니다.`,
            items: [
                { label: '이전 등급', after: targetRank },
                { label: '현재 등급', after: nextRank },
                { label: '누적 명성', after: `${currentRep.toLocaleString()} 명성도` }
            ]
        });
    };

    const handleRefreshRecruits = async () => {
        const mData = character.mercenaryData;
        if (mData && mData.lastRecruitRefreshDate === currentMonth) {
            setResultData({
                type: 'info',
                title: '용병 명단 갱신 제한',
                message: '용병 고용 명단은 한 달에 한 번만 갱신할 수 있습니다.\n다음 달에 새로운 고용 명단을 확인하십시오.',
                items: [{ label: '최근 갱신일', after: mData.lastRecruitRefreshDate || '기록 없음' }]
            });
            return;
        }

        if (character.money < 10000) {
            setResultData({
                type: 'warning',
                title: '골드 부족',
                message: '용병 명단을 갱신하려면 10,000 G가 필요합니다.',
                items: [{ label: '보유 골드', after: `${character.money.toLocaleString()} G` }]
            });
            return;
        }
        const generated = await generateRecruits(false);
        const newChar = { 
            ...character, 
            money: character.money - 10000,
            mercenaryData: character.mercenaryData ? {
                ...character.mercenaryData,
                availableRecruits: generated,
                lastRecruitRefreshDate: currentMonth
            } : undefined
        };
        onUpdateCharacter(newChar, "[용병 길드] 고용 명단을 갱신했습니다. (-10,000 G)");
    };

    const generateRecruits = async (autoSave: boolean = false): Promise<Companion[]> => {
        setIsRecruitLoading(true);
        const personalities = ["호전적", "신중함", "욕심많은", "고독한", "미스터리", "성실함"];
        const appearances = ["상처가 많은 전사", "망토를 두른 노련한 모험가", "화려한 갑옷의 용병", "후드를 쓴 암살자 풍의 인물", "거구의 중장갑 보병"];
        const newRecruits: Companion[] = [];
        const currentYear = getYear(character.currentDate || '2000-01-01');

        const SHINRYOKU_MAP_LOCAL: Record<string, string> = {
            '태양': '광휘계', '화염': '화염계', '광휘': '광휘계', '월광': '암흑계', '전격': '전격계',
            '지령': '대지계', '질풍': '질풍계', '빙결': '빙결계', '해수': '해수계', '강철': '대지계',
            '암연': '암흑계', '초화': '초화계', '무': '일반'
        };

        for (let i = 0; i < 4; i++) {
            const rankIdx = Math.floor(Math.random() * (RANK_ORDER.indexOf(currentRank) + 1));
            const rank = RANK_ORDER[rankIdx];
            const repRange = getReputationRangeByRank(rank);
            const initialRep = Math.floor(repRange.min + Math.random() * (repRange.max - repRange.min + 1));
            const gender = Math.random() < 0.5 ? '남성' : '여성';
            const genderParam = gender === '남성' ? 'male' : 'female';
            const name = generateName(loc.nation, genderParam);
            const level = generateLevelByRank(rank);
            const tier = determineRecruitClassTier(level);
            const personality = personalities[Math.floor(Math.random() * personalities.length)];
            const appearance = appearances[Math.floor(Math.random() * appearances.length)];
            const ageNum = 20 + Math.floor(Math.random()*10);
            const visualUrl = generateDefaultVisualUrl(name, loc.nation, '인간', gender);

            const shinryokuType = tier !== ClassTier.NONE ? SHINRYOKU_TYPES_LIST[Math.floor(Math.random()*SHINRYOKU_TYPES_LIST.length)] : undefined;
            const currentTierClass = tier !== ClassTier.NONE ? getHumanoidClassByTier(shinryokuType, tier) : '견습 모험가';
            const thematicClass = currentTierClass;

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
                firstClassDescription = `${shinryokuType || '무'} 계통의 1차 클래스 각성`;
            }
            if (tier === ClassTier.SECOND || tier === ClassTier.LAST || tier === ClassTier.FINAL) {
                secondClassName = (tier === ClassTier.SECOND) ? currentTierClass : getHumanoidClassByTier(shinryokuType, ClassTier.SECOND);
                secondClassDescription = `${shinryokuType || '무'} 계통의 2차 클래스 심화`;
            }
            if (tier === ClassTier.LAST || tier === ClassTier.FINAL) {
                lastClassName = (tier === ClassTier.LAST) ? currentTierClass : getHumanoidClassByTier(shinryokuType, ClassTier.LAST);
                lastClassDescription = `${shinryokuType || '무'} 계통의 3차 클래스 극의`;
            }
            if (tier === ClassTier.FINAL) {
                finalClassName = currentTierClass;
                finalClassDescription = `${shinryokuType || '무'} 계통의 궁극 클래스 도달`;
            }

            // 영입 스탯 밸런스 조정 (약 20% 하향 조정)
            const rawStats = generateCompanionStats(level);
            const balancedStats = {
                hp: Math.max(50, Math.floor(rawStats.hp * 0.5)),
                maxHp: Math.max(50, Math.floor((rawStats.maxHp || rawStats.hp) * 0.5)),
                mp: Math.max(20, Math.floor(rawStats.mp * 0.8)),
                maxMp: Math.max(20, Math.floor((rawStats.maxMp || rawStats.mp) * 0.8)),
                str: Math.max(1, Math.floor(rawStats.str * 0.8)),
                int: Math.max(1, Math.floor(rawStats.int * 0.8)),
                wis: Math.max(1, Math.floor((rawStats.wis || 1) * 0.8)),
                def: Math.max(1, Math.floor(rawStats.def * 0.8)),
                agi: Math.max(1, Math.floor(rawStats.agi * 0.8)),
                ctrl: Math.max(1, Math.floor((rawStats.ctrl || 1) * 0.8))
            };

            const recruitObj: Companion = assignRandomCombatStyle({
                id: Math.random().toString(36).substring(7), 
                name, 
                age: `${ageNum}세`, 
                birthYear: currentYear - ageNum, 
                gender, 
                race: '인간', 
                appearance, 
                personality, 
                classType: thematicClass, 
                job: JobType.MERCENARY, 
                level, 
                currentExp: 0, 
                maxExp: level * 100, 
                statPoints: 0, 
                classTier: tier, 
                shinryokuType, 
                firstClassName, firstClassDescription,
                secondClassName, secondClassDescription,
                lastClassName, lastClassDescription,
                finalClassName, finalClassDescription,
                stats: balancedStats, 
                skills: [], 
                equipment: {}, 
                inventory: [], 
                affection: 30, 
                loyalty: 30, 
                mercenaryRank: rank,
                reputation: initialRep,
                visualUrl
            }, true, true);

            checkAndInitializeLiberationEligibility(recruitObj, 0);
            newRecruits.push(recruitObj);
        }
        const finalRecruits = newRecruits.map(r => assignRandomCombatStyle(r, true, true));
        setRecruits(finalRecruits);
        setIsRecruitLoading(false);

        if (autoSave && character.mercenaryData) {
            const newChar = {
                ...character,
                mercenaryData: {
                    ...character.mercenaryData,
                    availableRecruits: finalRecruits
                }
            };
            onUpdateCharacter(newChar, "");
        }

        return finalRecruits;
    };

    const handleRegister = () => {
        const localAgeNum = parseInt(character.age.replace(/[^0-9]/g, '')) || 0;
        if (localAgeNum < 20) {
            setResultData({ type: 'warning', title: '나이 제한', message: '용병은 만 20세 이상 성인부터 등록 가능합니다.', items: [{ label: '현재 나이', after: character.age }] });
            return;
        }
        if (character.job !== JobType.UNEMPLOYED) {
            setResultData({ type: 'warning', title: '등록 불가 (직업)', message: '학생이나 군인 등 소속이 있는 경우 용병 등록이 불가합니다.\n무직(사회인) 상태여야 합니다.', items: [{ label: '현재 직업', after: character.job }] });
            return;
        }
        const newChar = { ...character };
        newChar.job = JobType.MERCENARY; 
        newChar.mercenaryData = { rank: MercenaryRank.F, registeredDate: character.currentDate || '2000-01-01', completedQuests: 0, reputation: 0, guildId: loc.city, isGroupLeader: false, activeQuests: [], availableQuests: [] };
        onUpdateCharacter(newChar, `[용병 길드] ${loc.city} 지부 용병 등록 완료 및 직업이 용병으로 변경되었습니다.`);
        setResultData({ type: 'success', title: '용병 등록 완료', message: '이제 길드 게시판의 의뢰를 수주할 수 있습니다. 당신의 직업은 이제 [용병]입니다.', items: [ { label: '초기 등급', after: 'F급' }, { label: '변경된 직업', after: '용병' } ] });
        setActiveTab('board');
    };

    const handleUnregisterRequest = () => {
        setConfirmAction(() => () => {
            const newChar = { ...character };
            newChar.job = JobType.UNEMPLOYED;
            newChar.mercenaryData = undefined;
            onUpdateCharacter(newChar, `[용병 길드] 용병 탈퇴 처리가 완료되었습니다. 직업이 무직으로 변경되었습니다.`);
            setResultData({ type: 'success', title: '용병 탈퇴 완료', message: '용병 길드에서 탈퇴했습니다. 이제 자유로운 사회인(무직) 신분입니다.', items: [{ label: '변경된 직업', after: JobType.UNEMPLOYED }] });
            setActiveTab('register');
        });
        setResultData({ type: 'warning', title: '용병 탈퇴 확인', message: '정말로 용병 길드에서 탈퇴하시겠습니까?\n기존의 용병 등급 정보와 수주 중인 모든 의뢰가 파기되며, 직업이 [무직]으로 변경됩니다.', items: [ { label: '현재 등급', after: currentRank }, { label: '변경 직업', after: JobType.UNEMPLOYED } ] });
    };

    const isMercenaryQuest = (rank: any): rank is MercenaryRank =>
      RANK_ORDER.includes(rank);

    const handleAcceptQuest = (quest: Quest) => {
        if (!mData) { setResultData({ type: 'warning', title: '미등록 용병', message: '의뢰를 수주하려면 먼저 용병으로 등록해야 합니다.', items: [] }); return; }
        if ( isMercenaryQuest(quest.rank) && RANK_ORDER.indexOf(quest.rank) > RANK_ORDER.indexOf(currentRank)) { setResultData({ type: 'warning', title: '등급 부족', message: `${quest.rank}급 이상의 용병만 수주 가능한 의뢰입니다.\n실력을 더 쌓아 승급하십시오.`, items: [{ label: '필요 등급', after: quest.rank }, { label: '내 등급', after: currentRank }] }); return; }
        const activeQuests = mData.activeQuests || [];
        if (activeQuests.length >= 3) { setResultData({ type: 'warning', title: '의뢰 초과', message: '동시에 수주할 수 있는 의뢰는 최대 3개입니다.', items: [] }); return; }
        const newChar = { ...character };
        const currentDate = character.currentDate || '2000-03-02';
        newChar.mercenaryData!.activeQuests = [...activeQuests, { ...quest, currentAmount: 0, startDate: quest.startDate || currentDate }];
        newChar.mercenaryData!.availableQuests = (newChar.mercenaryData!.availableQuests || []).filter(q => q.id !== quest.id);
        
        if (quest.type === 'TemporaryInstructor' && quest.studentsToTeach) {
            const sanitizedStudents = sanitizeYoungStudents(quest.studentsToTeach);
            quest.studentsToTeach = sanitizedStudents;
            if (!newChar.socialNetwork) newChar.socialNetwork = [];
            sanitizedStudents.forEach(student => {
                const exists = newChar.socialNetwork!.some(sn => sn.id === student.id);
                if (!exists) {
                    newChar.socialNetwork!.push({
                        ...student,
                        isPastConnection: false,
                        affection: 10,
                        metYear: parseInt(newChar.currentDate?.substring(0, 4) || '2000')
                    });
                }
            });
        }

        onUpdateCharacter(newChar, `[용병 의뢰 수락] 의뢰명: ${quest.title}`);
        setResultData({ type: 'success', title: '의뢰 수주', message: `의뢰를 수락했습니다. '의뢰 일지'에서 진행 상황을 확인하세요.`, items: [] });
        setSelectedQuest(null);
    };

    const handleAcceptBounty = (criminal: Criminal) => {
        if (!mData) { setResultData({ type: 'warning', title: '미등록 용병', message: '현상수배 임무를 수행하려면 먼저 용병으로 등록해야 합니다.', items: [] }); return; }
        
        let reqRank = MercenaryRank.D;
        if (criminal.infamy >= 900) reqRank = MercenaryRank.S;
        else if (criminal.infamy >= 700) reqRank = MercenaryRank.B;
        else if (criminal.infamy >= 400) reqRank = MercenaryRank.C;

        if (RANK_ORDER.indexOf(currentRank) < RANK_ORDER.indexOf(reqRank)) {
            setResultData({ 
                type: 'warning', 
                title: '등급 제한', 
                message: `이 수배범은 매우 위험합니다. 최소 ${reqRank}급 이상의 용병만 추적이 가능합니다.`, 
                items: [{ label: '요구 등급', after: reqRank }, { label: '현재 등급', after: currentRank }] 
            });
            return;
        }

        const activeQuests = mData.activeQuests || [];
        if (activeQuests.length >= 3) { setResultData({ type: 'warning', title: '의뢰 초과', message: '수주 가능한 최대 의뢰 수를 초과했습니다.', items: [] }); return; }

        const bountyQuest: Quest = {
            id: `bounty_${criminal.id}`,
            type: 'BountyHunt',
            rank: reqRank,
            title: `[WANTED] ${criminal.name}`,
            goal: `${criminal.name} 생포 또는 사살`,
            details: `악명 높은 지명수배범 ${criminal.name}(Lv.${criminal.level})을 추적하여 정의를 집행하십시오.`,
            danger: criminal.infamy >= 700 ? 'Extreme' : 'High',
            rewardGold: criminal.rewardGold,
            rewardExp: criminal.level * 2000
        } as any;

        const newChar = { ...character };
        newChar.mercenaryData!.activeQuests = [...activeQuests, bountyQuest];
        
        const currentChecked = newChar.mercenaryData!.checkedBlacklistIds || [];
        if (!currentChecked.includes(criminal.id)) {
            newChar.mercenaryData!.checkedBlacklistIds = [...currentChecked, criminal.id];
        }

        onUpdateCharacter(newChar, `[현상수배 수락] 수배범: ${criminal.name} (악명: ${criminal.infamy})`);
        setResultData({ 
            type: 'success', 
            title: '현상수배 수주 완료', 
            message: `지명수배범 [${criminal.name}]의 추적을 개시합니다.\n필드 탐색이나 도시 잠입 시 조우할 확률이 증가합니다.`, 
            items: [
                { label: '수배 대상', after: criminal.name },
                { label: '현상금', after: `${criminal.rewardGold.toLocaleString()} G` }
            ] 
        });
        setSelectedCriminal(null);
    };

    const handleViewCriminal = (criminal: Criminal) => {
        setSelectedCriminal(criminal);
    };

    const handleTalkToRecruit = (merc: Companion) => {
        setTalkCompanion(merc);
        setTalkStep('intro');
        setTalkMessage(`"용건이 있으신가요? 제 몸값은 결코 싸지 않습니다만, 돈값은 충분히 합니다."`);
        setHasConvinced(false);
    };

    const handleTalkChoice = (choiceIdx: number) => {
        if (!talkCompanion) return;
        const p = talkCompanion.personality;
        let success = false;
        let reply = "";

        if (choiceIdx === 0) { 
            if (p === '욕심많은' || p === '성실함') { success = true; reply = '"조건이 좋다면 거절할 이유가 없지. 계약을 맺도록 하지."'; }
            else if (p === '호전적') { reply = '"난 돈보다 피 끓는 싸움을 원한다."'; }
            else { reply = '"세상을 너무 돈으로만 보는군."'; }
        } else if (choiceIdx === 1) { 
            if (p === '호전적' || p === '성실함') { success = true; reply = '"뜨거운 전장이 날 기다리는군. 함께 가지!"'; }
            else if (p === '신중함') { reply = '"무모한 영광보다는 살아남는 게 우선이다."'; }
            else { reply = '"명예? 그건 배를 불려주지 않아."'; }
        } else if (choiceIdx === 2) { 
            if (p === '신중함') { success = true; reply = '"믿음직한 동료인 것 같군. 당신과 함께라면 안심되겠어."'; }
            else if (p === '호전적') { reply = '"지루한 소리군. 난 좀 더 자극적인 파티를 원한다."'; }
            else { reply = '"너무 소심한 거 아닌가?"'; }
        }
        if (p === '고독한' || p === '미스터리') { success = false; reply = '"혼자 다니는 게 익숙하다. 방해하지 마라."'; }
        setTalkMessage(reply);
        setHasConvinced(success);
        setTalkStep('result');
    };

    const handleRecruitMercenary = (merc: Companion) => {
        const playerRep = character.mercenaryData?.reputation ?? (character as any).reputation ?? 0;
        const playerMerit = character.militaryData?.merit ?? (character as any).merit ?? 0;
        const targetRep = merc.reputation ?? 0;
        const targetMerit = merc.merit ?? 0;

        if (targetRep > playerRep || targetMerit > playerMerit) {
            const reasons: string[] = [];
            if (targetRep > playerRep) {
                reasons.push(`명성치 초과 (대상: ${targetRep.toLocaleString()} / 플레이어: ${playerRep.toLocaleString()})`);
            }
            if (targetMerit > playerMerit) {
                reasons.push(`공적치 초과 (대상: ${targetMerit.toLocaleString()} / 플레이어: ${playerMerit.toLocaleString()})`);
            }
            setResultData({
                type: 'warning',
                title: '영입 불가',
                message: '플레이어보다 명성치나 공적치가 높은 인물은 영입할 수 없습니다.',
                items: reasons.map(r => ({ label: '사유', after: r }))
            });
            return;
        }

        const hireCost = (RANK_ORDER.indexOf(merc.mercenaryRank!) + 1) * 10000;
        if (character.money < hireCost) { setResultData({ type: 'warning', title: '골드 부족', message: '용병 고용 비용이 부족합니다.', items: [{ label: '필요 골드', after: `${hireCost.toLocaleString()}G` }] }); return; }
        if (character.companions.length >= 5) { setResultData({ type: 'warning', title: '파티 가득 참', message: '현재 파티 인원이 최대입니다.', items: [{ label: '최대 인원', after: '5명' }] }); return; }
        const newChar = { ...character };
        newChar.money -= hireCost;
        
        const rank = merc.mercenaryRank || MercenaryRank.F;
        const repRange = getReputationRangeByRank(rank);
        const defaultRep = Math.floor(repRange.min + Math.random() * (repRange.max - repRange.min + 1));
        const finalRep = (merc.reputation !== undefined && merc.reputation > 0) ? merc.reputation : defaultRep;

        const hiredMerc = assignRandomCombatStyle({ 
            ...merc, 
            job: JobType.MERCENARY,
            reputation: finalRep,
            battlePosition: findAvailableBattlePosition(newChar, merc.battleRole)
        }, true, true);
        
        newChar.companions.push(hiredMerc);
        const updatedRecruits = recruits.filter(r => r.id !== merc.id);
        setRecruits(updatedRecruits);
        if (newChar.mercenaryData) {
            newChar.mercenaryData = {
                ...newChar.mercenaryData,
                availableRecruits: updatedRecruits
            };
        }
        setTalkCompanion(null);
        onUpdateCharacter(newChar, `[용병 고용] ${merc.name} (${merc.mercenaryRank}급) 영입 완료. 직업은 용병으로 설정되었습니다.`);
        setResultData({ type: 'success', title: '용병 고용 성공', message: `${merc.name}이(가) 당신의 파티에 합류했습니다.`, items: [{ label: '고용비', after: `${hireCost.toLocaleString()} G` }, { label: '직업', after: '용병' }, { label: '명성도', after: `${finalRep.toLocaleString()} 명성도` }] });
    };

    const QuestIcon = ({ type }: { type: Quest['type'] }) => {
        switch(type) {
            case 'Subjugation': return <Skull className="text-rose-400" size={18}/>;
            case 'Collection': return <Coins className="text-amber-400" size={18}/>;
            case 'BountyHunt': return <ShieldAlert className="text-red-400" size={18}/>;
            case 'Investigation': return <Search className="text-cyan-400" size={18}/>;
            case 'Rescue': return <Heart className="text-pink-400" size={18}/>;
            case 'MercenaryEscort': return <Truck className="text-blue-400" size={18}/>;
            case 'TemporaryInstructor': return <BookOpen className="text-amber-400" size={18}/>;
            default: return <FileText className="text-slate-400" size={18}/>;
        }
    };

    const handleModalClose = () => { setResultData(null); setConfirmAction(null); };

    const mercCompanions = [...character.companions, ...(character.inactiveCompanions || [])]
        .filter(c => c.job === JobType.MERCENARY && !c.isDead);

    const filteredBlacklist = (mData?.blacklist || []).filter(criminal => {
        const isChecked = mData?.checkedBlacklistIds?.includes(criminal.id);
        return !isChecked && !mData?.activeQuests?.some(aq => aq.id === `bounty_${criminal.id}`);
    });

    const rankStyle = RANK_COLORS[currentRank] || RANK_COLORS[MercenaryRank.F];

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-2 sm:p-4 md:p-6 animate-in fade-in duration-200">
            {resultData && (
                <ActionResultModal 
                    data={resultData} 
                    onClose={handleModalClose} 
                    onContinue={confirmAction ? () => { confirmAction(); handleModalClose(); } : undefined} 
                />
            )}
            
            {isGroupModalOpen && (
                <MercenaryGroupModal 
                    character={character} 
                    onClose={() => setIsGroupModalOpen(false)} 
                    onUpdateCharacter={onUpdateCharacter} 
                />
            )}
            
            {isFactionModalOpen && (
                <MercenaryFactionModal 
                    character={character} 
                    onClose={() => setIsFactionModalOpen(false)} 
                    onUpdateCharacter={onUpdateCharacter} 
                />
            )}

            {/* 대화 모달 (Recruit Talk) */}
            {talkCompanion && (
                <div className="fixed inset-0 z-[85] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150">
                    <div className="bg-slate-900 border border-indigo-500/50 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="p-4 sm:p-5 bg-gradient-to-r from-indigo-950/70 to-slate-900 border-b border-indigo-900/60 flex justify-between items-center shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-slate-950 border border-indigo-500/40 flex items-center justify-center text-indigo-400 shadow-inner">
                                    <MessageCircle size={20} />
                                </div>
                                <div>
                                    <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                                        {talkCompanion.name}
                                        <span className="text-[10px] font-mono font-bold bg-indigo-950 text-indigo-300 px-2 py-0.5 rounded border border-indigo-800">
                                            {talkCompanion.mercenaryRank} RANK
                                        </span>
                                    </h3>
                                    <p className="text-xs text-slate-400">성향: {talkCompanion.personality} • Lv.{talkCompanion.level}</p>
                                </div>
                            </div>
                            <button 
                                onClick={() => setTalkCompanion(null)} 
                                className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                            >
                                <X size={18}/>
                            </button>
                        </div>
                        
                        <div className="p-5 sm:p-6 space-y-5 overflow-y-auto custom-scrollbar">
                            <div className="bg-slate-950 p-4 sm:p-5 rounded-xl border border-slate-800 relative shadow-inner">
                                <div className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                                    <Sparkles size={12}/> 용병의 반응
                                </div>
                                <p className="text-sm sm:text-base text-slate-200 leading-relaxed italic">
                                    "{talkMessage}"
                                </p>
                            </div>

                            {talkStep === 'intro' && (
                                <button 
                                    onClick={() => setTalkStep('choice')} 
                                    className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-indigo-950/50 transition-all flex items-center justify-center gap-2"
                                >
                                    <MessageCircle size={16}/> 이야기 나누기
                                </button>
                            )}

                            {talkStep === 'choice' && (
                                <div className="space-y-2.5">
                                    <div className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">
                                        설득 방식 선택
                                    </div>
                                    <button 
                                        onClick={() => handleTalkChoice(0)} 
                                        className="w-full p-3.5 bg-slate-950/80 hover:bg-slate-800 text-slate-200 rounded-xl text-xs sm:text-sm text-left border border-slate-800 hover:border-indigo-500/50 transition-all flex items-center justify-between group"
                                    >
                                        <span>"의뢰비는 공평하게 나누겠네. 함께 돈을 법세."</span>
                                        <ChevronRight size={16} className="text-slate-600 group-hover:text-indigo-400 shrink-0 ml-2"/>
                                    </button>
                                    <button 
                                        onClick={() => handleTalkChoice(1)} 
                                        className="w-full p-3.5 bg-slate-950/80 hover:bg-slate-800 text-slate-200 rounded-xl text-xs sm:text-sm text-left border border-slate-800 hover:border-indigo-500/50 transition-all flex items-center justify-between group"
                                    >
                                        <span>"함께 강력한 마물을 물리치고 명예를 쌓자!"</span>
                                        <ChevronRight size={16} className="text-slate-600 group-hover:text-indigo-400 shrink-0 ml-2"/>
                                    </button>
                                    <button 
                                        onClick={() => handleTalkChoice(2)} 
                                        className="w-full p-3.5 bg-slate-950/80 hover:bg-slate-800 text-slate-200 rounded-xl text-xs sm:text-sm text-left border border-slate-800 hover:border-indigo-500/50 transition-all flex items-center justify-between group"
                                    >
                                        <span>"조심해서 나쁠 건 없지. 난 안전한 작전을 선호하네."</span>
                                        <ChevronRight size={16} className="text-slate-600 group-hover:text-indigo-400 shrink-0 ml-2"/>
                                    </button>
                                </div>
                            )}

                            {talkStep === 'result' && (
                                <div className="space-y-4">
                                    {hasConvinced ? (
                                        <div className="bg-emerald-950/40 border border-emerald-500/50 p-3.5 rounded-xl text-center">
                                            <p className="text-xs sm:text-sm text-emerald-400 font-bold flex items-center justify-center gap-1.5">
                                                <CheckCircle size={16}/> 상대가 당신의 제안에 깊은 흥미를 보입니다!
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="bg-rose-950/40 border border-rose-500/50 p-3.5 rounded-xl text-center">
                                            <p className="text-xs sm:text-sm text-rose-400 font-bold flex items-center justify-center gap-1.5">
                                                <AlertTriangle size={16}/> 설득에 실패했습니다. 반응이 차갑습니다...
                                            </p>
                                        </div>
                                    )}

                                    {(() => {
                                        const pRep = character.mercenaryData?.reputation ?? (character as any).reputation ?? 0;
                                        const pMerit = character.militaryData?.merit ?? (character as any).merit ?? 0;
                                        const tRep = talkCompanion.reputation ?? 0;
                                        const tMerit = talkCompanion.merit ?? 0;
                                        const isOver = tRep > pRep || tMerit > pMerit;

                                        if (!isOver) return null;

                                        return (
                                            <div className="bg-rose-950/50 border border-rose-800/60 p-3 rounded-xl text-center space-y-1">
                                                <p className="text-xs text-rose-300 font-bold flex items-center justify-center gap-1.5">
                                                    <AlertTriangle size={14} className="text-rose-400 shrink-0"/> 
                                                    플레이어보다 {tRep > pRep && tMerit > pMerit ? '명성치와 공적치' : tRep > pRep ? '명성치' : '공적치'}가 높아 영입할 수 없습니다.
                                                </p>
                                                <p className="text-[10px] text-slate-400">
                                                    (대상 명성: {tRep.toLocaleString()} / 내 명성: {pRep.toLocaleString()} | 대상 공적: {tMerit.toLocaleString()} / 내 공적: {pMerit.toLocaleString()})
                                                </p>
                                            </div>
                                        );
                                    })()}

                                    <div className="flex gap-2.5">
                                        <button 
                                            onClick={() => setTalkCompanion(null)} 
                                            className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold text-xs sm:text-sm transition-colors border border-slate-700"
                                        >
                                            물러나기
                                        </button>
                                        {(() => {
                                            const pRep = character.mercenaryData?.reputation ?? (character as any).reputation ?? 0;
                                            const pMerit = character.militaryData?.merit ?? (character as any).merit ?? 0;
                                            const tRep = talkCompanion.reputation ?? 0;
                                            const tMerit = talkCompanion.merit ?? 0;
                                            const isOver = tRep > pRep || tMerit > pMerit;
                                            const canHire = hasConvinced && !isOver;

                                            return (
                                                <button 
                                                    onClick={() => handleRecruitMercenary(talkCompanion)} 
                                                    disabled={!canHire} 
                                                    className={`flex-1 py-3 rounded-xl font-bold text-xs sm:text-sm text-white shadow-lg transition-all flex items-center justify-center gap-1.5 ${
                                                        canHire 
                                                            ? 'bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 shadow-amber-950/50' 
                                                            : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/50'
                                                    }`}
                                                >
                                                    {isOver ? (
                                                        <>영입 불가 (명성/공적 초과)</>
                                                    ) : (
                                                        <>
                                                            <Coins size={14}/> 고용하기 ({((RANK_ORDER.indexOf(talkCompanion.mercenaryRank!) + 1) * 10000).toLocaleString()} 골드)
                                                        </>
                                                    )}
                                                </button>
                                            );
                                        })()}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* 의뢰 상세 모달 (Quest Detail) */}
            {selectedQuest && (
                <div className="fixed inset-0 z-[85] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150">
                    <div className="bg-slate-900 border border-red-500/40 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="p-4 sm:p-5 bg-gradient-to-r from-red-950/70 to-slate-900 border-b border-red-900/60 relative flex justify-between items-start shrink-0">
                            <div className="flex items-center gap-3 min-w-0 pr-8">
                                <div className="w-10 h-10 rounded-xl bg-slate-950 border border-red-500/40 flex items-center justify-center shrink-0 shadow-inner">
                                    <QuestIcon type={selectedQuest.type}/>
                                </div>
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-red-950 text-red-300 border border-red-800">
                                            {selectedQuest.rank} RANK
                                        </span>
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                                            selectedQuest.danger === 'Extreme' ? 'bg-red-900/40 text-red-400 border border-red-800' :
                                            selectedQuest.danger === 'High' ? 'bg-orange-900/40 text-orange-400 border border-orange-800' :
                                            'bg-amber-900/40 text-amber-400 border border-amber-800'
                                        }`}>
                                            위험도: {selectedQuest.danger}
                                        </span>
                                    </div>
                                    <h3 className="text-base sm:text-lg font-bold text-white truncate">{selectedQuest.title}</h3>
                                </div>
                            </div>
                            <button 
                                onClick={() => setSelectedQuest(null)} 
                                className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors shrink-0"
                            >
                                <X size={18}/>
                            </button>
                        </div>

                        <div className="p-5 sm:p-6 space-y-4 overflow-y-auto custom-scrollbar">
                            <div>
                                <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1.5">
                                    의뢰 내용
                                </label>
                                <p className="text-xs sm:text-sm text-slate-200 leading-relaxed bg-slate-950 p-4 rounded-xl border border-slate-800 italic shadow-inner">
                                    "{selectedQuest.details}"
                                </p>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                                    <label className="text-[10px] text-slate-500 uppercase font-bold block mb-1">달성 목표</label>
                                    <p className="text-xs sm:text-sm text-slate-200 font-bold truncate">{selectedQuest.goal}</p>
                                </div>
                                <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                                    <label className="text-[10px] text-slate-500 uppercase font-bold block mb-1">의뢰 유형</label>
                                    <p className="text-xs sm:text-sm text-slate-300 font-bold flex items-center gap-1.5">
                                        <QuestIcon type={selectedQuest.type}/> {selectedQuest.type === 'Rescue' ? '실종자 구출' : selectedQuest.type === 'Subjugation' ? '토벌' : selectedQuest.type === 'Collection' ? '수집' : selectedQuest.type === 'BountyHunt' ? '현상수배' : selectedQuest.type === 'Investigation' ? '조사' : selectedQuest.type === 'MercenaryEscort' ? '호송' : selectedQuest.type === 'TemporaryInstructor' ? '임시 교관' : '일반 의뢰'}
                                    </p>
                                </div>
                            </div>

                            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                                <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-2">보상 내역</label>
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center text-amber-400 font-mono font-bold text-sm sm:text-base">
                                        <Coins size={18} className="mr-1.5 text-amber-500"/>
                                        {selectedQuest.rewardGold.toLocaleString()} G
                                    </div>
                                    <div className="flex items-center text-indigo-400 font-mono font-bold text-sm sm:text-base">
                                        <Zap size={18} className="mr-1.5 text-indigo-500"/>
                                        {selectedQuest.rewardExp.toLocaleString()} EXP
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="p-4 bg-slate-950 border-t border-slate-800 flex gap-2.5 shrink-0">
                            <button 
                                onClick={() => setSelectedQuest(null)} 
                                className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold text-xs sm:text-sm transition-colors border border-slate-700"
                            >
                                취소
                            </button>
                            <button 
                                onClick={() => handleAcceptQuest(selectedQuest)} 
                                className="flex-[2] py-3 bg-gradient-to-r from-red-700 to-rose-700 hover:from-red-600 hover:to-rose-600 text-white rounded-xl font-bold text-xs sm:text-sm shadow-lg shadow-red-950/50 transition-all flex items-center justify-center gap-2"
                            >
                                <Swords size={16}/> 의뢰 수락
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 수배범 상세 모달 (Criminal Detail) */}
            {selectedCriminal && (
                <div className="fixed inset-0 z-[85] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150">
                    <div className="bg-slate-900 border-2 border-amber-600/80 rounded-2xl w-full max-w-lg shadow-[0_0_40px_rgba(217,119,6,0.25)] overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="p-6 bg-gradient-to-b from-amber-950/50 to-slate-900 border-b border-amber-900/60 text-center relative shrink-0">
                            <div className="inline-block px-3 py-0.5 bg-red-600 text-white text-[10px] font-black tracking-[0.4em] rounded-full mb-2 shadow-md">
                                WANTED
                            </div>
                            <h3 className="text-2xl sm:text-3xl font-black text-white font-serif">{selectedCriminal.name}</h3>
                            <p className="text-red-400 font-bold text-xs sm:text-sm mt-0.5">"{selectedCriminal.title}"</p>
                            <button 
                                onClick={() => setSelectedCriminal(null)} 
                                className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                            >
                                <X size={18}/>
                            </button>
                        </div>

                        <div className="p-5 sm:p-6 space-y-4 overflow-y-auto custom-scrollbar">
                            <div className="grid grid-cols-3 gap-2.5 bg-slate-950 p-3.5 rounded-xl border border-amber-900/40 text-center">
                                <div>
                                    <span className="text-[10px] text-slate-500 uppercase font-bold block">악명도</span>
                                    <p className="text-lg sm:text-xl font-bold text-red-400 font-mono mt-0.5">{selectedCriminal.infamy}</p>
                                </div>
                                <div className="border-x border-slate-800">
                                    <span className="text-[10px] text-slate-500 uppercase font-bold block">위험 레벨</span>
                                    <p className="text-lg sm:text-xl font-bold text-amber-300 font-mono mt-0.5">Lv.{selectedCriminal.level}</p>
                                </div>
                                <div>
                                    <span className="text-[10px] text-slate-500 uppercase font-bold block">현상금</span>
                                    <p className="text-sm sm:text-base font-bold text-amber-400 font-mono mt-1">{selectedCriminal.rewardGold.toLocaleString()} G</p>
                                </div>
                            </div>

                            <div>
                                <label className="text-[10px] text-amber-500 font-bold uppercase tracking-wider block mb-1">
                                    범죄 기록 및 이력
                                </label>
                                <p className="text-xs sm:text-sm text-slate-200 leading-relaxed italic bg-slate-950 p-4 rounded-xl border border-slate-800 shadow-inner">
                                    "{selectedCriminal.description}"
                                </p>
                            </div>

                            <div className="flex gap-2 text-xs">
                                <span className="bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800 text-slate-300">
                                    출신: <strong className="text-white">{selectedCriminal.nation}</strong>
                                </span>
                                <span className="bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800 text-slate-300">
                                    신력 계통: <strong className="text-indigo-400">{selectedCriminal.shinryokuType || '무'}</strong>
                                </span>
                            </div>
                        </div>

                        <div className="p-4 bg-slate-950 border-t border-slate-800 flex gap-2.5 shrink-0">
                            <button 
                                onClick={() => setSelectedCriminal(null)} 
                                className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs sm:text-sm transition-colors border border-slate-700"
                            >
                                추적 보류
                            </button>
                            <button 
                                onClick={() => handleAcceptBounty(selectedCriminal)} 
                                className="flex-[2] py-3 bg-gradient-to-r from-red-700 to-amber-700 hover:from-red-600 hover:to-amber-600 text-white font-bold rounded-xl text-xs sm:text-sm shadow-xl flex items-center justify-center gap-2 transition-all"
                            >
                                <Target size={16}/> 현상수배 수락
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 메인 용병 길드 윈도우 */}
            <div className="bg-slate-900 border border-red-900/40 w-full max-w-5xl h-[92vh] sm:h-[86vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden relative">
                
                {/* 헤더 */}
                <div className="p-3.5 sm:p-5 border-b border-red-950/80 bg-gradient-to-r from-red-950/40 via-slate-900 to-slate-900 flex justify-between items-center shrink-0">
                    <div className="flex items-center min-w-0">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-slate-950 border border-red-500/40 flex items-center justify-center mr-3 shrink-0 shadow-inner">
                            <ScrollText size={22} className="text-red-400" />
                        </div>
                        <div className="min-w-0">
                            <div className="flex items-center gap-2">
                                <h2 className="text-base sm:text-xl font-bold text-white truncate tracking-tight">용병 길드</h2>
                                <span className="text-[10px] font-bold bg-red-950/80 text-red-300 px-2 py-0.5 rounded border border-red-900/60 hidden sm:inline-block">
                                    GUILD HQ
                                </span>
                            </div>
                            <p className="text-[10px] sm:text-xs text-slate-400 truncate flex items-center gap-1.5 mt-0.5">
                                <Compass size={12} className="text-red-400/80"/>
                                <span>{loc.nation} • {loc.city} 지부</span>
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                        {mData && (
                            <div className="flex items-center gap-2 sm:gap-3 bg-slate-950/90 px-2.5 sm:px-4 py-1 sm:py-1.5 rounded-xl border border-slate-800 shadow-inner">
                                <div className="text-center">
                                    <p className="text-[8px] sm:text-[9px] text-slate-500 uppercase font-bold tracking-wider">RANK</p>
                                    <span className={`text-xs sm:text-sm font-black font-mono px-1.5 rounded ${rankStyle.text}`}>
                                        {currentRank}
                                    </span>
                                </div>
                                <div className="w-px h-6 bg-slate-800"></div>
                                <div className="text-center">
                                    <p className="text-[8px] sm:text-[9px] text-slate-500 uppercase font-bold tracking-wider">명성도</p>
                                    <p className="text-xs sm:text-sm font-bold text-amber-400 font-mono">
                                        {mData.reputation.toLocaleString()}
                                    </p>
                                </div>
                            </div>
                        )}

                        {mData && (
                            <button 
                                onClick={handleUnregisterRequest} 
                                className="w-8 h-8 sm:w-9 sm:h-9 bg-slate-950 hover:bg-red-950 text-slate-400 hover:text-red-300 border border-slate-800 hover:border-red-800 rounded-xl transition-all flex items-center justify-center" 
                                title="용병 길드 탈퇴"
                            >
                                <LogOut size={16} />
                            </button>
                        )}

                        <button 
                            onClick={onClose} 
                            className="w-8 h-8 sm:w-9 sm:h-9 bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 rounded-xl transition-colors flex items-center justify-center shrink-0"
                            title="닫기"
                        >
                            <X size={18} />
                        </button>
                    </div>
                </div>

                {/* 세그먼트 탭 내비게이션 (가로 스크롤 대응) */}
                <div className="flex border-b border-slate-800/80 bg-slate-950/90 shrink-0 overflow-x-auto no-scrollbar px-2 sm:px-4 gap-1 sm:gap-2">
                    {!mData && (
                        <button 
                            onClick={() => setActiveTab('register')} 
                            className={`py-3 px-3 sm:px-4 text-xs sm:text-sm font-bold flex items-center justify-center whitespace-nowrap transition-all rounded-t-lg border-b-2 ${
                                activeTab === 'register' 
                                    ? 'text-red-400 border-red-500 bg-slate-900/90' 
                                    : 'text-slate-400 hover:text-slate-200 border-transparent'
                            }`}
                        >
                            <UserPlus size={15} className="mr-1.5 text-red-500"/> 길드 등록
                        </button>
                    )}
                    <button 
                        onClick={() => setActiveTab('board')} 
                        className={`py-3 px-3 sm:px-4 text-xs sm:text-sm font-bold flex items-center justify-center whitespace-nowrap transition-all rounded-t-lg border-b-2 ${
                            activeTab === 'board' 
                                ? 'text-red-400 border-red-500 bg-slate-900/90' 
                                : 'text-slate-400 hover:text-slate-200 border-transparent'
                        }`}
                    >
                        <ScrollText size={15} className="mr-1.5 text-red-500"/> 의뢰 게시판
                    </button>
                    <button 
                        onClick={() => setActiveTab('blacklist')} 
                        className={`py-3 px-3 sm:px-4 text-xs sm:text-sm font-bold flex items-center justify-center whitespace-nowrap transition-all rounded-t-lg border-b-2 ${
                            activeTab === 'blacklist' 
                                ? 'text-amber-400 border-amber-500 bg-slate-900/90' 
                                : 'text-slate-400 hover:text-slate-200 border-transparent'
                        }`}
                    >
                        <ShieldAlert size={15} className="mr-1.5 text-amber-500"/> 블랙리스트
                    </button>
                    <button 
                        onClick={() => setActiveTab('promotion')} 
                        className={`py-3 px-3 sm:px-4 text-xs sm:text-sm font-bold flex items-center justify-center whitespace-nowrap transition-all rounded-t-lg border-b-2 ${
                            activeTab === 'promotion' 
                                ? 'text-emerald-400 border-emerald-500 bg-slate-900/90' 
                                : 'text-slate-400 hover:text-slate-200 border-transparent'
                        }`}
                    >
                        <ArrowUpCircle size={15} className="mr-1.5 text-emerald-500"/> 승급 심사
                    </button>
                    <button 
                        onClick={() => setActiveTab('recruit')} 
                        className={`py-3 px-3 sm:px-4 text-xs sm:text-sm font-bold flex items-center justify-center whitespace-nowrap transition-all rounded-t-lg border-b-2 ${
                            activeTab === 'recruit' 
                                ? 'text-indigo-400 border-indigo-500 bg-slate-900/90' 
                                : 'text-slate-400 hover:text-slate-200 border-transparent'
                        }`}
                    >
                        <Users size={15} className="mr-1.5 text-indigo-500"/> 용병 고용
                    </button>
                    <button 
                        onClick={() => setActiveTab('group')} 
                        className={`py-3 px-3 sm:px-4 text-xs sm:text-sm font-bold flex items-center justify-center whitespace-nowrap transition-all rounded-t-lg border-b-2 ${
                            activeTab === 'group' 
                                ? 'text-amber-400 border-amber-500 bg-slate-900/90' 
                                : 'text-slate-400 hover:text-slate-200 border-transparent'
                        }`}
                    >
                        <Crown size={15} className="mr-1.5 text-amber-500"/> 용병단 관리
                    </button>
                    <button 
                        onClick={() => setActiveTab('join')} 
                        className={`py-3 px-3 sm:px-4 text-xs sm:text-sm font-bold flex items-center justify-center whitespace-nowrap transition-all rounded-t-lg border-b-2 ${
                            activeTab === 'join' 
                                ? 'text-rose-400 border-rose-500 bg-slate-900/90' 
                                : 'text-slate-400 hover:text-slate-200 border-transparent'
                        }`}
                    >
                        <Globe size={15} className="mr-1.5 text-rose-500"/> 세력 가입
                    </button>
                </div>

                {/* 탭 콘텐츠 영역 */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-900 custom-scrollbar relative">
                    
                    {/* TAB: 의뢰 게시판 */}
                    {activeTab === 'board' && (
                        <div className="space-y-4 sm:space-y-6">
                            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 bg-slate-950/60 p-3 sm:p-4 rounded-xl border border-slate-800">
                                <div>
                                    <h3 className="text-xs sm:text-sm font-bold text-slate-200 uppercase flex items-center gap-1.5">
                                        <FileText size={16} className="text-red-400"/> 길드 공고 의뢰 목록
                                    </h3>
                                    <p className="text-[11px] text-slate-400 mt-0.5">
                                        현재 등급에 맞는 의뢰를 수주하여 보상과 명성을 획득하십시오.
                                    </p>
                                </div>
                                <div className="flex items-center gap-2 self-end sm:self-auto">
                                    <div className="flex items-center text-[11px] text-amber-400/90 font-medium">
                                        <Clock size={12} className="mr-1"/> 
                                        {mData?.lastRefreshDate === currentMonth ? '다음 달 갱신 가능' : '갱신 가능'}
                                    </div>
                                    <button 
                                        onClick={() => handleRefreshQuests()} 
                                        disabled={isGeneratingQuests || mData?.lastRefreshDate === currentMonth} 
                                        className={`text-xs px-3 py-1.5 rounded-lg border font-bold flex items-center transition-all ${
                                            mData?.lastRefreshDate === currentMonth 
                                                ? 'bg-slate-950 text-slate-600 border-slate-800 cursor-not-allowed' 
                                                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700 shadow-sm'
                                        }`}
                                    >
                                        {isGeneratingQuests ? <Loader2 size={12} className="animate-spin mr-1.5"/> : <RefreshCw size={12} className="mr-1.5"/>}
                                        게시판 갱신
                                    </button>
                                </div>
                            </div>

                            {isGeneratingQuests ? (
                                <div className="flex flex-col items-center justify-center py-20 text-slate-500 space-y-4">
                                    <Loader2 size={40} className="animate-spin text-red-500/60"/>
                                    <p className="font-mono text-xs animate-pulse">새로운 의뢰를 생성하고 있습니다...</p>
                                </div>
                            ) : availableQuests.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                                    {availableQuests.map(quest => {
                                        const isLocked = isMercenaryQuest(quest.rank) && RANK_ORDER.indexOf(quest.rank) > RANK_ORDER.indexOf(currentRank);
                                        const isAlreadyAccepted = mData?.activeQuests?.some(aq => aq.id === quest.id);
                                        
                                        return (
                                            <button 
                                                key={quest.id} 
                                                onClick={() => setSelectedQuest(quest)} 
                                                disabled={isAlreadyAccepted} 
                                                className={`bg-slate-950 p-4 sm:p-5 rounded-xl border relative flex flex-col text-left group transition-all ${
                                                    isAlreadyAccepted 
                                                        ? 'opacity-40 border-slate-800 cursor-default' 
                                                        : isLocked 
                                                            ? 'border-slate-800/80 opacity-60 grayscale hover:grayscale-0' 
                                                            : 'border-slate-800 hover:border-red-500/60 hover:shadow-lg hover:shadow-red-950/20'
                                                }`}
                                            >
                                                <div className="flex justify-between items-start mb-3">
                                                    <div className="w-9 h-9 rounded-lg bg-slate-900 border border-slate-800 group-hover:border-red-500/40 flex items-center justify-center transition-colors">
                                                        <QuestIcon type={quest.type} />
                                                    </div>
                                                    <div className="flex flex-col items-end gap-1">
                                                        <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                                                            isLocked 
                                                                ? 'bg-slate-900 text-slate-500 border-slate-800' 
                                                                : 'bg-red-950/80 text-red-300 border-red-900/80'
                                                        }`}>
                                                            {quest.rank} RANK
                                                        </span>
                                                        <span className={`text-[9px] font-bold ${
                                                            quest.danger === 'Extreme' ? 'text-red-400' :
                                                            quest.danger === 'High' ? 'text-orange-400' :
                                                            'text-amber-400'
                                                        }`}>
                                                            위험도: {quest.danger}
                                                        </span>
                                                    </div>
                                                </div>

                                                <h4 className="font-bold text-slate-100 text-sm sm:text-base mb-1 line-clamp-1 group-hover:text-red-300 transition-colors">
                                                    {quest.title}
                                                </h4>
                                                
                                                <p className="text-xs text-slate-400 mb-3 line-clamp-2 italic leading-relaxed">
                                                    "{quest.goal}"
                                                </p>

                                                <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800/60 flex justify-between items-center mt-auto text-xs">
                                                    <span className="text-[10px] text-slate-500 uppercase font-bold">보상</span>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-amber-400 font-mono font-bold">
                                                            {quest.rewardGold.toLocaleString()} G
                                                        </span>
                                                        <span className="text-[10px] text-indigo-400 font-mono">
                                                            +{quest.rewardExp.toLocaleString()} EXP
                                                        </span>
                                                    </div>
                                                </div>

                                                {isLocked && (
                                                    <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center rounded-xl backdrop-blur-[1px] gap-1 p-4 text-center">
                                                        <Lock size={20} className="text-slate-400"/>
                                                        <span className="text-[11px] text-slate-300 font-bold">{quest.rank}급 이상 수주 가능</span>
                                                    </div>
                                                )}
                                                
                                                {isAlreadyAccepted && (
                                                    <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center rounded-xl gap-1">
                                                        <CheckCircle size={24} className="text-emerald-400"/>
                                                        <span className="text-xs text-emerald-300 font-bold">수주 진행 중</span>
                                                    </div>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-20 text-slate-500 border-2 border-dashed border-slate-800 rounded-2xl">
                                    <Search size={40} className="mb-3 opacity-30"/>
                                    <p className="text-sm font-bold text-slate-400">현재 게시판이 비어있습니다.</p>
                                    <p className="text-xs mt-1 text-slate-500">상단의 '게시판 갱신' 버튼을 눌러 새로운 의뢰를 확인하세요.</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* TAB: 블랙리스트 */}
                    {activeTab === 'blacklist' && (
                        <div className="space-y-6">
                            {/* 플레이어 지명수배 섹션 */}
                            {isPlayerWanted && (
                                <div className="animate-in slide-in-from-top-4">
                                    <div className="bg-slate-950 rounded-2xl border-2 border-red-600/80 shadow-[0_0_30px_rgba(220,38,38,0.2)] flex flex-col md:flex-row overflow-hidden relative">
                                        <div className="w-full md:w-56 bg-slate-900 border-b md:border-b-0 md:border-r border-red-900/60 flex flex-col items-center justify-center relative p-6 shrink-0">
                                            <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-red-600 text-white text-[9px] font-black tracking-[0.3em] px-3 py-0.5 rounded-full z-10">
                                                WANTED
                                            </div>
                                            <div className="w-28 h-28 rounded-full bg-slate-950 border-2 border-red-600/60 overflow-hidden my-2 flex items-center justify-center shadow-inner">
                                                {playerMessengerVisual ? (
                                                    <img src={playerMessengerVisual} alt="" className="w-full h-full object-cover" />
                                                ) : (
                                                    <User size={48} className="text-slate-600" />
                                                )}
                                            </div>
                                            <span className="text-red-400 font-black text-xs font-mono tracking-widest mt-1">DEAD OR ALIVE</span>
                                        </div>

                                        <div className="flex-1 p-5 sm:p-6 space-y-3 flex flex-col justify-between">
                                            <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-2">
                                                <div>
                                                    <span className="text-[10px] text-red-500 font-bold uppercase tracking-wider">수배 대상자 (You)</span>
                                                    <h4 className="text-2xl font-black text-white">{character.name}</h4>
                                                    <div className={`mt-1 flex items-center gap-1.5 text-xs font-bold ${infamyStage.color}`}>
                                                        <Gavel size={14}/> {infamyStage.label} ({character.infamy} 악명)
                                                    </div>
                                                </div>
                                                <div className="sm:text-right bg-slate-900/80 p-2.5 sm:p-0 sm:bg-transparent rounded-lg border sm:border-0 border-slate-800">
                                                    <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">걸린 총 현상금</p>
                                                    <p className="text-2xl sm:text-3xl font-black text-amber-400 font-mono tracking-tight">
                                                        {playerBounty.toLocaleString()} G
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="bg-slate-900/90 p-3.5 rounded-xl border border-red-950 text-xs text-slate-300 italic leading-relaxed">
                                                "{infamyStage.desc}"
                                            </div>

                                            <div className="text-[11px] text-red-400 font-bold flex items-center gap-1.5 bg-red-950/30 p-2.5 rounded-lg border border-red-900/40">
                                                <AlertTriangle size={14} className="shrink-0"/>
                                                <span>도시 진입 및 필드 이동 시 강력한 토벌대의 기습이 발생할 수 있습니다. (추적 확률: {(infamyStage.spawnChance * 100).toFixed(1)}%)</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* 지명수배 명단 헤더 바 */}
                            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 bg-slate-950/60 p-3.5 sm:p-4 rounded-xl border border-slate-800">
                                <div>
                                    <h3 className="text-xs sm:text-sm font-bold text-amber-400 flex items-center gap-1.5">
                                        <ShieldAlert size={16}/> 지명수배 명단 (Criminal Blacklist)
                                    </h3>
                                    <p className="text-[11px] text-slate-400 mt-0.5">{loc.nation} 내의 주요 수배자 명단이며, 1년에 한 번 갱신됩니다.</p>
                                </div>
                                <div className="flex items-center gap-2 self-end sm:self-auto">
                                    <div className="flex items-center text-[11px] text-amber-400/90 font-medium">
                                        <Clock size={12} className="mr-1"/> 
                                        {mData?.lastBlacklistRefreshYear === currentYear ? `${currentYear + 1}년에 갱신 가능` : '갱신 대기 중'}
                                    </div>
                                    <button 
                                        onClick={() => handleRefreshBlacklist()} 
                                        disabled={mData?.lastBlacklistRefreshYear === currentYear}
                                        className={`text-xs px-3 py-1.5 rounded-lg border font-bold flex items-center transition-all ${
                                            mData?.lastBlacklistRefreshYear === currentYear 
                                                ? 'bg-slate-950 text-slate-600 border-slate-800 cursor-not-allowed' 
                                                : 'bg-red-800 hover:bg-red-700 text-white border-red-600 shadow-md'
                                        }`}
                                    >
                                        <RefreshCw size={12} className="mr-1.5"/> 명단 최신화
                                    </button>
                                </div>
                            </div>

                            {/* 수배범 카드 목록 */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                                {filteredBlacklist.length > 0 ? filteredBlacklist.map(criminal => {
                                    const isAccepted = mData?.activeQuests?.some(aq => aq.id === `bounty_${criminal.id}`);
                                    
                                    let reqRank = MercenaryRank.D;
                                    if (criminal.infamy >= 900) reqRank = MercenaryRank.S;
                                    else if (criminal.infamy >= 700) reqRank = MercenaryRank.B;
                                    else if (criminal.infamy >= 400) reqRank = MercenaryRank.C;
                                    
                                    const canTake = RANK_ORDER.indexOf(currentRank) >= RANK_ORDER.indexOf(reqRank);
                                    
                                    return (
                                        <div 
                                            key={criminal.id} 
                                            className={`bg-slate-950 rounded-xl border overflow-hidden group transition-all flex flex-col justify-between ${
                                                !canTake 
                                                    ? 'opacity-50 grayscale border-slate-800' 
                                                    : 'border-slate-800 hover:border-amber-500/50 shadow-md'
                                            }`}
                                        >
                                            <div className="p-4 bg-gradient-to-r from-slate-900 to-slate-950 border-b border-slate-800 flex justify-between items-start gap-3">
                                                <div className="flex gap-3 min-w-0">
                                                    <div className="w-14 h-14 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0 overflow-hidden shadow-inner">
                                                        {criminal.visualUrl ? (
                                                            <img src={criminal.visualUrl} alt={criminal.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                                                        ) : (
                                                            <User size={28} className="text-slate-600"/>
                                                        )}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <h4 className="text-base sm:text-lg font-black text-white font-serif truncate">{criminal.name}</h4>
                                                        <p className="text-xs text-red-400 font-bold truncate">"{criminal.title}"</p>
                                                        <div className="flex gap-1.5 mt-1.5 flex-wrap">
                                                            <span className="text-[9px] bg-red-950 text-red-300 px-2 py-0.5 rounded border border-red-900 font-bold font-mono">
                                                                악명 {criminal.infamy}
                                                            </span>
                                                            <span className="text-[9px] bg-slate-900 text-slate-400 px-2 py-0.5 rounded border border-slate-800">
                                                                {criminal.nation}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="text-right shrink-0">
                                                    <p className="text-[10px] text-slate-500 uppercase font-bold">현상금</p>
                                                    <p className="text-sm sm:text-base font-bold text-amber-400 font-mono">
                                                        {criminal.rewardGold.toLocaleString()} G
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="p-4 space-y-3 flex-1">
                                                <p className="text-xs text-slate-400 leading-relaxed italic line-clamp-2">
                                                    "{criminal.description}"
                                                </p>
                                                <div className="grid grid-cols-2 gap-2 text-[10px] bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                                                    <div className="flex justify-between"><span className="text-slate-500">위험 레벨</span><span className="text-slate-200 font-bold">Lv.{criminal.level}</span></div>
                                                    <div className="flex justify-between"><span className="text-slate-500">신력 계통</span><span className="text-indigo-400 font-bold">{criminal.shinryokuType || '무'}</span></div>
                                                </div>
                                            </div>

                                            <div className="p-3 bg-slate-950 border-t border-slate-800">
                                                {isAccepted ? (
                                                    <div className="w-full py-2.5 bg-emerald-950/40 border border-emerald-800/60 text-emerald-400 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5">
                                                        <CheckCircle size={14}/> 추적 진행 중
                                                    </div>
                                                ) : !canTake ? (
                                                    <div className="w-full py-2.5 bg-slate-900 text-slate-500 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5">
                                                        <Lock size={14}/> 등급 부족 ({reqRank}급 이상 가능)
                                                    </div>
                                                ) : (
                                                    <button 
                                                        onClick={() => handleViewCriminal(criminal)}
                                                        className="w-full py-2.5 bg-slate-900 hover:bg-red-800 text-slate-200 hover:text-white rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 border border-slate-700 hover:border-red-500 shadow-sm"
                                                    >
                                                        <Target size={14}/> 현상수배 확인
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                }) : (
                                    <div className="col-span-full py-16 text-center text-slate-500 border-2 border-dashed border-slate-800 rounded-2xl">
                                        <ShieldCheck size={40} className="mx-auto mb-3 opacity-20"/>
                                        <p className="text-sm font-bold text-slate-400">현재 이 국가에 수배된 범죄자가 없거나 이미 모두 추적 중입니다.</p>
                                        <button 
                                            onClick={() => handleRefreshBlacklist()} 
                                            className="mt-3 text-xs text-red-400 underline hover:text-red-300 font-bold"
                                        >
                                            명단 갱신 시도 (연 1회)
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* TAB: 승급 심사 */}
                    {activeTab === 'promotion' && (
                        <div className="space-y-6 max-w-4xl mx-auto">
                            {/* 등급 기준 안내 카드 */}
                            <div className="bg-slate-950 p-4 sm:p-6 rounded-2xl border border-slate-800 shadow-lg">
                                <h3 className="text-sm sm:text-base font-bold text-amber-400 mb-3 flex items-center gap-2">
                                    <TrendingUp size={18} className="text-amber-500"/> 용병 등급별 승급 기준 (명성도)
                                </h3>
                                <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-1.5 sm:gap-2">
                                    {RANK_ORDER.map((rank) => {
                                        const isCurrent = currentRank === rank;
                                        const style = RANK_COLORS[rank];
                                        return (
                                            <div 
                                                key={rank} 
                                                className={`p-2 rounded-xl border text-center transition-all ${
                                                    isCurrent 
                                                        ? 'bg-amber-950/40 border-amber-500 shadow-md scale-105' 
                                                        : 'bg-slate-900/60 border-slate-800/80'
                                                }`}
                                            >
                                                <div className={`text-[10px] font-mono font-bold mb-0.5 ${style.text}`}>
                                                    {rank} Rank
                                                </div>
                                                <div className="text-[11px] font-mono text-slate-300 font-bold">
                                                    {MERCENARY_RANK_THRESHOLD[rank].toLocaleString()}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                                <p className="text-[11px] text-slate-500 mt-3 italic">* 의뢰 완수 및 현상수배 해결로 획득한 명성도가 기준에 도달하면 승급할 수 있습니다.</p>
                            </div>

                            {/* 승급 대상자 카드 목록 */}
                            <div className="space-y-3">
                                <h3 className="text-xs sm:text-sm font-bold text-slate-400 uppercase flex items-center gap-1.5">
                                    <Award size={16} className="text-amber-500"/> 승급 심사 대상
                                </h3>
                                
                                {/* 플레이어 승급 카드 */}
                                {mData && (
                                    <div className="bg-slate-950 p-4 sm:p-5 rounded-xl border border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-4 hover:border-amber-500/40 transition-all">
                                        <div className="flex items-center gap-3.5 w-full sm:w-auto">
                                            <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center shrink-0 shadow-inner">
                                                <User size={24} className="text-slate-300"/>
                                            </div>
                                            <div className="min-w-0">
                                                <h4 className="font-bold text-white text-base flex items-center gap-2">
                                                    {character.name} 
                                                    <span className="text-[10px] bg-red-950 text-red-300 px-2 py-0.5 rounded border border-red-900 font-bold">
                                                        리더 (You)
                                                    </span>
                                                </h4>
                                                <div className="flex items-center gap-2 mt-1 text-xs">
                                                    <span className={`font-mono font-bold ${rankStyle.text}`}>{currentRank} RANK</span>
                                                    <span className="text-slate-700">|</span>
                                                    <span className="text-amber-400 font-mono font-bold">{mData.reputation.toLocaleString()} 명성도</span>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        {(() => {
                                            const next = getNextMercenaryRank(currentRank);
                                            if (!next) return <span className="text-xs text-slate-500 font-bold italic">MAX RANK (최고 등급)</span>;
                                            const threshold = MERCENARY_RANK_THRESHOLD[next];
                                            const canPromo = mData.reputation >= threshold;
                                            
                                            return (
                                                <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 border-slate-800/80 pt-3 sm:pt-0">
                                                    <div className="text-right">
                                                        <div className="text-[10px] text-slate-500 uppercase font-bold">다음 등급: {next}</div>
                                                        <div className={`text-xs font-bold ${canPromo ? 'text-emerald-400' : 'text-slate-400'}`}>
                                                            {canPromo ? '승급 자격 충족' : `부족한 명성: ${(threshold - mData.reputation).toLocaleString()} 명성도`}
                                                        </div>
                                                    </div>
                                                    <button 
                                                        onClick={() => handlePromote('player')}
                                                        disabled={!canPromo}
                                                        className={`px-5 py-2.5 rounded-xl font-bold text-xs transition-all shadow-md ${
                                                            canPromo 
                                                                ? 'bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white animate-pulse' 
                                                                : 'bg-slate-900 text-slate-600 border border-slate-800 cursor-not-allowed'
                                                        }`}
                                                    >
                                                        승급 신청
                                                    </button>
                                                </div>
                                            );
                                        })()}
                                    </div>
                                )}

                                {/* 동료 용병 승급 카드들 */}
                                {mercCompanions.map(merc => {
                                    const rank = merc.mercenaryRank || MercenaryRank.F;
                                    const next = getNextMercenaryRank(rank);
                                    const defaultMinRep = MERCENARY_RANK_THRESHOLD[rank];
                                    const rep = (merc.reputation !== undefined && merc.reputation > 0) ? merc.reputation : defaultMinRep;
                                    const threshold = next ? MERCENARY_RANK_THRESHOLD[next] : 0;
                                    const canPromo = next && rep >= threshold;

                                    return (
                                        <div key={merc.id} className="bg-slate-950 p-4 sm:p-5 rounded-xl border border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-4 hover:border-indigo-500/40 transition-all">
                                            <div className="flex items-center gap-3.5 w-full sm:w-auto">
                                                <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
                                                    {merc.visualUrl ? (
                                                        <img src={merc.visualUrl} alt={merc.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                                    ) : (
                                                        <User size={24} className="text-slate-400" />
                                                    )}
                                                </div>
                                                <div className="min-w-0">
                                                    <h4 className="font-bold text-slate-200 text-base">{merc.name}</h4>
                                                    <div className="flex items-center gap-2 mt-1 text-xs">
                                                        <span className="text-red-400 font-mono font-bold">{rank} RANK</span>
                                                        <span className="text-slate-700">|</span>
                                                        <span className="text-amber-400 font-mono font-bold">{rep.toLocaleString()} 명성도</span>
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            {next ? (
                                                <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 border-slate-800/80 pt-3 sm:pt-0">
                                                    <div className="text-right">
                                                        <div className="text-[10px] text-slate-500 uppercase font-bold">다음 등급: {next}</div>
                                                        <div className={`text-xs font-bold ${canPromo ? 'text-emerald-400' : 'text-slate-400'}`}>
                                                            {canPromo ? '승급 자격 충족' : `부족한 명성: ${(threshold - rep).toLocaleString()} 명성도`}
                                                        </div>
                                                    </div>
                                                    <button 
                                                        onClick={() => handlePromote(merc.id)}
                                                        disabled={!canPromo}
                                                        className={`px-5 py-2.5 rounded-xl font-bold text-xs transition-all shadow-md ${
                                                            canPromo 
                                                                ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white animate-pulse' 
                                                                : 'bg-slate-900 text-slate-600 border border-slate-800 cursor-not-allowed'
                                                        }`}
                                                    >
                                                        승급 신청
                                                    </button>
                                                </div>
                                            ) : (
                                                <span className="text-xs text-slate-500 font-bold italic">MAX RANK (최고 등급)</span>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* TAB: 용병 고용 */}
                    {activeTab === 'recruit' && (
                        <div className="space-y-4 sm:space-y-6">
                            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 bg-slate-950/60 p-3.5 sm:p-4 rounded-xl border border-slate-800">
                                <div>
                                    <h3 className="text-xs sm:text-sm font-bold text-indigo-400 uppercase flex items-center gap-1.5">
                                        <Users size={16}/> 길드 대기실 용병 목록
                                    </h3>
                                    <p className="text-[11px] text-slate-400 mt-0.5">
                                        대화를 통해 성향을 파악하고 파티 동료로 영입할 수 있습니다.
                                    </p>
                                </div>
                                <button 
                                    onClick={handleRefreshRecruits} 
                                    disabled={isRecruitLoading} 
                                    className="text-xs px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg font-bold flex items-center transition-all self-end sm:self-auto shadow-sm"
                                >
                                    {isRecruitLoading ? <Loader2 size={12} className="animate-spin mr-1.5"/> : <RefreshCw size={12} className="mr-1.5"/>}
                                    명단 갱신 (10,000 G)
                                </button>
                            </div>

                            {isRecruitLoading ? (
                                <div className="flex flex-col items-center justify-center py-20 text-slate-500 space-y-4">
                                    <Loader2 size={40} className="animate-spin text-indigo-500/60"/>
                                    <p className="font-mono text-xs animate-pulse">새로운 용병 정보를 구성하고 있습니다...</p>
                                </div>
                            ) : recruits.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                                    {recruits.map(merc => {
                                        const hireCost = (RANK_ORDER.indexOf(merc.mercenaryRank!) + 1) * 10000;
                                        const playerRep = character.mercenaryData?.reputation ?? (character as any).reputation ?? 0;
                                        const playerMerit = character.militaryData?.merit ?? (character as any).merit ?? 0;
                                        const mercRep = merc.reputation ?? 0;
                                        const mercMerit = merc.merit ?? 0;
                                        const isOverRep = mercRep > playerRep;
                                        const isOverMerit = mercMerit > playerMerit;
                                        const cannotRecruit = isOverRep || isOverMerit;

                                        return (
                                            <div 
                                                key={merc.id} 
                                                className={`bg-slate-950 p-4 rounded-xl border transition-all flex gap-3.5 group shadow-sm ${
                                                    cannotRecruit 
                                                        ? 'border-rose-900/40 bg-slate-950/80' 
                                                        : 'border-slate-800 hover:border-indigo-500/50'
                                                }`}
                                            >
                                                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center shrink-0 overflow-hidden relative shadow-inner">
                                                    {merc.visualUrl ? (
                                                        <img src={merc.visualUrl} alt={merc.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" referrerPolicy="no-referrer" />
                                                    ) : (
                                                        <User size={32} className="text-slate-500"/>
                                                    )}
                                                    <div className="absolute bottom-0 left-0 right-0 bg-slate-950/85 text-[9px] text-center text-slate-300 py-0.5 font-bold font-mono uppercase border-t border-slate-800">
                                                        {merc.mercenaryRank} 등급
                                                    </div>
                                                </div>

                                                <div className="flex-1 min-w-0 flex flex-col justify-between">
                                                    <div>
                                                        <div className="flex justify-between items-start gap-1">
                                                            <div className="min-w-0">
                                                                <h4 className="font-bold text-slate-100 text-sm sm:text-base truncate group-hover:text-indigo-300 transition-colors">
                                                                    {merc.name}
                                                                </h4>
                                                            </div>
                                                            <span className="text-xs text-amber-400 font-mono font-bold shrink-0">
                                                                {hireCost.toLocaleString()} 골드
                                                            </span>
                                                        </div>

                                                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                                            <span className="text-[9px] text-amber-400 font-bold bg-amber-950/40 px-1.5 py-0.5 rounded border border-amber-900/60 font-mono">
                                                                레벨.{merc.level}
                                                            </span>
                                                            <span className="text-[10px] text-indigo-300 font-bold">
                                                                {merc.classType}
                                                            </span>
                                                            {merc.combatStyle && COMBAT_STYLE_CONFIG[merc.combatStyle] && (
                                                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${COMBAT_STYLE_CONFIG[merc.combatStyle].bgColor} ${COMBAT_STYLE_CONFIG[merc.combatStyle].borderColor} ${COMBAT_STYLE_CONFIG[merc.combatStyle].color}`}>
                                                                    ⚔️ {COMBAT_STYLE_CONFIG[merc.combatStyle].label}
                                                                </span>
                                                            )}
                                                            {cannotRecruit && (
                                                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-rose-950/70 border border-rose-800/80 text-rose-300 flex items-center gap-1">
                                                                    <AlertTriangle size={10} className="text-rose-400"/>
                                                                    영입 불가 ({isOverRep && isOverMerit ? '명성·공적 초과' : isOverRep ? '명성 초과' : '공적 초과'})
                                                                </span>
                                                            )}
                                                        </div>

                                                        {/* 명성치 및 공적치 표시 */}
                                                        <div className="flex items-center gap-2 mt-1.5 text-[10px] text-slate-400">
                                                            <span className={isOverRep ? 'text-rose-400 font-bold' : 'text-slate-300'}>
                                                                명성치: {mercRep.toLocaleString()}
                                                            </span>
                                                            {mercMerit > 0 && (
                                                                <span className={isOverMerit ? 'text-rose-400 font-bold' : 'text-slate-400'}>
                                                                    | 공적치: {mercMerit.toLocaleString()}
                                                                </span>
                                                            )}
                                                        </div>

                                                        <p className="mt-2 text-[11px] text-slate-400 bg-slate-900/60 p-1.5 rounded italic line-clamp-1 border-l-2 border-slate-700">
                                                            "{merc.appearance}"
                                                        </p>
                                                    </div>

                                                    <div className="mt-3 flex gap-2">
                                                        <button 
                                                            onClick={() => handleTalkToRecruit(merc)} 
                                                            className={`flex-1 py-2 rounded-lg border text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-sm ${
                                                                cannotRecruit 
                                                                    ? 'bg-slate-900 hover:bg-slate-850 text-slate-300 border-slate-700' 
                                                                    : 'bg-indigo-950/60 hover:bg-indigo-900/80 text-indigo-200 border-indigo-700/60'
                                                            }`}
                                                        >
                                                            <MessageCircle size={14}/> 대화하기
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-20 text-slate-500 border-2 border-dashed border-slate-800 rounded-2xl">
                                    <Users size={40} className="mb-3 opacity-30"/>
                                    <p className="text-sm font-bold text-slate-400">고용 가능한 용병이 없습니다.</p>
                                    <p className="text-xs mt-1 text-slate-500">상단의 '명단 갱신' 버튼을 눌러보세요.</p>
                                </div>
                            )}
                        </div>
                    )}
                    
                    {/* TAB: 길드 등록 */}
                    {activeTab === 'register' && (
                        <div className="max-w-lg mx-auto py-8 sm:py-12 space-y-6 text-center">
                            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-slate-950 border border-red-900/60 flex items-center justify-center mx-auto shadow-xl">
                                <UserPlus size={40} className="text-red-400"/>
                            </div>
                            
                            <div>
                                <h3 className="text-xl sm:text-2xl font-bold text-white mb-1.5">신규 용병 길드 등록</h3>
                                <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                                    용병 등록을 마치면 정식으로 길드 의뢰를 수주하고 활동할 수 있습니다.
                                </p>
                            </div>

                            <div className="bg-slate-950 p-4 sm:p-5 rounded-xl border border-slate-800 text-left space-y-3">
                                <div className="flex justify-between items-center text-xs sm:text-sm">
                                    <span className="text-slate-400 font-medium">나이 자격</span> 
                                    <span className={`font-bold ${ageNum >= 20 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                        {character.age} (만 20세 이상 충족 {ageNum >= 20 ? '✓' : '✗'})
                                    </span>
                                </div>
                                <div className="flex justify-between items-center text-xs sm:text-sm border-t border-slate-800/80 pt-3">
                                    <span className="text-slate-400 font-medium">직업 상태</span> 
                                    <span className={`font-bold ${canRegisterJob ? 'text-emerald-400' : 'text-rose-400'}`}>
                                        {character.job} (무직 상태여야 등록 가능)
                                    </span>
                                </div>
                            </div>

                            <button 
                                onClick={handleRegister} 
                                className="w-full py-3.5 sm:py-4 bg-gradient-to-r from-red-700 to-rose-700 hover:from-red-600 hover:to-rose-600 text-white font-bold rounded-xl shadow-lg shadow-red-950/50 transition-all text-sm sm:text-base flex items-center justify-center gap-2"
                            >
                                <UserPlus size={18}/> 등록비 0 G - 용병 등록 완료
                            </button>
                        </div>
                    )}

                    {/* TAB: 용병단 관리 */}
                    {activeTab === 'group' && (
                        <div className="flex-1 flex flex-col items-center justify-center py-12 sm:py-16 space-y-6 text-center max-w-lg mx-auto">
                            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-amber-950/30 border border-amber-500/40 flex items-center justify-center shadow-xl">
                                <Crown size={48} className="text-amber-400" />
                            </div>
                            
                            <div>
                                <h3 className="text-xl sm:text-2xl font-bold text-white mb-2">용병단 관리 시스템</h3>
                                <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                                    독자적인 용병단을 창설하고 단원들을 고용·파견하여 대륙 전역에 세력을 떨치십시오.
                                </p>
                            </div>

                            <button 
                                onClick={() => setIsGroupModalOpen(true)} 
                                className="w-full sm:w-auto px-8 py-3.5 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white font-bold rounded-xl shadow-lg shadow-amber-950/50 flex items-center justify-center gap-2.5 transition-all text-sm sm:text-base"
                            >
                                <LayoutGrid size={18}/> 
                                {character.mercenaryData?.isGroupLeader ? "용병단 관리 본부 열기" : "용병단 창설 심사 받기"}
                            </button>
                        </div>
                    )}

                    {/* TAB: 세력 가입 */}
                    {activeTab === 'join' && (
                        <div className="flex-1 flex flex-col items-center justify-center py-12 sm:py-16 space-y-6 text-center max-w-lg mx-auto">
                            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-rose-950/30 border border-rose-500/40 flex items-center justify-center shadow-xl">
                                <Globe size={48} className="text-rose-400" />
                            </div>
                            
                            <div>
                                <h3 className="text-xl sm:text-2xl font-bold text-white mb-2">용병 세력 가입</h3>
                                <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                                    각 지역별로 활동 중인 거대 용병단에 소속되어 조직의 혜택을 누리고 명성을 쌓으십시오.
                                </p>
                            </div>

                            <button 
                                onClick={() => setIsFactionModalOpen(true)}
                                className="w-full sm:w-auto px-8 py-3.5 bg-gradient-to-r from-rose-700 to-red-700 hover:from-rose-600 hover:to-red-600 text-white font-bold rounded-xl shadow-lg shadow-rose-950/50 flex items-center justify-center gap-2.5 transition-all text-sm sm:text-base"
                            >
                                <Users size={18}/> 
                                {mData?.joinedGroupId ? "소속 용병단 방문하기" : "가입 가능한 용병단 찾기"}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MercenaryGuildModal;
