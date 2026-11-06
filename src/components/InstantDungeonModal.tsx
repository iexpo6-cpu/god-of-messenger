import React, { useState, useEffect } from 'react';
import { Character, Enemy, InstantDungeon, ItemRarity, Item, SimpleStudent, JobType, MilitaryRank } from '../types';
import { 
    X, Sword, Shield, ChevronRight, Skull, Crown, Heart, Loader2, 
    LogOut, Trophy, Sparkles, Coffee, Zap, Gift, 
    Compass, Flame, ArrowRight, Check, HelpCircle, Star, ShieldAlert
} from 'lucide-react';
import { calculateFinalStats, generateName, generateDefaultVisualUrl } from '../utils';
import { DungeonBranchNode, DungeonNodeType } from './DungeonModal';
import { handleDungeonDefeatRecovery } from '../services/dungeonDefeatService';
import { getMonsterInfo } from '../monsterfield';
import { RescueGratitudeModal, RescuedPersonInfo } from './RescueGratitudeModal';
import { createRescuedPersonData } from '../services/rescuePersonService';

interface Props {
    isOpen: boolean;
    character: Character;
    dungeon: InstantDungeon;
    onClose: () => void;
    onBattle: (enemy: Enemy | Enemy[], type?: string) => void;
    onUpdateCharacter: (newChar: Character, logMsg: string) => void;
    onClear: (dungeonId: string) => void;
}

const InstantDungeonModal: React.FC<Props> = ({ 
    isOpen, 
    character, 
    dungeon, 
    onClose, 
    onBattle, 
    onUpdateCharacter, 
    onClear 
}) => {
    const [nodes, setNodes] = useState<DungeonBranchNode[]>([]);
    const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
    const [isGenerating, setIsGenerating] = useState(true);
    const [eventNotice, setEventNotice] = useState<{ title: string; desc: string; items?: { label: string; value: string }[] } | null>(null);
    const [rescuedModalInfo, setRescuedModalInfo] = useState<RescuedPersonInfo | null>(null);

    useEffect(() => {
        if (isOpen && dungeon) {
            loadOrCreateRaid();
        }
    }, [isOpen, dungeon?.id, character.dungeonProgress]);

    const loadOrCreateRaid = () => {
        // 기존 던전 보스 및 몬스터 visualUrl 실시간 보강
        if (dungeon.boss && !dungeon.boss.visualUrl) {
            dungeon.boss.visualUrl = getMonsterInfo(dungeon.boss.name).visualUrl;
        }
        if (dungeon.monsters && dungeon.monsters.length > 0) {
            dungeon.monsters.forEach(m => {
                if (!m.visualUrl) {
                    m.visualUrl = getMonsterInfo(m.name).visualUrl;
                }
            });
        }
        if (dungeon.loot && dungeon.loot.length > 0) {
            dungeon.loot.forEach(l => {
                if (!l.name && (l as any).item) {
                    l.name = (l as any).item;
                }
            });
        }

        // 체력이 0 이하인 경우 (전투 패배 후 복귀): 1일 경과 및 모든 상태이상 해제 처리
        if (character.stats.hp <= 0) {
            const { updatedCharacter, logMessage } = handleDungeonDefeatRecovery(character);
            onUpdateCharacter(updatedCharacter, logMessage);
            onClose();
            return;
        }

        const dp = character.dungeonProgress;
        
        // 현재 인스턴트 던전의 진행 데이터가 유효한지 확인
        if (dp && dp.dungeonId === dungeon.id && dp.nodes && dp.nodes.length > 0) {
            const isBranchingStructure = dp.nodes.some((n: any) => typeof n.id === 'string' && n.id.includes('-'));
            
            if (isBranchingStructure) {
                let updatedNodes = [...dp.nodes];
                let updatedPath = dp.selectedPath ? [...dp.selectedPath] : [];
                let needUpdateChar = false;

                // 전투 후 복귀 처리: currentNodeId가 있고 전투 노드인 경우 완료 처리
                if (dp.currentNodeId) {
                    const foughtNode = updatedNodes.find((n: any) => n.id === dp.currentNodeId);
                    if (foughtNode && !foughtNode.isCompleted && (foughtNode.type === 'Combat' || foughtNode.type === 'MiniBoss' || foughtNode.type === 'Boss')) {
                        if (character.stats.hp > 0) {
                            updatedNodes = updatedNodes.map((n: any) => n.id === dp.currentNodeId ? { ...n, isCompleted: true, isCurrent: false } : n);
                            if (!updatedPath.includes(dp.currentNodeId)) {
                                updatedPath.push(dp.currentNodeId);
                            }
                            needUpdateChar = true;
                        } else {
                            // 던전 전투 패배: 1일 경과, 상태이상 완전 해제, HP/MP 완전 회복, 던전 퇴각
                            const { updatedCharacter, logMessage } = handleDungeonDefeatRecovery(character);
                            onUpdateCharacter(updatedCharacter, logMessage);
                            onClose();
                            return;
                        }
                    }
                }

                if (needUpdateChar) {
                    const newChar = { ...character };
                    if (newChar.dungeonProgress) {
                        newChar.dungeonProgress.nodes = updatedNodes;
                        newChar.dungeonProgress.selectedPath = updatedPath;
                        newChar.dungeonProgress.currentNodeId = undefined;
                    }
                    onUpdateCharacter(newChar, `[던전 전투 승리] 전투 구역을 성공적으로 돌파했습니다.`);
                }

                setNodes(updatedNodes);
                setIsGenerating(false);

                // 선택 가능한 노드 자동 포커스
                const path = updatedPath;
                const lastNodeId = path[path.length - 1];
                if (!selectedNodeId) {
                    if (path.length === 0) {
                        setSelectedNodeId(updatedNodes.find((n: any) => n.floor === 0)?.id || null);
                    } else {
                        const lastNode = updatedNodes.find((n: any) => n.id === lastNodeId);
                        if (lastNode && lastNode.nextIds.length > 0) {
                            setSelectedNodeId(lastNode.nextIds[0]);
                        }
                    }
                }
                return;
            }
        }

        generateBranchingDungeon();
    };

    const generateBranchingDungeon = () => {
        setIsGenerating(true);
        const newNodes: DungeonBranchNode[] = [];

        const shuffleArray = <T,>(array: T[]): T[] => {
            const arr = [...array];
            for (let i = arr.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [arr[i], arr[j]] = [arr[j], arr[i]];
            }
            return arr;
        };

        const createNodeData = (type: DungeonNodeType, floor: number, slotIndex: number) => {
            switch (type) {
                case 'Combat': {
                    const names = [
                        '차원의 균열 통로', '시공의 왜곡 회랑', '마력 불안정 지대', '침식된 공허 협곡',
                        '심연의 파편 동굴', '마수 결집지', '차원 왜곡 잔해터', '뒤틀린 석조 통로'
                    ];
                    const subtitles = ['일반 전투 구역', '마물 조우', '위험 구역', '차원로 탐색'];
                    const descs = [
                        '차원의 틈새에서 뿜어져 나오는 마기로 가득 찬 회랑입니다. 굶주린 마물들이 도사리고 있습니다.',
                        '공간이 불안정하게 요동치는 균열 지대입니다. 차원을 넘어온 몬스터들이 앞을 가로막습니다.',
                        '보라빛 마력 파동이 진동하는 통로입니다. 강력한 적들이 침입자를 경계하고 있습니다.',
                        '시공간이 왜곡되어 마물들의 공격성이 극대화된 위험 구역입니다.'
                    ];
                    return {
                        name: names[Math.floor(Math.random() * names.length)],
                        subtitle: subtitles[Math.floor(Math.random() * subtitles.length)],
                        description: descs[Math.floor(Math.random() * descs.length)]
                    };
                }
                case 'MiniBoss': {
                    const names = [
                        '차원 관문 수호자', '균열의 파괴수 서식처', '심연의 정예 사냥꾼', '공허의 파수견 거처',
                        '차원 군단의 정예 장교', '뒤틀린 수호신령의 둥지'
                    ];
                    const subtitles = ['정예 수호자', '균열 정예 마물', '강력한 정예 적', '심층 관문 수호수'];
                    const descs = [
                        '인스턴트 던전 심층부로 향하는 차원 관문을 지키는 강력한 정예 수호자입니다.',
                        '균열의 마력을 흡수하여 거대하게 변이된 포악한 정예 괴수입니다.',
                        '보스의 강력한 마력에 감응하여 침입자를 섬멸하려는 위험천만한 정예 마물입니다.'
                    ];
                    return {
                        name: names[Math.floor(Math.random() * names.length)],
                        subtitle: subtitles[Math.floor(Math.random() * subtitles.length)],
                        description: descs[Math.floor(Math.random() * descs.length)]
                    };
                }
                case 'Treasure': {
                    const names = [
                        '차원 격리 보물고', '시공의 은닉 궤짝', '순수 마정석 결정 광맥', '태고의 유물 보관소',
                        '공허의 숨겨진 보물함', '차원 표류자의 비고'
                    ];
                    const subtitles = ['숨겨진 보물 상자', '진귀한 보화', '순도 높은 마정석 보고', '보물 상자 발견'];
                    const descs = [
                        '차원의 틈새에 봉인되어 있던 고대의 황금 상자가 온전하게 놓여 있습니다.',
                        '공간 왜곡 속에서 응축된 순수 마정석 결정체가 벽면 전체에 박혀 있습니다.',
                        '오래전 차원 탐험에 나섰던 선구자들이 남겨둔 귀중한 자원이 보관되어 있습니다.'
                    ];
                    const baseGold = 10000 + dungeon.level * 250 + floor * 5000;
                    const baseStone = 3 + Math.floor(dungeon.level / 15) + floor * 2;
                    return {
                        name: names[Math.floor(Math.random() * names.length)],
                        subtitle: subtitles[Math.floor(Math.random() * subtitles.length)],
                        description: descs[Math.floor(Math.random() * descs.length)],
                        treasureData: {
                            gold: baseGold + Math.floor(Math.random() * 5000),
                            manaStone: baseStone + Math.floor(Math.random() * 3),
                            gems: floor >= 2 ? 1 : 0
                        }
                    };
                }
                case 'Rest': {
                    const names = [
                        '정화의 차원 안식처', '고요한 마력 샘터', '시공 안정 지대', '차원 정화 성역',
                        '달빛 차원 휴식처', '신비한 결계 안식터'
                    ];
                    const subtitles = ['안전 지대 (휴식)', '차원 안정 구역', '정화의 마력 샘터', '결전 전초 안전 구역'];
                    const descs = [
                        '차원의 균열이 잠잠해지고 신비로운 정화의 기운이 맴도는 안전한 안식처입니다.',
                        '향긋한 차원의 약초 내음이 피어올라 지친 파티원들의 기력을 회복시켜 줍니다.',
                        '강력한 수호 결계가 둘러쳐져 마물들의 접근이 차단된 안전 지대입니다.'
                    ];
                    return {
                        name: names[Math.floor(Math.random() * names.length)],
                        subtitle: subtitles[Math.floor(Math.random() * subtitles.length)],
                        description: descs[Math.floor(Math.random() * descs.length)]
                    };
                }
                case 'Event': {
                    const names = [
                        '차원 마력 제단', '공허 현자의 은신처', '시공간 비전 비석', '신비한 영혼의 성소'
                    ];
                    const subtitles = ['차원 신비 축복', '비전 마법의 가르침', '최후의 결전 축복', '기연 / 제단 축복'];
                    const descs = [
                        '고대 차원 제어 마법진이 새겨진 제단입니다. 강력한 축복의 에너지가 소용돌이칩니다.',
                        '시공간을 연구하던 고대 마법사의 사념이 머무는 신비한 서고입니다.',
                        '신비로운 룬 문자가 빛나는 비석입니다. 수호의 힘을 흡수할 수 있습니다.'
                    ];
                    return {
                        name: names[Math.floor(Math.random() * names.length)],
                        subtitle: subtitles[Math.floor(Math.random() * subtitles.length)],
                        description: descs[Math.floor(Math.random() * descs.length)],
                        eventData: {
                            title: '차원 제단의 신비로운 축복',
                            optionA: {
                                label: '차원 수호 기운 수렴',
                                desc: `파티 전원 체력과 마력 70% 즉시 회복 및 고대 주화 +${(12000 + floor * 4000).toLocaleString()} 골드 획득`,
                                type: (floor >= 3 ? 'fullHeal' : 'heal') as 'heal' | 'fullHeal'
                            },
                            optionB: {
                                label: '차원 마력 각인 흡수',
                                desc: `마정석 ${5 + floor * 2}개 획득 및 파티 전체 경험치 +${(6000 + floor * 2500).toLocaleString()}`,
                                type: 'manaStone' as const
                            }
                        }
                    };
                }
                case 'Boss': {
                    return {
                        name: `최종 결전: ${dungeon.boss.name}의 둥지`,
                        subtitle: '던전 최종 보스',
                        description: '거대한 마력의 압박감이 온몸을 짓누릅니다. 인스턴트 던전의 지배자가 당신을 기다리고 있습니다.'
                    };
                }
                default: {
                    return {
                        name: '일반 구역',
                        subtitle: '탐색 구역',
                        description: '어두운 구역입니다.'
                    };
                }
            }
        };

        const createRandomizedNodesForFloor = (
            floor: number,
            slots: { slotIndex: number; nextIds: string[] }[],
            candidateTypes: DungeonNodeType[]
        ): DungeonBranchNode[] => {
            const shuffledTypes = shuffleArray(candidateTypes);
            return slots.map((s, idx) => {
                const type = shuffledTypes[idx % shuffledTypes.length];
                const data = createNodeData(type, floor, s.slotIndex);
                return {
                    id: `${floor}-${s.slotIndex}`,
                    floor,
                    slotIndex: s.slotIndex,
                    type,
                    name: data.name,
                    subtitle: data.subtitle,
                    description: data.description,
                    isCompleted: false,
                    isCurrent: false,
                    nextIds: s.nextIds,
                    treasureData: data.treasureData,
                    eventData: data.eventData
                };
            });
        };

        // ==========================================
        // 4개 층(Floor 0 ~ 3) 인스턴트 분기 던전 구성
        // ==========================================
        newNodes.push(...createRandomizedNodesForFloor(0, [
            { slotIndex: 0, nextIds: ['1-0', '1-1'] },
            { slotIndex: 1, nextIds: ['1-1', '1-2'] }
        ], ['Combat', 'Combat', 'Treasure', 'Event', 'Rest']));

        newNodes.push(...createRandomizedNodesForFloor(1, [
            { slotIndex: 0, nextIds: ['2-0', '2-1'] },
            { slotIndex: 1, nextIds: ['2-0', '2-1', '2-2'] },
            { slotIndex: 2, nextIds: ['2-1', '2-2'] }
        ], ['Combat', 'Treasure', 'Rest', 'Event', 'MiniBoss']));

        newNodes.push(...createRandomizedNodesForFloor(2, [
            { slotIndex: 0, nextIds: ['3-0'] },
            { slotIndex: 1, nextIds: ['3-0'] },
            { slotIndex: 2, nextIds: ['3-0'] }
        ], ['MiniBoss', 'Treasure', 'Rest', 'Event', 'Combat']));

        newNodes.push(...createRandomizedNodesForFloor(3, [
            { slotIndex: 0, nextIds: [] }
        ], ['Boss']));

        const newChar = { ...character };
        newChar.dungeonProgress = {
            currentIndex: 0,
            currentNodeId: undefined,
            selectedPath: [],
            currentFloor: 0,
            nodes: newNodes,
            nation: dungeon.nation,
            dungeonId: dungeon.id
        };
        onUpdateCharacter(newChar, `[인스턴트 던전] ${dungeon.name} 분기 탐험을 시작합니다.`);

        setNodes(newNodes);
        setSelectedNodeId('0-0');
        setIsGenerating(false);
    };

    const dp = character.dungeonProgress;
    const selectedPath = dp?.selectedPath || [];
    const lastCompletedNodeId = selectedPath.length > 0 ? selectedPath[selectedPath.length - 1] : null;
    const lastCompletedNode = nodes.find(n => n.id === lastCompletedNodeId);

    // 현재 선택 가능한 노드 ID 목록 산출
    let selectableNodeIds: string[] = [];
    const currentNode = nodes.find(n => n.isCurrent);
    if (currentNode) {
        selectableNodeIds = [currentNode.id];
    } else if (selectedPath.length === 0) {
        selectableNodeIds = nodes.filter(n => n.floor === 0).map(n => n.id);
    } else if (lastCompletedNode) {
        selectableNodeIds = lastCompletedNode.nextIds.filter(nextId => !selectedPath.includes(nextId));
    }

    const isRaidCleared = nodes.length > 0 && nodes.find(n => n.type === 'Boss')?.isCompleted === true;
    const activeTargetNode = nodes.find(n => n.id === selectedNodeId) || nodes.find(n => selectableNodeIds.includes(n.id)) || nodes[0];

    // 선택 가능한 노드가 바뀌었을 때 자동 포커스
    useEffect(() => {
        if (!selectedNodeId || !selectableNodeIds.includes(selectedNodeId)) {
            if (selectableNodeIds.length > 0) {
                setSelectedNodeId(selectableNodeIds[0]);
            }
        }
    }, [selectableNodeIds.join(',')]);

    const handleSelectRouteAndEnter = (node: DungeonBranchNode) => {
        if (!selectableNodeIds.includes(node.id) && !node.isCompleted) {
            return;
        }

        if (node.type === 'Rest') {
            handleRestNode(node);
        } else if (node.type === 'Treasure') {
            handleTreasureNode(node);
        } else if (node.type === 'Event') {
            const updatedNodes = nodes.map(n => n.id === node.id ? { ...n, isCurrent: true } : n);
            setNodes(updatedNodes);
            
            const newChar = { ...character };
            if (newChar.dungeonProgress) {
                newChar.dungeonProgress.nodes = updatedNodes;
                newChar.dungeonProgress.currentNodeId = node.id;
                newChar.dungeonProgress.currentFloor = node.floor;
            }
            onUpdateCharacter(newChar, `[던전 기연] 기연 구역에 진입했습니다.`);
            setSelectedNodeId(node.id);
        } else {
            // Combat / MiniBoss / Boss 전투 시작
            handleBattleStart(node);
        }
    };

    const handleBattleStart = (node: DungeonBranchNode) => {
        let enemies: Enemy[] = [];
        const dungeonMonsters = dungeon.monsters && dungeon.monsters.length > 0 ? dungeon.monsters : [];

        if (node.type === 'Boss') {
            const bossName = dungeon.boss.name?.includes('[BOSS]') ? dungeon.boss.name : `[BOSS] ${dungeon.boss.name}`;
            const bossVisual = dungeon.boss.visualUrl || getMonsterInfo(dungeon.boss.name).visualUrl;
            const boss: Enemy = { ...dungeon.boss, name: bossName, isBoss: true, visualUrl: bossVisual };
            const minions: Enemy[] = [];
            
            if (dungeonMonsters.length > 0) {
                for (let i = 0; i < 2; i++) {
                    const baseMonster = dungeonMonsters[Math.floor(Math.random() * dungeonMonsters.length)];
                    const minionLevel = Math.max(1, Math.floor((boss.level || dungeon.level) * 0.75));
                    const minionVisual = baseMonster.visualUrl || getMonsterInfo(baseMonster.name).visualUrl;
                    const minion: Enemy = {
                        ...baseMonster,
                        name: `[호위] ${baseMonster.name}`,
                        level: minionLevel,
                        maxHp: Math.floor(baseMonster.maxHp * 1.2),
                        hp: Math.floor(baseMonster.maxHp * 1.2),
                        visualUrl: minionVisual
                    };
                    minions.push(minion);
                }
            }
            enemies = [boss, ...minions];
            onUpdateCharacter(character, `[최종 결전] ${dungeon.boss.name}와의 사투를 시작합니다.`);
        } else if (node.type === 'MiniBoss') {
            if (dungeonMonsters.length > 0) {
                const baseMonster = dungeonMonsters[Math.floor(Math.random() * dungeonMonsters.length)];
                const miniBossVisual = baseMonster.visualUrl || getMonsterInfo(baseMonster.name).visualUrl;
                const miniBoss: Enemy = { 
                    ...baseMonster, 
                    name: `[수호자] ${baseMonster.name}`, 
                    level: (baseMonster.level || dungeon.level) + 4,
                    maxHp: baseMonster.maxHp * 3,
                    hp: baseMonster.maxHp * 3,
                    visualUrl: miniBossVisual
                };
                
                const minionBase = dungeonMonsters[Math.floor(Math.random() * dungeonMonsters.length)];
                const minionVisual = minionBase.visualUrl || getMonsterInfo(minionBase.name).visualUrl;
                const minion: Enemy = {
                    ...minionBase,
                    name: `[경비병] ${minionBase.name}`,
                    level: Math.max(1, (baseMonster.level || dungeon.level) - 2),
                    visualUrl: minionVisual
                };
                enemies = [miniBoss, minion];
            } else {
                const fallbackVisual = dungeon.boss.visualUrl || getMonsterInfo(dungeon.boss.name).visualUrl;
                enemies = [{ ...dungeon.boss, level: Math.max(1, Math.floor(dungeon.level * 0.7)), maxHp: Math.floor(dungeon.boss.maxHp * 0.5), hp: Math.floor(dungeon.boss.maxHp * 0.5), visualUrl: fallbackVisual }];
            }
            onUpdateCharacter(character, `[던전 탐색] 관문을 지키는 정예 수호자와 마주쳤습니다!`);
        } else {
            // 일반 전투
            const count = 2 + Math.floor(Math.random() * 2);
            if (dungeonMonsters.length > 0) {
                for (let i = 0; i < count; i++) {
                    const baseMonster = dungeonMonsters[Math.floor(Math.random() * dungeonMonsters.length)];
                    const calculatedLevel = Math.max(1, (baseMonster.level || dungeon.level) + Math.floor(Math.random() * 3) - 1);
                    const monVisual = baseMonster.visualUrl || getMonsterInfo(baseMonster.name).visualUrl;
                    const enemy: Enemy = {
                        ...baseMonster,
                        level: calculatedLevel,
                        visualUrl: monVisual
                    };
                    enemies.push(enemy);
                }
            } else {
                const fallbackVisual = dungeon.boss.visualUrl || getMonsterInfo(dungeon.boss.name).visualUrl;
                enemies = [{ ...dungeon.boss, level: Math.max(1, Math.floor(dungeon.level * 0.5)), maxHp: Math.floor(dungeon.boss.maxHp * 0.3), hp: Math.floor(dungeon.boss.maxHp * 0.3), visualUrl: fallbackVisual }];
            }
            onUpdateCharacter(character, `[던전 탐색] ${node.name} 구역에서 마물 무리를 발견했습니다.`);
        }

        // 이름 중복 처리
        const nameCounts: Record<string, number> = {};
        enemies.forEach(e => { nameCounts[e.name] = (nameCounts[e.name] || 0) + 1; });
        const finalEnemies = enemies.map((e, idx) => {
            if (nameCounts[e.name] > 1) {
                const currentOccurence = enemies.slice(0, idx + 1).filter(prev => prev.name === e.name).length;
                return { ...e, name: `${e.name} ${String.fromCharCode(64 + currentOccurence)}` };
            }
            return e;
        });

        // 상태 저장 후 전투 시작
        const newChar = { ...character };
        if (newChar.dungeonProgress) {
            newChar.dungeonProgress.currentNodeId = node.id;
            newChar.dungeonProgress.currentFloor = node.floor;
            newChar.dungeonProgress.nodes = nodes.map(n => n.id === node.id ? { ...n, isCurrent: true } : n);
        }
        onBattle(finalEnemies, 'instant_dungeon');
    };

    const handleRestNode = (node: DungeonBranchNode) => {
        const newChar = { ...character };
        const pFinal = calculateFinalStats(newChar).finalStats;
        newChar.stats.hp = Math.min(pFinal.maxHp, newChar.stats.hp + Math.floor(pFinal.maxHp * 0.35));
        newChar.stats.mp = Math.min(pFinal.maxMp, newChar.stats.mp + Math.floor(pFinal.maxMp * 0.35));

        if (newChar.companions && newChar.companions.length > 0) {
            newChar.companions = newChar.companions.map(comp => {
                const cFinal = calculateFinalStats(comp).finalStats;
                return {
                    ...comp,
                    stats: {
                        ...comp.stats,
                        hp: Math.min(cFinal.maxHp, comp.stats.hp + Math.floor(cFinal.maxHp * 0.35)),
                        mp: Math.min(cFinal.maxMp, comp.stats.mp + Math.floor(cFinal.maxMp * 0.35))
                    }
                };
            });
        }

        const updatedNodes = nodes.map(n => n.id === node.id ? { ...n, isCompleted: true, isCurrent: false } : n);
        const updatedPath = [...selectedPath, node.id];

        if (newChar.dungeonProgress) {
            newChar.dungeonProgress.nodes = updatedNodes;
            newChar.dungeonProgress.selectedPath = updatedPath;
            newChar.dungeonProgress.currentNodeId = undefined;
            newChar.dungeonProgress.currentFloor = node.floor;
        }

        setNodes(updatedNodes);
        setEventNotice({
            title: '안전 지대 휴식 완료',
            desc: '신비로운 차원의 안식처에서 파티원들의 체력과 마력을 35% 회복했습니다.',
            items: [
                { label: '체력 회복', value: `+${Math.floor(pFinal.maxHp * 0.35)}` },
                { label: '마력 회복', value: `+${Math.floor(pFinal.maxMp * 0.35)}` }
            ]
        });

        onUpdateCharacter(newChar, `[던전 휴식] '${node.name}'에서 휴식을 취해 파티의 기력을 회복했습니다.`);
    };

    const handleTreasureNode = (node: DungeonBranchNode) => {
        const newChar = { ...character };
        const goldGain = node.treasureData?.gold || (10000 + dungeon.level * 200);
        const manaStoneGain = node.treasureData?.manaStone || 3;

        newChar.money = (newChar.money || 0) + goldGain;
        if (newChar.base && newChar.base.resources) {
            newChar.base.resources.manaStone = (newChar.base.resources.manaStone || 0) + manaStoneGain;
        }

        const updatedNodes = nodes.map(n => n.id === node.id ? { ...n, isCompleted: true, isCurrent: false } : n);
        const updatedPath = [...selectedPath, node.id];

        if (newChar.dungeonProgress) {
            newChar.dungeonProgress.nodes = updatedNodes;
            newChar.dungeonProgress.selectedPath = updatedPath;
            newChar.dungeonProgress.currentNodeId = undefined;
            newChar.dungeonProgress.currentFloor = node.floor;
        }

        setNodes(updatedNodes);
        setEventNotice({
            title: '비밀 보물 획득!',
            desc: `'${node.name}'에서 차원 보물 궤짝을 발견하여 진귀한 보화를 확보했습니다.`,
            items: [
                { label: '획득 골드', value: `+${goldGain.toLocaleString()} 골드` },
                { label: '획득 마정석', value: `+${manaStoneGain} 개` }
            ]
        });

        onUpdateCharacter(newChar, `[던전 보물] '${node.name}'에서 보물 상자를 열어 ${goldGain.toLocaleString()} 골드 및 마정석 ${manaStoneGain}개를 획득했습니다.`);
    };

    const handleEventOption = (node: DungeonBranchNode, optionKey: 'A' | 'B') => {
        const newChar = { ...character };
        const opt = optionKey === 'A' ? node.eventData?.optionA : node.eventData?.optionB;
        if (!opt) return;

        let resultDesc = '';
        const items: { label: string; value: string }[] = [];

        if (opt.type === 'heal' || opt.type === 'fullHeal') {
            const isFull = opt.type === 'fullHeal';
            const healRatio = isFull ? 1.0 : 0.7;
            const goldGain = isFull ? 25000 : (12000 + node.floor * 4000);

            const pFinal = calculateFinalStats(newChar).finalStats;
            newChar.stats.hp = Math.min(pFinal.maxHp, newChar.stats.hp + Math.floor(pFinal.maxHp * healRatio));
            newChar.stats.mp = Math.min(pFinal.maxMp, newChar.stats.mp + Math.floor(pFinal.maxMp * healRatio));
            newChar.money = (newChar.money || 0) + goldGain;

            if (newChar.companions && newChar.companions.length > 0) {
                newChar.companions = newChar.companions.map(comp => {
                    const cFinal = calculateFinalStats(comp).finalStats;
                    return {
                        ...comp,
                        stats: {
                            ...comp.stats,
                            hp: Math.min(cFinal.maxHp, comp.stats.hp + Math.floor(cFinal.maxHp * healRatio)),
                            mp: Math.min(cFinal.maxMp, comp.stats.mp + Math.floor(cFinal.maxMp * healRatio))
                        }
                    };
                });
            }

            resultDesc = `차원 수호의 기운을 수렴하여 파티 전원의 체력과 마력을 ${Math.floor(healRatio * 100)}% 회복하고 고대 주화를 획득했습니다.`;
            items.push(
                { label: '체력/마력 회복', value: `+${Math.floor(healRatio * 100)}%` },
                { label: '획득 골드', value: `+${goldGain.toLocaleString()} 골드` }
            );
        } else if (opt.type === 'manaStone') {
            const manaGain = 5 + node.floor * 2;
            const expGain = 6000 + node.floor * 2500;

            if (newChar.base && newChar.base.resources) {
                newChar.base.resources.manaStone = (newChar.base.resources.manaStone || 0) + manaGain;
            }
            newChar.currentExp = (newChar.currentExp || 0) + expGain;
            resultDesc = `차원 마력 각인을 흡수하여 순수 마정석 ${manaGain}개를 얻고 경험치 ${expGain.toLocaleString()}을 획득했습니다.`;
            items.push(
                { label: '마정석', value: `+${manaGain} 개` },
                { label: '경험치', value: `+${expGain.toLocaleString()}` }
            );
        }

        const updatedNodes = nodes.map(n => n.id === node.id ? { ...n, isCompleted: true, isCurrent: false } : n);
        const updatedPath = [...selectedPath, node.id];

        if (newChar.dungeonProgress) {
            newChar.dungeonProgress.nodes = updatedNodes;
            newChar.dungeonProgress.selectedPath = updatedPath;
            newChar.dungeonProgress.currentNodeId = undefined;
            newChar.dungeonProgress.currentFloor = node.floor;
        }

        setNodes(updatedNodes);
        setEventNotice({
            title: opt.label,
            desc: resultDesc,
            items
        });

        onUpdateCharacter(newChar, `[던전 기연] '${node.name}'에서 [${opt.label}]을 선택하여 축복을 받았습니다.`);
    };

    const handleExitDungeon = () => {
        const newChar = { ...character };
        newChar.dungeonProgress = undefined;
        onUpdateCharacter(newChar, "[시스템] 던전에서 퇴각했습니다.");
        onClose();
    };

    const handleClearDungeon = () => {
        const newChar = { ...character };

        // 전리품 인벤토리에 지급 (이름 누락 방지 및 정규화)
        if (dungeon.loot && dungeon.loot.length > 0) {
            if (!newChar.inventory) newChar.inventory = [];
            dungeon.loot.forEach(item => {
                const itemName = item.name || (item as any).item || '심연의 정수';
                const cleanItem = { ...item } as any;
                delete cleanItem.item;
                newChar.inventory.push({
                    ...cleanItem,
                    name: itemName
                } as Item);
            });
        }

        // 던전 목록에서 제거
        onClear(dungeon.id);

        newChar.dungeonProgress = undefined;
        onUpdateCharacter(newChar, `[던전 정복] ${dungeon.name}을(를) 정복하고 전리품을 획득했습니다!`);
        onClose();
    };

    // 실종자 및 실종 군인 수색 및 구출 액션
    const handleRescueSurvivor = (questId: string) => {
        let newChar = JSON.parse(JSON.stringify(character)) as Character;
        const isMercenary = !!(newChar.mercenaryData?.activeQuests?.some(q => q.id === questId));
        const isMilitary = !!(newChar.militaryData?.activeMissions?.some(m => m.id === questId));
        if (!isMercenary && !isMilitary) return;

        // 퀘스트 완료 가능 상태로 변경
        if (isMilitary && newChar.militaryData) {
            newChar.militaryData.activeMissions = newChar.militaryData.activeMissions.map(m => {
                if (m.id === questId) {
                    return { ...m, currentAmount: m.targetAmount || 1 };
                }
                return m;
            });
        }

        if (isMercenary && newChar.mercenaryData) {
            newChar.mercenaryData.activeQuests = newChar.mercenaryData.activeQuests.map(q => {
                if (q.id === questId) {
                    return { ...q, currentAmount: q.targetAmount || 1 };
                }
                return q;
            });
        }

        const { rescuedPerson, modalInfo, rewardGold, rewardItem } = createRescuedPersonData(character, isMercenary ? '용병' : '군대');

        if (rewardGold > 0) {
            newChar.money += rewardGold;
        }

        if (rewardItem) {
            if (!newChar.inventory) newChar.inventory = [];
            newChar.inventory.push(rewardItem);
        }

        const existingSocial = newChar.socialNetwork || [];
        if (!existingSocial.some(p => p.name === rescuedPerson.name)) {
            newChar.socialNetwork = [...existingSocial, rescuedPerson];
        }

        setRescuedModalInfo(modalInfo);

        onUpdateCharacter(newChar, `[구출 성공] 던전 실종자 ${rescuedPerson.name}(Lv.${rescuedPerson.level}, ${modalInfo.jobName})을(를) 무사히 구조했습니다! (사례금: ${rewardGold.toLocaleString()} 골드, 보답품: ${rewardItem.name} 획득)`);
    };

    // 층별 노드 그룹화
    const floorsMap: Record<number, DungeonBranchNode[]> = {};
    nodes.forEach(n => {
        if (!floorsMap[n.floor]) floorsMap[n.floor] = [];
        floorsMap[n.floor].push(n);
    });
    const floorKeys = Object.keys(floorsMap).map(Number).sort((a, b) => a - b);

    // 안개 노드 판별
    const getDisplayNode = (node: DungeonBranchNode): DungeonBranchNode => {
        if (node.isCompleted || node.isCurrent || node.type === 'Boss') {
            return node;
        }
        if (selectableNodeIds.includes(node.id)) {
            return node;
        }
        const currentSelectedFloor = activeTargetNode ? activeTargetNode.floor : 0;
        if (node.floor <= currentSelectedFloor + 1) {
            return node;
        }
        return {
            ...node,
            type: 'Unknown' as any,
            name: '미지의 구역',
            subtitle: '안개 속 탐색 구역',
            description: '아직 안개에 싸여 내부를 알 수 없는 구역입니다. 이전 구역을 돌파하면 드러납니다.'
        };
    };

    const getNodeIcon = (type: DungeonNodeType | 'Unknown', size = 18) => {
        switch (type) {
            case 'Boss': return <Crown size={size} className="text-red-400" />;
            case 'MiniBoss': return <Skull size={size} className="text-rose-400" />;
            case 'Rest': return <Coffee size={size} className="text-emerald-400" />;
            case 'Treasure': return <Gift size={size} className="text-yellow-400" />;
            case 'Event': return <Sparkles size={size} className="text-cyan-400" />;
            case 'Unknown': return <HelpCircle size={size} className="text-slate-400" />;
            default: return <Sword size={size} className="text-purple-400" />;
        }
    };

    const getNodeTypeLabel = (type: DungeonNodeType | 'Unknown') => {
        switch (type) {
            case 'Boss': return '최종 보스';
            case 'MiniBoss': return '정예 수호자';
            case 'Rest': return '안전 휴식처';
            case 'Treasure': return '보물 창고';
            case 'Event': return '차원 기연';
            case 'Unknown': return '미확인 노드';
            default: return '일반 전투';
        }
    };

    if (!isOpen || !dungeon) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md p-2 sm:p-4 animate-in fade-in">
            <div className="bg-slate-950 border-2 w-full max-w-5xl h-[94vh] max-h-[860px] rounded-3xl flex flex-col overflow-hidden relative shadow-2xl border-purple-600 shadow-[0_0_50px_rgba(147,51,234,0.3)]">
                
                {/* 배경 일러스트 효과 */}
                <div className="absolute top-0 left-0 w-full h-full opacity-15 pointer-events-none">
                    <div className="absolute inset-0 bg-gradient-to-b from-purple-950/40 via-slate-950/90 to-slate-950"></div>
                </div>

                {/* 헤더 */}
                <div className="p-4 sm:p-5 border-b flex justify-between items-center shrink-0 z-10 border-purple-900/40 bg-purple-950/30">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-2xl border bg-purple-950/60 border-purple-500/40 text-purple-400 shadow-lg shadow-purple-950">
                            <Compass size={24} className="animate-spin-slow" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-lg sm:text-xl font-bold tracking-tight font-cinzel text-purple-100">
                                    {dungeon.name}
                                </h2>
                                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase border bg-purple-950 text-purple-300 border-purple-600">
                                    인스턴트 던전 • 권장 레벨 {dungeon.level}
                                </span>
                            </div>
                            <p className="text-xs text-slate-400 font-medium">
                                {dungeon.city} ({dungeon.nation}) • 진행 루트: <span className="text-purple-300 font-bold">{selectedPath.length}개 구역 돌파</span>
                            </p>
                        </div>
                    </div>
                    {!isRaidCleared && (
                        <button 
                            onClick={onClose} 
                            className="text-slate-400 hover:text-white p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 transition-colors"
                        >
                            <X size={20}/>
                        </button>
                    )}
                </div>

                {/* 메인 컨텐츠 영역 */}
                {isGenerating ? (
                    <div className="flex-1 flex flex-col items-center justify-center space-y-4 z-10">
                        <Loader2 className="animate-spin text-purple-500" size={48} />
                        <p className="text-purple-400 font-mono animate-pulse">차원 균열 분석 및 분기 경로 생성 중...</p>
                    </div>
                ) : isRaidCleared ? (
                    /* 던전 완전 클리어 화면 */
                    <div className="flex-1 flex flex-col items-center p-6 sm:p-8 space-y-5 text-center animate-in zoom-in z-10 overflow-y-auto custom-scrollbar">
                        <Trophy size={72} className="text-amber-400 animate-bounce drop-shadow-[0_0_30px_rgba(250,204,21,0.6)] shrink-0 mt-2" />
                        <h3 className="text-3xl sm:text-4xl font-bold text-white font-cinzel tracking-tight">인스턴트 던전 정복</h3>
                        <p className="text-purple-200 text-base sm:text-lg font-bold">
                            "{dungeon.boss.name}"을(를) 격퇴하고 차원의 위협을 완전히 소멸시켰습니다!
                        </p>
                        
                        {dungeon.loot && dungeon.loot.length > 0 && (
                            <div className="p-5 bg-slate-900/90 border border-purple-600/50 rounded-2xl max-w-lg w-full shadow-xl flex flex-col items-center">
                                <span className="text-xs text-amber-400 uppercase tracking-wider font-bold mb-3 flex items-center">
                                    <Sparkles size={14} className="mr-1.5"/> 획득 전리품
                                </span>
                                <div className="w-full space-y-2.5">
                                    {dungeon.loot.map((lootItem, idx) => (
                                        <div key={idx} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 flex gap-3 text-left">
                                            <div className={`w-12 h-12 rounded-lg border flex items-center justify-center bg-black/50 shrink-0 ${lootItem.rarity === ItemRarity.LEGENDARY ? 'border-amber-500 shadow-lg shadow-amber-500/20' : 'border-purple-500'}`}>
                                                <Star size={20} className={lootItem.rarity === ItemRarity.LEGENDARY ? 'text-amber-400' : 'text-purple-400'} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between items-center">
                                                    <h4 className="font-bold text-slate-100 text-sm truncate">{lootItem.name || (lootItem as any).item || '전리품'}</h4>
                                                    <span className={`text-[10px] px-2 py-0.5 rounded border font-bold ${lootItem.rarity === ItemRarity.LEGENDARY ? 'bg-amber-950 text-amber-400 border-amber-500' : 'bg-purple-950 text-purple-400 border-purple-500'}`}>
                                                        {lootItem.rarity}
                                                    </span>
                                                </div>
                                                <p className="text-[11px] text-slate-400 truncate mt-0.5">"{lootItem.description}"</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        
                        <div className="w-full max-w-lg pt-3">
                            <button 
                                onClick={handleClearDungeon}
                                className="w-full py-4 bg-gradient-to-r from-purple-700 via-pink-600 to-purple-700 hover:from-purple-600 hover:via-pink-500 hover:to-purple-600 text-white font-bold rounded-2xl shadow-2xl transition-all transform hover:scale-[1.02] flex items-center justify-center gap-2 text-base"
                            >
                                <LogOut size={20}/> 보상 획득 및 던전 소멸
                            </button>
                        </div>
                    </div>
                ) : (
                    /* 분기형 던전 맵 & 갈림길 선택 탐험 인터페이스 */
                    <div className="flex-1 flex flex-col overflow-hidden z-10">
                        
                        {/* 상단: 분기 맵 네비게이터 (층별 진행도 & 노드 트리) */}
                        <div className="p-3 sm:p-4 bg-slate-950/80 border-b border-slate-900 overflow-x-auto custom-scrollbar shrink-0">
                            <div className="min-w-[640px] max-w-5xl mx-auto flex items-center justify-between gap-2 sm:gap-3 relative py-2">
                                {floorKeys.map((floorNum, fIdx) => {
                                    const floorNodes = floorsMap[floorNum] || [];
                                    const isFloorCompleted = floorNodes.some(n => selectedPath.includes(n.id));

                                    return (
                                        <div key={floorNum} className="flex-1 flex flex-col items-center relative">
                                            {/* 층 구분선 연결 */}
                                            {fIdx < floorKeys.length - 1 && (
                                                <div className={`absolute top-6 left-1/2 w-full h-0.5 -z-0 transition-colors ${isFloorCompleted ? 'bg-purple-500/60 shadow-[0_0_8px_rgba(168,85,247,0.5)]' : 'bg-slate-800'}`}></div>
                                            )}

                                            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                                                {floorNum === floorKeys.length - 1 ? '보스' : `${floorNum + 1}구역`}
                                            </div>

                                            {/* 해당 층의 노드들 */}
                                            <div className="flex flex-col gap-2.5 z-10">
                                                {floorNodes.map(rawNode => {
                                                    const node = getDisplayNode(rawNode);
                                                    const isCompleted = selectedPath.includes(node.id);
                                                    const isSelectable = selectableNodeIds.includes(node.id);
                                                    const isSelected = selectedNodeId === node.id;

                                                    return (
                                                        <button
                                                            key={node.id}
                                                            onClick={() => {
                                                                if (isSelectable || isCompleted || isSelected) {
                                                                    setSelectedNodeId(node.id);
                                                                }
                                                            }}
                                                            className={`
                                                                relative w-11 h-11 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center transition-all duration-300
                                                                ${isCompleted 
                                                                    ? 'bg-purple-950/80 border-2 border-purple-500 text-purple-300 shadow-md shadow-purple-950/50' 
                                                                    : isSelectable 
                                                                        ? isSelected 
                                                                            ? 'bg-purple-600 border-2 border-pink-300 text-white scale-110 shadow-[0_0_20px_rgba(168,85,247,0.7)] animate-pulse' 
                                                                            : 'bg-slate-900 border-2 border-purple-500/70 text-purple-300 hover:scale-105 shadow-md shadow-purple-900/30 ring-2 ring-purple-500/30' 
                                                                        : isSelected
                                                                            ? 'bg-slate-800 border-2 border-slate-500 text-white'
                                                                            : 'bg-slate-950/80 border border-slate-800 text-slate-600 opacity-60 cursor-not-allowed'}
                                                            `}
                                                        >
                                                            {getNodeIcon(node.type, 18)}
                                                            {isCompleted && (
                                                                <div className="absolute -top-1 -right-1 bg-purple-500 text-slate-950 rounded-full p-0.5">
                                                                    <Check size={10} strokeWidth={3} />
                                                                </div>
                                                            )}
                                                            {isSelectable && !isCompleted && (
                                                                <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                                                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                                                                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-purple-500"></span>
                                                                </span>
                                                            )}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* 중앙/하단: 현재 갈림길 선택 및 진입 카드 패널 */}
                        <div className="flex-1 p-3 sm:p-5 overflow-y-auto custom-scrollbar flex flex-col justify-between">
                            
                            {/* 이벤트 알림 팝업 */}
                            {eventNotice && (
                                <div className="mb-4 bg-slate-900 border border-purple-500/40 rounded-2xl p-4 text-center animate-in zoom-in duration-300 shadow-xl">
                                    <div className="flex items-center justify-center gap-2 mb-1">
                                        <Sparkles size={18} className="text-purple-400" />
                                        <h4 className="font-bold text-purple-200 text-base">{eventNotice.title}</h4>
                                    </div>
                                    <p className="text-xs text-slate-300 mb-3">{eventNotice.desc}</p>
                                    {eventNotice.items && eventNotice.items.length > 0 && (
                                        <div className="flex justify-center gap-4 text-xs font-bold text-purple-300 bg-black/40 py-2 px-4 rounded-xl max-w-sm mx-auto border border-purple-500/20">
                                            {eventNotice.items.map((it, i) => (
                                                <span key={i}>{it.label}: {it.value}</span>
                                            ))}
                                        </div>
                                    )}
                                    <button 
                                        onClick={() => setEventNotice(null)}
                                        className="mt-3 px-5 py-1.5 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl text-xs transition-colors"
                                    >
                                        확인 및 다음 경로 선택
                                    </button>
                                </div>
                            )}

                            {/* 활성 갈림길 선택 안내 */}
                            <div>
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        <Flame size={16} className="text-purple-500" />
                                        <h3 className="text-sm sm:text-base font-bold text-slate-200">
                                            다음 탐험할 갈림길 루트를 선택하세요
                                        </h3>
                                    </div>
                                    <span className="text-[11px] text-slate-400 font-medium">
                                        선택 가능한 경로: <span className="text-purple-400 font-bold">{selectableNodeIds.length}개</span>
                                    </span>
                                </div>

                                {/* 갈림길 선택 카드 목록 */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {nodes.filter(n => selectableNodeIds.includes(n.id)).map(rawNode => {
                                        const node = getDisplayNode(rawNode);
                                        const isSelected = selectedNodeId === node.id;
                                        return (
                                            <div
                                                key={node.id}
                                                onClick={() => setSelectedNodeId(node.id)}
                                                className={`
                                                    p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between relative overflow-hidden text-left
                                                    ${isSelected 
                                                        ? 'bg-slate-900/90 border-purple-400 shadow-[0_0_20px_rgba(168,85,247,0.25)] ring-1 ring-purple-400' 
                                                        : 'bg-slate-950/70 border-slate-800 hover:border-slate-700 hover:bg-slate-900/40'}
                                                `}
                                            >
                                                <div>
                                                    <div className="flex items-center justify-between mb-2">
                                                        <div className="flex items-center gap-2">
                                                            <div className={`p-2 rounded-xl border ${isSelected ? 'bg-purple-950/80 border-purple-500 text-purple-400' : 'bg-slate-900 border-slate-700 text-slate-400'}`}>
                                                                {getNodeIcon(node.type, 18)}
                                                            </div>
                                                            <div>
                                                                <span className="text-[10px] uppercase font-bold text-slate-400 block">{node.subtitle}</span>
                                                                <h4 className="text-sm font-bold text-slate-100">{node.name}</h4>
                                                            </div>
                                                        </div>
                                                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${node.type === 'Boss' ? 'bg-red-950 text-red-400 border-red-500' : node.type === 'MiniBoss' ? 'bg-rose-950 text-rose-400 border-rose-500' : node.type === 'Treasure' ? 'bg-yellow-950 text-yellow-400 border-yellow-500' : node.type === 'Rest' ? 'bg-emerald-950 text-emerald-400 border-emerald-500' : node.type === 'Event' ? 'bg-cyan-950 text-cyan-400 border-cyan-500' : 'bg-slate-900 text-slate-300 border-slate-700'}`}>
                                                            {getNodeTypeLabel(node.type)}
                                                        </span>
                                                    </div>
                                                    <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed mb-3">
                                                        "{node.description}"
                                                    </p>
                                                </div>

                                                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                                                    <span className="text-[10px] text-purple-300/80 font-medium">
                                                        {node.type === 'Combat' && '⚔️ 마물 소탕 및 골드/경험치'}
                                                        {node.type === 'MiniBoss' && '💀 정예 전리품 및 높은 경험치'}
                                                        {node.type === 'Rest' && '🌿 파티 체력/마력 35% 즉시 회복'}
                                                        {node.type === 'Treasure' && '🎁 골드 및 마정석/보물 획득'}
                                                        {node.type === 'Event' && '✨ 신비한 제단 축복 선택'}
                                                        {node.type === 'Boss' && '👑 최종 결전 및 던전 정복'}
                                                        {(node.type as string) === 'Unknown' && '❓ 미지의 구역 탐사'}
                                                    </span>
                                                    <span className={`text-xs font-bold flex items-center gap-1 ${isSelected ? 'text-purple-400' : 'text-slate-500'}`}>
                                                        {isSelected ? '선택됨' : '선택'} <ChevronRight size={14} />
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* 선택된 노드 상세 진입 패널 */}
                            {activeTargetNode && selectableNodeIds.includes(activeTargetNode.id) && (() => {
                                const displayActiveTargetNode = getDisplayNode(activeTargetNode);
                                const curCity = (dungeon.city || character.currentLocation?.city || '').trim();
                                const searchQuest = character.militaryData?.activeMissions?.find(m => {
                                    if (m.type !== 'MilitaryDungeonSearch' || (m.currentAmount || 0) >= (m.targetAmount || 1)) return false;
                                    const targetCity = (m.targetCity || m.location?.city || '').trim();
                                    if (!targetCity || !curCity) return false;
                                    return targetCity === curCity || curCity.includes(targetCity) || targetCity.includes(curCity);
                                }) || character.mercenaryData?.activeQuests?.find(q => {
                                    if ((q.type !== 'Rescue' && q.type !== 'MercenaryDungeonSearch') || (q.currentAmount || 0) >= (q.targetAmount || 1)) return false;
                                    const targetCity = (q.targetCity || q.location?.city || '').trim();
                                    if (!targetCity || !curCity) return false;
                                    return targetCity === curCity || curCity.includes(targetCity) || targetCity.includes(curCity);
                                });

                                const isMercenaryRescue = !!(character.mercenaryData?.activeQuests?.some(q => q.id === searchQuest?.id));

                                return (
                                <div className="mt-4 p-4 sm:p-5 bg-slate-900/95 backdrop-blur-md border border-slate-700 rounded-2xl shadow-2xl flex flex-col gap-3 sticky bottom-0 z-10">
                                    {/* 실종자 수색/구출 퀘스트 진행 중이며 해당 도시 던전일 때만 구출 패널 표시 */}
                                    {searchQuest && (displayActiveTargetNode.type === 'MiniBoss' || displayActiveTargetNode.type === 'Event' || displayActiveTargetNode.floor >= 2) && (
                                        <div className="p-3 bg-amber-950/80 border border-amber-500/80 rounded-xl flex items-center justify-between gap-2 shadow-lg animate-in fade-in">
                                            <div className="flex items-center gap-2">
                                                <ShieldAlert size={18} className="text-amber-400 shrink-0 animate-bounce" />
                                                <div>
                                                    <div className="text-xs font-bold text-amber-300">실종자 신호 감지!</div>
                                                    <div className="text-[11px] text-slate-300">
                                                        {curCity} 던전 고립 구역 근처에서 조난당한 실종자의 구조 신호가 감지되었습니다.
                                                    </div>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => handleRescueSurvivor(searchQuest.id)}
                                                className="px-3.5 py-2 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black rounded-xl text-xs shadow-md shrink-0 flex items-center gap-1 active:scale-95 transition-all"
                                            >
                                                <span>🆘 실종자 구출</span>
                                            </button>
                                        </div>
                                    )}

                                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                                        <div className="flex items-center gap-3">
                                            <div className="p-3 rounded-2xl bg-black/40 border border-purple-500/30">
                                                {getNodeIcon(displayActiveTargetNode.type, 24)}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <h3 className="text-base sm:text-lg font-bold text-white">{displayActiveTargetNode.name}</h3>
                                                    <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-purple-950 text-purple-300 border border-purple-600/40">
                                                        {getNodeTypeLabel(displayActiveTargetNode.type)}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-slate-400 mt-0.5">"{displayActiveTargetNode.description}"</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* 고대 제단 이벤트일 경우 2가지 선택지 제공 */}
                                    {displayActiveTargetNode.type === 'Event' && activeTargetNode.eventData && (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 my-1">
                                            <button
                                                onClick={() => handleEventOption(activeTargetNode, 'A')}
                                                className="p-3 bg-slate-950 hover:bg-slate-800 border border-cyan-500/40 rounded-xl text-left transition-all group"
                                            >
                                                <div className="flex items-center gap-2 font-bold text-cyan-300 text-xs mb-1">
                                                    <Sparkles size={14} /> {activeTargetNode.eventData.optionA.label}
                                                </div>
                                                <p className="text-[11px] text-slate-400 group-hover:text-slate-300">
                                                    {activeTargetNode.eventData.optionA.desc}
                                                </p>
                                            </button>
                                            <button
                                                onClick={() => handleEventOption(activeTargetNode, 'B')}
                                                className="p-3 bg-slate-950 hover:bg-slate-800 border border-purple-500/40 rounded-xl text-left transition-all group"
                                            >
                                                <div className="flex items-center gap-2 font-bold text-purple-300 text-xs mb-1">
                                                    <Zap size={14} /> {activeTargetNode.eventData.optionB.label}
                                                </div>
                                                <p className="text-[11px] text-slate-400 group-hover:text-slate-300">
                                                    {activeTargetNode.eventData.optionB.desc}
                                                </p>
                                            </button>
                                        </div>
                                    )}

                                    {/* 일반 진입 버튼 (전투, 휴식, 보물) */}
                                    {displayActiveTargetNode.type !== 'Event' && (
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handleSelectRouteAndEnter(activeTargetNode)}
                                                className={`
                                                    flex-1 py-3.5 rounded-xl font-bold text-white text-sm sm:text-base flex items-center justify-center gap-2 transition-all shadow-lg
                                                    ${displayActiveTargetNode.type === 'Boss'
                                                        ? 'bg-gradient-to-r from-red-800 via-purple-700 to-red-800 hover:from-red-700 hover:to-purple-600 shadow-red-950'
                                                        : displayActiveTargetNode.type === 'MiniBoss'
                                                            ? 'bg-gradient-to-r from-rose-800 via-purple-700 to-rose-800 hover:from-rose-700 hover:to-purple-600 shadow-rose-950'
                                                            : displayActiveTargetNode.type === 'Rest'
                                                                ? 'bg-gradient-to-r from-emerald-800 via-emerald-600 to-emerald-800 hover:from-emerald-700 hover:to-emerald-700 shadow-emerald-950'
                                                                : displayActiveTargetNode.type === 'Treasure'
                                                                    ? 'bg-gradient-to-r from-amber-700 via-amber-600 to-amber-700 hover:from-amber-600 hover:to-amber-600 shadow-amber-950'
                                                                    : 'bg-gradient-to-r from-purple-800 via-purple-600 to-purple-800 hover:from-purple-700 hover:to-purple-700 shadow-purple-950'}
                                                `}
                                            >
                                                {displayActiveTargetNode.type === 'Rest' && <Coffee size={18} />}
                                                {displayActiveTargetNode.type === 'Treasure' && <Gift size={18} />}
                                                {displayActiveTargetNode.type === 'Combat' && <Sword size={18} />}
                                                {displayActiveTargetNode.type === 'MiniBoss' && <Skull size={18} />}
                                                {displayActiveTargetNode.type === 'Boss' && <Crown size={18} />}
                                                {(displayActiveTargetNode.type as string) === 'Unknown' && <HelpCircle size={18} />}
                                                <span>
                                                    {displayActiveTargetNode.type === 'Rest' ? '안전 지대 휴식 취하기 (체력/마력 35% 회복)' : 
                                                     displayActiveTargetNode.type === 'Treasure' ? '보물 상자 개봉하기' : 
                                                     displayActiveTargetNode.type === 'Boss' ? '최종 결전 개시' : '이 루트로 탐험 진입'}
                                                </span>
                                                <ArrowRight size={18} />
                                            </button>
                                        </div>
                                    )}
                                </div>
                                );
                            })()}

                            {/* 하단 파티 상태 바 & 퇴각 버튼 */}
                            <div className="mt-4 pt-3 border-t border-slate-900 flex flex-wrap items-center justify-between gap-3 shrink-0">
                                <div className="flex items-center gap-4 text-xs font-bold text-slate-400 bg-slate-950/80 px-4 py-2 rounded-xl border border-slate-900">
                                    <span className="flex items-center text-red-400">
                                        <Heart size={14} className="mr-1.5" /> 체력: {character.stats.hp}/{character.stats.maxHp}
                                    </span>
                                    <span className="flex items-center text-blue-400">
                                        <Zap size={14} className="mr-1.5" /> 마력: {character.stats.mp}/{character.stats.maxMp}
                                    </span>
                                    <span className="flex items-center text-slate-300">
                                        <Shield size={14} className="mr-1.5 text-purple-400" /> 방어: {character.stats.def}
                                    </span>
                                </div>

                                <button
                                    onClick={handleExitDungeon}
                                    className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-red-400 hover:bg-slate-900 rounded-xl transition-colors flex items-center gap-1.5 border border-transparent hover:border-slate-800"
                                >
                                    <LogOut size={14} /> 던전 탐험 중단 및 퇴각
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* 실종자 구출 감사 모달 */}
            {rescuedModalInfo && (
                <RescueGratitudeModal
                    rescued={rescuedModalInfo}
                    onClose={() => setRescuedModalInfo(null)}
                />
            )}
        </div>
    );
};

export default InstantDungeonModal;
