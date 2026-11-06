
import { doc, setDoc, getDocs, collection, getDoc, deleteDoc, Bytes, query, where, DocumentData } from 'firebase/firestore';
import { auth, db } from './services/firebase';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

const DB_NAME = 'ShinryokuRPG_DB';
const STORE_NAME = 'Saves';
const DB_VERSION = 1;

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, timeoutMsg: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(timeoutMsg)), timeoutMs))
  ]);
}

export class GameStorage {
    private static db: IDBDatabase | null = null;
    public static cloudInfoCache: Record<number, { timestamp: string }> | null = null;
    public static isQuotaExceeded: boolean = typeof sessionStorage !== 'undefined' && sessionStorage.getItem('firestore_quota_exceeded') === 'true';

    public static markQuotaExceeded(): void {
      GameStorage.isQuotaExceeded = true;
      if (typeof sessionStorage !== 'undefined') {
        try {
          sessionStorage.setItem('firestore_quota_exceeded', 'true');
        } catch (_) {}
      }
    }

    private static async getDB(): Promise<IDBDatabase> {
        if (this.db) return this.db;

        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve(request.result);
            };

            request.onupgradeneeded = (event) => {
                const db = (event.target as IDBOpenDBRequest).result;
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    db.createObjectStore(STORE_NAME);
                }
            };
        });
    }

    private static pendingWrites = new Map<string, { value: any; resolvers: Array<{ resolve: () => void; reject: (err: any) => void }>; timer: any }>();

    static async set(key: string, value: any, immediate: boolean = false): Promise<void> {
        // 즉시 저장이 요청된 경우 대기 중인 쓰기를 취소하고 즉시 실행
        if (immediate) {
            const existing = this.pendingWrites.get(key);
            if (existing) {
                clearTimeout(existing.timer);
                this.pendingWrites.delete(key);
            }
            const db = await this.getDB();
            return new Promise((resolve, reject) => {
                const transaction = db.transaction(STORE_NAME, 'readwrite');
                const store = transaction.objectStore(STORE_NAME);
                const request = store.put(value, key);
                request.onsuccess = () => {
                    if (existing) existing.resolvers.forEach(r => r.resolve());
                    resolve();
                };
                request.onerror = (err) => {
                    if (existing) existing.resolvers.forEach(r => r.reject(err));
                    reject(request.error);
                };
            });
        }

        // 연속 저장 호출(자동 세이브 등) 디바운싱: 350ms 대기 후 1회 I/O 커밋
        return new Promise((resolve, reject) => {
            const existing = this.pendingWrites.get(key);
            if (existing) {
                clearTimeout(existing.timer);
                existing.value = value;
                existing.resolvers.push({ resolve, reject });
                existing.timer = setTimeout(() => this.commitPendingWrite(key), 350);
            } else {
                const timer = setTimeout(() => this.commitPendingWrite(key), 350);
                this.pendingWrites.set(key, {
                    value,
                    resolvers: [{ resolve, reject }],
                    timer
                });
            }
        });
    }

    private static async commitPendingWrite(key: string): Promise<void> {
        const item = this.pendingWrites.get(key);
        if (!item) return;
        this.pendingWrites.delete(key);

        try {
            const db = await this.getDB();
            const transaction = db.transaction(STORE_NAME, 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.put(item.value, key);
            request.onsuccess = () => {
                item.resolvers.forEach(r => r.resolve());
            };
            request.onerror = () => {
                item.resolvers.forEach(r => r.reject(request.error));
            };
        } catch (err) {
            item.resolvers.forEach(r => r.reject(err));
        }
    }

    static async get(key: string): Promise<any> {
        // 아직 디스크에 커밋되지 않은 메모리 상의 최신 데이터가 있다면 우선 반환
        if (this.pendingWrites.has(key)) {
            return this.pendingWrites.get(key)!.value;
        }

        const db = await this.getDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(STORE_NAME, 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.get(key);
            request.onsuccess = () => {
                const res = request.result;
                if (res && typeof res === 'object' && res.character) {
                    if (!Array.isArray(res.messages)) res.messages = [];
                    if (!Array.isArray(res.choices)) res.choices = [];
                    if (!res.sceneType) res.sceneType = 'normal';
                }
                resolve(res);
            };
            request.onerror = () => reject(request.error);
        });
    }

    static async delete(key: string): Promise<void> {
        const db = await this.getDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(STORE_NAME, 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.delete(key);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    static async keys(): Promise<string[]> {
        const db = await this.getDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(STORE_NAME, 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.getAllKeys();
            request.onsuccess = () => resolve(request.result as string[]);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * 기존 LocalStorage 데이터를 IndexedDB로 자동 마이그레이션
     */
    static async migrateFromLocalStorage(prefix: string): Promise<void> {
        const slots = [1, 2, 3];
        let migrated = false;

        for (const num of slots) {
            const key = `${prefix}_save_${num}`;
            const localData = localStorage.getItem(key);
            if (localData) {
                try {
                    const parsed = JSON.parse(localData);
                    await this.set(key, parsed);
                    localStorage.removeItem(key);
                    migrated = true;
                    console.log(`Migrated slot ${num} to IndexedDB`);
                } catch (e) {
                    console.error(`Migration failed for slot ${num}`, e);
                }
            }
        }
        
        if (migrated) {
      console.log("Migration from LocalStorage to IndexedDB complete.");
    }
  }

  /**
   * [INTERNAL] 개별 슬롯의 청크 데이터 업로드 헬퍼
   */
  private static async uploadSlotChunks(userUid: string, slotNum: number, compressedData: string, nowIso: string): Promise<number> {
    const uint8 = new TextEncoder().encode(compressedData);
    const totalBytes = uint8.length;
    
    let version = 'v3';
    if (compressedData.startsWith('v3:')) version = 'v3';
    else if (compressedData.startsWith('v2:')) version = 'v2';
    else if (compressedData.startsWith('LZ:')) version = 'LZ';
    else version = 'raw';
    
    const CHUNK_SIZE = 800 * 1024; 
    const chunks: Uint8Array[] = [];
    for (let i = 0; i < totalBytes; i += CHUNK_SIZE) {
      const end = Math.min(i + CHUNK_SIZE, totalBytes);
      chunks.push(uint8.slice(i, end));
    }

    const chunkPromises = chunks.map((chunk, i) => {
      const partId = i === 0 ? slotNum.toString() : `${slotNum}_part${i}`;
      const slotRef = doc(db, 'users', userUid, 'saves', partId);
      
      const writePromise = setDoc(slotRef, {
        blob: Bytes.fromUint8Array(chunk),
        timestamp: nowIso,
        isChunk: true,
        chunkIndex: i,
        totalChunks: chunks.length,
        slotId: slotNum,
        version: version
      });

      return withTimeout(writePromise, 6000, "파이어베이스 일일 무료 쓰기 한도 초과로 응답이 지연되었습니다");
    });

    await Promise.all(chunkPromises);

    // 구형 잔여 조각 정리 (단일 청크일 경우 part1, part2가 혹시 존재했다면 조용히 삭제)
    if (chunks.length === 1) {
      const p1 = doc(db, 'users', userUid, 'saves', `${slotNum}_part1`);
      const p2 = doc(db, 'users', userUid, 'saves', `${slotNum}_part2`);
      deleteDoc(p1).catch(() => {});
      deleteDoc(p2).catch(() => {});
    }

    return chunks.length;
  }

  /**
   * [NEW] 클라우드 세이브 (Firebase) - 데이터 분할 저장 및 초고속 업로드
   */
  static async pushToCloud(slotNum: number, compressedData: string): Promise<void> {
    const user = auth.currentUser;
    if (!user) throw new Error("로그인이 필요합니다.");

    if (GameStorage.isQuotaExceeded) {
      throw new Error("파이어베이스 일일 무료 쓰기 한도(20,000건/일)를 모두 소진하여 클라우드 백업이 불가능합니다. '세이브 코드' 복사나 로컬 저장을 이용해주세요.");
    }

    try {
      const nowIso = new Date().toISOString();
      await this.uploadSlotChunks(user.uid, slotNum, compressedData, nowIso);

      // 캐시 및 프로필 메타데이터 즉시 업데이트 (재조회 불필요)
      const existingInfo = { ...(this.cloudInfoCache || {}) };
      existingInfo[slotNum] = { timestamp: nowIso };
      this.cloudInfoCache = existingInfo;

      const userRef = doc(db, 'users', user.uid);
      try {
        const updateProfilePromise = setDoc(userRef, {
          lastSaveAt: nowIso,
          nickname: user.displayName || user.email?.split('@')[0] || 'Unknown',
          cloudSlotsInfo: existingInfo
        }, { merge: true });
        await withTimeout(updateProfilePromise, 4000, "프로필 동기화 시간 초과");
      } catch (err: any) {
        console.warn("[Cloud] User profile update skipped or timed out", err);
      }
    } catch (e: any) {
      console.error("[Cloud] Cloud save failed", e);
      const errMsg = e?.message || String(e);
      if (errMsg.includes('Quota') || errMsg.includes('resource-exhausted') || errMsg.includes('Free daily') || errMsg.includes('초과')) {
        GameStorage.markQuotaExceeded();
        throw new Error("파이어베이스 일일 무료 쓰기 한도(20,000건/일)를 초과하여 클라우드 저장이 제한되었습니다. (세이브 코드 내보내기 및 로컬 저장은 100% 정상 작동합니다)");
      }
      if (e.message && e.message.startsWith('{') && e.message.endsWith('}')) {
        throw e;
      }
      throw new Error(`백업 실패: ${e.message || '알 수 없는 오류'}`);
    }
  }

  /**
   * [NEW] 모든 로컬 데이터를 클라우드로 백업 (일괄 비동기 병렬 처리)
   */
  static async pushAllToCloud(compressedSlots: (string | null)[]): Promise<number> {
    const user = auth.currentUser;
    if (!user) throw new Error("로그인이 필요합니다.");

    if (GameStorage.isQuotaExceeded) {
      throw new Error("파이어베이스 일일 무료 쓰기 한도(20,000건/일)를 모두 소진하여 클라우드 백업이 불가능합니다. '세이브 코드' 복사나 로컬 저장을 이용해주세요.");
    }

    try {
      const nowIso = new Date().toISOString();
      const backupPromises: Promise<any>[] = [];
      const updatedInfo = { ...(this.cloudInfoCache || {}) };
      let count = 0;

      for (let i = 0; i < compressedSlots.length; i++) {
        const payload = compressedSlots[i];
        if (payload) {
          const slotNum = i + 1;
          backupPromises.push(this.uploadSlotChunks(user.uid, slotNum, payload, nowIso));
          updatedInfo[slotNum] = { timestamp: nowIso };
          count++;
        }
      }

      await Promise.all(backupPromises);

      // 모든 슬롯 업로드 후 메타데이터를 단 1회의 Firestore 쓰기로 갱신
      this.cloudInfoCache = updatedInfo;
      const userRef = doc(db, 'users', user.uid);
      try {
        const updateProfilePromise = setDoc(userRef, {
          lastSaveAt: nowIso,
          nickname: user.displayName || user.email?.split('@')[0] || 'Unknown',
          cloudSlotsInfo: updatedInfo
        }, { merge: true });
        await withTimeout(updateProfilePromise, 4000, "프로필 동기화 시간 초과");
      } catch (err: any) {
        console.warn("[Cloud] Profile batch update skipped", err);
      }

      return count;
    } catch (e: any) {
      console.error("[Cloud] Cloud all backup failed", e);
      const errMsg = e?.message || String(e);
      if (errMsg.includes('Quota') || errMsg.includes('resource-exhausted') || errMsg.includes('Free daily') || errMsg.includes('초과')) {
        GameStorage.markQuotaExceeded();
        throw new Error("파이어베이스 일일 무료 쓰기 한도(20,000건/일)를 초과하여 클라우드 저장이 제한되었습니다. (세이브 코드 내보내기 및 로컬 저장은 100% 정상 작동합니다)");
      }
      throw e;
    }
  }

  /**
   * [NEW] 클라우드 전체 데이터 불러오기 - 조각 병합(Merge) 적용
   */
  static async pullAllFromCloud(): Promise<Record<number, any>> {
    const user = auth.currentUser;
    if (!user) throw new Error("로그인이 필요합니다.");

    try {
      console.log(`[Cloud] Pulling all chunks for user ${user.uid}...`);
      const savesRef = collection(db, 'users', user.uid, 'saves');
      const snapshot = await getDocs(savesRef);
      
      // 1. 조각들을 슬롯별로 그룹화
      const slotGroups: Record<number, any[]> = {};
      
      snapshot.forEach(doc => {
        const data = doc.data();
        const idStr = doc.id;
        
        // 슬롯 번호 추출 (예: "1", "1_part2" -> 1)
        const mainSlotId = parseInt(idStr.split('_')[0]);
        if (!slotGroups[mainSlotId]) slotGroups[mainSlotId] = [];
        
        slotGroups[mainSlotId].push({
            id: idStr,
            ...data
        });
      });

      const finalResults: Record<number, any> = {};

      // 2. 슬롯별로 조각들 병합
      for (const [slotId, rawChunkList] of Object.entries(slotGroups)) {
        const numericSlotId = parseInt(slotId);
        
        // 조각 데이터가 아닌 구형 데이터인 경우
        if (rawChunkList.length === 1 && !rawChunkList[0].isChunk) {
            finalResults[numericSlotId] = rawChunkList[0];
            continue;
        }

        // 메인 청크 기준 최신 타임스탬프 및 총 청크 수 추출
        const primaryChunk = rawChunkList.find(c => c.chunkIndex === 0 || c.id === slotId) || rawChunkList[0];
        const targetTimestamp = primaryChunk.timestamp;
        const totalExpected = primaryChunk.totalChunks || rawChunkList.length;

        // 과거 잔존 청크 필터링
        const chunkList = rawChunkList.filter(c => {
          if (c.totalChunks && c.totalChunks !== totalExpected) return false;
          if (targetTimestamp && c.timestamp && c.timestamp !== targetTimestamp) return false;
          if (typeof c.chunkIndex === 'number' && c.chunkIndex >= totalExpected) return false;
          return true;
        });

        // 인덱스 순서대로 정렬
        chunkList.sort((a, b) => (a.chunkIndex || 0) - (b.chunkIndex || 0));

        // 바이너리 데이터 합치기
        let totalSize = 0;
        chunkList.forEach(c => {
          if (c.blob instanceof Bytes) {
            totalSize += c.blob.toUint8Array().length;
          } else if (c.blob && c.blob.length) {
            totalSize += c.blob.length;
          }
        });
        
        const mergedArray = new Uint8Array(totalSize);
        let offset = 0;
        chunkList.forEach(c => {
          if (c.blob instanceof Bytes) {
            const bytes = c.blob.toUint8Array();
            mergedArray.set(bytes, offset);
            offset += bytes.length;
          } else if (c.blob) {
            mergedArray.set(c.blob, offset);
            offset += c.blob.length;
          }
        });

        // 결과 객체 생성 (기존 pull 로직과 호환되도록 구성)
        finalResults[numericSlotId] = {
            isBinary: true,
            isCompressed: true, // 호환성용
            blob: mergedArray,
            version: primaryChunk.version || 'LZ',
            timestamp: primaryChunk.timestamp
        };
      }

      console.log(`[Cloud] Pull & Merge complete. Restored ${Object.keys(finalResults).length} slots.`);
      return finalResults;
    } catch (e: any) {
      console.error("[Cloud] Cloud pull failed", e);
      throw e;
    }
  }

  /**
   * [NEW] 특정 클라우드 슬롯 데이터만 불러오기
   */
  static async pullFromCloud(slotNum: number): Promise<any> {
    const user = auth.currentUser;
    if (!user) throw new Error("로그인이 필요합니다.");

    try {
      console.log(`[Cloud] Pulling chunks for slot ${slotNum}, user ${user.uid}...`);
      const savesRef = collection(db, 'users', user.uid, 'saves');
      const q = query(savesRef, where('slotId', '==', slotNum));
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) return null;

      let chunkList: any[] = [];
      snapshot.forEach(doc => {
        chunkList.push({ id: doc.id, ...(doc.data() as DocumentData) });
      });

      // 조각 데이터가 아닌 구형 데이터인 경우 (isChunk가 없거나 False)
      if (chunkList.length === 1 && !chunkList[0].isChunk) {
          return chunkList[0];
      }

      // 메인 청크 기준 최신 타임스탬프 및 총 청크 수 추출
      const primaryChunk = chunkList.find(c => c.chunkIndex === 0 || c.id === slotNum.toString()) || chunkList[0];
      const targetTimestamp = primaryChunk.timestamp;
      const totalExpected = primaryChunk.totalChunks || chunkList.length;

      // 과거 잔여 청크 필터링
      chunkList = chunkList.filter(c => {
        if (c.totalChunks && c.totalChunks !== totalExpected) return false;
        if (targetTimestamp && c.timestamp && c.timestamp !== targetTimestamp) return false;
        if (typeof c.chunkIndex === 'number' && c.chunkIndex >= totalExpected) return false;
        return true;
      });

      // 인덱스 순서대로 정렬
      chunkList.sort((a, b) => (a.chunkIndex || 0) - (b.chunkIndex || 0));

      // 바이너리 데이터 합치기
      let totalSize = 0;
      chunkList.forEach(c => {
        if (c.blob instanceof Bytes) {
          totalSize += c.blob.toUint8Array().length;
        } else if (c.blob && c.blob.length) {
          totalSize += c.blob.length;
        }
      });
      
      const mergedArray = new Uint8Array(totalSize);
      let offset = 0;
      chunkList.forEach(c => {
        if (c.blob instanceof Bytes) {
          const bytes = c.blob.toUint8Array();
          mergedArray.set(bytes, offset);
          offset += bytes.length;
        } else if (c.blob) {
          mergedArray.set(c.blob, offset);
          offset += c.blob.length;
        }
      });

      return {
          isBinary: true,
          isCompressed: true,
          blob: mergedArray,
          version: primaryChunk.version || 'LZ',
          timestamp: primaryChunk.timestamp
      };
    } catch (e: any) {
      console.error("[Cloud] Single slot pull failed", e);
      throw e;
    }
  }

  /**
   * [NEW] 사용자의 클라우드 슬롯 메타데이터 목록 가져오기 (인메모리 캐시 & 쿼터 체크로 Firestore 호출 최소화)
   */
  static async getCloudSlotsInfo(forceRefresh: boolean = false): Promise<Record<number, { timestamp: string }>> {
    const user = auth.currentUser;
    if (!user) return {};

    // 쿼터 초과 상태이면 강제 요청이 아닌 이상 Firestore 호출 안함
    if (this.isQuotaExceeded && !forceRefresh) {
      return this.cloudInfoCache || {};
    }

    // 이미 캐시된 데이터가 있고 강제 새로고침이 아니면 캐시 즉시 반환 (자동 연속 조회 차단)
    if (!forceRefresh && this.cloudInfoCache !== null) {
      return this.cloudInfoCache;
    }

    try {
      // 1. 유저 프로필 요약 문서(1회 읽기)에서 먼저 슬롯 메타데이터 조회
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const userData = userSnap.data();
        if (userData?.cloudSlotsInfo && Object.keys(userData.cloudSlotsInfo).length > 0) {
          this.cloudInfoCache = userData.cloudSlotsInfo;
          return userData.cloudSlotsInfo;
        }
      }

      // 2. 캐시/요약 문서가 없을 경우에만 chunkIndex가 0인 메타 문서를 정밀 쿼리 (전체 읽기 방지)
      const savesRef = collection(db, 'users', user.uid, 'saves');
      const q = query(savesRef, where('chunkIndex', '==', 0));
      const snapshot = await getDocs(q);
      
      const info: Record<number, { timestamp: string }> = {};
      snapshot.forEach(docSnap => {
        const data = docSnap.data();
        const slotId = data.slotId || parseInt(docSnap.id.split('_')[0]);
        if (!info[slotId] || new Date(data.timestamp) > new Date(info[slotId].timestamp)) {
          info[slotId] = { timestamp: data.timestamp };
        }
      });

      // 3. 재검색 결과를 프로필 요약 문서에 갱신하여 다음번엔 1회 읽기만 실행되도록 함
      if (Object.keys(info).length > 0) {
        await setDoc(userRef, { cloudSlotsInfo: info }, { merge: true });
      }

      this.cloudInfoCache = info;
      return info;
    } catch (e: any) {
      const errMsg = e?.message || String(e);
      if (errMsg.includes('Quota exceeded') || errMsg.includes('resource-exhausted') || errMsg.includes('Free daily read units')) {
        this.isQuotaExceeded = true;
        console.warn("[Cloud Quota Exceeded] Daily Firestore read quota limit reached. Pausing automatic calls.");
      } else {
        console.error("Failed to get cloud info", e);
      }
      return this.cloudInfoCache || {};
    }
  }

  /**
   * [NEW] 클라우드 모든 데이터 초기화
   */
  static async clearAllCloudData(): Promise<void> {
    const user = auth.currentUser;
    if (!user) throw new Error("로그인이 필요합니다.");

    try {
      console.log(`[Cloud] Clearing all data for user ${user.uid}...`);
      const savesRef = collection(db, 'users', user.uid, 'saves');
      const snapshot = await getDocs(savesRef);
      
      const deletePromises = snapshot.docs.map(d => deleteDoc(d.ref));
      await Promise.all(deletePromises);

      // 마지막 세이브 기록 정보 및 슬롯 요약 초기화
      const userRef = doc(db, 'users', user.uid);
      await setDoc(userRef, {
        lastSaveAt: null,
        cloudSlotsInfo: {}
      }, { merge: true });

      console.log(`[Cloud] All cloud data cleared.`);
    } catch (e: any) {
      console.error("[Cloud] Cloud clear failed", e);
      throw e;
    }
  }
}
