/**
 * 구글 드라이브 비동기 자동 불러오기/동기화 서비스
 * 
 * 특징:
 * 1. 초경량 메타데이터(수정 시각) 비동기 비교: 전체 세이브 파일을 다운로드하지 않고 목록/수정 시각만 0.1초 내 비동기 비교
 * 2. 선택적 스마트 다운로드: 클라우드가 더 최신인 슬롯만 선별 다운로드하여 렉과 데이터 소모 최소화
 * 3. 실행 시점 제한: 앱 초기 연동 시점 및 세이브/로드 모달 진입 시 1회만 비동기 동작
 * 4. 스마트 안내 알림 & 원클릭/자동 동기화 지원
 */

import { GameStorage } from '../storage';
import { getSaveSlotKey, decompressData, optimizeSaveData } from '../utils';
import { 
  getDriveSavesMetaList, 
  downloadSaveFromDrive, 
  getValidDriveAccessToken, 
  getCurrentDriveUser 
} from './googleDriveService';

export interface NewerCloudSlot {
  slotNum: number;
  cloudTime: string;
  localTime: string | null;
}

export interface AutoSyncStatus {
  state: 'idle' | 'checking' | 'has_newer' | 'syncing' | 'success' | 'error';
  newerSlots: NewerCloudSlot[];
  lastCheckedTime: string | null;
  message: string;
}

const STORAGE_KEY_AUTO_SYNC_ENABLED = 'shinryoku_gdrive_auto_sync_enabled';

let currentSyncStatus: AutoSyncStatus = {
  state: 'idle',
  newerSlots: [],
  lastCheckedTime: null,
  message: ''
};

const listeners: Array<(status: AutoSyncStatus) => void> = [];

const notifyStatus = (status: AutoSyncStatus) => {
  currentSyncStatus = { ...status };
  listeners.forEach(fn => {
    try {
      fn(currentSyncStatus);
    } catch (e) {
      console.warn('자동 동기화 리스너 오류:', e);
    }
  });

  if (typeof window !== 'undefined') {
    try {
      window.dispatchEvent(new CustomEvent('shinryoku_auto_sync_change', {
        detail: currentSyncStatus
      }));
    } catch {}
  }
};

/**
 * 자동 불러오기/동기화 설정 활성화 여부 (기본값: 참)
 */
export const isAutoSyncEnabled = (): boolean => {
  try {
    const val = localStorage.getItem(STORAGE_KEY_AUTO_SYNC_ENABLED);
    return val === null ? true : val === 'true';
  } catch {
    return true;
  }
};

/**
 * 자동 불러오기/동기화 설정 변경
 */
export const setAutoSyncEnabled = (enabled: boolean): void => {
  try {
    localStorage.setItem(STORAGE_KEY_AUTO_SYNC_ENABLED, enabled ? 'true' : 'false');
  } catch {}
  notifyStatus({
    ...currentSyncStatus,
    message: enabled ? '세이브 자동 불러오기가 활성화되었습니다.' : '세이브 자동 불러오기가 비활성화되었습니다.'
  });
};

/**
 * 상태 구독
 */
export const subscribeAutoSyncStatus = (
  callback: (status: AutoSyncStatus) => void
): (() => void) => {
  listeners.push(callback);
  callback(currentSyncStatus);
  return () => {
    const idx = listeners.indexOf(callback);
    if (idx !== -1) listeners.splice(idx, 1);
  };
};

export const getAutoSyncStatus = (): AutoSyncStatus => {
  return { ...currentSyncStatus };
};

let lastCheckTimestamp = 0;
let isCheckingOrSyncing = false;

/**
 * 비동기 초경량 메타데이터 비교 및 스마트 동기화 실행
 */
export const performLightweightAutoSyncCheck = (options?: { forceDownload?: boolean; silent?: boolean }): void => {
  const now = Date.now();
  if (now - lastCheckTimestamp < 3000 && !options?.forceDownload) {
    return;
  }
  if (isCheckingOrSyncing) {
    return;
  }

  setTimeout(async () => {
    try {
      isCheckingOrSyncing = true;
      lastCheckTimestamp = Date.now();

      const token = await getValidDriveAccessToken();
      const currentUser = getCurrentDriveUser();
      if (!token || !currentUser) {
        isCheckingOrSyncing = false;
        return;
      }

      if (!options?.silent) {
        notifyStatus({
          ...currentSyncStatus,
          state: 'checking',
          message: '클라우드 세이브 메타데이터 조회 중...'
        });
      }

      // 1. 초경량 메타데이터(목록 및 수정 시각) 0.1초 조회
      const cloudMetaList = await getDriveSavesMetaList(token);
      if (!cloudMetaList || Object.keys(cloudMetaList).length === 0) {
        notifyStatus({
          state: 'idle',
          newerSlots: [],
          lastCheckedTime: new Date().toLocaleTimeString('ko-KR'),
          message: ''
        });
        isCheckingOrSyncing = false;
        return;
      }

      // 2. 로컬 슬롯 타임스탬프 수집 및 비교
      const newerSlots: NewerCloudSlot[] = [];

      for (let slotNum = 1; slotNum <= 10; slotNum++) {
        const cloudSlot = cloudMetaList[slotNum];
        if (!cloudSlot) continue;

        const key = getSaveSlotKey(slotNum);
        const localData = await GameStorage.get(key);

        let isNewer = false;
        let localTimeStr: string | null = null;

        if (!localData) {
          isNewer = true;
        } else {
          localTimeStr = localData.timestamp || null;
          if (cloudSlot.rawIsoTime && localData.timestamp) {
            const cloudDate = new Date(cloudSlot.rawIsoTime).getTime();
            const localDate = new Date(localData.timestamp).getTime();
            if (!isNaN(cloudDate) && !isNaN(localDate)) {
              if (cloudDate > localDate + 2000) {
                isNewer = true;
              }
            } else if (cloudSlot.timestamp !== localData.timestamp) {
              isNewer = true;
            }
          } else if (cloudSlot.timestamp !== localData.timestamp) {
            isNewer = true;
          }
        }

        if (isNewer) {
          newerSlots.push({
            slotNum,
            cloudTime: cloudSlot.timestamp,
            localTime: localTimeStr
          });
        }
      }

      if (newerSlots.length === 0) {
        notifyStatus({
          state: 'idle',
          newerSlots: [],
          lastCheckedTime: new Date().toLocaleTimeString('ko-KR'),
          message: ''
        });
        isCheckingOrSyncing = false;
        return;
      }

      // 3. 자동 동기화 옵션 확인 후 선택적 스마트 다운로드 실행
      const autoSyncEnabled = isAutoSyncEnabled();
      if (autoSyncEnabled || options?.forceDownload) {
        notifyStatus({
          state: 'syncing',
          newerSlots,
          lastCheckedTime: new Date().toLocaleTimeString('ko-KR'),
          message: `최신 클라우드 세이브 ${newerSlots.length}개를 백그라운드 동기화 중...`
        });

        const syncedSlotNums: number[] = [];
        for (const target of newerSlots) {
          try {
            const payload = await downloadSaveFromDrive(target.slotNum, token);
            if (payload) {
              const decompressed = await decompressData(payload.compressedData);
              const completeData = {
                ...decompressed,
                timestamp: payload.timestamp || decompressed.timestamp || new Date().toISOString(),
                character: decompressed.character,
                messages: Array.isArray(decompressed.messages) ? decompressed.messages : [],
                choices: Array.isArray(decompressed.choices) ? decompressed.choices : [],
                sceneType: decompressed.sceneType || 'normal'
              };
              const sanitized = optimizeSaveData(completeData);
              await GameStorage.set(getSaveSlotKey(target.slotNum), sanitized);
              syncedSlotNums.push(target.slotNum);
            }
          } catch (slotErr) {
            console.warn(`슬롯 ${target.slotNum} 자동 복원 실패:`, slotErr);
          }
        }

        if (syncedSlotNums.length > 0) {
          notifyStatus({
            state: 'success',
            newerSlots: [],
            lastCheckedTime: new Date().toLocaleTimeString('ko-KR'),
            message: `클라우드의 최신 세이브(슬롯 ${syncedSlotNums.join(', ')})를 로컬 슬롯에 성공적으로 자동 동기화했습니다.`
          });

          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('shinryoku_save_slots_updated'));
          }

          setTimeout(() => {
            if (currentSyncStatus.state === 'success') {
              notifyStatus({ ...currentSyncStatus, state: 'idle', message: '' });
            }
          }, 5000);
        } else {
          notifyStatus({
            state: 'idle',
            newerSlots,
            lastCheckedTime: new Date().toLocaleTimeString('ko-KR'),
            message: ''
          });
        }
      } else {
        notifyStatus({
          state: 'has_newer',
          newerSlots,
          lastCheckedTime: new Date().toLocaleTimeString('ko-KR'),
          message: `클라우드에 더 최신 세이브(${newerSlots.map(s => `슬롯 ${s.slotNum}`).join(', ')})가 존재합니다.`
        });
      }

    } catch (err) {
      console.warn('초경량 자동 동기화 확인 실패:', err);
      notifyStatus({
        state: 'error',
        newerSlots: [],
        lastCheckedTime: new Date().toLocaleTimeString('ko-KR'),
        message: '클라우드 메타데이터 조회 중 오류가 발생했습니다.'
      });
    } finally {
      isCheckingOrSyncing = false;
    }
  }, 100);
};
