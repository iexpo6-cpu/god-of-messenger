
import React, { useEffect, useState } from 'react';
import { Sword, Save, Play, Key, AlertCircle, ExternalLink, CheckCircle, Settings, Eye, EyeOff,Loader2, Trash2, Save as SaveIcon, User as UserIcon, LogOut, UserPlus, LogIn, GripHorizontal } from 'lucide-react';
import { motion } from 'framer-motion';
import { getSaveSlotKey, getSavePrefix } from '../utils';
import { GameStorage } from '../storage';
import { User } from 'firebase/auth';
import { googleSignIn } from '../services/googleDriveService';

interface Props {
  onNewGame: () => void;
  onContinue: () => void;
  currentUser: User | null;
  onOpenAuth: (mode: 'login' | 'signup') => void;
  onLogout: () => void;
}

const StartScreen: React.FC<Props> = ({ onNewGame, onContinue, currentUser, onOpenAuth, onLogout }) => {
  const [hasSaveData, setHasSaveData] = useState(false);
  const [isKeySelected, setIsKeySelected] = useState(false);
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualKey, setManualKey] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);

  const checkKeyStatus = async () => {
    const storedKey = localStorage.getItem('shinryoku_manual_api_key');
    if (storedKey) {
        setManualKey(storedKey);
        setIsKeySelected(true);
        return;
    }
    if (window.aistudio && window.aistudio.hasSelectedApiKey) {
      const selected = await window.aistudio.hasSelectedApiKey();
      if (selected) {
          setIsKeySelected(true);
          return;
      }
    }
    if (process.env.API_KEY) {
        setIsKeySelected(true);
    } else {
        setIsKeySelected(false);
    }
  };

  useEffect(() => {
    const init = async () => {
        await checkKeyStatus();
        
        // 1. LocalStorage 마이그레이션 실행
        await GameStorage.migrateFromLocalStorage(getSavePrefix());

        // 2. IndexedDB 데이터 체크
        const slots = await GameStorage.keys();
        const hasAnySave = slots.some(k => k.includes('_save_'));
        setHasSaveData(hasAnySave);
        
        setIsInitializing(false);
    };
    
    init();

    const handleKeyReset = () => {
      setIsKeySelected(false);
      setShowManualInput(true);
    };
    window.addEventListener('gemini-api-key-reset', handleKeyReset);
    return () => window.removeEventListener('gemini-api-key-reset', handleKeyReset);
  }, []);

  const handleOpenKeySelector = async () => {
      if (window.aistudio && window.aistudio.openSelectKey) {
          await window.aistudio.openSelectKey();
          setIsKeySelected(true);
          checkKeyStatus();
      } else {
          setShowManualInput(true);
      }
  };

  const handleSaveManualKey = () => {
      if (manualKey.trim().length < 20) {
          alert("올바른 API 키 형식이 아닙니다.");
          return;
      }
      localStorage.setItem('shinryoku_manual_api_key', manualKey.trim());
      setIsKeySelected(true);
      setShowManualInput(false);
      alert("API 키가 브라우저에 안전하게 저장되었습니다.");
  };

  const handleClearKey = () => {
      if (confirm("저장된 API 키를 삭제하시겠습니까?")) {
          localStorage.removeItem('shinryoku_manual_api_key');
          setManualKey('');
          setIsKeySelected(false);
          checkKeyStatus();
      }
  };

  const handleStartWithCheck = (callback: () => void) => {
    if (!isKeySelected) {
      setShowManualInput(true);
      alert("게임을 시작하려면 먼저 Gemini API 키 설정이 필요합니다.");
    } else {
      callback();
    }
  };

  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleGoogleSignIn = async () => {
    setIsLoggingIn(true);
    try {
      const res = await googleSignIn();
      if (res) {
        alert("구글 연동 로그인이 완료되었습니다!");
      }
    } catch (err: any) {
      alert(`구글 연동 로그인 실패: ${err.message || err}`);
    } finally {
      setIsLoggingIn(false);
    }
  };

  if (isInitializing) {
    return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-amber-500">
            <Loader2 className="animate-spin mb-4" size={48} />
            <p className="font-cinzel tracking-widest animate-pulse">Synchronizing Destiny...</p>
        </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen w-full bg-slate-950 font-sans relative overflow-hidden text-slate-200">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-20 animate-pulse"></div>
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-slate-900/50 via-transparent to-slate-950 pointer-events-none"></div>

        <div className="z-10 text-center space-y-8 p-8 max-w-2xl w-full">
            <div className="mb-12 animate-in fade-in slide-in-from-top-10 duration-1000">
                <Sword size={80} className="mx-auto text-amber-600 mb-6 drop-shadow-[0_0_15px_rgba(217,119,6,0.5)]" />
                <h1 className="text-4xl md:text-6xl font-cinzel text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-500 to-amber-200 font-bold tracking-wider mb-2 text-shadow-lg">
                    신의 사자 RPG
                </h1>
                <p className="text-slate-400 text-lg md:text-xl font-cinzel tracking-widest uppercase">
                    Messenger of God
                </p>
            </div>

            <div className="space-y-4 w-full max-w-md mx-auto">
                <div className="bg-slate-900/80 p-5 rounded-2xl border border-slate-700/50 backdrop-blur-md mb-6 shadow-xl relative overflow-hidden">
                    <div className="flex items-center justify-between mb-4">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center">
                            <Key size={14} className="mr-2"/> API Status
                        </span>
                        {isKeySelected ? (
                            <span className="text-[10px] text-green-400 font-bold bg-green-950/30 px-2 py-0.5 rounded border border-green-900/50 flex items-center">
                                <CheckCircle size={10} className="mr-1"/> 연결됨
                            </span>
                        ) : (
                            <span className="text-[10px] text-red-400 font-bold bg-red-950/30 px-2 py-0.5 rounded border border-red-900/50 flex items-center animate-pulse">
                                <AlertCircle size={10} className="mr-1"/> 키 설정 필요
                            </span>
                        )}
                    </div>
                    
                    {!showManualInput ? (
                        <div className="flex gap-2">
                            <button 
                                onClick={handleOpenKeySelector}
                                className={`flex-1 group p-3 rounded-xl font-bold text-sm flex items-center justify-center space-x-2 transition-all ${isKeySelected ? 'bg-slate-800 text-slate-300 border border-slate-700' : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-900/20'}`}
                            >
                                <Key size={18} />
                                <span>{window.aistudio ? "플랫폼 키 설정" : "API 키 설정"}</span>
                            </button>
                            {isKeySelected && (
                                <button 
                                    onClick={() => setShowManualInput(true)}
                                    className="p-3 bg-slate-800 border border-slate-700 text-slate-400 hover:text-white rounded-xl"
                                    title="수동 설정"
                                >
                                    <Settings size={18} />
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-4 animate-in slide-in-from-bottom-2">
                            <div className="relative">
                                <input 
                                    type={showPassword ? "text" : "password"}
                                    value={manualKey}
                                    onChange={(e) => setManualKey(e.target.value)}
                                    placeholder="Gemini API 키를 입력하세요"
                                    className="w-full bg-slate-950 border border-slate-700 rounded-xl py-3 pl-4 pr-12 text-sm text-indigo-300 focus:border-indigo-500 outline-none transition-all font-mono"
                                />
                                <button 
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                                >
                                    {showPassword ? <EyeOff size={16}/> : <Eye size={16}/>}
                                </button>
                            </div>
                            <div className="flex gap-2">
                                <button 
                                    onClick={() => setShowManualInput(false)}
                                    className="flex-1 py-2 text-xs text-slate-500 hover:text-slate-300 font-bold"
                                >
                                    취소
                                </button>
                                {localStorage.getItem('shinryoku_manual_api_key') && (
                                    <button 
                                        onClick={handleClearKey}
                                        className="p-2 bg-red-900/20 text-red-500 border border-red-900/30 rounded-lg hover:bg-red-900/40 transition-all"
                                    >
                                        <Trash2 size={16}/>
                                    </button>
                                )}
                                <button 
                                    onClick={handleSaveManualKey}
                                    className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold shadow-lg flex items-center justify-center gap-2"
                                >
                                    <SaveIcon size={14}/> 키 저장하기
                                </button>
                            </div>
                            <p className="text-[9px] text-slate-600 text-center italic">키는 브라우저의 로컬 저장소에만 보관됩니다.</p>
                        </div>
                    )}
                    
                    {!showManualInput && (
                        <a 
                          href="https://aistudio.google.com/app/apikey" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-[9px] text-slate-500 mt-3 flex items-center justify-center hover:text-indigo-400 transition-colors"
                        >
                          <ExternalLink size={10} className="mr-1"/> API 키 발급받기 (Google AI Studio)
                        </a>
                    )}
                </div>

                <button 
                    onClick={() => handleStartWithCheck(onContinue)}
                    disabled={!hasSaveData}
                    className={`w-full group relative p-4 rounded-xl border transition-all duration-300 flex items-center justify-center space-x-3
                    ${hasSaveData 
                        ? 'bg-slate-900/80 border-amber-600/50 hover:bg-amber-950/30 hover:border-amber-500 hover:shadow-[0_0_20px_rgba(245,158,11,0.2)] text-amber-100' 
                        : 'bg-slate-900/30 border-slate-800 text-slate-600 cursor-not-allowed opacity-50'
                    }`}
                >
                    <Save size={20} className={hasSaveData ? "text-amber-500" : ""} />
                    <span className="font-bold text-lg">이어 하기</span>
                </button>

                <button 
                    onClick={() => handleStartWithCheck(onNewGame)}
                    className="w-full group p-4 rounded-xl bg-amber-700/90 border border-amber-600 text-white font-bold text-lg flex items-center justify-center space-x-3 hover:bg-amber-600 transition-all hover:shadow-[0_0_20px_rgba(245,158,11,0.4)] hover:scale-[1.02]"
                >
                    <Play size={20} />
                    <span>새로 하기</span>
                </button>
            </div>
            
            <div className="mt-20 text-xs text-slate-700 font-mono flex flex-col gap-1 items-center">
                <span>AI Powered RPG System v1.3</span>
                <span className="opacity-50">Deployed Environment Optimized</span>
            </div>
        </div>

        {/* Auth Widget - Top Right on Mobile, Bottom Right on Desktop (Draggable) */}
        <motion.div 
            drag 
            dragMomentum={false} 
            dragElastic={0.05}
            className="absolute top-3 right-3 sm:top-auto sm:bottom-6 sm:right-6 z-30 cursor-grab active:cursor-grabbing select-none backdrop-blur-xl bg-slate-900/90 border border-slate-700/60 rounded-2xl p-2.5 sm:p-4 shadow-2xl flex flex-col gap-2 sm:gap-3 min-w-[155px] sm:min-w-[200px] max-w-[220px]"
        >
            <div className="flex items-center justify-between gap-1.5 border-b border-slate-800 pb-2 sm:pb-3">
                <div className="flex items-center gap-2 min-w-0">
                    <div className={`p-1.5 sm:p-2 rounded-lg shrink-0 ${currentUser ? 'bg-amber-500/10 text-amber-500' : 'bg-slate-800 text-slate-500'}`}>
                        <UserIcon size={16} className="sm:w-5 sm:h-5" />
                    </div>
                    <div className="flex flex-col min-w-0">
                        <span className="text-[8px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-tighter">Cloud Account</span>
                        <span className="text-[10px] sm:text-xs font-bold text-slate-200 truncate max-w-[100px] sm:max-w-[140px]">
                            {currentUser ? currentUser.email : '비로그인 상태'}
                        </span>
                    </div>
                </div>
                <div className="text-slate-600 hover:text-slate-400 shrink-0 cursor-grab active:cursor-grabbing" title="드래그하여 이동">
                    <GripHorizontal size={14} className="sm:w-4 sm:h-4" />
                </div>
            </div>

            <div className="flex gap-1.5 sm:gap-2">
                {currentUser ? (
                    <button 
                        onClick={onLogout}
                        className="flex-1 flex items-center justify-center gap-1.5 py-1.5 sm:py-2 bg-slate-800 hover:bg-red-950/30 text-slate-300 hover:text-red-400 border border-slate-700 hover:border-red-900/50 rounded-xl text-[10px] sm:text-[11px] font-bold transition-all cursor-pointer"
                    >
                        <LogOut size={12} className="sm:w-3.5 sm:h-3.5" /> 로그아웃
                    </button>
                ) : (
                    <button 
                        onClick={handleGoogleSignIn}
                        disabled={isLoggingIn}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-white hover:bg-slate-100 text-slate-900 rounded-xl text-[10px] sm:text-[11px] font-bold shadow-lg transition-all active:scale-95 cursor-pointer border border-slate-200"
                    >
                        {isLoggingIn ? (
                            <Loader2 className="animate-spin" size={12} />
                        ) : (
                            <>
                                <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-3.5 h-3.5 shrink-0">
                                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                                </svg>
                                <span>구글 로그인</span>
                            </>
                        )}
                    </button>
                )}
            </div>
            
            {!currentUser && (
                <p className="text-[8px] sm:text-[9px] text-slate-500 text-center italic leading-tight">
                    구글 드라이브 백업 연동용
                </p>
            )}
        </motion.div>
    </div>
  );
};

export default StartScreen;
