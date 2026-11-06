import { Character, Companion, Base, JobType } from '../types';
import { getYear } from '../utils';
import { getAbsoluteMinutes, getActiveTrainingMinutes } from './trainingService';

export interface ChildAcademyTrainee {
    companionId: string;
    targetStat: 'str' | 'int' | 'agi' | 'wis' | 'def' | 'ctrl' | 'maxHp' | 'maxMp';
    startDate: string;
    startTime?: string;
    lastTrainedAbsMinutes?: number;
    accumulatedMinutes?: number;
    accumulatedDays?: number;
    totalHoursTrained?: number;
    accumulatedGain?: number;
    lastGain?: number;
    lastGainDetail?: string;
    lastTrainedDate?: string;
}

export interface ChildAcademyReportItem {
    companionId: string;
    companionName: string;
    targetStat: string;
    targetStatLabel: string;
    gain: number;
    gainDetail: string;
    statValue: number;
    teacherName: string;
    date: string;
}

export interface ChildAcademyLiveProgress {
    effectiveAccumulatedMinutes: number;
    currentHours: number;
    currentMinutesRem: number;
    progressPercent: number;
    remainingMinutesTotal: number;
    remainingHours: number;
    remainingMinutesRem: number;
    startDate: string;
    startTime: string;
    hasTeacher: boolean;
}

export const ACADEMY_STAT_LABELS: Record<ChildAcademyTrainee['targetStat'], string> = {
    str: 'STR',
    int: 'INT',
    agi: 'AGI',
    wis: 'WIS',
    def: 'DEF',
    ctrl: 'CTRL',
    maxHp: 'HP',
    maxMp: 'MP'
};

/**
 * 동료가 유년 서당 수강 자격을 갖추었는지 엄격 검사
 * 1) 20세 미만 (20세 이상 절대 제외)
 * 2) 대기 동료만 수강 대상 (파티에 속한 활성 동료 제외)
 * 3) 파견 중이 아닌 동료 (파견 제외)
 * 4) 전투 훈련소에서 훈련 중이지 않은 동료 (전투 훈련 제외)
 */
export const isEligibleChildStudent = (comp: Companion, character: Character): boolean => {
    if (!comp || (comp as any).isDead || (comp as any).isMonster || (comp as any).monsterData) {
        return false;
    }

    // 1. 대기 동료만 수강 대상 (파티 편성 중인 동료는 제외하고 대기 동료만)
    const isInactive = character.inactiveCompanions?.some(c => c.id === comp.id);
    if (!isInactive) {
        return false;
    }

    // 2. 파견 중인 동료 제외
    const isDispatched = Boolean(
        character.base?.dispatched?.some(m => m.companionId === comp.id) ||
        (character.base as any)?.warDispatched?.some((m: any) => m.companionId === comp.id)
    );
    if (isDispatched) return false;

    // 3. 전투 훈련소에서 훈련 중인 동료 제외
    if (character.base?.combatTraining) {
        const isCombatTraining = Object.values(character.base.combatTraining).some(ct =>
            ct?.trainees?.some(t => t.companionId === comp.id)
        );
        if (isCombatTraining) return false;
    }

    // 4. 나이 판정 (반드시 20세 미만)
    let age: number | null = null;
    const curYear = getYear(character.currentDate || '2000-03-02');

    if (typeof comp.birthYear === 'number') {
        age = curYear - comp.birthYear;
    } else if (typeof comp.age === 'number') {
        age = comp.age;
    } else if (typeof comp.age === 'string') {
        const parsed = parseInt(comp.age.replace(/[^0-9]/g, ''), 10);
        if (!isNaN(parsed)) age = parsed;
    }

    // 나이가 확인된 경우 0세 이상 20세 미만만 허용
    if (age !== null) {
        return age >= 0 && age < 20;
    }

    // 나이 정보가 없을 때: childData 보유자이거나 미성년 클래스명인 경우만 허용
    const isChildData = Boolean(comp.childData);
    const isChildClass = typeof comp.classType === 'string' && (
        comp.classType.includes('자녀') || 
        comp.classType.includes('아이') || 
        comp.classType.includes('어린이') || 
        comp.classType.includes('유년')
    );

    return isChildData || isChildClass;
};

/**
 * 시설 레벨과 시설 개수에 따른 유년 서당 수강 가능 총 정원(학생 수) 계산
 * - 시설 1개당 기본 2명 + 시설 레벨당 2명씩 추가 증가
 */
export const calculateChildAcademyCapacity = (base: Base | undefined): number => {
    if (!base || !base.layout) return 0;
    const instances = base.layout.filter(inst => 
        inst.type === 'child_academy' && 
        !inst.underConstruction && 
        (inst.level || 0) > 0
    );
    if (instances.length === 0) return 0;

    return instances.reduce((sum, inst) => {
        const lv = inst.level || 1;
        return sum + (2 + (lv * 2));
    }, 0);
};

/**
 * 훈련 시작 시간 및 현재 게임 시간을 비교하여 실시간 훈련 진행도를 계산합니다.
 * 스승이 미배치된 경우 훈련 시간이 누적되지 않습니다.
 */
export const getChildAcademyTraineeLiveProgress = (
    trainee: ChildAcademyTrainee,
    currentDate?: string,
    currentTime?: string,
    hasTeacher: boolean = true
): ChildAcademyLiveProgress => {
    const curDate = currentDate || '2000-03-02';
    const curTime = currentTime || '08:00';
    const curAbsMin = getAbsoluteMinutes(curDate, curTime);

    let baseMin = trainee.lastTrainedAbsMinutes;
    if (baseMin === undefined || baseMin <= 0) {
        if (trainee.startDate) {
            baseMin = getAbsoluteMinutes(trainee.startDate, trainee.startTime || '08:00');
        } else {
            baseMin = curAbsMin;
        }
    }

    if (baseMin > curAbsMin) {
        baseMin = curAbsMin;
    }

    // 스승이 미배치된 경우에는 추가 훈련 시간이 누적되지 않음
    const liveActiveMin = hasTeacher ? getActiveTrainingMinutes(baseMin, curAbsMin) : 0;
    const totalAccumulated = (trainee.accumulatedMinutes || 0) + liveActiveMin;
    const effectiveAccumulated = totalAccumulated % 480;

    const currentHours = Math.floor(effectiveAccumulated / 60);
    const currentMinutesRem = effectiveAccumulated % 60;
    const progressPercent = Math.min(100, Math.floor((effectiveAccumulated / 480) * 100));

    const remainingMinutesTotal = Math.max(0, 480 - effectiveAccumulated);
    const remainingHours = Math.floor(remainingMinutesTotal / 60);
    const remainingMinutesRem = remainingMinutesTotal % 60;

    return {
        effectiveAccumulatedMinutes: effectiveAccumulated,
        currentHours,
        currentMinutesRem,
        progressPercent,
        remainingMinutesTotal,
        remainingHours,
        remainingMinutesRem,
        startDate: trainee.startDate || curDate,
        startTime: trainee.startTime || '08:00',
        hasTeacher
    };
};

/**
 * 유년 서당에 등록된 학생들의 주간 시간 누적 및 8시간 훈련 정산 (전투훈련소 로직과 동일하게 훈련시작시간/절대시각 비교 방식)
 * - 훈련 시작 시간과 현재 시각을 비교하여 주간 시간(06:00 ~ 22:00)만 누적(취침 시간 22:00 ~ 06:00 제외)합니다.
 * - 누적 8시간(480분) 도달 시에만 능력치가 증가하고 서신함에 상세 훈련 보고서가 발송됩니다.
 * - [중요] 스승 미배치 시에는 훈련 시간이 일체 누적되지 않으며 정지 상태로 유지됩니다.
 * - 스승 배치 시 스승의 전투력과 서당 시설 등급에 따라 최대 5.0배 훈육 보너스가 적용됩니다.
 */
export const advanceChildAcademyTime = (
    character: Character,
    minutesToAdd: number,
    totalCurrentMinutes: number
): { updatedCharacter: Character; logs: string[] } => {
    const logs: string[] = [];
    if (!character.base || !character.base.layout) return { updatedCharacter: character, logs };

    const academyInstances = character.base.layout.filter(inst => 
        inst.type === 'child_academy' && 
        !inst.underConstruction && 
        (inst.level || 0) > 0
    );
    if (academyInstances.length === 0) return { updatedCharacter: character, logs };

    const rawTrainees: ChildAcademyTrainee[] = (character.base as any).childAcademyTrainees || [];
    if (rawTrainees.length === 0) return { updatedCharacter: character, logs };

    let charCopy = JSON.parse(JSON.stringify(character)) as Character;

    const curDate = charCopy.currentDate || '2000-03-02';
    const curTime = charCopy.currentTime || '08:00';
    const currentAbsMinutes = getAbsoluteMinutes(curDate, curTime);

    // 배치된 스승 동료 목록 조회
    const allComps = [...(charCopy.companions || []), ...(charCopy.inactiveCompanions || [])];
    const assignedTeacherIds: string[] = [];
    academyInstances.forEach(inst => {
        const ids = [
            ...(charCopy.base?.multiAssignments?.[inst.id] || []),
            ...(charCopy.base?.assignments?.[inst.id] ? [charCopy.base.assignments[inst.id]] : [])
        ].filter(Boolean) as string[];
        ids.forEach(id => {
            if (!assignedTeacherIds.includes(id)) assignedTeacherIds.push(id);
        });
    });

    const teachers = assignedTeacherIds.map(id => {
        if (id === 'player') return charCopy;
        return allComps.find(c => c.id === id);
    }).filter(Boolean) as (Character | Companion)[];

    // 스승 미배치 시에는 훈련 시간을 누적하지 않고 정지 (스승 배치 대기)
    if (teachers.length === 0) {
        rawTrainees.forEach(traineeInfo => {
            traineeInfo.lastTrainedAbsMinutes = currentAbsMinutes;
        });
        (charCopy.base as any).childAcademyTrainees = rawTrainees;
        return { updatedCharacter: charCopy, logs };
    }

    // 최고 역량 스승 산출
    const bestTeacher = teachers.reduce((best, cur) => {
        const statsA = (best as any).stats || { str: 10, int: 10, def: 10, agi: 10, wis: 10, ctrl: 10 };
        const statsB = (cur as any).stats || { str: 10, int: 10, def: 10, agi: 10, wis: 10, ctrl: 10 };
        const cpA = (statsA.str || 0) + (statsA.int || 0) + (statsA.def || 0) + (statsA.agi || 0) + (statsA.wis || 0) + (statsA.ctrl || 0);
        const cpB = (statsB.str || 0) + (statsB.int || 0) + (statsB.def || 0) + (statsB.agi || 0) + (statsB.wis || 0) + (statsB.ctrl || 0);
        return cpB > cpA ? cur : best;
    }, teachers[0]);

    const teacherStats = (bestTeacher as any).stats || { str: 10, int: 10, def: 10, agi: 10, wis: 10, ctrl: 10 };
    const statSum = (teacherStats.str || 0) + (teacherStats.int || 0) + (teacherStats.def || 0) + (teacherStats.agi || 0) + (teacherStats.wis || 0) + (teacherStats.ctrl || 0);
    const cp = (bestTeacher as any).combatPower || Math.floor(statSum * 2.5);
    // 스승 배치 시 스승 역량과 시설 등급에 따라 최대 5.0배 훈육 보너스 적용
    const bonusMultiplier = Math.min(5.0, 1.0 + Math.floor(cp / 1000) * 0.35 + (academyInstances[0].level || 1) * 0.35);

    const validTrainees: ChildAcademyTrainee[] = [];
    const reportSummaries: { name: string; course: string; gains: string }[] = [];

    rawTrainees.forEach(traineeInfo => {
        const comp = (charCopy.inactiveCompanions || []).find(c => c.id === traineeInfo.companionId);
        if (!comp) return;

        // 20세 도달 여부, 대기 상태, 파견 여부, 전투 훈련 여부 엄격 재검사
        if (!isEligibleChildStudent(comp, charCopy)) {
            logs.push(`[유년 서당] '${comp.name}'이(가) 자격 변동(성인 도달, 파티 편성, 파견 또는 전투 훈련소 입소)으로 서당 수강을 종료했습니다.`);
            return;
        }

        validTrainees.push(traineeInfo);

        // 훈련 시작 기준 시점 계산 (전투훈련소 로직과 동일하게 훈련 시작 시간과 비교)
        let lastTrainedMin = traineeInfo.lastTrainedAbsMinutes;
        if (lastTrainedMin === undefined || lastTrainedMin <= 0) {
            if (traineeInfo.startDate) {
                lastTrainedMin = getAbsoluteMinutes(traineeInfo.startDate, traineeInfo.startTime || '08:00');
            } else {
                lastTrainedMin = currentAbsMinutes;
            }
        }

        if (lastTrainedMin > currentAbsMinutes) {
            lastTrainedMin = currentAbsMinutes;
        }

        // 주간 시간(06:00 ~ 22:00)만 누적 (취침 시간 22:00 ~ 06:00 제외)
        const trainingMinutesAccumulated = getActiveTrainingMinutes(lastTrainedMin, currentAbsMinutes);
        if (trainingMinutesAccumulated <= 0) {
            traineeInfo.lastTrainedAbsMinutes = currentAbsMinutes;
            return;
        }

        traineeInfo.lastTrainedAbsMinutes = currentAbsMinutes;

        const prevMinutes = traineeInfo.accumulatedMinutes || 0;
        traineeInfo.accumulatedMinutes = prevMinutes + trainingMinutesAccumulated;

        // 8시간 (= 480분) 도달 시 정산
        if (traineeInfo.accumulatedMinutes >= 480) {
            const settlementCount = Math.floor(traineeInfo.accumulatedMinutes / 480);
            traineeInfo.accumulatedMinutes = traineeInfo.accumulatedMinutes % 480;

            const statKey = traineeInfo.targetStat || 'str';
            const statLabel = ACADEMY_STAT_LABELS[statKey] || statKey.toUpperCase();

            for (let s = 0; s < settlementCount; s++) {
                comp.stats = comp.stats || { hp: 100, maxHp: 100, mp: 50, maxMp: 50, str: 10, int: 10, wis: 10, def: 10, agi: 10, ctrl: 10 };
                const gain = Math.max(1, Math.floor(2 * bonusMultiplier));
                const hpGain = Math.max(5, Math.floor(15 * bonusMultiplier));

                let gainDetail = '';
                let currentStatVal = 0;

                switch (statKey) {
                    case 'str':
                        comp.stats.str = (comp.stats.str || 10) + gain;
                        comp.stats.maxHp = (comp.stats.maxHp || 100) + hpGain;
                        comp.stats.hp = comp.stats.maxHp;
                        gainDetail = `STR +${gain}, HP +${hpGain}`;
                        currentStatVal = comp.stats.str;
                        break;
                    case 'int':
                        comp.stats.int = (comp.stats.int || 10) + gain;
                        comp.stats.maxMp = (comp.stats.maxMp || 50) + hpGain;
                        comp.stats.mp = comp.stats.maxMp;
                        gainDetail = `INT +${gain}, MP +${hpGain}`;
                        currentStatVal = comp.stats.int;
                        break;
                    case 'def':
                        comp.stats.def = (comp.stats.def || 10) + gain;
                        comp.stats.maxHp = (comp.stats.maxHp || 100) + Math.floor(hpGain * 0.7);
                        comp.stats.hp = comp.stats.maxHp;
                        gainDetail = `DEF +${gain}, HP +${Math.floor(hpGain * 0.7)}`;
                        currentStatVal = comp.stats.def;
                        break;
                    case 'agi':
                        comp.stats.agi = (comp.stats.agi || 10) + gain;
                        gainDetail = `AGI +${gain}`;
                        currentStatVal = comp.stats.agi;
                        break;
                    case 'wis':
                        comp.stats.wis = (comp.stats.wis || 10) + gain;
                        comp.stats.maxMp = (comp.stats.maxMp || 50) + Math.floor(hpGain * 0.7);
                        comp.stats.mp = comp.stats.maxMp;
                        gainDetail = `WIS +${gain}, MP +${Math.floor(hpGain * 0.7)}`;
                        currentStatVal = comp.stats.wis;
                        break;
                    case 'ctrl':
                        comp.stats.ctrl = (comp.stats.ctrl || 10) + gain;
                        if (comp.childData) {
                            comp.childData.academicScore = (comp.childData.academicScore || 0) + 5;
                        }
                        gainDetail = `CTRL +${gain}, 학업 성취도 +5`;
                        currentStatVal = comp.stats.ctrl;
                        break;
                    case 'maxHp':
                        comp.stats.maxHp = (comp.stats.maxHp || 100) + hpGain * 2;
                        comp.stats.hp = comp.stats.maxHp;
                        gainDetail = `HP +${hpGain * 2}`;
                        currentStatVal = comp.stats.maxHp;
                        break;
                    case 'maxMp':
                        comp.stats.maxMp = (comp.stats.maxMp || 50) + hpGain * 2;
                        comp.stats.mp = comp.stats.maxMp;
                        gainDetail = `MP +${hpGain * 2}`;
                        currentStatVal = comp.stats.maxMp;
                        break;
                }

                const expGain = Math.floor(40 * bonusMultiplier);
                comp.currentExp = (comp.currentExp || 0) + expGain;
                comp.affection = Math.min(100, (comp.affection || 0) + 2);

                traineeInfo.totalHoursTrained = (traineeInfo.totalHoursTrained || 0) + 8;
                traineeInfo.accumulatedDays = Math.floor((traineeInfo.totalHoursTrained || 0) / 8);
                traineeInfo.accumulatedGain = (traineeInfo.accumulatedGain || 0) + gain;
                traineeInfo.lastGain = gain;
                traineeInfo.lastGainDetail = gainDetail;
                traineeInfo.lastTrainedDate = curDate;

                reportSummaries.push({
                    name: comp.name,
                    course: statLabel,
                    gains: `${gainDetail}, 경험치 +${expGain}`
                });

                // 전투훈련소와 동일하게 8시간 정산 시 서신함에 편지 발송
                if (!charCopy.messages) charCopy.messages = [];
                const mailId = `child_academy_report_${comp.id}_${curDate}_${traineeInfo.totalHoursTrained}_${s}`;
                const isDuplicate = charCopy.messages.slice(-20).some(m => m.id === mailId);

                if (!isDuplicate) {
                    const mailText = `[서당 수련] 학동 '${comp.name}'의 8시간 훈육 수련 완료!\n\n` +
                        `유년 서당에서 8시간 동안 스승 [${bestTeacher.name}]의 지도 아래 성실하게 훈육에 매진한 학동 '${comp.name}'이(가) 한 단계 더 성장했습니다. (취침 시간 22:00~06:00 제외)\n\n` +
                        `• 담당 훈장: ${bestTeacher.name} (지도 효율 ${bonusMultiplier.toFixed(2)}배)\n` +
                        `• 대상 훈련: ${statLabel} 훈육\n` +
                        `• 훈련 성과: ${gainDetail} 상승 (현재 ${statLabel}: ${currentStatVal})\n` +
                        `• 경험치 획득: 경험치 +${expGain}\n` +
                        `• 누적 훈육 시간: ${traineeInfo.totalHoursTrained}시간\n\n` +
                        `땀방울은 거짓말을 하지 않습니다. 성인식이 되는 날 가문의 든든한 주역이 될 것입니다!`;

                    charCopy.messages.push({
                        id: mailId,
                        role: 'ai',
                        text: mailText,
                        timestamp: Date.now()
                    });
                }

                // 최근 훈련 보고서 기록 (전투훈련소 방식)
                if (!(charCopy.base as any).childAcademyReports) {
                    (charCopy.base as any).childAcademyReports = [];
                }
                (charCopy.base as any).childAcademyReports.unshift({
                    companionId: comp.id,
                    companionName: comp.name,
                    targetStat: statKey,
                    targetStatLabel: statLabel,
                    gain,
                    gainDetail,
                    statValue: currentStatVal,
                    teacherName: bestTeacher.name,
                    date: curDate
                });
                (charCopy.base as any).childAcademyReports = (charCopy.base as any).childAcademyReports.slice(0, 30);
            }
        }
    });

    (charCopy.base as any).childAcademyTrainees = validTrainees;

    if (reportSummaries.length > 0) {
        logs.push(`[유년 서당] 학당의 아이들 ${reportSummaries.length}명이 8시간 훈육 수련을 마치고 성장했습니다. (서신함에 훈련 보고서 발송)`);
    }

    return { updatedCharacter: charCopy, logs };
};

/**
 * 하위 호환용 래퍼 함수
 */
export const advanceChildAcademyTraining = (
    character: Character,
    isNewDay: boolean = true
): { updatedCharacter: Character; logs: string[] } => {
    const timeStr = character.currentTime || '08:00';
    const parts = timeStr.split(':').map(Number);
    const totalMinutes = (parts[0] || 8) * 60 + (parts[1] || 0);
    return advanceChildAcademyTime(character, isNewDay ? 1440 : 60, totalMinutes);
};
