import React from 'react';
import { createPortal } from 'react-dom';
import { Loader2 } from 'lucide-react';

interface ProcessingLoadingModalProps {
  isOpen: boolean;
  message: string;
}

export const ProcessingLoadingModal: React.FC<ProcessingLoadingModalProps> = ({ isOpen, message }) => {
  if (!isOpen) return null;

  // 정규식을 활용하여 메시지 내의 진행 일수 파악 (예: "(5 / 30일 계산 중)")
  let percent: number | null = null;
  let progressText = "";
  const match = message.match(/\((\d+)\s*\/\s*(\d+)일/);
  if (match) {
    const current = parseInt(match[1], 10);
    const total = parseInt(match[2], 10);
    if (total > 0) {
      percent = Math.min(100, Math.max(0, Math.round((current / total) * 100)));
      progressText = `${current}일 / ${total}일 (${percent}% 완료)`;
    }
  }

  const modalContent = (
    <div className="fixed inset-0 flex items-center justify-center bg-slate-950/85 backdrop-blur-md z-[999999] p-4 animate-fade-in" id="processing-loading-modal">
      {/* 커스텀 애니메이션 효과를 위한 인라인 스타일 블록 주입 */}
      <style>{`
        @keyframes slide-shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        .animate-shimmer {
          background-size: 200% auto;
          animation: slide-shimmer 1.5s infinite linear;
        }
      `}</style>

      <div className="w-full max-w-xs md:max-w-sm bg-slate-900 border-2 border-amber-500/30 rounded-2xl p-6 shadow-2xl flex flex-col items-center justify-center text-center space-y-5">
        {/* 모바일 터치 피드백을 방해하지 않는 깔끔한 회전 원형 인디케이터 */}
        <div className="relative flex items-center justify-center">
          <div className="absolute w-16 h-16 rounded-full border-4 border-slate-800 border-t-amber-500 animate-spin" />
          <Loader2 className="w-7 h-7 text-amber-500 animate-pulse relative z-10" />
        </div>

        {/* 안내 문구 */}
        <div className="space-y-2">
          <h3 className="text-amber-500 font-bold text-base md:text-lg tracking-wider">
            정보 처리 중
          </h3>
          <p className="text-slate-300 text-xs md:text-sm leading-relaxed font-semibold break-keep px-1">
            {message || "잠시만 기다려 주십시오."}
          </p>
        </div>

        {/* 하단에 크고 눈에 잘 띄는 고해상도 로딩 바 구현 */}
        <div className="w-full space-y-2">
          <div className="w-full bg-slate-800 h-3 rounded-full overflow-hidden border border-slate-700/50 shadow-inner relative">
            {percent !== null ? (
              // 실시간 일일 진행 상태를 반영하는 실재 로딩 바
              <div 
                className="bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-500 h-full rounded-full transition-all duration-150 ease-out shadow-[0_0_8px_rgba(245,158,11,0.5)]"
                style={{ width: `${percent}%` }}
              />
            ) : (
              // 일반 이동/대기 시 흘러가는 효과를 주는 무한 로딩 바
              <div 
                className="bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 h-full w-full rounded-full animate-shimmer"
                style={{
                  backgroundImage: 'linear-gradient(90deg, #d97706 0%, #f59e0b 25%, #fef08a 50%, #f59e0b 75%, #d97706 100%)',
                }}
              />
            )}
          </div>

          {/* 퍼센트 텍스트 수치 표시 */}
          {percent !== null && (
            <div className="text-amber-500/90 text-xs font-bold tracking-widest animate-pulse">
              {progressText}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};
