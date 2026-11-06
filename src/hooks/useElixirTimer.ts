import { useEffect, useRef, useState } from 'react';
import { Character, ActiveStatus } from '../types';
import { isRealTimeElixir } from '../services/elixirService';
import { elixirRealtimeService } from '../services/elixirRealtimeService';

/**
 * 실시간 영약 타이머 훅
 * - 매초 전체 캐릭터 상태를 갱신하지 않고, 독립적인 메모리 서비스(elixirRealtimeService)에서 초를 차감합니다.
 * - 오직 영약이 만료(0초)되는 시점에만 1회 setCharacter를 호출하여 전체 화면의 불필요한 리렌더링을 완벽하게 차단합니다.
 */
export function useElixirTimer(
  setCharacter: (update: React.SetStateAction<Character>) => void,
  addToLog: (msg: string) => void,
  view: string
) {
  const addToLogRef = useRef(addToLog);
  
  useEffect(() => {
    addToLogRef.current = addToLog;
  }, [addToLog]);

  useEffect(() => {
    if (view !== 'game') return;

    const interval = setInterval(() => {
      setCharacter((prevChar) => {
        if (!prevChar) return prevChar;

        // 활성화된 실시간 영약이 없으면 매초 불필요한 순회를 건너뜀
        const hasPlayerElixir = (prevChar.statusEffects || []).some(isRealTimeElixir);
        const hasCompElixir = (prevChar.companions || []).some(c => (c.statusEffects || []).some(isRealTimeElixir));

        if (!hasPlayerElixir && !hasCompElixir) {
          return prevChar;
        }

        // 독립 서비스에서 초를 차감하고, 오직 만료된 영약이 있을 때만 새로운 캐릭터 객체를 반환
        const result = elixirRealtimeService.tick(prevChar);

        if (result.hasExpired) {
          if (result.expiredMessages.length > 0) {
            const msgs = [...result.expiredMessages];
            setTimeout(() => {
              msgs.forEach(msg => addToLogRef.current(msg));
            }, 0);
          }
          return result.updatedCharacter;
        }

        // 만료된 영약이 없으면 prevChar 참조를 그대로 반환하여 React 리렌더링을 100% 차단!
        return prevChar;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [setCharacter, view]);
}

/**
 * UI 컴포넌트(버프 뱃지 등) 전용 실시간 남은 시간(초) 구독 훅
 * - 전체 컴포넌트가 아닌, 이 훅을 사용하는 작은 뱃지만 1초마다 가볍게 갱신됩니다.
 */
export function useRealtimeElixirDuration(entityId: string, status?: ActiveStatus | null): number {
  const [, setTick] = useState(0);

  useEffect(() => {
    if (!status || !isRealTimeElixir(status)) return;
    elixirRealtimeService.registerElixir(entityId, status);
    const unsubscribe = elixirRealtimeService.subscribe(() => {
      setTick(prev => (prev + 1) % 10000);
    });
    return unsubscribe;
  }, [entityId, status?.name, status?.duration]);

  if (!status || !isRealTimeElixir(status)) {
    return Number(status?.duration || 0);
  }

  return elixirRealtimeService.getRemainingSeconds(entityId, status);
}
