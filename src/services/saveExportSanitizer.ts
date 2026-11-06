/**
 * 세이브 데이터 내보내기(코드/파일) 시 용량 최적화 및 미디어/프레임 정제 서비스
 * - 사용자가 스킬 미디어 또는 이펙트 프레임 제외를 선택했을 때 대용량 Base64 데이터를 완벽히 제거
 * - 플레이어 전환(PlayerCompanionSwitchService) 및 모든 활성/비활성 동료의 스킬까지 일괄 적용
 */

export interface SaveExportSanitizeOptions {
  preserveMedia?: boolean;          // 스킬 영상, 썸네일, 일러스트 및 Base64 비주얼 보존 여부
  preserveFrameAnimation?: boolean; // 스킬 커스텀 이펙트 프레임(스프라이트 이미지) 보존 여부
}

/**
 * 인라인 Data URL (Base64) 여부를 확인하여 정제
 */
function sanitizeMediaField(url: unknown, preserveMedia: boolean): string | undefined {
  if (typeof url !== 'string' || !url) return undefined;
  if (!preserveMedia) {
    // 미디어 제외 시: Base64 인라인 데이터는 용량을 대량 차지하므로 완전 제거
    if (url.startsWith('data:') || url.length > 500) {
      return '';
    }
  }
  return url;
}

/**
 * 단일 스킬 객체의 미디어 및 이펙트 프레임 정제
 */
function sanitizeSkill(
  skill: any,
  preserveMedia: boolean,
  preserveFrameAnimation: boolean
): void {
  if (!skill || typeof skill !== 'object') return;

  // 1. 일반 미디어 (영상, 일러스트, 이미지)
  if (!preserveMedia) {
    if (skill.videoUrl) skill.videoUrl = sanitizeMediaField(skill.videoUrl, false);
    if (skill.illustrationUrl) skill.illustrationUrl = sanitizeMediaField(skill.illustrationUrl, false);
    if (skill.imageUrl) skill.imageUrl = sanitizeMediaField(skill.imageUrl, false);
    if (skill.summonData && skill.summonData.summonImageUrl) {
      skill.summonData.summonImageUrl = sanitizeMediaField(skill.summonData.summonImageUrl, false);
    }
  }

  // 2. 이펙트 프레임 애니메이션 정제 (용량 폭등의 주 원인)
  // 프레임 애니메이션 미포함이거나 스킬 미디어 제외 시 프레임 데이터 완전 제거
  if (!preserveFrameAnimation || !preserveMedia) {
    if (skill.frameAnimation) {
      delete skill.frameAnimation;
    }
  }

  // 3. 패시브 스킬 MP 소모 0 보장
  if (skill.type === '패시브' || skill.type === 'PASSIVE') {
    skill.mpCost = 0;
  }
}

/**
 * 캐릭터 또는 동료 엔티티 내의 스킬 및 미디어 정제
 */
function sanitizeEntity(
  entity: any,
  preserveMedia: boolean,
  preserveFrameAnimation: boolean
): void {
  if (!entity || typeof entity !== 'object') return;

  if (entity.saveCode) delete entity.saveCode;

  // 비주얼 및 음원
  if (!preserveMedia) {
    if (entity.visualUrl) entity.visualUrl = sanitizeMediaField(entity.visualUrl, false);
    if (entity.bgmUrl) entity.bgmUrl = sanitizeMediaField(entity.bgmUrl, false);
  }

  // 보유 스킬
  if (Array.isArray(entity.skills)) {
    entity.skills.forEach((s: any) => sanitizeSkill(s, preserveMedia, preserveFrameAnimation));
  }

  // 인연/합체 스킬
  if (Array.isArray(entity.bondSkills)) {
    entity.bondSkills.forEach((s: any) => sanitizeSkill(s, preserveMedia, preserveFrameAnimation));
  }
}

/**
 * 세이브 데이터 내보내기용 종합 정제 함수
 */
export function sanitizeSaveDataForExport(
  rawData: any,
  options: SaveExportSanitizeOptions = {}
): any {
  if (!rawData) return null;

  let data: any;
  try {
    data = JSON.parse(JSON.stringify(rawData));
  } catch (e) {
    return rawData;
  }

  const preserveMedia = options.preserveMedia !== false;
  // 스킬 미디어가 꺼져있으면 프레임 애니메이션도 자동으로 제외
  const preserveFrameAnimation = preserveMedia && (options.preserveFrameAnimation === true);

  // 1. 최상위 중첩 saveCode 제거
  if (data.saveCode) delete data.saveCode;
  if (data.character?.saveCode) delete data.character.saveCode;

  // 2. 대화 기록 및 연표 로그 슬라이싱 (용량 최적화)
  if (Array.isArray(data.messages) && data.messages.length > 100) {
    data.messages = data.messages.slice(-100);
  }

  if (data.character) {
    const char = data.character;

    if (Array.isArray(char.logs) && char.logs.length > 100) {
      char.logs = char.logs.slice(-100);
    }
    if (Array.isArray(char.worldHistory) && char.worldHistory.length > 100) {
      char.worldHistory = char.worldHistory.slice(-100);
    }
    if (char.schoolData?.history && Array.isArray(char.schoolData.history) && char.schoolData.history.length > 50) {
      char.schoolData.history = char.schoolData.history.slice(-50);
    }

    // 3. 주인공(플레이어) 정제
    sanitizeEntity(char, preserveMedia, preserveFrameAnimation);

    // 4. 활성 동료 정제
    if (Array.isArray(char.companions)) {
      char.companions.forEach((comp: any) => {
        sanitizeEntity(comp, preserveMedia, preserveFrameAnimation);
        if (Array.isArray(comp.logs) && comp.logs.length > 50) {
          comp.logs = comp.logs.slice(-50);
        }
      });
    }

    // 5. 비활성 동료 정제
    if (Array.isArray(char.inactiveCompanions)) {
      char.inactiveCompanions.forEach((comp: any) => {
        sanitizeEntity(comp, preserveMedia, preserveFrameAnimation);
        if (Array.isArray(comp.logs) && comp.logs.length > 50) {
          comp.logs = comp.logs.slice(-50);
        }
      });
    }

    // 6. 플레이어 전환(PlayerCompanionSwitchService) 관련 보관 객체 정제
    if (char.formerPlayer) {
      sanitizeEntity(char.formerPlayer, preserveMedia, preserveFrameAnimation);
    }
    if (Array.isArray(char.formerCompanions)) {
      char.formerCompanions.forEach((comp: any) => sanitizeEntity(comp, preserveMedia, preserveFrameAnimation));
    }
  }

  return data;
}
