import React, { useState, useEffect } from 'react';
import { CHARACTER_PRESETS } from '../appearance';
import { Character, Companion, Item, ClassTier, JobType, Stats, Quest, MercenaryRank, ItemRarity, SkillType, WeaponType } from '../types';
import { X, Leaf, Trees, Sparkles, UserPlus, Heart, MessageCircle, Wind, Loader2, Gem, Zap, CheckCircle, Info, Users, ChevronRight, RefreshCw, ScrollText, Skull, ShieldCheck, Crown, Sword, Target, ShoppingBag, BookOpen, AlertTriangle, Coins, Lock, UserCheck, User, Minus, Plus, TreePine, Clock } from 'lucide-react';
import { generateName, generateCompanionStats, getTierByLevel, assignRandomCombatStyle, calculateInventorySize, addDays } from '../utils';
import { SHINRYOKU_TYPES_LIST, MAX_PARTY_SIZE, NATION_DATA, COMBAT_STYLE_CONFIG, QUEST_RANK_INDEX, QUEST_DANGER_INDEX, HUMANOID_CLASSES, getHumanoidClassByTier } from '../constants';
import { NATION_THEMES } from '../monsterfield';
import ActionResultModal, { ResultData } from './ActionResultModal';
import { ItemTooltip } from './CharacterSheet';
import { getShinryokuThematicClassName, checkAndInitializeLiberationEligibility } from '../services/companionGrowthService';
import { determineRecruitClassTier } from '../services/classLiberationHelper';

interface Props {
    character: Character;
    onClose: () => void;
    onUpdateCharacter: (newChar: Character, logMsg: string) => void;
}

type Tab = 'audience' | 'recruits' | 'shop' | 'skills';

const RANK_ORDER: MercenaryRank[] = [
    MercenaryRank.F, MercenaryRank.E, MercenaryRank.D, MercenaryRank.C,
    MercenaryRank.B, MercenaryRank.A, MercenaryRank.S, MercenaryRank.SS, MercenaryRank.SSS
];

const ElfCityModal: React.FC<Props> = ({ character, onClose, onUpdateCharacter }) => {
    const [activeTab, setActiveTab] = useState<Tab>('audience');
    const [recruits, setRecruits] = useState<Companion[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isQuestLoading, setIsQuestLoading] = useState(false);
    const [resultData, setResultData] = useState<ResultData | null>(null);
    
    // 구매 관련 상태
    const [selectedShopItem, setSelectedShopItem] = useState<any | null>(null);
    const [shopQuantity, setShopQuantity] = useState(1);

    // 목재 정기 공급 계약 관련 상태
    const [isWoodContractModalOpen, setIsWoodContractModalOpen] = useState(false);
    const [extraReputation, setExtraReputation] = useState(0);

    // 비기 전수 대상 선택 상태
    const [skillTargetPicker, setSkillTargetPicker] = useState<{ skillName: string; skillDesc: string } | null>(null);

    const loc = character.currentLocation || { nation: '미르탈 숲연합', city: '미르탈' };
    const isCapital = loc.city === '미르탈';
    const leaderName = "엘라디아";
    const leaderTitle = isCapital ? `엘프 여왕 ${leaderName}` : "엘프 장로";
    
    const elfRep = character.elfReputation || 0;
    const isWoodContractActive = Boolean(character.elfWoodContractEndDate && (!character.currentDate || character.currentDate < character.elfWoodContractEndDate));
    const currentMonth = character.currentDate?.substring(0, 7) || '2000-01';
    const lastRefresh = character.lastElfQuestRefreshDate || '';
    const availableElfQuests = character.availableElfQuests || [];
    const lastRecruitRefresh = character.lastElfRecruitRefreshDate || '';
    const availableElfRecruits = character.availableElfRecruits || [];

    useEffect(() => {
        if (character.availableElfRecruits) {
            setRecruits(character.availableElfRecruits);
        }
    }, [character.availableElfRecruits]);

    const handleResultClose = () => {
        setResultData(null);
        (window as any).elfExec = null;
    };

    const handleRefreshQuests = async (force = false) => {
        if (!force && lastRefresh === currentMonth) {
            setResultData({
                type: 'info',
                title: '갱신 제한',
                message: '엘프 성역의 임무 게시판은 한 달에 한 번만 갱신할 수 있습니다.\n다음 달에 다시 확인해주십시오.',
                items: [{ label: '최근 갱신일', after: lastRefresh }]
            });
            return;
        }

        setIsQuestLoading(true);
        try {
            const theme = NATION_THEMES['미르탈 숲연합'] || NATION_THEMES.default;
            
            const currentRank = character.mercenaryData?.rank || (
                character.level >= 180 ? MercenaryRank.SSS :
                character.level >= 150 ? MercenaryRank.SS :
                character.level >= 120 ? MercenaryRank.S :
                character.level >= 90 ? MercenaryRank.A :
                character.level >= 60 ? MercenaryRank.B :
                character.level >= 40 ? MercenaryRank.C :
                character.level >= 20 ? MercenaryRank.D :
                character.level >= 10 ? MercenaryRank.E : MercenaryRank.F
            );
            const rankIdxNum = Math.max(0, RANK_ORDER.indexOf(currentRank));

            let targetBands: string[] = [];
            if (currentRank === MercenaryRank.F || currentRank === MercenaryRank.E) targetBands = ['beginner', 'lower'];
            else if (currentRank === MercenaryRank.D || currentRank === MercenaryRank.C) targetBands = ['intermediate'];
            else if (currentRank === MercenaryRank.B) targetBands = ['advanced'];
            else if (currentRank === MercenaryRank.A) targetBands = ['elite'];
            else if (currentRank === MercenaryRank.S) targetBands = ['disaster'];
            else if (currentRank === MercenaryRank.SS) targetBands = ['abyss'];
            else if (currentRank === MercenaryRank.SSS) targetBands = ['mythic'];
            else targetBands = ['beginner', 'lower'];

            const monsterPool: string[] = [];
            targetBands.forEach(bId => {
                const pool = (theme.monsters as any)?.[bId] || [];
                monsterPool.push(...pool.map((m: any) => typeof m === 'string' ? m : m.name));
            });
            if (monsterPool.length === 0) {
                Object.values(theme.monsters).forEach(monsters => {
                    if (Array.isArray(monsters)) monsters.forEach((m: any) => monsterPool.push(typeof m === 'string' ? m : m.name));
                });
            }

            const localQuests: Quest[] = [];
            const dangerKeys: (keyof typeof QUEST_DANGER_INDEX)[] = ['Low', 'Mid', 'High', 'Extreme'];
            const questCount = 4 + Math.floor(Math.random() * 3); // 4~6개

            for (let i = 0; i < questCount; i++) {
                const targetMonster = monsterPool[Math.floor(Math.random() * monsterPool.length)] || "숲의 침입자";
                const danger = dangerKeys[Math.floor(Math.random() * dangerKeys.length)];
                const count = Math.floor(Math.random() * 5) + 3; // 3~7마리
                const questRank = RANK_ORDER[Math.max(0, Math.min(rankIdxNum, Math.floor(Math.random() * (rankIdxNum + 1))))];

                const rankMultiplier = QUEST_RANK_INDEX[questRank] || 800;
                const dangerMultiplier = QUEST_DANGER_INDEX[danger] || 1.0;

                const rewardExp = Math.floor(count * rankMultiplier * (2 + Math.random() * 0.35) * dangerMultiplier);
                const rewardGold = Math.floor(count * rankMultiplier * (4 + Math.random() * 2.5) * dangerMultiplier);
                const rewardElfRep = 5 + Math.floor(Math.random() * 10);
                const rewardFaith = 5 + Math.floor(Math.random() * 10);

                localQuests.push({
                    id: `elf_quest_${Date.now()}_${i}`,
                    type: 'Subjugation',
                    rank: questRank,
                    title: `[정화] ${targetMonster} 토벌`,
                    goal: `${targetMonster} ${count}마리 처치`,
                    details: `숲의 정령들이 ${targetMonster}의 탁한 기운으로 인해 위협받고 있습니다. 이들을 정화하여 숲의 안녕을 지켜주세요.`,
                    danger: danger as 'Low' | 'Mid' | 'High' | 'Extreme',
                    rewardGold,
                    rewardExp,
                    rewardElfRep,
                    rewardFaith,
                    currentAmount: 0,
                    targetAmount: count,
                    targetName: targetMonster
                });
            }

            const newChar = { ...character };
            newChar.availableElfQuests = localQuests;
            newChar.lastElfQuestRefreshDate = currentMonth;
            
            onUpdateCharacter(newChar, `[엘프 성역] 정령들의 인도를 받아 성역 정화 임무 목록을 갱신했습니다.`);
            setResultData({
                type: 'success',
                title: '임무 목록 갱신',
                message: '숲의 기운이 감지한 새로운 정화 임무들이 게시되었습니다.',
                items: [{ label: '새로운 임무', after: `${localQuests.length}개` }]
            });
        } catch (e) {
            console.error("Elf quest generation error:", e);
        }
        setIsQuestLoading(false);
    };

    const generateElves = async (force = false) => {
        if (!force && lastRecruitRefresh === currentMonth) {
            setResultData({
                type: 'info',
                title: '갱신 제한',
                message: '숲의 전사 모집 명단은 한 달에 한 번만 갱신할 수 있습니다.\n다음 달에 새로운 전사들을 확인해주십시오.',
                items: [{ label: '최근 갱신일', after: lastRecruitRefresh || '기록 없음' }]
            });
            return;
        }

        setIsLoading(true);
        const personalities = ["사색적인", "숲의 파수꾼", "신비로운", "냉철한", "고결한"];
        const newElves: Companion[] = [];
        
        const sourceNation = "미르탈 숲연합";
        
        const repFactor = Math.max(0.5, 1 + (elfRep / 100));
        
        const SHINRYOKU_MAP_LOCAL: Record<string, string> = {
            '태양': '광휘계', '화염': '화염계', '광휘': '광휘계', '월광': '암흑계', '전격': '전격계',
            '지령': '대지계', '질풍': '질풍계', '빙결': '빙결계', '해수': '해수계', '강철': '대지계',
            '암연': '암흑계', '초화': '초화계', '무': '일반'
        };

        for (let i = 0; i < 3; i++) {
            // 플레이어 레벨보다 무조건 낮게 설정하되, 최대 레벨 한계치는 250~300 사이 무작위 배치
            const maxCap = 250 + Math.floor(Math.random() * 51);
            const maxLevelAllowed = Math.max(1, Math.min(character.level - 1, maxCap));
            const minLevelAllowed = Math.max(1, Math.floor(maxLevelAllowed * 0.3));
            const finalLevel = Math.floor(minLevelAllowed + Math.random() * (maxLevelAllowed - minLevelAllowed + 1));
            const gender = Math.random() < 0.5 ? '남성' : '여성';
            const genderParam = gender === '남성' ? 'male' : 'female';
            const name = generateName(sourceNation, genderParam);
            const tier = determineRecruitClassTier(finalLevel);
            
            const elfTypes = ["초화계", "빙결계", "광휘계", "월광계", "질풍계"];
            const randomShinryoku = elfTypes[Math.floor(Math.random() * elfTypes.length)];
            const currentTierClass = tier !== ClassTier.NONE ? getHumanoidClassByTier(randomShinryoku, tier) : '숲의 파수꾼';
            const thematicClass = currentTierClass;

            const elfPresets = CHARACTER_PRESETS['엘프'] || [];
            const genderPresets = elfPresets.filter(p => p.label.includes(gender));
            const randomPreset = genderPresets.length > 0 
                ? genderPresets[Math.floor(Math.random() * genderPresets.length)] 
                : elfPresets[Math.floor(Math.random() * elfPresets.length)];

            let firstClassName: string | undefined = undefined;
            let firstClassDescription: string | undefined = undefined;
            let secondClassName: string | undefined = undefined;
            let secondClassDescription: string | undefined = undefined;
            let lastClassName: string | undefined = undefined;
            let lastClassDescription: string | undefined = undefined;
            let finalClassName: string | undefined = undefined;
            let finalClassDescription: string | undefined = undefined;

            if (tier === ClassTier.FIRST || tier === ClassTier.SECOND || tier === ClassTier.LAST || tier === ClassTier.FINAL) {
                firstClassName = (tier === ClassTier.FIRST) ? currentTierClass : getHumanoidClassByTier(randomShinryoku, ClassTier.FIRST);
                firstClassDescription = `${randomShinryoku} 계통의 1차 클래스 각성`;
            }
            if (tier === ClassTier.SECOND || tier === ClassTier.LAST || tier === ClassTier.FINAL) {
                secondClassName = (tier === ClassTier.SECOND) ? currentTierClass : getHumanoidClassByTier(randomShinryoku, ClassTier.SECOND);
                secondClassDescription = `${randomShinryoku} 계통의 2차 클래스 심화`;
            }
            if (tier === ClassTier.LAST || tier === ClassTier.FINAL) {
                lastClassName = (tier === ClassTier.LAST) ? currentTierClass : getHumanoidClassByTier(randomShinryoku, ClassTier.LAST);
                lastClassDescription = `${randomShinryoku} 계통의 3차 클래스 극의`;
            }
            if (tier === ClassTier.FINAL) {
                finalClassName = currentTierClass;
                finalClassDescription = `${randomShinryoku} 계통의 궁극 클래스 도달`;
            }

            const rawStats = generateCompanionStats(finalLevel);
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

            const recruitObj: Companion = assignRandomCombatStyle({
                id: `elf_recruit_${Math.random().toString(36).substring(7)}`,
                name: `${name}`,
                age: `${100 + Math.floor(Math.random() * 200)}세`,
                gender,
                race: '엘프',
                nation: '미르탈 숲연합',
                appearance: "가늘고 긴 귀와 투명한 피부를 가진 고결한 외모의 엘프입니다.",
                personality: personalities[Math.floor(Math.random() * personalities.length)],
                classType: thematicClass,
                job: JobType.UNEMPLOYED,
                level: finalLevel,
                currentExp: 0, maxExp: finalLevel * 100, statPoints: 0, classTier: tier,
                shinryokuType: randomShinryoku,
                firstClassName, firstClassDescription,
                secondClassName, secondClassDescription,
                lastClassName, lastClassDescription,
                finalClassName, finalClassDescription,
                stats: balancedStats,
                skills: [], equipment: {}, inventory: [], affection: 30 + (elfRep / 2), loyalty: 60,
                visualUrl: randomPreset?.url
            }, true, true);

            checkAndInitializeLiberationEligibility(recruitObj, 0);
            newElves.push(recruitObj);
        }

        setRecruits(newElves);

        const newChar = { ...character };
        newChar.availableElfRecruits = newElves;
        newChar.lastElfRecruitRefreshDate = currentMonth;

        onUpdateCharacter(newChar, `[엘프 성역] 숲의 전사 모집 명단을 갱신했습니다.`);
        setResultData({
            type: 'success',
            title: '명단 갱신 완료',
            message: '새로운 숲의 전사들이 모집 명단에 등록되었습니다.',
            items: [{ label: '모집 인원', after: `${newElves.length}명` }]
        });
        setIsLoading(false);
    };

    const handleDestroyNature = () => {
        const goldGain = 20000;
        const woodGain = 50;
        const repLoss = 20;
        const infamyGain = 10;
        
        setResultData({
            type: 'warning',
            title: '숲의 개간',
            message: '숲의 일부를 베어내고 자원을 팔아 이득을 취하시겠습니까?\n엘프들의 분노를 사게 되며, 당신의 악명이 세상에 퍼집니다.',
            items: [
                { label: '획득 골드', after: `+${goldGain.toLocaleString()} G` },
                { label: '획득 목재', after: `+${woodGain}개` },
                { label: '평판 변화', after: `-${repLoss} (하락)` },
                { label: '악명도 증가', after: `+${infamyGain}` }
            ]
        });

        const execute = () => {
            const newChar = { ...character };
            newChar.money += goldGain;
            newChar.elfReputation = Math.max(-100, (newChar.elfReputation || 0) - repLoss);
            newChar.infamy = (newChar.infamy || 0) + infamyGain;
            
            if (newChar.base) {
                newChar.base.resources.wood += woodGain;
            }
            
            onUpdateCharacter(newChar, `[자연 훼손] 숲을 개간하여 골드 ${goldGain.toLocaleString()}G와 목재 ${woodGain}개를 얻었습니다. 엘프들과의 신뢰가 하락했습니다.`);
            setResultData(null);
        };

        (window as any).elfExec = execute;
    };

    const handleWoodContract = () => {
        if (isWoodContractActive) {
            setResultData({
                type: 'info',
                title: '계약 유지 중',
                message: `이미 목재 정기 공급 계약이 체결되어 매일 목재 ${character.elfWoodDailySupply || 30}개씩 기지에 공급되고 있습니다.\n계약 만료 후 재계약이 가능합니다.`,
                items: [
                    { label: '일일 공급량', after: `매일 +${character.elfWoodDailySupply || 30}개` },
                    { label: '만료 예정일', after: character.elfWoodContractEndDate || '-' }
                ]
            });
            return;
        }

        if (elfRep < 30) {
            setResultData({
                type: 'warning',
                title: '평판 부족',
                message: '목재 공급 계약을 체결하려면 엘프 평판이 최소 30점 이상 필요합니다.\n성역 정화 임무를 수행하여 평판을 높이십시오.',
                items: [
                    { label: '현재 평판', after: `${elfRep}점` },
                    { label: '필요 평판', after: '30점 이상' }
                ]
            });
            return;
        }

        setExtraReputation(0);
        setIsWoodContractModalOpen(true);
    };

    const handleConfirmWoodContract = () => {
        const baseCost = 30;
        const totalCostRep = baseCost + extraReputation;
        const dailyYield = baseCost + extraReputation;
        const totalYield = dailyYield * 30;
        const durationDays = 30;

        if (elfRep < totalCostRep) {
            alert("보유 평판이 부족합니다.");
            return;
        }

        const newChar = { ...character };
        newChar.elfReputation = Math.max(-100, (newChar.elfReputation || 0) - totalCostRep);
        newChar.elfWoodDailySupply = dailyYield;
        newChar.elfWoodContractEndDate = addDays(character.currentDate || '2000-01-01', durationDays);

        onUpdateCharacter(newChar, `[엘프 숲연합 목재 계약] 평판 ${totalCostRep}점을 소모하고 30일간 목재 공급 계약을 체결했습니다. 매일 기지로 목재 ${dailyYield}개가 배송됩니다. (30일 총 ${totalYield.toLocaleString()}개)`);

        setIsWoodContractModalOpen(false);

        setResultData({
            type: 'success',
            title: '목재 공급 계약 체결',
            message: '엘프 숲연합과의 30일간 목재 정기 공급 계약이 체결되었습니다.\n매일 기지 창고로 목재가 정기 배송되며, 일일 종합 보고서에서 수확 결과를 확인하실 수 있습니다.',
            items: [
                { label: '일일 기지 공급량', after: `매일 +${dailyYield}개` },
                { label: '30일 총 공급량', after: `총 ${totalYield.toLocaleString()}개` },
                { label: '소모 평판', after: `-${totalCostRep}점` },
                { label: '계약 만료일', after: newChar.elfWoodContractEndDate }
            ]
        });
    };

    const handleAcceptQuest = (quest: Quest) => {
        const newChar = { ...character };
        if (!newChar.mercenaryData) {
            newChar.mercenaryData = { rank: MercenaryRank.F, registeredDate: character.currentDate || '', completedQuests: 0, reputation: 0, guildId: 'None', isGroupLeader: false, activeQuests: [], availableQuests: [] };
        }
        if ((newChar.mercenaryData.activeQuests?.length || 0) >= 3) {
            alert("동시에 수행 가능한 임무는 최대 3개입니다.");
            return;
        }
        newChar.mercenaryData.activeQuests = [...(newChar.mercenaryData.activeQuests || []), quest];
        newChar.availableElfQuests = availableElfQuests.filter(q => q.id !== quest.id);
        onUpdateCharacter(newChar, `[엘프 퀘스트] '${quest.title}' 임무를 수락했습니다.`);
        setResultData({ type: 'success', title: '임무 수락', message: `${leaderTitle}: "숲의 안녕을 위해 힘써주게나."`, items: [{ label: '임무', after: quest.title }] });
    };

    const handleRecruit = (elf: Companion) => {
        if (elfRep < 30) {
            setResultData({ type: 'warning', title: '신뢰 부족', message: `${elf.name}: "아직 당신을 완전히 믿을 수 없군요. 숲을 위한 헌신을 더 보여주세요."`, items: [{ label: '요구 평판', after: '30 이상' }] });
            return;
        }
        if (character.companions.length >= MAX_PARTY_SIZE) { alert("파티가 가득 찼습니다."); return; }
        const newChar = { ...character };
        newChar.companions.push(assignRandomCombatStyle(elf, true, true));
        const updatedRecruits = (newChar.availableElfRecruits || recruits).filter(r => r.id !== elf.id);
        newChar.availableElfRecruits = updatedRecruits;
        setRecruits(updatedRecruits);
        onUpdateCharacter(newChar, `[엘프 영입] ${elf.name}이(가) 당신의 여정에 합류했습니다.`);
        setResultData({ type: 'success', title: '영입 성공', message: `${elf.name}이(가) 당신을 숲의 친구로 인정했습니다.`, items: [{ label: '종족', after: '엘프' }] });
    };

    const ELF_SHOP_ITEMS = [
        { name: "엘프의 이슬", type: "Consumable" as const, rarity: ItemRarity.MAGIC, cost: 5000, req: 30, description:"HP와 MP를 30% 즉시 회복하는 영험한 이슬.", desc: "HP와 MP를 30% 즉시 회복하는 영험한 이슬.", secondaryOptions:["HP 30% 회복","MP 30% 회복"], imageUrl: "https://i.ibb.co/q3RRjb74/Kakao-Talk-20260105-190804166-05.png" },
        { name: "성역의 나뭇가지", type: "Etc" as const, rarity: ItemRarity.RARE, cost: 10000, req: 30, description:"고급 제작에 사용되는 정화된 나뭇가지.", desc: "고급 제작에 사용되는 정화된 나뭇가지.", imageUrl: "https://i.ibb.co/B5HSG2n5/Kakao-Talk-20260105-190804166-04.png" },
        { 
            name: "실바나르의 활", 
            type: "Weapon" as const, 
            weaponType: 'Bow' as WeaponType, 
            rarity: ItemRarity.EPIC, 
            cost: 150000, 
            req: 60, 
            description: "바람을 가르는 엘프 기술의 정수.",
            desc: "바람을 가르는 엘프 기술의 정수.", 
            stats: { agi: 80, wis: 84 }, 
            secondaryOptions: ["치명타 확률 +15%", "AGI +5%", "초화계 속성 부여"],
            imageUrl: "https://i.ibb.co/Mydq804h/Kakao-Talk-20260105-190804166-03.png" 
        },
        { 
            name: "숲의 가호 목걸이", 
            type: "Accessory" as const, 
            rarity: ItemRarity.EPIC, 
            cost: 500000, 
            req: 60, 
            description: "자연계 피해를 20% 경감시키는 목걸이.",
            desc: "자연계 피해를 20% 경감시키는 목걸이.", 
            stats: { def: 50, wis: 100 }, 
            secondaryOptions: ["상태이상 저항 +20%", "초화계 속성 저항 +20%"],
            imageUrl: "https://i.ibb.co/RkRV4CmD/Kakao-Talk-20260105-190804166-02.png" 
        },
        { 
            name: "엘라디아의 활", 
            type: "Weapon" as const,
            weaponType: 'Bow' as WeaponType, 
            rarity: ItemRarity.LEGENDARY, 
            cost: 10000000, 
            req: 90,
            description:"전설적인 엘프 여왕의 활.", 
            desc: "전설적인 엘프 여왕의 활.",
            stats: { agi: 180, int: 160 }, 
            secondaryOptions: ["치명타 확률 +25%", "AGI +30%", "STR +20%","초화계 속성 부여"], 
            imageUrl: "https://i.ibb.co/NRYy6fG/Kakao-Talk-20260105-190804166-01.png" 
        },
        { 
            name: "세계수의 정수", 
            type: "Etc" as const, 
            rarity: ItemRarity.LEGENDARY, 
            cost: 2000000, 
            req: 100, 
            description:"태초의 생명 에너지가 응축된 결정.",
            desc: "태초의 생명 에너지가 응축된 결정.", 
            imageUrl: "https://i.ibb.co/v6pHyJ47/Kakao-Talk-20260105-190804166.png" 
        }
    ];

    const handleBuyItem = (itemData: any, quantity: number) => {
        const totalCost = itemData.cost * quantity;
        if (character.money < totalCost) {
            alert("골드가 부족합니다.");
            return;
        }
        
        const maxInventorySize = calculateInventorySize(character.stats);
        if (character.inventory.length + quantity > maxInventorySize) {
            alert("가방 공간이 부족합니다.");
            return;
        }

        const newChar = { ...character };
        newChar.money -= totalCost;
        
        const newItems: Item[] = Array(quantity).fill(null).map(() => ({
            name: itemData.name, 
            type: itemData.type, 
            rarity: itemData.rarity, 
            description: itemData.desc, 
            stats: itemData.stats, 
            weaponType: itemData.weaponType,
            secondaryOptions: itemData.secondaryOptions,
            enhancement: 0, 
            imageUrl: itemData.imageUrl
        }));

        newChar.inventory = [...newChar.inventory, ...newItems];
        onUpdateCharacter(newChar, `[엘프 상점] '${itemData.name}' x${quantity}개를 구매했습니다. (-${totalCost.toLocaleString()}G)`);
        setResultData({ 
            type: 'success', 
            title: '구매 완료', 
            message: `${itemData.name} ${quantity}개를 획득했습니다.`, 
            items: [{ label: '소모 골드', after: `${totalCost.toLocaleString()} G` }] 
        });
        setSelectedShopItem(null);
    };

    const handleOpenLearnPicker = (skillName: string, skillDesc: string) => {
        const costMana = 100;
        if ((character.base?.resources.manaCrystal || 0) < costMana) {
            alert("마정석이 부족합니다.");
            return;
        }

        const potentialTargets = [
            ...(character.shinryokuType === "초화계" ? [{ id: 'player', name: `${character.name} (나)`, isPlayer: true }] : []),
            ...character.companions.filter(c => c.shinryokuType === "초화계").map(c => ({ id: c.id, name: c.name, isPlayer: false }))
        ];

        if (potentialTargets.length === 0) {
            alert("해당 기술을 전수받을 '초화계' 능력자가 일행에 없습니다.");
            return;
        }

        setSkillTargetPicker({ skillName, skillDesc });
    };

    const confirmLearnElfSkill = (targetId: string) => {
        if (!skillTargetPicker) return;
        const { skillName, skillDesc } = skillTargetPicker;
        const costMana = 100;
        const newChar = { ...character };
        
        let targetEntity: any = null;
        let targetName = "";

        if (targetId === 'player') {
            targetEntity = newChar;
            targetName = newChar.name;
        } else {
            const compIdx = newChar.companions.findIndex(c => c.id === targetId);
            if (compIdx !== -1) {
                targetEntity = newChar.companions[compIdx];
                targetName = targetEntity.name;
            }
        }

        if (!targetEntity) return;

        if (targetEntity.skills?.some((s: any) => s.name === skillName)) {
            alert(`${targetName}은(는) 이미 해당 기술을 보유하고 있습니다.`);
            return;
        }

        if (newChar.base) newChar.base.resources.manaCrystal -= costMana;
        
        const newSkill: any = {
            name: skillName, type: SkillType.PASSIVE, tier: ClassTier.NONE, 
            description: `[엘프 비기] ${skillName === '자연의 공명' ? '제어력 +10% 상승' : '매턴 HP 1% 추가 재생'}.`,
            effectFormula: skillName === '자연의 공명' ? "PASSIVE: [CTRL] +10% (+0.1% per Lv)" : "PASSIVE: [HP_REGEN] +1% (+0.1% per Lv)",
            level: 1, maxLevel: 10, currentMastery: 0
        };
        targetEntity.skills.push(newSkill);
        
        onUpdateCharacter(newChar, `[엘프 비기] ${targetName}에게 '${skillName}' 기술을 전수했습니다.`);
        setResultData({ 
            type: 'success', 
            title: '기술 전수 성공', 
            message: `${targetName}이(가) 엘프의 고대 기술을 익혔습니다.`, 
            items: [
                { label: '대상', after: targetName },
                { label: '기술명', after: skillName },
                { label: '소모 마정석', after: costMana }
            ] 
        });
        setSkillTargetPicker(null);
    };

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/90 backdrop-blur-md p-2 sm:p-4">
            {resultData && <ActionResultModal data={resultData} onClose={handleResultClose} onContinue={(window as any).elfExec} />}
            
            {/* 수량 선택 오버레이 */}
            {selectedShopItem && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-sm p-4">
                    <div className="bg-slate-900 border border-emerald-500/50 rounded-3xl w-full max-w-sm shadow-2xl p-5 sm:p-6">
                        <div className="text-center mb-5">
                            <h3 className="text-lg font-bold text-white mb-1">{selectedShopItem.name}</h3>
                            <p className="text-xs text-emerald-400/80">구매할 수량을 선택하세요.</p>
                        </div>

                        <div className="flex items-center justify-center gap-6 mb-5">
                            <button 
                                onClick={() => setShopQuantity(Math.max(1, shopQuantity - 1))}
                                className="w-11 h-11 flex items-center justify-center bg-slate-800 rounded-2xl hover:bg-slate-700 text-white border border-slate-700 active:scale-90 transition-all"
                            >
                                <Minus size={18} />
                            </button>
                            <div className="flex flex-col items-center min-w-[70px]">
                                <span className="text-3xl font-black font-mono text-emerald-400">{shopQuantity}</span>
                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">수량</span>
                            </div>
                            <button 
                                onClick={() => {
                                    const maxAffordable = Math.floor(character.money / selectedShopItem.cost);
                                    const spaceLimit = calculateInventorySize(character.stats) - character.inventory.length;
                                    const trueMax = Math.min(maxAffordable, spaceLimit, 99);
                                    if (shopQuantity < trueMax) setShopQuantity(shopQuantity + 1);
                                }}
                                className="w-11 h-11 flex items-center justify-center bg-slate-800 rounded-2xl hover:bg-slate-700 text-white border border-slate-700 active:scale-90 transition-all"
                            >
                                <Plus size={18} />
                            </button>
                        </div>

                        <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 mb-5 space-y-1.5">
                            <div className="flex justify-between items-center text-xs text-slate-400">
                                <span>단가</span>
                                <span className="font-mono text-slate-200">{selectedShopItem.cost.toLocaleString()} G</span>
                            </div>
                            <div className="flex justify-between items-center text-sm font-bold text-white pt-2 border-t border-slate-800">
                                <span>총 결제 금액</span>
                                <span className="text-emerald-400 font-mono">{(selectedShopItem.cost * shopQuantity).toLocaleString()} G</span>
                            </div>
                        </div>

                        <div className="flex gap-2.5">
                            <button onClick={() => setSelectedShopItem(null)} className="flex-1 py-3 bg-slate-800 text-slate-300 rounded-xl text-xs font-bold hover:bg-slate-700 transition-colors">취소</button>
                            <button 
                                onClick={() => handleBuyItem(selectedShopItem, shopQuantity)}
                                className="flex-[2] py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-900/40 transition-all active:scale-95"
                            >
                                구매 확정
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 전수 대상 선택 오버레이 */}
            {skillTargetPicker && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/95 p-4">
                    <div className="bg-slate-900 border border-emerald-500/50 rounded-3xl p-5 sm:p-6 w-full max-w-sm shadow-2xl">
                        <div className="text-center mb-5">
                            <div className="w-14 h-14 bg-emerald-950/50 rounded-full flex items-center justify-center mx-auto mb-3 border border-emerald-500/30">
                                <Sparkles size={28} className="text-emerald-400"/>
                            </div>
                            <h3 className="text-lg font-bold text-white">비기 전수 대상 선택</h3>
                            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                                <span className="text-emerald-400 font-bold">'{skillTargetPicker.skillName}'</span> 기술을 전수받을 대상을 선택하세요.
                            </p>
                        </div>

                        <div className="space-y-2 mb-5 max-h-[40vh] overflow-y-auto pr-1 custom-scrollbar">
                            {character.shinryokuType === "초화계" && (
                                <button 
                                    onClick={() => confirmLearnElfSkill('player')}
                                    className="w-full p-3.5 rounded-2xl bg-slate-950 border border-slate-800 hover:border-emerald-500 flex justify-between items-center group transition-all active:scale-95"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 bg-slate-900 rounded-xl flex items-center justify-center border border-slate-800 group-hover:border-emerald-500/50">
                                            <User size={18} className="text-slate-400 group-hover:text-emerald-400"/>
                                        </div>
                                        <div className="text-left">
                                            <div className="font-bold text-xs sm:text-sm text-slate-200">{character.name} (나)</div>
                                            <div className="text-[10px] text-slate-400">{character.shinryokuType}</div>
                                        </div>
                                    </div>
                                    <ChevronRight size={15} className="text-slate-500 group-hover:text-emerald-400"/>
                                </button>
                            )}

                            {character.companions.filter(c => c.shinryokuType === "초화계").map(comp => (
                                <button 
                                    key={comp.id}
                                    onClick={() => confirmLearnElfSkill(comp.id)}
                                    className="w-full p-3.5 rounded-2xl bg-slate-950 border border-slate-800 hover:border-emerald-500 flex justify-between items-center group transition-all active:scale-95"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 bg-slate-900 rounded-xl flex items-center justify-center border border-slate-800 group-hover:border-emerald-500/50">
                                            <Users size={18} className="text-slate-400 group-hover:text-emerald-400"/>
                                        </div>
                                        <div className="text-left">
                                            <div className="font-bold text-xs sm:text-sm text-slate-200">{comp.name}</div>
                                            <div className="text-[10px] text-slate-400">{comp.shinryokuType}</div>
                                        </div>
                                    </div>
                                    <ChevronRight size={15} className="text-slate-500 group-hover:text-emerald-400"/>
                                </button>
                            ))}
                            
                            {character.shinryokuType !== "초화계" && 
                             character.companions.filter(c => c.shinryokuType === "초화계").length === 0 && (
                                <div className="py-8 text-center text-slate-400 text-xs italic">
                                    전수 가능한 대상이 없습니다.
                                </div>
                            )}
                        </div>

                        <button onClick={() => setSkillTargetPicker(null)} className="w-full py-3 bg-slate-800 text-slate-300 rounded-xl text-xs font-bold hover:bg-slate-700 transition-colors active:scale-95">취소</button>
                    </div>
                </div>
            )}

            {/* 목재 공급 계약 설정 모달 */}
            {isWoodContractModalOpen && (
                <div className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
                    <div className="bg-slate-900 border border-emerald-500/50 rounded-3xl p-4 sm:p-6 w-full max-w-md shadow-2xl flex flex-col max-h-[92vh] overflow-y-auto custom-scrollbar">
                        {/* 모달 헤더 */}
                        <div className="flex items-center justify-between border-b border-emerald-900/40 pb-3 mb-4">
                            <div className="flex items-center gap-2.5">
                                <div className="w-9 h-9 rounded-2xl bg-emerald-950/80 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
                                    <Trees size={18} />
                                </div>
                                <div>
                                    <h3 className="text-base sm:text-lg font-bold text-white">목재 독점 공급 계약</h3>
                                    <p className="text-[11px] text-emerald-300/80">엘프 성역 정기 목재 납품 계약</p>
                                </div>
                            </div>
                            <button 
                                onClick={() => setIsWoodContractModalOpen(false)}
                                className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* 계약 안내 설명 */}
                        <p className="text-xs text-slate-300 leading-relaxed bg-emerald-950/40 p-3 rounded-2xl border border-emerald-900/40 mb-4">
                            엘프 숲연합과 30일간의 목재 정기 공급 계약을 체결합니다. 기본 평판 30점 외에 <strong className="text-emerald-300">추가 평판</strong>을 투입하여 일일 공급량을 대폭 늘릴 수 있습니다.
                        </p>

                        {/* 평판 투입 설정 컨트롤 */}
                        <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 mb-4 space-y-3">
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-slate-400 font-bold">추가 투입 평판</span>
                                <span className="text-emerald-400 font-bold font-mono text-sm">+{extraReputation}점</span>
                            </div>

                            {/* 증감 버튼 및 입력 */}
                            <div className="flex items-center justify-center gap-2 sm:gap-3">
                                <button
                                    onClick={() => setExtraReputation(prev => Math.max(0, prev - 10))}
                                    className="px-2.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition-all active:scale-95 border border-slate-700 min-h-[44px]"
                                >
                                    -10
                                </button>
                                <button
                                    onClick={() => setExtraReputation(prev => Math.max(0, prev - 1))}
                                    className="w-11 h-11 flex items-center justify-center bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-sm font-bold transition-all active:scale-95 border border-slate-700 min-h-[44px]"
                                >
                                    <Minus size={16} />
                                </button>
                                <div className="flex-1 text-center py-2 px-2 bg-slate-900 rounded-xl border border-emerald-500/30 min-h-[44px] flex flex-col justify-center">
                                    <div className="text-xl sm:text-2xl font-black font-mono text-emerald-300">+{extraReputation}</div>
                                    <div className="text-[10px] text-slate-400 font-medium">추가분</div>
                                </div>
                                <button
                                    onClick={() => {
                                        const maxExtra = Math.max(0, elfRep - 30);
                                        setExtraReputation(prev => Math.min(maxExtra, prev + 1));
                                    }}
                                    className="w-11 h-11 flex items-center justify-center bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-sm font-bold transition-all active:scale-95 border border-slate-700 min-h-[44px]"
                                >
                                    <Plus size={16} />
                                </button>
                                <button
                                    onClick={() => {
                                        const maxExtra = Math.max(0, elfRep - 30);
                                        setExtraReputation(prev => Math.min(maxExtra, prev + 10));
                                    }}
                                    className="px-2.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition-all active:scale-95 border border-slate-700 min-h-[44px]"
                                >
                                    +10
                                </button>
                            </div>

                            {/* 슬라이더 및 빠른 조작 버튼 */}
                            <div className="space-y-2 pt-1">
                                <input
                                    type="range"
                                    min="0"
                                    max={Math.max(0, elfRep - 30)}
                                    value={extraReputation}
                                    onChange={(e) => setExtraReputation(Number(e.target.value))}
                                    className="w-full accent-emerald-500 h-2 bg-slate-800 rounded-lg cursor-pointer"
                                />
                                <div className="flex justify-between items-center gap-2">
                                    <button
                                        onClick={() => setExtraReputation(0)}
                                        className="px-2.5 py-1 text-[11px] bg-slate-900 hover:bg-slate-800 text-slate-400 rounded-lg border border-slate-800 transition-colors font-medium"
                                    >
                                        기본 (0)
                                    </button>
                                    <span className="text-[10px] text-slate-400 font-mono">
                                        보유 평판: {elfRep}점
                                    </span>
                                    <button
                                        onClick={() => setExtraReputation(Math.max(0, elfRep - 30))}
                                        className="px-2.5 py-1 text-[11px] bg-emerald-950/60 hover:bg-emerald-900/60 text-emerald-300 rounded-lg border border-emerald-800/40 transition-colors font-bold"
                                    >
                                        최대치 (+{Math.max(0, elfRep - 30)})
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* 계약 혜택 및 정산 미리보기 카드 */}
                        <div className="bg-slate-950 p-3.5 rounded-2xl border border-emerald-500/30 mb-5 space-y-2">
                            <div className="flex justify-between items-center text-xs text-slate-300">
                                <span>총 소모 평판</span>
                                <span className="font-mono text-slate-100 font-bold">기본 30 + 추가 {extraReputation} = <span className="text-emerald-400">{30 + extraReputation}점</span></span>
                            </div>
                            <div className="flex justify-between items-center text-xs text-slate-300">
                                <span>계약 유지 기간</span>
                                <span className="font-mono text-slate-200">30일</span>
                            </div>
                            <div className="flex justify-between items-center text-xs text-slate-300">
                                <span>일일 기지 배송량</span>
                                <span className="font-mono text-emerald-400 font-bold">매일 +{30 + extraReputation}개</span>
                            </div>
                            <div className="flex justify-between items-center text-sm font-bold text-white pt-2 border-t border-slate-800">
                                <span className="flex items-center gap-1.5">
                                    <Trees size={15} className="text-emerald-400" />
                                    <span>30일간 총 공급량</span>
                                </span>
                                <span className="text-emerald-400 font-mono font-black text-base">
                                    +{((30 + extraReputation) * 30).toLocaleString()}개
                                </span>
                            </div>
                        </div>

                        {/* 하단 버튼 */}
                        <div className="flex gap-2.5">
                            <button
                                onClick={() => setIsWoodContractModalOpen(false)}
                                className="flex-1 py-3 bg-slate-800 text-slate-300 rounded-xl text-xs font-bold hover:bg-slate-700 transition-colors min-h-[44px]"
                            >
                                취소
                            </button>
                            <button
                                onClick={handleConfirmWoodContract}
                                disabled={elfRep < (30 + extraReputation)}
                                className="flex-[2] py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-900/40 transform active:scale-95 transition-all flex items-center justify-center gap-1.5 min-h-[44px]"
                            >
                                <CheckCircle size={15} />
                                <span>계약 체결하기</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="bg-slate-900 border border-emerald-500/40 w-full max-w-4xl h-[92vh] sm:h-[86vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden relative">
                
                {/* 헤더 */}
                <div className="p-3.5 sm:p-5 border-b border-emerald-900/30 bg-emerald-950/30 flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-emerald-900/40 border border-emerald-500/40 flex items-center justify-center shrink-0">
                            <Trees size={22} className="text-emerald-400" />
                        </div>
                        <div>
                            <h2 className="text-base sm:text-xl font-bold text-white tracking-wide">엘프 성역</h2>
                            <p className="text-xs text-emerald-300/80">{loc.nation} • {loc.city}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-3">
                        <div className="bg-emerald-900/40 px-3 py-1 rounded-full border border-emerald-500/30 flex items-center gap-1.5">
                            <Heart size={13} className={elfRep >= 0 ? "text-emerald-400 fill-emerald-400" : "text-slate-400"}/>
                            <span className="text-xs font-bold text-emerald-100">평판: {elfRep}</span>
                        </div>
                        <button onClick={onClose} className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-slate-800 transition-colors"><X size={18} /></button>
                    </div>
                </div>

                {/* 탭 네비게이션 */}
                <div className="grid grid-cols-4 border-b border-slate-800 bg-slate-950 shrink-0">
                    <button onClick={() => setActiveTab('audience')} className={`py-3 text-xs font-bold flex items-center justify-center transition-all border-b-2 ${activeTab === 'audience' ? 'text-emerald-400 border-emerald-500 bg-slate-900/80' : 'text-slate-400 border-transparent hover:text-slate-200'}`}>
                        <Crown size={14} className="mr-1 hidden sm:inline shrink-0"/> 알현 및 임무
                    </button>
                    <button onClick={() => setActiveTab('recruits')} className={`py-3 text-xs font-bold flex items-center justify-center transition-all border-b-2 ${activeTab === 'recruits' ? 'text-emerald-400 border-emerald-500 bg-slate-900/80' : 'text-slate-400 border-transparent hover:text-slate-200'}`}>
                        <Users size={14} className="mr-1 hidden sm:inline shrink-0"/> 전사 영입
                    </button>
                    <button onClick={() => setActiveTab('shop')} className={`py-3 text-xs font-bold flex items-center justify-center transition-all border-b-2 ${activeTab === 'shop' ? 'text-emerald-400 border-emerald-500 bg-slate-900/80' : 'text-slate-400 border-transparent hover:text-slate-200'}`}>
                        <ShoppingBag size={14} className="mr-1 hidden sm:inline shrink-0"/> 엘프 상점
                    </button>
                    <button onClick={() => setActiveTab('skills')} className={`py-3 text-xs font-bold flex items-center justify-center transition-all border-b-2 ${activeTab === 'skills' ? 'text-emerald-400 border-emerald-500 bg-slate-900/80' : 'text-slate-400 border-transparent hover:text-slate-200'}`}>
                        <BookOpen size={14} className="mr-1 hidden sm:inline shrink-0"/> 숲의 비기
                    </button>
                </div>

                {/* 메인 컨텐츠 영역 */}
                <div className="flex-1 overflow-y-auto p-3 sm:p-5 bg-slate-900 custom-scrollbar">
                    {activeTab === 'audience' && (
                        <div className="max-w-3xl mx-auto space-y-4 sm:space-y-5">
                            <div className="flex flex-col sm:flex-row gap-4 sm:gap-5 items-center bg-slate-950/70 p-4 sm:p-5 rounded-2xl border border-emerald-500/20 shadow-sm">
                                <div className="w-18 h-18 sm:w-22 sm:h-22 rounded-2xl bg-emerald-900/20 border border-emerald-500/40 flex items-center justify-center shrink-0 p-2">
                                    <span className="text-4xl sm:text-5xl">{isCapital ? '🧝‍♀️' : '🧙‍♂️'}</span>
                                </div>
                                <div className="text-center sm:text-left flex-1">
                                    <h3 className="text-base sm:text-lg font-bold text-emerald-100 mb-1">{leaderTitle}</h3>
                                    <p className="text-xs text-slate-300 leading-relaxed mb-3">"그대의 영혼에 깃든 신성이 자연을 향해 있다면, 우리는 언제나 환영할 준비가 되어 있네."</p>
                                    <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                                        <button onClick={handleDestroyNature} className="text-xs px-3 py-1.5 bg-red-950/40 text-red-300 border border-red-800/50 rounded-xl hover:bg-red-900/40 flex items-center transition-all active:scale-95">
                                            <AlertTriangle size={13} className="mr-1 text-red-400"/> 숲 개간
                                        </button>
                                        <button 
                                            onClick={handleWoodContract} 
                                            className={`text-xs px-3 py-1.5 rounded-xl border flex items-center transition-all active:scale-95 ${
                                                isWoodContractActive 
                                                    ? 'bg-emerald-900/60 text-emerald-200 border-emerald-500/50' 
                                                    : 'bg-emerald-900/40 text-emerald-200 border-emerald-700/50 hover:bg-emerald-800/40'
                                            }`}
                                        >
                                            {isWoodContractActive ? (
                                                <><Clock size={13} className="mr-1 text-emerald-400"/> 목재 공급 계약 진행 중 (매일 +{character.elfWoodDailySupply || 30}개 | 만료: {character.elfWoodContractEndDate})</>
                                            ) : (
                                                <><TreePine size={13} className="mr-1 text-emerald-400"/> 목재 정기 공급 계약 (평판 30+추가 투입)</>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <div className="flex justify-between items-center px-1">
                                    <h4 className="text-xs sm:text-sm font-bold text-slate-200 flex items-center">
                                        <ScrollText size={15} className="mr-1.5 text-emerald-400"/> 성역 정화 임무
                                    </h4>
                                    <button onClick={() => handleRefreshQuests()} disabled={isQuestLoading} className="text-xs flex items-center gap-1 px-2.5 py-1.5 bg-emerald-950/50 hover:bg-emerald-900/50 text-emerald-300 border border-emerald-700/40 rounded-xl transition-all">
                                        {isQuestLoading ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />} 목록 갱신
                                    </button>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {availableElfQuests.map(quest => (
                                        <div key={quest.id} className="bg-slate-950/80 p-4 rounded-2xl border border-emerald-900/40 hover:border-emerald-500/50 transition-all flex flex-col justify-between shadow-sm">
                                            <div>
                                                <div className="flex justify-between items-start mb-1.5 gap-2">
                                                    <h5 className="font-bold text-emerald-100 text-xs sm:text-sm">{quest.title}</h5>
                                                    <span className="text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-800/60 px-2 py-0.5 rounded-full shrink-0 font-bold">정화</span>
                                                </div>
                                                <p className="text-xs text-slate-400 mb-2 line-clamp-2 leading-relaxed">{quest.details}</p>
                                                <div className="bg-slate-900 p-2 rounded-xl mb-2 border border-slate-800 text-xs text-emerald-300 font-bold flex items-center">
                                                    <Sword size={12} className="mr-1.5 text-emerald-400 shrink-0"/> {quest.goal}
                                                </div>
                                            </div>
                                            <div>
                                                <div className="flex justify-between text-xs text-slate-400 mb-2 font-mono">
                                                    <span>평판: +{quest.rewardElfRep}</span>
                                                    <span className="text-amber-400 font-bold">{quest.rewardGold.toLocaleString()} G</span>
                                                </div>
                                                <button onClick={() => handleAcceptQuest(quest)} className="w-full py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl font-bold text-xs transition-all active:scale-95 shadow-sm">
                                                    임무 수락
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                    {availableElfQuests.length === 0 && (
                                        <div className="col-span-full py-10 text-center text-slate-400 text-xs border border-dashed border-slate-800 rounded-2xl">
                                            현재 수주 가능한 성역 임무가 없습니다. [목록 갱신]을 눌러주세요.
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'recruits' && (
                        <div className="space-y-3 sm:space-y-4">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 bg-slate-950/70 p-3.5 rounded-2xl border border-emerald-900/30">
                                <div>
                                    <h3 className="text-sm sm:text-base font-bold text-emerald-100 flex items-center">
                                        <UserPlus size={16} className="mr-1.5 text-emerald-400"/> 숲의 전사 영입
                                    </h3>
                                    <p className="text-xs text-slate-400 mt-0.5">엘프들은 당신의 헌신과 평판을 보고 합류를 결정합니다.</p>
                                </div>
                                <button onClick={() => generateElves()} disabled={isLoading} className="text-xs bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-emerald-300 px-3 py-1.5 rounded-xl flex items-center transition-all shrink-0">
                                    <RefreshCw size={12} className={`mr-1.5 ${isLoading ? 'animate-spin' : ''}`}/> {lastRecruitRefresh === currentMonth ? '이번 달 갱신 완료' : '명단 갱신'}
                                </button>
                            </div>

                            {isLoading ? (
                                <div className="flex flex-col items-center justify-center py-16 text-emerald-400 space-y-2">
                                    <Loader2 size={32} className="animate-spin"/>
                                    <p className="font-mono text-xs text-slate-400">숲의 속삭임을 통해 인연을 찾는 중...</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {recruits.map(elf => (
                                        <div key={elf.id} className="bg-slate-950/80 p-4 rounded-2xl border border-emerald-900/40 hover:border-emerald-500/50 transition-all group flex flex-col justify-between shadow-sm">
                                            <div>
                                                <div className="flex items-center gap-3 mb-2.5">
                                                    <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center overflow-hidden shrink-0">
                                                        {elf.visualUrl ? (
                                                            <img 
                                                                src={elf.visualUrl} 
                                                                alt={elf.name} 
                                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                                                                referrerPolicy="no-referrer" 
                                                            />
                                                        ) : (
                                                            <span className="text-2xl">🧝</span>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <h4 className="font-bold text-slate-100 text-sm sm:text-base group-hover:text-emerald-300 transition-colors">{elf.name}</h4>
                                                        <div className="flex gap-1 items-center mt-1 flex-wrap">
                                                            <span className="text-[10px] text-amber-400 font-bold bg-amber-950/40 px-1.5 py-0.5 rounded border border-amber-800/40">Lv.{elf.level}</span>
                                                            <span className="text-[10px] text-emerald-300 font-bold bg-emerald-950/50 px-1.5 py-0.5 rounded border border-emerald-800/50">{elf.classType}</span>
                                                            <span className="text-[9px] text-emerald-400 font-bold bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-800/40">{elf.nation || '미르탈 숲연합'}</span>
                                                            {elf.combatStyle && COMBAT_STYLE_CONFIG[elf.combatStyle] && (
                                                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${COMBAT_STYLE_CONFIG[elf.combatStyle].bgColor} ${COMBAT_STYLE_CONFIG[elf.combatStyle].borderColor} ${COMBAT_STYLE_CONFIG[elf.combatStyle].color}`}>
                                                                    {COMBAT_STYLE_CONFIG[elf.combatStyle].label}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="bg-black/20 p-2.5 rounded-xl mb-2.5">
                                                    <p className="text-xs text-slate-400 italic line-clamp-2 leading-relaxed">"{elf.appearance}"</p>
                                                </div>
                                                <div className="grid grid-cols-3 gap-1.5 mb-3 bg-slate-900 p-2 rounded-xl text-center border border-slate-800">
                                                    <div className="flex flex-col"><span className="text-[9px] text-slate-400 font-bold uppercase">지능</span><span className="text-xs font-bold text-purple-400 font-mono">{elf.stats.int}</span></div>
                                                    <div className="flex flex-col border-x border-slate-800"><span className="text-[9px] text-slate-400 font-bold uppercase">지혜</span><span className="text-xs font-bold text-blue-400 font-mono">{elf.stats.wis}</span></div>
                                                    <div className="flex flex-col"><span className="text-[9px] text-slate-400 font-bold uppercase">민첩</span><span className="text-xs font-bold text-yellow-400 font-mono">{elf.stats.agi}</span></div>
                                                </div>
                                            </div>

                                            <button 
                                                onClick={() => handleRecruit(elf)}
                                                className={`w-full py-2.5 rounded-xl font-bold text-xs shadow-sm transition-all active:scale-95 ${elfRep >= 30 ? 'bg-emerald-700 hover:bg-emerald-600 text-white' : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'}`}
                                            >
                                                {elfRep >= 30 ? "영입 제안" : "신뢰 부족 (평판 30 필요)"}
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                            {recruits.length === 0 && !isLoading && (
                                <div className="text-center py-12 text-slate-400 border border-dashed border-slate-800 rounded-2xl">
                                    <Users size={32} className="mx-auto mb-2 opacity-30"/>
                                    <p className="text-xs">현재 동행을 원하는 엘프가 없습니다.</p>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'shop' && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                            {ELF_SHOP_ITEMS.map((item, idx) => {
                                const isLocked = elfRep < item.req;
                                return (
                                    <div 
                                        key={idx} 
                                        className={`bg-slate-950/80 rounded-2xl border transition-all flex flex-col overflow-hidden text-left group ${isLocked ? 'opacity-40 border-slate-800 grayscale' : 'border-emerald-900/40 hover:border-emerald-500/50 shadow-sm'}`}
                                    >
                                        <div className="h-28 w-full bg-slate-900 border-b border-slate-800 relative overflow-hidden">
                                            <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover opacity-70 group-hover:opacity-95 transition-opacity" />
                                            <div className="absolute top-2 left-2">
                                                <span className="text-[10px] font-bold text-emerald-300 bg-emerald-950/90 px-2 py-0.5 rounded-full border border-emerald-500/30">{item.type}</span>
                                            </div>
                                            {isLocked && (
                                                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                                    <Lock size={20} className="text-red-400" />
                                                </div>
                                            )}
                                        </div>
                                        <div className="p-3.5 flex flex-col flex-1">
                                            <h4 className="font-bold text-slate-100 text-xs sm:text-sm mb-1">{item.name}</h4>
                                            <p className="text-xs text-slate-400 mb-3 flex-1 leading-relaxed">{item.desc}</p>
                                            <div className="flex justify-between items-center pt-2.5 border-t border-slate-800 mt-auto">
                                                <span className="text-amber-400 font-mono text-xs font-bold">{item.cost.toLocaleString()} G</span>
                                                <button 
                                                    onClick={() => !isLocked && setSelectedShopItem(item)}
                                                    disabled={isLocked}
                                                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${isLocked ? 'bg-slate-900 text-slate-600' : 'bg-emerald-700 text-white hover:bg-emerald-600 active:scale-95'}`}
                                                >
                                                    {isLocked ? `평판 ${item.req}` : '구매'}
                                                </button>
                                            </div>
                                        </div>
                                        {!isLocked && <ItemTooltip item={item as any} character={character} />}
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {activeTab === 'skills' && (
                        <div className="max-w-2xl mx-auto space-y-4">
                            <div className="bg-emerald-950/30 p-4 sm:p-5 rounded-2xl border border-emerald-500/30 text-center shadow-sm">
                                <h3 className="text-sm sm:text-base font-bold text-emerald-100 mb-1">숲의 비기 전수</h3>
                                <p className="text-xs text-slate-300 leading-relaxed">
                                    엘프 성역에 전해지는 고대 정령의 기술을 전수받습니다.<br/>
                                    일행 중 '초화계' 신력 능력을 가진 자만 학습할 수 있습니다.
                                </p>
                            </div>
                            
                            <div className="grid grid-cols-1 gap-3">
                                {[
                                    { name: "자연의 공명", desc: "영구적으로 제어력 10% 상승", req: 50 },
                                    { name: "생명의 숨결", desc: "턴마다 최대 체력 1% 추가 재생", req: 80 }
                                ].map((skill, idx) => {
                                    const isLocked = elfRep < skill.req;
                                    return (
                                        <div key={idx} className={`p-4 sm:p-5 rounded-2xl border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 transition-all ${isLocked ? 'bg-slate-950 border-slate-800 opacity-50' : 'bg-slate-950/80 border-emerald-500/40 shadow-md hover:border-emerald-500'}`}>
                                            <div className="flex-1">
                                                <h4 className="font-bold text-emerald-300 text-sm sm:text-base flex items-center gap-1.5">
                                                    {skill.name}
                                                    {!isLocked && <Sparkles size={13} className="text-amber-400"/>}
                                                </h4>
                                                <p className="text-xs text-slate-400 mt-0.5">{skill.desc}</p>
                                            </div>
                                            <button 
                                                onClick={() => handleOpenLearnPicker(skill.name, skill.desc)} 
                                                disabled={isLocked} 
                                                className={`w-full sm:w-auto px-5 py-2.5 rounded-xl font-bold text-xs shadow-sm transition-all active:scale-95 flex flex-col items-center justify-center ${isLocked ? 'bg-slate-900 text-slate-600' : 'bg-emerald-600 hover:bg-emerald-500 text-white'}`}
                                            >
                                                <span>{isLocked ? `평판 ${skill.req} 필요` : "비기 전수"}</span>
                                                {!isLocked && <span className="text-[10px] text-emerald-200 mt-0.5 opacity-80">(마정석 100 소모)</span>}
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                            
                            <div className="bg-slate-950/70 p-3.5 rounded-2xl border border-slate-800 text-xs text-slate-400 text-center">
                                <Info size={13} className="inline mr-1 text-emerald-400"/>
                                비기 전수에는 마정석 100개가 소모되며, 대상 대원의 신력 계통이 반드시 '초화계'여야 합니다.
                            </div>
                        </div>
                    )}
                </div>
                
                {/* 푸터 */}
                <div className="p-3 sm:p-4 bg-slate-950 border-t border-slate-800 flex justify-between items-center shrink-0">
                    <div className="flex gap-4 sm:gap-6 text-xs font-mono">
                        <div className="flex items-center text-amber-400"><Coins size={13} className="mr-1"/> {(character.money || 0).toLocaleString()} G</div>
                        <div className="flex items-center text-purple-400"><Zap size={13} className="mr-1"/> 마정석: {character.base?.resources.manaCrystal || 0}</div>
                    </div>
                    <button onClick={onClose} className="px-5 sm:px-6 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-bold text-xs transition-colors border border-slate-700">닫기</button>
                </div>
            </div>
        </div>
    );
};

export default ElfCityModal;
