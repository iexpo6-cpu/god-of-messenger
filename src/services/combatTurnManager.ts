/**
 * 전투 턴 비동기 제어 및 동시성 안전장치 관리자
 * 
 * 1. 턴 전환 및 액션 실행을 하나의 안전한 락(Lock) 메커니즘으로 제어하여
 *    플레이어의 버튼 연타나 비동기 setTimeout이 겹쳐 턴이 두 번 넘어가거나
 *    스킵되는 현상을 완벽하게 방지합니다.
 * 2. 턴 스텝 토큰(Step Token) 검증으로 이전 턴의 지연된 콜백을 무효화합니다.
 * 3. 장애 발생 시에도 멈춤(Freezing)이 없도록 워치독 타이머를 제공합니다.
 */

export class CombatTurnManager {
    private isLocked: boolean = false;
    private currentLockOwner: string | null = null;
    private watchdogTimerId: any = null;
    private currentStepToken: string = '';
    private stepCounter: number = 0;
    private lastAdvancedFromIndex: number = -1;
    private lastAdvanceTimestamp: number = 0;
    private isEndingRound: boolean = false;
    private roundEndTimerId: any = null;
    private lastRoundEndTimestamp: number = 0;
    private lastProcessedCombatTurn: number = -1;

    /**
     * 액션 실행 락을 획득합니다.
     * 이미 락이 걸려있으면 false를 반환하여 중복 실행을 차단합니다.
     * 비정상 오류로 락이 풀리지 않을 경우를 대비해 1800ms 워치독이 자동 해제합니다.
     */
    public acquireActionLock(owner: string, timeoutMs: number = 1800): boolean {
        if (this.isLocked) {
            return false;
        }

        this.isLocked = true;
        this.currentLockOwner = owner;

        if (this.watchdogTimerId) {
            clearTimeout(this.watchdogTimerId);
        }

        this.watchdogTimerId = setTimeout(() => {
            if (this.isLocked) {
                this.forceReleaseLock();
            }
        }, timeoutMs);

        return true;
    }

    /**
     * 액션 실행 락을 해제합니다.
     */
    public releaseActionLock(owner?: string): void {
        if (owner && this.currentLockOwner && this.currentLockOwner !== owner) {
            return;
        }

        if (this.watchdogTimerId) {
            clearTimeout(this.watchdogTimerId);
            this.watchdogTimerId = null;
        }

        this.isLocked = false;
        this.currentLockOwner = null;
    }

    /**
     * 안전한 강제 락 해제
     */
    public forceReleaseLock(): void {
        if (this.watchdogTimerId) {
            clearTimeout(this.watchdogTimerId);
            this.watchdogTimerId = null;
        }
        this.isLocked = false;
        this.currentLockOwner = null;
    }

    /**
     * 현재 턴 액션 진행 중인지 여부를 확인합니다.
     */
    public isActionLocked(): boolean {
        return this.isLocked;
    }

    /**
     * 현재 라운드 종료 처리가 진행 중인지 여부를 확인합니다.
     */
    public isEndingRoundNow(): boolean {
        return this.isEndingRound || (Date.now() - this.lastRoundEndTimestamp < 1200);
    }

    /**
     * 라운드 종료 처리를 시작할 수 있는지 검사하고, 가능하면 락을 겁니다.
     * 태블릿 환경 등에서 렉으로 인해 라운드 종료 신호가 짧은 시간(1200ms) 내에
     * 중복 호출되어 버프 지속시간이 2중으로 차감되는 현상을 완벽 차단합니다.
     */
    public tryBeginRoundEnd(currentTurn?: number): boolean {
        const now = Date.now();
        if (this.isEndingRound || (now - this.lastRoundEndTimestamp < 1200)) {
            return false;
        }

        if (typeof currentTurn === 'number' && currentTurn >= 0 && this.lastProcessedCombatTurn === currentTurn) {
            return false;
        }

        this.isEndingRound = true;
        this.lastRoundEndTimestamp = now;
        if (typeof currentTurn === 'number') {
            this.lastProcessedCombatTurn = currentTurn;
        }

        if (this.roundEndTimerId) {
            clearTimeout(this.roundEndTimerId);
        }

        this.roundEndTimerId = setTimeout(() => {
            this.isEndingRound = false;
            this.roundEndTimerId = null;
        }, 1500);

        return true;
    }

    /**
     * 현재 활성 유닛을 위한 고유 모노토닉 스텝 토큰을 발행합니다.
     */
    public generateStepToken(turn: number, unitId: string, unitIndex: number): string {
        this.stepCounter += 1;
        this.currentStepToken = `${turn}_${unitId}_${unitIndex}_${this.stepCounter}`;
        return this.currentStepToken;
    }

    /**
     * 지연된 비동기 타이머 콜백이 현재 유효한 턴 스텝에 해당하는지 검증합니다.
     */
    public validateStepToken(token: string): boolean {
        if (!token) return false;
        return this.currentStepToken === token;
    }

    /**
     * 현재 스텝 토큰을 무효화합니다 (턴 완료 또는 취소 시).
     */
    public invalidateStepToken(): void {
        this.currentStepToken = '';
    }

    /**
     * 안전한 순차 턴 전진 처리
     * 1. 동일한 턴 인덱스에서 400ms 이내에 중복 호출된 요청을 디바운스/중복 제거합니다 (태블릿 터치 및 렉 보호).
     * 2. 큐 범위를 초과할 경우 1회만 안전하게 라운드 종료를 트리거합니다.
     */
    public safeAdvanceTurn(params: {
        fromIndex?: number;
        fallbackActiveIndex: number;
        queueLength: number;
        onNextIndex: (nextIdx: number) => void;
        onRoundEnd: () => void;
        combatSpeed?: 'fast' | 'normal';
        currentTurn?: number;
    }): boolean {
        const { fromIndex, fallbackActiveIndex, queueLength, onNextIndex, onRoundEnd, combatSpeed, currentTurn } = params;
        const baseIdx = typeof fromIndex === 'number' ? fromIndex : fallbackActiveIndex;
        const now = Date.now();

        // 태블릿 렉 환경에서 동일 턴 인덱스에서의 중복 호출 차단 (400ms)
        if (this.lastAdvancedFromIndex === baseIdx && now - this.lastAdvanceTimestamp < 400) {
            return false;
        }

        this.lastAdvancedFromIndex = baseIdx;
        this.lastAdvanceTimestamp = now;

        const nextIdx = baseIdx + 1;

        if (nextIdx >= queueLength) {
            // 이미 라운드 종료가 진행 중이거나 최근 1200ms 내에 실행되었으면 차단
            if (!this.tryBeginRoundEnd(currentTurn)) {
                onNextIndex(queueLength);
                return false;
            }

            const roundEndDelay = combatSpeed === 'fast' ? 250 : 450;
            setTimeout(() => {
                onRoundEnd();
            }, roundEndDelay);

            onNextIndex(queueLength);
            return true;
        }

        onNextIndex(nextIdx);
        return true;
    }

    /**
     * 전투 종료 또는 재시작 시 상태를 완전 초기화합니다.
     */
    public reset(): void {
        if (this.watchdogTimerId) {
            clearTimeout(this.watchdogTimerId);
            this.watchdogTimerId = null;
        }
        if (this.roundEndTimerId) {
            clearTimeout(this.roundEndTimerId);
            this.roundEndTimerId = null;
        }
        this.isLocked = false;
        this.currentLockOwner = null;
        this.currentStepToken = '';
        this.stepCounter = 0;
        this.lastAdvancedFromIndex = -1;
        this.lastAdvanceTimestamp = 0;
        this.isEndingRound = false;
        this.lastRoundEndTimestamp = 0;
        this.lastProcessedCombatTurn = -1;
    }
}

export const combatTurnManager = new CombatTurnManager();
