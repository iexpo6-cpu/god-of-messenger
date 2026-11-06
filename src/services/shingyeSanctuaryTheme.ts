// services/shingyeSanctuaryTheme.ts
// 신계(Shingye)의 각 성전(도시)별 고유 신성 천체 및 배경 테마 정의

export interface ShingyeTheme {
    sanctuaryTitle: string;
    bgGradient: string;
    gridPattern: string;
    sunbeam: string;
    ambientGlow: string;
    orbGradient1: string;
    orbGradient2: string;
    badgeColor: string;
    badgeBg: string;
    badgeBorder: string;
    celestial: {
        type: 'sun' | 'moon' | 'holy_core' | 'storm' | 'frost' | 'abyss' | 'lightning' | 'water' | 'earth' | 'void';
        name: string;
        coreClass: string;
        glowClass: string;
        coronaClass: string;
        flareClass: string;
        innerVisualClass?: string;
    };
    particleType: 'solar' | 'sparkle' | 'stars' | 'lightning' | 'water' | 'frost' | 'abyss' | 'nature' | 'void';
}

export const SHINGYE_SANCTUARY_THEMES: Record<string, ShingyeTheme> = {
    // 1. 태양의 사자의 성전 - 강렬하게 타오르는 영원의 태양
    "태양의 사자의 성전": {
        sanctuaryTitle: "태양의 사자의 성역",
        bgGradient: "from-amber-950 via-orange-950/90 to-red-950/80",
        gridPattern: "radial-gradient(#f59e0b40 1.5px, transparent 1.5px)",
        sunbeam: "from-amber-400/40 via-orange-300/20 to-transparent",
        ambientGlow: "bg-amber-500/30",
        orbGradient1: "bg-amber-500/45",
        orbGradient2: "bg-orange-600/40",
        badgeColor: "text-amber-300",
        badgeBg: "bg-amber-950/90",
        badgeBorder: "border-amber-500/70",
        celestial: {
            type: 'sun',
            name: '영원의 태양',
            coreClass: 'from-yellow-100 via-amber-400 to-orange-600',
            glowClass: 'shadow-[0_0_90px_35px_rgba(245,158,11,0.8)]',
            coronaClass: 'bg-amber-400/40',
            flareClass: 'from-amber-300/50 via-orange-500/30 to-transparent',
            innerVisualClass: 'w-14 h-14 sm:w-20 sm:h-20 rounded-full bg-white/50 blur-[2px]'
        },
        particleType: 'solar'
    },

    // 2. 광휘의 사자의 성소 - 눈부신 백색광과 절대 광휘
    "광휘의 사자의 성소": {
        sanctuaryTitle: "광휘의 사자의 성역",
        bgGradient: "from-yellow-950/70 via-amber-900/60 to-slate-900",
        gridPattern: "radial-gradient(#fef08a40 1.5px, transparent 1.5px)",
        sunbeam: "from-yellow-200/40 via-amber-100/25 to-transparent",
        ambientGlow: "bg-yellow-300/30",
        orbGradient1: "bg-yellow-300/40",
        orbGradient2: "bg-amber-200/35",
        badgeColor: "text-yellow-200",
        badgeBg: "bg-yellow-950/90",
        badgeBorder: "border-yellow-400/70",
        celestial: {
            type: 'holy_core',
            name: '절대 광휘핵',
            coreClass: 'from-white via-yellow-100 to-amber-300',
            glowClass: 'shadow-[0_0_95px_38px_rgba(254,240,138,0.85)]',
            coronaClass: 'bg-yellow-200/40',
            flareClass: 'from-white/60 via-yellow-200/30 to-transparent',
            innerVisualClass: 'w-14 h-14 sm:w-20 sm:h-20 rounded-full bg-white blur-[1px]'
        },
        particleType: 'sparkle'
    },

    // 3. 초화의 사자의 성초 - 생명력과 에메랄드빛 약동
    "초화의 사자의 성초": {
        sanctuaryTitle: "초화의 사자의 성역",
        bgGradient: "from-emerald-950 via-teal-950/80 to-slate-950",
        gridPattern: "radial-gradient(#34d39940 1.5px, transparent 1.5px)",
        sunbeam: "from-emerald-400/35 via-teal-300/20 to-transparent",
        ambientGlow: "bg-emerald-500/25",
        orbGradient1: "bg-emerald-500/40",
        orbGradient2: "bg-teal-400/35",
        badgeColor: "text-emerald-300",
        badgeBg: "bg-emerald-950/90",
        badgeBorder: "border-emerald-500/70",
        celestial: {
            type: 'holy_core',
            name: '생명의 비취핵',
            coreClass: 'from-emerald-100 via-emerald-400 to-teal-600',
            glowClass: 'shadow-[0_0_85px_30px_rgba(16,185,129,0.7)]',
            coronaClass: 'bg-emerald-400/35',
            flareClass: 'from-emerald-300/40 via-teal-400/20 to-transparent',
            innerVisualClass: 'w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-emerald-200/50 blur-[2px]'
        },
        particleType: 'nature'
    },

    // 4. 화염의 사자의 성화 - 작열하는 성화의 불기둥
    "화염의 사자의 성화": {
        sanctuaryTitle: "화염의 사자의 성역",
        bgGradient: "from-red-950 via-rose-950/90 to-amber-950/80",
        gridPattern: "radial-gradient(#f8717140 1.5px, transparent 1.5px)",
        sunbeam: "from-red-500/35 via-orange-400/20 to-transparent",
        ambientGlow: "bg-red-600/30",
        orbGradient1: "bg-red-500/45",
        orbGradient2: "bg-orange-500/40",
        badgeColor: "text-red-300",
        badgeBg: "bg-red-950/90",
        badgeBorder: "border-red-500/70",
        celestial: {
            type: 'sun',
            name: '작열의 성화',
            coreClass: 'from-yellow-200 via-orange-500 to-red-600',
            glowClass: 'shadow-[0_0_90px_35px_rgba(239,68,68,0.8)]',
            coronaClass: 'bg-rose-500/40',
            flareClass: 'from-orange-400/50 via-red-500/30 to-transparent',
            innerVisualClass: 'w-12 h-12 sm:w-18 sm:h-18 rounded-full bg-yellow-200/60 blur-[2px]'
        },
        particleType: 'solar'
    },

    // 5. 해수의 사자의 성수전 - 성스러운 사파이어 성수핵
    "해수의 사자의 성수전": {
        sanctuaryTitle: "해수의 사자의 성역",
        bgGradient: "from-cyan-950 via-blue-950/90 to-slate-950",
        gridPattern: "radial-gradient(#38bdf840 1.5px, transparent 1.5px)",
        sunbeam: "from-cyan-400/35 via-blue-300/20 to-transparent",
        ambientGlow: "bg-cyan-500/25",
        orbGradient1: "bg-cyan-400/40",
        orbGradient2: "bg-blue-500/35",
        badgeColor: "text-cyan-300",
        badgeBg: "bg-cyan-950/90",
        badgeBorder: "border-cyan-500/70",
        celestial: {
            type: 'water',
            name: '사파이어 성수핵',
            coreClass: 'from-cyan-100 via-sky-400 to-blue-600',
            glowClass: 'shadow-[0_0_85px_30px_rgba(14,165,233,0.75)]',
            coronaClass: 'bg-cyan-400/35',
            flareClass: 'from-cyan-300/40 via-blue-400/20 to-transparent',
            innerVisualClass: 'w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-cyan-100/50 blur-[2px]'
        },
        particleType: 'water'
    },

    // 6. 전격의 사자의 성전 - 벼락과 뇌전의 뇌화구
    "전격의 사자의 성전": {
        sanctuaryTitle: "전격의 사자의 성역",
        bgGradient: "from-indigo-950 via-purple-950/90 to-amber-950/60",
        gridPattern: "radial-gradient(#a855f740 1.5px, transparent 1.5px)",
        sunbeam: "from-amber-300/30 via-purple-400/20 to-transparent",
        ambientGlow: "bg-amber-400/25",
        orbGradient1: "bg-purple-600/40",
        orbGradient2: "bg-amber-400/35",
        badgeColor: "text-amber-200",
        badgeBg: "bg-purple-950/90",
        badgeBorder: "border-amber-400/70",
        celestial: {
            type: 'lightning',
            name: '뇌전의 성핵',
            coreClass: 'from-white via-amber-300 to-purple-600',
            glowClass: 'shadow-[0_0_90px_35px_rgba(217,119,6,0.8)]',
            coronaClass: 'bg-amber-300/40',
            flareClass: 'from-amber-200/50 via-purple-400/30 to-transparent',
            innerVisualClass: 'w-12 h-12 sm:w-18 sm:h-18 rounded-full bg-white/70 blur-[1px]'
        },
        particleType: 'lightning'
    },

    // 7. 월광의 사자의 성 - 영롱한 영원의 보름달
    "월광의 사자의 성": {
        sanctuaryTitle: "월광의 사자의 성역",
        bgGradient: "from-slate-950 via-indigo-950 to-blue-950",
        gridPattern: "radial-gradient(#93c5fd40 1.5px, transparent 1.5px)",
        sunbeam: "from-indigo-300/30 via-blue-200/15 to-transparent",
        ambientGlow: "bg-indigo-400/25",
        orbGradient1: "bg-blue-500/40",
        orbGradient2: "bg-indigo-600/35",
        badgeColor: "text-indigo-200",
        badgeBg: "bg-indigo-950/90",
        badgeBorder: "border-indigo-400/70",
        celestial: {
            type: 'moon',
            name: '영원의 월광',
            coreClass: 'from-white via-indigo-100 to-slate-200',
            glowClass: 'shadow-[0_0_85px_32px_rgba(199,210,254,0.75)]',
            coronaClass: 'bg-blue-400/30',
            flareClass: 'from-blue-200/40 via-indigo-300/20 to-transparent',
            innerVisualClass: 'w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-white/60 blur-[1px]'
        },
        particleType: 'stars'
    },

    // 8. 질풍의 사자의 질풍전 - 소용돌이치는 천상의 와류
    "질풍의 사자의 질풍전": {
        sanctuaryTitle: "질풍의 사자의 성역",
        bgGradient: "from-teal-950 via-emerald-950/75 to-slate-950",
        gridPattern: "radial-gradient(#2dd4bf40 1.5px, transparent 1.5px)",
        sunbeam: "from-teal-300/30 via-emerald-200/15 to-transparent",
        ambientGlow: "bg-teal-400/25",
        orbGradient1: "bg-teal-500/40",
        orbGradient2: "bg-emerald-600/35",
        badgeColor: "text-teal-200",
        badgeBg: "bg-teal-950/90",
        badgeBorder: "border-teal-400/70",
        celestial: {
            type: 'storm',
            name: '질풍의 천구',
            coreClass: 'from-teal-100 via-teal-300 to-emerald-600',
            glowClass: 'shadow-[0_0_80px_28px_rgba(45,212,191,0.7)]',
            coronaClass: 'bg-teal-300/35',
            flareClass: 'from-teal-200/40 via-emerald-300/20 to-transparent',
            innerVisualClass: 'w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-teal-100/50 blur-[2px]'
        },
        particleType: 'nature'
    },

    // 9. 빙결의 사자의 빙궁 - 영구동토의 다이아몬드 빙핵
    "빙결의 사자의 빙궁": {
        sanctuaryTitle: "빙결의 사자의 성역",
        bgGradient: "from-sky-950 via-cyan-950/80 to-indigo-950",
        gridPattern: "radial-gradient(#7dd3fc40 1.5px, transparent 1.5px)",
        sunbeam: "from-sky-300/35 via-cyan-200/20 to-transparent",
        ambientGlow: "bg-sky-400/25",
        orbGradient1: "bg-sky-400/40",
        orbGradient2: "bg-indigo-400/35",
        badgeColor: "text-sky-200",
        badgeBg: "bg-sky-950/90",
        badgeBorder: "border-sky-400/70",
        celestial: {
            type: 'frost',
            name: '영구동토 빙핵',
            coreClass: 'from-white via-sky-200 to-cyan-400',
            glowClass: 'shadow-[0_0_85px_30px_rgba(125,211,252,0.75)]',
            coronaClass: 'bg-cyan-300/35',
            flareClass: 'from-white/50 via-sky-300/25 to-transparent',
            innerVisualClass: 'w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-white/70 blur-[1px]'
        },
        particleType: 'frost'
    },

    // 10. 강철의 사자의 강성 - 불멸의 백금 성검좌
    "강철의 사자의 강성": {
        sanctuaryTitle: "강철의 사자의 성역",
        bgGradient: "from-slate-900 via-zinc-950 to-amber-950/50",
        gridPattern: "radial-gradient(#e2e8f035 1.5px, transparent 1.5px)",
        sunbeam: "from-slate-200/30 via-amber-200/15 to-transparent",
        ambientGlow: "bg-slate-300/20",
        orbGradient1: "bg-slate-400/35",
        orbGradient2: "bg-amber-500/30",
        badgeColor: "text-slate-200",
        badgeBg: "bg-slate-900/90",
        badgeBorder: "border-slate-400/70",
        celestial: {
            type: 'holy_core',
            name: '불멸의 성검핵',
            coreClass: 'from-white via-slate-200 to-amber-400',
            glowClass: 'shadow-[0_0_80px_28px_rgba(226,232,240,0.7)]',
            coronaClass: 'bg-slate-200/30',
            flareClass: 'from-white/40 via-amber-300/20 to-transparent',
            innerVisualClass: 'w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-white/60 blur-[1px]'
        },
        particleType: 'sparkle'
    },

    // 11. 지령의 사자의 궁궐 - 대지의 황금 보옥핵
    "지령의 사자의 궁궐": {
        sanctuaryTitle: "지령의 사자의 성역",
        bgGradient: "from-amber-950 via-stone-900 to-yellow-950/80",
        gridPattern: "radial-gradient(#fbbf2440 1.5px, transparent 1.5px)",
        sunbeam: "from-amber-300/35 via-yellow-200/20 to-transparent",
        ambientGlow: "bg-amber-500/25",
        orbGradient1: "bg-amber-500/40",
        orbGradient2: "bg-yellow-600/35",
        badgeColor: "text-amber-200",
        badgeBg: "bg-amber-950/90",
        badgeBorder: "border-amber-400/70",
        celestial: {
            type: 'earth',
            name: '황금 대지핵',
            coreClass: 'from-amber-100 via-amber-400 to-yellow-700',
            glowClass: 'shadow-[0_0_85px_30px_rgba(251,191,36,0.75)]',
            coronaClass: 'bg-amber-400/35',
            flareClass: 'from-amber-300/40 via-yellow-500/20 to-transparent',
            innerVisualClass: 'w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-amber-200/50 blur-[2px]'
        },
        particleType: 'sparkle'
    },

    // 12. 암연의 사자의 심연 - 신비로운 심연의 특이점
    "암연의 사자의 심연": {
        sanctuaryTitle: "암연의 사자의 성역",
        bgGradient: "from-black via-purple-950/95 to-slate-950",
        gridPattern: "radial-gradient(#c084fc40 1.5px, transparent 1.5px)",
        sunbeam: "from-purple-500/30 via-indigo-400/15 to-transparent",
        ambientGlow: "bg-purple-600/25",
        orbGradient1: "bg-purple-700/40",
        orbGradient2: "bg-indigo-900/35",
        badgeColor: "text-purple-300",
        badgeBg: "bg-purple-950/90",
        badgeBorder: "border-purple-500/70",
        celestial: {
            type: 'abyss',
            name: '심연의 특이점',
            coreClass: 'from-slate-900 via-purple-950 to-black',
            glowClass: 'shadow-[0_0_90px_35px_rgba(192,132,252,0.75)]',
            coronaClass: 'bg-purple-600/40',
            flareClass: 'from-purple-400/40 via-indigo-500/25 to-transparent',
            innerVisualClass: 'w-10 h-10 sm:w-14 sm:h-14 rounded-full bg-black border-2 border-purple-400/60'
        },
        particleType: 'abyss'
    },

    // 13. 신의 거처 (신의 성소) - 창조신의 시원핵
    "신의 거처": {
        sanctuaryTitle: "창조신의 절대 성소",
        bgGradient: "from-amber-950/80 via-slate-900 to-yellow-950/70",
        gridPattern: "radial-gradient(#fef08a45 1.5px, transparent 1.5px)",
        sunbeam: "from-yellow-200/45 via-amber-200/30 to-transparent",
        ambientGlow: "bg-amber-300/30",
        orbGradient1: "bg-yellow-300/45",
        orbGradient2: "bg-amber-400/40",
        badgeColor: "text-yellow-200",
        badgeBg: "bg-yellow-950/90",
        badgeBorder: "border-yellow-400/80",
        celestial: {
            type: 'holy_core',
            name: '창조의 시원핵',
            coreClass: 'from-white via-yellow-200 to-amber-400',
            glowClass: 'shadow-[0_0_100px_40px_rgba(254,240,138,0.9)]',
            coronaClass: 'bg-yellow-300/45',
            flareClass: 'from-white/60 via-amber-300/35 to-transparent',
            innerVisualClass: 'w-14 h-14 sm:w-20 sm:h-20 rounded-full bg-white blur-[2px]'
        },
        particleType: 'sparkle'
    },

    // 14. 무의 궁궐 (무의 궁) - 시공간의 공허
    "무의 궁궐": {
        sanctuaryTitle: "초월의 무의 궁궐",
        bgGradient: "from-slate-950 via-zinc-950 to-neutral-950",
        gridPattern: "radial-gradient(#e2e8f025 1.5px, transparent 1.5px)",
        sunbeam: "from-slate-400/20 via-zinc-300/10 to-transparent",
        ambientGlow: "bg-zinc-500/20",
        orbGradient1: "bg-zinc-600/30",
        orbGradient2: "bg-slate-700/25",
        badgeColor: "text-zinc-300",
        badgeBg: "bg-zinc-900/90",
        badgeBorder: "border-zinc-500/70",
        celestial: {
            type: 'void',
            name: '초월의 공허핵',
            coreClass: 'from-zinc-200 via-slate-500 to-neutral-900',
            glowClass: 'shadow-[0_0_80px_28px_rgba(226,232,240,0.5)]',
            coronaClass: 'bg-slate-400/25',
            flareClass: 'from-zinc-300/30 via-slate-400/15 to-transparent',
            innerVisualClass: 'w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-zinc-950 border border-zinc-400/40'
        },
        particleType: 'void'
    }
};

/**
 * 신계의 도시(성전) 이름을 받아 해당하는 신계 고유 테마를 반환합니다.
 * 등록되지 않은 성전일 경우 신성 기본 테마를 반환합니다.
 */
export const getShingyeSanctuaryTheme = (cityName: string): ShingyeTheme => {
    if (SHINGYE_SANCTUARY_THEMES[cityName]) {
        return SHINGYE_SANCTUARY_THEMES[cityName];
    }
    // 신계 기본 폴백
    return {
        sanctuaryTitle: "신계의 성역",
        bgGradient: "from-amber-950/70 via-slate-900 to-indigo-950",
        gridPattern: "radial-gradient(#fbbf2435 1.5px, transparent 1.5px)",
        sunbeam: "from-amber-300/30 via-yellow-200/15 to-transparent",
        ambientGlow: "bg-amber-400/20",
        orbGradient1: "bg-amber-400/35",
        orbGradient2: "bg-indigo-500/30",
        badgeColor: "text-amber-300",
        badgeBg: "bg-amber-950/90",
        badgeBorder: "border-amber-500/60",
        celestial: {
            type: 'holy_core',
            name: '신성 광휘',
            coreClass: 'from-white via-amber-200 to-yellow-400',
            glowClass: 'shadow-[0_0_85px_30px_rgba(251,191,36,0.7)]',
            coronaClass: 'bg-amber-300/35',
            flareClass: 'from-yellow-200/40 via-amber-300/20 to-transparent',
            innerVisualClass: 'w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-white/50 blur-[2px]'
        },
        particleType: 'sparkle'
    };
};
