
import { Character, JobType, MilitaryRank, ItemRarity, Item, DiplomaticStatus, RegionalStats, ChoiceEvent, Quest } from '../types';
import { MILITARY_SALARY, MILITARY_RANK_ORDER, WORLD_GEOGRAPHY, SHINRYOKU_TYPES_LIST } from '../constants';
import { NATION_LIST } from '../nationalDiplomacy';
import { NATION_THEMES, HUNT_LEVEL_BANDS } from '../monsterfield';
import { addDays, getYear, generateName, generateEnemyStats } from '../utils';

/**
 * 군인 생활 중 발생하는 일일 시뮬레이션 및 재정 정산 로직
 */
export const processMilitaryDailyEvents = (currentRef: Character, nextDate: string, allLogs: string[]) => {
    const isPlayerSoldier = currentRef.job === JobType.SOLDIER && !!currentRef.militaryData;
    const militaryCompanions = [
        ...currentRef.companions,
        ...(currentRef.inactiveCompanions || [])
    ].filter(c => c.job === JobType.SOLDIER);

    // 아무도 군인이 아니면 세계 정세만 아주 낮은 확률로 시뮬레이션하거나 스킵
    if (!isPlayerSoldier && militaryCompanions.length === 0) {
        // 매달 1일 세계 정세는 군인이 아니더라도 시뮬레이션 (세상은 돌아가야 하므로)
        if (nextDate.endsWith('-01')) {
            // 군인이 아닐 때는 militaryData가 없을 수 있으므로 임시 객체로라도 돌림
            if (currentRef.militaryData) {
                simulateGlobalButterflyEffect(currentRef, allLogs);
            }
        }
        return;
    }

    const currentMonth = nextDate.substring(0, 7); // YYYY-MM
    const isDayOne = nextDate.endsWith('-01');
    const isMarch3 = nextDate.endsWith('-03-03');
    const loc = currentRef.currentLocation || { nation: '대한민국', city: '서울' };
    const city = loc.city;
    const mData = currentRef.militaryData;

    // [NEW] 매일 0.5% 확률로 침공 이벤트 발생
    if (mData && mData.diplomacy) {
        const invasions: string[] = [];
        Object.keys(mData.diplomacy).forEach(nation => {
            const rel = mData.diplomacy![nation];
            if (rel.status === DiplomaticStatus.WAR) {
                if (Math.random() < 0.02) { // 2.0%
                    invasions.push(nation);
                    allLogs.push(`[긴급] ${nation}의 군대가 국경을 넘어 침공을 개시했습니다! 지휘 본부에서 대응하십시오.`);
                }
            }
        });
        if (invasions.length > 0) {
            const currentPending = mData.pendingInvasions || [];
            const newInvasions = invasions.filter(inv => !currentPending.includes(inv));
            if (newInvasions.length > 0) {
                mData.pendingInvasions = [...currentPending, ...newInvasions];
            }
        }
    }

    // --- 1. 플레이어 군인 로직 ---
    if (isPlayerSoldier && mData) {
        const mData = currentRef.militaryData;
        const rank = currentRef.militaryRank || MilitaryRank.PVT;
        const rankIdx = MILITARY_RANK_ORDER.indexOf(rank);

        // 1-1. 가변 급여 시스템 (War Budget) - 매달 1일
        if (isDayOne && mData.lastSalaryDate !== currentMonth) {
            let baseSalary = MILITARY_SALARY[rank] || 2000;
            let salaryMultiplier = 1.0;
            let statusMsg = ""; 

            if (mData.diplomacy) {
                const nations = Object.values(mData.diplomacy);
                const isLosingWar = nations.some(n => n.status === DiplomaticStatus.WAR && (n.occupation || 0) <= -30);
                const isVassalOwner = nations.some(n => n.status === DiplomaticStatus.VASSAL_OWNER);
                const isWinningWar = nations.some(n => n.status === DiplomaticStatus.WAR && (n.occupation || 0) >= 50);

                if (isLosingWar) {
                    salaryMultiplier = 0.7;
                    mData.merit += 5;
                    statusMsg = " (전황 악화로 인한 30% 감봉 및 참전 공훈 +5)";
                } else if (isVassalOwner || isWinningWar) {
                    salaryMultiplier = 1.5;
                    statusMsg = " (국가 번영 및 승전에 따른 특별 성과급 50% 가산)";
                }
            }

            const finalSalary = Math.floor(baseSalary * salaryMultiplier);
            currentRef.money += finalSalary;
            mData.lastSalaryDate = currentMonth;
            
            allLogs.push(`[군 보급] ${currentMonth}월분 정기 급여 ${finalSalary.toLocaleString()}G가 국방부로부터 입금되었습니다.${statusMsg}`);
            
            if (mData.regionStats?.[city]) {
                const rStats = mData.regionStats[city];
                const decay = Math.floor((100 - rStats.security) / 10);
                if (decay > 0) {
                    rStats.sentiment = Math.max(0, rStats.sentiment - decay);
                    allLogs.push(`[지역 행정] ${city}의 불안정한 치안으로 인해 민심이 ${decay}만큼 하락했습니다.`);
                }
                
                if ((rStats.sentiment < 20 || rStats.security < 20) && !currentRef.pendingChoiceEvent && Math.random() < 0.10) {
                    currentRef.pendingChoiceEvent = {
                        id: `regional_uprising_${city}_${Date.now()}`,
                        title: `[긴급] ${city} 민중 봉기 발생!`,
                        description: `${city}의 민심과 치안이 바닥을 치며 절망한 주민들이 무기를 들고 거리로 쏟아져 나왔습니다! 시장 관저가 포위되었고 성난 군중들이 지휘관님의 결단을 요구하고 있습니다.`,
                        options: [
                            {
                                text: "지역 예산을 투입해 구휼하고 진정시킨다 (5만G 소모)",
                                action: "regional_uprising_resolve",
                                outcome: "창고를 열어 식량과 금전을 배풀자 성난 민심이 서서히 가라앉았습니다. 봉기가 평화적으로 종료되었습니다.",
                                callbackId: JSON.stringify({ city, cost: 50000, sentimentGain: 30 })
                            },
                            {
                                text: "무력으로 폭동을 진압한다 (전투 돌입)",
                                action: "regional_uprising_fight",
                                outcome: "반란군을 무력으로 찍어누르기로 했습니다. 칼끝은 이제 주민들을 향합니다.",
                                callbackId: JSON.stringify({ city })
                            }
                        ]
                    };
                    allLogs.push(`[비상] ${city}에서 주민들이 폭동을 일으켰습니다! 즉시 지휘부로 복귀하십시오.`);
                }
            }
            if (!currentRef.memories) currentRef.memories = [];
            currentRef.memories.push(`[${nextDate}] ${currentMonth}월 급여(${finalSalary.toLocaleString()}G) 수령.`);

            simulateGlobalButterflyEffect(currentRef, allLogs);
        }

        // 1-2. 연례 세수 정산 (매년 3월 3일)
        const cmdrId = mData.regionalAppointments?.[city];
        const isPlayerCmdr = cmdrId === 'player';
        const compCmdr = !isPlayerCmdr ? militaryCompanions.find(c => c.id === cmdrId) : null;
        const isAnyCmdr = isPlayerCmdr || !!compCmdr;

        if (isMarch3 && isAnyCmdr) {
            if (mData.regionStats?.[city]) {
                const rStats = mData.regionStats[city];
                const taxRate = rStats.taxRate || 10;
                let baseRevenue = 50000; 
                for (const region in WORLD_GEOGRAPHY) {
                    if (WORLD_GEOGRAPHY[region][loc.nation]?.capital === city) baseRevenue = 200000;
                }
                const collectedTax = Math.floor(baseRevenue * (taxRate / 10));
                rStats.budget += collectedTax;

                const actorName = isPlayerCmdr ? "당신" : `대장 '${compCmdr?.name}'`;

                if (taxRate > 15) {
                    const taxPenalty = taxRate - 15;
                    rStats.sentiment = Math.max(0, rStats.sentiment - taxPenalty);
                    allLogs.push(`[지역 세수] ${city}에서 ${actorName}이(가) 연례 세금 ${collectedTax.toLocaleString()}G를 징수했습니다. 높은 세율에 주민들이 불만을 표합니다. (민심 -${taxPenalty})`);
                } else {
                    allLogs.push(`[지역 세수] ${city}에서 ${actorName}이(가) 연례 세금 ${collectedTax.toLocaleString()}G를 안정적으로 징수했습니다.`);
                }

                if (compCmdr) {
                    compCmdr.merit = (compCmdr.merit || 0) + 10;
                }
            }
        }

        // 1-3. 직책별 돌발 이벤트
        const viceId = mData.regionalViceAppointments?.[city];
        const isPlayerVice = viceId === 'player';
        // const compVice = !isPlayerVice ? militaryCompanions.find(c => c.id === viceId) : null;

        if ((isAnyCmdr || isPlayerVice) && !currentRef.pendingChoiceEvent && !currentRef.pendingAmbush) {
            const roll = Math.random();
            if (isAnyCmdr && roll < 0.025) {
                const petitions = [
                    { title: "흉작으로 인한 구휼 요청", desc: "인근 농경지의 흉작으로 주민들이 굶주리고 있습니다. 지역 예산을 풀어 식량을 지원하시겠습니까?", cost: 20000, gain: 15, loss: 20 },
                    { title: "노후 성벽 수리 건의", desc: "도시의 방어 성벽이 노후화되어 붕괴 위험이 있습니다. 보수 공사를 승인하시겠습니까?", cost: 30000, gain: 10, loss: 15 },
                    { title: "전염병 구호 요청", desc: "뒷골목을 중심으로 정체불명의 열병이 퍼지고 있습니다. 의료 물자를 긴급 지원하시겠습니까?", cost: 15000, gain: 12, loss: 25 }
                ];
                const p = petitions[Math.floor(Math.random() * petitions.length)];
                
                const titlePrefix = isPlayerCmdr ? "[민원]" : `[민원/대리 - ${compCmdr?.name}]`;

                currentRef.pendingChoiceEvent = {
                    id: `mil_petition_${Date.now()}`,
                    title: `${titlePrefix} ${p.title}`,
                    description: p.desc,
                    options: [
                        { text: `예산을 지원한다 (-${p.cost.toLocaleString()}G)`, action: "regional_petition_resolve", outcome: `과감한 결단으로 주민들의 고통을 덜어주었습니다. 민심이 크게 상승합니다.`, callbackId: JSON.stringify({ city, stat: 'sentiment', val: p.gain, cost: p.cost }) },
                        { text: "예산 부족을 이유로 거절한다", action: "regional_petition_ignore", outcome: "주민들은 차가운 행정에 절망하며 등을 돌리기 시작했습니다. 민심이 폭락하고 원성이 자자합니다.", callbackId: JSON.stringify({ city, stat: 'sentiment', val: -p.loss, infamy: 10 }) }
                    ]
                };
                allLogs.push(`[지휘부] ${city} 주민들의 긴급한 민원이 접수되었습니다.`);
            }

            if (isPlayerVice && roll < 0.02) {
                const cmdrId = mData.regionalAppointments?.[city];
                const commander = [...currentRef.companions, ...(currentRef.inactiveCompanions || []), ...(currentRef.socialNetwork || [])].find(c => c.id === cmdrId);
                if (commander) {
                    if (Math.random() < 0.3) {
                        // [UPDATE] Use regional monsters instead of hardcoded one
                        const nationTheme = NATION_THEMES[loc.nation] || NATION_THEMES.default;
                        const monsters = nationTheme.monsters.advanced || nationTheme.monsters.intermediate || ["거대 독각충"];
                        const targetMon = monsters[Math.floor(Math.random() * monsters.length)];
                        const targetMonName = typeof targetMon === 'string' ? targetMon : targetMon.name;
                        
                        const specialQuest: Quest = {
                            id: `mil_vp_quest_${Date.now()}`,
                            type: 'Subjugation',
                            rank: currentRef.militaryRank || MilitaryRank.PVT,
                            title: `[지시] ${commander.name} 대장의 특별 하달`,
                            goal: `${targetMonName} 1마리 처치`,
                            details: `지역 대장 ${commander.name}이(가) 최근 도시를 위협하는 ${targetMonName}을 직접 처단하라고 명령했습니다.`,
                            danger: 'High',
                            rewardGold: 10000,
                            rewardExp: 5000,
                            rewardMerit: 20,
                            targetAmount: 1,
                            currentAmount: 0,
                            targetName: targetMonName
                        };
                        if (mData.activeMissions && mData.activeMissions.length < 2) {
                            mData.activeMissions.push(specialQuest);
                            allLogs.push(`[지휘 명령] 지역 대장 '${commander.name}'으로부터 특별 토벌 명령이 하달되었습니다.`);
                        }
                    } else {
                        const isFriendly = commander.affection > 20;
                        if (isFriendly) {
                            commander.affection = Math.min(100, commander.affection + 5);
                            allLogs.push(`[군대 일상] 지역 대장 '${commander.name}'과(와) 전술을 논의하며 신뢰를 쌓았습니다. (호감도 +5)`);
                        } else {
                            commander.affection = Math.max(-100, commander.affection - 10);
                            allLogs.push(`[군대 갈등] 지역 대장 '${commander.name}'이 당신의 실적을 질책하며 압박을 가해옵니다.`);
                        }
                    }
                }
            }
        }

        // 1-4. 지휘관 자동 커리어 시스템
        if (rankIdx >= MILITARY_RANK_ORDER.indexOf(MilitaryRank.BG)) {
            const careerRoll = Math.random();
            if (careerRoll < 0.05) {
                mData.merit += 1;
                allLogs.push(`[지휘 보고] 관할 부대원들의 정기 훈련 성과가 우수하게 보고되어 지휘관 '${currentRef.name}'의 공훈이 1 상승했습니다.`);
            } else if (careerRoll < 0.07) {
                const infamyGain = 2;
                currentRef.infamy = (currentRef.infamy || 0) + infamyGain;
                allLogs.push(`[지휘 책임] 관할 구역 내 병사들의 기강 해이 사건이 발생했습니다. 지휘 책임으로 인해 '${currentRef.name}'의 악명이 ${infamyGain} 상승합니다.`);
            }
        }
    }

    // --- 2. 동료 군인 로직 ---
    militaryCompanions.forEach(comp => {
        const rank = comp.militaryRank || MilitaryRank.PVT;
        const rankIdx = MILITARY_RANK_ORDER.indexOf(rank);
        const mData = currentRef.militaryData;

        // 2-1. 동료 급여 (플레이어 자금으로 합산)
        if (isDayOne) {
            const baseSalary = MILITARY_SALARY[rank] || 2000;
            // 동료는 전황 보너스 없이 기본급만 일단 적용 (또는 플레이어 데이터 참조 가능)
            currentRef.money += baseSalary;
            if (Math.random() < 0.1) {
                allLogs.push(`[군 보급] 동료 '${comp.name}'의 ${currentMonth}월분 급여 ${baseSalary.toLocaleString()}G가 가계에 보탬이 되었습니다.`);
            }
        }

        // 2-2. 동료 공훈 및 승급 시뮬레이션
        const dailyMeritRoll = Math.random();
        if (dailyMeritRoll < 0.05) { // 5% 확률로 일일 공훈 상승
            comp.merit = (comp.merit || 0) + 1;
            if (Math.random() < 0.01) {
                allLogs.push(`[군대 소식] '${comp.name}' 대원이 훈련 중 우수한 성적을 거두어 공훈이 쌓이고 있습니다.`);
            }
        }

        // 2-3. 지역 직책 수행 (대장/부대장)
        if (mData) {
            const isCompCmdr = mData.regionalAppointments?.[city] === comp.id;
            const isCompVice = mData.regionalViceAppointments?.[city] === comp.id;

            if (isCompCmdr || isCompVice) {
                const eventRoll = Math.random();
                
                // [NEW] 지역 대장으로서의 세금 징수 (매년 3월 3일) - Moved to 1-2 (Main Logic)
                /*
                if (isCompCmdr && isMarch3) {
                    // Logic moved to main event loop to avoid duplication
                }
                */

                // 지역 대장으로서의 행정 성과 (일일) (1% -> 3%)
                if (isCompCmdr && eventRoll < 0.03) {
                    if (mData.regionStats?.[city]) {
                        const rStats = mData.regionStats[city];
                        // 능력치에 따른 성과 차별화
                        const securityGain = comp.stats.str > 100 ? 2 : 1;
                        const sentimentGain = comp.stats.int > 100 ? 2 : 1;
                        
                        rStats.security = Math.min(100, rStats.security + securityGain);
                        rStats.sentiment = Math.min(100, rStats.sentiment + sentimentGain);
                        
                        allLogs.push(`[지역 행정] ${city}의 대장 '${comp.name}'이(가) 탁월한 지휘력을 발휘하여 지역 치안(+${securityGain})과 민심(+${sentimentGain})이 개선되었습니다.`);
                        comp.merit = (comp.merit || 0) + 5;
                    }
                }

                // 지역 부대장으로서의 보조 성과 (일일 치안 및 민심 관리) (0.8% -> 2.5%)
                if (isCompVice && eventRoll < 0.025) {
                    if (mData.regionStats?.[city]) {
                        const rStats = mData.regionStats[city];
                        const securityGain = 1;
                        rStats.security = Math.min(100, rStats.security + securityGain);
                        
                        // 치안이 높으면 민심도 소폭 상승할 수 있음
                        let sentimentMsg = "";
                        if (rStats.security > 80 && Math.random() < 0.4) {
                            rStats.sentiment = Math.min(100, rStats.sentiment + 1);
                            sentimentMsg = " 및 민심(+1)";
                        }
                        
                        allLogs.push(`[지역 방위] ${city}의 부대장 '${comp.name}'이(가) 순찰을 강화하여 치안(+${securityGain})${sentimentMsg}이 상승했습니다.`);
                        comp.merit = (comp.merit || 0) + 3;
                    }
                }

                // 플레이어와의 상호작용 (플레이어가 같은 도시에 있을 때) (0.5% -> 2%)
                if (eventRoll < 0.02) {
                    const isPlayerCmdr = mData.regionalAppointments?.[city] === 'player';
                    const isPlayerVice = mData.regionalViceAppointments?.[city] === 'player';

                    if (isPlayerCmdr && isCompVice) {
                        allLogs.push(`[군대 일상] 부대장 '${comp.name}'이(가) 지휘관님께 지역 방위 태세를 보고하며 경의를 표합니다. (호감도 +2)`);
                        comp.affection = Math.min(100, (comp.affection || 50) + 2);
                    } else if (isPlayerVice && isCompCmdr) {
                        allLogs.push(`[군대 일상] 지역 대장 '${comp.name}'이(가) 당신의 노고를 치하하며 특별 보급품을 챙겨주었습니다.`);
                        comp.affection = Math.min(100, (comp.affection || 50) + 3);
                        currentRef.money += 1000;
                    }
                }
            }
        }

        // 2-4. 동료 군대 일상 이벤트 (0.2% -> 1.5%)
        const lifeRoll = Math.random();
        if (lifeRoll < 0.015) {
            allLogs.push(`[군대 일상] '${comp.name}'이(가) 부대 내 사격 대회에서 우승하여 포상 휴가를 건의받았습니다.`);
            comp.loyalty = Math.min(100, (comp.loyalty || 50) + 5);
        } else if (lifeRoll < 0.025) {
            allLogs.push(`[군대 사고] '${comp.name}'이(가) 훈련 도중 가벼운 부상을 입었습니다. 당분간 안정이 필요해 보입니다.`);
            comp.stats.hp = Math.max(1, comp.stats.hp - 20);
        }
    });

    // --- 3. 공통 부대 유지비 및 보급품 ---
    const totalSoldiers = (isPlayerSoldier ? 1 : 0) + militaryCompanions.length;
    if (totalSoldiers > 0) {
        // 부대 유지비 정산 (일일 차감: 1명당 10,000G)
        const maintenanceCost = totalSoldiers * 10000; 
        if (currentRef.money >= maintenanceCost) {
            currentRef.money -= maintenanceCost;
            if (currentRef.militaryOverdueDays && currentRef.militaryOverdueDays > 0) {
                allLogs.push(`[군수 정상화] 부대 유지비가 정상 지급되어 군 보급 체계가 완전히 복구되었습니다.`);
                currentRef.militaryOverdueDays = 0;
            }
            if (Math.random() < 0.02) {
                allLogs.push(`[군수 보고] 부대원 ${totalSoldiers}명의 장비 정비 및 보급을 위해 ${maintenanceCost.toLocaleString()}G가 지출되었습니다.`);
            }
        } else {
            // 체납 유예 및 단계적 불이익 규정
            currentRef.militaryOverdueDays = (currentRef.militaryOverdueDays || 0) + 1;
            const overdueDays = currentRef.militaryOverdueDays;
            if (overdueDays <= 3) {
                // 체납 1단계: 지급 유예 및 보급 지연 경고 (충성도 하락 유예)
                allLogs.push(`[군수 체납 경고 1단계] 군 자금이 부족하여 부대 유지비(${maintenanceCost.toLocaleString()}G) 지급이 유예되었습니다. (체납 ${overdueDays}일차) 보급품 지급이 지연됩니다.`);
            } else if (overdueDays <= 6) {
                // 체납 2단계: 사기/충성도 점진 하락 (-2)
                currentRef.companions.forEach(c => {
                    if (c.job === JobType.SOLDIER) {
                        c.loyalty = Math.max(0, (c.loyalty || 50) - 2);
                    }
                });
                allLogs.push(`[군수 체납 경고 2단계] 부대 유지비 지속 체납(${overdueDays}일차)! 장비 보급 중단으로 부대원들의 충성도와 사기가 하락했습니다.`);
            } else {
                // 체납 3단계: 장기 체납으로 인한 대폭 하락 (-5) 및 부대 이탈 위험 경보
                currentRef.companions.forEach(c => {
                    if (c.job === JobType.SOLDIER) {
                        c.loyalty = Math.max(0, (c.loyalty || 50) - 5);
                    }
                });
                allLogs.push(`[군수 비상] 부대 유지비 장기 체납(${overdueDays}일차)! 부대원들의 충성도가 급락하며 탈영 및 이탈 위기가 고조되고 있습니다.`);
            }
        }

        // 무작위 보급품 하달 (0.2% -> 1.5% 확률)
        if (Math.random() < 0.015) {
            const supplies: Item[] = [
                { name: "군용 고농축 포션", type: "Consumable", rarity: ItemRarity.MAGIC, description: "군단에서 보급되는 강력한 회복약입니다.", enhancement: 0, secondaryOptions: ["HP 500 회복"], imageUrl:"https://i.ibb.co/0jFJvPjb/Gemini-Generated-Image-ommkoiommkoiommk.png" },
                { name: "정비용 숫돌", type: "Etc", rarity: ItemRarity.NORMAL, description: "무기의 날을 세우는 데 쓰이는 고급 숫돌입니다.", enhancement: 0 , imageUrl:"https://i.ibb.co/pvMqj7ts/Gemini-Generated-Image-s570wos570wos570.png"}
            ];
            const selected = supplies[Math.floor(Math.random() * supplies.length)];
            if (currentRef.inventory.length < 100) {
                currentRef.inventory.push(selected);
                allLogs.push(`[군 보급] 본부로부터 위문품 '${selected.name}'이(가) 도착했습니다.`);
            }
        }
    }

    // 플레이어가 군인이 아니더라도 세계 정세는 매달 1일 업데이트 (이미 위에서 체크했지만, 군인이 있을 때도 여기서 실행)
    if (isDayOne && !isPlayerSoldier && militaryCompanions.length > 0 && currentRef.militaryData) {
        simulateGlobalButterflyEffect(currentRef, allLogs);
    }
};

/**
 * [MODIFIED] 전 세계 국가들 사이의 외교 관계를 시뮬레이션합니다. (6개월 주기 호출)
 */
const simulateGlobalButterflyEffect = (char: Character, logs: string[]) => {
    if (!char.militaryData) return;
    if (!char.militaryData.globalDiplomacy) char.militaryData.globalDiplomacy = {};
       if (!char.militaryData.npcWarProgress) char.militaryData.npcWarProgress = {};
    const otherNations = NATION_LIST.filter(n => n !== char.nation);
    if (otherNations.length < 2) return;

   // --- PART 1: 신규 외교 관계 수립 및 상태 변화 ---
    const diplomacyEventCount = Math.random() < 0.55 ? (Math.random() < 0.3 ? 2 : 1) : 0; 
    for (let i = 0; i < diplomacyEventCount; i++) {
        const nationA = otherNations[Math.floor(Math.random() * otherNations.length)];
        let nationB = otherNations[Math.floor(Math.random() * otherNations.length)];
        while (nationA === nationB) nationB = otherNations[Math.floor(Math.random() * otherNations.length)];

        const pairKey = [nationA, nationB].sort().join('_');
        const prevStatus = char.militaryData.globalDiplomacy[pairKey] || DiplomaticStatus.NEUTRAL;
        
        const roll = Math.random();
        let newStatus: DiplomaticStatus = prevStatus;
        let eventMsg = "";


        // 상태 전이 로직 (State Transition Logic)
             if (prevStatus === DiplomaticStatus.NEUTRAL) {
            if (roll < 0.2) {
                newStatus = DiplomaticStatus.HOSTILE;
                eventMsg = `[세계 정세] '${nationA}'와(과) '${nationB}' 사이의 자원 채굴권 분쟁이 격화되었습니다.`;
            } else if (roll < 0.4) {
                newStatus = DiplomaticStatus.ALLIANCE;
                eventMsg = `[세계 정세] '${nationA}'와(과) '${nationB}'이(가) 상호 방위 조약을 체결했습니다.`;
            }
        } 
        else if (prevStatus === DiplomaticStatus.HOSTILE) {
            if (roll < 0.5) {
                newStatus = DiplomaticStatus.WAR;
                eventMsg = `[전쟁 발발] '${nationA}'이(가) '${nationB}'의 국경을 침범했습니다! 양국이 전면전에 돌입합니다.`;
                char.militaryData.npcWarProgress[pairKey] = 0; // 전쟁 초기화
            } else if (roll < 0.7) {
                newStatus = DiplomaticStatus.NEUTRAL;
                eventMsg = `[세계 정세] '${nationA}'와(과) '${nationB}'의 긴장이 외교적 대화로 완화되었습니다.`;
            }
        } 
        else if (prevStatus === DiplomaticStatus.ALLIANCE) {
            if (roll < 0.2) {
                newStatus = DiplomaticStatus.NEUTRAL;
                eventMsg = `[세계 정세] '${nationA}'와(과) '${nationB}'의 동맹 관계가 만료되었습니다.`;
            }
        }

        if (eventMsg) {
            char.militaryData.globalDiplomacy[pairKey] = newStatus;
            logs.push(eventMsg);
        }
    }
      // --- PART 2: 독립적 전쟁 시뮬레이션 (NPC vs NPC) ---
    // 현재 전쟁 중인 모든 국가 쌍을 찾아 진척도를 업데이트합니다.
    Object.keys(char.militaryData.globalDiplomacy).forEach(pairKey => {
        const status = char.militaryData.globalDiplomacy![pairKey];
        if (status === DiplomaticStatus.WAR) {
            const nations = pairKey.split('_');
            const nation1 = nations[0];
            const nation2 = nations[1];
            
            // 기존 진척도 로드 (없으면 0)
            let progress = char.militaryData!.npcWarProgress![pairKey] || 0;
            
            // 전황 시뮬레이션 (매달 -15% ~ +15% 변동)
            const delta = Math.floor(Math.random() * 31) - 15;
            progress += delta;
            
            // 로그 생성 (변동폭이 클 때만)
            if (Math.abs(delta) > 10) {
                const winner = delta > 0 ? nation1 : nation2;
                const loser = delta > 0 ? nation2 : nation1;
                logs.push(`[전황 보고] '${winner}'군이 '${loser}' 전선에서 대승을 거두며 진격 중입니다! (전황: ${Math.abs(progress)}%)`);
            }

            // 함락 판정 (100% 또는 -100% 도달 시)
            if (progress >= 100) {
                // Nation 1 승리
                char.militaryData!.globalDiplomacy![pairKey] = DiplomaticStatus.VASSAL_OWNER;
                delete char.militaryData!.npcWarProgress![pairKey];
                logs.push(`[국가 함락] '${nation1}'이(가) '${nation2}'의 수도를 점령했습니다! '${nation2}'은(는) 이제 '${nation1}'의 속국입니다.`);
            } else if (progress <= -100) {
                // Nation 2 승리
                char.militaryData!.globalDiplomacy![pairKey] = DiplomaticStatus.VASSAL_SUBJECT;
                delete char.militaryData!.npcWarProgress![pairKey];
                logs.push(`[국가 함락] '${nation2}'이(가) '${nation1}'의 군대를 괴멸시키고 굴복시켰습니다! '${nation1}'은(는) 이제 '${nation2}'의 속국입니다.`);
            } else {
                char.militaryData!.npcWarProgress![pairKey] = progress;
            }
        }
    });

    // --- PART 3: 속국 해방 체크 ---
    Object.keys(char.militaryData.globalDiplomacy).forEach(pairKey => {
        const status = char.militaryData.globalDiplomacy![pairKey];
        if (status === DiplomaticStatus.VASSAL_OWNER || status === DiplomaticStatus.VASSAL_SUBJECT) {
            // 5% 확률로 속국이 독립 전쟁을 일으키거나 해방됨
            if (Math.random() < 0.03) {
                const nations = pairKey.split('_');
                char.militaryData!.globalDiplomacy![pairKey] = DiplomaticStatus.NEUTRAL;
                logs.push(`[세계 소식] '${nations[1]}'이(가) '${nations[0]}'의 지배에서 벗어나 주권을 회복했습니다.`);
            }
        }
    });
};

