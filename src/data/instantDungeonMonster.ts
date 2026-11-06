import { Enemy, ItemRarity } from '../types';
import { generateEnemyStats } from '../utils';

export const INSTANT_DUNGEON_MONSTER_TEMPLATES: Partial<Enemy>[] = [
    {
        name: "해골 전사",
        description: "녹슨 검을 든 해골 병사입니다.",
        shinryokuType: "무기강화계",
        visualUrl: "https://i.ibb.co/WS7mZjb/Gemini-Generated-Image-q405qcq405qcq405.png",
        dropTable: [
            { name: "저주받은 뼈", type: "Etc", rarity: ItemRarity.NORMAL, minLvl: 1, description: "불길한 기운이 감도는 뼈조각입니다.", price: 50, imageUrl: "https://i.ibb.co/LDSkhcRt/Gemini-Generated-Image-tmtetgtmtetgtmte.png" },
            { name: "고대 금화", type: "Etc", rarity: ItemRarity.MAGIC, minLvl: 1, description: "오래된 왕국의 금화입니다.", price: 300, imageUrl: "https://i.ibb.co/N6hyqXH8/Gemini-Generated-Image-mwobi2mwobi2mwob.png" }
        ],
        statusEffects: []
    },
    {
        name: "고블린 샤먼",
        description: "조잡한 마법을 사용하는 고블린 주술사입니다.",
        shinryokuType: "화염계",
        visualUrl: "https://i.ibb.co/TxJjWm7J/Kakao-Talk-20260304-214445425-02.png",
        dropTable: [
            { name: "마력 깃든 수정", type: "Etc", rarity: ItemRarity.MAGIC, minLvl: 1, description: "마력이 희미하게 느껴지는 수정입니다.", price: 200, imageUrl: "https://i.ibb.co/VYkq0s4k/Gemini-Generated-Image-ooeaz2ooeaz2ooea.png" }
        ],
        statusEffects: []
    },
    {
        name: "오크 광전사",
        description: "피에 굶주린 오크 전사입니다.",
        shinryokuType: "대지계",
        visualUrl: "https://i.ibb.co/xqQDBCHj/Kakao-Talk-20260304-214445425-01.png",
        dropTable: [
            { name: "고대 금화", type: "Etc", rarity: ItemRarity.MAGIC, minLvl: 1, description: "오래된 왕국의 금화입니다.", price: 300, imageUrl: "https://i.ibb.co/N6hyqXH8/Gemini-Generated-Image-mwobi2mwobi2mwob.png" },
            { name: "심연의 정수", type: "Etc", rarity: ItemRarity.RARE, minLvl: 1, description: "심연의 힘이 응축된 결정체입니다.", price: 500, imageUrl: "https://i.ibb.co/t9869kP/Gemini-Generated-Image-8pe71g8pe71g8pe7.png" }
        ],
        statusEffects: []
    },
    {
        name: "그림자 암살자",
        description: "어둠 속에 숨어 기습을 노리는 암살자입니다.",
        shinryokuType: "암흑계",
        visualUrl: "https://i.ibb.co/4RFV6F6q/Gemini-Generated-Image-accpteaccpteaccp.png",
        dropTable: [
            { name: "심연의 정수", type: "Etc", rarity: ItemRarity.RARE, minLvl: 1, description: "심연의 힘이 응축된 결정체입니다.", price: 500, imageUrl: "https://i.ibb.co/t9869kP/Gemini-Generated-Image-8pe71g8pe71g8pe7.png" }
        ],
        statusEffects: []
    },
    {
        name: "가고일",
        description: "돌로 만들어진 날개 달린 괴물입니다.",
        shinryokuType: "강철계",
        visualUrl: "https://i.ibb.co/1fm1RJDV/Gemini-Generated-Image-ogwgm0ogwgm0ogwg.png",
        dropTable: [
            { name: "마력 깃든 수정", type: "Etc", rarity: ItemRarity.MAGIC, minLvl: 1, description: "마력이 희미하게 느껴지는 수정입니다.", price: 200, imageUrl: "https://i.ibb.co/VYkq0s4k/Gemini-Generated-Image-ooeaz2ooeaz2ooea.png" }
        ],
        statusEffects: []
    },
    {
        name: "서리 거미",
        description: "차가운 동굴에 서식하는 거대한 거미입니다. 냉기를 머금은 거미줄을 뿜어냅니다.",
        shinryokuType: "빙결계",
        visualUrl: "https://i.ibb.co/Nn2gPMgW/Gemini-Generated-Image-wrxrs2wrxrs2wrxr.png",
        dropTable: [
            { name: "마력 깃든 수정", type: "Etc", rarity: ItemRarity.MAGIC, minLvl: 1, description: "마력이 희미하게 느껴지는 수정입니다.", price: 200, imageUrl: "https://i.ibb.co/VYkq0s4k/Gemini-Generated-Image-ooeaz2ooeaz2ooea.png" }
        ],
        statusEffects: []
    },
    {
        name: "번개 정령",
        description: "불안정한 전기로 이루어진 정령입니다. 가까이 가면 감전될 수 있습니다.",
        shinryokuType: "전격계",
        visualUrl: "https://i.ibb.co/yc4P8j6B/Gemini-Generated-Image-9lr67s9lr67s9lr6.png",
        dropTable: [
            { name: "마력 깃든 수정", type: "Etc", rarity: ItemRarity.MAGIC, minLvl: 1, description: "마력이 희미하게 느껴지는 수정입니다.", price: 200, imageUrl: "https://i.ibb.co/VYkq0s4k/Gemini-Generated-Image-ooeaz2ooeaz2ooea.png" }
        ],
        statusEffects: []
    },
    {
        name: "맹독 슬라임",
        description: "강한 산성을 띠는 액체 괴물입니다. 닿는 모든 것을 녹여버립니다.",
        shinryokuType: "초화계",
        visualUrl: "https://i.ibb.co/hRg2h0yf/Gemini-Generated-Image-wo24q0wo24q0wo24.png",
        dropTable: [
            { name: "저주받은 뼈", type: "Etc", rarity: ItemRarity.NORMAL, minLvl: 1, description: "불길한 기운이 감도는 뼈조각입니다.", price: 50, imageUrl: "https://i.ibb.co/LDSkhcRt/Gemini-Generated-Image-tmtetgtmtetgtmte.png" }
        ],
        statusEffects: []
    },
    {
        name: "심해의 추적자",
        description: "물갈퀴가 달린 기괴한 형상의 괴물입니다. 어둠 속에서 먹잇감을 노립니다.",
        shinryokuType: "해수계",
        visualUrl: "https://i.ibb.co/TBMKPd0J/Gemini-Generated-Image-pf5tcppf5tcppf5t.png",
        dropTable: [
            { name: "심연의 정수", type: "Etc", rarity: ItemRarity.RARE, minLvl: 1, description: "심연의 힘이 응축된 결정체입니다.", price: 500, imageUrl: "https://i.ibb.co/t9869kP/Gemini-Generated-Image-8pe71g8pe71g8pe7.png" }
        ],
        statusEffects: []
    },
    {
        name: "바람칼날 하피",
        description: "날카로운 발톱과 깃털을 가진 반인반조의 괴물입니다. 돌풍을 일으켜 공격합니다.",
        shinryokuType: "질풍계",
        visualUrl: "https://i.ibb.co/gnfWfPn/Kakao-Talk-20260305-210442613-02.png",
        dropTable: [
            { name: "고대 금화", type: "Etc", rarity: ItemRarity.MAGIC, minLvl: 1, description: "오래된 왕국의 금화입니다.", price: 300, imageUrl: "https://i.ibb.co/N6hyqXH8/Gemini-Generated-Image-mwobi2mwobi2mwob.png" }
        ],
        statusEffects: []
    },
    {
        name: "태양의 광신도",
        description: "눈이 멀어버린 채 맹목적으로 빛을 추종하는 광신도입니다.",
        shinryokuType: "태양계",
        visualUrl: "https://i.ibb.co/W49GXt8W/Kakao-Talk-20260305-210442613-03.png",
        dropTable: [
            { name: "고대 금화", type: "Etc", rarity: ItemRarity.MAGIC, minLvl: 1, description: "오래된 왕국의 금화입니다.", price: 300, imageUrl: "https://i.ibb.co/N6hyqXH8/Gemini-Generated-Image-mwobi2mwobi2mwob.png" }
        ],
        statusEffects: []
    },
    {
        name: "달빛의 환영",
        description: "실체가 없는 달빛의 그림자입니다. 물리적인 공격이 잘 통하지 않습니다.",
        shinryokuType: "월광계",
        visualUrl: "https://i.ibb.co/NgPN7XL8/Gemini-Generated-Image-25yuml25yuml25yu.png",
        dropTable: [
            { name: "마력 깃든 수정", type: "Etc", rarity: ItemRarity.MAGIC, minLvl: 1, description: "마력이 희미하게 느껴지는 수정입니다.", price: 200, imageUrl: "https://i.ibb.co/VYkq0s4k/Gemini-Generated-Image-ooeaz2ooeaz2ooea.png" }
        ],
        statusEffects: []
    },
    {
        name: "광휘의 기사",
        description: "눈부신 빛의 갑옷을 입은 기사입니다. 타락한 자들을 심판하려 합니다.",
        shinryokuType: "광휘계",
        visualUrl: "https://i.ibb.co/kg5WxfM7/Gemini-Generated-Image-lifm29lifm29lifm.png",
        dropTable: [
            { name: "고대 금화", type: "Etc", rarity: ItemRarity.MAGIC, minLvl: 1, description: "오래된 왕국의 금화입니다.", price: 300, imageUrl: "https://i.ibb.co/N6hyqXH8/Gemini-Generated-Image-mwobi2mwobi2mwob.png" },
            { name: "용의 비늘", type: "Etc", rarity: ItemRarity.EPIC, minLvl: 1, description: "드래곤의 단단한 비늘입니다.", price: 1500, imageUrl: "https://i.ibb.co/wNxmNqxB/Gemini-Generated-Image-6m1bdj6m1bdj6m1b.png" }
        ],
        statusEffects: []
    },
    {
        name: "공허의 망령",
        description: "모든 것을 집어삼키는 무의 공간에서 태어난 망령입니다.",
        shinryokuType: "신체강화계",
        visualUrl: "https://i.ibb.co/4nNxwd3w/Gemini-Generated-Image-8o25r28o25r28o25.png",
        dropTable: [
            { name: "심연의 정수", type: "Etc", rarity: ItemRarity.RARE, minLvl: 1, description: "심연의 힘이 응축된 결정체입니다.", price: 500, imageUrl: "https://i.ibb.co/t9869kP/Gemini-Generated-Image-8pe71g8pe71g8pe7.png" }
        ],
        statusEffects: []
    },
    {
        name: "지옥견 케르베로스",
        description: "머리가 세 개 달린 거대한 사냥개입니다. 입에서 지옥의 불꽃을 뿜어냅니다.",
        shinryokuType: "화염계",
        visualUrl: "https://i.ibb.co/jv1xSY3N/Gemini-Generated-Image-d0uiw4d0uiw4d0ui.png",
        dropTable: [
            { name: "저주받은 뼈", type: "Etc", rarity: ItemRarity.NORMAL, minLvl: 1, description: "불길한 기운이 감도는 뼈조각입니다.", price: 50, imageUrl: "https://i.ibb.co/LDSkhcRt/Gemini-Generated-Image-tmtetgtmtetgtmte.png" },
            { name: "용의 비늘", type: "Etc", rarity: ItemRarity.EPIC, minLvl: 1, description: "드래곤의 단단한 비늘입니다.", price: 1500, imageUrl: "https://i.ibb.co/wNxmNqxB/Gemini-Generated-Image-6m1bdj6m1bdj6m1b.png" }
        ],
        statusEffects: []
    }
];

export const generateInstantDungeonMonster = (level: number): Enemy => {
    const template = INSTANT_DUNGEON_MONSTER_TEMPLATES[Math.floor(Math.random() * INSTANT_DUNGEON_MONSTER_TEMPLATES.length)];
    const stats = generateEnemyStats(level, 'normal');

    return {
        name: template.name!,
        level: level,
        hp: stats.maxHp,
        maxHp: stats.maxHp,
        stats: stats,
        description: template.description!,
        skills: [],
        shinryokuType: template.shinryokuType!,
        dropTable: template.dropTable || [],
        statusEffects: [],
        visualUrl: template.visualUrl || "https://i.ibb.co/Kz56VGDS/image.png"
    };
};

