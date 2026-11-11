
import { Enemy, ClassTier, SkillType, Stats, Item, ItemRarity, Skill, SkillTarget } from './types';
import { EUROPE_BOSSES } from './europeBossMonsters';
import { SEASONAL_BOSSES, SEASONAL_BOSS_CONFIG, isMythicSeasonalBoss } from './mythicbossmonsters';
import { DIVINE_REALM_BOSSES } from './divineRealmbossmonsters';
import { AMERICA_BOSSES } from './americabossmonster';
import { ASIA_BOSSES } from './asiabossmonster';
import { AFRICA_BOSSES } from './africabossmonster';
import { FANTASY_BOSSES } from './fantasybossmonster';
import { generateEnemyStats } from './utils';
import { isEquipmentItem } from './services/bossLootBoostService';
import { applyNpcBossGimmicks } from './services/npcCombatScaling';
import { getRegisteredBossVisual } from './services/visualRegistry';

export { EUROPE_BOSSES, SEASONAL_BOSSES, SEASONAL_BOSS_CONFIG, DIVINE_REALM_BOSSES, AMERICA_BOSSES, ASIA_BOSSES, AFRICA_BOSSES, FANTASY_BOSSES, isMythicSeasonalBoss };

export interface BossData {
    id: string;
    name: string;
    title: string;
    shinryokuType: string;
    description: string;
    specialLoot: string;
    detailedLoot: Item | Item[]; 
    visualUrl: string;
    level: number;
    skills: Skill[]; 
}

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

export const DETAILED_BOSSES: Record<string, Record<string, BossData>> = {
    "대한민국": {
        "서울": {
            id: "boss_hatai",
            name: "수호해태",
            title: "왕궁의 심판자",
            shinryokuType: "광휘계",
            description: "조선의 정궁을 수호하던 영물이 신력을 흡수하여 거대화했습니다. 불의를 심판하는 푸른 눈을 가졌습니다.",
            specialLoot: "해태의 전리품",
            detailedLoot: [{
                name: "해태의 심판 안광",
                type: "Accessory",
                rarity: ItemRarity.LEGENDARY,
                description: "해태의 눈에서 추출한 신비로운 보석. 악한 기운을 꿰뚫어봅니다.",
                stats: { str: 250, int: 200, wis: 200, ctrl: 150 },
                secondaryOptions: ["마법 공격력 +25%", "상태이상 저항 +20%", "물리 공격력 +30%","광휘계 속성 피해 +20%"],
                enhancement: 0,
                imageUrl:"https://i.ibb.co/pBKbR5H9/Gemini-Generated-Image-6lyjkj6lyjkj6lyj.png"
            },{ name: "해태의 꼬리",
                type: "Etc",
                rarity: ItemRarity.LEGENDARY,
                description: "해태의 성스러운 기운이 담긴 꼬리.",
                imageUrl:"https://i.ibb.co/q3pqbf56/Gemini-Generated-Image-5pnwcq5pnwcq5pnw.png",
                enhancement: 0},
                { name: "해태의 심판의 활",
                type: "Weapon",
                weaponType:"Bow",
                rarity: ItemRarity.LEGENDARY,
                elementalType:"광휘계",
                description: "해태의 기운이 들어 있는 활",
                stats: { agi: 250, str: 200, wis: 200, ctrl: 150 },
                secondaryOptions: ["물리 공격력 +35%", "상태이상 저항 +20%", "AGI +35%"],
                enhancement: 0,
                imageUrl:"https://i.ibb.co/dJ3JSdrc/Gemini-Generated-Image-eieedbeieedbeiee.png" }],
            visualUrl: "https://i.ibb.co/DPJPJJZW/hatai.png",
            level: 520,
            skills: [
                createBossSkill("정의의 심판", "[부가 효과: 소멸] 하늘에서 거대한 빛의 기둥이 쏟아집니다.", SkillType.MAGIC, 500, 100, "INT*5.0"),
                createBossSkill("벽사의 포효", "[부가 효과: 공포] 사악한 기운을 몰아내는 포효로 적들을 위축시킵니다.", SkillType.DEBUFF, 0, 80, "ATK -30%, DEF -30%"),
                createBossSkill("성역의 빛", "자신의 상처를 치료하고 신성한 보호막을 생성합니다.", SkillType.BUFF, 0, 150, "HP 20% 회복, DEF +50%", 'self')
            ]
        },
        "인천": {
            id: "boss_incheon",
            name: "심연 크라켄",
            title: "항구의 파괴자",
            shinryokuType: "해수계",
            description: "인천 앞바다 깊은 심연에서 올라온 거대 연체괴수입니다. 수많은 군함을 침몰시킨 공포의 대상입니다.",
            specialLoot: "심해의 진주핵",
            detailedLoot: {
                name: "심해의 진주핵",
                type: "SubWeapon",
                weaponType: "Orb",
                rarity: ItemRarity.UNIQUE,
                description: "크라켄의 중심부에서 발견된 거대한 진주. 바다의 마력이 요동칩니다.",
                stats: { int: 200, mp: 500 },
                secondaryOptions: ["MP +20%", "마법 방어력 +25%", "치명타율 +25%"],
                enhancement: 0,
                imageUrl:"https://i.ibb.co/r29w8wPW/Gemini-Generated-Image-ungcliungcliungc.png"
            },
            visualUrl: "https://i.ibb.co/LdhJG6Fj/Gemini-Generated-Image-8zbqdz8zbqdz8zbq.png",
            level: 490,
            skills: [
                createBossSkill("해신의 소용돌이", "[부가 효과: 빙결] 전장을 거대한 소용돌이로 휩씁니다.", SkillType.MAGIC, 450, 120, "INT*4.5"),
                createBossSkill("촉수 난무", "여러 개의 촉수로 무차별 타격을 가합니다.", SkillType.PHYSICAL, 400, 80, "STR*4.0"),
                createBossSkill("먹물 분사", "[부가 효과: 암흑] 시야를 차단하여 적들의 명중률을 떨어뜨립니다.", SkillType.DEBUFF, 0, 60, "AGI -50%")
            ]
        },
        "부산": {
            id: "boss_busan",
            name: "전설의 적룡",
            title: "바다를 불태우는 자",
            shinryokuType: "화염계",
            description: "바다 위를 날아다니며 화염을 뿜는 붉은 용입니다. 뜨거운 열기로 바닷물을 증발시킵니다.",
            specialLoot: "적룡의 역린도",
            detailedLoot: {
                name: "적룡의 역린도",
                type: "Weapon",
                weaponType: "Sword",
                rarity: ItemRarity.LEGENDARY,
                description: "적룡의 가장 단단한 비늘을 제련해 만든 검. 휘두를 때마다 폭발적인 화염이 일어납니다.",
                stats: { str: 220, agi: 140 },
                secondaryOptions: ["물리 공격력 +30%", "치명타 확률 +15%", "화염계 속성 부여", "STR +20%"],
                enhancement: 0,
                imageUrl:"https://i.ibb.co/27KHKCN7/Gemini-Generated-Image-x9nzt7x9nzt7x9nz.png"
            },
            visualUrl: "https://i.ibb.co/KpD2DY7h/Gemini-Generated-Image-xxpfwbxxpfwbxxpf.png",
            level: 490,
            skills: [
                createBossSkill("화룡의 역린", "[부가 효과: 화상] 분노한 용의 화염이 모든 것을 태웁니다.", SkillType.MAGIC, 550, 150, "INT*5.5"),
                createBossSkill("드래곤 피어", "[부가 효과: 공포] 용의 위압감으로 적들을 마비시킵니다.", SkillType.DEBUFF, 0, 100, "ALL_STATS -20%"),
                createBossSkill("테일 스윕", "거대한 꼬리를 휘둘러 대지를 분쇄합니다.", SkillType.PHYSICAL, 350, 70, "STR*3.5")
            ]           
          },
      "대구": {
        id: "boss_daegu",
        name: "신화염호",
        title: "열기의 군주",
        shinryokuType: "화염계",
        description: "타오르는 산의 정령이 호랑이의 형상을 취했습니다.",
        specialLoot: "화염호의 송곳니",
        detailedLoot: {
            name: "화염호의 송곳니",
            type: "Weapon",
            weaponType: "Axe",
            rarity: ItemRarity.UNIQUE,
            description: "불꽃이 깃든 송곳니로 만든 무기.",
            stats: { str: 170, def: 60, ctrl: 20 },
            secondaryOptions: ["물리 공격력 +25%", "치명타율 +10%", "AGI +20%"],
            enhancement: 0,
            imageUrl:"https://i.ibb.co/zT2KcmSX/Gemini-Generated-Image-zs1jnzs1jnzs1jnz.png"
        },
        visualUrl: "https://i.ibb.co/dsQGHSzN/Gemini-Generated-Image-ytag8tytag8tytag.png",
        level: 485,
        skills: [
            createBossSkill("열화 폭발", "[부가 효과: 화상] 대지를 불태웁니다.", SkillType.MAGIC, 540, 120, "INT*5.2"),
            createBossSkill("호왕의 돌진", "적을 꿰뚫습니다.", SkillType.PHYSICAL, 500, 95, "STR*4.9"),
            createBossSkill("불멸의 체온", "자신의 생명력을 재생합니다.", SkillType.BUFF, 0, 140, "HP 회복 +5%", "self")
        ]
    },
    "대전": {
        id: "boss_dajeon",
        name: "연구도시의 기계현자",
        title: "지식의 집행자",
        shinryokuType: "신체강화계",
        description: "과학과 신력이 융합된 존재. 계산된 파멸을 선사합니다.",
        specialLoot: "현자의 연산코어",
        detailedLoot: {
            name: "현자의 연산코어",
            type: "Accessory",
            rarity: ItemRarity.UNIQUE,
            description: "초월적 계산 능력을 부여하는 코어.",
            stats: { int: 170, agi: 30, ctrl: 40 },
            secondaryOptions: ["AGI +20%", "MP +25%", "마법 공격력 +25%"],
            enhancement: 0,
            imageUrl:"https://i.ibb.co/x8dBb6zN/Gemini-Generated-Image-jzbdkhjzbdkhjzbd.png"
        },
        visualUrl: "https://i.ibb.co/8ggFKFcD/Gemini-Generated-Image-7i2qh57i2qh57i2q.png",
        level: 480,
        skills: [
            createBossSkill("양자 붕괴", "[부가 효과: 소멸] 공간을 찢어냅니다.", SkillType.MAGIC, 560, 130, "INT*5.4"),
            createBossSkill("연산 과부하", "[부가 효과: 혼란] 적의 능력을 분석 후 무력화합니다.", SkillType.DEBUFF, 0, 100, "DEF -35%"),
            createBossSkill("완전 방정식", "모든 상태이상을 제거합니다.", SkillType.BUFF, 0, 150, "디버프 해제", "self")
        ]
    },
    "광주": {
        id: "boss_gwangju",
        name: "무등산의 현무령",
        title: "자연의 수호왕",
        shinryokuType: "대지계",
        description: "대지와 생명의 순환을 관장하는 고대 현무.",
        specialLoot: "현무의 생명옥",
        detailedLoot: {
            name: "현무의 생명옥",
            type: "Accessory",
            rarity: ItemRarity.UNIQUE,
            description: "자연의 생명력이 응축된 옥.",
            stats: { wis: 160, ctrl: 60, def: 40 },
            secondaryOptions: ["DEF +30%", "상태이상 저항 +25%", "HP +20%"],
            enhancement: 0,
            imageUrl:"https://i.ibb.co/zVMKNsVd/Gemini-Generated-Image-jt3gmjt3gmjt3gmj.png"
        },
        visualUrl: "https://i.ibb.co/TBB0gKZz/Gemini-Generated-Image-n9vm2kn9vm2kn9vm.png",
        level: 490,
        skills: [
            createBossSkill("대지의 맥동", "[부가 효과: 속박] 땅이 적을 붙잡습니다.", SkillType.MAGIC, 500, 100, "WIS*4.8"),
            createBossSkill("자연 회귀", "전투를 지속할 힘을 얻습니다.", SkillType.BUFF, 0, 150, "HP 25% 회복", "self"),
      ]
        }
    },
    "일본": {
        "도쿄": {
            id: "boss_tokyo",
            name: "천 년의 누에",
            title: "밤의 지배자",
            shinryokuType: "암흑계",
            description: "원숭이의 얼굴, 호랑이의 발, 뱀의 꼬리를 가진 전설의 요괴입니다. 도쿄의 밤을 어둠으로 물들입니다.",
            specialLoot: "밤의 지배자 로브",
            detailedLoot: {
                name: "밤의 지배자 로브",
                type: "Body",
                rarity: ItemRarity.LEGENDARY,
                description: "누에의 털로 짠 칠흑색 로브. 착용자의 기척을 완전히 지워줍니다.",
                stats: { def: 200, wis: 200, agi: 260 },
                secondaryOptions: ["DEF +25%", "상태이상 저항 +50%", "WIS +10%","최종 능력치 +20%"],
                enhancement: 0,
                imageUrl:"https://i.ibb.co/fVnv3dqR/Gemini-Generated-Image-lcfyoulcfyoulcfy.png"
            },
            visualUrl: "https://i.ibb.co/27rVs8pF/Gemini-Generated-Image-syhpxtsyhpxtsyhp.png",
            level: 520,
            skills: [
                createBossSkill("밤의 환각", "[부가 효과: 혼란] 어둠 속에 숨어 적들의 정신을 교란합니다.", SkillType.MAGIC, 400, 110, "INT*4.0"),
                createBossSkill("암흑의 비명", "[부가 효과: 저주] 영혼을 찢는 비명으로 적을 약화시킵니다.", SkillType.DEBUFF, 0, 90, "DEF -40%, MP -20%"),
                createBossSkill("그림자 습격", "순식간에 적의 뒤를 파고들어 치명상을 입힙니다.", SkillType.PHYSICAL, 500, 100, "AGI*5.0", 'single')
            ]
        },
        "오사카": {
            id: "boss_osaka",
            name: "아수라 골렘",
            title: "오사카 성의 파수꾼",
            shinryokuType: "강철계",
            description: "고대의 성벽을 매개체로 생성된 육중한 강철 거신입니다. 무자비한 힘으로 침입자를 짓밟습니다.",
            specialLoot: "금강불괴의 흉갑",
            detailedLoot: {
                name: "금강불괴의 흉갑",
                type: "Body",
                rarity: ItemRarity.UNIQUE,
                description: "아수라 골렘의 핵을 감싸고 있던 초고밀도 강철판.",
                stats: { def: 300, hp: 1000 },
                secondaryOptions: ["DEF +20%", "상태이상 저항 +10%", "강철계 속성 피해 +20%"],
                enhancement: 0,
                imageUrl:"https://i.ibb.co/G3CQ1jyV/Gemini-Generated-Image-wg1fvbwg1fvbwg1f.png"
            },
            visualUrl: "https://i.ibb.co/wNB3f3hh/Gemini-Generated-Image-bycrlobycrlobycr.png",
            level: 500,
            skills: [
                createBossSkill("성벽의 가디언", "방어 태세를 갖추어 모든 피해를 경감합니다.", SkillType.BUFF, 0, 100, "DEF +100%, P.Def +50%", 'self'),
                createBossSkill("초고밀도 분쇄", "거대한 강철 주먹으로 대상을 짓누릅니다.", SkillType.PHYSICAL, 600, 120, "STR*6.0", 'single'),
                createBossSkill("지진파 발생", "발을 굴러 광범위한 충격파를 일으킵니다.", SkillType.PHYSICAL, 300, 80, "DEF*3.0")
            ]
        },
        "교토": {
            id:"boss_kyoto",
            name: "천만 년의 구미호",
            title: "환각의 지배자",
            shinryokuType: "월광계",
            description: "교토의 고대 사원에서 신력을 흡수한 요괴의 우두머리입니다. 인간을 현혹하고 차가운 불꽃을 부립니다.",
            specialLoot: "구미호의 백색 꼬리",
            detailedLoot: {
                name: "구미호의 백색 꼬리",
                type: "Accessory",
                rarity: ItemRarity.LEGENDARY,
                description: "구미호의 정수가 담긴 부드러운 꼬리 장식. 착용자의 마력을 증폭시킵니다.",
                stats: { int: 190, wis: 140, agi: 50 },
                secondaryOptions: ["마법 공격력 +25%", "AGI +20%", "월광계 속성 피해 +25%","최종 능력치 +10%"],
                enhancement: 0,
                imageUrl:"https://i.ibb.co/ymD2gbvx/Gemini-Generated-Image-s91bqds91bqds91b.png"
            },
            visualUrl: "https://i.ibb.co/Myrh4tBV/Gemini-Generated-Image-78xqk078xqk078xq.png",
            level: 465,
            skills: [
                createBossSkill("여우불 난무", "[부가 효과: 화상] 아홉 개의 푸른 불꽃을 발사합니다.", SkillType.MAGIC, 480, 120, "INT*4.8"),
                createBossSkill("유혹의 춤", "[부가 효과: 혼란] 매혹적인 몸짓으로 적들의 정신을 뒤흔듭니다.", SkillType.DEBUFF, 0, 100, "CTRL -50%, ALL_RESIST -30%"),
                createBossSkill("월광의 숨결", "자신을 달빛으로 감싸 피해를 무효화하고 회복합니다.", SkillType.BUFF, 0, 200, "Invincible(1T), HP 15% 회복", 'self')
            ]
        },
        "삿포로": {
            id:"boss_sapporo",
            name: "설원의 서리 거인",
            title: "동토의 군주",
            shinryokuType: "빙결계",
            description: "북쪽의 만년설에서 실체화된 거대한 빙하의 화신입니다. 숨결 한 번으로 대지를 얼려버립니다.",
            specialLoot: "절대영도의 핵",
            detailedLoot: {
                name: "절대영도의 핵",
                type: "SubWeapon",
                weaponType: "Orb",
                rarity: ItemRarity.UNIQUE,
                description: "서리 거인의 가슴에서 꺼낸 차가운 결정. 주변의 온도를 급격히 낮춥니다.",
                stats: { int: 160, def: 100, hp: 500 },
                secondaryOptions: ["빙결계 속성 피해 +30%", "상태이상 저항 +30%","빙결계 속성 저항 +10%"],
                enhancement: 0,
                imageUrl:"https://i.ibb.co/CpttdC99/Gemini-Generated-Image-o1o5who1o5who1o5.png"
            },
            visualUrl: "https://i.ibb.co/Rp3hB6pD/Gemini-Generated-Image-z34lhwz34lhwz34l.png",
            level: 475,
            skills: [
                createBossSkill("블리자드 스톰", "[부가 효과: 냉기] 광범위한 지역에 살인적인 눈보라를 일으킵니다.", SkillType.MAGIC, 420, 150, "INT*4.2"),
                createBossSkill("빙하 분쇄", "[부가 효과: 파열] 거대한 얼음 주먹으로 적을 내리찍습니다.", SkillType.PHYSICAL, 550, 110, "STR*5.5", 'single'),
                createBossSkill("영구동토", "전장을 얼려 적들의 속도를 앗아갑니다.", SkillType.DEBUFF, 0, 130, "AGI -70%, Speed -50%")
            ]
        },
        "후쿠오카": {
            id:"boss_fukuoka",
            name: "하카타의 해룡",
            title: "현해탄의 폭풍",
            shinryokuType: "해수계",
            description: "하카타 만에 잠들어 있던 수룡이 깨어났습니다. 폭풍우와 거센 파도를 자유자재로 다룹니다.",
            specialLoot: "해룡의 푸른 비늘",
            detailedLoot: {
                name: "해룡의 푸른 비늘",
                type: "Body",
                rarity: ItemRarity.UNIQUE,
                description: "어떤 물길도 가를 수 있게 해준다는 전설적인 용의 비늘.",
                stats: { def: 180, agi: 70, ctrl: 50 },
                secondaryOptions: ["DEF 22%", "WIS +15%", "AGI +20%"],
                enhancement: 0,
                imageUrl:"https://i.ibb.co/1G5T06q3/Gemini-Generated-Image-86sh8i86sh8i86sh.png"
            },
            visualUrl: "https://i.ibb.co/v4ZVfHf2/Gemini-Generated-Image-7uequq7uequq7ueq.png",
            level: 485,
            skills: [
                createBossSkill("해신의 해일", "[부가 효과: 속박] 거대한 파도로 적들을 휩쓸어 고립시킵니다.", SkillType.MAGIC, 460, 140, "INT*4.6"),
                createBossSkill("폭풍의 이빨", "날카로운 물살로 적을 여러 번 베어냅니다.", SkillType.PHYSICAL, 380, 90, "AGI*3.8", 'single'),
                createBossSkill("용오름", "[부가 효과: 감전] 폭풍우 속에서 번개를 동반한 회오리를 소환합니다.", SkillType.MAGIC, 400, 110, "INT*4.0")
            ]
        }
    },
    "중국": {
        "베이징": {
            id:"boss_beijing",
            name: "자금성의 황룡",
            title: "천상의 황제",
            shinryokuType: "광휘계",
            description: "중국의 중심, 자금성 지하에 봉인되어 있던 고대의 황금 용입니다. 대륙의 신력을 한 몸에 모으고 있습니다.",
            specialLoot: "황제의 신성 옥새",
            detailedLoot: {
                name: "황제의 신성 옥새",
                type: "Accessory",
                rarity: ItemRarity.LEGENDARY,
                description: "천명을 받은 자만이 소지할 수 있다는 전설의 옥새.",
                stats: { str: 160, int: 160, wis: 160, def: 160, agi: 60, ctrl: 180 },
                secondaryOptions: ["모든 능력치 +15%", "CTRL +30%", "광휘계 속성 피해 +20%","광휘계 속성 저항 +20%"],
                enhancement: 0,
                imageUrl:"https://i.ibb.co/R4S2LqNr/Gemini-Generated-Image-ltq9wltq9wltq9wl.png"
            },
            visualUrl: "https://i.ibb.co/svPsV6X4/Gemini-Generated-Image-y7lpnay7lpnay7lp.png",
            level: 520,
            skills: [
                createBossSkill("천벌: 광휘의 숨결", "[부가 효과: 소멸] 모든 사악한 것을 정화하는 황금빛 숨결입니다.", SkillType.MAGIC, 650, 200, "INT*6.5"),
                createBossSkill("천자의 위엄", "[부가 효과: 공포] 존재만으로 적들을 압도하여 능력치를 깎습니다.", SkillType.DEBUFF, 0, 150, "ALL_STATS -30%"),
                createBossSkill("제국의 방벽", "금색의 보호막으로 모든 피해를 튕겨냅니다.", SkillType.BUFF, 0, 180, "Counter 50%, DEF +100%", 'self')
            ]
        },
        "상하이": {
            id:"boss_sanghai",
            name: "와이탄의 전뇌룡",
            title: "사이버 네틱 리바이어던",
            shinryokuType: "전격계",
            description: "상하이의 마천루에서 방출되는 엄청난 전기 신호를 흡수하여 진화한 기계용입니다.",
            specialLoot: "전뇌룡의 초전도 엔진",
            detailedLoot: {
                name: "전뇌룡의 초전도 엔진",
                type: "SubWeapon",
                weaponType: "Orb",
                rarity: ItemRarity.UNIQUE,
                description: "무한한 전력을 공급하는 초소형 초전도 엔진.",
                stats: { int: 210, agi: 80 },
                secondaryOptions: ["전격계 속성 피해 +30%", "AGI +15%", "마법 공격력 +15%"],
                enhancement: 0,
                imageUrl:"https://i.ibb.co/Xrp56W3g/Gemini-Generated-Image-jl6ahjjl6ahjjl6a.png"
            },
            visualUrl: "https://i.ibb.co/Q7gMLmYX/Gemini-Generated-Image-v2yh5ov2yh5ov2yh.png",
            level: 480,
            skills: [
                createBossSkill("전뇌 폭풍", "[부가 효과: 감전] 도시의 전력을 하나로 모아 광범위하게 방출합니다.", SkillType.MAGIC, 520, 160, "INT*5.2"),
                createBossSkill("데이터 말살 레이저", "응축된 고에너지 빔으로 목표를 분해합니다.", SkillType.MAGIC, 750, 120, "INT*7.5", 'single'),
                createBossSkill("오버클럭 모드", "시스템의 한계를 돌파하여 민첩성을 극도로 높입니다.", SkillType.BUFF, 0, 140, "AGI +150%, Critical Damage +50%", 'self')
            ]
        },
        "광저우": {
            id:"boss_gwangjou",
            name: "남방의 불사조 주작",
            title: "영원한 불꽃",
            shinryokuType: "화염계",
            description: "남쪽의 뜨거운 열기를 다스리는 전설의 영수입니다. 죽음조차 극복하는 생명력을 가졌습니다.",
            specialLoot: "주작의 불타는 깃털",
            detailedLoot: {
                name: "주작의 불타는 깃털",
                type: "Accessory",
                rarity: ItemRarity.UNIQUE,
                description: "주작의 날개에서 떨어진 영원히 꺼지지 않는 깃털.",
                stats: { int: 180, hp: 400, mp: 300 },
                secondaryOptions: ["상태이상 저항 +10%", "화염계 속성 피해 +20%", "HP +25%"],
                enhancement: 0,
                imageUrl:"https://i.ibb.co/nNn0CL9y/Gemini-Generated-Image-fcdprfcdprfcdprf.png"
            },
            visualUrl: "https://i.ibb.co/hRmQchVL/Gemini-Generated-Image-6biys46biys46biy.png",
            level: 485,
            skills: [
                createBossSkill("홍련의 겁화", "[부가 효과: 화상] 지옥의 끝보다 뜨거운 불꽃으로 전장을 덮습니다.", SkillType.MAGIC, 580, 180, "INT*5.8"),
                createBossSkill("불사조의 날갯짓", "거대한 바람을 일으키며 자신은 강력한 회복을 시도합니다.", SkillType.BUFF, 0, 150, "HP 30% 회복, Cleanse All Debuffs", 'self'),
                createBossSkill("불의 낙인", "적의 영혼에 불의 낙인을 찍어 지속적인 피해를 입힌다.", SkillType.DEBUFF, 0, 120, "Burn(Strong), DEF -30%")
            ]
        },
        "시안": {
            id:"boss_xian",
            name: "병마용의 군주",
            title: "진시황의 수호장군",
            shinryokuType: "강철계",
            description: "수천 년 동안 황제를 지키던 병마용들의 우두머리가 신력으로 깨어났습니다. 대지를 뒤흔드는 무게감을 자랑합니다.",
            specialLoot: "진왕의 부러진 검",
            detailedLoot: {
                name: "진왕의 부러진 검",
                type: "Weapon",
                weaponType: "Sword",
                rarity: ItemRarity.UNIQUE,
                description: "부러졌음에도 불구하고 압도적인 위엄을 풍기는 고대의 검.",
                stats: { str: 200, def: 50, ctrl: 40 },
                secondaryOptions: ["물리 공격력 +20%", "강철계 속성 부여","강철계 속성 피해 +20%"],
                enhancement: 0,
                imageUrl:"https://i.ibb.co/hRfcjjZL/Gemini-Generated-Image-gnje5lgnje5lgnje.png"
            },
            visualUrl: "https://i.ibb.co/b59tnQJH/Gemini-Generated-Image-lcboprlcboprlcbo.png",
            level: 475,
            skills: [
                createBossSkill("천하통일의 일격", "제국의 힘을 모아 단 한 번의 강력한 타격을 가합니다.", SkillType.PHYSICAL, 800, 150, "STR*8.0", 'single'),
                createBossSkill("대지 진동", "[부가 효과: 속박] 발을 굴러 지면을 뒤틀어 적들을 묶습니다.", SkillType.PHYSICAL, 350, 100, "STR*3.5"),
                createBossSkill("강철의 대오", "주변의 기운을 경화시켜 철벽 같은 방어를 구축합니다.", SkillType.BUFF, 0, 120, "DEF +150%, M.Def +100%", 'self')
            ]
        },
        "청두": {
            id:"boss_cheongdo",
            name: "판다 신수",
            title: "죽림의 무신",
            shinryokuType: "신체강화계",
            description: "겉보기엔 유순해 보이지만, 신수 중 가장 파괴적인 근접 격투술을 구사하는 대나무 숲의 수호자입니다.",
            specialLoot: "무신의 황금 죽순",
            detailedLoot: {
                name: "무신의 황금 죽순",
                type: "Consumable",
                rarity: ItemRarity.UNIQUE,
                description: "먹는 순간 전신의 근육이 폭발적으로 강화되는 신비한 죽순.",
                secondaryOptions: ["STR +20%(5턴)", "물리 공격력 +15%(5턴)","STR +2(영구)"],
                enhancement: 0,
                imageUrl:"https://i.ibb.co/M5Wt0QWC/Gemini-Generated-Image-tlcdbrtlcdbrtlcd.png"
            },
            visualUrl: "https://i.ibb.co/yctz1wg3/Gemini-Generated-Image-55dbn855dbn855db.png",
            level: 485,
            skills: [
                createBossSkill("백렬권", "눈에 보이지 않는 속도로 무수한 정권 지르기를 가합니다.", SkillType.PHYSICAL, 600, 130, "STR*6.0", 'single'),
                createBossSkill("죽림의 은신", "대나무 숲의 기운을 빌려 기척을 지우고 적을 기습합니다.", SkillType.BUFF, 0, 110, "AGI +100%, Crit Rate +50%", 'self'),
                createBossSkill("대지 분쇄 던지기", "적을 붙잡아 지면에 강하게 메칩니다.", SkillType.PHYSICAL, 500, 100, "STR*5.0", 'single')
            ]
        }
    },
};

export const DEFAULT_BOSS_LOOT: Item = {
    name: "마계의 핵",
    type: "Accessory",
    rarity: ItemRarity.LEGENDARY,
    description: "고대 마계의 동력원이었던 결정체입니다.",
    stats: { ctrl: 200 },
    secondaryOptions: ["모든 스탯 +150%"],
    enhancement: 0,
    imageUrl:"https://i.ibb.co/KzXgZt5w/Gemini-Generated-Image-9sv52s9sv52s9sv5.png"  
};

export const DEFAULT_BOSS: BossData = {
    id:"boss_magye",
    name: "허무의 제로크",
    title: "마계의 수호자",
    shinryokuType: "암흑계",
    description: "마계를 지키는 알수없는 형체의 몬스터입니다.",
    specialLoot: "마계의 핵",
    detailedLoot: {
                name: "마계의 핵",
    type: "Accessory",
    rarity: ItemRarity.LEGENDARY,
    description: "고대 마계의 동력원이었던 결정체입니다.",
    stats: { ctrl: 200 },
    secondaryOptions: ["모든 스탯 +100%"],
    enhancement: 0,
    imageUrl:"https://i.ibb.co/KzXgZt5w/Gemini-Generated-Image-9sv52s9sv52s9sv5.png"  
            },
    visualUrl: "https://i.ibb.co/4w6L5YqM/Kakao-Talk-20251229-085504416-10.png",
    level: 1500,
    skills: [
        createBossSkill("고대의 일격", "육중한 무게로 지면을 내리칩니다.", SkillType.PHYSICAL, 300, 50, "STR*5.0"),
        createBossSkill("가디언 빔", "눈에서 강력한 마력 광선을 발사합니다.", SkillType.MAGIC, 400, 70, "INT*10.0")
    ]
};

/**
 * 보스 전리품 능력치 및 보조 옵션 중폭 상향용 헬퍼 함수 (Booster)
 */
export const boostBossLootItem = (loot: Item): Item => {
    if (!loot) return loot;
    if (!isEquipmentItem(loot)) return loot;
    const boosted = { ...loot };
    
    // [1] 기본 스탯 1.8배 ~ 2.0배 대폭 강화 (장비만 해당)
    if (boosted.stats) {
        boosted.stats = { ...boosted.stats };
        Object.keys(boosted.stats).forEach(k => {
            const val = boosted.stats![k as keyof Stats];
            if (typeof val === 'number') {
                boosted.stats![k as keyof Stats] = Math.floor(val * 1.8);
            }
        });
        if (boosted.stats.hp) {
            boosted.stats.hp = Math.floor(boosted.stats.hp * 2.0);
        }
        if (boosted.stats.maxHp) {
            boosted.stats.maxHp = Math.floor(boosted.stats.maxHp * 2.0);
        }
    }

    // [2] 기본 가격 상향
    if (boosted.price !== undefined) {
        boosted.price = Math.floor(boosted.price * 1.8);
    }

    // [3] 보조 옵션 성능 강화 및 개수 5개 이상 보장 (장비 아이템만 적용)
    if (isEquipmentItem(boosted)) {
        const options = boosted.secondaryOptions ? [...boosted.secondaryOptions] : [];
        
        // 기존 옵션의 퍼센티지 및 수치 값을 1.8배 증가시킴
        const upgradedOptions = options.map(opt => {
            return opt.replace(/([+-]?\s*)(\d+(?:\.\d+)?)(%|G|G\s*)?/g, (match, prefixSign, valueStr, suffixUnit) => {
                const val = parseFloat(valueStr);
                if (!isNaN(val)) {
                    const scaledVal = Math.floor(val * 1.8);
                    return `${prefixSign || ''}${scaledVal}${suffixUnit || ''}`;
                }
                return match;
            });
        });

        // 몬스터 종류 및 레벨에 걸맞은 초호화 스페셜 전용 강력 옵션군 풀
        const extraOptionsPool = [
            "물리 공격력 +25%",
 "물리 공격력 +25%",
            "치명타 피해 +25%",
            "모든 스탯 +20%",
            "마법 공격력 +25%",
            "모든 상태이상 저항 +20%",
            "최종 스탯 +25%",
            "모든 속성 피해 +25%",
 "물리 공격력 +25%",
            "치명타 피해 +25%",
            "모든 스탯 +20%",
            "마법 공격력 +25%",
            "모든 상태이상 저항 +20%",
            "최종 스탯 +25%",
            "모든 속성 피해 +25%",
            "AGI +25%",
            "STR +25%",
            "INT +25%",
            "WIS +25%",
            "CTRL +25%",
            "DEF +25%",
      "AGI +25%",
            "STR +25%",
            "INT +25%",
            "WIS +25%",
            "CTRL +25%",
            "DEF +25%",
            "물리 방어력 +30%",
            "마법 방어력 +30%",
            "치명타율 +30%",
            "물리 회피율 +30%",
            "치명타 피해량 +30%",
            "물리 명중률 +30%",
            "마법 명중률 +30%",
            "마법 회피율 +30%",
  "물리 방어력 +30%",
            "마법 방어력 +30%",
            "치명타율 +30%",
            "물리 회피율 +30%",
            "치명타 피해량 +30%",
            "물리 명중률 +30%",
            "마법 명중률 +30%",
            "마법 회피율 +30%", "물리 공격력 +25%",
            "치명타 피해 +25%",
            "모든 스탯 +20%",
            "마법 공격력 +25%",
            "모든 상태이상 저항 +20%",
            "최종 스탯 +25%",
            "모든 속성 피해 +25%",
 "물리 공격력 +25%",
            "치명타 피해 +25%",
            "모든 스탯 +20%",
            "마법 공격력 +25%",
            "모든 상태이상 저항 +20%",
            "최종 스탯 +25%",
            "모든 속성 피해 +25%",
            "AGI +25%",
            "STR +25%",
            "INT +25%",
            "WIS +25%",
            "CTRL +25%",
            "DEF +25%",
      "AGI +25%",
            "STR +25%",
            "INT +25%",
            "WIS +25%",
            "CTRL +25%",
            "DEF +25%",
            "물리 방어력 +30%",
            "마법 방어력 +30%",
            "치명타율 +30%",
            "물리 회피율 +30%",
            "치명타 피해량 +30%",
            "물리 명중률 +30%",
            "마법 명중률 +30%",
            "마법 회피율 +30%",
  "물리 방어력 +30%",
            "마법 방어력 +30%",
            "치명타율 +30%",
            "물리 회피율 +30%",
            "치명타 피해량 +30%",
            "물리 명중률 +30%",
            "마법 명중률 +30%",
            "마법 회피율 +30%",
            "치명타 피해 +25%",
            "모든 스탯 +20%",
            "마법 공격력 +25%",
            "모든 상태이상 저항 +20%",
            "최종 스탯 +25%",
            "모든 속성 피해 +25%",
 "물리 공격력 +25%",
            "치명타 피해 +25%",
            "모든 스탯 +20%",
            "마법 공격력 +25%",
            "모든 상태이상 저항 +20%",
            "최종 스탯 +25%",
            "모든 속성 피해 +25%",
            "AGI +25%",
            "STR +25%",
            "INT +25%",
            "WIS +25%",
            "CTRL +25%",
            "DEF +25%",
      "AGI +25%",
            "STR +25%",
            "INT +25%",
            "WIS +25%",
            "CTRL +25%",
            "DEF +25%",
            "물리 방어력 +30%",
            "마법 방어력 +30%",
            "치명타율 +30%",
            "물리 회피율 +30%",
            "치명타 피해량 +30%",
            "물리 명중률 +30%",
            "마법 명중률 +30%",
            "마법 회피율 +30%",
  "물리 방어력 +30%",
            "마법 방어력 +30%",
            "치명타율 +30%",
            "물리 회피율 +30%",
            "치명타 피해량 +30%",
            "물리 명중률 +30%",
            "마법 명중률 +30%",
            "마법 회피율 +30%",
  "물리 공격력 +25%",
 "물리 공격력 +25%",
            "치명타 피해 +25%",
            "모든 스탯 +20%",
            "마법 공격력 +25%",
            "모든 상태이상 저항 +20%",
            "최종 스탯 +25%",
            "모든 속성 피해 +25%",
 "물리 공격력 +25%",
            "치명타 피해 +25%",
            "모든 스탯 +20%",
            "마법 공격력 +25%",
            "모든 상태이상 저항 +20%",
            "최종 스탯 +25%",
            "모든 속성 피해 +25%",
            "AGI +25%",
            "STR +25%",
            "INT +25%",
            "WIS +25%",
            "CTRL +25%",
            "DEF +25%",
      "AGI +25%",
            "STR +25%",
            "INT +25%",
            "WIS +25%",
            "CTRL +25%",
            "DEF +25%",
            "물리 방어력 +30%",
            "마법 방어력 +30%",
            "치명타율 +30%",
            "물리 회피율 +30%",
            "치명타 피해량 +30%",
            "물리 명중률 +30%",
            "마법 명중률 +30%",
            "마법 회피율 +30%",
  "물리 방어력 +30%",
            "마법 방어력 +30%",
            "치명타율 +30%",
            "물리 회피율 +30%",
            "치명타 피해량 +30%",
            "물리 명중률 +30%",
            "마법 명중률 +30%",
            "마법 회피율 +30%", "물리 공격력 +25%",
            "치명타 피해 +25%",
            "모든 스탯 +20%",
            "마법 공격력 +25%",
            "모든 상태이상 저항 +20%",
            "최종 스탯 +25%",
            "모든 속성 피해 +25%",
 "물리 공격력 +25%",
            "치명타 피해 +25%",
            "모든 스탯 +20%",
            "마법 공격력 +25%",
            "모든 상태이상 저항 +20%",
            "최종 스탯 +25%",
            "모든 속성 피해 +25%",
            "AGI +25%",
            "STR +25%",
            "INT +25%",
            "WIS +25%",
            "CTRL +25%",
            "DEF +25%",
      "AGI +25%",
            "STR +25%",
            "INT +25%",
            "WIS +25%",
            "CTRL +25%",
            "DEF +25%",
            "물리 방어력 +30%",
            "마법 방어력 +30%",
            "치명타율 +30%",
            "물리 회피율 +30%",
            "치명타 피해량 +30%",
            "물리 명중률 +30%",
            "마법 명중률 +30%",
            "마법 회피율 +30%",
  "물리 방어력 +30%",
            "마법 방어력 +30%",
            "치명타율 +30%",
            "물리 회피율 +30%",
            "치명타 피해량 +30%",
            "물리 명중률 +30%",
            "마법 명중률 +30%",
            "마법 회피율 +30%",
            "치명타 피해 +25%",
            "모든 스탯 +20%",
            "마법 공격력 +25%",
            "모든 상태이상 저항 +20%",
            "최종 스탯 +25%",
            "모든 속성 피해 +25%",
 "물리 공격력 +25%",
            "치명타 피해 +25%",
            "모든 스탯 +20%",
            "마법 공격력 +25%",
            "모든 상태이상 저항 +20%",
            "최종 스탯 +25%",
            "모든 속성 피해 +25%",
            "AGI +25%",
            "STR +25%",
            "INT +25%",
            "WIS +25%",
            "CTRL +25%",
            "DEF +25%",
      "AGI +25%",
            "STR +25%",
            "INT +25%",
            "WIS +25%",
            "CTRL +25%",
            "DEF +25%",
            "물리 방어력 +30%",
            "마법 방어력 +30%",
            "치명타율 +30%",
            "물리 회피율 +30%",
            "치명타 피해량 +30%",
            "물리 명중률 +30%",
            "마법 명중률 +30%",
            "마법 회피율 +30%",
  "물리 방어력 +30%",
            "마법 방어력 +30%",
            "치명타율 +30%",
            "물리 회피율 +30%",
            "치명타 피해량 +30%",
            "물리 명중률 +30%",
            "마법 명중률 +30%",
            "마법 회피율 +30%",
            "물리 공격력 +50%",
            "마법 공격력 +50%",
            "최종 스탯 +50%",
            "모든 속성 피해 +50%",
            "물리 방어력 +60%",
            "마법 방어력 +60%",
             "AGI +50%",
            "STR +50%",
            "INT +50%",
            "WIS +50%",
            "CTRL +50%",
            "DEF +50%",
    "물리 공격력 +100%",
            "마법 공격력 +100%",
            "최종 스탯 +100%",
            "모든 속성 피해 +100%",
            "물리 방어력 +100%",
            "마법 방어력 +100%",
             "AGI +100%",
            "STR +100%",
            "INT +100%",
            "WIS +100%",
            "CTRL +100%",
            "DEF +100%",
        ];

        // 등급별 목표 옵션 개수 설정:
        // 에픽 이하 등급: 3개
        // 유니크 등급: 4개
        // 전설 등급: 5개
        // 신화 등급: 7개
        let targetOptionCount = 3;
        if (boosted.rarity === ItemRarity.MYTHTIC) {
            targetOptionCount = 7;
        } else if (boosted.rarity === ItemRarity.LEGENDARY) {
            targetOptionCount = 5;
        } else if (boosted.rarity === ItemRarity.UNIQUE) {
            targetOptionCount = 4;
        } else {
            targetOptionCount = 3;
        }

        // 중복을 완벽히 방지하여 등급에 맞는 옵션 개수만큼 가득 채움
        let attempts = 0;
        while (upgradedOptions.length < targetOptionCount && attempts < 200) {
            attempts++;
            const randomOpt = extraOptionsPool[Math.floor(Math.random() * extraOptionsPool.length)];
            if (!upgradedOptions.includes(randomOpt)) {
                upgradedOptions.push(randomOpt);
            }
        }

        boosted.secondaryOptions = upgradedOptions;
    } else {
        boosted.secondaryOptions = [];
    }
    
    return boosted;
};

/**
 * 우선순위에 따른 보스 데이터 조회 함수 (전리품 부스터 필터가 적용된 복사본 반환)
 */
export const getBossByLocation = (nation: string, city: string, month?: number): BossData => {
    let rawBoss: BossData | null = null;

    // [1] 시즌 보스 체크 (신화급)
    if (month && SEASONAL_BOSS_CONFIG[month]) {
        const config = SEASONAL_BOSS_CONFIG[month];
        const matchedConfig = config.find(c => c.nation === nation && c.city === city);
        if (matchedConfig) {
            const seasonalBoss = SEASONAL_BOSSES[matchedConfig.bossKey];
            if (seasonalBoss) rawBoss = seasonalBoss;
        }
    }

    // [2] 신계 지역 보스 체크
    if (!rawBoss && DIVINE_REALM_BOSSES[nation] && DIVINE_REALM_BOSSES[nation][city]) {
        rawBoss = DIVINE_REALM_BOSSES[nation][city];
    }

    // [3] 판타지 세력 보스 체크 (엘프, 수인, 마인)
    if (!rawBoss && FANTASY_BOSSES[nation] && FANTASY_BOSSES[nation][city]) {
        rawBoss = FANTASY_BOSSES[nation][city];
    }

    // [4] 아메리카 지역 보스 체크
    if (!rawBoss && AMERICA_BOSSES[nation] && AMERICA_BOSSES[nation][city]) {
        rawBoss = AMERICA_BOSSES[nation][city];
    }

    // [5] 유럽 지역 보스 체크
    if (!rawBoss && EUROPE_BOSSES[nation] && EUROPE_BOSSES[nation][city]) {
        rawBoss = EUROPE_BOSSES[nation][city];
    }

    // [6] 아시아 지역 보스 체크
    if (!rawBoss && ASIA_BOSSES[nation] && ASIA_BOSSES[nation][city]) {
        rawBoss = ASIA_BOSSES[nation][city];
    }

    // [7] 아프리카 지역 보스 체크
    if (!rawBoss && AFRICA_BOSSES[nation] && AFRICA_BOSSES[nation][city]) {
        rawBoss = AFRICA_BOSSES[nation][city];
    }

    // [8] 일반 지역 보스 체크
    if (!rawBoss && DETAILED_BOSSES[nation] && DETAILED_BOSSES[nation][city]) {
        rawBoss = DETAILED_BOSSES[nation][city];
    }
    
    // 국가 내 다른 도시 보스라도 있다면 첫 번째 도시 보스 반환
    if (!rawBoss && DETAILED_BOSSES[nation]) {
        const firstCity = Object.keys(DETAILED_BOSSES[nation])[0];
        rawBoss = DETAILED_BOSSES[nation][firstCity];
    }

    if (!rawBoss) {
        rawBoss = DEFAULT_BOSS;
    }

    // 원본 데이터를 오염시키지 않기 위해 안전하게 복제(Clone) 진행
    const clonedBoss = JSON.parse(JSON.stringify(rawBoss)) as BossData;

    // 복제본의 detailedLoot는 raw 상태로 보존 (드롭 시점에 processBossDetailedLoot에 의해 일정 확률로 부스트 적용)
    return clonedBoss;
};

export const generateBossMonster = (nation: string, city: string, month?: number): Enemy => {
    const data = getBossByLocation(nation, city, month);
    const level = data.level;
    const id = data.id || '';
    const stats = generateEnemyStats(level);

    // 1. 절대신 엘라 판별
    const isElla = id === 'mythicboss_ella' || id.toLowerCase().includes('ella') || data.name.includes('절대신') || data.name.includes('엘라');

    // 2. 태양의 사자, 월광의 사자, 마신 판별 (절대신 이하, 일반 신화 보스 이상 최고위 보스)
    const isSunMoonOrDemonGod = 
        id === 'mythicboss_elkle' || 
        id === 'mythicboss_moonlight' || 
        id === 'mythicboss_imperial' || 
        data.name.includes('태양의 사자') || 
        data.name.includes('월광의 사자') || 
        data.name.includes('마신 임페리얼') || 
        (data.name.includes('엘클') && !data.name.includes('분신')) || 
        (data.name.includes('최원한') && !data.name.includes('분신')) || 
        (data.name.includes('임페리얼') && !data.name.includes('분신'));

    // 3. 시즌보스 판별 (월별 침략 보스)
    const isSeasonal = isMythicSeasonalBoss(data);

    // 4. 일반 신화보스 판별 (신의 사자 분신, 제너럴, 일반 신계/마계 보스 등)
    const isMythicBoss = 
        id.toLowerCase().includes('mythic') || 
        id.toLowerCase().includes('boss_') || 
        id.toLowerCase().includes('general') || 
        id.toLowerCase().includes('messager') || 
        id.toLowerCase().includes('demon') || 
        id.toLowerCase().includes('sooin') || 
        id.toLowerCase().includes('elf') ||
        Boolean(DIVINE_REALM_BOSSES[nation]?.[city]) ||
        ['신계', '마계', '양의 기운의 성전', '음의 기운의 성전', '무의 궁궐', '네크로디움 제국', '임페리얼 제국', '미르탈 숲연합', '레오니스 투기국'].includes(nation) ||
        ['광휘계', '태양계', '월광계', '암흑계'].includes(data.shinryokuType);

    // 체력 멀티플라이어 설정:
    // 일반 보스: 150배
    // 시즌 보스: 500배
    // 일반 신화 보스: 2500배
    // 태양/월광의 사자 & 마신: 8000배 (절대신 이하, 일반 신화 보스 이상)
    // 절대신 엘라: 15000배
    let hpMultiplier = 150;
    if (isElla) {
        hpMultiplier = 15000;
    } else if (isSunMoonOrDemonGod) {
        hpMultiplier = 10000;
    } else if (isMythicBoss) {
        hpMultiplier = 2500;
    } else if (isSeasonal) {
        hpMultiplier = 500;
    }

    const statMultiplier = isElla ? 14 : isSunMoonOrDemonGod ? 11.5 : isMythicBoss ? 8 : isSeasonal ? 6 : 2.5;
    const defMultiplier = isElla ? 25 : isSunMoonOrDemonGod ? 22 : isMythicBoss ? 20 : isSeasonal ? 15 : 5;
    const ctrlMultiplier = isElla ? 20 : isSunMoonOrDemonGod ? 18 : isMythicBoss ? 15 : isSeasonal ? 10 : 2.5;

    const baseStats: Stats = {
        hp: stats.maxHp * hpMultiplier,
        maxHp: stats.maxHp * hpMultiplier,
        mp: level * (isElla ? 100000 : isSunMoonOrDemonGod ? 60000 : isMythicBoss ? 30000 : isSeasonal ? 15000 : 8000),
        maxMp: level * (isElla ? 100000 : isSunMoonOrDemonGod ? 60000 : isMythicBoss ? 30000 : isSeasonal ? 15000 : 8000),
        wis: Math.floor(stats.wis * (isElla ? 5 : isSunMoonOrDemonGod ? 4 : isMythicBoss ? 3 : isSeasonal ? 2 : 1)),
        agi: Math.floor(stats.agi * (isElla ? 5 : isSunMoonOrDemonGod ? 4 : isMythicBoss ? 3 : isSeasonal ? 2 : 1)),
        str: Math.floor(stats.str * statMultiplier),
        int: Math.floor(stats.int * statMultiplier),
        def: Math.floor(stats.def * defMultiplier),
        ctrl: Math.floor(stats.ctrl * ctrlMultiplier)
    };

    const critResist = isElla ? 60 : isSunMoonOrDemonGod ? 45 : isMythicBoss ? 30 : isSeasonal ? 15 : 5;
    const critDmgResist = isElla ? 65 : isSunMoonOrDemonGod ? 50 : isMythicBoss ? 35 : isSeasonal ? 20 : 10;

    const bossEnemy: Enemy = {
        id: id,
        name: `[BOSS] ${data.name}`,
        level: level,
        hp: baseStats.hp,
        maxHp: baseStats.maxHp,
        stats: baseStats,
        shinryokuType: data.shinryokuType,
        description: `${data.title} - ${data.description}`,
        statusEffects: [],
        skills: data.skills,
        visualUrl: getRegisteredBossVisual(data.name) || getRegisteredBossVisual(id) || data.visualUrl,
        detailedLoot: data.detailedLoot,
        critResist: critResist,
        critDmgResist: critDmgResist,
        isBoss: true
    };

    applyNpcBossGimmicks(bossEnemy, level, true);

    return bossEnemy;
};
