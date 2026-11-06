import { Character, Companion, Enemy, Skill, SkillType, MonsterStage, Item } from '../types';
import { calculateDamage } from '../utils';

export interface MountCombatActionResult {
    log: string;
    anyKill: boolean;
    killedEnemies: Enemy[];
}

export class MountCombatService {
    private static mountCache = new Map<string, { mount?: Companion; timestamp: number }>();

    /**
     * 특정 유닛(플레이어 또는 동료)의 탈것 동료를 안전하게 반환합니다 (인메모리 캐싱 지원).
     */
    public static getActiveMount(rider: Character | Companion, rootChar: Character): Companion | undefined {
        if (rider.mountedMonster) {
            return rider.mountedMonster;
        }
        const mountId = rider.mountedMonsterId;
        if (!mountId) return undefined;

        const cacheKey = `${(rider as any).id || rider.name}_${mountId}`;
        const cached = this.mountCache.get(cacheKey);
        const now = Date.now();
        if (cached && (now - cached.timestamp < 1000)) {
            return cached.mount;
        }

        let mount: Companion | undefined = undefined;
        if (rootChar.mountedMonster && rootChar.mountedMonster.id === mountId) {
            mount = rootChar.mountedMonster;
        } else {
            const compWithMount = rootChar.companions?.find(c => c.id === mountId || c.mountedMonster?.id === mountId);
            if (compWithMount) {
                mount = compWithMount.id === mountId ? compWithMount : compWithMount.mountedMonster;
            } else if (rootChar.inactiveCompanions) {
                mount = rootChar.inactiveCompanions.find(c => c.id === mountId);
            } else if (rootChar.base?.capturedMonsters) {
                mount = rootChar.base.capturedMonsters.find(m => m.id === mountId) as any;
            }
        }

        this.mountCache.set(cacheKey, { mount, timestamp: now });
        return mount;
    }

    /**
     * 플레이어 및 모든 동료가 장착 중인 모든 활성 탈것 목록을 가져옵니다.
     */
    public static getAllActiveMounts(rootChar: Character): Companion[] {
        const mounts: Companion[] = [];
        const seenIds = new Set<string>();

        if (rootChar.mountedMonster && !seenIds.has(rootChar.mountedMonster.id)) {
            mounts.push(rootChar.mountedMonster);
            seenIds.add(rootChar.mountedMonster.id);
        }

        if (rootChar.companions) {
            rootChar.companions.forEach(c => {
                if (c.mountedMonster && !seenIds.has(c.mountedMonster.id)) {
                    mounts.push(c.mountedMonster);
                    seenIds.add(c.mountedMonster.id);
                }
            });
        }

        return mounts;
    }

    /**
     * 처치 경험치를 탈것 몬스터들에게 1/5 비율로 분배합니다.
     */
    public static distributeKillExpToMounts(charState: Character, baseExp: number): { mountId: string; name: string; expGained: number }[] {
        if (baseExp <= 0) return [];

        const mountExp = Math.max(1, Math.floor(baseExp / 5));
        const distributionLog: { mountId: string; name: string; expGained: number }[] = [];

        // 1. 플레이어 장착 탈것
        const isPlayerAlive = charState.stats.hp > 0 && !charState.isDead;
        if (charState.mountedMonster && isPlayerAlive) {
            const m = charState.mountedMonster;
            if (m.stats.hp > 0 && !m.isDead) {
                m.currentExp = (m.currentExp || 0) + mountExp;
                distributionLog.push({ mountId: m.id, name: m.name, expGained: mountExp });
            }
        }

        // 2. 파티 동료 장착 탈것
        if (charState.companions) {
            charState.companions.forEach(c => {
                const isCompanionAlive = c.stats.hp > 0 && !c.isDead;
                if (c.mountedMonster && isCompanionAlive) {
                    const m = c.mountedMonster;
                    if (m.stats.hp > 0 && !m.isDead) {
                        m.currentExp = (m.currentExp || 0) + mountExp;
                        distributionLog.push({ mountId: m.id, name: m.name, expGained: mountExp });
                    }
                }
            });
        }

        return distributionLog;
    }

    /**
     * 장착 중인 탈것들의 레벨업을 검사하고 적용합니다.
     */
    public static applyLevelUpToMounts(
        char: Character,
        applyLevelUpFn: (comps: Companion[]) => { updatedComps: Companion[]; leveledUpCompanions: { companion: Companion; oldLevel: number }[] }
    ): { leveledUpCompanions: { companion: Companion; oldLevel: number }[] } {
        const leveledUpList: { companion: Companion; oldLevel: number }[] = [];

        // 1. 플레이어 장착 탈것 레벨업 체크
        if (char.mountedMonster) {
            const mountResult = applyLevelUpFn([char.mountedMonster]);
            char.mountedMonster = mountResult.updatedComps[0];
            leveledUpList.push(...mountResult.leveledUpCompanions);
        }

        // 2. 동료 장착 탈것 레벨업 체크
        if (char.companions) {
            char.companions = char.companions.map(c => {
                if (c.mountedMonster) {
                    const mResult = applyLevelUpFn([c.mountedMonster]);
                    leveledUpList.push(...mResult.leveledUpCompanions);
                    return { ...c, mountedMonster: mResult.updatedComps[0] };
                }
                return c;
            });
        }

        return { leveledUpCompanions: leveledUpList };
    }

    /**
     * 전투 결과창 등에서 탈것 몬스터의 경험치/레벨 변화를 표시하기 위한 참가자 상태를 생성합니다.
     */
    public static getMountParticipantStates(
        char: Character,
        calculateRequiredExpFn: (lvl: number, stats?: any) => number
    ): any[] {
        const mountStates: any[] = [];
        const seenIds = new Set<string>();

        const buildState = (mount: Companion, ownerName: string) => {
            if (seenIds.has(mount.id)) return;
            seenIds.add(mount.id);
            mountStates.push({
                id: mount.id,
                name: `[탈것] ${mount.name} (${ownerName} 탑승)`,
                level: mount.level || 1,
                currentExp: mount.currentExp || 0,
                requiredExp: mount.maxExp || calculateRequiredExpFn(mount.level || 1, mount.stats),
                visualUrl: mount.visualUrl || (mount as any).monsterData?.visualUrl || (mount as any).appearance,
                targetCombatStyle: mount.targetCombatStyle,
                combatStyle: mount.combatStyle,
                combatStyleProgress: mount.combatStyleProgress ? JSON.parse(JSON.stringify(mount.combatStyleProgress)) : {},
                skills: mount.skills ? mount.skills.map((s: Skill) => ({
                    name: s.name,
                    level: s.level,
                    currentMastery: s.currentMastery || 0
                })) : [],
                weaponMastery: []
            });
        };

        if (char.mountedMonster) {
            buildState(char.mountedMonster, char.name);
        }

        if (char.companions) {
            char.companions.forEach(c => {
                if (c.mountedMonster) {
                    buildState(c.mountedMonster, c.name);
                }
            });
        }

        return mountStates;
    }

    /**
     * 라이더(플레이어 혹은 동료)의 행동 후, 탑승 중인 탈것 몬스터가 전투 행동을 실행합니다.
     */
    public static executeMountCombatAction(params: {
        mount: Companion;
        riderName: string;
        simulationEnemies: Enemy[];
        nextCharState: Character;
        executeSkill: (skill: Skill, caster: any, targets: any[]) => void;
        onEnemyKilled?: (target: Enemy, exp: number, gold: number, loot: Item[]) => void;
        getRewardBonuses: () => { expBonus: number; goldBonus: number; expMultiplier: number; goldMultiplier: number };
        calculateMonsterExp: (enemy: Enemy) => number;
        calculateMonsterGold: (enemy: Enemy) => number;
        generateLoot: (enemy: Enemy, nation?: string, char?: Character) => Item[];
    }): MountCombatActionResult {
        const {
            mount,
            riderName,
            simulationEnemies,
            nextCharState,
            executeSkill,
            onEnemyKilled,
            getRewardBonuses,
            calculateMonsterExp,
            calculateMonsterGold,
            generateLoot
        } = params;

        let log = '';
        let anyKill = false;
        const killedEnemies: Enemy[] = [];

        // 1. 탈것 생존 및 상태 확인
        if (mount.stats.hp <= 0 || mount.isDead) {
            return { log, anyKill, killedEnemies };
        }

        // 상태이상 행동불가 체크
        let skipTurn = false;
        let ccName = '';
        mount.statusEffects?.forEach(eff => {
            if (['빙결', '기절', '마비', '수면', '소멸'].includes(eff.name)) {
                skipTurn = true;
                ccName = eff.name;
            } else if (eff.name === '감전' && Math.random() < 0.75) {
                skipTurn = true;
                ccName = '감전';
            } else if (eff.name === '속박' && Math.random() < 0.75) {
                skipTurn = true;
                ccName = '속박';
            } else if (eff.name === '혼란' && Math.random() < 0.5) {
                skipTurn = true;
                ccName = '혼란';
            }
        });

        if (skipTurn) {
            log += `\n[탈것: ${mount.name}] 행동불가 (${ccName})`;
            return { log, anyKill, killedEnemies };
        }

        const livingEnemies = simulationEnemies.filter(e => e.hp > 0);
        if (livingEnemies.length === 0) {
            return { log, anyKill, killedEnemies };
        }

        const mName = mount.name;
        const mStats = mount.stats;
        const usableSkills = mount.skills?.filter(s => s.mpCost <= (mStats?.mp || 0) && s.type !== SkillType.PASSIVE) || [];
        const shouldSkill = usableSkills.length > 0 && Math.random() < 0.4;

        if (shouldSkill) {
            // 탈것 스킬 사용
            const skill = usableSkills[Math.floor(Math.random() * usableSkills.length)];
            mStats.mp = Math.max(0, mStats.mp - skill.mpCost);
            log += `\n[탈것: ${mName}] (${riderName}의 탈것) 스킬 사용! ${skill.name} (MP -${skill.mpCost})`;

            const targets: any[] = [];
            if (skill.targetType === 'aoe') {
                simulationEnemies.forEach((e: Enemy, i: number) => {
                    if (e.hp > 0) targets.push({ type: 'enemy', idx: i, entity: e });
                });
            } else {
                const target = livingEnemies[Math.floor(Math.random() * livingEnemies.length)];
                const targetIdx = simulationEnemies.indexOf(target);
                targets.push({ type: 'enemy', idx: targetIdx, entity: target });
            }

            executeSkill(skill, mount, targets);

            // 스킬 사용 후 적 사망 체크
            targets.forEach(t => {
                if (t.type === 'enemy' && t.entity.hp <= 0 && !killedEnemies.includes(t.entity)) {
                    anyKill = true;
                    killedEnemies.push(t.entity);
                }
            });
        } else {
            // 탈것 일반 공격
            const target = livingEnemies[Math.floor(Math.random() * livingEnemies.length)];
            const targetIdx = simulationEnemies.indexOf(target);
            const result = calculateDamage(mount, target, undefined, nextCharState);
            if (result.isMiss) {
                log += `\n[탈것: ${mName}] ${target.name}에게 공격을 시도했으나 빗나갔습니다!`;
            } else {
                const newHp = Math.max(0, target.hp - result.damage);
                simulationEnemies[targetIdx] = { ...target, hp: newHp };
                log += `\n[탈것: ${mName}] ${target.name}에게 ${result.damage}의 피해!`;
                log += `\n[시스템: ${target.name} HP -${result.damage}] (by 탈것: ${mName})`;
                if (result.isCrit) log += ' (치명타!)';

                if (newHp <= 0 && target.hp > 0) {
                    anyKill = true;
                    killedEnemies.push(target);
                    const curBonuses = getRewardBonuses();
                    const rawExp = calculateMonsterExp(target);
                    const rawGold = calculateMonsterGold(target);
                    const exp = Math.floor(rawExp * (1 + curBonuses.expBonus / 100) * (curBonuses.expMultiplier || 1.0));
                    const gold = Math.floor(rawGold * (1 + curBonuses.goldBonus / 100) * (curBonuses.goldMultiplier || 1.0));
                    const loot = generateLoot(target, nextCharState.currentLocation?.nation, nextCharState);
                    if (onEnemyKilled) {
                        onEnemyKilled(target, exp, gold, loot);
                    }
                }
            }
        }

        return { log, anyKill, killedEnemies };
    }
}
