import { Character, Enemy, BaseDefenseReportData, BaseFacilityDamage } from '../types';
import { calculateBaseDefense } from '../utils';
import { FACILITIES_INFO, FACILITY_UPGRADE_CONFIG, BASE_UPGRADE_COSTS } from '../constants';

/**
 * 기지 방어 실패 시 피해를 정밀하게 산출하고, 통계 리포트 데이터를 생성하는 서비스 함수
 */
export const applyBaseDefenseFailure = (
    character: Character,
    eventEnemies: Enemy[] = [],
    enemyPower: number = 100,
    defenseType: 'delegated' | 'direct' = 'delegated'
): { updatedCharacter: Character; report: BaseDefenseReportData; summaryLog: string } => {
    const newChar: Character = {
        ...character,
        base: character.base ? {
            ...character.base,
            resources: { ...character.base.resources },
            facilityLevels: { ...(character.base.facilityLevels || {}) },
            layout: character.base.layout ? character.base.layout.map(inst => ({ ...inst })) : [],
            residents: [...(character.base.residents || [])]
        } : undefined
    };

    const baseDefense = calculateBaseDefense(character.base, character.companions);
    const locationName = character.base?.location?.city || character.currentLocation?.city || '기지';
    const timestamp = character.currentDate || new Date().toISOString().split('T')[0];

    const facilityDamages: BaseFacilityDamage[] = [];
    let baseLevelDamage: BaseDefenseReportData['baseLevelDamage'] = undefined;
    const plunderedResources: BaseDefenseReportData['plunderedResources'] = [];
    const deadNames: string[] = [];

    let totalRepairCost = {
        gold: 0,
        wood: 0,
        stone: 0,
        iron: 0,
        food: 0,
        manaCost: 0,
        manaCrystal: 0
    };

    const newBase = newChar.base;
    if (newBase) {
        // 1. 시설 피해 산출
        const upgradableInstances = newBase.layout.filter(inst => (inst.level || 1) > 1);
        
        if (upgradableInstances.length > 0) {
            // 적 전투력 또는 상황에 따라 1~2개 시설 손상
            const damageCount = (enemyPower >= 1500 && upgradableInstances.length >= 2) ? 2 : 1;
            const shuffled = [...upgradableInstances].sort(() => 0.5 - Math.random());
            const targets = shuffled.slice(0, damageCount);

            targets.forEach(targetInst => {
                const oldLevel = targetInst.level || 1;
                const newLevel = Math.max(1, oldLevel - 1);
                targetInst.level = newLevel;

                const facType = targetInst.type;
                const maxInstLevel = Math.max(...newBase.layout.filter(i => i.type === facType).map(i => i.level || 1), 1);
                newBase.facilityLevels[facType] = maxInstLevel;

                const facInfo = FACILITIES_INFO.find(f => f.id === facType);
                const facName = facInfo?.name || facType;
                const config = FACILITY_UPGRADE_CONFIG[facType] || { woodCost: 10, stoneCost: 10, goldCost: 20000, foodCost: 5, manaCost: 0 };

                // 복구 비용은 손상 전 레벨로 다시 올리는 데 필요한 비용
                const repairCost = {
                    gold: config.goldCost * newLevel,
                    wood: config.woodCost * newLevel,
                    stone: config.stoneCost * newLevel,
                    food: config.foodCost * newLevel,
                    manaCost: config.manaCost * newLevel
                };

                facilityDamages.push({
                    instanceId: targetInst.id,
                    facilityType: facType,
                    facilityName: facName,
                    oldLevel,
                    newLevel,
                    repairCost
                });

                totalRepairCost.gold += repairCost.gold;
                totalRepairCost.wood += repairCost.wood;
                totalRepairCost.stone += repairCost.stone;
                totalRepairCost.food += repairCost.food;
                totalRepairCost.manaCost += repairCost.manaCost;
            });
        } else if (newBase.layout.length > 0 || (newBase.level || 1) > 1) {
            // 모든 시설이 Lv.1인 경우 기지 본부 레벨 손상
            const oldBaseLevel = newBase.level || 1;
            if (oldBaseLevel > 1) {
                const newBaseLevel = oldBaseLevel - 1;
                newBase.level = newBaseLevel;

                const upgradeCost = BASE_UPGRADE_COSTS[oldBaseLevel] || { food: 100, wood: 30, stone: 30, iron: 100, manaCrystal: 0, time: 1 };
                baseLevelDamage = {
                    oldLevel: oldBaseLevel,
                    newLevel: newBaseLevel,
                    repairCost: {
                        food: upgradeCost.food,
                        wood: upgradeCost.wood,
                        stone: upgradeCost.stone,
                        iron: upgradeCost.iron,
                        manaCrystal: upgradeCost.manaCrystal
                    }
                };

                totalRepairCost.food += upgradeCost.food;
                totalRepairCost.wood += upgradeCost.wood;
                totalRepairCost.stone += upgradeCost.stone;
                totalRepairCost.iron += upgradeCost.iron;
                totalRepairCost.manaCrystal += upgradeCost.manaCrystal;
            }
        }

        // 2. 인명(거주민) 피해
        if (newBase.residents.length > 0) {
            const deadCount = Math.floor(Math.random() * Math.min(3, newBase.residents.length)) + 1;
            const deadList = newBase.residents.splice(0, deadCount);
            deadNames.push(...deadList);

            // 유가족 위로금 및 긴급 방호 구호 비용
            const reliefCostGold = deadCount * 30000;
            totalRepairCost.gold += reliefCostGold;
        }

        // 3. 자원 약탈(수탈) 피해 (기지 창고 및 금고 비축 자원 전반 강탈)
        const powerRatio = Math.max(1, enemyPower / Math.max(1, baseDefense));
        // 방어 격차가 클수록 최대 30%까지 수탈
        const plunderRate = Math.min(0.30, 0.10 + (powerRatio - 1) * 0.04 + Math.random() * 0.06);

        // 기지 자원 수탈 대상 메타데이터
        const ALL_LOOTABLE_RESOURCES: { 
            key: keyof typeof newBase.resources; 
            name: string; 
            category: '기초 물자' | '마력/보석' | '농작물/특산물' | '금고'; 
            minThreshold: number;
            maxPlunder: number;
            plunderChance: number; // 0~1 (희귀품은 확률적 발견)
        }[] = [
            // 금고 골드
            { key: 'gold', name: '기지 금고 골드', category: '금고', minThreshold: 1000, maxPlunder: 500000, plunderChance: 1.0 },
            
            // 기초 물자
            { key: 'food', name: '식량', category: '기초 물자', minThreshold: 5, maxPlunder: 300, plunderChance: 1.0 },
            { key: 'wood', name: '목재', category: '기초 물자', minThreshold: 5, maxPlunder: 300, plunderChance: 1.0 },
            { key: 'stone', name: '석재', category: '기초 물자', minThreshold: 5, maxPlunder: 300, plunderChance: 1.0 },
            { key: 'iron', name: '철광석', category: '기초 물자', minThreshold: 5, maxPlunder: 200, plunderChance: 1.0 },
            { key: 'herbs', name: '약초', category: '기초 물자', minThreshold: 3, maxPlunder: 150, plunderChance: 0.9 },
            { key: 'manaStone', name: '마석', category: '기초 물자', minThreshold: 3, maxPlunder: 100, plunderChance: 0.9 },
            { key: 'manaCrystal', name: '마력 결정', category: '기초 물자', minThreshold: 1, maxPlunder: 50, plunderChance: 0.8 },

            // 마력 및 보석/결정석
            { key: 'normalCrystal', name: '하급 결정', category: '마력/보석', minThreshold: 1, maxPlunder: 30, plunderChance: 0.7 },
            { key: 'magicCrystal', name: '마력 결정석', category: '마력/보석', minThreshold: 1, maxPlunder: 20, plunderChance: 0.7 },
            { key: 'rareCrystal', name: '희귀 결정석', category: '마력/보석', minThreshold: 1, maxPlunder: 10, plunderChance: 0.6 },
            { key: 'epicCrystal', name: '영웅 결정석', category: '마력/보석', minThreshold: 1, maxPlunder: 5, plunderChance: 0.5 },
            { key: 'uniqueCrystal', name: '유니크 결정석', category: '마력/보석', minThreshold: 1, maxPlunder: 3, plunderChance: 0.4 },
            { key: 'legendaryCrystal', name: '전설 결정석', category: '마력/보석', minThreshold: 1, maxPlunder: 1, plunderChance: 0.3 },
            { key: 'gold_ore', name: '금광석', category: '마력/보석', minThreshold: 1, maxPlunder: 20, plunderChance: 0.8 },
            { key: 'silver_ore', name: '은광석', category: '마력/보석', minThreshold: 1, maxPlunder: 30, plunderChance: 0.8 },
            { key: 'diamond', name: '다이아몬드', category: '마력/보석', minThreshold: 1, maxPlunder: 5, plunderChance: 0.4 },
            { key: 'ruby', name: '루비', category: '마력/보석', minThreshold: 1, maxPlunder: 8, plunderChance: 0.5 },
            { key: 'sapphire', name: '사파이어', category: '마력/보석', minThreshold: 1, maxPlunder: 8, plunderChance: 0.5 },
            { key: 'emerald', name: '에메랄드', category: '마력/보석', minThreshold: 1, maxPlunder: 8, plunderChance: 0.5 },
            { key: 'holy_stone', name: '신성석', category: '마력/보석', minThreshold: 1, maxPlunder: 5, plunderChance: 0.4 },

            // 농작물 및 특산물
            { key: 'wheat', name: '밀', category: '농작물/특산물', minThreshold: 3, maxPlunder: 100, plunderChance: 0.85 },
            { key: 'rice', name: '쌀', category: '농작물/특산물', minThreshold: 3, maxPlunder: 100, plunderChance: 0.85 },
            { key: 'corn', name: '옥수수', category: '농작물/특산물', minThreshold: 3, maxPlunder: 100, plunderChance: 0.85 },
            { key: 'potato', name: '감자', category: '농작물/특산물', minThreshold: 3, maxPlunder: 100, plunderChance: 0.85 },
            { key: 'sweet_potato', name: '고구마', category: '농작물/특산물', minThreshold: 3, maxPlunder: 100, plunderChance: 0.85 },
            { key: 'onion', name: '양파', category: '농작물/특산물', minThreshold: 3, maxPlunder: 100, plunderChance: 0.85 },
            { key: 'garlic', name: '마늘', category: '농작물/특산물', minThreshold: 3, maxPlunder: 100, plunderChance: 0.85 },
            { key: 'carrot', name: '당근', category: '농작물/특산물', minThreshold: 3, maxPlunder: 100, plunderChance: 0.85 },
            { key: 'cabbage', name: '배추', category: '농작물/특산물', minThreshold: 3, maxPlunder: 100, plunderChance: 0.85 },
            { key: 'tomato', name: '토마토', category: '농작물/특산물', minThreshold: 3, maxPlunder: 100, plunderChance: 0.85 },
            { key: 'strawberry', name: '딸기', category: '농작물/특산물', minThreshold: 3, maxPlunder: 80, plunderChance: 0.85 },
            { key: 'grape', name: '포도', category: '농작물/특산물', minThreshold: 3, maxPlunder: 80, plunderChance: 0.85 },
            { key: 'watermelon', name: '수박', category: '농작물/특산물', minThreshold: 2, maxPlunder: 50, plunderChance: 0.85 },
            { key: 'ginseng', name: '인삼', category: '농작물/특산물', minThreshold: 1, maxPlunder: 20, plunderChance: 0.7 },
            { key: 'mandrake', name: '만드라고라', category: '농작물/특산물', minThreshold: 1, maxPlunder: 15, plunderChance: 0.6 },
            { key: 'mana_fruit', name: '마력 열매', category: '농작물/특산물', minThreshold: 1, maxPlunder: 30, plunderChance: 0.75 },
            { key: 'golden_apple', name: '황금 사과', category: '농작물/특산물', minThreshold: 1, maxPlunder: 5, plunderChance: 0.5 },
            { key: 'shinryoku_flower', name: '신력 꽃', category: '농작물/특산물', minThreshold: 1, maxPlunder: 5, plunderChance: 0.4 },
            { key: 'world_tree_branch', name: '세계수의 가지', category: '농작물/특산물', minThreshold: 1, maxPlunder: 3, plunderChance: 0.3 }
        ];

        ALL_LOOTABLE_RESOURCES.forEach(resMeta => {
            const currentAmount = (newBase.resources[resMeta.key] as number) || 0;
            if (currentAmount >= resMeta.minThreshold) {
                if (Math.random() <= resMeta.plunderChance) {
                    const plundered = Math.min(
                        resMeta.maxPlunder,
                        Math.max(1, Math.floor(currentAmount * plunderRate))
                    );
                    if (plundered > 0) {
                        (newBase.resources[resMeta.key] as number) = Math.max(0, currentAmount - plundered);
                        plunderedResources.push({
                            resourceType: resMeta.key,
                            resourceName: resMeta.name,
                            amount: plundered,
                            category: resMeta.category
                        });
                    }
                }
            }
        });

        // 플레이어 지갑(주둔 지휘관 긴급 비상금)도 기지 방어선 돌파 시 일부 털림
        const baseVaultGoldPlundered = plunderedResources.some(p => p.resourceType === 'gold');
        if (!baseVaultGoldPlundered && (newChar.money || 0) > 50000) {
            const playerPlunderRate = 0.05 + Math.random() * 0.05; // 5% ~ 10%
            const playerPlundered = Math.min(200000, Math.max(5000, Math.floor(newChar.money * playerPlunderRate)));
            newChar.money = Math.max(0, newChar.money - playerPlundered);
            plunderedResources.push({
                resourceType: 'player_gold',
                resourceName: '지휘관 비상금고',
                amount: playerPlundered,
                category: '금고'
            });
        }
    }

    const casualties = {
        deadCount: deadNames.length,
        names: deadNames,
        reliefCostGold: deadNames.length * 30000
    };

    const report: BaseDefenseReportData = {
        id: `report_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        timestamp,
        defenseType,
        enemyPower,
        baseDefense,
        enemies: (eventEnemies || []).map(e => ({ name: e.name || '침략자', level: e.level || 1 })),
        locationName,
        facilityDamages,
        baseLevelDamage,
        casualties,
        plunderedResources,
        totalRepairCost,
        restored: false
    };

    if (newChar.base) {
        newChar.base.lastDefenseReport = report;
    }

    // 요약 로그 생성
    const damageSummaries: string[] = [];
    if (facilityDamages.length > 0) {
        damageSummaries.push(facilityDamages.map(f => `[${f.facilityName}] Lv.${f.oldLevel}→Lv.${f.newLevel}`).join(', '));
    }
    if (baseLevelDamage) {
        damageSummaries.push(`기지 본부 Lv.${baseLevelDamage.oldLevel}→Lv.${baseLevelDamage.newLevel}`);
    }
    if (casualties.deadCount > 0) {
        damageSummaries.push(`거주민 ${casualties.deadCount}명 사망`);
    }
    if (plunderedResources.length > 0) {
        const topPlundered = plunderedResources.slice(0, 4).map(p => `${p.resourceName} -${p.amount.toLocaleString()}`).join(', ');
        const moreCount = plunderedResources.length > 4 ? ` 외 ${plunderedResources.length - 4}종` : '';
        damageSummaries.push(`기지 자원 수탈(${topPlundered}${moreCount})`);
    }

    const summaryLog = damageSummaries.length > 0 
        ? `[기지 방어 실패 피해 보고] ${damageSummaries.join(' / ')} (총 예상 복구 비용: ${totalRepairCost.gold.toLocaleString()} G 외 자원)`
        : `[기지 방어 실패] 경미한 피해가 발생했습니다.`;

    return {
        updatedCharacter: newChar,
        report,
        summaryLog
    };
};

/**
 * 리포트에 명시된 피해 내역을 기지 자원/골드로 즉시 복구(긴급 복구)하는 함수
 */
export const repairBaseDamages = (
    character: Character,
    report: BaseDefenseReportData
): { success: boolean; updatedCharacter: Character; message: string } => {
    if (!character.base) {
        return { success: false, updatedCharacter: character, message: '기지 정보가 존재하지 않습니다.' };
    }
    if (report.restored) {
        return { success: false, updatedCharacter: character, message: '이미 긴급 복구가 완료된 리포트입니다.' };
    }

    const cost = report.totalRepairCost;
    const res = character.base.resources;
    const playerGold = character.money || 0;

    // 자원 및 골드 충분 여부 확인
    const shortages: string[] = [];
    if (playerGold < cost.gold) shortages.push(`골드 ${cost.gold - playerGold} G`);
    if ((res.wood || 0) < cost.wood) shortages.push(`목재 ${cost.wood - (res.wood || 0)}개`);
    if ((res.stone || 0) < cost.stone) shortages.push(`석재 ${cost.stone - (res.stone || 0)}개`);
    if ((res.iron || 0) < cost.iron) shortages.push(`철광석 ${cost.iron - (res.iron || 0)}개`);
    if ((res.food || 0) < cost.food) shortages.push(`식량 ${cost.food - (res.food || 0)}개`);
    if ((res.manaStone || 0) < cost.manaCost) shortages.push(`마석 ${cost.manaCost - (res.manaStone || 0)}개`);
    if ((res.manaCrystal || 0) < cost.manaCrystal) shortages.push(`마력 결정 ${cost.manaCrystal - (res.manaCrystal || 0)}개`);

    if (shortages.length > 0) {
        return {
            success: false,
            updatedCharacter: character,
            message: `복구에 필요한 자원이 부족합니다: ${shortages.join(', ')}`
        };
    }

    // 복구 진행
    const newChar: Character = {
        ...character,
        money: playerGold - cost.gold,
        base: {
            ...character.base,
            resources: {
                ...character.base.resources,
                wood: Math.max(0, (res.wood || 0) - cost.wood),
                stone: Math.max(0, (res.stone || 0) - cost.stone),
                iron: Math.max(0, (res.iron || 0) - cost.iron),
                food: Math.max(0, (res.food || 0) - cost.food),
                manaStone: Math.max(0, (res.manaStone || 0) - cost.manaCost),
                manaCrystal: Math.max(0, (res.manaCrystal || 0) - cost.manaCrystal),
            },
            facilityLevels: { ...(character.base.facilityLevels || {}) },
            layout: character.base.layout ? character.base.layout.map(inst => ({ ...inst })) : [],
            residents: [...(character.base.residents || [])]
        }
    };

    const newBase = newChar.base!;

    // 1. 손상 시설 레벨 복원
    report.facilityDamages.forEach(dmg => {
        const inst = newBase.layout.find(i => i.id === dmg.instanceId) || newBase.layout.find(i => i.type === dmg.facilityType);
        if (inst) {
            inst.level = dmg.oldLevel;
        }
        const maxLevel = Math.max(...newBase.layout.filter(i => i.type === dmg.facilityType).map(i => i.level || 1), dmg.oldLevel);
        newBase.facilityLevels[dmg.facilityType] = maxLevel;
    });

    // 2. 기지 본부 레벨 복원
    if (report.baseLevelDamage) {
        newBase.level = report.baseLevelDamage.oldLevel;
    }

    const updatedReport: BaseDefenseReportData = {
        ...report,
        restored: true
    };
    newBase.lastDefenseReport = updatedReport;

    return {
        success: true,
        updatedCharacter: newChar,
        message: '모든 손상 시설과 본부의 긴급 수리가 완료되었습니다!'
    };
};
