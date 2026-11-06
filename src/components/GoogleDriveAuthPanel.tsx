import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { Chrome, CloudLightning, Loader2, LogOut, Check, Smartphone } from 'lucide-react';
import { 
  signInWithGoogleDrive, 
  getDriveAccessToken, 
  getCurrentDriveUser, 
  logoutDrive, 
  initDriveAuth,
  isMobileOrPWAEnvironment,
  checkRedirectAuthResult
} from '../services/googleDriveAuthService';

interface Props {
  onAuthChange?: (accessToken: string | null) => void;
}

/**
 * 구글 드라이브 상태 표시 및 로그인을 담당하는 모바일 웹앱 최적화 컨트롤 패널 컴포넌트입니다.
 */
export const GoogleDriveAuthPanel: React.FC<Props> = ({ onAuthChange }) => {
  const [user, setUser] = useState<User | null>(() => getCurrentDriveUser());
  const [accessToken, setAccessToken] = useState<string | null>(() => getDriveAccessToken());
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isMobilePwa, setIsMobilePwa] = useState(false);

  useEffect(() => {
    setIsMobilePwa(isMobileOrPWAEnvironment());

    // 리디렉션 결과 복귀 감지
    checkRedirectAuthResult().then(res => {
      if (res) {
        setUser(res.user);
        setAccessToken(res.accessToken);
        if (onAuthChange) onAuthChange(res.accessToken);
      }
    });

    // 자동 로그인 세션 감지 및 캐시 실시간 동기화
    const unsubscribe = initDriveAuth(
      (currentUser, token) => {
        setUser(currentUser);
        setAccessToken(token);
        if (onAuthChange) onAuthChange(token);
      },
      () => {
        setUser(null);
        setAccessToken(null);
        if (onAuthChange) onAuthChange(null);
      }
    );
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    setIsLoggingIn(true);
    try {
      const res = await signInWithGoogleDrive();
      if (res) {
        setUser(res.user);
        setAccessToken(res.accessToken);
        if (onAuthChange) onAuthChange(res.accessToken);
      }
    } catch (err: any) {
      console.error(err);
      alert(err?.message || '구글 계정 연결 중 오류가 발생했습니다.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    if (window.confirm('구글 드라이브 연결을 해제하시겠습니까?')) {
      await logoutDrive();
      setUser(null);
      setAccessToken(null);
      if (onAuthChange) onAuthChange(null);
    }
  };

  return (
    <div className="bg-slate-950/70 border border-slate-800/90 rounded-2xl p-3 sm:p-4 w-full flex flex-col sm:flex-row items-center justify-between gap-3 shadow-inner">
      <div className="flex items-center gap-3 w-full sm:w-auto">
        <div className={`p-2.5 rounded-xl flex items-center justify-center shrink-0 ${accessToken ? 'bg-indigo-950 text-indigo-400 border border-indigo-800/40' : 'bg-slate-800 text-slate-400'}`}>
          <Chrome size={18} className={accessToken ? "animate-pulse text-indigo-400" : ""} />
        </div>
        <div className="min-w-0 text-left flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-black text-slate-100">구글 드라이브 클라우드</span>
            {accessToken ? (
              <span className="flex items-center gap-0.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-[9px] px-1.5 py-0.5 rounded-full font-bold">
                <Check size={8} /> 연동됨
              </span>
            ) : (
              <span className="bg-slate-800 text-slate-400 text-[9px] px-1.5 py-0.5 rounded-full font-bold">
                오프라인
              </span>
            )}
            {isMobilePwa && (
              <span className="flex items-center gap-0.5 bg-cyan-950/80 text-cyan-400 border border-cyan-800/40 text-[9px] px-1.5 py-0.5 rounded-full font-bold">
                <Smartphone size={8} /> 모바일 웹앱 지원
              </span>
            )}
          </div>
          <p className="text-[10px] text-slate-400 truncate mt-0.5 max-w-[220px] sm:max-w-xs">
            {accessToken && user ? `${user.displayName || '구글 사용자'} (${user.email || '연동 완료'})` : (
              isMobilePwa 
                ? '모바일 및 웹앱 환경에서 터치 시 구글 연동으로 이동합니다.' 
                : '차원 및 이펙트 데이터를 구글 드라이브와 자동으로 연동해 보관합니다.'
            )}
          </p>
        </div>
      </div>

      <div className="w-full sm:w-auto shrink-0">
        {accessToken ? (
          <button
            type="button"
            onClick={handleLogout}
            className="w-full sm:w-auto px-3.5 py-2 rounded-xl text-[11px] font-bold bg-slate-800 hover:bg-slate-700 hover:text-white text-slate-300 border border-slate-700/60 active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <LogOut size={12} />
            <span>연결 해제</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={handleLogin}
            disabled={isLoggingIn}
            className="w-full sm:w-auto px-4 py-2 rounded-xl text-[11px] font-black bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 active:scale-95 text-white shadow-lg shadow-indigo-950/50 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            {isLoggingIn ? (
              <>
                <Loader2 size={12} className="animate-spin" />
                <span>계정 연결 중...</span>
              </>
            ) : (
              <>
                <CloudLightning size={12} />
                <span>구글 계정 연결</span>
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
};

export default GoogleDriveAuthPanel;
