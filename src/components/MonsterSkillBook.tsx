import React, { useState, useEffect } from 'react';
import { Companion, SkillType, SkillTarget, ClassTier, MonsterStage, Skill, Character } from '../types';
import { X, Zap, Sword, Shield, Skull, BookOpen, Sparkles, Brain, CheckCircle2, Award, ChevronRight, RefreshCw, Flame, Check, ArrowRightLeft } from 'lucide-react';
import { SHINRYOKU_UI_CONFIG } from '../constants';
import { getSkillElement } from './SkillBook';
import { checkAndApplyMonsterAutoSkills, MONSTER_STAGE_SKILLS, getShinryokuSkillCategory, learnMonsterSkillForStage, MonsterStageSkillDef } from '../services/monsterGrowth';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  monster: Companion;
  onLearnSkill?: (data: { name: string, type?: SkillType, description?: string, powerRatio?: number, mpCost?: number, formulaOverride?: string, targetType?: SkillTarget }, tier: string) => void;
  character?: Character;
  onUpdateCharacter?: (newChar: Character, logMsg?: string) => void;
  onUpdateCompanion?: (updatedMonster: Companion) => void;
}

const SKILL_TYPE_ICONS: Record<string, any> = {
  [SkillType.PHYSICAL]: Sword,
  [SkillType.MAGIC]: Zap,
  [SkillType.BUFF]: Shield,
  [SkillType.DEBUFF]: Skull,
  [SkillType.PASSIVE]: BookOpen,
};

const SKILL_TYPE_KOREAN: Record<string, string> = {
  [SkillType.PHYSICAL]: '물리 공격',
  [SkillType.MAGIC]: '마법 공격',
  [SkillType.BUFF]: '강화 효과',
  [SkillType.DEBUFF]: '약화 효과',
  [SkillType.PASSIVE]: '지속 효과',
};

const STAGE_ORDER: MonsterStage[] = [
  MonsterStage.BABY,
  MonsterStage.CHILD,
  MonsterStage.ADULT,
  MonsterStage.PERFECT,
  MonsterStage.ULTIMATE,
  MonsterStage.SUPER_ULTIMATE
];

export const MonsterSkillBook: React.FC<Props> = ({ 
  isOpen, 
  onClose, 
  monster, 
  onLearnSkill, 
  character,
  onUpdateCharacter,
  onUpdateCompanion 
}) => {
  const [currentMonster, setCurrentMonster] = useState<Companion>(monster);
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);
  const [activeStageTab, setActiveStageTab] = useState<MonsterStage | 'ALL'>('ALL');

  useEffect(() => {
    if (monster) {
      setCurrentMonster(monster);
    }
  }, [monster]);

  if (!isOpen) return null;

  const currentStageName = currentMonster.monsterData?.stage || currentMonster.classType || '성장기';
  const shinryokuCategory = getShinryokuSkillCategory(currentMonster.shinryokuType);
  const stageSkillDefs = MONSTER_STAGE_SKILLS[shinryokuCategory] || MONSTER_STAGE_SKILLS.default;
  const shinryokuConfig = SHINRYOKU_UI_CONFIG[currentMonster.shinryokuType || '무속성'] || SHINRYOKU_UI_CONFIG.default;

  // 전체 성장 스킬을 등급(단계)별로 그룹화
  const groupedSkills: Record<string, MonsterStageSkillDef[]> = {};
  STAGE_ORDER.forEach(stage => {
    groupedSkills[stage] = [];
  });
  stageSkillDefs.forEach(def => {
    if (!groupedSkills[def.stage]) groupedSkills[def.stage] = [];
    groupedSkills[def.stage].push(def);
  });

  const syncUpdatedMonster = (updated: Companion, logMsg: string) => {
    setCurrentMonster(updated);
    if (onUpdateCompanion) {
      onUpdateCompanion(updated);
    }
    if (character && onUpdateCharacter) {
      const newChar: Character = JSON.parse(JSON.stringify(character));
      let found = false;
      if (newChar.companions) {
        const idx = newChar.companions.findIndex(c => c.id === updated.id);
        if (idx >= 0) {
          newChar.companions[idx] = updated;
          found = true;
        }
      }
      if (!found && newChar.inactiveCompanions) {
        const idx = newChar.inactiveCompanions.findIndex(c => c.id === updated.id);
        if (idx >= 0) {
          newChar.inactiveCompanions[idx] = updated;
          found = true;
        }
      }
      if (!found && newChar.base?.capturedMonsters) {
        const idx = newChar.base.capturedMonsters.findIndex((m: any) => m.id === updated.id);
        if (idx >= 0) {
          newChar.base.capturedMonsters[idx] = { ...newChar.base.capturedMonsters[idx], ...updated };
          found = true;
        }
      }
      onUpdateCharacter(newChar, logMsg);
    }
  };

  // 등급별 자동 검사 및 보유 스킬 갱신 (등급별 1개 엄수)
  const handleCheckAutoSkills = () => {
    const { updatedCompanion, newlyLearned } = checkAndApplyMonsterAutoSkills(currentMonster);
    if (newlyLearned.length > 0) {
      const msg = `새로운 성장 스킬 ${newlyLearned.length}개 (${newlyLearned.join(', ')})를 습득했습니다!`;
      syncUpdatedMonster(updatedCompanion, `[시스템] ${currentMonster.name} 성장 스킬 자동 갱신: ${newlyLearned.join(', ')}`);
      setNoticeMessage(msg);
    } else {
      setNoticeMessage('현재 달성한 각 등급별로 스킬이 이미 1개씩 장착되어 있습니다.');
    }
    setTimeout(() => setNoticeMessage(null), 4000);
  };

  // 개별 스킬 선택 습득 / 교체 실행
  const handleSelectSkill = (def: MonsterStageSkillDef) => {
    if (currentMonster.level < def.minLevel) {
      setNoticeMessage(`레벨이 부족합니다. (필요 레벨: Lv.${def.minLevel})`);
      setTimeout(() => setNoticeMessage(null), 3000);
      return;
    }

    const { updatedCompanion, replacedSkillName } = learnMonsterSkillForStage(currentMonster, def);
    let logMsg = `[시스템] ${currentMonster.name} 스킬 습득: ${def.skill.name} (${def.stage})`;
    let userNotice = `[${def.stage}] ${def.skill.name} 스킬을 습득하여 장착했습니다!`;
    if (replacedSkillName && replacedSkillName !== def.skill.name) {
      logMsg = `[시스템] ${currentMonster.name} 스킬 교체: ${replacedSkillName} -> ${def.skill.name} (${def.stage})`;
      userNotice = `[${def.stage}] 기존 스킬 (${replacedSkillName})을 [${def.skill.name}](으)로 교체 장착했습니다!`;
    }

    syncUpdatedMonster(updatedCompanion, logMsg);
    setNoticeMessage(userNotice);
    setTimeout(() => setNoticeMessage(null), 4000);
  };

  return (
    <div className="fixed inset-0 z-[220] flex items-center justify-center bg-black/90 backdrop-blur-sm p-2 sm:p-4 animate-in fade-in duration-300">
      <div className="bg-slate-900 border border-red-900/50 w-full max-w-4xl h-[92vh] sm:h-[86vh] rounded-2xl shadow-2xl flex flex-col relative overflow-hidden">
        
        {/* Header */}
        <div className="p-3 sm:p-4 border-b border-red-900/30 bg-red-950/20 flex justify-between items-center shrink-0">
            <div className="flex items-center">
                <Skull size={24} className="text-red-500 mr-2.5 sm:mr-3 shrink-0" />
                <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-base sm:text-lg font-bold text-red-100 font-cinzel">야생의 본능 & 몬스터 성장 스킬북</h2>
                      <span className={`text-[10px] px-2 py-0.5 rounded font-bold border flex items-center gap-1 ${shinryokuConfig.bg} ${shinryokuConfig.text} ${shinryokuConfig.border}`}>
                        <Sparkles size={10} />
                        <span>신력 계통: {currentMonster.shinryokuType || '무속성'} ({shinryokuCategory})</span>
                      </span>
                    </div>
                    <p className="text-xs text-red-400/80 mt-0.5">
                      {currentMonster.name} ({currentStageName} • Lv.{currentMonster.level})
                      <span className="ml-2 text-slate-400 text-[11px]">※ 각 성장 등급당 1개의 스킬을 선택 장착할 수 있습니다.</span>
                    </p>
                </div>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-white p-2 rounded-full hover:bg-slate-800 transition-colors">
                <X size={22} />
            </button>
        </div>

        {noticeMessage && (
          <div className="bg-emerald-950/90 border-b border-emerald-800 text-emerald-200 text-xs px-4 py-2.5 font-bold flex items-center justify-between animate-in fade-in">
            <span className="flex items-center gap-1.5"><CheckCircle2 size={14} className="text-emerald-400 shrink-0"/> {noticeMessage}</span>
            <button onClick={() => setNoticeMessage(null)} className="text-emerald-400 text-xs hover:underline shrink-0 ml-2">닫기</button>
          </div>
        )}

        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
            {/* Left: Current Learned Skills */}
            <div className="w-full md:w-5/12 p-3 sm:p-4 overflow-y-auto custom-scrollbar border-b md:border-b-0 md:border-r border-slate-800 bg-slate-900/50 flex flex-col">
                <div className="flex justify-between items-center mb-3 shrink-0">
                  <h3 className="text-xs sm:text-sm font-bold text-slate-200 flex items-center">
                      <Sparkles size={14} className="mr-1.5 text-amber-500"/> 현재 장착 스킬 ({currentMonster.skills?.length || 0})
                  </h3>
                  <button 
                    onClick={handleCheckAutoSkills}
                    className="min-h-[36px] px-2.5 py-1 bg-red-950 hover:bg-red-900 border border-red-800 text-red-200 text-[11px] font-bold rounded-lg transition-all flex items-center gap-1 shadow-sm active:scale-95"
                  >
                    <RefreshCw size={12} />
                    <span>성장 스킬 점검</span>
                  </button>
                </div>
                
                <div className="space-y-2.5 flex-1">
                    {!currentMonster.skills || currentMonster.skills.length === 0 ? (
                        <div className="text-center py-10 text-slate-500 border border-dashed border-slate-800 rounded-xl p-4">
                            <p className="text-xs font-bold text-slate-400">장착된 스킬이 없습니다.</p>
                            <p className="text-[11px] text-slate-500 mt-1">우측 로드맵에서 원하는 스킬을 선택하거나 [성장 스킬 점검] 버튼을 누르세요.</p>
                        </div>
                    ) : (
                        currentMonster.skills.map((skill, idx) => {
                            const Icon = SKILL_TYPE_ICONS[skill.type] || Sword;
                            const skillTypeKo = SKILL_TYPE_KOREAN[skill.type] || '일반 공격';
                            // 어느 등급 스킬인지 찾기
                            const matchedDef = stageSkillDefs.find(d => d.skill.name === skill.name);
                            return (
                                <div key={idx} className="bg-slate-950 p-3 rounded-xl border border-slate-800 hover:border-red-500/30 transition-all">
                                    <div className="flex justify-between items-start mb-1.5">
                                        <div className="flex items-center">
                                            <div className="p-1.5 bg-slate-900 rounded-lg border border-slate-800 text-slate-400 mr-2 group-hover:text-red-400 transition-colors">
                                                <Icon size={15} />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                    <h4 className="text-xs sm:text-sm font-bold text-slate-200">{skill.name}</h4>
                                                    {matchedDef && (
                                                      <span className="text-[9px] px-1.5 py-0.5 rounded font-bold bg-amber-950 text-amber-300 border border-amber-800">
                                                        {matchedDef.stage}
                                                      </span>
                                                    )}
                                                    {skill.type !== SkillType.BUFF && skill.type !== SkillType.DEBUFF && skill.type !== SkillType.PASSIVE && (() => {
                                                        const elem = getSkillElement(skill, currentMonster.shinryokuType);
                                                        const elemCfg = SHINRYOKU_UI_CONFIG[elem] || SHINRYOKU_UI_CONFIG.default;
                                                        return (
                                                            <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold border flex items-center gap-0.5 ${elemCfg.bg} ${elemCfg.text} ${elemCfg.border}`}>
                                                                <Sparkles size={8} />
                                                                <span>속성: {elem}</span>
                                                            </span>
                                                        );
                                                    })()}
                                                </div>
                                                <span className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5 font-medium">
                                                    <span>{skillTypeKo}</span>
                                                    <span>•</span>
                                                    <span>마나 소모 {(skill.type === SkillType.PASSIVE || (skill.type as string) === '패시브') ? 0 : skill.mpCost}</span>
                                                </span>
                                            </div>
                                        </div>
                                        <span className="text-[10px] font-mono bg-slate-900 px-2 py-0.5 rounded border border-slate-800 text-slate-400">Lv.{skill.level}</span>
                                    </div>
                                    <p className="text-[11px] text-slate-300 italic mb-1.5 pl-1.5 border-l-2 border-slate-800">"{skill.description}"</p>
                                    <div className="bg-slate-900/60 px-2 py-1 rounded text-[10px] font-mono text-amber-400/90 flex items-center">
                                        <Brain size={10} className="mr-1 shrink-0"/> 공식: {skill.effectFormula}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* Right: Stage Growth System Roadmap with 1-Skill-Per-Grade Selection */}
            <div className="w-full md:w-7/12 p-3 sm:p-4 flex flex-col bg-slate-950 relative overflow-y-auto custom-scrollbar">
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/black-scales.png')] opacity-20 pointer-events-none"></div>
                
                <div className="flex items-center justify-between mb-2 z-10 shrink-0">
                  <h3 className="text-xs sm:text-sm font-bold text-red-400 flex items-center">
                      <Award size={16} className="mr-1.5 text-red-400"/> {shinryokuCategory} 계통 성장 로드맵
                  </h3>
                  <span className="text-[10px] font-bold text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                    등급별 1개 장착 제한
                  </span>
                </div>

                {/* 단계 필터 버튼 */}
                <div className="flex gap-1 overflow-x-auto pb-2 mb-2 z-10 custom-scrollbar shrink-0">
                  <button
                    onClick={() => setActiveStageTab('ALL')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                      activeStageTab === 'ALL'
                        ? 'bg-red-900 text-white border border-red-700'
                        : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                    }`}
                  >
                    전체 등급
                  </button>
                  {STAGE_ORDER.map(stage => (
                    <button
                      key={stage}
                      onClick={() => setActiveStageTab(stage)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                        activeStageTab === stage
                          ? 'bg-red-900 text-white border border-red-700'
                          : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                      }`}
                    >
                      {stage}
                    </button>
                  ))}
                </div>

                <div className="space-y-4 z-10 flex-1">
                  {STAGE_ORDER.filter(stage => activeStageTab === 'ALL' || activeStageTab === stage).map(stage => {
                    const stageDefs = groupedSkills[stage] || [];
                    if (stageDefs.length === 0) return null;

                    // 현재 이 등급에 장착된 스킬이 있는지 확인
                    const equippedSkillInStage = currentMonster.skills?.find(s => 
                      stageDefs.some(d => d.skill.name === s.name)
                    );

                    return (
                      <div key={stage} className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2.5">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black px-2 py-0.5 rounded-lg bg-amber-950 text-amber-300 border border-amber-800/80">
                              {stage}
                            </span>
                            <span className="text-[11px] text-slate-400 font-medium">
                              (선택 가능 스킬 {stageDefs.length}종 중 1개 장착)
                            </span>
                          </div>
                          {equippedSkillInStage ? (
                            <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1">
                              <CheckCircle2 size={13} /> {equippedSkillInStage.name} 장착 중
                            </span>
                          ) : (
                            <span className="text-[11px] text-amber-400 font-bold">
                              미장착 상태
                            </span>
                          )}
                        </div>

                        <div className="grid grid-cols-1 gap-2">
                          {stageDefs.map((def, idx) => {
                            const isUnlocked = currentMonster.level >= def.minLevel;
                            const isEquipped = currentMonster.skills?.some(s => s.name === def.skill.name);
                            const Icon = SKILL_TYPE_ICONS[def.skill.type] || Sword;
                            const skillTypeKo = SKILL_TYPE_KOREAN[def.skill.type] || '공격';

                            return (
                              <div 
                                key={idx}
                                className={`p-3 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                                  isEquipped 
                                    ? 'bg-emerald-950/30 border-emerald-600/70 text-slate-100 shadow-sm' 
                                    : isUnlocked
                                      ? 'bg-slate-950/80 border-slate-800 hover:border-red-700/60 text-slate-200'
                                      : 'bg-slate-950/30 border-slate-900 text-slate-600 opacity-50'
                                }`}
                              >
                                <div className="space-y-1 flex-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <div className={`p-1 rounded-lg ${isEquipped ? 'bg-emerald-950 text-emerald-400' : 'bg-slate-900 text-red-400'}`}>
                                      <Icon size={14} />
                                    </div>
                                    <span className="text-xs font-black text-slate-100">{def.skill.name}</span>
                                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800">
                                      필요 Lv.{def.minLevel}
                                    </span>
                                    <span className="text-[10px] text-slate-400">
                                      {skillTypeKo} • 마나 {(def.skill.type === SkillType.PASSIVE || (def.skill.type as string) === '패시브') ? 0 : def.skill.mpCost}
                                    </span>
                                  </div>
                                  <p className="text-[11px] text-slate-300 italic">{def.skill.description}</p>
                                  <p className="text-[10px] font-mono text-amber-400/90">공식: {def.skill.effectFormula}</p>
                                </div>

                                <div className="shrink-0 flex items-center justify-end">
                                  {isEquipped ? (
                                    <div className="px-3 py-1.5 bg-emerald-950 border border-emerald-600 text-emerald-300 font-bold text-xs rounded-xl flex items-center gap-1">
                                      <Check size={14} />
                                      <span>장착 중</span>
                                    </div>
                                  ) : isUnlocked ? (
                                    <button
                                      onClick={() => handleSelectSkill(def)}
                                      className="min-h-[40px] px-3.5 py-1.5 bg-red-900 hover:bg-red-800 active:scale-95 border border-red-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all shadow-md"
                                    >
                                      {equippedSkillInStage ? (
                                        <>
                                          <ArrowRightLeft size={13} />
                                          <span>이 스킬로 교체</span>
                                        </>
                                      ) : (
                                        <>
                                          <Sparkles size={13} />
                                          <span>스킬 습득</span>
                                        </>
                                      )}
                                    </button>
                                  ) : (
                                    <span className="text-[11px] font-mono text-slate-600 px-2 py-1 rounded bg-slate-900">
                                      Lv.{def.minLevel} 필요
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-4 pt-3 border-t border-slate-900 z-10 shrink-0">
                  <button 
                    onClick={handleCheckAutoSkills}
                    className="w-full min-h-[44px] py-2.5 bg-gradient-to-r from-red-900 to-rose-900 hover:from-red-800 hover:to-rose-800 border border-red-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 active:scale-98"
                  >
                    <Sparkles size={16} />
                    <span>성장 스킬 검사 및 보유 스킬 갱신 (등급별 자동 선택)</span>
                  </button>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default MonsterSkillBook;
