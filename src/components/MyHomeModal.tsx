
import React, { useState, useEffect } from 'react';
import { Character, Companion, ClassTier, PregnancyData, RelationType, HouseType } from '../types';
import { X, Heart, MessageCircle, Moon, Coffee, Home, Sparkles, LogOut, Baby, Shield, Smile, GitBranch, UserPlus, Zap, ArrowUpCircle } from 'lucide-react';
import { addDays, generateName, extractSurname, generateNameWithSurname, getYear, calculateFinalStats } from '../utils';
import ActionResultModal, { ResultData } from './ActionResultModal';
import ChildCareModal from './ChildCareModal';
import FamilyTreeModal from './FamilyTreeModal';
import { advanceGameTime, getTimeOfDay } from '../services/gameTimeService';
import { syncAllSiblingRelations } from '../services/siblingService';
import { canStartRomance, getRomanceEthicsNotice } from '../services/romanceEthicsService';

interface Props {
    character: Character;
    instanceId?: string;
    onClose: () => void;
    onUpdateCharacter: (newChar: Character, logMsg: string, dailyReport?: any) => void;
    onFacilityUpgrade?: (facilityId: string, instanceId?: string) => void;
}

interface BirthEvent {
    isPlayer: boolean;
    parentName: string;
    spouseName: string; 
    childGender: '남성' | '여성';
    childRace: string;
    defaultName: string;
    targetId?: string; 
}

const MyHomeModal: React.FC<Props> = ({ character, instanceId, onClose, onUpdateCharacter, onFacilityUpgrade }) => {
    const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
    const [resultData, setResultData] = useState<ResultData | null>(null);
    const [isFamilyTreeOpen, setIsFamilyTreeOpen] = useState(false);
    
    const [isMatchmakingOpen, setIsMatchmakingOpen] = useState(false);
    const [matchSlot1, setMatchSlot1] = useState<Companion | null>(null);
    const [matchSlot2, setMatchSlot2] = useState<Companion | null>(null);

    const [birthEvent, setBirthEvent] = useState<BirthEvent | null>(null);
    const [babyName, setBabyName] = useState('');

    const [isChildCareOpen, setIsChildCareOpen] = useState(false);

    const currentInstance = character.base?.layout?.find(inst => inst.id === instanceId);
    const facilityLevel = currentInstance ? currentInstance.level : (character.base?.facilityLevels?.['my_home'] || 1);

    const houses = character.base?.houses || [];
    const myHomeData = houses.find(h => h.id === 'my_home_default' || h.type === HouseType.MY_HOME) || {
        id: 'my_home_default',
        type: HouseType.MY_HOME,
        name: '나의 집',
        capacity: 4,
        level: facilityLevel,
        cleanliness: 100,
        createdAt: character.currentDate
    };

    const handleUpgradeMyHome = () => {
        if (!character.base) return;
        const currentLevel = myHomeData.level;
        const nextLevel = currentLevel + 1;

        if (currentLevel >= 5) {
            alert("이미 최대 증축 단계(Lv.5)입니다.");
            return;
        }

        const costGold = 10000 * currentLevel;
        const costWood = 200 * currentLevel;
        const costStone = 200 * currentLevel;
        const costMana = currentLevel >= 3 ? 100 * (currentLevel - 2) : 0;

        const res = character.base.resources;
        if (!res) return;

        const woodOwned = res.wood || 0;
        const stoneOwned = res.stone || 0;
        const manaOwned = res.manaCrystal || 0;

        if (
            character.money < costGold ||
            woodOwned < costWood ||
            stoneOwned < costStone ||
            manaOwned < costMana
        ) {
            alert(`자원이 부족합니다!\n필요 골드: ${costGold.toLocaleString()}G, 목재: ${costWood}, 석재: ${costStone}${costMana > 0 ? `, 마정석: ${costMana}` : ''}`);
            return;
        }

        // 1. houses 배열 업데이트
        const updatedHouses = [...(character.base.houses || [])];
        const hIdx = updatedHouses.findIndex(h => h.id === 'my_home_default' || h.type === HouseType.MY_HOME);

        let newType = myHomeData.type;
        let newCapacity = myHomeData.capacity + 2;
        let newName = myHomeData.name;

        if (nextLevel >= 3) {
            newType = HouseType.LUXURY;
            if (myHomeData.type === HouseType.MY_HOME) {
                newCapacity = 10; // 초호화 주택 수용 정원
                newName = "나의 초호화 대저택";
            } else {
                newCapacity = myHomeData.capacity + 2; // 추가 증축 수용력
            }
        } else {
            newCapacity = myHomeData.capacity + 2;
        }

        const updatedMyHome = {
            ...myHomeData,
            level: nextLevel,
            capacity: newCapacity,
            type: newType,
            name: newName,
            cleanliness: 100
        };

        if (hIdx !== -1) {
            updatedHouses[hIdx] = updatedMyHome;
        } else {
            updatedHouses.push(updatedMyHome);
        }

        // 2. 기지 레벨 업데이트
        const updatedFacilityLevels = { ...(character.base.facilityLevels || {}) };
        updatedFacilityLevels['my_home'] = nextLevel;

        const updatedLayout = character.base.layout?.map(inst => {
            if (inst.type === 'my_home') {
                return { ...inst, level: nextLevel };
            }
            return inst;
        }) || [];

        // 3. 자원 차감
        const updatedResources = {
            ...res,
            wood: woodOwned - costWood,
            stone: stoneOwned - costStone,
            manaCrystal: manaOwned - costMana
        } as any;

        const updatedChar: Character = {
            ...character,
            money: character.money - costGold,
            base: {
                ...character.base,
                houses: updatedHouses,
                facilityLevels: updatedFacilityLevels,
                layout: updatedLayout,
                resources: updatedResources
            }
        };

        const logMsg = `[나의 집 증축] 집을 Lv.${nextLevel}(으)로 성공적으로 증축했습니다! ${nextLevel >= 3 ? '(초호화 대저택으로 승급하여 정원이 10명으로 확대되었습니다!)' : '(수용 정원 +2명)'}`;
        onUpdateCharacter(updatedChar, logMsg);
        
        setResultData({
            type: 'levelup',
            title: '나의 집 증축 성공!',
            message: logMsg,
            items: [
                { label: '레벨', before: `Lv.${currentLevel}`, after: `Lv.${nextLevel}` },
                { label: '수용 정원', before: `${myHomeData.capacity}명`, after: `${newCapacity}명` }
            ]
        });
    };

    // [FIX] Added missing handleResultClose function to manage ActionResultModal state
    const handleResultClose = () => {
        setResultData(null);
    };

    const allCompanions = [...character.companions, ...(character.inactiveCompanions || [])];
    
    const spouses = allCompanions.filter(c => c.isSpouse && c.partnerId === 'player');
    const children = allCompanions.filter(c => c.classType?.includes('자녀') || c.classType?.includes('Child'));

    const houseAssignments = character.base?.houseAssignments || {};
    const otherResidents = allCompanions.filter(c => 
        (houseAssignments[c.id] === 'my_home_default' || (myHomeData && houseAssignments[c.id] === myHomeData.id)) && 
        !(c.isSpouse && c.partnerId === 'player') &&
        !(c.classType?.includes('자녀') || c.classType?.includes('Child'))
    );

    const selectedMember = allCompanions.find(c => c.id === selectedMemberId);
    const isSelectedChild = selectedMember && (selectedMember.classType?.includes('자녀') || selectedMember.classType?.includes('Child'));
    const isSpouse = selectedMember && spouses.some(s => s.id === selectedMember.id);

    const singles = allCompanions.filter(c => 
        !c.isLover && 
        !c.isSpouse && 
        !c.classType.includes('자녀') && 
        !c.classType.includes('Child') &&
        !c.isMonster &&
        !c.isDead
    );

    const isFemale = (g: string) => {
        if (!g) return false;
        const lower = g.trim().toLowerCase();
        return ['여성', '여자', 'female', 'woman', 'f', 'girl'].some(k => lower === k || lower.includes(k));
    };

    const isMale = (g: string) => {
        if (!g) return false;
        const lower = g.trim().toLowerCase();
        return ['남성', '남자', 'male', 'm', 'boy'].some(k => lower === k || lower.includes(k));
    };

    useEffect(() => {
        checkBirthDue();
    }, [character.currentDate, spouses]);

    const checkBirthDue = () => {
        if (birthEvent) return;

        const currentDate = character.currentDate || '2000-01-01';
        
        if (character.pregnancy && character.pregnancy.isPregnant && currentDate >= character.pregnancy.dueDate) {
            triggerBirth(true, character, character.pregnancy.partnerName || "배우자");
            return;
        }

        const pregnantSpouse = spouses.find(s => 
            s.pregnancy && s.pregnancy.isPregnant && currentDate >= s.pregnancy.dueDate
        );

        if (pregnantSpouse) {
            triggerBirth(false, pregnantSpouse, character.name);
            setSelectedMemberId(pregnantSpouse.id);
        }
    };

    const triggerBirth = (isPlayerMother: boolean, mother: Character | Companion, spouseName: string) => {
        const gender: '남성' | '여성' = Math.random() < 0.5 ? '남성' : '여성';
        
        let childRace = character.race;
        let fatherName = "";
        let fatherNation = character.nation;

        if (isPlayerMother) {
            const partnerId = character.pregnancy?.partnerId;
            const partner = spouses.find(s => s.id === partnerId);
            const fatherRace = partner ? partner.race : character.race;
            const races = [character.race, fatherRace];
            childRace = races[Math.floor(Math.random() * races.length)];
            
            fatherName = spouseName;
            fatherNation = partner?.nation || character.nation;
        } else {
            const races = [(mother as Companion).race, character.race];
            childRace = races[Math.floor(Math.random() * races.length)];

            if (isMale(character.gender)) {
                fatherName = character.name;
                fatherNation = character.nation;
            } else {
                fatherName = spouseName;
            }
        }

        const fatherSurname = extractSurname(fatherName, fatherNation);
        const generatedName = generateNameWithSurname(fatherSurname, fatherNation, gender === '남성' ? 'male' : 'female');
        
        setBirthEvent({
            isPlayer: isPlayerMother,
            parentName: mother.name,
            spouseName: spouseName,
            childGender: gender,
            childRace: childRace,
            defaultName: generatedName,
            targetId: isPlayerMother ? undefined : (mother as Companion).id
        });
        setBabyName(generatedName);
    };

    const generateBabyAppearance = (gender: string) => {
        const features = ["큰 눈망울", "오똑한 코", "부드러운 머릿결", "통통한 볼", "긴 속눈썹"];
        const eyes = ["검은색", "갈색", "푸른색", "초록색", "금색"];
        const hair = ["검은색", "갈색", "금발", "은발", "붉은색"];
        
        const f = features[Math.floor(Math.random() * features.length)];
        const e = eyes[Math.floor(Math.random() * eyes.length)];
        const h = hair[Math.floor(Math.random() * hair.length)];
        
        return `${e} 눈동자와 ${h} 머리카락을 가진, ${f}을 가졌습니다.`;
    };

    const handleBirthSubmit = () => {
        if (!birthEvent) return;

        const newChar = { ...character };
        newChar.companions = [...newChar.companions];
        if (newChar.inactiveCompanions) newChar.inactiveCompanions = [...newChar.inactiveCompanions];

        let birthDateStr = character.currentDate || '2000-01-01';
        let spouseToUpdate: Companion | null = null;

        if (birthEvent.isPlayer) {
            if (newChar.pregnancy?.dueDate) birthDateStr = newChar.pregnancy.dueDate;
            newChar.pregnancy = undefined;
            
            // Find player's spouse to update memory
            const partnerId = birthEvent.targetId || character.pregnancy?.partnerId;
            spouseToUpdate = allCompanions.find(c => c.id === partnerId) || null;
        } else if (birthEvent.targetId) {
            let targetSpouseIdx = newChar.companions.findIndex(c => c.id === birthEvent.targetId);
            if (targetSpouseIdx !== -1) {
                 if (newChar.companions[targetSpouseIdx].pregnancy?.dueDate) {
                     birthDateStr = newChar.companions[targetSpouseIdx].pregnancy!.dueDate;
                 }
                 newChar.companions[targetSpouseIdx] = { ...newChar.companions[targetSpouseIdx], pregnancy: undefined };
                 spouseToUpdate = newChar.companions[targetSpouseIdx];
            } else {
                targetSpouseIdx = newChar.inactiveCompanions?.findIndex(c => c.id === birthEvent.targetId) ?? -1;
                if (targetSpouseIdx !== -1 && newChar.inactiveCompanions) {
                    if (newChar.inactiveCompanions[targetSpouseIdx].pregnancy?.dueDate) {
                        birthDateStr = newChar.inactiveCompanions[targetSpouseIdx].pregnancy!.dueDate;
                    }
                    newChar.inactiveCompanions[targetSpouseIdx] = { ...newChar.inactiveCompanions[targetSpouseIdx], pregnancy: undefined };
                    spouseToUpdate = newChar.inactiveCompanions[targetSpouseIdx];
                }
            }
        }

        const birthYear = parseInt(birthDateStr?.split('-')[0] || '2000');
        const finalBabyName = babyName || birthEvent.defaultName;
        const MBTI_LIST = ["INTJ", "INFJ", "ENTJ", "ENFJ", "ISTJ", "ISFJ", "ESTJ", "ESFJ", "ISTP", "ISFP", "ESTP", "ESFP", "INTP", "INFP", "ENTP", "ENFP"];
        
        // [NEW] 축복받은 아이 확률 부여 (1%)
        const isBlessed = Math.random() < 0.01;

        const child: Companion = {
            id: Math.random().toString(36).substring(7),
            name: finalBabyName,
            age: "0세",
            birthYear: birthYear,
            gender: birthEvent.childGender,
            race: birthEvent.childRace,
            nation: newChar.base?.location?.nation || newChar.nation,
            classType: isBlessed ? "축복받은 자녀" : "자녀",
            isBlessed: isBlessed,
            level: 1,
            currentExp: 0,
            maxExp: 100,
            statPoints: 0,
            classTier: ClassTier.NONE,
            stats: { hp: 50, maxHp: 50, mp: 20, maxMp: 20, str: 5, int: 5, def: 5, agi: 5, wis: 5, ctrl: 5 },
            skills: [],
            equipment: {},
            inventory: [],
            affection: 50, 
            loyalty: 50,
            appearance: generateBabyAppearance(birthEvent.childGender),
            personality: MBTI_LIST[Math.floor(Math.random() * MBTI_LIST.length)],
            isMonster: false,
            childData: { 
                lastInteractionMonth: '',
                parentNames: [birthEvent.parentName, birthEvent.spouseName]
            }
        };

        if (!newChar.inactiveCompanions) newChar.inactiveCompanions = [];
        newChar.inactiveCompanions.push(child);

        // [NEW] 기억 기록 (Memories)
        const birthMemory = `[${birthDateStr}] 배우자 사이에서 ${isBlessed ? '축복받은 ' : ''}자녀 '${finalBabyName}'이(가) 태어남.`;
        if (!newChar.memories) newChar.memories = [];
        newChar.memories.push(birthMemory);

        if (spouseToUpdate) {
            if (!spouseToUpdate.memories) spouseToUpdate.memories = [];
            spouseToUpdate.memories.push(`[${birthDateStr}] 플레이어(${newChar.name})와 사이에서 자녀 '${finalBabyName}'이(가) 태어남.`);
        }

        // [NEW] 같은 부모 및 가문 내 자식들 간 형제자매 관계 자동 동기화
        const { updatedChar: syncedChar, count: siblingCount } = syncAllSiblingRelations(newChar);

        onUpdateCharacter(syncedChar, `[시스템] 축하합니다! 새로운 생명이 태어났습니다. ${isBlessed ? '(특별한 기운을 타고난 축복받은 아이입니다!) ' : ''}(이름: ${child.name})${siblingCount > 0 ? ` [형제자매 관계 ${siblingCount}쌍 연결됨]` : ''}`);
        setBirthEvent(null);
        
        setResultData({
            type: isBlessed ? 'levelup' : 'success',
            title: isBlessed ? '★ 축복받은 아이의 탄생 ★' : '출산 축하!',
            message: isBlessed 
                ? `가문에 전설적인 재능을 가진 아이가 태어났습니다! 이 아이는 성장이 남들보다 2배 빠릅니다.`
                : `새로운 가족이 생겼습니다.\n아이는 기지 숙소에서 무럭무럭 자랄 것입니다.`,
            items: [{ label: '이름', after: child.name }, { label: '성별', after: child.gender }, { label: '특성', after: isBlessed ? '축복받음 성장률 두배' : '일반' }]
        });
    };

    const handleInteraction = (type: 'talk' | 'date' | 'intimacy' | 'party' | 'strategy' | 'chore') => {
        if (!selectedMember || isSelectedChild) return;

        const minutesToAdvance = type === 'party' ? 360 : 60;
        const timeRes = advanceGameTime(character, minutesToAdvance, {
            activityName: type === 'party' ? "친근한 홈파티" : "동료 교류"
        });
        const newChar = { ...timeRes.updatedCharacter };
        const systemLogs = timeRes.systemLogs || [];
        
        // 정비 효과 (체력/마력 회복 - finalStats 기준)
        const heal = (entity: any) => {
            const fStats = calculateFinalStats(entity).finalStats;
            entity.stats.hp = fStats.maxHp;
            entity.stats.mp = fStats.maxMp;
        };
        heal(newChar);
        newChar.companions.forEach(heal);
        if (newChar.inactiveCompanions) newChar.inactiveCompanions.forEach(heal);

        let targetComp: Companion | undefined;
        const activeIdx = newChar.companions.findIndex(c => c.id === selectedMember.id);
        if (activeIdx !== -1) targetComp = newChar.companions[activeIdx];
        else {
            const inactiveIdx = newChar.inactiveCompanions?.findIndex(c => c.id === selectedMember.id) ?? -1;
            if (inactiveIdx !== -1 && newChar.inactiveCompanions) targetComp = newChar.inactiveCompanions[inactiveIdx];
        }

        if (!targetComp) return;

        let logMsg = "";
        let memoryAction = "";
        let resultType: ResultData['type'] = 'info';
        let detailMsg = "";
        let resultItems: any[] = [
            { label: '소모 시간', after: minutesToAdvance >= 60 ? `+${Math.floor(minutesToAdvance / 60)}시간` : `+${minutesToAdvance}분` },
            { label: '체력/마력', after: '완전 회복' }
        ];
        
        if (type === 'talk') {
            targetComp.affection = Math.min(100, targetComp.affection + 1);
            logMsg = `[나의 집] ${targetComp.name}와(과) 오붓하게 대화를 나누며 시간을 보냈습니다.`;
            memoryAction = "진솔한 대화";
            detailMsg = "서로의 하루 일과를 이야기하며 편안한 시간을 보냈습니다.";
            resultItems.push({ label: '호감도', after: '+1' });
        } else if (type === 'date') {
            const cost = 5000;
            if (character.money < cost) { alert("데이트 비용이 부족합니다. (5,000 골드)"); return; }
            newChar.money -= cost;
            targetComp.affection = Math.min(100, targetComp.affection + 3);
            logMsg = `[나의 집] ${targetComp.name}와(과) 데이트를 즐겼습니다. (-${cost.toLocaleString()} 골드)`;
            memoryAction = "행복한 데이트";
            resultType = 'success';
            detailMsg = "함께 외출하여 잊지 못할 추억을 만들었습니다.";
            resultItems.push({ label: '호감도', after: '+3' }, { label: '소모 골드', after: `${cost.toLocaleString()} 골드` });
        } else if (type === 'intimacy') {
            targetComp.affection = Math.min(100, targetComp.affection + 5);
            logMsg = `[나의 집] ${targetComp.name}와(과) 함께 뜨거운 밤을 보내며 깊은 사랑을 나눴습니다.`;
            memoryAction = "사랑이 가득한 깊은 밤";
            resultType = 'success';
            
            detailMsg = '서로의 체온 and 숨결을 느끼며 격정적인 사랑을 나눕니다.';
            detailMsg += '\n(아무런 방해 없이 깊은 곳까지 서로를 받아들였습니다.)';
            
            const spouseIsFemale = isFemale(targetComp.gender);
            const playerIsFemale = isFemale(newChar.gender);
            const spousePregnant = targetComp.pregnancy?.isPregnant;
            const playerPregnant = newChar.pregnancy?.isPregnant;
            let conceptionTriggered = false;
            const conceptionChance = 0.20;

            if (!spousePregnant && spouseIsFemale) {
                if (Math.random() < conceptionChance) {
                    const dueDate = addDays(newChar.currentDate!, 300);
                    targetComp.pregnancy = { isPregnant: true, conceptionDate: newChar.currentDate!, dueDate: dueDate, partnerId: "player", partnerName: newChar.name };
                    conceptionTriggered = true;
                    detailMsg += `\n\n(시스템) 특별한 축복이 찾아왔습니다... ${targetComp.name}에게서 새로운 생명의 고동이 느껴집니다.`;
                    logMsg += ` (임신 성공: ${targetComp.name})`;
                    if (!targetComp.memories) targetComp.memories = [];
                    targetComp.memories.push(`[${newChar.currentDate}] 플레이어(${newChar.name})와 사랑을 나누어 아이를 잉태함.`);
                }
            } else if (!conceptionTriggered && !playerPregnant && playerIsFemale) {
                 if (Math.random() < conceptionChance) {
                    const dueDate = addDays(newChar.currentDate!, 300);
                    newChar.pregnancy = { isPregnant: true, conceptionDate: newChar.currentDate!, dueDate: dueDate, partnerId: targetComp.id, partnerName: targetComp.name };
                    conceptionTriggered = true;
                    detailMsg += '\n\n(시스템) 특별한 축복이 찾아왔습니다... 당신의 뱃속에서 작은 생명이 자라나기 시작했습니다.';
                    logMsg += ' (플레이어 임신 성공)';
                    if (!newChar.memories) newChar.memories = [];
                    newChar.memories.push(`[${newChar.currentDate}] 배우자(${targetComp.name})와 사랑을 나누어 아이를 잉태함.`);
                 }
            }
            resultItems.push({ label: '호감도', after: '+5' });
        } else if (type === 'party') {
            const cost = 1000;
            if (character.money < cost) { alert("홈파티 비용이 부족합니다. (1,000 골드)"); return; }
            newChar.money -= cost;
            targetComp.affection = Math.min(100, (targetComp.affection || 50) + 3);
            if (targetComp.loyalty !== undefined) {
                targetComp.loyalty = Math.min(100, targetComp.loyalty + 5);
            }
            logMsg = `[나의 집] ${targetComp.name}와(과) 맛있는 음식을 함께 나누며 따뜻한 홈파티를 가졌습니다. (-${cost.toLocaleString()} 골드)`;
            memoryAction = "친근한 홈파티";
            resultType = 'success';
            detailMsg = "집안 가득 유쾌한 대화와 웃음꽃이 피어났습니다. 거주 동료의 호감도와 영지 충성도가 함께 상승했습니다.";
            resultItems.push({ label: '호감도', after: '+3' }, { label: '충성도', after: '+5' }, { label: '소모 골드', after: `${cost.toLocaleString()} 골드` });
        } else if (type === 'strategy') {
            if (targetComp.loyalty !== undefined) {
                targetComp.loyalty = Math.min(100, targetComp.loyalty + 4);
            }
            targetComp.affection = Math.min(100, (targetComp.affection || 50) + 1);
            logMsg = `[나의 집] ${targetComp.name}와(과) 조용히 차를 나누며 영지 경영과 안보에 관한 유익한 담소를 나눴습니다.`;
            memoryAction = "영지 경영담소";
            resultType = 'info';
            detailMsg = "서로 마주 앉아 영지의 대소사와 구체적인 성장을 함께 고민했습니다. 주군에 대한 충정심과 깊은 신뢰가 단단해졌습니다.";
            resultItems.push({ label: '충성도', after: '+4' }, { label: '호감도', after: '+1' });
        } else if (type === 'chore') {
            targetComp.affection = Math.min(100, (targetComp.affection || 50) + 4);
            logMsg = `[나의 집] ${targetComp.name}와(과) 함께 팔소매를 걷어붙이고 집안 가사와 대청소를 진행했습니다.`;
            memoryAction = "가사 함께하기";
            resultType = 'info';
            detailMsg = "부지런히 먼지를 털어내고 가재도구를 정리하면서 한결 더 가까워진 가구 공동체 의식을 다졌습니다.";
            resultItems.push({ label: '호감도', after: '+4' });
        }

        // [NEW] 기억 기록 (Memories)
        if (!targetComp.memories) targetComp.memories = [];
        targetComp.memories.push(`[${newChar.currentDate}] 플레이어(${newChar.name})와 ${memoryAction}을(를) 보냄.`);

        systemLogs.forEach(log => onUpdateCharacter(newChar, log));
        onUpdateCharacter(newChar, logMsg, timeRes.dailyReport);
        
        setResultData({
            type: resultType,
            title: memoryAction,
            message: `${detailMsg}${systemLogs.length > 0 ? '\n\n[활동 중 발생한 소식]\n' + systemLogs.slice(0, 2).join('\n') : ''}`,
            items: resultItems
        });
    };

    const handleMatchmaking = () => {
        if (!matchSlot1 || !matchSlot2 || matchSlot1.id === matchSlot2.id) return;
        
        const isS1Male = isMale(matchSlot1.gender);
        const isS1Female = isFemale(matchSlot1.gender);
        const isS2Male = isMale(matchSlot2.gender);
        const isS2Female = isFemale(matchSlot2.gender);

        const isHeteroMatch = (isS1Male && isS2Female) || (isS1Female && isS2Male);
        
        if (!isHeteroMatch) {
            alert("용병단 규정상 현재는 이성 간의 인연 주선만 지원합니다.");
            return;
        }

        const currentYear = getYear(character.currentDate || '2000-01-01');
        if (!canStartRomance(matchSlot1, matchSlot2, currentYear)) {
            const notice = getRomanceEthicsNotice(matchSlot1, matchSlot2, currentYear) || "미성년자와 성인 간의 교제는 윤리적으로 주선할 수 없습니다.";
            alert(notice);
            return;
        }

        const timeRes = advanceGameTime(character, 60, { activityName: "동료 인연 주선" });
        const newChar = { ...timeRes.updatedCharacter };
        const systemLogs = timeRes.systemLogs || [];

        const heal = (entity: any) => {
            const fStats = calculateFinalStats(entity).finalStats;
            entity.stats.hp = fStats.maxHp;
            entity.stats.mp = fStats.maxMp;
        };
        heal(newChar);
        newChar.companions.forEach(heal);
        if (newChar.inactiveCompanions) newChar.inactiveCompanions.forEach(heal);

        const successRate = 40;
        const roll = Math.random() * 100;
        const success = roll < successRate;

        const updatePartner = (target: Companion, partner: Companion, isSuccessful: boolean) => {
            if (isSuccessful) {
                target.isLover = true;
                target.partnerId = partner.id;
                target.partnerName = partner.name;
                target.loverStartDate = newChar.currentDate;
                target.affection = Math.min(100, target.affection + 10);
                
                if (!target.relations) target.relations = {};
                target.relations[partner.id] = {
                    targetId: partner.id,
                    affection: target.affection,
                    type: RelationType.LOVER
                };

                // [NEW] 기억 기록
                if (!target.memories) target.memories = [];
                target.memories.push(`[${newChar.currentDate}] 플레이어의 주선으로 ${partner.name}와(과) 연인이 됨.`);
            } else {
                target.affection = Math.min(100, target.affection + 2);
                if (!target.relations) target.relations = {};
                if (!target.relations[partner.id]) {
                    target.relations[partner.id] = {
                        targetId: partner.id,
                        affection: target.affection,
                        type: RelationType.FRIEND
                    };
                }
            }
        };

        const updateEntityInChar = (charObj: Character, id: string, partner: Companion, isSuccessful: boolean) => {
            let found = false;
            charObj.companions = charObj.companions.map(c => {
                if (c.id === id) {
                    updatePartner(c, partner, isSuccessful);
                    found = true;
                }
                return c;
            });
            if (!found && charObj.inactiveCompanions) {
                charObj.inactiveCompanions = charObj.inactiveCompanions.map(c => {
                    if (c.id === id) {
                        updatePartner(c, partner, isSuccessful);
                    }
                    return c;
                });
            }
        };

        updateEntityInChar(newChar, matchSlot1.id, matchSlot2, success);
        updateEntityInChar(newChar, matchSlot2.id, matchSlot1, success);

        let logMsg = "";
        let detailMsg = "";
        if (success) {
            logMsg = `[인연 주선] ${matchSlot1.name}와(과) ${matchSlot2.name}이(가) 서로의 마음을 확인하고 연인이 되었습니다!`;
            detailMsg = `${matchSlot1.name} ❤️ ${matchSlot2.name}\n두 사람이 연인 관계가 되었습니다. 축하해주세요!`;
        } else {
            logMsg = `[인연 주선] ${matchSlot1.name}와(과) ${matchSlot2.name}을(를) 소개시켜주었으나, 친구 사이로 남기로 했습니다.`;
            detailMsg = "두 사람은 즐거운 시간을 보냈지만, 아직 연인이 되기에는 이른 것 같습니다.";
        }

        systemLogs.forEach(log => onUpdateCharacter(newChar, log));
        onUpdateCharacter(newChar, logMsg, timeRes.dailyReport);
        
        setResultData({
            type: success ? 'success' : 'info',
            title: success ? '인연 맺어주기 성공!' : '인연 맺어주기 결과',
            message: `${detailMsg}${systemLogs.length > 0 ? '\n\n[주선 기간 중 발생한 소식]\n' + systemLogs.slice(0, 2).join('\n') : ''}`,
            items: [
                { label: '관계', after: success ? '연인' : '친구' },
                { label: '날짜 변경', after: newChar.currentDate || '1일 경과' }
            ]
        });

        setMatchSlot1(null);
        setMatchSlot2(null);
        setIsMatchmakingOpen(false);
    };

    const timeOfDay = getTimeOfDay(character.currentTime);
    let bgGradientHeader = 'bg-gradient-to-r from-rose-955/30 via-slate-900 to-amber-955/20';
    let bgGradientBorder = 'border-rose-955/40';
    let containerBorder = 'border-rose-500/40';

    if (timeOfDay.period === 'dawn') {
        bgGradientHeader = 'bg-gradient-to-r from-indigo-950/80 via-slate-950/95 to-slate-900/90';
        bgGradientBorder = 'border-indigo-950/80';
        containerBorder = 'border-indigo-500/40';
    } else if (timeOfDay.period === 'morning') {
        bgGradientHeader = 'bg-gradient-to-r from-cyan-950/40 via-slate-900/95 to-amber-950/10';
        bgGradientBorder = 'border-cyan-950/50';
        containerBorder = 'border-cyan-500/40';
    } else if (timeOfDay.period === 'afternoon') {
        bgGradientHeader = 'bg-gradient-to-r from-amber-950/30 via-slate-900/95 to-amber-900/10';
        bgGradientBorder = 'border-amber-950/60';
        containerBorder = 'border-amber-500/40';
    } else if (timeOfDay.period === 'sunset') {
        bgGradientHeader = 'bg-gradient-to-r from-rose-950/40 via-slate-900/95 to-orange-950/20';
        bgGradientBorder = 'border-rose-950/60';
        containerBorder = 'border-rose-500/40';
    } else if (timeOfDay.period === 'night') {
        bgGradientHeader = 'bg-gradient-to-r from-purple-950/50 via-slate-900/95 to-indigo-950/30';
        bgGradientBorder = 'border-purple-950/60';
        containerBorder = 'border-purple-500/40';
    }

    return (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/90 backdrop-blur-md p-2 sm:p-4 animate-in fade-in zoom-in-95">
            {resultData && <ActionResultModal data={resultData} onClose={handleResultClose} />}
            
            {isChildCareOpen && selectedMember && isSelectedChild && (
                <ChildCareModal 
                    character={character}
                    child={selectedMember}
                    onClose={() => setIsChildCareOpen(false)}
                    onUpdateCharacter={onUpdateCharacter}
                />
            )}

            {isFamilyTreeOpen && (
                <FamilyTreeModal 
                    character={character}
                    onClose={() => setIsFamilyTreeOpen(false)}
                />
            )}

            {birthEvent && (
                <div className="absolute inset-0 z-[170] flex items-center justify-center bg-black/95 p-3 sm:p-4">
                    <div className="bg-slate-900 border-2 border-rose-500 rounded-2xl p-5 sm:p-6 w-full max-w-sm shadow-[0_0_40px_rgba(244,63,94,0.4)] text-center animate-bounce-in">
                        <div className="w-16 h-16 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mx-auto mb-3 text-rose-400">
                            <Baby size={36} className="animate-pulse"/>
                        </div>
                        <h3 className="text-xl sm:text-2xl font-bold text-white mb-1.5">새 생명의 탄생</h3>
                        <p className="text-xs sm:text-sm text-rose-200 mb-5 leading-relaxed">
                            {birthEvent.parentName}와(과) {birthEvent.spouseName} 사이에서<br/>
                            <span className="font-bold text-rose-400 text-sm sm:text-base">{birthEvent.childGender}</span> 아이가 태어났습니다!
                        </p>
                        
                        <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 mb-5 text-left">
                            <label className="block text-xs text-slate-400 mb-1.5 font-medium">아이의 이름 정하기</label>
                            <input 
                                type="text" 
                                className="w-full bg-slate-900 border border-rose-500/50 rounded-lg p-2.5 text-white text-center font-bold focus:border-rose-400 outline-none transition-colors"
                                value={babyName}
                                onChange={(e) => setBabyName(e.target.value)}
                                placeholder={birthEvent.defaultName}
                            />
                        </div>
                        
                        <button 
                            onClick={handleBirthSubmit}
                            className="w-full py-3 bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white font-bold rounded-xl shadow-lg transition-all active:scale-95 text-sm"
                        >
                            이름 결정 및 출산 등록
                        </button>
                    </div>
                </div>
            )}

            {isMatchmakingOpen && (
                <div className="absolute inset-0 z-[170] flex items-center justify-center bg-black/95 p-3 sm:p-4">
                    <div className="bg-slate-900 border border-indigo-500/50 rounded-2xl sm:rounded-3xl p-4 sm:p-6 w-full max-w-2xl shadow-2xl flex flex-col max-h-[85vh]">
                        <div className="flex justify-between items-center mb-4 sm:mb-6">
                            <h3 className="text-base sm:text-xl font-bold text-white flex items-center gap-2">
                                <Sparkles className="text-indigo-400" size={20}/> 동료 인연 주선하기
                            </h3>
                            <button onClick={() => setIsMatchmakingOpen(false)} className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"><X size={20}/></button>
                        </div>
                        
                        <p className="text-xs sm:text-sm text-slate-400 mb-4 text-center">연인이 없는 두 명의 동료를 서로에게 소개해줍니다. (이성 매칭 전용)</p>

                        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 mb-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs text-slate-400 font-bold block px-1">후보 1</label>
                                    <div className="bg-slate-950 rounded-xl border border-slate-800 p-2 space-y-1 max-h-48 overflow-y-auto custom-scrollbar">
                                        {singles.map(s => {
                                            const isMatchingFlag = matchSlot2 && s.gender === matchSlot2.gender;
                                            const isDisabled = matchSlot2?.id === s.id || isMatchingFlag;
                                            return (
                                                <button 
                                                    key={`s1-${s.id}`}
                                                    onClick={() => setMatchSlot1(s)}
                                                    disabled={isDisabled}
                                                    className={`w-full p-2 text-left text-xs rounded-lg border transition-all ${matchSlot1?.id === s.id ? 'bg-indigo-950/60 border-indigo-500 text-indigo-200 font-bold' : 'bg-slate-900 border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-850'} ${isDisabled ? 'opacity-25 grayscale cursor-not-allowed' : ''}`}
                                                >
                                                    {s.name} ({s.gender})
                                                </button>
                                            );
                                        })}
                                        {singles.length === 0 && (
                                            <div className="p-3 text-center text-xs text-slate-500">대상 동료가 없습니다.</div>
                                        )}
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs text-slate-400 font-bold block px-1">후보 2</label>
                                    <div className="bg-slate-950 rounded-xl border border-slate-800 p-2 space-y-1 max-h-48 overflow-y-auto custom-scrollbar">
                                        {singles.map(s => {
                                            const isMatchingFlag = matchSlot1 && s.gender === matchSlot1.gender;
                                            const isDisabled = matchSlot1?.id === s.id || isMatchingFlag;
                                            return (
                                                <button 
                                                    key={`s2-${s.id}`}
                                                    onClick={() => setMatchSlot2(s)}
                                                    disabled={isDisabled}
                                                    className={`w-full p-2 text-left text-xs rounded-lg border transition-all ${matchSlot2?.id === s.id ? 'bg-indigo-950/60 border-indigo-500 text-indigo-200 font-bold' : 'bg-slate-900 border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-850'} ${isDisabled ? 'opacity-25 grayscale cursor-not-allowed' : ''}`}
                                                >
                                                    {s.name} ({s.gender})
                                                </button>
                                            );
                                        })}
                                        {singles.length === 0 && (
                                            <div className="p-3 text-center text-xs text-slate-500">대상 동료가 없습니다.</div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {matchSlot1 && matchSlot2 ? (
                            <div className="bg-indigo-950/40 border border-indigo-500/40 p-3.5 rounded-2xl flex items-center justify-between mb-4 animate-in zoom-in-95">
                                <div className="flex flex-col items-center">
                                    <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center border border-indigo-500/40 mb-1 text-sm">👤</div>
                                    <span className="text-xs font-bold text-white">{matchSlot1.name}</span>
                                    <span className="text-[10px] text-slate-400">{matchSlot1.gender}</span>
                                </div>
                                <Heart size={28} className="text-indigo-400 animate-pulse"/>
                                <div className="flex flex-col items-center">
                                    <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center border border-indigo-500/40 mb-1 text-sm">👤</div>
                                    <span className="text-xs font-bold text-white">{matchSlot2.name}</span>
                                    <span className="text-[10px] text-slate-400">{matchSlot2.gender}</span>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-center text-slate-500 text-xs mb-4">소개할 서로 다른 성별의 두 동료를 선택하세요.</div>
                        )}

                        <button 
                            onClick={handleMatchmaking}
                            disabled={!matchSlot1 || !matchSlot2}
                            className="w-full py-3 sm:py-3.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-600 text-white font-bold rounded-xl shadow-lg transition-all active:scale-95 text-xs sm:text-sm"
                        >
                            만남의 자리 마련하기 (1시간 소요)
                        </button>
                    </div>
                </div>
            )}

            <div className={`bg-slate-900 w-full max-w-4xl max-h-[92vh] h-[92vh] sm:h-[85vh] rounded-2xl sm:rounded-3xl border ${containerBorder} shadow-2xl flex flex-col overflow-hidden relative`}>
                
                <div className={`p-3.5 sm:p-5 border-b ${bgGradientBorder} ${bgGradientHeader} flex justify-between items-center shrink-0`}>
                    <div className="flex items-center min-w-0">
                        <div className="p-2 sm:p-2.5 bg-rose-500/10 rounded-xl border border-rose-500/20 mr-2.5 sm:mr-3.5 shrink-0">
                            <Home size={22} className="text-rose-400" />
                        </div>
                        <div className="min-w-0">
                            <h2 className="text-base sm:text-xl font-bold text-white tracking-tight">
                                나의 집
                            </h2>
                            <p className="text-[11px] sm:text-xs text-rose-300/80 truncate">사랑하는 가족과 함께 휴식을 취하는 안식처</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        <button 
                            onClick={() => setIsFamilyTreeOpen(true)}
                            className="bg-amber-950/50 hover:bg-amber-900/60 border border-amber-500/40 text-amber-200 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm active:scale-95"
                        >
                            <GitBranch size={14}/> <span>가계도</span>
                        </button>
                        {character.pregnancy?.isPregnant && (
                            <div className="bg-rose-950/60 border border-rose-500/60 text-rose-200 px-2.5 py-1 rounded-full text-xs font-bold animate-pulse flex items-center">
                                <Baby size={13} className="mr-1 text-rose-400"/> <span>임신 중</span>
                            </div>
                        )}
                        <button onClick={onClose} className="text-slate-400 hover:text-white p-1.5 sm:p-2 rounded-xl hover:bg-slate-800 transition-colors">
                            <X size={20} />
                        </button>
                    </div>
                </div>

                <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
                    <div className="w-full md:w-80 bg-slate-950/70 border-b md:border-b-0 md:border-r border-slate-800 p-3 sm:p-4 overflow-y-auto custom-scrollbar shrink-0 max-h-[35vh] md:max-h-full flex flex-col justify-between">
                        <div>
                            <h3 className="text-xs font-bold text-slate-400 mb-3 flex items-center sticky top-0 bg-slate-950/90 backdrop-blur-sm py-1 z-10">
                                <Heart size={13} className="mr-1.5 text-rose-400"/> 집안 거주민 ({spouses.length + children.length + otherResidents.length}명)
                            </h3>
                            
                            <div className="space-y-4">
                                {spouses.length > 0 && (
                                    <div>
                                        <div className="text-[11px] font-bold text-amber-400 mb-1.5 px-1">배우자</div>
                                        <div className="space-y-1.5">
                                            {spouses.map(spouse => (
                                                <button
                                                    key={spouse.id}
                                                    onClick={() => setSelectedMemberId(spouse.id)}
                                                    className={`w-full p-2.5 rounded-xl border text-left transition-all flex items-center relative overflow-hidden ${selectedMemberId === spouse.id ? 'bg-rose-955/30 border-rose-500 shadow-md ring-1 ring-rose-500/40' : 'bg-slate-900 border-slate-800 hover:border-rose-500/40'}`}
                                                >
                                                    <div className="w-9 h-9 rounded-lg bg-slate-800 flex items-center justify-center mr-2.5 border border-slate-700 shrink-0 text-base">
                                                        👤
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className={`font-bold text-xs sm:text-sm truncate flex items-center ${selectedMemberId === spouse.id ? 'text-rose-200' : 'text-slate-200'}`}>
                                                            {spouse.name}
                                                            {spouse.pregnancy?.isPregnant && <span className="ml-1 text-[10px] text-rose-400 font-bold">(임신 중)</span>}
                                                        </div>
                                                        <div className="text-[10px] text-slate-400 mt-0.5">호감도 {spouse.affection}</div>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {children.length > 0 && (
                                    <div className="pt-2 border-t border-slate-800/80">
                                        <div className="text-[11px] font-bold text-emerald-400 mb-1.5 px-1">자녀</div>
                                        <div className="space-y-1.5">
                                            {children.map(child => (
                                                <button
                                                    key={child.id}
                                                    onClick={() => setSelectedMemberId(child.id)}
                                                    className={`w-full p-2.5 rounded-xl border text-left transition-all flex items-center relative overflow-hidden ${selectedMemberId === child.id ? 'bg-emerald-955/30 border-emerald-500 shadow-md ring-1 ring-emerald-500/40' : 'bg-slate-900 border-slate-800 hover:border-emerald-500/40'}`}
                                                >
                                                    <div className="w-9 h-9 rounded-lg bg-slate-800 flex items-center justify-center mr-2.5 border border-slate-700 shrink-0 text-base">
                                                        👶
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className={`font-bold text-xs sm:text-sm truncate flex items-center ${selectedMemberId === child.id ? 'text-emerald-200' : 'text-slate-200'}`}>
                                                            {child.name}
                                                        </div>
                                                        <div className="text-[10px] text-slate-400 mt-0.5">{child.age} • 호감도 {child.affection}</div>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {otherResidents.length > 0 && (
                                    <div className="pt-2 border-t border-slate-800/80">
                                        <div className="text-[11px] font-bold text-sky-400 mb-1.5 px-1">동거 동료 (식객)</div>
                                        <div className="space-y-1.5">
                                            {otherResidents.map(guest => (
                                                <button
                                                    key={guest.id}
                                                    onClick={() => setSelectedMemberId(guest.id)}
                                                    className={`w-full p-2.5 rounded-xl border text-left transition-all flex items-center relative overflow-hidden ${selectedMemberId === guest.id ? 'bg-sky-955/30 border-sky-500 shadow-md ring-1 ring-sky-500/40' : 'bg-slate-900 border-slate-800 hover:border-sky-500/40'}`}
                                                >
                                                    <div className="w-9 h-9 rounded-lg bg-slate-800 flex items-center justify-center mr-2.5 border border-slate-700 shrink-0 text-base">
                                                        🤝
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className={`font-bold text-xs sm:text-sm truncate flex items-center ${selectedMemberId === guest.id ? 'text-sky-200' : 'text-slate-200'}`}>
                                                            {guest.name}
                                                        </div>
                                                        <div className="text-[10px] text-slate-400 mt-0.5">호감도 {guest.affection} • 충성도 {guest.loyalty ?? 50}</div>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {spouses.length === 0 && children.length === 0 && otherResidents.length === 0 && (
                                    <div className="text-center py-8 text-slate-500">
                                        <LogOut size={28} className="mx-auto mb-2 opacity-30"/>
                                        <p className="text-xs">함께 사는 가족이나 동료가 없습니다.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                        
                        <div className="mt-4 pt-3 border-t border-slate-800/80">
                            <button 
                                onClick={() => { setIsMatchmakingOpen(true); setMatchSlot1(null); setMatchSlot2(null); }}
                                className="w-full py-2.5 bg-indigo-950/40 hover:bg-indigo-900/50 border border-indigo-700/50 text-indigo-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-sm active:scale-95"
                            >
                                <Sparkles size={14} className="text-indigo-400"/> 동료 인연 주선하기
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 bg-slate-900 p-4 sm:p-8 flex flex-col items-center justify-center relative overflow-y-auto custom-scrollbar">
                        {selectedMember ? (
                            <div className="w-full max-w-sm space-y-5 sm:space-y-6 z-10 animate-in fade-in py-4">
                                <div className="text-center relative">
                                    <div className={`w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-slate-800 border-2 mx-auto mb-3 flex items-center justify-center shadow-xl relative ${isSelectedChild ? 'border-emerald-500/60' : selectedMember.pregnancy?.isPregnant ? 'border-rose-500 shadow-[0_0_25px_rgba(244,63,94,0.4)]' : isSpouse ? 'border-rose-500/40' : 'border-sky-500/40'}`}>
                                        {isSelectedChild ? <Smile size={36} className="text-emerald-400"/> : isSpouse ? <Heart size={36} className="text-rose-400 fill-rose-500/20"/> : <Sparkles size={36} className="text-sky-400"/>}
                                        {selectedMember.pregnancy?.isPregnant && (
                                            <div className="absolute -bottom-1.5 -right-1.5 bg-slate-900 border-2 border-rose-500 rounded-full p-1.5 shadow-md" title={`출산 예정일: ${selectedMember.pregnancy.dueDate}`}>
                                                <Baby size={16} className="text-rose-400"/>
                                            </div>
                                        )}
                                    </div>
                                    <h3 className="text-lg sm:text-2xl font-bold text-white mb-1">
                                        {selectedMember.name}
                                        {selectedMember.pregnancy?.isPregnant && <span className="text-rose-400 ml-2 text-xs sm:text-sm font-normal">(임신 중)</span>}
                                    </h3>
                                    <p className="text-xs sm:text-sm text-slate-300/90">
                                        {isSelectedChild ? '사랑스러운 자녀' : isSpouse ? '나의 소중한 배우자' : '친밀한 동거 동료'}
                                    </p>
                                    
                                    {selectedMember.pregnancy?.isPregnant && (
                                        <div className="mt-2 text-xs text-rose-200 bg-rose-950/60 border border-rose-500/50 px-3.5 py-1 rounded-full inline-flex items-center shadow-sm">
                                            <Baby size={13} className="mr-1.5 text-rose-400"/>
                                            출산 예정일: <span className="font-bold ml-1">{selectedMember.pregnancy.dueDate}</span>
                                        </div>
                                    )}
                                </div>

                                <div className="grid grid-cols-1 gap-2.5 sm:gap-3">
                                    {isSelectedChild ? (
                                        <button 
                                            onClick={() => setIsChildCareOpen(true)}
                                            className="w-full py-3.5 bg-emerald-955/40 hover:bg-emerald-900/50 border border-emerald-500/40 hover:border-emerald-500 rounded-xl flex items-center justify-center group transition-all active:scale-95 shadow-sm"
                                        >
                                            <div className="p-2 bg-slate-900 rounded-lg mr-3 group-hover:scale-105 transition-transform border border-slate-800">
                                                <Baby size={18} className="text-emerald-400"/>
                                            </div>
                                            <div className="text-left">
                                                <div className="font-bold text-sm text-emerald-100">자녀 양육 및 교육</div>
                                                <div className="text-[11px] text-emerald-300/70">교육, 식사, 일과 지도</div>
                                            </div>
                                        </button>
                                    ) : isSpouse ? (
                                        <>
                                            <button 
                                                onClick={() => handleInteraction('talk')}
                                                className="w-full py-3 bg-slate-950/80 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 rounded-xl flex items-center justify-center group transition-all active:scale-95"
                                            >
                                                <div className="p-2 bg-slate-900 rounded-lg mr-3 group-hover:scale-105 transition-transform border border-slate-800">
                                                    <MessageCircle size={18} className="text-sky-400"/>
                                                </div>
                                                <div className="text-left">
                                                    <div className="font-bold text-sm text-slate-200">진솔한 대화 나누기</div>
                                                    <div className="text-[11px] text-slate-400">함께 일상을 이야기하며 휴식 (1시간 소요)</div>
                                                </div>
                                            </button>

                                            <button 
                                                onClick={() => handleInteraction('date')}
                                                className="w-full py-3 bg-slate-950/80 hover:bg-slate-800 border border-slate-800 hover:border-amber-500/40 rounded-xl flex items-center justify-center group transition-all active:scale-95"
                                            >
                                                <div className="p-2 bg-slate-900 rounded-lg mr-3 group-hover:scale-105 transition-transform border border-slate-800">
                                                    <Coffee size={18} className="text-amber-400"/>
                                                </div>
                                                <div className="text-left">
                                                    <div className="font-bold text-sm text-slate-200">데이트 즐기기</div>
                                                    <div className="text-[11px] text-slate-400">외출하여 좋은 추억 쌓기 (5,000 골드, 1시간 소요)</div>
                                                </div>
                                            </button>

                                            <div className="relative">
                                                <button 
                                                    onClick={() => handleInteraction('intimacy')}
                                                    className="w-full py-3 bg-gradient-to-r from-rose-955/50 to-purple-955/50 hover:from-rose-900/50 hover:to-purple-900/50 border border-rose-500/40 hover:border-rose-400 rounded-xl flex items-center justify-center group transition-all shadow-md active:scale-95"
                                                >
                                                    <div className="p-2 bg-rose-950/80 rounded-lg mr-3 group-hover:scale-105 transition-transform border border-rose-800/60">
                                                        <Moon size={18} className="text-rose-300 fill-rose-300"/>
                                                    </div>
                                                    <div className="text-left">
                                                        <div className="font-bold text-sm text-rose-100">사랑 가득한 부부의 밤</div>
                                                        <div className="text-[11px] text-rose-300/80">깊은 사랑 나누기 (체력/마력 완전 회복, 1시간 소요)</div>
                                                    </div>
                                                </button>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <button 
                                                onClick={() => handleInteraction('party')}
                                                className="w-full py-3 bg-slate-950/80 hover:bg-slate-800 border border-slate-800 hover:border-sky-500/40 rounded-xl flex items-center justify-center group transition-all active:scale-95"
                                            >
                                                <div className="p-2 bg-slate-900 rounded-lg mr-3 group-hover:scale-105 transition-transform border border-slate-800">
                                                    <Coffee size={18} className="text-sky-400"/>
                                                </div>
                                                <div className="text-left">
                                                    <div className="font-bold text-sm text-slate-200">친근한 홈파티</div>
                                                    <div className="text-[11px] text-slate-400">소박한 음식을 나누며 단합 (1,000 골드, 6시간 소요)</div>
                                                </div>
                                            </button>

                                            <button 
                                                onClick={() => handleInteraction('strategy')}
                                                className="w-full py-3 bg-slate-950/80 hover:bg-slate-800 border border-slate-800 hover:border-indigo-500/40 rounded-xl flex items-center justify-center group transition-all active:scale-95"
                                            >
                                                <div className="p-2 bg-slate-900 rounded-lg mr-3 group-hover:scale-105 transition-transform border border-slate-800">
                                                    <MessageCircle size={18} className="text-indigo-400"/>
                                                </div>
                                                <div className="text-left">
                                                    <div className="font-bold text-sm text-slate-200">영지 경영담소</div>
                                                    <div className="text-[11px] text-slate-400">영지 관리와 전략적 구상 공유 (1시간 소요)</div>
                                                </div>
                                            </button>

                                            <button 
                                                onClick={() => handleInteraction('chore')}
                                                className="w-full py-3 bg-slate-950/80 hover:bg-slate-800 border border-slate-800 hover:border-emerald-500/40 rounded-xl flex items-center justify-center group transition-all active:scale-95"
                                            >
                                                <div className="p-2 bg-slate-900 rounded-lg mr-3 group-hover:scale-105 transition-transform border border-slate-800">
                                                    <Sparkles size={18} className="text-emerald-400"/>
                                                </div>
                                                <div className="text-left">
                                                    <div className="font-bold text-sm text-slate-200">가사 함께하기</div>
                                                    <div className="text-[11px] text-slate-400">집안 청소와 가사 정리를 협동 (1시간 소요)</div>
                                                </div>
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="w-full max-w-md space-y-6 py-4 mx-auto animate-in fade-in duration-300">
                                <div className="text-center">
                                    <div className="w-16 h-16 rounded-2xl bg-rose-950/40 border border-rose-500/30 flex items-center justify-center mx-auto mb-3 text-rose-400 shadow-lg">
                                        <Home size={30} />
                                    </div>
                                    <h3 className="text-lg font-bold text-white">나의 집 관리</h3>
                                    <p className="text-xs text-rose-300/75 mt-1">사랑하는 가족과 머무르는 우리 영지의 최고 중심지입니다.</p>
                                </div>

                                <div className="bg-slate-950/80 border border-slate-800/80 rounded-2xl p-4 space-y-4 shadow-xl">
                                    <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                                        <div>
                                            <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">현재 등급</span>
                                            <h4 className="text-sm font-bold text-slate-200">{myHomeData.name} (Lv.{myHomeData.level})</h4>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">거주 인원 수용력</span>
                                            <p className="text-sm font-bold text-amber-400">{myHomeData.capacity}명 거주 가능</p>
                                        </div>
                                    </div>

                                    {myHomeData.level < 5 ? (
                                        <div className="space-y-3">
                                            <div className="text-xs text-slate-300">
                                                <span className="font-semibold text-rose-300">▶ 다음 단계로 증축 시 보너스:</span>
                                                <div className="grid grid-cols-2 gap-2 mt-1 bg-slate-900/60 p-2 rounded-lg border border-slate-800 text-[11px]">
                                                    <div>등급: <span className="text-slate-100 font-bold">Lv.{myHomeData.level + 1}</span></div>
                                                    <div>수용력: <span className="text-amber-300 font-bold">+{myHomeData.level + 1 >= 3 && myHomeData.type === 'my_home' ? 6 : 2}명</span></div>
                                                    {myHomeData.level + 1 >= 3 && myHomeData.type === 'my_home' && (
                                                        <div className="col-span-2 text-rose-400 font-semibold">★ Lv.3 증축 시 '초호화 대저택'으로 승급!</div>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="space-y-1.5">
                                                <span className="text-[10px] text-slate-400 uppercase font-bold">필요 자원</span>
                                                <div className="grid grid-cols-2 gap-2">
                                                    <div className="flex justify-between text-xs bg-slate-900 px-2.5 py-1.5 rounded-lg border border-slate-800">
                                                        <span className="text-slate-400">금화:</span>
                                                        <span className={character.money >= (10000 * myHomeData.level) ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                                                            {(10000 * myHomeData.level).toLocaleString()}G
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between text-xs bg-slate-900 px-2.5 py-1.5 rounded-lg border border-slate-800">
                                                        <span className="text-slate-400">목재:</span>
                                                        <span className={(character.base?.resources?.wood || 0) >= (200 * myHomeData.level) ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                                                            {200 * myHomeData.level}개
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between text-xs bg-slate-900 px-2.5 py-1.5 rounded-lg border border-slate-800">
                                                        <span className="text-slate-400">석재:</span>
                                                        <span className={(character.base?.resources?.stone || 0) >= (200 * myHomeData.level) ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                                                            {200 * myHomeData.level}개
                                                        </span>
                                                    </div>
                                                    {myHomeData.level >= 3 && (
                                                        <div className="flex justify-between text-xs bg-slate-900 px-2.5 py-1.5 rounded-lg border border-slate-800">
                                                            <span className="text-slate-400">마정석:</span>
                                                            <span className={((character.base?.resources as any)?.manaCrystal || 0) >= (100 * (myHomeData.level - 2)) ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                                                                {100 * (myHomeData.level - 2)}개
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            <button
                                                onClick={handleUpgradeMyHome}
                                                className="w-full mt-2 py-3 bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white font-bold rounded-xl shadow-md active:scale-95 transition-all text-xs flex items-center justify-center gap-1.5"
                                            >
                                                <ArrowUpCircle size={15} />
                                                나의 집 증축 실행하기
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="text-center py-4 text-amber-400 font-bold text-xs">
                                            🎉 이미 최고의 건물 등급(Lv.5)에 다다랐습니다! 더 높은 지위와 권세가 가택에 깃듭니다.
                                        </div>
                                    )}
                                </div>

                                <div className="p-3 bg-slate-950/40 border border-slate-800/60 rounded-xl text-[11px] text-slate-400 space-y-1">
                                    <p className="font-bold text-slate-300">💡 나의 집 특징</p>
                                    <p>• 나의 집은 주택 신축으로 개수를 늘릴 수 없으며, 오직 증축으로만 업그레이드됩니다.</p>
                                    <p>• 초기 4인 거주가 보장되며, <strong>Lv.3 이상 증축 시 '초호화 대저택'</strong>으로 승격되어 거주 가족들의 충성도와 호감도가 더욱 대폭 늘어납니다.</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MyHomeModal;
