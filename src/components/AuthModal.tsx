import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Cloud, AlertCircle, Loader2 } from 'lucide-react';
import { googleSignIn } from '../services/googleDriveService';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    initialMode: 'login' | 'signup';
    onSuccess: (mode: 'login' | 'signup' | 'findId' | 'findPassword') => void;
}

const AuthModal: React.FC<Props> = ({ isOpen, onClose, initialMode, onSuccess }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleGoogleLogin = async () => {
        setIsLoading(true);
        setError('');
        try {
            const res = await googleSignIn();
            if (res) {
                onSuccess('login');
                onClose();
            }
        } catch (err: any) {
            setError(err.message || '구글 연동 로그인 중 오류가 발생했습니다.');
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[1001] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 overflow-y-auto">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="w-full max-w-md bg-slate-900 border border-slate-700/50 rounded-[2.5rem] overflow-hidden shadow-2xl relative"
                >
                    {/* Header Decoration */}
                    <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-transparent via-amber-500 to-transparent opacity-50"></div>
                    
                    <button 
                        onClick={onClose}
                        className="absolute top-6 right-6 p-2 text-slate-500 hover:text-white hover:bg-white/10 rounded-full transition-all z-10"
                    >
                        <X size={24} />
                    </button>

                    <div className="p-8 pt-12 text-center">
                        <div className="w-16 h-16 bg-amber-500/10 rounded-2xl flex items-center justify-center mb-6 border border-amber-500/20 shadow-inner mx-auto">
                            <Cloud className="text-amber-500" size={32} />
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-2 font-cinzel tracking-tight">
                            구글 연동 로그인
                        </h2>
                        <p className="text-slate-400 text-xs px-4 mb-8 leading-relaxed">
                            수동 업로드와 다운로드의 불편함 없이, 구글 계정 연동을 통해 게임 데이터를 개인 구글 드라이브에 안전하게 보관하세요. 모바일 웹앱 환경에서도 페이지 전환을 통해 안정적으로 로그인됩니다.
                        </p>

                        <div className="flex flex-col items-center justify-center mb-4">
                            <button 
                                onClick={handleGoogleLogin}
                                disabled={isLoading}
                                className="w-full flex items-center justify-center gap-3 bg-white hover:bg-slate-100 text-slate-900 font-bold py-3.5 px-4 rounded-xl shadow-lg transition-all active:scale-[0.98] border border-slate-200 cursor-pointer text-sm disabled:opacity-50"
                            >
                                {isLoading ? (
                                    <Loader2 className="animate-spin text-slate-900" size={18} />
                                ) : (
                                    <>
                                        <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-5 h-5 shrink-0">
                                            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                                            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                                            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                                            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                                        </svg>
                                        <span>구글 계정으로 로그인</span>
                                    </>
                                )}
                            </button>
                        </div>

                        {error && (
                            <motion.div 
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-red-950/30 border border-red-500/30 p-3 rounded-xl text-red-400 text-xs flex gap-2 items-start text-left mb-6"
                            >
                                <AlertCircle className="shrink-0 mt-0.5" size={14} />
                                <span>{error}</span>
                            </motion.div>
                        )}
                    </div>

                    <div className="bg-slate-950/50 p-6 flex flex-col gap-2 items-center">
                        <p className="text-[11px] text-slate-500 text-center leading-relaxed">
                            로그인 시 사용자님의 게임 진행 상태가 동의 하에 안전하게 개인 구글 드라이브 클라우드 영역에 보관되며, 원하실 때 자유롭게 복구하실 수 있습니다.
                        </p>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default AuthModal;
