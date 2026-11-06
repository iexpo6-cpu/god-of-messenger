
import React, { useState, useEffect } from 'react';
import { Character, Item, Quest, JobType, MilitaryRank, MercenaryRank, ItemRarity, Enemy, SimpleStudent } from '../types';
import { Crown, Users, Sword, Shield, Sparkles, Coins, ScrollText, Heart, Star, ChevronRight, Lock, Medal, Gift, UserPlus, RefreshCw, History, Truck } from 'lucide-react';
import { NATION_INFO, NATION_DATA } from '../constants';
import { DETAILED_BOSSES } from '../bossMonsters';
import { generateRegionalBlacklist } from '../criminals';
import { NATION_LEADERS } from '../worldData';
import { generateName, generateCompanionStats, generateNameWithSurname, generateDefaultVisualUrl, getRaceByNation } from '../utils';
import { ITEM_PREFIXES, RARITY_VALUE_RANGE } from '../itemPools';
import { NATION_SPECIFIC_ITEMS, SHOP_INVENTORY } from '../ItemData';

interface Props {
    character: Character;
    onClose: () => void;
    onUpdateCharacter: (newChar: Character, logMsg: string) => void;
    onAction: (action: string) => void;
}

const KingMeetingModal: React.FC<Props> = ({ character, onClose, onUpdateCharacter, onAction }) => {
    const nation = character.currentLocation?.nation || "대한민국";
    const favorability = character.nationalFavorability?.[nation] || 0;
    const reputation = character.mercenaryData?.reputation || 0;
    const merit = character.militaryData?.merit || 0;
    const playerLevel = character.level;
    
    const canEnter = reputation >= 10000 || merit >= 10000;

    const [activeTab, setActiveTab] = useState<'Main' | 'Request' | 'Benefits' | 'Treasury' | 'Personnel'>('Main');
    const [availableQuests, setAvailableQuests] = useState<any[]>([]);

    const currentYear = parseInt(character.currentDate?.split('-')[0] || "2024");
    const lastRefreshYear = character.lastKingQuestRefreshYear?.[nation] || 0;
    const canRefresh = currentYear > lastRefreshYear;

    const lastTreasuryYear = character.lastKingTreasuryYear?.[nation] || 0;
    const canTreasury = currentYear > lastTreasuryYear;

    const lastPersonnelYear = character.lastKingPersonnelYear?.[nation] || 0;
    const canPersonnel = currentYear > lastPersonnelYear;

    const leaderInfo = NATION_LEADERS[nation] || { name: "국왕", title: "국왕", desc: "이 나라의 통치자입니다." };
    const nationData = NATION_DATA[nation] || NATION_DATA["대한민국"];
    const kingSurname = leaderInfo.name.includes(' ')
        ? (nationData.order === 'SN' ? leaderInfo.name.split(' ')[0] : leaderInfo.name.split(' ').pop()!)
        : leaderInfo.name[0];

    const handleShowGoodwill = () => {
        const cost = 1000000; // 100만 골드
        if (character.money < cost) {
            alert("골드가 부족합니다. (1,000,000 G 필요)");
            return;
        }

        const currentMonth = character.currentDate?.substring(0, 7) || "2024-01";
        const lastGoodwillMonth = character.lastKingGoodwillDate?.[nation] || "";

        if (currentMonth === lastGoodwillMonth) {
            alert("국왕에게 친선을 표시하는 것은 한 달에 한 번만 가능합니다.");
            return;
        }

        const gain = Math.floor(Math.random() * 10) + 10;
        const newFavorability = Math.min(1000, favorability + gain);
        
        const newChar = {
            ...character,
            money: character.money - cost,
            nationalFavorability: {
                ...(character.nationalFavorability || {}),
                [nation]: newFavorability
            },
            lastKingGoodwillDate: {
                ...(character.lastKingGoodwillDate || {}),
                [nation]: currentMonth
            }
        };

        onUpdateCharacter(newChar, `[국왕 알현] ${nation}의 국왕에게 100만 골드를 기부하여 친선을 표시했습니다. 호감도 +${gain} (현재: ${newFavorability})`);
    };

    const kingEscortQuest = (character.mercenaryData?.activeQuests || [])
        .find(q => q.type === 'EscortKing' && !q.isEscortStarted) ||
        (character.militaryData?.activeMissions || [])
        .find(q => q.type === 'EscortKing' && !q.isEscortStarted);

    const handleStartKingEscort = () => {
        if (!kingEscortQuest) return;

        let newChar = { ...character };
        const questId = kingEscortQuest.id;
        let updated = false;

        // 1. 군사 임무에서 찾기
        if (newChar.militaryData?.activeMissions) {
            const missionIdx = newChar.militaryData.activeMissions.findIndex(q => q.id === questId);
            if (missionIdx !== -1) {
                newChar.militaryData.activeMissions[missionIdx] = { 
                    ...newChar.militaryData.activeMissions[missionIdx], 
                    isEscortStarted: true 
                };
                updated = true;
            }
        }
        
        // 2. 용병 퀘스트에서 찾기 (군사 임무에서 못 찾았을 경우)
        if (!updated && newChar.mercenaryData?.activeQuests) {
            const questIdx = newChar.mercenaryData.activeQuests.findIndex(q => q.id === questId);
            if (questIdx !== -1) {
                newChar.mercenaryData.activeQuests[questIdx] = { 
                    ...newChar.mercenaryData.activeQuests[questIdx], 
                    isEscortStarted: true 
                };
                updated = true;
            }
        }

        if (updated) {
            onUpdateCharacter(newChar, `[국왕 호위] 국왕 폐하를 모시고 ${kingEscortQuest.destination?.city}(으)로의 행차를 시작합니다.`);
            alert(`국왕 폐하를 모시고 ${kingEscortQuest.destination?.city}(으)로 향합니다. 이동 중 습격에 주의하십시오.`);
            onClose();
        } else {
            console.warn(`[KingMeetingModal] Could not find quest to start escort: ${questId}`);
            alert("호송 임무 정보를 찾을 수 없습니다. (ID: " + questId + ")");
        }
    };

    const generateQuests = (force: boolean = false) => {
        if (!force) return;

        const quests = [];
        const rand = Math.random();
        
        if (rand < 0.5) {
            // 1. 지역 보스 몬스터 의뢰
            const localBosses = DETAILED_BOSSES[nation];
            if (localBosses) {
                const cities = Object.keys(localBosses);
                const randomCity = cities[Math.floor(Math.random() * cities.length)];
                const boss = localBosses[randomCity];
                quests.push({
                    id: `king_${nation}_boss_${boss.id}_${currentYear}_${Date.now()}`,
                    type: 'Boss',
                    title: `[국왕의 칙명] ${boss.name} 토벌`,
                    goal: `${randomCity}의 ${boss.name}을(를) 처단하십시오.`,
                    reward: "전설급 장비 상자",
                    difficulty: "★★★★★",
                    minFavor: 100,
                    target: boss
                });
            }
        } else {
            // 2. 블랙리스트/범죄자 토벌
            const criminals = generateRegionalBlacklist(nation, playerLevel, 1);
            if (criminals.length > 0) {
                const crm = criminals[0];
                quests.push({
                    id: `king_${nation}_crm_${crm.id}_${currentYear}_${Date.now()}`,
                    type: 'Blacklist',
                    title: `[국왕의 칙명] 대역죄인 ${crm.name} 추적`,
                    goal: `${crm.title} ${crm.name}을(를) 생포하거나 처단하십시오.`,
                    reward: "왕실 훈장 & 대량의 공적",
                    difficulty: "★★★★",
                    minFavor: 50,
                    target: crm
                });
            }
        }

        setAvailableQuests(quests);

        if (force) {
            const newChar = {
                ...character,
                lastKingQuestRefreshYear: {
                    ...(character.lastKingQuestRefreshYear || {}),
                    [nation]: currentYear
                }
            };
            onUpdateCharacter(newChar, `[국왕 알현] ${nation}의 국왕 의뢰를 갱신했습니다. (다음 갱신 가능 연도: ${currentYear + 1}년)`);
        }
    };

    useEffect(() => {
        if (canEnter) generateQuests();
    }, [canEnter, nation]);

    const handleAcceptQuest = (quest: any) => {
        if (favorability < quest.minFavor) {
            alert(`국왕과의 호감도가 부족합니다. (필요: ${quest.minFavor})`);
            return;
        }

        // 로컬 퀘스트 로그에 등록
        const newQuest: Quest = {
            id: quest.id,
            type: 'Subjugation',
            rank: character.job === JobType.MERCENARY ? (character.mercenaryData?.rank || 'F') : (character.militaryData?.rank || '훈련병'),
            title: quest.title,
            goal: quest.goal,
            details: `국왕 ${leaderInfo.name}의 직접적인 칙명입니다.`,
            danger: 'Extreme',
            rewardGold: 1000000,
            rewardExp: 50000,
            targetName: quest.target?.name
        };

        let newChar = { ...character };

        // [NEW] 국왕의 칙명(블랙리스트) 대상인 경우, 캐릭터의 블랙리스트 명단에 추가 (뒷골목 추적 가능하도록)
        if (quest.type === 'Blacklist' && quest.target) {
            const currentBlacklist = character.mercenaryData?.blacklist || [];
            if (!currentBlacklist.some(c => c.id === quest.target.id)) {
                newChar.mercenaryData = {
                    ...(newChar.mercenaryData || { 
                        rank: MercenaryRank.S, 
                        reputation: 0, 
                        completedQuests: 0, 
                        activeQuests: [], 
                        blacklist: [],
                        registeredDate: character.currentDate || '2000-01-01',
                        guildId: 'None',
                        isGroupLeader: false
                    }),
                    blacklist: [...currentBlacklist, quest.target]
                };
            }
        }

        if (character.job === JobType.MERCENARY) {
            const activeQuests = character.mercenaryData?.activeQuests || [];
            if (activeQuests.some(q => q.id === quest.id)) {
                alert("이미 수락한 의뢰입니다.");
                return;
            }
            newChar = {
                ...newChar,
                mercenaryData: {
                    ...newChar.mercenaryData!,
                    activeQuests: [...activeQuests, newQuest]
                }
            };
        } else if (character.job === JobType.SOLDIER) {
            const activeMissions = character.militaryData?.activeMissions || [];
            if (activeMissions.some(m => m.id === quest.id)) {
                alert("이미 수락한 임무입니다.");
                return;
            }
            newChar = {
                ...newChar,
                militaryData: {
                    ...character.militaryData!,
                    activeMissions: [...activeMissions, newQuest]
                }
            };
        } else {
            alert("용병이나 군인 신분이어야 의뢰를 수락할 수 있습니다.");
            return;
        }

        onUpdateCharacter(newChar, `[국왕 의뢰 수락] ${quest.title} 의뢰를 수락했습니다.`);
        alert(`${quest.title} 의뢰를 수락했습니다. 퀘스트 로그를 확인하세요.`);
        setAvailableQuests([]); // 수락 후 목록에서 제거
    };

    const handleTreasuryGacha = () => {
        if (favorability < 500) {
            alert("왕실 보물고에 접근하려면 국왕과의 호감도가 500 이상이어야 합니다.");
            return;
        }

        if (!canTreasury) {
            alert(`올해는 이미 보물고를 방문했습니다. (${currentYear}년 방문 완료)`);
            return;
        }

        const cost = 5000000;
        if (character.money < cost) {
            alert("보물고 이용료 5,000,000 G가 부족합니다.");
            return;
        }

        // 전설 아이템 가차 (기존 아이템 풀에서 추출)
        const allLegendaryItems: Item[] = [];
        
        // 1. 국가별 특수 아이템에서 전설 추출
        Object.values(NATION_SPECIFIC_ITEMS).forEach(items => {
            items.forEach(item => {
                if (item.rarity === ItemRarity.LEGENDARY) allLegendaryItems.push(item);
            });
        });

        // 2. 상점 인벤토리에서 전설 추출
        Object.values(SHOP_INVENTORY).forEach(tierData => {
            ['general', 'weapon', 'armor'].forEach(cat => {
                (tierData as any)[cat].forEach((item: Item) => {
                    if (item.rarity === ItemRarity.LEGENDARY) allLegendaryItems.push(item);
                });
            });
        });

        // 중복 제거 (이름 기준)
        const uniqueLegendaryPool = allLegendaryItems.filter((item, index, self) =>
            index === self.findIndex((t) => t.name === item.name)
        );

        let newItem: Item;

        if (uniqueLegendaryPool.length > 0) {
            // 현재 국가의 전설 아이템이 있다면 50% 확률로 우선권
            const nationLegendaries = (NATION_SPECIFIC_ITEMS[nation] || []).filter(i => i.rarity === ItemRarity.LEGENDARY);
            if (nationLegendaries.length > 0 && Math.random() < 0.5) {
                newItem = { ...nationLegendaries[Math.floor(Math.random() * nationLegendaries.length)] };
            } else {
                newItem = { ...uniqueLegendaryPool[Math.floor(Math.random() * uniqueLegendaryPool.length)] };
            }
        } else {
            // 완전 랜덤 생성 fallback (풀이 비어있을 경우를 대비)
            const prefixes = ITEM_PREFIXES[ItemRarity.LEGENDARY];
            const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
            const types: ('Weapon' | 'Body' | 'Accessory')[] = ['Weapon', 'Body', 'Accessory'];
            const type = types[Math.floor(Math.random() * types.length)];
            
            const itemName = `${prefix} ${nation}의 유산`;
            newItem = {
                name: itemName,
                type: type,
                rarity: ItemRarity.LEGENDARY,
                description: `${nation} 왕실 보물고에서 전해 내려오는 전설적인 장비입니다.`,
                stats: {
                    str: Math.floor(Math.random() * 50) + 70,
                    int: Math.floor(Math.random() * 50) + 70,
                    def: Math.floor(Math.random() * 50) + 70,
                    agi: Math.floor(Math.random() * 50) + 70,
                },
                price: 15000000
            };
        }

        const newChar = {
            ...character,
            money: character.money - cost,
            inventory: [...character.inventory, newItem],
            lastKingTreasuryYear: {
                ...(character.lastKingTreasuryYear || {}),
                [nation]: currentYear
            }
        };

        onUpdateCharacter(newChar, `[왕실 보물고] ${currentYear}년의 보물 하사. 전설급 아이템 [${newItem.name}]을(를) 획득했습니다!`);
        alert(`[${newItem.name}]을(를) 획득했습니다! 인벤토리를 확인하세요. (올해 이용 완료)`);
    };

    const getRoyalPersonnel = () => {
        if (character.royalPersonnel?.[nation]) {
            return character.royalPersonnel[nation];
        }

        // 국가별 고정 인물 8명 생성 (결정론적)
        const personnel = [];
        const seed = nation.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        
        // 1-2: 왕자
        for (let i = 1; i <= 2; i++) {
            personnel.push({
                type: 'Prince',
                name: generateNameWithSurname(kingSurname, nation, 'male'),
                level: 40 + (seed % 20),
                desc: `${nation}의 제${i}왕자입니다.`,
                job: JobType.PRINCE,
                stats: generateCompanionStats(40 + (seed % 20))
            });
        }
        // 3-4: 공주
        for (let i = 1; i <= 2; i++) {
            personnel.push({
                type: 'Princess',
                name: generateNameWithSurname(kingSurname, nation, 'female'),
                level: 35 + (seed % 15),
                desc: `${nation}의 제${i}공주입니다.`,
                job: JobType.PRINCESS,
                stats: generateCompanionStats(35 + (seed % 15))
            });
        }
        // 5-8: 기사단장 및 부단장
        const knightTitles = ["제1기사단장", "제2기사단장", "근위대장", "성기사단장"];
        for (let i = 0; i < 4; i++) {
            const level = 250 + (seed % 50) + (i * 10);
            personnel.push({
                type: 'Knight',
                name: generateName(nation, Math.random() > 0.5 ? 'male' : 'female'),
                level: level, // 레벨 대폭 상향
                desc: `${nation}의 ${knightTitles[i]}입니다.`,
                job: JobType.ROYAL_KNIGHT,
                stats: generateCompanionStats(level) // utils의 스탯 생성기 사용
            });
        }
        return personnel;
    };

    useEffect(() => {
        if (!character.royalPersonnel?.[nation]) {
            const personnel = getRoyalPersonnel();
            const newChar = {
                ...character,
                royalPersonnel: {
                    ...(character.royalPersonnel || {}),
                    [nation]: personnel
                }
            };
            onUpdateCharacter(newChar, ""); // 조용히 업데이트
        }
    }, [nation]);

    const [selectedPersonIndex, setSelectedPersonIndex] = useState<number | null>(null);

    const handleIntroducePersonnel = () => {
        if (favorability < 800) {
            alert("왕실 인물을 소개받으려면 호감도가 800 이상이어야 합니다.");
            return;
        }

        if (!canPersonnel) {
            alert(`올해는 이미 왕실 인물을 소개받았습니다. (${currentYear}년 완료)`);
            return;
        }

        if (selectedPersonIndex === null) {
            alert("소개받을 인물을 선택해주세요.");
            return;
        }

        const personnelList = getRoyalPersonnel();
        const person = personnelList[selectedPersonIndex];
        
        const name = person.name;
        const desc = person.desc;
        const job = person.job;
        const MBTI_LIST = ["INTJ", "INFJ", "ENTJ", "ENFJ", "ISTJ", "ISFJ", "ESTJ", "ESFJ", "ISTP", "ISFP", "ESTP", "ESFP", "INTP", "INFP", "ENTP", "ENFP"];
        const mbti = MBTI_LIST[Math.floor(Math.random() * MBTI_LIST.length)];
        const race = getRaceByNation(nation);
        const newConnection: SimpleStudent = {
            id: `royal_${nation}_${person.name}_${Date.now()}`,
            name: name,
            age: person.type === 'Knight'? "35" : "20",
            birthYear: person.type === 'Knight'? currentYear - 35 : currentYear - 20,
            gender: person.type === 'Princess' ? '여성' : '남성',
            race: race,
            nation: nation,
            level: person.level,
            personality: mbti,
            appearance: "수려함",
            stats: person.stats || { str: 100, int: 100, agi: 100 },
            affection: 15,
            isPastConnection: true,
            job: job,
            classType: "Royal",
            visualUrl: generateDefaultVisualUrl(name, nation, race, person.type === 'Princess' ? '여성' : '남성')
        };

        // 소개받은 인물은 목록에서 제거
        const updatedPersonnel = personnelList.filter((_, idx) => idx !== selectedPersonIndex);

        const newChar = {
            ...character,
            socialNetwork: [...(character.socialNetwork || []), newConnection],
            lastKingPersonnelYear: {
                ...(character.lastKingPersonnelYear || {}),
                [nation]: currentYear
            },
            royalPersonnel: {
                ...(character.royalPersonnel || {}),
                [nation]: updatedPersonnel
            }
        };

        onUpdateCharacter(newChar, `[왕실 인물 소개] ${name} (${desc})님을 소개받아 과거의 인연으로 등록되었습니다. (올해 이용 완료)`);
        alert(`${name}님을 소개받았습니다. 과거의 인연으로 등록되었습니다.`);
        setSelectedPersonIndex(null);
    };

    const getBenefitLevel = () => {
        if (favorability >= 800) return 4;
        if (favorability >= 500) return 3;
        if (favorability >= 200) return 2;
        if (favorability >= 50) return 1;
        return 0;
    };

    const benefits = [
        { level: 1, title: "퀘스트 우선권", desc: "왕실 관련 퀘스트 수주 가능", icon: ScrollText },
        { level: 2, title: "최고급 의뢰", desc: "보상 등급 ★★★★★ 퀘스트 해금", icon: Star },
        { level: 3, title: "왕실 보물고 접근", desc: "전설급 장비 지급 및 보물고 이용", icon: Crown },
        { level: 4, title: "왕실 인물 소개", desc: "왕실 인물과의 과거 인연 형성", icon: History },
    ];

    if (!canEnter) {
        return (
            <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-2xl p-8 text-center shadow-2xl">
                    <Lock size={64} className="mx-auto text-slate-500 mb-6" />
                    <h2 className="text-2xl font-bold text-white mb-4">접근 권한 부족</h2>
                    <p className="text-slate-400 mb-8 leading-relaxed">
                        국왕을 알현하기 위해서는 최소 <span className="text-amber-400 font-bold">명성</span>이나 <span className="text-blue-400 font-bold">공적</span>이 <span className="text-white font-bold">10,000</span> 이상이어야 합니다.
                    </p>
                    <div className="flex flex-col gap-3 mb-8">
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-500">현재 명성</span>
                            <span className={reputation >= 10000 ? "text-green-400" : "text-red-400"}>{reputation.toLocaleString()} / 10,000</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-500">현재 공적</span>
                            <span className={merit >= 10000 ? "text-green-400" : "text-red-400"}>{merit.toLocaleString()} / 10,000</span>
                        </div>
                    </div>
                    <button onClick={onClose} className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold transition-all">돌아가기</button>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-slate-900 border border-amber-500/30 w-full max-w-5xl h-[90vh] md:h-[85vh] rounded-xl md:rounded-3xl flex flex-col overflow-hidden shadow-[0_0_50px_rgba(245,158,11,0.2)]">
                
                {/* Header */}
                <div className="p-4 md:p-6 bg-gradient-to-r from-amber-900/20 to-slate-900 border-b border-amber-500/20 flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-3 md:gap-4">
                        <div className="p-2 md:p-3 bg-amber-500/10 rounded-xl md:rounded-2xl border border-amber-500/30">
                            <Crown size={24} className="text-amber-400 md:w-8 md:h-8" />
                        </div>
                        <div>
                            <h2 className="text-lg md:text-2xl font-bold text-white font-cinzel tracking-tight">{nation} 국왕 알현</h2>
                            <p className="text-amber-500/70 text-[10px] md:text-xs font-bold">Royal Audience Hall - {leaderInfo.name} {leaderInfo.title}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 md:gap-4">
                        <div className="bg-slate-800/50 border border-slate-700 px-3 py-1.5 md:px-4 md:py-2 rounded-xl flex items-center gap-2 md:gap-3">
                            <Heart size={16} className="text-rose-500 fill-rose-500 md:w-[18px] md:h-[18px]" />
                            <div className="flex flex-col">
                                <span className="text-[8px] md:text-[10px] text-slate-500 font-bold uppercase">Favorability</span>
                                <span className="text-xs md:text-base text-white font-bold">{favorability} / 1000</span>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors text-slate-400 hover:text-white">
                            <ChevronRight size={20} className="md:w-6 md:h-6" />
                        </button>
                    </div>
                </div>

                {/* Navigation */}
                <div className="flex border-b border-slate-800 bg-slate-950/50 shrink-0 overflow-x-auto no-scrollbar">
                    {(['Main', 'Request', 'Benefits', 'Treasury', 'Personnel'] as const).map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`flex-1 min-w-[80px] py-3 md:py-4 text-xs md:text-sm font-bold transition-all border-b-2 whitespace-nowrap ${activeTab === tab ? 'text-amber-400 border-amber-500 bg-amber-500/5' : 'text-slate-500 border-transparent hover:text-slate-300'}`}
                        >
                            {tab === 'Main' ? '알현실' : tab === 'Request' ? '국왕의 의뢰' : tab === 'Benefits' ? '우대 혜택' : tab === 'Treasury' ? '왕실 보물고' : '왕실 인물'}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]">
                    {activeTab === 'Main' && (
                        <div className="space-y-6 md:space-y-8 animate-in slide-in-from-bottom-4">
                            <div className="bg-slate-800/30 border border-slate-700 p-4 md:p-8 rounded-2xl md:rounded-3xl text-center relative overflow-hidden group">
                                <div className="absolute inset-0 bg-gradient-to-b from-amber-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                <Crown size={48} className="mx-auto text-amber-500/20 mb-3 md:mb-4 md:w-16 md:h-16" />
                                <h3 className="text-lg md:text-xl font-bold text-white mb-2">{leaderInfo.name} {leaderInfo.title}</h3>
                                <p className="text-slate-400 text-xs md:text-sm leading-relaxed max-w-lg mx-auto mb-6 md:mb-8 italic">
                                    "{leaderInfo.desc}"
                                </p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                                    <button 
                                        onClick={handleShowGoodwill}
                                        className="p-4 md:p-6 bg-slate-800/50 hover:bg-amber-900/20 border border-slate-700 hover:border-amber-500/50 rounded-xl md:rounded-2xl transition-all text-left group"
                                    >
                                        <div className="flex justify-between items-start mb-3 md:mb-4">
                                            <div className="p-2 md:p-3 bg-amber-500/10 rounded-lg md:rounded-xl text-amber-400 group-hover:scale-110 transition-transform">
                                                <Sparkles size={20} className="md:w-6 md:h-6" />
                                            </div>
                                            <span className="text-[10px] md:text-xs font-bold text-amber-500">-1,000,000 G</span>
                                        </div>
                                        <h4 className="text-white font-bold mb-1 text-sm md:text-base">친선 표시</h4>
                                        <p className="text-[10px] md:text-xs text-slate-500">막대한 기부금을 통해 국왕과의 관계를 개선합니다.</p>
                                    </button>
                                    <button 
                                        onClick={() => setActiveTab('Request')}
                                        className="p-4 md:p-6 bg-slate-800/50 hover:bg-blue-900/20 border border-slate-700 hover:border-blue-500/50 rounded-xl md:rounded-2xl transition-all text-left group"
                                    >
                                        <div className="flex justify-between items-start mb-3 md:mb-4">
                                            <div className="p-2 md:p-3 bg-blue-500/10 rounded-lg md:rounded-xl text-blue-400 group-hover:scale-110 transition-transform">
                                                <ScrollText size={20} className="md:w-6 md:h-6" />
                                            </div>
                                        </div>
                                        <h4 className="text-white font-bold mb-1 text-sm md:text-base">의뢰 확인</h4>
                                        <p className="text-[10px] md:text-xs text-slate-500">국왕이 직접 하사하는 특별한 임무를 확인합니다.</p>
                                    </button>
                                    {kingEscortQuest && (
                                        <button 
                                            onClick={handleStartKingEscort}
                                            className="p-4 md:p-6 bg-amber-600 hover:bg-amber-500 border border-amber-400 rounded-xl md:rounded-2xl transition-all text-left group col-span-1 md:col-span-2"
                                        >
                                            <div className="flex justify-between items-start mb-3 md:mb-4">
                                                <div className="p-2 md:p-3 bg-white/20 rounded-lg md:rounded-xl text-white group-hover:scale-110 transition-transform">
                                                    <Truck size={20} className="md:w-6 md:h-6" />
                                                </div>
                                                <span className="text-[10px] md:text-xs font-bold text-white">목적지: {kingEscortQuest.destination?.city}</span>
                                            </div>
                                            <h4 className="text-white font-bold mb-1 text-sm md:text-base">국왕 호위 호송 시작</h4>
                                            <p className="text-[10px] md:text-xs text-white/80">국왕 폐하를 모시고 목적지까지 안전하게 호송을 시작합니다.</p>
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
                                <div className="bg-slate-800/30 p-3 md:p-4 rounded-xl md:rounded-2xl border border-slate-700 text-center flex md:block items-center justify-between md:justify-center">
                                    <div className="text-[10px] md:text-xs text-slate-500 font-bold mb-0 md:mb-1 uppercase">Current Status</div>
                                    <div className="text-amber-400 font-bold text-sm md:text-base">{favorability >= 500 ? "왕실의 동반자" : favorability >= 200 ? "신뢰받는 영웅" : "왕실의 귀빈"}</div>
                                </div>
                                <div className="bg-slate-800/30 p-3 md:p-4 rounded-xl md:rounded-2xl border border-slate-700 text-center flex md:block items-center justify-between md:justify-center">
                                    <div className="text-[10px] md:text-xs text-slate-500 font-bold mb-0 md:mb-1 uppercase">Active Buff</div>
                                    <div className="text-blue-400 font-bold text-sm md:text-base">국가 가호 (Lv.{Math.floor(favorability/100)})</div>
                                </div>
                                <div className="bg-slate-800/30 p-3 md:p-4 rounded-xl md:rounded-2xl border border-slate-700 text-center flex md:block items-center justify-between md:justify-center">
                                    <div className="text-[10px] md:text-xs text-slate-500 font-bold mb-0 md:mb-1 uppercase">Authority</div>
                                    <div className="text-green-400 font-bold text-sm md:text-base">{favorability >= 800 ? "군단 지휘권" : "자유 통행"}</div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'Request' && (
                        <div className="space-y-4 animate-in slide-in-from-bottom-4">
                            <div className="flex justify-between items-center mb-6">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-blue-500/20 rounded-xl text-blue-400 border border-blue-500/30">
                                        <Shield size={24} />
                                    </div>
                                    <div>
                                        <h4 className="text-white font-bold">국왕의 특별 의뢰</h4>
                                        <p className="text-xs text-blue-200/60">호감도가 높을수록 더 위험하지만 보상이 막대한 의뢰가 주어집니다.</p>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => generateQuests(true)}
                                    disabled={!canRefresh}
                                    className={`p-2 rounded-lg transition-all flex items-center gap-2 text-xs font-bold ${canRefresh ? 'bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white' : 'bg-slate-900 text-slate-600 cursor-not-allowed'}`}
                                >
                                    <RefreshCw size={14} /> 갱신 {!canRefresh && `(${currentYear}년 갱신 완료)`}
                                </button>
                            </div>

                            {availableQuests.map((req, idx) => (
                                <div key={idx} className={`p-6 rounded-2xl border transition-all flex justify-between items-center ${favorability >= req.minFavor ? 'bg-slate-800/50 border-slate-700 hover:border-amber-500/50' : 'bg-slate-900/50 border-slate-800 opacity-60'}`}>
                                    <div className="flex items-center gap-4">
                                        <div className={`p-3 rounded-xl ${favorability >= req.minFavor ? 'bg-amber-500/10 text-amber-400' : 'bg-slate-700 text-slate-500'}`}>
                                            {favorability >= req.minFavor ? <Star size={20} /> : <Lock size={20} />}
                                        </div>
                                        <div>
                                            <h5 className="text-white font-bold flex items-center gap-2">
                                                {req.title}
                                                <span className="text-[10px] text-amber-500">{req.difficulty}</span>
                                            </h5>
                                            <p className="text-xs text-slate-400 mb-1">{req.goal}</p>
                                            <p className="text-[10px] text-green-400 font-bold">보상: {req.reward}</p>
                                        </div>
                                    </div>
                                    {favorability >= req.minFavor ? (
                                        <button 
                                            onClick={() => handleAcceptQuest(req)}
                                            className="px-6 py-3 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-xl transition-all shadow-lg shadow-amber-900/20"
                                        >
                                            의뢰 수락
                                        </button>
                                    ) : (
                                        <div className="text-[10px] text-red-400 font-bold bg-red-900/20 px-3 py-1 rounded-full border border-red-900/30">호감도 {req.minFavor} 필요</div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    {activeTab === 'Treasury' && (
                        <div className="space-y-8 animate-in slide-in-from-bottom-4">
                            <div className="bg-gradient-to-br from-amber-900/40 to-slate-900 border border-amber-500/30 p-10 rounded-3xl text-center">
                                <Coins size={64} className="mx-auto text-amber-400 mb-6 animate-bounce" />
                                <h3 className="text-2xl font-bold text-white mb-4 font-cinzel tracking-widest">왕실 보물고 (Royal Treasury)</h3>
                                <p className="text-slate-400 text-sm mb-8 max-w-md mx-auto">
                                    수백 년간 축적된 국가의 보물들이 잠들어 있습니다. 국왕의 허락을 받은 자만이 보물고의 문을 열 수 있습니다.
                                </p>
                                <button 
                                    onClick={handleTreasuryGacha}
                                    disabled={!canTreasury || favorability < 500}
                                    className={`px-10 py-5 rounded-2xl font-bold text-lg transition-all flex items-center gap-3 mx-auto ${canTreasury && favorability >= 500 ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-[0_0_30px_rgba(245,158,11,0.4)]' : 'bg-slate-800 text-slate-500 cursor-not-allowed'}`}
                                >
                                    <Gift size={24} />
                                    전설 아이템 보물창고 확인 (5,000,000 G)
                                </button>
                                {!canTreasury && (
                                    <p className="mt-4 text-amber-500 text-xs font-bold">올해 보물고 방문을 완료했습니다. ({currentYear}년)</p>
                                )}
                                {canTreasury && favorability < 500 && (
                                    <p className="mt-4 text-red-400 text-xs font-bold">호감도 500 이상 필요 (현재: {favorability})</p>
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === 'Personnel' && (
                        <div className="space-y-6 animate-in slide-in-from-bottom-4">
                            <div className="bg-slate-800/30 border border-slate-700 p-6 rounded-2xl flex items-center gap-4">
                                <UserPlus size={24} className="text-blue-400" />
                                <div>
                                    <h4 className="text-white font-bold">왕실 인물 소개</h4>
                                    <p className="text-xs text-slate-500">왕족이나 전설적인 기사들과 인연을 맺을 수 있습니다.</p>
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-1 gap-6">
                                <div className="bg-slate-800/50 border border-slate-700 p-8 rounded-3xl">
                                    <h4 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                                        <History size={24} className="text-blue-400" />
                                        소개받을 인물 선택
                                    </h4>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                                        {getRoyalPersonnel().map((person, idx) => (
                                            <button
                                                key={idx}
                                                onClick={() => setSelectedPersonIndex(idx)}
                                                className={`p-4 rounded-2xl border transition-all text-left flex items-center gap-4 ${selectedPersonIndex === idx ? 'bg-blue-500/20 border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.3)]' : 'bg-slate-900/50 border-slate-800 hover:border-slate-700'}`}
                                            >
                                                <div className={`p-3 rounded-xl ${person.type === 'Knight' ? 'bg-slate-800 text-slate-400' : 'bg-amber-500/10 text-amber-400'}`}>
                                                    {person.type === 'Knight' ? <Shield size={20} /> : <Crown size={20} />}
                                                </div>
                                                <div>
                                                    <div className="text-white font-bold text-sm">{person.name}</div>
                                                    <div className="text-[10px] text-slate-500">{person.desc} (Lv.{person.level})</div>
                                                </div>
                                            </button>
                                        ))}
                                    </div>

                                    <button 
                                        onClick={handleIntroducePersonnel}
                                        disabled={!canPersonnel || favorability < 800 || selectedPersonIndex === null}
                                        className={`w-full py-4 rounded-2xl font-bold transition-all flex items-center justify-center gap-3 ${canPersonnel && favorability >= 800 && selectedPersonIndex !== null ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/20' : 'bg-slate-800 text-slate-500 cursor-not-allowed'}`}
                                    >
                                        <UserPlus size={20} />
                                        선택한 인물 소개받기 (연 1회)
                                    </button>
                                    
                                    <div className="mt-4 flex justify-between items-center px-2">
                                        <div className="text-xs font-bold text-blue-400">호감도 800 필요</div>
                                        {!canPersonnel && <div className="text-xs font-bold text-amber-500">{currentYear}년 소개 완료</div>}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'Benefits' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in slide-in-from-bottom-4">
                            {benefits.map((benefit, idx) => {
                                const isUnlocked = getBenefitLevel() >= benefit.level;
                                const Icon = benefit.icon;
                                return (
                                    <div key={idx} className={`p-6 rounded-2xl border transition-all ${isUnlocked ? 'bg-gradient-to-br from-amber-900/20 to-slate-800/50 border-amber-500/30 shadow-lg shadow-amber-500/5' : 'bg-slate-900/50 border-slate-800 opacity-50'}`}>
                                        <div className="flex justify-between items-start mb-4">
                                            <div className={`p-3 rounded-xl ${isUnlocked ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-700 text-slate-500'}`}>
                                                <Icon size={24} />
                                            </div>
                                            {!isUnlocked && <Lock size={16} className="text-slate-600" />}
                                        </div>
                                        <h4 className={`font-bold mb-1 ${isUnlocked ? 'text-white' : 'text-slate-500'}`}>{benefit.title}</h4>
                                        <p className="text-xs text-slate-500 leading-relaxed">{benefit.desc}</p>
                                        {!isUnlocked && (
                                            <div className="mt-4 h-1 bg-slate-800 rounded-full overflow-hidden">
                                                <div 
                                                    className="h-full bg-amber-500" 
                                                    style={{ width: `${Math.min(100, (favorability / [50, 200, 500, 800][benefit.level-1]) * 100)}%` }} 
                                                />
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 bg-slate-950 border-t border-slate-800 flex justify-between items-center text-[10px] font-bold uppercase tracking-widest">
                    <div className="flex gap-6">
                        <div className="flex items-center gap-2 text-slate-500">
                            <Users size={12} />
                            <span>Reputation: <span className="text-white">{reputation.toLocaleString()}</span></span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-500">
                            <Medal size={12} className="text-blue-400" />
                            <span>Merit: <span className="text-white">{merit.toLocaleString()}</span></span>
                        </div>
                    </div>
                    <div className="text-amber-500/50">Royal Palace of {nation} - {leaderInfo.name}</div>
                </div>
            </div>
        </div>
    );
};

export default KingMeetingModal;

