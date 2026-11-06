import React, { useState, useEffect, useRef } from 'react';
import { Character, Companion, TempleVisitor, JobType, Stats, Enemy, ClassTier, SkillType, VisitorDisposition, SimpleStudent, RelationType, CombatStyle } from '../types';
import { X, Users, MessageCircle, Sword, UserPlus, Heart, Shield, Star, Crown, Search, Loader2, Send, ChevronRight, AlertTriangle, CheckCircle, Info, Sparkles, UserCheck, Activity, Flame, Skull, RefreshCw, Globe, Briefcase, ShieldCheck, UserMinus, Zap, Gift, Compass, Award, ScrollText, Check, HelpCircle } from 'lucide-react';
import { generateName, generateCompanionStats, getYear, addDays, assignRandomCombatStyle } from '../utils';
import { chatWithVisitor } from '../services/geminiService';
import { SHINRYOKU_TYPES_LIST, HUMANOID_CLASSES, NATION_DATA, TEMPLE_MESSENGER_MAP, INITIAL_BASE } from '../constants';
import ActionResultModal, { ResultData } from './ActionResultModal';
import { convertVisitorToEnemy } from '../templevisitors';
import { CHARACTER_PRESETS } from '../appearance';
import { determineRecruitClassTier } from '../services/classLiberationHelper';

const generateAppearance = (nation: string, genderParam: 'male' | 'female' | string): string => {
    let continent = '아시아';
    if (['루멘', '솔라리스', '아이언가드', '유럽', '제국', '신성'].some(n => nation.includes(n))) continent = '유럽';
    else if (['아프리카', '사막', '부족', '야만'].some(n => nation.includes(n))) continent = '아프리카';
    else if (['아메리카', '서부', '연방'].some(n => nation.includes(n))) continent = '아메리카';

    const presets = CHARACTER_PRESETS[continent as keyof typeof CHARACTER_PRESETS] || CHARACTER_PRESETS['아시아'];
    const isMale = genderParam === 'male' || genderParam === '남성';
    const genderFiltered = presets.filter(p => isMale ? p.label.includes('남자') : p.label.includes('여자'));
    const pool = genderFiltered.length > 0 ? genderFiltered : presets;
    const randomPreset = pool[Math.floor(Math.random() * pool.length)];
    return randomPreset ? randomPreset.url : 'https://picsum.photos/seed/visitor/400/600';
};

interface Props {
    character: Character;
    templeCity: string;
    onClose: () => void;
    onUpdateCharacter: (newChar: Character, logMsg: string) => void;
    onAction: (action: string) => void;
    onBattle?: (enemy: Enemy | Enemy[], type?: string) => void; 
}

const DISPOSITION_LABELS: Record<VisitorDisposition, string> = {
    'Hostile': '적대적',
    'PotentiallyHostile': '잠재적 적대',
    'PotentiallyFriendly': '잠재적 우호',
    'Peaceful': '우호적'
};

const CLASS_TIER_LABELS: Record<string, string> = {
    [ClassTier.FIRST]: '퍼스트 클래스',
    [ClassTier.SECOND]: '세컨드 클래스',
    [ClassTier.LAST]: '라스트 클래스',
    [ClassTier.FINAL]: '파이널 클래스',
    [ClassTier.NONE]: '미해방'
};

const MBTI_LIST = ["INTJ", "INFJ", "ENTJ", "ENFJ", "ISTJ", "ISFJ", "ESTJ", "ESFJ", "ISTP", "ISFP", "ESTP", "ESFP", "INTP", "INFP", "ENTP", "ENFP"];

type VisitCategory = 'monster' | 'resource' | 'duel' | 'hostile' | 'faith';

interface VisitorCategoryMeta {
    category: VisitCategory;
    tagLabel: string;
    tagColor: string;
}

const getVisitorCategoryMeta = (visitor: TempleVisitor): VisitorCategoryMeta => {
    const reason = visitor.visitReason || '';
    const action = visitor.intendedAction;

    if (action === 'Hostile' || action === 'PotentiallyHostile' || reason.includes('약탈') || reason.includes('오만') || reason.includes('허명') || reason.includes('심판')) {
        return { category: 'hostile', tagLabel: '무력 심판 대상', tagColor: 'bg-red-950 text-red-300 border-red-700' };
    }
    if (reason.includes('위엄') || reason.includes('가르침') || reason.includes('한계') || reason.includes('결투') || reason.includes('시험')) {
        return { category: 'duel', tagLabel: '사자의 위엄 대련 희망', tagColor: 'bg-amber-950 text-amber-300 border-amber-700' };
    }
    if (reason.includes('마수') || reason.includes('토벌') || reason.includes('소탕') || reason.includes('퇴치') || reason.includes('구원')) {
        return { category: 'monster', tagLabel: '마수 토벌 탄원', tagColor: 'bg-purple-950 text-purple-300 border-purple-700' };
    }
    if (reason.includes('구호') || reason.includes('지원') || reason.includes('마정석') || reason.includes('기금') || reason.includes('재건')) {
        return { category: 'resource', tagLabel: '성전 자원 지원 탄원', tagColor: 'bg-cyan-950 text-cyan-300 border-cyan-700' };
    }
    return { category: 'faith', tagLabel: '성전 귀의 희망', tagColor: 'bg-emerald-950 text-emerald-300 border-emerald-700' };
};

const TempleReceptionModal: React.FC<Props> = ({ character, templeCity, onClose, onUpdateCharacter, onAction, onBattle }) => {
    const [activeVisitorId, setActiveVisitorId] = useState<string | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [chatInput, setChatInput] = useState('');
    const [isChatting, setIsChatting] = useState(false);
    const [resultData, setResultData] = useState<ResultData | null>(null);
    const chatEndRef = useRef<HTMLDivElement>(null);
    
    const [showBattleOptions, setShowBattleOptions] = useState(false);
    const [isSimulating, setIsSimulating] = useState(false);
    const [defeatedStaffIds, setDefeatedStaffIds] = useState<Set<string>>(new Set());
    const [capturedVisitor, setCapturedVisitor] = useState<TempleVisitor | null>(null);

    // 모바일 명단/상세 전환 탭 상태
    const [mobileTab, setMobileTab] = useState<'list' | 'detail'>('list');

    const templeKey = `${character.currentLocation?.nation}_${templeCity}`;
    const visitors = character.base?.templeVisitors?.[templeKey] || [];
    const currentMonth = character.currentDate?.substring(0, 7);
    const lastRefresh = character.base?.lastTempleRefreshDate || '';

    const personnel = character.base?.templePersonnel?.[templeKey];
    const allComps = [...character.companions, ...(character.inactiveCompanions || [])];
    
    // 성전 배치 인원 추출
    const assignedStaff = (() => {
        if (!personnel) return [];
        const staff: { entity: Companion, role: string }[] = [];
        personnel.knightIds.forEach(id => {
            const c = allComps.find(comp => comp.id === id);
            if (c) staff.push({ entity: c, role: '수호기사' });
        });
        personnel.butlerIds.forEach(id => {
            const c = allComps.find(comp => comp.id === id);
            if (c) staff.push({ entity: c, role: '집사' });
        });
        personnel.maidIds.forEach(id => {
            const c = allComps.find(comp => comp.id === id);
            if (c) staff.push({ entity: c, role: '메이드' });
        });
        return staff;
    })();

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [activeVisitorId, visitors]);

    const requiredMessengerJob = TEMPLE_MESSENGER_MAP[templeCity || ''];
    let activeMessenger: any = null;
    if (character.job === requiredMessengerJob) {
        activeMessenger = character;
    } else {
        activeMessenger = allComps.find(c => c.id === (requiredMessengerJob as any)) || null;
        if (!activeMessenger) activeMessenger = allComps.find(c => c.job === requiredMessengerJob) || null;
    }

    // [헬퍼] 과거 인연 및 기억 등록 공통 함수
    const registerPastConnection = (newChar: Character, visitor: TempleVisitor, reasonDesc: string) => {
        const pastStudent: SimpleStudent = {
            id: visitor.id,
            name: visitor.name,
            age: visitor.age,
            birthYear: visitor.birthYear,
            gender: visitor.gender,
            race: visitor.race || '인간',
            nation: visitor.nation || '신성 제국',
            level: visitor.level,
            personality: visitor.personality || 'ISTJ',
            appearance: visitor.appearance || `${visitor.nation} 출신의 ${visitor.classType}.`,
            stats: { ...visitor.stats },
            affection: Math.min(100, (visitor.affection || 50) + 20),
            shinryokuType: visitor.shinryokuType,
            isPastConnection: true,
            classType: visitor.classType,
            classTier: visitor.classTier,
            combatStyle: visitor.combatStyle,
            visualUrl: visitor.visualUrl,
            metYear: getYear(character.currentDate || '2000-01-01'),
            origin: '성전 접견실',
            originName: `${templeCity} 접견실`,
            memories: [`[${character.currentDate}] ${reasonDesc}`]
        };

        if (!newChar.socialNetwork) newChar.socialNetwork = [];
        const existingIdx = newChar.socialNetwork.findIndex(s => s.id === visitor.id || s.name === visitor.name);
        if (existingIdx !== -1) {
            newChar.socialNetwork[existingIdx] = { 
                ...newChar.socialNetwork[existingIdx], 
                ...pastStudent, 
                isPastConnection: true,
                affection: Math.min(100, (newChar.socialNetwork[existingIdx].affection || 50) + 20)
            };
        } else {
            newChar.socialNetwork.push(pastStudent);
        }

        if (!newChar.memories) newChar.memories = [];
        (newChar.memories as any[]).push(`[성전 접견실 인연] ${character.currentDate} - ${visitor.name}: ${reasonDesc}`);

        // 성전 위엄도 보정
        if (!newChar.base) newChar.base = { ...INITIAL_BASE };
        if (!newChar.base.templePersonnel) newChar.base.templePersonnel = {};
        if (!newChar.base.templePersonnel[templeKey]) {
            newChar.base.templePersonnel[templeKey] = { knightIds: [], butlerIds: [], maidIds: [], majesty: 0 };
        }
    };

    // 방문객 명단 생성
    const handleGenerateVisitors = () => {
        const hasStaff = assignedStaff.some(s => s.role === '집사' || s.role === '메이드');
        if (!hasStaff) {
            setResultData({
                type: 'warning',
                title: '갱신 불가',
                message: '방문객을 관리하고 명단을 정리할 집사나 메이드가 성전에 배치되어 있지 않습니다.',
                items: [{ label: '필요 보직', after: '집사 또는 메이드' }]
            });
            return;
        }

        if (lastRefresh === currentMonth) {
            setResultData({
                type: 'info',
                title: '갱신 제한',
                message: '성전 접견실 명단은 한 달에 한 번만 갱신할 수 있습니다.\n다음 달에 새로운 방문객들을 맞이하십시오.',
                items: [{ label: '최근 갱신일', after: lastRefresh }]
            });
            return;
        }

        setIsGenerating(true);
        setTimeout(() => {
            const newVisitors: TempleVisitor[] = [];
            const count = Math.floor(Math.random() * 2) + 2; 

            const categorizedTemplates: { reason: string; disp: VisitorDisposition }[] = [
                // 1. 마수 토벌 탄원
                { reason: "인근 영지에서 출몰한 고위 마수들을 성전의 권능으로 소탕해 주시길 청합니다.", disp: 'Peaceful' },
                { reason: "성역 외곽을 위협하는 흉포한 마수 무리를 퇴치하여 신도들을 구원해 주십시오.", disp: 'PotentiallyFriendly' },
                // 2. 자원 지원 탄원
                { reason: "재해와 흉작으로 굶주린 백성들을 위해 성전의 마정석과 구호 기금을 청합니다.", disp: 'Peaceful' },
                { reason: "무너진 고향 신전 재건과 구호 물자 지원을 간청하러 먼 길을 찾아왔습니다.", disp: 'PotentiallyFriendly' },
                // 3. 사자의 위엄 대련 희망
                { reason: "전설적인 신의 사자님의 무예와 위엄을 직접 마주하고 한 수 가르침을 청합니다.", disp: 'PotentiallyFriendly' },
                { reason: "신의 사자의 일격을 시험받아 저의 무예의 한계를 돌파하고자 찾아왔습니다.", disp: 'Peaceful' },
                // 4. 무력 심판 대상 (적대적)
                { reason: "성전의 오만을 꺾고 신의 권능이 허상임을 증명하러 왔다. 결투를 받아라!", disp: 'Hostile' },
                { reason: "성전의 보물과 마정석을 약탈하러 왔다. 네놈의 목을 베어 명성을 떨치겠다!", disp: 'Hostile' },
                { reason: "신의 사자라 자칭하는 자여, 나의 칼끝 앞에서도 그 권위를 유지할 수 있겠는가?", disp: 'PotentiallyHostile' },
                // 5. 성전 귀의 희망
                { reason: "사자님의 높은 위엄과 덕망을 흠모하여 성전의 일원이 되고자 먼 길을 왔습니다.", disp: 'Peaceful' }
            ];

            const jobs = [JobType.UNEMPLOYED, JobType.STUDENT, JobType.SOLDIER, JobType.MERCENARY];
            const currentYear = getYear(character.currentDate || '2000-01-01');

            for (let i = 0; i < count; i++) {
                const nationList = Object.keys(NATION_DATA);
                const randomNation = nationList[Math.floor(Math.random() * nationList.length)];
                const gender = Math.random() < 0.5 ? '남성' : '여성';
                const genderParam = gender === '남성' ? 'male' : 'female';
                const name = generateName(randomNation, genderParam);
                
                // 최소 500레벨 이상 보장 (500 ~ 1100)
                const level = Math.max(500, Math.floor(Math.random() * 600) + 500);
                const stats = generateCompanionStats(level);
                const visualUrl = generateAppearance(randomNation, genderParam);
                
                const randomType = SHINRYOKU_TYPES_LIST[Math.floor(Math.random() * SHINRYOKU_TYPES_LIST.length)];
                const classPool = HUMANOID_CLASSES[randomType] || ["모험가"];
                const randomClass = classPool[Math.floor(Math.random() * classPool.length)];
                const randomJob = jobs[Math.floor(Math.random() * jobs.length)];
                const ageNum = 22 + Math.floor(Math.random() * 38);

                // 클래스 티어 결정: 레벨이 1000이 넘어도 무조건 라스트/파이널 클래스가 아님 (확률적 자연스러운 해방 상태)
                const classTier = determineRecruitClassTier(level);

                const template = categorizedTemplates[Math.floor(Math.random() * categorizedTemplates.length)];

                const rawVisitor: TempleVisitor = {
                    id: `visitor_${Math.random().toString(36).substring(7)}`,
                    name,
                    age: `${ageNum}세`,
                    birthYear: currentYear - ageNum,
                    gender,
                    race: '인간',
                    nation: randomNation,
                    appearance: `${randomNation} 출신의 ${randomClass}.`,
                    personality: MBTI_LIST[Math.floor(Math.random() * MBTI_LIST.length)],
                    classType: randomClass,
                    firstClassName: `초급 ${randomClass}`,
                    secondClassName: `중급 ${randomClass}`,
                    lastClassName: `상급 ${randomClass}`,
                    finalClassName: `초월 ${randomClass}`,
                    job: randomJob,
                    level, 
                    currentExp: 0, 
                    maxExp: level * 100, 
                    statPoints: 0,
                    classTier,
                    shinryokuType: randomType,
                    stats,
                    skills: [],
                    equipment: {},
                    inventory: [],
                    affection: template.disp === 'Hostile' ? 5 : 30,
                    loyalty: 0,
                    visitReason: template.reason,
                    intendedAction: template.disp,
                    isMet: false,
                    discoveryDate: character.currentDate || '',
                    templeChatHistory: [],
                    visualUrl
                };

                // 전투 계열 배정
                const finalizedVisitor = assignRandomCombatStyle(rawVisitor, true, true) as TempleVisitor;
                newVisitors.push(finalizedVisitor);
            }

            const newChar = { ...character };
            if (!newChar.base) newChar.base = { ...INITIAL_BASE };
            if (!newChar.base.templeVisitors) newChar.base.templeVisitors = {};
            newChar.base.templeVisitors[templeKey] = newVisitors;
            newChar.base.lastTempleRefreshDate = currentMonth;
            
            onUpdateCharacter(newChar, `[성전 접견실] ${count}명의 방문객이 성전을 찾아왔습니다.`);
            setIsGenerating(false);
            if (newVisitors.length > 0) {
                setActiveVisitorId(newVisitors[0].id);
            }
        }, 1200);
    };

    // 대화 처리
    const handleChat = async () => {
        if (!chatInput.trim() || !activeVisitorId || isChatting || !activeMessenger) return;
        
        const visitor = visitors.find(v => v.id === activeVisitorId);
        if (!visitor) return;

        const userMsg = chatInput;
        setChatInput('');
        setIsChatting(true);

        try {
            const reply = await chatWithVisitor(visitor, userMsg, activeMessenger, templeCity);
            
            const newChar = { ...character };
            const visitorIdx = visitors.findIndex(v => v.id === visitor.id);
            if (visitorIdx === -1) return;

            const updatedVisitor = { ...visitor };
            updatedVisitor.templeChatHistory = [...(updatedVisitor.templeChatHistory || []), 
                { role: 'user', text: userMsg }, 
                { role: 'visitor', text: reply.replace(/\[SET_DISPOSITION:.+?\]/g, '').trim() }
            ];
            updatedVisitor.isMet = true;

            const dispositionMatch = reply.match(/\[SET_DISPOSITION:(.+?)\]/);
            if (dispositionMatch) {
                const nextDisp = dispositionMatch[1].trim() as VisitorDisposition;
                if (['Hostile', 'PotentiallyHostile', 'PotentiallyFriendly', 'Peaceful'].includes(nextDisp)) {
                    updatedVisitor.intendedAction = nextDisp;
                }
            }

            const hasMaid = assignedStaff.some(s => s.role === '메이드');
            updatedVisitor.affection = Math.min(100, updatedVisitor.affection + (hasMaid ? 4 : 2));
            
            if (!newChar.base!.templeVisitors) newChar.base!.templeVisitors = {};
            newChar.base!.templeVisitors[templeKey][visitorIdx] = updatedVisitor;
            
            const faithGain = hasMaid ? 20 : 10;
            newChar.faith = (newChar.faith || 0) + faithGain;

            onUpdateCharacter(newChar, ""); 
        } finally {
            setIsChatting(false);
        }
    };

    // 1. 퀘스트형 상호작용: 몬스터 토벌 탄원 수락
    const handleAcceptMonsterSubjugation = () => {
        if (!activeVisitor) return;
        const newChar = { ...character };
        
        // 보상 지급
        const rewardGold = 60000;
        newChar.money += rewardGold;
        newChar.faith = (newChar.faith || 0) + 80;
        
        if (newChar.base?.templePersonnel?.[templeKey]) {
            newChar.base.templePersonnel[templeKey].majesty = (newChar.base.templePersonnel[templeKey].majesty || 0) + 30;
        }

        registerPastConnection(newChar, activeVisitor, `마수 토벌 탄원을 수락하여 주변 백성들을 구원함.`);

        // 방문객 퇴장 처리
        newChar.base!.templeVisitors![templeKey] = visitors.filter(v => v.id !== activeVisitor.id);

        setResultData({
            type: 'success',
            title: '마수 토벌 탄원 해결',
            message: `${activeVisitor.name}의 간청을 받아들여 성전의 신성한 군세로 마수들을 즉각 소탕했습니다!\n방문객은 감격의 눈물을 흘리며 당신과의 인연을 가슴 깊이 새겼습니다.`,
            items: [
                { label: '사례금 획득', after: `+${rewardGold.toLocaleString()} 골드` },
                { label: '신앙심 상승', after: '+80' },
                { label: '성전 위엄도', after: '+30' },
                { label: '관계망 등록', after: '과거 인연으로 영구 등록' }
            ]
        });

        onUpdateCharacter(newChar, `[성전 탄원] ${activeVisitor.name}의 마수 토벌 탄원을 해결하여 과거 인연으로 등록되었습니다.`);
        setActiveVisitorId(null);
        setMobileTab('list');
    };

    // 2. 퀘스트형 상호작용: 성전 구호 자원 지원
    const handleSupportResources = () => {
        if (!activeVisitor) return;
        const goldCost = 50000;
        const crystalCost = 500;

        // 기지 자원의 마정석(manaCrystal)과 우선 연계
        const currentCrystals = character.base?.resources?.manaCrystal ?? (character.base?.elementalShards?.magicStone || 0);
        if (character.money < goldCost || currentCrystals < crystalCost) {
            setResultData({
                type: 'warning',
                title: '지원 자원 부족',
                message: '백성들을 구호하기 위한 성전 자원이 부족합니다.',
                items: [
                    { label: '필요 골드', before: `${character.money.toLocaleString()} 골드`, after: `${goldCost.toLocaleString()} 골드` },
                    { label: '필요 마정석', before: `${currentCrystals.toLocaleString()} 개`, after: `${crystalCost.toLocaleString()} 개` }
                ]
            });
            return;
        }

        const newChar = { ...character };
        newChar.money -= goldCost;
        if (newChar.base?.resources) {
            newChar.base.resources.manaCrystal = Math.max(0, (newChar.base.resources.manaCrystal || 0) - crystalCost);
        } else if (newChar.base?.elementalShards?.magicStone) {
            newChar.base.elementalShards.magicStone -= crystalCost;
        }

        newChar.faith = (newChar.faith || 0) + 150;
        if (newChar.base?.templePersonnel?.[templeKey]) {
            newChar.base.templePersonnel[templeKey].majesty = (newChar.base.templePersonnel[templeKey].majesty || 0) + 50;
        }

        registerPastConnection(newChar, activeVisitor, `성전의 마정석과 구호 기금을 아낌없이 지원하여 기근을 구제함.`);

        // 방문객 퇴장 처리
        newChar.base!.templeVisitors![templeKey] = visitors.filter(v => v.id !== activeVisitor.id);

        setResultData({
            type: 'success',
            title: '구호 자원 지원 완료',
            message: `${activeVisitor.name}에게 성전의 마정석과 구호 기금을 쾌척했습니다!\n"사자님의 은혜는 고향의 모든 백성들이 영원히 기억할 것입니다!"\n그는 깊은 경의를 표하며 조국으로 돌아갔습니다.`,
            items: [
                { label: '소모 골드', after: `-${goldCost.toLocaleString()} 골드` },
                { label: '소모 마정석', after: `-${crystalCost.toLocaleString()} 개` },
                { label: '신앙심 대폭 상승', after: '+150' },
                { label: '성전 위엄도', after: '+50' },
                { label: '관계망 등록', after: '과거 인연으로 영구 등록' }
            ]
        });

        onUpdateCharacter(newChar, `[성전 구호] ${activeVisitor.name}에게 구호 자원을 지원하여 과거 인연으로 등록되었습니다.`);
        setActiveVisitorId(null);
        setMobileTab('list');
    };

    // 3. 성전의 축복 하사 (우호적 방문객 평화적 귀의 및 과거 인연 등록)
    const handleBestowBlessing = () => {
        if (!activeVisitor) return;
        const newChar = { ...character };
        newChar.faith = (newChar.faith || 0) + 30;

        registerPastConnection(newChar, activeVisitor, `성전의 축복을 하사받고 평화로운 신도로서 인연을 맺음.`);
        newChar.base!.templeVisitors![templeKey] = visitors.filter(v => v.id !== activeVisitor.id);

        setResultData({
            type: 'success',
            title: '성전의 축복 하사',
            message: `${activeVisitor.name}의 이마에 신성한 축복의 인을 새겨주었습니다.\n방문객은 감화되어 성전의 은혜를 노래하며 돌아갔습니다.`,
            items: [
                { label: '신앙심 상승', after: '+30' },
                { label: '관계망 등록', after: '과거 인연으로 영구 등록' }
            ]
        });

        onUpdateCharacter(newChar, `[성전 축복] ${activeVisitor.name}에게 축복을 내리고 과거 인연으로 등록했습니다.`);
        setActiveVisitorId(null);
        setMobileTab('list');
    };

    // 4. 사자 직접 전투 (대련/심판)
    const handleDirectBattleExecution = () => {
        if (!activeVisitor) return;
        setIsSimulating(true);

        setTimeout(() => {
            setIsSimulating(false);
            setShowBattleOptions(false);
            // 사자의 압도적 권능으로 제압 완료 -> 포로 처분 모달로 연결
            setCapturedVisitor(activeVisitor);
            setResultData({
                type: 'success',
                title: '사자 결투 승리',
                message: `신의 사자의 압도적인 권능 앞에 ${activeVisitor.name}이(가) 무릎을 꿇었습니다!\n이제 패배한 방문객의 처분을 결정하십시오.`,
                items: [
                    { label: '결투 상대', after: activeVisitor.name },
                    { label: '사자 위엄', after: '완전 제압' }
                ]
            });
        }, 1200);
    };

    // 실전 전장 진입 (선택 시 전체 화면 턴제 전투 인터페이스로 이동)
    const handleFullBattleField = () => {
        if (!onBattle || !activeVisitorId) return;
        const visitor = visitors.find(v => v.id === activeVisitorId);
        if (!visitor) return;

        const enemy = convertVisitorToEnemy(visitor);
        if (!enemy.visualUrl) {
            enemy.visualUrl = visitor.visualUrl || generateAppearance(visitor.nation, visitor.gender === '남성' ? 'male' : 'female');
        }

        const newChar = { ...character };
        if (newChar.base?.templeVisitors?.[templeKey]) {
            newChar.base.templeVisitors[templeKey] = visitors.filter(v => v.id !== visitor.id);
        }

        registerPastConnection(newChar, visitor, `성전 접견실에서 결투를 펼침.`);
        onUpdateCharacter(newChar, `[성전 접견실] 방문객 ${visitor.name}와의 대련 전투가 시작됩니다.`);
        onBattle(enemy, 'reception_battle'); 
        setShowBattleOptions(false);
        onClose();
    };

    // 승률 계산
    const calculateWinRate = (staff: Companion, visitor: TempleVisitor) => {
        const staffPower = (staff.level * 10) + (staff.stats.str + staff.stats.int + staff.stats.def + staff.stats.agi + staff.stats.wis + staff.stats.ctrl);
        const visitorPower = (visitor.level * 10) + (visitor.stats.str + visitor.stats.int + visitor.stats.def + visitor.stats.agi + visitor.stats.wis + visitor.stats.ctrl);
        
        let roleBonus = 1.0;
        if (assignedStaff.find(s => s.entity.id === staff.id)?.role === '수호기사') roleBonus = 1.2;

        const rate = (staffPower * roleBonus / (staffPower * roleBonus + visitorPower)) * 100;
        return Math.min(99, Math.max(1, Math.floor(rate)));
    };

    // 성전 인원 파견
    const handleStaffDispatch = (staff: Companion) => {
        const visitor = visitors.find(v => v.id === activeVisitorId);
        if (!visitor) return;

        setIsSimulating(true);
        const winRate = calculateWinRate(staff, visitor);

        setTimeout(() => {
            const roll = Math.random() * 100;
            if (roll < winRate) {
                setCapturedVisitor(visitor);
                setResultData({
                    type: 'success',
                    title: '전투 승리',
                    message: `${staff.name} 대원이 ${visitor.name}을(를) 제압했습니다! 이제 이 방문객의 처분을 결정하십시오.`,
                    items: [{ label: '승률', after: `${winRate}%` }, { label: '결과', after: '제압 완료' }]
                });
                setShowBattleOptions(false);
            } else {
                setDefeatedStaffIds(prev => new Set(prev).add(staff.id));
                setResultData({
                    type: 'failure',
                    title: '전투 패배',
                    message: `${staff.name} 대원이 패배했습니다! 부상을 입고 물러납니다. 다른 대원을 보내거나 사자가 직접 나서야 합니다.`,
                    items: [{ label: '승률', after: `${winRate}%` }, { label: '결과', after: '대원 후퇴' }]
                });
            }
            setIsSimulating(false);
        }, 1200);
    };

    // [핵심] 결투 승리 후 방문객 처분 (영입, 자비 베풀기 및 과거 인연 등록, 성전 처단)
    const handleVisitorResolution = (action: 'execute' | 'recruit' | 'mercy') => {
        if (!capturedVisitor) return;

        const newChar = { ...character };
        newChar.base!.templeVisitors![templeKey] = visitors.filter(v => v.id !== capturedVisitor.id);

        if (action === 'execute') {
            // 성전의 이름으로 처단
            newChar.faith = (newChar.faith || 0) + 60;
            const seizedGold = capturedVisitor.level * 150;
            newChar.money += seizedGold;
            
            if (newChar.base?.templePersonnel?.[templeKey]) {
                newChar.base.templePersonnel[templeKey].majesty = (newChar.base.templePersonnel[templeKey].majesty || 0) + 30;
            }

            if (!newChar.memories) newChar.memories = [];
            (newChar.memories as any[]).push(`[성전 심판] 성전을 위협한 ${capturedVisitor.name}을(를) 처단하여 위엄을 세움.`);

            onUpdateCharacter(newChar, `[성전 처단] ${capturedVisitor.name}을(를) 처단하여 성전의 신성과 위엄을 증명했습니다.`);
            setResultData({
                type: 'destroy',
                title: '성전 처단 집행',
                message: `${capturedVisitor.name}의 불순한 기운을 성전에서 정화하고 불온한 도전을 분쇄했습니다.`,
                items: [
                    { label: '신앙심 상승', after: '+60' },
                    { label: '성전 위엄도', after: '+30' },
                    { label: '전리품 회수', after: `${seizedGold.toLocaleString()} 골드` }
                ]
            });
            setCapturedVisitor(null);
            setActiveVisitorId(null);
            setMobileTab('list');
        } else if (action === 'mercy') {
            // 자비 베풀기 및 과거 인연으로 등록
            newChar.faith = (newChar.faith || 0) + 50;
            if (newChar.base?.templePersonnel?.[templeKey]) {
                newChar.base.templePersonnel[templeKey].majesty = (newChar.base.templePersonnel[templeKey].majesty || 0) + 20;
            }

            registerPastConnection(newChar, capturedVisitor, `결투에서 패배한 후 사자의 도량과 자비를 입고 평생의 인연이 됨.`);

            onUpdateCharacter(newChar, `[성전의 자비] ${capturedVisitor.name}에게 관용을 베풀어 과거 인연으로 등록했습니다.`);
            setResultData({
                type: 'success',
                title: '자비 베풀기 완료',
                message: `무릎을 꿇은 ${capturedVisitor.name}을(를) 일으켜 세우고 성전의 도량으로 용서했습니다.\n"사자님의 강함과 자비에 진심으로 탄복했습니다. 이 은혜는 결코 잊지 않겠습니다!"\n그는 깊은 존경을 표하며 과거 인연으로 영구 등록되었습니다.`,
                items: [
                    { label: '신앙심 상승', after: '+50' },
                    { label: '성전 위엄도', after: '+20' },
                    { label: '사회적 관계망', after: '과거 인연으로 등록' }
                ]
            });
            setCapturedVisitor(null);
            setActiveVisitorId(null);
            setMobileTab('list');
        } else {
            // 동료 영입 제안
            const hasMaid = assignedStaff.some(s => s.role === '메이드');
            const baseChance = 35;
            const finalChance = Math.min(95, baseChance + (capturedVisitor.affection * 0.4) + (hasMaid ? 20 : 0));
            
            if (Math.random() * 100 < finalChance) {
                const { visitReason, intendedAction, isMet, discoveryDate, templeChatHistory, ...companionBase } = capturedVisitor;
                const hired: Companion = assignRandomCombatStyle({ ...companionBase, job: JobType.MERCENARY, isTemporary: false, loyalty: 40 }, true, true);
                
                if (newChar.companions.length < 5) newChar.companions.push(hired);
                else {
                    if (!newChar.inactiveCompanions) newChar.inactiveCompanions = [];
                    newChar.inactiveCompanions.push(hired);
                }
                
                onUpdateCharacter(newChar, `[성전 포섭] 굴복시킨 ${capturedVisitor.name}을(를) 성전의 동료로 영입했습니다.`);
                setResultData({
                    type: 'success',
                    title: '동료 영입 성공!',
                    message: `${capturedVisitor.name}이(가) 패배를 인정하고 사자님의 높은 뜻을 따르기로 맹세했습니다.`,
                    items: [
                        { label: '영입 대상', after: capturedVisitor.name },
                        { label: '성공 확률', after: `${finalChance.toFixed(1)}%` },
                        { label: '신규 직업', after: '용병 및 성전 수호자' }
                    ]
                });
                setCapturedVisitor(null);
                setActiveVisitorId(null);
                setMobileTab('list');
            } else {
                registerPastConnection(newChar, capturedVisitor, `영입 제안은 정중히 고사했으나 사자의 위엄에 감복하여 과거 인연으로 남음.`);
                onUpdateCharacter(newChar, `[성전 포섭 실패] ${capturedVisitor.name}은(는) 뜻을 정중히 거절하고 성전을 떠났습니다.`);
                setResultData({
                    type: 'failure',
                    title: '영입 제안 거절',
                    message: `${capturedVisitor.name}: "사자님의 위엄은 인정하나, 저는 제 길을 가야 합니다. 훗날 다시 인연이 닿기를 바랍니다."\n그는 정중히 작별을 고하고 떠났으며, 과거 인연으로 기록되었습니다.`,
                    items: [
                        { label: '성공 확률', after: `${finalChance.toFixed(1)}%` },
                        { label: '관계망 등록', after: '과거 인연으로 기록' }
                    ]
                });
                setCapturedVisitor(null);
                setActiveVisitorId(null);
                setMobileTab('list');
            }
        }
    };

    // 평화적 방문객 즉시 포섭 시도
    const handleImmediateRecruit = () => {
        if (!activeVisitor) return;
        
        const hasMaid = assignedStaff.some(s => s.role === '메이드');
        const baseChance = 25;
        const affinityBonus = activeVisitor.affection * 0.5;
        const maidBonus = hasMaid ? 20 : 0;
        
        const finalChance = Math.min(95, baseChance + affinityBonus + maidBonus);
        const roll = Math.random() * 100;
        
        const newChar = { ...character };
        newChar.base!.templeVisitors![templeKey] = visitors.filter(v => v.id !== activeVisitor.id);

        if (roll < finalChance) {
            const { visitReason, intendedAction, isMet, discoveryDate, templeChatHistory, ...companionBase } = activeVisitor;
            const hired: Companion = assignRandomCombatStyle({ ...companionBase, job: JobType.MERCENARY, isTemporary: false, loyalty: 40 }, true, true);
            
            if (newChar.companions.length < 5) newChar.companions.push(hired);
            else {
                if (!newChar.inactiveCompanions) newChar.inactiveCompanions = [];
                newChar.inactiveCompanions.push(hired);
            }
            
            onUpdateCharacter(newChar, `[성전 포섭] 우호적인 방문객 ${activeVisitor.name}을(를) 동료로 영입했습니다.`);
            setResultData({
                type: 'success',
                title: '동료 영입 성공!',
                message: `${activeVisitor.name}이(가) 당신의 인품과 성전의 기운에 감화되어 영구히 당신을 따르기로 했습니다.`,
                items: [
                    { label: '영입 대상', after: activeVisitor.name },
                    { label: '성공 확률', after: `${finalChance.toFixed(1)}%` }
                ]
            });
            setActiveVisitorId(null);
            setMobileTab('list');
        } else {
            registerPastConnection(newChar, activeVisitor, `성전 동료 제안을 사양하고 과거 인연으로 기록됨.`);
            setResultData({
                type: 'failure',
                title: '포섭 실패',
                message: `${activeVisitor.name}은(는) 정중히 거절하며 성전을 떠났습니다.\n"사자님의 뜻은 고귀하나, 저에게는 아직 가야 할 길이 있습니다."\n그는 감사 인사를 남기고 과거 인연으로 등록되었습니다.`,
                items: [
                    { label: '성공 확률', after: `${finalChance.toFixed(1)}%` },
                    { label: '관계망 등록', after: '과거 인연으로 등록' }
                ]
            });
            onUpdateCharacter(newChar, `[성전 포섭 실패] ${activeVisitor.name}이(가) 제안을 거절하고 떠났습니다.`);
            setActiveVisitorId(null);
            setMobileTab('list');
        }
    };

    const activeVisitor = visitors.find(v => v.id === activeVisitorId);
    const activeCategoryMeta = activeVisitor ? getVisitorCategoryMeta(activeVisitor) : null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-2 sm:p-4 animate-in fade-in">
            {resultData && <ActionResultModal data={resultData} onClose={() => setResultData(null)} />}

            {/* 결투 방식 선택 모달 (모바일 최적화) */}
            {showBattleOptions && activeVisitor && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/95 p-3 sm:p-4 animate-in zoom-in-95">
                    <div className="bg-slate-900 border border-red-500 rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="p-4 sm:p-6 bg-red-950/30 border-b border-red-900/50 flex justify-between items-center">
                            <h3 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                                <Sword className="text-red-400" size={20}/> 결투 방식 선택
                            </h3>
                            <button onClick={() => setShowBattleOptions(false)} className="text-slate-400 hover:text-white p-1">
                                <X size={20}/>
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 custom-scrollbar">
                            <div className="grid grid-cols-1 gap-3">
                                {/* 사자 직접 친정 결투 */}
                                <button 
                                    onClick={handleDirectBattleExecution}
                                    className="p-4 sm:p-5 bg-slate-800 hover:bg-red-950/40 border border-slate-700 hover:border-red-500 rounded-2xl text-left transition-all group"
                                >
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="p-2.5 bg-red-950/60 rounded-xl text-red-400 group-hover:scale-110 transition-transform">
                                            <Crown size={22}/>
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-white text-base">사자 직접 권능 결투</h4>
                                            <span className="text-[11px] text-red-300 font-bold">승리 시 즉시 포로 처분 모달로 직행</span>
                                        </div>
                                    </div>
                                    <p className="text-xs text-slate-400 leading-relaxed pl-1">
                                        플레이어가 신의 사자로서 직접 나서 적을 제압합니다. 승리 시 동료 영입, 자비 베풀기(과거 인연 등록), 성전 처단을 자유롭게 결정할 수 있습니다.
                                    </p>
                                </button>

                                {/* 실전 전장 진입 */}
                                <button 
                                    onClick={handleFullBattleField}
                                    className="p-4 sm:p-5 bg-slate-800 hover:bg-slate-700/60 border border-slate-700 hover:border-indigo-500 rounded-2xl text-left transition-all group"
                                >
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="p-2.5 bg-indigo-950/60 rounded-xl text-indigo-400 group-hover:scale-110 transition-transform">
                                            <Sword size={22}/>
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-white text-base">전체 화면 실전 전투 진입</h4>
                                            <span className="text-[11px] text-indigo-300 font-bold">수동 전장 인터페이스 실행</span>
                                        </div>
                                    </div>
                                    <p className="text-xs text-slate-400 leading-relaxed pl-1">
                                        전체 화면 전투 시스템으로 진입하여 스킬과 전술을 직접 구사하며 결투를 벌입니다.
                                    </p>
                                </button>

                                {/* 성전 인원 파견 */}
                                <div className="bg-slate-950 p-4 sm:p-5 rounded-2xl border border-indigo-900/50 flex flex-col">
                                    <h4 className="font-bold text-indigo-300 text-sm sm:text-base flex items-center gap-2 mb-3">
                                        <Users size={18}/> 성전 수호 인원 파견 결투
                                    </h4>
                                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                                        {assignedStaff.map(s => {
                                            const winRate = calculateWinRate(s.entity, activeVisitor);
                                            const isDefeated = defeatedStaffIds.has(s.entity.id);
                                            return (
                                                <button
                                                    key={s.entity.id}
                                                    disabled={isDefeated || isSimulating}
                                                    onClick={() => handleStaffDispatch(s.entity)}
                                                    className={`w-full p-3 rounded-xl border text-left flex justify-between items-center transition-all ${
                                                        isDefeated 
                                                            ? 'opacity-40 border-slate-800 grayscale cursor-not-allowed bg-slate-900' 
                                                            : 'bg-slate-900 border-slate-800 hover:border-indigo-500 active:scale-98'
                                                    }`}
                                                >
                                                    <div className="min-w-0">
                                                        <div className="text-xs sm:text-sm font-bold text-slate-200 truncate">{s.entity.name}</div>
                                                        <div className="text-[10px] text-slate-400">{s.role} • 레벨 {s.entity.level}</div>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="text-xs text-indigo-400 font-bold">승률 {winRate}%</div>
                                                        {isDefeated && <span className="text-[9px] text-red-400 font-bold block">부상 중</span>}
                                                    </div>
                                                </button>
                                            );
                                        })}
                                        {assignedStaff.length === 0 && (
                                            <p className="text-center py-4 text-xs text-slate-500 italic">배치된 성전 인원이 없습니다.</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                        {isSimulating && (
                            <div className="absolute inset-0 bg-black/75 flex flex-col items-center justify-center z-30">
                                <Loader2 size={44} className="animate-spin text-red-500 mb-3"/>
                                <p className="text-white font-bold tracking-widest text-sm">신의 권능으로 결투 진행 중...</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* [포로 처분 모달] 결투 승리 후 처분 결정 (모바일 최적화) */}
            {capturedVisitor && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/95 p-3 sm:p-4 animate-in fade-in">
                    <div className="bg-slate-900 border border-amber-500/80 rounded-3xl w-full max-w-md shadow-2xl p-6 sm:p-8 text-center max-h-[90vh] overflow-y-auto custom-scrollbar">
                        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-slate-800 border-2 border-amber-500 flex items-center justify-center mx-auto mb-4">
                            <Skull size={36} className="text-red-400" />
                        </div>
                        <h3 className="text-xl sm:text-2xl font-bold text-white mb-1">{capturedVisitor.name} 제압 완료</h3>
                        <p className="text-xs sm:text-sm text-slate-400 mb-6">
                            신의 권능 앞에 무릎을 꿇은 방문객입니다. 처분을 결정하십시오.
                        </p>
                        
                        <div className="grid grid-cols-1 gap-3">
                            {/* 1. 동료 영입 제안 */}
                            <button 
                                onClick={() => handleVisitorResolution('recruit')}
                                className="w-full py-3.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95 text-xs sm:text-sm"
                            >
                                <UserPlus size={18}/> 동료 영입 제안
                            </button>

                            {/* 2. 자비 베풀기 (과거 인연 등록) */}
                            <button 
                                onClick={() => handleVisitorResolution('mercy')}
                                className="w-full py-3.5 px-4 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl font-bold shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95 text-xs sm:text-sm"
                            >
                                <Heart size={18}/> 자비 베풀기 (과거 인연 등록)
                            </button>

                            {/* 3. 성전의 이름으로 처단 */}
                            <button 
                                onClick={() => handleVisitorResolution('execute')}
                                className="w-full py-3.5 px-4 bg-red-800 hover:bg-red-700 text-white rounded-xl font-bold shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95 text-xs sm:text-sm"
                            >
                                <Flame size={18}/> 성전의 이름으로 처단
                            </button>

                            <button 
                                onClick={() => setCapturedVisitor(null)} 
                                className="py-2.5 text-slate-400 hover:text-white text-xs transition-colors"
                            >
                                잠시 고민하기 (닫기)
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 메인 접견실 컨테이너 (모바일 최적화) */}
            <div className="bg-slate-900 border border-indigo-500/80 w-full max-w-5xl h-[92vh] sm:h-[88vh] rounded-3xl shadow-[0_0_100px_rgba(99,102,241,0.2)] flex flex-col overflow-hidden relative">
                
                {/* 상단 헤더 */}
                <div className="p-4 sm:p-5 border-b border-indigo-900/50 bg-indigo-950/30 flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="p-2 sm:p-2.5 bg-indigo-900/50 rounded-2xl text-indigo-400">
                            <Users size={24} className="sm:w-7 sm:h-7" />
                        </div>
                        <div>
                            <h2 className="text-lg sm:text-2xl font-bold text-white tracking-wide">성전 접견실</h2>
                            <p className="text-[11px] sm:text-xs text-slate-400">성전의 위엄을 듣고 찾아온 각 대륙의 방문객들을 맞이하십시오.</p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose} 
                        className="text-slate-400 hover:text-white p-2 rounded-full hover:bg-slate-800 transition-colors"
                        aria-label="닫기"
                    >
                        <X size={22} />
                    </button>
                </div>

                {/* 모바일 화면 탭 전환기 */}
                <div className="md:hidden flex border-b border-slate-800 bg-slate-950 shrink-0">
                    <button
                        onClick={() => setMobileTab('list')}
                        className={`flex-1 py-3 text-xs font-bold transition-all border-b-2 flex items-center justify-center gap-1.5 ${
                            mobileTab === 'list' 
                                ? 'text-indigo-400 border-indigo-500 bg-indigo-950/20' 
                                : 'text-slate-400 border-transparent'
                        }`}
                    >
                        <Users size={14}/> 방문객 명단 ({visitors.length})
                    </button>
                    <button
                        onClick={() => setMobileTab('detail')}
                        disabled={!activeVisitor}
                        className={`flex-1 py-3 text-xs font-bold transition-all border-b-2 flex items-center justify-center gap-1.5 ${
                            mobileTab === 'detail' 
                                ? 'text-indigo-400 border-indigo-500 bg-indigo-950/20' 
                                : activeVisitor ? 'text-slate-400 border-transparent' : 'text-slate-600 border-transparent opacity-50'
                        }`}
                    >
                        <ScrollText size={14}/> 접견 및 대화
                    </button>
                </div>

                {/* 본문 레이아웃 */}
                <div className="flex flex-1 overflow-hidden flex-col md:flex-row">
                    
                    {/* 좌측: 방문객 목록 패널 (모바일에서는 탭 선택 시만 표시) */}
                    <div className={`w-full md:w-80 border-r border-slate-800 bg-slate-950/40 flex flex-col shrink-0 ${
                        mobileTab === 'list' ? 'flex flex-1' : 'hidden md:flex'
                    }`}>
                        <div className="p-3 sm:p-4 border-b border-slate-800 flex justify-between items-center bg-black/20">
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                                방문객 명단 ({visitors.length})
                            </h3>
                            <button 
                                onClick={handleGenerateVisitors} 
                                disabled={isGenerating || lastRefresh === currentMonth} 
                                className={`text-[11px] font-bold flex items-center gap-1 transition-all ${
                                    lastRefresh === currentMonth ? 'text-slate-600 cursor-not-allowed' : 'text-indigo-400 hover:text-white'
                                }`}
                            >
                                <RefreshCw size={13} className={`${isGenerating ? 'animate-spin' : ''}`}/> 
                                {lastRefresh === currentMonth ? '다음 달 갱신' : '명단 갱신'}
                            </button>
                        </div>

                        {/* 방문객 카드 리스트 */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-2 sm:p-3 space-y-2">
                            {isGenerating ? (
                                <div className="py-20 flex flex-col items-center justify-center gap-3">
                                    <Loader2 className="animate-spin text-indigo-500" size={26}/>
                                    <p className="text-xs text-slate-400">성전 인맥을 동원해 방문객을 맞이하는 중...</p>
                                </div>
                            ) : visitors.map(v => {
                                const vMeta = getVisitorCategoryMeta(v);
                                const isSelected = activeVisitorId === v.id;
                                return (
                                    <button
                                        key={v.id}
                                        onClick={() => { 
                                            setActiveVisitorId(v.id); 
                                            setDefeatedStaffIds(new Set()); 
                                            setMobileTab('detail');
                                        }}
                                        className={`w-full p-3 rounded-2xl border text-left transition-all flex items-center gap-3 ${
                                            isSelected 
                                                ? 'bg-indigo-900/40 border-indigo-500 shadow-lg' 
                                                : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                                        }`}
                                    >
                                        <div className="w-12 h-12 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0 relative overflow-hidden">
                                            {v.visualUrl ? (
                                                <img src={v.visualUrl} alt={v.name} className="w-full h-full object-cover" />
                                            ) : (
                                                <span className="text-xl">👤</span>
                                            )}
                                            <span className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-tl-lg ${
                                                v.intendedAction === 'Hostile' ? 'bg-red-500' : 
                                                v.intendedAction === 'Peaceful' ? 'bg-green-500' : 'bg-yellow-500'
                                            }`}></span>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-center mb-0.5">
                                                <span className="text-sm font-bold text-slate-200 truncate">{v.name}</span>
                                                {v.isMet && <CheckCircle size={12} className="text-green-400 shrink-0"/>}
                                            </div>
                                            <div className="text-[10px] text-slate-400 truncate mb-1">
                                                {v.nation} • 레벨 {v.level}
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <span className={`text-[9px] px-1.5 py-0.2 rounded border font-medium ${vMeta.tagColor}`}>
                                                    {vMeta.tagLabel}
                                                </span>
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}

                            {visitors.length === 0 && !isGenerating && (
                                <div className="py-20 text-center text-slate-500">
                                    <Search size={32} className="mx-auto mb-2 opacity-30"/>
                                    <p className="text-xs">방문객 명단이 비어 있습니다.</p>
                                    <p className="text-[10px] text-slate-600 mt-1">상단의 명단 갱신 버튼을 눌러주십시오.</p>
                                </div>
                            )}
                        </div>

                        {/* 하단 성전 대기 인원 정보 */}
                        <div className="p-3 bg-slate-900/60 border-t border-slate-800 space-y-1.5 shrink-0">
                             <h4 className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
                                <ShieldCheck size={12} className="text-indigo-400"/> 성전 대기 인원 ({assignedStaff.length}명)
                             </h4>
                             <div className="space-y-1">
                                 {assignedStaff.slice(0, 2).map(s => (
                                     <div key={s.entity.id} className="flex items-center justify-between p-1.5 rounded-lg border border-slate-800/80 bg-slate-950 text-[10px] text-slate-300">
                                         <span className="truncate">{s.entity.name}</span>
                                         <span className="text-indigo-400 font-bold shrink-0">{s.role}</span>
                                     </div>
                                 ))}
                                 {assignedStaff.length > 2 && (
                                     <p className="text-[9px] text-slate-500 text-center">외 {assignedStaff.length - 2}명 대기 중</p>
                                 )}
                             </div>
                        </div>
                    </div>

                    {/* 우측: 방문객 상세 정보 및 대화/상호작용 패널 */}
                    <div className={`flex-1 flex flex-col bg-slate-900 relative ${
                        mobileTab === 'detail' ? 'flex flex-1' : 'hidden md:flex'
                    }`}>
                        {activeVisitor ? (
                            <div className="flex-1 flex flex-col h-full animate-in slide-in-from-right-3 duration-200">
                                
                                {/* 방문객 헤더 정보 (모바일 최적화) */}
                                <div className="p-4 sm:p-6 bg-slate-950/60 border-b border-slate-800 shrink-0">
                                    <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                                        <div className="flex items-start gap-3 w-full sm:w-auto">
                                            {/* 아바타 이미지 */}
                                            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-slate-800 border-2 border-indigo-500/50 overflow-hidden shrink-0 shadow-lg">
                                                {activeVisitor.visualUrl ? (
                                                    <img src={activeVisitor.visualUrl} alt={activeVisitor.name} className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-2xl">👤</div>
                                                )}
                                            </div>

                                            {/* 이름 및 핵심 뱃지 */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <h3 className="text-xl sm:text-2xl font-bold text-white tracking-wide truncate">
                                                        {activeVisitor.name}
                                                    </h3>
                                                    <span className={`text-[10px] px-2 py-0.5 rounded border font-bold ${
                                                        activeVisitor.intendedAction === 'Hostile' ? 'bg-red-950 text-red-300 border-red-700' : 
                                                        activeVisitor.intendedAction === 'Peaceful' ? 'bg-green-950 text-green-300 border-green-700' : 
                                                        'bg-yellow-950 text-yellow-300 border-yellow-700'
                                                    }`}>
                                                        {DISPOSITION_LABELS[activeVisitor.intendedAction]}
                                                    </span>
                                                </div>

                                                <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs text-slate-300">
                                                    <span className="flex items-center gap-1 font-medium">
                                                        <Globe size={13} className="text-indigo-400" /> {activeVisitor.nation}
                                                    </span>
                                                    <span className="text-slate-600">|</span>
                                                    <span>{activeVisitor.age}</span>
                                                    <span className="text-slate-600">|</span>
                                                    <span>{activeVisitor.gender}</span>
                                                </div>

                                                {/* 방문 목적 메시지 */}
                                                <div className="text-xs text-slate-300 mt-2 bg-slate-900/90 p-2.5 rounded-xl border border-slate-800 italic flex items-start gap-2">
                                                    <ScrollText size={14} className="text-amber-400 shrink-0 mt-0.5"/>
                                                    <span>"{activeVisitor.visitReason}"</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* 액션 버튼 그룹 (방문 목적에 따른 동적 분기) */}
                                        <div className="w-full sm:w-auto flex flex-wrap sm:flex-col gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800">
                                            
                                            {/* [액션 1] 마수 토벌 탄원인 경우 */}
                                            {activeCategoryMeta?.category === 'monster' && (
                                                <button 
                                                    onClick={handleAcceptMonsterSubjugation}
                                                    className="flex-1 sm:flex-none px-4 py-2.5 bg-purple-700 hover:bg-purple-600 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95"
                                                >
                                                    <Shield size={14}/> 토벌 탄원 수락 (즉시 정벌)
                                                </button>
                                            )}

                                            {/* [액션 2] 자원 지원 탄원인 경우 */}
                                            {activeCategoryMeta?.category === 'resource' && (
                                                <button 
                                                    onClick={handleSupportResources}
                                                    className="flex-1 sm:flex-none px-4 py-2.5 bg-cyan-700 hover:bg-cyan-600 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95"
                                                >
                                                    <Gift size={14}/> 구호 자원 지원 (마정석 500개 + 5만 골드)
                                                </button>
                                            )}

                                            {/* [액션 3] 적대적 방문객 또는 사자의 위엄 대련 희망자 */}
                                            {(activeCategoryMeta?.category === 'hostile' || activeCategoryMeta?.category === 'duel') && (
                                                <button 
                                                    onClick={() => setShowBattleOptions(true)} 
                                                    className={`flex-1 sm:flex-none px-4 py-2.5 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95 ${
                                                        activeCategoryMeta.category === 'hostile'
                                                            ? 'bg-red-700 hover:bg-red-600'
                                                            : 'bg-amber-600 hover:bg-amber-500'
                                                    }`}
                                                >
                                                    <Sword size={14}/> {activeCategoryMeta.category === 'hostile' ? '무력 심판' : '사자의 위엄 대련'}
                                                </button>
                                            )}

                                            {/* [액션 4] 평화적 귀의 희망자: 포섭 제안 및 축복 */}
                                            {activeCategoryMeta?.category === 'faith' && (
                                                <>
                                                    <button 
                                                        onClick={handleImmediateRecruit}
                                                        className="flex-1 sm:flex-none px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95"
                                                    >
                                                        <UserPlus size={14}/> 동료 포섭 제안
                                                    </button>
                                                    <button 
                                                        onClick={handleBestowBlessing}
                                                        className="flex-1 sm:flex-none px-4 py-2 bg-emerald-800 hover:bg-emerald-700 text-emerald-100 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow active:scale-95"
                                                    >
                                                        <Sparkles size={14}/> 성전의 축복 하사 (과거 인연)
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    {/* 4대 속성 배지: 클래스 해방, 전투 계열, 신력 계통, 클래스 명 (순수 한글 표시) */}
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mt-4">
                                        
                                        {/* 클래스 해방 정도 */}
                                        <div className="bg-slate-900/90 p-2.5 rounded-xl border border-slate-800">
                                            <span className="text-[9px] text-slate-400 font-bold block mb-0.5">클래스 해방</span>
                                            <span className="text-xs font-bold text-amber-400 flex items-center gap-1">
                                                <Award size={13}/> {CLASS_TIER_LABELS[activeVisitor.classTier] || '라스트 클래스'}
                                            </span>
                                        </div>

                                        {/* 전투 계열 */}
                                        <div className="bg-slate-900/90 p-2.5 rounded-xl border border-slate-800">
                                            <span className="text-[9px] text-slate-400 font-bold block mb-0.5">전투 계열</span>
                                            <span className="text-xs font-bold text-indigo-300 flex items-center gap-1 truncate">
                                                <Sword size={13}/> {activeVisitor.combatStyle || '대검사'}
                                            </span>
                                        </div>

                                        {/* 신력 계통 */}
                                        <div className="bg-slate-900/90 p-2.5 rounded-xl border border-slate-800">
                                            <span className="text-[9px] text-slate-400 font-bold block mb-0.5">신력 계통</span>
                                            <span className="text-xs font-bold text-pink-400 flex items-center gap-1 truncate">
                                                <Zap size={13}/> {activeVisitor.shinryokuType || '무속성'}
                                            </span>
                                        </div>

                                        {/* 클래스 명 */}
                                        <div className="bg-slate-900/90 p-2.5 rounded-xl border border-slate-800">
                                            <span className="text-[9px] text-slate-400 font-bold block mb-0.5">클래스 명</span>
                                            <span className="text-xs font-bold text-cyan-300 flex items-center gap-1 truncate">
                                                <Briefcase size={13}/> {activeVisitor.classType || '성기사'}
                                            </span>
                                        </div>
                                    </div>

                                    {/* 스탯 요약 줄 */}
                                    <div className="grid grid-cols-4 gap-2 mt-2">
                                        <div className="bg-slate-950/70 p-2 rounded-lg text-center border border-slate-800/80">
                                            <span className="text-[9px] text-slate-500 block">레벨</span>
                                            <span className="text-xs font-bold text-slate-200">레벨 {activeVisitor.level}</span>
                                        </div>
                                        <div className="bg-slate-950/70 p-2 rounded-lg text-center border border-slate-800/80">
                                            <span className="text-[9px] text-slate-500 block">호감도</span>
                                            <span className="text-xs font-bold text-pink-400">{activeVisitor.affection}</span>
                                        </div>
                                        <div className="bg-slate-950/70 p-2 rounded-lg text-center border border-slate-800/80">
                                            <span className="text-[9px] text-slate-500 block">체력</span>
                                            <span className="text-xs font-bold text-green-400">{activeVisitor.stats.hp?.toLocaleString()}</span>
                                        </div>
                                        <div className="bg-slate-950/70 p-2 rounded-lg text-center border border-slate-800/80">
                                            <span className="text-[9px] text-slate-500 block">공격력</span>
                                            <span className="text-xs font-bold text-amber-300">{Math.max(activeVisitor.stats.str, activeVisitor.stats.int)}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* 대화 채팅 영역 */}
                                <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3 custom-scrollbar bg-[url('https://www.transparenttextures.com/patterns/stardust.png')]">
                                    {(activeVisitor.templeChatHistory || []).length === 0 ? (
                                        <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-2 opacity-60">
                                            <MessageCircle size={44} />
                                            <p className="text-sm font-bold">방문객에게 말을 건네어 접견을 시작하십시오.</p>
                                            <p className="text-[11px] text-center max-w-sm">
                                                신앙의 도량으로 설득하면 적대적인 자의 마음을 돌릴 수 있으며, 우호적인 관계는 더욱 돈독해집니다.
                                            </p>
                                        </div>
                                    ) : (
                                        activeVisitor.templeChatHistory!.map((msg, i) => (
                                            <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                                                <div className={`max-w-[85%] sm:max-w-[75%] p-3.5 rounded-2xl text-xs sm:text-sm shadow-md leading-relaxed ${
                                                    msg.role === 'user' 
                                                        ? 'bg-indigo-600 text-white rounded-tr-none' 
                                                        : 'bg-slate-800 text-slate-200 border border-slate-700 rounded-tl-none'
                                                }`}>
                                                    {msg.text}
                                                </div>
                                                <span className="text-[10px] text-slate-500 mt-1 px-1 font-bold">
                                                    {msg.role === 'user' ? activeMessenger?.name || character.name : activeVisitor.name}
                                                </span>
                                            </div>
                                        ))
                                    )}
                                    <div ref={chatEndRef} />
                                </div>

                                {/* 하단 대화 입력창 */}
                                <div className="p-3 sm:p-4 bg-slate-950 border-t border-slate-800 shrink-0">
                                    <div className="relative max-w-3xl mx-auto">
                                        <input 
                                            type="text" 
                                            value={chatInput}
                                            onChange={(e) => setChatInput(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && handleChat()}
                                            disabled={isChatting}
                                            className="w-full bg-slate-900 border border-slate-700 rounded-full py-3 pl-5 pr-14 text-xs sm:text-sm text-slate-200 focus:outline-none focus:border-indigo-500 transition-all shadow-inner"
                                            placeholder={isChatting ? "방문객의 반응을 살피는 중..." : "신의 사자로서 방문객에게 대화를 건네십시오..."}
                                        />
                                        <button 
                                            onClick={handleChat}
                                            disabled={!chatInput.trim() || isChatting}
                                            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full disabled:opacity-50 transition-all shadow-md active:scale-95"
                                            aria-label="전송"
                                        >
                                            {isChatting ? <Loader2 size={16} className="animate-spin"/> : <Send size={16} />}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-slate-600 space-y-3 p-4">
                                <UserCheck size={64} className="opacity-20"/>
                                <div className="text-center space-y-1">
                                    <p className="text-base font-bold text-slate-400">성전 접견실에 오신 것을 환영합니다</p>
                                    <p className="text-xs text-slate-500">좌측 명단에서 방문객을 선택하여 접견을 시작하십시오.</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TempleReceptionModal;
