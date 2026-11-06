
import { ClassTier, SkillType, ItemRarity, Skill, SkillTarget, Item } from './types';
import { BossData } from './bossMonsters';

const createBossSkill = (name: string, desc: string, type: SkillType, ratio: number, mp: number, formula: string, target: SkillTarget = 'single'): Skill => ({
    name, description: desc, type, tier: ClassTier.FINAL, level: 10, maxLevel: 10, currentMastery: 0, mpCost: mp, powerRatio: ratio, effectFormula: formula, targetType: target
});

export const AMERICA_BOSSES: Record<string, Record<string, BossData>> = {
    "미국": {
        "워싱턴 D.C.": {
            id:"boss_washington",
            name: "리버티 가디언",
            title: "민주주의의 철퇴",
            shinryokuType: "광휘계",
            description: "백악관과 국회의사당의 신념이 형상화된 거대 석상입니다.",
            specialLoot: "해방의 성광검",
            detailedLoot: {
                name: "해방의 성광검",
                type: "Weapon",
                weaponType: "Sword",
                rarity: ItemRarity.LEGENDARY,
                description: "자유를 억압하는 모든 것을 베어버리는 빛의 검.",
                stats: { str: 220, ctrl: 280 },
                secondaryOptions: ["STR +50%", "물리 공격력 +25%", "광휘계 속성 부여","광휘계 속성 피해 +40%"],
                enhancement: 0,
                imageUrl:"https://i.ibb.co/TzRKK7L/Gemini-Generated-Image-1hpbct1hpbct1hpb.png"
            },
            visualUrl: "https://i.ibb.co/Ld1CSdSX/Gemini-Generated-Image-xxtzh9xxtzh9xxtz.png",
            level: 520,
            skills: [createBossSkill("자유의 심판", "[부가 효과: 소멸] 신성한 광선으로 전장을 정화합니다.", SkillType.MAGIC, 600, 150, "INT*6.0")]
        },
        "뉴욕": {
            id:"boss_newyork",
            name: "월 스트리트 골렘",
            title: "황금 지상주의자",
            shinryokuType: "강철계",
            description: "마천루의 강철과 자본의 욕망이 뭉쳐 탄생한 탐욕스러운 골렘입니다.",
            specialLoot: "자본의 황금 심장",
            detailedLoot: {
                name: "자본의 황금 심장",
                type: "Accessory",
                rarity: ItemRarity.UNIQUE,
                description: "모든 것을 돈으로 환산하는 탐욕스러운 핵.",
                stats: { def: 250, wis: 150, hp: 500 },
                secondaryOptions: ["DEF +20%", "물리 방어력 +10%", "모든 능력치 +15%", "골드 획득량 +50%"],
                enhancement: 0,
                imageUrl:"https://i.ibb.co/My3sJMdC/Gemini-Generated-Image-aodxltaodxltaodx.png"
            },
            visualUrl: "https://i.ibb.co/YB4ZwXhf/Gemini-Generated-Image-y2sjq0y2sjq0y2sj.png",
            level: 500,
            skills: [createBossSkill("주가 폭락", "[부가 효과: 파열] 적의 방어 체계를 완전히 붕괴시킵니다.", SkillType.PHYSICAL, 500, 120, "STR*5.0")]
        },
        "LA": {
            id:"boss_la",
            name: "할리우드 팬텀",
            title: "은막의 지배자",
            shinryokuType: "월광계",
            description: "수많은 영화 속 환상들이 뒤섞여 만들어진 변덕스러운 영체입니다.",
            specialLoot: "디렉터스 컷 건",
            detailedLoot: {
                name: "디렉터스 컷 건",
                type: "Weapon",
                weaponType: "Firearm",
                rarity: ItemRarity.LEGENDARY,
                description: "현실을 영화처럼 편집할 수 있는 환각의 권총.",
                stats: { int: 220, wis: 170 },
                secondaryOptions: ["INT +45%", "마법 공격력 +32%", "월광계 속성 부여","월광계 속성 피해 +50%"],
                enhancement: 0,
                imageUrl:"https://i.ibb.co/s9bGRZ8B/Gemini-Generated-Image-zemahpzemahpzema.png"
            },
            visualUrl: "https://i.ibb.co/svxsjvhd/Gemini-Generated-Image-gzdkddgzdkddgzdk.png",
            level: 480,
            skills: [createBossSkill("시나리오 개변", "[부가 효과: 혼란] 적들이 서로를 공격하도록 유도합니다.", SkillType.MAGIC, 450, 100, "INT*4.5")]
        },
        "시카고": {
            id:"boss_chicago",
            name: "윈디 시티 제피로스",
            title: "몰아치는 난기류",
            shinryokuType: "질풍계",
            description: "미시간 호수의 거센 바람이 신력을 얻어 형성된 거대 기류 생명체입니다.",
            specialLoot: "토네이도 코어 슈트",
            detailedLoot: {
                name: "토네이도 코어 슈트",
                type: "Body",
                rarity: ItemRarity.UNIQUE,
                description: "바람의 흐름을 받아내어 민첩성을 극대화하는 갑옷.",
                stats: { def: 120, agi: 150 },
                secondaryOptions: ["AGI +20%", "물리 공격력 +28%", "질풍계 속성 저항 +20%"],
                enhancement: 0,
                imageUrl:"https://i.ibb.co/ghKYtLd/Gemini-Generated-Image-sievylsievylsiev.png"
            },
            visualUrl: "https://i.ibb.co/HLcGCKRV/Gemini-Generated-Image-hkb67vhkb67vhkb6.png",
            level: 470,
            skills: [createBossSkill("진공 붕괴", "[부가 효과: 파열] 공기압을 조절해 적의 내부를 타격합니다.", SkillType.PHYSICAL, 400, 110, "AGI*4.0")]
        },
        "샌프란시스코": {
            id:"boss_sanfran",
            name: "골든 게이트 가디언",
            title: "안개 속의 파수꾼",
            shinryokuType: "해수계",
            description: "금문교를 휘감는 붉은 안개 속에서 나타나는 거대 해양 마수입니다.",
            specialLoot: "금문교의 붉은 닻",
            detailedLoot: {
                name: "금문교의 붉은 닻",
                type: "Weapon",
                weaponType: "Blunt",
                rarity: ItemRarity.UNIQUE,
                description: "모든 것을 고정시키거나 파괴하는 거대한 붉은 닻.",
                stats: { str: 230, def: 200 },
                secondaryOptions: ["STR +50%", "물리 공격력 +10%", "해수계 속성 부여","해수계 속성 피해 +20%"],
                enhancement: 0,
                imageUrl:"https://i.ibb.co/ymwVbjfs/Gemini-Generated-Image-ll2vc2ll2vc2ll2v.png"
            },
            visualUrl: "https://i.ibb.co/7PLvb4k/Gemini-Generated-Image-acqhrgacqhrgacqh.png",
            level: 460,
            skills: [createBossSkill("심해의 속박", "[부가 효과: 속박] 차가운 사슬로 적의 발을 묶습니다.", SkillType.PHYSICAL, 350, 90, "STR*3.5")]
        },
        "마이애미": {
            id:"boss_miami",
            name: "네온 타이드 크라켄",
            title: "화려한 심해의 포식자",
            shinryokuType: "전격계",
            description: "도시의 화려한 네온 사인을 흡수한 뒤 변이된 전격 문어입니다.",
            specialLoot: "네온 펄스 오브",
            detailedLoot: {
                name: "네온 펄스 오브",
                type: "SubWeapon",
                weaponType: "Orb",
                rarity: ItemRarity.UNIQUE,
                description: "빛의 파동을 방출하여 적을 마비시키는 보주.",
                stats: { int: 190, ctrl: 190 },
                secondaryOptions: ["INT +30%", "전격계 속성 부여", "치명타율 +15%"],
                enhancement: 0,
                imageUrl:"https://i.ibb.co/RGzYJzhq/Gemini-Generated-Image-4lgb5o4lgb5o4lgb.png"
            },
            visualUrl: "https://i.ibb.co/N6QD0Yb5/Gemini-Generated-Image-w3khwgw3khwgw3kh.png",
            level: 450,
            skills: [createBossSkill("플래시 썬더", "[부가 효과: 감전] 눈부신 빛과 함께 번개를 쏟아냅니다.", SkillType.MAGIC, 420, 110, "INT*4.2")]
        },
        "라스베가스": {
            id:"boss_lasvegas",
            name: "카지노 조커",
            title: "운명의 지배자",
            shinryokuType: "암흑계",
            description: "도박의 도시에서 패배한 자들의 원념이 뭉쳐 탄생한 혼돈의 광대입니다.",
            specialLoot: "도박사의 올인 벨트",
            detailedLoot: {
                name: "도박사의 올인 벨트",
                type: "Accessory",
                rarity: ItemRarity.UNIQUE,
                description: "확률을 조작하는 불길한 기운의 벨트.",
                stats: { ctrl: 250, wis: 180 },
                secondaryOptions: ["CTRL +30%", "모든 능력치 +20%", "치명타율 +10%"],
                enhancement: 0,
                imageUrl:"https://i.ibb.co/27KFYknm/Gemini-Generated-Image-wviu3owviu3owviu.png"
            },
            visualUrl: "https://i.ibb.co/ccdsgJ8K/Gemini-Generated-Image-rhhg9vrhhg9vrhhg.png",
            level: 490,
            skills: [createBossSkill("잭팟 오어 데스", "[부가 효과: 소멸] 도박적인 일격으로 존재를 지워버립니다.", SkillType.MAGIC, 600, 180, "CTRL*6.0")]
        }
    },
    "캐나다": {
        "오타와": {
            id:"boss_otawa",
            name: "메이플 가디언 앤트",
            title: "단풍의 수호신",
            shinryokuType: "초화계",
            description: "오타와의 고대 숲에서 수천 년간 살아온 거대 고목 정령입니다.",
            specialLoot: "세계수 줄기 지팡이",
            detailedLoot: {
                name: "단풍 수호신의 지팡이",
                type: "Weapon",
                weaponType: "Staff",
                rarity: ItemRarity.LEGENDARY,
                description: "자연의 생명력을 다스리는 신성한 지팡이.",
                stats: { int: 200, wis: 220 },
                secondaryOptions: ["WIS +25%", "모든 능력치 +20%", "초화계 속성 부여","INT +20%"],
                enhancement: 0,
                imageUrl:"https://i.ibb.co/tPnCPdJk/Gemini-Generated-Image-h3zm4dh3zm4dh3zm.png"
            },
            visualUrl: "https://i.ibb.co/RpjjkZ48/Gemini-Generated-Image-s0dy62s0dy62s0dy.png",
            level: 460,
            skills: [createBossSkill("대자연의 정화", "아군은 치유하고 적의 버프를 해제합니다.", SkillType.BUFF, 0, 120, "HP 20% Recov, Dispel All Enemies")]
        },
        "토론토": {
            id:"boss_toronto",
            name: "CN 타워 타이탄",
            title: "마천루의 꼭대기",
            shinryokuType: "강철계",
            description: "CN 타워의 높이와 강철을 흡수하여 깨어난 거대 기계 거신입니다.",
            specialLoot: "스카이 워커 장화",
            detailedLoot: {
                name: "스카이 워커 장화",
                type: "Feet",
                rarity: ItemRarity.UNIQUE,
                description: "하늘을 걷는 듯한 가벼움을 선사하는 강철 장화.",
                stats: { agi: 210, def: 180 },
                secondaryOptions: ["AGI +20%", "물리 방어력 +20%", "물리 공격력 +15%"],
                enhancement: 0,
                imageUrl:"https://i.ibb.co/RTTT9W39/Gemini-Generated-Image-5ksxiv5ksxiv5ksx.png"
            },
            visualUrl: "https://i.ibb.co/GQMDFJh0/Gemini-Generated-Image-zcodbzzcodbzzcod.png",
            level: 450,
            skills: [createBossSkill("스카이 폴", "[부가 효과: 파열] 하늘에서 급강하하여 대지를 박살냅니다.", SkillType.PHYSICAL, 500, 130, "STR*5.0")]
        },
        "밴쿠버": {
            id: "boss_vancuber",
            name: "퍼시픽 웨일 스피릿",
            title: "태평양의 거친 숨결",
            shinryokuType: "해수계",
            description: "태평양 연안을 수호하는 영험한 거대 고래의 영혼입니다.",
            specialLoot: "심해의 부름 보주",
            detailedLoot: {
                name: "태평양의 정수 오브",
                type: "SubWeapon",
                weaponType: "Orb",
                rarity: ItemRarity.UNIQUE,
                description: "바다의 모든 마력을 응축시킨 푸른 보주.",
                stats: { int: 200, wis: 200 },
                secondaryOptions: ["INT +20%", "해수계 속성 부여", "마법 방어력 +10%"],
                enhancement: 0,
                imageUrl:"https://i.ibb.co/nNq5XbW6/Gemini-Generated-Image-9ic1du9ic1du9ic1.png"
            },
            visualUrl: "https://i.ibb.co/nM1V0ks3/Gemini-Generated-Image-cz2dkmcz2dkmcz2d.png",
            level: 440,
            skills: [createBossSkill("해신의 해일", "[부가 효과: 빙결] 전장을 거대한 물감옥으로 만듭니다.", SkillType.MAGIC, 450, 120, "INT*4.5")]
        },
        "몬트리올": {
            id: "boss_montreol",
            name: "올드 포트 고스트",
            title: "잊혀진 항구의 망령",
            shinryokuType: "암흑계",
            description: "과거 항구의 영광과 함께 매몰된 영혼들이 하나로 뭉친 거대 영체입니다.",
            specialLoot: "망령의 조타 키",
            detailedLoot: {
                name: "항구의 주인 반지",
                type: "Accessory",
                rarity: ItemRarity.UNIQUE,
                description: "죽은 자들의 힘을 빌려 현실을 간섭하는 반지.",
                stats: { int: 180, ctrl: 220 },
                secondaryOptions: ["CTRL +25%", "암흑계 속성 피해 +25%", "상태이상 저항 +20%"],
                enhancement: 0,
                imageUrl:"https://i.ibb.co/p6yThXs3/Gemini-Generated-Image-3amdvd3amdvd3amd.png"
            },
            visualUrl: "https://i.ibb.co/xqt1DKvg/Gemini-Generated-Image-xe1t72xe1t72xe1t.png",
            level: 430,
            skills: [createBossSkill("진혼의 공포", "[부가 효과: 공포] 심장 박동을 멈추게 하는 극도의 위압감입니다.", SkillType.MAGIC, 400, 110, "WIS*4.0")]
        }
    },
    "멕시코": {
        "멕시코시티": {
            id:"boss_mexicocity",
            name: "아즈텍 가디언 서펀트",
            title: "고대 태양의 대리인",
            shinryokuType: "태양계",
            description: "아즈텍 신화 속 깃털 달린 뱀 케찰코아틀의 환영이 현신했습니다.",
            specialLoot: "케찰코아틀의 역린",
            detailedLoot: {
                name: "태양신의 이빨",
                type: "Weapon",
                weaponType: "Spear",
                rarity: ItemRarity.UNIQUE,
                description: "태양의 열기를 그대로 간직한 황금색 창.",
                stats: { str: 240, agi: 190 },
                secondaryOptions: ["STR +35%", "태양계 속성 부여", "물리 공격력 +24%"],
                enhancement: 0,
                imageUrl:"https://i.ibb.co/FbJpZgrR/Gemini-Generated-Image-w7wdtgw7wdtgw7wd.png"
            },
            visualUrl: "https://i.ibb.co/CsS18rN1/Gemini-Generated-Image-a1s6ia1s6ia1s6ia.png",
            level: 470,
            skills: [createBossSkill("솔라 플레어", "[부가 효과: 소멸] 모든 것을 정화하는 태양 폭발을 일으킵니다.", SkillType.MAGIC, 550, 140, "INT*5.5")]
        },
        "과달라하라": {
            id:"boss_gwadala",
            name: "테킬라 파이어 스피릿",
            title: "타오르는 축제의 령",
            shinryokuType: "화염계",
            description: "멕시코의 뜨거운 축제와 열정에서 태어난 불꽃의 정령입니다.",
            specialLoot: "축제의 붉은 망토",
            detailedLoot: {
                name: "아디오스 이그니션",
                type: "Body",
                rarity: ItemRarity.EPIC,
                description: "착용자의 투지를 불꽃으로 전환하는 망토.",
                stats: { str: 160, int: 60, agi: 60 },
                secondaryOptions: ["STR +15%", "물리 공격력 +15%", "화염계 속성 저항 +10%"],
                enhancement: 0,
                imageUrl:"https://i.ibb.co/TM8Ys8nN/Gemini-Generated-Image-rv3q4srv3q4srv3q.png"
            },
            visualUrl: "https://i.ibb.co/Y7TXsBPj/Gemini-Generated-Image-7m2v8y7m2v8y7m2v.png",
            level: 430,
            skills: [createBossSkill("폭열 댄스", "[부가 효과: 화상] 춤추듯 움직이며 주변을 불바다로 만듭니다.", SkillType.PHYSICAL, 380, 90, "STR*3.8")]
        },
        "칸쿤": {
            id:"boss_kankoon",
            name: "카리브해의 산호룡",
            title: "옥색 바다의 수호수",
            shinryokuType: "해수계",
            description: "투명한 카리브해 바닥에서 자라난 거대한 산호 용입니다.",
            specialLoot: "에메랄드 펄 이어링",
            detailedLoot: {
                name: "카리브의 눈물",
                type: "Accessory",
                rarity: ItemRarity.UNIQUE,
                description: "바다의 평화를 상징하는 에메랄드 귀걸이.",
                stats: { wis: 200, def: 80, hp: 300 },
                secondaryOptions: ["WIS +20%", "상태이상 저항 +15%", "해수계 속성 저항 +20%"],
                enhancement: 0,
                imageUrl:"https://i.ibb.co/TqqZsqFV/Gemini-Generated-Image-bw48b1bw48b1bw48.png"
            },
            visualUrl: "https://i.ibb.co/S430cGRB/Gemini-Generated-Image-5q4hho5q4hho5q4h.png",
            level: 420,
            skills: [createBossSkill("아쿠아 프리즘", "빛을 굴절시켜 적의 눈을 멀게 하고 피해를 입힙니다.", SkillType.MAGIC, 400, 100, "INT*4.0")]
        }
    },
    "브라질": {
        "브라질리아": {
            id:"boss_brazilia",
            name: "아마존 플로라 드래곤",
            title: "정글의 군주",
            shinryokuType: "초화계",
            description: "브라질의 심장, 아마존에서 태어난 거대한 식물형 드래곤입니다.",
            specialLoot: "만물의 생명 결정",
            detailedLoot: {
                name: "위그드라실의 씨앗",
                type: "SubWeapon",
                weaponType: "Orb",
                rarity: ItemRarity.LEGENDARY,
                description: "어떤 황폐한 땅에서도 생명을 피워내는 태초의 씨앗.",
                stats: { wis: 230, hp: 500 },
                secondaryOptions: ["WIS +30%", "모든 능력치 +15%", "초화계 속성 저항 +25%"],
                enhancement: 0,
                imageUrl:"https://i.ibb.co/LdfGZFXY/Gemini-Generated-Image-ec0xyyec0xyyec0x.png"
            },
            visualUrl: "https://i.ibb.co/Zp4jP18H/Gemini-Generated-Image-v3184uv3184uv318.png",
            level: 480,
            skills: [createBossSkill("정글의 진노", "[부가 효과: 속박] 전장을 가시 덩굴로 덮어 적들을 유린합니다.", SkillType.MAGIC, 500, 130, "INT*5.0")]
        },
        "상파울루": {
            id:"boss_sangpaolo",
            name: "콘크리트 비헤모스",
            title: "도시의 파괴자",
            shinryokuType: "대지계",
            description: "끊임없이 팽창하는 도시의 잔해들을 먹고 자란 금속성 마수입니다.",
            specialLoot: "비헤모스의 단단한 가죽",
            detailedLoot: {
                name: "어반 가디언 플레이트",
                type: "Body",
                rarity: ItemRarity.UNIQUE,
                description: "현대 문명의 어떤 무기도 막아내는 단단한 갑옷.",
                stats: { def: 250, hp: 800 },
                secondaryOptions: ["DEF +40%", "물리 방어력 +15%", "모든 능력치 +10%"],
                enhancement: 0,
                imageUrl:"https://i.ibb.co/DHm5GVQ6/Gemini-Generated-Image-vbsp1rvbsp1rvbsp.png"
            },
            visualUrl: "https://i.ibb.co/Q7dWTCw6/Gemini-Generated-Image-l6kszl6kszl6kszl.png",
            level: 450,
            skills: [createBossSkill("도시 붕괴", "[부가 효과: 파열] 발을 굴러 전방의 모든 것을 파괴합니다.", SkillType.PHYSICAL, 420, 110, "STR*4.2")]
        },
        "리우데자네이루": {
            id:"boss_liudezaneiro",
            name: "삼바 댄서 팬텀",
            title: "정열의 그림자",
            shinryokuType: "월광계",
            description: "삼바 축제의 열기가 밤이 되어 식지 못하고 영체로 변한 존재입니다.",
            specialLoot: "축제 여왕의 가면",
            detailedLoot: {
                name: "카니발 나이트 마스크",
                type: "Head",
                rarity: ItemRarity.UNIQUE,
                description: "보는 이의 정신을 아득하게 만드는 화려한 가면.",
                stats: { agi: 190, ctrl: 100, wis: 60 },
                secondaryOptions: ["CTRL +25%", "월광계 속성 저항 +25%", "치명타율 +18%"],
                enhancement: 0,
                imageUrl:"https://i.ibb.co/5XrMD5rX/Gemini-Generated-Image-528d2w528d2w528d.png"
            },
            visualUrl: "https://i.ibb.co/DP20nrVV/Gemini-Generated-Image-6g4t6y6g4t6y6g4t.png",
            level: 440,
            skills: [createBossSkill("매혹의 난무", "[부가 효과: 혼란] 현란한 움직임으로 적을 농락합니다.", SkillType.DEBUFF, 0, 100, "Confusion(80%), ALL_STATS -20%")]
        }
    },
    "아르헨티나": {
        "부에노스아이레스": {
            id: "boss_buenosaires",
            name: "탱고 쉐도우 블레이드",
            title: "그림자의 무용수",
            shinryokuType: "암흑계",
            description: "황혼의 거리에 나타나 날카로운 칼날처럼 춤추는 그림자 기사입니다.",
            specialLoot: "그림자 칼날의 조각",
            detailedLoot: {
                name: "미드나잇 탱고 레이피어",
                type: "Weapon",
                weaponType: "Sword",
                rarity: ItemRarity.UNIQUE,
                description: "바람을 가르듯 빠르고 치명적인 그림자 검.",
                stats: { str: 200, agi: 140, ctrl: 60 },
                secondaryOptions: ["AGI +35%", "암흑계 속성 부여", "치명타율 +12%"],
                enhancement: 0,
                imageUrl:"https://i.ibb.co/ZzLsfHcj/Gemini-Generated-Image-67qc8k67qc8k67qc.png"
            },
            visualUrl: "https://i.ibb.co/S40T7ymW/Gemini-Generated-Image-tvnwfqtvnwfqtvnw.png",
            level: 470,
            skills: [createBossSkill("암흑의 스텝", "[부가 효과: 암흑] 적의 시야를 가리고 치명타를 입힙니다.", SkillType.PHYSICAL, 480, 110, "AGI*4.8")]
        },
        "코르도바": {
            id:"boss_cordova",
            name: "안데스 콘도르 로드",
            title: "높은 고도의 주권자",
            shinryokuType: "질풍계",
            description: "안데스 산맥의 꼭대기에서 폭풍을 몰고 내려오는 신수입니다.",
            specialLoot: "창공의 날개깃",
            detailedLoot: {
                name: "안데스의 지배자 망토",
                type: "Body",
                rarity: ItemRarity.UNIQUE,
                description: "하늘의 기류를 제어하는 거대한 깃털 망토.",
                stats: { agi: 220, wis: 80 },
                secondaryOptions: ["AGI +30%", "질풍계 속성 저항 +25%", "물리 공격력 +20%"],
                enhancement: 0,
                imageUrl:"https://i.ibb.co/KcyHcnsX/Gemini-Generated-Image-5k16m95k16m95k16.png"
            },
            visualUrl: "https://i.ibb.co/hRQM8Mcz/Gemini-Generated-Image-avcjw5avcjw5avcj.png",
            level: 430,
            skills: [createBossSkill("대폭풍의 포효", "[부가 효과: 혼란] 소용돌이치는 바람으로 적들을 무력화합니다.", SkillType.MAGIC, 450, 120, "AGI*4.5")]
        }
    }
};
