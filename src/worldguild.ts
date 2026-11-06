import { MercenaryGroup } from './types';

// 지역별 용병단 데이터 정의
export const REGIONAL_MERCENARY_GROUPS: Record<string, MercenaryGroup[]> = {
    // --- 대한민국 ---
    "서울": [
        { id: "seoul_l1", name: "백호 용병단", description: "서울에서 가장 거대한 규모를 자랑하는 엘리트 용병단입니다.", minLevel: 50, size: 'Large', nation: "대한민국", city: "서울", captain: "김강철", viceCaptain: "이민우" },
        { id: "seoul_l2", name: "태극 결사", description: "국가의 위기 상황에 투입되는 정예 용병 집단입니다.", minLevel: 45, size: 'Large', nation: "대한민국", city: "서울", captain: "박한결", viceCaptain: "최유진" },
        { id: "seoul_m1", name: "남산 그림자", description: "정보 수집과 은밀한 타격에 특화된 중형 용병단입니다.", minLevel: 30, size: 'Medium', nation: "대한민국", city: "서울", captain: "한영훈", viceCaptain: "송지아" },
        { id: "seoul_s1", name: "뒷골목 해결사", description: "작은 일도 마다치 않는 서민 밀착형 소형 용병단입니다.", minLevel: 5, size: 'Small', nation: "대한민국", city: "서울", captain: "조길동", viceCaptain: "마두식" },
    ],
      "인천": [
        { id: "incheon_l1", name: "비룡 경비대", description: "하늘길과 바닷길을 동시에 수호하는 인천 최대의 세력입니다.", minLevel: 40, size: 'Large', nation: "대한민국", city: "인천", captain: "스카이", viceCaptain: "오션" },
        { id: "incheon_m1", name: "서해의 방패", description: "해안 마물로부터 항구를 보호하는 견고한 중형 용병단입니다.", minLevel: 25, size: 'Medium', nation: "대한민국", city: "인천", captain: "장벽", viceCaptain: "철갑" },
        { id: "incheon_s1", name: "송도 스카우터", description: "신속한 기동력으로 해안선을 정찰하는 소규모 용병단입니다.", minLevel: 15, size: 'Small', nation: "대한민국", city: "인천", captain: "박쾌속", viceCaptain: "이탐색" },
    ],
    "부산": [
        { id: "busan_l1", name: "해룡 기사단", description: "거친 바다와 해안선을 지키는 부산 최대의 무력 집단입니다.", minLevel: 45, size: 'Large', nation: "대한민국", city: "부산", captain: "임바다", viceCaptain: "윤해일" },
        { id: "busan_m1", name: "항만 수호대", description: "항구의 물류와 치안을 담당하는 중형 용병단입니다.", minLevel: 25, size: 'Medium', nation: "대한민국", city: "부산", captain: "최강구", viceCaptain: "김부두" },
        { id: "busan_l2", "name": "오륙도 결사대", "description": "해상 침투 및 대마물 전투에 특화된 정예병들입니다.", "minLevel": 50, "size": 'Large', "nation": "대한민국", "city": "부산", "captain": "마동포", "viceCaptain": "박갈매기" },
        { id: "busan_s1", "name": "자갈치 해결사", "description": "시장 상인들의 민원을 해결하는 억척스러운 용병단입니다.", "minLevel": 10, "size": 'Small', "nation": "대한민국", "city": "부산", "captain": "강억척", "viceCaptain": "김팔팔" },
    ],
    "대전": [
        { id: "daejeon_l1", name: "사이언스 실드", description: "최첨단 마법 공학 무기로 무장한 기술 특화 용병단입니다.", minLevel: 35, size: 'Large', nation: "대한민국", city: "대전", captain: "박박사", viceCaptain: "최연구" },
        { id: "daejeon_m1", "name": "한빛 특공대", description: "전략적인 작전 수행 능력이 뛰어난 중형 용병단입니다.", minLevel: 20, size: 'Medium', nation: "대한민국", city: "대전", captain: "광속", viceCaptain: "중성자" },
    ],
    "대구": [
        { id: "daegu_l1", name: "달구벌 화랑", description: "뜨거운 열정과 불굴의 투지를 가진 대구의 정예 용병단입니다.", minLevel: 40, size: 'Large', nation: "대한민국", city: "대구", captain: "강불꽃", viceCaptain: "이열기" },
    ],
    "울산": [
        { id: "ulsan_l1", name: "강철의 망치", description: "중공업 단지의 기계적 힘을 전투에 활용하는 강력한 용병단입니다.", minLevel: 45, size: 'Large', nation: "대한민국", city: "울산", captain: "최강쇠", viceCaptain: "박함선" },
    ],
    "광주": [
        { id: "gwangju_l1", name: "무등산 가디언", description: "수호와 평화를 중시하는 호남 지역 최대의 용병단입니다.", minLevel: 35, size: 'Large', nation: "대한민국", city: "광주", captain: "빛고을", viceCaptain: "정정의" },
    ],


    // --- 일본 ---
     "도쿄": [
        { id: "tokyo_l1", name: "사쿠라 사무라이", description: "전통과 현대 마법 공학이 조화된 도쿄 최강의 용병단입니다.", minLevel: 55, size: 'Large', nation: "일본", city: "도쿄", captain: "Sato Genji", viceCaptain: "Tanaka Rin" },
        { id: "tokyo_m1", name: "아키바 메카닉스", description: "기계 마물을 전문적으로 다루는 기술 특화 용병단입니다.", minLevel: 30, size: 'Medium', nation: "일본", city: "도쿄", captain: "Hiroshi", viceCaptain: "Miku" },
        { id: "tokyo_l2", name: "신주쿠 섀도우", description: "밤의 도심에서 암약하는 고도의 암살 전문 용병단입니다.", minLevel: 50, size: 'Large', nation: "일본", city: "도쿄", captain: "Kuro", viceCaptain: "Yoru" },
        { id: "tokyo_s1", name: "긴자 길드", description: "귀족들의 의뢰만을 수행하는 고급 인력 사무소입니다.", minLevel: 20, size: 'Small', nation: "일본", city: "도쿄", captain: "Oshima", viceCaptain: "Sato" },
    ],
    "오사카": [
        { id: "osaka_l1", name: "쿠이오레 군단", description: "전투만큼이나 동료애를 중시하는 화끈한 대형 용병단입니다.", minLevel: 40, size: 'Large', nation: "일본", city: "오사카", captain: "Goro", viceCaptain: "Natsumi" },
        { id: "osaka_m1", name: "요도가와 레인저", description: "강 하류의 마물들을 소탕하는 지역 밀착형 중형 용병단입니다.", minLevel: 20, size: 'Medium', nation: "일본", city: "오사카", captain: "Ken", viceCaptain: "Yuki" },
        { id: "osaka_s1", name: "천하의 부엌 수호대", "description": "오사카의 먹거리를 지키는 소형 자경 용병단입니다.", minLevel: 10, size: 'Small', nation: "일본", city: "오사카", captain: "Taeko", viceCaptain: "Jun" },
    ],
    "교토": [
        { id: "kyoto_l1", name: "천년의 안개", description: "은밀한 암살과 환각 마법에 능한 교토의 비밀 조직입니다.", minLevel: 50, size: 'Large', nation: "일본", city: "교토", captain: "Kenshin", viceCaptain: "Ayane" },
    ],
    "삿포로": [
        { id: "sapporo_m1", name: "설원 사냥꾼", description: "혹한의 추위 속에서도 생존하며 적을 추격하는 집단입니다.", minLevel: 35, size: 'Medium', nation: "일본", city: "삿포로", captain: "Yukihiro", viceCaptain: "Nanami" },
    ],
    "후쿠오카": [
        { id: "fukuoka_m1", name: "규슈의 방패", description: "바다 건너오는 마물의 위협을 가장 먼저 막아내는 요새형 용병단입니다.", minLevel: 25, size: 'Medium', nation: "일본", city: "후쿠오카", captain: "Takeshi", viceCaptain: "Ken" },
    ],
   // --- 인도 및 중앙아시아 ---
     "방콕": [
        { id: "bkk_l1", name: "Muay Thai Masters", description: "강력한 타격 기술을 보유한 태국 최대의 무투 용병단입니다.", minLevel: 40, size: 'Large', nation: "태국", city: "방콕", captain: "Sombat", viceCaptain: "Toni" },
        { id: "bkk_m1", name: "Emerald Elephants", description: "왕실 사원을 수호하는 신성한 수인 기사단입니다.", minLevel: 35, size: 'Medium', nation: "태국", city: "방콕", captain: "Chai", viceCaptain: "Mei" },
        { id: "bkk_s1", name: "Chao Phraya Pirates", description: "수로를 통해 물자를 운송하고 경비하는 소규모 집단입니다.", minLevel: 15, size: 'Small', nation: "태국", city: "방콕", captain: "Water", viceCaptain: "Boat" },
    ],
    "하노이": [
        { id: "hanoi_l1", name: "Dragon Bay Divers", description: "해상과 수중 전투에서 압도적인 실력을 보이는 대형 용병단입니다.", minLevel: 45, size: 'Large', nation: "베트남", city: "하노이", captain: "Long", viceCaptain: "Nguyen" },
        { id: "hanoi_m1", name: "Lotus Lancers", description: "늪지와 정글 전투에 특화된 정예 중형 용병단입니다.", minLevel: 30, size: 'Medium', nation: "베트남", city: "하노이", captain: "Duc", viceCaptain: "Trang" },
        { id: "hanoi_s1", name: "Red River Rangers", description: "강줄기를 따라 국경을 감시하는 소규모 순찰대입니다.", minLevel: 10, size: 'Small', nation: "베트남", city: "하노이", captain: "Phuc", viceCaptain: "An" },
    ],
    "리야드": [
        { id: "riyadh_l1", name: "Desert Storm", description: "사막의 모래 폭풍처럼 적을 휩쓰는 사우디 최대의 기갑 용병단입니다.", minLevel: 50, size: 'Large', nation: "사우디아라비아", city: "리야드", captain: "Salman", viceCaptain: "Ali" },
        { id: "riyadh_m1", name: "Oil Rig Sentinels", description: "핵심 자원 시설을 보호하는 고도의 장비를 갖춘 용병단입니다.", minLevel: 40, size: 'Medium', nation: "사우디아라비아", city: "리야드", captain: "Guard", viceCaptain: "Steel" },
        { id: "riyadh_s1", name: "Mirage Hunters", description: "사막의 신기루를 이용해 적을 교란하는 특수 부대입니다.", minLevel: 30, size: 'Small', nation: "사우디아라비아", city: "리야드", captain: "Sand", viceCaptain: "Wind" },
    ],
    "뉴델리": [
        { id: "delhi_l1", name: "Lotus Guardians", description: "영적인 힘과 무력을 조화시킨 인도의 거대 용병단입니다.", minLevel: 45, size: 'Large', nation: "인도", city: "뉴델리", captain: "Rajiv", viceCaptain: "Priya" },
    ],
    "울란바토르": [
        { id: "ula_l1", name: "Golden Steppe Riders", description: "초원의 바람을 가르는 기동력 최고의 용병단입니다.", minLevel: 40, size: 'Large', nation: "몽골", city: "울란바토르", captain: "Batu", viceCaptain: "Altan" },
    ],

    // --- 중국 ---
     "베이징": [
        { id: "beijing_l1", name: "황금룡 결사", description: "황궁의 권위를 대변하는 중국 최대 규모의 정예 용병단입니다.", minLevel: 60, size: 'Large', nation: "중국", city: "베이징", captain: "Wang Hao", viceCaptain: "Li Wei" },
        { id: "beijing_l2", name: "만리장성 수비군", description: "결코 무너지지 않는 방어력을 자랑하는 철벽 용병단입니다.", minLevel: 55, size: 'Large', nation: "중국", city: "베이징", captain: "Zhang Wei", viceCaptain: "Chen" },
        { id: "beijing_m1", name: "천안문 사자", description: "도심의 평화와 질서를 유지하는 규율 잡힌 중형 조직입니다.", minLevel: 35, size: 'Medium', nation: "중국", city: "베이징", captain: "Liu", viceCaptain: "Wu" },
    ],
    "상하이": [
        { id: "shanghai_l1", name: "와이탄 크러셔", description: "첨단 장비로 무장한 현대적 감각의 대형 용병단입니다.", minLevel: 50, size: 'Large', nation: "중국", city: "상하이", captain: "Chen Long", viceCaptain: "Mei Ling" },
    ],
    "광저우": [
        { id: "guangzhou_m1", name: "남방의 비단뱀", description: "유연하고 변칙적인 전술로 적을 유린하는 중형 용병단입니다.", minLevel: 30, size: 'Medium', nation: "중국", city: "광저우", captain: "Zheng", viceCaptain: "Hu" },
    ],
    "시안": [
        { id: "xian_l1", name: "병마용 기사단", description: "고대의 단단한 방어 전술을 계승한 육중한 대형 용병단입니다.", minLevel: 45, size: 'Large', nation: "중국", city: "시안", captain: "Qin", viceCaptain: "Zhao" },
    ],
    "청두": [
        { id: "chengdu_m1", name: "죽림의 현자들", description: "권법과 내공 수련에 전념하는 전통적인 무투 용병 집단입니다.", minLevel: 35, size: 'Medium', nation: "중국", city: "청두", captain: "Panda Master", viceCaptain: "Bamboo" },
    ],

    // --- 유럽 ---
     "런던": [
        { id: "london_l1", name: "Fog Guardians", description: "런던의 짙은 안개 속에서 적을 섬멸하는 전통 있는 용병단입니다.", minLevel: 50, size: 'Large', nation: "영국", city: "런던", captain: "Sir Arthur", viceCaptain: "Lady Guinevere" },
        { id: "london_m1", name: "Thames Mariners", description: "템즈 강 하구의 수상 전투에 능한 중형 용병단입니다.", minLevel: 30, size: 'Medium', nation: "영국", city: "런던", captain: "Captain Morgan", viceCaptain: "Sail" },
        { id: "london_s1", name: "Baker Street Boys", description: "추리와 탐색 임무에 탁월한 소규모 영리 조직입니다.", minLevel: 10, size: 'Small', nation: "영국", city: "런던", captain: "Sherlock", viceCaptain: "Watson" },
    ],
    "파리": [
        { id: "paris_l1", name: "Lumière Knights", description: "빛의 도시를 수호하는 우아하고 강력한 기사단 형태의 용병단입니다.", minLevel: 45, size: 'Large', nation: "프랑스", city: "파리", captain: "Jean", viceCaptain: "Marie" },
        { id: "paris_m1", "name": "Catacomb Crawlers", "description": "지하 카타콤의 언데드들을 전문적으로 처리하는 중형 집단입니다.", "minLevel": 35, "size": 'Medium', "nation": "프랑스", "city": "파리", "captain": "Gaston", "viceCaptain": "Pierre" },
        { id: "paris_s1", "name": "Artisans of War", "description": "무기의 예술적 가치와 성능을 모두 추구하는 소규모 용병단입니다.", "minLevel": 20, "size": 'Small', "nation": "프랑스", "city": "파리", "captain": "Vincent", "viceCaptain": "Claude" },
    ],
    "맨체스터": [
        { id: "manchester_m1", name: "Industrial Knights", description: "공장 지대의 거친 노동자들이 결성한 강철 같은 용병단입니다.", minLevel: 30, size: 'Medium', nation: "영국", city: "맨체스터", captain: "Iron Mike", viceCaptain: "Gear" },
    ],
    "에든버러": [
        { id: "edinburgh_l1", name: "Highland Wolves", description: "거친 산악 지형을 누비며 사냥하는 노련한 용병단입니다.", minLevel: 40, size: 'Large', nation: "영국", city: "에든버러", captain: "William", viceCaptain: "Duncan" },
    ],
    "리버풀": [
        { id: "liverpool_s1", name: "Mersey Raiders", description: "항구의 거친 물살 속에서 활동하는 소규모 기동 부대입니다.", minLevel: 15, size: 'Small', nation: "영국", city: "리버풀", captain: "Captain Hook", viceCaptain: "Blue" },
    ],
    "마르세유": [
        { id: "marseille_m1", name: "Azure Sailors", description: "지중해의 푸른 바다를 무대로 활동하는 해전 특화 용병단입니다.", minLevel: 25, size: 'Medium', nation: "프랑스", city: "마르세유", captain: "Pierre", viceCaptain: "Jacques" },
    ],
    "베를린": [
        { id: "berlin_l1", name: "Iron Wall Panzer", description: "철벽 같은 방어력을 자랑하는 베를린 최대의 용병단입니다.", minLevel: 50, size: 'Large', nation: "독일", city: "베를린", captain: "Hans", viceCaptain: "Greta" },
        { id: "berlin_m1", name: "Brandenburg Bastions", description: "관문을 지키는 긍지 높은 중형 용병단입니다.", minLevel: 40, size: 'Medium', nation: "독일", city: "베를린", captain: "Kurt", viceCaptain: "Otto" },
        { id: "berlin_s1", name: "Techno Titans", description: "마법 공학 보조 장비를 극한으로 사용하는 소형 용병단입니다.", minLevel: 25, size: 'Small', nation: "독일", city: "베를린", captain: "Fritz", viceCaptain: "Anna" },
    ],
    "로마": [
        { id: "rome_l1", name: "Legio Aeterna", description: "고대 로마 군단의 정신을 계승한 규율 잡힌 대형 용병단입니다.", minLevel: 55, size: 'Large', nation: "이탈리아", city: "로마", captain: "Caesar III", viceCaptain: "Brutus Jr." },
        { id: "rome_m1", name: "Vatican Vanguard", description: "신성 마법과 은총을 활용하여 적을 정벌하는 중형 용병단입니다.", minLevel: 45, size: 'Medium', nation: "이탈리아", city: "로마", captain: "Pope G", viceCaptain: "Faith" },
        { id: "rome_s1", name: "Tiber Tigers", description: "강 주변의 마물들을 신속하게 제거하는 기동 부대입니다.", minLevel: 20, size: 'Small', nation: "이탈리아", city: "로마", captain: "Leo", viceCaptain: "Aqua" },
    ],
    "마드리드": [
        { id: "madrid_l1", name: "Royal Guard Free", description: "왕실의 신임을 받는 정열적이고 강력한 용병 집단입니다.", minLevel: 45, size: 'Large', nation: "스페인", city: "마드리드", captain: "Carlos", viceCaptain: "Sofia" },
    ],
    "모스크바": [
        { id: "moscow_l1", name: "Winter Bears", description: "북방의 혹한을 견뎌낸 강인한 신체 능력의 거대 용병단입니다.", minLevel: 55, size: 'Large', nation: "러시아", city: "모스크바", captain: "Ivan", viceCaptain: "Natasha" },
    ],
    "프라하": [
        { id: "prague_m1", name: "Golem Crafters", description: "연금술과 기계 공학을 전투에 접목시킨 독특한 용병단입니다.", minLevel: 30, size: 'Medium', nation: "체코", city: "프라하", captain: "Petr", viceCaptain: "Vanya" },
    ],

    // --- 아메리카 ---
   "뉴욕": [
        { id: "ny_l1", name: "Liberty Legion", description: "자유와 질서를 수호하는 뉴욕 최대의 용병단입니다.", minLevel: 55, size: 'Large', nation: "미국", city: "뉴욕", captain: "John Smith", viceCaptain: "Sarah Connor" },
        { id: "ny_m1", name: "Wall Street Sharks", description: "철저히 이익에 따라 움직이는 냉혹한 중형 용병단입니다.", minLevel: 40, size: 'Medium', nation: "미국", city: "뉴욕", captain: "Gordon", viceCaptain: "Bull" },
        { id: "ny_s1", name: "Brooklyn Brawlers", description: "거친 거리 싸움에 능한 소형 타격 용병단입니다.", minLevel: 10, size: 'Small', nation: "미국", city: "뉴욕", captain: "Hammer", viceCaptain: "Nails" },
        { id: "ny_l2", name: "Central Park Rangers", description: "도심 속 숲에서 발생하는 이변을 전문으로 해결합니다.", minLevel: 45, size: 'Large', nation: "미국", city: "뉴욕", captain: "Forest", viceCaptain: "Hunter" },
    ],
    "워싱턴 D.C.": [
        { id: "dc_l1", name: "Federal Rangers", description: "국가적 안보 위협을 전담하는 고도로 훈련된 용병단입니다.", minLevel: 50, size: 'Large', nation: "미국", city: "워싱턴 D.C.", captain: "Eagle", viceCaptain: "Stars" },
        { id: "dc_m1", name: "Capitol Guardians", description: "의사당과 정부 기관의 보초를 서는 중형 정예 용병단입니다.", minLevel: 35, size: 'Medium', nation: "미국", city: "워싱턴 D.C.", captain: "Senator", viceCaptain: "Law" },
        { id: "dc_s1", name: "Spy Glass", description: "첩보와 암호 해독에 특화된 소규모 전문 조직입니다.", minLevel: 25, size: 'Small', nation: "미국", city: "워싱턴 D.C.", captain: "Cipher", viceCaptain: "Ghost" },
    ],
    "LA": [
        { id: "la_l1", name: "Sunset Shadows", description: "할리우드의 화려함 뒤에서 은밀한 임무를 수행하는 용병단입니다.", minLevel: 40, size: 'Large', nation: "미국", city: "LA", captain: "Star", viceCaptain: "Director" },
    ],
    "시카고": [
        { id: "chicago_m1", name: "Windy City Gang", description: "거친 바람처럼 적진을 휩쓰는 돌파력 있는 중형 용병단입니다.", minLevel: 30, size: 'Medium', nation: "미국", city: "시카고", captain: "Gale", viceCaptain: "Breeze" },
    ],
    "오타와": [
        { id: "ottawa_m1", name: "Maple Leaf Shield", description: "평화와 보호를 최우선 가치로 삼는 방어 특화 용병단입니다.", minLevel: 25, size: 'Medium', nation: "캐나다", city: "오타와", captain: "Forest", viceCaptain: "Leaf" },
    ],
    "브라질리아": [
        { id: "brasilia_l1", name: "Amazonian Fangs", description: "정글의 야성을 전투의 기술로 승화시킨 거대 용병 집단입니다.", minLevel: 45, size: 'Large', nation: "브라질", city: "브라질리아", captain: "Silva", viceCaptain: "Lula" },
    ],
    "부에노스아이레스": [
        { id: "buenos_l1", name: "Silver River Guards", description: "아르헨티나의 풍요를 지키는 품격 있는 대형 용병단입니다.", minLevel: 40, size: 'Large', nation: "아르헨티나", city: "부에노스아이레스", captain: "Messi", viceCaptain: "Angel" },
    ],

    // --- 아프리카 ---
     "카이로": [
        { id: "cairo_l1", name: "Sphinx Sentinels", description: "피라미드의 신비와 고대 마법을 수호하는 대형 용병단입니다.", minLevel: 50, size: 'Large', nation: "이집트", city: "카이로", captain: "Ramesses", viceCaptain: "Cleo" },
        { id: "cairo_m1", name: "Nile Nightshade", description: "나일강변의 어둠 속에서 활동하는 암살 전문 중형 조직입니다.", minLevel: 35, size: 'Medium', nation: "이집트", city: "카이로", captain: "River", viceCaptain: "Shadow" },
        { id: "cairo_s1", "name": "Desert Vultures", "description": "사막을 떠도는 잔챙이들을 처리하는 소형 해결사입니다.", minLevel: 15, size: 'Small', nation: "이집트", city: "카이로", captain: "Bone", viceCaptain: "Scav" },
    ],
    "케이프타운": [
        { id: "cape_l1", name: "Hope Point Warriors", description: "두 바다가 만나는 지점의 험난한 환경을 극복한 전사들입니다.", minLevel: 40, size: 'Large', nation: "남아공", city: "케이프타운", captain: "Table", viceCaptain: "Mountain" },
    ],

     // --- 오세아니아 ---
    "시드니": [
        { id: "sydney_l1", name: "Opera Guardians", description: "항구의 치안과 질서를 책임지는 호주 최대의 세력입니다.", minLevel: 45, size: 'Large', nation: "호주", city: "시드니", captain: "Harbor", viceCaptain: "Bridge" },
    ],
    "오클랜드": [
        { id: "nz_m1", name: "Silver Fern Warriors", description: "자연의 기운을 빌려 싸우는 뉴질랜드의 중형 용병단입니다.", minLevel: 30, size: 'Medium', nation: "뉴질랜드", city: "오클랜드", captain: "Kiwi", viceCaptain: "Forest" },
    ],

    // --- 판타지 영역 ---
   "미르탈": [
        { id: "elf_l1", name: "Silver Leaf Rangers", description: "세계수를 수호하는 엘프족 최정예 궁수 여단입니다.", minLevel: 60, size: 'Large', nation: "미르탈 숲연합", city: "미르탈", captain: "Lorian", viceCaptain: "Elara" },
        { id: "elf_m1", "name": "Forest Whisperers", "description": "숲의 소리를 들으며 적을 추적하는 정찰 전문 용병단입니다.", minLevel: 35, "size": 'Medium', "nation": "미르탈 숲연합", "city": "미르탈", "captain": "Silas", "viceCaptain": "Luna" },
        { id: "elf_s1", name: "Dryad Protectors", description: "나무 정령들과 교감하며 숲을 가꾸고 지키는 소규모 집단입니다.", minLevel: 20, size: 'Small', nation: "미르탈 숲연합", city: "미르탈", captain: "Nymph", viceCaptain: "Green" },
    ],
    "레오폴리스": [
        { id: "beast_l1", name: "Lion Heart Pride", description: "무력을 숭상하는 수인족 최고의 전사 집단입니다.", minLevel: 65, size: 'Large', nation: "레오니스 투기국", city: "레오폴리스", captain: "Leo the Great", viceCaptain: "Rex" },
        { id: "beast_m1", name: "Blood Claw Pack", description: "공격적이고 잔인한 전술로 유명한 수인 중형 용병단입니다.", minLevel: 40, size: 'Medium', nation: "레오니스 투기국", city: "레오폴리스", captain: "Fang", viceCaptain: "Scar" },
        { id: "beast_s1", name: "Savannah Strider", description: "끝없는 평원을 달리는 신속한 전령 용병단입니다.", minLevel: 25, size: 'Small', nation: "레오니스 투기국", city: "레오폴리스", captain: "Swift", viceCaptain: "Dash" },
    ],
    "말피스": [
        { id: "demon_l1", name: "Abyssal Council Guard", description: "마황의 권위를 지키는 마인족 정예 가디언입니다.", minLevel: 70, size: 'Large', nation: "네크로디움 제국", city: "말피스", captain: "Belial", viceCaptain: "Lilith" },
        { id: "demon_m1", name: "Soul Contract Bureau", description: "영혼 계약을 체결하고 이행을 강제하는 마인 중형 조직입니다.", minLevel: 45, size: 'Medium', nation: "네크로디움 제국", city: "말피스", captain: "Greed", viceCaptain: "Sorrow" },
        { id: "demon_s1", name: "Dark Eye Spies", description: "그림자 속에 숨어 제국 내부의 불온한 움직임을 감시합니다.", minLevel: 30, size: 'Small', nation: "네크로디움 제국", city: "말피스", captain: "Sight", viceCaptain: "Blind" },
    ],
};


// 기본 용병단 (데이터가 정의되지 않은 다른 모든 도시들을 위한 동적 생성 함수)
export const DEFAULT_MERCENARY_GROUPS = (nation: string, city: string): MercenaryGroup[] => [
    { id: `${city}_l1`, name: `${city} 연합 용병단`, description: "지역 내 가장 큰 세력을 형성하고 있는 용병단입니다.", minLevel: 30, size: 'Large', nation, city, captain: "단장", viceCaptain: "부단장" },
    { id: `${city}_l2`, name: `${nation} 정예 용병회`, description: "국가 차원의 지원을 받는 대형 용병 조직입니다.", minLevel: 35, size: 'Large', nation, city, captain: "총수", viceCaptain: "집행자" },
    { id: `${city}_m1`, name: "그림자 추적자", description: "중형 규모의 노련한 사냥꾼 집단입니다.", minLevel: 20, size: 'Medium', nation, city, captain: "대장", viceCaptain: "참모" },
    { id: `${city}_m2`, name: "강철의 문장", description: "단단한 방어력을 자랑하는 용병단입니다.", minLevel: 15, size: 'Medium', nation, city, captain: "성주", viceCaptain: "기사" },
    { id: `${city}_s1`, name: "무법자의 탈출구", description: "거친 이들이 모인 소규모 해결사 조직입니다.", minLevel: 5, size: 'Small', nation, city, captain: "두목", viceCaptain: "부두목" },
    { id: `${city}_s2`, name: "떠돌이 별", description: "자유로운 영혼들이 모인 소규모 용병단입니다.", minLevel: 1, size: 'Small', nation, city, captain: "방랑자", viceCaptain: "길잡이" },
];
