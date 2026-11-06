import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, ShieldAlert, KeyRound } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onConfirm: (password: string) => boolean; // returns true if correct, false if wrong
  onClose: () => void;
}

const DevPasswordModal: React.FC<Props> = ({ isOpen, onConfirm, onClose }) => {
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setPassword('');
      setErrorMsg('');
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setErrorMsg('비밀번호를 입력해 주세요.');
      return;
    }
    const success = onConfirm(password);
    if (success) {
      onClose();
    } else {
      setErrorMsg('비밀번호가 올바르지 않습니다.');
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 font-sans animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-amber-600/50 w-full max-w-sm rounded-xl shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-amber-950/20">
          <h3 className="font-bold flex items-center text-amber-400 text-sm sm:text-base">
            <ShieldAlert size={18} className="mr-2 text-amber-500 animate-pulse" />
            운영자 모드 인증
          </h3>
          <button 
            onClick={onClose} 
            className="text-slate-400 hover:text-white transition-colors p-1"
            aria-label="닫기"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit}>
          <div className="p-6 flex flex-col gap-4">
            <div className="text-center mb-1">
              <div className="w-12 h-12 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto mb-3 border border-amber-500/20">
                <KeyRound size={24} className="text-amber-500" />
              </div>
              <p className="text-slate-200 text-sm font-semibold">비밀번호를 입력하세요</p>
              <p className="text-slate-400 text-xs mt-1 leading-relaxed">
                시스템 설정을 변경할 수 있는 최고 권한입니다.
              </p>
            </div>

            <div className="relative">
              <input
                ref={inputRef}
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errorMsg) setErrorMsg('');
                }}
                placeholder="비밀번호"
                className="w-full px-4 py-3 bg-slate-950 border border-slate-700 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-lg text-slate-100 text-center text-sm font-mono tracking-widest outline-none transition-all placeholder:text-slate-600"
              />
            </div>

            {errorMsg && (
              <p className="text-red-400 text-xs text-center font-semibold animate-shake">
                {errorMsg}
              </p>
            )}
          </div>

          {/* Footer Buttons */}
          <div className="p-4 border-t border-slate-800 flex gap-3 bg-slate-950/30">
            <button 
              type="button"
              onClick={onClose} 
              className="flex-1 py-2.5 sm:py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-bold text-xs sm:text-sm transition-colors"
            >
              취소
            </button>
            <button 
              type="submit"
              className="flex-1 py-2.5 sm:py-3 bg-amber-700 hover:bg-amber-600 text-white rounded-lg font-bold text-xs sm:text-sm shadow-lg shadow-amber-950/40 transition-all active:scale-95"
            >
              인증 완료
            </button>
          </div>
        </form>

      </div>
    </div>,
    document.body
  );
};

export default DevPasswordModal;
