
import { ItemRarity, SkillType, ClassTier } from './types';
import { ASIA_HUNT_THEMES, ASIA_MONSTER_IMAGE_MAP } from './asiamonsterfield';
import { EUROPE_HUNT_THEMES_MAPPED, EUROPE_MONSTER_IMAGE_MAP } from './europemonsterfield';
import { AMERICA_HUNT_THEMES_MAPPED, AMERICA_MONSTER_IMAGE_MAP } from './americamonsterfield';
import { AFRICA_HUNT_THEMES_MAPPED, AFRICA_MONSTER_IMAGE_MAP } from './africamonsterfield';
import { MAGYE_HUNT_THEMES_MAPPED, MAGYE_MONSTER_IMAGE_MAP } from './magyemonsterfield';
import { DIVINE_HUNT_THEMES_MAPPED, DIVINE_MONSTER_IMAGE_MAP } from './divinemonsterfield';
import { ELF_HUNT_THEMES, ELF_MONSTER_IMAGE_MAP } from './elfmonsterfield';
import { BEAST_HUNT_THEMES, BEAST_MONSTER_IMAGE_MAP } from './beastmonsterfield';
import { DEMON_HUNT_THEMES, DEMON_MONSTER_IMAGE_MAP } from './demonmonsterfield';
import { INSTANT_DUNGEON_BOSS_TEMPLATES } from './data/instantDungeonBoss';
import { INSTANT_DUNGEON_MONSTER_TEMPLATES } from './data/instantDungeonMonster';
import { getMonsterShinryokuType, MONSTER_SHINRYOKU_MAP } from './monsterShinryokuTable';
import { getRegisteredMonsterVisual } from './services/visualRegistry';

export { getMonsterShinryokuType, MONSTER_SHINRYOKU_MAP };

export interface HuntZoneInfo {
    id: string;
    name: string;
    levelRange: [number, number];
    difficulty: string;
    description: string;
}

export const HUNT_LEVEL_BANDS: HuntZoneInfo[] = [
    { id: 'beginner', name: '초보 구역', levelRange: [1, 10], difficulty: '하', description: '기초적인 신력을 익히기에 적합한 평화로운 장소입니다.' },
    { id: 'lower', name: '하급 필드', levelRange: [11, 30], difficulty: '중하', description: '어느 정도 공격성을 띤 생물들이 서식하기 시작합니다.' },
    { id: 'intermediate', name: '중급 필드', levelRange: [31, 60], difficulty: '중', description: '본격적인 마물들이 출몰하며 지형지물을 이용한 공격이 필요합니다.' },
    { id: 'advanced', name: '상급 필드', levelRange: [61, 100], difficulty: '중상', description: '지역의 위협적인 존재들이 모여있는 험난한 구역입니다.' },
    { id: 'elite', name: '엘리트 필드', levelRange: [101, 150], difficulty: '상', description: '인간의 영역을 벗어난 고위 마물들이 지배하고 있습니다.' },
    { id: 'disaster', name: '재앙 지대', levelRange: [151, 200], difficulty: '최상', description: '자연재해급 위력의 몬스터가 출몰하는 죽음의 땅입니다.' },
    { id: 'abyss', name: '심연 영역', levelRange: [201, 250], difficulty: '극한', description: '차원의 경계가 허물어진 어둠의 공간입니다.' },
    { id: 'mythic', name: '신화 영역', levelRange: [251, 300], difficulty: '초월', description: '고대의 신성이나 전설 속의 신비가 잠든 성역입니다.' },
    { id: 'devil', name: '악마 영역', levelRange: [301, 400], difficulty: '초월(惡)', description: '악마의 영역입니다.'},
    { id: 'divine', name: '신성 영역', levelRange: [401, 500], difficulty: '초월(神)', description: '신성한 영역입니다.'}
];

export const DIVINE_HUNT_LEVEL_BANDS: HuntZoneInfo[] = [
    { id: 'beginner', name: '신화 초입 성역', levelRange: [301, 400], difficulty: '신화 I', description: '신계의 가장 기초적인 신성 기운이 맴도는 초입 성역입니다.' },
    { id: 'lower', name: '성소 하급 영역', levelRange: [401, 450], difficulty: '신화 II', description: '신성한 생물들이 노니는 신계의 하급 성역입니다.' },
    { id: 'intermediate', name: '성소 중급 영역', levelRange: [451, 500], difficulty: '초월 I', description: '순수한 신력과 원소 마수들이 출몰하는 중급 성역입니다.' },
    { id: 'advanced', name: '성소 상급 성역', levelRange: [501, 550], difficulty: '초월 II', description: '신계를 수호하는 고위 수호자들과 성휘의 기사들이 지키는 성역입니다.' },
    { id: 'elite', name: '신성 엘리트 구역', levelRange: [551, 600], difficulty: '신성 I', description: '신의 사도와 대천사의 힘을 이어받은 정예 군단이 주둔합니다.' },
    { id: 'disaster', name: '신벌 재앙 지대', levelRange: [601, 700], difficulty: '신성 II', description: '신의 분노와 창조의 파동이 휘몰아치는 격전 구역입니다.' },
    { id: 'abyss', name: '신성 심연 영역', levelRange: [701, 800], difficulty: '극의 I', description: '공허와 심연의 정화자가 뒤엉킨 차원의 심층 경계선입니다.' },
    { id: 'mythic', name: '태초의 신화 성역', levelRange: [801, 900], difficulty: '극의 II', description: '세계를 창조한 기운과 태초의 형상이 잠든 최고위 성역입니다.' },
    { id: 'divine', name: '절대신성 영역', levelRange: [901, 1000], difficulty: '절대신', description: '신의 사자들의 분신과 절대신의 위엄이 깃든 궁극의 영역입니다.' }
];

export const MAGYE_HUNT_LEVEL_BANDS: HuntZoneInfo[] = [
    { id: 'beginner', name: '초보구역', levelRange: [400, 500], difficulty: '마계 I', description: '마계의 말초적인 악의와 하급 마수들이 들끓는 초보 구역입니다.' },
    { id: 'lower', name: '하급 필드', levelRange: [500, 550], difficulty: '마계 II', description: '굶주린 마수들과 타락한 마계 병사들이 배회하는 하급 필드입니다.' },
    { id: 'intermediate', name: '중급 필드', levelRange: [550, 600], difficulty: '초월 I', description: '심연의 마기와 악마적 전도사들이 주둔하는 중급 필드입니다.' },
    { id: 'advanced', name: '상급 필드', levelRange: [600, 650], difficulty: '초월 II', description: '고위 암흑 마법사와 타락 기사들이 지키는 험준한 상급 필드입니다.' },
    { id: 'elite', name: '엘리트필드', levelRange: [650, 700], difficulty: '악마 I', description: '마계 대장군과 공포의 집행자들이 군림하는 엘리트 필드입니다.' },
    { id: 'disaster', name: '재앙지대', levelRange: [700, 750], difficulty: '악마 II', description: '차원을 찢는 리바이어던과 멸망의 핵이 도사리는 파멸의 재앙지대입니다.' },
    { id: 'abyss', name: '심연영역', levelRange: [750, 800], difficulty: '심연 I', description: '공허의 파편과 베엘제붑의 그림자가 도사리는 칠흑의 심연영역입니다.' },
    { id: 'mythic', name: '신화영역', levelRange: [800, 900], difficulty: '심연 II', description: '제너럴들의 분신과 태초의 어둠 카오스가 잠든 최고위 신화영역입니다.' },
    { id: 'devil', name: '악마 영역', levelRange: [900, 1000], difficulty: '절대마', description: '마신 임페리얼의 분신과 마신의 환영이 군림하는 궁극의 악마 영역입니다.' }
];

export const isDivineLocation = (nation?: string, region?: string, city?: string): boolean => {
    if (region === '신계') return true;
    const divineKeys = ['신의 성소', '양의 기운의 성전', '음의 기운의 성전', '무의 궁'];
    if (nation && divineKeys.includes(nation)) return true;
    if (city && (divineKeys.includes(city) || city === '신의 거처')) return true;
    return false;
};

export const isMagyeLocation = (nation?: string, region?: string, city?: string): boolean => {
    if (region === '마계' || region === '아비살론') return true;
    if (nation && (nation === '임페리얼 제국' || nation === '네크로디움 제국' || nation.includes('마계'))) return true;
    if (city && ['눌바리온', '딜리리움', '노크티아', '엔드라실', '세라피엘 몰락지', '카르나쥬', '인페르노스', '네크로폴리스', '베놈가든', '크로노폴', '블러드문', '임페리얼', '말피스', '바르칸', '크림존'].includes(city)) return true;
    return false;
};

export const getHuntBandsForLocation = (nation?: string, region?: string, city?: string): HuntZoneInfo[] => {
    if (isDivineLocation(nation, region, city)) {
        return DIVINE_HUNT_LEVEL_BANDS;
    }
    if (isMagyeLocation(nation, region, city)) {
        return MAGYE_HUNT_LEVEL_BANDS;
    }
    return HUNT_LEVEL_BANDS;
};

export interface MonsterInfo {
    name: string;
    visualUrl?: string;
    shinryokuType?: string;
}

const INSTANT_DUNGEON_IMAGE_MAP: Record<string, string> = {};
INSTANT_DUNGEON_BOSS_TEMPLATES.forEach(b => {
    if (b.name && b.visualUrl) {
        INSTANT_DUNGEON_IMAGE_MAP[b.name] = b.visualUrl;
        const clean = b.name.replace(/\[.*?\]\s*/g, '').trim();
        INSTANT_DUNGEON_IMAGE_MAP[clean] = b.visualUrl;
    }
});
INSTANT_DUNGEON_MONSTER_TEMPLATES.forEach(m => {
    if (m.name && m.visualUrl) {
        INSTANT_DUNGEON_IMAGE_MAP[m.name] = m.visualUrl;
        const clean = m.name.replace(/\[.*?\]\s*/g, '').trim();
        INSTANT_DUNGEON_IMAGE_MAP[clean] = m.visualUrl;
    }
});

export const ALL_MONSTER_IMAGE_MAP: Record<string, string> = {
    ...ASIA_MONSTER_IMAGE_MAP,
    ...EUROPE_MONSTER_IMAGE_MAP,
    ...AMERICA_MONSTER_IMAGE_MAP,
    ...AFRICA_MONSTER_IMAGE_MAP,
    ...ELF_MONSTER_IMAGE_MAP,
    ...MAGYE_MONSTER_IMAGE_MAP,
    ...DIVINE_MONSTER_IMAGE_MAP,
    ...DEMON_MONSTER_IMAGE_MAP,
    ...BEAST_MONSTER_IMAGE_MAP,
    ...INSTANT_DUNGEON_IMAGE_MAP,
};

const resolveMonsterVisualUrl = (rawName: string): string => {
    // 0. 동적 비주얼 레지스트리 우선 확인
    const registered = getRegisteredMonsterVisual(rawName);
    if (registered) {
        return registered;
    }

    if (ALL_MONSTER_IMAGE_MAP[rawName]) {
        return ALL_MONSTER_IMAGE_MAP[rawName];
    }
    // [BOSS], [호위], [수호자], [경비병] 등의 태그 및 알파벳 접미사(A, B, C 등) 제거 후 재검색
    const stripped = rawName.replace(/\[.*?\]\s*/g, '').replace(/\s+[A-Z0-9]$/g, '').trim();
    if (ALL_MONSTER_IMAGE_MAP[stripped]) {
        return ALL_MONSTER_IMAGE_MAP[stripped];
    }
    // 단어 부분 일치 검색
    for (const [key, url] of Object.entries(ALL_MONSTER_IMAGE_MAP)) {
        if (stripped.includes(key) || key.includes(stripped)) {
            return url;
        }
    }
    return "https://i.ibb.co/Kz56VGDS/image.png";
};

export const getMonsterInfo = (monster?: string | MonsterInfo | null): MonsterInfo => {
    if (!monster) {
        return {
            name: '',
            visualUrl: 'https://i.ibb.co/Kz56VGDS/image.png',
            shinryokuType: '물리'
        };
    }
    if (typeof monster === 'string') {
        return {
            name: monster,
            visualUrl: resolveMonsterVisualUrl(monster),
            shinryokuType: getMonsterShinryokuType(monster)
        };
    }
    return {
        ...monster,
        visualUrl: monster.visualUrl || resolveMonsterVisualUrl(monster.name || ''),
        shinryokuType: monster.shinryokuType || getMonsterShinryokuType(monster.name || '')
    };
};

export const NATION_THEMES: Record<string, { fieldSuffix: string, monsters: Record<string, (string | MonsterInfo)[]> }> = {
    ...ASIA_HUNT_THEMES,
    ...EUROPE_HUNT_THEMES_MAPPED,
    ...AMERICA_HUNT_THEMES_MAPPED,
    ...AFRICA_HUNT_THEMES_MAPPED,
    ...MAGYE_HUNT_THEMES_MAPPED,
    ...DIVINE_HUNT_THEMES_MAPPED,
    ...ELF_HUNT_THEMES,
    ...BEAST_HUNT_THEMES,
    ...DEMON_HUNT_THEMES,
    "default": {
        fieldSuffix: "미개척지",
        monsters: {
            beginner: ["슬라임", "박쥐", "고블린 정찰병"],
            lower: ["고블린 전사", "오크", "들개"],
            intermediate: ["트롤", "그리폰", "미노타우로스"],
            advanced: ["키메라", "만티코어", "히드라"],
            elite: ["뱀파이어", "리치", "베헤모스"],
            disaster: ["드래곤", "거대 골렘", "재앙의 핵"],
            abyss: ["공허의 악마", "타락한 천사", "심연의 눈"],
            mythic: ["신화 속 존재", "고대의 신", "태초의 어둠"]
        }
    }
};

export const getMonsterPoolForBand = (
    theme: { fieldSuffix: string, monsters: Record<string, (string | MonsterInfo)[]> },
    bandId: string
): (string | MonsterInfo)[] => {
    if (theme && theme.monsters && theme.monsters[bandId] && theme.monsters[bandId].length > 0) {
        return theme.monsters[bandId];
    }
    if (bandId === 'devil' || bandId === 'divine') {
        if (theme?.monsters?.['mythic']?.length) return theme.monsters['mythic'];
        if (theme?.monsters?.['abyss']?.length) return theme.monsters['abyss'];
    }
    if (NATION_THEMES.default.monsters[bandId]?.length) {
        return NATION_THEMES.default.monsters[bandId];
    }
    const priority = ['mythic', 'abyss', 'disaster', 'elite', 'advanced', 'intermediate', 'lower', 'beginner'];
    for (const p of priority) {
        if (theme?.monsters?.[p]?.length) return theme.monsters[p];
    }
    for (const p of priority) {
        if (NATION_THEMES.default.monsters[p]?.length) return NATION_THEMES.default.monsters[p];
    }
    return ["슬라임", "고블린 정찰병"];
};
