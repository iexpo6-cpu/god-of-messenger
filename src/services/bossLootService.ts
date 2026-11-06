import { Item, ItemRarity } from '../types';
import { DETAILED_BOSSES, BossData } from '../bossMonsters';
import { SEASONAL_BOSSES } from '../mythicbossmonsters';
import { EUROPE_BOSSES } from '../europeBossMonsters';
import { ASIA_BOSSES } from '../asiabossmonster';
import { AMERICA_BOSSES } from '../americabossmonster';
import { AFRICA_BOSSES } from '../africabossmonster';
import { FANTASY_BOSSES } from '../fantasybossmonster';
import { DIVINE_REALM_BOSSES } from '../divineRealmbossmonsters';
import { INSTANT_DUNGEON_BOSS_TEMPLATES } from '../data/instantDungeonBoss';

export interface BossDetailedLootMeta {
    bossName: string;
    bossTitle?: string;
    bossId?: string;
    shinryokuType?: string;
    nation?: string;
    city?: string;
    specialLootName?: string;
}

// 보스 고유 전리품(DetailedLoot) 및 특수 전리품 빠른 조회를 위한 레지스트리
const detailedLootMap = new Map<string, BossDetailedLootMeta>();
const specialLootMap = new Map<string, BossDetailedLootMeta>();

function registerBoss(boss: BossData, nation?: string, city?: string) {
    if (!boss) return;

    const meta: BossDetailedLootMeta = {
        bossName: boss.name,
        bossTitle: boss.title,
        bossId: boss.id,
        shinryokuType: boss.shinryokuType,
        nation,
        city,
        specialLootName: boss.specialLoot
    };

    if (boss.detailedLoot) {
        const loots = Array.isArray(boss.detailedLoot) ? boss.detailedLoot : [boss.detailedLoot];
        loots.forEach(loot => {
            if (loot && loot.name) {
                detailedLootMap.set(loot.name.trim(), meta);
            }
        });
    }

    if (boss.specialLoot && typeof boss.specialLoot === 'string') {
        specialLootMap.set(boss.specialLoot.trim(), meta);
    }
}

// 모든 보스 데이터로부터 세부 전리품(DetailedLoot) 등록
function initializeBossLootRegistry() {
    try {
        // 1. 한국 / 기본 상세 보스
        if (DETAILED_BOSSES) {
            Object.entries(DETAILED_BOSSES).forEach(([nation, cities]) => {
                if (cities && typeof cities === 'object') {
                    Object.entries(cities).forEach(([city, boss]) => {
                        registerBoss(boss, nation, city);
                    });
                }
            });
        }

        // 2. 유럽 보스
        if (EUROPE_BOSSES) {
            Object.entries(EUROPE_BOSSES).forEach(([nation, cities]) => {
                if (cities && typeof cities === 'object') {
                    Object.entries(cities).forEach(([city, boss]) => {
                        registerBoss(boss, nation, city);
                    });
                }
            });
        }

        // 3. 아시아 보스
        if (ASIA_BOSSES) {
            Object.entries(ASIA_BOSSES).forEach(([nation, cities]) => {
                if (cities && typeof cities === 'object') {
                    Object.entries(cities).forEach(([city, boss]) => {
                        registerBoss(boss, nation, city);
                    });
                }
            });
        }

        // 4. 아메리카 보스
        if (AMERICA_BOSSES) {
            Object.entries(AMERICA_BOSSES).forEach(([nation, cities]) => {
                if (cities && typeof cities === 'object') {
                    Object.entries(cities).forEach(([city, boss]) => {
                        registerBoss(boss, nation, city);
                    });
                }
            });
        }

        // 5. 아프리카 보스
        if (AFRICA_BOSSES) {
            Object.entries(AFRICA_BOSSES).forEach(([nation, cities]) => {
                if (cities && typeof cities === 'object') {
                    Object.entries(cities).forEach(([city, boss]) => {
                        registerBoss(boss, nation, city);
                    });
                }
            });
        }

        // 6. 판타지 대륙 보스
        if (FANTASY_BOSSES) {
            Object.entries(FANTASY_BOSSES).forEach(([nation, cities]) => {
                if (cities && typeof cities === 'object') {
                    Object.entries(cities).forEach(([city, boss]) => {
                        registerBoss(boss, nation, city);
                    });
                }
            });
        }

        // 7. 신역 보스
        if (DIVINE_REALM_BOSSES) {
            Object.entries(DIVINE_REALM_BOSSES).forEach(([nation, cities]) => {
                if (cities && typeof cities === 'object') {
                    Object.entries(cities).forEach(([city, boss]) => {
                        registerBoss(boss, nation, city);
                    });
                }
            });
        }
 // 8. 신화 계절 보스
        if (SEASONAL_BOSSES) {
            Object.values(SEASONAL_BOSSES).forEach(boss => {
                registerBoss(boss, '신화의 영역', '신화 강림');
            });
        }

        // 9. 인스턴트 던전 보스
        if (INSTANT_DUNGEON_BOSS_TEMPLATES) {
            INSTANT_DUNGEON_BOSS_TEMPLATES.forEach(boss => {
                if (boss && boss.name) {
                    const meta: BossDetailedLootMeta = {
                        bossName: boss.name,
                        bossId: boss.id,
                        shinryokuType: boss.shinryokuType,
                        nation: '인스턴트 던전'
                    };
                    if (boss.dropTable && Array.isArray(boss.dropTable)) {
                        boss.dropTable.forEach(item => {
                            if (item && item.name) {
                                detailedLootMap.set(item.name.trim(), meta);
                            }
                        });
                    }
                }
            });
        }
    } catch (e) {
        console.error('보스 전리품 레지스트리 초기화 중 오류:', e);
    }
}

// 즉시 1회 초기화
initializeBossLootRegistry();

/**
 * 아이템이 보스 고유 세부 전리품(DetailedLoot)인지 여부를 판별합니다.
 */
export function isBossDetailedLoot(item: any): boolean {
    if (!item) return false;

    // 명시적 플래그가 있는 경우
    if (item.isDetailedLoot === true || item.isBossLoot === true) return true;

    // 보스 소스 메타가 있는 경우
    if (item.sourceBoss || item.bossSource) return true;

    // 아이템 이름으로 세부 전리품 맵에서 검색
    const name = (item.name || '').trim();
    if (name && detailedLootMap.has(name)) {
        return true;
    }

    return false;
}

/**
 * 보스 고유 세부 전리품(DetailedLoot)의 기원 보스 메타데이터를 반환합니다.
 */
export function getBossDetailedLootInfo(item: any): BossDetailedLootMeta | null {
    if (!item) return null;

    const name = (item.name || '').trim();
    if (name && detailedLootMap.has(name)) {
        return detailedLootMap.get(name)!;
    }

    if (name && specialLootMap.has(name)) {
        return specialLootMap.get(name)!;
    }

    // 아이템 자체에 보스 정보가 있는 경우
    if (item.sourceBoss || item.bossSource) {
        return {
            bossName: item.sourceBoss || item.bossSource,
            bossTitle: item.bossTitle || '보스'
        };
    }

    return null;
}

/**
 * 일반 보스 드롭 아이템(특수 전리품 포함)인지 확인합니다.
 */
export function isBossAnyDrop(item: any): boolean {
    if (!item) return false;
    if (isBossDetailedLoot(item)) return true;

    const name = (item.name || '').trim();
    if (name && specialLootMap.has(name)) return true;

    return (
        item.rarity === ItemRarity.MYTHTIC ||
        item.isSpecial === true ||
        (name.length > 0 && (
            name.includes('영혼석') ||
            name.includes('정수') ||
            name.includes('신의 사자') ||
            name.includes('유물')
        ))
    );
}

/**
 * 모든 보스의 고유 세부 전리품 목록을 가져옵니다.
 */
export function getAllBossDetailedLoots(): Item[] {
    const loots: Item[] = [];
    const addedNames = new Set<string>();

    const checkAndAdd = (loot: any) => {
        if (loot && loot.name && !addedNames.has(loot.name)) {
            addedNames.add(loot.name);
            loots.push({
                name: loot.name,
                type: loot.type,
                rarity: loot.rarity || ItemRarity.LEGENDARY,
                description: loot.description || '강력한 보스를 물리쳐서 얻은 전리품입니다.',
                stats: loot.stats ? { ...loot.stats } : undefined,
                secondaryOptions: loot.secondaryOptions ? [...loot.secondaryOptions] : undefined,
                mythicOption: loot.mythicOption,
                imageUrl: loot.imageUrl,
                price: loot.price || 5000000,
                stock: 1
            });
        }
    };

    const processBoss = (boss: BossData) => {
        if (!boss) return;
        if (boss.detailedLoot) {
            const arr = Array.isArray(boss.detailedLoot) ? boss.detailedLoot : [boss.detailedLoot];
            arr.forEach(checkAndAdd);
        }
    };

    // 각 대륙별 보스 컬렉션 순회
    if (DETAILED_BOSSES) {
        Object.values(DETAILED_BOSSES).forEach(cities => {
            if (cities) Object.values(cities).forEach(processBoss);
        });
    }
    if (EUROPE_BOSSES) {
        Object.values(EUROPE_BOSSES).forEach(cities => {
            if (cities) Object.values(cities).forEach(processBoss);
        });
    }
    if (ASIA_BOSSES) {
        Object.values(ASIA_BOSSES).forEach(cities => {
            if (cities) Object.values(cities).forEach(processBoss);
        });
    }
    if (AMERICA_BOSSES) {
        Object.values(AMERICA_BOSSES).forEach(cities => {
            if (cities) Object.values(cities).forEach(processBoss);
        });
    }
    if (AFRICA_BOSSES) {
        Object.values(AFRICA_BOSSES).forEach(cities => {
            if (cities) Object.values(cities).forEach(processBoss);
        });
    }
    if (FANTASY_BOSSES) {
        Object.values(FANTASY_BOSSES).forEach(cities => {
            if (cities) Object.values(cities).forEach(processBoss);
        });
    }
    if (DIVINE_REALM_BOSSES) {
        Object.values(DIVINE_REALM_BOSSES).forEach(cities => {
            if (cities) Object.values(cities).forEach(processBoss);
        });
    }
    if (SEASONAL_BOSSES) {
        Object.values(SEASONAL_BOSSES).forEach(processBoss);
    }

    return loots;
}
