import { Character, Companion } from '../types';

/**
 * [전투 데이터 찌꺼기 및 기억 메모리 누수 방지 서비스]
 * - 반복 전투 시 몬스터 처치 기록이 플레이어 및 모든 동료(활성 및 대기 동료)에게
 *   무제한으로 복제되어 누적되던 현상을 원천 차단합니다.
 * - 기억 데이터(최대 30개)와 시스템 로그(최대 100개)에 상한선을 강제 적용하여
 *   전투를 수백 번 반복해도 브라우저 메모리 부하와 렉을 방지합니다.
 * - 동료 스위치 서비스와의 정합성을 보장하여 전환된 전대 캐릭터의 기억도 함께 정제합니다.
 */

const MAX_MEMORIES = 30;
const MAX_SYSTEM_MESSAGES = 100;

/**
 * 안전한 기억 추가 함수
 * 1. 단순 몬스터 처치 내역은 플레이어에게만 기록하고 대기 동료들에게 무차별 복제되는 것을 방지합니다.
 * 2. 중요한 서사적 사건(결혼, 출산, 승계, 국가 정벌, 토너먼트 우승 등)만 파티 동료에게 공유합니다.
 * 3. 모든 기억은 최근 최대 개수(30개)로 제한하여 메모리 찌꺼기가 남지 않게 슬라이스합니다.
 */
export function safeAddMemory(
  char: Character,
  text: string,
  targets: string[] = ['player']
): void {
  if (!char) return;
  const entry = `[${char.currentDate || '기록'}] ${text}`;

  // 1. 단순 처치 기록 여부 판별
  const isMinorKill = text.includes('처치') && !text.includes('[BOSS]') && !text.includes('신좌') && !text.includes('정벌');

  // 2. 플레이어 기억 갱신
  if (targets.includes('player')) {
    if (!char.memories) char.memories = [];
    char.memories.push(entry);
    if (char.memories.length > MAX_MEMORIES) {
      char.memories = char.memories.slice(-MAX_MEMORIES);
    }
  }

  // 단순 몬스터 처치는 동료들에게 무차별 복제하지 않음
  if (isMinorKill) {
    return;
  }

  // 3. 중요 사건일 때만 현재 파티 동료에게 공유
  if (char.companions && Array.isArray(char.companions)) {
    char.companions.forEach(c => {
      if (!c.memories) c.memories = [];
      c.memories.push(entry);
      if (c.memories.length > MAX_MEMORIES) {
        c.memories = c.memories.slice(-MAX_MEMORIES);
      }
    });
  }

  // 4. 대기 동료(비활성 동료)는 가문 승계나 중대사일 때만 선별 적용
  const isMajorFamilyEvent = text.includes('가주') || text.includes('결혼') || text.includes('탄생') || text.includes('멸망');
  if (isMajorFamilyEvent && char.inactiveCompanions && Array.isArray(char.inactiveCompanions)) {
    char.inactiveCompanions.forEach(c => {
      if (!c.memories) c.memories = [];
      c.memories.push(entry);
      if (c.memories.length > MAX_MEMORIES) {
        c.memories = c.memories.slice(-MAX_MEMORIES);
      }
    });
  }
}

/**
 * 기존에 이미 거대하게 누적된 캐릭터 및 모든 동료의 기억 데이터를 일괄 정제하는 함수
 * - 플레이어 전환 서비스(PlayerCompanionSwitchService) 관련 데이터도 함께 정제
 */
export function cleanseAllMemories(char: Character): Character {
  if (!char) return char;

  // 플레이어 기억 정제
  if (char.memories && char.memories.length > MAX_MEMORIES) {
    char.memories = char.memories.slice(-MAX_MEMORIES);
  }

  // 활성 동료 기억 정제
  if (char.companions && Array.isArray(char.companions)) {
    char.companions.forEach(c => {
      if (c.memories && c.memories.length > MAX_MEMORIES) {
        c.memories = c.memories.slice(-MAX_MEMORIES);
      }
    });
  }

  // 비활성(대기) 동료 기억 정제
  if (char.inactiveCompanions && Array.isArray(char.inactiveCompanions)) {
    char.inactiveCompanions.forEach(c => {
      if (c.memories && c.memories.length > MAX_MEMORIES) {
        c.memories = c.memories.slice(-MAX_MEMORIES);
      }
    });
  }

  // 플레이어 전환 서비스 관련 보관 데이터가 있는 경우 정제
  const previousHero = (char as any).previousHeroData;
  if (previousHero && previousHero.memories && previousHero.memories.length > MAX_MEMORIES) {
    previousHero.memories = previousHero.memories.slice(-MAX_MEMORIES);
  }

  return char;
}

/**
 * 전역 시스템 메시지 배열 상한선 유지 함수 (최대 100개)
 */
export function trimGameMessages<T>(messages: T[], limit: number = MAX_SYSTEM_MESSAGES): T[] {
  if (!messages || !Array.isArray(messages)) return [];
  if (messages.length > limit) {
    return messages.slice(-limit);
  }
  return messages;
}
