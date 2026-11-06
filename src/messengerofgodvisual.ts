
import { JobType } from './types';
import { SEASONAL_BOSSES } from './mythicbossmonsters';

/**
 * 성별 판단 헬퍼 (여성 키워드 포함 여부 확인)
 */
const isFemale = (gender?: string): boolean => {
    if (!gender) return false;
    const lower = gender.toLowerCase();
    return ['여', 'female', 'woman', 'girl', 'lady'].some(k => lower.includes(k));
};

/**
 * 직업군 및 성별에 따른 신의 사자 외형 URL을 반환합니다.
 */
export const getMessengerVisualUrl = (job?: JobType, gender?: string): string | null => {
    if (!job) return null;

    // 각 사자별 정보 (Base Gender: true = Female, false = Male)
    const messengerConfig: Partial<Record<JobType, { bossKey: string, baseIsFemale: boolean, altUrl: string }>> = {
        [JobType.SOLAR_MESSENGER]: { 
            bossKey: "엘클", 
            baseIsFemale: false, // 남자
            altUrl: "https://i.ibb.co/Q3NfD4f4/Kakao-Talk-20251227-123310902.png" 
        },
        [JobType.FIRE_MESSENGER]: { 
            bossKey: "라페르난데스", 
            baseIsFemale: true, // 여자
            altUrl: "https://i.ibb.co/HTMMXRHW/Kakao-Talk-20251228-164732633.png" 
        },
        [JobType.RADIANT_MESSENGER]: { 
            bossKey: "줄리엣", 
            baseIsFemale: true, // 여자
            altUrl: "https://i.ibb.co/SX7sx77s/Kakao-Talk-20251228-162955581.png" 
        },
        [JobType.MOONLIGHT_MESSENGER]: { 
            bossKey: "최원한", 
            baseIsFemale: false, // 남자
            altUrl: "https://i.ibb.co/1GFBXBnz/Kakao-Talk-20251228-162955581-04.png" 
        },
        [JobType.ELECTRIC_MESSENGER]: { 
            bossKey: "권율", 
            baseIsFemale: false, // 남자
            altUrl: "https://i.ibb.co/CK6LdFYh/Kakao-Talk-20251228-162955581-05.png" 
        },
        [JobType.EARTH_MESSENGER]: { 
            bossKey: "원지원", 
            baseIsFemale: false, // 남자
            altUrl: "https://i.ibb.co/hF8pj5N6/Kakao-Talk-20251228-162955581-03.png" 
        },
        [JobType.GALE_MESSENGER]: { 
            bossKey: "블랙스톰", 
            baseIsFemale: false, // 남자
            altUrl: "https://i.ibb.co/b5hSnQVJ/Gemini-Generated-Image-yt8pt5yt8pt5yt8p.png" 
        },
        [JobType.ICE_MESSENGER]: { 
            bossKey: "이케블리자더", 
            baseIsFemale: true, // 여자
            altUrl: "https://i.ibb.co/gMhs2gBc/Gemini-Generated-Image-nnbopmnnbopmnnbo.png" 
        },
        [JobType.SEA_MESSENGER]: { 
            bossKey: "오션레이크", 
            baseIsFemale: true, // 여자
            altUrl: "https://i.ibb.co/DZT0Vyy/Gemini-Generated-Image-fhvoxdfhvoxdfhvo.png" 
        },
        [JobType.STEEL_MESSENGER]: { 
            bossKey: "퍼스트스틸스", 
            baseIsFemale: false, // 남자
            altUrl: "https://i.ibb.co/ynpvMj8Y/Gemini-Generated-Image-m2pu11m2pu11m2pu.png" 
        },
        [JobType.DARK_MESSENGER]: { 
            bossKey: "네오다크볼튼", 
            baseIsFemale: false, // 남자
            altUrl: "https://i.ibb.co/yFFKkk3H/Kakao-Talk-20251228-162955581-02.png" 
        },
        [JobType.NATURE_MESSENGER]: { 
            bossKey: "태스크슈카인", 
            baseIsFemale: false, // 남자
            altUrl: "https://i.ibb.co/ZpvV23TV/Kakao-Talk-20251228-162955581-01.png" 
        },
        [JobType.VOID_MESSENGER]: { 
            bossKey: "홍길동", 
            baseIsFemale: false, // 남자
            altUrl: "https://i.ibb.co/pjtyRpxb/Gemini-Generated-Image-ap3z5sap3z5sap3z.png" 
        }
    };

    const config = messengerConfig[job];
    if (!config) return null;

    const charIsFemale = isFemale(gender);

    // 베이스 성별과 일치하면 기존 보스 이미지 사용
    if (charIsFemale === config.baseIsFemale) {
        return SEASONAL_BOSSES[config.bossKey]?.visualUrl || null;
    } else {
        // 다르면 대체 이미지 사용
        return config.altUrl;
    }
};

/**
 * 직업이 신의 사자 계열인지 확인합니다.
 */
export const isMessengerJob = (job?: JobType): boolean => {
    if (!job) return false;
    return [
        JobType.SOLAR_MESSENGER, JobType.FIRE_MESSENGER, JobType.RADIANT_MESSENGER,
        JobType.MOONLIGHT_MESSENGER, JobType.ELECTRIC_MESSENGER, JobType.EARTH_MESSENGER,
        JobType.GALE_MESSENGER, JobType.ICE_MESSENGER, JobType.SEA_MESSENGER,
        JobType.STEEL_MESSENGER, JobType.DARK_MESSENGER, JobType.NATURE_MESSENGER,
        JobType.VOID_MESSENGER
    ].includes(job);
};
