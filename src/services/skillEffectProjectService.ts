import { Character, Skill, SkillFrameAnimation } from '../types';

export interface SkillEffectItem {
    skillName: string;
    ownerName: string;
    ownerType: 'player' | 'companion' | 'monster';
    isBondSkill?: boolean;
    frameAnimation?: SkillFrameAnimation;
    vfxTheme?: string;
    vfxColor?: string;
    vfxShape?: string;
    vfxScale?: number;
    icon?: string;
    imageUrl?: string;
    illustrationUrl?: string;
    videoUrl?: string;
}

export interface AllSkillEffectsProjectFile {
    version: '1.0';
    type: 'AllSkillEffectsProject';
    title: string;
    createdAt: string;
    characterName: string;
    totalCount: number;
    effects: SkillEffectItem[];
}

/**
 * 캐릭터(플레이어, 모든 동료, 마수 등)에 등록된 모든 스킬 이펙트 데이터를 추출합니다.
 */
export function collectAllSkillEffects(character: Character): SkillEffectItem[] {
    const list: SkillEffectItem[] = [];
    const visited = new Set<string>();

    const checkAndPush = (skill: Skill, ownerName: string, ownerType: 'player' | 'companion' | 'monster', isBond: boolean = false) => {
        if (!skill || !skill.name) return;
        const key = `${ownerName}_${skill.name}_${isBond ? 'bond' : 'normal'}`;
        if (visited.has(key)) return;

        const hasFrame = Boolean(skill.frameAnimation && Array.isArray(skill.frameAnimation.frames) && skill.frameAnimation.frames.length > 0);
        const hasVfx = Boolean((skill as any).vfxTheme || (skill as any).vfxColor || (skill as any).vfxShape || (skill as any).vfxScale);
        const hasMedia = Boolean(skill.imageUrl || skill.illustrationUrl || (skill as any).videoUrl);

        // 프레임 애니메이션, VFX 커스텀, 또는 미디어(영상/일러스트/아이콘) 중 하나라도 설정되어 있으면 수집
        if (hasFrame || hasVfx || hasMedia) {
            visited.add(key);
            list.push({
                skillName: skill.name,
                ownerName,
                ownerType,
                isBondSkill: isBond,
                frameAnimation: skill.frameAnimation ? JSON.parse(JSON.stringify(skill.frameAnimation)) : undefined,
                vfxTheme: (skill as any).vfxTheme,
                vfxColor: (skill as any).vfxColor,
                vfxShape: (skill as any).vfxShape,
                vfxScale: (skill as any).vfxScale,
                icon: skill.icon,
                imageUrl: skill.imageUrl,
                illustrationUrl: skill.illustrationUrl,
                videoUrl: (skill as any).videoUrl
            });
        }
    };

    // 1. 플레이어 본체 스킬
    (character.skills || []).forEach(s => checkAndPush(s, character.name || '주인공', 'player', false));
    (character.bondSkills || []).forEach(s => checkAndPush(s, character.name || '주인공', 'player', true));

    // 2. 활성 동료 스킬
    (character.companions || []).forEach(c => {
        const isMon = Boolean(c.isMonster || (c as any).isCustomMonster || c.race === '몬스터' || c.race === '마수');
        (c.skills || []).forEach(s => checkAndPush(s, c.name, isMon ? 'monster' : 'companion', false));
    });

    // 3. 비활성(대기) 동료 스킬
    (character.inactiveCompanions || []).forEach(c => {
        const isMon = Boolean(c.isMonster || (c as any).isCustomMonster || c.race === '몬스터' || c.race === '마수');
        (c.skills || []).forEach(s => checkAndPush(s, c.name, isMon ? 'monster' : 'companion', false));
    });

    // 4. 포획 몬스터 스킬
    (character.base?.capturedMonsters || []).forEach((m: any) => {
        (m.skills || []).forEach((s: Skill) => checkAndPush(s, m.name, 'monster', false));
    });

    // 5. 플레이어 전환(PlayerCompanionSwitchService) 관련 전대 주인공 동료 객체
    const former = (character as any).formerPlayerCompanion;
    if (former && Array.isArray(former.skills)) {
        former.skills.forEach((s: Skill) => checkAndPush(s, former.name || '전대 가주', 'companion', false));
    }

    return list;
}

/**
 * 전체 스킬 이펙트를 통합 프로젝트 JSON 파일로 내보내어 다운로드합니다.
 */
export function exportAllSkillEffectsToFile(character: Character): { success: boolean; count: number; fileName: string } {
    const effects = collectAllSkillEffects(character);

    if (effects.length === 0) {
        return { success: false, count: 0, fileName: '' };
    }

    const projectData: AllSkillEffectsProjectFile = {
        version: '1.0',
        type: 'AllSkillEffectsProject',
        title: '전체 스킬 이펙트 통합 프로젝트',
        createdAt: new Date().toISOString(),
        characterName: character.name || '주인공',
        totalCount: effects.length,
        effects: effects
    };

    const jsonStr = JSON.stringify(projectData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const now = new Date();
    const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
    const safeCharName = (character.name || '주인공').replace(/[\s/\\?%*:|"<>]/g, '_');
    const fileName = `전체_스킬이펙트_프로젝트_${safeCharName}_${dateStr}.json`;

    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    return { success: true, count: effects.length, fileName };
}

/**
 * 프로젝트 JSON 텍스트(전체 통합 프로젝트 또는 단일 프로젝트)를 파싱하여 캐릭터에 적용합니다.
 */
export function importSkillEffectsFromText(
    character: Character, 
    jsonText: string,
    fallbackSkillName?: string
): { success: boolean; updatedCharacter: Character; appliedCount: number; message: string } {
    try {
        const parsed = JSON.parse(jsonText);
        let effectItems: SkillEffectItem[] = [];

        // 1. 전체 통합 프로젝트 파일 형식
        if (parsed.type === 'AllSkillEffectsProject' && Array.isArray(parsed.effects)) {
            effectItems = parsed.effects;
        } 
        // 2. 단일 스킬 프레임 애니메이션 프로젝트 파일 형식
        else if (parsed.type === 'SkillFrameAnimationProject' && parsed.animation) {
            const skillName = parsed.skillName || fallbackSkillName || '스킬';
            effectItems = [{
                skillName,
                ownerName: '전체',
                ownerType: 'player',
                frameAnimation: parsed.animation
            }];
        }
        // 3. 단순 배열 형태
        else if (Array.isArray(parsed)) {
            effectItems = parsed;
        } else {
            return {
                success: false,
                updatedCharacter: character,
                appliedCount: 0,
                message: '유효한 스킬 이펙트 프로젝트 파일 형식이 아닙니다.'
            };
        }

        if (effectItems.length === 0) {
            return {
                success: false,
                updatedCharacter: character,
                appliedCount: 0,
                message: '프로젝트 파일 내에 복원 가능한 스킬 이펙트 데이터가 없습니다.'
            };
        }

        // 스킬명 기준 맵 구성
        const effectMap = new Map<string, SkillEffectItem>();
        effectItems.forEach(item => {
            if (item.skillName) {
                effectMap.set(item.skillName, item);
            }
        });

        // 불변 깊은 복사
        const newChar: Character = JSON.parse(JSON.stringify(character));
        let appliedCount = 0;

        const applyToSkill = <T extends Skill>(skill: T): T => {
            if (!skill || !skill.name) return skill;
            const match = effectMap.get(skill.name);
            if (!match) return skill;

            appliedCount++;
            const updated: T = { ...skill };

            if (match.frameAnimation) {
                updated.frameAnimation = JSON.parse(JSON.stringify(match.frameAnimation));
            }
            if (match.vfxTheme !== undefined) (updated as any).vfxTheme = match.vfxTheme;
            if (match.vfxColor !== undefined) (updated as any).vfxColor = match.vfxColor;
            if (match.vfxShape !== undefined) (updated as any).vfxShape = match.vfxShape;
            if (match.vfxScale !== undefined) (updated as any).vfxScale = match.vfxScale;
            if (match.icon !== undefined) updated.icon = match.icon;
            if (match.imageUrl !== undefined) updated.imageUrl = match.imageUrl;
            if (match.illustrationUrl !== undefined) updated.illustrationUrl = match.illustrationUrl;
            if (match.videoUrl !== undefined) (updated as any).videoUrl = match.videoUrl;

            return updated;
        };

        // 1. 플레이어 스킬 적용
        if (Array.isArray(newChar.skills)) {
            newChar.skills = newChar.skills.map(applyToSkill);
        }
        if (Array.isArray(newChar.bondSkills)) {
            newChar.bondSkills = newChar.bondSkills.map(applyToSkill);
        }

        // 2. 활성 동료 적용
        if (Array.isArray(newChar.companions)) {
            newChar.companions = newChar.companions.map(c => ({
                ...c,
                skills: Array.isArray(c.skills) ? c.skills.map(applyToSkill) : []
            }));
        }

        // 3. 비활성 동료 적용
        if (Array.isArray(newChar.inactiveCompanions)) {
            newChar.inactiveCompanions = newChar.inactiveCompanions.map(c => ({
                ...c,
                skills: Array.isArray(c.skills) ? c.skills.map(applyToSkill) : []
            }));
        }

        // 4. 포획 몬스터 적용
        if (newChar.base?.capturedMonsters && Array.isArray(newChar.base.capturedMonsters)) {
            newChar.base.capturedMonsters = newChar.base.capturedMonsters.map((m: any) => ({
                ...m,
                skills: Array.isArray(m.skills) ? m.skills.map(applyToSkill) : []
            }));
        }

        // 5. 플레이어 전환(PlayerCompanionSwitchService) 전대 주인공 동료 적용
        if ((newChar as any).formerPlayerCompanion?.skills) {
            (newChar as any).formerPlayerCompanion.skills = (newChar as any).formerPlayerCompanion.skills.map(applyToSkill);
        }

        if (appliedCount === 0) {
            return {
                success: false,
                updatedCharacter: character,
                appliedCount: 0,
                message: '프로젝트 내의 스킬 이름과 일치하는 보유 스킬을 찾지 못했습니다.'
            };
        }

        return {
            success: true,
            updatedCharacter: newChar,
            appliedCount,
            message: `총 ${appliedCount}개 스킬의 이펙트 데이터 복원을 완료했습니다!`
        };
    } catch (err) {
        console.error('스킬 이펙트 프로젝트 불러오기 실패:', err);
        return {
            success: false,
            updatedCharacter: character,
            appliedCount: 0,
            message: '파일 파싱 중 오류가 발생했습니다. 올바른 JSON 파일인지 확인하세요.'
        };
    }
}
