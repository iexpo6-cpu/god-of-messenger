/**
 * IndexedDB 기반 이미지 초고속 로컬 캐시 서비스
 * - 외부 HTTP/HTTPS 이미지 URL을 감지하여 브라우저 로컬 데이터베이스(IndexedDB)에 영구 보존
 * - 두 번째 로드부터는 인터넷 통신 없이 0ms 만에 로컬에서 즉시 이미지를 불러옴
 * - CORS 미지원 이미지의 경우에도 오류 없이 부드럽게 기존 인터넷 로딩으로 자동 대비(Fallback) 처리
 */

const DB_NAME = 'GameImageCacheDB';
const STORE_NAME = 'images';
const DB_VERSION = 1;

let dbPromise: Promise<IDBDatabase> | null = null;

function getDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = (event) => {
      resolve((event.target as IDBOpenDBRequest).result);
    };

    request.onerror = (event) => {
      reject((event.target as IDBOpenDBRequest).error);
    };
  });

  return dbPromise;
}

/**
 * 캐시에서 이미지를 조회하거나 없으면 인터넷에서 다운로드 후 저장하는 원본 Blob 반환 함수
 */
export async function getCachedBlob(url: string): Promise<Blob | null> {
  // 로컬 자원, 데이터 URI, 이미 Blob인 주소는 캐싱 생략
  if (!url || url.startsWith('data:') || url.startsWith('blob:') || !url.startsWith('http')) {
    return null;
  }

  try {
    const db = await getDB();
    
    // 1. 캐시 조회
    const cached = await new Promise<Blob | null>((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const request = store.get(url);
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => resolve(null);
      } catch (e) {
        resolve(null);
      }
    });

    if (cached) {
      return cached;
    }

    // 2. 캐시에 없으면 다운로드 후 저장 (CORS 대응)
    const response = await fetch(url, { mode: 'cors' });
    if (!response.ok) return null;
    const blob = await response.blob();

    // 정상 다운로드된 이미지 유형인지 확인
    if (blob.type.startsWith('image/')) {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.put(blob, url);
    }

    return blob;
  } catch (err) {
    // CORS 제약이나 네트워크 오류 시 차분히 null 반환하여 일반 로딩 유도
    return null;
  }
}

/**
 * 글로벌 HTMLImageElement src 가로채기 초기화 함수
 * - 기존 React 및 일반 <img> 태그 변경 없이, 모든 이미지 로딩을 IndexedDB 캐시망으로 자동 전환
 */
export function initGlobalImageCache(): void {
  if (typeof window === 'undefined' || !window.HTMLImageElement) return;

  const originalSrcDescriptor = Object.getOwnPropertyDescriptor(
    window.HTMLImageElement.prototype,
    'src'
  );

  if (!originalSrcDescriptor || !originalSrcDescriptor.set) {
    return;
  }

  const activeBlobUrls = new Map<HTMLImageElement, string>();

  Object.defineProperty(window.HTMLImageElement.prototype, 'src', {
    ...originalSrcDescriptor,
    set: function (this: HTMLImageElement, val: string) {
      const img = this;

      // 이전 생성한 Object URL 해제하여 메모리 누수 방지
      const prevBlobUrl = activeBlobUrls.get(img);
      if (prevBlobUrl) {
        URL.revokeObjectURL(prevBlobUrl);
        activeBlobUrls.delete(img);
      }

      // 로컬 파일이나 인라인 데이터는 원본 속성 그대로 대입
      if (!val || val.startsWith('data:') || val.startsWith('blob:') || !val.startsWith('http')) {
        originalSrcDescriptor.set!.call(img, val);
        return;
      }

      // 비동기로 캐시 확인 및 이미지 로드 처리
      getCachedBlob(val)
        .then((blob) => {
          if (blob) {
            const blobUrl = URL.createObjectURL(blob);
            activeBlobUrls.set(img, blobUrl);
            originalSrcDescriptor.set!.call(img, blobUrl);
          } else {
            // 캐시 실패 또는 CORS 미지원 시 기존 URL로 즉시 대체 로딩
            originalSrcDescriptor.set!.call(img, val);
          }
        })
        .catch(() => {
          originalSrcDescriptor.set!.call(img, val);
        });
    }
  });
}

/**
 * Base64 이미지를 익명 이미지 호스팅 서비스에 실시간 업로드하여 영구 웹 URL을 획득하는 함수
 * - CORS 허용률 100%인 tmpfiles.org 와 telegra.ph 를 다중 예비(Multi-fallback) 체계로 구성
 * - 네트워크가 완전히 끊긴 상태에서도 저장이 실패하지 않도록 최종 예외 발생 시 원본 Base64 복구 지원
 */
export async function uploadImageToWeb(base64Url: string): Promise<string> {
  if (!base64Url || !base64Url.startsWith('data:')) {
    return base64Url; // 이미 웹 URL이거나 유효하지 않으면 패스
  }

  // SVG 데이터 URI는 텍스트 형태로 코드 자체에 들어가는게 안전하므로 업로드 생략
  if (base64Url.startsWith('data:image/svg+xml')) {
    return base64Url;
  }

  try {
    const parts = base64Url.split(';base64,');
    if (parts.length < 2) return base64Url;
    const contentType = parts[0].split(':')[1];
    const raw = window.atob(parts[1]);
    const rawLength = raw.length;
    const uInt8Array = new Uint8Array(rawLength);
    for (let i = 0; i < rawLength; ++i) {
      uInt8Array[i] = raw.charCodeAt(i);
    }
    const blob = new Blob([uInt8Array], { type: contentType });

    // 1차 시도: CORS 정책이 완벽히 지원되는 tmpfiles.org
    try {
      const formData = new FormData();
      formData.append('file', blob, 'effect_frame.png');

      const res = await fetch('https://tmpfiles.org/api/v1/upload', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const json = await res.json();
        if (json.status === 'success' && json.data?.url) {
          // 직접 다운로드 주소로 치환: tmpfiles.org/1234/file.png -> tmpfiles.org/dl/1234/file.png
          const directUrl = json.data.url.replace('https://tmpfiles.org/', 'https://tmpfiles.org/dl/');
          
          // 로컬 캐시에도 즉시 등록하여 0ms 로드 지원
          try {
            const db = await getDB();
            const tx = db.transaction(STORE_NAME, 'readwrite');
            const store = tx.objectStore(STORE_NAME);
            store.put(blob, directUrl);
          } catch (e) {
            console.warn('로컬 캐시 저장 예외:', e);
          }
          return directUrl;
        }
      }
    } catch (err1) {
      console.warn('1차 업로드 서버(tmpfiles.org) 통신 실패, 예비 서버로 전환합니다:', err1);
    }

    // 2차 시도: 예비 업로드 서버 telegra.ph (CORS 우회 시도)
    try {
      const formData = new FormData();
      formData.append('file', blob, 'effect_frame.png');

      const res = await fetch('https://telegra.ph/upload', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data[0]?.src) {
          const remoteUrl = 'https://telegra.ph' + data[0].src;
          
          try {
            const db = await getDB();
            const tx = db.transaction(STORE_NAME, 'readwrite');
            const store = tx.objectStore(STORE_NAME);
            store.put(blob, remoteUrl);
          } catch (e) {
            console.warn('로컬 캐시 저장 예외:', e);
          }
          return remoteUrl;
        }
      }
    } catch (err2) {
      console.warn('2차 예비 업로드 서버(telegra.ph) 통신 실패:', err2);
    }

    // 두 개의 업로드 서버가 모두 실패한 경우 에러를 던지지 않고, 안전하게 원래의 압축된 Base64 데이터를 그대로 유지함
    console.log('[이미지 캐시 서비스] 이미지 서버 업로드에 실시간 장애가 있어 원본 압축 데이터로 대체 보존합니다.');
    return base64Url;
  } catch (err) {
    console.error('웹 이미지 호스팅 업로드 예외 발생:', err);
    return base64Url;
  }
}

