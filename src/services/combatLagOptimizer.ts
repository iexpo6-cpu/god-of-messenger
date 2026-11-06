/**
 * 전투 렉 완화 최적화 서비스
 * - 연속 타격 및 버프/디버프 다량 발생 시 가상 DOM 리렌더링 및 애니메이션 과부하 차단
 * - 로그 스트림 마이크로 배치 및 플로팅 텍스트 수 상한 제어
 */

import { useState, useEffect, useRef } from 'react';
import { FloatingFeedbackItem } from './combatFloatingTextBatcher';

/**
 * 플로팅 텍스트 동시 렌더링 상한 필터링
 * 과도한 DOM 노드 및 CSS/Framer-Motion 애니메이션 중첩을 방지하기 위해 최근 항목 위주로 제한
 */
export const throttleFloatingItems = (
    items: FloatingFeedbackItem[] = [],
    maxCount: number = 5
): FloatingFeedbackItem[] => {
    if (!items || items.length === 0) return [];
    if (items.length <= maxCount) return items;
    // 가장 최근에 생성된 핵심 피드백(치명타/회피/주요 데미지) 위주로 유지
    return items.slice(items.length - maxCount);
};

/**
 * 대량의 전투 로그 스트림을 50ms 마이크로 배치 주기로 일괄 반영하는 React 훅
 * 초당 수십 회의 리렌더링을 묶어서 프레임 드랍 완화
 */
export const useThrottledLogs = (
    incomingLogs: string[] = [],
    intervalMs: number = 50
): string[] => {
    const [renderedLogs, setRenderedLogs] = useState<string[]>(incomingLogs);
    const latestLogsRef = useRef<string[]>(incomingLogs);
    const timerRef = useRef<number | null>(null);

    latestLogsRef.current = incomingLogs;

    useEffect(() => {
        // 즉시 동기화가 필요하지 않은 미세 차이는 타이머로 스로틀
        if (timerRef.current === null) {
            timerRef.current = window.setTimeout(() => {
                setRenderedLogs(latestLogsRef.current);
                timerRef.current = null;
            }, intervalMs);
        }

        return () => {
            if (timerRef.current !== null) {
                window.clearTimeout(timerRef.current);
                timerRef.current = null;
            }
        };
    }, [incomingLogs, intervalMs]);

    return renderedLogs;
};
