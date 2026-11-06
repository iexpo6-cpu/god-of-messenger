import { JobType } from '../types';

/**
 * 인물의 나이를 숫자로 정확히 추출합니다.
 * @param person 캐릭터, 동료, NPC 등의 객체
 * @param currentYear 현재 연도 (선택)
 */
export const getPersonAgeNumber = (person: any, currentYear?: number): number => {
    if (!person) return 20;

    // 1순위: 직접 기재된 age 속성 확인 (숫자 또는 문자열)
    if (typeof person.age === 'number' && person.age > 0) {
        return person.age;
    }
    if (typeof person.age === 'string') {
        const parsed = parseInt(person.age.replace(/[^0-9]/g, ''), 10);
        if (!isNaN(parsed) && parsed > 0) return parsed;
    }

    // 2순위: 출생 연도(birthYear)와 현재 연도 기준 계산
    const baseYear = currentYear || 2000;
    if (person.birthYear && typeof person.birthYear === 'number') {
        return Math.max(0, baseYear - person.birthYear);
    }

    // 3순위: 직업이나 신분이 학생인 경우 기본 미성년자(17세)로 간주
    const isStudent = person.job === JobType.STUDENT || 
                      person.job === '학생' || 
                      (typeof person.job === 'string' && person.job.includes('학생')) ||
                      person.classType === '학생';
    if (isStudent) return 17;

    // 그 외 성인 기본값 (20세)
    return 20;
};

/**
 * 미성년자 여부 판별 (만 20세 미만)
 */
export const isMinor = (person: any, currentYear?: number): boolean => {
    return getPersonAgeNumber(person, currentYear) < 20;
};

/**
 * 성인 여부 판별 (만 20세 이상)
 */
export const isAdult = (person: any, currentYear?: number): boolean => {
    return getPersonAgeNumber(person, currentYear) >= 20;
};

/**
 * 두 인물 간의 연애 / 썸 시작 가능 여부 판별
 * 윤리 규칙:
 * 1. 미성년자 <-> 미성년자 : 연애 시작 가능 (true)
 * 2. 성인 <-> 성인 : 연애 시작 가능 (true)
 * 3. 미성년자 <-> 성인 : 윤리적으로 연애 시작 불가 (false)
 */
export const canStartRomance = (personA: any, personB: any, currentYear?: number): boolean => {
    if (!personA || !personB) return false;

    const aIsMinor = isMinor(personA, currentYear);
    const bIsMinor = isMinor(personB, currentYear);

    // 둘의 성인/미성년자 여부가 일치할 때만 연애 시작 가능
    // (둘 다 미성년자이거나, 둘 다 성인인 경우)
    return aIsMinor === bIsMinor;
};

/**
 * 윤리적 사유로 연애가 불가한 경우 안내 문구 반환
 */
export const getRomanceEthicsNotice = (personA: any, personB: any, currentYear?: number): string | null => {
    if (canStartRomance(personA, personB, currentYear)) return null;

    const aIsMinor = isMinor(personA, currentYear);
    const aName = personA.name || '상대';
    const bName = personB.name || '상대';

    if (aIsMinor) {
        return `미성년자인 ${aName}와(과) 성인인 ${bName} 간의 교제는 윤리적으로 불가능합니다.`;
    } else {
        return `성인인 ${aName}와(과) 미성년자인 ${bName} 간의 교제는 윤리적으로 불가능합니다.`;
    }
};
