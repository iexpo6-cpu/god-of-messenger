import { Item, ItemRarity, Character, BaseResources, Stats } from './types';

export interface Recipe {
    id: string;
    name: string;
    ingredients: Record<string, number>;
    resultItemId: string;
    minLevel: number; // 요리 숙련도 레벨 제한
    requiredTool?: string; // 필요한 도구 (오븐, 프라이팬 등)
}

export const INGREDIENT_RESOURCE_MAP: Record<string, keyof BaseResources> = {
    '식량': 'food',
    '밀': 'wheat',
    '쌀': 'rice',
    '옥수수': 'corn',
    '감자': 'potato',
    '고구마': 'sweet_potato',
    '양파': 'onion',
    '마늘': 'garlic',
    '상추': 'lettuce',
    '당근': 'carrot',
    '배추': 'cabbage',
    '토마토': 'tomato',
    '딸기': 'strawberry',
    '포도': 'grape',
    '수박': 'watermelon',
    '인삼': 'ginseng',
    '마력 열매': 'mana_fruit',
    '신력 꽃': 'shinryoku_flower',
    '맨드레이크': 'mandrake',
    '세계수 가지': 'world_tree_branch',
    '황금 사과': 'golden_apple',
    '약초': 'herbs',
    '목재': 'wood',
    '석재': 'stone',
    '철': 'iron',
    '골드': 'gold',
    '마나석': 'manaStone',
    '마력 결정': 'manaCrystal',
};

export const getAvailableIngredientCount = (character: Character, ingredientName: string): number => {
    let count = 0;
    
    // 1. 기지 자원(BaseResources) 확인
    const resKey = INGREDIENT_RESOURCE_MAP[ingredientName] || (ingredientName as keyof BaseResources);
    if (character.base?.resources) {
        const val = character.base.resources[resKey as keyof BaseResources] ?? (character.base.resources as any)[ingredientName];
        if (typeof val === 'number' && !isNaN(val)) {
            count += val;
        }
    }

    // 2. 인벤토리(Inventory) 확인
    if (character.inventory && Array.isArray(character.inventory)) {
        character.inventory.forEach(item => {
            if (item && (item.name === ingredientName || item.name.includes(ingredientName))) {
                count += (item.quantity || 1);
            }
        });
    }

    return count;
};

export const consumeIngredients = (newChar: Character, ingredients: Record<string, number>): boolean => {
    // 1단계: 모든 재료가 충분한지 사전 검증
    for (const [ingredient, needed] of Object.entries(ingredients)) {
        const available = getAvailableIngredientCount(newChar, ingredient);
        if (available < needed) {
            return false;
        }
    }

    // 2단계: 실제 재료 차감 (기지 자원 우선 -> 인벤토리 순서)
    for (const [ingredient, needed] of Object.entries(ingredients)) {
        let remainingToConsume = needed;
        const resKey = INGREDIENT_RESOURCE_MAP[ingredient] || (ingredient as keyof BaseResources);
        
        // 1. 기지 자원에서 차감
        if (newChar.base?.resources) {
            const currentRes = (newChar.base.resources as any)[resKey] ?? (newChar.base.resources as any)[ingredient];
            if (typeof currentRes === 'number' && currentRes > 0) {
                const deduct = Math.min(currentRes, remainingToConsume);
                if ((newChar.base.resources as any)[resKey] !== undefined) {
                    (newChar.base.resources as any)[resKey] -= deduct;
                } else {
                    (newChar.base.resources as any)[ingredient] -= deduct;
                }
                remainingToConsume -= deduct;
            }
        }

        // 2. 남은 수량이 있다면 인벤토리에서 차감
        if (remainingToConsume > 0 && newChar.inventory) {
            const updatedInventory: Item[] = [];
            for (const item of newChar.inventory) {
                if (remainingToConsume > 0 && (item.name === ingredient || item.name.includes(ingredient))) {
                    const itemQty = item.quantity || 1;
                    if (itemQty <= remainingToConsume) {
                        remainingToConsume -= itemQty;
                        // 전부 소진됨 (목록에 추가하지 않음)
                    } else {
                        updatedInventory.push({
                            ...item,
                            quantity: itemQty - remainingToConsume
                        });
                        remainingToConsume = 0;
                    }
                } else {
                    updatedInventory.push(item);
                }
            }
            newChar.inventory = updatedInventory;
        }
    }

    return true;
};

export const COOKING_TOOLS = [
    { id: 'frying_pan', name: '프라이팬', price: 10000, minFacilityLevel: 1 },
    { id: 'pot', name: '냄비', price: 15000, minFacilityLevel: 1 },
    { id: 'oven', name: '오븐', price: 500000, minFacilityLevel: 2 },
    { id: 'air_fryer', name: '에어프라이어', price: 800000, minFacilityLevel: 3 },
    { id: 'blender', name: '믹서기', price: 300000, minFacilityLevel: 2 },
    { id: 'steamer', name: '찜기', price: 20000, minFacilityLevel: 1 },
    { id: 'knife_set', name: '고급 칼 세트', price: 400000, minFacilityLevel: 2 },
    { id: 'grill', name: '그릴', price: 6000000, minFacilityLevel: 3 },
    { id: 'slow_cooker', name: '슬로우 쿠커', price: 70000000, minFacilityLevel: 4 },
    { id: 'sous_vide', name: '수비드 머신', price: 12000000, minFacilityLevel: 5 },
];

export const RECIPES: Recipe[] = [
    {
        id: 'recipe_vegetable_soup',
        name: '야채 스프',
        ingredients: { '밀': 2, '당근': 1, '양파': 1 },
        resultItemId: 'item_vegetable_soup',
        minLevel: 1,
        requiredTool: 'pot'
    },
    {
        id: 'recipe_fruit_salad',
        name: '과일 샐러드',
        ingredients: { '딸기': 2, '포도': 2 },
        resultItemId: 'item_fruit_salad',
        minLevel: 1
    },
    {
        id: 'recipe_ginseng_chicken',
        name: '삼계탕',
        ingredients: { '인삼': 1, '식량': 5 },
        resultItemId: 'item_ginseng_chicken',
        minLevel: 5,
        requiredTool: 'pot'
    },
    {
        id: 'recipe_steak',
        name: '스테이크',
        ingredients: { '식량': 10, '양파': 2 },
        resultItemId: 'item_steak',
        minLevel: 10,
        requiredTool: 'frying_pan'
    },
    {
        id: 'recipe_elixir',
        name: '만능 영약',
        ingredients: { '인삼': 5, '딸기': 5, '포도': 5 },
        resultItemId: 'item_elixir',
        minLevel: 30,
        requiredTool: 'pot'
    },
    {
        id: 'recipe_garlic_steak',
        name: '마늘 스테이크',
        ingredients: { '식량': 15, '마늘': 3 },
        resultItemId: 'item_garlic_steak',
        minLevel: 15,
        requiredTool: 'frying_pan'
    },
    {
        id: 'recipe_tomato_salad',
        name: '토마토 샐러드',
        ingredients: { '토마토': 3, '상추': 2 },
        resultItemId: 'item_tomato_salad',
        minLevel: 3
    },
    {
        id: 'recipe_sweet_potato_pie',
        name: '고구마 파이',
        ingredients: { '고구마': 3, '밀': 2 },
        resultItemId: 'item_sweet_potato_pie',
        minLevel: 12,
        requiredTool: 'oven'
    },
    {
        id: 'recipe_watermelon_juice',
        name: '수박 주스',
        ingredients: { '수박': 2, '포도': 1 },
        resultItemId: 'item_watermelon_juice',
        minLevel: 5,
        requiredTool: 'blender'
    },
    {
        id: 'recipe_slime_pudding',
        name: '슬라임 젤리 푸딩',
        ingredients: { '슬라임 젤리': 2, '딸기': 1 },
        resultItemId: 'item_slime_pudding',
        minLevel: 2
    },
    {
        id: 'recipe_goblin_ear_fry',
        name: '고블린 귀 튀김',
        ingredients: { '고블린 귀': 2, '식량': 2 },
        resultItemId: 'item_goblin_ear_fry',
        minLevel: 8,
        requiredTool: 'air_fryer'
    },
    {
        id: 'recipe_orc_tooth_soup',
        name: '오크 어금니 탕',
        ingredients: { '오크 어금니': 1, '식량': 5 },
        resultItemId: 'item_orc_tooth_soup',
        minLevel: 15,
        requiredTool: 'pot'
    },
    {
        id: 'recipe_shark_fin',
        name: '상어 지느러미 찜',
        ingredients: { '상어 지느러미': 1, '식량': 5 },
        resultItemId: 'item_shark_fin',
        minLevel: 25,
        requiredTool: 'pot'
    },
    {
        id: 'recipe_kraken_leg',
        name: '크라켄 다리 구이',
        ingredients: { '크라켄 다리': 2, '마늘': 2 },
        resultItemId: 'item_kraken_leg',
        minLevel: 20,
        requiredTool: 'oven'
    },
    {
        id: 'recipe_dragon_scale_fry',
        name: '드래곤 비늘 튀김',
        ingredients: { '드래곤 비늘': 1, '밀': 5 },
        resultItemId: 'item_dragon_scale_fry',
        minLevel: 40,
        requiredTool: 'air_fryer'
    },
    {
        id: 'recipe_vampire_cocktail',
        name: '뱀파이어 블러드 칵테일',
        ingredients: { '뱀파이어의 송곳니': 1, '포도': 3 },
        resultItemId: 'item_vampire_cocktail',
        minLevel: 22,
        requiredTool: 'blender'
    },
    {
        id: 'recipe_zombie_tartare',
        name: '좀비 살점 육회',
        ingredients: { '좀비의 썩은 살점': 2, '양파': 1 },
        resultItemId: 'item_zombie_tartare',
        minLevel: 10
    },
    {
        id: 'recipe_angel_cake',
        name: '엔젤 푸드 케이크',
        ingredients: { '엔젤의 후광 조각': 1, '밀': 3 },
        resultItemId: 'item_angel_cake',
        minLevel: 50,
        requiredTool: 'oven'
    },
    {
        id: 'recipe_rice_porridge',
        name: '쌀죽',
        ingredients: { '쌀': 3, '식량': 2 },
        resultItemId: 'item_rice_porridge',
        minLevel: 1,
        requiredTool: 'pot'
    },
    {
        id: 'recipe_herbal_tea',
        name: '특제 허브차',
        ingredients: { '약초': 2, '식량': 1 },
        resultItemId: 'item_herbal_tea',
        minLevel: 2,
        requiredTool: 'pot'
    },
    {
        id: 'recipe_mana_fruit_smoothie',
        name: '마력 열매 스무디',
        ingredients: { '마력 열매': 2, '포도': 2 },
        resultItemId: 'item_mana_fruit_smoothie',
        minLevel: 7,
        requiredTool: 'blender'
    },
    {
        id: 'recipe_vitality_stew',
        name: '활력 전골',
        ingredients: { '인삼': 1, '마늘': 2, '식량': 5 },
        resultItemId: 'item_vitality_stew',
        minLevel: 14,
        requiredTool: 'pot'
    },
    {
        id: 'recipe_golden_apple_juice',
        name: '황금 사과 주스',
        ingredients: { '황금 사과': 1, '딸기': 2 },
        resultItemId: 'item_golden_apple_juice',
        minLevel: 35,
        requiredTool: 'blender'
    }
];

export const COOKED_ITEMS: Record<string, Item> = {
    'item_vegetable_soup': {
        name: '야채 스프',
        type: 'Consumable',
        rarity: ItemRarity.NORMAL,
        description: '따뜻한 야채 스프입니다. HP를 100 회복하고 피로도를 15 회복합니다.',
        stats: { hp: 100 } as any,
        secondaryOptions: ['피로도 15 회복'],
        price: 1500,
    },
    'item_fruit_salad': {
        name: '과일 샐러드',
        type: 'Consumable',
        rarity: ItemRarity.MAGIC,
        description: '상큼한 과일 샐러드입니다. MP를 500 회복하고 피로도를 20 회복합니다.',
        stats: { mp: 500 } as any,
        secondaryOptions: ['피로도 20 회복'],
        price: 4500,
    },
    'item_ginseng_chicken': {
        name: '삼계탕',
        type: 'Consumable',
        rarity: ItemRarity.RARE,
        description: '기력 회복에 좋은 삼계탕입니다. 피로도를 45 회복하며 10턴 동안 모든 스탯이 일시적으로 5 증가합니다.',
        stats: { str: 5, int: 5, wis: 5, def: 5, agi: 5, ctrl: 5 } as any,
        secondaryOptions: ['피로도 45 회복', 'STR +5 (10턴)', 'INT +5 (10턴)', 'WIS +5 (10턴)', 'DEF +5 (10턴)', 'AGI +5 (10턴)', 'CTRL +5 (10턴)'],
        price: 50000,
    },
    'item_steak': {
        name: '스테이크',
        type: 'Consumable',
        rarity: ItemRarity.RARE,
        description: '든든한 스테이크입니다. HP를 300 회복하고 피로도를 25 회복합니다.',
        stats: { hp: 300 } as any,
        secondaryOptions: ['피로도 25 회복'],
        price: 80000,
    },
    'item_elixir': {
        name: '만능 영약',
        type: 'Consumable',
        rarity: ItemRarity.EPIC,
        description: '모든 것을 회복시키는 영약입니다. HP와 MP를 500 회복하며 피로도를 50 회복합니다.',
        stats: { hp: 500, mp: 500 } as any,
        secondaryOptions: ['피로도 50 회복'],
        price: 1200000,
    },
    'item_garlic_steak': {
        name: '마늘 스테이크',
        type: 'Consumable',
        rarity: ItemRarity.EPIC,
        description: '마늘 향이 가득한 스테이크입니다. 피로도를 30 회복하며 10턴 동안 STR이 일시적으로 10 증가합니다.',
        stats: { str: 10 } as any,
        secondaryOptions: ['피로도 30 회복', 'STR +10 (10턴)'],
        price: 350000,
    },
    'item_tomato_salad': {
        name: '토마토 샐러드',
        type: 'Consumable',
        rarity: ItemRarity.MAGIC,
        description: '신선한 토마토 샐러드입니다. MP를 100 회복하고 피로도를 15 회복합니다.',
        stats: { mp: 100 } as any,
        secondaryOptions: ['피로도 15 회복'],
        price: 12000,
    },
    'item_sweet_potato_pie': {
        name: '고구마 파이',
        type: 'Consumable',
        rarity: ItemRarity.RARE,
        description: '달콤한 고구마 파이입니다. HP를 200 회복하고 피로도를 20 회복합니다.',
        stats: { hp: 200 } as any,
        secondaryOptions: ['피로도 20 회복'],
        price: 95000,
    },
    'item_watermelon_juice': {
        name: '수박 주스',
        type: 'Consumable',
        rarity: ItemRarity.MAGIC,
        description: '시원한 수박 주스입니다. MP를 150 회복하고 피로도를 25 회복합니다.',
        stats: { mp: 150 } as any,
        secondaryOptions: ['피로도 25 회복'],
        price: 25000,
    },
    'item_rice_porridge': {
        name: '쌀죽',
        type: 'Consumable',
        rarity: ItemRarity.NORMAL,
        description: '부드러운 쌀죽입니다. HP를 50 회복하고 피로도를 15 회복합니다.',
        stats: { hp: 50 } as any,
        secondaryOptions: ['피로도 15 회복'],
        price: 1000,
    },
    'item_slime_pudding': {
        name: '슬라임 젤리 푸딩',
        type: 'Consumable',
        rarity: ItemRarity.NORMAL,
        description: '말랑말랑한 슬라임 젤리 푸딩입니다. HP를 50 회복하고 피로도를 10 회복합니다.',
        stats: { hp: 50 } as any,
        secondaryOptions: ['피로도 10 회복'],
        price: 2000,
    },
    'item_goblin_ear_fry': {
        name: '고블린 귀 튀김',
        type: 'Consumable',
        rarity: ItemRarity.NORMAL,
        description: '바삭한 고블린 귀 튀김입니다. 피로도를 15 회복하며 10턴 동안 STR이 일시적으로 5 증가합니다.',
        stats: { str: 5 } as any,
        secondaryOptions: ['피로도 15 회복', 'STR +5 (10턴)'],
        price: 15000,
    },
    'item_orc_tooth_soup': {
        name: '오크 어금니 탕',
        type: 'Consumable',
        rarity: ItemRarity.RARE,
        description: '진한 오크 어금니 탕입니다. HP를 200 회복하고 피로도를 30 회복합니다.',
        stats: { hp: 200 } as any,
        secondaryOptions: ['피로도 30 회복'],
        price: 150000,
    },
    'item_shark_fin': {
        name: '상어 지느러미 찜',
        type: 'Consumable',
        rarity: ItemRarity.EPIC,
        description: '고급 상어 지느러미 찜입니다. 피로도를 60 회복하며 10턴 동안 모든 스탯이 일시적으로 10 증가합니다.',
        stats: { str: 10, int: 10, wis: 10, def: 10, agi: 10, ctrl: 10 } as any,
        secondaryOptions: ['피로도 60 회복', 'STR +10 (10턴)', 'INT +10 (10턴)', 'WIS +10 (10턴)', 'DEF +10 (10턴)', 'AGI +10 (10턴)', 'CTRL +10 (10턴)'],
        price: 850000,
    },
    'item_kraken_leg': {
        name: '크라켄 다리 구이',
        type: 'Consumable',
        rarity: ItemRarity.RARE,
        description: '쫄깃한 크라켄 다리 구이입니다. HP를 400 회복하고 피로도를 40 회복합니다.',
        stats: { hp: 400 } as any,
        secondaryOptions: ['피로도 40 회복'],
        price: 300000,
    },
    'item_dragon_scale_fry': {
        name: '드래곤 비늘 튀김',
        type: 'Consumable',
        rarity: ItemRarity.EPIC,
        description: '전설적인 드래곤 비늘 튀김입니다. 피로도를 50 회복하며 10턴 동안 DEF가 일시적으로 20 증가합니다.',
        stats: { def: 20 } as any,
        secondaryOptions: ['피로도 50 회복', 'DEF +20 (10턴)'],
        price: 2800000,
    },
    'item_vampire_cocktail': {
        name: '뱀파이어 블러드 칵테일',
        type: 'Consumable',
        rarity: ItemRarity.RARE,
        description: '매혹적인 뱀파이어 블러드 칵테일입니다. MP를 300 회복하고 피로도를 35 회복합니다.',
        stats: { mp: 300 } as any,
        secondaryOptions: ['피로도 35 회복'],
        price: 320000,
    },
    'item_zombie_tartare': {
        name: '좀비 살점 육회',
        type: 'Consumable',
        rarity: ItemRarity.NORMAL,
        description: '기괴한 좀비 살점 육회입니다. HP를 150 회복하고 피로도를 10 회복하지만 MP가 50 감소합니다.',
        stats: { hp: 150, mp: -50 } as any,
        secondaryOptions: ['피로도 10 회복'],
        price: 18000,
    },
    'item_angel_cake': {
        name: '엔젤 푸드 케이크',
        type: 'Consumable',
        rarity: ItemRarity.EPIC,
        description: '천상의 맛 엔젤 푸드 케이크입니다. 피로도를 80 회복하며 10턴 동안 모든 스탯이 일시적으로 15 증가합니다.',
        stats: { str: 15, int: 15, wis: 15, def: 15, agi: 15, ctrl: 15 } as any,
        secondaryOptions: ['피로도 80 회복', 'STR +15 (10턴)', 'INT +15 (10턴)', 'WIS +15 (10턴)', 'DEF +15 (10턴)', 'AGI +15 (10턴)', 'CTRL +15 (10턴)'],
        price: 5000000,
    },
    'item_herbal_tea': {
        name: '특제 허브차',
        type: 'Consumable',
        rarity: ItemRarity.MAGIC,
        description: '심신을 편안하게 진정시키는 특제 허브차입니다. 피로도를 40 회복하고 MP를 200 회복합니다.',
        stats: { mp: 200 } as any,
        secondaryOptions: ['피로도 40 회복'],
        price: 25000,
    },
    'item_mana_fruit_smoothie': {
        name: '마력 열매 스무디',
        type: 'Consumable',
        rarity: ItemRarity.MAGIC,
        description: '달콤하고 시원한 마력 열매 스무디입니다. 피로도를 35 회복하고 MP를 300 회복합니다.',
        stats: { mp: 300 } as any,
        secondaryOptions: ['피로도 35 회복'],
        price: 45000,
    },
    'item_vitality_stew': {
        name: '활력 전골',
        type: 'Consumable',
        rarity: ItemRarity.RARE,
        description: '진한 국물로 원기를 채우는 활력 전골입니다. 피로도를 60 회복하고 HP를 350 회복합니다.',
        stats: { hp: 350 } as any,
        secondaryOptions: ['피로도 60 회복'],
        price: 180000,
    },
    'item_golden_apple_juice': {
        name: '황금 사과 주스',
        type: 'Consumable',
        rarity: ItemRarity.UNIQUE,
        description: '신비로운 황금 사과로 착즙한 영험한 주스입니다. 피로도를 100 회복하고 HP와 MP를 400 회복합니다.',
        stats: { hp: 400, mp: 400 } as any,
        secondaryOptions: ['피로도 100 회복'],
        price: 1200000,
    }
};

export interface CookedFoodConsumptionResult {
    isFood: boolean;
    hpGain: number;
    mpGain: number;
    fatigueReduction: number;
    newStatusEffects: { name: string; duration: number; effect: string }[];
    logMessages: string[];
}

export const handleCookedFoodConsumption = (item: Item): CookedFoodConsumptionResult => {
    const isCooked = Object.values(COOKED_ITEMS).some(c => c.name === item.name) ||
                     (item.id && Object.keys(COOKED_ITEMS).includes(item.id));

    if (!isCooked) {
        return { isFood: false, hpGain: 0, mpGain: 0, fatigueReduction: 0, newStatusEffects: [], logMessages: [] };
    }

    let hpGain = 0;
    let mpGain = 0;
    let fatigueReduction = 0;
    const newStatusEffects: { name: string; duration: number; effect: string }[] = [];
    const logMessages: string[] = [];

    // 피로도 회복 처리 (설명문 또는 보조 옵션에서 파싱)
    const combinedText = (item.name || '') + ' ' + (item.description || '') + ' ' + (item.secondaryOptions || []).join(' ');
    const fatigueMatch = combinedText.match(/피로도\s*(-?\d+)\s*(?:감소|회복)/);
    if (fatigueMatch) {
        fatigueReduction = Math.abs(parseInt(fatigueMatch[1], 10));
        logMessages.push(`${item.name}을(를) 맛있게 먹고 피로도가 ${fatigueReduction} 회복되었습니다.`);
    }

    // HP / MP 회복 처리
    if (item.stats?.hp) {
        hpGain += item.stats.hp;
        if (item.stats.hp > 0) {
            logMessages.push(`${item.name}을(를) 먹고 HP가 ${item.stats.hp} 회복되었습니다.`);
        } else {
            logMessages.push(`${item.name}을(를) 먹고 HP가 ${Math.abs(item.stats.hp)} 감소했습니다.`);
        }
    }
    if (item.stats?.mp) {
        mpGain += item.stats.mp;
        if (item.stats.mp > 0) {
            logMessages.push(`${item.name}을(를) 먹고 MP가 ${item.stats.mp} 회복되었습니다.`);
        } else {
            logMessages.push(`${item.name}을(를) 먹고 MP가 ${Math.abs(item.stats.mp)} 감소했습니다.`);
        }
    }

    // 모든 요리의 스탯 증가는 일시적 버프(10턴)로 적용
    const statKeys: (keyof Stats)[] = ['str', 'int', 'wis', 'def', 'agi', 'ctrl'];
    const statCodes: Record<string, string> = {
        str: 'STR', int: 'INT', wis: 'WIS', def: 'DEF', agi: 'AGI', ctrl: 'CTRL'
    };

    const buffLogs: string[] = [];
    statKeys.forEach(k => {
        const val = item.stats?.[k];
        if (typeof val === 'number' && val > 0) {
            const code = statCodes[k];
            newStatusEffects.push({
                name: `${item.name} (${code})`,
                duration: 10,
                effect: `${code} +${val}`
            });
            buffLogs.push(`${code} +${val}`);
        }
    });

    if (buffLogs.length > 0) {
        logMessages.push(`${item.name}의 요리 효과 적용: ${buffLogs.join(', ')} (10턴 일시 증가)`);
    }

    return {
        isFood: true,
        hpGain,
        mpGain,
        fatigueReduction,
        newStatusEffects,
        logMessages
    };
};
