
import { Character, JobType, Companion,ClubType, ClassTier, SimpleStudent, Location } from './types';
import { SCHOOL_CONFIG, START_DATE } from './constants';
import { generateClassmates, addDays, calculateAgeFromYear, getYear, assignRandomCombatStyle } from './utils';

interface SchoolLifeResult {
    processed: boolean;
    logMsg: string;
}

/** 
 * [NEW] 평생 인연 아카이빙 헬퍼
 * 학년이 바뀌거나 졸업할 때 의미 있는 NPC들을 socialNetwork에 저장합니다.
 */
const archiveSocialNetwork = (char: Character) => {
    if (!char.socialNetwork) char.socialNetwork = [];

    const currentYear = getYear(char.currentDate || '2000-01-01');

    // 1. 학급 친구 리스트
    const classmates = char.schoolData?.classmates || [];
    // 2. 동아리원 리스트 (추가)
    const clubMembers = char.clubData?.clubMembers || [];

    const npcSources = [
        ...classmates.map(n => ({ ...n, origin: n.origin || 'School', originName: n.originName || char.schoolData?.schoolName })),
        ...clubMembers.map(n => ({ ...n, origin: n.origin || 'Club', originName: n.originName || char.clubData?.joinedClub }))
    ];

    npcSources.forEach(npc => {
        // [MODIFIED] 호감도가 0이 아니거나 라이벌이거나 대화 기록이 있는 경우 평생 인연으로 등록/업데이트
        if (npc.affection !== 0 || npc.isRival || (npc.chatHistory && npc.chatHistory.length > 0)) {
            const existingIdx = char.socialNetwork!.findIndex(sn => sn.id === npc.id);
            
            const updatedNpc = assignRandomCombatStyle({ ...npc }, true);
            if (updatedNpc.birthYear) {
                updatedNpc.age = calculateAgeFromYear(updatedNpc.birthYear, currentYear);
            }

            if (existingIdx !== -1) {
                char.socialNetwork![existingIdx] = updatedNpc as any;
            } else {
                char.socialNetwork!.push(updatedNpc as any);
            }
        }
    });
};

/**
 * 학교 생활(진급, 진학, 졸업) 관련 로직을 처리합니다.
 */
export const handleSchoolPromoteAction = (
    actionText: string,
    character: Character,
    setCharacterSafe: (update: (prev: Character) => Character) => void,
    addMemory: (char: Character, text: string) => void,
    onClose?: () => void
): SchoolLifeResult => {
    let processed = false;
    let logMsg = "";

    if (actionText.includes('진급 (학년 상승)')) {
        setCharacterSafe(prev => {
            const next = { ...prev };
            if (next.schoolData) {
                // 인연 아카이빙 수행
                archiveSocialNetwork(next);

                // 1. 라이벌 성장 로직
                const currentRival = next.schoolData.classmates.find(s => s.isRival);
                if (currentRival) {
                    currentRival.level += 1;
                    const growth = 5;
                    currentRival.stats = {
                        ...currentRival.stats,
                        str: (currentRival.stats.str || 0) + growth,
                        int: (currentRival.stats.int || 0) + growth,
                        def: (currentRival.stats.def || 0) + growth,
                        agi: (currentRival.stats.agi || 0) + growth,
                        hp: (currentRival.stats.hp || 100) + 100
                    };
                    if (!currentRival.memories) currentRival.memories = [];
                    currentRival.memories.push(`${next.schoolData.grade + 1}학년으로 함께 진급함`);
                }

                // 2. 보존할 친구들 (호감도 양수)
                const survivingFriends = next.schoolData.classmates.filter(
                    s => !s.isRival && s.affection > 0
                );

                // 3. 캐릭터 성장 및 학교 데이터 업데이트
                next.schoolData.grade += 1;
                next.schoolData.homeroomTeacher = undefined;
                next.schoolData.semester = 1;
                next.schoolData.midtermPassed = false;
                next.schoolData.finalPassed = false;
                next.schoolData.lastExamDate = undefined;
                next.level += 1;
                next.statPoints += 10;
                next.stats.str += 2; 
                next.stats.int += 2; 
                next.stats.def += 2; 
                next.stats.agi += 2; 
                next.stats.maxHp += 50; 
                next.stats.hp = next.stats.maxHp;
                
                const nextClassNumber = Math.floor(Math.random() * 5) + 1;
                next.schoolData.classNumber = nextClassNumber;
                
                const schoolNation = next.currentLocation?.nation || next.nation;
                const currentYear = getYear(next.currentDate || '2000-01-01');
                
                // 4. 새로운 반 친구 생성 (기존 인연 포함)
                next.schoolData.classmates = generateClassmates(
                    schoolNation, 
                    14, 
                    next.schoolData.tier, 
                    next.schoolData.grade, 
                    survivingFriends, 
                    nextClassNumber,
                    currentRival,
                    false,
                    currentYear
                );
                     
                if (next.clubData) {
                    next.clubData.clubMembers = undefined;
                }

                // 5. 날짜 변경 (다음 해 3월 2일)
                const dateParts = prev.currentDate?.split('-') || ['2000', '03', '02'];
                const yearValue = parseInt(dateParts[0]);
                const currentMonth = parseInt(dateParts[1]);
                const nextSchoolYear = (currentMonth < 3) ? yearValue : yearValue + 1;
                next.currentDate = `${nextSchoolYear}-03-02`;

                if (next.base) {
                    next.base.dailyCounts = {};
                    next.base.lastDailyReset = next.currentDate;
                }
                addMemory(next, `${next.schoolData.grade}학년으로 진급`);
            }
            return next;
        });
        const dParts = character.currentDate?.split('-') || ['2000', '03', '02'];
        const cYear = parseInt(dParts[0]);
        const cMonth = parseInt(dParts[1]);
        const targetSchoolYear = (cMonth < 3) ? cYear : cYear + 1;
        logMsg = `[시스템] 새 학년으로 진급했습니다. (${targetSchoolYear}년 3월)`;
        processed = true;
    } else if (actionText.includes('진학 (지역 유지)')) {
         setCharacterSafe(prev => {
             const next = { ...prev };
             if (next.schoolData) {
                 // 인연 아카이빙
                 archiveSocialNetwork(next);

                 const nextTier = next.schoolData.tier === 'Elementary' ? 'Middle' : 'High';
                 next.schoolData.tier = nextTier as any;
                 next.schoolData.homeroomTeacher = undefined;
                 next.schoolData.grade = 1;
                 next.schoolData.semester = 1;
                 next.schoolData.midtermPassed = false;
                 next.schoolData.finalPassed = false;
                 next.schoolData.lastExamDate = undefined;
                 const config = SCHOOL_CONFIG[nextTier as any];
                 next.schoolData.schoolName = `${next.currentLocation?.city} ${config.name}`;
                 next.level += 1; 
                 next.statPoints += 10;
                 const schoolNation = next.currentLocation?.nation || next.nation;
                 const currentYear = getYear(next.currentDate || '2000-01-01');
                 
                 // 진학 시에는 전 학년 친구들 중 호감도 높은 일부가 같은 학교에 진학했다고 가정
                 const advancingFriends = next.socialNetwork?.filter(sn => sn.affection >= 50).slice(0, 3) || [];
                 
                 next.schoolData.classmates = generateClassmates(schoolNation, 14, nextTier as any, 1, advancingFriends, next.schoolData.classNumber, undefined, false, currentYear);
                 
                 if (next.clubData) {
                     next.clubData.clubMembers = undefined;
                 }

                 const dateParts = prev.currentDate?.split('-') || ['2000', '03', '02'];
                 const yearValue = parseInt(dateParts[0]);
                 const currentMonth = parseInt(dateParts[1]);
                 const nextSchoolYear = (currentMonth < 3) ? yearValue : yearValue + 1;
                 next.currentDate = `${nextSchoolYear}-03-02`;

                 if (next.base) {
                     next.base.dailyCounts = {};
                     next.base.lastDailyReset = next.currentDate;
                 }
                 addMemory(next, `${next.schoolData.schoolName} 입학`);
             }
             return next;
         });
         const dParts = character.currentDate?.split('-') || ['2000', '03', '02'];
         const cYear = parseInt(dParts[0]);
         const cMonth = parseInt(dParts[1]);
         const targetSchoolYear = (cMonth < 3) ? cYear : cYear + 1;
         logMsg = `[시스템] 상급 학교로 진학했습니다. (${targetSchoolYear}년 3월)`;
         processed = true;
    } else if (actionText.includes('진학 (전학:')) {
         const match = actionText.match(/전학:\s*([^/]+)\/([^/]+)\/([^)]+)/);
         if (match) {
             const [_, region, nation, city] = match;
             setCharacterSafe(prev => {
                 const next = { ...prev };
                 if (next.schoolData) {
                     // 인연 아카이빙
                     archiveSocialNetwork(next);

                     const nextTier = next.schoolData.tier === 'Elementary' ? 'Middle' : 'High';
                     next.currentLocation = { region, nation, city }; 
                     next.schoolData.tier = nextTier as any;
                     next.schoolData.homeroomTeacher = undefined;
                     next.schoolData.grade = 1;
                     next.schoolData.semester = 1;
                     next.schoolData.midtermPassed = false;
                     next.schoolData.finalPassed = false;
                     next.schoolData.lastExamDate = undefined;
                     const config = SCHOOL_CONFIG[nextTier as any];
                     next.schoolData.schoolName = `${city} ${config.name}`;
                     next.level += 1;
                     next.statPoints += 10;
                     const currentYear = getYear(next.currentDate || '2000-01-01');
                     next.schoolData.classmates = generateClassmates(nation, 14, nextTier as any, 1, [], next.schoolData.classNumber, undefined, false, currentYear);
                     
                     if (next.clubData) {
                         next.clubData.clubMembers = undefined;
                     }

                     const dateParts = prev.currentDate?.split('-') || ['2000', '03', '02'];
                     const yearValue = parseInt(dateParts[0]);
                     const currentMonth = parseInt(dateParts[1]);
                     const nextSchoolYear = (currentMonth < 3) ? yearValue : yearValue + 1;
                     next.currentDate = `${nextSchoolYear}-03-02`;

                     if (next.base) {
                         next.base.dailyCounts = {};
                         next.base.lastDailyReset = next.currentDate;
                     }
                     addMemory(next, `${city} 지역의 ${next.schoolData.schoolName}으로 전학 및 진학`);
                 }
                 return next;
             });
             const dParts = character.currentDate?.split('-') || ['2000', '03', '02'];
             const cYear = parseInt(dParts[0]);
             const cMonth = parseInt(dParts[1]);
             const targetSchoolYear = (cMonth < 3) ? cYear : cYear + 1;
             logMsg = `[시스템] ${city}(으)로 전학하여 진학했습니다. (${targetSchoolYear}년 3월)`;
             processed = true;
         }
    } else if (actionText.includes('고등학교 졸업 (사회인 진출)')) {
         setCharacterSafe(prev => {
             const next = { ...prev };
             if (next.schoolData) {
                 // 인연 아카이빙 수행 (졸업하는 친구들을 영구 인연으로 전환)
                 archiveSocialNetwork(next);

                 next.schoolData.isGraduated = true;
                 next.schoolData.tier = 'University'; 
                 next.job = JobType.UNEMPLOYED; 
                 const graduateStudent = (c: Companion) => {
                     if (c.job === JobType.STUDENT || c.classType.includes("학생")) {
                         return { ...c, job: JobType.UNEMPLOYED, classType: "사회인 (졸업)" };
                     }
                     return c;
                 };
                 next.companions = next.companions.map(graduateStudent);
                 if (next.inactiveCompanions) {
                     next.inactiveCompanions = next.inactiveCompanions.map(graduateStudent);
                 }
                 
                 // 현재 학급 명단을 비움으로써 과거 인연으로 이동하게 함
                 next.schoolData.classmates = [];
                 next.clubData = { joinedClub: ClubType.NONE, activityCount: 0, contribution: 0 };

                 const dateParts = prev.currentDate?.split('-') || ['2000', '03', '02'];
                 const yearValue = parseInt(dateParts[0]);
                 const currentMonth = parseInt(dateParts[1]);
                 const nextSchoolYear = (currentMonth < 3) ? yearValue : yearValue + 1;
                 next.currentDate = `${nextSchoolYear}-03-02`;

                 if (next.base) {
                     next.base.dailyCounts = {};
                     next.base.lastDailyReset = next.currentDate;
                 }
                 addMemory(next, `고등학교 졸업 및 사회인 진출`);
             }
             return next;
         });
         logMsg = `[시스템] 졸업을 축하합니다! 이제 사회인(무직)으로서 자유롭게 활동할 수 있습니다. 함께 수학한 동료들도 사회로 진출하며 과거의 인연이 되었습니다.`;
         processed = true;
    }

    if (processed && onClose) {
        onClose();
    }

    return { processed, logMsg };
};
