import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Character, DailyReportData, CriticalAlert } from '../types';
import { 
  X, ChevronDown, ChevronUp, AlertTriangle, ShieldAlert, Wheat, Trees, 
  Pickaxe, Sparkles, Gem, ArrowUpRight, Package, Coins, FlaskConical, MapPin, Sword, Heart, Users2, Home
} from 'lucide-react';
import { CombatTrainingReportModal } from './CombatTrainingReportModal';

interface DailySummaryPopupProps {
  report: DailyReportData;
  character?: Character;
  onClose: () => void;
  onOpenBase?: () => void;
  onOpenBlacksmith?: () => void;
  onOpenAlchemy?: () => void;
  onOpenCondolence?: () => void;
}

export const DailySummaryPopup: React.FC<DailySummaryPopupProps> = ({
  report,
  character,
  onClose,
  onOpenBase,
  onOpenBlacksmith,
  onOpenAlchemy,
  onOpenCondolence
}) => {
  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const [showCurrentResources, setShowCurrentResources] = useState<boolean>(true);
  const [showCombatTrainingModal, setShowCombatTrainingModal] = useState<boolean>(false);

  const {
    totalHarvested = {} as any,
    criticalAlerts = [],
    currentResources = { food: 0, wood: 0, stone: 0, herbs: 0, iron: 0, manaStone: 0, manaCrystal: 0 } as any,
    days = 1,
    date = '',
    foodConsumed = 0,
    dailyFoodNeed = 0,
    baseMaintenanceFee = 0
  } = report || {};

  const hasCombatTraining = character?.base?.layout?.some(inst => inst && inst.type === 'combat_training') || false;

  // 기지 위치와 현재 위치 일치 여부 확인
  const isAtBase = !character?.base?.location || (
    character.currentLocation?.city === character.base.location.city &&
    (!character.base.location.nation || !character.currentLocation?.nation || character.currentLocation.nation === character.base.location.nation)
  );

  // 획득 자원 목록 추출 (0보다 큰 항목)
  const harvestItems = [
    { label: '식량', amount: totalHarvested?.food || 0, icon: Wheat, color: 'text-amber-400', bg: 'bg-amber-500/10' },
    { label: '목재', amount: totalHarvested?.wood || 0, icon: Trees, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    { label: '석재', amount: totalHarvested?.stone || 0, icon: Package, color: 'text-slate-300', bg: 'bg-slate-500/10' },
    { label: '약초', amount: totalHarvested?.herbs || 0, icon: Sparkles, color: 'text-green-400', bg: 'bg-green-500/10' },
    { label: '철광석', amount: totalHarvested?.iron || 0, icon: Pickaxe, color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
    { label: '마력석', amount: totalHarvested?.manaStone || 0, icon: Sparkles, color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
    { label: '마정석', amount: totalHarvested?.manaCrystal || 0, icon: Gem, color: 'text-fuchsia-400', bg: 'bg-fuchsia-500/10' },
    { label: '은광석', amount: totalHarvested?.silver_ore || 0, icon: Pickaxe, color: 'text-slate-200', bg: 'bg-slate-300/10' },
    { label: '금광석', amount: totalHarvested?.gold_ore || 0, icon: Pickaxe, color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
    { label: '루비', amount: totalHarvested?.ruby || 0, icon: Gem, color: 'text-red-400', bg: 'bg-red-500/10' },
    { label: '사파이어', amount: totalHarvested?.sapphire || 0, icon: Gem, color: 'text-blue-400', bg: 'bg-blue-500/10' },
    { label: '에메랄드', amount: totalHarvested?.emerald || 0, icon: Gem, color: 'text-emerald-300', bg: 'bg-emerald-400/10' },
    { label: '다이아', amount: totalHarvested?.diamond || 0, icon: Gem, color: 'text-cyan-200', bg: 'bg-cyan-300/10' },
    { label: '신성석', amount: totalHarvested?.holy_stone || 0, icon: Sparkles, color: 'text-amber-300', bg: 'bg-amber-400/10' },
  ].filter(item => item && item.amount > 0);

  // 유효한 알림 필터링 (유령 대원 알림 방어)
  const validCriticalAlerts = (criticalAlerts || []).filter(alert => {
    if (!alert) return false;
    if (alert.type === 'dispatch' && (alert.title?.includes("파견 대원 위험 상태") || alert.message?.includes("'파견 대원' 대원"))) {
      return false;
    }
    return true;
  });

  const isRomanceAlert = (alert: CriticalAlert) => {
    if (!alert) return false;
    if (alert.type === 'romance') return true;
    const tag = alert.message?.match(/\[(.*?)\]/)?.[1] || '';
    const title = alert.title || '';
    return /연인|연애|사랑|데이트|질투|고백|결혼|썸|권태기|짝사랑|이별|약혼/i.test(tag) ||
           /연인|연애|사랑|데이트|질투|고백|결혼|썸|권태기|짝사랑|이별|약혼/i.test(title) ||
           /\[연인 서신\]|\[연인\]|\[고백\]|\[사랑\]|\[데이트\]|\[질투\]|\[권태기\]|\[썸\]/i.test(alert.message || '');
  };

  // 평화로운 동료 일상, 대화, 훈련, 청소, 동거 등은 절대로 '주의'나 '경고'가 아님
  const isRoutineLifeAlert = (alert: CriticalAlert) => {
    if (!alert) return false;
    const text = `${alert.title || ''} ${alert.message || ''}`;
    return /동료 일상|동료 대화|동료 서신|동료 안부|동료 교류|기지 일상|파티 일상|가족 일상|가족 서신|배우자 일상|배우자 서신|기지 훈련|전투 훈련|자동 청소|동거 교류|수련|담소|유대|친밀|신뢰|성장|우정|청결|하우스키퍼|남매|형제|자매|정오 소식|저녁 외교|종합 소식/i.test(text);
  };

  // 실제 위험/주의 사항만 선별 (식량 부족, 기지 침공, 야간 기습, 파견 대원 조난 등)
  const isActualWarningAlert = (alert: CriticalAlert) => {
    if (!alert) return false;
    if (isRomanceAlert(alert) || isRoutineLifeAlert(alert)) return false;
    if (alert.type === 'blacksmith' || alert.type === 'alchemy' || alert.type === 'deceased' || alert.type === 'romance') return false;
    if (alert.title?.includes("파견 임무 완수") || alert.message?.includes("복귀를 기다리고") || alert.message?.includes("수령을 기다리고")) return false;
    const text = `${alert.title || ''} ${alert.message || ''}`;
    // 일반 소식이나 일상/대화/서신/훈련/정오는 절대 주의사항이 아님
    if (/일상|대화|서신|안부|훈련|담소|유대|수련|친밀|청소|제작|연금|조제|완수|복귀|정오|저녁 외교/i.test(text)) return false;
    return /식량 고갈|식량 부족|기지 습격|기지 침공|야간 기습|성전 침공|적대 세력|적 침략|선전포고|전쟁 발발|신마 전쟁|반란군|위험 상태|조난|긴급 구조|탈진|과로 상태|유지비 부족|유지비 경고/i.test(text);
  };

  // 식량 3일치 미만 경고 여부 계산
  const isFoodLow = dailyFoodNeed !== undefined && dailyFoodNeed > 0 && currentResources !== undefined && currentResources.food < (dailyFoodNeed * 3);
  const daysOfFoodLeft = dailyFoodNeed && currentResources ? Math.floor(currentResources.food / Math.max(1, dailyFoodNeed)) : 0;

  const hasDeceased = validCriticalAlerts.some(a => a.type === 'deceased') || ((report.deceasedList?.length || 0) > 0);
  const hasCriticals = validCriticalAlerts.some(a => a.severity === 'critical' && a.type !== 'deceased' && isActualWarningAlert(a));
  const hasActualWarnings = validCriticalAlerts.some(isActualWarningAlert) || isFoodLow;
  const hasRomance = validCriticalAlerts.some(isRomanceAlert);
  const hasRoutine = validCriticalAlerts.some(isRoutineLifeAlert);
  const hasInfo = validCriticalAlerts.some(a => !isActualWarningAlert(a) && !isRomanceAlert(a) && a.type !== 'deceased');
  const hasAnyAlerts = validCriticalAlerts.length > 0;

  return (
    <motion.div 
      id="daily-summary-popup"
      drag
      dragMomentum={false}
      dragElastic={0.05}
      className={`fixed z-[200] font-sans ${
        // 모바일: 하단 고정, 여백 확보 / 데스크탑: 우측 하단
        'bottom-3 left-3 right-3 sm:left-auto sm:right-4 sm:bottom-4 w-auto sm:w-96 max-w-full'
      }`}
    >
      <div className={`rounded-2xl border backdrop-blur-xl shadow-2xl overflow-hidden transition-colors ${
        hasDeceased
          ? 'bg-slate-950/95 border-indigo-500/60 shadow-indigo-950/50 ring-1 ring-indigo-500/30'
          : hasCriticals 
          ? 'bg-slate-950/95 border-red-500/60 shadow-red-950/40 ring-1 ring-red-500/30' 
          : hasActualWarnings
          ? 'bg-slate-900/95 border-amber-500/60 shadow-amber-950/30'
          : hasRomance
          ? 'bg-slate-950/95 border-pink-500/60 shadow-pink-950/40 ring-1 ring-pink-500/30'
          : hasRoutine || hasInfo
          ? 'bg-slate-950/95 border-emerald-500/50 shadow-emerald-950/30 ring-1 ring-emerald-500/20'
          : 'bg-slate-900/95 border-amber-500/40 shadow-slate-950/80'
      }`}>
        {/* 헤더 */}
        <div className={`px-3.5 py-2.5 sm:px-4 sm:py-3 flex items-center justify-between border-b cursor-grab active:cursor-grabbing select-none ${
          hasDeceased
            ? 'bg-indigo-950/70 border-indigo-900/50'
            : hasCriticals 
            ? 'bg-red-950/60 border-red-900/50' 
            : hasActualWarnings
            ? 'bg-amber-950/60 border-amber-900/50'
            : hasRomance
            ? 'bg-pink-950/60 border-pink-900/50'
            : hasRoutine || hasInfo
            ? 'bg-emerald-950/60 border-emerald-900/50'
            : 'bg-slate-800/80 border-slate-700/60'
        }`}>
          <div className="flex items-center gap-2 min-w-0">
            {hasDeceased ? (
              <span className="text-indigo-300 shrink-0 text-base">🕊️</span>
            ) : hasCriticals ? (
              <ShieldAlert className="text-red-400 shrink-0 animate-bounce" size={18} />
            ) : hasActualWarnings ? (
              <AlertTriangle className="text-amber-400 shrink-0 animate-pulse" size={18} />
            ) : hasRomance ? (
              <Heart className="text-pink-400 shrink-0 animate-pulse" size={18} />
            ) : hasRoutine || hasInfo ? (
              <Sparkles className="text-emerald-400 shrink-0 animate-pulse" size={18} />
            ) : (
              <Wheat className="text-amber-400 shrink-0" size={18} />
            )}
            <div className="truncate">
              <h4 className="text-xs sm:text-sm font-bold text-white tracking-tight flex items-center gap-1.5 truncate">
                {hasDeceased ? (
                  <span className="text-indigo-300 font-extrabold">[부고/비보] 일일 종합 보고서</span>
                ) : hasCriticals ? (
                  <span className="text-red-400 font-extrabold">[긴급 경보] 일일 종합 보고서</span>
                ) : hasActualWarnings ? (
                  <span className="text-amber-300 font-extrabold">[주의 알림] 일일 종합 보고서</span>
                ) : hasRomance ? (
                  <span className="text-pink-300 font-extrabold">[동료 소식] 일일 종합 보고서</span>
                ) : hasRoutine || hasInfo ? (
                  <span className="text-emerald-300 font-extrabold">[기지 일상 소식] 일일 종합 보고서</span>
                ) : (
                  <span>일일 자원 수확 보고서</span>
                )}
                <span className="text-[10px] bg-slate-800 border border-slate-700 px-1.5 py-0.5 rounded text-slate-300 font-normal">
                  {days}일 경과
                </span>
              </h4>
              {date && <p className="text-[10px] text-slate-400 font-mono truncate">{date}</p>}
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0 ml-2">
            <button
              onClick={() => setIsMinimized(!isMinimized)}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800/80 transition-colors"
              title={isMinimized ? "펼치기" : "접기"}
              aria-label={isMinimized ? "펼치기" : "접기"}
            >
              {isMinimized ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-red-400 rounded-lg hover:bg-red-950/50 transition-colors"
              title="닫기"
              aria-label="닫기"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* 바디 (접혀있지 않을 때만 표시) */}
        {!isMinimized && (
          <div className="p-3 sm:p-4 max-h-[60vh] sm:max-h-[70vh] overflow-y-auto space-y-3 custom-scrollbar">
            {/* 오늘 인연 약속(데이트) 알림 섹션 */}
            {(() => {
              const todayAppointments = character?.socialAppointments?.filter(
                appt => appt.appointmentDate === date && appt.status === 'pending'
              ) || [];
              if (todayAppointments.length === 0) return null;
              return (
                <div className="space-y-2 mb-2">
                  {todayAppointments.map(appt => (
                    <div 
                      key={appt.id}
                      className="p-3 rounded-2xl bg-gradient-to-br from-indigo-950/70 via-slate-950 to-slate-900 border-2 border-indigo-500/50 text-indigo-200 flex items-start gap-2.5 shadow-lg shadow-indigo-950/50"
                    >
                      <Heart size={18} className="text-pink-400 fill-pink-500 shrink-0 mt-0.5 animate-pulse" />
                      <div className="flex-1 text-xs">
                        <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                          <h5 className="font-extrabold text-white text-xs sm:text-sm">💌 오늘의 인연 약속</h5>
                          <span className="text-[10px] px-1.5 py-0.2 bg-pink-950/80 border border-pink-800 text-pink-300 font-bold rounded">
                            {appt.themeName || '인연 만남'}
                          </span>
                        </div>
                        <p className="text-slate-300 text-[11px] leading-relaxed">
                          오늘 <strong className="text-pink-300">{appt.targetName}</strong>님과의 약속이 있습니다.<br />
                          • <strong className="text-slate-200">약속 장소:</strong> {appt.location?.nation} {appt.location?.city} 거주구역<br />
                          • <strong className="text-slate-200">약속 시각:</strong> <span className="text-indigo-300 font-mono font-bold">{appt.appointmentTime || '12:00'}</span> (전후 1시간 내 참석 가능)
                        </p>
                        <p className="text-emerald-400 text-[10px] mt-1 font-medium">
                          ※ 약속 시각 전후 1시간 범위를 벗어나면 데이트가 자동 취소되거나 참석할 수 없습니다.
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}

            {/* 1. 알림 섹션 (긴급 사태 / 대장간 및 연금술 완성 소식 등) */}
            {hasAnyAlerts && (
              <div className="space-y-2">
                {validCriticalAlerts.map(alert => {
                  if (alert.type === 'deceased') {
                    const dec = alert.deceasedInfo;
                    return (
                      <div 
                        key={alert.id}
                        className="p-3 rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950/80 border border-indigo-500/60 text-slate-200 shadow-xl shadow-slate-950/60 relative overflow-hidden"
                      >
                        <div className="flex items-start gap-3">
                          {/* 고인 영정 / 초상화 */}
                          <div className="w-11 h-11 rounded-xl bg-slate-950 border border-slate-700 overflow-hidden shrink-0 flex items-center justify-center relative shadow-inner">
                            {dec?.visualUrl ? (
                              <img 
                                src={dec.visualUrl} 
                                alt={dec.name} 
                                className="w-full h-full object-cover filter grayscale contrast-125 brightness-90" 
                                referrerPolicy="no-referrer" 
                              />
                            ) : (
                              <span className="text-xl opacity-60">🕊️</span>
                            )}
                            {/* 추모 리본 코너 */}
                            <div className="absolute top-0 right-0 w-3 h-3 bg-black/80 border-b border-l border-slate-600 rotate-45 transform translate-x-1.5 -translate-y-1.5" />
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <h5 className="font-bold text-white text-xs sm:text-sm flex items-center gap-1">
                                <span>{alert.title}</span>
                              </h5>
                              {dec?.originName && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-950/80 border border-indigo-800/80 text-indigo-300 font-medium">
                                  {dec.originName}
                                </span>
                              )}
                              {dec?.nation && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-400 font-mono">
                                  {dec.nation}
                                </span>
                              )}
                            </div>
                            <p className="text-slate-300 text-[11px] leading-relaxed whitespace-pre-line mt-1">
                              {alert.message}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  const isRomance = isRomanceAlert(alert);
                  const isRoutine = isRoutineLifeAlert(alert);

                  const cleanTitle = (() => {
                    const msgMatch = alert.message?.match(/\[(.*?)\]/);
                    if (msgMatch && msgMatch[1]) {
                      return msgMatch[1].trim();
                    }
                    if (alert.title && !alert.title.includes('자정') && !alert.title.includes('정산')) {
                      return alert.title;
                    }
                    return '종합 소식';
                  })();

                  const isCaretakerAlert = alert.message?.includes('[사육사 서신]') || 
                                           alert.title?.includes('사육사 서신') || 
                                           alert.message?.includes('자동특훈 성장 일일 보고서') || 
                                           alert.message?.includes('[사육사 특훈]');

                  if (isCaretakerAlert) {
                    const monsterMatch = alert.message?.match(/• 전담 마수:\s*([^\n]+)/) || alert.message?.match(/전담 몬스터 '([^']+)'/) || alert.message?.match(/마수 '([^']+)'/);
                    const breederMatch = alert.message?.match(/• 담당 사육사:\s*([^\n]+)/) || alert.message?.match(/사육사 \[([^\]]+)\]/) || alert.message?.match(/사육사 '([^']+)'/);
                    const statMatch = alert.message?.match(/• 지정 성장 능력치:\s*([^\n]+)/);
                    const gainMatch = alert.message?.match(/• 특훈 성장치:\s*([^\n]+)/);
                    const expMatch = alert.message?.match(/• 마수 획득 경험치:\s*([^\n]+)/);
                    const levelUpMatch = alert.message?.includes('레벨업했습니다') || alert.message?.includes('🌟 [경사]') || alert.message?.includes('레벨업!');

                    const monsterName = monsterMatch ? monsterMatch[1].trim() : '전담 마수';
                    const breederName = breederMatch ? breederMatch[1].trim() : '담당 사육사';

                    let displayBody = alert.message || '';
                    if (displayBody.includes('가문주님, 안녕하십니까') || displayBody.includes('━━━')) {
                      const statStr = (statMatch && gainMatch) ? `${statMatch[1].trim()} ${gainMatch[1].trim()}` : '';
                      const expStr = expMatch ? expMatch[1].trim() : '+40 EXP';
                      displayBody = `특훈 성과: ${statStr ? statStr + ' | ' : ''}유대감 +2 | ${expStr}${levelUpMatch ? ' (🌟 레벨업!)' : ''}`;
                    }

                    return (
                      <div 
                        key={alert.id}
                        className="p-2.5 sm:p-3 rounded-xl bg-slate-900/90 border border-emerald-500/40 text-emerald-200 flex items-start gap-2.5 shadow-md shadow-emerald-950/20"
                      >
                        <Sparkles size={18} className="text-emerald-400 shrink-0 mt-0.5" />
                        <div className="flex-1 text-xs">
                          <div className="flex items-center justify-between gap-2 mb-0.5">
                            <h5 className="font-bold text-emerald-300 text-xs sm:text-sm">
                              [사육사 특훈] {monsterName}
                            </h5>
                            <span className="text-[10px] text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700 shrink-0">
                              사육사: {breederName}
                            </span>
                          </div>
                          <p className="text-slate-300 text-[11px] leading-relaxed whitespace-pre-line mt-1">
                            {displayBody}
                          </p>
                          {alert.message?.includes('가문주님') && (
                            <p className="text-[10px] text-emerald-400/80 mt-1 font-medium">
                              💡 상세 보고서는 서신함에서 확인 가능합니다.
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  }

                  if (isRomance) {
                    return (
                      <div 
                        key={alert.id}
                        className="p-2.5 sm:p-3 rounded-xl bg-pink-950/85 border border-pink-500/60 text-pink-200 flex items-start gap-2.5 shadow-lg shadow-pink-950/40 ring-1 ring-pink-500/30"
                      >
                        <Heart size={18} className="text-pink-400 shrink-0 mt-0.5 animate-pulse" />
                        <div className="flex-1 text-xs">
                          <h5 className="font-bold text-pink-300 text-xs sm:text-sm mb-0.5">{cleanTitle}</h5>
                          <p className="text-pink-100/90 text-[11px] leading-relaxed whitespace-pre-line">{alert.message}</p>
                        </div>
                      </div>
                    );
                  }

                  if (isRoutine) {
                    const text = `${alert.title || ''} ${alert.message || ''}`;
                    const isCompanionTalk = /동료 일상|동료 대화|동료 서신|동료 안부|동료 교류|동거 교류|담소|유대|친밀|신뢰|성장|우정/i.test(text);
                    const isTraining = /기지 훈련|전투 훈련|수련/i.test(text);
                    const isCleaning = /자동 청소|청결|하우스키퍼/i.test(text);

                    if (isCompanionTalk) {
                      return (
                        <div 
                          key={alert.id}
                          className="p-2.5 sm:p-3 rounded-xl bg-slate-900/90 border border-emerald-500/40 text-emerald-200 flex items-start gap-2.5 shadow-md shadow-emerald-950/20"
                        >
                          <Users2 size={18} className="text-emerald-400 shrink-0 mt-0.5" />
                          <div className="flex-1 text-xs">
                            <h5 className="font-bold text-emerald-300 text-xs sm:text-sm mb-0.5">{cleanTitle}</h5>
                            <p className="text-slate-300 text-[11px] leading-relaxed whitespace-pre-line">{alert.message}</p>
                          </div>
                        </div>
                      );
                    }

                    if (isTraining) {
                      return (
                        <div 
                          key={alert.id}
                          className="p-2.5 sm:p-3 rounded-xl bg-slate-900/90 border border-indigo-500/40 text-indigo-200 flex items-start gap-2.5 shadow-md shadow-indigo-950/20"
                        >
                          <Sword size={18} className="text-indigo-400 shrink-0 mt-0.5" />
                          <div className="flex-1 text-xs">
                            <h5 className="font-bold text-indigo-300 text-xs sm:text-sm mb-0.5">{cleanTitle}</h5>
                            <p className="text-slate-300 text-[11px] leading-relaxed whitespace-pre-line">{alert.message}</p>
                          </div>
                        </div>
                      );
                    }

                    if (isCleaning) {
                      return (
                        <div 
                          key={alert.id}
                          className="p-2.5 sm:p-3 rounded-xl bg-slate-900/90 border border-teal-500/40 text-teal-200 flex items-start gap-2.5 shadow-md shadow-teal-950/20"
                        >
                          <Sparkles size={18} className="text-teal-400 shrink-0 mt-0.5" />
                          <div className="flex-1 text-xs">
                            <h5 className="font-bold text-teal-300 text-xs sm:text-sm mb-0.5">{cleanTitle}</h5>
                            <p className="text-slate-300 text-[11px] leading-relaxed whitespace-pre-line">{alert.message}</p>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div 
                        key={alert.id}
                        className="p-2.5 sm:p-3 rounded-xl bg-slate-900/90 border border-emerald-500/30 text-emerald-200 flex items-start gap-2.5 shadow-md shadow-emerald-950/20"
                      >
                        <Sparkles size={18} className="text-emerald-400 shrink-0 mt-0.5" />
                        <div className="flex-1 text-xs">
                          <h5 className="font-bold text-emerald-300 text-xs sm:text-sm mb-0.5">{cleanTitle}</h5>
                          <p className="text-slate-300 text-[11px] leading-relaxed whitespace-pre-line">{alert.message}</p>
                        </div>
                      </div>
                    );
                  }

                  const isWarningAlert = isActualWarningAlert(alert);

                  if (isWarningAlert) {
                    const isSevereCritical = alert.severity === 'critical' || alert.message?.includes('기지 습격') || alert.message?.includes('침공') || alert.message?.includes('식량 고갈');
                    if (isSevereCritical) {
                      return (
                        <div 
                          key={alert.id}
                          className="p-2.5 sm:p-3 rounded-xl bg-red-950/80 border border-red-500/50 text-red-200 flex items-start gap-2.5 shadow-lg shadow-red-950/30"
                        >
                          <AlertTriangle size={18} className="text-red-400 shrink-0 mt-0.5 animate-pulse" />
                          <div className="flex-1 text-xs">
                            <h5 className="font-bold text-red-300 text-xs sm:text-sm mb-0.5">{cleanTitle}</h5>
                            <p className="text-slate-300 text-[11px] leading-relaxed whitespace-pre-line">{alert.message}</p>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div 
                        key={alert.id}
                        className="p-2.5 sm:p-3 rounded-xl bg-amber-950/80 border border-amber-500/50 text-amber-200 flex items-start gap-2.5 shadow-lg shadow-amber-950/30"
                      >
                        <AlertTriangle size={18} className="text-amber-400 shrink-0 mt-0.5 animate-pulse" />
                        <div className="flex-1 text-xs">
                          <h5 className="font-bold text-amber-300 text-xs sm:text-sm mb-0.5">{cleanTitle}</h5>
                          <p className="text-slate-300 text-[11px] leading-relaxed whitespace-pre-line">{alert.message}</p>
                        </div>
                      </div>
                    );
                  }

                  // 일반 알림 및 제작/파견 수령 알림 (절대로 주의사항으로 표시하지 않음)
                  return (
                    <div 
                      key={alert.id}
                      className="p-2.5 sm:p-3 rounded-xl bg-slate-900/90 border border-slate-700/60 text-slate-200 flex items-start gap-2.5 shadow-md shadow-slate-950/30"
                    >
                      {alert.type === 'blacksmith' ? (
                        <Pickaxe size={18} className="text-sky-400 shrink-0 mt-0.5" />
                      ) : alert.type === 'alchemy' ? (
                        <FlaskConical size={18} className="text-cyan-400 shrink-0 mt-0.5" />
                      ) : alert.type === 'dispatch' ? (
                        <MapPin size={18} className="text-emerald-400 shrink-0 mt-0.5" />
                      ) : (
                        <Sparkles size={18} className="text-sky-400 shrink-0 mt-0.5" />
                      )}
                      <div className="flex-1 text-xs">
                        <h5 className="font-bold text-sky-300 text-xs sm:text-sm mb-0.5">{cleanTitle}</h5>
                        <p className="text-slate-300 text-[11px] leading-relaxed whitespace-pre-line">{alert.message}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* 1-1. 식량 3일치 미만 부족 경고 배너 */}
            {isFoodLow && !validCriticalAlerts.some(a => a.type === 'shortage') && (
              <div className="p-2.5 sm:p-3 rounded-xl bg-amber-950/80 border border-amber-500/60 text-amber-200 flex items-start gap-2.5 shadow-lg shadow-amber-950/30">
                <AlertTriangle size={18} className="text-amber-400 shrink-0 mt-0.5 animate-pulse" />
                <div className="flex-1 text-xs">
                  <h5 className="font-bold text-amber-300 text-xs sm:text-sm mb-0.5">
                    ⚠️ 식량 부족 경고 (3일치 미만 잔여)
                  </h5>
                  <p className="text-slate-300 text-[11px] leading-relaxed">
                    기지 식량 보유량이 3일치 소비량 미만입니다!
                    <br />
                    (현재 보유: <span className="text-amber-300 font-bold font-mono">{currentResources?.food.toLocaleString()}개</span> / 3일치 필요: <span className="text-amber-400 font-mono">{(dailyFoodNeed! * 3).toLocaleString()}개</span>, 약 <span className="text-amber-300 font-bold">{daysOfFoodLeft}일분</span> 잔여)
                    <br />
                    <span className="text-red-300">식량이 바닥나면 거주민들의 호감도와 충성도가 하락하므로 식량을 서둘러 비축하세요.</span>
                  </p>
                </div>
              </div>
            )}

            {/* 2. 오늘 수확한 자원 요약 */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-slate-300 flex items-center gap-1">
                  <Wheat size={13} className="text-amber-400" /> 금일 수확 총합
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  총 {harvestItems.length}종 수확됨
                </span>
              </div>

              {harvestItems.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                  {harvestItems.map((item, idx) => {
                    const IconComp = item.icon;
                    return (
                      <div 
                        key={idx}
                        className={`p-2 rounded-xl border border-slate-800/80 ${item.bg} flex items-center justify-between gap-1.5`}
                      >
                        <div className="flex items-center gap-1.5 min-w-0">
                          <IconComp size={13} className={`${item.color} shrink-0`} />
                          <span className="text-[11px] font-medium text-slate-300 truncate">{item.label}</span>
                        </div>
                        <span className={`text-xs font-mono font-bold ${item.color} shrink-0`}>
                          +{item.amount.toLocaleString()}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-center text-xs text-slate-500">
                  금일 생산/수확된 자원이 없습니다.
                </div>
              )}
            </div>

            {/* 2-1. 식량 소비 및 순변동 현황 표시 */}
            {((foodConsumed !== undefined && foodConsumed > 0) || (dailyFoodNeed !== undefined && dailyFoodNeed > 0)) && (
              <div className="p-2.5 rounded-xl bg-slate-950/70 border border-amber-500/30 space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300 flex items-center gap-1.5 font-medium">
                    <Wheat size={13} className="text-amber-400 shrink-0" />
                    <span>식량 수급 및 소비 결산</span>
                  </span>
                  {dailyFoodNeed !== undefined && dailyFoodNeed > 0 && (
                    <span className="text-[10px] text-slate-400 font-mono">
                      일일 소비: {dailyFoodNeed}개/일
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-800/60 font-mono">
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-400 font-semibold">수확 +{(totalHarvested?.food || 0).toLocaleString()}</span>
                    <span className="text-slate-500">/</span>
                    <span className="text-red-400 font-semibold">소비 -{(foodConsumed || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-slate-400 text-[10px]">순변동:</span>
                    <span className={`font-bold ${(totalHarvested?.food || 0) - (foodConsumed || 0) >= 0 ? 'text-amber-300' : 'text-rose-400'}`}>
                      {(totalHarvested?.food || 0) - (foodConsumed || 0) >= 0 ? '+' : ''}{((totalHarvested?.food || 0) - (foodConsumed || 0)).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* 2-2. 기지 월간 유지비 지출 현황 */}
            {baseMaintenanceFee !== undefined && baseMaintenanceFee > 0 && (
              <div className="p-2.5 rounded-xl bg-slate-950/70 border border-amber-500/30 space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-amber-300 flex items-center gap-1.5 font-bold">
                    <Coins size={13} className="text-amber-400 shrink-0" />
                    <span>월간 기지 유지비 정산</span>
                  </span>
                  <span className="text-[10px] bg-amber-950 border border-amber-500/40 text-amber-300 px-1.5 py-0.5 rounded font-semibold animate-pulse">
                    매달 지출
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-800/60 font-mono">
                  <div className="text-slate-300">
                    시설 유지비 지출합계:
                  </div>
                  <div className="text-rose-400 font-extrabold">
                    -{baseMaintenanceFee.toLocaleString()} G
                  </div>
                </div>
              </div>
            )}

            {/* 2-3. 마인 제국 마정석 정기 공급 계약 현황 */}
            {character?.demonMiningContractEndDate && (!date || date <= character.demonMiningContractEndDate || (character.currentDate && character.currentDate <= character.demonMiningContractEndDate)) && (
              <div className="p-2.5 rounded-xl bg-purple-950/70 border border-purple-500/40 space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-purple-300 flex items-center gap-1.5 font-bold">
                    <Gem size={13} className="text-fuchsia-400 shrink-0" />
                    <span>마인 제국 마정석 정기 공급 계약</span>
                  </span>
                  <span className="text-[10px] bg-purple-900/80 border border-purple-600/50 text-purple-200 px-1.5 py-0.5 rounded font-semibold">
                    공급 진행 중
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] pt-1 border-t border-purple-900/60 font-mono">
                  <div className="text-slate-300 flex items-center gap-1">
                    <span>일일 기지 공급량:</span>
                    <span className="text-fuchsia-400 font-bold">+{character.demonMiningDailySupply || 30}개/일</span>
                  </div>
                  <div className="text-slate-400 text-[10px]">
                    만료일: <span className="text-purple-300">{character.demonMiningContractEndDate}</span>
                  </div>
                </div>
              </div>
            )}

            {/* 2-4. 엘프 숲연합 목재 정기 공급 계약 현황 */}
            {character?.elfWoodContractEndDate && (!date || date <= character.elfWoodContractEndDate || (character.currentDate && character.currentDate <= character.elfWoodContractEndDate)) && (
              <div className="p-2.5 rounded-xl bg-emerald-950/70 border border-emerald-500/40 space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-emerald-300 flex items-center gap-1.5 font-bold">
                    <Trees size={13} className="text-emerald-400 shrink-0" />
                    <span>엘프 숲연합 목재 정기 공급 계약</span>
                  </span>
                  <span className="text-[10px] bg-emerald-900/80 border border-emerald-600/50 text-emerald-200 px-1.5 py-0.5 rounded font-semibold">
                    공급 진행 중
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] pt-1 border-t border-emerald-900/60 font-mono">
                  <div className="text-slate-300 flex items-center gap-1">
                    <span>일일 기지 공급량:</span>
                    <span className="text-emerald-400 font-bold">+{character.elfWoodDailySupply || 30}개/일</span>
                  </div>
                  <div className="text-slate-400 text-[10px]">
                    만료일: <span className="text-emerald-300">{character.elfWoodContractEndDate}</span>
                  </div>
                </div>
              </div>
            )}

            {/* 2-5. 수인 연맹 석재 정기 공급 계약 현황 */}
            {character?.beastStoneContractEndDate && (!date || date <= character.beastStoneContractEndDate || (character.currentDate && character.currentDate <= character.beastStoneContractEndDate)) && (
              <div className="p-2.5 rounded-xl bg-orange-950/70 border border-orange-500/40 space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-orange-300 flex items-center gap-1.5 font-bold">
                    <Pickaxe size={13} className="text-orange-400 shrink-0" />
                    <span>수인 연맹 석재 정기 공급 계약</span>
                  </span>
                  <span className="text-[10px] bg-orange-900/80 border border-orange-600/50 text-orange-200 px-1.5 py-0.5 rounded font-semibold">
                    공급 진행 중
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] pt-1 border-t border-orange-900/60 font-mono">
                  <div className="text-slate-300 flex items-center gap-1">
                    <span>일일 기지 공급량:</span>
                    <span className="text-orange-400 font-bold">+{character.beastStoneDailySupply || 30}개/일</span>
                  </div>
                  <div className="text-slate-400 text-[10px]">
                    만료일: <span className="text-orange-300">{character.beastStoneContractEndDate}</span>
                  </div>
                </div>
              </div>
            )}

            {/* 2-6. 수인 연맹 철광석 정기 공급 계약 현황 */}
            {character?.beastIronContractEndDate && (!date || date <= character.beastIronContractEndDate || (character.currentDate && character.currentDate <= character.beastIronContractEndDate)) && (
              <div className="p-2.5 rounded-xl bg-amber-950/70 border border-amber-500/40 space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-amber-300 flex items-center gap-1.5 font-bold">
                    <Pickaxe size={13} className="text-amber-400 shrink-0" />
                    <span>수인 연맹 철광석 정기 공급 계약</span>
                  </span>
                  <span className="text-[10px] bg-amber-900/80 border border-amber-600/50 text-amber-200 px-1.5 py-0.5 rounded font-semibold">
                    공급 진행 중
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] pt-1 border-t border-amber-900/60 font-mono">
                  <div className="text-slate-300 flex items-center gap-1">
                    <span>일일 기지 공급량:</span>
                    <span className="text-amber-400 font-bold">+{character.beastIronDailySupply || 30}개/일</span>
                  </div>
                  <div className="text-slate-400 text-[10px]">
                    만료일: <span className="text-amber-300">{character.beastIronContractEndDate}</span>
                  </div>
                </div>
              </div>
            )}

            {/* 3. 현재 기지 보유 자원 상황 (편의성 강화) */}
            {currentResources && (
              <div className="pt-2 border-t border-slate-800/80">
                <button
                  onClick={() => setShowCurrentResources(!showCurrentResources)}
                  className="w-full flex items-center justify-between p-1.5 rounded-lg hover:bg-slate-800/60 transition-colors text-xs font-bold text-slate-300"
                >
                  <span className="flex items-center gap-1.5">
                    <Package size={13} className="text-cyan-400" /> 현재 기지 보유 자원 현황
                  </span>
                  <span className="text-[10px] text-cyan-400 font-normal flex items-center gap-0.5">
                    {showCurrentResources ? '접기' : '펼치기'}
                    {showCurrentResources ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  </span>
                </button>

                {showCurrentResources && (
                  <div className="mt-1.5 grid grid-cols-2 sm:grid-cols-3 gap-1.5 bg-slate-950/80 p-2 rounded-xl border border-slate-800">
                    <div className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 flex justify-between items-center text-[11px]">
                      <span className="text-slate-400">🌾 식량</span>
                      <span className={`font-mono font-bold ${
                        currentResources.food <= 0 
                          ? 'text-red-400 animate-pulse' 
                          : isFoodLow 
                          ? 'text-amber-400 animate-pulse' 
                          : 'text-amber-300'
                      }`}>
                        {currentResources.food.toLocaleString()}
                      </span>
                    </div>
                    <div className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 flex justify-between items-center text-[11px]">
                      <span className="text-slate-400">🪵 목재</span>
                      <span className="font-mono font-bold text-emerald-300">{currentResources.wood.toLocaleString()}</span>
                    </div>
                    <div className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 flex justify-between items-center text-[11px]">
                      <span className="text-slate-400">🪨 석재</span>
                      <span className="font-mono font-bold text-slate-300">{currentResources.stone.toLocaleString()}</span>
                    </div>
                    <div className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 flex justify-between items-center text-[11px]">
                      <span className="text-slate-400">🌿 약초</span>
                      <span className="font-mono font-bold text-green-300">{currentResources.herbs.toLocaleString()}</span>
                    </div>
                    <div className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 flex justify-between items-center text-[11px]">
                      <span className="text-slate-400">⛏️ 철광석</span>
                      <span className="font-mono font-bold text-cyan-300">{currentResources.iron.toLocaleString()}</span>
                    </div>
                    <div className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 flex justify-between items-center text-[11px]">
                      <span className="text-slate-400">🔮 마력석</span>
                      <span className="font-mono font-bold text-indigo-300">{currentResources.manaStone.toLocaleString()}</span>
                    </div>
                    <div className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 flex justify-between items-center text-[11px] col-span-2 sm:col-span-1">
                      <span className="text-slate-400">💎 마정석</span>
                      <span className="font-mono font-bold text-fuchsia-300">{currentResources.manaCrystal.toLocaleString()}</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 하단 버튼 액션 */}
            <div className="pt-1 flex flex-col gap-2">
              {criticalAlerts.some(a => a.type === 'defense') && (
                <button
                  onClick={onClose}
                  className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 border border-red-400/50 text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 active:scale-95 shadow-lg shadow-red-950/80 animate-pulse"
                >
                  <ShieldAlert size={14} />
                  <span>침공 및 습격 방어전 즉시 대응하기</span>
                  <ArrowUpRight size={13} />
                </button>
              )}
              
              <div className="flex flex-wrap items-stretch gap-1.5">
                {/* 추모원 조문 바로가기 버튼 */}
                {hasDeceased && onOpenCondolence && (
                  <button
                    onClick={() => {
                      onOpenCondolence();
                    }}
                    className="flex-1 min-w-[140px] py-2 px-2.5 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 active:scale-95 shadow-md bg-indigo-950/90 hover:bg-indigo-900 border-indigo-500/60 text-indigo-200 shadow-indigo-950/50"
                  >
                    <Heart size={14} className="text-indigo-400 shrink-0" />
                    <span className="truncate">추모원 조문 바로가기</span>
                    <ArrowUpRight size={13} className="shrink-0 opacity-80" />
                  </button>
                )}

                {criticalAlerts.some(a => a.type === 'blacksmith') && onOpenBlacksmith && (
                  <button
                    onClick={() => {
                      onOpenBlacksmith();
                    }}
                    className={`flex-1 min-w-[140px] py-2 px-2.5 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 active:scale-95 shadow-md ${
                      isAtBase 
                        ? 'bg-sky-600/90 hover:bg-sky-500 border-sky-400/50 text-white shadow-sky-950/50' 
                        : 'bg-sky-950/70 hover:bg-sky-900/80 border-sky-500/40 text-sky-200'
                    }`}
                  >
                    <Pickaxe size={14} className="text-sky-300 shrink-0" />
                    <span className="truncate">대장간 수령 바로가기</span>
                    {!isAtBase && <span className="text-[10px] text-sky-400 font-normal shrink-0">(기지 이동 필요)</span>}
                    <ArrowUpRight size={13} className="shrink-0 opacity-80" />
                  </button>
                )}

                {criticalAlerts.some(a => a.type === 'alchemy') && onOpenAlchemy && (
                  <button
                    onClick={() => {
                      onOpenAlchemy();
                    }}
                    className={`flex-1 min-w-[140px] py-2 px-2.5 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 active:scale-95 shadow-md ${
                      isAtBase 
                        ? 'bg-cyan-600/90 hover:bg-cyan-500 border-cyan-400/50 text-white shadow-cyan-950/50' 
                        : 'bg-cyan-950/70 hover:bg-cyan-900/80 border-cyan-500/40 text-cyan-200'
                    }`}
                  >
                    <FlaskConical size={14} className="text-cyan-300 shrink-0" />
                    <span className="truncate">연금술 수령 바로가기</span>
                    {!isAtBase && <span className="text-[10px] text-cyan-400 font-normal shrink-0">(기지 이동 필요)</span>}
                    <ArrowUpRight size={13} className="shrink-0 opacity-80" />
                  </button>
                )}

                {criticalAlerts.some(a => a.type === 'dispatch' && a.title.includes('파견 복귀')) && onOpenBase && (
                  <button
                    onClick={() => {
                      onOpenBase();
                    }}
                    className={`flex-1 min-w-[140px] py-2 px-2.5 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 active:scale-95 shadow-md ${
                      isAtBase 
                        ? 'bg-emerald-600/90 hover:bg-emerald-500 border-emerald-400/50 text-white shadow-emerald-950/50' 
                        : 'bg-emerald-950/70 hover:bg-emerald-900/80 border-emerald-500/40 text-emerald-200'
                    }`}
                  >
                    <MapPin size={14} className="text-emerald-300 shrink-0" />
                    <span className="truncate">파견 복귀 확인 바로가기</span>
                    {!isAtBase && <span className="text-[10px] text-emerald-400 font-normal shrink-0">(기지 이동 필요)</span>}
                    <ArrowUpRight size={13} className="shrink-0 opacity-80" />
                  </button>
                )}

                {hasCombatTraining && (
                  <button
                    onClick={() => setShowCombatTrainingModal(true)}
                    className="flex-1 min-w-[140px] py-2 px-2.5 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 active:scale-95 shadow-md bg-purple-900/60 hover:bg-purple-800/80 border-purple-500/40 text-purple-200"
                  >
                    <Sword size={14} className="text-purple-400 shrink-0" />
                    <span className="truncate">전투 훈련 결과 보고서</span>
                  </button>
                )}

                {onOpenBase && (
                  <button
                    onClick={() => {
                      onOpenBase();
                    }}
                    className={`flex-1 min-w-[140px] py-2 px-2.5 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 active:scale-95 shadow-md ${
                      isAtBase 
                        ? 'bg-cyan-600/80 hover:bg-cyan-500 border-cyan-400/50 text-white shadow-cyan-950/50' 
                        : 'bg-cyan-950/70 hover:bg-cyan-900/80 border-cyan-500/40 text-cyan-200'
                    }`}
                  >
                    <Package size={14} className="text-cyan-300 shrink-0" />
                    <span className="truncate">기지 및 파견 관리 바로가기</span>
                    {!isAtBase && <span className="text-[10px] text-cyan-400 font-normal shrink-0">(기지 이동 필요)</span>}
                    <ArrowUpRight size={13} className="shrink-0 opacity-80" />
                  </button>
                )}

                <button
                  onClick={onClose}
                  className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors shrink-0"
                >
                  닫기
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {showCombatTrainingModal && character && (
          <CombatTrainingReportModal
              character={character}
              onClose={() => setShowCombatTrainingModal(false)}
          />
      )}
    </motion.div>
  );
};
