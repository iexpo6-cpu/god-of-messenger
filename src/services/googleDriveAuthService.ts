import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithPopup, 
  signInWithRedirect, 
  getRedirectResult, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  User, 
  signOut 
} from 'firebase/auth';
import firebaseConfig from '../firebase-applet-config.json';

// 파이어베이스 앱 초기화 (중복 방지)
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);

const provider = new GoogleAuthProvider();
// 구글 드라이브 권한 스코프 추가
provider.addScope('https://www.googleapis.com/auth/drive');
provider.setCustomParameters({
  prompt: 'select_account'
});

// 스토리지 캐시 키
const GDRIVE_AUTH_CACHE_KEY = 'shinryoku_gdrive_auth_session_v3';

interface CachedAuthData {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  accessToken: string;
  savedAt: number;
}

// 메모리 상태
let isSigningIn = false;
let isCheckingRedirect = false;
let cachedAccessToken: string | null = null;
let currentUser: User | null = null;
let authListeners: Array<(user: User | null, token: string | null) => void> = [];

/**
 * 모바일 기기 또는 독립형 웹앱 (PWA Standalone) 환경 감지
 */
export const isMobileOrPWAEnvironment = (): boolean => {
  if (typeof window === 'undefined') return false;

  // 1. PWA Standalone 모드 (iOS / Android / Desktop PWA)
  const isStandalone = 
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches ||
    window.matchMedia('(display-mode: minimal-ui)').matches ||
    (window.navigator as any).standalone === true;

  if (isStandalone) return true;

  // 2. 모바일 기기 User-Agent 감지
  const userAgent = window.navigator.userAgent || '';
  const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|Silk/i.test(userAgent);
  
  // 3. 터치 디바이스이면서 작은 화면
  const isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
  const isSmallScreen = window.innerWidth <= 768;

  return isMobileUA || (isTouchDevice && isSmallScreen);
};

/**
 * 보안 스토리지에 토큰 및 유저 세션 안전하게 저장
 */
const saveAuthToCache = (user: User, token: string) => {
  try {
    const data: CachedAuthData = {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
      accessToken: token,
      savedAt: Date.now()
    };
    localStorage.setItem(GDRIVE_AUTH_CACHE_KEY, JSON.stringify(data));
  } catch (err) {
    console.warn('[구글 인증] 로컬 캐시 저장 실패:', err);
  }
};

/**
 * 스토리지에서 캐시된 토큰 로드
 */
const loadAuthFromCache = (): CachedAuthData | null => {
  try {
    const raw = localStorage.getItem(GDRIVE_AUTH_CACHE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as CachedAuthData;
    if (!data.accessToken) return null;
    return data;
  } catch {
    return null;
  }
};

/**
 * 스토리지 캐시 삭제
 */
const clearAuthCache = () => {
  try {
    localStorage.removeItem(GDRIVE_AUTH_CACHE_KEY);
    sessionStorage.removeItem('shinryoku_auth_pending_redirect');
  } catch {}
};

// 앱 로드 시 캐시된 토큰 초기 세팅 (오프라인/새로고침 즉시 복원)
const initialCache = loadAuthFromCache();
if (initialCache) {
  cachedAccessToken = initialCache.accessToken;
}

/**
 * 인증 상태 변경을 모든 구독자에게 알림
 */
const notifyListeners = (user: User | null, token: string | null) => {
  authListeners.forEach(listener => {
    try {
      listener(user, token);
    } catch (e) {
      console.error('[구글 인증] 리스너 알림 오류:', e);
    }
  });
};

/**
 * 리디렉션 복귀 결과 자동 확인 (PWA Standalone 및 모바일 리디렉션 처리)
 */
export const checkRedirectAuthResult = async (): Promise<{ user: User; accessToken: string } | null> => {
  if (isCheckingRedirect) return null;
  isCheckingRedirect = true;
  try {
    const result = await getRedirectResult(auth);
    if (result) {
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential?.accessToken) {
        cachedAccessToken = credential.accessToken;
        currentUser = result.user;
        saveAuthToCache(result.user, credential.accessToken);
        notifyListeners(result.user, credential.accessToken);
        return { user: result.user, accessToken: credential.accessToken };
      }
    }
  } catch (error: any) {
    console.warn('[구글 인증] 리디렉션 로그인 결과 확인 중 오류:', error);
  } finally {
    isCheckingRedirect = false;
  }
  return null;
};

// 모듈 로드 시 리디렉션 즉시 1회 체크
if (typeof window !== 'undefined') {
  checkRedirectAuthResult();
}

/**
 * 인증 변화 감지 리스너 등록
 */
export const initDriveAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  // 즉시 현재 캐시 상태 확인 및 알림
  const cache = loadAuthFromCache();
  if (currentUser && cachedAccessToken) {
    if (onAuthSuccess) onAuthSuccess(currentUser, cachedAccessToken);
  } else if (cache && cache.accessToken) {
    cachedAccessToken = cache.accessToken;
    if (onAuthSuccess) {
      onAuthSuccess({
        uid: cache.uid,
        email: cache.email,
        displayName: cache.displayName,
        photoURL: cache.photoURL,
      } as any, cache.accessToken);
    }
  } else {
    // 저장된 인증이 없으면 지체 없이 즉시 실패/미인증 상태 통보
    if (onAuthFailure) onAuthFailure();
  }

  const listener = (user: User | null, token: string | null) => {
    if (user && token) {
      if (onAuthSuccess) onAuthSuccess(user, token);
    } else {
      if (onAuthFailure) onAuthFailure();
    }
  };

  authListeners.push(listener);

  // 10분마다 백그라운드에서 토큰 만료 임박 여부를 주기적으로 점검하여 사전 자동 갱신
  const checkInterval = setInterval(() => {
    const cache = loadAuthFromCache();
    if (cache && cache.accessToken && cache.savedAt) {
      const elapsedMs = Date.now() - cache.savedAt;
      // 45분이 지난 토큰은 만료 전에 미리 백그라운드에서 무음 갱신
      if (elapsedMs > 45 * 60 * 1000) {
        refreshDriveAccessTokenSilently().catch(() => {});
      }
    }
  }, 10 * 60 * 1000);

  const unsubscribeFirebase = onAuthStateChanged(auth, async (user: User | null) => {
    currentUser = user;
    if (user) {
      if (!cachedAccessToken) {
        const storedCache = loadAuthFromCache();
        if (storedCache && storedCache.uid === user.uid) {
          cachedAccessToken = storedCache.accessToken;
        }
      }
      if (cachedAccessToken) {
        saveAuthToCache(user, cachedAccessToken);
        notifyListeners(user, cachedAccessToken);
      } else if (!isSigningIn && !isCheckingRedirect) {
        // 토큰이 없는 로그인 상태인 경우 백그라운드 무음 갱신 시도
        refreshDriveAccessTokenSilently().then(newToken => {
          if (newToken && currentUser) {
            notifyListeners(currentUser, newToken);
          } else {
            notifyListeners(user, null);
          }
        });
      }
    } else {
      const storedCache = loadAuthFromCache();
      if (!storedCache) {
        cachedAccessToken = null;
        notifyListeners(null, null);
      }
    }
  });

  return () => {
    clearInterval(checkInterval);
    authListeners = authListeners.filter(l => l !== listener);
    unsubscribeFirebase();
  };
};

/**
 * 구글 로그인 (모바일/PWA 자동 전환 및 팝업 차단 시 리디렉션 자동 우회)
 */
export const signInWithGoogleDrive = async (forceRedirect = false): Promise<{ user: User; accessToken: string } | null> => {
  const isMobileApp = isMobileOrPWAEnvironment();
  const shouldUseRedirect = forceRedirect || isMobileApp;

  try {
    isSigningIn = true;

    // 모바일 기기이거나 독립형 웹앱 모드일 경우 페이지 전환형(Redirect) 로그인 실행
    if (shouldUseRedirect) {
      try {
        sessionStorage.setItem('shinryoku_auth_pending_redirect', 'true');
      } catch {}
      await signInWithRedirect(auth, provider);
      return null;
    }

    // 데스크톱 / 일반 브라우저 환경에서는 팝업 시도
    try {
      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (!credential?.accessToken) {
        throw new Error('구글 인증 액세스 토큰 획득에 실패했습니다.');
      }

      cachedAccessToken = credential.accessToken;
      currentUser = result.user;
      saveAuthToCache(result.user, credential.accessToken);
      notifyListeners(result.user, credential.accessToken);

      return { user: result.user, accessToken: credential.accessToken };
    } catch (popupError: any) {
      // 팝업이 차단되거나 실패한 경우 자연스럽게 리디렉션 로그인으로 우회 전환
      const errCode = popupError?.code || '';
      const isPopupBlocked = 
        errCode === 'auth/popup-blocked' ||
        errCode === 'auth/popup-closed-by-user' ||
        errCode === 'auth/cancelled-popup-request';

      if (isPopupBlocked) {
        console.warn('[구글 인증] 팝업 차단 감지, 페이지 전환형 리디렉션 로그인으로 자동 전환합니다.');
        try {
          sessionStorage.setItem('shinryoku_auth_pending_redirect', 'true');
        } catch {}
        await signInWithRedirect(auth, provider);
        return null;
      }
      throw popupError;
    }
  } catch (error: any) {
    console.error('구글 드라이브 로그인 에러:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

/**
 * 페이지 전환형(Redirect) 로그인 명시적 실행
 */
export const signInWithGoogleDriveRedirect = async (): Promise<void> => {
  try {
    sessionStorage.setItem('shinryoku_auth_pending_redirect', 'true');
  } catch {}
  await signInWithRedirect(auth, provider);
};

/**
 * 액세스 토큰 반환 (메모리 우선, 로컬 캐시 백업)
 */
export const getDriveAccessToken = (): string | null => {
  if (cachedAccessToken) return cachedAccessToken;
  const cache = loadAuthFromCache();
  if (cache) {
    cachedAccessToken = cache.accessToken;
    return cache.accessToken;
  }
  return null;
};

/**
 * 구글 드라이브 액세스 토큰의 유효성을 백그라운드에서 검증합니다.
 */
export const validateDriveAccessToken = async (token: string): Promise<boolean> => {
  if (!token || token.trim() === '') return false;
  try {
    const res = await fetch(`https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=${encodeURIComponent(token)}`);
    if (!res.ok) return false;
    const data = await res.json();
    return typeof data.expires_in === 'number' && data.expires_in > 30;
  } catch {
    return false;
  }
};

let isRefreshingToken = false;
let refreshPromise: Promise<string | null> | null = null;

/**
 * Google Identity Services 스크립트 동적 로드
 */
const loadGisScript = (): Promise<boolean> => {
  if (typeof window === 'undefined') return Promise.resolve(false);
  if ((window as any).google?.accounts?.oauth2) return Promise.resolve(true);

  return new Promise((resolve) => {
    const existingScript = document.getElementById('google-gis-script');
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(true));
      existingScript.addEventListener('error', () => resolve(false));
      return;
    }

    const script = document.createElement('script');
    script.id = 'google-gis-script';
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.head.appendChild(script);
  });
};

/**
 * 백그라운드 무음 토큰 재발급 및 자동 갱신
 */
export const refreshDriveAccessTokenSilently = async (): Promise<string | null> => {
  if (isRefreshingToken && refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    try {
      isRefreshingToken = true;
      const gisLoaded = await loadGisScript();
      if (!gisLoaded || !(window as any).google?.accounts?.oauth2) {
        console.warn('[구글 인증] 구글 세션 연결 라이브러리 로드 실패');
        return null;
      }

      const clientId = firebaseConfig.oAuthClientId || '72445754356-k8ii4iad8gcbm6ojselgvbjaqfdqvvn2.apps.googleusercontent.com';

      return new Promise<string | null>((resolve) => {
        let hasResolved = false;

        const timeoutId = setTimeout(() => {
          if (!hasResolved) {
            hasResolved = true;
            console.warn('[구글 인증] 무음 토큰 갱신 시간 초과');
            resolve(null);
          }
        }, 8000);

        try {
          const tokenClient = (window as any).google.accounts.oauth2.initTokenClient({
            client_id: clientId,
            scope: 'https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/drive.appdata https://www.googleapis.com/auth/drive.file',
            prompt: '', // 무음 처리 (팝업 없이 백그라운드 자동 갱신)
            callback: (response: any) => {
              if (hasResolved) return;
              hasResolved = true;
              clearTimeout(timeoutId);

              if (response && response.access_token) {
                const newToken = response.access_token;
                cachedAccessToken = newToken;
                
                const user = currentUser || getCurrentDriveUser();
                if (user) {
                  currentUser = user;
                  saveAuthToCache(user, newToken);
                  notifyListeners(user, newToken);
                } else {
                  const cache = loadAuthFromCache();
                  if (cache) {
                    cache.accessToken = newToken;
                    cache.savedAt = Date.now();
                    try {
                      localStorage.setItem(GDRIVE_AUTH_CACHE_KEY, JSON.stringify(cache));
                    } catch {}
                  }
                }
                console.log('[구글 인증] 백그라운드 토큰 무음 재발급 성공!');
                resolve(newToken);
              } else {
                console.warn('[구글 인증] 무음 토큰 갱신 실패:', response);
                resolve(null);
              }
            },
            error_callback: (err: any) => {
              if (hasResolved) return;
              hasResolved = true;
              clearTimeout(timeoutId);
              console.warn('[구글 인증] 구글 토큰 갱신 오류:', err);
              resolve(null);
            }
          });

          tokenClient.requestAccessToken({ prompt: '' });
        } catch (err) {
          if (!hasResolved) {
            hasResolved = true;
            clearTimeout(timeoutId);
            console.warn('[구글 인증] 토큰 요청 예외:', err);
            resolve(null);
          }
        }
      });
    } catch (err) {
      console.warn('[구글 인증] 토큰 갱신 중 오류:', err);
      return null;
    } finally {
      isRefreshingToken = false;
      refreshPromise = null;
    }
  })();

  return refreshPromise;
};

/**
 * 유효성이 보장된 액세스 토큰을 반환합니다. 만료되었거나 임박한 경우 검증 및 무음 갱신을 진행합니다.
 */
export const getValidDriveAccessToken = async (): Promise<string | null> => {
  const token = getDriveAccessToken();
  const cache = loadAuthFromCache();

  // 1. 토큰이 존재하고 50분 이내 발급된 것이면 네트워크 검증 없이 즉시 반환
  if (token && cache && cache.savedAt && (Date.now() - cache.savedAt < 50 * 60 * 1000)) {
    return token;
  }

  // 2. 토큰이 있다면 백그라운드 유효성 검사
  if (token) {
    const isValid = await validateDriveAccessToken(token);
    if (isValid) {
      if (cache) {
        cache.savedAt = Date.now();
        try {
          localStorage.setItem(GDRIVE_AUTH_CACHE_KEY, JSON.stringify(cache));
        } catch {}
      }
      return token;
    }
  }

  // 3. 토큰이 없거나 만료된 경우 (1시간 경과 후 등) 백그라운드 무음 자동 재발급 시도
  console.log('[구글 인증] 토큰 만료 감지, 백그라운드 무음 재발급 진행...');
  const refreshedToken = await refreshDriveAccessTokenSilently();
  if (refreshedToken) {
    return refreshedToken;
  }

  // 4. 만료 및 무음 갱신 실패 시
  console.warn('[구글 인증] 구글 드라이브 세션 토큰 무음 갱신 실패');
  return null;
};

/**
 * 토큰 만료 시 캐시 무효화
 */
export const invalidateDriveAccessToken = () => {
  cachedAccessToken = null;
  clearAuthCache();
  notifyListeners(currentUser, null);
};

/**
 * 현재 유저 반환
 */
export const getCurrentDriveUser = (): User | null => {
  if (currentUser) return currentUser;
  const cache = loadAuthFromCache();
  if (cache) {
    return {
      uid: cache.uid,
      email: cache.email,
      displayName: cache.displayName,
      photoURL: cache.photoURL
    } as any;
  }
  return null;
};

/**
 * 로그아웃 및 캐시 정리
 */
export const logoutDrive = async () => {
  try {
    await signOut(auth);
  } catch (e) {
    console.warn('[구글 인증] 로그아웃 중 예외:', e);
  }
  cachedAccessToken = null;
  currentUser = null;
  clearAuthCache();
  notifyListeners(null, null);
};

