import { Character, MilitaryRank, Quest, JobType, Location, DiplomaticStatus } from '../types';
import { MILITARY_SALARY, MILITARY_RANK_ORDER, QUEST_DANGER_INDEX, WORLD_GEOGRAPHY } from '../constants';
import { getBossByLocation } from '../bossMonsters';
import { SEASONAL_BOSSES } from '../mythicbossmonsters';

export const generateLocalMilitaryMissions = (
    character: Character, 
    monsterPool: string[], 
    bossName: string, 
    lootPool: string[]
): Quest[] => {
    const loc = character.currentLocation || { nation: '대한민국', city: '서울' };
    const playerNation = loc.nation || character.nation || '대한민국';
    const allComps = [...(character.companions || []), ...(character.inactiveCompanions || [])];
    const eligibleRanks = [
        ...(character.job === JobType.SOLDIER && character.nation === playerNation && character.militaryRank ? [character.militaryRank] : []),
        ...allComps.filter(c => !c.isDead && c.job === JobType.SOLDIER && c.nation === playerNation && c.militaryRank).map(c => c.militaryRank!)
    ];
    const commanderRank = eligibleRanks.length > 0
        ? eligibleRanks.sort((a, b) => MILITARY_RANK_ORDER.indexOf(b) - MILITARY_RANK_ORDER.indexOf(a))[0]
        : (character.militaryRank || character.militaryData?.rank || MilitaryRank.PVT);
    const rankIdx = MILITARY_RANK_ORDER.indexOf(commanderRank);
    const captainRankIdx = MILITARY_RANK_ORDER.indexOf(MilitaryRank.CPT);
    const salary = MILITARY_SALARY[commanderRank] || 2000;
    
    const missions: Quest[] = [];
    
    // 1. 토벌 임무 (2개)
    for (let i = 0; i < 2; i++) {
        const targetMonster = monsterPool[Math.floor(Math.random() * monsterPool.length)] || "미확인 생명체";
        const dangerKeys: (keyof typeof QUEST_DANGER_INDEX)[] = ['Low', 'Mid', 'High', 'Extreme'];
        const danger = dangerKeys[Math.floor(Math.random() * dangerKeys.length)];
        const dangerMult = QUEST_DANGER_INDEX[danger] || 1.0;
        const count = Math.floor(Math.random() * 3) + 3;

        const rewardExp = Math.floor(salary * 2 * dangerMult * (0.8 + Math.random() * 0.4));
        const rewardGold = Math.floor(salary * 1 * dangerMult);

        missions.push({
            id: `mil_sub_${Date.now()}_${i}`,
            type: 'Subjugation',
            rank: commanderRank,
            title: `[토벌] ${targetMonster} 소탕 작전`,
            goal: `${targetMonster} ${count}마리 처치`,
            details: `${loc.city} 인근에서 발견된 ${targetMonster} 무리를 소탕하여 지역의 안전을 확보하십시오.`,
            danger: danger as 'Low' | 'Mid' | 'High' | 'Extreme',
            rewardGold,
            rewardExp,
            rewardMerit: 15,
            targetAmount: count,
            targetName: targetMonster,
            currentAmount: 0,
            location: { nation: loc.nation, city: loc.city }
        });
    }

    // 2. 보급 임무 (1개)
    const targetItem = lootPool[Math.floor(Math.random() * lootPool.length)] || "식량";
    const supplyCount = 2 + Math.floor(Math.random() * 4);
    missions.push({
        id: `mil_supply_${Date.now()}`,
        type: 'MilitarySupply',
        rank: commanderRank,
        title: `[보급] 군수 물자 ${targetItem} 확보`,
        goal: `${targetItem} ${supplyCount}개 확보`,
        details: `부대의 원활한 운영을 위해 ${targetItem} ${supplyCount}개가 필요합니다. 신속히 확보하여 보고하십시오.`,
        danger: 'Low',
        rewardGold: Math.floor(salary * 2),
        rewardExp: Math.floor(salary * 3),
        rewardMerit: 20,
        targetAmount: supplyCount,
        targetName: targetItem,
        currentAmount: 0,
        location: { nation: loc.nation, city: loc.city }
    });

    // 3. [신규 1] 국경 정찰 임무 (MilitaryRecon) - 대위 이하의 계급만 가능
    if (rankIdx <= captainRankIdx) {
        missions.push({
            id: `mil_recon_${Date.now()}`,
            type: 'MilitaryRecon',
            rank: commanderRank,
            title: `[국경 정찰] ${loc.city} 국경 경계 정찰`,
            goal: `${loc.city} 국경 지역 정찰 완료`,
            details: `${loc.city} 국경 지대의 우발적 도발 및 이상 징후를 감시하기 위해 국경 순찰 활동을 수행하십시오. (대위 이하 계급 전용 / 도시 지도 보드의 국경 경계 버튼 이용)`,
            danger: 'Mid',
            rewardGold: Math.floor(salary * 2.5),
            rewardExp: Math.floor(salary * 2.0),
            rewardMerit: 30,
            targetAmount: 1,
            currentAmount: 0,
            targetName: loc.city,
            location: { nation: loc.nation, city: loc.city }
        });
    }

    // 4. [신규 2] 적국 첩보 임무 (MilitaryInfiltration) - 실제 전쟁 중인 적국 대상
    const diplomacyMap = character.militaryData?.diplomacy || {};
    // 실제 전쟁 중(WAR)인 적국만 필터링
    const warNationKeys = Object.keys(diplomacyMap).filter(n => {
        if (n === loc.nation) return false;
        const rel = diplomacyMap[n];
        return rel && rel.status === DiplomaticStatus.WAR;
    });

    let targetNation = '임페리얼 제국';
    if (warNationKeys.length > 0) {
        targetNation = warNationKeys[Math.floor(Math.random() * warNationKeys.length)];
    } else {
        // 지정된 전쟁 중인 적국이 없을 경우 본국이 아닌 타국 중 선택
        const regions = Object.keys(WORLD_GEOGRAPHY);
        const candidateNations: string[] = [];
        regions.forEach(r => {
            Object.keys(WORLD_GEOGRAPHY[r]).forEach(n => {
                if (n !== loc.nation) candidateNations.push(n);
            });
        });
        if (candidateNations.length > 0) {
            targetNation = candidateNations.includes('임페리얼 제국') ? '임페리얼 제국' : candidateNations[Math.floor(Math.random() * candidateNations.length)];
        }
    }

    // 대상 국가의 지역 및 도시 선출
    let targetRegion = '동아시아';
    let targetCity = '도쿄';
    for (const [rKey, nMap] of Object.entries(WORLD_GEOGRAPHY)) {
        if (nMap[targetNation]) {
            targetRegion = rKey;
            const cities = nMap[targetNation].cities || [];
            if (cities.length > 0) {
                targetCity = cities[Math.floor(Math.random() * cities.length)];
            }
            break;
        }
    }

    missions.push({
        id: `mil_infilt_${Date.now()}`,
        type: 'MilitaryInfiltration',
        rank: commanderRank,
        title: `[적국 첩보] ${targetNation} ${targetCity} 기밀 첩보`,
        goal: `${targetNation} ${targetCity}에서 첩보 활동 완료`,
        details: `적국인 ${targetNation}의 ${targetCity}(으)로 비밀리에 침투하여 군사 기밀 및 병력 동향을 수집하십시오. (${targetNation} ${targetCity} 진입 후 해당 도시 지도에서 첩보 진행)`,
        danger: 'High',
        rewardGold: Math.floor(salary * 4.0),
        rewardExp: Math.floor(salary * 3.5),
        rewardMerit: 60,
        targetAmount: 1,
        currentAmount: 0,
        targetName: targetCity,
        location: { nation: targetNation, city: targetCity, region: targetRegion }
    });

    // 5. [신규 3] 적군 공격 및 점유율 상승 (MilitaryAttackShare) - 실제 전쟁 중인 적국 대상
    let attackTargetNation = warNationKeys.length > 0 ? warNationKeys[Math.floor(Math.random() * warNationKeys.length)] : targetNation;
    const curOccupation = diplomacyMap[attackTargetNation]?.occupation || 0;
    const targetShareIncrease = Math.min(15, 3 + Math.floor(rankIdx * 0.8)); // 계급에 따라 3% ~ 15% 상승 목표
    const requiredTotalShare = Math.min(100, curOccupation + targetShareIncrease);

    let attackTargetCity = '도쿄';
    for (const [rKey, nMap] of Object.entries(WORLD_GEOGRAPHY)) {
        if (nMap[attackTargetNation]) {
            const cities = nMap[attackTargetNation].cities || [];
            if (cities.length > 0) attackTargetCity = cities[0];
            break;
        }
    }

    missions.push({
        id: `mil_atk_share_${Date.now()}`,
        type: 'MilitaryAttackShare',
        rank: commanderRank,
        title: `[전선 공세] 대(對) ${attackTargetNation} 점유율 ${requiredTotalShare}% 달성`,
        goal: `${attackTargetNation} 전선 점유율 ${requiredTotalShare}% 이상 확보 (수락 시: ${curOccupation}%)`,
        details: `${attackTargetNation} 거점 습격 및 전선 돌파를 수행하여 해당 적국과의 전선 점유율을 ${requiredTotalShare}% 이상(수락 시점 대비 +${targetShareIncrease}%)으로 끌어올리십시오.`,
        danger: 'High',
        rewardGold: Math.floor(salary * 5.0),
        rewardExp: Math.floor(salary * 4.0),
        rewardMerit: 80,
        targetNation: attackTargetNation,
        initialShare: curOccupation,
        targetShare: targetShareIncrease,
        requiredTotalShare: requiredTotalShare,
        targetAmount: 1,
        currentAmount: 0,
        location: { nation: attackTargetNation, city: attackTargetCity }
    });

    // 6. [신규 4] 국가 외교 및 사절단 호위 (MilitaryDiplomaticEscort) - 대위 이상의 계급부터 가능
    if (rankIdx >= captainRankIdx) {
        const regionsList = Object.keys(WORLD_GEOGRAPHY);
        const escortRegion = regionsList[Math.floor(Math.random() * regionsList.length)];
        const escortCandidates = Object.keys(WORLD_GEOGRAPHY[escortRegion]).filter(n => n !== loc.nation);
        const escortDestNation = escortCandidates.length > 0 ? escortCandidates[Math.floor(Math.random() * escortCandidates.length)] : '중국';
        const escortDestCities = WORLD_GEOGRAPHY[escortRegion][escortDestNation]?.cities || ['베이징'];
        const escortDestCity = escortDestCities[Math.floor(Math.random() * escortDestCities.length)];

        missions.push({
            id: `mil_diplomacy_escort_${Date.now()}`,
            type: 'MilitaryDiplomaticEscort',
            rank: commanderRank,
            title: `[외교 호위] ${escortDestNation} 외교 사절단 안전 호위`,
            goal: `외교 사절단을 ${escortDestCity}까지 안전하게 호송`,
            details: `국가 간 평화 회담을 위한 외교 사절단을 ${escortDestNation}의 ${escortDestCity}까지 안전하게 호위하십시오. 이동 중 적국의 매복이나 습격자들을 격퇴해야 합니다. (대위 이상 계급 전용)`,
            danger: 'High',
            rewardGold: Math.floor(salary * 4.5),
            rewardExp: Math.floor(salary * 3.5),
            rewardMerit: 70,
            targetAmount: 1,
            currentAmount: 0,
            targetName: '외교 사절단',
            targetCity: escortDestCity,
            targetNation: escortDestNation,
            destination: { nation: escortDestNation, city: escortDestCity, region: escortRegion }
        });
    }

    // 7. [신규 5] 전선 방벽 복구 및 공병 지원 (MilitaryWallRepair)
    const stoneReq = 20 + rankIdx * 10;
    const ironReq = 15 + rankIdx * 5;
    const woodReq = 25 + rankIdx * 8;
    const manaCrystalReq = 3 + rankIdx * 2;

    missions.push({
        id: `mil_wall_repair_${Date.now()}`,
        type: 'MilitaryWallRepair',
        rank: commanderRank,
        title: `[공병 지원] ${loc.city} 전선 방벽 보수 작전`,
        goal: `자원 지원(석재 ${stoneReq}, 철광석 ${ironReq}, 목재 ${woodReq}, 마정석 ${manaCrystalReq}) 및 방벽 공사`,
        details: `${loc.city} 전선의 훼손된 성벽과 방벽을 보수하기 위해 필요한 군수 자원(석재 ${stoneReq}개, 철광석 ${ironReq}개, 목재 ${woodReq}개, 마정석 ${manaCrystalReq}개)을 지원하고 공사를 완료하십시오. (도시 지도 보드에서 방벽 복구 수행)`,
        danger: 'Low',
        rewardGold: Math.floor(salary * 3.0),
        rewardExp: Math.floor(salary * 2.5),
        rewardMerit: 45,
        requiredResources: {
            stone: stoneReq,
            iron: ironReq,
            wood: woodReq,
            manaCrystal: manaCrystalReq
        },
        targetAmount: 1,
        currentAmount: 0,
        location: { nation: loc.nation, city: loc.city }
    });

    // 8. 던전 실종자 수색 및 구출 (MilitaryDungeonSearch)
    missions.push({
        id: `mil_dungeon_search_${Date.now()}`,
        type: 'MilitaryDungeonSearch',
        rank: commanderRank,
        title: `[구출 작전] ${loc.city} 던전 실종자 수색 및 구출`,
        goal: `${loc.city} 던전에 고립된 실종자 수색 완료`,
        details: `${loc.city} 던전 인근에서 임무 수행 및 이동 중 마수들의 위협으로 고립된 실종자(군인, 광부, 연금술사, 대장장이, 연구원 등)를 수색하고 안전하게 구조하십시오. (${loc.city} 던전에서만 구조 가능)`,
        danger: 'High',
        rewardGold: Math.floor(salary * 3.5),
        rewardExp: Math.floor(salary * 3.0),
        rewardMerit: 50,
        targetAmount: 1,
        currentAmount: 0,
        targetName: '실종자',
        targetCity: loc.city,
        location: { nation: loc.nation, city: loc.city }
    });

    // 9. [신규 7] 도시 심야 치안유지 및 암시장 단속 (MilitaryNightPatrol)
    missions.push({
        id: `mil_night_patrol_${Date.now()}`,
        type: 'MilitaryNightPatrol',
        rank: commanderRank,
        title: `[심야 순찰] ${loc.city} 심야 치안 유지 및 암시장 단속`,
        goal: `심야 시간대 순찰 및 불법 암시장 단속 완료`,
        details: `심야 시간에 ${loc.city}의 거리를 정찰하여 범죄 조직 및 무법자를 소탕하고, 불법 암시장을 단속하여 도시 치안을 유지하십시오. (심야 시간 도시 지도 보드 이용)`,
        danger: 'Mid',
        rewardGold: Math.floor(salary * 3.0),
        rewardExp: Math.floor(salary * 2.5),
        rewardMerit: 45,
        targetAmount: 1,
        currentAmount: 0,
        location: { nation: loc.nation, city: loc.city }
    });

    // 10. 거주지역 몬스터 습격 사건 방어 (장교급 이상)
    const officerRankIdx = MILITARY_RANK_ORDER.indexOf(MilitaryRank.SLT);
    const hasOfficerRank = rankIdx >= officerRankIdx;
    
    if (hasOfficerRank) {
        const residenceCity = character.base?.location?.city || character.currentLocation?.city || '서울';
        const residenceNation = character.base?.location?.nation || character.currentLocation?.nation || character.nation || '대한민국';
        const residenceRegion = character.base?.location?.region || character.currentLocation?.region || '아시아';
        missions.push({
            id: `mil_reg_def_${Date.now()}`,
            type: 'MilitaryRegionalDefense',
            rank: commanderRank,
            title: `[지역 방위] ${residenceCity} 몬스터 습격 방어`,
            goal: `${residenceCity} 거주지역 습격 몬스터 퇴치`,
            details: `당신이 담당하는 거주지역인 ${residenceCity}(${residenceNation})에 대규모 몬스터 습격이 발생했습니다. 즉시 출동하여 주민들을 보호하고 몬스터를 퇴치하십시오.`,
            danger: 'High' as const,
            rewardGold: Math.floor(salary * 3),
            rewardExp: Math.floor(salary * 1),
            rewardMerit: 50,
            targetAmount: 1,
            targetName: residenceCity,
            location: { nation: residenceNation, city: residenceCity },
            destination: { region: residenceRegion, nation: residenceNation, city: residenceCity },
            currentAmount: 0
        });
    }

    // 11. 장성급 보스 토벌 작전
    const currentRegion = Object.keys(WORLD_GEOGRAPHY).find(r => Object.keys(WORLD_GEOGRAPHY[r]).includes(loc.nation)) || '아시아';
    const geo = WORLD_GEOGRAPHY[currentRegion]?.[loc.nation] || { capital: loc.city, cities: [loc.city] };
    const monthNum = parseInt(character.currentDate?.split('-')[1] || '3');

    if (commanderRank === MilitaryRank.MG) {
        const nonCapitalCities = geo.cities.filter(c => c !== geo.capital);
        const targetCityName = nonCapitalCities.length > 0 ? nonCapitalCities[Math.floor(Math.random() * nonCapitalCities.length)] : loc.city;
        const localBoss = getBossByLocation(loc.nation, targetCityName, monthNum);
        missions.push({
            id: `mil_boss_mg_${Date.now()}`,
            type: 'Subjugation',
            rank: commanderRank,
            title: `[지역 결전] ${localBoss.name} 토벌 작전`,
            goal: `${localBoss.name} 1마리 처치`,
            details: `${loc.nation} ${targetCityName}에 출몰한 지역 우두머리 ${localBoss.name}을(를) 토벌하라는 사령부의 작전 명령입니다.`,
            danger: 'Extreme',
            rewardGold: Math.floor(salary * 3.5),
            rewardExp: Math.floor(salary * 2.5),
            rewardMerit: 100,
            targetAmount: 1,
            targetName: localBoss.name,
            location: { nation: loc.nation, city: targetCityName },
            currentAmount: 0
        });
    }

    // 군대 퀘스트는 모든 임무가 아닌 랜덤 6개만 선별하여 갱신
    const shuffled = [...missions].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 6);
};
