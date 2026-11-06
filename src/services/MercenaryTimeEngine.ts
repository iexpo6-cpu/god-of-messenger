
import { Character, JobType, MercenaryRank, Companion ,Enemy, ChoiceEvent, ItemRarity, SimpleStudent, RelationType, RumorData, Item, Stats, MercenaryGroup } from '../types';
import { generateName, getYear, generateEnemyStats, addDays, getTierByLevel,getDaysDiff ,extractElementalType, generateDefaultVisualUrl, getRaceByNation } from '../utils';
import { WORLD_GEOGRAPHY, NATION_NAMES, SHINRYOKU_TYPES_LIST, START_DATE, MILITARY_RANK_ORDER } from '../constants';
import { WORLD_LOOT_TABLES } from '../monsterLootTable';
import { REGIONAL_MERCENARY_GROUPS, DEFAULT_MERCENARY_GROUPS } from '../worldguild';
import { MERCENARY_RANK_THRESHOLD, getNextMercenaryRank } from '../mercenaryRankUp';
import { registerAmbush } from './incidentQueue';



/**
 * 용병 생활 중 발생하는 일일 시뮬레이션 로직
 */
export const processMercenaryDailyEvents = (currentRef: Character, nextDate: string, allLogs: string[]) => {
    // 용병직이 아니거나, 이미 소속된 용병단이 있는 경우(None이 아님) 스킵
  const isMercenary = currentRef.job === JobType.MERCENARY;
const mData = currentRef.mercenaryData;

// "소속이 없는 자유 용병" 판별 조건
// 1. 용병 데이터가 존재해야 함
// 2. 본인이 용병단 리더가 아니어야 함 (isGroupLeader === false)
// 3. 가입된 용병단 ID가 없어야 함 (!joinedGroupId)
    if (!isMercenary || !mData) return;

    const joinedGroupId = mData.joinedGroupId;
  // [FIX] loc 변수 정의 및 안전한 폴백 처리
    const loc = {
        region: currentRef.currentLocation?.region || '아시아',
        nation: currentRef.currentLocation?.nation || currentRef.nation || '대한민국',
        city: currentRef.currentLocation?.city || '서울'
    };

    // ---------------------------------------------------------
    // SECTION A: 모든 용병 공통 이벤트 (소문, 시비)
    // ---------------------------------------------------------
 const nation = currentRef.currentLocation?.nation || currentRef.nation;

    const rep = currentRef.mercenaryData?.reputation || 0;

   // 1. [MODIFIED] 주점의 뜬소문 (Tavern Rumors) - 2% 확률로 퀘스트화 데이터 생성
    if (Math.random() < 0.02) {
        const allRegions = Object.keys(WORLD_GEOGRAPHY).filter(r => !['신계', '마계', '기타'].includes(r));
        const randomRegion = allRegions[Math.floor(Math.random() * allRegions.length)];
        const nationsInRegion = Object.keys(WORLD_GEOGRAPHY[randomRegion]);
        const randomNation = nationsInRegion[Math.floor(Math.random() * nationsInRegion.length)];
        const randomCity = WORLD_GEOGRAPHY[randomRegion][randomNation].cities[Math.floor(Math.random() * WORLD_GEOGRAPHY[randomRegion][randomNation].cities.length)];

        // 희귀 아이템 선정
        const rarities = [ItemRarity.RARE, ItemRarity.EPIC, ItemRarity.UNIQUE, ItemRarity.LEGENDARY];
        const selectedRarity = rarities[Math.floor(Math.random() * (rep > 5000 ? 4 : 2))];
        
        // 아이템 템플릿 생성 (실제 데이터는 월드 루프 테이블 참조)
        const regionalTable = WORLD_LOOT_TABLES[randomNation] || WORLD_LOOT_TABLES['generic'];
        const itemTemplate = regionalTable.find(entry => entry.rarity === selectedRarity) || regionalTable[Math.floor(Math.random() * regionalTable.length)];
        
        const secondaryOptions = itemTemplate.secondaryOptions || itemTemplate.options || [];
        const rumorItem: Item = {
            name: itemTemplate.item || itemTemplate.name,
            type: itemTemplate.type,
            weaponType: itemTemplate.weaponType,
            elementalType: itemTemplate.elementalType || extractElementalType(secondaryOptions),
            rarity: selectedRarity,
            description: itemTemplate.description || `소문에 의해 발견된 보물입니다.`,
            stats: itemTemplate.stats || { str: 10 },
            secondaryOptions: secondaryOptions,
            enhancement: 0,
            imageUrl: itemTemplate.imageUrl
        };

        const rumor: RumorData = {
            itemId: `rumor_${Date.now()}`,
            item: rumorItem,
            city: randomCity,
            nation: randomNation,
            description: `${randomCity}의 어느 뒷골목에 ${selectedRarity} 등급의 유물 '${rumorItem.name}'이(가) 숨겨져 있다는 첩보입니다.`
        };

        if (currentRef.mercenaryData) {
            currentRef.mercenaryData.activeRumor = rumor;
        }

        allLogs.push(`[주점 소문] 누군가 "${randomCity}의 뒷골목에서 ${selectedRarity} 등급의 보물 '${rumorItem.name}'이(가) 발견되었다"는 이야기를 나누는 것을 들었습니다. 늦기 전에 가보는 것이 좋겠군요.`);
        
        if (!currentRef.memories) currentRef.memories = [];
        currentRef.memories.push(`[${nextDate}] ${randomCity} 뒷골목에서 ${selectedRarity} 장비 '${rumorItem.name}'이(가) 발견되었다는 첩보 입수.`);
    }
  // 2. [MODIFIED] 길거리 시비 및 용병 대련 신청 (Street Challenges)
    // 명성이 높을수록 도전받을 확률 증가 (최대 2.5%)
    const MBTI_LIST = ["INTJ", "INFJ", "ENTJ", "ENFJ", "ISTJ", "ISFJ", "ESTJ", "ESFJ", "ISTP", "ISFP", "ESTP", "ESFP", "INTP", "INFP", "ENTP", "ENFP"];
    const challengeChance = Math.min(0.025, 0.005 + (rep / 50000));
    
    if (Math.random() < challengeChance) {
        if (rep > 150000) return;
         const ranks = Object.values(MercenaryRank);
        const opponentLevel = Math.min(300, Math.floor(Math.random() * 30) + Math.floor(rep/20));
        const stats = generateEnemyStats(opponentLevel);
        const gender = Math.random() > 0.5 ? "남성" : "여성";
        const genderParam = gender === "남성" ? "male" : "female";
        const name = generateName(nation, genderParam);
        const mbti = MBTI_LIST[Math.floor(Math.random() * MBTI_LIST.length)];
            const minRankIdx = opponentLevel > 200 ? 5 : opponentLevel > 100 ? 3 : opponentLevel > 70 ? 2 : opponentLevel > 50 ? 1: 0;
            const randomRankIdx = minRankIdx
             const randomRank = ranks[randomRankIdx];
       
        
        const challengerRace = getRaceByNation(nation);
        const challengerName = generateName(nation, genderParam);
        // NPC 데이터 생성 (SimpleStudent 구조 활용)
        const npcId = `mercenary_challenger_${Date.now()}`; 
        const challengerNpc: SimpleStudent = {

            id: npcId,
            name: `${challengerName}`,
            age: `${20 + Math.floor(Math.random() * 20)}세`,
            birthYear: getYear(nextDate) - (20 + Math.floor(Math.random() * 20)),
            gender: gender,
            race: challengerRace,
            nation: nation,
            level: opponentLevel,
            personality: mbti,
            classType: "용병",
            job: JobType.MERCENARY, 
            mercenaryRank: randomRank, 
            reputation: MERCENARY_RANK_THRESHOLD[randomRank], 
            appearance: "수많은 전장을 누빈 듯한 거친 인상의 용병입니다.",
            stats: { ...stats },
            affection: 0,
            isRival: Math.random() < 0.1, // 10% 확률로 라이벌 설정
            visualUrl: generateDefaultVisualUrl(challengerName, nation, challengerRace, gender)
        };

        // [CORE] 승패 상관없이 관계망에 즉시 등록
        if (!currentRef.socialNetwork) currentRef.socialNetwork = [];
        currentRef.socialNetwork.push(challengerNpc);

        // 전투 데이터 구성
        const challengeEnemy: Enemy = {
            name: challengerNpc.name,
            level: opponentLevel,
            hp: stats.maxHp * 1,
            maxHp: stats.maxHp * 1,
            stats: { ...stats, hp: stats.maxHp * 1, maxHp: stats.maxHp * 1 },
            shinryokuType: SHINRYOKU_TYPES_LIST[Math.floor(Math.random() * SHINRYOKU_TYPES_LIST.length)],
            statusEffects: [],
            description: `"네가 요즘 이름 좀 날린다는 그 녀석이냐? 가짜가 아닌지 내 칼로 증명해주지!"`,
            skills: []
        };

        const updated = registerAmbush(currentRef, {
            enemies: [challengeEnemy],
            sourceId: npcId,
            title: "명성을 노린 도전!",
            message: `당신의 명성을 시기한 용병 '${name}'이(가) 길을 가로막고 진검 승부를 신청했습니다.`
        });
        Object.assign(currentRef, updated);
        
        allLogs.push(`[위기] 길거리에서 용병 '${name}'이(가) 당신의 앞을 막아서며 결투를 신청했습니다!`);
    }

 // ---------------------------------------------------------
    // SECTION B: 용병단 소속 전용 이벤트 (Salary, Sparring, etc.)
    // ---------------------------------------------------------
    if (joinedGroupId) {
        const allGroups = REGIONAL_MERCENARY_GROUPS[loc.city] || DEFAULT_MERCENARY_GROUPS(loc.nation, loc.city);
        const groupInfo = allGroups.find(g => g.id === joinedGroupId) || { name: "소속 용병단" };

        // 1. 정기 급여 및 유지비 (Monthly Salary) - 매달 1일
        if (nextDate.endsWith('-01')) {
            const ranks = Object.values(MercenaryRank);
            const rankBonus = (ranks.indexOf(mData.rank) + 1) * 5000;
            currentRef.money += rankBonus;
            allLogs.push(`[용병단 급여] 소속 용병단 '${groupInfo.name}'으로부터 이번 달 활동비 ${rankBonus.toLocaleString()}G가 입금되었습니다.`);
        }

        // [NEW] 2. 내부 서열 변동 및 단장과의 갈등 시나리오
        if (!mData.isGroupLeader && joinedGroupId) {
            let foundGroup: MercenaryGroup | null = null;
            for (const cityKey in REGIONAL_MERCENARY_GROUPS) {
                const group = REGIONAL_MERCENARY_GROUPS[cityKey].find(g => g.id === joinedGroupId);
                if (group) { foundGroup = group; break; }
            }

            if (foundGroup) {
                const viceId = `faction_core_${foundGroup.id}_Vice`;
                const capId = `faction_core_${foundGroup.id}_Captain`;
                const viceBond = currentRef.socialNetwork?.find(n => n.id === viceId);
                const capBond = currentRef.socialNetwork?.find(n => n.id === capId);

                // 2. 부단장 승격 로직
        if (viceBond && rep > (viceBond.reputation || 0) && !mData.isViceCaptain && !mData.isGroupLeader) {
            mData.isViceCaptain = true;
            
            // 기존 부단장 강등
            viceBond.mercenaryRank = MercenaryRank.B; 
            
            const roll = Math.random();
            if (roll < 0.3) {
                // 축하 시나리오
                viceBond.affection = Math.min(100, viceBond.affection + 20);
                allLogs.push(`[승격] '${foundGroup.name}'의 부단장으로 임명되었습니다! 전 부단장 '${viceBond.name}'은(는) 깨끗이 패배를 인정하고 당신의 앞날을 축복합니다.`);
            } else {
                // 시기 시나리오
                viceBond.affection = Math.max(-100, viceBond.affection - 50);
                viceBond.tension = 100;
                allLogs.push(`[승격] 당신의 명성이 자자해지자 단장님이 당신을 새로운 부단장으로 임명했습니다. 자리를 뺏긴 '${viceBond.name}'은(는) 모욕감을 느끼며 당신을 적대시하기 시작합니다.`);
            }
        }
          // 3. 단장 추월 이벤트
        if (capBond && rep > (capBond.reputation || 0) && !currentRef.pendingChoiceEvent && !mData.isGroupLeader) {
            const isJealous = Math.random() < 0.5;
            
            if (isJealous) {
                // 단장의 시기질투
                capBond.affection = Math.max(-100, capBond.affection - 20);
                capBond.tension = Math.min(100, (capBond.tension || 0) + 15);
                if (Math.random() < 0.1) allLogs.push(`[용병단] 단장 '${capBond.name}'이 당신의 높아지는 명성을 경계하며 사나운 눈빛으로 쳐다봅니다.`);
            } else {
                // 동반 탈퇴 제안
                currentRef.pendingChoiceEvent = {
                    id: `merc_revolt_${Date.now()}`,
                    title: "지배자의 고뇌: 새로운 시작?",
                    description: `당신의 명성은 이제 단장인 '${capBond.name}'마저 뛰어넘었습니다. 이를 지켜보던 몇몇 단원들이 당신에게 조심스럽게 다가와 속삭입니다. "대장님, 이제 저런 무능한 단장 밑에 있을 이유가 없지 않습니까? 저희와 함께 독립하여 새로운 용병단을 세우시죠!"`,
                    options: [
                        {
                            text: "단원들과 함께 독립한다 (용병단 탈퇴)",
                            action: "leave_group_with_loyalists",
                            outcome: `당신을 믿고 따르는 단원들과 함께 '${foundGroup.name}'을(를) 떠났습니다. 단장 '${capBond.name}'은(는) 배신감에 치를 떨며 당신을 원수로 규정했습니다.`,
                            callbackId: joinedGroupId
                        },
                        {
                            text: "단장에게 충성을 맹세한다",
                            action: "affection_gain",
                            outcome: `단장 '${capBond.name}'의 불안감을 눈치채고 다시 한번 충성을 맹세했습니다. 단장은 안도하면서도 묘한 경쟁심을 유지합니다.`,
                            callbackId: "stay_loyal"
                        }
                    ]
                };
                allLogs.push(`[용병단 소문] 당신을 지지하는 단원들 사이에서 새로운 용병단을 창설하자는 움직임이 포착됩니다.`);
            }
        }
    } 
        // 2. 단원들과의 합동 훈련 (Faction Sparring) - 2% 확률
        if (Math.random() < 0.02) {
            const trainableStats: (keyof Stats)[] = ['str', 'def', 'agi', 'ctrl'];
            const selectedStat = trainableStats[Math.floor(Math.random() * trainableStats.length)];
            currentRef.stats[selectedStat] += 1;
            allLogs.push(`[용병단 일상] 연무장에서 동료들과 땀 흘리며 합동 훈련을 가졌습니다. ${selectedStat.toUpperCase()}이(가) 1 상승합니다.`);
        }

        // 3. 지부장의 격려/상호작용 (Leadership Interaction) - 1.5% 확률
        const captain = currentRef.socialNetwork?.find(n => n.id.includes(`faction_core_${joinedGroupId}_Captain`));
        if (captain && Math.random() < 0.015) {
            captain.affection = Math.min(100, captain.affection + 2);
            allLogs.push(`[용병단 소식] 단장 '${captain.name}'이 당신의 최근 활약을 전해 듣고 흡족해하며 독주 한 병을 보내왔습니다. (호감도 +2)`);
        }

           // [NEW] 3. 신입 용병 교육 (Mentoring) (1% 확률)
        // 가입한지 1년(365일) 이상일 때 발생
        const daysInGroup = getDaysDiff(mData.registeredDate || START_DATE, nextDate);
        if (daysInGroup >= 365 && !currentRef.pendingChoiceEvent && Math.random() < 0.01) {
            const newbieGender = Math.random() > 0.5 ? "남성" : "여성";
            const newbieGenderParam = newbieGender === "남성" ? "male" : "female";
            const newbieName = generateName(loc.nation, newbieGenderParam);
            currentRef.pendingChoiceEvent = {
                id: `merc_mentoring_${Date.now()}`,
                title: "신입 용병 교육 요청",
                description: `소속 용병단의 파릇파릇한 신입 '${newbieName}'이(가) 당신의 명성을 듣고 가르침을 청해왔습니다. 며칠간 시간을 내어 그를 지도해주시겠습니까?`,
                options: [
                    {
                        text: "집중 교육을 실시한다 (3일 소요)",
                        action: "affection_gain",
                        outcome: `3일간 밤낮없이 신입을 지도했습니다. '${newbieName}'은(는) 비약적으로 성장했고, 당신을 진심으로 존경하게 되었습니다. (호감도 대폭 상승, 3일 경과)`,
                        callbackId: newbieName
                    },
                    {
                        text: "바쁘다며 거절한다",
                        action: "none",
                        outcome: "바쁜 일정을 핑계로 거절했습니다. 신입 용병은 아쉬운 기색을 내비치며 돌아갔습니다.",
                        callbackId: "none"
                    }
                ]
            };
            allLogs.push(`[용병단] 신입 용병 '${newbieName}'이(가) 당신에게 조언을 구하러 찾아왔습니다.`);
        }

         // [MODIFIED] 4. 스카우트 제의 (Headhunting) - 국내외 거대 용병단 포함 및 소속 이동 로직 (1% 확률)
        // 명성 1000 이상일 때 발생
         if (rep >= 1000 && !currentRef.pendingChoiceEvent && Math.random() < 0.01) {
            const allPossibleGroups: MercenaryGroup[] = [];
            // 실제 데이터 테이블을 순회하며 가용한 대형/중형 용병단 수집
            Object.entries(REGIONAL_MERCENARY_GROUPS).forEach(([cityName, list]) => {
                list.forEach(g => {
                    if (g.id !== joinedGroupId && currentRef.level >= g.minLevel && (g.size === 'Large' || g.size === 'Medium')) {
                        allPossibleGroups.push(g);
                    }
                });
            });

            if (allPossibleGroups.length > 0) {
                const targetGroup = allPossibleGroups[Math.floor(Math.random() * allPossibleGroups.length)];
                const isDomestic = targetGroup.nation === loc.nation;
                
                currentRef.pendingChoiceEvent = {
                    id: `merc_headhunt_${Date.now()}`,
                    title: isDomestic ? "거대 용병단의 이적 제의" : "타국 세력의 스카우트 제의",
                    description: `[${targetGroup.name}] 용병단에서 당신의 명성을 듣고 스카우트 제의를 보내왔습니다. "우리와 함께 더 넓은 세상을 향하지 않겠나?" 파격적인 계약금 10만G를 제시했습니다.`,
                    options: [
                        {
                            text: `제의 수락 및 [${targetGroup.name}] 이적`,
                            action: "join_guild",
                            outcome: `새로운 소속으로 옮겼습니다. ${isDomestic ? '' : `${targetGroup.nation}으로 이동하며 `}기존 동료들과는 작별했습니다. (계약금 10만G 획득)`,
                            callbackId: JSON.stringify({ 
                                guildId: targetGroup.id, 
                                name: targetGroup.name, 
                                nation: targetGroup.nation, 
                                city: targetGroup.city,
                                bonusGold: 100000 
                            })
                        },
                        {
                            text: "의리를 지키며 거절",
                            action: "affection_gain",
                            outcome: "제의를 정중히 거절하고 현재 용병단에 남기로 했습니다. 단원들이 당신의 충성심에 감동했습니다.",
                            callbackId: "loyalty_stay"
                        }
                    ]
                };
                allLogs.push(`[소식] 유력 용병단 [${targetGroup.name}]에서 당신을 스카우트하려 한다는 전갈이 왔습니다.`);
            }
        }
    }
    }
     // ---------------------------------------------------------
    // SECTION C: 용병단장 전용 돌발 이벤트 (Leader Specific)
    // ---------------------------------------------------------
    if (mData.isGroupLeader && !currentRef.pendingChoiceEvent) {
        const leaderRoll = Math.random();

     // 1. 단원 간의 갈등 중재 (Internal Conflict)
        if (leaderRoll < 0.001) {
            const groupMemberIds = mData.groupMembers || [];
            const allGroupEntities = [...currentRef.companions, ...(currentRef.inactiveCompanions || [])]
                .filter(c => groupMemberIds.includes(c.id));

            if (allGroupEntities.length >= 2) {
                // 갈등 중인 멤버 찾기 (용병단원 중에서)
                let p1: Companion | null = null;
                let p2: Companion | null = null;
                for (const c of allGroupEntities) {
                    if (c.relations) {
                        const conflictRel = Object.values(c.relations).find(r => 
                            r.type === RelationType.CONFLICT && 
                            groupMemberIds.includes(r.targetId)
                        );
                        if (conflictRel) {
                            p1 = c;
                            p2 = allGroupEntities.find(target => target.id === conflictRel.targetId) || null;
                            break;
                        }
                    }
                }

            if (p1 && p2) {
                currentRef.pendingChoiceEvent = {
                    id: `merc_internal_conflict_${Date.now()}`,
                    title: "일촉즉발: 내부 분열",
                    description: `단장님! 연무장에서 '${p1.name}'와(과) '${p2.name}'이(가) 사소한 말다툼 끝에 무기를 꺼내들었습니다! 이대로 두면 큰 사고로 이어질 것 같습니다. 어떻게 하시겠습니까?`,
                    options: [
                        { text: "엄격한 처벌: 양측 모두 근신 처분", action: "mercenary_internal_conflict", outcome: "두 사람의 분노는 가라앉았으나, 강압적인 처사에 충성도가 하락했습니다.", callbackId: JSON.stringify({type: 'punish', p1: p1.id, p2: p2.id}) },
                        { text: "화해의 연회 개최 (10,000G)", action: "mercenary_internal_conflict", outcome: "술잔을 나누며 서로의 오해를 풀었습니다. 용병단의 결속력이 강해졌습니다.", callbackId: JSON.stringify({type: 'feast', p1: p1.id, p2: p2.id}) },
                        { text: "결투 허용: 실력으로 승부해라", action: "mercenary_internal_conflict", outcome: "치열한 대련 끝에 승자는 깨달음을 얻었고, 패자는 실력을 인정했습니다.", callbackId: JSON.stringify({type: 'duel', p1: p1.id, p2: p2.id}) }
                    ]
                };
                allLogs.push(`[비상] 용병단 내부에서 '${p1.name}'와(과) '${p2.name}' 사이에 큰 갈등이 발생했습니다!`);
            }
        }

        // 2. 라이벌 용병단의 방해 (Sabotage)
        else if (leaderRoll < 0.002 && rep >= 3000) {
            const rivalGroup = "검은 송곳니 용병단";
            currentRef.pendingChoiceEvent = {
                id: `merc_rival_sabotage_${Date.now()}`,
                title: "적대 세력의 방해",
                description: `보고드립니다! '${rivalGroup}' 녀석들이 우리가 수주한 의뢰지로 가는 길목을 차단하고 보급품을 탈취했습니다! 비겁한 놈들이 우리 명성을 시기하는 모양입니다.`,
                options: [
                    { text: "즉각 보복: 거점 습격", action: "mercenary_rival_sabotage", outcome: "비겁한 녀석들의 코를 납작하게 해주기로 했습니다. 즉시 전투에 돌입합니다!", callbackId: JSON.stringify({type: 'retaliate', name: rivalGroup}) },
                    { text: "외교적 항의: 길드 본부에 신고 (명성 200 소모)", action: "mercenary_rival_sabotage", outcome: "길드의 중재로 보급품을 돌려받고 사과를 받아냈습니다.", callbackId: JSON.stringify({type: 'report', name: rivalGroup}) },
                    { text: "인내와 우회: 피해 감수 (3일 지연)", action: "mercenary_rival_sabotage", outcome: "불필요한 충돌을 피하기 위해 우회로를 택했습니다. 단원들이 분해합니다.", callbackId: JSON.stringify({type: 'endure', name: rivalGroup}) }
                ]
            };
            allLogs.push(`[경보] 라이벌 용병단 '${rivalGroup}'이 우리의 작전을 노골적으로 방해하고 있습니다.`);
        }

        // 3. 유망주의 이적 고민 (Rising Star)
        else if (leaderRoll < 0.003 && currentRef.companions.length > 0) {
            const star = currentRef.companions.sort((a,b) => b.level - a.level)[0];
            if (star && star.level >= currentRef.level - 5) {
                currentRef.pendingChoiceEvent = {
                    id: `merc_rising_star_${Date.now()}`,
                    title: "흔들리는 충성심: 스카우트",
                    description: `단장님... 사실 타국 거대 용병단에서 제게 부단장 자리를 제안했습니다. 저의 성장 가능성을 높게 평가하더군요. 이곳도 좋지만, 그쪽의 조건이 너무 파격적이라 마음이 흔들립니다.`,
                    options: [
                        { text: "대우 개선: 특별 보너스 (50,000G)", action: "mercenary_rising_star", outcome: "당신의 통 큰 제안에 감동한 단원이 뼈를 묻겠다고 맹세합니다.", callbackId: JSON.stringify({type: 'bonus', targetId: star.id}) },
                        { text: "감정에 호소: 우리의 인연", action: "mercenary_rising_star", outcome: "함께 생사고락을 함께한 추억을 일깨웠습니다.", callbackId: JSON.stringify({type: 'persuade', targetId: star.id}) },
                        { text: "방출: 더 넓은 세상으로 나가라", action: "mercenary_rising_star", outcome: "단원의 앞날을 축복하며 보내주었습니다. 그는 언젠가 당신의 은혜를 갚으러 올 것입니다.", callbackId: JSON.stringify({type: 'release', targetId: star.id}) }
                    ]
                };
                allLogs.push(`[인사] 우리 용병단의 핵심 전력인 '${star.name}'이 이적을 고민하고 있다는 정보가 들어왔습니다.`);
            }
        }

        // 4. 어둠의 계약 제안 (Shady Business)
        else if (leaderRoll < 0.004 && (currentRef.infamy || 0) >= 50) {
            currentRef.pendingChoiceEvent = {
                id: `merc_shady_deal_${Date.now()}`,
                title: "은밀한 유혹: 어둠의 의뢰",
                description: `어둠 속에서 후드를 쓴 자가 접근했습니다. "특정 가문의 후계자를 사고사로 위장해 처리해주십시오. 길드 의뢰의 10배에 달하는 보상을 현찰로 즉시 지불하겠소."`,
                options: [
                    { text: "계약 수락: 피 묻은 돈 (20만G)", action: "mercenary_shady_deal", outcome: "은밀하게 일을 처리했습니다. 통장은 두둑해졌지만 악명이 자자해집니다.", callbackId: 'accept' },
                    { text: "제안자 고발: 정의 구현", action: "mercenary_shady_deal", outcome: "범죄 모의자를 즉각 관아에 넘겼습니다. 공적을 인정받았습니다.", callbackId: 'report' },
                    { text: "단호한 거절: 명예로운 용병", action: "mercenary_shady_deal", outcome: "돈 때문에 영혼을 팔지 않겠다며 일갈했습니다. 단원들이 존경의 눈빛을 보냅니다.", callbackId: 'refuse' }
                ]
            };
            allLogs.push(`[소식] 뒷골목의 정체불명의 인물이 용병단 본부로 은밀한 제안을 보내왔습니다.`);
        }

        // 5. 전사한 단원의 유가족 방문 (Fallen Family)
        else if (leaderRoll < 0.005 && mData.lastDeathDate) {
            const deathDate = new Date(mData.lastDeathDate);
            const todayDate = new Date(nextDate);
            const diffDays = (todayDate.getTime() - deathDate.getTime()) / (1000 * 3600 * 24);
            
           if (diffDays <= 365) {
                const fallenName = mData.lastCasualtyName || "이름 없는 용병";
                const fallenNation = mData.lastCasualtyNation || "대한민국";
                const fallenSurname = mData.lastCasualtySurname || "";

                currentRef.pendingChoiceEvent = {
                    id: `merc_fallen_family_${Date.now()}`,
                    title: "전우의 빈자리: 유가족",
                    description: `지난 작전에서 전사한 '${fallenName}'의 어린 동생이 용병단 본부 앞에 찾아왔습니다. 형의 유품을 찾으러 왔다고 합니다. 눈가가 퉁퉁 부어있군요.`,
                    options: [
                        { text: "충분한 위로: 연금 약속 (50,000G)", action: "mercenary_fallen_family", outcome: "유가족의 생계를 책임지기로 약속했습니다. 용병단 전체에 따뜻한 동료애가 흐릅니다.", callbackId: 'generous' },
                        { 
                            text: "용병의 길: 수습 단원으로 영입", 
                            action: "mercenary_fallen_family", 
                            outcome: "형의 유지를 잇게 해주었습니다. 아이의 눈에 복수와 투지가 타오릅니다.", 
                            callbackId: JSON.stringify({ type: 'recruit', name: fallenName, nation: fallenNation, surname: fallenSurname }) 
                        },
                        { text: "사무적인 처리: 조의금만 전달", action: "mercenary_fallen_family", outcome: "규정에 따른 최소한의 예우만 갖췄습니다. 효율적이지만 단원들이 차가운 당신의 모습에 실망합니다.", callbackId: 'basic' }
                    ]
                };
                allLogs.push(`[방문] 전사한 단원 '${fallenName}'의 유가족이 본부를 찾아왔습니다.`);
            }
        }
    }

    // ---------------------------------------------------------
    // SECTION C: 소속 없는 자유 용병 전용 (가입 제안)
    // ---------------------------------------------------------
    const isFreelancer = !mData.isGroupLeader && !mData.joinedGroupId;
    if (isFreelancer && rep >= 500 && !currentRef.pendingChoiceEvent && Math.random() < 0.02) {
        // 실제 데이터 테이블에서 무작위 선택
        const citiesWithGroups = Object.keys(REGIONAL_MERCENARY_GROUPS);
        const randomCity = citiesWithGroups[Math.floor(Math.random() * citiesWithGroups.length)];
        const groups = REGIONAL_MERCENARY_GROUPS[randomCity];
        const targetGroup = groups[Math.floor(Math.random() * groups.length)];

        if (currentRef.level >= targetGroup.minLevel) {
            currentRef.pendingChoiceEvent = {
                id: `guild_invite_${targetGroup.id}_${Date.now()}`,
                title: "용병단 가입 제안",
                description: `'${targetGroup.nation}'의 유명 용병단 [${targetGroup.name}]이 당신을 주목하고 있습니다. 이들과 정식 계약을 맺으시겠습니까?`,
                options: [
                    {
                        text: `[${targetGroup.name}] 가입`,
                        action: "join_guild",
                        outcome: `[${targetGroup.name}]의 일원이 되었습니다. 이제 해당 도시를 거점으로 활동하게 됩니다.`,
                        callbackId: JSON.stringify({ 
                            guildId: targetGroup.id, 
                            name: targetGroup.name,
                            nation: targetGroup.nation,
                            city: targetGroup.city
                        })
                    },
                    {
                        text: "거절하고 방랑을 계속함",
                        action: "decline_guild",
                        outcome: "자유로운 신분을 유지하기로 했습니다.",
                        callbackId: "none"
                    }
                ]
            };
            allLogs.push(`[소식] 용병단 [${targetGroup.name}]으로부터 영입 제안이 도착했습니다.`);
        }
    }
}
}
