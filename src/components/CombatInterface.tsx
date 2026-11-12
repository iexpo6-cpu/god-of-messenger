export interface ActiveSummon {
    id: string;
    name: string;
    summonName: string;
    level: number;
    stats: { hp: number; maxHp: number; mp: number; maxMp: number; str: number; agi: number; int: number; wis: number; def: number; ctrl: number };
    finalStats: { hp: number; maxHp: number; mp: number; maxMp: number; str: number; agi: number; int: number; wis: number; def: number; ctrl: number };
    battlePosition: { row: number; col: number };
    durationTurns: number;
    powerLevel: 'low' | 'medium' | 'high';
    statPercent: number;
    visualUrl: string;
    shinryokuType: string;
    isDead: boolean;
    statusEffects: ActiveStatus[];
}

import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import { CombatState, Enemy, Character, Companion, Skill, ActiveStatus, ClassTier, JobType, SkillType, Item, BattlePosition, CombatTurnUnit } from '../types';
import { Skull, Sword, Shield, Zap, Sparkles, Wind, Loader2,CheckCircle, Command, X, Crown, Star, Flame, Heart, Target, AlertCircle, ArrowUpCircle, Package, Mountain, Eclipse, Activity, Droplets, Hammer, Sun, Moon, Leaf, Trophy, Map, PlayCircle, User, AlertTriangle, Bot, FastForward, Waves, Crosshair, Music, Keyboard } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { SHINRYOKU_AFFINITY, STATUS_AILMENTS_LIST, STATUS_AILMENTS_DATA, WEAPON_TYPE_KOREAN, SHINRYOKU_UI_CONFIG, getDefaultSummonImageUrl } from '../constants';
import { calculateFinalStats, calculateDamage, calculateStatusChance, calculateDerivedStats, calculateDebuffSuccessRate, getWeaponTypeFromItem, calculateBuffSuccessRate, generateLoot, generateDefaultVisualUrl, getEntityAllCombatSkills, getSkillCombatPower, checkSkillWeaponRequirement, formatCompactKorean } from '../utils';
import * as CombatUtils from '../services/combatUtils';
import { chooseEnemySkill, isEnemyAoeSkill, adjustEnemyDamageForAoe, getEnemySkillProbability } from '../services/enemyCombatSkillService';

import { checkSkillParticipantsMp, buildSkillActionCommand } from '../services/BondSkillService';
import { CompanionTacticsService } from '../services/companionTacticsService';
import { getVisualUrlByJob, getRegisteredSkillImage } from '../services/visualManager';
import { isNinjaCloneSkill, handleNinjaCloneSpawn } from '../services/ninjaCloneService';
import { Snowflake } from 'lucide-react';
import { MESSENGER_VIDEOS, MESSENGER_VIDEO_DURATIONS, BOSS_ENTRANCE_VIDEOS } from '../messengerVideoData';
import { CombatVFXOverlay, CombatVFXData, combatVfxBus, preloadSkillFrameAnimations, clearFrameImageCache } from './CombatVFX';
import { CombatShortcutKeybindModal } from './CombatShortcutKeybindModal';
import { loadCombatKeybinds, formatKeyDisplay, useCombatKeybindHandler } from '../services/combatKeybindService';
import { combatTimerPool, trimCombatLogs, combatLogTracker } from '../services/combatPerformanceService';
import { combatTurnManager } from '../services/combatTurnManager';
import { clearCombatStatCache } from '../services/combatStatCache';
import { combatFloatingTextBatcher } from '../services/combatFloatingTextBatcher';
import { FastImage } from './common/FastImage';

// 분할된 전투 하위 컴포넌트들을 가져옵니다.
import { HealthBar } from './combat/HealthBar';
import { CombatStatusBadge } from './combat/CombatStatusBadge';
import { FloatingFeedbackOverlay, FloatingFeedbackItem } from './combat/FloatingFeedbackOverlay';
import { EnemyCard } from './combat/EnemyCard';
import { PartyCard } from './combat/PartyCard';
import { ItemSelectionModal } from './combat/ItemSelectionModal';
import { MountDetailsModal } from './combat/MountDetailsModal';
import { SkillSelector } from './combat/SkillSelector';
import { CompanionCommandModal } from './combat/CompanionCommandModal';
import { CombatLogEntry } from './combat/CombatLogEntry';
import { CombatLogList } from './combat/CombatLogList';
import { CombatEnemiesArea } from './combat/CombatEnemiesArea';
import { CombatAlliesGrid } from './combat/CombatAlliesGrid';
import BondGaugesPanel from './combat/BondGaugesPanel';
import { AllyTargetQuickSelector } from './combat/AllyTargetQuickSelector';
import { requiresDualTargetSelection } from '../utils/finalClassSkillHelper';
import { SingleSkillTargetModal } from './SingleSkillTargetModal';

import { RPG_SKILL_ICONS as BASE_ICONS, getItemImage, getSkillIconComponent } from '../services/rpgIconService';

interface Props {
  combatState: CombatState;
  player: Character;
  onAction: (action: string, mpCost?: number) => void;
  isLoading: boolean;
  narrative?: string;
  onUpdateCharacter?: (newChar: Character, logMsg?: string) => void;
}



















interface PersonalityDialogueSet {
    skill: (name: string, skillName?: string, affection?: number) => string;
    attack: (name: string, affection?: number) => string;
    ko: (name: string, affection?: number) => string;
    heal: (name: string, affection?: number) => string;
}

const PERSONALITY_DIALOGUES: Record<string, PersonalityDialogueSet> = {
    AGGRESSIVE: {
        skill: (name, sName = '스킬', aff = 50) => 
            aff >= 100 ? `내 전력을 다한 [${sName}]을 받아라! 으랴앗!` :
            aff >= 50 ? `[${sName}]! 다 날려버려주마!` : `방해하지 마! [${sName}]!`,
        attack: (name, aff = 50) => 
            aff >= 100 ? `아앗! 고작 이 정도로 나를 꺾을 수 있을 것 같냐!` :
            aff >= 50 ? `크윽... 재미있어지는군, 더 세게 쳐봐라!` : `야! 감히 나를 건드려? 죽고 싶냐!`,
        ko: (name, aff = 50) => 
            aff >= 100 ? `당신의 앞을... 더 지켜주고 싶었는데... 분하다...` :
            aff >= 50 ? `미안하다... 여기서 누워버리다니...` : `젠장... 내가 쓰러지다니...`,
        heal: (name, aff = 50) => 
            aff >= 100 ? `오옷! 넘치는 힘! 당신의 정성이 팍팍 느껴지는군!` :
            aff >= 50 ? `좋아, 완벽하게 회복됐다! 다시 돌격한다!` : `흠, 고맙군. 이제 슬슬 반격해 볼까!`
    },
    COLD: {
        skill: (name, sName = '스킬', aff = 50) => 
            aff >= 100 ? `가장 확실한 계산입니다. [${sName}], 집행합니다.` :
            aff >= 50 ? `빈틈을 찾았습니다. [${sName}].` : `분석 완료. [${sName}] 기동.`,
        attack: (name, aff = 50) => 
            aff >= 100 ? `크윽... 비효율적인 타격을 허용했군요. 당신의 호위에 지장이 없어야 할 텐데...` :
            aff >= 50 ? `피해 계산 완료. 전투 지속 가능합니다.` : `큭... 대미지 인지. 문제없음.`,
        ko: (name, aff = 50) => 
            aff >= 100 ? `오차범위 초과... 죄송합니다, 제 계산은 여기까지입니다...` :
            aff >= 50 ? `전투 효율 급감... 한계에 도달했습니다. 퇴각을...` : `기동 정지... 시스템 다운.`,
        heal: (name, aff = 50) => 
            aff >= 100 ? `최적의 회복 타이밍이군요. 당신의 세심한 배려에 감사드립니다.` :
            aff >= 50 ? `회복률 양호. 전술 행동을 재개합니다.` : `치유 수용 완료. 전투력 복구됨.`
    },
    WARM: {
        skill: (name, sName = '스킬', aff = 50) => 
            aff >= 100 ? `당신을 지키기 위해... 제 모든 힘을 담은 [${sName}]!` :
            aff >= 50 ? `모두를 도울게요! [${sName}]!` : `도움이 되었으면 좋겠어요. [${sName}]!`,
        attack: (name, aff = 50) => 
            aff >= 100 ? `아앗...! 괜찮아요, 당신이 무사하다면 전 아프지 않아요...!` :
            aff >= 50 ? `앗... 조금 아프지만, 전 튼튼하니까 걱정 마세요!` : `큭... 여러분은 괜찮으신가요?`,
        ko: (name, aff = 50) => 
            aff >= 100 ? `부디... 제 몫까지 살아서... 무사히 이겨주세요...` :
            aff >= 50 ? `먼저 쓰러져서 죄송해요... 몸조심하세요...!` : `흐윽... 모두들... 힘내세요...`,
        heal: (name, aff = 50) => 
            aff >= 100 ? `아아... 따뜻해라... 당신의 따사로운 온기가 느껴져요. 감사해요!` :
            aff >= 50 ? `마음까지 정화되는 느낌이에요. 치료해 주셔서 감사해요!` : `살았어요, 돌봐주셔서 고마워요.`
    },
    TIMID: {
        skill: (name, sName = '스킬', aff = 50) => 
            aff >= 100 ? `당신이 믿어주니까... 용기를 낼게요! [${sName}]!` :
            aff >= 50 ? `저, 저도 할 수 있어요...! [${sName}]!` : `으아앙, 맞지 마세요! [${sName}]!`,
        attack: (name, aff = 50) => 
            aff >= 100 ? `히익...! 무, 무서워요... 하지만 당신의 곁에서 도망치지 않을래요!` :
            aff >= 50 ? `흐아앙! 아파요...! 때리지 마세요...` : `으앗! 살려주세요...!`,
        ko: (name, aff = 50) => 
            aff >= 100 ? `미안해요... 도움이 되고 싶었는데... 바보같이...` :
            aff >= 50 ? `눈앞이 흐려져요... 무서워요... 살려줘요...` : `으으... 더는 안 움직여요...`,
        heal: (name, aff = 50) => 
            aff >= 100 ? `우아아... 정말 기뻐요...! 당신의 다정함 덕분에 아픔이 다 날아갔어요...!` :
            aff >= 50 ? `아, 안 아파요...! 신기해라, 고마워요...!` : `휴우... 다행이다. 치료해주셔서 살았어요...!`
    },
    ORDINARY: {
        skill: (name, sName = '스킬', aff = 50) => 
            aff >= 100 ? `당신과 함께라면 두렵지 않아요! [${sName}]!` :
            aff >= 50 ? `제 실력을 보여드릴게요! [${sName}]!` : `하앗! 받아라, [${sName}]!`,
        attack: (name, aff = 50) => 
            aff >= 100 ? `끄응... 괜찮아요, 당신 앞에서 약한 모습 보이지 않을게요!` :
            aff >= 50 ? `윽... 방심했네요. 걱정 마세요, 견딜 만합니다!` : `아얏! 공격당했습니다!`,
        ko: (name, aff = 50) => 
            aff >= 100 ? `마지막까지 당신을 지키고 싶었는데... 면목이 없어요...` :
            aff >= 50 ? `미안합니다, 여기까지인 것 같네요...` : `으윽... 눈앞이 깜깜해집니다...`,
        heal: (name, aff = 50) => 
            aff >= 100 ? `치유뿐만 아니라 사랑마저 전해지네요! 정말 고맙습니다.` :
            aff >= 50 ? `기운이 솟구치네요! 회복 감사합니다!` : `후아, 살았네요! 감사해요!`
    }
};

const getCompanionDialogue = (
    name: string,
    personality: string = '보통',
    affection: number = 50,
    event: 'skill' | 'attack' | 'ko' | 'heal',
    skillName?: string
): string => {
    const pers = (personality || '보통').toUpperCase();
    let key = 'ORDINARY';
    if (pers.includes('호전') || pers.includes('열정') || pers.includes('ESTP') || pers.includes('ENTJ') || pers.includes('ESTJ') || pers.includes('ENTP')) {
        key = 'AGGRESSIVE';
    } else if (pers.includes('냉철') || pers.includes('지적') || pers.includes('INTJ') || pers.includes('ISTP') || pers.includes('INTP') || pers.includes('ISTJ')) {
        key = 'COLD';
    } else if (pers.includes('온화') || pers.includes('다정') || pers.includes('ENFJ') || pers.includes('INFJ') || pers.includes('ISFJ') || pers.includes('ESFJ') || pers.includes('ENFP')) {
        key = 'WARM';
    } else if (pers.includes('소심') || pers.includes('수줍') || pers.includes('INFP') || pers.includes('ISFP')) {
        key = 'TIMID';
    }

    const set = PERSONALITY_DIALOGUES[key] || PERSONALITY_DIALOGUES.ORDINARY;
    if (event === 'skill') return set.skill(name, skillName, affection);
    if (event === 'attack') return set.attack(name, affection);
    if (event === 'ko') return set.ko(name, affection);
    if (event === 'heal') return set.heal(name, affection);

    return `하앗!`;
};

const CombatInterface: React.FC<Props> = ({ combatState, player, onAction, isLoading, narrative, onUpdateCharacter }) => {
    const [isSkillModalOpen, setIsSkillModalOpen] = useState(false);
    const [isItemModalOpen, setIsItemModalOpen] = useState(false);
    const [selectedMount, setSelectedMount] = useState<any | null>(null);
    const [commandTarget, setCommandTarget] = useState<Companion | null>(null);
    const [selectionMode, setSelectionMode] = useState<'enemy' | 'ally' | null>(null);
    const [pendingSkill, setPendingSkill] = useState<Skill | null>(null);
    const [pendingAttack, setPendingAttack] = useState<boolean>(false);
    const [pendingCompanionAttack, setPendingCompanionAttack] = useState<Companion | null>(null);
    const [pendingCompanionSkill, setPendingCompanionSkill] = useState<{caster: Companion, skill: Skill} | null>(null);
    const [pendingItem, setPendingItem] = useState<{ name: string, quantity: number } | null>(null);
    const [dualTargetSkill, setDualTargetSkill] = useState<Skill | null>(null);
    const [hoveredShortcutSkill, setHoveredShortcutSkill] = useState<Skill | null>(null);
    const [hoveredShortcutItem, setHoveredShortcutItem] = useState<Item | null>(null);
    const [showKeybindModal, setShowKeybindModal] = useState<boolean>(false);
    const [combatKeybinds, setCombatKeybinds] = useState<string[]>(() => loadCombatKeybinds());

    // [NEW] Turn-Based Combat & Initiative States
    const [turnQueue, setTurnQueue] = useState<CombatTurnUnit[]>([]);
    const [activeTurnIndex, setActiveTurnIndex] = useState<number>(0);
    const [isAutoBattle, setIsAutoBattle] = useState<boolean>(() => {
        return localStorage.getItem('default_player_auto') === 'true';
    });
    const [isCompanionAuto, setIsCompanionAuto] = useState<boolean>(() => {
        const val = localStorage.getItem('default_companion_auto');
        return val !== null ? val === 'true' : true;
    });
    const [combatSpeed, setCombatSpeed] = useState<'normal' | 'fast'>(() => {
        return (localStorage.getItem('combat_speed') as any) || 'normal';
    });
    const [isActingTurn, setIsActingTurn] = useState<boolean>(false);
    const isActingTurnRef = useRef(false);
    const [manualCompanionSkillOpen, setManualCompanionSkillOpen] = useState<boolean>(false);
    const [activeSummons, setActiveSummons] = useState<ActiveSummon[]>([]);
    
    // [NEW] Cutscene State
    const [activeVideo, setActiveVideo] = useState<{ url: string; duration: number } | null>(null);
    const [effectOverlay, setEffectOverlay] = useState<{ color: string, duration: number } | null>(null);
    const [combatVfx, setCombatVfx] = useState<CombatVFXData | null>(null);
    const [shake, setShake] = useState(false);
    const prevBossHpMapRef = useRef<Record<string, number>>({});

    const isShakeDisabled = () => {
        if (typeof window === 'undefined') return false;
        if (localStorage.getItem('game_disable_screen_shake') === 'true') return true;
        // 터치 기기 또는 작은 화면에서는 기본 렉 방지를 위해 화면 전체 진동 비활성화
        if (window.matchMedia('(max-width: 1024px), (pointer: coarse)').matches) return true;
        return false;
    };

    // Dialogue bubble state and trackers
    const [bubbles, setBubbles] = useState<Record<string, { text: string; id: number }>>({});
    const [floatingTexts, setFloatingTexts] = useState<Record<string, FloatingFeedbackItem[]>>({});
    const [prevLogLength, setPrevLogLength] = useState(0);

    const triggerBubble = (_compId: string, _text: string) => {
        // 전투 중 대사 출력 비활성화
    };

    // 부동 피해 텍스트 묶음 처리기(Batcher) 구독: 매 타격마다 거대 컴포넌트가 수십 번 리렌더링되는 렉을 방지
    useEffect(() => {
        const unsubscribe = combatFloatingTextBatcher.subscribe(setFloatingTexts);
        return () => {
            unsubscribe();
        };
    }, []);

    const triggerFloatingText = (targetName: string, text: string, type: 'damage' | 'heal' | 'crit' | 'buff' | 'debuff' | 'miss', delay = 0, rawText?: string) => {
        combatFloatingTextBatcher.add(targetName, text, type, delay, rawText);
    };

    // 전투 시작(로그 초기화)/종료/언마운트 시 잔여 연출 타이머 및 플로팅 텍스트 강제 정리 & 캔버스 비트맵 메모리 회수
    useEffect(() => {
        if (!combatState.log || combatState.log.length === 0 || combatState.isEnded) {
            combatLogTracker.reset();
            combatTimerPool.clearAllTimers();
            combatFloatingTextBatcher.clear();
            if (combatState.isEnded) {
                clearFrameImageCache();
            }
        }
    }, [combatState.log?.length === 0, combatState.isEnded]);

    // 컴포넌트 언마운트 시에도 모든 연출 타이머 완벽 청소 및 캔버스 비트맵 메모리 즉시 해제
    useEffect(() => {
        return () => {
            combatLogTracker.reset();
            combatTimerPool.clearAllTimers();
            combatFloatingTextBatcher.clear();
            clearFrameImageCache();
        };
    }, []);

    // Parse logs for sequential companion VFX, damage numbers, buff/debuff feedback, and dialogues
    useEffect(() => {
        if (!combatState.log || combatState.log.length === 0) return;

        const newLines = combatLogTracker.extractNewLines(combatState.log);
        if (newLines.length === 0) {
            return;
        }

        // [최적화] 이전 턴의 지연 타이머가 밀려있는 경우 큐 폭주 방지를 위해 정리
        if (combatTimerPool.getActiveTimerCount() > 12) {
            combatTimerPool.clearAllTimers();
        }

        // [최적화] 대량 로그 유입 시 최근 6줄로 제한하여 연출 과부하 방지
        const linesToProcess = newLines.length > 6 ? newLines.slice(-6) : newLines;

        // 전투 속도에 맞추어 연출 타이머 간격 스케일링
        const speedScale = (combatSpeed as string) === 'ultra' ? 0.25 : combatSpeed === 'fast' ? 0.5 : 1.0;
        let sequenceDelay = 0;
        const STEP_INTERVAL = Math.round(300 * speedScale);

        linesToProcess.forEach((line) => {
            // 1. Companion automated skill: [시스템: <CompanionName> 스킬 발동: <SkillName> (Tier)]
            const autoSkillMatch = line.match(/\[시스템:\s*(.*?)\s+스킬\s+발동:\s*([^(\]]+)/);
            if (autoSkillMatch) {
                const compName = autoSkillMatch[1].trim();
                const skillName = autoSkillMatch[2].trim();
                const comp = player.companions.find(c => c.name === compName);
                if (comp) {
                    const dialogue = getCompanionDialogue(comp.name, comp.personality, comp.affection, 'skill', skillName);
                    triggerBubble(comp.id, dialogue);

                    const foundSkill = comp.skills?.find(s => s.name === skillName);
                    const isBuffSkill = foundSkill?.type === SkillType.BUFF || foundSkill?.type === SkillType.PASSIVE || (foundSkill as any)?.type === 'HEAL' || skillName.includes('치유') || skillName.includes('버프') || skillName.includes('보호') || skillName.includes('힐');
                    const isDebuffSkill = foundSkill?.type === SkillType.DEBUFF || (foundSkill as any)?.ailment !== undefined || skillName.includes('저주') || skillName.includes('약화') || skillName.includes('빙결');
                    
                    let tier: any = isBuffSkill ? 'BUFF' : isDebuffSkill ? 'DEBUFF' : (foundSkill?.isBondSkill ? 'BOND' : (foundSkill?.tier || comp.classTier || ClassTier.FIRST));
                    const isAoe = foundSkill?.targetType === 'aoe' || skillName.includes('광역') || skillName.includes('폭발') || skillName.includes('폭풍') || skillName.includes('진');

                    combatTimerPool.registerTimeout(() => {
                        triggerCombatEffect(
                            comp.shinryokuType || '화염계',
                            tier,
                            isAoe,
                            undefined,
                            comp.name,
                            skillName
                        );
                    }, sequenceDelay);

                    sequenceDelay += STEP_INTERVAL;
                }
                return;
            }

            // 2. Directed companion skill: [동료 지시: <CompanionName>] 스킬 사용: <SkillName>
            const directedSkillMatch = line.match(/\[동료\s*지시:\s*(.*?)\]\s*스킬\s*사용:\s*([^(\)]+)/);
            if (directedSkillMatch) {
                const compName = directedSkillMatch[1].trim();
                const skillName = directedSkillMatch[2].trim();
                const comp = player.companions.find(c => c.name === compName);
                if (comp) {
                    const dialogue = getCompanionDialogue(comp.name, comp.personality, comp.affection, 'skill', skillName);
                    triggerBubble(comp.id, dialogue);

                    const foundSkill = comp.skills?.find(s => s.name === skillName);
                    const isBuffSkill = foundSkill?.type === SkillType.BUFF || foundSkill?.type === SkillType.HEAL || foundSkill?.type === SkillType.PASSIVE || CompanionTacticsService.isSupportSkill(foundSkill) || skillName.includes('치유') || skillName.includes('버프') || skillName.includes('힐');
                    const isDebuffSkill = foundSkill?.type === SkillType.DEBUFF || (foundSkill as any)?.ailment !== undefined || skillName.includes('저주');
                    let tier: any = isBuffSkill ? 'BUFF' : isDebuffSkill ? 'DEBUFF' : (foundSkill?.isBondSkill ? 'BOND' : (foundSkill?.tier || comp.classTier || ClassTier.FIRST));
                    const isAoe = foundSkill?.targetType === 'aoe' || skillName.includes('광역');

                    combatTimerPool.registerTimeout(() => {
                        triggerCombatEffect(
                            comp.shinryokuType || '화염계',
                            tier,
                            isAoe,
                            undefined,
                            comp.name,
                            skillName
                        );
                    }, sequenceDelay);

                    sequenceDelay += STEP_INTERVAL;
                }
                return;
            }

            // 3. Damage Taken: [시스템: <TargetName> HP -<Damage>]
            const damageMatch = line.match(/\[시스템:\s*(.*?)\s+HP\s+(-\d+)\s*\]/);
            if (damageMatch) {
                const targetName = damageMatch[1].trim();
                const rawDamage = damageMatch[2].trim();
                const isCrit = line.includes("치명타");
                const isMiss = rawDamage === '-0' || line.includes("빗나감") || line.includes("MISS");

                if (isMiss) {
                    triggerFloatingText(targetName, "MISS", "miss", sequenceDelay);
                } else {
                    const numVal = Math.abs(parseInt(rawDamage, 10));
                    const formattedDmg = isNaN(numVal) ? rawDamage : formatCompactKorean(numVal);
                    const feedbackText = isCrit ? `CRIT! -${formattedDmg}` : `-${formattedDmg}`;
                    const rawDetailedText = isCrit ? `CRIT! -${numVal.toLocaleString()} (세부: ${numVal.toLocaleString()} 피해)` : `-${numVal.toLocaleString()} (세부: ${numVal.toLocaleString()} 피해)`;
                    const feedbackType = isCrit ? 'crit' : 'damage';
                    triggerFloatingText(targetName, feedbackText, feedbackType, sequenceDelay, rawDetailedText);
                }

                // Dialogue if target is companion
                const comp = player.companions.find(c => c.name === targetName);
                if (comp) {
                    const isKO = comp.stats.hp <= 0;
                    const dialogue = getCompanionDialogue(comp.name, comp.personality, comp.affection, isKO ? 'ko' : 'attack');
                    triggerBubble(comp.id, dialogue);
                }

                sequenceDelay += 180;
                return;
            }

            // 3.5. Avoid / Miss Logs Matcher
            const missMatch1 = line.match(/\[시스템\]\s*(.+?)이\(가\)\s+.*?\s+회피했습니다!\s*\(MISS\)/);
            const missMatch2 = line.match(/빗나갔습니다!\s*\((.+?)\s+회피\)/);
            const missMatch3 = line.match(/\[탈것:\s*.*?\]\s*(.+?)에게\s+공격을\s+시도했으나\s+빗나갔습니다!/);
            const missMatch4 = line.match(/\[시스템\]\s*(.+?)[이가이\(가\)]+.*?빗나갔습니다!/);

            let missTarget = "";
            if (missMatch1) {
                missTarget = missMatch1[1].trim();
            } else if (missMatch2) {
                missTarget = missMatch2[1].trim();
            } else if (missMatch3) {
                missTarget = missMatch3[1].trim();
            } else if (missMatch4) {
                missTarget = missMatch4[1].trim();
            }

            if (missTarget) {
                const cleanTarget = missTarget.replace(/의|공격|이|가/g, '').trim();
                triggerFloatingText(cleanTarget, "MISS", "miss", sequenceDelay);
                sequenceDelay += 180;
                return;
            }

            // 4. Heal: [시스템: <TargetName> HP +<Heal>]
            const healMatch = line.match(/\[시스템:\s*(.*?)\s+HP\s+\+(\d+)/);
            if (healMatch) {
                const targetName = healMatch[1].trim();
                const healAmt = healMatch[2].trim();
                triggerFloatingText(targetName, `+${healAmt}`, 'heal', sequenceDelay);

                const comp = player.companions.find(c => c.name === targetName);
                if (comp) {
                    const dialogue = getCompanionDialogue(comp.name, comp.personality, comp.affection, 'heal');
                    triggerBubble(comp.id, dialogue);
                }

                sequenceDelay += 180;
                return;
            }

            // 5. Status Ailment / Debuff: [시스템] <Target>에게 상태이상: <Status> 부여
            const debuffMatch = line.match(/\[시스템\]\s*(.*?)에게\s*상태이상:\s*([^부여\n]+)\s*부여/);
            if (debuffMatch) {
                const targetName = debuffMatch[1].trim();
                const statusName = debuffMatch[2].trim();
                triggerFloatingText(targetName, `[${statusName}]`, 'debuff', sequenceDelay);
                sequenceDelay += 150;
                return;
            }

            // 5.5. Unable to act: [시스템] <Target> 행동불가 (<CCName>)
            const ccLogMatch = line.match(/\[시스템\]\s*(.*?)\s*행동불가(?:\s*\((.*?)\))?/);
            if (ccLogMatch) {
                const targetName = ccLogMatch[1].trim();
                const ccName = ccLogMatch[2] ? ccLogMatch[2].trim() : '';
                const label = ccName ? `행동불가 (${ccName})` : '행동불가';
                triggerFloatingText(targetName, label, 'debuff', sequenceDelay);
                sequenceDelay += 150;
                return;
            }

            // 3.8. Resurrection: [시스템] <Target>이(가) ... 효과로 부활했습니다
            const resMatch = line.match(/\[시스템\]\s*(.+?)이\(가\)\s+.*?\s*부활했습니다/);
            if (resMatch) {
                const targetName = resMatch[1].trim();
                triggerFloatingText(targetName, "✨ 부활!", 'heal', sequenceDelay);
                sequenceDelay += 180;
                return;
            }

            // 6. Shield / Buff trigger: [시스템] <Target>의 <Buff> 발동!
            const buffMatch = line.match(/\[시스템\]\s*(.*?)의\s*(마나 쉴드|방어|신화 옵션|버프)\s*발동/);
            if (buffMatch) {
                const targetName = buffMatch[1].trim();
                const buffName = buffMatch[2].trim();
                triggerFloatingText(targetName, `[${buffName}]`, 'buff', sequenceDelay);
                sequenceDelay += 150;
                return;
            }

            // 6.2. Shield Absorption: [시스템] 🛡️ <Target>의 <Shield>가 <Absorb>의 피해를 흡수
            const shieldAbsorbMatch = line.match(/\[시스템\]\s*🛡️?\s*(.*?)의\s*(.*?)가\s*(\d+)의\s*피해를\s*흡수/);
            if (shieldAbsorbMatch) {
                const targetName = shieldAbsorbMatch[1].trim();
                const absorbAmt = shieldAbsorbMatch[3].trim();
                triggerFloatingText(targetName, `🛡️ -${absorbAmt}`, 'buff', sequenceDelay);
                sequenceDelay += 150;
                return;
            }

            // 6.3. Shield Breakdown: [시스템] 💥 <Target>의 <Shield>가 ... 완전히 파괴되었습니다!
            const shieldBreakMatch = line.match(/\[시스템\]\s*💥?\s*(.*?)의\s*(.*?)가\s*.*?파괴되었습니다/);
            if (shieldBreakMatch) {
                const targetName = shieldBreakMatch[1].trim();
                triggerFloatingText(targetName, "💥 보호막 파괴!", 'debuff', sequenceDelay);
                sequenceDelay += 150;
                return;
            }

            // 6.5. Buff applied: [시스템] <Target>에게 <SkillName> 적용
            const buffApplyMatch = line.match(/\[시스템\]\s*(.*?)에게\s*(.+?)\s*(?:효과\s*)?적용/);
            if (buffApplyMatch) {
                const targetName = buffApplyMatch[1].trim();
                const buffName = buffApplyMatch[2].replace(/\([^)]*\)/g, '').trim();
                triggerFloatingText(targetName, `[${buffName}]`, 'buff', sequenceDelay);
                sequenceDelay += 150;
                return;
            }
        });
    }, [combatState.log, player.companions, prevLogLength]);

    // 보스 피격 시 화면 진동 효과
    useEffect(() => {
        if (!combatState.enemies || combatState.enemies.length === 0) return;

        let bossDamaged = false;
        const currentHpMap: Record<string, number> = {};

        combatState.enemies.forEach((enemy, idx) => {
            const key = enemy.id || `${enemy.name}_${idx}`;
            currentHpMap[key] = enemy.hp;

            const isBoss = enemy.isBoss || enemy.name.includes('보스') || enemy.name.includes('BOSS') || (enemy.level && enemy.level >= 50);
            if (isBoss && prevBossHpMapRef.current[key] !== undefined) {
                if (enemy.hp < prevBossHpMapRef.current[key]) {
                    bossDamaged = true;
                }
            }
        });

        prevBossHpMapRef.current = currentHpMap;

        if (bossDamaged && !isShakeDisabled()) {
            setShake(true);
            combatTimerPool.registerTimeout(() => {
                setShake(false);
            }, 350);
        }
    }, [combatState.enemies]);

    // [NEW] Boss Entrance Logic
    useEffect(() => {
        const isNormalBattle = !combatState.type || combatState.type === 'normal';
        if (isNormalBattle) return;

        if (combatState.turn === 1 && combatState.enemies && combatState.enemies.length > 0) {
            // 보스 이름 매핑에서 감지
            const detectedBossName = Object.keys(BOSS_ENTRANCE_VIDEOS).find(bossName => 
                combatState.enemies.some(e => e.name.includes(bossName))
            );

            if (detectedBossName) {
                const videoData = BOSS_ENTRANCE_VIDEOS[detectedBossName];
                setActiveVideo({ url: videoData.url, duration: videoData.duration });
                
                // 영상 종료 후 영상 상태 해제
                const timer = combatTimerPool.registerTimeout(() => {
                    setActiveVideo(null);
                }, videoData.duration);
                return () => combatTimerPool.clearTimeout(timer);
            }
        }
    }, [combatState.turn, combatState.type]);

    // 2단계 최적화: 브라우저 전체 화면 강제 재배치(Reflow)를 유발하던 외부 scrollIntoView 제거
    // (전투 로그 내부 스크롤은 CombatLogList 컴포넌트가 scrollTop을 통해 가볍게 자체 처리함)

    const enemies = combatState.enemies || [];
    const turn = combatState.turn || 1;

    const { finalStats: playerFinalStats } = calculateFinalStats(player);
    
    const displayPlayerHp = player.stats.hp;
    const displayPlayerMp = player.stats.mp;
    const playerVisualUrl = getVisualUrlByJob(player.job, player.gender, player.visualUrl);

    // Helper to get display class name based on tier
    const getDisplayClassName = (entity: any) => {
        if (entity.classTier === ClassTier.FINAL && entity.finalClassName) return entity.finalClassName;
        if (entity.classTier === ClassTier.LAST && entity.lastClassName) return entity.lastClassName;
        if (entity.classTier === ClassTier.SECOND && entity.secondClassName) return entity.secondClassName;
        if (entity.classTier === ClassTier.FIRST && entity.firstClassName) return entity.firstClassName;
        return entity.classType || entity.firstClassName || "모험가";
    };

    const resurrectionKeywords = ["부활", "되살리기", "재생생명", "Resurrection", "피닉스", "소생", "부활약"];
    
    const isOneOnOneRaw = [
        'tournament', 'arena', 'exam_mid', 'exam_final', 
        'relation_battle', 'school_pvp', 'school_duel', 'school_demo', 'school_exam', 'school_rival', 'school_pvp_select',
        'final_trial_battle', 'sparring_arena', 'sparring'
    ].includes(combatState.type || '') ||
    (combatState.type && combatState.type.startsWith('school_')) ||
    combatState.isOneOnOne === true ||
    (combatState.enemies && combatState.enemies.some(e => e.name?.includes('모의 대련'))) ||
    (combatState.log && combatState.log.some(l => l.includes('대련') || l.includes('결투') || l.includes('토너먼트') || l.includes('1:1')));

    const isRivalCombat = combatState.type === 'eternal_rival_duel' || 
        (combatState as any).suddenEventType === 'rival_ambush' ||
        combatState.enemies?.some(e => 
            e.name?.includes('영원의 라이벌') || 
            e.name?.includes('영원의 숙적') || 
            e.name?.includes('[영원의 라이벌]') || 
            e.name?.includes('[영원의 숙적]') || 
            e.name?.includes('숙적') ||
            (e as any).isRivalEscort
        );

    // [MODIFIED] 영원의 라이벌전 및 숙적 기습전은 동료를 동반한 다대다 전투이므로 1:1 제약에서 전면 제외
    const isOneOnOne = !isRivalCombat && isOneOnOneRaw;

    const challengerCompanion = useMemo(() => {
        const cId = (combatState as any).challengerCompanionId;
        if (!cId) return null;
        return (
            player.companions.find(c => c.id === cId) ||
            (player.inactiveCompanions ? player.inactiveCompanions.find(c => c.id === cId) : null) ||
            null
        );
    }, [combatState, player.companions, player.inactiveCompanions]);

        const spawnSummon = useCallback((caster: Character | Companion, skill: Skill) => {
        if (isNinjaCloneSkill(skill)) {
            setActiveSummons(prev => {
                const { updatedSummons, spawnedName } = handleNinjaCloneSpawn(caster, skill, prev, player);
                triggerFloatingText(caster.name, `분신 소환: ${spawnedName}`, 'heal');
                return updatedSummons;
            });
            return;
        }
        const sData = skill.summonData;
        let statPct = 30; // 기본 (퍼스트 클래스 이하)
        if (skill.tier === ClassTier.SECOND) statPct = 50;
        else if (skill.tier === ClassTier.LAST) statPct = 75;
        else if (skill.tier === ClassTier.FINAL) statPct = 100;
        
        const ratio = statPct / 100;
        const powerLevel: 'low' | 'medium' | 'high' = sData?.powerLevel || (statPct <= 50 ? 'low' : statPct <= 75 ? 'medium' : 'high');

        const count = Math.max(1, Number(sData?.summonCount) || 1);
        const duration = Math.max(1, Number(sData?.durationTurns) || 3);
        const sName = sData?.summonName || skill.name || '소환수';

        const { finalStats } = calculateFinalStats(caster as Character);
        const maxHp = Math.max(30, Math.floor((finalStats.maxHp || 100) * ratio));
        const maxMp = Math.max(20, Math.floor((finalStats.maxMp || 50) * ratio));

        setActiveSummons(prev => {
            const updated = [...prev];
            const occupied = new Set<string>();
            if (player && player.battlePosition) occupied.add(`${player.battlePosition.row}_${player.battlePosition.col}`);
            if (player && player.companions) {
                player.companions.forEach(c => {
                    if (c.battlePosition) occupied.add(`${c.battlePosition.row}_${c.battlePosition.col}`);
                });
            }
            updated.forEach(s => {
                if (!s.isDead && s.durationTurns > 0 && s.battlePosition) {
                    occupied.add(`${s.battlePosition.row}_${s.battlePosition.col}`);
                }
            });

            const allSlots = [
                { row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 },
                { row: 1, col: 0 }, { row: 1, col: 1 }, { row: 1, col: 2 },
                { row: 2, col: 0 }, { row: 2, col: 1 }, { row: 2, col: 2 }
            ];

            for (let i = 0; i < count; i++) {
                const freeSlot = allSlots.find(s => !occupied.has(`${s.row}_${s.col}`)) || { row: 2, col: 2 };
                occupied.add(`${freeSlot.row}_${freeSlot.col}`);

                const summonObj: ActiveSummon = {
                    id: `summon_${Date.now()}_${i}`,
                    name: count > 1 ? `${sName} ${i + 1}` : sName,
                    summonName: sName,
                    level: caster.level || 1,
                    stats: {
                        hp: maxHp,
                        maxHp: maxHp,
                        mp: maxMp,
                        maxMp: maxMp,
                        str: Math.max(5, Math.floor((finalStats.str || 10) * ratio)),
                        agi: Math.max(5, Math.floor((finalStats.agi || 10) * ratio)),
                        int: Math.max(5, Math.floor((finalStats.int || 10) * ratio)),
                        wis: Math.max(5, Math.floor((finalStats.wis || 10) * ratio)),
                        def: Math.max(5, Math.floor((finalStats.def || 10) * ratio)),
                        ctrl: Math.max(5, Math.floor((finalStats.ctrl || 10) * ratio))
                    },
                    finalStats: {
                        hp: maxHp,
                        maxHp: maxHp,
                        mp: maxMp,
                        maxMp: maxMp,
                        str: Math.max(5, Math.floor((finalStats.str || 10) * ratio)),
                        agi: Math.max(5, Math.floor((finalStats.agi || 10) * ratio)),
                        int: Math.max(5, Math.floor((finalStats.int || 10) * ratio)),
                        wis: Math.max(5, Math.floor((finalStats.wis || 10) * ratio)),
                        def: Math.max(5, Math.floor((finalStats.def || 10) * ratio)),
                        ctrl: Math.max(5, Math.floor((finalStats.ctrl || 10) * ratio))
                    },
                    battlePosition: freeSlot,
                    durationTurns: duration,
                    powerLevel: powerLevel,
                    statPercent: statPct,
                    visualUrl: sData?.summonImageUrl && sData.summonImageUrl.trim().length > 0 ? sData.summonImageUrl : (skill.imageUrl || getDefaultSummonImageUrl(sName, skill.shinryokuType || caster.shinryokuType)),
                    shinryokuType: caster.shinryokuType || '무속성',
                    isDead: false,
                    statusEffects: []
                };
                updated.push(summonObj);
            }
            return updated;
        });
        triggerFloatingText(caster.name, `소환: ${sName}`, 'heal');
    }, [player]);

    const partyMembers = useMemo(() => {
        // 커스텀 동료 단독 1:1 최후의 시련인 경우
        if (isOneOnOne && challengerCompanion) {
            const { finalStats: compFinalStats } = calculateFinalStats(challengerCompanion);
            const defaultVisualUrl = challengerCompanion.defaultVisualUrl || generateDefaultVisualUrl(challengerCompanion.name, challengerCompanion.nation || '기타', challengerCompanion.race, challengerCompanion.gender);
            const compVisualUrl = getVisualUrlByJob(challengerCompanion.job, challengerCompanion.gender, challengerCompanion.visualUrl || challengerCompanion.monsterData?.visualUrl || defaultVisualUrl);
            const compIdx = player.companions.findIndex(c => c.id === challengerCompanion.id);
            return [
                {
                    id: challengerCompanion.id,
                    name: challengerCompanion.name,
                    entity: challengerCompanion,
                    isPlayer: false,
                    position: challengerCompanion.battlePosition || { row: 1, col: 1 },
                    stats: challengerCompanion.stats,
                    finalStats: compFinalStats,
                    visualUrl: compVisualUrl,
                    statusEffects: challengerCompanion.statusEffects,
                    level: challengerCompanion.level,
                    shinryokuType: challengerCompanion.shinryokuType,
                    classType: getDisplayClassName(challengerCompanion),
                    idx: compIdx >= 0 ? compIdx : 0
                }
            ];
        }

        const base = [
            { 
                id: 'player', 
                name: player.name, 
                entity: player, 
                isPlayer: true, 
                position: player.battlePosition || { row: 1, col: 1 },
                stats: player.stats,
                finalStats: playerFinalStats,
                visualUrl: playerVisualUrl,
                statusEffects: player.statusEffects,
                level: player.level,
                shinryokuType: player.shinryokuType,
                classType: getDisplayClassName(player)
            }
        ];

        if (isOneOnOne) return base;

        const comps = player.companions.map((comp, idx) => {
            const { finalStats: compFinalStats } = calculateFinalStats(comp);
            const defaultVisualUrl = comp.defaultVisualUrl || generateDefaultVisualUrl(comp.name, comp.nation || '기타', comp.race, comp.gender);
            const compVisualUrl = getVisualUrlByJob(comp.job, comp.gender, comp.visualUrl || comp.monsterData?.visualUrl || defaultVisualUrl);
            return {
                id: comp.id,
                name: comp.name,
                entity: comp,
                isPlayer: false,
                position: comp.battlePosition || { row: 1, col: 1 },
                stats: comp.stats,
                finalStats: compFinalStats,
                visualUrl: compVisualUrl,
                statusEffects: comp.statusEffects,
                level: comp.level,
                shinryokuType: comp.shinryokuType,
                classType: getDisplayClassName(comp),
                idx: idx
            };
        });

                const activeSummonMembers = activeSummons
            .filter(s => !s.isDead && s.durationTurns > 0 && s.stats.hp > 0)
            .map((s, idx) => ({
                id: s.id,
                name: s.name,
                entity: s as any,
                isPlayer: false,
                position: s.battlePosition,
                stats: s.stats,
                finalStats: s.finalStats,
                visualUrl: s.visualUrl,
                statusEffects: s.statusEffects,
                level: s.level,
                shinryokuType: s.shinryokuType,
                classType: `소환수 (${s.statPercent}%)`,
                idx: 200 + idx
            }));

        return [...base, ...comps, ...activeSummonMembers];
    }, [player, playerFinalStats, playerVisualUrl, isOneOnOne, challengerCompanion, activeSummons]);
    
    // [NEW] 복합 스킬 판별 로직 적용
    const isPureResurrectionPending = useMemo(() => {
        // 아이템의 경우 (부활약 등은 보통 순수 부활로 간주하거나 수동 정의)
        const isItemRes = pendingItem && resurrectionKeywords.some(k => pendingItem.name.includes(k));
        const isItemMixed = isItemRes && (pendingItem!.name.includes('회복') || pendingItem!.name.includes('엘릭서')); // 예시

        // 플레이어 스킬
        const isSkillRes = CombatUtils.isResurrectionSkill(pendingSkill);
        const isSkillMixed = CombatUtils.isMixedResurrectionSkill(pendingSkill);

        // 동료 지시 스킬
        const isCompSkillRes = pendingCompanionSkill && CombatUtils.isResurrectionSkill(pendingCompanionSkill.skill);
        const isCompSkillMixed = pendingCompanionSkill && CombatUtils.isMixedResurrectionSkill(pendingCompanionSkill.skill);

        const hasAnyRes = isItemRes || isSkillRes || isCompSkillRes;
        const hasAnyMixed = isItemMixed || isSkillMixed || isCompSkillMixed;

        // 부활 효과가 있으면서 다른 효과가 없는 경우만 '순수 부활'
        return hasAnyRes && !hasAnyMixed;
    }, [pendingItem, pendingSkill, pendingCompanionSkill]);

    // [NEW] 부활 효과가 포함된 모든 상황
    const isResurrectionModeActive = (pendingItem && resurrectionKeywords.some(k => pendingItem.name.includes(k))) || CombatUtils.isResurrectionSkill(pendingSkill) || (pendingCompanionSkill && CombatUtils.isResurrectionSkill(pendingCompanionSkill.skill));

    // 전투 턴 우선권 계산 (민첩 + 지혜(WIS)의 최종 합산 수치로 산출하여 선공권 보장)
    const calculateAgility = useCallback((entity: any, _isEnemy = false): number => {
        if (!entity) return 20;
        const final = calculateFinalStats(entity).finalStats;
        const agi = final.agi || entity.stats?.agi || entity.agi || 10;
        const wis = final.wis || entity.stats?.wis || entity.wis || 10;
        return agi + wis;
    }, []);

    // [NEW] Generate Initiative Queue sorted by agility descending
    const generateInitiativeQueue = useCallback((): CombatTurnUnit[] => {
        const list: CombatTurnUnit[] = [];

        if (isOneOnOne && challengerCompanion) {
            // 커스텀 동료 최후의 시련: 플레이어 없이 오직 해당 커스텀 동료 1명만 진입
            if (challengerCompanion.stats.hp > 0 && !challengerCompanion.isDead) {
                const compAgi = calculateAgility(challengerCompanion);
                const defaultVisualUrl = challengerCompanion.defaultVisualUrl || generateDefaultVisualUrl(challengerCompanion.name, challengerCompanion.nation || '기타', challengerCompanion.race, challengerCompanion.gender);
                const visual = getVisualUrlByJob(challengerCompanion.job, challengerCompanion.gender, challengerCompanion.visualUrl || challengerCompanion.monsterData?.visualUrl || defaultVisualUrl);
                const compIdx = player.companions.findIndex(c => c.id === challengerCompanion.id);
                list.push({
                    id: challengerCompanion.id,
                    name: challengerCompanion.name,
                    unitType: 'companion',
                    companionIndex: compIdx >= 0 ? compIdx : 0,
                    agility: compAgi,
                    isDead: false,
                    visualUrl: visual,
                    shinryokuType: challengerCompanion.shinryokuType
                });
            }
        } else {
            // 1. Player
            if (player && player.stats.hp > 0 && !player.isDead) {
                const playerAgi = calculateAgility(player);
                list.push({
                    id: 'player',
                    name: player.name,
                    unitType: 'player',
                    agility: playerAgi,
                    isDead: false,
                    visualUrl: player.visualUrl,
                    shinryokuType: player.shinryokuType
                });
            }

            // 2. Companions
            if (!isOneOnOne && player.companions) {
                player.companions.forEach((comp, idx) => {
                    if (comp && comp.stats.hp > 0 && !comp.isDead) {
                        const compAgi = calculateAgility(comp);
                        const defaultVisualUrl = comp.defaultVisualUrl || generateDefaultVisualUrl(comp.name, comp.nation || '기타', comp.race, comp.gender);
                        const visual = getVisualUrlByJob(comp.job, comp.gender, comp.visualUrl || comp.monsterData?.visualUrl || defaultVisualUrl);
                        list.push({
                            id: comp.id || `comp_${idx}`,
                            name: comp.name,
                            unitType: 'companion',
                            companionIndex: idx,
                            agility: compAgi,
                            isDead: false,
                            visualUrl: visual,
                            shinryokuType: comp.shinryokuType
                        });
                    }
                });
            }
        }

        // 3. Summons
        if (activeSummons) {
            activeSummons.forEach((summon, idx) => {
                if (summon && !summon.isDead && summon.durationTurns > 0 && summon.stats.hp > 0) {
                    list.push({
                        id: summon.id,
                        name: summon.name,
                        unitType: 'summon',
                        summonIndex: idx,
                        agility: summon.finalStats.agi || 10,
                        isDead: false,
                        visualUrl: summon.visualUrl,
                        shinryokuType: summon.shinryokuType
                    });
                }
            });
        }

        // 4. Enemies
        if (combatState.enemies) {
            combatState.enemies.forEach((enemy, idx) => {
                if (enemy && enemy.hp > 0) {
                    const enemyAgi = calculateAgility(enemy, true);
                    list.push({
                        id: enemy.id || `enemy_${idx}`,
                        name: enemy.name,
                        unitType: 'enemy',
                        enemyIndex: idx,
                        agility: enemyAgi,
                        isDead: false,
                        visualUrl: enemy.visualUrl,
                        shinryokuType: enemy.shinryokuType
                    });
                }
            });
        }

        // Sort descending by agility; Tie breaker: player > companion > enemy
        list.sort((a, b) => {
            if (b.agility !== a.agility) {
                return b.agility - a.agility;
            }
            const priority = (u: CombatTurnUnit) => (u.unitType === 'player' ? 4 : u.unitType === 'companion' ? 3 : u.unitType === 'summon' ? 2 : 1);
            return priority(b) - priority(a);
        });

        return list;
    }, [player, combatState.enemies, calculateAgility, isOneOnOne, challengerCompanion]);

    const currentTurnRef = useRef(combatState.turn);
    const actualActiveIndexRef = useRef<number>(0);
    const isEndingRoundRef = useRef<boolean>(false);
    const turnExecutionTokenRef = useRef<string>('');

    // Update Turn Queue ONLY when a new round starts or when turnQueue is empty
    useEffect(() => {
        const isNewRound = currentTurnRef.current !== combatState.turn;
        const isEmpty = turnQueue.length === 0;

        if (isNewRound || isEmpty) {
            const queue = generateInitiativeQueue();
            setTurnQueue(queue);
            currentTurnRef.current = combatState.turn;
            setActiveTurnIndex(0);
            actualActiveIndexRef.current = 0;
            isEndingRoundRef.current = false;
            isActingTurnRef.current = false;
            setIsActingTurn(false);
            turnExecutionTokenRef.current = `${combatState.turn}_0_reset`;
        }
    }, [combatState.turn, generateInitiativeQueue, turnQueue.length]);

    // Active Unit in current turn
    const activeUnit = useMemo(() => {
        if (!turnQueue || turnQueue.length === 0) return null;
        for (let i = activeTurnIndex; i < turnQueue.length; i++) {
            const u = turnQueue[i];
            let isValid = false;
            
            if (u.unitType === 'player' && player.stats.hp > 0 && !player.isDead) isValid = true;
            else if (u.unitType === 'companion') {
                if (challengerCompanion && (u.id === challengerCompanion.id || u.name === challengerCompanion.name)) {
                    if (challengerCompanion.stats.hp > 0 && !challengerCompanion.isDead) isValid = true;
                } else if (u.companionIndex !== undefined && player.companions[u.companionIndex]) {
                    const comp = player.companions[u.companionIndex];
                    if (comp && comp.stats.hp > 0 && !comp.isDead) isValid = true;
                } else {
                    const comp = player.companions.find(c => c.id === u.id || c.name === u.name);
                    if (comp && comp.stats.hp > 0 && !comp.isDead) isValid = true;
                }
            }
            else if (u.unitType === 'summon' && u.summonIndex !== undefined) {
                const summon = activeSummons[u.summonIndex];
                if (summon && !summon.isDead && summon.stats.hp > 0 && summon.durationTurns > 0) isValid = true;
            }
            else if (u.unitType === 'enemy') {
                const enemy = (u.enemyIndex !== undefined && combatState.enemies[u.enemyIndex])
                    ? combatState.enemies[u.enemyIndex]
                    : combatState.enemies.find(e => e.id === u.id || e.name === u.name);
                if (enemy && enemy.hp > 0) isValid = true;
            }
            
            if (isValid) {
                actualActiveIndexRef.current = i;
                return u;
            }
        }
        return null; // Don't loop around here, let advanceTurn handle round end
    }, [turnQueue, activeTurnIndex, player, combatState.enemies, challengerCompanion, activeSummons]);

    // Active companion entity if current turn belongs to a companion
    const activeCompanion = useMemo(() => {
        if (activeUnit?.unitType === 'companion') {
            if (challengerCompanion && (activeUnit.id === challengerCompanion.id || activeUnit.name === challengerCompanion.name)) {
                return challengerCompanion;
            }
            if (activeUnit.companionIndex !== undefined && player.companions[activeUnit.companionIndex]) {
                return player.companions[activeUnit.companionIndex];
            }
            if (activeUnit.id) {
                return player.companions.find(c => c.id === activeUnit.id) || null;
            }
        }
        return null;
    }, [activeUnit, player.companions, challengerCompanion]);

    // BGM Audio Controller for Turn-based theme music (Player & Custom Companions)
    const bgmAudioRef = useRef<HTMLAudioElement | null>(null);
    const currentPlayingUrlRef = useRef<string | null>(null);
    const [activeTurnBgmName, setActiveTurnBgmName] = useState<string | null>(null);

    useEffect(() => {
        // 전투가 종료되었거나 유효한 턴 대상이 없으면 BGM 중지
        if (combatState.isEnded || !activeUnit || combatState.enemies?.every(e => e.hp <= 0)) {
            if (bgmAudioRef.current) {
                bgmAudioRef.current.pause();
                bgmAudioRef.current.src = '';
                currentPlayingUrlRef.current = null;
            }
            setActiveTurnBgmName(null);
            return;
        }

        // 현재 턴 캐릭터의 BGM URL 확인
        let targetBgmUrl: string | undefined = undefined;
        let targetActorName: string | undefined = undefined;

        if (activeUnit.unitType === 'player' && player.bgmUrl) {
            targetBgmUrl = player.bgmUrl;
            targetActorName = player.name;
        } else if (activeUnit.unitType === 'companion' && activeCompanion && activeCompanion.isCustom && activeCompanion.bgmUrl) {
            targetBgmUrl = activeCompanion.bgmUrl;
            targetActorName = activeCompanion.name;
        }

        // 볼륨 설정 가져오기 (기본값 50%)
        const savedVolume = parseFloat(localStorage.getItem('game_bgm_volume') || '50');
        const normalizedVolume = isNaN(savedVolume) ? 0.5 : Math.max(0, Math.min(1, savedVolume / 100));

        if (targetBgmUrl) {
            if (!bgmAudioRef.current) {
                bgmAudioRef.current = new Audio();
                bgmAudioRef.current.loop = true;
            }

            bgmAudioRef.current.volume = normalizedVolume;

            if (currentPlayingUrlRef.current !== targetBgmUrl || bgmAudioRef.current.paused) {
                bgmAudioRef.current.src = targetBgmUrl;
                currentPlayingUrlRef.current = targetBgmUrl;
                bgmAudioRef.current.currentTime = 0;
                bgmAudioRef.current.play().catch(err => {
                    console.log('Combat turn BGM autoplay waiting for interaction:', err);
                });
            }
            setActiveTurnBgmName(targetActorName || null);
        } else {
            // 해당 캐릭터 턴이 아니면 (적 턴, BGM 없는 캐릭터 턴 등) 재생 중지
            if (bgmAudioRef.current) {
                bgmAudioRef.current.pause();
                currentPlayingUrlRef.current = null;
            }
            setActiveTurnBgmName(null);
        }
    }, [activeUnit, activeCompanion, player.bgmUrl, combatState.isEnded, combatState.enemies]);

    // Unmount cleanup
    useEffect(() => {
        return () => {
            if (bgmAudioRef.current) {
                bgmAudioRef.current.pause();
                bgmAudioRef.current.src = '';
                bgmAudioRef.current = null;
                currentPlayingUrlRef.current = null;
            }
            combatTurnManager.reset();
            clearCombatStatCache();
        };
    }, []);

    // Advance to next turn in queue with concurrency safe-lock
    const advanceTurn = useCallback((fromIndex?: number) => {
        combatTurnManager.safeAdvanceTurn({
            fromIndex,
            fallbackActiveIndex: actualActiveIndexRef.current >= 0 ? actualActiveIndexRef.current : activeTurnIndex,
            queueLength: turnQueue.length,
            onNextIndex: (nextIdx) => {
                setActiveTurnIndex(nextIdx);
            },
            onRoundEnd: () => {
                isEndingRoundRef.current = true;
                setTimeout(() => {
                    isEndingRoundRef.current = false;
                }, 1500);
                onAction('[라운드 종료]');
            },
            combatSpeed,
            currentTurn: combatState.turn
        });
    }, [turnQueue.length, onAction, combatSpeed, activeTurnIndex, combatState.turn]);

    const selectSkillByTactics = useCallback((
        actor: Character | Companion,
        usableSkills: Skill[]
    ): { skill: Skill | null; targetName: string } => {
        if (!usableSkills || usableSkills.length === 0) return { skill: null, targetName: '적군' };

        const tactic = actor.currentTactics || "자유 행동";
        const skillFocus = actor.tacticsSkillFocus || "POWER";
        const preferredSkillName = actor.preferredSkillName;
        const sortedByPower = [...usableSkills].sort((a, b) => getSkillCombatPower(b) - getSkillCombatPower(a));

        let selectedSkill: Skill | null = null;
        let targetName = '적군';

        const isHpHealSkill = (s: Skill) => {
            if (s.type === SkillType.PHYSICAL || s.type === SkillType.MAGIC || s.type === SkillType.DEBUFF) return false;
            if (s.type === SkillType.HEAL) return true;
            if (s.effectFormula?.includes('HP') || s.effectFormula?.includes('RECOV') || s.effectFormula?.includes('HEAL') || (s as any).formulaOverride?.includes('HP')) return true;
            const desc = s.description || '';
            const name = s.name || '';
            if (desc.includes('체력') || desc.includes('치유') || desc.includes('생명력') || desc.includes('힐') || name.includes('치유') || name.includes('체력') || name.includes('생명력') || name.includes('힐')) {
                if (!name.includes('MP') && !desc.includes('MP만') && !desc.includes('마나만')) return true;
            }
            if ((s as any).buffEffects?.some((ef: any) => ef.type === 'HP_RECOV' || ef.type === 'CLEANSE' || ef.type === 'RESURRECTION')) return true;
            return false;
        };

        const isMpHealSkill = (s: Skill) => {
            if (s.type === SkillType.PHYSICAL || s.type === SkillType.MAGIC || s.type === SkillType.DEBUFF) return false;
            if (s.effectFormula?.includes('MP') || (s as any).formulaOverride?.includes('MP')) return true;
            const desc = s.description || '';
            const name = s.name || '';
            if (desc.includes('MP') || desc.includes('마나') || desc.includes('정신력') || name.includes('마나') || name.includes('MP')) {
                if (desc.includes('회복') || desc.includes('충전') || desc.includes('치유') || name.includes('회복') || name.includes('충전')) return true;
            }
            if ((s as any).buffEffects?.some((ef: any) => ef.type === 'MP_RECOV')) return true;
            return false;
        };

        const isHealSkill = (s: Skill) => isHpHealSkill(s) || isMpHealSkill(s);

        const isSupportSkill = (s: Skill) => {
            if (s.type === SkillType.PHYSICAL || s.type === SkillType.MAGIC || s.type === SkillType.DEBUFF) return false;
            if (isHealSkill(s)) return true;
            if (s.type === SkillType.BUFF || s.type === SkillType.SUMMON || s.isSummonSkill) return true;
            if ((s as any).buffEffects && (s as any).buffEffects.length > 0 && !(s as any).damageFormula && !s.effectFormula?.includes('DMG')) return true;
            return false;
        };

        // 파티원 전체의 정확한 체력/마나 비율(장비/버프 포함 finalStats 기준) 계산
        const partyNeeds = CompanionTacticsService.evaluatePartyNeeds(player, player.companions || [], partyMembers);
        const { lowestHpAlly, lowestHpRatio, lowestMpAlly, lowestMpRatio, deadAllies } = partyNeeds;

        if (tactic === "힐/지원 집중") {
            const hpThresholdRatio = (actor.tacticsHpThreshold !== undefined ? actor.tacticsHpThreshold : 80) / 100;
            const mpThresholdRatio = (actor.tacticsMpThreshold !== undefined ? actor.tacticsMpThreshold : 50) / 100;

            // 0. 사망한 아군이 있다면 부활 스킬 최우선 사용
            if (deadAllies.length > 0) {
                const resSkill = sortedByPower.find(s => CombatUtils.isResurrectionSkill(s) || (s as any).buffEffects?.some((ef: any) => ef.type === 'RESURRECTION'));
                if (resSkill) {
                    selectedSkill = resSkill;
                    targetName = resSkill.targetType === 'aoe' ? 'allies' : deadAllies[0].name;
                }
            }

            // 1. 체력이 설정된 HP 기준치 이하인 아군이 있다면 HP 회복/치유 스킬 최우선 사용
            if (!selectedSkill && lowestHpRatio <= hpThresholdRatio) {
                const healSkill = sortedByPower.find(s => isHpHealSkill(s));
                if (healSkill) {
                    selectedSkill = healSkill;
                    targetName = healSkill.targetType === 'aoe' ? 'allies' : (lowestHpAlly ? lowestHpAlly.name : actor.name);
                }
            }

            // 2. HP 회복 스킬을 쓰지 않았고, 마나가 설정된 MP 기준치 이하인 아군이 있다면 MP 회복 스킬 우선 사용
            if (!selectedSkill && lowestMpRatio <= mpThresholdRatio) {
                const mpSkill = sortedByPower.find(s => isMpHealSkill(s));
                if (mpSkill) {
                    selectedSkill = mpSkill;
                    targetName = mpSkill.targetType === 'aoe' ? 'allies' : (lowestMpAlly ? lowestMpAlly.name : actor.name);
                }
            }

            // 3. 힐/회복 스킬 조건이 아니거나 없을 때 지원/버프/소환 스킬 우선 사용
            if (!selectedSkill) {
                const suppSkill = sortedByPower.find(s => isSupportSkill(s));
                if (suppSkill) {
                    selectedSkill = suppSkill;
                    if (suppSkill.targetType === 'aoe') {
                        targetName = 'allies';
                    } else if (isHpHealSkill(suppSkill) && lowestHpAlly) {
                        targetName = lowestHpAlly.name;
                    } else if (isMpHealSkill(suppSkill) && lowestMpAlly) {
                        targetName = lowestMpAlly.name;
                    } else {
                        targetName = actor.name;
                    }
                }
            }

            // 4. 힐/지원/버프 스킬이 전무하거나 사용할 수 없으면 공격 스킬 사용
            if (!selectedSkill) {
                const offensive = sortedByPower.find(s => !isSupportSkill(s));
                if (offensive) selectedSkill = offensive;
                else selectedSkill = sortedByPower[0];
            }
        } else if (tactic === "공격 집중") {
            const offensive = sortedByPower.find(s => !isSupportSkill(s));
            if (offensive) selectedSkill = offensive;
            else selectedSkill = sortedByPower[0];
        } else if (tactic === "스킬 위주") {
            // 아군이 위급한 상황(설정된 HP 기준치 또는 50% 이하)이고 서포터이거나 회복 스킬이 있는 경우 아군 구원 고려
            const hpThresholdRatio = (actor.tacticsHpThreshold !== undefined ? actor.tacticsHpThreshold : 80) / 100;
            if (lowestHpRatio <= hpThresholdRatio && lowestHpRatio <= 0.5) {
                const emergencyHeal = sortedByPower.find(s => isHpHealSkill(s));
                if (emergencyHeal) {
                    selectedSkill = emergencyHeal;
                    targetName = emergencyHeal.targetType === 'aoe' ? 'allies' : (lowestHpAlly ? lowestHpAlly.name : actor.name);
                }
            }

            if (!selectedSkill && skillFocus === 'SPECIFIC' && preferredSkillName) {
                const chosen = usableSkills.find(s => s.name === preferredSkillName);
                if (chosen) selectedSkill = chosen;
            }

            if (!selectedSkill && skillFocus === 'AOE') {
                const aoeSkills = usableSkills.filter(s => s.targetType === 'aoe');
                if (aoeSkills.length > 0) {
                    aoeSkills.sort((a, b) => getSkillCombatPower(b) - getSkillCombatPower(a));
                    selectedSkill = aoeSkills[0];
                }
            }

            if (!selectedSkill && skillFocus === 'SINGLE') {
                const singleSkills = usableSkills.filter(s => s.targetType !== 'aoe' && s.type !== SkillType.BUFF);
                if (singleSkills.length > 0) {
                    singleSkills.sort((a, b) => getSkillCombatPower(b) - getSkillCombatPower(a));
                    selectedSkill = singleSkills[0];
                }
            }

            if (!selectedSkill && skillFocus === 'BUFF_DEBUFF') {
                const buffDebuff = usableSkills.filter(s => s.type === SkillType.BUFF || s.type === SkillType.DEBUFF);
                if (buffDebuff.length > 0) {
                    buffDebuff.sort((a, b) => getSkillCombatPower(b) - getSkillCombatPower(a));
                    selectedSkill = buffDebuff[0];
                }
            }

            if (!selectedSkill && skillFocus === 'LOW_MP') {
                const lowMp = [...usableSkills].sort((a, b) => {
                    const diff = (a.mpCost || 0) - (b.mpCost || 0);
                    if (diff !== 0) return diff;
                    return getSkillCombatPower(b) - getSkillCombatPower(a);
                });
                selectedSkill = lowMp[0];
            }

            if (!selectedSkill) {
                selectedSkill = sortedByPower[0];
            }
        } else {
            selectedSkill = sortedByPower[0];
        }

        if (selectedSkill) {
            const isAoe = selectedSkill.targetType === 'aoe';
            const isPositive = isSupportSkill(selectedSkill);
            if (isAoe) {
                targetName = isPositive ? 'allies' : 'aoe';
            } else if (isPositive) {
                if (targetName === '적군' || !targetName) {
                    if (isHpHealSkill(selectedSkill) && lowestHpAlly) {
                        targetName = lowestHpAlly.name;
                    } else if (isMpHealSkill(selectedSkill) && lowestMpAlly) {
                        targetName = lowestMpAlly.name;
                    } else {
                        targetName = actor.name;
                    }
                }
            } else {
                const targetEnemy = combatState.enemies.find(e => e.hp > 0 && e.name === targetName) || combatState.enemies.find(e => e.hp > 0);
                targetName = targetEnemy ? targetEnemy.name : '적군';
            }
        }

        return { skill: selectedSkill, targetName };
    }, [player, combatState.enemies, partyMembers]);

    // Automated turn execution for AI (Enemy turn, Companion auto turn, or Full Auto mode)
    useEffect(() => {
        if (!activeUnit || isLoading || isActingTurnRef.current) return;
        if (combatState.isEnded || combatState.enemies?.every(e => e.hp <= 0)) {
            if (isActingTurnRef.current) {
                isActingTurnRef.current = false;
                setIsActingTurn(false);
            }
            return;
        }

        const delay = combatSpeed === 'fast' ? 350 : 750;
        const currentTurnToken = `${combatState.turn}_${activeTurnIndex}_${activeUnit.id}_${activeUnit.unitType}_${actualActiveIndexRef.current}`;
        turnExecutionTokenRef.current = currentTurnToken;
        let actionTimer: NodeJS.Timeout | null = null;

        // 1. Enemy Turn
        if (activeUnit.unitType === 'enemy') {
            isActingTurnRef.current = true; setIsActingTurn(true);
            const currentUnitIndex = actualActiveIndexRef.current;
            actionTimer = setTimeout(() => {
                try {
                    if (turnExecutionTokenRef.current !== currentTurnToken || combatState.turn !== currentTurnRef.current) {
                        isActingTurnRef.current = false;
                        setIsActingTurn(false);
                        return;
                    }
                    const enemy = combatState.enemies[activeUnit.enemyIndex ?? 0];
                    if (enemy && enemy.hp > 0) {
                        const ccEffect = getActorCCEffect(enemy);
                        if (ccEffect.isSkip) {
                            triggerFloatingText(enemy.name, `행동불가 (${ccEffect.name})`, 'debuff');
                            onAction(`[적 행동: ${enemy.name}] 턴 진행`);
                            advanceTurn(currentUnitIndex);
                            return;
                        }
                        const usableSkills = (enemy.skills || []).filter(s => s.type !== SkillType.PASSIVE);
                        const hasSkills = usableSkills.length > 0;
                        const skillProb = getEnemySkillProbability(enemy, combatState.type);
                        const usesSkill = hasSkills && Math.random() < skillProb;
                        
                        const validTargets: { name: string, type: 'player'|'companion'|'summon', index?: number }[] = [];
                        if (isOneOnOne) {
                            if (challengerCompanion) {
                                if (challengerCompanion.stats.hp > 0 && !challengerCompanion.isDead) validTargets.push({ name: challengerCompanion.name, type: 'companion' });
                            } else {
                                if (player.stats.hp > 0 && !player.isDead) validTargets.push({ name: player.name, type: 'player' });
                            }
                        } else {
                            if (player.stats.hp > 0 && !player.isDead) validTargets.push({ name: player.name, type: 'player' });
                            player.companions.forEach(c => {
                                if (c.stats.hp > 0 && !c.isDead) validTargets.push({ name: c.name, type: 'companion' });
                            });
                            activeSummons.forEach((s, idx) => {
                                if (s && !s.isDead && s.durationTurns > 0 && s.stats.hp > 0) {
                                    validTargets.push({ name: s.name, type: 'summon', index: idx });
                                }
                            });
                        }

                        if (usesSkill && usableSkills.length > 0) {
                            const randomSkill = chooseEnemySkill(usableSkills, enemy.isBoss, enemy.hp, enemy.maxHp) || usableSkills[0];
                            const isAttackSkill = randomSkill.type === SkillType.PHYSICAL || randomSkill.type === SkillType.MAGIC || ((randomSkill.powerRatio || 0) > 0 && randomSkill.type !== SkillType.BUFF && randomSkill.type !== SkillType.HEAL);
                            const isBuffOrHeal = !isAttackSkill && (randomSkill.type === SkillType.BUFF || randomSkill.type === SkillType.HEAL || randomSkill.targetType === 'self' || randomSkill.targetType === 'ally');
                            const isAoe = isEnemyAoeSkill(randomSkill);
                            
                            const randomTarget: { name: string, type: 'player'|'companion'|'summon', index?: number } = validTargets.length > 0 ? validTargets[Math.floor(Math.random() * validTargets.length)] : { name: player.name, type: 'player' };
                            const targetName = isBuffOrHeal ? `${enemy.name} (자신)` : (isAoe ? '전체 대상' : (randomTarget.type === 'summon' ? `소환수:${randomTarget.name}` : randomTarget.name));
                            
                            triggerCutsceneIfFinal(enemy, randomSkill, () => {
                                try {
                                    triggerCombatEffect(randomSkill, undefined, isAoe, targetName, enemy.name, randomSkill.name);
                                    if (isAoe && !isBuffOrHeal) {
                                        setActiveSummons(prev => {
                                            const baseAtk = (enemy.stats?.str || 10) * 1.5 + (enemy.stats?.int || 10);
                                            const rawDmg = Math.max(1, Math.floor(baseAtk * (randomSkill.powerRatio ? randomSkill.powerRatio/100 : 1.2) * (0.85 + Math.random() * 0.3)));
                                            const dmg = adjustEnemyDamageForAoe(rawDmg, true);
                                            return prev.map(s => {
                                                if (s && !s.isDead && s.stats.hp > 0) {
                                                    const newS = { ...s, stats: { ...s.stats, hp: Math.max(0, s.stats.hp - dmg) } };
                                                    triggerFloatingText(newS.name, `-${dmg}`, 'damage');
                                                    if (newS.stats.hp <= 0) { newS.isDead = true; const expireLabel = (newS as any).isClone ? '분신 소멸' : '소환 해제'; triggerFloatingText(newS.name, expireLabel, 'debuff'); }
                                                    return newS;
                                                }
                                                return s;
                                            });
                                        });
                                    } else if (randomTarget.type === 'summon' && !isBuffOrHeal) {
                                        setActiveSummons(prev => {
                                            const newS = [...prev];
                                            if (newS[randomTarget.index!]) {
                                                const s = { ...newS[randomTarget.index!] };
                                                if (!s.isDead && s.stats.hp > 0) {
                                                    const baseAtk = (enemy.stats?.str || 10) * 1.5 + (enemy.stats?.int || 10);
                                                    const dmg = Math.max(1, Math.floor(baseAtk * (randomSkill.powerRatio ? randomSkill.powerRatio/100 : 1.2) * (0.85 + Math.random() * 0.3)));
                                                    s.stats = { ...s.stats, hp: Math.max(0, s.stats.hp - dmg) };
                                                    triggerFloatingText(s.name, `-${dmg}`, 'damage');
                                                    if (s.stats.hp <= 0) { s.isDead = true; const expireLabel = (s as any).isClone ? '분신 소멸' : '소환 해제'; triggerFloatingText(s.name, expireLabel, 'debuff'); }
                                                    newS[randomTarget.index!] = s;
                                                }
                                            }
                                            return newS;
                                        });
                                    }
                                    
                                    if (randomTarget.type === 'summon' && !isBuffOrHeal && !isAoe) {
                                        onAction(`[시스템] ${enemy.name}이(가) 스킬 ${randomSkill.name}을(를) 사용해 소환수 ${randomTarget.name}을(를) 공격했습니다!`);
                                    } else {
                                        onAction(`[적 행동: ${enemy.name}] 스킬: ${randomSkill.name} (대상: ${targetName})`);
                                    }
                                    advanceTurn(currentUnitIndex);
                                } catch (err) {
                                    console.error("Enemy skill execution error:", err);
                                    advanceTurn(currentUnitIndex);
                                } finally {
                                    isActingTurnRef.current = false; setIsActingTurn(false);
                                }
                            });
                            return;
                        } else {
                            const effectType = enemy.shinryokuType || '물리계';
                            const randomTarget: { name: string, type: 'player'|'companion'|'summon', index?: number } = validTargets.length > 0 ? validTargets[Math.floor(Math.random() * validTargets.length)] : { name: player.name, type: 'player' };
                            const allyTargetName = randomTarget.type === 'summon' ? `소환수:${randomTarget.name}` : randomTarget.name;
                            triggerCombatEffect(effectType, 'NORMAL', false, allyTargetName, enemy.name);
                            
                            if (randomTarget.type === 'summon') {
                                setActiveSummons(prev => {
                                    const newS = [...prev];
                                    if (newS[randomTarget.index!]) {
                                        const s = { ...newS[randomTarget.index!] };
                                        if (!s.isDead && s.stats.hp > 0) {
                                            const baseAtk = (enemy.stats?.str || 10) * 1.5 + (enemy.stats?.int || 10);
                                            const dmg = Math.max(1, Math.floor(baseAtk * (0.85 + Math.random() * 0.3)));
                                            s.stats = { ...s.stats, hp: Math.max(0, s.stats.hp - dmg) };
                                            triggerFloatingText(s.name, `-${dmg}`, 'damage');
                                            if (s.stats.hp <= 0) { s.isDead = true; triggerFloatingText(s.name, '소환 해제', 'debuff'); }
                                            newS[randomTarget.index!] = s;
                                        }
                                    }
                                    return newS;
                                });
                                onAction(`[시스템] ${enemy.name}이(가) 소환수 ${randomTarget.name}을(를) 공격해 피해를 입혔습니다!`);
                            } else {
                                onAction(`[적 행동: ${enemy.name}] 일반 공격 (대상: ${allyTargetName})`);
                            }
                        }
                    }
                    advanceTurn(currentUnitIndex);
                } catch (err) {
                    console.error("Enemy turn error:", err);
                    advanceTurn(currentUnitIndex);
                } finally {
                    isActingTurnRef.current = false; setIsActingTurn(false);
                }
            }, delay);
            return () => {
                if (actionTimer) clearTimeout(actionTimer);
                isActingTurnRef.current = false;
                setIsActingTurn(false);
            };
        }

        // 2. Companion Turn (Auto mode)
        if (activeUnit.unitType === 'companion' && (isCompanionAuto || isAutoBattle)) {
            isActingTurnRef.current = true; setIsActingTurn(true);
            const currentUnitIndex = actualActiveIndexRef.current;
            actionTimer = setTimeout(() => {
                try {
                    if (turnExecutionTokenRef.current !== currentTurnToken || combatState.turn !== currentTurnRef.current) {
                        isActingTurnRef.current = false;
                        setIsActingTurn(false);
                        return;
                    }
                    const comp = (activeUnit.companionIndex !== undefined ? player.companions[activeUnit.companionIndex] : null) || player.companions.find(c => c.name === activeUnit.name || c.id === activeUnit.id) || challengerCompanion;
                    if (comp && comp.stats.hp > 0 && !comp.isDead) {
                        const ccEffect = getActorCCEffect(comp);
                        if (ccEffect.isSkip) {
                            triggerFloatingText(comp.name, `행동불가 (${ccEffect.name})`, 'debuff');
                            onAction(`[동료 지시: ${comp.name}] 턴 넘기기`);
                            advanceTurn(currentUnitIndex);
                            return;
                        } else if (comp.currentTactics === "방어 태세" || comp.currentTactics === "방어 유지") {
                            onAction(`[동료 지시: ${comp.name}] 방어 (대상: ${comp.name})`);
                        } else if (comp.currentTactics === "스킬 제한") {
                            const targetEnemy = combatState.enemies.find(e => e.hp > 0);
                            const targetName = targetEnemy ? targetEnemy.name : '적군';
                            triggerCombatEffect((comp as any).shinryokuType || '화염계', 'NORMAL', false, targetName, comp.name);
                            onAction(`[동료 지시: ${comp.name}] 일반 공격 (대상: ${targetName})`);
                        } else {
                            const isClassTrial = !!combatState.trialTier || combatState.type === 'final_trial_battle';
                            const compBondSkills = isClassTrial ? [] : readyBondSkills.filter(bs => bs.sourceId === comp.id || bs.companionId === comp.id);
                            const allCompSkills = getEntityAllCombatSkills(comp, compBondSkills);
                            const usableSkills = allCompSkills.filter(s => checkSkillParticipantsMp(s, player, comp).isAllowed && s.type !== SkillType.PASSIVE && checkSkillWeaponRequirement(comp, s).isAllowed);
                            
                            let shouldAutoSkill = false;
                            if (comp.currentTactics === "스킬 위주") {
                                shouldAutoSkill = Math.random() < 0.9;
                            } else if (comp.currentTactics === "공격 집중") {
                                shouldAutoSkill = Math.random() < 0.65;
                            } else if (comp.currentTactics === "힐/지원 집중") {
                                shouldAutoSkill = true;
                            } else if (isAutoBattle) {
                                shouldAutoSkill = Math.random() < 0.65;
                            } else {
                                shouldAutoSkill = Math.random() < 0.5;
                            }

                            if (shouldAutoSkill && usableSkills.length > 0) {
                                const { skill: selectedSkill, targetName } = selectSkillByTactics(comp, usableSkills);

                                if (selectedSkill) {
                                    triggerCombatEffect(selectedSkill, undefined, selectedSkill.targetType === 'aoe', targetName, comp.name, selectedSkill.name);
                                    if (selectedSkill.isBondSkill) {
                                        onAction(`[인연 스킬] ${selectedSkill.id} (대상: ${targetName})`, selectedSkill.mpCost);
                                    } else {
                                        onAction(`[동료 지시: ${comp.name}] 스킬 사용: ${selectedSkill.name} (대상: ${targetName})`, selectedSkill.mpCost);
                                    }
                                } else {
                                    const targetEnemy = combatState.enemies.find(e => e.hp > 0);
                                    const tName = targetEnemy ? targetEnemy.name : '적군';
                                    triggerCombatEffect((comp as any).shinryokuType || '화염계', 'NORMAL', false, tName, comp.name);
                                    onAction(`[동료 지시: ${comp.name}] 일반 공격 (대상: ${tName})`);
                                }
                            } else {
                                const targetEnemy = combatState.enemies.find(e => e.hp > 0);
                                const targetName = targetEnemy ? targetEnemy.name : '적군';
                                triggerCombatEffect((comp as any).shinryokuType || '화염계', 'NORMAL', false, targetName, comp.name);
                                onAction(`[동료 지시: ${comp.name}] 일반 공격 (대상: ${targetName})`);
                            }
                        }
                    }
                    advanceTurn(currentUnitIndex);
                } catch (err) {
                    console.error("Companion turn error:", err);
                    advanceTurn(currentUnitIndex);
                } finally {
                    isActingTurnRef.current = false; setIsActingTurn(false);
                }
            }, delay);
            return () => {
                if (actionTimer) clearTimeout(actionTimer);
            };
        }

        
        // 4. Summon Turn (Auto AI)
        if (activeUnit.unitType === 'summon') {
            isActingTurnRef.current = true; setIsActingTurn(true);
            const currentUnitIndex = actualActiveIndexRef.current;
            actionTimer = setTimeout(() => {
                try {
                    if (turnExecutionTokenRef.current !== currentTurnToken || combatState.turn !== currentTurnRef.current) {
                        return;
                    }
                    const sIdx = activeUnit.summonIndex !== undefined ? activeUnit.summonIndex : activeSummons.findIndex(s => s.id === activeUnit.id);
                    const summon = activeSummons[sIdx];
                    if (summon && !summon.isDead && summon.durationTurns > 0 && summon.stats.hp > 0) {
                        const livingEnemies = combatState.enemies.filter(e => e.hp > 0);
                        if (livingEnemies.length > 0) {
                            const targetEnemy = livingEnemies[Math.floor(Math.random() * livingEnemies.length)];
                            
                            triggerCombatEffect(summon.shinryokuType || '무속성', 'NORMAL', false, targetEnemy.name, summon.name);
                            
                            const baseAtk = (summon.finalStats.str || 10) * 2 + (summon.finalStats.int || 10) * 1.5;
                            const dmg = Math.max(1, Math.floor(baseAtk * (0.85 + Math.random() * 0.3) - ((targetEnemy as any).def || (targetEnemy as any).defense || 0)));
                            
                            targetEnemy.hp = Math.max(0, targetEnemy.hp - dmg);
                            
                            triggerFloatingText(targetEnemy.name, `-${dmg}`, 'damage');

                            setActiveSummons(prev => {
                                const newSummons = [...prev];
                                if (newSummons[sIdx]) {
                                    const currSummon = { ...newSummons[sIdx] };
                                    currSummon.durationTurns -= 1;
                                    if (currSummon.durationTurns <= 0) {
                                        currSummon.isDead = true;
                                        const expireLabel = (currSummon as any).isClone ? '분신 소멸' : '소환 해제';
                                        triggerFloatingText(currSummon.name, expireLabel, 'debuff');
                                    }
                                    newSummons[sIdx] = currSummon;
                                }
                                return newSummons;
                            });

                            const isClone = (summon as any).isClone;
                            const actionPrefix = isClone ? `[분신 행동: ${summon.name}]` : `[소환수 행동: ${summon.name}]`;
                            onAction(`${actionPrefix} 일반 공격 (대상: ${targetEnemy.name}, 피해: ${dmg}) - 남은 턴: ${summon.durationTurns - 1}턴`);
                        }
                    }
                    advanceTurn(currentUnitIndex);
                } catch (err) {
                    console.error("Summon turn error:", err);
                    advanceTurn(currentUnitIndex);
                } finally {
                    isActingTurnRef.current = false; setIsActingTurn(false);
                }
            }, delay);
            return () => {
                if (actionTimer) clearTimeout(actionTimer);
                isActingTurnRef.current = false;
                setIsActingTurn(false);
            };
        }

        // 3. Player Turn (Full Auto Mode)
        if (activeUnit.unitType === 'player' && isAutoBattle) {
            isActingTurnRef.current = true; setIsActingTurn(true);
            const currentUnitIndex = actualActiveIndexRef.current;
            actionTimer = setTimeout(() => {
                try {
                    if (turnExecutionTokenRef.current !== currentTurnToken || combatState.turn !== currentTurnRef.current) {
                        isActingTurnRef.current = false;
                        setIsActingTurn(false);
                        return;
                    }
                    if (player.stats.hp > 0 && !player.isDead) {
                        const ccEffect = getActorCCEffect(player);
                        if (ccEffect.isSkip) {
                            triggerFloatingText(player.name, `행동불가 (${ccEffect.name})`, 'debuff');
                            onAction(`[일반 공격] 공격`, 0);
                            advanceTurn(currentUnitIndex);
                            return;
                        }
                        const allAvailableSkills = getEntityAllCombatSkills(player, readyBondSkills.filter(bs => !bs.sourceId));
                        const usableSkills = allAvailableSkills.filter(s => 
                            checkSkillParticipantsMp(s, player, player).isAllowed && 
                            s.type !== SkillType.PASSIVE && 
                            checkSkillWeaponRequirement(player, s).isAllowed
                        );
                        
                        const { skill: selectedSkill, targetName: selectedTarget } = selectSkillByTactics(player, usableSkills);
                        const strongestSkill = selectedSkill;
                        
                        const targetEnemy = combatState.enemies.find(e => e.hp > 0);
                        const targetName = selectedTarget !== '적군' ? selectedTarget : (targetEnemy ? targetEnemy.name : '적군');

                        const skillProb = player.currentTactics === "스킬 위주" ? 0.95 : (player.currentTactics === "힐/지원 집중" ? 1.0 : 0.65);
                        const shouldUseSkill = strongestSkill && Math.random() < skillProb;

                        if (shouldUseSkill && strongestSkill) {
                            const isAoe = strongestSkill.targetType === 'aoe';
                            const finalTarget = isAoe ? '전체 대상' : targetName;
                            triggerCutsceneIfFinal(player, strongestSkill, () => {
                                try {
                                    triggerCombatEffect(strongestSkill, undefined, isAoe, finalTarget, player.name, strongestSkill.name);
                                    if (strongestSkill.isBondSkill) {
                                        onAction(`[인연 스킬] ${strongestSkill.id} (대상: ${finalTarget})`, strongestSkill.mpCost);
                                    } else {
                                        onAction(`[스킬 사용] ${strongestSkill.name} (대상: ${finalTarget})`, strongestSkill.mpCost);
                                    }
                                    advanceTurn(currentUnitIndex);
                                } catch (err) {
                                    console.error("Player auto skill error:", err);
                                    advanceTurn(currentUnitIndex);
                                } finally {
                                    isActingTurnRef.current = false; setIsActingTurn(false);
                                }
                            });
                            return;
                        } else {
                            const effectType = (player as any).shinryokuType || '물리계';
                            triggerCombatEffect(effectType, 'NORMAL', false, targetName, player.name);
                            onAction(`[일반 공격] ${targetName} 공격`, 0);
                        }
                    }
                    advanceTurn(currentUnitIndex);
                } catch (err) {
                    console.error("Player auto turn error:", err);
                    advanceTurn(currentUnitIndex);
                } finally {
                    isActingTurnRef.current = false; setIsActingTurn(false);
                }
            }, delay);
            return () => {
                if (actionTimer) clearTimeout(actionTimer);
                isActingTurnRef.current = false;
                setIsActingTurn(false);
            };
        }
    }, [activeUnit, isLoading, isCompanionAuto, isAutoBattle, combatSpeed, combatState.enemies, player, advanceTurn, onAction]);

    // Safety check to prevent deadlocks when activeUnit becomes null or queue runs out unexpectedly mid-round
    useEffect(() => {
        if (isLoading || combatState.isEnded || activeVideo || isEndingRoundRef.current || combatTurnManager.isEndingRoundNow()) return;
        
        // activeTurnIndex가 큐의 끝에 도달하여 정상적으로 라운드가 종료되는 중인 경우에는 안전 타이머가 중복으로 실행되지 않도록 방지
        if (turnQueue.length > 0 && activeTurnIndex >= turnQueue.length) return;
        
        if (!activeUnit && turnQueue.length > 0) {
            const hasAliveEnemies = combatState.enemies?.some(e => e.hp > 0);
            const isPlayerAlive = (isOneOnOne && challengerCompanion)
                ? (challengerCompanion.stats.hp > 0 && !challengerCompanion.isDead)
                : (player && player.stats.hp > 0 && !player.isDead);
            
            if (hasAliveEnemies && isPlayerAlive) {
                const timer = setTimeout(() => {
                    // Re-check after settle time
                    if (!activeUnit && !isLoading && !combatState.isEnded && !activeVideo && !isEndingRoundRef.current && !combatTurnManager.isEndingRoundNow()) {
                        if (!combatTurnManager.tryBeginRoundEnd(combatState.turn)) {
                            return;
                        }
                        console.log("[Combat Safety] No active unit found. Ending round to reset queue.");
                        isEndingRoundRef.current = true;
                        setTimeout(() => {
                            isEndingRoundRef.current = false;
                        }, 1500);
                        onAction('[라운드 종료]');
                        setActiveTurnIndex(0);
                    }
                }, 600);
                return () => clearTimeout(timer);
            }
        }
    }, [activeUnit, activeTurnIndex, turnQueue, isLoading, combatState.isEnded, combatState.enemies, combatState.turn, player, onAction, activeVideo, isOneOnOne, challengerCompanion]);

    // Safety watchdog: if isActingTurn stays true for > 2.2s (and no active video/cutscene is playing), force unlock to prevent combat freezing
    useEffect(() => {
        if (activeVideo || combatState.isEnded || isLoading) return;
        const checkDelay = combatSpeed === 'fast' ? 1400 : 2200;
        const watchdog = setTimeout(() => {
            if ((isActingTurnRef.current || isActingTurn) && !activeVideo && !combatState.isEnded) {
                console.warn("[Combat Safety Watchdog] isActingTurn stuck true. Force unlocking and advancing turn!");
                isActingTurnRef.current = false;
                setIsActingTurn(false);
                if (activeUnit?.unitType !== 'player' || isAutoBattle) {
                    advanceTurn();
                }
            }
        }, checkDelay);
        return () => clearTimeout(watchdog);
    }, [isActingTurn, activeTurnIndex, isAutoBattle, advanceTurn, activeUnit, activeVideo, combatSpeed, combatState.isEnded, isLoading]);

    let typeLabel = "NORMAL BATTLE";
    let typeColor = "text-slate-500 border-slate-600";
    let TypeIcon = Sword;

    if (combatState.type === 'dungeon') {
        typeLabel = "DUNGEON BATTLE";
        typeColor = "text-red-500 border-red-500";
        TypeIcon = Skull;
    } else if (combatState.type === 'tournament') {
        typeLabel = "TOURNAMENT";
        typeColor = "text-amber-500 border-amber-500";
        TypeIcon = Trophy;
    } else if (combatState.type?.includes('exam')) {
        typeLabel = "SCHOOL EXAM";
        typeColor = "text-cyan-500 border-cyan-500";
        TypeIcon = Target;
    }

    // [NEW] Video trigger logic (Supports Player, Companions, and PVP/Boss Enemies)
    const triggerCutsceneIfFinal = (caster: Character | Companion | Enemy, skill: Skill, callback: () => void) => {
        // [요청 반영] 직업이 신의 사자일 때 영상 재생 제거
        const rawJob = String((caster as any).job || (caster as any).className || '');
        const isMessenger = 
            rawJob.includes('신의 사자') ||
            rawJob.includes('사자');

        if (isMessenger) {
            callback();
            return;
        }

        // 1. If skill has a custom videoUrl registered (YouTube / web link / local file)
        if (skill.videoUrl && skill.videoUrl.trim() !== '') {
            const customDuration = 4500;
            setActiveVideo({ url: skill.videoUrl.trim(), duration: customDuration });
            setTimeout(() => {
                setActiveVideo(null);
                callback();
            }, customDuration);
            return;
        }

        const isFinal = skill.tier === ClassTier.FINAL || skill.tier === ClassTier.LAST;
        const isNormalBattle = !combatState.type || combatState.type === 'normal';
        
        if (isNormalBattle && !(caster as any).isBoss && !combatState.type?.includes('PVP')) {
            callback();
            return;
        }

        const job = (rawJob || '') as JobType;
        const gender = ((caster as any).gender || '').toLowerCase().includes('여') ? 'female' : 'male';
        
        const videoMap = MESSENGER_VIDEOS[job];
        const duration = MESSENGER_VIDEO_DURATIONS[job];

        if (isFinal && videoMap && duration) {
            const videoUrl = gender === 'female' ? videoMap.female : videoMap.male;
            setActiveVideo({ url: videoUrl, duration });
            setTimeout(() => {
                setActiveVideo(null);
                callback();
            }, duration);
        } else {
            callback();
        }
    };

    const checkConfusionRedirect = (attackerName: string, intendedTargetName: string, isPlayerAttack: boolean): string | null => {
        let isConfused = false;
        if (isPlayerAttack) isConfused = player.statusEffects?.some(e => e.name === "혼란") || false;
        else {
            const comp = player.companions.find(c => c.name === attackerName);
            if (comp) isConfused = comp.statusEffects?.some(e => e.name === "혼란") || false;
        }
        if (isConfused && Math.random() < 0.3) {
            const allies = [player.name, ...player.companions.map(c => { return c.name })];
            const randomAlly = allies[Math.floor(Math.random() * allies.length)];
            return randomAlly;
        }
        return null;
    };

    const getActorCCEffect = (entity?: { name?: string; statusEffects?: ActiveStatus[] } | null): { isSkip: boolean; name: string } => {
        if (!entity || !entity.statusEffects || entity.statusEffects.length === 0) {
            return { isSkip: false, name: '' };
        }
        const ccEffect = entity.statusEffects.find(eff => 
            ['속박', '빙결', '감전', '기절', '마비', '혼란', '수면', '소멸'].includes(eff.name)
        );
        if (ccEffect) {
            return { isSkip: true, name: ccEffect.name };
        }
        return { isSkip: false, name: '' };
    };

    // [최적화] 전투 시작 시 또는 보유 스킬/동료 목록 변경 시에만 1회 백그라운드 캐싱 (매 턴 HP 피격 시 수십 번 중복 재호출 차단)
    useEffect(() => {
        preloadSkillFrameAnimations(player);
    }, [player.id, player.skills?.length, player.companions?.length]);

    const triggerCombatEffect = (
        skillOrType?: Skill | string,
        tierParam?: ClassTier | 'NORMAL' | 'BOND' | 'BUFF' | 'DEBUFF',
        isAoeParam?: boolean,
        targetNameParam?: string,
        attackerNameParam?: string,
        skillNameParam?: string
    ) => {
        // [NEW] 스킬 이펙트 끄기 설정 확인 시 VFX 발동 중단
        const isEffectsDisabled = localStorage.getItem('game_disable_skill_effects') === 'true';
        if (isEffectsDisabled) {
            return;
        }

        // 시전자 엔티티 파악 및 행동불가(속박, 감전, 빙결 등 CC) 상태 확인
        let attackerEntity: any = player;
        if (attackerNameParam) {
            if (attackerNameParam === player.name) {
                attackerEntity = player;
            } else {
                attackerEntity = player.companions?.find(c => c.name === attackerNameParam) || combatState.enemies?.find(e => e.name === attackerNameParam) || null;
            }
            const cc = getActorCCEffect(attackerEntity);
            if (cc.isSkip) {
                return;
            }
        }

        let shinryokuType = (player as any).shinryokuType || '화염계';
        let tier: ClassTier | 'NORMAL' | 'BOND' | 'BUFF' | 'DEBUFF' = tierParam || ClassTier.FIRST;
        let isAoe = !!isAoeParam;
        let skillName = skillNameParam;

        let illustrationUrl: string | undefined = undefined;
        let vfxTheme: string | undefined = undefined;
        let vfxColor: string | undefined = undefined;
        let vfxShape: string | undefined = undefined;
        let vfxScale: number | undefined = undefined;
        let frameAnimation = undefined;

        if (typeof skillOrType === 'object' && skillOrType !== null) {
            const skill = skillOrType as Skill;
            vfxTheme = skill.vfxTheme;
            vfxColor = skill.vfxColor;
            vfxShape = skill.vfxShape;
            vfxScale = (skill as any).vfxScale;
            frameAnimation = skill.frameAnimation?.enabled ? skill.frameAnimation : undefined;
            let foundShinryokuType = (skill as any).shinryokuType;
            if (!foundShinryokuType && attackerNameParam && attackerNameParam !== player.name) {
                const comp = player.companions.find(c => c.name === attackerNameParam);
                if (comp) {
                    foundShinryokuType = (comp as any).shinryokuType;
                } else {
                    const enemy = combatState.enemies.find(e => e.name === attackerNameParam);
                    if (enemy) {
                        foundShinryokuType = enemy.shinryokuType;
                    }
                }
            }
            shinryokuType = foundShinryokuType || (player as any).shinryokuType || '화염계';
            if (skill.type === SkillType.BUFF || skill.type === SkillType.PASSIVE || (skill as any).type === 'HEAL') {
                tier = 'BUFF';
            } else if (skill.type === SkillType.DEBUFF) {
                tier = 'DEBUFF';
            } else {
                tier = (skill.isBondSkill ? 'BOND' : (skill.tier || ClassTier.FIRST)) as any;
            }
            isAoe = isAoeParam !== undefined ? isAoeParam : (skill.targetType === 'aoe');
            skillName = skill.name;

            // 스킬 사용 발동 일러스트 설정 (라스트 클래스 이상 및 인연 스킬 + 시전자 일러스트 자동 대각선 컷인 지원)
            const isFinalOrBondTier = skill.tier === ClassTier.FINAL || skill.tier === ClassTier.BOND || !!(skill as any).isBondSkill || !!(skill as any).isBond;
            const isCutinTier = skill.tier === ClassTier.LAST || isFinalOrBondTier;
            const autoCutinMode = localStorage.getItem('game_auto_caster_cutin_mode') || 'last_and_final';

            if (isCutinTier && autoCutinMode !== 'off') {
                if (skill.illustrationUrl) {
                    illustrationUrl = skill.illustrationUrl;
                } else if (skill.imageUrl && (skill.imageUrl.startsWith('http') || skill.imageUrl.startsWith('/') || skill.imageUrl.startsWith('data:'))) {
                    illustrationUrl = skill.imageUrl;
                } else if (
                    autoCutinMode === 'last_and_final' ||
                    (autoCutinMode === 'final_only' && isFinalOrBondTier)
                ) {
                    // 전용 컷신이 없을 때 시전자(주인공/동료/보스)의 기본 일러스트를 자동으로 대각선 컷인에 활용
                    if (attackerEntity === player) {
                        illustrationUrl = playerVisualUrl;
                    } else if (attackerEntity) {
                        illustrationUrl =
                            attackerEntity.visualUrl ||
                            attackerEntity.imageUrl ||
                            attackerEntity.monsterData?.visualUrl ||
                            attackerEntity.defaultVisualUrl;
                    }
                }
            }
        } else if (typeof skillOrType === 'string') {
            shinryokuType = skillOrType;
        }

        let duration = illustrationUrl 
            ? 1650 
            : ((tier === ClassTier.FINAL || tier === 'BOND') ? 1300 : (tier === ClassTier.LAST ? 1000 : 700));

        if (frameAnimation && frameAnimation.frames && frameAnimation.frames.length > 0) {
            const fCount = frameAnimation.frames.length;
            const frameSum = frameAnimation.frames.reduce((acc: number, f: any) => {
                const rawDur = f.duration || 70;
                const effDur = (fCount >= 36 && rawDur >= 50) ? 18 : (fCount >= 16 && rawDur >= 65) ? 32 : rawDur;
                return acc + effDur;
            }, 0);
            const loops = frameAnimation.loopCount === 0 ? 1 : Math.min(3, frameAnimation.loopCount || 1);
            const speed = frameAnimation.playbackSpeed || 1;
            const animDuration = Math.round((frameSum * loops) / speed);
            duration = Math.max(duration, animDuration + 180);
        }

        const vfxData: CombatVFXData = {
            id: `vfx_${Date.now()}_${Math.random()}`,
            shinryokuType,
            tier,
            isAoe,
            targetName: targetNameParam,
            attackerName: attackerNameParam || player.name,
            skillName,
            illustrationUrl,
            duration,
            vfxTheme,
            vfxColor,
            vfxShape,
            vfxScale,
            frameAnimation
        };

        // CombatInterface 전체 리렌더링을 유발하지 않고 VFX 오버레이에만 즉시 전달
        combatVfxBus.emit(vfxData);

        // Screen Shake based on tier
        if (!isShakeDisabled() && (tier === ClassTier.FINAL || tier === 'BOND' || tier === ClassTier.LAST || tier === ClassTier.SECOND)) {
            setShake(true);
            combatTimerPool.registerTimeout(() => setShake(false), tier === ClassTier.FINAL || tier === 'BOND' ? 650 : 400);
        }
    };

    const initiateSkillUse = (skill: Skill) => {
        if (activeUnit?.unitType === 'enemy' || (!isAutoBattle && activeUnit?.unitType !== 'player')) return;
        const mpCheck = checkSkillParticipantsMp(skill, player, player);
        if (!mpCheck.isAllowed) {
            alert(mpCheck.reason || '마력이 부족하여 스킬을 사용할 수 없습니다.');
            return;
        }
        const weaponCheck = checkSkillWeaponRequirement(player, skill);
        if (!weaponCheck.isAllowed) {
            alert(weaponCheck.reason || '특화 무기를 착용해야 스킬을 사용할 수 있습니다.');
            return;
        }

        if (requiresDualTargetSelection(skill)) {
            setDualTargetSkill(skill);
            setIsSkillModalOpen(false);
            return;
        }

        const targetType = skill.targetType || 'single';
        const isOffensiveAttack = skill.type === SkillType.PHYSICAL || skill.type === SkillType.MAGIC || String(skill.type).includes('물리') || String(skill.type).includes('마법');
        const isBuff = !isOffensiveAttack && !skill.isBondSkill && (skill.type === SkillType.BUFF || skill.type === SkillType.PASSIVE || skill.type === SkillType.HEAL || skill.description?.includes('회복') || skill.description?.includes('치유') || skill.description?.includes('보호') || (Array.isArray(skill.buffEffects) && skill.buffEffects.length > 0));
        const isBondPureBuff = Boolean(skill.isBondSkill && ((skill as any).playerSkillType === SkillType.BUFF || (skill as any).playerSkillType === '버프') && ((skill as any).companionSkillType === SkillType.BUFF || (skill as any).companionSkillType === '버프'));
        const isSummon = skill.type === SkillType.SUMMON || skill.isSummonSkill;
        const isRes = CombatUtils.isResurrectionSkill(skill);

        if (targetType === 'aoe' || targetType === 'self' || isSummon || isBondPureBuff) {
            const cc = getActorCCEffect(player);
            if (cc.isSkip) {
                triggerFloatingText(player.name, `행동불가 (${cc.name})`, 'debuff');
                onAction(buildSkillActionCommand(skill, player.name, false, targetType), skill.mpCost);
                advanceTurn();
                setIsSkillModalOpen(false);
                return;
            }
            // [MODIFIED] Check for cutscene before executing
            triggerCutsceneIfFinal(player, skill, () => {
                triggerCombatEffect(skill, undefined, targetType === 'aoe', '전체 대상', player.name, skill.name);
                if (isSummon) {
                    spawnSummon(player, skill);
                }
                onAction(buildSkillActionCommand(skill, player.name, false, targetType), skill.mpCost);
                advanceTurn();
            });
            setIsSkillModalOpen(false);
        } else if (targetType === 'ally' || (targetType === 'single' && (isBuff || isRes))) {
            setPendingSkill(skill);
            setSelectionMode('ally');
            setIsSkillModalOpen(false);
        } else {
            setPendingSkill(skill);
            setSelectionMode('enemy');
            setIsSkillModalOpen(false);
        }
    };

    const initiateItemUse = (item: Item) => {
        if (activeUnit?.unitType === 'enemy' || (!isAutoBattle && activeUnit?.unitType !== 'player')) return;
        setPendingItem({ name: item.name, quantity: 1 });
        const isOffensive = item.secondaryOptions?.some(opt => opt.includes('포획') || opt.includes('상태이상 부여')) || 
                          item.description?.includes('포획') || 
                          item.description?.includes('상태이상 부여');
        
        setSelectionMode(isOffensive ? 'enemy' : 'ally');
    };
    
    const initiateAttack = () => {
        if (activeUnit?.unitType === 'enemy' || (!isAutoBattle && activeUnit?.unitType !== 'player')) return;
        setPendingAttack(true);
        setSelectionMode('enemy');
    };

    const initiateDefense = () => {
        if (activeUnit?.unitType === 'enemy' || (!isAutoBattle && activeUnit?.unitType !== 'player')) return;
        onAction('[방어] 자신 보호', 0);
        advanceTurn();
    };

    const handleCompanionSkill = (skill: Skill, companion: Companion | null) => {
        if (!companion) return;
        const mpCheck = checkSkillParticipantsMp(skill, player, companion);
        if (!mpCheck.isAllowed) {
            alert(mpCheck.reason || '마력이 부족하여 스킬을 사용할 수 없습니다.');
            return;
        }
        if (requiresDualTargetSelection(skill)) {
            setDualTargetSkill(skill);
            setManualCompanionSkillOpen(false);
            setCommandTarget(null);
            return;
        }
        const targetType = skill.targetType || 'single';
        const isOffensiveAttack = skill.type === SkillType.PHYSICAL || skill.type === SkillType.MAGIC || String(skill.type).includes('물리') || String(skill.type).includes('마법');
        const isBuff = !isOffensiveAttack && !skill.isBondSkill && (skill.type === SkillType.BUFF || skill.type === SkillType.PASSIVE || skill.type === SkillType.HEAL || skill.description?.includes('회복') || skill.description?.includes('치유'));
        const isBondPureBuff = Boolean(skill.isBondSkill && ((skill as any).playerSkillType === SkillType.BUFF || (skill as any).playerSkillType === '버프') && ((skill as any).companionSkillType === SkillType.BUFF || (skill as any).companionSkillType === '버프'));
        const isSummon = skill.type === SkillType.SUMMON || skill.isSummonSkill;
        const isRes = CombatUtils.isResurrectionSkill(skill);

        if (targetType === 'aoe' || targetType === 'self' || isSummon || isBondPureBuff) {
            const cc = getActorCCEffect(companion);
            if (cc.isSkip) {
                triggerFloatingText(companion.name, `행동불가 (${cc.name})`, 'debuff');
                onAction(`[동료 지시: ${companion.name}] 스킬 사용: ${skill.name} (대기)`);
                advanceTurn();
                setManualCompanionSkillOpen(false);
                setCommandTarget(null);
                return;
            }
            triggerCutsceneIfFinal(companion, skill, () => {
                triggerCombatEffect(skill, undefined, targetType === 'aoe', '전체 대상', companion.name, skill.name);
                if (isSummon) {
                    spawnSummon(companion, skill);
                }
                onAction(buildSkillActionCommand(skill, companion.name, true, skill.isBondSkill ? targetType : undefined), skill.mpCost);
                advanceTurn();
            });
            setManualCompanionSkillOpen(false);
            setCommandTarget(null);
        } else if (targetType === 'ally' || (targetType === 'single' && (isBuff || isRes))) {
            setPendingCompanionSkill({ skill, caster: companion });
            setSelectionMode('ally');
            setManualCompanionSkillOpen(false);
            setCommandTarget(null);
        } else {
            setPendingCompanionSkill({ skill, caster: companion });
            setSelectionMode('enemy');
            setManualCompanionSkillOpen(false);
            setCommandTarget(null);
        }
    };

    const handleTargetSelection = (targetName: string) => {
        if (pendingSkill) {
            const skill = pendingSkill;
            setPendingSkill(null);
            setSelectionMode(null);
            const cc = getActorCCEffect(player);
            if (cc.isSkip) {
                triggerFloatingText(player.name, `행동불가 (${cc.name})`, 'debuff');
                onAction(`[스킬 사용: ${player.name}] ${skill.name} (대기)`);
                advanceTurn();
                return;
            }
            triggerCutsceneIfFinal(player, skill, () => {
                triggerCombatEffect(skill, undefined, skill.targetType === 'aoe', targetName, player.name, skill.name);
                onAction(buildSkillActionCommand(skill, player.name, false, targetName), skill.mpCost);
                advanceTurn();
            });
        } else if (pendingCompanionSkill) {
            const { skill, caster } = pendingCompanionSkill;
            setPendingCompanionSkill(null);
            setSelectionMode(null);
            const cc = getActorCCEffect(caster);
            if (cc.isSkip) {
                triggerFloatingText(caster.name, `행동불가 (${cc.name})`, 'debuff');
                onAction(`[동료 지시: ${caster.name}] 스킬 사용: ${skill.name} (대기)`);
                advanceTurn();
                return;
            }
            triggerCutsceneIfFinal(caster, skill, () => {
                triggerCombatEffect(skill, undefined, skill.targetType === 'aoe', targetName, caster.name, skill.name);
                onAction(buildSkillActionCommand(skill, caster.name, true, targetName), skill.mpCost);
                advanceTurn();
            });
        } else if (pendingCompanionAttack) {
            const comp = pendingCompanionAttack;
            setPendingCompanionAttack(null);
            setSelectionMode(null);
            triggerCombatEffect((comp as any).shinryokuType || '화염계', 'NORMAL', false, targetName, comp.name);
            onAction(`[동료 지시: ${comp.name}] 일반 공격 (대상: ${targetName})`);
            advanceTurn();
        } else if (pendingAttack) {
            setPendingAttack(false);
            setSelectionMode(null);
            onAction(`[일반 공격] ${targetName} 공격`);
            advanceTurn();
        } else if (pendingItem) {
            const item = pendingItem;
            setPendingItem(null);
            setSelectionMode(null);
            const isCompTurn = activeUnit?.unitType === 'companion' && activeCompanion;
            const actionCommand = isCompTurn
                ? `[전투 아이템 사용: ${activeCompanion.name}] ${item.name} x1 (대상: ${targetName})`
                : `[전투 아이템 사용] ${item.name} x1 (대상: ${targetName})`;
            onAction(actionCommand);
            advanceTurn();
        }
    };






















    const activeBondSkills = useMemo(() => {
        if (!player.bondSkills) return [];
        return player.bondSkills.filter(bs => {
            const isSourceActive = !bs.sourceId || player.companions.some(c => c.id === bs.sourceId);
            const isTargetActive = player.companions.some(c => c.id === bs.companionId);
            return isSourceActive && isTargetActive;
        });
    }, [player.bondSkills, player.companions]);

    const readyBondSkills = useMemo(() => {
        return activeBondSkills.filter(bs => {
            const gauge = player.bondGauges?.[bs.id] || 0;
            if (gauge < 100) return false;

            const sourceComp = bs.sourceId ? player.companions.find(c => c.id === bs.sourceId) : null;
            const targetComp = player.companions.find(c => c.id === bs.companionId);
            
            const isSourceAlive = bs.sourceId ? (sourceComp && sourceComp.stats.hp > 0 && !sourceComp.isDead) : (player.stats.hp > 0 && !player.isDead);
            const isTargetAlive = targetComp && targetComp.stats.hp > 0 && !targetComp.isDead;
            
            return isSourceAlive && isTargetAlive;
        });
    }, [activeBondSkills, player.bondGauges, player.companions, player.stats.hp, player.isDead]);

    const allCombatSkills = useMemo(() => {
        const list: Skill[] = getEntityAllCombatSkills(player);
        (player.companions || []).forEach(c => {
            list.push(...getEntityAllCombatSkills(c));
        });
        (readyBondSkills || []).forEach(bs => list.push(bs));
        return list;
    }, [player, readyBondSkills]);

    // 퀵 슬롯 클릭 및 키보드 단축키 실행 공통 함수
    const handleTriggerShortcutSlot = useCallback((slotIdx: number) => {
        if (isLoading || isAutoBattle) return;
        const isPlayerTurn = activeUnit?.unitType === 'player';
        const isCompanionTurn = activeUnit?.unitType === 'companion';
        if (!isPlayerTurn && !isCompanionTurn) return;
        if (isCompanionTurn && isCompanionAuto) return;

        const currentCompanion = isCompanionTurn 
            ? (activeCompanion || (activeUnit?.id ? player.companions.find(c => c.id === activeUnit.id) : null) || (activeUnit?.companionIndex !== undefined ? player.companions[activeUnit.companionIndex] : null)) 
            : null;
        const currentUnit = isCompanionTurn && currentCompanion ? currentCompanion : player;
        const shortcuts = currentUnit?.skillShortcuts || [];
        const shortcutName = shortcuts[slotIdx];
        if (!shortcutName) return;

        const isClassTrial = !!combatState.trialTier || combatState.type === 'final_trial_battle';
        const activeBondSkillsList = isClassTrial ? [] : readyBondSkills;
        const availableSkillList = !isCompanionTurn 
            ? getEntityAllCombatSkills(player, activeBondSkillsList.filter(bs => !bs.sourceId))
            : getEntityAllCombatSkills(currentCompanion!, activeBondSkillsList.filter(bs => bs.sourceId === currentCompanion?.id || bs.companionId === currentCompanion?.id));

        const isItem = shortcutName.startsWith('[ITEM]') || player.inventory.some(i => i.name === shortcutName && !availableSkillList.some(s => s.name === shortcutName));
        const rawShortcutName = shortcutName.replace(/^\[ITEM\]\s*/, '');

        if (!isItem) {
            const skill = availableSkillList.find(s => s.name === shortcutName || s.id === shortcutName);
            if (!skill || skill.type === SkillType.PASSIVE) return;
            const isMpEnough = checkSkillParticipantsMp(skill, player, currentUnit).isAllowed;
            const isWeaponAllowed = checkSkillWeaponRequirement(currentUnit, skill).isAllowed;
            if (!isMpEnough || !isWeaponAllowed) return;

            if (currentUnit === player) {
                initiateSkillUse(skill);
            } else {
                handleCompanionSkill(skill, currentCompanion);
            }
        } else {
            const item = player.inventory.find(i => i.name === rawShortcutName || i.name === shortcutName);
            if (!item || item.type !== 'Consumable' || item.name.includes('차원주문서') || item.name.includes('차원 주문서')) return;
            if (activeUnit?.unitType !== 'player' || (combatState as any).hasUsedItem) return;
            const itemQty = player.inventory.filter(i => i.name === item.name).length;
            if (itemQty <= 0) return;
            initiateItemUse(item);
        }
    }, [isLoading, isAutoBattle, activeUnit, isCompanionAuto, activeCompanion, player, combatState, readyBondSkills, initiateSkillUse, handleCompanionSkill, initiateItemUse]);

    // PC 키보드 단축키 감지 훅 연결
    useCombatKeybindHandler(
        combatKeybinds,
        !showKeybindModal && !isSkillModalOpen && !isItemModalOpen && !manualCompanionSkillOpen && !isLoading && !isAutoBattle && selectionMode === null,
        handleTriggerShortcutSlot
    );

    return (
        <div className="flex flex-col h-full bg-slate-900 relative overflow-hidden">
            {/* Bond Skills Panel */}
            <BondGaugesPanel activeBondSkills={activeBondSkills} player={player} />

            {/* [MODIFIED] Video Cutscene Overlay - Improved PC Scaling */}{activeVideo && (
  <div className="fixed inset-0 z-[1000] bg-black/95 flex items-center justify-center animate-in fade-in duration-500 backdrop-blur-md">
    <div className="relative w-full max-w-4xl max-h-[80vh] aspect-video flex items-center justify-center bg-black shadow-[0_0_50px_rgba(245,158,11,0.3)] rounded-2xl overflow-hidden">
      
      {/* 1. 유튜브 영상인 경우 (shorts, watch?v=, youtu.be 포함) */}
      {(activeVideo.url?.includes('youtube.com') || activeVideo.url?.includes('youtu.be')) ? (
        <iframe
          src={(() => {
            const raw = activeVideo.url || '';
            if (raw.includes('/shorts/')) {
              const id = raw.split('/shorts/')[1]?.split('?')[0]?.split('&')[0];
              return `https://www.youtube.com/embed/${id}?autoplay=1&rel=0`;
            }
            if (raw.includes('watch?v=') || raw.includes('watch/')) {
              const id = raw.includes('watch?v=') ? raw.split('watch?v=')[1]?.split('&')[0]?.split('?')[0] : raw.split('watch/')[1]?.split('?')[0];
              return `https://www.youtube.com/embed/${id}?autoplay=1&rel=0`;
            }
            if (raw.includes('youtu.be/')) {
              const id = raw.split('youtu.be/')[1]?.split('?')[0]?.split('&')[0];
              return `https://www.youtube.com/embed/${id}?autoplay=1&rel=0`;
            }
            if (raw.includes('/embed/')) {
              return raw.includes('autoplay=1') ? raw : `${raw}${raw.includes('?') ? '&' : '?'}autoplay=1&rel=0`;
            }
            return raw;
          })()}
          className="w-full h-full border-none"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        ></iframe>
      ) : (
        /* 2. 일반 영상 파일(.mp4 등)인 경우 */
        <video 
          src={activeVideo.url} 
          autoPlay 
          className="w-full h-full object-contain" 
          onEnded={() => setActiveVideo(null)}
        />
      )}

      {/* 닫기 버튼: 유튜브는 영상이 끝나도 창이 안 닫히므로 필수입니다 */}
      <button 
        onClick={() => setActiveVideo(null)}
        className="absolute top-4 right-4 z-[1001] bg-white/10 hover:bg-white/20 text-white w-10 h-10 rounded-full flex items-center justify-center backdrop-blur-sm transition-all pointer-events-auto"
      >
        ✕
      </button>

      {/* 오버레이 효과 */}
      <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center bg-gradient-to-t from-black/60 via-transparent to-black/20" />
    </div>
  </div>
)}

            {selectionMode && (
                <div className={`absolute top-0 left-0 right-0 z-40 p-2 text-center font-bold animate-pulse ${isResurrectionModeActive ? 'bg-amber-900/90 text-amber-300 border-b border-amber-500' : 'bg-black/85 text-amber-500 border-b border-amber-500/40'}`}>
                    <div className="flex items-center justify-center gap-2 flex-wrap">
                        <span>
                            {isPureResurrectionPending ? "부활시킬 대상을 선택하세요 (사망자 전용)" : isResurrectionModeActive ? "대상군을 선택하세요 (부활 및 회복 가능)" : selectionMode === 'enemy' ? "공격 대상을 선택하세요" : "아군 대상을 선택하세요"}
                        </span>
                        {(() => {
                            const curSkill = pendingSkill || (pendingCompanionSkill ? pendingCompanionSkill.skill : null);
                            if (!curSkill) return null;
                            const curElem = curSkill.shinryokuType || (pendingSkill ? player.shinryokuType : pendingCompanionSkill?.caster.shinryokuType) || '무속성';
                            const elCfg = SHINRYOKU_UI_CONFIG[curElem] || SHINRYOKU_UI_CONFIG.default;
                            return (
                                <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded border ${elCfg.bg} ${elCfg.text} ${elCfg.border} flex items-center gap-1 shadow-sm`}>
                                    <Sparkles size={11} />
                                    <span>스킬: {curSkill.name}</span>
                                    <span className="underline ml-0.5">[속성: {curElem}]</span>
                                </span>
                            );
                        })()}
                    </div>
                    <button onClick={() => { setSelectionMode(null); setPendingSkill(null); setPendingAttack(false); setPendingCompanionAttack(null); setPendingCompanionSkill(null); setPendingItem(null); }} className="ml-4 text-xs bg-slate-800 px-2 py-1 rounded text-slate-300 border border-slate-700 hover:bg-slate-700">취소</button>
                </div>
            )}

            {/* 아군 버프/스킬 대상 선택 시 콤팩트 아군 목록 빠른 선택창 */}
            {selectionMode === 'ally' && (
                <AllyTargetQuickSelector
                    partyMembers={partyMembers}
                    skillName={pendingSkill?.name || (pendingCompanionSkill ? pendingCompanionSkill.skill.name : (pendingItem ? pendingItem.name : undefined))}
                    isPureResurrectionPending={isPureResurrectionPending}
                    isResurrectionModeActive={isResurrectionModeActive}
                    onSelectTarget={handleTargetSelection}
                    onCancel={() => {
                        setSelectionMode(null);
                        setPendingSkill(null);
                        setPendingAttack(false);
                        setPendingCompanionAttack(null);
                        setPendingCompanionSkill(null);
                        setPendingItem(null);
                    }}
                />
            )}

            {/* Top Bar with Turn and Initiative Timeline */}
            <div className="bg-slate-900 border-b border-slate-800 flex flex-col z-10 shadow-md shrink-0">
                <div className="p-1.5 px-2 md:p-2.5 md:px-3 flex justify-between items-center border-b border-slate-800/60">
                    <div className="flex items-center space-x-1.5 sm:space-x-3">
                        <div className="flex items-center text-amber-500 font-bold font-cinzel text-xs sm:text-sm md:text-base whitespace-nowrap">
                            <Sword size={14} className="mr-1 md:size-[18px]" /> TURN {combatState.turn || 1}
                        </div>
                        <div className={`px-1.5 py-0.5 md:px-2.5 md:py-0.5 rounded border font-bold text-[9px] sm:text-[10px] md:text-xs flex items-center ${typeColor} bg-black/40 whitespace-nowrap`}>
                            <TypeIcon size={11} className="mr-1 md:size-[12px]"/> {typeLabel}
                        </div>
                    </div>

                    {/* Turn Controls */}
                    <div className="flex items-center space-x-1 sm:space-x-2">
                        {/* Companion Auto Toggle */}
                        <button
                            onClick={() => {
                                setIsCompanionAuto(prev => {
                                    const next = !prev;
                                    if (next) {
                                        isActingTurnRef.current = false;
                                        setIsActingTurn(false);
                                        turnExecutionTokenRef.current = '';
                                    }
                                    return next;
                                });
                            }}
                            className={`px-1.5 py-0.5 sm:px-2 sm:py-1 md:px-2.5 md:py-1 rounded text-[8.5px] sm:text-[10px] md:text-xs font-bold flex items-center transition-all border ${
                                isCompanionAuto 
                                ? 'bg-indigo-950/80 border-indigo-500/80 text-indigo-300 shadow-[0_0_8px_rgba(99,102,241,0.3)]' 
                                : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
                            }`}
                            title="동료가 턴마다 자동으로 전술에 맞게 스킬 및 공격을 수행합니다."
                        >
                            <Bot size={11} className="mr-0.5 md:mr-1 md:size-[13px]" />
                            <span className="hidden sm:inline">동료 자동: </span>
                            <span className="sm:hidden">동료:</span>{isCompanionAuto ? 'ON' : 'OFF'}
                        </button>

                        {/* Full Auto Toggle */}
                        <button
                            onClick={() => {
                                setIsAutoBattle(prev => {
                                    const next = !prev;
                                    if (next) {
                                        isActingTurnRef.current = false;
                                        setIsActingTurn(false);
                                        turnExecutionTokenRef.current = '';
                                    }
                                    return next;
                                });
                            }}
                            className={`px-1.5 py-0.5 sm:px-2 sm:py-1 md:px-2.5 md:py-1 rounded text-[8.5px] sm:text-[10px] md:text-xs font-bold flex items-center transition-all border ${
                                isAutoBattle 
                                ? 'bg-amber-950/80 border-amber-500/80 text-amber-300 shadow-[0_0_8px_rgba(245,158,11,0.3)]' 
                                : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
                            }`}
                            title="플레이어를 포함한 모든 아군이 자동으로 전투합니다."
                        >
                            <Sparkles size={11} className="mr-0.5 md:mr-1 md:size-[13px]" />
                            <span>AUTO: {isAutoBattle ? 'ON' : 'OFF'}</span>
                        </button>

                        {/* Combat Speed Toggle */}
                        <button
                            onClick={() => {
                                const next = combatSpeed === 'normal' ? 'fast' : 'normal';
                                setCombatSpeed(next);
                                localStorage.setItem('combat_speed', next);
                            }}
                            className={`px-1.5 py-0.5 sm:px-2 sm:py-1 md:px-2 md:py-1 rounded text-[8.5px] sm:text-[10px] md:text-xs font-bold flex items-center transition-all border ${
                                combatSpeed === 'fast'
                                ? 'bg-emerald-950/80 border-emerald-500/80 text-emerald-300'
                                : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
                            }`}
                        >
                            <FastForward size={11} className="mr-0.5 md:mr-1 md:size-[13px]" />
                            {combatSpeed === 'fast' ? '빠름' : '보통'}
                        </button>
                    </div>
                </div>

                {/* Initiative Timeline Bar (행동 순서 게이지) */}
                <div className="bg-slate-950/90 px-2 py-1 md:px-3 md:py-1.5 flex items-center overflow-x-auto custom-scrollbar gap-1.5 md:gap-2 text-xs">
                    <span className="text-[8.5px] sm:text-[10px] font-bold text-slate-400 tracking-wider shrink-0 flex items-center" title="민첩과 지능의 합산으로 결정되는 행동 순서입니다.">
                        <Activity size={10} className="mr-0.5 text-amber-500 md:size-[12px] md:mr-1" />
                        <span>행동 순서:</span>
                    </span>
                    <div className="flex items-center gap-1 md:gap-1.5 overflow-x-auto custom-scrollbar py-0.5">
                        {turnQueue.map((unit, idx) => {
                            const isCurrent = activeUnit?.id === unit.id;
                            const isPlayerUnit = unit.unitType === 'player';
                            const isCompUnit = unit.unitType === 'companion';
                            const isEnemyUnit = unit.unitType === 'enemy';
                            const isSummonUnit = unit.unitType === 'summon';

                            const bgStyle = isCurrent
                                ? 'bg-amber-950/90 border-amber-400 text-amber-200 ring-1 md:ring-2 ring-amber-400/50 shadow-[0_0_8px_rgba(245,158,11,0.5)]'
                                : isPlayerUnit
                                ? 'bg-blue-950/50 border-blue-600/40 text-blue-300'
                                : isCompUnit
                                ? 'bg-indigo-950/50 border-indigo-600/40 text-indigo-300'
                                : isSummonUnit
                                ? 'bg-emerald-950/50 border-emerald-600/40 text-emerald-300'
                                : 'bg-red-950/50 border-red-600/40 text-red-300';

                            return (
                                <div
                                    key={`${unit.id}_${idx}`}
                                    title={`행동 수치: ${unit.agility} (민첩 + 지능)`}
                                    className={`flex items-center space-x-1 md:space-x-1.5 px-1.5 py-0.5 md:px-2 md:py-1 rounded border text-[9px] md:text-[11px] font-semibold shrink-0 transition-all ${bgStyle} ${isCurrent ? 'scale-105' : 'opacity-80'}`}
                                >
                                    <span className={`text-[8px] md:text-[9px] font-mono font-bold px-0.5 md:px-1 rounded ${isCurrent ? 'bg-amber-500 text-black animate-pulse' : 'bg-slate-800 text-slate-400'}`}>
                                        {idx + 1}
                                    </span>
                                    {unit.visualUrl ? (
                                        <div className="w-3.5 h-3.5 md:w-4 md:h-4 rounded-full overflow-hidden shrink-0 border border-white/20">
                                            <FastImage src={unit.visualUrl} alt={unit.name} className="w-full h-full object-cover" />
                                        </div>
                                    ) : (
                                        isPlayerUnit ? <Crown size={10} className="text-amber-400 md:size-[12px]" /> : isCompUnit ? <User size={10} className="text-indigo-400 md:size-[12px]" /> : isSummonUnit ? <Shield size={10} className="text-emerald-400 md:size-[12px]" /> : <Skull size={10} className="text-red-400 md:size-[12px]" />
                                    )}
                                    <span className="truncate max-w-[65px] sm:max-w-[80px] md:max-w-[110px]">{unit.name}</span>
                                    <span className="text-[8px] md:text-[9px] text-amber-400/80 font-mono">({unit.agility})</span>
                                    {isCurrent && (
                                        <span className="text-[7px] md:text-[8px] bg-amber-400 text-black px-0.5 md:px-1 rounded font-black tracking-tight animate-pulse">행동</span>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

        <motion.div 
            animate={shake && !isShakeDisabled() ? { x: [-6, 6, -5, 5, -2, 2, 0], y: [-4, 4, -3, 3, 0] } : { x: 0, y: 0 }}
            transition={{ duration: 0.3 }}
            className="flex-1 p-1 md:p-4 flex flex-col md:flex-row gap-1.5 md:gap-4 justify-between relative bg-[url('https://www.transparenttextures.com/patterns/black-scales.png')] overflow-hidden items-stretch"
        >
            <div className={`absolute inset-0 transition-opacity duration-1000 ${isResurrectionModeActive ? 'bg-amber-500/10' : 'bg-transparent'} pointer-events-none`}></div>
            <div className="absolute inset-0 bg-gradient-to-b from-slate-900/50 via-transparent to-slate-900/80 pointer-events-none text-center"></div>
            
            {/* Effect Overlay & Shinryoku Combat VFX */}
            {effectOverlay && (
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 z-0 pointer-events-none transition-all duration-300"
                    style={{ backgroundColor: effectOverlay.color }}
                />
            )}
            <CombatVFXOverlay vfx={combatVfx} />

            {/* Right/Top Side: Enemies and Log */}
            <div className="order-1 md:order-2 flex-1 flex flex-col gap-1 md:gap-3 overflow-hidden min-w-0">
                <CombatEnemiesArea 
                    enemies={combatState.enemies}
                    selectionMode={selectionMode}
                    floatingTexts={floatingTexts}
                    playerType={(() => {
                        if (hoveredShortcutSkill) {
                            return hoveredShortcutSkill.shinryokuType || (activeUnit?.unitType === 'companion' && activeCompanion ? activeCompanion.shinryokuType : player.shinryokuType);
                        }
                        if (pendingSkill) {
                            return pendingSkill.shinryokuType || player.shinryokuType;
                        }
                        if (pendingCompanionSkill) {
                            return pendingCompanionSkill.skill.shinryokuType || pendingCompanionSkill.caster.shinryokuType;
                        }
                        return activeUnit?.unitType === 'companion' && activeCompanion ? activeCompanion.shinryokuType : player.shinryokuType;
                    })()}
                    skills={allCombatSkills}
                    combatVfx={combatVfx}
                    onTargetSelect={handleTargetSelection}
                />
                
                <div className="w-full max-w-2xl mx-auto flex flex-col gap-1 my-0.5 relative z-10 h-12 sm:h-16 md:h-full md:max-h-[30vh]">
                    <CombatLogList 
                        log={trimCombatLogs(combatState.log)} 
                        narrative={narrative} 
                        maxVisible={18}
                    />
                </div>
            </div>

            {/* Left/Bottom Side: Allies Grid */}
            <CombatAlliesGrid 
                partyMembers={partyMembers}
                activeUnit={activeUnit}
                isOneOnOne={isOneOnOne}
                selectionMode={selectionMode}
                isPureResurrectionPending={isPureResurrectionPending}
                isResurrectionModeActive={isResurrectionModeActive}
                bubbles={bubbles}
                floatingTexts={floatingTexts}
                combatVfx={combatVfx}
                allCombatSkills={allCombatSkills}
                enemies={combatState.enemies}
                onCommandCompanion={() => {}}
                onTargetSelect={handleTargetSelection}
                onSelectMount={setSelectedMount}
            />
        </motion.div>

            {/* Action Bar (Turn-based Player/Companion controls) */}
            <div className="p-1.5 sm:p-2 md:p-3 bg-slate-900 border-t border-slate-800 z-20 shrink-0 shadow-[0_-5px_15px_rgba(0,0,0,0.3)]">
                {/* 퀵 숏컷 단축버튼 패널 (최대 10개) */}
                {(() => {
                    const isPlayerTurn = activeUnit?.unitType === 'player';
                    const isCompanionTurn = activeUnit?.unitType === 'companion';

                    // 적 턴이거나 조작 가능한 아군 턴이 아닐 때는 숏컷 패널을 숨김
                    if (!isPlayerTurn && !isCompanionTurn) return null;
                    if (activeUnit?.unitType === 'enemy') return null;
                    if (isCompanionTurn && isCompanionAuto) return null;
                    if (isAutoBattle) return null;

                    const currentCompanion = isCompanionTurn ? (activeCompanion || (activeUnit.id ? player.companions.find(c => c.id === activeUnit.id) : null) || (activeUnit.companionIndex !== undefined ? player.companions[activeUnit.companionIndex] : null)) : null;
                    const currentUnit = isCompanionTurn && currentCompanion ? currentCompanion : player;
                    const shortcuts = currentUnit?.skillShortcuts || [];
                    
                    const isClassTrial = !!combatState.trialTier || combatState.type === 'final_trial_battle';
                    const activeBondSkillsList = isClassTrial ? [] : readyBondSkills;
                    const availableSkillList = !isCompanionTurn 
                        ? getEntityAllCombatSkills(player, activeBondSkillsList.filter(bs => !bs.sourceId))
                        : getEntityAllCombatSkills(currentCompanion!, activeBondSkillsList.filter(bs => bs.sourceId === currentCompanion?.id || bs.companionId === currentCompanion?.id));
                        
                    const isPlayerOrManualCompanionTurn = (isPlayerTurn && !isAutoBattle) || 
                                                          (isCompanionTurn && currentCompanion && !isCompanionAuto && !isAutoBattle);

                    return (
                        <div className="max-w-4xl mx-auto mb-1 bg-slate-950/90 p-1 rounded-lg border border-amber-500/30 shadow-md relative">
                            <div className="flex items-center justify-between mb-0.5 px-0.5">
                                <div className="flex items-center gap-1 text-[8px] md:text-xs font-bold text-slate-300">
                                    <Zap size={10} className="text-amber-400 fill-amber-400 animate-pulse shrink-0" />
                                    <span className="text-amber-300 truncate">[{currentUnit.name}] 퀵 슬롯</span>
                                    <span className="text-[7.5px] text-slate-500 font-mono">({shortcuts.filter(Boolean).length}/10)</span>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setShowKeybindModal(true)}
                                    className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] sm:text-[9px] md:text-[10px] font-bold bg-slate-900 hover:bg-slate-850 text-amber-300 hover:text-amber-200 border border-amber-500/40 hover:border-amber-400 transition-all active:scale-95 shadow-sm"
                                    title="전투 단축키 설정"
                                >
                                    <Keyboard size={11} className="text-amber-400 shrink-0" />
                                    <span>단축키 설정</span>
                                </button>
                            </div>

                            <div className="grid grid-cols-10 gap-0.5 sm:gap-1">
                                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(slotIdx => {
                                    const shortcutName = shortcuts[slotIdx];
                                    const isItem = shortcutName ? (shortcutName.startsWith('[ITEM]') || player.inventory.some(i => i.name === shortcutName && !availableSkillList.some(s => s.name === shortcutName))) : false;
                                    const rawShortcutName = shortcutName ? shortcutName.replace(/^\[ITEM\]\s*/, '') : '';
                                    
                                    const skill = !isItem && shortcutName ? availableSkillList.find(s => s.name === shortcutName || s.id === shortcutName) : null;
                                    const item = isItem && shortcutName ? player.inventory.find(i => i.name === rawShortcutName || i.name === shortcutName) : null;
                                    
                                    const itemQty = item ? player.inventory.filter(i => i.name === item.name).length : 0;
                                    
                                    const isMpEnough = skill ? checkSkillParticipantsMp(skill, player, currentUnit).isAllowed : false;
                                     const isWeaponAllowed = skill ? checkSkillWeaponRequirement(currentUnit, skill).isAllowed : true;
                                    const isUsable = skill && isPlayerOrManualCompanionTurn && !isLoading && isMpEnough && isWeaponAllowed && skill.type !== SkillType.PASSIVE;
                                    const isItemUsable = item && item.type === 'Consumable' && !item.name.includes('차원주문서') && !item.name.includes('차원 주문서') && activeUnit?.unitType === 'player' && !isAutoBattle && !isLoading && itemQty > 0;
                                    
                                    const isHovered = (skill && hoveredShortcutSkill?.name === skill.name) || (item && hoveredShortcutItem?.name === item.name);

                                    return (
                                        <div key={slotIdx} className="relative group">
                                            {/* Hover / Touch Info Tooltip */}
                                            {isHovered && skill && (
                                                <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 w-44 md:w-52 bg-slate-950/95 backdrop-blur border border-amber-500/60 p-1.5 rounded-lg shadow-2xl z-50 pointer-events-none text-left animate-in fade-in zoom-in-95">
                                                    <div className="flex justify-between items-start mb-0.5 border-b border-slate-800 pb-0.5">
                                                        <h5 className="font-bold text-[10px] text-amber-300 flex items-center gap-1">
                                                            <span>{skill.name}</span>
                                                            {skill.tier && <span className="text-[7px] px-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">{skill.tier}</span>}
                                                        </h5>
                                                        <span className="text-[7.5px] font-mono font-bold text-cyan-300 bg-cyan-950 px-1 rounded border border-cyan-800">
                                                            MP {skill.mpCost || 0}
                                                        </span>
                                                    </div>
                                                    {(() => {
                                                        const sElem = skill.shinryokuType || (currentUnit as any)?.shinryokuType || '무속성';
                                                        const sElemCfg = SHINRYOKU_UI_CONFIG[sElem] || SHINRYOKU_UI_CONFIG.default;
                                                        return (
                                                            <>
                                                                <div className="text-[7.5px] font-mono mb-0.5 flex items-center justify-between">
                                                                    <span className="text-slate-400">종류: {skill.type}</span>
                                                                    {skill.type !== SkillType.BUFF && skill.type !== SkillType.DEBUFF && skill.type !== SkillType.PASSIVE && (
                                                                    <span className={`px-1 py-0.2 rounded border font-bold ${sElemCfg.bg} ${sElemCfg.text} ${sElemCfg.border}`}>
                                                                        속성: {sElem}
                                                                    </span>
                                                                    )}
                                                                    <span className="text-slate-400">대상: {skill.targetType === 'aoe' ? '광역' : skill.targetType === 'ally' ? '아군' : '단일'}</span>
                                                                </div>
                                                                <p className="text-[8px] text-slate-200 leading-tight line-clamp-2 italic bg-slate-900/60 p-1 rounded border border-slate-800 mb-0.5">
                                                                    "{skill.description}"
                                                                </p>
                                                                {skill.powerRatio && (
                                                                    <div className="text-[7.5px] text-amber-400 font-mono font-bold flex justify-between items-center">
                                                                        <span>위력: {skill.powerRatio}%</span>
                                                                        {skill.type !== SkillType.BUFF && skill.type !== SkillType.DEBUFF && skill.type !== SkillType.PASSIVE && <span className={sElemCfg.text}>[속성: {sElem}]</span>}
                                                                    </div>
                                                                )}
                                                            </>
                                                        );
                                                    })()}
                                                </div>
                                            )}

                                            {isHovered && item && (
                                                <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 w-44 md:w-52 bg-slate-950/95 backdrop-blur border border-emerald-500/60 p-1.5 rounded-lg shadow-2xl z-50 pointer-events-none text-left animate-in fade-in zoom-in-95">
                                                    <div className="flex justify-between items-start mb-0.5 border-b border-slate-800 pb-0.5">
                                                        <h5 className="font-bold text-[10px] text-emerald-300 flex items-center gap-1">
                                                            <span>{item.name}</span>
                                                            {item.rarity && <span className="text-[7px] px-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">{item.rarity}</span>}
                                                        </h5>
                                                        <span className="text-[7.5px] font-mono font-bold text-amber-300 bg-amber-950 px-1 rounded border border-amber-800">
                                                            보유 {itemQty}개
                                                        </span>
                                                    </div>
                                                    <div className="text-[7.5px] text-slate-400 font-mono mb-0.5">
                                                        종류: {item.type}
                                                    </div>
                                                    <p className="text-[8px] text-slate-200 leading-tight line-clamp-2 italic bg-slate-900/60 p-1 rounded border border-slate-800 mb-0.5">
                                                        "{item.description}"
                                                    </p>
                                                </div>
                                            )}

                                             {skill || item ? (
                                                <button
                                                    type="button"
                                                    onClick={() => handleTriggerShortcutSlot(slotIdx)}
                                                    onMouseEnter={() => {
                                                        if (skill) setHoveredShortcutSkill(skill);
                                                        if (item) setHoveredShortcutItem(item);
                                                    }}
                                                    onMouseLeave={() => {
                                                        setHoveredShortcutSkill(null);
                                                        setHoveredShortcutItem(null);
                                                    }}
                                                    onTouchStart={() => {
                                                        if (skill) setHoveredShortcutSkill(skill);
                                                        if (item) setHoveredShortcutItem(item);
                                                    }}
                                                    onTouchEnd={() => setTimeout(() => {
                                                        setHoveredShortcutSkill(null);
                                                        setHoveredShortcutItem(null);
                                                    }, 2500)}
                                                    disabled={skill ? !isUsable : !isItemUsable}
                                                    className={`w-full h-8 sm:h-10 p-0.5 rounded border flex flex-col items-center justify-center gap-0 transition-all relative overflow-hidden group ${
                                                        skill
                                                            ? isUsable
                                                                ? 'bg-gradient-to-b from-indigo-950/80 to-slate-950 border-indigo-500/60 hover:border-amber-400 hover:from-indigo-900/90 text-slate-100 shadow-sm active:scale-95 cursor-pointer'
                                                                : 'bg-slate-950/60 border-slate-800/80 text-slate-600 opacity-50 cursor-not-allowed'
                                                            : isItemUsable
                                                                ? 'bg-gradient-to-b from-emerald-950/80 to-slate-950 border-emerald-500/60 hover:border-amber-400 hover:from-emerald-900/90 text-slate-100 shadow-sm active:scale-95 cursor-pointer'
                                                                : 'bg-slate-950/60 border-slate-800/80 text-slate-600 opacity-50 cursor-not-allowed'
                                                    }`}
                                                >
                                                    {/* Slot index badge & Keybind badge */}
                                                    <span className="absolute top-0.5 left-0.5 text-[5px] sm:text-[6.5px] font-mono font-bold text-amber-400/90 z-10 leading-none flex items-center gap-0.5 bg-slate-950/80 px-0.5 rounded border border-amber-500/20" title={`단축키: ${formatKeyDisplay(combatKeybinds[slotIdx])}`}>
                                                        <span>#{slotIdx + 1}</span>
                                                        <span className="text-amber-300 font-black">[{formatKeyDisplay(combatKeybinds[slotIdx])}]</span>
                                                    </span>

                                                    {/* Cost / Qty badge */}
                                                    {skill ? (
                                                        <span className={`absolute top-0.5 right-0.5 text-[5px] sm:text-[7px] font-mono font-bold px-0.5 rounded border z-10 leading-none ${
                                                            isMpEnough ? 'bg-cyan-950/90 text-cyan-300 border-cyan-800/60' : 'bg-red-950/90 text-red-400 border-red-800/60'
                                                        }`}>
                                                            {skill.mpCost || 0}M
                                                        </span>
                                                    ) : (
                                                        <span className={`absolute top-0.5 right-0.5 text-[5px] sm:text-[7px] font-mono font-bold px-0.5 rounded border z-10 leading-none bg-emerald-950/90 text-emerald-300 border-emerald-800/60`}>
                                                            {itemQty}
                                                        </span>
                                                    )}

                                                    {/* Thumbnail Icon/Image */}
                                                    <div className={`w-3 h-3 sm:w-4 sm:h-4 rounded border ${skill ? 'border-indigo-400/30' : 'border-emerald-400/30'} overflow-hidden bg-slate-950 flex items-center justify-center shrink-0 mt-0.5 shadow-inner group-hover:scale-105 transition-transform`}>
                                                        {skill ? (
                                                            (skill.imageUrl || getRegisteredSkillImage(skill.id) || getRegisteredSkillImage(skill.name)) ? (
                                                                <FastImage src={skill.imageUrl || getRegisteredSkillImage(skill.id) || getRegisteredSkillImage(skill.name)} alt={skill.name} className="w-full h-full object-cover" />
                                                            ) : (
                                                                (() => {
                                                                    const IconComp = getSkillIconComponent(skill);
                                                                    return <IconComp size={8} className={isUsable ? 'text-indigo-300 group-hover:text-amber-300' : 'text-slate-600'} />;
                                                                })()
                                                            )
                                                        ) : (
                                                            item ? (
                                                                <FastImage src={getItemImage(item)} alt={item.name} className="w-full h-full object-cover" />
                                                            ) : (
                                                                <Package size={8} className={isItemUsable ? 'text-emerald-300 group-hover:text-amber-300' : 'text-slate-600'} />
                                                            )
                                                        )}
                                                    </div>

                                                    {/* Skill / Item Name */}
                                                    <span className="text-[5.5px] sm:text-[7.5px] font-bold truncate w-full text-center leading-none mt-0.5 px-0.5">
                                                        {item ? item.name : skill?.name}
                                                    </span>
                                                    {skill && skill.type !== SkillType.BUFF && skill.type !== SkillType.DEBUFF && skill.type !== SkillType.PASSIVE && (() => {
                                                        const sElem = skill.shinryokuType || (currentUnit as any)?.shinryokuType || '무속성';
                                                        const sElemCfg = SHINRYOKU_UI_CONFIG[sElem] || SHINRYOKU_UI_CONFIG.default;
                                                        return (
                                                            <span className={`text-[4.5px] sm:text-[6.5px] font-bold px-0.5 sm:px-1 py-0.2 rounded border ${sElemCfg.bg} ${sElemCfg.text} ${sElemCfg.border} leading-none truncate max-w-full mt-0.5 shadow-sm`}>
                                                                속성: {sElem}
                                                            </span>
                                                        );
                                                    })()}
                                                </button>
                                            ) : (
                                                <div className="w-full h-8 sm:h-10 p-0.5 rounded border border-dashed border-slate-800/80 bg-slate-950/40 flex flex-col items-center justify-center text-slate-600">
                                                    <span className="text-[5px] sm:text-[6.5px] font-mono leading-none text-slate-500">
                                                        #{slotIdx + 1} [{formatKeyDisplay(combatKeybinds[slotIdx])}]
                                                    </span>
                                                    <span className="text-[5px] text-slate-600 leading-none mt-0.5">빈 슬롯</span>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })()}

                {/* Active Unit Indicator Header */}
                <div className="max-w-4xl mx-auto mb-2 flex items-center justify-between">
                    <div className="flex items-center space-x-2 text-xs md:text-sm font-bold">
                        {activeUnit?.unitType === 'player' ? (
                            <span className="text-amber-400 flex items-center">
                                <Crown size={15} className="mr-1 text-amber-400 animate-pulse" />
                                <span>[플레이어 {player.name}]의 행동 차례입니다!</span>
                            </span>
                        ) : activeUnit?.unitType === 'companion' && activeCompanion ? (
                            <span className="text-indigo-400 flex items-center">
                                <User size={15} className="mr-1 text-indigo-400 animate-pulse" />
                                <span>[동료 {activeCompanion.name}]의 행동 차례입니다 {!isCompanionAuto && !isAutoBattle ? '(수동 지휘)' : '(자동)'}</span>
                            </span>
                        ) : activeUnit?.unitType === 'enemy' ? (
                            <span className="text-red-400 flex items-center">
                                <Skull size={15} className="mr-1 text-red-400 animate-pulse" />
                                <span>[{activeUnit.name}]의 행동 차례입니다...</span>
                            </span>
                        ) : activeUnit?.unitType === 'summon' ? (
                            <span className="text-emerald-400 flex items-center">
                                <Sparkles size={15} className="mr-1 text-emerald-400 animate-pulse" />
                                <span>[소환수 {activeUnit.name}]의 행동 차례입니다...</span>
                            </span>
                        ) : (
                            <span className="text-slate-400 flex items-center">
                                <Loader2 size={15} className="mr-1 text-slate-400 animate-spin" />
                                <span>턴 전환 중...</span>
                            </span>
                        )}
                    </div>
                    {activeTurnBgmName && (
                        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-500/40 text-[10px] text-cyan-300 font-bold shadow-sm animate-pulse shrink-0">
                            <Music size={11} className="text-cyan-400" />
                            <span className="truncate max-w-[130px] sm:max-w-[200px]">[{activeTurnBgmName}] 테마 BGM</span>
                        </div>
                    )}
                </div>

                {/* If Companion Turn and Manual Mode */}
                {activeUnit?.unitType === 'companion' && activeCompanion && !isCompanionAuto && !isAutoBattle ? (
                    <div className="max-w-4xl mx-auto grid grid-cols-5 gap-1.5 md:gap-4">
                        <button
                            onClick={() => {
                                setPendingCompanionAttack(activeCompanion);
                                setSelectionMode('enemy');
                            }}
                            disabled={isLoading}
                            className="py-1.5 md:py-2.5 bg-gradient-to-b from-red-900 to-red-950 hover:from-red-800 text-red-100 rounded-lg md:rounded-xl border border-red-700/50 font-bold flex flex-col items-center justify-center transition-all shadow-lg active:scale-95 group"
                        >
                            <Sword size={16} className="mb-0.5 group-hover:scale-110 md:size-5" />
                            <span className="text-[8.5px] md:text-xs uppercase">동료 일반공격</span>
                        </button>

                        <button
                            onClick={() => {
                                onAction(`[동료 지시: ${activeCompanion.name}] 방어 태세`);
                                advanceTurn();
                            }}
                            disabled={isLoading}
                            className="py-1.5 md:py-2.5 bg-gradient-to-b from-emerald-800 to-emerald-950 hover:from-emerald-700 text-emerald-100 rounded-lg md:rounded-xl border border-emerald-700/50 font-bold flex flex-col items-center justify-center transition-all shadow-lg active:scale-95 group"
                        >
                            <Shield size={16} className="mb-0.5 group-hover:scale-110 md:size-5" />
                            <span className="text-[8.5px] md:text-xs uppercase">동료 방어</span>
                        </button>

                        <button
                            onClick={() => {
                                setCommandTarget(activeCompanion);
                            }}
                            disabled={isLoading}
                            className="py-1.5 md:py-2.5 bg-gradient-to-b from-indigo-900 to-indigo-950 hover:from-indigo-800 text-indigo-100 rounded-lg md:rounded-xl border border-indigo-700/50 font-bold flex flex-col items-center justify-center transition-all shadow-lg active:scale-95 group"
                        >
                            <Zap size={16} className="mb-0.5 group-hover:scale-110 md:size-5" />
                            <span className="text-[8.5px] md:text-xs uppercase">동료 스킬</span>
                        </button>

                        <button
                            onClick={() => {
                                setPendingAttack(false);
                                setPendingSkill(null);
                                setPendingCompanionAttack(null);
                                setPendingCompanionSkill(null);
                                setCommandTarget(null);
                                setIsItemModalOpen(true);
                            }}
                            disabled={isLoading || (combatState as any).hasUsedItem}
                            className="py-1.5 md:py-2.5 bg-gradient-to-b from-green-900 to-green-950 hover:from-green-800 text-green-100 rounded-lg md:rounded-xl border border-green-700/50 font-bold flex flex-col items-center justify-center transition-all disabled:opacity-40 shadow-lg active:scale-95 group"
                        >
                            <Heart size={16} className="mb-0.5 group-hover:scale-110 transition-transform md:size-5" />
                            <span className="text-[8.5px] md:text-xs uppercase">아이템</span>
                        </button>

                        <button
                            onClick={() => {
                                const comp = activeCompanion;
                                if (comp.currentTactics === "방어 태세" || comp.currentTactics === "방어 유지") {
                                    onAction(`[동료 지시: ${comp.name}] 방어 (대상: ${comp.name})`);
                                    advanceTurn();
                                    return;
                                }
                                if (comp.currentTactics === "스킬 제한") {
                                    const targetEnemy = combatState.enemies.find(e => e.hp > 0);
                                    const targetName = targetEnemy ? targetEnemy.name : '적군';
                                    triggerCombatEffect((comp as any).shinryokuType || '화염계', 'NORMAL', false, targetName, comp.name);
                                    onAction(`[동료 지시: ${comp.name}] 일반 공격 (대상: ${targetName})`);
                                    advanceTurn();
                                    return;
                                }

                                 const isClassTrial = !!combatState.trialTier || combatState.type === 'final_trial_battle';
                                const compBondSkills = isClassTrial ? [] : readyBondSkills.filter(bs => bs.sourceId === comp.id || bs.companionId === comp.id);
                                const allCompSkills = getEntityAllCombatSkills(comp, compBondSkills);
                                const usableSkills = allCompSkills.filter(s => 
                                    checkSkillParticipantsMp(s, player, comp).isAllowed &&
                                    s.type !== SkillType.PASSIVE &&
                                    checkSkillWeaponRequirement(comp, s).isAllowed
                                );
                                
                                if (usableSkills.length > 0) {
                                    const { skill: selectedSkill, targetName } = selectSkillByTactics(comp, usableSkills);

                                    if (selectedSkill) {
                                        triggerCombatEffect(selectedSkill, undefined, selectedSkill.targetType === 'aoe', targetName, comp.name, selectedSkill.name);
                                        if (selectedSkill.isBondSkill) {
                                            onAction(`[인연 스킬] ${selectedSkill.id} (대상: ${targetName})`, selectedSkill.mpCost);
                                        } else {
                                            onAction(`[동료 지시: ${comp.name}] 스킬 사용: ${selectedSkill.name} (대상: ${targetName})`, selectedSkill.mpCost);
                                        }
                                    } else {
                                        const targetEnemy = combatState.enemies.find(e => e.hp > 0);
                                        const tName = targetEnemy ? targetEnemy.name : '적군';
                                        triggerCombatEffect((comp as any).shinryokuType || '화염계', 'NORMAL', false, tName, comp.name);
                                        onAction(`[동료 지시: ${comp.name}] 일반 공격 (대상: ${tName})`);
                                    }
                                } else {
                                    const targetEnemy = combatState.enemies.find(e => e.hp > 0);
                                    const targetName = targetEnemy ? targetEnemy.name : '적군';
                                    triggerCombatEffect((comp as any).shinryokuType || '화염계', 'NORMAL', false, targetName, comp.name);
                                    onAction(`[동료 지시: ${comp.name}] 일반 공격 (대상: ${targetName})`);
                                }
                                advanceTurn();
                            }}
                            disabled={isLoading}
                            className="py-1.5 md:py-2.5 bg-gradient-to-b from-amber-900 to-amber-950 hover:from-amber-800 text-amber-100 rounded-lg md:rounded-xl border border-amber-700/50 font-bold flex flex-col items-center justify-center transition-all shadow-lg active:scale-95 group"
                        >
                            <Bot size={16} className="mb-0.5 group-hover:scale-110 md:size-5" />
                            <span className="text-[8.5px] md:text-xs uppercase">자동 실행</span>
                        </button>
                    </div>
                ) : activeUnit?.unitType === 'enemy' ? (
                    <div className="max-w-4xl mx-auto flex items-center justify-center py-3 bg-slate-950/60 rounded-xl border border-red-500/20">
                        <Skull size={18} className="text-red-400 mr-2 animate-bounce" />
                        <span className="text-xs text-red-300 font-bold animate-pulse">{activeUnit.name}의 행동을 처리하는 중...</span>
                    </div>
                ) : (
                    /* Default Player Turn Controls */
                    <div className="max-w-4xl mx-auto grid grid-cols-5 gap-1.5 md:gap-4">
                        <button onClick={initiateAttack} disabled={isLoading || (activeUnit?.unitType !== 'player' && !isAutoBattle)} className="py-1.5 md:py-2.5 bg-gradient-to-b from-red-900 to-red-950 hover:from-red-800 hover:to-red-900 text-red-100 rounded-lg md:rounded-xl border border-red-700/50 hover:border-red-500 font-bold flex flex-col items-center justify-center transition-all disabled:opacity-40 shadow-lg active:scale-95 group"><Sword size={16} className="mb-0.5 group-hover:scale-110 transition-transform md:size-5" /><span className="text-[8.5px] md:text-xs tracking-wider uppercase">일반공격</span></button>
                        <button onClick={initiateDefense} disabled={isLoading || (activeUnit?.unitType !== 'player' && !isAutoBattle)} className="py-1.5 md:py-2.5 bg-gradient-to-b from-emerald-800 to-emerald-950 hover:from-emerald-700 hover:to-emerald-800 text-emerald-100 rounded-lg md:rounded-xl border border-emerald-700/50 hover:border-emerald-500 font-bold flex flex-col items-center justify-center transition-all disabled:opacity-40 shadow-lg active:scale-95 group"><Shield size={16} className="mb-0.5 group-hover:scale-110 transition-transform md:size-5" /><span className="text-[8.5px] md:text-xs tracking-wider uppercase">방어</span></button>
                        <button onClick={() => setIsSkillModalOpen(true)} disabled={isLoading || (activeUnit?.unitType !== 'player' && !isAutoBattle)} className="py-1.5 md:py-2.5 bg-gradient-to-b from-indigo-900 to-indigo-950 hover:from-indigo-800 hover:to-indigo-900 text-indigo-100 rounded-lg md:rounded-xl border border-indigo-700/50 hover:border-indigo-500 font-bold flex flex-col items-center justify-center transition-all disabled:opacity-40 shadow-lg active:scale-95 group"><Zap size={16} className="mb-0.5 group-hover:scale-110 transition-transform md:size-5" /><span className="text-[8.5px] md:text-xs tracking-wider uppercase">스킬</span></button>
                        <button onClick={() => setIsItemModalOpen(true)} disabled={isLoading || (combatState as any).hasUsedItem || (activeUnit?.unitType !== 'player' && !isAutoBattle)} className="py-1.5 md:py-2.5 bg-gradient-to-b from-green-900 to-green-950 hover:from-green-800 hover:to-green-900 text-green-100 rounded-lg md:rounded-xl border border-green-700/50 hover:border-green-500 font-bold flex flex-col items-center justify-center transition-all disabled:opacity-40 shadow-lg active:scale-95 group"><Heart size={16} className="mb-0.5 group-hover:scale-110 transition-transform md:size-5" /><span className="text-[8.5px] md:text-xs tracking-wider uppercase">아이템</span></button>
                        <button onClick={() => { onAction('도망친다'); advanceTurn(); }} disabled={isLoading || (activeUnit?.unitType !== 'player' && !isAutoBattle)} className="py-1.5 md:py-2.5 bg-gradient-to-b from-slate-800 to-slate-900 hover:from-slate-700 hover:to-slate-800 text-slate-300 rounded-lg md:rounded-xl border border-slate-600 hover:border-slate-400 font-bold flex flex-col items-center justify-center transition-all disabled:opacity-40 shadow-lg active:scale-95 group"><Wind size={16} className="mb-0.5 group-hover:scale-110 transition-transform md:size-5" /><span className="text-[8.5px] md:text-xs tracking-wider uppercase">도망</span></button>
                    </div>
                )}
            </div>

            {isSkillModalOpen && (
                <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <SkillSelector 
                        skills={getEntityAllCombatSkills(player, (!!combatState.trialTier || combatState.type === 'final_trial_battle') ? [] : readyBondSkills.filter(bs => !bs.sourceId))} 
                        currentTier={player.classTier} 
                        player={player} 
                        onSelect={initiateSkillUse} 
                        onClose={() => setIsSkillModalOpen(false)} 
                        isClassTrial={!!combatState.trialTier || combatState.type === 'final_trial_battle'}
                    />
                </div>
            )}

            {dualTargetSkill && (
                <SingleSkillTargetModal
                    isOpen={!!dualTargetSkill}
                    skill={dualTargetSkill}
                    casterName={activeUnit?.unitType === 'companion' && activeCompanion ? activeCompanion.name : player.name}
                    enemies={combatState.enemies}
                    player={player}
                    companions={player.companions}
                    onConfirm={(attackTarget, buffTarget) => {
                        const targetSkill = dualTargetSkill;
                        const isCompanionTurn = activeUnit?.unitType === 'companion' && !!activeCompanion;
                        const caster = isCompanionTurn && activeCompanion ? activeCompanion : player;
                        setDualTargetSkill(null);
                        triggerCutsceneIfFinal(caster, targetSkill, () => {
                            triggerCombatEffect(targetSkill, undefined, false, attackTarget, caster.name, targetSkill.name);
                            onAction(buildSkillActionCommand(targetSkill, caster.name, Boolean(isCompanionTurn && activeCompanion), attackTarget, buffTarget), targetSkill.mpCost);
                            advanceTurn();
                        });
                    }}
                    onClose={() => setDualTargetSkill(null)}
                />
            )}

          
         {isItemModalOpen && (
                <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <ItemSelectionModal
                        items={player.inventory.filter(item => item.type === "Consumable" && !item.name.includes("차원이동주문서") && !item.name.includes("차원이동 주문서"))}
                        partyMembers={partyMembers}
                        enemies={combatState.enemies}
                        onSelect={(item, quantity, targetName) => {
                            const isCompTurn = activeUnit?.unitType === 'companion' && activeCompanion;
                            if (targetName) {
                                setIsItemModalOpen(false);
                                setPendingItem(null);
                                setSelectionMode(null);
                                const actionCommand = isCompTurn
                                    ? `[전투 아이템 사용: ${activeCompanion.name}] ${item.name} x1 (대상: ${targetName})`
                                    : `[전투 아이템 사용] ${item.name} x1 (대상: ${targetName})`;
                                onAction(actionCommand);
                                advanceTurn();
                                return;
                            }
                            setPendingItem({ name: item.name, quantity: 1 });
                            const isOffensive = item.secondaryOptions?.some(opt => opt.includes("포획") || opt.includes("상태이상 부여")) || 
                                              item.description?.includes("포획") || 
                                              item.description?.includes("상태이상 부여");
                            setSelectionMode(isOffensive ? "enemy" : "ally");
                            setIsItemModalOpen(false);
                        }}
                        onClose={() => setIsItemModalOpen(false)}
                    />
                </div>
            )}

            {commandTarget && (
                <CompanionCommandModal
                    companion={commandTarget}
                    player={player}
                    skills={getEntityAllCombatSkills(commandTarget, (!!combatState.trialTier || combatState.type === 'final_trial_battle') ? [] : readyBondSkills.filter(bs => bs.sourceId === commandTarget.id || bs.companionId === commandTarget.id))}
                    onAction={onAction}
                    onSelectSkill={(skill) => handleCompanionSkill(skill, commandTarget)}
                    onClose={() => setCommandTarget(null)}
                    isClassTrial={!!combatState.trialTier || combatState.type === 'final_trial_battle'}
                />
            )}

            {selectedMount && (
                <div className="absolute inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
                    <MountDetailsModal 
                        mount={selectedMount.mount || selectedMount} 
                        riderShinryokuType={selectedMount.riderShinryokuType} 
                        onClose={() => setSelectedMount(null)} 
                    />
                </div>
            )}

            {/* 전투 퀵슬롯 단축키 설정 모달 */}
            <CombatShortcutKeybindModal
                isOpen={showKeybindModal}
                onClose={() => setShowKeybindModal(false)}
                currentKeybinds={combatKeybinds}
                onSaveKeybinds={(newKeys) => setCombatKeybinds(newKeys)}
                unitName={activeUnit?.unitType === 'companion' ? (activeCompanion?.name || '동료') : player.name}
                shortcuts={
                    activeUnit?.unitType === 'companion' 
                        ? (activeCompanion?.skillShortcuts || player.companions.find(c => c.id === activeUnit.id)?.skillShortcuts || []) 
                        : (player.skillShortcuts || [])
                }
            />
        </div>
    );
};

export default CombatInterface;
