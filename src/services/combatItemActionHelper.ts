import { ActiveStatus, Character, Companion, Enemy } from '../types';

/**
 * 전투 아이템 액션 문자열 생성 및 사용자 판별 헬퍼
 */

/**
 * 전투 아이템 사용 액션 문자열 생성
 * - 사용자가 동료인 경우: `[전투 아이템 사용: 동료이름] 아이템명 x1 (대상: 대상이름)`
 * - 사용자가 플레이어인 경우: `[전투 아이템 사용] 아이템명 x1 (대상: 대상이름)`
 */
export const buildCombatItemActionString = (
    itemName: string,
    targetName: string,
    userUnitName?: string,
    isCompanionUser?: boolean
): string => {
    if (isCompanionUser && userUnitName) {
        return `[전투 아이템 사용: ${userUnitName}] ${itemName} x1 (대상: ${targetName})`;
    }
    return `[전투 아이템 사용] ${itemName} x1 (대상: ${targetName})`;
};

/**
 * 액션 문자열에서 아이템 사용자와 대상, 아이템 이름을 파싱
 */
export const parseCombatItemActionString = (
    actionText: string
): { itemName: string; targetName: string; userUnitName: string | null; isCompanionUser: boolean } => {
    let text = actionText;
    let userUnitName: string | null = null;
    let isCompanionUser = false;

    // 1. 사용자 체크: [전투 아이템 사용: 동료이름] 또는 [아이템 사용: 동료이름]
    const userMatch = text.match(/\[(?:전투\s*)?아이템\s*사용:\s*(.+?)\]/);
    if (userMatch) {
        userUnitName = userMatch[1].trim();
        isCompanionUser = true;
        text = text.replace(userMatch[0], '').trim();
    } else {
        text = text.replace('[전투 아이템 사용]', '').replace('[아이템 사용]', '').trim();
    }

    // 2. 대상 추출: (대상: 이름)
    let targetName = '';
    const targetMatch = text.match(/\(대상:\s*(.+?)\)/);
    if (targetMatch) {
        targetName = targetMatch[1].trim();
        text = text.replace(targetMatch[0], '').trim();
    }

    // 3. 수량 제거: x1, x2 등
    const qtyMatch = text.match(/(.+?)\s*x\d+$/);
    const itemName = qtyMatch ? qtyMatch[1].trim() : text.trim();

    return {
        itemName,
        targetName,
        userUnitName,
        isCompanionUser
    };
};

/**
 * 아이템 시전자의 행동불가 여부 검사
 * - 행동불가(빙결, 기절, 마비, 수면, 소멸, 감전, 속박, 혼란 등) 상태인 본인의 턴에서만 아이템 사용이 차단됩니다.
 * - 동료가 플레이어에게 해제 아이템을 사용할 때는 동료가 행동불가가 아니라면 정상 사용 가능합니다.
 */
export const checkCombatItemUserCanAct = (
    actor: { name: string; statusEffects?: ActiveStatus[] } | null | undefined
): { canAct: boolean; ccName: string } => {
    if (!actor || !actor.statusEffects) return { canAct: true, ccName: '' };
    const cc = actor.statusEffects.find((eff: ActiveStatus) =>
        ["빙결", "기절", "마비", "수면", "소멸", "감전", "속박", "혼란"].includes(eff.name)
    );
    if (cc) {
        return { canAct: false, ccName: cc.name };
    }
    return { canAct: true, ccName: '' };
};
