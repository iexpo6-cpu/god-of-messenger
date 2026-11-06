
import { Character, SimpleStudent, JobType, RelationType, MercenaryRank, CompanionRelation, Enemy, ClassTier, SkillType, Stats, ItemRarity, Item, Companion, ChoiceEvent } from '../types';
import { generateName, generateNameWithSurname, extractSurname, generateCompanionStats, getYear, generateEnemyStats, getTierByLevel, addDays, generateDefaultVisualUrl, getRaceByNation } from '../utils';
import { NATION_DATA, SHINRYOKU_TYPES_LIST, HUMANOID_CLASSES, WORLD_GEOGRAPHY } from '../constants';
import { WORLD_LOOT_TABLES, findItemDataInWorldTables } from '../monsterLootTable';
import { registerAmbush } from './incidentQueue';
import { getValidRivalLocation, sanitizeCharacterRivalLocations, processRivalMonthlyInfluence, processGeneralNpcMonthlyInfluence, normalizeShinryokuType } from './rivalLocationService';
import { upgradeNpcSkillsOnGrowth } from './companionGrowthService';
import { generateNpcEscortParty } from './npcCombatScaling';

/**
 * 영원의 라이벌 및 결사대 적 객체 생성 (방안 1~4 스케일링 엔진 적용)
 */
export const createRivalEnemies = (eternalRival: SimpleStudent): Enemy[] => {
    return generateNpcEscortParty(eternalRival, true, false);
};

/**
 * socialNetwork 내의 NPC들의 삶을 시뮬레이션합니다. 
 * (결혼, 출산, 복수, 외부 사망, 인맥 추천, 라이벌 성장 등)
 */
export const processNpcLifeEvents = (character: Character, days: number): { updatedChar: Character, lifeLogs: string[] } => {
    if (!character.socialNetwork || character.socialNetwork.length === 0 || days <= 0) {
        return { updatedChar: character, lifeLogs: [] };
    }

    const lifeLogs: string[] = [];
    const newChar = { ...character };
    sanitizeCharacterRivalLocations(newChar);
    const currentYear = getYear(character.currentDate || '2000-01-01');
    const MBTI_LIST = ["INTJ", "INFJ", "ENTJ", "ENFJ", "ISTJ", "ISFJ", "ESTJ", "ESFJ", "ISTP", "ISFP", "ESTP", "ESFP", "INTP", "INFP", "ENTP", "ENFP"];

    if (!newChar.socialNetwork || !Array.isArray(newChar.socialNetwork) || newChar.socialNetwork.length === 0) {
        return { updatedChar: newChar, lifeLogs };
    }

    // 매달 1회 정도의 정밀 시뮬레이션 확률 (며칠이 흘렀느냐에 따라 보정, 일일 최소 4% 보장)
    const monthRoll = Math.min(0.35, Math.max(0.04, (days / 30) * 0.35));
    if (Math.random() > monthRoll) return { updatedChar: newChar, lifeLogs };

    let network = [...newChar.socialNetwork];

    // --- [NEW] 과거 인연들 간의 자율적 교류 시뮬레이션 (로그 미출력) ---
    const activeNpcs = (network || []).filter(n => n && !n.isPurged);
    if (activeNpcs.length >= 2) {
        // 인맥 규모에 따라 교류 횟수 결정 (최대 5회)
        const interactionCount = Math.min(5, Math.floor(activeNpcs.length / 4) + 1);
        for (let i = 0; i < interactionCount; i++) {
            const idx1 = Math.floor(Math.random() * activeNpcs.length);
            let idx2 = Math.floor(Math.random() * activeNpcs.length);
            while (idx1 === idx2) idx2 = Math.floor(Math.random() * activeNpcs.length);

            const n1 = activeNpcs[idx1];
            const n2 = activeNpcs[idx2];

            if (!n1.relations) n1.relations = {};
            if (!n2.relations) n2.relations = {};

            const rel1 = n1.relations[n2.id] || { targetId: n2.id, affection: 0, type: RelationType.ALLY };
            const rel2 = n2.relations[n1.id] || { targetId: n1.id, affection: 0, type: RelationType.ALLY };

            const interactRoll = Math.random();
            if (interactRoll < 0.7) { // 70% 확률로 우호적 교류
                rel1.affection = Math.min(100, rel1.affection + 5);
                rel2.affection = Math.min(100, rel2.affection + 5);
                // 특정 수치 이상 시 관계 격상
                if (rel1.affection >= 50 && rel1.type === RelationType.ALLY) {
                    rel1.type = RelationType.FRIEND;
                    rel2.type = RelationType.FRIEND;
                }
            } else { // 30% 확률로 갈등 또는 경쟁
                rel1.affection = Math.max(-100, rel1.affection - 5);
                rel2.affection = Math.max(-100, rel2.affection - 5);
                // 관계 악화 또는 라이벌 형성
                if (rel1.affection < 0 && rel1.type === RelationType.ALLY) {
                    rel1.type = RelationType.RIVAL;
                    rel2.type = RelationType.RIVAL;
                } else if (rel1.affection <= -50 && rel1.type !== RelationType.ENEMY) {
                    rel1.type = RelationType.CONFLICT;
                    rel2.type = RelationType.CONFLICT;
                }
            }
            n1.relations[n2.id] = rel1;
            n2.relations[n1.id] = rel2;
        }
    }
    // --- 1. 인연의 복수 (Vengeance) ---
    // 플레이어가 '처단'한 NPC가 있다면, 그와 관계가 깊은 생존 NPC가 복수자로 변합니다.
    const purgedByPlayer = (network || []).filter(n => n && n.isPurged && n.purgedReason === '처단');
    if (purgedByPlayer.length > 0) {
        const victim = purgedByPlayer[Math.floor(Math.random() * purgedByPlayer.length)];
        // 희생자와 관계가 있던 생존 NPC 탐색
        const avengerCandidate = network.find(n => 
            !n.isPurged && 
            n.relations && 
            n.relations[victim.id] && 
            [RelationType.FRIEND, RelationType.BEST_FRIEND, RelationType.LOVER, RelationType.SPOUSE].includes(n.relations[victim.id].type)
        );

        if (avengerCandidate) {
            avengerCandidate.affection = -100;
            avengerCandidate.tension = 100;
            
            const avengerEnemies = generateNpcEscortParty(avengerCandidate, true, false);
            if (avengerEnemies.length > 0) {
                avengerEnemies[0].name = `[복수자] ${avengerCandidate.name}`;
                avengerEnemies[0].description = `당신이 처단한 '${victim.name}'의 소중한 인연입니다. 눈이 뒤집힌 채 당신의 목숨을 노립니다. "네놈이 죽인 그 사람의 몫까지... 고통스럽게 죽여주마!"`;
            }

            const updated = registerAmbush(newChar, {
                enemies: avengerEnemies,
                sourceId: avengerCandidate.id,
                title: "피의 복수자 출현!",
                message: `당신이 단죄했던 '${victim.name}'의 소중한 인연이었던 '${avengerCandidate.name}'이(가) 정예 결사대를 이끌고 복수를 위해 나타났습니다.`
            });
            Object.assign(newChar, updated);
            lifeLogs.push(`[위기] 원한을 품은 복수자 '${avengerCandidate.name}'이(가) 정예 결사대를 이끌고 당신을 급습해왔습니다!`);
        }
    }
 // --- 2. 직업 기반 자동 교류 (Job-based Networking) [NEW] ---
    // 군인/용병인 동료 및 과거 인맥은 같은 직업의 인물과 교류하여 인맥을 넓힙니다.
    const allColleaguesPool: any[] = [
        ...(newChar.companions || []),
        ...(newChar.inactiveCompanions || []),
        ...network
    ];

    allColleaguesPool.forEach(person => {
        if (person.isPurged || person.isDead) return;
        const isSoldier = person.job === JobType.SOLDIER || person.classType === '군인' || !!person.militaryRank;
        const isMercenary = person.job === JobType.MERCENARY || person.classType === '용병' || !!person.mercenaryData;
        if (!isSoldier && !isMercenary) return;

        const effectiveJob = isSoldier ? JobType.SOLDIER : JobType.MERCENARY;

        if (Math.random() < 0.08) { // 동료 사귐 판정
            // 기존 인맥 내에서 같은 직업 찾기
            const colleagues = (allColleaguesPool || []).filter(n => 
                n && 
                n.id !== person.id && 
                !n.isPurged && 
                !n.isDead &&
                (n.job === effectiveJob || (effectiveJob === JobType.SOLDIER ? (n.classType === '군인' || !!n.militaryRank) : (n.classType === '용병' || !!n.mercenaryData)))
            );
            let partner: any = null;

            if (colleagues.length > 0 && Math.random() < 0.4) {
                partner = colleagues[Math.floor(Math.random() * colleagues.length)];
            } else {
                // 새로운 직업 동료(전우/동료 용병) 생성
                const nation = person.nation || character.nation || "제국";
                const level = Math.max(1, (person.level || 1) + Math.floor(Math.random() * 11) - 5);
                const partnerGender = Math.random() > 0.5 ? "남성" : "여성";
                const genderParam = partnerGender === "남성" ? "male" : "female";
                const partnerRace = getRaceByNation(nation);
                const partnerName = generateName(nation, genderParam);
                partner = {
                    id: `colleague_${Date.now()}_${Math.random().toString(36).substring(7)}`,
                    name: partnerName,
                    age: `${20 + Math.floor(Math.random() * 30)}세`,
                    birthYear: currentYear - (20 + Math.floor(Math.random() * 30)),
                    gender: partnerGender,
                    race: partnerRace,
                    nation: nation,
                    level: level,
                    classType: isSoldier ? "군인" : "용병",
                    job: effectiveJob,
                    personality: MBTI_LIST[Math.floor(Math.random() * MBTI_LIST.length)],
                    appearance: isSoldier ? "훈련장에서 만난 믿음직한 전우입니다." : "의뢰 현장에서 등을 맞댄 동료 용병입니다.",
                    stats: generateCompanionStats(level),
                    affection: 0, // 플레이어와의 직접 인연이 아니므로 0 (과거 인연 목록에는 미노출)
                    origin: isSoldier ? "군대" : "용병단",
                    originName: `${person.name}의 ${isSoldier ? '전우' : '동료 용병'}`,
                    visualUrl: generateDefaultVisualUrl(partnerName, nation, partnerRace, partnerGender),
                    relations: {}
                };
                network.push(partner);
                allColleaguesPool.push(partner);
            }

            if (partner) {
                if (!person.relations) person.relations = {};
                if (!partner.relations) partner.relations = {};
                
                const existingRel = person.relations[partner.id];
                if (!existingRel) {
                    const nextType = Math.random() < 0.2 ? RelationType.RIVAL : RelationType.FRIEND;
                    person.relations[partner.id] = { targetId: partner.id, affection: 35, type: nextType };
                    partner.relations[person.id] = { targetId: person.id, affection: 35, type: nextType };
                    
                    const isCompanion = (newChar.companions || []).some(c => c.id === person.id) || (newChar.inactiveCompanions || []).some(c => c.id === person.id);
                    if (isCompanion || (person.affection && person.affection > 30)) {
                        if (Math.random() < 0.2) {
                            lifeLogs.push(`[인연 소식] ${isCompanion ? '동료' : '지인'} '${person.name}'이(가) '${partner.name}'와(과) 새로운 ${isSoldier ? '전우' : '용병 동료'}의 연을 맺었습니다.`);
                        }
                    }
                } else {
                    person.relations[partner.id].affection = Math.min(100, (person.relations[partner.id].affection || 0) + 10);
                    partner.relations[person.id].affection = Math.min(100, (partner.relations[person.id].affection || 0) + 10);
                }
            }
        }
    });

    // --- 2. NPC의 사망 시뮬레이션 (External Death) ---
    // 몬스터 습격, 결투 패배, 전쟁 전사 등
     const updatedNetwork: SimpleStudent[] = [];
    network.forEach(npc => {
        if (npc.isPurged || npc.isImmortal) {
            updatedNetwork.push(npc);
            return;
        }
        
        let deathChance = 0.0003; // 기본 0.1%
        let reason = "의문의 사고";

        // 군인인 경우 전쟁 중 사망 확률 증가
        if (npc.job === JobType.SOLDIER) {
            const myNation = character.nation;
            const npcNation = npc.nation;
            const isAtWar = character.militaryData?.globalDiplomacy?.[`${myNation}_${npcNation}`.split('_').sort().join('_')] === '전쟁' as any;
            if (isAtWar) {
                deathChance = 0.003;
                reason = "전쟁 중 전사 (K.I.A)";
            }
        }

        if (Math.random() < deathChance) {
            // 살해당할 확률 (사망의 30%)
            const isMurdered = Math.random() < 0.3;
            
            if (isMurdered) {
                const killerGender = Math.random() > 0.5 ? "남성" : "여성";
                const genderParam = killerGender === "남성" ? "male" : "female";
                const killerName = generateName(npc.nation || character.nation, genderParam);
                const killerLevel = Math.max(npc.level + 5, 20);
                const killerType = SHINRYOKU_TYPES_LIST[Math.floor(Math.random() * SHINRYOKU_TYPES_LIST.length)];
                
                const killerRace = getRaceByNation(npc.nation || character.nation);
                const killer: SimpleStudent = {
                    id: `killer_${Date.now()}_${Math.random().toString(36).substring(7)}`,
                    name: killerName,
                    age: `${20 + Math.floor(Math.random() * 30)}세`,
                    birthYear: currentYear - (20 + Math.floor(Math.random() * 30)),
                    gender: killerGender,
                    race: killerRace,
                    nation: npc.nation || character.nation,
                    level: killerLevel,
                    classType: (HUMANOID_CLASSES[killerType] || ["방랑자"])[0],
                    personality: MBTI_LIST[Math.floor(Math.random() * MBTI_LIST.length)],
                    appearance: `'${npc.name}'을(를) 살해하고 자취를 감춘 냉혹한 인물입니다.`,
                    stats: generateEnemyStats(killerLevel),
                    shinryokuType: killerType,
                    affection: -npc.affection, // 피해자와 친할수록 살인자를 증오하게 됨
                    origin: "뒷골목",
                    originName: "살인 현장",
                    visualUrl: generateDefaultVisualUrl(killerName, npc.nation || character.nation, killerRace, killerGender)
                };
                
                updatedNetwork.push(killer);
                lifeLogs.push(`[인연 비보] 당신의 인연 '${npc.name}'이(가) 정체불명의 용병 '${killerName}'에게 살해당했다는 소식이 전해졌습니다!`);
                updatedNetwork.push({ ...npc, isPurged: true, purgedReason: `'${killerName}'에게 살해당함`});
            } else {
                lifeLogs.push(`[인연 비보] 당신과 연이 닿아있던 '${npc.name}'이(가) ${reason}했다는 소식이 전해졌습니다.`);
                updatedNetwork.push({ ...npc, isPurged: true, purgedReason: reason });
            }
        } else {
            updatedNetwork.push(npc);
        }
    });
    network = updatedNetwork;

    // --- 3. 인맥의 추천 (Recommendation) ---
    // 호감도가 높은(80+) NPC가 새로운 친구를 소개해줍니다.
    // --- 3. [MODIFIED] 인맥의 추천 (Recommendation) ---
    // 동료 NPC가 자신의 실제 관계망(relations)에 있는 인물을 추천합니다. (8% -> 15%)
    if (!newChar.pendingChoiceEvent && Math.random() < 0.15) {
        const allComps = [...(newChar.companions || []), ...(newChar.inactiveCompanions || [])].filter(c => c && !c.isMonster && !c.isDead && c.affection >= 70);
        if (allComps.length > 0) {
            const recommender = allComps[Math.floor(Math.random() * allComps.length)];
            
            if (recommender.relations) {
                const relations = Object.values(recommender.relations);
                // 긍정적인 관계(친구 이상)를 맺고 있는 대상 중, 플레이어의 파티/대기에 없는 인물 탐색
                const validRelations = (relations || []).filter(rel => 
                    rel &&
                    [RelationType.FRIEND, RelationType.BEST_FRIEND, RelationType.LOVER, RelationType.SPOUSE].includes(rel.type) &&
                    !(newChar.companions || []).some(c => c && c.id === rel.targetId) &&
                    !(newChar.inactiveCompanions || []).some(c => c && c.id === rel.targetId)
                );

                if (validRelations.length > 0) {
                    const targetRel = validRelations[Math.floor(Math.random() * validRelations.length)];
                    // 사회적 관계망에서 해당 인물 데이터 찾기
                    const targetNpc = network.find(n => n.id === targetRel.targetId);
                    
                    if (targetNpc && !targetNpc.isPurged) {
                        newChar.pendingChoiceEvent = {
                            id: `recommendation_${recommender.id}_${targetNpc.id}_${Date.now()}`,
                            title: "인맥의 추천",
                            description: `당신의 곁을 지키는 '${recommender.name}'이(가) 조심스럽게 말을 꺼냅니다. "대장님, 사실 제 오랜 친구인 '${targetNpc.name}'이(가) 최근 새로운 소속을 찾고 있습니다. 실력이 아주 뛰어난 친구인데, 우리와 함께하면 큰 도움이 될 거예요. 한번 만나보시겠어요?"`,
                            options: [
                                {
                                    text: `좋다, [${targetNpc.name}]을(를) 영입한다`,
                                    action: "join_guild",
                                    outcome: `'${recommender.name}'의 추천으로 '${targetNpc.name}'이(가) 가문에 합류했습니다. 추천해준 '${recommender.name}'의 충성도가 상승합니다.`,
                                    callbackId: JSON.stringify({ 
                                        type: 'recommendation_hire', 
                                        targetId: targetNpc.id, 
                                        recommenderId: recommender.id 
                                    })
                                },
                                {
                                    text: "지금은 인원이 충분하다 (거절)",
                                    action: "none",
                                    outcome: "정중히 거절했습니다. 대원들은 당신의 결정을 존중합니다.",
                                    callbackId: "decline"
                                }
                            ]
                        };
                        lifeLogs.push(`[인맥] '${recommender.name}'이(가) 자신의 인연인 '${targetNpc.name}'을(를) 동료로 추천해왔습니다.`);
                    }
                }
            }
        }
    }
    // 인맥이 새로운 인물을 소개해주는 이벤트 (5% -> 10%)
    if (Math.random() < 0.10) {
        const recommender = network.find(n => !n.isPurged && n.affection >= 80);
        if (recommender) {
            const nationList = Object.keys(NATION_DATA);
            const randomNation = nationList[Math.floor(Math.random() * nationList.length)];
            const friendGender = Math.random() > 0.5 ? "남성" : "여성";
            const genderParam = friendGender === "남성" ? "male" : "female";
            const name = generateName(randomNation, genderParam);
            const level = Math.max(1, recommender.level + Math.floor(Math.random() * 11) - 5);
            
            const friendRace = getRaceByNation(randomNation);
            const newFriend: SimpleStudent = {
                id: `rec_${Date.now()}_${Math.random().toString(36).substring(7)}`,
                name,
                age: `${20 + Math.floor(Math.random() * 20)}세`,
                birthYear: currentYear - (20 + Math.floor(Math.random() * 20)),
                gender: friendGender,
                race: friendRace,
                nation: randomNation,
                level: level,
                classType: "모험가",
                personality: MBTI_LIST[Math.floor(Math.random() * MBTI_LIST.length)],
                appearance: `'${recommender.name}'가 신뢰하는 친구입니다.`,
                stats: generateCompanionStats(level),
                affection: 10, // 초기 호감도 보너스
                origin: "인맥 추천",
                originName: recommender.name,
                visualUrl: generateDefaultVisualUrl(name, randomNation, friendRace, friendGender)
            };
            
            network.push(newFriend);
            lifeLogs.push(`[인맥 추천] 당신과 절친한 '${recommender.name}'이(가) 실력 있는 지인인 '${name}'을(를) 당신에게 소개시켜 주었습니다.`);
        }
    }

    // --- 4. 라이벌의 돌발 성장 및 아이템 획득 (Rival Anomaly) ---
    network.forEach(npc => {
        if (npc.isRival && !npc.isPurged) {
            if (Math.random() < 0.00001) { // 5% 확률로 돌발 성장
                const prevRivalLv = npc.level;
                const levelGain = Math.floor(Math.random() * 5) + 5;
                npc.level += levelGain;
                upgradeNpcSkillsOnGrowth(npc, prevRivalLv);
                const boost = levelGain * 10;
                if (npc.stats) {
                    npc.stats.str = (npc.stats.str || 0) + boost;
                    npc.stats.int = (npc.stats.int || 0) + boost;
                    npc.stats.def = (npc.stats.def || 0) + boost;
                    npc.stats.agi = (npc.stats.agi || 0) + boost;
                    npc.stats.hp = (npc.stats.hp || 100) + (levelGain * 100);
                }
                
                // 전설 아이템 획득 시뮬레이션
                const lootTable = WORLD_LOOT_TABLES[npc.nation] || WORLD_LOOT_TABLES['generic'];
                const rareItem = lootTable.find(l => l.rarity === ItemRarity.LEGENDARY || l.rarity === ItemRarity.UNIQUE);
                
                if (rareItem && Math.random() < 0.3) {
                    lifeLogs.push(`[라이벌 경보] 라이벌 '${npc.name}'이(가) 유적 탐사 도중 희귀한 보물 '${rareItem.item || rareItem.name}'을(를) 손에 넣고 폭발적인 성장을 이뤘다는 소문이 들립니다! (Lv +${levelGain})`);
                    if (!npc.memories) npc.memories = [];
                    npc.memories.push(`[${character.currentDate}] 보물 '${rareItem.item || rareItem.name}' 획득 및 돌발 성장.`);
                } else {
                    lifeLogs.push(`[라이벌 성장] 라이벌 '${npc.name}'이(가) 극한의 수련을 통해 한계를 돌파했습니다! (Lv +${levelGain})`);
                }
            }
        }
    });

     network.forEach((npc) => {
        if (npc.isPurged) return;
        const age = npc.birthYear ? currentYear - npc.birthYear : 20;

        if (!npc.isSpouse && !npc.partnerId && age >= 20) {
            // A. 인맥 내 결혼 시도 (우선순위)
            const isMale = npc.gender?.includes('남') || false;
            const potentials = (network || []).filter(n => 
                n &&
                !n.isPurged && 
                n.id !== npc.id && 
                ((isMale && !n.gender?.includes('남')) || (!isMale && n.gender?.includes('남'))) &&
                !n.partnerId &&
                npc.relations?.[n.id] &&
                npc.relations[n.id].affection >= 80
            );

            if (potentials.length > 0 && Math.random() < 0.1) {
                const partner = potentials[Math.floor(Math.random() * potentials.length)];
                npc.isSpouse = true;
                npc.partnerId = partner.id;
                partner.isSpouse = true;
                partner.partnerId = npc.id;
                
                if (!npc.relations) npc.relations = {};
                if (!partner.relations) partner.relations = {};
                npc.relations[partner.id] = { targetId: partner.id, affection: 100, type: RelationType.SPOUSE };
                partner.relations[npc.id] = { targetId: npc.id, affection: 100, type: RelationType.SPOUSE };
                
                if (npc.affection > 0 || partner.affection > 0) {
                    lifeLogs.push(`[인연 경사] 당신의 인맥이었던 '${npc.name}'와(과) '${partner.name}'이(가) 오랜 우정 끝에 결혼을 발표했습니다!`);
                }
                return;
            }

            // B. 외부인과 결혼 (기존 로직 유지)
            if (Math.random() < 0.01) {
                const isMale = npc.gender.includes('남');
                const spouseGender = isMale ? "여성" : "남성";
                const genderParam = spouseGender === "남성" ? "male" : "female";
                const surname = extractSurname(npc.name, npc.nation);
                
                // 새로운 배우자 생성 (외부인)
                const spouseId = `npc_spouse_${npc.id}_${Date.now()}`;
                const spouseName = generateName(npc.nation, genderParam);
                const spouseAge = age + (Math.floor(Math.random() * 7) - 3);
                
                // 관계 설정 (Spouse Relation)
                const relationToSpouse: CompanionRelation = {
                    targetId: spouseId,
                    affection: 100,
                    type: RelationType.SPOUSE
                };
                const relationToNpc: CompanionRelation = {
                    targetId: npc.id,
                    affection: 100,
                    type: RelationType.SPOUSE
                };

                const spouseRace = npc.race || getRaceByNation(npc.nation);
                const newSpouse: SimpleStudent = {
                    id: spouseId,
                    name: spouseName,
                    age: `${spouseAge}세`,
                    birthYear: currentYear - spouseAge,
                    gender: spouseGender,
                    race: spouseRace,
                    nation: npc.nation,
                    classType: `${npc.name}의 반려자`,
                    level: Math.max(1, npc.level - Math.floor(Math.random()*10)),
                    personality: MBTI_LIST[Math.floor(Math.random() * MBTI_LIST.length)],
                    appearance: `${npc.name}의 반려자입니다.`,
                    stats: generateCompanionStats(Math.max(1, npc.level - Math.floor(Math.random()*10))),
                    affection: 0,
                    job: JobType.UNEMPLOYED,
                    isSpouse: true,
                    partnerId: npc.id,
                    isStaticRank: true,
                    relations: { [npc.id]: { targetId: npc.id, affection: 100, type: RelationType.SPOUSE } },
                    visualUrl: generateDefaultVisualUrl(spouseName, npc.nation, spouseRace, spouseGender)
                };

                npc.isSpouse = true;
                npc.partnerId = spouseId;
                if (!npc.relations) npc.relations = {};
                npc.relations[spouseId] = { targetId: spouseId, affection: 100, type: RelationType.SPOUSE }; 
                
                network.push(newSpouse);
                // [NEW] Trigger choice event for NPC marriage if player has positive affection
                if (npc.affection > 0 && !newChar.pendingChoiceEvent) {
                    newChar.pendingChoiceEvent = {
                        id: `wedding_gift_npc_${npc.id}_${spouseId}_${Date.now()}`,
                        title: "인연의 기쁜 소식",
                        description: `[인연] 과거의 소중한 인연이었던 '${npc.name}'이(가) '${spouseName}'와(과) 결혼한다는 소식이 전해졌습니다! 두 사람의 앞날을 축복해주시겠습니까?`,
                        options: [
                            {
                                text: "축의금을 전달한다.",
                                action: "give_wedding_gift",
                                outcome: `멀리서나마 정성스러운 축의금을 보냈습니다. ${npc.name}은(는) 당신의 따뜻한 마음을 잊지 않겠다고 답신을 보내왔습니다.`,
                                callbackId: JSON.stringify({p1: npc.id, p2: spouseId, type: 'npc'})
                            },
                            {
                                text: "모른 척 지나간다 (호감도 하락 예상)",
                                action: "no_wedding_gift",
                                outcome: `아무런 소식도 보내지 않았습니다. 나중에 이 사실을 알게 된 ${npc.name}은(는) 당신에게 섭섭함을 느낍니다.`,
                                callbackId: JSON.stringify({p1: npc.id, p2: spouseId, type: 'npc'})
                            }
                        ]
                    };
                    lifeLogs.push(`[소식] 당신의 소중한 인연 '${npc.name}'이(가) '${spouseName}'와(과) 백년가약을 맺었다는 소식이 전해졌습니다.`);
                }
            }
        }
        // --- B. NPC 출산 시뮬레이션 ---
        if (npc.isSpouse && npc.partnerId && age >= 20 && age <= 60) {
            // 중복 출산 방지 (자녀가 너무 많아지지 않게 조정)
            const childrenCount = (network || []).filter(n => n && n.childData?.parentNames?.includes(npc.name)).length;
            const birthChance = 0.01 / (childrenCount + 1);

            if (Math.random() < birthChance) {
                const spouse = network.find(n => n.id === npc.partnerId);
                const spouseName = spouse ? spouse.name : "배우자";
                const isMale = npc.gender.includes('남');
                
                // 성씨 결정 (부계 사회 가정)
                const fatherName = isMale ? npc.name : spouseName;
                const fatherNation = isMale ? npc.nation : (spouse?.nation || npc.nation);
                const fatherSurname = extractSurname(fatherName, fatherNation);
                
                const childGender = Math.random() < 0.5 ? "남성" : "여성";
                const genderParam = childGender === "남성" ? "male" : "female";
                const childName = generateNameWithSurname(fatherSurname, fatherNation, genderParam);
                
                const childId = `npc_child_${npc.id}_${Date.now()}`;
                const newChild: SimpleStudent = {
                    id: childId,
                    name: childName,
                    age: "0세",
                    birthYear: currentYear,
                    gender: childGender,
                    race: npc.race || "인간",
                    nation: npc.nation,
                    classType: `${npc.name}의 자식`,
                    level: 1,
                    personality: MBTI_LIST[Math.floor(Math.random() * MBTI_LIST.length)],
                    appearance: `${npc.name}와(과) ${spouseName}를 쏙 빼닮은 아이입니다.`,
                    stats: generateCompanionStats(1),
                    affection: 0,
                    childData: {
                        parentNames: [npc.name, spouseName],
                        academicScore: 0
                    },
                    isStaticRank: true,
                    visualUrl: generateDefaultVisualUrl(childName, npc.nation, npc.race || "인간", childGender)
                };

                network.push(newChild);
                if (npc.affection > 0) {
                    lifeLogs.push(`[소식] '${npc.name}'의 가문에 경사가 났습니다! 귀여운 ${childGender} 아이 '${childName}'이(가) 태어났습니다.`);
                }
            }
        }
    });

    // --- [NEW] 영원의 라이벌 엄격한 단일성(단 1명) 보장 및 정제 로직 ---
    const allNpces = [
        ...network,
        ...(newChar.schoolData?.classmates || [])
    ];
    
    // 복수 존재 방지: 살아있는 영원의 라이벌 목록 검색
    const activeEternalRivals = (allNpces || []).filter(n => n && n.isEternalRival && !n.isPurged && !n.isDead);
    if (activeEternalRivals.length > 1) {
        // 가장 레벨이 높은 1명만 남기고 나머지는 일반 라이벌로 전환
        activeEternalRivals.sort((a, b) => b.level - a.level);
        const supremeRival = activeEternalRivals[0];
        
        network.forEach(n => {
            if (n.isEternalRival && n.id !== supremeRival.id) n.isEternalRival = false;
        });
        if (newChar.schoolData?.classmates) {
            newChar.schoolData.classmates.forEach(n => {
                if (n.isEternalRival && n.id !== supremeRival.id) n.isEternalRival = false;
            });
        }
    }

    const hasEternalRival = allNpces.some(n => n.isEternalRival && !n.isPurged && !n.isDead);

    // 라이벌 결사대 동료 템플릿 풀 (정식 신력 계통 적용)
    const RIVAL_ROLE_TEMPLATES = [
        { role: "선봉 돌격대장", job: "용기사", shinryoku: "화염계", personality: "용맹함", reason: "어린 시절부터 함께한 결투 파트너이자 충직한 심복" },
        { role: "수호 성기사", job: "성기사", shinryoku: "광휘계", personality: "신중함", reason: "전장에서 라이벌의 무용에 감복하여 맹세한 수호자" },
        { role: "원소 마도사", job: "대마도사", shinryoku: "전격계", personality: "지적임", reason: "금지된 비전 마법을 함께 연구하며 힘을 합친 조력자" },
        { role: "그림자 암살자", job: "암살자", shinryoku: "암흑계", personality: "냉혹함", reason: "어둠 속에서 라이벌의 뒤를 지키는 그림자 호위" },
        { role: "구호 성녀", job: "사제", shinryoku: "광휘계", personality: "상냥함", reason: "라이벌의 확고한 이상과 카리스마에 반해 여정을 함께함" },
        { role: "전술 마궁수", job: "궁수", shinryoku: "질풍계", personality: "침착함", reason: "사냥 대회 결승에서 패배한 후 동료가 되기를 자청함" },
        { role: "강철 수호자", job: "중장기사", shinryoku: "강철계", personality: "단단함", reason: "결사대의 방패가 되어 전선을 사수하는 호위무사" },
        { role: "대지 결계사", job: "음양사", shinryoku: "대지계", personality: "차분함", reason: "대지의 결계를 펼쳐 동료들의 안전을 확보하는 조력자" },
        { role: "빙결 흑마도사", job: "빙결술사", shinryoku: "빙결계", personality: "냉철함", reason: "서리를 조종하여 적들의 발을 묶는 전술 장교" }
    ];

    const FIELD_SUFFIXES = [
        "중앙 마수 토벌 구역",
        "비전 던전 수련장",
        "차원 균열 전초기지",
        "고위 마수 서식지",
        "심연 던전 입구",
        "결사대 연무장",
        "수호 결계 수련소",
        "정예 마수 사냥터"
    ];

    const generateRealRivalLocation = (rivalNation?: string) => {
        const valid = getValidRivalLocation(undefined, rivalNation || character.currentLocation?.nation);
        return valid.formatted;
    };

    const RIVAL_ACTIVITIES_POOL = [
        "결사대 동료들과 함께 고위 던전의 마수를 토벌하며 극한의 실전을 치르는 중",
        "당신의 행적과 강함을 정찰병을 통해 탐색하며 타도할 전술을 수립하는 중",
        "비전의 신력 수련법을 통해 잠재된 오의를 완성하기 위해 명상 중",
        "대륙 각지에서 최정예 무구와 유물을 수집하여 결사대의 무장을 강화하는 중",
        "당신과의 다음 진검승부를 대비해 동료들과 합격술 훈련을 거듭하는 중"
    ];

    const RIVAL_FEATS_POOL = [
        "고위 마수 토벌전 전승 달성",
        "국경 분쟁 구역에서 단신으로 적진 돌파",
        "고대 영웅의 비전서 해독 및 신력 오의 개화",
        "대륙 용병 토너먼트에서 결사대 무패 행진",
        "암흑 결사의 암살자 부대를 역으로 궤멸시킴",
        "전설의 대장장이에게 결사대 전용 명품 무기 수주",
        "차원 던전 최심부 수호 마수와의 일기토 승리"
    ];

    const initRivalData = (rivalNpc: SimpleStudent) => {
        const partySize = Math.floor(Math.random() * 2) + 2; // 2 ~ 3명의 동료
        const shuffledTemplates = [...RIVAL_ROLE_TEMPLATES].sort(() => Math.random() - 0.5);
        const partyMembers: any[] = [];

        for (let i = 0; i < partySize; i++) {
            const tmpl = shuffledTemplates[i % shuffledTemplates.length];
            const compLevel = Math.max(1, Math.floor(rivalNpc.level * (0.85 + Math.random() * 0.1)));
            const compGender: 'male' | 'female' = Math.random() < 0.5 ? 'male' : 'female';
            const compName = generateName(rivalNpc.nation || "대한민국", compGender);
            partyMembers.push({
                id: `rival_comp_${Date.now()}_${i}`,
                name: compName,
                role: tmpl.role,
                level: compLevel,
                job: tmpl.job,
                shinryokuType: tmpl.shinryoku,
                personality: tmpl.personality,
                joinedReason: tmpl.reason,
                visualUrl: generateDefaultVisualUrl(compName, rivalNpc.nation || "대한민국", "인간", compGender)
            });
        }

        return {
            currentLocation: generateRealRivalLocation(rivalNpc.nation),
            currentActivity: RIVAL_ACTIVITIES_POOL[Math.floor(Math.random() * RIVAL_ACTIVITIES_POOL.length)],
            targetGoal: `플레이어를 뛰어넘어 대륙 최강의 패자가 되는 것`,
            recentFeats: [
                `${rivalNpc.name} 결사대 결성 및 동료 영입 완료`,
                RIVAL_FEATS_POOL[Math.floor(Math.random() * RIVAL_FEATS_POOL.length)]
            ],
            partyMembers,
            totalDuelsCount: 0,
            playerWins: 0,
            rivalWins: 0
        };
    };

    if (!newChar.hasEternalRivalDied && !hasEternalRival) {
        // Find a living rival candidate
        const livingRivals = (allNpces || []).filter(n => n && n.isRival && !n.isPurged && !n.isDead && !n.isEternalRival);
        if (livingRivals.length > 0) {
            // 20% chance to awaken a living rival to Eternal Rival
            if (Math.random() < 0.20) {
                const chosenRival = livingRivals[Math.floor(Math.random() * livingRivals.length)];
                
                // Set isEternalRival to true
                chosenRival.isEternalRival = true;
                chosenRival.rivalData = initRivalData(chosenRival);
                
                // Sync to socialNetwork
                const snIdx = network.findIndex(n => n.id === chosenRival.id);
                if (snIdx !== -1) {
                    network[snIdx].isEternalRival = true;
                    network[snIdx].rivalData = chosenRival.rivalData;
                }
                
                // Sync to classmates
                if (newChar.schoolData?.classmates) {
                    const clIdx = newChar.schoolData.classmates.findIndex(n => n.id === chosenRival.id);
                    if (clIdx !== -1) {
                        newChar.schoolData.classmates[clIdx].isEternalRival = true;
                        newChar.schoolData.classmates[clIdx].rivalData = chosenRival.rivalData;
                    }
                }
                
                lifeLogs.push(`[운명의 숙적] 라이벌 '${chosenRival.name}'이(가) 당신에게 맞서기 위해 상상을 초월하는 기백으로 각성하며 단 한 명의 '영원의 라이벌'로 등극했습니다! 그는 결사대 동료들을 규합하여 당신에게 필적하는 힘을 키워나갑니다.`);
            }
        }
    }

    // Now, if there is an active Eternal Rival, grow them and their party members!
    network.forEach(npc => {
        if (npc.isEternalRival && !npc.isPurged && !npc.isDead) {
            if (!npc.rivalData) {
                npc.rivalData = initRivalData(npc);
            }

            const prevLv = npc.level;
            let levelGain = Math.floor(Math.random() * 2) + 1; // 1~2 levels monthly
            
            // If lower level than the player, they catch up instantly + gain 1~2 levels!
            if (npc.level < newChar.level) {
                npc.level = newChar.level + Math.floor(Math.random() * 2) + 1;
                levelGain = npc.level - prevLv;
            } else {
                npc.level += levelGain;
            }

            const boost = levelGain * 25; // Massive stat gains (25 points per level)
            if (!npc.stats) npc.stats = {};
            npc.stats.str = (npc.stats.str || 10) + boost;
            npc.stats.int = (npc.stats.int || 10) + boost;
            npc.stats.def = (npc.stats.def || 10) + boost;
            npc.stats.agi = (npc.stats.agi || 10) + boost;
            npc.stats.hp = (npc.stats.hp || 100) + (levelGain * 250);
            npc.stats.maxHp = (npc.stats.maxHp || npc.stats.hp);
            upgradeNpcSkillsOnGrowth(npc, prevLv);

            // 동료들의 레벨 동반 성장 및 영향력(선행/악행) 정산
            if (npc.rivalData) {
                const influenceRumor = processRivalMonthlyInfluence(npc, newChar);
                if (influenceRumor) {
                    lifeLogs.push(influenceRumor);
                }
                
                // 동료 레벨 동반 성장
                npc.rivalData.partyMembers.forEach(comp => {
                    const prevCompLv = comp.level || 1;
                    comp.level = Math.max(1, Math.floor(npc.level * (0.85 + Math.random() * 0.1)));
                    upgradeNpcSkillsOnGrowth(comp, prevCompLv);
                });

                // 25% 확률로 새 동료 추가 (최대 4명)
                if (npc.rivalData.partyMembers.length < 4 && Math.random() < 0.25) {
                    const availableTmpls = (RIVAL_ROLE_TEMPLATES || []).filter(t => t && !npc.rivalData?.partyMembers.some(m => m && m.role === t.role));
                    if (availableTmpls.length > 0) {
                        const tmpl = availableTmpls[Math.floor(Math.random() * availableTmpls.length)];
                        const compGender: 'male' | 'female' = Math.random() < 0.5 ? 'male' : 'female';
                        const compName = generateName(npc.nation || "제국", compGender);
                        const newComp = {
                            id: `rival_comp_${Date.now()}_${npc.rivalData.partyMembers.length}`,
                            name: compName,
                            role: tmpl.role,
                            level: Math.max(1, Math.floor(npc.level * 0.9)),
                            job: tmpl.job,
                            shinryokuType: tmpl.shinryoku,
                            personality: tmpl.personality,
                            joinedReason: tmpl.reason,
                            visualUrl: generateDefaultVisualUrl(compName, npc.nation || "제국", "인간", compGender)
                        };
                        npc.rivalData.partyMembers.push(newComp);
                        npc.rivalData.recentFeats.unshift(`새로운 결사대원 '${newComp.name}'(${newComp.role}) 영입`);
                    }
                }
            }

            lifeLogs.push(`[영원의 라이벌 성장] 영원의 라이벌 '${npc.name}'이(가) 당신의 힘에 전율하며 스스로를 한계까지 몰아붙여 경이로운 성장을 이루었습니다! (Lv.${prevLv} ➔ Lv.${npc.level})`);
        }
    });

    // --- [NEW] 일반 NPC(동료 제외) 선한/악한 영향력 시뮬레이션 ---
    const companionIds = new Set([
        ...(newChar.companions || []).map(c => c.id),
        ...(newChar.inactiveCompanions || []).map(c => c.id)
    ]);

    network.forEach(npc => {
        if (npc && !npc.isEternalRival && !npc.isPurged && !npc.isDead && !companionIds.has(npc.id)) {
            if (Math.random() < 0.25) {
                const rumor = processGeneralNpcMonthlyInfluence(npc, newChar);
                if (rumor) {
                    lifeLogs.push(rumor);
                }
            }
        }
    });

    // Also sync and grow Eternal Rival in classmates if they exist there
    if (newChar.schoolData?.classmates) {
        newChar.schoolData.classmates.forEach(npc => {
            if (npc.isEternalRival && !npc.isPurged && !npc.isDead) {
                const matchingSn = network.find(n => n.id === npc.id);
                if (matchingSn) {
                    npc.level = matchingSn.level;
                    npc.stats = { ...matchingSn.stats };
                    npc.rivalData = matchingSn.rivalData;
                }
            }
        });
    }

    newChar.socialNetwork = network;
    return { updatedChar: newChar, lifeLogs };
};


