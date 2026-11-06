
import React, { useState, useEffect } from 'react';
import { Character, Companion, Location, Stats } from '../types';
import { X, Baby, Heart, Utensils, BookOpen, MessageCircle, School, GraduationCap, UserPlus, MapPin, Smile, Sword, Zap, Shield, Activity, Brain, User, AlertTriangle, ArrowLeft, Coins, Crown, Flame, Ghost, CheckCircle, LogOut } from 'lucide-react';
import { WORLD_GEOGRAPHY } from '../constants';
import ActionResultModal, { ResultData } from './ActionResultModal';
import { getYear, calculateAgeFromYear } from '../utils';

interface Props {
    character: Character;
    child: Companion;
    onClose: () => void;
    onUpdateCharacter: (newChar: Character, logMsg: string) => void;
}

type ViewMode = 'menu' | 'education' | 'meal' | 'talk';
type EduIntensity = 'Low' | 'Normal' | 'High';

const TALK_SCENARIOS = [
    {
        id: 1,
        question: "학교에서 친구가 실수로 내 물건을 부쉈어요. 어떻게 해요?",
        options: [
            { label: "괜찮다고 용서해주렴.", trait: "포용", feedback: "아이는 관대함을 배웁니다." },
            { label: "실수라도 대가를 치르게 해라.", trait: "악랄", feedback: "아이는 냉혹함을 배웁니다." },
            { label: "다음부터 조심하라고 당당히 말해.", trait: "용감", feedback: "아이는 자기주장을 배웁니다." }
        ]
    },
    {
        id: 2,
        question: "숲에서 무서운 몬스터를 봤어요! 도망칠까요?",
        options: [
            { label: "당연하지, 안전이 우선이야.", trait: "신중", feedback: "아이는 신중함을 배웁니다." },
            { label: "돌을 던져서 쫓아버려!", trait: "만용", feedback: "아이는 위험한 용기를 배웁니다." },
            { label: "숨어서 지켜보다가 약점을 찾아봐.", trait: "교활", feedback: "아이는 전략적 사고를 배웁니다." }
        ]
    },
    {
        id: 3,
        question: "길에 지갑이 떨어져 있어요. 아무도 안 보는 것 같아요.",
        options: [
            { label: "주인을 찾아주렴.", trait: "정직", feedback: "아이는 정직함을 배웁니다." },
            { label: "우리가 가지자. 줍는 사람이 임자야.", trait: "탐욕", feedback: "아이는 물질적 욕망을 배웁니다." },
            { label: "경비병 아저씨에게 가져다 드려.", trait: "성실", feedback: "아이는 사회적 규칙을 배웁니다." }
        ]
    },
    {
        id: 4,
        question: "누가 저보고 약하다고 놀려요...",
        options: [
            { label: "말로 잘 타이르렴.", trait: "평화", feedback: "아이는 대화의 힘을 배웁니다." },
            { label: "힘으로 본때를 보여줘!", trait: "용감", feedback: "아이는 무력을 사용하는 법을 배웁니다." },
            { label: "밤길에 뒤통수를 때려버려.", trait: "비열", feedback: "아이는 수단과 방법을 가리지 않게 됩니다." }
        ]
    }
];

const ChildCareModal: React.FC<Props> = ({ character, child, onClose, onUpdateCharacter }) => {
    const [viewMode, setViewMode] = useState<ViewMode>('menu');
    const [resultData, setResultData] = useState<ResultData | null>(null);
    
    // Education State
    const [selectedStat, setSelectedStat] = useState<keyof Stats>('str');
    const [eduIntensity, setEduIntensity] = useState<EduIntensity>('Normal');

    // Meal State
    const [selectedMenu, setSelectedMenu] = useState<number>(0);

    // Talk State
    const [currentScenario, setCurrentScenario] = useState<typeof TALK_SCENARIOS[0]>(TALK_SCENARIOS[0]);

    // School Enrollment State
    const [isEnrolling, setIsEnrolling] = useState(false);
    const [selectedRegion, setSelectedRegion] = useState<string>(Object.keys(WORLD_GEOGRAPHY)[0]);
    const [selectedNation, setSelectedNation] = useState<string>('대한민국');
    const [selectedCity, setSelectedCity] = useState<string>('서울');
    
    // Independence UI State
    const [showIndependenceConfirm, setShowIndependenceConfirm] = useState(false);

    // [NEW] Dynamic Age Calculation
    const currentYear = getYear(character.currentDate || '2000-01-01');
    const displayAge = child.birthYear !== undefined ? currentYear - child.birthYear : (parseInt(child.age.replace(/[^0-9]/g, '')) || 0);
    const currentMonth = character.currentDate?.substring(0, 7); // YYYY-MM
    const isActionDone = child.childData?.lastInteractionMonth === currentMonth;

    // School Tier Detection
    let targetSchoolTier = "Elementary";
    if (displayAge >= 17) targetSchoolTier = "High";
    else if (displayAge >= 14) targetSchoolTier = "Middle";
    else targetSchoolTier = "Elementary";

    // Auto-update selections for enrollment
    useEffect(() => {
        const nations = Object.keys(WORLD_GEOGRAPHY[selectedRegion] || {});
        if (nations.length > 0) {
            setSelectedNation(nations[0]);
            const cities = WORLD_GEOGRAPHY[selectedRegion][nations[0]]?.cities || [];
            if (cities.length > 0) setSelectedCity(cities[0]);
        }
    }, [selectedRegion]);

    useEffect(() => {
        const cities = WORLD_GEOGRAPHY[selectedRegion]?.[selectedNation]?.cities || [];
        if (cities.length > 0) setSelectedCity(cities[0]);
    }, [selectedNation]);

    // Check for Graduation/Transitions
    useEffect(() => {
        if (!child.childData) return;
        const currentSchool = child.childData.school;
        
        // Check for Graduation Events
        if (currentSchool?.isEnrolled) {
            const score = child.childData.academicScore || 0;
            let graduated = false;
            let levelGain = 0;
            let nextStep = "";
            let msgTitle = "";
            
            // Elementary Graduation (at 14)
            if (currentSchool.name.includes("초급") && displayAge >= 14) {
                graduated = true;
                levelGain = Math.min(5, 1 + Math.floor(score / 20)); // Max 5
                nextStep = "중급 레귤러스 진학 가능";
                msgTitle = "초급 학교 졸업";
                child.childData.school.isEnrolled = false; // Graduate
            }
            // Middle Graduation (at 17)
            else if (currentSchool.name.includes("중급") && displayAge >= 17) {
                graduated = true;
                levelGain = Math.min(10, 3 + Math.floor(score / 15)); // Max 10
                nextStep = "고급 레귤러스 진학 가능";
                msgTitle = "중급 학교 졸업";
                child.childData.school.isEnrolled = false;
            }
            // High Graduation (at 20)
            else if (currentSchool.name.includes("고급") && displayAge >= 20) {
                graduated = true;
                levelGain = Math.min(15, 5 + Math.floor(score / 10)); // Max 15
                nextStep = "성인 (독립 준비)";
                msgTitle = "고급 학교 졸업";
                child.childData.school.isEnrolled = false;
            }

            if (graduated) {
                // Apply Growth
                updateChildOnGraduation(levelGain, msgTitle, nextStep);
            }
        }
    }, [displayAge]);

    // Initialize Talk Scenario
    useEffect(() => {
        if (viewMode === 'talk') {
            const randomIdx = Math.floor(Math.random() * TALK_SCENARIOS.length);
            setCurrentScenario(TALK_SCENARIOS[randomIdx]);
        }
    }, [viewMode]);

    // Helper to sync all ages in the character object based on birthYear
    const syncAllAges = (char: Character) => {
        const year = getYear(char.currentDate || '2000-01-01');
        
        if (char.inactiveCompanions) {
            char.inactiveCompanions = char.inactiveCompanions.map(c => {
                if (c.birthYear) {
                    return { ...c, age: calculateAgeFromYear(c.birthYear, year) };
                }
                return c;
            });
        }
        char.companions = char.companions.map(c => {
            if (c.birthYear) {
                return { ...c, age: calculateAgeFromYear(c.birthYear, year) };
            }
            return c;
        });
        return char;
    };

    // Helper to find child in current character state (Active or Inactive)
    const findChildInState = (charState: Character, childId: string) => {
        let idx = charState.inactiveCompanions?.findIndex(c => c.id === childId) ?? -1;
        if (idx !== -1 && charState.inactiveCompanions) {
            return { list: 'inactive', index: idx, companion: charState.inactiveCompanions[idx] };
        }
        idx = charState.companions.findIndex(c => c.id === childId);
        if (idx !== -1) {
            return { list: 'active', index: idx, companion: charState.companions[idx] };
        }
        return null;
    };

    const handleActionClick = (targetMode: ViewMode) => {
        if (isActionDone) {
            setResultData({ 
                type: 'info', 
                title: '활동 제한', 
                message: '이번 달은 이미 아이와 활동을 했습니다.\n(월 1회 가능)', 
                items: [{ label: '가능 시기', after: '다음 달' }] 
            });
            return;
        }
        setViewMode(targetMode);
    };

    const handleIndependence = () => {
        if (displayAge < 20) return;
        setShowIndependenceConfirm(true);
    };

    const updateChildOnGraduation = (levelGain: number, title: string, nextStep: string) => {
         const newChar = { ...character };
         const found = findChildInState(newChar, child.id);
         if (!found) return;
         
         const targetChild = found.companion;
         targetChild.level += levelGain;
         // Stat Boost based on level
         const boost = levelGain * 2;
         targetChild.stats.str += boost; targetChild.stats.int += boost; targetChild.stats.def += boost; targetChild.stats.agi += boost; targetChild.stats.wis += boost; targetChild.stats.ctrl += boost;
         targetChild.stats.maxHp += levelGain * 20; targetChild.stats.hp = targetChild.stats.maxHp;
         targetChild.stats.maxMp += levelGain * 20; targetChild.stats.mp = targetChild.stats.maxMp;
         
         // Reset Academic Score for next tier
         if (targetChild.childData) targetChild.childData.academicScore = 0;

         syncAllAges(newChar);
         
         onUpdateCharacter(newChar, `[졸업] ${targetChild.name}이(가) ${title}을 했습니다. (Lv +${levelGain})`);
         
         setResultData({
            type: 'levelup',
            title: title,
            message: `학교 과정을 훌륭히 마쳤습니다.\n학업 성취도에 따라 크게 성장했습니다!`,
            items: [
                { label: '레벨 성장', after: `+${levelGain} (Lv.${targetChild.level})` },
                { label: '다음 단계', after: nextStep }
            ]
        });
    };

    // [NEW] Actual Independence Logic
    const confirmIndependence = () => {
        // Just show the result, actual update happens when closing result
        setShowIndependenceConfirm(false);
        setResultData({
            type: 'success',
            title: '성인식 / 독립',
            message: `${child.name}이(가) 훌륭하게 성장했습니다.\n이제 부모의 품을 떠나 한 사람의 성인으로서 기지에 머뭅니다.\n(나의 집 목록에서 제외됨)`,
            items: [{ label: '상태', after: '독립 (Independent)' }]
        });
    };
    
    // Perform update when result modal closes
    const handleResultClose = () => {
        if (resultData?.type === 'success' && resultData.title.includes('독립')) {
             const newChar = { ...character };
             
             // Update classType in Inactive
             if (newChar.inactiveCompanions) {
                 newChar.inactiveCompanions = newChar.inactiveCompanions.map(c => {
                     if (c.id === child.id) {
                         // Update ClassType to reflect independent child status
                         return { ...c, classType: "독립한 자녀 (Independent Child)" };
                     }
                     return c;
                 });
             }
             // Update classType in Active
             newChar.companions = newChar.companions.map(c => {
                 if (c.id === child.id) {
                     return { ...c, classType: "독립한 자녀 (Independent Child)" };
                 }
                 return c;
             });

             onUpdateCharacter(newChar, `[가족] ${child.name}이(가) 성인이 되어 독립했습니다. 기지의 일원으로서 새로운 삶을 시작합니다.`);
             onClose(); // Close ChildCareModal as child is no longer valid for care
        }
        setResultData(null);
    };

    const handleEducation = () => {
        const newChar = { ...character };
        let cost = 0;
        let statGain = 0;
        let expGain = 0;
        let affectChange = 0;
        let personalityChance = 0;
        let targetPersonality = "";
        let logSuffix = "";
        let academicBonus = 0;

        // Is Enrolled?
        const isEnrolled = child.childData?.school?.isEnrolled;

        if (eduIntensity === 'Low') {
            cost = 500; statGain = 1; expGain = 50; affectChange = 2; personalityChance = 0.3; targetPersonality = "정직"; logSuffix = "(놀이식 교육)"; academicBonus = 2;
        } else if (eduIntensity === 'Normal') {
            cost = 1000; statGain = 2; expGain = 100; affectChange = 0; personalityChance = 0.1; targetPersonality = "성실"; logSuffix = "(표준 교육)"; academicBonus = 5;
        } else { 
            cost = 3000; statGain = 5; expGain = 250; affectChange = -5; personalityChance = 0.4;
            targetPersonality = child.affection < 30 ? "사이코패스" : "교만";
            logSuffix = "(스파르타 교육)"; academicBonus = 10;
        }

        if (newChar.money < cost) {
             setResultData({ 
                type: 'warning', 
                title: '자원 부족', 
                message: '교육비가 부족합니다.', 
                items: [{ label: '부족 금액', after: `${cost - newChar.money} G` }] 
            });
            return;
        }
        newChar.money -= cost;

        const found = findChildInState(newChar, child.id);
        if (found) {
            const targetChild = found.companion;
            if (!targetChild.childData) targetChild.childData = {};
            if (targetChild.childData.lastInteractionMonth === currentMonth) {
                setResultData({ 
                    type: 'info', 
                    title: '활동 제한', 
                    message: '이번 달은 이미 아이와 활동을 했습니다.', 
                    items: [{ label: '가능 시기', after: '다음 달' }] 
                });
                return;
            }

            targetChild.stats[selectedStat] += statGain;
            targetChild.currentExp += expGain;
            targetChild.affection = Math.max(-100, Math.min(100, targetChild.affection + affectChange));
            targetChild.childData.lastInteractionMonth = currentMonth;

            // [NEW] Academic Score logic
            if (isEnrolled) {
                // Luck factor for academic score
                const luck = Math.floor(Math.random() * 5); // 0-4 bonus
                const totalScoreGain = academicBonus + luck;
                targetChild.childData.academicScore = (targetChild.childData.academicScore || 0) + totalScoreGain;
                logSuffix += ` [학업 성취도 +${totalScoreGain}]`;
            }

            let traitMsg = "";
            if (Math.random() < personalityChance && targetChild.personality !== targetPersonality) {
                const oldP = targetChild.personality;
                targetChild.personality = targetPersonality;
                traitMsg = `\n[성격 변화] ${oldP} -> ${targetPersonality}`;
            }

            syncAllAges(newChar);
            
            const actionName = isEnrolled ? "학업 지원" : "가정 교육";
            onUpdateCharacter(newChar, `[육아] ${targetChild.name} ${actionName} 완료. ${logSuffix} ${selectedStat.toUpperCase()}+${statGain}, EXP+${expGain}, 호감도${affectChange > 0 ? '+' : ''}${affectChange}${traitMsg}`);
            
            setResultData({ 
                type: 'success', 
                title: isEnrolled ? '학업 성취' : '교육 완료', 
                message: `${targetChild.name}이(가) 배움을 얻었습니다.${traitMsg}`, 
                items: [
                    { label: '성장', after: `${selectedStat.toUpperCase()} +${statGain}` },
                    ...(isEnrolled ? [{ label: '학업 점수', after: `+${academicBonus}` }] : [])
                ] 
            });
            setViewMode('menu');
        } else { 
            setResultData({ type: 'failure', title: '오류', message: '아이 데이터를 찾을 수 없습니다.', items: [] });
        }
    };

    const MEAL_OPTIONS = [
        { id: 0, name: "간소한 빵과 우유", cost: 0, food: 2, affect: 1, hp: 5, chance: 0, desc: "배고픔을 달래는 정도입니다." },
        { id: 1, name: "영양 가정식", cost: 500, food: 5, affect: 5, hp: 20, chance: 0.05, desc: "정성이 들어간 따뜻한 식사입니다." },
        { id: 2, name: "특제 스테이크", cost: 3000, food: 8, affect: 10, hp: 50, chance: 0.2, desc: "아이가 정말 좋아하는 고기 요리!" },
        { id: 3, name: "황실 코스 요리", cost: 15000, food: 15, affect: 20, hp: 100, chance: 0.6, desc: "최고급 재료로 만든 환상의 맛. 사랑이 싹틉니다." },
    ];

    const handleMeal = () => {
        const menu = MEAL_OPTIONS[selectedMenu];
        const newChar = { ...character };

        if (newChar.money < menu.cost) {
            setResultData({ 
                type: 'warning', 
                title: '자원 부족', 
                message: '식사 비용이 부족합니다.', 
                items: [{ label: '부족 금액', after: `${menu.cost - newChar.money} G` }] 
            });
            return;
        }
        if ((newChar.base?.resources.food || 0) < menu.food) {
            setResultData({ 
                type: 'warning', 
                title: '식량 부족', 
                message: '아이에게 줄 식량이 부족합니다.', 
                items: [{ label: '부족', after: `식량 ${menu.food - (newChar.base?.resources.food || 0)}` }] 
            });
            return;
        }

        newChar.money -= menu.cost;
        if (newChar.base) newChar.base.resources.food -= menu.food;

        const found = findChildInState(newChar, child.id);
        if (found) {
            const targetChild = found.companion;
            if (!targetChild.childData) targetChild.childData = {};
            if (targetChild.childData.lastInteractionMonth === currentMonth) {
                setResultData({ 
                    type: 'info', 
                    title: '활동 제한', 
                    message: '이번 달은 이미 아이와 활동을 했습니다.', 
                    items: [{ label: '가능 시기', after: '다음 달' }] 
                });
                return;
            }

            targetChild.affection = Math.min(100, targetChild.affection + menu.affect);
            targetChild.stats.maxHp += Math.floor(menu.hp / 2);
            targetChild.stats.hp = targetChild.stats.maxHp;
            targetChild.childData.lastInteractionMonth = currentMonth;

            let traitMsg = "";
            if (Math.random() < menu.chance && targetChild.personality !== "사랑(Loving)") {
                targetChild.personality = "사랑(Loving)";
                traitMsg = `\n[성격 변화] 아이가 넘치는 사랑을 느껴 '사랑' 성격을 얻었습니다!`;
            }

            syncAllAges(newChar);

            onUpdateCharacter(newChar, `[육아] ${targetChild.name}와(과) ${menu.name} 식사. (호감도 +${menu.affect}, MaxHP +${Math.floor(menu.hp/2)})${traitMsg}`);
            setResultData({ type: 'success', title: '맛있는 식사', message: `행복한 식사 시간을 보냈습니다.${traitMsg}`, items: [{ label: '메뉴', after: menu.name }, { label: '호감도', after: `+${menu.affect}` }] });
            setViewMode('menu');
        } else { 
            setResultData({ type: 'failure', title: '오류', message: '아이 데이터를 찾을 수 없습니다.', items: [] });
        }
    };

    const handleTalk = (choiceIndex: number) => {
        const option = currentScenario.options[choiceIndex];
        const newChar = { ...character };
        const found = findChildInState(newChar, child.id);
        if (found) {
            const targetChild = found.companion;
            if (!targetChild.childData) targetChild.childData = {};
            if (targetChild.childData.lastInteractionMonth === currentMonth) {
                 setResultData({ 
                    type: 'info', 
                    title: '활동 제한', 
                    message: '이번 달은 이미 아이와 활동을 했습니다.', 
                    items: [{ label: '가능 시기', after: '다음 달' }] 
                });
                return;
            }

            targetChild.affection = Math.min(100, targetChild.affection + 2);
            targetChild.currentExp += 50;
            targetChild.childData.lastInteractionMonth = currentMonth;

            let traitMsg = "";
            if (Math.random() < 0.5 || targetChild.personality === "순수함") {
                const oldP = targetChild.personality || "순수함";
                targetChild.personality = option.trait;
                if (oldP !== option.trait) traitMsg = `\n[성격 변화] ${oldP} -> ${option.trait}`;
            }

            syncAllAges(newChar);

            onUpdateCharacter(newChar, `[육아/대화] 질문: "${currentScenario.question}" -> 답변: "${option.label}"${traitMsg}`);
            setResultData({ type: 'info', title: '대화 종료', message: `${option.feedback}${traitMsg}`, items: [{ label: '성향 영향', after: option.trait }] });
            setViewMode('menu');
        } else { 
            setResultData({ type: 'failure', title: '오류', message: '아이 데이터를 찾을 수 없습니다.', items: [] });
        }
    };

    const generateGrowthAppearance = () => {
        const features = ["총명한 눈빛", "단정한 차림", "활동적인 모습", "차분한 분위기"];
        const f = features[Math.floor(Math.random() * features.length)];
        return `교복이 잘 어울리는 ${f}의 학생입니다.`;
    };

    const handleEnroll = () => {
        if (displayAge < 11) return;
        const newChar = { ...character };
        const found = findChildInState(newChar, child.id);
        
        if (found) {
            const targetChild = found.companion;
            if (!targetChild.childData) targetChild.childData = {};
            
            // Tier based on age
            let tierName = "초급";
            if (targetSchoolTier === 'Middle') tierName = "중급";
            if (targetSchoolTier === 'High') tierName = "고급";

            targetChild.childData.school = { isEnrolled: true, name: `${selectedCity} ${tierName} 레귤러스 학교`, nation: selectedNation, city: selectedCity, grade: 1 };
            targetChild.nation = selectedNation; 
            targetChild.appearance = generateGrowthAppearance();
            
            // Reset score on new enrollment
            targetChild.childData.academicScore = 0;
            
            syncAllAges(newChar);

            onUpdateCharacter(newChar, `[육아] ${targetChild.name}이(가) ${selectedCity} ${tierName} 레귤러스 학교에 입학했습니다.`);
            setResultData({ type: 'success', title: '입학 축하!', message: `학교에 다니기 시작했습니다.\n(매월 '학업 지원'을 통해 성적을 관리하세요)`, items: [{ label: '학교', after: `${tierName} 레귤러스` }] });
            setIsEnrolling(false);
        }
    };

    // Render Logic
    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in zoom-in-95">
            {resultData && <ActionResultModal data={resultData} onClose={handleResultClose} />}
            
            {/* Independence Confirmation Overlay */}
            {showIndependenceConfirm && (
                <div className="absolute inset-0 z-[80] bg-black/95 flex items-center justify-center p-6 animate-in fade-in">
                    <div className="bg-slate-900 border border-amber-500 rounded-xl p-6 w-full max-w-sm text-center shadow-2xl">
                        <Crown size={48} className="mx-auto text-amber-500 mb-4 animate-pulse"/>
                        <h3 className="text-xl font-bold text-white mb-2">독립 (Independence)</h3>
                        <p className="text-sm text-slate-300 mb-6">
                            정말 <span className="text-amber-400 font-bold">{child.name}</span>을(를) 독립시키겠습니까?<br/>
                            <span className="text-xs text-slate-500 mt-2 block">
                                독립하면 성인으로서 기지(숙소)에 계속 머물지만,<br/>더 이상 육아 메뉴(나의 집)를 이용할 수 없습니다.
                            </span>
                        </p>
                        <div className="flex gap-3">
                            <button onClick={() => setShowIndependenceConfirm(false)} className="flex-1 py-3 bg-slate-800 text-slate-300 rounded font-bold hover:bg-slate-700">취소</button>
                            <button onClick={confirmIndependence} className="flex-1 py-3 bg-amber-700 text-white rounded font-bold hover:bg-amber-600 shadow-lg">독립 확정</button>
                        </div>
                    </div>
                </div>
            )}

            <div className="bg-slate-900 w-full max-w-lg rounded-2xl border border-amber-500/50 shadow-[0_0_50px_rgba(245,158,11,0.2)] flex flex-col relative overflow-hidden h-[80vh]">
                
                {/* Header */}
                <div className="p-6 border-b border-amber-900/50 bg-gradient-to-r from-amber-950/30 to-slate-900 text-center shrink-0 relative">
                    <Baby size={48} className="mx-auto text-amber-400 mb-2"/>
                    <h2 className="text-2xl font-bold text-white font-cinzel">육아 관리 (Parenting)</h2>
                    <p className="text-xs text-amber-200/70 mt-1">{child.name} ({displayAge}세) - {child.personality || '순수함'}</p>
                    <button onClick={onClose} className="absolute top-4 right-4 text-slate-500 hover:text-white p-2 rounded-full hover:bg-slate-800 transition-colors">
                        <X size={24} />
                    </button>
                </div>

                <div className="p-6 flex-1 overflow-y-auto custom-scrollbar">
                    {/* MENU VIEW */}
                    {viewMode === 'menu' && (
                        <div className="space-y-6">
                            {/* Independence Button (Age 20+) */}
                            {displayAge >= 20 ? (
                                <div className="bg-slate-950 p-4 rounded-xl border border-amber-500/50 mb-4 animate-pulse">
                                    <h4 className="text-sm font-bold text-amber-400 mb-2 flex items-center"><Crown size={16} className="mr-2"/> 성인식 (Adulthood)</h4>
                                    <p className="text-xs text-slate-400 mb-3">
                                        아이가 성인이 되었습니다. 이제 독립하여 자신의 삶을 살 수 있습니다.<br/>
                                        (육아 기능이 종료됩니다)
                                    </p>
                                    <button 
                                        onClick={handleIndependence}
                                        className="w-full py-3 bg-gradient-to-r from-amber-700 to-amber-600 text-white font-bold rounded-lg shadow-lg flex items-center justify-center hover:scale-[1.02] transition-transform"
                                    >
                                        <LogOut size={18} className="mr-2"/> 독립 시키기 (Independence)
                                    </button>
                                </div>
                            ) : (
                                <>
                                    {/* Profile Summary */}
                                    <div className={`bg-slate-950 p-4 rounded-xl border ${isActionDone ? 'border-red-900/50' : 'border-slate-800'}`}>
                                        <div className="flex justify-between items-center mb-2">
                                            <div className="text-sm text-slate-400">이번 달 활동</div>
                                            <div className={`font-bold flex items-center ${isActionDone ? 'text-red-400' : 'text-green-400'}`}>
                                                {isActionDone ? <><CheckCircle size={14} className="mr-1"/> 완료 (휴식 필요)</> : '가능 (Available)'}
                                            </div>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <div className="text-sm text-slate-400">호감도</div>
                                            <div className="text-pink-400 font-bold">{child.affection} ♥</div>
                                        </div>
                                        {child.childData?.school?.isEnrolled && (
                                            <div className="flex justify-between items-center mt-2 border-t border-slate-800 pt-2">
                                                <div className="text-sm text-slate-400">학업 점수</div>
                                                <div className="text-cyan-400 font-bold">{child.childData.academicScore || 0}점</div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Child Stats View */}
                                    <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                                        <h4 className="text-xs text-slate-500 font-bold uppercase mb-3 flex items-center">
                                            <Activity size={12} className="mr-1"/> 성장 상태 (Stats)
                                        </h4>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                                            <div className="bg-slate-900 p-2 rounded flex justify-between"><span className="text-slate-500">HP</span><span className="text-red-400 font-mono">{child.stats.maxHp}</span></div>
                                            <div className="bg-slate-900 p-2 rounded flex justify-between"><span className="text-slate-500">MP</span><span className="text-blue-400 font-mono">{child.stats.maxMp}</span></div>
                                            <div className="bg-slate-900 p-2 rounded flex justify-between"><span className="text-slate-500">STR</span><span className="text-white font-mono">{child.stats.str}</span></div>
                                            <div className="bg-slate-900 p-2 rounded flex justify-between"><span className="text-slate-500">INT</span><span className="text-white font-mono">{child.stats.int}</span></div>
                                            <div className="bg-slate-900 p-2 rounded flex justify-between"><span className="text-slate-500">DEF</span><span className="text-white font-mono">{child.stats.def}</span></div>
                                            <div className="bg-slate-900 p-2 rounded flex justify-between"><span className="text-slate-500">AGI</span><span className="text-white font-mono">{child.stats.agi}</span></div>
                                            <div className="bg-slate-900 p-2 rounded flex justify-between"><span className="text-slate-500">WIS</span><span className="text-white font-mono">{child.stats.wis}</span></div>
                                            <div className="bg-slate-900 p-2 rounded flex justify-between"><span className="text-slate-500">CTRL</span><span className="text-white font-mono">{child.stats.ctrl}</span></div>
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    {displayAge < 11 ? (
                                        <div className="grid grid-cols-1 gap-3">
                                            <button 
                                                onClick={() => handleActionClick('education')}
                                                className={`p-4 rounded-xl flex items-center group transition-all border ${isActionDone ? 'bg-slate-900 border-slate-800 opacity-50 cursor-not-allowed' : 'bg-slate-800 hover:bg-slate-700 border-slate-700 hover:border-indigo-500'}`}
                                            >
                                                <div className={`p-3 rounded-full mr-4 transition-transform ${isActionDone ? 'bg-slate-800 text-slate-600' : 'bg-slate-900 text-indigo-400 group-hover:scale-110'}`}><BookOpen size={24}/></div>
                                                <div className="text-left">
                                                    <div className={`font-bold text-lg ${isActionDone ? 'text-slate-500' : 'text-slate-200'}`}>가정 교육 (Home School) {isActionDone && "(완료)"}</div>
                                                    <div className="text-xs text-slate-500">스탯 성장, 성격 형성 (비용 발생)</div>
                                                </div>
                                            </button>
                                            <button 
                                                onClick={() => handleActionClick('meal')}
                                                className={`p-4 rounded-xl flex items-center group transition-all border ${isActionDone ? 'bg-slate-900 border-slate-800 opacity-50 cursor-not-allowed' : 'bg-slate-800 hover:bg-slate-700 border-slate-700 hover:border-green-500'}`}
                                            >
                                                <div className={`p-3 rounded-full mr-4 transition-transform ${isActionDone ? 'bg-slate-800 text-slate-600' : 'bg-slate-900 text-green-400 group-hover:scale-110'}`}><Utensils size={24}/></div>
                                                <div className="text-left">
                                                    <div className={`font-bold text-lg ${isActionDone ? 'text-slate-500' : 'text-slate-200'}`}>맛있는 식사 (Meal) {isActionDone && "(완료)"}</div>
                                                    <div className="text-xs text-slate-500">호감도 대폭 상승, '사랑' 성격 (식량/골드)</div>
                                                </div>
                                            </button>
                                            <button 
                                                onClick={() => handleActionClick('talk')}
                                                className={`p-4 rounded-xl flex items-center group transition-all border ${isActionDone ? 'bg-slate-900 border-slate-800 opacity-50 cursor-not-allowed' : 'bg-slate-800 hover:bg-slate-700 border-slate-700 hover:border-amber-500'}`}
                                            >
                                                <div className={`p-3 rounded-full mr-4 transition-transform ${isActionDone ? 'bg-slate-800 text-slate-600' : 'bg-slate-900 text-amber-400 group-hover:scale-110'}`}><MessageCircle size={24}/></div>
                                                <div className="text-left">
                                                    <div className={`font-bold text-lg ${isActionDone ? 'text-slate-500' : 'text-slate-200'}`}>대화하기 (Talk) {isActionDone && "(완료)"}</div>
                                                    <div className="text-xs text-slate-500">가치관 형성, 성격 변화 (무료)</div>
                                                </div>
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            {/* Schooling Logic */}
                                            <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 text-center">
                                                <div className="text-slate-400 mb-2 flex items-center justify-center">
                                                    <School size={16} className="mr-2"/>
                                                    현재 가능 학교: <span className="text-white font-bold ml-1">{targetSchoolTier === 'Elementary' ? '초급' : targetSchoolTier === 'Middle' ? '중급' : '고급'} 레귤러스</span>
                                                </div>
                                                
                                                {!child.childData?.school?.isEnrolled ? (
                                                    <button onClick={() => setIsEnrolling(true)} className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold shadow-lg animate-pulse">
                                                        학교 입학 시키기
                                                    </button>
                                                ) : (
                                                    <>
                                                        <div className="text-indigo-400 font-bold border border-indigo-500/30 p-2 rounded bg-indigo-900/20 mb-3">
                                                            현재 {child.childData.school.name} 재학 중
                                                        </div>
                                                        
                                                        {/* School Actions */}
                                                        <div className="grid grid-cols-1 gap-3">
                                                            <button 
                                                                onClick={() => handleActionClick('education')}
                                                                className={`p-4 rounded-xl flex items-center group transition-all border ${isActionDone ? 'bg-slate-900 border-slate-800 opacity-50 cursor-not-allowed' : 'bg-slate-800 hover:bg-slate-700 border-slate-700 hover:border-indigo-500'}`}
                                                            >
                                                                <div className={`p-3 rounded-full mr-4 transition-transform ${isActionDone ? 'bg-slate-800 text-slate-600' : 'bg-slate-900 text-indigo-400 group-hover:scale-110'}`}><GraduationCap size={24}/></div>
                                                                <div className="text-left">
                                                                    <div className={`font-bold text-lg ${isActionDone ? 'text-slate-500' : 'text-slate-200'}`}>학업 지원 (Support) {isActionDone && "(완료)"}</div>
                                                                    <div className="text-xs text-slate-500">성적 향상, 성장 촉진 (비용 발생)</div>
                                                                </div>
                                                            </button>

                                                            <button 
                                                                onClick={() => handleActionClick('meal')}
                                                                className={`p-4 rounded-xl flex items-center group transition-all border ${isActionDone ? 'bg-slate-900 border-slate-800 opacity-50 cursor-not-allowed' : 'bg-slate-800 hover:bg-slate-700 border-slate-700 hover:border-green-500'}`}
                                                            >
                                                                <div className={`p-3 rounded-full mr-4 transition-transform ${isActionDone ? 'bg-slate-800 text-slate-600' : 'bg-slate-900 text-green-400 group-hover:scale-110'}`}><Utensils size={24}/></div>
                                                                <div className="text-left">
                                                                    <div className={`font-bold text-lg ${isActionDone ? 'text-slate-500' : 'text-slate-200'}`}>가족 식사 (Meal) {isActionDone && "(완료)"}</div>
                                                                    <div className="text-xs text-slate-500">호감도 상승, 유대감 강화</div>
                                                                </div>
                                                            </button>
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                            
                                            {isEnrolling && (
                                                <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 animate-in fade-in">
                                                    <h5 className="font-bold text-slate-300 mb-3">입학 지역 선택</h5>
                                                    <div className="grid grid-cols-2 gap-2 mb-2">
                                                        <select className="bg-slate-900 border border-slate-600 rounded p-2 text-xs text-white" value={selectedRegion} onChange={e => setSelectedRegion(e.target.value)}>
                                                            {Object.keys(WORLD_GEOGRAPHY).map(r => <option key={r} value={r}>{r}</option>)}
                                                        </select>
                                                        <select className="bg-slate-900 border border-slate-600 rounded p-2 text-xs text-white" value={selectedNation} onChange={e => setSelectedNation(e.target.value)}>
                                                            {Object.keys(WORLD_GEOGRAPHY[selectedRegion] || {}).map(n => <option key={n} value={n}>{n}</option>)}
                                                        </select>
                                                    </div>
                                                    <select className="w-full bg-slate-900 border border-slate-600 rounded p-2 text-xs text-white mb-4" value={selectedCity} onChange={e => setSelectedCity(e.target.value)}>
                                                        {(WORLD_GEOGRAPHY[selectedRegion]?.[selectedNation]?.cities || []).map(c => <option key={c} value={c}>{c}</option>)}
                                                    </select>
                                                    <div className="flex gap-2">
                                                        <button onClick={() => setIsEnrolling(false)} className="flex-1 py-2 bg-slate-700 text-slate-300 rounded text-xs">취소</button>
                                                        <button onClick={handleEnroll} className="flex-1 py-2 bg-indigo-600 text-white rounded text-xs font-bold">입학 확정</button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    )}

                    {/* EDUCATION VIEW */}
                    {viewMode === 'education' && (
                        <div className="space-y-6">
                            <div className="flex items-center text-slate-400 mb-4 cursor-pointer hover:text-white" onClick={() => setViewMode('menu')}>
                                <ArrowLeft size={16} className="mr-1"/> 뒤로 가기
                            </div>
                            
                            {/* Stat Selector */}
                            <div>
                                <h4 className="text-sm font-bold text-white mb-2">집중 교육 스탯</h4>
                                <div className="grid grid-cols-3 gap-2">
                                    {[
                                        { k: 'str', l: '힘 (STR)', i: Sword }, { k: 'int', l: '지력 (INT)', i: Brain }, { k: 'def', l: '체력 (DEF)', i: Shield },
                                        { k: 'agi', l: '민첩 (AGI)', i: Activity }, { k: 'wis', l: '지혜 (WIS)', i: BookOpen }, { k: 'ctrl', l: '제어 (CTRL)', i: User }
                                    ].map(s => (
                                        <button 
                                            key={s.k} 
                                            onClick={() => setSelectedStat(s.k as any)}
                                            className={`p-2 rounded border flex flex-col items-center justify-center transition-all ${selectedStat === s.k ? 'bg-indigo-600 border-indigo-400 text-white' : 'bg-slate-950 border-slate-800 text-slate-500 hover:bg-slate-800'}`}
                                        >
                                            <s.i size={16} className="mb-1"/>
                                            <span className="text-xs font-bold">{s.l}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Intensity Selector */}
                            <div>
                                <h4 className="text-sm font-bold text-white mb-2">교육 강도</h4>
                                <div className="space-y-2">
                                    <button onClick={() => setEduIntensity('Low')} className={`w-full p-3 rounded border text-left flex justify-between items-center transition-all ${eduIntensity === 'Low' ? 'bg-green-900/30 border-green-500 ring-1 ring-green-500' : 'bg-slate-950 border-slate-800'}`}>
                                        <div>
                                            <div className={`font-bold text-sm ${eduIntensity === 'Low' ? 'text-green-400' : 'text-slate-300'}`}>놀이식 교육 (Relaxed)</div>
                                            <div className="text-[10px] text-slate-500">비용: 500G | 효과: 소폭 상승, 호감도+, '정직' 성격</div>
                                        </div>
                                        {eduIntensity === 'Low' && <Smile size={20} className="text-green-500"/>}
                                    </button>
                                    <button onClick={() => setEduIntensity('Normal')} className={`w-full p-3 rounded border text-left flex justify-between items-center transition-all ${eduIntensity === 'Normal' ? 'bg-blue-900/30 border-blue-500 ring-1 ring-blue-500' : 'bg-slate-950 border-slate-800'}`}>
                                        <div>
                                            <div className={`font-bold text-sm ${eduIntensity === 'Normal' ? 'text-blue-400' : 'text-slate-300'}`}>표준 교육 (Normal)</div>
                                            <div className="text-[10px] text-slate-500">비용: 1000G | 효과: 보통 상승, '성실' 성격</div>
                                        </div>
                                        {eduIntensity === 'Normal' && <BookOpen size={20} className="text-blue-500"/>}
                                    </button>
                                    <button onClick={() => setEduIntensity('High')} className={`w-full p-3 rounded border text-left flex justify-between items-center transition-all ${eduIntensity === 'High' ? 'bg-red-900/30 border-red-500 ring-1 ring-red-500' : 'bg-slate-950 border-slate-800'}`}>
                                        <div>
                                            <div className={`font-bold text-sm ${eduIntensity === 'High' ? 'text-red-400' : 'text-slate-300'}`}>스파르타식 교육 (Spartan)</div>
                                            <div className="text-[10px] text-slate-500">비용: 3000G | 효과: 대폭 상승, 호감도--, '교만/악랄' 성격</div>
                                        </div>
                                        {eduIntensity === 'High' && <Flame size={20} className="text-red-500"/>}
                                    </button>
                                </div>
                            </div>

                            <button onClick={handleEducation} className="w-full py-4 bg-indigo-700 hover:bg-indigo-600 text-white font-bold rounded-lg shadow-lg mt-4">
                                {child.childData?.school?.isEnrolled ? "학업 지원하기" : "교육 시작하기"}
                            </button>
                        </div>
                    )}

                    {/* MEAL VIEW */}
                    {viewMode === 'meal' && (
                        <div className="space-y-6">
                            <div className="flex items-center text-slate-400 mb-4 cursor-pointer hover:text-white" onClick={() => setViewMode('menu')}>
                                <ArrowLeft size={16} className="mr-1"/> 뒤로 가기
                            </div>
                            
                            <h4 className="text-sm font-bold text-white mb-2">메뉴 선택</h4>
                            <div className="space-y-3">
                                {MEAL_OPTIONS.map((menu) => (
                                    <button 
                                        key={menu.id}
                                        onClick={() => setSelectedMenu(menu.id)}
                                        className={`w-full p-3 rounded-xl border text-left relative overflow-hidden transition-all ${selectedMenu === menu.id ? 'bg-amber-900/20 border-amber-500 ring-1 ring-amber-500' : 'bg-slate-950 border-slate-800 hover:border-slate-600'}`}
                                    >
                                        <div className="flex justify-between items-start mb-1">
                                            <span className={`font-bold ${selectedMenu === menu.id ? 'text-amber-200' : 'text-slate-200'}`}>{menu.name}</span>
                                            <div className="text-xs flex flex-col items-end">
                                                <span className="text-amber-400 font-mono"><Coins size={10} className="inline mr-1"/>{menu.cost} G</span>
                                                <span className="text-orange-400 font-mono"><Utensils size={10} className="inline mr-1"/>{menu.food} Food</span>
                                            </div>
                                        </div>
                                        <p className="text-xs text-slate-500 mb-2">{menu.desc}</p>
                                        <div className="flex gap-2 text-[10px]">
                                            <span className="bg-slate-900 px-2 py-0.5 rounded text-pink-400 border border-pink-900">호감도 +{menu.affect}</span>
                                            <span className="bg-slate-900 px-2 py-0.5 rounded text-red-400 border border-red-900">MaxHP +{Math.floor(menu.hp/2)}</span>
                                            {menu.chance > 0 && <span className="bg-slate-900 px-2 py-0.5 rounded text-amber-400 border border-amber-900">성격 '사랑' 확률 {menu.chance*100}%</span>}
                                        </div>
                                    </button>
                                ))}
                            </div>

                            <button onClick={handleMeal} className="w-full py-4 bg-amber-700 hover:bg-amber-600 text-white font-bold rounded-lg shadow-lg mt-4">
                                식사하기
                            </button>
                        </div>
                    )}

                    {/* TALK VIEW */}
                    {viewMode === 'talk' && currentScenario && (
                        <div className="space-y-6 flex flex-col h-full">
                            <div className="flex items-center text-slate-400 mb-2 cursor-pointer hover:text-white shrink-0" onClick={() => setViewMode('menu')}>
                                <ArrowLeft size={16} className="mr-1"/> 뒤로 가기
                            </div>

                            <div className="flex-1 flex flex-col justify-center">
                                <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 relative mb-6">
                                    <div className="absolute -top-3 -left-3 bg-slate-950 border border-slate-600 p-2 rounded-full">
                                        <Baby size={24} className="text-white"/>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-lg text-white font-bold mb-2">"{currentScenario.question}"</p>
                                        <p className="text-xs text-slate-500">아이에게 어떤 조언을 해주시겠습니까?</p>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    {currentScenario.options.map((opt, idx) => (
                                        <button 
                                            key={idx}
                                            onClick={() => handleTalk(idx)}
                                            className="w-full p-4 bg-slate-950 border border-slate-800 hover:border-amber-500 hover:bg-amber-900/10 rounded-xl text-left transition-all group"
                                        >
                                            <div className="font-bold text-slate-200 group-hover:text-amber-200 mb-1">"{opt.label}"</div>
                                            <div className="text-xs text-slate-500 group-hover:text-amber-500/70">
                                                성격 영향: <span className="font-bold underline">{opt.trait}</span>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
};

export default ChildCareModal;
