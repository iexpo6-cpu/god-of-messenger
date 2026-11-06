import { Character, Companion, ActiveStatus } from '../types';
import { isRealTimeElixir, sanitizeTurnStatusDuration } from './elixirService';

type Listener = () => void;

/**
 * 실시간 영약 타이머 상태 격리 서비스 (만료 시각 타임스탬프 기반)
 * - 실제 시간(Date.now())을 기준으로 남은 시간을 계산하므로,
 *   React StrictMode의 더블 인보케이션(Double-invocation)이나 프레임 드랍에도
 *   정확하게 1초에 1초씩만 줄어듭니다.
 * - 오직 영약이 만료(0초)되는 순간에만 setCharacter를 호출하여 불필요한 전체 리렌더링을 100% 방지합니다.
 */
class ElixirRealtimeService {
  // key: "entityId:statusName" -> 만료 예정 시각 타임스탬프 (밀리초)
  private expiresAtMap = new Map<string, number>();
  private listeners = new Set<Listener>();

  /**
   * 엔티티와 상태 효과로부터 고유 키를 생성합니다.
   */
  private getKey(entityId: string, statusName: string): string {
    return `${entityId}:${statusName}`;
  }

  /**
   * 영약의 만료 예정 시각을 등록하거나 갱신합니다.
   */
  public registerElixir(entityId: string, status: ActiveStatus): void {
    if (!isRealTimeElixir(status)) return;
    const key = this.getKey(entityId, status.name);
    if (!this.expiresAtMap.has(key)) {
      const durationSecs = Math.max(0, Number(status.duration || 0));
      this.expiresAtMap.set(key, Date.now() + durationSecs * 1000);
    }
  }

  /**
   * 비약 사용 등으로 즉시 새로운 지속시간으로 등록/갱신합니다.
   */
  public registerOrRefreshElixir(entityId: string, status: ActiveStatus): void {
    if (!isRealTimeElixir(status)) return;
    const key = this.getKey(entityId, status.name);
    const durationSecs = Math.max(0, Number(status.duration || 0));
    this.expiresAtMap.set(key, Date.now() + durationSecs * 1000);
    this.notify();
  }

  /**
   * 특정 비약 만료/제거 시 맵에서 삭제합니다.
   */
  public removeElixir(entityId: string, statusName: string): void {
    const key = this.getKey(entityId, statusName);
    this.expiresAtMap.delete(key);
    this.notify();
  }

  /**
   * 엔티티의 모든 비약 상태를 초기화합니다.
   */
  public removeEntityElixirs(entityId: string): void {
    for (const key of Array.from(this.expiresAtMap.keys())) {
      if (key.startsWith(`${entityId}:`)) {
        this.expiresAtMap.delete(key);
      }
    }
    this.notify();
  }

  /**
   * 세이브 파일 로드 시 저장된 남은 지속시간으로 맵을 완전히 재초기화합니다.
   * 로드 후 10분으로 리셋되는 현상을 방지하고 저장 시점의 남은 초를 그대로 이어갑니다.
   */
  public reinitializeFromCharacter(char: Character): void {
    this.expiresAtMap.clear();
    if (!char) return;
    const now = Date.now();
    for (const eff of char.statusEffects || []) {
      if (isRealTimeElixir(eff)) {
        const key = this.getKey('player', eff.name);
        const durationSecs = Math.max(0, Number(eff.duration || 0));
        if (durationSecs > 0) {
          this.expiresAtMap.set(key, now + durationSecs * 1000);
        }
      }
    }
    for (const comp of char.companions || []) {
      for (const eff of comp.statusEffects || []) {
        if (isRealTimeElixir(eff)) {
          const key = this.getKey(comp.id, eff.name);
          const durationSecs = Math.max(0, Number(eff.duration || 0));
          if (durationSecs > 0) {
            this.expiresAtMap.set(key, now + durationSecs * 1000);
          }
        }
      }
    }
    for (const comp of char.inactiveCompanions || []) {
      for (const eff of comp.statusEffects || []) {
        if (isRealTimeElixir(eff)) {
          const key = this.getKey(comp.id, eff.name);
          const durationSecs = Math.max(0, Number(eff.duration || 0));
          if (durationSecs > 0) {
            this.expiresAtMap.set(key, now + durationSecs * 1000);
          }
        }
      }
    }
    this.notify();
  }

  /**
   * 특정 영약의 남은 시간(초)을 실제 시간 기준으로 정밀 계산하여 반환합니다.
   */
  public getRemainingSeconds(entityId: string, status: ActiveStatus): number {
    if (!isRealTimeElixir(status)) return sanitizeTurnStatusDuration(status);
    const key = this.getKey(entityId, status.name);
    const now = Date.now();

    if (!this.expiresAtMap.has(key)) {
      const durationSecs = Math.max(0, Number(status.duration || 0));
      this.expiresAtMap.set(key, now + durationSecs * 1000);
      return durationSecs;
    }

    const expiresAt = this.expiresAtMap.get(key)!;
    return Math.max(0, Math.ceil((expiresAt - now) / 1000));
  }

  /**
   * 1초 단위 틱을 처리하고, 실제 시간 기준 만료된 영약이 있는지 검사합니다.
   */
  public tick(character: Character): {
    hasExpired: boolean;
    expiredMessages: string[];
    updatedCharacter: Character;
  } {
    const now = Date.now();
    let hasExpired = false;
    const expiredMessages: string[] = [];

    // 1. 플레이어 영약 처리
    const nextPlayerStatusEffects: ActiveStatus[] = [];
    const currentPlayerEffects = character.statusEffects || [];

    for (const eff of currentPlayerEffects) {
      if (isRealTimeElixir(eff)) {
        const key = this.getKey('player', eff.name);
        if (!this.expiresAtMap.has(key)) {
          const durationSecs = Math.max(0, Number(eff.duration || 0));
          this.expiresAtMap.set(key, now + durationSecs * 1000);
        }

        const expiresAt = this.expiresAtMap.get(key)!;
        const remainingSecs = Math.max(0, Math.ceil((expiresAt - now) / 1000));

        if (remainingSecs <= 0) {
          hasExpired = true;
          this.expiresAtMap.delete(key);
          expiredMessages.push(`[시스템] 주인공의 '${eff.name}' 효과가 만료되었습니다.`);
        } else {
          nextPlayerStatusEffects.push({ ...eff, duration: remainingSecs });
        }
      } else {
        const sanitizedDur = sanitizeTurnStatusDuration(eff);
        if (sanitizedDur !== eff.duration) {
          hasExpired = true;
          nextPlayerStatusEffects.push({ ...eff, duration: sanitizedDur });
        } else {
          nextPlayerStatusEffects.push(eff);
        }
      }
    }

    // 2. 동료 영약 처리
    const nextCompanions = (character.companions || []).map((comp) => {
      const nextCompEffects: ActiveStatus[] = [];
      let compExpired = false;

      for (const eff of comp.statusEffects || []) {
        if (isRealTimeElixir(eff)) {
          const key = this.getKey(comp.id, eff.name);
          if (!this.expiresAtMap.has(key)) {
            const durationSecs = Math.max(0, Number(eff.duration || 0));
            this.expiresAtMap.set(key, now + durationSecs * 1000);
          }

          const expiresAt = this.expiresAtMap.get(key)!;
          const remainingSecs = Math.max(0, Math.ceil((expiresAt - now) / 1000));

          if (remainingSecs <= 0) {
            hasExpired = true;
            compExpired = true;
            this.expiresAtMap.delete(key);
            expiredMessages.push(`[시스템] ${comp.name}의 '${eff.name}' 효과가 만료되었습니다.`);
          } else {
            nextCompEffects.push({ ...eff, duration: remainingSecs });
          }
        } else {
          const sanitizedDur = sanitizeTurnStatusDuration(eff);
          if (sanitizedDur !== eff.duration) {
            hasExpired = true;
            compExpired = true;
            nextCompEffects.push({ ...eff, duration: sanitizedDur });
          } else {
            nextCompEffects.push(eff);
          }
        }
      }

      if (compExpired) {
        return { ...comp, statusEffects: nextCompEffects };
      }
      return comp;
    });

    // 3. 리스너들에게 틱 알림 (비동기로 안전하게 디스패치)
    this.notify();

    if (hasExpired) {
      return {
        hasExpired: true,
        expiredMessages,
        updatedCharacter: {
          ...character,
          statusEffects: nextPlayerStatusEffects,
          companions: nextCompanions
        }
      };
    }

    return {
      hasExpired: false,
      expiredMessages: [],
      updatedCharacter: character
    };
  }

  /**
   * 저장(Auto-save 등) 시 현재 만료 시각 기준 남은 시간을 캐릭터 객체에 반영합니다.
   */
  public syncToCharacter(char: Character): Character {
    if (!char) return char;
    const now = Date.now();
    const nextStatusEffects = (char.statusEffects || []).map((eff) => {
      if (isRealTimeElixir(eff)) {
        const key = this.getKey('player', eff.name);
        if (this.expiresAtMap.has(key)) {
          const remainingSecs = Math.max(0, Math.ceil((this.expiresAtMap.get(key)! - now) / 1000));
          return { ...eff, duration: remainingSecs };
        }
      }
      const sanitizedDur = sanitizeTurnStatusDuration(eff);
      return sanitizedDur !== eff.duration ? { ...eff, duration: sanitizedDur } : eff;
    }).filter(eff => !isRealTimeElixir(eff) || (Number(eff.duration || 0) > 0));

    const nextCompanions = (char.companions || []).map((comp) => {
      const nextEffects = (comp.statusEffects || []).map((eff) => {
        if (isRealTimeElixir(eff)) {
          const key = this.getKey(comp.id, eff.name);
          if (this.expiresAtMap.has(key)) {
            const remainingSecs = Math.max(0, Math.ceil((this.expiresAtMap.get(key)! - now) / 1000));
            return { ...eff, duration: remainingSecs };
          }
        }
        const sanitizedDur = sanitizeTurnStatusDuration(eff);
        return sanitizedDur !== eff.duration ? { ...eff, duration: sanitizedDur } : eff;
      }).filter(eff => !isRealTimeElixir(eff) || (Number(eff.duration || 0) > 0));
      return { ...comp, statusEffects: nextEffects };
    });

    const nextInactiveCompanions = (char.inactiveCompanions || []).map((comp) => {
      const nextEffects = (comp.statusEffects || []).map((eff) => {
        if (isRealTimeElixir(eff)) {
          const key = this.getKey(comp.id, eff.name);
          if (this.expiresAtMap.has(key)) {
            const remainingSecs = Math.max(0, Math.ceil((this.expiresAtMap.get(key)! - now) / 1000));
            return { ...eff, duration: remainingSecs };
          }
        }
        const sanitizedDur = sanitizeTurnStatusDuration(eff);
        return sanitizedDur !== eff.duration ? { ...eff, duration: sanitizedDur } : eff;
      }).filter(eff => !isRealTimeElixir(eff) || (Number(eff.duration || 0) > 0));
      return { ...comp, statusEffects: nextEffects };
    });

    return {
      ...char,
      statusEffects: nextStatusEffects,
      companions: nextCompanions,
      inactiveCompanions: nextInactiveCompanions
    };
  }

  /**
   * UI 컴포넌트 구독 리스너 등록
   */
  public subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public notify(): void {
    setTimeout(() => {
      this.listeners.forEach((fn) => {
        try {
          fn();
        } catch (err) {
          console.error('ElixirRealtimeService notify error', err);
        }
      });
    }, 0);
  }
}

export const elixirRealtimeService = new ElixirRealtimeService();
