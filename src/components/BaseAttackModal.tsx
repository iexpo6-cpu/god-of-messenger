import React from 'react';
import { Character, Enemy, BaseDefenseReportData } from '../types';
import { calculateBaseDefense } from '../utils';
import { promoteNextIncident } from '../services/incidentQueue';
import { applyBaseDefenseFailure } from '../services/baseDefenseService';

interface BaseAttackModalProps {
    character: Character;
    event: { enemies: Enemy[], log: string, enemyPower: number };
    onClose: () => void;
    onUpdateCharacter: (char: Character) => void;
    onBattle: (enemies: Enemy[], type: string) => void;
    addToLog?: (msg: string) => void;
    onShowDamageReport?: (report: BaseDefenseReportData) => void;
}

export const BaseAttackModal: React.FC<BaseAttackModalProps> = ({ character, event, onClose, onUpdateCharacter, onBattle, addToLog, onShowDamageReport }) => {
    const baseDefense = calculateBaseDefense(character.base, character.companions);
    
    const isAtBase = character.currentLocation?.city === character.base?.location?.city;

    const safeLog = (msg: string) => {
        if (typeof addToLog === 'function') {
            addToLog(msg);
        } else {
            console.log(msg);
        }
    };

    const handleDelegate = () => {
        let newChar = { ...character };
        const winChance = Math.min(0.95, Math.max(0.05, baseDefense / (event.enemyPower || 1)));
        
        if (Math.random() < winChance) {
            safeLog(`[기지 방어 성공] 거주민들이 기지의 방어 시설을 활용하여 적들을 성공적으로 격퇴했습니다!`);
            newChar.fame = (newChar.fame || 0) + 50;
            if (newChar.mercenaryData) {
                newChar.mercenaryData = {
                    ...newChar.mercenaryData,
                    reputation: (newChar.mercenaryData.reputation || 0) + 50
                };
            }
            safeLog(`명성이 50 상승했습니다.`);
            newChar.pendingBaseAttackEvent = undefined;
            newChar = promoteNextIncident(newChar);
            onUpdateCharacter(newChar);
            onClose();
        } else {
            // 기지 방어 실패: 정밀 피해 산출 및 통계 리포트 생성
            const { updatedCharacter, report, summaryLog } = applyBaseDefenseFailure(
                newChar,
                event.enemies,
                event.enemyPower,
                'delegated'
            );
            safeLog(summaryLog);

            let finalChar = { ...updatedCharacter };
            finalChar.pendingBaseAttackEvent = undefined;
            finalChar = promoteNextIncident(finalChar);
            onUpdateCharacter(finalChar);
            onClose();

            if (onShowDamageReport) {
                onShowDamageReport(report);
            }
        }
    };

    const handleDirectBattle = () => {
        onBattle(event.enemies, 'base_defense');
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center z-[200] p-3 sm:p-4 animate-in fade-in">
            <div className="bg-slate-900 border-2 border-red-600/80 rounded-2xl p-4 sm:p-6 max-w-md w-full shadow-2xl shadow-red-950/80 max-h-[90vh] overflow-y-auto flex flex-col justify-between">
                <div>
                    <h2 className="text-lg sm:text-2xl font-black text-red-500 mb-3 sm:mb-4 flex items-center gap-2">
                        <span>🚨</span> 기지 습격 발생!
                    </h2>
                    <div className="text-slate-200 mb-4 sm:mb-6 space-y-3 text-xs sm:text-sm">
                        <p className="font-semibold leading-relaxed">{event.log}</p>
                        <div className="bg-slate-950/80 p-3 sm:p-4 rounded-xl border border-slate-800 space-y-2">
                            <div className="flex justify-between items-center text-xs sm:text-sm">
                                <span className="text-slate-400">적 추정 전투력:</span>
                                <span className="text-red-400 font-mono font-bold">{event.enemyPower?.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between items-center text-xs sm:text-sm">
                                <span className="text-slate-400">현재 기지 방어력:</span>
                                <span className="text-cyan-400 font-mono font-bold">{baseDefense?.toLocaleString()}</span>
                            </div>
                            <div className="mt-2 text-[10px] sm:text-xs text-slate-500">
                                * 방어소 레벨과 담당자의 스탯에 따라 방어력이 결정됩니다.
                            </div>
                        </div>
                    </div>
                </div>
                
                <div className="flex flex-col gap-2 pt-2 border-t border-slate-800">
                    <button
                        onClick={handleDelegate}
                        className="w-full py-2.5 sm:py-3 bg-indigo-600 hover:bg-indigo-500 active:scale-98 text-white rounded-xl font-bold transition-all text-xs sm:text-sm shadow-md shadow-indigo-950"
                    >
                        거주민에게 방어 맡기기 (승률: {Math.floor(Math.min(0.95, Math.max(0.05, baseDefense / (event.enemyPower || 1))) * 100)}%)
                    </button>
                    
                    <button
                        onClick={handleDirectBattle}
                        disabled={!isAtBase}
                        className={`w-full py-2.5 sm:py-3 rounded-xl font-bold transition-all text-xs sm:text-sm active:scale-98 ${
                            isAtBase 
                                ? 'bg-red-600 hover:bg-red-500 text-white shadow-md shadow-red-950' 
                                : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                        }`}
                        title={!isAtBase ? "현재 위치가 기지가 아니어서 직접 전투할 수 없습니다." : ""}
                    >
                        직접 전투하기 {isAtBase ? '' : '(기지에 없음)'}
                    </button>
                </div>
            </div>
        </div>
    );
};
