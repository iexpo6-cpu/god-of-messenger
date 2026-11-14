import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Character, Companion, CombatStyle, SkillType } from '../types';
import { calculateFinalStats, calculateTotalStats, getUnlockedCombatStylesList } from '../utils';
import { COMBAT_STYLE_CONFIG } from '../constants';
import { getCombatStyleSkillSet } from '../combatStyleSkills';
import { getCompanionCP, getCompanionPureCP } from '../services/companionGrowthService';
import { X, Zap, Sparkles, Activity, HelpCircle, ChevronDown, ChevronUp, BookOpen, ShieldAlert } from 'lucide-react';

interface Props {
  entity: Character | Companion;
  onClose: () => void;
}

export const CombatPowerDetailModal: React.FC<Props> = ({ entity, onClose }) => {
  const [showPassiveDetail, setShowPassiveDetail] = useState(false);
  const [showBuffDetail, setShowBuffDetail] = useState(false);

  if (!entity) return null;

  const name = entity.name || '알 수 없음';
  const level = entity.level || 1;
  const race = entity.race || '인간';
  const classType = (entity as any).classType || (entity as any).job || '모험가';
  const shinryokuType = entity.shinryokuType || '미개방';
  const battleRole = (entity as any).battleRole || '역할없음';

  // 1. Total CP and Pure CP calculation
  const totalCp = getCompanionCP(entity);
  const pureCp = getCompanionPureCP(entity);
  const equipmentBuffDifference = Math.max(0, totalCp - pureCp);

  // 2. Base vs Final Stats calculation
  const { finalStats, buffBonus } = calculateFinalStats(entity);
  const { bonus: equipStats } = calculateTotalStats(entity);

  // Pure base stats (without equipment and buffs)
  const baseStats = {
    str: Math.max(1, finalStats.str - (equipStats.str || 0) - (buffBonus.str || 0)),
    agi: Math.max(1, finalStats.agi - (equipStats.agi || 0) - (buffBonus.agi || 0)),
    int: Math.max(1, finalStats.int - (equipStats.int || 0) - (buffBonus.int || 0)),
    wis: Math.max(1, finalStats.wis - (equipStats.wis || 0) - (buffBonus.wis || 0)),
    def: Math.max(1, finalStats.def - (equipStats.def || 0) - (buffBonus.def || 0)),
    ctrl: Math.max(1, finalStats.ctrl - (equipStats.ctrl || 0) - (buffBonus.ctrl || 0)),
  };

  // Passive skills list (일반 패시브 스킬 + 전투 계열 장착/보유 패시브 스킬 통합)
  const regularPassives = (entity.skills || []).filter(
    (s) => s && (s.type === SkillType.PASSIVE || (s.type as any) === 'PASSIVE' || (s.type as any) === '패시브')
  );

  const stylePassives: any[] = [];
  if (entity.combatStyle && COMBAT_STYLE_CONFIG[entity.combatStyle as CombatStyle]) {
    const styleTier = COMBAT_STYLE_CONFIG[entity.combatStyle as CombatStyle]?.tier || 1;
    const skillSet = getCombatStyleSkillSet(entity.combatStyle as CombatStyle, styleTier);
    if (skillSet?.equippedPassive) {
      stylePassives.push({
        name: `[전투계열 장착] ${skillSet.equippedPassive.name}`,
        description: skillSet.equippedPassive.description,
        isStylePassive: true
      });
    }
  }

  const unlockedStyles = getUnlockedCombatStylesList(entity);
  unlockedStyles.forEach((st) => {
    if (COMBAT_STYLE_CONFIG[st as CombatStyle]) {
      const stTier = COMBAT_STYLE_CONFIG[st as CombatStyle]?.tier || 1;
      const stSet = getCombatStyleSkillSet(st as CombatStyle, stTier);
      if (stSet?.learnedPassive) {
        stylePassives.push({
          name: `[전투계열 보유] ${stSet.learnedPassive.name}`,
          description: stSet.learnedPassive.description,
          isStylePassive: true
        });
      }
    }
  });

  const passiveSkills = [...regularPassives, ...stylePassives];

  // Active status buffs list
  const activeBuffs = (entity.statusEffects || []).filter(
    (s) => s && s.name && s.name !== 'None'
  );

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm text-slate-100 animate-fadeIn">
      <div 
        className="w-full max-w-md bg-slate-950 border border-amber-500/40 rounded-2xl p-4 sm:p-5 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto custom-scrollbar relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 모달 헤더 */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/40 shadow-[0_0_12px_rgba(245,158,11,0.2)]">
              <Zap size={18} />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-extrabold text-amber-300 flex items-center gap-1.5">
                <span>{name}</span>
                <span className="text-xs font-mono text-slate-400 font-normal">Lv.{level}</span>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md border ${
                  battleRole === '딜러' 
                    ? 'bg-rose-950/60 text-rose-300 border-rose-500/40' 
                    : battleRole === '탱커'
                    ? 'bg-blue-950/60 text-blue-300 border-blue-500/40'
                    : battleRole === '서포터'
                    ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40'
                    : 'bg-slate-900 text-slate-400 border-slate-700'
                }`}>
                  {battleRole}
                </span>
              </h3>
              <p className="text-[11px] text-slate-400 font-medium">
                {race} • {classType} • 신력: {shinryokuType}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition border border-slate-800 active:scale-95"
          >
            <X size={18} />
          </button>
        </div>

        {/* 전투력 비교 요약 카드 */}
        <div className="grid grid-cols-2 gap-2.5">
          {/* 순수 전투력 */}
          <div className="bg-gradient-to-br from-emerald-950/60 to-slate-900 border border-emerald-500/40 rounded-xl p-3 flex flex-col justify-between">
            <span className="text-[10px] sm:text-[11px] font-bold text-emerald-300 flex items-center gap-1">
              <Sparkles size={12} className="text-emerald-400" />
              순수 전투력
            </span>
            <div className="mt-1">
              <span className="text-lg sm:text-xl font-black text-emerald-300 font-mono">
                {pureCp.toLocaleString()}
              </span>
              <span className="text-[9px] text-emerald-400/80 block mt-0.5 font-medium">
                장비/버프 제외 순수 스탯
              </span>
            </div>
          </div>

          {/* 종합 전투력 */}
          <div className="bg-gradient-to-br from-amber-950/60 to-slate-900 border border-amber-500/40 rounded-xl p-3 flex flex-col justify-between">
            <span className="text-[10px] sm:text-[11px] font-bold text-amber-300 flex items-center gap-1">
              <Zap size={12} className="text-amber-400" />
              종합 전투력
            </span>
            <div className="mt-1">
              <span className="text-lg sm:text-xl font-black text-amber-300 font-mono">
                {totalCp.toLocaleString()}
              </span>
              <span className="text-[9px] text-amber-400/80 block mt-0.5 font-medium">
                장비/버프/승마 합산
              </span>
            </div>
          </div>
        </div>

        {/* 순수 기본 스탯 섹션 (STR, AGI, INT, WIS, DEF, CTRL) */}
        <div className="space-y-1.5">
          <span className="text-xs font-bold text-slate-300 block flex items-center gap-1.5">
            <Activity size={13} className="text-amber-400" />
            순수 기본 능력치
          </span>
          <div className="grid grid-cols-3 gap-1.5">
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-2 text-center">
              <div className="text-[10px] font-bold text-slate-400">STR</div>
              <div className="font-mono font-extrabold text-emerald-300 text-sm mt-0.5">{baseStats.str}</div>
            </div>
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-2 text-center">
              <div className="text-[10px] font-bold text-slate-400">AGI</div>
              <div className="font-mono font-extrabold text-emerald-300 text-sm mt-0.5">{baseStats.agi}</div>
            </div>
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-2 text-center">
              <div className="text-[10px] font-bold text-slate-400">INT</div>
              <div className="font-mono font-extrabold text-emerald-300 text-sm mt-0.5">{baseStats.int}</div>
            </div>
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-2 text-center">
              <div className="text-[10px] font-bold text-slate-400">WIS</div>
              <div className="font-mono font-extrabold text-emerald-300 text-sm mt-0.5">{baseStats.wis}</div>
            </div>
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-2 text-center">
              <div className="text-[10px] font-bold text-slate-400">DEF</div>
              <div className="font-mono font-extrabold text-emerald-300 text-sm mt-0.5">{baseStats.def}</div>
            </div>
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-2 text-center">
              <div className="text-[10px] font-bold text-slate-400">CTRL</div>
              <div className="font-mono font-extrabold text-emerald-300 text-sm mt-0.5">{baseStats.ctrl}</div>
            </div>
          </div>
        </div>

        {/* 전투력 보너스 & 구성 세부 항목 */}
        <div className="space-y-2">
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 space-y-2.5 text-xs">
            {/* 장비 및 승마 보너스 */}
            <div className="flex justify-between items-center pb-2 border-b border-slate-800/80">
              <span className="text-slate-300 font-medium">장비 및 승마 보너스</span>
              <span className="font-mono font-bold text-amber-300">
                +{equipmentBuffDifference > 0 ? equipmentBuffDifference.toLocaleString() : 0} 전투력
              </span>
            </div>

            {/* 패시브 스킬 항목 */}
            <div className="pb-2 border-b border-slate-800/80 space-y-1.5">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-1.5 text-slate-300 font-medium">
                  <BookOpen size={13} className="text-purple-400" />
                  <span>패시브 스킬</span>
                  <span className="text-[10px] font-bold text-purple-300 bg-purple-950/60 border border-purple-500/30 px-1.5 py-0.5 rounded-md">
                    {passiveSkills.length}개
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPassiveDetail(!showPassiveDetail)}
                  className="flex items-center gap-1 text-[11px] text-purple-300 hover:text-purple-200 bg-purple-950/40 hover:bg-purple-900/50 border border-purple-500/30 px-2 py-0.5 rounded-lg transition"
                >
                  <span>{showPassiveDetail ? '접기' : '자세히 보기'}</span>
                  {showPassiveDetail ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                </button>
              </div>

              {showPassiveDetail && (
                <div className="mt-2 space-y-1.5 max-h-40 overflow-y-auto custom-scrollbar pr-1 pt-1">
                  {passiveSkills.length === 0 ? (
                    <div className="text-[11px] text-slate-500 italic p-2 bg-slate-950/50 rounded-lg text-center">
                      적용 중인 패시브 스킬이 없습니다.
                    </div>
                  ) : (
                    passiveSkills.map((skill, idx) => (
                      <div key={skill.id || skill.name || idx} className="bg-slate-950/80 border border-purple-500/20 rounded-lg p-2 space-y-0.5">
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-purple-300 text-[11px] flex items-center gap-1">
                            <span>{skill.name}</span>
                            {skill.isStylePassive && (
                              <span className="text-[9px] font-bold text-amber-300 bg-amber-950/60 border border-amber-500/40 px-1 rounded">
                                전투계열
                              </span>
                            )}
                          </span>
                          {skill.level && (
                            <span className="text-[10px] text-purple-400 font-mono">Lv.{skill.level}</span>
                          )}
                        </div>
                        {skill.description && (
                          <p className="text-[10px] text-slate-400 leading-tight">{skill.description}</p>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* 활성 상태 버프 항목 */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-1.5 text-slate-300 font-medium">
                  <ShieldAlert size={13} className="text-cyan-400" />
                  <span>활성 상태 버프</span>
                  <span className="text-[10px] font-bold text-cyan-300 bg-cyan-950/60 border border-cyan-500/30 px-1.5 py-0.5 rounded-md">
                    {activeBuffs.length}개
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowBuffDetail(!showBuffDetail)}
                  className="flex items-center gap-1 text-[11px] text-cyan-300 hover:text-cyan-200 bg-cyan-950/40 hover:bg-cyan-900/50 border border-cyan-500/30 px-2 py-0.5 rounded-lg transition"
                >
                  <span>{showBuffDetail ? '접기' : '자세히 보기'}</span>
                  {showBuffDetail ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                </button>
              </div>

              {showBuffDetail && (
                <div className="mt-2 space-y-1.5 max-h-40 overflow-y-auto custom-scrollbar pr-1 pt-1">
                  {activeBuffs.length === 0 ? (
                    <div className="text-[11px] text-slate-500 italic p-2 bg-slate-950/50 rounded-lg text-center">
                      적용 중인 버프가 없습니다.
                    </div>
                  ) : (
                    activeBuffs.map((buff, idx) => (
                      <div key={buff.name + idx} className="bg-slate-950/80 border border-cyan-500/20 rounded-lg p-2 space-y-0.5">
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-cyan-300 text-[11px]">{buff.name}</span>
                          {buff.duration !== undefined && (
                            <span className="text-[10px] text-cyan-400 font-mono">남은 기간: {buff.duration}</span>
                          )}
                        </div>
                        {buff.effect && (
                          <p className="text-[10px] text-slate-400 leading-tight">{buff.effect}</p>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 순수 전투력 설명 안내 */}
        <div className="bg-slate-900/90 border border-amber-500/30 rounded-xl p-3 text-[11px] text-slate-300 leading-relaxed space-y-1">
          <div className="font-bold text-amber-300 flex items-center gap-1">
            <HelpCircle size={13} className="text-amber-400 shrink-0" />
            순수 전투력 계산 규정 안내
          </div>
          <p className="text-slate-400 text-[10px]">
            • <strong>순수 전투력</strong>은 착용 장비, 일시적인 상태 효과 버프, 도핑 영약 효과를 모두 배제하고 순수한 기본 능력치와 <strong>패시브 스킬 버프 효과를 온전히 포함</strong>하여 산출된 본연의 전투력입니다.
          </p>
          <p className="text-slate-400 text-[10px]">
            • <strong>역할군별 가중치</strong>: 딜러(공격력·명중·회피·치명타), 탱커(방어력·생명력·저항·치명피해감소), 서포터(지혜·지능·제어력·저항·마나) 특화 가중치가 반영됩니다.
          </p>
          <p className="text-slate-400 text-[10px]">
            • 영지 [잠재력 돌파소] 등 일부 수련 시설에서는 장비 편차나 일시적 버프에 좌우되지 않는 <strong>순수 전투력</strong>만을 요구 조건으로 산정합니다.
          </p>
        </div>

        {/* 닫기 버튼 */}
        <div className="pt-1">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg transition-all active:scale-98"
          >
            확인
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default CombatPowerDetailModal;

