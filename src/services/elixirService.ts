import { ActiveStatus } from '../types';

/**
 * 실시간(초 단위)으로 소모되는 성장형 비약(경험치, 골드, 드롭률, 무기/스킬 숙련도)인지 확인합니다.
 * 스탯 증가 비약(마나의 비약, 힘의 비약 등) 및 전투 버프는 턴제(Turn-based)로 적용됩니다.
 */
export function isRealTimeElixir(status?: { name?: string; effect?: string; duration?: number } | null): boolean {
  if (!status || !status.name) return false;
  const name = status.name;
  const effect = status.effect || '';

  // 1. 이펙트 문자열 접두사 확인 (성장형 비약 고유 포맷)
  if (
    effect.startsWith('EXP x') ||
    effect.startsWith('GOLD x') ||
    effect.startsWith('Drop x') ||
    effect.startsWith('WeaponMastery x') ||
    effect.startsWith('SkillMastery x')
  ) {
    return true;
  }

  // 2. 스탯/전투 버프형 영약·포션·주문서(공격력 강화 영약, 방어력 강화 영약, 마나의 비약, 힘의 비약 등)는 턴제 버프
  const isStatPotion = 
    name.includes('마나의 비약') || 
    name.includes('힘의 비약') || 
    name.includes('강화 영약') ||
    name.includes('공격력') ||
    name.includes('마력') ||
    name.includes('통제') ||
    name.includes('전체 능력치') ||
    name.includes('속성 저항') ||
    name.includes('주문서') ||
    name.includes('물약') ||
    name.includes('완력') || 
    name.includes('민첩') || 
    name.includes('지력') || 
    name.includes('체력') || 
    name.includes('지혜') || 
    name.includes('방어');

  if (isStatPotion) {
    return false;
  }

  // 3. 성장형 비약 명칭 확인
  const isGrowthElixirName = 
    name.includes('경험치') || 
    name.includes('골드') || 
    name.includes('드롭률') || 
    name.includes('무기숙련도') || 
    name.includes('스킬숙련도');

  return isGrowthElixirName;
}

/**
 * 턴제 버프의 지속 턴수가 비정상적인 초 단위 값(600, 1800, 3600 등)으로 저장된 경우 정상 턴수(5/10/15턴)로 보정합니다.
 */
export function sanitizeTurnStatusDuration(status?: { name?: string; effect?: string; duration?: number } | null): number {
  if (!status || status.duration === undefined || status.duration === null) return 0;
  const dur = Number(status.duration);
  if (isRealTimeElixir(status)) return dur;
  if (dur >= 60 && dur !== 999) {
    const text = `${status.name || ''} ${status.effect || ''}`;
    if (text.includes('15턴') || dur === 3600) return 15;
    if (text.includes('5턴')) return 5;
    return 10;
  }
  return dur;
}

/**
 * 상태 효과의 지속시간/지속턴을 형식화하여 반환합니다.
 */
export function formatStatusDuration(status?: { name?: string; effect?: string; duration?: number } | null): string {
  if (!status || status.duration === undefined || status.duration === null || status.duration <= 0) return '';
  
  if (isRealTimeElixir(status)) {
    const totalSecs = Number(status.duration);
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    if (mins > 0 && secs > 0) return `(${mins}분 ${secs}초)`;
    if (mins > 0) return `(${mins}분)`;
    return `(${secs}초)`;
  }

  const validTurns = sanitizeTurnStatusDuration(status);
  return `(${validTurns}턴)`;
}
