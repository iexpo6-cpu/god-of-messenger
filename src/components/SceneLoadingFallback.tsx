import React, { useState, useEffect } from 'react';
import { Sword, Building2, Landmark, Zap, Sparkles, Loader2, Compass } from 'lucide-react';

export type LoadingMode = 'combat' | 'city' | 'base' | 'dungeon' | 'general';

interface SceneLoadingFallbackProps {
  mode?: LoadingMode;
  title?: string;
  hint?: string;
  fullScreen?: boolean;
}

const MODE_CONFIG: Record<LoadingMode, {
  defaultTitle: string;
  defaultHint: string;
  icon: React.ComponentType<{ className?: string; size?: number }>;
  themeColor: string;
  borderColor: string;
  barColor: string;
  bgGradient: string;
  tips: string[];
}> = {
  combat: {
    defaultTitle: '전장으로 진입하는 중...',
    defaultHint: '전투 환경과 적 부대 데이터를 동기화하고 있습니다.',
    icon: Sword,
    themeColor: 'text-rose-400',
    borderColor: 'border-rose-500/50',
    barColor: 'from-rose-600 via-amber-500 to-rose-400',
    bgGradient: 'from-slate-950 via-rose-950/20 to-slate-950',
    tips: [
      '속성 상성과 스킬 연계를 활용하면 강력한 보스도 수월하게 공략할 수 있습니다.',
      '전열과 후열의 배치에 따라 적의 집중 공격 위험이 달라집니다.',
      '분노와 스킬 쿨다운을 전략적으로 관리하여 결정타를 날리십시오.'
    ]
  },
  city: {
    defaultTitle: '도시 구역으로 진입하는 중...',
    defaultHint: '도시 시설, 상단 가판대, 거주민 정보를 불러오는 중입니다.',
    icon: Building2,
    themeColor: 'text-amber-400',
    borderColor: 'border-amber-500/50',
    barColor: 'from-amber-600 via-yellow-400 to-amber-500',
    bgGradient: 'from-slate-950 via-amber-950/20 to-slate-950',
    tips: [
      '전쟁 중인 국가는 물자 공급이 부족하여 평소보다 비싼 가격에 물품을 매입해 줍니다.',
      '밤 22시부터 새벽 04시 사이에는 뒷골목에 비밀 심야 암시장이 열립니다.',
      '도시 중앙 광장에서 시민들과 교류하거나 소문을 들을 수 있습니다.'
    ]
  },
  base: {
    defaultTitle: '비밀 기지로 이동하는 중...',
    defaultHint: '기지 시설, 거주민 배치 및 생산 현황을 확인하고 있습니다.',
    icon: Landmark,
    themeColor: 'text-cyan-400',
    borderColor: 'border-cyan-500/50',
    barColor: 'from-cyan-600 via-teal-400 to-emerald-400',
    bgGradient: 'from-slate-950 via-cyan-950/20 to-slate-950',
    tips: [
      '거주민의 적성에 맞는 시설에 배치하면 생산 효율과 숙련도가 대폭 증가합니다.',
      '주기적인 기지 방어벽 점검은 불시의 마물 습격 피해를 줄여줍니다.',
      '창고와 작업장 레벨을 올려 대량의 희귀 재료를 비축하십시오.'
    ]
  },
  dungeon: {
    defaultTitle: '던전 심연으로 진입하는 중...',
    defaultHint: '미지의 공간 왜곡과 마물 서식지를 탐색하고 있습니다.',
    icon: Zap,
    themeColor: 'text-purple-400',
    borderColor: 'border-purple-500/50',
    barColor: 'from-purple-600 via-fuchsia-400 to-indigo-400',
    bgGradient: 'from-slate-950 via-purple-950/25 to-slate-950',
    tips: [
      '던전 깊은 층으로 갈수록 희귀한 유물과 강력한 보스가 기다리고 있습니다.',
      '위기 상황에서는 무리한 진행보다 안전한 탈출을 선택하는 것도 지혜입니다.',
      '차원의 틈새가 감지되면 전설적인 신화 보스가 출현할 수 있습니다.'
    ]
  },
  general: {
    defaultTitle: '대륙의 서사를 불러오는 중...',
    defaultHint: '게임 리소스와 세계선 데이터를 준비하고 있습니다.',
    icon: Sparkles,
    themeColor: 'text-amber-300',
    borderColor: 'border-amber-500/40',
    barColor: 'from-indigo-600 via-purple-500 to-amber-400',
    bgGradient: 'from-slate-950 via-slate-900 to-slate-950',
    tips: [
      '신의 사자로서 당신의 선택이 대륙 전역의 정세와 국가 간 세력도를 변화시킵니다.',
      '동료들과의 인연을 깊게 쌓으면 특별한 합동기(Bond Skill)를 사용할 수 있습니다.',
      '규칙적인 휴식과 수면은 피로도를 회복하고 컨디션을 최상으로 유지해 줍니다.'
    ]
  }
};

export const SceneLoadingFallback: React.FC<SceneLoadingFallbackProps> = ({
  mode = 'general',
  title,
  hint,
  fullScreen = true
}) => {
  const config = MODE_CONFIG[mode];
  const Icon = config.icon;

  // 부드럽게 증가하는 가상 진행률 (25% -> 92%)
  const [progress, setProgress] = useState(25);
  const [randomTipIndex, setRandomTipIndex] = useState(0);

  useEffect(() => {
    setRandomTipIndex(Math.floor(Math.random() * config.tips.length));

    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 92) return 92;
        // 점점 느려지면서 부드럽게 전진
        const delta = Math.max(1, Math.round((95 - prev) * 0.18));
        return Math.min(92, prev + delta);
      });
    }, 70);

    return () => clearInterval(interval);
  }, [config]);

  const displayTitle = title || config.defaultTitle;
  const displayHint = hint || config.defaultHint;
  const currentTip = config.tips[randomTipIndex];

  return (
    <div
      className={`${
        fullScreen ? 'fixed inset-0 z-[99999]' : 'w-full h-full min-h-[380px]'
      } flex flex-col items-center justify-center p-4 bg-slate-950/95 backdrop-blur-md select-none animate-fadeIn`}
    >
      <style>{`
        @keyframes shimmerGlow {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        .animate-shimmer-glow {
          background-size: 200% 100%;
          animation: shimmerGlow 1.8s infinite linear;
        }
        @keyframes pulseRing {
          0% { transform: scale(0.95); opacity: 0.6; }
          50% { transform: scale(1.08); opacity: 0.2; }
          100% { transform: scale(0.95); opacity: 0.6; }
        }
        .animate-pulse-ring {
          animation: pulseRing 2.2s infinite ease-in-out;
        }
      `}</style>

      {/* 배경 장식 원형 오라 */}
      <div className={`w-full max-w-md bg-gradient-to-b ${config.bgGradient} border ${config.borderColor} rounded-2xl p-6 sm:p-8 shadow-[0_0_50px_rgba(0,0,0,0.85)] flex flex-col items-center text-center relative overflow-hidden`}>
        
        {/* 상단 장식 빛 */}
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-48 h-20 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

        {/* 중앙 심볼 아이콘 (회전 링 + 메인 아이콘) */}
        <div className="relative mb-5 flex items-center justify-center">
          {/* 외곽 회전 링 */}
          <div className="absolute w-20 h-20 rounded-full border-2 border-dashed border-slate-700 animate-spin-slow pointer-events-none opacity-60" />
          
          {/* 맥동하는 빛 링 */}
          <div className={`absolute w-16 h-16 rounded-full border ${config.borderColor} animate-pulse-ring pointer-events-none`} />

          {/* 중앙 아이콘 서클 */}
          <div className="w-14 h-14 rounded-full bg-slate-900 border-2 border-slate-800 flex items-center justify-center relative shadow-inner z-10">
            <Icon size={26} className={`${config.themeColor} animate-pulse`} />
          </div>
        </div>

        {/* 타이틀 및 서브 문구 */}
        <div className="space-y-1.5 mb-5">
          <h2 className="text-base sm:text-lg font-black text-slate-100 tracking-wide flex items-center justify-center gap-2">
            <span>{displayTitle}</span>
            <Loader2 size={16} className={`${config.themeColor} animate-spin shrink-0`} />
          </h2>
          <p className="text-xs text-slate-400 break-keep max-w-xs mx-auto font-medium">
            {displayHint}
          </p>
        </div>

        {/* 메인 로딩 바 (고급 게이지 & 쉬머 이펙트) */}
        <div className="w-full space-y-2 mb-4">
          <div className="flex items-center justify-between text-[11px] font-mono font-bold px-0.5">
            <span className="text-slate-400">LOADING...</span>
            <span className={`${config.themeColor}`}>{progress}%</span>
          </div>

          <div className="w-full bg-slate-900 h-3.5 rounded-full overflow-hidden border border-slate-800 p-0.5 shadow-inner relative">
            <div
              className={`h-full rounded-full bg-gradient-to-r ${config.barColor} animate-shimmer-glow transition-all duration-150 ease-out shadow-sm`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* 하단 유용한 게임 팁 박스 */}
        {currentTip && (
          <div className="w-full bg-slate-950/70 border border-slate-800/80 rounded-xl p-3 text-left mt-1 backdrop-blur-sm">
            <div className="flex items-center gap-1.5 text-amber-400 text-[11px] font-bold mb-1">
              <Compass size={12} className="shrink-0 animate-spin-slow" />
              <span>모험 가이드 팁</span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed break-keep font-medium">
              {currentTip}
            </p>
          </div>
        )}

      </div>
    </div>
  );
};

export default SceneLoadingFallback;
