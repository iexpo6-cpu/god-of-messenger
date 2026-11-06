import React, { createContext, useContext, useMemo } from 'react';
import { Character, CombatState } from '../types';
import { TrainingProvider } from './TrainingContext';

export interface CharacterContextType {
  character: Character | null;
  setCharacter?: React.Dispatch<React.SetStateAction<Character>>;
  onUpdateCharacter?: (updatedChar: Character, logMsg?: string) => void;
}

export interface CombatContextType {
  combatState: CombatState | null;
  setCombatState?: React.Dispatch<React.SetStateAction<CombatState | null>>;
}

export interface GameContextType extends CharacterContextType, CombatContextType {
  handleAction?: (type: string, payload?: any) => void;
}

const CharacterContext = createContext<CharacterContextType>({
  character: null,
});

const CombatContext = createContext<CombatContextType>({
  combatState: null,
});

const GameContext = createContext<GameContextType>({
  character: null,
  combatState: null,
});

export interface GameProviderProps {
  character: Character | null;
  combatState: CombatState | null;
  setCharacter?: React.Dispatch<React.SetStateAction<Character>>;
  setCombatState?: React.Dispatch<React.SetStateAction<CombatState | null>>;
  onUpdateCharacter?: (updatedChar: Character, logMsg?: string) => void;
  handleAction?: (type: string, payload?: any) => void;
  children: React.ReactNode;
}

export const GameProvider: React.FC<GameProviderProps> = ({
  character,
  combatState,
  setCharacter,
  setCombatState,
  onUpdateCharacter,
  handleAction,
  children,
}) => {
  // character 상태 연산 및 컨텍스트 제공 최적화
  const characterValue = useMemo<CharacterContextType>(() => ({
    character,
    setCharacter,
    onUpdateCharacter,
  }), [character, setCharacter, onUpdateCharacter]);

  // combatState 연산 및 컨텍스트 제공 최적화
  const combatValue = useMemo<CombatContextType>(() => ({
    combatState,
    setCombatState,
  }), [combatState, setCombatState]);

  // 통합 게임 컨텍스트 연산 최적화
  const gameValue = useMemo<GameContextType>(() => ({
    character,
    combatState,
    setCharacter,
    setCombatState,
    onUpdateCharacter,
    handleAction,
  }), [character, combatState, setCharacter, setCombatState, onUpdateCharacter, handleAction]);

  return (
    <GameContext.Provider value={gameValue}>
      <CharacterContext.Provider value={characterValue}>
        <CombatContext.Provider value={combatValue}>
          <TrainingProvider>
            {children}
          </TrainingProvider>
        </CombatContext.Provider>
      </CharacterContext.Provider>
    </GameContext.Provider>
  );
};

export const useCharacterContext = () => useContext(CharacterContext);
export const useCombatContext = () => useContext(CombatContext);
export const useGameContext = () => useContext(GameContext);
