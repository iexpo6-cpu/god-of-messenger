import React, { memo, useCallback, useMemo } from 'react';
import { Companion, Skill } from '../../types';
import { PartyCard } from './PartyCard';
import { FloatingFeedbackItem } from './FloatingFeedbackOverlay';

interface CombatAlliesGridProps {
    partyMembers: any[];
    activeUnit: any;
    isOneOnOne?: boolean;
    selectionMode: 'enemy' | 'ally' | 'none';
    isPureResurrectionPending?: boolean;
    isResurrectionModeActive?: boolean;
    bubbles: Record<string, { text: string }>;
    floatingTexts: Record<string, FloatingFeedbackItem[]>;
    combatVfx: any;
    allCombatSkills: Skill[];
    enemies?: any[];
    onCommandCompanion: (companion: Companion) => void;
    onTargetSelect: (name: string) => void;
    onSelectMount: (data: { mount: any; riderShinryokuType?: string }) => void;
}

/**
 * 아군 3x3 진형 그리드를 전담하는 초경량 독립 컴포넌트
 * - 피격당한 동료나 턴이 돌아온 동료 슬롯만 독립적으로 다시 그려지도록 격리
 * - 안정적인 콜백 참조를 유지하여 불필요한 전체 그리드 재계산 부하를 획기적으로 절감
 */
export const CombatAlliesGrid = memo(({
    partyMembers,
    activeUnit,
    isOneOnOne = false,
    selectionMode,
    isPureResurrectionPending = false,
    isResurrectionModeActive = false,
    bubbles,
    floatingTexts,
    combatVfx,
    allCombatSkills,
    enemies = [],
    onCommandCompanion,
    onTargetSelect,
    onSelectMount
}: CombatAlliesGridProps) => {
    const handleAllyClick = useCallback((name: string, entity?: any, isPlayer?: boolean) => {
        if (selectionMode === 'ally') {
            onTargetSelect(name);
        }
    }, [selectionMode, onTargetSelect]);

    // 3x3 그리드 O(1) 매핑 및 VFX 공격자 진영 판정 사전 캐싱
    const gridMap = useMemo(() => {
        const map: Record<string, any> = {};
        for (let i = 0; i < partyMembers.length; i++) {
            const m = partyMembers[i];
            if (m && m.position) {
                map[`${m.position.row}_${m.position.col}`] = m;
            }
        }
        return map;
    }, [partyMembers]);

    const vfxIsEnemyAttacker = useMemo(() => {
        if (!combatVfx || !combatVfx.attackerName) return false;
        return enemies.some(e => e.name === combatVfx.attackerName);
    }, [combatVfx, enemies]);

    return (
        <div 
            data-combat-area="allies" 
            className="order-2 md:order-1 flex flex-col gap-1 pb-1 px-1 md:px-2 shrink-0 relative z-10 w-full md:w-[370px] lg:w-[430px] overflow-y-auto max-h-[38vh] md:max-h-none no-scrollbar bg-slate-950/40 p-1 md:p-1.5 rounded-lg border border-white/5 shadow-2xl self-center md:self-stretch justify-center"
        >
            <div className="grid grid-cols-3 gap-1 md:gap-1.5 w-full">
                {[0, 1, 2].map(row => (
                    <React.Fragment key={`row_${row}`}>
                        {[0, 1, 2].map(col => {
                            const member = gridMap[`${row}_${col}`];
                            const isCurrentTurn = (activeUnit?.unitType === 'player' && member?.isPlayer) || 
                                                  (activeUnit?.unitType === 'companion' && (activeUnit.id === member?.id || activeUnit.name === member?.name));
                            
                            const isHit = member && (
                                combatVfx?.targetName === member.name || 
                                (combatVfx?.isAoe && combatVfx?.tier !== 'BUFF' && vfxIsEnemyAttacker) || 
                                (combatVfx?.isAoe && combatVfx?.tier === 'BUFF' && !vfxIsEnemyAttacker)
                            );

                            return (
                                <div key={`slot_${row}_${col}`} className="w-full relative min-h-[76px] sm:min-h-[84px] md:min-h-[94px] flex">
                                    {member ? (
                                        <div 
                                            key={`member_${member.id || member.name}`}
                                            data-combat-unit={member.name} 
                                            data-clean-name={member.name} 
                                            className="w-full h-full transform hover:-translate-y-0.5 transition-transform duration-200 flex"
                                        >
                                            <PartyCard 
                                                name={member.name} 
                                                hp={member.stats.hp} 
                                                maxHp={member.finalStats.maxHp} 
                                                mp={member.stats.mp} 
                                                maxMp={member.finalStats.maxMp} 
                                                level={member.level} 
                                                shinryokuType={member.shinryokuType}
                                                skills={allCombatSkills}
                                                classType={member.classType}
                                                isActive={isCurrentTurn || (member.isPlayer && !activeUnit && !isOneOnOne)} 
                                                isPlayer={member.isPlayer}
                                                onCommand={undefined}
                                                selectable={selectionMode === 'ally'} 
                                                onClick={() => handleAllyClick(member.name, member.entity, member.isPlayer)}
                                                statusEffects={member.statusEffects}
                                                visualUrl={member.visualUrl}
                                                unusableLabel={
                                                    selectionMode === 'ally' && isPureResurrectionPending 
                                                    ? (member.stats.hp > 0 ? "생존" : "") 
                                                    : selectionMode === 'ally' && !isResurrectionModeActive && (member.stats.hp <= 0 ? "KO" : "")
                                                }
                                                speechBubble={bubbles[member.id]?.text}
                                                personality={(member.entity as any)?.personality}
                                                mountName={(member.entity as any)?.mountedMonster?.name}
                                                mountVisualUrl={
                                                    (member.entity as any)?.mountedMonster?.monsterData?.visualUrl || 
                                                    (member.entity as any)?.mountedMonster?.appearance
                                                }
                                                onMountClick={() => {
                                                    const m = (member.entity as any)?.mountedMonster;
                                                    if (m) onSelectMount({ mount: m, riderShinryokuType: member.shinryokuType });
                                                }}
                                                floatingTexts={floatingTexts[member.name]}
                                                isHit={isHit}
                                            />
                                        </div>
                                    ) : (
                                        <div className="w-full h-full min-h-[76px] sm:min-h-[84px] md:min-h-[94px] border border-slate-800/25 border-dashed rounded-lg md:rounded-xl flex items-center justify-center bg-slate-900/10">
                                            <span className="text-[6.5px] md:text-[8px] text-slate-700 font-bold opacity-30 uppercase font-mono">{row === 0 ? 'F' : row === 1 ? 'M' : 'B'}{col+1}</span>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </React.Fragment>
                ))}
            </div>
        </div>
    );
});
