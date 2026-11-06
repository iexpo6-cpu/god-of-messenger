import React, { useState, useEffect } from 'react';
import { CHARACTER_PRESETS } from '../appearance';
import { Character, Companion, Item, ClassTier, JobType, Stats, Quest, MercenaryRank, ItemRarity, SkillType, WeaponType } from '../types';
import { X, Gavel, Sparkles, UserPlus, Heart, MessageCircle, Loader2, Zap, CheckCircle, Info, Users, ChevronRight, RefreshCw, ScrollText, Skull, ShieldCheck, Crown, Sword, Target, ShoppingBag, BookOpen, Coins, Lock, UserCheck, Flame, Activity, User, Briefcase, Gem, Scale, AlertTriangle, UserMinus, Clock, Minus, Plus } from 'lucide-react';
import { generateName, generateCompanionStats, getTierByLevel, addDays, assignRandomCombatStyle, calculateInventorySize } from '../utils';
import { SHINRYOKU_TYPES_LIST, MAX_PARTY_SIZE, NATION_DATA, NATION_NAMES, COMBAT_STYLE_CONFIG, QUEST_RANK_INDEX, QUEST_DANGER_INDEX, HUMANOID_CLASSES, getHumanoidClassByTier } from '../constants';
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

type Tab = 'audience' | 'recruits' | 'shop' | 'slaves';

const RANK_ORDER: MercenaryRank[] = [
    MercenaryRank.F, MercenaryRank.E, MercenaryRank.D, MercenaryRank.C,
    MercenaryRank.B, MercenaryRank.A, MercenaryRank.S, MercenaryRank.SS, MercenaryRank.SSS
];

const DemonCityModal: React.FC<Props> = ({ character, onClose, onUpdateCharacter }) => {
    const [activeTab, setActiveTab] = useState<Tab>('audience');
    const [recruits, setRecruits] = useState<Companion[]>([]);
    const [slaves, setSlaves] = useState<Companion[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isQuestLoading, setIsQuestLoading] = useState(false);
    const [resultData, setResultData] = useState<ResultData | null>(null);
    
    // 구매 수량 선택 상태
    const [selectedBuyItem, setSelectedBuyItem] = useState<any | null>(null);
    const [buyQuantity, setBuyQuantity] = useState(1);

    // 마정석 계약 설정 모달 상태
    const [isMiningContractModalOpen, setIsMiningContractModalOpen] = useState(false);
    const [extraReputation, setExtraReputation] = useState<number>(0);

    const loc = character.currentLocation || { nation: '네크로디움 제국', city: '말피스' };
    const isCapital = loc.city === '말피스';
    
    const demonRep = character.demonReputation || 0;
    const currentMonth = character.currentDate?.substring(0, 7) || '2000-01';
    const lastRefresh = character.lastDemonQuestRefreshDate || '';
    const availableDemonQuests = character.availableDemonQuests || [];
    const lastRecruitRefresh = character.lastDemonRecruitRefreshDate || '';
    const availableDemonRecruits = character.availableDemonRecruits || [];
    const lastSlaveRefresh = character.lastDemonSlaveRefreshDate || '';
    const availableDemonSlaves = character.availableDemonSlaves || [];

    useEffect(() => {
        if (character.availableDemonRecruits) {
            setRecruits(character.availableDemonRecruits);
        }
    }, [character.availableDemonRecruits]);

    useEffect(() => {
        if (character.availableDemonSlaves) {
            setSlaves(character.availableDemonSlaves);
        }
    }, [character.availableDemonSlaves]);

    const isMiningContractActive = character.demonMiningContractEndDate && character.currentDate! < character.demonMiningContractEndDate;

    const DEMON_SHOP_ITEMS = [
        { name: "심연의 와인", type: "Consumable" as const, rarity: ItemRarity.RARE, cost: 20000, req: 20, description:"지능을 일시적으로 5% 상승시킵니다.", desc: "지능을 일시적으로 5% 상승시킵니다. (마인족의 정수)", secondaryOptions:["INT +5%(5턴)","MP +30% 회복"], imageUrl: "https://i.ibb.co/8DyqwH5x/Kakao-Talk-20260105-221438797-02.png" },
        { name: "마력의 정수", type: "Etc" as const, rarity: ItemRarity.UNIQUE, cost: 100000, req: 50, description:"강력한 마력의 정수.", desc: "강력한 마력의 정수이다.", imageUrl: "https://i.ibb.co/jkV1CtJy/Kakao-Talk-20260105-221438797-03.png" },
        { 
            name: "네크로디움 소드", 
            type: "Weapon" as const, 
            weaponType: 'Sword' as WeaponType,
            rarity: ItemRarity.UNIQUE, 
            cost: 1000000, 
            req: 70,
            description:"제국 정예 장교들이 사용하는 어둠의 검.", 
            desc: "제국 정예 장교들이 사용하는 어둠의 검.", 
            stats: { str: 100, int: 50 }, 
            secondaryOptions: ["마법 공격력 +10%", "물리 공격력 +15%", "암흑계 속성 부여"],
            imageUrl: "https://i.ibb.co/LXTw2Bmk/Kakao-Talk-20260105-221438797-01.png" 
        },
        { 
            name: "네크로디움 건", 
            type: "Weapon" as const, 
            weaponType: 'Firearm' as WeaponType,
            rarity: ItemRarity.UNIQUE, 
            cost: 1000000, 
            req: 70, 
            description:"제국 정예 장교들이 사용하는 어둠의 총.",
            desc: "제국 정예 장교들이 사용하는 어둠의 총.", 
            stats: { str: 100, int: 50 }, 
            secondaryOptions: ["마법 공격력 +15%", "물리 공격력 +10%", "암흑계 속성 부여"],
            imageUrl: "https://i.ibb.co/RTYRk0fm/Kakao-Talk-20260105-221438797.png" 
        },
        { 
            name: "마신의 심장석", 
            type: "Accessory" as const, 
            rarity: ItemRarity.LEGENDARY, 
            cost: 15000000, 
            req: 100, 
            description:"마인의 심장이라 불리는 고밀도 마력석.", 
            desc: "마인의 심장이라 불리는 고밀도 마력석.", 
            stats: { int: 200, ctrl: 100 }, 
            secondaryOptions: ["마법 공격력 +40%", "암흑계 속성 부여", "CTRL +50%"], 
            imageUrl: "https://i.ibb.co/1BzsCst/Kakao-Talk-20260105-221438797-04.png" 
        }
    ];

    const handleResultClose = () => {
        setResultData(null);
    };

    const handleRefreshQuests = async (force = false) => {
        if (!force && lastRefresh === currentMonth) {
            setResultData({
                type: 'info',
                title: '계약 갱신 불가',
                message: '마인 제국의 계약 목록은 한 달에 한 번만 갱신됩니다.',
                items: [{ label: '최근 갱신일', after: lastRefresh }]
            });
            return;
        }

        setIsQuestLoading(true);
        try {
            const theme = NATION_THEMES['네크로디움 제국'] || NATION_THEMES.default;
            
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
            const questCount = 4 + Math.floor(Math.random() * 3);

            for (let i = 0; i < questCount; i++) {
                const targetMonster = monsterPool[Math.floor(Math.random() * monsterPool.length)] || "제국의 반역자";
                const danger = dangerKeys[Math.floor(Math.random() * dangerKeys.length)];
                const count = Math.floor(Math.random() * 5) + 3;
                const questRank = RANK_ORDER[Math.max(0, Math.min(rankIdxNum, Math.floor(Math.random() * (rankIdxNum + 1))))];

                const rankMultiplier = QUEST_RANK_INDEX[questRank] || 800;
                const dangerMultiplier = QUEST_DANGER_INDEX[danger] || 1.0;

                const rewardExp = Math.floor(count * rankMultiplier * (2 + Math.random() * 0.35) * dangerMultiplier);
                const rewardGold = Math.floor(count * rankMultiplier * (4 + Math.random() * 2.5) * dangerMultiplier);
                const rewardDemonRep = 5 + Math.floor(Math.random() * 10);

                localQuests.push({
                    id: `demon_quest_${Date.now()}_${i}`,
                    type: 'Subjugation',
                    rank: questRank,
                    title: `[계약] ${targetMonster} 처단`,
                    goal: `${targetMonster} ${count}마리 처치`,
                    details: `제국의 질서를 어지럽히는 ${targetMonster}들을 처단하십시오. 이것은 제국 의회와의 엄중한 계약입니다.`,
                    danger: danger as 'Low' | 'Mid' | 'High' | 'Extreme',
                    rewardGold,
                    rewardExp,
                    rewardDemonRep,
                    currentAmount: 0,
                    targetAmount: count,
                    targetName: targetMonster
                });
            }
            
            const newChar = { ...character };
            newChar.availableDemonQuests = localQuests;
            newChar.lastDemonQuestRefreshDate = currentMonth;
            
            onUpdateCharacter(newChar, `[마인 제국] 제국 의회로부터 하달된 새로운 '어둠의 계약' 목록을 확인했습니다.`);
            setResultData({
                type: 'success',
                title: '계약 목록 갱신',
                message: '고위 마인들의 이권이 걸린 새로운 계약들이 게시되었습니다.',
                items: [{ label: '새로운 계약', after: `${localQuests.length}건` }]
            });
        } catch (e) {
            console.error(e);
        }
        setIsQuestLoading(false);
    };

    const generateDemons = async (force = false) => {
        if (!force && lastRecruitRefresh === currentMonth) {
            setResultData({
                type: 'info',
                title: '갱신 제한',
                message: '마인 용병 모집 명단은 한 달에 한 번만 갱신할 수 있습니다.\n다음 달에 새로운 용병들을 확인해주십시오.',
                items: [{ label: '최근 갱신일', after: lastRecruitRefresh || '기록 없음' }]
            });
            return;
        }

        setIsLoading(true);
        const newDemons: Companion[] = [];
        const repFactor = Math.max(0.5, 1 + (demonRep / 100));
        const sourceNation = "네크로디움 제국";
        
        const SHINRYOKU_MAP_LOCAL: Record<string, string> = {
            '태양': '광휘계', '화염': '화염계', '광휘': '광휘계', '월광': '암흑계', '전격': '전격계',
            '지령': '대지계', '질풍': '질풍계', '빙결': '빙결계', '해수': '해수계', '강철': '대지계',
            '암연': '암흑계', '초화': '초화계', '신체강화': '신체강화계', '무기강화': '무기강화계', '무': '일반'
        };

        for (let i = 0; i < 3; i++) {
            // 플레이어 레벨보다 무조건 낮게 설정하되, 최대 레벨 한계치는 250~300 사이 무작위 배치
            const maxCap = 250 + Math.floor(Math.random() * 51);
            const maxLevelAllowed = Math.max(1, Math.min(character.level - 1, maxCap));
            const minLevelAllowed = Math.max(1, Math.floor(maxLevelAllowed * 0.3));
            const finalLevel = Math.floor(minLevelAllowed + Math.random() * (maxLevelAllowed - minLevelAllowed + 1));
            const gender = Math.random() < 0.5 ? '남성' : '여성';
            const name = generateName(sourceNation, gender === '남성' ? 'male' : 'female');
            const tier = determineRecruitClassTier(finalLevel);

            const demonTypes = ["암흑계", "월광계", "빙결계", "화염계", "전격계"];
            const randomShinryoku = demonTypes[Math.floor(Math.random() * demonTypes.length)];
            const currentTierClass = tier !== ClassTier.NONE ? getHumanoidClassByTier(randomShinryoku, tier) : '마계 전사';
            const thematicClass = currentTierClass;

            const demonPresets = CHARACTER_PRESETS['마계'] || [];
            const genderPresets = demonPresets.filter(p => p.label.includes(gender));
            const randomPreset = genderPresets.length > 0 
                ? genderPresets[Math.floor(Math.random() * genderPresets.length)] 
                : demonPresets[Math.floor(Math.random() * demonPresets.length)];

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
                id: `demon_recruit_${Math.random().toString(36).substring(7)}`,
                name: `${name}`,
                age: `${100 + Math.floor(Math.random() * 900)}세`,
                gender: gender,
                race: '마인',
                nation: '네크로디움 제국',
                appearance: "창백한 피부와 보라색 안광, 화려한 귀족 예복을 입은 마인입니다.",
                personality: "냉철함",
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
                skills: [], equipment: {}, inventory: [], affection: 10 + (demonRep / 2), loyalty: 40,
                visualUrl: randomPreset?.url
            }, true, true);

            checkAndInitializeLiberationEligibility(recruitObj, 0);
            newDemons.push(recruitObj);
        }

        setRecruits(newDemons);

        const newChar = { ...character };
        newChar.availableDemonRecruits = newDemons;
        newChar.lastDemonRecruitRefreshDate = currentMonth;

        onUpdateCharacter(newChar, `[마인 제국] 마인 용병 모집 명단을 갱신했습니다.`);
        setResultData({
            type: 'success',
            title: '명단 갱신 완료',
            message: '새로운 마인 용병들이 모집 명단에 등록되었습니다.',
            items: [{ label: '모집 인원', after: `${newDemons.length}명` }]
        });
        setIsLoading(false);
    };

    const generateSlaves = async (force = false) => {
        if (!force && lastSlaveRefresh === currentMonth) {
            setResultData({
                type: 'info',
                title: '상품 갱신 제한',
                message: '제국 노예 시장의 상품 명단은 한 달에 한 번만 갱신할 수 있습니다.\n다음 달에 새로운 노예들을 확인해주십시오.',
                items: [{ label: '최근 갱신일', after: lastSlaveRefresh || '기록 없음' }]
            });
            return;
        }

        setIsLoading(true);
        const newSlaves: Companion[] = [];
        const races = ["인간", "인간", "수인", "엘프", "마인"];
        const genders = ["남성", "여성"];
        
        for (let i = 0; i < 4; i++) {
            const level = Math.floor(Math.random() * 29) + 1;
            const race = races[Math.floor(Math.random() * races.length)];
            const gender = genders[Math.floor(Math.random() * genders.length)];
            
            let nation = "없음";
            if (race === "인간") {
                nation = NATION_NAMES[Math.floor(Math.random() * NATION_NAMES.length)];
            } else if (race === "엘프") {
                nation = "미르탈 숲연합";
            } else if (race === "마인") {
                nation = "네크로디움 제국";
            } else if (race === "수인") {
                nation = "레오니스 투기국";
            }
            
            const name = generateName(nation, gender === '남성' ? 'male' : 'female'); 
            const price = level * 5000 + 20000;
            
            let raceKey = '기타';
            if (race === '엘프') raceKey = '엘프';
            else if (race === '마인') raceKey = '마계';
            else if (race === '수인') raceKey = '수인';
            else if (race === '인간') raceKey = '오세아니아';

            const racePresets = CHARACTER_PRESETS[raceKey as keyof typeof CHARACTER_PRESETS] || CHARACTER_PRESETS['기타'];
            const genderPresets = racePresets.filter(p => p.label.includes(gender));
            const randomPreset = genderPresets.length > 0 
                ? genderPresets[Math.floor(Math.random() * genderPresets.length)] 
                : racePresets[Math.floor(Math.random() * racePresets.length)];

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

            const slaveObj: Companion = {
                id: `slave_market_${Math.random().toString(36).substring(7)}`,
                name,
                age: `${15 + Math.floor(Math.random() * 15)}세`,
                gender,
                race,
                nation,
                appearance: `${race} 종족의 노예입니다. 쇠사슬에 묶여 있습니다.`,
                personality: "위축됨",
                classType: "노예",
                job: JobType.SLAVE, 
                level,
                currentExp: 0,
                maxExp: level * 100,
                statPoints: 0,
                classTier: ClassTier.NONE,
                stats: balancedStats,
                skills: [],
                equipment: {},
                inventory: [],
                affection: 0,
                loyalty: 10,
                purchasePrice: price,
                visualUrl: randomPreset?.url
            } as any;

            newSlaves.push(slaveObj);
        }
        setSlaves(newSlaves);

        const newChar = { ...character };
        newChar.availableDemonSlaves = newSlaves;
        newChar.lastDemonSlaveRefreshDate = currentMonth;

        onUpdateCharacter(newChar, `[마인 제국] 제국 노예 시장의 상품 명단을 갱신했습니다.`);
        if (!force) {
            setResultData({
                type: 'success',
                title: '명단 갱신 완료',
                message: '새로운 노예들이 시장으로 끌려와 명단에 등록되었습니다.',
                items: [{ label: '입고 인원', after: `${newSlaves.length}명` }]
            });
        }
        setIsLoading(false);
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
        newChar.availableDemonQuests = availableDemonQuests.filter(q => q.id !== quest.id);
        onUpdateCharacter(newChar, `[마인 계약] '${quest.title}' 계약을 체결했습니다.`);
        setResultData({ type: 'success', title: '계약 체결', message: `계약이 성립되었습니다.`, items: [{ label: '계약명', after: quest.title }] });
    };

    const handleRecruit = (demon: Companion) => {
        if (demonRep < 50) {
            setResultData({ type: 'warning', title: '신용 부족', message: `${demon.name}: "이익이 보장되지 않는 계약은 맺지 않는다."`, items: [{ label: '요구 신용도', after: '50 이상' }] });
            return;
        }
        if (character.companions.length >= MAX_PARTY_SIZE) { alert("파티가 가득 찼습니다."); return; }
        const newChar = { ...character };
        newChar.companions.push(assignRandomCombatStyle(demon, true, true));
        const updatedRecruits = (newChar.availableDemonRecruits || recruits).filter(r => r.id !== demon.id);
        newChar.availableDemonRecruits = updatedRecruits;
        setRecruits(updatedRecruits);
        onUpdateCharacter(newChar, `[마인 영입] ${demon.name}이(가) 당신과 어둠의 계약을 맺고 동료가 되었습니다.`);
        setResultData({ type: 'success', title: '계약 성립', message: `${demon.name}: "좋아, 당신의 야망에 내 힘을 빌려주지."`, items: [{ label: '종족', after: '마인' }] });
    };

    const handleBuySlave = (slave: Companion) => {
        const price = (slave as any).purchasePrice || 20000;
        if (character.money < price) {
            alert("골드가 부족합니다.");
            return;
        }

        const partyFull = character.companions.length >= MAX_PARTY_SIZE;
        const housingLevel = character.base?.facilityLevels?.['housing'] || 1;
        const baseCapacity = housingLevel * 20 + 20;
        const baseFull = (character.inactiveCompanions?.length || 0) >= baseCapacity;

        if (partyFull && baseFull) {
            alert("파티와 기지가 모두 가득 찼습니다.");
            return;
        }

        const newChar = { ...character };
        newChar.money -= price;
        newChar.infamy = (newChar.infamy || 0) + 5;
        
        const preppedSlave = assignRandomCombatStyle(slave, true, true);
        if (!partyFull) {
            newChar.companions.push(preppedSlave);
        } else {
            if (!newChar.inactiveCompanions) newChar.inactiveCompanions = [];
            newChar.inactiveCompanions.push(preppedSlave);
        }

        const updatedSlaves = (newChar.availableDemonSlaves || slaves).filter(s => s.id !== slave.id);
        newChar.availableDemonSlaves = updatedSlaves;
        setSlaves(updatedSlaves);
        onUpdateCharacter(newChar, `[노예 구매] ${price.toLocaleString()}G를 지불하고 ${slave.name}을(를) 소유하게 되었습니다.`);
        
        setResultData({
            type: 'success',
            title: '계약 완료',
            message: `이제 ${slave.name}은(는) 당신의 소유입니다.\n명령에 절대 복종할 것입니다.`,
            items: [
                { label: '구매 금액', after: `${price.toLocaleString()} G` },
                { label: '종족', after: slave.race }
            ]
        });
    };

    const handleMiningContract = () => {
        if (isMiningContractActive) {
            setResultData({
                type: 'info',
                title: '계약 유지 중',
                message: `이미 마정석 정기 공급 계약이 체결되어 매일 마정석 ${character.demonMiningDailySupply || 30}개씩 기지에 공급되고 있습니다.\n계약 만료 후 재계약이 가능합니다.`,
                items: [
                    { label: '일일 공급량', after: `매일 +${character.demonMiningDailySupply || 30}개` },
                    { label: '만료 예정일', after: character.demonMiningContractEndDate || '-' }
                ]
            });
            return;
        }

        if (demonRep < 30) {
            setResultData({
                type: 'warning',
                title: '신용도 부족',
                message: '마정석 공급 계약을 체결하려면 마인 신용도가 최소 30점 이상 필요합니다.\n마인 계약소의 의뢰를 수행하여 신용도를 높이십시오.',
                items: [
                    { label: '현재 신용도', after: `${demonRep}점` },
                    { label: '필요 신용도', after: '30점 이상' }
                ]
            });
            return;
        }

        setExtraReputation(0);
        setIsMiningContractModalOpen(true);
    };

    const handleConfirmMiningContract = () => {
        const baseCost = 30;
        const totalCostRep = baseCost + extraReputation;
        const dailyYield = baseCost + extraReputation;
        const totalYield = dailyYield * 30;
        const durationDays = 30;

        if (demonRep < totalCostRep) {
            alert("보유 신용도가 부족합니다.");
            return;
        }

        const newChar = { ...character };
        newChar.demonReputation = Math.max(-100, (newChar.demonReputation || 0) - totalCostRep);
        newChar.demonMiningDailySupply = dailyYield;
        newChar.demonMiningContractEndDate = addDays(character.currentDate || '2000-01-01', durationDays);
        newChar.infamy = (newChar.infamy || 0) + 3;

        onUpdateCharacter(newChar, `[마인 제국 마정석 계약] 신용도 ${totalCostRep}점을 지불하고 30일간 마정석 공급 계약을 체결했습니다. 매일 기지로 마정석 ${dailyYield}개가 배송됩니다. (30일 총 ${totalYield.toLocaleString()}개)`);

        setIsMiningContractModalOpen(false);

        setResultData({
            type: 'success',
            title: '마정석 공급 계약 체결',
            message: '마인 제국과의 30일간 마정석 정기 공급 계약이 체결되었습니다.\n매일 기지 창고로 마정석이 정기 배송되며, 일일 종합 보고서에서 수확 결과를 확인하실 수 있습니다.',
            items: [
                { label: '일일 기지 공급량', after: `매일 +${dailyYield}개` },
                { label: '30일 총 공급량', after: `총 ${totalYield.toLocaleString()}개` },
                { label: '소모 신용도', after: `-${totalCostRep}점` },
                { label: '계약 만료일', after: newChar.demonMiningContractEndDate }
            ]
        });
    };

    const handleBuyItemClick = (itemData: any) => {
        setSelectedBuyItem(itemData);
        setBuyQuantity(1);
    };

    const handleConfirmBuy = () => {
        if (!selectedBuyItem) return;
        
        const totalCost = selectedBuyItem.cost * buyQuantity;
        if (character.money < totalCost) {
            alert("골드가 부족합니다.");
            return;
        }

        const maxInventorySize = calculateInventorySize(character.stats);
        if (character.inventory.length + buyQuantity > maxInventorySize) {
            alert(`가방 공간이 부족합니다. (최대 ${maxInventorySize}개)`);
            return;
        }

        const newChar = { ...character };
        newChar.money -= totalCost;
        
        const newItem: Item = { 
            name: selectedBuyItem.name, 
            type: selectedBuyItem.type, 
            rarity: selectedBuyItem.rarity, 
            description: selectedBuyItem.desc, 
            stats: selectedBuyItem.stats, 
            weaponType: selectedBuyItem.weaponType, 
            secondaryOptions: selectedBuyItem.secondaryOptions, 
            enhancement: 0, 
            imageUrl: selectedBuyItem.imageUrl 
        };

        const addedItems = Array(buyQuantity).fill(newItem);
        newChar.inventory = [...newChar.inventory, ...addedItems];

        onUpdateCharacter(newChar, `[마인 상점] '${selectedBuyItem.name}' x${buyQuantity}개를 구매했습니다. (-${totalCost.toLocaleString()} G)`);
        
        setResultData({ 
            type: 'success', 
            title: '거래 완료', 
            message: `${selectedBuyItem.name} ${buyQuantity}개를 인도받았습니다.`, 
            items: [
                { label: '지불 금액', after: `${totalCost.toLocaleString()} G` },
                { label: '구매 수량', after: `${buyQuantity}개` }
            ] 
        });

        setSelectedBuyItem(null);
    };

    useEffect(() => {
        if (activeTab === 'slaves') {
            if (character.availableDemonSlaves && character.availableDemonSlaves.length > 0) {
                setSlaves(character.availableDemonSlaves);
            } else if (slaves.length === 0 && lastSlaveRefresh !== currentMonth) {
                generateSlaves(true);
            }
        }
    }, [activeTab]);

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/90 backdrop-blur-md p-2 sm:p-4">
            {resultData && <ActionResultModal data={resultData} onClose={handleResultClose} />}
            
            {/* 상점 수량 선택 오버레이 */}
            {selectedBuyItem && (
                <div className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-purple-500/50 rounded-3xl p-5 sm:p-6 w-full max-w-sm shadow-2xl">
                        <div className="text-center mb-5">
                            <h3 className="text-lg font-bold text-white mb-1">{selectedBuyItem.name}</h3>
                            <p className="text-xs text-purple-400/80">구매 수량을 선택하십시오.</p>
                        </div>

                        <div className="flex items-center justify-center gap-6 mb-5">
                            <button 
                                onClick={() => setBuyQuantity(prev => Math.max(1, prev - 1))}
                                className="w-11 h-11 flex items-center justify-center bg-slate-800 rounded-2xl hover:bg-slate-700 text-white border border-slate-700 active:scale-90 transition-transform"
                            >
                                <Minus size={18}/>
                            </button>
                            <div className="flex flex-col items-center min-w-[70px]">
                                <span className="text-3xl font-black font-mono text-purple-400">{buyQuantity}</span>
                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">수량</span>
                            </div>
                            <button 
                                onClick={() => {
                                    const maxAffordable = Math.floor(character.money / selectedBuyItem.cost);
                                    const maxSpace = calculateInventorySize(character.stats) - character.inventory.length;
                                    const limit = Math.min(maxAffordable, maxSpace, 99);
                                    if (buyQuantity < limit) setBuyQuantity(prev => prev + 1);
                                }}
                                className="w-11 h-11 flex items-center justify-center bg-slate-800 rounded-2xl hover:bg-slate-700 text-white border border-slate-700 active:scale-90 transition-transform"
                            >
                                <Plus size={18}/>
                            </button>
                        </div>

                        <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 mb-5 space-y-1.5">
                            <div className="flex justify-between items-center text-xs text-slate-400">
                                <span>단가</span>
                                <span className="font-mono text-slate-200">{selectedBuyItem.cost.toLocaleString()} G</span>
                            </div>
                            <div className="flex justify-between items-center text-sm font-bold text-white pt-2 border-t border-slate-800">
                                <span>총 결제 금액</span>
                                <span className="text-purple-400 font-mono">{(selectedBuyItem.cost * buyQuantity).toLocaleString()} G</span>
                            </div>
                        </div>

                        <div className="flex gap-2.5">
                            <button onClick={() => setSelectedBuyItem(null)} className="flex-1 py-3 bg-slate-800 text-slate-300 rounded-xl text-xs font-bold hover:bg-slate-700 transition-colors">취소</button>
                            <button onClick={handleConfirmBuy} className="flex-[2] py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold shadow-md shadow-purple-900/40 transform active:scale-95 transition-all">거래 확정</button>
                        </div>
                    </div>
                </div>
            )}

            {/* 마정석 공급 계약 설정 모달 */}
            {isMiningContractModalOpen && (
                <div className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
                    <div className="bg-slate-900 border border-purple-500/50 rounded-3xl p-4 sm:p-6 w-full max-w-md shadow-2xl flex flex-col max-h-[92vh] overflow-y-auto">
                        {/* 모달 헤더 */}
                        <div className="flex items-center justify-between border-b border-purple-900/40 pb-3 mb-4">
                            <div className="flex items-center gap-2.5">
                                <div className="w-9 h-9 rounded-2xl bg-purple-950/80 border border-purple-500/40 flex items-center justify-center text-purple-400 shrink-0">
                                    <Gem size={18} />
                                </div>
                                <div>
                                    <h3 className="text-base sm:text-lg font-bold text-white">마정석 독점 공급 계약</h3>
                                    <p className="text-[11px] text-purple-300/80">제국 의회 정기 채굴 납품 계약</p>
                                </div>
                            </div>
                            <button 
                                onClick={() => setIsMiningContractModalOpen(false)}
                                className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* 계약 안내 설명 */}
                        <p className="text-xs text-slate-300 leading-relaxed bg-purple-950/40 p-3 rounded-2xl border border-purple-900/40 mb-4">
                            마인 제국 의회와 30일간의 마정석 정기 공급 계약을 체결합니다. 기본 신용도 30점 외에 <strong className="text-purple-300">추가 신용도</strong>를 투입하여 일일 공급량을 대폭 늘릴 수 있습니다.
                        </p>

                        {/* 신용도 투입 설정 컨트롤 */}
                        <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 mb-4 space-y-3">
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-slate-400 font-bold">추가 투입 신용도</span>
                                <span className="text-purple-400 font-bold font-mono text-sm">+{extraReputation}점</span>
                            </div>

                            {/* 증감 버튼 및 입력 UI */}
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
                                <div className="flex-1 text-center py-2 px-2 bg-slate-900 rounded-xl border border-purple-500/30 min-h-[44px] flex flex-col justify-center">
                                    <div className="text-xl sm:text-2xl font-black font-mono text-purple-300">+{extraReputation}</div>
                                    <div className="text-[10px] text-slate-400 font-medium">추가분</div>
                                </div>
                                <button
                                    onClick={() => {
                                        const maxExtra = Math.max(0, demonRep - 30);
                                        setExtraReputation(prev => Math.min(maxExtra, prev + 1));
                                    }}
                                    className="w-11 h-11 flex items-center justify-center bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-sm font-bold transition-all active:scale-95 border border-slate-700 min-h-[44px]"
                                >
                                    <Plus size={16} />
                                </button>
                                <button
                                    onClick={() => {
                                        const maxExtra = Math.max(0, demonRep - 30);
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
                                    max={Math.max(0, demonRep - 30)}
                                    value={extraReputation}
                                    onChange={(e) => setExtraReputation(Number(e.target.value))}
                                    className="w-full accent-purple-500 h-2 bg-slate-800 rounded-lg cursor-pointer"
                                />
                                <div className="flex justify-between items-center gap-2">
                                    <button
                                        onClick={() => setExtraReputation(0)}
                                        className="px-2.5 py-1 text-[11px] bg-slate-900 hover:bg-slate-800 text-slate-400 rounded-lg border border-slate-800 transition-colors font-medium"
                                    >
                                        기본 (0)
                                    </button>
                                    <span className="text-[10px] text-slate-400 font-mono">
                                        보유 신용도: {demonRep}점
                                    </span>
                                    <button
                                        onClick={() => setExtraReputation(Math.max(0, demonRep - 30))}
                                        className="px-2.5 py-1 text-[11px] bg-purple-950/60 hover:bg-purple-900/60 text-purple-300 rounded-lg border border-purple-800/40 transition-colors font-bold"
                                    >
                                        최대치 (+{Math.max(0, demonRep - 30)})
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* 계약 혜택 및 정산 미리보기 카드 */}
                        <div className="bg-slate-950 p-3.5 rounded-2xl border border-purple-500/30 mb-5 space-y-2">
                            <div className="flex justify-between items-center text-xs text-slate-300">
                                <span>총 소모 신용도</span>
                                <span className="font-mono text-slate-100 font-bold">기본 30 + 추가 {extraReputation} = <span className="text-purple-400">{30 + extraReputation}점</span></span>
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
                                    <Gem size={15} className="text-fuchsia-400" />
                                    <span>30일간 총 공급량</span>
                                </span>
                                <span className="text-fuchsia-400 font-mono font-black text-base">
                                    +{((30 + extraReputation) * 30).toLocaleString()}개
                                </span>
                            </div>
                        </div>

                        {/* 하단 버튼 */}
                        <div className="flex gap-2.5">
                            <button
                                onClick={() => setIsMiningContractModalOpen(false)}
                                className="flex-1 py-3 bg-slate-800 text-slate-300 rounded-xl text-xs font-bold hover:bg-slate-700 transition-colors min-h-[44px]"
                            >
                                취소
                            </button>
                            <button
                                onClick={handleConfirmMiningContract}
                                disabled={demonRep < (30 + extraReputation)}
                                className="flex-[2] py-3 bg-purple-600 hover:bg-purple-500 disabled:bg-slate-800 disabled:text-slate-500 text-white rounded-xl text-xs font-bold shadow-md shadow-purple-900/40 transform active:scale-95 transition-all flex items-center justify-center gap-1.5 min-h-[44px]"
                            >
                                <CheckCircle size={15} />
                                <span>계약 체결하기</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="bg-slate-900 border border-purple-500/40 w-full max-w-4xl h-[92vh] sm:h-[86vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden relative">
                
                {/* 헤더 */}
                <div className="p-3.5 sm:p-5 border-b border-purple-900/30 bg-purple-950/30 flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-purple-900/40 border border-purple-500/40 flex items-center justify-center shrink-0">
                            <Gavel size={22} className="text-purple-400" />
                        </div>
                        <div>
                            <h2 className="text-base sm:text-xl font-bold text-white tracking-wide">마인 계약소</h2>
                            <p className="text-xs text-purple-300/80">{loc.nation} • {loc.city}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-3">
                        <div className="bg-purple-900/40 px-3 py-1 rounded-full border border-purple-500/30 flex items-center gap-1.5">
                            <Scale size={13} className="text-purple-400"/>
                            <span className="text-xs font-bold text-purple-100">신용도: {demonRep}</span>
                        </div>
                        <button onClick={onClose} className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-slate-800 transition-colors"><X size={18} /></button>
                    </div>
                </div>

                {/* 탭 네비게이션 */}
                <div className="grid grid-cols-4 border-b border-slate-800 bg-slate-950 shrink-0">
                    <button onClick={() => setActiveTab('audience')} className={`py-3 text-xs font-bold flex items-center justify-center transition-all border-b-2 ${activeTab === 'audience' ? 'text-purple-400 border-purple-500 bg-slate-900/80' : 'text-slate-400 border-transparent hover:text-slate-200'}`}>
                        <Crown size={14} className="mr-1 hidden sm:inline shrink-0"/> 제국 의회
                    </button>
                    <button onClick={() => setActiveTab('recruits')} className={`py-3 text-xs font-bold flex items-center justify-center transition-all border-b-2 ${activeTab === 'recruits' ? 'text-purple-400 border-purple-500 bg-slate-900/80' : 'text-slate-400 border-transparent hover:text-slate-200'}`}>
                        <Users size={14} className="mr-1 hidden sm:inline shrink-0"/> 마인 고용
                    </button>
                    <button onClick={() => setActiveTab('shop')} className={`py-3 text-xs font-bold flex items-center justify-center transition-all border-b-2 ${activeTab === 'shop' ? 'text-purple-400 border-purple-500 bg-slate-900/80' : 'text-slate-400 border-transparent hover:text-slate-200'}`}>
                        <ShoppingBag size={14} className="mr-1 hidden sm:inline shrink-0"/> 암시장
                    </button>
                    <button onClick={() => setActiveTab('slaves')} className={`py-3 text-xs font-bold flex items-center justify-center transition-all border-b-2 ${activeTab === 'slaves' ? 'text-purple-400 border-purple-500 bg-slate-900/80' : 'text-slate-400 border-transparent hover:text-slate-200'}`}>
                        <UserMinus size={14} className="mr-1 hidden sm:inline shrink-0"/> 노예 시장
                    </button>
                </div>

                {/* 메인 컨텐츠 영역 */}
                <div className="flex-1 overflow-y-auto p-3 sm:p-5 bg-slate-900 custom-scrollbar">
                    {activeTab === 'audience' && (
                        <div className="max-w-3xl mx-auto space-y-4 sm:space-y-5">
                            <div className="flex flex-col sm:flex-row gap-4 sm:gap-5 items-center bg-slate-950/70 p-4 sm:p-5 rounded-2xl border border-purple-500/20 shadow-sm">
                                <div className="w-18 h-18 sm:w-22 sm:h-22 rounded-2xl bg-purple-900/20 border border-purple-500/40 flex items-center justify-center shrink-0 p-2">
                                    <span className="text-4xl sm:text-5xl">🧛‍♂️</span>
                                </div>
                                <div className="text-center sm:text-left flex-1">
                                    <h3 className="text-base sm:text-lg font-bold text-purple-100 mb-1">제국 고위 의원</h3>
                                    <p className="text-xs text-slate-300 leading-relaxed mb-3">"공짜 점심은 없네. 그대에게 이익이 된다면, 우리에게도 그만한 대가를 지불하게."</p>
                                    <div className="flex flex-col gap-1.5">
                                        <button 
                                            onClick={handleMiningContract} 
                                            disabled={isMiningContractActive}
                                            className={`text-xs px-3.5 py-2.5 rounded-xl font-bold flex items-center justify-center transition-all border min-h-[44px] ${isMiningContractActive ? 'bg-slate-800 text-slate-400 border-slate-700 cursor-default' : 'bg-purple-900/50 text-purple-200 border-purple-600/60 hover:bg-purple-800/70 active:scale-95 shadow-md shadow-purple-950/50'}`}
                                        >
                                            {isMiningContractActive ? (
                                                <><Clock size={14} className="mr-1.5 text-purple-400"/> 마정석 공급 계약 진행 중 (매일 +{character.demonMiningDailySupply || 30}개 배송 | 만료: {character.demonMiningContractEndDate})</>
                                            ) : (
                                                <><Gem size={14} className="mr-1.5 text-fuchsia-400"/> 마정석 정기 공급 계약 (신용도 30+추가 투입)</>
                                            )}
                                        </button>
                                        {!isMiningContractActive ? (
                                            <p className="text-[10px] text-slate-400 text-center sm:text-left">* 계약 시 30일간 매일 기지로 (30+추가신용도)개의 마정석이 배송되며, 일일 종합 보고서에 기록됩니다.</p>
                                        ) : (
                                            <p className="text-[10px] text-purple-300/80 text-center sm:text-left">* 매일 기지 창고로 정제된 마정석이 배송 중입니다.</p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <div className="flex justify-between items-center px-1">
                                    <h4 className="text-xs sm:text-sm font-bold text-slate-200 flex items-center">
                                        <ScrollText size={15} className="mr-1.5 text-purple-400"/> 어둠의 계약 목록
                                    </h4>
                                    <button onClick={() => handleRefreshQuests()} disabled={isQuestLoading} className="text-xs flex items-center gap-1 px-2.5 py-1.5 bg-purple-950/50 hover:bg-purple-900/50 text-purple-300 border border-purple-700/40 rounded-xl transition-all">
                                        {isQuestLoading ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />} 목록 갱신
                                    </button>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {availableDemonQuests.map(quest => (
                                        <div key={quest.id} className="bg-slate-950/80 p-4 rounded-2xl border border-purple-900/40 hover:border-purple-500/50 transition-all flex flex-col justify-between shadow-sm">
                                            <div>
                                                <div className="flex justify-between items-start mb-1.5 gap-2">
                                                    <h5 className="font-bold text-purple-100 text-xs sm:text-sm">{quest.title}</h5>
                                                    <span className="text-[10px] bg-purple-950 text-purple-300 border border-purple-800/60 px-2 py-0.5 rounded-full shrink-0 font-bold">계약</span>
                                                </div>
                                                <p className="text-xs text-slate-400 mb-2 line-clamp-2 leading-relaxed">{quest.details}</p>
                                                <div className="bg-slate-900 p-2 rounded-xl mb-2 border border-slate-800 text-xs text-purple-300 font-bold flex items-center">
                                                    <Target size={12} className="mr-1.5 text-purple-400 shrink-0"/> {quest.goal}
                                                </div>
                                            </div>
                                            <div>
                                                <div className="flex justify-between text-xs text-slate-400 mb-2 font-mono">
                                                    <span>신용도: +{quest.rewardDemonRep}</span>
                                                    <span className="text-amber-400 font-bold">{quest.rewardGold.toLocaleString()} G</span>
                                                </div>
                                                <button onClick={() => handleAcceptQuest(quest)} className="w-full py-2 bg-purple-700 hover:bg-purple-600 text-white rounded-xl font-bold text-xs transition-all active:scale-95 shadow-sm">
                                                    계약 체결
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                    {availableDemonQuests.length === 0 && (
                                        <div className="col-span-full py-10 text-center text-slate-400 text-xs border border-dashed border-slate-800 rounded-2xl">
                                            현재 체결 가능한 제국 계약이 없습니다. [목록 갱신]을 눌러주세요.
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'recruits' && (
                        <div className="space-y-3 sm:space-y-4">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 bg-slate-950/70 p-3.5 rounded-2xl border border-purple-900/30">
                                <div>
                                    <h3 className="text-sm sm:text-base font-bold text-purple-100 flex items-center">
                                        <UserPlus size={16} className="mr-1.5 text-purple-400"/> 제국 용병 고용
                                    </h3>
                                    <p className="text-xs text-slate-400 mt-0.5">고위 마인들은 오직 자신들에게 이익이 되는 자와만 계약합니다.</p>
                                </div>
                                <button onClick={() => generateDemons()} disabled={isLoading} className="text-xs bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-purple-300 px-3 py-1.5 rounded-xl flex items-center transition-all shrink-0">
                                    <RefreshCw size={12} className={`mr-1.5 ${isLoading ? 'animate-spin' : ''}`}/> {lastRecruitRefresh === currentMonth ? '이번 달 갱신 완료' : '명단 갱신'}
                                </button>
                            </div>

                            {isLoading ? (
                                <div className="flex flex-col items-center justify-center py-16 text-purple-400 space-y-2">
                                    <Loader2 size={32} className="animate-spin"/>
                                    <p className="font-mono text-xs text-slate-400">제국의 실력자들을 물색하는 중...</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {recruits.map(demon => (
                                        <div key={demon.id} className="bg-slate-950/80 p-4 rounded-2xl border border-purple-900/40 hover:border-purple-500/50 transition-all group flex flex-col justify-between shadow-sm">
                                            <div>
                                                <div className="flex items-center gap-3 mb-2.5">
                                                    <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center overflow-hidden shrink-0">
                                                        {demon.visualUrl ? (
                                                            <img 
                                                                src={demon.visualUrl} 
                                                                alt={demon.name} 
                                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                                                                referrerPolicy="no-referrer" 
                                                            />
                                                        ) : (
                                                            <span className="text-2xl">😈</span>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <h4 className="font-bold text-slate-100 text-sm sm:text-base group-hover:text-purple-300 transition-colors">{demon.name}</h4>
                                                        <div className="flex gap-1 items-center mt-1 flex-wrap">
                                                            <span className="text-[10px] text-amber-400 font-bold bg-amber-950/40 px-1.5 py-0.5 rounded border border-amber-800/40">Lv.{demon.level}</span>
                                                            <span className="text-[10px] text-purple-300 font-bold bg-purple-950/50 px-1.5 py-0.5 rounded border border-purple-800/50">{demon.classType}</span>
                                                            <span className="text-[9px] text-purple-400 font-bold bg-purple-950/40 px-1.5 py-0.5 rounded border border-purple-800/40">{demon.nation || '네크로디움 제국'}</span>
                                                            {demon.combatStyle && COMBAT_STYLE_CONFIG[demon.combatStyle] && (
                                                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${COMBAT_STYLE_CONFIG[demon.combatStyle].bgColor} ${COMBAT_STYLE_CONFIG[demon.combatStyle].borderColor} ${COMBAT_STYLE_CONFIG[demon.combatStyle].color}`}>
                                                                    {COMBAT_STYLE_CONFIG[demon.combatStyle].label}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="bg-black/20 p-2.5 rounded-xl mb-2.5">
                                                    <p className="text-xs text-slate-400 italic line-clamp-2 leading-relaxed">"{demon.appearance}"</p>
                                                </div>
                                                <div className="grid grid-cols-3 gap-1.5 mb-3 bg-slate-900 p-2 rounded-xl text-center border border-slate-800">
                                                    <div className="flex flex-col"><span className="text-[9px] text-slate-400 font-bold uppercase">지능</span><span className="text-xs font-bold text-purple-400 font-mono">{demon.stats.int}</span></div>
                                                    <div className="flex flex-col border-x border-slate-800"><span className="text-[9px] text-slate-400 font-bold uppercase">민첩</span><span className="text-xs font-bold text-yellow-400 font-mono">{demon.stats.agi}</span></div>
                                                    <div className="flex flex-col"><span className="text-[9px] text-slate-400 font-bold uppercase">제어</span><span className="text-xs font-bold text-cyan-400 font-mono">{demon.stats.ctrl}</span></div>
                                                </div>
                                            </div>

                                            <button 
                                                onClick={() => handleRecruit(demon)}
                                                className={`w-full py-2.5 rounded-xl font-bold text-xs shadow-sm transition-all active:scale-95 ${demonRep >= 50 ? 'bg-purple-700 hover:bg-purple-600 text-white' : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'}`}
                                            >
                                                {demonRep >= 50 ? "계약 제안" : "자격 부족 (신용도 50 필요)"}
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                            {recruits.length === 0 && !isLoading && (
                                <div className="text-center py-12 text-slate-400 border border-dashed border-slate-800 rounded-2xl">
                                    <Users size={32} className="mx-auto mb-2 opacity-30"/>
                                    <p className="text-xs">현재 계약 가능한 마인 용병이 없습니다.</p>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'slaves' && (
                        <div className="space-y-3 sm:space-y-4">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-slate-950/70 p-4 rounded-2xl border border-purple-900/30">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-2xl bg-red-950/30 border border-red-900/50 flex items-center justify-center shrink-0">
                                        <UserMinus size={24} className="text-red-400" />
                                    </div>
                                    <div>
                                        <h3 className="text-sm sm:text-base font-bold text-white">제국 노예 시장</h3>
                                        <p className="text-xs text-slate-400">"돈만 있다면 무엇이든 소유할 수 있지."</p>
                                        <div className="mt-0.5">
                                            {demonRep < 50 ? (
                                                <span className="text-[10px] text-red-400 font-bold flex items-center gap-1">
                                                    <AlertTriangle size={11}/> 신용도 50 이상 필요
                                                </span>
                                            ) : (
                                                <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                                                    <CheckCircle size={11}/> 거래 자격 획득
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => generateSlaves(false)} 
                                    disabled={isLoading || demonRep < 50} 
                                    className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all disabled:opacity-30 shrink-0"
                                >
                                    <RefreshCw size={12} className={isLoading ? 'animate-spin' : ''}/> {lastSlaveRefresh === currentMonth ? '이번 달 갱신 완료' : '상품 명단 갱신'}
                                </button>
                            </div>

                            {demonRep >= 50 ? (
                                isLoading ? (
                                    <div className="py-16 flex flex-col items-center justify-center gap-2 text-purple-400">
                                        <Loader2 size={32} className="animate-spin"/>
                                        <p className="text-xs text-slate-400 font-mono">새로운 노예들을 시장으로 끌어오는 중...</p>
                                    </div>
                                ) : slaves.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-16 text-slate-500 bg-slate-950/40 rounded-2xl border border-dashed border-slate-800">
                                        <UserMinus size={32} className="mb-2 opacity-30 text-red-400"/>
                                        <p className="text-sm font-bold text-slate-300">현재 입고된 노예가 없습니다</p>
                                        <p className="text-xs mt-0.5 text-slate-500">모든 노예가 매진되었거나 아직 새로운 포로가 압송되지 않았습니다.</p>
                                        <p className="text-[11px] text-amber-500/80 mt-1 font-mono">
                                            {lastSlaveRefresh === currentMonth ? '다음 달에 상품 명단이 갱신됩니다.' : '상단의 [상품 명단 갱신]을 눌러 새로운 노예를 확인하십시오.'}
                                        </p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {slaves.map(slave => (
                                            <div key={slave.id} className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800 hover:border-red-900/50 transition-all group flex flex-col justify-between shadow-sm">
                                                <div>
                                                    <div className="flex justify-between items-start mb-2.5">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center overflow-hidden shrink-0">
                                                                {slave.visualUrl ? (
                                                                    <img 
                                                                        src={slave.visualUrl} 
                                                                        alt={slave.name} 
                                                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                                                                        referrerPolicy="no-referrer" 
                                                                    />
                                                                ) : (
                                                                    <User size={24} className="text-slate-500" />
                                                                )}
                                                            </div>
                                                            <div>
                                                                <h4 className="font-bold text-slate-100 text-sm sm:text-base">{slave.name}</h4>
                                                                <div className="flex gap-1 items-center text-xs mt-0.5">
                                                                    <span className="text-amber-400 font-bold">Lv.{slave.level}</span>
                                                                    <span className="text-slate-600">•</span>
                                                                    <span className="text-slate-400">{slave.race}</span>
                                                                    {slave.nation && slave.nation !== "없음" && (
                                                                        <>
                                                                            <span className="text-slate-600">•</span>
                                                                            <span className="text-blue-400">{slave.nation}</span>
                                                                        </>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            <span className="text-[9px] text-slate-500 uppercase font-bold block">가격</span>
                                                            <span className="text-sm sm:text-base font-mono font-bold text-amber-400">{((slave as any).purchasePrice || 0).toLocaleString()} G</span>
                                                        </div>
                                                    </div>
                                                    
                                                    <div className="bg-black/20 p-2.5 rounded-xl mb-3 text-xs text-slate-400 italic">
                                                        "{slave.appearance}"
                                                    </div>
                                                </div>

                                                <button 
                                                    onClick={() => handleBuySlave(slave)}
                                                    disabled={character.money < ((slave as any).purchasePrice || 0)}
                                                    className="w-full py-2.5 bg-red-900/40 hover:bg-red-800/80 border border-red-700/50 text-red-100 rounded-xl font-bold text-xs transition-all active:scale-95 disabled:opacity-30 disabled:grayscale"
                                                >
                                                    구매 및 노예 계약 체결
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )
                            ) : (
                                <div className="flex flex-col items-center justify-center py-14 text-slate-400 bg-slate-950/50 rounded-2xl border border-dashed border-slate-800">
                                    <Lock size={32} className="mb-2 opacity-30 text-purple-400"/>
                                    <p className="text-sm font-bold text-slate-300">접근 불가</p>
                                    <p className="text-xs mt-0.5 text-slate-400">제국 내 신용도가 50 이상이어야 노예 시장에 입장할 수 있습니다.</p>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'shop' && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                            {DEMON_SHOP_ITEMS.map((item, idx) => {
                                const isLocked = demonRep < item.req;
                                return (
                                    <div 
                                        key={idx} 
                                        className={`bg-slate-950/80 rounded-2xl border transition-all flex flex-col overflow-hidden text-left group ${isLocked ? 'opacity-40 border-slate-800 grayscale' : 'border-purple-900/40 hover:border-purple-500/50 shadow-sm'}`}
                                    >
                                        <div className="h-28 w-full bg-slate-900 border-b border-slate-800 relative overflow-hidden">
                                            <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover opacity-70 group-hover:opacity-95 transition-opacity" />
                                            <div className="absolute top-2 left-2">
                                                <span className="text-[10px] font-bold text-purple-300 bg-purple-950/90 px-2 py-0.5 rounded-full border border-purple-500/30">{item.type}</span>
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
                                                    onClick={() => handleBuyItemClick(item)} 
                                                    disabled={isLocked} 
                                                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${isLocked ? 'bg-slate-900 text-slate-600' : 'bg-purple-700 text-white hover:bg-purple-600 active:scale-95'}`}
                                                >
                                                    {isLocked ? `신용도 ${item.req}` : '구매'}
                                                </button>
                                            </div>
                                        </div>
                                        {!isLocked && <ItemTooltip item={item as any} character={character} />}
                                    </div>
                                );
                            })}
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

export default DemonCityModal;
