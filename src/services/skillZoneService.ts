/**
 * BG3 무격자 전장 스킬 범위(TargetRadius / Cone / Square / Target) 및
 * 클래스 티어 상한 · PowerRatio 트레이드오프 · 무기별 일반공격 범위 서비스
 */

import { Character, ClassTier, Companion, Enemy, Skill, SkillType, SkillZoneConfig, SkillZoneType, WeaponType } from '../types';
import { getWeaponTypeFromItem } from '../utils';

export interface TierZoneCap {
    minTargetRadius: number;
    maxTargetRadius: number;
    minConeLength: number;
    maxConeLength: number;
    minConeAngle: number;
    maxConeAngle: number;
    minSquareWidth: number;
    maxSquareWidth: number;
    minSquareLength: number;
    maxSquareLength: number;
    minAreaRadius: number;
    maxAreaRadius: number;
    /** 스킬 강화 1회당 순수 범위 증가량 */
    enhanceStepMeters: number;
    enhanceStepAngle: number;
}

export const SKILL_ZONE_TIER_CAPS: Record<string, TierZoneCap> = {
    [ClassTier.NONE]: {
        minTargetRadius: 3, maxTargetRadius: 10,
        minConeLength: 4, maxConeLength: 8,
        minConeAngle: 30, maxConeAngle: 60,
        minSquareWidth: 3, maxSquareWidth: 6,
        minSquareLength: 4, maxSquareLength: 10,
        minAreaRadius: 2, maxAreaRadius: 4,
        enhanceStepMeters: 1, enhanceStepAngle: 10
    },
    [ClassTier.FIRST]: {
        minTargetRadius: 3, maxTargetRadius: 10,
        minConeLength: 4, maxConeLength: 8,
        minConeAngle: 30, maxConeAngle: 60,
        minSquareWidth: 3, maxSquareWidth: 6,
        minSquareLength: 4, maxSquareLength: 10,
        minAreaRadius: 2, maxAreaRadius: 4,
        enhanceStepMeters: 1, enhanceStepAngle: 10
    },
    [ClassTier.SECOND]: {
        minTargetRadius: 3, maxTargetRadius: 15,
        minConeLength: 4, maxConeLength: 12,
        minConeAngle: 30, maxConeAngle: 90,
        minSquareWidth: 3, maxSquareWidth: 8,
        minSquareLength: 4, maxSquareLength: 14,
        minAreaRadius: 2, maxAreaRadius: 6,
        enhanceStepMeters: 1, enhanceStepAngle: 10
    },
    [ClassTier.LAST]: {
        minTargetRadius: 3, maxTargetRadius: 22,
        minConeLength: 4, maxConeLength: 18,
        minConeAngle: 30, maxConeAngle: 120,
        minSquareWidth: 3, maxSquareWidth: 12,
        minSquareLength: 4, maxSquareLength: 20,
        minAreaRadius: 2, maxAreaRadius: 9,
        enhanceStepMeters: 1, enhanceStepAngle: 10
    },
    [ClassTier.FINAL]: {
        minTargetRadius: 3, maxTargetRadius: 32,
        minConeLength: 4, maxConeLength: 26,
        minConeAngle: 30, maxConeAngle: 150,
        minSquareWidth: 3, maxSquareWidth: 16,
        minSquareLength: 4, maxSquareLength: 28,
        minAreaRadius: 2, maxAreaRadius: 13,
        enhanceStepMeters: 1, enhanceStepAngle: 10
    }
};

export const normalizeSkillTierKey = (tier?: ClassTier | string): string => {
    const t = String(tier || '');
    if (t === ClassTier.FINAL || t.includes('파이널') || t.toUpperCase() === 'FINAL') return ClassTier.FINAL;
    if (t === ClassTier.LAST || t.includes('라스트') || t.toUpperCase() === 'LAST') return ClassTier.LAST;
    if (t === ClassTier.SECOND || t.includes('세컨드') || t.toUpperCase() === 'SECOND') return ClassTier.SECOND;
    if (t === ClassTier.FIRST || t.includes('퍼스트') || t.toUpperCase() === 'FIRST') return ClassTier.FIRST;
    return ClassTier.NONE;
};

export const getZoneCapsForTier = (tier?: ClassTier | string): TierZoneCap => {
    const key = normalizeSkillTierKey(tier);
    return SKILL_ZONE_TIER_CAPS[key] || SKILL_ZONE_TIER_CAPS[ClassTier.FIRST];
};

export const getDefaultZoneConfig = (
    skillType: SkillType | string,
    targetType: 'single' | 'aoe' | string,
    tier?: ClassTier | string
): SkillZoneConfig => {
    const caps = getZoneCapsForTier(tier);
    const isAoe = targetType === 'aoe';
    const isBuffOrDebuff =
        skillType === SkillType.BUFF ||
        skillType === SkillType.DEBUFF ||
        skillType === SkillType.HEAL;

    if (!isAoe) {
        return {
            targetRadius: Math.round((caps.minTargetRadius + caps.maxTargetRadius) * 0.45)
        };
    }

    if (isBuffOrDebuff) {
        return {
            zoneType: 'target',
            targetRadius: Math.round((caps.minTargetRadius + caps.maxTargetRadius) * 0.5),
            areaRadius: Math.round((caps.minAreaRadius + caps.maxAreaRadius) * 0.5)
        };
    }

    return {
        zoneType: 'target',
        targetRadius: Math.round((caps.minTargetRadius + caps.maxTargetRadius) * 0.5),
        areaRadius: Math.round((caps.minAreaRadius + caps.maxAreaRadius) * 0.5),
        coneLength: Math.round((caps.minConeLength + caps.maxConeLength) * 0.5),
        coneAngle: Math.round((caps.minConeAngle + caps.maxConeAngle) * 0.5),
        squareWidth: Math.round((caps.minSquareWidth + caps.maxSquareWidth) * 0.5),
        squareLength: Math.round((caps.minSquareLength + caps.maxSquareLength) * 0.5)
    };
};

/**
 * 범위(사거리/면적) 확장 정도에 따른 powerRatio 상한 배율 (밸런스형 연속 감산)
 * - 단일: 최소 3m -> 1.00, 티어 최대 사거리 -> 0.75 (최대 -25%)
 * - 광역: 최소 면적 -> 1.00, 티어 최대 면적 -> 0.45 (최대 -55%)
 */
export const calculateZonePowerMultiplier = (
    targetType: 'single' | 'aoe' | string,
    zone: SkillZoneConfig | undefined,
    tier?: ClassTier | string
): number => {
    const caps = getZoneCapsForTier(tier);
    if (!zone) return 1.0;

    if (targetType !== 'aoe') {
        const r = Math.max(caps.minTargetRadius, Math.min(caps.maxTargetRadius, zone.targetRadius ?? caps.minTargetRadius));
        const ratio = (r - caps.minTargetRadius) / Math.max(1, caps.maxTargetRadius - caps.minTargetRadius);
        return +(1.0 - ratio * 0.25).toFixed(3);
    }

    const zt: SkillZoneType = zone.zoneType || 'target';
    let norm = 0;

    if (zt === 'cone') {
        const len = Math.max(caps.minConeLength, Math.min(caps.maxConeLength, zone.coneLength ?? caps.minConeLength));
        const ang = Math.max(caps.minConeAngle, Math.min(caps.maxConeAngle, zone.coneAngle ?? caps.minConeAngle));
        const area = 0.5 * len * len * ((ang * Math.PI) / 180);
        const minArea = 0.5 * caps.minConeLength * caps.minConeLength * ((caps.minConeAngle * Math.PI) / 180);
        const maxArea = 0.5 * caps.maxConeLength * caps.maxConeLength * ((caps.maxConeAngle * Math.PI) / 180);
        norm = Math.max(0, Math.min(1, (area - minArea) / Math.max(1, maxArea - minArea)));
    } else if (zt === 'square') {
        const w = Math.max(caps.minSquareWidth, Math.min(caps.maxSquareWidth, zone.squareWidth ?? caps.minSquareWidth));
        const l = Math.max(caps.minSquareLength, Math.min(caps.maxSquareLength, zone.squareLength ?? caps.minSquareLength));
        const area = w * l;
        const minArea = caps.minSquareWidth * caps.minSquareLength;
        const maxArea = caps.maxSquareWidth * caps.maxSquareLength;
        norm = Math.max(0, Math.min(1, (area - minArea) / Math.max(1, maxArea - minArea)));
    } else {
        const r = Math.max(caps.minTargetRadius, Math.min(caps.maxTargetRadius, zone.targetRadius ?? caps.minTargetRadius));
        const ar = Math.max(caps.minAreaRadius, Math.min(caps.maxAreaRadius, zone.areaRadius ?? caps.minAreaRadius));
        const rNorm = (r - caps.minTargetRadius) / Math.max(1, caps.maxTargetRadius - caps.minTargetRadius);
        const aNorm = (ar * ar - caps.minAreaRadius * caps.minAreaRadius) / Math.max(1, caps.maxAreaRadius * caps.maxAreaRadius - caps.minAreaRadius * caps.minAreaRadius);
        norm = Math.max(0, Math.min(1, aNorm * 0.72 + rNorm * 0.28));
    }

    return +(1.0 - norm * 0.55).toFixed(3);
};

/**
 * 기존 세이브 스킬 자동 마이그레이션 + 스킬 강화 범위 보너스(finalEnhanceData) 합산
 */
export interface EffectiveSkillZone {
    isAoe: boolean;
    zoneType: 'single' | SkillZoneType;
    targetRadius: number;
    coneLength: number;
    coneAngle: number;
    squareWidth: number;
    squareLength: number;
    areaRadius: number;
}

export const resolveEffectiveSkillZone = (skill: Skill): EffectiveSkillZone => {
    const text = `${skill.name || ''} ${skill.description || ''}`.toLowerCase();
    const explicitSingle =
        skill.targetType === 'single' &&
        !skill.finalEnhanceData?.isAoEExpanded &&
        !skill.finalEnhanceData?.isBuffAlliesExpanded;
    const isAoe = explicitSingle
        ? false
        : Boolean(
              skill.targetType === 'aoe' ||
                  skill.finalEnhanceData?.isAoEExpanded ||
                  skill.finalEnhanceData?.isBuffAlliesExpanded ||
                  (skill as any).isAoe ||
                  (!skill.targetType && /전체|광역|범위|폭발|메테오|폭풍|파동|일섬|브레스|대지/.test(text))
          );
    const isBuffOrDebuff =
        skill.type === SkillType.BUFF ||
        skill.type === SkillType.DEBUFF ||
        skill.type === SkillType.HEAL;

    const defaults = getDefaultZoneConfig(skill.type, isAoe ? 'aoe' : 'single', skill.tier);
    const z = skill.zoneConfig || {};
    const enh = skill.finalEnhanceData || ({} as any);

    let zoneType: 'single' | SkillZoneType = 'single';
    if (isAoe) {
        if (isBuffOrDebuff) {
            zoneType = 'target';
        } else if (z.zoneType) {
            zoneType = z.zoneType;
        } else if (/브레스|부채|베기|참격|선풍/.test(text)) {
            zoneType = 'cone';
        } else if (/일섬|돌진|관통|직선|광선|레이저|빔/.test(text)) {
            zoneType = 'square';
        } else {
            zoneType = 'target';
        }
    }

    return {
        isAoe,
        zoneType,
        targetRadius: Math.max(2.5, (z.targetRadius ?? defaults.targetRadius ?? 8) + (enh.targetRadiusBonus || 0)),
        coneLength: Math.max(3.5, (z.coneLength ?? defaults.coneLength ?? 8) + (enh.coneLengthBonus || 0)),
        coneAngle: Math.max(25, Math.min(220, (z.coneAngle ?? defaults.coneAngle ?? 60) + (enh.coneAngleBonus || 0))),
        squareWidth: Math.max(2.5, (z.squareWidth ?? defaults.squareWidth ?? 5) + (enh.squareWidthBonus || 0)),
        squareLength: Math.max(4, (z.squareLength ?? defaults.squareLength ?? 10) + (enh.squareLengthBonus || 0)),
        areaRadius: Math.max(2, (z.areaRadius ?? defaults.areaRadius ?? 4.5) + (enh.areaRadiusBonus || 0))
    };
};

/**
 * 무기별 고유 일반공격 사거리 및 형태
 */
export interface WeaponBasicAttackZone {
    weaponLabel: string;
    shape: 'single' | 'cone' | 'target';
    rangeMeters: number;
    coneAngle?: number;
    areaRadius?: number;
    isRanged: boolean;
}

export const resolveWeaponBasicAttackZone = (entity: Character | Companion | Enemy): WeaponBasicAttackZone => {
    const eq = (entity as any)?.equipment;
    const mainWeapon = eq?.weapon || eq?.Weapon;
    const weaponType: WeaponType | undefined = mainWeapon ? getWeaponTypeFromItem(mainWeapon) : undefined;

    switch (weaponType) {
        case 'SubSword':
            return { weaponLabel: '단검', shape: 'single', rangeMeters: 2.5, isRanged: false };
        case 'Knuckle':
            return { weaponLabel: '너클', shape: 'single', rangeMeters: 2.5, isRanged: false };
        case 'Sword':
            return { weaponLabel: '검', shape: 'single', rangeMeters: 3.4, isRanged: false };
        case 'Blunt':
            return { weaponLabel: '둔기', shape: 'single', rangeMeters: 3.4, isRanged: false };
        case 'Shield':
            return { weaponLabel: '방패', shape: 'single', rangeMeters: 3.2, isRanged: false };
        case 'Axe':
            return { weaponLabel: '도끼 (소형 클리브)', shape: 'cone', rangeMeters: 3.6, coneAngle: 65, isRanged: false };
        case 'Spear':
            return { weaponLabel: '창 (장거리 찌르기)', shape: 'single', rangeMeters: 5.2, isRanged: false };
        case 'Thrown':
            return { weaponLabel: '투척무기', shape: 'single', rangeMeters: 10.0, isRanged: true };
        case 'Staff':
        case 'Grimoire':
        case 'Orb':
        case 'Energy':
            return { weaponLabel: '마법 무기', shape: 'single', rangeMeters: 14.0, isRanged: true };
        case 'Bow':
        case 'Crossbow':
            return { weaponLabel: '활/석궁', shape: 'single', rangeMeters: 16.5, isRanged: true };
        case 'Firearm':
            return { weaponLabel: '총기', shape: 'single', rangeMeters: 19.0, isRanged: true };
        case 'Heavy':
            return { weaponLabel: '중화기 (소형 폭발)', shape: 'target', rangeMeters: 19.0, areaRadius: 3.2, isRanged: true };
        default: {
            const jobStr = String((entity as any)?.job || (entity as any)?.name || '').toLowerCase();
            if (/궁수|사수|아처|저격|레인저/.test(jobStr)) return { weaponLabel: '원거리 사격', shape: 'single', rangeMeters: 16.0, isRanged: true };
            if (/마법|메이지|술사|사제|신관|현자|네크로/.test(jobStr)) return { weaponLabel: '마법 탄환', shape: 'single', rangeMeters: 13.5, isRanged: true };
            if (/창|랜서/.test(jobStr)) return { weaponLabel: '창술', shape: 'single', rangeMeters: 5.0, isRanged: false };
            return { weaponLabel: '근접 타격', shape: 'single', rangeMeters: 3.2, isRanged: false };
        }
    }
};
