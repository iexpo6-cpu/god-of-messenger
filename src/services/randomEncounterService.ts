import { Character, Companion, Location, GameLocation, JobType, ClassTier } from '../types';
import { getPersonLocation } from '../utils';
import { SHINRYOKU_TYPES_LIST } from '../constants';

// 날짜, 도시, 인물 ID를 이용해 0~1 사이의 일관된 일일 난수 생성
function getDailySeedRandom(dateStr: string, cityStr: string, personId: string): number {
    const str = `${dateStr}_${cityStr}_${personId}_encounter`;
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = (hash << 5) - hash + str.charCodeAt(i);
        hash |= 0;
    }
    const x = Math.sin(hash) * 10000;
    return x - Math.floor(x);
}

/**
 * 오늘 해당 도시의 거주지구에서 우연히 마주칠 수 있는 과거 인연 NPC 목록 산출
 */
export function getDailyRandomEncounters(character: Character, currentLoc: Location | GameLocation): Companion[] {
    if (!currentLoc || !currentLoc.city || !currentLoc.nation) return [];

    const partyIds = new Set((character.companions || []).map(c => c.id));
    const severedIds = new Set(character.severedRelations || []);

    const candidateMap = new Map<string, any>();

    // 1. 학창 시절 동창 (classmates)
    if (character.schoolData?.classmates) {
        character.schoolData.classmates.forEach(s => {
            if (!s.isDead && !partyIds.has(s.id) && !severedIds.has(s.id)) {
                if (!candidateMap.has(s.id)) candidateMap.set(s.id, s);
            }
        });
    }

    // 2. 동아리 부원 (clubMembers)
    if (character.clubData?.clubMembers) {
        character.clubData.clubMembers.forEach(m => {
            if (!m.isDead && !partyIds.has(m.id) && !severedIds.has(m.id)) {
                if (!candidateMap.has(m.id)) candidateMap.set(m.id, m);
            }
        });
    }

    // 3. 성전 접견실 방문자 (templeVisitors)
    if (character.base?.templeVisitors) {
        Object.values(character.base.templeVisitors).forEach((vList: any) => {
            if (Array.isArray(vList)) {
                vList.forEach(v => {
                    if (!v.isDead && !partyIds.has(v.id) && !severedIds.has(v.id)) {
                        if (!candidateMap.has(v.id)) candidateMap.set(v.id, v);
                    }
                });
            }
        });
    }

    const today = character.currentDate || '2000-01-01';
    const encounters: Companion[] = [];

    candidateMap.forEach((person) => {
        const personLoc = getPersonLocation(person, character);
        // 위치가 현재 국가/도시와 정확히 일치하는지 검증
        if (personLoc && personLoc.nation === currentLoc.nation && personLoc.city === currentLoc.city) {
            // 25%의 일일 확률로 오늘 거주지구에서 우연히 노출 (이벤트 발생률 상향)
            const randVal = getDailySeedRandom(today, currentLoc.city, person.id);
            if (randVal < 0.25) {
                encounters.push(person as Companion);
            }
        }
    });

    return encounters;
}

// 무작위 인연 생성용 성/이름 목록
const LAST_NAMES = ['김', '이', '박', '최', '정', '강', '조', '윤', '장', '임', '한', '오', '서', '신', '권', '황', '안', '송', '류', '전'];
const MALE_NAMES = ['민준', '서준', '도윤', '예준', '시우', '하준', '주원', '지호', '지후', '준서', '준혁', '성민', '현우', '우진', '건우'];
const FEMALE_NAMES = ['서연', '서윤', '지우', '서현', '하은', '하윤', '민서', '지유', '윤서', '채원', '수아', '지아', '다은', '예은', '소율'];

const JOBS: JobType[] = [
    JobType.STUDENT, JobType.MERCENARY, JobType.TEACHER, JobType.BLACKSMITH, 
    JobType.ALCHEMIST, JobType.CHEF, JobType.TRAINER, JobType.RESEARCHER, JobType.UNEMPLOYED
];

/**
 * 인연 소개 시 새롭게 소개받는 지인 NPC 생성
 */
export function generateIntroducedFriend(introducer: Companion, currentLocation: Location | GameLocation): Companion {
    const isMale = Math.random() < 0.5;
    const gender = isMale ? '남성' : '여성';
    const lastName = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
    const firstNameList = isMale ? MALE_NAMES : FEMALE_NAMES;
    const firstName = firstNameList[Math.floor(Math.random() * firstNameList.length)];
    const name = `${lastName}${firstName}`;

    const job = JOBS[Math.floor(Math.random() * JOBS.length)];
    const shinryokuType = SHINRYOKU_TYPES_LIST[Math.floor(Math.random() * SHINRYOKU_TYPES_LIST.length)];
    const level = Math.max(1, Math.min(30, (introducer.level || 10) + Math.floor(Math.random() * 7) - 3));

    const id = `introduced_${Date.now()}_${Math.floor(Math.random() * 10000)}`;

    const newFriend: Companion = {
        id,
        name,
        gender,
        age: `${17 + Math.floor(Math.random() * 10)}세`,
        race: introducer.race || '인간',
        nation: currentLocation.nation || '대한민국',
        appearance: `${introducer.name}님의 소개로 만난 정다운 인상`,
        personality: '친근함',
        job,
        classType: '전사',
        level,
        currentExp: 0,
        maxExp: level * 100,
        statPoints: 0,
        classTier: ClassTier.NONE,
        shinryokuType,
        stats: {
            str: 10 + Math.floor(Math.random() * 10),
            agi: 10 + Math.floor(Math.random() * 10),
            int: 10 + Math.floor(Math.random() * 10),
            wis: 10 + Math.floor(Math.random() * 10),
            def: 10 + Math.floor(Math.random() * 10),
            ctrl: 10 + Math.floor(Math.random() * 10),
            hp: 200 + level * 20,
            maxHp: 200 + level * 20,
            mp: 100 + level * 10,
            maxMp: 100 + level * 10,
        },
        skills: [],
        equipment: {},
        affection: 15, // 소개받았으므로 기본 호감도 15 부여
        loyalty: 50,
        ...({
            currentLocation: {
                region: currentLocation.region || '아시아',
                nation: currentLocation.nation || '대한민국',
                city: currentLocation.city || '서울'
            }
        } as any)
    };

    return newFriend;
}
