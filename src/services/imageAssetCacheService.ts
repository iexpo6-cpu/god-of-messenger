/**
 * IndexedDB 기반 커스텀 이미지(Base64) 로컬 영구 캐시 서비스
 * - hash -> data:image/... 매핑을 캐싱하여 Google Drive 중복 다운로드를 방지합니다.
 */

const DB_NAME = 'shinryoku_image_cache';
const STORE_NAME = 'images';
const DB_VERSION = 1;

const memoryFallback = new Map<string, string>();
let dbPromise: Promise<IDBDatabase | null> | null = null;

const openImageCacheDB = (): Promise<IDBDatabase | null> => {
    if (typeof indexedDB === 'undefined') return Promise.resolve(null);
    if (dbPromise) return dbPromise;

    dbPromise = new Promise((resolve) => {
        try {
            const req = indexedDB.open(DB_NAME, DB_VERSION);
            req.onupgradeneeded = () => {
                const db = req.result;
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    db.createObjectStore(STORE_NAME);
                }
            };
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => resolve(null);
        } catch {
            resolve(null);
        }
    });
    return dbPromise;
};

export const getCachedImageByHash = async (hash: string): Promise<string | null> => {
    if (!hash) return null;
    if (memoryFallback.has(hash)) return memoryFallback.get(hash) || null;

    const db = await openImageCacheDB();
    if (!db) return null;

    return new Promise((resolve) => {
        try {
            const tx = db.transaction(STORE_NAME, 'readonly');
            const store = tx.objectStore(STORE_NAME);
            const req = store.get(hash);
            req.onsuccess = () => {
                const val = typeof req.result === 'string' ? req.result : null;
                if (val) memoryFallback.set(hash, val);
                resolve(val);
            };
            req.onerror = () => resolve(null);
        } catch {
            resolve(null);
        }
    });
};

export const setCachedImageByHash = async (hash: string, dataUrl: string): Promise<void> => {
    if (!hash || !dataUrl) return;
    memoryFallback.set(hash, dataUrl);

    const db = await openImageCacheDB();
    if (!db) return;

    return new Promise((resolve) => {
        try {
            const tx = db.transaction(STORE_NAME, 'readwrite');
            const store = tx.objectStore(STORE_NAME);
            store.put(dataUrl, hash);
            tx.oncomplete = () => resolve();
            tx.onerror = () => resolve();
        } catch {
            resolve();
        }
    });
};

export const getCachedImagesBatch = async (hashes: string[]): Promise<Record<string, string>> => {
    const result: Record<string, string> = {};
    if (!hashes.length) return result;

    await Promise.all(
        hashes.map(async (h) => {
            const found = await getCachedImageByHash(h);
            if (found) result[h] = found;
        })
    );
    return result;
};

export const setCachedImagesBatch = async (map: Record<string, string>): Promise<void> => {
    const entries = Object.entries(map);
    if (!entries.length) return;
    await Promise.all(entries.map(([h, v]) => setCachedImageByHash(h, v)));
};
