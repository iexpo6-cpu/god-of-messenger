import React, { useState, useEffect } from 'react';
import { Sparkles, Zap, Flame, Shield, ArrowUpRight, Award, CheckCircle2, ChevronRight } from 'lucide-react';
import { CapturedMonster, MonsterStage } from '../types';

interface MonsterEvolutionModalProps {
  prevMonster: {
    name: string;
    stage: MonsterStage | string;
    appearance?: string;
    stats?: any;
    rank?: string;
  };
  nextMonster: {
    name: string;
    stage: MonsterStage | string;
    appearance?: string;
    stats?: any;
    rank?: string;
    skills?: any[];
  };
  onClose: () => void;
}

export const MonsterEvolutionModal: React.FC<MonsterEvolutionModalProps> = ({
  prevMonster,
  nextMonster,
  onClose
}) => {
  // Phase 0: 마력 집속 (0s ~ 1.2s)
  // Phase 1: 빛의 실루엣 실루엣 반짝임 (1.2s ~ 3.2s)
  // Phase 2: 대형 섬광 폭발 (3.2s ~ 3.8s)
  // Phase 3: 진화 성공 화면 (3.8s ~ )
  const [phase, setPhase] = useState<0 | 1 | 2 | 3>(0);
  const [isConfirming, setIsConfirming] = useState(false);

  useEffect(() => {
    const timer1 = setTimeout(() => setPhase(1), 1200);
    const timer2 = setTimeout(() => setPhase(2), 3200);
    const timer3 = setTimeout(() => setPhase(3), 3800);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, []);

  const getStageBadgeColor = (stage: string) => {
    switch (stage) {
      case '알': case MonsterStage.EGG: return 'bg-amber-950 text-amber-300 border-amber-700';
      case '유아기': case MonsterStage.BABY: return 'bg-emerald-950 text-emerald-300 border-emerald-700';
      case '성장기': case MonsterStage.CHILD: return 'bg-cyan-950 text-cyan-300 border-cyan-700';
      case '성숙기': case MonsterStage.ADULT: return 'bg-blue-950 text-blue-300 border-blue-700';
      case '완전체': case MonsterStage.PERFECT: return 'bg-purple-950 text-purple-300 border-purple-700';
      case '궁극체': case MonsterStage.ULTIMATE: return 'bg-rose-950 text-rose-300 border-rose-700';
      default: return 'bg-indigo-950 text-indigo-300 border-indigo-700';
    }
  };

  const getStageTitle = (stage: string) => {
    switch (stage) {
      case '알': case MonsterStage.EGG: return '알';
      case '유아기': case MonsterStage.BABY: return '유아기';
      case '성장기': case MonsterStage.CHILD: return '성장기';
      case '성숙기': case MonsterStage.ADULT: return '성숙기';
      case '완전체': case MonsterStage.PERFECT: return '완전체';
      case '궁극체': case MonsterStage.ULTIMATE: return '궁극체';
      default: return stage;
    }
  };

  return (
    <div className="fixed inset-0 z-[300] bg-black/95 backdrop-blur-xl flex flex-col justify-between items-center p-4 sm:p-6 select-none overflow-hidden animate-in fade-in duration-300">
      {/* 배경 디지털/마력 오라 회전 효과 */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-hidden">
        {/* 마법진 링 1 */}
        <div className={`w-[320px] h-[320px] sm:w-[500px] sm:h-[500px] rounded-full border-2 border-dashed border-cyan-500/40 animate-[spin_20s_linear_infinite] transition-all duration-700 ${phase >= 1 ? 'scale-125 border-amber-400/60' : 'scale-90'}`} />
        {/* 마법진 링 2 */}
        <div className={`absolute w-[240px] h-[240px] sm:w-[380px] sm:h-[380px] rounded-full border border-indigo-400/50 animate-[spin_12s_linear_infinite_reverse] transition-all duration-700 ${phase >= 2 ? 'scale-150 border-rose-500/80' : 'scale-100'}`} />
        {/* 중앙 빛줄기 광륜 */}
        <div className={`absolute w-full h-full bg-gradient-to-t from-amber-500/10 via-cyan-500/10 to-transparent transition-opacity duration-1000 ${phase >= 1 ? 'opacity-100' : 'opacity-20'}`} />
      </div>

      {/* 섬광 효과 (Phase 2) */}
      {phase === 2 && (
        <div className="absolute inset-0 z-[350] bg-white animate-pulse" />
      )}

      {/* 상단 타오르는 타이틀 / 상태 */}
      <div className="relative z-10 w-full max-w-lg text-center pt-2 sm:pt-4">
        {phase < 3 ? (
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-500/50 text-cyan-300 text-xs font-bold animate-pulse">
              <Zap size={14} className="text-amber-400" />
              <span>마력 반응 집속 중</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-amber-200 to-rose-400 tracking-tight animate-bounce">
              {prevMonster.name} 진화 중...!
            </h2>
            <p className="text-xs text-slate-400 font-medium">
              {phase === 0 && '몬스터의 내부 마력이 격동하기 시작합니다.'}
              {phase === 1 && '빛의 와류가 감싸며 새로운 형태가 각성하고 있습니다!'}
              {phase === 2 && '차원의 빛이 번쩍입니다!'}
            </p>
          </div>
        ) : (
          <div className="space-y-2 animate-in zoom-in duration-500">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-950/80 border border-amber-500/50 text-amber-300 text-xs font-bold shadow-[0_0_15px_rgba(245,158,11,0.3)]">
              <Sparkles size={14} className="text-amber-400 animate-spin" />
              <span>진화 완전 성공</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-amber-300 tracking-tight drop-shadow-[0_0_20px_rgba(245,158,11,0.5)]">
              {nextMonster.name} 각성!
            </h2>
            <p className="text-xs text-emerald-400 font-bold">
              {getStageTitle(prevMonster.stage)} → {getStageTitle(nextMonster.stage)} 단계로 성공적으로 도달했습니다!
            </p>
          </div>
        )}
      </div>

      {/* 메인 비주얼 영역 (디지몬식 실루엣 변환 연출) */}
      <div className="relative z-10 my-auto flex flex-col items-center justify-center w-full max-w-sm">
        <div className="relative w-48 h-48 sm:w-60 sm:h-60 flex items-center justify-center">
          {/* 뒤쪽 후광 / 아우라 */}
          <div className={`absolute inset-0 rounded-full bg-gradient-to-r from-amber-500/30 via-rose-500/30 to-cyan-500/30 blur-2xl transition-all duration-700 ${phase === 1 ? 'scale-125 opacity-100' : phase === 3 ? 'scale-110 opacity-80' : 'scale-75 opacity-30'}`} />

          {/* Phase 0 & 1: 이전 몬스터 실루엣/이미지 */}
          {phase < 3 && (
            <div className={`relative transition-all duration-500 flex items-center justify-center ${phase === 1 ? 'animate-pulse scale-110 filter brightness-200 contrast-200 drop-shadow-[0_0_25px_rgba(255,255,255,0.9)]' : 'scale-100'}`}>
              {prevMonster.appearance ? (
                <img
                  src={prevMonster.appearance}
                  alt={prevMonster.name}
                  referrerPolicy="no-referrer"
                  className={`w-36 h-36 sm:w-44 sm:h-44 object-contain ${phase === 1 ? 'brightness-0 invert drop-shadow-[0_0_30px_rgba(59,130,246,1)]' : ''}`}
                />
              ) : (
                <div className="w-36 h-36 sm:w-44 sm:h-44 rounded-full bg-slate-800 border-2 border-slate-600 flex items-center justify-center text-4xl font-bold text-amber-400">
                  🐾
                </div>
              )}
            </div>
          )}

          {/* Phase 3: 진화 완료된 새로운 몬스터 외형 */}
          {phase === 3 && (
            <div className="relative animate-in zoom-in duration-500 flex items-center justify-center">
              <div className="absolute -inset-4 rounded-full border-2 border-amber-400/60 animate-ping opacity-30" />
              {(nextMonster.appearance || prevMonster.appearance) ? (
                <img
                  src={nextMonster.appearance || prevMonster.appearance}
                  alt={nextMonster.name}
                  referrerPolicy="no-referrer"
                  className="w-40 h-40 sm:w-48 sm:h-48 object-contain drop-shadow-[0_0_30px_rgba(245,158,11,0.6)]"
                />
              ) : (
                <div className="w-40 h-40 sm:w-48 sm:h-48 rounded-full bg-gradient-to-tr from-amber-900 to-rose-900 border-2 border-amber-400 flex items-center justify-center text-5xl font-bold text-amber-200 shadow-2xl">
                  🐲
                </div>
              )}
            </div>
          )}
        </div>

        {/* 진화 단계 뱃지 카드 비교 */}
        <div className="mt-4 flex items-center justify-center gap-3 w-full">
          <div className="flex flex-col items-center">
            <span className="text-[10px] text-slate-400 mb-1">진화 전</span>
            <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${getStageBadgeColor(prevMonster.stage)}`}>
              {getStageTitle(prevMonster.stage)}
            </span>
          </div>

          <ChevronRight size={20} className={`transition-all ${phase >= 3 ? 'text-amber-400 scale-125' : 'text-slate-600'}`} />

          <div className="flex flex-col items-center">
            <span className="text-[10px] text-slate-400 mb-1">진화 후</span>
            <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${getStageBadgeColor(nextMonster.stage)} ${phase >= 3 ? 'animate-bounce shadow-[0_0_10px_rgba(245,158,11,0.5)]' : 'opacity-50'}`}>
              {getStageTitle(nextMonster.stage)}
            </span>
          </div>
        </div>
      </div>

      {/* 하단 보상 및 능력치 변화 요약 (Phase 3 전용) */}
      <div className="relative z-10 w-full max-w-md pb-2 sm:pb-4">
        {phase === 3 ? (
          <div className="bg-slate-900/90 border border-amber-500/40 rounded-2xl p-4 space-y-3 shadow-2xl animate-in slide-in-from-bottom-5 duration-500">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                <Award size={14} className="text-amber-400" /> 능력치 전면 상승
              </span>
              <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-700/50">
                전체 스탯 +50% 보너스
              </span>
            </div>

            {/* 습득 스킬 및 랭크 안내 */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-slate-950/70 p-2 rounded-xl border border-slate-800">
                <div className="text-[10px] text-slate-400">몬스터 등급</div>
                <div className="font-bold text-amber-400 mt-0.5">{nextMonster.rank || 'A'} 랭크</div>
              </div>
              <div className="bg-slate-950/70 p-2 rounded-xl border border-slate-800">
                <div className="text-[10px] text-slate-400">신규 스킬</div>
                <div className="font-bold text-cyan-300 mt-0.5 truncate">
                  {nextMonster.skills && nextMonster.skills.length > 0
                    ? nextMonster.skills[nextMonster.skills.length - 1]?.name || '고유 스킬 개방'
                    : '마력 진화 스킬'}
                </div>
              </div>
            </div>

            <button
              disabled={isConfirming}
              onClick={() => {
                if (isConfirming) return;
                setIsConfirming(true);
                onClose();
              }}
              className="w-full py-3 bg-gradient-to-r from-amber-600 via-amber-500 to-yellow-500 hover:from-amber-500 hover:to-yellow-400 text-slate-950 rounded-xl font-extrabold text-sm shadow-[0_0_20px_rgba(245,158,11,0.4)] transition-all active:scale-98 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <CheckCircle2 size={16} />
              <span>진화 확인 및 닫기</span>
            </button>
          </div>
        ) : (
          <div className="text-center text-xs text-slate-500 py-2">
            진화 진행 중... 잠시만 기다려주세요.
          </div>
        )}
      </div>
    </div>
  );
};

export default MonsterEvolutionModal;
