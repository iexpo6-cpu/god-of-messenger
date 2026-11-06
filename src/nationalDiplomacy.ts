import { DiplomaticStatus, NationRelation } from './types';

// 전 세계 국가 리스트 (시뮬레이션 대상)
export const NATION_LIST = [
    "대한민국", "북한", "일본", "중국", "미국", "영국", "러시아", "독일", "프랑스", 
    "이집트", "사우디아라비아", "이란", "이스라엘", "브라질", "아르헨티나", 
    "호주", "뉴질랜드", "인도", "태국", "베트남", "필리핀", "인도네시아", 
    "말레이시아", "싱가포르", "터키", "그리스", "폴란드", "우크라이나", 
    "핀란드", "스웨덴", "노르웨이", "덴마크", "남아공", "나이지리아", 
    "케냐", "모로코", "멕시코", "캐나다", "이탈리아", "벨기에", "스위스", 
    "오스트리아", "포르투갈", "루마니아", "헝가리", "체코", "스코틀랜드", "아일랜드",
    "임페리얼 제국", "미르탈 숲연합", "레오니스 투기국", "네크로디움 제국"
];

// 국가별 소속 진영 (외교 로직 가중치용)
export enum NationBloc {
    FREEDOM = '자유 연맹',
    IMPERIAL = '제국 세력',
    NATURE = '정령 자치구',
    DESERT = '사막 연대',
    NEUTRAL = '영세 중립'
}

export const NATION_BLOCS: Record<string, NationBloc> = {
    "대한민국": NationBloc.FREEDOM, "미국": NationBloc.FREEDOM, "영국": NationBloc.FREEDOM, "독일": NationBloc.FREEDOM, "프랑스": NationBloc.FREEDOM, "일본": NationBloc.FREEDOM, "캐나다": NationBloc.FREEDOM, "호주": NationBloc.FREEDOM,
    "임페리얼 제국": NationBloc.IMPERIAL, "네크로디움 제국": NationBloc.IMPERIAL, "중국": NationBloc.IMPERIAL, "러시아": NationBloc.IMPERIAL, "이란": NationBloc.IMPERIAL, "북한": NationBloc.IMPERIAL,
    "미르탈 숲연합": NationBloc.NATURE, "뉴질랜드": NationBloc.NATURE, "핀란드": NationBloc.NATURE,
    "이집트": NationBloc.DESERT, "사우디아라비아": NationBloc.DESERT, "사우디": NationBloc.DESERT, "터키": NationBloc.DESERT, "이스라엘": NationBloc.DESERT,
    "스위스": NationBloc.NEUTRAL, "오스트리아": NationBloc.NEUTRAL, "레오니스 투기국": NationBloc.NEUTRAL
};

/**
 * 특정 국가 입장에서 타 국가들에 대한 초기 외교 관계 생성
 */
export const generateInitialDiplomacy = (myNation: string): Record<string, NationRelation> => {
    const diplomacy: Record<string, NationRelation> = {};
    const myBloc = NATION_BLOCS[myNation] || NationBloc.NEUTRAL;

    NATION_LIST.forEach(nation => {
        if (nation === myNation) return;

        const targetBloc = NATION_BLOCS[nation] || NationBloc.NEUTRAL;
        let status = DiplomaticStatus.NEUTRAL;
        let tension = 20; // 기본 긴장도

        // [MODIFIED] 임페리얼 제국(마계) 소속 플레이어인 경우
        if (myNation === "임페리얼 제국") {
            if (nation === "네크로디움 제국") {
                // 네크로디움과는 혈맹/동맹 상태
                status = DiplomaticStatus.ALLIANCE;
                tension = 0;
            } else {
                // 그 외 모든 국가는 잠재적 정벌 대상 (전쟁 상태)
                status = DiplomaticStatus.WAR;
                tension = 100;
            }
        } else {
            // 진영별 관계 설정
            if (myBloc === targetBloc && myBloc !== NationBloc.NEUTRAL) {
                status = DiplomaticStatus.ALLIANCE;
                tension = 5;
            } else if (
                (myBloc === NationBloc.FREEDOM && targetBloc === NationBloc.IMPERIAL) ||
                (myBloc === NationBloc.IMPERIAL && targetBloc === NationBloc.FREEDOM)
            ) {
                status = DiplomaticStatus.HOSTILE;
                tension = 75;
            } else if (targetBloc === NationBloc.IMPERIAL) {
                status = DiplomaticStatus.HOSTILE;
                tension = 60;
            }

            // 판타지 국가 예외 처리
            if (nation === "임페리얼 제국") {
                status = DiplomaticStatus.WAR;
                tension = 100;
            }

            // 대한민국과 북한의 특수 적대 관계 설정
            if ((myNation === "대한민국" && nation === "북한") || (myNation === "북한" && nation === "대한민국")) {
                status = DiplomaticStatus.HOSTILE;
                tension = 90;
            }
        }

        diplomacy[nation] = {
            status,
            tension,
            lastEvent: myNation === "임페리얼 제국" ? (nation === "네크로디움 제국" ? "어둠의 혈맹이 유지되고 있습니다." : "제국 사령부의 명령에 따라 전쟁을 수행 중입니다.") : "평시 상태 유지"
        };
    });

    return diplomacy;
};