
import { ItemRarity, Item } from './types';
import { ASIA_MONSTER_LOOT } from './asiamonsterfield';
import { EUROPE_MONSTER_LOOT } from './europemonsterfield';
import { AMERICA_MONSTER_LOOT } from './americamonsterfield';
import { AFRICA_MONSTER_LOOT } from './africamonsterfield';
import { MAGYE_MONSTER_LOOT } from './magyemonsterfield';
import { DIVINE_MONSTER_LOOT } from './divinemonsterfield';
import { ELF_MONSTER_LOOT } from './elfmonsterloot';
import { BEAST_MONSTER_LOOT } from './beastmonsterloot';
import { DEMON_MONSTER_LOOT } from './demonmonsterloot';
import { DETAILED_BOSSES } from './bossMonsters';
import { EUROPE_BOSSES } from './europeBossMonsters';
import { AMERICA_BOSSES } from './americabossmonster';
import { ASIA_BOSSES } from './asiabossmonster';
import { AFRICA_BOSSES } from './africabossmonster';
import { FANTASY_BOSSES } from './fantasybossmonster';
import { DIVINE_REALM_BOSSES } from './divineRealmbossmonsters';    
import { SEASONAL_BOSSES, SEASONAL_BOSS_CONFIG } from './mythicbossmonsters';

/**
 * 아이템 종류별 기본 이미지 반환
 */


const getFallbackImage = (type: string) => {
    if (!type) return "https://i.ibb.co/6RsrXBZW/image.png";
    if (type.includes('Weapon')) return "https://i.ibb.co/Kz56VGDS/image.png";
    if (type.includes('Body') || type.includes('Armor') || type.includes('Head') || type.includes('Feet') || type.includes('Hand')) return "https://i.ibb.co/P9TfV9W1/armor.png";
    if (type.includes('Consumable')) return "https://i.ibb.co/CpZ5dPkw/image.png";
    return "https://i.ibb.co/6RsrXBZW/image.png";
};

// 범용 전리품 테이블
export const COMMON_LOOT_TABLES: Record<string, any[]> = {
    'boss': [
        { name: "마력석", type: 'Etc', chance: 0.05, minLvl: 1, rarity: ItemRarity.RARE,imageUrl: "https://i.ibb.co/LzN2nMJx/Gemini-Generated-Image-ot9wlfot9wlfot9w.png"},
        { name: "희귀한 보석", type: 'Etc', chance: 0.05, minLvl: 20, rarity: ItemRarity.EPIC,imageUrl:"https://i.ibb.co/kN3MjSm/Gemini-Generated-Image-cmj8pmcmj8pmcmj8.png" },
        { name: "상급 포션 세트", type: 'Consumable', chance: 0.1, minLvl: 10, rarity: ItemRarity.MAGIC, secondaryOptions:["HP 2500 회복", "MP 2500 회복"],imageUrl:"https://i.ibb.co/Lhnm5v1R/Gemini-Generated-Image-73pxa73pxa73pxa7.png" },
     { name: "용사의 증표", type: 'Etc', chance: 0.03, minLvl: 30, rarity: ItemRarity.UNIQUE,imageUrl:"https://i.ibb.co/PZdTg3K3/Gemini-Generated-Image-meuc59meuc59meuc.png" },
        { name: "보스 영혼석", type: 'Etc', chance: 0.01, minLvl: 40, rarity: ItemRarity.LEGENDARY,imageUrl:"https://i.ibb.co/84zHFCyt/Gemini-Generated-Image-nbsdr6nbsdr6nbsd.png" },
        { name: "고대 문서", type: 'Etc', chance: 0.05, minLvl: 25, rarity: ItemRarity.RARE,imageUrl:"https://i.ibb.co/XxVPH4F3/Gemini-Generated-Image-8hr48v8hr48v8hr4.png" },
        { name: "드래곤의 비늘", type: 'Etc', chance: 0.01, minLvl: 50, rarity: ItemRarity.LEGENDARY,imageUrl:"https://i.ibb.co/5hqNrm16/Gemini-Generated-Image-j5fc6lj5fc6lj5fc.png" }
    ],
    'generic': [
        { name: "작은 뼛조각", type: 'Etc', chance: 0.01, minLvl: 1, rarity: ItemRarity.NORMAL,imageUrl:"https://i.ibb.co/bM0MTqn6/Gemini-Generated-Image-k1mtjuk1mtjuk1mt.png" },
        { name: "최하급 HP 포션", type: 'Consumable', chance: 0.01, minLvl: 1, rarity: ItemRarity.NORMAL, secondaryOptions:["HP 50 회복"],imageUrl: "https://i.ibb.co/7dckmsMV/1.png" },
        { name: "하급 HP 포션", type: 'Consumable', chance: 0.005, minLvl: 30, rarity: ItemRarity.NORMAL, secondaryOptions:["HP 200 회복"],imageUrl: "https://i.ibb.co/7dckmsMV/1.png" },
        { name: "중급 HP 포션", type: 'Consumable', chance: 0.002, minLvl: 100, rarity: ItemRarity.MAGIC, secondaryOptions:["HP 800 회복"],imageUrl: "https://i.ibb.co/p6x1061S/2.png" },
        { name: "상급 HP 포션", type: 'Consumable', chance: 0.001, minLvl: 200, rarity: ItemRarity.RARE, secondaryOptions:["HP 2000 회복"],imageUrl: "https://i.ibb.co/FLhVqT71/3.png" },
        { name: "최상급 HP 포션", type: 'Consumable', chance: 0.0005, minLvl: 300, rarity: ItemRarity.EPIC, secondaryOptions:["HP 50% 회복"],imageUrl: "https://i.ibb.co/d0RXmrDH/4.png" },
        { name: "최하급 MP 포션", type: 'Consumable', chance: 0.01, minLvl: 1, rarity: ItemRarity.NORMAL, secondaryOptions:["MP 30 회복"],imageUrl: "https://i.ibb.co/C5hhmbWb/1.png" },
        { name: "하급 MP 포션", type: 'Consumable', chance: 0.005, minLvl: 30, rarity: ItemRarity.NORMAL, secondaryOptions:["MP 100 회복"],imageUrl: "https://i.ibb.co/C5hhmbWb/1.png" },
        { name: "중급 MP 포션", type: 'Consumable', chance: 0.002, minLvl: 100, rarity: ItemRarity.MAGIC, secondaryOptions:["MP 400 회복"],imageUrl: "https://i.ibb.co/7tbS30zM/2.png" },
        { name: "상급 MP 포션", type: 'Consumable', chance: 0.001, minLvl: 200, rarity: ItemRarity.RARE, secondaryOptions:["MP 1000 회복"],imageUrl: "https://i.ibb.co/chRFk45B/3.png" },
        { name: "최상급 MP 포션", type: 'Consumable', chance: 0.0005, minLvl: 300, rarity: ItemRarity.EPIC, secondaryOptions:["MP 50% 회복"],imageUrl: "https://i.ibb.co/wrjpC0sv/4.png" },
        { name: "엘릭서", type: 'Consumable', chance: 0.0001, minLvl: 500, rarity: ItemRarity.UNIQUE, secondaryOptions:["HP 100% 회복", "MP 100% 회복"],imageUrl: "https://i.ibb.co/cSZMwD69/5.png" }, 
        { name: "가죽 조각", type: 'Etc', chance: 0.01, minLvl: 1, rarity: ItemRarity.NORMAL,imageUrl: "https://i.ibb.co/CpVkKTB9/Gemini-Generated-Image-ozfn11ozfn11ozfn.png"},
        { name: "작은 돌", type: 'Etc', chance: 0.01, minLvl: 10, rarity: ItemRarity.NORMAL,imageUrl:"https://i.ibb.co/mF5Lcp0j/Gemini-Generated-Image-loawr9loawr9loaw.png" }
        ,{ name: "은은한 마나 결정", type: 'Etc', chance: 0.015, minLvl: 10, rarity: ItemRarity.MAGIC, imageUrl: "https://i.ibb.co/PGQfVtPX/image.png", description: "마나가 희미하게 남아있는 결정체입니다." }
        ,{ name: "오래된 양피지", type: 'Etc', chance: 0.02, minLvl: 5, rarity: ItemRarity.NORMAL, imageUrl: "https://i.ibb.co/gZbLzjQP/Gemini-Generated-Image-54ql5y54ql5y54ql.png", description: "내용을 알 수 없는 낡은 종이입니다." }
        ,{ name: "빛을 잃은 코어", type: 'Etc', chance: 0.008, minLvl: 20, rarity: ItemRarity.RARE, imageUrl: "https://i.ibb.co/cSNfsgRH/Gemini-Generated-Image-y3cyc9y3cyc9y3cy.png", description: "마력이 다해버린 코어 잔해입니다." }
        ,{ name: "정령의 숨결", type: 'Etc', chance: 0.005, minLvl: 40, rarity: ItemRarity.EPIC, imageUrl: "https://i.ibb.co/gMcQtP5B/Gemini-Generated-Image-uzexnjuzexnjuzex.png", description: "정령의 힘이 깃든 신비로운 가루입니다." }
        ,{ name: "심연의 모래", type: 'Etc', chance: 0.003, minLvl: 50, rarity: ItemRarity.UNIQUE, imageUrl: "https://i.ibb.co/gMh6XCbT/Gemini-Generated-Image-54gz1454gz1454gz.png", description: "아득한 심연에서 퍼올려진 검은 모래입니다." }
        ,{ name: "마력석 조각", type: 'Etc', chance: 0.03, minLvl: 1, rarity: ItemRarity.NORMAL, imageUrl: "https://i.ibb.co/0R6fhPCL/Gemini-Generated-Image-xayve1xayve1xayv.png", description: "조금이나마 마력이 담긴 돌조각입니다." }
        ,{ name: "빛나는 광석", type: 'Etc', chance: 0.01, minLvl: 35, rarity: ItemRarity.MAGIC, imageUrl: "https://i.ibb.co/BSxdpMY/Gemini-Generated-Image-wg20l5wg20l5wg20.png", description: "은은한 빛을 뿜는 신비한 광석입니다." }
        ,{ name: "전설의 고대 주화", type: 'Etc', chance: 0.002, minLvl: 80, rarity: ItemRarity.LEGENDARY, imageUrl: "https://i.ibb.co/MDCTmrsc/Gemini-Generated-Image-3msueu3msueu3msu.png", description: "잊혀진 제국의 순금 주화입니다. 엄청난 가치를 지닙니다." }
        ,{ name: "약초", type: 'Consumable', chance: 0.03, minLvl: 1, rarity: ItemRarity.NORMAL, secondaryOptions: ["HP 40 회복"], imageUrl: "https://i.ibb.co/Y4F8KZg5/2026-09-09-152748.png", description: "주변에서 흔히 볼 수 있는 지혈초입니다." }
        ,{ name: "활력의 뿌리", type: 'Consumable', chance: 0.01, minLvl: 15, rarity: ItemRarity.MAGIC, secondaryOptions: ["HP 300 회복", "MP 100 회복"], imageUrl: "https://i.ibb.co/ycPgdfkt/2026-09-09-152758.png", description: "씹으면 힘이 솟는 쌉쌀한 뿌리입니다." }
        ,{ name: "정제된 마나수", type: 'Consumable', chance: 0.005, minLvl: 45, rarity: ItemRarity.RARE, secondaryOptions: ["MP 600 회복"], imageUrl: "https://i.ibb.co/dswn2fdt/2026-09-09-152803.png", description: "순수하게 정제된 마력을 액체로 굳힌 물약입니다." }
        ,{ name: "세계수의 이슬", type: 'Consumable', chance: 0.001, minLvl: 120, rarity: ItemRarity.UNIQUE, secondaryOptions: ["HP 3000 회복", "MP 3000 회복"], imageUrl: "https://i.ibb.co/d022Zmw6/2026-09-09-152831.png", description: "세계수의 잎사귀에서 맺힌 신성한 이슬입니다." }
        ,{ name: "여신의 눈물", type: 'Consumable', chance: 0.0001, minLvl: 250, rarity: ItemRarity.LEGENDARY, secondaryOptions: ["HP 100% 회복", "MP 100% 회복"], imageUrl: "https://i.ibb.co/21K0GzQd/2026-09-09-152856.png", description: "신의 가호가 담긴 기적의 영약입니다." }
        ,{ name: "초보자의 목걸이", type: 'Accessory', chance: 0.004, minLvl: 5, rarity: ItemRarity.NORMAL, secondaryOptions: ["최대 HP +20"], imageUrl: "https://i.ibb.co/TDzxz2Mv/2026-09-09-152917.png", description: "이제 막 여행을 시작한 이들을 위한 소박한 목걸이입니다." }
        ,{ name: "바람의 반지", type: 'Accessory', chance: 0.005, minLvl: 25, rarity: ItemRarity.MAGIC, secondaryOptions: ["AGI +5"], imageUrl: "https://i.ibb.co/M5t9FspR/2026-09-09-152943.png", description: "몸을 가볍게 만들어주는 산뜻한 반지입니다." }
        ,{ name: "지혜의 귀걸이", type: 'Accessory', chance: 0.003, minLvl: 40, rarity: ItemRarity.RARE, secondaryOptions: ["INT +15", "WIS +10"], imageUrl: "https://i.ibb.co/hxNBfGVQ/2026-09-09-153009.png", description: "정신을 맑게 해주는 보석 귀걸이입니다." }
        ,{ name: "투사의 허리띠", type: 'Accessory', chance: 0.001, minLvl: 70, rarity: ItemRarity.EPIC, secondaryOptions: ["STR +30", "DEF +20"], imageUrl: "https://i.ibb.co/6cFs0TQq/2026-09-09-153031.png", description: "거친 투기를 품고 있는 가죽 허리띠입니다." }
        ,{ name: "시간의 팔찌", type: 'Accessory', chance: 0.0005, minLvl: 150, rarity: ItemRarity.UNIQUE, secondaryOptions: ["모든 스탯 +20", "치명타율 +5%"], imageUrl: "https://i.ibb.co/DHtP3QzT/2026-09-09-153104.png", description: "시간의 흐름을 조금 비틀 수 있는 신비한 장신구입니다." }
        ,{ name: "녹슨 철검", type: 'Weapon', weaponType: 'Sword', chance: 0.01, minLvl: 1, rarity: ItemRarity.NORMAL, secondaryOptions: ["물리 공격력 +5"], imageUrl: "https://i.ibb.co/VWZsYkKT/2026-09-09-153128.png", description: "이빨이 다 빠져버린 낡은 철검입니다." }
        ,{ name: "수련용 단검", type: 'Weapon', weaponType: 'Dagger', chance: 0.01, minLvl: 1, rarity: ItemRarity.NORMAL, secondaryOptions: ["물리 공격력 +3", "AGI +2"], imageUrl: "https://i.ibb.co/Kcn4T0s9/2026-09-09-153152.png", description: "초보자가 훈련할 때 쓰는 뭉툭한 단검입니다." }
        ,{ name: "참나무 지팡이", type: 'Weapon', weaponType: 'Staff', chance: 0.01, minLvl: 1, rarity: ItemRarity.NORMAL, secondaryOptions: ["마법 공격력 +6"], imageUrl: "https://i.ibb.co/3m7xgqRk/2026-09-09-153217.png", description: "길가의 참나무를 대충 깎아 만든 지팡이입니다." }
        ,{ name: "강철 롱소드", type: 'Weapon', weaponType: 'Sword', chance: 0.004, minLvl: 20, rarity: ItemRarity.MAGIC, secondaryOptions: ["물리 공격력 +25", "STR +5"], imageUrl: "https://i.ibb.co/CpLdXssq/2026-09-09-153246.png", description: "단단하게 제련된 정석적인 장검입니다." }
        ,{ name: "사냥꾼의 활", type: 'Weapon', weaponType: 'Bow', chance: 0.004, minLvl: 20, rarity: ItemRarity.MAGIC, secondaryOptions: ["물리 공격력 +20", "AGI +10"], imageUrl: "https://i.ibb.co/Jw8sX9sb/2026-09-09-153327.png", description: "짐승을 잡기 위해 장력이 팽팽하게 세팅된 활입니다." }
        ,{ name: "낡은 가죽 갑옷", type: 'Body', chance: 0.01, minLvl: 1, rarity: ItemRarity.NORMAL, secondaryOptions: ["물리 방어력 +5"], imageUrl: "https://i.ibb.co/mCFwTdsB/2026-09-09-154121.png", description: "헤지고 낡은 싸구려 가죽 갑옷입니다." }
        ,{ name: "천 모자", type: 'Head', chance: 0.01, minLvl: 1, rarity: ItemRarity.NORMAL, secondaryOptions: ["마법 방어력 +3"], imageUrl: "https://i.ibb.co/p6vTdVGF/2026-09-09-153350.png", description: "햇빛만 겨우 가려주는 얇은 모자입니다." }
        ,{ name: "여행자의 장화", type: 'Feet', chance: 0.008, minLvl: 5, rarity: ItemRarity.NORMAL, secondaryOptions: ["물리 방어력 +2", "AGI +1"], imageUrl: "https://i.ibb.co/xtbDw40N/2026-09-09-153418.png", description: "오랜 여정을 버티게 해줄 튼튼한 장화입니다." }
        ,{ name: "철갑 투구", type: 'Head', chance: 0.003, minLvl: 30, rarity: ItemRarity.MAGIC, secondaryOptions: ["물리 방어력 +15", "최대 HP +50"], imageUrl: "https://i.ibb.co/xxHmxJm/2026-09-09-153442.png", description: "머리를 단단히 보호하는 무거운 철판 투구입니다." }
        ,{ name: "수호자의 건틀릿", type: 'Hand', chance: 0.001, minLvl: 60, rarity: ItemRarity.RARE, secondaryOptions: ["물리 방어력 +30", "STR +10"], imageUrl: "https://i.ibb.co/bRFkLfZb/2026-09-09-153502.png", description: "강력한 충격을 분산시키는 고급 장갑입니다." }
        ,{ name: "마법사의 주문서", type: 'Etc', chance: 0.004, minLvl: 15, rarity: ItemRarity.MAGIC, imageUrl: "https://i.ibb.co/cSsyvjcC/2026-09-09-153525.png", description: "알 수 없는 언어로 마법이 깃든 스크롤입니다." }
        ,{ name: "요정의 가루", type: 'Etc', chance: 0.003, minLvl: 35, rarity: ItemRarity.RARE, imageUrl: "https://i.ibb.co/Xkjxt6dL/2026-09-09-153544.png", description: "반짝거리는 신비한 가루, 공예나 연금술에 쓰입니다." }
    ],
    'beast': [
        { name: "짐승의 가죽", type: 'Etc', chance: 0.01, minLvl: 1, rarity: ItemRarity.NORMAL,imageUrl:"https://i.ibb.co/zTpv2tS4/Gemini-Generated-Image-hyb4kbhyb4kbhyb4.png" },
        { name: "날카로운 이빨", type: 'Etc', chance: 0.01, minLvl: 5, rarity: ItemRarity.NORMAL,imageUrl:"https://i.ibb.co/NgRk4hgq/Gemini-Generated-Image-8adowo8adowo8ado.png" },
        { name: "고기", type: 'Consumable', chance: 0.01, minLvl: 1, rarity: ItemRarity.NORMAL, secondaryOptions:["HP 30 회복"], imageUrl:"https://i.ibb.co/SwJfJ5XV/Gemini-Generated-Image-fz4p7ufz4p7ufz4p.png" },
        { name: "야수의 발톱", type: 'Etc', chance: 0.01, minLvl: 15, rarity: ItemRarity.MAGIC,imageUrl: "https://i.ibb.co/RG0D0X9q/Gemini-Generated-Image-6fs6ct6fs6ct6fs6.png"}
    ],
    'undead': [
        { name: "부러진 뼈", type: 'Etc', chance: 0.01, minLvl: 1, rarity: ItemRarity.NORMAL,imageUrl: "https://i.ibb.co/RTwjMSx9/Gemini-Generated-Image-l8j9iml8j9iml8j9.png"},
        { name: "저주받은 천", type: 'Etc', chance: 0.01, minLvl: 10, rarity: ItemRarity.NORMAL,imageUrl: "https://i.ibb.co/pv69W1jn/Gemini-Generated-Image-pp0s7mpp0s7mpp0s.png"},
        { name: "해골 반지", type: 'Accessory', chance: 0.01, minLvl: 20, rarity: ItemRarity.MAGIC,imageUrl:"https://i.ibb.co/xVjCbw7/Gemini-Generated-Image-na3aj9na3aj9na3a.png" },
        { name: "어둠의 정수", type: 'Etc', chance: 0.01, minLvl: 30, rarity: ItemRarity.RARE,imageUrl:"https://i.ibb.co/MxYj9Y4f/Gemini-Generated-Image-1qcd0q1qcd0q1qcd.png" }
    ],
    'slime': [
        { name: "슬라임 젤리", type: 'Etc', chance: 0.02, minLvl: 1, rarity: ItemRarity.NORMAL,imageUrl: "https://i.ibb.co/353hrGXj/Gemini-Generated-Image-svpa3dsvpa3dsvpa.png"},
        { name: "끈적한 액체", type: 'Etc', chance: 0.02, minLvl: 1, rarity: ItemRarity.NORMAL,imageUrl: "https://i.ibb.co/93109NKs/Gemini-Generated-Image-pc7kjwpc7kjwpc7k.png"}
    ]
};

// 등급별 기본 드랍 확률 설정 (현실적인 확률로 조정)
export const getChanceByRarity = (rarity?: ItemRarity): number => {
    switch (rarity) {
        case ItemRarity.MYTHTIC: return 0.03;   // 3%
        case ItemRarity.LEGENDARY: return 0.05; // 5%
        case ItemRarity.UNIQUE: return 0.07;    // 7%
        case ItemRarity.EPIC: return 0.08;      // 8%
        case ItemRarity.RARE: return 0.1;       // 10%
        default: return 0.15;                   // 15% (Normal/Magic)
    }
};

// 보스 전용 아이템 추출 및 통합
const extractBossLoot = () => {
    const bossLootMap: Record<string, any[]> = {};
    const seasonalBossToNations: Record<string, Set<string>> = {};
    Object.values(SEASONAL_BOSS_CONFIG).forEach(monthConfigs => {
        monthConfigs.forEach(cfg => {
            if (!seasonalBossToNations[cfg.bossKey]) seasonalBossToNations[cfg.bossKey] = new Set();
            seasonalBossToNations[cfg.bossKey].add(cfg.nation);
        });
    });
  const processBossSource = (source: Record<string, any>, isSeasonal: boolean = false) => {
        for (const key in source) {
            const entry = source[key];
            if (isSeasonal) {
                const nations = seasonalBossToNations[key];
                if (nations && entry.detailedLoot) {
                    const lootList = Array.isArray(entry.detailedLoot) ? entry.detailedLoot : [entry.detailedLoot];
                    nations.forEach(nation => {
                        if (!bossLootMap[nation]) bossLootMap[nation] = [];
                        lootList.forEach(loot => {
                            // 중복 체크 로직 수정: 이미 같은 이름의 아이템이 있다면 droppedBy에 보스만 추가
                            const existingLoot = bossLootMap[nation].find(l => (l.item || l.name) === loot.name);
                            if (existingLoot) {
                                if (!existingLoot.droppedBy.includes(entry.id)) {
                                    existingLoot.droppedBy.push(entry.id);
                                }
                            } else {
                                bossLootMap[nation].push({
                                    item: loot.name,
                                    ...loot,
                                    droppedBy: [entry.id],
                                    chance: getChanceByRarity(loot.rarity),
                                    minLvl: 1,
                                    imageUrl: loot.imageUrl || getFallbackImage(loot.type)
                                });
                            }
                        });
                    });
                }
            } else if (typeof entry === 'object') {
                for (const cityKey in entry) {
                    const bossData = entry[cityKey];
                    if (bossData.detailedLoot) {
                        const nation = key;
                        if (!bossLootMap[nation]) bossLootMap[nation] = [];
                        const lootList = Array.isArray(bossData.detailedLoot) ? bossData.detailedLoot : [bossData.detailedLoot];
                        lootList.forEach(loot => {
                            const existingLoot = bossLootMap[nation].find(l => (l.item || l.name) === loot.name);
                            if (existingLoot) {
                                if (!existingLoot.droppedBy.includes(bossData.id)) {
                                    existingLoot.droppedBy.push(bossData.id);
                                }
                            } else {
                                bossLootMap[nation].push({
                                    item: loot.name,
                                    ...loot,
                                    droppedBy: [bossData.id],
                                    chance: getChanceByRarity(loot.rarity),
                                    minLvl: 1,
                                    imageUrl: loot.imageUrl || getFallbackImage(loot.type)
                                });
                            }
                        });
                    }
                }
            }
        }
    };
    processBossSource(DETAILED_BOSSES);
    processBossSource(EUROPE_BOSSES);
    processBossSource(AMERICA_BOSSES);
    processBossSource(ASIA_BOSSES);
    processBossSource(AFRICA_BOSSES);
    processBossSource(DIVINE_REALM_BOSSES);
    processBossSource(FANTASY_BOSSES);
    processBossSource(SEASONAL_BOSSES, true);
    return bossLootMap;
};

import { INSTANT_DUNGEON_BOSS_TEMPLATES, INSTANT_DUNGEON_COMMON_LOOT } from './data/instantDungeonBoss';

// ... (existing imports)

// ... (existing code)

const BOSS_EXCLUSIVE_LOOT = extractBossLoot();

// [NEW] 인스턴트 던전 보스 전리품 추출 및 통합
const extractInstantDungeonBossLoot = () => {
    const lootList: any[] = [];
    INSTANT_DUNGEON_BOSS_TEMPLATES.forEach(boss => {
        if (boss.dropTable) {
            boss.dropTable.forEach(item => {
                // 중복 체크
                if (!lootList.find(l => l.item === item.name)) {
                     lootList.push({
                        item: item.name,
                        ...item,
                        droppedBy: [boss.name],
                        chance: getChanceByRarity(item.rarity) || 0.1, // 기본 확률
                        minLvl: 1,
                        imageUrl: item.imageUrl || "https://i.ibb.co/6RsrXBZW/image.png"
                    });
                }
            });
        }
    });
    return lootList;
};

const INSTANT_DUNGEON_LOOT_INTEGRATED = extractInstantDungeonBossLoot();

export const WORLD_LOOT_TABLES: Record<string, any[]> = {
    ...ASIA_MONSTER_LOOT,
    ...EUROPE_MONSTER_LOOT,
    ...AMERICA_MONSTER_LOOT,
    ...AFRICA_MONSTER_LOOT,
    ...MAGYE_MONSTER_LOOT,
    ...DIVINE_MONSTER_LOOT,
    ...ELF_MONSTER_LOOT,
    ...BEAST_MONSTER_LOOT,
    ...DEMON_MONSTER_LOOT,
    ...COMMON_LOOT_TABLES,
};

// [NEW] 범용 전리품 테이블을 각 국가 테이블에 병합
// 1. 'generic' 전리품은 모든 국가 테이블에 기본적으로 추가
const genericLoot = COMMON_LOOT_TABLES['generic'] || [];
for (const nation in WORLD_LOOT_TABLES) {
    // 국가 이름인 경우에만 (generic, beast 등 특수 키 제외)
    if (!['generic', 'beast', 'undead', 'slime', 'boss', 'instant_dungeon'].includes(nation)) {
        WORLD_LOOT_TABLES[nation] = [...WORLD_LOOT_TABLES[nation], ...genericLoot];
    }
}

// 2. 기타 특수 공통 테이블 병합 (기존 로직 유지 및 보강)
for (const key in COMMON_LOOT_TABLES) {
    if (key === 'generic') continue; // 위에서 처리함
    if (WORLD_LOOT_TABLES[key]) {
        WORLD_LOOT_TABLES[key] = [...WORLD_LOOT_TABLES[key], ...COMMON_LOOT_TABLES[key]];
    } else {
        WORLD_LOOT_TABLES[key] = COMMON_LOOT_TABLES[key];
    }
}

// 인스턴트 던전 전리품 테이블에 보스 드랍 아이템 추가
if (WORLD_LOOT_TABLES['instant_dungeon']) {
    WORLD_LOOT_TABLES['instant_dungeon'] = [...WORLD_LOOT_TABLES['instant_dungeon'], ...INSTANT_DUNGEON_LOOT_INTEGRATED, ...INSTANT_DUNGEON_COMMON_LOOT];
} else {
    WORLD_LOOT_TABLES['instant_dungeon'] = [...INSTANT_DUNGEON_LOOT_INTEGRATED, ...INSTANT_DUNGEON_COMMON_LOOT];
}

for (const nation in BOSS_EXCLUSIVE_LOOT) {
    if (WORLD_LOOT_TABLES[nation]) {
        WORLD_LOOT_TABLES[nation] = [...WORLD_LOOT_TABLES[nation], ...BOSS_EXCLUSIVE_LOOT[nation]];
    } else {
        WORLD_LOOT_TABLES[nation] = BOSS_EXCLUSIVE_LOOT[nation];
    }
}

Object.values(WORLD_LOOT_TABLES).forEach(table => {
    table.forEach(entry => {
        if (!entry.imageUrl) entry.imageUrl = getFallbackImage(entry.type || 'Etc');
    });
});

export const findItemDataInWorldTables = (itemName: string): any | null => {
    for (const nation in WORLD_LOOT_TABLES) {
        const item = WORLD_LOOT_TABLES[nation].find(entry => {
            const tableItemName = entry.item || entry.name;
            return itemName === tableItemName || itemName.endsWith(tableItemName);
        });
        if (item) return item;
    }
    return null;
};
