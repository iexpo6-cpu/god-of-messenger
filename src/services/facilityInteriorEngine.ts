import { Character, Companion, CapturedMonster, FarmPlot } from '../types';
import {
    BASE_TILE_SIZE,
    BaseFacilityNode,
    BaseFloorTileId,
    BaseResidentEntity,
    BaseFarmMonsterEntity
} from './baseTilemapEngine';
import { CityCultureKey, resolveCityCultureKey } from './cityAssetManifest';
import { resolveEntityRpgSprite } from './rpgSpriteManifest';
import { getCompanionRoutine } from './npcRoutineService';
import { getTimeOfDay } from './gameTimeService';

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
    cropStage?: 'empty' | 'growing' | 'ready';
    cropName?: string;
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
        label: string;
        subLabel: string;
        actionSubModal?: string;
    };
    secondaryStations?: Array<{
        kind: InteriorPropKind;
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
            label: '공용 휴식 테이블',
            subLabel: '숙소 배정 · 거주민 관리 열기',
            actionSubModal: 'housing'
        },
        secondaryStations: [
            {
                kind: 'fireplace',
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
        floorTile: 'default',
        accentFloorTile: 'flower_field',
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
        defaultSubModal: 'blacksmith',
        primaryStation: {
            kind: 'anvil',
            label: '장인의 모루',
            subLabel: '장비 제작 · 강화 · 분해 열기',
            actionSubModal: 'blacksmith'
        },
        secondaryStations: [
            {
                kind: 'forge_furnace',
                label: '작열하는 용광로',
                subLabel: '금속 제련 · 장비 제작',
                actionSubModal: 'blacksmith'
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
        decorKinds: ['training_dummy', 'weapon_rack']
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
        decorKinds: ['barbell_rack', 'training_dummy']
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
        decorKinds: ['archery_target', 'training_dummy']
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
        decorKinds: ['training_dummy', 'weapon_rack']
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
        decorKinds: ['training_dummy', 'weapon_rack', 'command_table']
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
    facilityNode: BaseFacilityNode
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

    const blueprint = FACILITY_INTERIOR_BLUEPRINTS[normalizedType] || FACILITY_INTERIOR_BLUEPRINTS.hq;
    const level = Math.max(1, facilityNode.level || 1);
    const { cols, rows } = getInteriorRoomDimensions(blueprint.sizeClass, level);
    const cx = Math.floor(cols / 2);
    const cy = Math.floor(rows / 2);

    const loc = base?.location || character.currentLocation || { region: '아시아', nation: '대한민국', city: '서울' };
    const cultureKey = resolveCityCultureKey(loc.region, loc.nation, loc.city);

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
    const occupyRect = (tx: number, ty: number, tw: number, th: number, isSolid: boolean) => {
        if (!isSolid) return;
        for (let y = ty; y < ty + th; y++) {
            for (let x = tx; x < tx + tw; x++) {
                solidSet.add(`${x},${y}`);
            }
        }
    };

    // 1. 중앙 핵심 상호작용 스테이션
    const primaryW = 2;
    const primaryH = 2;
    const primaryX = cx - 1;
    const primaryY = Math.max(3, cy - 2);
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

    // 3. 시설별 실시간 데이터 기반 동적 오브젝트 배치
    if (normalizedType === 'farm') {
        const instId = facilityNode.instanceId || '';
        const plots: FarmPlot[] = (base?.farmPlots && base.farmPlots[instId]) || [];
        const plotCount = Math.max(6, Math.min(18, plots.length || 6 + level * 2));
        let pIdx = 0;
        for (let py = 3; py <= rows - 4 && pIdx < plotCount; py += 2) {
            for (let px = 2; px <= cols - 4 && pIdx < plotCount; px += 3) {
                if (px >= primaryX - 1 && px <= primaryX + 2 && py >= primaryY - 1 && py <= primaryY + 2) continue;
                const plot = plots[pIdx];
                const cropStage: 'empty' | 'growing' | 'ready' = !plot?.cropId
                    ? 'empty'
                    : plot.isReady || (plot.progress ?? 0) >= 100
                    ? 'ready'
                    : 'growing';
                props.push({
                    id: `farm_plot_${pIdx}`,
                    kind: 'crop_plot',
                    label: plot?.cropName ? `${plot.cropName} 밭` : '빈 경작지',
                    subLabel:
                        cropStage === 'ready'
                            ? '✨ 수확 가능! (클릭하여 농장 관리)'
                            : cropStage === 'growing'
                            ? `🌱 재배 중 (${Math.floor(plot?.progress || 0)}%)`
                            : '씨앗 파종 대기 중',
                    tileX: px,
                    tileY: py,
                    tileW: 2,
                    tileH: 1,
                    solid: false,
                    interactive: true,
                    actionSubModal: 'farm',
                    cropStage,
                    cropName: plot?.cropName
                });
                pIdx++;
            }
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
        const spec = (base?.mineSpecializations && base.mineSpecializations[facilityNode.instanceId || '']) || '일반 광맥';
        const veinCount = Math.min(14, 5 + level * 2);
        let vIdx = 0;
        for (let py = 2; py <= rows - 4 && vIdx < veinCount; py += 3) {
            for (let px = 2; px <= cols - 3 && vIdx < veinCount; px += 4) {
                if (px >= primaryX - 1 && px <= primaryX + 2 && py >= primaryY - 1 && py <= primaryY + 2) continue;
                const isLantern = vIdx % 3 === 2;
                props.push({
                    id: `mine_node_${vIdx}`,
                    kind: isLantern ? 'lantern_post' : 'ore_vein',
                    label: isLantern ? '갱도 횃불' : `${spec} 광맥`,
                    subLabel: isLantern ? undefined : '클릭하여 채굴 관리 열기',
                    tileX: px,
                    tileY: py,
                    tileW: 1,
                    tileH: 1,
                    solid: true,
                    interactive: !isLantern,
                    actionSubModal: !isLantern ? 'mine' : undefined,
                    accentColor: '#38bdf8'
                });
                occupyRect(px, py, 1, 1, true);
                vIdx++;
            }
        }
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

    if (normalizedType === 'housing') {
        const resIds = new Set(base?.residents || []);
        allComps.forEach(c => {
            if (resIds.has(c.id) || c.isAssignedToBase) pushComp(c);
        });
    } else if (normalizedType === 'hq') {
        const resIds = new Set(base?.residents || []);
        allComps.filter(c => resIds.has(c.id)).slice(0, 4).forEach(pushComp);
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
    }

    const timeOfDay = getTimeOfDay(character.currentTime || '12:00');
    const residents: BaseResidentEntity[] = assignedList.map((comp, idx) => {
        const angle = (idx / Math.max(1, assignedList.length)) * Math.PI * 2;
        const rx = Math.max(2, Math.min(cols - 3, Math.round(cx + Math.cos(angle) * 3)));
        const ry = Math.max(3, Math.min(rows - 3, Math.round(cy + 1 + Math.sin(angle) * 2)));
        const px = (rx + 0.5) * BASE_TILE_SIZE;
        const py = (ry + 0.5) * BASE_TILE_SIZE;
        const routine = getCompanionRoutine(character, comp.id);
        return {
            id: comp.id,
            name: comp.name,
            role: comp.classType || '기지 거주민',
            activityBubble: routine?.activity || `${facilityNode.label} 근무 중`,
            spriteUrl: resolveEntityRpgSprite(comp, loc.region, loc.nation).url,
            px,
            py,
            homePx: px,
            homePy: py,
            dir: timeOfDay === 'night' ? 'down' : 'down',
            walkFrame: 1,
            animTimer: 0,
            wanderTimer: 1 + (idx % 4) * 0.7,
            targetPx: null,
            targetPy: null,
            companionRef: comp,
            assignedFacilityLabel: facilityNode.label
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
