import { Character, DiplomaticStatus, Enemy, Quest } from '../types';
import { getMonsterInfo, NATION_THEMES, HUNT_LEVEL_BANDS } from '../monsterfield';
import { generateEnemyStats } from '../utils';
import { CityMapData, CityNpcEntity, CityPortalNode, CITY_TILE_SIZE } from './cityTilemapEngine';
import { getRpgSpriteUrlByKey, mapRegionToSpriteKey, pickRoleMatchedNpcSpriteKey, resolveEntityRpgSprite, RpgSpriteGenderKey, RpgSpriteRegionKey } from './rpgSpriteManifest';

export interface ClassifiedCityQuests {
    emergencyQuests: Quest[];
    escortQuests: Quest[];
    instructorQuests: Quest[];
    combatAndHuntQuests: Quest[];
    dungeonQuests: Quest[];
    factionOpsQuests: Quest[];
    allActiveQuests: Quest[];
    expiredMessages: string[];
    isWarState: boolean;
    occupation: number;
}

export interface CityQuestMonsterEntity {
    id: string;
    quest: Quest;
    name: string;
    visualUrl?: string;
    spriteUrl: string;
    regionKey: RpgSpriteRegionKey;
    genderKey: RpgSpriteGenderKey;
    px: number;
    py: number;
    homeX: number;
    homeY: number;
    targetX: number;
    targetY: number;
    dir: 'down' | 'left' | 'right' | 'up';
    stepPhase: number;
    waitTicks: number;
    isBoss: boolean;
}

export interface CityQuestNpcEntity extends CityNpcEntity {
    questId?: string;
    questKind: 'escort_wait' | 'instructor' | 'hunt_board' | 'dungeon_guide' | 'war_officer';
    quest?: Quest;
    badgeText: string;
    badgeColor: string;
    spriteUrl?: string;
}

export interface CityQuestFollower {
    id: string;
    name: string;
    questId: string;
    destinationCity: string;
    regionKey: RpgSpriteRegionKey;
    genderKey: RpgSpriteGenderKey;
    spriteUrl: string;
}

export const getEscortTargetName = (quest: Quest): string => {
    if (quest.type === 'EscortKing') return '국왕 폐하';
    if (quest.type === 'EscortNoble') return '귀족 의뢰인';
    if (quest.type === 'MercenaryEscort') return '상단 호송대';
    if (quest.type === 'MilitaryDiplomaticEscort') return '외교 사절단';
    return '군사 호송 물류대';
};

export const buildRegionalDefenseEnemies = (
    quest: Quest,
    character: Character,
    loc: { nation: string; city: string; region?: string }
): { enemies: Enemy[]; battleType: 'military_regional_defense' | 'emergency_rescue' } => {
    const avgLevel = quest.level || character.level;
    const enemies: Enemy[] = [];
    const enemyCount = 3 + Math.floor(Math.random() * 3);

    const questNation = quest.location?.nation || quest.destination?.nation || loc.nation;
    const theme = NATION_THEMES[questNation] || NATION_THEMES[loc.nation] || NATION_THEMES['default'];
    const band = HUNT_LEVEL_BANDS.find(b => avgLevel >= b.levelRange[0] && avgLevel <= b.levelRange[1]) || HUNT_LEVEL_BANDS[0];
    const monsterPool = theme.monsters[band.id] || theme.monsters['beginner'];

    const defaultMonsterNameOrInfo = monsterPool[Math.floor(Math.random() * monsterPool.length)];
    const baseMonsterName =
        quest.targetName ||
        (typeof defaultMonsterNameOrInfo === 'string' ? defaultMonsterNameOrInfo : defaultMonsterNameOrInfo.name);
    const monsterInfo = getMonsterInfo(baseMonsterName);

    for (let i = 0; i < enemyCount; i++) {
        const stats = generateEnemyStats(avgLevel, 'normal');
        enemies.push({
            name: `${baseMonsterName} ${String.fromCharCode(65 + i)}`,
            level: avgLevel,
            hp: stats.maxHp,
            maxHp: stats.maxHp,
            stats,
            statusEffects: [],
            visualUrl: monsterInfo.visualUrl,
            shinryokuType: '무속성'
        });
    }

    const eliteBandIdx = Math.min(HUNT_LEVEL_BANDS.indexOf(band) + 1, HUNT_LEVEL_BANDS.length - 1);
    const eliteBand = HUNT_LEVEL_BANDS[eliteBandIdx];
    const elitePool = theme.monsters[eliteBand.id] || monsterPool;
    const defaultBossNameOrInfo = elitePool[Math.floor(Math.random() * elitePool.length)];
    const bossName = quest.targetName
        ? `${quest.targetName} 우두머리`
        : typeof defaultBossNameOrInfo === 'string'
        ? defaultBossNameOrInfo
        : defaultBossNameOrInfo.name;
    const bossInfo = getMonsterInfo(bossName);

    const bossStats = generateEnemyStats(avgLevel + 5, 'elite');
    enemies.push({
        name: `${bossName} (대장)`,
        level: avgLevel + 5,
        hp: bossStats.maxHp,
        maxHp: bossStats.maxHp,
        stats: bossStats,
        statusEffects: [],
        visualUrl: bossInfo.visualUrl,
        shinryokuType: '무기강화계'
    });

    const battleType = quest.type === 'MilitaryRegionalDefense' ? 'military_regional_defense' : 'emergency_rescue';
    return { enemies, battleType };
};

export const startEscortQuestState = (
    character: Character,
    questId: string
): { updatedChar: Character; quest: Quest; targetName: string } | null => {
    const newChar: Character = {
        ...character,
        militaryData: character.militaryData
            ? { ...character.militaryData, activeMissions: [...(character.militaryData.activeMissions || [])] }
            : undefined,
        mercenaryData: character.mercenaryData
            ? { ...character.mercenaryData, activeQuests: [...(character.mercenaryData.activeQuests || [])] }
            : undefined
    };

    let startedQuest: Quest | null = null;
    if (newChar.militaryData?.activeMissions) {
        const idx = newChar.militaryData.activeMissions.findIndex(q => q.id === questId);
        if (idx !== -1) {
            startedQuest = { ...newChar.militaryData.activeMissions[idx], isEscortStarted: true };
            newChar.militaryData.activeMissions[idx] = startedQuest;
        }
    }

    if (!startedQuest && newChar.mercenaryData?.activeQuests) {
        const idx = newChar.mercenaryData.activeQuests.findIndex(q => q.id === questId);
        if (idx !== -1) {
            startedQuest = { ...newChar.mercenaryData.activeQuests[idx], isEscortStarted: true };
            newChar.mercenaryData.activeQuests[idx] = startedQuest;
        }
    }

    if (!startedQuest) return null;
    return { updatedChar: newChar, quest: startedQuest, targetName: getEscortTargetName(startedQuest) };
};

export const clearExpiredQuestNotificationsState = (character: Character): Character => {
    const newChar: Character = { ...character };
    if (newChar.mercenaryData) {
        newChar.mercenaryData = { ...newChar.mercenaryData, expiredQuestNotifications: [] };
    }
    if (newChar.militaryData) {
        newChar.militaryData = { ...newChar.militaryData, expiredMissionNotifications: [] };
    }
    return newChar;
};

const isQuestCityMatch = (q: Quest, city: string): boolean => {
    if (q.location?.city) return q.location.city === city;
    if (q.destination?.city) return q.destination.city === city;
    if (q.type === 'MilitaryRegionalDefense' && q.targetName) return q.targetName === city;
    if (q.schoolName && q.schoolName.includes(city)) return true;
    if (q.title && q.title.includes(city)) return true;
    if (q.details && q.details.includes(city)) return true;
    if (q.goal && q.goal.includes(city)) return true;
    return false;
};

export const classifyActiveCityQuests = (
    character: Character,
    city: string,
    nation: string
): ClassifiedCityQuests => {
    const mercQuests = character.mercenaryData?.activeQuests || [];
    const milMissions = character.militaryData?.activeMissions || [];
    const allActiveQuests = [...mercQuests, ...milMissions];

    const emergencyQuests = allActiveQuests.filter(
        q => (q.isEmergency || q.type === 'MilitaryRegionalDefense') && isQuestCityMatch(q, city)
    );

    const escortQuests = allActiveQuests.filter(
        q =>
            q.type === 'MercenaryEscort' ||
            q.type === 'MilitaryEscort' ||
            q.type === 'MilitaryDiplomaticEscort' ||
            q.type === 'EscortNoble' ||
            q.type === 'EscortKing'
    );

    const instructorQuests = allActiveQuests.filter(
        q => q.type === 'TemporaryInstructor' && isQuestCityMatch(q, city)
    );

    const combatAndHuntQuests = allActiveQuests.filter(
        q => q.type === 'Subjugation' || q.type === 'Collection' || q.type === 'BountyHunt'
    );

    const dungeonQuests = allActiveQuests.filter(
        q => q.type === 'Rescue' || q.type === 'MilitaryDungeonSearch'
    );

    const handledIds = new Set([
        ...emergencyQuests.map(q => q.id),
        ...escortQuests.map(q => q.id),
        ...instructorQuests.map(q => q.id),
        ...combatAndHuntQuests.map(q => q.id),
        ...dungeonQuests.map(q => q.id)
    ]);

    const factionOpsQuests = allActiveQuests.filter(q => !handledIds.has(q.id));

    const expiredMessages = [
        ...(character.mercenaryData?.expiredQuestNotifications || []),
        ...(character.militaryData?.expiredMissionNotifications || [])
    ];

    const nationRelation = character.militaryData?.diplomacy?.[nation];
    const isWarState = nationRelation?.status === DiplomaticStatus.WAR;
    const occupation = nationRelation?.occupation || 0;

    return {
        emergencyQuests,
        escortQuests,
        instructorQuests,
        combatAndHuntQuests,
        dungeonQuests,
        factionOpsQuests,
        allActiveQuests,
        expiredMessages,
        isWarState,
        occupation
    };
};

const findSafeTileAround = (
    mapData: CityMapData,
    tx: number,
    ty: number
): { tx: number; ty: number } => {
    const candidates = [
        [0, 1],
        [1, 1],
        [-1, 1],
        [0, 2],
        [1, 0],
        [-1, 0],
        [2, 1],
        [-2, 1]
    ];
    for (const [ox, oy] of candidates) {
        const nx = Math.max(2, Math.min(mapData.cols - 3, Math.round(tx + ox)));
        const ny = Math.max(2, Math.min(mapData.rows - 3, Math.round(ty + oy)));
        if (mapData.tiles[ny]?.[nx] !== 'wall' && mapData.tiles[ny]?.[nx] !== 'water') {
            return { tx: nx, ty: ny };
        }
    }
    return { tx: mapData.spawnX, ty: mapData.spawnY };
};

export const buildCityQuestMapEntities = (
    classified: ClassifiedCityQuests,
    city: string,
    nation: string,
    region: string,
    mapData: CityMapData,
    characterLevel: number
): {
    questNpcs: CityQuestNpcEntity[];
    questFollowers: CityQuestFollower[];
    questMonsters: CityQuestMonsterEntity[];
    portalBadges: Record<string, 'emergency' | 'quest'>;
} => {
    const questNpcs: CityQuestNpcEntity[] = [];
    const questFollowers: CityQuestFollower[] = [];
    const questMonsters: CityQuestMonsterEntity[] = [];
    const portalBadges: Record<string, 'emergency' | 'quest'> = {};

    const gatePortal = mapData.portals.find(p => p.district === 'Gate' || p.actionType === 'world_map');
    const dungeonPortal = mapData.portals.find(p => p.actionType === 'dungeon');
    const academicPortal = mapData.portals.find(p => p.district === 'Academic');
    const militaryPortal = mapData.portals.find(p => p.district === 'Military');
    const mercPortal = mapData.portals.find(p => p.district === 'Mercenary');

    // 1. 호송/호위 퀘스트: 출발 전이면 대기 NPC 스폰, 출발 후이면 팔로워 합류
    classified.escortQuests.forEach((q, idx) => {
        const targetName = getEscortTargetName(q);
        const gender: RpgSpriteGenderKey = q.type === 'EscortNoble' && idx % 2 === 1 ? 'female' : 'male';
        const sprite = resolveEntityRpgSprite({ name: targetName, gender, appearance: '' } as any, region, nation);
        if (q.isEscortStarted) {
            questFollowers.push({
                id: `escort_follower_${q.id}`,
                name: targetName,
                questId: q.id,
                destinationCity: q.destination?.city || '목적지',
                regionKey: sprite.regionKey,
                genderKey: sprite.genderKey,
                spriteUrl: sprite.url
            });
            if (gatePortal) portalBadges[gatePortal.id] = portalBadges[gatePortal.id] || 'quest';
        } else {
            const baseTx = gatePortal ? gatePortal.doorX - 1 + idx * 2 : mapData.spawnX + 2 + idx;
            const baseTy = gatePortal ? gatePortal.doorY - 2 : mapData.spawnY + 1;
            const pos = findSafeTileAround(mapData, baseTx, baseTy);
            questNpcs.push({
                id: `quest_escort_${q.id}`,
                name: targetName,
                role: `호송 대기 · ${q.destination?.city || '목적지'}행`,
                px: (pos.tx + 0.5) * CITY_TILE_SIZE,
                py: (pos.ty + 0.5) * CITY_TILE_SIZE,
                homeX: (pos.tx + 0.5) * CITY_TILE_SIZE,
                homeY: (pos.ty + 0.5) * CITY_TILE_SIZE,
                targetX: (pos.tx + 0.5) * CITY_TILE_SIZE,
                targetY: (pos.ty + 0.5) * CITY_TILE_SIZE,
                dir: 'up',
                regionKey: sprite.regionKey,
                genderKey: sprite.genderKey,
                dialogues: [
                    `${q.title}: ${q.destination?.city || '지정 도시'}까지 안전하게 호위해 주시오!`,
                    '지금 바로 호송 대열을 출발시키겠소.'
                ],
                waitTicks: 999,
                stepPhase: 0,
                questId: q.id,
                questKind: 'escort_wait',
                quest: q,
                badgeText: '🛡️ 호송 출발',
                badgeColor: '#2563eb',
                spriteUrl: getRpgSpriteUrlByKey(
                    q.type === 'EscortKing'
                        ? 'npc_royal_king'
                        : q.type === 'MercenaryEscort' || q.type === 'MilitaryEscort'
                        ? 'npc_quest_escort'
                        : 'npc_quest_noble'
                )
            });
            if (gatePortal) portalBadges[gatePortal.id] = portalBadges[gatePortal.id] || 'quest';
        }
    });

    // 2. 긴급 방위/구조 퀘스트: 실제 적 몬스터가 도시 내 출몰
    classified.emergencyQuests.forEach((q, qIdx) => {
        const avgLevel = q.level || characterLevel;
        const theme = NATION_THEMES[q.location?.nation || nation] || NATION_THEMES[nation] || NATION_THEMES['default'];
        const band = HUNT_LEVEL_BANDS.find(b => avgLevel >= b.levelRange[0] && avgLevel <= b.levelRange[1]) || HUNT_LEVEL_BANDS[0];
        const pool = theme.monsters[band.id] || theme.monsters['beginner'];
        const raw = pool[0];
        const baseName = q.targetName || (typeof raw === 'string' ? raw : raw.name);
        const info = getMonsterInfo(baseName);
        const fallbackSprite = resolveEntityRpgSprite({ name: baseName, gender: 'male' } as any, region, nation);

        const spawnCount = 3;
        for (let i = 0; i < spawnCount; i++) {
            const angle = ((qIdx * 3 + i) / spawnCount) * Math.PI * 2;
            const rawTx = mapData.spawnX + Math.round(Math.cos(angle) * 4.2);
            const rawTy = mapData.spawnY - 2 + Math.round(Math.sin(angle) * 2.5);
            const pos = findSafeTileAround(mapData, rawTx, rawTy);
            const px = (pos.tx + 0.5) * CITY_TILE_SIZE;
            const py = (pos.ty + 0.5) * CITY_TILE_SIZE;
            questMonsters.push({
                id: `quest_mob_${q.id}_${i}`,
                quest: q,
                name: i === 0 ? `${baseName} (우두머리)` : `${baseName}`,
                visualUrl: info.visualUrl,
                spriteUrl: fallbackSprite.url,
                regionKey: fallbackSprite.regionKey,
                genderKey: fallbackSprite.genderKey,
                px,
                py,
                homeX: px,
                homeY: py,
                targetX: px,
                targetY: py,
                dir: 'down',
                stepPhase: i * 1.4,
                waitTicks: 30 + i * 15,
                isBoss: i === 0
            });
        }

        if (q.type === 'MilitaryRegionalDefense' && militaryPortal) {
            portalBadges[militaryPortal.id] = 'emergency';
        } else if (mercPortal) {
            portalBadges[mercPortal.id] = 'emergency';
        }
        if (gatePortal) portalBadges[gatePortal.id] = 'emergency';
    });

    // 3. 학교 파견 교관 (TemporaryInstructor)
    if (classified.instructorQuests.length > 0 && academicPortal) {
        const q = classified.instructorQuests[0];
        const pos = findSafeTileAround(mapData, academicPortal.doorX, academicPortal.doorY + 1);
        const sprite = resolveEntityRpgSprite({ name: '학교 안내생', gender: 'female' } as any, region, nation);
        questNpcs.push({
            id: `quest_inst_${q.id}`,
            name: '레귤러스 안내생',
            role: '학교 파견 교관 안내',
            px: (pos.tx + 0.5) * CITY_TILE_SIZE,
            py: (pos.ty + 0.5) * CITY_TILE_SIZE,
            homeX: (pos.tx + 0.5) * CITY_TILE_SIZE,
            homeY: (pos.ty + 0.5) * CITY_TILE_SIZE,
            targetX: (pos.tx + 0.5) * CITY_TILE_SIZE,
            targetY: (pos.ty + 0.5) * CITY_TILE_SIZE,
            dir: 'down',
            regionKey: sprite.regionKey,
            genderKey: sprite.genderKey,
            dialogues: [
                `${q.schoolName || `${city} 학교`}에서 교관님만 기다리고 있습니다!`,
                '지금 바로 학원 지구로 들어가 특강을 진행하시겠어요?'
            ],
            waitTicks: 999,
            stepPhase: 0,
            questId: q.id,
            questKind: 'instructor',
            quest: q,
            badgeText: '🎓 교관 파견',
            badgeColor: '#0891b2',
            spriteUrl: getRpgSpriteUrlByKey('npc_quest_student')
        });
        portalBadges[academicPortal.id] = portalBadges[academicPortal.id] || 'quest';
    }

    // 4. 토벌·수집·현상수배 (Gate 앞 외곽 연락병)
    if (classified.combatAndHuntQuests.length > 0 && gatePortal) {
        const q = classified.combatAndHuntQuests[0];
        const pos = findSafeTileAround(mapData, gatePortal.doorX + 2, gatePortal.doorY - 1);
        const sprite = resolveEntityRpgSprite({ name: '외곽 정찰병', gender: 'male' } as any, region, nation);
        const cur = q.currentAmount || 0;
        const tgt = q.targetAmount || 1;
        questNpcs.push({
            id: `quest_hunt_${q.id}`,
            name: '외곽 정찰병',
            role: `토벌/수집 연락 (${cur}/${tgt})`,
            px: (pos.tx + 0.5) * CITY_TILE_SIZE,
            py: (pos.ty + 0.5) * CITY_TILE_SIZE,
            homeX: (pos.tx + 0.5) * CITY_TILE_SIZE,
            homeY: (pos.ty + 0.5) * CITY_TILE_SIZE,
            targetX: (pos.tx + 0.5) * CITY_TILE_SIZE,
            targetY: (pos.ty + 0.5) * CITY_TILE_SIZE,
            dir: 'left',
            regionKey: sprite.regionKey,
            genderKey: sprite.genderKey,
            dialogues: [
                `[${q.title}] 진행 현황: ${cur} / ${tgt}`,
                '성문 밖 외곽 사냥터로 바로 안내해 드리겠습니다!'
            ],
            waitTicks: 999,
            stepPhase: 0,
            questId: q.id,
            questKind: 'hunt_board',
            quest: q,
            badgeText: `⚔️ ${cur}/${tgt}`,
            badgeColor: '#d97706',
            spriteUrl: getRpgSpriteUrlByKey('npc_quest_scout')
        });
        portalBadges[gatePortal.id] = portalBadges[gatePortal.id] || 'quest';
    }

    // 5. 던전 구출·수색 (Dungeon 포탈 앞)
    if (classified.dungeonQuests.length > 0 && dungeonPortal) {
        const q = classified.dungeonQuests[0];
        const pos = findSafeTileAround(mapData, dungeonPortal.doorX, dungeonPortal.doorY + 1);
        const sprite = resolveEntityRpgSprite({ name: '던전 구조대', gender: 'female' } as any, region, nation);
        questNpcs.push({
            id: `quest_dungeon_${q.id}`,
            name: '던전 수색대원',
            role: q.type === 'Rescue' ? '실종자 구출 안내' : '던전 수색 작전',
            px: (pos.tx + 0.5) * CITY_TILE_SIZE,
            py: (pos.ty + 0.5) * CITY_TILE_SIZE,
            homeX: (pos.tx + 0.5) * CITY_TILE_SIZE,
            homeY: (pos.ty + 0.5) * CITY_TILE_SIZE,
            targetX: (pos.tx + 0.5) * CITY_TILE_SIZE,
            targetY: (pos.ty + 0.5) * CITY_TILE_SIZE,
            dir: 'down',
            regionKey: sprite.regionKey,
            genderKey: sprite.genderKey,
            dialogues: [
                `[${q.title}] 작전이 대기 중입니다.`,
                '지금 바로 던전 입구로 진입하시겠습니까?'
            ],
            waitTicks: 999,
            stepPhase: 0,
            questId: q.id,
            questKind: 'dungeon_guide',
            quest: q,
            badgeText: '🧭 던전 작전',
            badgeColor: '#7c3aed',
            spriteUrl: getRpgSpriteUrlByKey('npc_quest_dungeon')
        });
        portalBadges[dungeonPortal.id] = portalBadges[dungeonPortal.id] || 'quest';
    }

    // 6. 전선 상황실 & 군 작전 (Military 포탈 앞)
    if ((classified.isWarState || classified.factionOpsQuests.length > 0) && militaryPortal) {
        const hasWar = classified.isWarState;
        const pos = findSafeTileAround(mapData, militaryPortal.doorX, militaryPortal.doorY + 1);
        const sprite = resolveEntityRpgSprite({ name: '전선 연락 장교', gender: 'male' } as any, region, nation);
        questNpcs.push({
            id: `quest_war_${city}`,
            name: '전선 연락 장교',
            role: hasWar ? `전선 상황실 (점유율 ${classified.occupation}%)` : '군사 작전 안내',
            px: (pos.tx + 0.5) * CITY_TILE_SIZE,
            py: (pos.ty + 0.5) * CITY_TILE_SIZE,
            homeX: (pos.tx + 0.5) * CITY_TILE_SIZE,
            homeY: (pos.ty + 0.5) * CITY_TILE_SIZE,
            targetX: (pos.tx + 0.5) * CITY_TILE_SIZE,
            targetY: (pos.ty + 0.5) * CITY_TILE_SIZE,
            dir: 'down',
            regionKey: sprite.regionKey,
            genderKey: sprite.genderKey,
            dialogues: hasWar
                ? [
                      `${nation} 전선이 교전 상태입니다! (현재 점유율: ${classified.occupation}%)`,
                      '전선 상황실을 열어 부대를 지휘하거나 직접 타격하십시오!'
                  ]
                : [
                      `수행 중인 작전 임무가 ${classified.factionOpsQuests.length}건 있습니다.`,
                      '군 사령부로 들어가 작전을 보고하거나 진행하십시오.'
                  ],
            waitTicks: 999,
            stepPhase: 0,
            questKind: 'war_officer',
            quest: classified.factionOpsQuests[0],
            badgeText: hasWar ? `🔥 전선 ${classified.occupation}%` : '🎖️ 군 작전',
            badgeColor: hasWar ? '#dc2626' : '#4f46e5',
            spriteUrl: getRpgSpriteUrlByKey('npc_quest_officer')
        });
        portalBadges[militaryPortal.id] = portalBadges[militaryPortal.id] || (hasWar ? 'emergency' : 'quest');
    }

    // 용병 길드 포탈 마커
    if (mercPortal && (classified.combatAndHuntQuests.length > 0 || classified.dungeonQuests.length > 0)) {
        portalBadges[mercPortal.id] = portalBadges[mercPortal.id] || 'quest';
    }

    return { questNpcs, questFollowers, questMonsters, portalBadges };
};

export const getPortalQuestBadge = (
    portal: CityPortalNode,
    portalBadges: Record<string, 'emergency' | 'quest'>
): 'emergency' | 'quest' | null => {
    return portalBadges[portal.id] || null;
};
