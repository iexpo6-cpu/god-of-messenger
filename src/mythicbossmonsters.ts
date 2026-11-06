
import { ClassTier, SkillType, ItemRarity, Skill, SkillTarget, MythicOptionType,MagyeOptionType,Item } from './types';
import type { BossData } from './bossMonsters';

// 보스 공통 스킬 생성 헬퍼
const createBossSkill = (name: string, desc: string, type: SkillType, ratio: number, mp: number, formula: string, target: SkillTarget = 'single'): Skill => ({
    name,
    description: desc,
    type,
    tier: ClassTier.FINAL,
    level: 10,
    maxLevel: 10,
    currentMastery: 0,
    mpCost: mp,
    powerRatio: ratio,
    effectFormula: formula,
    targetType: target
});

export const SEASONAL_BOSSES: Record<string, BossData> = {
    "신": {
        id:"mythicboss_ella",
        name: "절대신 엘라",
        title: "신계, 인간계, 마계의 조화를 유지하는 신",
        shinryokuType: "광휘계",
        description: "절대 신 엘라, 평소의 모습을 잘 드러내지 않습니다.",
        specialLoot: "신의 원옥 및 창조의 성물 세트",
        detailedLoot: [
            {    name: "엘라의 창조 에너지",
                type: "Weapon",
                weaponType: "Energy",
                elementalType: '광휘계',
                rarity: ItemRarity.MYTHTIC,
                description: "세계를 창조할 때 사용되었다고 전해지는 에너지.",
                stats: { str: 10000, int: 10000, agi: 10000, wis: 10000, ctrl: 10000 },
                mythicOption:MythicOptionType.DEF_IGNORE,
                secondaryOptions: ["최종 능력치 +1500%", "물리 공격력 +1000%", "마법 공격력 +1000%","마법 명중률 +100%","치명타 피해량 +100%","모든 속성 피해 +100%","모든 속성 저항+200%"],
                imageUrl:"https://i.ibb.co/YF0YLq2N/Kakao-Talk-20251224-165533407-04.png",
                enhancement: 0
            },
            {
                name: "신의 원옥",
                type: "SubWeapon",
                weaponType: "Orb",
                rarity: ItemRarity.MYTHTIC,
                description: "세계를 다루는 힘이 깃들어 있는 오브",
                mythicOption:MythicOptionType.EVA_IGNORE,
                stats: { str: 10000, int: 10000, def: 10000, agi: 10000, wis: 10000, ctrl: 10000 },
                secondaryOptions: ["최종 능력치 +2500%", "물리 방어력 +500%", "마법 방어력 +500%", "최대 HP +50%"],
                imageUrl:"https://i.ibb.co/SDKNVKWM/Kakao-Talk-20251224-165533407-03.png",
                enhancement: 0
            },
            {
                name: "신의 자애손",
                type: "Hand",
                rarity: ItemRarity.MYTHTIC,
                description: "모든 생명을 어루만지는 신의 손길이 깃든 장갑.",
                stats: { int: 5000, ctrl: 5000, wis: 5000 },
                mythicOption:MythicOptionType.DOUBLE_ATTACK,
                secondaryOptions: ["마법 공격력 +500%", "모든 능력치 +300%"],
                imageUrl:"https://i.ibb.co/1YHdsQrc/Kakao-Talk-20251224-165533407-02.png",
                enhancement: 0
            },
            {
                name: "세계를 품은 목걸이",
                type: "Accessory",
                rarity: ItemRarity.MYTHTIC,
                description: "삼라만상의 기운이 응축된 절대신의 목걸이.",
                mythicOption:MythicOptionType.INFINITE_MANA,
                stats: { str: 5000, int: 5000, def: 5000, agi: 5000, wis: 5000, ctrl: 5000 },
                imageUrl:"https://i.ibb.co/wjJfRHY/Kakao-Talk-20251224-165533407-01.png",
                secondaryOptions: ["최종 능력치 +500%", "상태이상 저항 +100%", "암흑계 속성 저항 +100%", "최대 HP +50%"],
                enhancement: 0
            },
            {
                name: "태초의 빛",
                type: "Etc",
                rarity: ItemRarity.MYTHTIC,
                description: "세상이 시작될 때 존재했던 가장 순수한 빛의 조각.",
                imageUrl:"https://i.ibb.co/Q7dyS1wS/Kakao-Talk-20251224-165533407.png",
                enhancement: 0
            },
             {
                name: "절대 신의 영약",
                type: "Consumable",
                rarity: ItemRarity.MYTHTIC,
                description: "절대신의 힘이 깃든 영약.",
                secondaryOptions:["HP/MP +100%","HP +500(영구)","MP +500(영구)","STR +100(영구)","INT +100(영구)","DEF +100(영구)","AGI +100(영구)","WIS +100(영구)","CTRL +100(영구)"],
                imageUrl:"https://i.ibb.co/1GVfPs5r/Gemini-Generated-Image-jepk8ujepk8ujepk.png",
                enhancement: 0
            }
        ],
        visualUrl: "https://i.ibb.co/gbQL0xPr/Kakao-Talk-20251222-200748851-01.png",
        level: 15000,
        skills: [
            createBossSkill("신의 영역", "[부가 효과: 소멸] 공간 자체를 뒤틀어 존재를 지워버립니다.", SkillType.PHYSICAL, 10000, 200, "STR*100.0", 'aoe'),
            createBossSkill("창조신의 절대 가호", "모든 속성과 신력을 총동원하여 전신의 능력치를 극대화하고 뚫리지 않는 신성 결계를 형성합니다.", SkillType.BUFF, 200, 150, "STR +80%, INT +80%, DEF +80%, WIS +80%, AGI +80%, CTRL +80%, MANA_SHIELD", 'self'),
            createBossSkill("만물 지배의 광채", "절대신의 광채가 온 누리를 뒤덮으며 모든 생명력을 치유하고 치명타 위력을 폭증시킵니다.", SkillType.BUFF, 180, 200, "HP 30% 회복, RECOV:HP, ALL_STATS +50%", 'self')
        ]
    },
    "엘클": {
        id:"mythicboss_elkle",
        name: "엘클",
        title: "태양의 사자",
        shinryokuType: "태양계",
        description: "태초의 태양의 사자인 엘클. 태양의 창을 휘둘러 가장 강한 공격력을 보여줍니다.",
        specialLoot: "레드 블레이저 스피어 및 태양의 투구",
        detailedLoot: [
            {
                name: "레드 블레이저 스피어",
                type: "Weapon",
                weaponType: "Spear",
                elementalType: '태양계',
                rarity: ItemRarity.MYTHTIC,
                description: "전설 속의 태양의 사자가 사용하는 강력한 태양의 힘이 깃든 창입니다.",
                stats: { str: 15000, int: 10000, def: 10000, agi: 15000, wis: 10000, ctrl: 10000 },
                secondaryOptions: ["최종 능력치 +1500%", "상태이상 저항 +50%","치명타 피해량 +200%","태양계 속성 피해 +300%", "물리 명중률 +250%","물리 공격력 +1000%", "마법 공격력 +1000%", "치명타율 +100%", "물리 방어럭 +100%, 마법 방어력 +100%","STR +500%","AGI +500%"],
                enhancement: 0,
                imageUrl:"https://i.ibb.co/DDWtvJrv/1766535761847.png"
            },
            {
                name: "레드 블레이저 투구",
                type: "Head",
                rarity: ItemRarity.MYTHTIC,
                description: "전설 속의 태양의 사자가 사용하는 강력한 태양의 힘이 깃든 투구입니다.",
                stats: { str: 5000, int: 5000, def: 15000, agi: 15000, wis: 5000, ctrl: 5000 },
                secondaryOptions: ["최종 능력치 +500%", "상태이상 저항 +50%", "물리 공격력 +500%", "마법 공격력 +500%", "물리 방어럭 +200%, 마법 방어력 +200%","STR +200%","DEF +200%"],
                enhancement: 0,
                imageUrl:"https://i.ibb.co/r96B5TC/1766540226131.png"
            },
            {
                name: "레드 블레이저 갑옷",
                type: "Body",
                rarity: ItemRarity.MYTHTIC,
                description: "태양의 사자가 착용하는 갑옷.",
                stats: { str: 6000, agi: 10000, ctrl: 3000, def : 15000 },
                secondaryOptions: ["물리 방어력 +1000%", "마법 방어력 +500%", "물리 공격력 +500%", "모든 속성 저항 +100%","모든 능력치 +500%"],
                enhancement: 0,
                imageUrl:"https://i.ibb.co/tP3J5223/12.png"
            },
            {
                name: "레드 블레이저 슈즈",
                type: "Feet",
                rarity: ItemRarity.MYTHTIC,
                description: "태양의 사자가 착용하는 신발.",
                stats: { str: 2000, agi: 12000, ctrl: 5000, def : 5000 },
                secondaryOptions: ["물리 방어력 +300%", "마법 방어력 +250%", "물리 공격력 +300%", "AGI +500%","물리 명중률 +100%"],
                enhancement: 0,
                imageUrl:"https://i.ibb.co/dskMqgS4/56.png"
            },
            {
                name: "태양의 보옥",
                type: "SubWeapon",
                weaponType: "Orb",
                rarity: ItemRarity.MYTHTIC,
                description: "태양의 사자의 힘의 핵심인 보옥 뜨겁고 강렬하다.",
                stats: { str: 1000, agi: 1000, ctrl: 30000, def : 1000 },
                secondaryOptions: ["모든 능력치 +500%","CTRL +500%","모든 속성 저항 +100%","마법 방어력 +100%"],
                enhancement: 0,
                mythicOption:MagyeOptionType.INSTANT_DEATH, 
                imageUrl:"https://i.ibb.co/XkV2gmW6/1766536234086.png"
            },
            {
                name: "태양의 손",
                type: "Hand",
                rarity: ItemRarity.MYTHTIC,
                description: "태양의 사자의 힘과 열기를 손에 담을 수 있는 강력한 태양의 손",
                stats: { str: 1000, agi: 1000, ctrl: 1000, def : 1000 },
                secondaryOptions: ["모든 능력치 +1000%","물리 방어력 +300%","마법 방어력 +300%","치명타 피해량 +150%"],
                enhancement: 0,
                imageUrl:"https://i.ibb.co/rR6ZtZR5/34.png"
            },
            {
                name: "LHM 모드 시작 - 날개",
                type: "Accessory",
                rarity: ItemRarity.MYTHTIC,
                description: "태양의 사자의 날개를 해방하는 LHM 모드용 악세서리.",
                stats: { str: 5000, agi: 10000, def : 1000 },
                secondaryOptions: ["모든 능력치 +1500%","AGI +1000%","STR +1000%","물리 방어력 +200%","마법 방어력 +200%","물리 회피율 +500%"],
                enhancement: 0,
                mythicOption: MythicOptionType.DOUBLE_ATTACK,
                imageUrl:"https://i.ibb.co/1YCrG7mm/1766536196607.png"
            },
            {
                name: "태양의 잔재",
                type: "Etc",
                rarity: ItemRarity.LEGENDARY,
                description: "태양의 사자의 힘의 잔재",
                imageUrl:"https://i.ibb.co/20jHRQMv/1766540383448.png"
            }
        ],
        visualUrl: "https://i.ibb.co/wZ8ggrkw/Kakao-Talk-20251226-123147637.png",
        level: 10000,
        skills: [
            createBossSkill("LHM 엘클 제 1의 양, 태양의 창", "[부가 효과: 소멸] 공간 자체를 뒤틀어 존재를 지워버립니다.", SkillType.PHYSICAL, 800, 200, "STR*8.0", 'single'),
            createBossSkill("LHM 엘클 최후의 양, 파이널 선", "태양 자체를 창에 담아 낙하시켜 전장 소각", SkillType.PHYSICAL, 1500, 150, "STR*15.0", 'aoe')
        ]
    },
    "임페리얼": {
        id:"mythicboss_imperial",
        name: "마신 임페리얼",
        title: "마계의 신, 차원의 종결자",
        shinryokuType: "암흑계",
        description: "마계의 정점에 선 절대자입니다. 그가 지나간 자리에는 오직 무(無)만이 남습니다.",
        specialLoot: "마신의 반지 및 종말의 장비 세트",
        detailedLoot: [
            {
                name: "마신의 검",
                type: "Weapon",
                weaponType: "Sword",
                elementalType: '암흑계',
                rarity: ItemRarity.MYTHTIC,
                description: "차원의 경계를 베어내어 존재를 지워버리는 칠흑의 대검.",
                stats: { str: 5000, int: 5000, agi: 10000, ctrl: 10000 },
                imageUrl:"https://i.ibb.co/MyhyBwMr/Kakao-Talk-20251224-171921843.png",
                mythicOption:MagyeOptionType.INSTANT_DEATH, 
                secondaryOptions: ["최종 능력치 +1500%","물리 공격력 +1000%", "암흑계 속성 부여", "치명타 피해 +500%", "치명타율 +50%","[부가 효과: 소멸] 부여"],
                enhancement: 0
            },
            {
                name: "공허의 보주",
                type: "SubWeapon",
                weaponType: "Orb",
                rarity: ItemRarity.MYTHTIC,
                description: "모든 빛을 빨아들이는 끝없는 공허의 보주.",
                stats: { int: 5000, wis: 1000, ctrl: 1000 },
                mythicOption:MagyeOptionType.DEMONIZE, 
                secondaryOptions: ["마법 공격력 +1000%", "MP + 190%", "모든 속성 저항 +200%","최종 능력치 +200%"],
                imageUrl:"https://i.ibb.co/5Wvyp3dR/Kakao-Talk-20251224-171822377-05.png",
                enhancement: 0
            },
            {
                name: "마신의 파멸관",
                type: "Head",
                rarity: ItemRarity.MYTHTIC,
                description: "착용하는 것만으로 주변의 생명력을 앗아가는 저주받은 왕관.",
                stats: { int: 5000, ctrl: 1000, wis: 5000 },
                secondaryOptions: ["최종 능력치 +1500%", "상태이상 저항 +100%", "마법 공격력 +300%", "최대 HP +50%"],
                imageUrl:"https://i.ibb.co/qMJ8yt0f/Kakao-Talk-20251224-171822377-04.png",
                enhancement: 0
            },
            {
                name: "마신의 칠흑 갑주",
                type: "Body",
                rarity: ItemRarity.MYTHTIC,
                description: "마계의 심연에서 단조된 절대적인 방어구.",
                stats: { def: 10000, hp: 100000, str: 5000 },
                secondaryOptions: ["물리 방어력 +1500%", "마법 방어력 +1000%", "최대 HP +300%", "최대 HP +50%"],
                imageUrl:"https://i.ibb.co/q3tCCTFG/Kakao-Talk-20251224-171822377-03.png",
                enhancement: 0
            },
            {
                name: "마신의 학살손",
                type: "Hand",
                rarity: ItemRarity.MYTHTIC,
                description: "적의 영혼을 직접 움켜쥐는 파괴의 손톱.",
                stats: { str: 5000, agi: 1000, ctrl: 1000 },
                secondaryOptions: ["물리 공격력 +1500%", "치명타 확률 +100%", "AGI +250%", "최대 HP +50%"],
                imageUrl:"https://i.ibb.co/Y4Vhjc8M/Kakao-Talk-20251224-171822377-02.png",
                enhancement: 0
            },
            {
                name: "마신의 반지",
                type: "Accessory",
                rarity: ItemRarity.MYTHTIC,
                description: "모든 것을 무로 돌리는 마계의 황제의 권능이 깃든 반지입니다.",
                stats: { str: 1000, int: 1000, def: 1000, agi: 1000, wis: 1000, ctrl: 1000 },
                secondaryOptions: ["최종 능력치 +2500%", "상태이상 저항 +30%", "모든 속성 저항 +100%","HP +1000", "암흑계 속성 피해 +30%"],
                imageUrl: "https://i.ibb.co/Kx73Vc02/Kakao-Talk-20251224-171822377-01.png",
                enhancement: 0
            },
            {
                name: "종말의 파편",
                type: "Etc",
                rarity: ItemRarity.MYTHTIC,
                imageUrl:"https://i.ibb.co/N2sjPHRX/Kakao-Talk-20251224-171822377.png",
                description: "세계가 멸망할 때 남겨지는 차원의 잔해.",
                enhancement: 0
            }
        ],
        visualUrl: "https://i.ibb.co/fW2y023/Kakao-Talk-20260304-173351369.jpg",
        level: 10000,
        skills: [
            createBossSkill("차원 붕괴", "[부가 효과: 소멸] 공간 자체를 뒤틀어 존재를 지워버립니다.", SkillType.MAGIC, 800, 200, "INT*8.0"),
            createBossSkill("허무의 권능", "적의 모든 버프를 해제하고 침묵시킵니다.", SkillType.DEBUFF, 0, 150, "Cure All Buffs, Silence(2T)"),
            createBossSkill("마신의 일격", "마신의 위엄을 담은 절대적인 물리 타격입니다.", SkillType.PHYSICAL, 1000, 150, "STR*10.0", 'single'),
            createBossSkill("암흑 심연의 저주", "[부가 효과: 공포] 모든 적의 영혼을 옭아매어 전신의 힘과 방어력을 극도로 파괴합니다.", SkillType.DEBUFF, 0, 250, "STR -60%, INT -60%, DEF -60%, WIS -60%, AGI -60%, CTRL -60%, Fear(2T)", 'aoe'),
            createBossSkill("종말의 붕괴 선고", "[부가 효과: 칠흑] 상대방의 치명타율과 회피를 무력화시키고 극심한 혼돈에 빠뜨립니다.", SkillType.DEBUFF, 0, 300, "ALL_STATS -50%, Blind(2T), Confusion(2T)", 'aoe')
        ]
    },
    "야마타노 오로치": {
        id:"mythicboss_japan",
        name: "야마타노 오로치",
       title: "팔두의 재앙 / 고대 재앙룡",
       shinryokuType: "암흑계",
       description: "봉인되었던 팔두룡이 불완전하게 재림했습니다.",
       specialLoot: "오로치의 핵",
       detailedLoot: {
        name: "오로치의 핵",
        type: "Accessory",
        rarity: ItemRarity.MYTHTIC,
        description: "팔두룡의 생명력이 응축된 위험한 핵.",
        stats: { str: 420, int: 380, def: 450, agi: 300, wis: 300, ctrl: 1600 },
        secondaryOptions: ["화염계 속성 피해 +50%","마법 공격력 +250%","물리 방어력 +100%","STR +50%"],
        enhancement: 0,
        imageUrl:"https://i.ibb.co/DDSgjgxd/Kakao-Talk-20251230-125823792-25.png"
       },
        visualUrl: "https://i.ibb.co/jkY04yqk/Kakao-Talk-20251230-125823792-01.png",
        level: 1150,
        skills: [
            createBossSkill("팔두 연속 브레스","[부가 효과: 화상] 여덟 개의 머리에서 연속 속성 브레스를 분사합니다.",SkillType.MAGIC,650,160,"INT*6.8"),
        ]
    },
    "손오공": {
        id:"mythicboss_china",
        name: "손오공",
        title: "제천대성",
        shinryokuType: "광휘계",
        description: "제천대성.",
        specialLoot: "여의봉",
        detailedLoot: {
        name: "여의봉",
        type: "Weapon",
        weaponType:"Blunt",
        rarity: ItemRarity.MYTHTIC,
        description: "제천대성 손오공이 썼다는 전설의 무기.",
        stats: { str: 1500, int: 300, agi: 1250, wis: 420, ctrl: 1000 },
        secondaryOptions: ["물리 공격력 +245%","물리 방어력 +15%","AGI +100%","STR +50%"],
        enhancement: 0,
        imageUrl:"https://i.ibb.co/KpW7cD9M/Gemini-Generated-Image-zhgbadzhgbadzhgb.png"
        },
        visualUrl: "https://i.ibb.co/yBg8v7BZ/Gemini-Generated-Image-iz7cbxiz7cbxiz7c.png",
        level: 1200,
        skills: [createBossSkill("손오공!","대륙의 기운을 폭주시켜 전장을 파괴합니다.",SkillType.MAGIC,700,180,"INT*7.2")]
    },
    "잔다르크": {
        id:"mythicboss_france",
        name: "성녀 잔 다르크",
        title: "오를레앙의 성령 / 구국의 깃발",
        shinryokuType: "광휘계",
        description: "5월, 파리의 센 강변에 찬란한 빛과 함께 강림합니다.",
        specialLoot: "라셀의 깃발",
        detailedLoot: {
            name: "라셀의 깃발",
            type: "SubWeapon",
            weaponType: "Shield",
            rarity: ItemRarity.MYTHTIC,
            description: "신성한 계시가 깃든 깃발.",
            stats: { def: 3150, wis: 1150, hp: 20000 },
            secondaryOptions: ["물리 방어력 +200%", "광휘계 속성 저항 +50%", "상태이상 저항 +100%", "최대 HP +50%"],
            enhancement: 0,
            imageUrl:"https://i.ibb.co/9mp57H6v/Kakao-Talk-20251230-125823792-29.png"
        },
        visualUrl: "https://i.ibb.co/Kx4LB4h6/Kakao-Talk-20251230-125823792-05.png",
        level: 1150,
        skills: [createBossSkill("홍련의 성녀", "[부가 효과: 소멸] 파괴적인 신성 폭발을 일으킵니다.", SkillType.MAGIC, 1200, 400, "INT*12.0")]
    },
    "아서": {
        id:"mythicboss_uk",
        name: "기사왕 아서",
        title: "브리튼의 진정한 왕 / 엑스칼리버의 주인",
        shinryokuType: "광휘계",
        description: "6월, 런던 브리지 상공에 거대한 차원의 문이 열리며 기사왕이 강림합니다.",
        specialLoot: "진·엑스칼리버",
        detailedLoot: {
            name: "진·엑스칼리버",
            type: "Weapon",
            weaponType: "Sword",
            rarity: ItemRarity.MYTHTIC,
            description: "약속된 승리의 검.",
            stats: { str: 2500, int: 150, agi: 1500 },
            secondaryOptions: ["물리 공격력 +250%", "광휘계 속성 부여", "치명타 피해량 +50%","치명타 확률 +50%"],
            enhancement: 0,
            imageUrl:"https://i.ibb.co/fdq77T4t/Kakao-Talk-20251230-125823792-28.png"
        },
        visualUrl: "https://i.ibb.co/ynZ90Mj7/Kakao-Talk-20251230-125823792-04.png",
        level: 1200,
        skills: [createBossSkill("약속된 승리의 검", "[부가 효과: 소멸] 성검을 해방합니다.", SkillType.MAGIC, 1000, 300, "INT*10.0")]
    },
    "리버티": {
        id:"mythicboss_usa",
        name: "성좌의 거신",
        title: "자유의 수호자 / 리버티 타이탄",
        shinryokuType: "전격계",
        description: "7월 독립기념일, 워싱턴 D.C. 상공에 성좌의 힘을 빌려 현신한 거대 강철 거신입니다.",
        specialLoot: "성좌의 코어",
        detailedLoot: [{
            name: "성좌의 코어",
            type: "Accessory",
            rarity: ItemRarity.MYTHTIC,
            description: "자유를 상징하는 별의 에너지가 응축된 코어.",
            stats: { str: 1000, int: 1000, agi: 1000, def: 1000, wis: 1000, ctrl: 1000 },
            secondaryOptions: ["최종 능력치 + 100%", "상태이상 저항 +30%", "MP +100%", "모든 속성 저항 +50%","HP +100%", "AGI +100%", "물리 방어력 +100%","마법 공격력 +100%"],
            enhancement: 0,
            imageUrl:"https://i.ibb.co/s9HdhFM8/Kakao-Talk-20251230-125830524-06.png"
        },{name: "성좌의 방패",
            type: "SubWeapon",
            weaponType:"Shield",
            rarity: ItemRarity.MYTHTIC,
            description: "자유를 상징하는 별의 에너지로 만든 방패.",
            stats: { str: 1000, def: 5000, wis: 1000, },
            secondaryOptions: ["최종 능력치 + 100%", "상태이상 저항 +30%","모든 속성 저항 +50%","MP +100%", "HP +250%", "물리 방어력 +200%","마법 공격력 +100%"],
            enhancement: 0,
            imageUrl:"https://i.ibb.co/kgG2L5sB/Kakao-Talk-20251230-125830524-11.png"}],
        visualUrl: "https://i.ibb.co/twTzJzSC/Kakao-Talk-20251230-125823792-11.png",
        level: 2000,
        skills: [createBossSkill("스타즈 앤 스트라이프", "하늘에서 무수한 성좌의 벼락이 쏟아집니다.", SkillType.MAGIC, 750, 180, "INT*7.5")]
    },
    "라": {
        id:"mythicboss_egypt",
        name: "태양신 라",
        title: "창조의 주신 / 불타는 매",
        shinryokuType: "태양계",
        description: "8월의 태양이 가장 뜨거울 때, 카이로의 피라미드 정점에 현신합니다.",
        specialLoot: "라의 눈",
        detailedLoot: {
            name: "라의 눈",
            type: "Accessory",
            rarity: ItemRarity.MYTHTIC,
            description: "파괴와 창조를 동시에 행하는 신의 눈동자.",
            stats: { int: 1500, wis: 1500 },
            secondaryOptions: ["태양계 속성 피해 +50%", "화염계 속성 저항 +50%", "상태이상 저항 +50%", "최종 능력치 +50%"],
            enhancement: 0,
            imageUrl:"https://i.ibb.co/67HfDTLW/Kakao-Talk-20251230-125830524-08.png"
        },
        visualUrl: "https://i.ibb.co/JFzwg2NV/Kakao-Talk-20251230-125823792-13.png",
        level: 1000,
        skills: [createBossSkill("태양선의 업화", "[부가 효과: 화상] 지상의 모든 것을 불태웁니다.", SkillType.MAGIC, 950, 220, "INT*9.5")]
    },
    "환웅": {
        id:"mythicboss_korea",
        name: "천제 환웅",
        title: "하늘의 자손 / 신시의 주권자",
        shinryokuType: "광휘계",
        description: "매년 10월, 하늘의 문이 열릴 때 서울 광화문 상공에 강림하는 고대의 신성입니다.",
        specialLoot: "환웅의 검",
        detailedLoot: {
            name: "환웅의 검",
            type: "Weapon",
            weaponType: "Sword",
            elementalType: "광휘계",
            rarity: ItemRarity.MYTHTIC,
            description: "하늘의 자손인 환웅이 쓰는 검입니다.",
            stats: { str: 3000, int: 500, wis: 100, def: 100, agi: 100, ctrl: 100 },
            secondaryOptions: ["최종 능력치 +250%", "상태이상 저항 +50%","광휘계 속성 피해 +100%", "STR +100%", "INT +100%"],
            enhancement: 0,
            imageUrl:"https://i.ibb.co/CfVSNnJ/Kakao-Talk-20251230-125823792-24.png"
        },
        visualUrl: "https://i.ibb.co/YTF3bWnd/Kakao-Talk-20251230-125823792.png",
        level: 1500,
        skills: [createBossSkill("환웅의 검의 권능", "[부가 효과: 소멸] 공간을 정화하여 마법 피해를 입힙니다.", SkillType.MAGIC, 800, 250, "INT*8.0")]
    },
    "단군왕검": {
        id: "mythicboss_dangun",
        name: "태초의 제왕 단군왕검",
        title: "고조선의 천왕 / 아사달의 주권자",
        shinryokuType: "대지계",
        description: "매년 10월 하늘의 문이 열릴 때, 고조선의 옛 수도 아사달이었던 평양성 상공에 성스러운 대지의 기운과 함께 현신하는 태초의 성왕입니다.",
        specialLoot: "천부인의 다뉴세문경",
        detailedLoot: {
            name: "천부인의 다뉴세문경",
            type: "Accessory",
            rarity: ItemRarity.MYTHTIC,
            description: "단군왕검이 하늘로부터 전해받은 천부인 중 하나인 청동거울입니다. 태양의 광휘를 받아 사악한 마기를 완전히 비추어 소멸시키고 소지자에게 끝없는 대지의 가호를 내려줍니다.",
            stats: { int: 2500, wis: 500, def: 200 },
            secondaryOptions: ["최종 능력치 +100%", "상태이상 저항 +60%", "대지계 속성 피해 +100%", "마법 공격력 +100%", "최대 HP +120%"],
            enhancement: 0,
            imageUrl: "https://i.ibb.co/SpnHVJR/Kakao-Talk-20260920-143323714-01.png"
        },
        visualUrl: "https://i.ibb.co/nqFSNwVM/Kakao-Talk-20260920-143323714-02.png",
        level: 1500,
        skills: [
            createBossSkill("홍익인간의 성역", "[부가 효과: 소멸] 모든 생명을 이롭게 한다는 뜻을 담아 전장을 태초의 온전한 정화 상태로 되돌리고 강력한 대지의 공격을 가합니다.", SkillType.MAGIC, 900, 260, "INT*9.0"),
            createBossSkill("아사달의 신성 결계", "신성한 천부인의 거룩한 울림으로 수호 결계를 가동하여 적을 억제합니다.", SkillType.DEBUFF, 0, 180, "Stun All Enemies 1T, ATK -50%")
        ]
    },
    "토르": {
        id:"mythicboss_thor",
        name: "전신 토르",
        title: "묠니르의 주인 / 천둥의 파괴신",
        shinryokuType: "전격계",
        description: "스칸디나비아의 폭풍 속에서 현신하는 전쟁과 번개의 신입니다.",
        specialLoot: "신뢰의 망치 묠니르",
        detailedLoot: {
            name: "진·묠니르 (True Mjolnir)",
            type: "Weapon",
            weaponType: "Blunt",
            rarity: ItemRarity.MYTHTIC,
            description: "산조차 부수는 천둥의 망치.",
            stats: { str: 1800, ctrl: 1200, agi: 100 },
            secondaryOptions: ["전격계 속성 부여", "물리 공격력+ 250%", "전격계 속성 피해 +50%", "공격 시 100% 확률로 [부가 효과: 감전]"],
            enhancement: 0,
            imageUrl:"https://i.ibb.co/pj7wv56M/Kakao-Talk-20251230-125830524.png"
        },
        visualUrl: "https://i.ibb.co/RkT24Q0k/Kakao-Talk-20251230-125823792-06.png",
        level: 1100,
        skills: [createBossSkill("라그나로크의 벼락", "[부가 효과: 감전] 전장에 신의 분노를 내립니다.", SkillType.MAGIC, 1200, 300, "INT*12.0")]
    },
    "포세이돈": {
        id:"mythicboss_poseidon",
        name: "해신 포세이돈",
        title: "대양의 주권자 / 지진의 신",
        shinryokuType: "해수계",
        description: "그리스 앞바다에서 지진과 함께 솟아오르는 바다의 절대자입니다.",
        specialLoot: "해신의 삼지창",
        detailedLoot: {
            name: "트라이던트 오브 오션",
            type: "Weapon",
            weaponType: "Spear",
            rarity: ItemRarity.MYTHTIC,
            description: "바다의 흐름을 지배하는 신의 창.",
            stats: { str: 1500, int: 1500, wis: 300 },
            secondaryOptions: ["해수계 속성 부여", "[부가 효과: 빙결] 확률 50% 증가", "해수계 속성 피해 +50%","마법 공격력 +250%"],
            enhancement: 0,
            imageUrl:"https://i.ibb.co/LXsw1mGB/Kakao-Talk-20251230-125830524-01.png"
        },
        visualUrl: "https://i.ibb.co/twMcp5PN/Kakao-Talk-20251230-125823792-07.png",
        level: 1100,
        skills: [createBossSkill("대홍수의 심판", "[부가 효과: 빙결] 전장을 거대한 해일로 덮습니다.", SkillType.MAGIC, 1100, 280, "INT*11.0")]
    },
    "시바": {
        id:"mythicboss_india",
        name: "파괴신 시바",
        title: "세계를 춤추며 파괴하는 자",
        shinryokuType: "화염계",
        description: "인도의 고대 성소에서 제 3의 눈을 뜨고 강림한 파괴의 주신입니다.",
        specialLoot: "파괴의 삼지창 트리슈라",
        detailedLoot: {
            name: "트리슈라 (Trishula)",
            type: "Weapon",
            weaponType: "Spear",
            rarity: ItemRarity.MYTHTIC,
            description: "우주의 균형을 무너뜨리는 세 가지 힘이 깃든 창.",
            stats: { str: 1200, int: 1200, ctrl: 1500 },
            secondaryOptions: ["물리 공격력 +200%", "화염계 속성 부여", "최종 능력치 +50%", "치명타 피해량 +50%"],
            enhancement: 0,
            imageUrl:"https://i.ibb.co/KxWsJWgG/Kakao-Talk-20251230-125823792-27.png"
        },
        visualUrl: "https://i.ibb.co/ksqV7D8Z/Kakao-Talk-20251230-125823792-03.png",
        level: 1100,
        skills: [createBossSkill("파괴의 춤", "[부가 효과: 소멸] 춤추듯 공격하여 존재 자체를 소거합니다.", SkillType.MAGIC, 1800, 500, "INT*18.0")]
    },
    "지크프리트": {
        id:"mythicboss_germany",
        name: "성궤의 기사 지크프리트",
        title: "악룡의 피를 뒤집어쓴 영웅",
        shinryokuType: "강철계",
        description: "독일의 전설적인 기사. 악룡 파프니르를 처단한 그가 강철의 기상을 뿜으며 현신합니다.",
        specialLoot: "악룡살해검 발뭉",
        detailedLoot: {
            name: "발뭉 (Balmung)",
            type: "Weapon",
            weaponType: "Sword",
            rarity: ItemRarity.MYTHTIC,
            description: "룡의 비늘조차 종잇장처럼 베어버리는 전설의 성검.",
            stats: { str: 1500, def: 1500, hp: 1000 },
            secondaryOptions: ["물리 공격력 +200%", "강철계 속성 부여", "최종 능력치 +50%", "치명타 피해량 +50%"],
            enhancement: 0,
            imageUrl:"https://i.ibb.co/hRzSgq5V/Kakao-Talk-20251230-125830524-03.png"
        },
        visualUrl: "https://i.ibb.co/ynfd5LsK/Kakao-Talk-20251230-125823792-09.png",
        level: 1500,
        skills: [createBossSkill("악룡 살해", "[부가 효과: 파열] 적의 방어 체계를 완전히 무너뜨립니다.", SkillType.PHYSICAL, 1600, 400, "STR*16.0")]
    },
    "솔로몬": {
        id:"mythicboss_israel",
        name: "지혜왕 솔로몬",
        title: "72악마의 지배자",
        shinryokuType: "암흑계",
        description: "이스라엘의 고대 왕. 지혜의 반지로 악마들을 부리며 전장을 지배합니다.",
        specialLoot: "솔로몬의 금반지",
        detailedLoot: {
            name: "솔로몬의 진지(眞知) 반지",
            type: "Accessory",
            rarity: ItemRarity.MYTHTIC,
            description: "만물의 이치를 깨닫게 하고 악령을 복종시키는 반지.",
            stats: { int: 1500, wis: 1500, ctrl: 1000 },
            secondaryOptions: ["MP +100%", "마법 공격력 +250%", "암흑계 속성 피해 +50%", "최대 HP +50%"],
            enhancement: 0,
            imageUrl:"https://i.ibb.co/jkNnrpLF/Kakao-Talk-20251230-125830524-05.png"
        },
        visualUrl: "https://i.ibb.co/j9dy0BVj/Kakao-Talk-20251230-125823792-12.png",
        level: 1200,
        skills: [createBossSkill("72악마의 소환", "[부가 효과: 공포] 무수한 악마들의 그림자로 적을 덮칩니다.", SkillType.MAGIC, 1400, 350, "INT*14.0")]
    },
    "유피테르": {
        id:"mythicboss_jupiter",
        name: "주신 유피테르",
        title: "올림포스의 진정한 주인",
        shinryokuType: "전격계",
        description: "이탈리아 로마의 고대 유적지에서 번개와 함께 현신한 신들의 왕입니다.",
        specialLoot: "유피테르의 벼락",
        detailedLoot: {
            name: "케라우노스 (Keraunos)",
            type: "Weapon",
            weaponType: "Blunt",
            rarity: ItemRarity.MYTHTIC,
            description: "한 번 휘두르는 것만으로도 대지를 불태우는 신의 벼락.",
            stats: { str: 1500, int: 1500, agi: 1000 },
            secondaryOptions: ["[부가 효과: 감전]", "마법 공격력 +250%", "전격계 속성 피해 +50%","전격계 속성 부여"],
            enhancement: 0,
            imageUrl:"https://i.ibb.co/R4pqT09Y/Kakao-Talk-20251230-125830524-02.png"
        },
        visualUrl: "https://i.ibb.co/1GXXY95Y/Kakao-Talk-20251230-125823792-08.png",
        level: 1500,
        skills: [createBossSkill("심판의 벼락", "[부가 효과: 감전] 전장에 피할 곳 없는 신벌을 내립니다.", SkillType.MAGIC, 2000, 600, "INT*20.0")]
    },
    "엘시드": {
        id:"mythicboss_spain",
        name: "정복왕 엘 시드",
        title: "태양의 들판의 수호자",
        shinryokuType: "태양계",
        description: "스페인의 국민적 영웅. 기사도의 정점에 달한 그가 태양의 빛을 받으며 다시 검을 듭니다.",
        specialLoot: "성검 티조나",
        detailedLoot: {
            name: "티조나",
            type: "Weapon",
            weaponType: "Sword",
            rarity: ItemRarity.MYTHTIC,
            description: "사악한 자가 만지면 타버리는 태양의 성검.",
            stats: { str: 1380, agi: 1500, def: 500 },
            secondaryOptions: ["물리 방어력 +80%", "물리 공격력 +250%", "태양계 속성 부여", "최종 능력치 +50%"],
            enhancement: 0,
            imageUrl:"https://i.ibb.co/dwC0SrLd/Kakao-Talk-20251230-125830524-09.png"
        },
        visualUrl: "https://i.ibb.co/3msTgRB4/Kakao-Talk-20251230-125823792-16.png",
        level: 1400,
        skills: [createBossSkill("태양의 돌격", "[부가 효과: 화상] 눈부신 빛과 함께 적진을 돌파합니다.", SkillType.PHYSICAL, 1500, 300, "STR*15.0")]
    },
    "더치맨": {
        id:"mythicboss_holand",
        name: "플라잉 더치맨",
        title: "영원히 정박하지 못하는 유령선",
        shinryokuType: "해수계",
        description: "네덜란드 앞바다의 안개 속에서 출몰하는 전설의 유령선과 그 선장입니다.",
        specialLoot: "심해의 유령 키",
        detailedLoot: {
            name: "망령의 조타 키",
            type: "Accessory",
            rarity: ItemRarity.MYTHTIC,
            description: "죽음조차 거스르는 유령선의 핵심 부품.",
            stats: { wis: 1500, def: 1500, hp: 1000 },
            secondaryOptions: ["모든 속성 저항 +50%", "해수계 속성 피해 +50%", "빙결계 속성 저항 100%", "최대 HP +50%"],
            enhancement: 0,
            imageUrl:"https://i.ibb.co/C3rqthxb/Kakao-Talk-20251230-125830524-12.png"
        },
        visualUrl: "https://i.ibb.co/Fk8s70Ft/Kakao-Talk-20251230-125823792-15.png",
        level: 1100,
        skills: [createBossSkill("망령의 파도", "[부가 효과: 빙결] 영혼까지 얼려버리는 차가운 바닷물을 뿜습니다.", SkillType.MAGIC, 1300, 400, "WIS*13.0")]
    },
    "알프스티탄": {
        id:"mythicboss_swiss",
        name: "알프스의 거신",
        title: "대륙의 어깨",
        shinryokuType: "대지계",
        description: "스위스의 알프스 산맥 자체가 깨어난 듯한 거대 암석 거신입니다.",
        specialLoot: "영구동토의 바위 심장",
        detailedLoot: {
            name: "티탄의 심장석",
            type: "Accessory",
            rarity: ItemRarity.MYTHTIC,
            description: "대지의 고동이 느껴지는 무거운 핵.",
            stats: { def: 5000, str: 500, hp: 20000 },
            secondaryOptions: ["물리방어력 +100%", "대지계 속성 피해 +50%", "마법 방어력 + 100%", "최대 HP +50%"],
            enhancement: 0,
            imageUrl:"https://i.ibb.co/jv3MsBJn/Kakao-Talk-20251230-125830524-13.png"
        },
        visualUrl: "https://i.ibb.co/HfddKKD1/Kakao-Talk-20251230-125823792-14.png",
        level: 1100,
        skills: [createBossSkill("산맥 붕괴", "[부가 효과: 속박] 거대한 주먹으로 지면을 내리쳐 붕괴시킵니다.", SkillType.PHYSICAL, 2000, 500, "DEF*20.0")]
    },
    "아다마스토르": {
        id:"mythicboss_portugal",
        name: "해상의 거인 아다마스토르",
        title: "폭풍의 희망봉",
        shinryokuType: "질풍계",
        description: "포르투갈 항해사들을 위협하던 바다의 거인이 폭풍우를 두르고 나타났습니다.",
        specialLoot: "희망봉의 폭풍 보주",
        detailedLoot: {
            name: "폭풍의 눈",
            type: "SubWeapon",
            weaponType: "Orb",
            rarity: ItemRarity.MYTHTIC,
            description: "거친 바다의 폭풍을 손안에 가둔 보주.",
            stats: { agi: 2000, ctrl: 500, wis: 1500 },
            secondaryOptions: ["물리 공격력 +50%", "질풍계 속성 저항 +50%", "AGI +200%", "최대 HP +50%"],
            enhancement: 0,
            imageUrl:"https://i.ibb.co/23WPPj46/Kakao-Talk-20251230-125830524-14.png"
        },
        visualUrl: "https://i.ibb.co/fYbXDp7f/Kakao-Talk-20251230-125823792-17.png",
        level: 1100,
        skills: [createBossSkill("대폭풍의 포효", "[부가 효과: 혼란] 소용돌이치는 바람으로 적들을 무력화합니다.", SkillType.MAGIC, 1400, 450, "AGI*14.0")]
    },
    "예니체리로드": {
        id:"mythicboss_turkey",
        name: "예니체리의 대군주",
        title: "터키의 최강 군주",
        shinryokuType: "신체강화계",
        description: "터키의 고대 군단을 지배하던 최강의 전사가 신력으로 무장하여 재림했습니다.",
        specialLoot: "황금 월도",
        detailedLoot: {
            name: "오스만의 패도",
            type: "Weapon",
            weaponType: "Sword",
            rarity: ItemRarity.MYTHTIC,
            description: "수많은 전장을 피로 물들인 대군주의 거대한 검.",
            stats: { str: 1500, agi: 1000, ctrl: 1000 },
            secondaryOptions: ["물리 공격력 +250%", "신체강화계 속성 부여", "최종 능력치 +50%", "치명타 피해량 +50%"],
            enhancement: 0,
            imageUrl:"https://i.ibb.co/Lz4b73KT/Kakao-Talk-20251231-140838509.png"
        },
        visualUrl: "https://i.ibb.co/9H8dRqL9/Kakao-Talk-20251230-125823792-18.png",
        level: 1300,
        skills: [createBossSkill("제국의 진격", "[부가 효과: 공포] 위압적인 기세로 적의 전열을 파괴합니다.", SkillType.PHYSICAL, 1700, 350, "STR*17.0")]
    },
    "페룬": {
        id:"mythicboss_russia",
        name: "천둥신 페룬",
        title: "슬라브의 지배자",
        shinryokuType: "전격계",
        description: "러시아의 광활한 대지와 하늘을 관장하는 고대의 뇌신입니다.",
        specialLoot: "페룬의 황금 도끼",
        detailedLoot: {
            name: "천둥 가르는 도끼",
            type: "Weapon",
            weaponType: "Axe",
            rarity: ItemRarity.MYTHTIC,
            description: "하늘의 벼락을 지상으로 끌어내리는 거대한 도끼.",
            stats: { str: 1500, int: 1500, ctrl: 1000 },
            secondaryOptions: ["전격계 속성 피해 + 200%", "치명타율 +100%", "전격계 속성 부여", "최종 능력치 +50%"],
            enhancement: 0,
            imageUrl:"https://i.ibb.co/YFVpfjRb/Kakao-Talk-20251230-125830524-04.png"
        },
        visualUrl: "https://i.ibb.co/MDkL2ptS/Kakao-Talk-20251230-125823792-10.png",
        level: 1300,
        skills: [createBossSkill("하늘의 심판", "[부가 효과: 감전] 거대한 벼락을 도끼에 담아 내리칩니다.", SkillType.PHYSICAL, 1900, 550, "STR*19.0")]
    },
    "무지개뱀": {
        id:"mythicboss_austraillia",
        name: "무지개 뱀 (Rainbow Serpent)",
        title: "창조와 갈증의 생명체",
        shinryokuType: "초화계",
        description: "호주의 원주민 신화 속에서 깨어난, 생명을 부여하고 동시에 앗아가는 고대의 신수입니다.",
        specialLoot: "무지개 빛깔 비늘",
        detailedLoot: {
            name: "태초의 생명 수호석",
            type: "Accessory",
            rarity: ItemRarity.MYTHTIC,
            description: "생명의 근원이 깃든 무지개색 보석.",
            stats: { wis: 2000, ctrl: 2000, hp: 15000 },
            secondaryOptions: ["MP +180%", "초화계 속성 피해 +50%", "상태이상 저항 +100%", "최대 HP +50%"],
            enhancement: 0,
            imageUrl:"https://i.ibb.co/CsX8WkZP/Kakao-Talk-20251231-140838509-01.png"
        },
        visualUrl: "https://i.ibb.co/gFh34BR8/Kakao-Talk-20251230-125823792-19.png",
        level: 1200,
        skills: [createBossSkill("대지의 숨결", "[부가 효과: 재생] 아군은 치유하고 적에겐 독을 퍼뜨립니다.", SkillType.MAGIC, 1200, 400, "WIS*12.0")]
    },
    "윈디고킹": {
        id:"mythicboss_canada",
        name: "윈디고 킹",
        title: "영구동토의 굶주린 군주",
        shinryokuType: "빙결계",
        description: "캐나다의 깊은 설산에서 식인 전설과 함께 깨어난 빙결의 마수입니다.",
        specialLoot: "서리 서린 뼈 왕관",
        detailedLoot: {
            name: "윈디고의 빙결 눈동자",
            type: "Accessory",
            rarity: ItemRarity.MYTHTIC,
            description: "바라보는 모든 것을 얼려버리는 마수의 눈.",
            stats: { int: 1500, agi: 1000, wis: 1000 },
            secondaryOptions: ["빙결계 속성 피해 +50%", "빙결계 속성 피해 +50%", "빙결 확률 +50%", "최대 HP +50%"],
            enhancement: 0,
            imageUrl: "https://i.ibb.co/Gfkn6RZ3/Kakao-Talk-20251231-140838509-02.png"
        },
        visualUrl: "https://i.ibb.co/RGBGwWw7/Kakao-Talk-20251230-125823792-20.png",
        level: 1200,
        skills: [createBossSkill("절대 영도 브레스", "[부가 효과: 빙결] 한 번 닿으면 영원히 굳어버리는 한기를 내뿜습니다.", SkillType.MAGIC, 1500, 450, "INT*15.0")]
    },
    "아마조나스령": {
        id:"mythicboss_brazil",
        name: "아마조나스의 고대령",
        title: "정글의 수호하는 대모",
        shinryokuType: "초화계",
        description: "브라질의 아마존 열대 우림 그 자체가 신력으로 형상화된 수호 정령입니다.",
        specialLoot: "생명의 덩굴 채찍",
        detailedLoot: {
            name: "아마존의 눈물",
            type: "Weapon",
            weaponType: "Spear",
            rarity: ItemRarity.MYTHTIC,
            description: "자연의 분노와 슬픔이 서린 에메랄드 창.",
            stats: { str: 1000, int: 2000, wis: 1500 },
            secondaryOptions: ["[부가 효과: 혼란]", "초화계 속성 부여", "마법 공격력 +180%", "최종 능력치 +50%"],
            enhancement: 0,
            imageUrl: "https://i.ibb.co/KpGKfX15/Kakao-Talk-20251231-145133909.png"
        },
        visualUrl: "https://i.ibb.co/4wgzbC6k/Kakao-Talk-20251230-125823792-21.png",
        level: 1300,
        skills: [createBossSkill("숲의 분노", "[부가 효과: 속박] 전장을 가시 덩굴로 덮어 적들을 찢어발깁니다.", SkillType.MAGIC, 1600, 500, "INT*16.0")]
    },
    "은의수호자": {
        id:"mythicboss_argentina",
        name: "은의 수호자",
        title: "판파스 평원의 거대 강철수",
        shinryokuType: "강철계",
        description: "아르헨티나의 은(Plata)의 기운을 흡수하여 거대화한 전설의 은빛 마수입니다.",
        specialLoot: "순은의 흉갑",
        detailedLoot: {
            name: "아르헨티움 아머",
            type: "Body",
            rarity: ItemRarity.MYTHTIC,
            description: "어떤 마법도 튕겨내는 전설의 순은 갑옷.",
            stats: { def: 2500, ctrl: 1000, hp: 10000 },
            secondaryOptions: ["마법 방어력 +200%", "강철계 속성 저항 +50%", "상태이상 저항 +50%", "최대 HP +50%"],
            enhancement: 0,
            imageUrl: "https://i.ibb.co/zTfsnMpt/Kakao-Talk-20251231-140838509-03.png"
        },
        visualUrl: "https://i.ibb.co/27ZmTnDh/Kakao-Talk-20251230-125823792-22.png",
        level: 1300,
        skills: [createBossSkill("실버 메테오", "[부가 효과: 파열] 하늘에서 순은 덩어리를 소환하여 적을 짓누릅니다.", SkillType.PHYSICAL, 1800, 400, "STR*18.0")]
    },
    "이칸얌바": {
        id:"mythicboss_southafrica",
        name: "폭풍의 이칸얌바",
        title: "번개를 삼킨 거대 뱀",
        shinryokuType: "전격계",
        description: "남아공의 폭폭 아래 잠들어 있던 폭풍의 신수가 요동치는 벼락과 함께 깨어났습니다.",
        specialLoot: "폭풍의 뱀 비늘",
        detailedLoot: {
            name: "이칸얌바의 천둥 보석",
            type: "Accessory",
            rarity: ItemRarity.MYTHTIC,
            description: "번개를 저장하고 방출하는 신비로운 구슬.",
            stats: { int: 1800, agi: 1800, ctrl: 1200 },
            secondaryOptions: ["마법 공격력 +180%", "전격계 속성 피해 +50%", "최종 능력치 +50%", "최대 HP +50%"],
            enhancement: 0,
            imageUrl: "https://i.ibb.co/cSDDmJtC/Kakao-Talk-20251231-140838509-04.png"
        },
        visualUrl: "https://i.ibb.co/nMry3M3Z/Kakao-Talk-20251230-125823792-23.png",
        level: 1000,
        skills: [createBossSkill("뇌룡의 해일", "[부가 효과: 감전] 전기에 감전된 거대한 파도를 소환합니다.", SkillType.MAGIC, 1700, 500, "INT*17.0")]
    },
     "줄리엣": {
        id:"mythicboss_juliet",
        name: "줄리엣",
        title: "광휘의 사자",
        shinryokuType: "광휘계",
        description: "광휘의 사자의 성소를 수호하는 사자입니다. 타락한 영혼을 빛으로 승화시킵니다.",
        specialLoot: "샤이닝 엔젤 세트",
        detailedLoot: [
            {
                name: "샤이닝 엔젤 스태프",
                type: "Weapon",
                weaponType: "Staff",
                elementalType: "광휘계",
                rarity: ItemRarity.MYTHTIC,
                description: "광휘의 빛이 가득찬 스태프. 신력을 증폭시킵니다.",
                stats: { int: 8000, wis: 5000, ctrl: 8000 },
                imageUrl:"https://i.ibb.co/S7Dp4b7V/Kakao-Talk-20251226-125123758.png",
                secondaryOptions: ["마법 공격력 +1000%", "상태이상 저항 +100%", "최종 능력치 +500%", "마법 명중률 +250%","INT +350%","WIS +350%"],
                enhancement: 0
            },
            {
                name: "샤이닝 엔젤 소드",
                type: "SubWeapon",
                weaponType: "SubSword",
                rarity: ItemRarity.MYTHTIC,
                description: "성스러운 기운이 가득찬 보조검.",
                stats: { str: 2000, int: 500, wis: 2000, ctrl: 5000 },
                secondaryOptions: ["마법 방어력 +300%", "MP +500%", "INT +500%","WIS +500%", "최대 HP +250%"],
                imageUrl:"https://i.ibb.co/Jjr4Tr4K/Kakao-Talk-20251224-155153604-01.png",
                enhancement: 0
            },
            {
                name: "엔젤 티아라",
                type: "Head",
                rarity: ItemRarity.MYTHTIC,
                description: "줄리엣의 자비가 깃든 티아라.",
                stats: { int: 5000, wis: 3000, ctrl: 4000 },
                secondaryOptions: ["최종 능력치 +500%", "모든 상태이상 저항 +50%", "모든 속성 저항 +300%", "최대 HP +250%"],
                imageUrl:"https://i.ibb.co/xKZ4DwWz/Kakao-Talk-20251224-155153604-03.png",
                enhancement: 0
            },
            {
                name: "엘리시안 로브",
                type: "Body",
                rarity: ItemRarity.MYTHTIC,
                description: "빛으로 직조된 성스러운 의복.",
                stats: { def: 7000, hp: 20000, wis: 7000 },
                secondaryOptions: ["마법 방어력 +800%", "최대 HP +300%","물리 방어력 +500%","모든 능력치 +500%"],
                imageUrl:"https://i.ibb.co/0pmg7Sw2/Kakao-Talk-20251224-155153604-02.png",
                enhancement: 0
            },
            {
                name: "빛의 세례 손길",
                type: "Hand",
                rarity: ItemRarity.MYTHTIC,
                description: "모든 어둠을 정화하는 빛의 장갑.",
                stats: { int: 3000, ctrl: 3000 },
                secondaryOptions: ["마법 공격력 +400%", "AGI +500%","모든 능력치 +500%","광휘계 속성 피해 +200%"],
                imageUrl:"https://i.ibb.co/PGZ8gmKv/Kakao-Talk-20251224-155153604-04.png",
                enhancement: 0
            },
            {
                name: "성역의 발걸음",
                type: "Feet",
                rarity: ItemRarity.MYTHTIC,
                description: "빛의 경로를 따라 이동하게 해주는 신발.",
                stats: { agi: 5000, wis: 2000 },
                imageUrl:"https://i.ibb.co/1tjStLhp/Kakao-Talk-20251224-155153604-05.png",
                secondaryOptions: ["AGI +500%","WIS +500%","INT +500%","광휘계 속성 피해 +200%"],
                enhancement: 0
            },
            {
                name: "광휘의 눈물의 목걸이",
                type: "Accessory",
                rarity: ItemRarity.MYTHTIC,
                description: "줄리엣의 슬픔과 자애가 담긴 펜던트.",
                stats: { int: 2000, wis: 2000, ctrl: 2000 },
                secondaryOptions: ["최종 능력치 +300%", "광휘계 피해 증가 +500%","모든 속성 저항 +200%","마법 방어력 +500%"],
                imageUrl:"https://i.ibb.co/j1MfxxL/Kakao-Talk-20251224-155153604-06.png",
                enhancement: 0
            },
            {
                name: "광휘의 조각",
                type: "Etc",
                rarity: ItemRarity.LEGENDARY,
                description: "광휘의 성소에서 떨어져 나온 신비로운 조각.",
                imageUrl:"https://i.ibb.co/67fBshwJ/Kakao-Talk-20251224-155153604-07.png",
                enhancement: 0
            }
        ],
        visualUrl: "https://i.ibb.co/zT1mwBgJ/Kakao-Talk-20251226-125233710.png",
        level: 9000,
        skills: [
            createBossSkill("엘리시안 저지먼트", "[부가 효과: 소멸] 성역의 모든 적을 빛으로 태웁니다.", SkillType.MAGIC, 1200, 300, "INT*12.0"),
            createBossSkill("광휘의 자애로운 치유", "성역의 빛을 내려 자신의 상처를 치유하고 생명력을 크게 회복합니다.", SkillType.BUFF, 120, 150, "HP 25% 회복, RECOV:HP", 'self'),
            createBossSkill("성녀의 광휘 환생", "사망에 이르는 치명상을 입었을 때 빛의 축복으로 생명을 되살려 환생합니다.", SkillType.BUFF, 0, 200, "RESURRECT 50%, HP 50% 부활", 'self')
        ]
    },
    "라페르난데스": {
        id:"mythicboss_la",
        name: "라 페르난데스",
        title: "화염의 사자",
        shinryokuType: "화염계",
        description: "화염의 사자의 성화에서 현신하는 투사입니다. 타오르는 투지로 적을 압도합니다.",
        specialLoot: "이그니션 세트",
        detailedLoot: [
            {
                name: "이그니션 라피에르",
                type: "Weapon",
                weaponType: "Sword",
                elementalType: "화염계",
                rarity: ItemRarity.MYTHTIC,
                description: "화염의 사자가 사용하는 예리한 불꽃의 검.",
                stats: { str: 8000, agi: 8000, ctrl: 5000 },
                secondaryOptions: ["물리 공격력 +1000%", "물리 명중률 +500%", "화염계 속성 부여", "최종 능력치 +500%"],
                imageUrl:"https://i.ibb.co/S4WmXMnb/Kakao-Talk-20251226-095920314-14.png",
                enhancement: 0
            },
            {
                name: "불타는 투구",
                type: "Head",
                rarity: ItemRarity.MYTHTIC,
                description: "타오르는 갈기가 특징인 투구.",
                stats: { str: 3000, def: 3000, ctrl: 4000 },
                secondaryOptions: ["STR +100%", "물리 공격력 +200%","물리 방어력 +200%"],
                imageUrl:"https://i.ibb.co/J89ycYR/Kakao-Talk-20251226-095920314-11.png",
                enhancement: 0
            },
            {
                name: "화염의 흉갑",
                type: "Body",
                rarity: ItemRarity.MYTHTIC,
                description: "열기를 흡수하여 힘으로 바꾸는 갑옷.",
                stats: { def: 6000, str: 4000, hp: 20000 },
                secondaryOptions: ["DEF +100%", "모든 속성 저항 +100%","HP +500%","물리 방어력 +200%"],
                imageUrl:"https://i.ibb.co/9H2GdgY6/Kakao-Talk-20251226-095920314-12.png",
                enhancement: 0
            },
            {
                name: "폭열의 건틀릿",
                type: "Hand",
                rarity: ItemRarity.MYTHTIC,
                description: "주먹질 한 번에 폭발을 일으키는 장갑.",
                stats: { str: 4000, agi: 2000 },
                secondaryOptions: ["물리 공격력 +300%", "치명타 확률 +150%","화염계 속성 피해 +200%","모든 능력치 +250%"],
                imageUrl:"https://i.ibb.co/4ny6b44N/Kakao-Talk-20251226-095920314-13.png",
                enhancement: 0
            },
            {
                name: "용암 보폭",
                type: "Feet",
                rarity: ItemRarity.MYTHTIC,
                description: "지나가는 자리에 불길을 남기는 장화.",
                stats: { agi: 6000, def: 2000 },
                secondaryOptions: ["AGI +100%", "물리 회피율 +300%","화염계 속성 피해 +150%","모든 능력치 +250%"],
                imageUrl:"https://i.ibb.co/TQyMbnr/Kakao-Talk-20251226-095920314-09.png",
                enhancement: 0
            },
            {
                name: "성화의 고리",
                type: "Accessory",
                rarity: ItemRarity.MYTHTIC,
                description: "꺼지지 않는 성화의 힘이 담긴 반지.",
                stats: { str: 2000, int: 2000, ctrl: 2000 },
                secondaryOptions: ["최종 능력치 +300%", "화염 피해 증가 +150%","물리 공격력 +250%","STR +150%","물리 명중률 +250%"],
                imageUrl:"https://i.ibb.co/Q4nCmyF/Kakao-Talk-20251226-095920314-10.png",
                enhancement: 0
            },
            {
                name: "태우는 심장",
                type: "Etc",
                rarity: ItemRarity.LEGENDARY,
                description: "라 페르난데스의 투지가 응축된 조각.",
                imageUrl:"https://i.ibb.co/ccGfg9qV/Kakao-Talk-20251226-095920314-08.png",
                enhancement: 0
            }
        ],
        visualUrl: "https://i.ibb.co/1fZpFXbf/Kakao-Talk-20251226-202406954-02.png",
        level: 8500,
        skills: [createBossSkill("인페르나 임팩트", "[부가 효과: 화상] 성화의 기운을 폭발시켜 전장을 불태웁니다.", SkillType.MAGIC, 1300, 350, "INT*13.0")]
    },
    "원지원": {
        id:"mythicboss_won",
        name: "원지원",
        title: "지령의 사자",
        shinryokuType: "대지계",
        description: "지령의 사자의 궁궐에서 대륙의 무게를 다스리는 수호자입니다.",
        specialLoot: "가이아 세트",
        detailedLoot: [
            {
                name: "그라운드 바스타드 소드",
                type: "Weapon",
                weaponType: "Sword",
                elementalType: "대지계",
                rarity: ItemRarity.MYTHTIC,
                description: "대륙을 뒤흔드는 파괴력을 지닌 대검.",
                stats: { str: 8000, def: 1000, wis: 2000 },
                imageUrl:"https://i.ibb.co/gLLkG9MY/Kakao-Talk-20251224-155153604-16.png",
                secondaryOptions: ["최종 능력치 + 1000%", "물리 공격력 + 500%", "HP +500%", "DEF +300%","물리 명중률 +250%"],
                enhancement: 0
            },
            {
                name: "대지의 방패",
                type: "SubWeapon",
                weaponType: "Shield",
                rarity: ItemRarity.MYTHTIC,
                description: "대지의 무게를 담은 강력한 방패.",
                stats: { def: 15000, hp: 50000 },
                secondaryOptions: ["물리 방어력 +1000%", "마법 방어력 +1000%", "최종 능력치 +300%","모든 속성 저항 +300%","물리 명중률 +250%"],
                imageUrl:"https://i.ibb.co/vCH621PV/Kakao-Talk-20251224-155153604-17.png",
                enhancement: 0
            },
            {
                name: "산맥의 투구",
                type: "Head",
                rarity: ItemRarity.MYTHTIC,
                description: "바위처럼 단단한 방어력을 선사하는 투구.",
                stats: { def: 4000, wis: 3000, ctrl: 3000 },
                secondaryOptions: ["DEF +500%", "상태이상 저항 +100%","모든 속성 저항 +200%"],
                imageUrl:"https://i.ibb.co/5x5W65s2/Kakao-Talk-20251224-155153604-19.png",
                enhancement: 0
            },
            {
                name: "대륙의 강갑",
                type: "Body",
                rarity: ItemRarity.MYTHTIC,
                description: "어떠한 공격에도 굴하지 않는 대지의 갑옷.",
                stats: { def: 10000, hp: 100000, str: 3000 },
                secondaryOptions: ["물리 방어력 +1000%", "최대 HP +1000%","모든 속성 저항 +200%"],
                imageUrl:"https://i.ibb.co/6RXLkf3n/Kakao-Talk-20251224-155153604-18.png",
                enhancement: 0
            },
            {
                name: "지각 변동 장갑",
                type: "Hand",
                rarity: ItemRarity.MYTHTIC,
                description: "땅의 기운을 손에 집중시키는 장갑.",
                stats: { str: 4000, def: 3000 },
                secondaryOptions: ["물리 공격력 +300%", "DEF +200%","모든 능력치 +150%"],
                imageUrl:"https://i.ibb.co/ns1C0zdz/Kakao-Talk-20251224-155153604-20.png",
                enhancement: 0
            },
            {
                name: "뿌리 깊은 장화",
                type: "Feet",
                rarity: ItemRarity.MYTHTIC,
                description: "어떤 충격에도 밀려나지 않게 해주는 신발.",
                stats: { def: 5000, agi: 2000 },
                secondaryOptions: ["DEF +500%", "마법 방어력 +500%","물리 명중률 +200%","모든 능력치 +200%"],
                imageUrl:"https://i.ibb.co/gb7r65Np/Kakao-Talk-20251224-155153604-21.png",
                enhancement: 0
            },
            {
                name: "가이아의 정수",
                type: "Accessory",
                rarity: ItemRarity.MYTHTIC,
                description: "대지의 생명력이 가득 찬 목걸이.",
                stats: { str: 3000, def: 3000, hp: 10000 },
                secondaryOptions: ["최종 능력치 +400%", "대지계 피해 증가 +250%","물리 공격력 +150%"],
                imageUrl:"https://i.ibb.co/pNHp4wm/Kakao-Talk-20251224-155153604-22.png",
                enhancement: 0
            },
            {
                name: "지령의 맥",
                type: "Etc",
                rarity: ItemRarity.LEGENDARY,
                description: "지령의 사자의 궁궐에서 가져온 땅의 맥.",
                imageUrl:"https://i.ibb.co/9HcnBzrH/Kakao-Talk-20251224-155153604-23.png",
                enhancement: 0
            }
        ],
        visualUrl: "https://i.ibb.co/KCxNzVh/Kakao-Talk-20251226-202406954.png",
        level: 8500,
        skills: [createBossSkill("가이아스 피날레", "[부가 효과: 속박] 대지를 뒤틀어 적들을 매장합니다.", SkillType.PHYSICAL, 1500, 400, "STR*15.0")]
    },
    "권율": {
        id:"mythicboss_kwon",
        name: "권율",
        title: "전격의 사자",
        shinryokuType: "전격계",
        description: "신계의 가장 높은 곳에서 벼락을 내리는 집행자입니다.",
        specialLoot: "제우스 라이트닝 세트",
        detailedLoot: [
            {
                name: "제우스 라이트닝 소드",
                type: "Weapon",
                weaponType: "Sword",
                elementalType: "전격계",
                rarity: ItemRarity.MYTHTIC,
                description: "천둥의 기운이 휘몰아치는 검.",
                stats: { str: 7000, agi: 12000, ctrl: 5000 },
                imageUrl:"https://i.ibb.co/tTsFRdRX/Kakao-Talk-20251224-155153604-08.png",
                secondaryOptions: ["물리 공격력 +1000%", "치명타 확률 +100%", "전격계 속성 부여","전격계 속성 피해 +250%"],
                enhancement: 0
            },
            {
                name: "썬더 라이트닝 오브",
                type: "SubWeapon",
                weaponType: "Orb",
                rarity: ItemRarity.MYTHTIC,
                description: "벼락을 모아 적에게 방출하는 보주.",
                stats: { int: 8000, ctrl: 5000, agi: 5000 },
                imageUrl:"https://i.ibb.co/Fb6wQk36/Kakao-Talk-20251224-155153604-09.png",
                secondaryOptions: ["물리 공격력 +800%", "AGI +300%", "전격계 피해 증가 +50%", "최대 HP +50%"],
                enhancement: 0
            },
            {
                name: "뇌신의 투구",
                type: "Head",
                rarity: ItemRarity.MYTHTIC,
                description: "천둥 소리와 함께 빛나는 전사의 투구.",
                stats: { agi: 4000, ctrl: 4000, def: 2000 },
                secondaryOptions: ["AGI +500%", "물리 명중률 +100%","물리 공격력 +150%"],
                imageUrl:"https://i.ibb.co/Y6bByyd/Kakao-Talk-20251224-155153604-13.png",
                enhancement: 0
            },
            {
                name: "전격의 전갑",
                type: "Body",
                rarity: ItemRarity.MYTHTIC,
                description: "번개를 두른 듯한 전신 갑옷.",
                stats: { def: 5000, agi: 5000, hp: 30000 },
                secondaryOptions: ["물리 방어력 +500%", "물리 회피율 +50%","물리 공격력 +150%"],
                imageUrl:"https://i.ibb.co/NhZFGtw/Kakao-Talk-20251224-155153604-10.png",
                enhancement: 0
            },
            {
                name: "벼락 깃든 장갑",
                type: "Hand",
                rarity: ItemRarity.MYTHTIC,
                description: "벼락 깃든 장갑",
                stats: { str: 4000, ctrl: 3000 },
                secondaryOptions: ["물리 명중률 +250%", "치명타 피해 +300%","물리 공격력 +150%"],
                imageUrl:"https://i.ibb.co/zTbpTsgK/Kakao-Talk-20251224-155153604-11.png",
                enhancement: 0
            },
            {
                name: "뇌속의 장화",
                type: "Feet",
                rarity: ItemRarity.MYTHTIC,
                description: "번개처럼 빠른 움직임을 가능케 하는 장화.",
                stats: { agi: 10000, def: 2000 },
                secondaryOptions: ["AGI +1000%", "물리 회피율 +250%", "마법 회피율 +250%", "최대 HP +50%","모든 능력치 +150%"],
                imageUrl:"https://i.ibb.co/v4ph5Pvg/Kakao-Talk-20251224-155153604-12.png",
                enhancement: 0
            },
            {
                name: "천둥의 징표",
                type: "Accessory",
                rarity: ItemRarity.MYTHTIC,
                description: "제우스의 권능을 상징하는 번개 모양 펜던트.",
                stats: { str: 3000, int: 3000, agi: 3000 },
                secondaryOptions: ["최종 능력치 +400%", "모든 상태이상 저항 +50%","물리 공격력 +150%"],
                imageUrl:"https://i.ibb.co/60sp7cnG/Kakao-Talk-20251224-155153604-14.png",
                enhancement: 0
            },
            {
                name: "심판의 벼락 조각",
                type: "Etc",
                rarity: ItemRarity.LEGENDARY,
                description: "권율이 내린 벼락이 땅에 박혀 굳은 파편.",
                imageUrl:"https://i.ibb.co/CgZwjKm/Kakao-Talk-20251224-155153604-15.png",
                enhancement: 0
            }
        ],
        visualUrl: "https://i.ibb.co/7JzfS4xJ/Kakao-Talk-20251226-202406954-01.png",
        level: 8500,
        skills: [createBossSkill("제우스 엠퍼러 피날레", "[부가 효과: 감전] 수만 갈래의 벼락으로 적을 찢습니다.", SkillType.MAGIC, 1800, 500, "INT*18.0")]
    },
    "네오다크볼튼": {
        id:"mythicboss_bolton",
        name: "네오 다크 볼튼",
        title: "암연의 사자",
        shinryokuType: "암흑계",
        description: "암흑과 기계가 융합된 금단의 존재입니다.",
        specialLoot: "네오 다크 싱귤래리티 세트",
        detailedLoot: [
            {
                name: "네오 다크 레이저건",
                type: "Weapon",
                weaponType: "Heavy",
                elementalType: "암흑계",
                rarity: ItemRarity.MYTHTIC,
                description: "모든 빛을 빨아들이는 암흑 광선을 발사합니다.",
                stats: { int: 12000, ctrl: 8000, wis: 5000 },
                secondaryOptions: ["마법 공격력 +700%", "물리 공격력 +270%", "암흑계 속성 부여", "최종 능력치 +250%"],
                imageUrl:"https://i.ibb.co/FqXQX7Pm/Kakao-Talk-20251226-095920314-07.png",
                enhancement: 0
            },
            {
                name: "블랙홀 코어 보주",
                type: "SubWeapon",
                weaponType: "Orb",
                rarity: ItemRarity.MYTHTIC,
                description: "끝없는 중력 가속을 발생시키는 엔진 코어.",
                stats: { int: 7000, wis: 7000, ctrl: 10000 },
                secondaryOptions: ["MP +1000%", "마법 공격력 +500%", "최종 능력치 +300%", "최대 HP +250%"],
                imageUrl:"https://i.ibb.co/5htW1Y2d/Kakao-Talk-20251226-095920314-06.png",
                enhancement: 0
            },
            {
                name: "사이버네틱 다크 헬름",
                type: "Head",
                rarity: ItemRarity.MYTHTIC,
                description: "전술 데이터를 분석하여 약점을 노출시키는 헬름.",
                stats: { ctrl: 6000, wis: 4000, def: 3000 },
                secondaryOptions: ["치명타 확률 +100%", "CTRL +500%","물리 방어력 +250%"],
                imageUrl:"https://i.ibb.co/5gTWZFJQ/Kakao-Talk-20251226-095920314-05.png",
                enhancement: 0
            },
            {
                name: "보이드 메카 아머",
                type: "Body",
                rarity: ItemRarity.MYTHTIC,
                description: "공허의 합금으로 제작된 초고강도 아머.",
                stats: { def: 8000, hp: 60000, wis: 4000 },
                secondaryOptions: ["마법 방어력 +500%", "물리 방어력 +400%","치명타 피해 감소 +50%"],
                imageUrl:"https://i.ibb.co/vCw8HDZB/Kakao-Talk-20251226-095920314-02.png",
                enhancement: 0
            },
            {
                name: "중력 제어 장갑",
                type: "Hand",
                rarity: ItemRarity.MYTHTIC,
                description: "공간을 비틀어 타격력을 증폭시키는 장갑.",
                stats: { int: 4000, ctrl: 4000 },
                secondaryOptions: ["마법 공격력 +400%", "모든 속성 저항 +250%","모든 능력치 +500%"],
                imageUrl:"https://i.ibb.co/23pwhksj/Kakao-Talk-20251226-095920314-03.png",
                enhancement: 0
            },
            {
                name: "어둠의 가속 추진기",
                type: "Feet",
                rarity: ItemRarity.MYTHTIC,
                description: "그림자 속을 순간 이동하게 해주는 부츠.",
                stats: { agi: 8000, ctrl: 2000 },
                secondaryOptions: ["AGI +400%", "물리 회피율 +200%","모든 능력치 +500%"],
                imageUrl:"https://i.ibb.co/pjm3q6H8/Kakao-Talk-20251226-095920314-04.png",
                enhancement: 0
            },
            {
                name: "네오 다크 엔진",
                type: "Accessory",
                rarity: ItemRarity.MYTHTIC,
                description: "심연의 동력을 무한히 생성하는 기계 코어.",
                stats: { int: 8000, ctrl: 10000, agi: 1000 },
                secondaryOptions: ["MP +500%", "암흑계 속성 피해 +50%", "상태이상 저항 +50%", "CTRL +200%","모든 능력치 +500%"],
                imageUrl:"https://i.ibb.co/hFWz2Dnt/Kakao-Talk-20251226-095920314-01.png",
                enhancement: 0
            },
            {
                name: "공허의 나사",
                type: "Etc",
                rarity: ItemRarity.LEGENDARY,
                description: "네오 다크 볼튼의 몸체에서 떨어져 나온 고차원 금속 부품.",
                imageUrl:"https://i.ibb.co/rRKrtztm/Kakao-Talk-20251226-095920314.png",
                enhancement: 0
            }
        ],
        visualUrl: "https://i.ibb.co/pBcf3YnS/Chat-GPT-Image-2025-12-27-11-41-20.png",
        level: 9000,
        skills: [createBossSkill("네오 크로니클 엔딩", "[부가 효과: 암흑] 공학적으로 설계된 암흑 에너지를 쏩니다.", SkillType.MAGIC, 1400, 400, "INT*14.0")]
    },
    "최원한": {
        id:"mythicboss_choi",
        name: "최원한",
        title: "월광의 사자",
        shinryokuType: "월광계",
        description: "월광의 사자의 성에서 침묵 속에서 적을 기다리는 무사입니다.",
        specialLoot: "명월 무영 세트",
        detailedLoot: [
            {
                name: "명월 쌍도",
                type: "Weapon",
                weaponType: "Sword",
                elementalType: "월광계",
                rarity: ItemRarity.MYTHTIC,
                description: "달빛을 머금어 차갑게 빛나는 쌍검.",
                stats: { str: 10000, agi: 12000, ctrl: 10000 },
                imageUrl:"https://i.ibb.co/d4095HwJ/Kakao-Talk-20251224-155153604-24.png",
                secondaryOptions: ["물리 공격력 +1500%", "치명타율 +100%", "AGI +500%","최종 능력치 +1000%","물리 명중률 +250%"],
                enhancement: 0
            },
            {
                name: "침묵의 단도",
                type: "SubWeapon",
                weaponType: "SubSword",
                rarity: ItemRarity.MYTHTIC,
                description: "소리 없이 적의 목숨을 앗아가는 보조검.",
                stats: { str: 4000, agi: 6000, ctrl: 4000 },
                mythicOption:MythicOptionType.EVA_IGNORE, 
                secondaryOptions: ["치명타 피해 +500%", "물리 공격력 +700%", "모든 속성 피해 +250%", "최대 HP +250%"],
                imageUrl:"https://i.ibb.co/jP6wDGgG/Kakao-Talk-20251224-155153604-25.png",
                enhancement: 0
            },
            {
                name: "월광의 삿갓",
                type: "Head",
                rarity: ItemRarity.MYTHTIC,
                description: "기척을 숨기고 적의 시야를 흐리는 삿갓.",
                stats: { agi: 5000, ctrl: 5000, def: 2000 },
                secondaryOptions: ["물리 회피율 +250%", "상태이상 저항 +250%","모든 능력치 +1000%"],
                imageUrl:"https://i.ibb.co/YTFyLPpC/Kakao-Talk-20251224-155153604-28.png",
                enhancement: 0
            },
            {
                name: "그림자 무사복",
                type: "Body",
                rarity: ItemRarity.MYTHTIC,
                description: "달빛 아래서 형태가 불분명해지는 검은 옷.",
                stats: { def: 4000, agi: 6000, hp: 25000 },
                secondaryOptions: ["AGI +400%", "물리 방어력 +500%","모든 능력치 +1000%"],
                imageUrl:"https://i.ibb.co/ZRVnMJkb/Kakao-Talk-20251224-155153604-26.png",
                enhancement: 0
            },
            {
                name: "월식의 토시",
                type: "Hand",
                rarity: ItemRarity.MYTHTIC,
                description: "쌍검의 위력을 극대화하는 무사의 토시.",
                stats: { str: 3000, agi: 3000, ctrl: 3000 },
                secondaryOptions: ["물리 공격력 +400%", "AGI +500%","모든 능력치 +1000%"],
                imageUrl:"https://i.ibb.co/JwNSmgQr/Kakao-Talk-20251224-155153604-27.png",
                enhancement: 0
            },
            {
                name: "무영의 버선",
                type: "Feet",
                rarity: ItemRarity.MYTHTIC,
                description: "발소리를 완전히 지워주는 신발.",
                stats: { agi: 8000, def: 2000 },
                secondaryOptions: ["AGI +600%", "치명타 확률 +20%","모든 능력치 +1000%"],
                imageUrl:"https://i.ibb.co/KzzNVLPf/Kakao-Talk-20251224-155153604-29.png",
                enhancement: 0
            },
            {
                name: "만월의 펜던트",
                type: "Accessory",
                rarity: ItemRarity.MYTHTIC,
                description: "보름달의 정기가 서린 은색 목걸이.",
                stats: { str: 2000, int: 2000, wis: 2000, ctrl: 2000 },
                secondaryOptions: ["최종 능력치 +500%", "월광계 피해 증가 +50%","물리 공격력 +1000%"],
                mythicOption:MagyeOptionType.DEMONIZE, 
                imageUrl:"https://i.ibb.co/VYWsRhkL/Kakao-Talk-20251224-160623506.png",
                enhancement: 0
            },
            {
                name: "침묵의 대나무",
                type: "Etc",
                rarity: ItemRarity.LEGENDARY,
                description: "최원한의 검기가 닿아 소리조차 나지 않게 된 대나무.",
                imageUrl:"https://i.ibb.co/tp0MWsrq/Kakao-Talk-20251224-155154612.png",
                enhancement: 0
            }
        ],
        visualUrl: "https://i.ibb.co/2YCPhFbr/Kakao-Talk-20251227-121624903.png",
        level: 10000,
        skills: [createBossSkill("최후의 문 블랙홀 해방", "[부가 효과: 월침] 적의 영혼을 베어내는 참격입니다.", SkillType.PHYSICAL, 1600, 350, "STR*16.0")]
    },
    "태스크슈카인": {
        id:"mythicboss_schkein",
        name: "태스크 슈카인",
        title: "초화의 사자",
        shinryokuType: "초화계",
        description: "초화의 사자의 성초에서 생명과 죽음을 관장하는 존재입니다.",
        specialLoot: "시드 오브 에덴 세트",
        detailedLoot: [
            {
                name: "에덴 크로스보우",
                type: "Weapon",
                weaponType: "Crossbow",
                elementalType: "초화계",
                rarity: ItemRarity.MYTHTIC,
                description: "생명의 근원에서 꺾어온 성스러운 석궁.",
                stats: { int: 6000, wis: 10000, ctrl: 6000 },
                secondaryOptions: ["마법 공격력 +700%", "MP +500%", "초화계 속성 부여", "최종 능력치 +250%"],
                enhancement: 0,
                imageUrl:"https://i.ibb.co/0pqTWws4/Kakao-Talk-20251226-102251598-05.png"
            },
            {
                name: "시드 오브 에덴",
                type: "SubWeapon",
                weaponType: "Orb",
                rarity: ItemRarity.MYTHTIC,
                description: "생명의 근원에서 시작된 강력한 씨앗.",
                stats: { int: 15000, wis: 15000 },
                secondaryOptions: ["MP +2000%", "HP +1500%", "상태이상 저항 +100%", "마법 공격력 +500%","마법 명중률 +500%"],
                enhancement: 0,
                imageUrl:"https://i.ibb.co/zVSFFCPB/Kakao-Talk-20251226-102251598-04.png"
            },
            {
                name: "에덴의 꽃관",
                type: "Head",
                rarity: ItemRarity.MYTHTIC,
                description: "결코 시들지 않는 영원한 생명의 꽃으로 만든 관.",
                stats: { wis: 5000, ctrl: 5000, def: 2000 },
                secondaryOptions: ["최종 능력치 +500%", "HP +250%","물리 방어력 +250%","마법 방어력 +250%"],
                enhancement: 0,
                imageUrl:"https://i.ibb.co/C3RcqpGC/Kakao-Talk-20251226-102251598-03.png"
            },
            {
                name: "생명의 잎사귀 갑주",
                type: "Body",
                rarity: ItemRarity.MYTHTIC,
                description: "자연의 기운으로 엮은 강력한 방어구.",
                stats: { def: 6000, hp: 50000, wis: 4000 },
                secondaryOptions: ["물리 방어력 +800%", "모든 속성 저항 +250%","HP +250%"],
                enhancement: 0,
                imageUrl:"https://i.ibb.co/CKmmpKJm/Kakao-Talk-20251226-102251598-02.png"
            },
            {
                name: "덩굴 속박 장갑",
                type: "Hand",
                rarity: ItemRarity.MYTHTIC,
                description: "적의 기운을 흡수하는 살아있는 장갑.",
                stats: { int: 3000, wis: 3000 },
                secondaryOptions: ["마법 공격력 +500%", "공격 시 30% 확률로 속박 부여","물리 방어력 +250%"],
                enhancement: 0,
                imageUrl:"https://i.ibb.co/JRcV7dVS/Kakao-Talk-20251226-102251598-01.png"
            },
            {
                name: "태고의 씨앗",
                type: "Etc",
                rarity: ItemRarity.LEGENDARY,
                description: "세상이 처음 생겨날 때 존재했던 식물의 근원.",
                enhancement: 0,
                imageUrl:"https://i.ibb.co/RGsGZpFQ/Kakao-Talk-20251226-102251598.png"
            }
        ],
        visualUrl: "https://i.ibb.co/q3pMsZ8X/Chat-GPT-Image-2025-12-27-11-41-24.png",
        level: 8500,
        skills: [createBossSkill("블룸 오브 엘테르나", "[부가 효과: 재생] 아군은 치유하고 적의 기운을 흡수합니다.", SkillType.MAGIC, 1200, 450, "WIS*12.0")]
    },
    "퍼스트스틸스": {
        id:"mythicboss_steels",
        name: "퍼스트 스틸스",
        title: "강철의 사자",
        shinryokuType: "강철계",
        description: "강철의 사자의 강성을 지탱하는 가장 단단한 수호자입니다.",
        specialLoot: "아이언 바스티온 세트",
        detailedLoot: [
            {
                name: "메탈 브레이커",
                type: "Weapon",
                weaponType: "Blunt",
                elementalType: "강철계",
                rarity: ItemRarity.MYTHTIC,
                description: "강력한 강철의 힘이 담긴 대형 강철 도검.",
                stats: { str: 10000, def: 5000, hp: 20000 },
                secondaryOptions: ["물리 명중률 +250%","물리 공격력 +1200%", "물리 방어력 +100%", "상태이상 저항 +100%", "최종 능력치 +150%"],
                enhancement: 0,
                imageUrl:"https://i.ibb.co/BKC4Z2wk/Gemini-Generated-Image-3lp59t3lp59t3lp5.png",
            },
            {
                name: "강철의 요새 방패",
                type: "SubWeapon",
                weaponType: "Shield",
                rarity: ItemRarity.MYTHTIC,
                description: "그 어떤 신의 일격도 막아낸다는 전설의 방패.",
                stats: { def: 20000, hp: 100000 },
                secondaryOptions: ["물리 방어력 +2000%", "마법 방어력 +1000%", "모든 속성 저항 +100%", "최대 HP +50%"],
                enhancement: 0,
                imageUrl:"https://i.ibb.co/GvhYPwpN/Gemini-Generated-Image-b4aujeb4aujeb4au.png",
            },
            {
                name: "아이언 마스크",
                type: "Head",
                rarity: ItemRarity.MYTHTIC,
                description: "감정을 배제하고 오직 효율적인 방어만을 생각하게 하는 투구.",
                stats: { def: 5000, str: 3000, ctrl: 3000 },
                secondaryOptions: ["DEF +1000%", "치명타 피해량 +100%","마법 방어력 +250%","모든 능력치 +250%"],
                enhancement: 0,
                imageUrl:"https://i.ibb.co/Z6yWhGGW/Gemini-Generated-Image-mu3smymu3smymu3s.png",
            },
            {
                name: "절대 강철 갑주",
                type: "Body",
                rarity: ItemRarity.MYTHTIC,
                description: "세상에서 가장 밀도 높은 금속으로 제작된 갑옷.",
                stats: { def: 15000, hp: 150000, str: 5000 },
                secondaryOptions: ["물리 방어력 +1500%","모든 능력치 +250%"],
                enhancement: 0,
                imageUrl:"https://i.ibb.co/N6qHN1kW/Gemini-Generated-Image-13nxrn13nxrn13nx.png",
            },
            {
                name: "강철 파쇄 장갑",
                type: "Hand",
                rarity: ItemRarity.MYTHTIC,
                description: "주먹 하나하나가 공성추와 같은 위력을 내는 장갑.",
                stats: { str: 6000, def: 4000 },
                secondaryOptions: ["물리 공격력 +500%", "물리 방어력 +300%","모든 능력치 +250%"],
                enhancement: 0,
                imageUrl:"https://i.ibb.co/gFjvTsfV/Gemini-Generated-Image-z3adhjz3adhjz3ad.png"
            },
            {
                name: "초고강도 합금",
                type: "Etc",
                rarity: ItemRarity.LEGENDARY,
                description: "현재의 기술로는 분석 불가능한 신계의 금속.",
                imageUrl:"https://i.ibb.co/zHjYh7BH/Gemini-Generated-Image-5cnwq75cnwq75cnw.png",
                enhancement: 0
            }
        ],
        visualUrl: "https://i.ibb.co/sJs06FHh/Gemini-Generated-Image-hjq9p3hjq9p3hjq9.png",
        level: 8500,
        skills: [createBossSkill("판데모니움 드라이브", "[부가 효과: 파열] 거대한 방패로 적을 짓누릅니다.", SkillType.PHYSICAL, 2000, 500, "DEF*20.0")]
    },
    "오션레이크": {
        id:"mythicboss_ocean",
        name: "오션 레이크",
        title: "해수의 사자",
        shinryokuType: "해수계",
        description: "성수전 깊은 곳에서 모든 물줄기를 통제하는 사자입니다.",
        specialLoot: "테티스 앱솔루트 세트",
        detailedLoot: [
            {
                name: "테티스 엄브렐라 스태프",
                type: "Weapon",
                weaponType: "Staff",
                elementalType: "해수계",
                rarity: ItemRarity.MYTHTIC,
                description: "바다의 모든 마력이 응축된 우산 모양의 스태프.",
                stats: { int: 10000, wis: 8000, agi: 5000 },
                secondaryOptions: ["마법 공격력 +1000%", "마법 방어력 +100%", "해수계 속성 부여", "최종 능력치 +350%"],
                enhancement: 0,
                imageUrl:"https://i.ibb.co/ZRwTbsFJ/Gemini-Generated-Image-140wvn140wvn140w.png"
            },
            {
                name: "심해의 소용돌이 보주",
                type: "SubWeapon",
                weaponType: "Orb",
                rarity: ItemRarity.MYTHTIC,
                description: "모든 것을 빨아들이는 물살을 조종하는 보주.",
                stats: { int: 7000, wis: 12000, ctrl: 5000 },
                secondaryOptions: ["마법 공격력 +500%", "MP +2000%", "상태이상 저항 +100%", "최대 HP +350%"],
                enhancement: 0,
                imageUrl:"https://i.ibb.co/DPkHZ1RG/Gemini-Generated-Image-9cqp0i9cqp0i9cqp.png"
            },
            {
                name: "해신의 비늘 예복",
                type: "Body",
                rarity: ItemRarity.MYTHTIC,
                description: "물리적 타격을 물처럼 흘려보내는 신비한 옷.",
                stats: { def: 5000, wis: 10000, hp: 30000 },
                secondaryOptions: ["마법 방어력 +1500%", "물리 방어력 + 230%","모든 능력치 +250%"],
                enhancement: 0,
                imageUrl:"https://i.ibb.co/cXD3CGy5/Gemini-Generated-Image-ktiq8pktiq8pktiq.png"
            },
            {
                name: "앱솔루트 아쿠아 장갑",
                type: "Hand",
                rarity: ItemRarity.MYTHTIC,
                description: "물줄기를 칼날처럼 날카롭게 만드는 장갑.",
                stats: { int: 5000, wis: 3000 },
                secondaryOptions: ["마법 공격력 +400%", "치명타 확률 +50%","모든 능력치 +400%"],
                enhancement: 0,
                imageUrl:"https://i.ibb.co/CKCwMg0n/Gemini-Generated-Image-3o0mkz3o0mkz3o0m.png"
            },
            {
                name: "심해의 발자취",
                type: "Feet",
                rarity: ItemRarity.MYTHTIC,
                description: "물 위를 걷고 물속에서 자유로워지는 장화.",
                stats: { agi: 8000, wis: 2000 },
                secondaryOptions: ["AGI +800%", "물리 회피율 +140%","마법 공격력 +250%","마법 회피율 +250%"],
                enhancement: 0,
                imageUrl:"https://i.ibb.co/fdmvsM1Z/Gemini-Generated-Image-ea5jofea5jofea5j.png"
            },
            {
                name: "영원한 파도 조각",
                type: "Etc",
                rarity: ItemRarity.LEGENDARY,
                description: "굳지 않고 끊임없이 요동치는 신비로운 액체 금속.",
                enhancement: 0,
                imageUrl:"https://i.ibb.co/BJ7vQfW/Gemini-Generated-Image-xf4urxxf4urxxf4u.png"
            }
        ],
        visualUrl: "https://i.ibb.co/DP11ZYBk/Chat-GPT-Image-2025-12-27-11-45-40.png",
        level: 8500,
        skills: [createBossSkill("마린 템페스트 레퀴엠", "[부가 효과: 빙결] 전장을 거대한 물감옥으로 만듭니다.", SkillType.MAGIC, 1500, 450, "INT*15.0")]
    },
    "이케블리자더": {
        id:"mythicboss_ike",
        name: "이케 블리자더",
        title: "빙결의 사자",
        shinryokuType: "빙결계",
        description: "빙궁의 차가운 보좌에서 모든 생명을 얼어붙게 만듭니다.",
        specialLoot: "앱솔루트 제로 세트",
        detailedLoot: [
            {
                name: "프리즈 크리스탈 건",
                type: "Weapon",
                weaponType: "Firearm",
                elementalType: "빙결계",
                rarity: ItemRarity.MYTHTIC,
                description: "절대 영도의 한기를 담은 수정 총.",
                stats: { int: 11000, wis: 7000, ctrl: 6000 },
                secondaryOptions: ["마법 공격력 +1200%", "빙결 확률 +50%", "빙결계 속성 부여", "최종 능력치 +450%"],
                imageUrl:"https://i.ibb.co/20z9Kj3Z/Gemini-Generated-Image-58ueid58ueid58ue.png",
                enhancement: 0
            },
            {
                name: "프리즈 크리스탈 시드",
                type: "SubWeapon",
                weaponType: "Orb",
                rarity: ItemRarity.MYTHTIC,
                description: "절대 영도의 한기를 담은 수정구.",
                stats: { int: 10000, wis: 2500, ctrl: 5000 },
                secondaryOptions: ["마법 공격력 +600%", "[부가 효과: 빙결] 빙결 상태이상 확률 100% 고정", "AGI +300%", "최대 HP +250%"],
                enhancement: 0,
                imageUrl:"https://i.ibb.co/bjGBhLFK/Gemini-Generated-Image-iw6zleiw6zleiw6z.png"
            },
            {
                name: "서리의 왕관",
                type: "Head",
                rarity: ItemRarity.MYTHTIC,
                description: "착용하는 것만으로 주변의 열기를 빼앗는 왕관.",
                stats: { int: 5000, wis: 5000, def: 2000 },
                secondaryOptions: ["최종 능력치 +500%", "마법 공격력 +500%"],
                enhancement: 0,
                imageUrl:"https://i.ibb.co/TxxyTkrr/Gemini-Generated-Image-csgjgecsgjgecsgj.png",
            },
            {
                name: "만년설의 수의",
                type: "Body",
                rarity: ItemRarity.MYTHTIC,
                description: "결코 녹지 않는 얼음으로 직조된 옷.",
                stats: { def: 6000, wis: 8000, hp: 40000 },
                secondaryOptions: ["마법 방어력 +1200%", "빙결계 속성 저항 +300%","모든 능력치 +500%"],
                enhancement: 0,
                imageUrl:"https://i.ibb.co/F4HwZDj1/Gemini-Generated-Image-ufprouufprouufpr.png",
            },
            {
                name: "혹한의 얼음 손길",
                type: "Hand",
                rarity: ItemRarity.MYTHTIC,
                description: "적의 마나를 얼려 스킬 사용을 방해하는 장갑.",
                stats: { int: 4000, wis: 4000 },
                secondaryOptions: ["마법 공격력 +400%", "빙결계 속성 피해 +250%","모든 능력치 +500%"],
                enhancement: 0,
                imageUrl:"https://i.ibb.co/DDCVhtJM/Gemini-Generated-Image-s8l2qis8l2qis8l2.png",
            },
            {
                name: "빙하의 흔적",
                type: "Feet",
                rarity: ItemRarity.MYTHTIC,
                description: "얼음 위를 미끄러지듯 빠르게 이동하는 신발.",
                stats: { agi: 9000, def: 2000 },
                secondaryOptions: ["AGI +800%", "마법 회피율 +240%","모든 능력치 +500%"],
                enhancement: 0,
                imageUrl:"https://i.ibb.co/tTDNFd7P/Gemini-Generated-Image-mje0anmje0anmje0.png",
            },
            {
                name: "절대영도의 핵",
                type: "Accessory",
                rarity: ItemRarity.MYTHTIC,
                description: "이 세상에서 가장 낮은 온도를 품고 있는 결정.",
                stats: { int: 4000, wis: 4000, ctrl: 4000 },
                secondaryOptions: ["최종 능력치 +500%", "빙결계 속성 피해 증가 +50%","모든 능력치 +500%"],
                imageUrl:"https://i.ibb.co/jZgcpCF0/Gemini-Generated-Image-y3vawry3vawry3va.png",
                enhancement: 0
            },
            {
                name: "동결된 시간",
                type: "Etc",
                rarity: ItemRarity.LEGENDARY,
                description: "한기 속에 갇혀 영원히 멈춰버린 시계 태엽.",
                enhancement: 0,
                imageUrl:"https://i.ibb.co/5h5TfCDG/Gemini-Generated-Image-1jtssb1jtssb1jts.png",
            }
        ],
        visualUrl: "https://i.ibb.co/fYdPnFSQ/Chat-GPT-Image-2025-12-27-11-48-35.png",
        level: 8500,
        skills: [createBossSkill("퍼마 프로스트 디멘션", "[부가 효과: 빙결] 전장의 시간을 얼려버립니다.", SkillType.MAGIC, 1700, 500, "INT*17.0")]
    },
    "홍길동": {
        id:"mythicboss_hong",
        name: "홍길동",
        title: "동에 번쩍 서에 번쩍 무의 사자",
        shinryokuType: "신체강화계",
        description: "무의 궁궐을 지키는 도사입니다. 분신술과 축지법으로 적을 농락합니다.",
        specialLoot: "무형의 도 세트",
        detailedLoot: [
            {
                name: "무형의 도",
                type: "Weapon",
                weaponType: "Sword",
                elementalType: "신체강화계",
                rarity: ItemRarity.MYTHTIC,
                description: "세상을 평정할 형태가 존재하지 않는 도.",
                stats: { agi: 15000, ctrl: 10000, str: 2000 },
                imageUrl:"https://i.ibb.co/ZRV0GWQV/Kakao-Talk-20251224-155154612-02.png",
                secondaryOptions: ["AGI +480%", "무기강화계 속성 부여", "치명타 피해량 +200%", "모든 능력치 +1000%","물리 회피율 +250%"],
                enhancement: 0
            },
            {
                name: "자운풍 보주",
                type: "SubWeapon",
                weaponType: "Orb",
                rarity: ItemRarity.MYTHTIC,
                description: "구름을 타고 바람을 부리는 도사의 보주.",
                stats: { wis: 8000, ctrl: 8000, int: 4000 },
                imageUrl:"https://i.ibb.co/6R7zDbgn/Kakao-Talk-20251224-155154612-01.png",
                secondaryOptions: ["물리 회피율 +100%", "마법 방어력 +500%", "최종 능력치 +600%","모든 속성 저항 +250%"],
                enhancement: 0
            },
            {
                name: "도사의 갓",
                type: "Head",
                rarity: ItemRarity.MYTHTIC,
                description: "만물의 기운을 읽는 도사의 갓.",
                stats: { wis: 5000, ctrl: 5000, agi: 3000 },
                secondaryOptions: ["WIS +500%", "상태이상 저항 +100%","마법 공격력 +550%"],
                imageUrl:"https://i.ibb.co/S4nkQW9n/Kakao-Talk-20251224-185005473-01.png",
                enhancement: 0
            },
            {
                name: "쾌의 (快衣)",
                type: "Body",
                rarity: ItemRarity.MYTHTIC,
                description: "가볍고 질기며 도술이 깃든 의복.",
                stats: { def: 3000, hp: 30000, agi: 7000 },
                secondaryOptions: ["물리 방어력 +500%", "AGI +500%", "최대 HP +300%", "최대 HP +250%","모든 능력치 +500%"],
                imageUrl:"https://i.ibb.co/qFFHNnYn/Kakao-Talk-20251224-185005473-03.png",
                enhancement: 0
            },
            {
                name: "무극의 수대",
                type: "Hand",
                rarity: ItemRarity.MYTHTIC,
                description: "기의 흐름을 제어하는 손목 띠.",
                stats: { str: 4000, agi: 4000, ctrl: 4000 },
                secondaryOptions: ["물리 공격력 +500%", "치명타 피해 +400%","모든 능력치 +500%"],
                imageUrl:"https://i.ibb.co/HfbcCrQQ/Kakao-Talk-20251224-185005473-02.png",
                enhancement: 0
            },
            {
                name: "축지혜 (縮地鞋)",
                type: "Feet",
                rarity: ItemRarity.MYTHTIC,
                description: "축지법의 권능이 깃든 신발.",
                stats: { agi: 12000, ctrl: 2000 },
                secondaryOptions: ["AGI +1500%", "물리 명중률 +300%","모든 능력치 +500%"],
                imageUrl:"https://i.ibb.co/TBnyX4d5/Kakao-Talk-20251224-185005473.png",
                enhancement: 0
            },
            {
                name: "호패 (豪牌)",
                type: "Accessory",
                rarity: ItemRarity.MYTHTIC,
                description: "홍길동이 지니고 있는 부적.",
                stats: { str: 3000, int: 3000, agi: 3000, wis: 3000, ctrl: 3000 },
                secondaryOptions: ["최종 능력치 +600%", "상태이상 면역","물리 공격력 +500%","마법 공격력 +500%","물리 명중률 +500%","마법 명중률 +500%","모든 속성 저항 +200%"],
                imageUrl:"https://i.ibb.co/LX0mc2m4/Kakao-Talk-20251226-100309793-01.png",
                enhancement: 0
            },
            {
                name: "활빈당의 의기",
                type: "Etc",
                rarity: ItemRarity.LEGENDARY,
                description: "백성을 돕고자 하는 굳건한 의지가 서린 조각.",
                enhancement: 0,
                imageUrl:"https://i.ibb.co/qLrfqcHr/Kakao-Talk-20251226-100309793.png",
            }
        ],
        visualUrl: "https://i.ibb.co/4RVcHNPM/Chat-GPT-Image-2025-12-27-11-50-46.png",
        level: 9999,
        skills: [createBossSkill("원초의 단절", "수천의 분신이 동시에 적을 공격합니다.", SkillType.PHYSICAL, 2000, 600, "AGI*20.0")]
    },
    "블랙스톰": {
        id:"mythicboss_black",
        name: "블랙 스톰",
        title: "질풍의 사자",
        shinryokuType: "질풍계",
        description: "질풍전 상공에서 폭풍을 몰고 오는 사자입니다.",
        specialLoot: "보이드 스톰 세트",
        detailedLoot: [
            {
                name: "블랙 스톰 윈드 너클",
                type: "Weapon",
                weaponType: "Knuckle",
                elementalType: "질풍계",
                rarity: ItemRarity.MYTHTIC,
                description: "폭풍의 힘을 제어하는 고대의 너클.",
                stats: { agi: 13000, str: 5000, ctrl: 5000 },
                secondaryOptions: ["AGI +1000%", "물리 공격력 +500%", "상태이상 저항 +50%", "[부가 효과: 파열] 확률 100%","모든 능력치 +300%"],
                enhancement: 0,
                imageUrl:"https://i.ibb.co/qMnngShW/Gemini-Generated-Image-jvewmbjvewmbjvew.png"
            },
            {
                name: "질풍의 경갑",
                type: "Body",
                rarity: ItemRarity.MYTHTIC,
                description: "바람을 타고 움직이게 해주는 가벼운 갑옷.",
                stats: { def: 4000, agi: 8000, hp: 20000 },
                secondaryOptions: ["AGI +600%", "물리 회피율 +300%","모든 능력치 +500%"],
                enhancement: 0,
                imageUrl:"https://i.ibb.co/Gf0FV3CC/Gemini-Generated-Image-t60ibut60ibut60i.png"
            },
            {
                name: "폭풍의 토시",
                type: "Hand",
                rarity: ItemRarity.MYTHTIC,
                description: "팔의 움직임을 바람처럼 빠르게 만드는 토시.",
                stats: { str: 4000, agi: 4000 },
                secondaryOptions: ["AGI +500%", "물리 공격력 +300%","모든 능력치 +500%"],
                enhancement: 0,
                imageUrl:"https://i.ibb.co/Psxvn1HR/Gemini-Generated-Image-bie8uvbie8uvbie8.png"
            },
            {
                name: "허리케인 부츠",
                type: "Feet",
                rarity: ItemRarity.MYTHTIC,
                description: "폭풍의 속도를 발끝에 실어주는 부츠.",
                stats: { agi: 15000, def: 1000 },
                secondaryOptions: ["AGI +1500%", "마법 회피율 +250%","모든 능력치 +500%"],
                enhancement: 0,
                imageUrl:"https://i.ibb.co/cKLHRsDF/Gemini-Generated-Image-wawr20wawr20wawr.png"
            },
            {
                name: "질풍의 숨결",
                type: "Accessory",
                rarity: ItemRarity.MYTHTIC,
                description: "바람의 정령의 축복이 깃든 목걸이.",
                stats: { agi: 4000, ctrl: 4000, wis: 4000 },
                secondaryOptions: ["최종 능력치 +500%", "질풍계 피해 증가 +250%","모든 능력치 +500%"],
                enhancement: 0,
                imageUrl:"https://i.ibb.co/dvf2yqN/Gemini-Generated-Image-vzmfe6vzmfe6vzmf.png"
            },
            {
                name: "응축된 태풍",
                type: "Etc",
                rarity: ItemRarity.LEGENDARY,
                description: "블랙 스톰의 중심부에서 추출한 요동치는 바람의 정수.",
                enhancement: 0,
                imageUrl:"https://i.ibb.co/W7ppfqf/Gemini-Generated-Image-7m1onh7m1onh7m1o.png"
            }
        ],
        visualUrl: "https://i.ibb.co/JRCpg85B/Chat-GPT-Image-2025-12-27-11-41-27.png",
        level: 8500,
        skills: [createBossSkill("진공 붕괴", "[부가 효과: 혼란] 공기를 압축하여 거대한 충격파를 만듭니다.", SkillType.MAGIC, 1400, 400, "AGI*14.0")]
    },
    "제로": {
        id:"mythicboss_zero",
        name: "제1 제너럴 제로",
        title: "공허의 왕",
        shinryokuType: "암흑계",
        description: "임페리얼 제국의 제2도시 프라이드를 다스리는 정점의 장군입니다. 검은 왕관을 쓴 거대한 그림자 군주, 뭄 내부가 별처럼 비어 있습니다.",
        specialLoot: "공허왕의 반지",
        detailedLoot: [{
            name: "공허왕의 반지",
            type: "Accessory",
            rarity: ItemRarity.MYTHTIC,
            description: "공허왕의 그림자의 기운이 깃든 반지.",
            stats: { str: 3000, int: 3000, agi: 3000, ctrl: 3000 },
            secondaryOptions: ["모든 능력치 +300%", "상태 이상 저항 +100%", "[부가 효과: 공포] 공격 시 100% 확률로 공포", "최대 HP +50%"],
            enhancement: 0,
            imageUrl:"https://i.ibb.co/k60ky5qF/Kakao-Talk-20251229-171210776-02.png"
        },
        {name: "공허왕의 로브",
            type: "Body",
            rarity: ItemRarity.MYTHTIC,
            description: "공허왕의 그림자의 기운이 깃든 검은 로브.",
            stats: { str: 1000, wis: 1000, def: 3000, ctrl: 1000 },
            secondaryOptions: ["물리 방어력 +300%", "상태 이상 저항 +100%", "모든 능력치 +350%", "최대 HP +50%"],
            enhancement: 0,
            imageUrl:"https://i.ibb.co/XfTkxFvV/Kakao-Talk-20251229-171209541-21.png"
        },
        {name: "공허절단의 검",
            type: "Weapon",
            weaponType:"Sword",
            elementalType:"암흑계",
            rarity: ItemRarity.MYTHTIC,
            description: "공허왕의 그림자를 절단할 정도의 검.",
            stats: { wis: 1000, str: 3000, int: 3000 },
            secondaryOptions: ["마법 공격력 +300%", "STR +300%", "물리공격력 +350%", "최종 능력치 +250%"],
            enhancement: 0,
            imageUrl:"https://i.ibb.co/N6tHwHtY/Kakao-Talk-20251229-171209541-19.png"},
            {name: "공허왕의 왕관",
            type: "Head",
            rarity: ItemRarity.MYTHTIC,
            description: "공허왕의 그림자의 기운이 깃든 강력한 왕관.",
            stats: { wis: 1000, def: 1000, ctrl: 3000 },
            secondaryOptions: ["마법 방어력 +300%", "상태 이상 저항 +100%", "모든 능력치 +350%", "최대 HP +250%"],
            enhancement: 0,
            imageUrl:"https://i.ibb.co/h1KTh8Qs/Kakao-Talk-20251229-171209541-20.png"},
            {name: "심연 보행자의 장화",
            type: "Feet",
            rarity: ItemRarity.MYTHTIC,
            description: "공허왕의 그림자의 기운이 깃든 강력한 신발.",
            stats: { wis: 1000, def: 1000, agi: 3000 },
            secondaryOptions: ["STR +300%", "CTRL +300%", "AGI +350%", "최대 HP +250%"],
            enhancement: 0,
            imageUrl:"https://i.ibb.co/8LF2w5kP/Kakao-Talk-20251229-171209541-18.png"},
            {name: "공허의 서",
            type: "SubWeapon",
            weaponType:"Grimoire",
            rarity: ItemRarity.MYTHTIC,
            description: "공허왕의 그림자의 기운이 깃든마법서.",
            stats: { wis: 2000, str: 1000, ctrl: 3000 },
            secondaryOptions: ["INT +300%", "CTRL +300%", "모든 능력치 +350%", "최대 HP +250%"],
            enhancement: 0,
            imageUrl:"https://i.ibb.co/VYF9fFSv/Kakao-Talk-20251229-171209541-16.png"},
            {name: "공허의 손",
            type: "Hand",
            rarity: ItemRarity.MYTHTIC,
            description: "공허왕의 그림자의 손.",
            stats: { int: 3000, str: 1000, ctrl: 5000 },
            secondaryOptions: ["CTRL +500%", "모든 능력치 +500%"],
            enhancement: 0,
            imageUrl:"https://i.ibb.co/HDR5Gv94/Kakao-Talk-20251229-220532159-01.png"},
            {name: "공허의 재",
            type: "Etc",
            rarity: ItemRarity.LEGENDARY,
            description: "공허왕의 그림자의 기운이 조금 남은 재.",
            imageUrl:"https://i.ibb.co/S7ng0hph/Kakao-Talk-20251229-171209541-06.png"}
            ],
        visualUrl: "https://i.ibb.co/39yK16BR/Kakao-Talk-20251229-085504416-03.png",
        level: 9000,
        skills: [createBossSkill("아비스 엔드", "[부가 효과: 소멸] 전장 전체를 공허로 덮는 절대적인 그림자입니다.", SkillType.MAGIC, 1500, 400, "INT*25.0",'aoe'
        )]
    },
    "루시엔": {
        id:"mythicboss_lucien",
        name: "제2 제너럴 루시엔",
        title: "광기의 여왕",
        shinryokuType: "암흑계",
        description: "아름다우나 얼굴이 깨진 마신의 여성.",
        specialLoot: "광기의 목걸이",
        detailedLoot: [{
            name: "광기의 목걸이",
            type: "Accessory",
            rarity: ItemRarity.MYTHTIC,
            description: "광기의 힘으로 많은 걸 자신의 것으로 만드는 신비한 보석.",
            stats: { wis: 4000, ctrl: 3000, hp: 51000 },
            secondaryOptions: ["마법 공격력 +500%", "암흑계 속성 피해 +150%", "상태이상 저항 +100%", "최대 HP +150%"],
            enhancement: 0,
            imageUrl:"https://i.ibb.co/ksbNH8jG/Kakao-Talk-20251229-171210776-01.png"
        },
        { name: "파멸된 여왕의 가면",
            type: "Head",
            rarity: ItemRarity.MYTHTIC,
            description: "광기에 저려 파멸되버린 여왕의 얼굴의 모습이 본따진 가면.",
            stats: { wis: 2000, def: 1000, int: 2000 },
            secondaryOptions: ["마법 방어력 +300%", "물리 방어력 +100%", "상태이상 저항 +100%", "최대 HP +150%"],
            enhancement: 0,
            imageUrl:"https://i.ibb.co/Dffn0Cdf/Kakao-Talk-20251229-171209541-15.png"},

            {name: "정신 파열의 홀",
            type: "Weapon",
            weaponType:"Staff",
            elementalType:"암흑계",
            rarity: ItemRarity.MYTHTIC,
            description: "광기의 힘으로 정신 분열을 일으키는 스태프.",
            stats: { wis: 2000, int: 4000 },
            secondaryOptions: ["마법 공격력 +300%", "물리 공격력 +100%", "모든 능력치 +100%", "최종 능력치 +150%"],
            enhancement: 0,
            imageUrl:"https://i.ibb.co/mVJ6YyBg/Kakao-Talk-20251229-171209541-14.png"},
            {name: "광휘 균열 드레스",
            type: "Body",
            rarity: ItemRarity.MYTHTIC,
            description: "광기의 힘에 균열된 드레스.",
            stats: { wis: 2000, int: 4000 },
            secondaryOptions: ["마법 공격력 +300%", "물리 공격력 +100%", "모든 능력치 +100%", "최대 HP +150%"],
            enhancement: 0,
            imageUrl:"https://i.ibb.co/39sngyFH/Kakao-Talk-20251229-171209541-17.png"},
            {name: "광기의 무도화",
            type: "Feet",
            rarity: ItemRarity.MYTHTIC,
            description: "광기의 무도회에서 신는 신발.",
            stats: { agi: 2000, int: 2000 },
            secondaryOptions: ["마법 공격력 +250%", "AGI +100%", "모든 능력치 +100%", "최대 HP +150%"],
            enhancement: 0,
            imageUrl:"https://i.ibb.co/N6T49gwd/Kakao-Talk-20251229-171209541-13.png"},
            {name: "망각의 수정구",
            type: "SubWeapon",
            weaponType:"Orb",
            elementalType:"암흑계",
            rarity: ItemRarity.MYTHTIC,
            description: "광기의 힘으로 망각을 일으키는 수정구.",
            stats: { wis: 2000, int: 2000, ctrl: 1000 },
            secondaryOptions: ["마법 공격력 +200%", "WIS +200%", "모든 능력치 +100%", "최대 HP +150%"],
            enhancement: 0,
            imageUrl:"https://i.ibb.co/NdQnFZVz/Kakao-Talk-20251229-171209541-12.png"},
            {name: "광기의 여왕의 난자",
            type: "Etc",
            rarity: ItemRarity.LEGENDARY,
            description: "광기의 여왕의 착란으로 생긴 알.",
            imageUrl:"https://i.ibb.co/zH5p3MVW/Kakao-Talk-20251229-171209541-05.png"},
       
        ],
        visualUrl: "https://i.ibb.co/BHdsZwDr/Kakao-Talk-20251229-085504416.png",
        level: 8500,
        skills: [createBossSkill("멘탈 크러쉬", "[부가 효과: 혼란] 적들이 서로를 공격하도록 정신을 붕괴시킵니다.", SkillType.DEBUFF, 0, 500, "Confusion(100%), ALL_STATS -50%",'aoe')]
    },
    "아포리아": {
        id:"mythicboss_aporia",
        name: "제3 제너럴 아포리아",
        title: "마신황의 그림자",
        shinryokuType: "암흑계",
        description: "명확한 형체 없음. 왕좌에 앉은 인간 실루엣과 무수한 그림자 날개가 함께 합니다.",
        specialLoot: "종언의 왕관",
        detailedLoot: [{
            name: "종언의 왕관",
            type: "Head",
            elementalType: "암흑계",
            rarity: ItemRarity.MYTHTIC,
            description: "세상의 끝을 알리는 절대적인 왕관.",
            stats: { str: 1000, agi: 2000, ctrl: 3000 },
            secondaryOptions: ["물리 공격력 +800%", "[부가 효과: 화상] 공격 시 100% 확률로 화상", "치명타율 +500%", "최대 HP +350%"],
            enhancement: 0,
            imageUrl:"https://i.ibb.co/ZRJphbgM/Kakao-Talk-20251229-171210776.png"
        },
        {name: "종언의 갑옷",
            type: "Body",
            elementalType: "암흑계",
            rarity: ItemRarity.MYTHTIC,
            description: "세상의 끝을 알리는 절대적인 갑옷.",
            stats: { str: 1000, def: 2000, ctrl: 3000 },
            secondaryOptions: ["물리 방어력 +300%", "[부가 효과: 화상] 공격 시 100% 확률로 화상", "치명타율 +500%", "최대 HP +500%"],
            enhancement: 0,
            imageUrl:"https://i.ibb.co/8g2VW1kb/Kakao-Talk-20251229-171209541-10.png"},
            {name: "절대 종언의 에너지",
            type: "Weapon",
            weaponType:"Energy",
            elementalType: "암흑계",
            rarity: ItemRarity.MYTHTIC,
            description: "세상의 끝을 알리는 절대적인 에너지.",
            stats: { str: 1000, int: 2000, ctrl: 3000 },
            secondaryOptions: ["마법 공격력 +500%", "[부가 효과: 소멸] 공격 시 100% 확률로 소멸", "WIS +100%", "최종 능력치 +50%"],
            enhancement: 0,
            imageUrl:"https://i.ibb.co/G3kF3sPN/Kakao-Talk-20251229-171209541-08.png"},
            {name: "그림자 제왕의 행보",
            type: "Feet",
            rarity: ItemRarity.MYTHTIC,
            description: "세상의 끝을 알리는 그림자 제왕의 가는 길을 이끄는 신발.",
            stats: { agi: 2000, ctrl: 3000 },
            secondaryOptions: ["STR +100%", "AGI +300%", "모든 능력치 +100%", "최대 HP +50%"],
            enhancement: 0,
            imageUrl:"https://i.ibb.co/xq982N6T/Kakao-Talk-20251229-171209541-07.png"},
            {name: "마신황의 인장",
            type: "SubWeapon",
            weaponType:"Orb",
            elementalType: "암흑계",
            rarity: ItemRarity.MYTHTIC,
            description: "그림자 왕의 인장.",
            stats: { str: 1000, ctrl: 3000 },
            secondaryOptions: ["마법 공격력 +500%"],
            enhancement: 0,
            imageUrl:"https://i.ibb.co/hxcTMVm7/Kakao-Talk-20251229-171209541-09.png"},
            {name: "왕좌의 그림자 망토",
            type: "Accessory",
            elementalType: "암흑계",
            rarity: ItemRarity.MYTHTIC,
            description: "세상의 끝을 알리는 절대적인 망토.",
            stats: { str: 1000, int: 2000, ctrl: 3000 },
            secondaryOptions: ["물리 공격력 +400%", "마법 공격력 +200%", "WIS +300%", "최대 HP +50%"],
            enhancement: 0,
            imageUrl:"https://i.ibb.co/67SP2HY5/Kakao-Talk-20251229-171209541-11.png"},
            {name: "종언의 파편",
            type: "Etc",
            rarity: ItemRarity.MYTHTIC,
            description: "세상의 끝을 알리는 물질의 파편 조각.",
            imageUrl:"https://i.ibb.co/sdFtybWT/Kakao-Talk-20251229-171209541-04.png"},
        ],
        visualUrl: "https://i.ibb.co/z1WLvr5/Kakao-Talk-20251229-085504416-13.png",
        level: 8400,
        skills: [createBossSkill("절대 종언", "[부가 효과: 소멸] 전투 필드를 강력한 그림자의 날개짓으로 그림자 폭풍을 일으킵니다.", SkillType.PHYSICAL, 2000, 500, "STR*20.0",'aoe')]
    },
    "바르칼론": {
        id:"mythicboss_barcalone",
        name: "제4 제너럴 바르칼론",
        title: "종언의 용인",
        shinryokuType: "암흑계",
        description: "날개끝이 부서진 종말의 흑룡이자 용인의 형태, 몸에 고대 룬이 각인됐습니다.",
        specialLoot: "종언룡의 심장갑주",
        detailedLoot: [{
            name: "종언룡의 심장갑주",
            type: "Body",
            rarity: ItemRarity.MYTHTIC,
            description: "종언용인의 심장과 비늘을 이용해 만들어진 갑주.",
            stats: { int: 3000, wis: 1000, def: 3000 },
            secondaryOptions: ["AGI +100%", "암흑계 속성 저항 +50%", "MP +500%", "최대 HP +250%"],
            imageUrl:"https://i.ibb.co/0pqZP3pH/Kakao-Talk-20251229-171209541-29.png",
            enhancement: 0
        },
        { name: "흑룡의 창",
            type: "Weapon",
            weaponType:"Spear",
            elementalType:"암흑계",
            rarity: ItemRarity.MYTHTIC,
            description: "종언용인이 사용하는 창.",
            stats: { str: 3000, wis: 1000, def: 2000 },
            secondaryOptions: ["AGI +400%", "암흑계 속성 부여", "STR +500%", "최종 능력치 +250%"],
            imageUrl:"https://i.ibb.co/ds07S0zM/Kakao-Talk-20251229-171209541-03.png",
            enhancement: 0},
            {
                name: "용인의 심장",
            type: "Accessory",
            rarity: ItemRarity.MYTHTIC,
            description: "종언용인의 엄청난 창.",
            stats: { str: 1000, hp: 10000, def: 3000 },
            secondaryOptions: ["STR +200%", "모든 능력치 +400%"],
            imageUrl:"https://i.ibb.co/rfZgrj1s/Kakao-Talk-20251229-171209541-02.png",
            enhancement: 0},
            {name: "종언룡의 투구",
            type: "Head",
            rarity: ItemRarity.MYTHTIC,
            description: "종언룡의 머리를 잘라 만든 투구.",
            stats: { str: 1000, def: 3000, wis:1500 },
            secondaryOptions: ["STR +200%", "WIS +200%", "DEF +200%", "최대 HP +150%"],
            imageUrl:"https://i.ibb.co/RpvzpNyk/Kakao-Talk-20251229-171209541.png",
            enhancement: 0},
            {name: "용혈 장화",
            type: "Feet",
            rarity: ItemRarity.MYTHTIC,
            description: "흑룡의 피가 굳어 생긴 장화.",
            stats: { agi: 1000, def: 3000, wis:2500 },
            secondaryOptions: ["AGI +200%", "WIS +200%", "DEF +200%", "최대 HP +150%"],
            imageUrl:"https://i.ibb.co/2rFpKst/Kakao-Talk-20251229-171209541-01.png",
    },
    {name: "종언룡의 비늘",
            type: "Etc",
            rarity: ItemRarity.LEGENDARY,
            description: "종언룡의 가죽을 벗겨낸 비늘.",
            imageUrl:"https://i.ibb.co/ZRWPSBKd/Kakao-Talk-20251229-220532159-02.png",},
    ],
        visualUrl: "https://i.ibb.co/7Jn9195N/Kakao-Talk-20251229-085504416-02.png",
        level: 8200,
        skills: [createBossSkill("라스트 브레스", "[부가 효과: 화상] 강력한 최후의 브레스.", SkillType.MAGIC, 1200, 300, "INT*12.0")]
    },
    "아자르": {
        id:"mythicboss_hazar",
        name: "제5 제너럴 아자르",
        title: "천벌의 사도",
        shinryokuType: "광휘계",
        description: "타락한 천사형 몬스터이자 부러진 날개와 검은 후광을 비춥니다.",
        specialLoot: "",
        detailedLoot: [{
            name: "타락천벌의 대검",
            type: "Weapon",
            weaponType:"Sword",
            rarity: ItemRarity.MYTHTIC,
            elementalType:"암흑계",
            description: "타락천사의 대검.",
            stats: { def: 1000, str: 5000, hp: 1000 },
            secondaryOptions: ["물리 공격력 +600%", "광휘계 속성 부여", "물리 방어력 +100%", "최종 능력치 +510%"],
            imageUrl:"https://i.ibb.co/KpkXKHSb/Kakao-Talk-20251229-171209541-28.png",
            enhancement: 0
        }, {
            name: "심판자의 갑의",
            type: "Body",
            rarity: ItemRarity.MYTHTIC,
            description: "타락천사인 심판자의 갑옷.",
            stats: { def: 5000, str: 1000, hp: 30000 },
            secondaryOptions: ["물리 공격력 +500%", "물리 방어력 +300%"],
            imageUrl:"https://i.ibb.co/nqXSGtzF/Kakao-Talk-20251229-220532159-03.png",
            enhancement: 0
        }, {
            name: "파괴된 후광",
            type: "Accessory",
            rarity: ItemRarity.MYTHTIC,
            description: "타락천사에 뒤에 있는 부서진 형태의 후광",
            stats: { def: 1000, str: 1000, wis: 3000 },
            secondaryOptions: ["물리 공격력 +400%", "광휘계 속성 피해 +50%", "마법 방어력 +200%", "최대 HP +50%"],
            imageUrl:"https://i.ibb.co/vxrFfQ1B/Kakao-Talk-20251229-220532159.png",
            enhancement: 0
        }, {
            name: "타락천사의 두건",
            type: "Head",
            rarity: ItemRarity.MYTHTIC,
            description: "타락천사의 두건",
            stats: { def: 2000, wis: 1000, int: 2000 },
            secondaryOptions: ["마법 공격력 +200%", "모든 능력치 +300%", "물리 방어력 +100%", "최대 HP +50%"],
            imageUrl:"https://i.ibb.co/KpkXKHSb/Kakao-Talk-20251229-171209541-28.png",
            enhancement: 0
        }, {
            name: "천벌의 강림화",
            type: "Feet",
            rarity: ItemRarity.MYTHTIC,
            description: "타락천사가 신는 신발",
            stats: { def: 1000, str: 1000, agi: 2500 },
            secondaryOptions: ["STR +300%", "AGI +200%", "물리 방어력 +100%", "최대 HP +50%"],
            imageUrl:"https://i.ibb.co/pr355F3J/Kakao-Talk-20251229-220532159-05.png",
            enhancement: 0
        }, {
            name: "타락천사의 찢어진 날개 조각",
            type: "Etc",
            rarity: ItemRarity.LEGENDARY,
            description: "타락천사의 날개가 찢어져 조각형태로 된 것",
            imageUrl:"https://i.ibb.co/N2kjZ6Cj/Kakao-Talk-20251229-220532159-06.png",
            enhancement: 0
        }, {
    name: "마계의 핵",
    type: "Accessory",
    rarity: ItemRarity.LEGENDARY,
    description: "고대 마계의 동력원이었던 결정체입니다.",
    stats: { ctrl: 200 },
    secondaryOptions: ["모든 스탯 +250%"],
    enhancement: 0,
    imageUrl:"https://i.ibb.co/KzXgZt5w/Gemini-Generated-Image-9sv52s9sv52s9sv5.png"  
}],
        visualUrl: "https://i.ibb.co/KxJyM661/Kakao-Talk-20251229-085504416-11.png",
        level: 8000,
        skills: [createBossSkill("신벌 강림", "[부가 효과: 혼란] 빛과 암 복합적인 초광역 심판공격.", SkillType.PHYSICAL, 1600, 450, "STR*16.0")]
    },
    "카르니발": {
        id:"mythicboss_carnival",
        name: "제6 제너럴 카르니발",
        title: "학살의 기사",
        shinryokuType: "암흑계",
        description: "피로 물든 흑기사와 웃는 가면",
        specialLoot: "학살자의 대검",
        detailedLoot: [{
            name: "학살자의 대검",
            type: "Weapon",
            weaponType: "Sword",
            rarity: ItemRarity.MYTHTIC,
            description: "적의 생명력을 흡수하여 주인에게 바치는 불길한 검.",
            stats: { str: 3000, int: 4000, hp: 20000 },
            secondaryOptions: ["물리 공격력 +300%", "무기강화계 속성 부여", "HP +200%", "최종 능력치 +250%"],
            imageUrl:"https://i.ibb.co/MyksH1nB/Kakao-Talk-20251229-171209541-27.png",
            enhancement: 0
        },{
            name: "도살자의 흑철갑",
            type: "Body",
            rarity: ItemRarity.MYTHTIC,
            description: "적의 생명력을 흡수한 어두운 철의 갑옷.",
            stats: { str: 1000, def: 1000, hp: 50000 },
            secondaryOptions: ["물리 공격력 +250%", "상태이상 저항 +50%", "HP +200%", "최대 HP +150%"],
            imageUrl:"https://i.ibb.co/8Dc5x0fj/Kakao-Talk-20251229-220532159-11.png",
            enhancement: 0
        },{
            name: "웃는 학살 가면",
            type: "Head",
            rarity: ItemRarity.MYTHTIC,
            description: "잔인한 학살의 형태로 이루어진 불길한 얼굴의 가면.",
            stats: { str: 3000, int: 1000, ctrl: 2000 },
            secondaryOptions: ["물리 공격력 +300%", "[부가 효과: 출혈]", "MP +200%", "최대 HP +150%"],
            imageUrl:"https://i.ibb.co/Ld5jjZKw/Kakao-Talk-20251229-220532159-07.png",
            enhancement: 0
        },{
            name: "피의 맹약 반지",
            type: "Accessory",
            rarity: ItemRarity.MYTHTIC,
            description: "적의 생명력을 흡수하여 주인에게 바치는 불길한 반지.",
            stats: { hp: 200000 },
            secondaryOptions: ["물리 공격력 +300%", "MP +300%"],
            imageUrl:"https://i.ibb.co/N2nHb5QW/Kakao-Talk-20251229-220532159-08.png",
            enhancement: 0
        },{
            name: "피바람 군화",
            type: "Feet",
            rarity: ItemRarity.MYTHTIC,
            description: "피바람이 불어오르는 신발.",
            stats: { str: 1000, agi: 4000, hp: 10000 },
            secondaryOptions: ["물리 방어력 +100%", "물리 공격력 +200%", "AGI +100%", "최대 HP +50%"],
            imageUrl:"https://i.ibb.co/7xL0K3Lt/Kakao-Talk-20251229-220532159-10.jpg",
            enhancement: 0
        },{
            name: "굳어버린 피조각",
            type: "Etc",
            rarity: ItemRarity.LEGENDARY,
            description: "적의 생명력을 흡수하여 생겨버린 오래된 피조각",
            imageUrl:"https://i.ibb.co/tpwfCfrk/Kakao-Talk-20251229-220532159-09.png",
            enhancement: 0
        }, {
    name: "마계의 핵",
    type: "Accessory",
    rarity: ItemRarity.LEGENDARY,
    description: "고대 마계의 동력원이었던 결정체입니다.",
    stats: { ctrl: 200 },
    secondaryOptions: ["모든 스탯 +250%"],
    enhancement: 0,
    imageUrl:"https://i.ibb.co/KzXgZt5w/Gemini-Generated-Image-9sv52s9sv52s9sv5.png"  
}],
        visualUrl: "https://i.ibb.co/xtZQc1xy/Kakao-Talk-20251229-085504416-01.png",
        level: 7900,
        skills: [createBossSkill("블러디 퍼레이드", "[부가 효과: 출혈] 적의 HP를 대량으로 출혈 시킵니다.", SkillType.MAGIC, 1400, 400, "INT*14.0")]
    },
    "이그니스": {
        id:"mythicboss_ignis",
        name: "제7 제너럴 이그니스",
        title: "연옥의 주인",
        shinryokuType: "화염계",
        description: "불길로 이루어진 날개달린 악마입니다.",
        specialLoot: "",
        detailedLoot: [{
            name: "영겁연옥의 날개",
            type: "Accessory",
            rarity: ItemRarity.MYTHTIC,
            description: "이그니스의 영겁연옥의 날개이다..",
            stats: { agi: 5000, ctrl: 2000, wis: 5000 },
            secondaryOptions: ["STR +300%", "화염계 속성 피해 +50%", "상태이상 저항 +100%", "최대 HP +150%"],
            imageUrl:"https://i.ibb.co/Gv0JK3T8/Kakao-Talk-20251229-171209541-26.png",
            enhancement: 0
        },{
            name: "연옥의 도끼",
            type: "Weapon",
            weaponType:"Axe",
            elementalType:"화염계",
            rarity: ItemRarity.MYTHTIC,
            description: "이그니스의 영겁연옥의 도끼이다.",
            stats: { str: 5000, wis: 1000 },
            secondaryOptions: ["STR +300%", "화염계 속성 부여", "물리 공격력 +100%", "최종 능력치 +150%"],
            imageUrl:"https://i.ibb.co/F4fhVzVv/Kakao-Talk-20251229-224049680-11.png",
            enhancement: 0
        },{
            name: "연옥의 화신갑",
            type: "Body",
            rarity: ItemRarity.MYTHTIC,
            description: "이그니스의 영겁연옥의 갑옷이다.",
            stats: { def: 5000, ctrl: 2000, wis: 1000 },
            secondaryOptions: ["STR +300%", "치명타율 +50%", "상태이상 저항 +50%", "최대 HP +150%"],
            imageUrl:"https://i.ibb.co/Y4kRbWx0/Kakao-Talk-20251229-224049680-09.png",
            enhancement: 0
        },{
            name: "영겁연옥 왕의 관",
            type: "Head",
            rarity: ItemRarity.MYTHTIC,
            description: "이그니스의 영겁연옥의 왕관이다.",
            stats: { ctrl: 4000, wis: 5000 },
            secondaryOptions: ["STR +100%", "DEF +200%", "상태이상 저항 +50%", "최대 HP +50%"],
            imageUrl:"https://i.ibb.co/fVtzsQp1/Kakao-Talk-20251229-224049680-08.png",
            enhancement: 0
        },{
            name: "연옥의 화염 불씨",
            type: "Etc",
            rarity: ItemRarity.LEGENDARY,
            description: "영겁 연옥의 꺼지지 않는 불씨.",
            imageUrl:"https://i.ibb.co/LdzSBgxj/Kakao-Talk-20251229-224049680-07.png",
            enhancement: 0
        }, {
    name: "마계의 핵",
    type: "Accessory",
    rarity: ItemRarity.LEGENDARY,
    description: "고대 마계의 동력원이었던 결정체입니다.",
    stats: { ctrl: 200 },
    secondaryOptions: ["모든 스탯 +250%"],
    enhancement: 0,
    imageUrl:"https://i.ibb.co/KzXgZt5w/Gemini-Generated-Image-9sv52s9sv52s9sv5.png"  
}],
        visualUrl: "https://i.ibb.co/tPKGC9wQ/Kakao-Talk-20251229-085504416-09.png",
        level: 7800,
        skills: [createBossSkill("영겁의 연옥", "[부가 효과: 화상] 적들이 서로를 공격하도록 정신을 붕괴시킵니다.", SkillType.MAGIC, 1300, 500,"INT*13.0")]
    },
    "몰드릭": {
        id:"mythicboss_moldrik",
        name: "제8 제너럴 몰드릭",
        title: "사체 군주",
        shinryokuType: "암흑계",
        description: "언데드 계열의 수많은 머리가 달린 사체들의 군주.",
        specialLoot: "망자의 군주 로브",
        detailedLoot: [{
            name: "망자의 군주 로브",
            type: "Body",
            rarity: ItemRarity.MYTHTIC,
            description: "망자의 군주인 몰드릭의 로브.",
            stats: { def: 3000, wis: 8000, ctrl: 5000 },
            secondaryOptions: ["물리 방어력 +250%", "암흑계 속성 저항 +150%", "상태이상 저항 +100%", "최대 HP +250%"],
            imageUrl:"https://i.ibb.co/9kH7sbzp/Kakao-Talk-20251229-171209541-25.png",
            enhancement: 0
        },{
            name: "망자의 원혼 조각",
            type: "Etc",
            rarity: ItemRarity.LEGENDARY,
            description: "망자의 원혼이 담겨 있는 조각.",
            imageUrl:"https://i.ibb.co/sv2xMYfR/Kakao-Talk-20251229-224049680-02.png",
        },{
            name: "망령의 지팡이",
            type: "Weapon",
            weaponType:"Staff",
            elementalType:"암흑계",
            rarity: ItemRarity.MYTHTIC,
            description: "망자의 군주인 몰드릭의 망령을 이끄는 지팡이.",
            stats: { int: 5000, ctrl: 3000 },
            secondaryOptions: ["마법 방어력 +250%", "암흑계 속성 부여", "마법 공격력 +200%", "최종 능력치 +250%"],
            imageUrl:"https://i.ibb.co/vxMf0GML/Kakao-Talk-20251229-224049680-05.png",
            enhancement: 0
        },{
            name: "망자의 인장",
            type: "Accessory",
            rarity: ItemRarity.MYTHTIC,
            description: "망자의 군주인 몰드릭의 로브.",
            stats: { def: 1000, wis: 5000, ctrl: 4000 },
            secondaryOptions: ["마법 방어력 +250%", "치명타율 +100%", "상태이상 저항 +100%", "최대 HP +250%"],
            imageUrl:"https://i.ibb.co/F4XGjqLh/Kakao-Talk-20251229-224049680-06.png",
            enhancement: 0
        },{
            name: "망령왕의 두개관",
            type: "Body",
            rarity: ItemRarity.MYTHTIC,
            description: "망자의 군주인 몰드릭의 왕관.",
            stats: { def: 2000, wis: 2000, int: 3000 },
            secondaryOptions: ["물리 방어력 +250%", "INT +200%", "WIS +100%", "최대 HP +250%"],
            imageUrl:"https://i.ibb.co/8gf1ZpZR/Kakao-Talk-20251229-224049680-10.png",
            enhancement: 0
        }, {
    name: "마계의 핵",
    type: "Accessory",
    rarity: ItemRarity.LEGENDARY,
    description: "고대 마계의 동력원이었던 결정체입니다.",
    stats: { ctrl: 200 },
    secondaryOptions: ["모든 스탯 +250%"],
    enhancement: 0,
    imageUrl:"https://i.ibb.co/KzXgZt5w/Gemini-Generated-Image-9sv52s9sv52s9sv5.png"  
}],
        visualUrl: "https://i.ibb.co/ccV9Md00/Kakao-Talk-20260304-213055463.jpg",
        level: 7700,
        skills: [createBossSkill("망자의 군세", "[부가 효과: 공포] 언데드를 즉시 병력으로 사용하여 심장 박동을 멈추게 하는 극도의 위압감입니다.", SkillType.MAGIC, 1800, 450, "WIS*18.0")]
    },
    "스콜라": {
        id:"mythicboss_scholar",
        name: "제9 제너럴 스콜라",
        title: "독화의 여왕",
        shinryokuType: "암흑계",
        description: "하반신은 거대한 전갈 상반신은 마녀다.",
        specialLoot: "절멸 독침 부츠",
        detailedLoot: [{
            name: "절멸 독침 부츠",
            type: "Feet",
            rarity: ItemRarity.MYTHTIC,
            description: "절대적으로 멸하는 독침이 달려있는 부츠.",
            stats: { agi: 4000, hp: 100000, wis: 5000 },
            secondaryOptions: ["마법 방어력 +100%", "암흑계 속성 저항 +50%", "물리 방어력 +300%", "최대 HP +150%"],
            imageUrl:"https://i.ibb.co/NdVqdVD2/Kakao-Talk-20251229-171209541-24.png",
            enhancement: 0
        },{
            name: "독화여왕의 갑피",
            type: "Body",
            rarity: ItemRarity.MYTHTIC,
            description: "독화여왕 스콜라의 껍질로 만들어준 갑피.",
            stats: { def: 5000, hp: 1000, wis: 5000 },
            secondaryOptions: ["물리 방어력 +250%", "모든 능력치 +200%", "물리 방어력 +200%", "최대 HP +150%"],
            imageUrl:"https://i.ibb.co/S4r2YBSk/Kakao-Talk-20251229-224049680-01.png",
            enhancement: 0
        },{
            name: "절멸 독침",
            type: "Weapon",
            weaponType:"Thrown",
            rarity: ItemRarity.MYTHTIC,
            description: "절대적으로 멸하는 독침",
            stats: { int: 5000, agi: 4000, wis: 1000 },
            secondaryOptions: ["마법 공격력 +100%", "암흑계 속성 부여", "물리 공격력 +200%", "[부가효과: 출혈]"],
            imageUrl:"https://i.ibb.co/tSFYBJG/Kakao-Talk-20251229-224049680-03.png",
            enhancement: 0
        },{
            name: "독 여왕의 수정",
            type: "Accessory",
            rarity: ItemRarity.MYTHTIC,
            description: "독 여왕의 기운이 담겨있는 수정",
            stats: { agi: 5000, hp: 10000, wis: 3000 },
            secondaryOptions: ["마법 방어력 +200%", "물리 공격력 +250%"],
            imageUrl:"https://i.ibb.co/jPwgVxCN/Kakao-Talk-20251229-224049680-04.png",
            enhancement: 0
        },{
            name: "절멸 독 주머니",
            type: "Etc",
            rarity: ItemRarity.LEGENDARY,
            description: "절대적으로 멸하는 독이 비어있는 주머니",
            imageUrl:"https://i.ibb.co/WvXjPqx2/Kakao-Talk-20251229-224049680.png",
        }, {
    name: "마계의 핵",
    type: "Accessory",
    rarity: ItemRarity.LEGENDARY,
    description: "고대 마계의 동력원이었던 결정체입니다.",
    stats: { ctrl: 200 },
    secondaryOptions: ["모든 스탯 +250%"],
    enhancement: 0,
    imageUrl:"https://i.ibb.co/KzXgZt5w/Gemini-Generated-Image-9sv52s9sv52s9sv5.png"  
}],
        visualUrl: "https://i.ibb.co/35N5hLxg/Kakao-Talk-20260304-213055463-01.jpg",
        level: 7600,
        skills: [createBossSkill("절멸의 독화원", "[부가 효과: 중독] 강력한 필드 전체에 독을 뿌린다 .", SkillType.MAGIC, 2200, 600, "INT*12.0",'aoe')]
    },
    "카이로스": {
        id:"mythicboss_kairos",
        name: "제10 제너럴 카이로스",
        title: "종말 기수",
        shinryokuType: "암흑계",
        description: "검은 말과 융합된 기사형 몬스터 시간을 조작한다.",
        specialLoot: "시간 단죄의 투구",
        detailedLoot: [{
            name: "시간 단죄의 투구",
            type: "Head",
            rarity: ItemRarity.MYTHTIC,
            description: "시간을 조작할 수 있는 단죄의 투구.",
            stats: { agi: 5000, ctrl: 5000, int: 1000 },
            secondaryOptions: ["INT +100%", "암흑계 속성 저항 +50%", "AGI +250%", "최대 HP +150%"],
            imageUrl:"https://i.ibb.co/4nkk3CJQ/Kakao-Talk-20251229-171209541-23.png",
            enhancement: 0
        },{
            name: "시간 단죄의 낫",
            type: "Weapon",
            weaponType:"Blunt",
            elementalType:"암흑계",
            rarity: ItemRarity.MYTHTIC,
            description: "시간을 조작할 수 있는 단죄의 낫.",
            stats: { str: 5000, ctrl: 5000, int: 1000 },
            secondaryOptions: ["CTRL +100%", "암흑계 속성 부여", "STR +250%", "최종 능력치 +150%"],
            imageUrl:"https://i.ibb.co/8DYf9Hb2/Kakao-Talk-20251229-225019595-05.png",
            enhancement: 0
        },{
            name: "종말 기수의 갑주",
            type: "Body",
            rarity: ItemRarity.MYTHTIC,
            description: "시간을 조작할 수 있는 종말기사의 갑주.",
            stats: { wis: 2000, def: 5000, ctrl: 1000 },
            secondaryOptions: ["DEF +100%", "물리 방어력 +300%", "CTRL +250%", "최대 HP +150%"],
            imageUrl:"https://i.ibb.co/RTjVCQn0/Kakao-Talk-20251229-225019595-02.png",
            enhancement: 0
        },{
            name: "멈춰버린 시계조각",
            type: "Etc",
            rarity: ItemRarity.LEGENDARY,
            description: "시간이 더이상 조작되지 못하고 멈춰버린 시계조각.",
            imageUrl:"https://i.ibb.co/RpmjdsKd/Kakao-Talk-20251229-225019595-03.png",
            enhancement: 0
        }, {
    name: "마계의 핵",
    type: "Accessory",
    rarity: ItemRarity.LEGENDARY,
    description: "고대 마계의 동력원이었던 결정체입니다.",
    stats: { ctrl: 200 },
    secondaryOptions: ["모든 스탯 +250%"],
    enhancement: 0,
    imageUrl:"https://i.ibb.co/KzXgZt5w/Gemini-Generated-Image-9sv52s9sv52s9sv5.png"  
}],
        visualUrl: "https://i.ibb.co/WNj6hFgc/Kakao-Talk-20251229-085504416-12.png",
        level: 7500,
        skills: [createBossSkill("신벌 강림", "[부가 효과: 혼란] 예측 불가능한 궤적으로 적들을 유린합니다.", SkillType.MAGIC, 1900, 500, "AGI*15.0")]
    },
    "루나스": {
        id:"mythicboss_lunars",
        name: "제11 제너럴 루나스",
        title: "혈월광의 발톱",
        shinryokuType: "암흑계",
        description: "늑대와 용이 융합된 거대한 수인 몬스터와 붉은 달 문양이 있다.",
        specialLoot: "혈월왕의 발톱",
        detailedLoot: [{
            name: "혈월왕의 발톱",
            type: "Weapon",
            weaponType: "Knuckle",
            elementalType: "암흑계",
            rarity: ItemRarity.MYTHTIC,
            description: "루나스의 발톱으로 만들어진 강력한 클로형 너클.",
            stats: { str: 5000, int: 5000, agi: 1000, ctrl: 3000 },
            secondaryOptions: ["상태이상 저항 +50%", "물리 공격력 +500%", "최종 능력치 +200%", "최종 능력치 +150%"],
            imageUrl:"https://i.ibb.co/qLwhXJYv/Kakao-Talk-20251229-171209541-22.png",
            enhancement: 0
        },{
            name: "철혈왕의 가죽 갑옷",
            type: "Body",
            rarity: ItemRarity.MYTHTIC,
            description: "철혈왕 루나스의 가죽으로 만든 갑옷.",
            stats: { agi: 2000, def: 5000, int: 1000 },
            secondaryOptions: ["STR +100%", "마법 방어력 +100%", "AGI +250%", "최대 HP +150%"],
            imageUrl:"https://i.ibb.co/QRXgFbg/Kakao-Talk-20251229-225019595-04.png",
            enhancement: 0
        },{
            name: "붉은 달의 늑대 투구",
            type: "Head",
            rarity: ItemRarity.LEGENDARY,
            description: "늑대 형상을 한 붉은 달의 문양이 깃든 투구.",
            stats: { def: 5000, wis: 2000, str: 1000 },
            secondaryOptions: ["STR +200%", "치명타율 +50%", "AGI +200%", "최대 HP +150%"],
            imageUrl:"https://i.ibb.co/1YLmDWs2/Kakao-Talk-20251229-225019595-01.png",
            enhancement: 0
        },{
            name: "철혈왕의 달빛 조각",
            type: "Etc",
            rarity: ItemRarity.LEGENDARY,
            description: "철혈왕의 달빛의 기운이 서려있는 조각.",
            imageUrl:"https://i.ibb.co/XZK3xxq9/Kakao-Talk-20251229-225019595.png",
            
        }, {
    name: "마계의 핵",
    type: "Accessory",
    rarity: ItemRarity.LEGENDARY,
    description: "고대 마계의 동력원이었던 결정체입니다.",
    stats: { ctrl: 200 },
    secondaryOptions: ["모든 스탯 +250%"],
    enhancement: 0,
    imageUrl:"https://i.ibb.co/KzXgZt5w/Gemini-Generated-Image-9sv52s9sv52s9sv5.png"  
}],
        visualUrl: "https://i.ibb.co/5XP4JBp9/Kakao-Talk-20251229-085504416-08.png",
        level: 7400,
        skills: [createBossSkill("혈월폭주", "[부가 효과: 파열] 광폭하되어 상대를 할퀴어 버리는 일격니다.", SkillType.PHYSICAL, 3000, 800, "STR*13.0")]
    },
    "아지 다하카": {
        id:"mythicboss_dahaka",
        name: "아지 다하카",
        title: "사막과 독의 재앙왕",
        shinryokuType: "암흑계",
        description: "세 개의 머리를 지닌 고대 재앙왕. 사막의 모래와 맹독으로 파멸을 가져옵니다.",
        specialLoot: "재앙왕의 세 이빨",
        detailedLoot: {
            name: "다하카의 저주받은 투구",
            type: "Head",
            rarity: ItemRarity.MYTHTIC,
            description: "세 머리의 독기가 응축된 불길한 투구.",
            stats: { str: 400, def: 600, ctrl: 800 },
            secondaryOptions: ["상태이상 저항 +50%", "치명타율 +10%", "마법 방어력 +200%", "최대 HP +50%"],
            enhancement: 0,
            imageUrl: "https://i.ibb.co/TNcbjwD/Kakao-Talk-20251231-140838509-16.png"
        },
        visualUrl: "https://i.ibb.co/6RL2xTfW/Kakao-Talk-20251231-140838509-05.png",
        level: 1050,
        skills: [
            createBossSkill("트리플 톡신 브레스", "[부가 효과: 소멸] 세 머리에서 치명적인 독무를 내뿜습니다.", SkillType.MAGIC, 800, 200, "INT*8.0"),
            createBossSkill("사막의 매장", "[부가 효과: 속박] 대상을 거대한 모래 늪에 가둡니다.", SkillType.DEBUFF, 0, 150, "Stun(2T)")
        ]
    },
    "이프리트 알-말릭": {
        id:"mythicboss_efrit",
        name: "이프리트 알-말릭",
        title: "사막의 불꽃 정령왕",
        shinryokuType: "화염계",
        description: "사막의 폭염을 다스리는 정령들의 왕. 모래폭풍과 화염으로 적을 소생 불가능하게 태워버립니다.",
        specialLoot: "정령왕의 타오르는 심장",
        detailedLoot: {
            name: "이프리트의 화염에너지",
            type: "Weapon",
            weaponType: "Energy",
            rarity: ItemRarity.MYTHTIC,
            description: "태양보다 뜨거운 정령왕의 마력.",
            stats: { int: 1200, wis: 800, ctrl: 500 },
            secondaryOptions: ["물리 공격력 +250%", "MP +200%", "마법 공격력 +250%", "최종 능력치 +50%"],
            enhancement: 0,
            elementalType:"화염계",
            imageUrl: "https://i.ibb.co/gZsvRSNk/Kakao-Talk-20251231-140838509-17.png"
        },
        visualUrl: "https://i.ibb.co/gM26CtQz/Kakao-Talk-20251231-140838509-06.png",
        level: 1080,
        skills: [
            createBossSkill("인페르노 사이클론", "[부가 효과: 화상] 화염과 모래가 뒤섞인 거대 회오리를 일으킵니다.", SkillType.MAGIC, 900, 250, "INT*9.0"),
            createBossSkill("정령왕의 위엄", "자신의 능력을 일시적으로 극대화합니다.", SkillType.BUFF, 0, 200, "INT +100%, M.Atk +50%", 'self')
        ]
    },
    "안카르": {
        id:"mythicboss_ankar",
        name: "안카르",
        title: "아틀라스의 거대 가디언",
        shinryokuType: "초화계",
        description: "아틀라스 산맥에 봉인되었던 고대 거신. 자연의 무게로 적의 의지를 꺾어놓습니다.",
        specialLoot: "거신의 산맥 파편",
        detailedLoot: {
            name: "안카르의 자연 지팡이",
            type: "Weapon",
            weaponType:"Staff",
            elementalType:"초화계",
            rarity: ItemRarity.MYTHTIC,
            description: "산맥의 힘이 느껴지는 스태프",
            stats: { int: 2000, hp: 50000, mp: 500 },
            secondaryOptions: ["물리 방어력 +200%", "마법 공격력 +250%", "MP +200%", "최종 능력치 +50%"],
            enhancement: 0,
            imageUrl: "https://i.ibb.co/5WkHbfz0/Kakao-Talk-20251231-140838509-18.png"
        },
        visualUrl: "https://i.ibb.co/QjMVV5Pw/Kakao-Talk-20251231-140838509-07.png",
        level: 1100,
        skills: [
            createBossSkill("아틀라스 크러시", "[부가 효과: 파열] 거대한 손으로 지면과 함께 적을 짓누릅니다.", SkillType.PHYSICAL, 1200, 300, "STR*12.0"),
            createBossSkill("봉인의 맥동", "[부가 효과: 속박] 대지의 기운으로 적의 움직임을 강제로 멈춥니다.", SkillType.DEBUFF, 0, 180, "AGI -80%")
        ]
    },
    "아그바라": {
        id:"mythicboss_nigeria",
        name: "아그바라",
        title: "오군의 분노 / 전쟁의 화신",
        shinryokuType: "무기강화계",
        description: "철과 전쟁의 신 오군의 정수가 강림한 존재. 모든 무기를 자유자재로 다루며 전장을 피로 물들입니다.",
        specialLoot: "전쟁신의 피비린내 나는 검",
        detailedLoot: {
            name: "오군의 학살검",
            type: "Weapon",
            weaponType: "Sword",
            rarity: ItemRarity.MYTHTIC,
            description: "수많은 영웅의 피를 마신 전쟁신의 검.",
            stats: { str: 2000, agi: 1000, ctrl: 500 },
            secondaryOptions: ["물리 공격력 +250%", "적 처치 시 HP 5% 회복", "무기강화계 속성 부여", "최종 능력치 +50%"],
            enhancement: 0,
            imageUrl: "https://i.ibb.co/2XsrgfW/Kakao-Talk-20251231-140838509-19.png"
        },
        visualUrl: "https://i.ibb.co/prWw07yS/Kakao-Talk-20251231-140838509-08.png",
        level: 1070,
        skills: [
            createBossSkill("강철의 폭풍", "무수한 환영 검들을 소환하여 적진을 초토화합니다.", SkillType.PHYSICAL, 1100, 280, "STR*11.0"),
            createBossSkill("피의 갈증", "자신의 공격력을 폭발시키고 체력을 흡수합니다.", SkillType.BUFF, 0, 150, "STR +50%, Lifesteal 20%", 'self')
        ]
    },
    "아르덴의 흑사자": {
        id:"mythicboss_arden",
        name: "아르덴의 흑사자",
        title: "숲의 야성적 그림자",
        shinryokuType: "암흑계",
        description: "유럽 아르덴 숲의 고대 수호수. 그림자 속에 숨어 적의 심장을 노리는 사냥의 왕입니다.",
        specialLoot: "흑사자의 어두운 가죽",
        detailedLoot: {
            name: "흑사자의 가죽 갑옷",
            type: "Body",
            rarity: ItemRarity.MYTHTIC,
            description: "기척을 완전히 지워주는 전설적인 사냥꾼의 갑옷.",
            stats: { def: 1500, ctrl: 1000, wis: 500 },
            secondaryOptions: ["마법 방어력 +50%", "물리 방어력 +200%", "암흑계 속성 저항 +50%", "최대 HP +50%"],
            enhancement: 0,
            imageUrl: "https://i.ibb.co/cKJR6tyy/Kakao-Talk-20251231-140838509-20.png"
        },
        visualUrl: "https://i.ibb.co/ynbkYwFz/Kakao-Talk-20251231-140838509-09.png",
        level: 1040,
        skills: [
            createBossSkill("그림자 도약", "어둠 속에서 나타나 적의 목을 베어냅니다.", SkillType.PHYSICAL, 1300, 220, "AGI*13.0", 'single'),
            createBossSkill("야성의 포효", "[부가 효과: 공포] 숲을 뒤흔드는 위압감으로 적을 위축시킵니다.", SkillType.DEBUFF, 0, 100, "ATK -40%")
        ]
    },
    "골렘 프라하": {
        id:"mythicboss_praha",
        name: "골렘 프라하",
        title: "룬 문자가 새겨진 인공 신성",
        shinryokuType: "강철계",
        description: "프라하의 연금술사들이 창조한 궁극의 수호 병기. 통제를 잃고 폭주하는 신성한 흙과 강철의 덩어리입니다.",
        specialLoot: "골렘의 푸른 룬 핵",
        detailedLoot: {
            name: "프라하의 룬 너클",
            type: "Weapon",
            weaponType: "Knuckle",
            elementalType: "강철계",
            rarity: ItemRarity.MYTHTIC,
            description: "수많은 방어 룬이 각인된 고대 연금술의 걸작.",
            stats: { def: 3000, hp: 20000, ctrl: 500 },
            secondaryOptions: ["물리 공격력 +250%", "마법 방어력 +200%", "강철계 속성 부여", "최종 능력치 +50%"],
            enhancement: 0,
            imageUrl: "https://i.ibb.co/bgXRV2Lf/Kakao-Talk-20251231-140838509-21.png"
        },
        visualUrl: "https://i.ibb.co/sJvnDh6R/Kakao-Talk-20251231-140838509-10.png",
        level: 1060,
        skills: [
            createBossSkill("룬 마력 방출", "[부가 효과: 감전] 신체에 각인된 룬에서 고농도 에너지를 발산합니다.", SkillType.MAGIC, 950, 300, "INT*9.5"),
            createBossSkill("강철의 대오", "자신의 신체를 더욱 단단하게 경화시킵니다.", SkillType.BUFF, 0, 150, "DEF +200%", 'self')
        ]
    },
    "케찰코아틀": {
        id:"mythicboss_kechalco",
        name: "케찰코아틀",
        title: "재림한 깃털 달린 뱀신",
        shinryokuType: "질풍계",
        description: "창조와 파멸을 동시에 상징하는 고대 멕시코의 주신. 바람을 타고 강림하여 세상을 재편하려 합니다.",
        specialLoot: "빛나는 깃털 관",
        detailedLoot: {
            name: "케찰코아틀의 신풍(神風) 스태프",
            type: "Weapon",
            weaponType: "Staff",
            elementalType:"질풍계",
            rarity: ItemRarity.MYTHTIC,
            description: "하늘의 모든 바람을 담고 있는 신성한 스태프.",
            stats: { int: 1500, wis: 1000, agi: 1000 },
            secondaryOptions: ["마법 공격력 +200%", "상태이상 저항 +50%", "최종 능력치 +50%", "최종 능력치 +50%"],
            enhancement: 0,
            imageUrl: "https://i.ibb.co/5WL8pGRT/Kakao-Talk-20251231-140838509-22.png"
        },
        visualUrl: "https://i.ibb.co/PGB9w6xF/Kakao-Talk-20251231-140838509-11.png",
        level: 1120,
        skills: [
            createBossSkill("창조의 숨결", "[부가 효과: 재생] 아군은 치유하고 성역을 정화합니다.", SkillType.BUFF, 0, 400, "HP 30% Recov, Cure All Debuffs", 'aoe'),
            createBossSkill("파멸의 폭풍", "[부가 효과: 파열] 모든 것을 찢어버리는 초고속 기류를 발생시킵니다.", SkillType.MAGIC, 1400, 500, "INT*14.0")
        ]
    },
    "바쿠나와_신화": {
        id:"mythicboss_philiphines",
        name: "바쿠나와",
        title: "심해의 달 사냥꾼",
        shinryokuType: "해수계",
        description: "필리핀 신화 속 거대 용. 월식과 함께 깨어나 세상을 영원한 어둠과 물속에 잠기게 하려 합니다.",
        specialLoot: "바쿠나와의 월식 비늘",
        detailedLoot: {
            name: "달을 가르는 신발",
            type: "Feet",
            rarity: ItemRarity.MYTHTIC,
            description: "바쿠나와의 비늘로 만들어진 신발.",
            stats: { wis: 1500, agi: 1500, mp: 10000 },
            secondaryOptions: ["해수계 속성 저항 +50%", "마법 공격력 +250%", "MP +200%", "최대 HP +50%"],
            enhancement: 0,
            imageUrl: "https://i.ibb.co/VY7msN9x/Kakao-Talk-20251231-140838509-23.png"
        },
        visualUrl: "https://i.ibb.co/mrvmBfzH/Kakao-Talk-20251231-140838509-12.png",
        level: 1090,
        skills: [
            createBossSkill("월식의 해일", "[부가 효과: 암흑] 전장을 어둠으로 덮고 거대한 파도를 일으킵니다.", SkillType.MAGIC, 1200, 350, "INT*12.0"),
            createBossSkill("심연의 삼킴", "[부가 효과: 흡정] 적의 마력을 강제로 빼앗아 자신의 것으로 만듭니다.", SkillType.DEBUFF, 0, 200, "MP -30%")
        ]
    },
    "락롱꾸언": {
        id:"mythicboss_vietnam",
        name: "락롱꾸언",
        title: "용왕의 혈통 / 베트남의 국조",
        shinryokuType: "해수계",
        description: "베트남 건국 신화의 용왕. 물의 권능과 왕의 위엄으로 나라의 안녕을 위협하는 자들을 징벌합니다.",
        specialLoot: "용왕의 성스러운 옥새",
        detailedLoot: {
            name: "락롱꾸언의 용의 인장",
            type: "Accessory",
            rarity: ItemRarity.MYTHTIC,
            description: "용왕의 비늘과 마력으로 빚어낸 용의 인장.",
            stats: { str: 2000, int: 1000, wis: 1000 },
            secondaryOptions: ["해수계 속성 피해 +50%", "물리 공격력 +250%", "상태이상 저항 +50%", "최대 HP +50%"],
            enhancement: 0,
            imageUrl: "https://i.ibb.co/dsGjLbNm/Kakao-Talk-20251231-140838509-25.png"
        },
        visualUrl: "https://i.ibb.co/7JqXHFzf/Kakao-Talk-20251231-140838509-13.png",
        level: 1150,
        skills: [
            createBossSkill("용왕의 홍수", "[부가 효과: 빙결] 전장을 거대한 소용돌이로 휩쓸어 얼려버립니다.", SkillType.MAGIC, 1500, 400, "INT*15.0"),
            createBossSkill("국조의 위엄", "자신과 아군의 사기를 높여 방어력을 대폭 증가시킵니다.", SkillType.BUFF, 0, 300, "DEF +100%, Status Resist +50%", 'aoe')
        ]
    },
    "가루다 프라임": {
        id:"mythicboss_indonesia",
        name: "가루다 프라임",
        title: "전격의 포식자 / 군신 가루다",
        shinryokuType: "전격계",
        description: "인도네시아의 상징이자 신의 사자. 폭풍과 번개를 두르고 하늘에서 정의의 심판을 내립니다.",
        specialLoot: "가루다의 금빛 날개깃",
        detailedLoot: {
            name: "가루다의 날개",
            type: "Accessory",
            rarity: ItemRarity.MYTHTIC,
            description: "가루다의 날카롭고 번개처럼 빠른 날개.",
            stats: { str: 1000, agi: 3000, ctrl: 1000 },
            secondaryOptions: ["AGI +100%", "전격계 속성 피해 +50%", "치명타 확률 +40%", "최대 HP +50%"],
            enhancement: 0,
            imageUrl: "https://i.ibb.co/kVVgXF90/Kakao-Talk-20251231-140838509-26.png"
        },
        visualUrl: "https://i.ibb.co/ymqmyGTw/Kakao-Talk-20251231-140838509-14.png",
        level: 1085,
        skills: [
            createBossSkill("뇌신의 급강하", "[부가 효과: 감전] 번개를 두르고 초고속으로 하강하여 충격을 줍니다.", SkillType.PHYSICAL, 1600, 320, "AGI*16.0", 'single'),
            createBossSkill("전동 날갯짓", "강력한 전류가 섞인 돌풍으로 적 전체를 공격합니다.", SkillType.MAGIC, 800, 200, "INT*8.0")
        ]
    },
    "마우이_신화": {
        id:"mythicboss_newzealand",
        name: "마우이",
        title: "세계 낚시꾼 / 대지의 반신",
        shinryokuType: "초화계",
        description: "뉴질랜드와 오세아니아의 전설적인 영웅. 신비로운 낚시바늘로 대지를 끌어올리고 태양을 붙잡은 반신입니다.",
        specialLoot: "마우이의 거대 낚시바늘",
        detailedLoot: {
            name: "마나이아의 훅",
            type: "Weapon",
            weaponType: "Blunt",
            rarity: ItemRarity.MYTHTIC,
            description: "현실의 경계를 낚아 올릴 수 있는 신화적인 도구.",
            stats: { str: 1500, wis: 1500, ctrl: 2000 },
            secondaryOptions: ["초화계 속성 부여", "물리 공격력 +250%", "최종 능력치 +30%", "최종 능력치 +50%"],
            enhancement: 0,
            imageUrl: "https://i.ibb.co/XBhJPyc/Kakao-Talk-20251231-140838509-24.png"
        },
        visualUrl: "https://i.ibb.co/7t5dgRSK/Kakao-Talk-20251231-140838509-15.png",
        level: 1110,
        skills: [
            createBossSkill("태양을 낚는 기술", "[부가 효과: 속박] 적의 영혼을 낚아채어 행동을 원천 봉쇄합니다.", SkillType.DEBUFF, 0, 300, "Stun(2T), Silence(2T)"),
            createBossSkill("대지 견인", "[부가 효과: 파열] 낚시바늘로 지각을 들어올려 전장을 파괴합니다.", SkillType.PHYSICAL, 1800, 450, "STR*18.0")
        ]
    },  
      "라스트아이콘": {
        id:"mythicboss_la",
        name: "라스트 아이콘 네메시스",
      title: "욕망이 만든 허상의 신",
    shinryokuType: "광휘계",
    description: "로스앤젤레스의 끝없는 욕망과 우상이 응집되어 태어난 존재. 빛나는 외형 뒤에는 공허한 신성이 깃들어 있다.",
    specialLoot: "아이콘의 캐넌 피스톨",
    detailedLoot: {
        name: "아이콘의 캐넌 피스톨",
        type: "Weapon",
        weaponType:"Firearm",
        rarity: ItemRarity.MYTHTIC,
        description: "라스트 아이콘 네메시스의 중심부에서 욕망을 힘으로 변환한 캐넌 형식의 권총",
        stats: { str: 2000, int: 1000, agi: 1000, ctrl: 1000 },
        secondaryOptions: ["모든 능력치 +200%", "광휘계 속성 부여", "MP +250%", "최종 능력치 +50%"],
        enhancement: 0,
        imageUrl:"https://i.ibb.co/WpRS243J/Kakao-Talk-20251231-140838509-28.png"
    },
    visualUrl: "https://i.ibb.co/dsvg22w9/Kakao-Talk-20251231-140838509-27.png",
    level: 1500,
    skills: [
        createBossSkill("네온 디바인","[부가 효과: 혼란] 찬란한 빛으로 적의 의지를 붕괴시킨다.",SkillType.MAGIC,1700,450,"INT*17.0","aoe")
        ]
    },
    // --- [NEW EUROPEAN MYTHIC BOSSES] ---
    "요르문간드": {
        id:"mythicboss_yormungand",
        name: "요르문간드",
        title: "빙해의 각성 / 세계를 감싸는 뱀",
        shinryokuType: "빙결계",
        description: "스칸디나비아 대륙 전체를 휘감고 있던 고대 해룡이 깨어났습니다. 전장을 압박하는 거대한 몸집과 절대영도의 한기를 뿜어냅니다.",
        specialLoot: "요르문간드의 빙해 심장",
        detailedLoot: {
            name: "미드가르드 서펀트 하트",
            type: "Accessory",
            rarity: ItemRarity.MYTHTIC,
            description: "세계를 감싸는 뱀의 생명력이 응축된 심장석.",
            stats: { str: 1000, def: 2000, wis: 1000, hp: 30000 },
            secondaryOptions: ["빙결계 속성 피해 +50%", "최종 능력치 +25%", "물리 방어력 +250%", "최대 HP +50%"],
            enhancement: 0,
            imageUrl: "https://i.ibb.co/nMpL5tYZ/Gemini-Generated-Image-ttshw8ttshw8ttsh.png"
        },
        visualUrl: "https://i.ibb.co/5X5NdLxV/Gemini-Generated-Image-vvcs68vvcs68vvcs.png",
        level: 1300,
        skills: [
            createBossSkill("빙해의 옥죄임", "[부가 효과: 속박] 거대한 몸으로 전장 전체를 압박하여 숨통을 조입니다.", SkillType.PHYSICAL, 900, 200, "STR*9.0"),
            createBossSkill("심연의 동결", "[부가 효과: 빙결] 모든 생명을 얼려버리는 태고의 한기를 내뿜습니다.", SkillType.MAGIC, 1100, 300, "INT*11.0")
        ]
    },
    "헬": {
        id:"mythicboss_hell",
        name: "헬",
        title: "죽음의 여왕 / 니플헤임의 지배자",
        shinryokuType: "암흑계",
        description: "삶과 죽음의 경계에 선 지배자입니다. 반신은 아름답고 반신은 썩어가는 기괴한 모습으로 적을 맞이합니다.",
        specialLoot: "헬의 죽음 베일",
        detailedLoot: {
            name: "니플헤임의 수의",
            type: "Body",
            rarity: ItemRarity.MYTHTIC,
            description: "삶과 죽음의 경계를 나누는 신비롭고 불길한 천.",
            stats: { def: 1800, wis: 1500, ctrl: 400 },
            secondaryOptions: ["암흑계 속성 저항 +50%", "받는 모든 회복 효과 +50%", "사망 시 1회 부활(HP 30%)", "최대 HP +50%"],
            enhancement: 0,
            imageUrl: "https://i.ibb.co/sp5MHvkm/Gemini-Generated-Image-2meiwe2meiwe2mei.png"
        },
        visualUrl: "https://i.ibb.co/6cqgBXC6/Gemini-Generated-Image-j0hlhxj0hlhxj0hl.png",
        level: 1150,
        skills: [
            createBossSkill("죽음의 선고", "[부가 효과: 소멸] 대상을 죽음으로 인도하는 불길한 저주입니다.", SkillType.DEBUFF, 0, 400, "Stun(2T), Instant Death Chance 5%"),
            createBossSkill("생명 역전", "전장에 가득한 생명의 흐름을 뒤틀어 적들에게 피해를 입힙니다.", SkillType.MAGIC, 1200, 350, "INT*12.0")
        ]
    },
    "루오타르": {
        id:"mythicboss_finland",
        name: "루오타르",
        title: "침묵의 여신 / 소리를 삼키는 정령",
        shinryokuType: "암흑계",
        description: "핀란드의 태고적 정령으로, 모든 언어와 소리를 삼켜 허무로 돌려보내는 공포의 화신입니다.",
        specialLoot: "침묵의 심연 보주",
        detailedLoot: {
            name: "투오넬라의 보주",
            type: "SubWeapon",
            weaponType: "Orb",
            rarity: ItemRarity.MYTHTIC,
            description: "소리를 흡수하여 마력으로 변환하는 끝없는 심연의 구슬.",
            stats: { int: 1500, wis: 2000, ctrl: 1000 },
            secondaryOptions: ["마법 공격력 +250%", "암흑계 속성 저항 +50%", "공격 시 30% 확률로 침묵 부여", "최대 HP +50%"],
            enhancement: 0,
            imageUrl: "https://i.ibb.co/ccy4bzD4/Gemini-Generated-Image-c37madc37madc37m.png"
        },
        visualUrl: "https://i.ibb.co/CKVD6sn6/Gemini-Generated-Image-ces600ces600ces6.png",
        level: 1150,
        skills: [
            createBossSkill("소리의 소멸", "[부가 효과: 침묵] 반경 내의 모든 소리와 마력을 지워버립니다.", SkillType.DEBUFF, 0, 250, "Silence(3T), M.Atk -50%"),
            createBossSkill("침묵의 단죄", "침묵에 빠진 적들에게 파괴적인 영혼의 타격을 입힙니다.", SkillType.MAGIC, 1500, 300, "INT*15.0")
        ]
    },
    "스트리가": {
        id:"mythicboss_striga",
        name: "스트리가",
        title: "밤의 저주 / 피에 굶주린 귀족",
        shinryokuType: "암흑계",
        description: "저주받은 폴란드 귀족의 말로입니다. 밤이 되면 끔찍한 괴수로 변해 인간의 심장을 사냥합니다.",
        specialLoot: "스트리가의 저주받은 날개",
        detailedLoot: {
            name: "저주받은 스트리가의 날개",
            type: "Accessory",
            rarity: ItemRarity.MYTHTIC,
            description: "스트리가의 원한과 저주가 서린 날개.",
            stats: { str: 1000, agi: 1500, ctrl: 500 },
            secondaryOptions: ["물리 공격력 +200%", "[부가 효과: 출혈] 확률 100% 부여", "마법 공격력 +50%", "최대 HP +50%"],
            enhancement: 0,
            imageUrl: "https://i.ibb.co/1gGC24f/Gemini-Generated-Image-3jhyxg3jhyxg3jhy.png"
        },
        visualUrl: "https://i.ibb.co/JjL0MsRK/Gemini-Generated-Image-s375xhs375xhs375.png",
        level: 1200,
        skills: [
            createBossSkill("선혈의 춤", "[부가 효과: 출혈] 무수한 환영과 함께 적들을 찢어발깁니다.", SkillType.PHYSICAL, 1400, 300, "AGI*14.0"),
            createBossSkill("밤의 갈증", "자신의 상처를 치료하고 신체 능력을 일시적으로 폭발시킵니다.", SkillType.BUFF, 0, 200, "AGI +100%, HP 20% Recov", 'self')
        ]
    },
    "체르노보그": {
        id:"mythicboss_chernovog",
        name: "체르노보그의 화신",
        title: "파멸의 흑신 / 불운의 군주",
        shinryokuType: "암흑계",
        description: "모든 어둠과 불운의 정점인 슬라브의 흑신. 그가 강림한 곳은 모든 빛과 희망이 사라진 황무지가 됩니다.",
        specialLoot: "파멸의 검은 태양",
        detailedLoot: {
            name: "다크 솔라 낫",
            type: "Weapon",
            weaponType:"Axe",
            rarity: ItemRarity.MYTHTIC,
            description: "검은 태양의 파편을 깎아 만든 절대적인 파멸의 낫.",
            stats: { str: 2000, int: 1000, ctrl: 2000 },
            secondaryOptions: ["마법 방어력 +250%", "암흑계 속성 부여", "최종 능력치 +200%", "최종 능력치 +50%"],
            enhancement: 0,
            imageUrl: "https://i.ibb.co/5XqJCrXN/Gemini-Generated-Image-jmk6hdjmk6hdjmk6.png"
        },
        visualUrl: "https://i.ibb.co/gbtSKKBZ/Gemini-Generated-Image-hx40qnhx40qnhx40.png",
        level: 1150,
        skills: [
            createBossSkill("흑신의 재앙", "[부가 효과: 저주] 전장 전체에 피할 수 없는 불운의 오라를 퍼뜨립니다.", SkillType.DEBUFF, 0, 500, "ALL_STATS -40%, Confusion(50%)"),
            createBossSkill("종말의 그림자", "[부가 효과: 소멸] 모든 것을 집어삼키는 극대 암흑 구체를 발사합니다.", SkillType.MAGIC, 1800, 450, "INT*18.0")
        ]
    },
    "티롤": {
        id:"mythicboss_tirol",
        name: "알프의 파수자 티롤",
        title: "산맥의 심장 / 고대 수호거인",
        shinryokuType: "대지계",
        description: "알프스 산맥의 거대한 바위들이 신력으로 결합하여 탄생한 수호자입니다. 대지를 뒤흔드는 무게감을 자랑합니다.",
        specialLoot: "티롤의 산맥 파쇄 해머",
        detailedLoot: {
            name: "티탄의 알프스 브레이커",
            type: "Weapon",
            weaponType: "Blunt",
            rarity: ItemRarity.MYTHTIC,
            description: "산 하나를 통째로 옮겨놓은 듯한 초중량 강철 해머.",
            stats: { str: 3000, def: 2000, hp: 50000 },
            secondaryOptions: ["물리 공격력 +250%", "대지계 속성 부여", "공격 시 100% 확률로 [부가 효과: 파열]", "최종 능력치 +50%"],
            enhancement: 0,
            imageUrl: "https://i.ibb.co/MxNwMySf/Gemini-Generated-Image-apnmjkapnmjkapnm.png"
        },
        visualUrl: "https://i.ibb.co/PZ2PCc9v/Gemini-Generated-Image-8nmmig8nmmig8nmm.png",
        level: 1180,
        skills: [
            createBossSkill("산맥의 무게", "[부가 효과: 파열] 전장을 짓누르는 거대한 중력파를 발생시킵니다.", SkillType.PHYSICAL, 1200, 300, "STR*12.0"),
            createBossSkill("대지 융기", "[부가 효과: 속박] 지각을 비틀어 적들의 도주 경로를 완전히 차단합니다.", SkillType.DEBUFF, 0, 200, "Stun(1T), AGI -70%")
        ]
    },
    "모리안": {
        id:"mythicboss_morrian",
        name: "모리안",
        title: "전쟁의 여신 / 갈마기의 주권자",
        shinryokuType: "암흑계",
        description: "피와 죽음, 승리를 관장하는 아일랜드의 여신입니다. 까마귀 떼를 부리며 전장의 공포를 지휘합니다.",
        specialLoot: "전쟁의 갈마기 날개",
        detailedLoot: {
            name: "바이브 카의 깃털 장식",
            type: "Accessory",
            rarity: ItemRarity.MYTHTIC,
            description: "죽음의 여신이 직접 하사한 승리와 패배의 징표.",
            stats: { agi: 2000, wis: 1000, ctrl: 2000 },
            secondaryOptions: ["치명타 확률 +100%", "암흑계 속성 피해 +50%", "AGI +180%", "최대 HP +50%"],
            enhancement: 0,
            imageUrl: "https://i.ibb.co/XmdM2dW/Gemini-Generated-Image-k7as5vk7as5vk7as.png"
        },
        visualUrl: "https://i.ibb.co/hRnD7Q20/Gemini-Generated-Image-8n472a8n472a8n47.png",
        level: 1120,
        skills: [
            createBossSkill("까마귀 폭풍", "[부가 효과: 공포] 수천 마리의 까마귀로 적들의 시야와 정신을 갉아먹습니다.", SkillType.MAGIC, 950, 280, "INT*9.5"),
            createBossSkill("운명의 반전", "전투의 흐름을 강제로 바꿔 아군을 치유하고 적을 공격합니다.", SkillType.BUFF, 0, 400, "All Allies HP 50% Recov, All Enemies DMG", 'aoe')
        ]
    },
    "투룰": {
        id:"mythicboss_turul",
        name: "투룰의 강림",
        title: "마자르의 수호신수 / 신성한 매",
        shinryokuType: "광휘계",
        description: "헝가리 민족의 기원을 상징하는 신성한 새가 황금빛 날개를 펼치며 강림했습니다. 하늘의 모든 빛을 부립니다.",
        specialLoot: "투룰의 강림 깃털",
        detailedLoot: {
            name: "황금 발톱 목걸이",
            type: "Accessory",
            rarity: ItemRarity.MYTHTIC,
            description: "투룰의 성스러운 기운이 서린 황금빛 펜던트.",
            stats: { str: 1500, int: 1500, agi: 2000 },
            secondaryOptions: ["광휘계 속성 피해 +50%", "최종 능력치 +50%", "AGI +250%", "최대 HP +50%"],
            enhancement: 0,
            imageUrl: "https://i.ibb.co/G46YvxRD/Gemini-Generated-Image-pq6v9npq6v9npq6v.png"
        },
        visualUrl: "https://i.ibb.co/6x3FRgR/Gemini-Generated-Image-mq2oy8mq2oy8mq2o.png",
        level: 1060,
        skills: [
            createBossSkill("황금빛 급강하", "하늘에서 빛의 속도로 하강하여 적진을 분쇄합니다.", SkillType.PHYSICAL, 1600, 350, "AGI*16.0", 'single'),
            createBossSkill("성휘의 폭풍", "[부가 효과: 소멸] 모든 사악한 것을 태워버리는 빛의 소용돌이입니다.", SkillType.MAGIC, 1200, 300, "INT*12.0")
        ]
    },
    "드라큘라": {
        id:"mythicboss_rumania",
        name: "드라큘라 - 진조",
        title: "흡혈귀의 근원 / 영원한 밤의 제왕",
        shinryokuType: "암흑계",
        description: "루마니아 카르파티아 산맥 깊은 곳에서 깨어난 진정한 흡혈귀의 시조입니다. 생명의 정수를 빨아들이며 영생을 유지합니다.",
        specialLoot: "진조의 붉은 예복",
        detailedLoot: {
            name: "진조의 혈색 예복",
            type: "Body",
            rarity: ItemRarity.MYTHTIC,
            description: "진조의 피로 물든 고귀하고 저주받은 귀족의 의복.",
            stats: { def: 2000, wis: 1500, hp: 50000 },
            secondaryOptions: ["암흑계 속성 저항 +50%", "피격 시 20% 확률로 적의 체력 흡수", "모든 암흑 저항 100%", "최대 HP +50%"],
            enhancement: 0,
            imageUrl: "https://i.ibb.co/xKD6nNK5/Gemini-Generated-Image-crrd7acrrd7acrrd.png"
        },
        visualUrl: "https://i.ibb.co/PzrTHGLK/Gemini-Generated-Image-h0e03lh0e03lh0e0.png",
        level: 1300,
        skills: [
            createBossSkill("블러드 릴리즈", "[부가 효과: 흡정] 대량의 혈액을 폭발시켜 적들의 마력을 강탈합니다.", SkillType.MAGIC, 1400, 380, "INT*14.0"),
            createBossSkill("진조의 변신", "거대한 박쥐 군단으로 변해 공격을 회피하고 자신을 회복합니다.", SkillType.BUFF, 0, 300, "Perfect Dodge(1T), HP 40% Recov", 'self')
        ]
    },
    "덜러한": {
        id:"mythicboss_dallahan",
        name: "덜러한",
        title: "검은 기수 / 머리 없는 사신",
        shinryokuType: "암흑계",
        description: "머리를 겨드랑이에 끼고 검은 말을 탄 채 죽음을 예고하는 기사입니다. 그의 채찍은 척추로 만들어졌다고 전해집니다.",
        specialLoot: "죽음 기수의 채찍",
        detailedLoot: {
            name: "사신의 척추 채찍",
            type: "Weapon",
            weaponType: "Spear",
            rarity: ItemRarity.MYTHTIC,
            description: "죽은 자의 척추를 이어 붙여 만든 소름 끼치는 채찍형 창.",
            stats: { str: 2500, agi: 1000, ctrl: 1000 },
            secondaryOptions: ["암흑계 속성 부여", "물리 공격력 +180%", "최종 능력치 +50%", "치명타 피해량 +50%"],
            enhancement: 0,
            imageUrl: "https://i.ibb.co/WWjPtQLg/Gemini-Generated-Image-54syin54syin54sy.png"
        },
        visualUrl: "https://i.ibb.co/dsckk3qD/Gemini-Generated-Image-kar9pekar9pekar9.png",
        level: 1220,
        skills: [
            createBossSkill("죽음의 예고", "[부가 효과: 공포] 다음 턴에 대상에게 치명적인 일격을 가할 준비를 합니다.", SkillType.DEBUFF, 0, 150, "Target Marked, DEF -50%"),
            createBossSkill("사신의 채찍질", "[부가 효과: 소멸] 척추 채찍으로 공간을 베어내어 영혼을 상처 입힙니다.", SkillType.PHYSICAL, 1700, 400, "STR*17.0")
        ]
    },
    "프라야나크": {
        id:"mythicboss_mekong",
        name: "프라야 나크",
        title: "메콩의 수호신",
        shinryokuType: "해수계",
        description: "메콩강의 심연에서 깨어난 나가의 왕. 물에 잠긴 전장에서 맹독과 침식을 다루며, 비가 올수록 더욱 강해집니다.",
        specialLoot: "메콩의 맹독 보주",
        detailedLoot: {
            name: "프라야의 해수 보주",
            type: "SubWeapon",
            weaponType: "Orb",
            rarity: ItemRarity.MYTHTIC,
            description: "강물의 정수와 치명적인 독기가 응축된 보주.",
            stats: { int: 1100, wis: 900, ctrl: 600 },
            secondaryOptions: ["해수계 속성 저항 +50%", "[부가 효과: 출혈]", "INT +200%", "최대 HP +50%"],
            enhancement: 0,
            imageUrl: "https://i.ibb.co/Mkqfw6XD/Gemini-Generated-Image-u0jq4zu0jq4zu0jq.png"
        },
        visualUrl: "https://i.ibb.co/rG1MY5Sh/Gemini-Generated-Image-z1eoo9z1eoo9z1eo.png",
        level: 1050,
        skills: [
            createBossSkill("심연의 독류", "[부가 효과: 출혈] 독이 섞인 거대한 물줄기로 전장을 휩씁니다.", SkillType.MAGIC, 900, 200, "INT*9.0"),
            createBossSkill("메콩의 침식", "적의 방어력을 부식시키고 지속적인 피해를 입힙니다.", SkillType.DEBUFF, 0, 150, "P.Def -40%, HP Damage Over Time")
        ]
    },
    "항투아프라임": {
        id:"mythicboss_hangtua",
        name: "항 투아 프라임",
        title: "불사의 전사령",
        shinryokuType: "질풍계",
        description: "전설적인 영웅 항 투아가 신화적 존재로 변질된 형태. 회피와 반격에 특화되어 있으며 전투가 길어질수록 강해집니다.",
        specialLoot: "항 투아의 긍지검",
        detailedLoot: {
            name: "진·크리스 (True Keris)",
            type: "Weapon",
            weaponType: "Sword",
            rarity: ItemRarity.MYTHTIC,
            description: "영웅의 혼이 깃든 불멸의 단검.",
            stats: { str: 1200, agi: 1800, ctrl: 800 },
            secondaryOptions: ["질풍계 속성 부여", "AGI +250%", "치명타율 +50%", "최종 능력치 +50%"],
            enhancement: 0,
            imageUrl: "https://i.ibb.co/6Rdw4WRQ/Gemini-Generated-Image-1mbji91mbji91mbj.png"
        },
        visualUrl: "https://i.ibb.co/dwWWv4gj/Gemini-Generated-Image-27mn1e27mn1e27mn.png",
        level: 1080,
        skills: [
            createBossSkill("영웅의 긍지", "강력한 참격 후 적의 공격을 준비하는 완벽한 반격 자세를 취합니다.", SkillType.PHYSICAL, 1100, 250, "STR*11.0", 'single'),
            createBossSkill("불사의 투지", "전투가 길어질수록 자신의 모든 능력치를 상승시킵니다.", SkillType.BUFF, 0, 200, "ALL_STATS +10% (Stackable)", 'self')
        ]
    },
    "머라이언오버로드": {
        id:"mythicboss_overlord",
        name: "머라이언 오버로드",
        title: "사자의 바다왕",
        shinryokuType: "해수계",
        description: "도시의 번영과 욕망이 결집되어 탄생한 현대 신화형 존재. 방어막과 광역 파동을 사용하여 균형 잡힌 난이도를 자랑합니다.",
        specialLoot: "바다왕의 번영 왕관",
        detailedLoot: {
            name: "머라이언의 성휘관",
            type: "Head",
            rarity: ItemRarity.MYTHTIC,
            description: "사자의 위엄과 바다의 권능이 공존하는 왕관.",
            stats: { def: 1500, wis: 1200, hp: 20000 },
            secondaryOptions: ["STR +100%", "DEF +180%", "상태이상 저항 +30%", "최대 HP +50%"],
            enhancement: 0,
            imageUrl: "https://i.ibb.co/xKcP637q/Gemini-Generated-Image-u5237vu5237vu523.png"
        },
        visualUrl: "https://i.ibb.co/rK6qfBs1/Gemini-Generated-Image-av8adav8adav8ada.png",
        level: 1100,
        skills: [
            createBossSkill("번영의 파동", "[부가 효과: 혼란] 적의 이로운 효과를 해제하고 강력한 충격파를 발산합니다.", SkillType.MAGIC, 1200, 300, "INT*12.0"),
            createBossSkill("도시의 방벽", "강력한 마력 방어막을 전개하여 모든 피해를 크게 줄입니다.", SkillType.BUFF, 0, 250, "DMG Reduce 50%, DEF +100%", 'self')
        ]
    },  
    "징기스칸": {
        id:"mythicboss_khan",
        name: "징키스칸",
        title: "몽골의 제왕",
        shinryokuType: "질풍계",
        description: "몽골의 제왕이 현현한 현대 신화형 존재.",
        specialLoot: "몽골의 황제의 창",
        detailedLoot: {
            name: "몽골 황제의 창",
            type: "Weapon",
            weaponType:"Spear",
            elementalType:"질풍계",
            rarity: ItemRarity.MYTHTIC,
            description: "몽골의 제왕이 말을 타고 달렸던 창.",
            stats: { agi: 1500, str: 1200 },
            secondaryOptions: ["STR +100%", "AGI +180%", "상태이상 저항 +30%", "최종 능력치 +50%"],
            enhancement: 0,
            imageUrl: "https://i.ibb.co/cX2PD0rR/Gemini-Generated-Image-5vjwcb5vjwcb5vjw.png"
        },
        visualUrl: "https://i.ibb.co/Kcz8qhHH/Gemini-Generated-Image-bneaqhbneaqhbnea.png",
        level: 1000,
        skills: [
            createBossSkill("강력한 돌진", "[부가 효과: 혼란] 적의 이로운 효과를 해제하고 강력한 충격파를 발산합니다.", SkillType.MAGIC, 1200, 300, "STR*12.0"),
            createBossSkill("몽골의 포효", "강력한 마력 방어막을 전개하여 모든 피해를 크게 줄입니다.", SkillType.BUFF, 0, 250, "DMG Reduce 50%, DEF +100%", 'self')
        ]
    },
    "알샴스": {
        id:"mythicboss_shamps",
        name: "알 샴스, 태양의 진",
        title: "사막의 태양령",
        shinryokuType: "태양계",
        description: "태양 아래 봉인된 고대 진족의 왕. 모래폭풍 필드를 생성하고 열기를 누적시켜 적을 말려 죽입니다.",
        specialLoot: "진의 태양 램프",
        detailedLoot: {
            name: "샴스의 마력 램프",
            type: "Accessory",
            rarity: ItemRarity.MYTHTIC,
            description: "태양의 진을 봉인했던 고대의 램프. 열기를 제어합니다.",
            stats: { int: 1800, ctrl: 1000, wis: 1000 },
            secondaryOptions: ["태양계 속성 피해 +50%", "마법 공격력 +250%", "모든 능력치 +100%", "최대 HP +50%"],
            enhancement: 0,
            imageUrl: "https://i.ibb.co/KcxttChJ/Gemini-Generated-Image-ymnk8lymnk8lymnk.png"
        },
        visualUrl: "https://i.ibb.co/84R4d5P4/Gemini-Generated-Image-vva0i6vva0i6vva0.png",
        level: 1060,
        skills: [
            createBossSkill("사막의 심판", "[부가 효과: 화상] 거대한 모래폭풍과 태양열로 전장을 뒤덮습니다.", SkillType.MAGIC, 1000, 280, "INT*10.0"),
            createBossSkill("열기 누적", "시간이 흐를수록 적에게 가하는 화염 피해를 증폭시킵니다.", SkillType.BUFF, 0, 150, "Fire Damage +20% (Stackable)", 'self')
        ]
    },
    "은가이의화신": {
        id:"mythicboss_eungai",
        name: "은가이의 화신",
        title: "하늘과 산의 심판자",
        shinryokuType: "전격계",
        description: "킬리만자로와 하늘을 잇는 신의 의지가 물질화된 존재. 번개 낙하와 지형 붕괴를 일으키는 신성한 심판자입니다.",
        specialLoot: "킬리만자로의 심판석",
        detailedLoot: {
            name: "은가이의 전자 에너지",
            type: "Weapon",
            weaponType: "Energy",
            rarity: ItemRarity.MYTHTIC,
            description: "하늘의 벼락과 산의 무게가 동시에 느껴지는 에너지.",
            stats: { int: 1500, agi: 1500, ctrl: 1200 },
            secondaryOptions: ["전격계 속성 부여", "AGI +120%", "마법 공격력 +200%", "최종 능력치 +50%"],
            enhancement: 0,
            imageUrl: "https://i.ibb.co/wrrjYgGN/Gemini-Generated-Image-4cqgqe4cqgqe4cqg.png"
        },
        visualUrl: "https://i.ibb.co/qMk4cH0C/Gemini-Generated-Image-ye0p6eye0p6eye0p.png",
        level: 1090,
        skills: [
            createBossSkill("킬리만자로의 낙뢰", "[부가 효과: 감전] 신성한 벼락을 내리쳐 적들을 무력화합니다.", SkillType.MAGIC, 1300, 320, "INT*13.0"),
            createBossSkill("지형 붕괴", "[부가 효과: 파열] 발밑의 대지를 붕괴시켜 적의 수비를 무너뜨립니다.", SkillType.PHYSICAL, 800, 200, "STR*8.0")
        ]
    },
           "실바나루미엘": {
            id:"mythicboss_elf",
    name: "실바나 루미엘",
    title: "영원의 숲 여신",
    shinryokuType: "초화계",
    description: "세계수의 뿌리에서 태어난 엘프의 여신. 치유와 정령 지배의 권능을 지니며, 전장을 장기전으로 이끄는 신성 존재.",
    specialLoot: "세계수의 잎관",
    detailedLoot: [
        {
            name: "루미엘의 성림관",
            type: "Head",
            rarity: ItemRarity.MYTHTIC,
            description: "자연의 숨결이 살아 숨 쉬는 엘프 여신의 관.",
            stats: { def: 1200, wis: 1800, hp: 18000 },
            secondaryOptions: ["INT +120%", "회복량 +60%", "정령 저항 +40%", "최대 HP +50%"],
            enhancement: 0,
            imageUrl: "https://i.ibb.co/S49j1mm3/Gemini-Generated-Image-cj17tucj17tucj17.png"
        },
        {
            name: "실바나의 생명 지팡이",
            type: "Weapon",
            weaponType: "Staff",
            elementalType: "초화계",
            rarity: ItemRarity.MYTHTIC,
            description: "세계수의 가장 굵은 가지로 빚은 지팡이. 생명의 근원 그 자체입니다.",
            stats: { int: 2500, wis: 3000, ctrl: 1500 },
            secondaryOptions: ["마법 공격력 +250%", "초화계 속성 부여", "MP +105%", "최종 능력치 +50%"],
            enhancement: 0,
            imageUrl: "https://i.ibb.co/Z64Psr7z/Gemini-Generated-Image-wlba5nwlba5nwlba.png"
        },
        {
            name: "영원의 숲 갑주",
            type: "Body",
            rarity: ItemRarity.MYTHTIC,
            description: "성역의 정기가 깃든 초록빛 갑옷. 착용자를 자연의 일부로 만듭니다.",
            stats: { def: 2000, wis: 1500, hp: 50000 },
            secondaryOptions: ["물리 방어력 +200%", "상태이상 저항 +100%", "모든 피해 감소 +15%", "최대 HP +50%"],
            enhancement: 0,
            imageUrl: "https://i.ibb.co/VYp3n630/Gemini-Generated-Image-6tvjd16tvjd16tvj.png"
        },
        {
            name: "정령의 숨결 장갑",
            type: "Hand",
            rarity: ItemRarity.MYTHTIC,
            description: "정령의 기운이 맴도는 장갑. 마력을 섬세하게 조율합니다.",
            stats: { int: 1000, wis: 1000, ctrl: 2000 },
            secondaryOptions: ["마법 공격력 +250%", "WIS +100%", "명중률 +30%", "최대 HP +50%"],
            enhancement: 0,
            imageUrl: "https://i.ibb.co/vvTw9dKF/Gemini-Generated-Image-5ziizv5ziizv5zii.png"
        },
        {
            name: "영원한 생명의 잎",
            type: "Etc",
            rarity: ItemRarity.MYTHTIC,
            description: "결코 시들지 않는 세계수의 잎사귀. 신화적 존재의 탄생을 돕습니다.",
            imageUrl: "https://i.ibb.co/3y6Lp5Jw/Gemini-Generated-Image-ybp3n0ybp3n0ybp3.png",
            enhancement: 0
        }
    ],
    visualUrl: "https://i.ibb.co/kg1J0zms/Kakao-Talk-20260106-005505279-08.png",
    level: 1050,
    skills: [
        createBossSkill("세계수의 축복", "[부가 효과: 재생] 아군 전체의 체력을 지속 회복시키고 모든 약화 효과를 정화합니다.",SkillType.BUFF,0,220,"WIS*14.0","ally"),
        createBossSkill("정령의 심판","대지와 바람의 정령을 소환하여 광역 마법 피해를 입힙니다.",SkillType.MAGIC,1100,280,"INT*11.5")
    ]
    },
    "가르무르라이오른": {
        id:"mythicboss_sooin",
    name: "가르무르 라이오른",
    title: "야성의 군주",
    shinryokuType: "신체강화계",
    description: "수인의 원초적 본능의 신. 근접 전투와 돌진 능력이 극단적으로 강화된 파괴자.",
    specialLoot: "야성군주의 송곳니",
    detailedLoot: [
        {
            name: "라이오른의 투구",
            type: "Head",
            rarity: ItemRarity.MYTHTIC,
            description: "야수왕의 분노와 대지의 힘이 봉인된 투구.",
            stats: { def: 1600, str: 1700, hp: 26000 },
            secondaryOptions: ["STR +250%", "치명타 피해 +80%", "넉백 저항 +50%", "최대 HP +50%"],
            enhancement: 0,
            imageUrl: "https://i.ibb.co/NfhJ3Qs/Gemini-Generated-Image-frkw2tfrkw2tfrkw.png"
        },
        {
            name: "가르무르의 파괴 너클",
            type: "Weapon",
            weaponType: "Knuckle",
            elementalType: "신체강화계",
            rarity: ItemRarity.MYTHTIC,
            description: "야수왕의 힘이 깃든 너클. 주먹질 한 번에 산을 뚫을 기세입니다.",
            stats: { str: 4000, agi: 2000, ctrl: 1000 },
            secondaryOptions: ["물리 공격력 +180%", "신체강화계 속성 부여", "치명타 확률 +40%", "최종 능력치 +50%"],
            enhancement: 0,
            imageUrl: "https://i.ibb.co/TMh5KkMM/Gemini-Generated-Image-k4op15k4op15k4op.png"
        },
        {
            name: "야수왕의 갈기 갑옷",
            type: "Body",
            rarity: ItemRarity.MYTHTIC,
            description: "전설적인 사자의 갈기로 만든 갑옷. 위압적인 아우라를 내뿜습니다.",
            stats: { def: 3000, str: 2000, hp: 80000 },
            secondaryOptions: ["물리 방어력 +250%", "상태이상 저항 +50%", "피격 시 일정 확률로 적에게 공포 부여", "최대 HP +50%"],
            enhancement: 0,
            imageUrl: "https://i.ibb.co/FkKwRNdg/Gemini-Generated-Image-rao7qarao7qarao7.png"
        },
        {
            name: "포식자의 발톱 장갑",
            type: "Hand",
            rarity: ItemRarity.MYTHTIC,
            description: "가장 날카로운 발톱을 가공한 장갑. 적의 급소를 정확히 노립니다.",
            stats: { str: 1500, agi: 1500, ctrl: 1500 },
            secondaryOptions: ["물리 공격력 +200%", "치명타 피해 +100%", "AGI +100", "최대 HP +50%"],
            enhancement: 0,
            imageUrl: "https://i.ibb.co/vv3q9Y37/Gemini-Generated-Image-fegb2sfegb2sfegb.png"
        },
        {
            name: "야성의 증표",
            type: "Etc",
            rarity: ItemRarity.LEGENDARY,
            description: "진정한 강자만이 소유할 수 있는 야성의 훈장.",
            imageUrl: "https://i.ibb.co/YF7YJh7k/Gemini-Generated-Image-l4tg15l4tg15l4tg.png",
            enhancement: 0
        }
    ],
    visualUrl: "https://i.ibb.co/XfTVLFdG/Kakao-Talk-20260106-005505279-04.png",
    level: 1080,
    skills: [createBossSkill("야성의 돌진","[부가 효과: 출혈] 목표를 향해 돌진하며 거대한 물리 피해를 가합니다.",SkillType.PHYSICAL,1400,260,"STR*13.5"),
        createBossSkill("대지의 포효","대지를 울리는 포효로 적 전체의 방어력을 감소시키고 공포 상태를 부여합니다.",SkillType.DEBUFF,0,240,"DEF -40%")
    ]
    },
    "아르카제온네크로스": {
        id:"mythicboss_demon",
       name: "아르카제온 네크로스",
    title: "심연의 마황",
    shinryokuType: "암흑계",
    description: "마계의 심연에서 태어난 마인의 신. 저주와 흡혈, 파멸적인 마법으로 전장을 지배하는 절대 악.",
    specialLoot: "심연마황의 혼핵",
    detailedLoot: [
        {
            name: "네크로스의 흑왕관",
            type: "Head",
            rarity: ItemRarity.MYTHTIC,
            description: "마인의 지배권이 깃든 절대자의 왕관.",
            stats: { def: 1300, int: 1900, hp: 22000 },
            secondaryOptions: ["INT +160%", "흡혈 +25%", "암흑 피해 +45%", "최대 HP +50%"],
            enhancement: 0,
            imageUrl: "https://i.ibb.co/9kgRwPGN/Gemini-Generated-Image-ij4yt7ij4yt7ij4y.png"
        },
        {
            name: "아르카제온의 파멸 지팡이",
            type: "Weapon",
            weaponType: "Staff",
            elementalType: "암흑계",
            rarity: ItemRarity.MYTHTIC,
            description: "심연의 마력이 소용돌이치는 지팡이. 재앙을 불러오는 매개체입니다.",
            stats: { int: 3500, wis: 2000, ctrl: 2000 },
            secondaryOptions: ["마법 공격력 +200%", "암흑계 속성 부여", "[부가 효과: 소멸] 부여 확률 +10%", "최종 능력치 +50%"],
            enhancement: 0,
            imageUrl: "https://i.ibb.co/yFDmGzRQ/Gemini-Generated-Image-67dsro67dsro67ds.png"
        },
        {
            name: "심연의 마황 의복",
            type: "Body",
            rarity: ItemRarity.MYTHTIC,
            description: "마계의 심연에서 짜인 불길한 의복. 빛조차 삼켜버립니다.",
            stats: { def: 1500, int: 1500, hp: 45000, wis: 2500 },
            secondaryOptions: ["마법 방어력 +250%", "모든 속성 저항 +40%", "받는 모든 회복 효과 +30%", "최대 HP +50%"],
            enhancement: 0,
            imageUrl: "https://i.ibb.co/0yhQ4vgw/Gemini-Generated-Image-41o0pf41o0pf41o0.png"
        },
        {
            name: "그림자 움켜쥔 장갑",
            type: "Hand",
            rarity: ItemRarity.MYTHTIC,
            description: "그림자를 실체화하여 만질 수 있게 하는 장갑. 영혼을 움켜쥡니다.",
            stats: { int: 1500, wis: 1000, ctrl: 2000 },
            secondaryOptions: ["마법 공격력 +200%", "치명타율 +30%", "WIS +150", "최대 HP +50%"],
            enhancement: 0,
            imageUrl: "https://i.ibb.co/VYjbB4zd/Gemini-Generated-Image-uhowffuhowffuhow.png"
    },
     {
            name: "초고압 암흑 마력 덩어리",
            type: "Etc",
            rarity: ItemRarity.LEGENDARY,
            description: "초고압으로 응축되어있는 어둠의 마력 덩어리",
            imageUrl: "https://i.ibb.co/r2kShYPm/Gemini-Generated-Image-7c9l427c9l427c9l.png",
            enhancement: 0
        }
    ],
    visualUrl: "https://i.ibb.co/r2tjt6CQ/Kakao-Talk-20260106-005505279.png",
    level: 1120,
    skills: [
        createBossSkill("심연의 저주","[부가 효과: 생명 흡수] 적 전체에게 강력한 암흑 피해를 입히고 피해량의 일부를 흡수합니다.",SkillType.MAGIC,1500,320,"INT*14.0"),
        createBossSkill("마황의 지배","자신의 능력을 극대화하며 모든 피해를 감소시키는 마계의 권능을 발동합니다.",SkillType.BUFF,0,260,"INT +180%","self")
    ]
},
    "해룡왕": {
        id: "mythicboss_busan_seadragon",
        name: "동해 수호신 해룡왕",
        title: "오륙도의 절대지배자 / 남해의 성룡",
        shinryokuType: "해수계",
        description: "대한민국 해양의 중심 부산 앞바다와 오륙도 해저 깊은 성소에서 해류를 다스리는 고대 해신룡입니다. 태풍과 거대한 해일을 부르며 바다를 수호합니다.",
        specialLoot: "해룡왕의 청룡도",
        detailedLoot: {
            name: "해룡왕의 청룡도",
            type: "Weapon",
            weaponType: "Sword",
            elementalType: "해수계",
            rarity: ItemRarity.LEGENDARY,
            description: "동해 수호신 해룡왕의 성스러운 푸른 비늘과 지느러미로 단조된 전설의 대검. 파도의 위력이 서려 있습니다.",
            stats: { str: 450, agi: 280, wis: 200 },
            secondaryOptions: ["물리 공격력 +85%", "해수계 속성 부여", "해수계 속성 피해 +55%", "치명타율 +20%"],
            enhancement: 0,
            imageUrl: "https://i.ibb.co/LXhqQM59/Gemini-Generated-Image-h1waphh1waphh1wa.png"
        },
        visualUrl: "https://i.ibb.co/bVJvvNg/2.png",
        level: 1000,
        skills: [
            createBossSkill("해룡의 성천 노도", "[부가 효과: 빙결] 대양의 해류를 한곳에 응집시켜 전장을 쓸어버리는 거대한 해일을 일으킵니다.", SkillType.MAGIC, 850, 220, "INT*8.5"),
            createBossSkill("오륙도 해룡 참격", "바다를 가르는 해룡왕의 강력한 꼬리 참격입니다.", SkillType.PHYSICAL, 780, 150, "STR*7.8"),
            createBossSkill("창해의 가호", "바다의 기운을 두르고 받는 모든 피해를 감소시키며 방어력을 높입니다.", SkillType.BUFF, 0, 180, "DEF +80%, P.Def +40%", 'self')
        ]
    },
    "초전도황룡": {
        id: "mythicboss_shanghai_dragon",
        name: "와이탄 전뇌제국 사이버황룡",
        title: "동방명주의 뇌신 / 와이탄 양자 파동룡",
        shinryokuType: "전격계",
        description: "상하이 마천루의 100만 초고압 양자 인프라망과 동방명주 상공의 번개가 감응하여 태어난 사이버 메트릭스 황룡입니다. 전뇌 공간과 현실의 마천루를 가로지르며 초전도 입자포와 양자 번개 폭풍을 내려칩니다.",
        specialLoot: "황룡의 퀀텀 초전도 뇌옥",
        detailedLoot: {
            name: "황룡의 퀀텀 초전도 뇌옥",
            type: "SubWeapon",
            weaponType: "Orb",
            elementalType: "전격계",
            rarity: ItemRarity.LEGENDARY,
            description: "와이탄 사이버황룡의 핵심에서 동력화한 양자 보주. 착용자 주변에 뇌전의 신력을 상시 공급합니다.",
            stats: { int: 480, wis: 380, ctrl: 300 },
            secondaryOptions: ["마법 공격력 +80%", "전격계 속성 피해 +50%", "마법 명중률 +40%", "상태이상 저항 +30%"],
            enhancement: 0,
            imageUrl: "https://i.ibb.co/FbVVfKBq/Gemini-Generated-Image-1t6isd1t6isd1t6i.png"
        },
        visualUrl: "https://i.ibb.co/VPXpKjy/Gemini-Generated-Image-9crb3f9crb3f9crb.png",
        level: 1000,
        skills: [
            createBossSkill("와이탄 퀀텀 뇌폭", "[부가 효과: 감전] 상하이 마천루 전체에 초고압 양자 번개 폭풍을 전개하여 전장을 마비시킵니다.", SkillType.MAGIC, 920, 250, "INT*9.2"),
            createBossSkill("초전도 양자 포격", "[부가 효과: 파열] 응축된 고출력 입자선을 일직선으로 발사하여 적의 장갑을 연소시킵니다.", SkillType.MAGIC, 980, 220, "INT*9.8", 'single'),
            createBossSkill("전뇌 오버클럭 가속", "연산 속도와 신력 출력을 극대화하여 치명타 확률과 민첩성을 대폭 올립니다.", SkillType.BUFF, 0, 180, "CritChance +50%, AGI +70%", 'self')
        ]
    },
    "아펙스타이탄": {
        id: "mythicboss_newyork_titan",
        name: "맨해튼 월스트리트 황금의 자본제",
        title: "월가의 황금 불상 / 엠파이어 콜로서스",
        shinryokuType: "강철계",
        description: "세계 금융의 중심 뉴욕 맨해튼의 마천루와 무한한 자본 신력이 융합되어 강림한 거대 자본 골렘입니다. 엠파이어 스테이트 빌딩 높이의 황금 강철 주먹으로 대지와 전장을 뒤흔듭니다.",
        specialLoot: "골든 불의 강철 심장",
        detailedLoot: {
            name: "골든 불의 강철 심장",
            type: "Accessory",
            rarity: ItemRarity.LEGENDARY,
            description: "월스트리트의 무한한 자본과 강철 권능이 주입된 아펙스 타이탄의 핵심 동력원입니다.",
            stats: { def: 550, str: 350, hp: 6000 },
            secondaryOptions: ["물리 방어력 +80%", "마법 방어력 +50%", "최대 HP +45%", "DEF +40%"],
            enhancement: 0,
            imageUrl: "https://i.ibb.co/h1J4j5gm/Gemini-Generated-Image-7f5t9m7f5t9m7f5t.png"
        },
        visualUrl: "https://i.ibb.co/ST0cRB3/Gemini-Generated-Image-rrlm56rrlm56rrlm.png",
        level: 1000,
        skills: [
            createBossSkill("월스트리트 불 마켓 강타", "[부가 효과: 기절] 전 금융 시장을 뒤흔드는 황금 주먹으로 전장의 바닥을 붕괴시킵니다.", SkillType.PHYSICAL, 850, 200, "STR*8.5"),
            createBossSkill("블랙 프라이데이 파쇄", "[부가 효과: 출혈] 고밀도 강철 파편을 방사하여 적의 방어선을 일시에 해체시킵니다.", SkillType.PHYSICAL, 920, 220, "STR*9.2"),
            createBossSkill("황금 자본 프로텍트", "무한한 강철 장갑으로 전신을 코팅하여 물리 및 마법 피해를 대폭 흡수합니다.", SkillType.BUFF, 0, 180, "P.Def +70%, M.Def +60%", 'self')
        ]
    },
    "오사카 백호 봉래마신": {
        id: "mythicboss_osaka_tiger",
        name: "오사카 봉래 백호 마신",
        title: "헤이안 천년 야차 / 오사카의 풍신",
        shinryokuType: "질풍계",
        description: "오사카 성 지하 천년 마도의 결계에서 용트림한 질풍의 신수입니다. 신속의 질풍 참격으로 전장을 베어 가릅니다.",
        specialLoot: "오사카 봉래의 수호 부적",
        detailedLoot: {
            name: "오사카 봉래의 수호 부적",
            type: "Accessory",
            rarity: ItemRarity.LEGENDARY,
            description: "천년 동안 축적된 봉래의 신력이 서린 유서 깊은 장신구.",
            stats: { agi: 380, str: 280, ctrl: 200 },
            secondaryOptions: ["최종 능력치 +75%", "물리 공격력 +40%", "치명타 피해량 +40%", "P.Def +30%"],
            enhancement: 0,
            imageUrl: "https://i.ibb.co/JjYDm2w4/Gemini-Generated-Image-t0cxxst0cxxst0cx.png"
        },
        visualUrl: "https://i.ibb.co/ZzGtT56G/Gemini-Generated-Image-4jkncu4jkncu4jkn.png",
        level: 1000,
        skills: [
            createBossSkill("봉래 쾌풍 참격", "[부가 효과: 소멸] 눈으로 쫓을 수 없는 속도로 적의 요새를 찢어발깁니다.", SkillType.PHYSICAL, 880, 190, "AGI*8.8"),
            createBossSkill("질풍 야차 포효", "[부가 효과: 공포] 호령하는 신풍을 내뿜어 주변 적들의 민첩성과 방어력을 낮춥니다.", SkillType.DEBUFF, 0, 160, "AGI -40%, DEF -30%")
        ]
    },
    "맨체스터 스팀헤비메탈 타이탄": {
        id: "mythicboss_manchester_steam",
        name: "맨체스터 증기 철신 타이탄",
        title: "산업혁명의 심장 / 헤비메탈 골렘",
        shinryokuType: "강철계",
        description: "세계 최초의 공업 도시 맨해튼 증기 기관의 영혼과 강철 신력이 합쳐진 거대 증기 골렘입니다.",
        specialLoot: "증기군주의 강철 핵",
        detailedLoot: {
            name: "증기군주의 강철 핵",
            type: "SubWeapon",
            weaponType: "Shield",
            elementalType: "강철계",
            rarity: ItemRarity.LEGENDARY,
            description: "고압 증기와 티타늄이 응축된 궁극의 보조 방패.",
            stats: { def: 480, hp: 4500, str: 250 },
            secondaryOptions: ["물리 방어력 +85%", "마법 방어력 +45%", "최대 HP +35%", "DEF +30%"],
            enhancement: 0,
            imageUrl: "https://i.ibb.co/tyFT312/Gemini-Generated-Image-xrqrfmxrqrfmxrqr.png"
        },
        visualUrl: "https://i.ibb.co/DDrvwX0P/Gemini-Generated-Image-chomtwchomtwchom.png",
        level: 1000,
        skills: [
            createBossSkill("스팀 브레이커 충격파", "[부가 효과: 기절] 고압 증기를 폭발시켜 방어선을 강타합니다.", SkillType.PHYSICAL, 860, 180, "STR*8.6")
        ]
    },
    "니스 코트다쥐르 청랑룡": {
        id: "mythicboss_nice_dragon",
        name: "니스 코트다쥐르 청랑룡",
        title: "지중해의 푸른 신수 / 수호 사파이어",
        shinryokuType: "해수계",
        description: "프랑스 남부 니스 해안의 빛나는 사파이어 물결에서 현신한 신비로운 청해 수룡입니다.",
        specialLoot: "지중해의 푸른 파도 보주",
        detailedLoot: {
            name: "지중해의 푸른 파도 보주",
            type: "SubWeapon",
            weaponType: "Orb",
            elementalType: "해수계",
            rarity: ItemRarity.LEGENDARY,
            description: "지중해의 맑은 해류 기운이 차오르는 신비한 해수 보주.",
            stats: { int: 420, wis: 350, mp: 3000 },
            secondaryOptions: ["마법 공격력 +85%", "해수계 속성 피해 +40%", "WIS +35%", "MP +30%"],
            enhancement: 0,
            imageUrl: "https://i.ibb.co/bgv59GHB/Gemini-Generated-Image-c8jkgyc8jkgyc8jk.png"
        },
        visualUrl: "https://i.ibb.co/sd9hVzL7/Gemini-Generated-Image-tg9vthtg9vthtg9v.png",
        level: 1000,
        skills: [
            createBossSkill("코트다쥐르 심해 소용돌이", "[부가 효과: 속박] 거대한 해류를 회전시켜 적들을 침몰시킵니다.", SkillType.MAGIC, 870, 200, "INT*8.7")
        ]
    },
    "뮌헨 바이에른 흑철룡": {
        id: "mythicboss_munich_dragon",
        name: "뮌헨 바이에른 흑철룡",
        title: "알프스의 수호 거룡 / 흑철의 군주",
        shinryokuType: "대지계",
        description: "알프스 산맥의 단단한 암석과 뮌헨 바이에른 왕가의 고대 흑철 가호가 축적된 수호룡입니다.",
        specialLoot: "바이에른의 흑철 마법력",
        detailedLoot: {
            name: "바이에른의 흑철 마법력",
            type: "Weapon",
            weaponType: "Energy",
            rarity: ItemRarity.LEGENDARY,
            description: "바이에른 연금술사가 기록한 대지의 비밀 수호 마법력.",
            stats: { def: 420, wis: 320, str: 280 },
            secondaryOptions: ["물리 방어력 +80%", "INT +50%", "최대 HP +40%", "상태이상 저항 +30%"],
            enhancement: 0,
            imageUrl: "https://i.ibb.co/7tp8C3n9/Gemini-Generated-Image-olu0ukolu0ukolu0.png"
        },
        visualUrl: "https://i.ibb.co/Z1L6R9Xv/Gemini-Generated-Image-by19vzby19vzby19.png",
        level: 1000,
        skills: [
            createBossSkill("알프스 대지 파쇄", "[부가 효과: 파열] 대지를 울리는 묵직한 내리찍기로 전장을 격파합니다.", SkillType.PHYSICAL, 890, 210, "STR*8.9")
        ]
    },
    "베네치아 수상도시 환원제": {
        id: "mythicboss_venice_emperor",
        name: "베네치아 환영의 수상 환원제",
        title: "수도(水都)의 가면 여왕 / 카니발 환영신",
        shinryokuType: "월광계",
        description: "베네치아 운하와 밤의 가면 무도회 신력이 결합하여 탄생한 환영의 신수입니다.",
        specialLoot: "수도(水都)의 가면",
        detailedLoot: {
            name: "수도(水都)의 가면",
            type: "Head",
            rarity: ItemRarity.LEGENDARY,
            description: "환영과 달빛이 은은하게 비치는 오페라 가면 유물.",
            stats: { agi: 350, int: 350, ctrl: 250 },
            secondaryOptions: ["치명타율 +50%", "마법 공격력 +60%", "AGI +35%", "물리 회피율 +45%"],
            enhancement: 0,
            imageUrl: "https://i.ibb.co/wFgsHMD2/Gemini-Generated-Image-wng4a1wng4a1wng4.png"
        },
        visualUrl: "https://i.ibb.co/XfqS77hz/Gemini-Generated-Image-vrdmrpvrdmrpvrdm.png",
        level: 1000,
        skills: [
            createBossSkill("운하 환영 무도", "[부가 효과: 혼란] 환영의 칼날과 파도로 대상을 유혹해 자멸하게 만듭니다.", SkillType.MAGIC, 850, 180, "INT*8.5")
        ]
    },
    "바르셀로나 성환의 거상": {
        id: "mythicboss_barcelona_golem",
        name: "바르셀로나 사그라다 성환의 거상",
        title: "가우디의 곡선 신성 / 성휘의 콜로서스",
        shinryokuType: "광휘계",
        description: "바르셀로나 사그라다 파밀리아의 성스러운 빛과 가우디의 예술적 신력이 응집된 거상입니다.",
        specialLoot: "사그라다 성휘의 성체",
        detailedLoot: {
            name: "사그라다 성휘의 성체",
            type: "Body",
            elementalType: "광휘계",
            rarity: ItemRarity.LEGENDARY,
            description: "성스러운 기둥의 곡선 유선형 구조가 조각된 빛의 수호복.",
            stats: { int: 420, wis: 380, ctrl: 220 },
            secondaryOptions: ["광휘계 속성 피해 +60%", "INT +35%", "마법 방어력 +35%", "최종 능력치 +45%"],
            enhancement: 0,
            imageUrl: "https://i.ibb.co/pvrLBx3n/Gemini-Generated-Image-693x6693x6693x66.png"
        },
        visualUrl: "https://i.ibb.co/4ZYns5Sk/Gemini-Generated-Image-pq6nkypq6nkypq6n.png",
        level: 1000,
        skills: [
            createBossSkill("성휘의 찬가 레이저", "[부가 효과: 소멸] 성스러운 광채를 집중 조사하여 사악함을 소멸시킵니다.", SkillType.MAGIC, 900, 220, "INT*9.0")
        ]
    },
    "토론토 온타리오 설화룡": {
        id: "mythicboss_toronto_dragon",
        name: "토론토 온타리오 설화룡",
        title: "동토의 얼음 수호자 / 설원용",
        shinryokuType: "빙결계",
        description: "온타리오 호수의 깊은 차가운 얼음 속에서 소환된 얼음 가시룡입니다.",
        specialLoot: "동토의 자작나무 고리",
        detailedLoot: {
            name: "동토의 자작나무 고리",
            type: "Accessory",
            rarity: ItemRarity.LEGENDARY,
            description: "영구 동토에서 자라난 자작나무 결계를 머금은 수호 반환.",
            stats: { wis: 380, def: 300, hp: 4000 },
            secondaryOptions: ["빙결계 속성 피해 +60%", "WIS +55%", "상태이상 저항 +35%", "마법 공격력 +35%"],
            enhancement: 0,
            imageUrl: "https://i.ibb.co/r28bGnK8/Gemini-Generated-Image-65nv1265nv1265nv.png"
        },
        visualUrl: "https://i.ibb.co/8HBdWxw/Gemini-Generated-Image-660plr660plr660p.png",
        level: 1000,
        skills: [
            createBossSkill("온타리오 블리자드 강타", "[부가 효과: 빙결] 살인적인 혹한 바람을 격출시켜 빙결시킵니다.", SkillType.MAGIC, 880, 200, "INT*8.8")
        ]
    },
    "멜버른 남십자 환야수": {
        id: "mythicboss_melbourne_beast",
        name: "멜버른 남십자 환야수",
        title: "남반구의 별빛 야수 / 환야의 군주",
        shinryokuType: "월광계",
        description: "남십자성의 별빛 기운과 멜버른 야간 해안의 신력이 모여 이루어진 고대 환수입니다.",
        specialLoot: "남십자성의 별빛 성배",
        detailedLoot: {
            name: "남십자성의 별빛 성배",
            type: "SubWeapon",
            weaponType: "Orb",
            rarity: ItemRarity.LEGENDARY,
            description: "남십자 별빛 기운을 모아 영력을 회복시키는 성스러운 성배.",
            stats: { int: 400, wis: 360, ctrl: 250 },
            secondaryOptions: ["마법 공격력 +60%", "월광계 속성 피해 +40%", "INT +30%", "치명타 피해량 +40%"],
            enhancement: 0,
            imageUrl: "https://i.ibb.co/VYDsZ69s/Gemini-Generated-Image-8secfo8secfo8sec.png"
        },
        visualUrl: "https://i.ibb.co/7dh3Hdzr/Gemini-Generated-Image-tcebd8tcebd8tceb.png",
        level: 1000,
        skills: [
            createBossSkill("남십자성 낙하", "[부가 효과: 감전] 별빛의 유성을 차례로 떨어뜨려 적진을 흔듭니다.", SkillType.MAGIC, 870, 200, "INT*8.7")
        ]
    },
    "두바이 부르주 황금제": {
        id: "mythicboss_dubai_titan",
        name: "두바이 부르주 황금제",
        title: "사막의 황금 마천루 / 오아시스 제왕",
        shinryokuType: "화염계",
        description: "두바이의 황금 마천루와 사막 열풍의 신력이 응집된 거대 황금 파라오 골렘입니다.",
        specialLoot: "황금의 사막 왕관",
        detailedLoot: {
            name: "황금의 사막 왕관",
            type: "Head",
            rarity: ItemRarity.LEGENDARY,
            description: "사막의 열기와 자본의 번영이 교차하는 황금 왕관.",
            stats: { str: 400, def: 350, hp: 5000 },
            secondaryOptions: ["최종 능력치 +65%", "STR +35%", "물리 방어력 +40%", "최대 HP +30%"],
            enhancement: 0,
            imageUrl: "https://i.ibb.co/nKmh3nY/Gemini-Generated-Image-t3xvd7t3xvd7t3xv.png"
        },
        visualUrl: "https://i.ibb.co/2xr0NMg/Gemini-Generated-Image-dm1hbcdm1hbcdm1h.png",
        level: 1000,
        skills: [
            createBossSkill("부르주 솔라 폭풍", "[부가 효과: 화상] 거대한 사막 화염 폭풍을 사방으로 방출합니다.", SkillType.MAGIC, 890, 210, "INT*8.9")
        ]
    }
};

export type SeasonalBoss = {
  nation: string;
  city: string;
  bossKey: string;
};

export const SEASONAL_BOSS_CONFIG: Record<number, SeasonalBoss[]> = {
    1: [ 
        { nation: "신의 성소", city: "신의 거처", bossKey: "신" },
        { nation: "양의 기운의 성전", city: "전격의 사자의 성전", bossKey: "권율" },
        { nation: "일본", city: "도쿄", bossKey: "야마타노 오로치" },
        { nation: "일본", city: "오사카", bossKey: "오사카 백호 봉래마신" },
        { nation: "스웨덴", city: "스톡홀름", bossKey: "토르" },
        { nation: "캐나다", city: "오타와", bossKey: "윈디고킹" },
        { nation: "캐나다", city: "토론토", bossKey: "토론토 온타리오 설화룡" },
        { nation: "남아공", city: "케이프타운", bossKey: "이칸얌바" },
        { nation: "임페리얼 제국", city: "눌바리온", bossKey: "제로" },
        { nation: "인도네시아", city: "자카르타", bossKey: "가루다 프라임" },
        { nation: "노르웨이", city: "오슬로", bossKey: "요르문간드" } 
    ],
    2: [
        { nation: "중국", city: "베이징", bossKey: "손오공" },
        { nation: "중국", city: "상하이", bossKey: "초전도황룡" },
        { nation: "러시아", city: "모스크바", bossKey: "페룬" },
        { nation: "브라질", city: "상파울루", bossKey: "아마조나스령" },
        { nation: "음의 기운의 성전", city: "강철의 사자의 강성", bossKey: "퍼스트스틸스" },
        { nation: "임페리얼 제국", city: "딜리리움", bossKey: "루시엔" },
        { nation: "뉴질랜드", city: "웰링턴", bossKey: "마우이_신화" },
        { nation: "헝가리", city: "부다페스트", bossKey: "투룰" } 
    ],
    3: [
        { nation: "인도", city: "뉴델리", bossKey: "시바" },
        { nation: "호주", city: "시드니", bossKey: "무지개뱀" },
        { nation: "호주", city: "멜버른", bossKey: "멜버른 남십자 환야수" },
        { nation: "음의 기운의 성전", city: "지령의 사자의 궁궐", bossKey: "원지원" },
        { nation: "임페리얼 제국", city: "노크티아", bossKey: "아포리아" },
        { nation: "몽골", city: "울란바토르", bossKey: "징기스칸" },
        { nation: "아일랜드", city: "더블린", bossKey: "모리안" },
        { nation: "레오니스 투기국", city: "레오폴리스", bossKey: "가르무르라이오른"}
    ],
    4: [
        { nation: "독일", city: "베를린", bossKey: "지크프리트" },
        { nation: "독일", city: "뮌헨", bossKey: "뮌헨 바이에른 흑철룡" },
        { nation: "이스라엘", city: "예루살렘", bossKey: "솔로몬" },
        { nation: "아르헨티나", city: "부에노스아이레스", bossKey: "은의수호자" },
        { nation: "임페리얼 제국", city: "엔드라실", bossKey: "바르칼론" },
        { nation: "이란", city: "테헤란", bossKey: "아지 다하카" },
        { nation: "우크라이나", city: "키이우", bossKey: "체르노보그" },
        { nation: "케냐", city: "나이로비", bossKey: "은가이의화신" }
    ],
    5: [
        { nation: "프랑스", city: "파리", bossKey: "잔다르크" },
        { nation: "프랑스", city: "니스", bossKey: "니스 코트다쥐르 청랑룡" },
        { nation: "양의 기운의 성전", city: "초화의 사자의 성초", bossKey: "태스크슈카인" },
        { nation: "임페리얼 제국", city: "세라피엘 몰락지", bossKey: "아자르" },
        { nation: "멕시코", city: "멕시코시티", bossKey: "케찰코아틀" },
        { nation: "덴마크", city: "코펜하겐", bossKey: "헬" },
        { nation: "미르탈 숲연합", city: "미르탈", bossKey: "실바나 루미엘"}
    ],
    6: [
        { nation: "영국", city: "런던", bossKey: "아서" },
        { nation: "영국", city: "맨체스터", bossKey: "맨체스터 스팀헤비메탈 타이탄" },
        { nation: "임페리얼 제국", city: "카르나쥬", bossKey: "카르니발" },
        { nation: "필리핀", city: "마닐라", bossKey: "바쿠나와_신화" },
        { nation: "미국", city: "LA", bossKey: "라스트아이콘" },
        { nation: "루마니아", city: "부쿠레슈티", bossKey: "드라큘라" },
        { nation: "말레이시아", city: "쿠알라룸푸르", bossKey: "항투아프라임" }
    ],
    7: [
        { nation: "미국", city: "워싱턴 D.C.", bossKey: "리버티" },
        { nation: "미국", city: "뉴욕", bossKey: "아펙스타이탄" },
        { nation: "무의 궁", city: "무의 궁궐", bossKey: "홍길동" },
        { nation: "음의 기운의 성전", city: "질풍의 사자의 질풍전", bossKey: "블랙스톰" },
        { nation: "임페리얼 제국", city: "인페르노스", bossKey: "이그니스" },
        { nation: "나이지리아", city: "아부자", bossKey: "아그바라" },
        { nation: "스코틀랜드", city: "에든버러", bossKey: "덜러한" },
        { nation: "UAE", city: "아부다비", bossKey: "알샴스" },
        { nation: "UAE", city: "두바이", bossKey: "두바이 부르주 황금제" }
    ],
    8: [
        { nation: "이집트", city: "카이로", bossKey: "라" },
        { nation: "그리스", city: "아테네", bossKey: "포세이돈" },
        { nation: "양의 기운의 성전", city: "화염의 사자의 성화", bossKey: "라페르난데스" },
        { nation: "양의 기운의 성전", city: "해수의 사자의 성수전", bossKey: "오션레이크" },
        { nation: "임페리얼 제국", city: "네크로폴리스", bossKey: "몰드릭" },
        { nation: "사우디아라비아", city: "리야드", bossKey: "이프리트 알-말릭" }
    ],
    9: [
        { nation: "이탈리아", city: "로마", bossKey: "유피테르" },
        { nation: "이탈리아", city: "베네치아", bossKey: "베네치아 수상도시 환원제" },
        { nation: "터키", city: "앙카라", bossKey: "예니체리로드" },
        { nation: "음의 기운의 성전", city: "빙결의 사자의 빙궁", bossKey: "이케블리자더" },
        { nation: "임페리얼 제국", city: "베놈가든", bossKey: "스콜라" },
        { nation: "벨기에", city: "브뤼셀", bossKey: "다이아몬드 크러셔" },
        { nation: "핀란드", city: "헬싱키", bossKey: "루오타르" } 
    ],
    10: [
        { nation: "대한민국", city: "서울", bossKey: "환웅" },
        { nation: "대한민국", city: "부산", bossKey: "해룡왕" },
        { nation: "북한", city: "평양", bossKey: "단군왕검" },
        { nation: "스페인", city: "마드리드", bossKey: "엘시드" },
        { nation: "스페인", city: "바르셀로나", bossKey: "바르셀로나 성환의 거상" },
        { nation: "음의 기운의 성전", city: "암연의 사자의 심연", bossKey: "네오다크볼튼" },
        { nation: "양의 기운의 성전", city: "광휘의 사자의 성소", bossKey: "줄리엣" },
        { nation: "임페리얼 제국", city: "크로노폴", bossKey: "카이로스" },
        { nation: "체코", city: "프라하", bossKey: "골렘 프라하" },
        { nation: "폴란드", city: "바르샤바", bossKey: "스트리가" } 
    ],
    11: [
        { nation: "네덜란드", city: "암스테르담", bossKey: "더치맨" },
        { nation: "스위스", city: "베른", bossKey: "알프스티탄" },
        { nation: "포르투갈", city: "리스본", bossKey: "아다마스토르" },
        { nation: "음의 기운의 성전", city: "월광의 사자의 성", bossKey: "최원한" },
        { nation: "임페리얼 제국", city: "블러드문", bossKey: "루나스" },
        { nation: "모로코", city: "라바트", bossKey: "안카르" },
        { nation: "오스트리아", city: "빈", bossKey: "티롤" },
        { nation: "싱가포르", city: "싱가포르", bossKey: "머라이언오버로드" }
    ],
    12: [
         { nation: "양의 기운의 성전", city: "태양의 사자의 성전", bossKey: "엘클"},
         { nation: "임페리얼 제국", city: "임페리얼", bossKey: "임페리얼"},
         { nation: "베트남", city: "하노이", bossKey: "락롱꾸언" },
         { nation: "태국", city: "방콕", bossKey: "프라야나크" },
         { nation: "네크로디움 제국", city: "말피스", bossKey: "아르카제온네크로스"}
    ]
};

// 시즌/신화 보스 판별 식별자 캐시 (SEASONAL_BOSSES 및 SEASONAL_BOSS_CONFIG 기반)
const mythicBossIdentifiers = new Set<string>();

const initMythicBossIdentifiers = () => {
    if (mythicBossIdentifiers.size > 0) return;
    for (const [key, boss] of Object.entries(SEASONAL_BOSSES)) {
        if (key) mythicBossIdentifiers.add(key.trim().toLowerCase());
        if (boss.id) mythicBossIdentifiers.add(boss.id.trim().toLowerCase());
        if (boss.name) mythicBossIdentifiers.add(boss.name.trim().toLowerCase());
    }
    Object.values(SEASONAL_BOSS_CONFIG).forEach(list => {
        list.forEach(cfg => {
            if (cfg.bossKey) mythicBossIdentifiers.add(cfg.bossKey.trim().toLowerCase());
        });
    });
};

/**
 * mythicbossmonsters.ts에 등록된 시즌 보스(신화 보스)인지 정밀 판별
 */
export const isMythicSeasonalBoss = (attacker: any): boolean => {
    if (!attacker) return false;

    // 1. 명시적 시즌/신화 보스 플래그 확인
    if (
        attacker.isSeasonalBoss ||
        attacker.isMythicBoss ||
        attacker.isMythic ||
        attacker.isSeason ||
        attacker.bossType === 'season' ||
        attacker.bossType === 'mythic'
    ) {
        return true;
    }

    // 2. 타이틀에 시즌/신화가 포함된 경우
    if (attacker.title && (attacker.title.includes('시즌') || attacker.title.includes('신화'))) {
        return true;
    }

    initMythicBossIdentifiers();

    // 3. ID 기준 판정
    if (attacker.id) {
        const idLower = String(attacker.id).trim().toLowerCase();
        if (idLower.startsWith('mythicboss_') || idLower.startsWith('season_boss_') || idLower.includes('mythic')) {
            return true;
        }
        if (mythicBossIdentifiers.has(idLower)) {
            return true;
        }
    }

    // 4. 이름 기준 판정 ([BOSS] 수식어, 중복 알파벳 접미사 등 제거 후 매칭)
    if (attacker.name) {
        const cleanName = String(attacker.name)
            .replace(/^\[(BOSS|보스|신화|시즌|월드보스|정예|보스 호위병)\]\s*/i, '')
            .replace(/\s+[A-Z]$/, '')
            .trim()
            .toLowerCase();

        if (mythicBossIdentifiers.has(cleanName)) {
            return true;
        }

        for (const ident of mythicBossIdentifiers) {
            if (ident.length >= 2 && (cleanName.includes(ident) || ident.includes(cleanName))) {
                return true;
            }
        }
    }

    // 5. 중첩된 bossData 속성 확인
    if (attacker.bossData && isMythicSeasonalBoss(attacker.bossData)) {
        return true;
    }

    return false;
};

