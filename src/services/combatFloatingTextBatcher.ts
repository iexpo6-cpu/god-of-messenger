/**
 * 전투 부동 피해 숫자 (데미지 팝업 텍스트) 묶음 배치 처리 서비스
 * - 매 타격마다 거대한 전투 컴포넌트 전체가 리렌더링되는 폭탄을 방지합니다.
 * - 80ms 간격의 마이크로 배치 루프로 여러 타격을 묶어서 상태를 1회만 갱신합니다.
 * - 타이머 누수 및 메모리 찌꺼기를 원천 차단합니다.
 */

export interface FloatingFeedbackItem {
    id: string;
    text: string;
    type: 'damage' | 'heal' | 'crit' | 'buff' | 'debuff' | 'miss';
    rawText?: string;
    expiresAt?: number;
}

export class CombatFloatingTextBatcher {
    private currentTexts: Record<string, FloatingFeedbackItem[]> = {};
    private pendingAdditions: { targetName: string; item: FloatingFeedbackItem; showAt: number }[] = [];
    private listener: ((texts: Record<string, FloatingFeedbackItem[]>) => void) | null = null;
    private timerId: number | null = null;
    private isRunning = false;

    /**
     * 리액트 컴포넌트 상태 갱신 함수 구독
     */
    public subscribe(listener: (texts: Record<string, FloatingFeedbackItem[]>) => void): () => void {
        this.listener = listener;
        return () => {
            this.listener = null;
            this.clear();
        };
    }

    /**
     * 새로운 부동 텍스트 예약 추가 (배치 큐 등록)
     */
    public add(
        targetName: string, 
        text: string, 
        type: 'damage' | 'heal' | 'crit' | 'buff' | 'debuff' | 'miss', 
        delay = 0, 
        rawText?: string
    ): void {
        const id = `flt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const cleanTarget = targetName.replace(/\[BOSS\]|\[WANTED\]|\[정예\]|\[침략군\]/g, '').trim();
        const now = Date.now();
        const showAt = now + Math.max(0, delay);
        const expiresAt = showAt + 1000;

        const item: FloatingFeedbackItem = {
            id,
            text,
            type,
            rawText,
            expiresAt
        };

        this.pendingAdditions.push({ targetName: cleanTarget, item, showAt });
        this.ensureLoop();
    }

    private ensureLoop(): void {
        if (this.isRunning) return;
        this.isRunning = true;
        this.tick();
    }

    private tick = (): void => {
        const now = Date.now();
        let changed = false;

        // 1. 대기 항목 중 표시 시간이 된 항목들 일괄 투입
        if (this.pendingAdditions.length > 0) {
            const readyItems: typeof this.pendingAdditions = [];
            const remaining: typeof this.pendingAdditions = [];

            for (const entry of this.pendingAdditions) {
                if (entry.showAt <= now) {
                    readyItems.push(entry);
                } else {
                    remaining.push(entry);
                }
            }

            this.pendingAdditions = remaining;

            if (readyItems.length > 0) {
                changed = true;
                const nextTexts = { ...this.currentTexts };
                for (const { targetName, item } of readyItems) {
                    const existing = nextTexts[targetName] || [];
                    // 다단 히트 시 대상당 최대 2~3개까지만 유지하여 DOM 부하 차단
                    const trimmed = existing.length >= 3 ? existing.slice(existing.length - 2) : existing;
                    nextTexts[targetName] = [...trimmed, item];
                }
                this.currentTexts = nextTexts;
            }
        }

        // 2. 표시 시간이 1초 지난 만료 항목들 일괄 제거
        let hasActiveTexts = false;
        const nextTexts = { ...this.currentTexts };
        for (const target of Object.keys(nextTexts)) {
            const active = (nextTexts[target] || []).filter(item => (item.expiresAt || 0) > now);
            if (active.length !== (nextTexts[target] || []).length) {
                changed = true;
                if (active.length === 0) {
                    delete nextTexts[target];
                } else {
                    nextTexts[target] = active;
                }
            } else if (active.length > 0) {
                hasActiveTexts = true;
            }
        }

        // 3. 실질적인 변경이 있을 때만 단 1회 상태 갱신 통지
        if (changed) {
            this.currentTexts = nextTexts;
            if (this.listener) {
                this.listener(this.currentTexts);
            }
        }

        // 4. 다음 마이크로 배치 주기 예약 (80ms 간격으로 여러 타격을 묶어서 갱신)
        if (this.pendingAdditions.length > 0 || hasActiveTexts) {
            this.timerId = window.setTimeout(this.tick, 80);
        } else {
            this.isRunning = false;
            this.timerId = null;
        }
    };

    /**
     * 전투 종료, 새 라운드 시작 또는 컴포넌트 해제 시 큐 전체 초기화
     */
    public clear(): void {
        if (this.timerId) {
            window.clearTimeout(this.timerId);
            this.timerId = null;
        }
        this.isRunning = false;
        this.pendingAdditions = [];
        this.currentTexts = {};
        if (this.listener) {
            this.listener({});
        }
    }
}

export const combatFloatingTextBatcher = new CombatFloatingTextBatcher();
