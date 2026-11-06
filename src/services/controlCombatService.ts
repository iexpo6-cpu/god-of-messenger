/**
 * 제어 관통력 및 제어 저항력 전투 계산 전용 서비스
 */

/**
 * 제어력(CTRL) 수치에 기반한 제어 관통력(%) 계산
 * - 최대 50%까지 완만하게 수렴하는 점감 공식 적용
 * - CTRL 25만에서 25%, 100만에서 40%, 200만에서 44.4% 달성
 */
export const calculateControlPenetration = (ctrl: number = 0): number => {
  const safeCtrl = Math.max(0, Number(ctrl) || 0);
  if (safeCtrl <= 0) return 0;
  const rate = (safeCtrl / (safeCtrl + 250000)) * 50;
  return Math.min(50, Math.max(0, rate));
};

/**
 * 제어력(CTRL) 수치에 기반한 제어 저항력(%) 계산
 * - 최대 50%까지 완만하게 수렴하는 점감 공식 적용
 */
export const calculateControlResistance = (ctrl: number = 0): number => {
  const safeCtrl = Math.max(0, Number(ctrl) || 0);
  if (safeCtrl <= 0) return 0;
  const rate = (safeCtrl / (safeCtrl + 250000)) * 50;
  return Math.min(50, Math.max(0, rate));
};

/**
 * 제어 관통력과 상대 제어 저항력을 연산하여 최종 유효 방어력을 산출
 * - 공격자의 관통력이 방어자의 저항력을 상회할 때 방어력을 최대 50%까지 관통 무시
 */
export const getEffectiveDefenseWithControl = (
  defense: number,
  attackerCtrl: number = 0,
  defenderCtrl: number = 0
): { effectiveDef: number; netPenetration: number } => {
  const safeDef = Math.max(0, Number(defense) || 0);
  const atkPen = calculateControlPenetration(attackerCtrl);
  const defRes = calculateControlResistance(defenderCtrl);

  // 공격자 관통력 - 방어자 저항력의 절반을 뺀 순수 관통률 산출 (0% ~ 50%)
  const netPen = Math.max(0, Math.min(50, atkPen - (defRes * 0.5)));
  const effectiveDef = Math.max(0, safeDef * (1 - netPen / 100));

  return { effectiveDef, netPenetration: netPen };
};

/**
 * 제어 관통력과 제어 저항력을 반영한 최종 디버프 성공률 보정
 */
export const adjustDebuffRateWithControl = (
  rawRate: number,
  attackerCtrl: number = 0,
  defenderCtrl: number = 0
): number => {
  const atkPen = calculateControlPenetration(attackerCtrl);
  const defRes = calculateControlResistance(defenderCtrl);
  
  // 제어 격차에 따른 보정 (+-20% 한도 내)
  const diffBonus = (atkPen - defRes) * 0.5;
  const clampedBonus = Math.max(-20, Math.min(20, diffBonus));
  
  return Math.min(95, Math.max(5, Math.floor(rawRate + clampedBonus)));
};
