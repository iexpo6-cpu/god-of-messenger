import React, { useState } from 'react';
import { Character, Enemy } from '../types';
import { generateProceduralEnemy } from '../utils';
import { ShieldAlert, Sword, Flame, X, Shield, AlertTriangle, Users } from 'lucide-react';
import { ResultData } from './ActionResultModal';
import WarTacticsModal from './WarTacticsModal';

interface WarInvasionModalProps {
  character: Character;
  pendingInvasions: string[];
  onClose: () => void;
  onUpdateCharacter: (newChar: Character, logMsg?: string) => void;
  onSetResultModalData?: (data: ResultData) => void;
  onBattle: (enemies: Enemy[], type: string, source?: string, city?: string, nation?: string) => void;
}

export const WarInvasionModal: React.FC<WarInvasionModalProps> = ({
  character,
  pendingInvasions,
  onClose,
  onUpdateCharacter,
  onSetResultModalData,
  onBattle,
}) => {
  const [selectedNation, setSelectedNation] = useState<string>(pendingInvasions[0] || '');
  const [isWarTacticsOpen, setIsWarTacticsOpen] = useState(false);

  if (!pendingInvasions || pendingInvasions.length === 0) {
    return null;
  }

  const activeNation = selectedNation || pendingInvasions[0];

  // 방어 직접 참전 전투 개시
  const handleDirectBattle = (nation: string) => {
    // 적군 소대 생성 (수도/전선 수준의 적 3~4명)
    const avgLevel = Math.max(10, character.level || 20);
    const enemies: Enemy[] = [
      generateProceduralEnemy(avgLevel + 5, `${nation} 정예 장교`),
      generateProceduralEnemy(avgLevel, `${nation} 침공 부사관`),
      generateProceduralEnemy(avgLevel, `${nation} 침공 보병`),
      generateProceduralEnemy(avgLevel - 2, `${nation} 지원 궁수`),
    ];

    // pendingInvasions 목록에서 해당 국가 제거
    const updatedChar = { ...character };
    if (updatedChar.militaryData?.pendingInvasions) {
      updatedChar.militaryData.pendingInvasions = updatedChar.militaryData.pendingInvasions.filter(
        n => n !== nation
      );
    }
    onUpdateCharacter(updatedChar, `[전쟁 방어전 출전] ${nation} 침공군과의 직접 전투에 돌입합니다.`);

    onBattle(enemies, 'military_defense', `${nation} 침공군`, character.currentLocation?.city || '수도', nation);
    onClose();
  };

  // 군대 위임 및 후퇴 (점유율 하락)
  const handleDelegateOrRetreat = (nation: string) => {
    const updatedChar = { ...character };
    let prevOcc = 0;
    let newOcc = 0;

    if (updatedChar.militaryData?.diplomacy?.[nation]) {
      const rel = { ...updatedChar.militaryData.diplomacy[nation] };
      prevOcc = rel.occupation || 0;
      newOcc = Math.max(-100, prevOcc - 10);
      rel.occupation = newOcc;
      updatedChar.militaryData.diplomacy[nation] = rel;
    }

    if (updatedChar.militaryData?.pendingInvasions) {
      updatedChar.militaryData.pendingInvasions = updatedChar.militaryData.pendingInvasions.filter(
        n => n !== nation
      );
    }

    onUpdateCharacter(
      updatedChar,
      `[전쟁 방치] ${nation}의 침공 방어를 포기하여 전선 점유율이 10% 하락했습니다.`
    );

    if (onSetResultModalData) {
      onSetResultModalData({
        type: 'destroy',
        title: '⚠️ [방어 포기] 전선 점유율 하락',
        message: `${nation} 침공 부대의 공격을 방치하고 후퇴했습니다. 전선 지배력이 감퇴했습니다.`,
        items: [
          { label: '전선 점유율', before: `${prevOcc}%`, after: `${newOcc}% (-10%)` },
          { label: '침공 세력', after: nation }
        ]
      });
    }

    const nextList = pendingInvasions.filter(n => n !== nation);
    if (nextList.length > 0) {
      setSelectedNation(nextList[0]);
    } else {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
      {isWarTacticsOpen && (
        <WarTacticsModal
          isOpen={isWarTacticsOpen}
          mode="defense"
          targetNation={activeNation}
          character={character}
          onClose={() => setIsWarTacticsOpen(false)}
          onUpdateCharacter={(newChar, msg) => {
            onUpdateCharacter(newChar, msg);
          }}
          onVictory={(occGain, _isVassal, prevOcc, newOcc, rankName) => {
            if (onSetResultModalData) {
              onSetResultModalData({
                type: 'success',
                title: '🛡️ 전술 방어전 대승리!',
                message: `${activeNation} 침공 부대와 적장을 완벽히 격퇴하고 전선 점유율을 확보했습니다!`,
                items: [
                  { label: '적용 계급 규정', after: rankName },
                  { label: '전선 점유율 상승', after: `+${occGain}% 상승!` },
                  { label: '현재 전선 점유율', before: `${prevOcc}%`, after: `${newOcc}%` }
                ]
              });
            }
          }}
        />
      )}
      <div className="relative w-full max-w-md bg-slate-900 border-2 border-red-600/80 rounded-2xl shadow-2xl shadow-red-950/80 overflow-hidden flex flex-col max-h-[90vh]">
        {/* 상단 붉은 헤더 */}
        <div className="p-4 bg-gradient-to-r from-red-950 via-slate-900 to-red-950 border-b border-red-800/50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-red-600/20 border border-red-500/40 text-red-400 animate-pulse">
              <ShieldAlert size={22} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-red-100 flex items-center gap-1.5 tracking-tight">
                ⚔️ [국가 전쟁] 침공 발발!
              </h2>
              <p className="text-[11px] text-red-300/80">
                적국 군대가 전방 방어선을 뚫고 침공 중입니다!
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* 본문 콘텐츠 */}
        <div className="p-4 overflow-y-auto space-y-4 flex-1">
          {/* 침공 국가 선택 탭 (여러 국가 침공 시) */}
          {pendingInvasions.length > 1 && (
            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {pendingInvasions.map(nat => (
                <button
                  key={nat}
                  onClick={() => setSelectedNation(nat)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1 ${
                    activeNation === nat
                      ? 'bg-red-600 text-white shadow-md shadow-red-950'
                      : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                  }`}
                >
                  <Flame size={12} className="text-amber-400" />
                  <span>{nat}</span>
                </button>
              ))}
            </div>
          )}

          {/* 침공 정보 카드 */}
          <div className="p-4 rounded-xl bg-slate-950/80 border border-red-900/50 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-xs text-slate-400 font-medium">침공 대상 세력</span>
              <span className="text-sm font-black text-red-400 flex items-center gap-1">
                <Flame size={14} className="text-red-500 animate-bounce" />
                {activeNation} 군대
              </span>
            </div>

            <div className="p-3 rounded-lg bg-red-950/30 border border-red-800/30 text-xs text-red-200/90 leading-relaxed space-y-1.5">
              <p className="flex items-start gap-1.5">
                <AlertTriangle size={15} className="text-amber-400 shrink-0 mt-0.5" />
                <span>
                  <strong>[{activeNation}]</strong>의 정예 공습 부대가 국경 경계망을 철거하고 침략을 감행했습니다.
                </span>
              </p>
              <p className="text-[11px] text-slate-400">
                대응하지 않고 방치할 경우, 전선 점유율이 <strong>10%</strong> 하락하며 영토 주권이 위태로워집니다.
              </p>
            </div>
          </div>

          {/* 대응 옵션 선택 안내 */}
          <div className="space-y-2 pt-1">
            <p className="text-xs font-bold text-slate-300">⚔️ 방어전 작전 명령 선택</p>

            {/* 전술판 총력 방어전 버튼 (신규) */}
            <button
              onClick={() => setIsWarTacticsOpen(true)}
              className="w-full min-h-[48px] py-3 px-4 rounded-xl bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white font-black text-sm shadow-lg shadow-red-950/80 transition-all flex items-center justify-center gap-2 active:scale-95 border border-red-400/40 animate-pulse"
            >
              <Users size={18} />
              <span>전술판 총력 방어전 (다수 동료 소집 & 결합 전술)</span>
            </button>

            {/* 직접 참전 버튼 (일반 턴제) */}
            <button
              onClick={() => handleDirectBattle(activeNation)}
              className="w-full min-h-[40px] py-2 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 font-bold text-xs transition-all flex items-center justify-center gap-2"
            >
              <Sword size={15} />
              <span>일반 턴제 출전</span>
            </button>

            {/* 방어 포기 / 후퇴 버튼 */}
            <button
              onClick={() => handleDelegateOrRetreat(activeNation)}
              className="w-full min-h-[44px] py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 font-medium text-xs transition-colors flex items-center justify-center gap-1.5"
            >
              <Shield size={15} className="text-slate-400" />
              <span>방어 포기 (점유율 10% 하락 후퇴)</span>
            </button>
          </div>
        </div>

        {/* 하단 닫기 */}
        <div className="p-3 bg-slate-950 border-t border-slate-800 text-right shrink-0">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 text-xs font-medium transition-colors"
          >
            나중에 대응 (창 닫기)
          </button>
        </div>
      </div>
    </div>
  );
};
