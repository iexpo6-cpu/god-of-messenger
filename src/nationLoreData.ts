import { Item, ItemRarity, WeaponType } from './types';

export const NATION_RELICS: Record<string, Partial<Item>> = {
    // --- 유지 대상 (한국, 중국, 일본) ---
    "대한민국": { 
        name: "천궁 태극신궁", 
        type: "Weapon",
        weaponType:"Bow", 
        rarity: ItemRarity.MYTHTIC, 
        description: "음양이 흐르는 하늘의 국궁.",
        stats: { agi: 1580, ctrl: 500 },
        secondaryOptions: ["최종 능력치 +50%", "광휘계 속성 부여", "STR +60%", "AGI +60%"],
        imageUrl: "https://i.ibb.co/6cJxsHTB/Kakao-Talk-20260127-190422488-14.png"
    },
    "북한": { 
        name: "일성지배손", 
        type: "Weapon",
        weaponType:"Energy", 
        rarity: ItemRarity.MYTHTIC, 
        description: "김일성의 지배자의 손.",
        stats: { wis: 1000, int: 580, ctrl: 100 },
        secondaryOptions: ["최종 능력치 +50%", "암흑계 속성 부여", "마법 공격력 +50%", "INT +60%"],
        imageUrl: "https://i.ibb.co/gFf3bfsy/Kakao-Talk-20260920-143323714.png"
    },
    "일본": { 
        name: "아마노무라쿠모노츠루기", 
        type: "Weapon", 
        weaponType: "Sword",
        rarity: ItemRarity.MYTHTIC, 
        description: "진실을 비추고 사악한 환상을 걷어내는 신성한 검.",
        stats: { str: 1500, def: 60 },
        secondaryOptions: ["STR +50%", "AGI +50%", "월광계 속성 부여", "최종 능력치 +40%"],
        imageUrl: "https://i.ibb.co/YFd1LMYg/Kakao-Talk-20260127-190422488-15.png"
    },
    "중국": { 
        name: "적토마", 
        type: "Accessory", 
        rarity: ItemRarity.MYTHTIC, 
        description: "대륙의 광활한 대지를 다니는 말.",
        stats: { str: 700, agi: 1000, ctrl: 90 },
        secondaryOptions: ["모든 능력치 +60%", "AGI +60%", "질풍계 속성 피해 +60%", "최종 능력치 +40%"],
        imageUrl: "https://i.ibb.co/JRkP9WpX/Gemini-Generated-Image-m4h81um4h81um4h8.png"
    },

    // --- 수정 및 신규 추가 대상 ---
    "미국": { 
        name: "자유의 성광 방패", 
        type: "SubWeapon", 
        weaponType: "Shield",
        rarity: ItemRarity.MYTHTIC, 
        description: "억압을 깨뜨리는 자유의 의지가 응축된 불멸의 방패.",
        stats: { def: 1200, ctrl: 300, maxHp: 5000 },
        secondaryOptions: ["물리 방어력 +60%", "상태이상 저항 +40%", "광휘계 속성 저항 +60%", "최대 HP +50%"],
        imageUrl: "https://i.ibb.co/VcykQXJw/Gemini-Generated-Image-ugup21ugup21ugup.png"
    },
    "영국": { 
        name: "아론다이트 로열 소드", 
        type: "Weapon", 
        weaponType: "Sword",
        rarity: ItemRarity.MYTHTIC, 
        description: "원탁의 기사도가 깃든 고결한 왕의 검.",
        stats: { str: 1400, wis: 400 },
        secondaryOptions: ["STR +50%", "물리 공격력 +50%", "강철계 속성 부여", "최종 능력치 +40%"],
        imageUrl: "https://i.ibb.co/pvwbzK7C/Gemini-Generated-Image-svyg95svyg95svyg.png"
    },
    "러시아": { 
        name: "북극성의 영구동토관", 
        type: "Head", 
        rarity: ItemRarity.MYTHTIC, 
        description: "북방의 혹한을 다스리는 지배자의 얼음 보관.",
        stats: { def: 900, wis: 1000, ctrl: 200 },
        secondaryOptions: ["빙결계 속성 피해 +60%", "빙결계 속성 저항 +60%", "상태이상 저항 +40%", "최대 HP +50%"],
        imageUrl: "https://i.ibb.co/dw6qDBtW/Gemini-Generated-Image-lyvxialyvxialyvx.png"
    },
    "독일": { 
        name: "지크프리트의 발뭉", 
        type: "Weapon", 
        weaponType: "Sword",
        rarity: ItemRarity.MYTHTIC, 
        description: "악룡 파프니르의 피를 머금은 전설의 대검.",
        stats: { str: 1600, def: 400 },
        secondaryOptions: ["강철계 속성 피해 +60%", "최종 능력치 +40%", "강철계 속성 부여", "물리 공격력 +50%"],
        imageUrl: "https://i.ibb.co/GBqvyhM/Gemini-Generated-Image-afz7j6afz7j6afz7.png"
    },
    "프랑스": { 
        name: "성처녀의 오를레앙 소드", 
        type: "Weapon", 
        weaponType: "Sword",
        rarity: ItemRarity.MYTHTIC, 
        description: "구국의 성녀 잔 다르크가 신의 계시를 받고 휘두른 검.",
        stats: { str: 1200, wis: 800, ctrl: 400 },
        secondaryOptions: ["물리 명중률 +100%", "광휘계 속성 부여", "최대 HP +50%", "최종 능력치 +40%"],
        imageUrl: "https://i.ibb.co/1tMm1rhr/Gemini-Generated-Image-ij08y0ij08y0ij08.png"
    },
    "이집트": { 
        name: "호루스의 태양 왕관", 
        type: "Head", 
        rarity: ItemRarity.MYTHTIC, 
        description: "태양신 라의 권능과 호루스의 눈이 결합된 절대 유물.",
        stats: { int: 1400, wis: 600, ctrl: 400 },
        secondaryOptions: ["물리 명중률 +60%", "화염계 속성 피해 +60%", "화염계 속성 저항 +60%", "최대 HP +50%"],
        imageUrl: "https://i.ibb.co/ynNnZz9B/Gemini-Generated-Image-y57kuly57kuly57k.png"
    },
    "사우디아라비아": { 
        name: "사막의 군주 줄피카르", 
        type: "Weapon", 
        weaponType: "Sword",
        rarity: ItemRarity.MYTHTIC, 
        description: "두 갈래로 갈라진 끝을 가진, 사막의 전설적인 명검.",
        stats: { str: 1300, agi: 900 },
        secondaryOptions: ["물리 공격력 +50%", "치명타 피해량 +60%", "화염계 속성 부여", "최종 능력치 +40%"],
        imageUrl: "https://i.ibb.co/hJBH8QKN/Gemini-Generated-Image-i6d53li6d53li6d5.png"
    },
    "이란": { 
        name: "페르시아의 불꽃 보주", 
        type: "SubWeapon", 
        weaponType: "Orb",
        rarity: ItemRarity.MYTHTIC, 
        description: "조로아스터의 신성한 불꽃이 응축된 마력의 정수.",
        stats: { int: 1500, hp: 3000 },
        secondaryOptions: ["마법 공격력 +50%", "화염계 속성 피해 +60%", "MP +50%", "최종 능력치 +40%"],
        imageUrl: "https://i.ibb.co/Y7NhxrJy/Gemini-Generated-Image-gf29a9gf29a9gf29.png"
    },
    "이스라엘": { 
        name: "솔로몬의 지혜 반지", 
        type: "Accessory", 
        rarity: ItemRarity.MYTHTIC, 
        description: "만물을 다스리고 지혜를 선사하는 신의 인장.",
        stats: { wis: 2000, ctrl: 1000 },
        secondaryOptions: ["마법 공격력 +50%", "CTRL +50%", "암흑계 속성 피해 +50%", "최종 능력치 +40%"],
        imageUrl: "https://i.ibb.co/3Y7SwMDN/Gemini-Generated-Image-1tfd6j1tfd6j1tfd.png"
    },
    "브라질": { 
        name: "아마존의 생명 심장", 
        type: "Accessory", 
        rarity: ItemRarity.MYTHTIC, 
        description: "정글의 모든 원초적 생명력이 응축된 에메랄드 결정.",
        stats: { hp: 10000, wis: 1200 },
        secondaryOptions: ["최종 능력치 +40%", "초화계 속성 피해 +50%", "초화계 속성 저항 +50%", "최대 HP +50%"],
        imageUrl: "https://i.ibb.co/j2GxhyP/Gemini-Generated-Image-iwjg3ziwjg3ziwjg.png"
    },
    "아르헨티나": { 
        name: "판파스의 은빛 박차", 
        type: "Feet", 
        rarity: ItemRarity.LEGENDARY, 
        description: "광활한 평원을 달리는 가우초의 투지가 깃든 박차.",
        stats: { agi: 800, str: 400 },
        secondaryOptions: ["AGI +80%", "물리 공격력 +30%", "질풍계 속성 피해 +40%", "최종 능력치 +30%"],
        imageUrl: "https://i.ibb.co/ds7pVnyW/Gemini-Generated-Image-souibrsouibrsoui.png"
    },
    "호주": { 
        name: "무지개 뱀의 태초비늘", 
        type: "Accessory", 
        rarity: ItemRarity.MYTHTIC, 
        description: "세상을 창조한 무지개 뱀의 기운이 담긴 오색 비늘.",
        stats: { str: 300, int: 300, def: 300, agi: 300, wis: 300, ctrl: 300 },
        secondaryOptions: ["모든 속성 저항 +60%", "물리 회피율 +35%", "해수계 속성 피해 +50%", "최종 능력치 +40%"],
        imageUrl: "https://i.ibb.co/d3mbt97/Gemini-Generated-Image-6f3ti16f3ti16f3t.png"
    },
    "뉴질랜드": { 
        name: "마우이의 전설적 낚시바늘", 
        type: "Weapon", 
        weaponType: "Blunt",
        rarity: ItemRarity.MYTHTIC, 
        description: "바다 밑에서 대륙을 낚아 올렸다는 신화 속의 거대 성물.",
        stats: { str: 1800, def: 400 },
        secondaryOptions: ["치명타 피해량 +60%", "물리 공격력 +50%", "대지계 속성 부여", "최종 능력치 +40%"],
        imageUrl: "https://i.ibb.co/C5cFtBnC/Gemini-Generated-Image-m3l7m1m3l7m1m3l7.png"
    },
    "인도": { 
        name: "파괴신 시바의 트리슈라", 
        type: "Weapon", 
        weaponType: "Spear",
        rarity: ItemRarity.MYTHTIC, 
        description: "세계를 파괴하고 재창조하는 파괴신의 삼지창.",
        stats: { str: 1500, int: 800, ctrl: 500 },
        secondaryOptions: ["물리 공격력 +60%", "마법 공격력 +50%", "전격계 속성 부여", "최종 능력치 +40%"],
        imageUrl: "https://i.ibb.co/j9pDgX9g/Gemini-Generated-Image-l9ibryl9ibryl9ib.png"
    },
    "태국": { 
        name: "에라완의 황금 상아창", 
        type: "Weapon", 
        weaponType: "Spear",
        rarity: ItemRarity.LEGENDARY, 
        description: "천상의 코끼리 에라완의 힘이 깃든 찬란한 창.",
        stats: { str: 450, agi: 300 },
        secondaryOptions: ["AGI +40%", "치명타율 +30%", "신체강화계 속성 부여", "물리 공격력 +40%"],
        imageUrl: "https://i.ibb.co/gMcHdyN0/Gemini-Generated-Image-vpu08qvpu08qvpu0.png"
    },
    "베트남": { 
        name: "호안끼엠의 거북 성패", 
        type: "SubWeapon", 
        weaponType: "Shield",
        rarity: ItemRarity.LEGENDARY, 
        description: "전설의 신검을 운반하던 거대 거북의 성스러운 등껍질.",
        stats: { def: 600, hp: 4000 },
        secondaryOptions: ["물리 방어력 +60%", "마법 방어력 +60%", "해수계 속성 저항 +60%", "최대 HP +50%"],
        imageUrl: "https://i.ibb.co/Tqgj3hrj/Gemini-Generated-Image-99tahu99tahu99ta.png"
    },
    "필리핀": { 
        name: "바쿠나와의 월광검", 
        type: "Weapon", 
        weaponType: "Sword",
        rarity: ItemRarity.LEGENDARY, 
        description: "달을 삼키는 용 바쿠나와의 어둠이 서린 곡도.",
        stats: { str: 550, agi: 450 },
        secondaryOptions: ["치명타율 +30%", "암흑계 속성 부여", "물리 명중률 +30%", "물리 공격력 +40%"],
        imageUrl: "https://i.ibb.co/gFf5gkm8/Gemini-Generated-Image-gdv498gdv498gdv4.png"
    },
    "인도네시아": { 
        name: "가루다의 황금 깃털포", 
        type: "Weapon", 
        weaponType: "Heavy",
        rarity: ItemRarity.LEGENDARY, 
        description: "악을 멸하는 가루다의 의지가 깃든 성스러운 대포.",
        stats: { agi: 800, int: 400 },
        secondaryOptions: ["마법 공격력 +50%", "광휘계 속성 피해 +50%", "광휘계 속성 부여", "최종 능력치 +30%"],
        imageUrl: "https://i.ibb.co/ksRBZDy9/Gemini-Generated-Image-5cknq45cknq45ckn.png"
    },
    "말레이시아": { 
        name: "타밍 사리의 불멸검", 
        type: "Weapon", 
        weaponType: "Sword",
        rarity: ItemRarity.LEGENDARY, 
        description: "착용자를 불사로 만든다고 전해지는 말레이시아의 보검.",
        stats: { str: 500, ctrl: 400 },
        secondaryOptions: ["치명타율 +100%", "상태이상 저항 +100%", "물리 공격력 +40%", "최종 능력치 +30%"],
        imageUrl: "https://i.ibb.co/yBq1Z2Vz/Gemini-Generated-Image-aizn3aizn3aizn3a.png"
    },
    "싱가포르": { 
        name: "머라이언의 영광 진주", 
        type: "Accessory", 
        rarity: ItemRarity.LEGENDARY, 
        description: "도시의 번영과 바다의 수호 기운을 간직한 거대 진주.",
        stats: { wis: 600, int: 400 },
        secondaryOptions: ["치명타율 +35%", "상태이상 저항 +35%", "해수계 속성 피해 +40%", "최종 능력치 +30%"],
        imageUrl: "https://i.ibb.co/S4Ts8bpz/Gemini-Generated-Image-30qnlk30qnlk30qn.png"
    },
    "터키": { 
        name: "오스만 술탄의 패도", 
        type: "Weapon", 
        weaponType: "Sword",
        rarity: ItemRarity.MYTHTIC, 
        description: "세 대륙을 호령했던 제국의 권위가 담긴 대도.",
        stats: { str: 900, hp: 2000 },
        secondaryOptions: ["물리 공격력 +50%", "최대 HP +50%", "화염계 속성 부여", "최종 능력치 +40%"],
        imageUrl: "https://i.ibb.co/TDmBy3D1/Gemini-Generated-Image-n27onsn27onsn27o.png"
    },
    "그리스": { 
        name: "전설의 이지스 방패", 
        type: "SubWeapon", 
        weaponType: "Shield",
        rarity: ItemRarity.MYTHTIC, 
        description: "제우스의 가호와 메두사의 눈이 박힌 절대 방어의 방패.",
        stats: { def: 1500, wis: 500, ctrl: 300 },
        secondaryOptions: ["물리 방어력 +100%", "상태이상 저항 +100%", "광휘계 속성 저항 +80%", "최대 HP +50%"],
        imageUrl: "https://i.ibb.co/ymJKVR98/Gemini-Generated-Image-hkamq3hkamq3hkam.png"
    },
    "폴란드": { 
        name: "윙드 후사르의 강철날개", 
        type: "Body", 
        rarity: ItemRarity.MYTHTIC, 
        description: "전장의 공포이자 자부심이었던 후사르의 기사 갑옷.",
        stats: { def: 650, agi: 500 },
        secondaryOptions: ["AGI +60%", "CTRL +60%", "강철계 속성 저항 +60%", "물리 방어력 +60%"],
        imageUrl: "https://i.ibb.co/TxWhCK9C/Gemini-Generated-Image-cdiv40cdiv40cdiv.pngg"
    },
    "우크라이나": { 
        name: "코사크의 자유 사브르", 
        type: "Weapon", 
        weaponType: "Sword",
        rarity: ItemRarity.LEGENDARY, 
        description: "초원의 자유로운 영혼이 깃든 굽은 칼.",
        stats: { str: 450, agi: 550 },
        secondaryOptions: ["AGI +40%", "치명타 피해량 +50%", "질풍계 속성 부여", "물리 공격력 +40%"],
        imageUrl: "https://i.ibb.co/4ZJH60Rq/Gemini-Generated-Image-qul78hqul78hqul7.png"
    },
    "핀란드": { 
        name: "신비한 삼포의 파편", 
        type: "Accessory", 
        rarity: ItemRarity.MYTHTIC, 
        description: "무한한 풍요와 마법적 지혜를 가져다준다는 핀란드 신화의 보물.",
        stats: { int: 1200, wis: 1200, ctrl: 800 },
        secondaryOptions: ["빙결계 속성 피해 +100%", "마법 공격력 +50%", "빙결계 속성 저항 +80%", "최종 능력치 +40%"],
        imageUrl: "https://i.ibb.co/tpMWq394/Gemini-Generated-Image-t6r5ist6r5ist6r5.png"
    },
    "스웨덴": { 
        name: "묠니르의 전동 망치", 
        type: "Weapon", 
        weaponType: "Blunt",
        rarity: ItemRarity.MYTHTIC, 
        description: "번개와 천둥을 부르는 고대 신 토르의 망치.",
        stats: { str: 1300, ctrl: 600, int: 300 },
        secondaryOptions: ["전격계 속성 부여", "전격계 속성 피해 +60%", "STR +50%", "최종 능력치 +40%"],
        imageUrl: "https://i.ibb.co/Zzn0m8mX/Gemini-Generated-Image-aazmz4aazmz4aazm.png"
    },
    "노르웨이": { 
        name: "궁니르의 신성한 창", 
        type: "Weapon", 
        weaponType: "Spear",
        rarity: ItemRarity.MYTHTIC, 
        description: "한 번 던지면 결코 빗나가지 않는 오딘의 주무기.",
        stats: { str: 1100, agi: 900, wis: 400 },
        secondaryOptions: ["물리 명중률 +200%", "광휘계 속성 피해 +80%", "광휘계 속성 부여", "최종 능력치 +40%"],
        imageUrl: "https://i.ibb.co/KCTRVW0/Gemini-Generated-Image-ny4w3iny4w3iny4w.png"
    },
    "덴마크": { 
        name: "바이킹 킹의 황금뿔", 
        type: "Accessory", 
        rarity: ItemRarity.MYTHTIC, 
        description: "모든 바이킹 전사들을 소집하고 사기를 높이는 황금 뿔잔.",
        stats: { str: 400, wis: 400, ctrl: 200 },
        secondaryOptions: ["물리 공격력 +40%", "상태이상 저항 +60%", "해수계 속성 피해 +50%", "최종 능력치 +40%"],
        imageUrl: "hhttps://i.ibb.co/4ZvPfFHw/Gemini-Generated-Image-4107gm4107gm4107.png"
    },
    "남아공": { 
        name: "희망봉의 거대 다이아몬드", 
        type: "Accessory", 
        rarity: ItemRarity.MYTHTIC, 
        description: "아프리카의 정수가 담긴, 세계에서 가장 거대한 다이아몬드 원석.",
        stats: { wis: 900, int: 500, def: 400 },
        secondaryOptions: ["물리 명중률 +50%", "마법 명중률 +50%", "강철계 속성 피해 +50%", "최종 능력치 +40%"],
        imageUrl: "https://i.ibb.co/zH2MpnGg/Gemini-Generated-Image-5vpsll5vpsll5vps.png"
    },
    "나이지리아": { 
        name: "철의 신 오군의 대퇴", 
        type: "Weapon", 
        weaponType: "Blunt",
        rarity: ItemRarity.MYTHTIC, 
        description: "모든 금속을 다스리는 신 오군이 벼려낸 파괴적인 둔기.",
        stats: { str: 850, def: 450 },
        secondaryOptions: ["물리 공격력 +50%", "강철계 속성 부여", "강철계 속성 피해 +50%", "최종 능력치 +40%"],
        imageUrl: "https://i.ibb.co/fG8NWgNt/Gemini-Generated-Image-jcbw3fjcbw3fjcbw.png"
    },
    "케냐": { 
        name: "마사이 사자 사냥 방패", 
        type: "SubWeapon", 
        weaponType: "Shield",
        rarity: ItemRarity.LEGENDARY, 
        description: "전설적인 사자 사냥꾼만이 들 수 있는 신성한 방패.",
        stats: { def: 800, hp: 5000, str: 200 },
        secondaryOptions: ["신체강화계 속성 저항 +80%", "물리 방어력 +50%", "마법 방어력 +50%", "최대 HP +50%"],
        imageUrl: "https://i.ibb.co/4w2S65NG/Gemini-Generated-Image-apys6vapys6vapys.png"
    },
    "모로코": { 
        name: "카스바의 고대 은열쇠", 
        type: "Accessory", 
        rarity: ItemRarity.LEGENDARY, 
        description: "세상의 숨겨진 보물고를 열 수 있다는 은빛 보물 열쇠.",
        stats: { wis: 400, ctrl: 300, agi: 200 },
        secondaryOptions: ["치명타율 +50%", "치명타 피해량 +40%", "물리 명중률 +40%", "최종 능력치 +30%"],
        imageUrl: "https://i.ibb.co/jZ9kYkYb/Gemini-Generated-Image-qxme9dqxme9dqxme.png"
    },
    "멕시코": { 
        name: "아즈텍 제례용 태양석", 
        type: "Accessory", 
        rarity: ItemRarity.MYTHTIC, 
        description: "태양의 생명력과 우주의 질서를 담은 거대한 돌판.",
        stats: { int: 1100, ctrl: 700, wis: 500 },
        secondaryOptions: ["태양계 속성 피해 +60%", "MP +60%", "태양계 속성 저항 +60%", "최종 능력치 +40%"],
        imageUrl: "https://i.ibb.co/fYKTFTdm/Gemini-Generated-Image-ssgh6lssgh6lssgh.png"
    },
    "캐나다": { 
        name: "노던 라이트 오로라 보주", 
        type: "SubWeapon", 
        weaponType: "Orb",
        rarity: ItemRarity.MYTHTIC, 
        description: "북극광의 찬란한 마력을 가두어 만든 신비로운 보주.",
        stats: { int: 850, wis: 450, agi: 300 },
        secondaryOptions: ["마법 공격력 +50%", "빙결계 속성 피해 +50%", "마법 회피율 +30%", "최종 능력치 +40%"],
        imageUrl: "https://i.ibb.co/Z6KmjHq8/Gemini-Generated-Image-ywi9aoywi9aoywi9.png"
    },
    "이탈리아": { 
        name: "로마 군단의 황금 독수리", 
        type: "Accessory", 
        rarity: ItemRarity.MYTHTIC, 
        description: "전 유럽을 호령했던 로마 군단의 긍지이자 제국의 상징.",
        stats: { str: 700, ctrl: 800, def: 500 },
        secondaryOptions: ["최종 능력치 +40%", "물리 공격력 +50%", "강철계 속성 피해 +50%", "STR +50%"],
        imageUrl: "https://i.ibb.co/DHB4dkw1/Gemini-Generated-Image-11x4w611x4w611x4.png"
    },
    "벨기에": { 
        name: "브뤼셀의 태엽 심장 코어", 
        type: "Accessory", 
        rarity: ItemRarity.MYTHTIC, 
        description: "정교한 마법 공학의 정점. 스스로 박동하는 금속 심장.",
        stats: { ctrl: 900, agi: 400, int: 300 },
        secondaryOptions: ["AGI +50%", "마법 공격력 +50%", "강철계 속성 피해 +50%", "최종 능력치 +40%"],
        imageUrl: "https://i.ibb.co/9Hz4nQBB/Gemini-Generated-Image-41c23n41c23n41c2.png"
    },
    "스위스": { 
        name: "알프스의 영구 얼음결정", 
        type: "SubWeapon", 
        weaponType: "Orb",
        rarity: ItemRarity.MYTHTIC, 
        description: "알프스 만년설 깊은 곳에서 채취한, 절대 녹지 않는 성스러운 얼음.",
        stats: { int: 600, def: 700, wis: 400 },
        secondaryOptions: ["마법 방어력 +60%", "빙결계 속성 저항 +80%", "빙결계 속성 피해 +50%", "최대 HP +50%"],
        imageUrl: "https://i.ibb.co/wFKKqVpQ/Gemini-Generated-Image-ykvsyyykvsyyykvs.png"
    },
    "오스트리아": { 
        name: "합스부르크 가문의 성검", 
        type: "Weapon", 
        weaponType: "Sword",
        rarity: ItemRarity.MYTHTIC, 
        description: "수백 년간 가문을 지켜온 제국의 권위가 서린 의식용 보검.",
        stats: { str: 750, int: 650, wis: 300 },
        secondaryOptions: ["모든 능력치 +50%", "광휘계 속성 피해 +50%", "광휘계 속성 부여", "최종 능력치 +40%"],
        imageUrl: "https://i.ibb.co/HDg5WYNV/Gemini-Generated-Image-rm8dikrm8dikrm8d.png"
    },
    "포르투갈": { 
        name: "대항해의 황금 육분의", 
        type: "Accessory", 
        rarity: ItemRarity.MYTHTIC, 
        description: "미지의 신세계를 발견하게 해주었던 행운의 항해 도구.",
        stats: { wis: 650, agi: 400, ctrl: 200 },
        secondaryOptions: ["물리 명중률 +60%", "물리 회피율 +35%", "해수계 속성 피해 +50%", "최종 능력치 +40%"],
        imageUrl: "https://i.ibb.co/8Dk8p0FS/Gemini-Generated-Image-jmx25ljmx25ljmx2.png"
    },
    "루마니아": { 
        name: "드라큘라의 진조 인장반지", 
        type: "Accessory", 
        rarity: ItemRarity.MYTHTIC, 
        description: "밤의 왕국을 다스리는 진조 뱀파이어의 고귀한 피가 섞인 반지.",
        stats: { int: 1000, agi: 600, str: 400 },
        secondaryOptions: ["치명타 피해량 +60%", "암흑계 속성 피해 +50%", "치명타율 +30%", "최종 능력치 +40%"],
        imageUrl: "https://i.ibb.co/B29F4M92/Gemini-Generated-Image-9w9x849w9x849w9x.png"
    },
    "헝가리": { 
        name: "성 이스트반의 성스러운 관", 
        type: "Head", 
        rarity: ItemRarity.MYTHTIC, 
        description: "헝가리 왕국의 건국과 신앙을 상징하는 신성한 보관.",
        stats: { def: 850, wis: 850, hp: 3000 },
        secondaryOptions: ["최대 HP +50%", "광휘계 속성 저항 +80%", "마법 방어력 +60%", "상태이상 저항 +40%"],
        imageUrl: "https://i.ibb.co/KcS0QVcL/Gemini-Generated-Image-jwvahrjwvahrjwva.png"
    },
    "체코": { 
        name: "프라하의 고대 골렘 점토", 
        type: "Accessory", 
        rarity: ItemRarity.LEGENDARY, 
        description: "천재 연금술사가 골렘에게 생명을 불어넣을 때 사용했던 태초의 흙.",
        stats: { def: 950, hp: 4500, str: 200 },
        secondaryOptions: ["물리 방어력 +60%", "강철계 속성 저항 +60%", "마법 방어력 +50%", "최대 HP +50%"],
        imageUrl: "https://i.ibb.co/ksJwG1FP/Gemini-Generated-Image-8raboz8raboz8rab.png"
    },
    "스코틀랜드": { 
        name: "하이랜드 용맹의 백파이프", 
        type: "Accessory", 
        rarity: ItemRarity.LEGENDARY, 
        description: "전투의 함성보다 큰 소리로 아군의 사기를 고취시키는 전통 악기.",
        stats: { wis: 500, def: 500, ctrl: 300 },
        secondaryOptions: ["물리 방어력 +60%", "상태이상 저항 +40%", "질풍계 속성 피해 +50%", "최종 능력치 +30%"],
        imageUrl: "https://i.ibb.co/j9ptfnWS/Gemini-Generated-Image-xuqmvtxuqmvtxuqm.png"
    },
    "아일랜드": { 
        name: "켈트의 영원 매듭 펜던트", 
        type: "Accessory", 
        rarity: ItemRarity.MYTHTIC, 
        description: "끝없는 순환과 보호의 마법이 깃든 켈트 문양의 신성한 장신구.",
        stats: { wis: 450, def: 450, mp: 2000 },
        secondaryOptions: ["MP +60%", "최대 HP +50%", "상태이상 저항 +50%", "최종 능력치 +40%"],
        imageUrl: "https://i.ibb.co/S7Rzk0rd/Gemini-Generated-Image-t46zyht46zyht46z.png"
    },
    "몽골": {
        name: "정복자의 황금 고삐",
        type: "Accessory",
        rarity: ItemRarity.MYTHTIC,
        description: "세계를 정복했던 칸의 말이 매여있던 황금 고삐. 기마의 속도와 위엄을 선사합니다.",
        stats: { agi: 1200, str: 800, ctrl: 500 },
        secondaryOptions: ["AGI +100%", "물리 공격력 +50%", "질풍계 속성 피해 +50%", "최종 능력치 +40%"],
        imageUrl: "https://i.ibb.co/j9N35h0F/Gemini-Generated-Image-lkekrelkekrelkek.png"
    },
    "UAE": {
        name: "제니스의 무한동력 핵",
        type: "Accessory",
        rarity: ItemRarity.MYTHTIC,
        description: "미래 도시의 에너지를 책임지는 찬란한 핵입니다.",
        stats: { int: 800, wis: 800, ctrl: 500 },
        secondaryOptions: ["마법 공격력 +50%", "MP +60%", "전격계 속성 피해 +50%", "최종 능력치 +40%"],
        imageUrl: "https://i.ibb.co/zH0RgPTv/Gemini-Generated-Image-laemgtlaemgtlaem.png"
    },
    "임페리얼 제국": {
        name: "임페리얼 칠흑 성배",
        type: "SubWeapon",
        weaponType: "Orb",
        rarity: ItemRarity.MYTHTIC,
        description: "모든 몬스터의 정수를 담고 있는 제국의 유물입니다.",
        stats: { int: 1500, wis: 500, ctrl: 1000 },
        secondaryOptions: ["마법 공격력 +60%", "암흑계 속성 피해 +60%", "암흑계 속성 저항 +60%", "최종 능력치 +40%"],
        imageUrl: "https://i.ibb.co/1YdJMfTz/Gemini-Generated-Image-up9phmup9phmup9p.png"
    },
    "미르탈 숲연합": {
        name: "실바나르의 생명 가지",
        type: "Weapon",
        weaponType: "Staff",
        rarity: ItemRarity.MYTHTIC,
        description: "세계수의 가장 높은 곳에서 꺾어온 성스러운 가지입니다.",
        stats: { int: 1200, wis: 1500 },
        secondaryOptions: ["마법 공격력 +50%", "최대 HP +50%", "초화계 속성 부여", "최종 능력치 +40%"],
        imageUrl: "https://i.ibb.co/5XyGdpF1/Gemini-Generated-Image-sseqz1sseqz1sseq.png"
    },
    "레오니스 투기국": {
        name: "투신왕의 황금 갈기",
        type: "Accessory",
        rarity: ItemRarity.MYTHTIC,
        description: "무력의 정점에 선 자만이 걸칠 수 있는 황금빛 털입니다.",
        stats: { str: 1500, def: 500, agi: 500 },
        secondaryOptions: ["물리 공격력 +50%", "치명타 피해량 +60%", "신체강화계 속성 피해 +50%", "최종 능력치 +40%"],
        imageUrl: "https://i.ibb.co/27fRfMdw/Gemini-Generated-Image-iih9r7iih9r7iih9.png"
    },
    "네크로디움 제국": {
        name: "벨리알의 심연 반지",
        type: "Accessory",
        rarity: ItemRarity.MYTHTIC,
        description: "죽음의 심연을 지배하는 마황의 인장 반지입니다.",
        stats: { int: 1200, ctrl: 800, wis: 500 },
        secondaryOptions: ["마법 공격력 +50%", "암흑계 속성 피해 +50%", "암흑계 속성 저항 +60%", "최종 능력치 +40%"],
        imageUrl: "https://i.ibb.co/BH37K67w/Gemini-Generated-Image-7d0m607d0m607d0m.png"
    }
};

export const NATION_HEROES: Record<string, { name: string, classType: string, personality: string }> = {
    "대한민국": { name: "강한결", classType: "성역의 화랑", personality: "성실함" },
    "일본": { name: "겐지", classType: "신사의 그림자", personality: "신중함" },
    "중국": { name: "관운", classType: "청룡의 무인", personality: "의협심" },
    "미국": { name: "캡틴 프리덤", classType: "자유의 집행자", personality: "정의로움" },
    "영국": { name: "아서", classType: "원탁의 후예", personality: "고결함" },
    "독일": { name: "지크", classType: "라인의 투사", personality: "냉철함" },
    "프랑스": { name: "잔", classType: "성스러운 전령", personality: "신념적" },
    "러시아": { name: "이반", classType: "북방의 곰", personality: "강인함" },
    "이집트": { name: "아몬", classType: "태양의 심판자", personality: "엄격함" },
    "그리스": { name: "헤라클레스", classType: "올림포스의 후예", personality: "호전적" },
    "몽골": { name: "테무진", classType: "초원의 정복자", personality: "대담함" },
    "사우디아라비아": { name: "살라딘", classType: "사막의 기사", personality: "지략적" },
    "이스라엘": { name: "다비드", classType: "성지의 전사", personality: "신중함" },
    "이란": { name: "다리우스", classType: "불멸의 전사", personality: "강건함" },
    "인도": { name: "아르주나", classType: "천상의 궁수", personality: "명상적" },
    "태국": { name: "나렛", title: "낙무아이 성인", personality: "끈기있음" } as any,
    "베트남": { name: "레러이", classType: "호수의 영웅", personality: "인내심강함" },
    "필리핀": { name: "라푸라푸", classType: "해안의 족장", personality: "용맹함" },
    "인도네시아": { name: "가자 마다", classType: "군도의 수호자", personality: "충직함" },
    "말레이시아": { name: "항 투아", classType: "왕실 제독", personality: "신사적" },
    "싱가포르": { name: "리", classType: "번영의 설계자", personality: "실용적" },
    "터키": { name: "오스만", classType: "제국의 시조", personality: "야심가" },
    "폴란드": { name: "얀", classType: "윙드 기사단장", personality: "긍지높음" },
    "우크라이나": { name: "이반", classType: "코사크 헷만", personality: "자유분방함" },
    "핀란드": { name: "바이나뫼이넨", classType: "영겁의 현자", personality: "신비로움" },
    "스웨덴": { name: "구스타프", classType: "북방의 사자왕", personality: "통솔력있음" },
    "노르웨이": { name: "헤랄드", classType: "바다의 정복자", personality: "거침없음" },
    "덴마크": { name: "크누트", classType: "해상 제국의 왕", personality: "치밀함" },
    "남아공": { name: "샤카", classType: "줄루의 전사왕", personality: "공격적" },
    "나이지리아": { name: "오군", classType: "철의 주술사", personality: "기술적" },
    "케냐": { name: "무루아", classType: "사바나의 추장", personality: "자애로움" },
    "모로코": { name: "이드리스", classType: "성채의 수호자", personality: "경건함" },
    "멕시코": { name: "쿠아우테목", classType: "태양의 독수리", personality: "불굴의의지" },
    "브라질": { name: "주루파리", classType: "정글의 영혼", personality: "원초적" },
    "아르헨티나": { name: "산 마르틴", classType: "해방의 기사", personality: "헌신적" },
    "캐나다": { name: "메이플", classType: "설원의 사냥꾼", personality: "차분함" },
    "이탈리아": { name: "가리발디", classType: "붉은 셔츠 대장", personality: "열정적" },
    "벨기에": { name: "보두앵", classType: "강철의 조정자", personality: "중립적" },
    "스위스": { name: "윌리엄 텔", classType: "자유의 명사수", personality: "정확함" },
    "오스트리아": { name: "프란츠", classType: "합스부르크의 영광", personality: "전통적" },
    "포르투갈": { name: "앙리", classType: "항해 왕자", personality: "탐구적" },
    "루마니아": { name: "블라드", classType: "가시 공작", personality: "잔혹함" },
    "헝가리": { name: "이스트반", classType: "성스러운 왕", personality: "경건함" },
    "체코": { name: "지슈카", classType: "무패의 전술가", personality: "독창적" },
    "스코틀랜드": { name: "윌리엄 월리스", classType: "자유의 전사", personality: "불굴" },
    "아일랜드": { name: "쿠 훌린", classType: "얼스터의 사냥개", personality: "광기" },
    "미르탈 숲연합": { name: "리안논", classType: "세계수의 궁수", personality: "우아함" },
    "레오니스 투기국": { name: "가르", classType: "아레나의 패자", personality: "호승심" },
    "네크로디움 제국": { name: "벨레드", classType: "심연의 흑마법사", personality: "지략적" },
    "임페리얼 제국": { name: "제너럴 크론", classType: "제국 사령관", personality: "잔혹함" },
    "UAE": { name: "자이드", classType: "사막의 항해사", personality: "대담함" }
};

// 기본 영웅 데이터 (목록에 없는 국가용)
export const DEFAULT_HERO = { name: "무명의 전사", classType: "성역 수호자", personality: "충직함" };