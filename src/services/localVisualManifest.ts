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
    "저격용 레일건 (프로토타입)": "assets/visuals/items/프로토타입_레일건.jpg"
};

/**
 * Checks if a visual asset is available locally in public assets
 */
export const getLocalVisualPath = (name: string): string | null => {
    if (!name) return null;
    return LOCAL_VISUAL_MANIFEST[name] || LOCAL_VISUAL_MANIFEST[name.trim()] || null;
};
