import React from 'react';
import { Character, Enemy } from '../../types';
import { ResultData } from '../ActionResultModal';
import {
  MagyeRevoltModal,
  MagyeDivineWarModal,
  WarInvasionModal,
  MagyeHeavenWarModal
} from './lazyModals';

interface Props {
  character: Character;
  setCharacter: React.Dispatch<React.SetStateAction<Character>>;
  handleUpdateCharacter: (newChar: Character, logMsg?: string) => void;
  handleBattleTrigger: (enemies: any, type: any, source?: string, locationName?: string, nationName?: string, specialIdx?: number) => void;
  setResultModalData: (data: ResultData | null) => void;
  isMagyeHeavenWarOpen: boolean;
  setIsMagyeHeavenWarOpen: (open: boolean) => void;
}

export const WarAndMagyeModalsLayer: React.FC<Props> = ({
  character,
  setCharacter,
  handleUpdateCharacter,
  handleBattleTrigger,
  setResultModalData,
  isMagyeHeavenWarOpen,
  setIsMagyeHeavenWarOpen
}) => {
  return (
    <>
      {character.pendingMagyeRevolt && (
        <MagyeRevoltModal 
          character={character}
          revolt={character.pendingMagyeRevolt}
          onClose={() => {
            const newChar = { ...character, pendingMagyeRevolt: undefined };
            setCharacter(newChar);
          }}
          onBattle={(enemy, type, source, city) => {
            handleBattleTrigger(enemy, type as any, source, city, "임페리얼 제국", (character.pendingMagyeRevolt as any).rebelRankIdx);
            const newChar = { ...character, pendingMagyeRevolt: undefined };
            setCharacter(newChar);
          }}
          onUpdateCharacter={handleUpdateCharacter}
        />
      )}

      {character.pendingMagyeDivineWar && (
        <MagyeDivineWarModal 
          character={character} 
          event={character.pendingMagyeDivineWar} 
          onClose={() => setCharacter({ ...character, pendingMagyeDivineWar: undefined })} 
          onBattle={(enemy, type, source, city) => {
            handleBattleTrigger(enemy, type as any, source, city, "임페리얼 제국");
            setCharacter(prev => ({ ...prev, pendingMagyeDivineWar: undefined }));
          }}
        />
      )}

      {/* 전쟁 침공 팝업 모달 */}
      {character.militaryData?.pendingInvasions && character.militaryData.pendingInvasions.length > 0 && (
        <WarInvasionModal
          character={character}
          pendingInvasions={character.militaryData.pendingInvasions}
          onClose={() => {
            const newChar = { ...character };
            if (newChar.militaryData) {
              newChar.militaryData = { ...newChar.militaryData, pendingInvasions: [] };
            }
            handleUpdateCharacter(newChar);
          }}
          onUpdateCharacter={handleUpdateCharacter}
          onSetResultModalData={setResultModalData}
          onBattle={(enemies, type, source, city, nation) => {
            handleBattleTrigger(enemies, type as any, source, city, nation);
          }}
        />
      )}

      {isMagyeHeavenWarOpen && (
        <MagyeHeavenWarModal 
          character={character}
          onClose={() => setIsMagyeHeavenWarOpen(false)}
          onUpdateCharacter={handleUpdateCharacter}
          onBattle={handleBattleTrigger}
        />
      )}
    </>
  );
};
