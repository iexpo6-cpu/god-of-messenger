import { NationLeader } from './types';

export const NATION_LEADERS: Record<string, NationLeader> = {
    // Asia
    "대한민국": { name: "이재민", title: "대통령", desc: "실용주의적이고 냉철한 판단력을 가진 지도자.", appearance: "단정한 정장 차림의 중년 남성" },
    "미국": { name: "제임스 해밀턴", title: "대통령", desc: "강력한 군사력을 바탕으로 질서를 중시한다.", appearance: "강인한 인상의 금발 남성" },
    "중국": { name: "왕 하오", title: "주석", desc: "오랜 세월 무공을 쌓은 무인 출신의 지도자.", appearance: "전통 의상을 입은 노인" },
    "일본": { name: "나루토", title: "천황", desc: "상징적인 존재이나 마법적인 권능을 가졌다.", appearance: "신관복을 입은 온화한 남성" },
    "인도": { name: "라지브 싱", title: "총리", desc: "과학과 영성의 조화를 추구하는 현자.", appearance: "전통 의상에 스마트 안경을 쓴 남성" },
    "태국": { name: "나렛", title: "국왕", desc: "무에타이의 고수이자 국민의 존경을 받는 왕.", appearance: "화려한 왕실 예복을 입은 강건한 남성" },
    "베트남": { name: "레 반 끄엉", title: "주석", desc: "전쟁 영웅 출신으로 강단 있는 지도자.", appearance: "군복을 입은 백발의 노인" },
    "필리핀": { name: "마리아 산토스", title: "대통령", desc: "해상 무역과 외교에 능통한 지도자.", appearance: "세련된 정장 차림의 여성" },
    "인도네시아": { name: "밤방", title: "대통령", desc: "다양한 섬들을 통합하는 포용력 있는 리더.", appearance: "전통 바틱 셔츠를 입은 중년 남성" },
    "말레이시아": { name: "이스마일", title: "술탄", desc: "이슬람 율법과 현대 법의 균형을 맞춘다.", appearance: "왕관과 예복을 갖춘 근엄한 남성" },
    "싱가포르": { name: "리 웨이", title: "총리", desc: "철저한 계획 도시의 설계자.", appearance: "깔끔한 셔츠 차림의 지적인 남성" },
    "사우디아라비아": { name: "살만", title: "국왕", desc: "막대한 자금력을 가진 석유왕.", appearance: "전통 아랍 의상과 금장식" },
    "UAE": { name: "칼리파", title: "대통령", desc: "사막 위에 미래 도시를 건설한 비전가.", appearance: "흰색 칸두라를 입은 남성" },
    "이스라엘": { name: "다비드", title: "총리", desc: "국방과 안보에 매우 민감하다.", appearance: "군복을 입은 날카로운 인상의 남성" },
    "이란": { name: "하메네이", title: "최고지도자", desc: "종교적 신념이 매우 강하다.", appearance: "검은 터번을 쓴 종교 지도자" },

    // Europe
    "영국": { name: "아서 윈저", title: "국왕", desc: "기사도 정신을 중요시하는 젊은 왕.", appearance: "화려한 제복과 검을 찬 청년" },
    "프랑스": { name: "엘렌", title: "총리", desc: "예술과 마법을 장려하는 혁신적인 지도자.", appearance: "지적인 분위기의 여성" },
    "독일": { name: "슈미트", title: "총리", desc: "기술과 규율을 강조하는 철저한 성격.", appearance: "안경을 쓴 날카로운 인상" },
    "러시아": { name: "볼코프", title: "대통령", desc: "혹한의 땅을 다스리는 강인한 지도자.", appearance: "두꺼운 코트를 입은 거구" },
    "이탈리아": { name: "로마노", title: "총리", desc: "고대 유물과 역사에 정통하다.", appearance: "세련된 중년 남성" },
    "스페인": { name: "펠리페", title: "국왕", desc: "해상 함대를 지휘하는 정열적인 왕.", appearance: "제복을 입은 수려한 남성" },
    "포르투갈": { name: "마누엘", title: "대통령", desc: "탐험과 무역을 장려하는 지도자.", appearance: "지도를 들고 있는 학자풍의 남성" },
    "네덜란드": { name: "빌렘", title: "국왕", desc: "상업과 자유를 중시한다.", appearance: "편안한 복장의 인자한 남성" },
    "벨기에": { name: "필립", title: "국왕", desc: "유럽 외교의 중심 역할을 한다.", appearance: "정장을 입은 신사" },
    "스웨덴": { name: "칼", title: "국왕", desc: "북유럽의 전통을 수호하는 왕.", appearance: "바이킹의 기상이 느껴지는 노인" },
    "노르웨이": { name: "하랄", title: "국왕", desc: "바다와 자연을 사랑하는 지도자.", appearance: "어부의 옷을 즐겨 입는 소탈한 왕" },
    "덴마크": { name: "마르그레테", title: "여왕", desc: "예술적 감각이 뛰어난 여왕.", appearance: "우아한 드레스를 입은 노부인" },
    "핀란드": { name: "사울리", title: "대통령", desc: "냉철하고 과묵한 북쪽의 지도자.", appearance: "두꺼운 털옷을 입은 남성" },
    "폴란드": { name: "안제이", title: "대통령", desc: "기사단의 전통을 이어받은 지도자.", appearance: "갑옷 위에 정장을 입은 듯한 모습" },
    "우크라이나": { name: "젤렌스키", title: "대통령", desc: "전쟁 영웅이자 국민의 아이콘.", appearance: "국방색 티셔츠를 입은 결연한 남성" },
    "스위스": { name: "이그나치오", title: "대통령", desc: "중립과 평화를 수호한다.", appearance: "은행가 같은 깔끔한 차림" },
    "오스트리아": { name: "알렉산더", title: "대통령", desc: "음악과 문화를 사랑하는 지도자.", appearance: "지휘봉을 든 예술가 같은 모습" },
    "그리스": { name: "카테리나", title: "대통령", desc: "고대 신화의 지혜를 이어받았다.", appearance: "고대 그리스 풍의 의상을 입은 여성" },
    "아일랜드": { name: "마이클", title: "대통령", desc: "시와 문학을 사랑하는 요정 같은 지도자.", appearance: "작은 체구의 인자한 노인" },
    "스코틀랜드": { name: "니콜라", title: "수반", desc: "독립적인 기상을 가진 여성 지도자.", appearance: "타탄 체크 무늬 옷을 입은 여성" },
    "헝가리": { name: "오르반", title: "총리", desc: "강력한 민족주의 성향의 지도자.", appearance: "강한 인상의 남성" },
    "체코": { name: "페트르", title: "총리", desc: "실용적이고 합리적인 지도자.", appearance: "안경을 쓴 학구적인 남성" },
    "루마니아": { name: "클라우스", title: "대통령", desc: "흡혈귀 전설의 땅을 다스리는 미스터리한 인물.", appearance: "검은 망토를 두른 듯한 정장 차림" },
    "터키": { name: "에르도안", title: "대통령", desc: "오스만 제국의 영광을 재현하려 한다.", appearance: "권위적인 술탄의 풍모" },

    // Americas
    "캐나다": { name: "트뤼도", title: "총리", desc: "다문화와 포용을 중시하는 젊은 지도자.", appearance: "잘생긴 외모의 젊은 남성" },
    "멕시코": { name: "로페스", title: "대통령", desc: "고대 마야의 비밀을 알고 있는 지도자.", appearance: "전통 문양이 새겨진 옷을 입은 남성" },
    "브라질": { name: "룰라", title: "대통령", desc: "아마존의 수호자이자 노동자의 친구.", appearance: "수염을 기른 인자한 남성" },
    "아르헨티나": { name: "페르난데스", title: "대통령", desc: "탱고와 축구의 나라를 이끈다.", appearance: "열정적인 눈빛의 남성" },

    // Oceania
    "호주": { name: "앤서니", title: "총리", desc: "광활한 아웃백을 개척하는 지도자.", appearance: "카우보이 모자를 쓴 남성" },
    "뉴질랜드": { name: "신디", title: "총리", desc: "자연과 마법의 조화를 추구한다.", appearance: "친근한 미소의 여성" },

    // Africa
    "이집트": { name: "람세스", title: "대통령", desc: "고대 파라오의 후예를 자처한다.", appearance: "권위적인 태도의 남성" },
    "남아공": { name: "라마포사", title: "대통령", desc: "다이아몬드 광산과 야생의 땅을 통치한다.", appearance: "부유해 보이는 정장 차림" },
    "나이지리아": { name: "부하리", title: "대통령", desc: "강력한 군벌 출신의 지도자.", appearance: "전통 의상을 입은 강인한 노인" },
    "케냐": { name: "루토", title: "대통령", desc: "사바나의 전사들을 이끄는 리더.", appearance: "마사이족 전사 복장을 한 남성" },
    "모로코": { name: "모하메드", title: "국왕", desc: "사막의 신비를 간직한 왕.", appearance: "화려한 젤라바를 입은 남성" },
    
    // [NEW] Fantasy Nations
    "미르탈 숲연합": { name: "엘라디아", title: "엘프 여왕", desc: "세계수의 의지를 대변하는 고결한 지도자.", appearance: "은색 머리카락과 에메랄드 안광을 지닌 엘프 여성" },
    "레오니스 투기국": { name: "라이온 하트", title: "수인왕", desc: "무력으로 수인 부족들을 통합한 전설의 전사.", appearance: "거대한 도끼를 메고 있는 황금 갈기의 사자 수인" },
    "네크로디움 제국": { name: "벨리알", title: "마황", desc: "절대적인 마법 권능으로 마인들을 통치하는 군주.", appearance: "보랏빛 로브를 입고 공중에 떠 있는 창백한 마인 남성" },
    
    // Others
    "임페리얼 제국": { name: "임페리얼", title: "황제", desc: "모든 몬스터의 정점. 11제너럴을 거느린 절대자.", appearance: "칠흑의 갑주를 두른 거대한 마인" },
};
export const IMPERIAL_GENERALS: Record<string, NationLeader> = {
    "임페리얼":  { name: "임페리얼", title: "황제", desc: "모든 몬스터의 정점. 11제너럴을 거느린 절대자.", appearance: "칠흑의 갑주를 두른 거대한 마인" },
    "프라이드": { name: "루시퍼", title: "제1 제너럴 (오만)", desc: "임페리얼 제국의 제 2도시 프라이드를 관장하는 최강의 장군. 타락천사의 날개를 가졌다.", appearance: "빛과 어둠이 공존하는 날개를 지닌 미형의 남성" },
    "엔비": { name: "레비아탄", title: "제2 제너럴 (질투)", desc: "바다와 심연을 다스리는 괴수. 모든 것을 질투하여 삼켜버린다.", appearance: "푸른 비늘로 덮인 거대한 용인" },
    "라스": { name: "사탄", title: "제3 제너럴 (분노)", desc: "끝없는 분노로 전장을 불태우는 악마.", appearance: "붉은 피부와 불타는 눈을 가진 거구의 전사" },
    "슬로스": { name: "벨페고르", title: "제4 제너럴 (나태)", desc: "움직이지 않지만 강력한 정신 지배를 사용한다.", appearance: "게으르게 누워있는 소년의 모습" },
    "그리드": { name: "마몬", title: "제5 제너럴 (탐욕)", desc: "모든 재보를 탐하는 황금의 악마.", appearance: "보석으로 치장된 황금 갑옷을 입은 고블린 로드" },
    "글러트니": { name: "벨제부브", title: "제6 제너럴 (식탐)", desc: "모든 것을 먹어치우는 파리의 왕.", appearance: "거대한 입을 가진 곤충형 괴인" },
    "러스트": { name: "아스모데우스", title: "제7 제너럴 (색욕)", desc: "치명적인 매력으로 상대를 파멸시킨다.", appearance: "매혹적인 몽마의 여왕" },
    "테러": { name: "포보스", title: "제8 제너럴 (공포)", desc: "상대의 가장 깊은 공포를 형상화한다.", appearance: "형체가 불분명한 그림자" },
    "디스페어": { name: "데이모스", title: "제9 제너럴 (절망)", desc: "희망을 앗아가고 무기력하게 만든다.", appearance: "창백한 얼굴의 유령 기사" },
    "카오스": { name: "아포피스", title: "제10 제너럴 (혼돈)", desc: "질서를 파괴하고 혼돈을 불러온다.", appearance: "끊임없이 변화하는 뱀의 형상" },
    "보이드": { name: "제로", title: "제11 제너럴 (공허)", desc: "존재 자체를 지워버리는 허무의 화신.", appearance: "얼굴이 없는 하얀 가면의 인물" },
};

export const DEFAULT_LEADER: NationLeader = {
    name: "알 수 없음", title: "지도자", desc: "이 지역의 통치자입니다.", appearance: "베일에 싸인 인물"
};