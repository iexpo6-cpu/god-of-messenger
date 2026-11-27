import { Character, JobType, SimpleStudent } from '../types';
import { WORLD_GEOGRAPHY } from '../constants';
import {
    generateCompanionStats,
    generateDefaultVisualUrl,
    generateName,
    getTierByLevel
} from '../utils';

/**
 * 학생 캐릭터의 현재 학년에 배정된 담임 교사가 없으면 생성해 반환합니다.
 * (캠퍼스 진입 시점과 교무실 모달 모두 동일한 담임 교사를 공유하도록 보장)
 */
export const ensureHomeroomTeacher = (
    character: Character
): { updatedChar: Character; createdTeacher?: SimpleStudent } => {
    if (!character.schoolData || character.job !== JobType.STUDENT) {
        return { updatedChar: character };
    }
    if (character.schoolData.homeroomTeacher) {
        return { updatedChar: character };
    }

    const teacherGender = Math.random() > 0.5 ? '남성' : '여성';
    const teacherGenderParam = teacherGender === '남성' ? 'male' : 'female';
    const teacherAge = 25 + Math.floor(Math.random() * 20);

    const teacherLevel = 50 + character.schoolData.grade * 10;
    const teacherStats = generateCompanionStats(teacherLevel);
    const teacherTier = getTierByLevel(teacherLevel);

    const mbtiTypes = [
        'ISTJ', 'ISFJ', 'INFJ', 'INTJ',
        'ISTP', 'ISFP', 'INFP', 'INTP',
        'ESTP', 'ESFP', 'ENFP', 'ENTP',
        'ESTJ', 'ESFJ', 'ENFJ', 'ENTJ'
    ];
    const teacherMBTI = mbtiTypes[Math.floor(Math.random() * mbtiTypes.length)];

    // 담임 교사 국적 생성 로직 (학교 소재지 우선, 20% 확률로 타 국적)
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

    const nextSocial = [...(character.socialNetwork || [])];
    if (!nextSocial.find(n => n.id === teacher.id)) {
        nextSocial.push(teacher);
    }

    const updatedChar: Character = {
        ...character,
        schoolData: {
            ...character.schoolData,
            homeroomTeacher: teacher
        },
        socialNetwork: nextSocial
    };

    return { updatedChar, createdTeacher: teacher };
};
