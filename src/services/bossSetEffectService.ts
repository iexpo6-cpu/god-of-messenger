import { Character, Companion, Enemy, Item, Stats } from '../types';

export interface ActiveSetInfo {
    name: string;
    count: number;
    description: string;
    isBoosted?: boolean;
    boostMultiplier?: number;
}

export interface BossSetEffectsResult {
    statBonus: Stats;
    finalStatMultiplier: number; // 최종 능력치 % 배율 (1.0 = 100%)
    pAtkPercent: number;         // 물리 공격력 +%
    mAtkPercent: number;         // 마법 공격력 +%
    pDefPercent: number;         // 물리 방어력 +%
    mDefPercent: number;         // 마법 방어력 +%
    critChanceBonus: number;     // 치명타율 +%
    critDmgBonus: number;        // 치명타 피해량 +%
    accuracyBonus: number;       // 명중률 +%
    evasionBonus: number;        // 회피율 +%
    statusResistBonus: number;   // 상태이상 저항 +%
    elementalAtkBonus: Record<string, number>; // 속성별 공격력 증폭 (+1.0 = +100%)
    elementalResBonus: Record<string, number>; // 속성별 저항 (+50 = +50)
    activeSets: ActiveSetInfo[];
}

interface SetTracker {
    id: string;
    name: string;
    count: number;
    boostMultipliers: number[];
}

/**
 * 캐릭터가 착용한 장비를 순회하여 보스 전리품 세트 효과 및 보스부스트 증폭을 계산합니다.
 */
export function calculateBossSetEffects(character: Character | Companion | Enemy): BossSetEffectsResult {
    const result: BossSetEffectsResult = {
        statBonus: { str: 0, int: 0, wis: 0, def: 0, agi: 0, ctrl: 0, hp: 0, maxHp: 0, mp: 0, maxMp: 0 },
        finalStatMultiplier: 1.0,
        pAtkPercent: 0,
        mAtkPercent: 0,
        pDefPercent: 0,
        mDefPercent: 0,
        critChanceBonus: 0,
        critDmgBonus: 0,
        accuracyBonus: 0,
        evasionBonus: 0,
        statusResistBonus: 0,
        elementalAtkBonus: {},
        elementalResBonus: {},
        activeSets: []
    };

    if (!('equipment' in character) || !character.equipment) {
        return result;
    }

    // 각 세트별 트래커
    const trackers: Record<string, SetTracker> = {
        absoluteGod: { id: 'absoluteGod', name: '절대 신', count: 0, boostMultipliers: [] },
        sunMessenger: { id: 'sunMessenger', name: '태양의 사자', count: 0, boostMultipliers: [] },
        fireMessenger: { id: 'fireMessenger', name: '화염의 사자', count: 0, boostMultipliers: [] },
        radiantMessenger: { id: 'radiantMessenger', name: '광휘의 사자', count: 0, boostMultipliers: [] },
        demonGod: { id: 'demonGod', name: '마신', count: 0, boostMultipliers: [] },
        lightningMessenger: { id: 'lightningMessenger', name: '전격의 사자', count: 0, boostMultipliers: [] },
        abyssMessenger: { id: 'abyssMessenger', name: '암연의 사자', count: 0, boostMultipliers: [] },
        moonlightMessenger: { id: 'moonlightMessenger', name: '월광의 사자', count: 0, boostMultipliers: [] },
        edenMessenger: { id: 'edenMessenger', name: '초화의 사자', count: 0, boostMultipliers: [] },
        steelMessenger: { id: 'steelMessenger', name: '강철의 사자', count: 0, boostMultipliers: [] },
        seaMessenger: { id: 'seaMessenger', name: '해수의 사자', count: 0, boostMultipliers: [] },
        iceMessenger: { id: 'iceMessenger', name: '빙결의 사자', count: 0, boostMultipliers: [] },
        muMessenger: { id: 'muMessenger', name: '무의 사자', count: 0, boostMultipliers: [] },
        galeMessenger: { id: 'galeMessenger', name: '질풍의 사자', count: 0, boostMultipliers: [] },
        earthMessenger: { id: 'earthMessenger', name: '지령의 사자', count: 0, boostMultipliers: [] },
        gen1: { id: 'gen1', name: '루나스의 철혈', count: 0, boostMultipliers: [] },
        gen2: { id: 'gen2', name: '루시엔의 광기', count: 0, boostMultipliers: [] },
        gen3: { id: 'gen3', name: '아포리아의 그림자 제왕', count: 0, boostMultipliers: [] },
        gen4: { id: 'gen4', name: '바르칼론의 종언룡', count: 0, boostMultipliers: [] },
        gen5: { id: 'gen5', name: '아자르의 천벌', count: 0, boostMultipliers: [] },
        gen6: { id: 'gen6', name: '카르니발의 학살', count: 0, boostMultipliers: [] },
        gen7: { id: 'gen7', name: '이그니스의 연옥', count: 0, boostMultipliers: [] },
        gen8: { id: 'gen8', name: '몰드릭의 사체', count: 0, boostMultipliers: [] },
        gen9: { id: 'gen9', name: '스콜라의 독화', count: 0, boostMultipliers: [] },
        gen10: { id: 'gen10', name: '카이로스의 종말 기수', count: 0, boostMultipliers: [] },
        gen11: { id: 'gen11', name: '제로의 공허', count: 0, boostMultipliers: [] }
    };

    const addSetItem = (key: string, item: Item) => {
        const tracker = trackers[key];
        if (!tracker) return;
        tracker.count++;
        if (item.bossBoost?.isBoosted && typeof item.bossBoost.multiplier === 'number') {
            tracker.boostMultipliers.push(item.bossBoost.multiplier);
        }
    };

    // 장착 장비 전수 검사
    Object.values(character.equipment).forEach((item: any) => {
        if (!item || !item.name) return;
        const name = String(item.name).trim();

        // 1. 절대 신 세트
        if (name.includes("엘라의") || name.includes("신의 원옥") || name.includes("신의 자애손") || name.includes("세계를 품은 목걸이")) {
            addSetItem('absoluteGod', item);
        }
        // 2. 태양의 사자 세트
        else if (
            name.includes("레드 블레이저") ||
            name.includes("태양의 보옥") ||
            name.includes("태양의 손") ||
            name.includes("LHM 모드") ||
            name.includes("태양의 날개") ||
            name.includes("태양의 잔재")
        ) {
            addSetItem('sunMessenger', item);
        }
        // 3. 화염의 사자 세트 (누락분 복구)
        else if (
            name.includes("이그니션 라피에르") ||
            name.includes("불타는 투구") ||
            name.includes("화염의 흉갑") ||
            name.includes("폭열의 건틀릿") ||
            name.includes("용암 보폭") ||
            name.includes("성화의 고리") ||
            name.includes("태우는 심장")
        ) {
            addSetItem('fireMessenger', item);
        }
        // 4. 광휘의 사자 세트
        else if (
            name.includes("샤이닝 엔젤") ||
            name.includes("엔젤 티아라") ||
            name.includes("엘리시안 로브") ||
            name.includes("빛의 세례 손길") ||
            name.includes("성역의 발걸음") ||
            name.includes("광휘의 눈물")
        ) {
            addSetItem('radiantMessenger', item);
        }
        // 5. 마신 세트
        else if (
            name.includes("마신의 검") ||
            name.includes("공허의 보주") ||
            name.includes("마신의 파멸관") ||
            name.includes("마신의 칠흑 갑주") ||
            name.includes("마신의 학살손") ||
            name.includes("마신의 반지") ||
            name.includes("마신의")
        ) {
            addSetItem('demonGod', item);
        }
        // 6. 전격의 사자 세트
        else if (
            name.includes("제우스 라이트닝") ||
            name.includes("썬더 라이트닝") ||
            name.includes("뇌신의 투구") ||
            name.includes("전격의 전갑") ||
            name.includes("벼락 깃든 장갑") ||
            name.includes("뇌속의 장화") ||
            name.includes("천둥의 징표")
        ) {
            addSetItem('lightningMessenger', item);
        }
        // 7. 암연의 사자 세트
        else if (
            name.includes("네오 다크") ||
            name.includes("블랙홀 코어") ||
            name.includes("사이버네틱 다크") ||
            name.includes("보이드 메카") ||
            name.includes("중력 제어 장갑") ||
            name.includes("어둠의 가속") ||
            name.includes("네오 다크 엔진")
        ) {
            addSetItem('abyssMessenger', item);
        }
        // 8. 월광의 사자 세트
        else if (
            name.includes("명월 쌍도") ||
            name.includes("침묵의 단도") ||
            name.includes("월광의 삿갓") ||
            name.includes("그림자 무사복") ||
            name.includes("월식의 토시") ||
            name.includes("무영의 버선") ||
            name.includes("만월의 펜던트")
        ) {
            addSetItem('moonlightMessenger', item);
        }
        // 9. 초화의 사자 세트
        else if (
            name.includes("에덴 크로스보우") ||
            name.includes("시드 오브 에덴") ||
            name.includes("에덴의 꽃관") ||
            name.includes("생명의 잎사귀") ||
            name.includes("덩굴 속박")
        ) {
            addSetItem('edenMessenger', item);
        }
        // 10. 강철의 사자 세트
        else if (
            name.includes("메탈 브레이커") ||
            name.includes("강철의 요새") ||
            name.includes("아이언 마스크") ||
            name.includes("절대 강철") ||
            name.includes("강철 파쇄")
        ) {
            addSetItem('steelMessenger', item);
        }
        // 11. 해수의 사자 세트
        else if (
            name.includes("테티스 엄브렐라") ||
            name.includes("심해의 소용돌이") ||
            name.includes("해신의 비늘 예복") ||
            name.includes("앱솔루트 아쿠아") ||
            name.includes("심해의 발자취")
        ) {
            addSetItem('seaMessenger', item);
        }
        // 12. 빙결의 사자 세트
        else if (
            name.includes("프리즈 크리스탈") ||
            name.includes("서리의 왕관") ||
            name.includes("만년설의 수의") ||
            name.includes("혹한의 얼음 손길") ||
            name.includes("빙하의 흔적") ||
            name.includes("절대영도의 핵")
        ) {
            addSetItem('iceMessenger', item);
        }
        // 13. 무의 사자 세트
        else if (
            name.includes("무형의 도") ||
            name.includes("자운풍 보주") ||
            name.includes("도사의 갓") ||
            name.includes("쾌의") ||
            name.includes("무극의 수대") ||
            name.includes("축지혜") ||
            name.includes("호패")
        ) {
            addSetItem('muMessenger', item);
        }
        // 14. 질풍의 사자 세트
        else if (
            name.includes("블랙 스톰") ||
            name.includes("질풍의 경갑") ||
            name.includes("폭풍의 토시") ||
            name.includes("허리케인 부츠") ||
            name.includes("질풍의 숨결")
        ) {
            addSetItem('galeMessenger', item);
        }
        // 15. 지령의 사자 세트
        else if (
            name.includes("그라운드 바스타드") ||
            name.includes("대지의 방패") ||
            name.includes("산맥의 투구") ||
            name.includes("대륙의 강갑") ||
            name.includes("지각 변동 장갑") ||
            name.includes("뿌리 깊은 장화") ||
            name.includes("가이아의 정수")
        ) {
            addSetItem('earthMessenger', item);
        }
        // 16. 제11 제너럴 제로 세트
        else if (
            name.includes("공허왕") ||
            name.includes("공허절단") ||
            name.includes("심연 보행자") ||
            name.includes("공허의 서") ||
            name.includes("공허의 손") ||
            name.includes("공허의 반지") ||
            name.includes("공허의 로브") ||
            name.includes("공허의 왕관") ||
            name.includes("제로의")
        ) {
            addSetItem('gen11', item);
        }
        // 17. 제2 제너럴 루시엔 세트
        else if (
            name.includes("광기의 목걸이") ||
            name.includes("광기") ||
            name.includes("파멸된 여왕") ||
            name.includes("정신 파열") ||
            name.includes("광휘 균열") ||
            name.includes("루시엔의")
        ) {
            addSetItem('gen2', item);
        }
        // 18. 제3 제너럴 아포리아 세트
        else if (
            name.includes("종언의 왕관") ||
            name.includes("종언의 갑옷") ||
            name.includes("절대 종언") ||
            name.includes("그림자 제왕") ||
            name.includes("마신황의 인장") ||
            name.includes("왕좌의 그림자") ||
            name.includes("아포리아의")
        ) {
            addSetItem('gen3', item);
        }
        // 19. 제4 제너럴 바르칼론 세트
        else if (
            name.includes("종언룡") ||
            name.includes("흑룡의 창") ||
            name.includes("용인의 심장") ||
            name.includes("용혈 장화") ||
            name.includes("바르칼론의")
        ) {
            addSetItem('gen4', item);
        }
        // 20. 제5 제너럴 아자르 세트
        else if (
            name.includes("타락천벌") ||
            name.includes("심판자의 갑의") ||
            name.includes("파괴된 후광") ||
            name.includes("타락천사") ||
            name.includes("천벌의 강림") ||
            name.includes("아자르의")
        ) {
            addSetItem('gen5', item);
        }
        // 21. 제6 제너럴 카르니발 세트
        else if (
            name.includes("학살자") ||
            name.includes("도살자") ||
            name.includes("학살 가면") ||
            name.includes("피의 맹약") ||
            name.includes("피바람") ||
            name.includes("카르니발의")
        ) {
            addSetItem('gen6', item);
        }
        // 22. 제7 제너럴 이그니스 세트
        else if (
            name.includes("영겁연옥") ||
            name.includes("연옥의") ||
            name.includes("이그니스의")
        ) {
            addSetItem('gen7', item);
        }
        // 23. 제8 제너럴 몰드릭 세트
        else if (
            name.includes("망자의") ||
            name.includes("망령의") ||
            name.includes("망령왕") ||
            name.includes("몰드릭의") ||
            name.includes("사체")
        ) {
            addSetItem('gen8', item);
        }
        // 24. 제9 제너럴 스콜라 세트
        else if (
            name.includes("절멸 독침") ||
            name.includes("독화여왕") ||
            name.includes("독 여왕") ||
            name.includes("스콜라의")
        ) {
            addSetItem('gen9', item);
        }
        // 25. 제10 제너럴 카이로스 세트
        else if (
            name.includes("시간 단죄") ||
            name.includes("종말 기수") ||
            name.includes("카이로스의")
        ) {
            addSetItem('gen10', item);
        }
        // 26. 제1 제너럴 루나스 세트
        else if (
            name.includes("혈월왕") ||
            name.includes("철혈왕") ||
            name.includes("붉은 달의 늑대") ||
            name.includes("루나스의")
        ) {
            addSetItem('gen1', item);
        }
    });

    // 보스부스트 배율 산출 헬퍼:
    // 장착된 세트 장비 중 부스트된 장비의 평균 배율을 계산합니다 (부스트가 없으면 1.0)
    const getBoostMultiplier = (tracker: SetTracker): number => {
        if (!tracker.boostMultipliers || tracker.boostMultipliers.length === 0) return 1.0;
        const sum = tracker.boostMultipliers.reduce((acc, v) => acc + v, 0);
        const avg = sum / tracker.boostMultipliers.length;
        return Math.round(avg * 100) / 100;
    };

    const applyStatBonus = (stats: Partial<Stats>, mult: number) => {
        Object.entries(stats).forEach(([k, val]) => {
            if (typeof val === 'number') {
                const scaled = Math.round(val * mult);
                (result.statBonus as any)[k] = ((result.statBonus as any)[k] || 0) + scaled;
            }
        });
    };

    const addActiveSet = (
        name: string,
        count: number,
        desc: string,
        mult: number
    ) => {
        const isBoosted = mult > 1.0;
        const multText = isBoosted ? ` [부스트 ${mult.toFixed(mult % 1 === 0 ? 1 : 2)}배]` : '';
        result.activeSets.push({
            name: `${name}${multText}`,
            count,
            description: desc,
            isBoosted,
            boostMultiplier: mult
        });
    };

    // ==========================================
    // 1. 절대 신 세트
    // ==========================================
    const tAbs = trackers.absoluteGod;
    const mAbs = getBoostMultiplier(tAbs);
    if (tAbs.count >= 2) {
        const bonus = Math.round(500 * mAbs);
        applyStatBonus({ str: 500, int: 500, wis: 500, def: 500, agi: 500, ctrl: 500 }, mAbs);
        result.elementalResBonus['모든속성'] = (result.elementalResBonus['모든속성'] || 0) + Math.round(50 * mAbs);
        addActiveSet(
            '절대 신 세트 (2세트)',
            tAbs.count,
            `모든 능력치 +${bonus}, 모든 속성 저항 +${Math.round(50 * mAbs)}${mAbs > 1 ? ` (보스부스트 ${mAbs.toFixed(2)}배 적용)` : ''}`,
            mAbs
        );
    }
    if (tAbs.count >= 4) {
        const bonus = Math.round(2000 * mAbs);
        applyStatBonus({ str: 2000, int: 2000, wis: 2000, def: 2000, agi: 2000, ctrl: 2000 }, mAbs);
        result.elementalAtkBonus['모든속성'] = (result.elementalAtkBonus['모든속성'] || 0) + (1.0 * mAbs);
        result.pAtkPercent += Math.round(50 * mAbs);
        result.pDefPercent += Math.round(50 * mAbs);
        result.mAtkPercent += Math.round(50 * mAbs);
        result.mDefPercent += Math.round(50 * mAbs);
        addActiveSet(
            '절대 신 세트 (4세트)',
            tAbs.count,
            `모든 능력치 +${bonus}, 모든 속성 피해 +${Math.round(100 * mAbs)}%, 최종 공격력 및 방어력 +${Math.round(50 * mAbs)}%${mAbs > 1 ? ` (보스부스트 ${mAbs.toFixed(2)}배 적용)` : ''}`,
            mAbs
        );
    }

    // ==========================================
    // 2. 태양의 사자 세트
    // ==========================================
    const tSun = trackers.sunMessenger;
    const mSun = getBoostMultiplier(tSun);
    if (tSun.count >= 2) {
        const bonus = Math.round(500 * mSun);
        applyStatBonus({ str: 500, agi: 500 }, mSun);
        result.pAtkPercent += Math.round(20 * mSun);
        addActiveSet(
            '태양의 사자 세트 (2세트)',
            tSun.count,
            `힘 +${bonus}, 민첩 +${bonus}, 물리 공격력 +${Math.round(20 * mSun)}%${mSun > 1 ? ` (보스부스트 ${mSun.toFixed(2)}배 적용)` : ''}`,
            mSun
        );
    }
    if (tSun.count >= 4) {
        const bonus = Math.round(1500 * mSun);
        applyStatBonus({ str: 1500, agi: 1500 }, mSun);
        result.pAtkPercent += Math.round(100 * mSun);
        result.elementalAtkBonus['태양계'] = (result.elementalAtkBonus['태양계'] || 0) + (1.0 * mSun);
        addActiveSet(
            '태양의 사자 세트 (4세트)',
            tSun.count,
            `힘 +${bonus}, 민첩 +${bonus}, 물리 공격력 +${Math.round(100 * mSun)}%, 태양계 속성 피해 +${Math.round(100 * mSun)}%${mSun > 1 ? ` (보스부스트 ${mSun.toFixed(2)}배 적용)` : ''}`,
            mSun
        );
    }
    if (tSun.count >= 6) {
        const bonus = Math.round(3000 * mSun);
        applyStatBonus({ str: 3000, agi: 3000, ctrl: 2000, maxHp: 50000 }, mSun);
        result.pAtkPercent += Math.round(50 * mSun);
        result.critDmgBonus += Math.round(50 * mSun);
        addActiveSet(
            '태양의 사자 세트 (6세트)',
            tSun.count,
            `힘/민첩 +${bonus}, 제어 +${Math.round(2000 * mSun)}, 최대 체력 +${Math.round(50000 * mSun)}, 치명타 피해 +${Math.round(50 * mSun)}%${mSun > 1 ? ` (보스부스트 ${mSun.toFixed(2)}배 적용)` : ''}`,
            mSun
        );
    }

    // ==========================================
    // 3. 화염의 사자 세트 (신규 완벽 구현)
    // ==========================================
    const tFire = trackers.fireMessenger;
    const mFire = getBoostMultiplier(tFire);
    if (tFire.count >= 2) {
        const bonus = Math.round(500 * mFire);
        applyStatBonus({ str: 500, agi: 500 }, mFire);
        result.elementalAtkBonus['화염계'] = (result.elementalAtkBonus['화염계'] || 0) + (0.2 * mFire);
        addActiveSet(
            '화염의 사자 세트 (2세트)',
            tFire.count,
            `힘 +${bonus}, 민첩 +${bonus}, 화염계 속성 피해 +${Math.round(20 * mFire)}%${mFire > 1 ? ` (보스부스트 ${mFire.toFixed(2)}배 적용)` : ''}`,
            mFire
        );
    }
    if (tFire.count >= 4) {
        const bonus = Math.round(1500 * mFire);
        applyStatBonus({ str: 1500, agi: 1500 }, mFire);
        result.pAtkPercent += Math.round(60 * mFire);
        result.elementalAtkBonus['화염계'] = (result.elementalAtkBonus['화염계'] || 0) + (1.0 * mFire);
        addActiveSet(
            '화염의 사자 세트 (4세트)',
            tFire.count,
            `힘 +${bonus}, 민첩 +${bonus}, 물리 공격력 +${Math.round(60 * mFire)}%, 화염계 속성 피해 +${Math.round(100 * mFire)}%${mFire > 1 ? ` (보스부스트 ${mFire.toFixed(2)}배 적용)` : ''}`,
            mFire
        );
    }
    if (tFire.count >= 6) {
        const bonus = Math.round(3500 * mFire);
        applyStatBonus({ str: 3500, int: 3500, wis: 3500, def: 3500, agi: 3500, ctrl: 3500 }, mFire);
        result.critDmgBonus += Math.round(50 * mFire);
        result.finalStatMultiplier *= (1 + 0.30 * mFire);
        addActiveSet(
            '화염의 사자 세트 (6세트)',
            tFire.count,
            `모든 능력치 +${bonus}, 최종 능력치 +${Math.round(30 * mFire)}%, 치명타 피해량 +${Math.round(50 * mFire)}%${mFire > 1 ? ` (보스부스트 ${mFire.toFixed(2)}배 적용)` : ''}`,
            mFire
        );
    }

    // ==========================================
    // 4. 광휘의 사자 세트
    // ==========================================
    const tRad = trackers.radiantMessenger;
    const mRad = getBoostMultiplier(tRad);
    if (tRad.count >= 3) {
        const bonus = Math.round(500 * mRad);
        applyStatBonus({ int: 500, wis: 500 }, mRad);
        result.mAtkPercent += Math.round(25 * mRad);
        addActiveSet(
            '광휘의 사자 세트 (3세트)',
            tRad.count,
            `지능 +${bonus}, 지혜 +${bonus}, 마법 공격력 +${Math.round(25 * mRad)}%${mRad > 1 ? ` (보스부스트 ${mRad.toFixed(2)}배 적용)` : ''}`,
            mRad
        );
    }
    if (tRad.count >= 5) {
        const bonus = Math.round(1500 * mRad);
        applyStatBonus({ int: 1500, wis: 1500 }, mRad);
        result.mAtkPercent += Math.round(100 * mRad);
        result.elementalAtkBonus['광휘계'] = (result.elementalAtkBonus['광휘계'] || 0) + (1.0 * mRad);
        addActiveSet(
            '광휘의 사자 세트 (5세트)',
            tRad.count,
            `지능 +${bonus}, 지혜 +${bonus}, 마법 공격력 +${Math.round(100 * mRad)}%, 광휘계 속성 피해 +${Math.round(100 * mRad)}%${mRad > 1 ? ` (보스부스트 ${mRad.toFixed(2)}배 적용)` : ''}`,
            mRad
        );
    }
    if (tRad.count >= 7) {
        const bonus = Math.round(3500 * mRad);
        applyStatBonus({ str: 3500, int: 3500, wis: 3500, def: 3500, agi: 3500, ctrl: 3500 }, mRad);
        result.elementalResBonus['모든속성'] = (result.elementalResBonus['모든속성'] || 0) + Math.round(100 * mRad);
        result.critDmgBonus += Math.round(50 * mRad);
        addActiveSet(
            '광휘의 사자 세트 (7세트)',
            tRad.count,
            `모든 능력치 +${bonus}, 모든 속성 저항 +${Math.round(100 * mRad)}, 치명타 피해량 +${Math.round(50 * mRad)}%${mRad > 1 ? ` (보스부스트 ${mRad.toFixed(2)}배 적용)` : ''}`,
            mRad
        );
    }

    // ==========================================
    // 5. 마신 세트
    // ==========================================
    const tDem = trackers.demonGod;
    const mDem = getBoostMultiplier(tDem);
    if (tDem.count >= 2) {
        const bonus = Math.round(500 * mDem);
        applyStatBonus({ str: 500, int: 500, ctrl: 500 }, mDem);
        result.critChanceBonus += Math.round(15 * mDem);
        addActiveSet(
            '마신 세트 (2세트)',
            tDem.count,
            `힘 +${bonus}, 지력 +${bonus}, 제어 +${bonus}, 치명타율 +${Math.round(15 * mDem)}%${mDem > 1 ? ` (보스부스트 ${mDem.toFixed(2)}배 적용)` : ''}`,
            mDem
        );
    }
    if (tDem.count >= 4) {
        const bonus = Math.round(1500 * mDem);
        applyStatBonus({ str: 1500, int: 1500, ctrl: 1500 }, mDem);
        result.elementalAtkBonus['암흑계'] = (result.elementalAtkBonus['암흑계'] || 0) + (1.0 * mDem);
        result.finalStatMultiplier *= (1 + 0.10 * mDem);
        addActiveSet(
            '마신 세트 (4세트)',
            tDem.count,
            `힘 +${bonus}, 지력 +${bonus}, 제어 +${bonus}, 암흑계 속성 피해 +${Math.round(100 * mDem)}%, 최종 능력치 +${Math.round(10 * mDem)}%${mDem > 1 ? ` (보스부스트 ${mDem.toFixed(2)}배 적용)` : ''}`,
            mDem
        );
    }
    if (tDem.count >= 6) {
        const bonus = Math.round(4000 * mDem);
        applyStatBonus({ str: 4000, int: 4000, wis: 4000, def: 4000, agi: 4000, ctrl: 4000 }, mDem);
        result.finalStatMultiplier *= (1 + 0.40 * mDem);
        result.critDmgBonus += Math.round(100 * mDem);
        addActiveSet(
            '마신 세트 (6세트)',
            tDem.count,
            `모든 능력치 +${bonus}, 최종 능력치 +${Math.round(40 * mDem)}%, 치명타 피해량 +${Math.round(100 * mDem)}%${mDem > 1 ? ` (보스부스트 ${mDem.toFixed(2)}배 적용)` : ''}`,
            mDem
        );
    }

    // ==========================================
    // 6. 마계 제너럴 11인 세트
    // ==========================================
    // 제1 제너럴 루나스 세트 (철혈)
    const tG1 = trackers.gen1;
    const mG1 = getBoostMultiplier(tG1);
    if (tG1.count >= 2) {
        const bonus = Math.round(500 * mG1);
        applyStatBonus({ str: 500, agi: 500 }, mG1);
        result.pAtkPercent += Math.round(20 * mG1);
        addActiveSet('루나스의 철혈 세트 (2세트)', tG1.count, `힘 +${bonus}, 민첩 +${bonus}, 물리 공격력 +${Math.round(20 * mG1)}%${mG1 > 1 ? ` (보스부스트 ${mG1.toFixed(2)}배 적용)` : ''}`, mG1);
    }
    if (tG1.count >= 4) {
        const bonus = Math.round(2000 * mG1);
        applyStatBonus({ str: 2000, agi: 2000 }, mG1);
        result.pAtkPercent += Math.round(100 * mG1);
        result.finalStatMultiplier *= (1 + 0.15 * mG1);
        addActiveSet('루나스의 철혈 세트 (4세트)', tG1.count, `힘 +${bonus}, 민첩 +${bonus}, 물리 공격력 +${Math.round(100 * mG1)}%, 최종 능력치 +${Math.round(15 * mG1)}%${mG1 > 1 ? ` (보스부스트 ${mG1.toFixed(2)}배 적용)` : ''}`, mG1);
    }

    // 제2 제너럴 루시엔 세트 (광기)
    const tG2 = trackers.gen2;
    const mG2 = getBoostMultiplier(tG2);
    if (tG2.count >= 2) {
        const bonus = Math.round(500 * mG2);
        applyStatBonus({ int: 500, wis: 500 }, mG2);
        result.mAtkPercent += Math.round(30 * mG2);
        addActiveSet('루시엔의 광기 세트 (2세트)', tG2.count, `지능 +${bonus}, 지혜 +${bonus}, 마법 공격력 +${Math.round(30 * mG2)}%${mG2 > 1 ? ` (보스부스트 ${mG2.toFixed(2)}배 적용)` : ''}`, mG2);
    }
    if (tG2.count >= 4) {
        const bonus = Math.round(2000 * mG2);
        applyStatBonus({ int: 2000, wis: 2000 }, mG2);
        result.elementalAtkBonus['암흑계'] = (result.elementalAtkBonus['암흑계'] || 0) + (1.0 * mG2);
        result.finalStatMultiplier *= (1 + 0.25 * mG2);
        addActiveSet('루시엔의 광기 세트 (4세트)', tG2.count, `지능 +${bonus}, 지혜 +${bonus}, 암흑계 속성 피해 +${Math.round(100 * mG2)}%, 최종 능력치 +${Math.round(25 * mG2)}%${mG2 > 1 ? ` (보스부스트 ${mG2.toFixed(2)}배 적용)` : ''}`, mG2);
    }

    // 제3 제너럴 아포리아 세트 (그림자 제왕)
    const tG3 = trackers.gen3;
    const mG3 = getBoostMultiplier(tG3);
    if (tG3.count >= 2) {
        const bonus = Math.round(500 * mG3);
        applyStatBonus({ str: 500, agi: 500, ctrl: 500 }, mG3);
        addActiveSet('아포리아의 그림자 제왕 세트 (2세트)', tG3.count, `힘 +${bonus}, 민첩 +${bonus}, 제어 +${bonus}${mG3 > 1 ? ` (보스부스트 ${mG3.toFixed(2)}배 적용)` : ''}`, mG3);
    }
    if (tG3.count >= 4) {
        const bonus = Math.round(2000 * mG3);
        applyStatBonus({ str: 2000, agi: 2000, ctrl: 2000 }, mG3);
        result.pAtkPercent += Math.round(50 * mG3);
        result.finalStatMultiplier *= (1 + 0.30 * mG3);
        addActiveSet('아포리아의 그림자 제왕 세트 (4세트)', tG3.count, `힘 +${bonus}, 민첩 +${bonus}, 제어 +${bonus}, 물리 공격력 +${Math.round(50 * mG3)}%, 최종 능력치 +${Math.round(30 * mG3)}%${mG3 > 1 ? ` (보스부스트 ${mG3.toFixed(2)}배 적용)` : ''}`, mG3);
    }

    // 제4 제너럴 바르칼론 세트 (종언룡)
    const tG4 = trackers.gen4;
    const mG4 = getBoostMultiplier(tG4);
    if (tG4.count >= 2) {
        const bonus = Math.round(500 * mG4);
        applyStatBonus({ str: 500, def: 500 }, mG4);
        result.pDefPercent += Math.round(30 * mG4);
        addActiveSet('바르칼론의 종언룡 세트 (2세트)', tG4.count, `힘 +${bonus}, 방어 +${bonus}, 물리 방어력 +${Math.round(30 * mG4)}%${mG4 > 1 ? ` (보스부스트 ${mG4.toFixed(2)}배 적용)` : ''}`, mG4);
    }
    if (tG4.count >= 4) {
        const bonus = Math.round(2000 * mG4);
        applyStatBonus({ str: 2000, def: 2000 }, mG4);
        result.pDefPercent += Math.round(80 * mG4);
        result.mDefPercent += Math.round(80 * mG4);
        result.statBonus.maxHp += Math.round(50000 * mG4);
        addActiveSet('바르칼론의 종언룡 세트 (4세트)', tG4.count, `힘 +${bonus}, 방어 +${bonus}, 물리 및 마법 방어력 +${Math.round(80 * mG4)}%, 최대 체력 +${Math.round(50000 * mG4)}${mG4 > 1 ? ` (보스부스트 ${mG4.toFixed(2)}배 적용)` : ''}`, mG4);
    }

    // 제5 제너럴 아자르 세트 (천벌)
    const tG5 = trackers.gen5;
    const mG5 = getBoostMultiplier(tG5);
    if (tG5.count >= 2) {
        const bonus = Math.round(500 * mG5);
        applyStatBonus({ str: 500, int: 500 }, mG5);
        result.pAtkPercent += Math.round(20 * mG5);
        result.mAtkPercent += Math.round(20 * mG5);
        addActiveSet('아자르의 천벌 세트 (2세트)', tG5.count, `힘 +${bonus}, 지능 +${bonus}, 최종 공격력 +${Math.round(20 * mG5)}%${mG5 > 1 ? ` (보스부스트 ${mG5.toFixed(2)}배 적용)` : ''}`, mG5);
    }
    if (tG5.count >= 4) {
        const bonus = Math.round(2000 * mG5);
        applyStatBonus({ str: 2000, int: 2000 }, mG5);
        result.pAtkPercent += Math.round(60 * mG5);
        result.mAtkPercent += Math.round(60 * mG5);
        result.elementalAtkBonus['광휘계'] = (result.elementalAtkBonus['광휘계'] || 0) + (1.0 * mG5);
        addActiveSet('아자르의 천벌 세트 (4세트)', tG5.count, `힘 +${bonus}, 지능 +${bonus}, 최종 공격력 +${Math.round(60 * mG5)}%, 광휘계 속성 피해 +${Math.round(100 * mG5)}%${mG5 > 1 ? ` (보스부스트 ${mG5.toFixed(2)}배 적용)` : ''}`, mG5);
    }

    // 제6 제너럴 카르니발 세트 (학살)
    const tG6 = trackers.gen6;
    const mG6 = getBoostMultiplier(tG6);
    if (tG6.count >= 2) {
        const bonus = Math.round(500 * mG6);
        applyStatBonus({ str: 500, agi: 500 }, mG6);
        result.critChanceBonus += Math.round(15 * mG6);
        addActiveSet('카르니발의 학살 세트 (2세트)', tG6.count, `힘 +${bonus}, 민첩 +${bonus}, 치명타율 +${Math.round(15 * mG6)}%${mG6 > 1 ? ` (보스부스트 ${mG6.toFixed(2)}배 적용)` : ''}`, mG6);
    }
    if (tG6.count >= 4) {
        const bonus = Math.round(2000 * mG6);
        applyStatBonus({ str: 2000, agi: 2000 }, mG6);
        result.critChanceBonus += Math.round(30 * mG6);
        result.pAtkPercent += Math.round(50 * mG6);
        addActiveSet('카르니발의 학살 세트 (4세트)', tG6.count, `힘 +${bonus}, 민첩 +${bonus}, 치명타율 +${Math.round(30 * mG6)}%, 물리 공격력 +${Math.round(50 * mG6)}%${mG6 > 1 ? ` (보스부스트 ${mG6.toFixed(2)}배 적용)` : ''}`, mG6);
    }

    // 제7 제너럴 이그니스 세트 (연옥)
    const tG7 = trackers.gen7;
    const mG7 = getBoostMultiplier(tG7);
    if (tG7.count >= 2) {
        const bonus = Math.round(500 * mG7);
        applyStatBonus({ int: 500, agi: 500 }, mG7);
        result.elementalAtkBonus['화염계'] = (result.elementalAtkBonus['화염계'] || 0) + (0.4 * mG7);
        addActiveSet('이그니스의 연옥 세트 (2세트)', tG7.count, `지능 +${bonus}, 민첩 +${bonus}, 화염계 속성 피해 +${Math.round(40 * mG7)}%${mG7 > 1 ? ` (보스부스트 ${mG7.toFixed(2)}배 적용)` : ''}`, mG7);
    }
    if (tG7.count >= 4) {
        const bonus = Math.round(2000 * mG7);
        applyStatBonus({ int: 2000, agi: 2000 }, mG7);
        result.elementalAtkBonus['화염계'] = (result.elementalAtkBonus['화염계'] || 0) + (1.2 * mG7);
        result.mAtkPercent += Math.round(50 * mG7);
        addActiveSet('이그니스의 연옥 세트 (4세트)', tG7.count, `지능 +${bonus}, 민첩 +${bonus}, 화염계 속성 피해 +${Math.round(120 * mG7)}%, 마법 공격력 +${Math.round(50 * mG7)}%${mG7 > 1 ? ` (보스부스트 ${mG7.toFixed(2)}배 적용)` : ''}`, mG7);
    }

    // 제8 제너럴 몰드릭 세트 (사체)
    const tG8 = trackers.gen8;
    const mG8 = getBoostMultiplier(tG8);
    if (tG8.count >= 2) {
        const bonus = Math.round(500 * mG8);
        applyStatBonus({ wis: 500, ctrl: 500 }, mG8);
        result.mDefPercent += Math.round(30 * mG8);
        addActiveSet('몰드릭의 사체 세트 (2세트)', tG8.count, `지혜 +${bonus}, 제어 +${bonus}, 마법 방어력 +${Math.round(30 * mG8)}%${mG8 > 1 ? ` (보스부스트 ${mG8.toFixed(2)}배 적용)` : ''}`, mG8);
    }
    if (tG8.count >= 4) {
        const bonus = Math.round(2000 * mG8);
        applyStatBonus({ wis: 2000, ctrl: 2000 }, mG8);
        result.mDefPercent += Math.round(80 * mG8);
        result.statusResistBonus += Math.round(50 * mG8);
        addActiveSet('몰드릭의 사체 세트 (4세트)', tG8.count, `지혜 +${bonus}, 제어 +${bonus}, 마법 방어력 +${Math.round(80 * mG8)}%, 상태이상 저항 +${Math.round(50 * mG8)}%${mG8 > 1 ? ` (보스부스트 ${mG8.toFixed(2)}배 적용)` : ''}`, mG8);
    }

    // 제9 제너럴 스콜라 세트 (독화)
    const tG9 = trackers.gen9;
    const mG9 = getBoostMultiplier(tG9);
    if (tG9.count >= 2) {
        const bonus = Math.round(500 * mG9);
        applyStatBonus({ int: 500, agi: 500 }, mG9);
        result.elementalAtkBonus['암흑계'] = (result.elementalAtkBonus['암흑계'] || 0) + (0.4 * mG9);
        addActiveSet('스콜라의 독화 세트 (2세트)', tG9.count, `지능 +${bonus}, 민첩 +${bonus}, 암흑계 속성 피해 +${Math.round(40 * mG9)}%${mG9 > 1 ? ` (보스부스트 ${mG9.toFixed(2)}배 적용)` : ''}`, mG9);
    }
    if (tG9.count >= 4) {
        const bonus = Math.round(2000 * mG9);
        applyStatBonus({ int: 2000, agi: 2000, maxHp: 50000 }, mG9);
        result.elementalAtkBonus['암흑계'] = (result.elementalAtkBonus['암흑계'] || 0) + (1.2 * mG9);
        addActiveSet('스콜라의 독화 세트 (4세트)', tG9.count, `지능 +${bonus}, 민첩 +${bonus}, 암흑계 속성 피해 +${Math.round(120 * mG9)}%, 최대 체력 +${Math.round(50000 * mG9)}${mG9 > 1 ? ` (보스부스트 ${mG9.toFixed(2)}배 적용)` : ''}`, mG9);
    }

    // 제10 제너럴 카이로스 세트 (종말 기수)
    const tG10 = trackers.gen10;
    const mG10 = getBoostMultiplier(tG10);
    if (tG10.count >= 2) {
        const bonus = Math.round(500 * mG10);
        applyStatBonus({ agi: 500, ctrl: 500 }, mG10);
        result.accuracyBonus += Math.round(15 * mG10);
        addActiveSet('카이로스의 종말 기수 세트 (2세트)', tG10.count, `민첩 +${bonus}, 제어 +${bonus}, 명중률 +${Math.round(15 * mG10)}%${mG10 > 1 ? ` (보스부스트 ${mG10.toFixed(2)}배 적용)` : ''}`, mG10);
    }
    if (tG10.count >= 4) {
        const bonus = Math.round(2000 * mG10);
        applyStatBonus({ agi: 2000, ctrl: 2000 }, mG10);
        result.accuracyBonus += Math.round(40 * mG10);
        result.evasionBonus += Math.round(20 * mG10);
        addActiveSet('카이로스의 종말 기수 세트 (4세트)', tG10.count, `민첩 +${bonus}, 제어 +${bonus}, 명중률 +${Math.round(40 * mG10)}%, 회피율 +${Math.round(20 * mG10)}%${mG10 > 1 ? ` (보스부스트 ${mG10.toFixed(2)}배 적용)` : ''}`, mG10);
    }

    // 제11 제너럴 제로 세트 (공허)
    const tG11 = trackers.gen11;
    const mG11 = getBoostMultiplier(tG11);
    if (tG11.count >= 2) {
        const bonus = Math.round(1000 * mG11);
        applyStatBonus({ str: 1000, int: 1000, wis: 500, def: 500, agi: 500, ctrl: 500 }, mG11);
        addActiveSet('제로의 공허 세트 (2세트)', tG11.count, `힘 +${bonus}, 지능 +${bonus}, 모든 능력치 +${Math.round(500 * mG11)}${mG11 > 1 ? ` (보스부스트 ${mG11.toFixed(2)}배 적용)` : ''}`, mG11);
    }
    if (tG11.count >= 4) {
        const bonus = Math.round(2000 * mG11);
        applyStatBonus({ str: 2000, int: 2000, ctrl: 1500 }, mG11);
        result.statusResistBonus += Math.round(50 * mG11);
        addActiveSet('제로의 공허 세트 (4세트)', tG11.count, `힘 +${bonus}, 지능 +${bonus}, 제어 +${Math.round(1500 * mG11)}, 상태이상 저항 +${Math.round(50 * mG11)}%${mG11 > 1 ? ` (보스부스트 ${mG11.toFixed(2)}배 적용)` : ''}`, mG11);
    }
    if (tG11.count >= 6) {
        const bonus = Math.round(4000 * mG11);
        applyStatBonus({ str: 4000, int: 4000, wis: 4000, def: 4000, agi: 4000, ctrl: 4000 }, mG11);
        result.finalStatMultiplier *= (1 + 0.30 * mG11);
        addActiveSet('제로의 공허 세트 (6세트)', tG11.count, `모든 능력치 +${bonus}, 최종 능력치 +${Math.round(30 * mG11)}%${mG11 > 1 ? ` (보스부스트 ${mG11.toFixed(2)}배 적용)` : ''}`, mG11);
    }

    // ==========================================
    // 7. 기타 신의 사자 세트 (전격, 암연, 월광, 초화, 강철, 해수, 빙결, 무, 질풍, 지령)
    // ==========================================
    // 전격의 사자
    const tLight = trackers.lightningMessenger;
    const mLight = getBoostMultiplier(tLight);
    if (tLight.count >= 2) {
        const bonus = Math.round(500 * mLight);
        applyStatBonus({ agi: 500, ctrl: 500 }, mLight);
        result.pAtkPercent += Math.round(20 * mLight);
        addActiveSet('전격의 사자 세트 (2세트)', tLight.count, `민첩 +${bonus}, 제어 +${bonus}, 물리 공격력 +${Math.round(20 * mLight)}%${mLight > 1 ? ` (보스부스트 ${mLight.toFixed(2)}배 적용)` : ''}`, mLight);
    }
    if (tLight.count >= 4) {
        const bonus = Math.round(1500 * mLight);
        applyStatBonus({ agi: 1500, ctrl: 1500 }, mLight);
        result.pAtkPercent += Math.round(100 * mLight);
        result.elementalAtkBonus['전격계'] = (result.elementalAtkBonus['전격계'] || 0) + (1.0 * mLight);
        addActiveSet('전격의 사자 세트 (4세트)', tLight.count, `민첩 +${bonus}, 제어 +${bonus}, 물리 공격력 +${Math.round(100 * mLight)}%, 전격계 속성 피해 +${Math.round(100 * mLight)}%${mLight > 1 ? ` (보스부스트 ${mLight.toFixed(2)}배 적용)` : ''}`, mLight);
    }

    // 암연의 사자
    const tAby = trackers.abyssMessenger;
    const mAby = getBoostMultiplier(tAby);
    if (tAby.count >= 2) {
        const bonus = Math.round(500 * mAby);
        applyStatBonus({ int: 500, ctrl: 500 }, mAby);
        result.mAtkPercent += Math.round(20 * mAby);
        addActiveSet('암연의 사자 세트 (2세트)', tAby.count, `지력 +${bonus}, 제어 +${bonus}, 마법 공격력 +${Math.round(20 * mAby)}%${mAby > 1 ? ` (보스부스트 ${mAby.toFixed(2)}배 적용)` : ''}`, mAby);
    }
    if (tAby.count >= 4) {
        const bonus = Math.round(1500 * mAby);
        applyStatBonus({ int: 1500, ctrl: 1500 }, mAby);
        result.mAtkPercent += Math.round(100 * mAby);
        result.elementalAtkBonus['암흑계'] = (result.elementalAtkBonus['암흑계'] || 0) + (1.0 * mAby);
        addActiveSet('암연의 사자 세트 (4세트)', tAby.count, `지력 +${bonus}, 제어 +${bonus}, 마법 공격력 +${Math.round(100 * mAby)}%, 암흑계 속성 피해 +${Math.round(100 * mAby)}%${mAby > 1 ? ` (보스부스트 ${mAby.toFixed(2)}배 적용)` : ''}`, mAby);
    }

    // 월광의 사자
    const tMoon = trackers.moonlightMessenger;
    const mMoon = getBoostMultiplier(tMoon);
    if (tMoon.count >= 2) {
        const bonus = Math.round(500 * mMoon);
        applyStatBonus({ str: 500, agi: 500, ctrl: 500 }, mMoon);
        addActiveSet('월광의 사자 세트 (2세트)', tMoon.count, `힘 +${bonus}, 민첩 +${bonus}, 제어 +${bonus}${mMoon > 1 ? ` (보스부스트 ${mMoon.toFixed(2)}배 적용)` : ''}`, mMoon);
    }
    if (tMoon.count >= 4) {
        const bonus = Math.round(1500 * mMoon);
        applyStatBonus({ str: 1500, agi: 1500, ctrl: 1500 }, mMoon);
        result.pAtkPercent += Math.round(50 * mMoon);
        result.mAtkPercent += Math.round(50 * mMoon);
        result.elementalAtkBonus['월광계'] = (result.elementalAtkBonus['월광계'] || 0) + (1.0 * mMoon);
        addActiveSet('월광의 사자 세트 (4세트)', tMoon.count, `힘 +${bonus}, 민첩 +${bonus}, 제어 +${bonus}, 물리 및 마법 공격력 +${Math.round(50 * mMoon)}%, 월광계 속성 피해 +${Math.round(100 * mMoon)}%${mMoon > 1 ? ` (보스부스트 ${mMoon.toFixed(2)}배 적용)` : ''}`, mMoon);
    }

    // 초화의 사자
    const tEden = trackers.edenMessenger;
    const mEden = getBoostMultiplier(tEden);
    if (tEden.count >= 2) {
        const bonus = Math.round(500 * mEden);
        applyStatBonus({ int: 500, wis: 500 }, mEden);
        result.elementalAtkBonus['초화계'] = (result.elementalAtkBonus['초화계'] || 0) + (0.2 * mEden);
        addActiveSet('초화의 사자 세트 (2세트)', tEden.count, `지능 +${bonus}, 지혜 +${bonus}, 초화계 속성 피해 +${Math.round(20 * mEden)}%${mEden > 1 ? ` (보스부스트 ${mEden.toFixed(2)}배 적용)` : ''}`, mEden);
    }
    if (tEden.count >= 4) {
        const bonus = Math.round(1500 * mEden);
        applyStatBonus({ int: 1500, wis: 1500 }, mEden);
        result.mAtkPercent += Math.round(50 * mEden);
        result.elementalAtkBonus['초화계'] = (result.elementalAtkBonus['초화계'] || 0) + (1.0 * mEden);
        addActiveSet('초화의 사자 세트 (4세트)', tEden.count, `지능 +${bonus}, 지혜 +${bonus}, 마법 공격력 +${Math.round(50 * mEden)}%, 초화계 속성 피해 +${Math.round(100 * mEden)}%${mEden > 1 ? ` (보스부스트 ${mEden.toFixed(2)}배 적용)` : ''}`, mEden);
    }

    // 강철의 사자
    const tSteel = trackers.steelMessenger;
    const mSteel = getBoostMultiplier(tSteel);
    if (tSteel.count >= 2) {
        const bonus = Math.round(500 * mSteel);
        applyStatBonus({ def: 500, ctrl: 500 }, mSteel);
        result.pDefPercent += Math.round(30 * mSteel);
        addActiveSet('강철의 사자 세트 (2세트)', tSteel.count, `방어 +${bonus}, 제어 +${bonus}, 물리 방어력 +${Math.round(30 * mSteel)}%${mSteel > 1 ? ` (보스부스트 ${mSteel.toFixed(2)}배 적용)` : ''}`, mSteel);
    }
    if (tSteel.count >= 4) {
        const bonus = Math.round(1500 * mSteel);
        applyStatBonus({ def: 1500, ctrl: 1500 }, mSteel);
        result.pDefPercent += Math.round(80 * mSteel);
        result.elementalAtkBonus['강철계'] = (result.elementalAtkBonus['강철계'] || 0) + (1.0 * mSteel);
        addActiveSet('강철의 사자 세트 (4세트)', tSteel.count, `방어 +${bonus}, 제어 +${bonus}, 물리 방어력 +${Math.round(80 * mSteel)}%, 강철계 속성 피해 +${Math.round(100 * mSteel)}%${mSteel > 1 ? ` (보스부스트 ${mSteel.toFixed(2)}배 적용)` : ''}`, mSteel);
    }

    // 해수의 사자
    const tSea = trackers.seaMessenger;
    const mSea = getBoostMultiplier(tSea);
    if (tSea.count >= 2) {
        const bonus = Math.round(500 * mSea);
        applyStatBonus({ int: 500, def: 500 }, mSea);
        result.mDefPercent += Math.round(30 * mSea);
        addActiveSet('해수의 사자 세트 (2세트)', tSea.count, `지력 +${bonus}, 방어 +${bonus}, 마법 방어력 +${Math.round(30 * mSea)}%${mSea > 1 ? ` (보스부스트 ${mSea.toFixed(2)}배 적용)` : ''}`, mSea);
    }
    if (tSea.count >= 4) {
        const bonus = Math.round(1500 * mSea);
        applyStatBonus({ int: 1500, def: 1500 }, mSea);
        result.mDefPercent += Math.round(80 * mSea);
        result.elementalAtkBonus['해수계'] = (result.elementalAtkBonus['해수계'] || 0) + (1.0 * mSea);
        addActiveSet('해수의 사자 세트 (4세트)', tSea.count, `지력 +${bonus}, 방어 +${bonus}, 마법 방어력 +${Math.round(80 * mSea)}%, 해수계 속성 피해 +${Math.round(100 * mSea)}%${mSea > 1 ? ` (보스부스트 ${mSea.toFixed(2)}배 적용)` : ''}`, mSea);
    }

    // 빙결의 사자
    const tIce = trackers.iceMessenger;
    const mIce = getBoostMultiplier(tIce);
    if (tIce.count >= 2) {
        const bonus = Math.round(500 * mIce);
        applyStatBonus({ int: 500, agi: 500 }, mIce);
        result.elementalAtkBonus['빙결계'] = (result.elementalAtkBonus['빙결계'] || 0) + (0.2 * mIce);
        addActiveSet('빙결의 사자 세트 (2세트)', tIce.count, `지능 +${bonus}, 민첩 +${bonus}, 빙결계 속성 피해 +${Math.round(20 * mIce)}%${mIce > 1 ? ` (보스부스트 ${mIce.toFixed(2)}배 적용)` : ''}`, mIce);
    }
    if (tIce.count >= 4) {
        const bonus = Math.round(1500 * mIce);
        applyStatBonus({ int: 1500, agi: 1500 }, mIce);
        result.mAtkPercent += Math.round(50 * mIce);
        result.elementalAtkBonus['빙결계'] = (result.elementalAtkBonus['빙결계'] || 0) + (1.0 * mIce);
        addActiveSet('빙결의 사자 세트 (4세트)', tIce.count, `지능 +${bonus}, 민첩 +${bonus}, 마법 공격력 +${Math.round(50 * mIce)}%, 빙결계 속성 피해 +${Math.round(100 * mIce)}%${mIce > 1 ? ` (보스부스트 ${mIce.toFixed(2)}배 적용)` : ''}`, mIce);
    }

    // 무의 사자
    const tMu = trackers.muMessenger;
    const mMu = getBoostMultiplier(tMu);
    if (tMu.count >= 2) {
        const bonus = Math.round(500 * mMu);
        applyStatBonus({ str: 500, agi: 500 }, mMu);
        result.pAtkPercent += Math.round(20 * mMu);
        addActiveSet('무의 사자 세트 (2세트)', tMu.count, `힘 +${bonus}, 민첩 +${bonus}, 물리 공격력 +${Math.round(20 * mMu)}%${mMu > 1 ? ` (보스부스트 ${mMu.toFixed(2)}배 적용)` : ''}`, mMu);
    }
    if (tMu.count >= 4) {
        const bonus = Math.round(1500 * mMu);
        applyStatBonus({ str: 1500, agi: 1500 }, mMu);
        result.pAtkPercent += Math.round(100 * mMu);
        result.critChanceBonus += Math.round(20 * mMu);
        addActiveSet('무의 사자 세트 (4세트)', tMu.count, `힘 +${bonus}, 민첩 +${bonus}, 물리 공격력 +${Math.round(100 * mMu)}%, 치명타율 +${Math.round(20 * mMu)}%${mMu > 1 ? ` (보스부스트 ${mMu.toFixed(2)}배 적용)` : ''}`, mMu);
    }

    // 질풍의 사자
    const tGale = trackers.galeMessenger;
    const mGale = getBoostMultiplier(tGale);
    if (tGale.count >= 2) {
        const bonus = Math.round(500 * mGale);
        applyStatBonus({ agi: 500, ctrl: 500 }, mGale);
        result.accuracyBonus += Math.round(15 * mGale);
        addActiveSet('질풍의 사자 세트 (2세트)', tGale.count, `민첩 +${bonus}, 제어 +${bonus}, 명중률 +${Math.round(15 * mGale)}%${mGale > 1 ? ` (보스부스트 ${mGale.toFixed(2)}배 적용)` : ''}`, mGale);
    }
    if (tGale.count >= 4) {
        const bonus = Math.round(1500 * mGale);
        applyStatBonus({ agi: 1500, ctrl: 1500 }, mGale);
        result.evasionBonus += Math.round(20 * mGale);
        result.elementalAtkBonus['질풍계'] = (result.elementalAtkBonus['질풍계'] || 0) + (1.0 * mGale);
        addActiveSet('질풍의 사자 세트 (4세트)', tGale.count, `민첩 +${bonus}, 제어 +${bonus}, 회피율 +${Math.round(20 * mGale)}%, 질풍계 속성 피해 +${Math.round(100 * mGale)}%${mGale > 1 ? ` (보스부스트 ${mGale.toFixed(2)}배 적용)` : ''}`, mGale);
    }

    // 지령의 사자
    const tEarth = trackers.earthMessenger;
    const mEarth = getBoostMultiplier(tEarth);
    if (tEarth.count >= 2) {
        const bonus = Math.round(500 * mEarth);
        applyStatBonus({ str: 500, def: 500 }, mEarth);
        result.pDefPercent += Math.round(30 * mEarth);
        addActiveSet('지령의 사자 세트 (2세트)', tEarth.count, `힘 +${bonus}, 방어 +${bonus}, 물리 방어력 +${Math.round(30 * mEarth)}%${mEarth > 1 ? ` (보스부스트 ${mEarth.toFixed(2)}배 적용)` : ''}`, mEarth);
    }
    if (tEarth.count >= 4) {
        const bonus = Math.round(1500 * mEarth);
        applyStatBonus({ str: 1500, def: 1500 }, mEarth);
        result.pDefPercent += Math.round(80 * mEarth);
        result.elementalAtkBonus['대지계'] = (result.elementalAtkBonus['대지계'] || 0) + (1.0 * mEarth);
        addActiveSet('지령의 사자 세트 (4세트)', tEarth.count, `힘 +${bonus}, 방어 +${bonus}, 물리 방어력 +${Math.round(80 * mEarth)}%, 대지계 속성 피해 +${Math.round(100 * mEarth)}%${mEarth > 1 ? ` (보스부스트 ${mEarth.toFixed(2)}배 적용)` : ''}`, mEarth);
    }

    return result;
}
