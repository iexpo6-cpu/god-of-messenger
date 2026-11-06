import React, { memo, useCallback } from 'react';
import { Enemy, Skill } from '../../types';
import { EnemyCard } from './EnemyCard';
import { FloatingFeedbackItem } from './FloatingFeedbackOverlay';

interface CombatEnemiesAreaProps {
    enemies?: Enemy[];
    selectionMode: 'enemy' | 'ally' | 'none';
    floatingTexts: Record<string, FloatingFeedbackItem[]>;
    playerType?: string;
    skills?: Skill[];
    combatVfx?: any;
    onTargetSelect: (enemyName: string) => void;
}

/**
 * 적 몬스터 카드 목록을 전담하는 초경량 독립 컴포넌트
 * - 특정 적 1마리의 체력이 깎이거나 피격당했을 때, 다른 적 몬스터 카드의 불필요한 재계산을 100% 차단
 * - 안정적인 고유 키(Unique Key)를 부여하여 몬스터 사망 시 뒤쪽 카드들의 연쇄 리렌더링 방지
 */
export const CombatEnemiesArea = memo(({
    enemies = [],
    selectionMode,
    floatingTexts,
    playerType,
    skills,
    combatVfx,
    onTargetSelect
}: CombatEnemiesAreaProps) => {
    const handleEnemyClick = useCallback((enemyName: string) => {
        if (selectionMode === 'enemy') {
            onTargetSelect(enemyName);
        }
    }, [selectionMode, onTargetSelect]);

    return (
        <div 
            data-combat-area="enemies" 
            className="flex justify-center gap-1 sm:gap-2 md:gap-3 flex-nowrap md:flex-wrap overflow-x-auto md:overflow-y-auto max-h-[30vh] md:max-h-[45vh] py-0.5 relative z-10 content-start custom-scrollbar"
        >
            {enemies.map((enemy, idx) => {
                const cleanName = enemy.name.replace(/\[BOSS\]|\[WANTED\]|\[정예\]|\[침략군\]/g, '').trim();
                const enemyFloating = floatingTexts[cleanName] || floatingTexts[enemy.name];
                const isHit = combatVfx?.targetName === enemy.name || 
                    (combatVfx?.isAoe && combatVfx?.tier !== 'BUFF' && !enemies.some(e => e.name === combatVfx?.attackerName)) || 
                    (combatVfx?.isAoe && combatVfx?.tier === 'BUFF' && enemies.some(e => e.name === combatVfx?.attackerName));

                return (
                    <div 
                        key={`enemy_${enemy.name || idx}`} 
                        data-combat-unit={enemy.name} 
                        data-clean-name={cleanName} 
                        className="w-[84px] sm:w-28 md:w-40 shrink-0 animate-in fade-in slide-in-from-top-4 duration-500" 
                        style={{ animationDelay: `${idx * 100}ms` }}
                    >
                        <EnemyCard 
                            enemy={enemy}
                            selectable={selectionMode === 'enemy' && enemy.hp > 0}
                            onClick={() => handleEnemyClick(enemy.name)}
                            playerType={playerType}
                            floatingTexts={enemyFloating}
                            skills={skills}
                            isHit={isHit}
                        />
                    </div>
                );
            })}
        </div>
    );
});
