/**
 * 구글 드라이브 비동기 배경 자동 백업 서비스
 * 
 * 특징:
 * 1. 렉 없는 비동기 배경 백업: 세이브 시 메인 화면과 게임 플레이를 전혀 지연시키지 않고 독립적으로 구글 드라이브에 업로드합니다.
 * 2. 자동 토큰 갱신: 백그라운드에서 토큰 만료 여부를 점검하고 유효한 세션을 유지합니다.
 * 3. 한 번 로그인으로 자동 동기화: 사용자가 별도로 클라우드 버튼을 누르지 않아도 슬롯 저장 시 자동으로 안전 백업됩니다.
 */

import { GameStorage } from '../storage';
import { getSaveSlotKey, optimizeSaveData, compressData } from '../utils';
import { 
  uploadSaveToDrive, 
  getValidDriveAccessToken, 
  invalidateDriveAccessToken,
  getCurrentDriveUser,
  uploadMissingImagesToDrive
} from './googleDriveService';
import { isSupabaseConfigured } from './supabaseClient';
import { uploadLightSaveToSupabase } from './supabaseSaveService';
import { extractImagesFromSaveData } from './imageAssetSplitService';

export interface AutoBackupStatus {
  state: 'idle' | 'syncing' | 'success' | 'error';
  lastSlot: number | null;
  lastTime: string | null;
  message: string;
}

const STORAGE_KEY_AUTO_BACKUP_ENABLED = 'shinryoku_gdrive_auto_backup_enabled';
const STORAGE_KEY_LAST_BACKUP_INFO = 'shinryoku_gdrive_last_backup_info';

// 현재 상태 메모리 캐시
let currentStatus: AutoBackupStatus = {
  state: 'idle',
  lastSlot: null,
  lastTime: null,
  message: ''
};

// 초기 저장된 마지막 백업 정보 복원
try {
  const savedInfo = localStorage.getItem(STORAGE_KEY_LAST_BACKUP_INFO);
  if (savedInfo) {
    const parsed = JSON.parse(savedInfo);
    currentStatus.lastSlot = parsed.lastSlot || null;
    currentStatus.lastTime = parsed.lastTime || null;
  }
} catch {}

const listeners: Array<(status: AutoBackupStatus) => void> = [];

const notifyStatus = (status: AutoBackupStatus) => {
  currentStatus = { ...status };
  listeners.forEach(fn => {
    try {
      fn(currentStatus);
    } catch (e) {
      console.warn('자동 백업 리스너 호출 오류:', e);
    }
  });

  // 전역 알림 커스텀 이벤트 발송 (필요 시 UI에서 수신 가능)
  if (typeof window !== 'undefined') {
    try {
      window.dispatchEvent(new CustomEvent('shinryoku_auto_backup_change', {
        detail: currentStatus
      }));
    } catch {}
  }
};

/**
 * 세이브 시 자동 백업 기능 활성화 여부 조회 (기본값: 참)
 */
export const isAutoBackupEnabled = (): boolean => {
  try {
    const val = localStorage.getItem(STORAGE_KEY_AUTO_BACKUP_ENABLED);
    return val === null ? true : val === 'true';
  } catch {
    return true;
  }
};

/**
 * 세이브 시 자동 백업 기능 켜기/끄기 설정
 */
export const setAutoBackupEnabled = (enabled: boolean): void => {
  try {
    localStorage.setItem(STORAGE_KEY_AUTO_BACKUP_ENABLED, enabled ? 'true' : 'false');
  } catch {}
  notifyStatus({
    ...currentStatus,
    message: enabled ? '세이브 시 자동 백업이 활성화되었습니다.' : '세이브 시 자동 백업이 비활성화되었습니다.'
  });
};

/**
 * 자동 백업 상태 구독
 */
export const subscribeAutoBackupStatus = (
  callback: (status: AutoBackupStatus) => void
): (() => void) => {
  listeners.push(callback);
  callback(currentStatus);
  return () => {
    const idx = listeners.indexOf(callback);
    if (idx !== -1) listeners.splice(idx, 1);
  };
};

/**
 * 현재 자동 백업 상태 반환
 */
export const getAutoBackupStatus = (): AutoBackupStatus => {
  return { ...currentStatus };
};

// 진행 중인 백그라운드 작업 중복 방지 플래그 및 대기 큐 (최신 1건만 유지)
let isBackupRunning = false;
let pendingBackup: { slotNum: number; preloadedData?: any } | null = null;

const withTimeout = <T,>(promise: Promise<T>, ms: number, label: string): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`${label} 시간 초과`)), ms))
  ]);
};

const runBackupTask = async (slotNum: number, preloadedData?: any): Promise<void> => {
  isBackupRunning = true;

  try {
    const currentUser = getCurrentDriveUser();
    const useSupabase = isSupabaseConfigured();

    // Google Drive 토큰 확인 (Supabase 사용 시 토큰 지연으로 본 백업이 막히지 않도록 5초 타임아웃)
    const token = useSupabase
      ? await withTimeout(getValidDriveAccessToken(), 5000, '드라이브 토큰 확인').catch(() => null)
      : await getValidDriveAccessToken();

    // 로그인 계정이 연동되어 있지 않거나(Supabase 미설정 + Drive 토큰 없음)면 조용히 건너뜁니다
    if (!currentUser || (!useSupabase && !token)) {
      return;
    }

    notifyStatus({
      state: 'syncing',
      lastSlot: slotNum,
      lastTime: currentStatus.lastTime,
      message: `슬롯 ${slotNum}의 여정을 계정에 안전하게 동기화하고 있습니다...`
    });

    // 2. 저장 데이터 확보 (선제 데이터가 없으면 로컬 스토리지에서 비동기 조회)
    let targetData = preloadedData;
    if (!targetData) {
      await new Promise(res => setTimeout(res, 200));
      const key = getSaveSlotKey(slotNum);
      targetData = await GameStorage.get(key);
    }

    if (!targetData) {
      throw new Error('백업할 슬롯 데이터를 찾을 수 없습니다.');
    }

    // 3. 데이터 최적화 및 하이브리드 / 레거시 업로드 실행
    const sanitized = optimizeSaveData(targetData);

    if (useSupabase) {
      const { lightData, images } = await extractImagesFromSaveData(sanitized);
      const compressedLight = await compressData(lightData);

      // 3-1. 계정(Supabase) 경량 세이브를 먼저 업로드 (12초 타임아웃)하여 즉시 계정 연동 완료
      await withTimeout(
        uploadLightSaveToSupabase(currentUser.uid, slotNum, compressedLight, {
          characterName: targetData.character?.name || '이름 없음',
          level: targetData.character?.level || 1
        }),
        12000,
        '계정 세이브 동기화'
      );

      // 3-2. 이미지 데이터는 변동(신규 추가)이 있는 경우에만 Google Drive에 업로드 (15초 타임아웃, 실패해도 계정 세이브 유지)
      if (images.length > 0 && token) {
        await withTimeout(
          uploadMissingImagesToDrive(images, token),
          15000,
          '신규 이미지 드라이브 백업'
        ).catch(err => {
          console.warn('[배경 백업] 신규 이미지 Google Drive 업로드 스킵/지연:', err);
        });
      }
    } else {
      const compressed = await compressData(sanitized);
      try {
        await withTimeout(uploadSaveToDrive(slotNum, compressed, token!), 20000, '드라이브 백업');
      } catch (uploadError: any) {
        const errMsg = String(uploadError?.message || '');
        if (errMsg.includes('401') || errMsg.includes('인증') || errMsg.includes('토큰')) {
          invalidateDriveAccessToken();
          const refreshedToken = await getValidDriveAccessToken();
          if (refreshedToken) {
            await withTimeout(uploadSaveToDrive(slotNum, compressed, refreshedToken), 20000, '드라이브 재백업');
          } else {
            throw uploadError;
          }
        } else {
          throw uploadError;
        }
      }
    }

    // 5. 성공 처리
    const now = new Date();
    const formattedTime = now.toLocaleString('ko-KR', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });

    try {
      localStorage.setItem(STORAGE_KEY_LAST_BACKUP_INFO, JSON.stringify({
        lastSlot: slotNum,
        lastTime: formattedTime
      }));
    } catch {}

    notifyStatus({
      state: 'success',
      lastSlot: slotNum,
      lastTime: formattedTime,
      message: useSupabase
        ? `슬롯 ${slotNum}이 계정 클라우드에 안전하게 자동 백업되었습니다.`
        : `슬롯 ${slotNum}이 구글 드라이브에 안전하게 자동 백업되었습니다.`
    });

    // 4초 후 상태를 평온한 대기(idle)로 전환
    setTimeout(() => {
      if (currentStatus.state === 'success') {
        notifyStatus({
          ...currentStatus,
          state: 'idle',
          message: ''
        });
      }
    }, 4000);

  } catch (err: any) {
    console.warn('[배경 백업] 자동 백업 처리 중 일시적인 오류 발생 (로컬 세이브는 안전하게 보존됨):', err);
    notifyStatus({
      state: 'error',
      lastSlot: slotNum,
      lastTime: currentStatus.lastTime,
      message: '클라우드 동기화 중 일시적 오류가 발생했습니다. 로컬 기기 저장은 안전합니다.'
    });

    // 5초 후 에러 메시지 정리
    setTimeout(() => {
      if (currentStatus.state === 'error') {
        notifyStatus({
          ...currentStatus,
          state: 'idle',
          message: ''
        });
      }
    }, 5000);
  } finally {
    isBackupRunning = false;
    if (pendingBackup) {
      const next = pendingBackup;
      pendingBackup = null;
      setTimeout(() => {
        runBackupTask(next.slotNum, next.preloadedData);
      }, 100);
    }
  }
};

/**
 * 비동기 배경 백업 실행 (세이브 슬롯 저장 시 호출)
 * 메인 스레드를 차단하지 않고 완전히 비동기 배경(Background)에서 작동합니다.
 */
export const triggerSaveAutoBackup = (slotNum: number, preloadedData?: any): void => {
  // 자동 백업 기능이 비활성화되어 있으면 즉시 종료
  if (!isAutoBackupEnabled()) {
    return;
  }

  // 자동 저장 슬롯(0번)은 제외 (수동 슬롯 1~10번만 백업)
  if (slotNum <= 0) {
    return;
  }

  // 이미 백업 실행 중이면 중복 실행하지 않고 최신 1건만 대기 큐에 등록
  if (isBackupRunning) {
    pendingBackup = { slotNum, preloadedData };
    return;
  }

  // 완전 비동기로 즉시 분기 (호출자의 다음 로직 및 UI 렌더링에 0.1ms의 지연도 주지 않음)
  setTimeout(() => {
    if (isBackupRunning) {
      pendingBackup = { slotNum, preloadedData };
      return;
    }
    runBackupTask(slotNum, preloadedData);
  }, 50);
};
