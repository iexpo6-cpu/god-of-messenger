import { Character, DivineDiplomacyStatus, ChoiceEvent, JobType, DiplomaticStatus } from '../types';
import { generateWarEnemies } from '../warbattlesystem';
import { NATION_RELICS } from '../nationLoreData';
import { TEMPLE_MESSENGER_MAP } from '../constants';
import { triggerTempleDefense } from '../templedefensesystem';
import { generateRemnantKnights, generateDivineWarEnemies } from '../divineWarSystem';
import { isMessengerJob } from '../messengerofgodvisual';

/**
 * 신의 사자로서 혹은 신 처단자로서 발생하는 특수 이벤트 시뮬레이션
 */
export const processDivineDailyEvents = (currentRef: Character, allLogs: string[]) => {
    // [NEW] 플레이어가 신의 사자가 아니거나 신 처단 상태가 아니면 이벤트 발생 방지
    const isMessenger = isMessengerJob(currentRef.job);
    const isGodDefeated = currentRef.isGodDefeated || false;

    if (!isMessenger && !isGodDefeated) return;
    
    // 이미 처리 대기 중인 이벤트가 있으면 중복 발생 방지
    if (currentRef.pendingChoiceEvent || currentRef.pendingDefenseEvent) return;

    const roll = Math.random(); 

    // --- CASE A: 신 처단 이후 (The God Slayer Era) ---
    if (isGodDefeated) {
        // 1. 천상의 잔당: 광신도 기사단 습격 (The Purge) (1% -> 3%)
        if (roll < 0.03) {
            const targetCity = currentRef.currentLocation?.city || "신의 거처";
            const enemies = generateRemnantKnights(currentRef.level);
            
            currentRef.pendingDefenseEvent = {
                enemies: enemies,
                source: "구(舊) 신성 잔당",
                targetCity: targetCity,
                targetNation: "신계",
                log: `[긴급: 찬탈자 토벌] 죽은 신을 추종하는 광신도 기사단이 당신을 '신의 살해자'라 부르며 성전을 습격했습니다!`
            };
            allLogs.push(`[비상] 신계의 잔당들이 성전의 문을 부수고 진입하고 있습니다!`);
            return;
        }

        // 2. 새로운 신앙의 탄생 (Cult of the Slayer) (0.8% -> 2.5%)
        if (currentRef.templeDiplomacy) {
            const maxInfluenceNations = Object.entries(currentRef.templeDiplomacy)
                .filter(([_, rel]) => rel.influence >= 100);

            if (maxInfluenceNations.length > 0 && roll < 0.025) {
                const [nationName] = maxInfluenceNations[Math.floor(Math.random() * maxInfluenceNations.length)];
                currentRef.pendingChoiceEvent = {
                    id: `slayer_cult_${nationName}_${Date.now()}`,
                    title: `새로운 신앙: 도살자의 찬가 (${nationName})`,
                    description: `${nationName}의 백성들이 죽은 신이 아닌, 신을 죽이고 스스로 정점에 오른 당신을 새로운 '유일신'으로 받들기 시작했습니다. 그들은 당신의 악행조차 성스러운 업적으로 칭송하며 광신적인 충성을 보입니다.`,
                    options: [
                        {
                            text: "피의 신앙을 수락한다 (악명 500 소모)",
                            action: "divine_slayer_cult_blood",
                            outcome: "당신을 향한 광신도들이 과거의 죄업(악명)을 신앙의 증거로 세탁했습니다. 거대한 피의 제단이 세워집니다.",
                            callbackId: nationName
                        },
                        {
                            text: "공포의 군주로 군림한다 (전 스탯 +50)",
                            action: "divine_slayer_cult_power",
                            outcome: "공포를 통한 절대적인 지배력을 확립했습니다. 당신의 육신이 백성들의 경외심을 흡수하여 더욱 강해집니다.",
                            callbackId: nationName
                        }
                    ]
                };
                allLogs.push(`[소식] ${nationName}에서 당신을 숭배하는 새로운 종교가 국교로 채택되었습니다.`);
                return;
            }
        }
    }

    // --- CASE B: 일반 신성 이벤트 (God Exists) ---
    // 3. 신성 교리 논쟁 (Theological Dispute) - 타 성전 사자와의 갈등 (0.7% -> 2.5%)
    if (!isGodDefeated && roll < 0.025) {
        const allMessengerJobs = Object.values(TEMPLE_MESSENGER_MAP);
        const playerMessengerJob = currentRef.job;
        const currentGroupJobs = [playerMessengerJob, ...currentRef.companions.map(c => c.job)];
        
        const rivalTemples = Object.keys(TEMPLE_MESSENGER_MAP).filter(city => {
            const job = TEMPLE_MESSENGER_MAP[city];
            const rel = currentRef.divineRelations?.temples?.[city];
            return !currentGroupJobs.includes(job) && rel?.status !== '동맹';
        });

        if (rivalTemples.length > 0) {
            const targetTemple = rivalTemples[Math.floor(Math.random() * rivalTemples.length)];
            currentRef.pendingChoiceEvent = {
                id: `divine_dispute_${targetTemple}_${Date.now()}`,
                title: `신성 교리 논쟁: ${targetTemple}`,
                description: `${targetTemple}의 사자가 당신에게 전갈을 보내왔습니다. "그대의 교리는 신의 참뜻을 왜곡하고 있다. 태초의 진리가 무엇인지 입증하지 못한다면, 그대의 성전을 이단으로 규정하겠다."`,
                options: [
                    {
                        text: "지혜로 압도한다 (WIS 기반 체크)",
                        action: "divine_dispute_logic",
                        outcome: "당신의 깊은 통찰력 앞에 상대 사자는 고개를 숙였습니다. 두 성전 사이에 깊은 유대가 형성되었습니다.",
                        callbackId: targetTemple
                    },
                    {
                        text: "무력으로 입을 막는다 (전투)",
                        action: "divine_dispute_battle",
                        outcome: "신학적인 말장난은 필요 없습니다. 즉시 군대를 소집하여 상대 성전의 콧대를 꺾어버리기로 했습니다.",
                        callbackId: targetTemple
                    }
                ]
            };
            allLogs.push(`[경보] ${targetTemple}에서 당신의 권능에 도전하는 신학적 비난을 쏟아내고 있습니다.`);
            return;
        }
    }

    const blessedNations = currentRef.templeDiplomacy ? Object.entries(currentRef.templeDiplomacy)
        .filter(([_, rel]) => rel.status === DivineDiplomacyStatus.BLESSED) : [];

    if (blessedNations.length === 0) return;

    // 무작위 비호 국가 하나 선택
    const [nationName, rel] = blessedNations[Math.floor(Math.random() * blessedNations.length)];

    // 4. 성역의 축제: "사자의 날" (Sacred Festival) (0.5% -> 2.5%)
    if (rel.faithPoints >= 500 && roll < 0.025) {
        const event: ChoiceEvent = {
            id: `sacred_festival_${nationName}_${Date.now()}`,
            title: `성역의 축제: 사자의 날 (${nationName})`,
            description: `${nationName}의 백성들이 사자님의 은혜에 감사하며 대규모 축제를 개최했습니다. 수도 광장에 거대한 석상이 세워지고 온 나라에 꽃향기가 진동합니다. 국왕이 당신을 공식 연회에 초대했습니다.`,
            options: [
                {
                    text: "축복을 내린다 (신앙심 5,000 소모)",
                    action: "divine_bless_festival",
                    outcome: "대량의 신앙심을 쏟아부어 국가의 대지를 축복했습니다. 보답으로 국왕이 보관 중이던 성물을 기증했습니다.",
                    callbackId: nationName
                },
                {
                    text: "강림하여 무력을 과시한다",
                    action: "divine_show_power",
                    outcome: "결투장에서 시범 경기를 보이며 압도적인 힘을 증명했습니다. 성전의 위엄이 폭등하지만 백성들이 경외심 섞인 두려움을 느낍니다.",
                    callbackId: nationName
                },
                {
                    text: "익명으로 축제를 즐긴다",
                    action: "divine_anonymous_fun",
                    outcome: "가면을 쓰고 동료들과 함께 축제 거리를 거닐며 즐거운 시간을 보냈습니다. 일행과의 유대가 깊어집니다.",
                    callbackId: nationName
                }
            ]
        };
        currentRef.pendingChoiceEvent = event;
        allLogs.push(`[성전 소식] ${nationName}에서 사자님을 찬양하는 '사자의 날' 축제가 열렸습니다.`);
        return;
    }

    // 5. 외교적 딜레마: "피의 비호" (Diplomatic Protection) (0.8% -> 3.0%)
    const isAtWar = Object.values(currentRef.militaryData?.diplomacy || {}).some(r => r.status === DiplomaticStatus.WAR);
    if (isAtWar && roll < 0.03) {
        const warNation = Object.keys(currentRef.militaryData!.diplomacy!).find(n => currentRef.militaryData!.diplomacy![n].status === DiplomaticStatus.WAR);
        if (warNation) {
            const event: ChoiceEvent = {
                id: `divine_diplomatic_dilemma_${nationName}_${Date.now()}`,
                title: `피의 비호: ${nationName}의 위기`,
                description: `적국 ${warNation}이 "${nationName}에 내린 사자의 비호는 허상일 뿐"이라며 대규모 군대를 파견했습니다. ${nationName}의 사절이 성전으로 달려와 눈물로 도움을 요청합니다. 어떻게 하시겠습니까?`,
                options: [
                    {
                        text: "성전군을 전면 파견한다 (전투)",
                        action: "divine_send_army",
                        outcome: "성전에 머물던 대원들을 즉각 출동시켰습니다. 성스러운 전쟁이 시작됩니다!",
                        callbackId: JSON.stringify({ nation: nationName, enemy: warNation })
                    },
                    {
                        text: "적국 지도자에게 신벌을 경고한다",
                        action: "divine_warn_leader",
                        outcome: "사자의 위엄을 담은 서신을 보내 신벌을 경고했습니다. 상대가 당신의 위압감에 굴복할지 지켜봐야 합니다.",
                        callbackId: JSON.stringify({ nation: nationName, enemy: warNation })
                    },
                    {
                        text: "비호를 철회하고 방관한다",
                        action: "divine_withdraw_protection",
                        outcome: "실리적인 이유로 국가를 버렸습니다. 악명이 오르고 해당 국가의 백성들은 당신을 증오하게 됩니다.",
                        callbackId: nationName
                    }
                ]
            };
            currentRef.pendingChoiceEvent = event;
            allLogs.push(`[긴급] 비호 국가 ${nationName}이(가) 적군의 침공 위협에 노출되었습니다.`);
            return;
        }
    }

    // 6. 성스러운 순례 (Divine Pilgrimage) (0.6% -> 2.5%)
    if (rel.influence >= 70 && roll < 0.025) {
        const event: ChoiceEvent = {
            id: `divine_pilgrimage_${nationName}_${Date.now()}`,
            title: `대규모 성지 순례 (${nationName})`,
            description: `사자님의 영향력이 극에 달한 ${nationName}에서 수만 명의 순례객이 성전으로 몰려오고 있습니다. 이들을 어떻게 맞이하시겠습니까?`,
            options: [
                {
                    text: "직접 교리를 설파한다",
                    action: "divine_preach",
                    outcome: "직접 광장에 나서 진리를 설파했습니다. 수많은 이들이 감화되어 신앙심이 폭발적으로 상승합니다.",
                    callbackId: nationName
                },
                {
                    text: "대규모 구휼 활동을 펼친다 (10만 G 소모)",
                    action: "divine_charity",
                    outcome: "성전의 자금을 풀어 가난한 자들을 구제했습니다. 성전의 위엄도가 크게 상승합니다.",
                    callbackId: nationName
                }
            ]
        };
        currentRef.pendingChoiceEvent = event;
        allLogs.push(`[성전] ${nationName}에서 사자님을 뵙기 위한 순례 행렬이 끝없이 이어집니다.`);
        return;
    }

    // 7. 이단의 침투 (Religious Heresy) (0.7% -> 2.5%)
    if (rel.tension >= 40 && roll < 0.025) {
        const event: ChoiceEvent = {
            id: `divine_heresy_${nationName}_${Date.now()}`,
            title: `이단의 그림자: ${nationName}`,
            description: `성전의 영향력이 미치지 않는 음지에서 사자님의 권능을 부정하는 이단 세력이 포교를 시작했습니다. 백성들의 신앙이 흔들리고 있습니다.`,
            options: [
                {
                    text: "무자비한 이단 심판 (숙청)",
                    action: "divine_purge",
                    outcome: "이단자들을 색출하여 엄벌에 처했습니다. 신앙심을 회복했지만 공포 정치가 시작되었습니다.",
                    callbackId: nationName
                },
                {
                    text: "자비로운 재교육 (10일 소요)",
                    action: "divine_reeducate",
                    outcome: "시간을 들여 그들을 설득하고 올바른 길로 인도했습니다. 국가 내 영향력이 더욱 공고해집니다.",
                    callbackId: nationName
                }
            ]
        };
        currentRef.pendingChoiceEvent = event;
        allLogs.push(`[경보] ${nationName} 내부에 불온한 이단의 기운이 감지되었습니다.`);
    }
};
