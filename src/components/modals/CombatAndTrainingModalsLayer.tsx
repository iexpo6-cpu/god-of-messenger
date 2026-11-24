import React, { Suspense } from 'react';
import { Character, CombatState, WeaponType, CombatStyle, Enemy } from '../../types';
import { NATION_THEMES, getMonsterInfo, getHuntBandsForLocation, getMonsterPoolForBand } from '../../monsterfield';
import { generateProceduralEnemy } from '../../utils';
import { ResultData } from '../ActionResultModal';
import { SuddenEventData } from '../../services/suddenEventService';
import { TrainingReportData } from '../TrainingReportModal';
import SceneLoadingFallback from '../SceneLoadingFallback';
import {
  CombatResultModal,
  SuddenEventModal,
  DungeonModal,
  TacticsModal,
  TrainingModal,
  TrainingReportModal,
  TrainingStyleModal,
  TacticalTrainingModal,
  BestiaryModal
} from './lazyModals';

interface Props {
  character: Character;
  setCharacter: React.Dispatch<React.SetStateAction<Character>>;
  sceneType: string;
  combatResultData: any;
  setCombatResultData: ((data: any) => void) | undefined;
  activeSuddenEvent: SuddenEventData | null;
  setActiveSuddenEvent: (event: SuddenEventData | null) => void;
  advanceGameTime: (char: Character, minutes: number, options?: any) => any;
  addToLog: (msg: string) => void;
  setCityInitialConfig: (cfg: any) => void;
  setIsCityOpen: (open: boolean) => void;
  isDungeonOpen: boolean;
  setIsDungeonOpen: (open: boolean) => void;
  handleUpdateCharacter: (newChar: Character, logMsg?: string) => void;
  setResultModalData: (data: ResultData | null) => void;
  setCombatState: (state: CombatState) => void;
  setSceneType: (scene: any) => void;
  handleBattleTrigger: (enemies: any, type: any, source?: string, locationName?: string, nationName?: string) => void;
  isTacticsOpen: boolean;
  setIsTacticsOpen: (open: boolean) => void;
  isTrainingModalOpen: boolean;
  setIsTrainingModalOpen: (open: boolean) => void;
  handleExpTraining: (amount?: number, targetName?: string) => void;
  handleStatTraining: (statKey: string, targetId: string, amount?: number) => void;
  handleWeaponTraining: (weaponType: WeaponType, targetId: string, amount?: number) => void;
  trainingInitialTab: 'exp' | 'stat' | 'mastery' | 'trainer';
  trainingReportData: TrainingReportData | null;
  setTrainingReportData: (data: TrainingReportData | null) => void;
  isTrainingStyleOpen: boolean;
  setIsTrainingStyleOpen: (open: boolean) => void;
  handleUpdateCombatStyle: (style: any, target: any) => void;
  handlePromoteCombatStyle: (targetId: string, newStyle: CombatStyle) => void;
  isTacticalTrainingOpen: boolean;
  setIsTacticalTrainingOpen: (open: boolean) => void;
  isBestiaryOpen: boolean;
  setIsBestiaryOpen: ((open: boolean) => void) | undefined;
}

export const CombatAndTrainingModalsLayer: React.FC<Props> = ({
  character,
  setCharacter,
  sceneType,
  combatResultData,
  setCombatResultData,
  activeSuddenEvent,
  setActiveSuddenEvent,
  advanceGameTime,
  addToLog,
  setCityInitialConfig,
  setIsCityOpen,
  isDungeonOpen,
  setIsDungeonOpen,
  handleUpdateCharacter,
  setResultModalData,
  setCombatState,
  setSceneType,
  handleBattleTrigger,
  isTacticsOpen,
  setIsTacticsOpen,
  isTrainingModalOpen,
  setIsTrainingModalOpen,
  handleExpTraining,
  handleStatTraining,
  handleWeaponTraining,
  trainingInitialTab,
  trainingReportData,
  setTrainingReportData,
  isTrainingStyleOpen,
  setIsTrainingStyleOpen,
  handleUpdateCombatStyle,
  handlePromoteCombatStyle,
  isTacticalTrainingOpen,
  setIsTacticalTrainingOpen,
  isBestiaryOpen,
  setIsBestiaryOpen
}) => {
  return (
    <>
      {sceneType === 'normal' && combatResultData && (
        <CombatResultModal 
          data={combatResultData} 
          onClose={() => { 
            const pendingEvent = (combatResultData as any)?.suddenEvent;
            const timeRes = advanceGameTime(character, 1, { isDungeonOrCombat: true, activityName: "전투 종료" });
            if (timeRes.systemLogs && timeRes.systemLogs.length > 0) {
              timeRes.systemLogs.forEach((l: string) => addToLog(l));
            }
            setCharacter(timeRes.updatedCharacter); 
            setCombatResultData?.(null); 
            if (pendingEvent) {
              setActiveSuddenEvent(pendingEvent);
            }
          }} 
          onTriggerSuddenEvent={(suddenEvt) => {
            const timeRes = advanceGameTime(character, 1, { isDungeonOrCombat: true, activityName: "전투 종료" });
            if (timeRes.systemLogs && timeRes.systemLogs.length > 0) {
              timeRes.systemLogs.forEach((l: string) => addToLog(l));
            }
            setCharacter(timeRes.updatedCharacter);
            setCombatResultData?.(null);
            setActiveSuddenEvent(suddenEvt);
          }}
          onContinueBattle={() => {
            const cType = combatResultData?.combatType;
            const isInstantDungeon = cType === 'instant_dungeon' || !!character.dungeonProgress?.dungeonId;
            const instDungeonId = combatResultData?.dungeonId || character.dungeonProgress?.dungeonId || character.instantDungeons?.[0]?.id;
            setCombatResultData?.(null);
            if (cType === 'Hunt') {
              // 야외 사냥터 캔버스(OutskirtsRpgCanvas) 전투 시 HuntMapModal을 열지 않고 현재 사냥터 영역 캔버스 유지
              return;
            }
            if (isInstantDungeon && instDungeonId) {
              setCityInitialConfig({
                openInstantDungeonId: instDungeonId
              });
            } else {
              setCityInitialConfig({ 
                district: 'Outskirts', 
                openHuntMap: true,
                initialBandId: character.lastHuntingBandId 
              });
            }
            setIsCityOpen(true);
          }}
          onRematch={() => {
            const cType = combatResultData?.combatType || 'normal';
            if ((cType !== 'normal' && cType !== 'Hunt') || combatResultData?.suddenEvent || combatResultData?.suddenEventType || combatResultData?.isSuddenEvent) {
              return;
            }
            if (character.stats && character.stats.hp <= 0) {
              alert("체력이 다하여 재전투를 진행할 수 없습니다. 휴식을 취하거나 회복 후 도전하세요.");
              return;
            }

            const timeRes = advanceGameTime(character, 1, { isDungeonOrCombat: true, activityName: "전투 종료 및 즉시 재전투" });
            if (timeRes.systemLogs && timeRes.systemLogs.length > 0) {
              timeRes.systemLogs.forEach((l: string) => addToLog(l));
            }
            setCharacter(timeRes.updatedCharacter);
            setCombatResultData?.(null);

            const region = character.currentLocation?.region;
            const nation = character.currentLocation?.nation || character.nation;
            const city = character.currentLocation?.city || "";
            const bandId = combatResultData?.huntingBandId || combatResultData?.defenseSource || character.lastHuntingBandId;
            const bands = getHuntBandsForLocation(nation, region, city);
            const matchedBand = bandId ? bands.find(b => b.id === bandId) : undefined;
            const nextBattleType = cType === 'Hunt' ? 'Hunt' : 'normal';

            if (matchedBand) {
              const [minLvl, maxLvl] = matchedBand.levelRange;
              const targetLevel = Math.floor(Math.random() * (maxLvl - minLvl + 1)) + minLvl;
              const theme = NATION_THEMES[city] || NATION_THEMES[nation] || NATION_THEMES["default"];
              const monsterPool = getMonsterPoolForBand(theme, matchedBand.id);
              const enemyCount = Math.floor(Math.random() * 4) + 1;
              const tempEnemies: Enemy[] = [];
              for (let i = 0; i < enemyCount; i++) {
                const baseEnemy = generateProceduralEnemy(targetLevel);
                if (monsterPool && monsterPool.length > 0) {
                  const themedName = monsterPool[Math.floor(Math.random() * monsterPool.length)];
                  const monsterInfo = getMonsterInfo(themedName);
                  baseEnemy.name = monsterInfo.name;
                  baseEnemy.visualUrl = monsterInfo.visualUrl;
                  if (monsterInfo.shinryokuType) {
                    baseEnemy.shinryokuType = monsterInfo.shinryokuType;
                  }
                }
                tempEnemies.push(baseEnemy);
              }
              const nameCounts: Record<string, number> = {};
              tempEnemies.forEach(e => { nameCounts[e.name] = (nameCounts[e.name] || 0) + 1; });
              const freshEnemies = tempEnemies.map((e, idx) => {
                if (nameCounts[e.name] > 1) {
                  const count = tempEnemies.slice(0, idx + 1).filter(n => n.name === e.name).length;
                  return { ...e, name: `${e.name} ${String.fromCharCode(64 + count)}` };
                }
                return e;
              });
              handleBattleTrigger(freshEnemies, nextBattleType as any, bandId);
            } else {
              const fallbackLevel = combatResultData?.lastEnemies?.[0]?.level || character.level;
              const enemyCount = Math.floor(Math.random() * 3) + 1;
              const tempEnemies: Enemy[] = [];
              for (let i = 0; i < enemyCount; i++) {
                tempEnemies.push(generateProceduralEnemy(fallbackLevel));
              }
              const nameCounts: Record<string, number> = {};
              tempEnemies.forEach(e => { nameCounts[e.name] = (nameCounts[e.name] || 0) + 1; });
              const freshEnemies = tempEnemies.map((e, idx) => {
                if (nameCounts[e.name] > 1) {
                  const count = tempEnemies.slice(0, idx + 1).filter(n => n.name === e.name).length;
                  return { ...e, name: `${e.name} ${String.fromCharCode(64 + count)}` };
                }
                return e;
              });
              handleBattleTrigger(freshEnemies, nextBattleType as any, bandId);
            }
          }}
        />
      )}

      {sceneType === 'normal' && activeSuddenEvent && (
        <SuddenEventModal
          event={activeSuddenEvent}
          character={character}
          onClose={() => setActiveSuddenEvent(null)}
          onUpdateCharacter={(newChar, logMsg) => {
            handleUpdateCharacter(newChar, logMsg);
          }}
          setResultModalData={setResultModalData}
          onStartSuddenCombat={(evt) => {
            setActiveSuddenEvent(null);
            if (!evt.enemies || evt.enemies.length === 0) return;
            const combatType: any =
              evt.originalCombatType === 'dungeon'
                ? 'dungeon'
                : evt.originalCombatType === 'instant_dungeon'
                ? 'instant_dungeon'
                : 'normal';

            const newCombatState: CombatState = {
              enemies: evt.enemies,
              turn: 1,
              log: [`[돌발 이벤트] ${evt.message}`],
              isEnded: false,
              type: combatType
            };
            (newCombatState as any).suddenEventType = evt.type;
            if (evt.expMultiplier) (newCombatState as any).suddenExpMultiplier = evt.expMultiplier;
            if (evt.masteryBonus) (newCombatState as any).suddenMasteryBonus = evt.masteryBonus;
            if (evt.baseCombatExp) (newCombatState as any).baseCombatExp = evt.baseCombatExp;
            if (evt.levelUpCount) (newCombatState as any).suddenLevelUpCount = evt.levelUpCount;
            if (evt.rewardMultiplier) (newCombatState as any).suddenRewardMultiplier = evt.rewardMultiplier;
            if (evt.lootRollCount) (newCombatState as any).suddenLootRolls = evt.lootRollCount;
            if (evt.dungeonId) (newCombatState as any).dungeonId = evt.dungeonId;

            setCombatState(newCombatState);
            setSceneType('combat');
            setIsCityOpen(false);
            if (combatType !== 'dungeon') {
              setIsDungeonOpen(false);
            }
          }}
        />
      )}

      {isDungeonOpen && sceneType !== 'combat' && (
        <Suspense fallback={<SceneLoadingFallback mode="dungeon" title="던전 심연 진입 중" />}>
          <DungeonModal 
            isOpen={isDungeonOpen} 
            character={character} 
            onClose={() => setIsDungeonOpen(false)} 
            onBattle={(enemy) => handleBattleTrigger(enemy, 'dungeon')} 
            onUpdateCharacter={handleUpdateCharacter} 
          />
        </Suspense>
      )}

      {isTacticsOpen && (
        <TacticsModal 
          character={character} 
          onUpdateCharacter={handleUpdateCharacter} 
          onClose={() => setIsTacticsOpen(false)} 
        />
      )}

      {isTrainingModalOpen && (
        <TrainingModal 
          character={character} 
          onClose={() => setIsTrainingModalOpen(false)} 
          onExpTraining={handleExpTraining} 
          onStatTraining={handleStatTraining} 
          onWeaponTraining={handleWeaponTraining} 
          onUpdateCharacter={handleUpdateCharacter} 
          initialTab={trainingInitialTab} 
        />
      )}

      {trainingReportData && (
        <TrainingReportModal 
          data={trainingReportData} 
          onClose={() => setTrainingReportData(null)} 
        />
      )}

      {isTrainingStyleOpen && (
        <TrainingStyleModal 
          character={character} 
          onClose={() => setIsTrainingStyleOpen(false)} 
          onUpdateTargetStyle={handleUpdateCombatStyle} 
          onPromoteStyle={handlePromoteCombatStyle} 
        />
      )}

      {isTacticalTrainingOpen && (
        <TacticalTrainingModal 
          character={character} 
          onClose={() => setIsTacticalTrainingOpen(false)} 
          onUpdateCharacter={handleUpdateCharacter} 
        />
      )}

      {isBestiaryOpen && (
        <BestiaryModal 
          character={character} 
          onClose={() => setIsBestiaryOpen?.(false)} 
        />
      )}
    </>
  );
};
