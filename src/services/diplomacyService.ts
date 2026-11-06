
import { Character, MilitaryData, NationRelation, DiplomaticStatus, DivineDiplomacyStatus } from '../types';
import { NATION_LIST, NATION_BLOCS, NationBloc } from '../nationalDiplomacy';
import { checkVassalTransition, applyTaxInterest } from '../vassalsystem';
import { getYear, addDays } from '../utils';

/**
 * 외교 친선 예물 요구 사양
 */
export const DIPLOMACY_GIFT_COST = {
    gold: 50000,
    wood: 100,
    iron: 100,
    manaCrystal: 20
};

/**
 * 시간 경과에 따른 국가 외교 상황 업데이트
 */
export const updateNationalDiplomacy = (character: Character, days: number): { updatedChar: Character, events: string[] } => {
    const newChar = { ...character };
    const events: string[] = [];
    const currentYear = getYear(newChar.currentDate || '2000-01-01');
    const today = newChar.currentDate || '2000-01-01';

    // 1. 일반 군사 외교 데이터 업데이트
    if (newChar.militaryData?.diplomacy) {
        const diplomacy = { ...newChar.militaryData.diplomacy };
        let anyMilitaryChanged = false;

        Object.keys(diplomacy).forEach(nation => {
            let rel = { ...diplomacy[nation] };
            
            // 속국 상태 전이 체크
            rel = checkVassalTransition(rel, newChar.currentDate);

            // [MODIFIED] 일반 속국/종주국 관계 만료 체크 강화 (날짜 점프 대응)
            const isVassalStatus = (rel.status === DiplomaticStatus.VASSAL_OWNER || rel.status === DiplomaticStatus.VASSAL_SUBJECT);
            if (isVassalStatus) {
                // 데이터 보정: 시작일은 있는데 종료일이 없는 경우 강제 생성 (5년 기준)
                if (rel.vassalStartDate && !rel.vassalEndDate) {
                    rel.vassalEndDate = addDays(rel.vassalStartDate, 1825);
                }

                // 만료 조건: 종료 날짜가 존재하고 오늘이 그날이거나 지났을 때, 혹은 남은 연수가 0 이하일 때
                const isExpiredByDate = rel.vassalEndDate && today >= rel.vassalEndDate;
                const isExpiredByYears = rel.vassalYearsRemaining !== undefined && rel.vassalYearsRemaining <= 0;

                if (isExpiredByDate || isExpiredByYears) {
                    const oldStatus = rel.status;
                    rel.status = DiplomaticStatus.NEUTRAL;
                    rel.vassalStartDate = undefined;
                    rel.vassalEndDate = undefined;
                    rel.vassalYearsRemaining = undefined;
                    rel.occupation = 0;
                    rel.tension = 50;
                    rel.vassalDebt = undefined;
                    rel.lastVassalInteractionYear = undefined;
                    
                    anyMilitaryChanged = true;
                    if (oldStatus === DiplomaticStatus.VASSAL_OWNER) {
                        events.push(`[국방 보고] ${nation}과의 지배 조약 기간이 만료되었습니다. 해당 국가가 주권을 회복했습니다.`);
                    } else {
                        events.push(`[국방 보고] ${nation}과의 속국 계약 기간이 종료되었습니다! 조국이 자유를 되찾았습니다.`);
                    }
                } else if (rel.vassalStartDate) {
                    // 잔여 연수 실시간 업데이트 (연도 차이 기반)
                    const startYear = parseInt(rel.vassalStartDate.split('-')[0]);
                    rel.vassalYearsRemaining = Math.max(0, 5 - (currentYear - startYear));
                }
            }
            
            diplomacy[nation] = rel;
        });

        // 일반 외교 돌발 이벤트 발생
        const eventChance = Math.min(0.01, days * 0.01);
        if (Math.random() < eventChance && days > 0) {
            const targetNations = Object.keys(diplomacy).filter(n => 
                diplomacy[n].status !== DiplomaticStatus.VASSAL_OWNER && 
                diplomacy[n].status !== DiplomaticStatus.VASSAL_SUBJECT &&
                diplomacy[n].status !== DiplomaticStatus.ALLIANCE
            );
            
            if (targetNations.length > 0) {
                const targetNation = targetNations[Math.floor(Math.random() * targetNations.length)];
                const relation = { ...diplomacy[targetNation] };

                const roll = Math.random();
                let change = 0;
                let eventMsg = "";

                if (roll < 0.4) {
                    change = Math.floor(Math.random() * 15) + 5;
                    const reasons = ["국경 인근에서의 무력 도발", "통상 조약 파기 선언", "스파이 혐의자 검거", "영토 영유권 주장"];
                    eventMsg = `[국방 정보] ${targetNation}와의 관계 악화: ${reasons[Math.floor(Math.random() * reasons.length)]}`;
                } else if (roll < 0.8) {
                    change = -(Math.floor(Math.random() * 10) + 5);
                    const reasons = ["인도적 구호 물자 전달", "친선 대사 방문", "공동 마물 토벌 작전 성공", "비밀 평화 회담 개최"];
                    eventMsg = `[국방 정보] ${targetNation}와의 긴장 완화: ${reasons[Math.floor(Math.random() * reasons.length)]}`;
                } else {
                    if (relation.tension >= 90 && relation.status !== DiplomaticStatus.WAR) {
                        relation.status = DiplomaticStatus.WAR;
                        relation.tension = 100;
                        eventMsg = `[전보: EMERGENCY] 국왕의 명령입니다. ${targetNation}에 대한 선전포고가 승인되었습니다. 전군 발령!`;
                    } else if (relation.status === DiplomaticStatus.WAR && relation.tension <= 50) {
                        relation.status = DiplomaticStatus.NEUTRAL;
                        eventMsg = `[전보] ${targetNation}와 정전 협정이 체결되었습니다. 긴급 대치 상태를 해제합니다.`;
                    }
                }

                if (eventMsg) {
                    relation.tension = Math.max(0, Math.min(100, relation.tension + change));
                    if (relation.status !== DiplomaticStatus.WAR && relation.status !== DiplomaticStatus.ALLIANCE) {
                        if (relation.tension >= 80) relation.status = DiplomaticStatus.HOSTILE;
                        else if (relation.tension <= 30) relation.status = DiplomaticStatus.NEUTRAL;
                    }
                    relation.lastEvent = eventMsg;
                    diplomacy[targetNation] = relation;
                    events.push(eventMsg);
                    anyMilitaryChanged = true;
                }
            }
        }
        if (anyMilitaryChanged) {
            newChar.militaryData!.diplomacy = diplomacy;
        }
    }

    // 2. 성전 전용 외교 데이터(templeDiplomacy) 만료 체크
    if (newChar.templeDiplomacy) {
        const templeDiplomacy = { ...newChar.templeDiplomacy };
        let anyTempleChanged = false;

        Object.keys(templeDiplomacy).forEach(nation => {
            const rel = { ...templeDiplomacy[nation] };
            
            // [MODIFIED] 비호(BLESSED) 상태 만료 체크 강화
            if (rel.status === DivineDiplomacyStatus.BLESSED) {
                if (rel.protectionStartDate && !rel.protectionEndDate) {
                    rel.protectionEndDate = addDays(rel.protectionStartDate, 1825);
                }

                const isExpiredDate = rel.protectionEndDate && today >= rel.protectionEndDate;
                const isExpiredYears = rel.protectionYears !== undefined && rel.protectionYears <= 0;

                if (isExpiredDate || isExpiredYears) {
                    rel.status = DivineDiplomacyStatus.NEUTRAL;
                    rel.protectionStartDate = undefined;
                    rel.protectionEndDate = undefined;
                    rel.protectionYears = undefined;
                    rel.lastInteractionYear = undefined;
                    templeDiplomacy[nation] = rel;
                    anyTempleChanged = true;
                    events.push(`[신성 보고] ${nation}에 대한 사자의 비호 기간이 종료되었습니다. 관계가 중립으로 돌아갔습니다.`);
                } else if (rel.protectionStartDate) {
                    const startYear = parseInt(rel.protectionStartDate.split('-')[0]);
                    rel.protectionYears = Math.max(0, 5 - (currentYear - startYear));
                    templeDiplomacy[nation] = rel;
                }
            }

            // [MODIFIED] 굴복(SUBJUGATED) 상태 만료 체크 강화
            if (rel.status === DivineDiplomacyStatus.SUBJUGATED) {
                if (rel.subjugatedStartDate && !rel.subjugatedEndDate) {
                    rel.subjugatedEndDate = addDays(rel.subjugatedStartDate, 1825);
                }

                const isExpiredDate = rel.subjugatedEndDate && today >= rel.subjugatedEndDate;
                const isExpiredYears = rel.subjugatedYears !== undefined && rel.subjugatedYears <= 0;

                if (isExpiredDate || isExpiredYears) {
                    rel.status = DivineDiplomacyStatus.NEUTRAL;
                    rel.subjugatedStartDate = undefined;
                    rel.subjugatedEndDate = undefined;
                    rel.subjugatedYears = undefined;
                    rel.tributeLevel = 0;
                    rel.lastInteractionYear = undefined;
                    templeDiplomacy[nation] = rel;
                    anyTempleChanged = true;
                    events.push(`[신성 보고] ${nation}의 성역 굴복 기간이 만료되어 자유를 되찾았습니다.`);
                } else if (rel.subjugatedStartDate) {
                    const startYear = parseInt(rel.subjugatedStartDate.split('-')[0]);
                    rel.subjugatedYears = Math.max(0, 5 - (currentYear - startYear));
                    templeDiplomacy[nation] = rel;
                }
            }
        });

        if (anyTempleChanged) {
            newChar.templeDiplomacy = templeDiplomacy;
        }
    }

    return { updatedChar: newChar, events };
};

/**
 * 지휘관 권한: 특정 국가에 대한 외교적 긴장 완화 시도
 */
export const attemptDeescalation = (character: Character, targetNation: string): { success: boolean, log: string, cost: typeof DIPLOMACY_GIFT_COST } => {
    const mData = character.militaryData;
    if (!mData || !mData.diplomacy) return { success: false, log: "외교 데이터가 없습니다.", cost: DIPLOMACY_GIFT_COST };
    
    const relation = mData.diplomacy[targetNation];
    if (!relation) return { success: false, log: "대상 국가 정보가 없습니다.", cost: DIPLOMACY_GIFT_COST };
    
    if (relation.status === DiplomaticStatus.WAR) return { success: false, log: "전쟁 중인 국가에는 외교 채널이 닫혀 있습니다.", cost: DIPLOMACY_GIFT_COST };

    const res = character.base?.resources;
    if (character.money < DIPLOMACY_GIFT_COST.gold || !res || res.wood < DIPLOMACY_GIFT_COST.wood || res.iron < DIPLOMACY_GIFT_COST.iron || res.manaCrystal < DIPLOMACY_GIFT_COST.manaCrystal) {
        return { success: false, log: "친선 예물을 마련할 자원이 부족합니다.", cost: DIPLOMACY_GIFT_COST };
    }

    const successRate = (character.stats.wis + character.stats.ctrl) * 0.1 + 40;
    const roll = Math.random() * 100;
    
    if (roll < successRate) {
        const reduction = Math.floor(Math.random() * 20) + 15;
        return { success: true, log: `${targetNation}에 친선 예물을 전달하여 외교적 성과를 거두었습니다. (긴장도 -${reduction})`, cost: DIPLOMACY_GIFT_COST };
    } else {
        return { success: false, log: `${targetNation} 측에서 우리의 예물을 받고도 미온적인 태도를 보였습니다.`, cost: DIPLOMACY_GIFT_COST };
    }
};
