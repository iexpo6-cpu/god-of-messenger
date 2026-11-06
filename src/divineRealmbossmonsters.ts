
import { ClassTier, SkillType, ItemRarity, Skill, SkillTarget, Item } from './types';
import { BossData } from './bossMonsters';

const createBossSkill = (name: string, desc: string, type: SkillType, ratio: number, mp: number, formula: string, target: SkillTarget = 'single'): Skill => ({
    name, description: desc, type, tier: ClassTier.FINAL, level: 10, maxLevel: 10, currentMastery: 0, mpCost: mp, powerRatio: ratio, effectFormula: formula, targetType: target
});

export const DIVINE_REALM_BOSSES: Record<string, Record<string, BossData>> = {
    "양의 기운의 성전": {
        "초화의 사자의 성초": {
            id:"boss_grass",
            name: "그래스 그린 베히모스",
            title: "대초원의 거신",
            shinryokuType: "초화계",
            description: "성초의 뿌리에서 태어난 거대 마수입니다. 그가 밟는 곳마다 생명이 피어나거나 혹은 으스러집니다.",
            specialLoot: "베히모스의 생명 정수",
            detailedLoot: {
                name: "베히모스의 생명 정수",
                type: "Accessory",
                rarity: ItemRarity.MYTHTIC,
                description: "무한한 재생력을 지닌 거신의 심장 파편.",
                stats: { hp: 50000, def: 2000, wis: 5000 },
                secondaryOptions: ["최대 HP +500%", "물리 공격력 +300%", "물리 방어력 +100%", "최종 능력치 +50%"],
                enhancement: 0,
                imageUrl:"https://i.ibb.co/99WZpKRj/Gemini-Generated-Image-hte3e0hte3e0hte3.png"
            },
            visualUrl: "https://i.ibb.co/HTtGBQQ9/grassgreenbehimos.png",
            level: 3500,
            skills: [createBossSkill("대지의 군림", "[부가 효과: 속박] 육중한 몸으로 대지를 눌러버립니다.", SkillType.PHYSICAL, 800, 200, "STR*8.0")]
        },
        "해수의 사자의 성수전": {
            id:"boss_ocean",
            name: "오션 블루 레비아탄",
            title: "심해의 재앙",
            shinryokuType: "해수계",
            description: "성수전의 거대한 소용돌이 속에서 현신하는 바다의 지배자입니다.",
            specialLoot: "레비아탄의 푸른 구슬",
            detailedLoot: {
                name: "레비아탄의 푸른 구슬",
                type: "SubWeapon",
                weaponType: "Orb",
                rarity: ItemRarity.MYTHTIC,
                description: "대양의 마력이 응축된 심해의 보주.",
                stats: { int: 3500, wis: 2500, ctrl: 2000 },
                secondaryOptions: ["마법 공격력 +300%", "[부가 효과: 빙결] 확률 50% 증가", "MP +500%", "최종 능력치 +50%"],
                enhancement: 0,
                imageUrl:"https://i.ibb.co/LdG68fQZ/Gemini-Generated-Image-xq8ccixq8ccixq8c.png"
            },
            visualUrl: "https://i.ibb.co/Q7GJjnWf/Oceanblueleviathan.png",
            level: 3800,
            skills: [createBossSkill("심해의 소용돌이", "[부가 효과: 빙결] 전장을 거대한 물감옥으로 만듭니다.", SkillType.MAGIC, 900, 250, "INT*9.0")]
        },
        "화염의 사자의 성화": {
            id:"boss_flame",
            name: "레드 플레임 라이온",
            title: "불타는 갈기의 맹수",
            shinryokuType: "화염계",
            description: "성화의 불꽃을 먹고 자란 사자입니다. 포효 한 번에 대기가 증발합니다.",
            specialLoot: "성화의 사자 갑옷",
            detailedLoot: {
                name: "성화의 사자 갑옷",
                type: "Body",
                rarity: ItemRarity.MYTHTIC,
                description: "불길 속에서도 타지 않는 전설의 갑옷.",
                stats: { def: 3000, str: 2000, hp: 10000 },
                secondaryOptions: ["화염계 속성 저항 +50%", "물리 방어력 +200%", "물리 공격력 +200%", "최대 HP +50%"],
                enhancement: 0,
                imageUrl:"https://i.ibb.co/xK4xmrDF/Gemini-Generated-Image-nw6j0jnw6j0jnw6j.png"
            },
            visualUrl: "https://i.ibb.co/xKmBXqLh/redflamelion.png",
            level: 4000,
            skills: [createBossSkill("폭열 포효", "[부가 효과: 화상] 초고열의 화염파를 방출합니다.", SkillType.MAGIC, 1000, 300, "INT*10.0")]
        },
        "전격의 사자의 성전": {
            id:"boss_thunder",
            name: "라이트닝 썬더 울프",
            title: "천둥의 추격자",
            shinryokuType: "전격계",
            description: "번개보다 빠르게 전장을 누비는 신수입니다.",
            specialLoot: "뇌랑의 신속 장화",
            detailedLoot: {
                name: "뇌랑의 신속 장화",
                type: "Feet",
                rarity: ItemRarity.MYTHTIC,
                description: "번개의 속도를 지닌 장화.",
                stats: { agi: 8000, ctrl: 2000 },
                secondaryOptions: ["AGI +300%", "물리 공격력 +50%", "물리 방어력 +50%", "최종 능력치 +50%"],
                enhancement: 0,
                imageUrl:"https://i.ibb.co/LXRv5ZmD/Gemini-Generated-Image-mpupvzmpupvzmpup.png"
            },
            visualUrl: "https://i.ibb.co/cSgmTW2x/Kakao-Talk-20251222-200748851-06.png",
            level: 4200,
            skills: [createBossSkill("만뇌의 일격", "[부가 효과: 감전] 수만 갈래의 번개로 적을 찢습니다.", SkillType.PHYSICAL, 1200, 350, "AGI*12.0")]
        },
        "광휘의 사자의 성소": {
            id:"boss_light",
            name: "화이트 엔젤 페가수스",
            title: "성역의 정화수",
            shinryokuType: "광휘계",
            description: "빛의 날개를 펼쳐 타락한 존재를 소멸시키는 성스러운 영수입니다.",
            specialLoot: "엔젤 페가수스 윙",
            detailedLoot: {
                name: "엔젤 페가수스 윙",
                type: "Accessory",
                rarity: ItemRarity.MYTHTIC,
                description: "성스러운 빛을 내는 날개.",
                stats: { str: 3000, int: 4000, wis: 3000, ctrl: 3000 },
                secondaryOptions: ["광휘계 속성 피해 +50%", "상태이상 저항 +100%", "최종 능력치 +300%", "최대 HP +50%"],
                enhancement: 0,
                imageUrl:"https://i.ibb.co/nMt4Dt0D/Gemini-Generated-Image-rg4muwrg4muwrg4m.png"
            },
            visualUrl: "https://i.ibb.co/qYfwv08P/Kakao-Talk-20251222-200748851-08.png",
            level: 4500,
            skills: [
                createBossSkill("홀리 퍼지", "[부가 효과: 소멸] 신성한 빛으로 전장을 정화합니다.", SkillType.MAGIC, 1500, 400, "INT*15.0"),
                createBossSkill("광휘의 은총 치유", "성스러운 빛으로 날개를 감싸 상처를 치유합니다.", SkillType.BUFF, 100, 200, "HP 20% 회복, RECOV:HP", 'self'),
                createBossSkill("불멸의 페가수스 환생", "치명적인 상처를 입었을 때 광휘의 성광으로 생명을 회복하며 다시 일어납니다.", SkillType.BUFF, 0, 300, "RESURRECT 50%, HP 50% 부활", 'self')
            ]
        },
        "태양의 사자의 성전": {
            id:"boss_sun",
            name: "썬 레드 블레이즈 드래곤",
            title: "태양을 삼킨 용",
            shinryokuType: "태양계",
            description: "태양의 중심부에서 태어났다고 전해지는 고대룡입니다.",
            specialLoot: "태양의 갑옷",
            detailedLoot: {
                name: "태양의 갑옷",
                type: "Body",
                rarity: ItemRarity.MYTHTIC,
                description: "태양의 힘이 느껴지는 갑옷.",
                stats: { str: 6000, agi: 5000, ctrl: 3000, def : 5000, hp : 50000 },
                secondaryOptions: ["물리 방어력 +200%", "마법 방어력 +200%", "모든 능력치 +200%", "최대 HP +100%"],
                enhancement: 0,
                imageUrl:"https://i.ibb.co/5Wkm08bD/Gemini-Generated-Image-k4nqrgk4nqrgk4nq.png"
            },
            visualUrl: "https://i.ibb.co/LdsvKBKj/Kakao-Talk-20251222-200748851-03.png",
            level: 5000,
            skills: [createBossSkill("파이널 선브레스", "[부가 효과: 소멸] 태양 폭발을 브레스 형태로 방출합니다.", SkillType.MAGIC, 2000, 500, "INT*20.0")]
        }
    },
    "음의 기운의 성전": {
        "빙결의 사자의 빙궁": {
            id:"boss_ice",
            name: "아이스 블리자드 베어",
            title: "절대영도의 약탈자",
            shinryokuType: "빙결계",
            description: "빙궁의 차가운 냉기를 먹고 자란 거대 북극곰입니다.",
            specialLoot: "서리 서린 앞발",
            detailedLoot: {
                name: "블리자드 건틀릿",
                type: "Hand",
                rarity: ItemRarity.MYTHTIC,
                description: "닿는 모든 것을 얼려버리는 강철 건틀릿.",
                stats: { str: 6000, def: 3000 },
                secondaryOptions: ["빙결계 속성 저항 +50%", "물리 방어력 +300%", "빙결계 속성 피해 +100%", "최대 HP +50%"],
                enhancement: 0,
                imageUrl:"https://i.ibb.co/kgLm7xHS/Gemini-Generated-Image-vgy0qdvgy0qdvgy0.png"
            },
            visualUrl: "https://i.ibb.co/ZvDVcNV/Kakao-Talk-20251222-200748851-10.png",
            level: 3500,
            skills: [createBossSkill("빙산 붕괴", "[부가 효과: 빙결] 얼음 덩어리를 내리쳐 전장을 동결시킵니다.", SkillType.PHYSICAL, 850, 220, "STR*8.5")]
        },
        "강철의 사자의 강성": {
            id:"boss_steel",
            name: "메탈 스틸 골렘",
            title: "불락의 요새",
            shinryokuType: "강철계",
            description: "강성의 외벽 자체가 살아 움직이는 골렘으로 변했습니다.",
            specialLoot: "초고밀도 합금 핵",
            detailedLoot: {
                name: "메탈릭 가디언 쉴드",
                type: "SubWeapon",
                weaponType: "Shield",
                rarity: ItemRarity.MYTHTIC,
                description: "어떤 충격도 흡수하는 거대 방패.",
                stats: { def: 10000, hp: 30000 },
                secondaryOptions: ["물리 방어력 +200%", "마법 방어력 +150%", "강철계 속성 저항 +50%", "최대 HP +150%"],
                enhancement: 0,
                imageUrl:"https://i.ibb.co/TDBdx8gs/Gemini-Generated-Image-dibshqdibshqdibs.png"
            },
            visualUrl: "https://i.ibb.co/Hp9LxJQd/Kakao-Talk-20251222-200748851-11.png",
            level: 4000,
            skills: [createBossSkill("강철의 진격", "[부가 효과: 파열] 거대한 방패로 적진을 무너뜨립니다.", SkillType.PHYSICAL, 700, 180, "DEF*10.0")]
        },
        "지령의 사자의 궁궐": {
            id:"boss_ground",
            name: "지령 현무",
            title: "대지의 파수꾼",
            shinryokuType: "대지계",
            description: "궁궐 지하 깊은 곳의 맥을 지키는 전설의 영수입니다.",
            specialLoot: "그라운드 바스타드 소드",
            detailedLoot: {
                name: "지령의 검",
                type: "SubWeapon",
                weaponType: "SubSword",
                elementalType: "대지계",
                rarity: ItemRarity.MYTHTIC,
                description: "대지의 무게가 들어간 보조 검.",
                stats: { str: 4000, def: 1000, wis: 2000 },
                secondaryOptions: ["최종 능력치 +200%", "물리 공격력 +100%", "최대 HP +500%", "대지계 속성 피해 +50%"],
                enhancement: 0,
                imageUrl:"https://i.ibb.co/zW9N6g6c/Gemini-Generated-Image-2dmfcw2dmfcw2dmf.png"
            },
            visualUrl: "https://i.ibb.co/G3cRSbQv/Kakao-Talk-20251222-200748851-07.png",
            level: 4200,
            skills: [createBossSkill("지진파 방출", "[부가 효과: 속박] 거대한 충격파로 적을 매장합니다.", SkillType.PHYSICAL, 950, 280, "DEF*12.0")]
        },
        "질풍의 사자의 질풍전": {
            id:"boss_wind",
            name: "그레이 허리케이너크스",
            title: "폭풍의 사냥꾼",
            shinryokuType: "질풍계",
            description: "질풍전의 난기류 속에서 현신하는 공룡 형태의 신수입니다.",
            specialLoot: "허리케이너 가죽 자켓",
            detailedLoot: {
                name: "허리케이너 가죽 자켓",
                type: "Body",
                rarity: ItemRarity.MYTHTIC,
                description: "허리케이너크스의 가죽으로 만든 전설의 가죽 자켓.",
                stats: { def: 5000, agi: 5000 },
                secondaryOptions: ["물리 방어력 +200%", "물리 공격력 +100%", "치명타율 +200%", "최대 HP +50%"],
                enhancement: 0,
                imageUrl:"https://i.ibb.co/k2XmYbgZ/Gemini-Generated-Image-yogvvcyogvvcyogv.png"
            },
            visualUrl: "https://i.ibb.co/VpD7h8X5/Kakao-Talk-20251222-200748851-05.png",
            level: 4300,
            skills: [createBossSkill("진공 참격", "[부가 효과: 파열] 공기를 갈라 적의 방어구를 찢습니다.", SkillType.MAGIC, 1100, 320, "AGI*11.0")]
        },
        "암연의 사자의 심연": {
            id:"boss_dark",
            name: "블랙 다크 케르베로스",
            title: "심연의 수문장",
            shinryokuType: "암흑계",
            description: "심연의 가장 깊은 곳을 지키는 세 머리의 개입니다.",
            specialLoot: "쉐도우 블레이드",
            detailedLoot: {
                name: "쉐도우 블레이드",
                type: "SubWeapon",
                weaponType: "SubSword",
                elementalType: "암흑계",
                rarity: ItemRarity.MYTHTIC,
                description: "블랙 다크 케르베로스의 이빨로 만든 그림자 차원을 다루는 신비한 보조검.",
                stats: { str: 2000, int: 5000, ctrl: 2000, wis: 5000 },
                secondaryOptions: ["마법 공격력 +200%", "MP +200%", "흡혈 피해 +10%", "물리 공격력 +200%"],
                enhancement: 0,
                imageUrl:"https://i.ibb.co/Kpp1JD34/Gemini-Generated-Image-bfh5btbfh5btbfh5.png"
            },
            visualUrl: "https://i.ibb.co/w8j0S91/Kakao-Talk-20251222-200748851-09.png",
            level: 4600,
            skills: [createBossSkill("지옥의 포효", "[부가 효과: 공포] 영혼을 얼려버리는 포효입니다.", SkillType.DEBUFF, 0, 200, "ALL_STATS -50%")]
        },
        "월광의 사자의 성": {
            id:"boss_moon",
            name: "블랙 다크 문 드래곤",
            title: "밤의 지배자",
            shinryokuType: "월광계",
            description: "달의 그림자에서 현신한 흑룡입니다. 모든 빛을 삼켜버립니다.",
            specialLoot: "월룡의 역린",
            detailedLoot: {
                name: "월룡의 역린",
                type: "Body",
                rarity: ItemRarity.MYTHTIC,
                description: "달의 정기를 모으는 칠흑의 갑주.",
                stats: { int: 8000, wis: 5000, def: 5000, mp: 30000 },
                secondaryOptions: ["마법 공격력 +200%", "상태이상 저항 +100%", "마법 방어력 +300%", "물리 방어력 +300%"],
                enhancement: 0,
                imageUrl:"https://i.ibb.co/XgXtJZj/Gemini-Generated-Image-h6269wh6269wh626.png"
            },
            visualUrl: "https://i.ibb.co/wN7FDhYT/Kakao-Talk-20251222-200748851-04.png",
            level: 5000,
            skills: [createBossSkill("이클립스 버스트", "[부가 효과: 월암] 전장의 모든 빛을 지워버립니다.", SkillType.MAGIC, 1800, 450, "INT*18.0")]
        }
    },
    "무의 궁": {
        "무의 궁궐": {
            id:"boss_void",
            name: "무극의 환영",
            title: "끝없는 무의 정점",
            shinryokuType: "신체강화계",
            description: "형체가 존재하지 않는, 오직 투기(鬪氣)만으로 이루어진 무의 사자의 환영입니다.",
            specialLoot: "무극의 환영 벨트",
            detailedLoot: {
                name: "무극의 환영 벨트",
                type: "Accessory",
                rarity: ItemRarity.MYTHTIC,
                description: "한계를 알 수 없는 힘을 억제하는 벨트.",
                stats: { str: 5000, agi: 5000, def: 5000, ctrl: 5000 },
                secondaryOptions: ["물리 공격력 +250%", "상태이상 저항 +50%", "치명타율 +100%", "최종 능력치 +100%"],
                enhancement: 0,
                imageUrl:"https://i.ibb.co/zHZzd5zk/Gemini-Generated-Image-xdxkdbxdxkdbxdxk.png"
            },
            visualUrl: "https://i.ibb.co/xq2zVGtb/Kakao-Talk-20251222-200748851-02.png",
            level: 4900,
            skills: [createBossSkill("무형의 연격", "정해진 형체 없이 무수한 타격을 가합니다.", SkillType.PHYSICAL, 2500, 600, "STR*25.0")]
        }
    },
    "신의 성소": {
        "신의 거처": {
            id:"boss_angel",
            name: "신성 가디언 엘라핌",
            title: "절대신의 파수꾼",
            shinryokuType: "광휘계",
            description: "절대신 엘라의 거처를 지키는 육익의 대천사입니다.",
            specialLoot: "신의 면류관 파편",
            detailedLoot: {
                name: "디바인 세라핌 헬름",
                type: "Head",
                rarity: ItemRarity.MYTHTIC,
                description: "신의 영광이 깃든 찬란한 투구.",
                stats: { def: 5000, wis: 5000, ctrl: 5000, hp: 10000 },
                secondaryOptions: ["모든 능력치 +300%", "상태이상 저항 +100%", "물리 방어력 +300%", "마법 방어력 +300%"],
                enhancement: 0,
                imageUrl:"https://i.ibb.co/2XGPRFJ/Gemini-Generated-Image-9lnm6d9lnm6d9lnm.png"
            },
            visualUrl: "https://i.ibb.co/j9kq14t8/Kakao-Talk-20251229-115214131.png",
            level: 7000,
            skills: [createBossSkill("성소의 정화", "[부가 효과: 소멸] 존재 자체를 신성한 빛으로 지워버립니다.", SkillType.MAGIC, 3000, 800, "INT*30.0")]
        }
    }
};
