
import React, { useState } from 'react';
import { Character, Enemy, Criminal, JobType, Quest,MercenaryRank, Companion, MilitaryRank, WorldReaction, ClassTier, RumorData, Item, ItemRarity, SkillType, Stats, SimpleStudent, RelationType } from '../types';
import { X, Search, Skull, Target, Sword, Coins, Loader2, MessageCircle, Gavel, CheckCircle, Package, Clock, Users, MapPin, AlertTriangle, Eye, Compass, Crosshair, User, ShieldAlert, ChevronRight, Info, RefreshCw, TrendingDown, Medal, Award, UserCheck, ArrowRight, UserPlus, Sparkles, Send, Trash2, Moon, Gem, Scroll } from 'lucide-react';
import { calculateTotalStats, getYear, generateCompanionStats, getTierByLevel, addDays, generateName, calculateItemPrice, generateEnemyStats, generateDefaultVisualUrl, getRaceByNation, assignRandomCombatStyle } from '../utils';
import { WORLD_GEOGRAPHY, INFAMY_CONFIG, MAX_PARTY_SIZE, SHINRYOKU_TYPES_LIST, HUMANOID_CLASSES, NATION_DATA, getHumanoidClassByTier } from '../constants';
import ActionResultModal, { ResultData } from './ActionResultModal';
import { convertCriminalToEnemy, generateGreatCriminals } from '../criminals';
import { MERCENARY_RANK_THRESHOLD, getNextMercenaryRank } from '../mercenaryRankUp';
import { chatWithCompanion } from '../services/geminiService';
import { 
    isNightMarketActive, 
    getNightMarketStock, 
    getRemainingDaysInMonth,
    NightMarketItem 
} from '../services/facilityOperatingService';

interface Props {
    character: Character;
    onClose: () => void;
    onUpdateCharacter: (newChar: Character, logMsg: string) => void;
    onBattle: (enemy: Enemy | Enemy[], type?: string, source?: string) => void;
}

type Mode = 'investigate' | 'rumor' | 'contact' | 'laundry' | 'night_market';

const BackAlleyModal: React.FC<Props> = ({ character, onClose, onUpdateCharacter, onBattle }) => {
    const loc = character.currentLocation || { region: '아시아', nation: '대한민국', city: '서울' };
    const isNight = isNightMarketActive(character.currentTime);
    const [activeMode, setActiveMode] = useState<Mode>(isNight ? 'night_market' : 'investigate');
    const [isInvestigating, setIsInvestigating] = useState(false);
    const [isGreatInvestigating, setIsGreatInvestigating] = useState(false);
    const [resultData, setResultData] = useState<ResultData | null>(null);
    const [focusedCriminalId, setFocusedCriminalId] = useState<string | null>(null);
    const [investigationFee, setInvestigationFee] = useState<number>(5000);

    // 심야 암시장 월간 구매 이력 및 재고 계산 (매월 1회 갱신)
    const currentMonth = (character.currentDate || '2000-03-02').slice(0, 7);
    const monthlyPurchases = (character.nightMarketMonthlyHistory?.month === currentMonth)
        ? (character.nightMarketMonthlyHistory.purchases || {})
        : {};
    const daysRemaining = getRemainingDaysInMonth(character.currentDate);

    // 심야 암시장 상태 (매월 1회 갱신)
    const [nightMarketStock, setNightMarketStock] = useState<NightMarketItem[]>(() => 
        getNightMarketStock(character.currentDate, loc.city, monthlyPurchases)
    );

    // Laundering State
    const [laundryTargetId, setLaundryTargetId] = useState<string>('player');
    const [laundryAmount, setLaundryAmount] = useState<number>(1);
    const [laundryCurrency, setLaundryCurrency] = useState<'RP' | 'Merit'>('RP');

    // Contact State
    const [contactingNpc, setContactingNpc] = useState<Companion | null>(null);
    const [isRecruiting, setIsRecruiting] = useState(false);
    const [chatInput, setChatInput] = useState('');
    const [isChatting, setIsChatting] = useState(false);

    // [NEW] Rumor Investigation State
    const [isRumorProcessing, setIsRumorProcessing] = useState(false);

    const mData = character.mercenaryData;
    const infoFee = 2000;

    const activeRumor = mData?.activeRumor;
    const isRumorCity = activeRumor && activeRumor.city === loc.city;

    const trackedId = mData?.trackedCriminalId;
    const trackedCity = mData?.trackedCriminalCity;
    const blacklist = mData?.blacklist || [];
    const trackedCriminal = blacklist.find(c => c.id === trackedId);

    const activeBountyQuests = [
        ...(mData?.activeQuests || []),
        ...(character.militaryData?.activeMissions || [])
    ].filter(q => q.type === 'BountyHunt' || q.id.startsWith('king_')) || [];
    const activeBountyCriminals = activeBountyQuests.map(q => {
        return blacklist.find(c => 
            (q.targetName && c.name === q.targetName) || 
            `bounty_${c.id}` === q.id ||
            (q.id.startsWith('king_') && q.id.includes(c.id))
        );
    }).filter(Boolean) as Criminal[];

    const focusedCriminal = focusedCriminalId ? blacklist.find(c => c.id === focusedCriminalId) : null;
    const isAtTargetCity = trackedCriminal && loc.city === trackedCity;

    const laundryPotentials = [
        { id: 'player', name: `${character.name} (나)`, infamy: character.infamy || 0, rp: character.mercenaryData?.reputation || 0, merit: character.militaryData?.merit || 0, type: 'player' },
        ...character.companions.map(c => ({ id: c.id, name: c.name, infamy: c.infamy || 0, rp: c.reputation || 0, merit: (c as any).merit || 0, type: 'companion' }))
    ];

    const currentLaundryTarget = laundryPotentials.find(p => p.id === laundryTargetId);

    const rumoredContacts = (character.savedReactions || []).filter(r => 
        r.category === 'Companion' && r.location === loc.city
    );

    // [MODIFIED] 뜬소문 추적 처리 핸들러 - 용병화 및 인연 등록 반영
    const handleInvestigateRumor = () => {
        if (!activeRumor) return;
        setIsRumorProcessing(true);

        setTimeout(() => {
            const roll = Math.random() * 100;
            const newChar = { ...character };
            
            // 1. 암시장 상인 조우 (25%)
            if (roll <= 25) {
                const itemPrice = calculateItemPrice(activeRumor.item) * 1.5;
                setResultData({
                    type: 'info',
                    title: '암시장 상인 조우',
                    message: `정보꾼: "오, 그 보물 말이군. 마침 내 손에 들어왔지. 하지만 뒷골목 시세라는 게 있어서 말이야... 감당할 수 있겠나?"`,
                    items: [
                        { label: '아이템', after: activeRumor.item.name },
                        { label: '판매가', after: `${itemPrice.toLocaleString()} G` }
                    ]
                });
                (window as any).rumorAction = () => {
                    if (character.money < itemPrice) {
                        alert("골드가 부족하여 구매하지 못했습니다. 상인은 물건을 챙겨 떠나버렸습니다.");
                    } else {
                        const buyChar = { ...character };
                        buyChar.money -= itemPrice;
                        buyChar.inventory.push(activeRumor.item);
                        if (buyChar.mercenaryData) buyChar.mercenaryData.activeRumor = undefined;
                        onUpdateCharacter(buyChar, `[소문 추적] 암시장에서 ${activeRumor.item.name}을(를) 구매했습니다.`);
                        alert(`${activeRumor.item.name}을(를) 획득했습니다!`);
                    }
                    setResultData(null);
                };
            }
            // 2. 경쟁 용병과의 전투 (50%)
            else if (roll <= 75) {
                const mercGender = Math.random() > 0.5 ? "남성" : "여성";
                const mercGenderParam = mercGender === "남성" ? "male" : "female";
                const mercName = generateName(loc.nation, mercGenderParam);
                const enemyLevel = Math.max(character.level + 5, 50);
                const eStats = generateEnemyStats(enemyLevel);
                const type = SHINRYOKU_TYPES_LIST[Math.floor(Math.random() * SHINRYOKU_TYPES_LIST.length)];
                const className = (HUMANOID_CLASSES[type] || ["용병"])[0];
                 const rep = character.mercenaryData?.reputation || 0;
                const opponentLevel = Math.min(200, Math.floor(Math.random() * (rep/10)) + 10);
     const ranks = Object.values(MercenaryRank);
        // 레벨에 어느 정도 비례하는 등급 선정 (Lv 100 이상이면 최소 D급 이상 등)
        const minRankIdx = opponentLevel > 150 ? 5 : opponentLevel > 100 ? 3 : 0;
        const randomRankIdx = Math.floor(Math.random() * (ranks.length - minRankIdx)) + minRankIdx;
        const randomRank = ranks[randomRankIdx];

                // [NEW] 상대 용병을 과거 인연(socialNetwork)으로 등록
                const npcId = `rumor_merc_${Date.now()}`;
                const MBTI_LIST = ["INTJ", "INFJ", "ENTJ", "ENFJ", "ISTJ", "ISFJ", "ESTJ", "ESFJ", "ISTP", "ISFP", "ESTP", "ESFP", "INTP", "INFP", "ENTP", "ENFP"];
                const gender = Math.random() > 0.5 ? "남성" : "여성";
                const race = getRaceByNation(loc.nation);
                const mercNpc: SimpleStudent = assignRandomCombatStyle({
                    id: npcId,
                    name: mercName,
                    age: `${20 + Math.floor(Math.random() * 20)}세`,
                    birthYear: getYear(character.currentDate || '2000-01-01')  - (20 + Math.floor(Math.random() * 20)),
                    gender: gender,
                    nation: loc.nation,
                    level: enemyLevel,
                    classType:"용병",
                    race: race,
                    personality: MBTI_LIST[Math.floor(Math.random() * MBTI_LIST.length)],
                    appearance: `보물을 노리고 당신과 대치한 악명 높은 ${className}입니다.`,
                    stats: { ...eStats },
                    shinryokuType: type,
                    job: JobType.MERCENARY, 
                    mercenaryRank: randomRank, 
                    reputation: MERCENARY_RANK_THRESHOLD[randomRank], 
                    infamy: Math.floor(Math.random()*500+1),
                    affection: -50,
                    isRival: false,
                    visualUrl: generateDefaultVisualUrl(mercName, loc.nation, race, gender)
                }, true);

                if (!newChar.socialNetwork) newChar.socialNetwork = [];
                newChar.socialNetwork.push(mercNpc);

                const mercEnemy: Enemy = {
                    name: `${mercName}`,
                    visualUrl: mercNpc.visualUrl,
                    level: enemyLevel,
                    hp: eStats.maxHp * 4, // 보스급 보정
                    maxHp: eStats.maxHp * 4,
                    stats: { ...eStats, hp: eStats.maxHp * 4, maxHp: eStats.maxHp * 4 },
                    shinryokuType: type,
                    statusEffects: [],
                    description: `당신보다 먼저 보물을 손에 넣은 현지의 실력자입니다. "이건 내 거다. 목숨이 아깝다면 물러나시지!"`,
                    skills: [
                        {
                            name: "뒷골목의 일격",
                            description: "비열하고 강력한 공격입니다.",
                            type: SkillType.PHYSICAL,
                            tier: ClassTier.SECOND,
                            mpCost: 20,
                            level: 10,
                            maxLevel: 10,
                            currentMastery: 0,
                            effectFormula: "STR*3.0",
                            powerRatio: 300,
                            targetType: 'single'
                        }
                    ]
                };

                setResultData({
                    type: 'warning',
                    title: '경쟁자 출현!',
                    message: `보물이 숨겨진 장소에 도착했으나, 이미 '${mercName}'이(가) 물건을 챙긴 뒤였습니다!\n그는 당신을 비웃으며 무기를 꺼내듭니다.`,
                    items: [
                        { label: '상대', after: mercEnemy.name },
                        { label: '위험도', after: '매우 높음' }
                    ]
                });

                (window as any).rumorAction = () => {
                    setResultData(null);
                        // 소문 제거 후 전투 시작
                    const battleChar = { ...character };
                    if (battleChar.mercenaryData) battleChar.mercenaryData.activeRumor = undefined;
                    onUpdateCharacter(battleChar, "");
                    onBattle(mercEnemy, 'relation_battle', npcId);
                    onClose();
                };
            }
            // 3. 허탕 (25%)
            else {
                const finalChar = { ...character };
                if (finalChar.mercenaryData) finalChar.mercenaryData.activeRumor = undefined;
                onUpdateCharacter(finalChar, `[소문 추적] ${loc.city} 뒷골목을 샅샅이 뒤졌으나 보물은 이미 사라지고 없었습니다.`);
                setResultData({
                    type: 'failure',
                    title: '추적 실패 (허탕)',
                    message: `정보꾼: "이미 다른 녀석들이 털어간 모양이군. 한발 늦었어."`,
                    items: [{ label: '결과', after: '소문 소멸' }]
                });
                (window as any).rumorAction = () => setResultData(null);
            }
            setIsRumorProcessing(false);
        }, 1500);
    };

    const handleInvestigate = () => {
        if (blacklist.length === 0) {
            setResultData({
                type: 'warning',
                title: '수배 명단 없음',
                message: '정보꾼: "이보게, 지금 이 근방엔 수배된 놈들이 하나도 없는데 뭘 찾겠다는 건가? 용병 길드에 가서 전단지라도 좀 보고 오게나."',
                items: []
            });
            return;
        }

        if (character.money < investigationFee) {
            setResultData({
                type: 'warning',
                title: '자금 부족',
                message: '뒷골목 정보꾼에게 줄 정보비가 부족합니다.',
                items: [{ label: '필요 골드', after: `${investigationFee.toLocaleString()} G` }]
            });
            return;
        }

        setIsInvestigating(true);
        setTimeout(() => {
            const newChar = { ...character };
            newChar.money -= investigationFee;

            const { total } = calculateTotalStats(character);
            
            // 비용에 따른 기본 성공률 보정 (5000G: 40%, 15000G: 70%, 30000G: 90%)
            let baseRate = 40;
            if (investigationFee >= 30000) baseRate = 90;
            else if (investigationFee >= 15000) baseRate = 70;
            else if (investigationFee >= 10000) baseRate = 55;

            const successRate = Math.min(98, (total.wis + total.ctrl) * 0.05 + baseRate);
            const roll = Math.random() * 100;

            if (roll < successRate) {
                let selected: Criminal | undefined;
                
                // [NEW] 국왕의 칙명(블랙리스트) 대상 확인
                const kingQuests = [
                    ...(character.mercenaryData?.activeQuests || []),
                    ...(character.militaryData?.activeMissions || [])
                ].filter(q => q.id.startsWith('king_') && q.targetName);

                if (focusedCriminalId) {
                    selected = blacklist.find(c => c.id === focusedCriminalId);
                } else if (kingQuests.length > 0 && Math.random() < 0.5) {
                    // 국왕 의뢰 대상 우선 추적 (50% 확률)
                    const targetQuest = kingQuests[Math.floor(Math.random() * kingQuests.length)];
                    selected = blacklist.find(c => c.name === targetQuest.targetName);
                } else {
                    if (activeBountyCriminals.length > 0) {
                        selected = activeBountyCriminals[Math.floor(Math.random() * activeBountyCriminals.length)];
                    } else {
                        // 일반 수배범은 현재 국가 위주
                        const regionalPool = blacklist.filter(c => c.nation === loc.nation && c.infamy < 1000);
                        if (regionalPool.length > 0) {
                            selected = regionalPool[Math.floor(Math.random() * regionalPool.length)];
                        }
                    }
                }

                if (selected) {
                    // 국왕 의뢰 대상은 전 세계 어디든 있을 수 있음
                    const isKingTarget = kingQuests.some(q => q.targetName === selected?.name);
                    
                    let randomNation = loc.nation;
                    let randomCity = loc.city;

                    if (isKingTarget) {
                        const allNations = Object.keys(NATION_DATA);
                        randomNation = allNations[Math.floor(Math.random() * allNations.length)];
                        
                        let foundRegion = '아시아';
                        for (const [region, nations] of Object.entries(WORLD_GEOGRAPHY)) {
                            if ((nations as any)[randomNation]) {
                                foundRegion = region;
                                break;
                            }
                        }
                        const nationCities = (WORLD_GEOGRAPHY as any)[foundRegion]?.[randomNation]?.cities || ["수도"];
                        randomCity = nationCities[Math.floor(Math.random() * nationCities.length)];
                    } else {
                        const regionData = WORLD_GEOGRAPHY[loc.region];
                        const nationCities = regionData?.[loc.nation]?.cities || [loc.city];
                        let otherCities = nationCities.filter(c => c !== loc.city);
                        if (otherCities.length === 0) otherCities = [loc.city];
                        randomCity = otherCities[Math.floor(Math.random() * otherCities.length)];
                    }

                    newChar.mercenaryData = {
                        ...newChar.mercenaryData!,
                        trackedCriminalId: selected.id,
                        trackedCriminalCity: randomCity
                    };

                    const isMissionTarget = activeBountyQuests.some(q => q.targetName === selected?.name || q.id === `bounty_${selected?.id}` || q.id === `king_${selected?.id}`);
                    onUpdateCharacter(newChar, isMissionTarget 
                        ? `[뒷골목 첩보] 의뢰 대상 '${selected.name}'의 은신처가 확인되었습니다! (${randomNation} - ${randomCity})`
                        : `[뒷골목 첩보] 수배범 '${selected.name}'의 행방을 포착했습니다. (${randomCity})`);
                    
                    setResultData({
                        type: 'success',
                        title: isMissionTarget ? '목표 포착 (Target Locked)' : '추적 정보 확보',
                        message: isMissionTarget 
                            ? `정보꾼: "그 녀석을 쫓고 계셨군요. 지금 '${randomNation}'의 '${randomCity}'에 숨어있다는 첩보를 입수했습니다."`
                            : `정보꾼: "그놈이라면 지금 '${randomCity}' 근처에서 목격되었다는 소문이 있더군."`,
                        items: [
                            { label: '대상', after: selected.name },
                            { label: '국가', after: randomNation },
                            { label: '위치', after: randomCity },
                            { label: '성공률', after: `${successRate.toFixed(1)}%` }
                        ]
                    });
                } else {
                    onUpdateCharacter(newChar, `[뒷골목 첩보] 정보비를 지불했지만, 유효한 정보를 얻지 못했습니다.`);
                    setResultData({ type: 'info', title: '정보 부재', message: `정보꾼: "미안하지만 지금은 그놈의 꼬리가 전혀 잡히질 않네."`, items: [{ label: '성공률', after: `${successRate.toFixed(1)}%` }] });
                }
            } else {
                onUpdateCharacter(newChar, `[뒷골목 첩보] 정보비 ${investigationFee}G를 날리고 헛소문만 들었습니다.`);
                setResultData({ type: 'failure', title: '추적 실패', message: `정보꾼들이 돈만 챙기고 영양가 없는 소리만 늘어놓았습니다.`, items: [{ label: '성공률', after: `${successRate.toFixed(1)}%` }] });
            }
            setIsInvestigating(false);
            setFocusedCriminalId(null);
        }, 1200);
    };

    const handleInvestigateGreatCriminal = () => {
        let greatPool = blacklist.filter(c => c.infamy >= 1000);
        if (greatPool.length === 0) {
            setResultData({
                type: 'warning',
                title: '수배 명단 없음',
                message: '정보꾼: "이보게, 지금 용병 길드 블랙리스트에 대역죄인으로 올라온 놈이 없네. 길드에서 수배지가 갱신될 때까지 기다리게나."',
                items: []
            });
            return;
        }

        const greatFee = 25000;
        if ((character.money || 0) < greatFee) {
            setResultData({
                type: 'warning',
                title: '자금 부족',
                message: '대역죄인 정보는 매우 비쌉니다.',
                items: [{ label: '필요 골드', after: `${greatFee.toLocaleString()} G` }]
            });
            return;
        }

        setIsGreatInvestigating(true);
        setTimeout(() => {
            const newChar = { ...character };
            newChar.money -= greatFee;

            const { total } = calculateTotalStats(character);
            const successRate = Math.min(95, (total.wis + total.ctrl) * 0.03 + 30); // 대역죄인은 찾기 훨씬 힘듦
            const roll = Math.random() * 100;

            if (roll < successRate) {
                const selected = greatPool[Math.floor(Math.random() * greatPool.length)];
                
                // 대역죄인은 외국 도시에서도 발견될 수 있음
                const allNations = Object.keys(NATION_DATA);
                const randomNation = allNations[Math.floor(Math.random() * allNations.length)];
                
                let foundRegion = '아시아';
                for (const [region, nations] of Object.entries(WORLD_GEOGRAPHY)) {
                    if ((nations as any)[randomNation]) {
                        foundRegion = region;
                        break;
                    }
                }

                const nationCities = (WORLD_GEOGRAPHY as any)[foundRegion]?.[randomNation]?.cities || ["수도"];
                const randomCity = nationCities[Math.floor(Math.random() * nationCities.length)];

                newChar.mercenaryData = {
                    ...newChar.mercenaryData!,
                    trackedCriminalId: selected.id,
                    trackedCriminalCity: randomCity
                };

                onUpdateCharacter(newChar, `[뒷골목 극비 첩보] 전설적인 대역죄인 '${selected.name}'의 행방을 포착했습니다! (${randomNation} - ${randomCity})`);
                
                setResultData({
                    type: 'warning',
                    title: '대역죄인 포착 (High Value Target)',
                    message: `정보꾼: "이건 목숨을 걸고 구한 정보입니다. '${selected.name}'... 그 괴물이 지금 '${randomNation}'의 '${randomCity}'에 나타났다고 합니다. 부디 조심하십시오."`,
                    items: [
                        { label: '대상', after: selected.name },
                        { label: '국가', after: randomNation },
                        { label: '도시', after: randomCity },
                        { label: '위험도', after: 'S급 (재앙)' }
                    ]
                });
            } else {
                onUpdateCharacter(newChar, `[뒷골목 첩보] 거금을 들였지만 대역죄인의 흔적조차 찾지 못했습니다.`);
                setResultData({ type: 'failure', title: '추적 실패', message: `정보꾼: "그들은 그림자 같습니다. 아무리 돈을 써도 꼬리를 잡기가 쉽지 않군요."`, items: [] });
            }
            setIsGreatInvestigating(false);
        }, 2000);
    };

    const handleLaundry = () => {
        if (!currentLaundryTarget) return;
        const cost = laundryAmount * 10;
        const available = laundryCurrency === 'RP' ? currentLaundryTarget.rp : currentLaundryTarget.merit;

        if (available < cost) {
            alert(`${laundryCurrency}가 부족합니다.`);
            return;
        }

        const newChar = { ...character };
        const logMsg = `[악명 세탁] ${currentLaundryTarget.name}의 악명도를 ${laundryAmount}만큼 낮췄습니다. (${laundryCurrency} ${cost} 소모)`;

        if (currentLaundryTarget.type === 'player') {
            newChar.infamy = Math.max(0, (newChar.infamy || 0) - laundryAmount);
            if (laundryCurrency === 'RP' && newChar.mercenaryData) newChar.mercenaryData.reputation -= cost;
            if (laundryCurrency === 'Merit' && newChar.militaryData) newChar.militaryData.merit -= cost;
        } else {
            const updateC = (c: Companion) => {
                if (c.id === currentLaundryTarget.id) {
                    c.infamy = Math.max(0, (c.infamy || 0) - laundryAmount);
                    if (laundryCurrency === 'RP') c.reputation = Math.max(0, (c.reputation || 0) - cost);
                    if (laundryCurrency === 'Merit') (c as any).merit = Math.max(0, ((c as any).merit || 0) - cost);
                }
                return c;
            };
            newChar.companions = newChar.companions.map(updateC);
            if (newChar.inactiveCompanions) newChar.inactiveCompanions = newChar.inactiveCompanions.map(updateC);
        }

        onUpdateCharacter(newChar, logMsg);
        setResultData({
            type: 'success',
            title: '기록 말소 성공',
            message: `뒷골목의 연줄을 동원해 ${currentLaundryTarget.name}의 어두운 과거를 일부 지워냈습니다.`,
            items: [
                { label: '악명 감소', after: `-${laundryAmount}` },
                { label: `소모 ${laundryCurrency}`, after: `-${cost}` }
            ]
        });
        setLaundryAmount(1);
    };

    const handleCancelTracking = () => {
        const newChar = { ...character };
        newChar.mercenaryData = { ...newChar.mercenaryData!, trackedCriminalId: undefined, trackedCriminalCity: undefined };
        onUpdateCharacter(newChar, "[시스템] 현재 진행 중인 추적 정보를 파기했습니다.");
        setResultData({ type: 'info', title: '추적 취소', message: '진행 중이던 추적 정보를 폐기했습니다.', items: [] });
    };

    const handleStartBattle = () => {
        if (!trackedCriminal) return;
        const enemy = convertCriminalToEnemy(trackedCriminal);
        (enemy as any).isBountyTarget = true;
        (enemy as any).criminalData = trackedCriminal;
        const newChar = { ...character };
        newChar.mercenaryData = { ...newChar.mercenaryData!, trackedCriminalId: undefined, trackedCriminalCity: undefined };
        onUpdateCharacter(newChar, `[현장 급습] ${trackedCity}에서 ${trackedCriminal.name}의 은신처를 덮쳤습니다!`);
        onBattle(enemy, 'bounty_hunt');
        onClose();
    };

    const MBTI_OPTIONS = [
        "ISTJ (신중하고 성실함)", "ISFJ (용감하고 온화함)", "INFJ (통찰력 있고 신비함)", "INTJ (용의주도한 전략가)",
        "ISTP (만능 재주꾼)", "ISFP (호기심 많은 예술가)", "INFP (열정적인 중재자)", "INTP (논리적인 사색가)",
        "ESTP (모험을 즐기는 사업가)", "ESFP (자유로운 영혼)", "ENFP (재기발랄한 활동가)", "ENTP (뜨거운 논쟁을 즐김)",
        "ESTJ (엄격한 관리자)", "ESFJ (사교적인 외교관)", "ENFJ (정의로운 사회운동가)", "ENTJ (대담한 통솔자)"
    ];

    const handleInitContact = (rumor: WorldReaction) => {
        const level = 10 + Math.floor(Math.random() * 100 +10);
        const finalLevel = Math.max(1, level);
        const type = SHINRYOKU_TYPES_LIST[Math.floor(Math.random() * SHINRYOKU_TYPES_LIST.length)];
        const gender = Math.random() > 0.5 ? "남성" : "여성";
        const genderParam = gender === "남성" ? "male" : "female";
        const npcName = generateName(loc.nation, genderParam);
        const tier = getTierByLevel(finalLevel);

        let baseNpc: Companion = {
            id: rumor.id,
            name: npcName,
            age: `${20 + Math.floor(Math.random()*10)}세`,
            gender: gender,
            race: "인간",
            nation: loc.nation,
            appearance: rumor.authorTitle,
            personality: MBTI_OPTIONS[Math.floor(Math.random() * MBTI_OPTIONS.length)],
            classType: '모험가',
            job: JobType.UNEMPLOYED,
            level: finalLevel,
            currentExp: 0,
            maxExp: finalLevel * 100,
            statPoints: 0,
            classTier: tier,
            shinryokuType: type,
            stats: generateCompanionStats(finalLevel),
            skills: [],
            equipment: {},
            inventory: [],
            affection: 30,
            loyalty: 30,
            chatHistory: [{ role: 'companion', text: rumor.content }]
        };

        baseNpc = assignRandomCombatStyle(baseNpc, true, true);

        const currentTierClass = tier !== ClassTier.NONE ? getHumanoidClassByTier(type, tier, baseNpc.combatStyle) : '견습 모험가';
        baseNpc.classType = currentTierClass;

        if (tier === ClassTier.FIRST || tier === ClassTier.SECOND || tier === ClassTier.LAST || tier === ClassTier.FINAL) {
            baseNpc.firstClassName = (tier === ClassTier.FIRST) ? currentTierClass : getHumanoidClassByTier(type, ClassTier.FIRST, baseNpc.combatStyle);
            baseNpc.firstClassDescription = `${type || '무'} 계통의 1차 클래스 각성`;
        }
        if (tier === ClassTier.SECOND || tier === ClassTier.LAST || tier === ClassTier.FINAL) {
            baseNpc.secondClassName = (tier === ClassTier.SECOND) ? currentTierClass : getHumanoidClassByTier(type, ClassTier.SECOND, baseNpc.combatStyle);
            baseNpc.secondClassDescription = `${type || '무'} 계통의 2차 클래스 심화`;
        }
        if (tier === ClassTier.LAST || tier === ClassTier.FINAL) {
            baseNpc.lastClassName = (tier === ClassTier.LAST) ? currentTierClass : getHumanoidClassByTier(type, ClassTier.LAST, baseNpc.combatStyle);
            baseNpc.lastClassDescription = `${type || '무'} 계통의 3차 클래스 극의`;
        }
        if (tier === ClassTier.FINAL) {
            baseNpc.finalClassName = currentTierClass;
            baseNpc.finalClassDescription = `${type || '무'} 계통의 궁극 클래스 도달`;
        }

        setContactingNpc(baseNpc);
        setChatInput('');
    };

    const handleSendMessage = async () => {
        if (!chatInput.trim() || !contactingNpc || isChatting) return;
        const msg = chatInput;
        setChatInput('');
        setIsChatting(true);
        
        try {
            const reply = await chatWithCompanion(contactingNpc, msg, character);
            const cleanReply = reply.replace(/\[(AFF|LOY)[+-]\d+\]/g, '').trim();
            const affMatch = reply.match(/\[AFF([+-]\d+)\]/);
            const nextAff = affMatch ? Math.min(100, Math.max(-100, contactingNpc.affection + parseInt(affMatch[1]))) : contactingNpc.affection;

            setContactingNpc({
                ...contactingNpc,
                affection: nextAff,
                chatHistory: [...(contactingNpc.chatHistory || []), { role: 'user', text: msg }, { role: 'companion', text: cleanReply }]
            });
        } finally {
            setIsChatting(false);
        }
    };

    const handleTryRecruit = () => {
        if (!contactingNpc) return;
          const playerAge = parseInt(character.age.replace(/[^0-9]/g, '')) || 0;
        if (playerAge < 20) {
            alert("뒷골목에서의 인연 영입은 만 20세 이상 성인부터 가능합니다.");
            return;
        }
        if (character.companions.length >= MAX_PARTY_SIZE) return alert("파티원이 가득 찼습니다.");

        const successChance = 20 + (contactingNpc.affection * 0.5);
        const roll = Math.random() * 100;
        
        if (roll < successChance) {
            const newChar = { ...character };
            newChar.companions.push(assignRandomCombatStyle(contactingNpc));
            newChar.savedReactions = (newChar.savedReactions || []).filter(r => r.id !== contactingNpc.id);
            onUpdateCharacter(newChar, `[소문 속 인연] 뒷골목에서 만난 '${contactingNpc.name}'을(를) 동료로 영입했습니다.`);
            setResultData({
                type: 'success',
                title: '영입 성공',
                message: `${contactingNpc.name}: "좋아, 네가 말한 그 목표... 함께 쫓아보도록 하지."`,
                items: [{ label: '대상', after: contactingNpc.name }, { label: '상태', after: '파티 합류' }]
            });
            setContactingNpc(null);
        } else {
            setResultData({
                type: 'failure',
                title: '영입 실패',
                message: `${contactingNpc.name}: "아직은 너를 완전히 믿기 힘들군. 나중에 다시 이야기하자고."`,
                items: [{ label: '성공 확률', after: `${successChance.toFixed(1)}%` }]
            });
            setContactingNpc(prev => prev ? { ...prev, affection: Math.max(0, prev.affection - 10) } : null);
        }
    };

    const handleBuyNightMarketItem = (targetItem: NightMarketItem) => {
        if (targetItem.stock <= 0) {
            alert(`해당 물품의 이달 재고가 모두 소진되었습니다.\n다음 달 1일 심야(22:00~04:00)에 새로운 물품이 입고됩니다.`);
            return;
        }

        if ((character.money || 0) < targetItem.price) {
            alert('골드가 부족하여 구매할 수 없습니다.');
            return;
        }

        const newChar = { ...character };
        newChar.money = (newChar.money || 0) - targetItem.price;

        // 월간 구매 이력 갱신 (한 달 1회 갱신 보존)
        const activeMonth = (character.currentDate || '2000-03-02').slice(0, 7);
        const existingPurchases = (character.nightMarketMonthlyHistory?.month === activeMonth)
            ? { ...(character.nightMarketMonthlyHistory.purchases || {}) }
            : {};
        
        const updatedPurchases = {
            ...existingPurchases,
            [targetItem.item.name]: (existingPurchases[targetItem.item.name] || 0) + 1
        };

        newChar.nightMarketMonthlyHistory = {
            month: activeMonth,
            purchases: updatedPurchases
        };

        // 구매 시점에는 아이템만 가방(인벤토리)에 보관하며, 능력치나 자원은 가방에서 "사용하기" 시 발동합니다.
        newChar.inventory = [...(newChar.inventory || []), { ...targetItem.item }];

        const nextDays = getRemainingDaysInMonth(character.currentDate);
        const modalItems: { label: string; after: string }[] = [
            { label: '구매 품목', after: targetItem.item.name },
            { label: '소모 골드', after: `-${targetItem.price.toLocaleString()} G` },
            { label: '보관 장소', after: '가방(인벤토리)' },
            { label: '이달 잔여 재고', after: `${Math.max(0, targetItem.stock - 1)}개` },
            { label: '다음 재입고', after: `다음 달 1일 (${nextDays}일 후)` },
            { label: '남은 골드', after: `${newChar.money.toLocaleString()} G` }
        ];

        // 로컬 재고 감소
        setNightMarketStock(prev =>
            prev.map(it => it.id === targetItem.id ? { ...it, stock: Math.max(0, it.stock - 1) } : it)
        );

        const logMsg = `[심야 암시장] '${targetItem.item.name}' 구매 (${targetItem.price.toLocaleString()}G) - 이달 구매 완료.`;
        onUpdateCharacter(newChar, logMsg);

        setResultData({
            type: 'success',
            title: '암시장 거래 완료',
            message: `밀수꾼: "크큭... 이 물건의 진가를 아는 자에게 넘어가 다행이군. 암시장 물품은 매월 1회만 한정 입고되니, 가방(인벤토리)에서 신중히 사용하게나."`,
            items: modalItems
        });
    };

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/90 backdrop-blur-sm p-2 xs:p-4 animate-in fade-in">
            {resultData && (
                <ActionResultModal 
                    data={resultData} 
                    onClose={() => setResultData(null)} 
                    onContinue={(window as any).rumorAction}
                />
            )}

            <div className="bg-slate-900 border-2 border-red-900/50 w-full max-w-3xl h-[90vh] xs:h-[85vh] rounded-3xl shadow-[0_0_50px_rgba(220,38,38,0.2)] flex flex-col overflow-hidden relative">
                <div className="absolute inset-0 bg-gradient-to-br from-red-950/20 via-transparent to-slate-900 pointer-events-none"></div>

                <div className="p-4 xs:p-6 border-b border-red-900/30 bg-red-950/20 flex justify-between items-center shrink-0 z-10">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-2xl bg-red-950/80 border border-red-700/60 text-red-400">
                            {isNight ? <Moon size={24} className="animate-pulse text-purple-400" /> : <Search size={24} className="animate-pulse" />}
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-lg xs:text-xl font-bold text-white font-cinzel">뒷골목 정보망 및 심야 암시장</h2>
                                {isNight ? (
                                    <span className="text-[10px] font-black text-purple-300 bg-purple-950 px-2 py-0.5 rounded-full border border-purple-500/60 animate-pulse">
                                        심야 활성화 (22:00~04:00)
                                    </span>
                                ) : (
                                    <span className="text-[10px] font-bold text-slate-400 bg-slate-950 px-2 py-0.5 rounded-full border border-slate-800">
                                        주간 한산함
                                    </span>
                                )}
                            </div>
                            <p className="text-xs text-slate-400">{loc.city}의 은밀한 암시장, 첩보 및 세탁 구역</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-white p-2 rounded-full hover:bg-slate-800 transition-colors" aria-label="닫기"><X size={20}/></button>
                </div>

                <div className="flex bg-slate-950 shrink-0 border-b border-slate-800 z-10 overflow-x-auto no-scrollbar">
                    <button 
                        onClick={() => setActiveMode('night_market')} 
                        className={`py-3 px-3.5 xs:px-4 text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                            activeMode === 'night_market' 
                                ? 'bg-purple-950/60 text-purple-300 border-b-2 border-purple-500 shadow-inner' 
                                : 'text-purple-400/70 hover:text-purple-300'
                        }`}
                    >
                        <Gem size={14} className={isNight ? 'animate-bounce text-purple-400' : ''} />
                        <span>심야 암시장</span>
                        {isNight && <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-ping"></span>}
                    </button>
                    <button onClick={() => setActiveMode('investigate')} className={`py-3 px-3.5 xs:px-4 text-xs font-bold transition-all whitespace-nowrap ${activeMode === 'investigate' ? 'bg-red-900/30 text-red-400 border-b-2 border-red-500' : 'text-slate-500 hover:text-slate-300'}`}>수배범 추적</button>
                    <button onClick={() => setActiveMode('rumor')} className={`py-3 px-3.5 xs:px-4 text-xs font-bold transition-all whitespace-nowrap ${activeMode === 'rumor' ? 'bg-amber-900/30 text-amber-400 border-b-2 border-amber-500' : 'text-slate-500 hover:text-slate-300'}`}>소문 확인</button>
                    <button onClick={() => setActiveMode('contact')} className={`py-3 px-3.5 xs:px-4 text-xs font-bold transition-all whitespace-nowrap ${activeMode === 'contact' ? 'bg-green-900/30 text-green-400 border-b-2 border-green-500' : 'text-slate-500 hover:text-slate-300'}`}>인물 접선</button>
                    <button onClick={() => setActiveMode('laundry')} className={`py-3 px-3.5 xs:px-4 text-xs font-bold transition-all whitespace-nowrap ${activeMode === 'laundry' ? 'bg-indigo-900/30 text-indigo-400 border-b-2 border-indigo-500' : 'text-slate-500 hover:text-slate-300'}`}>악명 세탁</button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 xs:p-6 z-10 custom-scrollbar">
                    {/* [NEW] 심야 암시장 탭 */}
                    {activeMode === 'night_market' && (
                        <div className="space-y-6 animate-in fade-in">
                            <div className="bg-gradient-to-r from-purple-950/80 via-slate-950 to-red-950/70 p-5 xs:p-6 rounded-3xl border border-purple-500/40 relative overflow-hidden">
                                <div className="flex items-start justify-between">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="text-[10px] font-black text-amber-300 px-2 py-0.5 rounded-full bg-amber-950/80 border border-amber-600/60">
                                                심야 특별 거래소 (매월 1일 입고)
                                            </span>
                                            <span className="text-xs text-slate-400 font-mono">22:00 ~ 04:00</span>
                                            <span className="text-[10px] font-bold text-purple-300 bg-purple-900/50 px-2 py-0.5 rounded-md border border-purple-700/60">
                                                다음 갱신까지 {daysRemaining}일
                                            </span>
                                        </div>
                                        <h3 className="text-lg xs:text-xl font-black text-white">어두운 뒷골목 암시장</h3>
                                        <p className="text-xs sm:text-sm text-purple-200/90 leading-relaxed">
                                            일반 상점이 문을 닫는 심야 시간대에만 열리는 비밀 시장입니다. 매월 1일 극소량 입고되며, 잠재력 각성 영약, 칠흑의 만병통치약, 대량의 마정석 및 마석 묶음을 취급합니다.
                                        </p>
                                    </div>
                                    <div className="p-3 bg-purple-900/40 rounded-2xl border border-purple-500/50 text-purple-300 shrink-0 hidden sm:flex">
                                        <Moon size={28} className="animate-pulse" />
                                    </div>
                                </div>
                            </div>

                            {!isNight ? (
                                <div className="py-14 text-center text-slate-500 border-2 border-dashed border-slate-800 rounded-3xl p-6 space-y-3">
                                    <Clock size={48} className="mx-auto text-slate-600" />
                                    <h4 className="text-base font-bold text-slate-300">현재는 주간 시간대입니다</h4>
                                    <p className="text-xs text-slate-400 leading-relaxed max-w-md mx-auto">
                                        심야 암시장 상인과 밀수꾼들은 관헌들의 눈을 피해 <strong className="text-amber-400">밤 22:00부터 새벽 04:00</strong> 사이에만 좌전을 폅니다. 주간(08:00~20:00)에는 상업 지구의 일반 상점이나 용병 길드를 이용해 주십시오.
                                    </p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {nightMarketStock.map(item => (
                                        <div 
                                            key={item.id}
                                            className="p-4 rounded-2xl bg-slate-950/90 border border-purple-900/50 hover:border-purple-500/70 transition-all flex flex-col justify-between space-y-3 shadow-lg hover:shadow-purple-950/40"
                                        >
                                            <div className="space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-purple-950 text-purple-300 border border-purple-700/60">
                                                        {item.badge}
                                                    </span>
                                                    <span className={`text-[10px] font-bold ${item.stock > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                        {item.stock > 0 ? `이달 잔여: ${item.stock}개` : '이달 품절 (다음 달 입고)'}
                                                    </span>
                                                </div>

                                                <div className="flex items-start gap-3 pt-1">
                                                    <div className="w-12 h-12 rounded-xl bg-slate-900 border border-purple-800/60 overflow-hidden flex items-center justify-center shrink-0 p-1">
                                                        {item.item.imageUrl ? (
                                                            <img src={item.item.imageUrl} alt={item.item.name} className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                                                        ) : (
                                                            <Package size={22} className="text-purple-400" />
                                                        )}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <h4 className="text-sm xs:text-base font-black text-white group-hover:text-purple-300 leading-snug">
                                                            {item.item.name}
                                                        </h4>
                                                        <span className="text-[10px] font-mono text-purple-400">
                                                            {item.item.rarity} · {item.item.type === 'Consumable' ? '소비형' : item.item.type}
                                                        </span>
                                                    </div>
                                                </div>

                                                <p className="text-xs text-slate-400 leading-relaxed line-clamp-3">
                                                    {item.item.description}
                                                </p>
                                            </div>

                                            <div className="pt-2 border-t border-slate-900 flex items-center justify-between gap-2">
                                                <div className="flex items-center gap-1.5 text-amber-400 font-mono font-black text-sm">
                                                    <Coins size={14} />
                                                    <span>{item.price.toLocaleString()} G</span>
                                                </div>
                                                <button
                                                    onClick={() => handleBuyNightMarketItem(item)}
                                                    disabled={item.stock <= 0 || (character.money || 0) < item.price}
                                                    className="px-3.5 py-2 rounded-xl bg-purple-700 hover:bg-purple-600 disabled:bg-slate-800 disabled:text-slate-600 text-white font-bold text-xs transition-all active:scale-95 shadow-md flex items-center gap-1.5 shrink-0"
                                                >
                                                    <Sparkles size={13} />
                                                    <span>구매하기</span>
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* [NEW] 주점 뜬소문 추적 탭 */}
                    {activeMode === 'rumor' && (
                        <div className="space-y-6 animate-in fade-in">
                            <div className="bg-slate-950/80 p-6 rounded-3xl border border-amber-500/30 text-center relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-20 transition-all"><MessageCircle size={100} className="text-amber-500"/></div>
                                <Sparkles size={40} className="mx-auto text-amber-500 mb-3 animate-pulse" />
                                <h3 className="text-xl font-bold text-white mb-2">특별 뜬소문 추적</h3>
                                <p className="text-sm text-slate-400 leading-relaxed px-4">
                                    주점에서 들은 특정 아이템에 대한 소문을 단서로 조사를 시작합니다.<br/>
                                    운이 좋다면 암시장에서 바로 구매할 수 있지만, 누군가 먼저 선수쳤을 수도 있습니다.
                                </p>
                            </div>

                            {activeRumor ? (
                                <div className={`p-6 rounded-[2rem] border-2 transition-all ${isRumorCity ? 'bg-amber-900/10 border-amber-500 shadow-xl' : 'bg-slate-950 border-slate-800 opacity-60'}`}>
                                    <div className="flex justify-between items-start mb-6">
                                        <div className="flex items-center gap-4">
                                            <div className="w-14 h-14 rounded-2xl bg-slate-900 border border-amber-500/50 flex items-center justify-center shrink-0">
                                                <Package size={28} className="text-amber-400" />
                                            </div>
                                            <div>
                                                <h4 className="text-lg font-bold text-white">{activeRumor.item.name}</h4>
                                                <p className="text-xs text-amber-500 font-bold uppercase">{activeRumor.item.rarity} Grade</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mb-1">Target Location</div>
                                            <div className="flex items-center gap-1.5 text-sm font-bold text-white bg-black/40 px-3 py-1 rounded-full border border-white/10">
                                                <MapPin size={14} className="text-red-500"/> {activeRumor.city}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-black/30 p-4 rounded-2xl border border-white/5 mb-6">
                                        <p className="text-sm text-slate-300 italic leading-relaxed">"{activeRumor.description}"</p>
                                    </div>

                                    {!isRumorCity ? (
                                        <div className="p-4 bg-red-950/20 border border-red-900/30 rounded-2xl flex items-center gap-3">
                                            <AlertTriangle className="text-red-500" size={20}/>
                                            <p className="text-xs text-red-300">현재 소문이 발생한 도시에 있지 않습니다. 조사를 위해 **{activeRumor.city}**로 이동하십시오.</p>
                                        </div>
                                    ) : (
                                        <button 
                                            onClick={handleInvestigateRumor}
                                            disabled={isRumorProcessing}
                                            className="w-full py-4 bg-amber-600 hover:bg-amber-500 text-white font-black text-lg rounded-2xl shadow-xl shadow-amber-900/40 transition-all transform active:scale-95 flex items-center justify-center gap-3"
                                        >
                                            {isRumorProcessing ? <Loader2 size={24} className="animate-spin"/> : <Search size={24}/>}
                                            은신처 수색 개시
                                        </button>
                                    )}
                                </div>
                            ) : (
                                <div className="py-20 text-center text-slate-700 border-2 border-dashed border-slate-800 rounded-[2.5rem]">
                                    <Clock size={64} className="mx-auto mb-4 opacity-10" />
                                    <p className="text-lg font-bold">활성화된 소문 없음</p>
                                    <p className="text-xs mt-1">주점(시간 경과)에서 새로운 뜬소문을 들을 때까지 기다리십시오.</p>
                                </div>
                            )}
                        </div>
                    )}

                    {activeMode === 'investigate' && (
                        !trackedCriminal ? (
                            <div className="space-y-6 animate-in fade-in">
                                <div className="bg-slate-950/80 p-5 rounded-2xl border border-slate-800 text-center">
                                    <Compass size={40} className="mx-auto text-red-900 mb-2" />
                                    <h3 className="font-bold text-slate-200">범죄자 행방 추적</h3>
                                    <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                                        정보꾼들에게 골드를 지불하여 수배범의 은신처를 파악합니다.<br/>
                                        <span className="text-amber-500 font-bold">비용이 높을수록 정보의 정확도와 성공률이 상승합니다.</span>
                                    </p>

                                    <div className="mt-4 flex gap-2 justify-center">
                                        {[5000, 15000, 30000].map(fee => (
                                            <button 
                                                key={fee}
                                                onClick={() => setInvestigationFee(fee)}
                                                className={`px-4 py-2 rounded-lg text-[10px] font-bold transition-all border ${investigationFee === fee ? 'bg-red-900/40 border-red-500 text-white' : 'bg-slate-900 border-slate-800 text-slate-500 hover:border-slate-700'}`}
                                            >
                                                {fee.toLocaleString()} G
                                                <div className="opacity-50 font-normal">{fee === 5000 ? '기본' : fee === 15000 ? '전문' : '극비'}</div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1 flex items-center gap-2"><ShieldAlert size={14} className="text-indigo-400"/> 수배 중인 의뢰 대상 ({activeBountyCriminals.length})</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {activeBountyCriminals.map((criminal, idx) => (
                                            <button key={`${criminal.id}-${idx}`} onClick={() => setFocusedCriminalId(focusedCriminalId === criminal.id ? null : criminal.id)} className={`p-3 rounded-xl border text-left transition-all flex items-center gap-3 ${focusedCriminalId === criminal.id ? 'bg-indigo-900/30 border-indigo-500 shadow-md' : 'bg-slate-900 border border-slate-800 hover:border-slate-700'}`}>
                                                <div className="w-10 h-10 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0 overflow-hidden">
                                                    {criminal.visualUrl ? <img src={criminal.visualUrl} className="w-full h-full object-cover opacity-70" alt=""/> : <User size={20} className="text-slate-600" />}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <span className="text-sm font-bold text-slate-200 truncate block">{criminal.name}</span>
                                                    <span className="text-[9px] text-slate-500 uppercase">{criminal.title}</span>
                                                </div>
                                                {focusedCriminalId === criminal.id && <CheckCircle size={16} className="text-indigo-400"/>}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <button onClick={handleInvestigate} disabled={isInvestigating || isGreatInvestigating} className="py-4 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-xl font-bold shadow-lg transition-all flex flex-col items-center justify-center gap-1">
                                        <div className="flex items-center gap-2">
                                            {isInvestigating ? <Loader2 size={18} className="animate-spin"/> : <Search size={18} className="text-amber-500"/>} 
                                            <span>수배범 추적 개시</span>
                                        </div>
                                        <span className="text-[10px] text-slate-500">{investigationFee.toLocaleString()} G 소모</span>
                                    </button>
                                    <button onClick={handleInvestigateGreatCriminal} disabled={isInvestigating || isGreatInvestigating} className="py-4 bg-red-950/30 hover:bg-red-900/40 border border-red-900/30 text-red-200 rounded-xl font-bold shadow-lg transition-all flex flex-col items-center justify-center gap-1">
                                        <div className="flex items-center gap-2">
                                            {isGreatInvestigating ? <Loader2 size={18} className="animate-spin"/> : <Skull size={18} className="text-red-500"/>} 
                                            <span>대역죄인 추적</span>
                                        </div>
                                        <span className="text-[10px] text-red-900/70">25,000 G</span>
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center space-y-6 py-4 animate-in zoom-in-95">
                                <div className="w-full max-w-sm bg-[#f4e4bc] border-4 border-[#8b4513] rounded-sm p-5 shadow-2xl text-center">
                                    <div className="text-3xl font-black text-[#3b1f0b] font-cinzel border-b-2 border-[#8b4513] pb-2 mb-4">WANTED</div>
                                    <div className="w-32 h-32 mx-auto bg-[#d2b48c] border-2 border-[#8b4513] mb-4 overflow-hidden grayscale">
                                        {trackedCriminal.visualUrl ? <img src={trackedCriminal.visualUrl} className="w-full h-full object-cover mix-blend-multiply" alt=""/> : <div className="w-full h-full flex items-center justify-center text-4xl opacity-20">👤</div>}
                                    </div>
                                    <h3 className="text-xl font-black text-[#3b1f0b]">{trackedCriminal.name}</h3>
                                    <div className="mt-4 flex flex-col items-center gap-1 text-sm font-bold text-[#5d3a1a]">
                                        <div className="flex items-center gap-1"><MapPin size={14}/> {trackedCity} 목격됨</div>
                                        {isAtTargetCity && <div className="px-2 py-0.5 bg-red-700 text-white text-[8px] rounded-full animate-pulse">현재 도시</div>}
                                    </div>
                                </div>
                                <div className="w-full max-w-sm flex flex-col gap-2">
                                    {isAtTargetCity ? <button onClick={handleStartBattle} className="w-full py-4 bg-red-700 hover:bg-red-600 text-white font-bold rounded-2xl shadow-xl flex items-center justify-center gap-2 animate-pulse"><Crosshair size={20}/> 은신처 기습</button> : <div className="text-center p-3 bg-indigo-950/40 rounded-xl text-xs text-indigo-200 border border-indigo-500/30">대상은 {trackedCity}에 있습니다. 이동하십시오.</div>}
                                    <button onClick={handleCancelTracking} className="py-2 text-slate-500 hover:text-red-400 text-xs font-bold">추적 중단</button>
                                </div>
                            </div>
                        )
                    )}

                    {activeMode === 'contact' && (
                        contactingNpc ? (
                            <div className="h-full flex flex-col overflow-hidden animate-in slide-in-from-bottom-4">
                                <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 mb-4 flex justify-between items-center">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 rounded-full bg-slate-900 border border-green-500/50 flex items-center justify-center text-2xl">👤</div>
                                        <div>
                                            <h4 className="font-bold text-white">{contactingNpc.name}</h4>
                                            <p className="text-[10px] text-green-400 font-bold uppercase">{contactingNpc.classType} • Lv.{contactingNpc.level}</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={handleTryRecruit} className="px-4 py-2 bg-green-700 hover:bg-green-600 text-white rounded-xl text-xs font-bold shadow-lg transition-all flex items-center gap-2">
                                            <UserPlus size={14}/> 영입 제의
                                        </button>
                                        <button onClick={() => setContactingNpc(null)} className="p-2 bg-slate-800 text-slate-400 rounded-xl"><X size={16}/></button>
                                    </div>
                                </div>

                                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 mb-4 bg-black/20 p-4 rounded-3xl border border-white/5">
                                    {contactingNpc.chatHistory?.map((msg, i) => (
                                        <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                                            <div className={`max-w-[85%] p-3 rounded-2xl text-sm ${msg.role === 'user' ? 'bg-indigo-700 text-white' : 'bg-slate-800 text-slate-200 border border-slate-700'}`}>
                                                {msg.text}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="relative">
                                    <input 
                                        type="text" 
                                        value={chatInput}
                                        onChange={e => setChatInput(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                                        placeholder={isChatting ? "반응을 살피는 중..." : "설득할 말을 입력하세요..."}
                                        disabled={isChatting}
                                        className="w-full bg-slate-950 border border-slate-700 rounded-full py-3 px-6 text-sm text-white outline-none focus:border-green-500 shadow-inner"
                                    />
                                    <button 
                                        onClick={handleSendMessage}
                                        disabled={!chatInput.trim() || isChatting}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-green-600 text-white rounded-full transition-all disabled:opacity-30"
                                    >
                                        {isChatting ? <Loader2 size={18} className="animate-spin"/> : <Send size={18}/>}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-6 animate-in fade-in">
                                <div className="bg-slate-950/80 p-5 rounded-2xl border border-slate-800 text-center">
                                    <Users size={40} className="mx-auto text-green-700 mb-2" />
                                    <h3 className="font-bold text-slate-200">인물 접선 (Meet Contact)</h3>
                                    <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                                        이 도시의 뒷골목을 방문하기로 한 소문 속 인물들을 만납니다.<br/>
                                        <span className="text-green-400">게시판에서 저장한 영입 소문글</span>이 있다면 이곳에 나타납니다.
                                    </p>
                                </div>

                                <div className="grid grid-cols-1 gap-3">
                                    {rumoredContacts.map((rumor, idx) => (
                                        <button 
                                            key={`${rumor.id}-${idx}`}
                                            onClick={() => handleInitContact(rumor)}
                                            className="w-full p-4 bg-slate-950 border border-slate-800 hover:border-green-500 rounded-2xl text-left transition-all group flex justify-between items-center"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="p-3 bg-slate-900 rounded-full border border-slate-800 group-hover:border-green-500/50">
                                                    <User className="text-slate-500 group-hover:text-green-400" size={24}/>
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-white text-lg">{rumor.author}</h4>
                                                    <p className="text-xs text-slate-500 truncate w-48">"{rumor.title}"</p>
                                                </div>
                                            </div>
                                            <ArrowRight className="text-slate-700 group-hover:text-green-500 group-hover:translate-x-1 transition-all"/>
                                        </button>
                                    ))}
                                    {rumoredContacts.length === 0 && (
                                        <div className="py-20 text-center text-slate-700 border-2 border-dashed border-slate-800 rounded-3xl">
                                            <Sparkles size={48} className="mx-auto mb-2 opacity-10"/>
                                            <p className="text-sm italic">현재 접선 대기 중인 인물이 없습니다.</p>
                                            <p className="text-[10px] mt-1 text-slate-500">'세상의 소리'에서 구인 게시물을 저장한 뒤 방문하십시오.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )
                    )}

                    {activeMode === 'laundry' && (
                        <div className="space-y-8 animate-in fade-in">
                            <div className="bg-indigo-950/20 p-5 rounded-2xl border border-indigo-500/30">
                                <h3 className="font-bold text-indigo-400 flex items-center gap-2 mb-2"><Gavel size={20}/> 기록 말소 및 악명 세탁</h3>
                                <p className="text-xs text-slate-400 leading-relaxed">
                                    명성치(RP)나 군사 공훈치(Merit)를 대가로 전과 기록을 지워냅니다.<br/>
                                    <span className="text-amber-500 font-bold">비율: 10 RP/Merit → 악명 1 감소</span>
                                </p>
                            </div>

                            <div className="space-y-4">
                                <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest px-1">대상 캐릭터 선택</label>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {laundryPotentials.map(p => (
                                        <button key={p.id} onClick={() => { setLaundryTargetId(p.id); setLaundryAmount(1); }} className={`p-4 rounded-2xl border text-left transition-all flex justify-between items-center ${laundryTargetId === p.id ? 'bg-indigo-900/40 border-indigo-500 shadow-md' : 'bg-slate-900 border border-slate-800 hover:border-slate-700'}`}>
                                            <div className="min-w-0">
                                                <div className="font-bold text-white truncate">{p.name}</div>
                                                <div className="flex gap-2 mt-1">
                                                    <span className="text-[9px] text-red-400 font-bold bg-red-950/20 px-1.5 rounded border border-red-900/30">악명: {p.infamy}</span>
                                                    <span className="text-[9px] text-amber-500 bg-amber-950/20 px-1.5 rounded border border-amber-900/30">RP: {p.rp}</span>
                                                    <span className="text-[9px] text-blue-400 bg-blue-950/20 px-1.5 rounded border border-blue-900/30">Merit: {p.merit}</span>
                                                </div>
                                            </div>
                                            {laundryTargetId === p.id && <UserCheck size={18} className="text-indigo-400"/>}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {currentLaundryTarget && currentLaundryTarget.infamy > 0 && (
                                <div className="bg-slate-950 p-6 rounded-3xl border border-slate-800 space-y-6 animate-in slide-in-from-bottom-2">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-xs text-slate-500 font-bold uppercase tracking-widest">Laundering Amount (세탁량)</span>
                                        <span className="text-xl font-mono font-bold text-indigo-400">{laundryAmount}</span>
                                    </div>
                                    
                                    <input 
                                        type="range" 
                                        min="1" 
                                        max={Math.min(currentLaundryTarget.infamy, Math.floor((laundryCurrency === 'RP' ? currentLaundryTarget.rp : currentLaundryTarget.merit) / 10))} 
                                        value={laundryAmount} 
                                        onChange={(e) => setLaundryAmount(parseInt(e.target.value))}
                                        className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                                        disabled={(laundryCurrency === 'RP' ? currentLaundryTarget.rp : currentLaundryTarget.merit) < 10}
                                    />

                                    <div className="flex gap-2">
                                        <button onClick={() => { setLaundryCurrency('RP'); setLaundryAmount(1); }} className={`flex-1 py-2 text-[10px] font-bold rounded-lg border transition-all ${laundryCurrency === 'RP' ? 'bg-amber-900/40 border-amber-500 text-amber-200' : 'bg-slate-900 border border-slate-700 text-slate-500'}`}><Award size={12} className="inline mr-1"/> Use RP (명성)</button>
                                        <button onClick={() => { setLaundryCurrency('Merit'); setLaundryAmount(1); }} className={`flex-1 py-2 text-[10px] font-bold rounded-lg border transition-all ${laundryCurrency === 'Merit' ? 'bg-blue-900/40 border-blue-500 text-blue-200' : 'bg-slate-900 border border-slate-700 text-slate-500'}`}><Medal size={12} className="inline mr-1"/> Use Merit (공훈)</button>
                                    </div>

                                    <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 flex justify-between items-center">
                                        <div>
                                            <div className="text-[10px] text-slate-500 uppercase">Cost ({laundryCurrency})</div>
                                            <div className="text-lg font-bold text-white font-mono">{laundryAmount * 10}</div>
                                        </div>
                                        <ArrowRight className="text-slate-700"/>
                                        <div className="text-right">
                                            <div className="text-[10px] text-slate-500 uppercase">New Infamy</div>
                                            <div className="text-lg font-bold text-green-400 font-mono">{currentLaundryTarget.infamy - laundryAmount}</div>
                                        </div>
                                    </div>

                                    <button onClick={handleLaundry} disabled={laundryAmount <= 0} className="w-full py-4 bg-indigo-700 hover:bg-indigo-600 disabled:bg-slate-800 disabled:text-slate-600 text-white font-bold rounded-2xl shadow-xl transition-all flex items-center justify-center gap-2">
                                        <TrendingDown size={20}/> 기록 말소 수행
                                    </button>
                                </div>
                            )}

                            {currentLaundryTarget && currentLaundryTarget.infamy <= 0 && (
                                <div className="py-10 text-center text-slate-600">
                                    <CheckCircle size={40} className="mx-auto mb-2 opacity-20"/>
                                    <p className="text-sm italic">지워낼 과거가 없는 깨끗한 대원입니다.</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="p-4 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-400 font-bold px-4 xs:px-8 shrink-0">
                    <div className="flex items-center gap-2"><ShieldAlert size={12} className="text-red-400"/><span>뒷골목 단말기 접속 중</span></div>
                    <div className="flex items-center gap-1 text-amber-400"><Coins size={12}/> {(character.money || 0).toLocaleString()} G</div>
                </div>
            </div>
        </div>
    );
};

export default BackAlleyModal;
