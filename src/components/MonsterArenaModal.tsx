import React, { useState, useMemo } from 'react';
import { Character, CapturedMonster, JobType, MonsterStage } from '../types';
import { 
  calculateMonsterArenaDailyLimit, 
  getAssignedArenaBreeder 
} from '../services/monsterArenaService';
import { Swords, Dog, X, Shield, Heart, Zap, Award, CheckCircle2, ChevronRight, UserCheck, Flame, AlertCircle } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  character: Character;
  instanceId?: string;
  onUpdateCharacter: (newChar: Character, logMsg: string) => void;
  onFacilityUpgrade?: (facilityId: string, instanceId?: string) => void;
}

export const MonsterArenaModal: React.FC<Props> = ({
  isOpen,
  onClose,
  character,
  instanceId,
  onUpdateCharacter,
  onFacilityUpgrade
}) => {
  const [selectedMonsterAId, setSelectedMonsterAId] = useState<string | null>(null);
  const [selectedMonsterBId, setSelectedMonsterBId] = useState<string | null>(null);
  const [matchResult, setMatchResult] = useState<{
    winnerName: string;
    loserName: string;
    logText: string;
    gainA: string;
    gainB: string;
  } | null>(null);
  const [warningMessage, setWarningMessage] = useState<string | null>(null);

  // 현재 투기장 시설 인스턴스 확인
  const currentInstance = useMemo(() => {
    if (instanceId) {
      return character.base?.layout?.find(inst => inst.id === instanceId);
    }
    return character.base?.layout?.find(inst => inst.type === 'monster_arena');
  }, [character.base?.layout, instanceId]);

  const facilityLevel = currentInstance?.level || 1;

  // 전체 투기장 시설 개수 및 레벨에 따른 일일 수련 횟수 상한
  const { dailyLimit, facilityCount } = useMemo(() => {
    const instances = character.base?.layout?.filter(inst =>
      inst.type === 'monster_arena' && !inst.underConstruction && (inst.level || 0) > 0
    ) || [];
    const limit = calculateMonsterArenaDailyLimit(character);
    return { dailyLimit: limit, facilityCount: instances.length };
  }, [character]);

  const todayCount = character.base?.dailyCounts?.['monster_arena'] || 0;
  const remainingCount = Math.max(0, dailyLimit - todayCount);

  // 해당 투기장 시설에 "직접 배치된 사육사"만 지도 사육사로 인정
  const instructorBreeder = useMemo(() => {
    return getAssignedArenaBreeder(character, currentInstance?.id);
  }, [character, currentInstance]);

  // 사육사 지도 보너스 계수
  const breederBonus = useMemo(() => {
    if (!instructorBreeder) {
      return {
        name: '미배치',
        level: 0,
        multiplier: 0,
        text: '지도 사육사 미배치: 기지에서 몬스터 수련 투기장에 사육사를 직접 배치해야 수련이 가능합니다.'
      };
    }
    const lv = instructorBreeder.professions?.breeding?.level || (instructorBreeder as any).breederLevel || 1;
    // 시설에 직접 배치된 사육사 숙련도 레벨 및 시설 레벨에 따른 배수 (1.2배 ~ 2.5배)
    const multiplier = Math.min(2.5, 1.1 + (lv * 0.015) + (facilityLevel * 0.05));
    return {
      name: instructorBreeder.name,
      level: lv,
      multiplier,
      text: `전담 사육사 [${instructorBreeder.name}] 직접 상주 (숙련도 Lv.${lv}) ➔ 모의 대전 지도 배수 ${multiplier.toFixed(2)}배`
    };
  }, [instructorBreeder, facilityLevel]);

  // 사육소에서 훈련 가능한 성장한 몬스터 목록 (알 제외)
  const availableMonsters = useMemo(() => {
    return (character.base?.capturedMonsters || []).filter(m => m.stage !== MonsterStage.EGG);
  }, [character.base?.capturedMonsters]);

  const monsterA = useMemo(() => {
    return availableMonsters.find(m => m.id === selectedMonsterAId) || availableMonsters[0] || null;
  }, [availableMonsters, selectedMonsterAId]);

  const monsterB = useMemo(() => {
    if (selectedMonsterBId) {
      return availableMonsters.find(m => m.id === selectedMonsterBId) || null;
    }
    return availableMonsters.find(m => m.id !== monsterA?.id) || null;
  }, [availableMonsters, selectedMonsterBId, monsterA]);

  // 모의 대전 시작
  const handleStartSparring = () => {
    setWarningMessage(null);

    // 1. 해당 시설 사육사 배치 필수 검사
    if (!instructorBreeder) {
      setWarningMessage('해당 몬스터 수련 투기장 시설에 사육사를 먼저 직접 배치해야 지도 및 모의 대전을 진행할 수 있습니다.');
      return;
    }

    // 2. 일일 수련 가능 횟수 검사
    if (remainingCount <= 0) {
      setWarningMessage(`오늘의 투기장 수련 횟수를 모두 소진했습니다. (${todayCount}/${dailyLimit}회, 자정에 초기화됩니다)`);
      return;
    }

    if (!monsterA) return;

    // 포만감 검사 (최소 10% 필요)
    if ((monsterA.hunger || 0) < 10) {
      setWarningMessage(`${monsterA.name}의 기력(포만감)이 부족합니다. (최소 10% 필요, 현재: ${monsterA.hunger || 0}%) 먹이를 먼저 급여하세요.`);
      return;
    }

    const newChar = JSON.parse(JSON.stringify(character)) as Character;
    if (!newChar.base) return;

    const captured = newChar.base.capturedMonsters || [];
    const targetA = captured.find(m => m.id === monsterA.id);
    if (!targetA) return;

    const targetB = monsterB ? captured.find(m => m.id === monsterB.id) : null;
    const mult = breederBonus.multiplier;

    // 모의 대전 승패 산출
    const cpA = ((targetA.stats?.str || 10) * 2) + ((targetA.stats?.def || 10) * 1.5) + (targetA.level || 1) * 20;
    const cpB = targetB ? (((targetB.stats?.str || 10) * 2) + ((targetB.stats?.def || 10) * 1.5) + (targetB.level || 1) * 20) : cpA * 0.9;

    const aWon = cpA >= cpB ? Math.random() < 0.65 : Math.random() < 0.35;
    const winner = aWon ? targetA : (targetB || targetA);
    const loser = aWon ? (targetB || targetA) : targetA;

    // 성장치 계산
    const winnerStatGain = Math.max(1, Math.floor(3 * mult));
    const winnerHpGain = Math.max(10, Math.floor(25 * mult));
    const loserStatGain = Math.max(1, Math.floor(2 * mult));
    const loserHpGain = Math.max(5, Math.floor(15 * mult));

    // 승자 스탯 성장
    winner.stats = winner.stats || { hp: 100, maxHp: 100, mp: 50, maxMp: 50, str: 10, int: 10, wis: 10, def: 10, agi: 10, ctrl: 10 };
    winner.stats.str += winnerStatGain;
    winner.stats.def += Math.max(1, Math.floor(winnerStatGain * 0.7));
    winner.stats.maxHp += winnerHpGain;
    winner.stats.hp = winner.stats.maxHp;
    winner.currentExp = (winner.currentExp || 0) + Math.floor(100 * mult);
    winner.affection = Math.min(100, (winner.affection || 0) + 3);

    const gainWinnerMsg = `근력 +${winnerStatGain}, 방어 +${Math.max(1, Math.floor(winnerStatGain * 0.7))}, 체력 +${winnerHpGain}, 경험치 +${Math.floor(100 * mult)}`;

    let gainLoserMsg = '';
    if (targetB && targetB.id !== winner.id) {
      targetB.stats = targetB.stats || { hp: 100, maxHp: 100, mp: 50, maxMp: 50, str: 10, int: 10, wis: 10, def: 10, agi: 10, ctrl: 10 };
      targetB.stats.str += loserStatGain;
      targetB.stats.maxHp += loserHpGain;
      targetB.stats.hp = targetB.stats.maxHp;
      targetB.currentExp = (targetB.currentExp || 0) + Math.floor(60 * mult);
      targetB.affection = Math.min(100, (targetB.affection || 0) + 2);
      gainLoserMsg = `근력 +${loserStatGain}, 체력 +${loserHpGain}, 경험치 +${Math.floor(60 * mult)}`;
    }

    // 포만감 소모
    targetA.hunger = Math.max(0, (targetA.hunger || 50) - 10);
    if (targetB) targetB.hunger = Math.max(0, (targetB.hunger || 50) - 10);

    // 일일 수련 횟수 카운트 1 증가
    newChar.base.dailyCounts = newChar.base.dailyCounts || {};
    newChar.base.dailyCounts['monster_arena'] = (newChar.base.dailyCounts['monster_arena'] || 0) + 1;

    const log = `[몬스터 투기장] 전담 사육사 [${instructorBreeder.name}]의 지도 아래 ${targetA.name}와(과) ${targetB ? targetB.name : '환영 마수'}의 모의 대전 종료! (승자: ${winner.name}, 오늘 진행: ${todayCount + 1}/${dailyLimit}회)`;
    onUpdateCharacter(newChar, log);

    setMatchResult({
      winnerName: winner.name,
      loserName: loser.name,
      logText: `${winner.name}이(가) 치열한 공방 끝에 기세를 제압하여 판정승을 거두었습니다!`,
      gainA: targetA.id === winner.id ? gainWinnerMsg : gainLoserMsg,
      gainB: targetB ? (targetB.id === winner.id ? gainWinnerMsg : gainLoserMsg) : ''
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-slate-950 w-full max-w-4xl max-h-[92vh] rounded-3xl border border-red-500/30 shadow-2xl flex flex-col overflow-hidden text-slate-100">
        
        {/* 상단 헤더 */}
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-900/80 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 sm:p-3 bg-red-500/10 border border-red-500/30 rounded-2xl text-red-400">
              <Swords className="w-6 h-6 sm:w-7 sm:h-7" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">몬스터 수련 투기장</h2>
                <span className="text-[10px] sm:text-xs px-2 py-0.5 rounded-full bg-red-950/80 text-red-400 border border-red-700/50 font-bold">
                  Lv.{facilityLevel}
                </span>
                <span className={`text-[10px] sm:text-xs px-2.5 py-0.5 rounded-full font-bold border ${remainingCount <= 0 ? 'bg-red-950 text-red-400 border-red-800' : 'bg-slate-800 text-amber-300 border-slate-700'}`}>
                  일일 수련 횟수: {todayCount} / {dailyLimit}회 (남은 횟수: {remainingCount}회)
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5">
                시설 레벨과 개수에 따라 일일 수련 횟수가 증가합니다. (투기장 {facilityCount}동 운영 중 · 사육사만 배치 가능)
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {onFacilityUpgrade && currentInstance && (
              <button
                type="button"
                onClick={() => onFacilityUpgrade('monster_arena', currentInstance.id)}
                className="hidden sm:inline-flex px-3 py-1.5 text-xs font-bold rounded-xl bg-red-600 hover:bg-red-500 text-white transition-colors"
              >
                시설 증축
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-full hover:bg-slate-800 transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* 메인 내용 (모바일 친화 스크롤) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-5">

          {/* 경고 알림 */}
          {warningMessage && (
            <div className="p-3 bg-rose-950/70 border border-rose-500/40 rounded-2xl flex items-center justify-between text-xs sm:text-sm text-rose-300 font-bold">
              <div className="flex items-center gap-2">
                <AlertCircle size={16} className="text-rose-400 shrink-0" />
                <span>{warningMessage}</span>
              </div>
              <button
                type="button"
                onClick={() => setWarningMessage(null)}
                className="text-xs text-rose-400 hover:text-white ml-2 underline"
              >
                확인
              </button>
            </div>
          )}

          {/* 대전 결과 배너 */}
          {matchResult && (
            <div className="p-4 bg-red-950/40 border border-red-500/40 rounded-2xl space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-red-300 font-extrabold text-sm sm:text-base">
                  <Flame className="text-red-400" size={18} />
                  <span>모의 대전 완료: 승자 [{matchResult.winnerName}]</span>
                </div>
                <button
                  type="button"
                  onClick={() => setMatchResult(null)}
                  className="text-xs text-slate-400 hover:text-white"
                >
                  닫기
                </button>
              </div>
              <p className="text-xs text-slate-300">{matchResult.logText}</p>
              <div className="text-[11px] space-y-1 text-slate-400 pt-1">
                {monsterA && <div>• {monsterA.name} 획득: <span className="text-amber-300 font-bold">{matchResult.gainA}</span></div>}
                {monsterB && matchResult.gainB && <div>• {monsterB.name} 획득: <span className="text-amber-300 font-bold">{matchResult.gainB}</span></div>}
              </div>
            </div>
          )}

          {/* 전담 지도 사육사 정보 배너 (해당 시설에 직접 배치된 사육사만 표시) */}
          <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-xl overflow-hidden shrink-0">
                <UserCheck className={instructorBreeder ? "text-red-400" : "text-slate-600"} size={24} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-500/20 text-red-300 border border-red-500/30">
                    전담 지도 사육사 (시설 배치 필수)
                  </span>
                  <span className="text-sm sm:text-base font-extrabold text-white">{breederBonus.name}</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {breederBonus.text}
                </p>
              </div>
            </div>
            {!instructorBreeder && (
              <span className="text-xs text-rose-400 font-bold bg-rose-950/40 px-3 py-1.5 rounded-xl border border-rose-800/40 self-start sm:self-auto">
                이 시설에 사육사를 직접 배치해야 수련이 활성화됩니다
              </span>
            )}
          </div>

          {availableMonsters.length === 0 ? (
            <div className="p-12 text-center text-slate-500 text-xs rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
              <Dog className="w-10 h-10 mx-auto text-slate-600 mb-1" />
              <p className="font-bold text-sm text-slate-400">사육소에 수련할 수 있는 성장한 몬스터가 없습니다.</p>
              <p>몬스터 사육소에서 알을 부화시키거나 야생 몬스터를 포획해 보세요.</p>
            </div>
          ) : (
            <div className="space-y-4">

              {/* 대전 링: 청코너 vs 홍코너 매칭 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* 몬스터 A (청코너) */}
                <div className="p-4 rounded-2xl bg-slate-900/70 border border-blue-500/40 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-blue-400 flex items-center gap-1.5">
                      <Shield size={14} />
                      <span>수련 몬스터 (선택)</span>
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-blue-950 text-blue-300 border border-blue-800">
                      출전자 1
                    </span>
                  </div>

                  {monsterA ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-2xl overflow-hidden shrink-0">
                          {monsterA.visualUrl ? <img src={monsterA.visualUrl} alt="" className="w-full h-full object-cover" /> : '🐾'}
                        </div>
                        <div>
                          <div className="text-sm font-extrabold text-white">{monsterA.name}</div>
                          <div className="text-xs text-slate-400">Lv.{monsterA.level || 1} · 랭크 {monsterA.rank || 'C'} · 포만감 {monsterA.hunger || 0}%</div>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-[11px] bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                        <div>근력: <span className="font-bold text-red-400">{monsterA.stats?.str || 10}</span></div>
                        <div>방어: <span className="font-bold text-blue-400">{monsterA.stats?.def || 10}</span></div>
                        <div>체력: <span className="font-bold text-emerald-400">{monsterA.stats?.maxHp || 100}</span></div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs text-slate-500 py-4 text-center">몬스터를 선택하세요</div>
                  )}

                  {/* 몬스터 A 선택 드롭다운 */}
                  <select
                    value={selectedMonsterAId || monsterA?.id || ''}
                    onChange={(e) => setSelectedMonsterAId(e.target.value)}
                    className="w-full text-xs p-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-200"
                  >
                    {availableMonsters.map(m => (
                      <option key={m.id} value={m.id}>
                        {m.name} (Lv.{m.level || 1}, {m.rank || 'C'}급, 포만감 {m.hunger || 0}%)
                      </option>
                    ))}
                  </select>
                </div>

                {/* 몬스터 B (홍코너 또는 환영 훈련마수) */}
                <div className="p-4 rounded-2xl bg-slate-900/70 border border-red-500/40 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-red-400 flex items-center gap-1.5">
                      <Swords size={14} />
                      <span>대련 상대 (선택 또는 환영)</span>
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-red-950 text-red-300 border border-red-800">
                      출전자 2
                    </span>
                  </div>

                  {monsterB ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-2xl overflow-hidden shrink-0">
                          {monsterB.visualUrl ? <img src={monsterB.visualUrl} alt="" className="w-full h-full object-cover" /> : '🐺'}
                        </div>
                        <div>
                          <div className="text-sm font-extrabold text-white">{monsterB.name}</div>
                          <div className="text-xs text-slate-400">Lv.{monsterB.level || 1} · 랭크 {monsterB.rank || 'C'} · 포만감 {monsterB.hunger || 0}%</div>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-[11px] bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                        <div>근력: <span className="font-bold text-red-400">{monsterB.stats?.str || 10}</span></div>
                        <div>방어: <span className="font-bold text-blue-400">{monsterB.stats?.def || 10}</span></div>
                        <div>체력: <span className="font-bold text-emerald-400">{monsterB.stats?.maxHp || 100}</span></div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-2xl text-slate-500">
                          👻
                        </div>
                        <div>
                          <div className="text-sm font-extrabold text-slate-300">투기장 환영 마수</div>
                          <div className="text-xs text-slate-500">대련 상대가 없을 때 훈련용 환영과 대전합니다.</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 몬스터 B 선택 드롭다운 */}
                  <select
                    value={selectedMonsterBId || (monsterB?.id || '')}
                    onChange={(e) => setSelectedMonsterBId(e.target.value)}
                    className="w-full text-xs p-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-200"
                  >
                    <option value="">-- 투기장 환영 마수 (1인 모의전) --</option>
                    {availableMonsters.filter(m => m.id !== monsterA?.id).map(m => (
                      <option key={m.id} value={m.id}>
                        {m.name} (Lv.{m.level || 1}, {m.rank || 'C'}급, 포만감 {m.hunger || 0}%)
                      </option>
                    ))}
                  </select>
                </div>

              </div>

              {/* 대전 시작 버튼 */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleStartSparring}
                  disabled={!monsterA || !instructorBreeder || remainingCount <= 0}
                  className={`w-full py-4 px-6 rounded-2xl font-black text-sm sm:text-base shadow-xl transition-all flex items-center justify-center gap-2 active:scale-98 ${
                    !instructorBreeder
                      ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                      : remainingCount <= 0
                      ? 'bg-slate-800 text-red-400 border border-red-900 cursor-not-allowed'
                      : 'bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white shadow-red-950/50 cursor-pointer'
                  }`}
                >
                  <Swords size={20} />
                  <span>
                    {!instructorBreeder
                      ? '사육사를 이 시설에 먼저 배치해야 합니다'
                      : remainingCount <= 0
                      ? `오늘 수련 횟수 소진 (${todayCount}/${dailyLimit}회)`
                      : `모의 대전 시작 (${monsterA?.name} vs ${monsterB ? monsterB.name : '환영 마수'} · 남은 횟수: ${remainingCount}회)`}
                  </span>
                </button>
              </div>

            </div>
          )}

        </div>

        {/* 하단 푸터 */}
        <div className="p-4 bg-slate-900 border-t border-slate-800 text-[11px] text-slate-400 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shrink-0">
          <span>※ 투기장 시설 레벨과 시설 개수에 비례하여 일일 수련 횟수가 증가합니다. 이 시설에는 사육사만 배치 가능하며, 직접 배치된 사육사만 지도를 수행합니다. (1회당 포만감 -10% 소모)</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-bold transition-colors text-xs self-end sm:self-auto"
          >
            닫기
          </button>
        </div>

      </div>
    </div>
  );
};

export default MonsterArenaModal;
