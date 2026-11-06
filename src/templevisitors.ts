
import { Enemy, TempleVisitor, SkillType, ClassTier, Skill } from './types';

/**
 * 성전 방문객 정보를 바탕으로 전투용 적(Enemy) 데이터를 생성합니다.
 * AI가 생성한 성전 방문객의 특성을 유지하면서 전투 밸런스에 맞게 변환합니다.
 */
export const convertVisitorToEnemy = (visitor: TempleVisitor): Enemy => {
    // 방문객의 레벨에 따른 스탯 보정
    const level = visitor.level || 500;
    
    // [FIX] Explicitly type as Skill[] to prevent 'targetType' from being inferred as a generic string
    // 방문객 전용 스킬셋 구성 (보유 스킬이 없을 경우 AI 테마 스킬 부여)
    const enemySkills: Skill[] = visitor.skills && visitor.skills.length > 0 ? visitor.skills : [
        {
            name: `${visitor.classType}의 비기`,
            description: `성격(${visitor.personality})에 따른 변칙적인 공격입니다.`,
            type: SkillType.PHYSICAL,
            tier: ClassTier.SECOND,
            mpCost: 30,
            level: 10,
            maxLevel: 10,
            currentMastery: 0,
            effectFormula: "STR*2.5",
            powerRatio: 250,
            targetType: 'single'
        },
        {
            name: "성역에서의 저항",
            description: "자신의 목적을 달성하기 위해 필사적으로 저항합니다.",
            type: SkillType.BUFF,
            tier: ClassTier.SECOND,
            mpCost: 40,
            level: 10,
            maxLevel: 10,
            currentMastery: 0,
            effectFormula: "DEF 50% 증가(3턴)",
            powerRatio: 0,
            targetType: 'self'
        }
    ];

    return {
        name: `[방문객] ${visitor.name}`,
        level: level,
        hp: visitor.stats.maxHp * 1.5, // 방문객 보스로서 HP 상향
        maxHp: visitor.stats.maxHp * 1.5,
        stats: { 
            ...visitor.stats,
            hp: visitor.stats.maxHp * 1.5,
            maxHp: visitor.stats.maxHp * 1.5
        },
        statusEffects: [],
        shinryokuType: visitor.shinryokuType,
        description: `${visitor.nation} 출신의 ${visitor.classType}. MBTI 성격: ${visitor.personality}. 방문 목적: ${visitor.visitReason}`,
        skills: enemySkills,
        // 방문객 이미지가 있다면 사용, 없으면 기본 아이콘 처리 (CombatInterface에서 처리)
        visualUrl: undefined 
    };
};
