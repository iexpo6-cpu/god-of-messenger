import React from 'react';
import { Item, ItemRarity } from '../types';

// ============================================================================
// 1. CUSTOM SVG RPG SKILL VECTOR ICONS (Lucide-compatible React Components)
// ============================================================================
export interface RpgIconProps {
  size?: number;
  className?: string;
}

const createSvgIcon = (paths: React.ReactNode): React.FC<RpgIconProps> => {
  const Comp: React.FC<RpgIconProps> = ({ size = 18, className = '' }) => (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.85"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {paths}
    </svg>
  );
  return Comp;
};

// --- Weapons & Martial Arts ---
export const IconSword = createSvgIcon(
  <>
    <path d="M14.5 17.5L3 6V3h3l11.5 11.5" />
    <path d="M13 19l6-6" />
    <path d="M16 16l4 4" />
    <path d="M19 21l2-2" />
  </>
);

export const IconDualBlades = createSvgIcon(
  <>
    <path d="M14.5 17.5L3 6V3h3l11.5 11.5" />
    <path d="M13 19l6-6" />
    <path d="M16 16l4 4" />
    <path d="M9.5 17.5L21 6V3h-3L6.5 14.5" />
    <path d="M11 19l-6-6" />
    <path d="M8 16l-4 4" />
  </>
);

export const IconKatanaSlash = createSvgIcon(
  <>
    <path d="M4 20c5-2 11-8 16-16" strokeWidth="2.2" />
    <path d="M3 16c4-1 9-5 13-12" opacity="0.65" />
    <path d="M6 18l3 3" />
    <path d="M3 21l3-3" />
    <circle cx="18" cy="6" r="1.5" fill="currentColor" />
  </>
);

export const IconGreatsword = createSvgIcon(
  <>
    <path d="M19 3l2 2-9.5 11.5-4-4L19 3z" />
    <path d="M5.5 11.5l7 7" />
    <path d="M6.5 15.5l-3.5 3.5" />
    <path d="M2 20l2 2" />
    <path d="M15 7l-5 5" opacity="0.6" />
  </>
);

export const IconDaggerAssassinate = createSvgIcon(
  <>
    <path d="M18 3c1 4-2 9-7 13l-3-3C12 8 15 4 18 3z" />
    <path d="M6 11l7 7" />
    <path d="M7 15l-4 4" />
    <path d="M19 10c1 2 1 4-1 6" opacity="0.6" />
  </>
);

export const IconSpearThrust = createSvgIcon(
  <>
    <path d="M21 3l-6 2 1.5 2.5L3 21" />
    <path d="M21 3l-2 6-2.5-1.5" />
    <path d="M11 8l5 5" opacity="0.6" />
    <path d="M15 4l5 5" opacity="0.4" />
  </>
);

export const IconHalberdSweep = createSvgIcon(
  <>
    <path d="M4 20L19 5" />
    <path d="M19 5l2-2" />
    <path d="M14 6c3-1 6 1 6 5-3 0-5 2-6 5" />
    <path d="M13 10c-2-2-4-2-6 0" />
  </>
);

export const IconScytheReap = createSvgIcon(
  <>
    <path d="M6 21L19 4" />
    <path d="M19 4c-6-2-13 1-16 7 4-2 9-2 13 0" />
    <circle cx="11" cy="14" r="1" fill="currentColor" />
  </>
);

export const IconAxeCleave = createSvgIcon(
  <>
    <path d="M5 20L17 8" />
    <path d="M13 4c4 0 7 3 7 7-3 1-6 0-8-2s-3-5-2-8z" />
    <path d="M10 11c-3-1-5 1-6 4 2 2 5 2 8 0" opacity="0.7" />
  </>
);

export const IconHammerSmash = createSvgIcon(
  <>
    <path d="M4 20l9-9" />
    <path d="M11 6l7 7 3-3-7-7-3 3z" />
    <path d="M9 8l-2 2 7 7 2-2" />
    <path d="M17 18l3 2" opacity="0.6" />
    <path d="M6 4l-2 3" opacity="0.6" />
  </>
);

export const IconBowVolley = createSvgIcon(
  <>
    <path d="M5 4c8 1 14 7 15 15" />
    <path d="M5 4L19 18" opacity="0.5" />
    <path d="M4 20L19 5" />
    <path d="M15 5h4v4" />
  </>
);

export const IconCrossbowSnipe = createSvgIcon(
  <>
    <circle cx="12" cy="12" r="8" />
    <circle cx="12" cy="12" r="3" />
    <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
  </>
);

export const IconFistImpact = createSvgIcon(
  <>
    <path d="M8 11V7a2 2 0 0 1 4 0v4" />
    <path d="M12 9V6a2 2 0 0 1 4 0v5" />
    <path d="M16 10V8a2 2 0 0 1 4 0v6a6 6 0 0 1-6 6h-2a6 6 0 0 1-6-6v-3a2 2 0 0 1 4 0v2" />
    <path d="M4 5l2 2M20 3l-2 2M12 2v2" opacity="0.65" />
  </>
);

export const IconShuriken = createSvgIcon(
  <>
    <path d="M12 2l2.5 7.5L22 12l-7.5 2.5L12 22l-2.5-7.5L2 12l7.5-2.5L12 2z" />
    <circle cx="12" cy="12" r="2.2" />
  </>
);

// --- Elemental & Arcane Magic ---
export const IconFlame = createSvgIcon(
  <>
    <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
  </>
);

export const IconHellfire = createSvgIcon(
  <>
    <path d="M12 2c1 4 4 6 4 10a4 4 0 1 1-8 0c0-2 1-4 2-6" />
    <path d="M5 10c-1 2-2 4-2 6a9 9 0 0 0 18 0c0-3-1.5-5.5-3.5-7.5" />
    <circle cx="12" cy="15" r="1.5" fill="currentColor" />
  </>
);

export const IconZap = createSvgIcon(
  <>
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  </>
);

export const IconThunderstorm = createSvgIcon(
  <>
    <path d="M11 2L5 11h6l-2 9 9-11h-6l3-7z" />
    <path d="M19 3l-2 4h3l-3 5" opacity="0.65" />
    <path d="M4 14l-2 4" opacity="0.65" />
  </>
);

export const IconWaves = createSvgIcon(
  <>
    <path d="M2 6c.6.5 1.2 1 2.5 1C7 7 7 5 9.5 5c2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1" />
    <path d="M2 12c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1" />
    <path d="M2 18c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1" />
  </>
);

export const IconIceCrystal = createSvgIcon(
  <>
    <path d="M12 2v20M2 12h20M4.9 4.9l14.2 14.2M19.1 4.9L4.9 19.1" />
    <polygon points="12 7 17 12 12 17 7 12" />
  </>
);

export const IconWind = createSvgIcon(
  <>
    <path d="M17.7 7.7a2.5 2.5 0 1 1 1.8 4.3H2" />
    <path d="M9.6 4.6A2 2 0 1 1 11 8H2" />
    <path d="M12.6 19.4A2 2 0 1 0 14 16H2" />
  </>
);

export const IconTornado = createSvgIcon(
  <>
    <path d="M21 4H3" />
    <path d="M18 8H6" />
    <path d="M19 12H9" />
    <path d="M16 16h-6" />
    <path d="M11 20H9" />
  </>
);

export const IconEarthquake = createSvgIcon(
  <>
    <path d="M2 18h6l3-6 3 8 3-5h5" />
    <path d="M4 12l4-7 4 5 4-6 4 8" opacity="0.6" />
  </>
);

export const IconMeteor = createSvgIcon(
  <>
    <circle cx="9" cy="15" r="5" />
    <path d="M13 11l8-8" />
    <path d="M9 9l7-7" opacity="0.7" />
    <path d="M15 15l7-7" opacity="0.7" />
    <circle cx="8" cy="16" r="1.5" fill="currentColor" />
  </>
);

export const IconWand2 = createSvgIcon(
  <>
    <path d="M15 4V2M15 16v-2M8 9h2M20 9h2M17.8 11.8L19 13M15 9h0M17.8 6.2L19 5M3 21l9-9M12.2 6.2L11 5" />
  </>
);

export const IconMagicCircle = createSvgIcon(
  <>
    <circle cx="12" cy="12" r="9" />
    <polygon points="12 4 19 16 5 16" />
    <polygon points="12 20 19 8 5 8" opacity="0.75" />
    <circle cx="12" cy="12" r="2" />
  </>
);

export const IconArcaneOrb = createSvgIcon(
  <>
    <circle cx="12" cy="12" r="6" />
    <path d="M12 2a10 10 0 0 1 10 10" />
    <path d="M12 22A10 10 0 0 1 2 12" />
    <circle cx="12" cy="12" r="2" fill="currentColor" />
  </>
);

export const IconStarfall = createSvgIcon(
  <>
    <polygon points="12 2 14.8 8.5 22 9.3 16.5 14 18.2 21 12 17.3 5.8 21 7.5 14 2 9.3 9.2 8.5 12 2" />
  </>
);

// --- Holy, Healing & Defense ---
export const IconSparkles = createSvgIcon(
  <>
    <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
    <path d="M5 3v4M19 17v4M3 5h4M17 19h4" />
  </>
);

export const IconHolyWings = createSvgIcon(
  <>
    <path d="M12 14c-3-6-9-8-10-8 0 5 3 9 8 10" />
    <path d="M12 14c3-6 9-8 10-8 0 5-3 9-8 10" />
    <path d="M12 4v16" />
    <circle cx="12" cy="4" r="2" />
  </>
);

export const IconHolyCross = createSvgIcon(
  <>
    <path d="M12 2v20M5 8h14" strokeWidth="2.3" />
    <circle cx="12" cy="8" r="4" opacity="0.6" />
  </>
);

export const IconSun = createSvgIcon(
  <>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
  </>
);

export const IconHeart = createSvgIcon(
  <>
    <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
  </>
);

export const IconGrail = createSvgIcon(
  <>
    <path d="M6 3h12v5a6 6 0 0 1-12 0V3z" />
    <path d="M12 14v6" />
    <path d="M8 20h8" />
    <path d="M12 5v4M10 7h4" opacity="0.7" />
  </>
);

export const IconShield = createSvgIcon(
  <>
    <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
  </>
);

export const IconAegisBarrier = createSvgIcon(
  <>
    <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
    <path d="M12 8v8M8 12h8" />
  </>
);

export const IconCrown = createSvgIcon(
  <>
    <path d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14" />
  </>
);

export const IconHornValor = createSvgIcon(
  <>
    <path d="M3 17c4 0 8-2 11-6s4-7 4-8l3 3c-1 3-3 7-7 10s-8 4-11 3z" />
    <path d="M18 3l3 3" />
  </>
);

// --- Dark, Cosmic, Beast & Special ---
export const IconSkull = createSvgIcon(
  <>
    <circle cx="9" cy="12" r="1" />
    <circle cx="15" cy="12" r="1" />
    <path d="M8 20v2h8v-2" />
    <path d="m12.5 17-.5-1-.5 1h1z" />
    <path d="M16 20a2 2 0 0 0 1.56-3.25 8 8 0 1 0-11.12 0A2 2 0 0 0 8 20" />
  </>
);

export const IconMoon = createSvgIcon(
  <>
    <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
  </>
);

export const IconBloodMoon = createSvgIcon(
  <>
    <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
    <path d="M4 20L20 4" strokeWidth="2" />
  </>
);

export const IconBlackHole = createSvgIcon(
  <>
    <circle cx="12" cy="12" r="4" fill="currentColor" />
    <path d="M12 3c5 0 9 4 9 9" />
    <path d="M21 12c0 5-4 9-9 9" />
    <path d="M12 21c-5 0-9-4-9-9" />
    <path d="M3 12c0-5 4-9 9-9" />
  </>
);

export const IconEyeAbyss = createSvgIcon(
  <>
    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
    <circle cx="12" cy="12" r="3" />
    <path d="M12 10v4" />
  </>
);

export const IconDragonHead = createSvgIcon(
  <>
    <path d="M4 4l5 3 4-4 2 5 6-2-3 6 3 4-7 1-2 4-5-5-4 1 3-6-2-7z" />
    <circle cx="13" cy="11" r="1" fill="currentColor" />
  </>
);

export const IconDragonClaw = createSvgIcon(
  <>
    <path d="M4 18L16 4" />
    <path d="M8 20L20 6" />
    <path d="M3 13L12 3" />
    <path d="M13 21l8-9" />
  </>
);

export const IconPhoenix = createSvgIcon(
  <>
    <path d="M12 3l2 4 5-3-2 6 5 1-6 4 2 6-6-4-6 4 2-6-6-4 5-1-2-6 5 3 2-4z" />
  </>
);

export const IconWolfFang = createSvgIcon(
  <>
    <path d="M4 5l4 14 4-8 4 8 4-14" />
    <path d="M2 5h20" />
  </>
);

export const IconBookOpen = createSvgIcon(
  <>
    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
  </>
);

export const IconFilm = createSvgIcon(
  <>
    <rect width="18" height="18" x="3" y="3" rx="2" />
    <path d="M7 3v18M17 3v18M3 7.5h4M17 7.5h4M3 12h18M3 16.5h4M17 16.5h4" />
  </>
);

export const IconImage = createSvgIcon(
  <>
    <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
    <circle cx="9" cy="9" r="2" />
    <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
  </>
);

export const IconPalette = createSvgIcon(
  <>
    <circle cx="13.5" cy="6.5" r=".5" fill="currentColor" />
    <circle cx="17.5" cy="10.5" r=".5" fill="currentColor" />
    <circle cx="8.5" cy="7.5" r=".5" fill="currentColor" />
    <circle cx="6.5" cy="12.5" r=".5" fill="currentColor" />
    <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z" />
  </>
);

export const IconLeaf = createSvgIcon(
  <>
    <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" />
    <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
  </>
);

export const IconGem = createSvgIcon(
  <>
    <path d="M6 3h12l4 6-10 13L2 9Z" />
    <path d="M11 3 8 9l4 13 4-13-3-6" />
    <path d="M2 9h20" />
  </>
);

export const IconFeather = createSvgIcon(
  <>
    <path d="M12.67 19a2 2 0 0 0 1.416-.588l6.154-6.172a6 6 0 0 0-8.49-8.49L5.586 9.914A2 2 0 0 0 5 11.328V18a1 1 0 0 0 1 1z" />
    <path d="M16 8 2 22" />
    <path d="M17.5 15H9" />
  </>
);

export const IconCompass = createSvgIcon(
  <>
    <circle cx="12" cy="12" r="10" />
    <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
  </>
);

// ============================================================================
// 2. UNIFIED RPG SKILL ICON CATALOG (48 Icons across 4 Categories)
// ============================================================================
export interface RpgSkillIconEntry {
  name: string;
  label: string;
  category: 'martial' | 'magic' | 'holy' | 'dark';
  icon: React.ComponentType<RpgIconProps>;
}

export const RPG_SKILL_ICONS: RpgSkillIconEntry[] = [
  // 1) 검술 / 무기 / 무투 (Martial)
  { name: 'Sword', label: '장검', category: 'martial', icon: IconSword },
  { name: 'DualBlades', label: '쌍검연참', category: 'martial', icon: IconDualBlades },
  { name: 'KatanaSlash', label: '발도일섬', category: 'martial', icon: IconKatanaSlash },
  { name: 'Greatsword', label: '대검강타', category: 'martial', icon: IconGreatsword },
  { name: 'DaggerAssassinate', label: '암살비수', category: 'martial', icon: IconDaggerAssassinate },
  { name: 'SpearThrust', label: '창격돌파', category: 'martial', icon: IconSpearThrust },
  { name: 'HalberdSweep', label: '언월참', category: 'martial', icon: IconHalberdSweep },
  { name: 'ScytheReap', label: '사신낫', category: 'martial', icon: IconScytheReap },
  { name: 'AxeCleave', label: '도끼분쇄', category: 'martial', icon: IconAxeCleave },
  { name: 'HammerSmash', label: '철퇴격', category: 'martial', icon: IconHammerSmash },
  { name: 'BowVolley', label: '궁술사격', category: 'martial', icon: IconBowVolley },
  { name: 'CrossbowSnipe', label: '정밀저격', category: 'martial', icon: IconCrossbowSnipe },
  { name: 'FistImpact', label: '권왕격', category: 'martial', icon: IconFistImpact },
  { name: 'Shuriken', label: '비검술', category: 'martial', icon: IconShuriken },

  // 2) 원소 / 비전 마법 (Magic)
  { name: 'Flame', label: '화염', category: 'magic', icon: IconFlame },
  { name: 'Hellfire', label: '업화폭염', category: 'magic', icon: IconHellfire },
  { name: 'Zap', label: '전격', category: 'magic', icon: IconZap },
  { name: 'Thunderstorm', label: '천벌뇌우', category: 'magic', icon: IconThunderstorm },
  { name: 'Waves', label: '해일수류', category: 'magic', icon: IconWaves },
  { name: 'IceCrystal', label: '절대영도', category: 'magic', icon: IconIceCrystal },
  { name: 'Wind', label: '질풍', category: 'magic', icon: IconWind },
  { name: 'Tornado', label: '폭풍회오리', category: 'magic', icon: IconTornado },
  { name: 'Earthquake', label: '대지균열', category: 'magic', icon: IconEarthquake },
  { name: 'Meteor', label: '운석낙하', category: 'magic', icon: IconMeteor },
  { name: 'Wand2', label: '비전마법', category: 'magic', icon: IconWand2 },
  { name: 'MagicCircle', label: '대마법진', category: 'magic', icon: IconMagicCircle },
  { name: 'ArcaneOrb', label: '마력보주', category: 'magic', icon: IconArcaneOrb },
  { name: 'Starfall', label: '성운유성', category: 'magic', icon: IconStarfall },

  // 3) 신성 / 치유 / 방어 / 버프 (Holy & Support)
  { name: 'Sparkles', label: '신성섬광', category: 'holy', icon: IconSparkles },
  { name: 'HolyWings', label: '천사강림', category: 'holy', icon: IconHolyWings },
  { name: 'HolyCross', label: '성십자', category: 'holy', icon: IconHolyCross },
  { name: 'Sun', label: '태양권능', category: 'holy', icon: IconSun },
  { name: 'Heart', label: '생명치유', category: 'holy', icon: IconHeart },
  { name: 'Grail', label: '성배축복', category: 'holy', icon: IconGrail },
  { name: 'Shield', label: '수호방패', category: 'holy', icon: IconShield },
  { name: 'AegisBarrier', label: '절대성역', category: 'holy', icon: IconAegisBarrier },
  { name: 'Crown', label: '제왕위엄', category: 'holy', icon: IconCrown },
  { name: 'HornValor', label: '전장포효', category: 'holy', icon: IconHornValor },

  // 4) 암흑 / 차원 / 신수 / 특수 (Dark, Cosmic & Beast)
  { name: 'Skull', label: '죽음저주', category: 'dark', icon: IconSkull },
  { name: 'Moon', label: '암월', category: 'dark', icon: IconMoon },
  { name: 'BloodMoon', label: '혈월참', category: 'dark', icon: IconBloodMoon },
  { name: 'BlackHole', label: '차원붕괴', category: 'dark', icon: IconBlackHole },
  { name: 'EyeAbyss', label: '심연의눈', category: 'dark', icon: IconEyeAbyss },
  { name: 'DragonHead', label: '용의포효', category: 'dark', icon: IconDragonHead },
  { name: 'DragonClaw', label: '용조파천', category: 'dark', icon: IconDragonClaw },
  { name: 'Phoenix', label: '불사조', category: 'dark', icon: IconPhoenix },
  { name: 'WolfFang', label: '맹수송곳니', category: 'dark', icon: IconWolfFang },
  { name: 'BookOpen', label: '고대비급', category: 'dark', icon: IconBookOpen },
  { name: 'Leaf', label: '자연신록', category: 'magic', icon: IconLeaf },
  { name: 'Crosshair', label: '약점조준', category: 'martial', icon: IconCrossbowSnipe },
  { name: 'Gem', label: '마법보석', category: 'magic', icon: IconGem },
  { name: 'Feather', label: '신속비상', category: 'holy', icon: IconFeather },
  { name: 'Compass', label: '운명탐색', category: 'holy', icon: IconCompass },
  { name: 'Film', label: '특수연출', category: 'dark', icon: IconFilm },
  { name: 'ImageIcon', label: '형상화', category: 'dark', icon: IconImage },
  { name: 'Palette', label: '조화신력', category: 'dark', icon: IconPalette },
];

const ICON_MAP = new Map<string, React.ComponentType<RpgIconProps>>(
  RPG_SKILL_ICONS.map((entry) => [entry.name, entry.icon])
);

/**
 * Smart Skill Icon Resolver:
 * - If skill has an explicit non-default icon name in RPG_SKILL_ICONS, returns it.
 * - If skill.icon is empty or generic 'Sword', analyzes the skill's name, element, and type
 *   so every skill automatically gets a fitting fantasy RPG icon!
 */
export function resolveSkillIconName(skill?: {
  name?: string;
  icon?: string;
  description?: string;
  shinryokuType?: string;
  type?: string;
} | string | null): string {
  if (!skill) return 'Sword';
  if (typeof skill === 'string') {
    return ICON_MAP.has(skill) ? skill : 'Sword';
  }

  const rawIcon = skill.icon || '';
  if (rawIcon && rawIcon !== 'Sword' && ICON_MAP.has(rawIcon)) {
    return rawIcon;
  }

  const text = `${skill.name || ''} ${skill.description || ''} ${skill.shinryokuType || ''}`.toLowerCase();

  // Smart keyword matching
  if (/일섬|발도|쾌검|진공참|차원참|베기|절단/.test(text)) return 'KatanaSlash';
  if (/쌍검|이도|연참|난무|연격|질풍참/.test(text)) return 'DualBlades';
  if (/대검|중검|단두|일격필살|가르기|대지참/.test(text)) return 'Greatsword';
  if (/암살|비수|단검|급소|배후|은신/.test(text)) return 'DaggerAssassinate';
  if (/창|관통|찌르기|돌격|랜스|삼지창|일점/.test(text)) return 'SpearThrust';
  if (/언월|폴암|휩쓸기|회전참|할버드/.test(text)) return 'HalberdSweep';
  if (/사신|낫|수확|영혼거두기|명계/.test(text)) return 'ScytheReap';
  if (/도끼|분쇄|처형|광전사/.test(text)) return 'AxeCleave';
  if (/망치|해머|철퇴|강타|충격파|지진/.test(text)) return 'HammerSmash';
  if (/활|화살|사격|궁|유성우|천공/.test(text)) return 'BowVolley';
  if (/저격|석궁|조준|약점포착/.test(text)) return 'CrossbowSnipe';
  if (/권|주먹|격투|파쇄|장풍|기공|무투/.test(text)) return 'FistImpact';
  if (/수리검|표창|비검|투척/.test(text)) return 'Shuriken';

  if (/용|드래곤|신룡|청룡|흑룡|적룡/.test(text)) return 'DragonHead';
  if (/발톱|할퀴기|용조|야수|늑대|맹수/.test(text)) return 'DragonClaw';
  if (/불사조|봉황|주작|부활/.test(text)) return 'Phoenix';
  if (/운석|메테오|혜성|천체/.test(text)) return 'Meteor';
  if (/차원|공허|블랙홀|시공|붕괴|중력|무한/.test(text)) return 'BlackHole';
  if (/별|성운|은하|아스트랄/.test(text)) return 'Starfall';
  if (/마법진|비전|룬|아케인|대마법/.test(text)) return 'MagicCircle';

  if (/업화|지옥불|홍련|폭염|용암/.test(text)) return 'Hellfire';
  if (/화염|불꽃|작열|소각|화구/.test(text)) return 'Flame';
  if (/천벌|뇌우|뇌신|벽력|낙뢰/.test(text)) return 'Thunderstorm';
  if (/번개|전격|뇌전|스파크|감전/.test(text)) return 'Zap';
  if (/얼음|빙결|냉기|서리|절대영도|눈보라/.test(text)) return 'IceCrystal';
  if (/물|수류|해일|파도|심해|격류/.test(text)) return 'Waves';
  if (/태풍|회오리|폭풍|소용돌이/.test(text)) return 'Tornado';
  if (/바람|질풍|대기|비상/.test(text)) return 'Wind';
  if (/대지|바위|암석|균열/.test(text)) return 'Earthquake';

  if (/천사|날개|강림|발키리/.test(text)) return 'HolyWings';
  if (/십자|심판|성검|성광|구원/.test(text)) return 'HolyCross';
  if (/태양|일륜|여명|서광/.test(text)) return 'Sun';
  if (/성배|축복|성수|은총/.test(text)) return 'Grail';
  if (/치유|회복|재생|생명|힐/.test(text)) return 'Heart';
  if (/성역|결계|절대방어|무적|배리어/.test(text)) return 'AegisBarrier';
  if (/방패|수호|방어|철벽|가드/.test(text)) return 'Shield';
  if (/왕|제왕|군주|통솔|위엄|지배/.test(text)) return 'Crown';
  if (/함성|포효|전장의|투지|고무/.test(text)) return 'HornValor';
  if (/신성|빛|섬광/.test(text)) return 'Sparkles';

  if (/혈|피의|흡혈|광기|광폭/.test(text)) return 'BloodMoon';
  if (/심연|주시|공포|환영/.test(text)) return 'EyeAbyss';
  if (/저주|독|역병|죽음|파멸|해골|언데드/.test(text)) return 'Skull';
  if (/어둠|암흑|그림자|달|야습/.test(text)) return 'Moon';
  if (/심법|비급|수련|패시브|깨달음|숙련/.test(text)) return 'BookOpen';

  if (rawIcon && ICON_MAP.has(rawIcon)) return rawIcon;
  return 'Sword';
}

export function getSkillIconComponent(
  skillOrIconName?: {
    name?: string;
    icon?: string;
    description?: string;
    shinryokuType?: string;
    type?: string;
  } | string | null
): React.ComponentType<RpgIconProps> {
  const resolved = resolveSkillIconName(skillOrIconName);
  return ICON_MAP.get(resolved) || IconSword;
}

// ============================================================================
// 3. FULL-COLOR RPG SKILL EMBLEM STAMP GENERATOR (Data URI Presets)
// ============================================================================
export interface SkillEmblemPreset {
  id: string;
  name: string;
  category: string;
  bgStart: string;
  bgEnd: string;
  accent: string;
  glow: string;
  svgInner: string;
}

export const SKILL_EMBLEM_PRESETS: SkillEmblemPreset[] = [
  {
    id: 'crimson_slash',
    name: '홍련 일섬',
    category: '검술',
    bgStart: '#450a0a',
    bgEnd: '#090d16',
    accent: '#f87171',
    glow: '#ef4444',
    svgInner: `<path d="M12 52 C24 44, 42 26, 52 12 C44 28, 28 44, 16 52 Z" fill="url(#acc)"/><path d="M10 46 L18 54 M14 50 L8 56" stroke="#fde047" stroke-width="3" stroke-linecap="round"/><circle cx="48" cy="16" r="3" fill="#fff"/>`
  },
  {
    id: 'azure_dual',
    name: '창공 쌍검무',
    category: '검술',
    bgStart: '#082f49',
    bgEnd: '#090d16',
    accent: '#38bdf8',
    glow: '#0284c7',
    svgInner: `<path d="M14 50 L50 14 M18 14 L50 46" stroke="url(#acc)" stroke-width="4.5" stroke-linecap="round"/><path d="M12 44 L20 52 M44 44 L52 52" stroke="#bae6fd" stroke-width="3"/>`
  },
  {
    id: 'gold_excalibur',
    name: '성검 엑스칼리버',
    category: '신성',
    bgStart: '#422006',
    bgEnd: '#090d16',
    accent: '#facc15',
    glow: '#eab308',
    svgInner: `<polygon points="32,8 37,38 32,43 27,38" fill="url(#acc)"/><rect x="20" y="38" width="24" height="4" rx="2" fill="#fde047"/><rect x="30" y="42" width="4" height="12" fill="#ca8a04"/><circle cx="32" cy="55" r="3" fill="#fef08a"/>`
  },
  {
    id: 'violet_abyss_scythe',
    name: '심연의 사신낫',
    category: '암흑',
    bgStart: '#2e1065',
    bgEnd: '#090d16',
    accent: '#c084fc',
    glow: '#9333ea',
    svgInner: `<path d="M18 54 L46 14" stroke="#e9d5ff" stroke-width="3.5" stroke-linecap="round"/><path d="M46 14 C30 8, 14 16, 12 32 C20 22, 32 20, 42 24 Z" fill="url(#acc)"/>`
  },
  {
    id: 'dragon_breath',
    name: '신룡의 포효',
    category: '신수',
    bgStart: '#7c2d12',
    bgEnd: '#090d16',
    accent: '#fb923c',
    glow: '#ea580c',
    svgInner: `<path d="M14 18 L28 24 L36 12 L42 26 L54 20 L46 36 L52 46 L34 48 L28 56 L18 42 L10 44 L18 30 Z" fill="url(#acc)"/><circle cx="36" cy="30" r="2.5" fill="#fff"/>`
  },
  {
    id: 'thunder_spear',
    name: '뇌신 천벌창',
    category: '원소',
    bgStart: '#1e1b4b',
    bgEnd: '#090d16',
    accent: '#fde047',
    glow: '#6366f1',
    svgInner: `<polygon points="36,8 16,34 32,34 26,56 48,28 32,28" fill="url(#acc)"/>`
  },
  {
    id: 'ice_lotus',
    name: '빙하 절대영도',
    category: '원소',
    bgStart: '#083344',
    bgEnd: '#090d16',
    accent: '#67e8f9',
    glow: '#06b6d4',
    svgInner: `<polygon points="32,8 38,26 56,32 38,38 32,56 26,38 8,32 26,26" fill="url(#acc)"/><polygon points="32,16 48,32 32,48 16,32" fill="none" stroke="#cffafe" stroke-width="2"/>`
  },
  {
    id: 'meteor_apocalypse',
    name: '아포칼립스 메테오',
    category: '원소',
    bgStart: '#4c0519',
    bgEnd: '#090d16',
    accent: '#fb7185',
    glow: '#e11d48',
    svgInner: `<path d="M26 24 L52 10 L40 38 Z" fill="url(#acc)" opacity="0.75"/><circle cx="24" cy="40" r="12" fill="url(#acc)"/><circle cx="20" cy="42" r="5" fill="#fff" opacity="0.8"/>`
  },
  {
    id: 'arcane_grand_circle',
    name: '대현자의 마법진',
    category: '마법',
    bgStart: '#172554',
    bgEnd: '#090d16',
    accent: '#60a5fa',
    glow: '#3b82f6',
    svgInner: `<circle cx="32" cy="32" r="20" fill="none" stroke="url(#acc)" stroke-width="2.5"/><polygon points="32,12 49,42 15,42" fill="none" stroke="#93c5fd" stroke-width="2"/><polygon points="32,52 49,22 15,22" fill="none" stroke="#93c5fd" stroke-width="2"/><circle cx="32" cy="32" r="4" fill="#fff"/>`
  },
  {
    id: 'seraphim_wings',
    name: '세라핌의 축복',
    category: '신성',
    bgStart: '#3f2e05',
    bgEnd: '#090d16',
    accent: '#fde68a',
    glow: '#f59e0b',
    svgInner: `<path d="M32 36 C22 20, 10 16, 8 18 C10 32, 18 42, 28 46 Z" fill="url(#acc)"/><path d="M32 36 C42 20, 54 16, 56 18 C54 32, 46 42, 36 46 Z" fill="url(#acc)"/><path d="M32 12 L32 52 M24 22 L40 22" stroke="#fff" stroke-width="3" stroke-linecap="round"/>`
  },
  {
    id: 'void_singularity',
    name: '시공 붕괴 특이점',
    category: '암흑',
    bgStart: '#1e1b4b',
    bgEnd: '#030712',
    accent: '#a855f7',
    glow: '#7e22ce',
    svgInner: `<circle cx="32" cy="32" r="18" fill="none" stroke="url(#acc)" stroke-width="3" stroke-dasharray="10 6"/><circle cx="32" cy="32" r="10" fill="#030712" stroke="#f0abfc" stroke-width="2"/><circle cx="32" cy="32" r="4" fill="#fff"/>`
  },
  {
    id: 'emerald_tempest',
    name: '태풍의 신궁',
    category: '원소',
    bgStart: '#064e3b',
    bgEnd: '#090d16',
    accent: '#34d399',
    glow: '#10b981',
    svgInner: `<path d="M18 12 C38 16, 48 28, 48 50" fill="none" stroke="url(#acc)" stroke-width="4" stroke-linecap="round"/><path d="M14 50 L50 14" stroke="#a7f3d0" stroke-width="3" stroke-linecap="round"/><polygon points="52,12 42,14 48,22" fill="#fff"/>`
  }
];

export function buildSkillEmblemDataUri(preset: SkillEmblemPreset): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
    <defs>
      <radialGradient id="bg" cx="50%" cy="45%" r="60%">
        <stop offset="0%" stop-color="${preset.bgStart}"/>
        <stop offset="100%" stop-color="${preset.bgEnd}"/>
      </radialGradient>
      <linearGradient id="acc" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#ffffff"/>
        <stop offset="35%" stop-color="${preset.accent}"/>
        <stop offset="100%" stop-color="${preset.glow}"/>
      </linearGradient>
    </defs>
    <rect width="64" height="64" rx="14" fill="url(#bg)"/>
    <rect x="2" y="2" width="60" height="60" rx="12" fill="none" stroke="${preset.accent}" stroke-opacity="0.55" stroke-width="2"/>
    <circle cx="32" cy="32" r="24" fill="none" stroke="${preset.accent}" stroke-opacity="0.22" stroke-width="1" stroke-dasharray="4 3"/>
    ${preset.svgInner}
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

// ============================================================================
// 4. SMART MULTI-LAYER RPG ITEM ARTWORK ENGINE (Replaces abstract DiceBear)
// ============================================================================
interface RarityPalette {
  bgCenter: string;
  bgEdge: string;
  border: string;
  accent: string;
  glow: string;
  isHighTier?: boolean;
  isMythic?: boolean;
}

const RARITY_PALETTES: Record<string, RarityPalette> = {
  [ItemRarity.NORMAL]: {
    bgCenter: '#1e293b',
    bgEdge: '#0f172a',
    border: '#475569',
    accent: '#cbd5e1',
    glow: '#64748b',
  },
  [ItemRarity.MAGIC]: {
    bgCenter: '#172554',
    bgEdge: '#090d16',
    border: '#3b82f6',
    accent: '#93c5fd',
    glow: '#2563eb',
  },
  [ItemRarity.RARE]: {
    bgCenter: '#422006',
    bgEnd: '#090d16',
    bgEdge: '#090d16',
    border: '#eab308',
    accent: '#fde047',
    glow: '#ca8a04',
  } as any,
  [ItemRarity.EPIC]: {
    bgCenter: '#3b0764',
    bgEdge: '#090d16',
    border: '#a855f7',
    accent: '#e9d5ff',
    glow: '#9333ea',
    isHighTier: true,
  },
  [ItemRarity.UNIQUE]: {
    bgCenter: '#500724',
    bgEdge: '#090d16',
    border: '#ec4899',
    accent: '#fbcfe8',
    glow: '#db2777',
    isHighTier: true,
  },
  [ItemRarity.LEGENDARY]: {
    bgCenter: '#78350f',
    bgEdge: '#090d16',
    border: '#f59e0b',
    accent: '#fef08a',
    glow: '#d97706',
    isHighTier: true,
  },
  [ItemRarity.MYTHTIC]: {
    bgCenter: '#7f1d1d',
    bgEdge: '#090408',
    border: '#ef4444',
    accent: '#fecaca',
    glow: '#dc2626',
    isHighTier: true,
    isMythic: true,
  },
};

type RpgItemArtKind =
  | 'katana'
  | 'greatsword'
  | 'dualsword'
  | 'dagger'
  | 'rapier'
  | 'sword'
  | 'spear'
  | 'halberd'
  | 'scythe'
  | 'axe'
  | 'hammer'
  | 'bow'
  | 'crossbow'
  | 'gun'
  | 'staff'
  | 'grimoire'
  | 'gauntlet'
  | 'fan'
  | 'harp'
  | 'shield'
  | 'orb'
  | 'quiver'
  | 'crown'
  | 'helm'
  | 'armor'
  | 'robe'
  | 'gloves'
  | 'boots'
  | 'ring'
  | 'necklace'
  | 'earring'
  | 'belt'
  | 'wings'
  | 'hp_potion'
  | 'mp_potion'
  | 'elixir'
  | 'scroll'
  | 'skillbook'
  | 'crystal'
  | 'ore'
  | 'herb'
  | 'fang'
  | 'chest'
  | 'key'
  | 'food'
  | 'coin';

function classifyRpgItemKind(item: any): RpgItemArtKind {
  const name = String(item?.name || item?.item || '').toLowerCase();
  const slot = String(item?.slot || '').toLowerCase();
  const weaponType = String(item?.weaponType || '').toLowerCase();
  const type = String(item?.type || '').toLowerCase();
  const combined = `${name} ${weaponType}`;

  // 1) Specific Weapons by name / weaponType
  if (/카타나|태도|요도|발도|일본도|흑도|혈도|명도/.test(combined)) return 'katana';
  if (/쌍검|이도|듀얼/.test(combined)) return 'dualsword';
  if (/대검|중검|클레이모어|쯔바이|대도|거검/.test(combined)) return 'greatsword';
  if (/단검|비수|나이프|암살검|더크|크리스/.test(combined)) return 'dagger';
  if (/레이피어|세검|자검|에페/.test(combined)) return 'rapier';
  if (/낫|사신|사이즈/.test(combined)) return 'scythe';
  if (/언월도|폴암|할버드|글레이브|장병기/.test(combined)) return 'halberd';
  if (/창|장창|스피어|랜스|삼지창/.test(combined)) return 'spear';
  if (/도끼|액스/.test(combined)) return 'axe';
  if (/해머|망치|둔기|철퇴|메이스|배트|몽둥이|곤봉/.test(combined)) return 'hammer';
  if (/석궁|보우건|아발레스트/.test(combined)) return 'crossbow';
  if (/활|장궁|단궁|보우|신궁/.test(combined)) return 'bow';
  if (/총|권총|라이플|머스킷|캐논|건/.test(combined)) return 'gun';
  if (/마도서|성서|경전|비급서|고서|책|서적|그리모어/.test(combined)) return 'grimoire';
  if (/지팡이|스태프|로드|완드|마법봉|홀|셉터/.test(combined)) return 'staff';
  if (/권갑|너클|클로|건틀릿|격투/.test(combined) && (slot === 'weapon' || weaponType)) return 'gauntlet';
  if (/부채|선|음양선/.test(combined)) return 'fan';
  if (/하프|류트|피리|악기|리라/.test(combined)) return 'harp';
  if (/검|소드|블레이드|성검|마검|신검/.test(combined) && slot !== 'etc') return 'sword';

  // 2) SubWeapon / Armor / Accessories by name or slot
  if (/방패|실드|이지스|가드|버클러/.test(combined)) return 'shield';
  if (/화살통|퀴버/.test(combined)) return 'quiver';
  if (/보주|오브|수정구|마력구|성배/.test(combined)) return 'orb';
  if (/왕관|티아라|서클릿|면류관/.test(combined)) return 'crown';
  if (slot === 'head' || /투구|헬름|모자|두건|가면|머리/.test(combined)) return 'helm';
  if (slot === 'body') {
    if (/로브|망토|예복|도포|코트|의복|법의/.test(combined)) return 'robe';
    return 'armor';
  }
  if (/로브|법의|예복|도포/.test(combined)) return 'robe';
  if (/갑옷|흉갑|판금|중갑|사슬|아머|전투복/.test(combined)) return 'armor';
  if (slot === 'hand' || /장갑|건틀릿|완갑|수갑|토시|글러브|팔찌/.test(combined)) return 'gloves';
  if (slot === 'feets' || /신발|부츠|장화|각반|그리브|구두/.test(combined)) return 'boots';
  if (/반지|링|가락지/.test(combined)) return 'ring';
  if (/목걸이|펜던트|팬던트|아뮬렛|호신부|초커/.test(combined)) return 'necklace';
  if (/귀걸이|이어링/.test(combined)) return 'earring';
  if (/벨트|허리띠|복대/.test(combined)) return 'belt';
  if (/날개|망토|휘장|훈장|문장/.test(combined)) return 'wings';
  if (slot === 'accessory') return 'necklace';
  if (slot === 'subweapon') return 'shield';
  if (slot === 'weapon') return 'sword';

  // 3) Consumables, Potions, Scrolls, Materials
  if (/엘릭서|비약|영약|신약|만병통치|각성제|신수/.test(combined)) return 'elixir';
  if (/마나|mp|정신|마력|푸른|파란/.test(combined) && /포션|물약|회복|병|시약/.test(combined)) return 'mp_potion';
  if (/포션|물약|생명|체력|hp|힐링|붉은|빨간|약/.test(combined) && type === 'consumable') return 'hp_potion';
  if (/포션|물약|시약/.test(combined)) return 'hp_potion';
  if (/스킬북|교본|비급/.test(combined)) return 'skillbook';
  if (/주문서|스크롤|귀환서|강화서|비전서|부적|초기화권|변경권/.test(combined)) return 'scroll';
  if (/상자|박스|보물|꾸러미|주머니|패키지|선물/.test(combined)) return 'chest';
  if (/열쇠|키|입장권|통행증|초대장/.test(combined)) return 'key';
  if (/마정석|신력석|결정|수정|보석|루비|사파이어|에메랄드|다이아|코어|정수|영혼석|젬|구슬/.test(combined)) return 'crystal';
  if (/광석|철광|미스릴|오리할콘|아다만티움|주괴|금속|운석|파편|조각|가루|석/.test(combined)) return 'ore';
  if (/약초|풀|꽃|잎|열매|뿌리|버섯|나무|목재|연금|씨앗/.test(combined)) return 'herb';
  if (/이빨|발톱|뼈|비늘|가죽|뿔|심장|눈|피|독|깃털|날개뼈|갑피|촉수/.test(combined)) return 'fang';
  if (/고기|빵|스튜|요리|음식|과일|술|포도주|맥주|도시락|만찬/.test(combined)) return 'food';
  if (/골드|금화|주화|동전|메달|증표|토큰|주머니/.test(combined)) return 'coin';

  if (type === 'consumable') return 'hp_potion';
  if (type === 'weapon' || type === 'equipment') return 'sword';
  return 'crystal';
}

function renderItemArtSvgBody(kind: RpgItemArtKind, accent: string, glow: string): string {
  switch (kind) {
    case 'katana':
      return `
        <path d="M12 50 C26 40, 42 24, 52 10 C45 24, 30 40, 16 50 Z" fill="url(#blade)"/>
        <ellipse cx="19" cy="45" rx="5" ry="2.2" transform="rotate(45 19 45)" fill="#fbbf24" stroke="#78350f" stroke-width="1"/>
        <path d="M10 54 L18 46" stroke="#991b1b" stroke-width="4" stroke-linecap="round"/>
        <path d="M11 53 L17 47" stroke="#fde047" stroke-width="1.2" stroke-dasharray="2 2"/>
        <path d="M22 30 C32 22, 42 14, 50 10" fill="none" stroke="#fff" stroke-width="1.2" opacity="0.85"/>
      `;
    case 'greatsword':
      return `
        <polygon points="52,12 46,12 20,38 26,44 52,18" fill="url(#blade)" stroke="#e2e8f0" stroke-width="0.8"/>
        <line x1="25" y1="39" x2="48" y2="16" stroke="${glow}" stroke-width="1.8"/>
        <path d="M15 33 L31 49" stroke="#fbbf24" stroke-width="4.5" stroke-linecap="round"/>
        <path d="M12 52 L21 43" stroke="#78350f" stroke-width="4.5" stroke-linecap="round"/>
        <circle cx="11" cy="53" r="3" fill="#fbbf24"/>
      `;
    case 'dualsword':
      return `
        <polygon points="50,12 45,14 18,41 23,46 50,19" fill="url(#blade)"/>
        <path d="M14 38 L26 50" stroke="#fbbf24" stroke-width="3.5" stroke-linecap="round"/>
        <path d="M11 53 L19 45" stroke="#475569" stroke-width="3.5" stroke-linecap="round"/>
        <polygon points="14,12 19,14 46,41 41,46 14,19" fill="url(#blade)" opacity="0.92"/>
        <path d="M50 38 L38 50" stroke="#38bdf8" stroke-width="3.5" stroke-linecap="round"/>
        <path d="M53 53 L45 45" stroke="#475569" stroke-width="3.5" stroke-linecap="round"/>
      `;
    case 'dagger':
      return `
        <path d="M46 16 C38 18, 28 26, 22 36 L28 42 C38 36, 44 26, 46 16 Z" fill="url(#blade)"/>
        <path d="M18 34 L30 46" stroke="#a855f7" stroke-width="3.5" stroke-linecap="round"/>
        <path d="M14 50 L23 41" stroke="#334155" stroke-width="3.5" stroke-linecap="round"/>
        <circle cx="13" cy="51" r="2.2" fill="#c084fc"/>
      `;
    case 'rapier':
      return `
        <line x1="20" y1="44" x2="52" y2="12" stroke="url(#blade)" stroke-width="2.6" stroke-linecap="round"/>
        <path d="M16 40 C16 32, 24 32, 26 40 C26 48, 18 48, 16 40 Z" fill="none" stroke="#fbbf24" stroke-width="2.2"/>
        <line x1="12" y1="52" x2="20" y2="44" stroke="#b45309" stroke-width="3" stroke-linecap="round"/>
        <circle cx="50" cy="14" r="2" fill="#fff"/>
      `;
    case 'sword':
      return `
        <polygon points="50,14 44,15 21,38 26,43 49,20" fill="url(#blade)"/>
        <line x1="24" y1="40" x2="47" y2="17" stroke="#fff" stroke-width="1.2" opacity="0.8"/>
        <path d="M16 34 L30 48" stroke="#fbbf24" stroke-width="4" stroke-linecap="round"/>
        <circle cx="23" cy="41" r="2.2" fill="${glow}"/>
        <path d="M13 51 L21 43" stroke="#92400e" stroke-width="4" stroke-linecap="round"/>
        <circle cx="12" cy="52" r="2.5" fill="#fbbf24"/>
      `;
    case 'spear':
      return `
        <line x1="12" y1="52" x2="42" y2="22" stroke="#b45309" stroke-width="3.5" stroke-linecap="round"/>
        <polygon points="54,10 38,20 44,26" fill="url(#blade)"/>
        <polygon points="54,10 44,26 40,22" fill="#cbd5e1"/>
        <path d="M38 24 C34 28, 32 34, 36 36" fill="none" stroke="#ef4444" stroke-width="2.5" stroke-linecap="round"/>
      `;
    case 'halberd':
      return `
        <line x1="12" y1="52" x2="48" y2="16" stroke="#92400e" stroke-width="3.5" stroke-linecap="round"/>
        <polygon points="54,10 44,16 48,20" fill="url(#blade)"/>
        <path d="M36 16 C46 16, 52 26, 44 36 C42 28, 38 24, 32 24 Z" fill="url(#blade)"/>
      `;
    case 'scythe':
      return `
        <line x1="16" y1="54" x2="46" y2="14" stroke="#475569" stroke-width="3.5" stroke-linecap="round"/>
        <path d="M46 14 C30 8, 12 16, 10 32 C20 22, 32 20, 42 24 Z" fill="url(#blade)"/>
        <circle cx="43" cy="18" r="2" fill="${glow}"/>
      `;
    case 'axe':
      return `
        <line x1="14" y1="50" x2="46" y2="18" stroke="#92400e" stroke-width="4" stroke-linecap="round"/>
        <path d="M32 12 C44 10, 54 20, 50 32 C42 28, 36 22, 32 12 Z" fill="url(#blade)"/>
        <path d="M24 20 C16 24, 16 34, 24 40 C28 32, 28 26, 24 20 Z" fill="url(#blade)" opacity="0.85"/>
      `;
    case 'hammer':
      return `
        <line x1="14" y1="50" x2="40" y2="24" stroke="#92400e" stroke-width="4" stroke-linecap="round"/>
        <rect x="28" y="12" width="22" height="13" rx="3" transform="rotate(45 39 18)" fill="url(#blade)" stroke="#fbbf24" stroke-width="1.2"/>
        <circle cx="39" cy="19" r="2.2" fill="${glow}"/>
      `;
    case 'bow':
      return `
        <path d="M18 12 C40 14, 50 26, 48 48" fill="none" stroke="#fbbf24" stroke-width="3.5" stroke-linecap="round"/>
        <line x1="18" y1="12" x2="48" y2="48" stroke="#e2e8f0" stroke-width="1.2" opacity="0.7"/>
        <line x1="16" y1="48" x2="48" y2="16" stroke="${accent}" stroke-width="2.5" stroke-linecap="round"/>
        <polygon points="51,13 42,16 48,22" fill="#fff"/>
      `;
    case 'crossbow':
      return `
        <path d="M16 22 C28 12, 36 12, 48 22" fill="none" stroke="#fbbf24" stroke-width="3.5" stroke-linecap="round"/>
        <line x1="32" y1="12" x2="32" y2="52" stroke="#92400e" stroke-width="4" stroke-linecap="round"/>
        <line x1="16" y1="22" x2="48" y2="22" stroke="#cbd5e1" stroke-width="1.2"/>
        <polygon points="32,8 28,16 36,16" fill="${accent}"/>
      `;
    case 'gun':
      return `
        <path d="M14 26 L48 20 L50 27 L28 32 L24 48 L16 46 L20 30 Z" fill="url(#blade)" stroke="#fbbf24" stroke-width="1.2"/>
        <circle cx="51" cy="23" r="3" fill="${glow}"/>
      `;
    case 'staff':
      return `
        <line x1="14" y1="52" x2="42" y2="24" stroke="#b45309" stroke-width="3.8" stroke-linecap="round"/>
        <path d="M36 28 C34 16, 44 10, 52 14 C54 22, 48 30, 36 28 Z" fill="none" stroke="#fbbf24" stroke-width="2.8"/>
        <circle cx="45" cy="19" r="5.5" fill="${glow}"/>
        <circle cx="44" cy="18" r="2.2" fill="#fff"/>
      `;
    case 'grimoire':
      return `
        <rect x="16" y="12" width="32" height="40" rx="4" fill="#4c1d95" stroke="#fbbf24" stroke-width="2.2"/>
        <line x1="22" y1="12" x2="22" y2="52" stroke="#fbbf24" stroke-width="2"/>
        <polygon points="35,22 41,34 29,34" fill="none" stroke="${accent}" stroke-width="1.8"/>
        <circle cx="35" cy="31" r="2.5" fill="#fff"/>
      `;
    case 'gauntlet':
      return `
        <path d="M20 36 L20 20 C20 16, 44 16, 44 20 L44 36 L38 48 L26 48 Z" fill="url(#blade)" stroke="#fbbf24" stroke-width="1.5"/>
        <line x1="24" y1="24" x2="40" y2="24" stroke="#fbbf24" stroke-width="2"/>
        <circle cx="32" cy="34" r="4" fill="${glow}"/>
      `;
    case 'fan':
      return `
        <path d="M32 48 L12 24 C22 12, 42 12, 52 24 Z" fill="url(#blade)" stroke="#fbbf24" stroke-width="2"/>
        <line x1="32" y1="48" x2="32" y2="16" stroke="#fbbf24" stroke-width="1.5"/>
        <line x1="32" y1="48" x2="22" y2="19" stroke="#fbbf24" stroke-width="1.5"/>
        <line x1="32" y1="48" x2="42" y2="19" stroke="#fbbf24" stroke-width="1.5"/>
      `;
    case 'harp':
      return `
        <path d="M20 14 C16 28, 20 46, 32 50 C44 46, 48 28, 44 14 C36 18, 28 18, 20 14 Z" fill="none" stroke="#fbbf24" stroke-width="3.5"/>
        <line x1="27" y1="17" x2="27" y2="47" stroke="#fef08a" stroke-width="1.4"/>
        <line x1="32" y1="18" x2="32" y2="49" stroke="#fef08a" stroke-width="1.4"/>
        <line x1="37" y1="17" x2="37" y2="47" stroke="#fef08a" stroke-width="1.4"/>
      `;
    case 'shield':
      return `
        <path d="M32 10 L50 16 L50 32 C50 44, 42 51, 32 55 C22 51, 14 44, 14 32 L14 16 Z" fill="url(#blade)" stroke="#fbbf24" stroke-width="2.5"/>
        <path d="M32 16 L32 48 M20 28 L44 28" stroke="#fbbf24" stroke-width="2.5"/>
        <circle cx="32" cy="28" r="3.5" fill="${glow}"/>
      `;
    case 'orb':
      return `
        <circle cx="32" cy="30" r="15" fill="${glow}" opacity="0.85" stroke="#fbbf24" stroke-width="2"/>
        <circle cx="27" cy="25" r="5" fill="#fff" opacity="0.65"/>
        <path d="M20 46 L44 46 L38 52 L26 52 Z" fill="#fbbf24"/>
      `;
    case 'quiver':
      return `
        <polygon points="24,22 38,20 42,50 28,52" fill="#92400e" stroke="#fbbf24" stroke-width="1.5"/>
        <line x1="26" y1="22" x2="22" y2="12" stroke="#e2e8f0" stroke-width="2"/>
        <line x1="32" y1="21" x2="32" y2="10" stroke="#e2e8f0" stroke-width="2"/>
        <line x1="36" y1="21" x2="40" y2="12" stroke="#e2e8f0" stroke-width="2"/>
      `;
    case 'crown':
      return `
        <polygon points="12,44 16,20 26,30 32,16 38,30 48,20 52,44" fill="#fbbf24" stroke="#fef08a" stroke-width="1.8"/>
        <rect x="12" y="44" width="40" height="5" rx="2" fill="#d97706"/>
        <circle cx="32" cy="34" r="3" fill="${glow}"/>
      `;
    case 'helm':
      return `
        <path d="M18 38 L18 26 C18 16, 46 16, 46 26 L46 38 L40 48 L24 48 Z" fill="url(#blade)" stroke="#fbbf24" stroke-width="2"/>
        <path d="M24 32 L40 32 M32 24 L32 46" stroke="#0f172a" stroke-width="3"/>
        <path d="M18 26 L10 18 L14 30 M46 26 L54 18 L50 30" fill="#fbbf24"/>
      `;
    case 'armor':
      return `
        <path d="M18 16 L26 14 L32 20 L38 14 L46 16 L52 26 L44 30 L42 50 L22 50 L20 30 L12 26 Z" fill="url(#blade)" stroke="#fbbf24" stroke-width="2"/>
        <polygon points="32,24 37,32 32,42 27,32" fill="${glow}"/>
      `;
    case 'robe':
      return `
        <path d="M22 14 L32 18 L42 14 L52 28 L44 32 L46 52 L18 52 L20 32 L12 28 Z" fill="#312e81" stroke="#fbbf24" stroke-width="2"/>
        <line x1="32" y1="18" x2="32" y2="52" stroke="#fbbf24" stroke-width="2"/>
        <circle cx="32" cy="26" r="3" fill="${accent}"/>
      `;
    case 'gloves':
      return `
        <path d="M22 18 L42 18 L44 38 L38 50 L26 50 L20 38 Z" fill="url(#blade)" stroke="#fbbf24" stroke-width="2"/>
        <line x1="22" y1="36" x2="42" y2="36" stroke="#fbbf24" stroke-width="2.5"/>
      `;
    case 'boots':
      return `
        <path d="M24 14 L38 14 L38 38 L50 44 L50 50 L22 50 L22 38 Z" fill="url(#blade)" stroke="#fbbf24" stroke-width="2"/>
        <path d="M22 24 L14 18 L18 28" fill="#fbbf24"/>
      `;
    case 'ring':
      return `
        <circle cx="32" cy="36" r="13" fill="none" stroke="#fbbf24" stroke-width="4.5"/>
        <polygon points="32,14 40,22 32,26 24,22" fill="${glow}" stroke="#fff" stroke-width="1.2"/>
      `;
    case 'necklace':
      return `
        <path d="M18 14 C18 32, 46 32, 46 14" fill="none" stroke="#fbbf24" stroke-width="2.5" stroke-dasharray="3 2"/>
        <polygon points="32,26 40,38 32,50 24,38" fill="${glow}" stroke="#fbbf24" stroke-width="2"/>
        <circle cx="32" cy="38" r="2.5" fill="#fff"/>
      `;
    case 'earring':
      return `
        <circle cx="32" cy="18" r="5" fill="none" stroke="#fbbf24" stroke-width="2.5"/>
        <polygon points="32,24 38,40 32,50 26,40" fill="${glow}" stroke="#fbbf24" stroke-width="1.5"/>
      `;
    case 'belt':
      return `
        <rect x="10" y="26" width="44" height="12" rx="4" fill="#78350f" stroke="#fbbf24" stroke-width="2"/>
        <rect x="25" y="23" width="14" height="18" rx="3" fill="none" stroke="#fbbf24" stroke-width="3"/>
        <circle cx="32" cy="32" r="3" fill="${glow}"/>
      `;
    case 'wings':
      return `
        <path d="M32 36 C20 18, 8 14, 8 22 C8 34, 18 44, 28 48 Z" fill="url(#blade)" stroke="#fbbf24" stroke-width="1.5"/>
        <path d="M32 36 C44 18, 56 14, 56 22 C56 34, 46 44, 36 48 Z" fill="url(#blade)" stroke="#fbbf24" stroke-width="1.5"/>
        <circle cx="32" cy="32" r="4.5" fill="${glow}"/>
      `;
    case 'hp_potion':
      return `
        <rect x="27" y="10" width="10" height="6" rx="1.5" fill="#d97706"/>
        <path d="M26 16 L38 16 L38 22 L48 36 C50 44, 44 52, 32 52 C20 52, 14 44, 16 36 L26 22 Z" fill="#ef4444" stroke="#fca5a5" stroke-width="2"/>
        <path d="M20 38 C26 35, 38 41, 44 38 C46 44, 41 50, 32 50 C23 50, 18 44, 20 38 Z" fill="#b91c1c"/>
        <circle cx="26" cy="34" r="2.5" fill="#fff" opacity="0.75"/>
      `;
    case 'mp_potion':
      return `
        <rect x="27" y="10" width="10" height="6" rx="1.5" fill="#d97706"/>
        <path d="M26 16 L38 16 L38 22 L48 36 C50 44, 44 52, 32 52 C20 52, 14 44, 16 36 L26 22 Z" fill="#3b82f6" stroke="#93c5fd" stroke-width="2"/>
        <path d="M20 38 C26 35, 38 41, 44 38 C46 44, 41 50, 32 50 C23 50, 18 44, 20 38 Z" fill="#1d4ed8"/>
        <circle cx="26" cy="34" r="2.5" fill="#fff" opacity="0.75"/>
      `;
    case 'elixir':
      return `
        <polygon points="28,8 36,8 35,15 29,15" fill="#fbbf24"/>
        <path d="M26 15 L38 15 L36 22 L48 34 L42 52 L22 52 L16 34 L28 22 Z" fill="#a855f7" stroke="#fde047" stroke-width="2.2"/>
        <polygon points="32,26 36,34 44,35 38,41 39,49 32,45 25,49 26,41 20,35 28,34" fill="#fef08a"/>
      `;
    case 'scroll':
      return `
        <rect x="18" y="14" width="28" height="36" rx="3" fill="#fef3c7" stroke="#d97706" stroke-width="2"/>
        <rect x="14" y="12" width="36" height="5" rx="2.5" fill="#b45309"/>
        <rect x="14" y="47" width="36" height="5" rx="2.5" fill="#b45309"/>
        <circle cx="32" cy="32" r="5" fill="#ef4444"/>
        <path d="M23 23 L41 23 M23 41 L41 41" stroke="#92400e" stroke-width="2"/>
      `;
    case 'skillbook':
      return `
        <rect x="16" y="12" width="32" height="40" rx="3" fill="#1e3a8a" stroke="#fbbf24" stroke-width="2.2"/>
        <polygon points="32,20 35,28 43,28 37,33 39,41 32,36 25,41 27,33 21,28 29,28" fill="#fbbf24"/>
      `;
    case 'crystal':
      return `
        <polygon points="32,10 46,24 40,52 24,52 18,24" fill="${glow}" stroke="#fff" stroke-width="1.5"/>
        <polygon points="32,10 46,24 32,32 18,24" fill="#fff" opacity="0.45"/>
        <polygon points="14,32 22,28 24,48 16,46" fill="${accent}" opacity="0.8"/>
        <polygon points="50,32 42,28 40,48 48,46" fill="${accent}" opacity="0.8"/>
      `;
    case 'ore':
      return `
        <polygon points="14,44 20,22 36,16 50,28 46,48 24,50" fill="#475569" stroke="#94a3b8" stroke-width="1.8"/>
        <polygon points="26,24 36,20 38,32 28,34" fill="${glow}"/>
        <polygon points="34,36 44,32 42,44 32,44" fill="${accent}"/>
      `;
    case 'herb':
      return `
        <path d="M32 52 L32 24" stroke="#22c55e" stroke-width="3" stroke-linecap="round"/>
        <path d="M32 38 C20 36, 14 26, 20 18 C28 20, 32 28, 32 38 Z" fill="#4ade80"/>
        <path d="M32 34 C44 32, 50 22, 44 14 C36 16, 32 24, 32 34 Z" fill="#22c55e"/>
        <circle cx="32" cy="16" r="5" fill="${glow}"/>
      `;
    case 'fang':
      return `
        <path d="M22 14 C20 30, 28 44, 44 50 C40 36, 36 24, 34 14 Z" fill="#f8fafc" stroke="#94a3b8" stroke-width="2"/>
        <path d="M20 14 L36 14" stroke="#dc2626" stroke-width="4" stroke-linecap="round"/>
      `;
    case 'chest':
      return `
        <rect x="14" y="24" width="36" height="24" rx="3" fill="#92400e" stroke="#fbbf24" stroke-width="2.2"/>
        <path d="M14 26 C14 16, 50 16, 50 26 Z" fill="#b45309" stroke="#fbbf24" stroke-width="2.2"/>
        <rect x="28" y="24" width="8" height="10" rx="2" fill="#fbbf24"/>
      `;
    case 'key':
      return `
        <circle cx="22" cy="22" r="8" fill="none" stroke="#fbbf24" stroke-width="3.5"/>
        <line x1="28" y1="28" x2="48" y2="48" stroke="#fbbf24" stroke-width="3.5" stroke-linecap="round"/>
        <line x1="42" y1="42" x2="37" y2="47" stroke="#fbbf24" stroke-width="3" stroke-linecap="round"/>
        <line x1="47" y1="47" x2="42" y2="52" stroke="#fbbf24" stroke-width="3" stroke-linecap="round"/>
      `;
    case 'food':
      return `
        <path d="M20 26 C14 20, 22 12, 32 16 C42 20, 44 32, 36 38 L24 38 Z" fill="#b45309" stroke="#fcd34d" stroke-width="1.8"/>
        <line x1="36" y1="36" x2="48" y2="48" stroke="#f8fafc" stroke-width="4" stroke-linecap="round"/>
      `;
    case 'coin':
      return `
        <circle cx="32" cy="32" r="18" fill="#fbbf24" stroke="#fef08a" stroke-width="2.5"/>
        <circle cx="32" cy="32" r="13" fill="none" stroke="#b45309" stroke-width="1.5" stroke-dasharray="3 2"/>
        <polygon points="32,21 36,29 44,30 38,36 39,44 32,40 25,44 26,36 20,30 28,29" fill="#fef08a"/>
      `;
  }
}

const itemSvgCache = new Map<string, string>();

/**
 * Generates an instant-loading, multi-layered RPG Item Artwork SVG Data URI.
 * Preserves custom `item.imageUrl` whenever present (ignoring legacy dicebear shape placeholders).
 */
export function getItemImage(item: Partial<Item> | any): string {
  if (!item) return '';
  if (
    item.visualUrl &&
    typeof item.visualUrl === 'string' &&
    item.visualUrl.trim() &&
    !item.visualUrl.includes('api.dicebear.com/7.x/shapes')
  ) {
    return item.visualUrl.trim();
  }
  if (
    item.imageUrl &&
    typeof item.imageUrl === 'string' &&
    item.imageUrl.trim() &&
    !item.imageUrl.includes('api.dicebear.com/7.x/shapes')
  ) {
    return item.imageUrl.trim();
  }

  const rarity = item.rarity || ItemRarity.NORMAL;
  const kind = classifyRpgItemKind(item);
  const cacheKey = `${kind}__${rarity}`;

  const cached = itemSvgCache.get(cacheKey);
  if (cached) return cached;

  const pal = RARITY_PALETTES[rarity] || RARITY_PALETTES[ItemRarity.NORMAL];
  const artSvg = renderItemArtSvgBody(kind, pal.accent, pal.glow);

  const highTierFrame = pal.isHighTier
    ? `<circle cx="32" cy="32" r="24" fill="none" stroke="${pal.accent}" stroke-opacity="0.28" stroke-width="1" stroke-dasharray="4 3"/>
       <polygon points="32,3 35,7 29,7" fill="${pal.accent}" opacity="0.7"/>
       <polygon points="32,61 35,57 29,57" fill="${pal.accent}" opacity="0.7"/>`
    : '';

  const mythicBurst = pal.isMythic
    ? `<polygon points="32,8 39,25 56,32 39,39 32,56 25,39 8,32 25,25" fill="${pal.glow}" opacity="0.18"/>`
    : '';

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
    <defs>
      <radialGradient id="bg" cx="50%" cy="45%" r="60%">
        <stop offset="0%" stop-color="${pal.bgCenter}"/>
        <stop offset="100%" stop-color="${pal.bgEdge}"/>
      </radialGradient>
      <linearGradient id="blade" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#ffffff"/>
        <stop offset="45%" stop-color="${pal.accent}"/>
        <stop offset="100%" stop-color="#64748b"/>
      </linearGradient>
    </defs>
    <rect width="64" height="64" rx="12" fill="url(#bg)"/>
    <rect x="2" y="2" width="60" height="60" rx="10" fill="none" stroke="${pal.border}" stroke-opacity="0.75" stroke-width="2"/>
    ${highTierFrame}
    ${mythicBurst}
    ${artSvg}
  </svg>`;

  const dataUri = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  itemSvgCache.set(cacheKey, dataUri);
  return dataUri;
}

// ============================================================================
// 5. OPEN-SOURCE GAME-ICONS.NET (ICONIFY) SEARCH & EMBLEM COMPOSITOR
// ============================================================================
const KOREAN_TO_GAME_ICON_QUERY: Record<string, string> = {
  검: 'sword',
  대검: 'broadsword',
  쌍검: 'crossed-swords',
  단검: 'dagger',
  카타나: 'katana',
  도: 'katana',
  창: 'spear',
  폴암: 'halberd',
  낫: 'scythe',
  도끼: 'battle-axe',
  망치: 'warhammer',
  해머: 'hammer',
  활: 'bow-arrow',
  화살: 'arrow',
  석궁: 'crossbow',
  총: 'pistol-gun',
  지팡이: 'wizard-staff',
  마법봉: 'fairy-wand',
  마도서: 'spell-book',
  책: 'book-cover',
  권갑: 'mailed-fist',
  주먹: 'punch-blast',
  방패: 'shield',
  갑옷: 'breastplate',
  투구: 'visored-helm',
  왕관: 'crown',
  반지: 'ring',
  목걸이: 'emerald-necklace',
  포션: 'health-potion',
  물약: 'potion-ball',
  불: 'fire',
  화염: 'flame',
  용: 'dragon-head',
  드래곤: 'spiked-dragon-head',
  번개: 'lightning-storm',
  전격: 'lightning-tear',
  얼음: 'ice-spell-cast',
  빙결: 'snowflake-2',
  물: 'wave-strike',
  바람: 'whirlwind',
  폭풍: 'tornado',
  대지: 'earth-spit',
  운석: 'meteor-impact',
  메테오: 'burning-meteor',
  별: 'stars-stack',
  우주: 'galaxy',
  빛: 'sunbeams',
  신성: 'angel-wings',
  천사: 'angel-outfit',
  날개: 'wings',
  치유: 'healing',
  하트: 'heart-wings',
  성배: 'holy-grail',
  어둠: 'evil-moon',
  암흑: 'shadow-grasp',
  해골: 'crowned-skull',
  저주: 'death-skull',
  악마: 'daemon-skull',
  눈: 'eyeball',
  마법진: 'magic-swirl',
  룬: 'rune-stone',
  늑대: 'wolf-head',
  불사조: 'phoenix',
  폭발: 'explosion-rays',
  베기: 'sword-slice',
  참격: 'slashes',
};

export function translateKoreanIconQuery(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return 'sword';
  if (KOREAN_TO_GAME_ICON_QUERY[trimmed]) return KOREAN_TO_GAME_ICON_QUERY[trimmed];
  for (const [kor, eng] of Object.entries(KOREAN_TO_GAME_ICON_QUERY)) {
    if (trimmed.includes(kor)) return eng;
  }
  return trimmed;
}

export async function searchOpenSourceGameIcons(query: string, limit = 24): Promise<string[]> {
  const translated = translateKoreanIconQuery(query);
  try {
    const url = `https://api.iconify.design/search?query=${encodeURIComponent(translated)}&prefix=game-icons&limit=${limit}`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data?.icons) ? data.icons : [];
  } catch {
    return [];
  }
}

export async function fetchOpenSourceGameIconAsEmblemDataUri(
  iconFullName: string,
  colorHex = '#fbbf24',
  bgHex = '#0f172a'
): Promise<string | null> {
  try {
    const cleanName = iconFullName.replace(/^game-icons:/, '');
    const svgUrl = `https://api.iconify.design/game-icons/${encodeURIComponent(cleanName)}.svg?color=${encodeURIComponent(colorHex)}`;
    const res = await fetch(svgUrl);
    if (!res.ok) return null;
    const rawSvg = await res.text();
    // Extract inner path content from Iconify SVG
    const innerMatch = rawSvg.match(/<svg[^>]*>([\s\S]*?)<\/svg>/i);
    if (!innerMatch) return null;
    const innerPaths = innerMatch[1];

    const composedSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
      <defs>
        <radialGradient id="gbg" cx="50%" cy="45%" r="60%">
          <stop offset="0%" stop-color="${colorHex}" stop-opacity="0.32"/>
          <stop offset="100%" stop-color="${bgHex}"/>
        </radialGradient>
      </defs>
      <rect width="512" height="512" rx="96" fill="${bgHex}"/>
      <rect width="512" height="512" rx="96" fill="url(#gbg)"/>
      <rect x="14" y="14" width="484" height="484" rx="84" fill="none" stroke="${colorHex}" stroke-opacity="0.65" stroke-width="14"/>
      <g transform="translate(56, 56) scale(0.78)">
        ${innerPaths}
      </g>
    </svg>`;
    return `data:image/svg+xml;utf8,${encodeURIComponent(composedSvg)}`;
  } catch {
    return null;
  }
}

