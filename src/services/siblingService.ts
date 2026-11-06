import { Character, Companion, RelationType, SimpleStudent } from '../types';
import { getYear } from '../utils';

/**
 * 성별 문자열을 'M' | 'F' | 'U' 로 정규화
 */
export const normalizeGender = (g?: string): 'M' | 'F' | 'U' => {
    if (!g) return 'U';
    const lower = g.toLowerCase().trim();
    if (['남성', '남자', 'male', 'man', 'boy', '남'].some(k => lower.includes(k))) return 'M';
    if (['여성', '여자', 'female', 'woman', 'girl', '여'].some(k => lower.includes(k))) return 'F';
    return 'U';
};

/**
 * 인물의 나이를 계산
 */
export const getEntityAge = (person: any, currentYear: number): number => {
    if (!person) return 0;
    if (person.birthYear !== undefined) return Math.max(0, currentYear - person.birthYear);
    const parsed = parseInt(String(person.age || '').replace(/[^0-9]/g, ''));
    return isNaN(parsed) ? 0 : parsed;
};

/**
 * 두 인물이 형제자매 관계인지 여부 판별
 */
export const areSiblings = (person1: any, person2: any, character?: Character): boolean => {
    if (!person1 || !person2) return false;
    if (person1.id && person2.id && person1.id === person2.id) return false;

    // 1. 직접 지정된 SIBLING 관계 타입 확인
    if (person1.relations?.[person2.id]?.type === RelationType.SIBLING ||
        person2.relations?.[person1.id]?.type === RelationType.SIBLING) {
        return true;
    }

    // 2. 플레이어와의 형제자매 관계 확인
    if (character) {
        const isP1Player = person1.id === 'player' || person1.name === character.name;
        const isP2Player = person2.id === 'player' || person2.name === character.name;
        if (isP1Player && isP2Player) return false;

        const isP1PlayerSib = person1.relation === RelationType.SIBLING || person1.relations?.['player']?.type === RelationType.SIBLING;
        const isP2PlayerSib = person2.relation === RelationType.SIBLING || person2.relations?.['player']?.type === RelationType.SIBLING;

        if (isP1Player) {
            return isP2PlayerSib;
        }
        if (isP2Player) {
            return isP1PlayerSib;
        }
        // 둘 다 플레이어와 형제인 경우, 둘 간에도 형제 관계 성립
        if (isP1PlayerSib && isP2PlayerSib) {
            return true;
        }
    }

    // 3. 부모(parentNames) 공유 여부 확인 (둘 중 하나라도 같으면 형제)
    const parents1: string[] = person1.childData?.parentNames?.filter((p: any) => p && typeof p === 'string' && p.trim().length > 0) || [];
    const parents2: string[] = person2.childData?.parentNames?.filter((p: any) => p && typeof p === 'string' && p.trim().length > 0) || [];

    if (parents1.length > 0 && parents2.length > 0) {
        const hasSharedParent = parents1.some(p1 => parents2.includes(p1));
        if (hasSharedParent) return true;
    }

    // 4. 플레이어의 자식들끼리인지 확인 (classType '자녀' / 'Child' 등)
    if (character) {
        const isChild1 = person1.classType?.includes('자녀') || person1.classType?.includes('Child') || parents1.includes(character.name);
        const isChild2 = person2.classType?.includes('자녀') || person2.classType?.includes('Child') || parents2.includes(character.name);
        if (isChild1 && isChild2) return true;
    }

    return false;
};

/**
 * 두 형제가 이복/이부 형제(부모 중 한 쪽만 일치)인지 여부 판단
 */
export const isHalfSibling = (person1: any, person2: any, character?: Character): boolean => {
    if (!person1 || !person2) return false;

    // 1. 관계 객체에 저장된 isHalf 플래그 우선 확인
    if (person1.relations?.[person2.id]?.isHalf !== undefined) {
        return !!person1.relations[person2.id].isHalf;
    }
    if (person2.relations?.[person1.id]?.isHalf !== undefined) {
        return !!person2.relations[person1.id].isHalf;
    }

    // 2. 부모 목록 비교
    const parents1: string[] = person1.childData?.parentNames?.filter((p: any) => p && typeof p === 'string' && p.trim().length > 0) || [];
    const parents2: string[] = person2.childData?.parentNames?.filter((p: any) => p && typeof p === 'string' && p.trim().length > 0) || [];

    if (parents1.length > 0 && parents2.length > 0) {
        const shared = parents1.filter(p => parents2.includes(p));
        // 공유하는 부모가 1명이고, 전체 부모 종류가 2개 초과인 경우 (즉 서로 다른 부모 존재)
        if (shared.length === 1) {
            const allParents = new Set([...parents1, ...parents2]);
            if (allParents.size >= 3) return true;
        }
        if (shared.length >= 2) return false; // 양쪽 부모 모두 공유 -> 친형제
    }

    // 플레이어의 자녀들 간 비교
    if (character) {
        const isChild1 = person1.classType?.includes('자녀') || person1.classType?.includes('Child') || parents1.includes(character.name);
        const isChild2 = person2.classType?.includes('자녀') || person2.classType?.includes('Child') || parents2.includes(character.name);

        if (isChild1 && isChild2) {
            // 플레이어 이외의 다른 한쪽 부모(어머니 또는 아버지) 비교
            const otherParent1 = parents1.find(p => p !== character.name) || person1.childData?.motherName || person1.childData?.fatherName;
            const otherParent2 = parents2.find(p => p !== character.name) || person2.childData?.motherName || person2.childData?.fatherName;

            if (otherParent1 && otherParent2 && otherParent1 !== otherParent2) {
                return true; // 아버지는 플레이어로 같으나 어머니가 서로 다름 -> 이복/이부 형제
            }
        }
    }

    return false;
};

/**
 * 이복 / 이부 구문 식별 ('이복' | '이부' | '이복/이부')
 */
export const getHalfSiblingCategory = (person1: any, person2: any): '이복' | '이부' | '이복/이부' => {
    const parents1: string[] = person1.childData?.parentNames || [];
    const parents2: string[] = person2.childData?.parentNames || [];

    const m1 = person1.childData?.motherName || person1.childData?.motherId;
    const f1 = person1.childData?.fatherName || person1.childData?.fatherId;
    const m2 = person2.childData?.motherName || person2.childData?.motherId;
    const f2 = person2.childData?.fatherName || person2.childData?.fatherId;

    if (f1 && f2 && f1 === f2 && m1 !== m2) return '이복';
    if (m1 && m2 && m1 === m2 && f1 !== f2) return '이부';

    return '이복/이부';
};

/**
 * 두 형제자매 간의 호칭 및 관계 범주 계산
 * (person 입장에서 targetSibling을 부르는 호칭 및 카테고리)
 */
export const getSiblingKinshipTerm = (
    person: any,
    targetSibling: any,
    currentYear: number,
    isHalf?: boolean
): { term: string; relationCategory: '형제' | '자매' | '남매' | '형제자매'; isHalf: boolean } => {
    const pGen = normalizeGender(person.gender);
    const tGen = normalizeGender(targetSibling.gender);
    const pAge = getEntityAge(person, currentYear);
    const tAge = getEntityAge(targetSibling, currentYear);

    const half = isHalf !== undefined ? isHalf : false;

    // 관계 카테고리 (형제, 자매, 남매)
    let relationCategory: '형제' | '자매' | '남매' | '형제자매' = '형제자매';
    if (pGen === 'M' && tGen === 'M') relationCategory = '형제';
    else if (pGen === 'F' && tGen === 'F') relationCategory = '자매';
    else if ((pGen === 'M' && tGen === 'F') || (pGen === 'F' && tGen === 'M')) relationCategory = '남매';

    // 호칭 (상대방 targetSibling이 연상/연하/동갑인지에 따라)
    let term = '형제자매';
    const isTargetOlder = tAge > pAge || (tAge === pAge && (targetSibling.birthYear || 0) < (person.birthYear || 0));
    const isTargetYounger = tAge < pAge || (tAge === pAge && (targetSibling.birthYear || 0) > (person.birthYear || 0));

    if (pGen === 'M') {
        if (tGen === 'M') {
            if (isTargetOlder) term = half ? '이복/이부 형' : '형';
            else if (isTargetYounger) term = half ? '이복/이부 남동생' : '남동생';
            else term = half ? '이복/이부 동갑형제' : '동갑 형제';
        } else if (tGen === 'F') {
            if (isTargetOlder) term = half ? '이복/이부 누나' : '누나';
            else if (isTargetYounger) term = half ? '이복/이부 여동생' : '여동생';
            else term = half ? '이복/이부 동갑남매' : '동갑 남매';
        } else {
            term = isTargetOlder ? '윗형제' : isTargetYounger ? '동생' : '동갑';
        }
    } else if (pGen === 'F') {
        if (tGen === 'M') {
            if (isTargetOlder) term = half ? '이복/이부 오빠' : '오빠';
            else if (isTargetYounger) term = half ? '이복/이부 남동생' : '남동생';
            else term = half ? '이복/이부 동갑남매' : '동갑 남매';
        } else if (tGen === 'F') {
            if (isTargetOlder) term = half ? '이복/이부 언니' : '언니';
            else if (isTargetYounger) term = half ? '이복/이부 여동생' : '여동생';
            else term = half ? '이복/이부 동갑자매' : '동갑 자매';
        } else {
            term = isTargetOlder ? '윗형제' : isTargetYounger ? '동생' : '동갑';
        }
    } else {
        if (tGen === 'M') term = isTargetOlder ? '오빠/형' : '남동생';
        else if (tGen === 'F') term = isTargetOlder ? '언니/누나' : '여동생';
        else term = isTargetOlder ? '윗형제' : '아래동생';
    }

    return { term, relationCategory, isHalf: half };
};

/**
 * 특정 동료/인물의 모든 형제자매 목록 검색
 */
export const findSiblingsOfCompanion = (
    person: any,
    character: Character
): Array<{ companion: Companion | SimpleStudent; term: string; relationCategory: string; isHalf: boolean }> => {
    if (!person || !character) return [];

    const currentYear = getYear(character.currentDate || '2000-01-01');
    const allCandidates = [
        ...character.companions,
        ...(character.inactiveCompanions || []),
        ...(character.socialNetwork || [])
    ].filter(c => c && c.id !== person.id && !('isMonster' in c && (c as any).isMonster));

    // 중복 제거
    const uniqueCandidates: (Companion | SimpleStudent)[] = [];
    const seenIds = new Set<string>();
    for (const c of allCandidates) {
        if (!seenIds.has(c.id)) {
            seenIds.add(c.id);
            uniqueCandidates.push(c as any);
        }
    }

    const results: Array<{ companion: Companion | SimpleStudent; term: string; relationCategory: string; isHalf: boolean }> = [];

    for (const other of uniqueCandidates) {
        if (areSiblings(person, other, character)) {
            const isHalf = isHalfSibling(person, other, character);
            const { term, relationCategory } = getSiblingKinshipTerm(person, other, currentYear, isHalf);
            results.push({
                companion: other,
                term,
                relationCategory,
                isHalf
            });
        }
    }

    return results;
};

/**
 * 같은 부모 밑에서 자란 모든 자식들 간의 형제자매 관계를 자동으로 동기화
 */
export const syncAllSiblingRelations = (character: Character): { updatedChar: Character; count: number; details: string[] } => {
    const newChar: Character = {
        ...character,
        companions: character.companions.map(c => ({ ...c, relations: { ...(c.relations || {}) } })),
        inactiveCompanions: (character.inactiveCompanions || []).map(c => ({ ...c, relations: { ...(c.relations || {}) } })),
        socialNetwork: (character.socialNetwork || []).map(c => ({ ...c, relations: { ...(c.relations || {}) } }))
    };

    const currentYear = getYear(newChar.currentDate || '2000-01-01');
    const allEntities = [
        ...newChar.companions,
        ...(newChar.inactiveCompanions || []),
        ...(newChar.socialNetwork || [])
    ].filter(e => !('isMonster' in e && (e as any).isMonster));

    let pairedCount = 0;
    const details: string[] = [];
    const processedPairs = new Set<string>();

    for (let i = 0; i < allEntities.length; i++) {
        for (let j = i + 1; j < allEntities.length; j++) {
            const c1 = allEntities[i];
            const c2 = allEntities[j];

            if (c1.id === c2.id) continue;

            const pairKey = [c1.id, c2.id].sort().join('_');
            if (processedPairs.has(pairKey)) continue;

            if (areSiblings(c1, c2, newChar)) {
                processedPairs.add(pairKey);

                if (!c1.relations) c1.relations = {};
                if (!c2.relations) c2.relations = {};

                const isHalf = isHalfSibling(c1, c2, newChar);

                // 호감도 유지 혹은 기본 75 설정
                const aff1 = c1.relations[c2.id]?.affection !== undefined ? c1.relations[c2.id].affection : 75;
                const aff2 = c2.relations[c1.id]?.affection !== undefined ? c2.relations[c1.id].affection : 75;

                c1.relations[c2.id] = {
                    targetId: c2.id,
                    affection: aff1,
                    type: RelationType.SIBLING,
                    isHalf
                };

                c2.relations[c1.id] = {
                    targetId: c1.id,
                    affection: aff2,
                    type: RelationType.SIBLING,
                    isHalf
                };

                // 형제간 연애/배우자 관계 오설정 방지
                if ((c1 as Companion).partnerId === c2.id) {
                    (c1 as Companion).isLover = false;
                    (c1 as Companion).isSpouse = false;
                    (c1 as Companion).partnerId = undefined;
                    (c1 as Companion).partnerName = undefined;
                }
                if ((c2 as Companion).partnerId === c1.id) {
                    (c2 as Companion).isLover = false;
                    (c2 as Companion).isSpouse = false;
                    (c2 as Companion).partnerId = undefined;
                    (c2 as Companion).partnerName = undefined;
                }

                const { term: term1, relationCategory } = getSiblingKinshipTerm(c1, c2, currentYear, isHalf);
                const { term: term2 } = getSiblingKinshipTerm(c2, c1, currentYear, isHalf);

                pairedCount++;
                details.push(`${c1.name}(${term2}) ↔ ${c2.name}(${term1}) [${relationCategory}${isHalf ? ' (이복/이부)' : ' (친)'}]`);
            }
        }
    }

    return { updatedChar: newChar, count: pairedCount, details };
};

/**
 * 운영자 모드용: 특정 인물과 타겟(또는 플레이어) 간 형제자매 관계 강제 설정/해제
 */
export const setForcedSiblingRelation = (
    character: Character,
    compId: string,
    targetIdOrPlayer: string,
    isSibling: boolean,
    isHalf: boolean = false
): Character => {
    const newChar: Character = {
        ...character,
        companions: character.companions.map(c => ({ ...c, relations: { ...(c.relations || {}) } })),
        inactiveCompanions: (character.inactiveCompanions || []).map(c => ({ ...c, relations: { ...(c.relations || {}) } })),
        socialNetwork: (character.socialNetwork || []).map(c => ({ ...c, relations: { ...(c.relations || {}) } }))
    };

    const findEntity = (id: string) => {
        let found = newChar.companions.find(c => c.id === id);
        if (found) return found;
        found = (newChar.inactiveCompanions || []).find(c => c.id === id);
        if (found) return found;
        return (newChar.socialNetwork || []).find(c => c.id === id);
    };

    const comp = findEntity(compId);
    if (!comp) return character;

    if (targetIdOrPlayer === 'player') {
        if (!comp.relations) comp.relations = {};
        if (isSibling) {
            (comp as Companion).relation = RelationType.SIBLING;
            comp.relations['player'] = {
                targetId: 'player',
                affection: comp.relations['player']?.affection || 75,
                type: RelationType.SIBLING,
                isHalf
            };
            if ((comp as Companion).partnerId === 'player') {
                (comp as Companion).isLover = false;
                (comp as Companion).isSpouse = false;
                (comp as Companion).partnerId = undefined;
                (comp as Companion).partnerName = undefined;
            }
        } else {
            if ((comp as Companion).relation === RelationType.SIBLING) {
                (comp as Companion).relation = undefined;
            }
            if (comp.relations['player']?.type === RelationType.SIBLING) {
                comp.relations['player'].type = RelationType.ALLY;
                comp.relations['player'].isHalf = undefined;
            }
        }
        return newChar;
    }

    const target = findEntity(targetIdOrPlayer);
    if (!target) return newChar;

    if (!comp.relations) comp.relations = {};
    if (!target.relations) target.relations = {};

    if (isSibling) {
        comp.relations[target.id] = {
            targetId: target.id,
            affection: comp.relations[target.id]?.affection || 75,
            type: RelationType.SIBLING,
            isHalf
        };
        target.relations[comp.id] = {
            targetId: comp.id,
            affection: target.relations[comp.id]?.affection || 75,
            type: RelationType.SIBLING,
            isHalf
        };

        // 연애 관계 해제
        if ((comp as Companion).partnerId === target.id) {
            (comp as Companion).isLover = false;
            (comp as Companion).isSpouse = false;
            (comp as Companion).partnerId = undefined;
            (comp as Companion).partnerName = undefined;
        }
        if ((target as Companion).partnerId === comp.id) {
            (target as Companion).isLover = false;
            (target as Companion).isSpouse = false;
            (target as Companion).partnerId = undefined;
            (target as Companion).partnerName = undefined;
        }
    } else {
        if (comp.relations[target.id]?.type === RelationType.SIBLING) {
            comp.relations[target.id].type = RelationType.ALLY;
            comp.relations[target.id].isHalf = undefined;
        }
        if (target.relations[comp.id]?.type === RelationType.SIBLING) {
            target.relations[comp.id].type = RelationType.ALLY;
            target.relations[comp.id].isHalf = undefined;
        }
    }

    return newChar;
};
