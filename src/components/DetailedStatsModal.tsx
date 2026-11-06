
import React, { useState, useMemo } from 'react';
import { Stats, DerivedStats, Item, ActiveStatus, WeaponType, WeaponMastery, Skill, BondSkill, CombatStyle, SkillType } from '../types';
import { calculateDerivedStats, getWeaponTypeFromItem, extractElementalType, hasCombatStyleSpecialtyEquipped, getCombatStyleBonusPercent, getCombatStyleBonusDetails } from '../utils';
import { STATUS_AILMENTS_DATA, WEAPON_TYPE_KOREAN, COMBAT_STYLE_CONFIG } from '../constants';
import { X, Sword, Shield, Zap, Target, BookOpen, AlertCircle, Flame, Sparkles, TrendingUp, ArrowRight, Crosshair, ShieldCheck, Heart, ChevronDown, Info, FlaskConical, Clock, ShieldAlert, Sparkle } from 'lucide-react';
import ElementalStatsModal from './ElementalStatsModal';

interface StatDetailInfo {
  label: string;
  desc: string;
  formula: string;
  effect: string;
}

const STAT_DESCRIPTIONS: Record<string, StatDetailInfo> = {
  pAtk: {
    label: '물리 공격력',
    desc: '근력과 민첩성, 무기 공격력을 기반으로 적에게 가하는 물리 타격 피해의 기준값입니다.',
    formula: '근력 + (민첩성 × 0.3) + 장비 추가치에 계열 및 공격력 버프 배율이 곱해져 산출됩니다.',
    effect: '적의 물리 방어력과 상쇄되어 최종 물리 피해량이 결정됩니다.'
  },
  mAtk: {
    label: '마법 공격력',
    desc: '지능과 지혜, 장비 마법력을 기반으로 마법 스킬 사용 시 입히는 마법 피해의 기준값입니다.',
    formula: '지능 + (지혜 × 0.3) + 장비 추가치에 계열 및 마법력 버프 배율이 곱해져 산출됩니다.',
    effect: '무기 속성과 신력이 일치할 경우 신력 공명 보너스로 더욱 강력해집니다.'
  },
  pDef: {
    label: '물리 방어력',
    desc: '방어력과 방어구 수치를 기반으로 적의 물리 공격 피해를 직접 경감시키는 방어력입니다.',
    formula: '(방어력 × 0.8 + 장비 추가치) × 방어력 배율로 산출됩니다.',
    effect: '높을수록 받는 물리 피해가 크게 감소하지만, 상대의 제어 관통력에 의해 일부 관통될 수 있습니다.'
  },
  mDef: {
    label: '마법 방어력',
    desc: '방어력과 지혜를 기반으로 적의 마법 및 원소 스킬 피해를 경감시키는 방어력입니다.',
    formula: '(방어력 × 0.4 + 지혜 × 0.4 + 장비 추가치) × 방어력 배율로 산출됩니다.',
    effect: '지혜가 높을수록 마법 공격을 덜 아프게 받아낼 수 있습니다.'
  },
  accuracy: {
    label: '물리 명중률',
    desc: '물리 타격 및 일반 공격이 빗나가지 않고 적에게 정확히 명중할 확률입니다.',
    formula: '기본 85% + 민첩성 보정 + 근력 보정 + 장비 명중 보정으로 산출됩니다.',
    effect: '적의 물리 회피율을 차감한 뒤 최종 명중 여부를 판정합니다.'
  },
  evasion: {
    label: '물리 회피율',
    desc: '적의 물리 공격을 완전히 피하여 피해를 전혀 입지 않고 넘길 확률입니다.',
    formula: '민첩성 및 지혜 비율 합산 × 장비 회피 배율로 산출됩니다.',
    effect: '적의 물리 명중률을 낮추어 공격이 빗나가도록 유도합니다.'
  },
  mAccuracy: {
    label: '마법 명중률',
    desc: '시전한 마법 스킬이 적에게 빗나가지 않고 적중할 확률입니다.',
    formula: '기본 85% + 지혜 보정 + 지능 보정 + 장비 마법명중 보정으로 산출됩니다.',
    effect: '적의 마법 회피율을 차감한 뒤 마법 스킬의 명중 여부를 판정합니다.'
  },
  mEvasion: {
    label: '마법 회피율',
    desc: '적의 마법 공격을 직감과 신속한 몸놀림으로 회피할 확률입니다.',
    formula: '지혜 및 민첩성 비율 합산 × 장비 마법 회피 배율로 산출됩니다.',
    effect: '적의 마법 명중률을 상쇄하여 마법 피해를 무효화합니다.'
  },
  critChance: {
    label: '치명타 확률',
    desc: '공격이 적중했을 때 치명타가 발동하여 극대화된 피해를 가할 확률입니다.',
    formula: '기본 5% + 제어력 보정 + 민첩성 보정 + 장비 및 스킬 보너스로 산출됩니다 (최대 100%).',
    effect: '적의 치명타 저항 수치만큼 차감된 후 최종 발동됩니다.'
  },
  critDamage: {
    label: '치명타 피해량',
    desc: '치명타가 발생했을 때 일반 피해량에 곱해지는 배율입니다.',
    formula: '기본 1.4배에서 제어력 100만 도달 시 최대 2.5배까지 증가하며 추가 장비 및 특성이 합산됩니다.',
    effect: '높을수록 치명타 발동 시 적에게 폭발적인 치명 피해를 입힙니다.'
  },
  statusResist: {
    label: '상태이상 저항률',
    desc: '기절, 빙결, 침묵, 출혈 등 전투를 방해하는 해로운 효과를 무효화할 확률입니다.',
    formula: '제어력 점근 계산식 + 장비 및 스킬 저항 보너스로 산출됩니다 (최대 100%).',
    effect: '보스의 강력한 상태이상 스킬을 견뎌내고 안정적인 전투를 지속할 수 있게 합니다.'
  },
  critDmgResist: {
    label: '치명타 피해 감소',
    desc: '적에게 치명타를 허용했을 때 입는 추가 피해를 경감하는 비율입니다.',
    formula: '장비 및 생존 특성 보너스 총합으로 계산됩니다 (최대 95%).',
    effect: '보스의 치명타 일격에 치명상을 입는 상황을 효과적으로 방지합니다.'
  },
  critResist: {
    label: '치명타 저항',
    desc: '적의 공격이 자신에게 치명타로 터질 확률을 직접 깎아내리는 수치입니다.',
    formula: '패시브, 능력치 및 장비 보너스 총합으로 계산됩니다 (최대 100%).',
    effect: '적의 치명타 발동 확률을 직접 상쇄하여 안전한 전투를 돕습니다.'
  },
  ctrlPenetration: {
    label: '제어 관통력',
    desc: '자신의 제어력에 비례하여 적의 방어력을 꿰뚫고 디버프 성공률을 높이는 힘입니다.',
    formula: '제어력에 비례하여 계산되며 상대 물리/마법 방어력을 최대 50%까지 무시합니다.',
    effect: '단단한 보스의 방어를 허물어 실제 피해량을 비약적으로 증가시킵니다.'
  },
  ctrlResist: {
    label: '제어 저항력',
    desc: '자신의 제어력을 바탕으로 상대의 제어 관통력을 무력화하고 상태이상을 방어하는 힘입니다.',
    formula: '제어력에 비례하여 계산되며 상대의 제어 관통력을 직접 차감합니다.',
    effect: '상대방의 방어력 무시 효과를 차단하여 자신의 방어력을 온전히 보존합니다.'
  }
};

interface Props {
  stats: Stats;
  bonusStats?: Partial<Stats>; 
  equipment?: Record<string, Item | undefined>; 
  statusEffects?: ActiveStatus[];
  name: string;
  shinryokuType?: string; 
  weaponMastery?: Partial<Record<WeaponType, WeaponMastery>>; 
  skills?: Skill[]; 
  bondSkills?: BondSkill[]; // [NEW]
  affection?: number; // [NEW]
  bondBonus?: number; // [NEW]
  elementalDamageBoosts?: Record<string, number>; // [NEW]
  elementalResistanceBoosts?: Record<string, number>; // [NEW]
  combatStyle?: CombatStyle; // [NEW] 전투 계열
  onClose: () => void;
}

const DetailedStatsModal: React.FC<Props> = ({ stats, bonusStats, equipment, statusEffects, name, shinryokuType, weaponMastery, skills, bondSkills, affection, bondBonus, elementalDamageBoosts, elementalResistanceBoosts, combatStyle, onClose }) => {
  const [showAilmentGuide, setShowAilmentGuide] = useState(false);
  const [showElementalModal, setShowElementalModal] = useState(false);
  const [selectedStat, setSelectedStat] = useState<string | null>(null);
  
  // 버프 아이템 및 버프 스킬, 상태이상 분류
  const categorizedStatusList = useMemo(() => {
    if (!statusEffects || statusEffects.length === 0) return [];
    
    return statusEffects.map(effect => {
      const name = effect.name || '';
      const effectDesc = effect.effect || '';
      
      const isItem = /영약|비약|물약|포션|환|음식|탕|차|죽|주|고기|빵|요리|스튜|단약|캡슐|스크롤|주문서|주먹밥|도시락/i.test(name) ||
        effect.statCategory === 'item' ||
        (effect.icon && /potion|flask|bottle|food|item/i.test(effect.icon));

      const isDebuff = /감전|빙결|화상|중독|출혈|공포|침묵|암흑|기절|속박|파열|월침|월암|부식|저주|둔화/i.test(name) ||
        effectDesc.includes('-') ||
        ['감전', '빙결', '공포', '속박', '소멸', '파열', '월침', '월암', '냉기', '암흑'].includes(name);

      let category: 'item' | 'skill' | 'debuff' = 'skill';
      let categoryLabel = '버프 스킬';
      let categoryColor = 'text-blue-400 bg-blue-950/80 border-blue-700/60';
      let icon = Zap;

      if (isDebuff) {
        category = 'debuff';
        categoryLabel = '상태이상';
        categoryColor = 'text-rose-400 bg-rose-950/80 border-rose-700/60';
        icon = ShieldAlert;
      } else if (isItem) {
        category = 'item';
        categoryLabel = '버프 아이템';
        categoryColor = 'text-emerald-400 bg-emerald-950/80 border-emerald-700/60';
        icon = FlaskConical;
      }

      let durationText = '상시 지속';
      if (effect.duration !== undefined && effect.duration !== null) {
        if (effect.duration <= 0) {
          durationText = '만료';
        } else if (effect.duration > 10) {
          durationText = `${effect.duration}초`;
        } else {
          durationText = `${effect.duration}턴`;
        }
      }

      return {
        ...effect,
        category,
        categoryLabel,
        categoryColor,
        icon,
        durationText
      };
    });
  }, [statusEffects]);

  // 보유 패시브 버프 스킬
  const passiveBuffSkills = useMemo(() => {
    if (!skills || skills.length === 0) return [];
    return skills.filter(s => 
      s.type === SkillType.PASSIVE || 
      (s.type as string) === '패시브' || 
      (s.type as string) === 'Passive'
    );
  }, [skills]);

  // Memoized stats and equipment calculation
  const {
    resonanceMult,
    derived,
    elementalSynergy,
    weaponElement,
    activeMasteryInfo,
    flatPAtk, multPAtk,
    flatMAtk, multMAtk,
    flatPDef, multPDef,
    flatMDef, multMDef,
    flatCrit, multCrit,
    bonusCritDmg,
    flatResist, multResist,
    bonusAcc, bonusEva, bonusMAcc, bonusMEva,
    stylePAtk, styleMAtk,
    stylePDef, styleMDef,
    styleCrit, styleResist,
    styleAcc, styleEva, styleMAcc, styleMEva,
    buffPAtk, buffMAtk,
    buffPDef, buffMDef,
    buffCrit, buffResist,
    buffAcc, buffEva, buffMAcc, buffMEva
  } = useMemo(() => {
    let elementalSynergy = false;
    let weaponElement = '';
    let resMult = 1.0;
    
    let activeMasteryInfo: { level: number, type: WeaponType } | undefined = undefined;
    let activeSubMasteryInfo: { level: number, type: WeaponType } | undefined = undefined;

    if (equipment) {
        if (equipment.weapon) {
            const actualWeaponElement = equipment.weapon.elementalType || extractElementalType(equipment.weapon.secondaryOptions || []);
            
            if (shinryokuType && actualWeaponElement === shinryokuType) {
                elementalSynergy = true;
                weaponElement = actualWeaponElement;
                resMult = 1.5 + (equipment.weapon.divineLevel || 0) * 0.01;
            }
            
            const wType = getWeaponTypeFromItem(equipment.weapon);
            if (wType && weaponMastery && weaponMastery[wType]) {
                activeMasteryInfo = { level: weaponMastery[wType]!.level, type: wType };
            }
        }
        
        if (equipment.subWeapon) {
            const subType = getWeaponTypeFromItem(equipment.subWeapon);
            if (subType && weaponMastery && weaponMastery[subType]) {
                activeSubMasteryInfo = { level: weaponMastery[subType]!.level, type: subType };
            }
        }
    }

    const filteredStatusEffects = statusEffects?.map(effect => {
        if (!effect.effect) return effect;
        const cleanedEffect = effect.effect.replace(/(STR|INT|WIS|DEF|AGI|CTRL)\s*[+-]\d+(\.\d+)?%/gi, '').trim();
        return { ...effect, effect: cleanedEffect };
    });

    const derivedStats = calculateDerivedStats(stats, filteredStatusEffects, activeMasteryInfo, activeSubMasteryInfo, elementalSynergy, skills, equipment, shinryokuType, affection, bondBonus, elementalDamageBoosts, elementalResistanceBoosts, undefined, combatStyle);

    let fPAtk = 0, mPAtk = 0;
    let fMAtk = 0, mMAtk = 0;
    let fPDef = 0, mPDef = 0;
    let fMDef = 0, mMDef = 0;
    let fCrit = 0, mCrit = 0;
    let fResist = 0, mResist = 0;
    let bAcc = 0, bEva = 0, bMAcc = 0, bMEva = 0;
    let bCritDmg = 0;

    let sPAtk = 0, sMAtk = 0;
    let sPDef = 0, sMDef = 0;
    let sCrit = 0, sResist = 0;
    let sAcc = 0, sEva = 0, sMAcc = 0, sMEva = 0;
    let sAgi = 0;

    const styleInfo = combatStyle ? COMBAT_STYLE_CONFIG[combatStyle] : null;
    const isSpecialtyEquipped = combatStyle && equipment ? hasCombatStyleSpecialtyEquipped(combatStyle, equipment) : false;

    if (styleInfo && isSpecialtyEquipped) {
        sPAtk += getCombatStyleBonusPercent(styleInfo.tier);
        sMAtk += getCombatStyleBonusPercent(styleInfo.tier);

        if (styleInfo.bonuses) {
            const b = styleInfo.bonuses as any;
            if (b.pAtk) sPAtk += (b.pAtk * 100);
            if (b.mAtk) sMAtk += (b.mAtk * 100);
            if (b.pDef) sPDef += (b.pDef * 100);
            if (b.mDef) sMDef += (b.mDef * 100);
            if (b.agi) sAgi += (b.agi * 100);
            if (b.crit) sCrit += (b.crit >= 1 ? b.crit : b.crit * 100);
            if (b.resist) sResist += (b.resist >= 1 ? b.resist : b.resist * 100);
            if (b.acc !== undefined) sAcc += (Math.abs(b.acc) <= 1 ? b.acc * 100 : b.acc);
            if (b.eva !== undefined) sEva += (Math.abs(b.eva) <= 1 ? b.eva * 100 : b.eva);
            if (b.mAcc !== undefined) sMAcc += (Math.abs(b.mAcc) <= 1 ? b.mAcc * 100 : b.mAcc);
            if (b.mEva !== undefined) sMEva += (Math.abs(b.mEva) <= 1 ? b.mEva * 100 : b.mEva);
        }
    }

    if (equipment) {
        Object.values(equipment).forEach((item: Item | undefined) => {
            if (item && item.secondaryOptions) {
                item.secondaryOptions.forEach(opt => {
                    const match = opt.match(/([+-]?\d+(?:\.\d+)?)\s*(%?)/);
                    if (!match) return;
                    
                    const val = parseFloat(match[1]);
                    const isPercent = match[2] === '%';
                    const cleanOpt = opt.replace(/\s+/g, '').toUpperCase();
                    const upperOpt = opt.toUpperCase();

                    if (cleanOpt.includes("물리공격력") || cleanOpt.includes("PHYSICALATTACK")) {
                        if (isPercent) mPAtk += val; else fPAtk += val;
                    }
                    else if (cleanOpt.includes("마법공격력") || cleanOpt.includes("MAGICATTACK")) {
                        if (isPercent) mMAtk += val; else fMAtk += val;
                    }
                    else if (cleanOpt.includes("물리방어력") || cleanOpt.includes("PHYSICALDEFENSE")) {
                        if (isPercent) mPDef += val; else fPDef += val;
                    }
                    else if (cleanOpt.includes("마법방어력") || cleanOpt.includes("MAGICDEFENSE")) {
                        if (isPercent) mMDef += val; else fMDef += val;
                    }
                    else if (cleanOpt.includes("치명타율") || cleanOpt.includes("CRITICALCHANCE")) {
                        if (isPercent) mCrit += val; else fCrit += val;
                    }
                    else if (cleanOpt.includes("치명타피해량") || cleanOpt.includes("CRITICALDAMAGE")) { bCritDmg += val; }
                    else if (cleanOpt.includes("상태이상저항") || cleanOpt.includes("STATUSRESIST")) {
                        if (isPercent) mResist += val; else fResist += val;
                    }
                    else if (cleanOpt.includes("물리명중률") || cleanOpt.includes("PHYSICALACCURACY") || upperOpt.includes("물리 명중률") || upperOpt.includes("PHYSICAL ACCURACY")) bAcc += val;
                    else if (cleanOpt.includes("물리회피율") || cleanOpt.includes("PHYSICALEVASION") || upperOpt.includes("물리 회피율") || upperOpt.includes("PHYSICAL EVASION")) bEva += val;
                    else if (cleanOpt.includes("마법명중률") || cleanOpt.includes("MAGICACCURACY") || upperOpt.includes("마법 명중률") || upperOpt.includes("MAGIC ACCURACY")) bMAcc += val;
                    else if (cleanOpt.includes("마법회피율") || cleanOpt.includes("MAGICEVASION") || upperOpt.includes("마법 회피율") || upperOpt.includes("MAGIC EVASION")) bMEva += val;
                });
            }
        });
    }

    let bfPAtk = 0, bfMAtk = 0;
    let bfPDef = 0, bfMDef = 0;
    let bfCrit = 0, bfResist = 0;
    let bfAcc = 0, bfEva = 0, bfMAcc = 0, bfMEva = 0;

    if (statusEffects) {
        statusEffects.forEach(effect => {
            const effectStr = effect.effect || "";

            // 상태이상 특수 감소
            if (effect.name === "감전") { bfPDef -= 15; bfMDef -= 15; }
            if (effect.name === "빙결") { bfPDef -= 5; bfMDef -= 5; }
            if (effect.name === "공포") { bfPAtk -= 20; bfMAtk -= 20; bfCrit -= 10; }
            if (effect.name === "속박") { bfPDef -= 20; bfMDef -= 20; }
            if (effect.name === "소멸") { bfPAtk -= 20; bfMAtk -= 20; bfPDef -= 25; bfMDef -= 25; }
            if (effect.name === "파열") { bfPDef -= 30; bfMDef -= 30; }
            if (effect.name === "월침") { bfPDef -= 20; bfMDef -= 20; bfCrit -= 20; }
            if (effect.name === "월암") { bfPAtk -= 30; bfMAtk -= 30; }

            // 기본 스탯 % 버프 파싱 (STR, INT, WIS, DEF, AGI, CTRL)
            const strM = effectStr.match(/STR\s*([+-]?\d+(?:\.\d+)?)\s*%/i);
            if (strM) bfPAtk += parseFloat(strM[1]);

            const intM = effectStr.match(/INT\s*([+-]?\d+(?:\.\d+)?)\s*%/i);
            if (intM) bfMAtk += parseFloat(intM[1]);

            const defM = effectStr.match(/DEF\s*([+-]?\d+(?:\.\d+)?)\s*%/i);
            if (defM) {
                const val = parseFloat(defM[1]);
                bfPDef += val;
                bfMDef += val;
            }

            const agiM = effectStr.match(/AGI\s*([+-]?\d+(?:\.\d+)?)\s*%/i);
            if (agiM) {
                const val = parseFloat(agiM[1]);
                bfPAtk += val * 0.3;
                bfEva += val * 0.5;
            }

            const wisM = effectStr.match(/WIS\s*([+-]?\d+(?:\.\d+)?)\s*%/i);
            if (wisM) {
                const val = parseFloat(wisM[1]);
                bfMAtk += val * 0.2;
                bfMDef += val;
                bfMEva += val * 0.5;
            }

            const ctrlM = effectStr.match(/CTRL\s*([+-]?\d+(?:\.\d+)?)\s*%/i);
            if (ctrlM) bfCrit += parseFloat(ctrlM[1]) * 0.1;

            // 직접 명시된 스탯 버프 파싱
            const pAtkM = effectStr.match(/(?:물리\s*공격력|물리공격력)\s*([+-]?\d+(?:\.\d+)?)\s*%/i);
            if (pAtkM) bfPAtk += parseFloat(pAtkM[1]);

            const mAtkM = effectStr.match(/(?:마법\s*공격력|마법공격력)\s*([+-]?\d+(?:\.\d+)?)\s*%/i);
            if (mAtkM) bfMAtk += parseFloat(mAtkM[1]);

            const pDefM = effectStr.match(/(?:물리\s*방어력|물리방어력)\s*([+-]?\d+(?:\.\d+)?)\s*%/i);
            if (pDefM) bfPDef += parseFloat(pDefM[1]);

            const mDefM = effectStr.match(/(?:마법\s*방어력|마법방어력)\s*([+-]?\d+(?:\.\d+)?)\s*%/i);
            if (mDefM) bfMDef += parseFloat(mDefM[1]);

            const critM = effectStr.match(/(?:치명타율|치명타\s*확률|치명타)\s*([+-]?\d+(?:\.\d+)?)\s*%/i);
            if (critM) bfCrit += parseFloat(critM[1]);

            const resM = effectStr.match(/(?:상태이상\s*저항|상태이상저항)\s*([+-]?\d+(?:\.\d+)?)\s*%/i);
            if (resM) bfResist += parseFloat(resM[1]);

            const mAcc = effectStr.match(/(?:물리\s*명중률|물리명중률|P\.Acc|Acc)\s*([+-]?\d+(?:\.\d+)?)/i);
            if (mAcc) {
                const val = parseFloat(mAcc[1]);
                bAcc += val;
                bfAcc += val;
            }
            const mMAcc = effectStr.match(/(?:마법\s*명중률|마법명중률|M\.Acc|MAcc)\s*([+-]?\d+(?:\.\d+)?)/i);
            if (mMAcc) {
                const val = parseFloat(mMAcc[1]);
                bMAcc += val;
                bfMAcc += val;
            }
            const mEva = effectStr.match(/(?:물리\s*회피율|물리회피율|P\.Eva|Eva)\s*([+-]?\d+(?:\.\d+)?)/i);
            if (mEva) {
                const val = parseFloat(mEva[1]);
                bEva += val;
                bfEva += val;
            }
            const mMEva = effectStr.match(/(?:마법\s*회피율|마법회피율|M\.Eva|MEva)\s*([+-]?\d+(?:\.\d+)?)/i);
            if (mMEva) {
                const val = parseFloat(mMEva[1]);
                bMEva += val;
                bfMEva += val;
            }
        });
    }

    return {
      resonanceMult: resMult,
      derived: derivedStats,
      elementalSynergy,
      weaponElement,
      activeMasteryInfo,
      flatPAtk: fPAtk, multPAtk: mPAtk,
      flatMAtk: fMAtk, multMAtk: mMAtk,
      flatPDef: fPDef, multPDef: mPDef,
      flatMDef: fMDef, multMDef: mMDef,
      flatCrit: fCrit, multCrit: mCrit,
      bonusCritDmg: bCritDmg,
      flatResist: fResist, multResist: mResist,
      bonusAcc: bAcc, bonusEva: bEva, bonusMAcc: bMAcc, bonusMEva: bMEva,
      stylePAtk: sPAtk, styleMAtk: sMAtk,
      stylePDef: sPDef, styleMDef: sMDef,
      styleCrit: sCrit, styleResist: sResist,
      styleAcc: sAcc, styleEva: sEva, styleMAcc: sMAcc, styleMEva: sMEva,
      buffPAtk: bfPAtk, buffMAtk: bfMAtk,
      buffPDef: bfPDef, buffMDef: bfMDef,
      buffCrit: bfCrit, buffResist: bfResist,
      buffAcc: bfAcc, buffEva: bfEva, buffMAcc: bfMAcc, buffMEva: bfMEva
    };
  }, [stats, equipment, statusEffects, shinryokuType, weaponMastery, skills, affection, bondBonus, elementalDamageBoosts, elementalResistanceBoosts, combatStyle]);

  const StatItem = ({ 
    statKey, 
    label, 
    value, 
    flatBonus, 
    multBonus, 
    styleBonus, 
    buffBonus,
    icon: Icon, 
    color, 
    resonance 
  }: any) => {
    const isSelected = selectedStat === statKey;
    const info = STAT_DESCRIPTIONS[statKey];

    return (
      <div className={`rounded-xl border transition-all duration-200 overflow-hidden ${
        isSelected 
          ? 'bg-slate-900 border-amber-500/80 shadow-lg shadow-amber-950/30' 
          : 'bg-slate-900/90 border-slate-700/80 hover:border-slate-500 hover:bg-slate-800/80'
      }`}>
        <button
          type="button"
          onClick={() => setSelectedStat(isSelected ? null : statKey)}
          className="w-full p-3.5 sm:p-4 flex justify-between items-center text-left focus:outline-none transition-colors active:scale-[0.99]"
          aria-expanded={isSelected}
        >
          <div className="flex items-center text-slate-300 min-w-0 pr-2">
            <div className={`p-2 rounded-lg bg-slate-950 border border-slate-800 shrink-0 mr-3 ${color}`}>
              <Icon size={18} />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-bold text-sm text-slate-100 flex items-center flex-wrap gap-1.5">
                {label}
                {resonance && resonance > 1 && (
                  <span className="text-[9px] bg-cyan-900/50 text-cyan-300 px-1.5 py-0.5 rounded border border-cyan-500/30">
                    공명 x{resonance.toFixed(2)}
                  </span>
                )}
              </span>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {flatBonus !== 0 && flatBonus !== undefined && (
                  <span className="text-[9px] text-emerald-400 font-semibold bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-800/40">
                    고정 +{flatBonus}
                  </span>
                )}
                {multBonus !== 0 && multBonus !== undefined && (
                  <span className="text-[9px] text-blue-400 font-semibold bg-blue-950/60 px-1.5 py-0.5 rounded border border-blue-800/40">
                    장비 +{multBonus}%
                  </span>
                )}
                {styleBonus !== 0 && styleBonus !== undefined && (
                  <span className="text-[9px] text-purple-400 font-semibold bg-purple-950/60 px-1.5 py-0.5 rounded border border-purple-800/40">
                    계열 {styleBonus > 0 ? `+${styleBonus.toFixed(0)}%` : `${styleBonus.toFixed(0)}%`}
                  </span>
                )}
                {buffBonus !== 0 && buffBonus !== undefined && (
                  <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded border ${
                    buffBonus > 0 
                      ? 'text-amber-300 bg-amber-950/60 border-amber-800/50' 
                      : 'text-rose-300 bg-rose-950/60 border-rose-800/50'
                  }`}>
                    버프 {buffBonus > 0 ? `+${buffBonus.toFixed(1)}%` : `${buffBonus.toFixed(1)}%`}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-slate-100 font-mono font-bold text-base sm:text-lg">
              {value}
            </span>
            <div className={`p-1 rounded text-slate-400 transition-transform duration-200 ${isSelected ? 'rotate-180 text-amber-400 bg-amber-950/50' : 'bg-slate-800/50'}`}>
              <ChevronDown size={14} />
            </div>
          </div>
        </button>

        {isSelected && info && (
          <div className="px-3.5 pb-3.5 sm:px-4 sm:pb-4 pt-1 border-t border-slate-800/80 bg-slate-950/70 text-xs animate-in fade-in slide-in-from-top-1 duration-150">
            <div className="space-y-2 mt-1">
              <div className="flex items-start gap-1.5 text-slate-200">
                <Info size={14} className="text-amber-400 shrink-0 mt-0.5" />
                <p className="leading-relaxed break-keep">{info.desc}</p>
              </div>

              <div className="bg-slate-900/90 rounded-lg p-2.5 border border-slate-800 space-y-1">
                <div className="flex items-center gap-1 text-[11px] font-bold text-amber-400">
                  <span>산출 공식</span>
                </div>
                <p className="text-[11px] text-slate-300 font-mono leading-relaxed break-keep">
                  {info.formula}
                </p>
              </div>

              <div className="bg-slate-900/60 rounded-lg p-2 border border-slate-800/60 text-[11px] text-slate-400">
                <span className="text-slate-300 font-semibold">전투 효과: </span>
                <span className="break-keep">{info.effect}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

   return (
     <div className="fixed inset-0 z-[180] flex items-center justify-center bg-black/90 backdrop-blur-sm p-2 sm:p-4 font-sans pointer-events-auto">
      {showElementalModal && (
        <ElementalStatsModal 
          name={name}
          stats={stats}
          elementalStats={derived.elemental}
          onClose={() => setShowElementalModal(false)}
        />
      )}

      <div className="bg-slate-950 w-full max-w-md rounded-xl border border-slate-600 shadow-2xl relative overflow-hidden animate-in fade-in zoom-in-95 flex flex-col max-h-[95vh] sm:max-h-[85vh]">
        <div className="p-3 sm:p-4 border-b border-slate-800 bg-slate-900/50 flex justify-between items-center shrink-0">
          <h3 className="text-lg sm:text-xl font-bold text-amber-500 font-cinzel flex items-center">
            {showAilmentGuide ? <BookOpen className="mr-2" size={20} /> : <Target className="mr-2" size={20} />}
            {showAilmentGuide ? '상태이상 도감' : '상세 능력치'}
          </h3>
          <button onClick={onClose} className="text-slate-500 hover:text-white p-1 rounded-full hover:bg-slate-800 transition-colors">
            <X size={20} className="sm:w-6 sm:h-6" />
          </button>
        </div>

        <div className="p-3 sm:p-6 flex-1 overflow-y-auto custom-scrollbar">
          {!showAilmentGuide ? (
              <div className="space-y-4">
                <div className="text-center mb-4">
                    <span className="text-slate-400 text-sm">대상:</span>
                    <span className="text-white font-bold text-lg ml-2">{name}</span>
                </div>

                {activeMasteryInfo && (
                    <div className="bg-slate-800/50 p-3 rounded-lg border border-amber-900/50 flex justify-between items-center mb-2">
                        <div className="flex items-center text-amber-500 font-bold text-sm">
                            <TrendingUp size={16} className="mr-2"/>
                            {WEAPON_TYPE_KOREAN[activeMasteryInfo.type] || activeMasteryInfo.type} 숙련도
                        </div>
                        <div className="flex items-col text-right">
                            <span className="text-xs text-white font-mono bg-amber-900/50 px-2 rounded">Lv.{activeMasteryInfo.level}</span>
                        </div>
                    </div>
                )}

                {/* 전투 계열 보너스 상태 표시 */}
                {combatStyle && COMBAT_STYLE_CONFIG[combatStyle] && (() => {
                    const styleInfo = COMBAT_STYLE_CONFIG[combatStyle];
                    const isSpecialtyEquipped = equipment ? hasCombatStyleSpecialtyEquipped(combatStyle, equipment) : false;
                    const styleDetails = getCombatStyleBonusDetails(combatStyle);
                    const tierBonus = getCombatStyleBonusPercent(styleInfo.tier);

                    return (
                        <div className="bg-slate-900/90 border border-amber-900/50 p-3.5 rounded-xl space-y-2 mb-3 shadow-md">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Sword size={16} className="text-amber-400" />
                                    <span className="text-xs font-bold text-amber-300">
                                        전투 계열: {styleInfo.label} ({styleInfo.tier}차)
                                    </span>
                                </div>
                                {isSpecialtyEquipped ? (
                                    <span className="text-[10px] font-extrabold bg-emerald-950 text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/40">
                                        특화 보너스 적용 (+{tierBonus}%)
                                    </span>
                                ) : (
                                    <span className="text-[10px] font-bold bg-slate-800 text-slate-400 px-2 py-0.5 rounded border border-slate-700">
                                        특화 무기 미장착
                                    </span>
                                )}
                            </div>
                            
                            <p className="text-[11px] text-slate-300">
                                🎯 특화 무기: <strong className="text-amber-200">{styleInfo.specialtyText}</strong> ({styleInfo.weapons.join(', ')})
                            </p>

                            {isSpecialtyEquipped && styleDetails.bonusTextList.length > 0 ? (
                                <div className="flex flex-wrap gap-1.5 pt-1 border-t border-slate-800">
                                    {styleDetails.bonusTextList.map((txt, idx) => (
                                        <span key={idx} className="text-[10px] font-bold bg-emerald-900/60 text-emerald-200 px-2 py-0.5 rounded border border-emerald-700/50">
                                            {txt}
                                        </span>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-[10px] text-amber-400/80 italic pt-1 border-t border-slate-800/80">
                                    * 특화 무기를 장착하면 계열 기본 공격력/마법력 +{tierBonus}% 및 고유 능력치 보너스가 능력치에 반영됩니다.
                                </p>
                            )}
                        </div>
                    );
                })()}

                {elementalSynergy && (
                    <div className="bg-gradient-to-r from-cyan-900/30 to-blue-900/30 p-3 rounded-lg border border-cyan-500/50 mb-4 animate-pulse">
                        <div className="flex items-center justify-center text-cyan-300 font-bold text-sm">
                            <Sparkles size={16} className="mr-2" />
                            신력 공명 활성화
                        </div>
                        <p className="text-[10px] text-cyan-200/80 text-center mt-1">
                            무기 속성[{weaponElement}]과 신력이 일치하여 물리/마법 공격력이 {resonanceMult.toFixed(2)}배 증가합니다.
                        </p>
                    </div>
                )}

                <div className="flex items-center justify-between px-1 text-xs text-slate-400">
                    <span className="flex items-center gap-1.5 text-amber-400 font-semibold text-xs">
                        <Info size={14} className="shrink-0" />
                        <span>능력치를 누르면 상세 설명과 공식을 확인할 수 있습니다.</span>
                    </span>
                    {selectedStat && (
                        <button 
                            type="button" 
                            onClick={() => setSelectedStat(null)} 
                            className="text-[11px] text-slate-400 hover:text-white underline shrink-0 ml-2"
                        >
                            접기
                        </button>
                    )}
                </div>

                <div className="grid grid-cols-1 gap-2.5">
                    <StatItem 
                        statKey="pAtk"
                        label="물리 공격력" 
                        value={derived.pAtk.toFixed(1)} 
                        flatBonus={flatPAtk}
                        multBonus={multPAtk}
                        styleBonus={stylePAtk}
                        buffBonus={buffPAtk}
                        icon={Sword} 
                        color="text-red-500" 
                        resonance={resonanceMult}
                    />
                    <StatItem 
                        statKey="mAtk"
                        label="마법 공격력" 
                        value={derived.mAtk.toFixed(1)} 
                        flatBonus={flatMAtk}
                        multBonus={multMAtk}
                        styleBonus={styleMAtk}
                        buffBonus={buffMAtk}
                        icon={Zap} 
                        color="text-purple-500" 
                        resonance={resonanceMult}
                    />
                    <StatItem 
                        statKey="pDef"
                        label="물리 방어력" 
                        value={derived.pDef.toFixed(1)} 
                        flatBonus={flatPDef}
                        multBonus={multPDef}
                        styleBonus={stylePDef}
                        buffBonus={buffPDef}
                        icon={Shield} 
                        color="text-slate-400" 
                    />
                    <StatItem 
                        statKey="mDef"
                        label="마법 방어력" 
                        value={derived.mDef.toFixed(1)} 
                        flatBonus={flatMDef}
                        multBonus={multMDef}
                        styleBonus={styleMDef}
                        buffBonus={buffMDef}
                        icon={Shield} 
                        color="text-blue-400" 
                    />
                    <StatItem 
                        statKey="accuracy"
                        label="물리 명중률" 
                        value={`${derived.accuracy.toFixed(1)}%`} 
                        icon={Crosshair} 
                        color="text-green-300" 
                        flatBonus={0}
                        multBonus={bonusAcc}
                        styleBonus={styleAcc}
                        buffBonus={buffAcc}
                    />
                    <StatItem 
                        statKey="evasion"
                        label="물리 회피율" 
                        value={`${derived.evasion.toFixed(1)}%`} 
                        icon={ShieldCheck} 
                        color="text-slate-300" 
                        flatBonus={0}
                        multBonus={bonusEva}
                        styleBonus={styleEva}
                        buffBonus={buffEva}
                    />
                    <StatItem 
                        statKey="mAccuracy"
                        label="마법 명중률" 
                        value={`${derived.mAccuracy.toFixed(1)}%`} 
                        icon={Sparkles} 
                        color="text-cyan-400" 
                        flatBonus={0}
                        multBonus={bonusMAcc}
                        styleBonus={styleMAcc}
                        buffBonus={buffMAcc}
                    />
                    <StatItem 
                        statKey="mEvasion"
                        label="마법 회피율" 
                        value={`${derived.mEvasion.toFixed(1)}%`} 
                        icon={ShieldCheck} 
                        color="text-blue-500" 
                        flatBonus={0}
                        multBonus={bonusMEva}
                        styleBonus={styleMEva}
                        buffBonus={buffMEva}
                    />
                    <StatItem 
                        statKey="critChance"
                        label="치명타 확률" 
                        value={`${derived.critChance.toFixed(1)}%`} 
                        flatBonus={flatCrit}
                        multBonus={multCrit}
                        styleBonus={styleCrit}
                        buffBonus={buffCrit}
                        icon={Target} 
                        color="text-yellow-500" 
                    />
                    <StatItem 
                        statKey="critDamage"
                        label="치명타 피해량" 
                        value={`${derived.critDamage.toFixed(2)}배`} 
                        flatBonus={bonusCritDmg ? `+${bonusCritDmg}%` : 0} 
                        icon={Flame} 
                        color="text-orange-500" 
                    />
                    <StatItem 
                        statKey="statusResist"
                        label="상태이상 저항률" 
                        value={`${derived.statusResist.toFixed(1)}%`} 
                        flatBonus={flatResist}
                        multBonus={multResist}
                        styleBonus={styleResist}
                        buffBonus={buffResist}
                        icon={Shield} 
                        color="text-green-500" 
                    />
                    <StatItem 
                        statKey="critDmgResist"
                        label="치명타 피해 감소" 
                        value={`${derived.critDmgResist.toFixed(1)}%`} 
                        icon={ShieldCheck} 
                        color="text-emerald-400" 
                    />
                    <StatItem 
                        statKey="critResist"
                        label="치명타 저항" 
                        value={`${(derived.critResist || 0).toFixed(1)}%`} 
                        icon={ShieldCheck} 
                        color="text-teal-400" 
                    />
                    <StatItem 
                        statKey="ctrlPenetration"
                        label="제어 관통력" 
                        value={`${(derived.ctrlPenetration || 0).toFixed(1)}%`} 
                        icon={Crosshair} 
                        color="text-indigo-400" 
                    />
                    <StatItem 
                        statKey="ctrlResist"
                        label="제어 저항력" 
                        value={`${(derived.ctrlResist || 0).toFixed(1)}%`} 
                        icon={ShieldCheck} 
                        color="text-blue-400" 
                    />
                </div>
                
                {/* 적용 중인 버프 효과 (버프 스킬 및 버프 아이템) */}
                <div className="bg-slate-900/95 p-3.5 sm:p-4 rounded-xl border border-slate-700/80 shadow-md space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                        <div className="flex items-center gap-2">
                            <Sparkle size={16} className="text-amber-400" />
                            <h4 className="text-xs sm:text-sm font-bold text-slate-100">
                                적용 중인 버프 효과
                            </h4>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-amber-300 border border-slate-700">
                            {categorizedStatusList.length}개 활성화
                        </span>
                    </div>

                    {categorizedStatusList.length > 0 ? (
                        <div className="space-y-2 max-h-56 overflow-y-auto custom-scrollbar pr-0.5">
                            {categorizedStatusList.map((status, idx) => {
                                const StatusIcon = status.icon;
                                return (
                                    <div key={idx} className="bg-slate-950/70 p-2.5 rounded-lg border border-slate-800/80 flex flex-col gap-1.5 transition-colors hover:border-slate-700">
                                        <div className="flex items-center justify-between gap-2">
                                            <div className="flex items-center gap-1.5 min-w-0">
                                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border shrink-0 ${status.categoryColor}`}>
                                                    {status.categoryLabel}
                                                </span>
                                                <span className="text-xs font-bold text-white truncate flex items-center gap-1">
                                                    <StatusIcon size={12} className="shrink-0" />
                                                    {status.name}
                                                </span>
                                            </div>
                                            <span className="text-[10px] font-medium text-slate-400 shrink-0 flex items-center gap-1 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                                                <Clock size={10} className="text-slate-500" />
                                                {status.durationText}
                                            </span>
                                        </div>

                                        <div className="flex items-center justify-between text-[11px] text-slate-300 pl-1">
                                            <span className="leading-relaxed break-keep">
                                                {status.effect || status.originalEffect || '상세 효과 적용 중'}
                                            </span>
                                            {status.isDiminished && (() => {
                                                const rawRate = status.diminishedRate ?? 50;
                                                const rate = rawRate > 0 && rawRate <= 1 ? Math.round(rawRate * 100) : Math.round(rawRate);
                                                return (
                                                    <span className="text-[9px] font-semibold text-rose-400 bg-rose-950/50 px-1.5 py-0.5 rounded border border-rose-800/40 shrink-0 ml-2">
                                                        효과 감쇄 {rate}%
                                                    </span>
                                                );
                                            })()}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="bg-slate-950/40 p-3 rounded-lg border border-slate-800/60 text-center">
                            <p className="text-xs text-slate-400">현재 활성화된 버프 스킬이나 버프 아이템 효과가 없습니다.</p>
                            <p className="text-[10px] text-slate-500 mt-0.5">영약, 비약, 음식 또는 버프 스킬을 사용하면 효과가 여기에 표시됩니다.</p>
                        </div>
                    )}

                    {/* 인연 버프 상태 */}
                    <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
                        <span className="text-slate-400 text-[11px] flex items-center gap-1">
                            <Heart size={12} className="text-pink-400 fill-current" /> 인연 버프
                        </span>
                        {bondBonus && bondBonus > 0 ? (
                            <span className="text-[11px] font-bold text-pink-300 bg-pink-950/50 px-2 py-0.5 rounded border border-pink-800/40">
                                공격력 +{Math.round(bondBonus * 100)}% 적용 중
                            </span>
                        ) : (
                            <span className="text-[10px] text-slate-500">미적용</span>
                        )}
                    </div>
                </div>

                {/* 보유 패시브 버프 스킬 섹션 */}
                {passiveBuffSkills.length > 0 && (
                    <div className="bg-slate-900/90 p-3.5 rounded-xl border border-slate-800 space-y-2">
                        <div className="flex items-center justify-between border-b border-slate-800/80 pb-1.5">
                            <div className="flex items-center gap-1.5">
                                <Sparkles size={14} className="text-purple-400" />
                                <h4 className="text-xs font-bold text-purple-300">
                                    보유 패시브 버프 스킬 ({passiveBuffSkills.length})
                                </h4>
                            </div>
                            <span className="text-[10px] text-slate-400">상시 적용</span>
                        </div>
                        <div className="space-y-1.5 max-h-36 overflow-y-auto custom-scrollbar pr-0.5">
                            {passiveBuffSkills.map((skill, idx) => (
                                <div key={idx} className="bg-slate-950/60 p-2 rounded-lg border border-slate-800/80 flex justify-between items-center text-xs">
                                    <div className="min-w-0 pr-2">
                                        <p className="font-bold text-white text-[11px] truncate">{skill.name}</p>
                                        <p className="text-[10px] text-slate-400 leading-snug line-clamp-1">{skill.desc || skill.effectDesc || '상시 능력치 강화'}</p>
                                    </div>
                                    <div className="text-right shrink-0">
                                        {skill.powerRatio !== undefined && (
                                            <span className="text-[10px] font-bold text-amber-400 block">위력: {skill.powerRatio}</span>
                                        )}
                                        <span className="text-[9px] text-purple-400 font-semibold bg-purple-950/50 px-1 py-0.5 rounded border border-purple-800/40">패시브</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-1 text-[10px] text-slate-500 leading-relaxed">
                    {bondSkills && bondSkills.length > 0 && (
                        <div className="bg-slate-950/50 p-3 rounded-lg border border-pink-500/20 mb-3">
                            <p className="font-bold text-pink-400 text-[10px] flex items-center gap-2 mb-2">
                                <Sparkles size={12}/> 보유 인연 스킬 ({bondSkills.length})
                            </p>
                            <div className="space-y-1.5 max-h-32 overflow-y-auto custom-scrollbar pr-1">
                                {bondSkills.map((skill, idx) => (
                                    <div key={idx} className="bg-slate-900/80 p-2 rounded border border-slate-800 flex justify-between items-center">
                                        <div>
                                            <p className="text-[11px] font-bold text-white">{skill.name}</p>
                                            <p className="text-[9px] text-slate-500 italic">{skill.companionName} 동행</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[10px] font-bold text-amber-500">위력: {skill.powerRatio}</p>
                                            <p className="text-[9px] text-indigo-400">마나: {(skill.type === SkillType.PASSIVE || (skill.type as string) === '패시브') ? 0 : skill.mpCost}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <p className="font-bold text-slate-400 mb-1">공식 가이드 (전투 엔진 적용 수치):</p>
                    <p>• 물리 공격력 = (STR + (AGI × 0.3) + 장비고정치) × 장비/버프/스타일 배율%</p>
                    <p>• 마법 공격력 = (INT + (WIS × 0.3) + 장비고정치) × 장비/버프/스타일 배율%</p>
                    <p>• 물리 방어력 = (DEF × 0.8 + 장비고정치) × 장비/버프/스타일 배율%</p>
                    <p>• 마법 방어력 = ((DEF × 0.4) + (WIS × 0.4) + 장비고정치) × 장비/버프/스타일 배율%</p>
                    <p>• 물리 명중률 = [기본 85% + (AGI × 0.01) + (STR × 0.005) + 종합 보정] × (1 + 장비/버프 명중배율%)</p>
                    <p>• 물리 회피율 = [(AGI × 0.0075) + (WIS × 0.0035)] × (1 + 장비/버프 회피배율%)</p>
                    <p>• 마법 명중률 = [기본 85% + (WIS × 0.01) + (INT × 0.005) + 종합 보정] × (1 + 장비/버프 마법명중배율%)</p>
                    <p>• 마법 회피율 = [(WIS × 0.0075) + (AGI × 0.0035)] × (1 + 장비/버프 마법회피배율%)</p>
                    <p className="text-[10px] text-slate-500 mt-1">* 종합 능력치 보정 = (STR+INT+WIS+DEF+AGI+CTRL) / 6 × 0.05%</p>
                    <p>• 치명타 확률 = 5% + (CTRL × 0.000001)% + (AGI × 0.000001)% + 장비/스킬 배율% (최대 100%)</p>
                    <p>• 치명타 피해량 = 기본 1.4배 + (CTRL / 1000000, 최대 2.5배) + 장비/패시브 보너스</p>
                    <p>• 치명타 피해 감소 = 장비 및 특성 보너스 총합% (최대 95%)</p>
                    <p>• 치명타 저항 = 패시브 및 스탯/장비 보너스 총합% (최대 100%)</p>
                    <p>• 상태이상 저항률 = (CTRL / (CTRL + 10000)) × 100% + 장비/스킬 보너스% (최대 100%)</p>
                    <p>• 제어 관통력 = 제어력 비례 (상대 방어력 최대 50% 관통 및 디버프 적중률 향상)</p>
                    <p>• 제어 저항력 = 제어력 비례 (상대 제어 관통력 차감 및 상태이상 방어)</p>
                </div>
                
                <div className="pt-4 border-t border-slate-800 space-y-3">
                    <button 
                        onClick={() => setShowElementalModal(true)}
                        className="w-full py-4 bg-gradient-to-r from-indigo-900/40 to-blue-900/40 hover:from-indigo-900/60 hover:to-blue-900/60 text-indigo-300 rounded-xl font-bold text-sm border border-indigo-500/30 flex items-center justify-center transition-all shadow-lg group"
                    >
                        <Sparkles size={18} className="mr-2 group-hover:rotate-12 transition-transform" />
                        속성 상세 정보 열기
                    </button>
                    
                    <button 
                        onClick={() => setShowAilmentGuide(true)}
                        className="w-full py-3 mt-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-bold text-xs border border-slate-600 hover:border-slate-500 flex items-center justify-center transition-colors"
                    >
                        <BookOpen size={16} className="mr-2" /> 상태이상 도감 확인
                    </button>
                </div>
              </div>
          ) : (
              <div className="space-y-4">
                  <button 
                    onClick={() => setShowAilmentGuide(false)}
                    className="mb-2 text-xs text-slate-400 hover:text-white flex items-center"
                  >
                      ← 상세 스탯으로 돌아가기
                  </button>
                  
                  <div className="space-y-3">
                      {(Object.entries(STATUS_AILMENTS_DATA) as [string, { desc: string, duration: string }][]).map(([name, data]) => (
                          <div key={name} className="bg-slate-900/50 p-3 rounded border border-slate-800">
                              <div className="flex justify-between items-center mb-1">
                                  <span className="text-amber-500 font-bold text-sm flex items-center">
                                      <AlertCircle size={12} className="mr-1.5"/> {name}
                                  </span>
                                  <span className="text-slate-500 text-[10px] bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                                      {data.duration}
                                  </span>
                              </div>
                              <p className="text-xs text-slate-300 leading-relaxed">{data.desc}</p>
                          </div>
                      ))}
                  </div>
              </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DetailedStatsModal;
