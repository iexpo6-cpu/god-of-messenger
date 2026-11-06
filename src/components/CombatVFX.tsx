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

// ============================================================================
// 초경량 이벤트 버스 (CombatInterface 전체 리렌더링 100% 차단용)
// ============================================================================
type VfxListener = (vfx: CombatVFXData | null) => void;
class CombatVfxEventBus {
    private listeners = new Set<VfxListener>();
    private clearTimer: number | null = null;

    emit(vfx: CombatVFXData | null) {
        if (this.clearTimer !== null) {
            window.clearTimeout(this.clearTimer);
            this.clearTimer = null;
        }
        this.listeners.forEach(fn => fn(vfx));
        if (vfx && vfx.duration) {
            this.clearTimer = window.setTimeout(() => {
                this.listeners.forEach(fn => fn(null));
                this.clearTimer = null;
            }, vfx.duration);
        }
    }

    subscribe(listener: VfxListener): () => void {
        this.listeners.add(listener);
        return () => {
            this.listeners.delete(listener);
        };
    }
}

export const combatVfxBus = new CombatVfxEventBus();

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
        const gradCss = `linear-gradient(135deg, ${fallbackPrimary}, ${fallbackSecondary})`;
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
    requiredTierLevel: number;
    requiredTierName: string;
    badgeColor: string;
}

export const VFX_SHAPE_OPTIONS: VFXShapeOption[] = [
    // Tier 1 (퍼스트 클래스 이상)
    {
        id: 'DEFAULT',
        name: '클래스 대표 기본 연출',
        description: '스킬의 기본 클래스 등급(1차~4차)에 맞추어 자동 지정되는 60FPS 하이퍼 캔버스 대표 타격 연출입니다.',
        requiredTierLevel: 1,
        requiredTierName: '1차 퍼스트 이상',
        badgeColor: 'border-slate-600 text-slate-300 bg-slate-900'
    },
    {
        id: 'SINGLE_SLASH',
        name: '단일 호형 베기',
        description: '날카로운 베지어 검기가 호를 그리며 공간을 베어내고 유리 파편처럼 균열을 일으키는 참격입니다.',
        requiredTierLevel: 1,
        requiredTierName: '1차 퍼스트 이상',
        badgeColor: 'border-emerald-600/50 text-emerald-400 bg-emerald-950/40'
    },
    {
        id: 'PIERCING_THRUST',
        name: '관통 섬창 파동',
        description: '전방의 공간을 순간 꿰뚫는 초음속 소닉붐 링과 직진 관통 창격 파동입니다.',
        requiredTierLevel: 1,
        requiredTierName: '1차 퍼스트 이상',
        badgeColor: 'border-emerald-600/50 text-emerald-400 bg-emerald-950/40'
    },
    {
        id: 'IMPACT_PULSE',
        name: '원형 충격 펄스',
        description: '타격 지점에서 다중 충격파 고리와 빛 입자가 방사형으로 폭발하는 펄스 연출입니다.',
        requiredTierLevel: 1,
        requiredTierName: '1차 퍼스트 이상',
        badgeColor: 'border-emerald-600/50 text-emerald-400 bg-emerald-950/40'
    },
    // Tier 2 (세컨드 클래스 이상)
    {
        id: 'DUAL_CROSS',
        name: '십자 이중 참격',
        description: 'X자와 十자 형태의 이중 차원 검기가 교차하며 섬광 스파크를 튀기는 난무 연출입니다.',
        requiredTierLevel: 2,
        requiredTierName: '2차 세컨드 이상',
        badgeColor: 'border-cyan-600/50 text-cyan-400 bg-cyan-950/40'
    },
    {
        id: 'RING_BURST',
        name: '환영 마법 링 폭열',
        description: '동심원으로 연속 팽창하는 입체 룬 마법진 링과 격렬한 오라 충격 폭발입니다.',
        requiredTierLevel: 2,
        requiredTierName: '2차 세컨드 이상',
        badgeColor: 'border-cyan-600/50 text-cyan-400 bg-cyan-950/40'
    },
    {
        id: 'SPIRAL_TWISTER',
        name: '나선 용오름 파동',
        description: '적의 위치에서 이중 나선 마력 기둥이 회오리치며 상승하는 나선 파동 연출입니다.',
        requiredTierLevel: 2,
        requiredTierName: '2차 세컨드 이상',
        badgeColor: 'border-cyan-600/50 text-cyan-400 bg-cyan-950/40'
    },
    // Tier 3 (라스트 클래스 이상)
    {
        id: 'SKY_BEAM',
        name: '천공 신성 강림 낙뢰',
        description: '상공으로부터 거대한 신성 광선과 실시간 프랙탈 번개가 강림하여 대지를 직격합니다.',
        requiredTierLevel: 3,
        requiredTierName: '3차 라스트 이상',
        badgeColor: 'border-purple-600/50 text-purple-400 bg-purple-950/40'
    },
    {
        id: 'GEOMETRIC_ARRAY',
        name: '3중 차원 마법진',
        description: '3중으로 맞물려 고속 회전하는 기하학 성좌 마법진과 고위 결계 폭발입니다.',
        requiredTierLevel: 3,
        requiredTierName: '3차 라스트 이상',
        badgeColor: 'border-purple-600/50 text-purple-400 bg-purple-950/40'
    },
    {
        id: 'SWORD_RAIN',
        name: '무한 이기어검 강하',
        description: '하늘 전체에 펼쳐진 차원 틈새에서 무수한 신성 환영검이 빛의 궤적을 그리며 난사됩니다.',
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
        description: '차원 중심 코어로 빛이 수축(Implosion)된 후 우주적 스케일의 초신성 폭발과 공간 파편화를 일으킵니다.',
        requiredTierLevel: 4,
        requiredTierName: '4차 파이널 전용',
        badgeColor: 'border-amber-500/60 text-amber-300 bg-amber-950/50'
    },
    {
        id: 'DRAGON_ASCENT',
        name: '신룡 승천 오의',
        description: '태초의 신룡이 거대한 이중 나선 오라와 번개를 두르고 공간을 가르며 승천하는 최상위 오의 연출입니다.',
        requiredTierLevel: 4,
        requiredTierName: '4차 파이널 전용',
        badgeColor: 'border-amber-500/60 text-amber-300 bg-amber-950/50'
    },
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
    {
        id: 'BUFF_HEAVENLY',
        name: '천상의 신성 오라',
        description: '신의 화신이 깃든 듯, 대상의 등 뒤에서 다중 치유 고리와 찬란히 승천하는 깃털/룬들이 생성됩니다. (버프/치유용)',
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
    {
        id: 'BUFF_GOD_AVATAR',
        name: '아바타 오의 천상강림',
        description: '신인합일의 초월적 상태에 도달해 거대한 천사 날개 광채와 무수한 황금 수호검을 정렬합니다. (최상위 오의 버프용)',
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
        description: '날렵한 바람 장막과 잎사귀/꽃잎 오라가 부드럽게 휘감아 오르며 아군의 이동성을 강화합니다. (버프/속도용)',
        requiredTierLevel: 2,
        requiredTierName: '2차 세컨드 이상',
        badgeColor: 'border-cyan-600/50 text-cyan-400 bg-cyan-950/40'
    },
    {
        id: 'METEOR_STRIKE',
        name: '천외 종말 운석 낙하',
        description: '허공에서 작열하는 거대한 대멸종 운석들이 타오르는 꼬리를 뿌리며 강하하여 전역을 무차별 타격합니다. (광역 파괴용)',
        requiredTierLevel: 3,
        requiredTierName: '3차 라스트 이상',
        badgeColor: 'border-purple-600/50 text-purple-400 bg-purple-950/40'
    },
    {
        id: 'TIME_STOP',
        name: '시간 정지 역장',
        description: '초정밀 황금 시계 톱니바퀴 마법진과 시침/분침 역장이 대상의 시간을 정지시킵니다. (공간 제어 디버프용)',
        requiredTierLevel: 4,
        requiredTierName: '4차 파이널 전용',
        badgeColor: 'border-amber-500/60 text-amber-300 bg-amber-950/50'
    },
    {
        id: 'MAGIC_MISSILE',
        name: '유도 마력탄',
        description: '다수의 날렵한 마력탄이 곡선 베지어 궤적을 그리며 대상의 급소를 향해 연속 타격합니다.',
        requiredTierLevel: 1,
        requiredTierName: '1차 퍼스트 이상',
        badgeColor: 'border-emerald-600/50 text-emerald-400 bg-emerald-950/40'
    },
    {
        id: 'SHIELD_BASH',
        name: '강철 방패 돌격',
        description: '거대한 육각 에너지 방패가 앞으로 돌진하며 충격파를 터뜨립니다.',
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
        description: '강력한 수압의 물줄기 소용돌이와 물방울 파편이 폭발하며 쏟아집니다.',
        requiredTierLevel: 1,
        requiredTierName: '1차 퍼스트 이상',
        badgeColor: 'border-emerald-600/50 text-emerald-400 bg-emerald-950/40'
    },
    {
        id: 'LIGHTNING_CHAIN',
        name: '연쇄 번개 도약',
        description: '실시간 프랙탈 뇌전이 대상을 중심으로 불규칙하게 갈라지며 튕깁니다.',
        requiredTierLevel: 2,
        requiredTierName: '2차 세컨드 이상',
        badgeColor: 'border-cyan-600/50 text-cyan-400 bg-cyan-950/40'
    },
    {
        id: 'ICE_NOVA',
        name: '빙결 쇄도 노바',
        description: '영하의 냉기가 폭발하며 날카로운 육각 얼음 결정과 수정 가시들이 사방으로 뻗어 나갑니다.',
        requiredTierLevel: 2,
        requiredTierName: '2차 세컨드 이상',
        badgeColor: 'border-cyan-600/50 text-cyan-400 bg-cyan-950/40'
    },
    {
        id: 'BLOOD_DRAIN',
        name: '흡혈 박쥐 떼',
        description: '붉은 혈기와 마력 구체들이 소용돌이치며 대상으로부터 생명력을 흡수합니다. (디버프/흡혈)',
        requiredTierLevel: 2,
        requiredTierName: '2차 세컨드 이상',
        badgeColor: 'border-cyan-600/50 text-cyan-400 bg-cyan-950/40'
    },
    {
        id: 'SOUND_WAVE',
        name: '음파 진동 균열',
        description: '고주파 초음파 파형과 진동 고리가 겹겹이 방출되어 공간을 공명시킵니다.',
        requiredTierLevel: 2,
        requiredTierName: '2차 세컨드 이상',
        badgeColor: 'border-cyan-600/50 text-cyan-400 bg-cyan-950/40'
    },
    {
        id: 'LASER_BEAM',
        name: '마동포 빔 궤적',
        description: '한 점으로 응축된 에너지가 굵은 코어 레이저 광선이 되어 플라즈마 고리와 함께 직선 관통합니다.',
        requiredTierLevel: 2,
        requiredTierName: '2차 세컨드 이상',
        badgeColor: 'border-cyan-600/50 text-cyan-400 bg-cyan-950/40'
    },
    {
        id: 'SACRED_FLAME',
        name: '정화의 성염',
        description: '따뜻하면서도 맹렬한 성스러운 불꽃 기둥과 불씨가 바닥에서 솟아오릅니다.',
        requiredTierLevel: 2,
        requiredTierName: '2차 세컨드 이상',
        badgeColor: 'border-cyan-600/50 text-cyan-400 bg-cyan-950/40'
    },
    {
        id: 'THUNDER_STORM',
        name: '뇌우 심판의 영역',
        description: '다발성 거대 프랙탈 낙뢰가 전장을 무자비하게 연속 폭격합니다.',
        requiredTierLevel: 3,
        requiredTierName: '3차 라스트 이상',
        badgeColor: 'border-purple-600/50 text-purple-400 bg-purple-950/40'
    },
    {
        id: 'LAVA_ERUPTION',
        name: '마그마 지옥 분출',
        description: '지각이 갈라지고 용암 기둥이 치솟으며 불타는 화산탄 파편을 흩뿌립니다.',
        requiredTierLevel: 3,
        requiredTierName: '3차 라스트 이상',
        badgeColor: 'border-purple-600/50 text-purple-400 bg-purple-950/40'
    },
    {
        id: 'ANGELIC_CHOIR',
        name: '천사의 성가대 찬가',
        description: '찬란한 천상의 빛줄기와 깃털들이 흩날리며 전장에 강력한 가호를 내립니다. (광역 버프)',
        requiredTierLevel: 3,
        requiredTierName: '3차 라스트 이상',
        badgeColor: 'border-purple-600/50 text-purple-400 bg-purple-950/40'
    },
    {
        id: 'GRAVITY_PRESS',
        name: '초중력 압살 큐브',
        description: '입체 기하학 중력장이 생성되어 공간을 짓눌러 붕괴시킵니다.',
        requiredTierLevel: 3,
        requiredTierName: '3차 라스트 이상',
        badgeColor: 'border-purple-600/50 text-purple-400 bg-purple-950/40'
    },
    {
        id: 'ILLUSION_CLONE',
        name: '환영 분신 난무',
        description: '전방위에서 초고속 연속 검기 궤적이 쉼 없이 몰아치며 대상을 난도질합니다.',
        requiredTierLevel: 3,
        requiredTierName: '3차 라스트 이상',
        badgeColor: 'border-purple-600/50 text-purple-400 bg-purple-950/40'
    },
    {
        id: 'DIMENSION_SHATTER',
        name: '차원 붕괴 균열',
        description: '공간 자체가 거미줄 유리창처럼 깨지며 틈새로 심연의 파괴 광선들이 터져 나옵니다.',
        requiredTierLevel: 4,
        requiredTierName: '4차 파이널 전용',
        badgeColor: 'border-amber-500/60 text-amber-300 bg-amber-950/50'
    },
    {
        id: 'STAR_FALL',
        name: '은하수 별자리 낙하',
        description: '우주의 성좌가 펼쳐지며 찬란한 유성우가 연속으로 쏟아져 내립니다.',
        requiredTierLevel: 4,
        requiredTierName: '4차 파이널 전용',
        badgeColor: 'border-amber-500/60 text-amber-300 bg-amber-950/50'
    },
    {
        id: 'WORLD_TREE',
        name: '세계수 만개 오라',
        description: '생명의 빛줄기와 신록의 꽃잎들이 나선으로 피어나며 영구적인 생명력을 부여합니다.',
        requiredTierLevel: 4,
        requiredTierName: '4차 파이널 전용',
        badgeColor: 'border-amber-500/60 text-amber-300 bg-amber-950/50'
    },
    {
        id: 'DEMON_HAND',
        name: '마신의 거대 손아귀',
        description: '차원을 뚫고 나타난 마신의 검붉은 발톱 궤적이 대상을 할퀴고 암흑 폭발을 일으킵니다.',
        requiredTierLevel: 4,
        requiredTierName: '4차 파이널 전용',
        badgeColor: 'border-amber-500/60 text-amber-300 bg-amber-950/50'
    },
    {
        id: 'YIN_YANG',
        name: '태극 만다라 조화',
        description: '빛과 어둠의 이중 태극 나선 문양이 회전하며 만물을 태초로 되돌리는 궁극 오의입니다.',
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

// ============================================================================
// 안티그래비티 60FPS 하이퍼 캔버스 VFX 엔진 (DOM 0개, 단일 GPU 가속 Canvas)
// ============================================================================
interface CanvasParticle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    size: number;
    color: string;
    alpha: number;
    decay: number;
    type: 'spark' | 'shard' | 'petal' | 'orb';
    angle: number;
    spin: number;
}

// 칼끝이 날카롭게 살아있는 테이퍼링 베지어 슬래시 드로잉 헬퍼
function drawTaperedSlash(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    radius: number,
    startAngle: number,
    endAngle: number,
    maxThickness: number,
    primaryColor: string,
    glowColor: string
) {
    const steps = 28;
    ctx.save();
    ctx.translate(cx, cy);

    // 외곽 네온 광채 패스
    ctx.beginPath();
    for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const a = startAngle + (endAngle - startAngle) * t;
        const thick = Math.sin(t * Math.PI) * maxThickness;
        const r = radius + thick * 0.5;
        const x = Math.cos(a) * r;
        const y = Math.sin(a) * r;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    }
    for (let i = steps; i >= 0; i--) {
        const t = i / steps;
        const a = startAngle + (endAngle - startAngle) * t;
        const thick = Math.sin(t * Math.PI) * maxThickness;
        const r = radius - thick * 0.5;
        const x = Math.cos(a) * r;
        const y = Math.sin(a) * r;
        ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fillStyle = primaryColor;
    ctx.fill();

    // 중심부 순백색 코어 검기
    ctx.beginPath();
    for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const a = startAngle + (endAngle - startAngle) * t;
        const thick = Math.sin(t * Math.PI) * (maxThickness * 0.38);
        const r = radius + thick * 0.5;
        const x = Math.cos(a) * r;
        const y = Math.sin(a) * r;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    }
    for (let i = steps; i >= 0; i--) {
        const t = i / steps;
        const a = startAngle + (endAngle - startAngle) * t;
        const thick = Math.sin(t * Math.PI) * (maxThickness * 0.38);
        const r = radius - thick * 0.5;
        const x = Math.cos(a) * r;
        const y = Math.sin(a) * r;
        ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fillStyle = glowColor || '#ffffff';
    ctx.fill();
    ctx.restore();
}

// 실시간 프랙탈 번개 드로잉 헬퍼
function drawFractalLightning(
    ctx: CanvasRenderingContext2D,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    displace: number,
    color: string,
    width: number,
    seed: number
) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    const segments = 10;
    for (let i = 1; i < segments; i++) {
        const t = i / segments;
        const bx = x1 + (x2 - x1) * t;
        const by = y1 + (y2 - y1) * t;
        const pseudoRand = Math.sin(seed * 17.3 + i * 43.7) * Math.cos(seed * 9.1 - i * 19.3);
        const offset = pseudoRand * displace * Math.sin(t * Math.PI);
        const nx = -(y2 - y1);
        const ny = x2 - x1;
        const len = Math.hypot(nx, ny) || 1;
        ctx.lineTo(bx + (nx / len) * offset, by + (ny / len) * offset);
    }
    ctx.lineTo(x2, y2);
    ctx.stroke();

    // 하얀색 내부 코어 전류
    if (width > 2) {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = Math.max(1, width * 0.35);
        ctx.stroke();
    }
    ctx.restore();
}

// 기하학 마법진 드로잉 헬퍼
function drawMagicArray(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    radius: number,
    rotation: number,
    sides: number,
    color: string,
    accent: string,
    alpha: number,
    tiltY: number = 1.0
) {
    if (radius <= 2 || alpha <= 0.01) return;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(1, tiltY);
    ctx.rotate(rotation);
    ctx.globalAlpha = Math.max(0, Math.min(1, alpha));

    // 외곽 이중 마법 링
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = accent;
    ctx.lineWidth = 1.2;
    ctx.setLineDash([8, 6]);
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.86, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // 다각 성좌 (별 또는 정다각형 교차)
    for (let pass = 0; pass < 2; pass++) {
        const offset = (pass * Math.PI) / sides;
        ctx.beginPath();
        for (let i = 0; i <= sides; i++) {
            const a = offset + (i / sides) * Math.PI * 2;
            const px = Math.cos(a) * radius * 0.85;
            const py = Math.sin(a) * radius * 0.85;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.strokeStyle = pass === 0 ? color : '#ffffff';
        ctx.lineWidth = pass === 0 ? 2 : 1;
        ctx.stroke();
    }

    ctx.restore();
}

// 공간 균열(유리창 파열선) 드로잉 헬퍼
function drawDimensionCracks(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    maxRadius: number,
    progress: number,
    color: string
) {
    const alpha = progress < 0.2 ? progress * 5 : Math.max(0, 1 - (progress - 0.2) * 1.3);
    if (alpha <= 0.01) return;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.globalAlpha = alpha;
    const branches = 9;
    for (let b = 0; b < branches; b++) {
        const baseAngle = (b / branches) * Math.PI * 2 + 0.3;
        let x = 0;
        let y = 0;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        const segs = 4;
        for (let s = 1; s <= segs; s++) {
            const r = (s / segs) * maxRadius * Math.min(1, progress * 1.8);
            const jitter = Math.sin(b * 13 + s * 29) * 0.28;
            x = Math.cos(baseAngle + jitter) * r;
            y = Math.sin(baseAngle + jitter) * r;
            ctx.lineTo(x, y);
        }
        ctx.strokeStyle = b % 2 === 0 ? '#ffffff' : color;
        ctx.lineWidth = (1 - progress * 0.5) * 3;
        ctx.stroke();
    }
    ctx.restore();
}

export interface RenderCustomVfxShapeProps {
    shape: string;
    theme: ParsedVfxTheme;
    svgGradId?: string;
    tier?: ClassTier | 'NORMAL' | 'BOND' | 'BUFF' | 'DEBUFF';
    isAoe?: boolean;
    durationMs?: number;
    loop?: boolean;
}

export const RenderCustomVfxShape: React.FC<RenderCustomVfxShapeProps> = ({
    shape,
    theme,
    tier = ClassTier.FIRST,
    isAoe = false,
    durationMs = 950,
    loop = false
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const w = 360;
        const h = 360;
        canvas.width = w;
        canvas.height = h;
        const cx = w / 2;
        const cy = h / 2;

        // 초기 물리 파티클 풀 생성
        const isHighTier = tier === ClassTier.FINAL || tier === ClassTier.BOND || tier === ClassTier.LAST || shape === 'SUPERNOVA' || shape === 'DIVINE_DOMAIN' || shape === 'DIMENSION_SHATTER';
        const pCount = isHighTier ? 48 : 30;
        const particles: CanvasParticle[] = [];

        const spawnParticles = () => {
            particles.length = 0;
            const isImplosion = shape === 'SUPERNOVA' || shape === 'DEBUFF_APOCALYPSE' || shape === 'GRAVITY_PRESS' || shape === 'BLOOD_DRAIN';
            const isPetal = shape === 'WIND_SWIFT' || shape === 'ANGELIC_CHOIR' || shape === 'WORLD_TREE';
            for (let i = 0; i < pCount; i++) {
                const angle = (i / pCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
                const speed = 2.2 + Math.random() * 5.2;
                const startR = isImplosion ? 110 + Math.random() * 60 : 4 + Math.random() * 14;
                particles.push({
                    x: cx + Math.cos(angle) * startR,
                    y: cy + Math.sin(angle) * startR,
                    vx: isImplosion ? -Math.cos(angle) * speed * 0.85 : Math.cos(angle) * speed,
                    vy: isImplosion ? -Math.sin(angle) * speed * 0.85 : Math.sin(angle) * speed,
                    size: 2.5 + Math.random() * 4.5,
                    color: theme.particles[i % theme.particles.length] || theme.primary,
                    alpha: 1,
                    decay: 0.014 + Math.random() * 0.015,
                    type: isPetal ? 'petal' : (i % 3 === 0 ? 'shard' : 'spark'),
                    angle: angle,
                    spin: (Math.random() - 0.5) * 0.25
                });
            }
        };

        spawnParticles();
        let startTime = performance.now();
        let rAF: number | null = null;

        const renderFrame = (now: number) => {
            let elapsed = now - startTime;
            if (elapsed >= durationMs) {
                if (loop) {
                    startTime = now;
                    elapsed = 0;
                    spawnParticles();
                } else {
                    ctx.clearRect(0, 0, w, h);
                    return;
                }
            }

            const p = Math.max(0, Math.min(1, elapsed / durationMs));
            const fadeOut = p < 0.7 ? 1 : Math.max(0, 1 - (p - 0.7) / 0.3);

            ctx.clearRect(0, 0, w, h);
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';

            // 1. 배경 코어 앰비언트 플래시
            const glowRadius = (55 + Math.sin(p * Math.PI) * 95) * (isAoe ? 1.25 : 1.0);
            const bgGrad = ctx.createRadialGradient(cx, cy, 2, cx, cy, glowRadius);
            bgGrad.addColorStop(0, '#ffffff');
            bgGrad.addColorStop(0.25, theme.primary);
            bgGrad.addColorStop(0.65, `${theme.secondary}66`);
            bgGrad.addColorStop(1, 'transparent');
            ctx.globalAlpha = Math.sin(p * Math.PI) * 0.75;
            ctx.fillStyle = bgGrad;
            ctx.beginPath();
            ctx.arc(cx, cy, glowRadius, 0, Math.PI * 2);
            ctx.fill();

            // 실제 렌더링할 대표 Shape 결정 (DEFAULT인 경우 등급별 시그니처 연출 매핑)
            let effShape = shape;
            if (!effShape || effShape === 'DEFAULT') {
                if (tier === 'NORMAL') effShape = 'SINGLE_SLASH';
                else if (tier === 'BUFF') effShape = 'BUFF_HEAVENLY';
                else if (tier === 'DEBUFF') effShape = 'DEBUFF_CURSE';
                else if (tier === ClassTier.FIRST) effShape = 'DUAL_CROSS';
                else if (tier === ClassTier.SECOND) effShape = 'RING_BURST';
                else if (tier === ClassTier.LAST) effShape = 'SKY_BEAM';
                else effShape = 'DIVINE_DOMAIN';
            }

            // 2. Shape별 하이퍼 캔버스 시그니처 렌더링
            if (effShape === 'SINGLE_SLASH' || effShape === 'DUAL_CROSS' || effShape === 'ILLUSION_CLONE' || effShape === 'DEMON_HAND') {
                const slashCount = effShape === 'ILLUSION_CLONE' ? 5 : effShape === 'DEMON_HAND' ? 3 : effShape === 'DUAL_CROSS' ? 2 : 1;
                for (let s = 0; s < slashCount; s++) {
                    const delay = s * 0.11;
                    const sp = Math.max(0, Math.min(1, (p - delay) * 1.45));
                    if (sp <= 0 || sp >= 1) continue;
                    const sweep = sp * Math.PI * 1.25;
                    const baseRot = s === 0 ? -0.8 : s === 1 ? 0.8 : (s * 1.3 - 1.2);
                    const r = 75 + s * 10 + sp * 28;
                    const thick = (1 - sp * 0.65) * (effShape === 'DEMON_HAND' ? 24 : 20);
                    ctx.save();
                    ctx.rotate(baseRot * 0.02);
                    drawTaperedSlash(
                        ctx,
                        cx + (effShape === 'DEMON_HAND' ? (s - 1) * 22 : 0),
                        cy,
                        r,
                        baseRot - sweep * 0.5,
                        baseRot + sweep * 0.65,
                        thick,
                        s % 2 === 0 ? theme.primary : theme.secondary,
                        theme.accent
                    );
                    ctx.restore();
                }
                if (effShape !== 'SINGLE_SLASH') {
                    drawDimensionCracks(ctx, cx, cy, 115, p, theme.primary);
                }
            } else if (effShape === 'PIERCING_THRUST' || effShape === 'LASER_BEAM' || effShape === 'SHIELD_BASH') {
                // 초음속 관통 창격 / 마동포 레이저 + 소닉붐 링
                const beamLen = Math.min(1, p * 2.2) * 310;
                const beamW = (1 - p * 0.6) * (effShape === 'LASER_BEAM' ? 42 : 26);
                ctx.save();
                ctx.translate(cx, cy);
                ctx.rotate(-Math.PI * 0.18);
                const grad = ctx.createLinearGradient(-155, 0, 155, 0);
                grad.addColorStop(0, 'transparent');
                grad.addColorStop(0.4, theme.secondary);
                grad.addColorStop(0.8, theme.primary);
                grad.addColorStop(1, '#ffffff');
                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.moveTo(-150, -beamW * 0.3);
                ctx.lineTo(-150 + beamLen, 0);
                ctx.lineTo(-150, beamW * 0.3);
                ctx.closePath();
                ctx.fill();

                // 소닉붐 충격파 타원 고리 3개
                for (let rIdx = 0; rIdx < 3; rIdx++) {
                    const rp = Math.max(0, Math.min(1, (p - rIdx * 0.1) * 1.4));
                    if (rp <= 0) continue;
                    ctx.strokeStyle = rIdx % 2 === 0 ? '#ffffff' : theme.primary;
                    ctx.lineWidth = (1 - rp) * 4;
                    ctx.beginPath();
                    ctx.ellipse(-60 + rp * 120, 0, 14 + rp * 18, 35 + rp * 48, 0, 0, Math.PI * 2);
                    ctx.stroke();
                }
                ctx.restore();
            } else if (effShape === 'SKY_BEAM' || effShape === 'LIGHTNING_CHAIN' || effShape === 'THUNDER_STORM') {
                // 천공 광선 + 실시간 프랙탈 낙뢰
                const boltCount = effShape === 'THUNDER_STORM' ? 5 : 3;
                const beamW = Math.sin(p * Math.PI) * 44;
                if (effShape !== 'LIGHTNING_CHAIN' && beamW > 2) {
                    const bGrad = ctx.createLinearGradient(cx - beamW, 0, cx + beamW, 0);
                    bGrad.addColorStop(0, 'transparent');
                    bGrad.addColorStop(0.25, theme.primary);
                    bGrad.addColorStop(0.5, '#ffffff');
                    bGrad.addColorStop(0.75, theme.primary);
                    bGrad.addColorStop(1, 'transparent');
                    ctx.fillStyle = bGrad;
                    ctx.fillRect(cx - beamW, 10, beamW * 2, cy + 45);
                }
                for (let b = 0; b < boltCount; b++) {
                    const seed = Math.floor(p * 18) + b * 7;
                    const startX = cx + (b - (boltCount - 1) / 2) * 48;
                    drawFractalLightning(
                        ctx,
                        startX,
                        15,
                        cx + (b - (boltCount - 1) / 2) * 18,
                        cy + 25,
                        32,
                        b % 2 === 0 ? theme.primary : theme.accent,
                        5 - p * 2.5,
                        seed
                    );
                }
                // 지면 방전 마법진
                drawMagicArray(ctx, cx, cy + 28, 45 + p * 85, p * 4, 6, theme.primary, theme.accent, fadeOut, 0.42);
            } else if (
                effShape === 'GEOMETRIC_ARRAY' ||
                effShape === 'DIVINE_DOMAIN' ||
                effShape === 'RING_BURST' ||
                effShape === 'BUFF_BARRIER' ||
                effShape === 'BUFF_GOD_AVATAR' ||
                effShape === 'TIME_STOP' ||
                effShape === 'YIN_YANG'
            ) {
                // 다중 기하학 마법진 & 결계
                const baseR = 40 + Math.min(1, p * 1.5) * 95;
                drawMagicArray(ctx, cx, cy, baseR, p * Math.PI * 2, 6, theme.primary, theme.accent, fadeOut, 1.0);
                drawMagicArray(ctx, cx, cy, baseR * 0.68, -p * Math.PI * 3, 5, theme.secondary, '#ffffff', fadeOut, 1.0);
                if (effShape === 'DIVINE_DOMAIN' || effShape === 'BUFF_GOD_AVATAR') {
                    // 방사형 성스러운 빛줄기 12개
                    ctx.save();
                    ctx.translate(cx, cy);
                    ctx.rotate(p * 0.8);
                    for (let ray = 0; ray < 12; ray++) {
                        const a = (ray / 12) * Math.PI * 2;
                        ctx.strokeStyle = ray % 2 === 0 ? '#ffffff' : theme.primary;
                        ctx.lineWidth = (1 - p) * 4.5;
                        ctx.beginPath();
                        ctx.moveTo(Math.cos(a) * 20, Math.sin(a) * 20);
                        ctx.lineTo(Math.cos(a) * (baseR * 1.25), Math.sin(a) * (baseR * 1.25));
                        ctx.stroke();
                    }
                    ctx.restore();
                }
            } else if (effShape === 'SWORD_RAIN' || effShape === 'METEOR_STRIKE' || effShape === 'STAR_FALL') {
                // 이기어검 / 유성우 / 운석 폭격
                const count = 7;
                for (let i = 0; i < count; i++) {
                    const delay = i * 0.08;
                    const mp = (p - delay) * 1.7;
                    if (mp <= 0 || mp >= 1) continue;
                    const offsetX = (i - 3) * 32;
                    const startX = cx + offsetX - 80;
                    const startY = cy - 140;
                    const endX = cx + offsetX + 20;
                    const endY = cy + 35;
                    const curX = startX + (endX - startX) * mp;
                    const curY = startY + (endY - startY) * mp;

                    ctx.save();
                    ctx.strokeStyle = i % 2 === 0 ? '#ffffff' : theme.primary;
                    ctx.lineWidth = effShape === 'METEOR_STRIKE' ? 10 : 5;
                    ctx.lineCap = 'round';
                    ctx.beginPath();
                    ctx.moveTo(curX - 38, curY - 65);
                    ctx.lineTo(curX, curY);
                    ctx.stroke();

                    ctx.fillStyle = '#ffffff';
                    ctx.beginPath();
                    ctx.arc(curX, curY, effShape === 'METEOR_STRIKE' ? 9 : 5, 0, Math.PI * 2);
                    ctx.fill();

                    if (mp > 0.75) {
                        const impR = (mp - 0.75) * 140;
                        ctx.strokeStyle = theme.accent;
                        ctx.lineWidth = 2.5;
                        ctx.beginPath();
                        ctx.ellipse(endX, endY, impR, impR * 0.45, 0, 0, Math.PI * 2);
                        ctx.stroke();
                    }
                    ctx.restore();
                }
            } else if (
                effShape === 'SUPERNOVA' ||
                effShape === 'DIMENSION_SHATTER' ||
                effShape === 'DEBUFF_APOCALYPSE' ||
                effShape === 'GRAVITY_PRESS'
            ) {
                // 중력 수축(0~0.35) -> 초신성 폭발 & 차원 균열(0.35~1.0)
                if (p < 0.35) {
                    const ip = p / 0.35;
                    const r = (1 - ip) * 120 + 12;
                    ctx.strokeStyle = theme.primary;
                    ctx.lineWidth = 4;
                    ctx.beginPath();
                    ctx.arc(cx, cy, r, 0, Math.PI * 2);
                    ctx.stroke();

                    ctx.globalCompositeOperation = 'source-over';
                    ctx.fillStyle = '#05050a';
                    ctx.beginPath();
                    ctx.arc(cx, cy, 24 * ip, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.globalCompositeOperation = 'lighter';
                } else {
                    const ep = (p - 0.35) / 0.65;
                    const maxR = ep * 165;
                    for (let ring = 0; ring < 3; ring++) {
                        const rr = maxR * (1 - ring * 0.22);
                        ctx.strokeStyle = ring === 0 ? '#ffffff' : theme.primary;
                        ctx.lineWidth = Math.max(1, (1 - ep) * (8 - ring * 2));
                        ctx.beginPath();
                        ctx.arc(cx, cy, rr, 0, Math.PI * 2);
                        ctx.stroke();
                    }
                    drawDimensionCracks(ctx, cx, cy, 155, ep, theme.accent);
                }
            } else if (effShape === 'SPIRAL_TWISTER' || effShape === 'DRAGON_ASCENT' || effShape === 'SACRED_FLAME' || effShape === 'LAVA_ERUPTION') {
                // 이중 나선 용오름 & 승천 기둥
                ctx.save();
                const height = 260;
                for (let strand = 0; strand < 2; strand++) {
                    ctx.beginPath();
                    for (let step = 0; step <= 32; step++) {
                        const t = step / 32;
                        const y = cy + 110 - t * height * Math.min(1, p * 1.4);
                        const phase = t * Math.PI * 4 - p * Math.PI * 5 + strand * Math.PI;
                        const radiusX = (28 + Math.sin(t * Math.PI) * 36) * (1 - p * 0.25);
                        const x = cx + Math.cos(phase) * radiusX;
                        if (step === 0) ctx.moveTo(x, y);
                        else ctx.lineTo(x, y);
                    }
                    ctx.strokeStyle = strand === 0 ? theme.primary : '#ffffff';
                    ctx.lineWidth = (1 - p * 0.5) * (strand === 0 ? 9 : 4);
                    ctx.lineCap = 'round';
                    ctx.stroke();
                }
                ctx.restore();
            } else {
                // 기타 모든 원소/버프/디버프/충격파: 다중 파동 링 + 룬 문장 + 방사형 칼날 스파이크
                for (let ring = 0; ring < 3; ring++) {
                    const rp = Math.max(0, Math.min(1, (p - ring * 0.12) * 1.35));
                    if (rp <= 0) continue;
                    const r = 18 + rp * 125;
                    ctx.strokeStyle = ring === 0 ? '#ffffff' : ring === 1 ? theme.primary : theme.secondary;
                    ctx.lineWidth = Math.max(1, (1 - rp) * 6);
                    ctx.beginPath();
                    ctx.arc(cx, cy, r, 0, Math.PI * 2);
                    ctx.stroke();
                }
                drawMagicArray(ctx, cx, cy, 35 + p * 80, p * Math.PI * 2.5, 6, theme.primary, theme.accent, fadeOut);
            }

            // 3. 물리 파티클 업데이트 및 드로잉
            for (let i = 0; i < particles.length; i++) {
                const pt = particles[i];
                pt.x += pt.vx;
                pt.y += pt.vy;
                pt.angle += pt.spin;
                pt.alpha = Math.max(0, pt.alpha - pt.decay);
                if (pt.alpha <= 0.01) continue;

                ctx.save();
                ctx.globalAlpha = pt.alpha * fadeOut;
                ctx.translate(pt.x, pt.y);
                ctx.rotate(pt.angle);
                ctx.fillStyle = pt.color;

                if (pt.type === 'shard') {
                    // 다이아몬드 빛 파편
                    const s = pt.size * 1.6;
                    ctx.beginPath();
                    ctx.moveTo(0, -s);
                    ctx.lineTo(s * 0.55, 0);
                    ctx.lineTo(0, s);
                    ctx.lineTo(-s * 0.55, 0);
                    ctx.closePath();
                    ctx.fill();
                } else if (pt.type === 'petal') {
                    // 꽃잎 / 깃털 형태
                    ctx.beginPath();
                    ctx.ellipse(0, 0, pt.size * 1.5, pt.size * 0.65, 0, 0, Math.PI * 2);
                    ctx.fill();
                } else {
                    // 속도 방향 스파크 궤적
                    ctx.beginPath();
                    ctx.arc(0, 0, pt.size, 0, Math.PI * 2);
                    ctx.fill();
                }
                ctx.restore();
            }

            ctx.restore();
            rAF = requestAnimationFrame(renderFrame);
        };

        rAF = requestAnimationFrame(renderFrame);
        return () => {
            if (rAF !== null) cancelAnimationFrame(rAF);
        };
    }, [shape, theme, tier, isAoe, durationMs, loop]);

    return (
        <canvas
            ref={canvasRef}
            className="w-full h-full pointer-events-none block transform-gpu"
            style={{ maxWidth: '380px', maxHeight: '380px' }}
        />
    );
};

const DEFAULT_THEME = SHINRYOKU_THEMES['화염계'];

// ============================================================================
// 전투 오버레이 메인 컴포넌트 (이벤트 버스 구독 + Prop 하위호환 동시 지원)
// ============================================================================
export const CombatVFXOverlay: React.FC<{ vfx?: CombatVFXData | null }> = ({ vfx: propVfx }) => {
    const [busVfx, setBusVfx] = useState<CombatVFXData | null>(null);

    useEffect(() => {
        return combatVfxBus.subscribe(setBusVfx);
    }, []);

    const activeVfx = busVfx || propVfx || null;
    if (!activeVfx) return null;
    return <CombatVFXContent key={activeVfx.id} vfx={activeVfx} />;
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
            colors: parsed.colors,
            runes: parsed.runes
        };
    }, [vfx.vfxTheme, vfx.vfxColor, vfx.shinryokuType]);

    const IconComponent = theme.icon;
    const isAoe = vfx.isAoe;
    const tier = vfx.tier;

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

    const overlayRef = useRef<HTMLDivElement>(null);
    const [targetPos, setTargetPos] = useState<{ x: number; y: number } | null>(null);

    useLayoutEffect(() => {
        if (!overlayRef.current) return;
        const containerRect = overlayRef.current.getBoundingClientRect();
        if (containerRect.width === 0 || containerRect.height === 0) return;

        let el: Element | null = null;
        if (isAoe) {
            const isBuffOrHeal = tier === 'BUFF' || vfx.targetName === 'party' || vfx.targetName === 'ally' || vfx.targetName === 'allies';
            let isAttackerEnemy = false;
            if (vfx.attackerName) {
                isAttackerEnemy =
                    document.querySelector(`[data-combat-area="enemies"] [data-combat-unit="${vfx.attackerName}"]`) !== null ||
                    document.querySelector(`[data-combat-area="enemies"] [data-clean-name="${vfx.attackerName}"]`) !== null;
            }
            const targetAreaSelector = isBuffOrHeal
                ? (isAttackerEnemy ? '[data-combat-area="enemies"]' : '[data-combat-area="allies"]')
                : (isAttackerEnemy ? '[data-combat-area="allies"]' : '[data-combat-area="enemies"]');
            el = document.querySelector(targetAreaSelector);
        } else {
            const targetName = vfx.targetName;
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
            setTargetPos({
                x: rect.left + rect.width / 2 - containerRect.left,
                y: rect.top + rect.height / 2 - containerRect.top
            });

            // 피격 대상 카드에 React 리렌더링 없이 순수 GPU Web Animation으로 타격 흔들림(Hit Impulse) 부여
            if (tier !== 'BUFF' && typeof (el as HTMLElement).animate === 'function') {
                try {
                    (el as HTMLElement).animate(
                        [
                            { transform: 'translate3d(0, 0, 0) scale(1)', filter: 'brightness(1)' },
                            { transform: 'translate3d(-6px, -3px, 0) scale(1.04)', filter: 'brightness(1.5)' },
                            { transform: 'translate3d(6px, 3px, 0) scale(0.98)', filter: 'brightness(1.2)' },
                            { transform: 'translate3d(0, 0, 0) scale(1)', filter: 'brightness(1)' }
                        ],
                        { duration: 240, easing: 'ease-out' }
                    );
                } catch {
                    // ignore
                }
            }
        }
    }, [vfx.id, vfx.targetName, vfx.attackerName, isAoe, tier]);

    const isFinalOrLast = tier === ClassTier.FINAL || tier === 'BOND' || tier === ClassTier.LAST;

    return (
        <div ref={overlayRef} className="absolute inset-0 z-50 pointer-events-none overflow-hidden flex items-center justify-center">
            {/* 1. 가벼운 배경 타격 스포트라이트 */}
            <div
                className="absolute inset-0 transition-opacity duration-300"
                style={{
                    background: targetPos
                        ? `radial-gradient(circle at ${targetPos.x}px ${targetPos.y}px, ${theme.bgGlow} 0%, transparent ${isAoe ? '75%' : '50%'})`
                        : `radial-gradient(circle at center, ${theme.bgGlow} 0%, transparent 65%)`
                }}
            />

            {/* 2. 플레이어 커스텀 프레임 애니메이션 (8x8 등 초고속 60FPS 보간 렌더러) */}
            {vfx.frameAnimation?.enabled && vfx.frameAnimation.frames?.length > 0 && vfx.frameAnimation.renderMode !== 'vfx_only' && (
                <div
                    className="pointer-events-none z-35"
                    style={
                        targetPos
                            ? {
                                  position: 'absolute',
                                  left: `${targetPos.x}px`,
                                  top: `${targetPos.y}px`,
                                  transform: 'translate(-50%, -50%)',
                                  width: isAoe ? '420px' : '300px',
                                  height: isAoe ? '420px' : '300px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center'
                              }
                            : {
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

            {/* 3. 상단 스킬명 타이포그래피 배너 */}
            {vfx.skillName && (
                <motion.div
                    initial={{ y: -24, opacity: 0, scale: 0.9 }}
                    animate={{ y: 0, opacity: 1, scale: 1 }}
                    transition={{ duration: 0.2 }}
                    className="absolute top-6 z-50 flex flex-col items-center gap-0.5"
                >
                    <div
                        className="px-3.5 py-0.5 rounded-full text-[10px] md:text-xs font-black tracking-widest uppercase border flex items-center gap-1.5 bg-slate-950/90"
                        style={{
                            borderColor: theme.primary,
                            color: theme.accent
                        }}
                    >
                        <IconComponent size={13} />
                        <span>{tierLabel}</span>
                        {isAoe && (
                            <span className="ml-1 px-1.5 py-0.2 bg-red-600 text-white rounded text-[9px] font-bold">
                                AOE 광역
                            </span>
                        )}
                    </div>
                    <div
                        className="text-base md:text-2xl font-black tracking-wider text-transparent bg-clip-text drop-shadow"
                        style={{
                            backgroundImage: `linear-gradient(to right, #ffffff, ${theme.accent}, ${theme.primary})`
                        }}
                    >
                        {vfx.skillName}
                    </div>
                </motion.div>
            )}

            {/* 4. 안티그래비티 60FPS 하이퍼 캔버스 시그니처 이펙트 */}
            {vfx.frameAnimation?.renderMode !== 'frame_only' && (
                <div
                    className={`flex items-center justify-center ${isAoe ? 'w-96 h-96 sm:w-[440px] sm:h-[440px]' : 'w-80 h-80'}`}
                    style={
                        targetPos
                            ? {
                                  position: 'absolute',
                                  left: `${targetPos.x}px`,
                                  top: `${targetPos.y}px`,
                                  transform: `translate(-50%, -50%) scale(${vfx.vfxScale || 1})`,
                                  zIndex: 30
                              }
                            : {
                                  position: 'relative',
                                  transform: `scale(${vfx.vfxScale || 1})`,
                                  zIndex: 30
                              }
                    }
                >
                    <RenderCustomVfxShape
                        shape={vfx.vfxShape || 'DEFAULT'}
                        theme={theme}
                        tier={tier}
                        isAoe={isAoe}
                        durationMs={vfx.duration || (isFinalOrLast ? 1100 : 750)}
                        loop={false}
                    />
                </div>
            )}

            {/* 5. 다이나믹 대각선 슬래시 일러스트 컷인 (라스트/파이널/인연 및 커스텀 컷신) */}
            {vfx.illustrationUrl && (() => {
                const isFinalCutscene = vfx.tier === ClassTier.FINAL || vfx.tier === 'BOND';
                const cutinDurationSec = vfx.duration ? Math.min(vfx.duration / 1000, 2.2) : (isFinalCutscene ? 1.8 : 1.35);

                return (
                    <motion.div
                        initial={{ opacity: 0, x: '-12%', scale: 0.94 }}
                        animate={{
                            opacity: [0, 1, 1, 0],
                            x: ['-12%', '0%', '1%', '10%'],
                            scale: [0.94, 1.02, 1, 0.98]
                        }}
                        transition={{
                            duration: cutinDurationSec,
                            times: [0, 0.14, 0.82, 1],
                            ease: 'easeOut'
                        }}
                        className="absolute inset-0 z-40 flex items-center justify-center pointer-events-none overflow-hidden px-2 sm:px-6"
                    >
                        {/* 대각선 슬래시 배너 컨테이너 */}
                        <div
                            className={`relative w-full max-w-4xl overflow-hidden rounded-2xl border-y-2 transform -skew-y-2 shadow-2xl flex items-center gap-4 sm:gap-7 px-4 sm:px-8 ${
                                isFinalCutscene ? 'py-4 sm:py-6 border-amber-300' : 'py-3 sm:py-4 border-cyan-300/90'
                            }`}
                            style={{
                                background: `linear-gradient(125deg, rgba(2, 6, 23, 0.95) 0%, ${theme.primary}44 50%, rgba(2, 6, 23, 0.95) 100%)`,
                                boxShadow: `0 0 40px ${theme.glow}`
                            }}
                        >
                            {/* 배경 스피드라인 장식 */}
                            <div
                                className="absolute inset-0 opacity-25 pointer-events-none"
                                style={{
                                    backgroundImage: `repeating-linear-gradient(-25deg, transparent, transparent 14px, ${theme.accent}33 14px, ${theme.accent}33 16px)`
                                }}
                            />

                            {/* 시전자 / 스킬 일러스트 아바타 프레임 */}
                            <div
                                className={`relative shrink-0 rounded-xl overflow-hidden border-2 transform rotate-1 bg-slate-950 ${
                                    isFinalCutscene
                                        ? 'w-28 h-28 sm:w-40 sm:h-40 md:w-48 md:h-48 border-amber-300'
                                        : 'w-24 h-24 sm:w-32 sm:h-32 md:w-36 md:h-36 border-white/80'
                                }`}
                            >
                                <img
                                    src={vfx.illustrationUrl}
                                    alt={vfx.skillName || 'Skill Cutin'}
                                    referrerPolicy="no-referrer"
                                    className="w-full h-full object-cover scale-105"
                                />
                                <div
                                    className="absolute inset-0 pointer-events-none"
                                    style={{
                                        background: `linear-gradient(to top, ${theme.primary}66 0%, transparent 50%)`
                                    }}
                                />
                            </div>

                            {/* 시전자 이름 & 스킬명 타이포그래피 */}
                            <div className="flex flex-col justify-center text-left z-10 min-w-0 flex-1">
                                {vfx.attackerName && (
                                    <div className="flex items-center gap-1.5 text-amber-300 font-black tracking-widest text-xs sm:text-sm uppercase">
                                        <Sparkles size={14} className="text-amber-400 shrink-0" />
                                        <span className="truncate">{vfx.attackerName}</span>
                                        <span className="text-[10px] px-2 py-0.5 rounded bg-black/50 border border-white/20 text-white/90 ml-1">
                                            {isFinalCutscene ? 'FINAL AWAKENING' : 'OVERDRIVE CUT-IN'}
                                        </span>
                                    </div>
                                )}
                                <h2
                                    className={`font-black tracking-tight text-transparent bg-clip-text py-1 leading-tight break-words ${
                                        isFinalCutscene
                                            ? 'text-xl sm:text-3xl md:text-4xl'
                                            : 'text-lg sm:text-2xl md:text-3xl'
                                    }`}
                                    style={{
                                        backgroundImage: `linear-gradient(to right, #ffffff, ${theme.accent}, ${theme.primary})`
                                    }}
                                >
                                    {vfx.skillName || '초월 비기'}
                                </h2>
                                <div className="text-[11px] sm:text-xs font-mono font-bold text-slate-200/90 flex items-center gap-1.5 mt-0.5">
                                    <Crown size={13} className="text-amber-400 shrink-0" />
                                    <span className="truncate">{tierLabel}</span>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                );
            })()}
        </div>
    );
};

// ============================================================================
// 초고속 프레임 애니메이션 렌더러 (비트맵 사전 캐싱 + 60FPS Delta-Time + 크로스페이드 보간)
// ============================================================================
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

const frameImageCache = new Map<string, HTMLCanvasElement | HTMLImageElement>();

const getFrameImage = (url: string, onLoad?: () => void): HTMLCanvasElement | HTMLImageElement | null => {
    if (!url) return null;
    const cached = frameImageCache.get(url);
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
                // 모든 프레임을 최대 320px 고속 오프스크린 캔버스 비트맵으로 구워 디코딩 렉 0ms화
                if (nw > 0 && nh > 0) {
                    const maxDim = 320;
                    let targetW = nw;
                    let targetH = nh;
                    if (nw > maxDim || nh > maxDim) {
                        if (nw > nh) {
                            targetH = Math.round((nh * maxDim) / nw);
                            targetW = maxDim;
                        } else {
                            targetW = Math.round((nw * maxDim) / nh);
                            targetH = maxDim;
                        }
                    }
                    const offCanvas = document.createElement('canvas');
                    offCanvas.width = Math.max(1, targetW);
                    offCanvas.height = Math.max(1, targetH);
                    const offCtx = offCanvas.getContext('2d');
                    if (offCtx) {
                        offCtx.imageSmoothingEnabled = true;
                        offCtx.imageSmoothingQuality = 'medium';
                        offCtx.drawImage(img, 0, 0, targetW, targetH);
                        frameImageCache.set(url, offCanvas);
                    }
                }
            } catch {
                // fallback to img
            }
            if (onLoad) onLoad();
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

/**
 * 전투 시작 시 플레이어와 동료의 모든 프레임 애니메이션 이미지를 백그라운드에서 미리 비트맵 캐싱
 */
export function preloadSkillFrameAnimations(character: any): void {
    if (!character) return;
    try {
        const allSkills: any[] = [
            ...(character.skills || []),
            ...(character.bondSkills || []),
            ...((character.companions || []).flatMap((c: any) => c.skills || []))
        ];
        allSkills.forEach(skill => {
            if (skill?.frameAnimation?.enabled && Array.isArray(skill.frameAnimation.frames)) {
                skill.frameAnimation.frames.forEach((f: any) => {
                    if (f?.imageUrl) {
                        getFrameImage(f.imageUrl);
                    }
                });
            }
        });
    } catch {
        // ignore preload errors
    }
}

const BLEND_MODE_MAP: Record<string, GlobalCompositeOperation> = {
    normal: 'source-over',
    screen: 'screen',
    lighten: 'lighter',
    overlay: 'overlay'
};

export const SkillFrameAnimationRenderer: React.FC<SkillFrameAnimationRendererProps> = ({
    anim,
    isPlaying = true,
    currentFrameIndex,
    onFrameChange,
    playbackSpeed = 1,
    loop = true,
    className = '',
    showCrosshair = false
}) => {
    const frames = anim?.frames || [];
    const containerRef = React.useRef<HTMLDivElement>(null);
    const canvasRef = React.useRef<HTMLCanvasElement>(null);
    const activeIdxRef = React.useRef<number>(0);
    const subFrameProgressRef = React.useRef<number>(0);
    const animFrameReqRef = React.useRef<number | null>(null);
    const lastFrameTimeRef = React.useRef<number>(0);
    const renderScaleRef = React.useRef<number>(1);

    const onFrameChangeRef = React.useRef(onFrameChange);
    onFrameChangeRef.current = onFrameChange;

    const isControlled = currentFrameIndex !== undefined && currentFrameIndex >= 0 && currentFrameIndex < frames.length;
    if (isControlled) {
        activeIdxRef.current = currentFrameIndex;
    }

    // 1. 프레임 사전 캐싱
    React.useEffect(() => {
        if (!frames || frames.length === 0) return;
        frames.forEach(f => {
            if (f.imageUrl) getFrameImage(f.imageUrl);
        });
    }, [frames]);

    // 고프레임(예: 8x8=64프레임) 시트가 옛날 기본값(70~100ms)으로 설정되어 5초씩 늘어지는 경우,
    // 자동으로 60FPS(약 18~22ms) 고속 부드러운 재생으로 정규화!
    const getEffectiveFrameDuration = React.useCallback(
        (idx: number) => {
            const rawDur = frames[idx]?.duration || 70;
            let adjusted = rawDur;
            if (frames.length >= 36 && rawDur >= 50) {
                adjusted = 18; // 64프레임 시트 -> 약 1.1초 내 60FPS 초고속 재생
            } else if (frames.length >= 16 && rawDur >= 65) {
                adjusted = 32; // 16~35프레임 시트 -> 약 0.6~1.0초 내 부드러운 재생
            }
            return Math.max(12, adjusted / Math.max(0.1, playbackSpeed));
        },
        [frames, playbackSpeed]
    );

    // 단일 프레임 요소 드로잉 헬퍼
    const drawSingleFrameObject = (
        ctx: CanvasRenderingContext2D,
        frame: any,
        cx: number,
        cy: number,
        alphaMultiplier: number
    ) => {
        if (!frame || !frame.imageUrl || alphaMultiplier <= 0.02) return;
        const img = getFrameImage(frame.imageUrl);
        const isReady =
            (img instanceof HTMLCanvasElement && img.width > 0) ||
            (img instanceof HTMLImageElement && img.complete && img.naturalWidth > 0);
        if (!isReady || !img) return;

        ctx.save();
        ctx.translate(cx + (frame.x || 0), cy + (frame.y || 0));
        if (frame.rotation) {
            ctx.rotate((frame.rotation * Math.PI) / 180);
        }
        const frameScale = frame.scale ?? 1;
        ctx.scale(frameScale, frameScale);
        ctx.globalAlpha = Math.max(0, Math.min(1, (frame.opacity ?? 1) * alphaMultiplier));
        ctx.globalCompositeOperation = BLEND_MODE_MAP[frame.blendMode || 'screen'] || 'screen';

        const w = frame.width || 220;
        const h = frame.height || 220;
        ctx.drawImage(img, -w / 2, -h / 2, w, h);
        ctx.restore();
    };

    // 2. 서브프레임 크로스페이드 보간 & 모션 잔상 렌더링
    const drawCurrentFrame = React.useCallback(
        (idx: number, subProgress: number = 0) => {
            const canvas = canvasRef.current;
            if (!canvas) return;
            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            const cw = canvas.width;
            const ch = canvas.height;
            ctx.clearRect(0, 0, cw, ch);
            if (cw <= 0 || ch <= 0) return;

            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'medium';

            const scale = renderScaleRef.current || 1;
            ctx.save();
            ctx.scale(scale, scale);

            const cx = cw / scale / 2;
            const cy = ch / scale / 2;

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

            // 재생 중일 때 이전 프레임 잔상(Sub-frame Crossfade)을 부드럽게 블렌딩하여 끊김 현상 완벽 제거
            if (isPlaying && !isControlled && idx > 0 && subProgress < 0.45) {
                const prevFrame = frames[idx - 1];
                const trailAlpha = (0.45 - subProgress) * 0.65;
                drawSingleFrameObject(ctx, prevFrame, cx, cy, trailAlpha);
            }

            const frame = frames[idx];
            drawSingleFrameObject(ctx, frame, cx, cy, 1.0);

            ctx.restore();
        },
        [frames, showCrosshair, isPlaying, isControlled]
    );

    // 3. 캔버스 해상도 최적화
    React.useEffect(() => {
        const container = containerRef.current;
        const canvas = canvasRef.current;
        if (!container || !canvas) return;

        let rAFId: number | null = null;
        const updateCanvasSize = () => {
            if (!container || !canvas) return;
            const rect = container.getBoundingClientRect();
            const rawW = Math.max(1, Math.round(rect.width) || 280);
            const rawH = Math.max(1, Math.round(rect.height) || 280);

            const MAX_CANVAS_DIM = 320;
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
                drawCurrentFrame(activeIdxRef.current, subFrameProgressRef.current);
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

    // 4. Delta-Time 기반 60FPS 정밀 루프 (프레임 밀림 및 끊김 100% 방지)
    React.useEffect(() => {
        if (!isPlaying || frames.length <= 1 || isControlled) {
            drawCurrentFrame(activeIdxRef.current, 0);
            return;
        }

        lastFrameTimeRef.current = performance.now();

        const tick = (now: number) => {
            let currentIdx = activeIdxRef.current;
            let elapsed = now - lastFrameTimeRef.current;
            let currentDuration = getEffectiveFrameDuration(currentIdx);

            // 경과 시간(Delta-Time)만큼 정확히 프레임 전진 (프레임 드랍 시에도 재생 속도 일정 유지)
            let advanced = false;
            while (elapsed >= currentDuration) {
                elapsed -= currentDuration;
                const nextIdx = currentIdx + 1 >= frames.length ? (loop ? 0 : frames.length - 1) : currentIdx + 1;
                if (nextIdx === currentIdx && !loop) {
                    break;
                }
                currentIdx = nextIdx;
                currentDuration = getEffectiveFrameDuration(currentIdx);
                advanced = true;
            }

            if (advanced) {
                lastFrameTimeRef.current = now - elapsed;
                activeIdxRef.current = currentIdx;
                if (onFrameChangeRef.current) {
                    onFrameChangeRef.current(currentIdx);
                }
            }

            const subProgress = Math.min(1, elapsed / Math.max(1, currentDuration));
            subFrameProgressRef.current = subProgress;
            drawCurrentFrame(currentIdx, subProgress);

            animFrameReqRef.current = requestAnimationFrame(tick);
        };

        drawCurrentFrame(activeIdxRef.current, 0);
        animFrameReqRef.current = requestAnimationFrame(tick);

        return () => {
            if (animFrameReqRef.current) {
                cancelAnimationFrame(animFrameReqRef.current);
                animFrameReqRef.current = null;
            }
        };
    }, [isPlaying, frames, loop, isControlled, getEffectiveFrameDuration, drawCurrentFrame]);

    // 5. 에디터 수동 제어 시 즉시 렌더링
    React.useEffect(() => {
        if (isControlled && currentFrameIndex !== undefined) {
            activeIdxRef.current = currentFrameIndex;
            drawCurrentFrame(currentFrameIndex, 0);
        }
    }, [isControlled, currentFrameIndex, drawCurrentFrame]);

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
