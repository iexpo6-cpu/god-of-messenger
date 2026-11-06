import { SimpleStudent, Stats, Quest, Character } from '../types';

export interface StudentProfileAnalysis {
    ageNumber: number;
    disposition: string;
    worryTitle: string;
    worryDetail: string;
    recommendedCategory: 'mindset' | 'basics' | 'tactics' | 'confidence' | 'discipline';
    recommendedCategoryName: string;
    adviceTip: string;
}

export interface AdviceOption {
    id: string;
    category: 'mindset' | 'basics' | 'tactics' | 'confidence' | 'discipline';
    title: string;
    quote: string;
    statGainDesc: string;
}

export interface PraiseOption {
    id: string;
    title: string;
    quote: string;
    statGainDesc: string;
}

export interface InteractionFeedbackResult {
    student: SimpleStudent;
    dialogue: string;
    reactionType: 'match' | 'normal' | 'scold';
    reactionTitle: string;
    summary: string;
    statChanges: string[];
}

/**
 * 어린 학생들의 전투 계열을 제거하여 미설정(유년기/수련생) 상태로 정제
 */
export const sanitizeYoungStudent = (student: SimpleStudent): SimpleStudent => {
    const sanitized = { ...student };
    delete sanitized.combatStyle;
    delete (sanitized as any).combatStyleProgress;
    sanitized.combatStyle = undefined;
    return sanitized;
};

export const sanitizeYoungStudents = (students: SimpleStudent[]): SimpleStudent[] => {
    return students.map(s => sanitizeYoungStudent(s));
};

/**
 * 학생의 성격, 스탯, ID를 분석하여 학생의 현재 고민과 추천 지도 방침을 도출
 */
export const getStudentProfileAnalysis = (student: SimpleStudent): StudentProfileAnalysis => {
    const ageNum = parseInt(student.age?.replace(/[^0-9]/g, '') || '12', 10);
    const stats = student.stats || {};
    const str = stats.str || 10;
    const def = stats.def || 10;
    const agi = stats.agi || 10;
    const int = stats.int || 10;
    const wis = stats.wis || 10;

    // 해시값 기반 일관된 고민 결정
    let hash = 0;
    const key = `${student.id}_${student.name}`;
    for (let i = 0; i < key.length; i++) {
        hash = (hash * 31 + key.charCodeAt(i)) % 1000;
    }

    // 스탯 불균형 또는 성격 분석
    if (str >= 25 && def < 15) {
        return {
            ageNumber: ageNum,
            disposition: '돌파력과 힘은 좋으나 수비와 호흡이 급함',
            worryTitle: '무리한 공격 후의 반격 허용',
            worryDetail: '대련할 때 상대를 쓰러뜨리고 싶은 마음에 무리하게 파고들다가 카운터를 맞고 넘어져요. 언제 물러나야 할지 모르겠어요.',
            recommendedCategory: 'tactics',
            recommendedCategoryName: '전술적 시야와 침착함',
            adviceTip: '화려한 공격보다 상대의 빈틈을 기다리는 침착함과 거리 조절을 조언해주세요.'
        };
    }

    if (int >= 25 && str < 15) {
        return {
            ageNumber: ageNum,
            disposition: '이론과 지식은 완벽하나 실전 두려움이 큼',
            worryTitle: '실전 앞에서의 극심한 긴장',
            worryDetail: '시험 점수는 늘 1등인데, 막상 실전 검을 쥐면 손이 덜덜 떨리고 머릿속이 새하얘져요. 제가 재능이 없는 걸까요?',
            recommendedCategory: 'confidence',
            recommendedCategoryName: '자신감과 용기 북돋우기',
            adviceTip: '실수를 두려워하지 말고 알고 있는 지식을 믿으라는 따뜻한 격려가 절실합니다.'
        };
    }

    if (agi >= 25 && def < 15) {
        return {
            ageNumber: ageNum,
            disposition: '민첩하고 기민하지만 후반 체력이 급격히 저하됨',
            worryTitle: '조루 체력과 호흡 조절 실패',
            worryDetail: '초반에는 상대 공격을 요리조리 다 피하는데, 3분만 지나면 숨이 턱 끝까지 차올라서 다리가 풀려버려요.',
            recommendedCategory: 'basics',
            recommendedCategoryName: '기본기와 호흡 안배',
            adviceTip: '불필요한 동작을 줄이고 호흡을 유지하는 기본기 체력 안배법을 가르쳐주세요.'
        };
    }

    // 기본 5개 카테고리 로테이션
    const pattern = hash % 5;
    switch (pattern) {
        case 0:
            return {
                ageNumber: ageNum,
                disposition: '성실하고 꼼꼼하나 자신만의 강점을 찾지 못함',
                worryTitle: '자신만의 무기 부재에 대한 방황',
                worryDetail: '선생님들이 시키는 훈련은 다 성실히 하는데, 동기들에 비해 저만의 뚜렷한 장점이 없는 것 같아 조바심이 나요.',
                recommendedCategory: 'confidence',
                recommendedCategoryName: '잠재력 발견과 격려',
                adviceTip: '꾸준함 자체가 가장 강력한 무기임을 일깨워주고 작은 장점을 칭찬해주세요.'
            };
        case 1:
            return {
                ageNumber: ageNum,
                disposition: '승부욕이 지나쳐 패배를 견디지 못함',
                worryTitle: '패배에 대한 공포와 조급함',
                worryDetail: '대련에서 한 번이라도 지면 너무 분하고 부끄러워서 며칠 동안 잠도 안 와요. 마음을 어떻게 다스려야 할까요?',
                recommendedCategory: 'mindset',
                recommendedCategoryName: '실전 마인드셋과 평정심',
                adviceTip: '패배는 실패가 아니라 빈틈을 메울 수 있는 최고의 스승이라는 마음가짐을 전해주세요.'
            };
        case 2:
            return {
                ageNumber: ageNum,
                disposition: '기초 훈련을 지루해하고 화려한 비기만 탐냄',
                worryTitle: '기본기 경시와 화려함 추구',
                worryDetail: '맨날 목검 휘두르기와 달리기만 시키니 지루해요. 저도 용병단 선배들처럼 멋진 필살기를 먼저 배우고 싶어요!',
                recommendedCategory: 'discipline',
                recommendedCategoryName: '기본기의 굳건함 훈계/지도',
                adviceTip: '뿌리 깊은 나무가 바람에 흔들리지 않듯, 기본기가 필살기를 완성한다는 교훈을 주어야 합니다.'
            };
        case 3:
            return {
                ageNumber: ageNum,
                disposition: '전투 중 주변 상황을 보지 못하는 터널 시야',
                worryTitle: '동료와의 연계 부족과 고립',
                worryDetail: '모의 단체전만 하면 제가 혼자 앞으로 튀어나가서 고립돼요. 동료들과 호흡을 맞추는 게 너무 어려워요.',
                recommendedCategory: 'tactics',
                recommendedCategoryName: '전술적 연계와 협력',
                adviceTip: '혼자 싸우는 것이 아닌, 동료의 시선과 등 뒤를 지키는 전술적 시야를 조언해주세요.'
            };
        default:
            return {
                ageNumber: ageNum,
                disposition: '훈련 의욕이 다소 침체되어 있고 피로감을 느낌',
                worryTitle: '성장이 멈춘 듯한 정체기 슬럼프',
                worryDetail: '요즘 아무리 연습해도 실력이 늘지 않는 것 같아요. 남들은 쑥쑥 크는데 저만 제자리걸음인 것 같아 지쳐요.',
                recommendedCategory: 'basics',
                recommendedCategoryName: '슬럼프 극복과 호흡 재정비',
                adviceTip: '정체기는 성장을 앞두고 내실을 다지는 시기임을 설명하며 차분한 격려를 건네주세요.'
            };
    }
};

/**
 * 조언 선택지 목록
 */
export const ADVICE_OPTIONS: AdviceOption[] = [
    {
        id: 'mindset',
        category: 'mindset',
        title: '실전 마인드셋 & 평정심',
        quote: '"결과를 두려워하지 말고, 눈앞의 호흡과 적의 움직임 하나에만 마음을 집중해라."',
        statGainDesc: 'WIS +2, INT +1, 호감도 +3'
    },
    {
        id: 'basics',
        category: 'basics',
        title: '기본기 & 호흡 안배',
        quote: '"화려한 기술에 현혹되지 마라. 지치지 않는 두 다리와 정직한 기본기가 너를 살린다."',
        statGainDesc: 'DEF +2, AGI +1, 호감도 +3'
    },
    {
        id: 'tactics',
        category: 'tactics',
        title: '전술적 시야 & 연계',
        quote: '"시야를 넓혀라. 적의 검끝만 보지 말고, 발의 방향과 지형, 동료의 위치를 함께 읽어라."',
        statGainDesc: 'INT +2, WIS +1, 호감도 +3'
    },
    {
        id: 'confidence',
        category: 'confidence',
        title: '자신감 & 따뜻한 격려',
        quote: '"너의 잠재력은 네가 생각하는 것보다 훨씬 크다. 실수해도 좋으니 너 자신을 믿어라."',
        statGainDesc: '호감도 +8, 존중도 +5, 전 능력치 +1'
    },
    {
        id: 'discipline',
        category: 'discipline',
        title: '철저한 기본자세 훈계',
        quote: '"자세가 무너지면 마음도 무너진다. 허리를 곧게 펴고 발끝을 단단히 디뎌라!"',
        statGainDesc: 'STR +2, DEF +1, 긴장도 +5'
    }
];

/**
 * 칭찬 선택지 목록
 */
export const PRAISE_OPTIONS: PraiseOption[] = [
    {
        id: 'effort',
        title: '성실한 땀방울 칭찬',
        quote: '"남들이 보지 않는 곳에서도 묵묵히 흘린 네 땀방울을 내가 똑똑히 보았다. 훌륭하다."',
        statGainDesc: '호감도 +8, 평판 +1, DEF +1'
    },
    {
        id: 'talent',
        title: '날카로운 감각 칭찬',
        quote: '"순간적으로 빈틈을 포착하는 그 번뜩이는 감각, 아주 훌륭한 자질을 지니고 있구나."',
        statGainDesc: '호감도 +8, 존중도 +3, AGI +1'
    },
    {
        id: 'teamwork',
        title: '동료를 챙기는 배려 칭찬',
        quote: '"동기들의 뒤를 돌아봐 주는 그 따뜻한 마음가짐이야말로 진정한 전사의 기품이다."',
        statGainDesc: '호감도 +10, 학교 평판 +2'
    }
];

/**
 * 조언 적용 처리 및 반응 대사 생성
 */
export const executeAdviceInteraction = (
    student: SimpleStudent,
    option: AdviceOption,
    currentDate?: string
): InteractionFeedbackResult => {
    const updated = { ...student, stats: { ...student.stats } };
    if (currentDate) {
        updated.lastMentoringDate = currentDate;
    }
    const analysis = getStudentProfileAnalysis(student);
    const isMatch = option.category === analysis.recommendedCategory;

    let dialogue = "";
    let reactionTitle = "";
    const statChanges: string[] = [];

    if (isMatch) {
        // 학생 고민에 완벽히 부합하는 맞춤형 조언 (대성공)
        reactionTitle = "🎯 마음에 닿은 결정적 조언!";
        dialogue = `"${student.name}의 눈이 번쩍 뜨였습니다!"\n\n` +
            `"교관님...! 바로 그 점이 제일 답답하고 막막했었는데... 가슴이 뻥 뚫리는 기분이에요!\n` +
            `제가 왜 자꾸 흔들렸는지 이제야 알 것 같아요. 말씀해주신 대로 마음을 고쳐먹고 다시 해보겠습니다!"`;

        // 보너스 효과 부여
        updated.affection = Math.min(100, (updated.affection || 0) + 6);
        updated.respect = Math.min(100, (updated.respect || 0) + 5);
        
        if (option.category === 'basics') {
            updated.stats.def = (updated.stats.def || 0) + 3;
            updated.stats.agi = (updated.stats.agi || 0) + 2;
            statChanges.push('DEF +3', 'AGI +2', '호감도 +6', '존중도 +5');
        } else if (option.category === 'tactics') {
            updated.stats.int = (updated.stats.int || 0) + 3;
            updated.stats.wis = (updated.stats.wis || 0) + 2;
            statChanges.push('INT +3', 'WIS +2', '호감도 +6', '존중도 +5');
        } else if (option.category === 'confidence') {
            updated.stats.str = (updated.stats.str || 0) + 2;
            updated.stats.int = (updated.stats.int || 0) + 2;
            updated.stats.def = (updated.stats.def || 0) + 2;
            updated.affection = Math.min(100, (updated.affection || 0) + 10);
            statChanges.push('전 스탯 +2', '호감도 +10', '존중도 +8');
        } else if (option.category === 'mindset') {
            updated.stats.wis = (updated.stats.wis || 0) + 3;
            updated.stats.int = (updated.stats.int || 0) + 2;
            statChanges.push('WIS +3', 'INT +2', '호감도 +6', '존중도 +5');
        } else {
            updated.stats.str = (updated.stats.str || 0) + 3;
            updated.stats.def = (updated.stats.def || 0) + 2;
            statChanges.push('STR +3', 'DEF +2', '호감도 +5');
        }
    } else {
        // 일반 유익한 조언
        reactionTitle = "💡 경청과 배움";
        dialogue = `"${student.name}이(가) 당신의 조언을 깊이 새겨듣습니다."\n\n` +
            `"감사합니다 교관님! 실전에서 산전수전을 겪으신 분의 말씀이라 더욱 와닿습니다.\n` +
            `오늘 지도해주신 내용을 잊지 않고 훈련 일지에 적어두겠습니다!"`;

        updated.affection = Math.min(100, (updated.affection || 0) + 3);
        if (option.category === 'basics') {
            updated.stats.def = (updated.stats.def || 0) + 1;
            updated.stats.agi = (updated.stats.agi || 0) + 1;
            statChanges.push('DEF +1', 'AGI +1', '호감도 +3');
        } else if (option.category === 'tactics') {
            updated.stats.int = (updated.stats.int || 0) + 1;
            updated.stats.wis = (updated.stats.wis || 0) + 1;
            statChanges.push('INT +1', 'WIS +1', '호감도 +3');
        } else if (option.category === 'confidence') {
            updated.stats.str = (updated.stats.str || 0) + 1;
            updated.affection = Math.min(100, (updated.affection || 0) + 5);
            statChanges.push('STR +1', '호감도 +5');
        } else if (option.category === 'mindset') {
            updated.stats.wis = (updated.stats.wis || 0) + 2;
            statChanges.push('WIS +2', '호감도 +3');
        } else {
            updated.stats.str = (updated.stats.str || 0) + 2;
            statChanges.push('STR +2', '호감도 +2');
        }
    }

    // 전투 계열은 어린 학생이므로 항상 제거
    sanitizeYoungStudent(updated);

    return {
        student: updated,
        dialogue,
        reactionType: isMatch ? 'match' : 'normal',
        reactionTitle,
        summary: `${student.name}에게 "${option.title}"에 대해 지도했습니다.`,
        statChanges
    };
};

/**
 * 칭찬 적용 처리 및 반응 대사 생성
 */
export const executePraiseInteraction = (
    student: SimpleStudent,
    option: PraiseOption,
    currentDate?: string
): InteractionFeedbackResult => {
    const updated = { ...student, stats: { ...student.stats } };
    if (currentDate) {
        updated.lastMentoringDate = currentDate;
    }
    updated.affection = Math.min(100, (updated.affection || 0) + 8);
    updated.respect = Math.min(100, (updated.respect || 0) + 3);

    const statChanges = ['호감도 +8', '존중도 +3'];
    if (option.id === 'effort') {
        updated.stats.def = (updated.stats.def || 0) + 1;
        statChanges.push('DEF +1');
    } else if (option.id === 'talent') {
        updated.stats.agi = (updated.stats.agi || 0) + 1;
        statChanges.push('AGI +1');
    }

    const dialogue = `"${student.name}의 뺨이 발그레해지며 환한 미소를 짓습니다!"\n\n` +
        `"저, 정말인가요...? 대단한 베테랑 교관님께 그런 칭찬을 들으니 날아갈 것 같아요!\n` +
        `더 열심히 해서 교관님처럼 멋진 전사가 되고 싶어요!"`;

    sanitizeYoungStudent(updated);

    return {
        student: updated,
        dialogue,
        reactionType: 'match',
        reactionTitle: '🌸 환한 미소와 격려',
        summary: `${student.name}의 ${option.title}을 칭찬했습니다.`,
        statChanges
    };
};

/**
 * 훈계 적용 처리 및 반응 대사 생성
 */
export const executeScoldInteraction = (
    student: SimpleStudent,
    currentDate?: string
): InteractionFeedbackResult => {
    const updated = { ...student, stats: { ...student.stats } };
    if (currentDate) {
        updated.lastMentoringDate = currentDate;
    }
    updated.stats.str = (updated.stats.str || 0) + 2;
    updated.stats.def = (updated.stats.def || 0) + 2;
    updated.affection = Math.max(-100, (updated.affection || 0) - 3);
    updated.tension = Math.min(100, (updated.tension || 0) + 8);

    const dialogue = `"${student.name}이(가) 깜짝 놀라 자세를 바짝 고쳐 잡습니다!"\n\n` +
        `"죄, 죄송합니다 교관님! 잠시 정신을 놓고 있었습니다!\n` +
        `엄하게 꾸짖어 주셔서 감사합니다. 흐트러지지 않고 다시 집중하겠습니다!"`;

    sanitizeYoungStudent(updated);

    return {
        student: updated,
        dialogue,
        reactionType: 'scold',
        reactionTitle: '⚡ 기강 확립과 결의',
        summary: `${student.name}의 흐트러진 자세를 엄하게 바로잡았습니다.`,
    statChanges: ['STR +2', 'DEF +2', '긴장도 +8', '호감도 -3']
    };
};

/**
 * 두 날짜 문자열(YYYY-MM-DD) 사이의 경과 일수 계산
 */
export const getDaysDifference = (d1?: string, d2?: string): number => {
    if (!d1 || !d2) return 999;
    const time1 = new Date(d1).getTime();
    const time2 = new Date(d2).getTime();
    if (isNaN(time1) || isNaN(time2)) return 999;
    return Math.floor(Math.abs(time2 - time1) / (1000 * 60 * 60 * 24));
};

/**
 * 학생별 조언/칭찬 7일 쿨다운 확인
 */
export const getMentoringCooldown = (
    student: SimpleStudent,
    currentDate?: string
): { canMentor: boolean; daysRemaining: number } => {
    if (!student.lastMentoringDate || !currentDate) {
        return { canMentor: true, daysRemaining: 0 };
    }
    const diff = getDaysDifference(student.lastMentoringDate, currentDate);
    if (diff >= 7) {
        return { canMentor: true, daysRemaining: 0 };
    }
    return { canMentor: false, daysRemaining: 7 - diff };
};

export interface InstructorQuestProgress {
    daysElapsed: number;
    currentWeek: number;
    canStartLecture: boolean;
    isExpired: boolean;
    daysRemainingToUnlock: number;
    daysRemainingToDeadline: number;
}

/**
 * 임시 교관 퀘스트 진행도 및 3주차 해금/한달 기한 검증
 */
export const getInstructorQuestProgress = (
    quest?: Quest,
    currentDate?: string
): InstructorQuestProgress => {
    if (!quest) {
        return {
            daysElapsed: 0,
            currentWeek: 1,
            canStartLecture: false,
            isExpired: false,
            daysRemainingToUnlock: 14,
            daysRemainingToDeadline: 30
        };
    }

    const today = currentDate || '2000-03-02';
    const startDate = quest.startDate || today;
    const daysElapsed = getDaysDifference(startDate, today);
    const currentWeek = Math.min(4, Math.floor(daysElapsed / 7) + 1);

    // 3주차(14일 경과)부터 강의 시작 가능, 한달(30일) 이내 완료 필요
    const canStartLecture = daysElapsed >= 14 && daysElapsed <= 30;
    const isExpired = daysElapsed > 30;
    const daysRemainingToUnlock = Math.max(0, 14 - daysElapsed);
    const daysRemainingToDeadline = Math.max(0, 30 - daysElapsed);

    return {
        daysElapsed,
        currentWeek,
        canStartLecture,
        isExpired,
        daysRemainingToUnlock,
        daysRemainingToDeadline
    };
};

/**
 * 캐릭터 데이터 내에 학생 정보(퀘스트 학생, 소셜 네트워크, 학교 데이터)를 일괄 갱신
 */
export const applyStudentUpdateToCharacter = (
    character: Character,
    updatedStudent: SimpleStudent,
    questId?: string
): Character => {
    const newChar = { ...character };
    const sanitizedStudent = sanitizeYoungStudent(updatedStudent);

    // 1. 용병 활성 퀘스트 내 studentsToTeach 갱신
    if (newChar.mercenaryData?.activeQuests) {
        newChar.mercenaryData.activeQuests = newChar.mercenaryData.activeQuests.map(q => {
            if (q.type === 'TemporaryInstructor' && (!questId || q.id === questId)) {
                const sList = q.studentsToTeach || [];
                const updatedList = sList.map(s => s.id === sanitizedStudent.id ? sanitizedStudent : sanitizeYoungStudent(s));
                return { ...q, studentsToTeach: updatedList };
            }
            return q;
        });
    }

    // 2. 소셜 네트워크 갱신
    if (newChar.socialNetwork) {
        const netIdx = newChar.socialNetwork.findIndex(n => n.id === sanitizedStudent.id);
        if (netIdx !== -1) {
            newChar.socialNetwork[netIdx] = {
                ...newChar.socialNetwork[netIdx],
                ...sanitizedStudent
            };
        } else {
            newChar.socialNetwork.push({
                ...sanitizedStudent,
                isPastConnection: false,
                metYear: parseInt(newChar.currentDate?.substring(0, 4) || '2000')
            });
        }
    }

    // 3. schoolData 있을 경우 갱신
    if (newChar.schoolData?.classmates) {
        const cIdx = newChar.schoolData.classmates.findIndex(c => c.id === sanitizedStudent.id);
        if (cIdx !== -1) {
            newChar.schoolData.classmates[cIdx] = sanitizedStudent;
        }
    }

    return newChar;
};
