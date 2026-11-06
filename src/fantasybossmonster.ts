
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

export const FANTASY_BOSSES: Record<string, Record<string, BossData>> = {
    "미르탈 숲연합": {
        "미르탈": {
            id:"boss_miratal",
            name: "성역의 숨결 에테르나",
            title: "태초의 정령의지",
            shinryokuType: "초화계",
            description: "미르탈의 모든 생명 에너지가 하나의 형상을 취한 존재입니다. 눈부신 녹색 빛으로 이루어져 있으며, 침입자의 마력을 자연의 양분으로 되돌립니다.",
            specialLoot: "에테르나의 영구 보존화",
            detailedLoot: {
                name: "에테르나의 보존 신발",
                type: "Feet",
                rarity: ItemRarity.LEGENDARY,
                description: "결코 시들지 않는 성역의 꽃 신발. 착용자의 마력 회로를 정화하고 무한한 생명력을 부여합니다.",
                stats: { wis: 220, ctrl: 220, int: 160, maxHp: 1000 },
                secondaryOptions: ["상태이상 저항 +50%", "마법공격력 +30%", "WIS +25%","모든 능력치 +10%"],
                enhancement: 0,
                imageUrl: "https://i.ibb.co/LD3tsrpp/Kakao-Talk-20260106-124855923-08.png"
            },
            visualUrl: "https://i.ibb.co/nMMqj2Sy/Kakao-Talk-20260106-005505279-11.png",
            level: 550,
            skills: [
                createBossSkill("정령의 환영", "[부가 효과: 혼란] 적들을 정령의 환상 속에 가두어 서로를 공격하게 합니다.", SkillType.MAGIC, 450, 150, "INT*4.5"),
                createBossSkill("대지의 숨결", "성역의 모든 상처를 치유하고 적의 이로운 효과를 소거합니다.", SkillType.BUFF, 0, 180, "HP 40% 회복, Dispel(Enemy)", 'self'),
                createBossSkill("생명력 환원", "[부가 효과: 흡정] 적의 마나를 강제로 추출하여 자신의 힘으로 삼습니다.", SkillType.DEBUFF, 0, 100, "MP -50%")
            ]
        },
        "실바엔": {
            id:"boss_silvaen",
            name: "폭풍의 인도자 가리온",
            title: "바람을 타는 처형자",
            shinryokuType: "질풍계",
            description: "바람의 정령왕과 계약했던 고대 엘프 기사가 타락한 모습입니다. 형체도 없는 바람의 칼날을 휘둘러 소리 없이 적의 목을 벱니다.",
            specialLoot: "가리온의 천공 날개 검",
            detailedLoot: {
                name: "천공의 날개 듀얼 소드",
                type: "Weapon",
                weaponType:"Sword",
                rarity: ItemRarity.UNIQUE,
                description: "가리온의 쌍검. 바람의 흐름을 읽어 회피력을 극대화합니다.",
                stats: { agi: 250, str: 50, ctrl: 40 },
                secondaryOptions: ["AGI +30%", "치명타율 +15%", "질풍계 속성부여"],
                enhancement: 0,
                imageUrl: "https://i.ibb.co/LTCFFCC/Kakao-Talk-20260106-124855923-07.png"
            },
            visualUrl: "https://i.ibb.co/mFRyB8by/Kakao-Talk-20260106-005505279-10.png",
            level: 500,
            skills: [
                createBossSkill("진공 절단", "[부가 효과: 출혈] 전장을 진공 상태로 만들어 적들을 찢어발깁니다.", SkillType.PHYSICAL, 550, 110, "AGI*5.5"),
                createBossSkill("난기류의 춤", "적의 명중률을 극도로 떨어뜨리는 거대 회오리를 일으킵니다.", SkillType.DEBUFF, 0, 80, "AGI -70%, Accuracy -50%")
            ]
        },
        "노르실": {
            id:"boss_norsil",
            name: "뿌리의 수호자 바르칸",
            title: "대지의 맥동을 듣는자",
            shinryokuType: "대지계",
            description: "지하 깊은 곳의 맥과 연결된 거대 바위 거인입니다. 그가 발을 굴리면 산맥이 요동치며 적의 수비를 무너뜨립니다.",
            specialLoot: "바르칸의 바위 심장",
            detailedLoot: {
                name: "태고의 바위 심장",
                type: "SubWeapon",
                weaponType: "Orb",
                rarity: ItemRarity.UNIQUE,
                description: "지각 변동의 에너지가 응축된 무거운 돌. 엄청난 방어력을 제공합니다.",
                stats: { def: 300, hp: 3000, str: 50 },
                secondaryOptions: ["물리방어력 +35%", "DEF +25%", "대지계 속성 피해 +25%"],
                enhancement: 0,
                imageUrl: "https://i.ibb.co/2383XZ5m/Kakao-Talk-20260106-124855923-06.png"
            },
            visualUrl: "https://i.ibb.co/rGxyXj6c/Kakao-Talk-20260106-005505279-09.png",
            level: 480,
            skills: [
                createBossSkill("지각 붕괴", "[부가 효과: 파열] 거대한 지진을 일으켜 적의 방어구를 분쇄합니다.", SkillType.PHYSICAL, 600, 140, "STR*6.0"),
                createBossSkill("뿌리 박기", "자신을 대지에 고정하여 방어력을 폭발시키고 체력을 재생합니다.", SkillType.BUFF, 0, 120, "DEF +100%, HP 10% Regen", 'self')
            ]
        }
    },
    "레오니스 투기국": {
        "레오폴리스": {
            id:"boss_leopois",
            name: "만신창이의 투신 테르무스",
            title: "전장의 절대적 공포",
            shinryokuType: "신체강화계",
            description: "수천 번의 결투에서 살아남은 사자 수인입니다. 온몸이 흉터투성이지만, 그 흉터는 곧 승리의 훈장이며 그의 무력은 이미 신의 경지에 닿아 있습니다.",
            specialLoot: "테르무스의 핏빛 건틀릿",
            detailedLoot: {
                name: "투신의 핏빛 건틀릿",
                type: "Hand",
                rarity: ItemRarity.LEGENDARY,
                description: "투신의 투기가 서린 무거운 장갑. 휘두를 때마다 적의 투지를 꺾어버립니다.",
                stats: { str: 300, def: 200, agi: 180, ctrl: 160 },
                secondaryOptions: ["물리공격력 +50%", "치명타율 +20%", "STR +40%", "신체강화계 속성 저항 +20%"],
                enhancement: 0,
                imageUrl: "https://i.ibb.co/pB3m5sJ5/Kakao-Talk-20260106-124855923-04.png"
            },
            visualUrl: "https://i.ibb.co/G34mCHJv/Kakao-Talk-20260106-005505279-07.png",
            level: 560,
            skills: [
                createBossSkill("투신의 연격", "대상을 무자비하게 난타하여 형체도 없이 으깨버립니다.", SkillType.PHYSICAL, 850, 150, "STR*8.5", 'single'),
                createBossSkill("패왕의 함성", "[부가 효과: 공포] 모든 적의 의지를 꺾고 행동을 봉쇄합니다.", SkillType.DEBUFF, 0, 180, "Stun(1T), ATK -40%"),
                createBossSkill("혈전의 각오", "자신의 방어를 포기하고 공격력을 극한까지 끌어올립니다.", SkillType.BUFF, 0, 200, "STR +200%, DEF -50%", 'self')
            ]
        },
        "하울가르": {
            id:"boss_howolgar",
            name: "달빛 발톱 루가루",
            title: "그림자 숲의 사냥꾼",
            shinryokuType: "월광계",
            description: "은빛 털을 가진 늑대 수인으로, 달빛 아래서 기척을 지우는 데 특화되어 있습니다. 그는 당신이 그의 존재를 알아차리기도 전에 당신의 목을 노릴 것입니다.",
            specialLoot: "루가루의 은빛 단도",
            detailedLoot: {
                name: "은빛 늑대 단도",
                type: "SubWeapon",
                weaponType: "SubSword",
                rarity: ItemRarity.UNIQUE,
                description: "달빛을 받아 은은하게 빛나는 예리한 단검. 그림자를 베어낼 수 있습니다.",
                stats: { agi: 240, str: 140, ctrl: 50 },
                secondaryOptions: ["치명타율 +25%", "AGI +20%", "월광계 속성 피해 +20%"],
                enhancement: 0,
                imageUrl: "https://i.ibb.co/8ncBrmRr/Kakao-Talk-20260106-124855923-05.png"
            },
            visualUrl: "https://i.ibb.co/kVFhGXDL/Kakao-Talk-20260106-005505279-06.png",
            level: 510,
            skills: [
                createBossSkill("그림자 도약", "[부가 효과: 암흑] 어둠 속으로 사라진 뒤 적의 배후에서 나타납니다.", SkillType.PHYSICAL, 650, 100, "AGI*6.5", 'single'),
                createBossSkill("혈월의 저주", "[부가 효과: 출혈] 대상을 피의 갈증에 빠뜨려 지속적인 피해를 입힙니다.", SkillType.DEBUFF, 0, 90, "DoT Damage, Heal Reduce 50%")
            ]
        },
        "그라울": {
            id:"boss_growl",
            name: "평원의 분노 타우루스",
            title: "부서지지 않는 뿔",
            shinryokuType: "대지계",
            description: "평원을 배회하는 거대 황소 수인입니다. 산을 깎아 만든 듯한 육중한 뿔과 단단한 신체로 모든 장애물을 박살냅니다.",
            specialLoot: "타우루스의 황금 뿔",
            detailedLoot: {
                name: "미노타우로스 황금 뿔",
                type: "Weapon",
                weaponType: "Blunt",
                rarity: ItemRarity.UNIQUE,
                description: "파괴적인 힘이 깃든 황금색 뿔. 휘두를 때마다 지면이 요동칩니다.",
                stats: { str: 280, def: 80 },
                secondaryOptions: ["물리공격력 +30%", "STR +20%", "대지계 속성 부여"],
                enhancement: 0,
                imageUrl: "https://i.ibb.co/mFtNGXR6/Kakao-Talk-20260106-124855923-03.png"
            },
            visualUrl: "https://i.ibb.co/RkLTNT7W/Kakao-Talk-20260106-005505279-05.png",
            level: 490,
            skills: [
                createBossSkill("대지 분쇄 돌진", "[부가 효과: 파열] 거대한 뿔로 지면과 함께 적을 짓밟습니다.", SkillType.PHYSICAL, 700, 150, "STR*7.0"),
                createBossSkill("낙석 세례", "공중으로 도약한 뒤 대지로 착지하여 바위 파편을 흩뿌립니다.", SkillType.MAGIC, 500, 120, "INT*5.0")
            ]
        }
    },
    "네크로디움 제국": {
        "말피스": {
            id:"boss_malphis",
            name: "심연의 찬탈자 벨리알",
            title: "공허의 지배자",
            shinryokuType: "암흑계",
            description: "제국의 의회를 장악한 강력한 마인 귀족입니다. 마신황의 투영조차 두려워하는 금지된 암흑 지식을 보유하고 있으며, 공간을 찢어 적을 소멸시킵니다.",
            specialLoot: "벨리알의 그림자 왕관",
            detailedLoot: {
                name: "찬탈자의 그림자 왕관",
                type: "Head",
                rarity: ItemRarity.LEGENDARY,
                description: "심연의 군주임을 상징하는 왕관. 착용자의 마법적 위엄을 극대화합니다.",
                stats: { int: 280, wis: 200, ctrl: 200, mp: 2000 },
                secondaryOptions: ["마법공격력 +40%", "INT +30%", "상태이상 저항 +30%","암흑계 속성 피해 +20%"],
                enhancement: 0,
                imageUrl: "https://i.ibb.co/q37Tgcbb/Kakao-Talk-20260106-124855923.png"
            },
            visualUrl: "https://i.ibb.co/Y7FYqWDL/Kakao-Talk-20260106-005505279-03.png",
            level: 540,
            skills: [
                createBossSkill("공허의 손길", "[부가 효과: 소멸] 대상을 차원 너머로 던져버리는 파괴적인 일격입니다.", SkillType.MAGIC, 750, 250, "INT*7.5"),
                createBossSkill("정신 오염", "[부가 효과: 혼란] 적의 가장 어두운 기억을 일깨워 자멸하게 합니다.", SkillType.DEBUFF, 0, 150, "Confusion(100%), Silent(2T)"),
                createBossSkill("심연의 보호막", "그림자로 자신의 신체를 감싸 모든 물리 공격을 무효화합니다.", SkillType.BUFF, 0, 180, "Physical Nullify(1T), M.Def +100%", 'self')
            ]
        },
        "바르칸": {
            id:"boss_barcan",
            name: "명계의 서기관 나르가스",
            title: "죽은 자의 기록자",
            shinryokuType: "암흑계",
            description: "산 자의 이름을 명부에 적어 죽음으로 인도하는 기괴한 리치입니다. 그는 전장의 시체들을 즉시 언데드로 되살려 방패로 삼습니다.",
            specialLoot: "나르가스의 망자 명부",
            detailedLoot: {
                name: "망자의 기록 보주",
                type: "Weapon",
                weaponType: "Grimoire",
                rarity: ItemRarity.UNIQUE,
                description: "죽은 자들의 영혼이 봉인된 마력 보주. 서늘한 한기가 느껴집니다.",
                stats: { int: 230, wis: 90, ctrl: 50 },
                secondaryOptions: ["마법공격력 +20%", "WIS +20%", "암흑계 속성 부여"],
                enhancement: 0,
                imageUrl: "https://i.ibb.co/7dKwb6pc/Kakao-Talk-20260106-124855923-01.png"
            },
            visualUrl: "https://i.ibb.co/JMwkK5y/Kakao-Talk-20260106-005505279-02.png",
            level: 500,
            skills: [
                createBossSkill("데스 라이팅", "[부가 효과: 소멸] 명부에 적힌 운명을 집행하여 즉사급 피해를 줍니다.", SkillType.MAGIC, 800, 300, "INT*8.0", 'single'),
                createBossSkill("망령의 군세", "전사한 대원들의 환영을 불러내어 적들을 유린합니다.", SkillType.MAGIC, 450, 120, "INT*4.5")
            ]
        },
        "크림존": {
            id:"boss_crimzone",
            name: "붉은 달의 처형자 카르밀라",
            title: "피의 형벌 집행자",
            shinryokuType: "암흑계",
            description: "제국의 변방에서 반역자들의 피를 거두는 고위 뱀파이어입니다. 우아한 드레스를 입고 있지만 그녀의 손에 들린 세검은 누구보다 잔혹합니다.",
            specialLoot: "카르밀라의 장미 목걸이",
            detailedLoot: {
                name: "처형자의 장미 펜던트",
                type: "Accessory",
                rarity: ItemRarity.UNIQUE,
                description: "선혈처럼 붉은 보석이 박힌 목걸이. 적의 출혈을 촉발합니다.",
                stats: { agi: 250, ctrl: 80, hp: 500 },
                secondaryOptions: ["치명타율 +30%", "AGI +25%", "암흑계 속성 피해 +25%"],
                enhancement: 0,
                imageUrl: "https://i.ibb.co/BVwTGKmP/Kakao-Talk-20260106-124855923-02.png"
            },
            visualUrl: "https://i.ibb.co/ns9z5DtZ/Kakao-Talk-20260106-005505279-01.jpg",
            level: 510,
            skills: [
                createBossSkill("블러디 로즈", "[부가 효과: 출혈] 장미 꽃잎처럼 날카로운 피의 칼날을 휘두릅니다.", SkillType.PHYSICAL, 580, 110, "AGI*5.8"),
                createBossSkill("처형의 시간", "[부가 효과: 파열] 적의 방어력을 무시하고 영혼에 직접적인 타격을 가합니다.", SkillType.PHYSICAL, 700, 200, "STR*7.0", 'single')
            ]
        }
    }
};
