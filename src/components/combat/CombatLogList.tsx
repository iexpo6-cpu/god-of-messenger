import React, { memo, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { CombatLogEntry } from './CombatLogEntry';
import { useThrottledLogs } from '../../services/combatLagOptimizer';

interface CombatLogListProps {
    log?: string[];
    narrative?: string | null;
    maxVisible?: number;
}

/**
 * 전투 텍스트 로그 및 내러티브를 전담하는 초경량 독립 컴포넌트
 * - 50ms 마이크로 배치 스로틀링을 적용하여 초당 수십 건의 연타 공격 시에도 프레임 드랍 방지
 * - 최근 18~20개의 로그만 유지하여 브라우저 DOM 렌더링 부하를 획기적으로 경감
 * - 절대 고유 키(Sequence Key)를 부여하여 새 로그가 1개 추가되어도 기존 로그의 중복 리렌더링을 100% 방지 (React.memo 캐시 극대화)
 */
export const CombatLogList = memo(({ 
    log = [], 
    narrative,
    maxVisible = 18
}: CombatLogListProps) => {
    // 50ms 마이크로 배치 스로틀링을 통해 연속 타격 발생 시 리렌더링 폭주 차단
    const effectiveLogs = useThrottledLogs(log, 50);
    const logContainerRef = useRef<HTMLDivElement>(null);
    const prevLogCountRef = useRef(0);

    const totalCount = effectiveLogs.length;
    const isTrimmed = totalCount > maxVisible;
    const visibleLogs = isTrimmed ? effectiveLogs.slice(totalCount - maxVisible) : effectiveLogs;
    const startIndex = isTrimmed ? totalCount - maxVisible : 0;

    // 새 로그가 들어왔을 때만 스크롤을 맨 아래로 부드럽게 유지
    useEffect(() => {
        if (totalCount !== prevLogCountRef.current) {
            prevLogCountRef.current = totalCount;
            if (logContainerRef.current) {
                logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
            }
        }
    }, [totalCount]);

    return (
        <div 
            ref={logContainerRef}
            className="flex-1 bg-black/85 rounded-md md:rounded-lg border border-slate-700/50 p-1.5 md:p-2 overflow-y-auto custom-scrollbar shadow-inner"
        >
            {totalCount > 0 ? (
                <div className="space-y-0.5 text-[9px] md:text-xs">
                    {isTrimmed && (
                        <div className="text-[8px] text-slate-500 text-center py-0.5 italic">
                            ... 이전 로그 {startIndex}개 생략됨 (최적화) ...
                        </div>
                    )}
                    {visibleLogs.map((entry, idx) => {
                        // 절대 순번 기반 고유 키 생성: 기존 엔트리가 재마운트되거나 다시 그려지는 것을 원천 방지
                        const absoluteIndex = startIndex + idx;
                        return (
                            <CombatLogEntry 
                                key={`log_${absoluteIndex}_${entry.slice(0, 15)}`} 
                                text={entry} 
                            />
                        );
                    })}
                </div>
            ) : (
                <div className="flex items-center justify-center h-full text-slate-500 text-[9px] md:text-[10px] italic">
                    전투 로그가 없습니다.
                </div>
            )}

            {narrative && (
                <div className="mt-1 md:mt-2 pt-1 md:pt-2 border-t border-white/10 text-[8.5px] md:text-[11px] text-slate-400 leading-relaxed">
                    <ReactMarkdown 
                        components={{
                            strong: ({node, ...props}) => <span className="text-amber-400 font-bold" {...props} />,
                        }}
                    >
                        {narrative}
                    </ReactMarkdown>
                </div>
            )}
        </div>
    );
}, (prev, next) => {
    // 로그의 마지막 줄과 전체 길이, 내러티브가 동일하면 리렌더링 완벽 차단
    if (prev.log?.length !== next.log?.length) return false;
    if (prev.narrative !== next.narrative) return false;
    if (prev.maxVisible !== next.maxVisible) return false;
    if (!prev.log || prev.log.length === 0) return true;
    return prev.log[prev.log.length - 1] === next.log![next.log!.length - 1];
});
