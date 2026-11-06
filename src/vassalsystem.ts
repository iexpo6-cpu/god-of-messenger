
import { Character, DiplomaticStatus, NationRelation, ItemRarity } from './types';
import { addDays } from './utils';

export const VASSAL_DURATION_YEARS = 5;

/**
 * 속국 세금/수탈 자원 요구량 계산
 * 레벨에 따라 스케일링됩니다.
 */
export const calculateVassalResources = (character: Character) => {
    const level = character.level;
    return {
        tax: {
            gold: level * 5000,
            manaCrystal: Math.max(1, Math.floor(level / 10)),
            wood: level * 10,
            iron: level * 10
        },
        exploit: {
            gold: level * 10000,
            manaCrystal: Math.max(2, Math.floor(level / 5)),
            iron: level * 20
        }
    };
};

/**
 * 연체료(이자) 계산 로직
 */
export const applyTaxInterest = (relation: NationRelation) => {
    if (!relation.vassalDebt) return relation;
    
    const debt = { ...relation.vassalDebt };
    // 매년 미납 시 20% 이자율 적용
    debt.gold = Math.floor(debt.gold * 1.2);
    debt.manaCrystal = Math.floor(debt.manaCrystal * 1.2);
    debt.wood = Math.floor(debt.wood * 1.2);
    debt.iron = Math.floor(debt.iron * 1.2);
    
    return { ...relation, vassalDebt: debt };
};

/**
 * 속국 전환 상태 체크 (100% 또는 -100% 도달 시)
 * [MODIFIED] vassalEndDate를 현재 날짜로부터 5년(1825일) 후로 계산하여 명확히 설정
 */
export const checkVassalTransition = (relation: NationRelation, currentDate?: string): NationRelation => {
    const occ = relation.occupation || 0;
    const today = currentDate || '2000-01-01';
    
    // 승리 -> 종주국행
    if (occ >= 100 && relation.status === DiplomaticStatus.WAR) {
        return {
            ...relation,
            status: DiplomaticStatus.VASSAL_OWNER,
            vassalYearsRemaining: VASSAL_DURATION_YEARS,
            vassalStartDate: today,
            vassalEndDate: addDays(today, 1825), // 5년 후 (윤년 미고려 평년 기준)
            occupation: 100,
            tension: 0
        };
    }
    
    // 패배 -> 속국행
    if (occ <= -100 && relation.status === DiplomaticStatus.WAR) {
        return {
            ...relation,
            status: DiplomaticStatus.VASSAL_SUBJECT,
            vassalYearsRemaining: VASSAL_DURATION_YEARS,
            vassalStartDate: today,
            vassalEndDate: addDays(today, 1825), // 5년 후
            occupation: -100,
            tension: 100
        };
    }
    
    return relation;
};
