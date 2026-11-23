/**
 * 쯔꾸르(RPG Maker) 2D 필드용 지역별 남/여 캐릭터 스프라이트 매니페스트 & 안전 리졸버
 * - 규격: 144x192 PNG (3열 x 4행, 셀당 48x48)
 *   Row 0: 아래(DOWN), Row 1: 왼쪽(LEFT), Row 2: 오른쪽(RIGHT), Row 3: 위(UP)
 *   Col 0: 왼발, Col 1: 정지, Col 2: 오른발
 */

export type RpgSpriteRegionKey =
    | 'asia'
    | 'europe'
    | 'north_america'
    | 'south_america'
    | 'oceania'
    | 'africa'
    | 'magye'
    | 'shingye'
    | 'sylvanar'
    | 'feraldia'
    | 'abyssalon';

export type RpgSpriteGenderKey = 'male' | 'female';
export type SpriteDirection = 'down' | 'left' | 'right' | 'up';

export const DIRECTION_ROW_MAP: Record<SpriteDirection, number> = {
    down: 0,
    left: 1,
    right: 2,
    up: 3,
};

export interface FallbackPalette {
    hair: string;
    skin: string;
    outfit: string;
    accent: string;
}

export const REGION_FALLBACK_PALETTE: Record<RpgSpriteRegionKey, FallbackPalette> = {
    asia: { hair: '#1e293b', skin: '#f7d6bc', outfit: '#1e3a8a', accent: '#f59e0b' },
    europe: { hair: '#92400e', skin: '#fce1cb', outfit: '#1d4ed8', accent: '#cbd5e1' },
    north_america: { hair: '#451a03', skin: '#f5cfb4', outfit: '#78350f', accent: '#38bdf8' },
    south_america: { hair: '#1c1917', skin: '#e0a97d', outfit: '#0f766e', accent: '#f97316' },
    oceania: { hair: '#713f12', skin: '#eab990', outfit: '#0284c7', accent: '#fef08a' },
    africa: { hair: '#0f172a', skin: '#9a633c', outfit: '#f8fafc', accent: '#eab308' },
    magye: { hair: '#cbd5e1', skin: '#e2e8f0', outfit: '#18181b', accent: '#dc2626' },
    shingye: { hair: '#fef08a', skin: '#fff1e6', outfit: '#f8fafc', accent: '#f59e0b' },
    sylvanar: { hair: '#d9f99d', skin: '#fce7d6', outfit: '#15803d', accent: '#a7f3d0' },
    feraldia: { hair: '#b45309', skin: '#e6b892', outfit: '#9a3412', accent: '#fde047' },
    abyssalon: { hair: '#c4b5fd', skin: '#d8dee9', outfit: '#312e81', accent: '#a855f7' },
};

export const mapRegionToSpriteKey = (region?: string, nation?: string): RpgSpriteRegionKey => {
    const r = (region || '').trim();
    const n = (nation || '').trim();

    if (r === '신계') return 'shingye';
    if (r === '마계' || n === '임페리얼 제국') return 'magye';
    if (r === '실바나르' || n === '미르탈 숲연합') return 'sylvanar';
    if (r === '페랄디아' || n === '레오니스 투기국') return 'feraldia';
    if (r === '아비살론' || n === '네크로디움 제국') return 'abyssalon';
    if (r === '유럽') return 'europe';
    if (r === '북아메리카') return 'north_america';
    if (r === '남아메리카') return 'south_america';
    if (r === '오세아니아') return 'oceania';
    if (r === '아프리카') return 'africa';
    return 'asia';
};

export const normalizeGenderKey = (gender?: string): RpgSpriteGenderKey => {
    const g = (gender || '').trim().toLowerCase();
    if (g === '여성' || g === '여자' || g === 'female' || g === 'f' || g === '여') {
        return 'female';
    }
    return 'male';
};

export interface RpgSpriteCatalogItem {
    key: string;
    regionKey: RpgSpriteRegionKey;
    gender: RpgSpriteGenderKey;
    label: string;
    tag: string;
}

export const RPG_SPRITE_CATALOG: RpgSpriteCatalogItem[] = [
    { key: 'asia_male', regionKey: 'asia', gender: 'male', label: '동양 무투가 (남)', tag: '인간계' },
    { key: 'asia_female', regionKey: 'asia', gender: 'female', label: '동양 모험가 (여)', tag: '인간계' },
    { key: 'europe_male', regionKey: 'europe', gender: 'male', label: '유럽 기사 (남)', tag: '인간계' },
    { key: 'europe_female', regionKey: 'europe', gender: 'female', label: '유럽 마도기사 (여)', tag: '인간계' },
    { key: 'north_america_male', regionKey: 'north_america', gender: 'male', label: '개척 헌터 (남)', tag: '인간계' },
    { key: 'north_america_female', regionKey: 'north_america', gender: 'female', label: '모던 레인저 (여)', tag: '인간계' },
    { key: 'south_america_male', regionKey: 'south_america', gender: 'male', label: '열대 탐험가 (남)', tag: '인간계' },
    { key: 'south_america_female', regionKey: 'south_america', gender: 'female', label: '남미 모험가 (여)', tag: '인간계' },
    { key: 'oceania_male', regionKey: 'oceania', gender: 'male', label: '해양 모험가 (남)', tag: '인간계' },
    { key: 'oceania_female', regionKey: 'oceania', gender: 'female', label: '해안 탐험가 (여)', tag: '인간계' },
    { key: 'africa_male', regionKey: 'africa', gender: 'male', label: '태양 전사 (남)', tag: '인간계' },
    { key: 'africa_female', regionKey: 'africa', gender: 'female', label: '태양 사제 (여)', tag: '인간계' },
    { key: 'shingye_male', regionKey: 'shingye', gender: 'male', label: '신계 성기사 (남)', tag: '신계' },
    { key: 'shingye_female', regionKey: 'shingye', gender: 'female', label: '신계 발키리 (여)', tag: '신계' },
    { key: 'magye_male', regionKey: 'magye', gender: 'male', label: '마계 흑기사 (남)', tag: '마계' },
    { key: 'magye_female', regionKey: 'magye', gender: 'female', label: '마계 귀족마도사 (여)', tag: '마계' },
    { key: 'sylvanar_male', regionKey: 'sylvanar', gender: 'male', label: '엘프 궁수 (남)', tag: '이종족' },
    { key: 'sylvanar_female', regionKey: 'sylvanar', gender: 'female', label: '엘프 정령사 (여)', tag: '이종족' },
    { key: 'feraldia_male', regionKey: 'feraldia', gender: 'male', label: '수인 검투사 (남)', tag: '이종족' },
    { key: 'feraldia_female', regionKey: 'feraldia', gender: 'female', label: '수인 격투가 (여)', tag: '이종족' },
    { key: 'abyssalon_male', regionKey: 'abyssalon', gender: 'male', label: '마족 암흑기사 (남)', tag: '이종족' },
    { key: 'abyssalon_female', regionKey: 'abyssalon', gender: 'female', label: '마족 흑마녀 (여)', tag: '이종족' },
    // === 고퀄리티 지역별 외형 2차 확장 22종 ===
    { key: 'asia_male_2', regionKey: 'asia', gender: 'male', label: '동양 검객/선비 무사 (남)', tag: '인간계' },
    { key: 'asia_female_2', regionKey: 'asia', gender: 'female', label: '동양 무녀/화랑 여검사 (여)', tag: '인간계' },
    { key: 'europe_male_2', regionKey: 'europe', gender: 'male', label: '유럽 귀족 대마법사 (남)', tag: '인간계' },
    { key: 'europe_female_2', regionKey: 'europe', gender: 'female', label: '유럽 백은 여기사 (여)', tag: '인간계' },
    { key: 'north_america_male_2', regionKey: 'north_america', gender: 'male', label: '어반 택티컬 헌터 (남)', tag: '인간계' },
    { key: 'north_america_female_2', regionKey: 'north_america', gender: 'female', label: '모던 스트릿 레인저 (여)', tag: '인간계' },
    { key: 'south_america_male_2', regionKey: 'south_america', gender: 'male', label: '태양 유적 전사 (남)', tag: '인간계' },
    { key: 'south_america_female_2', regionKey: 'south_america', gender: 'female', label: '정글 정령 무희 (여)', tag: '인간계' },
    { key: 'oceania_male_2', regionKey: 'oceania', gender: 'male', label: '심해 항해사 선장 (남)', tag: '인간계' },
    { key: 'oceania_female_2', regionKey: 'oceania', gender: 'female', label: '산호 해안 마도사 (여)', tag: '인간계' },
    { key: 'africa_male_2', regionKey: 'africa', gender: 'male', label: '사막 황금 전사 (남)', tag: '인간계' },
    { key: 'africa_female_2', regionKey: 'africa', gender: 'female', label: '태양 사막 대신관 (여)', tag: '인간계' },
    { key: 'shingye_male_2', regionKey: 'shingye', gender: 'male', label: '천계 대천사 심판관 (남)', tag: '신계' },
    { key: 'shingye_female_2', regionKey: 'shingye', gender: 'female', label: '천계 빛의 성녀 (여)', tag: '신계' },
    { key: 'magye_male_2', regionKey: 'magye', gender: 'male', label: '마계 제국 황태자 (남)', tag: '마계' },
    { key: 'magye_female_2', regionKey: 'magye', gender: 'female', label: '마계 홍련 여장군 (여)', tag: '마계' },
    { key: 'sylvanar_male_2', regionKey: 'sylvanar', gender: 'male', label: '고대 숲 엘프 성기사 (남)', tag: '이종족' },
    { key: 'sylvanar_female_2', regionKey: 'sylvanar', gender: 'female', label: '달빛 엘프 대드루이드 (여)', tag: '이종족' },
    { key: 'feraldia_male_2', regionKey: 'feraldia', gender: 'male', label: '백호/늑대 수인 투사 (남)', tag: '이종족' },
    { key: 'feraldia_female_2', regionKey: 'feraldia', gender: 'female', label: '여우 수인 무희 (여)', tag: '이종족' },
    { key: 'abyssalon_male_2', regionKey: 'abyssalon', gender: 'male', label: '심연 마족 사령술사 (남)', tag: '이종족' },
    { key: 'abyssalon_female_2', regionKey: 'abyssalon', gender: 'female', label: '심연 뱀파이어 귀족 (여)', tag: '이종족' },
    // === 고퀄리티 14개 세부 문화권·종족별 3차 확장 25종 (총 69종!) ===
    { key: 'asia_male_3', regionKey: 'asia', gender: 'male', label: '동아시아 황실 호위무사 (남)', tag: '인간계' },
    { key: 'asia_female_3', regionKey: 'asia', gender: 'female', label: '동아시아 궁중 여협 (여)', tag: '인간계' },
    { key: 'southeast_asia_male_1', regionKey: 'asia', gender: 'male', label: '동남아 열대 왕국 무투가 (남)', tag: '인간계' },
    { key: 'southeast_asia_female_1', regionKey: 'asia', gender: 'female', label: '동남아 연꽃 정령 공주 (여)', tag: '인간계' },
    { key: 'middle_east_female_1', regionKey: 'africa', gender: 'female', label: '중동 별빛 오아시스 점성술사 (여)', tag: '인간계' },
    { key: 'west_europe_male_1', regionKey: 'europe', gender: 'male', label: '서유럽 로열 총사 (남)', tag: '인간계' },
    { key: 'west_europe_female_1', regionKey: 'europe', gender: 'female', label: '서유럽 로열 마도 영애 (여)', tag: '인간계' },
    { key: 'south_europe_male_1', regionKey: 'europe', gender: 'male', label: '남유럽 르네상스 검투사 (남)', tag: '인간계' },
    { key: 'south_europe_female_1', regionKey: 'europe', gender: 'female', label: '남유럽 태양 지중해 무희 (여)', tag: '인간계' },
    { key: 'east_europe_male_1', regionKey: 'europe', gender: 'male', label: '동유럽 설원 후사르 장교 (남)', tag: '인간계' },
    { key: 'east_europe_female_1', regionKey: 'europe', gender: 'female', label: '동유럽 백설 공녀 (여)', tag: '인간계' },
    { key: 'north_europe_male_1', regionKey: 'europe', gender: 'male', label: '북유럽 바이킹 룬 전사 (남)', tag: '인간계' },
    { key: 'north_europe_female_1', regionKey: 'europe', gender: 'female', label: '북유럽 방패처녀 전사 (여)', tag: '인간계' },
    { key: 'north_america_male_3', regionKey: 'north_america', gender: 'male', label: '북미 서부 마도 건슬링거 (남)', tag: '인간계' },
    { key: 'north_america_female_3', regionKey: 'north_america', gender: 'female', label: '북미 사이버 마도공학자 (여)', tag: '인간계' },
    { key: 'south_america_male_3', regionKey: 'south_america', gender: 'male', label: '남미 안데스 수호자 (남)', tag: '인간계' },
    { key: 'south_america_female_3', regionKey: 'south_america', gender: 'female', label: '남미 황금 엘도라도 여전사 (여)', tag: '인간계' },
    { key: 'africa_male_3', regionKey: 'africa', gender: 'male', label: '아프리카 사자 부족 전사 (남)', tag: '인간계' },
    { key: 'africa_female_3', regionKey: 'africa', gender: 'female', label: '아프리카 별빛 주술사 (여)', tag: '인간계' },
    { key: 'magye_male_3', regionKey: 'magye', gender: 'male', label: '마계 심연 혈기사 백작 (남)', tag: '마계' },
    { key: 'magye_female_3', regionKey: 'magye', gender: 'female', label: '마계 자색 공작영애 (여)', tag: '마계' },
    { key: 'sylvanar_male_3', regionKey: 'sylvanar', gender: 'male', label: '하이엘프 별빛 마검사 (남)', tag: '이종족' },
    { key: 'sylvanar_female_3', regionKey: 'sylvanar', gender: 'female', label: '실바나르 정령 궁수 (여)', tag: '이종족' },
    { key: 'feraldia_male_3', regionKey: 'feraldia', gender: 'male', label: '사자 수인 황금 대투사 (남)', tag: '이종족' },
    { key: 'feraldia_female_3', regionKey: 'feraldia', gender: 'female', label: '흑표범 수인 암살자 (여)', tag: '이종족' },
    // === NPC 다양화 28종 (노인 · 아이 · 군인 · 용병 · 평민 · 왕족 · 교사) ===
    { key: 'npc_elder_grandpa', regionKey: 'asia', gender: 'male', label: '원로 할아버지', tag: 'NPC' },
    { key: 'npc_elder_grandma', regionKey: 'europe', gender: 'female', label: '인자한 할머니', tag: 'NPC' },
    { key: 'npc_elder_sage', regionKey: 'europe', gender: 'male', label: '백발 대현자 원로', tag: 'NPC' },
    { key: 'npc_elder_general', regionKey: 'europe', gender: 'male', label: '백발 베테랑 노장군', tag: 'NPC' },
    { key: 'npc_child_boy', regionKey: 'asia', gender: 'male', label: '마을 소년', tag: 'NPC' },
    { key: 'npc_child_girl', regionKey: 'europe', gender: 'female', label: '마을 소녀', tag: 'NPC' },
    { key: 'npc_child_squire', regionKey: 'europe', gender: 'male', label: '견습 기사 소년', tag: 'NPC' },
    { key: 'npc_child_apprentice', regionKey: 'europe', gender: 'female', label: '견습 마법 소녀', tag: 'NPC' },
    { key: 'npc_soldier_asia', regionKey: 'asia', gender: 'male', label: '동양 철갑 호위병', tag: 'NPC' },
    { key: 'npc_soldier_europe', regionKey: 'europe', gender: 'male', label: '유럽 성문 경비병', tag: 'NPC' },
    { key: 'npc_soldier_modern', regionKey: 'north_america', gender: 'male', label: '현대 전술 군인', tag: 'NPC' },
    { key: 'npc_soldier_magye', regionKey: 'magye', gender: 'male', label: '마계 흑갑 보병', tag: 'NPC' },
    { key: 'npc_merc_red', regionKey: 'europe', gender: 'male', label: '적발 대검 용병', tag: 'NPC' },
    { key: 'npc_merc_blue', regionKey: 'asia', gender: 'female', label: '청발 여검객 용병', tag: 'NPC' },
    { key: 'npc_merc_desert', regionKey: 'africa', gender: 'male', label: '사막 쌍검 용병', tag: 'NPC' },
    { key: 'npc_merc_veteran', regionKey: 'europe', gender: 'male', label: '은발 안대 용병단장', tag: 'NPC' },
    { key: 'npc_civil_smith', regionKey: 'europe', gender: 'male', label: '마을 대장장이', tag: 'NPC' },
    { key: 'npc_civil_merchant', regionKey: 'europe', gender: 'female', label: '상단 여상인', tag: 'NPC' },
    { key: 'npc_civil_youth', regionKey: 'asia', gender: 'male', label: '마을 청년', tag: 'NPC' },
    { key: 'npc_civil_herbalist', regionKey: 'europe', gender: 'female', label: '약초상·꽃집 소녀', tag: 'NPC' },
    { key: 'npc_royal_king', regionKey: 'europe', gender: 'male', label: '황금 왕관 국왕', tag: 'NPC' },
    { key: 'npc_royal_queen', regionKey: 'europe', gender: 'female', label: '은발 로열 여왕', tag: 'NPC' },
    { key: 'npc_royal_prince', regionKey: 'asia', gender: 'male', label: '동양 세자 왕자', tag: 'NPC' },
    { key: 'npc_royal_princess', regionKey: 'europe', gender: 'female', label: '분홍빛 공주', tag: 'NPC' },
    { key: 'npc_teacher_prof', regionKey: 'asia', gender: 'male', label: '아카데미 남성 교수', tag: 'NPC' },
    { key: 'npc_teacher_lady', regionKey: 'europe', gender: 'female', label: '아카데미 여성 교사', tag: 'NPC' },
    { key: 'npc_teacher_lib', regionKey: 'europe', gender: 'female', label: '마법 도서관 사서', tag: 'NPC' },
    { key: 'npc_teacher_alch', regionKey: 'europe', gender: 'male', label: '연금술 연구 학자', tag: 'NPC' },
];

/**
 * 도시 NPC 역할(경비·상인·학자·용병·주민·노인·아이·왕족) + 지역 문화권 매칭 스프라이트 선택기
 */
export const pickRoleMatchedNpcSpriteKey = (
    role: string,
    regionKey: RpgSpriteRegionKey,
    gender: RpgSpriteGenderKey,
    seedIndex: number,
    isHumanWorld: boolean,
    usedKeys?: Set<string>
): string => {
    const r = (role || '').toLowerCase();
    let roleCandidates: string[] = [];

    if (r.includes('경비') || r.includes('위병') || r.includes('병사') || r.includes('군인') || r.includes('순찰')) {
        if (regionKey === 'magye') roleCandidates = ['npc_soldier_magye', 'npc_elder_general'];
        else if (regionKey === 'asia') roleCandidates = ['npc_soldier_asia', 'npc_soldier_modern', 'npc_elder_general'];
        else if (regionKey === 'north_america' || regionKey === 'oceania') roleCandidates = ['npc_soldier_modern', 'npc_soldier_europe'];
        else roleCandidates = ['npc_soldier_europe', 'npc_soldier_asia', 'npc_elder_general'];
    } else if (r.includes('상인') || r.includes('행상') || r.includes('장인') || r.includes('대장')) {
        roleCandidates = gender === 'female'
            ? ['npc_civil_merchant', 'npc_civil_herbalist']
            : ['npc_civil_smith', 'npc_civil_youth', 'npc_elder_grandpa'];
    } else if (r.includes('학자') || r.includes('교사') || r.includes('교수') || r.includes('사서') || r.includes('연금')) {
        roleCandidates = gender === 'female'
            ? ['npc_teacher_lady', 'npc_teacher_lib']
            : ['npc_teacher_prof', 'npc_teacher_alch', 'npc_elder_sage'];
    } else if (r.includes('모험') || r.includes('용병') || r.includes('헌터') || r.includes('투사')) {
        roleCandidates = gender === 'female'
            ? ['npc_merc_blue', 'npc_child_apprentice']
            : ['npc_merc_red', 'npc_merc_veteran', 'npc_merc_desert'];
    } else if (r.includes('왕') || r.includes('귀족') || r.includes('공주') || r.includes('황')) {
        roleCandidates = gender === 'female'
            ? ['npc_royal_queen', 'npc_royal_princess']
            : [regionKey === 'asia' ? 'npc_royal_prince' : 'npc_royal_king', 'npc_royal_prince'];
    } else {
        // 일반 시민/주민/안내자: 노인, 아이, 평민, 교사, 지역 주민이 자연스럽게 어우러지도록 구성!
        roleCandidates = gender === 'female'
            ? ['npc_elder_grandma', 'npc_child_girl', 'npc_civil_herbalist', 'npc_child_apprentice', 'npc_royal_princess']
            : ['npc_elder_grandpa', 'npc_child_boy', 'npc_civil_youth', 'npc_child_squire', 'npc_elder_sage'];
    }

    // 비인간계(신계/엘프/수인/아비살론)는 종족 고유 외형을 우선하되 마계 경비병 등 특수 NPC는 반영
    if (!isHumanWorld && regionKey !== 'magye') {
        return pickDiverseRegionalSpriteKey(regionKey, gender, seedIndex, false, usedKeys);
    }

    const unused = usedKeys ? roleCandidates.filter(k => !usedKeys.has(k)) : roleCandidates;
    if (unused.length > 0) {
        const picked = unused[Math.abs(seedIndex) % unused.length];
        usedKeys?.add(picked);
        return picked;
    }

    return pickDiverseRegionalSpriteKey(regionKey, gender, seedIndex, isHumanWorld, usedKeys);
};

/**
 * 도시 NPC 및 랜덤 모험가용 지역 문화권 기반 중복 방지 스프라이트 선택기 (69종 전체 활용!)
 */
export const pickDiverseRegionalSpriteKey = (
    regionKey: RpgSpriteRegionKey,
    gender: RpgSpriteGenderKey,
    seedIndex: number,
    isHumanWorld: boolean,
    usedKeys?: Set<string>
): string => {
    // 1순위: 해당 지역(문화권) + 성별 일치 스프라이트 풀
    const regionalPool = RPG_SPRITE_CATALOG.filter(
        item => item.regionKey === regionKey && item.gender === gender
    );
    // 2순위: 인간계 도시라면 전 세계 여행자/모험가 풀까지 확장해 NPC 다양성 극대화!
    const broadPool = isHumanWorld
        ? RPG_SPRITE_CATALOG.filter(item => item.tag === '인간계' && item.gender === gender)
        : RPG_SPRITE_CATALOG.filter(item => item.regionKey === regionKey && item.gender === gender);

    const combined = [...regionalPool, ...broadPool.filter(b => !regionalPool.some(r => r.key === b.key))];
    const available = usedKeys ? combined.filter(item => !usedKeys.has(item.key)) : combined;
    const finalPool = available.length > 0 ? available : (combined.length > 0 ? combined : RPG_SPRITE_CATALOG);

    // 앞쪽 NPC는 지역 고유 외형을 우선, 뒤쪽 NPC는 다양한 문화권 외형을 섞어 배치
    const picked =
        seedIndex < regionalPool.length && available.some(a => a.regionKey === regionKey)
            ? available.filter(a => a.regionKey === regionKey)[seedIndex % available.filter(a => a.regionKey === regionKey).length]
            : finalPool[Math.abs(seedIndex) % finalPool.length];

    usedKeys?.add(picked.key);
    return picked.key;
};

export const HUMAN_GLOBAL_REGION_KEYS: RpgSpriteRegionKey[] = [
    'asia', 'europe', 'north_america', 'south_america', 'oceania', 'africa'
];

export const getRpgSpriteUrlByKey = (spriteKey: string): string => {
    const base = (import.meta as any).env?.BASE_URL || './';
    const normalizedBase = base.endsWith('/') ? base : `${base}/`;
    return `${normalizedBase}assets/visuals/sprites/${spriteKey}.png`;
};

const simpleHash = (str: string): number => {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
        h ^= str.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    return Math.abs(h);
};

export const pickRandomRpgSpriteKey = (gender?: string, pool: 'human' | 'all' = 'human'): string => {
    const gKey = normalizeGenderKey(gender);
    const candidates = RPG_SPRITE_CATALOG.filter(
        item => item.gender === gKey && (pool === 'all' || item.tag === '인간계')
    );
    const list = candidates.length > 0 ? candidates : RPG_SPRITE_CATALOG;
    return list[Math.floor(Math.random() * list.length)].key;
};

/**
 * 캐릭터/동료의 쯔꾸르 스프라이트 해석기:
 * 1) customSpriteUrl(커스텀 연구소 업로드 / 차원 교신 공유)이 있으면 최우선 적용
 * 2) rpgSpriteKey가 직접 지정되어 있으면 어느 지역에 있든 유저가 선택한 스프라이트를 우선 적용
 * 3) 미지정이면 종족/시드 기반으로 다양한 지역 외형을 결정적 배정
 */
export const resolveEntityRpgSprite = (
    entity: { rpgSpriteKey?: string; customSpriteUrl?: string; id?: string; name?: string; gender?: string; race?: string },
    fallbackRegion?: string,
    fallbackNation?: string
): { key: string; url: string; regionKey: RpgSpriteRegionKey; genderKey: RpgSpriteGenderKey } => {
    const genderKey = normalizeGenderKey(entity.gender);

    if (entity.customSpriteUrl && entity.customSpriteUrl.trim().length > 0) {
        return {
            key: `custom_upload_${entity.id || entity.name || 'unit'}`,
            url: entity.customSpriteUrl,
            regionKey: mapRegionToSpriteKey(fallbackRegion, fallbackNation),
            genderKey
        };
    }

    if (entity.rpgSpriteKey) {
        const found = RPG_SPRITE_CATALOG.find(item => item.key === entity.rpgSpriteKey);
        if (found) {
            return {
                key: found.key,
                url: getRpgSpriteUrlByKey(found.key),
                regionKey: found.regionKey,
                genderKey: found.gender
            };
        }
    }

    const raceStr = (entity.race || '').toLowerCase();
    let regionKey: RpgSpriteRegionKey;

    if (raceStr.includes('엘프') || raceStr.includes('elf')) {
        regionKey = 'sylvanar';
    } else if (raceStr.includes('수인') || raceStr.includes('beast')) {
        regionKey = 'feraldia';
    } else if (raceStr.includes('마족') || raceStr.includes('demon') || raceStr.includes('언데드')) {
        regionKey = 'abyssalon';
    } else if (raceStr.includes('천사') || raceStr.includes('신족') || raceStr.includes('신')) {
        regionKey = 'shingye';
    } else {
        const seed = entity.id || entity.name || '';
        if (seed) {
            const humanPool = RPG_SPRITE_CATALOG.filter(
                item => item.tag === '인간계' && item.gender === genderKey
            );
            if (humanPool.length > 0) {
                const picked = humanPool[simpleHash(seed) % humanPool.length];
                return {
                    key: picked.key,
                    url: getRpgSpriteUrlByKey(picked.key),
                    regionKey: picked.regionKey,
                    genderKey: picked.gender
                };
            }
            const idx = simpleHash(seed) % HUMAN_GLOBAL_REGION_KEYS.length;
            regionKey = HUMAN_GLOBAL_REGION_KEYS[idx];
        } else {
            regionKey = mapRegionToSpriteKey(fallbackRegion, fallbackNation);
        }
    }

    // 비인간 종족(엘프/수인/마족/신계/마계)도 이름/ID 시드 기반으로 2~3종 변형 스프라이트를 골고루 배정!
    const seedStr = entity.id || entity.name || '';
    const racePool = RPG_SPRITE_CATALOG.filter(
        item => item.regionKey === regionKey && item.gender === genderKey
    );
    if (seedStr && racePool.length > 1) {
        const picked = racePool[simpleHash(seedStr) % racePool.length];
        return {
            key: picked.key,
            url: getRpgSpriteUrlByKey(picked.key),
            regionKey: picked.regionKey,
            genderKey: picked.gender
        };
    }

    const key = `${regionKey}_${genderKey}`;
    return {
        key,
        url: getRpgSpriteUrlByKey(key),
        regionKey,
        genderKey
    };
};

export const getRpgSpriteAssetPath = (region?: string, gender?: string, nation?: string): string => {
    const regionKey = mapRegionToSpriteKey(region, nation);
    const genderKey = normalizeGenderKey(gender);
    return getRpgSpriteUrlByKey(`${regionKey}_${genderKey}`);
};

export interface SpriteChromaOptions {
    mode: 'auto' | 'magenta' | 'custom' | 'none';
    colorHex?: string; // mode === 'custom'일 때 제거할 배경색 (예: '#00ff00', '#ffffff')
    tolerance?: number; // 10 ~ 140 (기본 58)
}

const hexToRgb = (hex: string): [number, number, number] => {
    const clean = (hex || '#ff00ff').replace('#', '').trim();
    if (clean.length === 3) {
        return [
            parseInt(clean[0] + clean[0], 16) || 0,
            parseInt(clean[1] + clean[1], 16) || 0,
            parseInt(clean[2] + clean[2], 16) || 0
        ];
    }
    return [
        parseInt(clean.slice(0, 2), 16) || 0,
        parseInt(clean.slice(2, 4), 16) || 0,
        parseInt(clean.slice(4, 6), 16) || 0
    ];
};

/**
 * 원본 이미지 Data URL에서 지정한 배경색(또는 모서리 자동 추출색)을 투명화하여 144x192 PNG Data URL 반환
 */
export const processSpriteDataUrlWithChroma = (
    rawDataUrl: string,
    options: SpriteChromaOptions = { mode: 'auto', tolerance: 58 }
): Promise<{ dataUrl: string; detectedHex: string }> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onerror = () => reject(new Error('유효한 이미지 파일이 아닙니다.'));
        img.onload = () => {
            const targetW = 144;
            const targetH = 192;
            const canvas = document.createElement('canvas');
            canvas.width = targetW;
            canvas.height = targetH;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                reject(new Error('캔버스 컨텍스트를 생성할 수 없습니다.'));
                return;
            }
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.clearRect(0, 0, targetW, targetH);
            ctx.drawImage(img, 0, 0, targetW, targetH);

            const imgData = ctx.getImageData(0, 0, targetW, targetH);
            const d = imgData.data;

            // 좌상단 모서리 픽셀 자동 감지
            const autoR = d[0];
            const autoG = d[1];
            const autoB = d[2];
            const toHex = (v: number) => v.toString(16).padStart(2, '0');
            const detectedHex = `#${toHex(autoR)}${toHex(autoG)}${toHex(autoB)}`;

            if (options.mode !== 'none') {
                const tol = Math.max(10, Math.min(160, options.tolerance ?? 58));
                const softBand = Math.max(18, tol * 0.45);
                let kr = 255, kg = 0, kb = 255;
                if (options.mode === 'auto') {
                    kr = autoR; kg = autoG; kb = autoB;
                } else if (options.mode === 'custom' && options.colorHex) {
                    [kr, kg, kb] = hexToRgb(options.colorHex);
                }

                for (let i = 0; i < d.length; i += 4) {
                    const r = d[i];
                    const g = d[i + 1];
                    const b = d[i + 2];
                    const a = d[i + 3];
                    if (a === 0) continue;

                    const dist = Math.hypot(r - kr, g - kg, b - kb);
                    if (dist <= tol) {
                        d[i + 3] = 0;
                    } else if (dist <= tol + softBand) {
                        const factor = (dist - tol) / softBand;
                        d[i + 3] = Math.round(a * factor);
                    }
                }
                ctx.putImageData(imgData, 0, 0);
            }

            resolve({ dataUrl: canvas.toDataURL('image/png'), detectedHex });
        };
        img.src = rawDataUrl;
    });
};

export const readFileAsDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(new Error('파일을 읽지 못했습니다.'));
        reader.onload = () => resolve(String(reader.result || ''));
        reader.readAsDataURL(file);
    });
};

/**
 * 사용자가 직접 업로드한 3x4 쯔꾸르 스프라이트 이미지를 144x192 PNG Data URL로 정규화
 */
export const normalizeUploadedSpriteFile = async (
    file: File,
    removeMagentaBg: boolean = true
): Promise<string> => {
    const raw = await readFileAsDataUrl(file);
    const { dataUrl } = await processSpriteDataUrlWithChroma(raw, {
        mode: removeMagentaBg ? 'magenta' : 'none',
        tolerance: 62
    });
    return dataUrl;
};

// 인메모리 스프라이트 이미지 캐시
const spriteImageCache = new Map<string, HTMLImageElement | 'error'>();
const loadingPromises = new Map<string, Promise<HTMLImageElement | null>>();

export const loadRpgSpriteImage = (url: string): Promise<HTMLImageElement | null> => {
    const cached = spriteImageCache.get(url);
    if (cached === 'error') return Promise.resolve(null);
    if (cached) return Promise.resolve(cached);

    const existing = loadingPromises.get(url);
    if (existing) return existing;

    const p = new Promise<HTMLImageElement | null>((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            spriteImageCache.set(url, img);
            loadingPromises.delete(url);
            resolve(img);
        };
        img.onerror = () => {
            spriteImageCache.set(url, 'error');
            loadingPromises.delete(url);
            resolve(null);
        };
        img.src = url;
    });

    loadingPromises.set(url, p);
    return p;
};

export const getCachedRpgSpriteImage = (url: string): HTMLImageElement | null => {
    const cached = spriteImageCache.get(url);
    if (!cached || cached === 'error') return null;
    return cached;
};

/**
 * 스프라이트 로드 전/실패 시에도 깔끔한 16-bit 픽셀풍 치비 캐릭터를 렌더링하는 폴백 함수
 */
export const drawFallbackChibiSprite = (
    ctx: CanvasRenderingContext2D,
    centerX: number,
    footY: number,
    size: number,
    dir: SpriteDirection,
    walkFrame: number, // 0: 왼발, 1: 정지, 2: 오른발
    regionKey: RpgSpriteRegionKey,
    genderKey: RpgSpriteGenderKey
) => {
    const pal = REGION_FALLBACK_PALETTE[regionKey] || REGION_FALLBACK_PALETTE.asia;
    const bounce = walkFrame === 1 ? 0 : -2;
    const stepOffset = walkFrame === 0 ? -2.5 : walkFrame === 2 ? 2.5 : 0;

    ctx.save();
    ctx.translate(centerX, footY);

    // 발밑 그림자
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.ellipse(0, -2, size * 0.28, size * 0.11, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.translate(0, bounce);

    // 다리 / 신발
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(-size * 0.14 + stepOffset * 0.4, -size * 0.22, size * 0.11, size * 0.18);
    ctx.fillRect(size * 0.03 - stepOffset * 0.4, -size * 0.22, size * 0.11, size * 0.18);

    // 몸통 (의상)
    ctx.fillStyle = pal.outfit;
    ctx.beginPath();
    ctx.roundRect(-size * 0.22, -size * 0.52, size * 0.44, size * 0.34, 4);
    ctx.fill();
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // 포인트 허리띠/망토
    ctx.fillStyle = pal.accent;
    ctx.fillRect(-size * 0.21, -size * 0.34, size * 0.42, size * 0.07);

    // 머리
    ctx.fillStyle = pal.skin;
    ctx.beginPath();
    ctx.arc(0, -size * 0.68, size * 0.23, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 머리카락
    ctx.fillStyle = pal.hair;
    ctx.beginPath();
    if (dir === 'up') {
        ctx.arc(0, -size * 0.69, size * 0.24, 0, Math.PI * 2);
    } else {
        ctx.arc(0, -size * 0.72, size * 0.24, Math.PI, Math.PI * 2);
        if (genderKey === 'female') {
            ctx.fillRect(-size * 0.24, -size * 0.72, size * 0.09, size * 0.25);
            ctx.fillRect(size * 0.15, -size * 0.72, size * 0.09, size * 0.25);
        }
    }
    ctx.fill();

    // 눈 (뒤돌아볼 때 제외)
    if (dir !== 'up') {
        ctx.fillStyle = '#0f172a';
        const eyeShiftX = dir === 'left' ? -3 : dir === 'right' ? 3 : 0;
        ctx.fillRect(-size * 0.09 + eyeShiftX, -size * 0.68, 2.5, 3.5);
        ctx.fillRect(size * 0.05 + eyeShiftX, -size * 0.68, 2.5, 3.5);
    }

    ctx.restore();
};
