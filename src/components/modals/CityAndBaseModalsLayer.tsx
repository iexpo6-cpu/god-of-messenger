import React, { Suspense } from 'react';
import { Character, BaseDefenseReportData } from '../../types';
import { START_DATE } from '../../constants';
import { promoteNextIncident } from '../../services/incidentQueue';
import SceneLoadingFallback from '../SceneLoadingFallback';
import {
  MapModal,
  CityInterface,
  BaseModal,
  TempleManagementModal,
  ElfCityModal,
  BeastCityModal,
  DemonCityModal,
  BaseAttackModal,
  BaseDamageReportModal,
  BlacksmithModal,
  AlchemyModal,
  RestModal
} from './lazyModals';

interface Props {
  character: Character;
  setCharacter: React.Dispatch<React.SetStateAction<Character>>;
  sceneType: string;
  isMapOpen: boolean;
  setIsMapOpen: (open: boolean) => void;
  mapMode: 'travel' | 'relocate';
  setMapMode: (mode: 'travel' | 'relocate') => void;
  mapInitialTargetLocationName?: string;
  setMapInitialTargetLocationName: (name?: string) => void;
  handleTravel: (...args: any[]) => void;
  isCityOpen: boolean;
  setIsCityOpen: (open: boolean) => void;
  cityInitialConfig: any;
  setCityInitialConfig: (cfg: any) => void;
  handleAction: (action: string) => void;
  handleUpdateCharacter: (newChar: Character, logMsg?: string) => void;
  handleBattleTrigger: (enemies: any, type: any, source?: string, locationName?: string, nationName?: string) => void;
  setIsDungeonOpen: (open: boolean) => void;
  isBaseModalOpen: boolean;
  setIsBaseModalOpen: (open: boolean) => void;
  baseInitialSubModal?: { type: string; instanceId?: string };
  setBaseInitialSubModal: (sub?: { type: string; instanceId?: string }) => void;
  handleBaseUpgrade: (...args: any[]) => void;
  handleBasePurchase: (...args: any[]) => void;
  handleCompanionMove: (idx: number, toBase: boolean) => void;
  handleAssignment: (...args: any[]) => void;
  handleItemAction: (...args: any[]) => void;
  setTrainingInitialTab: (tab: 'exp' | 'stat' | 'mastery' | 'trainer') => void;
  setIsTrainingModalOpen: (open: boolean) => void;
  setIsTacticalTrainingOpen: (open: boolean) => void;
  setIsTrainingStyleOpen: (open: boolean) => void;
  handleExpTraining: (amount?: number, targetName?: string) => void;
  handleSkillResearch: (...args: any[]) => void;
  handleSkillLimitBreak: (...args: any[]) => void;
  handleItemEnhancement: (...args: any[]) => void;
  handleHostParty: (...args: any[]) => void;
  handleInteraction: (...args: any[]) => void;
  handleFacilityUpgrade: (...args: any[]) => void;
  handleExpandGrid: (...args: any[]) => void;
  handleRecallMonsterFromFarm: (id: string) => void;
  handleReturnMonsterToFarm: (id: string) => void;
  setIsProfessionMasteryOpen: (open: boolean) => void;
  setIsChefMasteryOpen: (open: boolean) => void;
  setIsBreederMasteryOpen: (open: boolean) => void;
  setActiveBaseDamageReport: (rep: BaseDefenseReportData | null) => void;
  isTempleManagementOpen: boolean;
  setIsTempleManagementOpen: (open: boolean) => void;
  isElfCityOpen: boolean;
  setIsElfCityOpen: (open: boolean) => void;
  isBeastCityOpen: boolean;
  setIsBeastCityOpen: (open: boolean) => void;
  isDemonCityOpen: boolean;
  setIsDemonCityOpen: (open: boolean) => void;
  activeBaseDamageReport: BaseDefenseReportData | null;
  addToLog: (msg: string) => void;
  isBlacksmithModalOpen: boolean;
  setIsBlacksmithModalOpen: (open: boolean) => void;
  isAlchemyModalOpen: boolean;
  setIsAlchemyModalOpen: (open: boolean) => void;
  isRestModalOpen: boolean;
  setIsRestModalOpen: (open: boolean) => void;
  handleExecuteRest: (days: number) => void;
  restModalInitialDays: number;
}

export const CityAndBaseModalsLayer: React.FC<Props> = ({
  character,
  setCharacter,
  sceneType,
  isMapOpen,
  setIsMapOpen,
  mapMode,
  setMapMode,
  mapInitialTargetLocationName,
  setMapInitialTargetLocationName,
  handleTravel,
  isCityOpen,
  setIsCityOpen,
  cityInitialConfig,
  setCityInitialConfig,
  handleAction,
  handleUpdateCharacter,
  handleBattleTrigger,
  setIsDungeonOpen,
  isBaseModalOpen,
  setIsBaseModalOpen,
  baseInitialSubModal,
  setBaseInitialSubModal,
  handleBaseUpgrade,
  handleBasePurchase,
  handleCompanionMove,
  handleAssignment,
  handleItemAction,
  setTrainingInitialTab,
  setIsTrainingModalOpen,
  setIsTacticalTrainingOpen,
  setIsTrainingStyleOpen,
  handleExpTraining,
  handleSkillResearch,
  handleSkillLimitBreak,
  handleItemEnhancement,
  handleHostParty,
  handleInteraction,
  handleFacilityUpgrade,
  handleExpandGrid,
  handleRecallMonsterFromFarm,
  handleReturnMonsterToFarm,
  setIsProfessionMasteryOpen,
  setIsChefMasteryOpen,
  setIsBreederMasteryOpen,
  setActiveBaseDamageReport,
  isTempleManagementOpen,
  setIsTempleManagementOpen,
  isElfCityOpen,
  setIsElfCityOpen,
  isBeastCityOpen,
  setIsBeastCityOpen,
  isDemonCityOpen,
  setIsDemonCityOpen,
  activeBaseDamageReport,
  addToLog,
  isBlacksmithModalOpen,
  setIsBlacksmithModalOpen,
  isAlchemyModalOpen,
  setIsAlchemyModalOpen,
  isRestModalOpen,
  setIsRestModalOpen,
  handleExecuteRest,
  restModalInitialDays
}) => {
  return (
    <>
      {isMapOpen && (
        <Suspense fallback={<SceneLoadingFallback mode="general" title="대륙 지도 불러오는 중" />}>
          <MapModal 
            isOpen={isMapOpen} 
            onClose={() => { 
              setIsMapOpen(false); 
              setMapMode('travel'); 
              setMapInitialTargetLocationName(undefined); 
            }} 
            character={character} 
            onTravel={handleTravel} 
            mode={mapMode} 
            residentCount={1 + (character.companions?.length || 0) + (character.inactiveCompanions?.length || 0)} 
            initialTargetLocationName={mapInitialTargetLocationName} 
          />
        </Suspense>
      )}

      {isCityOpen && sceneType !== 'combat' && (
        <Suspense fallback={<SceneLoadingFallback mode="city" title="도시 구역 진입 중" />}>
          <CityInterface 
            character={character} 
            onClose={() => {
              setIsCityOpen(false);
              setCityInitialConfig(null);
            }} 
            onAction={handleAction} 
            onUpdateCharacter={handleUpdateCharacter} 
            onBattle={handleBattleTrigger} 
            onOpenDungeon={() => setIsDungeonOpen(true)}
            initialDistrict={cityInitialConfig?.district}
            initialOpenHuntMap={cityInitialConfig?.openHuntMap}
            initialBandId={cityInitialConfig?.initialBandId || character.lastHuntingBandId}
            initialOpenInstantDungeonId={cityInitialConfig?.openInstantDungeonId}
          />
        </Suspense>
      )} 

      {isBaseModalOpen && (
        <Suspense fallback={<SceneLoadingFallback mode="base" title="기지 시설 진입 중" />}>
          <BaseModal 
            character={character} 
            onClose={() => { 
              setIsBaseModalOpen(false); 
              setBaseInitialSubModal(undefined); 
            }} 
            initialSubModal={baseInitialSubModal} 
            onUpgrade={handleBaseUpgrade} 
            onPurchaseBase={handleBasePurchase} 
            onMoveCompanionToBase={(idx) => handleCompanionMove(idx, true)} 
            onRecallCompanion={(idx) => handleCompanionMove(idx, false)} 
            onAssignCompanion={handleAssignment} 
            onUseFacility={(fid) => handleAction(`[기지 시설 이용] 시설: ${fid}`)} 
            onStorageAction={handleItemAction as any} 
            onHousingRest={() => handleAction('[기지 활동] (Housing) 휴식')} 
            onFacilitySpecificAction={(fid, action, target, amount) => { 
              if (fid === 'training_exp') { setTrainingInitialTab('exp'); setIsTrainingModalOpen(true); }
              else if (fid === 'training_stat') { setTrainingInitialTab('stat'); setIsTrainingModalOpen(true); }
              else if (fid === 'training_mastery') { setTrainingInitialTab('mastery'); setIsTrainingModalOpen(true); }
              else if (fid === 'tactical_training') { setIsTacticalTrainingOpen(true); }
              else if (fid === 'training_style') { setIsTrainingStyleOpen(true); }
              else if (action === '경험치 훈련') { handleExpTraining(amount, target); }
              else handleAction(`[기지 활동] (${fid}) ${action} ${target ? `대상: ${target}` : ''}`); 
            }} 
            onStatTraining={() => { setTrainingInitialTab('stat'); setIsTrainingModalOpen(true); }} 
            onSkillResearch={handleSkillResearch} 
            onSkillLimitBreak={handleSkillLimitBreak} 
            onItemEnhancement={handleItemEnhancement} 
            onWeaponTraining={() => { setTrainingInitialTab('mastery'); setIsTrainingModalOpen(true); }} 
            onParty={handleHostParty} 
            onInteraction={handleInteraction} 
            onUpdateCharacter={handleUpdateCharacter} 
            onRelocate={() => { setMapMode('relocate'); setIsMapOpen(true); }} 
            onFacilityUpgrade={handleFacilityUpgrade} 
            onExpandGrid={handleExpandGrid} 
            onRecallMonsterFromFarm={handleRecallMonsterFromFarm} 
            onReturnMonsterToFarm={handleReturnMonsterToFarm} 
            onOpenProfessionMastery={() => setIsProfessionMasteryOpen(true)} 
            onOpenChefMastery={() => setIsChefMasteryOpen(true)} 
            onOpenBreederMastery={() => setIsBreederMasteryOpen(true)} 
            onOpenTacticalTraining={() => setIsTacticalTrainingOpen(true)} 
            onBattle={(enemy, type, source, targetCity, targetNation) => handleBattleTrigger(enemy, type as any, source, targetCity, targetNation)} 
            onShowDamageReport={(rep) => setActiveBaseDamageReport(rep)} 
          />
        </Suspense>
      )}

      {isTempleManagementOpen && (
        <Suspense fallback={<SceneLoadingFallback mode="general" title="성전 관리 시설 진입 중" />}>
          <TempleManagementModal 
            character={character} 
            onClose={() => setIsTempleManagementOpen(false)} 
            onUpdateCharacter={handleUpdateCharacter} 
            onAction={handleAction} 
            onBattle={(enemy, type, source, targetCity, targetNation) => {
              handleBattleTrigger(enemy, type as any, source, targetCity, targetNation);
            }} 
          />
        </Suspense>
      )}

      {isElfCityOpen && (
        <Suspense fallback={<SceneLoadingFallback mode="city" title="세계수의 쉼터 진입 중" />}>
          <ElfCityModal 
            character={character} 
            onClose={() => setIsElfCityOpen(false)} 
            onUpdateCharacter={handleUpdateCharacter} 
          />
        </Suspense>
      )}

      {isBeastCityOpen && (
        <Suspense fallback={<SceneLoadingFallback mode="city" title="수인 투기장 진입 중" />}>
          <BeastCityModal 
            character={character} 
            onClose={() => setIsBeastCityOpen(false)} 
            onUpdateCharacter={handleUpdateCharacter} 
          />
        </Suspense>
      )}

      {isDemonCityOpen && (
        <Suspense fallback={<SceneLoadingFallback mode="city" title="마인 계약소 진입 중" />}>
          <DemonCityModal 
            character={character} 
            onClose={() => setIsDemonCityOpen(false)} 
            onUpdateCharacter={handleUpdateCharacter} 
          />
        </Suspense>
      )}

      {character.pendingBaseAttackEvent && (
        <BaseAttackModal
          character={character}
          event={character.pendingBaseAttackEvent}
          onClose={() => {
            setCharacter(prev => {
              const next = { ...prev, pendingBaseAttackEvent: undefined };
              return promoteNextIncident(next);
            });
          }}
          onUpdateCharacter={handleUpdateCharacter}
          onBattle={(enemies: any, type: any) => {
            handleBattleTrigger(enemies, type as any);
          }}
          addToLog={addToLog}
          onShowDamageReport={setActiveBaseDamageReport}
        />
      )}

      {activeBaseDamageReport && (
        <BaseDamageReportModal
          report={activeBaseDamageReport}
          character={character}
          onClose={() => setActiveBaseDamageReport(null)}
          onUpdateCharacter={handleUpdateCharacter}
          onOpenBaseManagement={() => setIsBaseModalOpen(true)}
          addToLog={addToLog}
        />
      )}

      {isBlacksmithModalOpen && (
        <BlacksmithModal
          key="blacksmith-modal"
          character={character}
          onClose={() => setIsBlacksmithModalOpen(false)}
          onUpdateCharacter={handleUpdateCharacter}
        />
      )}

      {isAlchemyModalOpen && (
        <AlchemyModal
          key="alchemy-modal"
          character={character}
          onClose={() => setIsAlchemyModalOpen(false)}
          onUpdateCharacter={handleUpdateCharacter}
        />
      )}

      <RestModal
        isOpen={isRestModalOpen}
        onClose={() => setIsRestModalOpen(false)}
        onConfirmRest={handleExecuteRest}
        currentDate={character.currentDate || START_DATE}
        currentTime={character.currentTime || '08:00'}
        initialDays={restModalInitialDays}
        character={character}
      />
    </>
  );
};
