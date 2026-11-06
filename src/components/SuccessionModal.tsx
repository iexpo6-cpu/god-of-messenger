
import React, { useState } from 'react';
import { Character, Companion, Skill, Stats, ClassTier } from '../types';
import { getSuccessors, calculateSuccessionRatio } from '../services/deathTimeEngine';
import { Crown, Skull, Heart, Shield, Users, TrendingUp,ArrowRight, AlertTriangle, Star, Sparkles, BookOpen, ChevronRight, CheckCircle, Zap } from 'lucide-react';

interface Props {
  character: Character;
  onSelectSuccessor: (successor: Companion, inheritedSkill?: Skill) => void;
  onGameOver: () => void;
}

type Step = 'successor' | 'skill' | 'review';

const getTierRank = (tier: ClassTier | string | undefined | null): number => {
  if (!tier) return 0;
  switch (tier) {
    case ClassTier.NONE:
    case 'NONE':
    case '없음':
    case ClassTier.F:
    case 'F':
      return 0;
    case ClassTier.FIRST:
    case 'FIRST':
    case '퍼스트 클래스':
      return 1;
    case ClassTier.SECOND:
    case 'SECOND':
    case '세컨드 클래스':
      return 2;
    case ClassTier.LAST:
    case 'LAST':
    case '라스트 클래스':
      return 3;
    case ClassTier.FINAL:
    case 'FINAL':
    case '파이널 클래스':
      return 4;
    case ClassTier.BOND:
    case 'BOND':
    case '인연':
      return 5;
    default:
      return 0;
  }
};

const SuccessionModal: React.FC<Props> = ({ character, onSelectSuccessor, onGameOver }) => {
  const [step, setStep] = useState<Step>('successor');
  const [chosenSuccessor, setChosenSuccessor] = useState<Companion | null>(null);
  const [chosenSkill, setChosenSkill] = useState<Skill | null>(null);

  const candidates = getSuccessors(character);
  const ratio = calculateSuccessionRatio(character);

  const handlePickSuccessor = (successor: Companion) => {
      setChosenSuccessor(successor);
      const successorTierRank = getTierRank(successor.classTier);
      
      // 전승 가능한 기술이 최소 하나 이상 있는지 확인 (BOND는 항상 전승 가능, 아니면 클래스 랭크 이하)
      const hasInheritableSkills = character.skills.some(skill => {
          if (skill.tier === ClassTier.BOND) return true;
          return getTierRank(skill.tier) <= successorTierRank;
      });

      if (hasInheritableSkills) {
          setStep('skill');
      } else {
          setStep('review');
      }
  };

  const handlePickSkill = (skill: Skill) => {
      setChosenSkill(skill);
      setStep('review');
  };

  const finalize = () => {
      if (chosenSuccessor) {
          onSelectSuccessor(chosenSuccessor, chosenSkill || undefined);
      }
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/95 backdrop-blur-xl p-4 animate-in fade-in duration-700">
      <div className="bg-slate-900 border-2 border-amber-600/50 w-full max-w-2xl h-[85vh] rounded-[3rem] shadow-[0_0_100px_rgba(245,158,11,0.3)] flex flex-col overflow-hidden relative">
        
        {/* Background Overlay */}
        <div className="absolute inset-0 opacity-10 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/black-scales.png')]"></div>
        
        <div className="p-8 border-b border-amber-900/30 bg-gradient-to-b from-amber-950/40 to-slate-900 text-center shrink-0 relative z-10">
          {step === 'successor' && <Skull size={48} className="mx-auto text-slate-500 mb-4 animate-pulse" />}
          {step === 'skill' && <BookOpen size={48} className="mx-auto text-indigo-400 mb-4 animate-bounce-short" />}
          {step === 'review' && <Sparkles size={48} className="mx-auto text-amber-400 mb-4 animate-spin-slow" />}
          
          <h2 className="text-3xl font-bold text-white font-cinzel tracking-tighter mb-1">
              {step === 'successor' ? 'END OF AN ERA' : step === 'skill' ? 'FAMILY LEGACY' : 'THE NEW HEAD'}
          </h2>
          <p className="text-amber-500 font-bold uppercase tracking-[0.3em] text-[10px]">
              {step === 'successor' ? '가주의 서거와 대물림' : step === 'skill' ? '가문의 비기 전수' : '새로운 가주의 즉위'}
          </p>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-8 relative z-10">
          
          {/* STEP 1: SELECT SUCCESSOR */}
          {step === 'successor' && (
              candidates.length > 0 ? (
                <div className="space-y-6">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-widest px-2">
                    <Crown size={14} className="text-amber-500"/> 승계 가능한 가문 구성원
                  </div>
                  <div className="grid grid-cols-1 gap-3">
                    {candidates.map((cand, idx) => {
                      const isSpouse = cand.isSpouse && cand.partnerId === 'player';
                      const age = parseInt(cand.age.replace(/[^0-9]/g, '')) || 0;
                      const isChild = (cand.classType.includes('자녀') || cand.classType.includes('Child')) && age >= 20;

                      return (
                        <button
                          key={cand.id}
                          onClick={() => handlePickSuccessor(cand)}
                          className="w-full bg-slate-950 border border-slate-800 hover:border-amber-500 p-5 rounded-[1.5rem] flex items-center justify-between group transition-all transform hover:scale-[1.02] active:scale-95"
                        >
                          <div className="flex items-center gap-5 text-left">
                            <div className={`p-3 rounded-2xl bg-slate-900 border ${isSpouse ? 'border-pink-500 text-pink-400' : isChild ? 'border-green-500 text-green-400' : 'border-blue-500 text-blue-400'} group-hover:scale-110 transition-transform`}>
                              {isSpouse ? <Heart size={24}/> : isChild ? <Users size={24}/> : <Shield size={24}/>}
                            </div>
                            <div>
                              <div className="text-lg font-bold text-white flex items-center gap-2">
                                {cand.name}
                                {idx === 0 && <span className="text-[8px] bg-amber-600 text-white px-1.5 py-0.5 rounded font-black">1순위</span>}
                              </div>
                              <div className="text-xs text-slate-500 mt-1">
                                {cand.age} • {cand.race} • {isSpouse ? '가주의 배우자' : isChild ? '성인 자녀' : '충직한 동료'}
                              </div>
                            </div>
                          </div>
                          <ArrowRight className="text-slate-700 group-hover:text-amber-500 transition-colors" />
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-10 text-center space-y-6">
                  <div className="p-8 bg-red-955/20 rounded-full border border-red-900/50">
                    <AlertTriangle size={64} className="text-red-500" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-white">가문의 대가 끊겼습니다</h3>
                    <p className="text-sm text-slate-400 mt-2 leading-relaxed">
                      유산을 이어받을 배우자도, 자녀도, 신뢰할 수 있는 동료도 생존해 있지 않습니다.<br/>
                      가문은 역사 속으로 사라집니다.
                    </p>
                  </div>
                  <button 
                    onClick={onGameOver}
                    className="px-12 py-4 bg-red-800 hover:bg-red-700 text-white font-bold rounded-2xl shadow-xl transition-all"
                  >
                    영원한 안식 (Game Over)
                  </button>
                </div>
              )
          )}

          {/* STEP 2: SELECT INHERITED SKILL */}
          {step === 'skill' && chosenSuccessor && (
              <div className="space-y-6 animate-in slide-in-from-right-4">
                  <div className="bg-slate-950 p-6 rounded-3xl border border-indigo-500/30 text-center space-y-2">
                      <p className="text-sm text-slate-300 font-bold">
                          전대 가주의 무수한 기술 중 후계자에게 전수할 단 하나의 비기를 선택하십시오.
                      </p>
                      <p className="text-[10px] text-slate-500 font-medium">
                          계승자의 현재 클래스 단계 이하의 기술만 전수받을 수 있습니다. (BOND스킬 제외)
                      </p>
                  </div>
                  <div className="grid grid-cols-1 gap-3">
                      {character.skills.map((skill, idx) => {
                          const successorTierRank = getTierRank(chosenSuccessor.classTier);
                          const skillTierRank = getTierRank(skill.tier);
                          const isAllowed = skill.tier === ClassTier.BOND || 
                                            skillTierRank <= successorTierRank;

                          return (
                              <button
                                key={idx}
                                disabled={!isAllowed}
                                onClick={() => isAllowed && handlePickSkill(skill)}
                                className={`w-full p-4 border rounded-[1.25rem] text-left flex justify-between items-center transition-all ${
                                    isAllowed 
                                        ? "bg-slate-950 border-slate-800 hover:border-indigo-500 hover:scale-[1.01] group cursor-pointer" 
                                        : "bg-slate-950/40 border-slate-900/50 opacity-40 cursor-not-allowed"
                                }`}
                              >
                                  <div className="flex-1 min-w-0 pr-4">
                                      <h4 className={`font-bold truncate ${isAllowed ? "text-white group-hover:text-indigo-300" : "text-slate-500"}`}>
                                          {skill.name}
                                      </h4>
                                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                                          <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">
                                              {skill.tier} • Lv.{skill.level}
                                          </span>
                                          {!isAllowed && (
                                              <span className="text-[9px] bg-red-950 text-red-400 border border-red-900/40 px-1.5 py-0.5 rounded font-black">
                                                  계승자 클래스 미달로 전수 불가
                                              </span>
                                          )}
                                      </div>
                                  </div>
                                  {isAllowed ? (
                                      <ChevronRight className="text-slate-700 group-hover:text-indigo-500 shrink-0"/>
                                  ) : (
                                      <AlertTriangle size={16} className="text-red-900 shrink-0"/>
                                  )}
                              </button>
                          );
                      })}
                      <button 
                        onClick={() => setStep('review')}
                        className="w-full p-4 bg-slate-900 border border-slate-800 text-slate-500 text-sm font-bold rounded-xl italic text-center hover:text-slate-300 cursor-pointer"
                      >
                          아무것도 전수하지 않음
                      </button>
                  </div>
              </div>
          )}

          {/* STEP 3: REVIEW & FINALIZE */}
          {step === 'review' && chosenSuccessor && (
              <div className="space-y-8 animate-in zoom-in-95">
                  <div className="text-center">
                      <h3 className="text-2xl font-black text-white mb-2">{chosenSuccessor.name}, 새로운 전설의 시작</h3>
                      <p className="text-sm text-slate-400">가문의 유전적 특성과 비기를 계승한 최종 상태를 확인하십시오.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Stat Inheritance Review */}
                      <div className="bg-slate-950 p-6 rounded-3xl border border-amber-500/30 space-y-4">
                          <h4 className="text-xs font-bold text-amber-500 uppercase tracking-widest flex items-center gap-2">
                              <TrendingUp size={14}/> 유전적 특성 계승 (Ratio: {Math.floor(ratio * 100)}%)
                          </h4>
                          <div className="space-y-2">
                              {['str', 'int', 'def', 'agi', 'ctrl', 'wis'].map(k => (
                                  <div key={k} className="flex justify-between text-xs border-b border-white/5 pb-1">
                                      <span className="text-slate-500 uppercase font-bold">{k}</span>
                                      <div className="flex items-center gap-2">
                                          <span className="text-slate-400">{chosenSuccessor.stats[k as keyof Stats]}</span>
                                          <ArrowRight size={10} className="text-slate-600"/>
                                          <span className="text-green-400 font-bold font-mono">
                                              {chosenSuccessor.stats[k as keyof Stats] + Math.floor(character.stats[k as keyof Stats] * ratio)}
                                          </span>
                                      </div>
                                  </div>
                              ))}
                          </div>
                      </div>

                      {/* Skill Review */}
                      <div className="bg-slate-950 p-6 rounded-3xl border border-indigo-500/30 space-y-4">
                          <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-widest flex items-center gap-2">
                              <Star size={14}/> 가문의 비기 (Inherited Skill)
                          </h4>
                          {chosenSkill ? (
                              <div className="p-4 bg-indigo-900/20 border border-indigo-500/30 rounded-2xl text-center">
                                  <div className="font-black text-white text-lg">{chosenSkill.name}</div>
                                  <div className="text-[10px] text-indigo-400 font-bold uppercase mt-1">LV.{chosenSkill.level} {chosenSkill.tier}</div>
                              </div>
                          ) : (
                              <div className="h-full flex items-center justify-center text-slate-600 italic text-xs py-10">
                                  전수된 기술 없음
                              </div>
                          )}
                      </div>
                  </div>

                  <button 
                    onClick={finalize}
                    className="w-full py-5 bg-gradient-to-r from-amber-700 via-amber-500 to-amber-700 text-white font-black text-xl rounded-3xl shadow-xl shadow-amber-900/40 transition-all transform hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-3"
                  >
                      <Zap size={24} className="animate-pulse" />
                      <span>가문 승계 완료</span>
                  </button>
              </div>
          )}
        </div>

        <div className="p-6 bg-slate-950 border-t border-white/5 text-center shrink-0">
          <p className="text-[10px] text-slate-600 font-bold uppercase tracking-[0.4em]">The Heritage of Hero {character.name}</p>
        </div>
      </div>
    </div>
  );
};

export default SuccessionModal;
