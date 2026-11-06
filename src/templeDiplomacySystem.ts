
import { DivineDiplomacyStatus, DivineRelation, Character } from './types';
import { NATION_LIST, NATION_BLOCS, NationBloc } from './nationalDiplomacy';

/**
 * 성전 전용 초기 외교 데이터 생성
 */
export const generateInitialTempleDiplomacy = (myNation: string): Record<string, DivineRelation> => {
    const diplomacy: Record<string, DivineRelation> = {};
    const myBloc = NATION_BLOCS[myNation] || NationBloc.NEUTRAL;

    NATION_LIST.forEach(nation => {
        if (nation === myNation) return;

        const targetBloc = NATION_BLOCS[nation] || NationBloc.NEUTRAL;
        let status = DivineDiplomacyStatus.NEUTRAL;
        let faithPoints = 50; // 초기 포교 상태 수치

        // 진영별 초기 신성 관계 설정
        if (myBloc === targetBloc && myBloc !== NationBloc.NEUTRAL) {
            status = DivineDiplomacyStatus.NEUTRAL;
            faithPoints = 150; // 같은 진영이면 포교가 더 쉬움
        } else if (targetBloc === NationBloc.IMPERIAL) {
            status = DivineDiplomacyStatus.CORRUPTED;
            faithPoints = 0;
        }

        // [FIX] Add missing required 'tension' property
        diplomacy[nation] = {
            status,
            faithPoints,
            influence: 10,
            tributeLevel: 0,
            tension: 0
        };
    });

    return diplomacy;
};

/**
 * 성전 외교 상태에 따른 자원 보너스 계산
 */
export const calculateDivineTribute = (relation: DivineRelation, playerLevel: number) => {
    if (relation.status === DivineDiplomacyStatus.SUBJUGATED) {
        return {
            faith: 20 + relation.tributeLevel * 10,
            gold: playerLevel * 500 * (relation.tributeLevel + 1),
            manaCrystal: relation.tributeLevel
        };
    }
    if (relation.status === DivineDiplomacyStatus.BLESSED) {
        return {
            faith: 50,
            gold: 0,
            manaCrystal: 0
        };
    }
    return { faith: 0, gold: 0, manaCrystal: 0 };
};
