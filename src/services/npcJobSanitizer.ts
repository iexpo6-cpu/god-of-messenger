import { Character, SimpleStudent, JobType } from '../types';
import { getYear } from '../utils';

/**
 * 인물의 나이를 숫자로 반환합니다.
 */
export const getPersonAgeNumber = (person: any, currentYear?: number): number => {
    if (!person) return 0;
    // 1순위: 직접 기재된 age 속성 확인 (문자열 또는 숫자)
    if (typeof person.age === 'number' && person.age > 0) return person.age;
    if (typeof person.age === 'string') {
        const parsed = parseInt(person.age.replace(/[^0-9]/g, ''), 10);
        if (!isNaN(parsed) && parsed > 0) return parsed;
    }
    // 2순위: 출생 연도(birthYear)와 현재 연도 기준 계산
    if (person.birthYear && currentYear) {
        return Math.max(0, currentYear - person.birthYear);
    }
    if (person.birthYear) {
        return Math.max(0, 2000 - person.birthYear);
    }
    return 0;
};

/**
 * 20세 이상인 인물이 직업이 '학생'인 경우 '무직'으로 전환합니다.
 * @returns { changed: boolean, log?: string }
 */
export const fixStudentJobIfAdult = (person: any, currentYear?: number): { changed: boolean; log?: string } => {
    if (!person) return { changed: false };
    const age = getPersonAgeNumber(person, currentYear);
    
    // 20세 이상인데 직업이 '학생'이거나 관련 학생 직업인 경우
    const isStudentJob = person.job === JobType.STUDENT || 
                         person.job === '학생' || 
                         (typeof person.job === 'string' && person.job.includes('학생')) ||
                         person.classType === '학생';

    if (age >= 20 && isStudentJob) {
        person.job = JobType.UNEMPLOYED;
        if (person.classType === '학생') {
            person.classType = '무직';
        }
        const name = person.name || '알 수 없는 인물';
        return { 
            changed: true, 
            log: `[인연 소식] [${name}]이(가) ${age}세 성인이 되어 학생 신분을 마치고 무직 신분이 되었습니다.` 
        };
    }

    return { changed: false };
};

/**
 * 캐릭터 데이터 내부의 모든 관계망/인물 목록에서 20세 이상 학생을 무직으로 일괄 보정합니다.
 * 발생한 알림 로그 배열을 반환합니다.
 */
export const sanitizeCharacterStudentJobsWithLogs = (char: Character): { hasChanged: boolean; logs: string[] } => {
    if (!char) return { hasChanged: false, logs: [] };
    const currentYear = getYear(char.currentDate || '2000-01-01');
    let hasChanged = false;
    const logs: string[] = [];

    // 0. 플레이어 본인
    const selfRes = fixStudentJobIfAdult(char, currentYear);
    if (selfRes.changed) {
        hasChanged = true;
        if (selfRes.log) logs.push(`[성인] 20세 성인이 되어 학생 신분을 졸업하고 무직 신분이 되었습니다.`);
    }

    // 1. socialNetwork (과거 인연 및 관계망)
    if (char.socialNetwork && Array.isArray(char.socialNetwork)) {
        char.socialNetwork.forEach(npc => {
            const res = fixStudentJobIfAdult(npc, currentYear);
            if (res.changed) {
                hasChanged = true;
                if (res.log) logs.push(res.log);
            }
        });
    }

    // 2. 학교 학급 친구
    if (char.schoolData?.classmates && Array.isArray(char.schoolData.classmates)) {
        char.schoolData.classmates.forEach(student => {
            const res = fixStudentJobIfAdult(student, currentYear);
            if (res.changed) {
                hasChanged = true;
            }
        });
    }

    // 3. 학교 동아리원
    if (char.clubData?.clubMembers && Array.isArray(char.clubData.clubMembers)) {
        char.clubData.clubMembers.forEach(member => {
            const res = fixStudentJobIfAdult(member, currentYear);
            if (res.changed) {
                hasChanged = true;
            }
        });
    }

    // 4. 동료 및 대기 동료
    if (char.companions && Array.isArray(char.companions)) {
        char.companions.forEach(comp => {
            const res = fixStudentJobIfAdult(comp, currentYear);
            if (res.changed) {
                hasChanged = true;
                if (res.log) logs.push(res.log);
            }
        });
    }
    if (char.inactiveCompanions && Array.isArray(char.inactiveCompanions)) {
        char.inactiveCompanions.forEach(comp => {
            const res = fixStudentJobIfAdult(comp, currentYear);
            if (res.changed) {
                hasChanged = true;
                if (res.log) logs.push(res.log);
            }
        });
    }

    // 5. 활성 퀘스트 학생들
    const quests = (char as any).activeQuests || char.mercenaryData?.activeQuests;
    if (quests && Array.isArray(quests)) {
        quests.forEach((quest: any) => {
            if (quest.studentsToTeach && Array.isArray(quest.studentsToTeach)) {
                quest.studentsToTeach.forEach((st: any) => {
                    const res = fixStudentJobIfAdult(st, currentYear);
                    if (res.changed) {
                        hasChanged = true;
                    }
                });
            }
        });
    }

    return { hasChanged, logs };
};

/**
 * 기존 인터페이스 호환용 (boolean 반환)
 */
export const sanitizeCharacterStudentJobs = (char: Character): boolean => {
    return sanitizeCharacterStudentJobsWithLogs(char).hasChanged;
};

