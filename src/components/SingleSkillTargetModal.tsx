import React, { useState } from 'react';
import { Enemy, Character, Companion, Skill } from '../types';
import { Target, Shield, ArrowRight, ArrowLeft, Check, X, Sparkles, Sword } from 'lucide-react';

interface Props {
  isOpen: boolean;
  skill: Skill;
  casterName: string;
  enemies: Enemy[];
  player: Character;
  companions: Companion[];
  onConfirm: (attackTargetName: string, buffTargetName: string) => void;
  onClose: () => void;
}

export const SingleSkillTargetModal: React.FC<Props> = ({
  isOpen,
  skill,
  casterName,
  enemies,
  player,
  companions,
  onConfirm,
  onClose
}) => {
  if (!isOpen) return null;

  // 살아있는 적목록
  const livingEnemies = enemies.filter(e => e.hp > 0);
  // 살아있는 아군목록 (플레이어 + 동료)
  const livingAllies: { id: string; name: string; hp: number; maxHp: number; job?: string }[] = [];
  
  if (player.stats.hp > 0 && !player.isDead) {
    livingAllies.push({
      id: 'player',
      name: player.name,
      hp: player.stats.hp,
      maxHp: player.stats.maxHp,
      job: player.firstClassName
    });
  }

  companions.forEach(comp => {
    if (comp.stats.hp > 0 && !comp.isDead) {
      livingAllies.push({
        id: comp.id,
        name: comp.name,
        hp: comp.stats.hp,
        maxHp: comp.stats.maxHp,
        job: comp.firstClassName
      });
    }
  });

  // [요청 반영] 아군(버프 대상)을 먼저 선택하고, 공격(적 대상)을 나중에 선택하도록 설정
  const [selectedAlly, setSelectedAlly] = useState<string>(casterName || player.name);
  const [selectedEnemy, setSelectedEnemy] = useState<string>(livingEnemies[0]?.name || '적군');
  const [step, setStep] = useState<'ally' | 'enemy'>('ally');

  const handleConfirm = () => {
    onConfirm(selectedEnemy, selectedAlly);
  };

  return (
    <div className="fixed inset-0 z-[250] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-2 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-amber-500/50 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-slate-100">
        
        {/* 모달 헤더 */}
        <div className="p-3 sm:p-4 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <Sparkles size={18} />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-amber-300 leading-tight">
                {skill.name}
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                버프 부여 대상과 공격 대상을 차례대로 선택하세요
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-all active:scale-95"
          >
            <X size={18} />
          </button>
        </div>

        {/* 단계 진행바 (모바일 최적화: 1단계 아군 버프 -> 2단계 적 공격) */}
        <div className="grid grid-cols-2 gap-1 p-2 bg-slate-950/40 border-b border-slate-800 text-xs font-bold text-center shrink-0">
          <button
            type="button"
            onClick={() => setStep('ally')}
            className={`py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              step === 'ally'
                ? 'bg-cyan-950/80 border border-cyan-600/60 text-cyan-300 shadow-lg'
                : 'bg-slate-900/60 text-slate-400 border border-slate-800'
            }`}
          >
            <Shield size={14} className="text-cyan-400" />
            <span>1단계: 버프 대상</span>
            {selectedAlly && <Check size={12} className="text-cyan-400" />}
          </button>

          <button
            type="button"
            onClick={() => setStep('enemy')}
            className={`py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              step === 'enemy'
                ? 'bg-rose-950/80 border border-rose-600/60 text-rose-300 shadow-lg'
                : 'bg-slate-900/60 text-slate-400 border border-slate-800'
            }`}
          >
            <Sword size={14} className="text-rose-400" />
            <span>2단계: 공격 대상</span>
            {selectedEnemy && <Check size={12} className="text-rose-400" />}
          </button>
        </div>

        {/* 선택 영역 컨텐츠 */}
        <div className="p-3 sm:p-4 overflow-y-auto space-y-3 flex-1">
          {step === 'ally' ? (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-cyan-300 flex items-center gap-1">
                  <Shield size={14} /> 버프를 부여할 아군 선택
                </span>
                <span className="text-[11px] text-slate-400 font-mono">
                  선택됨: {selectedAlly}
                </span>
              </div>
              <div className="space-y-2">
                {livingAllies.map(ally => {
                  const isSelected = selectedAlly === ally.name;
                  const hpPercent = Math.max(0, Math.min(100, (ally.hp / ally.maxHp) * 100));

                  return (
                    <button
                      key={ally.id}
                      type="button"
                      onClick={() => {
                        setSelectedAlly(ally.name);
                        setStep('enemy');
                      }}
                      className={`w-full p-3 rounded-xl border text-left transition-all flex items-center justify-between active:scale-[0.98] ${
                        isSelected
                          ? 'bg-cyan-950/60 border-cyan-500/80 text-cyan-100 shadow-md ring-1 ring-cyan-500/50'
                          : 'bg-slate-800/40 border-slate-700/60 text-slate-300 hover:bg-slate-800/80'
                      }`}
                    >
                      <div className="flex-1 min-w-0 pr-2">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm truncate">{ally.name}</span>
                          {ally.job && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-950/80 border border-cyan-800/60 text-cyan-300">
                              {ally.job}
                            </span>
                          )}
                        </div>
                        {/* HP 게이지 */}
                        <div className="w-full bg-slate-900 rounded-full h-1.5 mt-2 overflow-hidden border border-slate-800">
                          <div
                            className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                            style={{ width: `${hpPercent}%` }}
                          />
                        </div>
                      </div>
                      <div className="text-right font-mono text-xs text-cyan-300 shrink-0">
                        {ally.hp} / {ally.maxHp}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-rose-300 flex items-center gap-1">
                  <Target size={14} /> 타격할 적 선택
                </span>
                <span className="text-[11px] text-slate-400 font-mono">
                  선택됨: {selectedEnemy}
                </span>
              </div>
              <div className="space-y-2">
                {livingEnemies.map(enemy => {
                  const isSelected = selectedEnemy === enemy.name;
                  const hpPercent = Math.max(0, Math.min(100, (enemy.hp / enemy.maxHp) * 100));

                  return (
                    <button
                      key={enemy.id || enemy.name}
                      type="button"
                      onClick={() => setSelectedEnemy(enemy.name)}
                      className={`w-full p-3 rounded-xl border text-left transition-all flex items-center justify-between active:scale-[0.98] ${
                        isSelected
                          ? 'bg-rose-950/60 border-rose-500/80 text-rose-100 shadow-md ring-1 ring-rose-500/50'
                          : 'bg-slate-800/40 border-slate-700/60 text-slate-300 hover:bg-slate-800/80'
                      }`}
                    >
                      <div className="flex-1 min-w-0 pr-2">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm truncate">{enemy.name}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-950/80 border border-rose-800/60 text-rose-300 font-mono">
                            Lv.{enemy.level}
                          </span>
                        </div>
                        {/* HP 게이지 */}
                        <div className="w-full bg-slate-900 rounded-full h-1.5 mt-2 overflow-hidden border border-slate-800">
                          <div
                            className="bg-rose-500 h-full rounded-full transition-all duration-300"
                            style={{ width: `${hpPercent}%` }}
                          />
                        </div>
                      </div>
                      <div className="text-right font-mono text-xs text-rose-300 shrink-0">
                        {enemy.hp} / {enemy.maxHp}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* 모달 푸터 버튼 */}
        <div className="p-3 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between gap-2 shrink-0">
          <div className="text-xs text-slate-400 font-mono truncate">
            버프: <span className="text-cyan-300 font-bold">{selectedAlly}</span> / 공격: <span className="text-rose-300 font-bold">{selectedEnemy}</span>
          </div>

          <div className="flex items-center gap-2">
            {step === 'ally' ? (
              <button
                type="button"
                onClick={() => setStep('enemy')}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-bold text-xs rounded-xl transition-all flex items-center gap-1 shadow-md"
              >
                <span>다음: 공격 대상</span>
                <ArrowRight size={14} />
              </button>
            ) : (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setStep('ally')}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-300 font-bold text-xs rounded-xl transition-all flex items-center gap-1"
                >
                  <ArrowLeft size={13} />
                  <span>이전</span>
                </button>
                <button
                  type="button"
                  onClick={handleConfirm}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold text-xs rounded-xl transition-all flex items-center gap-1 shadow-md"
                >
                  <Check size={14} />
                  <span>발동 확정</span>
                </button>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
