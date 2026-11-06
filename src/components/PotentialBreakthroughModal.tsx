import React, { useState } from 'react';
import { Character, Companion, ClassTier, Enemy, Skill, SkillType } from '../types';
import { getCompanionCP, getCompanionPureCP, checkAndInitializeLiberationEligibility, isMonsterCompanion } from '../services/companionGrowthService';
import { X, Sparkles, Info, Shield, Zap, Sword, Flame, Lock, CheckCircle, AlertCircle, User, Users, ChevronRight, Award, Crosshair, ArrowUpCircle, Layers, Coins, Gem, Leaf, Mountain, Pickaxe } from 'lucide-react';

interface Props {
    character: Character;
    facilityLevel?: number;
    isOpen?: boolean;
    onClose: () => void;
    onUpdateCharacter: (newChar: Character, logMsg?: string) => void;
    onBattle?: (enemy: Enemy | Enemy[], type?: string, source?: string, targetCity?: string, targetNation?: string) => void;
    initialTab?: 'companion' | 'companion_limit' | 'player' | 'final_trial';
    isHallOfTrials?: boolean;
}

export interface TrialMessengerInfo {
    bossKey: string;
    messengerName: string;
    shinryokuType: string;
    title: string;
    description: string;
    visualUrl: string;
    skills: Skill[];
}

export const getTrialMessengerForShinryoku = (shinryokuType?: string): TrialMessengerInfo => {
    const rawType = (shinryokuType || '').trim();

    // 1. 태양계
    if (rawType.includes('태양')) {
        return {
            bossKey: '엘클',
            messengerName: '[신의 사자 모형] 태양의 사자 엘클',
            shinryokuType: '태양계',
            title: '태양의 사자 엘클',
            description: '태초의 태양의 사자인 엘클의 영압을 마법공학 모형으로 재현한 궁극의 훈련체. 필살의 태양의 창과 전장 소각 기술을 뿜어냅니다.',
            visualUrl: 'https://i.ibb.co/wZ8ggrkw/Kakao-Talk-20251226-123147637.png',
            skills: [
                {
                    id: 'trial_skill_sun_spear',
                    name: '태양의 창 [모형 투영]',
                    description: '공간을 가르는 태양의 창격을 내리꽂습니다.',
                    tier: ClassTier.FINAL,
                    type: SkillType.PHYSICAL,
                    mpCost: 300,
                    level: 1,
                    maxLevel: 1,
                    currentMastery: 0,
                    powerRatio: 180,
                    targetType: 'single',
                    effectFormula: 'STR*6.0'
                },
                {
                    id: 'trial_skill_final_sun',
                    name: '파이널 선 [모형 투영]',
                    description: '태양의 화염을 지면에 폭발시켜 전장에 막대한 피해를 줍니다.',
                    tier: ClassTier.FINAL,
                    type: SkillType.PHYSICAL,
                    mpCost: 600,
                    level: 1,
                    maxLevel: 1,
                    currentMastery: 0,
                    powerRatio: 240,
                    targetType: 'aoe',
                    effectFormula: 'STR*10.0'
                }
            ]
        };
    }

    // 2. 전격계
    if (rawType.includes('전격')) {
        return {
            bossKey: '권율',
            messengerName: '[신의 사자 모형] 전격의 사자 권율',
            shinryokuType: '전격계',
            title: '전격의 사자 권율',
            description: '하늘의 분노인 벼락과 뇌전을 지배하는 전격의 사자 권율의 영압을 재현한 시련 모형. 방어를 꿰뚫는 심판의 벼락을 투영합니다.',
            visualUrl: 'https://i.ibb.co/CK6LdFYh/Kakao-Talk-20251228-162955581-05.png',
            skills: [
                {
                    id: 'trial_skill_thunder_spear',
                    name: '뇌신의 벼락 [모형 투영]',
                    description: '초고압의 번개를 적의 심장에 내리꽂아 감전과 충격을 안깁니다.',
                    tier: ClassTier.FINAL,
                    type: SkillType.MAGIC,
                    mpCost: 320,
                    level: 1,
                    maxLevel: 1,
                    currentMastery: 0,
                    powerRatio: 190,
                    targetType: 'single',
                    effectFormula: 'INT*6.5'
                },
                {
                    id: 'trial_skill_lightning_storm',
                    name: '천둥의 심판 [모형 투영]',
                    description: '전장에 무수한 벼락 폭풍을 일으켜 모든 적을 감전 소멸시킵니다.',
                    tier: ClassTier.FINAL,
                    type: SkillType.MAGIC,
                    mpCost: 650,
                    level: 1,
                    maxLevel: 1,
                    currentMastery: 0,
                    powerRatio: 250,
                    targetType: 'aoe',
                    effectFormula: 'INT*10.5'
                }
            ]
        };
    }

    // 3. 무기강화계 or 신체강화계
    if (rawType.includes('무기강화') || rawType.includes('신체강화') || rawType.includes('무')) {
        return {
            bossKey: '홍길동',
            messengerName: '[신의 사자 모형] 무의 사자 홍길동',
            shinryokuType: rawType.includes('신체강화') ? '신체강화계' : '무기강화계',
            title: '무의 사자 홍길동',
            description: '형체도 기척도 없는 무(無)의 경지에 도달하여 차원을 가르는 무의 사자 홍길동의 영압을 마법공학으로 재현한 궁극의 모형입니다.',
            visualUrl: 'https://i.ibb.co/pjtyRpxb/Gemini-Generated-Image-ap3z5sap3z5sap3z.png',
            skills: [
                {
                    id: 'trial_skill_void_blade',
                    name: '무형의 참격 [모형 투영]',
                    description: '모습을 감춘 채 보이지 않는 검기로 적의 급소를 베어냅니다.',
                    tier: ClassTier.FINAL,
                    type: SkillType.PHYSICAL,
                    mpCost: 280,
                    level: 1,
                    maxLevel: 1,
                    currentMastery: 0,
                    powerRatio: 185,
                    targetType: 'single',
                    effectFormula: 'STR*6.2 + AGI*2.0'
                },
                {
                    id: 'trial_skill_wind_step_slash',
                    name: '활빈 쾌도난마 [모형 투영]',
                    description: '축지법으로 전장을 종횡무진 누비며 전방위 쾌속 난무를 퍼붓습니다.',
                    tier: ClassTier.FINAL,
                    type: SkillType.PHYSICAL,
                    mpCost: 580,
                    level: 1,
                    maxLevel: 1,
                    currentMastery: 0,
                    powerRatio: 245,
                    targetType: 'aoe',
                    effectFormula: 'STR*9.5 + AGI*3.0'
                }
            ]
        };
    }

    // 4. 화염계
    if (rawType.includes('화염')) {
        return {
            bossKey: '라페르난데스',
            messengerName: '[신의 사자 모형] 화염의 사자 라페르난데스',
            shinryokuType: '화염계',
            title: '화염의 사자 라페르난데스',
            description: '만물을 정화하는 시련의 성화를 다스리는 화염의 사자 라페르난데스의 훈련 모형입니다.',
            visualUrl: 'https://i.ibb.co/HTMMXRHW/Kakao-Talk-20251228-164732633.png',
            skills: [
                {
                    id: 'trial_skill_fire_blade',
                    name: '연옥의 화염검 [모형 투영]',
                    description: '극열의 불꽃을 검신에 둘러 내리칩니다.',
                    tier: ClassTier.FINAL,
                    type: SkillType.PHYSICAL,
                    mpCost: 300,
                    level: 1,
                    maxLevel: 1,
                    currentMastery: 0,
                    powerRatio: 180,
                    targetType: 'single',
                    effectFormula: 'STR*6.0'
                },
                {
                    id: 'trial_skill_inferno_burst',
                    name: '성화 폭멸 [모형 투영]',
                    description: '지옥의 업화를 전장에 일제히 폭발시킵니다.',
                    tier: ClassTier.FINAL,
                    type: SkillType.MAGIC,
                    mpCost: 600,
                    level: 1,
                    maxLevel: 1,
                    currentMastery: 0,
                    powerRatio: 240,
                    targetType: 'aoe',
                    effectFormula: 'INT*10.0'
                }
            ]
        };
    }

    // 5. 광휘계
    if (rawType.includes('광휘')) {
        return {
            bossKey: '줄리엣',
            messengerName: '[신의 사자 모형] 광휘의 사자 줄리엣',
            shinryokuType: '광휘계',
            title: '광휘의 사자 줄리엣',
            description: '가장 순결한 빛으로 어둠을 지우고 성역을 수호하는 광휘의 사자 줄리엣의 훈련 모형입니다.',
            visualUrl: 'https://i.ibb.co/SX7sx77s/Kakao-Talk-20251228-162955581.png',
            skills: [
                {
                    id: 'trial_skill_radiant_spear',
                    name: '샤이닝 엔젤 스피어 [모형 투영]',
                    description: '빛의 창으로 어둠을 꿰뚫어 치명적인 정화를 가합니다.',
                    tier: ClassTier.FINAL,
                    type: SkillType.MAGIC,
                    mpCost: 310,
                    level: 1,
                    maxLevel: 1,
                    currentMastery: 0,
                    powerRatio: 185,
                    targetType: 'single',
                    effectFormula: 'INT*6.2'
                },
                {
                    id: 'trial_skill_holy_sanctuary',
                    name: '성역의 세례 [모형 투영]',
                    description: '하늘에서 쏟아지는 찬란한 빛의 심판으로 전장을 정화합니다.',
                    tier: ClassTier.FINAL,
                    type: SkillType.MAGIC,
                    mpCost: 620,
                    level: 1,
                    maxLevel: 1,
                    currentMastery: 0,
                    powerRatio: 245,
                    targetType: 'aoe',
                    effectFormula: 'INT*10.2'
                }
            ]
        };
    }

    // 6. 월광계
    if (rawType.includes('월광')) {
        return {
            bossKey: '최원한',
            messengerName: '[신의 사자 모형] 월광의 사자 최원한',
            shinryokuType: '월광계',
            title: '월광의 사자 최원한',
            description: '은은한 달빛 아래 기척을 지우고 세상을 관조하는 월광의 사자 최원한의 훈련 모형입니다.',
            visualUrl: 'https://i.ibb.co/1GFBXBnz/Kakao-Talk-20251228-162955581-04.png',
            skills: [
                {
                    id: 'trial_skill_moon_slash',
                    name: '월식의 참격 [모형 투영]',
                    description: '달빛을 가르는 날카로운 쌍도 검기로 적을 급습합니다.',
                    tier: ClassTier.FINAL,
                    type: SkillType.PHYSICAL,
                    mpCost: 290,
                    level: 1,
                    maxLevel: 1,
                    currentMastery: 0,
                    powerRatio: 180,
                    targetType: 'single',
                    effectFormula: 'STR*6.0'
                },
                {
                    id: 'trial_skill_fullmoon_dance',
                    name: '만월의 난무 [모형 투영]',
                    description: '보름달빛을 흩뿌리며 전방위를 회전 베기합니다.',
                    tier: ClassTier.FINAL,
                    type: SkillType.PHYSICAL,
                    mpCost: 590,
                    level: 1,
                    maxLevel: 1,
                    currentMastery: 0,
                    powerRatio: 240,
                    targetType: 'aoe',
                    effectFormula: 'STR*10.0'
                }
            ]
        };
    }

    // 7. 대지계
    if (rawType.includes('대지')) {
        return {
            bossKey: '원지원',
            messengerName: '[신의 사자 모형] 지령의 사자 원지원',
            shinryokuType: '대지계',
            title: '지령의 사자 원지원',
            description: '대륙의 고동과 암석의 무게를 다스리는 결코 무너지지 않는 요새, 지령의 사자 원지원의 훈련체입니다.',
            visualUrl: 'https://i.ibb.co/hF8pj5N6/Kakao-Talk-20251228-162955581-03.png',
            skills: [
                {
                    id: 'trial_skill_earth_crush',
                    name: '대륙 파쇄격 [모형 투영]',
                    description: '대지의 무게를 실은 대검으로 지면을 파괴합니다.',
                    tier: ClassTier.FINAL,
                    type: SkillType.PHYSICAL,
                    mpCost: 320,
                    level: 1,
                    maxLevel: 1,
                    currentMastery: 0,
                    powerRatio: 190,
                    targetType: 'single',
                    effectFormula: 'STR*6.5'
                },
                {
                    id: 'trial_skill_gaia_quake',
                    name: '가이아의 지진 [모형 투영]',
                    description: '전장을 격렬히 뒤흔들어 적 전체를 압살합니다.',
                    tier: ClassTier.FINAL,
                    type: SkillType.PHYSICAL,
                    mpCost: 640,
                    level: 1,
                    maxLevel: 1,
                    currentMastery: 0,
                    powerRatio: 245,
                    targetType: 'aoe',
                    effectFormula: 'STR*10.2'
                }
            ]
        };
    }

    // 8. 질풍계
    if (rawType.includes('질풍')) {
        return {
            bossKey: '블랙스톰',
            messengerName: '[신의 사자 모형] 질풍의 사자 블랙스톰',
            shinryokuType: '질풍계',
            title: '질풍의 사자 블랙스톰',
            description: '폭풍을 몰고 다니며 보이지 않는 속도로 적을 유린하는 질풍의 사자 블랙스톰의 훈련 모형입니다.',
            visualUrl: 'https://i.ibb.co/b5hSnQVJ/Gemini-Generated-Image-yt8pt5yt8pt5yt8p.png',
            skills: [
                {
                    id: 'trial_skill_storm_punch',
                    name: '허리케인 너클 [모형 투영]',
                    description: '돌풍의 회전력을 실은 주먹으로 적의 급소를 강타합니다.',
                    tier: ClassTier.FINAL,
                    type: SkillType.PHYSICAL,
                    mpCost: 280,
                    level: 1,
                    maxLevel: 1,
                    currentMastery: 0,
                    powerRatio: 180,
                    targetType: 'single',
                    effectFormula: 'STR*6.0'
                },
                {
                    id: 'trial_skill_typhoon_blast',
                    name: '태풍의 눈 [모형 투영]',
                    description: '거대한 용오름을 발생시켜 전장 전체를 휩쓸어버립니다.',
                    tier: ClassTier.FINAL,
                    type: SkillType.PHYSICAL,
                    mpCost: 580,
                    level: 1,
                    maxLevel: 1,
                    currentMastery: 0,
                    powerRatio: 240,
                    targetType: 'aoe',
                    effectFormula: 'STR*10.0'
                }
            ]
        };
    }

    // 9. 빙결계
    if (rawType.includes('빙결')) {
        return {
            bossKey: '이케블리자더',
            messengerName: '[신의 사자 모형] 빙결의 사자 이케블리자더',
            shinryokuType: '빙결계',
            title: '빙결의 사자 이케블리자더',
            description: '절대영도의 한기로 시간마저 얼려버리는 냉혹한 빙결의 사자 이케블리자더의 훈련 모형입니다.',
            visualUrl: 'https://i.ibb.co/gMhs2gBc/Gemini-Generated-Image-nnbopmnnbopmnnbo.png',
            skills: [
                {
                    id: 'trial_skill_absolute_zero_bullet',
                    name: '절대영도의 탄환 [모형 투영]',
                    description: '초저온의 냉기 탄환을 발사하여 급소를 동결시킵니다.',
                    tier: ClassTier.FINAL,
                    type: SkillType.MAGIC,
                    mpCost: 300,
                    level: 1,
                    maxLevel: 1,
                    currentMastery: 0,
                    powerRatio: 185,
                    targetType: 'single',
                    effectFormula: 'INT*6.2'
                },
                {
                    id: 'trial_skill_blizzard_storm',
                    name: '혹한의 빙하폭발 [모형 투영]',
                    description: '전장을 극저온의 빙하로 뒤덮어 소각하듯 얼려버립니다.',
                    tier: ClassTier.FINAL,
                    type: SkillType.MAGIC,
                    mpCost: 610,
                    level: 1,
                    maxLevel: 1,
                    currentMastery: 0,
                    powerRatio: 245,
                    targetType: 'aoe',
                    effectFormula: 'INT*10.2'
                }
            ]
        };
    }

    // 10. 해수계
    if (rawType.includes('해수')) {
        return {
            bossKey: '오션레이크',
            messengerName: '[신의 사자 모형] 해수의 사자 오션레이크',
            shinryokuType: '해수계',
            title: '해수의 사자 오션레이크',
            description: '심해의 수압과 파도의 흐름을 조종하여 생명의 근원을 다스리는 해수의 사자 오션레이크의 훈련 모형입니다.',
            visualUrl: 'https://i.ibb.co/DZT0Vyy/Gemini-Generated-Image-fhvoxdfhvoxdfhvo.png',
            skills: [
                {
                    id: 'trial_skill_deep_vortex',
                    name: '심해의 소용돌이 [모형 투영]',
                    description: '소용돌이치는 심해의 수압으로 적을 짓누릅니다.',
                    tier: ClassTier.FINAL,
                    type: SkillType.MAGIC,
                    mpCost: 310,
                    level: 1,
                    maxLevel: 1,
                    currentMastery: 0,
                    powerRatio: 180,
                    targetType: 'single',
                    effectFormula: 'INT*6.0'
                },
                {
                    id: 'trial_skill_tsunami_surge',
                    name: '해신의 대해일 [모형 투영]',
                    description: '거대한 해일을 불러와 전장 전체를 집어삼킵니다.',
                    tier: ClassTier.FINAL,
                    type: SkillType.MAGIC,
                    mpCost: 620,
                    level: 1,
                    maxLevel: 1,
                    currentMastery: 0,
                    powerRatio: 240,
                    targetType: 'aoe',
                    effectFormula: 'INT*10.0'
                }
            ]
        };
    }

    // 11. 강철계
    if (rawType.includes('강철')) {
        return {
            bossKey: '퍼스트스틸스',
            messengerName: '[신의 사자 모형] 강철의 사자 퍼스트스틸스',
            shinryokuType: '강철계',
            title: '강철의 사자 퍼스트스틸스',
            description: '무엇보다 단단한 의지와 강철로 이루어진 신계의 방패, 퍼스트스틸스의 훈련 모형입니다.',
            visualUrl: 'https://i.ibb.co/ynpvMj8Y/Gemini-Generated-Image-m2pu11m2pu11m2pu.png',
            skills: [
                {
                    id: 'trial_skill_iron_shield_bash',
                    name: '절대 강철 방패강타 [모형 투영]',
                    description: '무자비한 강철 요새 방패로 적의 전열을 박살냅니다.',
                    tier: ClassTier.FINAL,
                    type: SkillType.PHYSICAL,
                    mpCost: 300,
                    level: 1,
                    maxLevel: 1,
                    currentMastery: 0,
                    powerRatio: 185,
                    targetType: 'single',
                    effectFormula: 'STR*6.2'
                },
                {
                    id: 'trial_skill_metal_breaker',
                    name: '메탈 브레이커 [모형 투영]',
                    description: '강철의 파쇄 에너지를 사방으로 터뜨려 적들을 궤멸시킵니다.',
                    tier: ClassTier.FINAL,
                    type: SkillType.PHYSICAL,
                    mpCost: 600,
                    level: 1,
                    maxLevel: 1,
                    currentMastery: 0,
                    powerRatio: 240,
                    targetType: 'aoe',
                    effectFormula: 'STR*10.0'
                }
            ]
        };
    }

    // 12. 암흑계
    if (rawType.includes('암흑') || rawType.includes('암연')) {
        return {
            bossKey: '네오다크볼튼',
            messengerName: '[신의 사자 모형] 암연의 사자 네오다크볼튼',
            shinryokuType: '암흑계',
            title: '암연의 사자 네오다크볼튼',
            description: '심연의 어둠과 공허를 다루어 존재의 근원을 지워버리는 암연의 사자 네오다크볼튼의 훈련 모형입니다.',
            visualUrl: 'https://i.ibb.co/yFFKkk3H/Kakao-Talk-20251228-162955581-02.png',
            skills: [
                {
                    id: 'trial_skill_void_laser',
                    name: '보이드 다크 레이저 [모형 투영]',
                    description: '공허의 암흑 광선을 발사하여 존재를 침식시킵니다.',
                    tier: ClassTier.FINAL,
                    type: SkillType.MAGIC,
                    mpCost: 320,
                    level: 1,
                    maxLevel: 1,
                    currentMastery: 0,
                    powerRatio: 190,
                    targetType: 'single',
                    effectFormula: 'INT*6.5'
                },
                {
                    id: 'trial_skill_black_hole',
                    name: '블랙홀 붕괴 [모형 투영]',
                    description: '모든 빛을 삼키는 중력 구체를 폭발시켜 전장을 파멸로 이끕니다.',
                    tier: ClassTier.FINAL,
                    type: SkillType.MAGIC,
                    mpCost: 650,
                    level: 1,
                    maxLevel: 1,
                    currentMastery: 0,
                    powerRatio: 250,
                    targetType: 'aoe',
                    effectFormula: 'INT*10.5'
                }
            ]
        };
    }

    // 13. 초화계
    if (rawType.includes('초화')) {
        return {
            bossKey: '태스크슈카인',
            messengerName: '[신의 사자 모형] 초화의 사자 태스크슈카인',
            shinryokuType: '초화계',
            title: '초화의 사자 태스크슈카인',
            description: '생명의 탄생과 순환을 주관하며 자연의 무한한 힘을 끌어다 쓰는 초화의 사자 태스크슈카인의 훈련 모형입니다.',
            visualUrl: 'https://i.ibb.co/ZpvV23TV/Kakao-Talk-20251228-162955581-01.png',
            skills: [
                {
                    id: 'trial_skill_eden_arrow',
                    name: '에덴의 관통시 [모형 투영]',
                    description: '자연의 에너지를 응축한 석궁 화살로 심장을 꿰뚫습니다.',
                    tier: ClassTier.FINAL,
                    type: SkillType.PHYSICAL,
                    mpCost: 300,
                    level: 1,
                    maxLevel: 1,
                    currentMastery: 0,
                    powerRatio: 185,
                    targetType: 'single',
                    effectFormula: 'STR*6.2'
                },
                {
                    id: 'trial_skill_nature_wrath',
                    name: '생명의 덩굴 폭풍 [모형 투영]',
                    description: '무수한 가시 덩굴을 소환해 전장의 모든 적을 옭아매고 찢어발깁니다.',
                    tier: ClassTier.FINAL,
                    type: SkillType.PHYSICAL,
                    mpCost: 610,
                    level: 1,
                    maxLevel: 1,
                    currentMastery: 0,
                    powerRatio: 245,
                    targetType: 'aoe',
                    effectFormula: 'STR*10.0'
                }
            ]
        };
    }

    // Default Fallback: 무의 사자 홍길동
    return {
        bossKey: '홍길동',
        messengerName: '[신의 사자 모형] 무의 사자 홍길동',
        shinryokuType: '무기강화계',
        title: '무의 사자 홍길동',
        description: '형체도 기척도 없는 무(無)의 경지에 도달하여 차원을 가르는 무의 사자 홍길동의 영압을 마법공학으로 재현한 궁극의 모형입니다.',
        visualUrl: 'https://i.ibb.co/pjtyRpxb/Gemini-Generated-Image-ap3z5sap3z5sap3z.png',
        skills: [
            {
                id: 'trial_skill_void_blade',
                name: '무형의 참격 [모형 투영]',
                description: '모습을 감춘 채 보이지 않는 검기로 적의 급소를 베어냅니다.',
                tier: ClassTier.FINAL,
                type: SkillType.PHYSICAL,
                mpCost: 280,
                level: 1,
                maxLevel: 1,
                currentMastery: 0,
                powerRatio: 185,
                targetType: 'single',
                effectFormula: 'STR*6.2 + AGI*2.0'
            },
            {
                id: 'trial_skill_wind_step_slash',
                name: '활빈 쾌도난마 [모형 투영]',
                description: '축지법으로 전장을 종횡무진 누비며 전방위 쾌속 난무를 퍼붓습니다.',
                tier: ClassTier.FINAL,
                type: SkillType.PHYSICAL,
                mpCost: 580,
                level: 1,
                maxLevel: 1,
                currentMastery: 0,
                powerRatio: 245,
                targetType: 'aoe',
                effectFormula: 'STR*9.5 + AGI*3.0'
            }
        ]
    };
};

export const BREAKTHROUGH_COSTS: Partial<Record<ClassTier, {
    gold: number;
    manaCrystal: number;
    shinryoku_flower: number;
    iron: number;
    stone: number;
    minCP: number;
    minLabLevel: number;
    label: string;
    description: string;
}>> = {
    [ClassTier.FIRST]: {
        gold: 100000,
        manaCrystal: 50,
        shinryoku_flower: 10,
        iron: 100,
        stone: 200,
        minCP: 5000,
        minLabLevel: 1,
        label: "퍼스트 클래스",
        description: "최초의 한계를 돌파하여 퍼스트 클래스(Lv.30)의 힘을 개방합니다."
    },
    [ClassTier.SECOND]: {
        gold: 500000,
        manaCrystal: 250,
        shinryoku_flower: 30,
        iron: 300,
        stone: 500,
        minCP: 25000,
        minLabLevel: 2,
        label: "세컨드 클래스",
        description: "영혼의 잠재력을 각성하여 세컨드 클래스(Lv.100)의 힘을 개방합니다."
    },
    [ClassTier.LAST]: {
        gold: 2000000,
        manaCrystal: 1000,
        shinryoku_flower: 100,
        iron: 1000,
        stone: 1500,
        minCP: 100000,
        minLabLevel: 3,
        label: "라스트 클래스",
        description: "육체의 한계를 초월하여 라스트 클래스(Lv.300)의 영역에 도달합니다."
    },
    [ClassTier.FINAL]: {
        gold: 50000000,
        manaCrystal: 10000,
        shinryoku_flower: 500,
        iron: 10000,
        stone: 10000,
        minCP: 500000,
        minLabLevel: 5,
        label: "파이널 클래스",
        description: "신의 사자와의 시련을 통과하고 신성한 한계를 초월하여 궁극의 파이널 클래스(Lv.1000) 잠재력을 해방합니다."
    }
};

export const POTENTIAL_LIMIT_COSTS: Record<string, {
    gold: number;
    manaCrystal: number;
    shinryoku_flower: number;
    label: string;
    baseCloseDesc: string;
}> = {
    [ClassTier.NONE]: {
        gold: 50000,
        manaCrystal: 20,
        shinryoku_flower: 5,
        label: "미해방 잠재력 제한",
        baseCloseDesc: "미해방 기본 슬롯 마감 시점(Lv.20)부터 레벨 100마다 미해방 스킬 슬롯 +1개"
    },
    [ClassTier.FIRST]: {
        gold: 150000,
        manaCrystal: 50,
        shinryoku_flower: 15,
        label: "퍼스트 클래스 잠재력 제한",
        baseCloseDesc: "퍼스트 클래스 슬롯 마감 시점(Lv.90)부터 레벨 100마다 해당 잠재력 이하 스킬 슬롯 +1개"
    },
    [ClassTier.SECOND]: {
        gold: 500000,
        manaCrystal: 150,
        shinryoku_flower: 40,
        label: "세컨드 클래스 잠재력 제한",
        baseCloseDesc: "세컨드 클래스 슬롯 마감 시점(Lv.260)부터 레벨 100마다 해당 잠재력 이하 스킬 슬롯 +1개"
    },
    [ClassTier.LAST]: {
        gold: 1500000,
        manaCrystal: 500,
        shinryoku_flower: 100,
        label: "라스트 클래스 잠재력 제한",
        baseCloseDesc: "라스트 클래스 슬롯 마감 시점(Lv.900)부터 레벨 100마다 해당 잠재력 이하 스킬 슬롯 +1개"
    }
};

export const TRIAL_STAGES: {
    tier: ClassTier;
    label: string;
    subLabel: string;
    recCP: string;
    minLabLevel: number;
}[] = [
    { tier: ClassTier.FIRST, label: "퍼스트 클래스 시련", subLabel: "Lv.30 환영", recCP: "5,000+", minLabLevel: 1 },
    { tier: ClassTier.SECOND, label: "세컨드 클래스 시련", subLabel: "Lv.100 고대 환영", recCP: "25,000+", minLabLevel: 2 },
    { tier: ClassTier.LAST, label: "라스트 클래스 시련", subLabel: "Lv.300 신화 환영", recCP: "100,000+", minLabLevel: 3 },
    { tier: ClassTier.FINAL, label: "최후의 시련 (파이널)", subLabel: "Lv.750 신의 사자 모형", recCP: "500,000+", minLabLevel: 5 },
];

export const getTierRank = (tier: ClassTier | string | undefined | null): number => {
    switch (tier) {
        case ClassTier.FIRST: return 1;
        case ClassTier.SECOND: return 2;
        case ClassTier.LAST: return 3;
        case ClassTier.FINAL: return 4;
        default: return 0;
    }
};

export const checkTrialClearedForTier = (
    tier: ClassTier | null | undefined,
    entity: {
        classTier?: ClassTier;
        firstClassName?: string;
        secondClassName?: string;
        lastClassName?: string;
        finalClassName?: string;
        hasClearedFirstTrial?: boolean;
        hasClearedSecondTrial?: boolean;
        hasClearedLastTrial?: boolean;
        hasClearedFinalTrial?: boolean;
        firstTrialCleared?: boolean;
        secondTrialCleared?: boolean;
        lastTrialCleared?: boolean;
        finalTrialCleared?: boolean;
    }
): boolean => {
    if (!tier) return true;
    if (tier === ClassTier.FIRST) {
        return Boolean(
            entity.hasClearedFirstTrial ||
            entity.firstTrialCleared ||
            entity.hasClearedSecondTrial ||
            entity.secondTrialCleared ||
            entity.hasClearedLastTrial ||
            entity.lastTrialCleared ||
            entity.hasClearedFinalTrial ||
            entity.finalTrialCleared
        );
    }
    if (tier === ClassTier.SECOND) {
        return Boolean(
            entity.hasClearedSecondTrial ||
            entity.secondTrialCleared ||
            entity.hasClearedLastTrial ||
            entity.lastTrialCleared ||
            entity.hasClearedFinalTrial ||
            entity.finalTrialCleared
        );
    }
    if (tier === ClassTier.LAST) {
        return Boolean(
            entity.hasClearedLastTrial ||
            entity.lastTrialCleared ||
            entity.hasClearedFinalTrial ||
            entity.finalTrialCleared
        );
    }
    if (tier === ClassTier.FINAL) {
        return Boolean(
            entity.hasClearedFinalTrial ||
            entity.finalTrialCleared
        );
    }
    return true;
};

export const getIllusionTitleByShinryoku = (
    shinryokuType: string,
    tier: ClassTier,
    messengerInfo?: TrialMessengerInfo
): { name: string; desc: string; visualUrl?: string } => {
    const raw = (shinryokuType || '').trim();
    if (tier === ClassTier.FIRST) {
        if (raw.includes('태양')) return { name: '타오르는 태양의 환영', desc: '태양의 열기를 머금은 1:1 초급 환영체입니다.', visualUrl: 'https://i.ibb.co/hRncmZDt/Gemini-Generated-Image-ksnfznksnfznksnf.png' };
        if (raw.includes('전격')) return { name: '번뜩이는 뇌전의 환영', desc: '전류를 내뿜는 1:1 초급 환영체입니다.', visualUrl: 'https://i.ibb.co/1fb9bT7C/Gemini-Generated-Image-fw9czyfw9czyfw9c.png' };
        if (raw.includes('화염')) return { name: '이글거리는 화염의 환영', desc: '맹렬한 불꽃을 두른 1:1 초급 환영체입니다.', visualUrl: 'https://i.ibb.co/ds1KKvtQ/Gemini-Generated-Image-f2rw0zf2rw0zf2rw.png' };
        if (raw.includes('광휘')) return { name: '눈부신 성광의 환영', desc: '신성한 빛으로 무장한 1:1 초급 환영체입니다.', visualUrl: 'https://i.ibb.co/R4Yj9TsN/Gemini-Generated-Image-vil5x1vil5x1vil5.png' };
        if (raw.includes('월광')) return { name: '은은한 달빛의 환영', desc: '신비로운 월광을 두른 1:1 초급 환영체입니다.', visualUrl: 'https://i.ibb.co/8gDLbn6h/Gemini-Generated-Image-w28xyfw28xyfw28x.png' };
        if (raw.includes('대지')) return { name: '거친 암석의 환영', desc: '견고한 바위의 힘을 지닌 1:1 초급 환영체입니다.', visualUrl: 'https://i.ibb.co/XHRRd5N/Gemini-Generated-Image-xs77fdxs77fdxs77.png' };
        if (raw.includes('빙결')) return { name: '서늘한 냉기의 환영', desc: '극지의 한기를 뿜어내는 1:1 초급 환영체입니다.', visualUrl: 'https://i.ibb.co/6cwHTb7R/Gemini-Generated-Image-l17trtl17trtl17t.png' };
        if (raw.includes('바람') || raw.includes('질풍')) return { name: '거센 바람의 환영', desc: '칼바람을 일으키는 1:1 초급 환영체입니다.', visualUrl: 'https://i.ibb.co/GQQv5Jw0/Gemini-Generated-Image-4x6n74x6n74x6n74.png' };
        if (raw.includes('강철')) return { name: '견고한 강철의 환영', desc: '단단한 쇠의 기운을 두른 1:1 초급 환영체입니다.', visualUrl: 'https://i.ibb.co/jkZZ5cnV/Gemini-Generated-Image-qdv2oaqdv2oaqdv2.png' };
        if (raw.includes('암흑') || raw.includes('암연')) return { name: '음산한 암흑의 환영', desc: '어둠의 심연에서 솟아난 1:1 초급 환영체입니다.', visualUrl: 'https://i.ibb.co/XkMXS7BD/Gemini-Generated-Image-n1uehqn1uehqn1ue.png' };
        if (raw.includes('초화') || raw.includes('생명')) return { name: '가시 덩굴의 환영', desc: '원초의 생명력을 지닌 1:1 초급 환영체입니다.', visualUrl: 'https://i.ibb.co/zV4q0y9G/Gemini-Generated-Image-rjq2kbrjq2kbrjq2.png' };
        if (raw.includes('해수') || raw.includes('수류')) return { name: '출렁이는 파도의 환영', desc: '거센 물결을 일으키는 1:1 초급 환영체입니다.', visualUrl: 'https://i.ibb.co/QWsbYfc/Gemini-Generated-Image-a5a3zda5a3zda5a3.png' };
        if (raw.includes('신체강화')) return { name: '패기 넘치는 투기의 환영', desc: '맹렬한 육체 기운을 두른 1:1 초급 환영체입니다.', visualUrl: 'https://i.ibb.co/LdNZ6pZt/Gemini-Generated-Image-b4ghfbb4ghfbb4gh.png' };
        return { name: '무형의 검기 환영', desc: '순수한 무의 극의를 담은 1:1 초급 환영체입니다.', visualUrl: 'https://i.ibb.co/p6n3m6R4/Gemini-Generated-Image-yj63fmyj63fmyj63.png' };
    }
    if (tier === ClassTier.SECOND) {
        if (raw.includes('태양')) return { name: '맹렬한 일륜의 고대 환영', desc: '태양의 진정한 화력을 투영한 1:1 고대 환영체입니다.', visualUrl: 'https://i.ibb.co/7djNL9yt/Gemini-Generated-Image-blf11dblf11dblf1.png' };
        if (raw.includes('전격')) return { name: '천둥벼락의 고대 환영', desc: '낙뢰의 굉음을 울리는 1:1 고대 환영체입니다.', visualUrl: 'https://i.ibb.co/XZ7zWWG8/Gemini-Generated-Image-8nzesh8nzesh8nze.png' };
        if (raw.includes('화염')) return { name: '홍련 업화의 고대 환영', desc: '모든 것을 불사르는 1:1 고대 환영체입니다.', visualUrl: 'https://i.ibb.co/WWCvpfS9/Gemini-Generated-Image-n5l5zun5l5zun5l5.png' };
        if (raw.includes('광휘')) return { name: '영롱한 광휘의 고대 환영', desc: '성스러운 축복의 빛을 뿜는 1:1 고대 환영체입니다.', visualUrl: 'https://i.ibb.co/20v1NSZn/Gemini-Generated-Image-h1ks0kh1ks0kh1ks.png' };
        if (raw.includes('월광')) return { name: '칠흑 월식의 고대 환영', desc: '달의 그림자를 조종하는 1:1 고대 환영체입니다.', visualUrl: 'https://i.ibb.co/vCqFfv9D/Gemini-Generated-Image-un0u1pun0u1pun0u.png' };
        if (raw.includes('대지')) return { name: '금강 대륙의 고대 환영', desc: '대지의 거대한 압력을 가하는 1:1 고대 환영체입니다.', visualUrl: 'https://i.ibb.co/SXY3dBhF/Gemini-Generated-Image-duu7nmduu7nmduu7.png' };
        if (raw.includes('빙결')) return { name: '혹한 만년빙의 고대 환영', desc: '만년설의 한기를 품은 1:1 고대 환영체입니다.', visualUrl: 'https://i.ibb.co/bgFGnxn7/Gemini-Generated-Image-pxjatgpxjatgpxja.png' };
        if (raw.includes('바람') || raw.includes('질풍')) return { name: '열풍 폭풍의 고대 환영', desc: '폭풍우의 기세를 지닌 1:1 고대 환영체입니다.', visualUrl: 'https://i.ibb.co/LXzBb9LM/Gemini-Generated-Image-ck5n6xck5n6xck5n.png' };
        if (raw.includes('강철')) return { name: '불침 요새의 고대 환영', desc: '어떤 칼날도 튕겨내는 1:1 고대 환영체입니다.', visualUrl: 'https://i.ibb.co/0pZywnFs/Gemini-Generated-Image-2aewsq2aewsq2aew.png' };
        if (raw.includes('암흑') || raw.includes('암연')) return { name: '심연 침식의 고대 환영', desc: '영혼을 잠식하는 1:1 고대 환영체입니다.', visualUrl: 'https://i.ibb.co/21WjhnNj/Gemini-Generated-Image-wgh2ofwgh2ofwgh2.png' };
        if (raw.includes('초화') || raw.includes('생명')) return { name: '태고 수림의 고대 환영', desc: '태고의 숲의 분노를 품은 1:1 고대 환영체입니다.', visualUrl: 'https://i.ibb.co/0RTKHFnP/Gemini-Generated-Image-7vnr3j7vnr3j7vnr.png' };
        if (raw.includes('해수') || raw.includes('수류')) return { name: '거친 해일의 고대 환영', desc: '대양의 해일을 일으키는 1:1 고대 환영체입니다.', visualUrl: 'https://i.ibb.co/MkJyx1XR/Gemini-Generated-Image-1nmrmc1nmrmc1nmr.png' };
        if (raw.includes('신체강화')) return { name: '금강불괴의 고대 환영', desc: '파괴되지 않는 근육과 투기를 지닌 1:1 고대 환영체입니다.', visualUrl: 'https://i.ibb.co/PZDjWmqD/Gemini-Generated-Image-2t3tvd2t3tvd2t3t.png' };
        return { name: '쾌속 질풍의 고대 환영', desc: '무기술의 정수를 구현한 1:1 고대 환영체입니다.', visualUrl: 'https://i.ibb.co/N2G4Hq9Z/Gemini-Generated-Image-jca044jca044jca0.png' };
    }
    if (tier === ClassTier.LAST) {
        if (raw.includes('태양')) return { name: '흑점 폭발의 신화 환영', desc: '태양의 흑점 대폭발을 일으키는 초월적 1:1 신화 환영체입니다.', visualUrl: 'https://i.ibb.co/d4HN5QwT/Gemini-Generated-Image-vjlxsdvjlxsdvjlx.png' };
        if (raw.includes('전격')) return { name: '자색 뇌신의 신화 환영', desc: '신벌의 자색 벼락을 내리치는 초월적 1:1 신화 환영체입니다.', visualUrl: 'https://i.ibb.co/35L7R8FY/Gemini-Generated-Image-g0hf7lg0hf7lg0hf.png' };
        if (raw.includes('화염')) return { name: '지옥 겁화의 신화 환영', desc: '영겁의 지옥불을 다루는 초월적 1:1 신화 환영체입니다.', visualUrl: 'https://i.ibb.co/pv99QTyX/Gemini-Generated-Image-430i7o430i7o430i.png' };
        if (raw.includes('광휘')) return { name: '찬란한 성역의 신화 환영', desc: '신의 성역을 현현시키는 초월적 1:1 신화 환영체입니다.', visualUrl: 'https://i.ibb.co/9HJyCBDR/Gemini-Generated-Image-5w66pv5w66pv5w66.png' };
        if (raw.includes('월광')) return { name: '백야 만월의 신화 환영', desc: '밤을 낮처럼 밝히는 초월적 1:1 신화 환영체입니다.', visualUrl: 'https://i.ibb.co/mCN7p9C6/Chat-GPT-Image-2026-3-19-06-51-05.png' };
        if (raw.includes('대지')) return { name: '지축 붕괴의 신화 환영', desc: '대륙을 가르는 지축의 힘을 품은 초월적 1:1 신화 환영체입니다.', visualUrl: 'https://i.ibb.co/5gMgjfYS/Gemini-Generated-Image-69ktkj69ktkj69kt.png' };
        if (raw.includes('빙결')) return { name: '절대영도 빙하의 신화 환영', desc: '시공간마저 얼어붙게 만드는 초월적 1:1 신화 환영체입니다.', visualUrl: 'https://i.ibb.co/20XzMkx5/Gemini-Generated-Image-rb6463rb6463rb64.png' };
        if (raw.includes('바람') || raw.includes('질풍')) return { name: '천공 태풍의 신화 환영', desc: '하늘을 뒤흔드는 초월적 1:1 신화 환영체입니다.', visualUrl: 'https://i.ibb.co/zc4MLPh/Gemini-Generated-Image-h4ku22h4ku22h4ku.png' };
        if (raw.includes('강철')) return { name: '절대 파성퇴의 신화 환영', desc: '어떤 방벽도 분쇄하는 초월적 1:1 신화 환영체입니다.', visualUrl: 'https://i.ibb.co/7NQswJYg/Gemini-Generated-Image-ak981dak981dak98.png' };
        if (raw.includes('암흑') || raw.includes('암연')) return { name: '공허 블랙홀의 신화 환영', desc: '빛마저 삼키는 암흑의 초월적 1:1 신화 환영체입니다.', visualUrl: 'https://i.ibb.co/nsBwNzK2/Gemini-Generated-Image-ao6zodao6zodao6z.png' };
        if (raw.includes('초화') || raw.includes('생명')) return { name: '세계수 분노의 신화 환영', desc: '세계수의 신성한 분노를 담은 초월적 1:1 신화 환영체입니다.', visualUrl: 'https://i.ibb.co/TpBX9Wp/Gemini-Generated-Image-gydswxgydswxgyds.png' };
        if (raw.includes('해수') || raw.includes('수류')) return { name: '대양 심해의 신화 환영', desc: '심해의 공포를 불러일으키는 초월적 1:1 신화 환영체입니다.', visualUrl: 'https://i.ibb.co/rKtsr2Th/Gemini-Generated-Image-7rj4x17rj4x17rj4.png' };
        if (raw.includes('신체강화')) return { name: '천하무쌍 파괴의 신화 환영', desc: '천하를 뒤흔드는 투신의 초월적 1:1 신화 환영체입니다.', visualUrl: 'https://i.ibb.co/xtGnhskH/Gemini-Generated-Image-lkl1tolkl1tolkl1.png' };
        return { name: '삼라만상 파쇄의 신화 환영', desc: '모든 무기술을 초월한 1:1 신화 환영체입니다.', visualUrl: 'https://i.ibb.co/DfrCzP0T/Gemini-Generated-Image-ha96peha96peha96.png' };
    }
    // FINAL
    return {
        name: messengerInfo?.messengerName || '신의 사자 모형',
        desc: messengerInfo?.description || '파이널 클래스 잠재력 해방을 위한 최후의 시련 훈련체입니다.',
        visualUrl: messengerInfo?.visualUrl
    };
};

export const getTrialEnemyForTier = (
    tier: ClassTier,
    messengerInfo: TrialMessengerInfo,
    isPlayer: boolean,
    challengerId: string
): Enemy => {
    let level = 30;
    let hp = 3000;
    let mp = 500;
    let stats = { hp: 3000, maxHp: 3000, mp: 500, maxMp: 500, str: 150, int: 140, def: 150, agi: 150, wis: 150, ctrl: 160 };
    let prefix = "[퍼스트 시련]";

    const illusionData = getIllusionTitleByShinryoku(messengerInfo.shinryokuType, tier, messengerInfo);
    let enemyName = `${prefix} ${illusionData.name}`;
    let desc = `${illusionData.desc} (퍼스트 클래스 잠재력 해방을 증명하기 위한 1:1 결투 시험체입니다.)`;

    if (tier === ClassTier.SECOND) {
        level = 100;
        hp = 350000;
        mp = 4000;
        stats = { hp: 350000, maxHp: 350000, mp: 1500, maxMp: 1500, str: 750, int: 700, def: 900, agi: 720, wis: 700, ctrl: 780 };
        prefix = "[세컨드 시련]";
        enemyName = `${prefix} ${illusionData.name}`;
        desc = `${illusionData.desc} (세컨드 클래스 잠재력 해방을 증명하기 위한 1:1 결투 시험체입니다.)`;
    } else if (tier === ClassTier.LAST) {
        level = 300;
        hp = 10000000;
        mp = 60000;
        stats = { hp: 10000000, maxHp: 10000000, mp: 3000, maxMp: 3000, str: 3200, int: 3200, def: 4000, agi: 3500, wis: 3800, ctrl: 3500 };
        prefix = "[라스트 시련]";
        enemyName = `${prefix} ${illusionData.name}`;
        desc = `${illusionData.desc} (라스트 클래스 잠재력 해방을 증명하기 위한 1:1 결투 시험체입니다.)`;
    } else if (tier === ClassTier.FINAL) {
        level = 1000;
        hp = 750000000;
        mp = 180000;
        stats = { hp: 750000000, maxHp: 750000000, mp: 8000, maxMp: 8000, str: 18000, int: 18000, def: 22000, agi: 20000, wis: 22000, ctrl: 20000 };
        prefix = "[최후의 시련]";
        enemyName = `${prefix} [신의 사자 모형] ${messengerInfo.title}`;
        desc = `${messengerInfo.description} (파이널 클래스 잠재력 해방을 증명하기 위한 1:1 최후의 시련 훈련체입니다.)`;
    }

    return {
        id: isPlayer
            ? `trial_${tier.toLowerCase()}_${messengerInfo.bossKey}_player`
            : `trial_${tier.toLowerCase()}_${messengerInfo.bossKey}_comp_${challengerId}`,
        name: enemyName,
        level,
        hp,
        maxHp: hp,
        shinryokuType: messengerInfo.shinryokuType,
        description: desc,
        isBoss: true,
        visualUrl: illusionData.visualUrl || messengerInfo.visualUrl,
        statusEffects: [],
        stats,
        skills: messengerInfo.skills,
        trialTier: tier
    } as Enemy;
};

export const getNextPotentialTier = (currentPot: ClassTier | undefined): ClassTier | null => {
    switch (currentPot) {
        case ClassTier.NONE:
        case ClassTier.F:
        case undefined:
            return ClassTier.FIRST;
        case ClassTier.FIRST:
            return ClassTier.SECOND;
        case ClassTier.SECOND:
            return ClassTier.LAST;
        case ClassTier.LAST:
            return ClassTier.FINAL;
        default:
            return null;
    }
};

export const getCompanionNextPotentialTier = (currentPot: ClassTier | undefined, isCustom?: boolean): ClassTier | null => {
    switch (currentPot) {
        case ClassTier.NONE:
        case ClassTier.F:
        case undefined:
            return ClassTier.FIRST;
        case ClassTier.FIRST:
            return ClassTier.SECOND;
        case ClassTier.SECOND:
            return ClassTier.LAST;
        case ClassTier.LAST:
            return isCustom ? ClassTier.FINAL : null; // 커스텀 동료는 파이널 클래스 잠재력까지 돌파소에서 개방 가능
        default:
            return null; // 일반 동료 파이널 클래스는 성전 관리에서 돌파
    }
};

const PotentialBreakthroughModal: React.FC<Props> = ({
    character,
    facilityLevel = 5,
    isOpen = true,
    onClose,
    onUpdateCharacter,
    onBattle,
    initialTab,
    isHallOfTrials
}) => {
    const [activeTab, setActiveTab] = useState<'companion' | 'companion_limit' | 'player' | 'final_trial'>(initialTab || 'companion');
    const [selectedCompanionId, setSelectedCompanionId] = useState<string | null>(null);
    const [confirmLockCompId, setConfirmLockCompId] = useState<string | null>(null);
    const [trialChallengerId, setTrialChallengerId] = useState<string>("player");
    const [selectedTrialTier, setSelectedTrialTier] = useState<ClassTier>(ClassTier.FIRST);
    const [actionFeedback, setActionFeedback] = useState<string | null>(null);
    const [showGuide, setShowGuide] = useState<boolean>(false);

    // 동료 필터, 정렬 및 검색 상태
    const [compSortBy, setCompSortBy] = useState<'cp_desc' | 'cp_asc' | 'level_desc' | 'level_asc' | 'potential_desc' | 'name_asc'>('cp_desc');
    const [compFilterBy, setCompFilterBy] = useState<'all' | 'appraised' | 'unappraised' | 'custom' | 'normal' | 'ready'>('all');
    const [compSearchQuery, setCompSearchQuery] = useState('');

    React.useEffect(() => {
        if (initialTab) {
            setActiveTab(initialTab);
        }
    }, [initialTab, isOpen]);

    const allComps = [...(character.companions || []), ...(character.inactiveCompanions || [])].filter(c => !isMonsterCompanion(c));

    const processedComps = React.useMemo(() => {
        let list = [...allComps];

        // 1. 검색어 필터링
        if (compSearchQuery.trim()) {
            const query = compSearchQuery.toLowerCase();
            list = list.filter(c => 
                c.name.toLowerCase().includes(query) || 
                (c.job && c.job.toLowerCase().includes(query)) ||
                (c.shinryokuType && c.shinryokuType.toLowerCase().includes(query))
            );
        }

        // 2. 종류/상태 필터링
        if (compFilterBy !== 'all') {
            list = list.filter(c => {
                const initialized = checkAndInitializeLiberationEligibility({ ...c }, getCompanionPureCP(c));
                const currentPot = initialized.liberationPotential || ClassTier.NONE;
                const nextPot = getCompanionNextPotentialTier(currentPot, c.isCustom);
                const cp = getCompanionPureCP(c);

                if (compFilterBy === 'appraised') {
                    return c.potentialAppraised === true;
                }
                if (compFilterBy === 'unappraised') {
                    return c.potentialAppraised !== true;
                }
                if (compFilterBy === 'custom') {
                    return c.isCustom === true;
                }
                if (compFilterBy === 'normal') {
                    return !c.isCustom;
                }
                if (compFilterBy === 'ready') {
                    // 돌파 가능: 감정 완료, 다음 티어가 있고, 레벨 및 전투력 조건과 자원 보유가 충족됨
                    if (c.potentialAppraised !== true) return false;
                    if (!nextPot) return false;
                    const costConfig = BREAKTHROUGH_COSTS[nextPot];
                    if (!costConfig) return false;

                    const cpMet = cp >= costConfig.minCP;
                    const goldMet = (character.money || 0) >= costConfig.gold;
                    const resourcesMet = 
                        (character.base?.resources?.manaCrystal || 0) >= costConfig.manaCrystal &&
                        (character.base?.resources?.shinryoku_flower || 0) >= costConfig.shinryoku_flower &&
                        (character.base?.resources?.iron || 0) >= costConfig.iron &&
                        (character.base?.resources?.stone || 0) >= costConfig.stone;

                    return cpMet && goldMet && resourcesMet;
                }
                return true;
            });
        }

        // 3. 정렬 적용
        list.sort((a, b) => {
            const cpA = getCompanionPureCP(a);
            const cpB = getCompanionPureCP(b);
            const lvA = a.level || 1;
            const lvB = b.level || 1;

            if (compSortBy === 'cp_desc') return cpB - cpA;
            if (compSortBy === 'cp_asc') return cpA - cpB;
            if (compSortBy === 'level_desc') return lvB - lvA;
            if (compSortBy === 'level_asc') return lvA - lvB;
            if (compSortBy === 'potential_desc') {
                const potA = a.liberationPotential || ClassTier.NONE;
                const potB = b.liberationPotential || ClassTier.NONE;
                const potRanks: Record<string, number> = {
                    [ClassTier.NONE]: 0,
                    [ClassTier.FIRST]: 1,
                    [ClassTier.SECOND]: 2,
                    [ClassTier.LAST]: 3,
                    [ClassTier.FINAL]: 4
                };
                return (potRanks[potB] || 0) - (potRanks[potA] || 0);
            }
            if (compSortBy === 'name_asc') {
                return a.name.localeCompare(b.name, 'ko');
            }
            return 0;
        });

        return list;
    }, [character.companions, character.inactiveCompanions, character.money, character.base?.resources, compSortBy, compFilterBy, compSearchQuery]);

    if (!isOpen) return null;

    const playerCP = getCompanionPureCP(character);

    const playerPotential = character.liberationPotential || (
        character.finalClassName ? ClassTier.FINAL :
        character.lastClassName ? ClassTier.LAST :
        character.secondClassName ? ClassTier.SECOND :
        ClassTier.FIRST
    );

    const playerNextTier = getNextPotentialTier(playerPotential);

    const gold = character.money || 0;
    const manaCrystal = character.base?.resources?.manaCrystal || 0;
    const shinryokuFlower = character.base?.resources?.shinryoku_flower || 0;
    const iron = character.base?.resources?.iron || 0;
    const stone = character.base?.resources?.stone || 0;

    const showFeedback = (msg: string) => {
        setActionFeedback(msg);
        setTimeout(() => setActionFeedback(null), 4000);
    };

    // 동료 잠재력 제한 핸들러 (영구 취소 불가 · 커스텀 동료 전용)
    const handleLockCompanionPotential = (comp: Companion) => {
        if (!comp.isCustom) {
            showFeedback('잠재력 제한은 커스텀 동료만 설정할 수 있습니다.');
            return;
        }
        if (comp.isPotentialLocked) {
            showFeedback(`${comp.name} 대원은 이미 잠재력 제한이 설정되어 있습니다.`);
            return;
        }
        if (comp.potentialAppraised !== true) {
            showFeedback('예언가 사바스에게 잠재력을 감정받은 동료만 잠재력 제한을 설정할 수 있습니다.');
            return;
        }
        const initializedComp = checkAndInitializeLiberationEligibility({ ...comp }, getCompanionPureCP(comp));
        const rawPot = initializedComp.liberationPotential || ClassTier.NONE;
        const normalizedPot = (rawPot === ClassTier.F || (comp.liberationEligibility as any) === 'none') ? ClassTier.NONE : rawPot;

        if (normalizedPot === ClassTier.FINAL) {
            showFeedback('파이널 클래스 잠재력은 이미 최고 단계이므로 잠재력 제한 대상이 아닙니다.');
            return;
        }

        const costConfig = POTENTIAL_LIMIT_COSTS[normalizedPot] || POTENTIAL_LIMIT_COSTS[ClassTier.NONE];
        if (gold < costConfig.gold || manaCrystal < costConfig.manaCrystal || shinryokuFlower < costConfig.shinryoku_flower) {
            showFeedback('잠재력 제한 설정에 필요한 재화나 자원이 부족합니다.');
            return;
        }

        const newChar: Character = JSON.parse(JSON.stringify(character));
        newChar.money -= costConfig.gold;
        if (!newChar.base) newChar.base = {} as any;
        if (!newChar.base.resources) newChar.base.resources = {} as any;
        newChar.base.resources.manaCrystal = (newChar.base.resources.manaCrystal || 0) - costConfig.manaCrystal;
        newChar.base.resources.shinryoku_flower = (newChar.base.resources.shinryoku_flower || 0) - costConfig.shinryoku_flower;

        const updateComp = (c: Companion) => {
            if (c.id === comp.id) {
                return {
                    ...c,
                    liberationPotential: normalizedPot,
                    isPotentialLocked: true
                };
            }
            return c;
        };

        newChar.companions = (newChar.companions || []).map(updateComp);
        newChar.inactiveCompanions = (newChar.inactiveCompanions || []).map(updateComp);

        setConfirmLockCompId(null);
        onUpdateCharacter(
            newChar,
            `[잠재력 제한 설정] ${comp.name} 대원의 잠재력이 [${normalizedPot}] 단계로 영구 고정되었습니다! 이제 스킬북에서 해당 잠재력까지의 클래스 스킬 슬롯이 원래 닫히는 시점부터 레벨 100마다 1개씩 추가됩니다.`
        );
        showFeedback(`🔒 ${comp.name} 대원의 잠재력 제한 설정 완료! 이제 해당 잠재력까지의 클래스 스킬 슬롯이 레벨 100마다 1개씩 추가 개방됩니다.`);
    };

    // 동료 잠재력 돌파 핸들러
    const handleCompanionBreakthrough = (comp: Companion) => {
        if (comp.isPotentialLocked) {
            showFeedback(`${comp.name} 대원은 잠재력 제한이 설정되어 있어 더 이상 잠재력을 높일 수 없습니다.`);
            return;
        }
        const initializedComp = checkAndInitializeLiberationEligibility({ ...comp }, getCompanionPureCP(comp));
        const currentPot = initializedComp.liberationPotential || ClassTier.NONE;
        const nextPot = getCompanionNextPotentialTier(currentPot, comp.isCustom);

        if (!nextPot) {
            if (comp.isCustom) {
                alert("이미 최고 잠재력(파이널 클래스)에 도달했습니다!");
            } else {
                alert("일반 동료의 파이널 클래스 돌파는 성전 관리 신성 돌파소에서 진행해야 합니다.");
            }
            return;
        }

        if (comp.potentialAppraised !== true) {
            alert("예언가 사바스에게 잠재력을 감정받은 동료만 잠재력 돌파가 가능합니다. 마을 거주구역에서 사바스를 찾아가세요!");
            return;
        }

        if ((comp.liberationEligibility as any) === 'none' || currentPot === ClassTier.F) {
            alert("예언가 사바스로부터 '해방 불가'로 감정된 동료는 잠재력 돌파를 진행할 수 없습니다.");
            return;
        }

        const costConfig = BREAKTHROUGH_COSTS[nextPot];
        if (!costConfig) return;

        if (facilityLevel < costConfig.minLabLevel) {
            alert(`잠재력 돌파소 레벨이 부족합니다! (필요: Lv.${costConfig.minLabLevel}, 현재: Lv.${facilityLevel})`);
            return;
        }

        const cp = getCompanionPureCP(comp);
        if (cp < costConfig.minCP) {
            alert(`순수 전투력이 부족합니다! (필요 순수 전투력: ${costConfig.minCP.toLocaleString()}, 현재: ${cp.toLocaleString()})`);
            return;
        }

        if (gold < costConfig.gold ||
            manaCrystal < costConfig.manaCrystal ||
            shinryokuFlower < costConfig.shinryoku_flower ||
            iron < costConfig.iron ||
            stone < costConfig.stone) {
            alert("잠재력 돌파에 필요한 재화나 자원이 부족합니다!");
            return;
        }

        const newChar: Character = JSON.parse(JSON.stringify(character));
        newChar.money -= costConfig.gold;
        if (!newChar.base) newChar.base = {} as any;
        if (!newChar.base.resources) newChar.base.resources = {} as any;
        newChar.base.resources.manaCrystal = (newChar.base.resources.manaCrystal || 0) - costConfig.manaCrystal;
        newChar.base.resources.shinryoku_flower = (newChar.base.resources.shinryoku_flower || 0) - costConfig.shinryoku_flower;
        newChar.base.resources.iron = (newChar.base.resources.iron || 0) - costConfig.iron;
        newChar.base.resources.stone = (newChar.base.resources.stone || 0) - costConfig.stone;

        const updateComp = (c: Companion) => {
            if (c.id === comp.id) {
                const updated = {
                    ...c,
                    liberationPotential: nextPot
                };
                return checkAndInitializeLiberationEligibility(updated, getCompanionPureCP(updated));
            }
            return c;
        };

        newChar.companions = (newChar.companions || []).map(updateComp);
        newChar.inactiveCompanions = (newChar.inactiveCompanions || []).map(updateComp);

        const successMsg = comp.isCustom
            ? `✨ ${comp.name} 대원의 [${costConfig.label}] 잠재력 돌파 완료! 이제 [클래스 시련 (1:1 결투)] 탭에서 1:1 시련을 도전하세요.`
            : `✨ ${comp.name} 대원의 [${costConfig.label}] 잠재력 돌파 완료! 일일 자격 판정을 거쳐 상위 클래스로 자동 해방됩니다.`;

        onUpdateCharacter(newChar, `[기지 잠재력 돌파소] ${comp.name} 대원이 ${costConfig.label} 잠재력 돌파에 성공했습니다!`);
        showFeedback(successMsg);
    };

    // 플레이어 잠재력 돌파 핸들러
    const handlePlayerBreakthrough = () => {
        if (!playerNextTier) {
            alert("이미 최고 잠재력(파이널 클래스)에 도달했습니다!");
            return;
        }

        const costConfig = BREAKTHROUGH_COSTS[playerNextTier];
        if (!costConfig) return;

        if (facilityLevel < costConfig.minLabLevel) {
            alert(`잠재력 돌파소 레벨이 부족합니다! (필요 레벨: Lv.${costConfig.minLabLevel}, 현재 레벨: Lv.${facilityLevel})`);
            return;
        }

        if (playerCP < costConfig.minCP) {
            alert(`순수 전투력이 부족합니다! (필요 순수 전투력: ${costConfig.minCP.toLocaleString()}, 현재: ${playerCP.toLocaleString()})`);
            return;
        }

        if (gold < costConfig.gold ||
            manaCrystal < costConfig.manaCrystal ||
            shinryokuFlower < costConfig.shinryoku_flower ||
            iron < costConfig.iron ||
            stone < costConfig.stone) {
            alert("잠재력 돌파에 필요한 재화나 자원이 부족합니다!");
            return;
        }

        const newChar: Character = JSON.parse(JSON.stringify(character));
        newChar.money -= costConfig.gold;
        if (!newChar.base) newChar.base = {} as any;
        if (!newChar.base.resources) newChar.base.resources = {} as any;
        newChar.base.resources.manaCrystal = (newChar.base.resources.manaCrystal || 0) - costConfig.manaCrystal;
        newChar.base.resources.shinryoku_flower = (newChar.base.resources.shinryoku_flower || 0) - costConfig.shinryoku_flower;
        newChar.base.resources.iron = (newChar.base.resources.iron || 0) - costConfig.iron;
        newChar.base.resources.stone = (newChar.base.resources.stone || 0) - costConfig.stone;

        newChar.liberationPotential = playerNextTier;

        onUpdateCharacter(newChar, `[잠재력 돌파] 플레이어의 잠재력이 ${costConfig.label}로 각성되었습니다! 이제 ${costConfig.label} 시련에 도전할 수 있습니다.`);
        showFeedback(`🌟 당신의 잠재력이 [${costConfig.label}]로 각성되었습니다! 이제 ${costConfig.label} 시련에 도전할 수 있습니다.`);
    };

    // 클래스 시련 환영/모형 생성 및 전투 개시 (도전자 신력 계통에 맞춘 1:1 결투)
    const handleStartTrial = (tierToFight: ClassTier, explicitChallengerId?: string) => {
        if (!onBattle) {
            alert("전투 시스템에 연결할 수 없습니다.");
            return;
        }

        const effectiveChallengerId = explicitChallengerId || trialChallengerId;
        const isPlayer = effectiveChallengerId === 'player';
        const challengerComp = !isPlayer ? allComps.find(c => c.id === effectiveChallengerId) : null;
        
        if (!isPlayer && challengerComp && challengerComp.potentialAppraised !== true) {
            alert(`도전자 [${challengerComp.name}]의 한계 잠재력이 아직 감정되지 않았습니다. 먼저 마을 거주구역의 예언가 사바스에게 감정받으십시오.`);
            return;
        }
        
        // 잠재력 도달 여부 검사 (잠재력이 해당 클래스 이상으로 돌파되어 있어야 시련 도전 가능)
        const challengerPot = isPlayer
            ? (character.liberationPotential || ClassTier.FIRST)
            : (challengerComp?.liberationPotential || (challengerComp as any)?.potentialTier || ClassTier.FIRST);
        
        const challengerPotRank = getTierRank(challengerPot);
        const targetStageRank = getTierRank(tierToFight);
        
        if (challengerPotRank < targetStageRank) {
            const targetStageObj = TRIAL_STAGES.find(s => s.tier === tierToFight);
            alert(`시련 도전 자격이 부족합니다!\n도전자 [${isPlayer ? character.name : (challengerComp?.name || '동료')}]의 잠재력을 먼저 [${targetStageObj?.label || '해당 클래스'} 잠재력]으로 돌파해야 시련에 도전할 수 있습니다.`);
            return;
        }

        const targetShinryoku = isPlayer ? character.shinryokuType : (challengerComp?.shinryokuType || '무');
        const messengerInfo = getTrialMessengerForShinryoku(targetShinryoku);
        const trialEnemy = getTrialEnemyForTier(tierToFight, messengerInfo, isPlayer, effectiveChallengerId);

        onClose();
        // 동료가 개입할 수 없는 순수 1:1 결투로 시련 발동
        onBattle(trialEnemy, 'final_trial_battle', isPlayer ? 'player' : effectiveChallengerId);
    };

    const handleStartFinalTrial = () => {
        handleStartTrial(selectedTrialTier || ClassTier.FINAL);
    };

    const hasTrialCleared = character.hasClearedFinalTrial || character.finalTrialCleared;

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/85 backdrop-blur-md p-1.5 sm:p-4 animate-in fade-in duration-200">
            <div className="bg-slate-950 border border-slate-800 rounded-2xl sm:rounded-3xl w-full max-w-5xl h-[95vh] sm:max-h-[92vh] flex flex-col shadow-2xl overflow-hidden text-slate-100">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 sm:px-6 sm:py-4 border-b border-slate-800/80 bg-slate-900/60 shrink-0">
                    <div className="flex items-center gap-2 sm:gap-3">
                        <div className="p-2 sm:p-2.5 bg-gradient-to-br from-amber-500/20 to-indigo-500/20 border border-amber-500/40 rounded-xl sm:rounded-2xl text-amber-400 shrink-0">
                            <Sparkles size={18} className="sm:w-[22px] sm:h-[22px]" />
                        </div>
                        <div>
                            <div className="flex items-center gap-1.5 sm:gap-2">
                                <h2 className="text-sm sm:text-lg font-black tracking-tight text-white leading-tight">
                                    {isHallOfTrials ? '신계 시련의 전당' : '기지 잠재력 돌파소'}
                                </h2>
                                {!isHallOfTrials && (
                                    <span className="text-[10px] sm:text-xs px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 font-bold shrink-0">
                                        시설 Lv.{facilityLevel}
                                    </span>
                                )}
                            </div>
                            <p className="text-[10px] sm:text-xs text-slate-400 mt-0.5 line-clamp-1 sm:line-clamp-none">
                                {isHallOfTrials
                                    ? '신성한 신력의 환영과 신의 사자 모형을 상대로 한계를 시험하는 1:1 진검승부의 장입니다.'
                                    : '대원과 플레이어의 영혼에 잠든 한계를 깨워 상위 클래스로의 해방 자격을 획득합니다.'}
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={onClose}
                        className="p-1.5 sm:p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                        title="닫기"
                    >
                        <X size={18} className="sm:w-[20px] sm:h-[20px]" />
                    </button>
                </div>

                {/* Resource Quick Bar (Mobile horizontally scrollable) */}
                <div className="bg-slate-900/40 border-b border-slate-800/60 px-4 py-2 sm:px-6 sm:py-2.5 flex items-center justify-between gap-3 text-xs shrink-0 overflow-hidden">
                    <div className="flex items-center gap-3 sm:gap-4 overflow-x-auto no-scrollbar whitespace-nowrap py-1 select-none w-full sm:w-auto custom-scrollbar">
                        <span className="flex items-center gap-1.5 font-medium shrink-0">
                            <Coins size={14} className="text-amber-400" />
                            <span>골드:</span>
                            <strong className="text-amber-300">{gold.toLocaleString()}G</strong>
                        </span>
                        <span className="flex items-center gap-1.5 font-medium shrink-0">
                            <Gem size={14} className="text-purple-400" />
                            <span>마정석:</span>
                            <strong className="text-purple-300">{manaCrystal.toLocaleString()}개</strong>
                        </span>
                        <span className="flex items-center gap-1.5 font-medium shrink-0">
                            <Leaf size={14} className="text-pink-400" />
                            <span>신력 꽃:</span>
                            <strong className="text-pink-300">{shinryokuFlower.toLocaleString()}개</strong>
                        </span>
                        <span className="flex items-center gap-1.5 font-medium shrink-0">
                            <Mountain size={14} className="text-slate-400" />
                            <span>철광석:</span>
                            <strong className="text-slate-200">{iron.toLocaleString()}개</strong>
                        </span>
                        <span className="flex items-center gap-1.5 font-medium shrink-0">
                            <Pickaxe size={14} className="text-stone-400" />
                            <span>석재:</span>
                            <strong className="text-stone-300">{stone.toLocaleString()}개</strong>
                        </span>
                    </div>

                    {actionFeedback && (
                        <div className="hidden sm:block text-[11px] text-amber-300 font-semibold bg-amber-950/40 border border-amber-700/50 px-3 py-1 rounded-lg animate-pulse shrink-0">
                            {actionFeedback}
                        </div>
                    )}
                </div>

                {actionFeedback && (
                    <div className="sm:hidden bg-amber-950/50 border-b border-amber-800/40 px-4 py-1.5 text-[10px] text-amber-300 font-semibold text-center animate-pulse">
                        {actionFeedback}
                    </div>
                )}

                {/* Step Guide Banner (Toggleable for mobile efficiency) */}
                <div className="bg-slate-900/95 border border-amber-500/30 rounded-2xl p-2.5 sm:p-3.5 mx-4 sm:mx-6 mt-3 text-xs space-y-2 shrink-0">
                    <button
                        type="button"
                        onClick={() => setShowGuide(!showGuide)}
                        className="w-full font-bold text-amber-300 flex items-center justify-between gap-1.5 focus:outline-none"
                    >
                        <div className="flex items-center gap-1.5">
                            <Info size={14} />
                            <span>[잠재력 돌파 & 클래스 해방 3단계 순서 가이드]</span>
                        </div>
                        <span className="text-[10px] font-black px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-amber-200 select-none">
                            {showGuide ? '접기 ▲' : '열기 ▼'}
                        </span>
                    </button>
                    {showGuide && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px] text-slate-300 animate-in slide-in-from-top-2 duration-200">
                            <div className="bg-slate-950/70 p-2 sm:p-2.5 rounded-xl border border-slate-800 space-y-1">
                                <span className="font-bold text-amber-300 block">👤 플레이어 및 커스텀 동료 진행 순서</span>
                                <ol className="list-decimal list-inside space-y-0.5 text-slate-300 text-[10px] sm:text-[11px]">
                                    <li><strong className="text-slate-200">1단계:</strong> 예언가 사바스에게 <span className="text-slate-200 font-bold">[잠재력 감정]</span> 받기</li>
                                    <li><strong className="text-amber-300">2단계:</strong> 기지 돌파소에서 <span className="text-amber-300 font-bold">[잠재력 돌파]</span> 진행</li>
                                    <li><strong className="text-rose-300">3단계:</strong> 시련 탭에서 <span className="text-rose-300 font-bold">[1:1 시련 전투]</span> 통과 ➔ 클래스 해방!</li>
                                </ol>
                            </div>
                            <div className="bg-slate-950/70 p-2 sm:p-2.5 rounded-xl border border-slate-800 space-y-1">
                                <span className="font-bold text-purple-300 block">👥 일반 동료 진행 순서</span>
                                <ol className="list-decimal list-inside space-y-0.5 text-slate-300 text-[10px] sm:text-[11px]">
                                    <li><strong className="text-slate-200">1단계:</strong> 예언가 사바스에게 <span className="text-slate-200 font-bold">[잠재력 감정]</span> 받기</li>
                                    <li><strong className="text-amber-300">2단계:</strong> 기지 돌파소에서 <span className="text-amber-300 font-bold">[잠재력 돌파]</span> 진행</li>
                                    <li><strong className="text-emerald-300">3단계:</strong> 일일 자격 판정에 따라 <span className="text-emerald-300 font-bold">[자동 클래스 해방]</span> 대기</li>
                                </ol>
                            </div>
                        </div>
                    )}
                </div>

                {/* Tab Navigation (Horizontal scrolling for smaller width screens) */}
                <div className="flex border-b border-slate-800 bg-slate-950 px-4 sm:px-6 pt-2 sm:pt-3 gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar whitespace-nowrap shrink-0 custom-scrollbar">
                    <button
                        onClick={() => setActiveTab('companion')}
                        className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-t-xl text-[11px] sm:text-xs font-bold transition-all border-t border-x shrink-0 ${
                            activeTab === 'companion'
                                ? 'bg-slate-900 border-slate-700 text-amber-400 border-b-transparent shadow-sm'
                                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
                        }`}
                    >
                        <Users size={14} className="sm:w-[16px] sm:h-[16px]" />
                        <span>동료 잠재력 돌파</span>
                        <span className="px-1.5 py-0.2 rounded-full bg-slate-800 text-[9px] sm:text-[10px] text-slate-300 shrink-0">
                            {allComps.length}명
                        </span>
                    </button>

                    <button
                        onClick={() => setActiveTab('companion_limit')}
                        className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-t-xl text-[11px] sm:text-xs font-bold transition-all border-t border-x shrink-0 ${
                            activeTab === 'companion_limit'
                                ? 'bg-slate-900 border-slate-700 text-purple-400 border-b-transparent shadow-sm'
                                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
                        }`}
                    >
                        <Lock size={14} className="text-purple-400 sm:w-[16px] sm:h-[16px]" />
                        <span>잠재력 제한</span>
                        <span className="px-1.5 py-0.2 rounded-full bg-purple-950/80 border border-purple-800 text-[9px] sm:text-[10px] text-purple-300 font-bold shrink-0">
                            슬롯 확장
                        </span>
                    </button>

                    <button
                        onClick={() => setActiveTab('player')}
                        className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-t-xl text-[11px] sm:text-xs font-bold transition-all border-t border-x shrink-0 ${
                            activeTab === 'player'
                                ? 'bg-slate-900 border-slate-700 text-cyan-400 border-b-transparent shadow-sm'
                                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
                        }`}
                    >
                        <User size={14} className="sm:w-[16px] sm:h-[16px]" />
                        <span>플레이어 잠재력 돌파</span>
                        <span className="px-2 py-0.2 rounded-full bg-cyan-950/60 border border-cyan-800 text-[9px] sm:text-[10px] text-cyan-300 shrink-0">
                            {playerPotential === ClassTier.FIRST ? '퍼스트' :
                             playerPotential === ClassTier.SECOND ? '세컨드' :
                             playerPotential === ClassTier.LAST ? '라스트' :
                             playerPotential === ClassTier.FINAL ? '파이널' : '초기'}
                        </span>
                    </button>

                    <button
                        onClick={() => setActiveTab('final_trial')}
                        className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-t-xl text-[11px] sm:text-xs font-bold transition-all border-t border-x shrink-0 ${
                            activeTab === 'final_trial'
                                ? 'bg-slate-900 border-slate-700 text-rose-400 border-b-transparent shadow-sm'
                                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
                        }`}
                    >
                        <Flame size={14} className="text-rose-400 sm:w-[16px] sm:h-[16px]" />
                        <span>클래스 시련 (1:1 결투)</span>
                        <span className="px-1.5 py-0.2 rounded-full bg-rose-950 border border-rose-800 text-[9px] sm:text-[10px] text-rose-300 font-bold shrink-0">
                            시련 전당
                        </span>
                    </button>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto p-3 sm:p-6 bg-slate-900/20">
                    {/* TAB 1: 동료 잠재력 돌파 */}
                    {activeTab === 'companion' && (
                        <div className="space-y-4 animate-in fade-in duration-150">
                            <div className="bg-slate-900/80 border border-indigo-900/50 rounded-2xl p-3 sm:p-4 space-y-2.5 text-xs">
                                <h4 className="font-bold text-amber-300 flex items-center gap-2 text-sm">
                                    <Award size={16} className="text-amber-400" />
                                    동료 클래스 해방 3단계 절차 안내
                                </h4>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
                                    <div className="bg-slate-950/80 p-2 sm:p-2.5 rounded-xl border border-slate-800 space-y-1">
                                        <span className="text-indigo-400 font-bold block flex items-center gap-1 text-[10px] sm:text-[11px]">
                                            <Sparkles size={12} /> 1단계: 예언가 감정
                                        </span>
                                        <p className="text-slate-400 text-[10px] leading-relaxed">마을 거주구역의 예언가 사바스에게 동료의 영혼을 감정받아 한계 자질을 확인합니다.</p>
                                    </div>
                                    <div className="bg-slate-950/80 p-2 sm:p-2.5 rounded-xl border border-amber-900/40 space-y-1">
                                        <span className="text-amber-400 font-bold block flex items-center gap-1 text-[10px] sm:text-[11px]">
                                            <ArrowUpCircle size={12} /> 2단계: 잠재력 돌파
                                        </span>
                                        <p className="text-slate-400 text-[10px] leading-relaxed">본 돌파소에서 요구 자원과 전투력을 갖춰 다음 단계 클래스 잠재력을 개방합니다.</p>
                                    </div>
                                    <div className="bg-slate-950/80 p-2 sm:p-2.5 rounded-xl border border-rose-900/40 space-y-1">
                                        <span className="text-rose-400 font-bold block flex items-center gap-1 text-[10px] sm:text-[11px]">
                                            <Flame size={12} /> 3단계: 클래스 최종 해방
                                        </span>
                                        <p className="text-slate-400 text-[10px] leading-relaxed">커스텀 동료는 1:1 시련 통과 시, 일반 동료는 일일 자동해방 확률로 클래스가 해방됩니다.</p>
                                    </div>
                                </div>
                                <p className="text-[10px] text-slate-500 pt-0.5 leading-relaxed">
                                    • 최소 전투력 요구치: <strong className="text-blue-300">퍼스트 {BREAKTHROUGH_COSTS[ClassTier.FIRST]?.minCP?.toLocaleString() || '5,000'}</strong> / <strong className="text-purple-300">세컨드 {BREAKTHROUGH_COSTS[ClassTier.SECOND]?.minCP?.toLocaleString() || '25,000'}</strong> / <strong className="text-red-300">라스트 {BREAKTHROUGH_COSTS[ClassTier.LAST]?.minCP?.toLocaleString() || '100,000'}</strong> / <strong className="text-amber-300">파이널 {BREAKTHROUGH_COSTS[ClassTier.FINAL]?.minCP?.toLocaleString() || '500,000'}</strong>
                                </p>
                            </div>

                            {allComps.length === 0 ? (
                                <div className="py-16 text-center text-slate-500">
                                    보유 중인 동료 대원이 없습니다.
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {/* 깔끔한 정렬 및 필터 바 (Clean Sorting & Filter Bar) */}
                                    <div className="bg-slate-950/80 border border-slate-800 p-3 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-md">
                                        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[280px]">
                                            {/* 검색 */}
                                            <div className="relative flex-1 min-w-[160px] max-w-xs">
                                                <input 
                                                    type="text"
                                                    value={compSearchQuery}
                                                    onChange={e => setCompSearchQuery(e.target.value)}
                                                    placeholder="이름, 직업, 계통 검색..."
                                                    className="w-full bg-slate-900/90 border border-slate-800 rounded-xl pl-3 pr-8 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20"
                                                />
                                                {compSearchQuery && (
                                                    <button 
                                                        onClick={() => setCompSearchQuery('')}
                                                        className="absolute right-2.5 top-2 text-slate-500 hover:text-slate-300 text-[11px] font-bold p-0.5"
                                                    >
                                                        ✕
                                                    </button>
                                                )}
                                            </div>

                                            {/* 필터 */}
                                            <select
                                                value={compFilterBy}
                                                onChange={e => setCompFilterBy(e.target.value as any)}
                                                className="bg-slate-900/90 border border-slate-800 text-xs text-slate-300 rounded-xl px-3 py-2 focus:outline-none focus:border-amber-500 font-medium"
                                            >
                                                <option value="all">전체 동료 ({allComps.length})</option>
                                                <option value="appraised">감정 완료</option>
                                                <option value="unappraised">감정 대기</option>
                                                <option value="custom">커스텀 동료</option>
                                                <option value="normal">일반 동료</option>
                                                <option value="ready">돌파 대기 (자원/조건 만족)</option>
                                            </select>

                                            {/* 정렬 */}
                                            <select
                                                value={compSortBy}
                                                onChange={e => setCompSortBy(e.target.value as any)}
                                                className="bg-slate-900/90 border border-slate-800 text-xs text-slate-300 rounded-xl px-3 py-2 focus:outline-none focus:border-amber-500 font-medium"
                                            >
                                                <option value="cp_desc">전투력 높은 순</option>
                                                <option value="cp_asc">전투력 낮은 순</option>
                                                <option value="level_desc">레벨 높은 순</option>
                                                <option value="level_asc">레벨 낮은 순</option>
                                                <option value="potential_desc">잠재 등급 높은 순</option>
                                                <option value="name_asc">이름 가나다 순</option>
                                            </select>
                                        </div>
                                        <div className="text-[10px] text-slate-500 font-medium">
                                            검색 결과: <strong className="text-amber-400">{processedComps.length}</strong>명 / 총 {allComps.length}명
                                        </div>
                                    </div>

                                    {processedComps.length === 0 ? (
                                        <div className="py-12 text-center text-slate-500 bg-slate-950/20 border border-slate-800/50 rounded-2xl">
                                            조건에 만족하는 동료 대원이 없습니다.
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 gap-3">
                                            {processedComps.map(comp => {
                                        const initialized = checkAndInitializeLiberationEligibility({ ...comp }, getCompanionPureCP(comp));
                                        const cp = getCompanionPureCP(comp);
                                        const hasAppraised = comp.potentialAppraised === true;
                                        const isLiberationNone = (comp.liberationEligibility as any) === 'none' || initialized.liberationPotential === ClassTier.F || initialized.liberationPotential === ClassTier.NONE;
                                        const currentPot = initialized.liberationPotential || ClassTier.NONE;
                                        const nextPot = getCompanionNextPotentialTier(currentPot, comp.isCustom);
                                        const costConfig = nextPot ? BREAKTHROUGH_COSTS[nextPot] : null;

                                        const canAfford = costConfig ? (
                                            gold >= costConfig.gold &&
                                            manaCrystal >= costConfig.manaCrystal &&
                                            shinryokuFlower >= costConfig.shinryoku_flower &&
                                            iron >= costConfig.iron &&
                                            stone >= costConfig.stone
                                        ) : false;

                                        const levelMeet = costConfig ? facilityLevel >= costConfig.minLabLevel : false;
                                        const cpMeet = costConfig ? cp >= costConfig.minCP : false;
                                        const trialMeet = comp.isCustom && nextPot
                                            ? checkTrialClearedForTier(nextPot, comp)
                                            : true;

                                        // 잠재력 돌파는 시련 통과 여부와 무관하게 2단계 진행 가능
                                        const canBreakthrough = hasAppraised && !isLiberationNone && canAfford && levelMeet && cpMeet && !!nextPot;

                                        return (
                                            <div
                                                key={comp.id}
                                                className={`p-4 rounded-2xl border transition-all ${
                                                    selectedCompanionId === comp.id
                                                        ? 'bg-slate-900 border-amber-500/50 shadow-lg shadow-amber-950/20'
                                                        : 'bg-slate-900/60 border-slate-800/80 hover:border-slate-700'
                                                }`}
                                            >
                                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                                    {/* Companion Profile */}
                                                    <div className="flex items-center gap-3 min-w-[240px]">
                                                        {comp.visualUrl ? (
                                                            <img
                                                                src={comp.visualUrl}
                                                                alt={comp.name}
                                                                className="w-12 h-12 rounded-xl object-cover border border-slate-700 bg-slate-800 flex-shrink-0"
                                                                referrerPolicy="no-referrer"
                                                            />
                                                        ) : (
                                                            <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 font-bold flex-shrink-0">
                                                                {comp.name.charAt(0)}
                                                            </div>
                                                        )}
                                                        <div>
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-bold text-sm text-slate-100">{comp.name}</span>
                                                                <span className="text-[11px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-medium">
                                                                    Lv.{comp.level}
                                                                </span>
                                                                <span className="text-[11px] text-slate-400">
                                                                    {comp.job}
                                                                </span>
                                                                {comp.isCustom && (
                                                                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-purple-950 border border-purple-700/60 text-purple-300 font-bold">
                                                                        커스텀
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <div className="flex items-center gap-2 mt-1">
                                                                <span className="text-xs text-slate-400">
                                                                    순수 전투력: <strong className="text-amber-300">{cp.toLocaleString()}</strong>
                                                                </span>
                                                                <span className="text-slate-600">•</span>
                                                                {/* Potential Badge */}
                                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                                                    !hasAppraised
                                                                        ? 'text-slate-400 bg-slate-900/80 border-slate-700'
                                                                        : isLiberationNone
                                                                        ? 'text-rose-400 bg-rose-950/40 border-rose-900/50'
                                                                        : currentPot === ClassTier.NONE || !currentPot
                                                                        ? 'text-amber-300 bg-amber-950/40 border-amber-800/50'
                                                                        : currentPot === ClassTier.FIRST
                                                                        ? 'text-blue-400 bg-blue-950/40 border-blue-900/50'
                                                                        : currentPot === ClassTier.SECOND
                                                                        ? 'text-purple-400 bg-purple-950/40 border-purple-900/50'
                                                                        : currentPot === ClassTier.LAST
                                                                        ? 'text-red-400 bg-red-950/40 border-red-900/50'
                                                                        : 'text-amber-400 bg-amber-950/40 border-amber-500/30'
                                                                }`}>
                                                                    {!hasAppraised
                                                                        ? '미지 (감정 필요)'
                                                                        : isLiberationNone
                                                                        ? '해방 불가 (감정 완료)'
                                                                        : currentPot === ClassTier.NONE || !currentPot
                                                                        ? '감정 완료 (돌파 가능)'
                                                                        : currentPot === ClassTier.FIRST
                                                                        ? '퍼스트 클래스 잠재력'
                                                                        : currentPot === ClassTier.SECOND
                                                                        ? '세컨드 클래스 잠재력'
                                                                        : currentPot === ClassTier.LAST
                                                                        ? '라스트 클래스 잠재력'
                                                                        : currentPot === ClassTier.FINAL
                                                                        ? '파이널 클래스 잠재력'
                                                                        : currentPot}
                                                                </span>
                                                                {comp.isPotentialLocked && (
                                                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-950/80 border border-purple-600/60 text-purple-300 flex items-center gap-1">
                                                                        <Lock size={10} /> 잠재력 제한됨
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Breakthrough Requirements & Action */}
                                                    <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between md:justify-end flex-1">
                                                        {comp.isPotentialLocked ? (
                                                            <div className="text-xs text-purple-300 bg-purple-950/30 border border-purple-800/50 px-3 py-2 rounded-xl flex items-center gap-2 font-bold">
                                                                <Lock size={15} className="text-purple-400 flex-shrink-0" />
                                                                <span>잠재력 제한 설정됨 (추가 돌파 불가 · 레벨 100마다 스킬 슬롯 +1)</span>
                                                            </div>
                                                        ) : !hasAppraised ? (
                                                            <div className="text-xs text-amber-400/80 bg-amber-950/20 border border-amber-900/40 px-3 py-2 rounded-xl flex items-center gap-2">
                                                                <AlertCircle size={15} className="text-amber-400 flex-shrink-0" />
                                                                <span>[1단계] 예언가 사바스에게 잠재력 감정을 받아야 돌파할 수 있습니다.</span>
                                                            </div>
                                                        ) : isLiberationNone ? (
                                                            <div className="text-xs text-rose-400 bg-rose-950/30 border border-rose-900/40 px-3 py-2 rounded-xl flex items-center gap-2 font-medium">
                                                                <AlertCircle size={15} className="text-rose-400 flex-shrink-0" />
                                                                <span>예언가 진단 결과: 해방 한계에 도달하여 추가 돌파가 불가합니다.</span>
                                                            </div>
                                                        ) : nextPot && costConfig ? (
                                                            <div className="flex flex-col sm:items-end gap-2 w-full sm:w-auto">
                                                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] sm:justify-end">
                                                                    <span className={cpMeet ? 'text-slate-300' : 'text-rose-400 font-bold'}>
                                                                        필요 순수 전투력: {costConfig.minCP.toLocaleString()} ({cp.toLocaleString()})
                                                                    </span>
                                                                    <span className={levelMeet ? 'text-slate-400' : 'text-rose-400 font-bold'}>
                                                                        필요 시설: Lv.{costConfig.minLabLevel} (현재 Lv.{facilityLevel})
                                                                    </span>
                                                                    {comp.isCustom && (
                                                                        <div className="flex items-center gap-1.5">
                                                                            <span className={trialMeet ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>
                                                                                3단계 1:1 시련: {trialMeet ? '통과 완료' : '잠재력 돌파 후 도전'}
                                                                            </span>
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => {
                                                                                    setTrialChallengerId(comp.id);
                                                                                    setSelectedTrialTier(nextPot);
                                                                                    setActiveTab('final_trial');
                                                                                }}
                                                                                className="px-1.5 py-0.5 rounded bg-rose-950/80 border border-rose-700/60 text-[10px] text-rose-300 font-bold hover:bg-rose-900 transition flex items-center gap-0.5"
                                                                            >
                                                                                <Flame size={10} /> 시련 탭 이동
                                                                            </button>
                                                                        </div>
                                                                    )}
                                                                </div>

                                                                {/* Resources List */}
                                                                <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-400 sm:justify-end">
                                                                    <span className={gold >= costConfig.gold ? 'text-amber-300' : 'text-rose-400 font-semibold'}>
                                                                        {costConfig.gold.toLocaleString()}G
                                                                    </span>
                                                                    <span>•</span>
                                                                    <span className={manaCrystal >= costConfig.manaCrystal ? 'text-purple-300' : 'text-rose-400 font-semibold'}>
                                                                        마정석 {costConfig.manaCrystal}개
                                                                    </span>
                                                                    <span>•</span>
                                                                    <span className={shinryokuFlower >= costConfig.shinryoku_flower ? 'text-pink-300' : 'text-rose-400 font-semibold'}>
                                                                        꽃 {costConfig.shinryoku_flower}개
                                                                    </span>
                                                                    <span>•</span>
                                                                    <span className={iron >= costConfig.iron ? 'text-slate-300' : 'text-rose-400 font-semibold'}>
                                                                        철 {costConfig.iron}개
                                                                    </span>
                                                                    <span>•</span>
                                                                    <span className={stone >= costConfig.stone ? 'text-stone-300' : 'text-rose-400 font-semibold'}>
                                                                        석재 {costConfig.stone}개
                                                                    </span>
                                                                </div>

                                                                <button
                                                                    disabled={!canBreakthrough}
                                                                    onClick={() => handleCompanionBreakthrough(comp)}
                                                                    className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-md ${
                                                                        canBreakthrough
                                                                            ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-950/50 active:scale-95'
                                                                            : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                                                                    }`}
                                                                >
                                                                    <ArrowUpCircle size={14} />
                                                                    <span>{costConfig.label} 돌파</span>
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <div className="text-xs font-bold text-emerald-400 bg-emerald-950/30 px-3 py-2 rounded-xl border border-emerald-900/40 flex items-center gap-2">
                                                                <CheckCircle size={15} />
                                                                <span>{comp.isCustom ? (currentPot === ClassTier.FINAL ? '최고 잠재력 [파이널 클래스] 돌파 완료' : '잠재력 돌파 완료') : '라스트 클래스 도달 완료 (일반 동료 파이널 클래스 돌파는 불가능합니다.)'}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* TAB 1.5: 동료 잠재력 제한 */}
                    {activeTab === 'companion_limit' && (() => {
                        const customAllComps = allComps.filter(c => c.isCustom);
                        const customProcessedComps = processedComps.filter(c => c.isCustom);
                        return (
                        <div className="space-y-4 animate-in fade-in duration-150">
                            <div className="bg-slate-900/90 border border-purple-800/60 rounded-2xl p-3 sm:p-4 space-y-2.5 text-xs shadow-lg">
                                <div className="flex items-center justify-between flex-wrap gap-2">
                                    <h4 className="font-bold text-purple-300 flex items-center gap-2 text-sm">
                                        <Lock size={16} className="text-purple-400" />
                                        커스텀 동료 잠재력 제한 서약 안내
                                    </h4>
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                        <span className="px-2 py-0.5 rounded-full bg-purple-950/80 border border-purple-700/60 text-[10px] text-purple-300 font-bold">
                                            커스텀 동료 전용
                                        </span>
                                        <span className="px-2 py-0.5 rounded-full bg-rose-950/80 border border-rose-700/60 text-[10px] text-rose-300 font-bold">
                                            설정 후 영구 취소 불가
                                        </span>
                                    </div>
                                </div>
                                <p className="text-slate-300 text-[11px] sm:text-xs leading-relaxed">
                                    <strong className="text-purple-300">커스텀 동료</strong>의 현재 한계 잠재력을 <strong className="text-purple-300">영구적으로 제한(고정)</strong>하여 더 이상 상위 잠재력으로 돌파할 수 없게 만드는 대신,
                                    스킬북에서 <strong className="text-amber-300">해당 잠재력까지의 클래스 스킬 슬롯이 원래 닫히는 시점부터 레벨 100마다 1개씩 끝없이 추가</strong>되도록 개방합니다. (일반 동료는 설정 불가)
                                </p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-[10px] sm:text-[11px] pt-1">
                                    <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800 space-y-1">
                                        <span className="text-slate-300 font-bold block">• 미해방 슬롯 확장</span>
                                        <p className="text-slate-400 text-[10px]">기본 2슬롯 마감(Lv.20) 이후 Lv.120, Lv.220... 레벨 100마다 슬롯 +1개</p>
                                    </div>
                                    <div className="bg-slate-950/80 p-2.5 rounded-xl border border-blue-900/40 space-y-1">
                                        <span className="text-blue-300 font-bold block">• 퍼스트 클래스 슬롯 확장</span>
                                        <p className="text-slate-400 text-[10px]">기본 4슬롯 마감(Lv.90) 이후 Lv.190, Lv.290... 레벨 100마다 슬롯 +1개</p>
                                    </div>
                                    <div className="bg-slate-950/80 p-2.5 rounded-xl border border-purple-900/40 space-y-1">
                                        <span className="text-purple-300 font-bold block">• 세컨드 클래스 슬롯 확장</span>
                                        <p className="text-slate-400 text-[10px]">기본 5슬롯 마감(Lv.260) 이후 Lv.360, Lv.460... 레벨 100마다 슬롯 +1개</p>
                                    </div>
                                    <div className="bg-slate-950/80 p-2.5 rounded-xl border border-red-900/40 space-y-1">
                                        <span className="text-red-300 font-bold block">• 라스트 클래스 슬롯 확장</span>
                                        <p className="text-slate-400 text-[10px]">기본 7슬롯 마감(Lv.900) 이후 Lv.1000, Lv.1100... 레벨 100마다 슬롯 +1개</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[10px] sm:text-[11px] pt-1">
                                    <div className="bg-purple-950/30 p-2.5 rounded-xl border border-purple-700/40 flex items-center gap-2">
                                        <Sparkles size={14} className="text-purple-400 flex-shrink-0" />
                                        <div>
                                            <span className="text-purple-200 font-bold block">스킬 숙련도 2배 특화</span>
                                            <span className="text-slate-400 text-[10px]">전투 및 훈련 시 스킬 숙련도 획득량 2배 적용</span>
                                        </div>
                                    </div>
                                    <div className="bg-indigo-950/30 p-2.5 rounded-xl border border-indigo-700/40 flex items-center gap-2">
                                        <Zap size={14} className="text-indigo-400 flex-shrink-0" />
                                        <div>
                                            <span className="text-indigo-200 font-bold block">스킬 연구량 2배 특화</span>
                                            <span className="text-slate-400 text-[10px]">연구소 스킬 연마 시 숙련도 증가량 2배 적용</span>
                                        </div>
                                    </div>
                                    <div className="bg-amber-950/30 p-2.5 rounded-xl border border-amber-700/40 flex items-center gap-2">
                                        <Award size={14} className="text-amber-400 flex-shrink-0" />
                                        <div>
                                            <span className="text-amber-200 font-bold block">신화 장비 착용 허용</span>
                                            <span className="text-slate-400 text-[10px]">레벨 1000 달성 시 파이널 클래스가 아니어도 착용 가능</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {customAllComps.length === 0 ? (
                                <div className="py-16 text-center text-slate-500">
                                    보유 중인 커스텀 동료 대원이 없습니다. (잠재력 제한은 커스텀 동료만 가능합니다)
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {/* 검색 및 정렬 바 */}
                                    <div className="bg-slate-950/80 border border-slate-800 p-3 rounded-2xl flex flex-wrap items-center justify-between gap-2 shadow-md">
                                        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[240px]">
                                            <div className="relative flex-1 min-w-[140px] max-w-xs">
                                                <input
                                                    type="text"
                                                    value={compSearchQuery}
                                                    onChange={e => setCompSearchQuery(e.target.value)}
                                                    placeholder="이름, 직업, 계통 검색..."
                                                    className="w-full bg-slate-900/90 border border-slate-800 rounded-xl pl-3 pr-8 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-purple-500"
                                                />
                                                {compSearchQuery && (
                                                    <button
                                                        onClick={() => setCompSearchQuery('')}
                                                        className="absolute right-2.5 top-2 text-slate-500 hover:text-slate-300 text-[11px] font-bold p-0.5"
                                                    >
                                                        ✕
                                                    </button>
                                                )}
                                            </div>
                                            <select
                                                value={compSortBy}
                                                onChange={e => setCompSortBy(e.target.value as any)}
                                                className="bg-slate-900/90 border border-slate-800 text-xs text-slate-300 rounded-xl px-3 py-2 focus:outline-none focus:border-purple-500 font-medium"
                                            >
                                                <option value="cp_desc">전투력 높은 순</option>
                                                <option value="level_desc">레벨 높은 순</option>
                                                <option value="potential_desc">잠재 등급 높은 순</option>
                                                <option value="name_asc">이름 가나다 순</option>
                                            </select>
                                        </div>
                                        <div className="text-[10px] text-slate-400 font-medium">
                                            제한 설정됨: <strong className="text-purple-300">{customAllComps.filter(c => c.isPotentialLocked).length}</strong>명 / 커스텀 동료 총 {customAllComps.length}명
                                        </div>
                                    </div>

                                    {customProcessedComps.length === 0 ? (
                                        <div className="py-12 text-center text-slate-500 bg-slate-950/20 border border-slate-800/50 rounded-2xl">
                                            검색 조건에 일치하는 커스텀 동료가 없습니다.
                                        </div>
                                    ) : (
                                    <div className="grid grid-cols-1 gap-3">
                                        {customProcessedComps.map(comp => {
                                            const initialized = checkAndInitializeLiberationEligibility({ ...comp }, getCompanionPureCP(comp));
                                            const cp = getCompanionPureCP(comp);
                                            const hasAppraised = comp.potentialAppraised === true;
                                            const rawPot = initialized.liberationPotential || ClassTier.NONE;
                                            const normalizedPot = (rawPot === ClassTier.F || (comp.liberationEligibility as any) === 'none') ? ClassTier.NONE : rawPot;
                                            const isFinalPot = normalizedPot === ClassTier.FINAL;
                                            const isLocked = comp.isPotentialLocked === true;
                                            const limitCost = POTENTIAL_LIMIT_COSTS[normalizedPot] || POTENTIAL_LIMIT_COSTS[ClassTier.NONE];

                                            const canAffordLimit =
                                                gold >= limitCost.gold &&
                                                manaCrystal >= limitCost.manaCrystal &&
                                                shinryokuFlower >= limitCost.shinryoku_flower;

                                            const canLock = Boolean(comp.isCustom) && hasAppraised && !isLocked && !isFinalPot && canAffordLimit;

                                            // 현재 레벨 기준 추가 개방되는 슬롯 미리보기 계산
                                            const bonusFirstSlots = comp.level >= 90 ? Math.floor((comp.level - 90) / 100) : 0;
                                            const bonusSecondSlots = comp.level >= 260 ? Math.floor((comp.level - 260) / 100) : 0;
                                            const bonusLastSlots = comp.level >= 900 ? Math.floor((comp.level - 900) / 100) : 0;
                                            const bonusNoneSlots = comp.level >= 20 ? Math.floor((comp.level - 20) / 100) : 0;

                                            return (
                                                <div
                                                    key={comp.id}
                                                    className={`p-3.5 sm:p-4 rounded-2xl border transition-all ${
                                                        isLocked
                                                            ? 'bg-purple-950/20 border-purple-700/50 shadow-md shadow-purple-950/20'
                                                            : 'bg-slate-900/60 border-slate-800/80 hover:border-slate-700'
                                                    }`}
                                                >
                                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3.5">
                                                        {/* 동료 기본 정보 */}
                                                        <div className="flex items-center gap-3 min-w-[220px]">
                                                            {comp.visualUrl ? (
                                                                <img
                                                                    src={comp.visualUrl}
                                                                    alt={comp.name}
                                                                    className="w-12 h-12 rounded-xl object-cover border border-slate-700 bg-slate-800 flex-shrink-0"
                                                                    referrerPolicy="no-referrer"
                                                                />
                                                            ) : (
                                                                <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 font-bold flex-shrink-0">
                                                                    {comp.name.charAt(0)}
                                                                </div>
                                                            )}
                                                            <div>
                                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                                    <span className="font-bold text-sm text-slate-100">{comp.name}</span>
                                                                    <span className="text-[11px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-medium">
                                                                        Lv.{comp.level}
                                                                    </span>
                                                                    <span className="text-[11px] text-slate-400">{comp.job}</span>
                                                                    {comp.isCustom && (
                                                                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-purple-950 border border-purple-700/60 text-purple-300 font-bold">
                                                                            커스텀
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <div className="flex items-center gap-2 mt-1 flex-wrap">
                                                                    <span className="text-xs text-slate-400">
                                                                        순수 전투력: <strong className="text-amber-300">{cp.toLocaleString()}</strong>
                                                                    </span>
                                                                    <span className="text-slate-600">•</span>
                                                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                                                        !hasAppraised
                                                                            ? 'text-slate-400 bg-slate-900/80 border-slate-700'
                                                                            : normalizedPot === ClassTier.NONE
                                                                            ? 'text-slate-300 bg-slate-900 border-slate-700'
                                                                            : normalizedPot === ClassTier.FIRST
                                                                            ? 'text-blue-400 bg-blue-950/40 border-blue-900/50'
                                                                            : normalizedPot === ClassTier.SECOND
                                                                            ? 'text-purple-400 bg-purple-950/40 border-purple-900/50'
                                                                            : normalizedPot === ClassTier.LAST
                                                                            ? 'text-red-400 bg-red-950/40 border-red-900/50'
                                                                            : 'text-amber-400 bg-amber-950/40 border-amber-500/30'
                                                                    }`}>
                                                                        {!hasAppraised
                                                                            ? '미지 (감정 필요)'
                                                                            : normalizedPot === ClassTier.NONE
                                                                            ? '미해방 한계 잠재력'
                                                                            : normalizedPot === ClassTier.FIRST
                                                                            ? '퍼스트 클래스 잠재력'
                                                                            : normalizedPot === ClassTier.SECOND
                                                                            ? '세컨드 클래스 잠재력'
                                                                            : normalizedPot === ClassTier.LAST
                                                                            ? '라스트 클래스 잠재력'
                                                                            : '파이널 클래스 잠재력'}
                                                                    </span>
                                                                    {isLocked && (
                                                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-950 border border-purple-500/60 text-purple-200 flex items-center gap-1">
                                                                            <Lock size={10} /> 잠재력 제한 적용 중
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                {hasAppraised && !isFinalPot && (
                                                                    <div className="space-y-0.5 mt-1">
                                                                        <p className="text-[10px] text-purple-300/90">
                                                                            효과: {limitCost.baseCloseDesc}
                                                                            {normalizedPot === ClassTier.FIRST && ` (현재 Lv.${comp.level} 기준 퍼스트 슬롯 +${bonusFirstSlots}개 추가)`}
                                                                            {normalizedPot === ClassTier.SECOND && ` (현재 Lv.${comp.level} 기준 퍼스트 +${bonusFirstSlots}개 / 세컨드 +${bonusSecondSlots}개 추가)`}
                                                                            {normalizedPot === ClassTier.LAST && ` (현재 Lv.${comp.level} 기준 퍼스트 +${bonusFirstSlots}개 / 세컨드 +${bonusSecondSlots}개 / 라스트 +${bonusLastSlots}개 추가)`}
                                                                            {normalizedPot === ClassTier.NONE && ` (현재 Lv.${comp.level} 기준 미해방 슬롯 +${bonusNoneSlots}개 추가)`}
                                                                        </p>
                                                                        <p className="text-[10px] text-indigo-300 font-semibold">
                                                                            특화: 스킬 숙련도 획득량 2배 · 스킬 연구량 2배 · Lv.1000 달성 시 신화 장비 착용 가능
                                                                        </p>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {/* 잠재력 제한 비용 및 버튼 영역 */}
                                                        <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between md:justify-end flex-1">
                                                            {!hasAppraised ? (
                                                                <div className="text-xs text-amber-400/80 bg-amber-950/20 border border-amber-900/40 px-3 py-2 rounded-xl flex items-center gap-2">
                                                                    <AlertCircle size={15} className="text-amber-400 flex-shrink-0" />
                                                                    <span>예언가 사바스에게 잠재력을 감정받은 후 설정할 수 있습니다.</span>
                                                                </div>
                                                            ) : isLocked ? (
                                                                <div className="text-xs font-bold text-purple-300 bg-purple-950/40 px-3.5 py-2 rounded-xl border border-purple-700/50 flex items-center gap-2">
                                                                    <CheckCircle size={15} className="text-purple-400 flex-shrink-0" />
                                                                    <span>잠재력 제한 적용 중 (슬롯 무한 확장 · 숙련도 및 연구 2배 특화)</span>
                                                                </div>
                                                            ) : isFinalPot ? (
                                                                <div className="text-xs text-slate-400 bg-slate-900/80 border border-slate-800 px-3 py-2 rounded-xl flex items-center gap-2">
                                                                    <Info size={15} className="text-slate-400 flex-shrink-0" />
                                                                    <span>파이널 클래스 잠재력은 이미 최고 단계입니다.</span>
                                                                </div>
                                                            ) : confirmLockCompId === comp.id ? (
                                                                <div className="bg-rose-950/40 border border-rose-700/70 rounded-xl p-2.5 sm:p-3 flex flex-col gap-2 w-full sm:w-auto max-w-md animate-in fade-in duration-150">
                                                                    <div className="text-[11px] text-rose-200 font-bold flex items-start gap-1.5 leading-snug">
                                                                        <AlertCircle size={14} className="text-rose-400 shrink-0 mt-0.5" />
                                                                        <span>
                                                                            정말로 [{comp.name}]의 잠재력을 현재 단계({normalizedPot})로 제한하시겠습니까? 설정 후에는 절대 취소할 수 없으며 잠재력을 더 높일 수 없습니다.
                                                                        </span>
                                                                    </div>
                                                                    <div className="flex items-center justify-end gap-2">
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => setConfirmLockCompId(null)}
                                                                            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition"
                                                                        >
                                                                            취소
                                                                        </button>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => handleLockCompanionPotential(comp)}
                                                                            className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition shadow-md flex items-center gap-1"
                                                                        >
                                                                            <Lock size={12} />
                                                                            <span>영구 제한 확정</span>
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <div className="flex flex-col sm:items-end gap-2 w-full sm:w-auto">
                                                                    <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-400 sm:justify-end">
                                                                        <span className={gold >= limitCost.gold ? 'text-amber-300' : 'text-rose-400 font-semibold'}>
                                                                            {limitCost.gold.toLocaleString()}G
                                                                        </span>
                                                                        <span>•</span>
                                                                        <span className={manaCrystal >= limitCost.manaCrystal ? 'text-purple-300' : 'text-rose-400 font-semibold'}>
                                                                            마정석 {limitCost.manaCrystal}개
                                                                        </span>
                                                                        <span>•</span>
                                                                        <span className={shinryokuFlower >= limitCost.shinryoku_flower ? 'text-pink-300' : 'text-rose-400 font-semibold'}>
                                                                            신력 꽃 {limitCost.shinryoku_flower}개
                                                                        </span>
                                                                    </div>
                                                                    <button
                                                                        type="button"
                                                                        disabled={!canLock}
                                                                        onClick={() => setConfirmLockCompId(comp.id)}
                                                                        className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-md w-full sm:w-auto ${
                                                                            canLock
                                                                                ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-purple-950/50 active:scale-95'
                                                                                : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                                                                        }`}
                                                                    >
                                                                        <Lock size={13} />
                                                                        <span>잠재력 제한 설정 (취소 불가)</span>
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                    )}
                                </div>
                            )}
                        </div>
                        );
                    })()}

                    {/* TAB 2: 플레이어 잠재력 돌파 */}
                    {activeTab === 'player' && (
                        <div className="space-y-6">
                            {/* Player Overview Card */}
                            <div className="bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl relative overflow-hidden">
                                <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
                                    <div className="flex items-center gap-4">
                                        <div className="w-16 h-16 rounded-2xl bg-slate-800 border-2 border-indigo-500/40 flex items-center justify-center text-xl font-black text-indigo-300 shadow-inner overflow-hidden flex-shrink-0">
                                            {character.visualUrl ? (
                                                <img
                                                    src={character.visualUrl}
                                                    alt={character.name}
                                                    className="w-full h-full object-cover"
                                                    referrerPolicy="no-referrer"
                                                />
                                            ) : (
                                                character.name.charAt(0)
                                            )}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <h3 className="text-lg font-black text-white">{character.name}</h3>
                                                <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300 font-bold">
                                                    Lv.{character.level}
                                                </span>
                                                <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-950/60 border border-indigo-800 text-indigo-300 font-medium">
                                                    {character.job}
                                                </span>
                                                {character.shinryokuType && character.shinryokuType !== '미개방' && (
                                                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-950/50 border border-amber-700 text-amber-300 font-medium">
                                                        {character.shinryokuType}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-4 mt-2 text-xs text-slate-300">
                                                <span>
                                                    순수 전투력: <strong className="text-amber-400 font-bold text-sm">{playerCP.toLocaleString()}</strong>
                                                </span>
                                                <span>•</span>
                                                <span>
                                                    현재 잠재력: <strong className="text-cyan-400 font-bold">{
                                                        playerPotential === ClassTier.FIRST ? '퍼스트 클래스' :
                                                        playerPotential === ClassTier.SECOND ? '세컨드 클래스' :
                                                        playerPotential === ClassTier.LAST ? '라스트 클래스' :
                                                        playerPotential === ClassTier.FINAL ? '파이널 클래스' : playerPotential
                                                    }</strong>
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Progression Roadmap Visual */}
                                    <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 bg-slate-950/70 p-2 sm:p-3 rounded-2xl border border-slate-800 text-[11px] sm:text-xs">
                                        <div className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-xl font-bold flex items-center gap-1 ${
                                            playerPotential === ClassTier.FIRST ? 'bg-blue-900/50 border border-blue-600 text-blue-300' : 'bg-slate-900 text-slate-400'
                                        }`}>
                                            퍼스트
                                        </div>
                                        <ChevronRight size={12} className="text-slate-600 shrink-0" />
                                        <div className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-xl font-bold flex items-center gap-1 ${
                                            playerPotential === ClassTier.SECOND ? 'bg-purple-900/50 border border-purple-600 text-purple-300' : 'bg-slate-900 text-slate-400'
                                        }`}>
                                            세컨드
                                        </div>
                                        <ChevronRight size={12} className="text-slate-600 shrink-0" />
                                        <div className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-xl font-bold flex items-center gap-1 ${
                                            playerPotential === ClassTier.LAST ? 'bg-red-900/50 border border-red-600 text-red-300' : 'bg-slate-900 text-slate-400'
                                        }`}>
                                            라스트
                                        </div>
                                        <ChevronRight size={12} className="text-slate-600 shrink-0" />
                                        <div className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-xl font-bold flex items-center gap-1 ${
                                            playerPotential === ClassTier.FINAL ? 'bg-amber-500/20 border border-amber-500 text-amber-300' : 'bg-slate-900 text-slate-400'
                                        }`}>
                                            파이널
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Player Next Breakthrough Card */}
                            {playerNextTier ? (
                                (() => {
                                    const costConfig = BREAKTHROUGH_COSTS[playerNextTier]!;
                                    const canAfford = (
                                        gold >= costConfig.gold &&
                                        manaCrystal >= costConfig.manaCrystal &&
                                        shinryokuFlower >= costConfig.shinryoku_flower &&
                                        iron >= costConfig.iron &&
                                        stone >= costConfig.stone
                                    );
                                    const levelMeet = facilityLevel >= costConfig.minLabLevel;
                                    const cpMeet = playerCP >= costConfig.minCP;
                                    const trialRequired = Boolean(playerNextTier);
                                    const playerTrialCleared = checkTrialClearedForTier(playerNextTier, character);

                                    // 2단계 잠재력 돌파는 1:1 시련 전 진행 가능 (돌파 후 3단계 1:1 시련 도전)
                                    const canBreakthrough = canAfford && levelMeet && cpMeet;

                                    return (
                                        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 space-y-6">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">다음 잠재력 단계</span>
                                                    <h4 className="text-xl font-black text-white mt-0.5">
                                                        [{costConfig.label}] 잠재력 돌파
                                                    </h4>
                                                    <p className="text-xs text-slate-400 mt-1">
                                                        {costConfig.description}
                                                    </p>
                                                </div>

                                                <div className="text-right">
                                                    <span className="text-xs text-slate-400">해방 가능 개방 레벨</span>
                                                    <div className="text-base font-black text-amber-400">
                                                        {playerNextTier === ClassTier.SECOND ? 'Lv.100' :
                                                         playerNextTier === ClassTier.LAST ? 'Lv.300' :
                                                         playerNextTier === ClassTier.FINAL ? 'Lv.1000' : 'Lv.30'}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Requirements Grid */}
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                {/* Left: Progression Conditions */}
                                                <div className="bg-slate-950/60 rounded-2xl p-4 border border-slate-800/80 space-y-3">
                                                    <span className="text-xs font-bold text-slate-300 block mb-2">필수 조건 점검</span>
                                                    
                                                    <div className="flex items-center justify-between text-xs py-1.5 border-b border-slate-900">
                                                        <span className="text-slate-400">돌파소 시설 레벨</span>
                                                        <span className={`font-bold flex items-center gap-1.5 ${levelMeet ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                            {levelMeet ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
                                                            필요: Lv.{costConfig.minLabLevel} (현재 Lv.{facilityLevel})
                                                        </span>
                                                    </div>

                                                    <div className="flex items-center justify-between text-xs py-1.5 border-b border-slate-900">
                                                        <span className="text-slate-400">요구 전투력(CP)</span>
                                                        <span className={`font-bold flex items-center gap-1.5 ${cpMeet ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                            {cpMeet ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
                                                            필요: {costConfig.minCP.toLocaleString()} (현재 {playerCP.toLocaleString()})
                                                        </span>
                                                    </div>

                                                    {trialRequired && (
                                                        <div className="flex items-center justify-between text-xs py-1.5 border-b border-slate-900">
                                                            <span className="text-slate-400">3단계 1:1 시련 ({costConfig.label})</span>
                                                            <span className={`font-bold flex items-center gap-1.5 ${playerTrialCleared ? 'text-emerald-400' : 'text-amber-300'}`}>
                                                                {playerTrialCleared ? <CheckCircle size={14} /> : <Info size={14} />}
                                                                {playerTrialCleared ? '시련 통과 완료' : '잠재력 돌파 후 시련 탭에서 도전'}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Right: Resources Required */}
                                                <div className="bg-slate-950/60 rounded-2xl p-4 border border-slate-800/80 space-y-3">
                                                    <span className="text-xs font-bold text-slate-300 block mb-2">소모 재화 및 자원</span>
                                                    
                                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                                        <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between">
                                                            <span className="text-slate-400 flex items-center gap-1">
                                                                <Coins size={13} className="text-amber-400" /> 골드
                                                            </span>
                                                            <span className={gold >= costConfig.gold ? 'text-amber-300 font-bold' : 'text-rose-400 font-bold'}>
                                                                {costConfig.gold.toLocaleString()}G
                                                            </span>
                                                        </div>

                                                        <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between">
                                                            <span className="text-slate-400 flex items-center gap-1">
                                                                <Gem size={13} className="text-purple-400" /> 마정석
                                                            </span>
                                                            <span className={manaCrystal >= costConfig.manaCrystal ? 'text-purple-300 font-bold' : 'text-rose-400 font-bold'}>
                                                                {costConfig.manaCrystal}개
                                                            </span>
                                                        </div>

                                                        <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between">
                                                            <span className="text-slate-400 flex items-center gap-1">
                                                                <Leaf size={13} className="text-pink-400" /> 신력 꽃
                                                            </span>
                                                            <span className={shinryokuFlower >= costConfig.shinryoku_flower ? 'text-pink-300 font-bold' : 'text-rose-400 font-bold'}>
                                                                {costConfig.shinryoku_flower}개
                                                            </span>
                                                        </div>

                                                        <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between">
                                                            <span className="text-slate-400 flex items-center gap-1">
                                                                <Mountain size={13} className="text-slate-400" /> 철광석
                                                            </span>
                                                            <span className={iron >= costConfig.iron ? 'text-slate-200 font-bold' : 'text-rose-400 font-bold'}>
                                                                {costConfig.iron}개
                                                            </span>
                                                        </div>

                                                        <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between col-span-2">
                                                            <span className="text-slate-400 flex items-center gap-1">
                                                                <Pickaxe size={13} className="text-stone-400" /> 석재
                                                            </span>
                                                            <span className={stone >= costConfig.stone ? 'text-stone-200 font-bold' : 'text-rose-400 font-bold'}>
                                                                {costConfig.stone}개
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Action Button */}
                                            <div className="flex items-center justify-end gap-3 pt-2">
                                                {trialRequired && !playerTrialCleared && (
                                                    <button
                                                        onClick={() => {
                                                            setTrialChallengerId('player');
                                                            if (playerNextTier) setSelectedTrialTier(playerNextTier);
                                                            setActiveTab('final_trial');
                                                        }}
                                                        className="px-4 py-3 rounded-2xl bg-rose-950/60 border border-rose-700/60 hover:bg-rose-900/60 text-rose-300 text-xs font-bold transition flex items-center gap-2"
                                                    >
                                                        <Flame size={16} />
                                                        <span>1:1 시련 도전하러 가기</span>
                                                    </button>
                                                )}

                                                <button
                                                    disabled={!canBreakthrough}
                                                    onClick={handlePlayerBreakthrough}
                                                    className={`px-6 py-3 rounded-2xl text-sm font-black transition-all flex items-center gap-2 shadow-xl ${
                                                        canBreakthrough
                                                            ? 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 shadow-amber-950/50 active:scale-95'
                                                            : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                                                    }`}
                                                >
                                                    <Sparkles size={18} />
                                                    <span>플레이어 [{costConfig.label}] 잠재력 돌파</span>
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })()
                            ) : (
                                <div className="bg-slate-900/80 border border-amber-500/40 rounded-3xl p-10 text-center space-y-3">
                                    <div className="w-16 h-16 rounded-full bg-amber-500/20 border border-amber-500/50 mx-auto flex items-center justify-center text-amber-400">
                                        <Sparkles size={32} />
                                    </div>
                                    <h4 className="text-xl font-black text-amber-300">최고 잠재력 [파이널 클래스] 달성 완료</h4>
                                    <p className="text-xs text-slate-400 max-w-md mx-auto">
                                        이미 신의 영역인 파이널 클래스 잠재력 돌파를 마쳤습니다. 레벨 1000에 도달하여 궁극의 파이널 클래스를 해방하세요!
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* TAB 3: 클래스 시련 */}
                    {activeTab === 'final_trial' && (() => {
                        const isPlayer = trialChallengerId === 'player';
                        const challengerComp = !isPlayer ? allComps.find(c => c.id === trialChallengerId) : null;
                        const customComps = allComps.filter(c => c.isCustom);
                        const challengerName = isPlayer ? character.name : (challengerComp?.name || '커스텀 동료');
                        const challengerCP = isPlayer ? playerCP : (challengerComp ? getCompanionPureCP(challengerComp) : 0);
                        const challengerShinryoku = isPlayer ? (character.shinryokuType || '무') : (challengerComp?.shinryokuType || '무');
                        const currentTrialMessenger = getTrialMessengerForShinryoku(challengerShinryoku);

                        const challengerPot = isPlayer
                            ? (character.liberationPotential || ClassTier.FIRST)
                            : (challengerComp?.liberationPotential || (challengerComp as any)?.potentialTier || ClassTier.FIRST);
                        const challengerPotRank = getTierRank(challengerPot);

                        const stageConfig = TRIAL_STAGES.find(s => s.tier === selectedTrialTier) || TRIAL_STAGES[0];
                        const selectedStageRank = getTierRank(stageConfig.tier);

                        const isFacilityUnlocked = isHallOfTrials || facilityLevel >= stageConfig.minLabLevel;
                        const isPotentialUnlocked = challengerPotRank >= selectedStageRank;
                        const isStageUnlocked = isFacilityUnlocked && isPotentialUnlocked;

                        const challengerClearedThisTier = checkTrialClearedForTier(
                            selectedTrialTier,
                            isPlayer ? character : (challengerComp || {})
                        );
                        const trialEnemy = getTrialEnemyForTier(selectedTrialTier, currentTrialMessenger, isPlayer, trialChallengerId);

                        return (
                            <div className="space-y-4">
                                {/* Challenger Selection Bar */}
                                <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                    <div className="text-xs">
                                        <span className="text-slate-400 block font-medium">1:1 결투 도전자 선택</span>
                                        <span className="text-white font-bold">
                                            현재 도전자: <strong className="text-amber-400">{challengerName}</strong> (신력: {challengerShinryoku}, 잠재력: {challengerPot}, 전투력: {challengerCP.toLocaleString()})
                                        </span>
                                    </div>

                                    <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 custom-scrollbar">
                                        <button
                                            type="button"
                                            onClick={() => setTrialChallengerId('player')}
                                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 ${
                                                isPlayer
                                                    ? 'bg-amber-600 text-white shadow-md shadow-amber-950/40 border border-amber-500'
                                                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
                                            }`}
                                        >
                                            <User size={13} />
                                            <span>플레이어 ({character.name})</span>
                                        </button>

                                        {customComps.map(c => {
                                            const isSel = trialChallengerId === c.id;
                                            return (
                                                <button
                                                    key={c.id}
                                                    type="button"
                                                    onClick={() => setTrialChallengerId(c.id)}
                                                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 ${
                                                        isSel
                                                            ? 'bg-amber-600 text-white shadow-md shadow-amber-950/40 border border-amber-500'
                                                            : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
                                                    }`}
                                                >
                                                    <Sparkles size={13} className="text-purple-300" />
                                                    <span>커스텀: {c.name}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Trial Tier Selection Tabs */}
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                    {TRIAL_STAGES.map(stage => {
                                        const isSel = selectedTrialTier === stage.tier;
                                        const stageRank = getTierRank(stage.tier);
                                        const facUnlocked = isHallOfTrials || facilityLevel >= stage.minLabLevel;
                                        const potUnlocked = challengerPotRank >= stageRank;
                                        const cleared = checkTrialClearedForTier(stage.tier, isPlayer ? character : (challengerComp || {}));

                                        return (
                                            <button
                                                key={stage.tier}
                                                type="button"
                                                onClick={() => setSelectedTrialTier(stage.tier)}
                                                className={`p-3 rounded-2xl border text-left transition-all relative overflow-hidden ${
                                                    isSel
                                                        ? 'bg-slate-900 border-rose-500/80 shadow-lg shadow-rose-950/40'
                                                        : 'bg-slate-900/50 border-slate-800/80 hover:border-slate-700'
                                                }`}
                                            >
                                                <div className="flex items-center justify-between gap-1 mb-1">
                                                    <span className={`text-xs font-black ${isSel ? 'text-rose-400' : 'text-slate-300'}`}>
                                                        {stage.label}
                                                    </span>
                                                    {!potUnlocked ? (
                                                        <span className="flex items-center gap-0.5 text-[10px] text-amber-400 bg-amber-950/60 px-1.5 py-0.2 rounded border border-amber-800/50 font-bold">
                                                            <Lock size={10} /> 잠재력 필요
                                                        </span>
                                                    ) : !facUnlocked ? (
                                                        <span className="flex items-center gap-0.5 text-[10px] text-slate-500 bg-slate-800 px-1.5 py-0.2 rounded">
                                                            <Lock size={10} /> Lv.{stage.minLabLevel}
                                                        </span>
                                                    ) : cleared ? (
                                                        <span className="text-[10px] text-emerald-400 bg-emerald-950/80 px-1.5 py-0.2 rounded border border-emerald-700/60 font-bold">
                                                            통과 완료
                                                        </span>
                                                    ) : (
                                                        <span className="text-[10px] text-rose-300 bg-rose-950/80 px-1.5 py-0.2 rounded border border-rose-700/60 font-bold">
                                                            도전 가능
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="text-[11px] text-slate-400 flex items-center justify-between">
                                                    <span>{stage.subLabel}</span>
                                                    <span className="text-amber-400/80 text-[10px]">권장 {stage.recCP}</span>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>

                                {/* Selected Trial Stage Arena Card */}
                                {!isPotentialUnlocked ? (
                                    <div className="bg-slate-900/90 border border-amber-500/30 rounded-3xl p-8 sm:p-10 text-center space-y-4">
                                        <div className="w-14 h-14 rounded-2xl bg-amber-950/50 border border-amber-700/60 flex items-center justify-center text-amber-400 mx-auto">
                                            <Lock size={28} />
                                        </div>
                                        <div className="space-y-1.5">
                                            <h4 className="text-base font-black text-amber-300">
                                                [{stageConfig.label}] 시련 도전 자격 미달 (잠재력 미해방)
                                            </h4>
                                            <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                                                이 시련에 도전하려면 먼저 도전자 <strong className="text-white">[{challengerName}]</strong>의 잠재력을 <strong className="text-amber-400">[{stageConfig.label} 잠재력]</strong> 이상으로 돌파해야 합니다.
                                                <br />
                                                (현재 [{challengerName}]의 잠재력 상태: <span className="text-amber-300 font-bold">{challengerPot}</span>)
                                            </p>
                                        </div>
                                        <div>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    if (isPlayer) {
                                                        setActiveTab('player');
                                                    } else {
                                                        if (challengerComp) setSelectedCompanionId(challengerComp.id);
                                                        setActiveTab('companion');
                                                    }
                                                }}
                                                className="px-5 py-2.5 rounded-2xl bg-amber-600 hover:bg-amber-500 text-slate-950 text-xs font-black transition shadow-lg shadow-amber-950/40 inline-flex items-center gap-1.5"
                                            >
                                                <Sparkles size={15} />
                                                <span>{isPlayer ? '플레이어 잠재력 돌파하러 가기' : `[${challengerName}] 잠재력 돌파하러 가기`}</span>
                                            </button>
                                        </div>
                                    </div>
                                ) : !isFacilityUnlocked ? (
                                    <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-10 text-center space-y-3">
                                        <div className="w-14 h-14 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-500 mx-auto">
                                            <Lock size={28} />
                                        </div>
                                        <div className="space-y-1">
                                            <h4 className="text-base font-black text-slate-200">
                                                [{stageConfig.label}] 기지 구동 장치 잠김
                                            </h4>
                                            <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                                                이 시련의 훈련체를 활성화하려면 기지 잠재력 돌파소가 <strong className="text-amber-400">Lv.{stageConfig.minLabLevel}</strong> 이상이어야 합니다.
                                                <br />(현재 기지 돌파소 레벨: Lv.{facilityLevel})
                                            </p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="bg-gradient-to-b from-slate-900 via-rose-950/20 to-slate-950 border border-rose-900/40 rounded-3xl p-6 sm:p-8 space-y-6 relative overflow-hidden shadow-2xl">
                                        <div className="flex flex-col md:flex-row items-center gap-6">
                                            <div className="w-32 h-32 rounded-3xl overflow-hidden border-2 border-rose-500/50 shadow-lg shadow-rose-950/50 bg-slate-950 flex-shrink-0 relative group">
                                                <img
                                                    src={trialEnemy.visualUrl || currentTrialMessenger.visualUrl}
                                                    alt={trialEnemy.name}
                                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                                    referrerPolicy="no-referrer"
                                                />
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end justify-center p-2">
                                                    <span className="text-[10px] font-black text-amber-300">{stageConfig.subLabel}</span>
                                                </div>
                                            </div>

                                            <div className="space-y-2 flex-1 text-center md:text-left">
                                                <div className="flex items-center justify-center md:justify-start gap-2 flex-wrap">
                                                    <span className="px-2.5 py-0.5 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-bold">
                                                        {stageConfig.label}
                                                    </span>
                                                    <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-bold">
                                                        Lv.{trialEnemy.level} 훈련체
                                                    </span>
                                                    <span className="px-2.5 py-0.5 rounded-full bg-indigo-950/80 border border-indigo-600/50 text-indigo-300 text-xs font-bold">
                                                        상대 신력: {trialEnemy.shinryokuType || currentTrialMessenger.shinryokuType}
                                                    </span>
                                                    <span className="px-2.5 py-0.5 rounded-full bg-red-950/90 border border-red-500/60 text-red-300 text-xs font-bold flex items-center gap-1">
                                                        <Sword size={12} /> {isPlayer ? '1:1 진검승부 (동료 개입 불가)' : `${challengerName} 1:1 솔로 결투 (플레이어 개입 불가)`}
                                                    </span>
                                                    {challengerClearedThisTier ? (
                                                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-950 border border-emerald-600 text-emerald-300 text-xs font-bold flex items-center gap-1">
                                                            <CheckCircle size={12} /> 시련 통과 완료
                                                        </span>
                                                    ) : (
                                                        <span className="px-2.5 py-0.5 rounded-full bg-rose-950 border border-rose-700 text-rose-300 text-xs font-bold flex items-center gap-1">
                                                            <AlertCircle size={12} /> 시련 미완료
                                                        </span>
                                                    )}
                                                </div>

                                                <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                                                    {trialEnemy.name}
                                                </h3>

                                                <p className="text-xs text-slate-400 leading-relaxed max-w-2xl">
                                                    {trialEnemy.description}
                                                    <br />
                                                    <span className="text-amber-300 font-semibold">
                                                        {isPlayer ? (
                                                            `플레이어의 신력 계통([${challengerShinryoku}])에 공명하여 소환된 맞춤형 시련체입니다. 동료의 지원 없이 오직 단신(1:1)으로 격파해야 합니다.`
                                                        ) : (
                                                            `커스텀 동료 [${challengerName}]의 신력 계통([${challengerShinryoku}])에 공명하여 소환된 맞춤형 시련체입니다. 플레이어와 타 동료의 지원 없이 [${challengerName}] 홀로 1:1로 격파해야 합니다.`
                                                        )}
                                                    </span>
                                                </p>
                                            </div>
                                        </div>

                                        {/* Boss Skills & Attributes */}
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                                            {(trialEnemy.skills || currentTrialMessenger.skills).slice(0, 2).map((skill, idx) => (
                                                <div key={skill.id || idx} className="bg-slate-900/80 p-3.5 rounded-2xl border border-slate-800">
                                                    <div className="font-bold text-amber-400 flex items-center gap-1.5 mb-1">
                                                        {idx === 0 ? <Sword size={14} /> : <Flame size={14} className="text-rose-400" />}
                                                        {skill.name}
                                                    </div>
                                                    <p className="text-[11px] text-slate-400">
                                                        {skill.description}
                                                    </p>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Action Banner */}
                                        <div className="bg-slate-950/80 border border-slate-800/90 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                                            <div className="text-xs text-slate-300">
                                                <div className="font-bold text-white flex items-center gap-1.5">
                                                    <Crosshair size={14} className="text-rose-400" />
                                                    시련 승리 보상
                                                </div>
                                                <span className="text-slate-400 text-[11px]">
                                                    {isPlayer
                                                        ? `승리 시 플레이어의 [${stageConfig.label} 시련 통과 자격]이 즉시 영구 해금됩니다. (1:1 결투)`
                                                        : `승리 시 ${challengerName}의 [${stageConfig.label} 시련 통과 자격]이 즉시 영구 해금됩니다. (1:1 결투)`
                                                    }
                                                </span>
                                            </div>

                                            <button
                                                onClick={() => handleStartTrial(selectedTrialTier)}
                                                className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-gradient-to-r from-rose-600 via-rose-500 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-black text-sm transition-all shadow-xl shadow-rose-950/60 active:scale-95 flex items-center justify-center gap-2 flex-shrink-0"
                                            >
                                                <Flame size={18} />
                                                <span>
                                                    {isPlayer
                                                        ? (challengerClearedThisTier ? `${stageConfig.label} 재도전 (1:1)` : `${stageConfig.label} 시작 (1:1 진검승부)`)
                                                        : (challengerClearedThisTier ? `${challengerName} ${stageConfig.label} 재도전 (1:1 솔로)` : `${challengerName} ${stageConfig.label} 시작 (1:1 솔로 진검승부)`)
                                                    }
                                                </span>
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })()}
                </div>
            </div>
        </div>
    );
};

export default PotentialBreakthroughModal;
