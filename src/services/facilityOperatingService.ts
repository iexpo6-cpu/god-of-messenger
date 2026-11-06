import { Item, ItemRarity } from '../types';
import { DETAILED_BOSSES } from '../bossMonsters';

export type StandardFacilityType = 'Commercial' | 'Military' | 'Mercenary' | 'Academic' | 'Imperial';

export interface FacilityOperatingState {
    isOpen: boolean;
    isNightPrime: boolean;
    currentHour: number;
    openHour: number;
    closeHour: number;
    statusLabel: string;
    operatingHoursText: string;
    guideMessage: string;
}

export interface NightMarketItem {
    id: string;
    item: Item;
    price: number;
    stock: number;
    category: 'elixir' | 'resource' | 'relic' | 'equipment';
    badge: string;
}

/**
 * 시간 문자열(HH:mm)에서 시간(0~23)을 파싱합니다.
 */
export function parseHour(currentTime?: string): number {
    if (!currentTime) return 8;
    const parts = currentTime.split(':');
    const hour = parseInt(parts[0], 10);
    return isNaN(hour) ? 8 : hour;
}

/**
 * 일반 시설의 영업 여부와 안내 정보를 계산합니다.
 * 주간 영업 시간: 08:00 ~ 20:00 (오전 8시 ~ 저녁 8시)
 * 심야 폐쇄 시간: 22:00 ~ 04:00 (밤 10시 ~ 새벽 4시)
 */
export function getFacilityOperatingState(
    facilityType: StandardFacilityType,
    currentTime?: string
): FacilityOperatingState {
    const hour = parseHour(currentTime);
    const isOpen = hour >= 8 && hour < 20;
    const isNightPrime = hour >= 22 || hour < 4;

    let facilityName = '시설';
    switch (facilityType) {
        case 'Commercial': facilityName = '일반 상점 및 시장'; break;
        case 'Military': facilityName = '국가 군사 사령부'; break;
        case 'Mercenary': facilityName = '용병길드 접수처'; break;
        case 'Academic': facilityName = '레귤러스 학교 및 학술원'; break;
        case 'Imperial': facilityName = '성전 및 공식 집무실'; break;
    }

    let statusLabel = '정상 영업';
    let guideMessage = `${facilityName}이(가) 활기차게 운영 중입니다.`;

    if (!isOpen) {
        if (isNightPrime) {
            statusLabel = '심야 영업 종료';
            guideMessage = `현재 시각(${currentTime || '00:00'})은 심야 폐쇄 시간입니다. ${facilityName}은(는) 주간 시간대(08:00 ~ 20:00)에 정상 영업합니다. 심야에는 뒷골목의 [심야 암시장]과 [밀수꾼]을 이용하시거나 휴식을 취하십시오.`;
        } else {
            statusLabel = '영업 마감';
            guideMessage = `현재 시각(${currentTime || '20:30'})은 ${facilityName}의 영업 마감 시간입니다. (정상 영업 시간: 08:00 ~ 20:00) 내일 아침 8시 이후에 다시 찾아오십시오.`;
        }
    }

    return {
        isOpen,
        isNightPrime,
        currentHour: hour,
        openHour: 8,
        closeHour: 20,
        statusLabel,
        operatingHoursText: '08:00 ~ 20:00',
        guideMessage
    };
}

/**
 * 심야 암시장 활성화 여부를 판별합니다.
 * 활성화 시간: 22:00 ~ 04:00 (밤 10시 ~ 새벽 4시)
 */
export function isNightMarketActive(currentTime?: string): boolean {
    const hour = parseHour(currentTime);
    return hour >= 22 || hour < 4;
}

/**
 * 심야 암시장에서 판매하는 특별 상품 목록을 생성합니다. (매월 1회 갱신)
 * 고대 비전 도안은 제외하고, 초고가 어둠의 물품 및 특수 비약, 희귀 자원 묶음을 취급합니다.
 * 가격은 일반 상점 대비 10배 이상으로 책정되며 재고는 월간 극소량(1~2개)입니다.
 */
export function getNightMarketStock(
    currentDate?: string, 
    city?: string, 
    monthlyPurchases?: Record<string, number>
): NightMarketItem[] {
    const dateStr = currentDate || '2000-03-02';
    const currentMonth = dateStr.slice(0, 7); // e.g. "2000-03"
    const seedStr = `${currentMonth}_${city || '서울'}`;
    let hash = 0;
    for (let i = 0; i < seedStr.length; i++) {
        hash = (hash << 5) - hash + seedStr.charCodeAt(i);
        hash |= 0;
    }
    const seed = Math.abs(hash);

    const stockList: NightMarketItem[] = [
        // 1. 황천의 잠재력 각성수 (모든 스탯 영구 +1) - 극소량 재고, 초고가 (기존의 10배 가격)
        {
            id: `nm_elixir_stat_${seed % 100}`,
            category: 'elixir',
            badge: '초희귀 영구 각성',
            price: 4500000,
            stock: 1,
            item: {
                name: '황천의 잠재력 각성수',
                type: 'Consumable',
                rarity: ItemRarity.EPIC,
                description: '황천의 망령들이 모은 영혼의 정수로 빚어낸 환상의 영약입니다. 가방(인벤토리)에서 사용 시 모든 기본 능력치(힘, 민첩, 지력, 지능, 방어, 제어)가 영구적으로 +1 상승합니다.',
                imageUrl: 'https://i.ibb.co/Gmny7Zk/Gemini-Generated-Image-jqnbqmjqnbqmjqnb.png',
                stock: 1
            }
        },
        // 2. 칠흑의 만병통치약 (피로도 100 회복, 체력/마력 100% 완전 회복) - 초고가 (기존의 10배 가격)
        {
            id: `nm_elixir_fatigue_${seed % 100}`,
            category: 'elixir',
            badge: '칠흑의 비약',
            price: 2500000,
            stock: 1,
            item: {
                name: '칠흑의 만병통치약',
                type: 'Consumable',
                rarity: ItemRarity.RARE,
                description: '어둠의 심연수가 정제된 극약입니다. 가방(인벤토리)에서 복용 시 피로도를 100 회복(감소)하고 체력과 마력을 100% 완전 회복합니다.',
                imageUrl: 'https://i.ibb.co/8DyqwH5x/Kakao-Talk-20260105-221438797-02.png',
                stock: 1
            }
        },
        // 3. 밀수된 마정석 묶음 (기존의 10배 가격)
        {
            id: `nm_res_crystal_${seed % 100}`,
            category: 'resource',
            badge: '밀수 마정석 묶음',
            price: 3500000,
            stock: 1,
            item: {
                name: '특급 순도 마정석 보따리',
                type: 'Consumable',
                rarity: ItemRarity.RARE,
                description: '타국 국경을 은밀히 넘어 밀반입된 고순도 마정석 보따리입니다. 가방(인벤토리)에서 사용 시 기지 마정석 150개를 즉시 획득합니다.',
                imageUrl: 'https://i.ibb.co/jkJTVhH5/Gemini-Generated-Image-5u59hg5u59hg5u59.png',
                stock: 1
            }
        },
        // 4. 밀수된 마석 묶음 (기존의 10배 가격)
        {
            id: `nm_res_stone_${seed % 100}`,
            category: 'resource',
            badge: '밀수 마석 묶음',
            price: 2800000,
            stock: 1,
            item: {
                name: '심연의 마석 원석 상자',
                type: 'Consumable',
                rarity: ItemRarity.RARE,
                description: '지하 깊은 곳에서 몰래 채굴된 희귀 마석 원석 상자입니다. 가방(인벤토리)에서 사용 시 기지 마석 600개를 즉시 획득합니다.',
                imageUrl: 'https://i.ibb.co/pvMqj7ts/Gemini-Generated-Image-s570wos570wos570.png',
                stock: 1
            }
        },
        // 5. 밀수된 마력의 정수 묶음 (Demoncity 모달 마력의 정수 30개 실제 지급) - (기존의 10배 가격)
        {
            id: `nm_res_essence_${seed % 100}`,
            category: 'resource',
            badge: '마력 정수 묶음',
            price: 5000000,
            stock: 1,
            item: {
                name: '심연의 마력 정수 병',
                type: 'Consumable',
                rarity: ItemRarity.UNIQUE,
                description: '순수한 마력의 정수가 응축된 비밀 유리병입니다. 가방(인벤토리)에서 개봉 시 마계 공방 연성 핵심 재료인 [마력의 정수] 30개를 획득합니다.',
                imageUrl: 'https://i.ibb.co/tp8c7N4R/Gemini-Generated-Image-1mh0hr1mh0hr1mh0.png',
                stock: 1
            }
        },
        // 6. 어둠의 보물함: 고대 왕국의 봉인된 보물함 (랜덤박스: 낮은 확률로 고등급 아이템) - (기존의 10배 가격)
        {
            id: `nm_relic_chest_${seed % 100}`,
            category: 'relic',
            badge: '미감정 유물함',
            price: 4000000,
            stock: 2,
            item: {
                name: '고대 왕국의 봉인된 보물함',
                type: 'Consumable',
                rarity: ItemRarity.UNIQUE,
                description: '수백 년 동안 봉인되어 어둠의 마력이 꿈틀거리는 보물함입니다. 가방(인벤토리)에서 열면 확률에 따라 낮은 확률로 레어부터 유니크, 에픽, 전설 등급의 진귀한 보물을 획득합니다.',
                imageUrl: 'https://i.ibb.co/hFFh6J53/Gemini-Generated-Image-dvj8ekdvj8ekdvj8.png',
                stock: 2
            }
        }
    ];

    // 아주 가끔 (시드를 활용하여 약 40% 확률) 보스 전리품을 판매품목에 추가 (최소 3천만 골드 이상)
    if ((seed % 10) < 4) {
        const bossLoots: Item[] = [];
        Object.values(DETAILED_BOSSES).forEach(nationData => {
            Object.values(nationData).forEach(boss => {
                if (boss.detailedLoot) {
                    if (Array.isArray(boss.detailedLoot)) {
                        bossLoots.push(...boss.detailedLoot);
                    } else {
                        bossLoots.push(boss.detailedLoot);
                    }
                }
            });
        });

        // 기타 아이템(Etc)은 제외하고 장비류(Weapon, SubWeapon, Body, Accessory 등)만 선별
        const bossEquipments = bossLoots.filter(it => 
            it && it.type !== 'Etc' && it.name && it.stats
        );

        if (bossEquipments.length > 0) {
            const pickedBossEquip = bossEquipments[seed % bossEquipments.length];
            const bossItemPrice = 30000000 + (seed % 15) * 10000000; // 30,000,000G ~ 44,000,000G

            stockList.push({
                id: `nm_boss_loot_${seed % 100}`,
                category: 'equipment',
                badge: '초전설 보스 무구',
                price: bossItemPrice,
                stock: 1,
                item: {
                    ...pickedBossEquip,
                    stock: 1,
                    description: `[초월적 가치] 보스 몬스터가 드롭하는 고대 무구 전리품입니다. 특별상점에서 초고가로 한정 매각하고 있습니다. ${pickedBossEquip.description || ''}`
                }
            });
        }
    }

    // 이번 달 구매 수량 차감
    if (monthlyPurchases) {
        stockList.forEach(item => {
            const bought = monthlyPurchases[item.item.name] || monthlyPurchases[item.id] || 0;
            item.stock = Math.max(0, item.stock - bought);
        });
    }

    return stockList;
}

/**
 * 이번 달 남은 일수를 계산하여 다음 달 1일 입고까지 남은 기간을 반환합니다.
 */
export function getRemainingDaysInMonth(currentDate?: string): number {
    if (!currentDate) return 30;
    const parts = currentDate.split('-').map(Number);
    if (parts.length < 3 || isNaN(parts[0]) || isNaN(parts[1]) || isNaN(parts[2])) return 30;
    const year = parts[0];
    const month = parts[1];
    const day = parts[2];
    const lastDay = new Date(year, month, 0).getDate();
    return Math.max(1, lastDay - day + 1);
}
