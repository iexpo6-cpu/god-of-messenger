import { SEASONAL_BOSSES } from '../mythicbossmonsters';
import { Character, Companion, Item, ItemRarity } from '../types';

export interface BossLootInfo {
    bossName: string;
    bossTitle?: string;
    level?: number;
    shinryokuType?: string;
    itemType?: string;
}

/**
 * 신화 장비의 획득처(신 사자 보스) 정보를 검색합니다.
 */
export function getRequiredItemBossInfo(itemName: string, shinryokuType?: string): BossLootInfo {
    // 1. SEASONAL_BOSSES의 detailedLoot에서 exact name 검색
    if (SEASONAL_BOSSES) {
        for (const bossKey of Object.keys(SEASONAL_BOSSES)) {
            const boss = SEASONAL_BOSSES[bossKey];
            if (!boss) continue;

            if (boss.detailedLoot && Array.isArray(boss.detailedLoot)) {
                const lootItem = boss.detailedLoot.find(item => item && item.name === itemName);
                if (lootItem) {
                    return {
                        bossName: boss.name,
                        bossTitle: boss.title,
                        level: boss.level,
                        shinryokuType: boss.shinryokuType,
                        itemType: lootItem.type
                    };
                }
            }
        }
    }

    // 2. 신력 계통 매칭으로 보스 추정
    if (shinryokuType && SEASONAL_BOSSES) {
        for (const bossKey of Object.keys(SEASONAL_BOSSES)) {
            const boss = SEASONAL_BOSSES[bossKey];
            if (boss && boss.shinryokuType === shinryokuType) {
                return {
                    bossName: boss.name,
                    bossTitle: boss.title,
                    level: boss.level,
                    shinryokuType: boss.shinryokuType
                };
            }
        }
    }

    // 3. 기본 반환
    return {
        bossName: "신의 사자 보스",
        bossTitle: "신화 등급 전리품",
        level: 10000
    };
}

/**
 * 엔티티가 특정 신화 장비를 착용 중인지 검사합니다.
 */
export function checkEquippedItem(entity: Character | Companion, itemName: string): { isEquipped: boolean; item?: Item } {
    if (!entity || !entity.equipment) return { isEquipped: false };

    const equipped = Object.values(entity.equipment).find(
        (i): i is Item => i !== undefined && i.name === itemName && i.rarity === ItemRarity.MYTHTIC
    );

    if (equipped) {
        return { isEquipped: true, item: equipped };
    }

    // 이름이 정확히 일치하지만 등급 체크가 누락된 경우도 안전 검사
    const equippedByName = Object.values(entity.equipment).find(
        (i): i is Item => i !== undefined && i.name === itemName
    );

    return { isEquipped: Boolean(equippedByName), item: equippedByName };
}

/**
 * 한글 장비 부위 명칭 변환
 */
export function getKoreanSlotName(itemType?: string, itemName?: string): string {
    if (itemName) {
        if (itemName.includes('스피어') || itemName.includes('소드') || itemName.includes('스태프') || itemName.includes('너클') || itemName.includes('건') || itemName.includes('크로스보우') || itemName.includes('도') || itemName.includes('라피에르') || itemName.includes('바스타드') || itemName.includes('너클') || itemName.includes('낫') || itemName.includes('채찍')) return '무기';
        if (itemName.includes('투구') || itemName.includes('왕관') || itemName.includes('갓') || itemName.includes('삿갓') || itemName.includes('헬름') || itemName.includes('마스크') || itemName.includes('꽃관') || itemName.includes('티아라')) return '머리 (투구)';
        if (itemName.includes('갑옷') || itemName.includes('갑주') || itemName.includes('로브') || itemName.includes('의복') || itemName.includes('경갑') || itemName.includes('수의') || itemName.includes('예복') || itemName.includes('아머') || itemName.includes('흉갑') || itemName.includes('쾌의') || itemName.includes('전갑') || itemName.includes('강갑') || itemName.includes('무사복')) return '상의 (갑옷)';
        if (itemName.includes('슈즈') || itemName.includes('장화') || itemName.includes('부츠') || itemName.includes('발자취') || itemName.includes('버선') || itemName.includes('축지혜') || itemName.includes('용암 보폭')) return '신발';
        if (itemName.includes('보옥') || itemName.includes('오브') || itemName.includes('방패') || itemName.includes('보주') || itemName.includes('시드') || itemName.includes('인장') || itemName.includes('원옥')) return '보조무기';
        if (itemName.includes('손') || itemName.includes('토시') || itemName.includes('장갑') || itemName.includes('건틀릿') || itemName.includes('수대') || itemName.includes('손길')) return '장갑';
        if (itemName.includes('목걸이') || itemName.includes('펜던트') || itemName.includes('날개') || itemName.includes('징표') || itemName.includes('호패') || itemName.includes('숨결') || itemName.includes('핵') || itemName.includes('고리') || itemName.includes('정수')) return '장신구 / 기타';
    }

    switch (itemType) {
        case 'Weapon': return '무기';
        case 'SubWeapon': return '보조무기';
        case 'Head': return '머리 (투구)';
        case 'Body': return '상의 (갑옷)';
        case 'Feet': return '신발';
        case 'Hand': return '장갑';
        case 'Accessory': return '장신구';
        case 'Etc': return '기타 특수 장비';
        default: return '전용 장비';
    }
}
