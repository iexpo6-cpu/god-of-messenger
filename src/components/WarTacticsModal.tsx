import React, { useState, useMemo, useRef } from 'react';
import { 
    Character, Companion, Enemy, Skill, Stats, DiplomaticStatus, 
    MilitaryRank, SkillType, ClassTier, JobType, CombatState, ActiveStatus 
} from '../types';
import { generateWarEnemies } from '../warbattlesystem';
import { generateNationalLeader } from '../warleadersystem';
import { calculateTotalStats, calculateFinalStats, calculateDamage, generateProceduralEnemy, getEntityAllCombatSkills } from '../utils';
import { MILITARY_RANK_ORDER } from '../constants';
import * as CombatUtils from '../services/combatUtils';
import { CombatShieldService } from '../services/combatShieldService';
import CombatInterface from './CombatInterface';
import { 
    Sword, Shield, Users, Flag, Flame, Skull, Crosshair, ChevronRight, 
    Heart, Sparkles, AlertTriangle, ArrowUp, Zap, Crown, UserPlus, 
    Minimize2, Maximize2, ShieldAlert, Award, Move, Play, RefreshCw, X, ArrowRight, CheckCircle2
} from 'lucide-react';

interface WarTacticsModalProps {
    isOpen: boolean;
    mode: 'invasion' | 'defense'; // 침략(공세) vs 방어
    targetNation: string;
    character: Character;
    onClose: () => void;
    onUpdateCharacter: (newChar: Character, logMsg?: string) => void;
    onVictory?: (occupationGain: number, isVassalized: boolean, prevOccupation: number, newOccupation: number, rankName: string) => void;
}

// 전술판 유닛 타입
export interface TacticalUnit {
    id: string;
    name: string;
    isPlayer: boolean;
    isCompanion: boolean;
    companionRef?: Companion;
    entityRef?: Character | Companion;
    level: number;
    hp: number;
    maxHp: number;
    mp: number;
    maxMp: number;
    atk: number;
    def: number;
    skills: Skill[];
    row: number;
    col: number;
    hasActed: boolean;
    pairUnit?: TacticalUnit; // 결합된 보조 유닛 (Pair-Up)
    visualUrl?: string;
    job?: string;
}

export interface TacticalEnemyUnit {
    id: string;
    enemy: Enemy;
    name: string;
    isBoss: boolean;
    level: number;
    hp: number;
    maxHp: number;
    atk: number;
    def: number;
    row: number;
    col: number;
    visualUrl?: string;
}

export const WarTacticsModal: React.FC<WarTacticsModalProps> = ({
    isOpen,
    mode,
    targetNation,
    character,
    onClose,
    onUpdateCharacter,
    onVictory
}) => {
    // 단계: 'setup' -> 'tactics' -> 'battle' -> 'result'
    const [phase, setPhase] = useState<'setup' | 'tactics' | 'battle' | 'result'>('setup');

    // 외교 점유율
    const currentOccupation = useMemo(() => {
        return character.militaryData?.diplomacy?.[targetNation]?.occupation || 0;
    }, [character, targetNation]);

    const isRaid = currentOccupation >= 100;

    // [동적 전장 크기]: 점유율이 높아질수록 전장의 크기가 넓어짐!
    const { numRows, numCols } = useMemo(() => {
        if (currentOccupation >= 80) return { numRows: 8, numCols: 7 }; // 수도 결전: 8x7 초대형
        if (currentOccupation >= 50) return { numRows: 7, numCols: 6 }; // 심층 전선: 7x6 대형
        if (currentOccupation >= 25) return { numRows: 6, numCols: 6 }; // 중부 전선: 6x6
        return { numRows: 6, numCols: 5 }; // 초기 전선: 6x5
    }, [currentOccupation]);

    // 계급별 정규 점유율 획득량 산출 함수 (useGame.ts의 전쟁 점유율 규정과 100% 동일)
    const calculateOccupationGain = (char: Character, isBoss: boolean): number => {
        if (isRaid) return 100; // 최종 수도 결전 승리 시 100%
        if (char.job === JobType.DEMON_GOD) return 15; // 마신: 15%
        if (char.job?.toString().includes('제너럴')) return 10; // 제너럴: 10%

        const rank = char.militaryRank || MilitaryRank.PVT;
        const rIdx = MILITARY_RANK_ORDER.indexOf(rank);

        let occGain = 1;
        if (rIdx >= MILITARY_RANK_ORDER.indexOf(MilitaryRank.BG)) {
            occGain = isBoss ? 10 : 5; // 장군(준장 이상): 보스 10%, 일반 5%
        } else if (rIdx >= MILITARY_RANK_ORDER.indexOf(MilitaryRank.MAJ)) {
            occGain = isBoss ? 5 : 4;  // 영관(소령 이상): 보스 5%, 일반 4%
        } else if (rIdx >= MILITARY_RANK_ORDER.indexOf(MilitaryRank.SLT)) {
            occGain = 3;  // 위관(소위 이상): 3%
        } else if (rIdx >= MILITARY_RANK_ORDER.indexOf(MilitaryRank.SSG)) {
            occGain = 2;  // 부사관(하사 이상): 2%
        } else {
            occGain = 1;  // 병사급: 1%
        }

        return occGain;
    };

    // 출진 가능한 전체 동료 풀
    const availableCompanions = useMemo(() => {
        const list: Companion[] = [];
        const seen = new Set<string>();

        (character.companions || []).forEach(c => {
            if (!c.isDead && !seen.has(c.id)) {
                seen.add(c.id);
                list.push(c);
            }
        });

        (character.inactiveCompanions || []).forEach(c => {
            if (!c.isDead && !seen.has(c.id)) {
                seen.add(c.id);
                list.push(c);
            }
        });

        return list;
    }, [character]);

    // 선택된 출진 동료 ID 목록 (최대 6명 소집 가능)
    const [selectedCompanionIds, setSelectedCompanionIds] = useState<string[]>(() => {
        return (character.companions || []).slice(0, 4).map(c => c.id);
    });

    // 전술판 배치 유닛 목록
    const [allies, setAllies] = useState<TacticalUnit[]>([]);
    const [enemies, setEnemies] = useState<TacticalEnemyUnit[]>([]);
    
    // 선택된 아군 유닛
    const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
    const [turnCount, setTurnCount] = useState<number>(1);
    const [turnOwner, setTurnOwner] = useState<'player' | 'enemy'>('player');

    // 현재 교전 상태
    const [activeCombat, setActiveCombat] = useState<{
        ally: TacticalUnit;
        enemy: TacticalEnemyUnit;
    } | null>(null);

    // CombatInterface 전용 로컬 상태 및 반응형 전투 참가 캐릭터 상태
    const [localCombatState, setLocalCombatState] = useState<CombatState | null>(null);
    const [combatPlayerState, setCombatPlayerState] = useState<Character>(() => JSON.parse(JSON.stringify(character)));
    const combatPlayerRef = useRef<Character>(combatPlayerState);
    const [isCombatLoading, setIsCombatLoading] = useState<boolean>(false);

    // 전술판 상단 최근 전과 토스트 배너
    const [tacticalBanner, setTacticalBanner] = useState<string | null>(null);

    // 전쟁 성과 및 결과
    const [warResult, setWarResult] = useState<{
        won: boolean;
        title: string;
        message: string;
        prevOccupation: number;
        newOccupation: number;
        occupationChange: number;
        rankName: string;
        isVassal: boolean;
    } | null>(null);

    // 2. 전쟁 시작 및 전술판 초기화
    const handleStartTactics = () => {
        const allyUnits: TacticalUnit[] = [];

        // 1) 플레이어 유닛 생성 (시작 위치: 최하단 행 중앙)
        const pFinal = calculateFinalStats(character).finalStats;
        const pMaxHp = pFinal.maxHp || character.stats?.maxHp || character.maxHp || 10000;
        const pCurHp = Math.min(pMaxHp, character.stats?.hp || character.hp || pMaxHp);
        const pMaxMp = pFinal.maxMp || character.stats?.maxMp || character.maxMp || 500;
        const pCurMp = Math.min(pMaxMp, character.stats?.mp || character.mp || pMaxMp);
        const pAtk = Math.max(100, Math.floor((pFinal.str || 20) * 2 + (pFinal.int || 20) * 2 + character.level * 10));
        const pDef = Math.max(50, Math.floor((pFinal.def || 20) * 1.5 + character.level * 5));

        const baseRow = numRows - 1;
        const centerCol = Math.floor(numCols / 2);

        allyUnits.push({
            id: 'player',
            name: character.name,
            isPlayer: true,
            isCompanion: false,
            companionRef: undefined,
            entityRef: character,
            level: character.level,
            hp: pCurHp,
            maxHp: pMaxHp,
            mp: pCurMp,
            maxMp: pMaxMp,
            atk: pAtk,
            def: pDef,
            skills: character.skills || [],
            row: baseRow,
            col: centerCol,
            hasActed: false,
            visualUrl: character.visualUrl,
            job: character.job
        });

        // 2) 소집된 동료 유닛 생성 (시작 위치: 최하단 및 그 윗줄 분산 배치)
        const startPositions: { row: number; col: number }[] = [];
        for (let r = baseRow; r >= baseRow - 1; r--) {
            for (let c = 0; c < numCols; c++) {
                if (r === baseRow && c === centerCol) continue; // 플레이어 자리 제외
                startPositions.push({ row: r, col: c });
            }
        }

        selectedCompanionIds.forEach((cId, idx) => {
            const comp = availableCompanions.find(c => c.id === cId);
            if (!comp) return;

            const cFinal = calculateFinalStats(comp).finalStats;
            const cMaxHp = cFinal.maxHp || comp.stats?.maxHp || comp.maxHp || 8000;
            const cCurHp = Math.min(cMaxHp, comp.stats?.hp || comp.hp || cMaxHp);
            const cMaxMp = cFinal.maxMp || comp.stats?.maxMp || comp.maxMp || 300;
            const cCurMp = Math.min(cMaxMp, comp.stats?.mp || comp.mp || cMaxMp);
            const cAtk = Math.max(80, Math.floor((cFinal.str || 15) * 2 + (cFinal.int || 15) * 2 + comp.level * 8));
            const cDef = Math.max(40, Math.floor((cFinal.def || 15) * 1.5 + comp.level * 4));
            const pos = startPositions[idx % startPositions.length];

            allyUnits.push({
                id: comp.id,
                name: comp.name,
                isPlayer: false,
                isCompanion: true,
                companionRef: comp,
                entityRef: comp,
                level: comp.level,
                hp: cCurHp,
                maxHp: cMaxHp,
                mp: cCurMp,
                maxMp: cMaxMp,
                atk: cAtk,
                def: cDef,
                skills: comp.skills || [],
                row: pos.row,
                col: pos.col,
                hasActed: false,
                visualUrl: comp.visualUrl,
                job: comp.job
            });
        });

        // 3) 적 유닛 생성: 점유율이 높을수록 적 부대 수도 대폭 증가!
        const rawEnemies = generateWarEnemies(targetNation, character.level, isRaid, currentOccupation);
        let enemyList = [...rawEnemies];
        if (isRaid && !enemyList.some(e => e.name.includes('[국가 지도자]'))) {
            enemyList.unshift(generateNationalLeader(targetNation, character.level));
        }

        // 점유율에 따른 적 부대 수 보충 (최대 10개 부대)
        const targetEnemyUnitCount = currentOccupation >= 80 ? 9 : currentOccupation >= 50 ? 7 : 5;
        while (enemyList.length < targetEnemyUnitCount) {
            const extraLevel = character.level + Math.floor(Math.random() * 20) - 5;
            const extraTitle = `${targetNation} [전선 증원 정예병]`;
            const extraEnemy = generateProceduralEnemy(extraLevel, extraTitle);
            enemyList.push(extraEnemy);
        }

        const enemyUnits: TacticalEnemyUnit[] = [];

        // 적장 (Row 0, Col 중앙)
        const bossEnemy = enemyList[0];
        const bTotal = calculateTotalStats(bossEnemy).total;
        enemyUnits.push({
            id: `enemy_boss`,
            enemy: bossEnemy,
            name: bossEnemy.name,
            isBoss: true,
            level: bossEnemy.level,
            hp: bossEnemy.hp,
            maxHp: bossEnemy.maxHp,
            atk: Math.max(100, Math.floor((bTotal.str || 50) * 2 + bossEnemy.level * 8)),
            def: Math.max(50, Math.floor((bTotal.def || 50) * 1.5 + bossEnemy.level * 4)),
            row: 0,
            col: centerCol,
            visualUrl: bossEnemy.visualUrl
        });

        // 호위대 및 전위대 적 배치
        const enemySlotPositions: { row: number; col: number }[] = [];
        for (let c = 0; c < numCols; c++) {
            if (c !== centerCol) enemySlotPositions.push({ row: 1, col: c });
        }
        for (let c = 0; c < numCols; c++) {
            enemySlotPositions.push({ row: 2, col: c });
        }
        if (numRows >= 7) {
            for (let c = 1; c < numCols - 1; c++) {
                enemySlotPositions.push({ row: 3, col: c });
            }
        }

        enemyList.slice(1).forEach((e, idx) => {
            const pos = enemySlotPositions[idx % enemySlotPositions.length];
            const eTotal = calculateTotalStats(e).total;
            enemyUnits.push({
                id: `enemy_${idx + 1}`,
                enemy: e,
                name: e.name,
                isBoss: false,
                level: e.level,
                hp: e.hp,
                maxHp: e.maxHp,
                atk: Math.max(80, Math.floor((eTotal.str || 30) * 1.8 + e.level * 6)),
                def: Math.max(40, Math.floor((eTotal.def || 30) * 1.3 + e.level * 3)),
                row: pos.row,
                col: pos.col,
                visualUrl: e.visualUrl
            });
        });

        setAllies(allyUnits);
        setEnemies(enemyUnits);
        setTurnCount(1);
        setTurnOwner('player');
        setSelectedUnitId(null);
        setTacticalBanner(null);
        setPhase('tactics');
    };

    // 3. 결합(Pair-Up) 로직: A가 B의 칸으로 겹쳐지며 결합!
    const handlePairUp = (mainUnitId: string, targetUnitId: string) => {
        if (mainUnitId === targetUnitId) return;

        setAllies(prev => {
            const mainUnit = prev.find(u => u.id === mainUnitId);
            const targetUnit = prev.find(u => u.id === targetUnitId);

            if (!mainUnit || !targetUnit) return prev;
            if (mainUnit.pairUnit || targetUnit.pairUnit) return prev;

            const combinedMain: TacticalUnit = {
                ...mainUnit,
                row: targetUnit.row,
                col: targetUnit.col,
                pairUnit: targetUnit,
                atk: mainUnit.atk + Math.floor(targetUnit.atk * 0.35),
                def: mainUnit.def + Math.floor(targetUnit.def * 0.35),
                hasActed: true,
            };

            return prev.filter(u => u.id !== targetUnitId).map(u => u.id === mainUnitId ? combinedMain : u);
        });

        setSelectedUnitId(null);
    };

    // 결합 분리(Split) 로직
    const handleSplit = (unitId: string) => {
        setAllies(prev => {
            const unit = prev.find(u => u.id === unitId);
            if (!unit || !unit.pairUnit) return prev;

            const subUnit = unit.pairUnit;
            const directions = [
                { r: 0, c: 1 }, { r: 0, c: -1 }, { r: 1, c: 0 }, { r: -1, c: 0 }
            ];

            let placeRow = unit.row;
            let placeCol = unit.col;

            for (const d of directions) {
                const nr = unit.row + d.r;
                const nc = unit.col + d.c;
                if (nr >= 0 && nr < numRows && nc >= 0 && nc < numCols) {
                    const isOccupied = prev.some(u => u.row === nr && u.col === nc) ||
                                       enemies.some(e => e.row === nr && e.col === nc);
                    if (!isOccupied) {
                        placeRow = nr;
                        placeCol = nc;
                        break;
                    }
                }
            }

            const uncoupledSub: TacticalUnit = {
                ...subUnit,
                row: placeRow,
                col: placeCol,
                hasActed: true
            };

            const restoredMain: TacticalUnit = {
                ...unit,
                atk: unit.atk - Math.floor(subUnit.atk * 0.35),
                def: unit.def - Math.floor(subUnit.def * 0.35),
                pairUnit: undefined,
                hasActed: true
            };

            return [...prev.filter(u => u.id !== unitId), restoredMain, uncoupledSub];
        });

        setSelectedUnitId(null);
    };

    // 4. 전술 이동 및 교전 발생 로직
    const handleMoveOrEngage = (targetRow: number, targetCol: number) => {
        if (!selectedUnitId || turnOwner !== 'player') return;

        const unit = allies.find(u => u.id === selectedUnitId);
        if (!unit || unit.hasActed) return;

        const dist = Math.abs(unit.row - targetRow) + Math.abs(unit.col - targetCol);
        if (dist > 1) {
            return;
        }

        // 1) 적이 있는 칸을 클릭한 경우 -> 정식 CombatInterface 교전 시작!
        const targetEnemy = enemies.find(e => e.row === targetRow && e.col === targetCol);
        if (targetEnemy) {
            startCombatEncounter(unit, targetEnemy);
            return;
        }

        // 2) 다른 아군이 있는 칸을 클릭한 경우 -> 겹치며 결합(Pair-up)!
        const targetAlly = allies.find(u => u.id !== unit.id && u.row === targetRow && u.col === targetCol);
        if (targetAlly) {
            handlePairUp(unit.id, targetAlly.id);
            return;
        }

        // 3) 빈 칸으로 이동
        setAllies(prev => prev.map(u => {
            if (u.id === unit.id) {
                return { ...u, row: targetRow, col: targetCol, hasActed: true };
            }
            return u;
        }));

        setSelectedUnitId(null);
    };

    // 5. 정식 CombatInterface 교전 개시! (점유율에 따라 4~6인 이상의 대형 적 분대 출현)
    const startCombatEncounter = (ally: TacticalUnit, enemy: TacticalEnemyUnit) => {
        setActiveCombat({ ally, enemy });

        const mainEnemy: Enemy = {
            ...enemy.enemy,
            id: `war_main_${enemy.id}`,
            hp: enemy.hp,
            maxHp: enemy.maxHp
        };

        // 점유율이 높을수록 적 분대원 수가 대폭 증가! (4명 ~ 6명)
        const squadCount = currentOccupation >= 80 ? 6
                         : currentOccupation >= 50 ? 5
                         : currentOccupation >= 25 ? 5
                         : (enemy.isBoss ? 5 : 4);

        const squadEnemies: Enemy[] = [mainEnemy];

        const minionTitles = enemy.isBoss
            ? ['적장 최측근 호위장교', '수도 근위 마도사', '결사 수호 방패병', '전선 정예 돌격병', '특무 암살 추격병']
            : ['전선 정예 돌격병', '전선 지원 저격수', '정예 방어 중보병', '전선 전투 의무병', '강습 창기병'];

        for (let i = 1; i < squadCount; i++) {
            const minionLevel = Math.max(10, enemy.level - 3 - i);
            const titleLabel = minionTitles[(i - 1) % minionTitles.length];
            // 중요: CombatEnemiesArea가 [정예] 등의 브래킷을 제거하므로 괄호 또는 공백 표기 사용 + 고유 번호(A, B, C...) 부여!
            const suffix = String.fromCharCode(64 + i); // A, B, C...
            const minion = generateProceduralEnemy(minionLevel, `${targetNation} ${titleLabel} ${suffix}`);
            minion.id = `war_minion_${enemy.id}_${i}`;
            minion.hp = Math.floor(minion.hp * 0.85);
            minion.maxHp = minion.hp;
            squadEnemies.push(minion);
        }

        // 전투에 투입할 캐릭터 및 동료 상태 구성 (stats.hp / stats.mp 완벽 동기화!)
        let initialFighter: Character;

        if (ally.isPlayer) {
            initialFighter = JSON.parse(JSON.stringify(character)) as Character;
            initialFighter.hp = ally.hp;
            initialFighter.maxHp = ally.maxHp;
            initialFighter.mp = ally.mp;
            initialFighter.maxMp = ally.maxMp;
            initialFighter.stats = {
                ...initialFighter.stats,
                hp: ally.hp,
                maxHp: ally.maxHp,
                mp: ally.mp,
                maxMp: ally.maxMp
            };

            if (ally.pairUnit && ally.pairUnit.companionRef) {
                const pairedComp = JSON.parse(JSON.stringify(ally.pairUnit.companionRef)) as Companion;
                pairedComp.hp = ally.pairUnit.hp;
                pairedComp.maxHp = ally.pairUnit.maxHp;
                pairedComp.mp = ally.pairUnit.mp;
                pairedComp.maxMp = ally.pairUnit.maxMp;
                pairedComp.stats = {
                    ...pairedComp.stats,
                    hp: ally.pairUnit.hp,
                    maxHp: ally.pairUnit.maxHp,
                    mp: ally.pairUnit.mp,
                    maxMp: ally.pairUnit.maxMp
                };
                pairedComp.battlePosition = pairedComp.battlePosition || { row: 1, col: 0 };
                initialFighter.companions = [pairedComp];
            } else {
                initialFighter.companions = [];
            }
        } else {
            // 동료 단독(또는 동료+동료 결합) 출전 시: 플레이어를 완전히 배제하고 해당 동료를 전투 주체로 세팅!
            const compRef = ally.companionRef || (ally.entityRef as Companion);
            const compClone = JSON.parse(JSON.stringify(compRef || character));
            const compFinal = calculateFinalStats(compClone).finalStats;

            initialFighter = {
                ...JSON.parse(JSON.stringify(character)),
                id: compClone.id || ally.id,
                name: compClone.name || ally.name,
                level: compClone.level || ally.level,
                job: compClone.job || '정예 부대원',
                gender: compClone.gender || character.gender,
                race: compClone.race || character.race,
                shinryokuType: compClone.shinryokuType || '무기강화계',
                classTier: compClone.classTier || ClassTier.SECOND,
                firstClassName: compClone.firstClassName || compClone.job,
                secondClassName: compClone.secondClassName,
                lastClassName: compClone.lastClassName,
                finalClassName: compClone.finalClassName,
                combatStyle: compClone.combatStyle,
                battleRole: compClone.battleRole,
                battlePosition: compClone.battlePosition || { row: 1, col: 1 },
                hp: ally.hp,
                maxHp: ally.maxHp,
                mp: ally.mp,
                maxMp: ally.maxMp,
                stats: {
                    ...(compClone.stats || compFinal),
                    hp: ally.hp,
                    maxHp: ally.maxHp,
                    mp: ally.mp,
                    maxMp: ally.maxMp
                },
                skills: compClone.skills && compClone.skills.length > 0 ? compClone.skills : ally.skills,
                skillShortcuts: compClone.skillShortcuts || [],
                equipment: compClone.equipment || character.equipment,
                visualUrl: compClone.visualUrl || ally.visualUrl,
                statusEffects: compClone.statusEffects || [],
                companions: []
            };

            // 만약 동료 유닛이 플레이어나 다른 동료와 결합되어 있다면 보조 유닛으로 함께 참전!
            if (ally.pairUnit) {
                if (ally.pairUnit.companionRef) {
                    const subComp = JSON.parse(JSON.stringify(ally.pairUnit.companionRef)) as Companion;
                    subComp.hp = ally.pairUnit.hp;
                    subComp.maxHp = ally.pairUnit.maxHp;
                    subComp.mp = ally.pairUnit.mp;
                    subComp.maxMp = ally.pairUnit.maxMp;
                    subComp.stats = {
                        ...subComp.stats,
                        hp: ally.pairUnit.hp,
                        maxHp: ally.pairUnit.maxHp,
                        mp: ally.pairUnit.mp,
                        maxMp: ally.pairUnit.maxMp
                    };
                    subComp.battlePosition = subComp.battlePosition || { row: 1, col: 0 };
                    initialFighter.companions = [subComp];
                } else if (ally.pairUnit.isPlayer) {
                    const playerAsSub: Companion = {
                        ...(JSON.parse(JSON.stringify(character)) as any),
                        id: 'player_sub',
                        name: character.name,
                        hp: ally.pairUnit.hp,
                        maxHp: ally.pairUnit.maxHp,
                        mp: ally.pairUnit.mp,
                        maxMp: ally.pairUnit.maxMp,
                        stats: {
                            ...character.stats,
                            hp: ally.pairUnit.hp,
                            maxHp: ally.pairUnit.maxHp,
                            mp: ally.pairUnit.mp,
                            maxMp: ally.pairUnit.maxMp
                        },
                        battlePosition: { row: 1, col: 0 }
                    };
                    initialFighter.companions = [playerAsSub];
                }
            }
        }

        combatPlayerRef.current = initialFighter;
        setCombatPlayerState(initialFighter);

        const initialCombatState: CombatState = {
            enemies: squadEnemies,
            turn: 1,
            log: [
                `[시스템] ⚔️ ${ally.name} 부대가 ${enemy.name}의 ${squadEnemies.length}인 방어 분대와 교전을 시작합니다!`
            ],
            isEnded: false,
            type: 'war_raid'
        };

        setLocalCombatState(initialCombatState);
        setPhase('battle');
    };

    // [정규 CombatInterface 100% 호환 전투 엔진 핸들러]:
    // - 모든 로그를 배열 끝에 추가([...prev.log, ...newLogs])하여 combatLogTracker.extractNewLines가 100% 동작!
    // - 정확한 [시스템: <이름> HP -<피해>] 포맷을 출력하여 플로팅 데미지 텍스트, 치명타, 회피, 회복, VFX 연출 100% 작동!
    // - combatPlayerState.stats.hp 및 companion.stats.hp를 불변(immutable) 갱신하여 체력바 슬라이딩 애니메이션이 실시간 작동!
    const handleCombatAction = (actionText: string, mpCost?: number) => {
        if (!localCombatState || !activeCombat || localCombatState.isEnded) return;

        const nextPlayer = JSON.parse(JSON.stringify(combatPlayerRef.current)) as Character;
        const nextEnemies = JSON.parse(JSON.stringify(localCombatState.enemies)) as Enemy[];
        const newLogs: string[] = [];

        const aliveEnemies = nextEnemies.filter(e => e.hp > 0);
        if (aliveEnemies.length === 0) return;

        // 1. 라운드 종료 처리
        if (actionText.includes('[라운드 종료]') || actionText.includes('[턴 종료]')) {
            newLogs.push(`[시스템] 라운드가 종료되었습니다.`);
            combatPlayerRef.current = nextPlayer;
            setCombatPlayerState(nextPlayer);
            setLocalCombatState(prev => prev ? {
                ...prev,
                turn: prev.turn + 1,
                enemies: nextEnemies,
                log: [...prev.log, ...newLogs]
            } : prev);
            return;
        }

        // 2. 적군 턴 행동 처리 ([적 행동: <이름>] ...)
        if (actionText.includes('[적 행동') || actionText.includes('[적 턴') || actionText.includes('[적군 행동')) {
            const enemyMatch = actionText.match(/\[적\s*(?:행동|턴|군 행동):\s*(.+?)\]/);
            const actingEnemyName = enemyMatch ? enemyMatch[1].trim() : '';
            const attackerEnemy = aliveEnemies.find(e => e.name === actingEnemyName || e.name.includes(actingEnemyName)) || aliveEnemies[0];

            if (attackerEnemy && attackerEnemy.hp > 0) {
                const skillMatch = actionText.match(/스킬:\s*(.+?)(?:\s*\(|$)/);
                const activeEnemySkills = (attackerEnemy.skills || []).filter(s => s.type !== SkillType.PASSIVE);
                let matchedSkill: Skill | undefined = undefined;

                if (skillMatch && activeEnemySkills.length > 0) {
                    const sName = skillMatch[1].trim();
                    matchedSkill = activeEnemySkills.find(s => s.name === sName || s.name.includes(sName));
                }

                // 타겟 아군 결정
                const targetMatch = actionText.match(/\(대상:\s*(.+?)\)/);
                const requestedTargetName = targetMatch ? targetMatch[1].trim() : '';

                const possibleAllies: { type: 'player' | 'companion'; entity: Character | Companion }[] = [];
                if (nextPlayer.stats.hp > 0) {
                    possibleAllies.push({ type: 'player', entity: nextPlayer });
                }
                (nextPlayer.companions || []).forEach(c => {
                    if (c.stats.hp > 0 && !c.isDead) {
                        possibleAllies.push({ type: 'companion', entity: c });
                    }
                });

                const isAoe = matchedSkill?.targetType === 'aoe' || requestedTargetName === '전체 대상';
                const targets = isAoe
                    ? possibleAllies
                    : [
                        possibleAllies.find(a => a.entity.name === requestedTargetName) ||
                        possibleAllies[Math.floor(Math.random() * possibleAllies.length)]
                      ].filter(Boolean);

                if (matchedSkill) {
                    newLogs.push(`[시스템] ${attackerEnemy.name}의 스킬 발동: ${matchedSkill.name}!`);
                } else {
                    newLogs.push(`[시스템] ${attackerEnemy.name}의 일반 공격!`);
                }

                targets.forEach(tObj => {
                    if (!tObj) return;
                    const targetEntity = tObj.entity;
                    const dmgRes = calculateDamage(attackerEnemy, targetEntity as any, matchedSkill, nextPlayer);

                    if (dmgRes.isMiss) {
                        newLogs.push(`[시스템] ${targetEntity.name}이(가) ${attackerEnemy.name}의 공격을 회피했습니다! (MISS)`);
                    } else if ((dmgRes as any).isNullified) {
                        newLogs.push(`[시스템] ${targetEntity.name}의 신화 옵션 발동! 피해를 무효화했습니다.`);
                    } else {
                        let dmg = Math.max(1, dmgRes.damage);
                        const shieldRes = CombatShieldService.processShieldAbsorption(targetEntity, dmg);
                        dmg = shieldRes.remainingDamage;
                        if (shieldRes.totalLog) {
                            shieldRes.totalLog.split('\n').filter(Boolean).forEach(l => newLogs.push(l.trim()));
                        }

                        const newHp = Math.max(0, (targetEntity.stats.hp || 0) - dmg);
                        targetEntity.stats.hp = newHp;
                        targetEntity.hp = newHp;
                        if (newHp <= 0 && tObj.type === 'companion') {
                            (targetEntity as Companion).isDead = true;
                        }

                        const critTag = dmgRes.isCrit ? ' (치명타!)' : '';
                        newLogs.push(`[시스템: ${targetEntity.name} HP -${dmg}] (by ${attackerEnemy.name})${critTag}`);
                    }
                });
            }
        }
        // 3. 동료 턴 행동 처리 ([동료 지시: <이름>] ...)
        else if (actionText.startsWith('[동료 지시:') || actionText.startsWith('[동료 행동:') || actionText.startsWith('[동료 스킬:')) {
            const cmdMatch = actionText.match(/\[동료\s*(?:지시|행동|스킬):\s*(.+?)\]\s*(.+)$/);
            const compName = cmdMatch ? cmdMatch[1].trim() : '';
            const subCmd = cmdMatch ? cmdMatch[2].trim() : '';
            const comp = (nextPlayer.companions || []).find(c => c.name === compName || c.name.includes(compName)) || nextPlayer.companions?.[0];

            if (comp && comp.stats.hp > 0) {
                const targetMatch = subCmd.match(/\(대상:\s*(.+?)\)/);
                const targetName = targetMatch ? targetMatch[1].trim() : '';

                if (subCmd.includes('방어')) {
                    newLogs.push(`[시스템] ${comp.name}이(가) 방패를 세우고 방어 태세를 갖춥니다.`);
                } else if (subCmd.includes('스킬 사용:') || (mpCost && mpCost > 0)) {
                    const sNameMatch = subCmd.match(/스킬 사용:\s*(.+?)(?:\s*\(|$)/);
                    const sName = sNameMatch ? sNameMatch[1].trim() : '';
                    const allCompSkills = getEntityAllCombatSkills(comp);
                    const usedSkill = allCompSkills.find(s => s.name === sName || subCmd.includes(s.name)) || comp.skills?.[0];

                    const cost = usedSkill?.mpCost ?? mpCost ?? 0;
                    comp.stats.mp = Math.max(0, (comp.stats.mp || 0) - cost);
                    comp.mp = comp.stats.mp;

                    if (usedSkill) {
                        newLogs.push(`[시스템: ${comp.name} 스킬 발동: ${usedSkill.name} (${usedSkill.tier || ClassTier.FIRST})]`);

                        const isHealOrBuff = usedSkill.type === SkillType.HEAL || usedSkill.type === SkillType.BUFF || usedSkill.effectFormula?.includes('RECOV') || usedSkill.effectFormula?.includes('HEAL');
                        if (isHealOrBuff) {
                            const healTarget = targetName === comp.name ? comp : nextPlayer;
                            const healAmt = Math.max(200, Math.floor((healTarget.stats.maxHp || 5000) * 0.25));
                            healTarget.stats.hp = Math.min(healTarget.stats.maxHp, (healTarget.stats.hp || 0) + healAmt);
                            healTarget.hp = healTarget.stats.hp;
                            newLogs.push(`[시스템: ${healTarget.name} HP +${healAmt}]`);
                            newLogs.push(`[시스템] ${healTarget.name}에게 ${usedSkill.name} 효과 적용`);
                        } else {
                            const isAoe = usedSkill.targetType === 'aoe' || targetName === 'aoe' || targetName === '전체 대상';
                            const enemyTargets = isAoe
                                ? aliveEnemies
                                : [aliveEnemies.find(e => e.name === targetName || e.name.includes(targetName)) || aliveEnemies[0]].filter(Boolean);

                            enemyTargets.forEach(tEnemy => {
                                const dmgRes = calculateDamage(comp, tEnemy, usedSkill, nextPlayer);
                                if (dmgRes.isMiss) {
                                    newLogs.push(`[시스템] ${tEnemy.name}이(가) ${comp.name}의 공격을 회피했습니다! (MISS)`);
                                } else {
                                    const dmg = Math.max(1, dmgRes.damage);
                                    tEnemy.hp = Math.max(0, tEnemy.hp - dmg);
                                    const critTag = dmgRes.isCrit ? ' (치명타!)' : '';
                                    newLogs.push(`[시스템: ${tEnemy.name} HP -${dmg}] (by ${comp.name})${critTag}`);
                                    if (tEnemy.hp <= 0) {
                                        newLogs.push(`[시스템] ${tEnemy.name} 처치!`);
                                    }
                                }
                            });
                        }
                    }
                } else {
                    // 동료 일반 공격
                    const tEnemy = aliveEnemies.find(e => e.name === targetName || e.name.includes(targetName)) || aliveEnemies[0];
                    if (tEnemy) {
                        const dmgRes = calculateDamage(comp, tEnemy, undefined, nextPlayer);
                        if (dmgRes.isMiss) {
                            newLogs.push(`[시스템] ${tEnemy.name}이(가) ${comp.name}의 공격을 회피했습니다! (MISS)`);
                        } else {
                            const dmg = Math.max(1, dmgRes.damage);
                            tEnemy.hp = Math.max(0, tEnemy.hp - dmg);
                            const critTag = dmgRes.isCrit ? ' (치명타!)' : '';
                            newLogs.push(`[시스템: ${tEnemy.name} HP -${dmg}] (by ${comp.name})${critTag}`);
                            if (tEnemy.hp <= 0) {
                                newLogs.push(`[시스템] ${tEnemy.name} 처치!`);
                            }
                        }
                    }
                }
            }
        }
        // 4. 플레이어(또는 단독 출전 동료 주체) 행동 처리
        else if (actionText.startsWith('[방어]')) {
            newLogs.push(`[시스템] ${nextPlayer.name}이(가) 방어 태세를 취해 피해를 줄일 준비를 합니다.`);
        } else {
            const allSkills = getEntityAllCombatSkills(nextPlayer);
            let usedSkill: Skill | undefined = undefined;

            if (actionText.includes('[스킬 사용') || actionText.includes('[고유 스킬]') || actionText.includes('[인연 스킬]') || (mpCost && mpCost > 0)) {
                const sMatch = actionText.match(/\[스킬 사용(?::\s*[^\]]+)?\]\s*(.+?)\s*(?:\(|\[|$)/);
                const sName = sMatch ? sMatch[1].trim() : '';
                usedSkill = allSkills.find(s => s.name === sName || s.id === sName || actionText.includes(s.name));
            }

            const cost = usedSkill?.mpCost ?? mpCost ?? 0;
            if (cost > 0) {
                nextPlayer.stats.mp = Math.max(0, (nextPlayer.stats.mp || 0) - cost);
                nextPlayer.mp = nextPlayer.stats.mp;
                newLogs.push(`[시스템: ${nextPlayer.name} MP -${cost}]`);
            }

            const targetMatch = actionText.match(/\(대상:\s*(.+?)\)/) || actionText.match(/\[일반 공격\]\s*(.+?)\s*공격/);
            const targetName = targetMatch ? targetMatch[1].trim() : '';

            if (usedSkill) {
                const isOffensive = usedSkill.type === SkillType.PHYSICAL || usedSkill.type === SkillType.MAGIC || String(usedSkill.type).includes('물리') || String(usedSkill.type).includes('마법');
                const isHealOrBuff = !isOffensive && (usedSkill.type === SkillType.HEAL || usedSkill.type === SkillType.BUFF || usedSkill.effectFormula?.includes('RECOV') || usedSkill.effectFormula?.includes('HEAL'));

                if (isHealOrBuff) {
                    const healAmt = Math.max(300, Math.floor((nextPlayer.stats.maxHp || 10000) * 0.3));
                    nextPlayer.stats.hp = Math.min(nextPlayer.stats.maxHp, (nextPlayer.stats.hp || 0) + healAmt);
                    nextPlayer.hp = nextPlayer.stats.hp;
                    newLogs.push(`[시스템: ${nextPlayer.name} HP +${healAmt}]`);
                    newLogs.push(`[시스템] ${nextPlayer.name}에게 ${usedSkill.name} 효과 적용`);
                } else {
                    const isAoe = usedSkill.targetType === 'aoe' || targetName === 'aoe' || targetName === '전체 대상';
                    const enemyTargets = isAoe
                        ? aliveEnemies
                        : [aliveEnemies.find(e => e.name === targetName || e.name.includes(targetName) || targetName.includes(e.name)) || aliveEnemies[0]].filter(Boolean);

                    enemyTargets.forEach(tEnemy => {
                        const dmgRes = calculateDamage(nextPlayer, tEnemy, usedSkill, nextPlayer);
                        if (dmgRes.isMiss) {
                            newLogs.push(`[시스템] ${usedSkill!.name}이(가) 빗나갔습니다! (${tEnemy.name} 회피) (by ${nextPlayer.name})`);
                        } else {
                            const dmg = Math.max(1, dmgRes.damage);
                            tEnemy.hp = Math.max(0, tEnemy.hp - dmg);
                            const critTag = dmgRes.isCrit ? ' (치명타!)' : '';
                            newLogs.push(`[시스템: ${tEnemy.name} HP -${dmg}] (by ${nextPlayer.name})${critTag}`);
                            if (tEnemy.hp <= 0) {
                                newLogs.push(`[시스템] ${tEnemy.name} 처치!`);
                            }
                        }
                    });
                }
            } else {
                // 일반 공격
                const tEnemy = aliveEnemies.find(e => e.name === targetName || e.name.includes(targetName) || targetName.includes(e.name)) || aliveEnemies[0];
                if (tEnemy) {
                    const dmgRes = calculateDamage(nextPlayer, tEnemy, undefined, nextPlayer);
                    if (dmgRes.isMiss) {
                        newLogs.push(`[시스템] ${tEnemy.name}이(가) ${nextPlayer.name}의 공격을 회피했습니다! (MISS)`);
                    } else {
                        const dmg = Math.max(1, dmgRes.damage);
                        tEnemy.hp = Math.max(0, tEnemy.hp - dmg);
                        const critTag = dmgRes.isCrit ? ' (치명타!)' : '';
                        newLogs.push(`[시스템: ${tEnemy.name} HP -${dmg}] (by ${nextPlayer.name})${critTag}`);
                        if (tEnemy.hp <= 0) {
                            newLogs.push(`[시스템] ${tEnemy.name} 처치!`);
                        }
                    }
                }
            }
        }

        // 상태 동기화
        combatPlayerRef.current = nextPlayer;
        setCombatPlayerState(nextPlayer);

        const remainingEnemies = nextEnemies.filter(e => e.hp > 0);
        const isAllEnemiesDead = remainingEnemies.length === 0;
        const isAllyDefeated = (nextPlayer.stats.hp || 0) <= 0;

        if (isAllEnemiesDead) {
            newLogs.push(`[시스템] 🏆 적 분대 전원을 완벽히 섬멸했습니다! 전술판으로 복귀합니다.`);
            const finalHp = Math.max(1, nextPlayer.stats.hp);
            const finalMp = Math.max(0, nextPlayer.stats.mp);
            setTimeout(() => {
                finishCombatWin(activeCombat.ally, activeCombat.enemy, finalHp, finalMp);
            }, 1200);
        } else if (isAllyDefeated) {
            newLogs.push(`[시스템] 💀 아군 부대가 치명상을 입고 전선에서 후퇴합니다...`);
            setTimeout(() => {
                finishCombatLoss(activeCombat.ally, activeCombat.enemy);
            }, 1200);
        }

        setLocalCombatState(prev => prev ? {
            ...prev,
            enemies: nextEnemies,
            log: [...prev.log, ...newLogs],
            isEnded: isAllEnemiesDead || isAllyDefeated
        } : prev);
    };

    // 교전 승리 처리
    const finishCombatWin = (ally: TacticalUnit, enemy: TacticalEnemyUnit, remainingHp: number, remainingMp: number) => {
        const nextEnemies = enemies.filter(e => e.id !== enemy.id);
        setEnemies(nextEnemies);

        setAllies(prev => prev.map(u => {
            if (u.id === ally.id) {
                return {
                    ...u,
                    hp: remainingHp,
                    mp: remainingMp,
                    row: enemy.row,
                    col: enemy.col,
                    hasActed: true
                };
            }
            return u;
        }));

        setActiveCombat(null);
        setLocalCombatState(null);

        // 적장(Boss)을 격파했거나 적을 모두 섬멸했다면 즉시 대승리 및 점유율 상승 결과창 오픈!
        if (enemy.isBoss || nextEnemies.length === 0) {
            handleWarVictory(true);
            return;
        }

        setTacticalBanner(`⚔️ [${enemy.name}] 분대 격파 완료! 최상단의 적장(보스)을 처단하거나 남은 적(${nextEnemies.length}부대)을 소탕하면 점유율이 상승합니다!`);
        setPhase('tactics');
    };

    // 교전 패배 처리
    const finishCombatLoss = (ally: TacticalUnit, _enemy: TacticalEnemyUnit) => {
        const nextAllies = allies.filter(u => u.id !== ally.id);
        setAllies(nextAllies);
        setActiveCombat(null);
        setLocalCombatState(null);
        setPhase('tactics');

        if (ally.isPlayer || nextAllies.length === 0) {
            handleWarDefeat();
        }
    };

    // 6. 아군 턴 종료 및 적군 턴 자동 진행
    const handleEndPlayerTurn = () => {
        if (turnOwner !== 'player') return;

        setTurnOwner('enemy');
        setSelectedUnitId(null);

        setTimeout(() => {
            setEnemies(prevEnemies => {
                return prevEnemies.map(e => {
                    if (e.isBoss) return e; // 적장은 본진 수호
                    const nextRow = Math.min(numRows - 1, e.row + 1);
                    const isBlocked = allies.some(a => a.row === nextRow && a.col === e.col) ||
                                      prevEnemies.some(other => other.id !== e.id && other.row === nextRow && other.col === e.col);

                    if (!isBlocked) {
                        return { ...e, row: nextRow };
                    }
                    return e;
                });
            });

            setAllies(prev => prev.map(u => ({ ...u, hasActed: false })));
            setTurnCount(c => c + 1);
            setTurnOwner('player');
        }, 700);
    };

    // 7. 전쟁 최종 승리 처리: 계급별 점유율 상승 및 명확한 시각적 피드백 제공!
    const handleWarVictory = (isBossDefeated: boolean) => {
        const occGain = calculateOccupationGain(character, isBossDefeated);
        const prevOcc = currentOccupation;
        const newOcc = Math.min(100, prevOcc + occGain);
        const isVassalized = newOcc >= 100;

        const updatedChar = JSON.parse(JSON.stringify(character)) as Character;
        if (!updatedChar.militaryData) updatedChar.militaryData = {};
        if (!updatedChar.militaryData.diplomacy) updatedChar.militaryData.diplomacy = {};
        if (!updatedChar.militaryData.diplomacy[targetNation]) {
            updatedChar.militaryData.diplomacy[targetNation] = {
                status: DiplomaticStatus.WAR,
                occupation: 0,
                tension: 100
            };
        }

        const rel = updatedChar.militaryData.diplomacy[targetNation];
        rel.occupation = newOcc;
        rel.lastRaidOccupationDate = updatedChar.currentDate || '2000-01-01'; // 당일 점유율 획득 갱신

        if (isVassalized) {
            rel.status = DiplomaticStatus.VASSAL_OWNER;
            rel.vassalYearsRemaining = 5;
            rel.lastEvent = `지도자 굴복. 국가 전면 복속 성공.`;
        }

        if (updatedChar.militaryData.pendingInvasions) {
            updatedChar.militaryData.pendingInvasions = updatedChar.militaryData.pendingInvasions.filter(
                n => n !== targetNation
            );
        }

        const meritGain = isBossDefeated ? 300 : 150;
        updatedChar.militaryData.merit = (updatedChar.militaryData.merit || 0) + meritGain;

        const rankName = character.militaryRank || (character.job === JobType.DEMON_GOD ? '마신' : character.job.toString().includes('제너럴') ? '제너럴' : '이등병');
        onUpdateCharacter(
            updatedChar,
            `[전술 대첩] ${targetNation} 거점 전술 습격 대승리! (${rankName} 계급 복무 규정 적용: 전선 점유율 +${occGain}% 상승! 현재: ${newOcc}%)`
        );

        setWarResult({
            won: true,
            title: isVassalized ? '🏛️ 국가 정벌 완수 (Vassalized)' : '🚩 거점 전술 습격 대승리!',
            message: isVassalized 
                ? `${targetNation}의 총사령관을 완전히 굴복시켰습니다! 이제 해당 국가는 종주국의 속국이 되어 조공을 바칩니다.`
                : `${targetNation}의 방어선을 완벽히 분쇄하고 적장을 물리쳤습니다!\n군 계급 복무 규정에 따라 전선 점유율이 +${occGain}% 상승했습니다!`,
            prevOccupation: prevOcc,
            newOccupation: newOcc,
            occupationChange: occGain,
            rankName,
            isVassal: isVassalized
        });

        if (onVictory) {
            onVictory(occGain, isVassalized, prevOcc, newOcc, rankName);
        }

        setPhase('result');
    };

    // 전쟁 패배 처리
    const handleWarDefeat = () => {
        setWarResult({
            won: false,
            title: '⚠️ 전선 퇴각',
            message: '주력 부대가 치명적인 피해를 입고 전선에서 후퇴했습니다.',
            prevOccupation: currentOccupation,
            newOccupation: currentOccupation,
            occupationChange: 0,
            rankName: character.militaryRank || '군인',
            isVassal: false
        });
        setPhase('result');
    };

    if (!isOpen) return null;

    const expectedGain = calculateOccupationGain(character, true);
    const currentRankLabel = character.militaryRank || (character.job === JobType.DEMON_GOD ? '마신' : character.job.toString().includes('제너럴') ? '제너럴' : '이등병');

    return (
        <div className="fixed inset-0 z-[250] flex items-center justify-center bg-black/95 backdrop-blur-xl p-2 sm:p-4 animate-in fade-in duration-300">
            {/* 전체 화면을 채우는 대형 전술 모달 */}
            <div className="bg-slate-900 border-2 border-rose-600/70 w-[98vw] max-w-[1700px] h-[96vh] rounded-3xl shadow-[0_0_100px_rgba(225,29,72,0.4)] flex flex-col relative overflow-hidden">
                
                {/* 상단 헤더 바 */}
                <div className="p-4 sm:p-5 border-b border-rose-900/40 bg-gradient-to-r from-rose-950/90 via-slate-900 to-slate-950 flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-3 sm:gap-4">
                        <div className="p-3 bg-rose-900/40 border border-rose-500/60 rounded-2xl text-rose-400 shadow-md">
                            <Flag size={28} className="animate-pulse" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2 flex-wrap">
                                <h2 className="text-xl sm:text-2xl font-black text-white tracking-wider uppercase font-cinzel">
                                    {mode === 'invasion' ? '대규모 거점 전술 습격 작전' : '전술 거점 방어전'}
                                </h2>
                                <span className="text-xs bg-rose-600 text-white font-bold px-2.5 py-0.5 rounded-full border border-rose-400">
                                    대 {targetNation} 전선
                                </span>
                                <span className="text-xs bg-slate-800 text-slate-300 font-mono px-2 py-0.5 rounded-full border border-slate-700">
                                    전장 규격: {numRows}×{numCols}
                                </span>
                                <span className="text-xs bg-emerald-950 text-emerald-300 font-bold px-2.5 py-0.5 rounded-full border border-emerald-600/60">
                                    승리 시 점유율 +{expectedGain}% ({currentRankLabel} 규정)
                                </span>
                            </div>
                            <p className="text-xs text-rose-300/80 mt-1">
                                현재 전선 점유율: <span className="font-bold text-amber-400 font-mono text-sm">{currentOccupation}%</span> 
                                {isRaid ? ' (최종 수도 결전)' : ` → 적장 격파 시 ${Math.min(100, currentOccupation + expectedGain)}% 달성!`}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors">
                        <X size={24} />
                    </button>
                </div>

                {/* 본문 콘텐츠: 단계별 렌더링 */}
                <div className="flex-1 overflow-y-auto p-3 sm:p-6 bg-slate-950 custom-scrollbar flex flex-col relative">
                    
                    {/* [PHASE 1] 출진 부대 편성 화면 */}
                    {phase === 'setup' && (
                        <div className="space-y-6 max-w-4xl mx-auto w-full my-auto animate-in slide-in-from-bottom-4 duration-300">
                            <div className="text-center space-y-2">
                                <h3 className="text-2xl sm:text-3xl font-black text-white flex items-center justify-center gap-3">
                                    <Users className="text-rose-400" size={32}/> 거점 습격 총력 부대 소집
                                </h3>
                                <p className="text-sm text-slate-400">
                                    이번 거점 습격에 출진할 정예 동료들을 선택하십시오. (최대 6명 편성 가능)
                                </p>
                            </div>

                            {/* 플레이어(사령관) 고정 카드 */}
                            <div className="p-5 bg-gradient-to-r from-rose-950/50 via-slate-900 to-slate-900 border-2 border-rose-500/60 rounded-3xl flex items-center justify-between shadow-xl">
                                <div className="flex items-center gap-4">
                                    <div className="w-16 h-16 rounded-2xl bg-rose-900/40 border border-rose-500/60 flex items-center justify-center overflow-hidden shrink-0 shadow-md">
                                        {character.visualUrl ? (
                                            <img src={character.visualUrl} alt={character.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <Crown size={32} className="text-amber-400" />
                                        )}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-black text-white text-lg">{character.name}</span>
                                            <span className="text-xs bg-rose-600 text-white font-bold px-2 py-0.5 rounded">총사령관</span>
                                        </div>
                                        <div className="text-xs text-rose-300 font-mono mt-1">
                                            Lv.{character.level} · {character.job} · 계급: {currentRankLabel} (적장 처치 시 점유율 +{expectedGain}%)
                                        </div>
                                    </div>
                                </div>
                                <span className="text-xs font-bold text-emerald-400 px-4 py-1.5 bg-emerald-950/80 border border-emerald-500/50 rounded-xl">
                                    사령관 자동 출격
                                </span>
                            </div>

                            {/* 동료 선택 그리드 */}
                            <div className="space-y-3">
                                <div className="flex justify-between items-center text-xs text-slate-400 px-2">
                                    <span>소집 가능한 동료 풀 ({selectedCompanionIds.length}/6명 선택됨)</span>
                                    <span>* 전술판에서 단독 전투하거나 인접 아군과 겹쳐 결합(Pair-Up)할 수 있습니다.</span>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[380px] overflow-y-auto custom-scrollbar p-1">
                                    {availableCompanions.map(comp => {
                                        const isSelected = selectedCompanionIds.includes(comp.id);
                                        return (
                                            <button
                                                key={comp.id}
                                                type="button"
                                                onClick={() => {
                                                    if (isSelected) {
                                                        setSelectedCompanionIds(prev => prev.filter(id => id !== comp.id));
                                                    } else {
                                                        if (selectedCompanionIds.length >= 6) return;
                                                        setSelectedCompanionIds(prev => [...prev, comp.id]);
                                                    }
                                                }}
                                                className={`p-4 rounded-2xl border text-left transition-all flex items-center justify-between ${isSelected ? 'bg-rose-950/60 border-rose-500 shadow-lg ring-2 ring-rose-500/40' : 'bg-slate-900/90 border-slate-800 hover:border-slate-700'}`}
                                            >
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center overflow-hidden shrink-0">
                                                        {comp.visualUrl ? (
                                                            <img src={comp.visualUrl} alt={comp.name} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <Users size={22} className="text-slate-400" />
                                                        )}
                                                    </div>
                                                    <div className="truncate">
                                                        <h4 className="font-bold text-white text-sm truncate">{comp.name}</h4>
                                                        <div className="text-xs text-slate-400 mt-0.5">
                                                            Lv.{comp.level} · {comp.job || '부대원'}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-black border transition-colors ${isSelected ? 'bg-rose-600 text-white border-rose-400 shadow-md' : 'bg-slate-800 text-slate-500 border-slate-700'}`}>
                                                    {isSelected ? '✓' : '+'}
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <button
                                onClick={handleStartTactics}
                                className="w-full py-4 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-black rounded-2xl text-lg shadow-xl shadow-rose-950/60 flex items-center justify-center gap-2 active:scale-98 transition-all"
                            >
                                <Play size={22} /> 거점 전술판 진입 및 총력 습격 개시
                            </button>
                        </div>
                    )}

                    {/* [PHASE 2] 전술판 (대형 그리드 맵) 화면 */}
                    {phase === 'tactics' && (
                        <div className="flex-1 flex flex-col lg:flex-row gap-6 h-full items-stretch">
                            
                            {/* 좌측: 전술판 그리드 */}
                            <div className="flex-1 flex flex-col items-center justify-center bg-slate-950/90 rounded-3xl border-2 border-slate-800/80 p-4 sm:p-6 relative">
                                {tacticalBanner && (
                                    <div className="w-full mb-3 p-3 bg-emerald-950/80 border border-emerald-500/60 rounded-2xl text-emerald-300 text-xs font-bold text-center animate-in fade-in">
                                        {tacticalBanner}
                                    </div>
                                )}

                                <div className="w-full flex justify-between items-center mb-4 px-3">
                                    <div className="flex items-center gap-3">
                                        <span className={`px-4 py-1.5 rounded-full border text-xs font-black ${turnOwner === 'player' ? 'bg-sky-950 text-sky-400 border-sky-500 animate-pulse' : 'bg-rose-950 text-rose-400 border-rose-500'}`}>
                                            {turnOwner === 'player' ? `턴 ${turnCount} : 아군 작전 페이즈` : `턴 ${turnCount} : 적군 진격 페이즈...`}
                                        </span>
                                        <span className="text-xs text-slate-400 hidden sm:inline">
                                            (적과 조우 시 <strong className="text-sky-300">정규 CombatInterface 분대 전투</strong>에 돌입합니다)
                                        </span>
                                    </div>
                                    {turnOwner === 'player' && (
                                        <button
                                            onClick={handleEndPlayerTurn}
                                            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow"
                                        >
                                            <RefreshCw size={14} /> 턴 종료 (적 턴으로)
                                        </button>
                                    )}
                                </div>

                                {/* 동적 그리드 보드 */}
                                <div 
                                    className="grid gap-2 sm:gap-3 w-full max-w-[740px] aspect-[5/6]"
                                    style={{
                                        gridTemplateRows: `repeat(${numRows}, minmax(0, 1fr))`,
                                        gridTemplateColumns: `repeat(${numCols}, minmax(0, 1fr))`
                                    }}
                                >
                                    {Array.from({ length: numRows }).map((_, r) => (
                                        Array.from({ length: numCols }).map((__, c) => {
                                            const allyUnit = allies.find(u => u.row === r && u.col === c);
                                            const enemyUnit = enemies.find(e => e.row === r && e.col === c);
                                            const isSelected = allyUnit && selectedUnitId === allyUnit.id;

                                            const selectedUnit = allies.find(u => u.id === selectedUnitId);
                                            const distToSelected = selectedUnit ? (Math.abs(selectedUnit.row - r) + Math.abs(selectedUnit.col - c)) : 999;
                                            const isAdjacent = distToSelected === 1;

                                            // 결합 가능 타일
                                            const isPairableTarget = Boolean(
                                                selectedUnit && !selectedUnit.hasActed && allyUnit && 
                                                selectedUnit.id !== allyUnit.id && isAdjacent && !selectedUnit.pairUnit && !allyUnit.pairUnit
                                            );

                                            // 이동/공격 가능 타일
                                            const isMovableTarget = Boolean(
                                                selectedUnit && !selectedUnit.hasActed && isAdjacent && !allyUnit
                                            );

                                            return (
                                                <div
                                                    key={`${r}-${c}`}
                                                    onClick={() => {
                                                        if (turnOwner !== 'player') return;

                                                        // 1. 이미 선택된 유닛이 있고, 인접한 다른 아군을 클릭한 경우 -> 겹치며 결합!
                                                        if (selectedUnit && allyUnit && selectedUnit.id !== allyUnit.id && !selectedUnit.hasActed) {
                                                            if (isAdjacent) {
                                                                handlePairUp(selectedUnit.id, allyUnit.id);
                                                                return;
                                                            } else {
                                                                setSelectedUnitId(allyUnit.id);
                                                                return;
                                                            }
                                                        }

                                                        // 2. 아군 유닛 선택
                                                        if (allyUnit && !allyUnit.hasActed) {
                                                            setSelectedUnitId(allyUnit.id);
                                                            return;
                                                        }

                                                        // 3. 이동 또는 교전
                                                        if (isMovableTarget) {
                                                            handleMoveOrEngage(r, c);
                                                        }
                                                    }}
                                                    className={`rounded-2xl border-2 relative flex flex-col items-center justify-center p-2 cursor-pointer transition-all ${
                                                        isSelected
                                                            ? 'bg-sky-950/80 border-sky-400 shadow-[0_0_25px_rgba(56,189,248,0.6)] scale-105 z-10'
                                                            : isPairableTarget
                                                            ? 'bg-purple-950/80 border-purple-400 ring-2 ring-purple-400 shadow-[0_0_20px_rgba(168,85,247,0.5)] animate-pulse z-10'
                                                            : isMovableTarget
                                                            ? enemyUnit
                                                                ? 'bg-rose-950/70 border-rose-500 animate-pulse shadow-[0_0_20px_rgba(244,63,94,0.5)]'
                                                                : 'bg-emerald-950/50 border-emerald-500/80 hover:bg-emerald-900/60'
                                                            : r === 0
                                                            ? 'bg-rose-950/20 border-rose-900/30'
                                                            : r === numRows - 1
                                                            ? 'bg-sky-950/20 border-sky-900/30'
                                                            : 'bg-slate-900/50 border-slate-800/80 hover:border-slate-700'
                                                    }`}
                                                >
                                                    <span className="absolute top-1.5 left-2 text-[9px] font-mono text-slate-500 font-bold">
                                                        {isPairableTarget ? '🤝 결합' : r === 0 ? '적 본진' : r === numRows - 1 ? '아군 진영' : ''}
                                                    </span>

                                                    {/* 아군 유닛 표시 */}
                                                    {allyUnit && (
                                                        <div className="flex flex-col items-center text-center w-full">
                                                            <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center border-2 font-black text-xs relative overflow-hidden shadow-md ${allyUnit.isPlayer ? 'bg-amber-600 text-white border-amber-300' : 'bg-sky-600 text-white border-sky-300'}`}>
                                                                {allyUnit.visualUrl ? (
                                                                    <img src={allyUnit.visualUrl} alt={allyUnit.name} className="w-full h-full object-cover" />
                                                                ) : (
                                                                    <span>{allyUnit.name.slice(0, 2)}</span>
                                                                )}
                                                                {allyUnit.pairUnit && (
                                                                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-purple-600 border border-purple-200 rounded-full flex items-center justify-center text-[10px] font-black text-white shadow">
                                                                        2
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <span className="text-[11px] font-black text-white truncate max-w-[65px] mt-1">
                                                                {allyUnit.name.split(' ')[0]}
                                                            </span>
                                                            <div className="w-4/5 bg-slate-800 h-1.5 rounded-full mt-1 overflow-hidden">
                                                                <div className="bg-emerald-400 h-full transition-all duration-300" style={{ width: `${Math.min(100, (allyUnit.hp / allyUnit.maxHp) * 100)}%` }} />
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* 적 유닛 표시 */}
                                                    {enemyUnit && (
                                                        <div className="flex flex-col items-center text-center w-full">
                                                            <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center border-2 font-black text-xs relative overflow-hidden shadow-md ${enemyUnit.isBoss ? 'bg-rose-700 text-white border-rose-300 animate-pulse' : 'bg-red-950 text-rose-300 border-red-700'}`}>
                                                                {enemyUnit.isBoss ? <Skull size={24} /> : <Crosshair size={20} />}
                                                            </div>
                                                            <span className="text-[11px] font-black text-rose-400 truncate max-w-[65px] mt-1">
                                                                {enemyUnit.isBoss ? '👑적장' : enemyUnit.name.slice(0, 4)}
                                                            </span>
                                                            <div className="w-4/5 bg-slate-800 h-1.5 rounded-full mt-1 overflow-hidden">
                                                                <div className="bg-rose-500 h-full transition-all duration-300" style={{ width: `${Math.min(100, (enemyUnit.hp / enemyUnit.maxHp) * 100)}%` }} />
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })
                                    ))}
                                </div>
                            </div>

                            {/* 우측: 유닛 정보 및 결합 전술 패널 */}
                            <div className="w-full lg:w-80 bg-slate-950/90 rounded-3xl border-2 border-slate-800 p-5 flex flex-col justify-between shrink-0">
                                <div>
                                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                                        <Crosshair size={16} className="text-rose-400" /> 선택 부대 전술 상태
                                    </h4>

                                    {selectedUnitId ? (() => {
                                        const unit = allies.find(u => u.id === selectedUnitId);
                                        if (!unit) return null;

                                        return (
                                            <div className="space-y-4 animate-in fade-in">
                                                <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800 space-y-3">
                                                    <div className="flex items-center justify-between">
                                                        <span className="font-black text-white text-base">{unit.name}</span>
                                                        <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-sky-950 text-sky-400 border border-sky-700">
                                                            {unit.isPlayer ? '사령관' : '부대원'}
                                                        </span>
                                                    </div>

                                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                                        <div className="text-slate-400">HP: <span className="text-emerald-400 font-mono font-bold">{unit.hp.toLocaleString()}/{unit.maxHp.toLocaleString()}</span></div>
                                                        <div className="text-slate-400">공격력: <span className="text-rose-400 font-mono font-bold">{unit.atk.toLocaleString()}</span></div>
                                                        <div className="text-slate-400">방어력: <span className="text-sky-400 font-mono font-bold">{unit.def.toLocaleString()}</span></div>
                                                        <div className="text-slate-400">상태: <span className={unit.hasActed ? 'text-slate-500' : 'text-emerald-400 font-bold'}>{unit.hasActed ? '행동 완료' : '진격 가능'}</span></div>
                                                    </div>

                                                    {unit.pairUnit && (
                                                        <div className="pt-2 border-t border-slate-800 text-xs">
                                                            <div className="text-purple-400 font-bold flex items-center gap-1.5">
                                                                <Sparkles size={14}/> 결합 동료: {unit.pairUnit.name}
                                                            </div>
                                                            <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                                                                동료와 함께 정규 분대 전투에 출전하여 2인 협공을 펼칩니다!
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="space-y-2">
                                                    {unit.pairUnit ? (
                                                        <button
                                                            onClick={() => handleSplit(unit.id)}
                                                            className="w-full py-3 bg-purple-900/60 hover:bg-purple-800 text-purple-200 border border-purple-500/50 rounded-xl text-xs font-bold transition-all shadow"
                                                        >
                                                            부대 분리 (단독 유닛으로 전환)
                                                        </button>
                                                    ) : (
                                                        <p className="text-[11px] text-slate-500 text-center leading-relaxed">
                                                            인접한 다른 아군을 클릭하면 <span className="text-purple-400 font-bold">결합(Pair-Up)</span>하여 정규 전투에 함께 참전합니다.
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })() : (
                                        <div className="py-16 text-center text-slate-500 border border-dashed border-slate-800 rounded-2xl">
                                            <Move size={32} className="mx-auto mb-2 text-slate-600" />
                                            <p className="text-xs">아군 유닛을 클릭하여<br/>이동하거나 적을 공격하십시오.</p>
                                        </div>
                                    )}
                                </div>

                                <div className="p-4 bg-slate-900/80 rounded-2xl border border-slate-800 text-xs text-slate-400 space-y-1.5">
                                    <div className="font-bold text-slate-300">💡 전술판 운용 가이드</div>
                                    <div>• 적과 마주치면 다수의 적 분대와 <span className="text-sky-400 font-bold">정규 CombatInterface</span>로 돌입합니다.</div>
                                    <div>• 동료 단독 전투 시에는 플레이어 없이 동료 혼자 당당히 싸웁니다.</div>
                                    <div>• 최상단의 <span className="text-rose-400 font-bold">적장(보스)</span>을 처단하면 <span className="text-emerald-400 font-bold">{currentRankLabel} 계급 규정(+{expectedGain}%)</span>에 따라 점유율이 상승합니다!</div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* [PHASE 3] 정규 CombatInterface 전투 오버레이! */}
                    {phase === 'battle' && localCombatState && activeCombat && (
                        <div className="absolute inset-0 z-50 bg-slate-950 flex flex-col animate-in zoom-in-95 duration-200">
                            <div className="p-3 bg-slate-900 border-b border-rose-900/50 flex justify-between items-center px-4 shrink-0">
                                <div className="flex items-center gap-2 text-xs font-bold text-rose-300">
                                    <Sword size={16} className="text-rose-500 animate-pulse" />
                                    <span>[전술 분대 교전] {activeCombat.ally.name} VS {activeCombat.enemy.name} (적군 {localCombatState.enemies.filter(e => e.hp > 0).length}명 생존)</span>
                                </div>
                                <span className="text-[11px] text-slate-400">
                                    전투 종료 시 자동으로 전술판으로 복귀합니다.
                                </span>
                            </div>

                            <div className="flex-1 w-full h-full relative overflow-hidden">
                                <CombatInterface
                                    combatState={localCombatState}
                                    player={combatPlayerState}
                                    onAction={handleCombatAction}
                                    isLoading={isCombatLoading}
                                    onUpdateCharacter={onUpdateCharacter}
                                />
                            </div>
                        </div>
                    )}

                    {/* [PHASE 4] 전쟁 최종 결과 화면: 점유율 상승 및 계급 반영 확실한 시각 피드백! */}
                    {phase === 'result' && warResult && (
                        <div className="max-w-xl mx-auto my-auto p-8 bg-slate-900 border-2 border-emerald-500/60 rounded-3xl text-center space-y-6 animate-in zoom-in-95 duration-200 shadow-[0_0_60px_rgba(16,185,129,0.25)]">
                            <div className="w-20 h-20 rounded-3xl mx-auto flex items-center justify-center border-2 shadow-2xl bg-gradient-to-br from-rose-950 to-slate-900 border-amber-400/80 text-amber-400">
                                {warResult.won ? <Crown size={44} className="text-amber-400 animate-bounce" /> : <Skull size={44} className="text-rose-400" />}
                            </div>

                            <div>
                                <h3 className="text-2xl font-black text-white">{warResult.title}</h3>
                                <p className="text-sm text-slate-300 mt-2.5 leading-relaxed whitespace-pre-line">
                                    {warResult.message}
                                </p>
                            </div>

                            {/* 점유율 변동 카드 */}
                            <div className="p-5 bg-slate-950 rounded-2xl border-2 border-emerald-500/40 space-y-3">
                                <div className="flex justify-between items-center text-xs text-slate-400">
                                    <span>적용 복무 계급: <strong className="text-sky-300">{warResult.rankName}</strong></span>
                                    <span className="text-emerald-400 font-bold">전선 지배율 상승 반영 완료!</span>
                                </div>

                                <div className="flex items-center justify-center gap-4 py-2">
                                    <div className="text-center">
                                        <div className="text-xs text-slate-500">기존 점유율</div>
                                        <div className="text-lg font-bold text-slate-400 font-mono">{warResult.prevOccupation}%</div>
                                    </div>
                                    <ArrowRight size={22} className="text-emerald-400 animate-pulse" />
                                    <div className="text-center">
                                        <div className="text-xs text-emerald-400 font-bold">최종 점유율</div>
                                        <div className="text-3xl font-black text-emerald-400 font-mono">{warResult.newOccupation}%</div>
                                    </div>
                                    <span className="text-sm font-black px-3 py-1 bg-emerald-950 border border-emerald-500 rounded-xl text-emerald-300 font-mono shadow-lg">
                                        +{warResult.occupationChange}% 상승!
                                    </span>
                                </div>

                                <div className="w-full bg-slate-800 h-3 rounded-full overflow-hidden p-0.5">
                                    <div 
                                        className="bg-gradient-to-r from-rose-500 via-amber-400 to-emerald-400 h-full rounded-full transition-all duration-1000" 
                                        style={{ width: `${Math.min(100, warResult.newOccupation)}%` }} 
                                    />
                                </div>
                            </div>

                            <button
                                onClick={onClose}
                                className="w-full py-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black rounded-2xl text-base shadow-xl transition-all"
                            >
                                <CheckCircle2 size={18} className="inline mr-2" /> 점유율 상승 확인 및 복귀
                            </button>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
};

export default WarTacticsModal;
