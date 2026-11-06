
import { Character, Companion, JobType, TemplePersonnel } from './types';
import { DIVINE_MESSENGER_CONFIG } from './awakening';
import { TEMPLE_MESSENGER_MAP } from './constants';

export type TempleRole = 'Priest' | 'SubPriest' | 'Knight' | 'Butler' | 'Maid';

export interface RoleConfig {
    id: TempleRole;
    label: string;
    max: number;
    minLevel: number; // [ADDED] 요구 집무실 레벨
    effectDesc: string;
}

export const TEMPLE_ROLES: RoleConfig[] = [
    { id: 'Priest', label: '성전 신관', max: 1, minLevel: 1, effectDesc: '신앙심 증가 (CTRL * 0.01), 전용 재료 생산 (CTRL * 0.01)%' },
    { id: 'SubPriest', label: '성전 부사제', max: 1, minLevel: 2, effectDesc: '신앙심 증가 (WIS * 0.01), 전용 재료 생산 (WIS * 0.005)%' },
    { id: 'Knight', label: '성역 수호기사', max: 2, minLevel: 1, effectDesc: '신앙심 증가 (STR * 0.01), 전용 재료 생산 (STR * 0.002)%' }, // Lv1에선 1명, Lv2부터 2명 로직은 UI에서 처리
    { id: 'Butler', label: '성전 관리 집사', max: 999, minLevel: 3, effectDesc: '관리 및 잡무 (남성 전용)' },
    { id: 'Maid', label: '성전 관리 메이드', max: 999, minLevel: 3, effectDesc: '관리 및 보좌 (여성 전용)' },
];

/**
 * 신의 사자 직업군인지 확인
 */
const isMessengerJob = (job?: JobType) => {
    if (!job) return false;
    return [
        JobType.SOLAR_MESSENGER, JobType.FIRE_MESSENGER, JobType.RADIANT_MESSENGER,
        JobType.MOONLIGHT_MESSENGER, JobType.ELECTRIC_MESSENGER, JobType.EARTH_MESSENGER,
        JobType.GALE_MESSENGER, JobType.ICE_MESSENGER, JobType.SEA_MESSENGER,
        JobType.STEEL_MESSENGER, JobType.DARK_MESSENGER, JobType.NATURE_MESSENGER,
        JobType.VOID_MESSENGER
    ].includes(job);
};

/**
 * 성전 배치 가능 여부 확인
 */
export const checkTempleEligibility = (
    member: Companion,
    templeCity: string
): { allowed: boolean; reason?: string } => {
    // 1. 직업 확인
    if (isMessengerJob(member.job)) return { allowed: false, reason: "신의 사자는 이미 성전의 주인이므로 일반 인원으로 배치할 수 없습니다." };

    // 2. 신력 계통 확인
    const messengerJob = TEMPLE_MESSENGER_MAP[templeCity];
    const messengerConfig = Object.values(DIVINE_MESSENGER_CONFIG).find(c => c.jobType === messengerJob);
    const requiredElement = messengerConfig?.elements[0];

    if (requiredElement && member.shinryokuType !== requiredElement) {
        return { allowed: false, reason: `해당 성전은 '${requiredElement}' 신력 소유자만 배치 가능합니다. (현재: ${member.shinryokuType || '없음'})` };
    }

    return { allowed: true };
};

/**
 * 역할별 젠더 확인
 */
export const checkRoleGender = (member: Companion, role: TempleRole): boolean => {
    if (role === 'Butler') {
        return ['남성', '남자', 'male'].some(k => member.gender.includes(k));
    }
    if (role === 'Maid') {
        return ['여성', '여자', 'female'].some(k => member.gender.includes(k));
    }
    return true;
};
