
import React, { useState, useEffect, useRef } from 'react';
import { Character, SchoolData, SimpleStudent, WeaponType, Companion, ClassTier, TournamentState, Location, SkillType, Stats, JobType, RelationType, SchoolTier } from '../types';
import { X, BookOpen, GraduationCap, Users, PenTool, Sword, Trophy, Medal, Star, ChevronRight, Activity, Target, Dumbbell, Brain, MessageCircle, Calendar, User, ArrowUpCircle, School, CalendarClock, Building2, Scroll, BedDouble, AlertTriangle, Shield, Eye, Flame, Lock, Sparkles, CheckCircle, UserPlus, ListOrdered, Shuffle, Heart, ArrowRight, MapPin, Globe, LayoutGrid, Send, Loader2, UserCheck, Crown, Coffee, Utensils, Gift, Smile, PartyPopper, Gamepad2 } from 'lucide-react';
import { addDays, getYear, generateClassmates, addMasteryExp, generateTournamentBracket, generateName, getWeaponTypeFromItem, getTierByLevel, generateCompanionStats, generateDefaultVisualUrl, findAvailableBattlePosition, calculateFinalStats } from '../utils';
import { WEAPON_TYPE_KOREAN, MAX_PARTY_SIZE, WORLD_GEOGRAPHY, SCHOOL_CONFIG } from '../constants';
import { chatWithStudent } from '../services/geminiService';
import ActionResultModal, { ResultData } from './ActionResultModal';
import TournamentModal from './TournamentModal';
import ClubModal from './ClubModal';
import LectureModal from './LectureModal';
import { StudentDetailModal } from './StudentDetailModal';
import { StudentAdviceModal } from './StudentAdviceModal';
import { 
    sanitizeYoungStudents, 
    sanitizeYoungStudent, 
    applyStudentUpdateToCharacter, 
    getStudentProfileAnalysis, 
    InteractionFeedbackResult,
    getMentoringCooldown,
    getInstructorQuestProgress
} from '../services/studentMentoringService';
import * as SchoolActions from '../Schoolaction';
import { processTimeSkip } from '../services/timeEngine';

interface Props {
    character: Character;
    onClose: () => void;
    onUpdateCharacter: (newChar: Character, logMsg: string) => void;
    onAction: (action: string, mpCost?: number, stateOverride?: Character) => void;
    onBattle?: (enemy: any, type?: string, source?: string, targetCity?: string, targetNation?: string) => void;
}

type SchoolZone = 'Office' | 'Training' | 'Classroom' | 'Library' | 'Dormitory' | 'Club';

const SchoolModal: React.FC<Props> = ({ character, onClose, onUpdateCharacter, onAction, onBattle }) => {
    const [currentZone, setCurrentZone] = useState<SchoolZone>(character.job === JobType.STUDENT ? 'Office' : 'Classroom');
    const [resultData, setResultData] = useState<ResultData | null>(null);
    const [selectedWeapon, setSelectedWeapon] = useState<WeaponType>('Sword');
    
    // UI State for Modals
    const [viewingStudent, setViewingStudent] = useState<SimpleStudent | null>(null);
    const [showPvPList, setShowPvPList] = useState(false);
    const [showRanking, setShowRanking] = useState(false);
    const [rankingTab, setRankingTab] = useState<'class' | 'school' | 'report'>('class');
    const [showOtherClass, setShowOtherClass] = useState(false);
    const [otherClassmates, setOtherClassmates] = useState<SimpleStudent[]>([]);
    const [recruitmentTarget, setRecruitmentTarget] = useState<SimpleStudent | null>(null);
    const [showTournament, setShowTournament] = useState(false);
    const [showRoster, setShowRoster] = useState(false);
    const [isLecturing, setIsLecturing] = useState(false);
    const [pendingCombatDemo, setPendingCombatDemo] = useState(false);
    const [lectureStatGains, setLectureStatGains] = useState<Partial<Stats> | null>(null);
    
    // [NEW] Dormitory Social Activities State
    const [showSocialModal, setShowSocialModal] = useState(false);
    const [socialActivityType, setSocialActivityType] = useState<'tea' | 'party' | 'boardgame' | 'cleaning' | 'gift' | null>(null);
    const [selectedSocialTarget, setSelectedSocialTarget] = useState<SimpleStudent | null>(null);

    // [NEW] Training States
    const [showTrainingPicker, setShowTrainingPicker] = useState(false);
    const [trainingMode, setTrainingMode] = useState<'Solo' | 'Joint'>('Solo');
    const [selectedTrainingStat, setSelectedTrainingStat] = useState<keyof Stats>('str');

    // AI Chat State
    const [chatStudent, setChatStudent] = useState<SimpleStudent | null>(null);
    const [chatInput, setChatInput] = useState('');
    const [isChatting, setIsChatting] = useState(false);
    const chatEndRef = useRef<HTMLDivElement>(null);

    // [NEW] Student Mentoring & Profile States
    const [selectedDetailStudent, setSelectedDetailStudent] = useState<SimpleStudent | null>(null);
    const [mentoringTargetStudent, setMentoringTargetStudent] = useState<SimpleStudent | null>(null);
    const [mentoringMode, setMentoringMode] = useState<'advice' | 'praise' | 'scold'>('advice');

    // Graduation/Transfer State
    const [showGraduationOptions, setShowGraduationOptions] = useState(false);
    const [transferTarget, setTransferTarget] = useState<Location>({ region: '아시아', nation: '대한민국', city: '서울' });
    const [selectedRegion, setSelectedRegion] = useState<string>('아시아');
    const [selectedNation, setSelectedNation] = useState<string>('대한민국');

    const SCHOOL_VALID_REGIONS = Object.keys(WORLD_GEOGRAPHY).filter(r => 
        !['마계', '신계', '실바나르', '페랄디아', '아비살론', '기타'].includes(r)
    );

    useEffect(() => {
        if (chatStudent) {
            chatEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
        }
    }, [chatStudent?.chatHistory]);

    useEffect(() => {
        const nations = Object.keys(WORLD_GEOGRAPHY[selectedRegion] || {});
        if (nations.length > 0 && !nations.includes(selectedNation)) {
            setSelectedNation(nations[0]);
        }
    }, [selectedRegion]);

    useEffect(() => {
        const nationData = WORLD_GEOGRAPHY[selectedRegion]?.[selectedNation];
        if (nationData) {
            setTransferTarget({
                region: selectedRegion,
                nation: selectedNation,
                city: nationData.capital
            });
        }
    }, [selectedRegion, selectedNation]);

    // [NEW] 임시 교관 퀘스트 확인
    const instructorQuest = character.mercenaryData?.activeQuests?.find(q => q.type === 'TemporaryInstructor') || 
                           character.militaryData?.activeMissions?.find(q => q.type === 'TemporaryInstructor');

    // [NEW] 학교 데이터가 없을 경우(임시 교관 등)를 위한 기본값 설정
    const school = character.schoolData ? { ...character.schoolData } : {
        schoolName: instructorQuest?.schoolName || '알 수 없는 학교',
        tier: (instructorQuest?.schoolTier === '초급' ? 'Elementary' : 
               instructorQuest?.schoolTier === '중급' ? 'Middle' : 
               instructorQuest?.schoolTier === '고급' ? 'High' : 'Elementary') as SchoolTier,
        grade: 1,
        classNumber: 1,
        semester: 1,
        midtermPassed: false,
        finalPassed: false,
        classmates: [],
        rank: 0,
        reputation: 0,
        isGraduated: false,
        lastExamDate: '',
        lastTrainingDate: '',
        lastClubActivityDate: '',
        lastScholarshipDate: '',
        warnings: 0,
        penaltyStatus: 'None'
    } as any;

    if (instructorQuest && instructorQuest.studentsToTeach) {
        school.classmates = sanitizeYoungStudents(instructorQuest.studentsToTeach);
        school.schoolName = instructorQuest.schoolName || school.schoolName;
    }

    const currentDateObj = new Date(character.currentDate || '2000-03-02');
    const currentMonth = currentDateObj.getMonth() + 1;
    const currentYear = currentDateObj.getFullYear();
    const currentYearMonth = character.currentDate?.substring(0, 7); 
    
    const schoolYear = currentMonth < 3 ? currentYear - 1 : currentYear;

    const isMidtermPeriod = currentMonth >= 4 && currentMonth <= 6;
    const isFinalPeriod = currentMonth >= 10 && currentMonth <= 12;
    const isWinterBreak = currentMonth === 1 || currentMonth === 2;
    
    const isExamTakenThisMonth = school.lastExamDate === currentYearMonth;
    const isTrainingDone = school.lastTrainingDate === currentYearMonth; 

    // [NEW] 담임 교사 생성 및 배정 로직
    useEffect(() => {
        if (!character.schoolData || character.job !== JobType.STUDENT) return;
        
        // 담임 교사가 없거나, 학년이 바뀌었는데(이건 별도 로직 필요하지만 일단 없음 체크) 교사가 없는 경우
        if (!character.schoolData.homeroomTeacher) {
            const teacherGender = Math.random() > 0.5 ? '남성' : '여성';
            const teacherGenderParam = teacherGender === '남성' ? 'male' : 'female';
            const teacherAge = 25 + Math.floor(Math.random() * 20);
            
            const teacherLevel = 50 + (character.schoolData.grade * 10);
            const teacherStats = generateCompanionStats(teacherLevel);
            const teacherTier = getTierByLevel(teacherLevel);
            
            const mbtiTypes = [
                'ISTJ', 'ISFJ', 'INFJ', 'INTJ', 
                'ISTP', 'ISFP', 'INFP', 'INTP', 
                'ESTP', 'ESFP', 'ENFP', 'ENTP', 
                'ESTJ', 'ESFJ', 'ENFJ', 'ENTJ'
            ];
            const teacherMBTI = mbtiTypes[Math.floor(Math.random() * mbtiTypes.length)];

            // [MODIFIED] 담임 교사 국적 생성 로직 (학교 소재지 우선, 20% 확률로 타 국적)
            const schoolNation = character.currentLocation?.nation || character.nation;
            let teacherNation = schoolNation;
            
            if (Math.random() < 0.2) {
                const allNations: string[] = [];
                Object.values(WORLD_GEOGRAPHY).forEach(region => {
                    if (region) Object.keys(region).forEach(n => allNations.push(n));
                });
                if (allNations.length > 0) {
                    teacherNation = allNations[Math.floor(Math.random() * allNations.length)];
                }
            }

            const teacherName = generateName(teacherNation, teacherGenderParam);
            const teacher: SimpleStudent = {
                id: `teacher_${Math.random().toString(36).substr(2, 9)}`,
                name: teacherName,
                age: `${teacherAge}세`,
                gender: teacherGender,
                race: character.race,
                nation: teacherNation,
                level: teacherLevel, 
                personality: teacherMBTI,
                appearance: '단정한 정장 차림',
                classType: '교사',
                stats: teacherStats,
                affection: 5,
                job: JobType.TEACHER,
                isPastConnection: true,
                classTier: teacherTier,
                visualUrl: generateDefaultVisualUrl(teacherName, teacherNation, character.race, teacherGender),
                reputation: 1000 + Math.floor(Math.random() * 500),
                merit: 1000 + Math.floor(Math.random() * 500),
            };

            const newChar = { ...character };
            newChar.schoolData.homeroomTeacher = teacher;
            
            // 사회적 관계망에 추가
            if (!newChar.socialNetwork) newChar.socialNetwork = [];
            if (!newChar.socialNetwork.find(n => n.id === teacher.id)) {
                 newChar.socialNetwork.push(teacher);
            }
            
            onUpdateCharacter(newChar, `[학교] ${character.schoolData.grade}학년 담임 교사 '${teacher.name}' 선생님이 배정되었습니다.`);
        }
    }, [character.schoolData?.grade]);

    // [NEW] 중복 영입 체크 헬퍼
    const isAlreadyRecruited = (id: string) => {
        return character.companions.some(c => c.id === id) || 
               character.inactiveCompanions?.some(c => c.id === id);
    };

    if (!character.schoolData && !instructorQuest) return null;

    const tournamentConfig = {
        elementary: { tier: 'Elementary', grade: 3, month: 11, label: '학교 1:1 토너먼트', reward: 'EXP 2000, GOLD 5000', rounds: 32, exp: 2000, gold: 5000, scope: 'School' },
        middle: { tier: 'Middle', grade: 3, month: 11, label: '학교 1:1 토너먼트', reward: 'EXP 5000, GOLD 10000', rounds: 32, exp: 5000, gold: 10000, scope: 'School' },
        high_school: { tier: 'High', grade: 3, month: 5, label: '교내 토너먼트', reward: 'EXP 10000, GOLD 15000', rounds: 32, exp: 10000, gold: 15000, scope: 'School' },
        high_national: { tier: 'High', grade: 3, month: 8, label: '국가 대항전', reward: 'EXP 20000, GOLD 30000', rounds: 64, exp: 20000, gold: 30000, scope: 'National' },
        high_world: { tier: 'High', grade: 3, month: 12, label: '세계 토너먼트 (월드컵)', reward: 'EXP 30000, GOLD 50000', rounds: 64, exp: 30000, gold: 50000, scope: 'World' }
    };

    let activeTournamentDef = null;
    let activeTournamentKey = "";

    if (school.tier === 'Elementary' && school.grade === 3 && currentMonth === 11) { activeTournamentDef = tournamentConfig.elementary; activeTournamentKey = "elementary"; }
    else if (school.tier === 'Middle' && school.grade === 3 && currentMonth === 11) { activeTournamentDef = tournamentConfig.middle; activeTournamentKey = "middle"; }
    else if (school.tier === 'High' && school.grade === 3) {
        if (currentMonth === 5) { activeTournamentDef = tournamentConfig.high_school; activeTournamentKey = "high_school"; }
        else if (currentMonth === 8) { activeTournamentDef = tournamentConfig.high_national; activeTournamentKey = "high_national"; }
        else if (currentMonth === 12) { activeTournamentDef = tournamentConfig.high_world; activeTournamentKey = "high_world"; }
    }

    const isTournamentTaken = school.lastTournamentDate === currentYearMonth;
    const warnings = school.warnings || 0;
    const isSuspended = school.penaltyStatus === 'Suspended';
    const canAdvance = school.midtermPassed && school.finalPassed;
      // [NEW] 성적 텍스트 변환 헬퍼
    const getPlacementText = (round: number) => {
        if (round === 1) return "우승";
        if (round === 32) return "32강 탈락";
        if (round === 16) return "16강 탈락";
        if (round === 8) return "8강 탈락";
        if (round === 4) return "4강 탈락";
        if (round === 2) return "준우승";
        return `${round}강 기록`;
    };

    const handleAdvanceClick = () => {
        if (!canAdvance) {
            setResultData({ type: 'warning', title: '진급 불가', message: '아직 모든 시험(중간/기말)을 통과하지 못했습니다.', items: [] });
            return;
        }

        if (school.grade < 3) {
            onAction(`[학교 생활] 진급 (학년 상승)`); 
              setResultData({ 
                type: 'levelup', 
                title: '진급 축하!', 
                message: `${school.grade + 1}학년으로 진급했습니다!`, 
                items: [{ label: '학년', before: `${school.grade}학년`, after: `${school.grade + 1}학년` }] 
            });
            onClose(); 
        } else {
            setShowGraduationOptions(true);
        }
    };

    const handleGraduationChoice = (choice: 'local' | 'transfer' | 'society') => {
        setShowGraduationOptions(false);
        onClose(); 

        if (choice === 'society') {
            onAction(`[학교 생활] 고등학교 졸업 (사회인 진출)`); 
        } else if (choice === 'local') {
            onAction(`[학교 생활] 진학 (지역 유지)`);
        } else if (choice === 'transfer') {
            const dest = transferTarget;
            onAction(`[학교 생활] 진학 (전학: ${dest.region}/${dest.nation}/${dest.city})`);
        }
    };

    const handleTakeClass = (type: 'Combat' | 'Magic' | 'Divine' | 'Strategy' | 'Weapon' | 'Physical') => {
        if (character.job !== JobType.STUDENT) {
            setResultData({ type: 'warning', title: '수강 불가', message: '학생 직업일 때만 수강이 가능합니다.', items: [] });
            return;
        }
        if (isSuspended) {
            setResultData({ type: 'warning', title: '수강 불가', message: '현재 정학 상태입니다. 교무실에서 징계가 풀릴 때까지 대기하세요.', items: [] });
            return;
        }

        if (isWinterBreak) {
            setResultData({ 
                type: 'info', 
                title: '수업 불가 (방학)', 
                message: '현재는 겨울 방학 기간입니다. (1~2월)', 
                items: [{ label: '상태', after: '방학' }] 
            });
            return;
        }

        // [MODIFIED] processTimeSkip 시뮬레이션 적용 (7일 경과)
        const { updatedCharacter, systemLogs } = processTimeSkip(character, 7);
        const newChar = { ...updatedCharacter };
        
        let statMsg = "";
        let eventMsg = "";
        let multiplier = 1;
        let expGain = 20;
        
        const repBonus = (newChar.schoolData?.reputation || 0) >= 10 ? 1 : 0;
        if (repBonus > 0) eventMsg += " (높은 평판으로 효율 증가)";

        // [NEW] 담임 교사 호감도 증가 로직
        if (newChar.schoolData?.homeroomTeacher) {
            const teacher = newChar.schoolData.homeroomTeacher;
            const affectionGain = Math.random() < 0.3 ? 1 : 0; // 30% 확률로 호감도 1 증가
            if (affectionGain > 0) {
                teacher.affection = (teacher.affection || 0) + affectionGain;
                
                // [NEW] 과거 인연(socialNetwork)에 등록된 담임 교사 호감도 동기화
                if (newChar.socialNetwork) {
                    const socialTeacher = newChar.socialNetwork.find(n => n.id === teacher.id);
                    if (socialTeacher) {
                        socialTeacher.affection = teacher.affection;
                    }
                }
                
                eventMsg += `\n(담임 교사 ${teacher.name}의 호감도가 상승했습니다.)`;
            }
        }

        const roll = Math.random();
        if (roll < 0.1) {
            multiplier = 2;
            eventMsg = "\n(이벤트: 교관님께 칭찬을 들어 성취감이 2배가 되었습니다!)";
            if(newChar.schoolData) newChar.schoolData.reputation += 2;
        } else if (roll < 0.2) {
            multiplier = 0;
            expGain = 0;
            eventMsg = "\n(이벤트: 수업 중에 졸다가 걸려 혼났습니다... 능력치 변동 없음)";
            if(newChar.schoolData) newChar.schoolData.reputation -= 1;
        }

        const applyToEntity = (entity: any) => {
            if (expGain > 0) entity.currentExp += expGain;
            if (multiplier > 0) {
                const val = (multiplier === 2 ? 2 : 1) * multiplier + repBonus;
                if (type === 'Combat') { entity.stats.str += val; entity.stats.agi += val; }
                else if (type === 'Magic') { entity.stats.int += 2*val; }
                else if (type === 'Divine') { entity.stats.ctrl += 2*val; }
                else if (type === 'Strategy') { entity.stats.wis += 2*val; }
                else if (type === 'Physical') { entity.stats.def += 2*val; }
                else if (type === 'Weapon') {
                    const weaponTypeToUpdate = ('id' in entity) 
                        ? (entity.equipment.weapon ? getWeaponTypeFromItem(entity.equipment.weapon) : null)
                        : selectedWeapon;
                    
                    if (weaponTypeToUpdate) {
                        const res = addMasteryExp(entity, weaponTypeToUpdate as WeaponType, 5 * multiplier + repBonus);
                        const updated = res.char as any;
                        entity.weaponMastery = updated.weaponMastery;
                    }
                }
            }
        };

        applyToEntity(newChar);
        
        newChar.companions = newChar.companions.map(c => {
            const nc = { ...c, stats: { ...c.stats }, weaponMastery: { ...(c.weaponMastery || {}) } };
            applyToEntity(nc);
            return nc;
        });
        if (newChar.inactiveCompanions) {
            newChar.inactiveCompanions = newChar.inactiveCompanions.map(c => {
                const nc = { ...c, stats: { ...c.stats }, weaponMastery: { ...(c.weaponMastery || {}) } };
                applyToEntity(nc);
                return nc;
            });
        }

        if (multiplier > 0) {
            const val = (multiplier === 2 ? 2 : 1) * multiplier + repBonus;
            if (type === 'Combat') statMsg = `STR +${val}, AGI +${val}`;
            else if (type === 'Magic') statMsg = `INT +${2*val}`;
            else if (type === 'Divine') statMsg = `CTRL +${2*val}`;
            else if (type === 'Strategy') statMsg = `WIS +${2*val}`;
            else if (type === 'Physical') statMsg = `DEF +${2*val}`;
            else if (type === 'Weapon') statMsg = `${WEAPON_TYPE_KOREAN[selectedWeapon]} 숙련도 +${5 * multiplier + repBonus}`;
        } else {
            statMsg = "변동 없음";
        }

        if (expGain > 0) statMsg += `, EXP +${expGain}`;

        const logCombined = `[학교 생활] ${type} 수업 완료. (${statMsg}) (일행 전체 반영됨) (1주일 경과)${eventMsg}${systemLogs.length > 0 ? '\n[기간 중 소식]\n' + systemLogs.slice(0, 3).join('\n') : ''}`;
        onUpdateCharacter(newChar, logCombined);
        
        const resultItems = [];
        if (multiplier === 0) { resultItems.push({ label: '결과', after: '졸음 (실패)' }); } 
        else { resultItems.push({ label: '성장 (전체)', after: statMsg }); }
        resultItems.push({ label: '시간', after: '+7일' });
        
        setResultData({
            type: multiplier === 0 ? 'failure' : multiplier === 2 ? 'success' : 'info',
            title: multiplier === 0 ? '수업 태만' : multiplier === 2 ? '수업 대성공!' : '수업 완료',
            message: `${type} 수업을 마쳤습니다.${systemLogs.length > 0 ? '\n\n[활동 중 발생한 주요 소식]\n' + systemLogs.slice(0, 3).join('\n') : ''}`,
            items: resultItems
        });
    };

    const addWarning = (newChar: Character, reason: string) => {
        if (!newChar.schoolData) return;
        newChar.schoolData.warnings = (newChar.schoolData.warnings || 0) + 1;
        
        // [NEW] 담임 교사 호감도 하락 (징계 시 실망)
        if (newChar.schoolData.homeroomTeacher) {
            const teacher = newChar.schoolData.homeroomTeacher;
            teacher.affection = Math.max(-100, (teacher.affection || 0) - 10);
            
            // 과거 인연 동기화
            if (newChar.socialNetwork) {
                const socialTeacher = newChar.socialNetwork.find(n => n.id === teacher.id);
                if (socialTeacher) socialTeacher.affection = teacher.affection;
            }
        }

        let penaltyMsg = "";
        
        if (newChar.schoolData.warnings >= 3) {
            newChar.schoolData.penaltyStatus = 'Expelled';
            newChar.schoolData.isGraduated = true; 
            newChar.schoolData.tier = 'University'; 
            penaltyMsg = " [경고 누적으로 제적 처리되었습니다.]";
        } else if (newChar.schoolData.warnings >= 2) {
            newChar.schoolData.penaltyStatus = 'Suspended';
            penaltyMsg = " [정학 처분: 당분간 수업 참여 불가]";
        }
        
        return { char: newChar, msg: `${reason} 경고 1회 추가. (총 ${newChar.schoolData.warnings}/3)${penaltyMsg}` };
    };

    const handleLibraryAction = (type: 'Normal' | 'Forbidden') => {
        if (character.job !== JobType.STUDENT) {
            setResultData({ type: 'warning', title: '열람 불가', message: '학생 직업일 때만 이용 가능합니다.', items: [] });
            return;
        }
        // [MODIFIED] processTimeSkip 시뮬레이션 적용 (7일 경과)
        const { updatedCharacter, systemLogs } = processTimeSkip(character, 7);
        const newChar = { ...updatedCharacter };

        if (type === 'Normal') {
            newChar.stats.int += 2; newChar.stats.wis += 2; newChar.currentExp += 50;
            onUpdateCharacter(newChar, `[도서관] 고대 문헌을 읽으며 지식을 쌓았습니다. (INT +2, WIS +2, EXP +50, 1주일 경과)${systemLogs.length > 0 ? '\n' + systemLogs.slice(0, 2).join('\n') : ''}`);
            setResultData({ type: 'success', title: '독서 완료', message: `지식을 쌓는 일주일 동안 세계 곳곳에서는 다양한 소식이 들려왔습니다.\n${systemLogs.length > 0 ? '\n[활동 중 발생한 소식]\n' + systemLogs.slice(0, 3).join('\n') : ''}`, items: [{ label: '성장', after: 'INT +2, WIS +2' }, { label: '시간', after: '+7일' }]});
        } else {
            const roll = Math.random();
            if (roll < 0.3) {
                const res = addWarning(newChar, "금서 구역 무단 열람");
                if (res) { onUpdateCharacter(res.char, res.msg); setResultData({ type: 'warning', title: '징계', message: '사서에게 들켰습니다! 경고를 받습니다.', items: [{ label: '경고', after: '+1' }]}); }
            } else {
                newChar.stats.int += 10; newChar.stats.wis += 10; newChar.currentExp += 200;
                let secretMsg = ""; if (Math.random() < 0.1) { newChar.schoolData!.reputation += 5; secretMsg = " (신력의 비밀 단서 발견!)"; }
                onUpdateCharacter(newChar, `[도서관] 금서를 몰래 열람했습니다... 강력한 지식을 얻었습니다.${secretMsg} (1주일 경과)${systemLogs.length > 0 ? '\n' + systemLogs.slice(0, 2).join('\n') : ''}`);
                setResultData({ type: 'success', title: '금서 열람 성공', message: `위험한 지식을 손에 넣었습니다. 바깥 세계의 소식도 함께 도착했습니다.\n${systemLogs.length > 0 ? '\n[활동 중 발생한 소식]\n' + systemLogs.slice(0, 3).join('\n') : ''}`, items: [{ label: '성장', after: 'INT +10, WIS +10' }]});
            }
        }
    };

    const handleSendMessage = async () => {
        if (!chatInput.trim() || !chatStudent || isChatting) return;
        
        const userMsg = chatInput;
        setChatInput('');
        setIsChatting(true);

        try {
            const replyText = await chatWithStudent(chatStudent, userMsg, character);
            
            // [MODIFIED] 대화 시 1일 소모 시뮬레이션 적용
            const { updatedCharacter, systemLogs } = processTimeSkip(character, 1);
            const newChar = { ...updatedCharacter };
            
            const isOriginalClassmate = Boolean(newChar.schoolData?.classmates && newChar.schoolData.classmates.some(m => m.id === chatStudent.id));
            const isInstructorClassmate = Boolean(instructorQuest?.studentsToTeach?.some(m => m.id === chatStudent.id));
            const members = isOriginalClassmate && newChar.schoolData?.classmates
                ? [...newChar.schoolData.classmates] 
                : isInstructorClassmate && instructorQuest?.studentsToTeach
                ? [...instructorQuest.studentsToTeach]
                : [...otherClassmates];
            const idx = members.findIndex(m => m.id === chatStudent.id);
            
            if (idx !== -1) {
                const updatedStudent = { ...members[idx] };
                updatedStudent.chatHistory = [...(updatedStudent.chatHistory || []), 
                    { role: 'user', text: userMsg }, 
                    { role: 'model', text: replyText.replace(/\[(AFF|RES|TEN)[+-]\d+\]/g, '').trim() }
                ];
                
                // 태그 파싱 및 수치 적용
                const affMatch = replyText.match(/\[AFF([+-]\d+)\]/);
                const resMatch = replyText.match(/\[RES([+-]\d+)\]/);
                const tenMatch = replyText.match(/\[TEN([+-]\d+)\]/);
                
                if (affMatch) updatedStudent.affection = Math.min(100, Math.max(-100, updatedStudent.affection + parseInt(affMatch[1])));
                if (resMatch) updatedStudent.respect = Math.min(100, Math.max(0, (updatedStudent.respect || 0) + parseInt(resMatch[1])));
                if (tenMatch) updatedStudent.tension = Math.min(100, Math.max(0, (updatedStudent.tension || 0) + parseInt(tenMatch[1])));
                
                sanitizeYoungStudent(updatedStudent);
                members[idx] = updatedStudent;
                if (isOriginalClassmate && newChar.schoolData) {
                    newChar.schoolData.classmates = members;
                } else if (isInstructorClassmate && newChar.mercenaryData?.activeQuests) {
                    newChar.mercenaryData.activeQuests = newChar.mercenaryData.activeQuests.map(q => 
                        q.id === instructorQuest!.id ? { ...q, studentsToTeach: members } : q
                    );
                } else {
                    setOtherClassmates(members);
                }

                // 사회적 관계망 동기화
                if (newChar.socialNetwork) {
                    const snIdx = newChar.socialNetwork.findIndex(s => s.id === updatedStudent.id);
                    if (snIdx !== -1) {
                        newChar.socialNetwork[snIdx] = { ...newChar.socialNetwork[snIdx], ...updatedStudent };
                    }
                }
                
                setChatStudent(updatedStudent);
                // 시뮬레이션 로그가 있다면 게임 로그에 출력
                systemLogs.forEach(log => onUpdateCharacter(newChar, log));
                onUpdateCharacter(newChar, "");
            }
        } finally {
            setIsChatting(false);
        }
    };

    const handleDormAction = (action: 'Rest' | 'Hangout' | 'Info' | 'Recruit' | 'VisitClass', targetId?: string) => {
        if (character.job !== JobType.STUDENT && action !== 'Info') {
            setResultData({ type: 'warning', title: '이용 불가', message: '학생 직업일 때만 이용 가능합니다.', items: [] });
            return;
        }
        if (action === 'Rest') {
            // [MODIFIED] 기숙사 휴식 시 1일 시뮬레이션 적용
            const { updatedCharacter, systemLogs } = processTimeSkip(character, 1);
            const newChar = { ...updatedCharacter };
            
            const { finalStats: dormFinal } = calculateFinalStats(newChar);
            newChar.stats.hp = dormFinal.maxHp;
            newChar.stats.mp = dormFinal.maxMp;
            
            onUpdateCharacter(newChar, `[기숙사] 푹 쉬며 컨디션을 회복했습니다. (1일 경과)${systemLogs.length > 0 ? '\n' + systemLogs.slice(0, 1).join('\n') : ''}`);
            setResultData({ type: 'info', title: '휴식 완료', message: `체력과 마력이 모두 회복되었습니다.${systemLogs.length > 0 ? '\n\n[활동 중 발생한 소식]\n' + systemLogs.slice(0, 2).join('\n') : ''}`, items: [{ label: 'HP/MP', after: 'Full' }, { label: '경과 시간', after: '1일' }]});
        } else if (action === 'Info' && targetId) {
            let student = school.classmates.find(s => s.id === targetId) || otherClassmates.find(s => s.id === targetId);
            if (student) setViewingStudent(student);
        } else if (action === 'Hangout' && targetId) {
            let student = school.classmates.find(s => s.id === targetId) || otherClassmates.find(s => s.id === targetId);
            if (student) setChatStudent(student);
        } else if (action === 'Recruit' && targetId) {
             const student = school.classmates.find(s => s.id === targetId) || otherClassmates.find(s => s.id === targetId);
             if (student) { setRecruitmentTarget(student); }
        } else if (action === 'VisitClass') {
            const newStudents = generateClassmates(character.nation, 8, school.tier, school.grade, [], 1, undefined, false, currentYear);
            setOtherClassmates(newStudents);
            setShowOtherClass(true);
        }
    };

     const handleConfirmRecruit = () => {
        if (!recruitmentTarget) return;
        const student = recruitmentTarget;
        
        // [MODIFIED] 중복 체크 강화
        if (isAlreadyRecruited(student.id)) {
            alert("이미 동료로 영입한 인물입니다.");
            setRecruitmentTarget(null);
            return;
        }

        if (student.isEternalRival) {
            alert("그는 당신의 '영원의 라이벌'입니다. 결코 아군으로 영입할 수 없으며 오직 대결을 통한 경쟁만이 허용됩니다!");
            setRecruitmentTarget(null);
            return;
        }

        if (student.isRival) {
            const canRecruit = (student.respect || 0) >= 70 && (student.tension || 0) === 0;
            if (!canRecruit) {
                alert(`라이벌을 영입하려면 존중도 70 이상, 긴장도 0이 필요합니다.\n(현재: 존중 ${student.respect || 0}, 긴장 ${student.tension || 0})`);
                return;
            }
        } else {
            if (student.affection < 75) { alert("호감도가 부족합니다. (필요: 75)"); return; }
        }

        if (character.companions.length >= MAX_PARTY_SIZE) { alert("파티 인원이 가득 찼습니다."); return; }

        const level = student.level;
        const tier = getTierByLevel(level);
        const fallbackStats = generateCompanionStats(level);

        const newCompanion: Companion = {
            id: student.id, 
            name: student.name, 
            birthYear: student.birthYear,
            age: student.age,
            gender: student.gender, 
            race: character.race, 
            nation: student.nation, 
            classType: "학생",
            level: level, 
            stats: { 
                hp: student.stats.hp || fallbackStats.hp, 
                maxHp: student.stats.maxHp || fallbackStats.maxHp || student.stats.hp || fallbackStats.hp, 
                mp: student.stats.mp || fallbackStats.mp, 
                maxMp: student.stats.maxMp || fallbackStats.maxMp || student.stats.mp || fallbackStats.mp, 
                str: student.stats.str ?? fallbackStats.str, 
                int: student.stats.int ?? fallbackStats.int, 
                def: student.stats.def ?? fallbackStats.def, 
                agi: student.stats.agi ?? fallbackStats.agi, 
                wis: student.stats.wis ?? fallbackStats.wis, 
                ctrl: student.stats.ctrl ?? fallbackStats.ctrl 
            },
            currentExp: 0, 
            job: JobType.STUDENT,
            maxExp: level * 100, 
            statPoints: 0, 
            classTier: tier, 
            visualUrl: student.visualUrl || generateDefaultVisualUrl(student.name, student.nation, character.race, student.gender),
            skills: [], 
            equipment: {}, 
            inventory: [], 
            affection: student.isRival ? 80 : student.affection, 
            loyalty: 70, 
            appearance: student.appearance, 
            personality: student.personality,
            battlePosition: findAvailableBattlePosition(character)
        };

        const newChar = { ...character };
        newChar.companions = [...newChar.companions, newCompanion];
        
        onUpdateCharacter(newChar, `[동료 영입] ${student.isRival ? '진정한 동료가 된 라이벌 ' : ''}${student.name}이(가) 파티에 합류했습니다!`);
        setRecruitmentTarget(null); setViewingStudent(null);
        setResultData({ 
            type: 'success', 
            title: student.isRival ? '세기의 동행' : '영입 성공!', 
            message: student.isRival 
                ? `${student.name}: "흥, 네 녀석의 실력... 인정하지. 이제 같은 곳을 보며 싸워보자고."`
                : `${student.name}와(과) 함께 모험을 떠납니다.`, 
            items: [{ label: '레벨', after: `Lv.${level}` }, { label: '직업', after: '학생' }] 
        });
    };

    const handleTrainingAction = (type: 'PvE' | 'PvP' | 'Rival') => {
        if (character.job !== JobType.STUDENT) {
            setResultData({ type: 'warning', title: '훈련 불가', message: '학생 직업일 때만 훈련이 가능합니다.', items: [] });
            return;
        }
        // [MODIFIED] 훈련 활동 시 1일 시뮬레이션 적용
        const { updatedCharacter, systemLogs } = processTimeSkip(character, 1);
        const newChar = { ...updatedCharacter };

        if (type === 'PvE') {
            onUpdateCharacter(newChar, `[학교 훈련] 연습용 마물을 상대로 수련하며 하루를 보냈습니다. (날짜 변경: ${newChar.currentDate})${systemLogs.length > 0 ? '\n' + systemLogs.slice(0, 1).join('\n') : ''}`);
            onClose(); 
            let monsterLevel = 1;
            if (school.tier === 'Elementary' || school.tier === '초급') {
                monsterLevel = Math.floor(Math.random() * 10) + 1; // 1~10
            } else if (school.tier === 'Middle' || school.tier === '중급') {
                monsterLevel = Math.floor(Math.random() * 10) + 11; // 11~20
            } else if (school.tier === 'High' || school.tier === '고급' || school.tier === 'University') {
                monsterLevel = Math.floor(Math.random() * 10) + 21; // 21~30
            } else {
                monsterLevel = Math.floor(Math.random() * 10) + 1;
            }
            onAction(`[전투 돌입] 훈련용 몬스터 (Lv.${monsterLevel})`, 0, newChar);
        } else if (type === 'PvP') { 
            setShowPvPList(true); 
        } else if (type === 'Rival') {
            let rival = school.classmates.find(s => s.isRival) || school.classmates[0];
            onUpdateCharacter(newChar, `[학교 결투] 라이벌 ${rival.name}와(과) 결전을 벌이며 하루를 보냈습니다. (날짜 변경: ${newChar.currentDate})${systemLogs.length > 0 ? '\n' + systemLogs.slice(0, 1).join('\n') : ''}`);
            onClose(); 
            onAction(`[전투 돌입] 라이벌 ${rival.name} (결투) [1:1 대결]`, 0, newChar); 
        }
    };

    const handleSocialActivity = (
        type: 'tea' | 'party' | 'boardgame' | 'cleaning' | 'gift',
        target?: SimpleStudent
    ) => {
        if (character.job !== JobType.STUDENT) {
            setResultData({ type: 'warning', title: '이용 불가', message: '학생 신분일 때만 이용 가능합니다.', items: [] });
            return;
        }

        // 1) 야식 파티 (Party)
        if (type === 'party') {
            const cost = 30000;
            if ((character.money || 0) < cost) {
                alert(`골드가 부족합니다! (필요: ${cost.toLocaleString()} Gold, 보유: ${(character.money || 0).toLocaleString()} Gold)`);
                return;
            }
            const { updatedCharacter, systemLogs } = processTimeSkip(character, 1);
            const newChar = { ...updatedCharacter };
            newChar.money = Math.max(0, (newChar.money || 0) - cost);
            const { finalStats: partyFinal } = calculateFinalStats(newChar);
            newChar.stats.hp = partyFinal.maxHp;
            newChar.stats.mp = partyFinal.maxMp;

            const affGain = Math.floor(Math.random() * 3) + 5; // 5 ~ 7
            if (newChar.schoolData?.classmates) {
                newChar.schoolData.classmates = newChar.schoolData.classmates.map(s => ({
                    ...s,
                    affection: Math.min(100, (s.affection || 0) + affGain),
                    tension: s.isRival ? Math.max(0, (s.tension || 0) - 10) : s.tension
                }));
            }

            onUpdateCharacter(newChar, `[기숙사 친목] 반 친구들과 함께 치킨과 피자로 성대한 야식 파티를 즐겼습니다! (학급 전원 호감도 +${affGain}, 1일 경과)${systemLogs.length > 0 ? '\n' + systemLogs.slice(0, 1).join('\n') : ''}`);
            setResultData({
                type: 'success',
                title: '🍕 기숙사 야식 파티 성공!',
                message: '맛있는 음식 냄새에 기숙사 휴게실로 반 친구들이 모두 모여들었습니다. 밤늦게까지 웃고 떠들며 모든 급우들과 깊은 우정을 쌓았습니다!',
                items: [
                    { label: '비용 지출', after: `-${cost} Gold` },
                    { label: '전체 호감도', after: `반 급우 전원 +${affGain} ♥` },
                    { label: '컨디션', after: 'HP / MP 완전 회복' },
                    { label: '소요 시간', after: '1일 경과' }
                ]
            });
            setShowSocialModal(false);
            return;
        }

        // 2) 심야 티타임 (Tea Time)
        if (type === 'tea') {
            if (!target) {
                alert('함께 차를 마실 친구를 선택해주세요.');
                return;
            }
            const cost = 10000;
            if ((character.money || 0) < cost) {
                alert(`골드가 부족합니다! (필요: ${cost.toLocaleString()} Gold, 보유: ${(character.money || 0).toLocaleString()} Gold)`);
                return;
            }
            const { updatedCharacter, systemLogs } = processTimeSkip(character, 1);
            const newChar = { ...updatedCharacter };
            newChar.money = Math.max(0, (newChar.money || 0) - cost);
            const { finalStats: teaFinal } = calculateFinalStats(newChar);
            newChar.stats.hp = Math.min(teaFinal.maxHp, newChar.stats.hp + Math.floor(teaFinal.maxHp * 0.5));
            newChar.stats.mp = Math.min(teaFinal.maxMp, newChar.stats.mp + Math.floor(teaFinal.maxMp * 0.5));

            const affGain = Math.floor(Math.random() * 4) + 10; // 10 ~ 13
            let respectGain = 0;
            let tensionLoss = 0;

            if (newChar.schoolData?.classmates) {
                newChar.schoolData.classmates = newChar.schoolData.classmates.map(s => {
                    if (s.id === target.id) {
                        const updated = { ...s, affection: Math.min(100, (s.affection || 0) + affGain) };
                        if (s.isRival) {
                            respectGain = 8;
                            tensionLoss = 15;
                            updated.respect = Math.min(100, (s.respect || 0) + respectGain);
                            updated.tension = Math.max(0, (s.tension || 0) - tensionLoss);
                        }
                        return updated;
                    }
                    return s;
                });
            }

            onUpdateCharacter(newChar, `[기숙사 친목] ${target.name}와(과) 향긋한 차를 마시며 진솔한 대화를 나누었습니다. (${target.name} 호감도 +${affGain}, 1일 경과)${systemLogs.length > 0 ? '\n' + systemLogs.slice(0, 1).join('\n') : ''}`);
            setResultData({
                type: 'success',
                title: '🍵 심야 티타임 완료',
                message: `조용한 달빛 아래 ${target.name}와(과) 마주 앉아 서로의 고민과 수련에 대한 진솔한 이야기를 나누었습니다. 한층 더 각별한 사이가 되었습니다.`,
                items: [
                    { label: '대상', after: target.name },
                    { label: '호감도 변화', after: `+${affGain} ♥` },
                    ...(target.isRival ? [
                        { label: '존중도 상승', after: `+${respectGain}` },
                        { label: '긴장도 완화', after: `-${tensionLoss}` }
                    ] : []),
                    { label: '비용', after: `-${cost} Gold` },
                    { label: '소요 시간', after: '1일 경과' }
                ]
            });
            setShowSocialModal(false);
            if (viewingStudent?.id === target.id) {
                setViewingStudent(prev => prev ? ({ ...prev, affection: Math.min(100, prev.affection + affGain) }) : null);
            }
            return;
        }

        // 3) 전략 보드게임 (Board Game)
        if (type === 'boardgame') {
            const targetStudent = target || (school.classmates.length > 0 ? school.classmates[Math.floor(Math.random() * school.classmates.length)] : null);
            const { updatedCharacter, systemLogs } = processTimeSkip(character, 1);
            const newChar = { ...updatedCharacter };

            const affGain = Math.floor(Math.random() * 4) + 6; // 6 ~ 9

            if (newChar.schoolData?.classmates && targetStudent) {
                newChar.schoolData.classmates = newChar.schoolData.classmates.map(s => {
                    if (s.id === targetStudent.id) {
                        return { ...s, affection: Math.min(100, (s.affection || 0) + affGain) };
                    }
                    return s;
                });
            }

            onUpdateCharacter(newChar, `[기숙사 친목] ${targetStudent ? targetStudent.name : '친구들'}와(과) 치열한 전략 보드게임 대결을 펼쳤습니다. (호감도 +${affGain}, 1일 경과)${systemLogs.length > 0 ? '\n' + systemLogs.slice(0, 1).join('\n') : ''}`);
            setResultData({
                type: 'success',
                title: '🎲 전략 보드게임 대국',
                message: `기숙사 라운지에서 반 친구들과 손에 땀을 쥐는 두뇌 싸움을 펼쳤습니다! 지략을 겨루며 서로 즐거운 시간을 보내고 친밀해졌습니다.`,
                items: [
                    { label: '대전 상대', after: targetStudent ? targetStudent.name : '학급 친구들' },
                    { label: '호감도 상승', after: `+${affGain} ♥` },
                    { label: '소요 시간', after: '1일 경과' }
                ]
            });
            setShowSocialModal(false);
            return;
        }

        // 4) 기숙사 합동 청소 (Dorm Cleaning)
        if (type === 'cleaning') {
            const { updatedCharacter, systemLogs } = processTimeSkip(character, 1);
            const newChar = { ...updatedCharacter };

            const affGain = 3;
            if (newChar.schoolData?.classmates) {
                newChar.schoolData.classmates = newChar.schoolData.classmates.map(s => ({
                    ...s,
                    affection: Math.min(100, (s.affection || 0) + affGain)
                }));
            }

            onUpdateCharacter(newChar, `[기숙사 봉사] 반 친구들과 함께 기숙사 구역을 깨끗하게 청소했습니다. (전원 호감도 +3, 1일 경과)${systemLogs.length > 0 ? '\n' + systemLogs.slice(0, 1).join('\n') : ''}`);
            setResultData({
                type: 'success',
                title: '🧹 기숙사 합동 대청소 완료',
                message: '빗자루와 대걸레를 들고 땀 흘려 기숙사 복도와 휴게실을 반짝반짝 닦아냈습니다. 친구들과 함께 일하며 우정을 다졌습니다!',
                items: [
                    { label: '학급 전원 호감도', after: `+${affGain} ♥` },
                    { label: '소요 시간', after: '1일 경과' }
                ]
            });
            setShowSocialModal(false);
            return;
        }

        // 5) 정성 어린 선물 건네기 (Gift)
        if (type === 'gift') {
            if (!target) {
                alert('선물을 건넬 대상을 선택해주세요.');
                return;
            }
            const cost = 50000;
            if ((character.money || 0) < cost) {
                alert(`골드가 부족합니다! (필요: ${cost.toLocaleString()} Gold, 보유: ${(character.money || 0).toLocaleString()} Gold)`);
                return;
            }
            const newChar = JSON.parse(JSON.stringify(character)) as Character;
            newChar.money = Math.max(0, (newChar.money || 0) - cost);

            const affGain = Math.floor(Math.random() * 6) + 15; // 15 ~ 20
            let tensionLoss = 0;

            if (newChar.schoolData?.classmates) {
                newChar.schoolData.classmates = newChar.schoolData.classmates.map(s => {
                    if (s.id === target.id) {
                        const updated = { ...s, affection: Math.min(100, (s.affection || 0) + affGain) };
                        if (s.isRival) {
                            tensionLoss = 20;
                            updated.tension = Math.max(0, (s.tension || 0) - tensionLoss);
                        }
                        return updated;
                    }
                    return s;
                });
            }

            onUpdateCharacter(newChar, `[선물 전달] ${target.name}에게 특별한 고급 간식과 선물을 건넸습니다. (${target.name} 호감도 +${affGain})`);
            setResultData({
                type: 'success',
                title: '🎁 정성 어린 선물 전달 성공',
                message: `${target.name}이(가) 당신의 깜짝 선물을 받고 얼굴을 붉히며 기뻐합니다!\n"이걸 나한테 주는 거야...? 고마워, 소중히 간직할게!"`,
                items: [
                    { label: '선물 대상', after: target.name },
                    { label: '호감도 대폭 상승', after: `+${affGain} ♥` },
                    ...(target.isRival ? [{ label: '라이벌 긴장 완화', after: `-${tensionLoss}` }] : []),
                    { label: '비용 지출', after: `-${cost} Gold` },
                    { label: '소요 시간', after: '즉시 완료 (시간 소모 없음)' }
                ]
            });
            setShowSocialModal(false);
            if (viewingStudent?.id === target.id) {
                setViewingStudent(prev => prev ? ({ ...prev, affection: Math.min(100, prev.affection + affGain) }) : null);
            }
            return;
        }
    };

    const handlePvPSelect = (opponent: SimpleStudent) => {
        const { newChar, log } = SchoolActions.handlePvpAffection(character, opponent);
        // 여기서 신규 날짜가 이미 SchoolActions 내에서 addDays 되어버리므로, 
        // 일관성을 위해 여기서는 수동 시뮬레이션 로그만 추가하거나 로직을 재구성해야 함.
        // 현재는 기존 로직을 최대한 유지함.
        onUpdateCharacter(newChar, log);
        onAction(`[전투 돌입] ${opponent.name} (대련) [1:1 대결]`, 0, newChar); 
        onClose(); 
    };

    const handleTrainingSubmit = (partner?: SimpleStudent) => {
        if (partner) {
            // [NEW] 친밀도 및 라이벌 상태에 따른 수락/거절 판정
            const aff = partner.affection ?? 0;
            let acceptChance = 100;
            let rejectDialogue = '';
            
            if (partner.isRival) {
                const respect = partner.respect || 0;
                const tension = partner.tension || 0;
                if (respect < 40 || tension > 30) {
                    acceptChance = Math.max(15, Math.round(respect * 1.4 - tension * 0.7));
                    rejectDialogue = `"${partner.name}: '흥, 내가 왜 너 따위와 발을 맞춰 훈련해야 하지? 각자 알아서 해라.'"\n\n라이벌의 강한 경계심과 낮은 존중도로 인해 합동 훈련 제안이 거절되었습니다.\n어쩔 수 없이 홀로 개인 훈련으로 전환하여 수련을 진행합니다.`;
                }
            } else if (aff < 30) {
                acceptChance = Math.max(10, Math.round(aff * 2.5)); // 0 호감도: 10%, 10: 25%, 20: 50%
                rejectDialogue = `"${partner.name}: '아직 너랑 단둘이 호흡을 맞추며 훈련할 만큼 친하진 않은 것 같아... 미안하지만 이번엔 각자 하자.'"\n\n상대방과의 친밀도가 낮아 합동 훈련 제안이 거절되었습니다.\n어쩔 수 없이 홀로 개인 훈련으로 전환하여 수련을 진행합니다.`;
            }

            const roll = Math.random() * 100;
            if (roll > acceptChance) {
                // 제안 거절 -> 개인 훈련으로 자동 전환 실행
                const { newChar, result } = SchoolActions.performMonthlyTraining(character, selectedTrainingStat, undefined, currentYearMonth);
                const rejectionResult: ResultData = {
                    type: 'warning',
                    title: '합동 훈련 제안 거절 (개인 훈련 전환)',
                    message: rejectDialogue,
                    items: [
                        { label: '제안 상대', after: `${partner.name}` },
                        { label: '제안 결과', after: `거절됨 (수락 확률 ${acceptChance}%)` },
                        { label: '진행 방식', after: '개인 훈련으로 자동 전환' },
                        ...result.items
                    ]
                };
                onUpdateCharacter(newChar, `[학교 훈련] ${partner.name}에게 합동 훈련을 제안했으나 친밀도 부족으로 거절당해 홀로 개인 훈련을 마쳤습니다.`);
                setResultData(rejectionResult);
                setShowTrainingPicker(false);
                return;
            }
        }

        const { newChar, result } = SchoolActions.performMonthlyTraining(character, selectedTrainingStat, partner, currentYearMonth);
        onUpdateCharacter(newChar, `[학교 훈련] 한 달에 한 번인 정기 훈련을 완료했습니다.`);
        setResultData(result);
        setShowTrainingPicker(false);
    };

    const handleExam = (type: 'midterm' | 'final') => {
        if (isExamTakenThisMonth) { alert("이번 달에는 이미 시험을 치렀습니다."); return; }
        onClose();
        let prompt = ""; let examName = type === 'midterm' ? "중간고사" : "학말고사";
        if (school.tier === 'Elementary') prompt = `[시험] ${school.tier} ${examName}: 간단한 훈련용 몬스터 (Lv.3)`;
        else if (school.tier === 'Middle') prompt = `[시험] ${school.tier} ${examName}: 강화된 훈련용 몬스터 (Lv.10)`;
        else if (school.tier === 'High') prompt = type === 'midterm' ? `[시험] ${school.tier} ${examName}: 강력한 훈련용 몬스터 (Lv.20)` : `[시험] ${school.tier} ${examName}: 학교 랭킹전 토너먼트 (결승)`;
        onAction(prompt);
    };


  const handleOpenTournament = () => {
        if (!activeTournamentDef) return;
        
        if (activeTournamentKey === 'high_national') {
            const schoolBest = school.tournamentHistory?.schoolPlacement || 32;
            if (schoolBest > 4) {
                alert(`참가 자격 미달입니다.\n조건: 교내 토너먼트 4강 이상 진출\n현재 기록: ${schoolBest === 32 ? '기록 없음' : `${schoolBest}강`}`);
                return;
            }
        }
        
        if (activeTournamentKey === 'high_world') {
            const nationalBest = school.tournamentHistory?.nationalPlacement || 64;
            if (nationalBest > 2) {
                alert(`참가 자격 미달입니다.\n조건: 국가 대항전 결승 진출\n현재 기록: ${nationalBest === 64 ? '기록 없음' : `${nationalBest}강`}`);
                return;
            }
        }

        if (!school.currentTournament || school.currentTournament.key !== activeTournamentKey) {
             const newChar = { ...character };
             const schoolNation = school.schoolLocation?.nation || character.currentLocation?.nation || character.nation || "대한민국";
             const bracketData = generateTournamentBracket(schoolNation, activeTournamentDef.rounds, character.name, activeTournamentDef.scope as any);
             const newTournament: TournamentState = { isActive: true, name: activeTournamentDef.label, key: activeTournamentKey, currentRound: activeTournamentDef.rounds, maxRound: activeTournamentDef.rounds, reward: { exp: activeTournamentDef.exp, gold: activeTournamentDef.gold }, bracket: bracketData.matches, opponentName: bracketData.opponentName };
             if (newChar.schoolData) newChar.schoolData.currentTournament = newTournament;
             onUpdateCharacter(newChar, ""); 
        }
        setShowTournament(true);
    };

    const handleTournamentMatch = () => {
        const tState = school.currentTournament; if (!tState) return;
        onClose(); setShowTournament(false);
        const roundTitle = tState.currentRound === 2 ? '결승전' : `${tState.currentRound}강전`;
        const oppName = tState.opponentName || `토너먼트 ${roundTitle} 상대`;
        onAction(`[토너먼트] ${tState.name} ${roundTitle} (ID: ${tState.key}) 상대: ${oppName}`);
    };

    const handleCombatDemo = () => {
        if (!instructorQuest || !lectureStatGains) return;
        
        // 시범 전투 돌입 (훈련용 몬스터)
        let monsterLevel = 5;
        if (instructorQuest.schoolTier === '중급') monsterLevel = 15;
        if (instructorQuest.schoolTier === '고급') monsterLevel = 30;

        const newChar = { ...character };
        
        // [MODIFIED] 전투 후 퀘스트 완료 처리를 위해 펜딩 상태로 저장
        // 실제 보상과 스탯 상승은 전투 승리 후 App.tsx에서 처리됨
        newChar.pendingSchoolQuest = {
            questId: instructorQuest.id,
            schoolName: school.schoolName,
            tier: instructorQuest.schoolTier || '초급',
            rewards: { 
                gold: instructorQuest.rewardGold || 0, 
                exp: instructorQuest.rewardExp || 0 
            },
            statGains: lectureStatGains,
            studentsToTeach: instructorQuest.studentsToTeach
        };

        setPendingCombatDemo(false);
        setLectureStatGains(null);
        
        // 캐릭터 상태 업데이트 (pendingSchoolQuest 주입)
        onUpdateCharacter(newChar, `[시범 전투] ${school.schoolName} 강의 시범 전투를 시작합니다.`);
        onClose();
        
        const enemy = {
            id: `demo_monster_${Date.now()}`,
            name: `[훈련용 마물] ${school.schoolName}`,
            level: monsterLevel,
            hp: monsterLevel * 500,
            maxHp: monsterLevel * 500,
            stats: {
                str: monsterLevel * 20,
                int: monsterLevel * 20,
                def: monsterLevel * 20,
                agi: monsterLevel * 20,
                ctrl: monsterLevel * 20,
                hp: monsterLevel * 500,
                mp: monsterLevel * 10
            },
            statusEffects: [],
            description: '강의 시범을 위해 준비된 훈련용 마물입니다.'
        };

        if (onBattle) {
            onBattle(enemy, 'school_demo');
        } else {
            onAction(`[시범 전투] ${school.schoolName} (Lv.${monsterLevel} 훈련용 마물)`, 0, newChar);
        }
    };

    interface LeaderboardItem {
        id: string;
        isPlayer: boolean;
        name: string;
        visualUrl?: string;
        level: number;
        gender: string;
        nation: string;
        personality: string;
        stats: Partial<Stats>;
        totalScore: number;
        writtenScore: number;
        practicalScore: number;
        primaryStat: string;
        affection?: number;
        isRival?: boolean;
        respect?: number;
        tension?: number;
        studentRef?: SimpleStudent;
        rank: number;
    }

    const getRankingData = (): LeaderboardItem[] => {
        const list: LeaderboardItem[] = [];

        // Player Score Calculation
        const pStr = character.stats.str || 10;
        const pInt = character.stats.int || 10;
        const pDef = character.stats.def || 10;
        const pAgi = character.stats.agi || 10;
        const pWis = character.stats.wis || 10;
        const pCtrl = character.stats.ctrl || 10;
        const pLvl = character.level || 1;

        const pWritten = Math.floor((pInt + pWis) * 1.5 + pLvl * 3);
        const pPractical = Math.floor((pStr + pDef + pAgi + pCtrl) * 1.0 + pLvl * 3);
        const pTotal = pWritten + pPractical;

        const pStatArr = [
            { label: 'STR (근력)', val: pStr },
            { label: 'INT (지력)', val: pInt },
            { label: 'DEF (체력)', val: pDef },
            { label: 'AGI (민첩)', val: pAgi },
            { label: 'WIS (지혜)', val: pWis },
            { label: 'CTRL (제어)', val: pCtrl }
        ].sort((a, b) => b.val - a.val);

        list.push({
            id: 'player_me',
            isPlayer: true,
            name: character.name,
            visualUrl: character.visualUrl,
            level: pLvl,
            gender: character.gender,
            nation: character.nation,
            personality: character.personality || '진취적',
            stats: character.stats,
            totalScore: pTotal,
            writtenScore: pWritten,
            practicalScore: pPractical,
            primaryStat: pStatArr[0].label,
            affection: 100,
            rank: 0,
        });

        // Classmates Score Calculation
        (school.classmates || []).forEach((s: SimpleStudent) => {
            const sStr = s.stats.str || 10;
            const sInt = s.stats.int || 10;
            const sDef = s.stats.def || 10;
            const sAgi = s.stats.agi || 10;
            const sWis = s.stats.wis || 10;
            const sCtrl = s.stats.ctrl || 10;
            const sLvl = s.level || 1;

            const sWritten = Math.floor((sInt + sWis) * 1.5 + sLvl * 3);
            const sPractical = Math.floor((sStr + sDef + sAgi + sCtrl) * 1.0 + sLvl * 3);
            const sTotal = sWritten + sPractical;

            const sStatArr = [
                { label: 'STR (근력)', val: sStr },
                { label: 'INT (지력)', val: sInt },
                { label: 'DEF (체력)', val: sDef },
                { label: 'AGI (민첩)', val: sAgi },
                { label: 'WIS (지혜)', val: sWis },
                { label: 'CTRL (제어)', val: sCtrl }
            ].sort((a, b) => b.val - a.val);

            list.push({
                id: s.id,
                isPlayer: false,
                name: s.name,
                visualUrl: s.visualUrl || generateDefaultVisualUrl(s.name, s.nation || '아시아', s.race || '인간', s.gender || '남성'),
                level: sLvl,
                gender: s.gender,
                nation: s.nation,
                personality: s.personality,
                stats: s.stats,
                totalScore: sTotal,
                writtenScore: sWritten,
                practicalScore: sPractical,
                primaryStat: sStatArr[0].label,
                affection: s.affection,
                isRival: s.isRival,
                respect: s.respect,
                tension: s.tension,
                studentRef: s,
                rank: 0,
            });
        });

        list.sort((a, b) => b.totalScore - a.totalScore);
        list.forEach((item, idx) => {
            item.rank = idx + 1;
        });

        return list;
    };

    const getClassRank = () => {
        const rankingList = getRankingData();
        const playerEntry = rankingList.find(item => item.isPlayer);
        return playerEntry ? playerEntry.rank : 1;
    };

    const getSchoolTopRankers = (): LeaderboardItem[] => {
        const classList = getRankingData();
        const combined = [...classList];

        otherClassmates.forEach(s => {
            if (!combined.some(c => c.id === s.id)) {
                const sStr = s.stats.str || 10;
                const sInt = s.stats.int || 10;
                const sDef = s.stats.def || 10;
                const sAgi = s.stats.agi || 10;
                const sWis = s.stats.wis || 10;
                const sCtrl = s.stats.ctrl || 10;
                const sLvl = s.level || 1;
                const sWritten = Math.floor((sInt + sWis) * 1.5 + sLvl * 3);
                const sPractical = Math.floor((sStr + sDef + sAgi + sCtrl) * 1.0 + sLvl * 3);
                const sTotal = sWritten + sPractical;
                const sStatArr = [
                    { label: 'STR (근력)', val: sStr },
                    { label: 'INT (지력)', val: sInt },
                    { label: 'DEF (체력)', val: sDef },
                    { label: 'AGI (민첩)', val: sAgi },
                    { label: 'WIS (지혜)', val: sWis },
                    { label: 'CTRL (제어)', val: sCtrl }
                ].sort((a, b) => b.val - a.val);

                combined.push({
                    id: s.id,
                    isPlayer: false,
                    name: s.name,
                    visualUrl: s.visualUrl || generateDefaultVisualUrl(s.name, s.nation || '아시아', s.race || '인간', s.gender || '남성'),
                    level: sLvl,
                    gender: s.gender,
                    nation: s.nation,
                    personality: s.personality,
                    stats: s.stats,
                    totalScore: sTotal,
                    writtenScore: sWritten,
                    practicalScore: sPractical,
                    primaryStat: sStatArr[0].label,
                    affection: s.affection,
                    isRival: s.isRival,
                    studentRef: s,
                    rank: 0,
                });
            }
        });

        if (combined.length < 10) {
            const baseLevel = (school.grade || 1) * 6 + 6;
            const schoolNations = ['아시아', '유럽', '아메리카', '중동', '아프리카'];
            const classNames = ['2반 수석', '3반 수석', '4반 수석', '5반 수석', '특기생'];
            for (let i = combined.length; i < 10; i++) {
                const cName = classNames[i % classNames.length];
                const nat = schoolNations[i % schoolNations.length];
                const lvl = baseLevel + Math.floor(Math.sin(i * 1.5) * 3);
                const virtScore = Math.floor((lvl * 18) + 130 + ((10 - i) * 10));
                combined.push({
                    id: `virtual_elite_${i}`,
                    isPlayer: false,
                    name: `${cName} [${(i % 5) + 2}반]`,
                    visualUrl: generateDefaultVisualUrl(`Elite_${i}`, nat, '인간', i % 2 === 0 ? '남성' : '여성'),
                    level: lvl,
                    gender: i % 2 === 0 ? '남성' : '여성',
                    nation: nat,
                    personality: '모범적',
                    stats: generateCompanionStats(lvl),
                    totalScore: virtScore,
                    writtenScore: Math.floor(virtScore * 0.45),
                    practicalScore: Math.floor(virtScore * 0.55),
                    primaryStat: i % 2 === 0 ? 'INT (지력)' : 'STR (근력)',
                    rank: 0
                });
            }
        }

        combined.sort((a, b) => b.totalScore - a.totalScore);
        return combined.slice(0, 10).map((item, idx) => ({ ...item, rank: idx + 1 }));
    };

    const handleStartInstructorQuest = () => {
        if (!instructorQuest || !instructorQuest.studentsToTeach) return;
        const progress = getInstructorQuestProgress(instructorQuest, character.currentDate);
        if (progress.isExpired) {
            setResultData({
                type: 'warning',
                title: '의뢰 기한 만료',
                message: '의뢰 수락 후 한 달(30일)이 지나 기한이 만료되었습니다. 학교와의 파견 계약 기간이 종료되었습니다.',
                items: [{ label: '경과 일수', after: `${progress.daysElapsed}일 / 30일` }]
            });
            return;
        }
        if (!progress.canStartLecture) {
            setResultData({
                type: 'warning',
                title: '강의 진행 불가',
                message: '퀘스트 시작 3주차부터 본격적인 강의를 시작할 수 있습니다.\n현재는 학생들과 교류하며 개별 조언과 훈련 지도를 진행하는 기간입니다.',
                items: [
                    { label: '현재 진행', after: `${progress.daysElapsed}일차 (${progress.currentWeek}주차)` },
                    { label: '강의 해금까지', after: `${progress.daysRemainingToUnlock}일 남음` }
                ]
            });
            return;
        }
        setIsLecturing(true);
    };

    const handleStudentInteraction = (studentId: string, type: 'Advice' | 'Praise' | 'Scold') => {
        let targetStudent = (school.classmates || []).find((s: SimpleStudent) => s.id === studentId);
        if (!targetStudent && instructorQuest?.studentsToTeach) {
            targetStudent = instructorQuest.studentsToTeach.find((s: SimpleStudent) => s.id === studentId);
        }
        if (!targetStudent && character.socialNetwork) {
            targetStudent = character.socialNetwork.find(s => s.id === studentId) as SimpleStudent;
        }
        if (!targetStudent) return;

        if (type === 'Advice' || type === 'Praise') {
            const cd = getMentoringCooldown(targetStudent, character.currentDate);
            if (!cd.canMentor) {
                setResultData({
                    type: 'warning',
                    title: '지도 주기 제한',
                    message: `${targetStudent.name} 학생에게는 7일에 한 번만 조언 및 칭찬이 가능합니다.\n스스로 훈련하고 깨우칠 시간을 준 뒤 다시 지도해주세요.`,
                    items: [{ label: '다음 지도 가능까지', after: `${cd.daysRemaining}일 남음` }]
                });
                return;
            }
        }

        setMentoringTargetStudent(targetStudent);
        setMentoringMode(type === 'Advice' ? 'advice' : type === 'Praise' ? 'praise' : 'scold');
    };

    const handleApplyMentoringResult = (result: InteractionFeedbackResult) => {
        const newChar = applyStudentUpdateToCharacter(character, result.student, instructorQuest?.id);
        onUpdateCharacter(newChar, `[교관 지도] ${result.student.name} 학생 지도: ${result.summary}`);
    };

    const handleCompleteLecture = (questId: string, statGains: Partial<Stats>) => {
        try {
            // [NEW] 임시 교관 퀘스트인 경우 시범 전투 단계로 전환
            if (instructorQuest) {
                setLectureStatGains(statGains);
                setPendingCombatDemo(true);
                setIsLecturing(false);
                return;
            }

            const newChar = { ...character };
            const totalGain = Object.values(statGains).reduce((a, b) => (a || 0) + (b || 0), 0);
            let logMsg = `강의를 성공적으로 마쳤습니다. (총 성장 기여도: ${totalGain})`;
            
            // [NEW] 학생들에게 스탯 영향 및 인연 등록
            const students = school.classmates && school.classmates.length > 0 ? [...school.classmates] : generateClassmates(character.nation, 5);
            
            // Ensure socialNetwork is initialized and cloned
            const currentNetwork = character.socialNetwork || [];
            newChar.socialNetwork = [...currentNetwork];

            students.forEach(student => {
                if (student.stats) {
                    Object.entries(statGains).forEach(([key, val]) => {
                        const k = key as keyof Stats;
                        if (typeof student.stats[k] === 'number') {
                            (student.stats[k] as number) += (val || 0);
                        } else {
                            (student.stats[k] as number) = (val || 0);
                        }
                    });
                }
                
                // 과거 인연으로 등록 (socialNetwork에 저장)
                const existingInNetworkIdx = newChar.socialNetwork?.findIndex(n => n.id === student.id);
                const affectionGain = 5 + (totalGain * 2);

                if (existingInNetworkIdx === -1 || existingInNetworkIdx === undefined) {
                    const newNpc: SimpleStudent = {
                        ...student,
                        age:student.age,
                        birthYear: student.birthYear,
                        isPastConnection: true,
                        affection: 10 + affectionGain,
                        metYear: getYear(character.currentDate || '2000-01-01')
                    };
                    newChar.socialNetwork?.push(newNpc);
                } else {
                    const existing = { ...newChar.socialNetwork![existingInNetworkIdx] };
                    existing.affection = Math.min(100, (existing.affection || 0) + affectionGain);
                    existing.isPastConnection = true;
                    if (student.stats) {
                        existing.stats = { ...existing.stats, ...student.stats };
                    }
                    newChar.socialNetwork![existingInNetworkIdx] = existing;
                }
            });

            // 만약 플레이어가 학생이라면 학급 친구들 데이터도 업데이트
            if (newChar.schoolData?.classmates) {
                newChar.schoolData = {
                    ...newChar.schoolData,
                    classmates: newChar.schoolData.classmates.map(c => {
                        const updated = students.find(s => s.id === c.id);
                        return updated ? { ...c, ...updated } : c;
                    })
                };
            }

            logMsg += `\n학생들의 능력치가 상승하고, 새로운 인연이 등록되었습니다.`;

            // 퀘스트 완료 처리 (용병 데이터)
            if (newChar.mercenaryData?.activeQuests) {
                const questIdx = newChar.mercenaryData.activeQuests.findIndex(q => q.id === questId);
                if (questIdx !== -1) {
                    const quest = newChar.mercenaryData.activeQuests[questIdx];
                    const updatedQuests = [...newChar.mercenaryData.activeQuests];
                    updatedQuests.splice(questIdx, 1);
                    
                    newChar.mercenaryData = {
                        ...newChar.mercenaryData,
                        activeQuests: updatedQuests,
                        completedQuests: (newChar.mercenaryData.completedQuests || 0) + 1
                    };
                    
                    newChar.money = (newChar.money || 0) + (quest.rewardGold || 0);
                    newChar.currentExp = (newChar.currentExp || 0) + (quest.rewardExp || 0);
                    logMsg += `\n보상으로 ${quest.rewardGold || 0}골드와 ${quest.rewardExp || 0}경험치를 획득했습니다.`;
                }
            }

            // 퀘스트 완료 처리 (군인 데이터)
            if (newChar.militaryData?.activeMissions) {
                const missionIdx = newChar.militaryData.activeMissions.findIndex(q => q.id === questId);
                if (missionIdx !== -1) {
                    const mission = newChar.militaryData.activeMissions[missionIdx];
                    const updatedMissions = [...newChar.militaryData.activeMissions];
                    updatedMissions.splice(missionIdx, 1);
                    
                    newChar.militaryData = {
                        ...newChar.militaryData,
                        activeMissions: updatedMissions,
                        completedMissions: (newChar.militaryData.completedMissions || 0) + 1,
                        merit: (newChar.militaryData.merit || 0) + (mission.rewardMerit || 0)
                    };
                    
                    newChar.money = (newChar.money || 0) + (mission.rewardGold || 0);
                    newChar.currentExp = (newChar.currentExp || 0) + (mission.rewardExp || 0);
                    logMsg += `\n보상으로 ${mission.rewardGold || 0}골드, ${mission.rewardExp || 0}경험치, ${mission.rewardMerit || 0}공헌도를 획득했습니다.`;
                }
            }
            
            setIsLecturing(false);
            onUpdateCharacter(newChar, logMsg);
        } catch (err) {
            console.error("handleCompleteLecture failed:", err);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md p-2 sm:p-4 animate-in fade-in zoom-in-95">
            {resultData && <ActionResultModal data={resultData} onClose={() => setResultData(null)} />}
            
            {isLecturing && instructorQuest && (
                <LectureModal
                    instructorQuest={instructorQuest}
                    onComplete={handleCompleteLecture}
                    onClose={() => setIsLecturing(false)}
                />
            )}

            {/* [NEW] 학생 상세 정보 모달 */}
            {selectedDetailStudent && (
                <StudentDetailModal
                    student={selectedDetailStudent}
                    currentDate={character.currentDate}
                    onClose={() => setSelectedDetailStudent(null)}
                    onOpenAdvice={(student) => {
                        setSelectedDetailStudent(null);
                        setMentoringTargetStudent(student);
                        setMentoringMode('advice');
                    }}
                    onOpenPraise={(student) => {
                        setSelectedDetailStudent(null);
                        setMentoringTargetStudent(student);
                        setMentoringMode('praise');
                    }}
                    onOpenScold={(student) => {
                        setSelectedDetailStudent(null);
                        setMentoringTargetStudent(student);
                        setMentoringMode('scold');
                    }}
                />
            )}

            {/* [NEW] 학생 조언/칭찬/훈계 대화형 상호작용 모달 */}
            {mentoringTargetStudent && (
                <StudentAdviceModal
                    student={mentoringTargetStudent}
                    initialMode={mentoringMode}
                    currentDate={character.currentDate}
                    onClose={() => setMentoringTargetStudent(null)}
                    onApplyResult={handleApplyMentoringResult}
                />
            )}

            {/* [NEW] 시범 전투 모달 */}
            {pendingCombatDemo && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-amber-500/50 rounded-2xl max-w-md w-full p-6 shadow-2xl shadow-amber-500/20">
                        <div className="flex items-center text-amber-400 mb-4">
                            <Sword size={24} className="mr-2"/>
                            <h3 className="text-xl font-bold">시범 전투 단계</h3>
                        </div>
                        <p className="text-slate-300 mb-6">
                            강의가 끝났습니다! 이제 학생들 앞에서 직접 <span className="text-amber-400 font-bold">훈련용 마물</span>을 상대하며 실전 시범을 보여야 합니다.
                        </p>
                        <div className="flex gap-3">
                            <button 
                                onClick={handleCombatDemo}
                                className="flex-1 py-3 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-amber-900/20"
                            >
                                시범 전투 시작
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* [NEW] 학생 명단 모달 */}
            {showRoster && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-2xl w-full max-h-[80vh] flex flex-col shadow-2xl overflow-hidden">
                        <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-800/50">
                            <div className="flex items-center">
                                <Users size={24} className="text-cyan-400 mr-2"/>
                                <h3 className="text-xl font-bold text-slate-100">학생 명단 ({school.schoolName})</h3>
                            </div>
                            <button onClick={() => setShowRoster(false)} className="p-2 hover:bg-slate-700 rounded-full text-slate-400 transition-colors">
                                <X size={20}/>
                            </button>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {school.classmates.length > 0 ? (
                                    school.classmates.map((student: SimpleStudent) => (
                                        <div key={student.id} className="bg-slate-800/50 border border-slate-700 rounded-2xl p-4 flex items-center gap-4 hover:border-cyan-500/50 transition-all group">
                                            <div className="w-12 h-12 rounded-full bg-slate-700 overflow-hidden border border-slate-600">
                                                <img src={student.visualUrl} alt={student.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-center justify-between">
                                                    <span className="font-bold text-slate-200">{student.name}</span>
                                                    <span className="text-[10px] px-2 py-0.5 bg-slate-700 rounded-full text-slate-400">Lv.{student.level}</span>
                                                </div>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className="text-xs text-slate-500">{student.personality}</span>
                                                    <span className="text-[10px] text-cyan-500">{student.nation}</span>
                                                </div>
                                                <div className="mt-2 flex items-center gap-3">
                                                    <div className="flex items-center text-[10px] text-pink-400">
                                                        <Heart size={10} className="mr-1"/> {student.affection}
                                                    </div>
                                                    {student.isRival && (
                                                        <span className="text-[10px] text-red-400 font-bold flex items-center">
                                                            <Target size={10} className="mr-1"/> 라이벌
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <button 
                                                onClick={() => { setViewingStudent(student); setShowRoster(false); }}
                                                className="p-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-slate-400 opacity-0 group-hover:opacity-100 transition-all"
                                            >
                                                <Eye size={16}/>
                                            </button>
                                        </div>
                                    ))
                                ) : (
                                    <div className="col-span-full py-12 text-center text-slate-500">
                                        등록된 학생이 없습니다.
                                    </div>
                                )}
                            </div>
                        </div>
                        
                        <div className="p-4 border-t border-slate-800 bg-slate-800/30 text-center">
                            <p className="text-xs text-slate-500">학생들과 대화하거나 함께 훈련하여 인연을 깊게 만들 수 있습니다.</p>
                        </div>
                    </div>
                </div>
            )}
            
            {/* [NEW] Training Picker Overlay */}
            {showTrainingPicker && (
                <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/90 p-2 sm:p-4 animate-in fade-in">
                    <div className="bg-slate-900 border border-amber-500 rounded-2xl sm:rounded-3xl p-4 sm:p-6 max-w-2xl w-full shadow-2xl relative flex flex-col max-h-[88vh] h-full sm:h-[75vh]">
                        <div className="flex justify-between items-center mb-3 sm:mb-5">
                            <h3 className="text-base sm:text-xl font-bold text-amber-400 flex items-center"><Dumbbell size={22} className="mr-2"/> 월간 특별 훈련</h3>
                            <button onClick={() => setShowTrainingPicker(false)} className="text-slate-500 hover:text-white p-1"><X size={22}/></button>
                        </div>
                        
                        <div className="flex gap-2 sm:gap-4 mb-3 sm:mb-5">
                            <button 
                                onClick={() => setTrainingMode('Solo')}
                                className={`flex-1 py-2.5 sm:py-3 rounded-xl border text-xs sm:text-sm font-bold transition-all ${trainingMode === 'Solo' ? 'bg-amber-700 text-white border-amber-500 shadow-lg' : 'bg-slate-950 text-slate-500 border-slate-800'}`}
                            >
                                개인 훈련 (+1)
                            </button>
                            <button 
                                onClick={() => setTrainingMode('Joint')}
                                className={`flex-1 py-2.5 sm:py-3 rounded-xl border text-xs sm:text-sm font-bold transition-all ${trainingMode === 'Joint' ? 'bg-indigo-700 text-white border-indigo-500 shadow-lg' : 'bg-slate-950 text-slate-500 border-slate-800'}`}
                            >
                                합동 훈련 (+1, 호감도+5)
                            </button>
                        </div>

                        <div className="mb-4">
                            <label className="text-[10px] sm:text-xs text-slate-500 font-bold uppercase mb-2 block">단련할 능력치 선택</label>
                            <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 sm:gap-2">
                                {[
                                    { k: 'str', l: '힘 (STR)', i: Sword }, { k: 'int', l: '지력 (INT)', i: Brain }, { k: 'def', l: '체력 (DEF)', i: Shield },
                                    { k: 'agi', l: '민첩 (AGI)', i: Activity }, { k: 'wis', l: '지혜 (WIS)', i: BookOpen }, { k: 'ctrl', l: '제어 (CTRL)', i: User }
                                ].map(s => (
                                    <button 
                                        key={s.k} 
                                        onClick={() => setSelectedTrainingStat(s.k as any)}
                                        className={`p-2 rounded-lg border flex flex-col items-center justify-center gap-1 transition-all ${selectedTrainingStat === s.k ? 'bg-amber-950/50 border-amber-500 text-amber-400 shadow-sm' : 'bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-700'}`}
                                    >
                                        <s.i size={16}/>
                                        <span className="text-[10px] sm:text-xs font-bold">{s.l.split(' ')[0]}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-1">
                            {trainingMode === 'Solo' ? (
                                <div className="h-full min-h-[160px] flex flex-col items-center justify-center text-center p-4 sm:p-6 bg-slate-950 rounded-2xl border border-slate-800">
                                    <User size={40} className="text-amber-500 mb-3 opacity-50"/>
                                    <h4 className="text-sm sm:text-base font-bold text-white mb-1">고독한 수련</h4>
                                    <p className="text-xs text-slate-400 max-w-sm">누구의 방해도 받지 않고 오직 자신과의 싸움에 집중하여 선택한 능력치를 안정적으로 1 상승시킵니다.</p>
                                    <button onClick={() => handleTrainingSubmit()} className="mt-5 px-8 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-bold text-xs sm:text-sm shadow-lg active:scale-95 transition-all">훈련 개시 (100% 확정)</button>
                                </div>
                            ) : (
                                <>
                                    <div className="p-2.5 bg-amber-950/30 border border-amber-500/30 rounded-xl mb-2 flex items-start gap-2 text-[11px] sm:text-xs text-amber-300">
                                        <AlertTriangle size={15} className="shrink-0 mt-0.5 text-amber-400" />
                                        <div>
                                            <span className="font-bold">합동 훈련 주의:</span> 호감도가 낮거나(30 미만) 라이벌 경계 상태인 급우에게 제안 시 <span className="text-amber-200 font-bold underline">제안을 거절당할 수 있으며</span>, 거절당할 경우 홀로 개인 훈련을 수행합니다.
                                        </div>
                                    </div>
                                    <div className="text-[10px] text-slate-400 font-bold uppercase mb-1 px-1">함께할 급우 선택</div>
                                    {[...school.classmates, ...otherClassmates].map((student, idx) => {
                                        const aff = student.affection ?? 0;
                                        let acceptChance = 100;
                                        let chanceBadge = { text: '수락 100%', bg: 'bg-emerald-950/70 border-emerald-800 text-emerald-300' };
                                        
                                        if (student.isRival) {
                                            const respect = student.respect || 0;
                                            const tension = student.tension || 0;
                                            if (respect < 40 || tension > 30) {
                                                acceptChance = Math.max(15, Math.round(respect * 1.4 - tension * 0.7));
                                                chanceBadge = { text: `경계 중 (${acceptChance}% 수락)`, bg: 'bg-rose-950/80 border-rose-800 text-rose-300' };
                                            }
                                        } else if (aff < 30) {
                                            acceptChance = Math.max(10, Math.round(aff * 2.5));
                                            chanceBadge = { text: `친밀도 낮음 (${acceptChance}% 수락)`, bg: 'bg-amber-950/80 border-amber-800 text-amber-300' };
                                        }

                                        return (
                                            <button 
                                                key={idx} 
                                                onClick={() => handleTrainingSubmit(student)}
                                                className="w-full p-2.5 sm:p-3 bg-slate-950 hover:bg-indigo-950/40 border border-slate-800 hover:border-indigo-500/80 rounded-xl transition-all flex justify-between items-center group text-left"
                                            >
                                                <div className="flex items-center min-w-0 pr-2">
                                                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-slate-800 border border-slate-700 overflow-hidden mr-2.5 shrink-0">
                                                        <img src={student.visualUrl || generateDefaultVisualUrl(student.name, student.nation, student.race, student.gender)} alt={student.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                                    </div>
                                                    <div className="truncate">
                                                        <div className="text-xs sm:text-sm font-bold text-slate-200 flex items-center gap-1.5 truncate">
                                                            <span className="truncate">{student.name}</span>
                                                            <span className="text-[10px] text-slate-500 font-normal shrink-0">Lv.{student.level}</span>
                                                            {student.isRival && <span className="text-[8px] text-red-400 bg-red-950 border border-red-900 px-1 rounded shrink-0">RIVAL</span>}
                                                        </div>
                                                        <div className="flex items-center gap-2 text-[10px] mt-0.5">
                                                            <span className="text-pink-400 font-medium">호감도 {student.affection} ♥</span>
                                                            <span className={`px-1.5 py-0.2 rounded border text-[9px] ${chanceBadge.bg}`}>{chanceBadge.text}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="text-right shrink-0">
                                                    <div className="text-[9px] text-slate-500">깨달음 보너스</div>
                                                    <div className="text-xs sm:text-sm font-bold text-emerald-400">+{(student.affection / 2).toFixed(1)}%</div>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* [NEW] Dormitory Social Activities Modal Overlay */}
            {showSocialModal && (
                <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/90 p-2 sm:p-4 animate-in fade-in">
                    <div className="bg-slate-900 border border-pink-500/70 rounded-2xl sm:rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-[0_0_50px_rgba(244,114,182,0.15)] overflow-hidden">
                        {/* Header */}
                        <div className="p-4 sm:p-5 border-b border-slate-800 bg-gradient-to-r from-slate-950 via-pink-950/25 to-slate-950 flex justify-between items-center shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-pink-500/20 border border-pink-500/40 rounded-xl text-pink-400">
                                    <PartyPopper size={22} />
                                </div>
                                <div>
                                    <h3 className="text-base sm:text-xl font-bold text-slate-100 flex items-center gap-2">
                                        기숙사 친목 및 교류 활동
                                    </h3>
                                    <p className="text-[11px] sm:text-xs text-slate-400">
                                        급우들과 다채로운 교류를 통해 호감도와 유대감을 쌓으세요. (보유 골드: <span className="text-amber-400 font-bold">{character.money || 0} Gold</span>)
                                    </p>
                                </div>
                            </div>
                            <button 
                                onClick={() => { setShowSocialModal(false); setSocialActivityType(null); setSelectedSocialTarget(null); }}
                                className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Content Area */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-3 sm:p-5 space-y-3">
                            {/* If Sub-selection for Tea or Gift is active */}
                            {socialActivityType === 'tea' || socialActivityType === 'gift' ? (
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between bg-slate-950 p-3 rounded-xl border border-slate-800">
                                        <div className="flex items-center gap-2">
                                            {socialActivityType === 'tea' ? <Coffee className="text-amber-400" size={20}/> : <Gift className="text-pink-400" size={20}/>}
                                            <span className="text-sm font-bold text-slate-200">
                                                {socialActivityType === 'tea' ? '🍵 심야 티타임 대상 선택 (10000 Gold)' : '🎁 선물 전달 대상 선택 (50000 Gold)'}
                                            </span>
                                        </div>
                                        <button 
                                            onClick={() => setSocialActivityType(null)}
                                            className="text-xs text-slate-400 hover:text-white underline"
                                        >
                                            뒤로가기
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        {school.classmates.map((student, idx) => (
                                            <div 
                                                key={idx}
                                                className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between gap-2 hover:border-pink-500/50 transition-all"
                                            >
                                                <div className="flex items-center gap-2.5 min-w-0">
                                                    <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 overflow-hidden shrink-0">
                                                        <img src={student.visualUrl || generateDefaultVisualUrl(student.name, student.nation, student.race, student.gender)} alt={student.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                                    </div>
                                                    <div className="truncate">
                                                        <div className="text-xs font-bold text-slate-200 truncate flex items-center gap-1">
                                                            {student.name}
                                                            {student.isRival && <span className="text-[8px] bg-red-950 text-red-400 border border-red-900 px-1 rounded">RIVAL</span>}
                                                        </div>
                                                        <div className="text-[10px] text-pink-400">호감도 {student.affection} ♥</div>
                                                    </div>
                                                </div>
                                                <button 
                                                    onClick={() => handleSocialActivity(socialActivityType, student)}
                                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold shrink-0 transition-all active:scale-95 shadow ${socialActivityType === 'tea' ? 'bg-amber-600 hover:bg-amber-500 text-white' : 'bg-pink-600 hover:bg-pink-500 text-white'}`}
                                                >
                                                    {socialActivityType === 'tea' ? '초대 (100G)' : '선물 (500G)'}
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                /* Main Activity List */
                                <div className="space-y-3">
                                    {/* 1. 야식 파티 */}
                                    <div className="p-3.5 sm:p-4 bg-slate-950/80 border border-slate-800 hover:border-amber-500/40 rounded-xl transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                                        <div className="flex items-start gap-3">
                                            <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-400 shrink-0 mt-0.5">
                                                <Utensils size={20} />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <h4 className="text-sm sm:text-base font-bold text-slate-100">🍕 기숙사 야식 파티</h4>
                                                    <span className="text-[10px] bg-amber-950 text-amber-300 border border-amber-800 px-1.5 py-0.5 rounded font-mono font-bold">30,000 Gold</span>
                                                </div>
                                                <p className="text-xs text-slate-400 mt-1">
                                                    치킨과 피자를 주문해 기숙사 휴게실에서 반 친구들과 성대한 야식 파티를 엽니다.
                                                </p>
                                                <div className="flex flex-wrap items-center gap-2 mt-2 text-[10px]">
                                                    <span className="text-pink-400 font-bold bg-pink-950/40 border border-pink-900/50 px-1.5 py-0.5 rounded">학급 전원 호감도 +5~7 ♥</span>
                                                    <span className="text-emerald-400 bg-emerald-950/40 border border-emerald-900/50 px-1.5 py-0.5 rounded">HP/MP 완전 회복</span>
                                                    <span className="text-slate-400">1일 경과</span>
                                                </div>
                                            </div>
                                        </div>
                                        <button 
                                            onClick={() => handleSocialActivity('party')}
                                            disabled={(character.money || 0) < 30000}
                                            className={`w-full sm:w-auto px-4 py-2 rounded-xl text-xs sm:text-sm font-bold shrink-0 transition-all shadow ${
                                                (character.money || 0) >= 30000 
                                                    ? 'bg-amber-600 hover:bg-amber-500 text-white active:scale-95' 
                                                    : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                                            }`}
                                        >
                                            파티 열기
                                        </button>
                                    </div>

                                    {/* 2. 심야 티타임 */}
                                    <div className="p-3.5 sm:p-4 bg-slate-950/80 border border-slate-800 hover:border-pink-500/40 rounded-xl transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                                        <div className="flex items-start gap-3">
                                            <div className="p-2.5 bg-pink-500/10 border border-pink-500/30 rounded-xl text-pink-400 shrink-0 mt-0.5">
                                                <Coffee size={20} />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <h4 className="text-sm sm:text-base font-bold text-slate-100">🍵 1:1 심야 티타임</h4>
                                                    <span className="text-[10px] bg-pink-950 text-pink-300 border border-pink-800 px-1.5 py-0.5 rounded font-mono font-bold">10,000 Gold</span>
                                                </div>
                                                <p className="text-xs text-slate-400 mt-1">
                                                    특정 급우 1명을 초대해 은은한 차를 마시며 진솔한 고민과 비전을 나눕니다.
                                                </p>
                                                <div className="flex flex-wrap items-center gap-2 mt-2 text-[10px]">
                                                    <span className="text-pink-400 font-bold bg-pink-950/40 border border-pink-900/50 px-1.5 py-0.5 rounded">대상 호감도 +10~13 ♥</span>
                                                    <span className="text-amber-400 bg-amber-950/40 border border-amber-900/50 px-1.5 py-0.5 rounded">라이벌 존중+8 / 긴장-15</span>
                                                    <span className="text-slate-400">1일 경과</span>
                                                </div>
                                            </div>
                                        </div>
                                        <button 
                                            onClick={() => setSocialActivityType('tea')}
                                            disabled={(character.money || 0) < 10000}
                                            className={`w-full sm:w-auto px-4 py-2 rounded-xl text-xs sm:text-sm font-bold shrink-0 transition-all shadow ${
                                                (character.money || 0) >= 10000 
                                                    ? 'bg-pink-600 hover:bg-pink-500 text-white active:scale-95' 
                                                    : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                                            }`}
                                        >
                                            친구 초대하기
                                        </button>
                                    </div>

                                    {/* 3. 선물 건네기 */}
                                    <div className="p-3.5 sm:p-4 bg-slate-950/80 border border-slate-800 hover:border-purple-500/40 rounded-xl transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                                        <div className="flex items-start gap-3">
                                            <div className="p-2.5 bg-purple-500/10 border border-purple-500/30 rounded-xl text-purple-400 shrink-0 mt-0.5">
                                                <Gift size={20} />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <h4 className="text-sm sm:text-base font-bold text-slate-100">🎁 정성 어린 선물 & 간식</h4>
                                                    <span className="text-[10px] bg-purple-950 text-purple-300 border border-purple-800 px-1.5 py-0.5 rounded font-mono font-bold">50,000 Gold</span>
                                                    <span className="text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-800 px-1.5 py-0.5 rounded">즉시 적용</span>
                                                </div>
                                                <p className="text-xs text-slate-400 mt-1">
                                                    친구에게 고급 디저트나 수련용 소품을 선물하여 마음을 사로잡습니다. (시간 소모 없음)
                                                </p>
                                                <div className="flex flex-wrap items-center gap-2 mt-2 text-[10px]">
                                                    <span className="text-pink-400 font-bold bg-pink-950/40 border border-pink-900/50 px-1.5 py-0.5 rounded">호감도 대폭 상승 (+15~20 ♥)</span>
                                                    <span className="text-rose-400 bg-rose-950/40 border border-rose-900/50 px-1.5 py-0.5 rounded">라이벌 긴장도 -20</span>
                                                </div>
                                            </div>
                                        </div>
                                        <button 
                                            onClick={() => setSocialActivityType('gift')}
                                            disabled={(character.money || 0) < 50000}
                                            className={`w-full sm:w-auto px-4 py-2 rounded-xl text-xs sm:text-sm font-bold shrink-0 transition-all shadow ${
                                                (character.money || 0) >= 50000 
                                                    ? 'bg-purple-600 hover:bg-purple-500 text-white active:scale-95' 
                                                    : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                                            }`}
                                        >
                                            선물 고르기
                                        </button>
                                    </div>

                                    {/* 4. 전략 보드게임 */}
                                    <div className="p-3.5 sm:p-4 bg-slate-950/80 border border-slate-800 hover:border-cyan-500/40 rounded-xl transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                                        <div className="flex items-start gap-3">
                                            <div className="p-2.5 bg-cyan-500/10 border border-cyan-500/30 rounded-xl text-cyan-400 shrink-0 mt-0.5">
                                                <Gamepad2 size={20} />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <h4 className="text-sm sm:text-base font-bold text-slate-100">🎲 전략 보드게임 대결</h4>
                                                    <span className="text-[10px] bg-slate-800 text-emerald-400 border border-slate-700 px-1.5 py-0.5 rounded font-bold">무료</span>
                                                </div>
                                                <p className="text-xs text-slate-400 mt-1">
                                                    기숙사 휴게실에서 친구들과 수련 대신 흥미진진한 전략 체스나 마작을 둡니다.
                                                </p>
                                                <div className="flex flex-wrap items-center gap-2 mt-2 text-[10px]">
                                                    <span className="text-pink-400 font-bold bg-pink-950/40 border border-pink-900/50 px-1.5 py-0.5 rounded">친구 호감도 +6~9 ♥</span>
                                                    <span className="text-slate-400">1일 경과</span>
                                                </div>
                                            </div>
                                        </div>
                                        <button 
                                            onClick={() => handleSocialActivity('boardgame')}
                                            className="w-full sm:w-auto px-4 py-2 bg-cyan-700 hover:bg-cyan-600 text-white rounded-xl text-xs sm:text-sm font-bold shrink-0 transition-all shadow active:scale-95"
                                        >
                                            게임 시작
                                        </button>
                                    </div>

                                    {/* 5. 기숙사 합동 청소 */}
                                    <div className="p-3.5 sm:p-4 bg-slate-950/80 border border-slate-800 hover:border-emerald-500/40 rounded-xl transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                                        <div className="flex items-start gap-3">
                                            <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 shrink-0 mt-0.5">
                                                <Smile size={20} />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <h4 className="text-sm sm:text-base font-bold text-slate-100">🧹 기숙사 합동 대청소</h4>
                                                    <span className="text-[10px] bg-slate-800 text-emerald-400 border border-slate-700 px-1.5 py-0.5 rounded font-bold">무료</span>
                                                </div>
                                                <p className="text-xs text-slate-400 mt-1">
                                                    친구들과 함께 땀 흘려 기숙사 복도와 휴게실을 깨끗하게 정리합니다.
                                                </p>
                                                <div className="flex flex-wrap items-center gap-2 mt-2 text-[10px]">
                                                    <span className="text-pink-400 font-bold bg-pink-950/40 border border-pink-900/50 px-1.5 py-0.5 rounded">학급 전원 호감도 +3 ♥</span>
                                                    <span className="text-slate-400">1일 경과</span>
                                                </div>
                                            </div>
                                        </div>
                                        <button 
                                            onClick={() => handleSocialActivity('cleaning')}
                                            className="w-full sm:w-auto px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl text-xs sm:text-sm font-bold shrink-0 transition-all shadow active:scale-95"
                                        >
                                            청소 시작
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Student Chat Modal Overlay */}
            {chatStudent && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 p-4 animate-in fade-in">
                    <div className="bg-slate-900 border border-cyan-500 rounded-3xl w-full max-w-lg h-[75vh] shadow-2xl flex flex-col overflow-hidden">
                        <div className="p-4 border-b border-cyan-900/50 bg-cyan-950/20 flex justify-between items-center shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-slate-800 border border-cyan-500 overflow-hidden">
                                    <img src={chatStudent.visualUrl || generateDefaultVisualUrl(chatStudent.name, chatStudent.nation, chatStudent.race, chatStudent.gender)} alt={chatStudent.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                </div>
                                <div>
                                    <div className="font-bold text-white text-sm">{chatStudent.name}</div>
                                    <div className="text-[10px] text-cyan-400 font-bold uppercase">{chatStudent.isRival ? '라이벌' : '학급 친구'}</div>
                                </div>
                            </div>
                            <button onClick={() => setChatStudent(null)} className="text-slate-500 hover:text-white p-2"><X size={20}/></button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-[url('https://www.transparenttextures.com/patterns/stardust.png')]">
                            {(chatStudent.chatHistory || []).length === 0 && (
                                <div className="text-center py-10 opacity-30">
                                    <MessageCircle size={48} className="mx-auto mb-2 text-cyan-500"/>
                                    <p className="text-xs text-slate-400">학창 시절의 소중한 대화를 시작해보세요.</p>
                                </div>
                            )}
                            {chatStudent.chatHistory?.map((msg, i) => (
                                <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                                    <div className={`max-w-[80%] p-3 rounded-2xl text-sm shadow-md ${msg.role === 'user' ? 'bg-cyan-700 text-white rounded-tr-none' : 'bg-slate-800 text-slate-200 border border-slate-700 rounded-tl-none'}`}>
                                        {msg.text}
                                    </div>
                                    <span className="text-[9px] text-slate-600 mt-1 px-1 font-bold">
                                        {msg.role === 'user' ? character.name : chatStudent.name}
                                    </span>
                                </div>
                            ))}
                            <div ref={chatEndRef}/>
                        </div>
                        <div className="p-4 bg-slate-950 border-t border-slate-800">
                            <div className="relative flex gap-2">
                                <input 
                                    type="text" 
                                    value={chatInput}
                                    onChange={e => setChatInput(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                                    placeholder={isChatting ? "생각 중..." : "대화 입력... (1일 경과)"}
                                    disabled={isChatting}
                                    className="flex-1 bg-slate-900 border border-slate-700 rounded-full py-3 px-6 text-sm text-white focus:border-cyan-500 outline-none shadow-inner"
                                />
                                <button 
                                    onClick={handleSendMessage}
                                    disabled={!chatInput.trim() || isChatting}
                                    className="p-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-full transition-all disabled:opacity-50 shadow-lg"
                                >
                                    {isChatting ? <Loader2 size={18} className="animate-spin"/> : <Send size={18}/>}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {showOtherClass && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/90 p-4">
                    <div className="bg-slate-900 border border-indigo-500 rounded-xl p-6 max-w-2xl w-full shadow-2xl relative flex flex-col h-[70vh]">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-indigo-400 flex items-center"><Users size={24} className="mr-2"/> 다른 반 친구들</h3>
                            <button onClick={() => setShowOtherClass(false)} className="text-slate-500 hover:text-white"><X size={24}/></button>
                        </div>
                        <p className="text-sm text-slate-400 mb-4">복도와 식당 등에서 마주친 다른 반 학생들입니다. 새로운 인연을 맺어보세요.</p>
                        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-2">
                            {otherClassmates.map((student, idx) => {
                                const alreadyRecruited = isAlreadyRecruited(student.id);
                                return (
                                    <div key={idx} className={`flex justify-between items-center p-4 rounded-xl border transition-all text-left ${alreadyRecruited ? 'bg-slate-900/50 border-slate-800 opacity-60' : 'bg-slate-950 hover:bg-slate-800 border-border-slate-800 group'}`}>
                                        <div className="flex items-center">
                                            <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center mr-4">
                                                <User size={20} className="text-slate-500"/>
                                            </div>
                                            <div>
                                                <div className="text-base font-bold text-slate-200">{student.name} <span className="text-xs text-amber-500 ml-1">Lv.{student.level}</span></div>
                                                <div className="text-xs text-slate-500">{student.age} • {student.gender} • {student.personality} • 호감도 {student.affection}</div>
                                                <div className="text-[10px] text-blue-400 font-bold uppercase">{student.nation} (유학생)</div>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <button onClick={() => handleDormAction('Info', student.id)} className="px-3 py-1.5 bg-slate-800 border border-slate-700 text-slate-300 rounded-lg hover:bg-slate-700 text-xs">정보</button>
                                            {!alreadyRecruited && (
                                                <button onClick={() => handleDormAction('Hangout', student.id)} className="px-3 py-1.5 bg-slate-800 border border-slate-700 text-pink-300 rounded-lg hover:bg-pink-900/30 text-xs">대화</button>
                                            )}
                                            {alreadyRecruited && (
                                                <span className="px-3 py-1.5 bg-green-900/20 text-green-500 rounded-lg border border-green-900/50 text-[10px] font-bold flex items-center">이미 소속됨</span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                         {otherClassmates.length === 0 && <p className="text-center py-20 text-slate-600 italic">마주친 학생이 없습니다.</p>}
                        </div>
                        <button onClick={() => setShowOtherClass(false)} className="mt-6 w-full py-3 bg-slate-800 text-slate-400 rounded-xl hover:bg-slate-700 font-bold">돌아가기</button>
                    </div>
                </div>
            )}
 {/* PVP OPPONENT SELECTION OVERLAY */}
            {showPvPList && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/90 p-4">
                    <div className="bg-slate-900 border border-red-500 rounded-xl p-6 max-w-2xl w-full shadow-2xl relative flex flex-col h-[70vh]">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-red-400 flex items-center"><Sword size={24} className="mr-2"/> 대련 상대 선택</h3>
                            <button onClick={() => setShowPvPList(false)} className="text-slate-500 hover:text-white"><X size={24}/></button>
                        </div>
                        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 pr-2">
                            {/* Same Classmates Section */}
                            <div>
                                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center"><Users size={12} className="mr-1"/> 우리 반 친구들</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {school.classmates.map((student, idx) => (
                                        <button key={idx} onClick={() => handlePvPSelect(student)} className="flex justify-between items-center p-3 bg-slate-950 hover:bg-red-955/20 border border-slate-800 hover:border-red-500 rounded-xl transition-all">
                                            <div className="flex items-center overflow-hidden">
                                                <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center mr-3 shrink-0 overflow-hidden">
                                                    <img 
                                                        src={student.visualUrl || generateDefaultVisualUrl(student.name, student.nation || '아시아', student.race, student.gender)} 
                                                        alt={student.name}
                                                        className="w-full h-full object-cover"
                                                        referrerPolicy="no-referrer"
                                                    />
                                                </div>
                                                <div className="truncate text-left">
                                                    <div className="text-sm font-bold text-slate-200 truncate">{student.name} <span className="text-[10px] text-amber-500">Lv.{student.level}</span></div>
                                                    <div className="text-[10px] text-slate-500">{student.age} • Power: {(student.stats.str||0) + (student.stats.int||0)}</div>
                                                </div>
                                            </div>
                                            <ChevronRight size={16} className="text-red-900 group-hover:text-red-500"/>
                                        </button>
                                    ))}
                                </div>
                            </div>
                            
                            {/* Other Classmates Section */}
                            {otherClassmates.length > 0 && (
                                <div className="mt-6">
                                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center"><Globe size={12} className="mr-1"/> 다른 반 학생들</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {otherClassmates.map((student, idx) => (
                                            <button key={idx} onClick={() => handlePvPSelect(student)} className="flex justify-between items-center p-3 bg-slate-950 hover:bg-red-955/20 border border-slate-800 hover:border-red-500 rounded-xl transition-all">
                                                <div className="flex items-center overflow-hidden">
                                                    <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center mr-3 shrink-0 overflow-hidden">
                                                        <img 
                                                            src={student.visualUrl || generateDefaultVisualUrl(student.name, student.nation || '아시아', student.race, student.gender)} 
                                                            alt={student.name}
                                                            className="w-full h-full object-cover"
                                                            referrerPolicy="no-referrer"
                                                        />
                                                    </div>
                                                    <div className="truncate text-left">
                                                        <div className="text-sm font-bold text-slate-200 truncate">{student.name} <span className="text-[10px] text-amber-500">Lv.{student.level}</span></div>
                                                        <div className="text-[10px] text-slate-500">{student.age} • Power: {(student.stats.str||0) + (student.stats.int||0)}</div>
                                                    </div>
                                                </div>
                                                <ChevronRight size={16} className="text-red-900 group-hover:text-red-500"/>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                        <button onClick={() => setShowPvPList(false)} className="mt-6 w-full py-3 bg-slate-800 text-slate-400 rounded-xl hover:bg-slate-700 font-bold">대련 취소</button>
                    </div>
                </div>
            )}

            {/* TOURNAMENT MODAL */}
            {showTournament && school.currentTournament && (
                <TournamentModal 
                    tournament={school.currentTournament} 
                    onClose={() => setShowTournament(false)} 
                    onStartMatch={handleTournamentMatch} 
                />
            )}
            
            {/* GRADUATION OPTIONS OVERLAY */}
            {showGraduationOptions && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/90 p-4">
                    <div className="bg-slate-900 border border-amber-500 rounded-xl p-6 max-md w-full shadow-2xl relative">
                        <h3 className="text-xl font-bold text-amber-400 mb-4 text-center">
                            {school.tier} 과정 수료
                        </h3>
                        <p className="text-sm text-slate-300 mb-6 text-center">
                            축하합니다! 모든 과정을 마쳤습니다.<br/>
                            다음 진로를 선택해주세요.
                        </p>
                        
                        <div className="space-y-3">
                            {school.tier !== 'High' ? (
                                <>
                                    <button 
                                        onClick={() => handleGraduationChoice('local')}
                                        className="w-full py-4 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded text-left px-4 group transition-all"
                                    >
                                        <div className="font-bold text-white group-hover:text-amber-400">지역 진학</div>
                                        <div className="text-xs text-slate-500">현재 도시({character.currentLocation?.city})의 상급 학교로 진학합니다.</div>
                                    </button>
                                    
                                    <div className="bg-slate-950 p-3 rounded border border-slate-800">
                                        <div className="font-bold text-slate-300 mb-2">타 지역 전학</div>
                                        <div className="grid grid-cols-2 gap-2 mb-2">
                                            <select className="bg-slate-900 border border-slate-700 rounded p-1 text-xs text-white" value={selectedRegion} onChange={e => setSelectedRegion(e.target.value)}>
                                                {SCHOOL_VALID_REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                                            </select>
                                            <select className="bg-slate-900 border border-slate-700 rounded p-1 text-xs text-white" value={selectedNation} onChange={e => setSelectedNation(e.target.value)}>
                                                {Object.keys(WORLD_GEOGRAPHY[selectedRegion] || {}).map(n => <option key={n} value={n}>{n}</option>)}
                                            </select>
                                        </div>
                                        <select 
                                            className="w-full bg-slate-900 border border-slate-700 rounded p-1 text-xs text-white mb-3"
                                            value={transferTarget.city}
                                            onChange={(e) => setTransferTarget({ ...transferTarget, city: e.target.value })}
                                        >
                                            {(WORLD_GEOGRAPHY[selectedRegion]?.[selectedNation]?.cities || []).map(c => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                        <button 
                                            onClick={() => handleGraduationChoice('transfer')}
                                            className="w-full py-2 bg-indigo-900 hover:bg-indigo-800 text-indigo-100 rounded text-xs font-bold"
                                        >
                                            전학 신청 (이동 + 진학)
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <button 
                                    onClick={() => handleGraduationChoice('society')}
                                    className="w-full py-4 bg-gradient-to-r from-amber-700 to-amber-600 text-white font-bold rounded shadow-lg flex items-center justify-center"
                                >
                                    <GraduationCap size={20} className="mr-2"/> 졸업 및 사회 진출
                                </button>
                            )}
                        </div>
                        <button onClick={() => setShowGraduationOptions(false)} className="mt-4 w-full py-2 text-slate-500 hover:text-white text-xs">취소 (나중에 결정)</button>
                    </div>
                </div>
            )}

            {/* Other Modals (Recruit, ViewStudent, Ranking) */}
            {recruitmentTarget && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/90 p-4 animate-in fade-in">
                    <div className="bg-slate-900 border-2 border-pink-500 rounded-xl p-6 max-sm w-full shadow-[0_0_50px_rgba(236,72,153,0.3)]">
                        <div className="text-center mb-6">
                            <UserPlus size={48} className="mx-auto text-pink-500 mb-2"/>
                            <h3 className="text-xl font-bold text-white">동료 영입</h3>
                            <p className="text-sm text-slate-400 mt-2"><span className="text-pink-300 font-bold">{recruitmentTarget.name}</span>을(를) 파티에 초대하시겠습니까?</p>
                        </div>
                        <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 mb-6 space-y-2">
                            <div className="flex justify-between text-sm"><span className="text-slate-500">레벨 / 나이</span> <span className="text-amber-400 font-bold">Lv.{recruitmentTarget.level} / {recruitmentTarget.age}</span></div>
                            
                            {recruitmentTarget.isRival ? (
                                <>
                                    <div className="flex justify-between text-sm"><span className="text-amber-500 font-bold">존중도</span> <span className="text-amber-400 font-bold">{recruitmentTarget.respect || 0} / 100</span></div>
                                    <div className="flex justify-between text-sm"><span className="text-red-500 font-bold">긴장도</span> <span className="text-red-400 font-bold">{recruitmentTarget.tension || 0} / 100</span></div>
                                </>
                            ) : (
                                <div className="flex justify-between text-sm"><span className="text-slate-500">호감도</span> <span className="text-pink-400 font-bold">{recruitmentTarget.affection}</span></div>
                            )}

                            <div className="flex justify-between text-sm"><span className="text-slate-500">성별</span> <span className="text-white">{recruitmentTarget.gender}</span></div>
                            <div className="flex justify-between text-sm"><span className="text-amber-400 font-bold">{(recruitmentTarget.stats.str || 0) * 2 + (recruitmentTarget.stats.int || 0) * 2}</span></div>
                        </div>
                        <div className="flex gap-3"><button onClick={() => setRecruitmentTarget(null)} className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded font-bold transition-colors">취소</button><button onClick={handleConfirmRecruit} className="flex-1 py-3 bg-pink-600 hover:bg-pink-500 text-white rounded font-bold shadow-lg transition-all transform active:scale-95">영입하기</button></div>
                    </div>
                </div>
            )}
            
            {/* View Student Modal */}
            {/* UI FOR INDIVIDUAL STUDENT DETAIL VIEW (Already in the file, just need to ensure Recruit button is disabled if already recruited) */}
            {viewingStudent && !recruitmentTarget && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-2 sm:p-4 animate-in fade-in">
                    <div className="bg-slate-900 border border-indigo-500 rounded-2xl p-4 sm:p-6 max-w-sm w-full shadow-2xl relative max-h-[92vh] overflow-y-auto custom-scrollbar">
                        <button onClick={() => setViewingStudent(null)} className="absolute top-3 right-3 text-slate-500 hover:text-white p-1"><X size={20}/></button>
                        
                        <div className="flex items-center mb-3">
                            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-slate-800 flex items-center justify-center border-2 border-indigo-500 mr-3 shrink-0 overflow-hidden">
                                {viewingStudent.visualUrl ? (
                                    <img src={viewingStudent.visualUrl} alt={viewingStudent.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                ) : (
                                    <User size={32} className="text-indigo-300"/>
                                )}
                            </div>
                            <div className="min-w-0 flex-1">
                                <h3 className="text-lg sm:text-xl font-bold text-white flex items-center gap-1.5 truncate">
                                    <span className="truncate">{viewingStudent.name}</span> 
                                    <span className="text-xs sm:text-sm text-amber-500 shrink-0">Lv.{viewingStudent.level}</span>
                                    {viewingStudent.isRival && <span className="text-[9px] bg-red-900 text-red-200 px-1.5 py-0.5 rounded border border-red-500 shrink-0">RIVAL</span>}
                                </h3>
                                <p className="text-xs text-slate-400 truncate">{viewingStudent.age} • {viewingStudent.gender} • {viewingStudent.personality}</p>
                            </div>
                        </div>

                        <p className="text-xs text-slate-400 italic mb-3 bg-slate-950 p-2.5 rounded-xl border border-slate-800">"{viewingStudent.appearance}"</p>
                        
                        <div className="space-y-2 bg-slate-950 p-3 sm:p-4 rounded-xl border border-slate-800">
                            {/* Always show Affection */}
                            <div className="flex justify-between text-xs sm:text-sm mb-1">
                                <span className="text-slate-400">호감도</span> 
                                <span className="text-pink-400 font-bold">{viewingStudent.affection} ♥</span>
                            </div>

                            {viewingStudent.isRival && (
                                <div className="space-y-2.5 pt-2 border-t border-slate-800">
                                    <div className="space-y-1">
                                        <div className="flex justify-between text-[10px] text-amber-500 font-bold uppercase tracking-tighter">Respect (존중도)</div>
                                        <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                                            <div className="h-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]" style={{ width: `${viewingStudent.respect || 0}%` }}></div>
                                        </div>
                                        <div className="text-right text-[10px] text-slate-400 font-mono">{viewingStudent.respect || 0} / 100</div>
                                    </div>
                                    <div className="space-y-1">
                                        <div className="flex justify-between text-[10px] text-red-500 font-bold uppercase tracking-tighter">Tension (긴장도)</div>
                                        <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                                            <div className="h-full bg-red-600 shadow-[0_0_8px_rgba(220,38,38,0.5)]" style={{ width: `${viewingStudent.tension || 0}%` }}></div>
                                        </div>
                                        <div className="text-right text-[10px] text-slate-400 font-mono">{viewingStudent.tension || 0} / 100</div>
                                    </div>
                                    <div className="text-[10px] text-slate-500 italic text-center pt-0.5">* 라이벌 영입 조건: 존중 70 이상 & 긴장 0</div>
                                </div>
                            )}
                            <div className="h-px bg-slate-800 my-2"></div>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                                <div className="flex justify-between bg-slate-900/60 p-1.5 rounded border border-slate-800"><span className="text-slate-500">STR</span> <span className="text-red-300 font-mono font-bold">{viewingStudent.stats.str || 0}</span></div>
                                <div className="flex justify-between bg-slate-900/60 p-1.5 rounded border border-slate-800"><span className="text-slate-500">INT</span> <span className="text-purple-300 font-mono font-bold">{viewingStudent.stats.int || 0}</span></div>
                                <div className="flex justify-between bg-slate-900/60 p-1.5 rounded border border-slate-800"><span className="text-slate-500">DEF</span> <span className="text-green-300 font-mono font-bold">{viewingStudent.stats.def || 0}</span></div>
                                <div className="flex justify-between bg-slate-900/60 p-1.5 rounded border border-slate-800"><span className="text-slate-500">AGI</span> <span className="text-amber-300 font-mono font-bold">{viewingStudent.stats.agi || 0}</span></div>
                                <div className="flex justify-between bg-slate-900/60 p-1.5 rounded border border-slate-800"><span className="text-slate-500">WIS</span> <span className="text-blue-300 font-mono font-bold">{viewingStudent.stats.wis || 0}</span></div>
                                <div className="flex justify-between bg-slate-900/60 p-1.5 rounded border border-slate-800"><span className="text-slate-500">CTRL</span> <span className="text-cyan-300 font-mono font-bold">{viewingStudent.stats.ctrl || 0}</span></div>
                                <div className="flex justify-between bg-slate-900/60 p-1.5 rounded border border-slate-800"><span className="text-slate-500">HP</span> <span className="text-rose-400 font-mono font-bold">{viewingStudent.stats.hp || 0}</span></div>
                                <div className="flex justify-between bg-slate-900/60 p-1.5 rounded border border-slate-800"><span className="text-slate-500">MP</span> <span className="text-sky-400 font-mono font-bold">{viewingStudent.stats.mp || 0}</span></div>
                            </div>
                        </div>

                        {/* Interactive Social Action Buttons */}
                        <div className="mt-3 space-y-2">
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">친목 상호작용</div>
                            <div className="grid grid-cols-2 gap-2">
                                <button 
                                    onClick={() => handleSocialActivity('tea', viewingStudent)}
                                    disabled={(character.money || 0) < 100}
                                    className="py-2 px-2 bg-slate-800 hover:bg-amber-950/40 border border-slate-700 hover:border-amber-500/80 rounded-xl text-xs font-bold text-amber-300 flex items-center justify-center gap-1.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <Coffee size={14}/> 티타임 (100G)
                                </button>
                                <button 
                                    onClick={() => handleSocialActivity('gift', viewingStudent)}
                                    disabled={(character.money || 0) < 500}
                                    className="py-2 px-2 bg-slate-800 hover:bg-purple-950/40 border border-slate-700 hover:border-purple-500/80 rounded-xl text-xs font-bold text-purple-300 flex items-center justify-center gap-1.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <Gift size={14}/> 선물하기 (500G)
                                </button>
                            </div>
                            <button 
                                onClick={() => { setViewingStudent(null); handleDormAction('Hangout', viewingStudent.id); }}
                                className="w-full py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-xs font-bold text-pink-300 flex items-center justify-center gap-1.5 transition-all"
                            >
                                <Smile size={14}/> 1:1 대화 나누기 (AI)
                            </button>
                        </div>

                        {(() => {
                            if (isAlreadyRecruited(viewingStudent.id)) {
                                return (
                                    <div className="w-full mt-3 py-2.5 bg-green-900/20 text-green-500 rounded-xl font-bold text-xs text-center border border-green-900/50">
                                        이미 동료로 합류한 급우입니다
                                    </div>
                                );
                            }

                            if (viewingStudent.isEternalRival) {
                                return (
                                    <div className="w-full mt-3 py-2.5 bg-red-950/40 text-red-400 rounded-xl font-bold text-xs text-center border border-red-800/50">
                                        ⚔️ 영원의 라이벌 (동료 영입 불가)
                                    </div>
                                );
                            }

                            let canRecruit = false;
                            if (viewingStudent.isRival) {
                                canRecruit = (viewingStudent.respect || 0) >= 70 && (viewingStudent.tension || 0) === 0;
                            } else {
                                canRecruit = viewingStudent.affection >= 75;
                            }
                            
                            return canRecruit && (
                                <button onClick={() => handleDormAction('Recruit', viewingStudent.id)} className="w-full mt-3 py-2.5 bg-pink-700 hover:bg-pink-600 text-white rounded-xl font-bold text-xs flex items-center justify-center shadow-lg transition-all transform active:scale-95">
                                    <UserPlus size={16} className="mr-1.5"/> 
                                    {viewingStudent.isRival ? '진정한 동료로 영입' : '동료로 영입'}
                                </button>
                            );
                        })()}
                    </div>
                </div>
            )}

            {/* Redesigned Full Ranking & Leaderboard Modal */}
            {showRanking && (
                <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/90 p-2 sm:p-4 animate-in fade-in">
                    <div className="bg-slate-900 border border-amber-500/80 rounded-2xl sm:rounded-3xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-[0_0_50px_rgba(245,158,11,0.2)] overflow-hidden">
                        {/* Header */}
                        <div className="p-4 sm:p-5 border-b border-slate-800 bg-gradient-to-r from-slate-950 via-amber-950/30 to-slate-950 flex justify-between items-center shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-amber-500/20 border border-amber-500/40 rounded-xl text-amber-400">
                                    <Trophy size={24} />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-base sm:text-xl font-bold text-white">학업 및 전투 종합 성적 랭킹</h3>
                                        <span className="text-[10px] sm:text-xs px-2 py-0.5 rounded-full bg-amber-950/80 text-amber-300 border border-amber-800/60 font-bold">
                                            {school.tier} {school.grade}학년 {school.classNumber}반
                                        </span>
                                    </div>
                                    <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5">
                                        필기 이론(지력/지혜)과 실기 무력(근력/체력/민첩/제어)을 합산한 종합 석차입니다.
                                    </p>
                                </div>
                            </div>
                            <button 
                                onClick={() => setShowRanking(false)} 
                                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-colors"
                            >
                                <X size={22}/>
                            </button>
                        </div>

                        {/* Tabs */}
                        <div className="flex border-b border-slate-800 bg-slate-950 px-3 pt-2 gap-2 shrink-0">
                            {[
                                { key: 'class', label: '우리 반 전체 석차', icon: Users },
                                { key: 'school', label: '전교 TOP 10 (명예의 전당)', icon: Medal },
                                { key: 'report', label: '내 성적표 & 학사 현황', icon: BookOpen }
                            ].map(tab => (
                                <button
                                    key={tab.key}
                                    onClick={() => setRankingTab(tab.key as any)}
                                    className={`flex items-center gap-1.5 px-3.5 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition-all ${
                                        rankingTab === tab.key 
                                            ? 'border-amber-500 text-amber-400 bg-slate-900/60 rounded-t-lg' 
                                            : 'border-transparent text-slate-400 hover:text-slate-200'
                                    }`}
                                >
                                    <tab.icon size={15} />
                                    <span>{tab.label}</span>
                                </button>
                            ))}
                        </div>

                        {/* Modal Body */}
                        <div className="flex-1 overflow-y-auto p-3 sm:p-5 custom-scrollbar space-y-4">
                            {rankingTab === 'class' && (() => {
                                const rankings = getRankingData();
                                const playerRankItem = rankings.find(r => r.isPlayer);
                                const top1 = rankings[0];
                                const top2 = rankings[1];
                                const top3 = rankings[2];

                                return (
                                    <>
                                        {/* Player Status Highlight Card */}
                                        {playerRankItem && (
                                            <div className="bg-gradient-to-r from-cyan-950/60 via-slate-900 to-indigo-950/60 border border-cyan-500/50 rounded-2xl p-3.5 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg">
                                                <div className="flex items-center gap-3">
                                                    <div className="relative">
                                                        <div className="w-12 h-12 rounded-xl bg-slate-800 border-2 border-cyan-400 overflow-hidden flex items-center justify-center">
                                                            {playerRankItem.visualUrl ? (
                                                                <img src={playerRankItem.visualUrl} alt={playerRankItem.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                                            ) : (
                                                                <User size={24} className="text-cyan-300"/>
                                                            )}
                                                        </div>
                                                        <span className="absolute -bottom-1 -right-1 bg-cyan-600 text-white text-[9px] font-black px-1.5 py-0.2 rounded-md shadow">
                                                            ME
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-base font-bold text-white">{playerRankItem.name}</span>
                                                            <span className="text-xs text-amber-400 font-bold">Lv.{playerRankItem.level}</span>
                                                            <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-900/50 text-cyan-300 border border-cyan-700/50">
                                                                {playerRankItem.primaryStat}
                                                            </span>
                                                        </div>
                                                        <div className="text-xs text-slate-300 mt-1 flex flex-wrap gap-x-3 gap-y-1">
                                                            <span>필기: <b className="text-indigo-300">{playerRankItem.writtenScore}점</b></span>
                                                            <span>실기: <b className="text-red-300">{playerRankItem.practicalScore}점</b></span>
                                                            <span>종합: <b className="text-amber-300">{playerRankItem.totalScore}점</b></span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 border-slate-800 pt-2 sm:pt-0">
                                                    <div className="text-left sm:text-right">
                                                        <div className="text-[10px] text-slate-400">현재 학급 석차</div>
                                                        <div className="text-2xl font-black text-cyan-400">
                                                            #{playerRankItem.rank} <span className="text-xs text-slate-400 font-normal">/ {rankings.length}명</span>
                                                        </div>
                                                    </div>
                                                    {top1 && top1.id !== playerRankItem.id && (
                                                        <div className="text-right pl-3 border-l border-slate-800">
                                                            <div className="text-[10px] text-slate-400">1위와의 격차</div>
                                                            <div className="text-xs font-bold text-rose-400">
                                                                -{top1.totalScore - playerRankItem.totalScore}점
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {/* Top 3 Podium Cards */}
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                                            {/* 1st Place */}
                                            {top1 && (
                                                <div className="order-1 sm:order-2 bg-gradient-to-b from-amber-950/40 to-slate-950 border-2 border-amber-400/80 rounded-2xl p-3 flex flex-col items-center text-center shadow-[0_0_20px_rgba(245,158,11,0.15)] relative">
                                                    <div className="absolute -top-3 bg-amber-400 text-slate-950 font-black text-[10px] px-3 py-0.5 rounded-full shadow flex items-center gap-1">
                                                        <Crown size={12}/> 1위 수석
                                                    </div>
                                                    <div className="w-14 h-14 rounded-full bg-slate-800 border-2 border-amber-400 overflow-hidden mt-1.5 mb-1.5 shadow-inner">
                                                        <img src={top1.visualUrl} alt={top1.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                                    </div>
                                                    <div className="font-bold text-amber-200 text-sm flex items-center gap-1">
                                                        {top1.name} {top1.isPlayer && <span className="text-[9px] bg-cyan-600 text-white px-1 rounded">나</span>}
                                                    </div>
                                                    <div className="text-[11px] text-slate-400">Lv.{top1.level} • {top1.primaryStat}</div>
                                                    <div className="mt-2 text-sm font-black text-amber-400 bg-amber-950/60 px-3 py-1 rounded-lg border border-amber-700/50 w-full">
                                                        {top1.totalScore}점
                                                    </div>
                                                </div>
                                            )}

                                            {/* 2nd Place */}
                                            {top2 && (
                                                <div className="order-2 sm:order-1 bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-400/60 rounded-2xl p-3 flex flex-col items-center text-center shadow relative">
                                                    <div className="absolute -top-2.5 bg-slate-300 text-slate-950 font-bold text-[10px] px-2.5 py-0.5 rounded-full flex items-center gap-1">
                                                        🥈 2위
                                                    </div>
                                                    <div className="w-12 h-12 rounded-full bg-slate-800 border-2 border-slate-300 overflow-hidden mt-1.5 mb-1.5">
                                                        <img src={top2.visualUrl} alt={top2.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                                    </div>
                                                    <div className="font-bold text-slate-200 text-xs flex items-center gap-1">
                                                        {top2.name} {top2.isPlayer && <span className="text-[9px] bg-cyan-600 text-white px-1 rounded">나</span>}
                                                    </div>
                                                    <div className="text-[10px] text-slate-400">Lv.{top2.level} • {top2.primaryStat}</div>
                                                    <div className="mt-2 text-xs font-bold text-slate-300 bg-slate-900 px-3 py-0.5 rounded-lg border border-slate-700 w-full">
                                                        {top2.totalScore}점
                                                    </div>
                                                </div>
                                            )}

                                            {/* 3rd Place */}
                                            {top3 && (
                                                <div className="order-3 bg-gradient-to-b from-amber-950/20 to-slate-950 border border-amber-700/50 rounded-2xl p-3 flex flex-col items-center text-center shadow relative">
                                                    <div className="absolute -top-2.5 bg-amber-700 text-amber-100 font-bold text-[10px] px-2.5 py-0.5 rounded-full flex items-center gap-1">
                                                        🥉 3위
                                                    </div>
                                                    <div className="w-12 h-12 rounded-full bg-slate-800 border-2 border-amber-600 overflow-hidden mt-1.5 mb-1.5">
                                                        <img src={top3.visualUrl} alt={top3.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                                    </div>
                                                    <div className="font-bold text-amber-100/90 text-xs flex items-center gap-1">
                                                        {top3.name} {top3.isPlayer && <span className="text-[9px] bg-cyan-600 text-white px-1 rounded">나</span>}
                                                    </div>
                                                    <div className="text-[10px] text-slate-400">Lv.{top3.level} • {top3.primaryStat}</div>
                                                    <div className="mt-2 text-xs font-bold text-amber-300/90 bg-slate-900 px-3 py-0.5 rounded-lg border border-amber-900/50 w-full">
                                                        {top3.totalScore}점
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Full Student List (1위 ~ 끝까지) */}
                                        <div className="space-y-2 pt-1">
                                            <div className="flex items-center justify-between text-xs font-bold text-slate-400 px-2">
                                                <span>학급 전체 순위표 (총 {rankings.length}명)</span>
                                                <span>필기 / 실기 / 총점</span>
                                            </div>

                                            {rankings.map((item) => {
                                                const isTop3 = item.rank <= 3;
                                                return (
                                                    <div 
                                                        key={item.id}
                                                        className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 transition-all ${
                                                            item.isPlayer
                                                                ? 'bg-cyan-950/30 border-cyan-500/60 shadow-[0_0_15px_rgba(6,182,212,0.15)]'
                                                                : isTop3
                                                                    ? 'bg-slate-950/90 border-amber-900/40 hover:border-amber-500/50'
                                                                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                                                        }`}
                                                    >
                                                        <div className="flex items-center gap-3 min-w-0">
                                                            {/* Rank Number Badge */}
                                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm shrink-0 ${
                                                                item.rank === 1
                                                                    ? 'bg-amber-500 text-slate-950 shadow-[0_0_10px_rgba(245,158,11,0.5)]'
                                                                    : item.rank === 2
                                                                        ? 'bg-slate-300 text-slate-950'
                                                                        : item.rank === 3
                                                                            ? 'bg-amber-700 text-white'
                                                                            : 'bg-slate-800 text-slate-400 border border-slate-700'
                                                            }`}>
                                                                {item.rank}
                                                            </div>

                                                            {/* Avatar */}
                                                            <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 overflow-hidden shrink-0">
                                                                <img src={item.visualUrl} alt={item.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                                            </div>

                                                            {/* Student Info */}
                                                            <div className="min-w-0">
                                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                                    <span className={`font-bold text-sm truncate ${item.isPlayer ? 'text-cyan-300' : 'text-slate-100'}`}>
                                                                        {item.name}
                                                                    </span>
                                                                    {item.isPlayer && (
                                                                        <span className="text-[9px] bg-cyan-600 text-white px-1.5 py-0.2 rounded font-bold">
                                                                            나
                                                                        </span>
                                                                    )}
                                                                    {item.isRival && (
                                                                        <span className="text-[9px] bg-red-950 text-red-300 border border-red-800 px-1.5 py-0.2 rounded font-bold">
                                                                            라이벌
                                                                        </span>
                                                                    )}
                                                                    <span className="text-[10px] text-amber-400 font-mono">Lv.{item.level}</span>
                                                                </div>
                                                                <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                                                                    <span>{item.personality}</span>
                                                                    <span>•</span>
                                                                    <span className="text-slate-400">{item.primaryStat}</span>
                                                                    {!item.isPlayer && item.affection !== undefined && (
                                                                        <>
                                                                            <span>•</span>
                                                                            <span className="text-pink-400 font-bold">♥ {item.affection}</span>
                                                                        </>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Scores & Quick Actions */}
                                                        <div className="flex items-center justify-between sm:justify-end gap-3 border-t sm:border-t-0 border-slate-800/80 pt-2 sm:pt-0">
                                                            <div className="text-left sm:text-right">
                                                                <div className="text-xs font-mono font-bold text-slate-300">
                                                                    <span className="text-indigo-400" title="필기 점수">{item.writtenScore}</span>
                                                                    <span className="text-slate-600 mx-1">/</span>
                                                                    <span className="text-red-400" title="실기 점수">{item.practicalScore}</span>
                                                                </div>
                                                                <div className="text-xs sm:text-sm font-black text-amber-400">
                                                                    총 {item.totalScore}점
                                                                </div>
                                                            </div>

                                                            {!item.isPlayer && item.studentRef && (
                                                                <div className="flex items-center gap-1 shrink-0">
                                                                    <button
                                                                        onClick={() => {
                                                                            setViewingStudent(item.studentRef!);
                                                                            setShowRanking(false);
                                                                        }}
                                                                        className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs"
                                                                        title="상세 정보"
                                                                    >
                                                                        <Eye size={14}/>
                                                                    </button>
                                                                    <button
                                                                        onClick={() => {
                                                                            setChatStudent(item.studentRef!);
                                                                            setShowRanking(false);
                                                                        }}
                                                                        className="p-1.5 bg-slate-800 hover:bg-pink-900/40 text-pink-300 rounded-lg text-xs"
                                                                        title="대화하기"
                                                                    >
                                                                        <MessageCircle size={14}/>
                                                                    </button>
                                                                    <button
                                                                        onClick={() => {
                                                                            handlePvPSelect(item.studentRef!);
                                                                            setShowRanking(false);
                                                                        }}
                                                                        className="p-1.5 bg-slate-800 hover:bg-red-900/40 text-red-300 rounded-lg text-xs"
                                                                        title="대련 신청"
                                                                    >
                                                                        <Sword size={14}/>
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </>
                                );
                            })()}

                            {rankingTab === 'school' && (() => {
                                const schoolTop = getSchoolTopRankers();
                                return (
                                    <div className="space-y-3">
                                        <div className="bg-gradient-to-r from-amber-950/40 via-slate-900 to-amber-950/40 p-4 rounded-2xl border border-amber-600/40 flex items-center justify-between">
                                            <div>
                                                <h4 className="text-base font-bold text-amber-300 flex items-center gap-2">
                                                    <Trophy size={18} className="text-amber-400"/>
                                                    {school.schoolName} 전교 명예의 전당 TOP 10
                                                </h4>
                                                <p className="text-xs text-slate-400 mt-1">
                                                    전 학급에서 가장 뛰어난 기량을 증명한 10인의 정예 명단입니다.
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-[10px] text-slate-400">내 전교 예상 순위</div>
                                                <div className="text-lg font-black text-amber-400">
                                                    #{Math.max(1, getClassRank() * 5 - 2)}위 권
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            {schoolTop.map((item) => (
                                                <div 
                                                    key={item.id}
                                                    className={`p-3 rounded-xl border flex items-center justify-between gap-3 ${
                                                        item.isPlayer
                                                            ? 'bg-cyan-950/40 border-cyan-500 shadow-md'
                                                            : item.rank <= 3
                                                                ? 'bg-slate-950 border-amber-600/40'
                                                                : 'bg-slate-950 border-slate-800'
                                                    }`}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm shrink-0 ${
                                                            item.rank === 1 ? 'bg-amber-500 text-slate-950' :
                                                            item.rank === 2 ? 'bg-slate-300 text-slate-950' :
                                                            item.rank === 3 ? 'bg-amber-700 text-white' :
                                                            'bg-slate-800 text-slate-400'
                                                        }`}>
                                                            {item.rank}
                                                        </div>
                                                        <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 overflow-hidden shrink-0">
                                                            <img src={item.visualUrl} alt={item.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                                        </div>
                                                        <div>
                                                            <div className="flex items-center gap-1.5">
                                                                <span className="font-bold text-sm text-slate-100">{item.name}</span>
                                                                {item.isPlayer && <span className="text-[9px] bg-cyan-600 text-white px-1.5 py-0.2 rounded font-bold">나</span>}
                                                                <span className="text-[10px] text-amber-400 font-mono">Lv.{item.level}</span>
                                                            </div>
                                                            <div className="text-[11px] text-slate-500">{item.nation} • {item.primaryStat}</div>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="text-xs text-slate-400">필기 {item.writtenScore} / 실기 {item.practicalScore}</div>
                                                        <div className="text-sm font-black text-amber-400">{item.totalScore}점</div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })()}

                            {rankingTab === 'report' && (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                                            <div className="text-xs font-bold text-slate-400 mb-2 flex items-center gap-1.5">
                                                <PenTool size={14} className="text-cyan-400"/> 정기 시험 이수 현황
                                            </div>
                                            <div className="space-y-2 text-sm">
                                                <div className="flex justify-between items-center p-2 rounded-lg bg-slate-900/60 border border-slate-800">
                                                    <span className="text-slate-300">중간고사 (4월~6월)</span>
                                                    <span className={`font-bold px-2 py-0.5 rounded text-xs ${school.midtermPassed ? 'bg-green-950 text-green-400 border border-green-800' : 'bg-slate-800 text-slate-400'}`}>
                                                        {school.midtermPassed ? '합격 (Pass)' : '미응시'}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between items-center p-2 rounded-lg bg-slate-900/60 border border-slate-800">
                                                    <span className="text-slate-300">기말고사 (10월~12월)</span>
                                                    <span className={`font-bold px-2 py-0.5 rounded text-xs ${school.finalPassed ? 'bg-green-950 text-green-400 border border-green-800' : 'bg-slate-800 text-slate-400'}`}>
                                                        {school.finalPassed ? '합격 (Pass)' : '미응시'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                                            <div className="text-xs font-bold text-slate-400 mb-2 flex items-center gap-1.5">
                                                <Shield size={14} className="text-amber-400"/> 학적 및 상벌 현황
                                            </div>
                                            <div className="space-y-2 text-sm">
                                                <div className="flex justify-between items-center p-2 rounded-lg bg-slate-900/60 border border-slate-800">
                                                    <span className="text-slate-300">학교 평판</span>
                                                    <span className="font-bold text-indigo-400">{school.reputation} pt</span>
                                                </div>
                                                <div className="flex justify-between items-center p-2 rounded-lg bg-slate-900/60 border border-slate-800">
                                                    <span className="text-slate-300">징계 / 경고 누적</span>
                                                    <span className={`font-bold ${warnings > 0 ? 'text-red-400' : 'text-slate-400'}`}>
                                                        {warnings} / 3회 {isSuspended && '(정학)'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 text-xs text-slate-400 space-y-1">
                                        <div className="font-bold text-slate-200 mb-1">💡 성적 향상 및 진급 안내</div>
                                        <p>• 강의실 수업을 수강하면 지력, 근력, 체력 등 종합 능력치가 상승하여 석차가 오릅니다.</p>
                                        <p>• 월간 특별 수련 및 도서관 열람을 통해 지식과 무력을 폭발적으로 신장시킬 수 있습니다.</p>
                                        <p>• 중간/기말고사를 모두 합격해야 학년 진급 및 상급 학교 진학 심사를 통과할 수 있습니다.</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="p-3.5 border-t border-slate-800 bg-slate-950 flex justify-between items-center shrink-0">
                            <div className="text-[11px] text-slate-500">
                                * 매월 능력치 성장에 따라 석차가 실시간 갱신됩니다.
                            </div>
                            <button
                                onClick={() => setShowRanking(false)}
                                className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold rounded-xl text-xs transition-colors shadow"
                            >
                                닫기
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="bg-slate-900 w-full max-w-6xl h-[85vh] rounded-2xl sm:rounded-3xl border border-cyan-700 shadow-2xl flex flex-col overflow-hidden relative">
                {/* SchoolModal Modern Header */}
                <div className="p-2.5 sm:p-5 border-b border-cyan-800 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 flex justify-between items-center shrink-0 gap-2">
                    <div className="flex items-center gap-1.5 sm:gap-3.5 min-w-0 flex-1">
                        <div className="bg-gradient-to-br from-cyan-900/50 to-indigo-900/50 p-1.5 sm:p-2.5 rounded-xl border border-cyan-500/40 shadow-inner shrink-0">
                            <School size={20} className="text-cyan-400 sm:w-[24px] sm:h-[24px]" />
                        </div>
                        <div className="min-w-0">
                            <div className="flex items-center gap-1.5 min-w-0">
                                <h2 className="text-sm sm:text-xl font-bold text-white font-cinzel truncate max-w-[120px] xs:max-w-[160px] sm:max-w-none">
                                    {school.schoolName}
                                </h2>
                                <span className="text-[9px] sm:text-xs px-1.5 py-0.2 rounded-full bg-cyan-950 border border-cyan-700 text-cyan-300 font-bold shrink-0">
                                    {school.tier}
                                </span>
                            </div>
                            <p className="text-[9px] sm:text-xs text-slate-400 mt-0.5 truncate">
                                {character.job === JobType.STUDENT ? (
                                    <span>
                                        {schoolYear}학년도 {school.grade}학년 {school.classNumber}반 • <b className="text-amber-400">석차 #{getClassRank()}위</b>
                                        {isSuspended && <span className="text-red-500 font-bold ml-1 sm:ml-2">[정학 중]</span>}
                                    </span>
                                ) : (
                                    "임시 교관 초빙"
                                )}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                        <button 
                            onClick={() => setShowRanking(true)} 
                            className="px-2 sm:px-3 py-1.5 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-950 font-bold rounded-xl text-xs sm:text-sm flex items-center gap-1 sm:gap-1.5 shadow-[0_0_15px_rgba(245,158,11,0.2)] transition-all transform active:scale-95 shrink-0"
                        >
                            <Trophy size={14} className="sm:w-[15px] sm:h-[15px]" />
                            <span className="hidden sm:inline">성적 랭킹</span>
                            <span className="bg-amber-950/80 text-amber-200 text-[9px] sm:text-[10px] px-1 sm:px-1.5 py-0.2 rounded-full font-mono font-bold shrink-0">#{getClassRank()}위</span>
                        </button>

                        <button 
                            onClick={() => setShowRoster(true)} 
                            className="p-1.5 sm:px-3 sm:py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-slate-300 transition-all flex items-center gap-1.5 text-xs sm:text-sm shrink-0"
                            title="학생 명단"
                        >
                            <Users size={14} className="text-cyan-400 sm:w-[16px] sm:h-[16px] shrink-0"/>
                            <span className="hidden sm:inline">학생 명단</span>
                        </button>

                        <button 
                            onClick={onClose} 
                            className="text-slate-400 hover:text-white p-1.5 sm:p-2 rounded-full hover:bg-slate-800 transition-colors shrink-0 flex items-center justify-center"
                            aria-label="닫기"
                        >
                            <X size={20} className="sm:w-[22px] sm:h-[22px] shrink-0" />
                        </button>
                    </div>
                </div>

                {/* Mobile Horizontal Navigation Tabs */}
                <div className="flex sm:hidden overflow-x-auto gap-1 p-1.5 bg-slate-950 border-b border-slate-800 shrink-0 custom-scrollbar">
                    {[
                        { id: 'Office', label: '교무실', icon: Building2 },
                        { id: 'Classroom', label: '강의실', icon: BookOpen },
                        { id: 'Training', label: '훈련장', icon: Sword },
                        { id: 'Club', label: '동아리', icon: LayoutGrid },
                        { id: 'Library', label: '도서관', icon: Scroll },
                        { id: 'Dormitory', label: '기숙사', icon: BedDouble },
                    ].filter(zone => character.job === JobType.STUDENT || zone.id === 'Classroom').map((zone) => (
                        <button
                            key={zone.id}
                            onClick={() => setCurrentZone(zone.id as SchoolZone)}
                            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all shrink-0 ${
                                currentZone === zone.id 
                                    ? 'bg-cyan-900/50 text-cyan-300 border border-cyan-500/50 shadow' 
                                    : 'text-slate-400 hover:text-slate-200'
                            }`}
                        >
                            <zone.icon size={14} />
                            <span>{zone.label}</span>
                        </button>
                    ))}
                </div>

                <div className="flex flex-1 overflow-hidden">
                    {/* Desktop Sidebar Navigation */}
                    <div className="hidden sm:flex w-48 bg-slate-950 border-r border-slate-800 flex-col shrink-0">
                        {[
                            { id: 'Office', label: '교무/행정', icon: Building2 },
                            { id: 'Classroom', label: '강의실', icon: BookOpen },
                            { id: 'Training', label: '훈련장', icon: Sword },
                            { id: 'Club', label: '방과 후 동아리', icon: LayoutGrid },
                            { id: 'Library', label: '도서관', icon: Scroll },
                            { id: 'Dormitory', label: '기숙사', icon: BedDouble },
                        ].filter(zone => character.job === JobType.STUDENT || zone.id === 'Classroom').map((zone) => (
                            <button
                                key={zone.id}
                                onClick={() => setCurrentZone(zone.id as SchoolZone)}
                                className={`p-4 flex items-center text-left transition-all border-l-4 ${
                                    currentZone === zone.id 
                                        ? 'bg-slate-800/80 border-cyan-500 text-cyan-400 font-bold shadow-inner' 
                                        : 'bg-transparent border-transparent text-slate-500 hover:bg-slate-900 hover:text-slate-300'
                                }`}
                            >
                                <zone.icon size={18} className="mr-3 shrink-0" />
                                <span className="text-sm font-bold">{zone.label}</span>
                            </button>
                        ))}
                    </div>

                    <div className="flex-1 bg-slate-900 p-3 md:p-6 overflow-y-auto custom-scrollbar relative">
                        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/notebook.png')] opacity-5 pointer-events-none"></div>
                        
                        {currentZone === 'Office' && (
                            <div className="max-w-2xl mx-auto space-y-6">
                                <div className="flex justify-between items-center border-b border-slate-700 pb-2 mb-4">
                                    <h3 className="text-xl font-bold text-slate-200">교무실</h3>
                                    <span className="text-xs bg-slate-800 px-3 py-1 rounded-full text-slate-400 border border-slate-600">
                                        {schoolYear}학년도
                                    </span>
                                </div>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-4 text-xs md:text-sm bg-slate-950 p-3 md:p-4 rounded-xl border border-slate-800">
                                    <div className="flex justify-between">
                                        <span className="text-slate-400">현재 학기</span>
                                        <span className="text-white font-mono">{school.semester}학기 ({currentMonth}월)</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-400">시험 성적</span>
                                        <div className="flex flex-col text-right">
                                            <span className={school.midtermPassed ? 'text-green-400' : 'text-slate-500'}>
                                                중간: {school.midtermPassed ? 'P (통과)' : '미응시/F'}
                                            </span>
                                            <span className={school.finalPassed ? 'text-green-400' : 'text-slate-500'}>
                                                기말: {school.finalPassed ? 'P (통과)' : '미응시/F'}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-400">평판</span>
                                        <span className="text-indigo-400 font-bold">{school.reputation}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-400">징계 누적</span>
                                        <span className={`${warnings > 0 ? 'text-red-500' : 'text-slate-600'} font-bold`}>{warnings} / 3</span>
                                    </div>
                                </div>

                                {/* [NEW] 담임 교사 정보 표시 */}
                                {school.homeroomTeacher && (
                                    <div className="bg-slate-950 p-3 md:p-4 rounded-xl border border-indigo-900/50 mb-4 flex items-center gap-3 md:gap-4">
                                        <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-slate-800 border-2 border-indigo-500 flex items-center justify-center shrink-0 overflow-hidden">
                                            {school.homeroomTeacher.visualUrl ? (
                                                <img src={school.homeroomTeacher.visualUrl} alt={school.homeroomTeacher.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                            ) : (
                                                <User size={24} className="text-indigo-300 md:w-8 md:h-8"/>
                                            )}
                                        </div>
                                        <div className="flex-1">
                                            <h4 className="font-bold text-indigo-300 text-base md:text-lg flex flex-col md:flex-row md:items-center">
                                                {school.homeroomTeacher.name} 
                                                <span className="text-[10px] md:text-xs text-slate-500 md:ml-2 border border-slate-700 px-2 py-0.5 rounded-full w-fit mt-1 md:mt-0">담임 교사</span>
                                            </h4>
                                            <div className="text-[10px] md:text-xs text-slate-400 mt-1 flex gap-2 md:gap-3">
                                                <span>{school.homeroomTeacher.age}</span>
                                                <span>{school.homeroomTeacher.gender}</span>
                                                <span>{school.homeroomTeacher.personality}</span>
                                            </div>
                                            <div className="mt-2 w-full bg-slate-900 rounded-full h-1.5 overflow-hidden border border-slate-800">
                                                <div className="h-full bg-pink-500" style={{ width: `${Math.min(100, Math.max(0, school.homeroomTeacher.affection || 0))}%` }}></div>
                                            </div>
                                            <div className="text-[10px] text-pink-400 text-right mt-0.5">호감도: {school.homeroomTeacher.affection || 0}</div>
                                        </div>
                                        <button 
                                            onClick={() => setViewingStudent(school.homeroomTeacher!)}
                                            className="px-2 md:px-3 py-1 md:py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] md:text-xs rounded border border-slate-600"
                                        >
                                            정보
                                        </button>
                                    </div>
                                )}

         {school.tier === 'High' && school.grade === 3 && (
            
                                    <div className="bg-slate-950 p-4 rounded-xl border border-amber-900/50 space-y-2">
                                        <h4 className="text-sm font-bold text-amber-500 flex items-center mb-2"><Calendar size={16} className="mr-2"/> 토너먼트 일정</h4>
                                        <div className={`flex justify-between text-xs ${tournamentConfig.high_school.month === currentMonth ? 'text-amber-200 font-bold' : 'text-slate-500'}`}>
                                            <span>5월: 교내 토너먼트</span>
                                            <span>
                                                {school.currentTournament?.key === 'high_school' && school.currentTournament?.isActive
                                                    ? (school.currentTournament.currentRound === 2 ? '결승전 진행 중' : `${school.currentTournament.currentRound}강 진행 중`)
                                                    : school.tournamentHistory?.schoolPlacement
                                                        ? `(결과: ${school.tournamentHistory.schoolPlacement === 1 ? '우승' : school.tournamentHistory.schoolPlacement === 2 ? '준우승' : `${school.tournamentHistory.schoolPlacement}강`})`
                                                        : isTournamentTaken ? '(탈락/종료)' : '(미참가)'
                                                }
                                            </span>
                                        </div>
                                        <div className={`flex justify-between text-xs ${tournamentConfig.high_national.month === currentMonth ? 'text-amber-200 font-bold' : 'text-slate-500'}`}>
                                            <span>8월: 국가 대항전</span>
                                            <span>
                                                {school.currentTournament?.key === 'high_national' && school.currentTournament?.isActive
                                                    ? (school.currentTournament.currentRound === 2 ? '결승전 진행 중' : `${school.currentTournament.currentRound}강 진행 중`)
                                                    : school.tournamentHistory?.nationalPlacement
                                                        ? `(결과: ${school.tournamentHistory.nationalPlacement === 1 ? '우승' : school.tournamentHistory.nationalPlacement === 2 ? '준우승' : `${school.tournamentHistory.nationalPlacement}강`})`
                                                        : isTournamentTaken ? '(탈락/종료)' : '(미참가)'
                                                }
                                            </span>
                                        </div>
                                        <div className={`flex justify-between text-xs ${tournamentConfig.high_world.month === currentMonth ? 'text-amber-200 font-bold' : 'text-slate-500'}`}>
                                            <span>12월: 월드컵 (세계)</span>
                                            <span>
                                                {school.currentTournament?.key === 'high_world' && school.currentTournament?.isActive
                                                    ? (school.currentTournament.currentRound === 2 ? '결승전 진행 중' : `${school.currentTournament.currentRound}강 진행 중`)
                                                    : school.tournamentHistory?.worldPlacement
                                                        ? `(결과: ${school.tournamentHistory.worldPlacement === 1 ? '우승' : school.tournamentHistory.worldPlacement === 2 ? '준우승' : `${school.tournamentHistory.worldPlacement}강`})`
                                                        : isTournamentTaken ? '(탈락/종료)' : '(미참가)'
                                                }
                                            </span>
                                        </div>
                                        <p className="text-[10px] text-slate-600 mt-2 border-t border-slate-800 pt-2">
                                            * 상위 대회 진출 조건: 교내(4강) → 국가(결승) → 세계
                                        </p>
                                    </div>
                                )}

                                <div className="space-y-3">
                                    <button 
                                        onClick={handleAdvanceClick}
                                        disabled={!canAdvance}
                                        className={`w-full py-4 font-bold rounded-lg shadow-lg flex items-center justify-center transition-all ${canAdvance ? 'bg-green-700 hover:bg-green-600 text-white' : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'}`}
                                    >
                                        <ArrowUpCircle size={20} className="mr-2"/>
                                        {school.grade < 3 ? "진급 심사" : school.tier === 'High' ? "졸업 심사" : "진학 심사"}
                                    </button>
                                    {!canAdvance && <p className="text-xs text-center text-slate-500">* 모든 시험(중간/기말)을 통과해야 진급/졸업이 가능합니다.</p>}

                                    {activeTournamentDef && !isSuspended && (
                                        <button 
                                            onClick={handleOpenTournament}
                                            disabled={isTournamentTaken && !school.currentTournament?.isActive}
                                            className={`w-full py-4 mt-4 bg-gradient-to-r from-red-900 to-amber-900 hover:from-red-800 hover:to-amber-800 text-white font-bold rounded-lg shadow-lg flex flex-col items-center justify-center transition-all ${(isTournamentTaken && !school.currentTournament?.isActive) ? 'opacity-50 cursor-not-allowed grayscale' : 'animate-pulse'}`}
                                        >
                                            <div className="flex items-center text-lg">
                                                <Trophy size={24} className="mr-2 text-yellow-400"/>
                                                {school.currentTournament?.isActive 
                                                    ? (school.currentTournament.currentRound === 2 ? '결승전 경기 진행' : `${school.currentTournament.currentRound}강전 경기 진행`) 
                                                    : `${activeTournamentDef.label} ${isTournamentTaken ? '(탈락/종료)' : '(참가 신청)'}`}
                                            </div>
                                            <span className="text-xs text-amber-200 mt-1 font-normal">
                                                우승 보상: {activeTournamentDef.reward}
                                            </span>
                                        </button>
                                    )}

                                    <div className="flex gap-4 mt-4">
                                        <button 
                                            onClick={() => handleExam('midterm')}
                                            disabled={!isMidtermPeriod || isSuspended || school.midtermPassed || isExamTakenThisMonth}
                                            className={`flex-1 py-4 border rounded-lg flex flex-col items-center justify-center transition-all ${(!isMidtermPeriod || school.midtermPassed || isExamTakenThisMonth) ? 'bg-slate-950 border-slate-800 opacity-50 cursor-not-allowed' : 'bg-slate-800 hover:bg-slate-700 border-slate-600 hover:border-cyan-500'}`}
                                        >
                                            <PenTool size={24} className="mb-2 text-cyan-400"/>
                                            <span className="font-bold text-slate-200">
                                                {school.midtermPassed ? '중간고사 (Pass)' : '중간고사 응시'}
                                            </span>
                                            <span className="text-xs text-slate-500 mt-1">
                                                {isExamTakenThisMonth ? '이번 달 응시 완료' : school.midtermPassed ? '통과함' : '기간: 4월~6월'}
                                            </span>
                                        </button>
                                        
                                        <button 
                                            onClick={() => handleExam('final')}
                                            disabled={!isFinalPeriod || isSuspended || school.finalPassed || isExamTakenThisMonth}
                                            className={`flex-1 py-4 border rounded-lg flex flex-col items-center justify-center transition-all ${(!isFinalPeriod || school.finalPassed || isExamTakenThisMonth) ? 'bg-slate-950 border-slate-800 opacity-50 cursor-not-allowed' : 'bg-slate-800 hover:bg-slate-700 border-slate-600 hover:border-cyan-500'}`}
                                        >
                                            <PenTool size={24} className="mb-2 text-cyan-400"/>
                                            <span className="font-bold text-slate-200">
                                                {school.finalPassed ? '학말고사 (Pass)' : '학말고사 응시'}
                                            </span>
                                            <span className="text-xs text-slate-500 mt-1">
                                                {isExamTakenThisMonth ? '이번 달 응시 완료' : school.finalPassed ? '통과함' : '기간: 10월~12월'}
                                            </span>
                                        </button>
                                    </div>
                                    
                                    <div className="bg-slate-950/30 p-3 rounded border border-slate-800 text-xs text-slate-400 text-center">
                                        * 내년 3월 2일까지 모든 시험을 통과해야 진급합니다.<br/>
                                        (미통과 시 유급 처리됩니다.)
                                    </div>
                                    
                                    <button onClick={() => setShowRanking(true)} className="w-full py-3 bg-indigo-900/30 hover:bg-indigo-900/50 border border-indigo-700/50 text-indigo-300 rounded flex items-center justify-center">
                                        <ListOrdered size={16} className="mr-2"/> 성적/랭킹 확인
                                    </button>
                                </div>
                            </div>
                        )}
                        
                        {currentZone === 'Classroom' && (
                             <div className="space-y-6">
                                <h3 className="text-xl font-bold text-slate-200 border-b border-slate-700 pb-2 mb-4">강의실</h3>
                                <p className="text-sm text-slate-400 mb-4">수업을 들으면 능력치가 상승하고 <span className="text-amber-400 font-bold">1주일</span>이 경과하며 세계 시뮬레이션이 진행됩니다.</p>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                    <button onClick={() => handleTakeClass('Combat')} className="p-4 bg-slate-800 hover:bg-red-900/20 border border-slate-700 hover:border-red-500 rounded-xl flex flex-col items-center transition-all group"><Sword size={32} className="text-slate-500 group-hover:text-red-400 mb-2"/><span className="font-bold text-slate-300">전투학</span><span className="text-[10px] text-slate-500 mt-1">STR / AGI</span></button>
                                    <button onClick={() => handleTakeClass('Magic')} className="p-4 bg-slate-800 hover:bg-purple-900/20 border border-slate-700 hover:border-purple-500 rounded-xl flex flex-col items-center transition-all group"><Sparkles size={32} className="text-slate-500 group-hover:text-purple-400 mb-2"/><span className="font-bold text-slate-300">마법학</span><span className="text-[10px] text-slate-500 mt-1">INT</span></button>
                                    <button onClick={() => handleTakeClass('Divine')} className="p-4 bg-slate-800 hover:bg-amber-900/20 border border-slate-700 hover:border-amber-500 rounded-xl flex flex-col items-center transition-all group"><User size={32} className="text-slate-500 group-hover:text-amber-400 mb-2"/><span className="font-bold text-slate-300">신력학</span><span className="text-[10px] text-slate-500 mt-1">CTRL</span></button>
                                    <button onClick={() => handleTakeClass('Strategy')} className="p-4 bg-slate-800 hover:bg-blue-900/20 border border-slate-700 hover:border-blue-500 rounded-xl flex flex-col items-center transition-all group"><Brain size={32} className="text-slate-500 group-hover:text-blue-400 mb-2"/><span className="font-bold text-slate-300">전략학</span><span className="text-[10px] text-slate-500 mt-1">WIS</span></button>
                                    <button onClick={() => handleTakeClass('Physical')} className="p-4 bg-slate-800 hover:bg-green-900/20 border border-slate-700 hover:border-green-500 rounded-xl flex flex-col items-center transition-all group"><Dumbbell size={32} className="text-slate-500 group-hover:text-green-400 mb-2"/><span className="font-bold text-slate-300">체력학</span><span className="text-[10px] text-slate-500 mt-1">DEF</span></button>
                                    {instructorQuest && (() => {
                                        const questProgress = getInstructorQuestProgress(instructorQuest, character.currentDate);
                                        return (
                                        <div className="col-span-full mt-4 space-y-4">
                                            {/* 임시 교관 파견 의뢰 진행 상황 대시보드 */}
                                            <div className="bg-slate-950/90 border border-amber-500/30 rounded-2xl p-3.5 sm:p-4 space-y-2.5">
                                                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2">
                                                    <div className="flex items-center gap-2">
                                                        <GraduationCap size={20} className="text-amber-400"/>
                                                        <h4 className="font-bold text-sm sm:text-base text-amber-300">
                                                            임시 교관 파견 의뢰 현황
                                                        </h4>
                                                    </div>
                                                    <div className="flex items-center gap-2 text-xs">
                                                        <span className="font-mono font-bold text-slate-300 bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-800">
                                                            진행 {questProgress.daysElapsed}일차 ({questProgress.currentWeek}주차)
                                                        </span>
                                                        <span className={`font-bold px-2.5 py-1 rounded-lg border ${
                                                            questProgress.isExpired
                                                                ? "bg-rose-950/60 text-rose-300 border-rose-800"
                                                                : questProgress.daysRemainingToDeadline <= 7
                                                                    ? "bg-amber-950/60 text-amber-300 border-amber-800"
                                                                    : "bg-blue-950/60 text-blue-300 border-blue-800"
                                                        }`}>
                                                            {questProgress.isExpired ? "기한 만료" : `마감까지 D-${questProgress.daysRemainingToDeadline}일`}
                                                        </span>
                                                    </div>
                                                </div>

                                                <div className="flex flex-wrap items-center justify-between text-xs gap-2">
                                                    <div className="text-slate-400">
                                                        {questProgress.canStartLecture ? (
                                                            <span className="text-emerald-400 font-bold flex items-center gap-1">
                                                                <CheckCircle size={14} /> 3주차 도달: 본격적인 강의 진행이 가능합니다. (한 달 이내 완료 필수)
                                                            </span>
                                                        ) : questProgress.isExpired ? (
                                                            <span className="text-rose-400 font-bold flex items-center gap-1">
                                                                <AlertTriangle size={14} /> 의뢰 기한인 한 달(30일)이 초과되어 파견 계약이 만료되었습니다.
                                                            </span>
                                                        ) : (
                                                            <span className="text-amber-300 font-medium flex items-center gap-1">
                                                                <Lock size={14} /> 학생 개별 지도 및 유대 강화 기간 (3주차 강의 해금까지 {questProgress.daysRemainingToUnlock}일 남음)
                                                            </span>
                                                        )}
                                                    </div>
                                                    <span className="text-[11px] text-slate-500">
                                                        ※ 조언과 칭찬은 학생별 7일에 한 번씩 가능합니다.
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-between border-b border-amber-500/30 pb-2">
                                                <h4 className="text-lg font-bold text-amber-400 flex items-center">
                                                    <Users size={20} className="mr-2"/> 학생 지도 및 교류
                                                </h4>
                                                <span className="text-[10px] text-slate-400">학생 정보 확인 및 7일 주기 개별 지도</span>
                                            </div>
                                            
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                {school.classmates.map((student: SimpleStudent) => {
                                                    const analysis = getStudentProfileAnalysis(student);
                                                    const cd = getMentoringCooldown(student, character.currentDate);
                                                    return (
                                                        <div key={student.id} className="bg-slate-950 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between gap-3 hover:border-amber-500/40 transition-all">
                                                            <div className="flex items-start gap-3">
                                                                <button 
                                                                    type="button"
                                                                    onClick={() => setSelectedDetailStudent(student)}
                                                                    className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 overflow-hidden shrink-0 hover:ring-2 hover:ring-amber-500 transition-all cursor-pointer text-left"
                                                                    title="학생 상세 정보 보기"
                                                                >
                                                                    <img src={student.visualUrl} alt={student.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                                                </button>
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="flex items-center justify-between">
                                                                        <button 
                                                                            type="button"
                                                                            onClick={() => setSelectedDetailStudent(student)}
                                                                            className="font-bold text-sm text-slate-100 truncate hover:text-amber-400 text-left cursor-pointer"
                                                                        >
                                                                            {student.name}
                                                                        </button>
                                                                        <span className="text-[10px] text-pink-400 font-bold bg-pink-950/40 px-1.5 py-0.5 rounded border border-pink-900/40">♥ {student.affection}</span>
                                                                    </div>
                                                                    <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                                                                        {student.age} • Lv.{student.level} • {student.personality}
                                                                    </p>
                                                                    <div className="mt-1 flex items-center gap-1">
                                                                        <span className="text-[10px] text-emerald-400 font-medium bg-emerald-950/50 border border-emerald-800/40 px-1.5 py-0.5 rounded">
                                                                            수련생 (전투계열 미설정)
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            {/* 학생의 현재 고민 & 추천 지도 힌트 */}
                                                            <div className="bg-slate-900/80 border border-slate-800 p-2 rounded-xl">
                                                                <div className="text-[11px] text-amber-300 font-bold mb-0.5 truncate">
                                                                    고민: {analysis.worryTitle}
                                                                </div>
                                                                <div className="text-[10px] text-blue-300 truncate">
                                                                    추천 지도: {analysis.recommendedCategoryName}
                                                                </div>
                                                            </div>
                                                            
                                                            <div className="grid grid-cols-4 gap-1.5">
                                                                <button 
                                                                    type="button"
                                                                    onClick={() => setSelectedDetailStudent(student)}
                                                                    className="py-2 bg-slate-900 hover:bg-slate-800 text-slate-200 rounded-lg text-[11px] font-bold border border-slate-700 hover:border-slate-500 transition-all flex items-center justify-center cursor-pointer"
                                                                >
                                                                    정보
                                                                </button>
                                                                <button 
                                                                    type="button"
                                                                    disabled={!cd.canMentor}
                                                                    onClick={() => handleStudentInteraction(student.id, "Advice")}
                                                                    className={`py-2 rounded-lg text-[11px] font-bold border transition-all flex items-center justify-center ${
                                                                        cd.canMentor
                                                                            ? "bg-blue-950/60 hover:bg-blue-900/70 text-blue-300 border-blue-800/60 hover:border-blue-500 cursor-pointer"
                                                                            : "bg-slate-900 text-slate-500 border-slate-800 cursor-not-allowed"
                                                                    }`}
                                                                    title={cd.canMentor ? "조언하기" : `7일에 1회 가능 (${cd.daysRemaining}일 후 가능)`}
                                                                >
                                                                    {cd.canMentor ? "조언" : `조언(D-${cd.daysRemaining})`}
                                                                </button>
                                                                <button 
                                                                    type="button"
                                                                    disabled={!cd.canMentor}
                                                                    onClick={() => handleStudentInteraction(student.id, "Praise")}
                                                                    className={`py-2 rounded-lg text-[11px] font-bold border transition-all flex items-center justify-center ${
                                                                        cd.canMentor
                                                                            ? "bg-amber-950/60 hover:bg-amber-900/70 text-amber-300 border-amber-800/60 hover:border-amber-500 cursor-pointer"
                                                                            : "bg-slate-900 text-slate-500 border-slate-800 cursor-not-allowed"
                                                                    }`}
                                                                    title={cd.canMentor ? "칭찬하기" : `7일에 1회 가능 (${cd.daysRemaining}일 후 가능)`}
                                                                >
                                                                    {cd.canMentor ? "칭찬" : `칭찬(D-${cd.daysRemaining})`}
                                                                </button>
                                                                <button 
                                                                    type="button"
                                                                    onClick={() => setChatStudent(student)}
                                                                    className="py-2 bg-cyan-950/60 hover:bg-cyan-900/70 text-cyan-300 rounded-lg text-[11px] font-bold border border-cyan-800/60 hover:border-cyan-500 transition-all flex items-center justify-center cursor-pointer"
                                                                >
                                                                    대화
                                                                </button>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>

                                            {/* 본격적인 강의 시작 버튼 (3주차 해금, 한달 이내 마무리) */}
                                            <button 
                                                onClick={handleStartInstructorQuest} 
                                                disabled={!questProgress.canStartLecture}
                                                className={`w-full py-4 rounded-2xl shadow-lg flex items-center justify-center transition-all transform ${
                                                    questProgress.canStartLecture
                                                        ? "bg-gradient-to-r from-amber-700 to-amber-600 hover:from-amber-600 hover:to-amber-500 text-white shadow-amber-900/20 active:scale-[0.98] cursor-pointer"
                                                        : questProgress.isExpired
                                                            ? "bg-rose-950/60 border border-rose-800 text-rose-300 cursor-not-allowed shadow-none"
                                                            : "bg-slate-900 border border-slate-700/80 text-slate-400 cursor-not-allowed shadow-none"
                                                }`}
                                            >
                                                {questProgress.canStartLecture ? (
                                                    <GraduationCap size={24} className="mr-2 text-amber-300"/>
                                                ) : (
                                                    <Lock size={22} className="mr-2 text-slate-500"/>
                                                )}
                                                <div className="text-left">
                                                    <div className="text-lg leading-tight font-bold">
                                                        {questProgress.canStartLecture
                                                            ? `본격적인 강의 시작 (마감까지 D-${questProgress.daysRemainingToDeadline}일)`
                                                            : questProgress.isExpired
                                                                ? "강의 기한 만료 (30일 초과)"
                                                                : "본격적인 강의 시작 [3주차 해금]"
                                                        }
                                                    </div>
                                                    <div className={`text-[10px] font-normal ${questProgress.canStartLecture ? "text-amber-200 opacity-80" : "text-slate-500"}`}>
                                                        {questProgress.canStartLecture
                                                            ? "학생들에게 당신의 지식을 전수합니다. (한 달 이내 완료 필수)"
                                                            : questProgress.isExpired
                                                                ? "의뢰 마감 기한인 30일이 지나 의뢰가 실패 처리되었습니다."
                                                                : `현재 ${questProgress.daysElapsed}일차 (${questProgress.currentWeek}주차) • ${questProgress.daysRemainingToUnlock}일 후 강의를 시작할 수 있습니다.`
                                                        }
                                                    </div>
                                                </div>
                                            </button>
                                        </div>
                                    )})()}
                                     <div className="col-span-1 md:col-span-1 bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col items-center justify-between">
                                        <div className="flex flex-col w-full mb-2">
                                            <span className="font-bold text-slate-300 mb-1 flex items-center text-xs justify-center"><Target size={14} className="mr-1"/> 무기학</span>
                                            <select className="bg-slate-900 border border-slate-700 rounded p-1 text-xs text-slate-300 outline-none" value={selectedWeapon} onChange={(e) => setSelectedWeapon(e.target.value as WeaponType)}>
                                                {Object.entries(WEAPON_TYPE_KOREAN).map(([k, v]) => (<option key={k} value={k}>{v}</option>))}
                                            </select>
                                        </div>
                                        <button onClick={() => handleTakeClass('Weapon')} className="w-full py-1.5 bg-slate-800 hover:bg-green-900/30 border border-slate-700 hover:border-green-500 rounded text-slate-300 font-bold transition-all text-xs">수강</button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {currentZone === 'Club' && (
                            <ClubModal character={character} onUpdateCharacter={onUpdateCharacter} />
                        )}

                         {currentZone === 'Library' && (
                            <div className="space-y-6">
                                <h3 className="text-xl font-bold text-slate-200 border-b border-slate-700 pb-2 mb-4">도서관</h3>
                                <p className="text-sm text-slate-400 mb-4">독서는 마음의 양식입니다. (1주일 소요)</p>
                                <div className="flex flex-col gap-4">
                                    <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex justify-between items-center">
                                        <div><h4 className="font-bold text-indigo-400">일반 열람실</h4><p className="text-xs text-slate-500">안전한 마법 이론과 역사를 공부합니다. (INT 상승)</p></div>
                                        <button onClick={() => handleLibraryAction('Normal')} className="px-6 py-2 bg-indigo-900/30 hover:bg-indigo-900/50 border border-indigo-700 text-indigo-300 rounded font-bold transition-all">독서하기</button>
                                    </div>
                                    <div className="bg-slate-950 p-4 rounded-xl border border-red-900/30 relative overflow-hidden group">
                                        <div className="absolute inset-0 bg-red-900/5 opacity-0 group-hover:opacity-10 transition-opacity pointer-events-none sovereignty"></div>
                                        <div className="flex justify-between items-center relative z-10">
                                            <div><h4 className="font-bold text-red-400 flex items-center"><Lock size={14} className="mr-2"/> 금서 구역</h4><p className="text-xs text-slate-500">위험하지만 강력한 지식이 잠들어 있습니다. <span className="text-red-500">발각 시 징계 위험!</span></p></div>
                                            <button onClick={() => handleLibraryAction('Forbidden')} className="px-6 py-2 bg-red-900/20 hover:bg-red-900/40 border border-red-700/50 text-red-400 rounded font-bold transition-all flex items-center"><Eye size={16} className="mr-2"/> 몰래 열람</button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {currentZone === 'Training' && (
                             <div className="space-y-6">
                                <h3 className="text-xl font-bold text-slate-200 border-b border-slate-700 pb-2 mb-4">전투 훈련장</h3>
                                
                                {/* Monthly Special Training Section */}
                                <div className="bg-slate-950 p-6 rounded-3xl border border-amber-900/50 shadow-lg mb-8 relative overflow-hidden">
                                    <div className="absolute top-0 right-0 p-10 opacity-5"><Target size={150}/></div>
                                    <div className="relative z-10">
                                        <div className="flex justify-between items-start mb-4">
                                            <div>
                                                <h4 className="text-xl font-bold text-amber-500 flex items-center"><Sparkles size={20} className="mr-2 animate-pulse"/> 월간 특별 수련</h4>
                                                <p className="text-xs text-slate-500 mt-1">한 달에 한 번, 집중적인 수련으로 능력치를 고속 성장시킵니다.</p>
                                            </div>
                                            <div className={`px-4 py-1 rounded-full border font-bold text-xs ${isTrainingDone ? 'bg-red-900/30 border-red-700 text-red-400' : 'bg-green-900/30 border-green-700 text-green-400 animate-pulse'}`}>
                                                {isTrainingDone ? '이번 달 완료' : '수련 가능'}
                                            </div>
                                        </div>
                                        
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <button 
                                                onClick={() => { if(!isTrainingDone) { setTrainingMode('Solo'); setShowTrainingPicker(true); } }}
                                                disabled={isTrainingDone}
                                                className={`p-4 rounded-2xl border flex items-center transition-all ${isTrainingDone ? 'bg-slate-900 border-slate-800 opacity-50 cursor-not-allowed' : 'bg-slate-800 border-slate-700 hover:border-amber-500 hover:bg-amber-900/10'}`}
                                            >
                                                <div className="p-2 bg-slate-950 rounded-lg mr-3 text-amber-500"><User size={20}/></div>
                                                <div className="text-left">
                                                    <div className="text-sm font-bold text-slate-200">개인 훈련</div>
                                                    <div className="text-[10px] text-slate-500">지정 능력치 +1 (확률적 +2)</div>
                                                </div>
                                            </button>
                                            <button 
                                                onClick={() => { if(!isTrainingDone) { setTrainingMode('Joint'); setShowTrainingPicker(true); } }}
                                                disabled={isTrainingDone}
                                                className={`p-4 rounded-2xl border flex items-center transition-all ${isTrainingDone ? 'bg-slate-900 border-slate-800 opacity-50 cursor-not-allowed' : 'bg-slate-800 border-slate-700 hover:border-indigo-500 hover:bg-indigo-900/10'}`}
                                            >
                                                <div className="p-2 bg-slate-950 rounded-lg mr-3 text-indigo-400"><UserCheck size={20}/></div>
                                                <div className="text-left">
                                                    <div className="text-sm font-bold text-slate-200">합동 훈련</div>
                                                    <div className="text-[10px] text-slate-500">능력치 상승 + 친구 호감도 +5</div>
                                                </div>
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <button onClick={() => handleTrainingAction('PvE')} className="p-6 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-left group">
                                        <h4 className="text-lg font-bold text-white mb-2 group-hover:text-amber-400">모의전 (PvE)</h4>
                                        <p className="text-sm text-slate-400">훈련용 몬스터를 상대로 기술을 연마합니다. (1일 소요)<br/><span className="text-xs text-slate-500">(난이도: {school.tier === 'Elementary' || school.tier === '초급' ? 'Lv.1~10' : school.tier === 'Middle' || school.tier === '중급' ? 'Lv.11~20' : 'Lv.21~30'})</span></p>
                                    </button>
                                    <button onClick={() => handleTrainingAction('PvP')} className="p-6 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-left group">
                                        <h4 className="text-lg font-bold text-white mb-2 group-hover:text-red-400">대련 (PvP)</h4>
                                        <p className="text-sm text-slate-400">학급 동료를 선택하여 대련합니다. (1일 소요, 호감도 +5 상승)</p>
                                    </button>
                                    <button onClick={() => handleTrainingAction('Rival')} className="p-6 bg-red-955/20 hover:bg-red-900/40 border border-red-900/50 rounded-xl text-left group col-span-1 md:col-span-2">
                                        <h4 className="text-lg font-bold text-red-400 mb-2 flex items-center"><Flame size={18} className="mr-2"/> 라이벌 결투</h4>
                                        <p className="text-sm text-red-200/70">라이벌과 진심으로 겨룹니다. (1일 소요) 승리 시 평판이 크게 상승합니다.</p>
                                    </button>
                                </div>
                            </div>
                        )}

                         {currentZone === 'Dormitory' && (
                            <div className="space-y-4 sm:space-y-6">
                                <div className="flex justify-between items-center border-b border-slate-700 pb-2 mb-2 sm:mb-4">
                                    <h3 className="text-lg sm:text-xl font-bold text-slate-200 flex items-center gap-2">
                                        <BedDouble className="text-green-400" size={22}/> 기숙사 생활관
                                    </h3>
                                    <span className="text-xs text-slate-400">보유 골드: <span className="text-amber-400 font-bold">{character.money || 0} G</span></span>
                                </div>

                                {/* Main Actions Grid */}
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
                                    <button 
                                        onClick={() => setShowSocialModal(true)} 
                                        className="p-3 sm:p-4 bg-gradient-to-br from-pink-950/40 via-slate-900 to-slate-950 hover:from-pink-900/50 hover:to-slate-900 border border-pink-500/50 hover:border-pink-400 rounded-2xl flex flex-col items-center justify-center text-center transition-all shadow-[0_0_15px_rgba(244,114,182,0.1)] group active:scale-98"
                                    >
                                        <div className="p-2.5 bg-pink-500/20 rounded-xl text-pink-400 mb-2 group-hover:scale-110 transition-transform">
                                            <PartyPopper size={24}/>
                                        </div>
                                        <span className="font-bold text-pink-200 text-xs sm:text-sm">기숙사 친목 활동</span>
                                        <span className="text-[10px] text-pink-300/70 mt-0.5">야식 파티 • 티타임 • 보드게임 • 선물</span>
                                    </button>

                                    <button 
                                        onClick={() => handleDormAction('Rest')} 
                                        className="p-3 sm:p-4 bg-slate-900 hover:bg-green-950/30 border border-slate-700 hover:border-green-500 rounded-2xl flex flex-col items-center justify-center text-center transition-all group active:scale-98"
                                    >
                                        <div className="p-2.5 bg-green-500/20 rounded-xl text-green-400 mb-2 group-hover:scale-110 transition-transform">
                                            <BedDouble size={24}/>
                                        </div>
                                        <span className="font-bold text-slate-200 text-xs sm:text-sm">휴식 취하기 (1일)</span>
                                        <span className="text-[10px] text-slate-400 mt-0.5">체력 & 마력 완전 회복</span>
                                    </button>

                                    <button 
                                        onClick={() => handleDormAction('VisitClass')} 
                                        className="p-3 sm:p-4 bg-slate-900 hover:bg-indigo-950/30 border border-slate-700 hover:border-indigo-500 rounded-2xl flex flex-col items-center justify-center text-center transition-all group active:scale-98"
                                    >
                                        <div className="p-2.5 bg-indigo-500/20 rounded-xl text-indigo-400 mb-2 group-hover:scale-110 transition-transform">
                                            <Shuffle size={24}/>
                                        </div>
                                        <span className="font-bold text-slate-200 text-xs sm:text-sm">다른 반 친구 찾기</span>
                                        <span className="text-[10px] text-slate-400 mt-0.5">새로운 급우들과 교류 & 영입</span>
                                    </button>
                                </div>

                                {/* Classmate List */}
                                <div className="bg-slate-950 rounded-2xl border border-slate-800 p-3 sm:p-4 flex flex-col h-[420px] md:h-auto">
                                    <div className="flex justify-between items-center mb-3">
                                        <h4 className="text-xs sm:text-sm font-bold text-slate-400 uppercase tracking-wider">우리 반 친구 목록 ({school.classmates.length}명)</h4>
                                        <span className="text-[11px] text-pink-400/80">호감도 75 이상 시 동료 영입 가능</span>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-3 overflow-y-auto custom-scrollbar flex-1 pr-1">
                                        {school.classmates.map((student, idx) => {
                                            const alreadyRecruited = isAlreadyRecruited(student.id);
                                            return (
                                                <div key={idx} className={`flex flex-col p-2.5 sm:p-3 rounded-xl border group transition-all text-left gap-2 ${alreadyRecruited ? 'bg-slate-900/40 border-slate-800/80 opacity-70' : 'bg-slate-900/90 hover:bg-slate-850 border-slate-750 hover:border-slate-600'}`}>
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center min-w-0 pr-2">
                                                            <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-600 flex items-center justify-center mr-2.5 relative shrink-0 overflow-hidden">
                                                                {student.visualUrl ? (
                                                                    <img src={student.visualUrl} alt={student.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                                                ) : (
                                                                    <User size={18} className="text-slate-400"/>
                                                                )}
                                                                {student.isRival && <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border border-slate-900" title="Rival"></span>}
                                                            </div>
                                                            <div className="min-w-0">
                                                                <div className="text-xs sm:text-sm font-bold text-slate-200 flex items-center gap-1 truncate">
                                                                    <span className="truncate">{student.name}</span>
                                                                    <span className="text-[10px] text-amber-400/90 shrink-0">Lv.{student.level}</span>
                                                                    {student.isRival && <span className="text-[8px] text-red-400 border border-red-900/80 px-1 rounded bg-red-950/50 shrink-0">RIVAL</span>}
                                                                </div>
                                                                <div className="text-[10px] text-slate-400 truncate flex items-center gap-2 mt-0.5">
                                                                    {student.isRival ? (
                                                                        <>
                                                                            <span className="text-pink-400 font-bold">호감: {student.affection}</span>
                                                                            <span className="text-amber-400">존중: {student.respect || 0}</span>
                                                                            <span className="text-rose-400">긴장: {student.tension || 0}</span>
                                                                        </>
                                                                    ) : (
                                                                        <>
                                                                            <span>{student.age}</span>
                                                                            <span className="text-pink-400 font-bold">호감도: {student.affection} ♥</span>
                                                                        </>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {alreadyRecruited && (
                                                            <span className="text-[9px] font-bold text-green-400 bg-green-950/40 px-2 py-1 rounded border border-green-800/50 shrink-0">
                                                                합류함
                                                            </span>
                                                        )}
                                                    </div>

                                                    {/* Quick Actions Row */}
                                                    <div className="flex items-center gap-1.5 pt-1.5 border-t border-slate-800/80">
                                                        <button 
                                                            onClick={() => handleDormAction('Info', student.id)} 
                                                            className="flex-1 text-[11px] bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 py-1 rounded-lg transition-colors font-medium"
                                                        >
                                                            정보
                                                        </button>
                                                        {!alreadyRecruited && (
                                                            <>
                                                                {(() => {
                                                                    const canRecruitCard = student.isRival 
                                                                        ? ((student.respect || 0) >= 70 && (student.tension || 0) === 0)
                                                                        : (student.affection >= 75);
                                                                    if (canRecruitCard) {
                                                                        return (
                                                                            <button 
                                                                                onClick={() => handleDormAction('Recruit', student.id)}
                                                                                className="flex-1 text-[11px] bg-pink-700 hover:bg-pink-600 border border-pink-500/80 text-white py-1 rounded-lg transition-colors font-bold flex items-center justify-center gap-1 shadow-md animate-pulse"
                                                                                title="동료로 영입"
                                                                            >
                                                                                <UserPlus size={12}/> 영입
                                                                            </button>
                                                                        );
                                                                    }
                                                                    return null;
                                                                })()}
                                                                <button 
                                                                    onClick={() => handleSocialActivity('tea', student)}
                                                                    disabled={(character.money || 0) < 100}
                                                                    className="flex-1 text-[11px] bg-slate-800 hover:bg-amber-950/50 border border-slate-700 hover:border-amber-500/50 text-amber-300 py-1 rounded-lg transition-colors font-medium flex items-center justify-center gap-1 disabled:opacity-40"
                                                                    title="심야 티타임 (10000 Gold)"
                                                                >
                                                                    <Coffee size={12}/> 티타임
                                                                </button>
                                                                <button 
                                                                    onClick={() => handleSocialActivity('gift', student)}
                                                                    disabled={(character.money || 0) < 500}
                                                                    className="flex-1 text-[11px] bg-slate-800 hover:bg-purple-950/50 border border-slate-700 hover:border-purple-500/50 text-purple-300 py-1 rounded-lg transition-colors font-medium flex items-center justify-center gap-1 disabled:opacity-40"
                                                                    title="선물 전달 (50000 Gold)"
                                                                >
                                                                    <Gift size={12}/> 선물
                                                                </button>
                                                                <button 
                                                                    onClick={() => handleDormAction('Hangout', student.id)} 
                                                                    className="flex-1 text-[11px] bg-slate-800 hover:bg-pink-950/50 border border-slate-700 hover:border-pink-500/50 text-pink-300 py-1 rounded-lg transition-colors font-medium flex items-center justify-center gap-1"
                                                                    title="AI 대화"
                                                                >
                                                                    <Smile size={12}/> 대화
                                                                </button>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SchoolModal;
