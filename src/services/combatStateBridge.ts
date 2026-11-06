import { Character, Companion } from '../types';

/**
 * 전투 상태 실시간 보존 및 동기화 브릿지
 * 
 * 문제 해결 목적:
 * 라운드의 마지막 턴 캐릭터가 버프 스킬을 사용한 직후 턴이 전진하여 [라운드 종료]가 호출될 때,
 * 리액트 화면 렌더링 지연(비동기 배치)으로 인해 버프가 적용되기 전의 과거 캐릭터 상태가
 * 시간 경과(advanceGameTime)를 거쳐 전투 루프로 덮어씌워지면서 버프가 사라지는 현상을 완벽 차단합니다.
 */
class CombatStateBridge {
    private latestCharacter: Character | null = null;
    private lastSavedTimestamp: number = 0;

    /**
     * 전투 중 턴 행동(스킬 사용, 일반 공격, 방어 등)으로 갱신된 최신 캐릭터 상태를 보존합니다.
     */
    public saveLatestCombatCharacter(char: Character): void {
        if (!char) return;
        this.latestCharacter = char;
        this.lastSavedTimestamp = Date.now();
    }

    /**
     * 보존된 최신 전투 캐릭터 상태를 가져옵니다.
     */
    public getLatestCombatCharacter(): Character | null {
        return this.latestCharacter;
    }

    /**
     * 시간 경과(advanceGameTime)로 업데이트된 캐릭터 데이터와
     * 직전 턴에서 갱신된 전투 상태(버프/디버프, 체력, 마나 등)를 완벽하게 병합합니다.
     */
    public reconcileWithLatestCombatState(incomingChar: Character): Character {
        if (!this.latestCharacter) {
            return incomingChar;
        }

        const latest = this.latestCharacter;

        // 플레이어 본인의 최신 버프 보존
        const mergedStatusEffects = latest.statusEffects ? [...latest.statusEffects] : (incomingChar.statusEffects || []);

        // 동료들의 최신 버프 및 전투 상태 보존
        const mergedCompanions = (incomingChar.companions || []).map((c, idx) => {
            const latestComp = latest.companions?.find(lc => lc.id === c.id) || latest.companions?.[idx];
            if (!latestComp) return c;

            return {
                ...c,
                stats: {
                    ...c.stats,
                    hp: latestComp.stats?.hp !== undefined ? latestComp.stats.hp : c.stats.hp,
                    mp: latestComp.stats?.mp !== undefined ? latestComp.stats.mp : c.stats.mp
                },
                statusEffects: latestComp.statusEffects ? [...latestComp.statusEffects] : (c.statusEffects || [])
            };
        });

        return {
            ...incomingChar,
            stats: {
                ...incomingChar.stats,
                hp: latest.stats?.hp !== undefined ? latest.stats.hp : incomingChar.stats.hp,
                mp: latest.stats?.mp !== undefined ? latest.stats.mp : incomingChar.stats.mp
            },
            statusEffects: mergedStatusEffects,
            companions: mergedCompanions
        };
    }

    /**
     * 전투 종료 또는 재시작 시 상태를 초기화합니다.
     */
    public clear(): void {
        this.latestCharacter = null;
        this.lastSavedTimestamp = 0;
    }
}

export const combatStateBridge = new CombatStateBridge();
