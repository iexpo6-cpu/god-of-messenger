import { ActiveStatus } from '../types';
import { STATUS_AILMENTS_LIST } from '../constants';
import { isRealTimeElixir } from './elixirService';

/**
 * 기본 해로운 상태이상 및 디버프 명칭 목록
 */
export const HARMFUL_AILMENT_NAMES = new Set<string>([
  ...STATUS_AILMENTS_LIST, // 화상, 감전, 빙결, 출혈, 암흑, 공포, 속박, 혼란, 소멸, 흡정, 파열, 월침, 월암, 냉기, 중독
  '기절', '마비', '수면', '침묵', '저주', '실명', '도발', '쇠약', '약화', '스턴',
  '동상', '부패', '감염', '석화', '혼절', '기운 잠식', '마계의 저주', '저주의 반동',
  '방어 감소', '공격력 감소', '방어력 감소', '마법 감소', '능력치 감소', '이동불가', '행동불가'
]);

/**
 * 절대 해제되어서는 안 되는 보호막, 버프, 결계 고유 명칭
 */
export const PROTECTED_BUFF_NAMES = new Set<string>([
  '마나 쉴드',
  '마나 쉴드 (패시브)',
  '방어 태세',
  '전투 태세',
  '수호 결계',
  '기운 초월',
  '지속 치유 결계',
  '지속 마력 결계',
  '일반 휴식',
  '상급 휴식',
  '귀빈 휴식'
]);

/**
 * 상태 효과가 해로운 상태이상(디버프)인지 판별합니다.
 * 이로운 버프 효과(공격력/방어력 증가, 비약, 영약, 보호막 등)는 반드시 false를 반환합니다.
 */
export function isDebuffStatus(status?: ActiveStatus | null): boolean {
  if (!status || !status.name || status.name === 'None') {
    return false;
  }

  // 1. 명시적 버프/디버프 타입 속성이 존재하는 경우
  const anyStatus = status as any;
  if (anyStatus.type === 'BUFF') return false;
  if (anyStatus.type === 'DEBUFF') return true;

  // 2. 실시간 성장 비약(경험치, 골드, 드롭률, 숙련도)은 절대적인 버프
  if (isRealTimeElixir(status)) {
    return false;
  }

  // 3. 보호막, 수호 결계, 태세 등의 보호 목록 확인
  if (PROTECTED_BUFF_NAMES.has(status.name)) {
    return false;
  }
  if (
    status.name.includes('마나 쉴드') ||
    status.name.includes('보호막') ||
    status.name.includes('수호 결계') ||
    status.name.includes('치유 결계') ||
    status.name.includes('마력 결계') ||
    status.name.includes('방어 태세') ||
    status.name.includes('전투 태세') ||
    status.name.includes('기운 초월')
  ) {
    return false;
  }

  // 4. 소모품 비약, 영약, 포션, 요리, 음식 등으로 부여된 버프
  if (
    status.name.includes('비약') ||
    status.name.includes('영약') ||
    status.name.includes('포션') ||
    status.name.includes('주문서') ||
    status.name.includes('요리') ||
    status.name.includes('음식') ||
    status.name.includes('숙련도') ||
    status.name.includes('경험치') ||
    status.name.includes('드롭률') ||
    status.name.includes('골드')
  ) {
    return false;
  }

  // 5. 저항 증가나 피해 증가 등 긍정적 버프 명칭 확인
  if (
    status.name.includes('저항') ||
    status.name.includes('강화') ||
    status.name.includes('축복') ||
    status.name.includes('가속') ||
    status.name.includes('재생') ||
    status.name.includes('신성 공명') ||
    status.name.includes('투지')
  ) {
    return false;
  }

  // 6. 알려진 유해 상태이상 명칭과 직접 일치하는 경우
  if (HARMFUL_AILMENT_NAMES.has(status.name)) {
    return true;
  }

  // 7. 유해 상태이상 핵심 키워드 포함 여부
  const harmfulKeywords = [
    '중독', '출혈', '화상', '감전', '빙결', '기절', '마비', '속박',
    '공포', '저주', '침묵', '실명', '소멸', '흡정', '파열', '월침',
    '월암', '냉기', '혼란', '쇠약', '약화', '동상', '석화', '잠식'
  ];
  if (harmfulKeywords.some(keyword => status.name.includes(keyword))) {
    return true;
  }

  // 8. 효과 설명문 텍스트 분석
  const effectText = (status.originalEffect || status.effect || '').trim();
  if (effectText) {
    // 음수 스탯 감소(-X%, -X 등) 포함 시 디버프
    if (/-\s*\d+(?:\.\d+)?%?/.test(effectText)) {
      return true;
    }
    // 행동불가, 지속 피해, 손실 등의 부정적 키워드
    if (
      effectText.includes('행동불가') ||
      effectText.includes('행동 불가') ||
      effectText.includes('HP 손실') ||
      effectText.includes('HP 감소') ||
      effectText.includes('MP 감소') ||
      effectText.includes('피해(MaxHP') ||
      effectText.includes('받는 피해 증가') ||
      effectText.includes('아군 공격') ||
      effectText.includes('대폭 감소') ||
      effectText.includes('효율 감소')
    ) {
      return true;
    }
    // 양수 스탯 증가(+X%, +X) 및 긍정 키워드 포함 시 버프
    if (/\+\s*\d+(?:\.\d+)?%?/.test(effectText) || effectText.includes('증가') || effectText.includes('상승')) {
      return false;
    }
  }

  // 9. 수치(val) 기준 판별: 음수면 디버프, 양수면 버프
  if (status.val !== undefined && status.val !== null) {
    if (status.val < 0) return true;
    if (status.val > 0) return false;
  }

  return false;
}

/**
 * 상태이상 해제 아이템 사용 시, 버프 효과는 그대로 보존하고 해로운 디버프만 선별하여 해제합니다.
 * - removeTargets에 'ALL'이 포함된 경우: 모든 디버프만 제거하고, 모든 버프는 온전히 유지합니다.
 * - removeTargets에 특정 상태이상(예: '중독', '화상')이 포함된 경우: 해당 디버프만 선별 제거합니다.
 */
export function filterDebuffsForCleanse(
  statusEffects: ActiveStatus[] = [],
  removeTargets: string[] = []
): ActiveStatus[] {
  if (!statusEffects || statusEffects.length === 0) {
    return [];
  }
  if (!removeTargets || removeTargets.length === 0) {
    return statusEffects;
  }

  const isRemoveAll = removeTargets.some(
    target => target === 'ALL' || target === '모든 상태이상' || target === '모든 상태이상 해제'
  );

  return statusEffects.filter((status) => {
    // 이로운 효과(버프, 보호막, 비약 등)는 어떤 경우에도 해제되지 않음
    if (!isDebuffStatus(status)) {
      return true;
    }

    // 디버프인 경우:
    // 1) 전체 상태이상 해제인 경우 모든 디버프 제거
    if (isRemoveAll) {
      return false;
    }

    // 2) 특정 상태이상 해제 대상인 경우 이름 대조 후 제거
    const isTargeted = removeTargets.some((target) => {
      if (!target) return false;
      const cleanTarget = target.trim();
      if (!cleanTarget) return false;
      return (
        status.name === cleanTarget ||
        status.name.includes(cleanTarget) ||
        cleanTarget.includes(status.name)
      );
    });

    return !isTargeted;
  });
}
