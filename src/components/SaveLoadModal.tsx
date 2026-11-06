
import React, { useEffect, useState, useRef } from 'react';
import { 
  Save, Download, Trash2, X, Clock,Sword, Copy, ClipboardPaste, 
  FileCode, CheckCircle, AlertCircle, Loader2, User as UserIcon,FileDown, FileUp, Database,
  LogIn, UserPlus, LogOut, Cloud, RefreshCw, Key, Mail, Search, ShieldCheck, AlertTriangle
} from 'lucide-react';
import { Character } from '../types';
import { getSaveSlotKey, compressData, decompressData, optimizeSaveData } from '../utils';
import { elixirRealtimeService } from '../services/elixirRealtimeService';
import { sanitizeSaveDataForExport } from '../services/saveExportSanitizer';
import { compressSaveDataMedia } from '../services/saveDataCompressorService';
import { GameStorage } from '../storage';
import { User } from 'firebase/auth';
import { auth } from '../services/firebase';
import { ResultData } from './ActionResultModal';
import { 
  googleSignIn, 
  getCachedAccessToken, 
  logoutGoogle, 
  subscribeAuth, 
  getDriveSavesMetaList, 
  uploadSaveToDrive, 
  downloadSaveFromDrive, 
  deleteSaveFromDrive 
} from '../services/googleDriveService';
import { 
  isAutoBackupEnabled, 
  setAutoBackupEnabled, 
  subscribeAutoBackupStatus, 
  triggerSaveAutoBackup, 
  AutoBackupStatus 
} from '../services/googleDriveAutoBackupService';
import { 
  isAutoSyncEnabled, 
  setAutoSyncEnabled, 
  subscribeAutoSyncStatus, 
  performLightweightAutoSyncCheck, 
  AutoSyncStatus 
} from '../services/googleDriveAutoSyncService';
import PrivacyPolicyModal from './PrivacyPolicyModal';

interface SaveSlotData {
  timestamp: string;
  character: Character;
}

interface Props {
  isOpen: boolean;
  mode: 'save' | 'load';
  onClose: () => void;
  onSelectSlot: (slotNumber: number) => void;
  currentUser: User | null;
  setResultModalData?: (data: ResultData | null) => void;
  activeCharacter?: Character;
}

interface PreviewState {
  type: 'local_save' | 'local_load' | 'cloud_backup' | 'cloud_restore';
  slotNum: number;
  localData: SaveSlotData | null;
  newData?: SaveSlotData | null;
}

const SaveLoadModal: React.FC<Props> = ({ isOpen, mode, onClose, onSelectSlot, currentUser, setResultModalData, activeCharacter }) => {
  const [slots, setSlots] = useState<(SaveSlotData | null)[]>(new Array(10).fill(null));
  const [autoSaveSlot, setAutoSaveSlot] = useState<SaveSlotData | null>(null);
  const [cloudSlotsInfo, setCloudSlotsInfo] = useState<Record<number, { timestamp: string }>>({});
  const [activeTab, setActiveTab] = useState<'slots' | 'code' | 'file' | 'cloud'>('slots');
  const [importCode, setImportCode] = useState('');
  const [exportCode, setExportCode] = useState('');
  const [selectedExportSlot, setSelectedExportSlot] = useState<number | null>(null);
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showConfirmSyncAll, setShowConfirmSyncAll] = useState(false);
  const [showConfirmBackupAll, setShowConfirmBackupAll] = useState(false);
  const [showConfirmClearCloud, setShowConfirmClearCloud] = useState(false);
  const [deleteConfirmStep, setDeleteConfirmStep] = useState(0); // 0: none, 1, 2, 3
  const [previewState, setPreviewState] = useState<PreviewState | null>(null);
  const [includeMediaInExport, setIncludeMediaInExport] = useState<boolean>(false);
  const [includeFrameAnimationInExport, setIncludeFrameAnimationInExport] = useState<boolean>(false);
  
  // 용량 다이어트 압축 상태
  const [compressingSlot, setCompressingSlot] = useState<number | null>(null);
  const [compressionProgress, setCompressionProgress] = useState<{ total: number; current: number; label: string } | null>(null);
  const [compressionResult, setCompressionResult] = useState<{ originalSize: number; compressedSize: number; ratio: number; slotNum: number } | null>(null);
  
  // Auth states
  const [authMode, setAuthMode] = useState<'login' | 'signup' | 'findId' | 'findPassword'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [phone, setPhone] = useState('');
  const [agreement, setAgreement] = useState(false);
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false);
  const [isEmailChecked, setIsEmailChecked] = useState(false);
  const [recoveryResult, setRecoveryResult] = useState<string | null>(null);
  const [authError, setAuthError] = useState('');
  const [googleToken, setGoogleToken] = useState<string | null>(getCachedAccessToken());
  const [cloudProgress, setCloudProgress] = useState<{ current: number; total: number; label: string } | null>(null);
  
  // 자동 백업 상태
  const [autoBackupEnabled, setAutoBackupEnabledState] = useState<boolean>(isAutoBackupEnabled());
  const [autoBackupStatus, setAutoBackupStatus] = useState<AutoBackupStatus>({
    state: 'idle',
    lastSlot: null,
    lastTime: null,
    message: ''
  });

  // 자동 불러오기/동기화 상태
  const [autoSyncEnabled, setAutoSyncEnabledState] = useState<boolean>(isAutoSyncEnabled());
  const [autoSyncStatus, setAutoSyncStatus] = useState<AutoSyncStatus>({
    state: 'idle',
    newerSlots: [],
    lastCheckedTime: null,
    message: ''
  });

  useEffect(() => {
    const unsubscribe = subscribeAuth((user, token) => {
      setGoogleToken(token);
      if (user && token) {
        performLightweightAutoSyncCheck({ silent: true });
      }
    });
    const unsubBackup = subscribeAutoBackupStatus(status => {
      setAutoBackupStatus(status);
    });
    const unsubSync = subscribeAutoSyncStatus(status => {
      setAutoSyncStatus(status);
    });

    const handleSlotsUpdated = () => {
      refreshSlots();
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('shinryoku_save_slots_updated', handleSlotsUpdated);
    }

    return () => {
      unsubscribe();
      unsubBackup();
      unsubSync();
      if (typeof window !== 'undefined') {
        window.removeEventListener('shinryoku_save_slots_updated', handleSlotsUpdated);
      }
    };
  }, []);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const refreshSlots = async () => {
    setIsProcessing(true);
    const loadedSlots = await Promise.all([1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(async num => {
      const key = getSaveSlotKey(num);
      return await GameStorage.get(key);
    }));
    setSlots(loadedSlots);

    try {
      const autoSaveKey = getSaveSlotKey(0);
      const loadedAutoSave = await GameStorage.get(autoSaveKey);
      setAutoSaveSlot(loadedAutoSave);
    } catch (e) {
      console.error("Error loading auto-save slot in modal", e);
    }
    setIsProcessing(false);
  };

  const fetchCloudSlotsInfo = async (force: boolean = false) => {
    const token = getCachedAccessToken() || googleToken;
    if (!currentUser || !token) return;
    try {
      const cloudInfo = await getDriveSavesMetaList(token);
      setCloudSlotsInfo(cloudInfo);
    } catch (e) {
      console.warn("Cloud slots info fetch skipped or failed", e);
    }
  };

  useEffect(() => {
    if (isOpen) {
      refreshSlots();
      setActiveTab('slots');
      setExportCode('');
      setImportCode('');
      setCopyFeedback(false);
      setAuthError('');
      if (currentUser && (getCachedAccessToken() || googleToken)) {
        performLightweightAutoSyncCheck({ silent: true });
      }
    }
  }, [isOpen, currentUser, googleToken]);

  useEffect(() => {
    if (isOpen && activeTab === 'cloud' && currentUser) {
      fetchCloudSlotsInfo(false);
    }
  }, [isOpen, activeTab, currentUser, googleToken]);

  const showResult = (type: ResultData['type'], title: string, message: string, items: any[] = []) => {
    if (setResultModalData) {
      setResultModalData({ type, title, message, items });
    } else {
      alert(`${title}\n\n${message}`);
    }
  };

  const generateCode = async (slotNum: number, overrideMedia?: boolean, overrideFrame?: boolean) => {
    const data = slots[slotNum - 1];
    if (!data) return;
    
    setIsProcessing(true);
    try {
      const withMedia = overrideMedia !== undefined ? overrideMedia : includeMediaInExport;
      const withFrame = overrideFrame !== undefined ? overrideFrame : includeFrameAnimationInExport;
      const sanitized = sanitizeSaveDataForExport(data, { 
        preserveMedia: withMedia,
        preserveFrameAnimation: withFrame
      });
      const code = await compressData(sanitized);
      setExportCode(code);
      setSelectedExportSlot(slotNum);
    } catch (e) {
      showResult('failure', '코드 생성 실패', '데이터 압축 중 오류가 발생했습니다.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCopyCode = () => {
    if (!exportCode) return;
    navigator.clipboard.writeText(exportCode);
    setCopyFeedback(true);
    setTimeout(() => setCopyFeedback(false), 2000);
  };

  const handleImport = async (targetSlot: number) => {
    if (!importCode.trim()) {
      showResult('warning', '데이터 없음', '가져올 코드를 입력해주세요.');
      return;
    }
    
    setIsProcessing(true);
    try {
      const parsed = await decompressData(importCode.trim());
      if (!parsed.character || !parsed.character.name) {
          throw new Error("Invalid Data Structure");
      }

      const key = getSaveSlotKey(targetSlot);
      await GameStorage.set(key, parsed);
      
      showResult('success', '데이터 복원 완료', `슬롯 ${targetSlot}에 데이터를 성공적으로 가져왔습니다.`);
      setImportCode('');
      await refreshSlots();
      setActiveTab('slots');
    } catch (e) {
      console.error(e);
      showResult('failure', '가져오기 실패', '유효하지 않은 세이브 코드이거나 데이터 형식이 맞지 않습니다.');
    } finally {
      setIsProcessing(false);
    }
  };

  const initiateLocalSlotPreview = (slotNum: number) => {
    const localData = slots[slotNum - 1];
    
    if (mode === 'save') {
      setPreviewState({
        type: 'local_save',
        slotNum,
        localData,
        newData: activeCharacter ? { timestamp: new Date().toISOString(), character: elixirRealtimeService.syncToCharacter(activeCharacter) } as any : null
      });
    } else {
      if (!localData) {
        showResult('warning', '데이터 없음', '비어 있는 슬롯입니다.');
        return;
      }
      // [BYPASS PREVIEW FOR LOCAL LOAD]
      // Directly load the local data without preview confirmation
      onSelectSlot(slotNum);
    }
  };

  const initiateCloudPushPreview = (slotNum: number) => {
    if (!currentUser) {
      showResult('warning', '권한 부족', '이 기능을 사용하려면 로그인이 필요합니다.');
      return;
    }
    const localData = slots[slotNum - 1];
    if (!localData) return;

    setPreviewState({
      type: 'cloud_backup',
      slotNum,
      localData,
      newData: null
    });
  };

  const parseCloudPayload = async (cloudPayload: any): Promise<any> => {
    if (!cloudPayload) return null;

    if (cloudPayload.isBinary && cloudPayload.blob) {
      const uint8: Uint8Array = cloudPayload.blob;
      // 1. TextDecoder UTF-8 디코딩 시도 (최신 표준 방식)
      try {
        const decodedText = new TextDecoder().decode(uint8);
        if (
          decodedText.startsWith('LZ:') ||
          decodedText.startsWith('v3:') ||
          decodedText.startsWith('v2:') ||
          decodedText.startsWith('{') ||
          decodedText.startsWith('[')
        ) {
          return await decompressData(decodedText);
        }
      } catch (utfErr) {
        // 계속 진행
      }

      // 2. 구형 바이너리 인코딩 세이브 호환 (String.fromCharCode + btoa)
      try {
        const len = uint8.length;
        const chunkSize = 16384;
        let binary = '';
        for (let i = 0; i < len; i += chunkSize) {
          binary += String.fromCharCode.apply(null, uint8.subarray(i, i + chunkSize) as any);
        }
        const prefix = cloudPayload.version === 'v3' ? 'v3:' : (cloudPayload.version === 'v2' ? 'v2:' : (cloudPayload.version === 'LZ' ? 'LZ:' : ''));
        return await decompressData(prefix + btoa(binary));
      } catch (legacyErr) {
        const decodedText = new TextDecoder().decode(uint8);
        return await decompressData(decodedText);
      }
    } else if (cloudPayload.isCompressed && cloudPayload.payload) {
      return await decompressData(cloudPayload.payload);
    } else {
      const finalData = { ...cloudPayload };
      delete finalData.timestamp;
      return finalData;
    }
  };

  const handleGoogleLogin = async () => {
    setIsProcessing(true);
    setCloudProgress({ current: 0, total: 1, label: '구글 계정과 연동하는 중' });
    setAuthError('');
    try {
      const result = await googleSignIn();
      if (result) {
        setCloudProgress({ current: 1, total: 1, label: '구글 드라이브 목록을 동기화하는 중' });
        setGoogleToken(result.accessToken);
        showResult('success', '구글 연동 성공', '구글 드라이브와 성황리에 연동되었습니다!\n이제 당신의 모험을 구글 드라이브에 안전하게 자동 저장할 수 있습니다.');
        const cloudInfo = await getDriveSavesMetaList(result.accessToken);
        setCloudSlotsInfo(cloudInfo);
      }
    } catch (e: any) {
      setAuthError(e.message || '구글 로그인에 실패했습니다.');
    } finally {
      setIsProcessing(false);
      setCloudProgress(null);
    }
  };

  const handleGoogleLogout = async () => {
    setIsProcessing(true);
    setCloudProgress({ current: 0, total: 1, label: '구글 드라이브 연동을 해제하는 중' });
    try {
      await logoutGoogle();
      setGoogleToken(null);
      setCloudSlotsInfo({});
      showResult('success', '연동 해제 완료', '구글 드라이브 연동이 안전하게 해제되었습니다.');
    } catch (e: any) {
      showResult('failure', '연동 해제 실패', e.message);
    } finally {
      setIsProcessing(false);
      setCloudProgress(null);
    }
  };

  const initiateCloudPullPreview = async (slotNum: number) => {
    const token = getCachedAccessToken() || googleToken;
    if (!currentUser || !token) {
      showResult('warning', '권한 부족', '구글 드라이브 연동 로그인이 필요합니다.');
      return;
    }

    setIsProcessing(true);
    setCloudProgress({ current: 0, total: 2, label: `슬롯 ${slotNum}의 백업 조회 대기 중` });
    try {
      setCloudProgress({ current: 1, total: 2, label: `슬롯 ${slotNum}의 백업 데이터 내려받는 중` });
      const payload = await downloadSaveFromDrive(slotNum, token);
      if (!payload) {
        showResult('info', '데이터 없음', `슬롯 ${slotNum}에 해당하는 구글 드라이브 백업 데이터가 없습니다.`);
        return;
      }

      setCloudProgress({ current: 2, total: 2, label: `백업 세이브 파일 압축 해제 중` });
      const finalData = await decompressData(payload.compressedData);

      const restoredSaveData = {
        ...finalData,
        timestamp: payload.timestamp || finalData.timestamp || new Date().toISOString(),
        character: finalData.character,
        messages: Array.isArray(finalData.messages) ? finalData.messages : [],
        choices: Array.isArray(finalData.choices) ? finalData.choices : [],
        sceneType: finalData.sceneType || 'normal'
      };

      setPreviewState({
        type: 'cloud_restore',
        slotNum,
        localData: slots[slotNum - 1],
        newData: restoredSaveData as any
      });
    } catch (e: any) {
      showResult('failure', '구글 드라이브 데이터를 불러오지 못했습니다', e.message);
    } finally {
      setIsProcessing(false);
      setCloudProgress(null);
    }
  };

  const handlePushToCloudConfirmed = async (slotNum: number) => {
    const token = getCachedAccessToken() || googleToken;
    if (!currentUser || !token) {
      showResult('warning', '권한 부족', '구글 드라이브 연동 로그인이 필요합니다.');
      return;
    }
    const data = slots[slotNum - 1];
    if (!data) return;

    setIsProcessing(true);
    setCloudProgress({ current: 0, total: 3, label: `슬롯 ${slotNum} 데이터 최적화 및 압축 중` });
    try {
      const sanitizedData = optimizeSaveData(data);
      const compressed = await compressData(sanitizedData);
      setCloudProgress({ current: 1, total: 3, label: `기존 구글 드라이브 백업 정리 중` });
      setCloudProgress({ current: 2, total: 3, label: `슬롯 ${slotNum} 데이터를 신의사자rpg 폴더로 업로드 중` });
      await uploadSaveToDrive(slotNum, compressed, token);
      setCloudProgress({ current: 3, total: 3, label: `백업 슬롯 목록 갱신 중` });
      showResult('success', '구글 드라이브 백업 완료', `슬롯 ${slotNum}의 여정을 사용자님의 구글 드라이브에 안전하게 백업했습니다.`);
      
      await fetchCloudSlotsInfo(true);
      setPreviewState(null);
    } catch (e: any) {
      showResult('failure', '구글 드라이브 저장 실패', e.message);
    } finally {
      setIsProcessing(false);
      setCloudProgress(null);
    }
  };

  const handlePullSingleFromCloudConfirmed = async (slotNum: number, finalData: any) => {
    if (!finalData) return;

    setIsProcessing(true);
    setCloudProgress({ current: 0, total: 2, label: `슬롯 ${slotNum} 세이브 파일 파싱 중` });
    try {
      const completeData = {
        ...finalData,
        messages: Array.isArray(finalData.messages) ? finalData.messages : [],
        choices: Array.isArray(finalData.choices) ? finalData.choices : [],
        sceneType: finalData.sceneType || 'normal'
      };
      const sanitizedData = optimizeSaveData(completeData);
      setCloudProgress({ current: 1, total: 2, label: `기기 로컬 저장소에 세이브 반영 중` });
      const key = getSaveSlotKey(slotNum);
      await GameStorage.set(key, sanitizedData);
      
      setCloudProgress({ current: 2, total: 2, label: `세이브 슬롯 화면 동기화 중` });
      showResult('success', '구글 드라이브 복원 완료', `구글 드라이브의 슬롯 ${slotNum} 기록을 현재 기기 슬롯에 성공적으로 가져왔습니다.`);
      await refreshSlots();
      setPreviewState(null);
    } catch (e: any) {
      showResult('failure', '구글 드라이브 복원 실패', e.message);
    } finally {
      setIsProcessing(false);
      setCloudProgress(null);
    }
  };

  const executeBackupAll = async () => {
    const token = getCachedAccessToken() || googleToken;
    if (!currentUser || !token) {
      showResult('warning', '권한 부족', '구글 드라이브 연동 로그인이 필요합니다.');
      return;
    }
    setShowConfirmBackupAll(false);
    setIsProcessing(true);

    const activeSlots = slots.map((s, idx) => ({ s, slotNum: idx + 1 })).filter(item => !!item.s);
    const totalToBackup = activeSlots.length;

    setCloudProgress({ current: 0, total: totalToBackup, label: '전체 백업 데이터 최적화 대기 중' });
    try {
      let count = 0;
      for (let i = 0; i < slots.length; i++) {
        const s = slots[i];
        if (s) {
          const slotNum = i + 1;
          setCloudProgress({ 
            current: count, 
            total: totalToBackup, 
            label: `슬롯 ${slotNum} 압축 및 구글 드라이브 업로드 중 (${count + 1}/${totalToBackup})` 
          });
          const sanitized = optimizeSaveData(s);
          const compressed = await compressData(sanitized);
          await uploadSaveToDrive(slotNum, compressed, token);
          count++;
        }
      }
      setCloudProgress({ current: totalToBackup, total: totalToBackup, label: '클라우드 연동 목록 갱신 중' });
      showResult('success', '전체 백업 완료', `총 ${count}개의 슬롯 데이터를 사용자님의 구글 드라이브에 안전하게 백업했습니다.`);
      await fetchCloudSlotsInfo(true);
    } catch (e: any) {
      showResult('failure', '전체 백업 실패', e.message);
    } finally {
      setIsProcessing(false);
      setCloudProgress(null);
    }
  };

  const handleBackupAll = () => {
    if (!currentUser) {
      showResult('warning', '권한 부족', '로그인이 필요합니다.');
      return;
    }
    const hasData = slots.some(s => s !== null);
    if (!hasData) {
      showResult('info', '데이터 없음', '백업할 로컬 세이브 데이터가 없습니다.');
      return;
    }
    setShowConfirmBackupAll(true);
  };

  const executePullFromCloud = async () => {
    const token = getCachedAccessToken() || googleToken;
    if (!currentUser || !token) {
      showResult('warning', '권한 부족', '구글 드라이브 연동 로그인이 필요합니다.');
      return;
    }
    setShowConfirmSyncAll(false);
    setIsProcessing(true);
    setCloudProgress({ current: 0, total: 1, label: '구글 드라이브 백업 파일 목록 조회 중' });
    try {
      const driveMeta = await getDriveSavesMetaList(token);
      const slotsToImport = Object.keys(driveMeta);
      
      if (slotsToImport.length === 0) {
        showResult('info', '데이터 없음', '구글 드라이브에 저장된 여정의 기록이 존재하지 않습니다.');
        return;
      }

      const totalToPull = slotsToImport.length;
      let count = 0;
      for (const slotIdStr of slotsToImport) {
        const slotId = parseInt(slotIdStr);
        setCloudProgress({ 
          current: count, 
          total: totalToPull, 
          label: `슬롯 ${slotId}의 클라우드 세이브 파일 내려받는 중 (${count + 1}/${totalToPull})` 
        });
        const payload = await downloadSaveFromDrive(slotId, token);
        if (payload) {
          const finalData = await decompressData(payload.compressedData);
          const completeData = {
            ...finalData,
            messages: Array.isArray(finalData.messages) ? finalData.messages : [],
            choices: Array.isArray(finalData.choices) ? finalData.choices : [],
            sceneType: finalData.sceneType || 'normal'
          };
          const sanitized = optimizeSaveData(completeData);
          const key = getSaveSlotKey(slotId);
          await GameStorage.set(key, sanitized);
          count++;
        }
      }
      
      setCloudProgress({ current: totalToPull, total: totalToPull, label: '기기 로컬 세이브 화면 최신화 중' });
      showResult('success', '구글 드라이브 동기화 완료', `구글 드라이브로부터 총 ${count}개의 세이브 슬롯을 복원했습니다.`);
      await refreshSlots();
    } catch (e: any) {
      showResult('failure', '구글 드라이브 동기화 실패', e.message);
    } finally {
      setIsProcessing(false);
      setCloudProgress(null);
    }
  };

  const handlePullFromCloud = async () => {
    const token = getCachedAccessToken() || googleToken;
    if (!currentUser || !token) {
      showResult('warning', '권한 부족', '로그인이 필요합니다.');
      return;
    }
    setShowConfirmSyncAll(true);
  };

  const executeClearCloud = async () => {
    const token = getCachedAccessToken() || googleToken;
    if (!currentUser || !token) {
      showResult('warning', '권한 부족', '구글 드라이브 연동 로그인이 필요합니다.');
      return;
    }
    setShowConfirmClearCloud(false);
    setIsProcessing(true);
    setCloudProgress({ current: 0, total: 1, label: '구글 드라이브 내 백업 데이터 목록 확인 중' });
    try {
      const driveMeta = await getDriveSavesMetaList(token);
      const slotsToDelete = Object.keys(driveMeta);
      const totalToDelete = slotsToDelete.length;

      let count = 0;
      for (const slotIdStr of slotsToDelete) {
        const slotId = parseInt(slotIdStr);
        setCloudProgress({ 
          current: count, 
          total: totalToDelete, 
          label: `슬롯 ${slotId}의 구글 드라이브 백업 파일 제거 중 (${count + 1}/${totalToDelete})` 
        });
        await deleteSaveFromDrive(slotId, token);
        count++;
      }
      setCloudProgress({ current: totalToDelete, total: totalToDelete, label: '클라우드 세이브 상태 새로고침 중' });
      showResult('success', '클라우드 초기화 완료', '구글 드라이브에 기록된 모든 게임 세이브 파일을 말끔히 지웠습니다.');
      setCloudSlotsInfo({});
    } catch (e: any) {
      showResult('failure', '초기화 실패', e.message);
    } finally {
      setIsProcessing(false);
      setCloudProgress(null);
    }
  };

  const handleSaveToFile = async (slotNum: number) => {
    const data = slots[slotNum - 1];
    if (!data) return;

    setIsProcessing(true);
    try {
      const sanitized = sanitizeSaveDataForExport(data, { 
        preserveMedia: includeMediaInExport,
        preserveFrameAnimation: includeFrameAnimationInExport
      });
      const code = await compressData(sanitized);
      const blob = new Blob([code], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const date = new Date().toISOString().split('T')[0];
      const charName = data.character?.name || '신사';
      link.href = url;
      link.download = `Shinryoku_Save_${charName}_${date}.sav`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      showResult('success', '파일 저장 완료', '세이브 파일이 성공적으로 다운로드되었습니다.');
    } catch (e) {
      showResult('failure', '파일 생성 실패', '파일을 만드는 도중 예상치 못한 오류가 발생했습니다.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleLoadFromFile = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async (event) => {
          const content = event.target?.result as string;
          if (!content) return;
          setImportCode(content);
          setActiveTab('code');
          showResult('info', '파일 불러오기', '파일 내용을 파싱했습니다. 덮어씌울 슬롯을 선택해주세요.');
      };
      reader.readAsText(file);
  };

  const handleCompressSlotMedia = async (slotNum: number) => {
    const rawData = slots[slotNum - 1];
    if (!rawData) return;

    setCompressingSlot(slotNum);
    setCompressionResult(null);
    setCompressionProgress({ total: 1, current: 0, label: '압축 대상을 탐색하고 있습니다' });

    try {
      const origText = JSON.stringify(rawData);
      const originalSize = origText.length;

      const compressedData = await compressSaveDataMedia(rawData, (prog) => {
        setCompressionProgress(prog);
      }, 128, 0.5);

      const compText = JSON.stringify(compressedData);
      const compressedSize = compText.length;
      const ratio = Math.max(0, Math.round(((originalSize - compressedSize) / originalSize) * 100));

      const key = getSaveSlotKey(slotNum);
      await GameStorage.set(key, compressedData);
      await refreshSlots();

      setCompressionResult({
        slotNum,
        originalSize,
        compressedSize,
        ratio
      });
    } catch (err: any) {
      showResult('failure', '압축 실패', '미디어를 디코딩하여 처리하는 도중 문제가 생겼습니다.');
    } finally {
      setCompressingSlot(null);
      setCompressionProgress(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 font-sans">
      <div className="bg-slate-900 w-full max-w-xl rounded-[2.5rem] border border-slate-700 shadow-2xl flex flex-col relative overflow-hidden">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-800 bg-slate-950 flex justify-between items-center shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500/10 rounded-xl">
                {mode === 'save' ? <Save className="text-amber-500"/> : <Download className="text-amber-500"/>}
              </div>
              <div>
                <h2 className="text-xl font-bold text-white leading-none">
                  {mode === 'save' ? '데이터 보관' : '데이터 복원'}
                </h2>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-1">Memory Matrix Storage</p>
              </div>
            </div>
            <button onClick={onClose} className="text-slate-500 hover:text-white p-2 rounded-full hover:bg-slate-800 transition-all">
                <X size={24} />
            </button>
        </div>

        {/* Tabs */}
        <div className="flex bg-slate-950/50 border-b border-slate-800 shrink-0">
            {[
              { id: 'slots', icon: Database, label: '저장 슬롯' },
              { id: 'cloud', icon: Cloud, label: '클라우드' },
              { id: 'code', icon: FileCode, label: '세이브 코드' },
              { id: 'file', icon: FileDown, label: '파일 관리' }
            ].map(tab => (
              <button 
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex-1 py-4 text-[10px] font-bold transition-all border-b-2 flex items-center justify-center gap-2 ${activeTab === tab.id ? 'text-amber-500 border-amber-500 bg-slate-800' : 'text-slate-500 border-transparent hover:text-slate-300'}`}
              >
                  <tab.icon size={14}/> {tab.label}
              </button>
            ))}
        </div>

        {/* Content */}
        <div className="p-6 flex-1 overflow-y-auto custom-scrollbar max-h-[65vh] bg-slate-900/50 relative">
            {GameStorage.isQuotaExceeded && (
              <div className="mb-5 p-4 bg-red-950/60 border border-red-500/40 rounded-2xl text-xs text-red-200 flex flex-col gap-1.5 shadow-lg animate-in fade-in">
                <div className="font-bold flex items-center gap-1.5 text-red-400">
                  <AlertTriangle size={16} className="shrink-0 text-red-400" />
                  <span>파이어베이스 클라우드 일일 무료 사용량(Quota) 초과 안내</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  파이어베이스 Firestore 무료 일일 읽기/쓰기 용량이 초과되어 <strong>클라우드 자동 연동이 중지</strong>되었습니다.
                </p>
                <p className="text-[10.5px] text-slate-400">
                  💡 <strong>로컬 세이브/불러오기, 세이브 코드, 파일 저장/불러오기</strong>는 쿼터 영향 없이 100% 정상 작동합니다.
                </p>
                <a 
                  href="https://console.firebase.google.com/project/gen-lang-client-0342639892/firestore/databases/ai-studio-48f44ad9-bd94-438e-bc5f-d4a9f849ebbf/data?openUpgradeDialog=true"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] text-amber-400 hover:text-amber-300 underline font-mono flex items-center gap-1 mt-0.5"
                >
                  <span>▶ Firebase 콘솔에서 쿼터 확인 및 업그레이드하기 ↗</span>
                </a>
              </div>
            )}

            {activeTab === 'slots' && (
                <div className="space-y-4 animate-in fade-in slide-in-from-top-1">
                    {/* 세이브/로드 기능 안내 범례 (Legend) */}
                    <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl text-xs space-y-1.5 text-slate-400">
                        <div className="font-bold text-slate-200 flex items-center gap-1.5">
                            <Database size={14} className="text-amber-500" />
                            <span>데이터 저장 및 클라우드 가이드</span>
                        </div>
                        <p className="text-[10.5px] leading-relaxed text-slate-500">
                          각 슬롯을 클릭하면 기기에 로컬 데이터를 <span className="text-slate-300 font-semibold">{mode === 'save' ? '저장' : '불러오기'}</span>할 수 있습니다. 
                          {currentUser && " 슬롯 우측 버튼을 통해 클라우드와 백업/복원 연동이 가능합니다."}
                        </p>
                        {currentUser && (
                          <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800/60 text-[10px]">
                            <div className="flex items-center gap-1.5 text-blue-400">
                              <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0"></span>
                              <span className="font-semibold">클라우드 백업:</span>
                              <span className="text-slate-500">기기 슬롯 → 클라우드 보관</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-amber-500">
                              <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0"></span>
                              <span className="font-semibold">클라우드 복원:</span>
                              <span className="text-slate-500">클라우드 보관 → 기기 슬롯</span>
                            </div>
                          </div>
                        )}
                        {currentUser && googleToken && (
                          <div className="pt-2 border-t border-slate-800/60 space-y-2 text-[10px]">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="flex items-center gap-1.5 text-blue-300 font-medium">
                                <Cloud size={13} className="text-blue-400 shrink-0" />
                                <span>세이브 시 구글 드라이브 자동 백업</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  const next = !autoBackupEnabled;
                                  setAutoBackupEnabledState(next);
                                  setAutoBackupEnabled(next);
                                }}
                                className={`px-2.5 py-1 rounded-lg font-bold text-[10px] transition-all ${
                                  autoBackupEnabled 
                                    ? 'bg-blue-600/80 hover:bg-blue-500 text-white border border-blue-400/50' 
                                    : 'bg-slate-800 text-slate-400 border border-slate-700'
                                }`}
                              >
                                {autoBackupEnabled ? "자동 백업 켜짐" : "자동 백업 꺼짐"}
                              </button>
                            </div>

                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="flex items-center gap-1.5 text-emerald-300 font-medium">
                                <Download size={13} className="text-emerald-400 shrink-0" />
                                <span>접속 및 열기 시 자동 불러오기</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  const next = !autoSyncEnabled;
                                  setAutoSyncEnabledState(next);
                                  setAutoSyncEnabled(next);
                                }}
                                className={`px-2.5 py-1 rounded-lg font-bold text-[10px] transition-all ${
                                  autoSyncEnabled 
                                    ? 'bg-emerald-600/80 hover:bg-emerald-500 text-white border border-emerald-400/50' 
                                    : 'bg-slate-800 text-slate-400 border border-slate-700'
                                }`}
                              >
                                {autoSyncEnabled ? "자동 불러오기 켜짐" : "자동 불러오기 꺼짐"}
                              </button>
                            </div>

                            <div className="flex items-center justify-between text-[9px] text-slate-400 pt-0.5">
                              {autoBackupStatus.state === 'syncing' ? (
                                <span className="text-blue-400 flex items-center gap-1 animate-pulse font-bold">
                                  <RefreshCw size={10} className="animate-spin" /> 자동 백업 진행 중
                                </span>
                              ) : autoBackupStatus.lastTime ? (
                                <span>
                                  최근 백업: 슬롯 {autoBackupStatus.lastSlot} ({autoBackupStatus.lastTime})
                                </span>
                              ) : <span>자동 백업 대기 중</span>}

                              {autoSyncStatus.state === 'syncing' ? (
                                <span className="text-emerald-400 flex items-center gap-1 animate-pulse font-bold">
                                  <RefreshCw size={10} className="animate-spin" /> 자동 불러오기 진행 중
                                </span>
                              ) : autoSyncStatus.lastCheckedTime ? (
                                <span>최근 동기화 점검: {autoSyncStatus.lastCheckedTime}</span>
                              ) : null}
                            </div>
                          </div>
                        )}
                    </div>

                    {/* 스마트 최신 세이브 감지 알림 및 원클릭 동기화 배너 */}
                    {currentUser && googleToken && autoSyncStatus.newerSlots && autoSyncStatus.newerSlots.length > 0 && (
                      <div className="p-3.5 bg-gradient-to-r from-amber-950/90 via-slate-900 to-blue-950/90 border border-amber-500/50 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs shadow-xl animate-in fade-in">
                        <div className="flex items-center gap-2.5">
                          <Cloud size={20} className="text-amber-400 shrink-0 animate-bounce" />
                          <div>
                            <div className="font-bold text-amber-200 text-xs sm:text-sm">
                              클라우드에 더 최신 세이브({autoSyncStatus.newerSlots.map(s => `슬롯 ${s.slotNum}`).join(', ')})가 존재합니다
                            </div>
                            <div className="text-[10.5px] text-slate-300 mt-0.5">
                              원클릭으로 기기 슬롯에 최신 기록을 손실 없이 빠르게 가져옵니다.
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => performLightweightAutoSyncCheck({ forceDownload: true })}
                          className="w-full sm:w-auto px-3.5 py-2 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 active:scale-95 text-slate-950 font-bold rounded-xl text-xs shrink-0 transition-all shadow-md flex items-center justify-center gap-1.5"
                        >
                          <RefreshCw size={13} className="shrink-0" />
                          <span>원클릭 동기화</span>
                        </button>
                      </div>
                    )}

                    {/* 자동 저장 슬롯 (Auto Save Slot) */}
                    {(mode === 'load' || autoSaveSlot) && (
                        <div className="relative flex gap-2">
                            <button
                                type="button"
                                disabled={mode === 'save'}
                                onClick={() => {
                                    if (mode === 'load' && autoSaveSlot) {
                                        onSelectSlot(0);
                                    }
                                }}
                                className={`flex-1 text-left p-4 sm:p-5 rounded-3xl border transition-all duration-200 relative overflow-hidden
                                    ${mode === 'save'
                                        ? 'bg-slate-950/40 border-slate-900 text-slate-500 cursor-not-allowed opacity-60'
                                        : autoSaveSlot
                                            ? 'bg-gradient-to-r from-purple-950/20 to-slate-900 border-purple-900/60 hover:border-purple-400 hover:bg-slate-800 shadow-lg'
                                            : 'bg-slate-950/20 border-slate-900 border-dashed text-slate-600'
                                    }`}
                            >
                                <div className="absolute top-2.5 right-3.5 sm:top-3 sm:right-4 text-[8px] sm:text-[9px] font-mono text-purple-400 font-extrabold uppercase tracking-widest bg-purple-950/50 px-1.5 py-0.5 rounded border border-purple-900/30">
                                    AUTO SAVE
                                </div>

                                {autoSaveSlot ? (
                                    <div className="flex items-center space-x-3 sm:space-x-5">
                                        <div className="p-2 sm:p-3 bg-purple-950/60 rounded-2xl border border-purple-800/50 text-purple-400 shadow-inner shrink-0">
                                            <Save size={20} className="sm:w-7 sm:h-7" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mb-1">
                                              <span className="self-start text-[8px] sm:text-[10px] bg-purple-900/30 text-purple-400 px-1.5 sm:px-2 py-0.5 rounded border border-purple-800/40 font-bold whitespace-nowrap">
                                                  Lv.{autoSaveSlot.character.level}
                                              </span>
                                              <span className="font-bold text-slate-100 text-sm sm:text-lg truncate">{autoSaveSlot.character.name}</span>
                                            </div>
                                            <div className="text-[9px] sm:text-[10px] text-slate-400 flex flex-wrap items-center gap-1.5 sm:gap-2">
                                                <span className="flex items-center"><Sword size={10} className="mr-1 text-red-500 shrink-0"/> {autoSaveSlot.character.classTier}</span>
                                                <span className="text-slate-700 hidden sm:inline">•</span>
                                                <span className="flex items-center"><Clock size={10} className="mr-1 text-purple-400 shrink-0"/> {new Date(autoSaveSlot.timestamp).toLocaleString()}</span>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center py-4 text-slate-600">
                                        <span className="text-[9px] sm:text-[10px] font-bold tracking-widest uppercase">No Auto Save Found</span>
                                        <span className="text-[8px] mt-1 opacity-50 font-bold text-center">자동 저장 기능이 켜져 있을 때 모험 진행 중 자동 백업됩니다.</span>
                                    </div>
                                )}
                            </button>
                        </div>
                    )}

                    {[...Array(10)].map((_, idx) => {
                        const slotNum = idx + 1;
                        const data = slots[idx];
                        
                        return (
                            <div key={slotNum} className="relative group flex gap-2">
                                <button
                                    onClick={() => initiateLocalSlotPreview(slotNum)}
                                    className={`flex-1 text-left p-5 rounded-3xl border transition-all duration-200 relative overflow-hidden
                                        ${data 
                                            ? 'bg-slate-800 border-slate-700 hover:border-amber-500 hover:bg-slate-700 shadow-lg' 
                                            : 'bg-slate-900/30 border-slate-800 border-dashed hover:border-slate-600'
                                        }`}
                                >
                                    <div className="absolute top-3 right-4 text-[10px] font-mono text-slate-600 font-bold uppercase tracking-widest">
                                        Slot {slotNum}
                                    </div>

                                    {data ? (
                                        <div className="flex items-center space-x-5">
                                            <div className="p-3 bg-slate-950 rounded-2xl border border-slate-700 text-amber-500 shadow-inner">
                                                <UserIcon size={28} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                  <span className="text-[10px] bg-amber-950 text-amber-500 px-2 py-0.5 rounded border border-amber-900/50 font-bold">
                                                      Lv.{data.character.level}
                                                  </span>
                                                  <span className="font-bold text-slate-100 text-lg truncate">{data.character.name}</span>
                                                </div>
                                                <div className="text-[10px] text-slate-400 flex items-center gap-2">
                                                    <span className="flex items-center"><Sword size={10} className="mr-1 text-red-500"/> {data.character.classTier}</span>
                                                    <span className="text-slate-700">•</span>
                                                    <span className="flex items-center"><Clock size={10} className="mr-1 text-indigo-400"/> {new Date(data.timestamp).toLocaleString()}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center py-6 text-slate-600 group-hover:text-slate-400 transition-colors">
                                            <span className="text-[10px] font-bold tracking-widest uppercase">Empty Slot</span>
                                            {mode === 'save' && <span className="text-[8px] mt-1 opacity-50 font-bold">CLICK TO RECORD DESTINY</span>}
                                        </div>
                                    )}
                                </button>
                                
                                {currentUser && (
                                  <div className="flex flex-col gap-1.5 justify-center min-w-[72px] sm:min-w-[84px] shrink-0">
                                    {data && (
                                      <button 
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); initiateCloudPushPreview(slotNum); }}
                                        title="기기 데이터를 클라우드로 백업"
                                        className="flex flex-col items-center justify-center py-2 px-1 bg-blue-900/30 border border-blue-800 hover:bg-blue-800 text-blue-300 hover:text-white rounded-2xl transition-all shadow-md h-full"
                                      >
                                        <FileUp size={16} className="mb-0.5 text-blue-400 shrink-0" />
                                        <span className="text-[8.5px] font-extrabold tracking-tight whitespace-nowrap">클라우드 백업</span>
                                      </button>
                                    )}
                                    {cloudSlotsInfo[slotNum] && (
                                      <button 
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); initiateCloudPullPreview(slotNum); }}
                                        title={`클라우드 데이터 불러오기 (${new Date(cloudSlotsInfo[slotNum].timestamp).toLocaleDateString()})`}
                                        className="flex flex-col items-center justify-center py-2 px-1 bg-amber-950/30 border border-amber-800 hover:bg-amber-800 text-amber-400 hover:text-white rounded-2xl transition-all shadow-md h-full"
                                      >
                                        <FileDown size={16} className="mb-0.5 text-amber-500 shrink-0" />
                                        <span className="text-[8.5px] font-extrabold tracking-tight whitespace-nowrap">클라우드 복원</span>
                                      </button>
                                    )}
                                  </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {activeTab === 'cloud' && (
              <div className="space-y-6 animate-in fade-in">
                {!currentUser ? (
                  <div className="bg-slate-950/50 border border-slate-800 rounded-3xl p-8 space-y-6">
                    <div className="text-center space-y-2">
                      <div className="w-16 h-16 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto border border-amber-500/20">
                        <Cloud className="text-amber-500" size={32} />
                      </div>
                      <h3 className="text-lg font-bold text-white">구글 드라이브 연동</h3>
                      <p className="text-[11px] text-slate-400 px-4 leading-relaxed">
                        구글 계정으로 로그인하여 당신의 여정을 안전하게 구글 드라이브에 보관하세요.<br/>
                        모든 기기에서 동일한 운명의 기록을 동기화하여 이어갈 수 있습니다.
                      </p>
                    </div>

                    <div className="flex flex-col items-center justify-center pt-2">
                      <button 
                        onClick={handleGoogleLogin}
                        disabled={isProcessing}
                        className="w-full max-w-sm flex items-center justify-center gap-3 bg-white hover:bg-slate-100 text-slate-900 font-bold py-3.5 px-4 rounded-xl shadow-lg transition-all active:scale-[0.98] border border-slate-200 cursor-pointer text-sm"
                      >
                        <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-5 h-5 shrink-0">
                          <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                          <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                          <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                          <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                        </svg>
                        <span>구글 계정으로 로그인</span>
                      </button>
                    </div>

                    {authError && (
                      <div className="p-3 bg-red-950/30 border border-red-900/50 rounded-2xl text-[10px] text-red-400 flex items-start gap-2">
                        <AlertCircle size={14} className="shrink-0 mt-0.5" />
                        <span>{authError}</span>
                      </div>
                    )}
                  </div>
                ) : !googleToken ? (
                  <div className="bg-slate-950/50 border border-slate-800 rounded-3xl p-8 space-y-6">
                    <div className="text-center space-y-2">
                      <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto border border-blue-500/20">
                        <Cloud className="text-blue-400" size={32} />
                      </div>
                      <h3 className="text-lg font-bold text-white">구글 드라이브 연동 승인 필요</h3>
                      <p className="text-[11px] text-slate-400 px-4 leading-relaxed">
                        로그인 세션은 유효하나, 구글 드라이브 세이브 관리를 위해서는 드라이브 액세스 권한 허용이 필요합니다. 아래 버튼을 눌러 연동을 완료해 주세요.
                      </p>
                    </div>

                    <div className="flex flex-col items-center justify-center pt-2">
                      <button 
                        onClick={handleGoogleLogin}
                        disabled={isProcessing}
                        className="w-full max-w-sm flex items-center justify-center gap-3 bg-amber-600 hover:bg-amber-500 text-white font-bold py-3.5 px-4 rounded-xl shadow-lg transition-all active:scale-[0.98] border border-amber-500 cursor-pointer text-sm"
                      >
                        <RefreshCw size={18} className="animate-pulse" />
                        <span>구글 드라이브 권한 허용 및 연동</span>
                      </button>
                    </div>

                    {authError && (
                      <div className="p-3 bg-red-950/30 border border-red-900/50 rounded-2xl text-[10px] text-red-400 flex items-start gap-2">
                        <AlertCircle size={14} className="shrink-0 mt-0.5" />
                        <span>{authError}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="bg-slate-950/50 border border-slate-800 rounded-3xl p-8 flex flex-col items-center text-center space-y-4">
                      <div className="w-20 h-20 bg-indigo-500/10 rounded-full flex items-center justify-center border border-indigo-500/20 relative">
                        <UserIcon className="text-indigo-400" size={40} />
                        <div className="absolute -bottom-1 -right-1 p-1.5 bg-green-500 rounded-full border-4 border-slate-900 shadow-lg"></div>
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-white">{currentUser.email || currentUser.displayName}</h3>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">구글 드라이브 연동됨</p>
                      </div>

                      {/* 세이브 시 비동기 자동 백업 토글 설정 */}
                      <div className="w-full bg-slate-900/80 border border-slate-800 rounded-2xl p-4 text-left space-y-2">
                        <div className="flex items-center justify-between gap-3">
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-white">세이브 시 자동 백업</span>
                              {autoBackupStatus.state === 'syncing' && (
                                <span className="text-[10px] text-blue-400 flex items-center gap-1 font-semibold animate-pulse">
                                  <RefreshCw size={10} className="animate-spin" /> 배경 동기화 중
                                </span>
                              )}
                              {autoBackupStatus.state === 'success' && (
                                <span className="text-[10px] text-emerald-400 flex items-center gap-1 font-semibold">
                                  <CheckCircle size={10} /> 자동 백업 완료
                                </span>
                              )}
                            </div>
                            <p className="text-[10.5px] text-slate-400 leading-relaxed">
                              세이브 슬롯에 저장할 때마다 렉 없이 배경에서 구글 드라이브로 자동 전송됩니다.
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              const next = !autoBackupEnabled;
                              setAutoBackupEnabledState(next);
                              setAutoBackupEnabled(next);
                            }}
                            className={`w-12 h-6 rounded-full transition-colors relative shrink-0 p-0.5 cursor-pointer ${
                              autoBackupEnabled ? 'bg-amber-500' : 'bg-slate-700'
                            }`}
                          >
                            <div
                              className={`w-5 h-5 rounded-full bg-white transition-transform ${
                                autoBackupEnabled ? 'translate-x-6' : 'translate-x-0'
                              }`}
                            />
                          </button>
                        </div>
                        <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-[10px] text-slate-400">
                          <span>자동 토큰 갱신: 구글 계정 1회 연결로 영구 동기화</span>
                          {autoBackupStatus.lastTime && (
                            <span className="text-amber-400/90 font-medium">
                              최근: 슬롯 {autoBackupStatus.lastSlot} ({autoBackupStatus.lastTime})
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3 w-full">
                        <button 
                          onClick={handlePullFromCloud}
                          className="flex items-center justify-center gap-2 py-4 bg-indigo-700 hover:bg-indigo-600 text-white rounded-2xl font-bold shadow-lg transition-all"
                        >
                          <RefreshCw size={18} /> 드라이브 전체 복원
                        </button>
                        <button 
                          onClick={handleBackupAll}
                          className="flex items-center justify-center gap-2 py-4 bg-amber-700 hover:bg-amber-600 text-white rounded-2xl font-bold shadow-lg transition-all"
                        >
                          <Cloud size={18} /> 드라이브 전체 백업
                        </button>
                        <button 
                          onClick={() => setShowConfirmClearCloud(true)}
                          className="col-span-2 flex items-center justify-center gap-2 py-4 bg-red-950/20 hover:bg-red-900/40 text-red-500 border border-red-900/30 rounded-2xl font-bold transition-all"
                        >
                          <Trash2 size={18} /> 드라이브 세이브파일 삭제
                        </button>
                        <button 
                          onClick={handleGoogleLogout}
                          className="col-span-2 flex items-center justify-center gap-2 py-4 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-2xl font-bold transition-all"
                        >
                          <LogOut size={18} /> 연동 해제
                        </button>
                      </div>
                    </div>

                    {/* 구글 드라이브 성좌 보존 슬롯 목록 미리보기 */}
                    <div className="bg-slate-950/50 border border-slate-800 rounded-3xl p-5 space-y-4 text-left w-full">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-extrabold text-slate-100 flex items-center gap-2">
                          <Database className="text-amber-500" size={16} />
                          클라우드 성좌의 보존된 슬롯 기록 목록
                        </h4>
                        <button 
                          type="button"
                          onClick={() => fetchCloudSlotsInfo(true)}
                          disabled={isProcessing}
                          className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
                          title="새로고침"
                        >
                          <RefreshCw size={12} className={isProcessing ? "animate-spin" : ""} />
                        </button>
                      </div>

                      {Object.keys(cloudSlotsInfo).length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {Object.entries(cloudSlotsInfo).map(([slotStr, info]) => {
                            const sNum = parseInt(slotStr);
                            return (
                              <div key={sNum} className="p-3.5 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col gap-1.5">
                                <div className="flex justify-between items-center">
                                  <span className="text-xs font-black text-amber-400">{sNum}번 슬롯 백업본</span>
                                  <span className="text-[9px] bg-slate-950 text-slate-400 px-1.5 py-0.5 rounded border border-slate-800 font-mono font-bold">
                                    {new Date(info.timestamp).toLocaleDateString()}
                                  </span>
                                </div>
                                <div className="text-[10px] text-slate-400 flex justify-between items-center">
                                  <span>저장 시간</span>
                                  <span className="font-mono text-slate-300 font-bold">{new Date(info.timestamp).toLocaleTimeString()}</span>
                                </div>
                                <div className="flex gap-1.5 mt-1.5">
                                  <button
                                    type="button"
                                    onClick={() => initiateCloudPullPreview(sNum)}
                                    className="flex-1 py-1.5 bg-amber-950/40 hover:bg-amber-900 border border-amber-800 hover:border-amber-700 text-amber-400 hover:text-white text-[10px] font-black rounded-xl transition-all cursor-pointer text-center"
                                  >
                                    이 슬롯 복원하기
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="py-8 text-center text-slate-500 border border-dashed border-slate-800 rounded-2xl space-y-1">
                          <AlertTriangle className="mx-auto text-slate-600 mb-1" size={18} />
                          <p className="text-[11px] font-bold">클라우드 드라이브가 비어 있습니다</p>
                          <p className="text-[9px] text-slate-600">로컬 데이터를 클라우드에 먼저 백업해 주세요.</p>
                        </div>
                      )}
                    </div>

                    {/* 구글 1시간 로그인 만료 보안 정책 안내판 */}
                    <div className="p-4 bg-amber-950/20 border border-amber-500/30 rounded-2xl flex gap-3">
                      <AlertTriangle className="text-amber-400 shrink-0 mt-0.5 animate-pulse" size={16} />
                      <div className="text-left space-y-1">
                        <p className="text-xs font-black text-amber-300">구글 보안 연동 안내 및 주의사항</p>
                        <p className="text-[10px] text-slate-400 leading-relaxed font-bold">
                          구글 드라이브 보안 정책상 <span className="text-amber-400">최초 로그인 후 약 1시간이 지나면</span> 보안 열쇠 효력이 자동으로 소멸되어 저장 실패 에러가 뜰 수 있습니다. <br />
                          만약 장시간 모험 후 백업 시 실패 창이 뜬다면, 아래의 **[연동 해제]**를 한 번 누르고 **다시 로그인**하여 최신 상태로 새로고침해주시면 즉시 성공적으로 백업됩니다.
                        </p>
                      </div>
                    </div>

                    <div className="p-4 bg-indigo-950/20 border border-indigo-900/30 rounded-2xl">
                      <p className="text-[10px] text-indigo-400 leading-relaxed text-center font-medium">
                        팁: '저장 슬롯' 탭으로 이동하면 슬롯 옆에 구글 드라이브 백업/복원 버튼이 나타납니다. <br/>
                        개별 세이브 데이터를 사용자님의 개인 구글 드라이브에 안전하게 수동 업로드/다운로드할 수 있습니다.
                      </p>
                    </div>

                    <div className="p-4 bg-emerald-950/20 border border-emerald-900/30 rounded-2xl">
                      <p className="text-[10px] text-emerald-400 leading-relaxed text-center font-medium">
                        ✨ <strong>속도 개선 완료:</strong> 모달을 열 때마다 구글 드라이브와 연동하던 무거운 작업을 제거했습니다. <br/>
                        이제 <strong>클라우드 탭에 접속하거나 전체 복원/백업 등의 작업을 진행할 때만</strong> 드라이브를 확인하므로 모달 진입 속도가 압도적으로 빨라졌습니다.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'code' && (
                <div className="space-y-6 animate-in fade-in">
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center">
                                <FileCode size={16} className="mr-2 text-indigo-400"/> 세이브 코드 내보내기
                            </h3>
                        </div>

                        {/* 모바일 최적화 미디어 및 이펙트 프레임 포함 토글 옵션 */}
                        <div className="space-y-2">
                            <div 
                                onClick={() => {
                                    const next = !includeMediaInExport;
                                    setIncludeMediaInExport(next);
                                    if (selectedExportSlot) {
                                        generateCode(selectedExportSlot, next, includeFrameAnimationInExport);
                                    }
                                }}
                                className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex items-center justify-between gap-3 select-none active:scale-[0.99] ${
                                    includeMediaInExport 
                                        ? 'bg-indigo-950/40 border-indigo-500/60 text-indigo-200' 
                                        : 'bg-slate-950/60 border-slate-800 text-slate-400'
                                }`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`w-5 h-5 rounded-lg border flex items-center justify-center shrink-0 transition-all ${
                                        includeMediaInExport ? 'bg-indigo-600 border-indigo-400 text-white' : 'border-slate-700 bg-slate-900'
                                    }`}>
                                        {includeMediaInExport && <CheckCircle size={14} />}
                                    </div>
                                    <div className="text-left">
                                        <p className="text-xs font-bold text-white">스킬 미디어 (영상 및 이미지) 포함</p>
                                        <p className="text-[10px] text-slate-400 mt-0.5">
                                            {includeMediaInExport ? '스킬 영상과 이미지를 보존하여 내보냅니다.' : '미포함 시 영상, 이미지 및 이펙트 프레임이 모두 제외되어 초경량으로 내보냅니다.'}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {includeMediaInExport && (
                                <div 
                                    onClick={() => {
                                        const next = !includeFrameAnimationInExport;
                                        setIncludeFrameAnimationInExport(next);
                                        if (selectedExportSlot) {
                                            generateCode(selectedExportSlot, includeMediaInExport, next);
                                        }
                                    }}
                                    className={`p-3 rounded-2xl border cursor-pointer transition-all flex items-center justify-between gap-3 select-none active:scale-[0.99] ${
                                        includeFrameAnimationInExport 
                                            ? 'bg-indigo-950/40 border-indigo-400/60 text-indigo-200' 
                                            : 'bg-slate-950/50 border-slate-800/80 text-slate-400'
                                    }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`w-5 h-5 rounded-lg border flex items-center justify-center shrink-0 transition-all ${
                                            includeFrameAnimationInExport ? 'bg-indigo-600 border-indigo-400 text-white' : 'border-slate-700 bg-slate-900'
                                        }`}>
                                            {includeFrameAnimationInExport && <CheckCircle size={14} />}
                                        </div>
                                        <div className="text-left">
                                            <p className="text-xs font-bold text-white">스킬 이펙트 프레임 포함</p>
                                            <p className="text-[10px] text-slate-400 mt-0.5">
                                                {includeFrameAnimationInExport 
                                                    ? '커스텀 이펙트 프레임 이미지를 포함합니다 (세이브 용량이 크게 증가할 수 있습니다).' 
                                                    : '이펙트 프레임 이미지를 제외하여 세이브 용량을 대폭 줄입니다.'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="flex gap-2 flex-wrap">
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
                                <button 
                                    key={num}
                                    disabled={!slots[num-1] || isProcessing}
                                    onClick={() => generateCode(num)}
                                    className={`w-[18%] py-3 text-[10px] font-bold rounded-xl border transition-all ${selectedExportSlot === num ? 'bg-amber-900/40 border-amber-500 text-amber-200 shadow-inner' : slots[num-1] ? 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white' : 'bg-slate-950 border-slate-800 text-slate-700 cursor-not-allowed'}`}
                                >
                                    {num}
                                </button>
                            ))}
                        </div>
                        {exportCode && !isProcessing && (
                            <div className="space-y-3 animate-in slide-in-from-top-1">
                                <div className="relative">
                                    <textarea 
                                        readOnly
                                        value={exportCode}
                                        className="w-full h-24 bg-slate-950 border border-slate-800 rounded-2xl p-4 text-[10px] text-indigo-300 font-mono focus:outline-none resize-none shadow-inner"
                                    />
                                    <button 
                                        onClick={handleCopyCode}
                                        className="absolute bottom-3 right-3 p-2 bg-indigo-600 hover:bg-indigo-500 border border-indigo-400 text-white rounded-xl flex items-center gap-1.5 shadow-lg transition-all active:scale-95"
                                    >
                                        {copyFeedback ? <CheckCircle size={14}/> : <Copy size={14}/>}
                                        <span className="text-[10px] font-bold">{copyFeedback ? '복사됨' : '코드 복사'}</span>
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="h-px bg-slate-800"></div>
                    <div className="space-y-3">
                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center">
                            <ClipboardPaste size={16} className="mr-2 text-green-400"/> 세이브 코드 붙여넣기
                        </h3>
                        <textarea 
                            value={importCode}
                            onChange={(e) => setImportCode(e.target.value)}
                            placeholder="이곳에 코드를 붙여넣으세요"
                            className="w-full h-24 bg-slate-950 border border-slate-800 rounded-2xl p-4 text-[10px] text-indigo-300 font-mono focus:border-indigo-500 outline-none resize-none shadow-inner"
                        />
                        <div className="flex gap-2 flex-wrap">
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
                                <button 
                                    key={num}
                                    disabled={isProcessing || !importCode.trim()}
                                    onClick={() => handleImport(num)}
                                    className="w-[18%] py-3 bg-slate-800 hover:bg-green-900/40 text-green-300 border border-slate-700 hover:border-green-500 rounded-xl text-xs font-bold transition-all disabled:opacity-30"
                                >
                                    {num}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'file' && (
                <div className="space-y-8 animate-in fade-in">
                    <div className="text-center bg-slate-950/50 p-6 rounded-3xl border border-slate-800">
                        <FileDown size={40} className="mx-auto text-amber-500 mb-4"/>
                        <h3 className="text-lg font-bold text-white mb-2">세이브 파일로 내보내기</h3>
                        <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                            코드가 너무 길어 복사하기 번거롭다면 파일로 저장하세요.
                        </p>

                        {/* 모바일 최적화 미디어 및 이펙트 프레임 포함 토글 옵션 */}
                        <div className="max-w-md mx-auto mb-6 space-y-2">
                            <div 
                                onClick={() => setIncludeMediaInExport(!includeMediaInExport)}
                                className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex items-center justify-between gap-3 select-none active:scale-[0.99] ${
                                    includeMediaInExport 
                                        ? 'bg-amber-950/30 border-amber-500/50 text-amber-200' 
                                        : 'bg-slate-950/60 border-slate-800 text-slate-400'
                                }`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`w-5 h-5 rounded-lg border flex items-center justify-center shrink-0 transition-all ${
                                        includeMediaInExport ? 'bg-amber-600 border-amber-400 text-white' : 'border-slate-700 bg-slate-900'
                                    }`}>
                                        {includeMediaInExport && <CheckCircle size={14} />}
                                    </div>
                                    <div className="text-left">
                                        <p className="text-xs font-bold text-white">스킬 미디어 (영상 및 이미지) 포함</p>
                                        <p className="text-[10px] text-slate-400 mt-0.5">
                                            {includeMediaInExport ? '스킬 영상과 이미지를 보존하여 내보냅니다.' : '미포함 시 영상, 이미지 및 이펙트 프레임이 모두 제외되어 초경량으로 내보냅니다.'}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {includeMediaInExport && (
                                <div 
                                    onClick={() => setIncludeFrameAnimationInExport(!includeFrameAnimationInExport)}
                                    className={`p-3 rounded-2xl border cursor-pointer transition-all flex items-center justify-between gap-3 select-none active:scale-[0.99] ${
                                        includeFrameAnimationInExport 
                                            ? 'bg-amber-950/40 border-amber-400/60 text-amber-200' 
                                            : 'bg-slate-950/50 border-slate-800/80 text-slate-400'
                                    }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`w-5 h-5 rounded-lg border flex items-center justify-center shrink-0 transition-all ${
                                            includeFrameAnimationInExport ? 'bg-amber-600 border-amber-400 text-white' : 'border-slate-700 bg-slate-900'
                                        }`}>
                                            {includeFrameAnimationInExport && <CheckCircle size={14} />}
                                        </div>
                                        <div className="text-left">
                                            <p className="text-xs font-bold text-white">스킬 이펙트 프레임 포함</p>
                                            <p className="text-[10px] text-slate-400 mt-0.5">
                                                {includeFrameAnimationInExport 
                                                    ? '커스텀 이펙트 프레임 이미지를 포함합니다 (세이브 용량이 크게 증가할 수 있습니다).' 
                                                    : '이펙트 프레임 이미지를 제외하여 세이브 용량을 대폭 줄입니다.'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-5 gap-3">
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
                                <button
                                    key={num}
                                    disabled={!slots[num-1] || isProcessing}
                                    onClick={() => handleSaveToFile(num)}
                                    className={`py-3 rounded-xl border flex flex-col items-center gap-1 transition-all ${slots[num-1] ? 'bg-amber-900/30 border-amber-600 text-amber-200 hover:bg-amber-800' : 'bg-slate-900 border border-slate-800 text-slate-600 cursor-not-allowed'}`}
                                >
                                    <span className="text-[10px] font-bold uppercase">{num}</span>
                                    <FileDown size={16}/>
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="text-center bg-slate-950/50 p-6 rounded-3xl border border-slate-800">
                        <FileUp size={40} className="mx-auto text-indigo-400 mb-4"/>
                        <h3 className="text-lg font-bold text-white mb-2">세이브 파일 불러오기</h3>
                        <p className="text-xs text-slate-500 mb-6">
                            이전에 저장한 ".sav" 파일을 선택하여 데이터를 복구합니다.
                        </p>
                        <input 
                            type="file" 
                            accept=".sav,.txt"
                            onChange={handleLoadFromFile}
                            ref={fileInputRef}
                            className="hidden"
                        />
                        <button 
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isProcessing}
                            className="px-10 py-4 bg-indigo-700 hover:bg-indigo-600 text-white rounded-2xl font-bold shadow-xl flex items-center justify-center gap-2 mx-auto transition-all active:scale-95"
                        >
                            <FileUp size={20}/> 파일 선택하기
                        </button>
                    </div>

                    {/* 세이브 용량 다이어트 마법사 섹션 */}
                    <div className="h-px bg-slate-800 my-8"></div>
                    <div className="bg-slate-950/40 p-6 rounded-3xl border border-slate-800/80 space-y-4">
                        <div className="flex items-center gap-2">
                            <Database className="text-amber-500" size={20} />
                            <div className="text-left">
                                <h4 className="text-sm font-bold text-white">세이브 파일 용량 다이어트</h4>
                                <p className="text-[10px] text-slate-500 mt-0.5">각 슬롯 내 고용량 이미지들을 일괄 디코딩 및 리사이징 압축합니다.</p>
                            </div>
                        </div>

                        {/* 진행중 상태 표시 */}
                        {compressingSlot !== null && compressionProgress && (
                            <div className="p-4 bg-amber-950/20 border border-amber-500/30 rounded-2xl space-y-2.5 animate-pulse">
                                <div className="flex justify-between items-center text-[11px] font-bold">
                                    <span className="text-amber-400">{compressingSlot}번 슬롯 압축 진행 중</span>
                                    <span className="text-amber-300">{compressionProgress.current} / {compressionProgress.total}</span>
                                </div>
                                <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-800">
                                    <div 
                                        className="bg-amber-500 h-full transition-all duration-300"
                                        style={{ width: `${Math.round((compressionProgress.current / compressionProgress.total) * 100)}%` }}
                                    ></div>
                                </div>
                                <p className="text-[9px] text-slate-400 font-medium text-center">{compressionProgress.label}</p>
                            </div>
                        )}

                        {/* 완료 결과 표시 */}
                        {compressionResult && (
                            <div className="p-4 bg-emerald-950/30 border border-emerald-500/30 rounded-2xl space-y-2 text-center animate-in fade-in zoom-in-95">
                                <p className="text-xs font-bold text-emerald-400">{compressionResult.slotNum}번 슬롯 용량 축소 성공!</p>
                                <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-400 font-mono">
                                    <div className="bg-slate-950/50 p-2 rounded-xl">
                                        <p className="text-[9px] text-slate-500">압축 전</p>
                                        <p className="font-bold text-slate-300">{(compressionResult.originalSize / 1024).toFixed(1)} KB</p>
                                    </div>
                                    <div className="bg-slate-950/50 p-2 rounded-xl">
                                        <p className="text-[9px] text-slate-500">압축 후</p>
                                        <p className="font-bold text-emerald-400">{(compressionResult.compressedSize / 1024).toFixed(1)} KB</p>
                                    </div>
                                </div>
                                <p className="text-[10px] text-emerald-300 font-bold">
                                    전체 용량이 {compressionResult.ratio}% 절감되어 세이브/클라우드 속도가 대폭 향상되었습니다.
                                </p>
                            </div>
                        )}

                        <p className="text-[10.5px] text-slate-400 leading-relaxed text-left">
                            과거에 스킬 제작 시 등록했던 고용량 이미지 및 수십 개의 이펙트 프레임을 최대 128픽셀의 콤팩트한 크기로 리사이징하고, 저품질 JPEG로 압축 변환합니다. 화질이 미세하게 낮아지는 대신 세이브 파일과 클라우드의 전송 속도가 최대 10배 비약적으로 향상됩니다.
                        </p>

                        <div className="space-y-2">
                            <p className="text-[10px] font-bold text-slate-500 text-left uppercase tracking-wider">압축할 슬롯 선택</p>
                            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => {
                                    const hasData = !!slots[num - 1];
                                    const isThisCompressing = compressingSlot === num;
                                    return (
                                        <button
                                            key={num}
                                            disabled={!hasData || compressingSlot !== null}
                                            onClick={() => handleCompressSlotMedia(num)}
                                            className={`py-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all ${
                                                isThisCompressing 
                                                    ? 'bg-amber-950/40 border-amber-500 text-amber-200 animate-pulse' 
                                                    : hasData 
                                                        ? 'bg-slate-900 hover:bg-amber-950/10 border-slate-800 hover:border-amber-900/40 text-slate-300' 
                                                        : 'bg-slate-950 border-slate-950 text-slate-700 cursor-not-allowed'
                                            }`}
                                        >
                                            <span className="text-[10px] font-bold">{num}번 슬롯</span>
                                            <span className="text-[9px] font-mono text-slate-500">
                                                {hasData ? `${(JSON.stringify(slots[num - 1]).length / 1024).toFixed(0)}KB` : '비어있음'}
                                            </span>
                                            {hasData && (
                                                <span className="text-[8px] px-1.5 py-0.5 bg-amber-500/10 text-amber-400 rounded border border-amber-500/20 font-bold active:scale-95">압축하기</span>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {isProcessing && (
                <div className="absolute inset-0 bg-black/90 z-[150] flex flex-col items-center justify-center backdrop-blur-md rounded-[2rem] p-6 text-center">
                    <div className="relative mb-6">
                        <div className="absolute inset-0 bg-amber-500/30 blur-3xl opacity-30 animate-pulse"></div>
                        <div className="w-20 h-20 bg-amber-500/10 rounded-full flex items-center justify-center border border-amber-500/30 shadow-inner relative z-10 animate-bounce">
                            <Cloud className="text-amber-500 animate-pulse" size={40} />
                        </div>
                    </div>
                    
                    <div className="w-full max-w-sm space-y-5">
                        <div className="space-y-1.5">
                            <h3 className="text-white font-extrabold tracking-wide text-base sm:text-lg">
                                클라우드 동기화 운행 중
                            </h3>
                            <p className="text-amber-500 font-bold tracking-widest text-xs sm:text-sm animate-pulse min-h-[1.5rem]">
                                {cloudProgress?.label || '클라우드와 운명을 연결하는 중입니다...'}
                            </p>
                        </div>
                        
                        {cloudProgress ? (
                            <div className="bg-slate-950/80 border border-slate-800 rounded-3xl p-4 space-y-3 shadow-2xl">
                                <div className="w-full bg-slate-900 rounded-full h-3.5 overflow-hidden border border-slate-800/80 p-0.5 relative">
                                    <div 
                                        className="bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-400 h-full rounded-full transition-all duration-300 shadow-[0_0_12px_rgba(245,158,11,0.6)] relative overflow-hidden"
                                        style={{ 
                                            width: `${cloudProgress.total > 0 ? Math.max(5, Math.round((cloudProgress.current / cloudProgress.total) * 100)) : 5}%` 
                                        }}
                                    ></div>
                                </div>
                                <div className="flex justify-between items-center text-[10.5px] text-slate-400 font-mono font-bold">
                                    <span>동기화 진행률</span>
                                    <span className="text-amber-400 font-bold flex items-center gap-1.5">
                                        {cloudProgress.total > 0 ? `${Math.round((cloudProgress.current / cloudProgress.total) * 100)}%` : '준비 중'}
                                        <span className="text-slate-500 font-normal">({cloudProgress.current}/{cloudProgress.total})</span>
                                    </span>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-slate-950/80 border border-slate-800 rounded-3xl p-4 space-y-3 shadow-2xl animate-pulse">
                                <div className="w-full bg-slate-900 rounded-full h-3.5 overflow-hidden border border-slate-800/80 p-0.5 relative">
                                    <div className="bg-gradient-to-r from-amber-600 to-amber-400 h-full rounded-full w-2/3 animate-pulse"></div>
                                </div>
                                <div className="flex justify-between items-center text-[10.5px] text-slate-400 font-mono font-bold">
                                    <span>구글 드라이브 응답 대기</span>
                                    <span className="text-amber-400 font-bold">대기 중</span>
                                </div>
                            </div>
                        )}
                        
                        <p className="text-[10px] text-slate-500 leading-normal">
                            네트워크 환경 및 세이브 파일 크기에 따라 수 초 정도 걸릴 수 있습니다.<br />
                            동기화가 완료될 때까지 브라우저 창을 닫지 말아주세요.
                        </p>
                    </div>
                </div>
            )}

            {showConfirmSyncAll && (
                <div className="absolute inset-0 bg-black/80 z-[120] flex items-center justify-center backdrop-blur-md rounded-[2rem] p-8">
                    <div className="bg-slate-900 border border-indigo-500 rounded-3xl p-8 max-w-sm w-full text-center space-y-6 shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="w-16 h-16 bg-indigo-500/10 rounded-full flex items-center justify-center mx-auto border border-indigo-500/20">
                            <RefreshCw className="text-indigo-400 animate-spin-slow" size={32} />
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-xl font-bold text-white">클라우드 동기화 확인</h3>
                            <p className="text-xs text-slate-400 leading-relaxed">
                                클라우드에 보관된 모든 여정의 기록을 현재 기기로 가져옵니다.<br/>
                                <span className="text-indigo-400 font-bold">로컬 데이터가 덮어씌워질 수 있습니다.</span><br/>
                                계속하시겠습니까?
                            </p>
                        </div>
                        <div className="flex gap-3">
                            <button 
                                onClick={() => setShowConfirmSyncAll(false)}
                                className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-2xl font-bold transition-all"
                            >
                                취소
                            </button>
                            <button 
                                onClick={executePullFromCloud}
                                className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-bold shadow-lg shadow-indigo-500/20 transition-all active:scale-95"
                            >
                                동기화 시작
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showConfirmBackupAll && (
                <div className="absolute inset-0 bg-black/80 z-[120] flex items-center justify-center backdrop-blur-md rounded-[2rem] p-8">
                    <div className="bg-slate-900 border border-amber-500 rounded-3xl p-8 max-w-sm w-full text-center space-y-6 shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="w-16 h-16 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto border border-amber-500/20">
                            <Cloud className="text-amber-500" size={32} />
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-xl font-bold text-white">전체 백업 확인</h3>
                            <p className="text-xs text-slate-400 leading-relaxed">
                                현재 기기에 있는 모든 슬롯의 데이터를 클라우드 서버로 백업합니다.<br/>
                                <span className="text-amber-500 font-bold">클라우드에 기존 데이터가 있다면 덮어씌워집니다.</span><br/>
                                계속하시겠습니까?
                            </p>
                        </div>
                        <div className="flex gap-3">
                            <button 
                                onClick={() => setShowConfirmBackupAll(false)}
                                className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-2xl font-bold transition-all"
                            >
                                취소
                            </button>
                            <button 
                                onClick={executeBackupAll}
                                className="flex-1 py-3 bg-amber-600 hover:bg-amber-500 text-white rounded-2xl font-bold shadow-lg shadow-amber-500/20 transition-all active:scale-95"
                            >
                                백업 시작
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showConfirmClearCloud && (
                <div className="absolute inset-0 bg-black/80 z-[120] flex items-center justify-center backdrop-blur-md rounded-[2rem] p-8">
                    <div className="bg-slate-900 border border-red-500 rounded-3xl p-8 max-w-sm w-full text-center space-y-6 shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto border border-red-500/20">
                            <Trash2 className="text-red-500" size={32} />
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-xl font-bold text-white">클라우드 초기화 경고</h3>
                            <p className="text-xs text-slate-400 leading-relaxed">
                                성좌에 보관된 <span className="text-red-500 font-bold underline">모든 데이터</span>가 영구적으로 삭제됩니다.<br/>
                                이 작업은 되돌릴 수 없습니다.<br/>
                                정말로 초기화하시겠습니까?
                            </p>
                        </div>
                        <div className="flex gap-3">
                            <button 
                                onClick={() => setShowConfirmClearCloud(false)}
                                className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-2xl font-bold transition-all"
                            >
                                취소
                            </button>
                            <button 
                                onClick={executeClearCloud}
                                className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white rounded-2xl font-bold shadow-lg shadow-red-500/20 transition-all active:scale-95"
                            >
                                무조건 삭제
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 세이브/로드 미리보기 확인 모달 (Save/Load Preview Confirmation Modal) */}
            {previewState && (
                <div className="absolute inset-0 bg-black/90 z-[140] flex items-center justify-center backdrop-blur-md rounded-[2rem] p-4 sm:p-6 overflow-y-auto">
                    <div className="bg-slate-900 border-2 border-amber-500/50 rounded-3xl p-5 sm:p-6 w-full max-w-md shadow-2xl space-y-4 animate-in zoom-in-95 duration-200">
                        
                        {/* Title */}
                        <div className="text-center space-y-1.5 border-b border-slate-800 pb-3">
                            <div className="w-12 h-12 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto border border-amber-500/20">
                                {previewState.type === 'local_save' && <Save className="text-blue-400" size={24} />}
                                {previewState.type === 'local_load' && <Download className="text-emerald-400" size={24} />}
                                {previewState.type === 'cloud_backup' && <FileUp className="text-blue-400 animate-bounce" size={24} />}
                                {previewState.type === 'cloud_restore' && <FileDown className="text-amber-500 animate-bounce" size={24} />}
                            </div>
                            <h3 className="text-base sm:text-lg font-bold text-slate-100">
                                {previewState.type === 'local_save' && `슬롯 ${previewState.slotNum} 로컬 저장 미리보기`}
                                {previewState.type === 'local_load' && `슬롯 ${previewState.slotNum} 로컬 불러오기 미리보기`}
                                {previewState.type === 'cloud_backup' && `슬롯 ${previewState.slotNum} 클라우드 백업 미리보기`}
                                {previewState.type === 'cloud_restore' && `슬롯 ${previewState.slotNum} 클라우드 복원 미리보기`}
                            </h3>
                            <p className="text-[10.5px] text-slate-400 leading-normal">
                                {previewState.type === 'local_save' && "현재 진행 중인 데이터를 기기의 슬롯에 저장합니다."}
                                {previewState.type === 'local_load' && "기기에 저장된 슬롯 데이터로 모험을 다시 이어서 시작합니다."}
                                {previewState.type === 'cloud_backup' && "로컬 슬롯의 여정을 구름 너머 클라우드 성좌에 백업합니다."}
                                {previewState.type === 'cloud_restore' && "성좌에 보관 중인 여정의 기록을 현재 기기 슬롯에 복원합니다."}
                            </p>
                        </div>

                        {/* Preview Cards / Comparisons */}
                        <div className="space-y-3 max-h-[30vh] overflow-y-auto pr-1">
                            {/* Type-specific Comparison */}
                            {previewState.type === 'local_save' && (
                                <div className="space-y-3">
                                    {/* Source: Current Game State */}
                                    <div className="p-3 bg-blue-950/20 border border-blue-500/20 rounded-2xl space-y-1">
                                        <span className="text-[9px] font-bold text-blue-400 uppercase tracking-wider">새로 저장할 데이터 (현재 진행 상태)</span>
                                        {previewState.newData ? (
                                            <div className="flex justify-between items-center text-xs">
                                                <div>
                                                    <span className="font-bold text-slate-200">{previewState.newData.character.name}</span>
                                                    <span className="text-slate-400 ml-2">Lv.{previewState.newData.character.level}</span>
                                                    <p className="text-[10px] text-slate-500 mt-0.5">{previewState.newData.character.classTier}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="font-bold text-amber-500">{previewState.newData.character.money.toLocaleString()} Gold</p>
                                                    <p className="text-[9px] text-slate-400 mt-0.5">지금 이 순간</p>
                                                </div>
                                            </div>
                                        ) : (
                                            <p className="text-xs text-slate-500">데이터가 존재하지 않습니다.</p>
                                        )}
                                    </div>

                                    {/* Target: Existing Slot Data */}
                                    <div className="p-3 bg-slate-950/50 border border-slate-800 rounded-2xl space-y-1">
                                        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">덮어씌워질 기존 슬롯 데이터</span>
                                        {previewState.localData ? (
                                            <div className="flex justify-between items-center text-xs">
                                                <div>
                                                    <span className="font-bold text-slate-300">{previewState.localData.character.name}</span>
                                                    <span className="text-slate-400 ml-2">Lv.{previewState.localData.character.level}</span>
                                                    <p className="text-[10px] text-slate-500 mt-0.5">{previewState.localData.character.classTier}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="font-bold text-amber-600/80">{previewState.localData.character.money.toLocaleString()} Gold</p>
                                                    <p className="text-[9px] text-slate-500 mt-0.5">{new Date(previewState.localData.timestamp).toLocaleString()}</p>
                                                </div>
                                            </div>
                                        ) : (
                                            <p className="text-xs text-slate-600 italic py-1">비어 있는 슬롯 (안전하게 저장 가능)</p>
                                        )}
                                    </div>
                                </div>
                            )}

                            {previewState.type === 'local_load' && (
                                <div className="space-y-3">
                                    <div className="p-4 bg-emerald-950/20 border border-emerald-500/20 rounded-2xl space-y-2">
                                        <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-wider">불러올 세이브 데이터</span>
                                        {previewState.localData ? (
                                            <div className="flex justify-between items-center text-xs">
                                                <div>
                                                    <span className="font-bold text-slate-100 text-sm">{previewState.localData.character.name}</span>
                                                    <span className="text-slate-300 ml-2 font-mono">Lv.{previewState.localData.character.level}</span>
                                                    <p className="text-[11px] text-slate-400 mt-1">{previewState.localData.character.classTier}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="font-bold text-amber-500">{previewState.localData.character.money.toLocaleString()} Gold</p>
                                                    <p className="text-[9px] text-slate-400 mt-1 flex items-center justify-end"><Clock size={9} className="mr-1"/> {new Date(previewState.localData.timestamp).toLocaleString()}</p>
                                                </div>
                                            </div>
                                        ) : (
                                            <p className="text-xs text-slate-500">데이터가 존재하지 않습니다.</p>
                                        )}
                                    </div>
                                </div>
                            )}

                            {previewState.type === 'cloud_backup' && (
                                <div className="space-y-3">
                                    {/* Source: Local Data */}
                                    <div className="p-3 bg-blue-950/20 border border-blue-500/20 rounded-2xl space-y-1">
                                        <span className="text-[9px] font-bold text-blue-400 uppercase tracking-wider">클라우드에 백업할 로컬 데이터</span>
                                        {previewState.localData ? (
                                            <div className="flex justify-between items-center text-xs">
                                                <div>
                                                    <span className="font-bold text-slate-200">{previewState.localData.character.name}</span>
                                                    <span className="text-slate-400 ml-2">Lv.{previewState.localData.character.level}</span>
                                                    <p className="text-[10px] text-slate-500 mt-0.5">{previewState.localData.character.classTier}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="font-bold text-amber-500">{previewState.localData.character.money.toLocaleString()} Gold</p>
                                                    <p className="text-[9px] text-slate-400 mt-0.5">{new Date(previewState.localData.timestamp).toLocaleString()}</p>
                                                </div>
                                            </div>
                                        ) : (
                                            <p className="text-xs text-slate-500">로컬 데이터가 없습니다.</p>
                                        )}
                                    </div>

                                    {/* Target: Cloud Timestamp */}
                                    <div className="p-3 bg-slate-950/50 border border-slate-800 rounded-2xl space-y-1">
                                        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">덮어씌워질 기존 클라우드 기록</span>
                                        {cloudSlotsInfo[previewState.slotNum] ? (
                                            <div className="flex justify-between items-center text-xs py-1">
                                                <span className="font-medium text-slate-300">구름 성좌에 기록 존재</span>
                                                <span className="text-[10px] text-amber-600 font-mono">
                                                    {new Date(cloudSlotsInfo[previewState.slotNum].timestamp).toLocaleString()}
                                                </span>
                                            </div>
                                        ) : (
                                            <p className="text-xs text-slate-600 italic py-1">클라우드 기록 없음 (최초 백업)</p>
                                        )}
                                    </div>
                                </div>
                            )}

                            {previewState.type === 'cloud_restore' && (
                                <div className="space-y-3">
                                    {/* Source: Fetched Cloud Data */}
                                    <div className="p-3 bg-amber-950/20 border border-amber-500/20 rounded-2xl space-y-1">
                                        <span className="text-[9px] font-bold text-amber-400 uppercase tracking-wider">가져올 클라우드 데이터 (복원 대상)</span>
                                        {previewState.newData ? (
                                            <div className="flex justify-between items-center text-xs">
                                                <div>
                                                    <span className="font-bold text-slate-100">{previewState.newData.character.name}</span>
                                                    <span className="text-slate-300 ml-2">Lv.{previewState.newData.character.level}</span>
                                                    <p className="text-[10px] text-slate-400 mt-0.5">{previewState.newData.character.classTier}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="font-bold text-amber-500">{previewState.newData.character.money.toLocaleString()} Gold</p>
                                                    <p className="text-[9px] text-slate-400 mt-0.5">
                                                        {cloudSlotsInfo[previewState.slotNum] 
                                                            ? new Date(cloudSlotsInfo[previewState.slotNum].timestamp).toLocaleString()
                                                            : '기록 완료'}
                                                    </p>
                                                </div>
                                            </div>
                                        ) : (
                                            <p className="text-xs text-slate-500">클라우드 데이터 구문 분석 중 오류 발생</p>
                                        )}
                                    </div>

                                    {/* Target: Local Data to Overwrite */}
                                    <div className="p-3 bg-slate-950/50 border border-slate-800 rounded-2xl space-y-1">
                                        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">덮어씌워질 로컬 슬롯 데이터</span>
                                        {previewState.localData ? (
                                            <div className="flex justify-between items-center text-xs">
                                                <div>
                                                    <span className="font-bold text-slate-300">{previewState.localData.character.name}</span>
                                                    <span className="text-slate-400 ml-2">Lv.{previewState.localData.character.level}</span>
                                                    <p className="text-[10px] text-slate-500 mt-0.5">{previewState.localData.character.classTier}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="font-bold text-amber-600/80">{previewState.localData.character.money.toLocaleString()} Gold</p>
                                                    <p className="text-[9px] text-slate-500 mt-0.5">{new Date(previewState.localData.timestamp).toLocaleString()}</p>
                                                </div>
                                            </div>
                                        ) : (
                                            <p className="text-xs text-slate-600 italic py-1">비어 있는 슬롯 (안전하게 복원 가능)</p>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Warning text */}
                        <div className="bg-red-950/15 border border-red-900/30 rounded-2xl p-3 flex gap-2">
                            <AlertTriangle className="text-red-400 shrink-0 mt-0.5" size={15} />
                            <p className="text-[10px] sm:text-[10.5px] text-red-300 leading-relaxed font-medium">
                                {previewState.type === 'local_save' && "저장 완료 시 로컬 슬롯의 기존 세이브 기록은 즉시 지워지며 절대 복구할 수 없습니다."}
                                {previewState.type === 'local_load' && "불러오기 완료 시, 현재 진행 중인 내용은 소멸하고 이 시점의 기록에서부터 다시 여정이 이어집니다."}
                                {previewState.type === 'cloud_backup' && "백업 시 클라우드 성좌의 기록은 덮어씌워집니다. 전 세계 어디서나 이 시점부터 클라우드 복원이 활성화됩니다."}
                                {previewState.type === 'cloud_restore' && "복원 시 기기 내부의 로컬 세이브 파일이 성좌 세이브 파일로 완전 대체되며 되돌릴 수 없습니다."}
                            </p>
                        </div>

                        {/* Confirm & Cancel Buttons */}
                        <div className="flex gap-2.5 pt-1.5">
                            <button
                                type="button"
                                onClick={() => setPreviewState(null)}
                                className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-2xl font-bold transition-all text-xs"
                            >
                                취소하기
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    if (previewState.type === 'local_save' || previewState.type === 'local_load') {
                                        const targetSlot = previewState.slotNum;
                                        const targetData = previewState.newData;
                                        onSelectSlot(targetSlot);
                                        if (previewState.type === 'local_save') {
                                            triggerSaveAutoBackup(targetSlot, targetData);
                                        }
                                        setPreviewState(null);
                                    } else if (previewState.type === 'cloud_backup') {
                                        handlePushToCloudConfirmed(previewState.slotNum);
                                    } else if (previewState.type === 'cloud_restore') {
                                        handlePullSingleFromCloudConfirmed(previewState.slotNum, previewState.newData);
                                    }
                                }}
                                className={`flex-1 py-3 rounded-2xl font-bold transition-all text-xs text-white shadow-lg ${
                                    previewState.type === 'local_save' ? 'bg-blue-600 hover:bg-blue-500 shadow-blue-500/10' :
                                    previewState.type === 'local_load' ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-500/10' :
                                    previewState.type === 'cloud_backup' ? 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-500/10' :
                                    'bg-amber-600 hover:bg-amber-500 shadow-amber-500/10'
                                }`}
                            >
                                {previewState.type === 'local_save' && "저장 실행"}
                                {previewState.type === 'local_load' && "불러오기 실행"}
                                {previewState.type === 'cloud_backup' && "클라우드 백업 실행"}
                                {previewState.type === 'cloud_restore' && "클라우드 복원 실행"}
                            </button>
                        </div>

                    </div>
                </div>
            )}
        </div>
        
        <PrivacyPolicyModal 
            isOpen={isPrivacyModalOpen} 
            onClose={() => setIsPrivacyModalOpen(false)} 
        />

        <div className="p-4 bg-slate-950 border-t border-white/5 text-center shrink-0">
             <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest">
                 {activeTab === 'slots' 
                    ? (mode === 'save' ? "Click a slot to backup your destiny" : "Choose a point in time to return")
                    : activeTab === 'code' ? "Transfer your data via Dimension Code" : activeTab === 'cloud' ? "Cloud Sync Protocol Active" : "Hardware data storage protocol active"}
             </p>
        </div>
      </div>
    </div>
  );
};

export default SaveLoadModal;
