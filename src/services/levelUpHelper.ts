import { Character, Companion } from '../types';
import { checkAndApplyLevelUp } from '../utils';

export interface LevelUpModalData {
  type: 'levelup';
  title: string;
  message: string;
  items: { label: string; after: string }[];
}

/**
 * 캐릭터와 동료들의 현재 경험치를 체크하여,
 * 필요 경험치 이상일 경우 즉시 레벨업 및 스탯/HP/MP 보정을 적용하고
 * 레벨업이 발생했을 때 알림 모달 데이터를 트리거합니다.
 */
export function processImmediateLevelUp(
  char: Character,
  onLevelUpNotice?: (modalData: LevelUpModalData) => void
): Character {
  if (!char) return char;

  const result = checkAndApplyLevelUp(char);
  const { updatedChar, leveledUp, oldLevel, leveledUpCompanions } = result;

  if (leveledUp || (leveledUpCompanions && leveledUpCompanions.length > 0)) {
    let message = "";
    if (leveledUp) {
      message += `${updatedChar.name}이(가) 레벨 ${oldLevel} ➔ ${updatedChar.level} 달성! (스탯 포인트 지급 및 능력치 상승)\n`;
    }
    if (leveledUpCompanions && leveledUpCompanions.length > 0) {
      message += `${leveledUpCompanions.map(c => `${c.companion.name}(Lv.${c.oldLevel} ➔ Lv.${c.companion.level})`).join(', ')} 동료가 레벨업했습니다!`;
    }

    const modalData: LevelUpModalData = {
      type: 'levelup',
      title: "레벨업 달성!",
      message: message.trim(),
      items: [
        ...(leveledUp ? [
          { label: '플레이어 레벨', after: `Lv.${oldLevel} ➔ Lv.${updatedChar.level}` },
          { label: '보유 스탯 포인트', after: `${updatedChar.statPoints} P` },
          { label: '현재 경험치', after: `${updatedChar.currentExp.toLocaleString()} / ${updatedChar.maxExp.toLocaleString()} EXP` }
        ] : []),
        ...(leveledUpCompanions || []).map(c => ({
          label: `동료/마물 ${c.companion.name}`,
          after: `Lv.${c.oldLevel} ➔ Lv.${c.companion.level} (보유 스탯: ${c.companion.statPoints || 0} P)`
        }))
      ]
    };

    if (onLevelUpNotice) {
      setTimeout(() => {
        onLevelUpNotice(modalData);
      }, 50);
    }
  }

  return updatedChar;
}
