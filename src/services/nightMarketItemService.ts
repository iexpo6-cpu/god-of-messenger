import { Character, Item, ItemRarity } from '../types';
import { calculateFinalStats } from '../utils';

export const DEMON_ESSENCE_ITEM: Item = {
    name: "마력의 정수",
    type: "Etc",
    rarity: ItemRarity.UNIQUE,
    price: 100000,
    description: "강력한 마력의 정수.",
    imageUrl: "https://i.ibb.co/jkV1CtJy/Kakao-Talk-20260105-221438797-03.png"
};

// 암시장 랜덤 보물함 드랍 풀 (낮은 확률로 고등급 아이템, 신화 제외)
interface BoxLootEntry {
    name: string;
    type: Item['type'];
    rarity: ItemRarity;
    stats?: Record<string, number>;
    secondaryOptions?: string[];
    description: string;
    imageUrl?: string;
    price?: number;
    cost?: number;
}

const TREASURE_BOX_LOOT: Record<ItemRarity, BoxLootEntry[]> = {
    [ItemRarity.LEGENDARY]: [
        {
            name: '[전설] 고대 암흑의 마법도',
            type: 'Weapon',
            rarity: ItemRarity.LEGENDARY,
            stats: { str: 120, int: 90, agi: 50 },
            secondaryOptions: ['모든 능력치 +30%', 'STR +15%', '무기숙련도 +25%'],
            description: '고대 어둠의 결사단 수장이 사용하던 전설의 주술도입니다.',
            imageUrl: 'https://i.ibb.co/LXTw2Bmk/Kakao-Talk-20260105-221438797-01.png',
            price: 4000000
        },
        {
            name: '[전설] 그림자 사신의 흉갑',
            type: 'Body',
            rarity: ItemRarity.LEGENDARY,
            stats: { def: 95, agi: 60, hp: 600, maxHp: 600 },
            secondaryOptions: ['DEF +40%', 'HP +40%', 'AGI +15%'],
            description: '그림자 속을 유영하는 사신들이 착용했던 전설의 흉갑입니다.',
            imageUrl: 'https://i.ibb.co/1BzsCst/Kakao-Talk-20260105-221438797-04.png',
            price: 4000000
        },
        {
            name: '[전설] 흑요석 용의 가호 목걸이',
            type: 'Accessory',
            rarity: ItemRarity.LEGENDARY,
            stats: { def: 70, wis: 70, mp: 500, maxMp: 500 },
            secondaryOptions: ['모든 능력치 +38%', 'MP +30%', '드롭률 +25%'],
            description: '흑요석 드래곤의 심장 파편으로 조각한 수호의 목걸이입니다.',
            imageUrl: 'https://i.ibb.co/1GCj1Rx4/Gemini-Generated-Image-zexal1zexal1zexa.png',
            price: 4000000
        }
    ],
    [ItemRarity.EPIC]: [
        {
            name: '[에픽] 심연 기사의 중갑',
            type: 'Body',
            rarity: ItemRarity.EPIC,
            stats: { def: 65, hp: 400, maxHp: 400 },
            secondaryOptions: ['DEF +15%', 'HP +15%', 'STR +30'],
            description: '심연의 어둠 속에서도 꺾이지 않는 중기사의 갑주입니다.',
            imageUrl: 'https://i.ibb.co/RGqxb6kx/Gemini-Generated-Image-n56nd8n56nd8n56n.png',
            price: 2000000
        },
        {
            name: '[에픽] 어둠의 추적자 단검',
            type: 'Weapon',
            rarity: ItemRarity.EPIC,
            stats: { agi: 70, str: 45 },
            secondaryOptions: ['AGI +15%', 'STR +15%', '스킬숙련도 +20%'],
            description: '표적을 놓치지 않는 암살자의 은빛 단검입니다.',
            imageUrl: 'https://i.ibb.co/8gc7BCs8/Gemini-Generated-Image-t0mu6tt0mu6tt0mu.png',
            price: 2000000
        },
        {
            name: '[에픽] 황천의 마력 반지',
            type: 'Accessory',
            rarity: ItemRarity.EPIC,
            stats: { int: 50, wis: 50, mp: 300, maxMp: 300 },
            secondaryOptions: ['INT +15%', 'WIS +15%', '골드 획득량 +20%'],
            description: '황천의 마력이 잔잔히 고동치는 보석 반지입니다.',
            imageUrl: 'https://i.ibb.co/1GCj1Rx4/Gemini-Generated-Image-zexal1zexal1zexa.png',
            price: 2000000
        }
    ],
    [ItemRarity.UNIQUE]: [
        {
            name: '[유니크] 고대 지하도시 장검',
            type: 'Weapon',
            rarity: ItemRarity.UNIQUE,
            stats: { str: 50, def: 30 },
            secondaryOptions: ['STR +20%', 'STR +20%', '무기숙련도 +15%'],
            description: '지하 유적지에서 발굴된 고대 병사의 장검입니다.',
            imageUrl: 'https://i.ibb.co/ZpTVjmQZ/Gemini-Generated-Image-7k1m5e7k1m5e7k1m.png',
            price: 2500000
        },
        {
            name: '[유니크] 어둠 서린 가죽 튜닉',
            type: 'Body',
            rarity: ItemRarity.UNIQUE,
            stats: { def: 45, agi: 35, hp: 250, maxHp: 250 },
            secondaryOptions: ['AGI +20%', 'DEF +20%', 'HP +20%'],
            description: '어두운 밤길에서 모습을 감추어 주는 가죽 옷입니다.',
            imageUrl: 'https://i.ibb.co/P9TfV9W1/armor.png',
            price: 2500000
        },
        {
            name: '[유니크] 밀수꾼의 행운 나침반',
            type: 'Accessory',
            rarity: ItemRarity.UNIQUE,
            stats: { agi: 40, ctrl: 35 },
            secondaryOptions: ['골드 획득량 +20%', '드롭률 +15%', 'CTRL +15%'],
            description: '위험한 국경을 무사히 통과하게 돕는 신비한 나침반입니다.',
            imageUrl: 'https://i.ibb.co/1GCj1Rx4/Gemini-Generated-Image-zexal1zexal1zexa.png',
            price: 3000000
        }
    ],
    [ItemRarity.RARE]: [
        {
            name: '[레어] 심연 암석 망치',
            type: 'Weapon',
            rarity: ItemRarity.RARE,
            stats: { str: 35, def: 18 },
            secondaryOptions: ['STR +15', 'DEF +10'],
            description: '단단한 심연석을 깎아 만든 묵직한 망치입니다.',
            imageUrl: 'https://i.ibb.co/8DXCnWkm/Gemini-Generated-Image-5ec4um5ec4um5ec4.png',
            price: 120000
        },
        {
            name: '[레어] 그림자 보행자 경갑',
            type: 'Body',
            rarity: ItemRarity.RARE,
            stats: { def: 30, agi: 22, hp: 180, maxHp: 180 },
            secondaryOptions: ['AGI +15', '체력 +150'],
            description: '야간 잠입에 유용한 가벼운 경갑옷입니다.',
            imageUrl: 'https://i.ibb.co/P9TfV9W1/armor.png',
            price: 120000
        },
        {
            name: '[레어] 어둠의 호신 부적',
            type: 'Accessory',
            rarity: ItemRarity.RARE,
            stats: { def: 22, wis: 22, hp: 150, maxHp: 150 },
            secondaryOptions: ['WIS +15', 'DEF +10'],
            description: '악령의 해를 막아주는 부적입니다.',
            imageUrl: 'https://i.ibb.co/1GCj1Rx4/Gemini-Generated-Image-zexal1zexal1zexa.png',
            price: 150000
        }
    ],
    [ItemRarity.NORMAL]: [],
    [ItemRarity.MAGIC]: [],
    [ItemRarity.MYTHTIC]: []
};

/**
 * 아이템이 심야 암시장 전용 소비형 아이템인지 판별
 */
export function isNightMarketConsumable(item: Item): boolean {
    if (!item || !item.name) return false;
    const name = item.name;
    return (
        name.includes('잠재력 각성수') ||
        name.includes('칠흑의 만병통치약') ||
        name.includes('마정석 보따리') ||
        name.includes('마석 원석 상자') ||
        name.includes('마력 정수 병') ||
        name.includes('마력정수병') ||
        name.includes('고대 왕국의 봉인된 보물함') ||
        name.includes('봉인된 보물함')
    );
}

/**
 * 랜덤 박스 개봉 (신화 제외, 확률: 전설 5.0%, 에픽 25.0%, 유니크 35.0%, 레어 35.0%)
 */
export function openAncientRelicBox(): Item {
    const roll = Math.random() * 100;
    let chosenRarity: ItemRarity = ItemRarity.RARE;

    if (roll < 5.0) {
        chosenRarity = ItemRarity.LEGENDARY;
    } else if (roll < 30.0) {
        chosenRarity = ItemRarity.UNIQUE;
    } else if (roll < 65.0) {
        chosenRarity = ItemRarity.EPIC;
    } else {
        chosenRarity = ItemRarity.RARE;
    }

    const pool = TREASURE_BOX_LOOT[chosenRarity] || TREASURE_BOX_LOOT[ItemRarity.RARE];
    const picked = pool[Math.floor(Math.random() * pool.length)];

    return {
        name: picked.name,
        type: picked.type,
        rarity: picked.rarity,
        stats: picked.stats ? { ...picked.stats } : undefined,
        secondaryOptions: picked.secondaryOptions ? [...picked.secondaryOptions] : undefined,
        description: picked.description,
        imageUrl: picked.imageUrl,
        price: picked.price || picked.cost || 1000000,
        stock: 1
    };
}

/**
 * 심야 암시장 아이템 인벤토리 사용 처리
 */
export function processNightMarketConsumable(
    character: Character,
    item: Item,
    indices: number[]
): { updatedChar: Character; logMsg: string } {
    const count = indices.length;
    const newChar: Character = { ...character };
    const itemName = item.name;

    // 1. 인벤토리에서 해당 슬롯 아이템 제거
    let remainingInventory = newChar.inventory.filter((_, idx) => !indices.includes(idx));

    let logMsg = '';

    // 2. [황천의 영약] 잠재력 각성수 (모든 스탯 영구 +1)
    if (itemName.includes('잠재력 각성수')) {
        const stats = { ...(newChar.stats || { hp: 100, maxHp: 100, mp: 50, maxMp: 50, str: 10, int: 10, wis: 10, def: 10, agi: 10, ctrl: 10 }) };
        const gain = 1 * count;
        stats.str = (stats.str || 0) + gain;
        stats.agi = (stats.agi || 0) + gain;
        stats.int = (stats.int || 0) + gain;
        stats.wis = (stats.wis || 0) + gain;
        stats.def = (stats.def || 0) + gain;
        stats.ctrl = (stats.ctrl || 0) + gain;

        newChar.stats = stats;
        logMsg = `[아이템 사용] 황천의 잠재력 각성수 x${count}을(를) 섭취하여 모든 기본 능력치(힘, 민첩, 지력, 지능, 방어, 제어)가 영구히 +${gain} 상승했습니다!`;
    }
    // 3. [밀수 비약] 칠흑의 만병통치약 (피로도 100 회복, HP/MP 완전 회복)
    else if (itemName.includes('칠흑의 만병통치약')) {
        const fatigueGain = 100 * count;
        const currentFatigue = newChar.fatigue || 0;
        newChar.fatigue = Math.max(0, currentFatigue - fatigueGain);

        if (newChar.stats) {
            const { finalStats } = calculateFinalStats(newChar);
            newChar.stats.hp = finalStats.maxHp;
            newChar.stats.mp = finalStats.maxMp;
        }

        logMsg = `[아이템 사용] 칠흑의 만병통치약 x${count}을(를) 복용하여 피로도가 ${fatigueGain} 회복(감소)되고 체력과 마력이 100% 완전 회복되었습니다! (현재 피로도: ${newChar.fatigue}/100)`;
    }
    // 4. [밀수 자원] 특급 순도 마정석 보따리 (마정석 150개 획득)
    else if (itemName.includes('마정석 보따리')) {
        const crystalGain = 150 * count;
        if (!newChar.base) {
            newChar.base = {
                resources: { wood: 0, stone: 0, iron: 0, manaStone: 0, manaCrystal: crystalGain },
                facilities: [],
                facilityLevels: {},
                storage: []
            } as any;
        } else {
            if (!newChar.base.resources) {
                newChar.base.resources = { wood: 0, stone: 0, iron: 0, manaStone: 0, manaCrystal: 0 } as any;
            }
            newChar.base.resources.manaCrystal = (newChar.base.resources.manaCrystal || 0) + crystalGain;
        }

        logMsg = `[아이템 사용] 특급 순도 마정석 보따리 x${count}을(를) 풀어 마정석 +${crystalGain.toLocaleString()}개를 기지에 확보했습니다!`;
    }
    // 5. [밀수 자원] 심연의 마석 원석 상자 (마석 600개 획득)
    else if (itemName.includes('마석 원석 상자')) {
        const stoneGain = 600 * count;
        if (!newChar.base) {
            newChar.base = {
                resources: { wood: 0, stone: 0, iron: 0, manaStone: stoneGain, manaCrystal: 0 },
                facilities: [],
                facilityLevels: {},
                storage: []
            } as any;
        } else {
            if (!newChar.base.resources) {
                newChar.base.resources = { wood: 0, stone: 0, iron: 0, manaStone: 0, manaCrystal: 0 } as any;
            }
            newChar.base.resources.manaStone = (newChar.base.resources.manaStone || 0) + stoneGain;
        }

        logMsg = `[아이템 사용] 심연의 마석 원석 상자 x${count}을(를) 개봉하여 마석 +${stoneGain.toLocaleString()}개를 기지에 확보했습니다!`;
    }
    // 6. [밀수 자원] 심연의 마력 정수 병 (Demoncity 모달에서 판매/사용되는 실제 아이템 '마력의 정수' 지급)
    else if (itemName.includes('마력 정수 병') || itemName.includes('마력정수병')) {
        const essenceCount = 30 * count;
        const grantedEssences: Item[] = [];
        for (let i = 0; i < essenceCount; i++) {
            grantedEssences.push({
                ...DEMON_ESSENCE_ITEM
            });
        }
        remainingInventory = [...remainingInventory, ...grantedEssences];

        logMsg = `[아이템 사용] 심연의 마력 정수 병 x${count}을(를) 개봉하여 마계 공방 연성 핵심 재료인 [마력의 정수] ${essenceCount}개를 인벤토리에 획득했습니다!`;
    }
    // 7. [어둠의 보물함] 고대 왕국의 봉인된 보물함 (랜덤박스: 낮은 확률로 고등급 아이템)
    else if (itemName.includes('봉인된 보물함') || itemName.includes('보물함')) {
        const gainedItems: Item[] = [];
        const resultNames: string[] = [];

        for (let i = 0; i < count; i++) {
            const looted = openAncientRelicBox();
            gainedItems.push(looted);
            resultNames.push(`[${looted.rarity}] ${looted.name}`);
        }

        remainingInventory = [...remainingInventory, ...gainedItems];
        logMsg = `[보물함 개봉] 고대 왕국의 봉인된 보물함 x${count}을(를) 열었습니다!\n획득 아이템: ${resultNames.join(', ')}`;
    }

    newChar.inventory = remainingInventory;
    return { updatedChar: newChar, logMsg };
}
