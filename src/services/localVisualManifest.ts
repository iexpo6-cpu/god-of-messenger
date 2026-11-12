/**
 * Auto-generated and maintained by Visual Adapter Subagent
 * Contains local bundled static asset paths for 0ms loading without internet dependency.
 */

export const LOCAL_VISUAL_MANIFEST: Record<string, string> = {
    // 마물 및 훈련 개체
    "빛의 나비": "assets/visuals/monsters/빛의_나비.jpg",
    "지옥의 아수라": "assets/visuals/monsters/지옥의_아수라.jpg",
    "마력 깃든 스파링 골렘": "assets/visuals/monsters/마력_깃든_스파링_골렘.jpg",
    "기계식 훈련 로봇": "assets/visuals/monsters/기계식_훈련_로봇.jpg",
    // 보스 개체 매핑
    "[BOSS] 산적 두목": "assets/visuals/bosses/산적_두목.jpg",

    // 아이템 및 장비 에셋
    "[유니크] 어둠 서린 가죽 튜닉": "assets/visuals/items/어둠_서린_가죽_튜닉.jpg",
    "어둠 서린 가죽 튜닉": "assets/visuals/items/어둠_서린_가죽_튜닉.jpg",
    "[레어] 그림자 보행자 경갑": "assets/visuals/items/그림자_보행자_경갑.jpg",
    "그림자 보행자 경갑": "assets/visuals/items/그림자_보행자_경갑.jpg",
    "프로토타입 레일건": "assets/visuals/items/프로토타입_레일건.jpg",
    "프로토타입 레일걸": "assets/visuals/items/프로토타입_레일건.jpg",
    "저격용 레일건 (프로토타입)": "assets/visuals/items/프로토타입_레일건.jpg",

    // 판타지 대륙 및 지역 배경 에셋
    "신계_배경": "assets/visuals/backgrounds/shingye_celestial_sanctuary.jpg",
    "마계_배경": "assets/visuals/backgrounds/magye_imperial_citadel.jpg",
    "실바나르_배경": "assets/visuals/backgrounds/silvanar_myrtal_forest.jpg",
    "페랄디아_배경": "assets/visuals/backgrounds/feraldia_leonis_colosseum.jpg",
    "아비살론_배경": "assets/visuals/backgrounds/abyssalon_necrodium.jpg",
    "아시아_배경": "assets/visuals/backgrounds/asia_korea_celestial_palace.jpg",
    "대한민국_배경": "assets/visuals/backgrounds/asia_korea_celestial_palace.jpg",
    "유럽_배경": "assets/visuals/backgrounds/europe_gothic_cathedral.jpg",
    "아프리카_배경": "assets/visuals/backgrounds/africa_middle_east_oasis_temple.jpg",
    "아메리카_배경": "assets/visuals/backgrounds/america_oceania_magitech_city.jpg"
};

/**
 * Checks if a visual asset is available locally in public assets
 */
export const getLocalVisualPath = (name: string): string | null => {
    if (!name) return null;
    return LOCAL_VISUAL_MANIFEST[name] || LOCAL_VISUAL_MANIFEST[name.trim()] || null;
};
