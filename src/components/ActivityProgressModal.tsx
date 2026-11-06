import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Clock, Sparkles, Shield, Eye, Target, Flag, Moon, Flame } from 'lucide-react';

interface ActivityProgressModalProps {
  isOpen: boolean;
  title: string;
  subtitle?: string;
  totalHours?: number;
  activityType?: 'tactical' | 'espionage' | 'patrol' | 'general';
  durationMs?: number; // 기본 1800ms
  onComplete: () => void;
}

export const ActivityProgressModal: React.FC<ActivityProgressModalProps> = ({
  isOpen,
  title,
  subtitle,
  totalHours = 3,
  activityType = 'general',
  durationMs = 1800,
  onComplete,
}) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!isOpen) {
      setProgress(0);
      return;
    }

    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const currentProgress = Math.min(100, Math.round((elapsed / durationMs) * 100));
      setProgress(currentProgress);

      if (currentProgress >= 100) {
        clearInterval(interval);
        setTimeout(() => {
          onComplete();
        }, 150);
      }
    }, 30);

    return () => clearInterval(interval);
  }, [isOpen, durationMs, onComplete]);

  if (!isOpen) return null;

  // 활동 타입에 따른 테마 색상 및 아이콘 결정
  const getTypeConfig = () => {
    switch (activityType) {
      case 'tactical':
        return {
          headerBg: 'bg-amber-950/80 border-amber-500/50',
          titleColor: 'text-amber-300',
          barGradient: 'from-amber-500 via-orange-400 to-amber-400',
          icon: <Flame className="w-8 h-8 text-amber-400 animate-bounce" />,
          typeBadge: '전술 훈련',
          badgeStyle: 'bg-amber-950/90 text-amber-300 border-amber-600',
        };
      case 'espionage':
        return {
          headerBg: 'bg-indigo-950/80 border-indigo-500/50',
          titleColor: 'text-indigo-300',
          barGradient: 'from-indigo-500 via-purple-400 to-indigo-400',
          icon: <Eye className="w-8 h-8 text-indigo-400 animate-pulse" />,
          typeBadge: '기밀 첩보',
          badgeStyle: 'bg-indigo-950/90 text-indigo-300 border-indigo-600',
        };
      case 'patrol':
        return {
          headerBg: 'bg-emerald-950/80 border-emerald-500/50',
          titleColor: 'text-emerald-300',
          barGradient: 'from-emerald-500 via-teal-400 to-emerald-400',
          icon: <Shield className="w-8 h-8 text-emerald-400 animate-pulse" />,
          typeBadge: '지역 순찰',
          badgeStyle: 'bg-emerald-950/90 text-emerald-300 border-emerald-600',
        };
      default:
        return {
          headerBg: 'bg-blue-950/80 border-blue-500/50',
          titleColor: 'text-blue-300',
          barGradient: 'from-blue-500 via-cyan-400 to-blue-400',
          icon: <Clock className="w-8 h-8 text-blue-400 animate-spin" />,
          typeBadge: '임무 진행',
          badgeStyle: 'bg-blue-950/90 text-blue-300 border-blue-600',
        };
    }
  };

  const config = getTypeConfig();
  const currentElapsedHour = Math.min(totalHours, Math.floor((progress / 100) * totalHours) + 1);

  const modalContent = (
    <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className={`w-full max-w-sm bg-slate-900 border-2 rounded-2xl p-5 shadow-2xl flex flex-col items-center text-center space-y-4 relative overflow-hidden ${config.headerBg}`}>
        
        {/* 상단 은은한 배경 광원 */}
        <div className="absolute -top-12 -left-12 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-12 -right-12 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

        {/* 상단 뱃지 */}
        <div className="flex items-center gap-1.5">
          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border ${config.badgeStyle}`}>
            {config.typeBadge}
          </span>
          <span className="text-[10px] text-slate-400 font-mono">
            ⏳ 총 {totalHours}시간 진행 중
          </span>
        </div>

        {/* 중앙 아이콘 서클 */}
        <div className="relative flex items-center justify-center my-1">
          <div className="w-16 h-16 rounded-2xl bg-slate-950/90 border border-slate-800 flex items-center justify-center shadow-inner relative z-10">
            {config.icon}
          </div>
          <div className="absolute inset-0 rounded-2xl bg-amber-500/20 blur-md animate-pulse" />
        </div>

        {/* 제목 및 설명 */}
        <div className="space-y-1 w-full">
          <h3 className={`font-black text-base sm:text-lg tracking-tight ${config.titleColor}`}>
            {title}
          </h3>
          <p className="text-xs text-slate-300 font-medium">
            {subtitle || '시간이 경과하고 있습니다. 잠시만 기다려 주십시오.'}
          </p>
        </div>

        {/* 프로그레스 바 영역 */}
        <div className="w-full space-y-2 pt-1">
          <div className="flex justify-between items-center text-xs font-bold text-slate-300 px-1">
            <span className="flex items-center gap-1 text-[11px] text-slate-400">
              <Clock size={12} className="text-slate-400" />
              {progress < 100 ? `${currentElapsedHour}시간째 수행 중...` : '작전 완수!'}
            </span>
            <span className={`font-mono text-xs ${config.titleColor}`}>
              {progress}%
            </span>
          </div>

          <div className="w-full bg-slate-950 h-3.5 rounded-full overflow-hidden p-0.5 border border-slate-800 shadow-inner">
            <div
              className={`h-full rounded-full bg-gradient-to-r ${config.barGradient} transition-all duration-75 ease-out shadow-md`}
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="text-[10px] text-slate-400 text-center font-mono">
            {progress < 100 ? `남은 진행률 ${100 - progress}%` : '결과 정산 중...'}
          </div>
        </div>

      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default ActivityProgressModal;
