import { useRef, useCallback } from 'react';

/**
 * 연속 클릭/연타 시 액션이 중복 실행되어 UI가 멈추는 현상을 방지하는 쿨다운 훅입니다.
 * @param cooldownMs 쿨다운 시간(밀리초), 기본값 250ms
 */
export function useActionCooldown(cooldownMs: number = 250) {
    const isProcessingRef = useRef(false);

    const executeWithCooldown = useCallback(<T extends (...args: any[]) => any>(fn: T) => {
        return (...args: Parameters<T>): ReturnType<T> | undefined => {
            if (isProcessingRef.current) {
                return undefined;
            }
            isProcessingRef.current = true;
            try {
                const result = fn(...args);
                if (result instanceof Promise) {
                    result.finally(() => {
                        setTimeout(() => {
                            isProcessingRef.current = false;
                        }, cooldownMs);
                    });
                } else {
                    setTimeout(() => {
                        isProcessingRef.current = false;
                    }, cooldownMs);
                }
                return result;
            } catch (err) {
                isProcessingRef.current = false;
                throw err;
            }
        };
    }, [cooldownMs]);

    return { executeWithCooldown, isProcessingRef };
}
