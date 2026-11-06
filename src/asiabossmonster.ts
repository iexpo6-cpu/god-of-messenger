
import { ClassTier, SkillType, ItemRarity, Skill, SkillTarget, Item } from './types';
import { BossData } from './bossMonsters';

const createBossSkill = (name: string, desc: string, type: SkillType, ratio: number, mp: number, formula: string, target: SkillTarget = 'single'): Skill => ({
    name, description: desc, type, tier: ClassTier.FINAL, level: 10, maxLevel: 10, currentMastery: 0, mpCost: mp, powerRatio: ratio, effectFormula: formula, targetType: target
});

export const ASIA_BOSSES: Record<string, Record<string, BossData>> = {
    "북한": {
        "평양": {
            id: "boss_pyongyang",
            name: "대동강 철갑거신",
            title: "평양성 대성문 파수꾼",
            shinryokuType: "대지계",
            description: "대동강 물줄기 깊은 바닥에 잠겨 있던 고대 거대 돌인형에 무쇠 갑옷을 입힌 수호신이 신력을 받아 평양성 대성문을 지키기 위해 깨어났습니다.",
            specialLoot: "대동강 거신의 철갑 비늘",
            detailedLoot: {
                name: "대동강 철갑 가슴보호구",
                type: "Body",
                rarity: ItemRarity.LEGENDARY,
                description: "대동강 철갑거신의 단단한 비늘을 녹여 정성껏 제련한 몸보호구입니다. 그 어떤 예리한 칼날도 가볍게 막아냅니다.",
                stats: { def: 250, hp: 800 },
                secondaryOptions: ["물리 방어력 +35%", "최대 HP +25%", "대지계 속성 저항 +20%","최종 능력치 +15%"],
                enhancement: 0,
                imageUrl: "https://i.ibb.co/PsJWqQGT/Kakao-Talk-20260920-143323714-14.png"
            },
            visualUrl: "https://i.ibb.co/pB8WPfth/Kakao-Talk-20260920-143323714-15.png",
            level: 500,
            skills: [
                createBossSkill("수호신의 대격돌", "대지를 강하게 내리쳐 파편을 쏟아붓고 모든 적에게 강력한 타격을 입힙니다.", SkillType.PHYSICAL, 500, 100, "STR*5.0"),
                createBossSkill("강철 가드가 발동했습니다", "자신의 몸을 단단하게 감싸 일시적으로 무적 상태가 됩니다.", SkillType.BUFF, 0, 150, "HP 20% 회복, DEF +100%", "self")
            ]
        },
        "나선": {
            id: "boss_nason",
            name: "나선 해무마수",
            title: "동해의 영해 침입자",
            shinryokuType: "해수계",
            description: "동해 북방의 나선 앞바다 자욱한 해무 속에서 태어나 선박을 삼키고 바다의 거대 폭풍을 일으키는 무시무시한 물빛 정령 괴수입니다.",
            specialLoot: "나선 해무의 숨결 보석",
            detailedLoot: {
                name: "해무의 서린 가락지",
                type: "Accessory",
                rarity: ItemRarity.UNIQUE,
                description: "안개가 가득 낀 나선 바다의 마력이 깃든 은가락지입니다. 정신을 맑게 유지해 줍니다.",
                stats: { int: 180, wis: 150, ctrl: 100 },
                secondaryOptions: ["마법 공격력 +20%", "최대 MP +20%", "해수계 속성 피해 +15%"],
                enhancement: 0,
                imageUrl: "https://i.ibb.co/kYrRTzt/Kakao-Talk-20260920-143323714-13.png"
            },
            visualUrl: "https://i.ibb.co/nMd4fkMp/Gemini-Generated-Image-bpsrftbpsrftbpsr.png",
            level: 390,
            skills: [
                createBossSkill("해무의 소용돌이", "자욱한 안개와 함께 거대한 해수를 분사하여 적을 휘감습니다.", SkillType.MAGIC, 450, 110, "INT*4.5")
            ]
        },
        "개성": {
            id: "boss_kaesong",
            name: "만월대 고려 망령왕",
            title: "잃어버린 황궁의 원혼",
            shinryokuType: "암흑계",
            description: "개성 만월대 고려 황궁 터에 머무르며 천년 전의 옛 영광을 그리워하던 군주의 영혼이 원한과 집착으로 타오르고 있습니다.",
            specialLoot: "고려 황실의 옥새",
            detailedLoot: {
                name: "만월대 군주의 투구",
                type: "Head",
                rarity: ItemRarity.UNIQUE,
                description: "고려 황실의 군주가 착용했던 장엄하고 튼튼한 청동 투구입니다. 장엄한 황실의 기품이 흐릅니다.",
                stats: { def: 180, wis: 150, ctrl: 80 },
                secondaryOptions: ["물리 방어력 +22%", "상태이상 저항 +15%", "MP +30%"],
                enhancement: 0,
                imageUrl: "https://i.ibb.co/G3fXh0sH/Kakao-Talk-20260920-143323714-11.png"
            },
            visualUrl: "https://i.ibb.co/dJJXH0CD/Kakao-Talk-20260920-143323714-12.png",
            level: 445,
            skills: [
                createBossSkill("황실의 어두운 진격", "수많은 망령 군대를 소환하여 전방의 모든 방어선을 무자비하게 돌파합니다.", SkillType.PHYSICAL, 520, 120, "STR*5.2")
            ]
        },
        "신의주": {
            id: "boss_sinuiju",
            name: "압록강 얼음 악어",
            title: "북방 경계의 추격자",
            shinryokuType: "빙결계",
            description: "신의주 인근 압록강이 꽁꽁 얼어붙을 때만 주로 모습을 드러내 국경을 침범하는 마수로, 온몸이 단단한 빙결 결정으로 굳어 있습니다.",
            specialLoot: "압록강 서리 송곳니",
            detailedLoot: {
                name: "서리 가득한 압록 검",
                type: "Weapon",
                weaponType: "Sword",
                rarity: ItemRarity.UNIQUE,
                description: "혹한의 얼어붙은 강물에서 건져낸 예리한 검입니다. 휘두를 때마다 날카로운 얼음 파편이 튀며 적을 얼립니다.",
                stats: { str: 190, agi: 130 },
                secondaryOptions: ["물리 공격력 +25%", "치명타 확률 +15%", "빙결계 속성 피해 +15%"],
                enhancement: 0,
                imageUrl: "https://i.ibb.co/1t4wJNBh/Kakao-Talk-20260920-143323714-09.png"
            },
            visualUrl: "https://i.ibb.co/k65ygd4F/Kakao-Talk-20260920-143323714-10.png",
            level: 430,
            skills: [
                createBossSkill("빙결 강타", "꽁꽁 얼어붙은 꼬리로 적을 후려쳐 차가운 냉기를 심어줍니다.", SkillType.PHYSICAL, 480, 100, "STR*4.8")
            ]
        },
        "원산": {
            id: "boss_wonsan",
            name: "갈마 해소 기린",
            title: "갈마 해변의 불타는 파수꾼",
            shinryokuType: "화염계",
            description: "원산 갈마 반도의 아름다운 백사장에서 바다를 보며 기나긴 세월 동안 마력을 모은 상서로운 신수로, 화염의 숨결로 바다를 불태웁니다.",
            specialLoot: "갈마 기린의 타오르는 뿔",
            detailedLoot: {
                name: "갈마 해변의 불꽃 너클",
                type: "Weapon",
                weaponType: "Knuckle",
                rarity: ItemRarity.UNIQUE,
                description: "화염의 기운이 온전하게 서린 너클로, 주먹을 지를 때마다 강렬한 화상을 적에게 안겨줍니다.",
                stats: { str: 180, agi: 140 },
                secondaryOptions: ["물리 공격력 +20%", "AGI +35%", "화염계 속성 부여"],
                enhancement: 0,
                imageUrl: "https://i.ibb.co/yFzb6SQT/Kakao-Talk-20260920-143323714-07.png"
            },
            visualUrl: "https://i.ibb.co/gLq4zcVt/Kakao-Talk-20260920-143323714-08.png",
            level: 410,
            skills: [
                createBossSkill("타오르는 노호", "화염계 마력을 사방에 흩뿌려 모든 것을 불살라 버립니다.", SkillType.MAGIC, 510, 115, "INT*5.1")
            ]
        },
        "함흥": {
            id: "boss_hamhung",
            name: "함흥 설한의 백사",
            title: "함흥 설산의 얼어붙은 분노",
            shinryokuType: "빙결계",
            description: "함흥 인근 산맥의 깊고 척박한 혹한 속에서 기나긴 겨울잠을 자며 냉기의 신력을 비축한 거대 백사입니다. 입김 하나로 주변의 모든 강을 얼려 버립니다.",
            specialLoot: "설한 백사의 냉기 정수",
            detailedLoot: {
                name: "설한의 백사 반지",
                type: "Accessory",
                rarity: ItemRarity.UNIQUE,
                description: "얼음처럼 차가운 마력이 충만하게 서려 있어, 주문을 캐스팅할 때 마법 위력을 안전하게 폭발시켜 줍니다.",
                stats: { int: 120, wis: 100 },
                secondaryOptions: ["마법 공격력 +15%", "MP +25%", "최대 HP +10%"],
                enhancement: 0,
                imageUrl: "https://i.ibb.co/TxpWr7z6/Kakao-Talk-20260920-143323714-05.png"
            },
            visualUrl: "https://i.ibb.co/Mxc4FcF3/Gemini-Generated-Image-6cpghw6cpghw6cpg.png",
            level: 415,
            skills: [
                createBossSkill("절대 서리의 손길", "차가운 절대영도의 서리 충격파를 내보내어 전장의 열기를 모두 앗아갑니다.", SkillType.MAGIC, 460, 105, "INT*4.6")
            ]
        },
        "청진": {
            id: "boss_chongjin",
            name: "청진 용광로 불새",
            title: "제철소의 백열 화마",
            shinryokuType: "화염계",
            description: "청진 대제철소의 백열 용광로 굴뚝 인근에서 뿜어져 나오는 극도의 마력 열기를 빨아들이며 영예롭게 태어난 불새 마수입니다.",
            specialLoot: "제철 용광로의 불꽃 깃털",
            detailedLoot: {
                name: "청진 제철 불새의 깃털 검",
                type: "Weapon",
                weaponType: "Sword",
                rarity: ItemRarity.UNIQUE,
                description: "백열하는 무쇠를 제련해 만든 깃털 모양 검으로, 공격 시 화염 공격력이 극대화됩니다.",
                stats: { str: 170, agi: 120 },
                secondaryOptions: ["물리 공격력 +20%", "치명타 확률 +12%", "STR +20%"],
                enhancement: 0,
                imageUrl: "https://i.ibb.co/N2Kt4MTn/Kakao-Talk-20260920-143323714-03.png"
            },
            visualUrl: "https://i.ibb.co/Zzv9VdpL/Kakao-Talk-20260920-143323714-04.png",
            level: 400,
            skills: [
                createBossSkill("화열 날개짓", "시뻘건 불꽃의 열풍을 일으켜 적진 전체를 불바다로 물들여 뜨거운 도트를 겁니다.", SkillType.MAGIC, 490, 110, "INT*4.9")
            ]
        }
    },
    "인도": {
        "뉴델리": {
            id:"boss_newdeli",
            name: "브라만 거신", title: "창조의 파수꾼", shinryokuType: "광휘계",
            description: "인도의 고대 지혜가 깃든 거대 석상입니다. 네 개의 얼굴로 전장을 감시합니다.",
            specialLoot: "브라만의 진리 보주",
            detailedLoot: {
                name: "브라만의 진리 보주", type: "SubWeapon", weaponType: "Orb", rarity: ItemRarity.UNIQUE,
                description: "우주의 섭리가 담긴 보주. 착용자의 지력을 한계까지 끌어올립니다.",
                stats: { int: 180, wis: 160, ctrl: 150 },
                secondaryOptions: ["마법 공격력 +20%", "상태이상 저항 +25%", "광휘계 속성 저항 +25%"],
                enhancement: 0,
                imageUrl:"https://i.ibb.co/SwBgG2cc/Gemini-Generated-Image-z6chnpz6chnpz6ch.png"
            },
            visualUrl: "https://i.ibb.co/5gXJHpJG/Gemini-Generated-Image-dg224udg224udg22.png", level: 450,
            skills: [createBossSkill("만물의 근원", "[부가 효과: 소멸] 모든 에너지를 하나로 모아 폭발시킵니다.", SkillType.MAGIC, 550, 150, "INT*5.5")]
        },
        "뭄바이": {
            id:"boss_mumbai",
            name: "몬순 나카", title: "폭풍의 바다뱀", shinryokuType: "해수계",
            description: "인도양의 거센 폭풍우와 함께 나타나는 거대 수룡입니다.",
            specialLoot: "나가의 푸른 독니",
            detailedLoot: {
                name: "나가의 푸른 독니", type: "Weapon", weaponType: "Sword", rarity: ItemRarity.UNIQUE,
                description: "맹독과 수기가 서린 날카로운 검.",
                stats: { str: 170, agi: 90 },
                secondaryOptions: ["치명타율 +20%", "물리 공격력 +18%", "해수계 속성 부여"],
                enhancement: 0,
                imageUrl:"https://i.ibb.co/9H7gYBRF/Gemini-Generated-Image-n16ra8n16ra8n16r.png"
            },
            visualUrl: "https://i.ibb.co/q3vpSV1G/Gemini-Generated-Image-7j0i4f7j0i4f7j0i.png", level: 430,
            skills: [createBossSkill("심연의 침식", "[부가 효과: 빙결] 차가운 수압으로 적을 얼려버립니다.", SkillType.MAGIC, 450, 110, "INT*4.5")]
        },
        "벵갈루루": {
            id:"boss_bengalulu",
            name: "테크 가루다", title: "마법 공학의 신수", shinryokuType: "전격계",
            description: "첨단 마법 공학 기술로 강화된 가루다 기계 생명체입니다.",
            specialLoot: "가루다의 전동 코어",
            detailedLoot: {
                name: "가루다의 전동 코어", type: "Accessory", rarity: ItemRarity.UNIQUE,
                description: "번개의 힘을 증폭시키는 마법 공학 코어.",
                stats: { agi: 190, ctrl: 60 },
                secondaryOptions: ["AGI +20%", "물리 공격력 +20%", "전격계 속성 부여"],
                enhancement: 0,
                imageUrl:"https://i.ibb.co/q3rkyhYt/Gemini-Generated-Image-sn8inssn8inssn8i.png"
            },
            visualUrl: "https://i.ibb.co/1tCL7VMz/Gemini-Generated-Image-p4qz5kp4qz5kp4qz.png", level: 420,
            skills: [createBossSkill("플라즈마 다이브", "[부가 효과: 감전] 초고속으로 하강하며 전격을 방출합니다.", SkillType.PHYSICAL, 500, 120, "AGI*5.0")]
        },
        "첸나이": {
            id:"boss_chenai",
            name: "드라비다 타이탄", title: "남부의 철벽", shinryokuType: "대지계",
            description: "해안가의 암석들이 뭉쳐 탄생한 육중한 거인입니다.",
            specialLoot: "해안 절벽의 방패",
            detailedLoot: {
                name: "타이탄의 해안 방패", type: "SubWeapon", weaponType: "Shield", rarity: ItemRarity.UNIQUE,
                description: "파도와 시간의 흐름을 견뎌낸 단단한 방패.",
                stats: { def: 220, hp: 500 },
                secondaryOptions: ["물리 방어력 +22%", "상태이상 저항 +12%", "대지계 속성 부여"],
                enhancement: 0,
                imageUrl:"https://i.ibb.co/kvMf5zP/Gemini-Generated-Image-1jqsa21jqsa21jqs.png"
            },
            visualUrl: "https://i.ibb.co/XZhFYHFj/Gemini-Generated-Image-716cxd716cxd716c.png", level: 410,
            skills: [createBossSkill("대지 분쇄", "[부가 효과: 파열] 지면을 부숴 방어 체계를 무너뜨립니다.", SkillType.PHYSICAL, 400, 100, "STR*4.0")]
        }
    },
    "태국": {
        "방콕": {
            id:"boss_bangkok",
            name: "에라완 가디언", title: "삼두 코끼리신", shinryokuType: "신체강화계",
            description: "신성한 세 머리 코끼리가 왕실의 기운을 받아 현신했습니다.",
            specialLoot: "에라완의 상아창",
            detailedLoot: {
                name: "에라완의 상아창", type: "Weapon", weaponType: "Spear", rarity: ItemRarity.UNIQUE,
                description: "상아를 깎아 만든 신성한 창. 파괴적인 힘을 자랑합니다.",
                stats: { str: 200, agi: 160 },
                secondaryOptions: ["STR +25%", "물리 공격력 +22%", "신체강화계 속성 부여"],
                enhancement: 0,
                imageUrl:"https://i.ibb.co/Dfc3kTLz/Gemini-Generated-Image-mdzopfmdzopfmdzo.png"
            },
            visualUrl: "https://i.ibb.co/hRdzvbDL/Gemini-Generated-Image-498xp8498xp8498x.png", level: 440,
            skills: [createBossSkill("삼두의 돌격", "[부가 효과: 파열] 저지할 수 없는 강력한 돌격입니다.", SkillType.PHYSICAL, 550, 130, "STR*5.5")]
        },
        "치앙마이": {
            id:"boss_chiangmai",
            name: "란나 스피릿", title: "북부의 수호령", shinryokuType: "질풍계",
            description: "치앙마이의 고대 사원과 산맥을 지키는 신비로운 정령입니다.",
            specialLoot: "란나의 은빛 부채",
            detailedLoot: {
                name: "란나의 은빛 부채", type: "Accessory", rarity: ItemRarity.UNIQUE,
                description: "바람을 다스리는 은빛 부채.",
                stats: { int: 80, agi: 150, ctrl: 80 },
                secondaryOptions: ["AGI +20%", "질풍계 속성 피해 +25%", "상태이상 저항 +15%"],
                enhancement: 0,
                imageUrl:"https://i.ibb.co/4w840D2J/Gemini-Generated-Image-b4kmotb4kmotb4km.png"
            },
            visualUrl: "https://i.ibb.co/vvvg9XRS/Gemini-Generated-Image-hh66nqhh66nqhh66.png", level: 420,
            skills: [createBossSkill("천년의 미풍", "[부가 효과: 속박] 적의 움직임을 묶는 부드러운 바람입니다.", SkillType.MAGIC, 450, 110, "INT*4.5")]
        },
        "푸켓": {
            id:"boss_phuket",
            name: "안다만 크라켄", title: "비취색 바다의 악몽", shinryokuType: "해수계",
            description: "푸켓 해안 깊은 곳에 잠들어 있던 거대 연체 괴수입니다.",
            specialLoot: "안다만의 진주핵",
            detailedLoot: {
                name: "안다만의 진주핵", type: "SubWeapon", weaponType: "Orb", rarity: ItemRarity.UNIQUE,
                description: "바다의 마력이 응축된 거대한 진주.",
                stats: { int: 210, wis: 140, hp: 500 },
                secondaryOptions: ["마법 공격력 +20%", "해수계 속성 피해 +25%", "MP +25%"],
                enhancement: 0,
                imageUrl:"https://i.ibb.co/B5dnWkPT/Gemini-Generated-Image-6kqi8q6kqi8q6kqi.png"
            },
            visualUrl: "https://i.ibb.co/7d0LGxLN/Gemini-Generated-Image-giux96giux96giux.png", level: 430,
            skills: [createBossSkill("심해의 소용돌이", "[부가 효과: 빙결] 모든 것을 삼키는 거대한 소용돌이입니다.", SkillType.MAGIC, 500, 140, "INT*5.0")]
        },
        "파타야": {
            id:"boss_pattaya",
            name: "워킹 스트리트 팬텀", title: "화려한 밤의 그림자", shinryokuType: "암흑계",
            description: "파타야의 화려한 네온사인 뒤에 숨어있는 어두운 기운의 집합체입니다.",
            specialLoot: "네온 섀도우 망토",
            detailedLoot: {
                name: "네온 섀도우 망토", type: "Body", rarity: ItemRarity.UNIQUE,
                description: "빛과 어둠이 교차하는 신비로운 망토.",
                stats: { def: 190, agi: 220, ctrl: 100 },
                secondaryOptions: ["치명타율 +20%", "암흑계 속성 피해 +35%", "AGI +15%"],
                enhancement: 0,
                imageUrl:"https://i.ibb.co/5xx8825P/Gemini-Generated-Image-ic514oic514oic51.png"
            },
            visualUrl: "https://i.ibb.co/j9sxVYBW/Gemini-Generated-Image-4eefwy4eefwy4eef.png", level: 410,
            skills: [createBossSkill("환각의 네온", "[부가 효과: 혼란] 적의 정신을 어지럽히는 빛의 잔상입니다.", SkillType.MAGIC, 420, 100, "INT*4.2")]
        }
    },
    "베트남": {
        "하노이": {
            id:"boss_hanoi",
            name: "환검의 신구", title: "호안끼엠의 수호수", shinryokuType: "해수계",
            description: "고대 전설 속의 거대 거북이가 신검을 지키기 위해 다시 깨어났습니다.",
            specialLoot: "호안끼엠의 단도",
            detailedLoot: {
                name: "호안끼엠의 단도", type: "SubWeapon", weaponType: "SubSword", rarity: ItemRarity.UNIQUE,
                description: "전설의 신검 조각으로 만든 단검.",
                stats: { str: 160, agi: 150 },
                secondaryOptions: ["물리 공격력 +24%", "치명타율 +12%", "해수계 속성 피해 +20%"],
                enhancement: 0,
                imageUrl:"https://i.ibb.co/b5QwP4K3/Gemini-Generated-Image-lql7d2lql7d2lql7.png"
            },
            visualUrl: "https://i.ibb.co/QFRBvVGQ/Gemini-Generated-Image-st9xu1st9xu1st9x.png", level: 440,
            skills: [createBossSkill("호수의 심판", "[부가 효과: 빙결] 거대한 물기둥으로 적을 압박합니다.", SkillType.MAGIC, 520, 130, "INT*5.2")]
        },
        "호치민": {
            id:"boss_hochiminh",
            name: "메콩 델타 서펀트", title: "남부의 수룡", shinryokuType: "해수계",
            description: "메콩강 하구의 거대한 삼각주를 지배하는 거대 수룡입니다.",
            specialLoot: "델타의 푸른 비늘",
            detailedLoot: {
                name: "델타의 수룡 갑옷", type: "Body", rarity: ItemRarity.UNIQUE,
                description: "수룡의 비늘로 만든 가볍고 튼튼한 갑옷.",
                stats: { def: 200, agi: 180, hp: 600 },
                secondaryOptions: ["물리 방어력 +22%", "해수계 속성 저항 +25%", "상태이상 저항 +15%"],
                enhancement: 0,
                imageUrl:"https://i.ibb.co/BvC15t2/Gemini-Generated-Image-omvf37omvf37omvf.png"
            },
            visualUrl: "https://i.ibb.co/gbPpZm1N/Gemini-Generated-Image-jxxl9wjxxl9wjxxl.png", level: 430,
            skills: [createBossSkill("범람하는 의지", "[부가 효과: 속박] 거센 물살로 적의 행동을 제약합니다.", SkillType.MAGIC, 480, 120, "INT*4.8")]
        },
        "다낭": {
            id:"boss_danang",
            name: "마블 마운틴 타이탄", title: "오행산의 거신", shinryokuType: "대지계",
            description: "다낭의 명소 오행산(마블 마운틴)의 정기가 뭉쳐 탄생한 바위 거인입니다.",
            specialLoot: "오행의 대지 반지",
            detailedLoot: {
                name: "오행의 대지 반지", type: "Accessory", rarity: ItemRarity.UNIQUE,
                description: "다섯 가지 원소의 기운이 깃든 대지의 반지.",
                stats: { str: 150, def: 150, hp: 1000 },
                secondaryOptions: ["물리 방어력 +25%", "대지계 속성 저항 +30%", "모든 능력치 +10%"],
                enhancement: 0,
                imageUrl:"https://i.ibb.co/0y7qXTF3/Gemini-Generated-Image-fda2qgfda2qgfda2.png"
            },
            visualUrl: "https://i.ibb.co/Fj7Vb4Z/Gemini-Generated-Image-k736ik736ik736ik.png", level: 425,
            skills: [createBossSkill("산맥의 무게", "[부가 효과: 파열] 대상을 짓누르는 압도적인 중량 공격입니다.", SkillType.PHYSICAL, 550, 130, "STR*5.5")]
        },
        "나트랑": {
            id:"boss_natrang",
            name: "산호초의 가디언", title: "해안의 파수꾼", shinryokuType: "해수계",
            description: "나트랑의 아름다운 산호초와 바다를 지키는 고대 생명체입니다.",
            specialLoot: "산호의 마법 지팡이",
            detailedLoot: {
                name: "산호의 마법 지팡이", type: "Weapon", weaponType: "Staff", rarity: ItemRarity.UNIQUE,
                description: "바다의 마력이 깃든 아름다운 산호 지팡이.",
                stats: { int: 220, wis: 180 },
                secondaryOptions: ["마법 공격력 +25%", "해수계 속성 부여", "상태이상 저항 +20%"],
                enhancement: 0,
                imageUrl:"https://i.ibb.co/qFn3Bmz1/Gemini-Generated-Image-b7qphbb7qphbb7qp.png"
            },
            visualUrl: "https://i.ibb.co/6J774Db2/Gemini-Generated-Image-rpb80orpb80orpb8.png", level: 415,
            skills: [createBossSkill("치유의 파도", "아군을 치유하고 적을 밀쳐내는 파도입니다.", SkillType.MAGIC, 400, 100, "INT*4.0")]
        }
    },
    "필리핀": {
        "마닐라": {
            id:"boss_manila",
            name: "봉인된 바쿠나와", title: "달을 집어삼키는 용", shinryokuType: "암흑계",
            description: "필리핀 신화 속 거대 해룡입니다. 밤이 되면 달을 먹기 위해 나타난다고 합니다.",
            specialLoot: "바쿠나와의 그림자 갑옷",
            detailedLoot: {
                name: "바쿠나와의 그림자 갑옷", type: "Body", rarity: ItemRarity.UNIQUE,
                description: "빛을 흡수하는 칠흑의 비늘 갑옷.",
                stats: { def: 210, agi: 170, hp: 700 },
                secondaryOptions: ["물리 방어력 +25%", "상태이상 저항 +20%", "암흑계 속성 부여"],
                enhancement: 0,
                imageUrl:"https://i.ibb.co/MycPXNjs/Gemini-Generated-Image-m7xslgm7xslgm7xs.png"
            },
            visualUrl: "https://i.ibb.co/xbS15Sf/Gemini-Generated-Image-wxq603wxq603wxq6.png", level: 440,
            skills: [createBossSkill("월식의 포효", "[부가 효과: 공포] 모든 빛을 집어삼켜 적들을 위축시킵니다.", SkillType.DEBUFF, 0, 130, "ALL_STATS -20%")]
        },
        "세부": {
            id:"boss_cebu",
            name: "마젤란의 망령", title: "비탄의 정복자", shinryokuType: "광휘계",
            description: "세부 해안에서 쓰러진 고대 정복자의 의지가 신성한 빛과 섞여 탄생한 영체입니다.",
            specialLoot: "정복자의 십자가 검",
            detailedLoot: {
                name: "정복자의 십자가 검", type: "Weapon", weaponType: "Sword", rarity: ItemRarity.UNIQUE,
                description: "신성한 기운이 깃든 고대의 검.",
                stats: { str: 180, wis: 160, agi: 100 },
                secondaryOptions: ["물리 공격력 +22%", "광휘계 속성 부여", "치명타율 +15%"],
                enhancement: 0,
                imageUrl:"https://i.ibb.co/W4b5rtC1/Gemini-Generated-Image-omu6edomu6edomu6.png"
            },
            visualUrl: "https://i.ibb.co/9985TBDZ/Gemini-Generated-Image-rskbpcrskbpcrskb.png", level: 420,
            skills: [createBossSkill("성스러운 일격", "[부가 효과: 소멸] 적을 정화하는 강력한 빛의 참격입니다.", SkillType.PHYSICAL, 500, 120, "STR*5.0")]
        },
        "다바오": {
            id:"boss_davao",
            name: "아포 산의 거신", title: "필리핀의 지붕", shinryokuType: "대지계",
            description: "필리핀에서 가장 높은 아포 산의 정기가 뭉쳐 탄생한 거대 괴수입니다.",
            specialLoot: "아포 산의 화산석 갑옷",
            detailedLoot: {
                name: "아포 산의 화산석 갑옷", type: "Body", rarity: ItemRarity.UNIQUE,
                description: "화산석으로 만들어진 매우 단단한 갑옷.",
                stats: { def: 250, hp: 1200 },
                secondaryOptions: ["물리 방어력 +30%", "대지계 속성 저항 +25%", "상태이상 저항 +20%"],
                enhancement: 0,
                imageUrl:"https://i.ibb.co/Gfvf0Rqr/Gemini-Generated-Image-2zi9nt2zi9nt2zi9.png"
            },
            visualUrl: "https://i.ibb.co/9H6xMLNq/Gemini-Generated-Image-y1ixory1ixory1ix.png", level: 435,
            skills: [createBossSkill("대지 진동", "[부가 효과: 파열] 지면을 뒤흔들어 적의 방어력을 깎습니다.", SkillType.PHYSICAL, 450, 110, "STR*4.5")]
        }
    },
    "인도네시아": {
        "자카르타": {
            id:"boss_jakarta",
            name: "가루다", title: "천상의 주권자", shinryokuType: "광휘계",
            description: "신성한 빛의 날개를 가진 수호신 가루다가 현신했습니다.",
            specialLoot: "가루다의 성스러운 창",
            detailedLoot: {
                name: "가루다의 성스러운 창", type: "Weapon", weaponType: "Spear", rarity: ItemRarity.UNIQUE,
                description: "악을 멸하는 천상의 창.",
                stats: { str: 220, wis: 180 },
                secondaryOptions: ["물리 공격력 +25%", "광휘계 속성 부여", "모든 능력치 +18%"],
                enhancement: 0,
                imageUrl:"https://i.ibb.co/vCbRZdtH/Gemini-Generated-Image-aifp0iaifp0iaifp.png"
            },
            visualUrl: "https://i.ibb.co/fYT7gzQT/Gemini-Generated-Image-bncvxybncvxybncv.png", level: 445,
            skills: [createBossSkill("천상의 섬광", "[부가 효과: 소멸] 존재 자체를 신성한 빛으로 지워버립니다.", SkillType.MAGIC, 580, 160, "INT*5.8")]
        },
        "발리": {
            id:"boss_bali",
            name: "바롱의 화신", title: "선의 수호자", shinryokuType: "광휘계",
            description: "발리의 전통적인 선의 상징인 바롱이 신력을 받아 현신했습니다.",
            specialLoot: "바롱의 신성한 가면",
            detailedLoot: {
                name: "바롱의 신성한 가면", type: "Head", rarity: ItemRarity.UNIQUE,
                description: "악을 물리치는 신성한 힘이 깃든 가면.",
                stats: { def: 180, wis: 220, hp: 500 },
                secondaryOptions: ["상태이상 저항 +30%", "광휘계 속성 저항 +25%", "WIS +20%"],
                enhancement: 0,
                imageUrl:"https://i.ibb.co/xWSD3vZ/Gemini-Generated-Image-73uc1l73uc1l73uc.png"
            },
            visualUrl: "https://i.ibb.co/5hMG3vZj/Gemini-Generated-Image-3firz03firz03fir.png", level: 425,
            skills: [createBossSkill("정화의 춤", "아군 전체의 해로운 효과를 제거하고 체력을 회복합니다.", SkillType.BUFF, 0, 150, "HP 25% 회복, Cleanse", 'ally')]
        },
        "수라바야": {
            id:"boss_surabaya",
            name: "강철의 상어와 악어", title: "도시의 기원", shinryokuType: "강철계",
            description: "수라바야의 상징인 상어(Sura)와 악어(Baya)가 강철의 몸을 가진 괴수가 되어 나타났습니다.",
            specialLoot: "상어와 악어의 강철 이빨",
            detailedLoot: {
                name: "수라바야의 강철 단검", type: "Weapon", weaponType: "SubSword", rarity: ItemRarity.UNIQUE,
                description: "상어와 악어의 이빨처럼 날카로운 강철 단검.",
                stats: { str: 170, agi: 210 },
                secondaryOptions: ["물리 공격력 +25%", "강철계 속성 피해 +25%", "치명타율 +15%"],
                enhancement: 0,
                imageUrl:"https://i.ibb.co/JFxC2sv4/Gemini-Generated-Image-gsnl1igsnl1igsnl.png"
            },
            visualUrl: "https://i.ibb.co/DPTshDSn/Gemini-Generated-Image-kp8k5hkp8k5hkp8k.png", level: 430,
            skills: [createBossSkill("강철의 교차", "[부가 효과: 출혈] 상어와 악어의 협동 공격으로 적을 찢습니다.", SkillType.PHYSICAL, 520, 110, "STR*5.2")]
        }
    },
    "말레이시아": {
        "쿠알라룸푸르": {
            id:"boss_kualarumpur",
            name: "크리스 로드", title: "전설의 검령", shinryokuType: "무기강화계",
            description: "말레이시아의 전설적인 단검 크리스(Keris)의 의지가 형상화된 기사입니다.",
            specialLoot: "타밍 사리",
            detailedLoot: {
                name: "타밍 사리", type: "Weapon", weaponType: "Sword", rarity: ItemRarity.UNIQUE,
                description: "불사(不死)의 힘을 준다는 전설의 단검.",
                stats: { str: 190, agi: 190, ctrl: 70 },
                secondaryOptions: ["물리 공격력 +25%", "무기강화계 속성 부여", "상태이상 저항 +15%"],
                enhancement: 0,
                imageUrl:"https://i.ibb.co/G4gD5xgw/Gemini-Generated-Image-qax2i6qax2i6qax2.png"
            },
            visualUrl: "https://i.ibb.co/zTRny1wQ/Gemini-Generated-Image-er80amer80amer80.png", level: 435,
            skills: [createBossSkill("파동하는 칼날", "[부가 효과: 출혈] 적을 꿰뚫는 변칙적인 궤적의 일격입니다.", SkillType.PHYSICAL, 520, 110, "STR*5.2")]
        },
        "페낭": {
            id:"boss_penang",
            name: "조지타운의 연금술사", title: "지식의 탐구자", shinryokuType: "강철계",
            description: "페낭의 역사적인 거리에서 고대 지식과 현대 기술을 융합하는 연금술사입니다.",
            specialLoot: "연금술사의 증폭 코어",
            detailedLoot: {
                name: "연금술사의 증폭 코어", type: "Accessory", rarity: ItemRarity.UNIQUE,
                description: "마력을 증폭시키는 정교한 기계 코어.",
                stats: { int: 200, wis: 150, ctrl: 90 },
                secondaryOptions: ["마법 공격력 +20%", "강철계 속성 피해 +25%", "MP +30%"],
                enhancement: 0,
                imageUrl:"https://i.ibb.co/tMSyxwN1/Gemini-Generated-Image-8jrm7g8jrm7g8jrm-1.png"
            },
            visualUrl: "https://i.ibb.co/NdBHZrDM/Gemini-Generated-Image-actpjgactpjgactp.png", level: 415,
            skills: [createBossSkill("원소 붕괴", "[부가 효과: 소멸] 원소를 분해하여 강력한 폭발을 일으킵니다.", SkillType.MAGIC, 550, 130, "INT*5.5")]
        },
        "조호르바루": {
            id:"boss_johorbahru",
            name: "남부 관문의 파수꾼", title: "철벽의 기사", shinryokuType: "강철계",
            description: "말레이시아 남부의 관문을 지키는 육중한 강철 갑옷의 기사입니다.",
            specialLoot: "관문의 거대 방패",
            detailedLoot: {
                name: "관문의 거대 방패", type: "SubWeapon", weaponType: "Shield", rarity: ItemRarity.UNIQUE,
                description: "어떤 공격도 막아낼 것 같은 거대한 강철 방패.",
                stats: { def: 240, hp: 1500 },
                secondaryOptions: ["물리 방어력 +25%", "강철계 속성 저항 +25%", "상태이상 저항 +15%"],
                enhancement: 0,
                imageUrl:"https://i.ibb.co/DfwrLkCK/Gemini-Generated-Image-1yzae1yzae1yzae1.png"
            },
            visualUrl: "https://i.ibb.co/V0JLJPsV/Gemini-Generated-Image-x1yyu9x1yyu9x1yy.png", level: 425,
            skills: [createBossSkill("철벽의 돌진", "[부가 효과: 파열] 방패를 앞세워 적진을 붕괴시킵니다.", SkillType.PHYSICAL, 480, 120, "STR*4.8")]
        }
    },
    "싱가포르": {
        "싱가포르": {
            id:"boss_singapore",
            name: "머라이언 그랜드 콜로서스", title: "번영의 수호신", shinryokuType: "해수계",
            description: "상상의 동물 머라이언이 거대한 황금 석상이 되어 깨어났습니다.",
            specialLoot: "머라이언 가디언 쉴드",
            detailedLoot: {
                name: "머라이언 가디언 쉴드", type: "SubWeapon", weaponType: "Shield", rarity: ItemRarity.UNIQUE,
                description: "번영의 상징인 머라이언의 비늘로 장식된 방패.",
                stats: { def: 180, wis: 200, hp: 2000 },
                secondaryOptions: ["물리 방어력 +20%", "마법 방어력 +20%", "해수계 속성 저항 +25%"],
                enhancement: 0,
                imageUrl:"https://i.ibb.co/zW29Y0pg/Gemini-Generated-Image-ixu3cfixu3cfixu3.png"
            },
            visualUrl: "https://i.ibb.co/tPbSJv16/Gemini-Generated-Image-ww3lshww3lshww3l.png", level: 450,
            skills: [createBossSkill("번영의 해일", "[부가 효과: 빙결] 전장을 덮치는 압도적인 수압 공격입니다.", SkillType.MAGIC, 600, 180, "INT*6.0")]
        }
    },
    "사우디아라비아": {
        "리야드": {
            id:"boss_liyad",
            name: "이프리트의 환영", title: "불타는 신기루", shinryokuType: "태양계",
            description: "끝없는 사막의 열기가 빚어낸 거대한 화염 정령입니다.",
            specialLoot: "리야드의 태양 오브",
            detailedLoot: {
                name: "리야드의 태양 오브", type: "SubWeapon", weaponType: "Orb", rarity: ItemRarity.UNIQUE,
                description: "태양의 파편처럼 뜨겁게 요동치는 불꽃의 보주.",
                stats: { int: 230, str: 170 },
                secondaryOptions: ["태양계 속성 부여", "마법 공격력 +25%", "상태이상 저항 +20%"],
                enhancement: 0,
                imageUrl:"https://i.ibb.co/1GDK3mVD/Gemini-Generated-Image-atz1gjatz1gjatz1.png"
            },
            visualUrl: "https://i.ibb.co/67DrXPfn/Gemini-Generated-Image-z3v2p5z3v2p5z3v2.png", level: 450,
            skills: [createBossSkill("노바 익스플로전", "[부가 효과: 화상] 소규모 태양 폭발을 일으킵니다.", SkillType.MAGIC, 650, 180, "INT*6.5")]
        },
        "제다": {
            id:"boss_jeddah",
            name: "홍해의 수룡", title: "심해의 지배자", shinryokuType: "해수계",
            description: "홍해의 깊은 곳에서 올라온 거대 수룡입니다. 거센 파도를 자유자재로 다룹니다.",
            specialLoot: "홍해의 푸른 비늘",
            detailedLoot: {
                name: "홍해의 수룡 갑옷", type: "Body", rarity: ItemRarity.UNIQUE,
                description: "수룡의 비늘로 만든 신비로운 갑옷.",
                stats: { def: 220, agi: 150, hp: 800 },
                secondaryOptions: ["물리 방어력 +25%", "해수계 속성 저항 +25%", "상태이상 저항 +15%"],
                enhancement: 0,
                imageUrl:"https://i.ibb.co/wFvX8z0K/Gemini-Generated-Image-8rgu0m8rgu0m8rgu.png"
            },
            visualUrl: "https://i.ibb.co/jvSCzhRd/Gemini-Generated-Image-xcd88yxcd88yxcd8.png", level: 440,
            skills: [createBossSkill("해신의 해일", "[부가 효과: 빙결] 전장을 덮치는 거대한 파도입니다.", SkillType.MAGIC, 580, 160, "INT*5.8")]
        },
        "메카": {
            id:"boss_mecca",
            name: "성지의 수호자", title: "거룩한 빛의 기사", shinryokuType: "광휘계",
            description: "성지를 수호하기 위해 현신한 찬란한 빛의 기사입니다.",
            specialLoot: "성지의 빛나는 검",
            detailedLoot: {
                name: "성지의 빛나는 검", type: "Weapon", weaponType: "Sword", rarity: ItemRarity.UNIQUE,
                description: "악을 멸하는 찬란한 빛의 검.",
                stats: { str: 210, wis: 190, ctrl: 100 },
                secondaryOptions: ["물리 공격력 +28%", "광휘계 속성 부여", "상태이상 저항 +20%"],
                enhancement: 0,
                imageUrl:"https://i.ibb.co/qMNtchfT/Gemini-Generated-Image-ulq5nsulq5nsulq5.png"
            },
            visualUrl: "https://i.ibb.co/TBw646Cd/Gemini-Generated-Image-drcpytdrcpytdrcp.png", level: 460,
            skills: [createBossSkill("신성한 심판", "[부가 효과: 소멸] 적을 정화하는 강력한 빛의 일격입니다.", SkillType.PHYSICAL, 620, 150, "STR*6.2")]
        }
    },
    "UAE": {
        "아부다비": {
            id:"boss_abudabi",
            name: "제니스 팔콘", title: "천상의 독수리", shinryokuType: "질풍계",
            description: "높은 하늘을 지배하는 거대 독수리입니다. 그의 날갯짓은 모래 폭풍을 일으킵니다.",
            specialLoot: "제니스의 신속 부츠",
            detailedLoot: {
                name: "제니스의 신속 부츠", type: "Feet", rarity: ItemRarity.UNIQUE,
                description: "구름 위를 걷는 듯한 가벼움을 선사하는 장화.",
                stats: { agi: 240, ctrl: 140 },
                secondaryOptions: ["AGI +30%", "치명타율 +22%", "질풍계 속성 피해 +25%"],
                enhancement: 0,
                imageUrl:"https://i.ibb.co/zHDNjJ7K/Gemini-Generated-Image-8dz9lh8dz9lh8dz9.png"
            },
            visualUrl: "https://i.ibb.co/TMTycPXK/Gemini-Generated-Image-3fyjkq3fyjkq3fyj.png", level: 440,
            skills: [createBossSkill("데스토네이도", "[부가 효과: 파열] 적을 공중으로 띄운 후 난도질합니다.", SkillType.PHYSICAL, 580, 140, "AGI*5.8")]
        },
        "두바이": {
            id:"boss_dubai",
            name: "부르즈 칼리파의 뇌신", title: "마천루의 지배자", shinryokuType: "전격계",
            description: "세계에서 가장 높은 건물 부르즈 칼리파 꼭대기에서 번개를 다스리는 존재입니다.",
            specialLoot: "뇌신의 초전도 반지",
            detailedLoot: {
                name: "뇌신의 초전도 반지", type: "Accessory", rarity: ItemRarity.UNIQUE,
                description: "엄청난 전력을 견뎌내는 초전도 반지.",
                stats: { int: 220, agi: 120, ctrl: 80 },
                secondaryOptions: ["마법 공격력 +22%", "전격계 속성 저항 +30%", "치명타율 +18%"],
                enhancement: 0,
                imageUrl:"https://i.ibb.co/Y7YGkMgJ/Gemini-Generated-Image-wyacd5wyacd5wyac.png"
            },
            visualUrl: "https://i.ibb.co/XfjctVt3/Gemini-Generated-Image-rimlqnrimlqnriml.png", level: 460,
            skills: [createBossSkill("메가 볼트 스트라이크", "[부가 효과: 감전] 하늘에서 거대한 낙뢰를 떨어뜨립니다.", SkillType.MAGIC, 650, 170, "INT*6.5")]
        },
        "샤르자": {
            id:"boss_sharjah",
            name: "문화의 수호 석상", title: "지식의 파수꾼", shinryokuType: "대지계",
            description: "샤르자의 풍부한 문화와 역사를 지키는 거대한 석조 수호자입니다.",
            specialLoot: "지혜의 대지 보주",
            detailedLoot: {
                name: "지혜의 대지 보주", type: "SubWeapon", weaponType: "Orb", rarity: ItemRarity.UNIQUE,
                description: "대지의 기운과 지혜가 담긴 보주.",
                stats: { wis: 210, def: 150, hp: 600 },
                secondaryOptions: ["마법 방어력 +25%", "대지계 속성 피해 +25%", "상태이상 저항 +20%"],
                enhancement: 0,
                imageUrl:"https://i.ibb.co/676yJHWf/Gemini-Generated-Image-oka66oka66oka66o.png"
            },
            visualUrl: "https://i.ibb.co/Kc1hDCMN/Gemini-Generated-Image-1m9l7w1m9l7w1m9l.png", level: 430,
            skills: [createBossSkill("역사의 무게", "[부가 효과: 속박] 적을 과거의 굴레에 묶어 둡니다.", SkillType.MAGIC, 450, 110, "WIS*4.5")]
        }
    },
    "이스라엘": {
        "예루살렘": {
            id:"boss_jerusalem",
            name: "시온의 세라핌", title: "거룩한 수호천사", shinryokuType: "광휘계",
            description: "성지를 지키기 위해 강림한 육익의 대천사입니다.",
            specialLoot: "성소의 가호 반지",
            detailedLoot: {
                name: "성소의 가호 반지", type: "Accessory", rarity: ItemRarity.UNIQUE,
                description: "신의 영광이 깃든 찬란한 반지.",
                stats: { int: 180, wis: 200, hp: 500 },
                secondaryOptions: ["모든 능력치 +20%", "광휘계 속성 피해 +30%", "상태이상 저항 +30%"],
                enhancement: 0,
                imageUrl:"https://i.ibb.co/39MvqxLm/Gemini-Generated-Image-d7gb37d7gb37d7gb.png"
            },
            visualUrl: "https://i.ibb.co/wNLZ165x/Gemini-Generated-Image-wtokqcwtokqcwtok.png", level: 450,
            skills: [createBossSkill("천상의 진노", "[부가 효과: 소멸] 사악한 존재를 소멸시키는 빛의 파동입니다.", SkillType.MAGIC, 650, 180, "INT*6.5")]
        },
        "텔아비브": {
            id:"boss_telaviv",
            name: "지중해의 사이렌", title: "매혹의 목소리", shinryokuType: "해수계",
            description: "텔아비브 해안가에서 아름다운 노래로 선원들을 현혹하는 바다의 정령입니다.",
            specialLoot: "사이렌의 마력 목걸이",
            detailedLoot: {
                name: "사이렌의 마력 목걸이", type: "Accessory", rarity: ItemRarity.UNIQUE,
                description: "착용자의 매력을 마력으로 변환하는 목걸이.",
                stats: { int: 190, wis: 170, ctrl: 120 },
                secondaryOptions: ["마법 공격력 +18%", "해수계 속성 저항 +20%", "상태이상 저항 +15%"],
                enhancement: 0,
                imageUrl:"https://i.ibb.co/d0RBzyrx/Gemini-Generated-Image-uvj3asuvj3asuvj3.png"
            },
            visualUrl: "https://i.ibb.co/847n67Nr/Gemini-Generated-Image-qrwijcqrwijcqrwi.png", level: 420,
            skills: [createBossSkill("매혹의 소나타", "[부가 효과: 혼란] 적의 정신을 마비시키는 아름다운 노래입니다.", SkillType.MAGIC, 450, 130, "INT*4.5")]
        },
        "하이파": {
            id:"boss_haifa",
            name: "카멜 산의 예언자", title: "지혜의 수호자", shinryokuType: "광휘계",
            description: "카멜 산의 성스러운 기운을 받은 고대의 예언자 영체입니다.",
            specialLoot: "예언자의 신성한 지팡이",
            detailedLoot: {
                name: "예언자의 신성한 지팡이", type: "Weapon", weaponType: "Staff", rarity: ItemRarity.UNIQUE,
                description: "미래를 꿰뚫어보는 힘이 깃든 지팡이.",
                stats: { int: 230, wis: 210 },
                secondaryOptions: ["마법 공격력 +25%", "광휘계 속성 부여", "상태이상 저항 +25%"],
                enhancement: 0,
                imageUrl:"https://i.ibb.co/xKSc3xDF/Gemini-Generated-Image-p030e9p030e9p030.png"
            },
            visualUrl: "https://i.ibb.co/7tWz1k1P/Gemini-Generated-Image-2luqoc2luqoc2luq.png", level: 435,
            skills: [createBossSkill("예언된 파멸", "[부가 효과: 소멸] 피할 수 없는 운명의 일격을 가합니다.", SkillType.MAGIC, 580, 160, "INT*5.8")]
        }
    },
    "이란": {
        "테헤란": {
            id:"boss_teheran",
            name: "시무르그 로드", title: "지혜의 신수", shinryokuType: "질풍계",
            description: "수만 년의 세월을 산 지혜의 새 시무르그가 거대화했습니다.",
            specialLoot: "테헤란의 영생 관",
            detailedLoot: {
                name: "테헤란의 영생 관", type: "Head", rarity: ItemRarity.UNIQUE,
                description: "불사(不死)에 가까운 활력을 주는 왕관.",
                stats: { wis: 250, hp: 1000 },
                secondaryOptions: ["상태이상 저항 +25%", "질풍계 속성 저항 +25%", "WIS +25%"],
                enhancement: 0,
                imageUrl:"https://i.ibb.co/Y7cZkGfv/Gemini-Generated-Image-m3ej2mm3ej2mm3ej.png"
            },
            visualUrl: "https://i.ibb.co/B25k4JXf/Gemini-Generated-Image-9yfogp9yfogp9yfo.png", level: 440,
            skills: [createBossSkill("영겁의 폭풍", "[부가 효과: 혼란] 정신을 파괴하는 바람입니다.", SkillType.MAGIC, 500, 150, "WIS*5.0")]
        },
        "이스파한": {
            id:"boss_isfahan",
            name: "페르시아의 불사조", title: "영원한 불꽃", shinryokuType: "화염계",
            description: "이스파한의 고대 유적에서 깨어난 찬란한 불꽃의 새입니다.",
            specialLoot: "불사조의 타오르는 깃털",
            detailedLoot: {
                name: "불사조의 타오르는 깃털", type: "Accessory", rarity: ItemRarity.UNIQUE,
                description: "영원히 꺼지지 않는 열기를 간직한 깃털.",
                stats: { int: 200, hp: 500, mp: 500 },
                secondaryOptions: ["마법 공격력 +20%", "화염계 속성 피해 +25%", "상태이상 저항 +10%"],
                enhancement: 0,
                imageUrl:"https://i.ibb.co/jkkdpkvf/Gemini-Generated-Image-tbk8vmtbk8vmtbk8.png"
            },
            visualUrl: "https://i.ibb.co/nMNxwwgK/Gemini-Generated-Image-sfacrysfacrysfac.png", level: 430,
            skills: [createBossSkill("홍련의 겁화", "[부가 효과: 화상] 모든 것을 태워버리는 강력한 화염입니다.", SkillType.MAGIC, 550, 140, "INT*5.5")]
        },
        "시라즈": {
            id:"boss_shiraz",
            name: "장미 정원의 정령", title: "향기의 수호자", shinryokuType: "질풍계",
            description: "시라즈의 아름다운 장미 정원에서 탄생한 우아한 정령입니다.",
            specialLoot: "장미의 마법 팬던트",
            detailedLoot: {
                name: "장미의 마력 팬던트", type: "Accessory", rarity: ItemRarity.UNIQUE,
                description: "장미 향기와 마력이 깃든 팬던트.",
                stats: { wis: 220, ctrl: 100 },
                secondaryOptions: ["마법 방어력 +25%", "질풍계 속성 피해 +20%", "상태이상 저항 +20%"],
                enhancement: 0,
                imageUrl:"https://i.ibb.co/HDKh2Z8k/Gemini-Generated-Image-p9x6kup9x6kup9x6.png"
            },
            visualUrl: "https://i.ibb.co/wZ52qqNP/Gemini-Generated-Image-zgxgjrzgxgjrzgxg.png", level: 415,
            skills: [createBossSkill("향기로운 폭풍", "[부가 효과: 혼란] 적의 감각을 마비시키는 꽃가루 폭풍입니다.", SkillType.MAGIC, 400, 100, "WIS*4.0")]
        }
    },
    "호주": {
        "캔버라": {
            id:"boss_canvara",
            name: "아웃백 타이탄", title: "대륙의 지표", shinryokuType: "대지계",
            description: "호주의 광활한 붉은 대지가 신력을 받아 일어난 거신입니다.",
            specialLoot: "붉은 대지의 핵",
            detailedLoot: {
                name: "아웃백 가디언 메일", type: "Body", rarity: ItemRarity.UNIQUE,
                description: "거친 대지의 기운이 서린 붉은색 갑옷.",
                stats: { def: 230, str: 170, hp: 800 },
                secondaryOptions: ["물리 방어력 +25%", "대지계 속성 저항 +25%", "상태이상 저항 +20%"],
                enhancement: 0,
                imageUrl:"https://i.ibb.co/NdnyBXrc/Gemini-Generated-Image-75nof175nof175no.png"
            },
            visualUrl: "https://i.ibb.co/Q7TXgCjn/Gemini-Generated-Image-5net275net275net.png", level: 440,
            skills: [createBossSkill("대륙의 분노", "[부가 효과: 파열] 지면을 내려쳐 광범위한 충격을 줍니다.", SkillType.PHYSICAL, 480, 120, "STR*4.8")]
        },
        "시드니": {
            id:"boss_sydney",
            name: "오페라 하우스 팬텀", title: "비탄의 소나타", shinryokuType: "월광계",
            description: "아름다운 항구의 야경과 음악이 뒤섞여 탄생한 우아한 영체입니다.",
            specialLoot: "화이트 쉘 팬던트",
            detailedLoot: {
                name: "오페라의 마력 목걸이", type: "Accessory", rarity: ItemRarity.UNIQUE,
                description: "아름다운 선율을 마력으로 변환하는 조개 모양 팬던트.",
                stats: { int: 210, wis: 180 },
                secondaryOptions: ["마법 공격력 +12%", "월광계 속성 피해 +15%", "모든 능력치 +20%"],
                enhancement: 0,
                imageUrl:"https://i.ibb.co/Sgrd5sg/Gemini-Generated-Image-690g1h690g1h690g.png"
            },
            visualUrl: "https://i.ibb.co/JRzKJ2k3/Gemini-Generated-Image-u5u85bu5u85bu5u8.png", level: 450,
            skills: [createBossSkill("달빛의 레퀴엠", "[부가 효과: 혼란] 적들을 황홀경에 빠뜨려 무력화합니다.", SkillType.MAGIC, 500, 140, "INT*5.0")]
        },
        "멜버른": {
            id:"boss_melvern",
            name: "그레이트 로드 가디언", title: "해안의 파수꾼", shinryokuType: "해수계",
            description: "거친 파도와 해안 절벽의 정기가 뭉쳐 탄생한 수호자입니다.",
            specialLoot: "파도 베기 대검",
            detailedLoot: {
                name: "멜버른의 해안 대검", type: "Weapon", weaponType: "Sword", rarity: ItemRarity.UNIQUE,
                description: "바다의 무게를 담은 육중한 대검.",
                stats: { str: 240, def: 150 },
                secondaryOptions: ["물리 공격력 +25%", "해수계 속성 부여", "상태이상 저항 +10%"],
                enhancement: 0,
                imageUrl:"https://i.ibb.co/Wp7jRRw8/Gemini-Generated-Image-fpqsedfpqsedfpqs.png"
            },
            visualUrl: "https://i.ibb.co/k62ZZrC0/Gemini-Generated-Image-an784uan784uan78.png", level: 430,
            skills: [createBossSkill("해신의 일격", "[부가 효과: 빙결] 차가운 파도를 칼날에 실어 벱니다.", SkillType.PHYSICAL, 520, 130, "STR*5.2")]
        },
        "브리즈번": {
            id:"boss_breezburn",
            name: "서퍼스 파라다이스 스피릿", title: "태양의 파도", shinryokuType: "태양계",
            description: "눈부신 햇살과 푸른 파도 속에서 나타나는 활기찬 정령입니다.",
            specialLoot: "태양의 서핑 보드",
            detailedLoot: {
                name: "브리즈번의 태양 서핑 보드", type: "SubWeapon", weaponType: "SubSword", rarity: ItemRarity.UNIQUE,
                description: "태양의 열기를 간직한 푸른색 서핑 보드.",
                stats: { int: 190, agi: 200 },
                secondaryOptions: ["AGI +20%", "태양계 속성 피해 +25%", "치명타율 +10%"],
                enhancement: 0,
                imageUrl:"https://i.ibb.co/9H6c1W28/Gemini-Generated-Image-sb2977sb2977sb29.png"
            },
            visualUrl: "https://i.ibb.co/9kxc3QCV/Gemini-Generated-Image-sjzjrpsjzjrpsjzj.png", level: 420,
            skills: [createBossSkill("솔라 서핑", "태양 광선을 타고 적진을 휩씁니다.", SkillType.MAGIC, 450, 110, "INT*4.5")]
        }
    },
    "뉴질랜드": {
        "웰링턴": {
            id:"boss_wellington",
            name: "서던 윈드 서펀트", title: "남풍의 지배자", shinryokuType: "질풍계",
            description: "남반구의 차갑고 강한 바람을 부리는 전설적인 날개 뱀입니다.",
            specialLoot: "남풍의 깃털 관",
            detailedLoot: {
                name: "웰링턴의 바람 머리장식", type: "Head", rarity: ItemRarity.UNIQUE,
                description: "바람의 흐름을 읽게 해주는 신비로운 깃털 관.",
                stats: { def: 160, agi: 220, ctrl: 50 },
                secondaryOptions: ["AGI +25%", "질풍계 속성 저항 +20%", "치명타 확률 +15%"],
                enhancement: 0,
                imageUrl:"https://i.ibb.co/qYgPpctF/Gemini-Generated-Image-9tindx9tindx9tin.png"
            },
            visualUrl: "https://i.ibb.co/ZRTKG7qJ/Gemini-Generated-Image-f5q05mf5q05mf5q0.png", level: 440,
            skills: [createBossSkill("허리케인 블래스트", "[부가 효과: 파열] 강력한 진공 폭발을 일으킵니다.", SkillType.MAGIC, 480, 130, "AGI*4.8")]
        },
        "오클랜드": {
            id:"boss_oakland",
            name: "볼캐닉 드래곤", title: "잠들지 않는 화산", shinryokuType: "화염계",
            description: "도시 주변의 휴화산 지대에서 깨어난 뜨거운 용입니다.",
            specialLoot: "용암 깃든 가죽 갑옷",
            detailedLoot: {
                name: "오클랜드 화염 갑옷", type: "Body", rarity: ItemRarity.UNIQUE,
                description: "용암의 열기를 견뎌낸 용의 가죽으로 만든 갑옷.",
                stats: { def: 240, hp: 1000 },
                secondaryOptions: ["물리 방어력 +25%", "화염계 속성 저항 +20%", "상태이상 저항 +10%"],
                enhancement: 0,
                imageUrl:"https://i.ibb.co/NgmSj0Tz/Gemini-Generated-Image-m2rmoom2rmoom2rm.png"
            },
            visualUrl: "https://i.ibb.co/CCN5SMk/Gemini-Generated-Image-xbm2e4xbm2e4xbm2.png", level: 450,
            skills: [createBossSkill("볼카닉 브레스", "[부가 효과: 화상] 모든 것을 녹여버리는 열기를 뿜습니다.", SkillType.MAGIC, 550, 140, "INT*5.5")]
        },
        "크라이스트처치": {
            id:"boss_christchurch",
            name: "서던 알프스 가디언", title: "만년설의 투사", shinryokuType: "빙결계",
            description: "남쪽 산맥의 얼지 않는 투지를 가진 거대 기사 석상입니다.",
            specialLoot: "빙하의 배틀 액스",
            detailedLoot: {
                name: "알프스의 얼음 도끼", type: "Weapon", weaponType: "Axe", rarity: ItemRarity.UNIQUE,
                description: "절대 녹지 않는 얼음으로 날을 세운 도끼.",
                stats: { str: 230, def: 160, agi: -10 },
                secondaryOptions: ["STR +30%", "빙결계 속성 부여", "물리 공격력 +15%"],
                enhancement: 0,
                imageUrl:"https://i.ibb.co/LDFRfnGw/Gemini-Generated-Image-yf9410yf9410yf94.png"
            },
            visualUrl: "https://i.ibb.co/8LydfxvV/Gemini-Generated-Image-501ea5501ea5501e.png", level: 430,
            skills: [createBossSkill("절대영도 베기", "[부가 효과: 빙결] 대상을 순식간에 동결시킵니다.", SkillType.PHYSICAL, 500, 120, "STR*5.0")]
        }
    },
    "몽골": {
        "울란바토르": {
            id:"boss_ulanbator",
            name: "테무진의 잔영",
            title: "초원의 절대 정복자",
            shinryokuType: "질풍계",
            description: "고대 몽골 제국을 건설했던 정복자의 의지가 신력을 얻어 현신했습니다. 끝없는 지평선을 달리는 폭풍과 같은 무력을 보여줍니다.",
            specialLoot: "정복자의 황금 등자",
            detailedLoot: {
                name: "칸의 질풍 대도",
                type: "Weapon",
                weaponType: "Sword",
                rarity: ItemRarity.LEGENDARY,
                description: "초원을 가르는 바람이 깃든 거대한 도. 장착 시 이동 속도와 공격력이 폭발적으로 상승합니다.",
                stats: { str: 160, agi: 240, ctrl: 50 },
                secondaryOptions: ["물리 공격력 +30%", "치명타 확률 +20%", "질풍계 속성 부여","최종 능력치 +10%"],
                enhancement: 0,
                imageUrl: "https://i.ibb.co/tpK9M72k/Gemini-Generated-Image-c1fhxyc1fhxyc1fh.png"
            },
            visualUrl: "https://i.ibb.co/fdd1YPMV/Gemini-Generated-Image-xksk3zxksk3zxksk.png",
            level: 500,
            skills: [
                createBossSkill("초원의 폭풍", "[부가 효과: 파열] 적진을 휘젓는 광풍의 참격입니다.", SkillType.PHYSICAL, 600, 120, "AGI*6.0"),
                createBossSkill("케식텐의 소환", "[부가 효과: 공포] 환영 기병대를 불러내어 적들을 짓밟습니다.", SkillType.MAGIC, 500, 150, "INT*5.0"),
                createBossSkill("정복자의 기상", "자신의 모든 능력치를 강화하고 상태이상을 무시합니다.", SkillType.BUFF, 0, 180, "ALL_STATS +50%, Immunity", 'self')
            ]
        },
        "다르항": {
            id:"boss_darhan",
            name: "보르테의 비원",
            title: "초원의 자애로운 수호자",
            shinryokuType: "월광계",
            description: "고대 몽골의 대모 보르테의 의지가 현신한 영체입니다. 은은한 달빛 아래 숲과 초원의 평화를 수호하며, 침입자의 투지를 잠재웁니다.",
            specialLoot: "보르테의 은빛 가마솥",
            detailedLoot: {
                name: "은하의 월광 보주",
                type: "SubWeapon",
                weaponType: "Orb",
                rarity: ItemRarity.UNIQUE,
                description: "달의 정기를 가두어 만든 은빛 보주. 착용자의 마력을 정화하고 회복력을 극대화합니다.",
                stats: { int: 190, wis: 110, ctrl: 60 },
                secondaryOptions: ["MP +50%", "마법 방어력 +55%", "월광계 속성 피해 +20%"],
                enhancement: 0,
                imageUrl: "https://i.ibb.co/H5zT7LW/Gemini-Generated-Image-1p9bdt1p9bdt1p9b.png"
            },
            visualUrl: "https://i.ibb.co/Z1kRNj2H/Gemini-Generated-Image-jqzvv8jqzvv8jqzv.png",
            level: 410,
            skills: [
                createBossSkill("달빛의 위로", "아군 전체의 체력을 회복하고 모든 디버프를 해제합니다.", SkillType.BUFF, 0, 140, "HP 20% Recov, Cleanse", 'ally'),
                createBossSkill("은하의 장막", "[부가 효과: 혼란] 눈부신 달빛으로 적들의 시야를 가려 아군을 오인하게 합니다.", SkillType.MAGIC, 400, 120, "INT*4.0"),
                createBossSkill("침묵의 지평선", "적의 마나 흐름을 방해하여 기술 사용을 봉쇄합니다.", SkillType.DEBUFF, 0, 100, "Silence(2T)")
            ]
        },
        "에르데네트": {
            id:"boss_erdenet",
            name: "강철 늑대 알탄",
            title: "구리 산맥의 지배자",
            shinryokuType: "강철계",
            description: "광산 지대의 금속 기운을 흡수하여 강철보다 단단한 피부를 갖게 된 전설의 늑대입니다. 그의 발톱은 어떤 방어구도 종잇장처럼 찢어버립니다.",
            specialLoot: "알탄의 강철 발톱",
            detailedLoot: {
                name: "산맥 파쇄 건틀릿",
                type: "Hand",
                rarity: ItemRarity.UNIQUE,
                description: "강철 늑대의 발톱을 가공하여 만든 건틀릿. 파괴적인 물리력을 선사합니다.",
                stats: { str: 230, def: 190, ctrl: 40 },
                secondaryOptions: ["물리 방어력 +20%", "물리 공격력 +32%", "강철계 속성 피해 +20%"],
                enhancement: 0,
                imageUrl: "https://i.ibb.co/d4jvw66R/Gemini-Generated-Image-f7ucpbf7ucpbf7uc.png"
            },
            visualUrl: "https://i.ibb.co/BKCk3pbY/Gemini-Generated-Image-xhdhcmxhdhcmxhdh.png",
            level: 445,
            skills: [
                createBossSkill("강철의 돌격", "[부가 효과: 파열] 거대한 몸체로 돌진하여 적의 방어선을 궤멸시킵니다.", SkillType.PHYSICAL, 580, 110, "STR*5.8"),
                createBossSkill("금속 파편 비", "신체에서 날카로운 철편을 사방으로 흩뿌립니다.", SkillType.PHYSICAL, 420, 90, "STR*4.2"),
                createBossSkill("철벽의 외침", "자신의 방어력을 일시적으로 폭발시켜 무적에 가까운 상태가 됩니다.", SkillType.BUFF, 0, 150, "DEF +200%", 'self')
            ]
        }
    }
};

export const getAsiaBossByLocation = (nation: string, city: string): BossData | null => {
    if (ASIA_BOSSES[nation] && ASIA_BOSSES[nation][city]) {
        return ASIA_BOSSES[nation][city];
    }
    return null;
};
