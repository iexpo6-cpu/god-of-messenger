
import React, { useState, useEffect, useRef } from 'react';
import { Character, Companion, ClubType, SimpleStudent, ClassTier, WeaponType, ItemRarity, Item, Stats, JobType } from '../types';
import { LayoutGrid, Sword, Target, Sparkles, Crown, ShieldAlert, UserPlus, Trophy, Users, Loader2, ArrowRight, RefreshCw, CheckCircle, Info, Star, Zap, Activity, Brain, Box, Heart, MessageCircle, Send, X, PlusCircle, Coffee, Gift, Coins } from 'lucide-react';
import { generateClassmates, generateName, addMasteryExp, addDays, getTierByLevel, generateCompanionStats, generateDefaultVisualUrl, assignRandomCombatStyle } from '../utils';
import { MAX_PARTY_SIZE, SHINRYOKU_UI_CONFIG, WEAPON_MASTERY_CONFIG, WEAPON_TYPE_KOREAN } from '../constants';
import ActionResultModal, { ResultData } from './ActionResultModal';
import { GoogleGenAI } from "@google/genai";

const CLUB_CONFIG: Record<ClubType, { 
    label: string, 
    desc: string, 
    icon: any, 
    color: string, 
    bg: string,
    border: string,
    benefits: string[]
}> = {
    [ClubType.NONE]: { label: '없음', desc: '현재 가입된 동아리가 없습니다.', icon: LayoutGrid, color: 'text-slate-500', bg: 'bg-slate-900', border: 'border-slate-800', benefits: [] },
    [ClubType.MELEE]: { label: '근접 무기부', desc: '도검, 창 등 근접 무기 숙련을 연구합니다.', icon: Sword, color: 'text-red-500', bg: 'bg-red-950/20', border: 'border-red-500/50', benefits: ['STR +1 상승', '근접 무기 숙련도 보너스'] },
    [ClubType.RANGED]: { label: '원거리 무기부', desc: '활, 석궁 등 원거리 무기의 정밀도를 높입니다.', icon: Target, color: 'text-blue-500', bg: 'bg-blue-950/20', border: 'border-blue-500/50', benefits: ['AGI +1 상승', '원거리 무기 숙련도 보너스'] },
    [ClubType.MAGIC_ENG]: { label: '마법 공학부', desc: '마법 도구와 에너지 장비의 원리를 탐구합니다.', icon: Sparkles, color: 'text-purple-500', bg: 'bg-purple-950/20', border: 'border-purple-500/50', benefits: ['INT +1 상승', '마법 무기 숙련도 보너스'] },
    [ClubType.COUNCIL]: { label: '학생회', desc: '학교의 질서를 유지하고 행정을 보좌합니다.', icon: Crown, color: 'text-amber-500', bg: 'bg-amber-950/20', border: 'border-amber-500/50', benefits: ['평판 상승폭 증가', '학교 전용 물자 보급'] },
    [ClubType.DISCIPLINARY]: { label: '선도부', desc: '부정한 행위를 감시하고 교내 치안을 책임집니다.', icon: ShieldAlert, color: 'text-indigo-500', bg: 'bg-indigo-950/20', border: 'border-indigo-500/50', benefits: ['평판 하락 방지', '전리품(결정류) 수급'] },
};

interface Props {
    character: Character;
    onUpdateCharacter: (newChar: Character, logMsg: string) => void;
}

interface SubActivityOption {
    id: string;
    title: string;
    desc: string;
    icon: any;
    targetWeapon?: WeaponType;
    statGain?: { stat: 'str' | 'agi' | 'int'; amount: number };
    masteryExp?: number;
    repGain?: number;
    goldGain?: number;
    itemReward?: Item;
    classmateAffection?: number;
    contributionGain: number;
    resultTitle: string;
    resultMessage: string;
}

const GET_CLUB_SUB_ACTIVITIES = (club: ClubType): SubActivityOption[] => {
    switch (club) {
        case ClubType.MELEE:
            return [
                {
                    id: 'melee_sword',
                    title: '⚔️ 검 / 도검 정밀 연마',
                    desc: '검끝의 베기 모션과 받쳐 베기 각도를 숙련자 교관의 지도 아래 백번 이상 수련합니다.',
                    icon: Sword,
                    targetWeapon: 'Sword' as WeaponType,
                    statGain: { stat: 'str', amount: 1 },
                    masteryExp: 15,
                    contributionGain: 15,
                    resultTitle: '⚔️ 검술 정밀 연마 성공',
                    resultMessage: '날 선 검의 베기 궤적과 검기를 가다듬었습니다. 손끝에서 전달되는 직관적인 감각이 향상되었습니다.'
                },
                {
                    id: 'melee_spear',
                    title: '🔱 창 / 자루무기 사거리 연마',
                    desc: '창, 할버드 등 긴 무기를 이용해 상대와의 거리를 유지하며 약점을 노리는 찌르기 훈련.',
                    icon: Target,
                    targetWeapon: 'Spear' as WeaponType,
                    statGain: { stat: 'str', amount: 1 },
                    masteryExp: 15,
                    contributionGain: 15,
                    resultTitle: '🔱 창술 및 리치 제어 수련 완료',
                    resultMessage: '상대의 방어를 무너뜨리는 예리한 창끝 찌르기와 회전 방어 기교를 터득했습니다.'
                },
                {
                    id: 'melee_axe',
                    title: '🪓 둔기 & 도끼 강타 수련',
                    desc: '메이스, 대형 도끼의 묵직한 중력을 이용해 실전 방어구를 파쇄하는 타격 연마.',
                    icon: Zap,
                    targetWeapon: 'Axe' as WeaponType,
                    statGain: { stat: 'str', amount: 1 },
                    masteryExp: 15,
                    contributionGain: 15,
                    resultTitle: '🪓 둔기 & 도끼 타격 수련 완료',
                    resultMessage: '육중한 목재 더미를 단숨에 가르는 파괴적인 체중 실어 치기 감각을 완전히 몸에 익혔습니다.'
                },
                {
                    id: 'melee_knuckle',
                    title: '🥊 무투 & 권법 실전 결투',
                    desc: '무기를 놓친 위급 상황을 대비해 전신 유술 및 맨손 결투 기교를 교환합니다.',
                    icon: Activity,
                    targetWeapon: 'Knuckle' as WeaponType,
                    statGain: { stat: 'str', amount: 1 },
                    masteryExp: 15,
                    contributionGain: 15,
                    resultTitle: '🥊 무투 & 권법 실전 대련 성공',
                    resultMessage: '부원들과 땀 뻘뻘 흘리며 전신 타격과 회피를 교환했습니다. 근접전 기동성과 근력이 향상되었습니다.'
                }
            ];
        case ClubType.RANGED:
            return [
                {
                    id: 'ranged_bow',
                    title: '🏹 궁술 과녁 정밀 사격',
                    desc: '바람의 궤적과 거리를 계산해 장궁으로 50미터 밖 표적을 정확히 꿰뚫는 훈련.',
                    icon: Target,
                    targetWeapon: 'Bow' as WeaponType,
                    statGain: { stat: 'agi', amount: 1 },
                    masteryExp: 15,
                    contributionGain: 15,
                    resultTitle: '🏹 궁술 과녁 정밀 사격 완료',
                    resultMessage: '숨을 멈추고 활시위를 당겨 과녁 정중앙을 연속으로 관통했습니다. 민첩한 시위 당김이 가다듬어졌습니다.'
                },
                {
                    id: 'ranged_crossbow',
                    title: '🎯 석궁 엄폐 속사 수련',
                    desc: '엄폐물 뒤에서 기계식 시위를 순식간에 재장전하고 사격하는 이동 사격 훈련.',
                    icon: Zap,
                    targetWeapon: 'Crossbow' as WeaponType,
                    statGain: { stat: 'agi', amount: 1 },
                    masteryExp: 15,
                    contributionGain: 15,
                    resultTitle: '🎯 석궁 이동 속사 훈련 완료',
                    resultMessage: '신속하게 장전 레버를 당기며 엄폐 사격을 이어가는 민첩한 동작을 완성했습니다.'
                },
                {
                    id: 'ranged_gun',
                    title: '🔫 마도총기 조준 사격',
                    desc: '화약과 마력이 조합된 사격 반동을 완벽히 흡수하며 지향 사격 정밀도를 확보합니다.',
                    icon: Sparkles,
                    targetWeapon: 'Gun' as WeaponType,
                    statGain: { stat: 'agi', amount: 1 },
                    masteryExp: 15,
                    contributionGain: 15,
                    resultTitle: '🔫 마도총기 사격 훈련 성공',
                    resultMessage: '사격 시 발생하는 격렬한 마력 반동을 제어하여 목표물에 정확한 화력을 집약시켰습니다.'
                }
            ];
        case ClubType.MAGIC_ENG:
            return [
                {
                    id: 'magic_staff',
                    title: '🪄 지팡이 & 회로 정밀 조율',
                    desc: '마법 지팡이 코어 룬의 마력 손실률을 최소화하고 영창 속도를 기계공학적으로 개선합니다.',
                    icon: Sparkles,
                    targetWeapon: 'Staff' as WeaponType,
                    statGain: { stat: 'int', amount: 1 },
                    masteryExp: 15,
                    contributionGain: 15,
                    resultTitle: '🪄 지팡이 회로 조율 성공',
                    resultMessage: '지팡이 내부에 세겨진 룬 전도선을 정비하여 영창 속도와 마력 집약 효율을 극대화했습니다.'
                },
                {
                    id: 'magic_grimoire',
                    title: '🔮 마도구 아티팩트 제련',
                    desc: '연구실 마법 연금로에서 신비로운 마력 결정을 정제하고 소품을 조립합니다.',
                    icon: Box,
                    targetWeapon: 'Grimoire' as WeaponType,
                    statGain: { stat: 'int', amount: 1 },
                    masteryExp: 15,
                    contributionGain: 15,
                    itemReward: {
                        name: "정제된 마력 결정",
                        type: "Etc",
                        rarity: ItemRarity.MAGIC,
                        description: "마법 공학부 연구실에서 고순도로 정제한 보석 결정입니다.",
                        enhancement: 0
                    },
                    resultTitle: '🔮 마도구 아티팩트 제련 성공',
                    resultMessage: '고열 마력로에서 불순물을 제거하고 빛나는 순수 마력 결정을 정제해내는 데 성공했습니다!'
                },
                {
                    id: 'magic_orb',
                    title: '⚙️ 마도 기계 & 자장 회로 연구',
                    desc: '고출력 마도 엔진 회로와 보호막 발생 기계 모듈을 조립하고 실험 구동합니다.',
                    icon: Brain,
                    targetWeapon: 'Orb' as WeaponType,
                    statGain: { stat: 'int', amount: 1 },
                    masteryExp: 15,
                    contributionGain: 15,
                    resultTitle: '⚙️ 마도 기계 동력 연구 완료',
                    resultMessage: '마도 기계의 자장 파동을 안정화시키며 깊이 있는 마도공학 지식을 체득했습니다.'
                }
            ];
        case ClubType.COUNCIL:
            return [
                {
                    id: 'council_budget',
                    title: '📜 교내 예산 심의 & 축제 준비',
                    desc: '각 동아리의 예산 요구안을 신중히 심의하고 다가오는 학원제 행사를 기획합니다.',
                    icon: Crown,
                    repGain: 1,
                    contributionGain: 20,
                    itemReward: {
                        name: "학생회 보급품(엘릭서)",
                        type: "Consumable",
                        rarity: ItemRarity.RARE,
                        description: "학생회 임원들에게만 지급되는 고품질 회복약입니다.",
                        enhancement: 0,
                        secondaryOptions: ["HP/MP 50% 회복"],
                        imageUrl: "https://i.ibb.co/Mk5JJxWZ/Gemini-Generated-Image-gilyxigilyxigily.png"
                    },
                    resultTitle: '📜 교내 예산 심의 완료',
                    resultMessage: '동아리 대표들의 요구를 원만히 조정하고 교내 축제 준비를 완벽히 마쳤습니다. 임원 보급품을 획득했습니다!'
                },
                {
                    id: 'council_admin',
                    title: '🏛️ 교무실 & 시설물 행정 보좌',
                    desc: '교사들의 공문 작성을 돕고 수련장과 도서관 시설물 안전 상태를 점검합니다.',
                    icon: ShieldAlert,
                    repGain: 1,
                    goldGain: 5000,
                    contributionGain: 20,
                    resultTitle: '🏛️ 학원 행정 지원 완수',
                    resultMessage: '선생님들의 직무 부담을 덜어드리고 시설을 안전하게 점검했습니다. 행정 보조 수당 5,000G를 수령했습니다.'
                },
                {
                    id: 'council_exchange',
                    title: '🤝 타 학교 친선 교류회 주최',
                    desc: '타 국가 학원의 학생회 귀빈들을 초대하여 우호 친선 문화 교류회를 주관합니다.',
                    icon: Users,
                    repGain: 1,
                    classmateAffection: 3,
                    contributionGain: 20,
                    resultTitle: '🤝 친선 학원 교류회 성료',
                    resultMessage: '귀빈들을 정성껏 대접하고 자매결연 행사를 성공적으로 진행했습니다! 학교의 명성이 드높아졌습니다.'
                }
            ];
        case ClubType.DISCIPLINARY:
            return [
                {
                    id: 'disc_morning',
                    title: '🚨 등교길 복장 & 규율 단속',
                    desc: '이른 아침 교문 앞에서 교복 착용 상태, 복장 및 지각생을 엄격히 단속합니다.',
                    icon: ShieldAlert,
                    repGain: 1,
                    contributionGain: 20,
                    itemReward: {
                        name: "압수된 마력 결정",
                        type: "Etc",
                        rarity: ItemRarity.MAGIC,
                        description: "불량 학생들에게서 단속을 통해 압수한 순도 높은 마력 결정입니다.",
                        enhancement: 0
                    },
                    resultTitle: '🚨 등교길 규율 단속 완료',
                    resultMessage: '선도부 완장을 차고 교문을 지키며 규율 위반자를 계도했습니다. 압수품 마력 결정을 획득했습니다.'
                },
                {
                    id: 'disc_patrol',
                    title: '🛡️ 교내 방과 후 우범 구역 순찰',
                    desc: '기숙사 뒷길, 구관 강당 등 안전사고 우려 구역을 철저히 순찰하고 정돈합니다.',
                    icon: Trophy,
                    repGain: 1,
                    goldGain: 5000,
                    contributionGain: 20,
                    resultTitle: '🛡️ 방과 후 교내 순찰 완료',
                    resultMessage: '어두워진 학원 주변을 구석구석 점검하여 불의의 사고를 예방했습니다. 순찰 수당 5,000G를 수령했습니다.'
                },
                {
                    id: 'disc_raid',
                    title: '⚔️ 비밀 음성 모임 적발 & 단속',
                    desc: '학원 규정을 어기고 위험한 음모나 밀거래를 시도하는 불량 모임을 급습합니다.',
                    icon: Zap,
                    repGain: 1,
                    contributionGain: 25,
                    itemReward: {
                        name: "압수된 희귀 마력 결정",
                        type: "Etc",
                        rarity: ItemRarity.RARE,
                        description: "비밀 유흥 모임 단속 과정에서 압수한 고가치 희귀 결정입니다.",
                        enhancement: 0
                    },
                    resultTitle: '⚔️ 불법 모임 급습 단속 성공',
                    resultMessage: '규율을 어긴 불량 집단을 안전하게 소탕하고 질서를 확립했습니다! 희귀 마력 결정을 확보했습니다.'
                }
            ];
        default:
            return [];
    }
};

const ClubModal: React.FC<Props> = ({ character, onUpdateCharacter }) => {
    const [activeTab, setActiveTab] = useState<'lobby' | 'activity' | 'members'>('lobby');
    const [isGeneratingMembers, setIsGeneratingMembers] = useState(false);
    const [resultData, setResultData] = useState<ResultData | null>(null);
    
    // Chat UI States
    const [chatMember, setChatMember] = useState<SimpleStudent | null>(null);
    const [chatInput, setChatInput] = useState('');
    const [isChatting, setIsChatting] = useState(false);
    const chatEndRef = useRef<HTMLDivElement>(null);

    const characterClub = character.clubData?.joinedClub || ClubType.NONE;
    const currentMonth = character.currentDate?.substring(0, 7);
    const currentYear = parseInt(character.currentDate?.substring(0, 4) || '2000');
    const isActivityDone = character.schoolData?.lastClubActivityDate === currentMonth;
    const hasTrainedThisMonth = character.clubData?.lastTrainingDate === currentMonth;
    
    const clubMembers = character.clubData?.clubMembers || [];

    useEffect(() => {
        if (chatMember) {
            chatEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
        }
    }, [chatMember?.chatHistory]);

    // [NEW] 중복 영입 체크 헬퍼
    const isAlreadyRecruited = (id: string) => {
        return character.companions.some(c => c.id === id) || 
               character.inactiveCompanions?.some(c => c.id === id);
    };

    const generateClubMembers = () => {
        if (characterClub === ClubType.NONE) return;
        if (clubMembers.length > 0) return; 

        setIsGeneratingMembers(true);
        setTimeout(() => {
            const playerTier = character.schoolData?.tier || 'Elementary';
            // [MODIFIED] 학교의 국적(현재 위치)을 바탕으로 동아리원 생성
            const schoolNation = character.currentLocation?.nation || character.nation;
            const newMembers = generateClassmates(schoolNation, 8, playerTier, undefined, [], 1, undefined, true, currentYear);
            
            const newChar = { ...character };
            newChar.clubData = {
                ...(newChar.clubData || { joinedClub: ClubType.NONE, activityCount: 0, contribution: 0 }),
                clubMembers: newMembers
            };
            
            onUpdateCharacter(newChar, ""); 
            setIsGeneratingMembers(false);
        }, 800);
    };

    useEffect(() => {
        if (activeTab === 'members' && characterClub !== ClubType.NONE && clubMembers.length === 0) {
            generateClubMembers();
        }
    }, [activeTab, characterClub]);

    const handleJoinClub = (club: ClubType) => {
        if (characterClub !== ClubType.NONE) {
            if (!window.confirm("이미 가입된 동아리가 있습니다. 탈퇴하고 새로 가입하시겠습니까? (기존 동아리원과의 인연 및 데이터가 초기화됩니다)")) return;
        }

        const newChar = { ...character };
        newChar.clubData = {
            joinedClub: club,
            activityCount: 0,
            contribution: 0,
            clubMembers: undefined 
        };

        onUpdateCharacter(newChar, `[동아리] '${club}'에 가입했습니다. 이제 방과 후 활동에 참여할 수 있습니다.`);
        setResultData({
            type: 'success',
            title: '동아리 가입 완료',
            message: `${club}의 일원이 되었습니다. 숲의 정기를 머금은 활동들이 그대를 기다립니다.`,
            items: [{ label: '소속', after: club }]
        });
    };

    const handleActivity = (type: 'training' | 'service' | 'research') => {
        if (isActivityDone) return;
        if (characterClub === ClubType.NONE) return alert("가입된 동아리가 없습니다.");

        const newChar = { ...character };
        let result: ResultData = { type: 'info', title: '활동 보고', message: '', items: [] };
        
        const nextDate = addDays(character.currentDate || '2000-01-01', 1);
        newChar.currentDate = nextDate;
        if (newChar.schoolData) newChar.schoolData.lastClubActivityDate = currentMonth;

        if (characterClub === ClubType.MELEE || characterClub === ClubType.RANGED || characterClub === ClubType.MAGIC_ENG) {
            const statKey = characterClub === ClubType.MELEE ? 'str' : characterClub === ClubType.RANGED ? 'agi' : 'int';
            newChar.stats[statKey as keyof Stats] += 1;
            
            const weaponCategory: 'Melee' | 'Ranged' | 'Magic' = characterClub === ClubType.MELEE ? 'Melee' : characterClub === ClubType.RANGED ? 'Ranged' : 'Magic';
            const possibleTypes = WEAPON_MASTERY_CONFIG[weaponCategory].types;
            const targetType = possibleTypes[Math.floor(Math.random() * possibleTypes.length)];
            const targetLabel = WEAPON_TYPE_KOREAN[targetType] || targetType;
            
            const res = addMasteryExp(newChar, targetType as WeaponType, 10);
            newChar.weaponMastery = (res.char as any).weaponMastery;

            result.message = `훈련을 통해 기초 체력과 ${targetLabel} 무기 감각을 연마했습니다.`;
            result.items = [
                { label: '능력치 상승', after: `${statKey.toUpperCase()} +1` },
                { label: '무기 숙련도', after: `${targetLabel} +10` }
            ];
        } else if (characterClub === ClubType.COUNCIL) {
            newChar.schoolData!.reputation += 1;
            if (Math.random() < 0.3) {
                const potion: Item = {
                    name: "학생회 보급품(엘릭서)",
                    type: "Consumable",
                    rarity: ItemRarity.RARE,
                    description: "학생회 임원들에게만 지급되는 고품질 회복약입니다.",
                    enhancement: 0,
                    secondaryOptions: ["HP/MP 50% 회복"],
	        imageUrl:"https://i.ibb.co/Mk5JJxWZ/Gemini-Generated-Image-gilyxigilyxigily.png"
                };
                newChar.inventory.push(potion);
                result.items.push({ label: '보급품', after: '엘릭서' });
            }
            result.title = "학생회 활동 완료";
            result.message = "학교의 발전을 위해 헌신했습니다. 학생들 사이에서 평판이 좋아집니다.";
            result.items.unshift({ label: '교내 평판', after: '+1' });
        } else if (characterClub === ClubType.DISCIPLINARY) {
            newChar.schoolData!.reputation += 1;
            const crystal: Item = {
                name: "압수된 마력 결정",
                type: "Etc",
                rarity: ItemRarity.MAGIC,
                description: "불량 학생들에게서 압수한 순도 높은 결정입니다.",
                enhancement: 0
            };
            newChar.inventory.push(crystal);
            result.title = "선도부 순찰 완료";
            result.message = "교내의 질서를 어지럽히는 자들을 적발하고 전리품을 확보했습니다.";
            result.items = [
                { label: '교내 평판', after: '+1' },
                { label: '획득 아이템', after: '마법 결정' }
            ];
        }

        if (newChar.clubData) {
            newChar.clubData.activityCount += 1;
            newChar.clubData.contribution += 10;
        }

        onUpdateCharacter(newChar, `[동아리 활동] ${characterClub} 활동에 참여하여 하루를 보냈습니다.`);
        setResultData(result);
    };

    const handleSendMessage = async () => {
        if (!chatInput.trim() || !chatMember || isChatting) return;
        
        const userMsg = chatInput;
        setChatInput('');
        setIsChatting(true);

        try {
            const prompt = `
            당신은 판타지 RPG '신의 사자'의 학교 동아리원인 '${chatMember.name}'입니다.
            플레이어와 같은 '${characterClub}' 소속입니다.
            
            [캐릭터 정보]
            이름: ${chatMember.name}
            나이: ${chatMember.age}
            성격: ${chatMember.personality}
            외모: ${chatMember.appearance}
            동아리: ${characterClub}
            호감도: ${chatMember.affection}
            
            [응답 지침]
            1. 한국어로 답변하십시오.
            2. 캐릭터의 성격과 동아리 성격에 맞는 대화를 하십시오.
            3. 답변은 2~3문장 내외로 작성하십시오.
            4. 답변 끝에 호감도 변화가 필요하다면 [AFF+1] 또는 [AFF-1] 태그를 붙이십시오.
            
            [플레이어의 메시지]
            "${userMsg}"
            `;

            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
            const result = await ai.models.generateContent({
                model: 'gemini-3.8-flash',
                contents: [{ role: 'user', parts: [{ text: prompt }] }]
            });

            const replyText = result.text || "...";
            const newChar = { ...character };
            const members = [...(newChar.clubData?.clubMembers || [])];
            const idx = members.findIndex(m => m.id === chatMember.id);
            
            if (idx !== -1) {
                const updatedMember = { ...members[idx] };
                updatedMember.chatHistory = [...(updatedMember.chatHistory || []), 
                    { role: 'user', text: userMsg }, 
                    { role: 'model', text: replyText.replace(/\[AFF[+-]\d+\]/g, '').trim() }
                ];
                
                const affMatch = replyText.match(/\[AFF([+-]\d+)\]/);
                if (affMatch) {
                    updatedMember.affection = Math.min(100, Math.max(-100, updatedMember.affection + parseInt(affMatch[1])));
                }
                
                members[idx] = updatedMember;
                newChar.clubData!.clubMembers = members;
                setChatMember(updatedMember);
                onUpdateCharacter(newChar, "");
            }
        } finally {
            setIsChatting(false);
        }
    };

    const handleExecuteSubActivity = (opt: SubActivityOption) => {
        if (isActivityDone) {
            alert('이번 달 부활동은 이미 진행했습니다. 다음 달에 다시 참여할 수 있습니다!');
            return;
        }
        if (characterClub === ClubType.NONE) return alert("가입된 동아리가 없습니다.");

        const newChar = { ...character };
        
        // 1일 경과
        const nextDate = addDays(character.currentDate || '2000-01-01', 1);
        newChar.currentDate = nextDate;
        if (newChar.schoolData) newChar.schoolData.lastClubActivityDate = currentMonth;

        let resultItems: { label: string, after: string }[] = [];

        // 1) 능력치 상승
        if (opt.statGain) {
            newChar.stats[opt.statGain.stat] += opt.statGain.amount;
            resultItems.push({ label: '능력치 상승', after: `${opt.statGain.stat.toUpperCase()} +${opt.statGain.amount}` });
        }

        // 2) 무기 숙련도
        if (opt.targetWeapon && opt.masteryExp) {
            const targetLabel = WEAPON_TYPE_KOREAN[opt.targetWeapon] || opt.targetWeapon;
            const res = addMasteryExp(newChar, opt.targetWeapon, opt.masteryExp);
            newChar.weaponMastery = (res.char as any).weaponMastery;
            resultItems.push({ label: '무기 숙련도', after: `${targetLabel} +${opt.masteryExp}` });
        }

        // 3) 평판
        if (opt.repGain) {
            if (!newChar.schoolData) {
                newChar.schoolData = { tier: '초등학교' as any, grade: 1, classNumber: 1, semester: 1, midtermPassed: false, finalPassed: false, classmates: [], rank: 1, reputation: 0, isGraduated: false, schoolName: '초등학교' };
            }
            const actualRepGain = opt.repGain;
            newChar.schoolData.reputation += actualRepGain;
            resultItems.push({ label: '교내 평판', after: `+${actualRepGain}` });
        }

        // 4) 골드 보상
        if (opt.goldGain) {
            newChar.money = (newChar.money || 0) + opt.goldGain;
            resultItems.push({ label: '활동 수당', after: `+${opt.goldGain.toLocaleString()} G` });
        }

        // 5) 아이템 보상
        if (opt.itemReward) {
            newChar.inventory = [...(newChar.inventory || []), opt.itemReward];
            resultItems.push({ label: '획득 아이템', after: opt.itemReward.name });
        }

        // 6) 급우 호감도
        if (opt.classmateAffection && newChar.schoolData?.classmates) {
            newChar.schoolData.classmates = newChar.schoolData.classmates.map(s => ({
                ...s,
                affection: Math.min(100, (s.affection || 0) + opt.classmateAffection!)
            }));
            resultItems.push({ label: '급우 전체 호감도', after: `+${opt.classmateAffection} ♥` });
        }

        // 7) 동아리 활동 수 & 기여도
        if (!newChar.clubData) {
            newChar.clubData = { joinedClub: characterClub, activityCount: 0, contribution: 0 };
        }
        newChar.clubData.activityCount += 1;
        newChar.clubData.contribution += opt.contributionGain;
        resultItems.push({ label: '동아리 기여도', after: `+${opt.contributionGain} pt` });
        resultItems.push({ label: '소요 시간', after: '1일 경과' });

        onUpdateCharacter(newChar, `[동아리 활동] ${characterClub} - ${opt.title} 수행 완료 (날짜: ${newChar.currentDate})`);
        
        setResultData({
            type: 'success',
            title: opt.resultTitle,
            message: opt.resultMessage,
            items: resultItems
        });
    };

    const handleMemberSocialAction = (actionType: 'tea' | 'gift' | 'training', student: SimpleStudent) => {
        const newChar = { ...character };
        const members = [...(newChar.clubData?.clubMembers || [])];
        const idx = members.findIndex(m => m.id === student.id);
        if (idx === -1) return;

        const currentMember = members[idx];
        let affGain = 0;
        let logMsg = '';
        let cost = 0;
        let daysToPass = 0;
        let successTitle = '';
        let successMsg = '';
        let resultItems: { label: string, after: string }[] = [];

        if (actionType === 'tea') {
            cost = 10000;
            if (newChar.money < cost) {
                alert(`골드가 부족합니다! (필요: ${cost.toLocaleString()} Gold, 보유: ${newChar.money.toLocaleString()} Gold)`);
                return;
            }
            newChar.money -= cost;
            affGain = Math.floor(Math.random() * 4) + 6; // 6~9
            currentMember.affection = Math.min(100, currentMember.affection + affGain);
            logMsg = `[동아리 교류] ${currentMember.name}와(과) 허브차를 마시며 깊은 대화를 나누었습니다. (호감도 +${affGain}, -10,000 Gold)`;
            successTitle = '🍵 따뜻한 티타임';
            successMsg = `향기로운 허브차가 담긴 찻잔을 사이에 두고 ${currentMember.name}와(과) 서로의 관심사에 대해 즐겁게 소통했습니다. 차분해진 마음으로 서로 더 가까워진 기분입니다.`;
            resultItems = [
                { label: '소비 골드', after: `-${cost.toLocaleString()} G` },
                { label: '호감도 상승', after: `+${affGain} ♥` }
            ];
        } else if (actionType === 'gift') {
            cost = 50000;
            if (newChar.money < cost) {
                alert(`골드가 부족합니다! (필요: ${cost.toLocaleString()} Gold, 보유: ${newChar.money.toLocaleString()} Gold)`);
                return;
            }
            newChar.money -= cost;
            affGain = Math.floor(Math.random() * 6) + 15; // 15~20
            currentMember.affection = Math.min(100, currentMember.affection + affGain);
            logMsg = `[동아리 교류] ${currentMember.name}에게 정성스런 선물을 전달했습니다. (호감도 +${affGain}, -50,000 Gold)`;
            successTitle = '🎁 선물 전달';
            successMsg = `소중히 준비한 예쁜 선물을 건넸습니다. ${currentMember.name}은(는) 정말 뜻밖이라며 크게 기뻐했습니다!`;
            resultItems = [
                { label: '소비 골드', after: `-${cost.toLocaleString()} G` },
                { label: '호감도 상승', after: `+${affGain} ♥` }
            ];
        } else if (actionType === 'training') {
            const currentMonthStr = character.currentDate?.substring(0, 7) || '2000-01';
            if (newChar.clubData?.lastTrainingDate === currentMonthStr) {
                alert(`이번 달 합동 모의대련은 이미 진행했습니다. 다음 달에 다시 진행해 주세요! (현재 날짜: ${character.currentDate})`);
                return;
            }
            cost = 5000;
            daysToPass = 1;
            if (newChar.money < cost) {
                alert(`골드가 부족합니다! (훈련 비품비 필요: ${cost.toLocaleString()} Gold, 보유: ${newChar.money.toLocaleString()} Gold)`);
                return;
            }
            newChar.money -= cost;
            affGain = 10;
            currentMember.affection = Math.min(100, currentMember.affection + affGain);
            
            // 1일 경과
            newChar.currentDate = addDays(character.currentDate || '2000-01-01', daysToPass);
            
            // 기여도 추가
            newChar.clubData!.contribution = (newChar.clubData!.contribution || 0) + 20;
            
            // 마지막 합동 모의대련 월 기록
            newChar.clubData!.lastTrainingDate = currentMonthStr;

            // 무기 숙련도 랜덤 소량 증가
            const weaponCategory: 'Melee' | 'Ranged' | 'Magic' = characterClub === ClubType.MELEE ? 'Melee' : characterClub === ClubType.RANGED ? 'Ranged' : 'Magic';
            const possibleTypes = WEAPON_MASTERY_CONFIG[weaponCategory]?.types || ['Sword'];
            const targetType = possibleTypes[Math.floor(Math.random() * possibleTypes.length)];
            const targetLabel = WEAPON_TYPE_KOREAN[targetType] || targetType;
            const res = addMasteryExp(newChar, targetType as WeaponType, 10);
            newChar.weaponMastery = (res.char as any).weaponMastery;

            logMsg = `[동아리 합동훈련] ${currentMember.name}와(과) 합동 모의 대련을 진행했습니다. (호감도 +${affGain}, 동아리 기여도 +20, ${targetLabel} 숙련도 +10, 1일 경과, -5,000 Gold)`;
            successTitle = '⚔️ 합동 모의 훈련 완료';
            successMsg = `동아리 연무장에서 ${currentMember.name}와(과) 호흡을 맞춰 박진감 넘치는 대련을 진행했습니다! 서로의 장단점을 지적해 주며 실력이 일취월장하고 끈끈한 결속력을 확인했습니다.`;
            resultItems = [
                { label: '소비 골드', after: `-${cost.toLocaleString()} G` },
                { label: '호감도 상승', after: `+${affGain} ♥` },
                { label: '기여도 획득', after: '+20 pt' },
                { label: '무기 숙련도', after: `${targetLabel} +10` },
                { label: '소요 시간', after: '1일 경과' }
            ];
        }

        members[idx] = currentMember;
        newChar.clubData!.clubMembers = members;

        setChatMember(currentMember);
        onUpdateCharacter(newChar, logMsg);

        setResultData({
            type: 'success',
            title: successTitle,
            message: successMsg,
            items: resultItems
        });
    };

    const handleRecruitStudent = (student: SimpleStudent) => {
        // [NEW] 이미 영입된 대상인지 확인
        if (isAlreadyRecruited(student.id)) {
            alert("이미 일행으로 합류한 대원입니다.");
            return;
        }

        if (student.affection < 75) return alert("아직 마음을 열지 않았습니다. 동아리실에서 더 친해지세요.");
        if (character.companions.length >= MAX_PARTY_SIZE) return alert("파티 인원이 가득 찼습니다.");

        const newChar = { ...character };
        const tier = getTierByLevel(student.level);
        const newCompanion: Companion = {
            id: student.id,
            name: student.name,
            age: student.age,
            gender: student.gender,
            race: "인간",
            birthYear: student.birthYear,
            nation: student.nation,
            appearance: student.appearance,
            visualUrl: student.visualUrl,
            personality: student.personality,
            classType: `학생`,
            job: JobType.STUDENT,
            level: student.level,
            stats: generateCompanionStats(student.level),
            currentExp: 0,
            maxExp: student.level * 100,
            statPoints: 0,
            classTier: tier,
            skills: [],
            equipment: {},
            inventory: [],
            affection: student.affection,
            loyalty: 60
        };

        newChar.companions.push(assignRandomCombatStyle(newCompanion));
        newChar.clubData!.clubMembers = clubMembers.filter(m => m.id !== student.id);
        
        onUpdateCharacter(newChar, `[학생 영입] 동아리 단짝 ${student.name}이(가) 파티에 합류했습니다.`);
        setResultData({
            type: 'success',
            title: '인연의 결실',
            message: `${student.name}: "우리, 학교 밖에서도 영원한 파트너인 거 알죠?"`,
            items: [{ label: '영입 완료', after: student.name }]
        });
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {resultData && <ActionResultModal data={resultData} onClose={() => setResultData(null)} />}

            {/* Chat & Social Interaction Modal */}
            {chatMember && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 p-4 animate-in fade-in">
                    <div className="bg-slate-900 border border-indigo-500 rounded-3xl w-full max-w-4xl h-[85vh] md:h-[75vh] shadow-2xl flex flex-col md:flex-row overflow-hidden animate-in zoom-in-95">
                        {/* Left Pane: Profile and Interactions */}
                        <div className="w-full md:w-2/5 border-b md:border-b-0 md:border-r border-indigo-950/50 bg-slate-950/40 p-5 flex flex-col justify-between overflow-y-auto custom-scrollbar">
                            <div className="space-y-4">
                                <div className="flex justify-between items-center md:hidden">
                                    <span className="text-xs text-indigo-400 font-bold uppercase">{characterClub} 부원 교류</span>
                                    <button onClick={() => setChatMember(null)} className="text-slate-500 hover:text-white p-1"><X/></button>
                                </div>

                                {/* Student card summary */}
                                <div className="flex items-center gap-4 p-3 bg-slate-900/60 rounded-2xl border border-slate-800/80">
                                    <div className="w-14 h-14 rounded-full bg-slate-800 border border-indigo-500/50 overflow-hidden shrink-0">
                                        <img 
                                            src={chatMember.visualUrl || generateDefaultVisualUrl(chatMember.name, chatMember.nation, chatMember.race, chatMember.gender)} 
                                            alt={chatMember.name} 
                                            className="w-full h-full object-cover" 
                                            referrerPolicy="no-referrer" 
                                        />
                                    </div>
                                    <div className="min-w-0">
                                        <div className="font-bold text-white text-base truncate">{chatMember.name}</div>
                                        <div className="text-xs text-amber-500 font-mono font-bold mt-0.5">Lv.{chatMember.level} 학생</div>
                                        <div className="text-[10px] text-slate-400 flex flex-wrap gap-1 mt-1">
                                            <span className="bg-slate-800 px-1 rounded border border-slate-700">{chatMember.nation}</span>
                                            <span>{chatMember.personality}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Appearance / Intro */}
                                <div className="p-3 bg-indigo-950/10 border border-indigo-900/20 rounded-xl">
                                    <p className="text-[11px] text-slate-400 italic leading-relaxed">"{chatMember.appearance}"</p>
                                </div>

                                {/* Affection Gauge */}
                                <div className="p-3 bg-slate-900/40 rounded-xl border border-slate-800/50">
                                    <div className="flex justify-between items-center text-xs font-bold text-pink-400 mb-1.5">
                                        <span className="flex items-center gap-1"><Heart size={14} className="fill-pink-500/20"/> 친밀도 수치</span>
                                        <span>{chatMember.affection} / 100</span>
                                    </div>
                                    <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden border border-slate-700/50">
                                        <div 
                                            className="h-full bg-gradient-to-r from-pink-500 to-rose-400 transition-all duration-500"
                                            style={{ width: `${Math.max(0, Math.min(100, chatMember.affection))}%` }}
                                        />
                                    </div>
                                    <p className="text-[10px] text-slate-500 mt-1.5 font-medium">친밀도 75 이상 달성 시 아군 파티원으로 정식 영입할 수 있습니다.</p>
                                </div>

                                {/* Social Interactions Title */}
                                <div>
                                    <h4 className="text-xs font-extrabold text-indigo-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                        <Sparkles size={12}/> 동아리 교류 행동
                                    </h4>
                                    
                                    <div className="space-y-2.5">
                                        {/* Tea Time */}
                                        <button 
                                            onClick={() => handleMemberSocialAction('tea', chatMember)}
                                            className="w-full p-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-indigo-500/30 rounded-xl flex items-center justify-between text-left transition-all active:scale-[0.98] group"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-amber-950/30 text-amber-500 rounded-lg group-hover:bg-amber-950/50 transition-all">
                                                    <Coffee size={16}/>
                                                </div>
                                                <div>
                                                    <div className="text-xs font-bold text-slate-200">🍵 심야 티타임</div>
                                                    <div className="text-[10px] text-slate-400 mt-0.5">향기로운 허브차 대접</div>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-xs font-extrabold text-amber-400 flex items-center gap-1 justify-end">
                                                    <Coins size={12}/> 10,000 G
                                                </div>
                                                <div className="text-[9px] text-pink-400 font-bold mt-0.5">친밀도 +6~9</div>
                                            </div>
                                        </button>

                                        {/* Gift */}
                                        <button 
                                            onClick={() => handleMemberSocialAction('gift', chatMember)}
                                            className="w-full p-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-indigo-500/30 rounded-xl flex items-center justify-between text-left transition-all active:scale-[0.98] group"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-pink-950/30 text-pink-500 rounded-lg group-hover:bg-pink-950/50 transition-all">
                                                    <Gift size={16}/>
                                                </div>
                                                <div>
                                                    <div className="text-xs font-bold text-slate-200">🎁 특별한 선물 전달</div>
                                                    <div className="text-[10px] text-slate-400 mt-0.5">정성 들여 고른 장식품 선물</div>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-xs font-extrabold text-amber-400 flex items-center gap-1 justify-end">
                                                    <Coins size={12}/> 50,000 G
                                                </div>
                                                <div className="text-[9px] text-pink-400 font-bold mt-0.5">친밀도 +15~20</div>
                                            </div>
                                        </button>

                                        {/* Joint Training */}
                                        <button 
                                            onClick={() => !hasTrainedThisMonth && handleMemberSocialAction('training', chatMember)}
                                            className={`w-full p-2.5 border rounded-xl flex items-center justify-between text-left transition-all group ${hasTrainedThisMonth ? 'bg-slate-950/40 border-slate-900 opacity-60 cursor-not-allowed' : 'bg-slate-900 hover:bg-slate-800 border-slate-800 hover:border-indigo-500/30 active:scale-[0.98]'}`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`p-2 rounded-lg transition-all ${hasTrainedThisMonth ? 'bg-slate-900 text-slate-500' : 'bg-emerald-950/30 text-emerald-500 group-hover:bg-emerald-950/50'}`}>
                                                    <Sword size={16}/>
                                                </div>
                                                <div>
                                                    <div className={`text-xs font-bold ${hasTrainedThisMonth ? 'text-slate-500' : 'text-slate-200'}`}>⚔️ 합동 모의 대련</div>
                                                    <div className="text-[10px] text-slate-400 mt-0.5">
                                                        {hasTrainedThisMonth ? '이번 달 합동 훈련을 마쳤습니다' : '동아리 전용 무예 합동 연마'}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                {hasTrainedThisMonth ? (
                                                    <span className="text-[9px] bg-slate-800 text-slate-400 border border-slate-700 font-bold px-1.5 py-0.5 rounded">이번 달 완료</span>
                                                ) : (
                                                    <>
                                                        <div className="text-[10px] font-extrabold text-amber-400 flex items-center gap-1 justify-end">
                                                            5,000 G + 1일 소요
                                                        </div>
                                                        <div className="text-[9px] text-emerald-400 font-bold mt-0.5">친밀 +10 / 기여 +20 / 숙련 +10</div>
                                                    </>
                                                )}
                                            </div>
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Recruit to Party (Left Bottom) */}
                            <div className="pt-4 border-t border-slate-800 mt-4">
                                {isAlreadyRecruited(chatMember.id) ? (
                                    <div className="w-full py-2.5 bg-green-900/20 text-green-500 border border-green-900/30 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5">
                                        <CheckCircle size={14}/> 이미 모험 동료로 활약 중입니다
                                    </div>
                                ) : (
                                    <button 
                                        onClick={() => handleRecruitStudent(chatMember)}
                                        className={`w-full py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all transform active:scale-95 ${chatMember.affection >= 75 ? 'bg-gradient-to-r from-cyan-600 to-indigo-600 text-white shadow-lg shadow-cyan-950/20 hover:brightness-110' : 'bg-slate-900 text-slate-500 border border-slate-800 cursor-not-allowed'}`}
                                    >
                                        <UserPlus size={14}/> {chatMember.affection >= 75 ? '정식 대원으로 파티 영입' : '영입하기 (친밀도 75 이상 필요)'}
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Right Pane: AI Chat Interface */}
                        <div className="flex-1 flex flex-col bg-slate-900 overflow-hidden relative">
                            {/* Desktop Close Button (Top Right) */}
                            <div className="p-4 border-b border-indigo-900/40 bg-indigo-950/20 flex justify-between items-center shrink-0">
                                <div className="flex items-center gap-2">
                                    <MessageCircle size={18} className="text-indigo-400"/>
                                    <span className="font-bold text-white text-sm">{chatMember.name}과의 대화방</span>
                                </div>
                                <button onClick={() => setChatMember(null)} className="hidden md:block text-slate-500 hover:text-white p-2 transition-all hover:bg-slate-800 rounded-full"><X/></button>
                            </div>

                            {/* Messages View */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-[url('https://www.transparenttextures.com/patterns/stardust.png')]">
                                {(chatMember.chatHistory || []).length === 0 && (
                                    <div className="text-center py-16 opacity-35 max-w-xs mx-auto">
                                        <MessageCircle size={40} className="mx-auto mb-3 text-indigo-400"/>
                                        <p className="text-xs font-bold text-slate-200">대화를 시작해 정겨운 부원과의 인연을 쌓으세요.</p>
                                        <p className="text-[10px] text-slate-500 mt-1">질문에 답변하거나 마음을 여는 따뜻한 속삭임을 보낼 수 있습니다.</p>
                                    </div>
                                )}
                                {chatMember.chatHistory?.map((msg, i) => (
                                    <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                                        <div className={`max-w-[85%] p-3 rounded-2xl text-xs md:text-sm leading-relaxed ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-none shadow-md shadow-indigo-950/25' : 'bg-slate-800 text-slate-200 border border-slate-700/80 rounded-tl-none'}`}>
                                            {msg.text}
                                        </div>
                                    </div>
                                ))}
                                <div ref={chatEndRef}/>
                            </div>

                            {/* Chat Input Bar */}
                            <div className="p-4 bg-slate-950/80 border-t border-slate-800/80">
                                <div className="relative flex gap-2">
                                    <input 
                                        type="text" 
                                        value={chatInput}
                                        onChange={e => setChatInput(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                                        placeholder={isChatting ? "상대방이 생각하는 중..." : `${chatMember.name}에게 보낼 메시지 입력...`}
                                        disabled={isChatting}
                                        className="flex-1 bg-slate-900 border border-slate-700 rounded-full py-2.5 px-4 text-xs md:text-sm text-white focus:border-indigo-500 outline-none placeholder:text-slate-500"
                                    />
                                    <button 
                                        onClick={handleSendMessage}
                                        disabled={!chatInput.trim() || isChatting}
                                        className="p-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full transition-all disabled:opacity-50 flex items-center justify-center shrink-0"
                                    >
                                        <Send size={16}/>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="bg-slate-950 p-6 rounded-3xl border border-cyan-800 flex justify-between items-center relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-10"><LayoutGrid size={120} /></div>
                <div className="relative z-10">
                    <div className="text-xs text-cyan-500 font-bold uppercase tracking-widest mb-1">After School Activity</div>
                    <h3 className="text-2xl font-bold text-white flex items-center">
                        {characterClub === ClubType.NONE ? '가입된 동아리 없음' : characterClub}
                        {characterClub !== ClubType.NONE && <CheckCircle size={20} className="ml-2 text-green-500" />}
                    </h3>
                    <p className="text-sm text-slate-400 mt-1">{CLUB_CONFIG[characterClub].desc}</p>
                </div>
                {characterClub !== ClubType.NONE && (
                    <div className="text-right relative z-10">
                        <div className="text-[10px] text-slate-500 uppercase font-bold">Activity Status</div>
                        <div className={`text-lg font-bold ${isActivityDone ? 'text-red-400' : 'text-green-400'}`}>
                            {isActivityDone ? '활동 완료' : '활동 가능'}
                        </div>
                    </div>
                )}
            </div>

            <div className="flex gap-2 border-b border-slate-800 pb-2">
                <button onClick={() => setActiveTab('lobby')} className={`px-6 py-2 text-sm font-bold rounded-xl transition-all ${activeTab === 'lobby' ? 'bg-cyan-900/30 text-cyan-400 border border-cyan-700' : 'text-slate-500 hover:text-slate-300'}`}>동아리 목록</button>
                <button onClick={() => setActiveTab('activity')} disabled={characterClub === ClubType.NONE} className={`px-6 py-2 text-sm font-bold rounded-xl transition-all ${activeTab === 'activity' ? 'bg-cyan-900/30 text-cyan-400 border border-cyan-700' : 'text-slate-500 hover:text-slate-300 disabled:opacity-30'}`}>부활동 수행</button>
                <button onClick={() => setActiveTab('members')} disabled={characterClub === ClubType.NONE} className={`px-6 py-2 text-sm font-bold rounded-xl transition-all ${activeTab === 'members' ? 'bg-cyan-900/30 text-cyan-400 border border-cyan-700' : 'text-slate-500 hover:text-slate-300 disabled:opacity-30'}`}>부원들과 교류</button>
            </div>

            {activeTab === 'lobby' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {(Object.entries(CLUB_CONFIG) as [ClubType, any][]).map(([type, cfg]) => {
                        if (type === ClubType.NONE) return null;
                        const isJoined = characterClub === type;
                        return (
                            <div key={type} className={`p-6 rounded-3xl border transition-all ${isJoined ? 'border-cyan-500 bg-cyan-950/20 shadow-lg' : 'border-slate-800 bg-slate-950 hover:border-slate-600'} flex flex-col`}>
                                <div className="flex justify-between items-start mb-4">
                                    <div className={`p-3 rounded-2xl ${cfg.bg} ${cfg.color}`}><cfg.icon size={28}/></div>
                                    {isJoined && <span className="text-[10px] bg-cyan-600 text-white px-2 py-1 rounded-full font-bold">MY CLUB</span>}
                                </div>
                                <h4 className="text-xl font-bold text-white mb-2">{cfg.label}</h4>
                                <p className="text-xs text-slate-500 mb-4 h-8">"{cfg.desc}"</p>
                                <div className="space-y-1 mb-6">
                                    {cfg.benefits.map((b: string, i: number) => (
                                        <div key={i} className="text-[10px] text-cyan-400 flex items-center gap-1.5 font-bold">
                                            <div className="w-1 h-1 rounded-full bg-cyan-500"></div> {b}
                                        </div>
                                    ))}
                                </div>
                                {!isJoined && (
                                    <button 
                                        onClick={() => handleJoinClub(type)}
                                        className="w-full py-3 bg-slate-800 hover:bg-cyan-700 text-white rounded-xl font-bold text-xs transition-all active:scale-95"
                                    >
                                        가입 신청하기
                                    </button>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {activeTab === 'activity' && (
                <div className="space-y-6 animate-in zoom-in-95">
                    <div className="bg-slate-950/80 p-6 rounded-3xl border border-cyan-800 flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div className={`p-4 rounded-2xl border-2 ${CLUB_CONFIG[characterClub]?.border || 'border-slate-800'} ${CLUB_CONFIG[characterClub]?.bg || 'bg-slate-900'}`}>
                                {CLUB_CONFIG[characterClub] && React.createElement(CLUB_CONFIG[characterClub].icon, { size: 36, className: CLUB_CONFIG[characterClub].color })}
                            </div>
                            <div>
                                <div className="text-xs text-cyan-400 font-bold uppercase tracking-wider">Club Official Duty</div>
                                <h3 className="text-xl font-bold text-white">{characterClub} 세부 정기 활동</h3>
                                <p className="text-xs text-slate-400 mt-1">원하는 전문 수련 또는 학정 활동을 선택하여 수행합니다. (1일 소요, 월 1회 가능)</p>
                            </div>
                        </div>
                        <div className="text-right shrink-0">
                            <span className={`text-xs px-3 py-1.5 rounded-full font-bold border ${isActivityDone ? 'bg-red-950/50 text-red-400 border-red-800' : 'bg-emerald-950/50 text-emerald-400 border-emerald-800'}`}>
                                {isActivityDone ? '이번 달 활동 완료' : '활동 가능'}
                            </span>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {GET_CLUB_SUB_ACTIVITIES(characterClub).map((opt) => {
                            const IconComponent = opt.icon;
                            return (
                                <div 
                                    key={opt.id}
                                    className={`bg-slate-950 p-5 rounded-2xl border transition-all flex flex-col justify-between group ${
                                        isActivityDone 
                                            ? 'border-slate-800 opacity-60' 
                                            : 'border-slate-800 hover:border-cyan-500/50 hover:bg-slate-900/40 shadow-lg'
                                    }`}
                                >
                                    <div>
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="p-2.5 rounded-xl bg-cyan-950/40 text-cyan-400 border border-cyan-800/40 group-hover:scale-110 transition-transform">
                                                <IconComponent size={20} />
                                            </div>
                                            <span className="text-[10px] font-bold bg-slate-900 text-slate-400 border border-slate-800 px-2 py-0.5 rounded-full">
                                                기여도 +{opt.contributionGain}pt
                                            </span>
                                        </div>

                                        <h4 className="text-base font-bold text-white mb-1">{opt.title}</h4>
                                        <p className="text-xs text-slate-400 leading-relaxed mb-4 min-h-[3rem]">{opt.desc}</p>

                                        {/* Rewards Preview */}
                                        <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800/80 space-y-1 mb-4 text-[11px]">
                                            {opt.statGain && (
                                                <div className="text-cyan-400 font-bold flex items-center justify-between">
                                                    <span>능력치 증가</span>
                                                    <span>{opt.statGain.stat.toUpperCase()} +{opt.statGain.amount}</span>
                                                </div>
                                            )}
                                            {opt.targetWeapon && opt.masteryExp && (
                                                <div className="text-emerald-400 font-bold flex items-center justify-between">
                                                    <span>무기 숙련도</span>
                                                    <span>{WEAPON_TYPE_KOREAN[opt.targetWeapon] || opt.targetWeapon} +{opt.masteryExp}</span>
                                                </div>
                                            )}
                                            {opt.repGain && (
                                                <div className="text-amber-400 font-bold flex items-center justify-between">
                                                    <span>교내 평판</span>
                                                    <span>+{opt.repGain}</span>
                                                </div>
                                            )}
                                            {opt.goldGain && (
                                                <div className="text-yellow-400 font-bold flex items-center justify-between">
                                                    <span>활동 수당</span>
                                                    <span>+{opt.goldGain.toLocaleString()} G</span>
                                                </div>
                                            )}
                                            {opt.itemReward && (
                                                <div className="text-purple-400 font-bold flex items-center justify-between">
                                                    <span>보상 아이템</span>
                                                    <span className="truncate max-w-[120px]">{opt.itemReward.name}</span>
                                                </div>
                                            )}
                                            {opt.classmateAffection && (
                                                <div className="text-pink-400 font-bold flex items-center justify-between">
                                                    <span>급우 호감도</span>
                                                    <span>+{opt.classmateAffection} ♥</span>
                                                </div>
                                            )}
                                            <div className="text-slate-500 flex items-center justify-between pt-1 border-t border-slate-800">
                                                <span>소요 시간</span>
                                                <span>1일 경과</span>
                                            </div>
                                        </div>
                                    </div>

                                    <button 
                                        onClick={() => handleExecuteSubActivity(opt)}
                                        disabled={isActivityDone}
                                        className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all shadow active:scale-95 flex items-center justify-center gap-1.5 ${
                                            isActivityDone 
                                                ? 'bg-slate-900 text-slate-600 border border-slate-800 cursor-not-allowed' 
                                                : 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-cyan-950/30'
                                        }`}
                                    >
                                        <Zap size={14}/> {isActivityDone ? '이번 달 활동 완료' : '선택 활동 수행하기'}
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {activeTab === 'members' && (
                <div className="space-y-6">
                    <div className="flex justify-between items-center bg-slate-950/50 p-4 rounded-2xl border border-slate-800">
                        <div>
                            <h3 className="text-lg font-bold text-white flex items-center gap-2"><Users size={20} className="text-cyan-400"/> {characterClub} 부원 목록</h3>
                            <p className="text-xs text-slate-500 mt-1">부원 정보는 매 학년이 바뀔 때 함께 갱신됩니다.</p>
                        </div>
                        {isGeneratingMembers && <Loader2 size={24} className="animate-spin text-cyan-500"/>}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {clubMembers.map(student => {
                            const alreadyRecruited = isAlreadyRecruited(student.id);
                            return (
                                <div key={student.id} className={`bg-slate-950 p-5 rounded-2xl border transition-all group flex flex-col ${alreadyRecruited ? 'opacity-60 border-slate-800' : 'border-slate-800 hover:border-cyan-500/30'}`}>
                                    <div className="flex items-center gap-4 mb-4">
                                        <div className="w-12 h-12 rounded-full bg-slate-800 border border-slate-700 overflow-hidden group-hover:scale-110 transition-transform">
                                            <img src={student.visualUrl || generateDefaultVisualUrl(student.name, student.nation, student.race, student.gender)} alt={student.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="font-bold text-slate-200 truncate">{student.name} <span className="text-xs text-amber-500 font-mono">Lv.{student.level}</span></div>
                                            <div className="text-[10px] text-slate-500 flex items-center gap-2 mt-0.5">
                                                <span className="bg-slate-900 px-1.5 rounded border border-slate-800">{student.nation}</span>
                                                <span>{student.age}</span>
                                                <span>{student.personality}</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center text-pink-400 font-bold text-xs"><Heart size={14} className="mr-1 fill-pink-500/20"/> {student.affection}</div>
                                    </div>
                                    <div className="bg-slate-900/50 p-3 rounded-xl mb-4 flex-1">
                                        <p className="text-[11px] text-slate-400 leading-relaxed italic line-clamp-3">"{student.appearance}"</p>
                                    </div>
                                    <div className="flex gap-2 mt-auto">
                                        <button 
                                            onClick={() => setChatMember(student)}
                                            className="flex-1 py-2 bg-slate-800 hover:bg-indigo-900/40 border border-slate-700 hover:border-indigo-500 rounded-xl text-xs font-bold text-indigo-300 flex items-center justify-center gap-2 transition-all"
                                        >
                                            <Users size={14}/> 교류 및 대화
                                        </button>
                                        {!alreadyRecruited ? (
                                            <button 
                                                onClick={() => handleRecruitStudent(student)}
                                                className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all transform active:scale-95 ${student.affection >= 75 ? 'bg-cyan-700 hover:bg-cyan-600 text-white' : 'bg-slate-900 text-slate-600 border border-slate-800 cursor-not-allowed'}`}
                                            >
                                                {student.affection >= 75 ? '파티 영입' : '친밀도 부족'}
                                            </button>
                                        ) : (
                                            <div className="flex-1 py-2 bg-green-900/20 text-green-500 border border-green-900/50 rounded-xl text-xs font-bold flex items-center justify-center">
                                                이미 합류함
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ClubModal;
