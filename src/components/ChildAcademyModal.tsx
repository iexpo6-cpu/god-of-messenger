import React, { useState, useMemo } from 'react';
import { Character, Companion } from '../types';
import { 
  isEligibleChildStudent, 
  calculateChildAcademyCapacity, 
  ChildAcademyTrainee,
  getChildAcademyTraineeLiveProgress,
  advanceChildAcademyTime
} from '../services/childAcademyService';
import { getAbsoluteMinutes } from '../services/trainingService';
import { getYear } from '../utils';
import { 
  GraduationCap, X, Award, Sparkles, User, Shield, Zap, Heart, 
  CheckCircle2, AlertCircle, ChevronRight, UserCheck, Plus, Trash2, 
  TrendingUp, Clock, BookOpen 
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  character: Character;
  instanceId?: string;
  onUpdateCharacter: (newChar: Character, logMsg: string) => void;
  onFacilityUpgrade?: (facilityId: string, instanceId?: string) => void;
}

const STAT_NAME_KR: Record<ChildAcademyTrainee['targetStat'], string> = {
  str: 'STR',
  int: 'INT',
  def: 'DEF',
  agi: 'AGI',
  wis: 'WIS',
  ctrl: 'CTRL',
  maxHp: 'HP',
  maxMp: 'MP'
};

const STAT_OPTIONS: { key: ChildAcademyTrainee['targetStat']; label: string; icon: any; color: string; desc: string }[] = [
  { key: 'str', label: 'STR', icon: Shield, color: 'text-red-400', desc: '근력과 최대 체력이 집중 상승합니다.' },
  { key: 'int', label: 'INT', icon: Zap, color: 'text-blue-400', desc: '지능과 최대 마나가 집중 상승합니다.' },
  { key: 'def', label: 'DEF', icon: Shield, color: 'text-amber-400', desc: '방어력과 신체 내구도가 집중 상승합니다.' },
  { key: 'agi', label: 'AGI', icon: Sparkles, color: 'text-emerald-400', desc: '민첩성과 순발력이 집중 상승합니다.' },
  { key: 'wis', label: 'WIS', icon: Award, color: 'text-purple-400', desc: '지혜와 최대 마나가 집중 상승합니다.' },
  { key: 'ctrl', label: 'CTRL', icon: Award, color: 'text-pink-400', desc: '통제력과 학업 성취도가 집중 상승합니다.' },
  { key: 'maxHp', label: 'HP', icon: Heart, color: 'text-rose-400', desc: '최대 체력이 대폭 상승합니다.' },
  { key: 'maxMp', label: 'MP', icon: Zap, color: 'text-cyan-400', desc: '최대 마나가 대폭 상승합니다.' },
];

export const ChildAcademyModal: React.FC<Props> = ({
  isOpen,
  onClose,
  character,
  instanceId,
  onUpdateCharacter,
  onFacilityUpgrade
}) => {
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
  const [selectedStat, setSelectedStat] = useState<ChildAcademyTrainee['targetStat']>('str');
  const [resultMessage, setResultMessage] = useState<string | null>(null);

  // 현재 유년 서당 인스턴스 확인
  const currentInstance = useMemo(() => {
    if (instanceId) {
      return character.base?.layout?.find(inst => inst.id === instanceId);
    }
    return character.base?.layout?.find(inst => inst.type === 'child_academy');
  }, [character.base?.layout, instanceId]);

  const facilityLevel = currentInstance?.level || 1;

  // 전체 유년 서당 개수 및 레벨에 따른 정원 계산
  const { totalCapacity, facilityCount } = useMemo(() => {
    const instances = character.base?.layout?.filter(inst =>
      inst.type === 'child_academy' && !inst.underConstruction && (inst.level || 0) > 0
    ) || [];
    const count = instances.length;
    const capacity = calculateChildAcademyCapacity(character.base);
    return { totalCapacity: capacity, facilityCount: count };
  }, [character.base]);

  // 교육 담당자(스승/훈장) 확인 - 시설에 배치된 동료
  const teacherCompanion = useMemo(() => {
    if (!currentInstance) return null;
    const assignedIds = [
      ...(character.base?.multiAssignments?.[currentInstance.id] || []),
      ...(character.base?.assignments?.[currentInstance.id] ? [character.base.assignments[currentInstance.id]] : [])
    ].filter(Boolean) as string[];

    if (assignedIds.length === 0) return null;
    const teacherId = assignedIds[0];
    if (teacherId === 'player') return character;

    const allComps = [...(character.companions || []), ...(character.inactiveCompanions || [])];
    return allComps.find(c => c.id === teacherId) || null;
  }, [character, currentInstance]);

  // 대기 동료 중 20세 미만 & 전투 훈련 미진행 & 미파견 동료만 수강 대상으로 엄격 필터링
  const eligibleChildren = useMemo(() => {
    const inactiveComps = character.inactiveCompanions || [];
    return inactiveComps.filter(c => isEligibleChildStudent(c, character));
  }, [character]);

  // 현재 등록된 자동 훈련 학생 명단
  const trainees: ChildAcademyTrainee[] = useMemo(() => {
    return (character.base as any)?.childAcademyTrainees || [];
  }, [character.base]);

  // 스승 스탯 및 보너스 정보
  const teacherStats = useMemo(() => {
    if (!teacherCompanion) {
      return {
        name: '미배치',
        job: '없음',
        cp: 0,
        bonusRate: 1.0,
        specialtyText: '스승 미배치: 기지에서 담당 훈장을 배치하면 자동 훈련이 활성화됩니다.'
      };
    }

    const stats = teacherCompanion.stats || { str: 10, int: 10, def: 10, agi: 10, wis: 10, ctrl: 10 };
    const statSum = (stats.str || 0) + (stats.int || 0) + (stats.def || 0) + (stats.agi || 0) + (stats.wis || 0) + (stats.ctrl || 0);
    const cp = (teacherCompanion as any).combatPower || Math.floor(statSum * 2.5 + (teacherCompanion.level || 1) * 30);
    const bonusRate = Math.min(5.0, 1.0 + Math.floor(cp / 1000) * 0.35 + (facilityLevel * 0.35));

    const job = teacherCompanion.job || teacherCompanion.classType || '전사';
    let specialtyText = '균형 잡힌 전수';
    if (/마법|사제|성직|학자|연금/i.test(job)) {
      specialtyText = '지혜와 마도 학문 특화 (지능, 마나 성장 가산)';
    } else if (/기사|전사|검사|투사|무투/i.test(job)) {
      specialtyText = '강인한 무예와 신체 특화 (근력, 체력, 방어 성장 가산)';
    } else if (/도적|궁수|암살|사냥/i.test(job)) {
      specialtyText = '민첩한 기예와 순발력 특화 (민첩 성장 가산)';
    } else if (/군주|지휘|상인|사육/i.test(job)) {
      specialtyText = '리더십과 통솔력 특화 (통제 성장 가산)';
    }

    return {
      name: teacherCompanion.name,
      job,
      cp,
      bonusRate,
      specialtyText
    };
  }, [teacherCompanion, facilityLevel]);

  // 모달 오픈 또는 게임 시간 변경 시 유년 서당 주간 훈련 시간 자동 동기화
  React.useEffect(() => {
    if (isOpen && character.base?.layout) {
      const curDate = character.currentDate || '2000-03-02';
      const curTime = character.currentTime || '08:00';
      const curAbsMin = getAbsoluteMinutes(curDate, curTime);
      const res = advanceChildAcademyTime(character, 0, curAbsMin);
      const currentListStr = JSON.stringify((character.base as any)?.childAcademyTrainees || []);
      const updatedListStr = JSON.stringify((res.updatedCharacter.base as any)?.childAcademyTrainees || []);
      if (currentListStr !== updatedListStr) {
        onUpdateCharacter(res.updatedCharacter, res.logs[0] || '[유년 서당] 훈련 진행도가 최신 시각으로 동기화되었습니다.');
      }
    }
  }, [isOpen, character.currentDate, character.currentTime]);

  // 학생 등록/목표 스탯 지정 (전투훈련소 로직과 동일하게 훈련 시작 시간 및 절대 시각 연동)
  const handleRegisterOrUpdateTrainee = (childId: string, targetStat: ChildAcademyTrainee['targetStat']) => {
    if (!childId) return;

    const existingIndex = trainees.findIndex(t => t.companionId === childId);
    if (existingIndex === -1 && trainees.length >= totalCapacity) {
      setResultMessage(`정원이 초과되었습니다. (현재 수강 정원: ${totalCapacity}명) 서당을 증축하거나 새 서당을 건설하세요.`);
      return;
    }

    const newChar = JSON.parse(JSON.stringify(character)) as Character;
    if (!newChar.base) return;

    const currentTrainees: ChildAcademyTrainee[] = (newChar.base as any).childAcademyTrainees || [];
    const curDate = newChar.currentDate || '2000-03-02';
    const curTime = newChar.currentTime || '08:00';
    const curAbsMin = getAbsoluteMinutes(curDate, curTime);

    const childComp = eligibleChildren.find(c => c.id === childId);
    const childName = childComp ? childComp.name : '학동';
    const statName = STAT_NAME_KR[targetStat] || targetStat;

    if (existingIndex >= 0) {
      currentTrainees[existingIndex].targetStat = targetStat;
      if (!currentTrainees[existingIndex].startDate) {
        currentTrainees[existingIndex].startDate = curDate;
      }
      if (!currentTrainees[existingIndex].startTime) {
        currentTrainees[existingIndex].startTime = curTime;
      }
      if (!currentTrainees[existingIndex].lastTrainedAbsMinutes) {
        currentTrainees[existingIndex].lastTrainedAbsMinutes = curAbsMin;
      }
      (newChar.base as any).childAcademyTrainees = currentTrainees;
      onUpdateCharacter(newChar, `[유년 서당] '${childName}'의 목표 능력치를 [${statName}]으로 변경했습니다.`);
      setResultMessage(`'${childName}'의 목표 육성 능력치가 변경되었습니다.`);
    } else {
      currentTrainees.push({
        companionId: childId,
        targetStat,
        startDate: curDate,
        startTime: curTime,
        lastTrainedAbsMinutes: curAbsMin,
        accumulatedMinutes: 0,
        accumulatedDays: 0,
        totalHoursTrained: 0
      });
      (newChar.base as any).childAcademyTrainees = currentTrainees;
      onUpdateCharacter(newChar, `[유년 서당] '${childName}'을(를) 서당에 입학 등록했습니다. (시작: ${curDate} ${curTime}, 목표: ${statName})`);
      setResultMessage(`'${childName}'이(가) 유년 서당에 등록되었습니다. 훈련 시작 시간부터 주간 활동 시간 동안 8시간을 채우면 능력치가 성장하고 서신함에 보고서가 도착합니다.`);
    }
  };

  // 학생 등록 해제
  const handleRemoveTrainee = (childId: string) => {
    const newChar = JSON.parse(JSON.stringify(character)) as Character;
    if (!newChar.base) return;

    const currentTrainees: ChildAcademyTrainee[] = (newChar.base as any).childAcademyTrainees || [];
    const childComp = eligibleChildren.find(c => c.id === childId);
    const childName = childComp ? childComp.name : '학동';

    (newChar.base as any).childAcademyTrainees = currentTrainees.filter(t => t.companionId !== childId);
    onUpdateCharacter(newChar, `[유년 서당] '${childName}'의 수강 등록을 해제했습니다.`);
    setResultMessage(`'${childName}'의 수강 등록이 해제되었습니다.`);
  };

  // 즉시 1회 특별 지도 수업
  const handleInstantLesson = (childId: string) => {
    if (!teacherCompanion) return;
    const newChar = JSON.parse(JSON.stringify(character)) as Character;
    const targetComp = (newChar.companions || []).find(c => c.id === childId) ||
      (newChar.inactiveCompanions || []).find(c => c.id === childId);
    if (!targetComp) return;

    const mult = teacherStats.bonusRate;
    const gain = Math.max(1, Math.floor(2 * mult));
    const hpGain = Math.max(5, Math.floor(15 * mult));

    targetComp.stats = targetComp.stats || { hp: 100, maxHp: 100, mp: 50, maxMp: 50, str: 10, int: 10, wis: 10, def: 10, agi: 10, ctrl: 10 };

    if (selectedStat === 'str') {
      targetComp.stats.str += gain;
      targetComp.stats.maxHp += hpGain;
      targetComp.stats.hp = targetComp.stats.maxHp;
    } else if (selectedStat === 'int') {
      targetComp.stats.int += gain;
      targetComp.stats.maxMp += hpGain;
      targetComp.stats.mp = targetComp.stats.maxMp;
    } else if (selectedStat === 'def') {
      targetComp.stats.def += gain;
      targetComp.stats.maxHp += Math.floor(hpGain * 0.7);
      targetComp.stats.hp = targetComp.stats.maxHp;
    } else if (selectedStat === 'agi') {
      targetComp.stats.agi += gain;
    } else if (selectedStat === 'wis') {
      targetComp.stats.wis = (targetComp.stats.wis || 10) + gain;
      targetComp.stats.maxMp += Math.floor(hpGain * 0.7);
      targetComp.stats.mp = targetComp.stats.maxMp;
    } else if (selectedStat === 'ctrl') {
      targetComp.stats.ctrl += gain;
      if (targetComp.childData) targetComp.childData.academicScore = (targetComp.childData.academicScore || 0) + 10;
    } else if (selectedStat === 'maxHp') {
      targetComp.stats.maxHp += hpGain * 2;
      targetComp.stats.hp = targetComp.stats.maxHp;
    } else if (selectedStat === 'maxMp') {
      targetComp.stats.maxMp += hpGain * 2;
      targetComp.stats.mp = targetComp.stats.maxMp;
    }

    targetComp.currentExp = (targetComp.currentExp || 0) + Math.floor(50 * mult);
    targetComp.affection = Math.min(100, (targetComp.affection || 0) + 3);

    onUpdateCharacter(newChar, `[유년 서당] 스승 [${teacherStats.name}]이 '${targetComp.name}'에게 특별 개인지도를 진행했습니다.`);
    setResultMessage(`'${targetComp.name}'에게 특별 개인지도를 실시했습니다. (스승 지도 배수 ${mult.toFixed(2)}배 적용)`);
  };

  const curYear = getYear(character.currentDate || '2000-01-01');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-slate-950 w-full max-w-4xl max-h-[92vh] rounded-3xl border border-amber-500/30 shadow-2xl flex flex-col overflow-hidden text-slate-100">
        
        {/* 상단 헤더 */}
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-900/80 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 sm:p-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-amber-400">
              <GraduationCap className="w-6 h-6 sm:w-7 sm:h-7" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">유년 서당</h2>
                <span className="text-[10px] sm:text-xs px-2 py-0.5 rounded-full bg-amber-950/80 text-amber-400 border border-amber-700/50 font-bold">
                  {facilityLevel}등급
                </span>
                <span className="text-[10px] sm:text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 font-bold">
                  수강 정원: {trainees.length} / {totalCapacity}명 (서당 {facilityCount}동)
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5">
                대기 동료 중 20세 미만의 학동을 등록하면 스승에 의해 목표 능력치가 매일 자동으로 육성됩니다. (전투 훈련 중이거나 파견 중인 동료 제외)
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {onFacilityUpgrade && currentInstance && (
              <button
                type="button"
                onClick={() => onFacilityUpgrade('child_academy', currentInstance.id)}
                className="hidden sm:inline-flex px-3 py-1.5 text-xs font-bold rounded-xl bg-amber-600 hover:bg-amber-500 text-white transition-colors"
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

        {/* 메인 내용 (모바일 최적화 스크롤) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-5">

          {/* 알림 배너 */}
          {resultMessage && (
            <div className="p-3 bg-emerald-950/70 border border-emerald-500/40 rounded-2xl flex items-center justify-between text-xs sm:text-sm text-emerald-300 font-bold">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                <span>{resultMessage}</span>
              </div>
              <button
                type="button"
                onClick={() => setResultMessage(null)}
                className="text-xs text-emerald-400 hover:text-white ml-2 underline"
              >
                확인
              </button>
            </div>
          )}

          {/* 스승 미배치 시 최상단 경고 배너 */}
          {teacherStats.name === '미배치' && (
            <div className="p-3.5 bg-rose-950/80 border-2 border-rose-500/70 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-rose-200 shadow-lg">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-rose-900/60 border border-rose-500/40 rounded-xl text-rose-300 shrink-0">
                  <AlertCircle size={22} className="animate-pulse" />
                </div>
                <div>
                  <div className="font-black text-sm sm:text-base text-white flex items-center gap-2">
                    <span>스승 미배치 경고 (수련 시간 누적 정지)</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-rose-900 text-rose-300 border border-rose-700 font-bold">
                      훈련 대기
                    </span>
                  </div>
                  <p className="text-[11px] sm:text-xs text-rose-300/90 mt-1 leading-relaxed">
                    서당에 스승(훈장)이 배치되지 않아 학동들의 훈련 시간이 누적되지 않고 멈춰 있습니다. 기지 본부에서 서당 시설의 <strong>[담당자 배치]</strong>를 눌러 스승을 배치해야 8시간 자동 수련이 시작됩니다. (스승 역량과 시설 등급에 따라 <strong>최대 5배 훈육 보너스</strong> 적용)
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* 담당 훈장 정보 바 */}
          <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
            teacherStats.name === '미배치' 
              ? 'bg-rose-950/30 border-rose-700/50' 
              : 'bg-slate-900/90 border-slate-800'
          }`}>
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-xl border flex items-center justify-center text-xl overflow-hidden shrink-0 ${
                teacherStats.name === '미배치'
                  ? 'bg-rose-950 border-rose-700/60 text-rose-400'
                  : 'bg-slate-800 border-slate-700 text-amber-400'
              }`}>
                {teacherCompanion && (teacherCompanion as any).visualUrl ? (
                  <img src={(teacherCompanion as any).visualUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <UserCheck className={teacherStats.name === '미배치' ? 'text-rose-400' : 'text-amber-400'} size={24} />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                    teacherStats.name === '미배치'
                      ? 'bg-rose-900/60 text-rose-300 border-rose-700/60'
                      : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                  }`}>
                    담당 훈장 스승
                  </span>
                  <span className="text-sm sm:text-base font-extrabold text-white">{teacherStats.name}</span>
                  {teacherStats.name !== '미배치' && (
                    <span className="text-xs text-slate-400 font-medium">({teacherStats.job})</span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {teacherStats.name === '미배치' ? (
                    <span className="text-rose-400 font-bold">
                      스승 미배치: 기지에서 담당 훈장을 배치해야 수련 시간이 정상 누적됩니다. (배치 시 최대 5배 훈육 보너스)
                    </span>
                  ) : (
                    <>전투력 {teacherStats.cp.toLocaleString()} ➔ 자동 지도 효율 <span className="text-amber-300 font-bold">{teacherStats.bonusRate.toFixed(2)}배 (최대 5배)</span> ({teacherStats.specialtyText})</>
                  )}
                </p>
              </div>
            </div>
            {teacherStats.name === '미배치' && (
              <span className="text-xs text-rose-300 font-bold bg-rose-950/80 px-3 py-1.5 rounded-xl border border-rose-600/60 shrink-0">
                기지에서 스승을 배치해야 훈련이 시작됩니다
              </span>
            )}
          </div>

          {/* 중앙 영역: 수강 대상(대기 동료 중 20세 미만) 목록 & 자동 훈련 등록 현황 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

            {/* 좌측: 수강 대상자 목록 */}
            <div className="md:col-span-1 p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <User size={14} className="text-amber-400" />
                  <span>수강 대상 학동 ({eligibleChildren.length}명)</span>
                </h4>
              </div>

              {eligibleChildren.length === 0 ? (
                <div className="p-6 text-center text-slate-500 text-xs rounded-xl bg-slate-950 border border-slate-900 space-y-2">
                  <BookOpen className="w-8 h-8 mx-auto text-slate-600" />
                  <p className="font-bold text-slate-400">수강 대상 학동이 없습니다.</p>
                  <p className="text-[10px] leading-relaxed">
                    대기 동료 중 20세 미만이며, 전투 훈련소에서 훈련 중이지 않고 파견되지 않은 학동만 수강할 수 있습니다.
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-60 sm:max-h-80 overflow-y-auto pr-1">
                  {eligibleChildren.map((child) => {
                    const isSelected = selectedChildId === child.id;
                    const traineeData = trainees.find(t => t.companionId === child.id);
                    const ageNum = typeof child.birthYear === 'number' 
                      ? curYear - child.birthYear 
                      : (typeof child.age === 'number' ? child.age : parseInt(String(child.age || '0'), 10));
                    const assignedStatName = traineeData ? (STAT_NAME_KR[traineeData.targetStat] || traineeData.targetStat) : '';

                    return (
                      <button
                        key={child.id}
                        type="button"
                        onClick={() => {
                          setSelectedChildId(child.id);
                          if (traineeData) setSelectedStat(traineeData.targetStat);
                        }}
                        className={`w-full p-2.5 rounded-xl text-left transition-all border flex items-center justify-between ${
                          isSelected
                            ? 'bg-amber-950/40 border-amber-500/60 text-white shadow-md'
                            : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-slate-400 shrink-0">
                            {child.name.slice(0, 1)}
                          </div>
                          <div className="truncate">
                            <div className="text-xs font-bold text-white truncate flex items-center gap-1.5">
                              <span>{child.name}</span>
                              {traineeData && (
                                <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold">
                                  수강 중
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              {(() => {
                                if (!traineeData) return `${ageNum}세 · 미등록`;
                                const hasTeacher = Boolean(teacherCompanion);
                                const live = getChildAcademyTraineeLiveProgress(traineeData, character.currentDate, character.currentTime, hasTeacher);
                                if (!hasTeacher) {
                                  return `${ageNum}세 · [${assignedStatName}] 스승 미배치 (수련 정지)`;
                                }
                                return `${ageNum}세 · [${assignedStatName}] ${live.currentHours}시간 ${live.currentMinutesRem}분/8시간`;
                              })()}
                            </div>
                          </div>
                        </div>
                        {isSelected && <ChevronRight size={16} className="text-amber-400 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 우측: 선택된 아이 상세 & 자동 훈련 설정 */}
            <div className="md:col-span-2 p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
              {(() => {
                const currentChild = eligibleChildren.find(c => c.id === selectedChildId) || eligibleChildren[0];
                if (!currentChild) {
                  return (
                    <div className="p-12 text-center text-slate-500 text-xs">
                      <GraduationCap className="w-10 h-10 mx-auto text-slate-600 mb-2" />
                      수강 가능한 대기 학동을 선택하세요.
                    </div>
                  );
                }

                const currentTrainee = trainees.find(t => t.companionId === currentChild.id);
                const ageNum = typeof currentChild.birthYear === 'number' 
                  ? curYear - currentChild.birthYear 
                  : (typeof currentChild.age === 'number' ? currentChild.age : parseInt(String(currentChild.age || '0'), 10));
                const currentStatName = currentTrainee ? (STAT_NAME_KR[currentTrainee.targetStat] || currentTrainee.targetStat) : '';
                const targetStatName = STAT_NAME_KR[selectedStat] || selectedStat;

                return (
                  <div className="space-y-4">
                    {/* 상단 프로필 */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-extrabold text-white">{currentChild.name}</h3>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-950/80 text-amber-400 border border-amber-700/50 font-bold">
                            {ageNum}세 (대기 학동)
                          </span>
                          {currentTrainee ? (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800 font-bold">
                              8시간 자동 수련 중
                            </span>
                          ) : (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                              미등록
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {currentChild.childData?.parentNames ? `부모: ${currentChild.childData.parentNames.join(', ')}` : '가문 학동'} · 호감도 {currentChild.affection || 0}%
                        </p>
                      </div>

                      {/* 등록 해제 버튼 */}
                      {currentTrainee && (
                        <button
                          type="button"
                          onClick={() => handleRemoveTrainee(currentChild.id)}
                          className="px-2.5 py-1 text-xs text-rose-400 hover:text-white rounded-lg bg-rose-950/40 border border-rose-800/40 hover:bg-rose-900/50 transition-colors flex items-center gap-1 self-start sm:self-auto cursor-pointer"
                        >
                          <Trash2 size={12} />
                          <span>수강 해제</span>
                        </button>
                      )}
                    </div>

                    {/* 8시간 자동 훈련 진행 현황 (전투 훈련소 방식) */}
                    {currentTrainee && (() => {
                      const hasTeacher = Boolean(teacherCompanion);
                      const live = getChildAcademyTraineeLiveProgress(currentTrainee, character.currentDate, character.currentTime, hasTeacher);
                      const totalTrainedHours = currentTrainee.totalHoursTrained || (currentTrainee.accumulatedDays ? currentTrainee.accumulatedDays * 8 : 0);

                      return (
                        <div className={`p-3.5 rounded-2xl space-y-2 border ${
                          hasTeacher 
                            ? 'bg-slate-950/80 border-amber-500/30' 
                            : 'bg-rose-950/20 border-rose-600/40'
                        }`}>
                          {!hasTeacher && (
                            <div className="p-2.5 rounded-xl bg-rose-950/80 border border-rose-500/50 text-rose-200 text-xs font-semibold flex items-center gap-2">
                              <AlertCircle size={16} className="text-rose-400 shrink-0" />
                              <span>스승이 미배치되어 수련 시간이 정지되었습니다. 기지에서 담당 훈장을 배치하면 최대 5배 훈육 보너스로 수련이 즉시 재개됩니다.</span>
                            </div>
                          )}

                          <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-1">
                            <span className="font-bold text-slate-200 flex items-center gap-1.5 flex-wrap">
                              <Clock size={14} className={hasTeacher ? 'text-amber-400' : 'text-rose-400'} />
                              <span>8시간 수련 정산 진행도</span>
                              <span className="text-[10px] font-normal text-slate-400">
                                (시작: {live.startDate} {live.startTime})
                              </span>
                            </span>
                            <span className={`font-black font-mono ${hasTeacher ? 'text-amber-400' : 'text-rose-400'}`}>
                              {hasTeacher 
                                ? `${live.currentHours}시간 ${live.currentMinutesRem}분 / 8시간 (${live.progressPercent}%)`
                                : '수련 시간 누적 정지 (스승 미배치)'
                              }
                            </span>
                          </div>

                          {/* 게이지 바 */}
                          <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden p-0.5 border border-slate-700/80">
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${
                                hasTeacher ? 'bg-gradient-to-r from-amber-500 to-amber-400' : 'bg-slate-600'
                              }`}
                              style={{ width: `${live.progressPercent}%` }}
                            />
                          </div>

                          <div className="flex flex-col sm:flex-row sm:items-center justify-between text-[11px] text-slate-400 gap-1">
                            <span>
                              {hasTeacher ? (
                                <>다음 정산까지: <strong className="text-emerald-400">{live.remainingHours}시간 {live.remainingMinutesRem > 0 ? `${live.remainingMinutesRem}분 ` : ''}</strong>남음 (취침 시간 22:00~06:00 제외)</>
                              ) : (
                                <strong className="text-rose-400">스승 배치 시 8시간 수련 진행 및 정산 시작</strong>
                              )}
                            </span>
                            <span className="text-slate-400">
                              누적 수련: <strong className="text-white">{totalTrainedHours}시간</strong>
                            </span>
                          </div>

                          {currentTrainee.lastGainDetail && (
                            <div className="text-[11px] bg-amber-950/30 border border-amber-800/30 p-2 rounded-xl text-amber-300 flex flex-wrap items-center justify-between gap-1">
                              <span>최근 훈련 성과:</span>
                              <strong className="text-white">{currentTrainee.lastGainDetail} (서신함 보고 완료)</strong>
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {/* 현재 능력치 현황 (STR, INT, DEF, AGI, WIS, CTRL, HP, MP) */}
                    <div className="grid grid-cols-4 sm:grid-cols-8 gap-2 text-center text-xs bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                      <div>
                        <div className="text-[10px] text-slate-400 font-bold">STR</div>
                        <div className="font-extrabold text-red-400">{currentChild.stats?.str || 10}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-400 font-bold">INT</div>
                        <div className="font-extrabold text-blue-400">{currentChild.stats?.int || 10}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-400 font-bold">DEF</div>
                        <div className="font-extrabold text-amber-400">{currentChild.stats?.def || 10}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-400 font-bold">AGI</div>
                        <div className="font-extrabold text-emerald-400">{currentChild.stats?.agi || 10}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-400 font-bold">WIS</div>
                        <div className="font-extrabold text-purple-400">{currentChild.stats?.wis || 10}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-400 font-bold">CTRL</div>
                        <div className="font-extrabold text-pink-400">{currentChild.stats?.ctrl || 10}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-400 font-bold">HP</div>
                        <div className="font-extrabold text-rose-400">{currentChild.stats?.maxHp || 100}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-400 font-bold">MP</div>
                        <div className="font-extrabold text-cyan-400">{currentChild.stats?.maxMp || 50}</div>
                      </div>
                    </div>

                    {/* 자동 육성 목표 능력치 선택 (전투 훈련소 스타일) */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-300 flex items-center gap-1">
                          <TrendingUp size={14} className="text-amber-400" />
                          <span>스승 지도 자동 육성 목표 능력치 설정</span>
                        </span>
                        {currentTrainee && (
                          <span className="text-[11px] text-amber-400 font-bold">
                            현재 지정: {currentStatName}
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {STAT_OPTIONS.map((opt) => {
                          const isPicked = selectedStat === opt.key;
                          const Icon = opt.icon;
                          return (
                            <button
                              key={opt.key}
                              type="button"
                              onClick={() => setSelectedStat(opt.key)}
                              className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                                isPicked
                                  ? 'bg-amber-950/40 border-amber-500/70 text-white shadow-md'
                                  : 'bg-slate-950/50 border-slate-800 hover:border-slate-700 text-slate-400'
                              }`}
                            >
                              <div className={`flex items-center gap-1.5 text-xs font-bold ${opt.color}`}>
                                <Icon size={14} />
                                <span>{opt.label}</span>
                              </div>
                              <p className="text-[10px] text-slate-400 mt-1 leading-tight line-clamp-1">
                                {opt.desc}
                              </p>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* 액션 버튼 그룹 */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => handleRegisterOrUpdateTrainee(currentChild.id, selectedStat)}
                        className="py-3 px-4 rounded-xl font-black text-xs sm:text-sm bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white shadow-lg shadow-amber-950/40 transition-all flex items-center justify-center gap-2 active:scale-98 cursor-pointer"
                      >
                        <Plus size={16} />
                        <span>
                          {currentTrainee ? `목표를 [${targetStatName}]으로 변경` : `서당 입학 및 8시간 수련 시작 (${trainees.length}/${totalCapacity})`}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleInstantLesson(currentChild.id)}
                        disabled={!teacherCompanion}
                        className={`py-3 px-4 rounded-xl font-black text-xs sm:text-sm transition-all flex items-center justify-center gap-2 active:scale-98 ${
                          teacherCompanion
                            ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 cursor-pointer'
                            : 'bg-slate-900 text-slate-600 border border-slate-800 cursor-not-allowed'
                        }`}
                      >
                        <Sparkles size={16} className="text-amber-400" />
                        <span>즉시 1회 특별 개인지도</span>
                      </button>
                    </div>

                  </div>
                );
              })()}
            </div>

          </div>

        </div>

        {/* 하단 푸터 */}
        <div className="p-4 bg-slate-900 border-t border-slate-800 text-[11px] text-slate-400 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shrink-0">
          <span>※ 유년 서당은 20세 미만 대기 학동만 입학 가능하며, 주간 8시간(취침 시간 22:00~06:00 제외) 수련을 완료할 때마다 능력치가 상승하고 서신함에 훈련 보고서가 도착합니다.</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-bold transition-colors text-xs self-end sm:self-auto cursor-pointer"
          >
            닫기
          </button>
        </div>

      </div>
    </div>
  );
};

export default ChildAcademyModal;
