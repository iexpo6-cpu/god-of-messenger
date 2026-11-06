
import { Character, Companion, JobType, Item, ClassTier, Stats,ItemRarity } from './types';

// [ADDED] Constants exported for use in DevTools
export const REQUIRED_SUN_ITEMS = ["레드 블레이저 스피어", "레드 블레이저 투구", "레드 블레이저 갑옷", "레드 블레이저 슈즈", "태양의 보옥", "태양의 손", "LHM 모드 시작 - 날개"];
export const AWAKENING_MATERIAL = "태양의 잔재";
export const AWAKENING_MATERIAL_COUNT = 10;

export interface MessengerConfig {
    title: string;
    elements: string[];
    requiredItems: string[];
    material: string;
    materialCount: number;
    description: string;
    jobType: JobType;
}

export const DIVINE_MESSENGER_CONFIG: Record<string, MessengerConfig> = {
    "태양계": {
        title: "태양의 사자",
        elements: ["태양계"],
        requiredItems: ["레드 블레이저 스피어", "레드 블레이저 투구", "레드 블레이저 갑옷", "레드 블레이저 슈즈", "태양의 보옥", "태양의 손", "LHM 모드 시작 - 날개"],
        material: "태양의 잔재",
        materialCount: 10,
        description: "태양의 모든 권능을 이어받아 신의 뜻을 대행하는 절대적인 존재입니다.",
        jobType: JobType.SOLAR_MESSENGER
    },
    "화염계": {
        title: "화염의 사자",
        elements: ["화염계"],
        requiredItems: ["이그니션 라피에르", "불타는 투구", "화염의 흉갑", "폭열의 건틀릿", "용암 보폭", "성화의 고리"],
        material: "태우는 심장",
        materialCount: 10,
        description: "만물을 태우는 시련의 불꽃을 다스리며 부정한 자를 심판합니다.",
        jobType: JobType.FIRE_MESSENGER
    },
    "광휘계": {
        title: "광휘의 사자",
        elements: ["광휘계"],
        requiredItems: ["샤이닝 엔젤 스태프", "샤이닝 엔젤 소드", "엔젤 티아라", "엘리시안 로브", "빛의 세례 손길", "성역의 발걸음", "광휘의 눈물의 목걸이"],
        material: "광휘의 조각",
        materialCount: 10,
        description: "가장 순수한 빛으로 어둠을 몰아내고 성역을 수호합니다.",
        jobType: JobType.RADIANT_MESSENGER
    },
    "월광계": {
        title: "월광의 사자",
        elements: ["월광계"],
        requiredItems: ["명월 쌍도", "침묵의 단도", "월광의 삿갓", "그림자 무사복", "월식의 토시", "무영의 버선", "만월의 펜던트"],
        material: "침묵의 대나무",
        materialCount: 10,
        description: "은은한 달빛 아래서 기척을 지우고 세상을 관조하는 신의 그림자입니다.",
        jobType: JobType.MOONLIGHT_MESSENGER
    },
    "전격계": {
        title: "전격의 사자",
        elements: ["전격계"],
        requiredItems: ["제우스 라이트닝 소드", "썬더 라이트닝 오브", "뇌신의 투구", "전격의 전갑", "벼락 깃든 장갑", "뇌속의 장화", "천둥의 징표"],
        material: "심판의 벼락 조각",
        materialCount: 10,
        description: "하늘의 분노인 전격을 휘둘러 적의 모든 방어를 무력화합니다.",
        jobType: JobType.ELECTRIC_MESSENGER
    },
    "대지계": {
        title: "지령의 사자",
        elements: ["대지계"],
        requiredItems: ["그라운드 바스타드 소드", "대지의 방패", "산맥의 투구", "대륙의 강갑", "지각 변동 장갑", "뿌리 깊은 장화", "가이아의 정수"],
        material: "지령의 맥",
        materialCount: 10,
        description: "대륙의 무게와 고동을 다스리며 결코 무너지지 않는 요새가 됩니다.",
        jobType: JobType.EARTH_MESSENGER
    },
    "질풍계": {
        title: "질풍의 사자",
        elements: ["질풍계"],
        requiredItems: ["블랙 스톰 윈드 너클", "질풍의 경갑", "폭풍의 토시", "허리케인 부츠", "질풍의 숨결"],
        material: "응축된 태풍",
        materialCount: 10,
        description: "폭풍을 몰고 다니며 보이지 않는 속도로 적을 유린합니다.",
        jobType: JobType.GALE_MESSENGER
    },
    "빙결계": {
        title: "빙결의 사자",
        elements: ["빙결계"],
        requiredItems: ["프리즈 크리스탈 건", "프리즈 크리스탈 시드", "서리의 왕관", "만년설의 수의", "혹한의 얼음 손길", "빙하의 흔적", "절대영도의 핵"],
        material: "동결된 시간",
        materialCount: 10,
        description: "절대영도의 한기로 시간마저 얼려버리는 냉혹한 신의 대행자입니다.",
        jobType: JobType.ICE_MESSENGER
    },
    "해수계": {
        title: "해수의 사자",
        elements: ["해수계"],
        requiredItems: ["테티스 엄브렐라 스태프", "심해의 소용돌이 보주", "해신의 비늘 예복", "앱솔루트 아쿠아 장갑", "심해의 발자취"],
        material: "영원한 파도 조각",
        materialCount: 10,
        description: "심해의 압력과 파도의 흐름을 조종하여 생명의 근원을 다스립니다.",
        jobType: JobType.SEA_MESSENGER
    },
    "강철계": {
        title: "강철의 사자",
        elements: ["강철계"],
        requiredItems: ["메탈 브레이커", "강철의 요새 방패", "아이언 마스크", "절대 강철 갑주", "강철 파쇄 장갑"],
        material: "초고강도 합금",
        materialCount: 10,
        description: "무엇보다 단단한 의지와 강철로 이루어진 신계의 방패입니다.",
        jobType: JobType.STEEL_MESSENGER
    },
    "암흑계": {
        title: "암연의 사자",
        elements: ["암흑계"],
        requiredItems: ["네오 다크 레이저건", "블랙홀 코어 보주", "사이버네틱 다크 헬름", "보이드 메카 아머", "중력 제어 장갑", "어둠의 가속 추진기", "네오 다크 엔진"],
        material: "공허의 나사",
        materialCount: 10,
        description: "심연의 어둠과 공허를 다루어 존재의 근원을 지워버립니다.",
        jobType: JobType.DARK_MESSENGER
    },
    "초화계": {
        title: "초화의 사자",
        elements: ["초화계"],
        requiredItems: ["에덴 크로스보우", "시드 오브 에덴", "에덴의 꽃관", "생명의 잎사귀 갑주", "덩굴 속박 장갑"],
        material: "태고의 씨앗",
        materialCount: 10,
        description: "생명의 탄생과 순환을 주관하며 자연의 무한한 힘을 끌어다 씁니다.",
        jobType: JobType.NATURE_MESSENGER
    },
    "무의사자": {
        title: "무의 사자",
        elements: ["무기강화계", "신체강화계"],
        requiredItems: ["무형의 도", "자운풍 보주", "도사의 갓", "쾌의 (快衣)", "무극의 수대", "축지혜 (縮地鞋)", "호패 (豪牌)"],
        material: "활빈당의 의기",
        materialCount: 10,
        description: "형체도 기척도 없는 무(無)의 경지에 도달하여 차원을 가로지릅니다.",
        jobType: JobType.VOID_MESSENGER
    }
};

/**
 * 전직 가능 여부 확인
 */
export const checkDivineMessengerEligibility = (
    entity: Character | Companion, 
    inventory: Item[],
    existingJobs: JobType[] = [] // [NEW] 현재 일행의 직업 목록 추가
) => {
    // 1. 해당 계통 설정 찾기
    let config: MessengerConfig | undefined;
    const type = entity.shinryokuType || "미개방";
    
    if (type === "무기강화계" || type === "신체강화계") {
        config = DIVINE_MESSENGER_CONFIG["무의사자"];
    } else {
        config = DIVINE_MESSENGER_CONFIG[type];
    }

    if (!config) return { allowed: false, reason: `${type} 계통은 사자 임명 대상이 아닙니다.`, config: undefined };

    // 2. 레벨 확인
    if (entity.level < 1000) return { allowed: false, reason: "레벨 1000 이상이어야 합니다.", config };

    // 2-1. 파이널 클래스 해방 상태 확인
    const isFinalClassLiberated =
        entity.classTier === ClassTier.FINAL ||
        (entity.classTier as any) === 'FINAL' ||
        Boolean((entity as any).finalClassName);
    if (!isFinalClassLiberated) {
        return { allowed: false, reason: "파이널 클래스 해방 상태여야 신의 사자가 될 수 있습니다.", config };
    }

    // 3. 중복 보직 확인
    if (existingJobs.includes(config.jobType)) {
        return { allowed: false, reason: `이미 일행 중에 ${config.title}가 존재합니다. 사자의 권능은 유일해야 합니다.`, config };
    }

    // 4. 장비 확인 (반드시 신화 등급이어야 함)
    const equippedMythics = Object.values(entity.equipment)
        .filter((i): i is Item => i !== undefined && i.rarity === ItemRarity.MYTHTIC)
        .map(i => i.name);

    const missingEquip = config.requiredItems.filter(reqName => !equippedMythics.includes(reqName));
    
    if (missingEquip.length > 0) {
        return { 
            allowed: false, 
            reason: `필수 신화 장비 미착용: ${missingEquip.join(', ')} (${missingEquip.length}종 미착용)`,
            config 
        };
    }

    // 5. 재료 확인
    const materialCount = inventory.filter(i => i.name === config!.material).length;
    if (materialCount < config.materialCount) {
        return { 
            allowed: false, 
            reason: `재료 부족: ${config.material} ${config.materialCount}개가 필요합니다. (현재: ${materialCount}개)`,
            config 
        };
    }

    return { allowed: true, config };
};

/**
 * 실제 전직 수행
 */
export const performDivineMessengerAwakening = (character: Character, targetId: string): { newChar: Character, success: boolean, message: string } => {
    const isPlayer = targetId === 'player';
    const targetEntity = isPlayer ? character : [...character.companions, ...(character.inactiveCompanions || [])].find(c => c.id === targetId);
    
    if (!targetEntity) return { newChar: character, success: false, message: "대상을 찾을 수 없습니다." };
    
    // [NEW] 일행 직업 수집
    const existingJobs = [
        character.job,
        ...character.companions.map(c => c.job),
        ...(character.inactiveCompanions || []).map(c => c.job)
    ].filter(Boolean) as JobType[];

    const { allowed, config } = checkDivineMessengerEligibility(targetEntity as any, character.inventory, existingJobs);
    if (!allowed || !config) return { newChar: character, success: false, message: "자격이 부족합니다." };

    const newChar = { ...character };
    
    // 재료 소모 (태양의 잔재 등 10개 제거)
    let removedCount = 0;
    newChar.inventory = newChar.inventory.filter(item => {
        if (item.name === config.material && removedCount < config.materialCount) {
            removedCount++;
            return false;
        }
        return true;
    });

    let targetName = "";

    const applyStats = (stats: Stats) => {
        stats.str += 5000;
        stats.int += 5000;
        stats.ctrl += 5000;
        stats.wis += 5000;
        stats.def += 5000;
        stats.agi += 5000;
        stats.maxHp += 50000;
        stats.hp = stats.maxHp;
        stats.maxMp += 50000;
        stats.mp = stats.maxMp;
    };

    if (isPlayer) {
        targetName = newChar.name;
        newChar.job = config.jobType; // [MODIFIED] Set specific job type
        newChar.classTier = ClassTier.FINAL;
        newChar.originalVisualUrl = newChar.originalVisualUrl || newChar.visualUrl;
        newChar.godVisualChoice = undefined;
        applyStats(newChar.stats);
    } else {
        const activeIdx = newChar.companions.findIndex(c => c.id === targetId);
        const inactiveIdx = newChar.inactiveCompanions?.findIndex(c => c.id === targetId) ?? -1;
        
        const list = activeIdx !== -1 ? newChar.companions : (newChar.inactiveCompanions || []);
        const idx = activeIdx !== -1 ? activeIdx : inactiveIdx;
        
        if (idx !== -1) {
            targetName = list[idx].name;
            const origVisual = list[idx].originalVisualUrl || list[idx].visualUrl || list[idx].defaultVisualUrl;
            list[idx] = {
                ...list[idx],
                job: config.jobType, // [MODIFIED] Set specific job type
                classTier: ClassTier.FINAL,
                originalVisualUrl: origVisual,
                godVisualChoice: undefined,
                stats: { ...list[idx].stats }
            };
            applyStats(list[idx].stats);
        }
    }

    return { 
        newChar, 
        success: true, 
        message: `${targetName}이(가) ${config.title}로 거듭났습니다!` 
    };
};
