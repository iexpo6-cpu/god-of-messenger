import React, { useMemo, useState, useEffect, useLayoutEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ClassTier, SkillFrameAnimation } from '../types';
import { Flame, Star, Zap, Snowflake, Droplets, Wind, Mountain, Eclipse, Hammer, Sun, Moon, Leaf, Sword, Activity, Sparkles, Crown, Shield, Heart, Lock, Skull } from 'lucide-react';

export interface CombatVFXData {
    id: string;
    shinryokuType: string;
    tier: ClassTier | 'NORMAL' | 'BOND' | 'BUFF' | 'DEBUFF';
    isAoe: boolean;
    targetName?: string;
    attackerName?: string;
    skillName?: string;
    duration?: number;
    illustrationUrl?: string;
    vfxTheme?: string;
    vfxColor?: string;
    vfxShape?: string;
    vfxScale?: number;
    frameAnimation?: SkillFrameAnimation;
}

export interface ShinryokuTheme {
    name: string;
    primary: string;
    secondary: string;
    accent: string;
    glow: string;
    bgGlow: string;
    particles: string[];
    icon: React.ComponentType<{ size?: number; className?: string }>;
    runes: string[];
    gradient?: string;
    description?: string;
}

export const SHINRYOKU_THEMES: Record<string, ShinryokuTheme> = {
    '화염계': {
        name: '화염계',
        primary: '#ef4444',
        secondary: '#f97316',
        accent: '#fef08a',
        glow: 'rgba(239, 68, 68, 0.6)',
        bgGlow: 'rgba(239, 68, 68, 0.25)',
        particles: ['#ef4444', '#f97316', '#fbbf24', '#f87171', '#ffedd5'],
        icon: Flame,
        runes: ['🔥', '⚡', '✦', '✶', '✹']
    },
    '광휘계': {
        name: '광휘계',
        primary: '#f59e0b',
        secondary: '#fde047',
        accent: '#ffffff',
        glow: 'rgba(245, 158, 11, 0.6)',
        bgGlow: 'rgba(250, 204, 21, 0.25)',
        particles: ['#fbbf24', '#fde047', '#ffffff', '#fef08a', '#fef9c3'],
        icon: Star,
        runes: ['✧', '★', '✡', '✦', '✨']
    },
    '전격계': {
        name: '전격계',
        primary: '#0ea5e9',
        secondary: '#facc15',
        accent: '#ffffff',
        glow: 'rgba(14, 165, 233, 0.65)',
        bgGlow: 'rgba(56, 189, 248, 0.25)',
        particles: ['#0ea5e9', '#38bdf8', '#facc15', '#e0f2fe', '#ffffff'],
        icon: Zap,
        runes: ['⚡', 'ϟ', '☈', '✦', '✶']
    },
    '빙결계': {
        name: '빙결계',
        primary: '#06b6d4',
        secondary: '#38bdf8',
        accent: '#e0f2fe',
        glow: 'rgba(6, 182, 212, 0.6)',
        bgGlow: 'rgba(6, 182, 212, 0.25)',
        particles: ['#06b6d4', '#67e8f9', '#bae6fd', '#e0f2fe', '#ffffff'],
        icon: Snowflake,
        runes: ['❄', '❅', '❆', '✧', '◈']
    },
    '해수계': {
        name: '해수계',
        primary: '#2563eb',
        secondary: '#06b6d4',
        accent: '#93c5fd',
        glow: 'rgba(37, 99, 235, 0.6)',
        bgGlow: 'rgba(37, 99, 235, 0.25)',
        particles: ['#2563eb', '#3b82f6', '#06b6d4', '#60a5fa', '#bfdbfe'],
        icon: Droplets,
        runes: ['〰', '≋', '💧', '✦', '🌊']
    },
    '질풍계': {
        name: '질풍계',
        primary: '#10b981',
        secondary: '#34d399',
        accent: '#a7f3d0',
        glow: 'rgba(16, 185, 129, 0.6)',
        bgGlow: 'rgba(16, 185, 129, 0.25)',
        particles: ['#10b981', '#34d399', '#6ee7b7', '#a7f3d0', '#ffffff'],
        icon: Wind,
        runes: ['彡', '彡', '💨', '✧', '🌀']
    },
    '대지계': {
        name: '대지계',
        primary: '#d97706',
        secondary: '#b45309',
        accent: '#fde68a',
        glow: 'rgba(217, 119, 6, 0.6)',
        bgGlow: 'rgba(217, 119, 6, 0.25)',
        particles: ['#d97706', '#b45309', '#92400e', '#fde68a', '#fef3c7'],
        icon: Mountain,
        runes: ['⛰', '☗', '◈', '◆', '✦']
    },
    '암흑계': {
        name: '암흑계',
        primary: '#a855f7',
        secondary: '#6b21a8',
        accent: '#e9d5ff',
        glow: 'rgba(168, 85, 247, 0.65)',
        bgGlow: 'rgba(168, 85, 247, 0.25)',
        particles: ['#a855f7', '#c084fc', '#6b21a8', '#3b0764', '#e9d5ff'],
        icon: Eclipse,
        runes: ['☾', '☽', '✦', '☠', '❖']
    },
    '강철계': {
        name: '강철계',
        primary: '#94a3b8',
        secondary: '#cbd5e1',
        accent: '#ffffff',
        glow: 'rgba(148, 163, 184, 0.6)',
        bgGlow: 'rgba(148, 163, 184, 0.25)',
        particles: ['#94a3b8', '#cbd5e1', '#e2e8f0', '#ffffff', '#64748b'],
        icon: Hammer,
        runes: ['⚔', '⚙', '◈', '✦', '🛡']
    },
    '태양계': {
        name: '태양계',
        primary: '#ea580c',
        secondary: '#f59e0b',
        accent: '#fef08a',
        glow: 'rgba(234, 88, 12, 0.65)',
        bgGlow: 'rgba(234, 88, 12, 0.25)',
        particles: ['#ea580c', '#f59e0b', '#fbbf24', '#fef08a', '#ffffff'],
        icon: Sun,
        runes: ['☀', '☼', '✹', '✧', '✦']
    },
    '월광계': {
        name: '월광계',
        primary: '#c084fc',
        secondary: '#818cf8',
        accent: '#f5d0fe',
        glow: 'rgba(192, 132, 252, 0.6)',
        bgGlow: 'rgba(192, 132, 252, 0.25)',
        particles: ['#c084fc', '#818cf8', '#e0e7ff', '#f5d0fe', '#ffffff'],
        icon: Moon,
        runes: ['🌙', '☽', '✧', '★', '◇']
    },
    '초화계': {
        name: '초화계',
        primary: '#84cc16',
        secondary: '#ec4899',
        accent: '#fbcfe8',
        glow: 'rgba(132, 204, 22, 0.6)',
        bgGlow: 'rgba(132, 204, 22, 0.25)',
        particles: ['#84cc16', '#a3e635', '#ec4899', '#f472b6', '#fbcfe8'],
        icon: Leaf,
        runes: ['🌸', '🍃', '❀', '✿', '✧']
    },
    '무기강화계': {
        name: '무기강화계',
        primary: '#f43f5e',
        secondary: '#fbbf24',
        accent: '#ffffff',
        glow: 'rgba(244, 63, 94, 0.65)',
        bgGlow: 'rgba(244, 63, 94, 0.25)',
        particles: ['#f43f5e', '#fb7185', '#fbbf24', '#fde047', '#ffffff'],
        icon: Sword,
        runes: ['⚔', '🗡', '✦', '✶', '✧']
    },
    '신체강화계': {
        name: '신체강화계',
        primary: '#eab308',
        secondary: '#06b6d4',
        accent: '#ffffff',
        glow: 'rgba(234, 179, 8, 0.65)',
        bgGlow: 'rgba(234, 179, 8, 0.25)',
        particles: ['#eab308', '#facc15', '#06b6d4', '#38bdf8', '#ffffff'],
        icon: Activity,
        runes: ['⚡', '💥', '✦', '✹', '★']
    }
};

export const CUSTOM_VFX_PRESETS: Record<string, ShinryokuTheme> = {
    'abyss_dark': {
        name: '칠흑의 심연',
        description: '빛조차 삼키는 칠흑의 어둠과 흑요석 슬래시 궤적',
        primary: '#27272a',
        secondary: '#09090b',
        accent: '#e4e4e7',
        glow: 'rgba(228, 228, 231, 0.45)',
        bgGlow: 'rgba(24, 24, 27, 0.75)',
        particles: ['#09090b', '#18181b', '#27272a', '#71717a', '#ffffff'],
        icon: Eclipse,
        runes: ['✦', '☠', '🌑', '❖', '♰'],
        gradient: 'from-zinc-900 via-neutral-800 to-black'
    },
    'crimson_blood': {
        name: '진홍의 혈염',
        description: '타오르는 핏빛 혈염과 강렬한 붉은색 검기 궤적',
        primary: '#dc2626',
        secondary: '#991b1b',
        accent: '#fecaca',
        glow: 'rgba(220, 38, 38, 0.75)',
        bgGlow: 'rgba(220, 38, 38, 0.35)',
        particles: ['#ef4444', '#dc2626', '#b91c1c', '#7f1d1d', '#fecaca'],
        icon: Flame,
        runes: ['🩸', '⚔', '✦', '✶', '✹'],
        gradient: 'from-red-600 via-rose-700 to-red-950'
    },
    'silver_platinum': {
        name: '백은의 섬광',
        description: '순백의 플래티넘 광채와 눈부신 은빛 잔상',
        primary: '#e2e8f0',
        secondary: '#94a3b8',
        accent: '#ffffff',
        glow: 'rgba(248, 250, 252, 0.85)',
        bgGlow: 'rgba(226, 232, 240, 0.35)',
        particles: ['#ffffff', '#f8fafc', '#e2e8f0', '#cbd5e1', '#94a3b8'],
        icon: Sparkles,
        runes: ['✧', '✦', '⚔', '◇', '✯'],
        gradient: 'from-slate-100 via-slate-300 to-slate-500'
    },
    'cyber_neon': {
        name: '네온 사이언',
        description: '미래지향적인 네온 블루 & 사이언 전기 광채 궤적',
        primary: '#00f5ff',
        secondary: '#06b6d4',
        accent: '#ffffff',
        glow: 'rgba(0, 245, 255, 0.85)',
        bgGlow: 'rgba(6, 182, 212, 0.35)',
        particles: ['#00f5ff', '#22d3ee', '#67e8f9', '#ffffff', '#0891b2'],
        icon: Zap,
        runes: ['⚡', '✦', 'ϟ', '💠', '✶'],
        gradient: 'from-cyan-400 via-teal-500 to-blue-600'
    },
    'divine_gold': {
        name: '황금의 성광',
        description: '성스러운 신의 축복과 찬란한 황금빛 오라',
        primary: '#fbbf24',
        secondary: '#f59e0b',
        accent: '#ffffff',
        glow: 'rgba(251, 191, 36, 0.85)',
        bgGlow: 'rgba(245, 158, 11, 0.35)',
        particles: ['#fde047', '#facc15', '#eab308', '#ffffff', '#ca8a04'],
        icon: Crown,
        runes: ['✧', '✨', '★', '👑', '✦'],
        gradient: 'from-amber-300 via-yellow-500 to-amber-700'
    },
    'jade_emerald': {
        name: '비취 에메랄드',
        description: '신록의 생명력과 청록빛 에메랄드 궤적 파티클',
        primary: '#10b981',
        secondary: '#059669',
        accent: '#a7f3d0',
        glow: 'rgba(16, 185, 129, 0.75)',
        bgGlow: 'rgba(16, 185, 129, 0.35)',
        particles: ['#34d399', '#10b981', '#059669', '#a7f3d0', '#ffffff'],
        icon: Leaf,
        runes: ['🌿', '🍃', '✧', '◈', '✦'],
        gradient: 'from-emerald-400 via-teal-600 to-green-800'
    },
    'void_purple': {
        name: '보이드 바이올렛',
        description: '차원을 찢는 신비로운 보랏빛 균열과 심연 마력',
        primary: '#a855f7',
        secondary: '#7e22ce',
        accent: '#f3e8ff',
        glow: 'rgba(168, 85, 247, 0.8)',
        bgGlow: 'rgba(126, 34, 206, 0.35)',
        particles: ['#c084fc', '#a855f7', '#9333ea', '#7e22ce', '#f3e8ff'],
        icon: Moon,
        runes: ['🔮', '☾', '☽', '✦', '❖'],
        gradient: 'from-purple-400 via-violet-600 to-indigo-900'
    },
    'prism_rainbow': {
        name: '프리즘 레인보우',
        description: '환상적인 일곱 빛깔 무지개 섬광과 프리즘 궤적',
        primary: '#ec4899',
        secondary: '#3b82f6',
        accent: '#fef08a',
        glow: 'rgba(236, 72, 153, 0.8)',
        bgGlow: 'rgba(59, 130, 246, 0.35)',
        particles: ['#f43f5e', '#eab308', '#22c55e', '#06b6d4', '#8b5cf6', '#ec4899'],
        icon: Star,
        runes: ['🌈', '✨', '✦', '✧', '★'],
        gradient: 'from-pink-500 via-yellow-400 via-emerald-400 to-indigo-500'
    },
    'cherry_blossom': {
        name: '벚꽃 비천',
        description: '흩날리는 분홍 벚꽃잎과 우아하고 유려한 풍화 궤적',
        primary: '#f472b6',
        secondary: '#db2777',
        accent: '#fdf2f8',
        glow: 'rgba(244, 114, 182, 0.75)',
        bgGlow: 'rgba(219, 39, 119, 0.35)',
        particles: ['#f472b6', '#ec4899', '#fbcfe8', '#fce7f3', '#ffffff'],
        icon: Leaf,
        runes: ['🌸', '❀', '✿', '✧', '✦'],
        gradient: 'from-pink-300 via-rose-400 to-pink-600'
    },
    'solar_flare': {
        name: '태양 플레어',
        description: '작열하는 태양의 홍염과 폭발적인 불꽃 잔상',
        primary: '#ea580c',
        secondary: '#f97316',
        accent: '#fef08a',
        glow: 'rgba(234, 88, 12, 0.8)',
        bgGlow: 'rgba(234, 88, 12, 0.35)',
        particles: ['#ea580c', '#f97316', '#fbbf24', '#fef08a', '#ffffff'],
        icon: Sun,
        runes: ['☀', '☼', '✹', '🔥', '✦'],
        gradient: 'from-amber-400 via-orange-500 to-red-600'
    }
};

export interface ParsedVfxTheme {
    primary: string;
    secondary: string;
    accent: string;
    glow: string;
    bgGlow: string;
    particles: string[];
    gradientCss: string;
    isGradient: boolean;
    colors: string[];
    runes: string[];
}

export function parseVfxColor(vfxColorStr?: string, baseTheme?: ShinryokuTheme): ParsedVfxTheme {
    const fallbackPrimary = baseTheme?.primary || '#a855f7';
    const fallbackSecondary = baseTheme?.secondary || '#ec4899';
    const fallbackAccent = baseTheme?.accent || '#ffffff';
    const fallbackParticles = baseTheme?.particles || ['#a855f7', '#ec4899', '#c084fc', '#f472b6'];
    const fallbackRunes = baseTheme?.runes || ['✧', '★', '✡', '✦', '✨'];

    if (!vfxColorStr || !vfxColorStr.trim()) {
        const isBaseGrad = !!baseTheme?.gradient;
        const gradCss = baseTheme?.gradient 
            ? `linear-gradient(135deg, ${fallbackPrimary}, ${fallbackSecondary})` 
            : `linear-gradient(135deg, ${fallbackPrimary}, ${fallbackSecondary})`;
        return {
            primary: fallbackPrimary,
            secondary: fallbackSecondary,
            accent: fallbackAccent,
            glow: baseTheme?.glow || `${fallbackPrimary}aa`,
            bgGlow: baseTheme?.bgGlow || `${fallbackPrimary}44`,
            particles: fallbackParticles,
            gradientCss: gradCss,
            isGradient: isBaseGrad,
            colors: [fallbackPrimary, fallbackSecondary],
            runes: fallbackRunes
        };
    }

    const str = vfxColorStr.trim();

    // Extract color strings from gradient expression or comma separated hex values
    let extractedColors: string[] = [];

    if (str.includes('gradient')) {
        const matches = str.match(/#(?:[0-9a-fA-F]{3,8})|rgba?\([^)]+\)|hsla?\([^)]+\)/g);
        if (matches && matches.length >= 1) {
            extractedColors = matches;
        }
    } else if (str.includes(',')) {
        extractedColors = str.split(',').map(s => s.trim()).filter(s => s.length > 0);
    } else if (str.startsWith('#') || str.startsWith('rgb') || str.startsWith('hsl')) {
        extractedColors = [str];
    }

    if (extractedColors.length === 0) {
        extractedColors = [fallbackPrimary];
    }

    const primary = extractedColors[0];
    const secondary = extractedColors[1] || extractedColors[0];
    const accent = extractedColors[2] || (extractedColors.length > 1 ? '#ffffff' : fallbackAccent);
    const isGradient = extractedColors.length > 1 || str.includes('gradient');

    let gradientCss = str;
    if (!str.includes('gradient')) {
        if (extractedColors.length === 1) {
            gradientCss = `linear-gradient(135deg, ${primary}, ${secondary})`;
        } else {
            gradientCss = `linear-gradient(135deg, ${extractedColors.join(', ')})`;
        }
    }

    const particles = [...extractedColors];
    while (particles.length < 4) {
        particles.push(extractedColors[particles.length % extractedColors.length]);
    }
    particles.push('#ffffff');

    return {
        primary,
        secondary,
        accent,
        glow: `${primary}aa`,
        bgGlow: `${primary}44`,
        particles,
        gradientCss,
        isGradient,
        colors: extractedColors,
        runes: fallbackRunes
    };
}

export interface VFXShapeOption {
    id: string;
    name: string;
    description: string;
    requiredTierLevel: number; // 1: 1차(FIRST) 이상, 2: 2차(SECOND) 이상, 3: 3차(LAST) 이상, 4: 4차(FINAL) 이상
    requiredTierName: string;
    badgeColor: string;
}

export const VFX_SHAPE_OPTIONS: VFXShapeOption[] = [
    // Tier 1 (퍼스트 클래스 이상)
    {
        id: 'DEFAULT',
        name: '클래스 대표 기본 연출',
        description: '스킬의 기본 클래스 등급(1차~4차)에 맞추어 자동 지정되는 대표 타격 연출입니다.',
        requiredTierLevel: 1,
        requiredTierName: '1차 퍼스트 이상',
        badgeColor: 'border-slate-600 text-slate-300 bg-slate-900'
    },
    {
        id: 'SINGLE_SLASH',
        name: '단일 호형 베기',
        description: '날카로운 검기가 호를 그리며 적의 급소를 고속 베어내는 단일 참격입니다.',
        requiredTierLevel: 1,
        requiredTierName: '1차 퍼스트 이상',
        badgeColor: 'border-emerald-600/50 text-emerald-400 bg-emerald-950/40'
    },
    {
        id: 'PIERCING_THRUST',
        name: '관통 섬창 파동',
        description: '전방의 공간을 순간 꿰뚫는 고속 직진 찌르기 관통 파동입니다.',
        requiredTierLevel: 1,
        requiredTierName: '1차 퍼스트 이상',
        badgeColor: 'border-emerald-600/50 text-emerald-400 bg-emerald-950/40'
    },
    {
        id: 'IMPACT_PULSE',
        name: '원형 충격 펄스',
        description: '타격 지점에서 충격파가 순간 방사형으로 구형 폭발하는 펄스 연출입니다.',
        requiredTierLevel: 1,
        requiredTierName: '1차 퍼스트 이상',
        badgeColor: 'border-emerald-600/50 text-emerald-400 bg-emerald-950/40'
    },

    // Tier 2 (세컨드 클래스 이상)
    {
        id: 'DUAL_CROSS',
        name: '십자 이중 참격',
        description: 'X자와 十자 형태의 이중 강렬한 에너지 검기가 가로지르는 난무 연출입니다.',
        requiredTierLevel: 2,
        requiredTierName: '2차 세컨드 이상',
        badgeColor: 'border-cyan-600/50 text-cyan-400 bg-cyan-950/40'
    },
    {
        id: 'RING_BURST',
        name: '환영 마법 링 폭열',
        description: '동심원으로 연속 팽창하는 마법진 링과 격렬한 오라 충격 폭발입니다.',
        requiredTierLevel: 2,
        requiredTierName: '2차 세컨드 이상',
        badgeColor: 'border-cyan-600/50 text-cyan-400 bg-cyan-950/40'
    },
    {
        id: 'SPIRAL_TWISTER',
        name: '나선 용오름 파동',
        description: '적의 위치에서 강렬한 신력 기둥이 회오리치며 상승하는 나선 파동 연출입니다.',
        requiredTierLevel: 2,
        requiredTierName: '2차 세컨드 이상',
        badgeColor: 'border-cyan-600/50 text-cyan-400 bg-cyan-950/40'
    },

    // Tier 3 (라스트 클래스 이상)
    {
        id: 'SKY_BEAM',
        name: '천공 신성 강림 낙뢰',
        description: '상공으로부터 거대한 신성 광선과 대형 대검이 강림하여 대지를 직격합니다.',
        requiredTierLevel: 3,
        requiredTierName: '3차 라스트 이상',
        badgeColor: 'border-purple-600/50 text-purple-400 bg-purple-950/40'
    },
    {
        id: 'GEOMETRIC_ARRAY',
        name: '3중 차원 마법진',
        description: '3중으로 맞물려 고속 회전하는 기하학 5각 마법진과 고위 결계 폭발입니다.',
        requiredTierLevel: 3,
        requiredTierName: '3차 라스트 이상',
        badgeColor: 'border-purple-600/50 text-purple-400 bg-purple-950/40'
    },
    {
        id: 'SWORD_RAIN',
        name: '무한 이기어검 강하',
        description: '하늘 전체에 펼쳐진 차원 틈새에서 무수한 신성 환영검이 빗사치듯 난사됩니다.',
        requiredTierLevel: 3,
        requiredTierName: '3차 라스트 이상',
        badgeColor: 'border-purple-600/50 text-purple-400 bg-purple-950/40'
    },

    // Tier 4 (파이널 클래스 / 오의 전용)
    {
        id: 'DIVINE_DOMAIN',
        name: '절대 신멸 결계',
        description: '전장을 집어삼키는 6각 성스러운 기하학 신령 결계와 빛의 줄기 전역 방사 연출입니다.',
        requiredTierLevel: 4,
        requiredTierName: '4차 파이널 전용',
        badgeColor: 'border-amber-500/60 text-amber-300 bg-amber-950/50'
    },
    {
        id: 'SUPERNOVA',
        name: '초신성 오의 멸절 폭발',
        description: '차원 중심 코어가 붕괴 후 우주적 스케일의 초신성 폭발을 시각화합니다.',
        requiredTierLevel: 4,
        requiredTierName: '4차 파이널 전용',
        badgeColor: 'border-amber-500/60 text-amber-300 bg-amber-950/50'
    },
    {
        id: 'DRAGON_ASCENT',
        name: '신룡 승천 오의',
        description: '태초의 신룡이 거대한 용오름 오라를 두르고 공간을 가르며 승천하는 최상위 오의 연출입니다.',
        requiredTierLevel: 4,
        requiredTierName: '4차 파이널 전용',
        badgeColor: 'border-amber-500/60 text-amber-300 bg-amber-950/50'
    },
    // 버프 / 디버프 및 원소 다양화 추가 옵션들
    // Tier 1 (퍼스트 이상)
    {
        id: 'BUFF_BLESSING',
        name: '수호 성광 축복',
        description: '아군이나 대상을 감싸 안으며 수호의 성십자 광채와 구형 방어선이 서서히 타오릅니다. (버프용)',
        requiredTierLevel: 1,
        requiredTierName: '1차 퍼스트 이상',
        badgeColor: 'border-emerald-600/50 text-emerald-400 bg-emerald-950/40'
    },
    {
        id: 'DEBUFF_WEAKEN',
        name: '심연 쇠약 파동',
        description: '대상을 중심으로 하강하는 마력 침전 기둥과 잔물결 치는 중력 역장을 방출합니다. (디버프용)',
        requiredTierLevel: 1,
        requiredTierName: '1차 퍼스트 이상',
        badgeColor: 'border-emerald-600/50 text-emerald-400 bg-emerald-950/40'
    },
    // Tier 2 (세컨드 이상)
    {
        id: 'BUFF_BARRIER',
        name: '기하학 신성 결계',
        description: '3차원 정육각 형태의 벌집형 분산 장막이 형성되며 에너지를 보존하고 회복합니다. (버프/장벽용)',
        requiredTierLevel: 2,
        requiredTierName: '2차 세컨드 이상',
        badgeColor: 'border-cyan-600/50 text-cyan-400 bg-cyan-950/40'
    },
    {
        id: 'DEBUFF_SHACKLE',
        name: '나락 속박 사슬',
        description: '심연으로부터 고위 속박 사슬들이 소환되어 대상의 이동과 마력을 원형으로 조여맵니다. (디버프용)',
        requiredTierLevel: 2,
        requiredTierName: '2차 세컨드 이상',
        badgeColor: 'border-cyan-600/50 text-cyan-400 bg-cyan-950/40'
    },
    // Tier 3 (라스트 이상)
    {
        id: 'BUFF_HEAVENLY',
        name: '천상의 신성 오라',
        description: '신의 화신이 깃든 듯, 대상의 등 뒤에서 다중 치유 고리와 찬란히 승천하는 룬들이 생성됩니다. (버프/치유용)',
        requiredTierLevel: 3,
        requiredTierName: '3차 라스트 이상',
        badgeColor: 'border-purple-600/50 text-purple-400 bg-purple-950/40'
    },
    {
        id: 'DEBUFF_CURSE',
        name: '악마의 사사 저주',
        description: '지옥의 틈을 벌려 멸시의 역오각 별진과 저주 오라가 바닥에서 위로 분출해 대상을 압박합니다. (디버프용)',
        requiredTierLevel: 3,
        requiredTierName: '3차 라스트 이상',
        badgeColor: 'border-purple-600/50 text-purple-400 bg-purple-950/40'
    },
    // Tier 4 (파이널 전용)
    {
        id: 'BUFF_GOD_AVATAR',
        name: '아바타 오의 천상강림',
        description: '신인합일의 초월적 상태에 도달해 거대한 기하학적 천사 날개 광채와 무수한 황금 수호검을 정렬합니다. (최상위 오의 버프용)',
        requiredTierLevel: 4,
        requiredTierName: '4차 파이널 전용',
        badgeColor: 'border-amber-500/60 text-amber-300 bg-amber-950/50'
    },
    {
        id: 'DEBUFF_APOCALYPSE',
        name: '종말 초중력 몰락',
        description: '공간의 중심을 비틀어 블랙홀과 같은 특이점을 생성하여 파멸의 암흑 궤적과 거대한 은하 붕괴 파장을 뿜어냅니다. (최상위 오의 디버프용)',
        requiredTierLevel: 4,
        requiredTierName: '4차 파이널 전용',
        badgeColor: 'border-amber-500/60 text-amber-300 bg-amber-950/50'
    },
    // 대폭 다양화 추가 옵션들
    {
        id: 'FIST_CRUSH',
        name: '지진격권 천충',
        description: '강인한 격투 타격과 함께 대지가 갈라지며 강한 파동이 솟구치는 물리 타격용 연출입니다. (체술/타격용)',
        requiredTierLevel: 1,
        requiredTierName: '1차 퍼스트 이상',
        badgeColor: 'border-emerald-600/50 text-emerald-400 bg-emerald-950/40'
    },
    {
        id: 'POISON_MIST',
        name: '맹독 부식 안개',
        description: '치명적인 독성 가스와 부식성 고리들이 폭발하듯 팽창하여 대상의 무장과 건강을 파괴합니다. (디버프용)',
        requiredTierLevel: 2,
        requiredTierName: '2차 세컨드 이상',
        badgeColor: 'border-cyan-600/50 text-cyan-400 bg-cyan-950/40'
    },
    {
        id: 'WIND_SWIFT',
        name: '풍백 질풍 궤적',
        description: '날렵한 바람 장막과 초록 잎사귀 오라가 부드럽게 휘감아 오르며 아군의 이동성을 강화합니다. (버프/속도용)',
        requiredTierLevel: 2,
        requiredTierName: '2차 세컨드 이상',
        badgeColor: 'border-cyan-600/50 text-cyan-400 bg-cyan-950/40'
    },
    {
        id: 'METEOR_STRIKE',
        name: '천외 종말 운석 낙하',
        description: '허공에서 작열하는 거대한 대멸종 운석이 타오르는 먼지를 뿌리며 강하하여 전역을 무차별 타격합니다. (광역 파괴용)',
        requiredTierLevel: 3,
        requiredTierName: '3차 라스트 이상',
        badgeColor: 'border-purple-600/50 text-purple-400 bg-purple-950/40'
    },
    {
        id: 'TIME_STOP',
        name: '시간 정지 역장',
        description: '초정밀 황금 시계 톱니바퀴 마법진과 격자형 정지 역장이 대상의 시간을 정지시킵니다. (공간 제어 디버프용)',
        requiredTierLevel: 4,
        requiredTierName: '4차 파이널 전용',
        badgeColor: 'border-amber-500/60 text-amber-300 bg-amber-950/50'
    },
    // --- 2차 대규모 추가 업데이트 (Tier 1) ---
    {
        id: 'MAGIC_MISSILE',
        name: '유도 마력탄',
        description: '다수의 날렵한 마력탄이 대상의 급소를 향해 유도되어 연속 타격합니다.',
        requiredTierLevel: 1,
        requiredTierName: '1차 퍼스트 이상',
        badgeColor: 'border-emerald-600/50 text-emerald-400 bg-emerald-950/40'
    },
    {
        id: 'SHIELD_BASH',
        name: '강철 방패 돌격',
        description: '거대한 에너지 방패가 앞으로 돌진하며 적을 밀쳐내고 강하게 타격합니다.',
        requiredTierLevel: 1,
        requiredTierName: '1차 퍼스트 이상',
        badgeColor: 'border-emerald-600/50 text-emerald-400 bg-emerald-950/40'
    },
    {
        id: 'EARTH_SPIKE',
        name: '대지 쐐기',
        description: '지면 아래에서 날카로운 바위와 수정 쐐기가 연쇄적으로 솟구쳐 오릅니다.',
        requiredTierLevel: 1,
        requiredTierName: '1차 퍼스트 이상',
        badgeColor: 'border-emerald-600/50 text-emerald-400 bg-emerald-950/40'
    },
    {
        id: 'WATER_SPLASH',
        name: '수류 격파',
        description: '강력한 수압의 물줄기가 폭발하며 대상에게 쏟아지는 타격 연출입니다.',
        requiredTierLevel: 1,
        requiredTierName: '1차 퍼스트 이상',
        badgeColor: 'border-emerald-600/50 text-emerald-400 bg-emerald-950/40'
    },
    // --- 2차 대규모 추가 업데이트 (Tier 2) ---
    {
        id: 'LIGHTNING_CHAIN',
        name: '연쇄 번개 도약',
        description: '강력한 뇌전이 대상을 중심으로 불규칙하게 튕기며 주변을 타격합니다.',
        requiredTierLevel: 2,
        requiredTierName: '2차 세컨드 이상',
        badgeColor: 'border-cyan-600/50 text-cyan-400 bg-cyan-950/40'
    },
    {
        id: 'ICE_NOVA',
        name: '빙결 쇄도 노바',
        description: '냉기가 폭발하며 날카로운 얼음 파편들이 사방으로 뻗어 나가는 광역 타격입니다.',
        requiredTierLevel: 2,
        requiredTierName: '2차 세컨드 이상',
        badgeColor: 'border-cyan-600/50 text-cyan-400 bg-cyan-950/40'
    },
    {
        id: 'BLOOD_DRAIN',
        name: '흡혈 박쥐 떼',
        description: '붉은 혈기와 원혼이 무리를 지어 대상을 덮치고 생명력을 흡수하는 연출입니다. (디버프/흡혈)',
        requiredTierLevel: 2,
        requiredTierName: '2차 세컨드 이상',
        badgeColor: 'border-cyan-600/50 text-cyan-400 bg-cyan-950/40'
    },
    {
        id: 'SOUND_WAVE',
        name: '음파 진동 균열',
        description: '주파수가 불안정한 초음파 고리가 겹겹이 방출되어 대상의 고막과 장갑을 찢습니다.',
        requiredTierLevel: 2,
        requiredTierName: '2차 세컨드 이상',
        badgeColor: 'border-cyan-600/50 text-cyan-400 bg-cyan-950/40'
    },
    {
        id: 'LASER_BEAM',
        name: '마동포 빔 궤적',
        description: '한 점으로 응축된 에너지가 굵은 레이저 광선이 되어 직선으로 관통합니다.',
        requiredTierLevel: 2,
        requiredTierName: '2차 세컨드 이상',
        badgeColor: 'border-cyan-600/50 text-cyan-400 bg-cyan-950/40'
    },
    {
        id: 'SACRED_FLAME',
        name: '정화의 성염',
        description: '따뜻하면서도 맹렬한 성스러운 불꽃이 바닥에서 솟아나와 아군을 치유하거나 적을 태웁니다.',
        requiredTierLevel: 2,
        requiredTierName: '2차 세컨드 이상',
        badgeColor: 'border-cyan-600/50 text-cyan-400 bg-cyan-950/40'
    },
    // --- 2차 대규모 추가 업데이트 (Tier 3) ---
    {
        id: 'THUNDER_STORM',
        name: '뇌우 심판의 영역',
        description: '상공에 짙은 먹구름이 끼고 다발성 거대 낙뢰가 전장을 무자비하게 폭격합니다.',
        requiredTierLevel: 3,
        requiredTierName: '3차 라스트 이상',
        badgeColor: 'border-purple-600/50 text-purple-400 bg-purple-950/40'
    },
    {
        id: 'LAVA_ERUPTION',
        name: '마그마 지옥 분출',
        description: '지각이 갈라지고 용암 기둥이 하늘 높이 치솟으며 불타는 파편을 흩뿌립니다.',
        requiredTierLevel: 3,
        requiredTierName: '3차 라스트 이상',
        badgeColor: 'border-purple-600/50 text-purple-400 bg-purple-950/40'
    },
    {
        id: 'ANGELIC_CHOIR',
        name: '천사의 성가대 찬가',
        description: '황금빛 음표와 천사의 깃털이 흩날리며 전장에 있는 아군에게 강력한 가호를 내립니다. (광역 버프)',
        requiredTierLevel: 3,
        requiredTierName: '3차 라스트 이상',
        badgeColor: 'border-purple-600/50 text-purple-400 bg-purple-950/40'
    },
    {
        id: 'GRAVITY_PRESS',
        name: '초중력 압살 큐브',
        description: '보이지 않는 거대한 큐브 형태의 중력장이 생성되어 적을 짓눌러 분쇄합니다.',
        requiredTierLevel: 3,
        requiredTierName: '3차 라스트 이상',
        badgeColor: 'border-purple-600/50 text-purple-400 bg-purple-950/40'
    },
    {
        id: 'ILLUSION_CLONE',
        name: '환영 분신 난무',
        description: '수많은 잔상들이 겹치며 사방에서 동시에 쇄도하여 대상에게 맹공을 퍼붓습니다.',
        requiredTierLevel: 3,
        requiredTierName: '3차 라스트 이상',
        badgeColor: 'border-purple-600/50 text-purple-400 bg-purple-950/40'
    },
    // --- 2차 대규모 추가 업데이트 (Tier 4) ---
    {
        id: 'DIMENSION_SHATTER',
        name: '차원 붕괴 균열',
        description: '공간 자체가 유리창처럼 깨지며, 틈새로 심연의 파괴 광선들이 무자비하게 터져 나옵니다.',
        requiredTierLevel: 4,
        requiredTierName: '4차 파이널 전용',
        badgeColor: 'border-amber-500/60 text-amber-300 bg-amber-950/50'
    },
    {
        id: 'STAR_FALL',
        name: '은하수 별자리 낙하',
        description: '아름다운 우주의 성좌가 눈앞에 펼쳐지며, 수많은 별들이 유성우가 되어 쏟아집니다.',
        requiredTierLevel: 4,
        requiredTierName: '4차 파이널 전용',
        badgeColor: 'border-amber-500/60 text-amber-300 bg-amber-950/50'
    },
    {
        id: 'WORLD_TREE',
        name: '세계수 만개 오라',
        description: '전장을 덮는 거대한 빛의 세계수가 환상적으로 피어나며 영구적인 생명력을 부여합니다. (최상위 오의 버프)',
        requiredTierLevel: 4,
        requiredTierName: '4차 파이널 전용',
        badgeColor: 'border-amber-500/60 text-amber-300 bg-amber-950/50'
    },
    {
        id: 'DEMON_HAND',
        name: '마신의 거대 손아귀',
        description: '차원을 뚫고 나타난 섬뜩한 마신의 거대 손이 대상을 쥐어짜 영혼째 소멸시킵니다. (최상위 디버프/즉사급)',
        requiredTierLevel: 4,
        requiredTierName: '4차 파이널 전용',
        badgeColor: 'border-amber-500/60 text-amber-300 bg-amber-950/50'
    },
    {
        id: 'YIN_YANG',
        name: '태극 만다라 조화',
        description: '빛과 어둠, 음양의 태극 문양이 완벽한 조화를 이루며 모든 것을 태초로 되돌리는 궁극 오의입니다.',
        requiredTierLevel: 4,
        requiredTierName: '4차 파이널 전용',
        badgeColor: 'border-amber-500/60 text-amber-300 bg-amber-950/50'
    }
];

export function getSkillTierRank(tier?: ClassTier | string): number {
    if (!tier) return 1;
    if (tier === ClassTier.FINAL || tier === 'BOND' || tier === '4차' || tier === 'FINAL') return 4;
    if (tier === ClassTier.LAST || tier === '3차' || tier === 'LAST') return 3;
    if (tier === ClassTier.SECOND || tier === '2차' || tier === 'SECOND') return 2;
    return 1;
}

export interface RenderCustomVfxShapeProps {
    shape: string;
    theme: ParsedVfxTheme;
    svgGradId: string;
}

export const RenderCustomVfxShape: React.FC<RenderCustomVfxShapeProps> = ({ shape, theme, svgGradId }) => {
    const strokeStyle = theme.isGradient ? `url(#${svgGradId})` : theme.primary;

    switch (shape) {
        case 'SINGLE_SLASH':
            return (
                <div className="relative flex items-center justify-center">
                    <motion.svg
                        viewBox="0 0 200 200"
                        className="w-56 h-56 md:w-72 md:h-72 absolute"
                        initial={{ rotate: -60, scale: 0.2, opacity: 0 }}
                        animate={{ rotate: [-60, 25], scale: [0.2, 1.4, 0.9], opacity: [0, 1, 0] }}
                        transition={{ duration: 0.45, ease: "easeOut" }}
                    >
                        <path
                            d="M 20 180 Q 100 50 180 20"
                            fill="none"
                            stroke={strokeStyle}
                            strokeWidth="9"
                            strokeLinecap="round"
                            style={{ filter: `drop-shadow(0 0 14px ${theme.primary})` }}
                        />
                        <path
                            d="M 20 180 Q 100 50 180 20"
                            fill="none"
                            stroke="#ffffff"
                            strokeWidth="3"
                            strokeLinecap="round"
                        />
                    </motion.svg>
                    <motion.div
                        initial={{ scale: 0, opacity: 1 }}
                        animate={{ scale: [0, 1.8, 0], opacity: [1, 1, 0] }}
                        transition={{ duration: 0.3 }}
                        className="w-20 h-20 rounded-full absolute"
                        style={{ background: `radial-gradient(circle, #ffffff 0%, ${theme.primary} 70%, transparent 100%)` }}
                    />
                </div>
            );

        case 'PIERCING_THRUST':
            return (
                <div className="relative flex items-center justify-center">
                    <motion.svg
                        viewBox="0 0 200 200"
                        className="w-64 h-64 md:w-80 md:h-80 absolute"
                        initial={{ x: -120, scaleX: 0.2, opacity: 0 }}
                        animate={{ x: [-120, 0, 100], scaleX: [0.2, 1.8, 0.5], opacity: [0, 1, 0] }}
                        transition={{ duration: 0.5, ease: "anticipate" }}
                    >
                        <polygon
                            points="10,95 160,85 195,100 160,115 10,105"
                            fill={strokeStyle}
                            style={{ filter: `drop-shadow(0 0 16px ${theme.primary})` }}
                        />
                        <line x1="0" y1="100" x2="200" y2="100" stroke="#ffffff" strokeWidth="4" />
                    </motion.svg>
                    {[0, 0.1, 0.2].map((delay, idx) => (
                        <motion.div
                            key={idx}
                            initial={{ scale: 0.1, opacity: 1 }}
                            animate={{ scale: [0.1, 1.8], opacity: [1, 0] }}
                            transition={{ duration: 0.4, delay, ease: "easeOut" }}
                            className="w-32 h-32 rounded-full border-2 absolute"
                            style={{ borderColor: theme.accent, boxShadow: `0 0 25px ${theme.primary}` }}
                        />
                    ))}
                </div>
            );

        case 'IMPACT_PULSE':
            return (
                <div className="relative flex items-center justify-center">
                    {[0, 0.12, 0.24].map((delay, idx) => (
                        <motion.div
                            key={idx}
                            initial={{ scale: 0.1, opacity: 1 }}
                            animate={{ scale: [0.1, 2.2], opacity: [1, 0] }}
                            transition={{ duration: 0.5, delay, ease: "easeOut" }}
                            className="w-40 h-40 rounded-full border-4 absolute"
                            style={{ borderColor: theme.secondary, boxShadow: `0 0 35px ${theme.glow}` }}
                        />
                    ))}
                    <motion.div
                        initial={{ scale: 0, opacity: 1 }}
                        animate={{ scale: [0, 2.5, 0], opacity: [1, 0.9, 0] }}
                        transition={{ duration: 0.4 }}
                        className="w-28 h-28 rounded-full absolute"
                        style={{ background: `radial-gradient(circle, #ffffff 0%, ${theme.primary} 60%, transparent 100%)` }}
                    />
                </div>
            );

        case 'DUAL_CROSS':
            return (
                <div className="relative flex items-center justify-center">
                    <motion.svg
                        viewBox="0 0 200 200"
                        className="w-64 h-64 md:w-80 md:h-80 absolute"
                        initial={{ scale: 0.2, rotate: -45, opacity: 0 }}
                        animate={{ scale: [0.2, 1.5, 1], rotate: [-45, 45], opacity: [0, 1, 0] }}
                        transition={{ duration: 0.55, ease: "easeOut" }}
                    >
                        <line x1="20" y1="20" x2="180" y2="180" stroke={strokeStyle} strokeWidth="8" strokeLinecap="round" style={{ filter: `drop-shadow(0 0 12px ${theme.primary})` }} />
                        <line x1="180" y1="20" x2="20" y2="180" stroke={theme.secondary} strokeWidth="8" strokeLinecap="round" style={{ filter: `drop-shadow(0 0 12px ${theme.secondary})` }} />
                        <line x1="20" y1="20" x2="180" y2="180" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" />
                        <line x1="180" y1="20" x2="20" y2="180" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" />
                    </motion.svg>
                    <motion.div
                        initial={{ scale: 0.2, opacity: 1 }}
                        animate={{ scale: [0.2, 2.0], opacity: [1, 0] }}
                        transition={{ duration: 0.5 }}
                        className="w-36 h-36 rounded-full border-4 absolute"
                        style={{ borderColor: theme.accent, boxShadow: `0 0 30px ${theme.primary}` }}
                    />
                </div>
            );

        case 'RING_BURST':
            return (
                <div className="relative flex items-center justify-center">
                    <motion.div
                        initial={{ scale: 0.2, rotate: 0, opacity: 0 }}
                        animate={{ scale: [0.2, 1.4, 1.1], rotate: 360, opacity: [0, 1, 0] }}
                        transition={{ duration: 0.7, ease: "easeOut" }}
                        className="w-52 h-52 md:w-64 md:h-64 rounded-full border-2 border-dashed absolute flex items-center justify-center"
                        style={{ borderColor: theme.primary, boxShadow: `0 0 40px ${theme.glow}` }}
                    >
                        <motion.div
                            animate={{ rotate: -720 }}
                            transition={{ duration: 0.7, ease: "linear" }}
                            className="w-36 h-36 rounded-full border-2 border-dotted border-white/90 flex items-center justify-around text-xl text-amber-200"
                        >
                            <span>{theme.runes[0]}</span>
                            <span>{theme.runes[1]}</span>
                        </motion.div>
                    </motion.div>
                    {[0, 0.15].map((delay, idx) => (
                        <motion.div
                            key={idx}
                            initial={{ scale: 0.1, opacity: 1 }}
                            animate={{ scale: [0.1, 2.4], opacity: [1, 0] }}
                            transition={{ duration: 0.6, delay, ease: "easeOut" }}
                            className="w-40 h-40 rounded-full border-4 absolute"
                            style={{ borderColor: theme.secondary, boxShadow: `0 0 35px ${theme.primary}` }}
                        />
                    ))}
                </div>
            );

        case 'SPIRAL_TWISTER':
            return (
                <div className="relative flex items-center justify-center">
                    <motion.div
                        initial={{ scaleY: 0.1, rotate: 0, opacity: 0 }}
                        animate={{ scaleY: [0.1, 1.8, 1], rotate: 540, opacity: [0, 1, 0] }}
                        transition={{ duration: 0.75, ease: "easeOut" }}
                        className="w-44 h-80 rounded-full border-4 border-dashed absolute"
                        style={{ borderColor: theme.accent, boxShadow: `0 0 50px ${theme.glow}` }}
                    />
                    <motion.div
                        initial={{ y: 150, opacity: 0 }}
                        animate={{ y: [-150, 0, -150], opacity: [0, 1, 0] }}
                        transition={{ duration: 0.7 }}
                        className="w-24 h-[350px] absolute"
                        style={{ background: `linear-gradient(to top, transparent, ${theme.primary}, #ffffff, transparent)` }}
                    />
                </div>
            );

        case 'SKY_BEAM':
            return (
                <div className="relative flex items-center justify-center">
                    <motion.div
                        initial={{ y: -350, scaleX: 0.2, opacity: 0 }}
                        animate={{ y: [-350, 0], scaleX: [0.2, 1.8, 1], opacity: [0, 1, 0] }}
                        transition={{ duration: 0.55, ease: "anticipate" }}
                        className="w-20 md:w-32 h-[550px] absolute z-10"
                        style={{
                            background: `linear-gradient(to bottom, #ffffff, ${theme.secondary}, ${theme.primary}, transparent)`,
                            filter: `drop-shadow(0 0 40px ${theme.glow})`
                        }}
                    />
                    {[0, 0.15, 0.3].map((delay, idx) => (
                        <motion.div
                            key={idx}
                            initial={{ scale: 0.1, opacity: 1 }}
                            animate={{ scale: [0.1, 2.6], opacity: [1, 0] }}
                            transition={{ duration: 0.6, delay, ease: "easeOut" }}
                            className="w-44 h-44 rounded-full border-4 absolute"
                            style={{ borderColor: theme.accent, boxShadow: `0 0 45px ${theme.primary}` }}
                        />
                    ))}
                </div>
            );

        case 'GEOMETRIC_ARRAY':
            return (
                <div className="relative flex items-center justify-center">
                    <motion.div
                        initial={{ scale: 0.2, rotate: 0, opacity: 0 }}
                        animate={{ scale: [0.2, 1.5, 1.2], rotate: 360, opacity: [0, 1, 0] }}
                        transition={{ duration: 0.9, ease: "easeOut" }}
                        className="w-72 h-72 md:w-96 md:h-96 rounded-full border-2 absolute flex items-center justify-center"
                        style={{ borderColor: theme.accent, boxShadow: `0 0 60px ${theme.glow}` }}
                    >
                        <motion.svg viewBox="0 0 100 100" className="w-full h-full absolute animate-spin" style={{ animationDuration: '2.5s' }}>
                            <polygon points="50,5 64,36 98,36 70,57 81,91 50,70 19,91 30,57 2,36 36,36" fill="none" stroke={strokeStyle} strokeWidth="2" />
                            <circle cx="50" cy="50" r="45" fill="none" stroke={theme.secondary} strokeWidth="1.5" strokeDasharray="4 2" />
                        </motion.svg>
                        <div className="flex gap-4 text-3xl text-amber-200">
                            {theme.runes.map((r, i) => (
                                <span key={i} className="animate-pulse">{r}</span>
                            ))}
                        </div>
                    </motion.div>
                </div>
            );

        case 'SWORD_RAIN':
            return (
                <div className="relative flex items-center justify-center w-full h-full">
                    {[-100, -50, 0, 50, 100].map((xOffset, idx) => (
                        <motion.div
                            key={idx}
                            initial={{ y: -300, x: xOffset, opacity: 0 }}
                            animate={{ y: [-300, 50], x: [xOffset, xOffset], opacity: [0, 1, 0] }}
                            transition={{ duration: 0.5, delay: idx * 0.08, ease: "easeIn" }}
                            className="absolute"
                        >
                            <Sword size={40} className="text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.9)]" style={{ color: theme.primary }} />
                        </motion.div>
                    ))}
                    <motion.div
                        initial={{ scale: 0, opacity: 1 }}
                        animate={{ scale: [0, 2.5], opacity: [1, 0] }}
                        transition={{ duration: 0.6, delay: 0.2 }}
                        className="w-56 h-56 rounded-full border-4 absolute"
                        style={{ borderColor: theme.accent, boxShadow: `0 0 50px ${theme.glow}` }}
                    />
                </div>
            );

        case 'DIVINE_DOMAIN':
            return (
                <div className="relative flex items-center justify-center w-full h-full">
                    <motion.div
                        initial={{ scale: 0.1, rotate: 0, opacity: 0 }}
                        animate={{ scale: [0.1, 1.8, 1.4], rotate: 720, opacity: [0, 1, 0] }}
                        transition={{ duration: 1.2, ease: "easeOut" }}
                        className="w-[500px] h-[500px] md:w-[650px] md:h-[650px] rounded-full border-4 border-double absolute flex items-center justify-center"
                        style={{ borderColor: theme.accent, boxShadow: `0 0 90px ${theme.glow}` }}
                    >
                        <motion.svg viewBox="0 0 200 200" className="w-full h-full absolute">
                            <circle cx="100" cy="100" r="95" fill="none" stroke={theme.secondary} strokeWidth="2.5" strokeDasharray="6 3" />
                            <polygon points="100,10 178,55 178,145 100,190 22,145 22,55" fill="none" stroke={theme.accent} strokeWidth="3" />
                            <polygon points="100,190 22,55 178,55" fill="none" stroke="#ffffff" strokeWidth="2" />
                            <polygon points="100,10 178,145 22,145" fill="none" stroke="#ffffff" strokeWidth="2" />
                        </motion.svg>
                        <div className="flex gap-6 text-4xl text-amber-200">
                            {theme.runes.map((r, i) => (
                                <span key={i} className="animate-pulse">{r}</span>
                            ))}
                        </div>
                    </motion.div>
                    <motion.div
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: [0, 3.8, 0], opacity: [0, 1, 0] }}
                        transition={{ duration: 0.9, ease: "easeInOut" }}
                        className="w-48 h-48 rounded-full absolute z-20"
                        style={{ background: `radial-gradient(circle, #ffffff 0%, ${theme.accent} 40%, ${theme.primary} 70%, transparent 100%)`, filter: `drop-shadow(0 0 70px ${theme.glow})` }}
                    />
                </div>
            );

        case 'SUPERNOVA':
            return (
                <div className="relative flex items-center justify-center w-full h-full">
                    <motion.div
                        initial={{ scale: 3, opacity: 0 }}
                        animate={{ scale: [3, 0.1, 4, 0], opacity: [0, 1, 1, 0] }}
                        transition={{ duration: 1.1, times: [0, 0.3, 0.7, 1], ease: "easeInOut" }}
                        className="w-64 h-64 rounded-full absolute z-20"
                        style={{
                            background: `radial-gradient(circle, #ffffff 0%, ${theme.primary} 50%, ${theme.accent} 80%, transparent 100%)`,
                            filter: `drop-shadow(0 0 100px ${theme.glow})`
                        }}
                    />
                    {[0, 0.2, 0.4].map((delay, idx) => (
                        <motion.div
                            key={idx}
                            initial={{ scale: 0.1, opacity: 1 }}
                            animate={{ scale: [0.1, 3.2], opacity: [1, 0] }}
                            transition={{ duration: 0.8, delay: delay + 0.3, ease: "easeOut" }}
                            className="w-52 h-52 rounded-full border-4 absolute"
                            style={{ borderColor: theme.accent, boxShadow: `0 0 60px ${theme.primary}` }}
                        />
                    ))}
                </div>
            );

        case 'DRAGON_ASCENT':
            return (
                <div className="relative flex items-center justify-center w-full h-full">
                    <motion.div
                        initial={{ y: 250, scale: 0.2, rotate: -45, opacity: 0 }}
                        animate={{ y: [250, -150], scale: [0.2, 1.8, 1], rotate: [-45, 45], opacity: [0, 1, 0] }}
                        transition={{ duration: 1.0, ease: "easeOut" }}
                        className="w-72 h-[450px] absolute z-10 flex items-center justify-center"
                    >
                        <motion.svg viewBox="0 0 100 200" className="w-full h-full absolute">
                            <path
                                d="M 50 190 C 10 140, 90 90, 50 10 C 20 60, 80 120, 50 190 Z"
                                fill={strokeStyle}
                                style={{ filter: `drop-shadow(0 0 25px ${theme.primary})` }}
                            />
                        </motion.svg>
                        <Crown size={60} className="text-amber-200 animate-bounce drop-shadow-[0_0_20px_rgba(255,255,255,1)]" />
                    </motion.div>
                    <motion.div
                        initial={{ scale: 0.1, opacity: 1 }}
                        animate={{ scale: [0.1, 2.8], opacity: [1, 0] }}
                        transition={{ duration: 0.8 }}
                        className="w-60 h-60 rounded-full border-4 border-dashed absolute"
                        style={{ borderColor: theme.accent, boxShadow: `0 0 60px ${theme.glow}` }}
                    />
                </div>
            );

        case 'BUFF_BLESSING':
            return (
                <div className="relative flex items-center justify-center">
                    <motion.div
                        initial={{ scale: 0.2, opacity: 0, y: 30 }}
                        animate={{ scale: [0.2, 1.3, 1.0], opacity: [0, 1, 0], y: [30, -30] }}
                        transition={{ duration: 0.9, ease: "easeOut" }}
                        className="absolute flex flex-col items-center justify-center"
                    >
                        <div className="p-4 rounded-full bg-gradient-to-b from-white/10 to-transparent border border-white/20 backdrop-blur-sm shadow-[0_0_30px_rgba(255,255,255,0.4)]" style={{ borderColor: theme.primary }}>
                            <Shield size={48} style={{ color: theme.primary, filter: `drop-shadow(0 0 10px ${theme.glow})` }} />
                        </div>
                        <span className="text-white text-xs font-bold mt-2 tracking-widest uppercase animate-pulse">BLESSING</span>
                    </motion.div>
                    {[0, 0.2].map((delay, idx) => (
                        <motion.div
                            key={idx}
                            initial={{ scale: 0.4, opacity: 0.8 }}
                            animate={{ scale: [0.4, 2.0], opacity: [0.8, 0] }}
                            transition={{ duration: 0.8, delay, ease: "linear" }}
                            className="w-40 h-40 rounded-full border-2 absolute"
                            style={{ borderColor: theme.secondary, boxShadow: `0 0 20px ${theme.glow}` }}
                        />
                    ))}
                </div>
            );

        case 'DEBUFF_WEAKEN':
            return (
                <div className="relative flex items-center justify-center">
                    <motion.div
                        initial={{ scale: 1.5, opacity: 0, y: -40 }}
                        animate={{ scale: [1.5, 0.9, 1.1], opacity: [0, 1, 0], y: [-40, 40] }}
                        transition={{ duration: 0.95, ease: "anticipate" }}
                        className="absolute flex flex-col items-center justify-center"
                    >
                        <div className="p-4 rounded-full border-2 border-dashed" style={{ borderColor: theme.primary, boxShadow: `0 0 25px ${theme.glow}` }}>
                            <Activity size={44} style={{ color: theme.secondary }} />
                        </div>
                        <span className="text-red-400 text-[10px] font-bold mt-2 tracking-wider animate-pulse">WEAKENED</span>
                    </motion.div>
                    <motion.svg
                        viewBox="0 0 100 100"
                        className="w-48 h-48 absolute"
                        initial={{ rotate: 0 }}
                        animate={{ rotate: -360 }}
                        transition={{ duration: 1.2, ease: "linear" }}
                    >
                        <circle cx="50" cy="50" r="40" fill="none" stroke={strokeStyle} strokeWidth="3" strokeDasharray="5 5" />
                    </motion.svg>
                </div>
            );

        case 'BUFF_BARRIER':
            return (
                <div className="relative flex items-center justify-center">
                    <motion.div
                        initial={{ scale: 0.1, opacity: 0, rotate: -45 }}
                        animate={{ scale: [0.1, 1.4, 1.2], opacity: [0, 1, 0.8], rotate: [-45, 0] }}
                        exit={{ scale: 0.5, opacity: 0 }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                        className="w-64 h-64 md:w-80 md:h-80 absolute flex items-center justify-center"
                    >
                        {/* Hexagonal grid-like SVG barrier effect */}
                        <svg viewBox="0 0 120 120" className="w-full h-full absolute">
                            <polygon 
                                points="60,10 105,35 105,85 60,110 15,85 15,35" 
                                fill="none" 
                                stroke={strokeStyle} 
                                strokeWidth="4" 
                                strokeDasharray="3 3"
                                style={{ filter: `drop-shadow(0 0 15px ${theme.glow})` }}
                            />
                            <polygon 
                                points="60,20 95,40 95,80 60,100 25,80 25,40" 
                                fill="rgba(255,255,255,0.05)" 
                                stroke={theme.secondary} 
                                strokeWidth="2" 
                            />
                        </svg>
                        <motion.div
                            animate={{ scale: [1, 1.15, 1] }}
                            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                        >
                            <Shield size={40} style={{ color: theme.accent, filter: `drop-shadow(0 0 8px ${theme.glow})` }} />
                        </motion.div>
                    </motion.div>
                </div>
            );

        case 'DEBUFF_SHACKLE':
            return (
                <div className="relative flex items-center justify-center">
                    <motion.div
                        initial={{ scale: 2.0, opacity: 0, rotate: 180 }}
                        animate={{ scale: [2.0, 0.9, 1.05], opacity: [0, 1, 0], rotate: [180, 0] }}
                        transition={{ duration: 0.9, ease: "backOut" }}
                        className="absolute flex items-center justify-center"
                    >
                        <svg viewBox="0 0 100 100" className="w-56 h-56 absolute">
                            {/* SVG Chain Links encircling target */}
                            <circle cx="50" cy="50" r="35" fill="none" stroke={strokeStyle} strokeWidth="6" strokeDasharray="15 8" style={{ filter: `drop-shadow(0 0 10px ${theme.glow})` }} />
                            <circle cx="50" cy="50" r="42" fill="none" stroke={theme.secondary} strokeWidth="2" strokeDasharray="4 4" />
                        </svg>
                        <div className="p-3 bg-slate-950/80 rounded-full border border-red-500/30">
                            <Lock size={36} className="text-red-500 animate-pulse" />
                        </div>
                    </motion.div>
                </div>
            );

        case 'BUFF_HEAVENLY':
            return (
                <div className="relative flex items-center justify-center">
                    <motion.div
                        initial={{ scale: 0.3, opacity: 0 }}
                        animate={{ scale: [0.3, 1.4, 1.2], opacity: [0, 1, 0] }}
                        transition={{ duration: 1.2, ease: "easeOut" }}
                        className="w-72 h-72 absolute flex items-center justify-center"
                    >
                        {/* Circular halo with outer glow and heart/cross elements */}
                        <svg viewBox="0 0 100 100" className="w-full h-full absolute animate-spin" style={{ animationDuration: '6s' }}>
                            <circle cx="50" cy="50" r="44" fill="none" stroke={strokeStyle} strokeWidth="3" />
                            <path d="M 50 10 L 50 20 M 50 80 L 50 90 M 10 50 L 20 50 M 80 50 L 90 50" stroke={theme.secondary} strokeWidth="2.5" />
                        </svg>
                        <div className="flex flex-col items-center">
                            <Heart size={44} style={{ color: theme.primary, filter: `drop-shadow(0 0 12px ${theme.glow})` }} className="animate-bounce" />
                            <span className="text-[10px] tracking-wider text-slate-100 font-bold bg-slate-900/80 px-2 py-0.5 rounded border border-white/10 mt-1 uppercase">HEAL</span>
                        </div>
                    </motion.div>
                    {[0, 0.3, 0.6].map((delay, idx) => (
                        <motion.div
                            key={idx}
                            initial={{ y: 50, x: (idx - 1) * 35, opacity: 0, scale: 0.5 }}
                            animate={{ y: [-50, -100], opacity: [0, 1, 0], scale: [0.5, 1.3] }}
                            transition={{ duration: 1.2, delay, repeat: Infinity }}
                            className="absolute"
                        >
                            <Sparkles size={18} style={{ color: theme.accent }} />
                        </motion.div>
                    ))}
                </div>
            );

        case 'DEBUFF_CURSE':
            return (
                <div className="relative flex items-center justify-center">
                    <motion.div
                        initial={{ scale: 0.1, opacity: 0, rotate: 0 }}
                        animate={{ scale: [0.1, 1.5, 1.3], opacity: [0, 1, 0], rotate: [0, 360] }}
                        transition={{ duration: 1.1, ease: "anticipate" }}
                        className="w-72 h-72 absolute flex items-center justify-center"
                    >
                        <svg viewBox="0 0 120 120" className="w-full h-full absolute">
                            {/* Hexagram of curse */}
                            <polygon points="60,15 100,85 20,85" fill="none" stroke={strokeStyle} strokeWidth="3" style={{ filter: `drop-shadow(0 0 12px ${theme.glow})` }} />
                            <polygon points="60,105 100,35 20,35" fill="none" stroke={theme.secondary} strokeWidth="2" />
                            <circle cx="60" cy="60" r="50" fill="none" stroke={theme.accent} strokeWidth="1.5" strokeDasharray="3 3" />
                        </svg>
                        <div className="flex flex-col items-center z-10">
                            <Skull size={46} style={{ color: theme.primary, filter: `drop-shadow(0 0 10px ${theme.glow})` }} />
                            <span className="text-[9px] font-extrabold text-red-500 tracking-widest mt-1 uppercase bg-black/70 px-2 rounded">CURSED</span>
                        </div>
                    </motion.div>
                </div>
            );

        case 'BUFF_GOD_AVATAR':
            return (
                <div className="relative flex items-center justify-center">
                    {/* Grand background mandala / celestial circle */}
                    <motion.div
                        initial={{ scale: 0.1, rotate: 0, opacity: 0 }}
                        animate={{ scale: [0.1, 1.7, 1.3], rotate: [0, -180], opacity: [0, 1, 0] }}
                        transition={{ duration: 1.3, ease: "easeOut" }}
                        className="w-[450px] h-[450px] absolute"
                        style={{
                            background: `radial-gradient(circle, rgba(255,255,255,0.08) 0%, ${theme.bgGlow} 60%, transparent 100%)`,
                            filter: `blur(8px)`
                        }}
                    />
                    <motion.div
                        initial={{ scale: 0.2, opacity: 0 }}
                        animate={{ scale: [0.2, 1.5, 1.1], opacity: [0, 1, 0] }}
                        transition={{ duration: 1.2, ease: "easeOut" }}
                        className="w-[400px] h-[400px] absolute flex items-center justify-center"
                    >
                        {/* Wing-like energy vectors */}
                        <svg viewBox="0 0 200 200" className="w-full h-full absolute">
                            {/* Left Wings */}
                            <path d="M 100 100 C 60 70, 10 120, 40 160 C 10 130, 40 80, 100 100 Z" fill={strokeStyle} style={{ filter: `drop-shadow(0 0 15px ${theme.glow})` }} />
                            <path d="M 100 100 C 50 50, 20 80, 60 130 C 20 100, 50 60, 100 100 Z" fill={theme.secondary} opacity="0.7" />
                            {/* Right Wings */}
                            <path d="M 100 100 C 140 70, 190 120, 160 160 C 190 130, 160 80, 100 100 Z" fill={strokeStyle} style={{ filter: `drop-shadow(0 0 15px ${theme.glow})` }} />
                            <path d="M 100 100 C 150 50, 180 80, 140 130 C 180 100, 150 60, 100 100 Z" fill={theme.secondary} opacity="0.7" />
                        </svg>
                        <Crown size={56} className="text-yellow-200 animate-pulse drop-shadow-[0_0_25px_rgba(255,255,255,1)]" />
                    </motion.div>
                </div>
            );

        case 'DEBUFF_APOCALYPSE':
            return (
                <div className="relative flex items-center justify-center">
                    {/* Gravitational black hole core */}
                    <motion.div
                        initial={{ scale: 0.1, opacity: 0 }}
                        animate={{ scale: [0.1, 2.5, 0.1, 4.0], opacity: [0, 1, 1, 0] }}
                        transition={{ duration: 1.4, times: [0, 0.4, 0.7, 1.0], ease: "easeInOut" }}
                        className="w-48 h-48 rounded-full absolute flex items-center justify-center"
                        style={{
                            background: `radial-gradient(circle, #000000 0%, ${theme.primary} 45%, ${theme.accent} 75%, transparent 100%)`,
                            boxShadow: `inset 0 0 30px #000, 0 0 80px ${theme.glow}`
                        }}
                    >
                        <Skull size={36} className="text-black/80" />
                    </motion.div>
                    {/* Accretion disc dust lines */}
                    <motion.div
                        initial={{ rotate: 0, scale: 0.3, opacity: 0 }}
                        animate={{ rotate: 720, scale: [0.3, 2.2, 0], opacity: [0, 0.9, 0] }}
                        transition={{ duration: 1.4, ease: "anticipate" }}
                        className="w-[350px] h-[350px] rounded-full border-2 border-double absolute"
                        style={{ borderColor: theme.secondary, borderTopColor: 'transparent', borderBottomColor: 'transparent' }}
                    />
                </div>
            );

        case 'FIST_CRUSH':
            return (
                <div className="relative flex items-center justify-center">
                    <motion.div
                        initial={{ scale: 0.1, opacity: 0 }}
                        animate={{ scale: [0.1, 1.8, 1.3], opacity: [0, 1, 0] }}
                        transition={{ duration: 0.5, ease: "backOut" }}
                        className="absolute flex items-center justify-center"
                    >
                        {/* Ring and fist impact shockwave */}
                        <div className="w-24 h-24 rounded-full border-4 flex items-center justify-center bg-slate-900/60" style={{ borderColor: theme.primary, boxShadow: `0 0 30px ${theme.glow}` }}>
                            <Mountain size={42} style={{ color: theme.accent }} className="animate-pulse" />
                        </div>
                    </motion.div>
                    {/* Shockwaves moving outward */}
                    {[1, 2].map((i) => (
                        <motion.div
                            key={i}
                            initial={{ scale: 0.4, opacity: 1 }}
                            animate={{ scale: [0.4, 2.5], opacity: [1, 0] }}
                            transition={{ duration: 0.6, delay: i * 0.1, ease: "easeOut" }}
                            className="w-32 h-12 rounded-full border-2 absolute"
                            style={{ borderColor: theme.secondary, transform: `rotateX(60deg)` }}
                        />
                    ))}
                </div>
            );

        case 'POISON_MIST':
            return (
                <div className="relative flex items-center justify-center">
                    {/* Expanding misty clouds */}
                    {[0, 0.15, 0.3].map((delay, idx) => (
                        <motion.div
                            key={idx}
                            initial={{ scale: 0.2, opacity: 0, x: (idx - 1) * 20, y: (idx - 1) * -10 }}
                            animate={{ scale: [0.2, 2.2, 2.0], opacity: [0, 0.7, 0] }}
                            transition={{ duration: 1.1, delay, ease: "easeOut" }}
                            className="w-32 h-32 rounded-full absolute"
                            style={{
                                background: `radial-gradient(circle, ${theme.primary} 0%, ${theme.secondary} 50%, transparent 100%)`,
                                filter: `blur(12px)`,
                            }}
                        />
                    ))}
                    {/* Spiky rings */}
                    <motion.svg
                        viewBox="0 0 100 100"
                        className="w-48 h-48 absolute"
                        initial={{ rotate: 0, scale: 0.4 }}
                        animate={{ rotate: 180, scale: [0.4, 1.4, 1.0], opacity: [1, 1, 0] }}
                        transition={{ duration: 0.8 }}
                    >
                        <circle cx="50" cy="50" r="35" fill="none" stroke={strokeStyle} strokeWidth="2" strokeDasharray="6 4" />
                    </motion.svg>
                </div>
            );

        case 'WIND_SWIFT':
            return (
                <div className="relative flex items-center justify-center">
                    {/* Double swirling rings */}
                    <motion.div
                        initial={{ scale: 0.2, rotate: 0, opacity: 0 }}
                        animate={{ scale: [0.2, 1.6, 1.3], rotate: 360, opacity: [0, 1, 0] }}
                        transition={{ duration: 0.85, ease: "easeOut" }}
                        className="w-44 h-44 rounded-full border-4 border-double absolute flex items-center justify-center"
                        style={{ borderColor: theme.primary, borderLeftColor: 'transparent', borderRightColor: 'transparent', filter: `drop-shadow(0 0 15px ${theme.glow})` }}
                    >
                        <Wind size={28} style={{ color: theme.accent }} />
                    </motion.div>
                    <motion.div
                        initial={{ scale: 0.4, rotate: 180, opacity: 0 }}
                        animate={{ scale: [0.4, 2.0], rotate: -180, opacity: [0, 0.8, 0] }}
                        transition={{ duration: 0.85, delay: 0.1, ease: "easeOut" }}
                        className="w-36 h-36 rounded-full border-2 border-dashed absolute"
                        style={{ borderColor: theme.secondary, borderTopColor: 'transparent', borderBottomColor: 'transparent' }}
                    />
                    {/* Rising green leaves/sparks */}
                    {[0, 0.2, 0.4].map((delay, idx) => (
                        <motion.div
                            key={idx}
                            initial={{ y: 40, x: (idx - 1) * 30, opacity: 0, scale: 0.5 }}
                            animate={{ y: -60, opacity: [0, 1, 0], scale: 1.2 }}
                            transition={{ duration: 0.9, delay, repeat: Infinity }}
                            className="absolute"
                        >
                            <Leaf size={16} style={{ color: theme.secondary }} />
                        </motion.div>
                    ))}
                </div>
            );

        case 'METEOR_STRIKE':
            return (
                <div className="relative flex items-center justify-center">
                    {/* Incoming fiery meteor */}
                    <motion.div
                        initial={{ x: -180, y: -220, scale: 0.3, opacity: 0 }}
                        animate={{ x: [ -180, 0 ], y: [ -220, 0 ], scale: [0.3, 1.8], opacity: [0, 1] }}
                        transition={{ duration: 0.5, ease: "easeIn" }}
                        className="absolute"
                    >
                        <div className="w-16 h-16 rounded-full" style={{
                            background: `radial-gradient(circle, #ffffff 0%, ${theme.primary} 40%, ${theme.secondary} 80%, transparent 100%)`,
                            boxShadow: `0 0 35px ${theme.glow}`
                        }} />
                    </motion.div>
                    {/* Impact Super Blast */}
                    <motion.div
                        initial={{ scale: 0.1, opacity: 0 }}
                        animate={{ scale: [0.1, 2.8, 2.2], opacity: [0, 0, 1, 0] }}
                        transition={{ duration: 0.9, delay: 0.45, ease: "easeOut" }}
                        className="w-56 h-56 rounded-full absolute"
                        style={{
                            background: `radial-gradient(circle, #ffffff 0%, ${theme.primary} 50%, transparent 100%)`,
                            filter: `blur(4px)`
                        }}
                    />
                </div>
            );

        case 'TIME_STOP':
            return (
                <div className="relative flex items-center justify-center">
                    {/* Clock cog rotation */}
                    <motion.div
                        initial={{ scale: 0.1, rotate: 0, opacity: 0 }}
                        animate={{ scale: [0.1, 1.8, 1.4], rotate: 240, opacity: [0, 1, 0] }}
                        transition={{ duration: 1.1, ease: "anticipate" }}
                        className="w-64 h-64 md:w-80 md:h-80 absolute flex items-center justify-center"
                    >
                        <svg viewBox="0 0 120 120" className="w-full h-full absolute">
                            <circle cx="60" cy="60" r="50" fill="none" stroke={strokeStyle} strokeWidth="3" />
                            <circle cx="60" cy="60" r="44" fill="none" stroke={theme.secondary} strokeWidth="1.5" strokeDasharray="8 4" />
                            {/* Dial ticks */}
                            <path d="M 60 10 L 60 18 M 60 110 L 60 102 M 10 60 L 18 60 M 110 60 L 102 60" stroke={theme.accent} strokeWidth="2.5" />
                            {/* Clock hands */}
                            <line x1="60" y1="60" x2="60" y2="35" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" />
                            <line x1="60" y1="60" x2="85" y2="60" stroke={theme.secondary} strokeWidth="2.5" strokeLinecap="round" />
                        </svg>
                    </motion.div>
                    {/* Tech temporal grid lines */}
                    <motion.div
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: [0.5, 2.2], opacity: [0, 0.8, 0] }}
                        transition={{ duration: 0.9, ease: "easeOut" }}
                        className="w-48 h-48 border-2 border-dashed absolute"
                        style={{ borderColor: theme.primary, transform: 'rotate(45deg)', boxShadow: `0 0 25px ${theme.glow}` }}
                    />
                </div>
            );

        // --- 2차 대규모 추가 업데이트 (Tier 1) ---
        case 'MAGIC_MISSILE':
            return (
                <div className="relative flex items-center justify-center">
                    {[0, 1, 2, 3, 4].map((i) => (
                        <motion.div
                            key={i}
                            initial={{ scale: 0, x: -100 + Math.random() * 50, y: -50 + Math.random() * 100, opacity: 0 }}
                            animate={{ scale: [0, 1.2, 0.5, 0], x: 0, y: 0, opacity: [0, 1, 1, 0] }}
                            transition={{ duration: 0.6 + Math.random() * 0.3, delay: i * 0.1, ease: "easeIn" }}
                            className="absolute w-8 h-8 rounded-full"
                            style={{ background: `radial-gradient(circle, #fff 0%, ${theme.primary} 50%, transparent 100%)`, filter: `drop-shadow(0 0 10px ${theme.glow})` }}
                        />
                    ))}
                    <motion.div
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: [0, 2.5, 3.0], opacity: [0, 1, 0] }}
                        transition={{ duration: 0.8, delay: 0.4 }}
                        className="absolute w-32 h-32 rounded-full"
                        style={{ background: `radial-gradient(circle, ${theme.secondary} 0%, transparent 70%)` }}
                    />
                </div>
            );

        case 'SHIELD_BASH':
            return (
                <div className="relative flex items-center justify-center">
                    <motion.div
                        initial={{ x: -100, scale: 0.8, opacity: 0 }}
                        animate={{ x: [ -100, 20, 0 ], scale: [0.8, 1.3, 1], opacity: [0, 1, 0] }}
                        transition={{ duration: 0.7, ease: "backOut" }}
                        className="absolute flex items-center justify-center"
                    >
                        <Shield size={64} style={{ color: theme.primary, filter: `drop-shadow(0 0 20px ${theme.glow})` }} />
                    </motion.div>
                    <motion.div
                        initial={{ scale: 0.5, opacity: 0, x: 20 }}
                        animate={{ scale: [0.5, 2.5], opacity: [0, 0.8, 0], x: 40 }}
                        transition={{ duration: 0.6, delay: 0.2 }}
                        className="absolute w-40 h-64 border-r-8 rounded-[50%]"
                        style={{ borderColor: theme.secondary, filter: `blur(4px)` }}
                    />
                </div>
            );

        case 'EARTH_SPIKE':
            return (
                <div className="relative flex items-end justify-center h-full">
                    {[0, 1, 2].map((i) => (
                        <motion.div
                            key={i}
                            initial={{ y: 50, scaleY: 0, opacity: 0 }}
                            animate={{ y: -20, scaleY: [0, 1.5, 1], opacity: [0, 1, 0] }}
                            transition={{ duration: 0.6, delay: i * 0.15, ease: "backOut" }}
                            className="absolute bottom-0 w-16"
                            style={{ 
                                height: `${80 + Math.random() * 40}px`,
                                left: `${-40 + i * 40}px`,
                                background: `linear-gradient(to top, ${theme.primary} 0%, ${theme.secondary} 100%)`,
                                clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)',
                                filter: `drop-shadow(0 0 10px ${theme.glow})`
                            }}
                        />
                    ))}
                </div>
            );

        case 'WATER_SPLASH':
            return (
                <div className="relative flex items-center justify-center">
                    <motion.div
                        initial={{ scale: 0, opacity: 0, y: 50 }}
                        animate={{ scale: [0, 2, 2.5], opacity: [0, 1, 0], y: [50, 0, -20] }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                        className="absolute flex items-center justify-center"
                    >
                        <Droplets size={56} style={{ color: theme.primary, filter: `drop-shadow(0 0 15px ${theme.glow})` }} />
                    </motion.div>
                    {[0, 1, 2, 3].map((i) => (
                        <motion.div
                            key={`splash-${i}`}
                            initial={{ scale: 0, opacity: 0, x: 0, y: 0 }}
                            animate={{ 
                                scale: [0, 1.5], 
                                opacity: [1, 0], 
                                x: (Math.random() - 0.5) * 150, 
                                y: (Math.random() - 0.5) * 150 - 50 
                            }}
                            transition={{ duration: 0.7, ease: "easeOut" }}
                            className="absolute w-8 h-8 rounded-full"
                            style={{ backgroundColor: theme.secondary, filter: `blur(2px)` }}
                        />
                    ))}
                </div>
            );

        // --- 2차 대규모 추가 업데이트 (Tier 2) ---
        case 'LIGHTNING_CHAIN':
            return (
                <div className="relative flex items-center justify-center">
                    <svg viewBox="0 0 200 200" className="w-64 h-64 absolute">
                        <motion.path
                            d="M 20 100 Q 50 20, 100 100 T 180 100"
                            fill="none"
                            stroke={strokeStyle}
                            strokeWidth="4"
                            initial={{ pathLength: 0, opacity: 0 }}
                            animate={{ pathLength: [0, 1, 1], opacity: [0, 1, 0] }}
                            transition={{ duration: 0.6, repeat: Infinity, ease: "linear" }}
                            style={{ filter: `drop-shadow(0 0 12px ${theme.glow})` }}
                        />
                        <motion.path
                            d="M 20 100 Q 80 180, 100 100 T 180 100"
                            fill="none"
                            stroke={theme.secondary}
                            strokeWidth="3"
                            initial={{ pathLength: 0, opacity: 0 }}
                            animate={{ pathLength: [0, 1, 1], opacity: [0, 1, 0] }}
                            transition={{ duration: 0.7, delay: 0.2, repeat: Infinity, ease: "linear" }}
                        />
                    </svg>
                    <Zap size={48} className="animate-ping" style={{ color: theme.accent }} />
                </div>
            );

        case 'ICE_NOVA':
            return (
                <div className="relative flex items-center justify-center">
                    <motion.div
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: [0, 2.5], opacity: [1, 0] }}
                        transition={{ duration: 0.9, ease: "easeOut" }}
                        className="absolute w-56 h-56 rounded-full border-8"
                        style={{ borderColor: theme.primary, filter: `blur(4px)` }}
                    />
                    <motion.div
                        initial={{ scale: 0, rotate: -90, opacity: 0 }}
                        animate={{ scale: [0, 1.8, 1.2], rotate: 0, opacity: [0, 1, 0] }}
                        transition={{ duration: 0.8 }}
                        className="absolute flex items-center justify-center"
                    >
                        <Snowflake size={64} style={{ color: theme.secondary, filter: `drop-shadow(0 0 15px ${theme.glow})` }} />
                    </motion.div>
                </div>
            );

        case 'BLOOD_DRAIN':
            return (
                <div className="relative flex items-center justify-center">
                    {[0, 1, 2, 3, 4].map((i) => (
                        <motion.div
                            key={i}
                            initial={{ scale: 0.5, opacity: 0, x: (Math.random() - 0.5) * 150, y: (Math.random() - 0.5) * 150 }}
                            animate={{ scale: [0.5, 1.5, 0], opacity: [0, 1, 0], x: 0, y: 0 }}
                            transition={{ duration: 0.8, delay: i * 0.15, ease: "easeInOut" }}
                            className="absolute flex items-center justify-center"
                        >
                            <Heart size={24} style={{ color: theme.primary, fill: theme.primary, filter: `drop-shadow(0 0 8px ${theme.glow})` }} />
                        </motion.div>
                    ))}
                    <motion.div
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: [0, 1.5, 2.0], opacity: [0, 0.8, 0] }}
                        transition={{ duration: 1.0, delay: 0.5 }}
                        className="absolute w-40 h-40 rounded-full"
                        style={{ background: `radial-gradient(circle, ${theme.secondary} 0%, transparent 70%)` }}
                    />
                </div>
            );

        case 'SOUND_WAVE':
            return (
                <div className="relative flex items-center justify-center">
                    {[1, 2, 3].map((i) => (
                        <motion.div
                            key={i}
                            initial={{ scale: 0.2, opacity: 1, borderTopRightRadius: "50%", borderBottomRightRadius: "50%" }}
                            animate={{ scale: [0.2, 2.5 + i], opacity: [1, 0] }}
                            transition={{ duration: 0.8, delay: i * 0.2, repeat: Infinity, ease: "linear" }}
                            className="absolute w-32 h-64 border-r-4 border-dashed"
                            style={{ borderColor: theme.primary, filter: `drop-shadow(0 0 10px ${theme.glow})` }}
                        />
                    ))}
                    <Activity size={48} className="animate-pulse" style={{ color: theme.accent }} />
                </div>
            );

        case 'LASER_BEAM':
            return (
                <div className="relative flex items-center justify-center w-full h-full">
                    <motion.div
                        initial={{ scaleY: 0, opacity: 0 }}
                        animate={{ scaleY: [0, 1.5, 0], opacity: [0, 1, 0] }}
                        transition={{ duration: 0.7, ease: "easeInOut" }}
                        className="absolute w-[200%] h-12"
                        style={{ 
                            background: `linear-gradient(to right, transparent 0%, ${theme.primary} 20%, #fff 50%, ${theme.secondary} 80%, transparent 100%)`,
                            boxShadow: `0 0 30px ${theme.glow}`,
                            rotate: '15deg'
                        }}
                    />
                </div>
            );

        case 'SACRED_FLAME':
            return (
                <div className="relative flex items-center justify-center">
                    <motion.div
                        initial={{ scale: 0.5, y: 30, opacity: 0 }}
                        animate={{ scale: [0.5, 1.8, 1.2], y: [30, -20, -40], opacity: [0, 1, 0] }}
                        transition={{ duration: 1.2, ease: "easeOut" }}
                        className="absolute flex items-center justify-center"
                    >
                        <Flame size={72} style={{ color: theme.primary, filter: `drop-shadow(0 0 20px ${theme.glow})` }} />
                    </motion.div>
                    <motion.div
                        initial={{ scale: 1, opacity: 0, y: 0 }}
                        animate={{ scale: [1, 2], opacity: [0, 0.5, 0], y: -80 }}
                        transition={{ duration: 1.2, delay: 0.2 }}
                        className="absolute w-40 h-40 rounded-full"
                        style={{ background: `radial-gradient(circle, ${theme.secondary} 0%, transparent 60%)`, filter: 'blur(8px)' }}
                    />
                </div>
            );

        // --- 2차 대규모 추가 업데이트 (Tier 3) ---
        case 'THUNDER_STORM':
            return (
                <div className="relative flex items-center justify-center">
                    <motion.div
                        initial={{ scale: 0.8, opacity: 0, y: -80 }}
                        animate={{ scale: [0.8, 1.2], opacity: [0, 1, 0.8], y: -50 }}
                        transition={{ duration: 1.5, ease: "easeOut" }}
                        className="absolute w-72 h-32 rounded-full"
                        style={{ background: `linear-gradient(to bottom, #1e293b, ${theme.secondary})`, filter: 'blur(15px)' }}
                    />
                    {[0, 1, 2, 3].map((i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, scaleY: 0, y: -40, x: (i - 1.5) * 40 }}
                            animate={{ opacity: [0, 1, 0], scaleY: [0, 2], y: 40 }}
                            transition={{ duration: 0.3, delay: i * 0.2, repeat: Infinity, repeatDelay: 0.5 }}
                            className="absolute w-4 h-64"
                            style={{ background: `linear-gradient(to bottom, transparent, #fff, ${theme.primary})`, filter: `drop-shadow(0 0 10px ${theme.glow})` }}
                        />
                    ))}
                </div>
            );

        case 'LAVA_ERUPTION':
            return (
                <div className="relative flex items-end justify-center h-full pb-10">
                    <motion.div
                        initial={{ scaleX: 0, opacity: 0 }}
                        animate={{ scaleX: [0, 1.5, 1], opacity: [0, 1, 0] }}
                        transition={{ duration: 1.5 }}
                        className="absolute bottom-0 w-64 h-8 rounded-[50%]"
                        style={{ background: `radial-gradient(ellipse, ${theme.primary} 0%, transparent 70%)` }}
                    />
                    <motion.div
                        initial={{ scaleY: 0, opacity: 0, y: 50 }}
                        animate={{ scaleY: [0, 2.5, 2], opacity: [0, 1, 0], y: [-50, -100] }}
                        transition={{ duration: 1.2, ease: "easeOut" }}
                        className="absolute bottom-0 w-32 h-64"
                        style={{ 
                            background: `linear-gradient(to top, ${theme.primary} 0%, ${theme.secondary} 50%, transparent 100%)`,
                            filter: 'blur(8px)',
                            clipPath: 'polygon(30% 0, 70% 0, 100% 100%, 0 100%)'
                        }}
                    />
                </div>
            );

        case 'ANGELIC_CHOIR':
            return (
                <div className="relative flex items-center justify-center">
                    <motion.svg viewBox="0 0 200 200" className="w-80 h-80 absolute animate-spin-slow">
                        {[0, 60, 120, 180, 240, 300].map((angle) => (
                            <polygon
                                key={angle}
                                points="100,20 110,80 100,100 90,80"
                                fill={theme.secondary}
                                transform={`rotate(${angle} 100 100)`}
                                style={{ filter: `drop-shadow(0 0 8px ${theme.glow})` }}
                            />
                        ))}
                    </motion.svg>
                    {[1, 2, 3].map((i) => (
                        <motion.div
                            key={i}
                            initial={{ scale: 0, y: 50, opacity: 0 }}
                            animate={{ scale: [0, 1.5], y: -100, opacity: [0, 1, 0] }}
                            transition={{ duration: 1.5, delay: i * 0.4, repeat: Infinity }}
                            className="absolute"
                        >
                            <Heart size={32} style={{ color: theme.primary, fill: theme.primary }} />
                        </motion.div>
                    ))}
                </div>
            );

        case 'GRAVITY_PRESS':
            return (
                <div className="relative flex items-center justify-center">
                    <motion.div
                        initial={{ scale: 3, opacity: 0 }}
                        animate={{ scale: [3, 0.8, 1], opacity: [0, 1, 1] }}
                        transition={{ duration: 0.7, ease: "easeIn" }}
                        className="absolute w-48 h-48 border-4 flex items-center justify-center bg-slate-900/50"
                        style={{ borderColor: theme.primary, transform: 'rotateX(60deg) rotateZ(45deg)', boxShadow: `inset 0 0 30px ${theme.secondary}, 0 0 30px ${theme.glow}` }}
                    >
                        <motion.div
                            animate={{ rotateZ: 360 }}
                            transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                            className="w-full h-full border-2 border-dashed"
                            style={{ borderColor: theme.accent }}
                        />
                    </motion.div>
                    <motion.div
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: [0, 1.5, 0], opacity: [0, 1, 0] }}
                        transition={{ duration: 0.8, delay: 0.7 }}
                        className="absolute w-64 h-64 rounded-full"
                        style={{ background: `radial-gradient(circle, #000 0%, transparent 60%)` }}
                    />
                </div>
            );

        case 'ILLUSION_CLONE':
            return (
                <div className="relative flex items-center justify-center">
                    {[0, 90, 180, 270].map((angle, i) => (
                        <motion.div
                            key={angle}
                            initial={{ opacity: 0, x: Math.cos(angle * Math.PI / 180) * 150, y: Math.sin(angle * Math.PI / 180) * 150 }}
                            animate={{ opacity: [0, 0.8, 0], x: 0, y: 0 }}
                            transition={{ duration: 0.5, delay: i * 0.1, ease: "easeIn" }}
                            className="absolute flex items-center justify-center"
                        >
                            <Sword size={48} style={{ color: theme.secondary, filter: `drop-shadow(0 0 10px ${theme.glow})` }} />
                        </motion.div>
                    ))}
                    <motion.div
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: [0, 2], opacity: [0, 1, 0] }}
                        transition={{ duration: 0.6, delay: 0.5 }}
                        className="absolute"
                    >
                        <Sword size={64} style={{ color: theme.primary, filter: `drop-shadow(0 0 20px ${theme.glow})` }} />
                    </motion.div>
                </div>
            );

        // --- 2차 대규모 추가 업데이트 (Tier 4) ---
        case 'DIMENSION_SHATTER':
            return (
                <div className="relative flex items-center justify-center">
                    <motion.div
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: [0.5, 1], opacity: [0, 1, 1] }}
                        transition={{ duration: 0.4 }}
                        className="absolute w-80 h-80"
                    >
                        <svg viewBox="0 0 200 200" className="w-full h-full">
                            <motion.path
                                d="M100 100 L50 20 M100 100 L180 60 M100 100 L150 180 M100 100 L20 150 M100 100 L80 10"
                                stroke={strokeStyle}
                                strokeWidth="3"
                                initial={{ pathLength: 0 }}
                                animate={{ pathLength: 1 }}
                                transition={{ duration: 0.3 }}
                                style={{ filter: `drop-shadow(0 0 15px ${theme.glow})` }}
                            />
                        </svg>
                    </motion.div>
                    <motion.div
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: [0, 3], opacity: [0, 1, 0] }}
                        transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
                        className="absolute w-64 h-64 rounded-full"
                        style={{ background: `radial-gradient(circle, #fff 0%, ${theme.primary} 30%, transparent 70%)` }}
                    />
                </div>
            );

        case 'STAR_FALL':
            return (
                <div className="relative flex items-center justify-center overflow-visible">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: [0, 0.8, 0] }}
                        transition={{ duration: 2 }}
                        className="absolute w-[400px] h-[400px]"
                        style={{ background: `radial-gradient(circle, ${theme.bgGlow} 0%, transparent 70%)` }}
                    />
                    {[0, 1, 2, 3, 4, 5, 6].map((i) => (
                        <motion.div
                            key={i}
                            initial={{ x: -200 + Math.random() * 400, y: -300, scale: 0, opacity: 0 }}
                            animate={{ x: -100 + Math.random() * 200, y: 300, scale: [0, 1.5, 0], opacity: [0, 1, 0] }}
                            transition={{ duration: 1, delay: i * 0.15, ease: "linear" }}
                            className="absolute"
                        >
                            <Star size={Math.random() * 24 + 16} style={{ color: '#fff', fill: theme.primary, filter: `drop-shadow(0 0 15px ${theme.glow})` }} />
                        </motion.div>
                    ))}
                </div>
            );

        case 'WORLD_TREE':
            return (
                <div className="relative flex items-end justify-center h-full pb-10">
                    <motion.div
                        initial={{ scaleY: 0, opacity: 0 }}
                        animate={{ scaleY: [0, 1], opacity: [0, 1] }}
                        transition={{ duration: 1 }}
                        className="absolute bottom-0 w-8 h-64 origin-bottom"
                        style={{ background: `linear-gradient(to top, ${theme.secondary}, ${theme.primary})`, filter: `drop-shadow(0 0 15px ${theme.glow})` }}
                    />
                    <motion.div
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: [0, 2], opacity: [0, 0.8, 0] }}
                        transition={{ duration: 1.5, delay: 0.5 }}
                        className="absolute bottom-40 w-64 h-64 rounded-full"
                        style={{ background: `radial-gradient(circle, ${theme.primary} 0%, transparent 60%)`, filter: 'blur(10px)' }}
                    />
                    {[...Array(8)].map((_, i) => (
                        <motion.div
                            key={i}
                            initial={{ scale: 0, opacity: 0, y: -100, x: 0 }}
                            animate={{ scale: [0, 1, 0], opacity: [0, 1, 0], y: -200 - Math.random() * 50, x: (Math.random() - 0.5) * 200 }}
                            transition={{ duration: 1.5, delay: 0.8 + Math.random() * 0.5 }}
                            className="absolute bottom-40"
                        >
                            <Leaf size={24} style={{ color: theme.accent, filter: `drop-shadow(0 0 10px ${theme.glow})` }} />
                        </motion.div>
                    ))}
                </div>
            );

        case 'DEMON_HAND':
            return (
                <div className="relative flex items-center justify-center">
                    <motion.div
                        initial={{ scale: 0, opacity: 0, y: 100 }}
                        animate={{ scale: [0, 2.5, 2], opacity: [0, 1, 0], y: [100, 0, 0] }}
                        transition={{ duration: 1.2, ease: "easeOut" }}
                        className="absolute"
                    >
                        <svg viewBox="0 0 100 100" className="w-48 h-48">
                            <path d="M 30 80 Q 20 50, 40 20 Q 50 10, 60 20 Q 80 50, 70 80" fill="none" stroke={theme.primary} strokeWidth="8" strokeLinecap="round" style={{ filter: `drop-shadow(0 0 15px ${theme.glow})` }} />
                            <path d="M 20 70 Q 10 40, 25 15" fill="none" stroke={theme.secondary} strokeWidth="5" strokeLinecap="round" />
                            <path d="M 80 70 Q 90 40, 75 15" fill="none" stroke={theme.secondary} strokeWidth="5" strokeLinecap="round" />
                        </svg>
                    </motion.div>
                    <motion.div
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: [0, 2], opacity: [0, 1, 0] }}
                        transition={{ duration: 0.5, delay: 0.8 }}
                        className="absolute w-40 h-40 rounded-full"
                        style={{ background: '#000', boxShadow: `0 0 40px ${theme.accent}` }}
                    />
                </div>
            );

        case 'YIN_YANG':
            return (
                <div className="relative flex items-center justify-center">
                    <motion.div
                        initial={{ scale: 0, rotate: -180, opacity: 0 }}
                        animate={{ scale: [0, 1.5, 1.2], rotate: 360, opacity: [0, 1, 0] }}
                        transition={{ duration: 1.5, ease: "easeInOut" }}
                        className="absolute w-64 h-64 rounded-full border-4 flex items-center justify-center overflow-hidden"
                        style={{ borderColor: theme.primary, background: `linear-gradient(to right, #000 50%, #fff 50%)`, boxShadow: `0 0 30px ${theme.glow}` }}
                    >
                        {/* 태극 무늬를 심플하게 구현 */}
                        <div className="absolute top-0 w-32 h-32 bg-black rounded-full border-4 border-white" />
                        <div className="absolute bottom-0 w-32 h-32 bg-white rounded-full border-4 border-black" />
                    </motion.div>
                    <motion.div
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: [0.5, 3], opacity: [0, 0.5, 0] }}
                        transition={{ duration: 1.2, delay: 0.5 }}
                        className="absolute w-72 h-72 rounded-full"
                        style={{ background: `radial-gradient(circle, ${theme.secondary} 0%, transparent 60%)` }}
                    />
                </div>
            );

        default:
            return null;
    }
};

const DEFAULT_THEME = SHINRYOKU_THEMES['화염계'];

export const CombatVFXOverlay: React.FC<{ vfx: CombatVFXData | null }> = ({ vfx }) => {
    if (!vfx) return null;
    return <CombatVFXContent vfx={vfx} />;
};

const CombatVFXContent: React.FC<{ vfx: CombatVFXData }> = ({ vfx }) => {
    const theme = useMemo(() => {
        let basePreset = SHINRYOKU_THEMES[vfx.shinryokuType] || DEFAULT_THEME;
        if (vfx.vfxTheme && CUSTOM_VFX_PRESETS[vfx.vfxTheme]) {
            basePreset = CUSTOM_VFX_PRESETS[vfx.vfxTheme];
        }

        const parsed = parseVfxColor(vfx.vfxColor, basePreset);

        return {
            ...basePreset,
            primary: parsed.primary,
            secondary: parsed.secondary,
            accent: parsed.accent,
            glow: parsed.glow,
            bgGlow: parsed.bgGlow,
            particles: parsed.particles,
            gradientCss: parsed.gradientCss,
            isGradient: parsed.isGradient,
            colors: parsed.colors
        };
    }, [vfx.vfxTheme, vfx.vfxColor, vfx.shinryokuType]);

    const svgGradId = useMemo(() => `vfx_grad_${Math.random().toString(36).substring(2, 8)}`, [vfx.id, vfx.vfxColor]);

    const IconComponent = theme.icon;
    const isAoe = vfx.isAoe;
    const tier = vfx.tier;

    // Tablet & Touch device detection for VFX performance optimization (방안 4)
    const isTabletOrTouch = useMemo(() => {
        if (typeof window === 'undefined') return false;
        return (
            window.matchMedia('(pointer: coarse)').matches ||
            window.matchMedia('(max-width: 1280px)').matches ||
            (typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0)
        );
    }, []);

    // Determine particle count and complexity based on tier (태블릿 환경 과부하 방지 최적화)
    const particleCount = useMemo(() => {
        if (isTabletOrTouch) {
            if (tier === ClassTier.FINAL || tier === ClassTier.BOND) return 14;
            if (tier === ClassTier.LAST) return 10;
            if (tier === ClassTier.SECOND) return 8;
            if (tier === ClassTier.FIRST) return 6;
            return 4; // Normal Attack
        }
        if (tier === ClassTier.FINAL || tier === ClassTier.BOND) return 50;
        if (tier === ClassTier.LAST) return 36;
        if (tier === ClassTier.SECOND) return 24;
        if (tier === ClassTier.FIRST) return 16;
        return 10; // Normal Attack
    }, [tier, isTabletOrTouch]);

    const particles = useMemo(() => {
        return Array.from({ length: particleCount }).map((_, i) => {
            const angle = (i / particleCount) * Math.PI * 2 + (Math.random() * 0.4 - 0.2);
            const dist = (isAoe ? 160 : 90) + Math.random() * (isAoe ? (isTabletOrTouch ? 120 : 200) : (isTabletOrTouch ? 60 : 120));
            const size = 3 + Math.random() * (tier === ClassTier.FINAL ? (isTabletOrTouch ? 5 : 8) : tier === ClassTier.LAST ? (isTabletOrTouch ? 4 : 6) : 4);
            const color = theme.particles[i % theme.particles.length];
            const delay = Math.random() * (isTabletOrTouch ? 0.08 : 0.15);
            const duration = 0.35 + Math.random() * 0.4;
            return {
                id: i,
                x: Math.cos(angle) * dist,
                y: Math.sin(angle) * dist,
                size,
                color,
                delay,
                duration
            };
        });
    }, [particleCount, isAoe, tier, theme, isTabletOrTouch]);

    // Tier badge label and style
    const tierLabel = useMemo(() => {
        if (tier === 'BUFF') return 'DIVINE BUFF · 신력 축복 & 강화';
        if (tier === 'DEBUFF') return 'CURSE & AILMENT · 신력 약화 & 상태이상';
        if (tier === ClassTier.FINAL) return 'FINAL CLASS · 극의 각성';
        if (tier === ClassTier.BOND) return 'BOND SKILL · 인연 합격기';
        if (tier === ClassTier.LAST) return 'LAST CLASS · 초월오의';
        if (tier === ClassTier.SECOND) return 'SECOND CLASS · 고위비전';
        if (tier === ClassTier.FIRST) return 'FIRST CLASS · 신력발현';
        return 'NORMAL ATTACK · 일반 타격';
    }, [tier]);

    // Container and Target Unit / Area Positioning (단일 타겟 유닛 및 광역 적군/아군 진영 중심점 계산)
    const overlayRef = useRef<HTMLDivElement>(null);

    // 초기 동기 계산 헬퍼: 첫 렌더링 시점에 이미 DOM에 존재하는 타겟 카드의 중심 좌표를 즉시 획득
    const getInitialPos = () => {
        if (typeof document === 'undefined') return null;
        const targetName = vfx.targetName;
        let el: Element | null = null;
        if (isAoe) {
            const isBuffOrHeal = tier === 'BUFF' || targetName === 'party' || targetName === 'ally' || targetName === 'allies';
            let isAttackerEnemy = false;
            if (vfx.attackerName) {
                isAttackerEnemy = document.querySelector(`[data-combat-area="enemies"] [data-combat-unit="${vfx.attackerName}"]`) !== null ||
                                  document.querySelector(`[data-combat-area="enemies"] [data-clean-name="${vfx.attackerName}"]`) !== null;
            }
            let targetAreaSelector = '[data-combat-area="enemies"]';
            if (isBuffOrHeal) {
                targetAreaSelector = isAttackerEnemy ? '[data-combat-area="enemies"]' : '[data-combat-area="allies"]';
            } else {
                targetAreaSelector = isAttackerEnemy ? '[data-combat-area="allies"]' : '[data-combat-area="enemies"]';
            }
            el = document.querySelector(targetAreaSelector);
        } else {
            if (targetName && targetName !== '적군' && targetName !== 'aoe' && targetName !== 'allies' && targetName !== '전체 대상') {
                el = document.querySelector(`[data-combat-unit="${targetName}"]`) || 
                     document.querySelector(`[data-clean-name="${targetName}"]`);
            }
            if (!el && tier !== 'BUFF') {
                el = document.querySelector('[data-combat-area="enemies"] [data-combat-unit]');
            }
        }
        if (el) {
            const rect = el.getBoundingClientRect();
            return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2, isAbsoluteViewport: true };
        }
        return null;
    };

    const [targetPos, setTargetPos] = useState<{ x: number; y: number } | null>(() => {
        const init = getInitialPos();
        if (init) return { x: init.x, y: init.y };
        return null;
    });

    useLayoutEffect(() => {
        const findAndSetTarget = () => {
            if (!overlayRef.current) return;
            const containerRect = overlayRef.current.getBoundingClientRect();
            if (containerRect.width === 0 || containerRect.height === 0) return;

            // 1. 광역(AOE) 스킬: 적군 진영 또는 아군 진영 컨테이너의 중심 계산
            if (isAoe) {
                const isBuffOrHeal = tier === 'BUFF' || vfx.targetName === 'party' || vfx.targetName === 'ally' || vfx.targetName === 'allies';
                
                // 시전자가 적군인지 확인
                let isAttackerEnemy = false;
                if (vfx.attackerName) {
                    isAttackerEnemy = document.querySelector(`[data-combat-area="enemies"] [data-combat-unit="${vfx.attackerName}"]`) !== null ||
                                      document.querySelector(`[data-combat-area="enemies"] [data-clean-name="${vfx.attackerName}"]`) !== null;
                }

                let targetAreaSelector = '[data-combat-area="enemies"]';
                if (isBuffOrHeal) {
                    targetAreaSelector = isAttackerEnemy ? '[data-combat-area="enemies"]' : '[data-combat-area="allies"]';
                } else {
                    targetAreaSelector = isAttackerEnemy ? '[data-combat-area="allies"]' : '[data-combat-area="enemies"]';
                }

                const areaEl = document.querySelector(targetAreaSelector);
                if (areaEl) {
                    const rect = areaEl.getBoundingClientRect();
                    const centerX = rect.left + rect.width / 2 - containerRect.left;
                    const centerY = rect.top + rect.height / 2 - containerRect.top;
                    setTargetPos({ x: centerX, y: centerY });
                    return;
                }
            }

            // 2. 단일 타겟 스킬: 피격 대상 카드(적군 또는 아군)의 중심 계산
            const targetName = vfx.targetName;
            let el: Element | null = null;
            if (targetName && targetName !== '적군' && targetName !== 'aoe' && targetName !== 'allies' && targetName !== '전체 대상') {
                el = document.querySelector(`[data-combat-unit="${targetName}"]`) || 
                     document.querySelector(`[data-clean-name="${targetName}"]`);
            }

            // 대상을 못 찾았으나 공격 스킬인 경우 적군 진영의 첫 번째 유닛 카드로 타겟팅
            if (!el && tier !== 'BUFF') {
                el = document.querySelector('[data-combat-area="enemies"] [data-combat-unit]');
            }

            if (el) {
                const rect = el.getBoundingClientRect();
                const centerX = rect.left + rect.width / 2 - containerRect.left;
                const centerY = rect.top + rect.height / 2 - containerRect.top;
                setTargetPos({ x: centerX, y: centerY });
            }
        };

        findAndSetTarget();
    }, [vfx.id, vfx.targetName, vfx.attackerName, isAoe, tier]);

    return (
        <div ref={overlayRef} className="absolute inset-0 z-50 pointer-events-none overflow-hidden flex items-center justify-center">
            {/* 1. Background Ambient Color Pulse */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 0.85, 0.4, 0] }}
                transition={{ duration: tier === ClassTier.FINAL ? 1.4 : 0.8, ease: "easeOut" }}
                className="absolute inset-0"
                style={{
                    background: targetPos 
                        ? `radial-gradient(circle at ${targetPos.x}px ${targetPos.y}px, ${theme.bgGlow} 0%, rgba(0,0,0,0.5) ${isAoe ? '80%' : '50%'}, transparent ${isAoe ? '100%' : '75%'})`
                        : (isAoe
                            ? `radial-gradient(ellipse at center, ${theme.bgGlow} 0%, rgba(0,0,0,0.6) 80%)`
                            : `radial-gradient(circle at center, ${theme.bgGlow} 0%, transparent 70%)`)
                }}
            />

            {/* 1.5 Custom Frame-by-Frame Animation (플레이어 커스텀 프레임 애니메이션) */}
            {vfx.frameAnimation?.enabled && vfx.frameAnimation.frames?.length > 0 && vfx.frameAnimation.renderMode !== 'vfx_only' && (
                <div 
                    className="pointer-events-none z-30"
                    style={
                        targetPos ? {
                            position: 'absolute',
                            left: `${targetPos.x}px`,
                            top: `${targetPos.y}px`,
                            transform: 'translate(-50%, -50%)',
                            width: isAoe ? '420px' : '288px',
                            height: isAoe ? '420px' : '288px',
                            maxWidth: '90vw',
                            maxHeight: '90vh',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        } : {
                            position: 'absolute',
                            inset: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }
                    }
                >
                    <SkillFrameAnimationRenderer
                        anim={vfx.frameAnimation}
                        isPlaying={true}
                        loop={vfx.frameAnimation.loopCount === 0 || (vfx.frameAnimation.loopCount || 1) > 1}
                        playbackSpeed={vfx.frameAnimation.playbackSpeed || 1}
                        className="w-full h-full"
                    />
                </div>
            )}

            {/* 2. Top Skill & Class Announcement Banner */}
            {vfx.skillName && (
                <motion.div
                    initial={{ y: -40, opacity: 0, scale: 0.8 }}
                    animate={{ y: 0, opacity: 1, scale: [0.8, 1.1, 1] }}
                    exit={{ y: -30, opacity: 0 }}
                    transition={{ duration: 0.35 }}
                    className="absolute top-8 z-50 flex flex-col items-center gap-1"
                >
                    <div 
                        className="px-4 py-1 rounded-full text-[10px] md:text-xs font-black tracking-widest uppercase border flex items-center gap-1.5 shadow-2xl backdrop-blur-md"
                        style={{
                            backgroundColor: 'rgba(15, 23, 42, 0.9)',
                            borderColor: theme.primary,
                            color: theme.accent,
                            boxShadow: `0 0 20px ${theme.glow}`
                        }}
                    >
                        <IconComponent size={14} className="animate-pulse" />
                        <span>{tierLabel}</span>
                        {isAoe && (
                            <span className="ml-1 px-1.5 py-0.2 bg-red-600/90 text-white rounded text-[8px] font-bold">
                                AOE 광역
                            </span>
                        )}
                    </div>
                    <motion.div 
                        initial={{ scale: 0.9 }}
                        animate={{ scale: [0.9, 1.05, 1] }}
                        className="text-base md:text-2xl font-black tracking-wider text-transparent bg-clip-text drop-shadow-[0_2px_10px_rgba(0,0,0,0.9)]"
                        style={{
                            backgroundImage: `linear-gradient(to right, ${theme.accent}, ${theme.secondary}, ${theme.primary})`,
                            filter: `drop-shadow(0 0 12px ${theme.glow})`
                        }}
                    >
                        {vfx.skillName}
                    </motion.div>
                </motion.div>
            )}

            {/* 3. Center/Target FX Area */}
            {vfx.frameAnimation?.renderMode !== 'frame_only' && (
                <div 
                    className={`flex items-center justify-center ${isAoe ? 'w-96 h-96 sm:w-[480px] sm:h-[480px]' : 'w-72 h-72'}`}
                    style={
                        targetPos ? {
                            position: 'absolute',
                            left: `${targetPos.x}px`,
                            top: `${targetPos.y}px`,
                            transform: `translate(-50%, -50%) scale(${vfx.vfxScale || 1})`,
                            zIndex: 35
                        } : {
                            position: 'relative',
                            transform: `scale(${vfx.vfxScale || 1})`
                        }
                    }
                >

                {/* --- CUSTOM SHAPE OVERRIDE --- */}
                {vfx.vfxShape && vfx.vfxShape !== 'DEFAULT' ? (
                    <RenderCustomVfxShape shape={vfx.vfxShape} theme={theme} svgGradId={svgGradId} />
                ) : (
                    <>
                        {/* --- NORMAL ATTACK FX --- */}
                {tier === 'NORMAL' && (
                    <div className="relative flex items-center justify-center">
                        {/* Sharp Kinetic Slash Arc */}
                        <motion.svg
                            viewBox="0 0 200 200"
                            className="w-48 h-48 md:w-64 md:h-64 absolute"
                            initial={{ rotate: -45, scale: 0.2, opacity: 0 }}
                            animate={{ rotate: [ -45, 20 ], scale: [0.2, 1.3, 0.8], opacity: [0, 1, 0] }}
                            transition={{ duration: 0.4, ease: "easeOut" }}
                        >
                            <motion.path
                                d="M 30 170 Q 100 60 170 30"
                                fill="none"
                                stroke={theme.primary}
                                strokeWidth="8"
                                strokeLinecap="round"
                                style={{ filter: `drop-shadow(0 0 12px ${theme.primary})` }}
                            />
                            <motion.path
                                d="M 30 170 Q 100 60 170 30"
                                fill="none"
                                stroke="#ffffff"
                                strokeWidth="3"
                                strokeLinecap="round"
                            />
                        </motion.svg>

                        {/* Impact Shockwave Ring */}
                        <motion.div
                            initial={{ scale: 0.1, opacity: 1 }}
                            animate={{ scale: [0.1, 1.5], opacity: [1, 0] }}
                            transition={{ duration: 0.35, ease: "easeOut" }}
                            className="w-32 h-32 rounded-full border-2 absolute"
                            style={{ borderColor: theme.accent, boxShadow: `0 0 25px ${theme.primary}` }}
                        />

                        {/* Impact Flash Center */}
                        <motion.div
                            initial={{ scale: 0, opacity: 1 }}
                            animate={{ scale: [0, 1.8, 0], opacity: [1, 1, 0] }}
                            transition={{ duration: 0.25 }}
                            className="w-16 h-16 rounded-full absolute"
                            style={{ background: `radial-gradient(circle, #ffffff 0%, ${theme.primary} 70%, transparent 100%)` }}
                        />
                    </div>
                )}

                {/* --- BUFF FX (HOLY PILLAR & RADIANT SHIELD) --- */}
                {tier === 'BUFF' && (
                    <div className="relative flex items-center justify-center">
                        {/* Ascending Divine Light Pillar */}
                        <motion.div
                            initial={{ y: 200, scaleY: 0.1, opacity: 0 }}
                            animate={{ y: [200, 0, -100], scaleY: [0.1, 1.5, 0.5], opacity: [0, 0.9, 0] }}
                            transition={{ duration: 0.7, ease: "easeOut" }}
                            className="w-40 md:w-56 h-[400px] absolute"
                            style={{
                                background: `linear-gradient(to top, transparent, ${theme.primary}, ${theme.accent}, #ffffff)`,
                                filter: `drop-shadow(0 0 30px ${theme.glow})`
                            }}
                        />
                        {/* Shimmering Halo / Glyphs */}
                        <motion.div
                            initial={{ scale: 0.2, rotate: 0, opacity: 0 }}
                            animate={{ scale: [0.2, 1.4, 1.1], rotate: 180, opacity: [0, 1, 0] }}
                            transition={{ duration: 0.65, ease: "easeOut" }}
                            className="w-48 h-48 md:w-64 md:h-64 rounded-full border-2 border-dashed absolute flex items-center justify-center"
                            style={{ borderColor: theme.accent, boxShadow: `0 0 35px ${theme.glow}` }}
                        >
                            <div className="text-2xl text-amber-200 font-serif flex gap-3 animate-pulse">
                                <span>{theme.runes[0]}</span>
                                <span>{theme.runes[1]}</span>
                            </div>
                        </motion.div>
                        {/* Rising Sparkle Rings */}
                        {[0, 0.15, 0.3].map((delay, idx) => (
                            <motion.div
                                key={idx}
                                initial={{ y: 80, scale: 0.3, opacity: 0 }}
                                animate={{ y: -80, scale: 1.6, opacity: [0, 0.8, 0] }}
                                transition={{ duration: 0.6, delay, ease: "easeOut" }}
                                className="w-32 h-32 rounded-full border absolute"
                                style={{ borderColor: theme.secondary, boxShadow: `0 0 20px ${theme.primary}` }}
                            />
                        ))}
                    </div>
                )}

                {/* --- DEBUFF FX (DESCENDING HEX & CONSTRICTING CHAINS) --- */}
                {tier === 'DEBUFF' && (
                    <div className="relative flex items-center justify-center">
                        {/* Descending Hex Mist */}
                        <motion.div
                            initial={{ y: -200, scale: 0.4, opacity: 0 }}
                            animate={{ y: [-200, 0, 50], scale: [0.4, 1.6, 1.2], opacity: [0, 0.85, 0] }}
                            transition={{ duration: 0.75, ease: "easeIn" }}
                            className="w-56 h-56 md:w-72 md:h-72 rounded-full absolute"
                            style={{
                                background: `radial-gradient(circle, ${theme.primary} 0%, ${theme.glow} 60%, transparent 100%)`,
                                filter: `drop-shadow(0 0 35px ${theme.primary})`
                            }}
                        />
                        {/* Constricting Inverted Rune Seal */}
                        <motion.div
                            initial={{ scale: 2.0, rotate: 0, opacity: 0 }}
                            animate={{ scale: [2.0, 0.8, 0.5], rotate: -180, opacity: [0, 0.9, 0] }}
                            transition={{ duration: 0.6, ease: "easeOut" }}
                            className="w-48 h-48 md:w-64 md:h-64 rounded-full border-2 border-dotted absolute flex items-center justify-center"
                            style={{ borderColor: theme.secondary, boxShadow: `0 0 30px ${theme.secondary}` }}
                        >
                            <span className="text-3xl text-purple-300 font-serif">☠</span>
                        </motion.div>
                    </div>
                )}

                {/* --- FIRST CLASS FX --- */}
                {tier === ClassTier.FIRST && (
                    <div className="relative flex items-center justify-center">
                        {/* Runic Single Magic Ring */}
                        <motion.div
                            initial={{ scale: 0.2, rotate: 0, opacity: 0 }}
                            animate={{ scale: [0.2, 1.1, 1], rotate: 180, opacity: [0, 0.9, 0] }}
                            transition={{ duration: 0.65, ease: "easeOut" }}
                            className="w-44 h-44 md:w-56 md:h-56 rounded-full border-2 border-dashed absolute flex items-center justify-center"
                            style={{ borderColor: theme.secondary, boxShadow: `0 0 30px ${theme.glow}` }}
                        >
                            <div className="text-xl md:text-2xl text-amber-300 font-serif">
                                {theme.runes[0]} {theme.runes[1]}
                            </div>
                        </motion.div>

                        {/* Diagonal Dual Slash */}
                        <motion.svg
                            viewBox="0 0 200 200"
                            className="w-56 h-56 md:w-72 md:h-72 absolute"
                            initial={{ scale: 0.3, opacity: 0 }}
                            animate={{ scale: [0.3, 1.4, 1.1], opacity: [0, 1, 0] }}
                            transition={{ duration: 0.5, ease: "easeOut" }}
                        >
                            <line x1="20" y1="20" x2="180" y2="180" stroke={theme.primary} strokeWidth="7" strokeLinecap="round" style={{ filter: `drop-shadow(0 0 10px ${theme.primary})` }} />
                            <line x1="20" y1="20" x2="180" y2="180" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" />
                            <line x1="180" y1="20" x2="20" y2="180" stroke={theme.secondary} strokeWidth="5" strokeLinecap="round" style={{ filter: `drop-shadow(0 0 8px ${theme.secondary})` }} />
                        </motion.svg>

                        {/* Core Elemental Blast */}
                        <motion.div
                            initial={{ scale: 0.2, opacity: 0 }}
                            animate={{ scale: [0.2, 2, 0], opacity: [1, 0.9, 0] }}
                            transition={{ duration: 0.45 }}
                            className="w-24 h-24 rounded-full absolute"
                            style={{ background: `radial-gradient(circle, ${theme.accent} 0%, ${theme.primary} 60%, transparent 100%)` }}
                        />
                    </div>
                )}

                {/* --- SECOND CLASS FX --- */}
                {tier === ClassTier.SECOND && (
                    <div className="relative flex items-center justify-center">
                        {/* Dual Nested Arcane Magic Circles */}
                        <motion.div
                            initial={{ scale: 0.3, rotate: 0, opacity: 0 }}
                            animate={{ scale: [0.3, 1.3, 1.1], rotate: 270, opacity: [0, 1, 0] }}
                            transition={{ duration: 0.75, ease: "easeOut" }}
                            className="w-56 h-56 md:w-72 md:h-72 rounded-full border-2 border-double absolute flex items-center justify-center"
                            style={{ borderColor: theme.primary, boxShadow: `0 0 35px ${theme.glow}` }}
                        >
                            {/* Inner Circle Counter-Rotating */}
                            <motion.div
                                animate={{ rotate: -540 }}
                                transition={{ duration: 0.75, ease: "linear" }}
                                className="w-36 h-36 md:w-48 md:h-48 rounded-full border border-dashed border-white/80 flex items-center justify-around text-lg"
                            >
                                <span>{theme.runes[0]}</span>
                                <span>{theme.runes[1]}</span>
                                <span>{theme.runes[2]}</span>
                            </motion.div>
                        </motion.div>

                        {/* Quad Cross Energy Blades */}
                        <motion.svg
                            viewBox="0 0 200 200"
                            className="w-64 h-64 md:w-80 md:h-80 absolute"
                            initial={{ rotate: 0, scale: 0.2, opacity: 0 }}
                            animate={{ rotate: 90, scale: [0.2, 1.5, 1], opacity: [0, 1, 0] }}
                            transition={{ duration: 0.6, ease: "easeOut" }}
                        >
                            <circle cx="100" cy="100" r="60" fill="none" stroke={theme.secondary} strokeWidth="3" />
                            <line x1="10" y1="100" x2="190" y2="100" stroke={theme.accent} strokeWidth="6" strokeLinecap="round" style={{ filter: `drop-shadow(0 0 12px ${theme.primary})` }} />
                            <line x1="100" y1="10" x2="100" y2="190" stroke={theme.primary} strokeWidth="6" strokeLinecap="round" style={{ filter: `drop-shadow(0 0 12px ${theme.primary})` }} />
                            <line x1="30" y1="30" x2="170" y2="170" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" />
                        </motion.svg>

                        {/* Expanding Ring Shockwaves */}
                        <motion.div
                            initial={{ scale: 0.2, opacity: 1 }}
                            animate={{ scale: [0.2, 2.2], opacity: [1, 0] }}
                            transition={{ duration: 0.55 }}
                            className="w-40 h-40 rounded-full border-4 absolute"
                            style={{ borderColor: theme.accent, boxShadow: `0 0 40px ${theme.primary}` }}
                        />
                    </div>
                )}

                {/* --- LAST CLASS FX --- */}
                {tier === ClassTier.LAST && (
                    <div className="relative flex items-center justify-center">
                        {/* Triple Layer Geometry Arcane Array */}
                        <motion.div
                            initial={{ scale: 0.2, rotate: 0, opacity: 0 }}
                            animate={{ scale: [0.2, 1.4, 1.2], rotate: 360, opacity: [0, 1, 0] }}
                            transition={{ duration: 0.95, ease: "easeOut" }}
                            className="w-72 h-72 md:w-96 md:h-96 rounded-full border-2 absolute flex items-center justify-center"
                            style={{ borderColor: theme.accent, boxShadow: `0 0 50px ${theme.glow}` }}
                        >
                            {/* Pentagon Star Inscription */}
                            <motion.svg viewBox="0 0 100 100" className="w-full h-full absolute animate-spin" style={{ animationDuration: '3s' }}>
                                <polygon points="50,5 64,36 98,36 70,57 81,91 50,70 19,91 30,57 2,36 36,36" fill="none" stroke={theme.secondary} strokeWidth="1.5" />
                                <circle cx="50" cy="50" r="45" fill="none" stroke={theme.primary} strokeWidth="1" strokeDasharray="4 2" />
                            </motion.svg>
                            <div className="flex gap-4 text-2xl text-amber-200">
                                <span>{theme.runes[0]}</span>
                                <span>{theme.runes[1]}</span>
                                <span>{theme.runes[2]}</span>
                                <span>{theme.runes[3]}</span>
                            </div>
                        </motion.div>

                        {/* Cataclysmic Sky Beam / Falling Grand Blade */}
                        <motion.div
                            initial={{ y: -300, scaleX: 0.2, opacity: 0 }}
                            animate={{ y: [ -300, 0 ], scaleX: [0.2, 1.8, 0.9], opacity: [0, 1, 0.8, 0] }}
                            transition={{ duration: 0.6, ease: "anticipate" }}
                            className="w-16 md:w-28 h-[500px] absolute z-10"
                            style={{
                                background: `linear-gradient(to bottom, #ffffff, ${theme.secondary}, ${theme.primary}, transparent)`,
                                filter: `drop-shadow(0 0 35px ${theme.glow})`
                            }}
                        />

                        {/* Multi-tier Radial Shockwave Waves */}
                        {[0, 0.15, 0.3].map((delay, idx) => (
                            <motion.div
                                key={idx}
                                initial={{ scale: 0.1, opacity: 1 }}
                                animate={{ scale: [0.1, 2.6], opacity: [1, 0] }}
                                transition={{ duration: 0.7, delay, ease: "easeOut" }}
                                className="w-48 h-48 rounded-full border-4 absolute"
                                style={{ borderColor: theme.accent, boxShadow: `0 0 45px ${theme.primary}` }}
                            />
                        ))}
                    </div>
                )}

                {/* --- FINAL CLASS & BOND SKILL FX (SUPREME GOD-TIER) --- */}
                {(tier === ClassTier.FINAL || tier === ClassTier.BOND) && (
                    <div className="relative flex items-center justify-center w-full h-full">
                        {/* Giant Full-Arena Sacred Celestial Array */}
                        <motion.div
                            initial={{ scale: 0.1, rotate: 0, opacity: 0 }}
                            animate={{ scale: [0.1, 1.8, 1.4], rotate: 720, opacity: [0, 1, 0.8, 0] }}
                            transition={{ duration: 1.3, ease: "easeOut" }}
                            className="w-96 h-96 md:w-[600px] md:h-[600px] rounded-full border-4 border-double absolute flex items-center justify-center"
                            style={{ borderColor: theme.accent, boxShadow: `0 0 80px ${theme.glow}` }}
                        >
                            <motion.svg viewBox="0 0 200 200" className="w-full h-full absolute">
                                <circle cx="100" cy="100" r="95" fill="none" stroke={theme.secondary} strokeWidth="2" strokeDasharray="6 3" />
                                <circle cx="100" cy="100" r="75" fill="none" stroke={theme.primary} strokeWidth="3" />
                                <polygon points="100,10 178,55 178,145 100,190 22,145 22,55" fill="none" stroke={theme.accent} strokeWidth="2" />
                                <polygon points="100,190 22,55 178,55" fill="none" stroke="#ffffff" strokeWidth="1.5" />
                                <polygon points="100,10 178,145 22,145" fill="none" stroke="#ffffff" strokeWidth="1.5" />
                            </motion.svg>

                            <div className="flex gap-6 text-3xl md:text-4xl text-amber-200 drop-shadow-[0_0_10px_rgba(255,255,255,0.9)]">
                                {theme.runes.map((r, ri) => (
                                    <span key={ri} className="animate-pulse">{r}</span>
                                ))}
                            </div>
                        </motion.div>

                        {/* Supernova Celestial Flare Beam */}
                        <motion.div
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: [0, 3.5, 0], opacity: [0, 1, 1, 0] }}
                            transition={{ duration: 0.9, ease: "easeInOut" }}
                            className="w-36 h-36 md:w-56 md:h-56 rounded-full absolute z-20"
                            style={{
                                background: `radial-gradient(circle, #ffffff 0%, ${theme.accent} 40%, ${theme.primary} 70%, transparent 100%)`,
                                filter: `drop-shadow(0 0 60px ${theme.glow})`
                            }}
                        />

                        {/* Cross Beams of Creation */}
                        <motion.div
                            initial={{ scaleX: 0, scaleY: 0, opacity: 0 }}
                            animate={{ scaleX: [0, 4, 0], scaleY: [0, 0.4, 0], opacity: [0, 1, 0] }}
                            transition={{ duration: 0.8 }}
                            className="w-full h-8 absolute bg-white z-10"
                            style={{ filter: `drop-shadow(0 0 30px ${theme.primary})` }}
                        />
                        <motion.div
                            initial={{ scaleX: 0, scaleY: 0, opacity: 0 }}
                            animate={{ scaleX: [0, 0.4, 0], scaleY: [0, 4, 0], opacity: [0, 1, 0] }}
                            transition={{ duration: 0.8 }}
                            className="w-8 h-full absolute bg-white z-10"
                            style={{ filter: `drop-shadow(0 0 30px ${theme.primary})` }}
                        />

                        {/* Expanding Cosmic Shockwaves */}
                        {[0, 0.2, 0.4, 0.6].map((delay, idx) => (
                            <motion.div
                                key={idx}
                                initial={{ scale: 0.1, opacity: 1 }}
                                animate={{ scale: [0.1, 3.8], opacity: [1, 0] }}
                                transition={{ duration: 1.0, delay, ease: "easeOut" }}
                                className="w-56 h-56 md:w-72 md:h-72 rounded-full border-4 absolute"
                                style={{ borderColor: idx % 2 === 0 ? theme.accent : theme.primary, boxShadow: `0 0 55px ${theme.glow}` }}
                            />
                        ))}
                    </div>
                )}
                    </>
                )}

                {/* --- AOE (광역) SWEEPING WAVE / MULTI-STRIKE EFFECT --- */}
                {isAoe && (
                    <div className="absolute inset-0 flex items-center justify-around pointer-events-none">
                        {/* Sweeping Horizon Wave */}
                        <motion.div
                            initial={{ x: '-100%', opacity: 0 }}
                            animate={{ x: ['-100%', '100%'], opacity: [0, 0.9, 0.9, 0] }}
                            transition={{ duration: 0.7, ease: "easeInOut" }}
                            className="w-3/4 h-full absolute"
                            style={{
                                background: `linear-gradient(to right, transparent, ${theme.glow}, ${theme.accent}, transparent)`,
                                filter: `drop-shadow(0 0 30px ${theme.primary})`
                            }}
                        />

                        {/* Multiple Subsidiary Impact Points Across the Arena */}
                        {[-160, -80, 0, 80, 160].map((offset, idx) => (
                            <motion.div
                                key={idx}
                                initial={{ scale: 0, opacity: 0 }}
                                animate={{ scale: [0, 1.4, 0], opacity: [0, 1, 0] }}
                                transition={{ duration: 0.5, delay: 0.1 + idx * 0.08, ease: "easeOut" }}
                                style={{ transform: `translateX(${offset}px)` }}
                                className="w-16 h-16 rounded-full absolute"
                            >
                                <div 
                                    className="w-full h-full rounded-full"
                                    style={{
                                        background: `radial-gradient(circle, #ffffff 0%, ${theme.secondary} 50%, transparent 100%)`,
                                        boxShadow: `0 0 20px ${theme.primary}`
                                    }}
                                />
                            </motion.div>
                        ))}
                    </div>
                )}

                {/* --- DYNAMIC PARTICLES BURST --- */}
                {particles.map(p => (
                    <motion.div
                        key={p.id}
                        initial={{ x: 0, y: 0, scale: 0, opacity: 1 }}
                        animate={{
                            x: p.x,
                            y: p.y,
                            scale: [0, 1.5, 0],
                            opacity: [1, 1, 0]
                        }}
                        transition={{
                            duration: p.duration,
                            delay: p.delay,
                            ease: "easeOut"
                        }}
                        className="absolute rounded-full pointer-events-none"
                        style={{
                            width: p.size,
                            height: p.size,
                            backgroundColor: p.color,
                            boxShadow: isTabletOrTouch ? undefined : `0 0 ${p.size * 2}px ${p.color}`,
                            willChange: 'transform, opacity'
                        }}
                    />
                ))}

            </div>
            )}

            {/* 4. Skill Illustration Cut-In Effect (스킬 사용 일러스트 연출) */}
            {vfx.illustrationUrl && (() => {
                const isFinalCutscene = vfx.tier === ClassTier.FINAL || vfx.tier === 'BOND';
                
                return (
                    <motion.div
                        initial={{ opacity: 0, scale: isFinalCutscene ? 0.85 : 0.9, x: isFinalCutscene ? '-6%' : '-4%' }}
                        animate={{ 
                            opacity: [0, 1, 1, 0], 
                            scale: isFinalCutscene ? [0.85, 1.04, 1, 0.95] : [0.9, 1.02, 1, 0.96], 
                            x: isFinalCutscene ? ['-6%', '0%', '0%', '6%'] : ['-4%', '0%', '0%', '4%'] 
                        }}
                        transition={{ 
                            duration: (vfx.duration ? Math.min(vfx.duration / 1000, 2.6) : (isFinalCutscene ? 2.2 : 1.8)), 
                            times: [0, 0.15, 0.8, 1], 
                            ease: "easeInOut" 
                        }}
                        className="absolute inset-0 z-40 flex items-center justify-center pointer-events-none overflow-hidden px-2 sm:px-4 md:px-8"
                    >
                        {/* Background Fullscreen Blur Atmospheric Glow (파이널 클래스 스킬은 더욱 강력한 전체 화면 블러 오라) */}
                        <div 
                            className={`absolute inset-0 pointer-events-none bg-cover bg-center blur-2xl scale-125 ${
                                isFinalCutscene ? 'opacity-50 mix-blend-screen' : 'opacity-25 mix-blend-screen'
                            }`}
                            style={{ backgroundImage: `url(${vfx.illustrationUrl})` }}
                        />

                        <div 
                            className={`relative w-full rounded-2xl md:rounded-3xl backdrop-blur-2xl shadow-[0_0_90px_rgba(0,0,0,0.95)] flex items-center justify-center overflow-hidden transform -rotate-1 ${
                                isFinalCutscene
                                    ? 'max-w-5xl py-5 sm:py-7 md:py-10 px-5 sm:px-8 md:px-12 border-y-2 md:border-y-4 border-amber-300 gap-5 sm:gap-8 md:gap-12'
                                    : 'max-w-2xl sm:max-w-3xl py-3 sm:py-4 md:py-6 px-4 sm:px-6 md:px-8 border-y-2 border-amber-400/80 gap-3 sm:gap-5 md:gap-8'
                            }`}
                            style={{
                                background: isFinalCutscene
                                    ? `linear-gradient(135deg, rgba(10, 15, 30, 0.98) 0%, rgba(30, 20, 65, 0.98) 50%, rgba(10, 15, 30, 0.98) 100%)`
                                    : `linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(25, 25, 55, 0.95) 50%, rgba(15, 23, 42, 0.95) 100%)`,
                                boxShadow: `0 0 ${isFinalCutscene ? '90px' : '50px'} ${theme.glow}, inset 0 0 30px rgba(251, 191, 36, 0.4)`
                            }}
                        >
                            {/* Shimmer line */}
                            <motion.div
                                initial={{ x: '-100%' }}
                                animate={{ x: '250%' }}
                                transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
                                className="absolute inset-0 w-1/2 bg-gradient-to-r from-transparent via-amber-300/30 to-transparent skew-x-12"
                            />

                            {/* Cutin Image Frame - 파이널 클래스는 초대형, 라스트 클래스는 대형 */}
                            <div 
                                className={`relative rounded-xl md:rounded-2xl overflow-hidden shadow-2xl shrink-0 group transform -rotate-2 ${
                                    isFinalCutscene
                                        ? 'w-32 h-32 sm:w-44 sm:h-44 md:w-60 md:h-60 lg:w-72 lg:h-72 border-3 sm:border-4 md:border-5 border-amber-300'
                                        : 'w-24 h-24 sm:w-32 sm:h-32 md:w-40 md:h-40 lg:w-48 lg:h-48 border-2 sm:border-3 border-amber-400/90'
                                }`}
                                style={{ boxShadow: `0 0 ${isFinalCutscene ? '50px' : '30px'} ${theme.glow}` }}
                            >
                                <img 
                                    src={vfx.illustrationUrl} 
                                    alt={vfx.skillName || "Skill Cutin"} 
                                    referrerPolicy="no-referrer"
                                    className="w-full h-full object-cover scale-105"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />
                            </div>

                            {/* Skill & Caster Details */}
                            <div className="flex flex-col justify-center text-left z-10 min-w-0 flex-1">
                                {vfx.attackerName && (
                                    <span className={`font-black tracking-widest text-amber-300 uppercase flex items-center gap-1.5 drop-shadow ${
                                        isFinalCutscene ? 'text-xs sm:text-sm md:text-base' : 'text-[11px] sm:text-xs'
                                    }`}>
                                        <Sparkles size={isFinalCutscene ? 16 : 13} className="text-amber-400 shrink-0" />
                                        <span className="truncate">{vfx.attackerName}</span>
                                    </span>
                                )}
                                <h2 
                                    className={`font-black tracking-wider text-transparent bg-clip-text drop-shadow-[0_4px_16px_rgba(0,0,0,0.95)] py-0.5 sm:py-1 leading-tight break-words ${
                                        isFinalCutscene
                                            ? 'text-lg sm:text-2xl md:text-3xl lg:text-4xl'
                                            : 'text-base sm:text-xl md:text-2xl lg:text-3xl'
                                    }`}
                                    style={{
                                        backgroundImage: `linear-gradient(to right, #ffffff, ${theme.accent}, ${theme.secondary})`,
                                        filter: `drop-shadow(0 0 16px ${theme.glow})`
                                    }}
                                >
                                    {vfx.skillName || "필살 오의"}
                                </h2>
                                <span className={`font-mono text-amber-200/90 mt-0.5 sm:mt-1 flex items-center gap-1.5 font-bold ${
                                    isFinalCutscene ? 'text-[11px] sm:text-xs md:text-sm' : 'text-[10px] sm:text-[11px]'
                                }`}>
                                    <Crown size={isFinalCutscene ? 16 : 13} className="text-amber-400 shrink-0"/>
                                    <span className="truncate">{isFinalCutscene ? `★ ${tierLabel} ★` : tierLabel}</span>
                                </span>
                            </div>
                        </div>
                    </motion.div>
                );
            })()}
        </div>
    );
};

export interface SkillFrameAnimationRendererProps {
    anim?: SkillFrameAnimation | null;
    isPlaying?: boolean;
    currentFrameIndex?: number;
    onFrameChange?: (index: number) => void;
    playbackSpeed?: number;
    loop?: boolean;
    className?: string;
    showCrosshair?: boolean;
    interactiveDrag?: boolean;
    onFrameDrag?: (frameId: string, newX: number, newY: number) => void;
}

// 고성능 이미지 및 최적화 다운샘플 캔버스 캐시
const frameImageCache = new Map<string, HTMLCanvasElement | HTMLImageElement>();

const getFrameImage = (url: string, onLoad?: () => void): HTMLCanvasElement | HTMLImageElement | null => {
    if (!url) return null;
    let cached = frameImageCache.get(url);
    if (!cached) {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.referrerPolicy = 'no-referrer';
        img.src = url;
        frameImageCache.set(url, img);

        const handleLoad = () => {
            try {
                const nw = img.naturalWidth || img.width || 0;
                const nh = img.naturalHeight || img.height || 0;
                // 고해상도 대용량 이미지(가로/세로 380px 초과)인 경우 렉 방지를 위해 오프스크린 캔버스로 즉시 다운샘플링 캐싱
                if (nw > 380 || nh > 380) {
                    const maxDim = 360;
                    let targetW = nw;
                    let targetH = nh;
                    if (nw > nh) {
                        targetH = Math.round((nh * maxDim) / nw);
                        targetW = maxDim;
                    } else {
                        targetW = Math.round((nw * maxDim) / nh);
                        targetH = maxDim;
                    }
                    const offCanvas = document.createElement('canvas');
                    offCanvas.width = targetW;
                    offCanvas.height = targetH;
                    const offCtx = offCanvas.getContext('2d');
                    if (offCtx) {
                        offCtx.imageSmoothingEnabled = true;
                        offCtx.imageSmoothingQuality = 'medium';
                        offCtx.drawImage(img, 0, 0, targetW, targetH);
                        frameImageCache.set(url, offCanvas);
                    }
                }
            } catch {
                // 다운샘플링 실패 시 원본 img 유지
            }
            if (onLoad) {
                onLoad();
            }
        };

        if (img.complete && (img.naturalWidth || 0) > 0) {
            handleLoad();
        } else {
            img.addEventListener('load', handleLoad, { once: true });
        }
        return img;
    } else if (cached instanceof HTMLImageElement && !cached.complete && onLoad) {
        cached.addEventListener('load', onLoad, { once: true });
    }
    return cached;
};

const BLEND_MODE_MAP: Record<string, GlobalCompositeOperation> = {
    normal: 'source-over',
    screen: 'screen',
    lighten: 'lighten',
    overlay: 'overlay',
};

export const SkillFrameAnimationRenderer: React.FC<SkillFrameAnimationRendererProps> = ({
    anim,
    isPlaying = true,
    currentFrameIndex,
    onFrameChange,
    playbackSpeed = 1,
    loop = true,
    className = "",
    showCrosshair = false,
}) => {
    const frames = anim?.frames || [];
    const containerRef = React.useRef<HTMLDivElement>(null);
    const canvasRef = React.useRef<HTMLCanvasElement>(null);
    const activeIdxRef = React.useRef<number>(0);
    const animFrameReqRef = React.useRef<number | null>(null);
    const lastFrameTimeRef = React.useRef<number>(0);
    const renderScaleRef = React.useRef<number>(1);

    const onFrameChangeRef = React.useRef(onFrameChange);
    onFrameChangeRef.current = onFrameChange;

    const isControlled = (currentFrameIndex !== undefined && currentFrameIndex >= 0 && currentFrameIndex < frames.length);
    const targetIdx = isControlled ? currentFrameIndex : activeIdxRef.current;
    activeIdxRef.current = targetIdx;

    // 1. 모든 프레임 이미지 사전 로드 캐싱
    React.useEffect(() => {
        if (!frames || frames.length === 0) return;
        frames.forEach(f => {
            if (f.imageUrl) {
                getFrameImage(f.imageUrl);
            }
        });
    }, [frames]);

    // 2. 단일 캔버스 렌더링 함수 (내부 버퍼 다운스케일 및 좌표계 보정 적용)
    const drawCurrentFrame = React.useCallback((idx: number) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const cw = canvas.width;
        const ch = canvas.height;
        ctx.clearRect(0, 0, cw, ch);

        if (cw <= 0 || ch <= 0) return;

        // 고성능 그래픽 렌더링 힌트 및 부드러운 업스케일링
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'medium';

        const scale = renderScaleRef.current || 1;

        // 내부 버퍼가 축소되어도 가상 좌표계는 화면(CSS) 픽셀 단위를 100% 보존
        ctx.save();
        ctx.scale(scale, scale);

        const cx = (cw / scale) / 2;
        const cy = (ch / scale) / 2;

        // 십자선 그리기 (에디터 전용 가이드라인)
        if (showCrosshair) {
            ctx.save();
            ctx.strokeStyle = 'rgba(34, 211, 238, 0.4)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(0, cy);
            ctx.lineTo(cw / scale, cy);
            ctx.moveTo(cx, 0);
            ctx.lineTo(cx, ch / scale);
            ctx.stroke();

            ctx.beginPath();
            ctx.arc(cx, cy, 8, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }

        const frame = frames[idx];
        if (!frame || !frame.imageUrl) {
            ctx.restore();
            return;
        }

        const img = getFrameImage(frame.imageUrl, () => {
            if (activeIdxRef.current === idx) {
                drawCurrentFrame(idx);
            }
        });

        const isReady = (img instanceof HTMLCanvasElement && img.width > 0) || 
                        (img instanceof HTMLImageElement && img.complete && img.naturalWidth > 0);

        if (isReady && img) {
            ctx.save();
            ctx.translate(cx + (frame.x || 0), cy + (frame.y || 0));

            if (frame.rotation) {
                ctx.rotate((frame.rotation * Math.PI) / 180);
            }

            const frameScale = frame.scale ?? 1;
            ctx.scale(frameScale, frameScale);

            ctx.globalAlpha = Math.max(0, Math.min(1, frame.opacity ?? 1));
            ctx.globalCompositeOperation = BLEND_MODE_MAP[frame.blendMode || 'normal'] || 'source-over';

            const w = frame.width || 200;
            const h = frame.height || 200;
            ctx.drawImage(img, -w / 2, -h / 2, w, h);
            ctx.restore();
        }

        ctx.restore();
    }, [frames, showCrosshair]);

    // 3. 캔버스 해상도 고정 및 배율 최적화 (반응형 ResizeObserver)
    // 태블릿 등 초고해상도 환경에서 캔버스 내부 버퍼 크기를 가벼운 상한선(최대 480px)으로 제한하여
    // GPU 필레이트 병목과 발열을 85% 이상 제거하면서 스타일로 부드럽게 꽉 차게 표시
    React.useEffect(() => {
        const container = containerRef.current;
        const canvas = canvasRef.current;
        if (!container || !canvas) return;

        let rAFId: number | null = null;
        const updateCanvasSize = () => {
            if (!container || !canvas) return;
            const rect = container.getBoundingClientRect();
            const rawW = Math.max(1, Math.round(rect.width) || 300);
            const rawH = Math.max(1, Math.round(rect.height) || 300);

            // 캔버스 내부 렌더링 버퍼 해상도 상한 고정 (태블릿/터치 환경: 최대 360px로 GPU 부하 최적화)
            const isTouch = typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0 || window.innerWidth <= 1280);
            const MAX_CANVAS_DIM = isTouch ? 360 : 480;
            let targetW = rawW;
            let targetH = rawH;
            let scale = 1;

            if (rawW > MAX_CANVAS_DIM || rawH > MAX_CANVAS_DIM) {
                if (rawW >= rawH) {
                    scale = MAX_CANVAS_DIM / rawW;
                    targetW = MAX_CANVAS_DIM;
                    targetH = Math.max(1, Math.round(rawH * scale));
                } else {
                    scale = MAX_CANVAS_DIM / rawH;
                    targetH = MAX_CANVAS_DIM;
                    targetW = Math.max(1, Math.round(rawW * scale));
                }
            }

            renderScaleRef.current = scale;

            if (canvas.width !== targetW || canvas.height !== targetH) {
                canvas.width = targetW;
                canvas.height = targetH;
                drawCurrentFrame(activeIdxRef.current);
            }
        };

        updateCanvasSize();
        const ro = new ResizeObserver(() => {
            if (rAFId !== null) cancelAnimationFrame(rAFId);
            rAFId = requestAnimationFrame(updateCanvasSize);
        });
        ro.observe(container);

        return () => {
            if (rAFId !== null) cancelAnimationFrame(rAFId);
            ro.disconnect();
        };
    }, [drawCurrentFrame]);

    // 4. 고성능 60fps requestAnimationFrame 타이밍 루프
    React.useEffect(() => {
        if (!isPlaying || frames.length <= 1) {
            // 정지 상태이거나 프레임이 1개일 때
            drawCurrentFrame(targetIdx);
            return;
        }

        lastFrameTimeRef.current = performance.now();

        const tick = (now: number) => {
            const currentIdx = activeIdxRef.current;
            const currentDuration = Math.max(1, (frames[currentIdx]?.duration || 100) / Math.max(0.1, playbackSpeed));
            const elapsed = now - lastFrameTimeRef.current;

            if (elapsed >= currentDuration) {
                lastFrameTimeRef.current = now;
                const nextIdx = (currentIdx + 1) >= frames.length
                    ? (loop ? 0 : currentIdx)
                    : (currentIdx + 1);

                if (nextIdx !== currentIdx || loop) {
                    activeIdxRef.current = nextIdx;
                    drawCurrentFrame(nextIdx);
                    if (onFrameChangeRef.current) {
                        onFrameChangeRef.current(nextIdx);
                    }
                }
            }

            animFrameReqRef.current = requestAnimationFrame(tick);
        };

        drawCurrentFrame(activeIdxRef.current);
        animFrameReqRef.current = requestAnimationFrame(tick);

        return () => {
            if (animFrameReqRef.current) {
                cancelAnimationFrame(animFrameReqRef.current);
                animFrameReqRef.current = null;
            }
        };
    }, [isPlaying, frames, playbackSpeed, loop, drawCurrentFrame, targetIdx]);

    // 5. 외부 제어(controlled) 인덱스 변경 시 즉각 렌더링
    React.useEffect(() => {
        if (currentFrameIndex !== undefined && currentFrameIndex >= 0 && currentFrameIndex < frames.length) {
            activeIdxRef.current = currentFrameIndex;
            drawCurrentFrame(currentFrameIndex);
        }
    }, [currentFrameIndex, frames.length, drawCurrentFrame]);

    if (!anim || frames.length === 0) return null;

    return (
        <div 
            ref={containerRef}
            className={`relative flex items-center justify-center pointer-events-none select-none w-full h-full overflow-hidden ${className}`}
        >
            <canvas
                ref={canvasRef}
                className="w-full h-full block pointer-events-none transform-gpu"
                style={{ imageRendering: 'auto' }}
            />
        </div>
    );
};
