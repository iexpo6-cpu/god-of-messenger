import { Character, ChoiceEvent, Companion, Stats } from '../types';
import { removeBondSkillsBetween } from './relationService';
import { calculateFinalStats } from '../utils';

// Utility to parse year and month from date string
const parseYearMonth = (dateStr?: string): { year: number; month: number } | null => {
    if (!dateStr) return null;
    const numbers = dateStr.match(/\d+/g);
    if (!numbers || numbers.length === 0) return null;
    const year = parseInt(numbers[0], 10);
    const month = numbers.length >= 2 ? parseInt(numbers[1], 10) : 1;
    if (isNaN(year) || year < 1000) return null;
    return { year, month: isNaN(month) || month < 1 || month > 12 ? 1 : month };
};

const getMonthsDiff = (startDate?: string, endDate?: string): number => {
    const start = parseYearMonth(startDate);
    const end = parseYearMonth(endDate);
    if (!start || !end) return 0;
    return Math.max(0, (end.year - start.year) * 12 + (end.month - start.month));
};

export const getLoverMonths = (c1: Companion, partner?: Companion | { id?: string; loverStartDate?: string }, currentDate?: string): number => {
    const rel1 = partner?.id ? (c1.relations?.[partner.id] as any) : undefined;
    const rel2 = partner?.id ? (partner as any)?.relations?.[c1.id] : undefined;
    const startDate = c1.loverStartDate || (partner as any)?.loverStartDate || 
                      rel1?.loverStartDate || rel1?.sinceDate || rel1?.startDate ||
                      rel2?.loverStartDate || rel2?.sinceDate || rel2?.startDate;
    if (startDate && currentDate) {
        return getMonthsDiff(startDate, currentDate);
    }
    const current = parseYearMonth(currentDate);
    if (current) {
        const currYear = current.year;
        const currMonth = current.month;
        const met1 = c1.metYear || currYear;
        const met2 = (partner as any)?.metYear || currYear;
        const startYear = Math.max(met1, met2);
        return Math.max(0, (currYear - startYear) * 12 + (currMonth - 1));
    }
    return 0;
};

/**
 * 1) [양다리 / 중복 연인 질투 이벤트]
 * 플레이어와 연인/배우자 관계인 동료가 2명 이상일 때 발생.
 */
export const checkAndTriggerJealousyEvent = (character: Character, forceCompId?: string): ChoiceEvent | null => {
    const allComps = [...character.companions, ...(character.inactiveCompanions || [])].filter(c => !c.isMonster && !c.isDead);
    // 질투 경험이 5회 미만인 연인/배우자 동료만 필터링 (5회 이상 경험 시 질투 이벤트 원천 면제)
    const eligibleLovers = allComps.filter(c => (c.isLover || c.isSpouse) && (c.partnerId === 'player' || !c.partnerId) && (c.jealousyCount || 0) < 5);

    if (eligibleLovers.length < 2) return null;

    let comp1 = eligibleLovers[0];
    let comp2 = eligibleLovers[1];

    if (forceCompId) {
        const forced = eligibleLovers.find(c => c.id === forceCompId);
        if (!forced) return null; // 강제 지정 동료가 5회 이상 질투 경험자면 이벤트 미발생
        comp1 = forced;
        comp2 = eligibleLovers.find(c => c.id !== forceCompId) || eligibleLovers[0];
        if (comp1.id === comp2.id) return null;
    } else {
        // 질투 경험 횟수가 적은 동료들을 우선 매칭
        const sorted = [...eligibleLovers].sort((a, b) => (a.jealousyCount || 0) - (b.jealousyCount || 0));
        comp1 = sorted[0];
        comp2 = sorted[1];
    }

    if ((comp1.jealousyCount || 0) >= 5 || (comp2.jealousyCount || 0) >= 5) {
        return null;
    }

    // 질투가 일어난 횟수에 따라 확률이 기하급수적으로 줄어듦 (0회: 100%, 1회: 35%, 2회: 12%, 3회+: 4% 이하)
    const avgJealousyCount = ((comp1.jealousyCount || 0) + (comp2.jealousyCount || 0)) / 2;
    const triggerChance = Math.pow(0.35, avgJealousyCount);
    if (Math.random() > triggerChance) {
        return null;
    }

    const callbackData = JSON.stringify({ comp1Id: comp1.id, comp2Id: comp2.id });

    return {
        id: `jealousy_event_${Date.now()}`,
        title: `[질투 소동] 연인들의 차가운 시선`,
        description: `${comp1.name}와(과) ${comp2.name}이(가) 당신의 앞을 막아서며 상반된 눈빛으로 당신을 노려봅니다.\n\n"${character.name}, 당신... 우리 말고도 다른 동료와도 연인 사이라는 게 정말인가요?! 대체 누구를 더 특별하게 생각하는 거죠?!"`,
        options: [
            {
                text: "진심 어린 설득과 감미로운 대화로 두 사람의 서운함을 달랜다 (원만 해결)",
                action: "jealousy_persuade",
                outcome: `당신의 정성스러운 설득과 감미로운 진심에 두 사람은 마침내 마음을 누그러뜨렸습니다.\n\n"휴... 이번만큼은 당신의 깊은 마음을 믿어볼게요. 하지만 다시는 절 외롭게 하지 마세요!"\n\n([질투 해소] 두 연인 모두 호감도 +10 상승)`,
                callbackId: callbackData
            },
            {
                text: `${comp1.name}의 손을 꼭 잡으며 편을 들어준다 (${comp1.name} 편들기)`,
                action: "jealousy_side_comp1",
                outcome: `당신의 명확한 선택에 ${comp1.name}은 감격스러운 표정으로 수줍게 미소짓지만, ${comp2.name}은 차가운 눈빛으로 질투심과 커다란 실망감을 드러냅니다.\n\n"${comp1.name}: 당신이 저를 선택해 주실 줄 알고 있었어요!"\n"${comp2.name}: ...알겠어요. 당신의 본심을 잘 확인했네요!"\n\n(${comp1.name} 호감도 +25 상승, ${comp2.name} 호감도 -35 하락)`,
                callbackId: callbackData
            },
            {
                text: `${comp2.name}의 손을 꼭 잡으며 편을 들어준다 (${comp2.name} 편들기)`,
                action: "jealousy_side_comp2",
                outcome: `당신의 명확한 선택에 ${comp2.name}은 감격스러운 표정으로 수줍게 미소짓지만, ${comp1.name}은 차가운 눈빛으로 질투심과 커다란 실망감을 드러냅니다.\n\n"${comp2.name}: 당신이 저를 선택해 주실 줄 알고 있었어요!"\n"${comp1.name}: ...알겠어요. 당신의 본심을 잘 확인했네요!"\n\n(${comp2.name} 호감도 +25 상승, ${comp1.name} 호감도 -35 하락)`,
                callbackId: callbackData
            },
            {
                text: "특별히 준비한 정성스러운 선물을 건네며 사랑을 과시한다 (300만 Gold 소모)",
                action: "jealousy_gift",
                outcome: `당신이 건넨 빛나는 선물과 달콤한 미소에 두 연인의 얼굴에 수줍은 홍조가 감돕니다.\n\n"어머... 이런 기습 선물이라니. 치사하지만 이번 한 번만 용서해 드릴게요!"\n\n(300만 Gold 소모, 두 연인 모두 호감도 +15 상승)`,
                callbackId: callbackData
            },
            {
                text: "당황하여 어설픈 변명으로 상황을 얼버무린다 (대답 회피)",
                action: "jealousy_evade",
                outcome: `우물쭈물 대답을 회피하자 두 사람 모두 차가운 눈빛과 함께 커다란 실망감을 드러냅니다.\n\n"정말 실망이에요, ${character.name}! 당신의 본심을 잘 알겠어요!"\n\n(두 연인 모두 호감도 -20 하락 및 서먹함 발생)`,
                callbackId: callbackData
            },
            {
                text: "솔직하게 상황을 인정하고 깊은 사과의 뜻을 전한다 (솔직 사과)",
                action: "jealousy_apologize",
                outcome: `당신의 진솔하고 솔직한 사과에 두 사람은 깊은 한숨을 쉬며 고개를 끄덕입니다.\n\n"후... 솔직하게 말해줘서 고마워요. 앞으로는 거짓 없이 솔직하게 대해주세요."\n\n(두 연인 모두 호감도 -5 소폭 차감, 질투 서먹함 해소)`,
                callbackId: callbackData
            }
        ]
    };
};

/**
 * 플레이어와 동료가 동일한 위치(도시/국가)에 있는지 검증합니다.
 * - 파티원은 항상 플레이어와 함께 있으므로 true
 * - 파견 중인 동료는 다른 지역에 있으므로 false
 * - 비활성 동료는 기지 위치와 플레이어 위치가 일치해야 함
 */
export const isCompanionAtPlayerLocation = (character: Character, companion: Companion): boolean => {
    // 1. 파티에 포함되어 있으면 항상 같은 위치
    const inParty = (character.companions || []).some(c => c && c.id === companion.id);
    if (inParty) return true;

    // 2. 파견(원정/임무) 중인지 체크
    const dispatches = (character as any).dispatches || [];
    const isDispatched = Array.isArray(dispatches) && dispatches.some((d: any) => d && d.companionId === companion.id);
    if (isDispatched) return false;

    const playerLoc = character.currentLocation;
    if (!playerLoc) return true; // 위치 정보가 아직 없으면 기본 허용

    // 3. 동료 개별 위치 정보가 있을 경우
    const compLoc = (companion as any).location;
    if (compLoc && (compLoc.nation || compLoc.city)) {
        const nationMatch = !compLoc.nation || compLoc.nation === playerLoc.nation;
        const cityMatch = !compLoc.city || compLoc.city === playerLoc.city;
        return nationMatch && cityMatch;
    }

    // 4. 비활성 동료는 기지(Base)에 거주함
    const baseLoc = character.base?.location;
    if (baseLoc && (baseLoc.nation || baseLoc.city)) {
        const nationMatch = !baseLoc.nation || baseLoc.nation === playerLoc.nation;
        const cityMatch = !baseLoc.city || baseLoc.city === playerLoc.city;
        return nationMatch && cityMatch;
    }

    // 위치가 다르면 다른 위치로 간주
    return false;
};

/**
 * 2) [연인 / 배우자 데이트 이벤트]
 * 플레이어와 해당 연인의 위치가 같을 때만 발생합니다.
 */
export const checkAndTriggerDateEvent = (character: Character, forceCompId?: string): ChoiceEvent | null => {
    const allComps = [...character.companions, ...(character.inactiveCompanions || [])].filter(c => !c.isMonster && !c.isDead);
    // 플레이어와 연인/배우자 관계이면서, 현재 위치가 플레이어와 동일한 동료만 선별
    const playerLovers = allComps.filter(c => 
        (c.isLover || c.isSpouse) && 
        (c.partnerId === 'player' || !c.partnerId) &&
        isCompanionAtPlayerLocation(character, c)
    );

    if (playerLovers.length === 0) return null;

    let partner = playerLovers[0];
    if (forceCompId) {
        const found = playerLovers.find(c => c.id === forceCompId);
        if (!found) return null; // 강제 지정 대상이라도 위치가 다르면 데이트 불가
        partner = found;
    } else {
        partner = playerLovers[Math.floor(Math.random() * playerLovers.length)];
    }

    const callbackData = JSON.stringify({ companionId: partner.id });

    return {
        id: `date_event_${Date.now()}`,
        title: `[달콤한 데이트] ${partner.name}와의 특별한 하루`,
        description: `${partner.name}이(가) 당신의 손을 수줍게 잡으며 다정한 목소리로 말합니다.\n\n"${character.name}, 오늘 하루는 험난한 전투나 복잡한 업무는 잊고 둘만의 달콤한 시간을 보내는 건 어때요?"`,
        options: [
            {
                text: "아름다운 호숫가 산책과 감성 피크닉 즐기기",
                action: "date_picnic",
                outcome: `시원한 바람을 맞으며 정성껏 만든 피크닉 음식을 나눴습니다. 두 사람 사이의 애정이 한층 더 깊어졌습니다!\n\n(${partner.name} 호감도 +20, 체력/마나 완전 회복, 사기 상승)`,
                callbackId: callbackData
            },
            {
                text: "화려한 도심 거리 쇼핑과 고급 레스토랑 방문 (20000 Gold 소모)",
                action: "date_shopping",
                outcome: `멋진 선물을 안겨주고 분위기 있는 고급 식사를 즐겼습니다. ${partner.name}의 얼굴에서 웃음이 떠나지 않습니다!\n\n(20000 Gold 소모, ${partner.name} 호감도 +30 상승)`,
                callbackId: callbackData
            },
            {
                text: "아늑하고 은밀한 휴게 공간에서 즐기는 깊은 휴식",
                action: "date_cozy",
                outcome: `아무런 방해도 받지 않는 아늑한 공간에서 서로의 체온을 느끼며 이야기를 나눴습니다. 피로가 눈 녹듯 사라집니다.\n\n(${partner.name} 호감도 +25, 컨디션 극상 회복)`,
                callbackId: callbackData
            },
            {
                text: "서로의 호흡을 맞추는 정갈한 무술 수련 및 대련",
                action: "date_training",
                outcome: `땀방울을 흘리며 완벽한 전투 합을 맞췄습니다. 무술의 성취감과 서로에 대한 신뢰가 눈에 띄게 커졌습니다!\n\n(${partner.name} 호감도 +15, 두 사람 전 능력치 +3 상승)`,
                callbackId: callbackData
            }
        ]
    };
};

/**
 * 3) [장기 교제 권태기 이벤트]
 * 교제 기간 2년(24개월) 이상인 연인 대상.
 * 권태기는 반드시 오는 것이 아니며, 깊은 유대나 성향에 따라 권태기 없이 자연스럽게 깊은 관계로 넘어가거나(안 올 수도 있음),
 * 올 경우에도 희박한 확률(약 2%)로 서서히 찾아옵니다.
 */
export const checkAndTriggerBurnoutEvent = (character: Character): ChoiceEvent | null => {
    const allComps = [...character.companions, ...(character.inactiveCompanions || [])].filter(c => !c.isMonster && !c.isDead);
    const currentDate = character.currentDate || '2000-01-01';

    const eligible = allComps.find(c => {
        const isPartner = (c.isLover || c.isSpouse) && (c.partnerId === 'player' || !c.partnerId);
        if (!isPartner) return false;
        if (c.hasExperiencedBurnoutEvent) return false;
        const months = getLoverMonths(c, undefined, currentDate);
        if (months < 24) return false;

        // 호감도가 높을수록(예: 85 이상) 또는 약 60%의 확률로 권태기 없이 안정적인 사랑으로 자연스럽게 통과
        const aff = c.affection || 50;
        const skipChance = aff >= 90 ? 0.75 : aff >= 75 ? 0.55 : 0.35;
        if (Math.random() < skipChance) {
            c.hasExperiencedBurnoutEvent = true; // 권태기를 겪지 않고 자연스럽게 성숙한 사랑으로 이행
            return false;
        }

        // 권태기가 올 가능성이 있는 대상이라도, 매 턴 약 0.2% 확률로만 서서히 발생 (1/10 축소)
        return Math.random() < 0.002;
    });

    if (!eligible) return null;

    const callbackData = JSON.stringify({ companionId: eligible.id });

    return {
        id: `burnout_event_${Date.now()}`,
        title: `[관계의 시련] ${eligible.name}와의 권태기`,
        description: `${eligible.name}와(과) 연인이 된 지 어느덧 2년이란 세월이 흘렀습니다.\n오랜 시간 함께하며 서로에게 익숙해진 분위기 속에 예전의 뜨거웠던 설렘보다는 미묘한 무덤덤함이 찾아왔습니다.\n\n${eligible.name}이(가) 쓸쓸한 눈빛으로 가만히 묻습니다.\n"${character.name}... 요즘 우리, 너무 익숙해져서 무감각해진 걸까요? 예전의 그 뜨거웠던 사랑의 설렘은 어디로 간 걸까요?"`,
        options: [
            {
                text: "우리가 처음 만났던 첫 만남의 장소로 깜짝 추억 여행을 떠난다!",
                action: "burnout_overcome_trip",
                outcome: `첫 만남의 떨림과 가슴 뜨거웠던 순간들이 되살아났습니다!\n${eligible.name}의 눈에 감격의 눈물이 고이며 권태기를 완벽히 극복했습니다!\n\n(권태기 완벽 극복! ${eligible.name} 호감도 +35, 영원의 유대 형성)`,
                callbackId: callbackData
            },
            {
                text: "진솔한 마음을 담은 편지를 전하고 솔직한 속마음을 깊게 털어놓는다",
                action: "burnout_overcome_talk",
                outcome: `서로가 얼마나 소중하고 대체 불가능한 존재인지 다시 한번 마음 깊이 확인했습니다. 불안감과 권태감이 눈 녹듯 사라집니다.\n\n(권태기 극복, ${eligible.name} 호감도 +25)`,
                callbackId: callbackData
            },
            {
                text: "오래 연애하면 당연히 식는 법이라며 무덤덤하게 넘긴다",
                action: "burnout_fail_ignore",
                outcome: `${eligible.name}은 실망스러운 눈빛으로 서운함을 감추지 못한 채 고개를 돌립니다. 두 사람 사이에 씁쓸한 서먹함이 감돕니다.\n\n(권태기 극복 실패, ${eligible.name} 호감도 -30 차감)`,
                callbackId: callbackData
            }
        ]
    };
};

/**
 * 4) [호감도 60 이하 연인 결별 통보 이벤트]
 * 플레이어와 연인/배우자 관계인 동료의 호감도가 60 이하로 떨어졌을 때 발생.
 */
export const checkAndTriggerBreakupEvent = (character: Character): ChoiceEvent | null => {
    const allComps = [...character.companions, ...(character.inactiveCompanions || [])]
        .filter(c => !c.isMonster && !c.isDead);
    
    // 호감도가 60 이하인 연인/배우자 탐색 (호감도가 가장 낮은 동료 우선)
    const lowAffLovers = allComps
        .filter(c => (c.isLover || c.isSpouse) && (c.partnerId === 'player' || !c.partnerId) && ((c.affection || 0) <= 60))
        .sort((a, b) => (a.affection || 0) - (b.affection || 0));

    if (lowAffLovers.length === 0) return null;

    const target = lowAffLovers[0];
    const callbackData = JSON.stringify({ companionId: target.id });

    return {
        id: `breakup_event_${target.id}_${Date.now()}`,
        title: `[이별의 기로] ${target.name}의 결별 통보`,
        description: `${target.name}이(가) 차갑게 식어버린 슬픈 눈빛으로 당신의 앞을 막아서며 말합니다.\n\n"${character.name}, 요즘 우리의 관계에 대해 깊이 고민해 봤어요... 예전 같지 않은 당신의 차가운 태도와 무관심 속에 제 마음도 점점 식어버렸어요. 우리... 이제 그만 헤어져요."\n\n(현재 호감도: ${target.affection || 0}/100 - 호감도 60 이하 이별 위기)`,
        options: [
            {
                text: "진심 어린 사과와 함께 간절하게 매달리며 다시 한번 기회를 호소한다 (호감도 +15)",
                action: "breakup_beg",
                outcome: `당신의 절박하고 진심 어린 눈빛에 ${target.name}은(는) 가슴 아픈 한숨을 쉬며 마음을 누그러뜨렸습니다.\n\n"휴... 알겠어요. 이번이 정말 마지막이에요. 앞으로는 저를 소홀하게 대하지 말아주세요..."\n\n([이별 위기 모면] ${target.name} 호감도 +15 상승)`,
                callbackId: callbackData
            },
            {
                text: "값진 보석과 호화로운 선물을 건네며 마음을 되돌린다 (1,000만 Gold 소모, 호감도 +30)",
                action: "breakup_gift",
                outcome: `당신이 건넨 진귀한 보석과 정성 어린 애정 공세에 ${target.name}의 서운했던 마음이 풀렸습니다.\n\n"이렇게까지 정성을 다해주실 줄은 몰랐어요... 좋아요, 우리 처음부터 다시 시작해요."\n\n(1,000만 Gold 소모, ${target.name} 호감도 +30 대폭 상승)`,
                callbackId: callbackData
            },
            {
                text: "상대의 결정을 존중하며 담담하게 이별을 받아들인다 (연인 관계 종료)",
                action: "breakup_accept",
                outcome: `${target.name}와(과)의 연인 관계가 정리되었습니다.\n두 사람은 이제 연인이 아닌 평범한 동료 사이로 돌아가게 됩니다.\n\n([연인 관계 종료] ${target.name}와의 연인 관계 및 인연 스킬 해제)`,
                callbackId: callbackData
            }
        ]
    };
};

/**
 * 5) [기지 동료 소동/교류 이벤트]
 * 기지(Base/Cohousing)에 머무는 동료들 사이에서 일어나는 이벤트.
 */
export const checkAndTriggerBaseEvent = (character: Character): ChoiceEvent | null => {
    const isBusy = (compId: string) => {
        const isBaseDispatched = character.base?.dispatched?.some(m => m.companionId === compId);
        const isGroupDispatched = character.mercenaryData?.groupMissions?.some(m => m.memberIds.includes(compId));
        return isBaseDispatched || isGroupDispatched;
    };

    const allComps = [...character.companions, ...(character.inactiveCompanions || [])]
        .filter(c => !c.isMonster && !c.isDead && !isBusy(c.id));

    if (allComps.length < 2) return null;

    const idx1 = Math.floor(Math.random() * allComps.length);
    let idx2 = Math.floor(Math.random() * allComps.length);
    while (idx1 === idx2) idx2 = Math.floor(Math.random() * allComps.length);

    const comp1 = allComps[idx1];
    const comp2 = allComps[idx2];

    const callbackData = JSON.stringify({ comp1Id: comp1.id, comp2Id: comp2.id });

    const eventType = Math.floor(Math.random() * 6);

    if (eventType === 0) {
        return {
            id: `base_event_spar_${Date.now()}`,
            title: `[기지 소동] ${comp1.name}와(과) ${comp2.name}의 대련`,
            description: `기지 연무장에서 ${comp1.name}와(과) ${comp2.name}이(가) 무술을 겨루며 한 치의 양보도 없는 뜨거운 실력 싸움을 벌이고 있습니다!\n다른 기지 동료들도 흥미진진하게 구경을 모여들고 있습니다.`,
            options: [
                {
                    text: "직접 공정한 심판을 보며 두 동료의 강점을 짚어주고 조언한다",
                    action: "base_event_judge",
                    outcome: `당신의 날카로운 분석과 조언에 두 동료 모두 깊은 깨달음을 얻었습니다!\n\n(두 동료 능력치 상승, ${comp1.name}/${comp2.name} 호감도 +15, 기지 사기 상승)`,
                    callbackId: callbackData
                },
                {
                    text: "정성껏 준비한 보양 간식을 전하며 훈훈하게 쉬어가도록 격려한다",
                    action: "base_event_snack",
                    outcome: `유쾌한 웃음소리와 함께 땀을 닦으며 서로를 치하합니다. 기지 전체 분위기가 화기애애해졌습니다!\n\n(${comp1.name}/${comp2.name} 호감도 +20 상승)`,
                    callbackId: callbackData
                },
                {
                    text: "위험하게 기지 내부에서 싸운다며 두 사람을 호통치고 강제로 연무장에서 쫓아낸다",
                    action: "base_event_scold_harsh",
                    outcome: `당신의 차가운 억압에 두 동료는 불만을 품은 채 돌아섰습니다.\n\n(${comp1.name}/${comp2.name} 호감도 -15 차감, 서먹함 증가)`,
                    callbackId: callbackData
                }
            ]
        };
    } else if (eventType === 1) {
        return {
            id: `base_event_cook_${Date.now()}`,
            title: `[기지 소동] ${comp1.name}의 신작 요리 시식회`,
            description: `기지 주방에서 ${comp1.name}이(가) 독창적으로 개발한 보양 요리를 만들어 ${comp2.name}에게 시식을 권유하고 있습니다.\n${comp2.name}는 오묘한 색상의 요리를 보며 식은땀을 흘리며 겁을 먹고 있습니다!`,
            options: [
                {
                    text: "내가 기꺼이 먼저 시식하고 유쾌하고 섬세한 조언을 전달한다",
                    action: "base_event_taste",
                    outcome: `생각보다 뛰어난 풍미와 유쾌한 반응에 ${comp1.name}의 요리 자신감이 크게 솟구쳤습니다!\n\n(${comp1.name} 호감도 +25 상승, 요리 숙련도 성장)`,
                    callbackId: callbackData
                },
                {
                    text: "다 함께 식탁에 둘러앉아 음식을 나누어 먹으며 이야기꽃을 피운다",
                    action: "base_event_feast",
                    outcome: `왁자지껄한 유쾌한 시식회 속에 기지 전체에 웃음꽃이 만발하였습니다.\n\n(기지 거주 동료 전체 호감도 +15 상승)`,
                    callbackId: callbackData
                },
                {
                    text: "괴상한 요리를 당장 버리라며 험악하게 화를 내고 요리를 억지로 저지한다",
                    action: "base_event_reject_food",
                    outcome: `${comp1.name}은 눈물을 글썽이며 상처를 받았고, 주변 분위기가 차갑게 식어버렸습니다.\n\n(${comp1.name} 호감도 -20 차감)`,
                    callbackId: callbackData
                }
            ]
        };
    } else if (eventType === 2) {
        return {
            id: `base_event_room_${Date.now()}`,
            title: `[기지 소동] ${comp1.name}와(과) ${comp2.name}의 공간 배치 다툼`,
            description: `기지 휴게 공간에서 ${comp1.name}와(과) ${comp2.name}이(가) 가구 배치와 청소 담당 구역을 두고 투닥거리고 있습니다.\n서로 자신만의 인테리어 방식을 고집하는 상황입니다.`,
            options: [
                {
                    text: "공평하게 구역을 배분하고 다 함께 청소를 도우며 마무리지어준다",
                    action: "base_event_divide_clean",
                    outcome: `체계적인 분담으로 휴게실이 눈부시게 깨끗해졌습니다!\n\n(기지 쾌적도 상승, 두 동료 호감도 +15 상승)`,
                    callbackId: callbackData
                },
                {
                    text: "한쪽 편만 일방적으로 들어주고 다른 상대방을 억울하게 꾸짖는다",
                    action: "base_event_side_harsh",
                    outcome: `지목당한 동료는 서운함과 억울함에 입을 꼭 다물고 자신의 방으로 들어가 버렸습니다.\n\n(${comp1.name} 호감도 +10, ${comp2.name} 호감도 -25 차감)`,
                    callbackId: callbackData
                }
            ]
        };
    } else if (eventType === 3) {
        return {
            id: `base_event_noise_${Date.now()}`,
            title: `[기지 소동] ${comp1.name}와(과) ${comp2.name}의 심야 층간 소음 다툼`,
            description: `늦은 밤, ${comp1.name}이(가) 늦은 시간까지 수련하는 소리 때문에 ${comp2.name}이(가) 잠을 이루지 못하고 크게 다투고 있습니다!`,
            options: [
                {
                    text: "방 배치를 변경해주고 차음재 설치 보강 조치를 취한다 (10만 Gold 소모)",
                    action: "base_event_noise_solve",
                    outcome: `지혜로운 대처로 두 사람의 마찰이 원만히 해결되었습니다.\n\n(10만 Gold 소모, 두 동료 호감도 +15 상승)`,
                    callbackId: callbackData
                },
                {
                    text: "시끄럽다며 두 사람 모두에게 엄벌을 내리고 야간 활동을 전면 금지시킨다",
                    action: "base_event_noise_punish",
                    outcome: `두 동료 모두 억울해하며 불만을 품게 되었습니다.\n\n(두 동료 호감도 -20 차감)`,
                    callbackId: callbackData
                }
            ]
        };
    } else if (eventType === 4) {
        return {
            id: `base_event_break_${Date.now()}`,
            title: `[기지 소동] ${comp1.name}와(과) ${comp2.name}의 공용 훈련 시설 파손`,
            description: `기지 연무장에서 ${comp1.name}와(과) ${comp2.name}이(가) 무리하게 대련을 벌이다 기지 공용 훈련 기구를 파손시켰습니다!`,
            options: [
                {
                    text: "기지 자재 마정석을 사용하여 훈련 기구를 직접 보수한다 (마정석 100개 소모)",
                    action: "base_event_repair",
                    outcome: `당신의 너그러운 조치에 두 동료는 감복하고 반성하였습니다.\n\n(마정석 100개 소모, 두 동료 호감도 +10 상승)`,
                    callbackId: callbackData
                },
                {
                    text: "파손 책임을 물어 두 동료에게 엄격히 변상금을징수한다 (50만 Gold 징수)",
                    action: "base_event_fine",
                    outcome: `두 동료는 울며 겨자 먹기로 변상금을 납부했으나 큰 서운함을 품었습니다.\n\n(50만 Gold 회수, 두 동료 호감도 -15 차감)`,
                    callbackId: callbackData
                }
            ]
        };
    } else {
        return {
            id: `base_event_supplies_${Date.now()}`,
            title: `[기지 소동] ${comp1.name}와(과) ${comp2.name}의 보급품 분실 마찰`,
            description: `기지 식량 창고에서 보급품이 사라졌다며 ${comp1.name}와(과) ${comp2.name}이(가) 서로 상대방을 의심하며 크게 다투고 있습니다!`,
            options: [
                {
                    text: "창고 보급품을 풀어서 부족분을 채워주고 다정하게 타이른다 (식량 500 소모)",
                    action: "base_event_food_fill",
                    outcome: `너그러운 보충 조치에 두 동료의 오해가 풀리고 화해하였습니다.\n\n(식량 500 소모, 두 동료 호감도 +15 상승)`,
                    callbackId: callbackData
                },
                {
                    text: "서로를 의심하는 두 동료를 엄하게 호통치고 하루 동안 금식 처분을 내린다",
                    action: "base_event_starve",
                    outcome: `두 동료는 배고픔 속에 차가운 시선으로 서로를 노려보며 호감도가 하락했습니다.\n\n(두 동료 호감도 -25 차감)`,
                    callbackId: callbackData
                }
            ]
        };
    }
};

/**
 * Handle execution of option actions for all 4 relationship events
 */
export const processRelationshipChoiceAction = (character: Character, action: string, callbackId: string): Character => {
    const newChar = JSON.parse(JSON.stringify(character)) as Character;

    const findComp = (id: string) => {
        let comp = newChar.companions.find(c => c.id === id);
        if (!comp && newChar.inactiveCompanions) {
            comp = newChar.inactiveCompanions.find(c => c.id === id);
        }
        return comp;
    };

    const healEntityToFull = (entity: any) => {
        if (!entity || !entity.stats) return;
        const { finalStats } = calculateFinalStats(entity);
        entity.stats.hp = finalStats.maxHp;
        entity.stats.mp = finalStats.maxMp;
        if ((entity as any).hp !== undefined) (entity as any).hp = finalStats.maxHp;
        if ((entity as any).mp !== undefined) (entity as any).mp = finalStats.maxMp;
    };

    try {
        const data = callbackId ? JSON.parse(callbackId) : {};

        // 1) Jealousy Events
        if (action.startsWith('jealousy_')) {
            if (data.comp1Id) {
                const c1 = findComp(data.comp1Id);
                if (c1) c1.jealousyCount = (c1.jealousyCount || 0) + 1;
            }
            if (data.comp2Id) {
                const c2 = findComp(data.comp2Id);
                if (c2) c2.jealousyCount = (c2.jealousyCount || 0) + 1;
            }
        }

        if (action === 'jealousy_persuade') {
            if (data.comp1Id) {
                const c1 = findComp(data.comp1Id);
                if (c1) c1.affection = Math.min(100, (c1.affection || 50) + 10);
            }
            if (data.comp2Id) {
                const c2 = findComp(data.comp2Id);
                if (c2) c2.affection = Math.min(100, (c2.affection || 50) + 10);
            }
        } else if (action === 'jealousy_side_comp1') {
            if (data.comp1Id) {
                const c1 = findComp(data.comp1Id);
                if (c1) c1.affection = Math.min(100, (c1.affection || 50) + 25);
            }
            if (data.comp2Id) {
                const c2 = findComp(data.comp2Id);
                if (c2) c2.affection = Math.max(-100, (c2.affection || 50) - 35);
            }
        } else if (action === 'jealousy_side_comp2') {
            if (data.comp2Id) {
                const c2 = findComp(data.comp2Id);
                if (c2) c2.affection = Math.min(100, (c2.affection || 50) + 25);
            }
            if (data.comp1Id) {
                const c1 = findComp(data.comp1Id);
                if (c1) c1.affection = Math.max(-100, (c1.affection || 50) - 35);
            }
        } else if (action === 'jealousy_gift') {
            const cost = 3000000;
            if (newChar.money >= cost) newChar.money -= cost;
            else newChar.money = 0;

            if (data.comp1Id) {
                const c1 = findComp(data.comp1Id);
                if (c1) c1.affection = Math.min(100, (c1.affection || 50) + 15);
            }
            if (data.comp2Id) {
                const c2 = findComp(data.comp2Id);
                if (c2) c2.affection = Math.min(100, (c2.affection || 50) + 15);
            }
        } else if (action === 'jealousy_evade') {
            if (data.comp1Id) {
                const c1 = findComp(data.comp1Id);
                if (c1) c1.affection = Math.max(-100, (c1.affection || 50) - 20);
            }
            if (data.comp2Id) {
                const c2 = findComp(data.comp2Id);
                if (c2) c2.affection = Math.max(-100, (c2.affection || 50) - 20);
            }
        } else if (action === 'jealousy_apologize') {
            if (data.comp1Id) {
                const c1 = findComp(data.comp1Id);
                if (c1) c1.affection = Math.max(-100, (c1.affection || 50) - 5);
            }
            if (data.comp2Id) {
                const c2 = findComp(data.comp2Id);
                if (c2) c2.affection = Math.max(-100, (c2.affection || 50) - 5);
            }
        }

        // 2) Date Events
        else if (action === 'date_picnic') {
            if (data.companionId) {
                const c = findComp(data.companionId);
                if (c) {
                    c.affection = Math.min(100, (c.affection || 50) + 20);
                    healEntityToFull(c);
                }
            }
            healEntityToFull(newChar);
            newChar.companions?.forEach(healEntityToFull);
        } else if (action === 'date_shopping') {
            const cost = 20000;
            if (newChar.money >= cost) newChar.money -= cost;
            else newChar.money = 0;

            if (data.companionId) {
                const c = findComp(data.companionId);
                if (c) {
                    c.affection = Math.min(100, (c.affection || 50) + 30);
                    healEntityToFull(c);
                }
            }
            healEntityToFull(newChar);
            newChar.companions?.forEach(healEntityToFull);
        } else if (action === 'date_cozy') {
            if (data.companionId) {
                const c = findComp(data.companionId);
                if (c) {
                    c.affection = Math.min(100, (c.affection || 50) + 25);
                    healEntityToFull(c);
                }
            }
            healEntityToFull(newChar);
            newChar.companions?.forEach(healEntityToFull);
        } else if (action === 'date_training') {
            if (data.companionId) {
                const c = findComp(data.companionId);
                if (c) {
                    c.affection = Math.min(100, (c.affection || 50) + 15);
                    const keys: (keyof Stats)[] = ['str', 'agi', 'int', 'def'];
                    keys.forEach(k => {
                        if (c.stats?.[k] !== undefined) c.stats[k] += 3;
                    });
                    healEntityToFull(c);
                }
            }
            const keys: (keyof Stats)[] = ['str', 'agi', 'int', 'def'];
            keys.forEach(k => {
                if (newChar.stats?.[k] !== undefined) newChar.stats[k] += 3;
            });
            healEntityToFull(newChar);
            newChar.companions?.forEach(healEntityToFull);
        }

        // 3) Burnout Events
        else if (action === 'burnout_overcome_trip') {
            if (data.companionId) {
                const c = findComp(data.companionId);
                if (c) {
                    c.hasExperiencedBurnoutEvent = true;
                    c.burnoutOvercome = true;
                    c.affection = Math.min(100, (c.affection || 50) + 35);
                    healEntityToFull(c);
                }
            }
            healEntityToFull(newChar);
            newChar.companions?.forEach(healEntityToFull);
        } else if (action === 'burnout_overcome_talk') {
            if (data.companionId) {
                const c = findComp(data.companionId);
                if (c) {
                    c.hasExperiencedBurnoutEvent = true;
                    c.burnoutOvercome = true;
                    c.affection = Math.min(100, (c.affection || 50) + 25);
                    healEntityToFull(c);
                }
            }
            healEntityToFull(newChar);
            newChar.companions?.forEach(healEntityToFull);
        } else if (action === 'burnout_fail_ignore') {
            if (data.companionId) {
                const c = findComp(data.companionId);
                if (c) {
                    c.hasExperiencedBurnoutEvent = true;
                    c.burnoutOvercome = false;
                    c.affection = Math.max(-100, (c.affection || 50) - 30);
                }
            }
        }

        // 4) Base Events
        else if (action === 'base_event_judge') {
            const keys: (keyof Stats)[] = ['str', 'agi', 'def'];
            if (data.comp1Id) {
                const c1 = findComp(data.comp1Id);
                if (c1) {
                    c1.affection = Math.min(100, (c1.affection || 50) + 15);
                    keys.forEach(k => { if (c1.stats?.[k] !== undefined) c1.stats[k] += 2; });
                }
            }
            if (data.comp2Id) {
                const c2 = findComp(data.comp2Id);
                if (c2) {
                    c2.affection = Math.min(100, (c2.affection || 50) + 15);
                    keys.forEach(k => { if (c2.stats?.[k] !== undefined) c2.stats[k] += 2; });
                }
            }
        } else if (action === 'base_event_snack') {
            if (data.comp1Id) {
                const c1 = findComp(data.comp1Id);
                if (c1) c1.affection = Math.min(100, (c1.affection || 50) + 20);
            }
            if (data.comp2Id) {
                const c2 = findComp(data.comp2Id);
                if (c2) c2.affection = Math.min(100, (c2.affection || 50) + 20);
            }
        } else if (action === 'base_event_scold_harsh') {
            if (data.comp1Id) {
                const c1 = findComp(data.comp1Id);
                if (c1) c1.affection = Math.max(-100, (c1.affection || 50) - 15);
            }
            if (data.comp2Id) {
                const c2 = findComp(data.comp2Id);
                if (c2) c2.affection = Math.max(-100, (c2.affection || 50) - 15);
            }
        } else if (action === 'base_event_reject_food') {
            if (data.comp1Id) {
                const c1 = findComp(data.comp1Id);
                if (c1) c1.affection = Math.max(-100, (c1.affection || 50) - 20);
            }
        } else if (action === 'base_event_side_harsh') {
            if (data.comp1Id) {
                const c1 = findComp(data.comp1Id);
                if (c1) c1.affection = Math.min(100, (c1.affection || 50) + 10);
            }
            if (data.comp2Id) {
                const c2 = findComp(data.comp2Id);
                if (c2) c2.affection = Math.max(-100, (c2.affection || 50) - 25);
            }
        } else if (action === 'base_event_noise_solve') {
            const cost = 100000;
            if (newChar.money >= cost) newChar.money -= cost;
            else newChar.money = 0;
            if (data.comp1Id) {
                const c1 = findComp(data.comp1Id);
                if (c1) c1.affection = Math.min(100, (c1.affection || 50) + 15);
            }
            if (data.comp2Id) {
                const c2 = findComp(data.comp2Id);
                if (c2) c2.affection = Math.min(100, (c2.affection || 50) + 15);
            }
        } else if (action === 'base_event_noise_punish') {
            if (data.comp1Id) {
                const c1 = findComp(data.comp1Id);
                if (c1) c1.affection = Math.max(-100, (c1.affection || 50) - 20);
            }
            if (data.comp2Id) {
                const c2 = findComp(data.comp2Id);
                if (c2) c2.affection = Math.max(-100, (c2.affection || 50) - 20);
            }
        } else if (action === 'base_event_repair') {
            if (newChar.base?.resources?.manaCrystal) {
                newChar.base.resources.manaCrystal = Math.max(0, newChar.base.resources.manaCrystal - 100);
            }
            if (data.comp1Id) {
                const c1 = findComp(data.comp1Id);
                if (c1) c1.affection = Math.min(100, (c1.affection || 50) + 10);
            }
            if (data.comp2Id) {
                const c2 = findComp(data.comp2Id);
                if (c2) c2.affection = Math.min(100, (c2.affection || 50) + 10);
            }
        } else if (action === 'base_event_fine') {
            newChar.money = (newChar.money || 0) + 500000;
            if (data.comp1Id) {
                const c1 = findComp(data.comp1Id);
                if (c1) c1.affection = Math.max(-100, (c1.affection || 50) - 15);
            }
            if (data.comp2Id) {
                const c2 = findComp(data.comp2Id);
                if (c2) c2.affection = Math.max(-100, (c2.affection || 50) - 15);
            }
        } else if (action === 'base_event_food_fill') {
            if (newChar.base?.resources?.food) {
                newChar.base.resources.food = Math.max(0, newChar.base.resources.food - 500);
            }
            if (data.comp1Id) {
                const c1 = findComp(data.comp1Id);
                if (c1) c1.affection = Math.min(100, (c1.affection || 50) + 15);
            }
            if (data.comp2Id) {
                const c2 = findComp(data.comp2Id);
                if (c2) c2.affection = Math.min(100, (c2.affection || 50) + 15);
            }
        } else if (action === 'base_event_starve') {
            if (data.comp1Id) {
                const c1 = findComp(data.comp1Id);
                if (c1) c1.affection = Math.max(-100, (c1.affection || 50) - 25);
            }
            if (data.comp2Id) {
                const c2 = findComp(data.comp2Id);
                if (c2) c2.affection = Math.max(-100, (c2.affection || 50) - 25);
            }
        } else if (action === 'base_event_taste') {
            if (data.comp1Id) {
                const c1 = findComp(data.comp1Id);
                if (c1) c1.affection = Math.min(100, (c1.affection || 50) + 25);
            }
        } else if (action === 'base_event_feast') {
            const allComps = [...newChar.companions, ...(newChar.inactiveCompanions || [])];
            allComps.forEach(c => {
                c.affection = Math.min(100, (c.affection || 50) + 15);
            });
        } else if (action === 'base_event_clean_kitchen' || action === 'base_event_divide_clean') {
            if (newChar.base?.houses) {
                newChar.base.houses.forEach(h => h.cleanliness = 100);
            }
            if (data.comp1Id) {
                const c1 = findComp(data.comp1Id);
                if (c1) c1.affection = Math.min(100, (c1.affection || 50) + 15);
            }
            if (data.comp2Id) {
                const c2 = findComp(data.comp2Id);
                if (c2) c2.affection = Math.min(100, (c2.affection || 50) + 15);
            }
        } else if (action === 'base_event_game') {
            if (data.comp1Id) {
                const c1 = findComp(data.comp1Id);
                if (c1) c1.affection = Math.min(100, (c1.affection || 50) + 20);
            }
            if (data.comp2Id) {
                const c2 = findComp(data.comp2Id);
                if (c2) c2.affection = Math.min(100, (c2.affection || 50) + 20);
            }
        }

        // 5) Breakup Events
        else if (action === 'breakup_beg') {
            if (data.companionId) {
                const c = findComp(data.companionId);
                if (c) {
                    c.affection = Math.min(100, (c.affection || 50) + 15);
                }
            }
        } else if (action === 'breakup_gift') {
            const cost = 10000000;
            if (newChar.money >= cost) newChar.money -= cost;
            else newChar.money = 0;

            if (data.companionId) {
                const c = findComp(data.companionId);
                if (c) {
                    c.affection = Math.min(100, (c.affection || 50) + 30);
                }
            }
        } else if (action === 'breakup_accept') {
            if (data.companionId) {
                const c = findComp(data.companionId);
                if (c) {
                    c.isLover = false;
                    c.isSpouse = false;
                    c.partnerId = undefined;
                    c.partnerName = undefined;
                    c.loverStartDate = undefined;
                    const cleanedChar = removeBondSkillsBetween(newChar, 'player', c.id);
                    Object.assign(newChar, cleanedChar);
                }
            }
        }
    } catch (e) {
        console.error("Error processing relationship choice action:", e);
    }

    return newChar;
};
