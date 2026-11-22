import React, { memo } from 'react';
import CombatInterface from '../CombatInterface';
import Bg3ArenaCanvas, { Bg3BattleResult } from '../bg3/Bg3ArenaCanvas';
import { isCoreSrpgCombat } from '../../services/srpgBattleEngine';
import { CombatState, Character } from '../../types';

interface IsolatedCombatContainerProps {
  combatState: CombatState;
  player: Character;
  onAction: (actionText: string, mpCost?: number) => void;
  isLoading: boolean;
  narrative?: string;
  onUpdateCharacter?: (newChar: Character, logMsg?: string) => void;
  onResolveSrpgCombat?: (result: Bg3BattleResult) => void;
}

/**
 * 전투 전용 상태 격리 컨테이너 (Isolated Combat Container)
 * - 전투 진행 중 턴이 돌 때 전체 게임 화면(App 최상위 트리, 헤더, 퀘스트 등)이
 *   불필요하게 통째로 다시 그려지는 것을 차단하고, 전투 인터페이스만 독립적으로 갱신되도록 격리합니다.
 * - React.memo를 통해 전투 턴과 관련된 핵심 데이터(체력, 턴 수, 행동 유닛 등)가 실질적으로
 *   변경되었을 때만 정밀하게 리렌더링을 허용합니다.
 */
/**
 * 상태이상(버프/디버프) 목록의 실질적 변경 여부를 JSON.stringify 없이 초고속으로 검사합니다.
 */
const areStatusEffectsEqual = (a: any[] = [], b: any[] = []): boolean => {
  if (a === b) return true;
  if (!a || !b || a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const itemA = a[i];
    const itemB = b[i];
    if (!itemA || !itemB) return false;
    if (
      itemA.name !== itemB.name ||
      itemA.duration !== itemB.duration ||
      itemA.durationTurns !== itemB.durationTurns ||
      itemA.value !== itemB.value ||
      itemA.stacks !== itemB.stacks
    ) {
      return false;
    }
  }
  return true;
};

export const IsolatedCombatContainer: React.FC<IsolatedCombatContainerProps> = memo(
  ({ combatState, player, onAction, isLoading, narrative, onUpdateCharacter, onResolveSrpgCombat }) => {
    const useSrpg = Boolean(onResolveSrpgCombat && isCoreSrpgCombat(combatState) && !combatState.isEnded);

    if (useSrpg && onResolveSrpgCombat) {
      const cType = String(combatState.type || 'boss');
      const isLargeWar = ['god_rebellion', 'temple_invasion', 'temple_defense', 'divine_invasion', 'magye_god_slaying', 'magye_temple_invasion', 'magye_rebellion', 'war_battle', 'regional_uprising'].includes(cType);
      const titleMap: Record<string, string> = {
        god_rebellion: '절대신 반란전 (BG3 무격자 전술전)',
        temple_invasion: '신계 성전 정벌전 (BG3 무격자 전술전)',
        temple_defense: '성전 방어전 (BG3 무격자 전술전)',
        divine_invasion: '신성 국가 정벌전 (BG3 무격자 전술전)',
        magye_god_slaying: '천마 대전 — 절대신 토벌 (BG3 무격자 전술전)',
        magye_temple_invasion: '마계 성전 침공전 (BG3 무격자 전술전)',
        magye_rebellion: '마계 옥좌 찬탈전 (BG3 무격자 전술전)',
        war_battle: '국가 전면전 (BG3 무격자 전술전)',
        regional_uprising: '지역 반란 진압전 (BG3 무격자 전술전)',
      };
      const primaryEnemyName = combatState.enemies[0]?.name || '보스';
      const srpgTitle = titleMap[cType] || `보스 전술 결전 — ${primaryEnemyName}`;

      return (
        <div className="flex-1 flex flex-col relative w-full h-full overflow-hidden isolate p-1 sm:p-2 bg-slate-950">
          <Bg3ArenaCanvas
            character={player}
            enemies={combatState.enemies}
            title={srpgTitle}
            subtitle={`${player.currentLocation?.nation || ''} · ${player.currentLocation?.city || ''} | 발더스 게이트 3 스타일 무격자 자유 전술전`}
            region={player.currentLocation?.region}
            nation={player.currentLocation?.nation}
            city={player.currentLocation?.city}
            isLargeWar={isLargeWar}
            onComplete={onResolveSrpgCombat}
            onRetreat={() =>
              onResolveSrpgCombat({
                isVictory: false,
                turns: 1,
                playerFinalHp: Math.max(1, player.stats?.hp || 1),
                companionFinalHps: {},
                defeatedEnemyCount: 0
              })
            }
          />
        </div>
      );
    }

    return (
      <div className="flex-1 flex flex-col relative w-full h-full overflow-hidden isolate">
        <CombatInterface
          combatState={combatState}
          player={player}
          onAction={onAction}
          isLoading={isLoading}
          narrative={narrative}
          onUpdateCharacter={onUpdateCharacter}
        />
      </div>
    );
  },
  (prev, next) => {
    // 1. 로딩 상태 변경 시 리렌더링
    if (prev.isLoading !== next.isLoading) return false;

    // 2. 전투 종료 여부 변경 시 리렌더링
    if (prev.combatState.isEnded !== next.combatState.isEnded) return false;

    // 3. 턴 번호 / 라운드 / 활성 유닛 변경 시 리렌더링
    if (prev.combatState.turn !== next.combatState.turn) return false;
    if (prev.combatState.round !== next.combatState.round) return false;
    if (prev.combatState.activeUnitIndex !== next.combatState.activeUnitIndex) return false;
    if ((prev.combatState.turnQueue || []).length !== (next.combatState.turnQueue || []).length) return false;

    // 4. 서사 텍스트 변경 시 리렌더링
    if (prev.narrative !== next.narrative) return false;

    // 5. 플레이어 체력 / 마나 / 상태이상 변경 시 리렌더링
    if (prev.player?.stats?.hp !== next.player?.stats?.hp) return false;
    if (prev.player?.stats?.mp !== next.player?.stats?.mp) return false;
    if (!areStatusEffectsEqual(prev.player?.statusEffects, next.player?.statusEffects)) return false;

    // 6. 적 유닛들의 체력 상태 검사
    const prevEnemies = prev.combatState.enemies || [];
    const nextEnemies = next.combatState.enemies || [];
    if (prevEnemies.length !== nextEnemies.length) return false;
    for (let i = 0; i < prevEnemies.length; i++) {
      if (prevEnemies[i]?.hp !== nextEnemies[i]?.hp) return false;
      if ((prevEnemies[i] as any)?.mp !== (nextEnemies[i] as any)?.mp) return false;
      if (!areStatusEffectsEqual(prevEnemies[i]?.statusEffects, nextEnemies[i]?.statusEffects)) return false;
    }

    // 7. 동료 유닛들의 체력 상태 검사
    const prevComps = prev.player?.companions || [];
    const nextComps = next.player?.companions || [];
    if (prevComps.length !== nextComps.length) return false;
    for (let i = 0; i < prevComps.length; i++) {
      if (prevComps[i]?.stats?.hp !== nextComps[i]?.stats?.hp) return false;
      if (prevComps[i]?.stats?.mp !== nextComps[i]?.stats?.mp) return false;
      if (!areStatusEffectsEqual(prevComps[i]?.statusEffects, nextComps[i]?.statusEffects)) return false;
    }

    // 8. 전투 로그 길이 변경 시 리렌더링
    if ((prev.combatState.log || []).length !== (next.combatState.log || []).length) return false;

    // 위 조건 외의 부모 상태(다른 비전투 데이터 등) 변경으로 인한 리렌더링은 완전 차단!
    return true;
  }
);

IsolatedCombatContainer.displayName = 'IsolatedCombatContainer';
export default IsolatedCombatContainer;
