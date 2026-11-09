import { Item, ItemRarity } from '../types';

/**
 * 보스 전리품 부스트 배율 산출기
 * 1.5배 ~ 2.0배 중에서 랜덤 확률로 산출되며,
 * 1.5배가 가장 확률이 높고 2.0배가 가장 낮습니다.
 * 
 * 가중치 확률 분포:
 * - 1.5배 구간: 35% (가장 높은 확률)
 * - 1.6배 구간: 25%
 * - 1.7배 구간: 18%
 * - 1.8배 구간: 12%
 * - 1.9배 구간: 7%
 * - 2.0배: 3% (가장 낮은 확률)
 */
export function rollBossBoostMultiplier(): number {
    const roll = Math.random() * 100;
    let baseMult = 1.5;
    let subOffset = 0;

    if (roll < 35) {
        // 1.50 ~ 1.59배 (최대 확률 35%)
        baseMult = 1.5;
        subOffset = Math.random() * 0.09;
    } else if (roll < 60) {
        // 1.60 ~ 1.69배 (25%)
        baseMult = 1.6;
        subOffset = Math.random() * 0.09;
    } else if (roll < 78) {
        // 1.70 ~ 1.79배 (18%)
        baseMult = 1.7;
        subOffset = Math.random() * 0.09;
    } else if (roll < 90) {
        // 1.80 ~ 1.89배 (12%)
        baseMult = 1.8;
        subOffset = Math.random() * 0.09;
    } else if (roll < 97) {
        // 1.90 ~ 1.99배 (7%)
        baseMult = 1.9;
        subOffset = Math.random() * 0.09;
    } else {
        // 2.00배 최고 부스트 (최소 확률 3%)
        return 2.0;
    }

    const finalMult = Math.round((baseMult + subOffset) * 100) / 100;
    return Math.min(2.0, Math.max(1.5, finalMult));
}

/**
 * 아이템이 장비 아이템인지 여부를 철저하게 판별합니다.
 * 무기, 보조무기, 투구, 갑옷, 신발, 장갑, 장신구 등 착용 가능한 장비만 true를 반환합니다.
 */
export function isEquipmentItem(item: any): boolean {
    if (!item) return false;
    const type = String(item.type || '').trim();
    const lowerType = type.toLowerCase();

    // 1. 소비품, 기타, 재료, 퀘스트 등 비장비 아이템 제외
    if (
        lowerType === 'consumable' ||
        lowerType === 'etc' ||
        lowerType === 'quest' ||
        lowerType === 'material' ||
        type.includes('소비') ||
        type.includes('기타') ||
        type.includes('재료') ||
        type.includes('음식') ||
        type.includes('물약') ||
        type.includes('주문서') ||
        type.includes('상자') ||
        type.includes('포션')
    ) {
        return false;
    }

    // 2. 표준 영문 장비 타입 매칭
    const standardEquipTypes = [
        'weapon',
        'subweapon',
        'head',
        'body',
        'feet',
        'hand',
        'accessory',
        'armor',
        'shield',
        'ring'
    ];
    if (standardEquipTypes.includes(lowerType)) {
        return true;
    }

    // 3. 한글 장비 타입 매칭
    const koreanEquipTypes = ['무기', '보조무기', '투구', '갑옷', '상의', '하의', '신발', '장갑', '장신구', '방패', '반지', '목걸이', '귀걸이'];
    if (koreanEquipTypes.some(kt => type.includes(kt))) {
        return true;
    }

    // 4. weaponType 속성이 있는 경우 무기 장비로 판별
    if (item.weaponType) {
        return true;
    }

    return false;
}

/**
 * 보스 고유 전리품 아이템에 부스트 규칙을 적용합니다.
 * - 전리품 부스트는 오직 장비 아이템에만 적용됩니다.
 * - 50% 확률로 부스트 성공 시: 1.5배 ~ 2.0배 중 확률 가중치로 결정된 배율 적용
 * - 50% 확률로 부스트 미적용 시: 기본 1.0배 일반 스펙으로 원복
 */
export function processBossDetailedLoot(
    item: Item,
    findOriginalDataFn?: ((name: string) => Item | null) | null
): Item {
    if (!item) return item;
    // 전리품 부스트는 장비 아이템에만 적용되므로 장비가 아닌 경우 원본 그대로 반환
    if (!isEquipmentItem(item)) {
        return item;
    }

    const clonedItem: Item = JSON.parse(JSON.stringify(item));
    // 일정 확률(50%)로 부스트 성공 여부 판정
    const isBoostedDrop = Math.random() < 0.5;

    // 1. 기준 원본(1.0배) 기본 스펙 산출
    const originalData = findOriginalDataFn ? findOriginalDataFn(clonedItem.name) : null;
    let baseStats: Record<string, number> = {};
    let basePrice = clonedItem.price || 1000;
    let baseOptions: string[] = [];

    if (originalData && originalData.stats) {
        baseStats = JSON.parse(JSON.stringify(originalData.stats));
        basePrice = originalData.price || basePrice;
        baseOptions = originalData.secondaryOptions ? [...originalData.secondaryOptions] : [];
    } else if (clonedItem.stats) {
        baseStats = JSON.parse(JSON.stringify(clonedItem.stats));
        basePrice = clonedItem.price || basePrice;
        baseOptions = clonedItem.secondaryOptions ? [...clonedItem.secondaryOptions] : [];
    } else if (clonedItem.secondaryOptions) {
        baseOptions = [...clonedItem.secondaryOptions];
    }

    if (!isBoostedDrop) {
        // 부스트 미제공 시: 1.0배 일반 기본 스펙 적용 (추가 옵션 부여 없음)
        clonedItem.stats = baseStats;
        clonedItem.price = basePrice;
        clonedItem.secondaryOptions = baseOptions ? [...baseOptions] : [];
        clonedItem.bossBoost = {
            isBoosted: false,
            multiplier: 1.0
        };
        return clonedItem;
    }

    // 부스트 당첨 시: 1.5배 ~ 2.0배 중 확률적으로 배율 롤링 (1.5배 최고 확률, 2.0배 최저 확률)
    const multiplier = rollBossBoostMultiplier();

    // 기본 스탯에 배율 적용
    if (Object.keys(baseStats).length > 0) {
        const boostedStats: Record<string, number> = {};
        Object.entries(baseStats).forEach(([k, baseVal]) => {
            boostedStats[k] = Math.max(1, Math.round(baseVal * multiplier));
        });
        clonedItem.stats = boostedStats;
    }

    // 가격에 배율 적용
    clonedItem.price = Math.max(1, Math.round(basePrice * multiplier));

    // 보조 옵션 수치도 부스트 배율에 맞게 정확히 스케일링 (+ 기호 및 소수점 온전히 보존)
    const ratio = multiplier;
    let upgradedOptions: string[] = [];
    if (Array.isArray(baseOptions) && baseOptions.length > 0) {
        upgradedOptions = baseOptions.map(opt => {
            if (typeof opt !== 'string') return opt;
            return opt.replace(/([+-]?\s*)(\d+(?:\.\d+)?)(%?)/g, (match, prefixSign, numStr, unit) => {
                const num = parseFloat(numStr);
                if (isNaN(num)) return match;
                const scaled = Math.round(num * ratio * 10) / 10;
                const formatted = Number.isInteger(scaled) ? String(scaled) : scaled.toFixed(1);
                const prefix = prefixSign || '';
                return `${prefix}${formatted}${unit}`;
            });
        });
    }

    // 장비 등급별 목표 옵션 개수 설정 (신화: 7개, 전설: 5개, 유일: 4개, 영웅/기타: 3개)
    let targetOptionCount = 3;
    if (clonedItem.rarity === ItemRarity.MYTHTIC) {
        targetOptionCount = 7;
    } else if (clonedItem.rarity === ItemRarity.LEGENDARY) {
        targetOptionCount = 5;
    } else if (clonedItem.rarity === ItemRarity.UNIQUE) {
        targetOptionCount = 4;
    } else {
        targetOptionCount = 3;
    }

    // 장비 등급별 중급/최상급 부스트 옵션 출현 가중치 차등 적용:
    // - 신화(MYTHTIC): 최상급 15%, 중급 30%, 일반 55% (최고급 장비에 걸맞은 높은 고티어 옵션 확률)
    // - 전설(LEGENDARY): 최상급 7%, 중급 18%, 일반 75%
    // - 유일/영웅/기타: 최상급 3%, 중급 7%, 일반 90% (극악의 최상급 확률 유지)
    let topTierChance = 3;
    let midTierChance = 7;

    if (clonedItem.rarity === ItemRarity.MYTHTIC) {
        topTierChance = 15;
        midTierChance = 30;
    } else if (clonedItem.rarity === ItemRarity.LEGENDARY) {
        topTierChance = 7;
        midTierChance = 18;
    }

    const baseOptionsPool = [
        "물리 공격력 +25%", "마법 공격력 +25%", "치명타 피해 +25%", "모든 스탯 +20%",
        "최종 스탯 +25%", "모든 속성 피해 +25%", "모든 상태이상 저항 +20%",
        "STR +25%", "INT +25%", "AGI +25%", "WIS +25%", "CTRL +25%", "DEF +25%",
        "물리 방어력 +30%", "마법 방어력 +30%", "치명타율 +30%", "치명타 피해량 +30%",
        "물리 명중률 +30%", "마법 명중률 +30%", "물리 회피율 +30%", "마법 회피율 +30%"
    ];
    const midOptionsPool = [
        "물리 공격력 +50%", "마법 공격력 +50%", "최종 스탯 +50%", "모든 속성 피해 +50%",
        "물리 방어력 +60%", "마법 방어력 +60%", "치명타 피해량 +50%",
        "STR +50%", "INT +50%", "AGI +50%", "WIS +50%", "CTRL +50%", "DEF +50%"
    ];
    const topTierOptionsPool = [
        "물리 공격력 +100%", "마법 공격력 +100%", "최종 스탯 +100%", "모든 속성 피해 +100%",
        "물리 방어력 +100%", "마법 방어력 +100%",
        "STR +100%", "INT +100%", "AGI +100%", "WIS +100%", "CTRL +100%", "DEF +100%"
    ];

    const pickWeightedExtraOption = (): string => {
        const roll = Math.random() * 100;
        if (roll < topTierChance) {
            // 최상급 희귀 옵션 (+100%)
            return topTierOptionsPool[Math.floor(Math.random() * topTierOptionsPool.length)];
        } else if (roll < topTierChance + midTierChance) {
            // 중급 옵션 (+50% ~ +60%)
            return midOptionsPool[Math.floor(Math.random() * midOptionsPool.length)];
        } else {
            // 일반 기본 옵션 (+20% ~ +30%)
            return baseOptionsPool[Math.floor(Math.random() * baseOptionsPool.length)];
        }
    };

    let attempts = 0;
    while (upgradedOptions.length < targetOptionCount && attempts < 200) {
        attempts++;
        const rawOpt = pickWeightedExtraOption();
        const scaledOpt = rawOpt.replace(/([+-]?\s*)(\d+(?:\.\d+)?)(%?)/g, (match, prefixSign, numStr, unit) => {
            const num = parseFloat(numStr);
            if (isNaN(num)) return match;
            const scaled = Math.round(num * ratio * 10) / 10;
            const formatted = Number.isInteger(scaled) ? String(scaled) : scaled.toFixed(1);
            const prefix = prefixSign || '';
            return `${prefix}${formatted}${unit}`;
        });
        const optKey = rawOpt.split('+')[0].trim();
        const alreadyHas = upgradedOptions.some(o => o.includes(optKey));
        if (!alreadyHas && !upgradedOptions.includes(scaledOpt)) {
            upgradedOptions.push(scaledOpt);
        }
    }

    clonedItem.secondaryOptions = upgradedOptions;

    clonedItem.bossBoost = {
        isBoosted: true,
        multiplier
    };

    return clonedItem;
}

/**
 * 아이템이 보스 전리품 부스트 대상인지 종합 판별합니다.
 * 전리품 부스트는 오직 장비 아이템에만 적용됩니다.
 */
export function isEligibleForBossBoost(item: any, enemy?: any): boolean {
    if (!item) return false;
    // 장비 아이템이 아니면 전리품 부스트 대상에서 제외
    if (!isEquipmentItem(item)) return false;

    // 이미 부스트 판정이 완료된 아이템은 제외
    if (item.bossBoost !== undefined && item.bossBoost !== null) return false;

    // 적 객체가 제공된 경우: 적이 반드시 보스 몬스터여야 함! (일반 전투 몬스터의 경우 보스 부스트 배율 비적용)
    if (enemy) {
        const enemyName = String(enemy.name || '');
        const enemyId = String(enemy.id || '');
        const isBossEnemy = Boolean(enemy.isBoss) || enemyName.includes('[BOSS]') || enemyName.includes('보스') || enemyId.startsWith('boss_') || enemyId.startsWith('instant_');
        if (!isBossEnemy) {
            return false;
        }
        return true;
    }

    // 적 객체가 제공되지 않은 경우, 명시적인 보스 드롭 아이템 플래그가 있는 경우에만 허용
    if (item.isDetailedLoot || item.isBossLoot || item.sourceBoss || item.bossSource) return true;

    return false;
}

/**
 * 아이템이 보스 전리품 부스트 대상인 경우 즉시 부스트(50% 확률 1.5~2.0배)를 적용하여 반환합니다.
 * 전리품 부스트는 오직 장비 아이템에만 적용됩니다.
 */
export function ensureBossLootProcessed(
    item: Item,
    findOriginalDataFn?: ((name: string) => Item | null) | null,
    enemy?: any
): Item {
    if (!item) return item;
    // 장비 아이템이 아니면 원본 그대로 반환
    if (!isEquipmentItem(item)) return item;

    // 이미 부스트 처리 완료
    if (item.bossBoost !== undefined && item.bossBoost !== null) return item;

    if (isEligibleForBossBoost(item, enemy)) {
        return processBossDetailedLoot(item, findOriginalDataFn);
    }

    return item;
}

