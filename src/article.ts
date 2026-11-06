
import { WorldReaction, NewsArticle, Character, ItemRarity, Companion } from './types';
import { SHINRYOKU_TYPES_LIST, NATION_NAMES } from './constants';
import { NATION_THEMES } from './monsterfield';
import { DETAILED_BOSSES } from './bossMonsters';
import { COMMON_LOOT_TABLES } from './monsterLootTable';
import { NATION_LEADERS } from './worldData';

/**
 * [NEW] AI 생성 실패 시 또는 오프라인 모드에서 사용할 초호화 로컬 반응 및 기사 데이터 풀
 */

export const LOCAL_REACTION_AUTHORS = [
    { name: "지나가는 모험가", title: "Lv.15 검사" },
    { name: "취객", title: "선술집 단골" },
    { name: "은퇴한 용병", title: "전직 S랭크" },
    { name: "성곽 경비병", title: "제국 수비대" },
    { name: "익명의 정보원", title: "뒷골목 거주자" },
    { name: "떠돌이 상인", title: "팔도 유람객" },
    { name: "학구열 높은 마법사", title: "아카데미 수석" },
    { name: "시골 청년", title: "평범한 농부" },
    { name: "음유시인", title: "거리의 예술가" },
    { name: "수다쟁이 아주머니", title: "시장 상인" },
    { name: "현상금 사냥꾼", title: "추적의 달인" },
    { name: "신비주의 점성술사", title: "별의 인도자" },
    { name: "몰락한 귀족", title: "과거의 영광" },
    { name: "괴팍한 대장장이", title: "장인정신" },
    { name: "신입 성기사", title: "정의의 사도" },
    { name: "황실 근위기사", title: "황도 수호대" },
    { name: "지하 투기장 배팅꾼", title: "승부사" },
    { name: "대륙 약초학회 연구원", title: "비전의 조제사" },
    { name: "암시장 브로커", title: "그림자 상인" },
    { name: "성전 이단심문관", title: "빛의 집행자" },
    { name: "드워프 채굴단장", title: "깊은 광산주" },
    { name: "엘프 순찰대원", title: "세계수 경비병" },
    { name: "마법공학 발명가", title: "기계연금술사" },
    { name: "용병길드 접수원", title: "정보통 마스터" },
    { name: "은밀한 도적단 부두목", title: "밤의 추격자" },
    { name: "퇴마사", title: "원혼의 달래개" },
    { name: "신전 하급 사제", title: "기도하는 자" },
    { name: "마물 사육사", title: "야수 조련사" },
    { name: "차원 여행자", title: "이계의 방랑자" },
    { name: "전설의 낚시꾼", title: "강태공" },
    { name: "요리 길드 장인", title: "미식의 탐구자" },
    { name: "탑의 고위 마도사", title: "원소 제어관" },
    { name: "골목길 소년", title: "신문팔이" },
    { name: "마계 감시관", title: "국경 초소장" },
    { name: "신수 조련사", title: "영물 관리인" },
    { name: "궁정 연회 관리인", title: "의전관" },
    { name: "투기장 챔피언 출신", title: "은퇴한 검투사" },
    { name: "마법 도서관 사서", title: "고문서 감정사" },
    { name: "전설의 마물 사냥꾼", title: "베테랑 헌터" },
    { name: "신성 제국 순찰관", title: "이단 수색대" }
];

export const LOCAL_COMMENTS_POOL = [
    "ㄹㅇㅋㅋ", "실화냐?", "대박이네", "이게 맞지", "존나 멋있다", "개추 드림", "와... 대단하네",
    "이거 보고 소름 돋음", "나도 저렇게 되고 싶다", "현실판 판타지네", "세상 참 좁다",
    "조심해라 세상 흉흉하다", "응 아니야~", "팩트 체크 좀", "그래서 거기가 어디라고?",
    "나만 불편해?", "이거 주작 아님?", "와 대박사건", "오늘도 평화롭네",
    "내 눈을 의심했다", "저거 합성 아님?", "이 시대의 진정한 영웅", "나 때는 말이야...",
    "정보 감사합니다", "성지순례 왔습니다", "그래서 얼만데?", "이런 일이 실제로 일어나는구나",
    "저 분 실제로 본 적 있는데 오라가 장난 아님 ㄷㄷ", "이 집 썰 맛집이네",
    "길드원들이랑 단체로 보러 감", "스킬 이펙트 번쩍이는 거 직관했는데 눈 머는 줄",
    "신력이 저 정도면 거의 반신급 아니냐?", "장비 세팅 어케 했는지 공유 좀",
    "믿고 보는 대륙 뉴스 ㅋㅋㅋ", "저 사람한테 잘못 걸리면 뼈도 못 추리겠네",
    "오늘도 대륙은 혼돈의 도가니", "댓글창 화력 무엇 ㅋㅋㅋ", "이왜진??",
    "우리 동네에도 순찰 와주시면 안 되나요 ㅠㅠ", "이러다 제국 정복하겠네",
    "마물들 이제 다 죽었다", "전설의 귀환이다...",
    "와 미쳤다 진짜 ㅋㅋㅋ", "신력 계통별 밸런스 패치 시급함 ㄹㅇ", "저 파티에는 힐러가 누구임?",
    "신화 무기 이펙트 한번만 만져보고 싶다...", "오늘 저녁은 치맥 각이다",
    "영주님 표정 볼만하겠네 ㅋㅋㅋ", "결투장에서 저분이랑 마주치면 바로 항복 침",
    "소문으로만 듣던 그 기술인가", "주점에 자리 없어서 서서 마시는 중",
    "이게 되네??", "다들 안전 제일입니다", "대륙 서열 1위 바뀌는 거 아님?"
];

// 헬퍼 함수: 랜덤 요소 추출
const getRandom = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

// 헬퍼 함수: 몬스터 이름 가져오기
const getRandomMonster = (nation?: string): string => {
    const theme = nation ? NATION_THEMES[nation] || NATION_THEMES["default"] : NATION_THEMES["default"];
    const tiers = Object.keys(theme.monsters);
    const tier = getRandom(tiers);
    const monster = getRandom(theme.monsters[tier]);
    return typeof monster === 'string' ? monster : monster.name;
};

// 헬퍼 함수: 아이템 이름 가져오기
const getRandomItem = (): string => {
    const tables = Object.keys(COMMON_LOOT_TABLES);
    const table = getRandom(tables);
    const itemEntry = getRandom(COMMON_LOOT_TABLES[table]);
    return itemEntry.name || itemEntry.item;
};

// 헬퍼 함수: 보스 이름 가져오기
const getRandomBoss = (): { name: string, title: string, nation: string } => {
    const nations = Object.keys(DETAILED_BOSSES);
    const nation = getRandom(nations);
    const cities = Object.keys(DETAILED_BOSSES[nation]);
    const city = getRandom(cities);
    const boss = DETAILED_BOSSES[nation][city];
    return { name: boss.name, title: boss.title, nation };
};

export const generateLocalReactions = (character: Character, count: number = 10): WorldReaction[] => {
    const reactions: WorldReaction[] = [];
    const categories: ('Trending' | 'News' | 'Rumor' | 'Companion')[] = ['Trending', 'News', 'Rumor', 'Companion'];

    // 플레이어의 명성(RP >= 12000) 또는 공훈치(Merit >= 10000) 확인
    const playerRep = character.mercenaryData?.reputation || 0;
    const playerMerit = character.militaryData?.merit || 0;
    const isFamous = playerRep >= 12000 || playerMerit >= 10000;

    // 플레이어 관련 인물들
    const companionsList = character.companions?.map(c => c.name) || [];
    const loversList = character.companions?.filter(c => c.isLover).map(c => c.name) || [];
    
    // 무명일 때는 가명/대명사 사용
    const displayPlayerName = isFamous ? character.name : "어느 유망한 방랑자";
    const displayPersonName = isFamous ? (companionsList.length > 0 ? getRandom(companionsList) : character.name) : "소문의 모험가";

    const currentLoc = typeof character.currentLocation === 'string' 
        ? character.currentLocation 
        : (character.currentLocation?.city || character.currentLocation?.nation || "에테르나");
    const shinryoku = character.shinryokuType || "화염계";
    const tierName = character.classTier || "퍼스트클래스";
    const jobName = character.job || "모험가";
    const weaponName = character.equipment?.weapon?.name || "명검";

    for (let i = 0; i < count; i++) {
        const category = getRandom(categories);
        const author = getRandom(LOCAL_REACTION_AUTHORS);
        const nation = getRandom(NATION_NAMES);
        const monster = getRandomMonster(nation);
        const item = getRandomItem();
        const boss = getRandomBoss();
        const companionName = (isFamous && companionsList.length > 0) ? getRandom(companionsList) : "수수께끼의 동행인";
        const loverName = (isFamous && loversList.length > 0) ? getRandom(loversList) : null;

        let title = "";
        let content = "";

        switch (category) {
            case 'Trending': {
                const trendingTemplates = [
                    { t: `드디어 ${item} 득템했다!!`, c: `한 달 동안 ${monster}만 잡았는데 드디어 나옴... 감격해서 눈물 난다 진짜.` },
                    { t: `${boss.name} 공략 파티 구함`, c: `${boss.title} ${boss.name} 잡으러 갈 사람? 최소 레벨 ${Math.max(30, character.level || 20)} 이상, 신력 계통 확실한 분만 지원 바람.` },
                    { t: `요즘 ${item} 시세 왜 이럼?`, c: `어제까지만 해도 헐값이던 ${item}이(가) 갑자기 금값이 됐네. 상단에서 독점 매집이라도 시작한 건가?` },
                    { t: `${monster}의 대이동 포착`, c: `갑자기 ${monster}들이 떼를 지어 ${nation} 남쪽으로 이동하고 있어. 던전 이상 징후 아닐까?` },
                    { t: `${boss.name}의 포효가 들린다`, c: `최근 ${boss.nation} 하늘이 붉게 물든 게 ${boss.name}의 각성 때문이라는데... 모험가들 전부 비상 걸림.` },
                    { t: `새로운 고대 던전 발견 소식!`, c: `${nation} 북부 절벽에서 고대 신전 유적이 드러났대. 희귀 신력의 정수가 쏟아져 나온다나 봐.` },
                    { t: `신비한 영약의 효능 체험기`, c: `${nation} 특산 약초로 만든 영약을 마셨더니 신력이 솟구치는 기분이야. 수련 효율 200% 상승함!` },
                    { t: `${item} +15 강화 성공 인증!`, c: `확률 0.5% 뚫고 ${item} 극옵 띄웠다!! 오늘 주점에서 내가 쏜다 다들 모여!` },
                    { t: `길드원 모집 중 (${jobName} 및 전직 환영)`, c: `${currentLoc} 기반으로 활동할 든든한 동료들 구합니다. 함께 강해질 분들 대환영!` },
                    { t: `[토론] 현 대륙 최강의 신력 계통은?`, c: `${shinryoku} vs 타 계열... 최근 활약하는 강자들 보면 ${shinryoku} 쪽 잠재력이 미친 수준인 것 같음.` },
                    { t: `최고급 신수 탈것 목격 썰 푼다`, c: `${currentLoc} 상공을 가르며 날아가는 신수 탄 모험가 봤는데 위압감이 거의 제국 기사단장급이었음.` },
                    { t: `대륙 요리대회 우승 요리의 비결`, c: `${monster} 고기와 신선한 영초를 곁들인 특제 요리를 먹으면 공격력이 30%나 오른다는데 진짜일까?` },
                    { t: `전설의 무구 목격담`, c: `어제 던전 입구에서 명검 휘두르는 모험가 봤는데 파괴력이 산도 가를 기세더라. 저거 어디서 구함?` }
                ];

                // 명성과 공훈치가 대량(1000 이상)일 때만 플레이어/동료 실명 언급 템플릿 추가
                if (isFamous) {
                    trendingTemplates.push(
                        { t: `${displayPlayerName}의 활약상 봤냐?`, c: `최근에 ${displayPlayerName}이(가) ${nation} 인근에서 ${monster} 무리를 혼자서 쓸어버렸다더라. ${shinryoku} 신력이 번쩍이는데 진짜 경이로웠음.` },
                        { t: `${currentLoc}의 새로운 전설, ${displayPlayerName}`, c: `요즘 ${currentLoc}에서 ${displayPlayerName} 모르면 간첩이라던데? ${tierName} 경지에 올라서 위압감이 장난 아니래.` },
                        { t: `${nation} 축제 분위기네`, c: `이번에 ${displayPlayerName}이(가) 큰 공을 세워서 영주님이 잔치를 열어줬대. 밤새도록 술이 공짜라더라!` },
                        { t: `${displayPlayerName}과 ${boss.name}의 대격돌`, c: `어제 ${displayPlayerName}이(가) ${boss.name}와(과) 정면으로 맞붙었다는 소문 들었어? ${shinryoku} 이펙트가 하늘을 뒤덮었대.` },
                        { t: `${displayPlayerName}의 ${tierName} 각성 무대`, c: `어제 투기장에서 펼쳐진 ${tierName} 연계 콤보 직관한 사람 손? 타격감이랑 연출에 넋이 나갔음.` }
                    );

                    if (loverName) {
                        trendingTemplates.push({
                            t: `${displayPlayerName}♥${loverName} 커플 목격담 떴다`,
                            c: `${currentLoc} 번화가에서 둘이 다정하게 손잡고 걸어가는 거 봤음... 세기의 모험가 커플 진짜 선남선녀네 부럽다.`
                        });
                    }
                }

                const tt = getRandom(trendingTemplates);
                title = tt.t;
                content = tt.c;
                break;
            }
            case 'News': {
                const newsTemplates = [
                    { t: `${nation} 지역 마물 범람 경보`, c: `최근 ${nation} 일대에 ${monster}들이 이상 증식하고 있습니다. 여행자 및 초보 모험가들은 출입을 삼가하십시오.` },
                    { t: `${boss.name} 출현으로 인한 비상사태`, c: `${boss.nation}에 ${boss.title} ${boss.name}이(가) 나타나 인근 관문이 폐쇄되고 수비대가 급파되었습니다.` },
                    { t: `희귀 유물 '${item}' 공식 감정 완료`, c: `고대 유적지에서 발굴된 ${item}이(가) 국보급 가치를 지닌 것으로 판명되어 학계의 관심이 쏠리고 있습니다.` },
                    { t: `신력 학회, ${shinryoku}의 새로운 비전 논문 발표`, c: `수석 연구원들이 ${shinryoku}의 고위 스킬 연계 구조를 규명했다고 발표했습니다. 각국 무투계에 큰 반향이 예상됩니다.` },
                    { t: `${nation} 국경 지대 경비태세 대폭 격상`, c: `${monster} 무리의 잦은 침투로 인해 성기사단과 제국 정예병들이 전진 배치되었습니다.` },
                    { t: `대륙 최고 권위의 무투대회 개최 공고`, c: `이번 대회에는 대륙 각지의 ${tierName} 실력자들이 대거 참전할 것으로 기대를 모으고 있습니다.` },
                    { t: `${boss.name} 토벌 원정대 모집령`, c: `${boss.title} ${boss.name}의 토벌을 위해 각국 정부가 연합 보상금을 내걸고 최정예 모험가를 모집합니다.` },
                    { t: `이상 기후 현상과 마력 조류 폭주`, c: `${nation} 전역에서 갑작스러운 오로라와 벼락이 치는 등 차원의 틈새와 연관된 현상이 지속되고 있습니다.` },
                    { t: `대성당 성전군 편성 및 전진 기지 구축`, c: `사악한 기운을 정화하기 위해 성기사단과 사제들이 ${nation} 접경지에 거대 결계를 설치하고 주둔을 시작했습니다.` },
                    { t: `마계 차원문 균열 억제 작전 대성공`, c: `연합 정예 부대가 차원 균열을 막아내며 대규모 마물 침공을 사전에 봉쇄하는 쾌거를 거두었습니다.` }
                ];

                if (isFamous) {
                    newsTemplates.push(
                        { t: `${nation} 대규모 상단, ${displayPlayerName}의 소탕 후 통행 재개`, c: `${displayPlayerName}의 맹활약으로 물류 차단 위기를 넘기고 ${nation} 간선 도로가 안전하게 확보되었습니다.` },
                        { t: `${displayPlayerName}, ${currentLoc} 명예 훈장 수여 유력`, c: `지역 치안 안정과 재난 구호에 앞장선 공로로 ${displayPlayerName}에 대한 영주 차원의 공식 표창이 논의 중입니다.` }
                    );
                }

                const nt = getRandom(newsTemplates);
                title = nt.t;
                content = nt.c;
                break;
            }
            case 'Rumor': {
                const rumorTemplates = [
                    { t: `${displayPersonName}에 얽힌 기괴한 소문`, c: `사실 ${displayPersonName}이(가) 밤마다 고대 신의 목소리를 듣는다는 소문이 있어. 사용하는 ${shinryoku} 신력도 평범한 규격을 아득히 뛰어넘었다나?` },
                    { t: `뒷골목 암시장에 풀린 [${item}]의 정체`, c: `누군가 금지된 고대 묘지에서 ${item}을(를) 통째로 빼돌렸다는 밀고가 접수되었어. 경비대가 추적 중이라네.` },
                    { t: `${nation} 영주실의 은밀한 비밀 회합`, c: `${nation}의 최고위 인사들이 최근 정체불명의 가면 결사대와 밀담을 나눴다는 첩보가 파다해.` },
                    { t: `${boss.name}이(가) 사실 잠에서 깬 이유`, c: `단순한 자연재해가 아니라 누군가 ${boss.nation}의 결계를 의도적으로 부쉈다는 흉흉한 소문이 돌아.` },
                    { t: `전설의 보물지도 조각의 행방`, c: `${currentLoc} 뒷골목 도박장에서 ${item}의 위치가 적힌 고대 양피지가 거래되었다는 풍문.` },
                    { t: `밤마다 울리는 차원의 균열 소리`, c: `${nation} 폐허 인근에서 밤마다 시공간이 뒤틀리는 굉음이 들려. 이계의 마신이라도 소환되는 건가?` },
                    { t: `저주받은 비전서의 유출`, c: `${shinryoku} 계통의 봉인된 금지 스킬 비급서가 암시장에 돌아다니고 있대. 손댄 자는 영혼이 잠식된다는데...` },
                    { t: `성전 내부의 보이지 않는 암투`, c: `고위 주교들과 이단심문관들 사이에 신의 계시 해석을 두고 날 선 신경전이 벌어지고 있다는 속사정이 새어 나왔어.` },
                    { t: `심연의 블랙마켓에서 거래된 영혼석`, c: `어둠의 경매장에서 10만 골드가 넘는 초고가에 정체불명의 붉은 오브가 낙찰되었다는 소식이야.` }
                ];

                if (character.activeBlackMarket) {
                    const bm = character.activeBlackMarket;
                    rumorTemplates.push({
                        t: `[암시장 소문] ${bm.nation} [${bm.city}]에 비밀 암시장 개장`,
                        c: `이번 달 ${bm.nation}의 [${bm.city}] 거주구역 비밀 골목에 각국의 진귀한 특산품과 마정석, 마석, 신력꽃 등을 거래하는 암시장이 열렸다는 소문이 돌고 있어!`
                    });
                }

                if (isFamous) {
                    rumorTemplates.push(
                        { t: `${displayPlayerName}의 진짜 출신 배경`, c: `내가 주점에서 들은 바로는 ${displayPlayerName}이(가) 사실 신계에서 추방된 고위 집행자의 환생이라던데? 스킬 시전 속도가 인간이 아니래.` },
                        { t: `${companionName}의 숨겨진 과거`, c: `${displayPlayerName} 곁에 늘 함께하는 ${companionName}이(가) 사실 거대 길드의 전설적인 후계자였다는 소문이 사실일까?` }
                    );
                }

                const rt = getRandom(rumorTemplates);
                title = rt.t;
                content = rt.c;
                break;
            }
            case 'Companion': {
                const compTemplates = [
                    { t: `${monster} 토벌 전담 파티원 급구`, c: `${currentLoc} 뒷골목 집결. ${monster} 가죽과 정수 파밍하러 갈 실력자 모심. 탱/딜/힐 완비!` },
                    { t: `심연 던전 하드모드 파티 모집 (힐러/서포터 극우대)`, c: `공략 시간 30분 컷 목표. ${tierName} 이상 스펙 검증 후 출발합니다.` },
                    { t: `[급구] ${boss.name} 트라이 헤딩팟`, c: `${boss.title} ${boss.name} 패턴 분석 및 실전 트라이하실 분. 멘탈 단단하신 분만 모십니다.` },
                    { t: `장비 제작 의뢰 상시 접수 (${item})`, c: `최고급 모루 구비 완료. 재료 가져오시면 장인 보너스 띄워드립니다. 수수료 협의.` },
                    { t: `${currentLoc} 선술집에서 한잔할 모험가?`, c: `오늘 ${monster} 사냥 대박 나서 기분 좋다! 주점으로 오면 술 한잔 대접함.` },
                    { t: `비전 전수 및 결투 상대 구함`, c: `${shinryoku} 계열 무투가님들과 합을 맞춰보고 싶습니다. ${currentLoc} 연무장으로 와주세요!` },
                    { t: `${currentLoc} 뒷골목에서 은밀한 파티원을 찾습니다`, c: `남모를 사연이 있어 대형 길드에는 못 들어가지만 실력만큼은 확실한 동료를 원합니다. ${currentLoc} 뒷골목으로 오세요.` },
                    { t: `고대 미궁 탐사대 모집 (함정 해제/정찰 전문가 환영)`, c: `위험하지만 보수는 확실합니다. 보물상자 분배는 기여도 순으로 깔끔하게 정산합니다.` }
                ];

                if (isFamous) {
                    compTemplates.push(
                        { t: `${displayPlayerName} 팬클럽 공식 정모 공지`, c: `${displayPlayerName} 님의 무용담과 스킬 연구를 함께할 동료분들 ${currentLoc} 중앙 광장 분수대로 모여주세요!` }
                    );
                }

                const ct = getRandom(compTemplates);
                title = ct.t;
                content = ct.c;
                break;
            }
        }

        const commentsCount = Math.floor(Math.random() * 6) + 2;
        const comments = [];
        for (let j = 0; j < commentsCount; j++) {
            comments.push({
                author: getRandom(LOCAL_REACTION_AUTHORS).name,
                text: getRandom(LOCAL_COMMENTS_POOL),
                time: `${Math.floor(Math.random() * 50) + 2}분 전`
            });
        }

        reactions.push({
            id: `local_reaction_${Date.now()}_${i}_${Math.floor(Math.random() * 1000)}`,
            category,
            title,
            author: author.name,
            authorTitle: author.title,
            content,
            location: category === 'Companion' ? currentLoc : nation,
            likes: Math.floor(Math.random() * 800) + 12,
            views: Math.floor(Math.random() * 3500) + 50,
            comments,
            timestamp: "방금 전"
        });
    }

    return reactions;
};

export const LOCAL_NEWS_SOURCES = ["제국 일보", "차원 전보", "숲의 전령사", "투기장 소식지", "성전 통신", "마법 학회보", "뒷골목 찌라시", "상인 연합 회보", "대륙연합 공식 관보", "그림자 통신"];

export const generateLocalNews = (character: Character, count: number = 6): NewsArticle[] => {
    const articles: NewsArticle[] = [];

    const playerRep = character.mercenaryData?.reputation || 0;
    const playerMerit = character.militaryData?.merit || 0;
    const isFamous = playerRep >= 12000 || playerMerit >= 10000;

    const displayPlayerName = isFamous ? character.name : "익명의 실력자";

    const currentLoc = typeof character.currentLocation === 'string' 
        ? character.currentLocation 
        : (character.currentLocation?.city || character.currentLocation?.nation || "에테르나");
    const shinryoku = character.shinryokuType || "화염계";
    const tierName = character.classTier || "퍼스트클래스";

    for (let i = 0; i < count; i++) {
        const nation = getRandom(NATION_NAMES);
        const leader = NATION_LEADERS[nation] || { name: "무명 지도자", title: "통치자" };
        const monster = getRandomMonster(nation);
        const item = getRandomItem();
        const boss = getRandomBoss();
        const source = getRandom(LOCAL_NEWS_SOURCES);

        const templates = [
            {
                t: `[속보] ${nation} 지도자 ${leader.name}, 대규모 마물 토벌령 공포`,
                c: `${nation}의 ${leader.title} ${leader.name}이(가) 오늘 오전 긴급 국무회의를 소집하고 전선 일대의 ${monster} 소탕 작전을 개시한다고 밝혔습니다. 각지의 용병단과 정예 기사단이 집결하고 있습니다.`,
                cat: "Politics"
            },
            {
                t: `${boss.name} 토벌 작전, 전 대륙의 관심 집중`,
                c: `${boss.nation}을 공포로 몰아넣었던 ${boss.title} ${boss.name}의 거처가 마침내 확인되었습니다. 토벌대에는 전설적인 유물 '${item}'의 소유자들과 ${tierName} 실력자들이 합류할 예정입니다.`,
                cat: "News"
            },
            {
                t: `대륙 경제의 새바람, '${item}' 수요 폭증으로 시장 과열`,
                c: `연금술 및 마법 공학 발전으로 인해 ${item}의 시장 가치가 사상 최고가를 경신했습니다. 상인 연합은 원활한 물량 공급을 위해 모험가들의 수집 의뢰 보상금을 대폭 인상했습니다.`,
                cat: "Society"
            },
            {
                t: `[단독] ${nation} 지하 고대 미궁에서 미지의 마력 반응 감지`,
                c: `${nation} 변방에서 수천 년간 봉인되었던 태고의 유적이 지진과 함께 드러났습니다. 탐사대 보고에 따르면 고대 신화급 유물과 미지의 전승이 잠들어 있을 가능성이 매우 높습니다.`,
                cat: "News"
            },
            {
                t: `기상이변과 마력 조류 폭주, 각국 신전 긴급 결계 가동`,
                c: `${nation} 상공에 거대한 붉은 오로라가 발생하며 마물들의 흉폭성이 증가하고 있습니다. 대성당과 마법학회는 공동 조사를 통해 차원 왜곡 현상의 원인을 규명 중입니다.`,
                cat: "Society"
            }
        ];

        if (character.activeBlackMarket) {
            const bm = character.activeBlackMarket;
            templates.push({
                t: `[특보] ${bm.nation} [${bm.city}]에 비밀 암시장 개장 소문 확산`,
                c: `각국 상인들과 정보통들에 따르면 ${bm.nation}의 [${bm.city}] 거주구역 비밀 구역에서 이번 달 한정으로 희귀 특산물과 마정석, 마석, 신력꽃 등을 취급하는 대규모 암시장이 성황리에 운영 중이라는 전언입니다.`,
                cat: "Rumor"
            });
        }

        if (isFamous) {
            templates.push(
                {
                    t: `영웅 ${displayPlayerName}, 대륙 전역을 강타한 눈부신 무용담`,
                    c: `최근 ${currentLoc}과 ${nation}을 넘나들며 활동 중인 ${displayPlayerName}의 활약이 연일 화제입니다. 특히 ${shinryoku} 신력을 앞세워 재앙급 마물들을 단신으로 격파하며 수많은 시민들을 구출했습니다.`,
                    cat: "Trending"
                },
                {
                    t: `초미의 관심사: ${displayPlayerName}, 다음 원정지는 어디인가?`,
                    c: `${tierName}에 도달하며 대륙 유수의 강자로 우뚝 선 ${displayPlayerName}의 다음 행보를 두고 온갖 관측이 쏟아지고 있습니다. 일각에서는 마계 접경지나 신계의 시련에 도전할 것이라는 전망도 나옵니다.`,
                    cat: "Rumor"
                }
            );
        }

        const template = getRandom(templates);

        const commentsCount = Math.floor(Math.random() * 4) + 2;
        const comments = [];
        for (let j = 0; j < commentsCount; j++) {
            comments.push({
                author: getRandom(LOCAL_REACTION_AUTHORS).name,
                text: getRandom(LOCAL_COMMENTS_POOL),
                time: "오늘"
            });
        }

        articles.push({
            id: `local_news_${Date.now()}_${i}_${Math.floor(Math.random() * 1000)}`,
            category: template.cat as any,
            title: template.t,
            author: "정규 취재팀",
            authorTitle: "수석 기자",
            content: template.c,
            location: nation,
            source: source,
            likes: Math.floor(Math.random() * 1200) + 50,
            views: Math.floor(Math.random() * 6000) + 200,
            comments,
            timestamp: "오늘 오전"
        });
    }

    return articles;
};
