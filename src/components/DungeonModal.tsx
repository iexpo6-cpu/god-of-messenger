import React, { useState, useEffect } from 'react';
import { Character, Enemy, SkillType, ItemRarity, Item, SimpleStudent, JobType, MilitaryRank } from '../types';
import { 
    X, Sword, Shield, Clock, Calendar, Sun, ChevronRight, Skull, Crown, Heart, Loader2, 
    CheckCircle2, LogOut, Trophy, Sparkles, Coffee, Zap, Gift, 
    Compass, Flame, ShieldAlert, ArrowRight, Check, HelpCircle, Gamepad2, Map
} from 'lucide-react';
import { NATION_THEMES } from '../monsterfield';
import { generateProceduralEnemy, calculateFinalStats, generateName, generateDefaultVisualUrl } from '../utils';
import { generateBossMonster, getBossByLocation, SEASONAL_BOSSES } from '../bossMonsters';
import { getMonsterInfo } from '../monsterfield';
import { START_DATE } from '../constants';
import { processTimeSkip } from '../services/timeEngine';
import { handleDungeonDefeatRecovery } from '../services/dungeonDefeatService';
import { advanceGameTime } from '../services/gameTimeService';
import { RescueGratitudeModal, RescuedPersonInfo } from './RescueGratitudeModal';
import { createRescuedPersonData } from '../services/rescuePersonService';

interface Props {
    isOpen: boolean;
    character: Character;
    onClose: () => void;
    onBattle: (enemy: Enemy | Enemy[], type?: string) => void;
    onUpdateCharacter: (newChar: Character, logMsg: string) => void;
}

export type DungeonNodeType = 'Combat' | 'MiniBoss' | 'Rest' | 'Treasure' | 'Event' | 'Boss';

export interface DungeonBranchNode {
    id: string; // e.g. "0-0", "1-0"
    floor: number;
    slotIndex: number;
    type: DungeonNodeType;
    name: string;
    subtitle: string;
    description: string;
    isCompleted: boolean;
    isCurrent: boolean;
    nextIds: string[];
    // 보물/이벤트 데이터
    treasureData?: {
        gold: number;
        manaStone: number;
        gems?: number;
    };
    eventData?: {
        title: string;
        optionA: { label: string; desc: string; type: 'heal' | 'fullHeal' | 'exp' };
        optionB: { label: string; desc: string; type: 'manaStone' | 'exp' | 'stat' };
    };
}

const DungeonModal: React.FC<Props> = ({ isOpen, character, onClose, onBattle, onUpdateCharacter }) => {
    const [viewMode, setViewMode] = useState<'2d' | 'branch'>('branch');
    const [nodes, setNodes] = useState<DungeonBranchNode[]>([]);
    const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
    const [isGenerating, setIsGenerating] = useState(true);
    const [eventNotice, setEventNotice] = useState<{ title: string; desc: string; items?: { label: string; value: string }[] } | null>(null);
    const [rescuedModalInfo, setRescuedModalInfo] = useState<RescuedPersonInfo | null>(null);
    const [dayChangeNotice, setDayChangeNotice] = useState<string | null>(null);

    const nation = character.currentLocation?.nation || character.nation;
    const currentCity = character.currentLocation?.city || "Unknown";
    const currentMonth = character.currentDate ? parseInt(character.currentDate.split('-')[1]) : 3;
    const bossInfo = getBossByLocation(nation, currentCity, currentMonth);

    const isSeasonalBoss = Boolean(bossInfo?.name && (
        bossInfo.name === "천제 환웅" || 
        bossInfo.name === "태양신 아마테라스" || 
        bossInfo.name === "황제 공손헌원" || 
        bossInfo.name === "태양신 라" || 
        bossInfo.name === "엘클" ||
        Object.values(SEASONAL_BOSSES).some(sb => sb.name === bossInfo.name)
    ));

    useEffect(() => {
        if (isOpen) {
            loadOrCreateRaid();
        }
    }, [isOpen, nation, currentCity, currentMonth, character.dungeonProgress]);

    const loadOrCreateRaid = () => {
        // 체력이 0 이하인 경우 (전투 패배 후 복귀): 던전 퇴각 처리
        if (character.stats.hp <= 0) {
            const { updatedCharacter, logMessage } = handleDungeonDefeatRecovery(character);
            onUpdateCharacter(updatedCharacter, logMessage);
            onClose();
            return;
        }

        const city = character.currentLocation?.city || "알 수 없는 도시";
        const isAlreadyCleared = character.clearedDungeonsByCity && character.clearedDungeonsByCity[city] === character.currentDate;
        if (isAlreadyCleared && !character.dungeonProgress) {
            setNodes([]);
            setIsGenerating(false);
            return;
        }

        const dp = character.dungeonProgress;
        if (dp && dp.nation === nation && dp.nodes && dp.nodes.length > 0) {
            // 구버전(단순 선형 숫자 id) 데이터인지 또는 분기형인지 확인
            const isBranchingStructure = dp.nodes.some((n: any) => typeof n.id === 'string' && n.id.includes('-'));
            const savedBossNode = dp.nodes.find((n: any) => n.type === 'Boss');
            
            if (isBranchingStructure && (!savedBossNode || !bossInfo?.name || savedBossNode.name.includes(bossInfo.name) || bossInfo.name.includes(savedBossNode.name.replace('최종 결전: ', '')))) {
                let updatedNodes = [...dp.nodes];
                let updatedPath = dp.selectedPath ? [...dp.selectedPath] : [];
                let needUpdateChar = false;

                // 전투 후 복귀 처리: currentNodeId가 있고 전투 노드인 경우 완료 처리
                let newlyObtainedLoots: any[] | null = null;
                if (dp.bossBattlePreInventory) {
                    const preCount: Record<string, number> = {};
                    dp.bossBattlePreInventory.forEach((name: string) => {
                        preCount[name] = (preCount[name] || 0) + 1;
                    });
                    const curCount: Record<string, number> = {};
                    (character.inventory || []).forEach(item => {
                        curCount[item.name] = (curCount[item.name] || 0) + 1;
                    });
                    const cLoots = bossInfo?.detailedLoot 
                        ? (Array.isArray(bossInfo.detailedLoot) ? bossInfo.detailedLoot : [bossInfo.detailedLoot]) 
                        : [];
                    newlyObtainedLoots = cLoots
                        .filter(l => {
                            const cur = curCount[l.name] || 0;
                            const prev = preCount[l.name] || 0;
                            return cur > prev;
                        })
                        .map(l => character.inventory.find(inv => inv.name === l.name) || l);
                }

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
                            // 던전 전투 패배: 던전 퇴각
                            const { updatedCharacter, logMessage } = handleDungeonDefeatRecovery(character);
                            onUpdateCharacter(updatedCharacter, logMessage);
                            onClose();
                            return;
                        }
                    }
                }

                if (needUpdateChar || newlyObtainedLoots !== null) {
                    const newChar = { ...character };
                    if (newChar.dungeonProgress) {
                        newChar.dungeonProgress.nodes = updatedNodes;
                        newChar.dungeonProgress.selectedPath = updatedPath;
                        newChar.dungeonProgress.currentNodeId = undefined;
                        if (newlyObtainedLoots !== null) {
                            newChar.dungeonProgress.obtainedBossLoots = newlyObtainedLoots;
                            newChar.dungeonProgress.bossBattlePreInventory = undefined;
                        }
                    }
                    const isBossNodeCompleted = updatedNodes.find((n: any) => n.type === 'Boss')?.isCompleted;
                    if (isBossNodeCompleted) {
                        newChar.clearedDungeonsByCity = {
                            ...(newChar.clearedDungeonsByCity || {}),
                            [city]: character.currentDate || "2000-01-01"
                        };
                    }
                    onUpdateCharacter(newChar, isBossNodeCompleted ? `[던전 정복] 던전 보스를 격퇴하고 던전의 모든 위협을 정복했습니다!` : `[던전 전투 승리] 전투 구역을 성공적으로 돌파했습니다.`);
                }

                setNodes(updatedNodes);
                setIsGenerating(false);
                
                // 선택 가능한 첫 노드 자동 선택
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
        const isMythic = isSeasonalBoss;

        const shuffleArray = <T,>(array: T[]): T[] => {
            const arr = [...array];
            for (let i = arr.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [arr[i], arr[j]] = [arr[j], arr[i]];
            }
            return arr;
        };

        const createNodeData = (type: DungeonNodeType, floor: number, slotIndex: number, bossName?: string) => {
            switch (type) {
                case 'Combat': {
                    const names = [
                        '침수된 나락 회랑', '마기 폭주 협곡', '붕괴된 외곽 성벽', '심연 마수 군락지',
                        '어둠의 석조 수로', '마력 오염 통로', '괴조의 매복 바위굴', '마물 서식처', '비탄의 석굴'
                    ];
                    const subtitles = ['일반 전투 구역', '마물 조우', '위험 구역', '진입로 탐색'];
                    const descs = [
                        '축축하고 서늘한 마기가 맴도는 어두운 석조 수로입니다. 굶주린 몬스터들이 숨어 있습니다.',
                        '거대한 기둥이 무너져 내린 고대 회랑입니다. 잔해 틈새에서 몬스터의 붉은 안광이 번뜩입니다.',
                        '마기가 폭주하여 공간이 뒤틀린 구역입니다. 포악해진 마물 무리가 길을 막고 있습니다.',
                        '던전의 마물들이 무리를 지어 서식하고 있는 위험천만한 동굴 지대입니다.'
                    ];
                    return {
                        name: names[Math.floor(Math.random() * names.length)],
                        subtitle: subtitles[Math.floor(Math.random() * subtitles.length)],
                        description: descs[Math.floor(Math.random() * descs.length)]
                    };
                }
                case 'MiniBoss': {
                    const names = [
                        '전초 관문 수호자', '심연 파괴수 서식처', '심연의 대군주 수호병', '던전 중장 정예기사',
                        '광포한 변종 마수', '심층부 최정예 파수꾼', '관문 수호자의 거처'
                    ];
                    const subtitles = ['정예 수호자', '신역 정예 수호수', '강력한 정예 적', '심층 정예 수호장'];
                    const descs = [
                        '신화와 던전의 지배자로 향하는 관문을 철통같이 지키는 거대한 수호 괴수입니다.',
                        '던전의 깊은 어둠 속에서 마력을 포식하며 비대해진 흉포한 정예 파괴수입니다.',
                        '보스의 강력한 마력에 침식되어 압도적인 위압감을 내뿜는 위험천만한 정예 마물입니다.'
                    ];
                    return {
                        name: names[Math.floor(Math.random() * names.length)],
                        subtitle: subtitles[Math.floor(Math.random() * subtitles.length)],
                        description: descs[Math.floor(Math.random() * descs.length)]
                    };
                }
                case 'Treasure': {
                    const names = [
                        '고대 봉인 보물고', '버려진 고대 병기창', '마정석 거대 광맥', '태고의 황금 비고',
                        '비밀 보물 창고', '희귀 유적 보고', '잊혀진 왕가의 금고'
                    ];
                    const subtitles = ['숨겨진 보물 상자', '희귀 병기 보고', '순도 높은 마정석 보고', '보물 상자 발견'];
                    const descs = [
                        '신전의 봉인 결계 너머에 온전하게 보존된 고대의 황금 상자가 놓여 있습니다.',
                        '고대 시대의 용사들이 남겨둔 무구와 진귀한 마정석이 묻혀 있습니다.',
                        '푸른 빛을 내뿜는 거대한 순수 마정석 광맥이 벽면 전체에 뻗어 있습니다.',
                        '오래전 모험가들이 숨겨둔 황금빛 보물 상자가 방치되어 있습니다.'
                    ];
                    const baseGold = 8000 + floor * 5000;
                    const baseStone = 3 + floor * 2;
                    return {
                        name: names[Math.floor(Math.random() * names.length)],
                        subtitle: subtitles[Math.floor(Math.random() * subtitles.length)],
                        description: descs[Math.floor(Math.random() * descs.length)],
                        treasureData: {
                            gold: baseGold + Math.floor(Math.random() * 6000),
                            manaStone: baseStone + Math.floor(Math.random() * 3),
                            gems: floor >= 3 ? 2 : 1
                        }
                    };
                }
                case 'Rest': {
                    const names = [
                        '정화의 약초 군락', '고요한 영혼의 샘터', '심층 정화 성역', '태고의 절대 안식처',
                        '달빛 치유의 안식처', '신성한 수호 결계'
                    ];
                    const subtitles = ['안전 지대 (휴식)', '심연 안전 지대', '심층 정화 샘터', '결전 전초 안전 구역'];
                    const descs = [
                        '마기가 정화된 고요한 틈새입니다. 향긋한 약초 내음이 피어올라 파티를 치유합니다.',
                        '은은한 은빛 달빛이 비치는 듯한 치유의 성역입니다. 파티가 온전히 휴식할 수 있습니다.',
                        '신성한 기운이 솟아나 마기가 침범하지 못하는 안식의 꽃밭입니다.'
                    ];
                    return {
                        name: names[Math.floor(Math.random() * names.length)],
                        subtitle: subtitles[Math.floor(Math.random() * subtitles.length)],
                        description: descs[Math.floor(Math.random() * descs.length)]
                    };
                }
                case 'Event': {
                    const names = [
                        '고대 신비의 제단', '고대 현자의 은신처', '태초의 신역 제단', '비전 마법 서고',
                        '잃어버린 신성 비석'
                    ];
                    const subtitles = ['고대 신비 축복', '비전 마법의 가르침', '최후의 결전 축복', '기연 / 고대 축복'];
                    const descs = [
                        '고대 신화의 문자가 새겨진 마법 제단입니다. 신비로운 축복의 에너지가 요동칩니다.',
                        '과거 신화적 존재를 연구하던 대마법사의 영혼이 머무는 신비한 서고입니다.',
                        '고대 문자가 빛나는 신비로운 비석입니다. 신성한 수호의 기운을 흡수할 수 있습니다.'
                    ];
                    return {
                        name: names[Math.floor(Math.random() * names.length)],
                        subtitle: subtitles[Math.floor(Math.random() * subtitles.length)],
                        description: descs[Math.floor(Math.random() * descs.length)],
                        eventData: {
                            title: '고대 신비 제단의 축복',
                            optionA: {
                                label: '고대 수호 기운 수렴',
                                desc: `파티 전원 HP/MP ${floor >= 3 ? 80 : 60}% 즉시 회복 및 고대 주화 +${(10000 + floor * 5000).toLocaleString()} G 획득`,
                                type: (floor >= 4 ? 'fullHeal' : 'heal') as 'heal' | 'fullHeal'
                            },
                            optionB: {
                                label: '고대 마력 각인 흡수',
                                desc: `마정석 ${5 + floor * 2}개 획득 및 파티 전체 경험치 +${(5000 + floor * 2000).toLocaleString()}`,
                                type: 'manaStone' as const
                            }
                        }
                    };
                }
                case 'Boss': {
                    return {
                        name: `최종 결전: ${bossName || '보스'}의 거처`,
                        subtitle: '던전 최종 보스',
                        description: '거대한 압박감이 온몸을 짓누릅니다. 던전의 지배자가 당신을 기다리고 있습니다.'
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
            candidateTypes: DungeonNodeType[],
            bossName?: string
        ): DungeonBranchNode[] => {
            const shuffledTypes = shuffleArray(candidateTypes);
            return slots.map((s, idx) => {
                const type = shuffledTypes[idx % shuffledTypes.length];
                const data = createNodeData(type, floor, s.slotIndex, bossName);
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

        if (isMythic) {
            // ==========================================
            // [시즌별 신화 보스 전용] 7개 층(Floor 0 ~ 6) 복합 분기 던전 미궁 (위치 및 타입 완전 무작위)
            // ==========================================
            newNodes.push(...createRandomizedNodesForFloor(0, [
                { slotIndex: 0, nextIds: ['1-0', '1-1'] },
                { slotIndex: 1, nextIds: ['1-0', '1-1', '1-2'] },
                { slotIndex: 2, nextIds: ['1-1', '1-2'] }
            ], ['Combat', 'Combat', 'Treasure', 'Event', 'Rest'], bossInfo?.name));

            newNodes.push(...createRandomizedNodesForFloor(1, [
                { slotIndex: 0, nextIds: ['2-0', '2-1'] },
                { slotIndex: 1, nextIds: ['2-0', '2-1', '2-2'] },
                { slotIndex: 2, nextIds: ['2-1', '2-2'] }
            ], ['Combat', 'Treasure', 'Rest', 'Event', 'MiniBoss'], bossInfo?.name));

            newNodes.push(...createRandomizedNodesForFloor(2, [
                { slotIndex: 0, nextIds: ['3-0', '3-1'] },
                { slotIndex: 1, nextIds: ['3-1', '3-2'] },
                { slotIndex: 2, nextIds: ['3-2', '3-3'] }
            ], ['MiniBoss', 'Event', 'Treasure', 'Rest', 'Combat'], bossInfo?.name));

            newNodes.push(...createRandomizedNodesForFloor(3, [
                { slotIndex: 0, nextIds: ['4-0', '4-1'] },
                { slotIndex: 1, nextIds: ['4-0', '4-1', '4-2'] },
                { slotIndex: 2, nextIds: ['4-1', '4-2'] },
                { slotIndex: 3, nextIds: ['4-1', '4-2'] }
            ], ['MiniBoss', 'Treasure', 'Event', 'Rest', 'Combat', 'MiniBoss'], bossInfo?.name));

            newNodes.push(...createRandomizedNodesForFloor(4, [
                { slotIndex: 0, nextIds: ['5-0', '5-1'] },
                { slotIndex: 1, nextIds: ['5-0', '5-1', '5-2'] },
                { slotIndex: 2, nextIds: ['5-1', '5-2'] }
            ], ['MiniBoss', 'Treasure', 'Rest', 'Event', 'Combat'], bossInfo?.name));

            newNodes.push(...createRandomizedNodesForFloor(5, [
                { slotIndex: 0, nextIds: ['6-0'] },
                { slotIndex: 1, nextIds: ['6-0'] },
                { slotIndex: 2, nextIds: ['6-0'] }
            ], ['MiniBoss', 'Event', 'Rest', 'Treasure', 'Combat'], bossInfo?.name));

            newNodes.push(...createRandomizedNodesForFloor(6, [
                { slotIndex: 0, nextIds: [] }
            ], ['Boss'], bossInfo?.name));
        } else {
            // ==========================================
            // [일반 던전] 5개 층(Floor 0 ~ 4) 표준 분기 던전 (위치 및 타입 완전 무작위)
            // ==========================================
            newNodes.push(...createRandomizedNodesForFloor(0, [
                { slotIndex: 0, nextIds: ['1-0', '1-1'] },
                { slotIndex: 1, nextIds: ['1-1', '1-2'] }
            ], ['Combat', 'Combat', 'Treasure', 'Event', 'Rest'], bossInfo?.name));

            newNodes.push(...createRandomizedNodesForFloor(1, [
                { slotIndex: 0, nextIds: ['2-0'] },
                { slotIndex: 1, nextIds: ['2-0', '2-1'] },
                { slotIndex: 2, nextIds: ['2-1'] }
            ], ['Combat', 'Treasure', 'Rest', 'Event', 'MiniBoss'], bossInfo?.name));

            newNodes.push(...createRandomizedNodesForFloor(2, [
                { slotIndex: 0, nextIds: ['3-0', '3-1'] },
                { slotIndex: 1, nextIds: ['3-1', '3-2'] }
            ], ['MiniBoss', 'Event', 'Treasure', 'Rest', 'Combat'], bossInfo?.name));

            newNodes.push(...createRandomizedNodesForFloor(3, [
                { slotIndex: 0, nextIds: ['4-0'] },
                { slotIndex: 1, nextIds: ['4-0'] },
                { slotIndex: 2, nextIds: ['4-0'] }
            ], ['MiniBoss', 'Treasure', 'Rest', 'Event', 'Combat'], bossInfo?.name));

            newNodes.push(...createRandomizedNodesForFloor(4, [
                { slotIndex: 0, nextIds: [] }
            ], ['Boss'], bossInfo?.name));
        }

        const newChar = { ...character };
        newChar.dungeonProgress = {
            currentIndex: 0,
            currentNodeId: undefined,
            selectedPath: [],
            currentFloor: 0,
            nodes: newNodes,
            nation: nation,
            obtainedBossLoots: []
        };
        onUpdateCharacter(newChar, `[던전] ${city}의 다중 분기 던전 탐험을 시작합니다.${isMythic ? ' (신화적 존재의 기운 감지! 7개 층 심연 미궁 생성)' : ''}`);

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
    const currentNode = (nodes || []).find(n => n.isCurrent);
    if (currentNode) {
        selectableNodeIds = [currentNode.id];
    } else if (selectedPath.length === 0) {
        selectableNodeIds = (nodes || []).filter(n => n.floor === 0).map(n => n.id);
    } else if (lastCompletedNode) {
        selectableNodeIds = (lastCompletedNode.nextIds || []).filter(nextId => !selectedPath.includes(nextId));
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

        // 미궁 구역 1회 수색마다 2분 소모 (완충 장치 적용)
        const timeAdvance = advanceGameTime(character, 2, {
            isDungeonOrCombat: true,
            activityName: `${node.floor}층 미궁 구역 수색`
        });
        if (timeAdvance.toastNotice) {
            setDayChangeNotice(timeAdvance.toastNotice);
            setTimeout(() => setDayChangeNotice(null), 4500);
        }
        const activeChar = timeAdvance.updatedCharacter;

        if (node.type === 'Rest') {
            handleRestNode(node, activeChar);
        } else if (node.type === 'Treasure') {
            handleTreasureNode(node, activeChar);
        } else if (node.type === 'Event') {
            // 이벤트 모달/선택지 표시를 위해 isCurrent 로 진입 확정
            const updatedNodes = nodes.map(n => n.id === node.id ? { ...n, isCurrent: true } : n);
            setNodes(updatedNodes);
            
            const newChar = { ...activeChar };
            if (newChar.dungeonProgress) {
                newChar.dungeonProgress.nodes = updatedNodes;
                newChar.dungeonProgress.currentNodeId = node.id;
                newChar.dungeonProgress.currentFloor = node.floor;
            }
            onUpdateCharacter(newChar, timeAdvance.logMessage || `[던전 기연] 기연 구역에 진입했습니다.`);
            setSelectedNodeId(node.id);
        } else {
            // Combat / MiniBoss / Boss 전투 시작
            onUpdateCharacter(activeChar, timeAdvance.logMessage || `[미궁 수색] 미궁을 탐색하여 전투 구역에 진입했습니다.`);
            handleBattleStart(node, activeChar);
        }
    };

    const handleBattleStart = (node: DungeonBranchNode, activeChar: Character = character) => {
        const theme = NATION_THEMES[nation] || NATION_THEMES.default;
        const bossLevel = Math.max(5, bossInfo?.level || 100);
        let enemies: Enemy[] = [];

        if (node.type === 'Boss') {
            const boss = generateBossMonster(nation, currentCity, currentMonth);
            const actualBossLevel = boss.level || bossLevel;
            const monsterPool = theme.monsters['advanced'] || ["심연의 마물"];
            // 보스 호위병은 보스 레벨의 50~60% 수준, 보스보다 무조건 낮음
            const minionLevel = Math.max(1, Math.min(Math.floor(actualBossLevel * 0.55), actualBossLevel - 5));
            const minions: Enemy[] = [];
            for (let i = 0; i < 2; i++) {
                const enemy = generateProceduralEnemy(minionLevel);
                const monsterName = monsterPool[Math.floor(Math.random() * monsterPool.length)];
                const minfo = getMonsterInfo(monsterName);
                enemy.name = `[보스 호위병] ${minfo.name}`;
                if (minfo.visualUrl) enemy.visualUrl = minfo.visualUrl;
                minions.push(enemy);
            }
            enemies = [boss, ...minions];
            onUpdateCharacter(activeChar, `[최종 결전] ${bossInfo?.name}와의 사투를 시작합니다.`);
        } else if (node.type === 'MiniBoss') {
            const monsterPool = theme.monsters['elite'] || ["정예 마물"];
            // 정예 수호자는 보스 레벨의 65% 수준으로 보스보다 무조건 낮음
            const miniBossLevel = Math.max(1, Math.min(Math.floor(bossLevel * 0.65), bossLevel - 5));
            const miniBoss = generateProceduralEnemy(miniBossLevel);
            const miniBossName = monsterPool[Math.floor(Math.random() * monsterPool.length)];
            const miniBossInfo = getMonsterInfo(miniBossName);
            miniBoss.name = `[수호자] ${miniBossInfo.name}`;
            if (miniBossInfo.visualUrl) miniBoss.visualUrl = miniBossInfo.visualUrl;
            miniBoss.maxHp *= 3;
            miniBoss.hp = miniBoss.maxHp;

            // 수호자 경비병은 수호자보다 낮게 설정
            const minionLevel = Math.max(1, Math.min(Math.floor(miniBossLevel * 0.6), miniBossLevel - 3));
            const minion = generateProceduralEnemy(minionLevel);
            const minionName = theme.monsters['intermediate'][Math.floor(Math.random() * theme.monsters['intermediate'].length)];
            const minionInfo = getMonsterInfo(minionName);
            minion.name = `[경비병] ${minionInfo.name}`;
            if (minionInfo.visualUrl) minion.visualUrl = minionInfo.visualUrl;
            enemies = [miniBoss, minion];
            onUpdateCharacter(character, `[던전 탐색] 관문을 지키는 정예 수호자와 마주쳤습니다!`);
        } else {
            // 일반 전투: 층수에 따라 보스 레벨의 30%~60% 수준으로 점진 증가, 정예 수호자 및 보스보다 무조건 낮음
            const monsterPool = theme.monsters['intermediate'] || ["던전 마물"];
            const maxFloor = Math.max(1, Math.max(...nodes.map(n => n.floor)) - 1);
            const progressRatio = Math.min(1, Math.max(0, node.floor) / Math.max(1, maxFloor));
            const baseLevel = Math.floor(bossLevel * (0.30 + progressRatio * 0.25)); // 30% ~ 55%
            const count = 4 + Math.floor(Math.random() * 2);
            for (let i = 0; i < count; i++) {
                const randomOffset = Math.floor(Math.random() * 4);
                const calculatedLevel = Math.max(1, Math.min(baseLevel + randomOffset, Math.floor(bossLevel * 0.6), bossLevel - 8));
                const enemy = generateProceduralEnemy(calculatedLevel);
                const monsterName = monsterPool[Math.floor(Math.random() * monsterPool.length)];
                const minfo = getMonsterInfo(monsterName);
                enemy.name = `[던전 몬스터] ${minfo.name}`;
                if (minfo.visualUrl) enemy.visualUrl = minfo.visualUrl;
                enemies.push(enemy);
            }
            onUpdateCharacter(character, `[던전 탐색] ${node.name} 구역에서 마물들과 조우했습니다.`);
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
        const newChar = { ...activeChar };
        if (newChar.dungeonProgress) {
            newChar.dungeonProgress.currentNodeId = node.id;
            newChar.dungeonProgress.currentFloor = node.floor;
            newChar.dungeonProgress.nodes = nodes.map(n => n.id === node.id ? { ...n, isCurrent: true } : n);
            if (node.type === 'Boss') {
                newChar.dungeonProgress.bossBattlePreInventory = (activeChar.inventory || []).map(i => i.name);
                newChar.dungeonProgress.obtainedBossLoots = [];
            }
        }
        onUpdateCharacter(newChar, `[던전 진입] '${node.name}' 구역에서 적들과의 전투를 시작합니다.`);
        onBattle(finalEnemies, 'dungeon');
    };

    const handleRestNode = (node: DungeonBranchNode, activeChar: Character = character) => {
        const newChar = { ...activeChar };
        const pFinal = calculateFinalStats(newChar).finalStats;
        newChar.stats.hp = Math.min(pFinal.maxHp, newChar.stats.hp + Math.floor(pFinal.maxHp * 0.35));
        newChar.stats.mp = Math.min(pFinal.maxMp, newChar.stats.mp + Math.floor(pFinal.maxMp * 0.35));

        if (newChar.companions && newChar.companions.length > 0) {
            newChar.companions = newChar.companions.map(comp => {
                if (comp.stats.hp <= 0) {
                    return comp;
                }
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
            desc: '향긋한 약초와 고요한 안식 속에서 파티원들의 체력과 마력을 35% 회복했습니다.',
            items: [
                { label: 'HP 회복', value: `+${Math.floor(pFinal.maxHp * 0.35)}` },
                { label: 'MP 회복', value: `+${Math.floor(pFinal.maxMp * 0.35)}` }
            ]
        });

        onUpdateCharacter(newChar, `[던전 휴식] '${node.name}'에서 휴식을 취해 파티의 기력을 회복했습니다.`);
    };

    const handleTreasureNode = (node: DungeonBranchNode, activeChar: Character = character) => {
        const newChar = { ...activeChar };
        const goldGain = node.treasureData?.gold || 8000;
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
            desc: `'${node.name}'에서 숨겨진 궤짝을 발견하여 진귀한 보화를 확보했습니다.`,
            items: [
                { label: '획득 골드', value: `+${goldGain.toLocaleString()} G` },
                { label: '획득 마정석', value: `+${manaStoneGain} 개` }
            ]
        });

        onUpdateCharacter(newChar, `[던전 보물] '${node.name}'에서 보물 상자를 열어 ${goldGain.toLocaleString()}G 및 마정석 ${manaStoneGain}개를 획득했습니다.`);
    };

    const handleEventOption = (node: DungeonBranchNode, optionKey: 'A' | 'B') => {
        const newChar = { ...character };
        const opt = optionKey === 'A' ? node.eventData?.optionA : node.eventData?.optionB;
        if (!opt) return;

        let resultDesc = '';
        const items: { label: string; value: string }[] = [];

        if (opt.type === 'heal' || opt.type === 'fullHeal') {
            const isFull = opt.type === 'fullHeal';
            const healRatio = isFull ? 1.0 : (node.floor >= 2 ? 0.7 : 0.6);
            const goldGain = isFull ? 30000 : (node.floor >= 2 ? 15000 : 10000);

            const pFinal = calculateFinalStats(newChar).finalStats;
            newChar.stats.hp = Math.min(pFinal.maxHp, newChar.stats.hp + Math.floor(pFinal.maxHp * healRatio));
            newChar.stats.mp = Math.min(pFinal.maxMp, newChar.stats.mp + Math.floor(pFinal.maxMp * healRatio));
            newChar.money = (newChar.money || 0) + goldGain;

            if (newChar.companions && newChar.companions.length > 0) {
                newChar.companions = newChar.companions.map(comp => {
                    if (comp.stats.hp <= 0) {
                        return comp;
                    }
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

            resultDesc = `고대 수호의 기운을 수렴하여 파티 전원의 체력과 마력을 ${Math.floor(healRatio * 100)}% 회복하고 고대 주화를 획득했습니다.`;
            items.push(
                { label: 'HP/MP 회복', value: `+${Math.floor(healRatio * 100)}%` },
                { label: '획득 골드', value: `+${goldGain.toLocaleString()} G` }
            );
        } else if (opt.type === 'manaStone') {
            const manaGain = node.floor >= 5 ? 15 : node.floor >= 3 ? 10 : (node.floor >= 2 ? 7 : 5);
            const expGain = node.floor >= 5 ? 15000 : node.floor >= 3 ? 10000 : (node.floor >= 2 ? 7000 : 5000);

            if (newChar.base && newChar.base.resources) {
                newChar.base.resources.manaStone = (newChar.base.resources.manaStone || 0) + manaGain;
            }
            newChar.currentExp = (newChar.currentExp || 0) + expGain;
            resultDesc = `고대 마력 각인을 흡수하여 순수 마정석 ${manaGain}개를 얻고 경험치 ${expGain.toLocaleString()}을 축적했습니다.`;
            items.push(
                { label: '마정석', value: `+${manaGain} 개` },
                { label: '경험치', value: `+${expGain.toLocaleString()}` }
            );
        } else if (opt.type === 'exp') {
            const expGain = 10000;
            const goldGain = 20000;
            newChar.currentExp = (newChar.currentExp || 0) + expGain;
            newChar.money = (newChar.money || 0) + goldGain;
            resultDesc = `고대 비전 지혜를 전수받아 대량의 경험치와 보화를 확보했습니다.`;
            items.push(
                { label: '경험치', value: `+${expGain.toLocaleString()}` },
                { label: '획득 골드', value: `+${goldGain.toLocaleString()} G` }
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

    // 실종자 및 실종 군인 수색 및 구출 액션
    const handleRescueSurvivor = (questId: string) => {
        let newChar = JSON.parse(JSON.stringify(character)) as Character;
        const isMercenary = !!(newChar.mercenaryData?.activeQuests?.some(q => q.id === questId));

        // 1시간(60분) 수색 및 구출 시간 전진 엔진 가동
        const timeRes = advanceGameTime(newChar, 60, { activityName: isMercenary ? '던전 실종자 수색 및 구조' : '던전 실종 군인 수색 및 구조' });
        newChar = timeRes.updatedCharacter;

        if (newChar.militaryData?.activeMissions) {
            newChar.militaryData.activeMissions = newChar.militaryData.activeMissions.map(m => {
                if (m.id === questId) {
                    return { ...m, currentAmount: m.targetAmount || 1 };
                }
                return m;
            });
        }

        if (newChar.mercenaryData?.activeQuests) {
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

    const handleExitDungeon = () => {
        const isCurrentlyCleared = isRaidCleared;
        const newChar = { ...character };
        newChar.dungeonProgress = undefined;
        if (isCurrentlyCleared) {
            newChar.clearedDungeonsByCity = {
                ...(newChar.clearedDungeonsByCity || {}),
                [city]: character.currentDate || "2000-01-01"
            };
        }
        onUpdateCharacter(newChar, isCurrentlyCleared ? "[던전 정복] 던전 공략을 완료하고 귀환했습니다." : "[시스템] 던전에서 퇴각했습니다.");
        onClose();
    };

    const handleRestAndExit = () => {
        const { updatedCharacter, systemLogs } = processTimeSkip(character, 1);
        const finalChar = { ...updatedCharacter };
        // 이전 날짜(보스를 잡은 날짜)에 대한 클리어 기록 보존
        finalChar.clearedDungeonsByCity = {
            ...(finalChar.clearedDungeonsByCity || {}),
            [city]: character.currentDate || "2000-01-01"
        };
        const pFinal = calculateFinalStats(finalChar).finalStats;
        finalChar.stats.hp = pFinal.maxHp;
        finalChar.stats.mp = pFinal.maxMp;
        finalChar.statusEffects = [];

        finalChar.companions = finalChar.companions.map(comp => {
            const cFinal = calculateFinalStats(comp).finalStats;
            return {
                ...comp,
                stats: { ...comp.stats, hp: cFinal.maxHp, mp: cFinal.maxMp },
                statusEffects: []
            };
        });

        if (finalChar.inactiveCompanions) {
            finalChar.inactiveCompanions = finalChar.inactiveCompanions.map(comp => {
                const cFinal = calculateFinalStats(comp).finalStats;
                return {
                    ...comp,
                    stats: { ...comp.stats, hp: cFinal.maxHp, mp: cFinal.maxMp },
                    statusEffects: []
                };
            });
        }

        finalChar.dungeonProgress = undefined;
        onUpdateCharacter(finalChar, `[던전 정복] 보스를 격퇴하고 하루 동안 충분한 휴식을 취했습니다. (1일 경과, HP/MP 완전 회복)`);
        onClose();
    };

    if (!isOpen) return null;

    const lootList = bossInfo?.detailedLoot ? (Array.isArray(bossInfo.detailedLoot) ? bossInfo.detailedLoot : [bossInfo.detailedLoot]) : [];
    
    // 실제로 해당 보스 전투에서 드롭되어 획득한 전리품만 판별 (이전 인벤토리 보유품 제외)
    const obtainedLoot: any[] = (() => {
        const dp = character.dungeonProgress;
        if (dp?.obtainedBossLoots) {
            return dp.obtainedBossLoots;
        }
        if (dp?.bossBattlePreInventory) {
            const preCount: Record<string, number> = {};
            dp.bossBattlePreInventory.forEach((name: string) => {
                preCount[name] = (preCount[name] || 0) + 1;
            });
            const curCount: Record<string, number> = {};
            (character.inventory || []).forEach(item => {
                curCount[item.name] = (curCount[item.name] || 0) + 1;
            });
            return lootList
                .filter(l => {
                    const cur = curCount[l.name] || 0;
                    const prev = preCount[l.name] || 0;
                    return cur > prev;
                })
                .map(l => character.inventory.find(inv => inv.name === l.name) || l);
        }
        return [];
    })();
    const hasLoot = obtainedLoot.length > 0;
    const city = character.currentLocation?.city || "알 수 없는 도시";
    const isAlreadyClearedToday = character.clearedDungeonsByCity && character.clearedDungeonsByCity[city] === character.currentDate;

    // 층별 노드 그룹화
    const floorsMap: Record<number, DungeonBranchNode[]> = {};
    nodes.forEach(node => {
        if (!floorsMap[node.floor]) floorsMap[node.floor] = [];
        floorsMap[node.floor].push(node);
    });
    const floorKeys = Object.keys(floorsMap).map(Number).sort((a, b) => a - b);

    const getDisplayNode = (node: DungeonBranchNode) => {
        if (node.isCompleted || node.isCurrent || node.type === 'Boss') {
            return node;
        }
        return {
            ...node,
            type: 'Unknown' as any,
            name: '미확인 구역',
            subtitle: '탐색 필요',
            description: '어둠에 감싸여 어떤 위험이나 기연이 기다리고 있을지 알 수 없는 구역입니다.'
        };
    };

    const getNodeIcon = (type: DungeonNodeType | 'Unknown', size = 18) => {
        switch (type) {
            case 'Boss': return <Crown size={size} className="text-amber-400" />;
            case 'MiniBoss': return <Skull size={size} className="text-rose-400" />;
            case 'Rest': return <Coffee size={size} className="text-emerald-400" />;
            case 'Treasure': return <Gift size={size} className="text-yellow-400" />;
            case 'Event': return <Sparkles size={size} className="text-cyan-400" />;
            case 'Unknown': return <HelpCircle size={size} className="text-slate-400" />;
            default: return <Sword size={size} className="text-red-400" />;
        }
    };

    const getNodeTypeLabel = (type: DungeonNodeType | 'Unknown') => {
        switch (type) {
            case 'Boss': return '최종 보스';
            case 'MiniBoss': return '정예 수호자';
            case 'Rest': return '안전 휴식처';
            case 'Treasure': return '보물 창고';
            case 'Event': return '고대 기연';
            case 'Unknown': return '미확인 노드';
            default: return '일반 전투';
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md p-2 sm:p-4 animate-in fade-in">
            <div className={`bg-slate-950 border-2 w-full max-w-5xl h-[94vh] max-h-[860px] rounded-3xl flex flex-col overflow-hidden relative shadow-2xl ${isSeasonalBoss ? 'border-amber-500 shadow-[0_0_50px_rgba(245,158,11,0.25)]' : 'border-red-600 shadow-[0_0_50px_rgba(220,38,38,0.25)]'}`}>
                
                {/* 배경 일러스트 */}
                {bossInfo?.visualUrl && (
                    <div className="absolute top-0 left-0 w-full h-full opacity-15 pointer-events-none">
                        <img src={bossInfo.visualUrl} alt="Dungeon Backdrop" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/80 via-slate-950/95 to-slate-950"></div>
                    </div>
                )}

                {/* 던전 하루 결산 완충 알림 배너 */}
                {dayChangeNotice && (
                    <div className="absolute top-3 left-1/2 -translate-x-1/2 z-50 px-4 py-1.5 bg-gradient-to-r from-amber-950/95 via-slate-900/95 to-amber-950/95 border border-amber-500/70 rounded-full shadow-2xl text-amber-200 text-xs font-bold flex items-center gap-2 pointer-events-none animate-in fade-in slide-in-from-top-2 duration-300 whitespace-nowrap">
                        <Sun size={15} className="text-amber-400 animate-spin-slow shrink-0" />
                        <span>{dayChangeNotice}</span>
                    </div>
                )}
                {/* 헤더 */}
                <div className={`p-4 sm:p-5 border-b flex justify-between items-center shrink-0 z-10 ${isSeasonalBoss ? 'border-amber-900/40 bg-amber-950/30' : 'border-red-900/40 bg-red-950/30'}`}>
                    <div className="flex items-center gap-3">
                        <div className={`p-2.5 rounded-2xl border ${isSeasonalBoss ? 'bg-amber-950/60 border-amber-500/40 text-amber-400 shadow-lg shadow-amber-950' : 'bg-red-950/60 border-red-500/40 text-red-500 shadow-lg shadow-red-950'}`}>
                            <Compass size={24} className="animate-spin-slow" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className={`text-lg sm:text-xl font-bold tracking-tight font-cinzel ${isSeasonalBoss ? 'text-amber-200' : 'text-red-200'}`}>
                                    {city} 던전 탐험
                                </h2>
                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase border ${isSeasonalBoss ? 'bg-amber-950 text-amber-300 border-amber-600' : 'bg-red-950 text-red-300 border-red-600'}`}>
                                    {isSeasonalBoss ? '신화 보스 성역' : '다중 분기 루트'}
                                </span>
                            </div>
                            <p className="text-xs text-slate-400 font-medium">
                                {nation} • 진행 루트: <span className="text-amber-400 font-bold">{selectedPath.length}개 구역 돌파</span>
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="hidden sm:flex items-center gap-1.5 text-xs font-mono font-bold text-indigo-300 bg-slate-950/80 px-2.5 py-1 rounded-xl border border-slate-800">
                            <Calendar size={13} className="text-amber-400 shrink-0" />
                            <span>{character.currentDate || "2000-03-02"}</span>
                            <span className="text-slate-600">|</span>
                            <Clock size={13} className="text-indigo-400 shrink-0" />
                            <span>{character.currentTime || "08:00"}</span>
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
                </div>

                {/* 메인 컨텐츠 영역 */}
                {isGenerating ? (
                    <div className="flex-1 flex flex-col items-center justify-center space-y-4 z-10">
                        <Loader2 className="animate-spin text-red-500" size={48} />
                        <p className="text-red-400 font-mono animate-pulse">던전 분기 경로 및 몬스터 구역 생성 중...</p>
                    </div>
                ) : (isAlreadyClearedToday && !isRaidCleared) ? (
                    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center z-10">
                        <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mb-5 border-2 border-green-500/50">
                            <CheckCircle2 size={40} className="text-green-500" />
                        </div>
                        <h3 className="text-2xl sm:text-3xl font-bold text-white mb-3">오늘 이미 정복한 도시입니다</h3>
                        <p className="text-slate-400 max-w-md mb-8 leading-relaxed text-sm">
                            오늘 이 도시의 던전 보스를 격퇴했습니다.<br/>
                            자정이 지나 날짜가 변경된 후 다시 도전하거나 다른 도시를 탐색해 보세요.
                        </p>
                        <button 
                            onClick={onClose}
                            className="px-8 py-3.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-2xl transition-all border border-slate-700 shadow-xl text-sm"
                        >
                            돌아가기
                        </button>
                    </div>
                ) : isRaidCleared ? (
                    /* 던전 완전 클리어 화면 */
                    <div className="flex-1 flex flex-col items-center p-6 sm:p-8 space-y-5 text-center animate-in zoom-in z-10 overflow-y-auto custom-scrollbar">
                        <Trophy size={72} className="text-amber-400 animate-bounce drop-shadow-[0_0_30px_rgba(250,204,21,0.6)] shrink-0 mt-2" />
                        <h3 className="text-3xl sm:text-4xl font-bold text-white font-cinzel tracking-tight">던전 정복 완료</h3>
                        <p className="text-amber-200 text-base sm:text-lg font-bold">
                            "{bossInfo?.name || '보스'}"을(를) 격퇴하고 던전의 모든 위협을 정복했습니다!
                        </p>
                        
                        {hasLoot ? (
                            <div className="p-5 bg-slate-900/90 border border-amber-600/50 rounded-2xl max-w-lg w-full shadow-xl flex flex-col items-center">
                                <span className="text-xs text-amber-400 uppercase tracking-wider font-bold mb-3 flex items-center">
                                    <Sparkles size={14} className="mr-1.5"/> 획득한 보스 전리품
                                </span>
                                <div className="w-full space-y-2.5">
                                    {obtainedLoot.map((lootItem, idx) => (
                                        <div key={idx} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 flex gap-3 text-left">
                                            <div className="w-12 h-12 rounded-lg border flex items-center justify-center bg-black/50 shrink-0 border-amber-500/50">
                                                <Sparkles size={20} className="text-amber-400" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between items-center">
                                                    <h4 className="font-bold text-slate-100 text-sm truncate">{lootItem.name}</h4>
                                                    <span className="text-[10px] px-2 py-0.5 rounded border font-bold bg-amber-950/80 text-amber-400 border-amber-500/40">
                                                        {lootItem.rarity}
                                                    </span>
                                                </div>
                                                <p className="text-[11px] text-slate-400 truncate mt-0.5">"{lootItem.description}"</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-2xl max-w-lg w-full text-center">
                                <p className="text-xs text-slate-400 font-medium">이번 전투에서는 보스 고유 전리품을 획득하지 못했습니다.</p>
                            </div>
                        )}
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-lg shrink-0 pt-3">
                            <button
                                onClick={handleRestAndExit}
                                className="py-3.5 bg-gradient-to-r from-blue-700 to-indigo-600 hover:from-blue-600 hover:to-indigo-500 text-white rounded-2xl font-bold transition-all shadow-lg shadow-blue-950 flex flex-col items-center justify-center text-sm"
                            >
                                <div className="flex items-center gap-2">
                                    <Coffee size={18} />
                                    <span>하루 휴식 후 귀환</span>
                                </div>
                                <span className="text-[10px] opacity-80 mt-0.5">(1일 경과 • 체력/마력 완전 회복)</span>
                            </button>
                            <button 
                                onClick={handleExitDungeon}
                                className="py-3.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-2xl shadow-lg transition-all border border-slate-700 flex items-center justify-center gap-2 text-sm"
                            >
                                <LogOut size={18}/> 던전 나가기
                            </button>
                        </div>
                    </div>
                ) : (
                    /* 분기형 던전 맵 & 갈림길 선택 탐험 인터페이스 */
                    <div className="flex-1 flex flex-col overflow-hidden z-10">
                        
                        {/* 상단: 분기 맵 네비게이터 (층별 진행도 & 노드 트리) */}
                        <div className="p-3 sm:p-4 bg-slate-950/80 border-b border-slate-900 overflow-x-auto custom-scrollbar shrink-0">
                            <div className="min-w-[680px] max-w-5xl mx-auto flex items-center justify-between gap-2 sm:gap-3 relative py-2">
                                {floorKeys.map((floorNum, fIdx) => {
                                    const floorNodes = floorsMap[floorNum] || [];
                                    const isFloorCompleted = floorNodes.some(n => selectedPath.includes(n.id));
                                    const isFloorSelectable = floorNodes.some(n => selectableNodeIds.includes(n.id));

                                    return (
                                        <div key={floorNum} className="flex-1 flex flex-col items-center relative">
                                            {/* 층 구분선 연결 */}
                                            {fIdx < floorKeys.length - 1 && (
                                                <div className={`absolute top-6 left-1/2 w-full h-0.5 -z-0 transition-colors ${isFloorCompleted ? 'bg-amber-500/60 shadow-[0_0_8px_rgba(245,158,11,0.5)]' : 'bg-slate-800'}`}></div>
                                            )}

                                            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                                                {floorNum === floorKeys.length - 1 ? 'BOSS' : `Floor ${floorNum + 1}`}
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
                                                                    ? 'bg-amber-950/80 border-2 border-amber-500 text-amber-400 shadow-md shadow-amber-950/50' 
                                                                    : isSelectable 
                                                                        ? isSelected 
                                                                            ? 'bg-red-600 border-2 border-amber-300 text-white scale-110 shadow-[0_0_20px_rgba(220,38,38,0.7)] animate-pulse' 
                                                                            : 'bg-slate-900 border-2 border-amber-500/70 text-amber-300 hover:scale-105 shadow-md shadow-amber-900/30 ring-2 ring-amber-500/30' 
                                                                        : isSelected
                                                                            ? 'bg-slate-800 border-2 border-slate-500 text-white'
                                                                            : 'bg-slate-950/80 border border-slate-800 text-slate-600 opacity-60 cursor-not-allowed'}
                                                            `}
                                                        >
                                                            {getNodeIcon(node.type, 18)}
                                                            {isCompleted && (
                                                                <div className="absolute -top-1 -right-1 bg-amber-500 text-slate-950 rounded-full p-0.5">
                                                                    <Check size={10} strokeWidth={3} />
                                                                </div>
                                                            )}
                                                            {isSelectable && !isCompleted && (
                                                                <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                                                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                                                                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
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
                            
                            {/* 이벤트 알림 팝업 (보물/휴식/기연 완료 시) */}
                            {eventNotice && (
                                <div className="mb-4 bg-slate-900 border border-amber-500/40 rounded-2xl p-4 text-center animate-in zoom-in duration-300 shadow-xl">
                                    <div className="flex items-center justify-center gap-2 mb-1">
                                        <Sparkles size={18} className="text-amber-400" />
                                        <h4 className="font-bold text-amber-200 text-base">{eventNotice.title}</h4>
                                    </div>
                                    <p className="text-xs text-slate-300 mb-3">{eventNotice.desc}</p>
                                    {eventNotice.items && eventNotice.items.length > 0 && (
                                        <div className="flex justify-center gap-4 text-xs font-bold text-amber-400 bg-black/40 py-2 px-4 rounded-xl max-w-sm mx-auto border border-amber-500/20">
                                            {eventNotice.items.map((it, i) => (
                                                <span key={i}>{it.label}: {it.value}</span>
                                            ))}
                                        </div>
                                    )}
                                    <button 
                                        onClick={() => setEventNotice(null)}
                                        className="mt-3 px-5 py-1.5 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold rounded-xl text-xs transition-colors"
                                    >
                                        확인 및 다음 경로 선택
                                    </button>
                                </div>
                            )}

                            {/* 활성 갈림길 선택 안내 */}
                            <div>
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        <Flame size={16} className="text-red-500" />
                                        <h3 className="text-sm sm:text-base font-bold text-slate-200">
                                            다음 탐험할 갈림길 루트를 선택하세요
                                        </h3>
                                    </div>
                                    <span className="text-[11px] text-slate-400 font-medium">
                                        선택 가능한 경로: <span className="text-amber-400 font-bold">{selectableNodeIds.length}개</span>
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
                                                        ? 'bg-slate-900/90 border-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.25)] ring-1 ring-amber-400' 
                                                        : 'bg-slate-950/70 border-slate-800 hover:border-slate-700 hover:bg-slate-900/40'}
                                                `}
                                            >
                                                <div>
                                                    <div className="flex items-center justify-between mb-2">
                                                        <div className="flex items-center gap-2">
                                                            <div className={`p-2 rounded-xl border ${isSelected ? 'bg-amber-950/80 border-amber-500 text-amber-400' : 'bg-slate-900 border-slate-700 text-slate-400'}`}>
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
                                                    <span className="text-[10px] text-amber-400/80 font-medium">
                                                        {node.type === 'Combat' && '⚔️ 마물 소탕 및 골드/경험치'}
                                                        {node.type === 'MiniBoss' && '💀 정예 전리품 및 높은 경험치'}
                                                        {node.type === 'Rest' && '🌿 파티 HP/MP 35% 즉시 회복'}
                                                        {node.type === 'Treasure' && '🎁 골드 및 마정석/보물 획득'}
                                                        {node.type === 'Event' && '✨ 신비한 제단 축복 선택'}
                                                        {node.type === 'Boss' && '👑 최종 결전 및 던전 정복'}
                                                        {node.type === 'Unknown' && '❓ 미지의 구역 탐사'}
                                                    </span>
                                                    <span className={`text-xs font-bold flex items-center gap-1 ${isSelected ? 'text-amber-400' : 'text-slate-500'}`}>
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
                                const searchQuest = character.militaryData?.activeMissions?.find(m => {
                                    if (m.type !== 'MilitaryDungeonSearch' || (m.currentAmount || 0) >= (m.targetAmount || 1)) return false;
                                    const targetCity = (m.targetCity || m.location?.city || '').trim();
                                    const curCity = (city || character.currentLocation?.city || '').trim();
                                    if (!targetCity || !curCity) return false;
                                    return targetCity === curCity || curCity.includes(targetCity) || targetCity.includes(curCity);
                                }) || character.mercenaryData?.activeQuests?.find(q => {
                                    if ((q.type !== 'Rescue' && q.type !== 'MercenaryDungeonSearch') || (q.currentAmount || 0) >= (q.targetAmount || 1)) return false;
                                    const targetCity = (q.targetCity || q.location?.city || '').trim();
                                    const curCity = (city || character.currentLocation?.city || '').trim();
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
                                                        {city} 던전 고립 구역 근처에서 조난당한 실종자의 구조 신호가 감지되었습니다.
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
                                            <div className="p-3 rounded-2xl bg-black/40 border border-amber-500/30">
                                                {getNodeIcon(displayActiveTargetNode.type, 24)}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <h3 className="text-base sm:text-lg font-bold text-white">{displayActiveTargetNode.name}</h3>
                                                    <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-amber-950 text-amber-400 border border-amber-600/40">
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
                                                className="p-3 bg-slate-950 hover:bg-slate-800 border border-amber-500/40 rounded-xl text-left transition-all group"
                                            >
                                                <div className="flex items-center gap-2 font-bold text-amber-300 text-xs mb-1">
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
                                                        ? 'bg-gradient-to-r from-red-800 via-red-600 to-red-800 hover:from-red-700 hover:to-red-700 shadow-red-950'
                                                        : displayActiveTargetNode.type === 'MiniBoss'
                                                            ? 'bg-gradient-to-r from-rose-800 via-rose-600 to-rose-800 hover:from-rose-700 hover:to-rose-700 shadow-rose-950'
                                                            : displayActiveTargetNode.type === 'Rest'
                                                                ? 'bg-gradient-to-r from-emerald-800 via-emerald-600 to-emerald-800 hover:from-emerald-700 hover:to-emerald-700 shadow-emerald-950'
                                                                : displayActiveTargetNode.type === 'Treasure'
                                                                    ? 'bg-gradient-to-r from-amber-700 via-amber-600 to-amber-700 hover:from-amber-600 hover:to-amber-600 shadow-amber-950'
                                                                    : 'bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 hover:from-slate-700 hover:to-slate-700 shadow-slate-950'}
                                                `}
                                            >
                                                {displayActiveTargetNode.type === 'Rest' && <Coffee size={18} />}
                                                {displayActiveTargetNode.type === 'Treasure' && <Gift size={18} />}
                                                {displayActiveTargetNode.type === 'Combat' && <Sword size={18} />}
                                                {displayActiveTargetNode.type === 'MiniBoss' && <Skull size={18} />}
                                                {displayActiveTargetNode.type === 'Boss' && <Crown size={18} />}
                                                {displayActiveTargetNode.type === 'Unknown' && <HelpCircle size={18} />}
                                                <span>
                                                    {displayActiveTargetNode.type === 'Rest' ? '안전 지대 휴식 취하기 (HP/MP 35% 회복)' : 
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
                                        <Heart size={14} className="mr-1.5" /> HP: {character.stats.hp}/{character.stats.maxHp}
                                    </span>
                                    <span className="flex items-center text-blue-400">
                                        <Zap size={14} className="mr-1.5" /> MP: {character.stats.mp}/{character.stats.maxMp}
                                    </span>
                                    <span className="flex items-center text-slate-300">
                                        <Shield size={14} className="mr-1.5 text-indigo-400" /> 방어: {character.stats.def}
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

export default DungeonModal;
