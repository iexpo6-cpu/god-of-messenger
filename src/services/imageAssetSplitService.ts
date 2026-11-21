/**
 * 세이브 데이터 내 Base64 이미지 분리 및 복원 엔진
 * - 30MB급 세이브 파일에서 용량의 95% 이상을 차지하는 Base64 이미지를 추출해
 *   해시 참조 키(imgref:<sha256>)로 치환합니다.
 */

import { getCachedImagesBatch, setCachedImagesBatch } from './imageAssetCacheService';
import { downloadImagesFromDrive } from './googleDriveService';

export const IMG_REF_PREFIX = 'imgref:';

export interface ExtractedImageAsset {
    hash: string;
    dataUrl: string;
}

const isExtractableBase64Image = (val: unknown): val is string => {
    return (
        typeof val === 'string' &&
        val.length > 128 &&
        (val.startsWith('data:image/') || val.startsWith('data:application/octet-stream'))
    );
};

// 인메모리 이미지 해시 & IndexedDB 기록 캐시 (매 저장마다 동일 이미지 재해시/재쓰기 방지)
const imageHashMemo = new Map<string, string>();
const indexedDbSavedHashes = new Set<string>();

export const computeImageHash = async (dataUrl: string): Promise<string> => {
    const memoized = imageHashMemo.get(dataUrl);
    if (memoized) return memoized;

    let result: string;
    // Web Crypto API (SHA-256)
    if (typeof crypto !== 'undefined' && crypto.subtle) {
        const encoder = new TextEncoder();
        const data = encoder.encode(dataUrl);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        result = hashArray.map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 32);
    } else {
        // Fallback FNV-1a + length
        let h1 = 0x811c9dc5;
        for (let i = 0; i < dataUrl.length; i++) {
            h1 ^= dataUrl.charCodeAt(i);
            h1 = Math.imul(h1, 0x01000193);
        }
        result = `fnv_${(h1 >>> 0).toString(16)}_${dataUrl.length}`;
    }

    if (imageHashMemo.size > 500) {
        imageHashMemo.clear();
    }
    imageHashMemo.set(dataUrl, result);
    return result;
};

export const extractImagesFromSaveData = async <T>(
    saveData: T
): Promise<{ lightData: T; images: ExtractedImageAsset[] }> => {
    const hashMap = new Map<string, string>(); // dataUrl -> hash
    const uniqueImages = new Map<string, string>(); // hash -> dataUrl

    // 1단계: 순회하며 고유한 Base64 이미지 수집 및 해시 계산
    const collectStrings = (node: unknown) => {
        if (!node) return;
        if (Array.isArray(node)) {
            for (let i = 0; i < node.length; i++) {
                const item = node[i];
                if (isExtractableBase64Image(item)) {
                    if (!hashMap.has(item)) hashMap.set(item, '');
                } else if (typeof item === 'object' && item !== null) {
                    collectStrings(item);
                }
            }
            return;
        }
        if (typeof node === 'object') {
            const obj = node as Record<string, unknown>;
            for (const key of Object.keys(obj)) {
                const val = obj[key];
                if (isExtractableBase64Image(val)) {
                    if (!hashMap.has(val)) hashMap.set(val, '');
                } else if (typeof val === 'object' && val !== null) {
                    collectStrings(val);
                }
            }
        }
    };

    collectStrings(saveData);

    await Promise.all(
        Array.from(hashMap.keys()).map(async (dataUrl) => {
            const hash = await computeImageHash(dataUrl);
            hashMap.set(dataUrl, hash);
            uniqueImages.set(hash, dataUrl);
        })
    );

    // 2단계: 트리 복제 및 imgref:<hash> 치환
    const replaceNode = (node: unknown): unknown => {
        if (!node) return node;
        if (Array.isArray(node)) {
            return node.map(item => {
                if (isExtractableBase64Image(item)) {
                    const hash = hashMap.get(item);
                    return hash ? `${IMG_REF_PREFIX}${hash}` : item;
                }
                if (typeof item === 'object' && item !== null) {
                    return replaceNode(item);
                }
                return item;
            });
        }
        if (typeof node === 'object') {
            const obj = node as Record<string, unknown>;
            const cloned: Record<string, unknown> = {};
            for (const key of Object.keys(obj)) {
                const val = obj[key];
                if (isExtractableBase64Image(val)) {
                    const hash = hashMap.get(val);
                    cloned[key] = hash ? `${IMG_REF_PREFIX}${hash}` : val;
                } else if (typeof val === 'object' && val !== null) {
                    cloned[key] = replaceNode(val);
                } else {
                    cloned[key] = val;
                }
            }
            return cloned;
        }
        return node;
    };

    const lightData = replaceNode(saveData) as T;
    const images: ExtractedImageAsset[] = Array.from(uniqueImages.entries()).map(([hash, dataUrl]) => ({
        hash,
        dataUrl
    }));

    // 로컬 IndexedDB 캐시에는 신규(미기록) 이미지만 선별 반영
    if (images.length > 0) {
        const cacheBatch: Record<string, string> = {};
        let newCount = 0;
        images.forEach(img => {
            if (!indexedDbSavedHashes.has(img.hash)) {
                cacheBatch[img.hash] = img.dataUrl;
                newCount++;
            }
        });
        if (newCount > 0) {
            await setCachedImagesBatch(cacheBatch);
            Object.keys(cacheBatch).forEach(h => indexedDbSavedHashes.add(h));
        }
    }

    return { lightData, images };
};

export const restoreImagesToSaveData = async <T>(
    lightData: T,
    googleAccessToken?: string | null,
    onProgress?: (done: number, total: number) => void
): Promise<{ restoredData: T; missingCount: number }> => {
    const neededHashes = new Set<string>();

    const collectRefs = (node: unknown) => {
        if (!node) return;
        if (Array.isArray(node)) {
            for (let i = 0; i < node.length; i++) {
                const item = node[i];
                if (typeof item === 'string' && item.startsWith(IMG_REF_PREFIX)) {
                    neededHashes.add(item.slice(IMG_REF_PREFIX.length));
                } else if (typeof item === 'object' && item !== null) {
                    collectRefs(item);
                }
            }
            return;
        }
        if (typeof node === 'object') {
            const obj = node as Record<string, unknown>;
            for (const key of Object.keys(obj)) {
                const val = obj[key];
                if (typeof val === 'string' && val.startsWith(IMG_REF_PREFIX)) {
                    neededHashes.add(val.slice(IMG_REF_PREFIX.length));
                } else if (typeof val === 'object' && val !== null) {
                    collectRefs(val);
                }
            }
        }
    };

    collectRefs(lightData);
    if (neededHashes.size === 0) {
        return { restoredData: lightData, missingCount: 0 };
    }

    const hashList = Array.from(neededHashes);
    // 1. IndexedDB 로컬 캐시 조회
    const resolvedMap = await getCachedImagesBatch(hashList);
    const missingFromCache = hashList.filter(h => !resolvedMap[h]);

    // 2. 누락분 Google Drive에서 다운로드 후 캐시 저장
    if (missingFromCache.length > 0 && googleAccessToken) {
        try {
            const downloaded = await downloadImagesFromDrive(missingFromCache, googleAccessToken, onProgress);
            Object.assign(resolvedMap, downloaded);
            await setCachedImagesBatch(downloaded);
        } catch (err) {
            console.warn('[ImageSplit] Google Drive 이미지 복원 중 일부 실패:', err);
        }
    }

    let missingCount = 0;
    const restoreNode = (node: unknown): unknown => {
        if (!node) return node;
        if (Array.isArray(node)) {
            return node.map(item => {
                if (typeof item === 'string' && item.startsWith(IMG_REF_PREFIX)) {
                    const hash = item.slice(IMG_REF_PREFIX.length);
                    const found = resolvedMap[hash];
                    if (!found) {
                        missingCount++;
                        // 미복원 시 빈 문자열로 파괴하지 않고 원본 imgref:<hash> 유지 (추후 토큰 확보 시 재복원 가능)
                        return item;
                    }
                    return found;
                }
                if (typeof item === 'object' && item !== null) {
                    return restoreNode(item);
                }
                return item;
            });
        }
        if (typeof node === 'object') {
            const obj = node as Record<string, unknown>;
            const cloned: Record<string, unknown> = {};
            for (const key of Object.keys(obj)) {
                const val = obj[key];
                if (typeof val === 'string' && val.startsWith(IMG_REF_PREFIX)) {
                    const hash = val.slice(IMG_REF_PREFIX.length);
                    const found = resolvedMap[hash];
                    if (!found) {
                        missingCount++;
                        // 미복원 시 빈 문자열로 파괴하지 않고 원본 imgref:<hash> 유지 (추후 토큰 확보 시 재복원 가능)
                        cloned[key] = val;
                    } else {
                        cloned[key] = found;
                    }
                } else if (typeof val === 'object' && val !== null) {
                    cloned[key] = restoreNode(val);
                } else {
                    cloned[key] = val;
                }
            }
            return cloned;
        }
        return node;
    };

    const restoredData = restoreNode(lightData) as T;
    return { restoredData, missingCount };
};
