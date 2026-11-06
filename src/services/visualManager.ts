import { Character, Companion, JobType } from '../types';
import { getMessengerVisualUrl, isMessengerJob } from '../messengerofgodvisual';

export const DEMON_GOD_VISUAL_URL = "https://i.ibb.co/xKPHFy3k/Kakao-Talk-20251222-200748851.png";

/**
 * 직업이 신의 사자 또는 마신인지 판별합니다.
 */
export const isGodJob = (job?: JobType): boolean => {
    if (!job) return false;
    return job === JobType.DEMON_GOD || isMessengerJob(job);
};

/**
 * 신의 사자 또는 마신 전용 변환 외형 URL을 반환합니다.
 */
export const getGodTransformedVisualUrl = (job?: JobType, gender: string = '남성'): string | null => {
    if (!job) return null;
    if (job === JobType.DEMON_GOD) {
        return DEMON_GOD_VISUAL_URL;
    }
    if (isMessengerJob(job)) {
        return getMessengerVisualUrl(job, gender);
    }
    return null;
};

export const getDivineOrDemonJobVisualUrl = getGodTransformedVisualUrl;
export const isDivineOrDemonJob = isGodJob;


/**
 * 직업에 따른 외형 URL을 반환합니다.
 * 플레이어가 신의 사자나 마신 직업일 때:
 * - 'original'(냅두기): 원래 외형 유지
 * - 'transformed'(바꾸기): 신의 사자/마신 외형 반환
 * - undefined(미선택): 자동으로 변환하지 않고 현재 외형 유지
 */
export const getVisualUrlByJob = (
    job: JobType | undefined,
    gender: string,
    currentVisualUrl?: string,
    godVisualChoice?: 'original' | 'transformed'
): string => {
    if (!job) return currentVisualUrl || '';

    if (isGodJob(job)) {
        // 기존 외형 유지를 선택한 경우 무조건 기존 외형 유지
        if (godVisualChoice === 'original') {
            return currentVisualUrl || '';
        }

        // 새로운 외형으로 변환을 선택한 경우에만 변환 URL 반환
        if (godVisualChoice === 'transformed') {
            const godUrl = getGodTransformedVisualUrl(job, gender);
            if (godUrl) return godUrl;
            return currentVisualUrl || '';
        }

        // 아직 선택하지 않은 경우(미정): 자동 변환하지 않고 현재 외형 유지
        return currentVisualUrl || '';
    }

    return currentVisualUrl || '';
};

export const updateVisualUrlByJob = (character: Character): Character => {
    const newChar = { ...character };
    newChar.visualUrl = getVisualUrlByJob(
        character.job,
        character.gender,
        character.visualUrl,
        character.godVisualChoice
    );
    return newChar;
};

export const updateCompanionVisualUrlByJob = (companion: Companion): Companion => {
    const newComp = { ...companion };
    newComp.visualUrl = getVisualUrlByJob(
        companion.job,
        companion.gender,
        companion.visualUrl,
        companion.godVisualChoice
    );
    return newComp;
};
