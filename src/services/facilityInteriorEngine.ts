import { Character, Companion, CapturedMonster, FarmPlot, HouseBuilding, HouseType } from '../types';
import { FARM_CROPS, MINE_ZONES } from '../constants';
import { getHouseEffectiveCapacity } from '../utils';
import {
    BASE_TILE_SIZE,
    BaseFacilityNode,
    BaseFloorTileId,
    BaseResidentEntity,
    BaseFarmMonsterEntity
} from './baseTilemapEngine';
import { CityCultureKey, getHousingBuildingUrl, HousingBuildingPart, resolveCityCultureKey } from './cityAssetManifest';
import { resolveEntityRpgSprite } from './rpgSpriteManifest';
import { getCompanionRoutine } from './npcRoutineService';
import { getTimeOfDay } from './gameTimeService';

const isDispatchArrived = (m: any, curDate?: string, curTime?: string): boolean => {
    if (!m) return false;
    if (m.isCompleted || (typeof m.daysRemaining === 'number' && m.daysRemaining <= 0)) return true;
    if (!m.completionDate || !curDate) return false;
    return `${curDate} ${curTime || '00:00'}` >= `${m.completionDate} ${m.completionTime || '00:00'}`;
};

export type InteriorWallTheme =
    | 'stone_palace'
    | 'warm_wood'
    | 'cave_rock'
    | 'garden_fence'
    | 'arcane_stone'
    | 'sacred_marble'
    | 'obsidian_tech'
    | 'dojo_wood';

export type InteriorPropKind =
    | 'throne'
    | 'command_table'
    | 'blueprint_desk'
    | 'bed'
    | 'fireplace'
    | 'dining_table'
    | 'crate'
    | 'treasure_chest'
    | 'notice_board'
    | 'globe'
    | 'merchant_counter'
    | 'scale_desk'
    | 'crop_plot'
    | 'watering_well'
    | 'ore_vein'
    | 'minecart'
    | 'lantern_post'
    | 'cooking_hearth'
    | 'prep_counter'
    | 'forge_furnace'
    | 'anvil'
    | 'weapon_rack'
    | 'alchemy_cauldron'
    | 'potion_shelf'
    | 'arcane_core'
    | 'bookshelf'
    | 'transform_pod'
    | 'music_box'
    | 'vfx_prism'
    | 'training_dummy'
    | 'barbell_rack'
    | 'archery_target'
    | 'sparring_ring'
    | 'tactics_board'
    | 'training_post'
    | 'mana_focus_orb'
    | 'agility_hurdle'
    | 'shield_wall_dummy'
    | 'scroll_pedestal'
    | 'medal_banner'
    | 'job_monolith'
    | 'awakening_altar'
    | 'mana_pillar'
    | 'feed_trough'
    | 'school_desk'
    | 'chalkboard'
    | 'watchtower_ballista'
    | 'telescope'
    | 'star_globe'
    | 'transcend_altar'
    | 'shield_core'
    | 'element_pillar';

export interface InteriorPropNode {
    id: string;
    kind: InteriorPropKind;
    label: string;
    subLabel?: string;
    tileX: number;
    tileY: number;
    tileW: number;
    tileH: number;
    solid: boolean;
    interactive?: boolean;
    actionSubModal?: string;
    accentColor?: string;
    /** 농장 작물 등 동적 상태 */
    cropStage?: 'empty' | 'plowed' | 'growing' | 'ready';
    cropName?: string;
    plotIndex?: number;
    isWatered?: boolean;
    growthProgress?: number;
    /** 광산 구역 ID */
    mineZoneId?: string;
    /** 커스텀 스프라이트 키 또는 URL (작물/광맥/주택 외형 등) */
    spriteKey?: string;
    customSpriteUrl?: string;
    /** 숙소 단지 마당에서 입장할 주택 ID */
    houseId?: string;
}

export interface FacilityInteriorBlueprint {
    facilityType: string;
    title: string;
    sizeClass: 'small' | 'medium' | 'large';
    floorTile: BaseFloorTileId;
    accentFloorTile?: BaseFloorTileId;
    wallTheme: InteriorWallTheme;
    isOutdoor?: boolean;
    ambientColor: string;
    defaultSubModal?: string;
    primaryStation: {
        kind: InteriorPropKind;
        spriteKey?: string;
        label: string;
        subLabel: string;
        actionSubModal?: string;
    };
    secondaryStations?: Array<{
        kind: InteriorPropKind;
        spriteKey?: string;
        label: string;
        subLabel: string;
        actionSubModal?: string;
    }>;
    decorKinds: InteriorPropKind[];
}

export const FACILITY_INTERIOR_BLUEPRINTS: Record<string, FacilityInteriorBlueprint> = {
    hq: {
        facilityType: 'hq',
        title: '기지 본부 지휘실',
        sizeClass: 'large',
        floorTile: 'royal_marble',
        accentFloorTile: 'plaza',
        wallTheme: 'stone_palace',
        ambientColor: '#f59e0b',
        primaryStation: {
            kind: 'command_table',
            label: '중앙 전략 지휘탁',
            subLabel: '기지 통합 관리 · 증축 · 부지 현황'
        },
        secondaryStations: [
            {
                kind: 'blueprint_desk',
                label: '외형 개축 설계대',
                subLabel: '기지 본부 건축 양식 변경 및 개축'
            },
            {
                kind: 'throne',
                label: '영주 집무석',
                subLabel: '기지 총괄 현황 열기'
            }
        ],
        decorKinds: ['mana_pillar', 'bookshelf', 'weapon_rack']
    },
    housing: {
        facilityType: 'housing',
        title: '거주 숙소 홀',
        sizeClass: 'medium',
        floorTile: 'wood_deck',
        wallTheme: 'warm_wood',
        ambientColor: '#10b981',
        defaultSubModal: 'housing',
        primaryStation: {
            kind: 'dining_table',
            spriteKey: 'house_dining_table',
            label: '공용 휴식 테이블',
            subLabel: '숙소 배정 · 거주민 관리 열기',
            actionSubModal: 'housing'
        },
        secondaryStations: [
            {
                kind: 'fireplace',
                spriteKey: 'house_fireplace',
                label: '따뜻한 벽난로',
                subLabel: '거주민 피로 회복 공간',
                actionSubModal: 'housing'
            }
        ],
        decorKinds: ['bed', 'bookshelf']
    },
    storage: {
        facilityType: 'storage',
        title: '물자 보관 창고',
        sizeClass: 'small',
        floorTile: 'stone_road',
        wallTheme: 'warm_wood',
        ambientColor: '#d97706',
        defaultSubModal: 'storage',
        primaryStation: {
            kind: 'treasure_chest',
            label: '중앙 금고 · 물자 대장',
            subLabel: '창고 아이템 보관/인출 열기',
            actionSubModal: 'storage'
        },
        decorKinds: ['crate', 'treasure_chest']
    },
    dispatch: {
        facilityType: 'dispatch',
        title: '원정 파견 작전실',
        sizeClass: 'medium',
        floorTile: 'plaza',
        wallTheme: 'stone_palace',
        ambientColor: '#06b6d4',
        defaultSubModal: 'dispatch',
        primaryStation: {
            kind: 'notice_board',
            label: '파견 의뢰 게시판',
            subLabel: '동료 파견 임무 배정 · 수령',
            actionSubModal: 'dispatch'
        },
        secondaryStations: [
            {
                kind: 'globe',
                label: '대륙 작전 지구본',
                subLabel: '파견 현황 브리핑',
                actionSubModal: 'dispatch'
            }
        ],
        decorKinds: ['command_table', 'bookshelf']
    },
    trade_exchange: {
        facilityType: 'trade_exchange',
        title: '물자 교류 상단소',
        sizeClass: 'medium',
        floorTile: 'plaza',
        accentFloorTile: 'royal_marble',
        wallTheme: 'warm_wood',
        ambientColor: '#eab308',
        defaultSubModal: 'trade_exchange',
        primaryStation: {
            kind: 'merchant_counter',
            label: '상단 교역 카운터',
            subLabel: '기지 자원 매매 · 환전 열기',
            actionSubModal: 'trade_exchange'
        },
        secondaryStations: [
            {
                kind: 'scale_desk',
                label: '정밀 감정 저울',
                subLabel: '시세 확인 및 거래',
                actionSubModal: 'trade_exchange'
            }
        ],
        decorKinds: ['crate', 'treasure_chest']
    },
    farm: {
        facilityType: 'farm',
        title: '비옥한 기지 농장',
        sizeClass: 'large',
        floorTile: 'garden',
        accentFloorTile: 'dirt_road',
        wallTheme: 'garden_fence',
        isOutdoor: true,
        ambientColor: '#84cc16',
        defaultSubModal: 'farm',
        primaryStation: {
            kind: 'watering_well',
            label: '농장 관개 우물 · 관리소',
            subLabel: '작물 파종 · 수확 · 자동재배 설정',
            actionSubModal: 'farm'
        },
        decorKinds: ['crop_plot', 'crate']
    },
    mine: {
        facilityType: 'mine',
        title: '지하 자원 채굴 갱도',
        sizeClass: 'large',
        floorTile: 'dirt_road',
        accentFloorTile: 'stone_road',
        wallTheme: 'cave_rock',
        ambientColor: '#94a3b8',
        defaultSubModal: 'mine',
        primaryStation: {
            kind: 'minecart',
            label: '중앙 광산 수레 · 관리소',
            subLabel: '광산 채굴 · 특화 광맥 관리 열기',
            actionSubModal: 'mine'
        },
        decorKinds: ['ore_vein', 'lantern_post']
    },
    cooking: {
        facilityType: 'cooking',
        title: '기지 전문 주방',
        sizeClass: 'small',
        floorTile: 'wood_deck',
        wallTheme: 'warm_wood',
        ambientColor: '#fb923c',
        defaultSubModal: 'cooking',
        primaryStation: {
            kind: 'cooking_hearth',
            label: '대형 화덕 · 가마솥',
            subLabel: '요리 제작 · 대기열 관리 열기',
            actionSubModal: 'cooking'
        },
        secondaryStations: [
            {
                kind: 'prep_counter',
                label: '식재료 손질 조리대',
                subLabel: '보유 요리 도구 · 레시피 확인',
                actionSubModal: 'cooking'
            }
        ],
        decorKinds: ['dining_table', 'crate']
    },
    workshop: {
        facilityType: 'workshop',
        title: '대장간 · 장비 제작소',
        sizeClass: 'small',
        floorTile: 'stone_road',
        wallTheme: 'stone_palace',
        ambientColor: '#f97316',
        defaultSubModal: 'workshop',
        primaryStation: {
            kind: 'anvil',
            label: '장인의 모루',
            subLabel: '장비 제작 · 강화 · 분해 열기',
            actionSubModal: 'workshop'
        },
        secondaryStations: [
            {
                kind: 'forge_furnace',
                label: '작열하는 용광로',
                subLabel: '금속 제련 · 장비 제작',
                actionSubModal: 'workshop'
            }
        ],
        decorKinds: ['weapon_rack', 'crate']
    },
    alchemy: {
        facilityType: 'alchemy',
        title: '신비의 연금술 실험실',
        sizeClass: 'small',
        floorTile: 'magye_obsidian',
        accentFloorTile: 'plaza',
        wallTheme: 'arcane_stone',
        ambientColor: '#a855f7',
        defaultSubModal: 'alchemy',
        primaryStation: {
            kind: 'alchemy_cauldron',
            label: '비전 연금 가마솥',
            subLabel: '포션 · 영약 · 마석 조합 열기',
            actionSubModal: 'alchemy'
        },
        secondaryStations: [
            {
                kind: 'potion_shelf',
                label: '시약 · 약초 진열장',
                subLabel: '연금술 재료 및 제조법 확인',
                actionSubModal: 'alchemy'
            }
        ],
        decorKinds: ['bookshelf', 'mana_pillar']
    },
    lab: {
        facilityType: 'lab',
        title: '마법 · 스킬 종합 연구소',
        sizeClass: 'medium',
        floorTile: 'royal_marble',
        wallTheme: 'arcane_stone',
        ambientColor: '#38bdf8',
        defaultSubModal: 'lab',
        primaryStation: {
            kind: 'arcane_core',
            label: '중앙 마력 연구 코어',
            subLabel: '스킬 연구 · 한계 돌파 관리 열기',
            actionSubModal: 'lab'
        },
        decorKinds: ['bookshelf', 'mana_pillar']
    },
    custom_lab: {
        facilityType: 'custom_lab',
        title: '커스텀 외형 개조실',
        sizeClass: 'small',
        floorTile: 'magye_obsidian',
        wallTheme: 'obsidian_tech',
        ambientColor: '#ec4899',
        defaultSubModal: 'custom_lab',
        primaryStation: {
            kind: 'transform_pod',
            label: '외형 변환 · 승격 포드',
            subLabel: '외형 변환 및 커스텀 개체 승격',
            actionSubModal: 'custom_lab'
        },
        secondaryStations: [
            {
                kind: 'music_box',
                label: '등장 테마 오르골',
                subLabel: '등장 BGM 및 사운드 커스터마이징',
                actionSubModal: 'custom_lab'
            }
        ],
        decorKinds: ['mana_pillar', 'arcane_core']
    },
    skill_vfx_lab: {
        facilityType: 'skill_vfx_lab',
        title: '스킬 이펙트 커스텀 연구실',
        sizeClass: 'small',
        floorTile: 'magye_obsidian',
        wallTheme: 'obsidian_tech',
        ambientColor: '#8b5cf6',
        defaultSubModal: 'skill_vfx_lab',
        primaryStation: {
            kind: 'vfx_prism',
            label: '홀로그램 이펙트 투영기',
            subLabel: '스킬 VFX · 컷신 · 아이콘 개조',
            actionSubModal: 'skill_vfx_lab'
        },
        decorKinds: ['mana_pillar', 'arcane_core']
    },
    training_exp: {
        facilityType: 'training_exp',
        title: '경험 연병장',
        sizeClass: 'medium',
        floorTile: 'sand',
        wallTheme: 'garden_fence',
        isOutdoor: true,
        ambientColor: '#60a5fa',
        defaultSubModal: 'training_exp',
        primaryStation: {
            kind: 'tactics_board',
            label: '훈련 일정 교관대',
            subLabel: '경험치 집중 훈련 실행',
            actionSubModal: 'training_exp'
        },
        decorKinds: ['training_dummy', 'weapon_rack', 'training_post', 'medal_banner']
    },
    training_stat: {
        facilityType: 'training_stat',
        title: '기초 체력 단련장',
        sizeClass: 'medium',
        floorTile: 'stone_road',
        wallTheme: 'dojo_wood',
        ambientColor: '#f43f5e',
        defaultSubModal: 'training_stat',
        primaryStation: {
            kind: 'barbell_rack',
            label: '중량 단련 기구대',
            subLabel: '기초 스탯 집중 단련 실행',
            actionSubModal: 'training_stat'
        },
        decorKinds: ['barbell_rack', 'agility_hurdle', 'training_post', 'training_dummy']
    },
    training_mastery: {
        facilityType: 'training_mastery',
        title: '무기 숙련 도장',
        sizeClass: 'medium',
        floorTile: 'wood_deck',
        wallTheme: 'dojo_wood',
        ambientColor: '#fbbf24',
        defaultSubModal: 'training_mastery',
        primaryStation: {
            kind: 'weapon_rack',
            label: '명검 · 무기 거치대',
            subLabel: '무기 숙련도 집중 훈련 열기',
            actionSubModal: 'training_mastery'
        },
        decorKinds: ['archery_target', 'training_dummy', 'training_post', 'shield_wall_dummy']
    },
    combat_training: {
        facilityType: 'combat_training',
        title: '실전 전투 훈련소',
        sizeClass: 'medium',
        floorTile: 'sand',
        wallTheme: 'stone_palace',
        ambientColor: '#ec4899',
        defaultSubModal: 'combat_training',
        primaryStation: {
            kind: 'sparring_ring',
            label: '중앙 실전 훈련 링',
            subLabel: '비참여 동료 자동 성장 관리',
            actionSubModal: 'combat_training'
        },
        decorKinds: ['training_dummy', 'shield_wall_dummy', 'mana_focus_orb', 'medal_banner']
    },
    tactical_training: {
        facilityType: 'tactical_training',
        title: '전술 역할 훈련소',
        sizeClass: 'large',
        floorTile: 'plaza',
        wallTheme: 'stone_palace',
        ambientColor: '#8b5cf6',
        defaultSubModal: 'tactical_training',
        primaryStation: {
            kind: 'tactics_board',
            label: '딜러·탱커·서포터 전술 보드',
            subLabel: '전투 역할 숙련도 훈련 열기',
            actionSubModal: 'tactical_training'
        },
        decorKinds: ['scroll_pedestal', 'tactics_board', 'shield_wall_dummy', 'medal_banner']
    },
    sparring_arena: {
        facilityType: 'sparring_arena',
        title: '전술 모의 대련장',
        sizeClass: 'large',
        floorTile: 'sand',
        accentFloorTile: 'plaza',
        wallTheme: 'stone_palace',
        isOutdoor: true,
        ambientColor: '#ef4444',
        defaultSubModal: 'sparring_arena',
        primaryStation: {
            kind: 'sparring_ring',
            label: '원형 모의 대련장 중앙',
            subLabel: '동료와 실전 모의 대련 시작',
            actionSubModal: 'sparring_arena'
        },
        decorKinds: ['weapon_rack', 'training_dummy']
    },
    training_style: {
        facilityType: 'training_style',
        title: '전투 스타일 전직 도장',
        sizeClass: 'medium',
        floorTile: 'elf_moss',
        accentFloorTile: 'royal_marble',
        wallTheme: 'dojo_wood',
        ambientColor: '#14b8a6',
        defaultSubModal: 'training_style',
        primaryStation: {
            kind: 'job_monolith',
            label: '전직 계보 비석',
            subLabel: '1~4차 전직 트리 및 계열 승급',
            actionSubModal: 'training_style'
        },
        decorKinds: ['weapon_rack', 'mana_pillar']
    },
    potential_breakthrough: {
        facilityType: 'potential_breakthrough',
        title: '잠재력 돌파 성전',
        sizeClass: 'medium',
        floorTile: 'shingye_jade',
        wallTheme: 'sacred_marble',
        ambientColor: '#f59e0b',
        defaultSubModal: 'potential_breakthrough',
        primaryStation: {
            kind: 'awakening_altar',
            label: '한계 각성 제단',
            subLabel: '동료 클래스 잠재력 돌파 열기',
            actionSubModal: 'potential_breakthrough'
        },
        decorKinds: ['mana_pillar']
    },
    monster_farm: {
        facilityType: 'monster_farm',
        title: '몬스터 사육 목장',
        sizeClass: 'large',
        floorTile: 'default',
        accentFloorTile: 'flower_field',
        wallTheme: 'garden_fence',
        isOutdoor: true,
        ambientColor: '#22c55e',
        defaultSubModal: 'monster_farm',
        primaryStation: {
            kind: 'feed_trough',
            label: '몬스터 사료통 · 사육 관리소',
            subLabel: '포획 몬스터 먹이주기 · 진화 · 관리',
            actionSubModal: 'monster_farm'
        },
        decorKinds: ['crate', 'watering_well']
    },
    monster_arena: {
        facilityType: 'monster_arena',
        title: '몬스터 수련 투기장',
        sizeClass: 'large',
        floorTile: 'sand',
        wallTheme: 'stone_palace',
        isOutdoor: true,
        ambientColor: '#ef4444',
        defaultSubModal: 'monster_arena',
        primaryStation: {
            kind: 'sparring_ring',
            label: '야성 각성 투기장 링',
            subLabel: '몬스터 모의 대전 및 능력 훈련',
            actionSubModal: 'monster_arena'
        },
        decorKinds: ['weapon_rack', 'lantern_post']
    },
    child_academy: {
        facilityType: 'child_academy',
        title: '기지 유년 서당',
        sizeClass: 'medium',
        floorTile: 'wood_deck',
        wallTheme: 'dojo_wood',
        ambientColor: '#2dd4bf',
        defaultSubModal: 'child_academy',
        primaryStation: {
            kind: 'chalkboard',
            label: '서당 교단 · 칠판',
            subLabel: '아동 교육 · 담당 선생님 배정 열기',
            actionSubModal: 'child_academy'
        },
        decorKinds: ['school_desk', 'bookshelf']
    },
    defense: {
        facilityType: 'defense',
        title: '기지 방어 지휘 망루',
        sizeClass: 'medium',
        floorTile: 'stone_road',
        wallTheme: 'stone_palace',
        ambientColor: '#64748b',
        defaultSubModal: 'defense',
        primaryStation: {
            kind: 'watchtower_ballista',
            label: '방어 포탑 · 경계 콘솔',
            subLabel: '방어 시설 배치 · 기지 방어력 관리',
            actionSubModal: 'defense'
        },
        decorKinds: ['weapon_rack', 'lantern_post']
    },
    explorer_observatory: {
        facilityType: 'explorer_observatory',
        title: '비전 천문 관측소',
        sizeClass: 'medium',
        floorTile: 'magye_obsidian',
        accentFloorTile: 'royal_marble',
        wallTheme: 'arcane_stone',
        ambientColor: '#818cf8',
        defaultSubModal: 'explorer_observatory',
        primaryStation: {
            kind: 'telescope',
            label: '대형 마법 망원경',
            subLabel: '던전 시야 확장 · 정찰 현황 열기',
            actionSubModal: 'explorer_observatory'
        },
        secondaryStations: [
            {
                kind: 'star_globe',
                label: '성좌 투영 지구본',
                subLabel: '탐험 관측 보너스 확인',
                actionSubModal: 'explorer_observatory'
            }
        ],
        decorKinds: ['bookshelf', 'mana_pillar']
    },
    transcendence_sanctuary: {
        facilityType: 'transcendence_sanctuary',
        title: '초월의 성소',
        sizeClass: 'large',
        floorTile: 'shingye_jade',
        accentFloorTile: 'royal_marble',
        wallTheme: 'sacred_marble',
        ambientColor: '#facc15',
        defaultSubModal: 'transcendence_sanctuary',
        primaryStation: {
            kind: 'transcend_altar',
            label: '초월 해방 봉헌 제단',
            subLabel: '최대 레벨 상한 영구 해방 열기',
            actionSubModal: 'transcendence_sanctuary'
        },
        decorKinds: ['element_pillar', 'mana_pillar']
    },
    shinryoku_sanctuary: {
        facilityType: 'shinryoku_sanctuary',
        title: '신력 결계전',
        sizeClass: 'large',
        floorTile: 'shingye_jade',
        accentFloorTile: 'royal_marble',
        wallTheme: 'sacred_marble',
        ambientColor: '#fde047',
        defaultSubModal: 'shinryoku_sanctuary',
        primaryStation: {
            kind: 'shield_core',
            label: '신력 브레이크 결계 코어',
            subLabel: '아군 신력 실드 강화 및 칸수 확장',
            actionSubModal: 'shinryoku_sanctuary'
        },
        decorKinds: ['element_pillar', 'mana_pillar']
    }
};

export interface FacilityInteriorMapData {
    facilityNode: BaseFacilityNode;
    blueprint: FacilityInteriorBlueprint;
    cols: number;
    rows: number;
    cultureKey: CityCultureKey;
    floorTile: BaseFloorTileId;
    accentFloorTile?: BaseFloorTileId;
    props: InteriorPropNode[];
    solidSet: Set<string>;
    residents: BaseResidentEntity[];
    monsters: BaseFarmMonsterEntity[];
    spawnPos: { x: number; y: number };
    exitGate: { x: number; y: number; w: number; h: number };
}

export const getInteriorRoomDimensions = (
    sizeClass: 'small' | 'medium' | 'large',
    level: number
): { cols: number; rows: number } => {
    const lv = Math.max(1, Math.min(5, Math.floor(level || 1)));
    const growth = lv - 1;
    if (sizeClass === 'small') {
        return { cols: 14 + growth * 2, rows: 11 + growth };
    }
    if (sizeClass === 'medium') {
        return { cols: 18 + growth * 2, rows: 13 + growth * 2 };
    }
    return { cols: 22 + growth * 2, rows: 16 + growth * 2 };
};

export const generateFacilityInteriorMap = (
    character: Character,
    facilityNode: BaseFacilityNode,
    activeHouseId?: string
): FacilityInteriorMapData => {
    const base = character.base;
    const rawType = facilityNode.facilityType;
    const normalizedType =
        rawType === 'home' || rawType === 'my_home'
            ? 'housing'
            : rawType === 'monster_ranch'
            ? 'monster_farm'
            : rawType === 'training'
            ? 'training_exp'
            : rawType;

    const baseBlueprint = FACILITY_INTERIOR_BLUEPRINTS[normalizedType] || FACILITY_INTERIOR_BLUEPRINTS.hq;
    let blueprint = baseBlueprint;
    const level = Math.max(1, facilityNode.level || 1);

    // 숙소(housing)는 1단계 숙소 단지 마당(isHousingCourtyard) -> 2단계 개별 주택 내부(activeHouse)
    const houses = base?.houses || [];
    const isHousingCourtyard = normalizedType === 'housing' && !activeHouseId && houses.length > 0;
    const activeHouse: HouseBuilding | undefined =
        normalizedType === 'housing' && !isHousingCourtyard
            ? houses.find(h => h.id === activeHouseId) || houses[0]
            : undefined;

    const loc = base?.location || character.currentLocation || { region: '아시아', nation: '대한민국', city: '서울' };
    const cultureKey = resolveCityCultureKey(loc.region, loc.nation, loc.city);

    let { cols, rows } = getInteriorRoomDimensions(blueprint.sizeClass, level);
    if (isHousingCourtyard) {
        const perRow = Math.min(4, Math.max(2, houses.length));
        const rowCount = Math.max(1, Math.ceil(houses.length / perRow));
        cols = Math.max(18, perRow * 5 + 4);
        rows = Math.max(14, rowCount * 6 + 6);
        blueprint = {
            ...baseBlueprint,
            title: '기지 숙소 단지 (주택 선택 입장)',
            floorTile: 'plaza',
            accentFloorTile: 'stone_road',
            wallTheme: 'garden_fence',
            isOutdoor: true
        };
    } else if (normalizedType === 'housing' && activeHouse) {
        if (activeHouse.type === HouseType.LUXURY) {
            cols = 28;
            rows = 21;
            blueprint = { ...baseBlueprint, title: `${activeHouse.name} (초호화 저택)`, floorTile: 'royal_marble', wallTheme: 'sacred_marble' };
        } else if (activeHouse.type === HouseType.APARTMENT) {
            cols = 24;
            rows = 18;
            blueprint = { ...baseBlueprint, title: `${activeHouse.name} (대형 아파트)`, floorTile: 'plaza', wallTheme: 'stone_palace' };
        } else if (activeHouse.type === HouseType.VILLA) {
            cols = 20;
            rows = 15;
            blueprint = { ...baseBlueprint, title: `${activeHouse.name} (빌라)`, floorTile: 'plaza', wallTheme: 'warm_wood' };
        } else if (activeHouse.type === HouseType.HOUSE_2F) {
            cols = 17;
            rows = 13;
            blueprint = { ...baseBlueprint, title: `${activeHouse.name} (2층 주택)` };
        } else {
            cols = 14;
            rows = 11;
            blueprint = { ...baseBlueprint, title: activeHouse.name || baseBlueprint.title };
        }
    }
    const cx = Math.floor(cols / 2);
    const cy = Math.floor(rows / 2);

    const exitGate = { x: cx - 1, y: rows - 1, w: 3, h: 1 };
    const solidSet = new Set<string>();

    // 외곽 벽 충돌 설정 (남쪽 출입구 제외)
    for (let x = 0; x < cols; x++) {
        solidSet.add(`${x},0`);
        if (x < exitGate.x || x >= exitGate.x + exitGate.w) {
            solidSet.add(`${x},${rows - 1}`);
        }
    }
    for (let y = 0; y < rows; y++) {
        solidSet.add(`0,${y}`);
        solidSet.add(`${cols - 1},${y}`);
    }

    const props: InteriorPropNode[] = [];
    const bedPositions: { x: number; y: number }[] = [];
    const socialSpots: { x: number; y: number; bubble: string; dir?: 'left' | 'right' | 'down' | 'up' }[] = [];
    const allCompanionsForCap = [...(character.companions || []), ...(character.inactiveCompanions || [])].filter(
        c => c && !c.isDead && !c.isMonster
    );
    const occupyRect = (tx: number, ty: number, tw: number, th: number, isSolid: boolean) => {
        if (!isSolid) return;
        for (let y = ty; y < ty + th; y++) {
            for (let x = tx; x < tx + tw; x++) {
                solidSet.add(`${x},${y}`);
            }
        }
    };

    // 1. 중앙 핵심 상호작용 스테이션 (농장·광산은 좌상단, 숙소 단지 마당은 배치 생략)
    const primaryW = 2;
    const primaryH = 2;
    const primaryX = normalizedType === 'farm' || normalizedType === 'mine' ? 2 : cx - 1;
    const primaryY = normalizedType === 'farm' || normalizedType === 'mine' ? 2 : Math.max(3, cy - 2);
    if (!isHousingCourtyard) {
        let dynamicPrimarySub = blueprint.primaryStation.subLabel;
        if (normalizedType === 'cooking') {
            const jobCount = base?.cookingJobs?.length || 0;
            dynamicPrimarySub = jobCount > 0 ? `🍳 현재 조리 대기열 ${jobCount}건 진행 중` : blueprint.primaryStation.subLabel;
        } else if (normalizedType === 'dispatch') {
            const dispCount = base?.dispatched?.length || 0;
            dynamicPrimarySub = dispCount > 0 ? `🧭 현재 파견 진행 중 ${dispCount}팀` : blueprint.primaryStation.subLabel;
        } else if (normalizedType === 'transcendence_sanctuary') {
            const unlocks = base?.levelCapUnlockCount || 0;
            dynamicPrimarySub = `🌟 현재 누적 한계 해방 ${unlocks}회 (시설 Lv.${level})`;
        } else if (normalizedType === 'shinryoku_sanctuary') {
            const shieldLv = base?.shinryokuShieldLevel || 0;
            dynamicPrimarySub = `✨ 현재 아군 신력 결계 Lv.${shieldLv} (실드 +${shieldLv}칸)`;
        }

        props.push({
            id: `station_primary_${facilityNode.id}`,
            kind: blueprint.primaryStation.kind,
            spriteKey: blueprint.primaryStation.spriteKey,
            label: blueprint.primaryStation.label,
            subLabel: dynamicPrimarySub,
            tileX: primaryX,
            tileY: primaryY,
            tileW: primaryW,
            tileH: primaryH,
            solid: true,
            interactive: true,
            actionSubModal: blueprint.primaryStation.actionSubModal ?? blueprint.defaultSubModal,
            accentColor: blueprint.ambientColor
        });
        occupyRect(primaryX, primaryY, primaryW, primaryH, true);

        // 2. 보조 상호작용 스테이션
        (blueprint.secondaryStations || []).forEach((sec, idx) => {
            const sx = idx % 2 === 0 ? Math.max(2, primaryX - 4) : Math.min(cols - 4, primaryX + 4);
            const sy = Math.max(3, primaryY);
            props.push({
                id: `station_sec_${idx}`,
                kind: sec.kind,
                spriteKey: sec.spriteKey,
                label: sec.label,
                subLabel: sec.subLabel,
                tileX: sx,
                tileY: sy,
                tileW: 2,
                tileH: 1,
                solid: true,
                interactive: true,
                actionSubModal: sec.actionSubModal ?? blueprint.defaultSubModal,
                accentColor: blueprint.ambientColor
            });
            occupyRect(sx, sy, 2, 1, true);
        });
    }

    // 3. 시설별 실시간 데이터 기반 동적 오브젝트 배치
    if (normalizedType === 'farm') {
        const instId = facilityNode.instanceId || '';
        const savedPlots: FarmPlot[] = (base?.farmPlots && base.farmPlots[instId]) || [];
        const gridDim = level + 1;
        const totalPlotsCount = gridDim * gridDim;
        const plotW = 2;
        const plotH = gridDim >= 5 ? 1 : 2;
        const gapX = 1;
        const gapY = gridDim >= 5 ? 1 : 1;
        const totalGridW = gridDim * plotW + (gridDim - 1) * gapX;
        const startX = Math.max(5, Math.floor((cols - totalGridW) / 2));
        const startY = 3;

        for (let i = 0; i < totalPlotsCount; i++) {
            const gx = i % gridDim;
            const gy = Math.floor(i / gridDim);
            const px = Math.min(cols - 3, startX + gx * (plotW + gapX));
            const py = Math.min(rows - 3, startY + gy * (plotH + gapY));
            const plot = savedPlots[i];
            const status = plot?.status || 'empty';
            const progress = plot?.growthProgress || 0;
            const cropInfo = plot?.cropId ? FARM_CROPS.find(c => c.id === plot.cropId) : undefined;
            const cropStage: 'empty' | 'plowed' | 'growing' | 'ready' =
                status === 'ready' || (status === 'planted' && progress >= 100)
                    ? 'ready'
                    : status === 'planted'
                    ? 'growing'
                    : status === 'plowed'
                    ? 'plowed'
                    : 'empty';

            const resolveCropSpriteKey = (): string => {
                if (cropStage === 'empty') return 'farm_empty';
                if (cropStage === 'plowed') return 'farm_plowed';
                if (cropStage === 'growing') return progress < 40 ? 'farm_sprout' : 'farm_growing';
                const cid = plot?.cropId || '';
                if (cid === 'wheat' || cid === 'rice') return 'farm_ready_wheat';
                if (cid === 'corn') return 'farm_ready_corn';
                if (cid === 'potato' || cid === 'sweet_potato' || cid === 'carrot' || cid === 'onion' || cid === 'garlic')
                    return 'farm_ready_potato';
                if (cid === 'herb' || cid === 'lettuce' || cid === 'cabbage') return 'farm_ready_herb';
                if (cid === 'strawberry' || cid === 'tomato' || cid === 'watermelon') return 'farm_ready_strawberry';
                if (cid === 'grape') return 'farm_ready_grape';
                if (cid === 'golden_apple' || cid === 'world_tree_branch') return 'farm_ready_golden_apple';
                return 'farm_ready_magic';
            };

            props.push({
                id: `farm_plot_${i}`,
                kind: 'crop_plot',
                spriteKey: resolveCropSpriteKey(),
                label:
                    cropStage === 'ready'
                        ? `✨ ${cropInfo?.name || '작물'} (수확!)`
                        : cropStage === 'growing'
                        ? `🌱 ${cropInfo?.name || '작물'} (${Math.floor(progress)}%)`
                        : cropStage === 'plowed'
                        ? `🪓 개간됨 #${i + 1}`
                        : `황무지 #${i + 1}`,
                subLabel:
                    cropStage === 'ready'
                        ? '클릭하여 수확하기'
                        : cropStage === 'growing'
                        ? `성장 ${Math.floor(progress)}% · ${plot?.isWatered ? '💧물 공급됨' : '💧물 필요'}`
                        : cropStage === 'plowed'
                        ? '클릭하여 씨앗 뿌리기'
                        : '클릭하여 밭 갈기',
                tileX: px,
                tileY: py,
                tileW: plotW,
                tileH: plotH,
                solid: false,
                interactive: true,
                actionSubModal: 'farm',
                cropStage,
                cropName: cropInfo?.name,
                plotIndex: i,
                isWatered: Boolean(plot?.isWatered),
                growthProgress: progress
            });
        }
    } else if (normalizedType === 'storage') {
        const itemCount = base?.storage?.length || 0;
        const chestCount = Math.max(4, Math.min(16, 4 + Math.floor(itemCount / 5) + level));
        let cIdx = 0;
        for (let py = 2; py <= rows - 4 && cIdx < chestCount; py += 2) {
            for (let px = 2; px <= cols - 3 && cIdx < chestCount; px += 3) {
                if (px >= primaryX - 1 && px <= primaryX + 2 && py >= primaryY - 1 && py <= primaryY + 2) continue;
                props.push({
                    id: `storage_crate_${cIdx}`,
                    kind: cIdx % 3 === 0 ? 'treasure_chest' : 'crate',
                    label: cIdx % 3 === 0 ? '보관 보물함' : '보관 나무 상자',
                    subLabel: `현재 보관 물품 ${itemCount}종`,
                    tileX: px,
                    tileY: py,
                    tileW: 1,
                    tileH: 1,
                    solid: true,
                    interactive: true,
                    actionSubModal: 'storage'
                });
                occupyRect(px, py, 1, 1, true);
                cIdx++;
            }
        }
    } else if (normalizedType === 'mine') {
        // MINE_ZONES 전체 구역을 광산 갱도 맵 내부의 실제 광맥으로 배치!
        MINE_ZONES.forEach((zone, idx) => {
            const colSlot = idx % 3;
            const rowSlot = Math.floor(idx / 3);
            const px = Math.min(cols - 4, 3 + colSlot * 6);
            const py = Math.min(rows - 4, 3 + rowSlot * 4);
            const unlocked = level >= zone.minLevel;
            const veinKeys = [
                'mine_surface',
                'mine_iron',
                'mine_mana_stone',
                'mine_gold',
                'mine_mana_crystal',
                'mine_diamond',
                'mine_gem',
                'mine_holy_stone'
            ];
            const spriteKey =
                zone.id === 'surface'
                    ? 'mine_surface'
                    : zone.id === 'shallow'
                    ? 'mine_iron'
                    : zone.id === 'deep'
                    ? 'mine_mana_stone'
                    : zone.id === 'abyss'
                    ? 'mine_holy_stone'
                    : veinKeys[idx % veinKeys.length];
            props.push({
                id: `mine_zone_${zone.id}`,
                kind: 'ore_vein',
                spriteKey,
                label: unlocked ? `⛏️ ${zone.name}` : `🔒 ${zone.name} (Lv.${zone.minLevel})`,
                subLabel: (zone as any).description || zone.desc,
                tileX: px,
                tileY: py,
                tileW: 2,
                tileH: 2,
                solid: true,
                interactive: true,
                actionSubModal: 'mine',
                mineZoneId: zone.id,
                accentColor: unlocked ? '#38bdf8' : '#64748b'
            });
            occupyRect(px, py, 2, 2, true);
        });
        // 갱도 횃불 장식
        [
            { x: 2, y: 2 },
            { x: cols - 3, y: 2 },
            { x: 2, y: rows - 4 },
            { x: cols - 3, y: rows - 4 }
        ].forEach((lt, i) => {
            if (!solidSet.has(`${lt.x},${lt.y}`)) {
                props.push({
                    id: `mine_lantern_${i}`,
                    kind: 'lantern_post',
                    label: '갱도 횃불',
                    tileX: lt.x,
                    tileY: lt.y,
                    tileW: 1,
                    tileH: 1,
                    solid: true,
                    interactive: false
                });
                occupyRect(lt.x, lt.y, 1, 1, true);
            }
        });
    } else if (normalizedType === 'defense') {
        const defCount = Math.max(2, Math.min(10, (base?.defenseStructures?.length || 0) + 2));
        for (let i = 0; i < defCount; i++) {
            const dx = i % 2 === 0 ? 2 + Math.floor(i / 2) * 3 : cols - 3 - Math.floor(i / 2) * 3;
            const dy = i < 4 ? 2 : rows - 4;
            if (dx < 2 || dx >= cols - 2 || solidSet.has(`${dx},${dy}`)) continue;
            props.push({
                id: `def_turret_${i}`,
                kind: 'watchtower_ballista',
                label: '방어 발리스타 포탑',
                subLabel: '클릭하여 방어소 관리 열기',
                tileX: dx,
                tileY: dy,
                tileW: 1,
                tileH: 1,
                solid: true,
                interactive: true,
                actionSubModal: 'defense',
                accentColor: '#94a3b8'
            });
            occupyRect(dx, dy, 1, 1, true);
        }
    } else if (normalizedType === 'child_academy') {
        const traineeCount = Math.max(4, Math.min(12, (base?.childAcademyTrainees?.length || 0) + 4));
        let dIdx = 0;
        for (let py = Math.min(rows - 4, primaryY + 3); py <= rows - 3 && dIdx < traineeCount; py += 2) {
            for (let px = 3; px <= cols - 4 && dIdx < traineeCount; px += 3) {
                if (solidSet.has(`${px},${py}`)) continue;
                props.push({
                    id: `academy_desk_${dIdx}`,
                    kind: 'school_desk',
                    label: '서당 책상',
                    subLabel: '유년 서당 교육 관리 열기',
                    tileX: px,
                    tileY: py,
                    tileW: 1,
                    tileH: 1,
                    solid: true,
                    interactive: true,
                    actionSubModal: 'child_academy',
                    accentColor: '#2dd4bf'
                });
                occupyRect(px, py, 1, 1, true);
                dIdx++;
            }
        }
    } else if (isHousingCourtyard) {
        // 숙소 단지 마당: 보유한 모든 주택(나의 집~초호화 저택)을 나란히 정렬해 배치!
        const mapPart = (t: HouseType): HousingBuildingPart => {
            if (t === HouseType.MY_HOME) return 'house_my_home';
            if (t === HouseType.HOUSE_2F) return 'house_2f';
            if (t === HouseType.VILLA) return 'house_villa';
            if (t === HouseType.APARTMENT) return 'house_apartment';
            if (t === HouseType.LUXURY) return 'house_luxury';
            return 'house_1f';
        };
        const perRow = Math.min(4, Math.max(2, houses.length));
        const houseAssigns = base?.houseAssignments || {};
        houses.forEach((h, idx) => {
            const colIdx = idx % perRow;
            const rowIdx = Math.floor(idx / perRow);
            const hx = 2 + colIdx * 5;
            const hy = 3 + rowIdx * 6;
            const resCnt = Object.values(houseAssigns).filter(hid => hid === h.id).length;
            const effCap = getHouseEffectiveCapacity(h, allCompanionsForCap);
            props.push({
                id: `courtyard_house_${h.id}`,
                kind: 'bed',
                customSpriteUrl: getHousingBuildingUrl(cultureKey, mapPart(h.type)),
                houseId: h.id,
                label: `🏠 ${h.name} (${resCnt}/${effCap}명)`,
                subLabel: '클릭하여 이 숙소 내부로 들어가기',
                tileX: hx,
                tileY: hy,
                tileW: 3,
                tileH: 3,
                solid: true,
                interactive: true,
                accentColor: '#10b981'
            });
            occupyRect(hx, hy, 3, 3, true);
        });
    } else if (normalizedType === 'housing') {
        const hType = activeHouse?.type;
        const bedSpriteKey =
            hType === HouseType.LUXURY || hType === HouseType.MY_HOME || hType === HouseType.VILLA
                ? 'house_bed_king'
                : hType === HouseType.APARTMENT
                    ? 'house_bed_bunk'
                    : 'house_bed_single';

        // 중앙 카펫 (통과 가능)
        props.push({
            id: 'house_center_rug',
            kind: 'bed',
            spriteKey: 'house_rug',
            label: '거실 카펫',
            tileX: Math.max(2, cx - 1),
            tileY: Math.max(3, cy),
            tileW: 3,
            tileH: 2,
            solid: false,
            interactive: false
        });

        // 등급별 주요 생활 가구 배치
        const furniturePlan: Array<{
            id: string;
            spriteKey: string;
            label: string;
            x: number;
            y: number;
            w?: number;
            h?: number;
            bubble: string;
        }> = [
            { id: 'house_wardrobe', spriteKey: 'house_wardrobe', label: '오크 옷장', x: cols - 3, y: 1, w: 1, h: 1, bubble: '👔 옷 정리하는 중' },
            { id: 'house_sofa', spriteKey: 'house_sofa', label: '라운지 소파', x: Math.max(2, cx - 3), y: Math.max(3, cy), w: 2, h: 1, bubble: '🛋️ 소파에서 느긋하게 휴식 중' },
            { id: 'house_tea_table', spriteKey: 'house_tea_table', label: '티테이블', x: Math.min(cols - 3, cx + 2), y: Math.max(3, cy), w: 1, h: 1, bubble: '🍵 따뜻한 차 마시는 중' },
            { id: 'house_plant_l', spriteKey: 'house_potted_plant', label: '실내 화분', x: 1, y: rows - 3, w: 1, h: 1, bubble: '🪴 화분 돌보는 중' },
            { id: 'house_plant_r', spriteKey: 'house_potted_plant', label: '실내 화분', x: cols - 2, y: rows - 3, w: 1, h: 1, bubble: '🌿 공기 정화 식물 감상 중' }
        ];
        if (hType !== HouseType.HOUSE_1F) {
            furniturePlan.push({
                id: 'house_kitchen',
                spriteKey: 'house_kitchen_counter',
                label: '주방 조리대',
                x: cols - 4,
                y: Math.max(3, cy - 2),
                w: 2,
                h: 1,
                bubble: '🍳 간단한 야식 준비 중'
            });
        }
        if (hType === HouseType.VILLA || hType === HouseType.APARTMENT || hType === HouseType.LUXURY || hType === HouseType.MY_HOME) {
            furniturePlan.push({
                id: 'house_bathtub',
                spriteKey: 'house_bathtub',
                label: '고급 욕조',
                x: 1,
                y: Math.max(4, rows - 5),
                w: 2,
                h: 1,
                bubble: '🛁 따뜻한 물로 피로 푸는 중'
            });
        }

        furniturePlan.forEach(fp => {
            const fw = fp.w || 1;
            const fh = fp.h || 1;
            if (fp.x >= 1 && fp.y >= 1 && fp.x + fw < cols && fp.y + fh < rows - 1 && !solidSet.has(`${fp.x},${fp.y}`)) {
                props.push({
                    id: fp.id,
                    kind: 'bed',
                    spriteKey: fp.spriteKey,
                    label: fp.label,
                    tileX: fp.x,
                    tileY: fp.y,
                    tileW: fw,
                    tileH: fh,
                    solid: true,
                    interactive: false
                });
                occupyRect(fp.x, fp.y, fw, fh, true);
                const spotY = Math.min(rows - 3, fp.y + fh);
                if (!solidSet.has(`${fp.x},${spotY}`)) {
                    socialSpots.push({ x: fp.x, y: spotY, bubble: fp.bubble });
                }
            }
        });

        const effCap = activeHouse ? getHouseEffectiveCapacity(activeHouse, allCompanionsForCap) : 2 + level * 2;
        const bedCount = Math.max(2, Math.min(16, effCap));
        let bIdx = 0;
        for (let py = 2; py <= rows - 4 && bIdx < bedCount; py += 2) {
            for (let px = 2; px <= cols - 3 && bIdx < bedCount; px += 3) {
                if (px >= primaryX - 2 && px <= primaryX + 3 && py >= primaryY - 1 && py <= primaryY + 2) continue;
                if (solidSet.has(`${px},${py}`)) continue;
                props.push({
                    id: `house_bed_${bIdx}`,
                    kind: 'bed',
                    spriteKey: bedSpriteKey,
                    label: `${activeHouse?.name || '숙소'} 침대`,
                    subLabel: '숙소 관리 · 휴식 열기',
                    tileX: px,
                    tileY: py,
                    tileW: 1,
                    tileH: 1,
                    solid: true,
                    interactive: true,
                    actionSubModal: 'housing',
                    accentColor: '#10b981'
                });
                bedPositions.push({ x: px, y: py });
                occupyRect(px, py, 1, 1, true);
                bIdx++;
            }
        }
        if (activeHouse?.type === HouseType.LUXURY || activeHouse?.type === HouseType.APARTMENT) {
            [
                { x: 2, y: rows - 4 },
                { x: cols - 3, y: rows - 4 }
            ].forEach((pos, i) => {
                if (!solidSet.has(`${pos.x},${pos.y}`)) {
                    props.push({
                        id: `house_lux_decor_${i}`,
                        kind: activeHouse.type === HouseType.LUXURY ? 'element_pillar' : 'bookshelf',
                        label: activeHouse.type === HouseType.LUXURY ? '럭셔리 샹들리에 기둥' : '공용 서재',
                        tileX: pos.x,
                        tileY: pos.y,
                        tileW: 1,
                        tileH: 1,
                        solid: true,
                        interactive: false
                    });
                    occupyRect(pos.x, pos.y, 1, 1, true);
                }
            });
        }
    } else {
        // 일반 시설 & 훈련장·성소: 레벨에 비례해 좌우 벽면과 코너에 전용 소품 배치 (훈련장 소품은 직접 상호작용 가능)
        const isTrainingInteractive = normalizedType.startsWith('training_') || normalizedType === 'combat_training' || normalizedType === 'tactical_training' || normalizedType === 'sparring_arena';
        const decorSlots: Array<{ x: number; y: number }> = [
            { x: 2, y: 2 },
            { x: cols - 3, y: 2 },
            { x: 2, y: Math.max(4, cy) },
            { x: cols - 3, y: Math.max(4, cy) },
            { x: 4, y: 2 },
            { x: cols - 5, y: 2 },
            { x: 2, y: rows - 4 },
            { x: cols - 3, y: rows - 4 },
            { x: Math.max(3, cx - 4), y: rows - 4 },
            { x: Math.min(cols - 4, cx + 3), y: rows - 4 }
        ];
        const maxDecors = Math.min(decorSlots.length, 4 + level);
        for (let i = 0; i < maxDecors; i++) {
            const slot = decorSlots[i];
            if (
                slot.x >= primaryX - 1 &&
                slot.x <= primaryX + primaryW &&
                slot.y >= primaryY - 1 &&
                slot.y <= primaryY + primaryH
            ) {
                continue;
            }
            if (solidSet.has(`${slot.x},${slot.y}`)) continue;
            const dKind = blueprint.decorKinds[i % blueprint.decorKinds.length];
            props.push({
                id: `decor_${i}`,
                kind: dKind,
                label: isTrainingInteractive ? `${blueprint.title} 수련 기구` : blueprint.primaryStation.label,
                tileX: slot.x,
                tileY: slot.y,
                tileW: 1,
                tileH: 1,
                solid: true,
                interactive: isTrainingInteractive,
                actionSubModal: isTrainingInteractive ? blueprint.defaultSubModal : undefined,
                accentColor: blueprint.ambientColor
            });
            occupyRect(slot.x, slot.y, 1, 1, true);
        }
    }

    // 4. 담당 동료 / 거주민 실시간 스폰
    const allComps = [...(character.inactiveCompanions || []), ...(character.companions || [])];
    const isMonsterComp = (c: Companion) =>
        Boolean(c.isMonster || c.race === '몬스터' || c.monsterData || (c as any).isGuardian);

    const assignedList: Companion[] = [];
    const seen = new Set<string>();
    const pushComp = (c?: Companion) => {
        if (!c || seen.has(c.id) || isMonsterComp(c)) return;
        seen.add(c.id);
        assignedList.push(c);
    };

    const curHour = parseInt((character.currentTime || '12:00').split(':')[0], 10) || 12;
    const isWorkHours = curHour >= 9 && curHour < 18;
    const workingCompIds = new Set<string>();
    if (base?.assignments) {
        Object.entries(base.assignments).forEach(([k, cid]) => {
            if (cid && k !== 'housing' && !k.startsWith('housing_')) workingCompIds.add(cid);
        });
    }
    if (base?.multiAssignments) {
        Object.entries(base.multiAssignments).forEach(([k, arr]) => {
            if (k !== 'housing' && !k.startsWith('housing_') && Array.isArray(arr)) {
                arr.forEach(cid => workingCompIds.add(cid));
            }
        });
    }
    const combatTraineeIds = new Set<string>();
    if (base?.combatTraining) {
        Object.values(base.combatTraining).forEach((ct: any) => {
            (ct?.trainees || []).forEach((t: any) => {
                if (t?.companionId) {
                    combatTraineeIds.add(t.companionId);
                    workingCompIds.add(t.companionId);
                }
            });
        });
    }

    if (isHousingCourtyard) {
        const resIds = new Set(base?.residents || []);
        allComps.filter(c => resIds.has(c.id) || (c as any).isAssignedToBase).slice(0, 5).forEach(pushComp);
    } else if (normalizedType === 'housing' && activeHouse) {
        // 담당 하우스키퍼는 항상 숙소 관리 중으로 배치
        if (activeHouse.assignedHousekeeperId) {
            pushComp(allComps.find(c => c.id === activeHouse.assignedHousekeeperId));
        }
        const houseAssigns = base?.houseAssignments || {};
        const resIds = new Set(base?.residents || []);
        allComps.forEach(c => {
            if (c.id === activeHouse.assignedHousekeeperId) return;
            const livesHere =
                houseAssigns[c.id] === activeHouse.id ||
                (Object.keys(houseAssigns).length === 0 && resIds.has(c.id));
            if (!livesHere) return;
            // 일하는/훈련하는 시간대(09:00~17:59)에는 숙소에 없음
            if (isWorkHours) return;
            // 전투훈련소 등에 배치된 인원도 훈련 시간 중에는 숙소에서 제외
            if (combatTraineeIds.has(c.id) && curHour >= 6 && curHour < 22) return;
            pushComp(c);
        });
    } else if (normalizedType === 'hq') {
        const resIds = new Set(base?.residents || []);
        allComps.filter(c => resIds.has(c.id)).slice(0, 4).forEach(pushComp);
    } else if (normalizedType === 'dispatch') {
        if (base?.assignments) {
            if (facilityNode.instanceId) pushComp(allComps.find(c => c.id === base.assignments[facilityNode.instanceId!]));
            pushComp(allComps.find(c => c.id === base.assignments[rawType]));
        }
        if (base?.multiAssignments) {
            (base.multiAssignments[facilityNode.instanceId || ''] || []).forEach(id =>
                pushComp(allComps.find(c => c.id === id))
            );
            (base.multiAssignments[rawType] || []).forEach(id => pushComp(allComps.find(c => c.id === id)));
        }
        // 파견 현황에 도착(완료)한 인원이 있으면 파견소 내부에 스폰!
        (base?.dispatched || []).forEach((m: any) => {
            if (isDispatchArrived(m, character.currentDate, character.currentTime)) {
                if (m.companionId) pushComp(allComps.find(c => c.id === m.companionId));
                if (Array.isArray(m.teamMembers)) {
                    m.teamMembers.forEach((tm: any) => {
                        if (tm?.companionId) pushComp(allComps.find(c => c.id === tm.companionId));
                    });
                }
            }
        });
    } else {
        if (base?.assignments) {
            if (facilityNode.instanceId) pushComp(allComps.find(c => c.id === base.assignments[facilityNode.instanceId!]));
            pushComp(allComps.find(c => c.id === base.assignments[rawType]));
        }
        if (base?.multiAssignments) {
            (base.multiAssignments[facilityNode.instanceId || ''] || []).forEach(id =>
                pushComp(allComps.find(c => c.id === id))
            );
            (base.multiAssignments[rawType] || []).forEach(id => pushComp(allComps.find(c => c.id === id)));
        }
        // 전투훈련소·훈련소 계열은 combatTraining trainees도 함께 스폰!
        if (
            normalizedType === 'combat_training' ||
            normalizedType.startsWith('training_') ||
            normalizedType === 'tactical_training'
        ) {
            const instCt = facilityNode.instanceId ? base?.combatTraining?.[facilityNode.instanceId] : undefined;
            if (instCt?.trainees?.length) {
                instCt.trainees.forEach((t: any) => pushComp(allComps.find(c => c.id === t.companionId)));
            } else if (normalizedType === 'combat_training') {
                combatTraineeIds.forEach(cid => pushComp(allComps.find(c => c.id === cid)));
            }
        }
    }

    const timeOfDay = getTimeOfDay(character.currentTime || '12:00');
    const isSleepHours = curHour >= 22 || curHour < 6;
    const freeRestBubbles = [
        '🛋️ 여유롭게 휴식 중',
        '🍵 따뜻한 차 마시며 휴식 중',
        '📖 책 읽으며 쉬는 중',
        '🌿 창밖을 바라보는 중',
        '🎵 흥얼거리며 산책 중'
    ];
    const chatPairs: Array<[string, string]> = [
        ['💬 "오늘 임무 정말 수고했어!"', '💬 "고마워, 너도 푹 쉬어!"'],
        ['💬 "차 한 잔 더 마실래?"', '💬 "응, 향이 정말 좋네!"'],
        ['💬 "내일 던전 준비는 다 됐지?"', '💬 "물론이지, 믿고 맡겨!"'],
        ['💬 "기지가 점점 더 아늑해지네"', '💬 "맞아, 다들 열심히 한 덕분이지"']
    ];

    // 비취침 거주민이 방 전체에 골고루 퍼지도록 빈 타일 후보 수집
    const openFloorTiles: { x: number; y: number }[] = [];
    if (normalizedType === 'housing' && activeHouse) {
        for (let ty = 2; ty <= rows - 3; ty += 2) {
            for (let tx = 2; tx <= cols - 3; tx += 2) {
                if (!solidSet.has(`${tx},${ty}`)) {
                    openFloorTiles.push({ x: tx, y: ty });
                }
            }
        }
    }

    let sleeperIdx = 0;
    let freeIdx = 0;
    const residents: BaseResidentEntity[] = assignedList.map((comp, idx) => {
        const angle = (idx / Math.max(1, assignedList.length)) * Math.PI * 2;
        const rx = Math.max(2, Math.min(cols - 3, Math.round(cx + Math.cos(angle) * 3)));
        const ry = Math.max(3, Math.min(rows - 3, Math.round(cy + 1 + Math.sin(angle) * 2)));
        let px = (rx + 0.5) * BASE_TILE_SIZE;
        let py = (ry + 0.5) * BASE_TILE_SIZE;
        let initDir: 'down' | 'up' | 'left' | 'right' = 'down';
        const routine = getCompanionRoutine(character, comp.id);
        let role = comp.classType || '기지 거주민';
        const activeCraftMission = base?.dispatched?.find(d => d.companionId === comp.id);
        let activityBubble = (routine as any)?.activity || routine?.label || `${facilityNode.label} 근무 중`;
        if (activeCraftMission?.missionType === 'Blacksmithing') {
            activityBubble = '🔨 의뢰 제작 작업 중!';
        } else if (activeCraftMission?.missionType === 'AlchemyCrafting' || activeCraftMission?.missionType === 'Alchemy') {
            activityBubble = '⚗️ 의뢰 연금 작업 중!';
        } else if (
            combatTraineeIds.has(comp.id) &&
            (normalizedType === 'combat_training' || normalizedType.startsWith('training_') || normalizedType === 'tactical_training')
        ) {
            role = '훈련 배치 대원';
            activityBubble = '⚔️ 실전 집중 훈련 중!';
        } else if (normalizedType === 'dispatch') {
            const arrivedMission = (base?.dispatched || []).find((m: any) => {
                if (!m) return false;
                const matches = m.companionId === comp.id || (Array.isArray(m.teamMembers) && m.teamMembers.some((tm: any) => tm?.companionId === comp.id));
                return matches && isDispatchArrived(m, character.currentDate, character.currentTime);
            });
            if (arrivedMission) {
                role = '파견 복귀 대원';
                activityBubble = '📦 파견 도착 · 보고 대기 중!';
            }
        }
        let isSleeping = false;
        if (isHousingCourtyard) {
            const cAngle = (idx / Math.max(1, assignedList.length)) * Math.PI * 2;
            const crx = Math.max(2, Math.min(cols - 3, Math.round(cx + Math.cos(cAngle) * 5)));
            const cry = Math.max(3, Math.min(rows - 3, Math.round(cy + Math.sin(cAngle) * 4)));
            px = (crx + 0.5) * BASE_TILE_SIZE;
            py = (cry + 0.5) * BASE_TILE_SIZE;
            activityBubble = '🏡 숙소 단지 산책 중';
        } else if (normalizedType === 'housing' && activeHouse) {
            if (comp.id === activeHouse.assignedHousekeeperId) {
                role = '담당 하우스키퍼';
                px = Math.max(2, cx - 2) * BASE_TILE_SIZE + BASE_TILE_SIZE / 2;
                py = Math.max(3, cy - 1) * BASE_TILE_SIZE + BASE_TILE_SIZE / 2;
                activityBubble = isSleepHours
                    ? `🌙 ${activeHouse.name} 야간 점검·관리 중`
                    : `🧹 ${activeHouse.name} 청소·관리 중`;
            } else {
                role = `${activeHouse.name} 거주민`;
                if (isSleepHours && bedPositions.length > 0) {
                    const bed = bedPositions[sleeperIdx % bedPositions.length];
                    sleeperIdx++;
                    px = (bed.x + 0.5) * BASE_TILE_SIZE;
                    py = (bed.y + 0.35) * BASE_TILE_SIZE;
                    isSleeping = true;
                    activityBubble = '💤 침대에서 숙면 중';
                } else {
                    const fIdx = freeIdx++;
                    // 가구 주변 스팟 또는 넓은 방 구석구석 분산 배치 (일부는 2인 대화 페어)
                    if (fIdx < socialSpots.length) {
                        const spot = socialSpots[fIdx];
                        px = (spot.x + 0.5) * BASE_TILE_SIZE;
                        py = (spot.y + 0.5) * BASE_TILE_SIZE;
                        activityBubble = spot.bubble;
                    } else if (openFloorTiles.length > 0) {
                        const pairGroup = Math.floor((fIdx - socialSpots.length) / 2);
                        const isSecondInPair = (fIdx - socialSpots.length) % 2 === 1;
                        const tilePick = openFloorTiles[(pairGroup * 5) % openFloorTiles.length];
                        const pairOffset = isSecondInPair ? 1.15 : 0;
                        px = Math.min((cols - 2) * BASE_TILE_SIZE, (tilePick.x + 0.5 + pairOffset) * BASE_TILE_SIZE);
                        py = (tilePick.y + 0.5) * BASE_TILE_SIZE;
                        if (pairGroup % 2 === 0) {
                            const chat = chatPairs[pairGroup % chatPairs.length];
                            activityBubble = isSecondInPair ? chat[1] : chat[0];
                            initDir = isSecondInPair ? 'left' : 'right';
                        } else {
                            activityBubble = freeRestBubbles[fIdx % freeRestBubbles.length];
                        }
                    } else {
                        activityBubble = freeRestBubbles[fIdx % freeRestBubbles.length];
                    }
                }
            }
        }
        return {
            id: comp.id,
            name: comp.name,
            role,
            activityBubble,
            spriteUrl: resolveEntityRpgSprite(comp, loc.region, loc.nation).url,
            px,
            py,
            homePx: px,
            homePy: py,
            dir: initDir || (timeOfDay.period === 'night' ? 'down' : 'down'),
            walkFrame: 1,
            animTimer: 0,
            wanderTimer: 1 + (idx % 4) * 0.7,
            targetPx: null,
            targetPy: null,
            companionRef: comp,
            assignedFacilityLabel: facilityNode.label,
            isSleeping
        };
    });

    // 5. 몬스터 사육소 / 투기장인 경우 실제 포획 몬스터 스폰
    const monsters: BaseFarmMonsterEntity[] = [];
    if (normalizedType === 'monster_farm' || normalizedType === 'monster_arena') {
        const captured = base?.capturedMonsters || [];
        const monsterComps = allComps.filter(isMonsterComp);
        const combined: CapturedMonster[] = [
            ...captured,
            ...monsterComps.map(
                mc =>
                    ({
                        id: mc.id,
                        name: mc.name,
                        level: mc.level || 1,
                        hp: mc.stats?.hp || 100,
                        maxHp: mc.stats?.maxHp || 100,
                        stats: mc.stats,
                        visualUrl: mc.monsterData?.visualUrl || (mc as any).visualUrl || mc.appearance,
                        hunger: 100,
                        affection: mc.affection ?? 50,
                        rank: (mc.monsterData as any)?.rank
                    } as any)
            )
        ];
        const minPx = 2.5 * BASE_TILE_SIZE;
        const maxPx = (cols - 2.5) * BASE_TILE_SIZE;
        const minPy = 3 * BASE_TILE_SIZE;
        const maxPy = (rows - 3) * BASE_TILE_SIZE;
        combined.forEach((mon, idx) => {
            const px = minPx + (((idx * 37) % 100) / 100) * Math.max(BASE_TILE_SIZE, maxPx - minPx);
            const py = minPy + (((idx * 53) % 100) / 100) * Math.max(BASE_TILE_SIZE, maxPy - minPy);
            monsters.push({
                id: mon.id || `int_mon_${idx}`,
                name: mon.name || '사육 몬스터',
                level: mon.level || 1,
                rank: (mon as any).rank,
                hunger: mon.hunger ?? 100,
                affection: mon.affection ?? 50,
                visualUrl: mon.visualUrl,
                px,
                py,
                minPx,
                maxPx,
                minPy,
                maxPy,
                dir: idx % 2 === 0 ? 'right' : 'left',
                bobPhase: idx * 0.8,
                wanderTimer: 1.5 + (idx % 4) * 0.6,
                targetPx: null,
                targetPy: null,
                monsterRef: mon
            });
        });
    }

    return {
        facilityNode,
        blueprint,
        cols,
        rows,
        cultureKey,
        floorTile: blueprint.floorTile,
        accentFloorTile: blueprint.accentFloorTile,
        props,
        solidSet,
        residents,
        monsters,
        spawnPos: { x: cx, y: rows - 3 },
        exitGate
    };
};
