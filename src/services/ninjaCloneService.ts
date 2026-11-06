import { Character, Companion, Skill, ClassTier, CombatStyle, SkillType } from '../types';
import { calculateFinalStats } from '../utils';
import type { ActiveSummon } from '../components/CombatInterface';

// 닌자 계열 분신 스킬 식별자 상수
export const NINJA_CLONE_2ND_ID = 'ninja_clone_skill_2nd';
export const NINJA_CLONE_3RD_ID = 'ninja_clone_skill_3rd';
export const NINJA_CLONE_4TH_ID = 'ninja_clone_skill_4th';

// 분신 스킬 여부 확인
export const isNinjaCloneSkill = (skill: Skill | null | undefined): boolean => {
    if (!skill) return false;
    if (skill.id === NINJA_CLONE_2ND_ID || skill.id === NINJA_CLONE_3RD_ID || skill.id === NINJA_CLONE_4TH_ID) return true;
    if (skill.name === '인술: 그림자 분신술' || skill.name === '오의: 환영 다중 분신술' || skill.name === '극의: 진 그림자 무간 분신체') return true;
    if (skill.effectFormula === 'SUMMON_CLONE' || (skill.summonData as any)?.isClone) return true;
    return false;
};

// 닌자 계열 분신 스킬 데이터 (2차, 3차, 4차)
export const NINJA_CLONE_SKILLS: Record<string, Skill> = {
    [NINJA_CLONE_2ND_ID]: {
        id: NINJA_CLONE_2ND_ID,
        name: '인술: 그림자 분신술',
        description: '차크라를 집중하여 본체의 능력 일부를 계승한 그림자 분신을 독립 소환합니다. (최대 2체 동시 유지, 본체 체력 35%, 공격력 40%, 방어력 30%, 민첩 50% 상속, 지속 3턴, 일반 공격 전용)',
        tier: ClassTier.SECOND,
        type: SkillType.BUFF,
        isSummonSkill: true,
        targetType: 'self',
        mpCost: 350,
        baseMpCost: 350,
        level: 1,
        maxLevel: 10,
        currentMastery: 100,
        effectFormula: 'SUMMON_CLONE',
        icon: 'UserPlus',
        shinryokuType: '암흑계',
        summonData: {
            summonName: '그림자 분신',
            durationTurns: 3,
            summonCount: 1,
            powerLevel: 'low',
            summonType: '분신'
        }
    },
    [NINJA_CLONE_3RD_ID]: {
        id: NINJA_CLONE_3RD_ID,
        name: '오의: 환영 다중 분신술',
        description: '닌자 오의를 발동하여 본체의 강력한 능력을 이어받은 환영 분신을 독립 소환합니다. (최대 3체 동시 유지, 본체 체력 50%, 공격력 60%, 방어력 45%, 민첩 70% 상속, 지속 4턴, 일반 공격 전용)',
        tier: ClassTier.LAST,
        type: SkillType.BUFF,
        isSummonSkill: true,
        targetType: 'self',
        mpCost: 950,
        baseMpCost: 950,
        level: 1,
        maxLevel: 10,
        currentMastery: 100,
        effectFormula: 'SUMMON_CLONE',
        icon: 'Users',
        shinryokuType: '암흑계',
        summonData: {
            summonName: '환영 분신',
            durationTurns: 4,
            summonCount: 1,
            powerLevel: 'medium',
            summonType: '분신'
        }
    },
    [NINJA_CLONE_4TH_ID]: {
        id: NINJA_CLONE_4TH_ID,
        name: '극의: 진 그림자 무간 분신체',
        description: '무간의 경지에 이른 진 그림자 분신체를 독립 소환합니다. (최대 5체 동시 유지, 본체 체력 70%, 공격력 85%, 방어력 60%, 민첩 90% 상속, 지속 5턴, 일반 공격 전용)',
        tier: ClassTier.FINAL,
        type: SkillType.BUFF,
        isSummonSkill: true,
        targetType: 'self',
        mpCost: 3200,
        baseMpCost: 3200,
        level: 1,
        maxLevel: 10,
        currentMastery: 100,
        effectFormula: 'SUMMON_CLONE',
        icon: 'Crown',
        shinryokuType: '암흑계',
        summonData: {
            summonName: '진 분신체',
            durationTurns: 5,
            summonCount: 1,
            powerLevel: 'high',
            summonType: '분신'
        }
    }
};

// 클래스 티어 등급 수치화 헬퍼
const getClassTierRank = (tier?: ClassTier): number => {
    if (tier === ClassTier.FINAL) return 4;
    if (tier === ClassTier.LAST) return 3;
    if (tier === ClassTier.SECOND) return 2;
    if (tier === ClassTier.FIRST) return 1;
    return 0;
};

// 캐릭터가 보유한 닌자 계열 확인 헬퍼
export const checkNinjaCombatStyleOwnership = (entity: Character | Companion): {
    has2ndNinja: boolean;
    has3rdNinja: boolean;
    has4thNinja: boolean;
} => {
    const owned = new Set<string>();

    if (entity.combatStyle) owned.add(entity.combatStyle);
    if ((entity as any).job) owned.add((entity as any).job);

    if (entity.unlockedCombatStyles && Array.isArray(entity.unlockedCombatStyles)) {
        entity.unlockedCombatStyles.forEach(s => owned.add(s));
    }

    if (entity.combatStyleProgress && typeof entity.combatStyleProgress === 'object') {
        Object.keys(entity.combatStyleProgress).forEach(k => owned.add(k));
    }

    // 4차 닌자 계열: 수리검왕, 폭멸자 (폭렬 파괴자)
    const has4thNinja = owned.has(CombatStyle.SHURIKEN_KING) ||
        owned.has('수리검왕') ||
        owned.has(CombatStyle.EXPLOSIVE_DESTROYER) ||
        owned.has('폭멸자') ||
        owned.has('폭렬 파괴자');

    // 3차 닌자 계열: 수리검사, 폭닌자
    const has3rdNinja = owned.has(CombatStyle.SHURIKEN_MASTER) ||
        owned.has('수리검사') ||
        owned.has('수리검 마스터') ||
        owned.has(CombatStyle.BOMB_NINJA) ||
        owned.has('폭닌자');

    // 2차 닌자 계열: 닌자
    const has2ndNinja = owned.has(CombatStyle.NINJA) ||
        owned.has('닌자');

    return { has2ndNinja, has3rdNinja, has4thNinja };
};

// 캐릭터의 전직 등급 및 닌자 계열 보유 상태에 따른 분신 스킬 반환
export const getNinjaCloneSkill = (entity: Character | Companion): Skill | null => {
    const tierRank = getClassTierRank(entity.classTier);

    // 세컨드 클래스(2차) 미만은 사용 불가
    if (tierRank < 2) return null;

    const { has2ndNinja, has3rdNinja, has4thNinja } = checkNinjaCombatStyleOwnership(entity);

    // 4차 파이널 클래스 + 4차 닌자 계열 보유 시
    if (tierRank >= 4 && has4thNinja) {
        return NINJA_CLONE_SKILLS[NINJA_CLONE_4TH_ID];
    }

    // 3차 라스트 클래스 이상 + 3차 이상 닌자 계열 보유 시
    if (tierRank >= 3 && (has3rdNinja || has4thNinja)) {
        return NINJA_CLONE_SKILLS[NINJA_CLONE_3RD_ID];
    }

    // 2차 세컨드 클래스 이상 + 2차 이상 닌자 계열 보유 시
    if (tierRank >= 2 && (has2ndNinja || has3rdNinja || has4thNinja)) {
        return NINJA_CLONE_SKILLS[NINJA_CLONE_2ND_ID];
    }

    return null;
};

// 분신 소환 실행 처리 함수 (최대 2개 유지, 티어별 능력치 계산, 외형 복제)
export const handleNinjaCloneSpawn = (
    caster: Character | Companion,
    skill: Skill,
    existingSummons: ActiveSummon[],
    player?: Character
): { updatedSummons: ActiveSummon[]; spawnedName: string } => {
    const updated = [...existingSummons];
    const { finalStats } = calculateFinalStats(caster as Character);

    // 스킬 티어별 분신 계승 비율 및 최대 유지 개수 설정
    let hpRatio = 0.35;
    let atkRatio = 0.40;
    let defRatio = 0.30;
    let agiRatio = 0.50;
    let duration = 3;
    let cloneTier = 2;
    let titlePrefix = '그림자 분신';
    let maxClones = 2;

    if (skill.tier === ClassTier.FINAL || skill.id === NINJA_CLONE_4TH_ID) {
        hpRatio = 0.70;
        atkRatio = 0.85;
        defRatio = 0.60;
        agiRatio = 0.90;
        duration = 5;
        cloneTier = 4;
        titlePrefix = '진 분신체';
        maxClones = 5;
    } else if (skill.tier === ClassTier.LAST || skill.id === NINJA_CLONE_3RD_ID) {
        hpRatio = 0.50;
        atkRatio = 0.60;
        defRatio = 0.45;
        agiRatio = 0.70;
        duration = 4;
        cloneTier = 3;
        titlePrefix = '환영 분신';
        maxClones = 3;
    }

    // 최대 유지 제한 검사: 이미 살아있는 분신이 maxClones 이상이면 가장 오래된 분신을 만료 처리
    const livingClones = updated.filter(s => !s.isDead && (s as any).isClone);
    if (livingClones.length >= maxClones) {
        const oldestClone = livingClones[0];
        oldestClone.isDead = true;
        oldestClone.durationTurns = 0;
    }

    // 전장 그리드 빈 슬롯 검색
    const occupied = new Set<string>();
    if (player && player.battlePosition) occupied.add(`${player.battlePosition.row}_${player.battlePosition.col}`);
    if (player && player.companions) {
        player.companions.forEach(c => {
            if (c.battlePosition) occupied.add(`${c.battlePosition.row}_${c.battlePosition.col}`);
        });
    }
    updated.forEach(s => {
        if (!s.isDead && s.durationTurns > 0 && s.battlePosition) {
            occupied.add(`${s.battlePosition.row}_${s.battlePosition.col}`);
        }
    });

    const allSlots = [
        { row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 },
        { row: 1, col: 0 }, { row: 1, col: 1 }, { row: 1, col: 2 },
        { row: 2, col: 0 }, { row: 2, col: 1 }, { row: 2, col: 2 }
    ];
    const freeSlot = allSlots.find(s => !occupied.has(`${s.row}_${s.col}`)) || { row: 2, col: 2 };

    // 분신 수치 산출
    const maxHp = Math.max(30, Math.floor((finalStats.maxHp || 100) * hpRatio));
    const maxMp = Math.max(20, Math.floor((finalStats.maxMp || 50) * 0.5));
    const str = Math.max(5, Math.floor((finalStats.str || 10) * atkRatio));
    const def = Math.max(5, Math.floor((finalStats.def || 10) * defRatio));
    const agi = Math.max(5, Math.floor((finalStats.agi || 10) * agiRatio));
    const intVal = Math.max(5, Math.floor((finalStats.int || 10) * atkRatio));
    const wis = Math.max(5, Math.floor((finalStats.wis || 10) * 0.5));
    const ctrl = Math.max(5, Math.floor((finalStats.ctrl || 10) * 0.5));

    // 시전자 본인의 외형을 온전히 복제
    const cloneVisualUrl = (caster as any).visualUrl ||
        (caster as any).defaultVisualUrl ||
        (caster as any).monsterData?.visualUrl ||
        (player ? player.visualUrl : '') ||
        '';

    // 분신 식별 명칭 설정
    const currentActiveCount = updated.filter(s => !s.isDead && (s as any).isClone).length;
    const cloneName = `${caster.name}의 ${titlePrefix} ${currentActiveCount + 1}`;

    const cloneObj: ActiveSummon = {
        id: `clone_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        name: cloneName,
        summonName: titlePrefix,
        level: caster.level || 1,
        stats: {
            hp: maxHp,
            maxHp: maxHp,
            mp: maxMp,
            maxMp: maxMp,
            str: str,
            agi: agi,
            int: intVal,
            wis: wis,
            def: def,
            ctrl: ctrl
        },
        finalStats: {
            hp: maxHp,
            maxHp: maxHp,
            mp: maxMp,
            maxMp: maxMp,
            str: str,
            agi: agi,
            int: intVal,
            wis: wis,
            def: def,
            ctrl: ctrl
        },
        battlePosition: freeSlot,
        durationTurns: duration,
        powerLevel: cloneTier === 4 ? 'high' : cloneTier === 3 ? 'medium' : 'low',
        statPercent: Math.round(atkRatio * 100),
        visualUrl: cloneVisualUrl,
        shinryokuType: caster.shinryokuType || '무속성',
        isDead: false,
        statusEffects: []
    };

    // 분신 플래그 지정
    (cloneObj as any).isClone = true;
    (cloneObj as any).cloneTier = cloneTier;
    (cloneObj as any).casterId = (caster as any).id;

    updated.push(cloneObj);

    return { updatedSummons: updated, spawnedName: cloneName };
};
