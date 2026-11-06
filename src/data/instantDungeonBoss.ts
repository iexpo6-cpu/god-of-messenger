import { Enemy, ItemRarity, Item } from '../types';
import { generateEnemyStats } from '../utils';
import { processBossDetailedLoot } from '../services/bossLootBoostService';

// 등급별 기본 드랍 확률 설정 (현실적인 확률로 조정)
const getChanceByRarity = (rarity: ItemRarity): number => {
    switch (rarity) {
        case ItemRarity.MYTHTIC: return 0.01;   // 5%
        case ItemRarity.LEGENDARY: return 0.02; // 1%
        case ItemRarity.UNIQUE: return 0.03;    // 3%
        case ItemRarity.EPIC: return 0.05;      // 5%
        case ItemRarity.RARE: return 0.1;       // 10%
        default: return 0.15;                   // 15% (Normal/Magic)
    }
};

export const INSTANT_DUNGEON_COMMON_LOOT: any[] = [
    { name: "심연의 정수", item: "심연의 정수", type: "Etc", minLvl: 1, rarity: ItemRarity.RARE, description: "심연의 힘이 응축된 결정체입니다.", price: 500, imageUrl: "https://i.ibb.co/t9869kP/Gemini-Generated-Image-8pe71g8pe71g8pe7.png" },
    { name: "고대 금화", item: "고대 금화", type: "Etc", minLvl: 1, rarity: ItemRarity.MAGIC, description: "오래된 왕국의 금화입니다.", price: 300, imageUrl: "https://i.ibb.co/N6hyqXH8/Gemini-Generated-Image-mwobi2mwobi2mwob.png" },
    { name: "용의 비늘", item: "용의 비늘", type: "Etc", minLvl: 1, rarity: ItemRarity.EPIC, description: "드래곤의 단단한 비늘입니다.", price: 1500, imageUrl: "https://i.ibb.co/wNxmNqxB/Gemini-Generated-Image-6m1bdj6m1bdj6m1b.png" },
    { name: "마력 깃든 수정", item: "마력 깃든 수정", type: "Etc", minLvl: 1, rarity: ItemRarity.MAGIC, description: "마력이 희미하게 느껴지는 수정입니다.", price: 200, imageUrl: "https://i.ibb.co/VYkq0s4k/Gemini-Generated-Image-ooeaz2ooeaz2ooea.png" },
    { name: "저주받은 뼈", item: "저주받은 뼈", type: "Etc", minLvl: 1, rarity: ItemRarity.NORMAL, description: "불길한 기운이 감도는 뼈조각입니다.", price: 50, imageUrl: "https://i.ibb.co/LDSkhcRt/Gemini-Generated-Image-tmtetgtmtetgtmte.png" }
];

export const INSTANT_DUNGEON_BOSS_TEMPLATES: Partial<Enemy>[] = [
    {
        name: "심연의 군주 아즈갈론",
        id:"instant_azgalone",
        description: "심연의 밑바닥에서 기어올라온 거대한 악마 군주입니다. 그가 지나간 자리에는 절망만이 남습니다.",
        shinryokuType: "암흑계",
        level: 950,
        visualUrl:"https://i.ibb.co/4ZvJyct1/Gemini-Generated-Image-7qyusf7qyusf7qyu.png",
        dropTable: [
            { name: "심연의 학살자", type: "Weapon", weaponType: "Blunt",rarity: ItemRarity.LEGENDARY, minLvl: 900, description: "심연의 힘이 깃든 거대한 낫입니다.", price: 1500000, imageUrl: "https://i.ibb.co/FbYthm1S/Kakao-Talk-20260305-210442613-04.png", secondaryOptions: ["물리 공격력 +50%", "치명타율 +20%", "암흑계 속성 부여", "모든 스탯 +25%"] }
        ]
    },
     {
        name: "혹한의 서리왕 늑대",
        id:"instant_icewolf",
        description: "혹한의 서리 속에서 살아남은 늑대의 왕입니다.",
        shinryokuType: "빙결계",
        level: 300,
        visualUrl:"https://i.ibb.co/JFrCTwfL/Kakao-Talk-20260304-213656636.png",
        dropTable: [
            { name: "서리 늑대의 이빨 목걸이", type: "Accessory", rarity: ItemRarity.UNIQUE, minLvl: 100, description: "서리 늑대의 이빨로 만든 목걸이입니다.", imageUrl: "https://i.ibb.co/k2pLy5k5/Kakao-Talk-20260305-210442613-05.png", secondaryOptions: ["물리 공격력 +30%", "치명타율 +20%", "빙결계 속성 피해 +20%", "모든 스탯 +10%"] }
        ]
    },
     {
        name: "광기 어린 고블린 샤먼킹",
        id:"instant_goblinshamanking",
        description: "미쳐버린 고블린 샤먼의 왕입니다.",
        shinryokuType: "암흑계",
        level: 310,
        visualUrl:"https://i.ibb.co/TxJjWm7J/Kakao-Talk-20260304-214445425-02.png",
        dropTable: [
            { name: "광기의 고블린 스태프", type: "Weapon", weaponType:"Staff", rarity: ItemRarity.UNIQUE, minLvl: 100, description: "광기어린 고블린의 기운이 담긴 스태프입니다.", imageUrl: "https://i.ibb.co/k6X28SMs/Gemini-Generated-Image-yrua9dyrua9dyrua.png", secondaryOptions: ["마법 공격력 +30%", "마법 명중률 +20%", "암흑계 속성 부여", "WIS +10%"] }
        ]
    },
     {
        name: "묘지의 포식자 구울왕",
        id:"instant_tombgoulking",
        description: "묘지의 포식을 담당하는 구울의 왕입니다.",
        shinryokuType: "암흑계",
        level: 350,
        visualUrl:"https://i.ibb.co/xqQDBCHj/Kakao-Talk-20260304-214445425-01.png",
        dropTable: [
            { name: "구울의 뼈 몽둥이", type: "Weapon", weaponType:"Blunt",rarity: ItemRarity.UNIQUE, minLvl: 100, description: "구울의 큰 뼈로 만들어진 둔기입니다.", imageUrl: "https://i.ibb.co/YF23p5jp/Gemini-Generated-Image-3kxoeq3kxoeq3kxo.png", secondaryOptions: ["물리 공격력 +20%", "치명타율 +35%", "무기강화계 속성 부여", "모든 스탯 +15%"] }
        ]
    },
     {
        name: "늪지대의 포식자 히드라(1개의 머리)",
        id:"instant_hydraonehead",
        description: "늪지대를 포식하는 히드라입니다.",
        shinryokuType: "대지계",
        level: 340,
        visualUrl:"https://i.ibb.co/gMdsLJW9/Kakao-Talk-20260304-214445425.png",
        dropTable: [
            { name: "늪지대 히드라 비늘 갑주", type: "Body",rarity: ItemRarity.UNIQUE, minLvl: 100, description: "히드라의 비늘로 만든 갑주입니다.", imageUrl: "https://i.ibb.co/qFBLNrSh/Gemini-Generated-Image-bcp1mebcp1mebcp1.png", secondaryOptions: ["물리 방어력 +25%", "마법 방어력 +25%", "모든 속성 저항 +10%", "STR +10%"] }
        ]
    },
    {
        name: "타락한 성기사 로드릭",
        description: "신성력을 잃고 타락해버린 옛 성기사단장입니다. 그의 검은 이제 빛 대신 어둠을 내뿜습니다.",
        shinryokuType: "무기강화계",
        id:"instant_rodric",
        level: 550,
        visualUrl:"https://i.ibb.co/kg5WxfM7/Gemini-Generated-Image-lifm29lifm29lifm.png",
        dropTable: [
            { name: "타락한 성기사의 방패", type: "SubWeapon", rarity: ItemRarity.UNIQUE, minLvl: 550, description: "타락한 성기사가 사용하던 방패입니다.", price: 800000, imageUrl: "https://i.ibb.co/gZSYqVFK/Gemini-Generated-Image-zgc4vizgc4vizgc4.png", secondaryOptions: ["물리 방어력 +30%", "마법 방어력 +15%", "무기강화계 속성 저항 +20%", "HP +500"] }
        ]
    },
    {
        name: "고대 드래곤의 망령",
        id:"instant_ancientdragonghost",
        description: "죽어서도 이승을 떠돌며 보물을 지키는 드래곤의 영혼입니다. 강력한 브레스를 주의하십시오.",
        shinryokuType: "화염계",
        visualUrl:"https://i.ibb.co/qLnNRP6t/Gemini-Generated-Image-4vua894vua894vua.png",
        level: 980,
        dropTable: [

             { name: "드래곤 본 아머", type: "Body", rarity: ItemRarity.LEGENDARY, minLvl: 950, description: "용의 뼈로 만든 견고한 갑옷입니다.", price: 2000000, imageUrl: "https://i.ibb.co/C3sTHdTq/Gemini-Generated-Image-117a34117a34117a.png", secondaryOptions: ["HP +2000", "물리 방어력 +40%", "화염 속성 저항 +50%", "마법 방어력 + 10%"] }
        ]
    },
    {
        name: "숲의 포식자 맨티코어",
        id:"instant_manticore",
        description: "사람의 얼굴을 한 흉포한 식인 괴수입니다. 맹독 꼬리에 주의해야 합니다.",
        shinryokuType: "초화계",
        visualUrl:"https://i.ibb.co/Cqqx0ZD/Gemini-Generated-Image-7t9r9j7t9r9j7t9r.png",
        level: 350,
        dropTable: [
            { name: "맨티코어의 독침 단검", type: "SubWeapon", weaponType:"SubSword", rarity: ItemRarity.UNIQUE, minLvl: 300, description: "맹독이 흐르는 단검입니다.", price: 400000, imageUrl: "https://i.ibb.co/b8tP2K8/Gemini-Generated-Image-5woh1g5woh1g5woh.png", secondaryOptions: ["AGI +15%", "치명타 피해량 +30%", "초화계 속성 피해 +20%", "물리 공격력 + 10%"] }
        ]
    },
    {
        name: "얼음 마녀 엘사",
        id:"instant_elsa",
        description: "모든 것을 얼려버리는 차가운 심장의 마녀입니다. 그녀의 눈을 마주치면 얼어붙습니다.",
        shinryokuType: "빙결계",
        visualUrl:"https://i.ibb.co/YBNDK8s6/Gemini-Generated-Image-qrhk48qrhk48qrhk.png",
        level: 480,
        dropTable: [
             { name: "얼음 여왕의 티아라", type: "Head", rarity: ItemRarity.LEGENDARY, minLvl: 450, description: "냉기를 뿜어내는 왕관입니다.", price: 1000000, imageUrl: "https://i.ibb.co/tPxKcDbT/Gemini-Generated-Image-r88jhhr88jhhr88j.png", secondaryOptions: ["INT +30%", "마법 공격력 +30%", "빙결계 속성 저항 +20%", "MP +500"] }
        ]
    },
    {
        name: "화염의 거인 수르트",
        description: "세상을 불태울 거대한 화염의 거인입니다. 그의 검은 태양보다 뜨겁습니다.",
        shinryokuType: "화염계",
        id:"instant_surt",
        visualUrl:"https://i.ibb.co/PpNRFJT/Gemini-Generated-Image-yjjm9byjjm9byjjm.png",
        level: 800,
        dropTable: [
            { name: "파멸의 화염검", type: "Weapon", rarity: ItemRarity.LEGENDARY, minLvl: 750, description: "영원히 꺼지지 않는 불꽃이 타오르는 검입니다.", price: 1200000, imageUrl: "https://i.ibb.co/6c63hYdj/Gemini-Generated-Image-42vi6v42vi6v42vi.png", secondaryOptions: ["물리공격력 +40%", "화염계 속성 부여", "화염계 속성 피해 +20%", "STR +20%"] }
        ]
    },
    {
        name: "뇌전의 키메라",
        description: "사자, 염소, 뱀이 합쳐진 괴수입니다. 온몸에서 강력한 전류를 내뿜습니다.",
        shinryokuType: "전격계",
        id:"instant_kimera",
        level: 420,
        visualUrl:"https://i.ibb.co/yc4P8j6B/Gemini-Generated-Image-9lr67s9lr67s9lr6.png",
        dropTable: [
            { name: "뇌전의 발톱", type: "Weapon", rarity: ItemRarity.UNIQUE, minLvl: 400, description: "번개를 머금은 날카로운 발톱입니다.", price: 600000, imageUrl: "https://i.ibb.co/PzsR2T9L/Gemini-Generated-Image-ybdpm8ybdpm8ybdp.png", secondaryOptions: ["AGI +20%", "치명타율 +15%", "전격계 속성 부여", "물리 명중률 +20%"] }
        ]
    },
    {
        name: "거대 바위 골렘",
        description: "오랜 세월 동안 대지의 기운을 머금고 깨어난 거대한 바위 덩어리입니다.",
        shinryokuType: "대지계",
        id:"instant_golem",
        visualUrl:"https://i.ibb.co/GYT7GbL/Gemini-Generated-Image-bdt5n9bdt5n9bdt5.png",
        level: 350,
        dropTable: [
            { name: "대지의 심장", type: "Accessory", rarity: ItemRarity.UNIQUE, minLvl: 200, description: "골렘의 동력원이었던 보석입니다.", price: 300000, imageUrl: "https://i.ibb.co/jvk9L1hv/Gemini-Generated-Image-auy2qdauy2qdauy2.png", secondaryOptions: ["HP +1000", "물리 방어력 +20%", "대지계 속성 저항 +30%", "마법 방어력 +30%"] }
        ]
    },
    {
        name: "타락한 숲의 정령왕",
        description: "어둠의 마력에 오염되어 숲을 파괴하는 정령들의 왕입니다.",
        shinryokuType: "초화계",
        id:"instant_morinoking",
        visualUrl:"https://i.ibb.co/jPpGKr3y/Kakao-Talk-20260305-210442613.png",
        level: 700,
        dropTable: [
            { name: "세계수의 가지", type: "Weapon", rarity: ItemRarity.LEGENDARY, minLvl: 650, description: "오염을 정화할 수 있는 강력한 마력을 품은 지팡이입니다.", price: 1300000, imageUrl: "https://i.ibb.co/k2JWVqXr/Gemini-Generated-Image-x29ybex29ybex29y.png", secondaryOptions: ["마법 공격력 +45%", "초화계 속성 부여", "HP +30%", "INT +25%"] }
        ]
    },
    {
        name: "강철의 기계 거수",
        description: "고대 문명이 남긴 파괴 병기입니다. 온몸이 단단한 강철로 이루어져 있습니다.",
        shinryokuType: "강철계",
        id:"instant_steelmachine",
        visualUrl:"https://i.ibb.co/mVT3JgS9/Kakao-Talk-20260305-210442613-01.png",
        level: 850,
        dropTable: [
            { name: "초합금 동력로", type: "Accessory", rarity: ItemRarity.LEGENDARY, minLvl: 800, description: "기계 거수의 심장 역할을 하던 무한한 동력원입니다.", price: 1800000, imageUrl: "https://i.ibb.co/JwhSfH4Z/Gemini-Generated-Image-iijgoliijgoliijg.png", secondaryOptions: ["모든 스탯 +40%", "MP +5%", "강철계 속성 저항 +50%", "물리 회피율 +10%"] }
        ]
    },
    {
        name: "폭풍의 지배자",
        description: "거대한 토네이도를 형상화한 정령입니다. 모든 것을 날려버립니다.",
        shinryokuType: "질풍계",
         id:"instant_stormdomination",
        visualUrl:"https://i.ibb.co/gnfWfPn/Kakao-Talk-20260305-210442613-02.png",
        level: 900,
        dropTable: [
            { name: "폭풍의 눈", type: "Accessory", rarity: ItemRarity.LEGENDARY, minLvl: 850, description: "태풍의 중심에서 응축된 맑은 기운의 보석입니다.", price: 1900000, imageUrl: "https://i.ibb.co/v6TpRrKG/Gemini-Generated-Image-z2m7ntz2m7ntz2m7.png", secondaryOptions: ["물리 회피율 +30%", "STR +20%", "질풍계 속성 저항 +60%", "AGI +20%"] }
        ]
    },
    {
        name: "태양의 화신",
        description: "눈부신 빛과 열기를 뿜어내는 신성한 존재입니다. 사악한 자를 태워버립니다.",
        shinryokuType: "태양계",
         id:"instant_sundivine",
        visualUrl:"https://i.ibb.co/W49GXt8W/Kakao-Talk-20260305-210442613-03.png",
        level: 1000,
        dropTable: [
            { name: "태양신의 후광", type: "Head", rarity: ItemRarity.MYTHTIC, minLvl: 950, description: "태양의 힘을 직접적으로 다룰 수 있게 해주는 신물입니다.", price: 5000000, imageUrl: "https://i.ibb.co/Y4ptGR7m/Kakao-Talk-20260305-210442613-06.png", secondaryOptions: ["모든 스탯 +50%", "태양계 속성 피해 +50%", "상태이상 저항 +50%", "태양계 속성 저항 +30%"] }
        ]
    },
    {
        name: "달빛의 그림자",
        description: "어둠 속에서 조용히 다가오는 달빛의 암살자입니다.",
        shinryokuType: "월광계",
         id:"instant_moonshadow",
        visualUrl:"https://i.ibb.co/NgPN7XL8/Gemini-Generated-Image-25yuml25yuml25yu.png",
        level: 400,
        dropTable: [
            { name: "월광의 반지", type: "Accessory", rarity: ItemRarity.UNIQUE, minLvl: 250, description: "은은한 달빛을 머금은 반지입니다.", price: 350000, imageUrl: "https://i.ibb.co/N2VvgH4D/Gemini-Generated-Image-3lfqya3lfqya3lfq.png", secondaryOptions: ["경험치 획득량 +30%", "월광 속성 저항 +20%", "INT +40%", "마법 명중률 +10%"] }
        ]
    }
];

export const generateInstantDungeonBoss = (level?: number): { boss: Enemy, loot: Item[] } => {
    const template = INSTANT_DUNGEON_BOSS_TEMPLATES[Math.floor(Math.random() * INSTANT_DUNGEON_BOSS_TEMPLATES.length)];
    const bossLevel = template.level || level || Math.floor(Math.random() * 801) + 200; 
    const stats = generateEnemyStats(bossLevel, 'boss');

    // 보스 보정: 체력 대폭 증가
    stats.maxHp *= 5;
    stats.hp = stats.maxHp;
    stats.maxMp *= 2;
    stats.mp = stats.maxMp;

    const bossName = template.name?.includes('[BOSS]') ? template.name : `[BOSS] ${template.name}`;

    const boss: Enemy = {
        name: bossName,
        isBoss: true,
        level: bossLevel,
        hp: stats.maxHp,
        maxHp: stats.maxHp,
        stats: stats,
        description: template.description!,
        skills: [],
        shinryokuType: template.shinryokuType!,
        dropTable: template.dropTable || [],
        detailedLoot: template.dropTable || [],
        statusEffects: [],
        visualUrl: template.visualUrl || "https://i.ibb.co/4ZvJyct1/Gemini-Generated-Image-7qyusf7qyusf7qyu.png"
    };

    // 전리품 생성 로직 (보스 드랍 + 공용 전리품)
    const loot: Item[] = [];
    
    // 1. 보스 고유 드랍 (던전 보스 클리어 특전 드랍율 상향 적용 및 보스부스트 롤링 적용)
    if (boss.dropTable && boss.dropTable.length > 0) {
        boss.dropTable.forEach(item => {
            const chance = Math.max(0.35, getChanceByRarity(item.rarity) * 10);
            if (Math.random() < chance || boss.dropTable!.length === 1) {
                const rawItem = { ...item, name: item.name || (item as any).item };
                try {
                    const processed = processBossDetailedLoot(rawItem);
                    loot.push(processed);
                } catch {
                    loot.push(rawItem);
                }
            }
        });
    }

    // 2. 공용 전리품 랜덤 추가 (1~3개 확정 지급)
    const commonCount = Math.floor(Math.random() * 3) + 1;
    for (let i = 0; i < commonCount; i++) {
        const randomCommon = INSTANT_DUNGEON_COMMON_LOOT[Math.floor(Math.random() * INSTANT_DUNGEON_COMMON_LOOT.length)];
        loot.push({ ...randomCommon, name: randomCommon.name || randomCommon.item });
    }

    return { boss, loot };
};


