import { Character, Enemy, Location } from '../types';
import { getHuntBandsForLocation, getMonsterInfo, getMonsterPoolForBand, NATION_THEMES } from '../monsterfield';
import { generateProceduralEnemy } from '../utils';
import { TravelTransportType } from './travelCalculationService';

export interface TravelEventChoice {
    id: string;
    label: string;
    hint: string;
    goldDelta?: number;
    expDelta?: number;
    hpPctDelta?: number;
    mpPctDelta?: number;
    minutesDelta?: number;
    reputationDelta?: number;
    markRescueDate?: string;
    companionId?: string;
    affectionDelta?: number;
    triggerBattle?: boolean;
    customEnemies?: Enemy[];
    resultText: string;
}

export interface TravelEncounterEvent {
    id: string;
    kind: 'merchant' | 'landmark' | 'ambush' | 'weather' | 'companion' | 'rescue' | 'bounty' | 'rival';
    title: string;
    description: string;
    icon: string;
    choices: TravelEventChoice[];
}

export function generateTravelAmbushEnemies(
    destination: Location,
    character: Character,
    preferredBandIndex?: number
): Enemy[] {
    const theme =
        NATION_THEMES[destination.city] ||
        NATION_THEMES[destination.nation] ||
        NATION_THEMES['default'];
    const bands = getHuntBandsForLocation(destination.nation, destination.region, destination.city);
    const band =
        bands.length > 0
            ? typeof preferredBandIndex === 'number'
                ? bands[Math.max(0, Math.min(bands.length - 1, preferredBandIndex))]
                : bands[Math.floor(Math.random() * Math.min(bands.length, 6))]
            : null;
    const pool = band
        ? getMonsterPoolForBand(theme, band.id)
        : theme.monsters?.['intermediate'] || theme.monsters?.['beginner'] || ['떠돌이 마물'];
    const count = 1 + Math.floor(Math.random() * 2);
    const targetLevel = band
        ? Math.floor(Math.random() * (band.levelRange[1] - band.levelRange[0] + 1)) + band.levelRange[0]
        : Math.max(1, character.level);
    const list: Enemy[] = [];
    for (let i = 0; i < count; i++) {
        const enemy = generateProceduralEnemy(targetLevel);
        const rawName = pool[Math.floor(Math.random() * pool.length)];
        const info = getMonsterInfo(rawName);
        enemy.name = count > 1 ? `${info.name} ${String.fromCharCode(65 + i)}` : info.name;
        if (info.visualUrl) enemy.visualUrl = info.visualUrl;
        if (info.shinryokuType) enemy.shinryokuType = info.shinryokuType;
        list.push(enemy);
    }
    return list;
}

export function generateBountyTargetEnemies(destination: Location, character: Character): Enemy[] {
    const theme =
        NATION_THEMES[destination.city] ||
        NATION_THEMES[destination.nation] ||
        NATION_THEMES['default'];
    const bands = getHuntBandsForLocation(destination.nation, destination.region, destination.city);
    const band =
        bands.length > 0
            ? bands[Math.min(bands.length - 1, Math.floor(bands.length * 0.65))]
            : null;
    const pool = band
        ? getMonsterPoolForBand(theme, band.id)
        : theme.monsters?.['elite'] || theme.monsters?.['advanced'] || ['흉악한 현상수배범'];
    const rawName = pool[Math.floor(Math.random() * pool.length)];
    const info = getMonsterInfo(rawName);
    const targetLevel = band
        ? Math.floor(Math.random() * (band.levelRange[1] - band.levelRange[0] + 1)) + band.levelRange[0]
        : Math.max(3, character.level + 2);
    const boss = generateProceduralEnemy(targetLevel);
    boss.name = `[현상수배범] ${info.name}`;
    boss.maxHp = Math.round(boss.maxHp * 1.6);
    boss.hp = boss.maxHp;
    if (info.visualUrl) boss.visualUrl = info.visualUrl;
    if (info.shinryokuType) boss.shinryokuType = info.shinryokuType;
    return [boss];
}

export function rollTravelEvent(
    transport: TravelTransportType,
    destination: Location,
    character: Character,
    ambushChancePct: number
): TravelEncounterEvent {
    const roll = Math.random() * 100;
    const lvl = Math.max(1, character.level);
    const expReward = Math.max(40, Math.round(lvl * 18));
    const goldCost = Math.min(Math.max(150, lvl * 25), Math.max(150, Math.floor(character.money * 0.08)));

    // 0-A. 동행 동료 대화·친밀도 이벤트 (동료가 있을 때 22% 확률)
    const activeCompanions = character.companions || [];
    if (activeCompanions.length > 0 && Math.random() < 0.22) {
        const comp = activeCompanions[Math.floor(Math.random() * activeCompanions.length)];
        return {
            id: `companion_${Date.now()}`,
            kind: 'companion',
            title: `동료와의 여로 대화 — ${comp.name}`,
            description: `${destination.city}로 향하는 길, ${comp.name}이(가) 창밖 풍경을 바라보며 당신에게 말을 건넵니다. "이번 여정이 끝나면 잠시라도 함께 쉴 수 있을까요?"`,
            icon: '💬',
            choices: [
                {
                    id: 'heartfelt',
                    label: `${comp.name}의 손을 잡으며 진심으로 화답한다`,
                    hint: `${comp.name} 친밀도 +6 · HP/MP +15% 회복`,
                    companionId: comp.id,
                    affectionDelta: 6,
                    hpPctDelta: 15,
                    mpPctDelta: 15,
                    resultText: `${comp.name}이(가) 환하게 웃으며 고개를 끄덕였습니다. (${comp.name} 친밀도 +6)`
                },
                {
                    id: 'train',
                    label: '여정 중 서로의 전투 호흡을 맞춰본다',
                    hint: `${comp.name} 친밀도 +3 · EXP +${expReward}`,
                    companionId: comp.id,
                    affectionDelta: 3,
                    expDelta: expReward,
                    resultText: `${comp.name}과(와) 전술을 논의하며 유대와 실력이 모두 깊어졌습니다. (${comp.name} 친밀도 +3)`
                }
            ]
        };
    }

    // 0-B. 영원의 라이벌 조우 (등록된 라이벌이 있을 때 14% 확률)
    const rivals = (character.relations || []).filter(r => r.isEternalRival);
    if (rivals.length > 0 && Math.random() < 0.14) {
        const rival = rivals[Math.floor(Math.random() * rivals.length)];
        const rivalEnemy = generateProceduralEnemy(Math.max(5, lvl + 3));
        rivalEnemy.name = `[영원의 라이벌] ${rival.name}`;
        rivalEnemy.maxHp = Math.round(rivalEnemy.maxHp * 1.8);
        rivalEnemy.hp = rivalEnemy.maxHp;
        return {
            id: `rival_${Date.now()}`,
            kind: 'rival',
            title: `숙명의 조우 — ${rival.name}`,
            description: `이동 경로 앞쪽에서 익숙한 기운이 느껴집니다! 영원의 라이벌 ${rival.name}이(가) 팔짱을 낀 채 당신을 노려보고 있습니다.`,
            icon: '🔥',
            choices: [
                {
                    id: 'duel',
                    label: '정면 승부로 실력을 겨룬다 (전투)',
                    hint: '라이벌과 즉시 대결! 승리 시 큰 경험치와 전리품 획득',
                    triggerBattle: true,
                    customEnemies: [rivalEnemy],
                    resultText: `${rival.name}와(과)의 자존심을 건 일전이 시작됩니다!`
                },
                {
                    id: 'respect',
                    label: '목적지까지 누가 먼저 도착하는지 내기하며 지나친다',
                    hint: `명성 +12 · EXP +${Math.round(expReward * 0.8)} · 이동 시간 15분 단축`,
                    reputationDelta: 12,
                    expDelta: Math.round(expReward * 0.8),
                    minutesDelta: -15,
                    resultText: `${rival.name}에게 지지 않으려 속도를 올려 목적지에 더 빨리 다가섰습니다!`
                }
            ]
        };
    }

    // 0-C. 조난자 구조 이벤트 (하루 1회 제한, 16% 확률)
    const todayDate = character.currentDate || '2026-01-01';
    if (character.lastTravelRescueDate !== todayDate && Math.random() < 0.16) {
        const rescueGold = Math.max(400, Math.round(lvl * 55));
        return {
            id: `rescue_${Date.now()}`,
            kind: 'rescue',
            title: transport === 'ship' ? '표류 중인 조난선 발견!' : '길가에서 조난당한 여행자 발견!',
            description: `${destination.nation} 인근 경로에서 지쳐 쓰러진 여행자가 구조 신호를 보내고 있습니다.`,
            icon: '🆘',
            choices: [
                {
                    id: 'help',
                    label: '잠시 멈춰 조난자를 구조하고 치료해준다',
                    hint: `명성 +2 · 보답 골드 +${rescueGold.toLocaleString()}G · 시간 +15분`,
                    reputationDelta: 2,
                    markRescueDate: todayDate,
                    goldDelta: rescueGold,
                    minutesDelta: 15,
                    resultText: `조난자를 무사히 구조해 감사 인사와 함께 ${rescueGold.toLocaleString()}G를 받았습니다! (명성 +2)`
                },
                {
                    id: 'supply_potion',
                    label: '비상 식량과 물만 건네주고 빠르게 이동한다',
                    hint: `명성 +2 · EXP +${Math.round(expReward * 0.5)}`,
                    reputationDelta: 2,
                    markRescueDate: todayDate,
                    expDelta: Math.round(expReward * 0.5),
                    resultText: '신속히 비상 물자를 건네주고 여정을 이어갔습니다. (명성 +2)'
                }
            ]
        };
    }

    // 0-D. 현상수배범 포착 이벤트 (14% 확률)
    if (Math.random() < 0.14) {
        const bountyGold = Math.max(600, Math.round(lvl * 80));
        return {
            id: `bounty_${Date.now()}`,
            kind: 'bounty',
            title: '현상수배범 목격!',
            description: `${destination.city} 경비대가 수배 중인 위험 인물이 인근 경로를 지나가는 모습이 포착되었습니다.`,
            icon: '📜',
            choices: [
                {
                    id: 'capture',
                    label: '추격하여 현상수배범을 토벌한다 (전투)',
                    hint: '정예 수배범과 전투! 승리 시 전리품과 경험치 획득',
                    triggerBattle: true,
                    customEnemies: generateBountyTargetEnemies(destination, character),
                    resultText: '현상수배범의 앞을 가로막고 토벌 전투에 돌입합니다!'
                },
                {
                    id: 'report',
                    label: '경비대에 위치만 제보하고 안전하게 통과한다',
                    hint: `정보 제보 사례금 +${Math.round(bountyGold * 0.4).toLocaleString()}G · 명성 +6`,
                    goldDelta: Math.round(bountyGold * 0.4),
                    reputationDelta: 6,
                    resultText: '경비대에 정확한 위치를 제보해 소정의 사례금과 명성을 얻었습니다.'
                }
            ]
        };
    }

    // 1. 습격 이벤트
    if (roll < ambushChancePct) {
        const isShip = transport === 'ship';
        const isAir = transport === 'airship';
        const isPortal = transport === 'portal';
        return {
            id: `ambush_${Date.now()}`,
            kind: 'ambush',
            title: isShip
                ? '해상 약탈자 습격!'
                : isAir
                    ? '상공 하늘괴수 출현!'
                    : isPortal
                        ? '차원 틈새의 마수 포착!'
                        : `${destination.nation} 외곽 습격 조우!`,
            description: isShip
                ? '항로 안개 속에서 무장한 해적선과 바다 마물이 접근하고 있습니다.'
                : isAir
                    ? '구름 위를 비행하던 중 거대한 날개 달린 괴수 무리가 항로를 가로막았습니다.'
                    : isPortal
                        ? '차원 통로가 흔들리며 경계를 배회하던 차원 마수들이 덮쳐옵니다.'
                        : '이동 경로 앞쪽에서 야생 마물과 약탈자들이 행렬을 가로막았습니다.',
            icon: isShip ? '🏴‍☠️' : isAir ? '🦅' : isPortal ? '🌀' : '⚔️',
            choices: [
                {
                    id: 'fight',
                    label: '정면 돌파 (전투)',
                    hint: '적들을 물리치고 전리품과 경험치를 획득합니다.',
                    triggerBattle: true,
                    resultText: '전투 태세를 갖추고 적들과 교전을 시작합니다!'
                },
                {
                    id: 'bribe',
                    label: `우회 / 통행료 지불 (-${goldCost.toLocaleString()}G)`,
                    hint: '골드를 소모해 교전을 피하고 안전하게 이동합니다.',
                    goldDelta: -goldCost,
                    minutesDelta: 15,
                    resultText: `${goldCost.toLocaleString()}G를 지불하고 우회 항로를 통해 무사히 빠져나왔습니다.`
                },
                {
                    id: 'evade',
                    label: '전속력 회피 기동',
                    hint: '시간을 조금 더 쓰지만 HP 8% 소모 위험으로 돌파합니다.',
                    hpPctDelta: -8,
                    minutesDelta: 25,
                    resultText: '급가속으로 적의 포위를 뚫고 여정을 이어갔습니다. (체력 소폭 소모)'
                }
            ]
        };
    }

    // 2. 야외 상단 / 하늘 상인 조우
    if (roll < ambushChancePct + 32) {
        const discountCost = Math.max(200, Math.round(lvl * 30));
        return {
            id: `merchant_${Date.now()}`,
            kind: 'merchant',
            title: transport === 'airship' ? '하늘 상단 순회선' : transport === 'ship' ? '해상 무역상단' : '여로의 행상인 마차',
            description: `${destination.city} 방면으로 향하던 상단과 마주쳤습니다. 여행자를 위한 특가 보급품을 내놓습니다.`,
            icon: '🛒',
            choices: [
                {
                    id: 'supply',
                    label: `특제 비약 보급 (-${discountCost.toLocaleString()}G)`,
                    hint: 'HP +35% · MP +35% 회복 및 경험치 소량 획득',
                    goldDelta: -discountCost,
                    hpPctDelta: 35,
                    mpPctDelta: 35,
                    expDelta: Math.round(expReward * 0.6),
                    resultText: '상단의 특제 비약으로 피로를 말끔히 회복하고 여정 노하우를 들었습니다!'
                },
                {
                    id: 'info',
                    label: '지역 정세 및 지름길 정보 교환',
                    hint: '비용 없이 경험치 획득 및 이동 시간 15분 단축',
                    expDelta: expReward,
                    minutesDelta: -15,
                    resultText: '행상인에게 지름길 정보를 얻어 더 빠르게 목적지로 향합니다!'
                }
            ]
        };
    }

    // 3. 랜드마크 / 유적 / 표류물 발견
    if (roll < ambushChancePct + 64) {
        const treasureGold = Math.max(300, Math.round(lvl * 45));
        return {
            id: `landmark_${Date.now()}`,
            kind: 'landmark',
            title: transport === 'ship' ? '표류 보물 상자 발견' : transport === 'airship' ? '고대 부유석 섬 통과' : '잊혀진 고대 비석 발견',
            description: '이동 경로 옆에서 신비한 빛을 뿜는 고대의 흔적이 포착되었습니다.',
            icon: '🗿',
            choices: [
                {
                    id: 'explore',
                    label: '잠시 멈춰 유적 조사',
                    hint: `골드 +${treasureGold.toLocaleString()}G · EXP +${expReward} (시간 +20분)`,
                    goldDelta: treasureGold,
                    expDelta: expReward,
                    minutesDelta: 20,
                    resultText: `유적에서 고대 주화 ${treasureGold.toLocaleString()}G와 귀중한 지식을 얻었습니다!`
                },
                {
                    id: 'pray',
                    label: '마력 공명만 흡수하고 통과',
                    hint: 'MP +25% 회복 · 시간 지연 없음',
                    mpPctDelta: 25,
                    resultText: '고대 비석의 맑은 마력을 흡수하며 지체 없이 여정을 계속했습니다.'
                }
            ]
        };
    }

    // 4. 순풍 / 기상 이변
    return {
        id: `weather_${Date.now()}`,
        kind: 'weather',
        title: transport === 'airship' || transport === 'ship' ? '기분 좋은 순풍!' : '쾌적한 가도 & 순조로운 여정',
        description: `${destination.city}로 향하는 길이 맑게 개어 예상보다 훨씬 순조롭게 나아갑니다.`,
        icon: '🌤️',
        choices: [
            {
                id: 'dash',
                label: '속도를 올려 지름길 주파',
                hint: '이동 시간 20분 단축 · 경험치 소량 획득',
                minutesDelta: -20,
                expDelta: Math.round(expReward * 0.5),
                resultText: '순풍을 타고 속도를 높여 예정보다 빠르게 목적지에 접근했습니다!'
            },
            {
                id: 'rest',
                label: '여유롭게 경치를 감상하며 휴식',
                hint: 'HP +20% · MP +20% 회복',
                hpPctDelta: 20,
                mpPctDelta: 20,
                resultText: '여유로운 휴식 덕분에 컨디션이 한층 좋아졌습니다.'
            }
        ]
    };
}
