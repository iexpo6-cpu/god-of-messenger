import React, { createContext, useContext, useState, useMemo, ReactNode } from 'react';
import { TrainingReportData } from '../components/TrainingReportModal';

export interface TrainingContextType {
  isTrainingModalOpen: boolean;
  setIsTrainingModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  trainingInitialTab: 'exp' | 'stat' | 'mastery' | 'trainer';
  setTrainingInitialTab: React.Dispatch<React.SetStateAction<'exp' | 'stat' | 'mastery' | 'trainer'>>;
  trainingReportData: TrainingReportData | null;
  setTrainingReportData: React.Dispatch<React.SetStateAction<TrainingReportData | null>>;
  isTacticalTrainingOpen: boolean;
  setIsTacticalTrainingOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isTrainingStyleOpen: boolean;
  setIsTrainingStyleOpen: React.Dispatch<React.SetStateAction<boolean>>;
  
  openTrainingModal: (tab?: 'exp' | 'stat' | 'mastery' | 'trainer') => void;
  closeTrainingModal: () => void;
  openTacticalTraining: () => void;
  closeTacticalTraining: () => void;
  openTrainingStyle: () => void;
  closeTrainingStyle: () => void;
}

const TrainingContext = createContext<TrainingContextType | undefined>(undefined);

export const TrainingProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isTrainingModalOpen, setIsTrainingModalOpen] = useState(false);
  const [trainingInitialTab, setTrainingInitialTab] = useState<'exp' | 'stat' | 'mastery' | 'trainer'>('exp');
  const [trainingReportData, setTrainingReportData] = useState<TrainingReportData | null>(null);
  const [isTacticalTrainingOpen, setIsTacticalTrainingOpen] = useState(false);
  const [isTrainingStyleOpen, setIsTrainingStyleOpen] = useState(false);

  const openTrainingModal = (tab: 'exp' | 'stat' | 'mastery' | 'trainer' = 'exp') => {
    setTrainingInitialTab(tab);
    setIsTrainingModalOpen(true);
  };

  const closeTrainingModal = () => setIsTrainingModalOpen(false);
  const openTacticalTraining = () => setIsTacticalTrainingOpen(true);
  const closeTacticalTraining = () => setIsTacticalTrainingOpen(false);
  const openTrainingStyle = () => setIsTrainingStyleOpen(true);
  const closeTrainingStyle = () => setIsTrainingStyleOpen(false);

  const value = useMemo<TrainingContextType>(() => ({
    isTrainingModalOpen,
    setIsTrainingModalOpen,
    trainingInitialTab,
    setTrainingInitialTab,
    trainingReportData,
    setTrainingReportData,
    isTacticalTrainingOpen,
    setIsTacticalTrainingOpen,
    isTrainingStyleOpen,
    setIsTrainingStyleOpen,
    openTrainingModal,
    closeTrainingModal,
    openTacticalTraining,
    closeTacticalTraining,
    openTrainingStyle,
    closeTrainingStyle,
  }), [isTrainingModalOpen, trainingInitialTab, trainingReportData, isTacticalTrainingOpen, isTrainingStyleOpen]);

  return (
    <TrainingContext.Provider value={value}>
      {children}
    </TrainingContext.Provider>
  );
};

export const useTrainingContext = () => {
  const context = useContext(TrainingContext);
  if (!context) {
    // 기본 디폴트 제공
    return {
      isTrainingModalOpen: false,
      setIsTrainingModalOpen: () => {},
      trainingInitialTab: 'exp' as const,
      setTrainingInitialTab: () => {},
      trainingReportData: null,
      setTrainingReportData: () => {},
      isTacticalTrainingOpen: false,
      setIsTacticalTrainingOpen: () => {},
      isTrainingStyleOpen: false,
      setIsTrainingStyleOpen: () => {},
      openTrainingModal: () => {},
      closeTrainingModal: () => {},
      openTacticalTraining: () => {},
      closeTacticalTraining: () => {},
      openTrainingStyle: () => {},
      closeTrainingStyle: () => {},
    };
  }
  return context;
};
