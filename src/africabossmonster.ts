
import { ClassTier, SkillType, ItemRarity, Skill, SkillTarget, Item } from './types';
import { BossData } from './bossMonsters';

const createBossSkill = (name: string, desc: string, type: SkillType, ratio: number, mp: number, formula: string, target: SkillTarget = 'single'): Skill => ({
    name, description: desc, type, tier: ClassTier.FINAL, level: 10, maxLevel: 10, currentMastery: 0, mpCost: mp, powerRatio: ratio, effectFormula: formula, targetType: target
});

export const AFRICA_BOSSES: Record<string, Record<string, BossData>> = {
    "이집트": {
        "카이로": {
            id:"boss_kairo",
            name: "스핑크스 워든", title: "태양의 파수꾼", shinryokuType: "태양계",
            description: "피라미드를 지키는 고대의 영물입니다. 수수께끼를 틀린 자에게 태양의 벌을 내립니다.",
            specialLoot: "스핑크스의 황금 인장",
            detailedLoot: {
                name: "태양의 수호 인장", type: "Accessory", rarity: ItemRarity.LEGENDARY,
                description: "태양의 권능이 깃든 고대 이집트의 인장.",
                stats: { int: 150, wis: 250, ctrl: 200 },
                secondaryOptions: ["마법 공격력 +25%", "상태이상 저항 +20%", "태양계 속성 부여","최종 능력치 +10%"],
                enhancement: 0,
                imageUrl:"https://i.ibb.co/ZpXr0XKP/Gemini-Generated-Image-g204zyg204zyg204.png"
            },
            visualUrl: "https://i.ibb.co/ymY706VF/Gemini-Generated-Image-ld8gpvld8gpvld8g.png", level: 450,
            skills: [createBossSkill("태양의 심판", "[부가 효과: 소멸] 정화의 빛으로 존재를 지워버립니다.", SkillType.MAGIC, 600, 150, "INT*6.0")]
        },
        "알렉산드리아": {
            id:"boss_alex",
            name: "등대의 유령선장", title: "잊혀진 도서관의 망령", shinryokuType: "월광계",
            description: "과거의 지식을 지키기 위해 해안가에 나타나는 거대 영체입니다.",
            specialLoot: "알렉산드리아의 지혜석",
            detailedLoot: {
                name: "도서관의 비전 보주", type: "SubWeapon", weaponType: "Orb", rarity: ItemRarity.UNIQUE,
                description: "고대 알렉산드리아의 지식이 담긴 마법 구슬.",
                stats: { int: 220, wis: 80 },
                secondaryOptions: ["INT +25%", "마법 공격력 +10%", "월광계 속성 부여"],
                enhancement: 0,
                imageUrl:"https://i.ibb.co/zW7spZwk/Gemini-Generated-Image-rht2p1rht2p1rht2.png"
            },
            visualUrl: "https://i.ibb.co/9mx8tbcm/Gemini-Generated-Image-bg78zzbg78zzbg78.png", level: 430,
            skills: [createBossSkill("지식의 침식", "[부가 효과: 혼란] 적의 정신을 정보의 바다로 뒤흔듭니다.", SkillType.MAGIC, 450, 110, "INT*4.5")]
        }
    },
    "남아공": {
        "프리토리아": {
            id:"boss_prito",
            name: "다이아몬드 골렘", title: "무지개의 수호수", shinryokuType: "강철계",
            description: "지하 깊은 곳의 다이아몬드가 응축되어 만들어진 결정질 괴수입니다.",
            specialLoot: "금강석 심장",
            detailedLoot: {
                name: "다이아몬드 흉갑", type: "Body", rarity: ItemRarity.UNIQUE,
                description: "세상에서 가장 단단한 광석으로 제련된 갑옷.",
                stats: { def: 250, hp: 500 },
                secondaryOptions: ["물리 방어력 +28%", "상태이상 저항 +15%", "강철계 속성 부여"],
                enhancement: 0,
                imageUrl:"https://i.ibb.co/FkctVcbJ/Gemini-Generated-Image-vwg9favwg9favwg9.png"
            },
            visualUrl: "https://i.ibb.co/4RQX39qN/Gemini-Generated-Image-5o03lc5o03lc5o03.png", level: 440,
            skills: [createBossSkill("다이아몬드 크러시", "[부가 효과: 파열] 결정을 폭발시켜 방어구를 파괴합니다.", SkillType.PHYSICAL, 520, 130, "STR*5.2")]
        },
        "케이프타운": {
            id:"boss_cape",
            name: "테이블 마운틴 거인", title: "대륙의 어깨", shinryokuType: "대지계",
            description: "두 바다가 만나는 곳에 우뚝 솟은 산의 화신입니다.",
            specialLoot: "희망봉의 닻",
            detailedLoot: {
                name: "대륙의 무게 둔기", type: "Weapon", weaponType: "Blunt", rarity: ItemRarity.UNIQUE,
                description: "테이블 마운틴의 암석을 깎아 만든 육중한 철퇴.",
                stats: { str: 250, def: 80 },
                secondaryOptions: ["STR +30%", "물리 공격력 +12%", "대지계 속성 부여"],
                enhancement: 0,
                imageUrl:"https://i.ibb.co/60WwyfvH/Gemini-Generated-Image-bdympmbdympmbdym.png"
            },
            visualUrl: "https://i.ibb.co/F463vN7h/Gemini-Generated-Image-qt0gz8qt0gz8qt0g.png", level: 450,
            skills: [createBossSkill("산맥 붕괴", "[부가 효과: 속박] 대지를 울려 적들을 매장합니다.", SkillType.PHYSICAL, 580, 150, "STR*5.8")]
        },
        "요하네스버그": {
            id:"boss_yohn",
            name: "골드 러시 스피릿", title: "황금의 광기", shinryokuType: "전격계",
            description: "황금에 눈먼 자들의 투지가 신력과 결합된 번쩍이는 정령입니다.",
            specialLoot: "황금 전도체 반지",
            detailedLoot: {
                name: "요하네스버그의 인장", type: "Accessory", rarity: ItemRarity.UNIQUE,
                description: "전기를 유도하고 증폭시키는 황금 반지.",
                stats: { agi: 200, ctrl: 100 },
                secondaryOptions: ["치명타율 +12%", "전격계 속성 부여", "AGI +30%"],
                enhancement: 0,
                imageUrl:"https://i.ibb.co/B2rDvtmR/Gemini-Generated-Image-mdgtfjmdgtfjmdgt.png"
            },
            visualUrl: "https://i.ibb.co/fz0Bpxft/Gemini-Generated-Image-qp0aayqp0aayqp0a.png", level: 435,
            skills: [createBossSkill("골든 썬더", "[부가 효과: 감전] 황금의 기운을 담은 번개를 내립니다.", SkillType.MAGIC, 480, 120, "INT*4.8")]
        }
    },
    "나이지리아": {
        "아부자": {
            id:"boss_abuja",
            name: "사바나 오버로드", title: "초원의 주권자", shinryokuType: "신체강화계",
            description: "사바나의 모든 맹수들을 지배하는 강력한 무인입니다.",
            specialLoot: "사바나의 가죽 망토",
            detailedLoot: {
                name: "투사의 붉은 망토", type: "Body", rarity: ItemRarity.UNIQUE,
                description: "강인한 생명력이 느껴지는 투사의 예복.",
                stats: { def: 200, str: 150, hp: 600 },
                secondaryOptions: ["물리 공격력 +20%", "모든 능력치 +15", "신체강화계 속성 부여"],
                enhancement: 0,
                imageUrl:"https://i.ibb.co/9mt2s8Qx/Gemini-Generated-Image-yyp2s0yyp2s0yyp2.png"
            },
            visualUrl: "https://i.ibb.co/rRwjGmhn/Gemini-Generated-Image-2t3tcx2t3tcx2t3t.png", level: 440,
            skills: [createBossSkill("맹수의 연격", "[부가 효과: 출혈] 눈에 보이지 않는 속도로 대상을 난타합니다.", SkillType.PHYSICAL, 540, 120, "STR*5.4")]
        },
        "라고스": {
            id:"boss_lagos",
            name: "라군 히드라", title: "늪지의 포식자", shinryokuType: "해수계",
            description: "라고스 해안가 늪지에 도사리는 머리 셋 달린 수룡입니다.",
            specialLoot: "라군의 끈적한 비늘",
            detailedLoot: {
                name: "늪지의 독니 검", type: "Weapon", weaponType: "Sword", rarity: ItemRarity.UNIQUE,
                description: "늪지의 독기가 서린 날카로운 검.",
                stats: { str: 190, agi: 110 },
                secondaryOptions: ["치명타 피해 +25%", "해수계 속성 부여", "상태이상 저항 +20%"],
                enhancement: 0,
                imageUrl:"https://i.ibb.co/SkgJB2X/Gemini-Generated-Image-jb3vljjb3vljjb3v.png"
            },
            visualUrl: "https://i.ibb.co/d0RCbMjX/Gemini-Generated-Image-21xdoq21xdoq21xd.png", level: 420,
            skills: [createBossSkill("독성 해일", "[부가 효과: 혼란] 맹독이 섞인 파도를 일으킵니다.", SkillType.MAGIC, 440, 110, "INT*4.4")]
        }
    },
    "케냐": {
        "나이로비": {
            id:"boss_nairobi",
            name: "그레이트 리프트 타이탄", title: "대지구곡의 거신", shinryokuType: "대지계",
            description: "거대한 협곡 사이에서 나타나는 고대의 바위 인간입니다.",
            specialLoot: "지각 변동의 보주",
            detailedLoot: {
                name: "협곡의 고동 오브", type: "SubWeapon", weaponType: "Orb", rarity: ItemRarity.UNIQUE,
                description: "대지의 고동을 증폭시키는 무거운 보주.",
                stats: { wis: 180, def: 150 },
                secondaryOptions: ["마법 방어력 +25%", "대지계 속성 부여", "WIS +20%"],
                enhancement: 0,
                imageUrl:"https://i.ibb.co/wr4NkqS2/Gemini-Generated-Image-yacnp6yacnp6yacn.png"
            },
            visualUrl: "https://i.ibb.co/YBJCbYp5/Gemini-Generated-Image-lfvl9ilfvl9ilfvl.png", level: 440,
            skills: [createBossSkill("협곡의 분쇄", "[부가 효과: 파열] 지면을 찢어 발밑을 무너뜨립니다.", SkillType.PHYSICAL, 500, 130, "STR*5.0")]
        },
        "몸바사": {
            id:"boss_mombasa",
            name: "인도양의 문지기", title: "항구의 크라켄", shinryokuType: "해수계",
            description: "몸바사 항구 앞바다를 지배하는 거대 문어 마수입니다.",
            specialLoot: "심해의 흡착 촉수",
            detailedLoot: {
                name: "항구의 사수 장갑", type: "Hand", rarity: ItemRarity.UNIQUE,
                description: "바다 짐승의 가죽으로 만든 튼튼한 장갑.",
                stats: { str: 180, def: 80 },
                secondaryOptions: ["물리 방어력 +25%", "해수계 속성 부여", "상태이상 저항 +12%"],
                enhancement: 0,
                imageUrl:"https://i.ibb.co/w8whKcL/Gemini-Generated-Image-66qnlx66qnlx66qn.png"
            },
            visualUrl: "https://i.ibb.co/DD08ysZk/Gemini-Generated-Image-fcnyu0fcnyu0fcny.png", level: 410,
            skills: [createBossSkill("심연의 구속", "[부가 효과: 속박] 무수한 촉수로 적의 움직임을 봉쇄합니다.", SkillType.PHYSICAL, 420, 100, "STR*4.2")]
        }
    },
    "모로코": {
        "라바트": {
            id:"boss_labat",
            name: "카스바의 기사", title: "오래된 성채의 망령", shinryokuType: "질풍계",
            description: "성벽을 지키는 긍지 높은 기사의 영혼이 바람과 함께 되살아났습니다.",
            specialLoot: "성채의 황금 방패",
            detailedLoot: {
                name: "라바트 가디언 쉴드", type: "SubWeapon", weaponType: "Shield", rarity: ItemRarity.UNIQUE,
                description: "모래 폭풍을 견뎌낸 유구한 역사의 방패.",
                stats: { def: 240, agi: 60, ctrl: 40 },
                secondaryOptions: ["모든 능력치 +10%", "질풍계 속성 부여", "상태이상 저항 +15%"],
                enhancement: 0,
                imageUrl:"https://i.ibb.co/3gJHCXS/Gemini-Generated-Image-51wis051wis051wi.png"
            },
            visualUrl: "https://i.ibb.co/gZynWVm9/Gemini-Generated-Image-6rq9ph6rq9ph6rq9.png", level: 440,
            skills: [createBossSkill("모래 폭풍 베기", "[부가 효과: 암흑] 바람을 실은 검격으로 시야를 가립니다.", SkillType.PHYSICAL, 470, 115, "AGI*4.7")]
        },
        "카사블랑카": {
            id:"boss_kasa",
            name: "아틀라스 메아리", title: "산맥의 노래하는 마녀", shinryokuType: "월광계",
            description: "아틀라스 산맥의 정기를 받아 강력한 음파 마법을 구사하는 마녀입니다.",
            specialLoot: "산맥의 은색 지휘봉",
            detailedLoot: {
                name: "카사블랑카의 지휘봉", type: "Weapon", weaponType: "Staff", rarity: ItemRarity.UNIQUE,
                description: "밤하늘의 월광을 응축시킨 지휘봉.",
                stats: { int: 210, ctrl: 80 },
                secondaryOptions: ["마법 공격력 +25%", "월광계 속성 부여", "INT +20%"],
                enhancement: 0,
                imageUrl:"https://i.ibb.co/HLvcWHrw/Gemini-Generated-Image-ecjpiwecjpiwecjp.png"
            },
            visualUrl: "https://i.ibb.co/C3qfkLTw/Gemini-Generated-Image-g0jk9pg0jk9pg0jk.png", level: 450,
            skills: [createBossSkill("달빛의 소나타", "[부가 효과: 혼란] 적들을 현혹시키는 치명적인 연주입니다.", SkillType.MAGIC, 510, 140, "INT*5.1")]
        }
    }
};

export const getAfricaBossByLocation = (nation: string, city: string): BossData | null => {
    if (AFRICA_BOSSES[nation] && AFRICA_BOSSES[nation][city]) {
        return AFRICA_BOSSES[nation][city];
    }
    return null;
};
