
import { ClassTier, SkillType, ItemRarity, Skill, SkillTarget, Item } from './types';
import { BossData } from './bossMonsters';

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

    export const EUROPE_BOSSES: Record<string, Record<string, BossData>> = {
    "영국": {
        "런던": {
            id:"boss_london",
            name: "아서왕의 망령",
            title: "버려진 원탁의 주인",
            shinryokuType: "광휘계",
            description: "안개 자욱한 런던탑 지하에서 깨어난 고대 왕의 영혼입니다.",
            specialLoot: "엑스칼리버의 파편",
            detailedLoot: {
                name: "엑스칼리버의 파편",
                type: "Weapon",
                weaponType: "Sword",
                rarity: ItemRarity.LEGENDARY,
                description: "부러졌음에도 불구하고 신성한 빛을 내뿜는 성검의 조각.",
                stats: { str: 250, wis: 150 },
                secondaryOptions: ["STR +40%", "물리 공격력 +25%", "광휘계 속성 부여","광휘계 속성 피해 +20%"],
                enhancement: 0,
                imageUrl:"https://i.ibb.co/nqsm9HRp/Gemini-Generated-Image-ei60vcei60vcei60.png"
            },
            visualUrl: "https://i.ibb.co/TDbyrbL5/Kakao-Talk-20260101-111900935-19.png",
            level: 510,
            skills: [createBossSkill("진·엑스칼리버", "[부가 효과: 소멸] 극대 광선입니다.", SkillType.MAGIC, 600, 150, "INT*6.0")]
        },
        "맨체스터": {
            id:"boss_manchester",
            name: "스팀 코어 골렘",
            title: "산업의 유산",
            shinryokuType: "강철계",
            description: "폐쇄된 공장의 거대 엔진들이 스스로 조립되어 탄생한 강철 괴수입니다.",
            specialLoot: "강철의 피스톤",
            detailedLoot: {
                name: "강철의 피스톤",
                type: "Weapon",
                weaponType: "Blunt",
                rarity: ItemRarity.UNIQUE,
                description: "엄청난 증기압을 견디도록 제작된 기계 둔기.",
                stats: { str: 240, def: 60 },
                secondaryOptions: ["STR +30%", "물리 공격력 +12%", "강철계 속성 부여"],
                enhancement: 0,
                imageUrl:"https://i.ibb.co/spZ43w9H/Gemini-Generated-Image-fse804fse804fse8.png"
            },
            visualUrl: "https://i.ibb.co/3mYqT6p3/Gemini-Generated-Image-jybi9yjybi9yjybi.png",
            level: 450,
            skills: [createBossSkill("오버히트 해머", "[부가 효과: 화상] 가열된 팔로 타격합니다.", SkillType.PHYSICAL, 550, 110, "STR*5.5")]
        },
        "에든버러": {
            id:"boss_edenburur",
            name: "하이랜드 밴시",
            title: "비탄의 가객",
            shinryokuType: "월광계",
            description: "성벽 너머에서 들려오는 울음소리의 주인입니다.",
            specialLoot: "밴시의 눈물석",
            detailedLoot: {
                name: "밴시의 눈물석",
                type: "Accessory",
                rarity: ItemRarity.UNIQUE,
                description: "얼어붙은 슬픔이 결정화된 보석.",
                stats: { int: 200, wis: 80 },
                secondaryOptions: ["INT +25%", "월광계 속성 저항 +20%", "상태이상 저항 +15%"],
                enhancement: 0,
                imageUrl:"https://i.ibb.co/gFhcqKVs/Gemini-Generated-Image-lvqfdxlvqfdxlvqf.png"
            },
            visualUrl: "https://i.ibb.co/60z81M5c/Gemini-Generated-Image-ev8mzgev8mzgev8m.png",
            level: 460,
            skills: [createBossSkill("죽음의 아리아", "[부가 효과: 공포] 영혼을 꿰뚫는 비명입니다.", SkillType.MAGIC, 500, 130, "INT*5.0")]
        },
        "리버풀": {
            id:"boss_liverpool",
            name: "비틀즈 고스트",
            title: "리듬의 망령",
            shinryokuType: "질풍계",
            description: "항구 도시의 소음과 음악이 뒤섞여 만들어진 영체입니다.",
            specialLoot: "사이키델릭 보주",
            detailedLoot: {
                name: "사이키델릭 보주",
                type: "SubWeapon",
                weaponType: "Orb",
                rarity: ItemRarity.UNIQUE,
                description: "환각적인 빛을 내뿜는 마력 구슬.",
                stats: { int: 190, agi: 90 },
                secondaryOptions: ["AGI +25%", "치명타율 +10%", "질풍계 속성 피해 +20%"],
                enhancement: 0,
                imageUrl:"https://i.ibb.co/MxxPwYwp/Gemini-Generated-Image-biii9nbiii9nbiii.png"
            },
            visualUrl: "https://i.ibb.co/ycKXFH7P/Gemini-Generated-Image-qamd11qamd11qamd.png",
            level: 440,
            skills: [createBossSkill("환각의 멜로디", "[부가 효과: 혼란] 적의 정신을 뒤흔듭니다.", SkillType.MAGIC, 400, 100, "INT*4.0")]
        }
    },
    "프랑스": {
        "파리": {
            id:"boss_paris",
            name: "카타콤의 지배자 레미",
            title: "백골의 예술가",
            shinryokuType: "암흑계",
            description: "파리 지하 카타콤의 무수한 유골들을 조종하는 사령술사입니다.",
            specialLoot: "예술가의 사령 지팡이",
            detailedLoot: {
                name: "예술가의 사령 지팡이",
                type: "Weapon",
                weaponType: "Staff",
                rarity: ItemRarity.LEGENDARY,
                description: "수많은 영혼의 통곡이 깃든 검은 나무 지팡이.",
                stats: { int: 250, wis: 160 },
                secondaryOptions: ["INT +35%", "마법 공격력 +15%", "암흑계 속성 부여","최종 능력치 +15%"],
                enhancement: 0,
                imageUrl:"https://i.ibb.co/mCgYMj2X/Gemini-Generated-Image-u8k006u8k006u8k0.png"
            },
            visualUrl: "https://i.ibb.co/23dpKhLc/Kakao-Talk-20260101-111900935-18.png",
            level: 510,
            skills: [createBossSkill("영혼의 소나타", "[부가 효과: 공포] 영혼을 찢는 연주입니다.", SkillType.MAGIC, 500, 120, "INT*5.0")]
        },
        "마르세유": {
            id:"boss_marselil",
            name: "지중해의 세이렌 퀸",
            title: "침몰의 가희",
            shinryokuType: "해수계",
            description: "푸른 바다 아래 거대 산호초 성에 거주하는 인어들의 여왕입니다.",
            specialLoot: "여왕의 산호 왕관",
            detailedLoot: {
                name: "여왕의 산호 왕관",
                type: "Head",
                rarity: ItemRarity.UNIQUE,
                description: "깊은 바다의 마력이 깃든 산호 왕관.",
                stats: { wis: 220, def: 50 },
                secondaryOptions: ["WIS +30%", "해수계 속성 저항 +25%", "상태이상 저항 +12%"],
                enhancement: 0,
                imageUrl:"https://i.ibb.co/QvKktQQg/Gemini-Generated-Image-z53nzpz53nzpz53n.png"
            },
            visualUrl: "https://i.ibb.co/BH4cd4NN/Gemini-Generated-Image-mmjri4mmjri4mmjr.png",
            level: 460,
            skills: [createBossSkill("해신의 해일", "[부가 효과: 빙결] 차가운 심해의 파도를 소환합니다.", SkillType.MAGIC, 520, 130, "INT*5.2")]
        },
        "리옹": {
            id:"boss_lion",
            name: "미식의 지배자 가스트로",
            title: "탐욕의 요리사",
            shinryokuType: "화염계",
            description: "모든 것을 요리하려 드는 거대한 마족 요리사입니다.",
            specialLoot: "거대 도살용 칼",
            detailedLoot: {
                name: "거대 도살용 칼",
                type: "Weapon",
                weaponType: "Axe",
                rarity: ItemRarity.UNIQUE,
                description: "무엇이든 단숨에 베어버리는 무거운 칼.",
                stats: { str: 245, def: 40 },
                secondaryOptions: ["STR +28%", "물리 공격력 +15%", "화염계 속성 부여"],
                enhancement: 0,
                imageUrl:"https://i.ibb.co/fV2F2yM0/Gemini-Generated-Image-csnfh1csnfh1csnf.png"
            },
            visualUrl: "https://i.ibb.co/cKR1smjG/Gemini-Generated-Image-qi8am7qi8am7qi8a.png",
            level: 450,
            skills: [createBossSkill("화염 스테이크", "[부가 효과: 화상] 뜨거운 화염으로 적을 굽습니다.", SkillType.PHYSICAL, 480, 100, "STR*4.8")]
        },
        "니스": {
            id:"boss_nice",
            name: "리비에라의 환영",
            title: "태양의 암살자",
            shinryokuType: "태양계",
            description: "휴양지의 눈부신 햇살 속에서 나타나는 신비로운 살수입니다.",
            specialLoot: "태양의 눈멀이 레이피어",
            detailedLoot: {
                name: "태양의 레이피어",
                type: "Weapon",
                weaponType: "Sword",
                rarity: ItemRarity.UNIQUE,
                description: "빛의 속도로 찌르는 날카로운 세검.",
                stats: { str: 180, agi: 140 },
                secondaryOptions: ["AGI +35%", "치명타율 +12%", "태양계 속성 부여"],
                enhancement: 0,
                imageUrl:"https://i.ibb.co/93GFMZZX/Gemini-Generated-Image-wkt11bwkt11bwkt1.png"
            },
            visualUrl: "https://i.ibb.co/RGPT8PV0/Gemini-Generated-Image-b72a4tb72a4tb72a.png",
            level: 440,
            skills: [createBossSkill("솔라 스트라이크", "[부가 효과: 소멸] 눈부신 일격을 가합니다.", SkillType.PHYSICAL, 510, 110, "AGI*5.1")]
        }
    },
    "독일": {
        "베를린": {
            id:"boss_berlin",
            name: "강철의 황제 비스마르크",
            title: "연금술 공학의 정점",
            shinryokuType: "강철계",
            description: "독일의 기계 공학과 연금술이 결합되어 탄생한 거대 증기 로봇입니다.",
            specialLoot: "초고밀도 강철 엔진",
            detailedLoot: {
                name: "초고밀도 강철 엔진",
                type: "Accessory",
                rarity: ItemRarity.LEGENDARY,
                description: "무한한 증기 압력을 생성하는 소형 엔진.",
                stats: { str: 180, def: 220, ctrl: 160 },
                secondaryOptions: ["STR +35%", "모든 능력치 +12%", "강철계 속성 저항 +20%","DEF +25%"],
                enhancement: 0,
                imageUrl:"https://i.ibb.co/NgB9GKTP/Gemini-Generated-Image-nmmx7lnmmx7lnmmx.png"
            },
            visualUrl: "https://i.ibb.co/tTr88MJ1/Kakao-Talk-20260101-111900935-17.png",
            level: 510,
            skills: [createBossSkill("제국의 뇌격", "[부가 효과: 감전] 번개를 방출합니다.", SkillType.MAGIC, 450, 130, "INT*4.5")]
        },
        "뮌헨": {
            id:"boss_munchen",
            name: "슈바르츠발트의 늑대왕",
            title: "검은 숲의 진조",
            shinryokuType: "신체강화계",
            description: "독일 남부 검은 숲을 지배하는 거대한 늑대인간입니다.",
            specialLoot: "늑대왕의 찢겨진 발톱",
            detailedLoot: {
                name: "늑대왕의 찢겨진 발톱",
                type: "Weapon",
                weaponType: "Knuckle",
                rarity: ItemRarity.UNIQUE,
                description: "강철보다 단단하고 예리한 늑대왕의 발톱.",
                stats: { str: 210, agi: 90 },
                secondaryOptions: ["STR +28%", "물리 공격력 +12%", "치명타율 +12%"],
                enhancement: 0,
                imageUrl:"https://i.ibb.co/Zz7F9S7n/Gemini-Generated-Image-qp9ebxqp9ebxqp9e.png"
            },
            visualUrl: "https://i.ibb.co/hxkWK4zT/Gemini-Generated-Image-lla9v0lla9v0lla9.png",
            level: 470,
            skills: [createBossSkill("달밤의 난무", "[부가 효과: 출혈] 대상을 난도질합니다.", SkillType.PHYSICAL, 700, 90, "AGI*7.0")]
        },
        "프랑크푸르트": {
            id:"boss_frankfruit",
            name: "유로의 골렘",
            title: "자본의 거신",
            shinryokuType: "대지계",
            description: "은행가의 탐욕과 대지의 금속이 뭉쳐 만들어진 황금 골렘입니다.",
            specialLoot: "황금 통화 주머니",
            detailedLoot: {
                name: "황금 통화 주머니",
                type: "Accessory",
                rarity: ItemRarity.UNIQUE,
                description: "무한히 금화를 쏟아내는 마법의 주머니.",
                stats: { wis: 200, def: 80 },
                secondaryOptions: ["WIS +30%", "물리 방어력 +15%", "상태이상 저항 +10%"],
                enhancement: 0,
                imageUrl:"https://i.ibb.co/MxWjFxz5/Gemini-Generated-Image-l6ehc3l6ehc3l6eh.png"
            },
            visualUrl: "https://i.ibb.co/HLcT8QdL/Gemini-Generated-Image-uww5g8uww5g8uww5.png",
            level: 460,
            skills: [createBossSkill("자본의 압박", "[부가 효과: 속박] 황금의 무게로 짓누릅니다.", SkillType.PHYSICAL, 440, 100, "STR*4.4")]
        },
        "함부르크": {
            id:"boss_hamburg",
            name: "엘베 강의 히드라",
            title: "항구의 포식자",
            shinryokuType: "해수계",
            description: "강과 바다가 만나는 곳에 도사리는 머리 셋 달린 수룡입니다.",
            specialLoot: "히드라의 비늘 방패",
            detailedLoot: {
                name: "히드라의 비늘 방패",
                type: "SubWeapon",
                weaponType: "Shield",
                rarity: ItemRarity.UNIQUE,
                description: "강력한 재생력을 가진 방패.",
                stats: { def: 230, wis: 40 },
                secondaryOptions: ["DEF +35%", "마법 방어력 +15%", "해수계 속성 저항 +20%"],
                enhancement: 0,
                imageUrl:"https://i.ibb.co/VcfcMG7w/Gemini-Generated-Image-k9dg8ek9dg8ek9dg.png"
            },
            visualUrl: "https://i.ibb.co/11R29Cf/Gemini-Generated-Image-wgtizfwgtizfwgti.png",
            level: 450,
            skills: [createBossSkill("부식성 점액", "[부가 효과: 파열] 방어구를 녹여버립니다.", SkillType.DEBUFF, 0, 90, "P.Def -50%")]
        }
    },
    "이탈리아": {
        "로마": {
            id:"boss_rome",
            name: "콜로세움의 대장군",
            title: "영원한 검투사",
            shinryokuType: "신체강화계",
            description: "전설의 검투사가 신력으로 되살아났습니다.",
            specialLoot: "대장군의 붉은 망토",
            detailedLoot: {
                name: "대장군의 붉은 망토",
                type: "Body",
                rarity: ItemRarity.LEGENDARY,
                description: "전장의 피로 물든 듯한 붉은 망토.",
                stats: { def: 220, str: 170, agi: 150 },
                secondaryOptions: ["STR +40%", "물리 공격력 +25%", "모든 능력치 +15%","AGI +20%"],
                enhancement: 0,
                imageUrl:"https://i.ibb.co/SwwZFLzk/Gemini-Generated-Image-xmcj0cxmcj0cxmcj.png"
            },
            visualUrl: "https://i.ibb.co/MkxKDzjm/Kakao-Talk-20260101-111900935-16.png",
            level: 510,
            skills: [createBossSkill("그라디우스의 일격", "[부가 효과: 출혈] 정밀한 찌르기입니다.", SkillType.PHYSICAL, 700, 90, "STR*7.0")]
        },
        "밀라노": {
            id:"boss_milano",
            name: "패션의 망령",
            title: "실크의 암살자",
            shinryokuType: "질풍계",
            description: "보이지 않는 실을 이용해 대상을 포박하는 기괴한 영체입니다.",
            specialLoot: "절대자의 실크 머플러",
            detailedLoot: {
                name: "실크 머플러",
                type: "Accessory",
                rarity: ItemRarity.UNIQUE,
                description: "바람을 타고 움직이게 해주는 부드러운 머플러.",
                stats: { agi: 230, ctrl: 50 },
                secondaryOptions: ["AGI +30%", "치명타율 +12%", "질풍계 속성 피해 +20%"],
                enhancement: 0,
                imageUrl:"https://i.ibb.co/FkgPzmfp/Gemini-Generated-Image-j88wrkj88wrkj88w.png"
            },
            visualUrl: "https://i.ibb.co/rK6nsfWM/Gemini-Generated-Image-o382r9o382r9o382.png",
            level: 460,
            skills: [createBossSkill("강철 실 바인드", "[부가 효과: 속박] 적을 꽁꽁 묶어버립니다.", SkillType.DEBUFF, 0, 80, "AGI -60%")]
        },
        "베네치아": {
            id:"boss_benechia",
            name: "수로의 군주 히드라",
            title: "베니스의 악몽",
            shinryokuType: "해수계",
            description: "베네치아 수로 깊은 곳에서 자라난 거대 수룡입니다.",
            specialLoot: "수로의 보주",
            detailedLoot: {
                name: "수로의 보주",
                type: "SubWeapon",
                weaponType: "Orb",
                rarity: ItemRarity.UNIQUE,
                description: "물의 힘을 제어하는 푸른 보주.",
                stats: { int: 210, wis: 80 },
                secondaryOptions: ["INT +28%", "해수계 속성 피해 +25%", "마법 공격력 +24%"],
                enhancement: 0,
                imageUrl:"https://i.ibb.co/ksKg6QCf/Gemini-Generated-Image-w875orw875orw875.png"
            },
            visualUrl: "https://i.ibb.co/Y7pRR6zF/Gemini-Generated-Image-n7kuein7kuein7ku.png",
            level: 450,
            skills: [createBossSkill("아홉 머리 일제사격", "물줄기를 뿜어 광역 피해를 입힙니다.", SkillType.MAGIC, 450, 90, "INT*4.5")]
        },
        "나폴리": {
            id:"boss_napoli",
            name: "베수비오의 화염정령",
            title: "폭발하는 분노",
            shinryokuType: "화염계",
            description: "화산의 열기가 응축되어 탄생한 파괴의 정령입니다.",
            specialLoot: "용암 깃든 대포",
            detailedLoot: {
                name: "용암 대포",
                type: "Weapon",
                weaponType: "Heavy",
                rarity: ItemRarity.UNIQUE,
                description: "용암을 탄환으로 쏘아보내는 거대 화기.",
                stats: { str: 200, int: 100 },
                secondaryOptions: ["STR +25%", "물리 공격력 +20%", "화염계 속성 부여"],
                enhancement: 0,
                imageUrl:"https://i.ibb.co/XNWKwWS/Gemini-Generated-Image-10jlgg10jlgg10jl.png"
            },
            visualUrl: "https://i.ibb.co/wNf5wqJH/Gemini-Generated-Image-hoh4smhoh4smhoh4.png",
            level: 470,
            skills: [createBossSkill("볼카닉 익스플로전", "[부가 효과: 화상] 거대한 폭발을 일으킵니다.", SkillType.MAGIC, 550, 140, "INT*5.5")]
        },
        "피렌체": {
            id:"boss_firenche",
            name: "르네상스의 조각상",
            title: "다비드의 분노",
            shinryokuType: "대지계",
            description: "천재 예술가의 혼이 깃들어 움직이기 시작한 완벽한 비율의 석상입니다.",
            specialLoot: "대리석 파쇄 해머",
            detailedLoot: {
                name: "다비드의 해머",
                type: "Weapon",
                weaponType: "Blunt",
                rarity: ItemRarity.UNIQUE,
                description: "예술적인 파괴력을 지닌 석제 해머.",
                stats: { str: 260, def: 80 },
                secondaryOptions: ["STR +40%", "물리 공격력 +15%", "대지계 속성 부여"],
                enhancement: 0,
                imageUrl:"https://i.ibb.co/DDKqq7m0/Gemini-Generated-Image-7149yl7149yl7149.png"
            },
            visualUrl: "https://i.ibb.co/MXzHhN3/Gemini-Generated-Image-mxdx01mxdx01mxdx.png",
            level: 450,
            skills: [createBossSkill("완벽한 타격", "적의 급소를 정확히 가격합니다.", SkillType.PHYSICAL, 600, 100, "STR*6.0", 'single')]
        }
    },
    "스페인": {
        "마드리드": {
            id:"boss_madrid",
            name: "대심문관 토르케마다",
            title: "죄악의 심판자",
            shinryokuType: "화염계",
            description: "죄인을 태우는 불꽃으로 전장을 정화하려 합니다.",
            specialLoot: "심판관의 타오르는 성서",
            detailedLoot: {
                name: "심판관의 타오르는 성서",
                type: "SubWeapon",
                weaponType: "Grimoire",
                rarity: ItemRarity.LEGENDARY,
                description: "죄악을 태우는 화염의 문자가 새겨진 성서.",
                stats: { int: 220, wis: 190 },
                secondaryOptions: ["INT +35%", "마법 공격력 +28%", "화염계 속성 부여","화염계 속성 피해 +25%"],
                enhancement: 0,
                imageUrl:"https://i.ibb.co/Wpjw3t3c/Gemini-Generated-Image-4ak4kd4ak4kd4ak4.png"
            },
            visualUrl: "https://i.ibb.co/whHNxShJ/Kakao-Talk-20260101-111900935-15.png",
            level: 500,
            skills: [createBossSkill("이단 정화의 불꽃", "[부가 효과: 화상] 거대한 불기둥을 소환합니다.", SkillType.MAGIC, 550, 130, "INT*5.5")]
        },
        "바르셀로나": {
            id:"boss_barchelona",
            name: "구엘의 바실리스크",
            title: "석화의 가디언",
            shinryokuType: "대지계",
            description: "눈을 마주치는 것만으로도 몸이 굳어버립니다.",
            specialLoot: "오색 빛깔 바실리스크 안구",
            detailedLoot: {
                name: "바실리스크 안구",
                type: "Accessory",
                rarity: ItemRarity.UNIQUE,
                description: "기괴하게 아름다운 빛을 내뿜는 괴수의 눈.",
                stats: { agi: 190, ctrl: 210 },
                secondaryOptions: ["CTRL +30%", "상태이상 저항 +20%", "대지계 속성 피해 +25%"],
                enhancement: 0,
                imageUrl:"https://i.ibb.co/4gWgFRc6/Gemini-Generated-Image-r2ggnfr2ggnfr2gg.png"
            },
            visualUrl: "https://i.ibb.co/pBGZS4qc/Gemini-Generated-Image-4b8nkh4b8nkh4b8n.png",
            level: 460,
            skills: [createBossSkill("석화의 시선", "[부가 효과: 속박] 적 전체를 돌로 만듭니다.", SkillType.DEBUFF, 0, 150, "Stun(1T)")]
        },
        "세비야": {
            id:"boss_sevilla",
            name: "투우사의 원혼",
            title: "피의 아레나",
            shinryokuType: "신체강화계",
            description: "쓰러지지 않는 투지로 적을 몰아붙이는 투우사 유령입니다.",
            specialLoot: "붉은 투지의 망토",
            detailedLoot: {
                name: "카포테 망토",
                type: "Body",
                rarity: ItemRarity.UNIQUE,
                description: "적을 도발하고 능력을 흡수하는 붉은 천.",
                stats: { def: 200, agi: 80, str: 60 },
                secondaryOptions: ["AGI +25%", "물리 방어력 +22%", "모든 능력치 +15%"],
                enhancement: 0,
                imageUrl:"https://i.ibb.co/C4MNxXL/Gemini-Generated-Image-c5nuoxc5nuoxc5nu.png"
            },
            visualUrl: "https://i.ibb.co/L4d6JWJ/Gemini-Generated-Image-7gm0w67gm0w67gm0.png",
            level: 450,
            skills: [createBossSkill("최후의 일격", "황소를 베듯 적의 중심을 꿰뚫습니다.", SkillType.PHYSICAL, 580, 110, "STR*5.8", 'single')]
        },
        "발렌시아": {
            id:"boss_valencia",
            name: "오렌지 정령룡",
            title: "지중해의 풍요",
            shinryokuType: "초화계",
            description: "풍요로운 대지에서 자라난 상큼하지만 파괴적인 비늘을 가진 용입니다.",
            specialLoot: "대지의 결실 오브",
            detailedLoot: {
                name: "골든 오렌지 오브",
                type: "SubWeapon",
                weaponType: "Orb",
                rarity: ItemRarity.UNIQUE,
                description: "풍요의 기운이 깃든 황금색 보주.",
                stats: { wis: 230, int: 70 },
                secondaryOptions: ["WIS +35%", "모든 능력치 +10%", "초화계 속성 피해 +25%"],
                enhancement: 0,
                imageUrl:"https://i.ibb.co/NgHnd0MD/Gemini-Generated-Image-qf107eqf107eqf10.png"
            },
            visualUrl: "https://i.ibb.co/7JK18dB2/Gemini-Generated-Image-6iqjs06iqjs06iqj.png",
            level: 440,
            skills: [createBossSkill("대지의 숨결", "치유와 공격을 동시에 행합니다.", SkillType.MAGIC, 400, 120, "WIS*4.0")]
        }
    },
    "러시아": {
        "모스크바": {
            id:"boss_moskba",
            name: "동토의 군주 볼코프",
            title: "북극성의 심판자",
            shinryokuType: "빙결계",
            description: "그가 걸을 때마다 발밑의 대지가 얼어붙습니다.",
            specialLoot: "영구동토의 부츠",
            detailedLoot: {
                name: "영구동토의 부츠",
                type: "Feet",
                rarity: ItemRarity.LEGENDARY,
                description: "절대 녹지 않는 얼음으로 만들어진 장화.",
                stats: { def: 190, agi: 150, wis: 180 },
                secondaryOptions: ["DEF +50%", "물리 방어력 +20%", "빙결계 속성 저항 +25%","최종 능력치 +15%"],
                enhancement: 0,
                imageUrl:"https://i.ibb.co/TqbVxxJv/Gemini-Generated-Image-xk6ldrxk6ldrxk6l.png"
            },
            visualUrl: "https://i.ibb.co/hxvCKR3z/Kakao-Talk-20260101-111900935-14.png",
            level: 520,
            skills: [createBossSkill("절대영도", "[부가 효과: 빙결] 전장을 혹한으로 덮습니다.", SkillType.MAGIC, 520, 150, "INT*5.2")]
        },
        "상트페테르부르크": {
            id:"boss_sangtpeterburg",
            name: "네바 강의 수수께끼",
            title: "얼음 밑의 포식자",
            shinryokuType: "해수계",
            description: "네바 강의 차가운 물속에 숨어 도시를 위협하는 거대 괴수입니다.",
            specialLoot: "네바의 차가운 정수",
            detailedLoot: {
                name: "차가운 강물의 보주",
                type: "SubWeapon",
                weaponType: "Orb",
                rarity: ItemRarity.UNIQUE,
                description: "강물의 차가운 기운을 담은 파란색 구슬.",
                stats: { int: 240, wis: 60 },
                secondaryOptions: ["INT +35%", "마법 공격력 +15%", "해수계 속성 피해 +25%"],
                enhancement: 0,
                imageUrl:"https://i.ibb.co/xqXMkRwm/Gemini-Generated-Image-hohnlahohnlahohn.png"
            },
            visualUrl: "https://i.ibb.co/pB3PqjM1/Gemini-Generated-Image-f5mfmxf5mfmxf5mf.png",
            level: 480,
            skills: [createBossSkill("심연의 침식", "[부가 효과: 속박] 적의 행동을 제약합니다.", SkillType.MAGIC, 480, 110, "INT*4.8")]
        },
        "노보시비르스크": {
            id:"boss_novosivir",
            name: "시베리아 가디언",
            title: "툰드라의 철벽",
            shinryokuType: "대지계",
            description: "얼어붙은 툰드라 대지를 수호하는 거대한 바위 인간입니다.",
            specialLoot: "툰드라의 단단한 피부",
            detailedLoot: {
                name: "툰드라 가디언 메일",
                type: "Body",
                rarity: ItemRarity.UNIQUE,
                description: "영하의 온도에서도 유연성을 유지하는 강력한 갑옷.",
                stats: { def: 280, hp: 1500 },
                secondaryOptions: ["DEF +45%", "물리 방어력 +15%", "대지계 속성 저항 +25%"],
                enhancement: 0,
                imageUrl:"https://i.ibb.co/HDG84VVC/Gemini-Generated-Image-s5fw6qs5fw6qs5fw.png"
            },
            visualUrl: "https://i.ibb.co/8nxzcRvp/Gemini-Generated-Image-71jprp71jprp71jp.png",
            level: 470,
            skills: [createBossSkill("대지 분쇄", "[부가 효과: 파열] 지면을 파괴하여 충격을 줍니다.", SkillType.PHYSICAL, 520, 130, "STR*5.2")]
        }
    },
    "스웨덴": {
        "스톡홀름": {
            id:"boss_stokholm",
            name: "바이킹 바나디스",
            title: "발할라의 선구자",
            shinryokuType: "빙결계",
            description: "얼어붙은 방패로 전장을 지배하는 전설적인 여전사입니다.",
            specialLoot: "발키리의 얼음 투구",
            detailedLoot: {
                name: "발키리의 얼음 투구",
                type: "Head",
                rarity: ItemRarity.LEGENDARY,
                description: "혹한의 정기가 서린 고대 바이킹의 투구.",
                stats: { def: 200, wis: 180, ctrl: 160 },
                secondaryOptions: ["DEF +40%", "상태이상 저항 +20%", "빙결계 속성 저항 +25%","모든 능력치 +15%"],
                enhancement: 0,
                imageUrl:"https://i.ibb.co/FpKhBZm/Gemini-Generated-Image-6njg526njg526njg.png"
            },
            visualUrl: "https://i.ibb.co/My0Tp2n1/Kakao-Talk-20260101-111900935-13.png",
            level: 500,
            skills: [createBossSkill("발할라의 한기", "[부가 효과: 빙결] 신성한 서리를 내립니다.", SkillType.MAGIC, 450, 120, "INT*4.5")]
        },
        "예테보리": {
            id:"boss_yetebori",
            name: "북해의 지배자 욘",
            title: "폭풍의 항해사",
            shinryokuType: "질풍계",
            description: "거친 북해의 바람을 부리는 전설적인 선장 망령입니다.",
            specialLoot: "항해사의 폭풍 레이피어",
            detailedLoot: {
                name: "폭풍의 레이피어",
                type: "Weapon",
                weaponType: "Sword",
                rarity: ItemRarity.UNIQUE,
                description: "바람의 속도가 담긴 치명적인 칼날.",
                stats: { str: 190, agi: 160 },
                secondaryOptions: ["AGI +40%", "물리 공격력 +15%", "질풍계 속성 부여"],
                enhancement: 0,
                imageUrl:"https://i.ibb.co/7tRBc8H6/Gemini-Generated-Image-hx4n1hhx4n1hhx4n.png"
            },
            visualUrl: "https://i.ibb.co/q39kTvW5/Gemini-Generated-Image-17kenz17kenz17ke.png",
            level: 440,
            skills: [createBossSkill("폭풍 가르기", "[부가 효과: 출혈] 눈에 보이지 않는 속도로 벱니다.", SkillType.PHYSICAL, 520, 110, "AGI*5.2")]
        },
        "말뫼": {
            id:"boss_malmoe",
            name: "에레순드의 골렘",
            title: "다리의 파수꾼",
            shinryokuType: "강철계",
            description: "바다 위에 세워진 거대 다리를 수호하는 강철 거신입니다.",
            specialLoot: "강철의 보 가드",
            detailedLoot: {
                name: "에레순드 가드",
                type: "Hand",
                rarity: ItemRarity.UNIQUE,
                description: "어떤 충격도 흡수하는 강철 팔보호구.",
                stats: { def: 220, str: 60 },
                secondaryOptions: ["DEF +30%", "물리 방어력 +15%", "강철계 속성 저항 +25%"],
                enhancement: 0,
                imageUrl:"https://i.ibb.co/Q3Qpsd90/Gemini-Generated-Image-c6qpjrc6qpjrc6qp.png"
            },
            visualUrl: "https://i.ibb.co/NdWRVNZh/Gemini-Generated-Image-zenp9fzenp9fzenp.png",
            level: 430,
            skills: [createBossSkill("강철의 압박", "[부가 효과: 속박] 대상을 움직이지 못하게 고정합니다.", SkillType.PHYSICAL, 400, 100, "STR*4.0")]
        }
    },
    "노르웨이": {
        "오슬로": {
            id:"boss_oslo",
            name: "피오르드의 용 오딘",
            title: "고대 지혜의 수호자",
            shinryokuType: "광휘계",
            description: "노르웨이의 깊은 협곡에 잠들어 있던 신성한 용입니다.",
            specialLoot: "오딘의 황금 눈",
            detailedLoot: {
                name: "궁니르의 눈",
                type: "Accessory",
                rarity: ItemRarity.LEGENDARY,
                description: "모든 것을 꿰뚫어보는 신의 눈동자.",
                stats: { wis: 300, ctrl: 200 },
                secondaryOptions: ["WIS +50%", "상태이상 저항 +30%", "마법 공격력 +20%","모든 능력치 +20%"],
                enhancement: 0,
                imageUrl:"https://i.ibb.co/h1mXQVbp/Gemini-Generated-Image-y7wdjdy7wdjdy7wd.png"
            },
            visualUrl: "https://i.ibb.co/DfML57NV/Kakao-Talk-20260101-111900935-12.png",
            level: 510,
            skills: [createBossSkill("궁니르의 섬광", "[부가 효과: 소멸] 피할 수 없는 신의 투창입니다.", SkillType.MAGIC, 800, 200, "INT*8.0")]
        },
        "베르겐": {
            id:"boss_wergen",
            name: "안개 속의 트롤 왕",
            title: "산의 지배자",
            shinryokuType: "대지계",
            description: "바위처럼 단단한 피부와 엄청난 괴력을 가진 트롤들의 왕입니다.",
            specialLoot: "트롤 왕의 거대 곤봉",
            detailedLoot: {
                name: "산맥 파쇄기",
                type: "Weapon",
                weaponType: "Blunt",
                rarity: ItemRarity.UNIQUE,
                description: "바위조차 가루로 만드는 무거운 곤봉.",
                stats: { str: 320, agi: 120 },
                secondaryOptions: ["STR +55%", "물리 공격력 +25%", "대지계 속성 부여"],
                enhancement: 0,
                imageUrl:"https://i.ibb.co/rRBrWHCs/Gemini-Generated-Image-pmzrqypmzrqypmzr.png"
            },
            visualUrl: "https://i.ibb.co/rRyFmxvm/Gemini-Generated-Image-ld7epgld7epgld7e.png",
            level: 470,
            skills: [createBossSkill("지진 강타", "[부가 효과: 파열] 지면을 내려쳐 적들을 무력화합니다.", SkillType.PHYSICAL, 550, 120, "STR*5.5")]
        }
    },
    "덴마크": {
        "코펜하겐": {
            id:"boss_kopenhagen",
            name: "인어의 복수자",
            title: "심해의 그림자",
            shinryokuType: "해수계",
            description: "잔혹한 동화의 현실을 보여주는 슬픈 괴물입니다.",
            specialLoot: "인어의 저주받은 진주",
            detailedLoot: {
                name: "심연의 흑진주",
                type: "Accessory",
                rarity: ItemRarity.LEGENDARY,
                description: "아름다움 뒤에 죽음을 숨긴 보석.",
                stats: { int: 250, wis: 200 },
                secondaryOptions: ["INT +35%", "마법 공격력 +15%", "해수계 속성 피해 +25%","모든 능력치 +15%"],
                enhancement: 0,
                imageUrl:"https://i.ibb.co/pjSwSR9D/Gemini-Generated-Image-60x39860x39860x3.png"
            },
            visualUrl: "https://i.ibb.co/Pz93Z8Pc/Kakao-Talk-20260101-111900935-11.png",
            level: 490,
            skills: [createBossSkill("거품의 무덤", "[부가 효과: 속박] 적을 물속에 가두어 질식시킵니다.", SkillType.MAGIC, 500, 140, "INT*5.0")]
        },
        "오르후스": {
            id:"boss_orhus",
            name: "바이킹의 영혼석",
            title: "고대 전사의 복수",
            shinryokuType: "강철계",
            description: "죽지 못한 바이킹들의 혼이 뭉쳐 만들어진 거대 비석입니다.",
            specialLoot: "강철의 문장 방패",
            detailedLoot: {
                name: "오르후스 가디언 쉴드",
                type: "SubWeapon",
                weaponType: "Shield",
                rarity: ItemRarity.UNIQUE,
                description: "바이킹의 긍지가 담긴 단단한 방패.",
                stats: { def: 280, str: 140 },
                secondaryOptions: ["DEF +45%", "물리 방어력 +15%", "상태이상 저항 +10%"],
                enhancement: 0,
                imageUrl:"https://i.ibb.co/G6cNW8R/Gemini-Generated-Image-v0enqtv0enqtv0en.png"
            },
            visualUrl: "https://i.ibb.co/gZYKXqCv/Gemini-Generated-Image-lcmanwlcmanwlcma.png",
            level: 450,
            skills: [createBossSkill("방패 돌격", "전방의 적을 밀쳐내고 충격을 줍니다.", SkillType.PHYSICAL, 400, 80, "DEF*4.0")]
        }
    },
    "핀란드": {
        "헬싱키": {
            id:"boss_helsingkey",
            name: "오로라 위치",
            title: "북극광의 마녀",
            shinryokuType: "월광계",
            description: "밤하늘의 오로라를 마력으로 휘두르는 강력한 마녀입니다.",
            specialLoot: "오로라의 정수 보주",
            detailedLoot: {
                name: "노던 라이트 오브",
                type: "SubWeapon",
                weaponType: "Orb",
                rarity: ItemRarity.LEGENDARY,
                description: "신비로운 빛을 머금은 마법 구슬.",
                stats: { int: 240, wis: 200, ctrl: 160 },
                secondaryOptions: ["INT +35%", "마법 공격력 +15%", "월광계 속성 저항 +25%","모든 능력치 +20%"],
                enhancement: 0,
                imageUrl:"https://i.ibb.co/Jwr2CmSj/Gemini-Generated-Image-aw9ffaw9ffaw9ffa.png"
            },
            visualUrl: "https://i.ibb.co/k6gzr09p/Kakao-Talk-20260101-111900935-10.png",
            level: 500,
            skills: [createBossSkill("커튼 오브 라이트", "환상적인 빛으로 마법 피해를 줍니다.", SkillType.MAGIC, 600, 150, "INT*6.0")]
        },
        "에스포": {
            id:"boss_espo",
            name: "숲의 감시자 타피오",
            title: "자연의 파수꾼",
            shinryokuType: "초화계",
            description: "수천 년 된 거목의 영혼이 깃든 고대 정령입니다.",
            specialLoot: "세계수 가지 스태프",
            detailedLoot: {
                name: "타피오의 지팡이",
                type: "Weapon",
                weaponType: "Staff",
                rarity: ItemRarity.UNIQUE,
                description: "자연의 생명력을 다스리는 나무 지팡이.",
                stats: { wis: 260, int: 80 },
                secondaryOptions: ["WIS +40%", "마법 방어력 +15%", "초화계 속성 부여"],
                enhancement: 0,
                imageUrl:"https://i.ibb.co/WXx10WC/Gemini-Generated-Image-le0kg9le0kg9le0k.png"
            },
            visualUrl: "https://i.ibb.co/LzNC3Dg0/Gemini-Generated-Image-ufhypsufhypsufhy.png",
            level: 460,
            skills: [createBossSkill("뿌리의 구속", "[부가 효과: 속박] 대지를 이용해 적을 묶습니다.", SkillType.MAGIC, 420, 100, "WIS*4.2")]
        }
    },
    "폴란드": {
        "바르샤바": {
            id:"boss_barcaba",
            name: "윙드 후사르 가디언",
            title: "강철의 수호 기사",
            shinryokuType: "강철계",
            description: "영광스러운 기사도가 깃든 거대 강철 석상입니다.",
            specialLoot: "후사르의 강철 날개",
            detailedLoot: {
                name: "은빛 후사르 아머",
                type: "Body",
                rarity: ItemRarity.LEGENDARY,
                description: "적의 기선을 제압하는 위엄 있는 날개 장식 갑옷.",
                stats: { def: 300, agi: 100, str: 100 },
                secondaryOptions: ["DEF +50%", "물리 공격력 +15%", "모든 능력치 +15%","물리 방어력 +20%"],
                enhancement: 0,
                imageUrl:"https://i.ibb.co/4ZHcNLj9/Gemini-Generated-Image-5vttkj5vttkj5vtt.png"
            },
            visualUrl: "https://i.ibb.co/qLN078D7/Kakao-Talk-20260101-111900935-09.png",
            level: 500,
            skills: [createBossSkill("강철 돌격", "[부가 효과: 파열] 적의 방어선을 분쇄합니다.", SkillType.PHYSICAL, 580, 130, "STR*5.8")]
        },
        "크라쿠프": {
            id:"boss_crakup",
            name: "바벨의 드래곤",
            title: "고성의 약탈자",
            shinryokuType: "화염계",
            description: "과거 왕성을 공포로 몰아넣었던 불을 뿜는 용입니다.",
            specialLoot: "용의 비늘 단검",
            detailedLoot: {
                name: "바벨의 송곳니",
                type: "Weapon",
                weaponType: "Sword",
                rarity: ItemRarity.UNIQUE,
                description: "용의 이빨을 깎아 만든 예리한 단검.",
                stats: { str: 189, agi: 150 },
                secondaryOptions: ["AGI +35%", "치명타율 +15%", "화염계 속성 부여"],
                enhancement: 0,
                imageUrl:"https://i.ibb.co/fYZGL88v/Gemini-Generated-Image-v8ozzvv8ozzvv8oz.png"
            },
            visualUrl: "https://i.ibb.co/N2cNFj9d/Gemini-Generated-Image-k5ie3gk5ie3gk5ie.png",
            level: 480,
            skills: [createBossSkill("드래곤 브레스", "[부가 효과: 화상] 모든 것을 태워버립니다.", SkillType.MAGIC, 520, 140, "INT*5.2")]
        }
    },
    "우크라이나": {
        "키이우": {
            id:"boss_keiu",
            name: "코사크 파이어 스피릿",
            title: "자유의 불꽃",
            shinryokuType: "태양계",
            description: "우크라이나 대평원의 투지가 화신이 된 태양의 정령입니다.",
            specialLoot: "해바라기 태양 방패",
            detailedLoot: {
                name: "태양의 방패",
                type: "SubWeapon",
                weaponType: "Shield",
                rarity: ItemRarity.LEGENDARY,
                description: "태양의 열기를 반사하는 황금빛 방패.",
                stats: { def: 320, ctrl: 200 },
                secondaryOptions: ["DEF +55%", "상태이상 저항 +25%", "태양계 속성 저항 +25%","모든 능력치 +20%"],
                enhancement: 0,
                imageUrl:"https://i.ibb.co/zHjF4D2M/Gemini-Generated-Image-gbgf2qgbgf2qgbgf.png"
            },
            visualUrl: "https://i.ibb.co/hJnJwc27/Gemini-Generated-Image-6ksre66ksre66ksr.png",
            level: 510,
            skills: [createBossSkill("솔라 스트라이크", "[부가 효과: 화상] 태양 광선을 폭발시킵니다.", SkillType.MAGIC, 600, 160, "INT*6.0")]
        },
        "하르키우": {
            id:"boss_harkiu",
            name: "철의 해바라기",
            title: "대지의 가디언",
            shinryokuType: "강철계",
            description: "꽃의 형상을 하고 있지만 전신이 강철로 이루어진 파괴 병기입니다.",
            specialLoot: "강철 꽃잎 칼날",
            detailedLoot: {
                name: "해바라기 블레이드",
                type: "Weapon",
                weaponType: "Sword",
                rarity: ItemRarity.UNIQUE,
                description: "아름답지만 치명적인 강철 꽃잎 모양의 칼.",
                stats: { str: 260, def: 60 },
                secondaryOptions: ["STR +40%", "물리 공격력 +15%", "강철계 속성 부여"],
                enhancement: 0,
                imageUrl:"https://i.ibb.co/5hPPhHCy/Gemini-Generated-Image-dcqrf1dcqrf1dcqr.png"
            },
            visualUrl: "https://i.ibb.co/dJXKdcnv/Gemini-Generated-Image-9vi4bq9vi4bq9vi4.png",
            level: 470,
            skills: [createBossSkill("강철의 개화", "사방으로 날카로운 조각을 흩뿌립니다.", SkillType.PHYSICAL, 450, 100, "STR*4.5")]
        }
    },
    "네덜란드": {
        "암스테르담": {
            id:"boss_amsterdam",
            name: "윈드밀 타이탄",
            title: "바람을 가르는 거신",
            shinryokuType: "질풍계",
            description: "풍차의 거대한 날개를 휘두르며 폭풍을 일으키는 거신입니다.",
            specialLoot: "질풍의 톱니바퀴",
            detailedLoot: {
                name: "타이탄의 톱니바퀴",
                type: "Accessory",
                rarity: ItemRarity.LEGENDARY,
                description: "바람의 흐름을 가속하는 신비로운 기어.",
                stats: { agi: 280, ctrl: 200 },
                secondaryOptions: ["AGI +45%", "치명타율 +20%", "질풍계 속성 피해 +20%","물리 공격력 +20%"],
                enhancement: 0,
                imageUrl:"https://i.ibb.co/0jtCJ6Xv/Gemini-Generated-Image-crfdl3crfdl3crfd.png"
            },
            visualUrl: "https://i.ibb.co/6ct9YjNT/Kakao-Talk-20260101-111900935-07.png",
            level: 490,
            skills: [createBossSkill("진공 돌풍", "[부가 효과: 파열] 공기압 충격파를 발생시킵니다.", SkillType.PHYSICAL, 550, 130, "AGI*5.5")]
        },
        "로테르담": {
            id:"boss_roterdam",
            name: "항구의 크라켄",
            title: "심해의 약탈자",
            shinryokuType: "해수계",
            description: "거대 항구 지하에 거주하며 선박을 위협하는 마수입니다.",
            specialLoot: "크라켄의 촉수 채찍",
            detailedLoot: {
                name: "심해의 채찍",
                type: "Weapon",
                weaponType: "Spear",
                rarity: ItemRarity.UNIQUE,
                description: "살아있는 촉수처럼 움직이는 기괴한 채찍.",
                stats: { str: 200, agi: 120 },
                secondaryOptions: ["AGI +30%", "물리 공격력 +15%", "해수계 속성 부여"],
                enhancement: 0,
                imageUrl:"https://i.ibb.co/S4Ffmt2z/Gemini-Generated-Image-dzcdjndzcdjndzcd.png"
            },
            visualUrl: "https://i.ibb.co/G339qKwW/Gemini-Generated-Image-h51wu0h51wu0h51w.png",
            level: 460,
            skills: [createBossSkill("촉수 구속", "[부가 효과: 속박] 적을 휘감아 압박합니다.", SkillType.PHYSICAL, 420, 90, "STR*4.2")]
        },
        "헤이그": {
            id:"boss_heig",
            name: "정의의 골렘",
            title: "평화의 수호자",
            shinryokuType: "광휘계",
            description: "법과 질서를 수호하기 위해 창조된 신성한 대리석 골렘입니다.",
            specialLoot: "정의의 저울",
            detailedLoot: {
                name: "황금 저울",
                type: "Accessory",
                rarity: ItemRarity.UNIQUE,
                description: "선과 악의 균형을 맞추는 성물.",
                stats: { wis: 240, def: 80 },
                secondaryOptions: ["WIS +35%", "상태이상 저항 +20%", "광휘계 속성 피해 +20%"],
                enhancement: 0,
                imageUrl:"https://i.ibb.co/DgkSQ7mw/Gemini-Generated-Image-gitav1gitav1gita.png"
            },
            visualUrl: "https://i.ibb.co/KjzTDXcL/Gemini-Generated-Image-hsmgayhsmgayhsmg.png",
            level: 470,
            skills: [createBossSkill("심판의 섬광", "[부가 효과: 소멸] 죄인을 정벌하는 빛입니다.", SkillType.MAGIC, 500, 120, "INT*5.0")]
        }
    },
    "벨기에": {
        "브뤼셀": {
            id:"boss_bruchel",
            name: "다이아몬드 크러셔",
            title: "광휘의 파괴자",
            shinryokuType: "강철계",
            description: "전설적인 다이아몬드가 가공되어 탄생한 결정질 마수입니다.",
            specialLoot: "금강석 심장 파편",
            detailedLoot: {
                name: "다이아몬드 코어",
                type: "Accessory",
                rarity: ItemRarity.LEGENDARY,
                description: "세상에서 가장 단단한 결정체.",
                stats: { def: 350, ctrl: 200 },
                secondaryOptions: ["DEF +65%", "물리 방어력 +25%", "강철계 속성 저항 +25%","마법 방어력 +30%"],
                enhancement: 0,
                imageUrl:"https://i.ibb.co/JFjDqnRP/Gemini-Generated-Image-5zpa5w5zpa5w5zpa.png"
            },
            visualUrl: "https://i.ibb.co/N2swZXkV/Gemini-Generated-Image-1tul081tul081tul.png",
            level: 480,
            skills: [createBossSkill("크리스탈 프리즘", "치명적인 레이저를 발사합니다.", SkillType.MAGIC, 650, 160, "INT*6.5")]
        },
        "안트베르펜": {
            id:"boss_antwerpen",
            name: "항구의 거인 루아",
            title: "수탈의 군주",
            shinryokuType: "대지계",
            description: "손을 자르는 전설을 가진 거대한 바위 거인입니다.",
            specialLoot: "거인의 잘린 손",
            detailedLoot: {
                name: "안트베르펜 건틀릿",
                type: "Hand",
                rarity: ItemRarity.UNIQUE,
                description: "거인의 힘이 깃든 육중한 장갑.",
                stats: { str: 260, def: 40 },
                secondaryOptions: ["STR +40%", "물리 공격력 +15%", "모든 능력치 +5%"],
                enhancement: 0,
                imageUrl:"https://i.ibb.co/4nCpcCQr/Gemini-Generated-Image-wn2x8dwn2x8dwn2x.png"
            },
            visualUrl: "https://i.ibb.co/h1BRZN4y/Gemini-Generated-Image-tkie2stkie2stkie.png",
            level: 440,
            skills: [createBossSkill("대지 분쇄기", "[부가 효과: 파열] 지면을 부숴 충격을 줍니다.", SkillType.PHYSICAL, 520, 110, "STR*5.2")]
        }
    },
    "스위스": {
        "베른": {
            id:"boss_wern",
            name: "융프라우의 얼음 거인",
            title: "만년설의 지배자",
            shinryokuType: "대지계",
            description: "알프스의 가장 높은 곳에서 내려온 고대 거인입니다.",
            specialLoot: "알프스의 빙하 곡괭이",
            detailedLoot: {
                name: "글레이셔 픽",
                type: "Weapon",
                weaponType: "Axe",
                rarity: ItemRarity.LEGENDARY,
                description: "단단한 만년설도 단번에 가르는 곡괭이.",
                stats: { str: 280, def: 220 },
                secondaryOptions: ["STR +45%", "물리 공격력 +20%", "대지계 속성 부여","대지계 속성 피해 +50%"],
                enhancement: 0,
                imageUrl:"https://i.ibb.co/XfKVk8sx/Gemini-Generated-Image-86ai2n86ai2n86ai.png"
            },
            visualUrl: "https://i.ibb.co/hxWzkBW2/Gemini-Generated-Image-sbxa0ksbxa0ksbxa.png",
            level: 500,
            skills: [createBossSkill("산맥 붕괴", "[부가 효과: 속박] 지진과 함께 적을 매장합니다.", SkillType.PHYSICAL, 700, 180, "STR*7.0")]
        },
        "취리히": {
            id:"boss_chuirhee",
            name: "황금 금고 수호자",
            title: "자본의 파수꾼",
            shinryokuType: "강철계",
            description: "비밀 금고를 지키는 정교한 자동 태엽 기사입니다.",
            specialLoot: "비밀 금고 열쇠",
            detailedLoot: {
                name: "황금 태엽 심장",
                type: "Accessory",
                rarity: ItemRarity.UNIQUE,
                description: "정교하게 움직이는 금색 태엽 장치.",
                stats: { ctrl: 250, wis: 80 },
                secondaryOptions: ["CTRL +35%", "상태이상 저항 +15%", "모든 능력치 +10%"],
                enhancement: 0,
                imageUrl:"https://i.ibb.co/RTQqzXsW/Gemini-Generated-Image-gc1pfogc1pfogc1p.png"
            },
            visualUrl: "https://i.ibb.co/60nmkXs6/Gemini-Generated-Image-qin198qin198qin1.png",
            level: 480,
            skills: [createBossSkill("정밀한 찌르기", "약점을 정확히 공략합니다.", SkillType.PHYSICAL, 620, 110, "STR*6.2")]
        },
        "제네바": {
            id:"boss_geneba",
            name: "입자 가속의 령",
            title: "차원의 감시자",
            shinryokuType: "전격계",
            description: "강력한 마력 에너지 가속 장치에서 태어난 순수 에너지 생명체입니다.",
            specialLoot: "가속되는 입자 구슬",
            detailedLoot: {
                name: "에너지 핵 보주",
                type: "SubWeapon",
                weaponType: "Orb",
                rarity: ItemRarity.UNIQUE,
                description: "요동치는 고에너지를 담은 보주.",
                stats: { int: 260, agi: 80 },
                secondaryOptions: ["INT +40%", "마법 공격력 +15%", "전격계 속성 피해 +25%"],
                enhancement: 0,
                imageUrl:"https://i.ibb.co/RfKqkrp/Gemini-Generated-Image-85syc585syc585sy.png"
            },
            visualUrl: "https://i.ibb.co/spMFy6cG/Gemini-Generated-Image-laqmc0laqmc0laqm.png",
            level: 470,
            skills: [createBossSkill("입자 붕괴", "[부가 효과: 소멸] 대상을 분자 단위로 분해합니다.", SkillType.MAGIC, 750, 180, "INT*7.5")]
        }
    },
    "오스트리아": {
        "빈": {
            id:"boss_vienna",
            name: "마에스트로 팬텀",
            title: "죽음의 지휘자",
            shinryokuType: "월광계",
            description: "음악의 도시에서 죽은 연주자들의 혼이 모인 영체입니다.",
            specialLoot: "마에스트로의 은색 지휘봉",
            detailedLoot: {
                name: "실버 바톤",
                type: "Weapon",
                weaponType: "Staff",
                rarity: ItemRarity.LEGENDARY,
                description: "아름답지만 불길한 선율을 자아내는 지휘봉.",
                stats: { int: 280, wis: 200 },
                secondaryOptions: ["WIS +45%", "마법 공격력 +20%", "월광계 속성 부여","모든 능력치 +25%"],
                enhancement: 0,
                imageUrl:"https://i.ibb.co/SX3Wbjpp/Gemini-Generated-Image-4k71ju4k71ju4k71.png"
            },
            visualUrl: "https://i.ibb.co/LhNZhyX6/Kakao-Talk-20260101-111900935-06.png",
            level: 500,
            skills: [createBossSkill("진혼곡: 월광", "[부가 효과: 혼란] 적들을 현혹킵니다.", SkillType.MAGIC, 620, 150, "INT*6.2")]
        },
        "잘츠부르크": {
            id:"boss_salzburg",
            name: "알프스의 메아리",
            title: "소리의 정령",
            shinryokuType: "질풍계",
            description: "협곡의 메아리가 실체화되어 적의 공격을 반사하는 정령입니다.",
            specialLoot: "진동하는 소리 결정",
            detailedLoot: {
                name: "에코 이어링",
                type: "Accessory",
                rarity: ItemRarity.UNIQUE,
                description: "소리의 진동을 마력으로 바꾸는 귀걸이.",
                stats: { ctrl: 230, agi: 90 },
                secondaryOptions: ["CTRL +35%", "상태이상 저항 +15%", "질풍계 속성 저항 +20%"],
                enhancement: 0,
                imageUrl:"https://i.ibb.co/fb1zw6L/Gemini-Generated-Image-wd0gzqwd0gzqwd0g.png"
            },
            visualUrl: "https://i.ibb.co/SX9w42bk/Gemini-Generated-Image-2bcq9l2bcq9l2bcq.png",
            level: 440,
            skills: [createBossSkill("파괴적 음파", "고주파로 적의 내부를 공격합니다.", SkillType.MAGIC, 480, 100, "INT*4.8")]
        }
    },
    "포르투갈": {
        "리스본": {
            id:"boss_lisbon",
            name: "바스코 다 가마의 유령선",
            title: "대항해의 망령",
            shinryokuType: "질풍계",
            description: "대항해 시대를 주름잡던 선박이 거대 목재 마수로 변했습니다.",
            specialLoot: "항해사의 황금 나침반",
            detailedLoot: {
                name: "황금 나침반",
                type: "Accessory",
                rarity: ItemRarity.LEGENDARY,
                description: "폭풍 속에서도 길을 잃지 않게 해주는 나침반.",
                stats: { wis: 240, agi: 220, ctrl: 200 },
                secondaryOptions: ["WIS +35%", "상태이상 저항 +25%", "질풍계 속성 피해 +25%","모든 능력치 +15%"],
                enhancement: 0,
                imageUrl:"https://i.ibb.co/pvH0TykH/Gemini-Generated-Image-omvt7romvt7romvt.png"
            },
            visualUrl: "https://i.ibb.co/s9DrwwwQ/Kakao-Talk-20260101-111900935-05.png",
            level: 490,
            skills: [createBossSkill("폭풍의 돛", "바람을 모아 날카로운 칼날처럼 벱니다.", SkillType.MAGIC, 580, 140, "AGI*5.8")]
        },
        "포르투": {
            id:"boss_porto",
            name: "와인의 정령 비노",
            title: "붉은 바다의 사도",
            shinryokuType: "해수계",
            description: "포도주와 강물의 기운이 섞여 탄생한 변덕스러운 정령입니다.",
            specialLoot: "진귀한 빈티지 병",
            detailedLoot: {
                name: "포르토 워터 코어",
                type: "SubWeapon",
                weaponType: "Orb",
                rarity: ItemRarity.UNIQUE,
                description: "짙은 루비색 광채를 내는 마력 결정.",
                stats: { int: 250, hp: 500 },
                secondaryOptions: ["INT +35%", "마법 공격력 +15%", "해수계 속성 피해 +25%"],
                enhancement: 0,
                imageUrl:"https://i.ibb.co/7NRTNrhC/Gemini-Generated-Image-n7ue5gn7ue5gn7ue.png"
            },
            visualUrl: "https://i.ibb.co/bM3jWbS8/Gemini-Generated-Image-hghvo5hghvo5hghv.png",
            level: 450,
            skills: [createBossSkill("붉은 파도", "[부가 효과: 혼란] 적들을 취하게 만듭니다.", SkillType.MAGIC, 450, 110, "INT*4.5")]
        }
    },
    "아일랜드": {
        "더블린": {
            id:"boss_dublin",
            name: "레프리콘 킹",
            title: "장난기 가득한 수전노",
            shinryokuType: "초화계",
            description: "황금 단지를 지키기 위해 강력한 자연 마법을 부리는 요정 왕입니다.",
            specialLoot: "네잎클로버 귀걸이",
            detailedLoot: {
                name: "행운의 클로버",
                type: "Accessory",
                rarity: ItemRarity.LEGENDARY,
                description: "무한한 행운을 가져다주는 신비로운 장식.",
                stats: { ctrl: 280, wis: 200 },
                secondaryOptions: ["CTRL +40%", "상태이상 저항 +30%", "모든 능력치 +25%","경험치 획득량 +50%"],
                enhancement: 0,
                imageUrl:"https://i.ibb.co/Bdq7xJD/Gemini-Generated-Image-7z7ol37z7ol37z7o.png"
            },
            visualUrl: "https://i.ibb.co/zHS2QrqC/Kakao-Talk-20260101-111900935-04.png",
            level: 480,
            skills: [createBossSkill("요정의 가시덩굴", "[부가 효과: 속박] 자연의 힘으로 묶습니다.", SkillType.MAGIC, 520, 130, "INT*5.2")]
        },
        "코크": {
            id:"boss_coke",
            name: "켈트의 전사혼",
            title: "잊혀진 기사",
            shinryokuType: "신체강화계",
            description: "오래된 전장에서 소환된 켈트 전사들의 원혼입니다.",
            specialLoot: "켈트 십자가 검",
            detailedLoot: {
                name: "클레이모어 오브 코크",
                type: "Weapon",
                weaponType: "Sword",
                rarity: ItemRarity.UNIQUE,
                description: "거대한 크기를 자랑하는 아일랜드 전통 대검.",
                stats: { str: 290, def: 50 },
                secondaryOptions: ["STR +46%", "물리 공격력 +18%", "신체강화계 속성 부여"],
                enhancement: 0,
                imageUrl:"https://i.ibb.co/8484yHKP/Gemini-Generated-Image-2yiyw72yiyw72yiy.png"
            },
            visualUrl: "https://i.ibb.co/ZpWnCCmg/Gemini-Generated-Image-ssmzejssmzejssmz.png",
            level: 440,
            skills: [createBossSkill("광전사의 일격", "자신의 방어를 버리고 강력한 일격을 날립니다.", SkillType.PHYSICAL, 650, 100, "STR*6.5", 'single')]
        }
    },
    "헝가리": {
        "부다페스트": {
            id:"boss_budapest",
            name: "다뉴브의 수룡",
            title: "동유럽의 푸른 눈물",
            shinryokuType: "해수계",
            description: "도시의 흥망성쇠를 지켜본 거대한 수룡입니다.",
            specialLoot: "다뉴브의 푸른 진주",
            detailedLoot: {
                name: "푸른 진주 왕관",
                type: "Head",
                rarity: ItemRarity.LEGENDARY,
                description: "강물의 정수가 응축된 눈부신 진주 왕관.",
                stats: { wis: 240, int: 240, def: 200 },
                secondaryOptions: ["WIS +35%", "마법 방어력 +20%", "해수계 속성 저항 +25%","모든 능력치 +15%"],
                enhancement: 0,
                imageUrl:"https://i.ibb.co/ZzRCCnrr/Gemini-Generated-Image-mjt1rdmjt1rdmjt1.png"
            },
            visualUrl: "https://i.ibb.co/MyRmQmHj/Gemini-Generated-Image-nof8p4nof8p4nof8.png",
            level: 490,
            skills: [createBossSkill("침식하는 강물", "[부가 효과: 파열] 부식성 물줄기를 뿜습니다.", SkillType.MAGIC, 540, 140, "INT*5.4")]
        }
    },
    "체코": {
        "프라하": {
            id:"boss_praha",
            name: "구시가지 골렘",
            title: "연금술의 집대성",
            shinryokuType: "강철계",
            description: "태엽 장치와 점토로 이루어진 고대의 자동인형입니다.",
            specialLoot: "프라하의 태엽 심장",
            detailedLoot: {
                name: "천문시계 태엽",
                type: "Accessory",
                rarity: ItemRarity.LEGENDARY,
                description: "정교하게 움직이는 연금술의 심장.",
                stats: { wis: 250, ctrl: 250 },
                secondaryOptions: ["WIS +35%", "마법 공격력 +15%", "강철계 속성 피해 +25%","모든 능력치 +30%"],
                enhancement: 0,
                imageUrl:"https://i.ibb.co/Z6C9Dskr/Gemini-Generated-Image-ea7a8vea7a8vea7a.png"
            },
            visualUrl: "https://i.ibb.co/KJGm1GB/Kakao-Talk-20260101-111900935-03.png",
            level: 500,
            skills: [createBossSkill("시간의 왜곡", "[부가 효과: 감전] 적의 시간을 뺏고 충격을 줍니다.", SkillType.MAGIC, 600, 160, "INT*6.0")]
        },
        "브르노": {
            id:"boss_buruno",
            name: "지하 묘지의 공포",
            title: "뼈의 파수꾼",
            shinryokuType: "암흑계",
            description: "수만 개의 뼈가 뭉쳐 만들어진 거대한 해골 괴수입니다.",
            specialLoot: "백골 파쇄용 도끼",
            detailedLoot: {
                name: "오스추어리 액스",
                type: "Weapon",
                weaponType: "Axe",
                rarity: ItemRarity.UNIQUE,
                description: "서늘한 기운을 내뿜는 뼈로 만든 도끼.",
                stats: { str: 270, agi: 30 },
                secondaryOptions: ["STR +45%", "물리 공격력 +15%", "암흑계 속성 부여"],
                enhancement: 0,
                imageUrl:"https://i.ibb.co/7xjTM3jK/Gemini-Generated-Image-nt4xognt4xognt4x.png"
            },
            visualUrl: "https://i.ibb.co/0prb830Z/Gemini-Generated-Image-um5mwqum5mwqum5m.png",
            level: 460,
            skills: [createBossSkill("뼈 감옥", "[부가 효과: 속박] 적들을 뼈로 된 감옥에 가둡니다.", SkillType.PHYSICAL, 420, 110, "STR*4.2")]
        }
    },
    "루마니아": {
        "부쿠레슈티": {
            id:"boss_bukureschti",
            name: "드라큘라 카운트",
            title: "밤의 군주 / 혈액의 사도",
            shinryokuType: "암흑계",
            description: "트란실바니아의 그림자 속에서 군림하는 시조입니다.",
            specialLoot: "진조의 혈색 망토",
            detailedLoot: {
                name: "드라큘라 이빨 너클",
                type: "Weapon",
                weaponType:'Knuckle',
                elementalType:"암흑계",
                rarity: ItemRarity.LEGENDARY,
                description: "피처럼 붉고 그림자같은 이빨로 만든 너클",
                stats: { def: 280, str: 100, wis: 100 },
                secondaryOptions: ["STR +25%", "물리 공격력 +20%", "암흑계 속성 부여", "모든 능력치 +15%"],
                enhancement: 0,
                imageUrl:"https://i.ibb.co/1t3vj5Nk/Gemini-Generated-Image-zacovhzacovhzaco.png"
            },
            visualUrl: "https://i.ibb.co/rfqHmYYv/Kakao-Talk-20260101-111900935-02.png",
            level: 520,
            skills: [createBossSkill("블러드 카니발", "[부가 효과: 출혈] 박쥐 떼를 불러 적을 공격합니다.", SkillType.PHYSICAL, 650, 160, "STR*6.5")]
        }
    },
    "터키": {
        "앙카라": {
            id:"boss_angkara",
            name: "아나톨리아 피닉스",
            title: "동양과 서양의 불꽃",
            shinryokuType: "화염계",
            description: "뜨거운 열기 속에서 재탄생한 거대 화염 조류입니다.",
            specialLoot: "오스만 술탄의 인장",
            detailedLoot: {
                name: "술탄의 인장 반지",
                type: "Accessory",
                rarity: ItemRarity.LEGENDARY,
                description: "막강한 권능을 상징하는 화려한 반지.",
                stats: { int: 260, ctrl: 220 },
                secondaryOptions: ["INT +40%", "마법 공격력 +15%", "화염계 속성 피해 +25%","모든 능력치 +15%"],
                enhancement: 0,
                imageUrl:"https://i.ibb.co/20DvmXQb/Gemini-Generated-Image-sarwzosarwzosarw.png"
            },
            visualUrl: "https://i.ibb.co/qM7rm95Y/Kakao-Talk-20260101-111900935-01.png",
            level: 510,
            skills: [createBossSkill("제국의 멸화", "[부가 효과: 화상] 전장을 불바다로 만듭니다.", SkillType.MAGIC, 620, 180, "INT*6.2")]
        },
        "이스탄불": {
            id:"boss_istanbul",
            name: "보스포러스의 히드라",
            title: "두 대륙의 약탈자",
            shinryokuType: "해수계",
            description: "해협의 거친 물살 속에서 거주하며 선박을 습격하는 마수입니다.",
            specialLoot: "히드라 독니 단검",
            detailedLoot: {
                name: "해협의 포식자",
                type: "Weapon",
                weaponType: "Sword",
                rarity: ItemRarity.UNIQUE,
                description: "치명적인 독이 서린 히드라의 이빨 검.",
                stats: { str: 200, agi: 140 },
                secondaryOptions: ["AGI +35%", "치명타율 +15%", "해수계 속성 부여"],
                enhancement: 0,
                imageUrl:"https://i.ibb.co/jkdsQ0rF/Gemini-Generated-Image-iewt61iewt61iewt.png"
            },
            visualUrl: "https://i.ibb.co/1f05DDNj/Gemini-Generated-Image-vgnbgvvgnbgvvgnb.png",
            level: 480,
            skills: [createBossSkill("해협의 소용돌이", "[부가 효과: 빙결] 강력한 소용돌이를 만듭니다.", SkillType.MAGIC, 500, 130, "INT*5.0")]
        }
    },
    "스코틀랜드": {
        "에든버러": {
            id:"boss_scotland_edenburugh",
            name: "네스 호의 잠든 괴수",
            title: "안개 속의 네시",
            shinryokuType: "해수계",
            description: "깊은 호수 아래 잠들어 있던 고대 수룡입니다.",
            specialLoot: "하이랜드의 백파이프",
            detailedLoot: {
                name: "전통 백파이프",
                type: "Accessory",
                rarity: ItemRarity.UNIQUE,
                description: "전장에서 동료들의 투지를 일깨우는 악기.",
                stats: { wis: 200, def: 200 },
                secondaryOptions: ["WIS +25%", "상태이상 저항 +15%", "모든 능력치 +10%"],
                enhancement: 0,
                imageUrl:"https://i.ibb.co/C3rxXT4X/Gemini-Generated-Image-7boz2t7boz2t7boz.png"
            },
            visualUrl: "https://i.ibb.co/HfXxMqs0/Gemini-Generated-Image-se1jjsse1jjsse1j.png",
            level: 480,
            skills: [createBossSkill("심연의 포효", "[부가 효과: 공포] 호수 밑바닥의 위압감을 전합니다.", SkillType.DEBUFF, 0, 100, "ATK -30%")]
        },
        "글래스고": {
            id:"boss_glassgow",
            name: "클라이드 강의 골렘",
            title: "조선소의 거신",
            shinryokuType: "강철계",
            description: "항구의 고철들이 신력으로 결합된 거대 금속 괴수입니다.",
            specialLoot: "조선소의 강철 닻",
            detailedLoot: {
                name: "클라이드 앵커",
                type: "Weapon",
                weaponType: "Blunt",
                rarity: ItemRarity.UNIQUE,
                description: "모든 것을 고정시키거나 파괴하는 거대한 닻.",
                stats: { str: 280, def: 60 },
                secondaryOptions: ["STR +45%", "물리 공격력 +15%", "강철계 속성 부여"],
                enhancement: 0,
                imageUrl:"https://i.ibb.co/d0ZXDDd4/Gemini-Generated-Image-s7k30ks7k30ks7k3.png"
            },
            visualUrl: "https://i.ibb.co/RGgSpj3k/Gemini-Generated-Image-lts2tults2tults2.png",
            level: 460,
            skills: [createBossSkill("앵커 크러시", "[부가 효과: 파열] 거대한 닻으로 내리찍습니다.", SkillType.PHYSICAL, 520, 120, "STR*5.2")]
        }
    },
    "그리스": {
        "아테네": {
            id:"boss_athene",
            name: "파르테논의 수호거인",
            title: "올림포스의 집행자",
            shinryokuType: "광휘계",
            description: "아크로폴리스를 수호하는 거대한 대리석상입니다. 태양의 빛을 한 몸에 모아 적을 심판합니다.",
            specialLoot: "아테나와 아레스의 무기",
            detailedLoot: [{
                name: "아테나의 이지스",
                type: "SubWeapon",
                weaponType: "Shield",
                rarity: ItemRarity.LEGENDARY,
                description: "여신 아테나의 지혜와 가호가 담긴 방패입니다.",
                stats: { def: 220, wis: 180, ctrl: 150 },
                secondaryOptions: ["물리 방어력 +25%","마법 방어력 +25%", "상태이상 저항 +25%","모든 속성 저항 +20%"],
                enhancement: 0,
                imageUrl:"https://i.ibb.co/C3DjspPH/Gemini-Generated-Image-16tpuk16tpuk16tp.png"
            }, {
                name: "아레스의 창",
                type: "Weapon",
                weaponType: "Spear",
                rarity: ItemRarity.LEGENDARY,
                description: "전쟁의 신 아레스의 창입니다.",
                stats: { str: 220, agi: 190, ctrl: 150 },
                secondaryOptions: ["치명타 확률 +25%", "물리 공격력 +30%", "신체강화계 속성 부여","모든 능력치 +20%"],
                enhancement: 0,
                imageUrl:"https://i.ibb.co/HD329Kn7/Gemini-Generated-Image-oe3916oe3916oe39.png"
            },],
            visualUrl: "https://i.ibb.co/zWjJx8zD/Kakao-Talk-20260101-111900935.png",
            level: 520,
            skills: [
                createBossSkill("올림포스의 섬광", "[부가 효과: 소멸] 적 전체를 정화의 빛으로 덮습니다.", SkillType.MAGIC, 500, 120, "INT*5.0"),
                createBossSkill("이지스의 권능", "자신에게 무적 상태를 부여하고 방어력을 높입니다.", SkillType.BUFF, 0, 150, "DEF +100%", 'self')
            ]
        },
        "테살로니키": {
            id:"boss_tesaroniki",
            name: "에게해의 히드라",
            title: "심연의 포식자",
            shinryokuType: "해수계",
            description: "에게해 바닥에서 올라온 아홉 머리의 괴수입니다. 사방으로 맹독을 뿜어냅니다.",
            specialLoot: "히드라의 독니 단검",
            detailedLoot: {
                name: "에게해의 독니",
                type: "Weapon",
                weaponType: "Sword",
                rarity: ItemRarity.UNIQUE,
                description: "히드라의 이빨을 깎아 만든 단검. 치명적인 맹독이 흐릅니다.",
                stats: { str: 180, agi: 110, ctrl: 40 },
                secondaryOptions: ["치명타 확률 +25%", "STR +10%", "해수계 속성 부여"],
                enhancement: 0,
                imageUrl:"https://i.ibb.co/LBHD3cS/Gemini-Generated-Image-bja8jmbja8jmbja8.png"
            },
            visualUrl: "https://i.ibb.co/67XqLWKm/Gemini-Generated-Image-ixtol1ixtol1ixto.png",
            level: 490,
            skills: [
                createBossSkill("심연의 해일", "[부가 효과: 빙결] 전장을 물바다로 만들어 적들을 고립시킵니다.", SkillType.MAGIC, 450, 130, "INT*4.5"),
                createBossSkill("맹독 난무", "[부가 효과: 중독] 모든 머리가 동시에 독을 내뿜습니다.", SkillType.MAGIC, 350, 100, "INT*3.5")
            ]
        }
    }
};

export const getEuropeBossByLocation = (nation: string, city: string): BossData | null => {
    if (EUROPE_BOSSES[nation] && EUROPE_BOSSES[nation][city]) {
        return EUROPE_BOSSES[nation][city];
    }
    return null;
};
