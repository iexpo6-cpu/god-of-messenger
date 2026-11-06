import { Enemy, Character, CombatStyle, ClassTier, SkillType, Skill } from '../types';
import { generateEnemyStats, generateDefaultVisualUrl, getTierByLevel, generateNpcSkills } from '../utils';

export interface EscortAmbushData {
    enemies: Enemy[];
    title: string;
    message: string;
    enemyGroupLabel: string;
}

// 호송 기습 적 최대 상한 레벨 (500)
export const MAX_ESCORT_AMBUSH_LEVEL = 500;

/**
 * 호송/호위 퀘스트 중 발생하는 의문의 습격자 무리를 생성합니다.
 * 플레이어와 동료들의 전투력 및 호송 의뢰의 등급(국왕, 귀족, 군사, 상단, 일반)에 맞추어
 * 적정 레벨, 능력치, 스킬, 전투 계열이 갖춰진 정예 습격단을 구성합니다.
 * 플레이어 레벨과 1:1로 동일하지 않도록 완만한 가중치와 등급별 기준 대역을 적용하며,
 * 최대 레벨은 500으로 제한됩니다.
 */
export const generateEscortAmbushEnemies = (activeEscort: any, character: Character): EscortAmbushData => {
    const questType = activeEscort?.type || '';
    const escortTarget = activeEscort?.escortTarget || '';
    const title = activeEscort?.title || '';

    const isKing = questType === 'EscortKing' || escortTarget === 'King' || title.includes('국왕');
    const isNoble = questType === 'EscortNoble' || escortTarget === 'Noble' || title.includes('귀족') || title.includes('사절단');
    const isMilitary = questType === 'MilitaryEscort' || title.includes('군사') || title.includes('물류');
    const isMerchant = escortTarget === 'Merchant' || title.includes('상단') || title.includes('거상');

    // 1. 의뢰 등급별 기준 레벨 및 상한선 산정 (플레이어 레벨과 1:1로 판박이가 되지 않도록 완만한 스케일링 적용)
    const playerLevel = Math.max(1, character.level || 1);

    let minBase: number;
    let tierCap: number;
    let playerWeight: number; // 플레이어 레벨 반영 가중치 (0.15 ~ 0.50)

    if (isKing) {
        // [국왕 호위] 최고 위험도 황실 암살단 (기준 120~380, 최대 500)
        minBase = 120;
        tierCap = MAX_ESCORT_AMBUSH_LEVEL;
        playerWeight = 0.50;
    } else if (isNoble) {
        // [귀족 호위] 일류 비밀 결사대 살수단 (기준 70~250, 최대 380)
        minBase = 70;
        tierCap = 380;
        playerWeight = 0.40;
    } else if (isMilitary) {
        // [군사 호위] 적국 정예 특작대 (기준 50~200, 최대 320)
        minBase = 50;
        tierCap = 320;
        playerWeight = 0.35;
    } else if (isMerchant) {
        // [상단 호위] 무법자 약탈단 (기준 30~130, 최대 220)
        minBase = 30;
        tierCap = 220;
        playerWeight = 0.25;
    } else {
        // [일반/마차 호송] 노상 습격자 (기준 15~60, 최대 120)
        minBase = 15;
        tierCap = 120;
        playerWeight = 0.15;
    }

    // 퀘스트에 지정된 레벨이 있을 경우 최소 기준선으로 반영
    const questLevel = activeEscort?.level && activeEscort.level > 0 ? activeEscort.level : 0;
    const effectiveMin = Math.max(minBase, questLevel > 0 ? Math.round(questLevel * 0.8) : minBase);

    // 플레이어 레벨에 완만한 보정 계수 및 10% 내외의 무작위 편차를 적용하여 매번 동일한 레벨이 나오지 않도록 조절
    const variance = 0.90 + Math.random() * 0.20; // 0.90 ~ 1.10
    const calculatedBase = Math.round((effectiveMin + (playerLevel * playerWeight)) * variance);

    // 등급 상한 및 절대 최대 레벨(500) 적용
    const baseLevel = Math.max(effectiveMin, Math.min(tierCap, MAX_ESCORT_AMBUSH_LEVEL, calculatedBase));

    let ambushTitle = '⚔️ 호위 중 습격 발생!';
    let ambushMessage = '호위 목표를 노린 의문의 습격자들이 길목을 막아섰습니다!';
    let enemyGroupLabel = '의문의 습격단';

    interface AmbushMemberTemplate {
        name: string;
        levelOffset: number;
        statType: 'normal' | 'elite' | 'boss';
        isBoss?: boolean;
        combatStyle: CombatStyle;
        shinryokuType: string;
        gender: string;
    }

    let templates: AmbushMemberTemplate[] = [];

    if (isKing) {
        // [국왕 호위] 최고 위험도 암살 결사대
        ambushTitle = '⚔️ [극비 호위] 황실 암살 결사대 기습!';
        ambushMessage = '국왕 폐하의 목숨을 노린 최정예 황실 암살 결사대가 퇴로를 차단하고 전방위 기습을 감행했습니다!';
        enemyGroupLabel = '황실 암살 결사대 (결사대장 포함 4인)';

        templates = [
            {
                name: '황실 암살 결사대장',
                levelOffset: 6,
                statType: 'boss',
                isBoss: true,
                combatStyle: CombatStyle.ASSASSIN,
                shinryokuType: '암흑계',
                gender: '남성'
            },
            {
                name: '그림자 비수 살수',
                levelOffset: 3,
                statType: 'elite',
                combatStyle: CombatStyle.ASSASSIN,
                shinryokuType: '무기강화계',
                gender: '여성'
            },
            {
                name: '어둠의 침투 자객',
                levelOffset: 2,
                statType: 'elite',
                combatStyle: CombatStyle.NINJA,
                shinryokuType: '암흑계',
                gender: '남성'
            },
            {
                name: '결사대 흑영 투사',
                levelOffset: 1,
                statType: 'normal',
                combatStyle: CombatStyle.SWORDSMAN,
                shinryokuType: '신체강화계',
                gender: '남성'
            }
        ];
    } else if (isNoble) {
        // [귀족 호위] 일류 비밀 결사대 살수단
        ambushTitle = '⚔️ [귀족 호위] 정예 비밀 살수단 습격!';
        ambushMessage = '귀족 사절단의 신변을 노린 숙련된 비밀 결사대 살수들이 매복을 뚫고 덮쳐왔습니다!';
        enemyGroupLabel = '비밀 결사대 살수단 (두목 포함 4인)';

        templates = [
            {
                name: '비밀 결사대 살수두목',
                levelOffset: 4,
                statType: 'elite',
                isBoss: true,
                combatStyle: CombatStyle.ASSASSIN,
                shinryokuType: '무기강화계',
                gender: '남성'
            },
            {
                name: '정예 그림자 자객',
                levelOffset: 2,
                statType: 'elite',
                combatStyle: CombatStyle.ASSASSIN,
                shinryokuType: '질풍계',
                gender: '남성'
            },
            {
                name: '비수 매복 저격수',
                levelOffset: 1,
                statType: 'normal',
                combatStyle: CombatStyle.ARCHER,
                shinryokuType: '무기강화계',
                gender: '여성'
            },
            {
                name: '중무장 호위 파괴자',
                levelOffset: 0,
                statType: 'normal',
                combatStyle: CombatStyle.BERSERKER,
                shinryokuType: '신체강화계',
                gender: '남성'
            }
        ];
    } else if (isMilitary) {
        // [군사 호위] 적국 정예 특작대
        ambushTitle = '⚔️ [군사 호위] 적국 특작 매복대 기습!';
        ambushMessage = '군사 물류 대열의 경로를 차단한 적국 특작대와 무장 강습조가 기습해왔습니다!';
        enemyGroupLabel = '적국 정예 특작대 (4인)';

        templates = [
            {
                name: '적국 특작 타격대장',
                levelOffset: 3,
                statType: 'elite',
                isBoss: true,
                combatStyle: CombatStyle.KNIGHT,
                shinryokuType: '무기강화계',
                gender: '남성'
            },
            {
                name: '특작 강습 창술병',
                levelOffset: 1,
                statType: 'normal',
                combatStyle: CombatStyle.SPEARMAN,
                shinryokuType: '신체강화계',
                gender: '남성'
            },
            {
                name: '특작 매복 궁사',
                levelOffset: 1,
                statType: 'normal',
                combatStyle: CombatStyle.ARCHER,
                shinryokuType: '질풍계',
                gender: '남성'
            },
            {
                name: '특작 기습 척후병',
                levelOffset: 0,
                statType: 'normal',
                combatStyle: CombatStyle.ROGUE,
                shinryokuType: '무기강화계',
                gender: '남성'
            }
        ];
    } else if (isMerchant) {
        // [상단 호위] 광역 악명 무법자 약탈단
        ambushTitle = '⚔️ [상단 호위] 무법자 약탈단 습격!';
        ambushMessage = '대상단의 막대한 화물을 노린 흉포한 무법자 약탈단이 마차 행렬을 덮쳐왔습니다!';
        enemyGroupLabel = '무법자 약탈단 (3인)';

        templates = [
            {
                name: '악명 높은 습격단 두목',
                levelOffset: 2,
                statType: 'elite',
                isBoss: true,
                combatStyle: CombatStyle.AXE_WARRIOR,
                shinryokuType: '신체강화계',
                gender: '남성'
            },
            {
                name: '무법자 정예 약탈꾼',
                levelOffset: 1,
                statType: 'normal',
                combatStyle: CombatStyle.ROGUE,
                shinryokuType: '무기강화계',
                gender: '남성'
            },
            {
                name: '약탈단 흉포한 투사',
                levelOffset: 0,
                statType: 'normal',
                combatStyle: CombatStyle.BERSERKER,
                shinryokuType: '신체강화계',
                gender: '남성'
            }
        ];
    } else {
        // [일반/마차 호송] 노상 습격자 무리
        ambushTitle = '⚔️ [호송 임무] 노상 습격자 출현!';
        ambushMessage = '정기 마차길을 노린 흉악한 노상 습격자 무리가 길목을 가로막았습니다!';
        enemyGroupLabel = '노상 습격단 (3인)';

        templates = [
            {
                name: '노상 습격단 두목',
                levelOffset: 2,
                statType: 'elite',
                isBoss: true,
                combatStyle: CombatStyle.SWORDSMAN,
                shinryokuType: '무기강화계',
                gender: '남성'
            },
            {
                name: '흉악한 노상 강도',
                levelOffset: 0,
                statType: 'normal',
                combatStyle: CombatStyle.ROGUE,
                shinryokuType: '무기강화계',
                gender: '남성'
            },
            {
                name: '매복 투척수',
                levelOffset: -1,
                statType: 'normal',
                combatStyle: CombatStyle.ARCHER,
                shinryokuType: '질풍계',
                gender: '남성'
            }
        ];
    }

    // 2. 적 생성 (최대 레벨 500 상한 적용)
    const enemies: Enemy[] = templates.map((tmpl) => {
        const rawLevel = baseLevel + tmpl.levelOffset;
        const monsterLevel = Math.min(MAX_ESCORT_AMBUSH_LEVEL, Math.max(1, rawLevel));
        const stats = generateEnemyStats(monsterLevel, tmpl.statType);
        const tier = getTierByLevel(monsterLevel);
        const skills = generateNpcSkills(monsterLevel, tmpl.shinryokuType, tier);

        return {
            name: tmpl.name,
            hp: stats.hp,
            maxHp: stats.hp,
            level: monsterLevel,
            stats: stats,
            statusEffects: [],
            isBoss: tmpl.isBoss || false,
            combatStyle: tmpl.combatStyle,
            shinryokuType: tmpl.shinryokuType,
            skills: skills,
            visualUrl: generateDefaultVisualUrl(tmpl.name, '기타', '인간', tmpl.gender),
            description: `호송 목표를 노리고 기습한 습격자입니다.`
        } as Enemy;
    });

    return {
        enemies,
        title: ambushTitle,
        message: ambushMessage,
        enemyGroupLabel
    };
};
