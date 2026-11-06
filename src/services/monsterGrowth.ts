import { Companion, MonsterStage, Skill, SkillType, SkillTarget, ClassTier, Character, CapturedMonster, JobType, Stats } from '../types';
import { getStatPointsPerLevel } from '../utils';
export { calculateMonsterFarmTrainingLimit, getMonsterFarmTrainingLimitInfo } from './monsterTrainingLimitService';

export interface MonsterStageSkillDef {
    stage: MonsterStage;
    minLevel: number;
    skill: {
        name: string;
        type: SkillType;
        targetType: SkillTarget;
        mpCost: number;
        powerRatio: number;
        effectFormula: string;
        description: string;
    };
}

export const getShinryokuSkillCategory = (shinryokuType?: string): string => {
    if (!shinryokuType) return 'default';
    if (shinryokuType.includes('화염') || shinryokuType.includes('태양') || shinryokuType.includes('초화')) return '화염계';
    if (shinryokuType.includes('빙결') || shinryokuType.includes('해수')) return '빙결계';
    if (shinryokuType.includes('전격') || shinryokuType.includes('뇌전')) return '전격계';
    if (shinryokuType.includes('질풍') || shinryokuType.includes('바람')) return '질풍계';
    if (shinryokuType.includes('대지')) return '대지계';
    if (shinryokuType.includes('광휘')) return '광휘계';
    if (shinryokuType.includes('암흑') || shinryokuType.includes('월광')) return '암흑계';
    if (shinryokuType.includes('신체강화') || shinryokuType.includes('강철') || shinryokuType.includes('무기강화')) return '신체강화계';
    return 'default';
};

// 몬스터 성장 단계별 / 신력계통별 자동 스킬 라이브러리 (유년기 ~ 초궁극체)
export const MONSTER_STAGE_SKILLS: Record<string, MonsterStageSkillDef[]> = {
    '화염계': [
        {
            stage: MonsterStage.BABY,
            minLevel: 1,
            skill: {
                name: '불꽃 조각 뿜기',
                type: SkillType.PHYSICAL,
                targetType: 'single',
                mpCost: 5,
                powerRatio: 115,
                effectFormula: 'STR*1.1 + INT*0.3',
                description: '작은 입에서 튀어나오는 불꽃 조각으로 적을 위협합니다.'
            }
        },
        {
            stage: MonsterStage.CHILD,
            minLevel: 30,
            skill: {
                name: '화염 할퀴기',
                type: SkillType.PHYSICAL,
                targetType: 'single',
                mpCost: 10,
                powerRatio: 135,
                effectFormula: 'STR*1.4',
                description: '불길에 싸인 발톱으로 적을 거세게 할퀴어 피해를 줍니다.'
            }
        },
        {
            stage: MonsterStage.CHILD,
            minLevel: 45,
            skill: {
                name: '열혈 연소 포효',
                type: SkillType.BUFF,
                targetType: 'self',
                mpCost: 15,
                powerRatio: 100,
                effectFormula: 'STR*0.35 + INT*0.2',
                description: '체내의 화염 본능을 끌어올려 공격력을 폭발적으로 증가시킵니다.'
            }
        },
        {
            stage: MonsterStage.ADULT,
            minLevel: 70,
            skill: {
                name: '맹렬한 화염 브레스',
                type: SkillType.MAGIC,
                targetType: 'aoe',
                mpCost: 35,
                powerRatio: 190,
                effectFormula: 'INT*2.0',
                description: '성숙기에 도달하여 전방의 모든 적에게 뜨거운 열기의 브레스를 발사합니다.'
            }
        },
        {
            stage: MonsterStage.ADULT,
            minLevel: 120,
            skill: {
                name: '홍련의 돌진',
                type: SkillType.PHYSICAL,
                targetType: 'single',
                mpCost: 28,
                powerRatio: 210,
                effectFormula: 'STR*2.2',
                description: '온몸에 불꽃을 두르고 적에게 강렬하게 돌진합니다.'
            }
        },
        {
            stage: MonsterStage.PERFECT,
            minLevel: 200,
            skill: {
                name: '홍련 폭발 파동',
                type: SkillType.MAGIC,
                targetType: 'aoe',
                mpCost: 55,
                powerRatio: 260,
                effectFormula: 'INT*2.8',
                description: '완전체의 강대한 불꽃 에너지를 폭발시켜 전체 적을 집어삼킵니다.'
            }
        },
        {
            stage: MonsterStage.PERFECT,
            minLevel: 350,
            skill: {
                name: '불꽃의 본능 방어',
                type: SkillType.PASSIVE,
                targetType: 'self',
                mpCost: 0,
                powerRatio: 100,
                effectFormula: 'DEF*0.25',
                description: '몸을 둘러싸는 열기로 적의 데미지를 감쇄합니다.'
            }
        },
        {
            stage: MonsterStage.ULTIMATE,
            minLevel: 500,
            skill: {
                name: '멸망의 인페르노 포효',
                type: SkillType.MAGIC,
                targetType: 'aoe',
                mpCost: 85,
                powerRatio: 370,
                effectFormula: 'INT*3.8 + STR*1.6',
                description: '궁극체에 도달하여 전장 전체를 초토화하는 대재앙의 화념을 일으킵니다.'
            }
        },
        {
            stage: MonsterStage.ULTIMATE,
            minLevel: 750,
            skill: {
                name: '용암 유성 강격',
                type: SkillType.PHYSICAL,
                targetType: 'single',
                mpCost: 75,
                powerRatio: 420,
                effectFormula: 'STR*4.3',
                description: '용암 덩어리와 같은 중압감으로 단일 적을 완전히 파쇄합니다.'
            }
        },
        {
            stage: MonsterStage.SUPER_ULTIMATE,
            minLevel: 1000,
            skill: {
                name: '초궁극 연옥 시공 분쇄',
                type: SkillType.MAGIC,
                targetType: 'aoe',
                mpCost: 130,
                powerRatio: 580,
                effectFormula: 'INT*6.0 + STR*3.2',
                description: '초궁극체의 전설적인 영역에 도달하여 연옥의 불꽃으로 시공간을 분쇄합니다.'
            }
        }
    ],
    '빙결계': [
        {
            stage: MonsterStage.BABY,
            minLevel: 1,
            skill: {
                name: '얼음 가시 찌르기',
                type: SkillType.MAGIC,
                targetType: 'single',
                mpCost: 5,
                powerRatio: 110,
                effectFormula: 'INT*1.2',
                description: '작은 얼음 결정 가시를 날려 적을 찌릅니다.'
            }
        },
        {
            stage: MonsterStage.CHILD,
            minLevel: 30,
            skill: {
                name: '혹한의 손톱',
                type: SkillType.PHYSICAL,
                targetType: 'single',
                mpCost: 10,
                powerRatio: 130,
                effectFormula: 'STR*1.3 + INT*0.3',
                description: '차갑게 얼어붙은 손톱으로 적에게 상처를 입힙니다.'
            }
        },
        {
            stage: MonsterStage.CHILD,
            minLevel: 45,
            skill: {
                name: '서리 장막',
                type: SkillType.BUFF,
                targetType: 'self',
                mpCost: 15,
                powerRatio: 100,
                effectFormula: 'DEF*0.3 + INT*0.2',
                description: '자신 주위에 찬 공기의 보호막을 생성하여 방어력을 높입니다.'
            }
        },
        {
            stage: MonsterStage.ADULT,
            minLevel: 70,
            skill: {
                name: '절대영도 난사',
                type: SkillType.MAGIC,
                targetType: 'aoe',
                mpCost: 35,
                powerRatio: 185,
                effectFormula: 'INT*2.0',
                description: '차가운 기운의 얼음 탄환을 전체 적에게 난사합니다.'
            }
        },
        {
            stage: MonsterStage.ADULT,
            minLevel: 120,
            skill: {
                name: '빙하 각성 돌격',
                type: SkillType.PHYSICAL,
                targetType: 'single',
                mpCost: 25,
                powerRatio: 200,
                effectFormula: 'STR*2.1',
                description: '단단한 얼음 갑옷을 누르고 단일 적에게 내지릅니다.'
            }
        },
        {
            stage: MonsterStage.PERFECT,
            minLevel: 200,
            skill: {
                name: '동결 폭풍 파동',
                type: SkillType.MAGIC,
                targetType: 'aoe',
                mpCost: 50,
                powerRatio: 255,
                effectFormula: 'INT*2.7',
                description: '전장을 동결시키는 매서운 아한대 폭풍 파동을 분사합니다.'
            }
        },
        {
            stage: MonsterStage.PERFECT,
            minLevel: 350,
            skill: {
                name: '수경 빙결 방벽',
                type: SkillType.PASSIVE,
                targetType: 'self',
                mpCost: 0,
                powerRatio: 100,
                effectFormula: 'DEF*0.25',
                description: '차갑고 맑은 빙결 결계가 피해를 흡수합니다.'
            }
        },
        {
            stage: MonsterStage.ULTIMATE,
            minLevel: 500,
            skill: {
                name: '극지 심연 빙룡포',
                type: SkillType.MAGIC,
                targetType: 'aoe',
                mpCost: 80,
                powerRatio: 360,
                effectFormula: 'INT*4.0',
                description: '궁극체에 이르러 심연의 극지 에너지를 거대한 용의 형상으로 발사합니다.'
            }
        },
        {
            stage: MonsterStage.ULTIMATE,
            minLevel: 750,
            skill: {
                name: '영하의 파괴 일격',
                type: SkillType.PHYSICAL,
                targetType: 'single',
                mpCost: 70,
                powerRatio: 410,
                effectFormula: 'STR*4.0 + INT*1.5',
                description: '적을 영하의 온도로 즉시 동결시키고 수직으로 파쇄합니다.'
            }
        },
        {
            stage: MonsterStage.SUPER_ULTIMATE,
            minLevel: 1000,
            skill: {
                name: '초궁극 절대영도 시공 동결',
                type: SkillType.MAGIC,
                targetType: 'aoe',
                mpCost: 125,
                powerRatio: 570,
                effectFormula: 'INT*6.2',
                description: '시간마저 얼려버리는 절대영도의 권능으로 시공간을 동결시킵니다.'
            }
        }
    ],
    '전격계': [
        {
            stage: MonsterStage.BABY,
            minLevel: 1,
            skill: {
                name: '스파크 물어뜯기',
                type: SkillType.PHYSICAL,
                targetType: 'single',
                mpCost: 5,
                powerRatio: 110,
                effectFormula: 'STR*1.1 + INT*0.2',
                description: '정전기를 번쩍이며 적을 빠르게 물어뜯습니다.'
            }
        },
        {
            stage: MonsterStage.CHILD,
            minLevel: 30,
            skill: {
                name: '뇌전 할퀴기',
                type: SkillType.PHYSICAL,
                targetType: 'single',
                mpCost: 10,
                powerRatio: 135,
                effectFormula: 'STR*1.4',
                description: '전기 자극을 머금은 손톱으로 감전 피격을 일으킵니다.'
            }
        },
        {
            stage: MonsterStage.CHILD,
            minLevel: 45,
            skill: {
                name: '신속 뇌전 각성',
                type: SkillType.BUFF,
                targetType: 'self',
                mpCost: 15,
                powerRatio: 100,
                effectFormula: 'DEX*0.4',
                description: '체내 전기를 신경에 흘려 신경 반응 속도를 대폭 극대화시킵니다.'
            }
        },
        {
            stage: MonsterStage.ADULT,
            minLevel: 70,
            skill: {
                name: '낙뢰 전격 브레스',
                type: SkillType.MAGIC,
                targetType: 'aoe',
                mpCost: 35,
                powerRatio: 190,
                effectFormula: 'INT*2.1',
                description: '고압의 뇌전을 일직선으로 뿜어내어 적들을 마비시킵니다.'
            }
        },
        {
            stage: MonsterStage.ADULT,
            minLevel: 120,
            skill: {
                name: '번개 신속 돌진',
                type: SkillType.PHYSICAL,
                targetType: 'single',
                mpCost: 25,
                powerRatio: 205,
                effectFormula: 'STR*2.0 + DEX*0.5',
                description: '보이지 않을 정도의 번개 같은 속도로 적을 강타합니다.'
            }
        },
        {
            stage: MonsterStage.PERFECT,
            minLevel: 200,
            skill: {
                name: '뇌신 폭뢰 파동',
                type: SkillType.MAGIC,
                targetType: 'aoe',
                mpCost: 50,
                powerRatio: 260,
                effectFormula: 'INT*2.8',
                description: '완전체의 힘으로 거대한 전격 폭뢰를 방출하여 전체를 흔듭니다.'
            }
        },
        {
            stage: MonsterStage.PERFECT,
            minLevel: 350,
            skill: {
                name: '초전도 본능 반사',
                type: SkillType.PASSIVE,
                targetType: 'self',
                mpCost: 0,
                powerRatio: 100,
                effectFormula: 'DEX*0.3',
                description: '초전도 반응으로 충격을 무효화하고 피해를 감쇄합니다.'
            }
        },
        {
            stage: MonsterStage.ULTIMATE,
            minLevel: 500,
            skill: {
                name: '천벌 뇌신 심판',
                type: SkillType.MAGIC,
                targetType: 'aoe',
                mpCost: 80,
                powerRatio: 365,
                effectFormula: 'INT*3.9 + STR*1.5',
                description: '하늘에서 무수한 뇌전 낙뢰를 내리쳐 적의 존재를 소멸시킵니다.'
            }
        },
        {
            stage: MonsterStage.ULTIMATE,
            minLevel: 750,
            skill: {
                name: '뇌전 섬광 연격',
                type: SkillType.PHYSICAL,
                targetType: 'single',
                mpCost: 70,
                powerRatio: 430,
                effectFormula: 'STR*4.3',
                description: '빛보다 빠른 속도로 연속 뇌전 잔상 타격을 퍼붓습니다.'
            }
        },
        {
            stage: MonsterStage.SUPER_ULTIMATE,
            minLevel: 1000,
            skill: {
                name: '초궁극 뇌제 공간 파괴',
                type: SkillType.MAGIC,
                targetType: 'aoe',
                mpCost: 120,
                powerRatio: 575,
                effectFormula: 'INT*5.8 + DEX*2.5',
                description: '초궁극의 뇌제 권능으로 전자기장 왜곡을 발생시켜 공간을 파괴합니다.'
            }
        }
    ],
    '질풍계': [
        {
            stage: MonsterStage.BABY,
            minLevel: 1,
            skill: {
                name: '바람 베기',
                type: SkillType.PHYSICAL,
                targetType: 'single',
                mpCost: 5,
                powerRatio: 110,
                effectFormula: 'STR*1.2',
                description: '작은 날갯짓이나 꼬리침으로 날카로운 바람 칼날을 날립니다.'
            }
        },
        {
            stage: MonsterStage.CHILD,
            minLevel: 30,
            skill: {
                name: '질풍 연격',
                type: SkillType.PHYSICAL,
                targetType: 'single',
                mpCost: 10,
                powerRatio: 130,
                effectFormula: 'STR*1.4',
                description: '바람의 흐름을 타 신속하게 적을 연타합니다.'
            }
        },
        {
            stage: MonsterStage.CHILD,
            minLevel: 45,
            skill: {
                name: '천공의 속도 포효',
                type: SkillType.BUFF,
                targetType: 'self',
                mpCost: 15,
                powerRatio: 100,
                effectFormula: 'DEX*0.4',
                description: '바람의 기운을 빌려 민첩함과 기동력을 비약적으로 끌어올립니다.'
            }
        },
        {
            stage: MonsterStage.ADULT,
            minLevel: 70,
            skill: {
                name: '진공 칼날 폭풍',
                type: SkillType.MAGIC,
                targetType: 'aoe',
                mpCost: 30,
                powerRatio: 180,
                effectFormula: 'INT*1.9',
                description: '진공 소용돌이를 발생시켜 전방의 모든 적에게 날카로운 피해를 줍니다.'
            }
        },
        {
            stage: MonsterStage.ADULT,
            minLevel: 120,
            skill: {
                name: '칼바람 돌풍 돌진',
                type: SkillType.PHYSICAL,
                targetType: 'single',
                mpCost: 25,
                powerRatio: 215,
                effectFormula: 'STR*2.3',
                description: '회오리바람을 휘감고 돌진하여 적을 꿰뚫습니다.'
            }
        },
        {
            stage: MonsterStage.PERFECT,
            minLevel: 200,
            skill: {
                name: '대선풍 압쇄 파동',
                type: SkillType.MAGIC,
                targetType: 'aoe',
                mpCost: 50,
                powerRatio: 250,
                effectFormula: 'INT*2.6 + DEX*0.5',
                description: '완전체의 거대한 기류압으로 전체 전장을 압사시킵니다.'
            }
        },
        {
            stage: MonsterStage.PERFECT,
            minLevel: 350,
            skill: {
                name: '기류 유도 회피',
                type: SkillType.PASSIVE,
                targetType: 'self',
                mpCost: 0,
                powerRatio: 100,
                effectFormula: 'DEX*0.25 + DEF*0.1',
                description: '공기 흐름을 사전에 읽어 적의 타격을 유연하게흘려보냅니다.'
            }
        },
        {
            stage: MonsterStage.ULTIMATE,
            minLevel: 500,
            skill: {
                name: '폭풍우 신성 심판',
                type: SkillType.MAGIC,
                targetType: 'aoe',
                mpCost: 80,
                powerRatio: 350,
                effectFormula: 'INT*3.7 + STR*1.7',
                description: '태풍급 대기 파동을 몰아쳐 모든 적에게 천벌을 내립니다.'
            }
        },
        {
            stage: MonsterStage.ULTIMATE,
            minLevel: 750,
            skill: {
                name: '질풍 일체 연격',
                type: SkillType.PHYSICAL,
                targetType: 'single',
                mpCost: 70,
                powerRatio: 440,
                effectFormula: 'STR*4.4',
                description: '바람과 완전히 하나가 되어 단일 대상을 일초 만에 도륙합니다.'
            }
        },
        {
            stage: MonsterStage.SUPER_ULTIMATE,
            minLevel: 1000,
            skill: {
                name: '초궁극 시공간 도륙',
                type: SkillType.MAGIC,
                targetType: 'aoe',
                mpCost: 120,
                powerRatio: 560,
                effectFormula: 'INT*5.6 + STR*3.2',
                description: '대음속 초진공 신속 기류로 시공간 차원 자체를 잘라냅니다.'
            }
        }
    ],
    '대지계': [
        {
            stage: MonsterStage.BABY,
            minLevel: 1,
            skill: {
                name: '바위 뭉치 던지기',
                type: SkillType.PHYSICAL,
                targetType: 'single',
                mpCost: 5,
                powerRatio: 110,
                effectFormula: 'STR*1.1 + DEF*0.2',
                description: '단단한 바위 조각을 적에게 내던져 충격을 줍니다.'
            }
        },
        {
            stage: MonsterStage.CHILD,
            minLevel: 30,
            skill: {
                name: '대지 할퀴기',
                type: SkillType.PHYSICAL,
                targetType: 'single',
                mpCost: 10,
                powerRatio: 130,
                effectFormula: 'STR*1.3 + DEF*0.3',
                description: '묵직한 바위 재질의 손톱으로 적을 내려칩니다.'
            }
        },
        {
            stage: MonsterStage.CHILD,
            minLevel: 45,
            skill: {
                name: '단단한 바위 외피',
                type: SkillType.BUFF,
                targetType: 'self',
                mpCost: 15,
                powerRatio: 100,
                effectFormula: 'DEF*0.4',
                description: '피부를 암석처럼 단단하게 만들어 피해 수용력을 늘립니다.'
            }
        },
        {
            stage: MonsterStage.ADULT,
            minLevel: 70,
            skill: {
                name: '암석 파쇄 브레스',
                type: SkillType.MAGIC,
                targetType: 'aoe',
                mpCost: 30,
                powerRatio: 180,
                effectFormula: 'INT*1.8 + DEF*0.5',
                description: '암석 파편과 토사의 폭풍을 브레스로 뿜어냅니다.'
            }
        },
        {
            stage: MonsterStage.ADULT,
            minLevel: 120,
            skill: {
                name: '대지 압쇄 돌진',
                type: SkillType.PHYSICAL,
                targetType: 'single',
                mpCost: 25,
                powerRatio: 220,
                effectFormula: 'STR*2.4',
                description: '육중한 거체로 적을 바닥에 짓이겨버립니다.'
            }
        },
        {
            stage: MonsterStage.PERFECT,
            minLevel: 200,
            skill: {
                name: '대지 진동 파동',
                type: SkillType.MAGIC,
                targetType: 'aoe',
                mpCost: 50,
                powerRatio: 245,
                effectFormula: 'INT*2.4 + STR*1.0',
                description: '지각을 크게 구르는 진동을 일으켜 넓은 범위의 적에게 타격을 줍니다.'
            }
        },
        {
            stage: MonsterStage.PERFECT,
            minLevel: 350,
            skill: {
                name: '금강 대지 요새',
                type: SkillType.PASSIVE,
                targetType: 'self',
                mpCost: 0,
                powerRatio: 100,
                effectFormula: 'DEF*0.35',
                description: '대지의 은총으로 받는 피해량을 비약적으로 감소시킵니다.'
            }
        },
        {
            stage: MonsterStage.ULTIMATE,
            minLevel: 500,
            skill: {
                name: '가이아의 천벌 포효',
                type: SkillType.MAGIC,
                targetType: 'aoe',
                mpCost: 80,
                powerRatio: 345,
                effectFormula: 'INT*3.5 + DEF*2.0',
                description: '궁극체에 도달하여 전장의 지반 자체를 갈아엎는 천벌 포효를 울립니다.'
            }
        },
        {
            stage: MonsterStage.ULTIMATE,
            minLevel: 750,
            skill: {
                name: '대지 분쇄 연격',
                type: SkillType.PHYSICAL,
                targetType: 'single',
                mpCost: 70,
                powerRatio: 450,
                effectFormula: 'STR*4.5',
                description: '대지의 중력을 실어 단일 적의 뼈와 장기를 강쇄합니다.'
            }
        },
        {
            stage: MonsterStage.SUPER_ULTIMATE,
            minLevel: 1000,
            skill: {
                name: '초궁극 대지 시공 붕괴',
                type: SkillType.MAGIC,
                targetType: 'aoe',
                mpCost: 120,
                powerRatio: 540,
                effectFormula: 'INT*5.2 + DEF*3.5',
                description: '원초의 대지 권능으로 공간의 차원 지반을 무너뜨려 소멸시킵니다.'
            }
        }
    ],
    '광휘계': [
        {
            stage: MonsterStage.BABY,
            minLevel: 1,
            skill: {
                name: '섬광 물어뜯기',
                type: SkillType.MAGIC,
                targetType: 'single',
                mpCost: 5,
                powerRatio: 115,
                effectFormula: 'INT*1.2',
                description: '성스러운 빛을 발하며 적을 거룩하게 물어뜯습니다.'
            }
        },
        {
            stage: MonsterStage.CHILD,
            minLevel: 30,
            skill: {
                name: '빛의 손톱',
                type: SkillType.PHYSICAL,
                targetType: 'single',
                mpCost: 10,
                powerRatio: 130,
                effectFormula: 'STR*1.3 + INT*0.3',
                description: '눈부신 광휘를 머금은 손톱으로 사악함을 베어냅니다.'
            }
        },
        {
            stage: MonsterStage.CHILD,
            minLevel: 45,
            skill: {
                name: '성스러운 빛의 축복',
                type: SkillType.BUFF,
                targetType: 'self',
                mpCost: 15,
                powerRatio: 100,
                effectFormula: 'INT*0.3 + STR*0.2',
                description: '신성한 광채로 전신을 감싸 힘과 신비감을 동시에 높입니다.'
            }
        },
        {
            stage: MonsterStage.ADULT,
            minLevel: 70,
            skill: {
                name: '광휘 세례 브레스',
                type: SkillType.MAGIC,
                targetType: 'aoe',
                mpCost: 35,
                powerRatio: 200,
                effectFormula: 'INT*2.2',
                description: '찬란한 빛의 광선을 분사하여 모든 적에게 성스러운 세례를 줍니다.'
            }
        },
        {
            stage: MonsterStage.ADULT,
            minLevel: 120,
            skill: {
                name: '빛의 기사 돌진',
                type: SkillType.PHYSICAL,
                targetType: 'single',
                mpCost: 25,
                powerRatio: 205,
                effectFormula: 'STR*2.1 + INT*0.4',
                description: '성스러운 광륜을 두르고 일직선으로 단일 적을 관통합니다.'
            }
        },
        {
            stage: MonsterStage.PERFECT,
            minLevel: 200,
            skill: {
                name: '신성 심판 파동',
                type: SkillType.MAGIC,
                targetType: 'aoe',
                mpCost: 50,
                powerRatio: 270,
                effectFormula: 'INT*2.9',
                description: '완전체의 정화 광선을 넓게 뿌려 불순한 대상을 심판합니다.'
            }
        },
        {
            stage: MonsterStage.PERFECT,
            minLevel: 350,
            skill: {
                name: '광휘 결계 방어',
                type: SkillType.PASSIVE,
                targetType: 'self',
                mpCost: 0,
                powerRatio: 100,
                effectFormula: 'DEF*0.25 + INT*0.1',
                description: '자비로운 빛의 막이 적의 악의적인 피해를 경감합니다.'
            }
        },
        {
            stage: MonsterStage.ULTIMATE,
            minLevel: 500,
            skill: {
                name: '천상의 구원 포효',
                type: SkillType.MAGIC,
                targetType: 'aoe',
                mpCost: 80,
                powerRatio: 380,
                effectFormula: 'INT*4.0 + STR*1.5',
                description: '궁극체의 성스러운 울부짖음으로 전장 전체에 찬란한 광휘 단죄를 내립니다.'
            }
        },
        {
            stage: MonsterStage.ULTIMATE,
            minLevel: 750,
            skill: {
                name: '신성 단죄 연격',
                type: SkillType.PHYSICAL,
                targetType: 'single',
                mpCost: 70,
                powerRatio: 410,
                effectFormula: 'STR*4.1 + INT*1.0',
                description: '성검과 같은 광채 손톱으로 대상을 연달아 정화 단죄합니다.'
            }
        },
        {
            stage: MonsterStage.SUPER_ULTIMATE,
            minLevel: 1000,
            skill: {
                name: '초궁극 신성 빛의 시공 정화',
                type: SkillType.MAGIC,
                targetType: 'aoe',
                mpCost: 130,
                powerRatio: 600,
                effectFormula: 'INT*6.5',
                description: '초신성과도 같은 전설의 신성 권능으로 차원의 모든 음영을 완벽히 정화합니다.'
            }
        }
    ],
    '암흑계': [
        {
            stage: MonsterStage.BABY,
            minLevel: 1,
            skill: {
                name: '칠흑 물어뜯기',
                type: SkillType.PHYSICAL,
                targetType: 'single',
                mpCost: 5,
                powerRatio: 115,
                effectFormula: 'STR*1.2',
                description: '검은 안개를 머금고 적을 음산하게 물어뜯습니다.'
            }
        },
        {
            stage: MonsterStage.CHILD,
            minLevel: 30,
            skill: {
                name: '암흑 할퀴기',
                type: SkillType.PHYSICAL,
                targetType: 'single',
                mpCost: 10,
                powerRatio: 135,
                effectFormula: 'STR*1.4',
                description: '어둠의 손톱으로 적의 방어 허점을 그어버립니다.'
            }
        },
        {
            stage: MonsterStage.CHILD,
            minLevel: 45,
            skill: {
                name: '심연의 야성 버프',
                type: SkillType.BUFF,
                targetType: 'self',
                mpCost: 15,
                powerRatio: 100,
                effectFormula: 'STR*0.4',
                description: '심연에서 솟아나는 기운으로 괴력을 극대화시킵니다.'
            }
        },
        {
            stage: MonsterStage.ADULT,
            minLevel: 70,
            skill: {
                name: '멸망의 흑염 브레스',
                type: SkillType.MAGIC,
                targetType: 'aoe',
                mpCost: 35,
                powerRatio: 195,
                effectFormula: 'INT*2.1',
                description: '타오르는 검은 불꽃을 방사하여 적의 생명력을 갉아먹습니다.'
            }
        },
        {
            stage: MonsterStage.ADULT,
            minLevel: 120,
            skill: {
                name: '그림자 침식 돌진',
                type: SkillType.PHYSICAL,
                targetType: 'single',
                mpCost: 25,
                powerRatio: 210,
                effectFormula: 'STR*2.2 + INT*0.3',
                description: '그림자 속으로 사라졌다가 적의 사각에서 강타합니다.'
            }
        },
        {
            stage: MonsterStage.PERFECT,
            minLevel: 200,
            skill: {
                name: '칠흑 마동 파동',
                type: SkillType.MAGIC,
                targetType: 'aoe',
                mpCost: 50,
                powerRatio: 260,
                effectFormula: 'INT*2.8',
                description: '완전체의 어둠 에너지를 해방시켜 전체 전장에 침식을 일으킵니다.'
            }
        },
        {
            stage: MonsterStage.PERFECT,
            minLevel: 350,
            skill: {
                name: '암흑 흡수 방어',
                type: SkillType.PASSIVE,
                targetType: 'self',
                mpCost: 0,
                powerRatio: 100,
                effectFormula: 'DEF*0.2 + INT*0.1',
                description: '적의 공격 에너지를 일부 어둠 속에 흡수하여 방어합니다.'
            }
        },
        {
            stage: MonsterStage.ULTIMATE,
            minLevel: 500,
            skill: {
                name: '심연의 포식 포효',
                type: SkillType.MAGIC,
                targetType: 'aoe',
                mpCost: 80,
                powerRatio: 370,
                effectFormula: 'INT*3.9 + STR*1.6',
                description: '궁극체에 이르러 전장을 기괴한 심연의 어둠으로 뒤덮고 괴멸시킵니다.'
            }
        },
        {
            stage: MonsterStage.ULTIMATE,
            minLevel: 750,
            skill: {
                name: '암령 파괴 연격',
                type: SkillType.PHYSICAL,
                targetType: 'single',
                mpCost: 70,
                powerRatio: 430,
                effectFormula: 'STR*4.4',
                description: '어둠의 집속 에너지로 단일 대상을 짓뭉개버립니다.'
            }
        },
        {
            stage: MonsterStage.SUPER_ULTIMATE,
            minLevel: 1000,
            skill: {
                name: '초궁극 칠흑 차원 분쇄',
                type: SkillType.MAGIC,
                targetType: 'aoe',
                mpCost: 125,
                powerRatio: 580,
                effectFormula: 'INT*6.1 + STR*2.8',
                description: '초궁극의 어둠 블랙홀을 생성하여 시공간과 물질 전체를 소멸시킵니다.'
            }
        }
    ],
    '신체강화계': [
        {
            stage: MonsterStage.BABY,
            minLevel: 1,
            skill: {
                name: '강철 물어뜯기',
                type: SkillType.PHYSICAL,
                targetType: 'single',
                mpCost: 5,
                powerRatio: 120,
                effectFormula: 'STR*1.3',
                description: '강력한 턱 힘으로 적을 파괴적으로 물어뜯습니다.'
            }
        },
        {
            stage: MonsterStage.CHILD,
            minLevel: 30,
            skill: {
                name: '신체 파괴 할퀴기',
                type: SkillType.PHYSICAL,
                targetType: 'single',
                mpCost: 10,
                powerRatio: 140,
                effectFormula: 'STR*1.5',
                description: '단단해진 가죽과 근육으로 엄청난 피해의 할퀴기를 날립니다.'
            }
        },
        {
            stage: MonsterStage.CHILD,
            minLevel: 45,
            skill: {
                name: '육체 한계 돌파',
                type: SkillType.BUFF,
                targetType: 'self',
                mpCost: 15,
                powerRatio: 100,
                effectFormula: 'STR*0.45',
                description: '신체 한계를 순간적으로 개방하여 완력을 극대화합니다.'
            }
        },
        {
            stage: MonsterStage.ADULT,
            minLevel: 70,
            skill: {
                name: '강철 진동 충격파',
                type: SkillType.PHYSICAL,
                targetType: 'aoe',
                mpCost: 30,
                powerRatio: 185,
                effectFormula: 'STR*1.8 + DEF*0.5',
                description: '몸 전체의 근육 진동을 주변에 터뜨려 전방의 적들을 흔듭니다.'
            }
        },
        {
            stage: MonsterStage.ADULT,
            minLevel: 120,
            skill: {
                name: '초인적 질주 돌진',
                type: SkillType.PHYSICAL,
                targetType: 'single',
                mpCost: 25,
                powerRatio: 230,
                effectFormula: 'STR*2.5',
                description: '압도적인 육체 출력으로 음속 돌진을 가합니다.'
            }
        },
        {
            stage: MonsterStage.PERFECT,
            minLevel: 200,
            skill: {
                name: '육체 파괴 파동',
                type: SkillType.PHYSICAL,
                targetType: 'aoe',
                mpCost: 50,
                powerRatio: 260,
                effectFormula: 'STR*2.8',
                description: '완전체의 피지컬 권능으로 거대한 공기 대파동을 일으킵니다.'
            }
        },
        {
            stage: MonsterStage.PERFECT,
            minLevel: 350,
            skill: {
                name: '금강불괴 감각',
                type: SkillType.PASSIVE,
                targetType: 'self',
                mpCost: 0,
                powerRatio: 100,
                effectFormula: 'DEF*0.3',
                description: '단단하게 밀집된 신체 조직이 충격을 자연스럽게 상쇄합니다.'
            }
        },
        {
            stage: MonsterStage.ULTIMATE,
            minLevel: 500,
            skill: {
                name: '원시 신체 격노 포효',
                type: SkillType.PHYSICAL,
                targetType: 'aoe',
                mpCost: 80,
                powerRatio: 360,
                effectFormula: 'STR*3.8 + DEF*1.5',
                description: '궁극의 완력으로 전장을 진동시켜 적들의 육체를 무너뜨립니다.'
            }
        },
        {
            stage: MonsterStage.ULTIMATE,
            minLevel: 750,
            skill: {
                name: '초인 권능 분쇄',
                type: SkillType.PHYSICAL,
                targetType: 'single',
                mpCost: 70,
                powerRatio: 470,
                effectFormula: 'STR*4.8',
                description: '신체 정점의 완력으로 단일 적의 형체를 없애버립니다.'
            }
        },
        {
            stage: MonsterStage.SUPER_ULTIMATE,
            minLevel: 1000,
            skill: {
                name: '초궁극 정점 육체 공간 파쇄',
                type: SkillType.PHYSICAL,
                targetType: 'aoe',
                mpCost: 120,
                powerRatio: 600,
                effectFormula: 'STR*6.5',
                description: '육체 완성체의 주먹으로 공기를 찢고 공간 차원을 물리적으로 파쇄합니다.'
            }
        }
    ],
    'default': [
        {
            stage: MonsterStage.BABY,
            minLevel: 1,
            skill: {
                name: '위협적인 물어뜯기',
                type: SkillType.PHYSICAL,
                targetType: 'single',
                mpCost: 5,
                powerRatio: 110,
                effectFormula: 'STR*1.2',
                description: '야생 본능으로 적을 거세게 물어뜯습니다.'
            }
        },
        {
            stage: MonsterStage.CHILD,
            minLevel: 30,
            skill: {
                name: '야수의 할퀴기',
                type: SkillType.PHYSICAL,
                targetType: 'single',
                mpCost: 10,
                powerRatio: 130,
                effectFormula: 'STR*1.4',
                description: '날카로운 손톱으로 적을 할퀴어 피해를 줍니다.'
            }
        },
        {
            stage: MonsterStage.CHILD,
            minLevel: 45,
            skill: {
                name: '야생의 포효',
                type: SkillType.BUFF,
                targetType: 'self',
                mpCost: 15,
                powerRatio: 100,
                effectFormula: 'STR*0.3',
                description: '자신의 야성을 깨워 공격력을 상승시킵니다.'
            }
        },
        {
            stage: MonsterStage.ADULT,
            minLevel: 70,
            skill: {
                name: '맹렬한 화염 브레스',
                type: SkillType.MAGIC,
                targetType: 'aoe',
                mpCost: 30,
                powerRatio: 180,
                effectFormula: 'INT*1.8',
                description: '성숙기에 도달하여 전방으로 맹렬한 브레스를 내뿜습니다.'
            }
        },
        {
            stage: MonsterStage.ADULT,
            minLevel: 120,
            skill: {
                name: '강철의 돌진',
                type: SkillType.PHYSICAL,
                targetType: 'single',
                mpCost: 25,
                powerRatio: 200,
                effectFormula: 'STR*2.0',
                description: '단단해진 체구로 적에게 강하게 돌진합니다.'
            }
        },
        {
            stage: MonsterStage.PERFECT,
            minLevel: 200,
            skill: {
                name: '마도 파괴 파동',
                type: SkillType.MAGIC,
                targetType: 'aoe',
                mpCost: 50,
                powerRatio: 250,
                effectFormula: 'INT*2.5',
                description: '완전체의 힘으로 주변 모든 적에게 강한 파동을 방출합니다.'
            }
        },
        {
            stage: MonsterStage.PERFECT,
            minLevel: 350,
            skill: {
                name: '초감각 본능 방어',
                type: SkillType.PASSIVE,
                targetType: 'self',
                mpCost: 0,
                powerRatio: 100,
                effectFormula: 'DEF*0.2',
                description: '완전체의 직감으로 피해를 감쇄합니다.'
            }
        },
        {
            stage: MonsterStage.ULTIMATE,
            minLevel: 500,
            skill: {
                name: '신성한 심판의 포효',
                type: SkillType.MAGIC,
                targetType: 'aoe',
                mpCost: 80,
                powerRatio: 350,
                effectFormula: 'INT*3.5 + STR*1.5',
                description: '궁극체에 도달하여 가공할 에너지를 전체에 방출합니다.'
            }
        },
        {
            stage: MonsterStage.ULTIMATE,
            minLevel: 750,
            skill: {
                name: '원시의 격노',
                type: SkillType.PHYSICAL,
                targetType: 'single',
                mpCost: 70,
                powerRatio: 400,
                effectFormula: 'STR*4.0',
                description: '궁극의 야성으로 단일 적에게 파괴적인 연속 공격을 퍼붓습니다.'
            }
        },
        {
            stage: MonsterStage.SUPER_ULTIMATE,
            minLevel: 1000,
            skill: {
                name: '초궁극 시공간 분쇄',
                type: SkillType.MAGIC,
                targetType: 'aoe',
                mpCost: 120,
                powerRatio: 550,
                effectFormula: 'INT*5.5 + STR*3.0',
                description: '초궁극체의 전설적인 영역에 도달하여 공간 자체를 분쇄합니다.'
            }
        }
    ]
};

// 몬스터의 현재 레벨/단계 및 신력 계통에 맞는 스킬을 자동으로 검사하고 등급(단계)별 1개씩 습득시키는 함수
export const checkAndApplyMonsterAutoSkills = (companion: Companion): { updatedCompanion: Companion, newlyLearned: string[] } => {
    if (!companion.isMonster && companion.race !== '몬스터' && !companion.monsterData) {
        return { updatedCompanion: companion, newlyLearned: [] };
    }

    const updated = JSON.parse(JSON.stringify(companion)) as Companion;
    if (!updated.skills) updated.skills = [];

    const newlyLearned: string[] = [];
    const shinryokuCat = getShinryokuSkillCategory(updated.shinryokuType);
    const skillDefs = MONSTER_STAGE_SKILLS[shinryokuCat] || MONSTER_STAGE_SKILLS.default;

    // 단계별 그룹화
    const stageGroups: Record<string, MonsterStageSkillDef[]> = {};
    skillDefs.forEach(def => {
        if (!stageGroups[def.stage]) stageGroups[def.stage] = [];
        stageGroups[def.stage].push(def);
    });

    Object.entries(stageGroups).forEach(([stage, defs]) => {
        // 이미 이 단계의 스킬을 보유하고 있는지 확인
        const existingSkillInStage = updated.skills.find(s => defs.some(d => d.skill.name === s.name));
        if (!existingSkillInStage) {
            // 아직 해당 등급의 스킬이 없으면 레벨 조건을 만족하는 스킬 중 가장 높은 것 1개 선택 습득
            const unlockedDefs = (defs || []).filter(d => d && updated.level >= d.minLevel);
            if (unlockedDefs.length > 0) {
                // 가장 높은 minLevel의 스킬 선택
                const chosen = unlockedDefs.sort((a, b) => b.minLevel - a.minLevel)[0];
                const newSkill: Skill = {
                    name: chosen.skill.name,
                    type: chosen.skill.type,
                    targetType: chosen.skill.targetType,
                    level: 1,
                    maxLevel: 10,
                    mpCost: chosen.skill.mpCost,
                    powerRatio: chosen.skill.powerRatio,
                    effectFormula: chosen.skill.effectFormula,
                    description: chosen.skill.description,
                    icon: 'Zap',
                    tier: stage as any,
                    currentMastery: 0
                };
                updated.skills.push(newSkill);
                newlyLearned.push(`${chosen.skill.name} (${stage})`);
            }
        }
    });

    return { updatedCompanion: updated, newlyLearned };
};

// 특정 등급(단계)의 스킬을 선택 습득(교체)하는 함수 (등급별 1개 제한 엄수)
export const learnMonsterSkillForStage = (
    companion: Companion, 
    targetDef: MonsterStageSkillDef
): { updatedCompanion: Companion, replacedSkillName?: string } => {
    const updated = JSON.parse(JSON.stringify(companion)) as Companion;
    if (!updated.skills) updated.skills = [];

    const shinryokuCat = getShinryokuSkillCategory(updated.shinryokuType);
    const skillDefs = MONSTER_STAGE_SKILLS[shinryokuCat] || MONSTER_STAGE_SKILLS.default;
    
    // 동일 단계의 모든 스킬 이름 수집
    const sameStageSkillNames = new Set(
        (skillDefs || []).filter(d => d && d.stage === targetDef.stage).map(d => d.skill.name)
    );

    // 기존에 보유 중인 동일 등급 스킬 확인 및 제거
    let replacedSkillName: string | undefined = undefined;
    const filteredSkills = (updated.skills || []).filter(s => {
        if (sameStageSkillNames.has(s.name)) {
            replacedSkillName = s.name;
            return false;
        }
        return true;
    });

    // 신규 스킬 추가
    const newSkill: Skill = {
        name: targetDef.skill.name,
        type: targetDef.skill.type,
        targetType: targetDef.skill.targetType,
        level: 1,
        maxLevel: 10,
        mpCost: targetDef.skill.mpCost,
        powerRatio: targetDef.skill.powerRatio,
        effectFormula: targetDef.skill.effectFormula,
        description: targetDef.skill.description,
        icon: 'Zap',
        tier: targetDef.stage as any,
        currentMastery: 0
    };

    filteredSkills.push(newSkill);
    updated.skills = filteredSkills;

    return { updatedCompanion: updated, replacedSkillName };
};

export interface BreederAutoCareResult {
    updatedCharacter: Character;
    logs: string[];
    foodConsumed: number;
}

/**
 * 사육사 전담배치 시 자동 먹이주기 및 자동 청결관리 시뮬레이션
 */
export const processBreederAutoCare = (character: Character): BreederAutoCareResult => {
    const char = JSON.parse(JSON.stringify(character)) as Character;
    const logs: string[] = [];
    let foodConsumed = 0;

    if (!char.base || !Array.isArray(char.base.capturedMonsters) || char.base.capturedMonsters.length === 0) {
        return { updatedCharacter: char, logs, foodConsumed };
    }

    const monsterFarmInstances = (char.base.layout || []).filter(inst => inst && (inst.type === 'monster_farm' || inst.type === 'monster_ranch'));
    const assignedBreederIds = new Set<string>();
    
    monsterFarmInstances.forEach(inst => {
        const ids = char.base?.multiAssignments?.[inst.id] || (char.base?.assignments?.[inst.id] ? [char.base.assignments[inst.id]] : []);
        ids.forEach(id => { if (id) assignedBreederIds.add(id); });
    });

    const allComps: Companion[] = [...(char.companions || []), ...(char.inactiveCompanions || [])];
    if ((char as any).id) {
        allComps.push(char as any);
    }
    const activeBreeders = allComps.filter(c => c && assignedBreederIds.has(c.id) && (c.job === JobType.BREEDER || (c.job as string) === '사육사'));

    const monsters = Array.isArray(char.base.capturedMonsters) ? char.base.capturedMonsters : [];
    const hatchlings = monsters.filter(m => m && m.stage !== MonsterStage.EGG && (m.stage as string) !== '알');
    const eggs = monsters.filter(m => m && (m.stage === MonsterStage.EGG || (m.stage as string) === '알'));

    // [부화 준비 알림] 부화 예정일에 도달하여 부화 준비가 완료된 알 서신함 알림
    if (eggs.length > 0 && char.currentDate) {
        const readyEggs = eggs.filter(egg => egg && egg.hatchDueDate && char.currentDate! >= egg.hatchDueDate);
        if (readyEggs.length > 0) {
            const eggNames = readyEggs.map(e => e.name).join(', ');
            logs.push(`[서신] 몬스터 부화실의 알(${eggNames})이 부화할 준비를 마쳤습니다! 몬스터 사육소 부화실에서 새 생명을 맞이하세요.`);
        }
    }

    const hasDedicatedTraining = hatchlings.some(m => m.assignedBreederId && m.dedicatedTrainingStat);

    if ((activeBreeders.length > 0 || hasDedicatedTraining) && hatchlings.length > 0) {
        // 전담 사육사가 상주하는 경우 -> 자동 먹이주기 및 자동 청결관리 진행
        let fedCount = 0;
        let starvedCount = 0;
        let leveledUpCount = 0;

        hatchlings.forEach(m => {
            // 1. 자동 청결 관리 (사육사의 전담 관리로 100% 청결 유지)
            m.cleanliness = 100;
            m.affection = Math.min(100, (m.affection || 0) + 1);

            // 2. 자동 먹이 급여 (기지 식량 소모 및 포만감 100% 유지)
            if ((char.base!.resources.food || 0) >= 1) {
                char.base!.resources.food -= 1;
                foodConsumed += 1;
                m.hunger = 100;
                m.affection = Math.min(100, (m.affection || 0) + 1);
                
                // 일일 사육 경험치 획득 및 레벨업 판정
                m.currentExp = (m.currentExp || 0) + 30;
                if (!m.maxExp) m.maxExp = (m.level || 1) * 100;
                while ((m.currentExp || 0) >= (m.maxExp || 100)) {
                    m.currentExp = (m.currentExp || 0) - (m.maxExp || 100);
                    m.level = (m.level || 1) + 1;
                    m.maxExp = Math.floor(m.maxExp * 1.2);
                    m.statPoints = (m.statPoints || 0) + getStatPointsPerLevel({ ...m, level: m.level || 1 });
                    leveledUpCount++;

                    const currentMaxHp = m.stats?.maxHp || m.maxHp || 100;
                    const currentMaxMp = m.stats?.maxMp || 50;
                    const hpGain = 10 + Math.floor((m.stats?.str || 1) * 2);
                    const mpGain = 5 + Math.floor((m.stats?.int || 1) * 1.5);
                    const newMaxHp = currentMaxHp + hpGain;
                    const newMaxMp = currentMaxMp + mpGain;

                    m.maxHp = newMaxHp;
                    m.hp = newMaxHp;
                    if (m.stats) {
                        m.stats = {
                            ...m.stats,
                            maxHp: newMaxHp,
                            hp: newMaxHp,
                            maxMp: newMaxMp,
                            mp: newMaxMp
                        };
                    }
                }
                fedCount++;
            } else {
                // 식량 부족 시 배고픔 감소
                m.hunger = Math.max(0, (m.hunger || 0) - 5);
                if (m.hunger === 0 && Math.random() < 0.1) {
                    m.affection = Math.max(0, m.affection - 1);
                }
                starvedCount++;
            }
        });

        // 사육사 경험치 부여 및 직급 성장
        const expGained = Math.max(10, Math.floor((fedCount * 6 + hatchlings.length * 4) / Math.max(1, activeBreeders.length)));
        
        // 3. [NEW] 사육사 전담 몬스터 1:1 집중 훈련 진행
        const dedicatedTrainedLogs: string[] = [];
        hatchlings.forEach(m => {
            if (m.assignedBreederId && m.dedicatedTrainingStat) {
                const assignedBreeder = activeBreeders.find(b => b.id === m.assignedBreederId) || allComps.find(c => c && c.id === m.assignedBreederId);
                if (assignedBreeder) {
                    const breederComp = (char.inactiveCompanions?.find(c => c.id === assignedBreeder.id)) || (char.companions?.find(c => c.id === assignedBreeder.id)) || ((char as any).id === assignedBreeder.id ? (char as any) : undefined);
                    const breederLevel = breederComp?.professions?.breeding?.level || 1;
                    
                    // 랭크별 성장 계수 (C/B/A: 1, S: 2, SS: 3, SSS: 5)
                    let rankMultiplier = 1;
                    if (m.rank === 'SSS') rankMultiplier = 5;
                    else if (m.rank === 'SS') rankMultiplier = 3;
                    else if (m.rank === 'S') rankMultiplier = 2;

                    // 기본 성장량 (사육사 레벨에 비례)
                    const baseGain = Math.max(1, Math.floor(1 + (breederLevel * 0.08))) * rankMultiplier;
                    const statKey = m.dedicatedTrainingStat as keyof Stats;
                    const gain = (statKey === 'hp' || statKey === 'mp') ? baseGain * 10 : baseGain;

                    if (!m.stats) {
                        m.stats = { hp: 100, maxHp: 100, mp: 50, maxMp: 50, str: 10, int: 10, wis: 10, def: 10, agi: 10, ctrl: 10 };
                    }
                    (m.stats as any)[statKey] = ((m.stats as any)[statKey] || 0) + gain;
                    if (statKey === 'hp') {
                        m.maxHp = (m.maxHp || 100) + gain;
                        m.hp = (m.hp || 100) + gain;
                        m.stats.maxHp = (m.stats.maxHp || 100) + gain;
                        m.stats.hp = (m.stats.hp || 100) + gain;
                    }
                    if (statKey === 'mp') {
                        m.stats.maxMp = (m.stats.maxMp || 50) + gain;
                        m.stats.mp = (m.stats.mp || 50) + gain;
                    }

                    // 전담 훈련으로 인한 몬스터 경험치 및 친밀도 상승
                    m.currentExp = (m.currentExp || 0) + 40;
                    m.affection = Math.min(100, (m.affection || 0) + 2);
                    if (!m.maxExp) m.maxExp = (m.level || 1) * 100;
                    const oldMonsterLevel = m.level || 1;
                    while ((m.currentExp || 0) >= (m.maxExp || 100)) {
                        m.currentExp = (m.currentExp || 0) - (m.maxExp || 100);
                        m.level = (m.level || 1) + 1;
                        m.maxExp = Math.floor(m.maxExp * 1.2);
                        m.statPoints = (m.statPoints || 0) + getStatPointsPerLevel({ ...m, level: m.level || 1 });
                        leveledUpCount++;
                    }

                    // 전담 사육사 추가 경험치 부여
                    if (breederComp) {
                        if (!breederComp.professions) breederComp.professions = {};
                        if (!breederComp.professions.breeding) breederComp.professions.breeding = { level: 1, exp: 0, maxExp: 100 };
                        breederComp.professions.breeding.exp += 20;
                    }

                    const statKoreanMap: Record<string, string> = {
                        str: '공격력(STR)',
                        def: '방어력(DEF)',
                        int: '지능(INT)',
                        agi: '민첩(AGI)',
                        wis: '지혜(WIS)',
                        ctrl: '통제력(CTRL)',
                        hp: '최대 체력(HP)',
                        mp: '최대 마나(MP)'
                    };
                    const statNameKr = statKoreanMap[statKey as string] || String(statKey).toUpperCase();
                    const monsterDisplayName = m.nickname ? `${m.nickname}(${m.name})` : m.name;
                    const curStatVal = (m.stats as any)[statKey] || 0;
                    dedicatedTrainedLogs.push(`${assignedBreeder.name} ➔ ${monsterDisplayName} (${statNameKr} +${gain})`);

                    // [서신 발송] 몬스터 전담 사육사 자동특훈 일일 성장 보고 서신 생성
                    if (!char.messages) char.messages = [];
                    const mailId = `monster_auto_train_mail_${m.id}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
                    const levelUpMsg = (m.level || 1) > oldMonsterLevel
                        ? `\n🌟 [경사] 특훈의 결실로 ${monsterDisplayName}이(가) Lv.${m.level}(으)로 레벨업했습니다!`
                        : '';

                    const mailContent = `[사육사 서신] 🐾 전담 몬스터 '${monsterDisplayName}' 자동특훈 성장 일일 보고서\n\n` +
                        `가문주님, 안녕하십니까. 마수 사육소의 담당 사육사 [${assignedBreeder.name}]입니다.\n\n` +
                        `오늘 하루 동안 가문주님께서 지정해주신 전담 마수 '${monsterDisplayName}'에게 맞춤형 1:1 자동특훈을 집중 지도하여 성공적으로 성장을 이루어냈습니다.\n\n` +
                        `━━━━━━━━━━━━━━━━━━━━━━\n` +
                        `📋 [특훈 및 성장 정산 내역]\n` +
                        `• 전담 마수: ${monsterDisplayName} (Lv.${m.level}, ${m.rank || 'NORMAL'}급)\n` +
                        `• 담당 사육사: ${assignedBreeder.name} (사육 숙련도 Lv.${breederLevel})\n` +
                        `• 지정 성장 능력치: ${statNameKr}\n` +
                        `• 특훈 성장치: +${gain} (현재 총합: ${curStatVal})\n` +
                        `• 유대감(친밀도): +2 (현재 유대: ${m.affection || 0}/100)\n` +
                        `• 마수 획득 경험치: +40 EXP${levelUpMsg}\n` +
                        `━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                        `사육사의 각별한 관심과 특별 지도로 마수가 순조롭게 강력해지고 있습니다! 앞으로도 믿고 맡겨주십시오.`;

                    char.messages.push({
                        id: mailId,
                        role: 'ai',
                        text: mailContent,
                        timestamp: Date.now()
                    });

                    logs.push(`[사육사 특훈] ${monsterDisplayName} (${assignedBreeder.name} 지도) | ${statNameKr} +${gain}, 유대감 +2, EXP +40${levelUpMsg ? ' (레벨업!)' : ''}`);
                }
            }
        });

        activeBreeders.forEach(breeder => {
            const targetComp = (char.inactiveCompanions?.find(c => c.id === breeder.id)) || (char.companions?.find(c => c.id === breeder.id));
            if (targetComp) {
                if (!targetComp.professions) targetComp.professions = {};
                if (!targetComp.professions.breeding) targetComp.professions.breeding = { level: 1, exp: 0, maxExp: 100 };

                const mastery = targetComp.professions.breeding;
                const oldLevel = mastery.level;
                mastery.exp += expGained;

                while (mastery.exp >= mastery.maxExp) {
                    mastery.exp -= mastery.maxExp;
                    mastery.level += 1;
                    mastery.maxExp = Math.floor(mastery.maxExp * 1.2);
                }

                if (mastery.level > oldLevel) {
                    let jobTitle = "견습 사육사";
                    if (mastery.level >= 100) jobTitle = '전설 사육사';
                    else if (mastery.level >= 80) jobTitle = '명인 사육사';
                    else if (mastery.level >= 50) jobTitle = '장인 사육사';
                    else if (mastery.level >= 20) jobTitle = '숙련 사육사';
                    else if (mastery.level >= 10) jobTitle = '일반 사육사';

                    const baseClass = targetComp.finalClassName || targetComp.lastClassName || targetComp.secondClassName || targetComp.firstClassName;
                    targetComp.classType = (baseClass && baseClass !== '미정') ? `${jobTitle} (${baseClass})` : jobTitle;
                    logs.push(`[사육] ${targetComp.name}의 사육 숙련도가 상승했습니다! (Lv.${mastery.level}, ${jobTitle})`);
                }
            }
        });

        const breederNames = activeBreeders.map(b => b.name).join(', ');
        if (fedCount > 0) {
            let logText = `[몬스터 목장] 전담 사육사(${breederNames})가 몬스터 ${fedCount}마리에게 먹이를 지급하고 우리를 청결하게 관리했습니다. (식량 -${foodConsumed})`;
            if (leveledUpCount > 0) {
                logText += ` 🌟 (${leveledUpCount}마리 성장 레벨업)`;
            }
            logs.push(logText);
        }
        if (starvedCount > 0) {
            logs.push(`[몬스터 목장] 기지 식량이 부족하여 사육사가 ${starvedCount}마리의 몬스터에게 먹이를 주지 못했습니다.`);
        }
        if (dedicatedTrainedLogs.length > 0) {
            logs.push(`[전담 훈련] 사육사 1:1 전담 지도로 몬스터 능력치가 성장했습니다: ${dedicatedTrainedLogs.join(', ')}`);
        }
    } else {
        // 사육사가 배치되지 않은 경우 -> 자연 감소
        hatchlings.forEach(m => {
            m.hunger = Math.max(0, (m.hunger || 0) - 5);
            if (m.hunger === 0 && Math.random() < 0.1) {
                m.affection = Math.max(0, m.affection - 1);
            }
            m.cleanliness = Math.max(0, (m.cleanliness || 0) - 3);
        });
    }

    return { updatedCharacter: char, logs, foodConsumed };
};
