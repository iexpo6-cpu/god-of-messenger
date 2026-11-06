import { Companion, JobType, SkillType, ClassTier, Skill, BuffConfig, SkillTarget, WeaponType, CombatStyle, MonsterStage } from '../types';
import { HUMANOID_CLASSES, ENEMY_SKILL_POOL, SHINRYOKU_TYPES_LIST, STATUS_AILMENTS_LIST, SHINRYOKU_AILMENTS_MAP, SHINRYOKU_SPECIAL_PASSIVES, COMBAT_STYLE_SPECIALTIES, getHumanoidClassByTier, getShinryokuConstantKey } from '../constants';
import { generateEffectFormula, PASSIVE_LABEL_MAP } from './skillFormulaService';
import { calculateBuffSuccessRate, calculateDebuffSuccessRate, calculateTotalStats, assignRandomCombatStyle, calculateFinalStats, generateNpcSkills, calculateCombatPower } from '../utils';
import { checkAndApplyMonsterAutoSkills } from './monsterGrowth';
import { getBuffBaseCap, getDebuffBaseCap } from '../utils/skillScalingHelper';
import { getTierBuffScale, getTierAttackScale } from './skillBuffScaleService';
import { isPassiveSkill, getReducedMpCostOnLevelUp } from './skillMpService';

const SHINRYOKU_TO_CONSTANT_KEY: Record<string, string> = {
    '태양': '태양계',
    '태양계': '태양계',
    '화염': '화염계',
    '화염계': '화염계',
    '광휘': '광휘계',
    '광휘계': '광휘계',
    '월광': '월광계',
    '월광계': '월광계',
    '전격': '전격계',
    '전격계': '전격계',
    '지령': '대지계',
    '대지': '대지계',
    '대지계': '대지계',
    '질풍': '질풍계',
    '질풍계': '질풍계',
    '빙결': '빙결계',
    '빙결계': '빙결계',
    '해수': '해수계',
    '해수계': '해수계',
    '강철': '강철계',
    '강철계': '강철계',
    '암흑': '암흑계',
    '암흑계': '암흑계',
    '암연': '암흑계',
    '초화': '초화계',
    '초화계': '초화계',
    '무기강화': '무기강화계',
    '무기강화계': '무기강화계',
    '신체강화': '신체강화계',
    '신체강화계': '신체강화계',
    '무': '일반',
    '일반': '일반'
};

const TIER_MAX_RATIO: Record<string, number> = {
    [ClassTier.NONE]: 50,
    [ClassTier.FIRST]: 100,
    [ClassTier.SECOND]: 500,
    [ClassTier.LAST]: 2000,
    [ClassTier.FINAL]: 10000,
};

export const TIER_RANK: Record<string, number> = {
    [ClassTier.NONE]: 0,
    [ClassTier.F]: 0,
    '미해방': 0,
    [ClassTier.FIRST]: 1,
    [ClassTier.SECOND]: 2,
    [ClassTier.LAST]: 3,
    [ClassTier.FINAL]: 4,
    [ClassTier.BOND]: 5,
};

const getBuffValueCap = (tier: ClassTier, target: SkillTarget) => {
    const isAoE = target === 'aoe';
    if (tier === ClassTier.FIRST) return isAoE ? 15 : 30;
    if (tier === ClassTier.SECOND) return isAoE ? 25 : 50;
    if (tier === ClassTier.LAST) return isAoE ? 50 : 100;
    if (tier === ClassTier.FINAL) return isAoE ? 75 : 150;
    return 10;
};

const getDebuffStatCap = (tier: ClassTier, target: SkillTarget) => {
    const isAoE = target === 'aoe';
    if (tier === ClassTier.FIRST) return isAoE ? 5 : 10;
    if (tier === ClassTier.SECOND) return isAoE ? 10 : 20;
    if (tier === ClassTier.LAST) return isAoE ? 15 : 30;
    if (tier === ClassTier.FINAL) return isAoE ? 25 : 50;
    return 10;
};

/**
 * 신력계통 및 클래스명, 스킬 유형, 티어에 부합하는 자연스럽고 다채로운 스킬 이름을 생성합니다.
 * 캐릭터 이름을 시드로 사용하여 캐릭터마다 고유한 느낌을 줍니다.
 */
const generateThematicSkillName = (
    shinryoku: string,
    className: string,
    skillType: SkillType,
    tier: ClassTier,
    targetType: SkillTarget,
    seed: number,
    companionName: string = '',
    combatStyle: string = ''
): string => {
    // 이름 기반 시드 강화 (캐릭터마다 고유한 난수 패턴 생성)
    const nameSeed = companionName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const finalSeed = Math.abs(seed + nameSeed);

    // 정화 처리
    const cleanStyle = (combatStyle || '').replace(/\s*\(.*?\)/g, '').trim();
    const cleanClass = (className || '').replace(/\s*\(.*?\)/g, '').trim();

    // 클래스 계열별 특화 아키타입 정의 (검사, 마법사, 로그/거너, 몽크, 힐러)
    const isKnightArchetype = /(기사|전사|가디언|수호|검|솔저|팔라딘|용병)/.test(cleanClass) || /(검사|창술사|광전사|기사|쌍검사|창기사|마창사|도끼전사|파괴전사|소드마스터|워로드|팔라딘|버서커|글래디에이터|다크나이트|그랜드마스터|드래곤나이트|크루세이더)/.test(cleanStyle);
    const isMageArchetype = /(마법|마술|술사|소서러|위저드|메이지|연금|학자)/.test(cleanClass) || /(마법사|원소술사|흑마법사|환술사|정령술사|아크메이지|네크로맨서|서머너|대마법사|리치|현자)/.test(cleanStyle);
    const isRogueArchetype = /(도적|암살|어쌔신|레인저|헌터|궁수|사냥|그림자)/.test(cleanClass) || /(궁수|도적|거너|저격수|마검사|암살자|무법자|트랩퍼|신궁|어쌔신|데스나이트|아처마스터|쉐도우워кер|스나이퍼)/.test(cleanStyle);
    const isMonkArchetype = /(무도|격투|권사|투사|버서커|수사|몽크)/.test(cleanClass) || /(권투사|격투가|권투가|스트라이커|무도가|몽크|챔피언|무신)/.test(cleanStyle);
    const isHealerArchetype = /(성직|사제|프리스트|클레릭|드루이드|성녀|치유)/.test(cleanClass) || /(에너자이저|지원가|음유시인|버퍼|사제|프리스트|바드|세인트|비숍)/.test(cleanStyle);

    let archetype = 'knight'; // 기본값
    if (isHealerArchetype) archetype = 'healer';
    else if (isMageArchetype) archetype = 'mage';
    else if (isRogueArchetype) archetype = 'rogue';
    else if (isMonkArchetype) archetype = 'monk';
    else if (isKnightArchetype) archetype = 'knight';

    // 100% 한글/판타지 어울리는 고품격 스킬 액션 풀 (어색한 직업명 노출 없이 자연스러움 유도)
    const actionPools: Record<string, Record<string, string[]>> = {
        knight: {
            [SkillType.PHYSICAL]: targetType === 'aoe' 
                ? [
                    '윌윈드 블레이드', '그랜드 슬램', '사이클론 스매시', '소드 댄스', '스핀 테일', '어스퀘이크 대시', 
                    '블레이드 스톰', '피닉스 다이브', '그랜드 분쇄격', '크레센트 슬래시', '볼텍스 슬래시',
                    '기간틱 기가 슬래시', '용의 비상격', '패왕십일참', '무쌍난무 소드', '그랜드 크로스 슬라이스', 
                    '발도술·일섬폭풍', '천공의 단죄격', '어스 분쇄진', '멸정무쌍격', '크로니클 저지먼트', 
                    '헤븐즈 게이트 오프너', '카오스 보텍스 클레이브', '템페스트 슬래셔', '신황지멸 격참'
                  ]
                : [
                    '루인 스트라이크', '피어싱 드라이브', '소드 브레이커', '사일런트 슬래시', '샤프 쓰러스트', 
                    '파워 소드 블로우', '가디언 크래시', '임팩트 배시', '더블 슬래시', '체인 스트라이크', 
                    '피어싱 스피어', '소드 오라', '브레이크 스매시', '블레이드 시어',
                    '신속 발도 일참', '성검 베기', '영혼 격살격', '포스 차지 스피어', '인피니티 러시', 
                    '아킬레스 랜스', '하트 쓰러스트', '크리티컬 데스 피어싱', '심연의 나락참', '천무일신 베기', 
                    '크루세이더 임팩트', '배니싱 잽', '얼티밋 프레셔', '사신의 사선', '뇌광 번개찌르기'
                  ],
            [SkillType.MAGIC]: targetType === 'aoe'
                ? [
                    '블레이드 레인', '메테오 스트라이크', '엘리멘탈 버스트', '소드 필드', '루인 드라이브', '스톰 스트라이크',
                    '디바인 블레이드 레인', '에테르 노바 스매시', '마검 결계진', '천상 심판검', '성황의 검기 폭풍', 
                    '성역 정화진', '홀리 랜스 가든', '신벌의 무검 소나기', '아포칼립스 클레이브'
                  ]
                : [
                    '루인 마검격', '일루전 슬래시', '에테르 블레이드', '성검의 광채', '엘리멘탈 소드', '플레임 버스터', '아이스 브레이크',
                    '에테르 싱귤래리티 참', '신비 마검살', '룬 각인격', '빛의 정화 찌르기', '플레임 소울 스매시', 
                    '루나틱 슬래시', '다크 세이버', '소울 오라 드라이브', '비전 일도양단'
                  ],
            [SkillType.BUFF]: targetType === 'aoe'
                ? [
                    '전열의 함성', '승리의 찬가', '영역 전개', '성스러운 결계', '총군 가호', '신의 은총', 
                    '전투의 외침', '성역의 축복', '광휘의 장막', '전장의 노래', '고결한 희생',
                    '성기사단의 절대오라', '철옹성의 연대 전선', '용기의 불꽃 진호', '발할라의 영광', 
                    '제국의 절대방벽', '빛의 구원 결계', '성황의 황금 군령', '불굴 전열 가호'
                  ]
                : [
                    '수호의 결의', '철벽의 방벽', '불굴의 투지', '철혈의 맹세', '기사의 영예', '수호의 장막', '방어 태세',
                    '명예로운 기사의 결속', '수호 천사의 성흔', '절대 생존 가호', '아다만티움 장갑', 
                    '패왕의 가호', '절대 위엄', '불요불굴의 서약', '명예의 성배 오라'
                  ],
            [SkillType.DEBUFF]: targetType === 'aoe'
                ? [
                    '대붕괴진', '저주의 안개', '절망의 장막', '침묵의 파동', '혼돈의 영역', '공포의 포효', 
                    '광역속박', '파멸의 장막', '황폐화', '죽음의 무도',
                    '심연의 공포 진각', '위압의 기세 폭풍', '지옥 불꽃 구름', '암연의 심박 쇠약', 
                    '절망의 절대 올가미', '공포의 대포효 진동', '대지 혼란 교란진'
                  ]
                : [
                    '아머 브레이크', '소드 디스암', '도발의 갈망', '위압의 기세', '스매시 스턴', '테러 파동', '페인 임팩트',
                    '골격 분쇄격', '맹독 무기 오염', '실명 유도', '무장 파괴 일격', '중력 쇠약 배시', 
                    '고통 극대화 찌르기', '의지 상실의 낙인'
                  ],
            [SkillType.PASSIVE]: [
                '마스터리', '불굴의 의지', '단단한 피부', '소드 디펜스', '강화 단련', '투쟁 본능', 
                '체력 증진', '기사의 긍지', '철갑 장갑',
                '거인의 피', '검신일체', '금강 장갑 연마', '강철의 정신', '절대 방어 감각', 
                '불사신의 피', '왕의 수호 오라', '역전의 기품', '심연의 원동력'
            ]
        },
        mage: {
            [SkillType.PHYSICAL]: [
                '스태프 강타', '에테르 휩', '마력 폭사', '비전 타격', '지팡이 휘두르기',
                '마도 지팡이 강격', '룬 문자 격타', '공간 왜곡 타격', '에테르 쇼크웨이브', '차원 파쇄권'
            ],
            [SkillType.MAGIC]: targetType === 'aoe'
                ? [
                    '인페르노', '아이스버그', '메테오 스트라이크', '체인 썬더', '아포칼립스', '블리자드', 
                    '피닉스 스톰', '카오스 버스트', '어스퀘이크 마기', '스타라이트 샤워', '에테르 레이저',
                    '심연의 초신성 폭발', '프로스트 에이펙스 노바', '블랙홀 싱귤래리티', '천지 창조의 광휘', 
                    '홍련의 대종말', '절대영도 블리자드', '스타 더스트 붕괴진', '번개 폭풍 소나기', '코스믹 노바 메테오'
                  ]
                : [
                    '파이어볼', '아이스 볼트', '라이트닝 볼트', '비전 마탄', '에테르 스트림', '윈드 커터', 
                    '다크 시어', '어스 핀', '마도 광선', '체인 라이트닝', '마력 화살', '블래스트 버스트',
                    '카타스트로피 스피어', '마력 응축포', '에테르 스파이럴 레이', '암연의 어둠살', 
                    '절대 비전 창', '화염 폭결포', '아이스 크리스탈 니들', '영혼 분해 마비탄'
                  ],
            [SkillType.BUFF]: targetType === 'aoe'
                ? [
                    '영역 전개', '성스러운 장막', '마력 증폭의 진', '에테르의 결계',
                    '비전 차원 진각 오라', '시공간 가속 영역', '절대 마력 주파수 조율', '대마법사의 현풍 쉴드'
                  ]
                : [
                    '마나 쉴드', '엠플리파이 마력', '에테르 가호', '비전 조율', '스펠 레지스트', 
                    '엘리멘탈 실드', '마인드 포커스', '지혜의 축복',
                    '초월적 지능 증폭', '룬 문자 수호진', '비전 오버로드', '마나 순환 가속', '에테르 리플렉트 배리어'
                  ],
            [SkillType.DEBUFF]: targetType === 'aoe'
                ? [
                    '대붕괴진', '저주의 안개', '절망의 장막', '침묵의 파동', '혼돈의 영역', '공포의 포효', '광역속박',
                    '비전 결계 봉인진', '원소 폭주 가스 안개', '시공 정체 지대', '중력 역전 붕괴진'
                  ]
                : [
                    '마나 번', '그림자 저주', '엘리멘탈 위크니스', '사일런스 도메인', '그라비티 홀', 
                    '슬로우 필드', '멘탈 붕괴', '스펠 브레이커',
                    '마나 역류 저주', '감각 소멸 안개', '비전 무기 폭발', '정신 박탈 일격'
                  ],
            [SkillType.PASSIVE]: [
                '마도 회로', '에테르 호흡', '주문 영창 단축', '현자의 혜안', '원소 친화력', 
                '비전 통찰', '마력 충전', '정신 통일',
                '무한 마나핵', '심연의 혜안', '진리 탐구자', '룬 문자 완벽 통제', '에테르 공명 체질', '이중 주문 영창'
            ]
        },
        rogue: {
            [SkillType.PHYSICAL]: targetType === 'aoe'
                ? [
                    '애로우 샤워', '스프레드 파이어', '멀티플 샷', '그림자 난무', '블레이드 소나기', 
                    '트릭 밤', '크레센트 킥', '폭풍 소나기',
                    '팬텀 스카이 애로우', '폭발성 화살 소나기', '폭풍 연격 난무', '칼날 부메랑 가시안개'
                  ]
                : [
                    '헤드샷 스나이프', '퀵 드로우', '팬텀 스트라이크', '섀도우 스탭', '페이탈 커터', 
                    '샤프 슛', '더블 트랩', '비수 찌르기', '윈드 런', '포이즌 바이트', '치명적 표적', '래피드 파이어',
                    '치명적 암습 찌르기', '혈관 뚫기 사격', '일격 필살', '그림자 살수 찌르기', '바람 가르기 사격'
                  ],
            [SkillType.MAGIC]: targetType === 'aoe'
                ? [
                    '다크니스 밤', '원소 빗줄기', '독가스 대폭발', '소멸 사격', '스톰 플레어',
                    '다크 헤븐즈 멸살사격', '맹독 원소 폭풍', '공허 소멸 광역폭격'
                  ]
                : [
                    '다크니스 인챈트', '원소 마키', '독 가스 분출', '소멸 사격', '비전 샷', '플레임 불릿', '칠 블래스트',
                    '독가스 속사탄', '암연의 침묵 스나이핑', '원소 폭발 탄환'
                  ],
            [SkillType.BUFF]: targetType === 'aoe'
                ? [
                    '스피릿 아우라', '바람의 장막', '사격 대형', '은밀한 이동',
                    '살수들의 고속 행진곡', '질풍 사격 절대 진형', '신출귀몰 안개오라'
                  ]
                : [
                    '택티컬 리로드', '포커스 에임', '윈드 러너', '섀도우 클록', '이베이전 가이드', 
                    '알러트 스탠스', '헌터스 아이', '스텔스 모드',
                    '급소 포착 조준', '비정상 신체 자극', '극한 전율 가동', '어둠 속 추적 본능'
                  ],
            [SkillType.DEBUFF]: targetType === 'aoe'
                ? [
                    '독가스 장막', '연막탄 구름', '그림자 올가미', '표적 표출',
                    '죽음의 마비 독가스 지대', '그림자 포획 족쇄진', '섬광 연막탄 난사'
                  ]
                : [
                    '트랩 바인드', '스모크 스크린', '아킬레스 컷', '포이즌 낙인', '위크 포인트 폭로', 
                    '블라인드 도발', '사일런트 나이프',
                    '대동맥 신경절 차단', '시야 장쇄 차단', '감각 마비 가시'
                  ],
            [SkillType.PASSIVE]: [
                '급소 통찰', '그림자 보법', '신속한 사격술', '야생 본능', '함정 숙련', '표적 포착', '추격자', '바람의 가호',
                '치명적 독극물 전문가', '암살의 가계부', '그림자의 영혼 동조', '약점 침투 정밀 본능'
            ]
        },
        monk: {
            [SkillType.PHYSICAL]: targetType === 'aoe'
                ? [
                    '선풍각', '지진 파동', '백열권', '용권풍', '소성충격', '광역 크래시', '충격파 진각', '사자후',
                    '대지 파괴 기공파', '무천 선풍 대난무', '진각 폭풍 쇄격', '금강야차 광역 강타'
                  ]
                : [
                    '어퍼컷 브레이커', '바이퍼 엘보', '스트레이트 블로우', '철산고', '피닉스 러시', 
                    '타이거 피스트', '니크래시', '원투 스트라이크', '열풍권', '폭렬권', '맹호 격파',
                    '천하무쌍 정수리 내려치기', '비룡 무천각', '뇌전 기공포', '심장 무력 권격'
                  ],
            [SkillType.MAGIC]: targetType === 'aoe'
                ? [
                    '키 플로 스톰', '정신 충격 오라', '아우라 블래스터',
                    '투기 방출 대폭사', '천상의 아우라 크로니클', '정신 파쇄 기공격'
                  ]
                : [
                    '키 파동포', '오라 블래스트', '뇌신권', '명상격', '불꽃 장막권', '혼령 타격',
                    '진공 기공탄', '명문 혈도 파괴 장벽', '에테르 영혼 권격'
                  ],
            [SkillType.BUFF]: targetType === 'aoe'
                ? [
                    '기합 제창', '투기의 해방', '금강 장막',
                    '투사들의 불멸 대함성', '만물의 생기 순환 장막', '무천의 수호 절대장벽'
                  ]
                : [
                    '기 에너지 순환', '정신 통일', '인내의 육체', '금강권', '투기 조율', 
                    '철포삼', '동체 시력 극대화', '신체 각성',
                    '단전 영기 개방', '무적의 육신 강림', '초인적 순발력'
                  ],
            [SkillType.DEBUFF]: targetType === 'aoe'
                ? [
                    '지진 무력화', '투기 압박', '혈도 봉쇄 오라',
                    '대공동 투기 감압 진역', '신경 신경 쇠약장격'
                  ]
                : [
                    '혈도 타격', '관절 속박', '충격 스턴', '기 절삭', '위압적 투기', '균형 붕괴',
                    '경락 파괴 점혈격', '중력 제어 압박 수인', '골막 파열 장벽'
                  ],
            [SkillType.PASSIVE]: [
                '신체 개조', '기감 통찰', '백전노장', '외공 연마', '금강불괴', '불굴의 투지', '철신공', '호신의 경지',
                '반탄신공', '심안 통찰', '영기 단전 활성', '절대 유체 보법'
            ]
        },
        healer: {
            [SkillType.PHYSICAL]: [
                '해머 스매시', '디바인 저지먼트', '징벌의 철퇴', '빛의 일격', '성직의 타격',
                '성스러운 크러시 Hammer', '정화의 격쇄 장막', '빛의 정결 철퇴격'
            ],
            [SkillType.MAGIC]: targetType === 'aoe'
                ? [
                    '헤븐스 저지먼트', '정화의 불꽃', '디바인 버스트', '광휘의 파도', '천상의 폭발', 
                    '홀리 노바', '성스러운 섬멸',
                    '아크 엔젤 샤이닝 레인', '성광정화 카타클리즘', '세라핌 디바인 버스터'
                  ]
                : [
                    '홀리 라이트', '디바인 스트라이크', '세라핌 볼트', '엔젤릭 빔', '레이 오브 라이트', '성광탄', '어스름 정화', '퇴마격', '샤이닝 레지스', '신성한 창',
                    '디바인 스페셜 레이', '성직자의 파동 정화선', '신의 가호 창'
                  ],
            [SkillType.BUFF]: targetType === 'aoe'
                ? [
                    '신의 가호', '구원의 성역', '치유의 찬가', '영생의 오라', '성스러운 장막',
                    '대천사의 은빛 날개 오라', '절대 면역 불멸 축복', '에테르 성흔 재생장막'
                  ]
                : [
                    '세크리드 힐', '디바인 아머', '엔젤릭 로드', '홀리 블레싱', '그레이스 오브 라인', 
                    '치유의 찬가', '리제너레이션', '프로텍션 실드', '구원의 손길', '성흔의 기도',
                    '신의 절대 호위 축복', '영생의 성수 축복', '고결한 은총의 성인식'
                  ],
            [SkillType.DEBUFF]: targetType === 'aoe'
                ? [
                    '사악함의 무도', '성스러운 속박 파동', '회개의 오라',
                    '참회의 절대 실명 폭풍', '이단 단죄의 징벌장막'
                  ]
                : [
                    '성스러운 침묵', '빛의 낙인', '사악함 속박', '참회의 눈물', '성광 실명', '마력의 속박', '신성한 심판',
                    '에테르 낙인 격살', '이단 낙인 낙인', '속죄의 참회 고해성사'
                  ],
            [SkillType.PASSIVE]: [
                '신성한 호흡', '치유 극대화', '정신 수양', '천상의 가호', '구원자의 사명', '은총 조화', '기도 숙련', '자애로운 마음',
                '빛의 인도자 감각', '신앙의 절대 방패', '대천사의 동정심', '성스러운 혈통 활성화'
            ]
        }
    };

    // 신력계통에 따른 환상적인 판타지 접두어
    const elemPrefixes: Record<string, string[]> = {
        '태양': ['솔라', '태양의', '헬리오스', '여명의', '작열', '크로노스', '솔라리스', '황금 태양의', '빛살', '눈부신'],
        '화염': ['플레임', '블레이즈', '인페르노', '홍련의', '불꽃', '불멸의 화염', '화산의', '작열하는', '마그마', '파이로'],
        '광휘': ['홀리', '세인트', '디바인', '광휘의', '천상의', '미카엘의', '오로라', '눈부신 광채의', '백색 광휘', '아크엔젤'],
        '월광': ['루나', '섀도우', '달빛의', '은월의', '창월', '셀레네', '월하의', '은빛 서린', '차가운 달의', '신비한 월광'],
        '전격': ['라이트닝', '볼트', '템페스트', '뇌전의', '스파크', '천벌의 번개', '플래시', '전율의 전격', '뇌신의', '번개'],
        '지령': ['가이아', '어스', '대지의', '스톤', '크리스탈', '대지의 고동', '굳건한 지령의', '산맥의', '보석의', '대리석'],
        '질풍': ['윈드', '게일', '폭풍의', '질풍의', '에어로', '폭풍우', '바람의 폭풍', '신비한 하늬바람', '태풍의', '비상하는'],
        '빙결': ['프로스트', '아이스', '빙결의', '서리', '글레이시아', '절대영도의', '영겁의 서리', '블리자드', '차가운', '동토의'],
        '해수': ['아쿠아', '웨이브', '푸른 바다의', '격류의', '마린', '포세이돈의', '심해의', '용오름', '파도의', '격동하는 수류'],
        '강철': ['아이언', '스틸', '강철의', '메탈', '티타늄', '합금의', '철갑 장갑', '단단한 강철성', '철혈의', '황동의'],
        '암연': ['다크', '새도우', '어둠의', '심연의', '공허의', '명계의', '칠흑 같은', '타락한', '사신의', '카이저 어둠'],
        '초화': ['그린', '리프', '대자연의', '가시나무', '스피릿', '생명의', '엘프의 오라', '요정의 숨결', '푸른 잎사귀', '가시덩굴'],
        '무': ['진', '원초의', '앱솔루트', '무상', '태초의', '진정한 무의', '무공의', '극의에 달한', '신화적', '무아지경의']
    };

    // 티어별 수식어 (이름에 격조를 한층 더함)
    let tierPrefix = '';
    if (tier === ClassTier.FINAL) {
        const grandPrefixes = ['초월·', '마스터·', '그랜드·', '얼티밋 ', '앱솔루트'];
        tierPrefix = grandPrefixes[finalSeed % grandPrefixes.length];
    } else if (tier === ClassTier.LAST) {
        const lastPrefixes = ['하이퍼·', '에이펙스·', '비기·', '오의·', '진·'];
        tierPrefix = lastPrefixes[finalSeed % lastPrefixes.length];
    } else if (tier === ClassTier.SECOND) {
        const midPrefixes = ['상급·', '강화된·', '세컨드 ', '어드밴스드 '];
        tierPrefix = midPrefixes[finalSeed % midPrefixes.length];
    } else if (tier === ClassTier.FIRST) {
        tierPrefix = '';
    }

    const elemList = elemPrefixes[shinryoku] || ['신비의'];
    const elemPref = elemList[finalSeed % elemList.length];

    const pool = actionPools[archetype] || actionPools.knight;
    const actions = pool[skillType] || pool[SkillType.PHYSICAL] || ['에테르 슬래시'];
    const action = actions[finalSeed % actions.length];

    // 다채로운 패턴 결합 규칙 적용
    const pattern = finalSeed % 3;
    let finalSkillName = "";
    if (pattern === 0) {
        finalSkillName = `${tierPrefix}${elemPref} ${action}`;
    } else if (pattern === 1) {
        finalSkillName = `${tierPrefix}${action}`;
    } else {
        finalSkillName = `${elemPref} ${action}`;
        if (tierPrefix) {
            finalSkillName = `${tierPrefix}${finalSkillName}`;
        }
    }

    // 이중 공백 및 문자열 불순물 정화 후 리턴
    return finalSkillName.replace(/\s+/g, ' ').trim();
};

/**
 * 동료 영입 시 신력 계보에 걸맞은 클래스명을 리턴하는 헬퍼 함수
 */
export const getShinryokuThematicClassName = (
    shinryokuType: string,
    place: 'military' | 'mercenary' | 'elf' | 'demon' | 'beast' | 'general' | string,
    combatStyle?: string,
    subRank?: string
): string => {
    const element = (shinryokuType || '').replace('계', '');
    
    const templates: Record<string, Record<string, string>> = {
        '태양': {
            'military': '태양십자군 정예병',
            'mercenary': '황금여명 용병',
            'elf': '태양의 숲 파수꾼',
            'demon': '솔라리스 침략가',
            'beast': '광염의 수인투사',
            'general': '태양의 구도자'
        },
        '화염': {
            'military': '화염철갑 정예병',
            'mercenary': '인페르노 용병',
            'elf': '잿더미 정령궁수',
            'demon': '화산지옥 전사',
            'beast': '열화의 맹수',
            'general': '불꽃의 영혼'
        },
        '광휘': {
            'military': '성광의 성기사',
            'mercenary': '치천사의 심판자',
            'elf': '오로라 엘프수호자',
            'demon': '백야의 도살자',
            'beast': '광명의 권법가',
            'general': '빛의 세례자'
        },
        '월광': {
            'military': '은월의 밤수호병',
            'mercenary': '루나틱 어쌔신',
            'elf': '초승달 은영궁수',
            'demon': '그림자달 지배자',
            'beast': '달빛의 밤사냥꾼',
            'general': '월하의 유랑자'
        },
        '전격': {
            'military': '낙뢰의 뇌기병',
            'mercenary': '자전의 돌격대',
            'elf': '뇌신 정령사수',
            'demon': '방전의 사령관',
            'beast': '천둥의 무투가',
            'general': '뇌전의 전령'
        },
        '대지': {
            'military': '지석의 반석방패병',
            'mercenary': '대지의 분쇄용병',
            'elf': '지맥의 고대수호자',
            'demon': '수정지옥 군주',
            'beast': '거암의 수인전사',
            'general': '대지의 영성자'
        },
        '지령': {
            'military': '지석의 반석방패병',
            'mercenary': '대지의 분쇄용병',
            'elf': '지맥의 고대수호자',
            'demon': '수정지옥 군주',
            'beast': '거암의 수인전사',
            'general': '대지의 영성자'
        },
        '질풍': {
            'military': '열풍의 신속기병',
            'mercenary': '제피로스 돌격대',
            'elf': '바람의 숲의 저격수',
            'demon': '태풍의 가해자',
            'beast': '폭풍의 격투가',
            'general': '바람의 숨결'
        },
        '빙결': {
            'military': '서리이빨 수비대',
            'mercenary': '절대영도 사냥꾼',
            'elf': '눈꽃 정령궁수',
            'demon': '혹한의 마족기사',
            'beast': '동토의 맹수',
            'general': '얼음의 방랑자'
        },
        '해수': {
            'military': '격류의 창해병',
            'mercenary': '해신강림 용병',
            'elf': '물보라 정령궁수',
            'demon': '심해의 공포전사',
            'beast': '소용돌이 투사',
            'general': '바다의 파수꾼'
        },
        '강철': {
            'military': '철벽의 강철요새병',
            'mercenary': '불멸의 기계용병',
            'elf': '강인한 기계궁수',
            'demon': '강철마계 구축전사',
            'beast': '티타늄 무도가',
            'general': '강철의 탐구자'
        },
        '암흑': {
            'military': '나락의 혼돈기사',
            'mercenary': '심연귀 사령용병',
            'elf': '그림자 숲의 저격수',
            'demon': '심연의 지배자',
            'beast': '어둠의 권수',
            'general': '어둠의 사제'
        },
        '암연': {
            'military': '나락의 혼돈기사',
            'mercenary': '심연귀 사령용병',
            'elf': '그림자 숲의 저격수',
            'demon': '심연의 지배자',
            'beast': '어둠의 권수',
            'general': '어둠의 사제'
        },
        '초화': {
            'military': '가시넝쿨 수비대',
            'mercenary': '세계수 숲의 해결사',
            'elf': '대자연의 은총궁수',
            'demon': '독포자 역병전사',
            'beast': '개화의 무도인',
            'general': '정령의 구도자'
        },
        '무기강화': {
            'military': '무기연성 정예도검병',
            'mercenary': '철혈의 강화용병',
            'elf': '무구강화 사수',
            'demon': '강철병기 지휘관',
            'beast': '금강의 무투가',
            'general': '도검 마스터'
        },
        '신체강화': {
            'military': '강인한 육체의 용병대',
            'mercenary': '한계돌파 난전사',
            'elf': '신체강화 유격수',
            'demon': '근육마족 기괴병',
            'beast': '야성의 괴력투사',
            'general': '한계 돌파자'
        },
        '무': {
            'military': '정예 근위군인',
            'mercenary': '강철의 모험가용병',
            'elf': '숲의 수호자',
            'demon': '지옥 마족전사',
            'beast': '수인 맹격투사',
            'general': '모험가'
        }
    };

    const elemKey = templates[element] ? element : '무';
    const placeKey = templates[elemKey][place] ? place : 'general';
    let className = templates[elemKey][placeKey];

    // 군대 소속이고 하위 랭크(이병 등)가 전달된 경우 꼬리표 붙임
    if (place === 'military' && subRank) {
        className = `${className} (${subRank})`;
    }

    return className;
};

/**
 * 개별 스킬 생성기 (레벨, 티어, 신력, 클래스, 선호/랜덤 타입 기반)
 */
export const createCompanionSkill = (
    companion: Companion,
    lvl: number,
    tier: ClassTier,
    forceType?: SkillType | null,
    seedOffset: number = 0
): Skill => {
    const shinryoku = companion.shinryokuType || '무';
    const constantKey = SHINRYOKU_TO_CONSTANT_KEY[shinryoku] || '일반';
    const classType = companion.classType || '견습생';
    const combatStyle = companion.combatStyle || '';

    // 아키타입 분석 (스킬 타입 및 패시브 무기 결정 시 활용)
    const isKnightArchetype = /(기사|전사|가디언|수호|검|솔저|팔라딘|용병)/.test(classType) || /(검사|창술사|광전사|기사|쌍검사|창기사|마창사|도끼전사|파괴전사|소드마스터|워로드|팔라딘|버서커|글래디에이터|다크나이트|그랜드마스터|드래곤나이트|크루세이더)/.test(combatStyle);
    const isMageArchetype = /(마법|마술|술사|소서러|위저드|메이지|연금|학자)/.test(classType) || /(마법사|원소술사|흑마법사|환술사|정령술사|아크메이지|네크로맨서|서머너|대마법사|리치|현자)/.test(combatStyle);
    const isRogueArchetype = /(도적|암살|어쌔신|레인저|헌터|궁수|사냥|그림자)/.test(classType) || /(궁수|도적|거너|저격수|마검사|암살자|무법자|트랩퍼|신궁|어쌔신|데스나이트|아처마스터|쉐도우워커|스나이퍼)/.test(combatStyle);
    const isMonkArchetype = /(무도|격투|권사|투사|버서커|수사|몽크)/.test(classType) || /(권투사|격투가|권투가|스트라이커|무도가|몽크|챔피언|무신)/.test(combatStyle);
    const isHealerArchetype = /(성직|사제|프리스트|클레릭|드루이드|성녀|치유)/.test(classType) || /(에너자이저|지원가|음유시인|버퍼|사제|프리스트|바드|세인트|비숍)/.test(combatStyle);

    // 1. 스킬 유형 결정
    let skillType: SkillType;
    if (forceType) {
        skillType = forceType;
    } else {
        // 일반 동료 또는 무작위 모드: 레벨 및 씨드에 따라 다채롭게 분배
        const typeRoll = (lvl + seedOffset * 17) % 100;
        if (typeRoll < 35) {
            // 공격 스킬인 경우 클래스 성향에 최적화된 타입 부여
            if (isMageArchetype || isHealerArchetype) {
                skillType = SkillType.MAGIC;
            } else if (isKnightArchetype || isRogueArchetype || isMonkArchetype) {
                skillType = SkillType.PHYSICAL;
            } else {
                skillType = (seedOffset % 2 === 0) ? SkillType.PHYSICAL : SkillType.MAGIC;
            }
        }
        else if (typeRoll < 55) skillType = SkillType.BUFF;
        else if (typeRoll < 75) skillType = SkillType.DEBUFF;
        else skillType = SkillType.PASSIVE;
    }

    // 2. 타겟 유형 결정 (패시브 제외 25% 확률로 광역)
    let targetType: SkillTarget = 'single';
    if (skillType !== SkillType.PASSIVE) {
        if ((lvl + seedOffset) % 4 === 0) {
            targetType = 'aoe';
        }
    }

    // 3. 위력 및 파라미터 계산
    let powerRatio = TIER_MAX_RATIO[tier] || 100;
    let mpCost = 0;
    const { total } = calculateTotalStats(companion);

    const options: any = { targetType, powerRatio };

    if (skillType === SkillType.PHYSICAL || skillType === SkillType.MAGIC) {
        if (targetType === 'aoe') {
            if (tier === ClassTier.NONE) powerRatio = 40;
            else powerRatio = Math.floor(powerRatio * 0.5);
        } else if (tier === ClassTier.NONE) {
            powerRatio = 100;
        }
        options.powerRatio = powerRatio;

        // 30% 확률로 상태이상 부여 (신력 계열에 엄격하게 일치하는 상태이상 부여)
        if ((seedOffset + lvl) % 3 === 0) {
            const ailmentPool = SHINRYOKU_AILMENTS_MAP[constantKey] || SHINRYOKU_AILMENTS_MAP['일반'] || STATUS_AILMENTS_LIST;
            options.ailment = ailmentPool[Math.abs(seedOffset + lvl) % ailmentPool.length];
        }

        mpCost = Math.max(10, Math.floor(powerRatio / 3));
        if (targetType === 'aoe') mpCost *= 2;
        if (options.ailment) mpCost += 20;
    } 
    else if (skillType === SkillType.BUFF) {
        options.successRate = calculateBuffSuccessRate(total);
        const effectCount = tier === ClassTier.FIRST ? 1 : tier === ClassTier.SECOND ? 2 : tier === ClassTier.LAST ? 3 : 4;
        
        const buffTypes = ['STAT_BOOST', 'ELEMENTAL_DMG_BOOST', 'ELEMENTAL_RES_BOOST', 'HP_RECOV', 'MP_RECOV', 'CLEANSE'];
        if (tier === ClassTier.LAST || tier === ClassTier.FINAL) buffTypes.push('MANA_SHIELD', 'RESURRECTION');
        
        const selectedBuffEffects: BuffConfig[] = [];
        let currentSlots = 0;
        
        while (currentSlots < effectCount) {
            const bType = buffTypes[(currentSlots + seedOffset) % buffTypes.length];
            if (selectedBuffEffects.some(e => e.type === bType && bType !== 'STAT_BOOST')) {
                currentSlots++;
                continue;
            }
            
            const slotsNeeded = bType === 'RESURRECTION' ? 2 : 1;
            if (currentSlots + slotsNeeded > effectCount) {
                if (slotsNeeded > 1) {
                    currentSlots++;
                    continue;
                } else break;
            }

            let isAllElem = false;
            let targetElem = constantKey;
            if (bType === 'ELEMENTAL_DMG_BOOST' || bType === 'ELEMENTAL_RES_BOOST') {
                if ((currentSlots + seedOffset) % 5 === 0) {
                    isAllElem = true;
                    targetElem = '모든 속성';
                }
            }

            const isAccEva = false;
            const value = getBuffBaseCap(tier, targetType, isAccEva, false, isAllElem);

            const effect: BuffConfig = { type: bType as any, value };
            if (bType === 'STAT_BOOST') {
                const stats = ['STR', 'INT', 'WIS', 'DEF', 'AGI', 'CTRL', 'MaxHP', 'MaxMP'];
                effect.targetStat = stats[(seedOffset + currentSlots) % stats.length];
            } else if (bType === 'ELEMENTAL_DMG_BOOST' || bType === 'ELEMENTAL_RES_BOOST') {
                effect.targetElement = targetElem;
            } else if (bType === 'CLEANSE') {
                const cleanseLimit = tier === ClassTier.FIRST ? 2 : tier === ClassTier.SECOND ? 4 : 6;
                effect.ailments = [...STATUS_AILMENTS_LIST].slice(0, cleanseLimit);
            } else if (bType === 'RESURRECTION') {
                effect.value = (tier === ClassTier.FINAL) ? (targetType === 'aoe' ? 50 : 100) : (targetType === 'aoe' ? 25 : 50);
            }
            
            selectedBuffEffects.push(effect);
            currentSlots += slotsNeeded;
        }
        
        options.buffEffects = selectedBuffEffects.length > 0 ? selectedBuffEffects : [{ type: 'STAT_BOOST', targetStat: 'STR', value: getBuffBaseCap(tier, targetType) }];
        powerRatio = Math.max(...options.buffEffects.map((e: BuffConfig) => e.value || 0));

        const totalValue = options.buffEffects.reduce((sum: number, ef: BuffConfig) => sum + (ef.type === 'RESURRECTION' ? (ef.value || 0) * 2 : (ef.value || 0)), 0);
        const slotCount = options.buffEffects.reduce((sum: number, ef: BuffConfig) => sum + (ef.type === 'RESURRECTION' ? 2 : 1), 0);
        mpCost = Math.floor(totalValue / 2) + (slotCount * 30) + 20;
        if (options.buffEffects.some((ef: BuffConfig) => ef.type === 'RESURRECTION')) mpCost += 80;
        const slotMultiplier = Math.max(1, slotCount);
        mpCost *= slotMultiplier;
        if (targetType === 'aoe') mpCost *= 2;
    } 
    else if (skillType === SkillType.DEBUFF) {
        options.successRate = calculateDebuffSuccessRate(total, { ctrl: 10 } as any);
        options.debuffSubType = (tier === ClassTier.LAST || tier === ClassTier.FINAL) ? 'BOTH' : ((seedOffset % 2 === 0) ? 'STAT' : 'AILMENT');
        options.debuffStatType = ['P.Atk', 'M.Atk', 'P.Def', 'M.Def'][(seedOffset + lvl) % 4];
        options.debuffStatValue = getDebuffBaseCap(tier, targetType);
        
        const ailmentPool = SHINRYOKU_AILMENTS_MAP[constantKey] || SHINRYOKU_AILMENTS_MAP['일반'] || STATUS_AILMENTS_LIST;
        const ailmentLimit = tier === ClassTier.FIRST ? 1 : tier === ClassTier.SECOND ? 2 : 3;
        options.debuffAilments = [...ailmentPool].slice(0, ailmentLimit);
        
        let statCost = 0;
        let ailmentCost = 0;
        if (options.debuffSubType === 'STAT' || options.debuffSubType === 'BOTH') statCost = options.debuffStatValue * 8;
        if (options.debuffSubType === 'AILMENT' || options.debuffSubType === 'BOTH') ailmentCost = options.debuffAilments.length * 40;
        mpCost = statCost + ailmentCost + 25;
        if (targetType === 'aoe') mpCost *= 2;
        
        powerRatio = options.debuffStatValue;
    } 
    else if (skillType === SkillType.PASSIVE) {
        const canCombat = tier !== ClassTier.FIRST && tier !== ClassTier.NONE;
        options.passiveCategory = (canCombat && (seedOffset % 2 === 0)) ? 'COMBAT' : 'STAT';
        
        if (options.passiveCategory === 'STAT') {
            options.passiveTarget = ['STR', 'INT', 'WIS', 'DEF', 'AGI', 'CTRL', 'MaxHP', 'MaxMP'][(seedOffset + lvl) % 8];
        } else {
            options.passiveTarget = ['CritChance', 'CritDamage', 'CritDmgResist', 'EleAtk', 'EleRes', 'StatusResist'][(seedOffset + lvl) % 6];
        }
        
        options.passiveHasCondition = (seedOffset % 3 === 0);
        if (options.passiveHasCondition) {
            let specWeapons: WeaponType[] = [];
            if (companion.combatStyle && COMBAT_STYLE_SPECIALTIES[companion.combatStyle as CombatStyle]) {
                specWeapons = COMBAT_STYLE_SPECIALTIES[companion.combatStyle as CombatStyle];
            }
            if (specWeapons && specWeapons.length > 0) {
                options.passiveWeaponCondition = specWeapons[seedOffset % specWeapons.length];
            } else {
                if (isMageArchetype || isHealerArchetype) {
                    options.passiveWeaponCondition = 'Staff';
                } else if (isRogueArchetype) {
                    options.passiveWeaponCondition = 'SubSword';
                } else if (isMonkArchetype) {
                    options.passiveWeaponCondition = 'Knuckle';
                } else {
                    options.passiveWeaponCondition = 'Sword';
                }
            }
        }
        options.selectedPassiveElement = constantKey;

        const bonusMult = options.passiveHasCondition ? 1.2 : 1.0;
        let base = 0;
        if (options.passiveCategory === 'STAT') {
            if (tier === ClassTier.FIRST) base = 5;
            else if (tier === ClassTier.SECOND) base = 10;
            else if (tier === ClassTier.LAST) base = 20;
            else if (tier === ClassTier.FINAL) base = 30;
            else base = 5;
        } else {
            if (tier === ClassTier.SECOND) base = 5;
            else if (tier === ClassTier.LAST) base = 10;
            else if (tier === ClassTier.FINAL) base = 20;
            else base = 0;
        }
        powerRatio = Math.floor(base * bonusMult);
        options.powerRatio = powerRatio;
        mpCost = 0;
    }

    if (skillType !== SkillType.PASSIVE) {
        const mpMult = (tier === ClassTier.FIRST) ? 2
            : (tier === ClassTier.SECOND) ? 3
            : (tier === ClassTier.LAST) ? 4
            : (tier === ClassTier.FINAL) ? 2.5
            : 2;
        mpCost = Math.floor(mpCost * mpMult);
    }

    const effectFormula = generateEffectFormula({
        type: skillType,
        tier: tier,
        ...options
    });

    const skillName = generateThematicSkillName(
        shinryoku,
        classType,
        skillType,
        tier,
        targetType,
        lvl + seedOffset,
        companion.name,
        companion.combatStyle || ''
    );

    let description = '';
    if (skillType === SkillType.PHYSICAL || skillType === SkillType.MAGIC) {
        description = `[${skillType === SkillType.PHYSICAL ? '물리' : '마법'}] ${targetType === 'aoe' ? '적 전체' : '적 단일'}에게 ${shinryoku}의 힘이 깃든 강력한 공격을 가합니다.${options.ailment ? ` [부가 효과: ${options.ailment}]` : ''}`;
    } else if (skillType === SkillType.BUFF) {
        description = `[버프] ${targetType === 'aoe' ? '아군 전체' : '아군 단일'}에게 신비로운 강화 효과를 부여합니다.`;
    } else if (skillType === SkillType.DEBUFF) {
        description = `[디버프] ${targetType === 'aoe' ? '적 전체' : '적 단일'}에게 능력 약화 및 방해 효과를 부여합니다.`;
    } else if (skillType === SkillType.PASSIVE) {
        const targetLabel = options.passiveCategory === 'COMBAT' ? (PASSIVE_LABEL_MAP[options.passiveTarget] || options.passiveTarget) : options.passiveTarget;
        description = `[패시브] ${shinryoku}의 기운으로 상시 효과 발동: ${targetLabel} 증가${options.passiveHasCondition ? ` (${options.passiveWeaponCondition} 장착 시)` : ''}`;
    }

    return {
        name: skillName,
        description: description,
        type: skillType,
        tier: tier,
        level: 1,
        maxLevel: 10,
        currentMastery: 0,
        mpCost: mpCost,
        effectFormula: effectFormula,
        powerRatio: powerRatio,
        targetType: targetType,
        buffEffects: options.buffEffects
    };
};

/**
 * 동료의 클래스를 특정 티어로 해방/각성시키는 함수
 */
export const evolveCompanionClass = (
    companion: Companion, 
    targetTier: ClassTier, 
    specifiedShinryoku?: string, 
    specifiedClassName?: string
): { updated: Companion, evolved: boolean, oldTier: ClassTier, newTier: ClassTier, className: string } => {
    const updated = { ...companion };
    const oldTier = updated.classTier || ClassTier.NONE;
    
    if (oldTier === targetTier || targetTier === ClassTier.NONE) {
        return { updated, evolved: false, oldTier, newTier: oldTier, className: updated.classType };
    }

    // 신력 계통이 없거나 '미개방', '무속성', '없음', 'None' 등 유효하지 않은 경우 배정
    const isValidShinryoku = updated.shinryokuType && 
        updated.shinryokuType !== '미개방' && 
        updated.shinryokuType !== '무속성' && 
        updated.shinryokuType !== '없음' && 
        updated.shinryokuType !== 'None' && 
        updated.shinryokuType !== '일반' && 
        updated.shinryokuType !== '무' &&
        SHINRYOKU_TYPES_LIST.includes(updated.shinryokuType);

    if (!isValidShinryoku) {
        if (specifiedShinryoku) {
            updated.shinryokuType = specifiedShinryoku;
        } else {
            const availableTypes = [...SHINRYOKU_TYPES_LIST];
            const randomIndex = Math.floor(Math.random() * availableTypes.length);
            updated.shinryokuType = availableTypes[randomIndex];
        }
    }

    const shinryoku = updated.shinryokuType;
    
    let chosenClassName = specifiedClassName;
    if (!chosenClassName) {
        chosenClassName = getHumanoidClassByTier(shinryoku, targetTier, updated.combatStyle);
    }

    updated.classTier = targetTier;
    updated.classType = chosenClassName;

    if (targetTier === ClassTier.FIRST) {
        updated.firstClassName = chosenClassName;
        updated.firstClassDescription = `${shinryoku} 계통의 1차 클래스 각성`;
    } else if (targetTier === ClassTier.SECOND) {
        if (!updated.firstClassName) {
            updated.firstClassName = getHumanoidClassByTier(shinryoku, ClassTier.FIRST, updated.combatStyle);
            updated.firstClassDescription = `${shinryoku} 계통의 1차 클래스 각성`;
        }
        updated.secondClassName = chosenClassName;
        updated.secondClassDescription = `${shinryoku} 계통의 2차 클래스 심화`;
    } else if (targetTier === ClassTier.LAST) {
        if (!updated.firstClassName) {
            updated.firstClassName = getHumanoidClassByTier(shinryoku, ClassTier.FIRST, updated.combatStyle);
            updated.firstClassDescription = `${shinryoku} 계통의 1차 클래스 각성`;
        }
        if (!updated.secondClassName) {
            updated.secondClassName = getHumanoidClassByTier(shinryoku, ClassTier.SECOND, updated.combatStyle);
            updated.secondClassDescription = `${shinryoku} 계통의 2차 클래스 심화`;
        }
        updated.lastClassName = chosenClassName;
        updated.lastClassDescription = `${shinryoku} 계통의 3차 클래스 극의`;
    } else if (targetTier === ClassTier.FINAL) {
        if (!updated.firstClassName) {
            updated.firstClassName = getHumanoidClassByTier(shinryoku, ClassTier.FIRST, updated.combatStyle);
            updated.firstClassDescription = `${shinryoku} 계통의 1차 클래스 각성`;
        }
        if (!updated.secondClassName) {
            updated.secondClassName = getHumanoidClassByTier(shinryoku, ClassTier.SECOND, updated.combatStyle);
            updated.secondClassDescription = `${shinryoku} 계통의 2차 클래스 심화`;
        }
        if (!updated.lastClassName) {
            updated.lastClassName = getHumanoidClassByTier(shinryoku, ClassTier.LAST, updated.combatStyle);
            updated.lastClassDescription = `${shinryoku} 계통의 3차 클래스 극의`;
        }
        updated.finalClassName = chosenClassName;
        updated.finalClassDescription = `${shinryoku} 계통의 궁극 클래스 도달`;
    }

    return {
        updated,
        evolved: true,
        oldTier,
        newTier: targetTier,
        className: chosenClassName
    };
};

/**
 * 종합 전투력(Combat Power) 계산기
 */
export const getCompanionCP = (c: any): number => {
    if (!c) return 0;
    return calculateCombatPower(c);
};

/**
 * 순수 전투력(Pure Combat Power) 계산기
 * - 장비 아이템, 각종 버프 효과를 제외하고 패시브 스킬 및 기본 순수 능력치만을 바탕으로 전투력을 계산합니다.
 */
export const getCompanionPureCP = (c: any): number => {
    if (!c) return 0;
    try {
        const pureCopy = {
            ...c,
            equipment: undefined,
            statusEffects: [],
            activeBuffs: [],
            buffs: [],
            consumableEffects: []
        };
        return calculateCombatPower(pureCopy);
    } catch (e) {
        return calculateCombatPower(c);
    }
};



/**
 * 일반 동료의 한계 클래스 해방 포텐셜을 무작위로 생성합니다.
 * - 파이널클래스까지 가능: 0.1%
 * - 라스트클래스까지만 가능: 1%
 * - 세컨드클래스까지만 가능: 10%
 * - 퍼스트클래스까지만 가능: 80%
 * - 클래스 해방 불가 (NONE): 8.9%
 */
export const generateRandomPotential = (): ClassTier => {
    const r = Math.random();
    if (r < 0.001) return ClassTier.FINAL; // 0.1%
    if (r < 0.011) return ClassTier.LAST;  // 1.0%
    if (r < 0.111) return ClassTier.SECOND;// 10.0%
    if (r < 0.911) return ClassTier.FIRST; // 80.0%
    return ClassTier.NONE;                 // 8.9%
};

/**
 * 포텐셜이 설정되지 않았거나 현재 클래스보다 낮게 지정된 동료에 대해 포텐셜을 보정/지정합니다.
 */
export const ensureLiberationPotential = (entity: any): any => {
    const currentTier = entity.classTier || ClassTier.NONE;
    const currentRank = TIER_RANK[currentTier] ?? 0;

    if (!entity.liberationPotential) {
        let pot = generateRandomPotential();
        const potRank = TIER_RANK[pot] ?? 0;
        if (potRank < currentRank) {
            pot = currentTier;
        }
        entity.liberationPotential = pot;
    } else {
        const potRank = TIER_RANK[entity.liberationPotential] ?? 0;
        if (potRank < currentRank) {
            entity.liberationPotential = currentTier;
        }
    }
    return entity;
};

/**
 * 일반 동료 또는 과거 인연 NPC의 클래스 해방 가능성(Eligibility)을 판별하고 설정합니다.
 */
export const checkAndInitializeLiberationEligibility = (entity: any, combatPower: number): any => {
    const updated = ensureLiberationPotential(entity);

    if (!updated.liberationEligibility) {
        updated.liberationEligibility = {};
    }

    const limit = updated.liberationPotential || ClassTier.NONE;
    const limitRank = TIER_RANK[limit] || 0;

    // 포텐셜 한계치에 따른 자질 부여
    updated.liberationEligibility.first = limitRank >= 1;
    updated.liberationEligibility.second = limitRank >= 2;
    updated.liberationEligibility.last = limitRank >= 3;
    updated.liberationEligibility.final = limitRank >= 4;

    return updated;
};

/**
 * 타임엔진(일일 경과 등)에서 일반 동료나 과거 인연 NPC가 해방 가능 레벨 조건에 도달해 있을 때 
 * 가능성 판별 및 하루당 확률(전투력 보너스 반영)에 따라 해방을 처리합니다.
 */
export const checkTimeEngineCompanionClassLiberation = (companion: any): { updated: any, evolved: boolean, log?: string } => {
    // 몬스터, 사망, 또는 이미 파이널 클래스인 경우 제외
    if (companion.isMonster || companion.isDead || companion.classTier === ClassTier.FINAL) {
        return { updated: companion, evolved: false };
    }

    // 커스텀 동료는 유저가 직접 해방하거나 auto 설정으로 성장하므로 제외
    if (companion.isCustom === true) {
        return { updated: companion, evolved: false };
    }

    const currentTier = companion.classTier || ClassTier.NONE;
    const level = companion.level;

    // 1. 전투력 계산
    const cp = getCompanionCP(companion);

    // 2. 해방 가능성 판별 및 갱신
    const updated = { ...companion };
    checkAndInitializeLiberationEligibility(updated, cp);

    // 3. 아주 아주 아주 낮은 확률로(0.001%) 포텐셜 한 단계 업그레이드! (잠재력 제한 설정된 동료 제외)
    let potentialUpgradeLog = "";
    if (!updated.isPotentialLocked && updated.liberationPotential !== ClassTier.FINAL && Math.random() < 0.00001) {
        const prevPot = updated.liberationPotential || ClassTier.NONE;
        let nextPot = ClassTier.NONE;
        if (prevPot === ClassTier.NONE) nextPot = ClassTier.FIRST;
        else if (prevPot === ClassTier.FIRST) nextPot = ClassTier.SECOND;
        else if (prevPot === ClassTier.SECOND) nextPot = ClassTier.LAST;
        else if (prevPot === ClassTier.LAST) nextPot = ClassTier.FINAL;

        updated.liberationPotential = nextPot;
        checkAndInitializeLiberationEligibility(updated, cp); // Eligibility 재계산
        potentialUpgradeLog = `[각성 자질 개화] ${updated.name}님이 한계를 뛰어넘는 깨달음을 얻어, 더 높은 클래스(${nextPot})로 향하는 새로운 포텐셜을 개화했습니다!`;
    }

    const eligibility = updated.liberationEligibility || {};

    let nextTier: ClassTier | null = null;
    let baseChance = 0;
    let isEligible = false;
    let reqLevel = 30;
    let reqCp = 5000;

    if (currentTier === ClassTier.NONE && level >= 30 && cp >= 10000) {
        nextTier = ClassTier.FIRST;
        isEligible = eligibility.first === true;
        baseChance = 0.01; // 1%
        reqLevel = 30;
        reqCp = 10000;
    } else if (currentTier === ClassTier.FIRST && level >= 100 && cp >= 50000) {
        nextTier = ClassTier.SECOND;
        isEligible = eligibility.second === true;
        baseChance = 0.004; // 0.4%
        reqLevel = 100;
        reqCp = 50000;
    } else if (currentTier === ClassTier.SECOND && level >= 300 && cp >= 200000) {
        nextTier = ClassTier.LAST;
        isEligible = eligibility.last === true;
        baseChance = 0.001; // 0.1%
        reqLevel = 300;
        reqCp = 200000;
    } else if (currentTier === ClassTier.LAST && level >= 1000 && cp >= 1500000) {
        nextTier = ClassTier.FINAL;
        isEligible = eligibility.final === true;
        baseChance = 0.0001; // 0.01%
        reqLevel = 1000;
        reqCp = 1500000;
    }

    if (potentialUpgradeLog && (!nextTier || !isEligible)) {
        // 해방은 안 일어났지만 포텐셜 업그레이드 로그는 반환
        return { updated, evolved: false, log: potentialUpgradeLog };
    }

    if (!nextTier || !isEligible) {
        return { updated, evolved: false };
    }

    // 전투력 보너스: 기준 전투력(reqCp) 대비 현재 전투력의 비율에 따라 최대 2.5배 확률 상승
    const refCp = reqCp;
    const cpBonusMultiplier = 1.0 + Math.min(1.5, cp / refCp);
    const finalChance = baseChance * cpBonusMultiplier;

    if (Math.random() < finalChance) {
        const result = evolveCompanionClass(updated, nextTier);
        if (result.evolved) {
            let fullyUpdated = result.updated;
            // 일반 동료와 socialNetwork를 구분하여 성장 헬퍼 또는 스킬 부여
            const entityAsAny = fullyUpdated as any;
            if (entityAsAny.stats && typeof entityAsAny.stats.hp === 'number' && !entityAsAny.isPastConnection) {
                fullyUpdated = processAutomaticGrowth(fullyUpdated);
            } else {
                if (fullyUpdated.shinryokuType) {
                    fullyUpdated.skills = generateNpcSkills(fullyUpdated.level, fullyUpdated.shinryokuType, nextTier);
                }
            }

            let log = `[각성] ${companion.name}님이 수련 끝에 잠재력을 깨우치고 ${nextTier} 클래스 '${result.className}'(으)로 각성했습니다! (전투력: ${cp.toLocaleString()})`;
            if (potentialUpgradeLog) {
                log = `${potentialUpgradeLog}\n${log}`;
            }
            return {
                updated: fullyUpdated,
                evolved: true,
                log
            };
        }
    }

    if (potentialUpgradeLog) {
        return { updated, evolved: false, log: potentialUpgradeLog };
    }

    return { updated, evolved: false };
};

/**
 * 동료의 자동 성장(스탯 분배, 클래스 해방, 스킬 자동 습득)을 처리합니다.
 * - 일반 동료(!isCustom): 
 *   - 클래스 해방은 자동으로 진행되지 않음 (수동/이벤트 해방에 따름).
 *   - 해방된 클래스 단계(미해방, 퍼스트, 세컨드, 라스트, 파이널) 상태에 부합하는 레벨별 스킬만 자동 습득.
 * - 커스텀 동료(isCustom): growthSettings 설정에 맞춰 유저가 지정한 방식으로 수행.
 */
export const processAutomaticGrowth = (companion: Companion): Companion => {
    let updatedCompanion = assignRandomCombatStyle({ ...companion });
    let changed = false;
    const isCustom = Boolean(
        companion.isCustom || 
        (companion as any).isCustomMonster || 
        companion.monsterData?.isCustomMonster || 
        isMonsterCompanion(companion)
    );

    // Idempotency check: 이미 처리된 레벨/스탯/클래스티어 상태라면 건너뜀
    if (updatedCompanion.growthSettings?.lastProcessed?.level === updatedCompanion.level && 
        updatedCompanion.growthSettings?.lastProcessed?.statPoints === updatedCompanion.statPoints &&
        updatedCompanion.growthSettings?.lastProcessed?.classTier === updatedCompanion.classTier) {
        return companion;
    }

    
    // 1. Stat Growth
    // 일반 동료 또는 statAutoMode가 'auto'인 커스텀 동료에 한해 스탯을 자동 분배합니다.
    if (updatedCompanion.statPoints > 0 && (!isCustom || updatedCompanion.growthSettings?.statAutoMode === 'auto')) {
        let statDist = null;
        if (isCustom && updatedCompanion.growthSettings?.statAutoMode === 'auto' && updatedCompanion.growthSettings?.statDistribution) {
            statDist = updatedCompanion.growthSettings.statDistribution;
        } else {
            const roleText = (updatedCompanion.combatStyle || "") + " " + (updatedCompanion.job || "") + " " + (updatedCompanion.firstClassName || "") + " " + (updatedCompanion.secondClassName || "") + " " + (updatedCompanion.lastClassName || "") + " " + (updatedCompanion.finalClassName || "");
            
            const isKnight = /(검사|창술사|광전사|기사|쌍검사|창기사|마창사|도끼전사|파괴전사|소드마스터|워로드|팔라딘|버서커|글래디에이터|다크나이트|그랜드마스터|드래곤나이트|크루세이더|전사|무사|기사단장|탱커)/.test(roleText);
            const isMage = /(마법사|원소술사|흑마법사|환술사|정령술사|아크메이지|네크로맨서|서머너|대마법사|리치|현자|마도사|주술사|음유시인)/.test(roleText);
            const isRogue = /(궁수|도적|거너|저격수|마검사|암살자|무법자|트랩퍼|신궁|어쌔신|데스나이트|아처마스터|쉐도우워커|스나이퍼|사냥꾼)/.test(roleText);
            const isMonk = /(권투사|격투가|권투가|스트라이커|무도가|몽크|챔피언|무신|무투가)/.test(roleText);
            const isHealer = /(사제|성직자|힐러|드루이드|비숍|프리스트)/.test(roleText);
            
            if (isHealer) statDist = { wis: 50, int: 30, maxHp: 10, maxMp: 10 };
            else if (isMage) statDist = { int: 50, wis: 30, maxMp: 10, def: 5, maxHp: 5 };
            else if (isRogue) statDist = { agi: 50, str: 30, ctrl: 10, maxHp: 10 };
            else if (isMonk) statDist = { str: 40, agi: 30, maxHp: 20, def: 10 };
            else if (isKnight) statDist = { str: 40, def: 30, maxHp: 30 };
            else statDist = { str: 25, agi: 25, def: 25, maxHp: 25 };
        }

        if (statDist) {
            const distObj = statDist as Record<string, number>;
            const distributionSum = Object.values(distObj).reduce((a: number, b: number) => a + b, 0);
            if (distributionSum > 0) {
                const pointsToSpend = updatedCompanion.statPoints;
                const newStats = { ...updatedCompanion.stats };
                Object.entries(distObj).forEach(([stat, points]) => {
                    if (newStats.hasOwnProperty(stat)) {
                        const amount = Math.floor((points * pointsToSpend) / distributionSum);
                        if (stat === 'maxHp' || stat === 'maxMp') {
                            (newStats as any)[stat] += amount * 10;
                            if (stat === 'maxHp') (newStats as any).hp += amount * 10;
                            if (stat === 'maxMp') (newStats as any).mp += amount * 10;
                        } else {
                            (newStats as any)[stat] += amount;
                        }
                    }
                });
                
                // 남은 스탯 포인트가 있을 경우 메인 스탯에 털어넣기
                let spent = Object.values(distObj).reduce((sum: number, points: number) => sum + Math.floor((points * pointsToSpend) / distributionSum), 0);
                let remainder = pointsToSpend - spent;
                if (remainder > 0) {
                     if (distObj.int && distObj.int >= 30) { newStats.int += remainder; }
                     else if (distObj.agi && distObj.agi >= 30) { newStats.agi += remainder; }
                     else { newStats.str += remainder; }
                }

                updatedCompanion.stats = newStats;
                updatedCompanion.statPoints = 0;
                changed = true;
            }
        }
    }

    // 2. Class Liberation / Monster Evolution
    // [중요] 일반 동료는 자동 클래스 해방이 절대 진행되지 않음!
    // 커스텀 동료: 사용자가 growthSettings.classAutoMode === 'auto' 로 설정한 경우에만 수행
    if (isCustom && updatedCompanion.growthSettings?.classAutoMode === 'auto') {
        if (isMonsterCompanion(updatedCompanion)) {
            const currentStage = getMonsterCompanionStage(updatedCompanion);
            const evoConfig = MONSTER_EVOLUTION_CONFIG[currentStage];
            if (evoConfig && evoConfig.next) {
                const isLevelMet = updatedCompanion.level >= evoConfig.reqLevel;
                const isAffectionMet = (updatedCompanion.affection ?? 50) >= evoConfig.reqAffection;
                if (isLevelMet && isAffectionMet) {
                    const evoResult = evolveMonsterCompanion(updatedCompanion);
                    if (evoResult.evolved) {
                        updatedCompanion = evoResult.updated;
                        changed = true;
                    }
                }
            }
        } else {
            if (!updatedCompanion.shinryokuType || updatedCompanion.shinryokuType === '미개방') {
                const availableTypes = [...SHINRYOKU_TYPES_LIST];
                const randomIndex = Math.floor(Math.random() * availableTypes.length);
                updatedCompanion.shinryokuType = availableTypes[randomIndex];
                changed = true;
            }

            const currentTier = updatedCompanion.classTier || ClassTier.NONE;
            const cp = getCompanionCP(updatedCompanion);
            let nextTier: ClassTier | null = null;
            let reqLvl = 0;
            let reqCp = 0;
            let isTrialCleared = false;
            let baseChance = 0;
            let reqPotentialRank = 0;

            if (currentTier === ClassTier.NONE) {
                nextTier = ClassTier.FIRST; reqLvl = 30; reqCp = 10000; baseChance = 0.8; reqPotentialRank = 1;
                isTrialCleared = Boolean(updatedCompanion.hasClearedFirstTrial || updatedCompanion.firstTrialCleared);
            } else if (currentTier === ClassTier.FIRST) {
                nextTier = ClassTier.SECOND; reqLvl = 100; reqCp = 50000; baseChance = 0.5; reqPotentialRank = 2;
                isTrialCleared = Boolean(updatedCompanion.hasClearedSecondTrial || updatedCompanion.secondTrialCleared);
            } else if (currentTier === ClassTier.SECOND) {
                nextTier = ClassTier.LAST; reqLvl = 300; reqCp = 200000; baseChance = 0.3; reqPotentialRank = 3;
                isTrialCleared = Boolean(updatedCompanion.hasClearedLastTrial || updatedCompanion.lastTrialCleared);
            } else if (currentTier === ClassTier.LAST) {
                nextTier = ClassTier.FINAL; reqLvl = 1000; reqCp = 1500000; baseChance = 0.1; reqPotentialRank = 4;
                isTrialCleared = Boolean(updatedCompanion.hasClearedFinalTrial || updatedCompanion.finalTrialCleared);
            }

            if (nextTier) {
                const companionPotential = updatedCompanion.liberationPotential || ClassTier.NONE;
                const potentialRankMap: Partial<Record<ClassTier, number>> = {
                    [ClassTier.NONE]: 0, [ClassTier.FIRST]: 1, [ClassTier.SECOND]: 2, [ClassTier.LAST]: 3, [ClassTier.FINAL]: 4
                };
                const companionPotRank = potentialRankMap[companionPotential] || 0;

                const isLevelMet = updatedCompanion.level >= reqLvl;
                const isCpMet = cp >= reqCp;
                const isPotentialMet = companionPotRank >= reqPotentialRank;

                if (isLevelMet && isCpMet && isTrialCleared && isPotentialMet) {
                    const cpBonusMultiplier = 1.0 + Math.min(1.5, cp / reqCp);
                    const finalChance = Math.min(1.0, baseChance * cpBonusMultiplier);

                    if (Math.random() < finalChance) {
                        const evolveResult = evolveCompanionClass(updatedCompanion, nextTier);
                        if (evolveResult.evolved) {
                            updatedCompanion = evolveResult.updated;
                            changed = true;
                        }
                    }
                }
            }
        }
    }

    // 3. Skill Acquisition
    // - 일반 동료: 해방된 클래스 단계에 맞춰 레벨별 스킬 자동 습득 (중복 방지 로직 포함)
    // - 커스텀 동료: growthSettings.skillAutoMode === 'auto' 일 때 수행 (선호 타입 반영).
    const shouldAcquireSkills = !isCustom || (isCustom && updatedCompanion.growthSettings?.skillAutoMode === 'auto');

    if (shouldAcquireSkills) {
        if (isMonsterCompanion(updatedCompanion)) {
            const skillResult = checkAndApplyMonsterAutoSkills(updatedCompanion);
            if (skillResult.newlyLearned.length > 0) {
                updatedCompanion = skillResult.updatedCompanion;
                changed = true;
            }
        } else {
        const preferredTypeStr = isCustom ? updatedCompanion.growthSettings?.preferredSkillType : null;
        const typeMap: Record<string, SkillType> = {
            'physical': SkillType.PHYSICAL,
            'magic': SkillType.MAGIC,
            'buff': SkillType.BUFF,
            'debuff': SkillType.DEBUFF,
            'passive': SkillType.PASSIVE
        };
        const preferredType = preferredTypeStr ? typeMap[preferredTypeStr] : null;

        // 이름 기반의 고유 시드 오프셋 계산
        const nameHash = updatedCompanion.name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);

        // 스킬을 습득하는 표준 레벨 구간 테이블
        // [레벨, 해당 티어, 고유 인덱스]
        const skillMilestones: { lvl: number, tier: ClassTier, seedIndex: number }[] = [
            // 미해방 / 기본 (10, 20)
            { lvl: 10, tier: ClassTier.NONE, seedIndex: nameHash + 1 },
            { lvl: 20, tier: ClassTier.NONE, seedIndex: nameHash + 2 },
            // 1티어 (퍼스트 클래스): 30, 50, 70, 90
            { lvl: 30, tier: ClassTier.FIRST, seedIndex: nameHash + 3 },
            { lvl: 50, tier: ClassTier.FIRST, seedIndex: nameHash + 4 },
            { lvl: 70, tier: ClassTier.FIRST, seedIndex: nameHash + 5 },
            { lvl: 90, tier: ClassTier.FIRST, seedIndex: nameHash + 6 },
            // 2티어 (세컨드 클래스): 100, 140, 180, 220, 260, 300, 400
            { lvl: 100, tier: ClassTier.SECOND, seedIndex: nameHash + 7 },
            { lvl: 140, tier: ClassTier.SECOND, seedIndex: nameHash + 8 },
            { lvl: 180, tier: ClassTier.SECOND, seedIndex: nameHash + 9 },
            { lvl: 220, tier: ClassTier.SECOND, seedIndex: nameHash + 10 },
            { lvl: 260, tier: ClassTier.SECOND, seedIndex: nameHash + 11 },
            { lvl: 300, tier: ClassTier.SECOND, seedIndex: nameHash + 12 },
            { lvl: 400, tier: ClassTier.SECOND, seedIndex: nameHash + 13 },
            // 3티어 (라스트 클래스): 500, 600, 700, 800, 900
            { lvl: 500, tier: ClassTier.LAST, seedIndex: nameHash + 14 },
            { lvl: 600, tier: ClassTier.LAST, seedIndex: nameHash + 15 },
            { lvl: 700, tier: ClassTier.LAST, seedIndex: nameHash + 16 },
            { lvl: 800, tier: ClassTier.LAST, seedIndex: nameHash + 17 },
            { lvl: 900, tier: ClassTier.LAST, seedIndex: nameHash + 18 },
        ];

        // 파이널 클래스 (Final Class) - 1000부터 200레벨당 1개씩 추가 무제한
        const maxLevelForMilestones = Math.max(updatedCompanion.level + 200, 10000);
        let finalLvl = 1000;
        let seedOffset = 19;
        while (finalLvl <= maxLevelForMilestones) {
            skillMilestones.push({ lvl: finalLvl, tier: ClassTier.FINAL, seedIndex: nameHash + seedOffset });
            finalLvl += 200;
            seedOffset++;
        }

        // [NEW] 잠재력 제한(isPotentialLocked) 설정된 커스텀 동료는 해당 잠재력까지의 클래스 스킬 슬롯이 원래 닫히는 레벨 이후 100레벨마다 1개씩 추가됨
        if (updatedCompanion.isPotentialLocked && updatedCompanion.isCustom) {
            const limitPot = updatedCompanion.liberationPotential || updatedCompanion.classTier || ClassTier.NONE;
            const limitRank = TIER_RANK[limitPot] ?? 0;

            if (limitRank >= (TIER_RANK[ClassTier.NONE] ?? 0)) {
                let extraLvl = 120; // 미해방 원래 마감 Lv.20 이후 100레벨마다
                while (extraLvl <= maxLevelForMilestones) {
                    skillMilestones.push({ lvl: extraLvl, tier: ClassTier.NONE, seedIndex: nameHash + seedOffset++ });
                    extraLvl += 100;
                }
            }
            if (limitRank >= (TIER_RANK[ClassTier.FIRST] ?? 1)) {
                let extraLvl = 190; // 퍼스트 원래 마감 Lv.90 이후 100레벨마다
                while (extraLvl <= maxLevelForMilestones) {
                    skillMilestones.push({ lvl: extraLvl, tier: ClassTier.FIRST, seedIndex: nameHash + seedOffset++ });
                    extraLvl += 100;
                }
            }
            if (limitRank >= (TIER_RANK[ClassTier.SECOND] ?? 2)) {
                let extraLvl = 360; // 세컨드 원래 마감 Lv.260 이후 100레벨마다 (SkillBook 기준 마감 레벨 260)
                while (extraLvl <= maxLevelForMilestones) {
                    skillMilestones.push({ lvl: extraLvl, tier: ClassTier.SECOND, seedIndex: nameHash + seedOffset++ });
                    extraLvl += 100;
                }
            }
            if (limitRank >= (TIER_RANK[ClassTier.LAST] ?? 3)) {
                let extraLvl = 1000; // 라스트 원래 마감 Lv.900 이후 100레벨마다
                while (extraLvl <= maxLevelForMilestones) {
                    skillMilestones.push({ lvl: extraLvl, tier: ClassTier.LAST, seedIndex: nameHash + seedOffset++ });
                    extraLvl += 100;
                }
            }
        }

        // 동료의 현재 클래스 해방 티어 계산 (미해방: 0, 퍼스트: 1, 세컨드: 2, 라스트: 3, 파이널: 4)
        const currentTier = updatedCompanion.classTier || ClassTier.NONE;
        const currentTierRank = TIER_RANK[currentTier] ?? 0;

        // 레벨 조건을 만족하면서, 현재 해방된 클래스 단계 이하에 속하는 스킬만 습득 가능
        const eligibleMilestones = skillMilestones.filter(m => {
            const milestoneTierRank = TIER_RANK[m.tier] ?? 0;
            return updatedCompanion.level >= m.lvl && milestoneTierRank <= currentTierRank;
        });

        eligibleMilestones.forEach(m => {
            const generatedSkill = createCompanionSkill(
                updatedCompanion,
                m.lvl,
                m.tier,
                preferredType,
                m.seedIndex
            );

            // [중요] 이미 스킬이 있는 경우(일반 동료) 추가 생성을 방지하라는 요청이 있으므로, 
            // 현재 습득하려는 마일스톤의 스킬이 이미 있거나, 
            // 일반 동료인데 커스텀하게 스킬이 이미 세팅된 경우(수동 개입)는 스킵하도록 함.
            const hasSameName = updatedCompanion.skills?.some(s => s.name === generatedSkill.name);
            const hasMilestoneSkill = updatedCompanion.skills?.some(s => s.tier === m.tier && s.powerRatio === generatedSkill.powerRatio); // 위력 비율 등으로 유사성 체크

            if (!hasSameName && !hasMilestoneSkill) {
                // 일반 동료의 경우, 이미 다른 스킬이 꽉 차있거나 수동으로 스킬이 있는 경우는 생성하지 않음 (유저 요청 3-1 반영)
                if (!isCustom && updatedCompanion.skills && updatedCompanion.skills.length >= eligibleMilestones.indexOf(m) + 1) {
                    // 이미 충분한 수의 스킬이 있다면 (수동으로 추가된 것으로 간주) 생성하지 않음
                    return;
                }

                updatedCompanion.skills = [...(updatedCompanion.skills || []), generatedSkill];
                changed = true;
            }
        });
        }
    }

    updatedCompanion.growthSettings = {
        ...updatedCompanion.growthSettings,
        lastProcessed: { 
            level: updatedCompanion.level, 
            statPoints: updatedCompanion.statPoints,
            classTier: updatedCompanion.classTier
        }
    };
    
    return changed ? updatedCompanion : companion;
};

/**
 * 인맥(NPC)의 성장(레벨업) 시 보유 스킬의 한계돌파(maxLevel 확장) 및 스킬 레벨 상승, MP 소모량 감소를 적용합니다.
 * 각종 일반 동료는 대상에서 제외됩니다.
 */
export const upgradeNpcSkillsOnGrowth = (entity: any, prevLevel?: number): boolean => {
    if (!entity || entity.isDead || entity.isPurged) return false;

    // 각종 일반 동료(영입된 일반 용병, 병사, 몬스터, 엘프, 수인, 마족 등)는 제외
    if ('loyalty' in entity && !entity.isCustom && !entity.isPastConnection && !entity.isRival && !entity.isEternalRival) {
        return false;
    }

    const currentLvl = Math.max(1, entity.level || 1);
    const levelGain = (typeof prevLevel === 'number' && currentLvl > prevLevel) ? (currentLvl - prevLevel) : 0;
    let anySkillUpgraded = false;

    // 클래스 해방된 인맥 NPC인데 아직 스킬이 없는 경우 기본 스킬 생성
    if ((!entity.skills || !Array.isArray(entity.skills) || entity.skills.length === 0) &&
        entity.classTier && entity.classTier !== ClassTier.NONE &&
        entity.shinryokuType &&
        !['미개방', '무속성', '없음', 'None', '일반', '무'].includes(entity.shinryokuType)) {
        entity.skills = generateNpcSkills(currentLvl, entity.shinryokuType, entity.classTier);
        anySkillUpgraded = true;
    }

    if (!entity.skills || !Array.isArray(entity.skills) || entity.skills.length === 0) {
        return false;
    }

    entity.skills = entity.skills.map((skill: Skill) => {
        if (!skill) return skill;
        const curMaxLvl = skill.maxLevel || 10;
        const curSkillLvl = skill.level || 1;

        const tierStr = String(skill.tier || skill.baseTier || skill.minClassTier || entity.classTier || ClassTier.NONE);
        let tierBaseLvl = 10;
        if (tierStr === ClassTier.FINAL || tierStr.includes('파이널') || tierStr.toUpperCase() === 'FINAL') {
            tierBaseLvl = 1000;
        } else if (tierStr === ClassTier.LAST || tierStr.includes('라스트') || tierStr.toUpperCase() === 'LAST') {
            tierBaseLvl = 300;
        } else if (tierStr === ClassTier.SECOND || tierStr.includes('세컨드') || tierStr.toUpperCase() === 'SECOND') {
            tierBaseLvl = 100;
        } else if (tierStr === ClassTier.FIRST || tierStr.includes('퍼스트') || tierStr.toUpperCase() === 'FIRST') {
            tierBaseLvl = 30;
        }

        const levelAboveBase = Math.max(0, currentLvl - tierBaseLvl);
        // 기본 10레벨 제한을 넘어 NPC 레벨에 비례해 스스로 스킬 한계돌파 수행
        const targetByMilestone = Math.floor(levelAboveBase / 10) + 1;
        const targetByGain = levelGain > 0
            ? curSkillLvl + Math.max(1, Math.floor(levelGain / 2))
            : curSkillLvl;

        const nextSkillLvl = Math.max(curSkillLvl, targetByMilestone, targetByGain);
        const nextMaxLvl = Math.max(curMaxLvl, nextSkillLvl);

        if (nextSkillLvl > curSkillLvl || nextMaxLvl > curMaxLvl) {
            const updatedSkill: Skill = {
                ...skill,
                level: nextSkillLvl,
                maxLevel: nextMaxLvl
            };
            const diff = Math.max(0, nextSkillLvl - curSkillLvl);

            if (diff > 0 && !isPassiveSkill(updatedSkill) && updatedSkill.type !== SkillType.DEBUFF && updatedSkill.mpCost && updatedSkill.mpCost > 0) {
                for (let i = 0; i < diff; i++) {
                    updatedSkill.mpCost = getReducedMpCostOnLevelUp(updatedSkill);
                }
            }

            anySkillUpgraded = true;
            return updatedSkill;
        }

        return skill;
    });

    return anySkillUpgraded;
};

/**
 * 인맥(socialNetwork)이나 학급 동기(classmates), 동아리원(clubMembers) 배열이 성장 처리된 직후,
 * NPC들의 스킬 한계돌파 및 스킬 레벨 성장을 함께 적용합니다.
 */
export const upgradeSocialNetworkSkillsOnGrowth = (prevNetwork: any[] | undefined, nextNetwork: any[] | undefined): void => {
    if (!nextNetwork || !Array.isArray(nextNetwork)) return;
    const prevLevelMap = new Map<string, number>();
    if (prevNetwork && Array.isArray(prevNetwork)) {
        prevNetwork.forEach(p => {
            if (p && p.id) prevLevelMap.set(p.id, p.level || 1);
        });
    }

    nextNetwork.forEach(npc => {
        if (!npc || npc.isDead || npc.isPurged) return;
        const prevLv = prevLevelMap.get(npc.id);
        if ((prevLv !== undefined && (npc.level || 1) > prevLv) || (npc.skills && npc.skills.length > 0) || (npc.classTier && npc.classTier !== ClassTier.NONE)) {
            upgradeNpcSkillsOnGrowth(npc, prevLv);
        }
    });
};

export const isMonsterCompanion = (comp: any): boolean => {
    if (!comp) return false;
    return Boolean(
        comp._isMonster ||
        comp.isMonster ||
        comp.isCustomMonster ||
        comp.monsterData ||
        comp.race === '몬스터' ||
        (typeof comp.race === 'string' && comp.race.includes('Monster')) ||
        comp.stage !== undefined ||
        comp.classType === '마수/몬스터' ||
        comp.classType === '몬스터' ||
        (comp.job && comp.job === '마수')
    );
};

export const getMonsterCompanionStage = (companion: Companion): MonsterStage => {
    const raw = (companion as any).stage || companion.monsterData?.stage || companion.classType;
    if (raw === MonsterStage.BABY || raw === '유아기' || raw === '유년기' || raw === 'BABY') return MonsterStage.BABY;
    if (raw === MonsterStage.CHILD || raw === '성장기' || raw === 'CHILD') return MonsterStage.CHILD;
    if (raw === MonsterStage.ADULT || raw === '성숙기' || raw === 'ADULT') return MonsterStage.ADULT;
    if (raw === MonsterStage.PERFECT || raw === '완전체' || raw === 'PERFECT') return MonsterStage.PERFECT;
    if (raw === MonsterStage.ULTIMATE || raw === '궁극체' || raw === 'ULTIMATE') return MonsterStage.ULTIMATE;
    if (raw === MonsterStage.SUPER_ULTIMATE || raw === '초궁극체' || raw === 'SUPER_ULTIMATE') return MonsterStage.SUPER_ULTIMATE;
    return MonsterStage.CHILD;
};

export const MONSTER_EVOLUTION_CONFIG: Record<MonsterStage, {
    label: string;
    next: MonsterStage | null;
    nextLabel: string;
    reqLevel: number;
    reqAffection: number;
    reqCp: number;
    desc: string;
}> = {
    [MonsterStage.EGG]: {
        label: '알',
        next: MonsterStage.BABY,
        nextLabel: '유아기',
        reqLevel: 0,
        reqAffection: 0,
        reqCp: 0,
        desc: '부화 대기 중'
    },
    [MonsterStage.BABY]: {
        label: '유아기',
        next: MonsterStage.CHILD,
        nextLabel: '성장기',
        reqLevel: 30,
        reqAffection: 20,
        reqCp: 1000,
        desc: '성장기 단계로 진화하여 야성의 기본 스킬 습득'
    },
    [MonsterStage.CHILD]: {
        label: '성장기',
        next: MonsterStage.ADULT,
        nextLabel: '성숙기',
        reqLevel: 70,
        reqAffection: 35,
        reqCp: 5000,
        desc: '본격적인 전투체로 진화하며 강력한 속성 공격 스킬 개방'
    },
    [MonsterStage.ADULT]: {
        label: '성숙기',
        next: MonsterStage.PERFECT,
        nextLabel: '완전체',
        reqLevel: 200,
        reqAffection: 50,
        reqCp: 20000,
        desc: '강력한 브레스 및 범위 비기 스킬을 보유한 완전체로 진화'
    },
    [MonsterStage.PERFECT]: {
        label: '완전체',
        next: MonsterStage.ULTIMATE,
        nextLabel: '궁극체',
        reqLevel: 500,
        reqAffection: 70,
        reqCp: 60000,
        desc: '고대 마수의 힘을 완전히 각성한 궁극체로 진화'
    },
    [MonsterStage.ULTIMATE]: {
        label: '궁극체',
        next: MonsterStage.SUPER_ULTIMATE,
        nextLabel: '초궁극체',
        reqLevel: 1000,
        reqAffection: 85,
        reqCp: 180000,
        desc: '차원의 한계를 돌파하는 신화적인 초궁극체로 진화'
    },
    [MonsterStage.SUPER_ULTIMATE]: {
        label: '초궁극체',
        next: null,
        nextLabel: '최고 단계',
        reqLevel: 2000,
        reqAffection: 100,
        reqCp: 500000,
        desc: '최종 도달 형태 (최대 Lv.2000까지 지속 성장 가능)'
    }
};

export const evolveMonsterCompanion = (
    companion: Companion
): { updated: Companion; evolved: boolean; oldStage: string; newStage: string } => {
    const curStage = getMonsterCompanionStage(companion);
    const config = MONSTER_EVOLUTION_CONFIG[curStage];

    if (!config || !config.next) {
        return { updated: companion, evolved: false, oldStage: config?.label || '초궁극체', newStage: config?.label || '초궁극체' };
    }

    const nextStage = config.next;
    const nextLabel = config.nextLabel;

    let updated: Companion = JSON.parse(JSON.stringify(companion));

    // 능력치 상승 보너스 (각 스탯 1.3배 상승)
    if (updated.stats) {
        const stats = { ...updated.stats };
        Object.keys(stats).forEach(k => {
            if (typeof (stats as any)[k] === 'number') {
                (stats as any)[k] = Math.floor((stats as any)[k] * 1.3);
            }
        });
        stats.hp = stats.maxHp;
        stats.mp = stats.maxMp;
        updated.stats = stats;
    }

    // 진화 단계 갱신
    updated.classType = nextStage;
    (updated as any).stage = nextStage;
    if (updated.monsterData) {
        updated.monsterData.stage = nextStage;
        if (updated.stats) {
            updated.monsterData.stats = { ...updated.stats };
            updated.monsterData.hp = updated.stats.hp;
            updated.monsterData.maxHp = updated.stats.maxHp;
            (updated.monsterData as any).mp = updated.stats.mp;
            (updated.monsterData as any).maxMp = updated.stats.maxMp;
        }
        // 랭크 상승
        const ranks: ('C' | 'B' | 'A' | 'S' | 'SS' | 'SSS')[] = ['C', 'B', 'A', 'S', 'SS', 'SSS'];
        const currentRankIdx = ranks.indexOf(updated.monsterData.rank);
        if (currentRankIdx >= 0 && currentRankIdx < ranks.length - 1) {
            updated.monsterData.rank = ranks[currentRankIdx + 1];
        }
    }

    // 진화 단계에 맞는 마물 스킬 자동 갱신 습득
    const skillResult = checkAndApplyMonsterAutoSkills(updated);
    updated = skillResult.updatedCompanion;

    return {
        updated,
        evolved: true,
        oldStage: config.label,
        newStage: nextLabel
    };
};


