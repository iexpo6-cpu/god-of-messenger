/**
 * City Background Asset Manifest & Fantasy Visual Engine
 * 신의 사자 RPG - 전 대륙 및 지역별 판타지 배경 비주얼 매니페스트
 *
 * 지원 대상 지역:
 * 1. 신계 (천상 성소/신성 빛과 부유도)
 * 2. 마계 / 임페리얼 제국 (뒤틀린 흑요석 요새, 핏빛 마기)
 * 3. 실바나르 / 미르탈 숲연합 (발광하는 거대 세계수와 엘프 숲)
 * 4. 페랄디아 / 레오니스 투기국 (거친 협곡, 수인들의 고대 콜로세움)
 * 5. 아비살론 / 네크로디움 (심연의 네크로폴리스)
 * 6. 아시아 / 대한민국 (도술과 신수가 깃든 동양풍 천도/궁궐)
 * 7. 유럽 (고딕 판타지 대성당과 마법 성벽)
 * 8. 아프리카 / 중동 (황금빛 모래 언덕과 오아시스 신전)
 * 9. 아메리카 / 오세아니아 (마도 공학과 마천루 신대륙)
 */

export interface CityBackgroundTheme {
    /** 배경 이미지 위에 덧씌워져 가독성을 극대화하는 CSS 다크 그라데이션 */
    overlayGradient: string;
    /** 강조 텍스트 색상 클래스 */
    accentColor: string;
    /** 테두리 테마 클래스 */
    borderColor: string;
    /** 네온 후광/글로우 CSS 컬러 */
    glowColor: string;
    /** 대륙/국가 뱃지 라벨 */
    badgeText: string;
    /** 테마 뱃지 클래스 */
    badgeClass: string;
    /** 분위기 한 줄 설명 */
    description: string;
}

export interface CityBackgroundConfig {
    id: string;
    name: string;
    region: string;
    concept: string;
    prompt: string;
    localPath: string;
    fallbackUrl?: string;
    theme: CityBackgroundTheme;
    matchedNations: string[];
}

export const CITY_BACKGROUND_MANIFEST: Record<string, CityBackgroundConfig> = {
    // 1. 신계 (천상 성소 / 신성 빛과 부유도)
    shingye_celestial_sanctuary: {
        id: "shingye_celestial_sanctuary",
        name: "신계 천상 성소",
        region: "신계",
        concept: "천상 성소/신성 빛과 부유도",
        prompt: "Breathtaking high fantasy RPG wide panoramic landscape, celestial divine sanctuary floating high above golden sunset clouds. Monumental radiant crystal spires, majestic floating holy islands with waterfalls of pure liquid sunlight cascading into the azure abyss, intricate rotating sacred golden halos in the sky, ethereal divine god rays, serene awe-inspiring atmosphere, 8k resolution, masterpiece.",
        localPath: "assets/visuals/backgrounds/shingye_celestial_sanctuary.jpg",
        theme: {
            overlayGradient: "linear-gradient(to bottom, rgba(15, 23, 42, 0.75) 0%, rgba(30, 27, 75, 0.5) 50%, rgba(15, 23, 42, 0.9) 100%)",
            accentColor: "text-amber-300",
            borderColor: "border-amber-400/60",
            glowColor: "rgba(251, 191, 36, 0.35)",
            badgeText: "✨ 천상 성역 (Celestial Sanctuary)",
            badgeClass: "bg-amber-950/70 text-amber-300 border-amber-500/50 shadow-[0_0_15px_rgba(251,191,36,0.25)]",
            description: "끝없는 황금빛 구름 위로 솟아오른 거대 수정 첨탑과 영원히 마르지 않는 신성한 빛의 폭포가 흐르는 신들의 천상 성역입니다."
        },
        matchedNations: ["신계", "신의 성소", "양의 기운의 성전", "음의 기운의 성전", "무의 궁"]
    },

    // 2. 마계 / 임페리얼 제국 (뒤틀린 흑요석 요새, 핏빛 마기)
    magye_imperial_citadel: {
        id: "magye_imperial_citadel",
        name: "마계 임페리얼 제국",
        region: "마계",
        concept: "뒤틀린 흑요석 요새, 핏빛 마기",
        prompt: "Epic dark fantasy RPG landscape, wide panoramic matte painting of the sprawling demonic capital city of Magye. In the center rises a towering twisted obsidian fortress citadel with sharp Gothic spires and jagged battlements. Glowing molten orange and crimson lava rivers carve through black jagged basalt canyons and chasms below. Ominous crimson blood-red demonic miasma and dark ethereal smoke rise into tempestuous storm clouds. In the dramatic dark sky hangs a colossal blood moon eclipse casting eerie crimson rim-light across colossal stone gargoyles and spiked fortifications. Masterpiece fantasy concept art, intricate dark gothic architecture, highly detailed, atmospheric perspective, cinematic lighting, 8k resolution, volumetric fog.",
        localPath: "assets/visuals/backgrounds/magye_imperial_citadel.jpg",
        theme: {
            overlayGradient: "linear-gradient(to bottom, rgba(15, 23, 42, 0.8) 0%, rgba(69, 10, 10, 0.55) 50%, rgba(0, 0, 0, 0.95) 100%)",
            accentColor: "text-red-400",
            borderColor: "border-red-600/60",
            glowColor: "rgba(220, 38, 38, 0.4)",
            badgeText: "💀 마계 제국령 (Nether Dominion)",
            badgeClass: "bg-red-950/70 text-red-400 border-red-700/60 shadow-[0_0_15px_rgba(220,38,38,0.3)] animate-pulse",
            description: "뒤틀린 거대 흑요석 성채와 핏빛 마기가 하늘을 뒤덮고, 발밑으로는 용암 하천이 굽이치는 마신황의 난공불락 요새입니다."
        },
        matchedNations: ["마계", "임페리얼 제국"]
    },

    // 3. 실바나르 / 미르탈 숲연합 (발광하는 거대 세계수와 엘프 숲)
    silvanar_myrtal_forest: {
        id: "silvanar_myrtal_forest",
        name: "실바나르 미르탈 숲연합",
        region: "실바나르",
        concept: "발광하는 거대 세계수와 엘프 숲",
        prompt: "Majestic high fantasy RPG wide panoramic matte painting of the enchanted elven forest sanctuary of Silvanar and Myrtal. In the center stands a gigantic colossal world tree Yggdrasil with luminescent roots and sprawling canopy glowing with emerald and teal bioluminescent moss. Elegant high-elven translucent white tree-spires and arched bridges interwoven with living vines and flora. Glowing cyan spirit lotus ponds, magical floating pollen motes, twilight starry sky with celestial aurora, dreamlike tranquil elven sanctuary, 8k resolution, masterpiece.",
        localPath: "assets/visuals/backgrounds/silvanar_myrtal_forest.jpg",
        theme: {
            overlayGradient: "linear-gradient(to bottom, rgba(6, 78, 59, 0.7) 0%, rgba(2, 44, 34, 0.45) 50%, rgba(2, 6, 23, 0.92) 100%)",
            accentColor: "text-emerald-300",
            borderColor: "border-emerald-500/60",
            glowColor: "rgba(16, 185, 129, 0.35)",
            badgeText: "🌿 엘프 연맹 성역 (Elven Forest)",
            badgeClass: "bg-emerald-950/70 text-emerald-300 border-emerald-600/60 shadow-[0_0_15px_rgba(16,185,129,0.25)]",
            description: "하늘을 가리는 거대한 고대 세계수 유그드라실과 푸른빛으로 발광하는 정령초들이 조화를 이루는 태고의 엘프 수도입니다."
        },
        matchedNations: ["실바나르", "미르탈 숲연합"]
    },

    // 4. 페랄디아 / 레오니스 투기국 (거친 협곡, 수인들의 고대 콜로세움)
    feraldia_leonis_colosseum: {
        id: "feraldia_leonis_colosseum",
        name: "페랄디아 레오니스 투기국",
        region: "페랄디아",
        concept: "거친 협곡, 수인들의 고대 콜로세움",
        prompt: "Vibrant epic dark fantasy RPG wide panoramic landscape of the beastfolk warrior nation Feraldia. A monumental ancient stone gladiatorial colosseum is carved directly into towering red rock canyon cliffs. Roaring ceremonial bonfires burning on rugged stone bastions, massive beast skull totems, weathered tribal war banners fluttering in fierce desert canyon winds, dusty sunset golden hour rim lighting, wild primal warrior glory, 8k resolution, cinematic lighting, masterpiece.",
        localPath: "assets/visuals/backgrounds/feraldia_leonis_colosseum.jpg",
        theme: {
            overlayGradient: "linear-gradient(to bottom, rgba(67, 20, 7, 0.75) 0%, rgba(124, 45, 18, 0.45) 50%, rgba(2, 6, 23, 0.92) 100%)",
            accentColor: "text-orange-300",
            borderColor: "border-orange-500/60",
            glowColor: "rgba(249, 115, 22, 0.35)",
            badgeText: "🐾 수인 투기국 (Gladiator Arena)",
            badgeClass: "bg-orange-950/70 text-orange-300 border-orange-600/60 shadow-[0_0_15px_rgba(249,115,22,0.25)]",
            description: "붉은 협곡 절벽을 깎아 만든 웅장한 콜로세움과 사나운 투사들의 함성이 사막의 모래바람을 가르는 야성의 투기 왕국입니다."
        },
        matchedNations: ["페랄디아", "레오니스 투기국"]
    },

    // 5. 아비살론 / 네크로디움 (심연의 네크로폴리스)
    abyssalon_necrodium: {
        id: "abyssalon_necrodium",
        name: "아비살론 네크로디움 제국",
        region: "아비살론",
        concept: "심연의 네크로폴리스",
        prompt: "Haunting dark fantasy RPG wide panoramic matte painting, spectral sunken necropolis city of Abyssalon Necrodium. In the shadowed subterranean abyss rise towering mausoleum spires constructed from bleached dragon bones and blackened obsidian. Eerie glowing emerald green soul-fire lantern flames, ethereal ghostly cyan mist hovering over arched bone bridges crossing dark bottomless chasms, floating departed spirit orbs, chilling gloomy gothic atmospheric depth, 8k resolution, masterpiece.",
        localPath: "assets/visuals/backgrounds/abyssalon_necrodium.jpg",
        theme: {
            overlayGradient: "linear-gradient(to bottom, rgba(59, 7, 100, 0.75) 0%, rgba(88, 28, 135, 0.45) 50%, rgba(2, 6, 23, 0.95) 100%)",
            accentColor: "text-purple-300",
            borderColor: "border-purple-500/60",
            glowColor: "rgba(168, 85, 247, 0.35)",
            badgeText: "🔮 심연 사령도시 (Necropolis)",
            badgeClass: "bg-purple-950/70 text-purple-300 border-purple-600/60 shadow-[0_0_15px_rgba(168,85,247,0.25)]",
            description: "용의 백골과 흑마법으로 빚어낸 거대한 영묘 첨탑, 에메랄드빛 유령불이 안개 속에서 일렁이는 불멸의 네크로폴리스입니다."
        },
        matchedNations: ["아비살론", "네크로디움 제국"]
    },

    // 6. 아시아 / 대한민국 (도술과 신수가 깃든 동양풍 천도/궁궐)
    asia_korea_celestial_palace: {
        id: "asia_korea_celestial_palace",
        name: "동양 천도 궁궐",
        region: "아시아",
        concept: "도술과 신수가 깃든 동양풍 천도/궁궐",
        prompt: "Splendid oriental fantasy RPG wide panoramic landscape, majestic ancient East Asian imperial celestial palace built atop floating mist-shrouded mountain peaks. Traditional ornate jade and gold-trimmed curved eaves roofs, towering vermilion pillars and grand marble stone staircases rising through a vast sea of swirling clouds. Glowing golden Taoist talismans and spiritual lotus lanterns floating softly in the night air, silhouette of mythical azure dragons soaring through the moonlight sky, cherry blossom petals drifting, 8k resolution, cinematic digital art.",
        localPath: "assets/visuals/backgrounds/asia_korea_celestial_palace.jpg",
        theme: {
            overlayGradient: "linear-gradient(to bottom, rgba(15, 23, 42, 0.75) 0%, rgba(30, 41, 59, 0.5) 50%, rgba(2, 6, 23, 0.92) 100%)",
            accentColor: "text-cyan-300",
            borderColor: "border-cyan-500/60",
            glowColor: "rgba(6, 182, 212, 0.35)",
            badgeText: "🏯 동양 천도 (Celestial Dynasty)",
            badgeClass: "bg-slate-900/80 text-cyan-300 border-cyan-500/50 shadow-[0_0_15px_rgba(6,182,212,0.25)]",
            description: "운무가 굽이치는 신선봉 위로 주홍빛 기둥과 옥기와 누각이 웅장하게 솟아있고, 청룡과 도술 부적이 수호하는 동양의 영험한 궁궐입니다."
        },
        matchedNations: ["아시아", "대한민국", "북한", "일본", "중국", "인도", "태국", "베트남", "필리핀", "몽골", "인도네시아", "말레이시아", "싱가포르"]
    },

    // 7. 유럽 (고딕 판타지 대성당과 마법 성벽)
    europe_gothic_cathedral: {
        id: "europe_gothic_cathedral",
        name: "유럽 고딕 대성당 성채",
        region: "유럽",
        concept: "고딕 판타지 대성당과 마법 성벽",
        prompt: "Epic medieval gothic fantasy city wide panoramic view, soaring grand gothic cathedral with monumental stained-glass rose windows glowing with sapphire and golden arcane light. Formidable ancient stone fortress ramparts inlaid with glowing blue protective magic barrier runes, grand cobblestone plaza with ornate wrought-iron street lamps under twilight starry sky, gargoyle carved battlements, majestic chivalric kingdom atmosphere, 8k resolution, cinematic masterpiece.",
        localPath: "assets/visuals/backgrounds/europe_gothic_cathedral.jpg",
        theme: {
            overlayGradient: "linear-gradient(to bottom, rgba(15, 23, 42, 0.8) 0%, rgba(30, 58, 138, 0.45) 50%, rgba(2, 6, 23, 0.94) 100%)",
            accentColor: "text-blue-300",
            borderColor: "border-blue-500/60",
            glowColor: "rgba(59, 130, 246, 0.35)",
            badgeText: "🏰 고딕 성채 (Gothic Citadel)",
            badgeClass: "bg-blue-950/70 text-blue-300 border-blue-600/60 shadow-[0_0_15px_rgba(59,130,246,0.25)]",
            description: "신비로운 푸른 비전 방어막 룬이 새겨진 거대한 성벽과 장엄한 스테인드글라스 장미창이 밤하늘을 수놓는 기사도의 고딕 수도입니다."
        },
        matchedNations: ["유럽", "영국", "프랑스", "독일", "이탈리아", "스페인", "러시아", "스웨덴", "노르웨이", "덴마크", "핀란드", "폴란드", "우크라이나", "네덜란드", "벨기에", "스위스", "오스트리아", "포르투갈", "그리스", "헝가리", "체코", "루마니아", "터키", "스코틀랜드"]
    },

    // 8. 아프리카 / 중동 (황금빛 모래 언덕과 오아시스 신전)
    africa_middle_east_oasis_temple: {
        id: "africa_middle_east_oasis_temple",
        name: "아프리카/중동 오아시스 태양 신전",
        region: "아프리카",
        concept: "황금빛 모래 언덕과 오아시스 신전",
        prompt: "Magnificent Arabian fantasy RPG wide panoramic landscape, vast sweeping golden sand dunes glowing under a glorious desert sunset. Shimmering turquoise mystical oasis surrounded by towering palm trees, ancient sandstone sun-god pyramid temples adorned with glowing golden hieroglyphics, magnificent gilded domes and minarets glistening in twilight, floating brass magical astrolabes, magical desert kingdom, 8k resolution, cinematic lighting, masterpiece.",
        localPath: "assets/visuals/backgrounds/africa_middle_east_oasis_temple.jpg",
        theme: {
            overlayGradient: "linear-gradient(to bottom, rgba(67, 20, 7, 0.75) 0%, rgba(120, 53, 15, 0.45) 50%, rgba(2, 6, 23, 0.94) 100%)",
            accentColor: "text-yellow-300",
            borderColor: "border-amber-500/60",
            glowColor: "rgba(245, 158, 11, 0.35)",
            badgeText: "☀️ 오아시스 신전 (Desert Oasis)",
            badgeClass: "bg-amber-950/70 text-amber-300 border-amber-600/60 shadow-[0_0_15px_rgba(245,158,11,0.25)]",
            description: "황금빛 사막의 모래언덕과 영롱한 에메랄드빛 오아시스, 태양신의 고대 피라미드와 황금빛 돔이 석양에 빛나는 신비로운 사막의 성도입니다."
        },
        matchedNations: ["아프리카", "이집트", "남아공", "나이지리아", "케냐", "모로코", "사우디아라비아", "UAE", "이스라엘", "이란"]
    },

    // 9. 아메리카 / 오세아니아 (마도 공학과 마천루 신대륙)
    america_oceania_magitech_city: {
        id: "america_oceania_magitech_city",
        name: "아메리카/오세아니아 마도 공학 대도시",
        region: "북아메리카",
        concept: "마도 공학과 마천루 신대륙",
        prompt: "Dazzling high-fantasy magitech metropolis wide panoramic landscape, futuristic arcane skyscraping crystal towers infused with glowing vibrant cyan ether conduits and mana conductors. Sleek floating arcane airships and winged sky gliders soaring gracefully between elevated glass skybridges, radiant holographic magic circle runes, grand coastal harbor looking out over boundless sapphire ocean waves, vibrant adventurous dawn sunlight, 8k resolution, concept art masterpiece.",
        localPath: "assets/visuals/backgrounds/america_oceania_magitech_city.jpg",
        theme: {
            overlayGradient: "linear-gradient(to bottom, rgba(15, 23, 42, 0.75) 0%, rgba(14, 116, 144, 0.45) 50%, rgba(2, 6, 23, 0.94) 100%)",
            accentColor: "text-teal-300",
            borderColor: "border-cyan-400/60",
            glowColor: "rgba(45, 212, 191, 0.35)",
            badgeText: "⚡ 마도 공학 대도시 (Magitech Metropolis)",
            badgeClass: "bg-cyan-950/70 text-cyan-300 border-cyan-600/60 shadow-[0_0_15px_rgba(45,212,191,0.25)]",
            description: "푸른 에테르 에너지가 흐르는 수정 마천루와 하늘을 가르는 비공정, 드넓은 해양을 굽어보는 첨단 마도 공학의 신대륙입니다."
        },
        matchedNations: ["북아메리카", "남아메리카", "오세아니아", "미국", "캐나다", "멕시코", "브라질", "아르헨티나", "호주", "뉴질랜드"]
    }
};

/**
 * 주어진 대륙(region), 국가(nation), 도시(city) 정보에 부합하는 최적의 판타지 배경 구성을 반환합니다.
 */
export function getCityBackgroundConfig(region?: string, nation?: string, _city?: string): CityBackgroundConfig {
    const r = (region || '').trim();
    const n = (nation || '').trim();

    // 1. 신계 판정
    if (r === '신계' || n === '신의 성소' || n.includes('성전') || n === '무의 궁') {
        return CITY_BACKGROUND_MANIFEST.shingye_celestial_sanctuary;
    }

    // 2. 마계 / 임페리얼 제국 판정
    if (r === '마계' || n === '임페리얼 제국' || n.includes('임페리얼')) {
        return CITY_BACKGROUND_MANIFEST.magye_imperial_citadel;
    }

    // 3. 실바나르 / 미르탈 숲연합 판정
    if (r === '실바나르' || n === '미르탈 숲연합' || n.includes('미르탈')) {
        return CITY_BACKGROUND_MANIFEST.silvanar_myrtal_forest;
    }

    // 4. 페랄디아 / 레오니스 투기국 판정
    if (r === '페랄디아' || n === '레오니스 투기국' || n.includes('레오니스')) {
        return CITY_BACKGROUND_MANIFEST.feraldia_leonis_colosseum;
    }

    // 5. 아비살론 / 네크로디움 제국 판정
    if (r === '아비살론' || n === '네크로디움 제국' || n.includes('네크로디움')) {
        return CITY_BACKGROUND_MANIFEST.abyssalon_necrodium;
    }

    // 6. 중동/아프리카 판정 (사우디, UAE, 이스라엘, 이란 등 아시아 내 중동 국가 포함)
    const middleEastNations = ['사우디아라비아', 'UAE', '이스라엘', '이란', '이집트', '남아공', '나이지리아', '케냐', '모로코'];
    if (r === '아프리카' || middleEastNations.includes(n)) {
        return CITY_BACKGROUND_MANIFEST.africa_middle_east_oasis_temple;
    }

    // 7. 아메리카 / 오세아니아 판정
    if (r === '북아메리카' || r === '남아메리카' || r === '오세아니아' || ['미국', '캐나다', '멕시코', '브라질', '아르헨티나', '호주', '뉴질랜드'].includes(n)) {
        return CITY_BACKGROUND_MANIFEST.america_oceania_magitech_city;
    }

    // 8. 유럽 판정
    if (r === '유럽' || ['영국', '프랑스', '독일', '이탈리아', '스페인', '러시아', '스위스', '오스트리아', '네덜란드', '그리스', '폴란드'].includes(n)) {
        return CITY_BACKGROUND_MANIFEST.europe_gothic_cathedral;
    }

    // 9. 아시아 / 대한민국 (기본 동양 천도 판정)
    return CITY_BACKGROUND_MANIFEST.asia_korea_celestial_palace;
}

/**
 * 배경 이미지의 실제 로컬 정적 에셋 경로 반환 (0ms 로딩 보장)
 */
export function getCityBackgroundUrl(region?: string, nation?: string, city?: string): string {
    const config = getCityBackgroundConfig(region, nation, city);
    return config.localPath;
}

/**
 * 배경 이미지에 입힐 CSS 다크 오버레이 그라데이션 반환
 */
export function getCityBackgroundOverlay(region?: string, nation?: string, city?: string): string {
    const config = getCityBackgroundConfig(region, nation, city);
    return config.theme.overlayGradient;
}

/**
 * CityMapBoard 컴포넌트 호환용 인터페이스 및 함수
 */
export interface CityBackgroundImageInfo {
    url: string;
    title: string;
    fallbackUrl?: string;
    accentTint: string;
}

export function getCityBackgroundImage(loc?: { region?: string; nation?: string; city?: string }): CityBackgroundImageInfo {
    const config = getCityBackgroundConfig(loc?.region, loc?.nation, loc?.city);
    return {
        url: config.localPath,
        title: config.name,
        fallbackUrl: config.fallbackUrl,
        accentTint: config.theme.glowColor
    };
}

export interface TimeAtmosphereFilter {
    filterClass: string;
    blendOverlayColor: string;
    ambientGlow: string;
}

export function getTimeAtmosphereFilter(period?: string, isMidnightLabor?: boolean): TimeAtmosphereFilter {
    if (isMidnightLabor) {
        return {
            filterClass: "brightness-75 contrast-125 hue-rotate-[290deg] saturate-150",
            blendOverlayColor: "bg-red-950/60",
            ambientGlow: "rgba(220, 38, 38, 0.45)"
        };
    }

    const p = (period || '').toLowerCase();
    switch (p) {
        case 'dawn':
        case '여명':
            return {
                filterClass: "brightness-95 contrast-110 saturate-125 hue-rotate-[-10deg]",
                blendOverlayColor: "bg-amber-950/25",
                ambientGlow: "rgba(251, 146, 60, 0.35)"
            };
        case 'day':
        case '낮':
            return {
                filterClass: "brightness-105 contrast-105 saturate-110",
                blendOverlayColor: "bg-sky-950/20",
                ambientGlow: "rgba(56, 189, 248, 0.25)"
            };
        case 'sunset':
        case '석양':
            return {
                filterClass: "brightness-90 contrast-115 saturate-140 hue-rotate-[15deg]",
                blendOverlayColor: "bg-rose-950/35",
                ambientGlow: "rgba(244, 63, 94, 0.35)"
            };
        case 'night':
        case '야간':
            return {
                filterClass: "brightness-80 contrast-115 hue-rotate-[210deg] saturate-90",
                blendOverlayColor: "bg-slate-950/45",
                ambientGlow: "rgba(99, 102, 241, 0.3)"
            };
        case 'midnight':
        case '심야':
            return {
                filterClass: "brightness-65 contrast-125 hue-rotate-[240deg] saturate-80",
                blendOverlayColor: "bg-slate-950/65",
                ambientGlow: "rgba(129, 140, 248, 0.2)"
            };
        default:
            return {
                filterClass: "brightness-90 contrast-110",
                blendOverlayColor: "bg-slate-950/30",
                ambientGlow: "rgba(148, 163, 184, 0.25)"
            };
    }
}
