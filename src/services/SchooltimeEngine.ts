
import { Character, SimpleStudent, Stats, Enemy, ClassTier, JobType, RelationType, ChoiceEvent,MilitaryRank,MercenaryRank, CompanionRelation } from '../types';
import { generateClassmates, generateEnemyStats, generateName, calculateAgeFromYear, updateSocialNetworkGrowth, getYear, generateDefaultVisualUrl, getRaceByNation, calculateFinalStats } from '../utils';
import { NATION_DATA, MILITARY_RANK_THRESHOLD } from '../constants';
import { MERCENARY_RANK_THRESHOLD, getNextMercenaryRank } from '../mercenaryRankUp';
import { registerAmbush } from './incidentQueue';
import { canStartRomance } from './romanceEthicsService';
import { upgradeSocialNetworkSkillsOnGrowth } from './companionGrowthService';
/**
 * 학교 학년 진급/유급/졸업 시 인연 아카이빙
 */
export const archiveSchoolSocialNetwork = (char: Character, nextYear: number) => {
    if (!char.socialNetwork) char.socialNetwork = [];
    const currentYear = getYear(char.currentDate || '2000-01-01');

    // 1. 학급 친구 처리
    if (char.schoolData?.classmates) {
        char.schoolData.classmates.forEach(npc => {
            // 호감도가 0이 아니거나, 라이벌이거나, 대화 기록이 있는 경우 저장
            if (npc.affection !== 0 || npc.isRival || (npc.chatHistory && npc.chatHistory.length > 0)) {
                const existingIdx = char.socialNetwork!.findIndex(sn => sn.id === npc.id);
                 
                const updatedNpc = { 
                    ...npc, 
                    origin: npc.origin || '학교', 
                    originName: npc.originName || char.schoolData!.schoolName 
                };

                if (updatedNpc.birthYear) {
                    updatedNpc.age = calculateAgeFromYear(updatedNpc.birthYear, nextYear);
                }

                if (existingIdx !== -1) {
                    char.socialNetwork![existingIdx] = updatedNpc;
                } else {
                    char.socialNetwork!.push(updatedNpc);
                }
            }
        });
    }

    // 2. 동아리원 처리 (추가됨)
    if (char.clubData?.clubMembers) {
        char.clubData.clubMembers.forEach(npc => {
            // 호감도가 0이 아니거나 대화 기록이 있는 경우 저장
            if (npc.affection !== 0 || (npc.chatHistory && npc.chatHistory.length > 0)) {
                const existingIdx = char.socialNetwork!.findIndex(sn => sn.id === npc.id);
                
                const updatedNpc = { 
                    ...npc, 
                    origin: npc.origin || '학교 동아리', 
                    originName: npc.originName || char.clubData!.joinedClub 
                };

                if (updatedNpc.birthYear) {
                    updatedNpc.age = calculateAgeFromYear(updatedNpc.birthYear, nextYear);
                }

                if (existingIdx !== -1) {
                    char.socialNetwork![existingIdx] = updatedNpc;
                } else {
                    char.socialNetwork!.push(updatedNpc);
                }
            }
        });
    }
};

/**
 * [NEW] 장학금 지급 로직 (6개월 단위, 전교 1~3등 대상)
 */
const processSchoolScholarship = (currentRef: Character, monthNum: number, allLogs: string[]) => {
    if (!currentRef.schoolData || currentRef.schoolData.isGraduated) return;
    
    // 3월(입학/진급 직후)과 9월(2학기 시작)에 지급
    if (monthNum === 3 || monthNum === 9) {
        const currentYearMonth = currentRef.currentDate?.substring(0, 7);
        if (currentRef.schoolData.lastScholarshipDate === currentYearMonth) return;

        // Player Score Calculation (Matching SchoolModal's getRankingData)
        const pStr = currentRef.stats.str || 10;
        const pInt = currentRef.stats.int || 10;
        const pDef = currentRef.stats.def || 10;
        const pAgi = currentRef.stats.agi || 10;
        const pWis = currentRef.stats.wis || 10;
        const pCtrl = currentRef.stats.ctrl || 10;
        const pLvl = currentRef.level || 1;

        const pWritten = Math.floor((pInt + pWis) * 1.5 + pLvl * 3);
        const pPractical = Math.floor((pStr + pDef + pAgi + pCtrl) * 1.0 + pLvl * 3);
        const pTotal = pWritten + pPractical;

        // Classmates Score Calculation (Matching SchoolModal's getRankingData)
        const classmates = currentRef.schoolData.classmates || [];
        const classmateScores = classmates.map(s => {
            const sStr = s.stats.str || 10;
            const sInt = s.stats.int || 10;
            const sDef = s.stats.def || 10;
            const sAgi = s.stats.agi || 10;
            const sWis = s.stats.wis || 10;
            const sCtrl = s.stats.ctrl || 10;
            const sLvl = s.level || 1;

            const sWritten = Math.floor((sInt + sWis) * 1.5 + sLvl * 3);
            const sPractical = Math.floor((sStr + sDef + sAgi + sCtrl) * 1.0 + sLvl * 3);
            return sWritten + sPractical;
        });

        // Combine all and sort
        const allScores = [
            { id: 'player', score: pTotal },
            ...classmates.map((s, idx) => ({ id: s.id, score: classmateScores[idx] }))
        ];
        allScores.sort((a, b) => b.score - a.score);
        
        const rank = allScores.findIndex(item => item.id === 'player') + 1;

        // Sync with schoolData.rank so it works with Titles and other systems
        currentRef.schoolData.rank = rank;

        if (rank <= 3) {
            const rewardGold = (4 - rank) * 10000 * (currentRef.schoolData.grade);
            currentRef.money += rewardGold;
            currentRef.schoolData.lastScholarshipDate = currentYearMonth;
            allLogs.push(`[장학금] 우수한 성적(전교 ${rank}등)을 인정받아 장학금 ${rewardGold.toLocaleString()}G를 수령했습니다!`);
        }
    }
};

/**
 * 3월 2일 학교 진급/유급 판정 로직
 */
export const processSchoolAdvancement = (currentRef: Character, prevDate: string, nextDate: string, prevYear: number, nextYear: number, allLogs: string[]) => {
    if (currentRef.schoolData && !currentRef.schoolData.isGraduated) {
        const nextMarch2 = `${prevYear}-03-02`;
        if (prevDate < nextMarch2 && nextDate >= nextMarch2) {
            const school = currentRef.schoolData;
            const canAdvance = school.midtermPassed && school.finalPassed;

            if (canAdvance) {
                if (school.grade < 3) {
                    archiveSchoolSocialNetwork(currentRef, nextYear);
                    school.grade += 1;
                    school.homeroomTeacher = undefined;
                    school.semester = 1;
                    school.midtermPassed = false;
                    school.finalPassed = false;
                    school.lastExamDate = undefined;
                    
                    currentRef.level += 1;
                    currentRef.statPoints += 10;
                    currentRef.stats.maxHp += 50;
                    const { finalStats: advFinal } = calculateFinalStats(currentRef);
                    currentRef.stats.hp = advFinal.maxHp;
                    currentRef.stats.mp = advFinal.maxMp;
                    
                    const schoolNation = currentRef.currentLocation?.nation || currentRef.nation;
                    school.classmates = generateClassmates(schoolNation, 14, school.tier, school.grade, [], school.classNumber, undefined, false, nextYear);
                    
                    allLogs.push(`[학교] 새 학기가 시작되었습니다. ${school.grade}학년으로 자동 진급했습니다! (Lv+1, SP+10)`);
                } else {
                    allLogs.push(`[학교] 졸업 요건을 충족했습니다! 학교 행정실에서 졸업 및 진학 절차를 진행하세요.`);
                }
            } else {
                archiveSchoolSocialNetwork(currentRef, nextYear);
                school.midtermPassed = false;
                school.finalPassed = false;
                school.lastExamDate = undefined;
                school.homeroomTeacher = undefined;
                school.semester = 1;
                school.classNumber = Math.floor(Math.random() * 5) + 1;
                const schoolNation = currentRef.currentLocation?.nation || currentRef.nation;
                school.classmates = generateClassmates(schoolNation, 14, school.tier, school.grade, [], school.classNumber, undefined, false, nextYear);

                allLogs.push(`[학교] 유급 알림: 시험을 모두 통과하지 못하여 진급하지 못했습니다. 새로운 ${school.grade}학년 반에 배정됩니다.`);
            }
        }
    }
};

/**
 * 학교 자동 발생 이벤트 및 라이벌 음해 시스템
 */
export const processSchoolDailyEvents = (currentRef: Character, nextDate: string, monthNum: number, nextYear: number, allLogs: string[]) => {
    if (!currentRef.schoolData || currentRef.schoolData.isGraduated || monthNum < 3 || monthNum > 12) return;

    const school = currentRef.schoolData;
    const MBTI_LIST = ["INTJ", "INFJ", "ENTJ", "ENFJ", "ISTJ", "ISFJ", "ESTJ", "ESFJ", "ISTP", "ISFP", "ESTP", "ESFP", "INTP", "INFP", "ENTP", "ENFP"];

     // 0. 장학금 및 시험 기간 알림
    processSchoolScholarship(currentRef, monthNum, allLogs);

    // [NEW] 시험 기간 경고 시스템
    const isDayOne = nextDate.endsWith('-01');
    if (isDayOne) {
        if (monthNum === 4) allLogs.push(`[시험 안내] 4월입니다. 중간고사 기간이 시작되었습니다. 교무실에서 시험에 응시하십시오.`);
        if (monthNum === 10) allLogs.push(`[시험 안내] 10월입니다. 학말고사 기간이 시작되었습니다. 한 해를 마무리할 준비를 하십시오.`);
        
        // 마감 임박 경고
        if (monthNum === 6 && !school.midtermPassed) {
            allLogs.push(`[경고: 유급 위기] 중간고사 마감이 임박했습니다! 이번 달 내로 통과하지 못하면 진급 자격을 상실할 수 있습니다.`);
        }
        if (monthNum === 12 && !school.finalPassed) {
            allLogs.push(`[경고: 유급 위기] 학말고사 마감이 임박했습니다! 12월이 지나기 전 시험에 합격하지 못하면 유급 확정입니다.`);
        }
    }
    // 1. 전학생의 등장 (0.2% -> 1.0%)
    if (Math.random() < 0.01) {
        const allNations = Object.keys(NATION_DATA);
        const randomNation = allNations[Math.floor(Math.random() * allNations.length)];
        const transferLvl = Math.max(currentRef.level + 5, 15);
        const npcGender = Math.random() > 0.5 ? "남성" : "여성";
        const genderParam = npcGender === "남성" ? "male" : "female";
        const transferRace = getRaceByNation(randomNation);
        const newStudent: SimpleStudent = {
            id: `transfer_${Date.now()}_${Math.random().toString(36).substring(7)}`,
            name: generateName(randomNation, genderParam),
            age: currentRef.age,
            race: transferRace,
            classType: "학생",
            birthYear: currentRef.birthYear,
            gender: npcGender,
            nation: randomNation,
            level: transferLvl,
            personality: MBTI_LIST[Math.floor(Math.random() * MBTI_LIST.length)],
            appearance: "낯선 복장과 강렬한 눈빛을 지닌 전학생입니다.",
            stats: generateEnemyStats(transferLvl),
            affection: 0,
            classNumber: school.classNumber,
            visualUrl: generateDefaultVisualUrl(generateName(randomNation, genderParam), randomNation, transferRace, npcGender)
        };
        // Fix name to match visualUrl generation
        const finalName = generateName(randomNation, genderParam);
        newStudent.name = finalName;
        newStudent.visualUrl = generateDefaultVisualUrl(finalName, randomNation, transferRace, npcGender);
        school.classmates.push(newStudent);
        allLogs.push(`[학교] 익숙해진 교실에 낯선 기운이 섞여듭니다. ${randomNation}에서 온 전학생 '${newStudent.name}'(이)가 우리 반에 합류했습니다.`);
    }

    // 2. 방과 후 스터디 그룹 (0.5% -> 2.0%)
    const closeFriends = (school.classmates || []).filter(s => s && s.affection >= 50);
    if (closeFriends.length >= 2 && Math.random() < 0.02) {
        const partner1 = closeFriends[Math.floor(Math.random() * closeFriends.length)];
        let partner2 = closeFriends[Math.floor(Math.random() * closeFriends.length)];
        while (partner1.id === partner2.id) partner2 = closeFriends[Math.floor(Math.random() * closeFriends.length)];

        const statsKeys: (keyof Stats)[] = ['str', 'int', 'def', 'agi', 'wis', 'ctrl'];
        const selectedStat = statsKeys[Math.floor(Math.random() * statsKeys.length)];

        currentRef.stats[selectedStat] += 1;
        [partner1, partner2].forEach(p => {
            if (p.stats[selectedStat] !== undefined) (p.stats as any)[selectedStat] += 1;
            p.affection = Math.min(100, p.affection + 5);
        });
        allLogs.push(`[학교] '${partner1.name}', '${partner2.name}'와(과) 함께 방과 후 스터디 그룹을 가졌습니다. 서로의 지식을 나누며 ${selectedStat.toUpperCase()} 능력이 향상되었습니다! (1일 소요)`);
    }

    // [NEW] 3. 친구와 다툼 및 시비 (5% -> 8%)
    if (Math.random() < 0.08) {
        const friend = school.classmates[Math.floor(Math.random() * school.classmates.length)];
        if (friend && friend.affection > 0) {
            friend.affection = Math.max(-100, friend.affection - 15);
            allLogs.push(`[학교 갈등] '${friend.name}'와(과) 사소한 말다툼 끝에 서로의 기분이 상했습니다. (호감도 -15)`);
        }
    }

    // [NEW] 4. 선택형 이벤트: 훈련 중 부상자 발생 (0.2% -> 1.0%)
    if (Math.random() < 0.01 && !currentRef.pendingChoiceEvent) {
        const victim = school.classmates[Math.floor(Math.random() * school.classmates.length)];
        if (victim) {
            const event: ChoiceEvent = {
                id: `school_injury_${Date.now()}`,
                title: "훈련 중 돌발 상황",
                description: `대련 훈련 도중 '${victim.name}'이(가) 잘못된 신력 제어로 인해 큰 부상을 입고 쓰러졌습니다. 주변 학생들이 웅성거리기 시작합니다. 당신은 어떻게 하시겠습니까?`,
                options: [
                    {
                        text: "훈련을 강행한다 (성취 중심)",
                        action: "stats_gain",
                        outcome: `쓰러진 ${victim.name}을(를) 뒤로하고 훈련을 끝까지 마쳤습니다. 집중력이 극한까지 올라 능력치가 상승했지만, ${victim.name}와 멀어지고 평판이 하락했습니다.`,
                        callbackId: victim.id
                    },
                    {
                        text: "훈련을 멈추고 교관에게 보고한다 (동료 중심)",
                        action: "affection_gain",
                        outcome: `즉각 훈련을 중단하고 ${victim.name}을(를) 부축해 의무실로 옮겼습니다. 교관님은 당신의 동료애를 칭찬했고, ${victim.name}와의 유대가 깊어졌습니다.`,
                        callbackId: victim.id
                    }
                ]
            };
            currentRef.pendingChoiceEvent = event;
            allLogs.push(`[학교 긴급] 훈련 도중 동급생 '${victim.name}'이 부상을 입었습니다!`);
        }
    }

 // [MODIFIED] 5. 특별 교관 (고급 레귤러스 전용 전설적 졸업생 방문) - 평생 단 한 번만 발생 (0.5% -> 2.5%)
    if (school.tier === 'High' && currentRef.level >= 10 && !currentRef.pendingChoiceEvent && !currentRef.hasMetLegendaryGraduate && Math.random() < 0.025) {
        const nation = currentRef.currentLocation?.nation || currentRef.nation;
        
        // 전설적 인물 데이터 생성
        const mercGender = Math.random() < 0.5 ? 'male' : 'female';
        const milGender = Math.random() < 0.5 ? 'male' : 'female';
        const mercName = `${generateName(nation, mercGender)}`;
        const milName = `${generateName(nation, milGender)}`;
        
        const mercLvl = Math.floor(Math.random() * 101) + 400; // 400~500
        const milLvl = Math.floor(Math.random() * 101) + 400;  // 400~500
        
        // 용병 교관 생성
        const mercRace = getRaceByNation(nation);
        const mercGenderLabel = mercGender === 'male' ? "남성" : "여성";
        const mercInstructor: SimpleStudent = {
            id: `legend_merc_${Date.now()}`, 
            name: mercName, 
            age: "30세", 
            birthYear: nextYear - 30,
            gender: mercGenderLabel, 
            classType: "용병",
            race: mercRace,
            nation: nation, 
            level: mercLvl, 
            personality: MBTI_LIST[Math.floor(Math.random() * MBTI_LIST.length)], 
            appearance: "수많은 실전의 흔적이 남은 노련한 용병 졸업생입니다.",
            stats: generateEnemyStats(mercLvl), 
            affection: 10, 
            classNumber: 0,
            job: JobType.MERCENARY,
            mercenaryRank: MercenaryRank.S,
            reputation: MERCENARY_RANK_THRESHOLD[MercenaryRank.S],
            isStaticRank: true,
            visualUrl: generateDefaultVisualUrl(mercName, nation, mercRace, mercGenderLabel)
        };

        // 군인 교관 생성
        const milRace = getRaceByNation(nation);
        const milGenderLabel = milGender === 'male' ? "남성" : "여성";
        const milInstructor: SimpleStudent = {
            id: `legend_mil_${Date.now()}`, 
            name: milName, 
            age: "40세", 
            birthYear: nextYear - 40,
            gender: milGenderLabel, 
            nation: nation, 
            classType: "용병",
            race: milRace,
            level: milLvl, 
            personality: MBTI_LIST[Math.floor(Math.random() * MBTI_LIST.length)], 
            appearance: "철저한 군기와 위엄이 느껴지는 제국의 최고 지휘관 졸업생입니다.",
            stats: generateEnemyStats(milLvl), 
            affection: 10, 
            classNumber: 0,
            job: JobType.SOLDIER,
            militaryRank: MilitaryRank.COL,
            merit: MILITARY_RANK_THRESHOLD[MilitaryRank.COL],
            isStaticRank: true,
            visualUrl: generateDefaultVisualUrl(milName, nation, milRace, milGenderLabel)
        };

        // [MODIFIED] 교관들을 pendingInstructors에 보관하여 선택된 자만 network에 추가될 수 있게 함
        currentRef.pendingInstructors = [mercInstructor, milInstructor];
        currentRef.hasMetLegendaryGraduate = true; // [NEW] 트리거 플래그 설정하여 재발생 방지


        const event: ChoiceEvent = {
            id: `legendary_graduate_${Date.now()}`,
            title: "전설적인 졸업생의 방문",
            description: `학교에 전설적인 졸업생들이 일일 특별 교관으로 방문했습니다. 실전 경험이 풍부한 이들과의 교류는 당신의 성장에 큰 자극이 될 것입니다. 누구를 찾아가 가르침을 청하시겠습니까?`,
            options: [
                {
                    text: `전설의 용병 '${mercName}'와 교류`,
                    action: "mercenary_wisdom",
                    outcome: `S급 용병 ${mercName}로부터 실전에서 살아남는 변칙적인 기술과 세계의 위협에 대한 정보를 전수받았습니다. 당신의 신체 능력이 비약적으로 상승하고 용병들 사이에서 당신의 이름이 거론되기 시작합니다.`,
                    callbackId: mercInstructor.id
                },
                {
                    text: `국가 대장군 '${milName}'와 교류`,
                    action: "military_discipline",
                    outcome: `${milName} 대령으로부터 철저한 군의 규율과 거시적인 전술, 그리고 국가 간 외교 정세에 대한 날카로운 식견을 배웠습니다. 전 능력치가 고르게 상승하며 군 내부에서 당신의 잠재력을 높게 평가합니다.`,
                    callbackId: milInstructor.id
                }
            ]
        };
        currentRef.pendingChoiceEvent = event;
        allLogs.push(`[학교 소식] 전설적인 졸업생들이 학교를 방문했다는 소식에 교내가 열기로 가득합니다.`);
    }

    // 4. 학교 축제 (10월) (0.5% -> 5%)
    if (monthNum === 10 && Math.random() < 0.05) {
        school.classmates.forEach(s => s.affection = Math.min(100, s.affection + 10));
        school.reputation += 5;
        allLogs.push(`[학교 축제] 열기 가득한 축제 기간입니다! 반 친구들과 즐거운 추억을 쌓으며 호감도와 평판이 크게 상승했습니다.`);
    }

    // 5. 러브레터 (0.3% -> 1.5%)
    const potentialCrush = (school.classmates || []).filter(s => s && s.gender !== currentRef.gender && (s.affection >= 70 || school.reputation >= 30));
    if (potentialCrush.length > 0 && Math.random() < 0.015) {
        const sender = potentialCrush[Math.floor(Math.random() * potentialCrush.length)];
        sender.affection = Math.min(100, sender.affection + 5);
        const gifts = ["수제 쿠키", "정교한 책갈피", "행운의 부적", "정성어린 편지"];
        const gift = gifts[Math.floor(Math.random() * gifts.length)];
        allLogs.push(`[학교] 기숙사 책상 위에 '${sender.name}'(이)가 남긴 ${gift}와 작은 쪽지가 놓여 있습니다. 마음이 따뜻해집니다.`);
    }

    // 6. 자동 대화
    if (Math.random() < 0.1) {
        const target = school.classmates[Math.floor(Math.random() * school.classmates.length)];
        target.affection = Math.min(100, target.affection + 5);
        allLogs.push(`[학교] 점심 시간, '${target.name}'와(과) 가벼운 담소를 나누었습니다. 조금 더 친해진 기분입니다.`);
    }

    // 7. 라이벌의 도발 및 결투 신청 (1% -> 3.5%)
    const rival = school.classmates.find(s => s.isRival);
    if (rival && (rival.tension || 0) >= 50 && Math.random() < 0.035) {
        const eStats = { ...rival.stats };
        const hpMult = 1.5;
        const finalMaxHp = Math.floor((eStats.hp || (rival.level * 20)) * hpMult);
        const duelEnemy: Enemy = {
            name: `${rival.name}`,
            level: rival.level,
            hp: finalMaxHp,
            maxHp: finalMaxHp,
            stats: { 
                hp: finalMaxHp,
                maxHp: finalMaxHp,
                mp: 100 + (rival.level * 20),
                maxMp: 100 + (rival.level * 20),
                str: eStats.str || 10,
                int: eStats.int || 10,
                def: eStats.def || 10,
                agi: eStats.agi || 10,
                wis: 10 + rival.level,
                ctrl: 10 + rival.level
            },
            statusEffects: [],
            shinryokuType: rival.shinryokuType || '미개방',
            description: `방과 후, 복도 끝에서 라이벌 ${rival.name}이 당신을 가로막았습니다. "네 녀석이 얼마나 강해졌는지 직접 확인해주지!"`,
            skills: []
        };

        const updated = registerAmbush(currentRef, {
            enemies: [duelEnemy],
            sourceId: rival.id,
            title: "라이벌의 결투 신청!",
            message: `${rival.name}이(가) 당신의 성장을 견제하며 실력 행사에 나섰습니다.`
        });
        Object.assign(currentRef, updated);
        allLogs.push(`라이벌 '${rival.name}'이(가) 당신의 앞을 가로막고 결투를 신청했습니다!`);
    }

    // 8. 라이벌 음해 시스템 (Sabotage) (3% -> 6%)
    if (rival && (rival.tension || 0) >= 60 && Math.random() < 0.06) {
        const roll = Math.random();
        if (roll < 0.5) {
            school.reputation = Math.max(0, school.reputation - 10);
            allLogs.push(`[학교 음해] 라이벌 ${rival.name}이 당신에 대한 악의적인 소문을 퍼뜨려 평판이 하락했습니다!`);
        } else {
            rival.affection = Math.max(-100, rival.affection - 10);
            allLogs.push(`[학교 갈등] 라이벌 ${rival.name}과 사소한 시비 끝에 서로의 감정이 상했습니다.`);
        }
    }

    // [NEW] 9. 담임 교사와의 돌발 이벤트 (1% -> 3.5%)
    if (school.homeroomTeacher && Math.random() < 0.035) {
        const teacher = school.homeroomTeacher;
        const isGoodEvent = (school.reputation || 0) >= 50 ? Math.random() < 0.7 : Math.random() < 0.3;
        
        if (isGoodEvent) {
            // 긍정적 이벤트
            const bonusAffection = Math.floor(Math.random() * 5) + 3;
            teacher.affection = Math.min(100, (teacher.affection || 0) + bonusAffection);
            
            // 과거 인연 동기화
            if (currentRef.socialNetwork) {
                const socialTeacher = currentRef.socialNetwork.find(n => n.id === teacher.id);
                if (socialTeacher) socialTeacher.affection = teacher.affection;
            }

            const goodEvents = [
                `담임 교사 '${teacher.name}'이(가) 당신의 성실한 태도를 칭찬했습니다.`,
                `복도에서 마주친 '${teacher.name}' 선생님이 따뜻한 격려의 말을 건넸습니다.`,
                `수업 시간, '${teacher.name}' 선생님이 당신의 과제를 우수 사례로 소개했습니다.`
            ];
            allLogs.push(`[학교] ${goodEvents[Math.floor(Math.random() * goodEvents.length)]} (호감도 +${bonusAffection})`);
        } else {
            // 부정적 이벤트
            const penaltyAffection = Math.floor(Math.random() * 5) + 3;
            teacher.affection = Math.max(-100, (teacher.affection || 0) - penaltyAffection);
            
            // 과거 인연 동기화
            if (currentRef.socialNetwork) {
                const socialTeacher = currentRef.socialNetwork.find(n => n.id === teacher.id);
                if (socialTeacher) socialTeacher.affection = teacher.affection;
            }

            const badEvents = [
                `담임 교사 '${teacher.name}'에게 복장 불량으로 지적을 받았습니다.`,
                `수업 태도가 좋지 않다며 '${teacher.name}' 선생님께 꾸중을 들었습니다.`,
                `'${teacher.name}' 선생님이 당신의 최근 행실에 대해 우려를 표했습니다.`
            ];
            allLogs.push(`[학교] ${badEvents[Math.floor(Math.random() * badEvents.length)]} (호감도 -${penaltyAffection})`);
        }
    }
};
/**
 * [MODIFIED] 반 친구 성장 및 학생들끼리의 교류 시뮬레이션
 * 플레이어 개입 없이 학생들끼리 친해지거나 라이벌이 됩니다. (로그 미출력)
 */
export const processClassmatesGrowth = (currentRef: Character, days: number, nextYear: number, allLogs: string[]) => {
    if (!currentRef.schoolData?.classmates) return;

    // 1. 기본 능력치 성장 호출
    const prevClassmates = currentRef.schoolData.classmates;
    const { updatedNetwork, growthLogs } = updateSocialNetworkGrowth(currentRef.schoolData.classmates, days, nextYear);
    upgradeSocialNetworkSkillsOnGrowth(prevClassmates, updatedNetwork);
    currentRef.schoolData.classmates = updatedNetwork;

    if (currentRef.clubData?.clubMembers && currentRef.clubData.clubMembers.length > 0) {
        const prevClubMembers = currentRef.clubData.clubMembers;
        const { updatedNetwork: updatedClub } = updateSocialNetworkGrowth(currentRef.clubData.clubMembers, days, nextYear);
        upgradeSocialNetworkSkillsOnGrowth(prevClubMembers, updatedClub);
        currentRef.clubData.clubMembers = updatedClub;
    }
    // growthLogs는 필요 시 출력 (이 엔진 규칙에 따라 처리됨)

    // 2. [NEW] 학생들 간의 사회적 교류 시뮬레이션 (로그 없음)
    const classmates = currentRef.schoolData.classmates;
    if (classmates.length < 2) return;

    // 타임스킵 일수에 따라 교류 횟수 결정 (최대 5회)
    const interactionCount = Math.min(5, days);

    for (let i = 0; i < interactionCount; i++) {
        // 무작위 두 명 선택
        const idx1 = Math.floor(Math.random() * classmates.length);
        let idx2 = Math.floor(Math.random() * classmates.length);
        while (idx1 === idx2) idx2 = Math.floor(Math.random() * classmates.length);

        const s1 = classmates[idx1];
        const s2 = classmates[idx2];

        if (!s1.relations) s1.relations = {};
        if (!s2.relations) s2.relations = {};

        const rel1 = s1.relations[s2.id] || { targetId: s2.id, affection: 0, type: RelationType.ALLY };
        const rel2 = s2.relations[s1.id] || { targetId: s1.id, affection: 0, type: RelationType.ALLY };

        const roll = Math.random();

        if (roll < 0.6) {
            // 우호적 교류: 호감도 상승
            rel1.affection = Math.min(100, rel1.affection + 5);
            rel2.affection = Math.min(100, rel2.affection + 5);
            if (rel1.affection >= 60 && rel1.type === RelationType.ALLY) {
                rel1.type = RelationType.FRIEND;
                rel2.type = RelationType.FRIEND;
            }
        } else if (roll < 0.9) {
            // 경쟁적 교류: 갈등 혹은 라이벌
            rel1.affection = Math.max(-100, rel1.affection - 5);
            rel2.affection = Math.max(-100, rel2.affection - 5);
            if (rel1.affection < 0 && rel1.type === RelationType.ALLY) {
                rel1.type = RelationType.RIVAL;
                rel2.type = RelationType.RIVAL;
            }
        } else {
            // 특별한 기류: 연애 (이성일 경우, 미성년자<->미성년자 또는 성인<->성인만 가능)
            if (s1.gender !== s2.gender && rel1.affection >= 80 && canStartRomance(s1, s2)) {
                rel1.type = RelationType.LOVER;
                rel2.type = RelationType.LOVER;
            }
        }

        s1.relations[s2.id] = rel1;
        s2.relations[s1.id] = rel2;
    }
};
