/**
 * 세이브 데이터에 들어있는 모든 고용량 스킬 미디어, 프레임 애니메이션 이미지(Base64)들을
 * 캔버스를 통해 대폭 리사이징 및 압축(JPEG, 저품질)하여 세이브 파일 자체의 용량을 대폭 감소시키는 경량화 서비스
 */

export interface CompressionProgress {
  total: number;
  current: number;
  label: string;
}

/**
 * 고용량 Base64 이미지 데이터를 타겟 해상도(예: 128px)와 저품질 JPEG로 대폭 압축
 */
export function compressBase64Image(
  base64Str: string,
  maxDim: number = 128,
  quality: number = 0.5
): Promise<string> {
  return new Promise((resolve) => {
    if (typeof base64Str !== 'string' || !base64Str.startsWith('data:image/')) {
      resolve(base64Str);
      return;
    }

    // 이미 극도로 작으면 불필요한 압축 패스
    if (base64Str.length < 3000) {
      resolve(base64Str);
      return;
    }

    const img = new Image();
    img.onload = () => {
      let w = img.width;
      let h = img.height;
      if (w <= 0 || h <= 0) {
        resolve(base64Str);
        return;
      }

      // 최대 너비/높이 제한 (예: 128px)
      if (w > maxDim || h > maxDim) {
        if (w >= h) {
          h = Math.round(h * (maxDim / w));
          w = maxDim;
        } else {
          w = Math.round(w * (maxDim / h));
          h = maxDim;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(base64Str);
        return;
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'medium';
      ctx.drawImage(img, 0, 0, w, h);

      // 용량을 절반 이하로 줄이기 위해 JPEG 50% 품질 인코딩
      const compressed = canvas.toDataURL('image/jpeg', quality);
      if (compressed.length < base64Str.length) {
        resolve(compressed);
      } else {
        resolve(base64Str);
      }
    };
    img.onerror = () => {
      resolve(base64Str);
    };
    img.src = base64Str;
  });
}

/**
 * 단일 스킬 내의 모든 이미지 필드를 비동기로 순차 압축
 */
async function compressSkillImages(
  skill: any,
  maxDim: number,
  quality: number,
  onStep: () => void
): Promise<void> {
  if (!skill || typeof skill !== 'object') return;

  // 일반 썸네일, 일러스트 압축
  if (skill.imageUrl) {
    skill.imageUrl = await compressBase64Image(skill.imageUrl, maxDim, quality);
    onStep();
  }
  if (skill.illustrationUrl) {
    skill.illustrationUrl = await compressBase64Image(skill.illustrationUrl, maxDim, quality);
    onStep();
  }
  if (skill.summonData && skill.summonData.summonImageUrl) {
    skill.summonData.summonImageUrl = await compressBase64Image(skill.summonData.summonImageUrl, maxDim, quality);
    onStep();
  }

  // 이펙트 프레임 애니메이션 이미지들 압축 (핵심 용량 차지 항목)
  if (skill.frameAnimation && Array.isArray(skill.frameAnimation.frames)) {
    for (const frame of skill.frameAnimation.frames) {
      if (frame.imageUrl) {
        frame.imageUrl = await compressBase64Image(frame.imageUrl, maxDim, quality);
        onStep();
      }
    }
  }
}

/**
 * 캐릭터 엔티티의 초상화 및 스킬들의 미디어를 비동기 일괄 압축
 */
async function compressEntityImages(
  entity: any,
  maxDim: number,
  quality: number,
  onStep: () => void
): Promise<void> {
  if (!entity || typeof entity !== 'object') return;

  // 초상화 압축
  if (entity.visualUrl) {
    entity.visualUrl = await compressBase64Image(entity.visualUrl, maxDim, quality);
    onStep();
  }

  // 스킬 목록 압축
  if (Array.isArray(entity.skills)) {
    for (const skill of entity.skills) {
      await compressSkillImages(skill, maxDim, quality, onStep);
    }
  }

  // 인연/합체 스킬 목록 압축
  if (Array.isArray(entity.bondSkills)) {
    for (const skill of entity.bondSkills) {
      await compressSkillImages(skill, maxDim, quality, onStep);
    }
  }
}

/**
 * 게임 데이터에 포함된 후보 미디어들을 집계하여 전체 처리 수 파악
 */
function countCompressibleTargets(data: any): number {
  let count = 0;
  const countSkill = (s: any) => {
    if (!s) return;
    if (s.imageUrl && s.imageUrl.startsWith('data:image/')) count++;
    if (s.illustrationUrl && s.illustrationUrl.startsWith('data:image/')) count++;
    if (s.summonData?.summonImageUrl && s.summonData.summonImageUrl.startsWith('data:image/')) count++;
    if (s.frameAnimation?.frames && Array.isArray(s.frameAnimation.frames)) {
      s.frameAnimation.frames.forEach((f: any) => {
        if (f.imageUrl && f.imageUrl.startsWith('data:image/')) count++;
      });
    }
  };

  const countEntity = (ent: any) => {
    if (!ent) return;
    if (ent.visualUrl && ent.visualUrl.startsWith('data:image/')) count++;
    if (Array.isArray(ent.skills)) ent.skills.forEach(countSkill);
    if (Array.isArray(ent.bondSkills)) ent.bondSkills.forEach(countSkill);
  };

  if (data?.character) {
    const char = data.character;
    countEntity(char);
    if (Array.isArray(char.companions)) char.companions.forEach(countEntity);
    if (Array.isArray(char.inactiveCompanions)) char.inactiveCompanions.forEach(countEntity);
    if (char.formerPlayer) countEntity(char.formerPlayer);
    if (Array.isArray(char.formerCompanions)) char.formerCompanions.forEach(countEntity);
  }

  return count;
}

/**
 * 전체 세이브 데이터 안의 고용량 Base64 이미지들을 찾아서 캔버스로 다운사이징 일괄 압축 수행
 */
export async function compressSaveDataMedia(
  rawData: any,
  onProgress: (p: CompressionProgress) => void,
  maxDim: number = 128,
  quality: number = 0.5
): Promise<any> {
  if (!rawData) return rawData;

  // 깊은 복사 진행
  let data: any;
  try {
    data = JSON.parse(JSON.stringify(rawData));
  } catch (e) {
    return rawData;
  }

  const totalTargets = countCompressibleTargets(data);
  if (totalTargets === 0) {
    onProgress({ total: 1, current: 1, label: '압축할 미디어가 없습니다.' });
    return data;
  }

  let currentCompleted = 0;
  const tickProgress = (label: string) => {
    currentCompleted++;
    onProgress({
      total: totalTargets,
      current: Math.min(totalTargets, currentCompleted),
      label
    });
  };

  if (data.character) {
    const char = data.character;

    // 1. 주인공 캐릭터 압축
    await compressEntityImages(char, maxDim, quality, () => tickProgress('주인공 스킬 및 프로필 압축 중...'));

    // 2. 파티 동료 압축
    if (Array.isArray(char.companions)) {
      for (const comp of char.companions) {
        await compressEntityImages(comp, maxDim, quality, () => tickProgress(`동료 스킬 압축 중...`));
      }
    }

    // 3. 비활성 동료 압축
    if (Array.isArray(char.inactiveCompanions)) {
      for (const comp of char.inactiveCompanions) {
        await compressEntityImages(comp, maxDim, quality, () => tickProgress(`대기실 동료 스킬 압축 중...`));
      }
    }

    // 4. 전대 주인공 및 보관 캐릭터 압축
    if (char.formerPlayer) {
      await compressEntityImages(char.formerPlayer, maxDim, quality, () => tickProgress('전대 주인공 데이터 압축 중...'));
    }
    if (Array.isArray(char.formerCompanions)) {
      for (const comp of char.formerCompanions) {
        await compressEntityImages(comp, maxDim, quality, () => tickProgress('전대 동료 데이터 압축 중...'));
      }
    }
  }

  return data;
}
