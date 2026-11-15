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
    private targetListeners: Map<string, Set<(items: FloatingFeedbackItem[]) => void>> = new Map();
    private timerId: number | null = null;
    private isRunning = false;

    private normalizeTarget(targetName: string): string {
        return targetName.replace(/\[BOSS\]|\[WANTED\]|\[정예\]|\[침략군\]/g, '').trim();
    }

    /**
     * 리액트 컴포넌트 상태 갱신 함수 구독 (글로벌 - 레거시 호환용)
     */
    public subscribe(listener: (texts: Record<string, FloatingFeedbackItem[]>) => void): () => void {
        this.listener = listener;
        return () => {
            this.listener = null;
            this.clear();
        };
    }

    /**
     * 특정 타겟 카드 전용 로컬 구독 (전투 화면 전체 리렌더 원천 차단)
     */
    public subscribeTarget(targetName: string, listener: (items: FloatingFeedbackItem[]) => void): () => void {
        const key = this.normalizeTarget(targetName);
        let set = this.targetListeners.get(key);
        if (!set) {
            set = new Set();
            this.targetListeners.set(key, set);
        }
        set.add(listener);
        const initial = this.currentTexts[key];
        if (initial && initial.length > 0) {
            listener(initial);
        }
        return () => {
            const existingSet = this.targetListeners.get(key);
            if (existingSet) {
                existingSet.delete(listener);
                if (existingSet.size === 0) {
                    this.targetListeners.delete(key);
                }
            }
        };
    }

    private notifyTarget(targetKey: string, items: FloatingFeedbackItem[]): void {
        const set = this.targetListeners.get(targetKey);
        if (set) {
            set.forEach(fn => fn(items));
        }
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
        const cleanTarget = this.normalizeTarget(targetName);
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
        const changedTargets = new Set<string>();

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
                    changedTargets.add(targetName);
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
                changedTargets.add(target);
                if (active.length === 0) {
                    delete nextTexts[target];
                } else {
                    nextTexts[target] = active;
                    hasActiveTexts = true;
                }
            } else if (active.length > 0) {
                hasActiveTexts = true;
            }
        }

        // 3. 실질적인 변경이 있을 때만 해당 타겟 리스너 및 글로벌 리스너에 통지
        if (changed) {
            this.currentTexts = nextTexts;
            changedTargets.forEach(target => {
                this.notifyTarget(target, this.currentTexts[target] || []);
            });
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
        this.targetListeners.forEach(set => {
            set.forEach(fn => fn([]));
        });
        if (this.listener) {
            this.listener({});
        }
    }
}

export const combatFloatingTextBatcher = new CombatFloatingTextBatcher();
