
import { Character, SimpleStudent, Stats, ResultData } from './types';
import { addDays } from './utils';

/**
 * PVP 대련 시 상대방의 호감도를 상승시키고 날짜를 1일 경과시키는 로직
 */
export const handlePvpAffection = (character: Character, opponent: SimpleStudent): { newChar: Character, log: string } => {
    const newChar = { ...character };
    if (!newChar.schoolData) return { newChar, log: "" };

    // 날짜 1일 경과
    const nextDate = addDays(newChar.currentDate || '2000-03-02', 1);
    newChar.currentDate = nextDate;

    // 학급 동료 목록에서 대상을 찾아 호감도 +5
    newChar.schoolData.classmates = newChar.schoolData.classmates.map(s => {
        if (s.id === opponent.id) {
            return { ...s, affection: Math.min(100, s.affection + 5),   lastInteractionDate: character.currentDate };
        }
        return s;
    });

    return { 
        newChar, 
        log: `[학교 대련] ${opponent.name}와(과) 정정당당한 대련을 하며 하루를 보냈습니다. (호감도 +5, 날짜 변경: ${nextDate})` 
    };
};

/**
 * 월간 훈련(개인 또는 합동)을 수행하는 로직
 */
export const performMonthlyTraining = (
    character: Character, 
    statKey: keyof Stats, 
    partner?: SimpleStudent,
    currentYearMonth?: string
): { newChar: Character, result: ResultData } => {
    const newChar = JSON.parse(JSON.stringify(character)) as Character;
    if (!newChar.schoolData) return { newChar: character, result: { type: 'failure', title: '오류', message: '학교 데이터가 없습니다.', items: [] } };

    // 훈련 제한 업데이트
    newChar.schoolData.lastTrainingDate = currentYearMonth;

    // 보너스 확률 계산: (호감도 / 2)%
    const affection = partner ? partner.affection : 0;
    const bonusChance = affection / 2;
    const isBonusSuccess = (Math.random() * 100) < bonusChance;
    const statGain = isBonusSuccess ? 2 : 1;

    // 능력치 상승 적용
    newChar.stats[statKey] += statGain;
    if (statKey === 'maxHp') newChar.stats.hp += (statGain * 10);
    if (statKey === 'maxMp') newChar.stats.mp += (statGain * 10);

    let message = "";
    const items = [{ label: '성장 능력치', after: `${statKey.toUpperCase()} +${statGain}` }];

    if (partner) {
        // 합동 훈련: 상대방 호감도 +5
        newChar.schoolData.classmates = newChar.schoolData.classmates.map(s => {
            if (s.id === partner.id) {
                return { ...s, affection: Math.min(100, s.affection + 5),   lastInteractionDate: character.currentDate };
            }
            return s;
        });
        message = `${partner.name}와(과) 함께 땀 흘리며 훈련했습니다. 두 사람의 호흡이 잘 맞습니다.`;
        items.push({ label: '호감도 상승', after: `${partner.name} +5` });
    } else {
        message = "홀로 조용히 수련에 집중하며 한계를 돌파했습니다.";
    }

    if (isBonusSuccess) {
        message += `\n(행운: 깊은 깨달음을 얻어 능력치가 크게 상승했습니다!)`;
    }

    return {
        newChar,
        result: {
            type: isBonusSuccess ? 'levelup' : 'success',
            title: partner ? '합동 훈련 완료' : '개인 훈련 완료',
            message,
            items
        }
    };
};
