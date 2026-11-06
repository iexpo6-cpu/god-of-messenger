import { Enemy, SimpleStudent, Companion, Stats, ClassTier, Item, ItemRarity, MythicOptionType, MagyeOptionType, Skill, SkillType, CombatStyle, ActiveStatus } from '../types';
import { generateEnemyStats, getTierByLevel, generateName, generateNpcSkills } from '../utils';
import { normalizeShinryokuType } from './rivalLocationService';
import { upgradeNpcSkillsOnGrowth } from './companionGrowthService';
import { SHINRYOKU_TYPES_LIST } from '../constants';

/**
 * NPC 적 전투 난이도 고도화 및 실제 보유 스킬 사용 보장 스케일링 엔진
 * 
 * 1. 후반 레벨 및 클래스 티어별 스탯 가중치 (학생 시절 1~99 기본 유지, 세컨드 2배, 라스트 4배, 파이널 8~10배)
 * 2. 고레벨 적 가상 장비 및 피해 감소율, 치명타 저항 완충
 * 3. 성인/고레벨 NPC와의 전투 시 정예 호위병/결사대(2~3인) 동반 출현으로 4대 4 대등 파티전 구성
 * 4. 보스급/네임드(영원의 라이벌, 고위직, 복수자 등) 체력 50% 이하 각성 모드 및 특수 기믹 부여
 * 5. [핵심] 해당 NPC가 실제로 갖고 있는 스킬을 전투 중에 100% 탑재 및 사용하도록 보장
 */

/**
 * 레벨 및 클래스 티어에 따른 기본 스탯 증폭 배율 계산
 */
export const getNpcDifficultyMultiplier = (level: number, classTier?: ClassTier): {
    hpMultiplier: number;
    statMultiplier: number;
    critDmgResist: number;
    critResist: number;
    tierName: string;
} => {
    // 1. 학생 시절 및 초반 (레벨 1~99): 기본 난이도 유지 (배율 1.0)
    if (level < 100 && (!classTier || classTier === ClassTier.NONE || classTier === ClassTier.FIRST)) {
        return {
            hpMultiplier: 1.0,
            statMultiplier: 1.0,
            critDmgResist: 0,
            critResist: 5,
            tierName: '퍼스트'
        };
    }

    // 2. 세컨드 클래스 구간 (레벨 100~299): 2배 난이도 가중치
    if (level < 300 || classTier === ClassTier.SECOND) {
        return {
            hpMultiplier: 5,
            statMultiplier: 5.0,
            critDmgResist: 30, // 치명타 피해 30% 감소
            critResist: 20,    // 치명타 저항 20%
            tierName: '세컨드'
        };
    }

    // 3. 라스트 클래스 구간 (레벨 300~999): 4배 난이도 가중치
    if (level < 1000 || classTier === ClassTier.LAST) {
        return {
            hpMultiplier: 10.8,
            statMultiplier: 10.2,
            critDmgResist: 45, // 치명타 피해 45% 감소
            critResist: 30,    // 치명타 저항 30%
            tierName: '라스트'
        };
    }

    // 4. 파이널 클래스 구간 (레벨 1000 이상): 8~10배 난이도 가중치
    return {
        hpMultiplier: 50.5,
        statMultiplier: 50.8,
        critDmgResist: 60, // 치명타 피해 60% 감소
        critResist: 45,    // 치명타 저항 45%
        tierName: '파이널'
    };
};

/**
 * 고레벨 NPC 적에게 가상 장비 세트 효과 주입
 */
export const generateVirtualEquipmentForNpc = (level: number, tierName: string): { [key: string]: Item } => {
    if (level < 100) return {};

    const rarity: ItemRarity = level >= 1000 ? ItemRarity.MYTHTIC : (level >= 300 ? ItemRarity.LEGENDARY : ItemRarity.EPIC);
    const defBonus = Math.floor(level * 1.5);
    const atkBonus = Math.floor(level * 2.0);

    const virtualWeapon: Item = {
        name: `[정예 ${tierName}] 명장의 비전 무구`,
        type: 'Weapon',
        rarity,
        description: `고레벨 NPC 적이 사용하는 특수 단련 무구입니다.`,
        stats: {
            str: atkBonus,
            int: atkBonus,
            agi: Math.floor(atkBonus * 0.5)
        }
    };

    const virtualArmor: Item = {
        name: `[정예 ${tierName}] 수호 결계 갑옷`,
        type: 'Body',
        rarity,
        description: `막대한 피해를 흡수하고 치명타를 경감시키는 정예 장비입니다.`,
        stats: {
            def: defBonus,
            hp: defBonus * 10,
            ctrl: Math.floor(defBonus * 0.3)
        }
    };

    return {
        weapon: virtualWeapon,
        body: virtualArmor
    };
};

/**
 * NPC가 실제로 보유한 스킬셋을 확인하고, 없으면 직업과 신력계통에 맞게 생성하여 NPC에 영구 귀속시킴
 */
export const ensureNpcSkills = (npc: SimpleStudent | Companion): Skill[] => {
    const level = Math.max(1, npc.level || 1);
    const classTier = npc.classTier || getTierByLevel(level);

    // 1. 이미 스킬을 보유하고 있는 경우: 성장 보정 적용 후 반환
    if (npc.skills && Array.isArray(npc.skills) && npc.skills.length > 0) {
        upgradeNpcSkillsOnGrowth(npc);
        return [...npc.skills];
    }

    // 2. 스킬이 없는 경우: 신력계통 및 클래스티어 기반으로 실제 스킬을 생성하여 NPC에 저장
    let shinryoku = npc.shinryokuType ? normalizeShinryokuType(npc.shinryokuType) : '';
    if (!shinryoku || ['미개방', '무속성', '없음', 'None', '일반', '무'].includes(shinryoku)) {
        // 성향 또는 국적 기반 기본 신력계통 배정
        const defaultShinryokuPool = ['화염계', '광휘계', '전격계', '질풍계', '강철계', '암흑계', '대지계', '빙결계'];
        const seed = (npc.name || 'NPC').split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
        shinryoku = defaultShinryokuPool[seed % defaultShinryokuPool.length];
        npc.shinryokuType = shinryoku;
    }

    const generated = generateNpcSkills(level, shinryoku, classTier);
    if (generated && generated.length > 0) {
        npc.skills = [...generated];
    } else {
        // 기본 비기 스킬 2종 보장
        const baseAttackSkill: Skill = {
            name: `${shinryoku}의 비전 일격`,
            description: `${npc.name}이(가) 수련해 온 ${shinryoku} 신력의 위력적인 타격기입니다.`,
            type: SkillType.PHYSICAL,
            targetType: 'single',
            tier: classTier,
            powerRatio: 180 + Math.min(200, Math.floor(level * 0.4)),
            mpCost: 20,
            level: Math.min(10, Math.floor(level / 10) + 1),
            maxLevel: 10,
            currentMastery: 0,
            effectFormula: 'STR*1.8+INT*0.5'
        };

        const baseBuffSkill: Skill = {
            name: `${shinryoku}의 수호 기운`,
            description: `${shinryoku}의 기운을 전신에 둘러 공격력과 방어력을 끌어올립니다.`,
            type: SkillType.BUFF,
            targetType: 'self',
            tier: classTier,
            powerRatio: 100,
            mpCost: 25,
            level: Math.min(10, Math.floor(level / 10) + 1),
            maxLevel: 10,
            currentMastery: 0,
            effectFormula: 'BUFF: P.Atk +25%, P.Def +20%'
        };

        npc.skills = [baseAttackSkill, baseBuffSkill];
    }

    upgradeNpcSkillsOnGrowth(npc);
    return [...(npc.skills || [])];
};

/**
 * 고레벨/보스 NPC 적에게 특수 각성 기믹 버프 및 상태이상 저항 설정
 */
export const applyNpcBossGimmicks = (enemy: Enemy, level: number, isBoss: boolean = false): void => {
    if (!enemy.statusEffects) enemy.statusEffects = [];

    // 레벨 100 이상 적에게는 피해 완충 수호 결계 상시 부여
    if (level >= 100) {
        enemy.statusEffects.push({
            name: '수호 결계',
            duration: 99,
            effect: '피해 완충 및 치명타 저항 활성화',
            val: level >= 1000 ? 50 : (level >= 300 ? 35 : 20)
        });
    }

    // 네임드/보스급 NPC 체력 50% 이하 각성 모드 기믹 및 신화/마계신화 옵션 부여
    if (isBoss || enemy.isBoss || (enemy.id && (enemy.id.startsWith('mythicboss_') || enemy.id.startsWith('season_boss_')))) {
        if (!enemy.mythicOptions) enemy.mythicOptions = [];

        // 1. 신계 보스 판별: 절대신 엘라 및 신의 사자들만 해당
        const isElla = (
            enemy.id === 'mythicboss_ella' ||
            (enemy.id && enemy.id.toLowerCase().includes('ella')) ||
            (enemy.name && (enemy.name.includes('절대신') || enemy.name.includes('엘라')))
        );

        const DIVINE_MESSENGER_IDS = [
            'mythicboss_elkle', 'mythicboss_choi', 'mythicboss_moonlight', 'mythicboss_schkein',
            'mythicboss_steels', 'mythicboss_ocean', 'mythicboss_ike', 'mythicboss_hong',
            'mythicboss_black', 'mythicboss_bolton', 'mythicboss_juliet', 'mythicboss_la',
            'mythicboss_won', 'mythicboss_kwon'
        ];

        const isDivineMessenger = !isElla && (
            DIVINE_MESSENGER_IDS.includes(enemy.id || '') ||
            (enemy.id && enemy.id.toLowerCase().includes('messenger')) ||
            (enemy.name && (
                enemy.name.includes('신의 사자') || enemy.name.includes('태양의 사자') || enemy.name.includes('월광의 사자') ||
                enemy.name.includes('초화의 사자') || enemy.name.includes('강철의 사자') || enemy.name.includes('지령의 사자') ||
                enemy.name.includes('전격의 사자') || enemy.name.includes('암연의 사자') || enemy.name.includes('화염의 사자') ||
                enemy.name.includes('해수의 사자') || enemy.name.includes('빙결의 사자') || enemy.name.includes('무의 사자') ||
                enemy.name.includes('질풍의 사자') || enemy.name.includes('광휘의 사자')
            )) ||
            (Boolean((enemy as any).title) && String((enemy as any).title).includes('사자')) ||
            (Boolean(enemy.description) && enemy.description.includes('사자') && !enemy.name?.includes('흑사자'))
        );

        const isShinGyeBoss = isElla || isDivineMessenger;

        // 2. 마계 보스 판별: 마신 및 제너럴들만 해당
        const isDemonGod = (
            enemy.id === 'mythicboss_imperial' ||
            (enemy.id && enemy.id.toLowerCase().includes('imperial')) ||
            (enemy.name && (enemy.name.includes('마신') || enemy.name.includes('임페리얼')))
        );

        const GENERAL_IDS = [
            'mythicboss_zero', 'mythicboss_lucien', 'mythicboss_aporia', 'mythicboss_barcalone',
            'mythicboss_hazar', 'mythicboss_carnival', 'mythicboss_ignis', 'mythicboss_moldrik',
            'mythicboss_scholar', 'mythicboss_kairos', 'mythicboss_lunars'
        ];

        const isGeneral = !isDemonGod && (
            GENERAL_IDS.includes(enemy.id || '') ||
            (enemy.id && enemy.id.toLowerCase().includes('general')) ||
            (enemy.name && enemy.name.includes('제너럴'))
        );

        const isMaGyeBoss = isDemonGod || isGeneral;

        // 3. 발동 확률 계산 (마신과 절대신은 더 높은 확률 25%, 사자들과 제너럴들은 일정 아주 낮은 확률 5%)
        let triggerChance = 0;
        if (isElla || isDemonGod) {
            triggerChance = 0.25; // 절대신 엘라, 마신 임페리얼: 높은 확률 (25%)
        } else if (isDivineMessenger || isGeneral) {
            triggerChance = 0.05; // 신의 사자들, 제너럴들: 아주 낮은 확률 (5%)
        }

        // 이미 옵션이 부여된 적이 없고, 확률에 당첨된 경우 옵션 부여
        if (enemy.mythicOptions.length === 0 && triggerChance > 0 && Math.random() < triggerChance) {
            if (isShinGyeBoss) {
                // 신계 보스(절대신 엘라, 신의 사자들): 신화 장비 옵션 활용
                const mythicList = Object.values(MythicOptionType);
                const opt1 = mythicList[Math.floor(Math.random() * mythicList.length)];
                if (!enemy.mythicOptions.includes(opt1)) enemy.mythicOptions.push(opt1);
                if (Math.random() < 0.3) {
                    const opt2 = mythicList[Math.floor(Math.random() * mythicList.length)];
                    if (!enemy.mythicOptions.includes(opt2)) enemy.mythicOptions.push(opt2);
                }
                enemy.statusEffects.push({
                    name: '신계의 권능',
                    duration: 99,
                    effect: `신화 장비 옵션 발동: ${enemy.mythicOptions.join(', ')}`,
                    val: 1
                });
            } else if (isMaGyeBoss) {
                // 마계 보스(마신, 제너럴들): 마계 신화 장비 옵션 활용
                const magyeList = Object.values(MagyeOptionType);
                const opt1 = magyeList[Math.floor(Math.random() * magyeList.length)];
                if (!enemy.mythicOptions.includes(opt1)) enemy.mythicOptions.push(opt1);
                if (Math.random() < 0.3) {
                    const opt2 = magyeList[Math.floor(Math.random() * magyeList.length)];
                    if (!enemy.mythicOptions.includes(opt2)) enemy.mythicOptions.push(opt2);
                }
                enemy.statusEffects.push({
                    name: '마계의 권능',
                    duration: 99,
                    effect: `마계 신화 장비 옵션 발동: ${enemy.mythicOptions.join(', ')}`,
                    val: 1
                });
            }

            if (!enemy.equipment) enemy.equipment = {};
            (enemy.equipment as any).mythicOptions = [...enemy.mythicOptions];
            if (enemy.statusEffects.length > 0) {
                (enemy.statusEffects[enemy.statusEffects.length - 1] as any).mythicOptions = [...enemy.mythicOptions];
            }
        }

        // [NEW] 보스 마나 쉴드 기본 탑재 및 체력 대비 보호막 수치 대폭 상향
        // 보스의 마나 쉴드가 체력량에 비해 터무니없이 적지 않도록 기본 마나쉴드 패시브/보호막 보강
        const existingShield = enemy.statusEffects.find(e => e.name?.includes('마나 쉴드'));
        if (!existingShield) {
            const shieldRatio = isElla ? 0.35 : (isDemonGod || isDivineMessenger ? 0.25 : (isMaGyeBoss ? 0.20 : 0.15));
            const calculatedShield = Math.max(
                Math.floor((enemy.stats?.maxMp || 1000) * (isElla ? 0.8 : 0.5)),
                Math.floor((enemy.maxHp || 1000) * shieldRatio)
            );
            enemy.statusEffects.push({
                name: '마나 쉴드',
                duration: 99,
                effect: `피해를 흡수하는 마법 보호막 (${calculatedShield})`,
                val: calculatedShield,
                isPassive: true
            } as any);
        }

        // [NEW] 신계 및 마계 보스 중 일부에게 전용 생명력 회복 스킬 부여
        if (!enemy.skills) enemy.skills = [];
        const hasHealSkill = enemy.skills.some(s => s.type === SkillType.HEAL || s.effectFormula?.includes('RECOV') || s.effectFormula?.includes('HEAL') || s.description?.includes('회복'));
        
        if (!hasHealSkill) {
            if (isElla) {
                // 절대신 엘라: 창조의 성광 회복기 및 절대 신성 버프기
                enemy.skills.push({
                    name: '창조신의 숨결',
                    description: '창조의 권능으로 전신의 상처를 감싸고 체력을 대폭 치유합니다.',
                    type: SkillType.BUFF,
                    targetType: 'self',
                    tier: ClassTier.FINAL,
                    powerRatio: 150,
                    mpCost: 0,
                    level: 10,
                    maxLevel: 10,
                    currentMastery: 0,
                    effectFormula: 'HP 25% 회복, RECOV:HP, MANA_SHIELD'
                });
                if (!enemy.skills.some(s => s.name === '창조신의 절대 가호')) {
                    enemy.skills.push({
                        name: '창조신의 절대 가호',
                        description: '모든 속성과 신력을 총동원하여 전신의 능력치를 극대화하고 신성 결계를 형성합니다.',
                        type: SkillType.BUFF,
                        targetType: 'self',
                        tier: ClassTier.FINAL,
                        powerRatio: 200,
                        mpCost: 0,
                        level: 10,
                        maxLevel: 10,
                        currentMastery: 0,
                        effectFormula: 'STR +80%, INT +80%, DEF +80%, WIS +80%, AGI +80%, CTRL +80%, MANA_SHIELD'
                    });
                }
            } else if (isDemonGod) {
                // 마신 임페리얼: 심연 재생 및 강력한 광역 디버프기
                enemy.skills.push({
                    name: '심연의 원천 흡수',
                    description: '차원의 공허 에너지를 흡수하여 마신의 육체를 재생합니다.',
                    type: SkillType.BUFF,
                    targetType: 'self',
                    tier: ClassTier.FINAL,
                    powerRatio: 120,
                    mpCost: 0,
                    level: 10,
                    maxLevel: 10,
                    currentMastery: 0,
                    effectFormula: 'HP 20% 회복, RECOV:HP, MANA_SHIELD'
                });
                if (!enemy.skills.some(s => s.name === '암흑 심연의 저주')) {
                    enemy.skills.push({
                        name: '암흑 심연의 저주',
                        description: '모든 적의 영혼을 옭아매어 전신의 힘과 방어력을 극도로 파괴합니다.',
                        type: SkillType.DEBUFF,
                        targetType: 'aoe',
                        tier: ClassTier.FINAL,
                        powerRatio: 0,
                        mpCost: 0,
                        level: 10,
                        maxLevel: 10,
                        currentMastery: 0,
                        effectFormula: 'STR -60%, INT -60%, DEF -60%, WIS -60%, AGI -60%, CTRL -60%, Fear(2T)'
                    });
                }
            } else if (isDivineMessenger && (enemy.id === 'mythicboss_schkein' || enemy.id === 'mythicboss_ocean' || enemy.name?.includes('초화') || enemy.name?.includes('해수') || enemy.name?.includes('광휘'))) {
                // 신계 보스 중 생명/치유/정화 계열 사자 (초화의 사자 슈카인, 해수의 사자 등): 성역 회복 스킬
                enemy.skills.push({
                    name: '신성 성역의 은총',
                    description: '신계의 거룩한 생명력을 발현하여 손상된 체력을 회복합니다.',
                    type: SkillType.BUFF,
                    targetType: 'self',
                    tier: ClassTier.LAST,
                    powerRatio: 100,
                    mpCost: 0,
                    level: Math.min(10, Math.floor(level / 100) + 1),
                    maxLevel: 10,
                    currentMastery: 0,
                    effectFormula: 'HP 15% 회복, RECOV:HP'
                });
            } else if (isGeneral && (enemy.id === 'mythicboss_lucien' || enemy.id === 'mythicboss_moldrik' || enemy.id === 'mythicboss_scholar' || enemy.name?.includes('루시엔') || enemy.name?.includes('몰드릭'))) {
                // 마계 제너럴 중 재생/마녀 계열 (루시엔, 몰드릭, 스콜라): 심연 회복 스킬
                enemy.skills.push({
                    name: '암흑 마계의 마력 재생',
                    description: '타락한 마기를 수렴하여 스스로의 생명력을 되살려냅니다.',
                    type: SkillType.BUFF,
                    targetType: 'self',
                    tier: ClassTier.LAST,
                    powerRatio: 100,
                    mpCost: 0,
                    level: Math.min(10, Math.floor(level / 100) + 1),
                    maxLevel: 10,
                    currentMastery: 0,
                    effectFormula: 'HP 15% 회복, RECOV:HP'
                });
            }
        }

        // [NEW] 광휘의 사자 전용 회복 스킬 및 부활 스킬 보장
        const isRadiantMessenger = (
            enemy.id === 'mythicboss_juliet' ||
            enemy.id === 'boss_light' ||
            (enemy.name && (enemy.name.includes('광휘의 사자') || enemy.name.includes('줄리엣') || enemy.name.includes('페가수스'))) ||
            (enemy.description && enemy.description.includes('광휘의 사자'))
        );

        if (isRadiantMessenger) {
            const hasRadiantHeal = enemy.skills.some(s => s.name.includes('치유') || (s.effectFormula && s.effectFormula.includes('RECOV')));
            if (!hasRadiantHeal) {
                enemy.skills.push({
                    name: '광휘의 자애로운 치유',
                    description: '성역의 빛을 내려 자신의 상처를 치유하고 생명력을 크게 회복합니다.',
                    type: SkillType.BUFF,
                    targetType: 'self',
                    tier: ClassTier.FINAL,
                    powerRatio: 120,
                    mpCost: 0,
                    level: 10,
                    maxLevel: 10,
                    currentMastery: 0,
                    effectFormula: 'HP 25% 회복, RECOV:HP'
                });
            }

            const hasRadiantResurrect = enemy.skills.some(s => s.name.includes('환생') || s.name.includes('부활') || (s.effectFormula && s.effectFormula.includes('RESURRECT')));
            if (!hasRadiantResurrect) {
                enemy.skills.push({
                    name: '성녀의 광휘 환생',
                    description: '사망에 이르는 치명상을 입었을 때 빛의 축복으로 생명을 되살려 환생합니다.',
                    type: SkillType.BUFF,
                    targetType: 'self',
                    tier: ClassTier.FINAL,
                    powerRatio: 0,
                    mpCost: 0,
                    level: 10,
                    maxLevel: 10,
                    currentMastery: 0,
                    effectFormula: 'RESURRECT 50%, HP 50% 부활'
                });
            }

            // 광휘의 사자 부활 기믹 상태 부여 (전투 중 체력 고갈 시 1회 환생)
            const hasRevivalStatus = enemy.statusEffects.some(e => e.name?.includes('환생') || e.name?.includes('부활'));
            if (!hasRevivalStatus) {
                enemy.statusEffects.push({
                    name: '광휘의 불멸 환생',
                    duration: 99,
                    effect: '사망 시 1회 최대 체력의 50%로 즉시 환생',
                    val: 50
                } as any);
            }
        }

        // 각성 스킬 구비 (체력 50% 이하 위기 시에만 발동하도록 끝에 배치하여 평소엔 NPC 원래 스킬이 주력으로 나가도록 함)
        const hasAwakeningSkill = enemy.skills.some(s => s.name.includes('각성') || s.name.includes('결전'));
        if (!hasAwakeningSkill) {
            const awakeningSkill: Skill = {
                name: `[오의] 한계 돌파 각성`,
                description: `체력이 위험할 때 발동하여 잠재력을 폭발시키고 모든 상처를 수호막으로 전환합니다.`,
                type: SkillType.BUFF,
                targetType: 'self',
                tier: ClassTier.LAST,
                powerRatio: 250,
                mpCost: 0,
                level: Math.min(10, Math.floor(level / 100) + 1),
                maxLevel: 10,
                currentMastery: 0,
                effectFormula: 'HP_RECOV+STAT_BOOST+MANA_SHIELD'
            };
            // NPC 원래 스킬들이 우선 선택되도록 뒤에 배치
            enemy.skills.push(awakeningSkill);
        }
    }
};

/**
 * NPC 기본 객체(SimpleStudent 또는 Companion)로부터 고도화된 적(Enemy) 객체 단일 생성
 * - 해당 NPC가 실제로 갖고 있는 스킬(npc.skills)을 온전히 탑재
 */
export const scaleNpcEnemyStats = (
    npc: SimpleStudent | Companion,
    isBoss: boolean = false,
    customTitle?: string
): Enemy => {
    const level = Math.max(1, npc.level || 1);
    const classTier = npc.classTier || getTierByLevel(level);
    const isEternal = Boolean((npc as SimpleStudent).isEternalRival || isBoss);
    
    // 1. 해당 NPC가 실제로 갖고 있는 스킬을 확보 및 동기화
    const actualNpcSkills = ensureNpcSkills(npc);

    const { hpMultiplier, statMultiplier, critDmgResist, critResist, tierName } = getNpcDifficultyMultiplier(level, classTier);

    // 기본 적 스탯 생성
    const baseEnemyStats = generateEnemyStats(level, isEternal ? 'boss' : (level >= 100 ? 'elite' : 'normal'));

    // 스탯 가중치 적용 (영원의 라이벌/보스인 경우 3.0배 강력한 가중치 부여)
    const bossExtra = isEternal ? 3.0 : 1.0;
    
    // NPC 고유 저장 스탯이 존재하면 해당 스탯을 기본값으로 고려하여 증폭
    const npcSavedHp = npc.stats?.hp || npc.stats?.maxHp || 0;
    const calcHp = Math.floor(baseEnemyStats.maxHp * hpMultiplier * bossExtra);
    const finalHp = Math.max(calcHp, Math.floor((npcSavedHp > 0 ? npcSavedHp : level * 200) * (isEternal ? 2.5 : 1.0)));
    const finalMaxHp = finalHp;

    const nStr = npc.stats?.str || baseEnemyStats.str;
    const nInt = npc.stats?.int || baseEnemyStats.int;
    const nDef = npc.stats?.def || baseEnemyStats.def;
    const nAgi = npc.stats?.agi || baseEnemyStats.agi;

    const scaledStats: Stats = {
        ...baseEnemyStats,
        hp: finalHp,
        maxHp: finalMaxHp,
        mp: Math.floor(baseEnemyStats.maxMp * statMultiplier * bossExtra),
        maxMp: Math.floor(baseEnemyStats.maxMp * statMultiplier * bossExtra),
        str: Math.floor(Math.max(baseEnemyStats.str, nStr) * statMultiplier * bossExtra),
        int: Math.floor(Math.max(baseEnemyStats.int, nInt) * statMultiplier * bossExtra),
        def: Math.floor(Math.max(baseEnemyStats.def, nDef) * statMultiplier * bossExtra),
        agi: Math.floor(Math.max(baseEnemyStats.agi, nAgi) * statMultiplier * bossExtra),
        wis: Math.floor(baseEnemyStats.wis * statMultiplier * bossExtra),
        ctrl: Math.floor(baseEnemyStats.ctrl * statMultiplier * bossExtra)
    };

    // 장비 효과 적용
    const virtualEquip = generateVirtualEquipmentForNpc(level, tierName);

    // 접두사 및 칭호
    const isRivalTitle = (npc as SimpleStudent).isEternalRival;
    const titlePrefix = customTitle || (isRivalTitle ? '[영원의 숙적]' : (isBoss ? '[보스]' : (level >= 300 ? `[정예 ${tierName}]` : '')));
    const displayName = titlePrefix ? `${titlePrefix} ${npc.name}` : npc.name;

    const enemy: Enemy = {
        id: npc.id,
        name: displayName,
        level: level,
        hp: finalHp,
        maxHp: finalMaxHp,
        stats: scaledStats,
        statusEffects: [],
        shinryokuType: normalizeShinryokuType(npc.shinryokuType),
        visualUrl: npc.visualUrl,
        job: npc.job || npc.classType,
        gender: npc.gender,
        description: `'${npc.name}'과의 진검승부입니다. 수련해 온 비전 기술을 자유자재로 펼쳐냅니다.`,
        skills: actualNpcSkills.map(s => ({ ...s })), // NPC 실제 보유 스킬 복사
        combatStyle: npc.combatStyle,
        isBoss: isBoss || isRivalTitle,
        equipment: virtualEquip,
        critDmgResist: Math.max(critDmgResist, isEternal ? 35 : 0),
        critResist: Math.max(critResist, isEternal ? 25 : 0)
    };

    (enemy as any).isNpc = true;

    // 특수 기믹 및 각성 보정
    applyNpcBossGimmicks(enemy, level, isBoss || isRivalTitle);

    return enemy;
};

/**
 * 정예 호위병/결사대 생성기 (방안 3: 4대 4 대등 파티전 구성)
 * 
 * - 영원의 라이벌은 레벨과 무관하게 항상 2~3인의 결사대 동료를 동반하여 파티전으로 출전
 * - 일반 고레벨 NPC(레벨 100 이상)인 경우에도 정예 호위병 동반
 */
export const generateNpcEscortParty = (
    leaderNpc: SimpleStudent | Companion,
    isBoss: boolean = false,
    forceSingle: boolean = false
): Enemy[] => {
    const leaderEnemy = scaleNpcEnemyStats(leaderNpc, isBoss);
    const level = Math.max(1, leaderNpc.level || 1);
    const isEternal = Boolean((leaderNpc as SimpleStudent).isEternalRival || isBoss);

    // 영원의 라이벌이 아닌 경우에만 단독 출현 조건(forceSingle 또는 레벨 100 미만) 적용
    if (!isEternal && (forceSingle || level < 100)) {
        return [leaderEnemy];
    }

    // 이미 영원의 라이벌처럼 고유 결사대 명단이 있는 경우
    const leaderStudent = leaderNpc as SimpleStudent;
    if (leaderStudent.rivalData && leaderStudent.rivalData.partyMembers && leaderStudent.rivalData.partyMembers.length > 0) {
        const partyList: Enemy[] = [leaderEnemy];
        leaderStudent.rivalData.partyMembers.forEach((comp, idx) => {
            const compLevel = Math.max(1, comp.level || Math.floor(level * 0.95));
            const subTier = getTierByLevel(compLevel);
            const { hpMultiplier, statMultiplier, critDmgResist, critResist } = getNpcDifficultyMultiplier(compLevel, subTier);
            const subStats = generateEnemyStats(compLevel, 'elite');
            const subHp = Math.floor(subStats.maxHp * Math.max(hpMultiplier, 2.5) * 1.5);

            // 동료의 실제 스킬 보장
            let escortSkills: Skill[] = (comp as any).skills ? [...(comp as any).skills] : [];
            if (escortSkills.length === 0) {
                const sType = normalizeShinryokuType(comp.shinryokuType) || '화염계';
                escortSkills = generateNpcSkills(compLevel, sType, subTier);
                (comp as any).skills = escortSkills;
            }

            const escortEnemy: Enemy = {
                id: comp.id || `rival_escort_${idx}`,
                name: `[${comp.role}] ${comp.name}`,
                level: compLevel,
                hp: subHp,
                maxHp: subHp,
                visualUrl: comp.visualUrl,
                stats: {
                    ...subStats,
                    hp: subHp,
                    maxHp: subHp,
                    str: Math.floor(subStats.str * Math.max(statMultiplier, 2.0) * 1.2),
                    int: Math.floor(subStats.int * Math.max(statMultiplier, 2.0) * 1.2),
                    def: Math.floor(subStats.def * Math.max(statMultiplier, 2.0) * 1.2),
                    agi: Math.floor(subStats.agi * Math.max(statMultiplier, 2.0) * 1.2),
                    wis: Math.floor(subStats.wis * Math.max(statMultiplier, 2.0) * 1.2),
                    ctrl: Math.floor(subStats.ctrl * Math.max(statMultiplier, 2.0) * 1.2)
                },
                statusEffects: [],
                shinryokuType: normalizeShinryokuType(comp.shinryokuType),
                description: `${leaderNpc.name}의 결사대 동료 ${comp.name}입니다.`,
                skills: escortSkills,
                critDmgResist,
                critResist
            };
            (escortEnemy as any).isNpc = true;
            partyList.push(escortEnemy);
        });
        return partyList;
    }

    // 일반 고레벨 NPC / 영원의 라이벌 결사대 3인 자동 구성 (총 4인 풀파티)
    const partyList: Enemy[] = [leaderEnemy];
    const nation = leaderNpc.nation || '대한민국';
    const escortCount = isEternal ? 3 : (level >= 300 ? 3 : 2);

    const ESCORT_ROLES = [
        {
            role: '정예 수호 무사',
            job: '기사',
            shinryoku: '강철계',
            hpBonus: 1.3,
            defBonus: 1.4,
            skillName: '철벽의 방패 돌진',
            skillType: SkillType.PHYSICAL,
            desc: '단단한 중갑과 방패로 주군을 결사 호위하는 근위 기사입니다.'
        },
        {
            role: '비전 마도사',
            job: '마법사',
            shinryoku: '전격계',
            hpBonus: 0.9,
            defBonus: 0.9,
            skillName: '연쇄 전격 폭풍',
            skillType: SkillType.MAGIC,
            desc: '후방에서 전술 파괴 마법을 영창하는 정예 마도사입니다.'
        },
        {
            role: '성역 치유사',
            job: '사제',
            shinryoku: '광휘계',
            hpBonus: 1.0,
            defBonus: 1.1,
            skillName: '성스러운 가호와 치유',
            skillType: SkillType.HEAL,
            desc: '아군에게 지속적인 치유와 방어 결계를 거는 지원 사제입니다.'
        }
    ];

    for (let i = 0; i < escortCount; i++) {
        const tmpl = ESCORT_ROLES[i % ESCORT_ROLES.length];
        const escortLevel = Math.max(1, Math.floor(level * (0.88 + Math.random() * 0.1)));
        const escortGender: 'male' | 'female' = i % 2 === 0 ? 'male' : 'female';
        const escortName = generateName(nation, escortGender);
        const escortTier = getTierByLevel(escortLevel);
        const { hpMultiplier, statMultiplier, critDmgResist, critResist } = getNpcDifficultyMultiplier(escortLevel, escortTier);
        const baseStats = generateEnemyStats(escortLevel, 'elite');
        
        const escortHp = Math.floor(baseStats.maxHp * hpMultiplier * tmpl.hpBonus * 0.85);

        const escortEnemy: Enemy = {
            id: `npc_escort_${leaderNpc.id}_${i}`,
            name: `[${tmpl.role}] ${escortName}`,
            level: escortLevel,
            hp: escortHp,
            maxHp: escortHp,
            stats: {
                ...baseStats,
                hp: escortHp,
                maxHp: escortHp,
                str: Math.floor(baseStats.str * statMultiplier * 0.85),
                int: Math.floor(baseStats.int * statMultiplier * 0.85),
                def: Math.floor(baseStats.def * statMultiplier * tmpl.defBonus * 0.85),
                agi: Math.floor(baseStats.agi * statMultiplier * 0.85),
                wis: Math.floor(baseStats.wis * statMultiplier * 0.85),
                ctrl: Math.floor(baseStats.ctrl * statMultiplier * 0.85)
            },
            statusEffects: [],
            shinryokuType: tmpl.shinryoku,
            description: `${leaderNpc.name}의 곁을 사수하는 ${tmpl.desc}`,
            skills: [
                {
                    name: tmpl.skillName,
                    type: tmpl.skillType,
                    targetType: tmpl.skillType === SkillType.HEAL ? 'self' : 'single',
                    tier: ClassTier.SECOND,
                    powerRatio: tmpl.skillType === SkillType.HEAL ? 100 : 170,
                    mpCost: 15,
                    level: Math.min(10, Math.floor(escortLevel / 100) + 1),
                    maxLevel: 10,
                    currentMastery: 0,
                    effectFormula: tmpl.skillType === SkillType.HEAL ? 'RECOV 30%' : 'STR*1.7',
                    description: `${tmpl.role}의 실전 전술 비기입니다.`
                }
            ],
            critDmgResist: Math.floor(critDmgResist * 0.8),
            critResist: Math.floor(critResist * 0.8)
        };
        (escortEnemy as any).isNpc = true;
        partyList.push(escortEnemy);
    }

    return partyList;
};
