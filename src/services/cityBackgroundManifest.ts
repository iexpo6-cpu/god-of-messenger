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
    // 1-0. 신계 범용/폴백 (천상 성소 / 신성 빛과 부유도)
    shingye_celestial_sanctuary: {
        id: "shingye_celestial_sanctuary",
        name: "신계 천상 성소",
        region: "신계",
        concept: "천상 성소/신성 빛과 부유도",
        prompt: "Breathtaking high fantasy RPG wide panoramic landscape, celestial divine sanctuary floating high above golden sunset clouds. Monumental radiant crystal spires, majestic floating holy islands with waterfalls of pure liquid sunlight cascading into the azure abyss, intricate rotating sacred golden halos in the sky, ethereal divine god rays, serene awe-inspiring atmosphere, 8k resolution, masterpiece.",
        localPath: "assets/visuals/backgrounds/shingye_celestial_sanctuary.jpg",
        fallbackUrl: "assets/visuals/backgrounds/shingye/shingye_god_abode.jpg",
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

    // 1-1. 신의 거처 / 창조신의 절대 성소
    shingye_god_abode: {
        id: "shingye_god_abode",
        name: "창조신의 절대 성소 (신의 거처)",
        region: "신계",
        concept: "창조신의 시원핵과 황금빛 천상 절대 거처",
        prompt: "Sacred creator god holy sanctuary floating high in celestial clouds, massive golden halo rings, floating divine pillars, crystalline spires, pure white and gold ethereal light, 8k masterpiece",
        localPath: "assets/visuals/backgrounds/shingye/shingye_god_abode.jpg",
        fallbackUrl: "assets/visuals/backgrounds/shingye_celestial_sanctuary.jpg",
        theme: {
            overlayGradient: "linear-gradient(to bottom, rgba(15, 23, 42, 0.75) 0%, rgba(30, 27, 75, 0.5) 50%, rgba(15, 23, 42, 0.9) 100%)",
            accentColor: "text-amber-300",
            borderColor: "border-amber-400/70",
            glowColor: "rgba(254, 240, 138, 0.45)",
            badgeText: "✨ 창조신의 성소 (Creator Sanctuary)",
            badgeClass: "bg-amber-950/80 text-amber-200 border-amber-400/70 shadow-[0_0_20px_rgba(254,240,138,0.3)]",
            description: "만물의 시원과 영겁의 신비가 깃든 창조신께서 좌정한 거룩한 천상 절대 성소입니다."
        },
        matchedNations: ["신계", "신의 성소"]
    },

    // 1-2. 태양의 사자의 성전
    shingye_sun_temple: {
        id: "shingye_sun_temple",
        name: "태양의 사자의 성전",
        region: "신계",
        concept: "작열하는 영원의 태양과 황금빛 성전",
        prompt: "Blazing solar deity temple in celestial heavens, massive burning miniature sun hovering above golden temple spires, fiery solar flares, shimmering heat distortion, pure radiant light, 8k masterpiece",
        localPath: "assets/visuals/backgrounds/shingye/shingye_sun_temple.jpg",
        fallbackUrl: "assets/visuals/backgrounds/shingye_celestial_sanctuary.jpg",
        theme: {
            overlayGradient: "linear-gradient(to bottom, rgba(30, 15, 10, 0.75) 0%, rgba(67, 20, 7, 0.5) 50%, rgba(15, 23, 42, 0.9) 100%)",
            accentColor: "text-amber-400",
            borderColor: "border-amber-500/70",
            glowColor: "rgba(245, 158, 11, 0.45)",
            badgeText: "☀️ 태양의 성전 (Solar Sanctuary)",
            badgeClass: "bg-amber-950/80 text-amber-300 border-amber-500/70 shadow-[0_0_20px_rgba(245,158,11,0.3)]",
            description: "영원히 타오르는 태양의 신열과 황금빛 광염이 작열하는 태양의 사자의 성역입니다."
        },
        matchedNations: ["신계", "양의 기운의 성전"]
    },

    // 1-3. 광휘의 사자의 성소
    shingye_radiance_sanctuary: {
        id: "shingye_radiance_sanctuary",
        name: "광휘의 사자의 성소",
        region: "신계",
        concept: "눈부신 절대 백색광과 성스러운 크리스탈 광휘",
        prompt: "Dazzling crystal sanctuary bathed in pure white holy radiance, floating translucent diamond spires, shimmering light prisms, floating halos of light, 8k masterpiece",
        localPath: "assets/visuals/backgrounds/shingye/shingye_radiance_sanctuary.jpg",
        fallbackUrl: "assets/visuals/backgrounds/shingye_celestial_sanctuary.jpg",
        theme: {
            overlayGradient: "linear-gradient(to bottom, rgba(20, 20, 30, 0.75) 0%, rgba(40, 35, 20, 0.45) 50%, rgba(15, 23, 42, 0.9) 100%)",
            accentColor: "text-yellow-200",
            borderColor: "border-yellow-300/70",
            glowColor: "rgba(254, 240, 138, 0.45)",
            badgeText: "🌟 광휘의 성소 (Radiance Sanctuary)",
            badgeClass: "bg-yellow-950/80 text-yellow-200 border-yellow-300/70 shadow-[0_0_20px_rgba(254,240,138,0.3)]",
            description: "티끌 하나 없는 순수한 성광과 백색의 수정 첨탑들이 찬란히 빛나는 절대 광휘의 성소입니다."
        },
        matchedNations: ["신계", "양의 기운의 성전"]
    },

    // 1-4. 초화의 사자의 성초
    shingye_nature_sanctuary: {
        id: "shingye_nature_sanctuary",
        name: "초화의 사자의 성초",
        region: "신계",
        concept: "태고의 생명력과 에메랄드빛 신비의 화원",
        prompt: "Celestial world tree sanctuary with floating emerald islands, glowing green life essence vines, giant blooming divine flowers, celestial butterflies, tranquil garden of deities, 8k masterpiece",
        localPath: "assets/visuals/backgrounds/shingye/shingye_nature_sanctuary.jpg",
        fallbackUrl: "assets/visuals/backgrounds/shingye_celestial_sanctuary.jpg",
        theme: {
            overlayGradient: "linear-gradient(to bottom, rgba(6, 78, 59, 0.75) 0%, rgba(4, 47, 46, 0.45) 50%, rgba(2, 6, 23, 0.92) 100%)",
            accentColor: "text-emerald-300",
            borderColor: "border-emerald-500/70",
            glowColor: "rgba(16, 185, 129, 0.4)",
            badgeText: "🌿 초화의 성초 (Verdant Sanctuary)",
            badgeClass: "bg-emerald-950/80 text-emerald-300 border-emerald-500/70 shadow-[0_0_20px_rgba(16,185,129,0.3)]",
            description: "생명의 숨결이 약동하며 신성한 세계수와 에메랄드빛 영초들이 만개한 신비의 화원입니다."
        },
        matchedNations: ["신계", "양의 기운의 성전"]
    },

    // 1-5. 화염의 사자의 성화
    shingye_fire_citadel: {
        id: "shingye_fire_citadel",
        name: "화염의 사자의 성화",
        region: "신계",
        concept: "신성한 정화의 불꽃과 붉은 성채",
        prompt: "Holy flame fortress in the heavens, swirling sacred crimson and gold flames, ornate floating brazier temples, purification fire waterfalls, dramatic warm atmospheric lighting, 8k masterpiece",
        localPath: "assets/visuals/backgrounds/shingye/shingye_fire_citadel.jpg",
        fallbackUrl: "assets/visuals/backgrounds/shingye_celestial_sanctuary.jpg",
        theme: {
            overlayGradient: "linear-gradient(to bottom, rgba(69, 10, 10, 0.75) 0%, rgba(120, 20, 20, 0.45) 50%, rgba(15, 23, 42, 0.92) 100%)",
            accentColor: "text-red-400",
            borderColor: "border-red-500/70",
            glowColor: "rgba(239, 68, 68, 0.45)",
            badgeText: "🔥 화염의 성화 (Blaze Citadel)",
            badgeClass: "bg-red-950/80 text-red-300 border-red-500/70 shadow-[0_0_20px_rgba(239,68,68,0.3)]",
            description: "모든 부정을 정화하는 신성한 성화가 기둥을 이루어 솟아오르는 불멸의 화염 성역입니다."
        },
        matchedNations: ["신계", "양의 기운의 성전"]
    },

    // 1-6. 해수의 사자의 성수전
    shingye_sea_palace: {
        id: "shingye_sea_palace",
        name: "해수의 사자의 성수전",
        region: "신계",
        concept: "맑고 투명한 천상의 대해와 사파이어 궁궐",
        prompt: "Floating celestial ocean palace in the clouds, ethereal crystal water streams spiraling upward, sapphire water pillars, sacred marine motifs, glowing azure depths, 8k masterpiece",
        localPath: "assets/visuals/backgrounds/shingye/shingye_sea_palace.jpg",
        fallbackUrl: "assets/visuals/backgrounds/shingye_celestial_sanctuary.jpg",
        theme: {
            overlayGradient: "linear-gradient(to bottom, rgba(12, 74, 110, 0.75) 0%, rgba(3, 105, 161, 0.45) 50%, rgba(2, 6, 23, 0.92) 100%)",
            accentColor: "text-cyan-300",
            borderColor: "border-cyan-500/70",
            glowColor: "rgba(14, 165, 233, 0.4)",
            badgeText: "🌊 해수의 성수전 (Oceanic Palace)",
            badgeClass: "bg-cyan-950/80 text-cyan-300 border-cyan-500/70 shadow-[0_0_20px_rgba(14,165,233,0.3)]",
            description: "부유하는 천상 대양의 푸른 물결과 사파이어 수정 기둥들이 신비롭게 넘실거리는 성수전입니다."
        },
        matchedNations: ["신계", "양의 기운의 성전"]
    },

    // 1-7. 전격의 사자의 성전
    shingye_thunder_temple: {
        id: "shingye_thunder_temple",
        name: "전격의 사자의 성전",
        region: "신계",
        concept: "천둥번개의 뇌전과 황금 번갯불이 교차하는 성전",
        prompt: "Heavenly divine lightning temple, crackling golden and purple lightning bolts arcing between floating storm obelisks, towering celestial thunder conductors, electric ozone clouds, 8k masterpiece",
        localPath: "assets/visuals/backgrounds/shingye/shingye_thunder_temple.jpg",
        fallbackUrl: "assets/visuals/backgrounds/shingye_celestial_sanctuary.jpg",
        theme: {
            overlayGradient: "linear-gradient(to bottom, rgba(46, 16, 101, 0.75) 0%, rgba(88, 28, 135, 0.45) 50%, rgba(15, 23, 42, 0.92) 100%)",
            accentColor: "text-amber-300",
            borderColor: "border-amber-400/70",
            glowColor: "rgba(217, 119, 6, 0.45)",
            badgeText: "⚡ 전격의 성전 (Thunder Temple)",
            badgeClass: "bg-purple-950/80 text-amber-200 border-amber-400/70 shadow-[0_0_20px_rgba(217,119,6,0.3)]",
            description: "천상을 뒤흔드는 신성한 뇌명과 금빛 번개가 수정 오벨리스크를 타고 포효하는 전격의 성역입니다."
        },
        matchedNations: ["신계", "양의 기운의 성전"]
    },

    // 1-8. 월광의 사자의 성
    shingye_moonlight_castle: {
        id: "shingye_moonlight_castle",
        name: "월광의 사자의 성",
        region: "신계",
        concept: "은은하고 고요한 보름달빛과 신비의 월광성",
        prompt: "Ethereal silver moonlight castle floating amidst starry cosmic nebulae, colossal radiant full moon in background, glowing pale blue celestial spires, stardust water pools, serene mystic night, 8k masterpiece",
        localPath: "assets/visuals/backgrounds/shingye/shingye_moonlight_castle.jpg",
        fallbackUrl: "assets/visuals/backgrounds/shingye_celestial_sanctuary.jpg",
        theme: {
            overlayGradient: "linear-gradient(to bottom, rgba(15, 23, 42, 0.8) 0%, rgba(30, 27, 75, 0.5) 50%, rgba(2, 6, 23, 0.95) 100%)",
            accentColor: "text-indigo-200",
            borderColor: "border-indigo-400/70",
            glowColor: "rgba(199, 210, 254, 0.4)",
            badgeText: "🌙 월광의 성 (Moonlight Castle)",
            badgeClass: "bg-indigo-950/80 text-indigo-200 border-indigo-400/70 shadow-[0_0_20px_rgba(199,210,254,0.3)]",
            description: "영원히 지지 않는 은빛 보름달과 고요한 밤하늘의 성운이 흐르는 월광의 사자의 신성 거처입니다."
        },
        matchedNations: ["신계", "음의 기운의 성전"]
    },

    // 1-9. 질풍의 사자의 질풍전
    shingye_gale_palace: {
        id: "shingye_gale_palace",
        name: "질풍의 사자의 질풍전",
        region: "신계",
        concept: "휘몰아치는 천상의 청록색 돌풍과 유려한 비상 누각",
        prompt: "Celestial palace of gale and tempests, dynamic spiraling wind vortex currents, floating aerodynamic teal jade towers, soaring wind streamers, majestic sky currents, 8k masterpiece",
        localPath: "assets/visuals/backgrounds/shingye/shingye_gale_palace.jpg",
        fallbackUrl: "assets/visuals/backgrounds/shingye_celestial_sanctuary.jpg",
        theme: {
            overlayGradient: "linear-gradient(to bottom, rgba(19, 78, 74, 0.75) 0%, rgba(13, 148, 136, 0.4) 50%, rgba(2, 6, 23, 0.92) 100%)",
            accentColor: "text-teal-300",
            borderColor: "border-teal-400/70",
            glowColor: "rgba(45, 212, 191, 0.4)",
            badgeText: "🌪️ 질풍의 질풍전 (Gale Palace)",
            badgeClass: "bg-teal-950/80 text-teal-200 border-teal-400/70 shadow-[0_0_20px_rgba(45,212,191,0.3)]",
            description: "자유로운 바람의 날개가 허공을 가르고 옥빛 폭풍이 부유도를 감싸는 질풍의 사자의 성역입니다."
        },
        matchedNations: ["신계", "음의 기운의 성전"]
    },

    // 1-10. 빙결의 사자의 빙궁
    shingye_ice_palace: {
        id: "shingye_ice_palace",
        name: "빙결의 사자의 빙궁",
        region: "신계",
        concept: "순백의 만년빙과 서리 맺힌 다이아몬드 얼음 궁전",
        prompt: "Magnificent divine ice palace carved from perennial glacier crystals, floating diamond spires with frost runes, delicate snowflake particles, icy aurora borealis in sky, 8k masterpiece",
        localPath: "assets/visuals/backgrounds/shingye/shingye_ice_palace.jpg",
        fallbackUrl: "assets/visuals/backgrounds/shingye_celestial_sanctuary.jpg",
        theme: {
            overlayGradient: "linear-gradient(to bottom, rgba(12, 74, 110, 0.75) 0%, rgba(56, 189, 248, 0.35) 50%, rgba(2, 6, 23, 0.94) 100%)",
            accentColor: "text-sky-200",
            borderColor: "border-sky-400/70",
            glowColor: "rgba(125, 211, 252, 0.45)",
            badgeText: "❄️ 빙결의 빙궁 (Frost Palace)",
            badgeClass: "bg-sky-950/80 text-sky-200 border-sky-400/70 shadow-[0_0_20px_rgba(125,211,252,0.3)]",
            description: "영구동토의 절대 영도가 머무는 서리꽃과 투명한 다이아몬드 빙정으로 조각된 영롱한 빙궁입니다."
        },
        matchedNations: ["신계", "음의 기운의 성전"]
    },

    // 1-11. 강철의 사자의 강성
    shingye_steel_fortress: {
        id: "shingye_steel_fortress",
        name: "강철의 사자의 강성",
        region: "신계",
        concept: "부서지지 않는 백금과 강철의 천상 난공불락 요새",
        prompt: "Impenetrable celestial steel fortress, colossal divine platinum walls inlaid with glowing runic gold, giant sword-like towers, holy divine armor aesthetic, epic scale, 8k masterpiece",
        localPath: "assets/visuals/backgrounds/shingye/shingye_steel_fortress.jpg",
        fallbackUrl: "assets/visuals/backgrounds/shingye_celestial_sanctuary.jpg",
        theme: {
            overlayGradient: "linear-gradient(to bottom, rgba(30, 41, 59, 0.8) 0%, rgba(71, 85, 105, 0.45) 50%, rgba(2, 6, 23, 0.94) 100%)",
            accentColor: "text-slate-200",
            borderColor: "border-slate-400/70",
            glowColor: "rgba(226, 232, 240, 0.4)",
            badgeText: "🛡️ 강철의 강성 (Steel Fortress)",
            badgeClass: "bg-slate-900/80 text-slate-200 border-slate-400/70 shadow-[0_0_20px_rgba(226,232,240,0.3)]",
            description: "어떠한 악도 꿰뚫지 못하는 백금의 방벽과 거대한 신성 강철 기둥이 위용을 뽐내는 철옹성입니다."
        },
        matchedNations: ["신계", "음의 기운의 성전"]
    },

    // 1-12. 지령의 사자의 궁궐
    shingye_earth_palace: {
        id: "shingye_earth_palace",
        name: "지령의 사자의 궁궐",
        region: "신계",
        concept: "황금빛 광맥과 고대 암석의 웅장한 대지 궁전",
        prompt: "Monumental floating earthen palace, primordial bedrock towers infused with glowing golden ore veins and amber geodes, massive levitating megaliths, ancient divine sanctuary, 8k masterpiece",
        localPath: "assets/visuals/backgrounds/shingye/shingye_earth_palace.jpg",
        fallbackUrl: "assets/visuals/backgrounds/shingye_celestial_sanctuary.jpg",
        theme: {
            overlayGradient: "linear-gradient(to bottom, rgba(67, 40, 16, 0.75) 0%, rgba(120, 80, 20, 0.45) 50%, rgba(15, 23, 42, 0.92) 100%)",
            accentColor: "text-amber-200",
            borderColor: "border-amber-400/70",
            glowColor: "rgba(251, 191, 36, 0.4)",
            badgeText: "⛰️ 지령의 궁궐 (Earthen Palace)",
            badgeClass: "bg-amber-950/80 text-amber-200 border-amber-400/70 shadow-[0_0_20px_rgba(251,191,36,0.3)]",
            description: "태초의 대지가 품은 황금 광석과 묵직한 거석들이 신성한 율동으로 부유하는 지령의 궁궐입니다."
        },
        matchedNations: ["신계", "음의 기운의 성전"]
    },

    // 1-13. 암연의 사자의 심연
    shingye_dark_abyss: {
        id: "shingye_dark_abyss",
        name: "암연의 사자의 심연",
        region: "신계",
        concept: "모든 것을 집어삼키는 자줏빛 신성 흑동과 공허의 심연",
        prompt: "Sacred dark abyss sanctuary in cosmic void, majestic event horizon with swirling deep purple nebula and obsidian floating thrones, gravitational dark halos, eerie sublime beauty, 8k masterpiece",
        localPath: "assets/visuals/backgrounds/shingye/shingye_dark_abyss.jpg",
        fallbackUrl: "assets/visuals/backgrounds/shingye_celestial_sanctuary.jpg",
        theme: {
            overlayGradient: "linear-gradient(to bottom, rgba(20, 5, 30, 0.85) 0%, rgba(59, 7, 100, 0.55) 50%, rgba(0, 0, 0, 0.95) 100%)",
            accentColor: "text-purple-300",
            borderColor: "border-purple-500/70",
            glowColor: "rgba(192, 132, 252, 0.45)",
            badgeText: "🌌 암연의 심연 (Abyssal Void)",
            badgeClass: "bg-purple-950/85 text-purple-200 border-purple-500/70 shadow-[0_0_20px_rgba(192,132,252,0.3)]",
            description: "빛마저 휘감겨 사라지는 신성한 흑야의 특이점과 보랏빛 성운이 침묵을 지키는 심연의 성역입니다."
        },
        matchedNations: ["신계", "음의 기운의 성전"]
    },

    // 1-14. 무의 궁궐
    shingye_void_palace: {
        id: "shingye_void_palace",
        name: "무의 궁궐",
        region: "신계",
        concept: "모든 것이 비어 있으나 모든 것을 잉태하는 초월의 무",
        prompt: "Transcendental void palace beyond space and time, monochrome minimalist ethereal architecture dissolving into pure emptiness, sacred silver geometry, eternal silence and ultimate truth, 8k masterpiece",
        localPath: "assets/visuals/backgrounds/shingye/shingye_void_palace.jpg",
        fallbackUrl: "assets/visuals/backgrounds/shingye_celestial_sanctuary.jpg",
        theme: {
            overlayGradient: "linear-gradient(to bottom, rgba(15, 15, 20, 0.8) 0%, rgba(30, 30, 40, 0.5) 50%, rgba(2, 6, 23, 0.95) 100%)",
            accentColor: "text-zinc-300",
            borderColor: "border-zinc-400/70",
            glowColor: "rgba(212, 212, 216, 0.35)",
            badgeText: "☯️ 무의 궁궐 (Transcendental Void)",
            badgeClass: "bg-zinc-900/85 text-zinc-200 border-zinc-500/70 shadow-[0_0_20px_rgba(212,212,216,0.25)]",
            description: "형상도 시작도 끝도 없는 태허의 정적 속에서 시공간을 초월하여 고요히 존재하는 궁궐입니다."
        },
        matchedNations: ["신계", "무의 궁"]
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
 * 신계 14개 성전(도시)별 전용 배경 매니페스트 키 매핑
 */
const SHINGYE_CITY_TO_MANIFEST_KEY: Record<string, string> = {
    "신의 거처": "shingye_god_abode",
    "태양의 사자의 성전": "shingye_sun_temple",
    "광휘의 사자의 성소": "shingye_radiance_sanctuary",
    "초화의 사자의 성초": "shingye_nature_sanctuary",
    "화염의 사자의 성화": "shingye_fire_citadel",
    "해수의 사자의 성수전": "shingye_sea_palace",
    "전격의 사자의 성전": "shingye_thunder_temple",
    "월광의 사자의 성": "shingye_moonlight_castle",
    "질풍의 사자의 질풍전": "shingye_gale_palace",
    "빙결의 사자의 빙궁": "shingye_ice_palace",
    "강철의 사자의 강성": "shingye_steel_fortress",
    "지령의 사자의 궁궐": "shingye_earth_palace",
    "암연의 사자의 심연": "shingye_dark_abyss",
    "무의 궁궐": "shingye_void_palace",
};

/**
 * 주어진 대륙(region), 국가(nation), 도시(city) 정보에 부합하는 최적의 판타지 배경 구성을 반환합니다.
 */
export function getCityBackgroundConfig(region?: string, nation?: string, city?: string): CityBackgroundConfig {
    const r = (region || '').trim();
    const n = (nation || '').trim();
    const c = (city || '').trim();

    // 1. 신계 판정 (14개 성전별 고유 고해상도 배경 정밀 매칭)
    const isShingyeDomain = r === '신계' || n === '신의 성소' || n.includes('성전') || n === '무의 궁';
    if (isShingyeDomain) {
        // 1-1. 도시명 정확 매칭
        if (c && SHINGYE_CITY_TO_MANIFEST_KEY[c] && CITY_BACKGROUND_MANIFEST[SHINGYE_CITY_TO_MANIFEST_KEY[c]]) {
            return CITY_BACKGROUND_MANIFEST[SHINGYE_CITY_TO_MANIFEST_KEY[c]];
        }

        // 1-2. 도시명 부분/키워드 매칭
        if (c) {
            for (const [keyName, manifestKey] of Object.entries(SHINGYE_CITY_TO_MANIFEST_KEY)) {
                if (c.includes(keyName) || keyName.includes(c)) {
                    if (CITY_BACKGROUND_MANIFEST[manifestKey]) {
                        return CITY_BACKGROUND_MANIFEST[manifestKey];
                    }
                }
            }
            if (c.includes('태양')) return CITY_BACKGROUND_MANIFEST.shingye_sun_temple;
            if (c.includes('광휘')) return CITY_BACKGROUND_MANIFEST.shingye_radiance_sanctuary;
            if (c.includes('초화')) return CITY_BACKGROUND_MANIFEST.shingye_nature_sanctuary;
            if (c.includes('화염') || c.includes('성화')) return CITY_BACKGROUND_MANIFEST.shingye_fire_citadel;
            if (c.includes('해수') || c.includes('성수')) return CITY_BACKGROUND_MANIFEST.shingye_sea_palace;
            if (c.includes('전격') || c.includes('뇌전')) return CITY_BACKGROUND_MANIFEST.shingye_thunder_temple;
            if (c.includes('월광')) return CITY_BACKGROUND_MANIFEST.shingye_moonlight_castle;
            if (c.includes('질풍')) return CITY_BACKGROUND_MANIFEST.shingye_gale_palace;
            if (c.includes('빙결') || c.includes('빙궁')) return CITY_BACKGROUND_MANIFEST.shingye_ice_palace;
            if (c.includes('강철') || c.includes('강성')) return CITY_BACKGROUND_MANIFEST.shingye_steel_fortress;
            if (c.includes('지령')) return CITY_BACKGROUND_MANIFEST.shingye_earth_palace;
            if (c.includes('암연') || c.includes('심연')) return CITY_BACKGROUND_MANIFEST.shingye_dark_abyss;
            if (c.includes('신의 거처') || c.includes('창조신')) return CITY_BACKGROUND_MANIFEST.shingye_god_abode;
            if (c.includes('무의 궁')) return CITY_BACKGROUND_MANIFEST.shingye_void_palace;
        }

        // 1-3. 국가명 기준 매칭
        if (n === '신의 성소') return CITY_BACKGROUND_MANIFEST.shingye_god_abode;
        if (n === '무의 궁') return CITY_BACKGROUND_MANIFEST.shingye_void_palace;
        if (n === '양의 기운의 성전') return CITY_BACKGROUND_MANIFEST.shingye_sun_temple;
        if (n === '음의 기운의 성전') return CITY_BACKGROUND_MANIFEST.shingye_moonlight_castle;

        // 1-4. 신계 기본 배경 폴백
        return CITY_BACKGROUND_MANIFEST.shingye_god_abode || CITY_BACKGROUND_MANIFEST.shingye_celestial_sanctuary;
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
