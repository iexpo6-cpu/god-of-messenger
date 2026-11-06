import React, { useState } from 'react';
import { Character, GameLocation, SocialAppointment, RelationType } from '../types';
import { getPersonLocation, addDays } from '../utils';
import { X, Calendar, MapPin, Heart, Swords, Coffee, CheckCircle2, XCircle, AlertCircle, Trash2, Send, MessageCircle, Clock, Sparkles, AlertTriangle } from 'lucide-react';

interface AppointmentModalProps {
    character: Character;
    target: any;
    isOpen: boolean;
    onClose: () => void;
    onUpdateCharacter: (updater: (prev: Character) => Character) => void;
    initialType?: 'meet' | 'duel';
}

export const AppointmentModal: React.FC<AppointmentModalProps> = ({
    character,
    target,
    isOpen,
    onClose,
    onUpdateCharacter,
    initialType = 'meet'
}) => {
    const [appointmentType, setAppointmentType] = useState<'meet' | 'duel'>(initialType);
    const [hasAskedLocation, setHasAskedLocation] = useState(false);
    const [selectedLocationType, setSelectedLocationType] = useState<'inyeon' | 'midpoint' | 'player'>('inyeon');
    const [selectedDaysOffset, setSelectedDaysOffset] = useState<number>(7);
    const [customDateInput, setCustomDateInput] = useState<string>('');
    const [selectedTime, setSelectedTime] = useState<string>('12:00');

    const [resultState, setResultState] = useState<{
        status: 'idle' | 'success' | 'rejected';
        message: string;
        reactionQuote: string;
    }>({ status: 'idle', message: '', reactionQuote: '' });

    if (!isOpen || !target) return null;

    const currentDateStr = character.currentDate || '2000-03-02';
    const currentMonth = currentDateStr.substring(0, 7);
    const targetLocation: GameLocation = getPersonLocation(target, character);
    const playerLocation: GameLocation = character.currentLocation || { region: '제국', nation: '제국', city: '제도 알트도르프' };

    // 중간 지점 계산
    const isSameLocation = targetLocation.nation === playerLocation.nation && targetLocation.city === playerLocation.city;
    const isFarDistance = targetLocation.nation !== playerLocation.nation || targetLocation.region !== playerLocation.region;

    const midpointLocation: GameLocation = isSameLocation
        ? targetLocation
        : {
            region: targetLocation.region || playerLocation.region || '중립령',
            nation: targetLocation.nation,
            city: `${targetLocation.city} 중간 교차점`
        };

    const getChosenLocation = (): GameLocation => {
        if (selectedLocationType === 'inyeon') return targetLocation;
        if (selectedLocationType === 'player') return playerLocation;
        return midpointLocation;
    };

    const chosenLocation = getChosenLocation();

    // 예정 날짜 계산 (커스텀 입력 날짜 우선)
    const scheduledDate = customDateInput || addDays(currentDateStr, selectedDaysOffset);

    // 호감도 보너스 계산 (같은 위치면 0, 먼 위치면 배려 정도에 따라 +8, +5, +2)
    const locationAffectionBonus = isSameLocation
        ? 0
        : selectedLocationType === 'inyeon'
        ? 8
        : selectedLocationType === 'midpoint'
        ? 5
        : 2;

    // 동료 여부 확인
    const isCompanion = (character.companions || []).some(c => c.id === target.id) ||
                        (character.inactiveCompanions || []).some(c => c.id === target.id);

    // 대기 중인 약속 확인
    const existingAppointment = (character.socialAppointments || []).find(
        appt => appt.targetId === target.id && appt.status === 'pending'
    );

    // 이번 달 약속 여부 확인
    const recentAppointment = (character.socialAppointments || []).find(
        appt => appt.targetId === target.id && 
                (appt.appointmentDate || '').substring(0, 7) === currentMonth &&
                appt.status !== 'cancelled'
    );
    const hasAppointedThisMonth = !!recentAppointment;

    const affection = target.affection || 0;
    const isEnemy = target.relationType === RelationType.ENEMY || affection <= -80;
    const isConflict = target.relationType === RelationType.CONFLICT || (affection < 0 && affection > -80);
    const isClose = target.relationType === RelationType.LOVER || 
                    target.relationType === RelationType.SPOUSE || 
                    target.relationType === RelationType.BEST_FRIEND || 
                    target.relationType === RelationType.FRIEND || 
                    affection >= 50;

    const handleAskLocation = () => {
        setHasAskedLocation(true);
    };

    const handleRequestAppointment = () => {
        let isAccepted = false;
        let quote = '';
        let reason = '';
        let affectionPenalty = 0;

        const isTodayMeeting = scheduledDate === currentDateStr;
        const locationBonusPercent = isSameLocation ? 0 : selectedLocationType === 'inyeon' ? 12 : selectedLocationType === 'midpoint' ? 5 : 0;
        let distancePenaltyPercent = 0;

        // 타국/타지역인데 오늘 당장 오라고 하는 경우 패널티
        if (isFarDistance && isTodayMeeting) {
            distancePenaltyPercent = 45; // 거절 확률 급증
        }

        if (appointmentType === 'meet') {
            if (isEnemy) {
                isAccepted = false;
                quote = `"네놈과 마주 앉아 한가롭게 차나 마실 생각 따윈 추호도 없다. 썩 꺼져라."`;
                reason = `상대방이 강한 적대심을 품고 있어 만남을 거부했습니다.`;
            } else if (isFarDistance && isTodayMeeting && Math.random() < 0.75) {
                // 당일 먼 거리 무리한 요구 거절
                isAccepted = false;
                affectionPenalty = 5;
                quote = `"이렇게 먼 곳에 상주하고 있는 저에게 당장 오늘 만나자고 하시다니요... 예의가 없으시군요."`;
                reason = `타국/타지역 상주 중인 인연에게 무리하게 당일 만남을 요구하여 불쾌해하며 호감도가 ${affectionPenalty} 하락했습니다.`;
            } else if (isConflict) {
                const roll = Math.random() * 100;
                if (roll < (15 + locationBonusPercent - distancePenaltyPercent)) {
                    isAccepted = true;
                    quote = `"...무슨 꿍꿍이인지는 모르겠지만, 성의를 보인 만큼 이번 한 번만 받아들이지. ${chosenLocation.nation} ${chosenLocation.city}에서 보겠다."`;
                } else {
                    isAccepted = false;
                    quote = `"너와 대화하고 싶은 기분이 아니야. 돌아가."`;
                    reason = `사이가 껄끄러워 만남을 거절했습니다.`;
                }
            } else if (isClose) {
                if (isFarDistance && isTodayMeeting && Math.random() < 0.4) {
                    isAccepted = false;
                    affectionPenalty = 3;
                    quote = `"아무리 친한 사이라도 이렇게 먼 거리를 오늘 당장 오라고 하는 건 무리예요... 정중하게 정해진 날짜를 맞춰주세요."`;
                    reason = `당일 먼 거리 만남 요청에 부담을 느껴 약속이 거부되었습니다.`;
                } else {
                    isAccepted = true;
                    const dateText = isTodayMeeting ? '오늘' : `${scheduledDate}`;
                    if (selectedLocationType === 'inyeon' && !isSameLocation) {
                        quote = `"제가 있는 곳까지 직접 와주신다니 고마워요! ${dateText}에 ${chosenLocation.nation} ${chosenLocation.city}에서 기다리고 있을게요."`;
                    } else if (selectedLocationType === 'midpoint' && !isSameLocation) {
                        quote = `"중간 장소에서 만나기로 하셨군요! ${dateText}에 ${chosenLocation.nation} ${chosenLocation.city}에서 반갑게 인사 나눠요."`;
                    } else {
                        quote = `"${dateText}에 ${chosenLocation.nation} ${chosenLocation.city}에서 즐거운 시간 만들어봐요."`;
                    }
                }
            } else {
                const baseChance = (affection >= 30 ? 80 : affection >= 10 ? 65 : 45) + locationBonusPercent - distancePenaltyPercent;
                const roll = Math.random() * 100;
                if (roll < baseChance) {
                    isAccepted = true;
                    quote = `"좋습니다. 제안해 주신 날짜(${scheduledDate})와 장소(${chosenLocation.nation} ${chosenLocation.city})로 약속을 정하겠습니다."`;
                } else {
                    isAccepted = false;
                    quote = `"죄송하지만 제안하신 일정이나 장소는 부담스럽군요. 다음에 다시 연락해 주세요."`;
                    reason = `상대방의 호감도가 충분하지 않거나 일정이 맞지 않아 거절당했습니다.`;
                }
            }
        } else {
            // 결투 약속
            if (isEnemy) {
                isAccepted = true;
                quote = `"결투라고? 좋다! 네놈의 콧대를 꺾어주마. ${scheduledDate}에 ${chosenLocation.nation} ${chosenLocation.city}로 나와라!"`;
            } else if (isFarDistance && isTodayMeeting && Math.random() < 0.7) {
                isAccepted = false;
                affectionPenalty = 5;
                quote = `"타국에서 온 나에게 오늘 당장 겨루자고? 무례하기 짝이 없군."`;
                reason = `당일 먼 거리 결투 신청으로 무례함을 느껴 거절당하고 호감도가 ${affectionPenalty} 하락했습니다.`;
            } else if (isConflict || target.isRival) {
                const roll = Math.random() * 100;
                if (roll < (85 - distancePenaltyPercent)) {
                    isAccepted = true;
                    quote = `"실력을 겨뤄보자고? 거절할 이유가 없지. ${scheduledDate}에 ${chosenLocation.nation} ${chosenLocation.city}에서 결판을 내자."`;
                } else {
                    isAccepted = false;
                    quote = `"지금은 너와 주먹을 섞을 여유가 없다."`;
                    reason = `컨디션 난조로 결투 약속을 사양했습니다.`;
                }
            } else {
                const roll = Math.random() * 100;
                if (roll < (70 - distancePenaltyPercent)) {
                    isAccepted = true;
                    quote = `"대련을 신청하시는군요. ${scheduledDate}에 지정 장소에서 뵙겠습니다."`;
                } else {
                    isAccepted = false;
                    quote = `"갑작스러운 결투 신청은 부담스럽군요. 사양하겠습니다."`;
                    reason = `호감도가 낮아 불필요한 결투를 사양했습니다.`;
                }
            }
        }

        const getThemeName = (): string => {
            if (appointmentType === 'meet') {
                if (selectedTime === '12:00') return '점심 식사 약속';
                if (selectedTime === '17:00') return '노을 산책';
                return '저녁 데이트';
            } else {
                if (selectedTime === '12:00') return '낮 대련';
                if (selectedTime === '17:00') return '해질녘 대련';
                return '밤의 혈투';
            }
        };

        const newAppointment: SocialAppointment = {
            id: `appt_${target.id}_${Date.now()}`,
            targetId: target.id,
            targetName: target.name,
            targetVisualUrl: target.visualUrl,
            targetJob: target.job || target.classType,
            targetClassType: target.classType,
            location: chosenLocation,
            district: 'Residential',
            appointmentDate: scheduledDate,
            appointmentTime: selectedTime,
            themeName: getThemeName(),
            locationType: selectedLocationType,
            type: appointmentType,
            status: isAccepted ? 'pending' : 'rejected',
            affectionBonus: locationAffectionBonus,
            proposedBy: 'player'
        };

        onUpdateCharacter(prev => {
            const currentAppts = (prev.socialAppointments || []).filter(
                a => a.targetId !== target.id || a.status !== 'pending'
            );

            // 호감도 패널티 반영
            let updatedNetwork = prev.socialNetwork;
            if (affectionPenalty > 0 && prev.socialNetwork) {
                updatedNetwork = prev.socialNetwork.map(n => 
                    n.id === target.id ? { ...n, affection: Math.max(-100, (n.affection || 0) - affectionPenalty) } : n
                );
            }

            return {
                ...prev,
                socialNetwork: updatedNetwork,
                socialAppointments: [...currentAppts, newAppointment]
            };
        });

        if (isAccepted) {
            setResultState({
                status: 'success',
                message: `${target.name}님과의 약속이 성사되었습니다!`,
                reactionQuote: quote
            });
        } else {
            setResultState({
                status: 'rejected',
                message: reason,
                reactionQuote: quote
            });
        }
    };

    const handleCancelAppointment = () => {
        if (!existingAppointment) return;
        onUpdateCharacter(prev => ({
            ...prev,
            socialAppointments: (prev.socialAppointments || []).filter(a => a.id !== existingAppointment.id)
        }));
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-slate-900 border border-slate-700 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
                {/* 헤더 */}
                <div className="p-4 sm:p-5 border-b border-slate-800 flex justify-between items-center bg-slate-950/80">
                    <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400">
                            <Calendar size={20} />
                        </div>
                        <div>
                            <h3 className="text-base sm:text-lg font-black text-white">만남 약속 잡기</h3>
                            <p className="text-[11px] text-slate-400">인연과의 만남 또는 결투 일정을 예약합니다.</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* 본문 스크롤 영역 */}
                <div className="p-4 sm:p-6 overflow-y-auto custom-scrollbar space-y-5">
                    {/* 대상 인물 기본 정보 카드 */}
                    <div className="bg-slate-950/70 border border-slate-800 p-4 rounded-2xl flex items-center gap-4">
                        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl overflow-hidden border border-slate-700 bg-slate-900 flex-shrink-0 flex items-center justify-center text-2xl">
                            {target.visualUrl ? (
                                <img src={target.visualUrl} alt={target.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            ) : (
                                '👤'
                            )}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                                <h4 className="text-base sm:text-lg font-black text-white truncate">{target.name}</h4>
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-950 border border-indigo-700 text-indigo-300">
                                    레벨 {target.level || 1}
                                </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-300">
                                <span className="text-indigo-400 font-medium truncate">{target.job || target.classType || '무직'}</span>
                                <span className="flex items-center gap-1 text-pink-400 font-bold">
                                    <Heart size={12} className="fill-current" /> 호감도 {affection}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* 1. 동료인 경우 약속 잡기 불가 */}
                    {isCompanion ? (
                        <div className="bg-slate-950/80 border border-slate-800 p-5 rounded-2xl text-center space-y-3">
                            <div className="w-12 h-12 rounded-full bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center mx-auto text-indigo-400">
                                <AlertCircle size={24} />
                            </div>
                            <div>
                                <h4 className="text-sm font-bold text-slate-200 mb-1">동료와의 약속 불가</h4>
                                <p className="text-xs text-slate-400 leading-relaxed">
                                    {target.name}님은 현재 함께하고 있는 동료입니다.<br />
                                    동료와는 언제든 대화 및 관리가 가능하므로 별도의 만남 약속을 잡을 수 없습니다.
                                </p>
                            </div>
                            <button
                                onClick={onClose}
                                className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-colors cursor-pointer"
                            >
                                닫기
                            </button>
                        </div>
                    ) : existingAppointment && resultState.status === 'idle' ? (
                        /* 2. 기존 예약이 이미 대기 중인 경우 */
                        <div className="bg-gradient-to-br from-indigo-950/40 via-slate-950 to-slate-900 border-2 border-indigo-500/50 p-4 sm:p-5 rounded-2xl space-y-3">
                            <div className="flex items-center gap-2 text-indigo-300 font-bold text-sm">
                                <CheckCircle2 size={18} className="text-indigo-400" />
                                <span>이미 약속이 잡혀 있습니다</span>
                            </div>
                            <div className="text-xs text-slate-300 space-y-1 bg-slate-900/90 p-3 rounded-xl border border-slate-800">
                                <p><strong className="text-slate-400">약속 장소:</strong> {existingAppointment.location.nation} {existingAppointment.location.city} 거주구역</p>
                                <p><strong className="text-slate-400">약속 날짜:</strong> {existingAppointment.appointmentDate}</p>
                                <p><strong className="text-slate-400">약속 목적:</strong> {existingAppointment.type === 'duel' ? '실력 겨루기 (결투)' : '차와 담소 (일반 만남)'}</p>
                                <p><strong className="text-slate-400">호감도 보너스:</strong> +{existingAppointment.affectionBonus || 0}</p>
                            </div>
                            <p className="text-xs text-emerald-400 leading-relaxed font-medium">
                                해당 도시({existingAppointment.location.nation} {existingAppointment.location.city})로 이동한 뒤 <strong>거주구역</strong>을 방문하시면 {target.name}님을 만나실 수 있습니다.
                            </p>
                            <button
                                onClick={handleCancelAppointment}
                                className="w-full py-2.5 rounded-xl border border-red-500/40 bg-red-950/30 hover:bg-red-900/40 text-red-300 text-xs font-bold transition-all flex items-center justify-center gap-1.5 active:scale-98 cursor-pointer"
                            >
                                <Trash2 size={14} /> 약속 취소하기
                            </button>
                        </div>
                    ) : !existingAppointment && hasAppointedThisMonth && resultState.status === 'idle' ? (
                        /* 3. 이번 달에 이미 약속을 진행하여 완료한 경우 */
                        <div className="bg-slate-950/80 border border-amber-500/30 p-5 rounded-2xl text-center space-y-3">
                            <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400">
                                <Calendar size={24} />
                            </div>
                            <div>
                                <h4 className="text-sm font-bold text-amber-300 mb-1">
                                    {recentAppointment?.status === 'rejected' ? '이번 달 약속 거절됨' : '이번 달 약속 완료'}
                                </h4>
                                <p className="text-xs text-slate-300 leading-relaxed">
                                    {recentAppointment?.status === 'rejected' 
                                        ? `이번 달에는 이미 ${target.name}님에게 약속을 신청했으나 거절당했습니다.`
                                        : `이번 달에는 이미 ${target.name}님과 약속을 진행하였습니다.`}<br />
                                    <span className="text-slate-400 text-[11px]">약속 신청은 한 사람당 한 달에 한 번만 가능합니다. 다음 달에 다시 신청해 주세요.</span>
                                </p>
                            </div>
                            <button
                                onClick={onClose}
                                className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-colors cursor-pointer"
                            >
                                닫기
                            </button>
                        </div>
                    ) : resultState.status === 'idle' ? (
                        /* 4. 정상적인 약속 신청 흐름 */
                        <div className="space-y-4">
                            {!hasAskedLocation ? (
                                /* 장소 물어보기 전 단계 */
                                <div className="bg-slate-950/60 border border-slate-800 p-5 rounded-2xl space-y-4 text-center">
                                    <div className="w-12 h-12 rounded-full bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center mx-auto text-indigo-400">
                                        <MessageCircle size={24} />
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-bold text-slate-200 mb-1">체류 장소 확인 필요</h4>
                                        <p className="text-xs text-slate-400 leading-relaxed">
                                            약속을 잡기 전, 상대방에게 서신을 보내어 현재 머무르고 있는 장소를 먼저 확인해야 합니다.
                                        </p>
                                    </div>
                                    <button
                                        onClick={handleAskLocation}
                                        className="w-full py-3 px-4 rounded-xl font-bold text-xs text-white bg-indigo-600 hover:bg-indigo-500 active:scale-98 shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
                                    >
                                        <Send size={15} /> 현재 머무는 장소 물어보기
                                    </button>
                                </div>
                            ) : (
                                /* 장소 확인 후 단계 */
                                <div className="space-y-4 animate-in fade-in duration-200">
                                    {/* 상대방의 체류 장소 답변 대사 */}
                                    <div className="bg-slate-950/80 border border-indigo-500/40 p-4 rounded-2xl space-y-2">
                                        <div className="flex items-center justify-between text-xs text-indigo-300 font-bold">
                                            <div className="flex items-center gap-1.5">
                                                <MapPin size={14} className="text-indigo-400" />
                                                <span>{target.name}님의 체류 장소 확인</span>
                                            </div>
                                            {isSameLocation && (
                                                <span className="text-[10px] text-emerald-400 font-normal bg-emerald-950/80 border border-emerald-800 px-2 py-0.5 rounded-full">
                                                    현재 나와 동일 장소
                                                </span>
                                            )}
                                        </div>
                                        <div className="p-3 bg-black/40 rounded-xl border border-white/5 text-xs text-slate-200 italic font-serif leading-relaxed">
                                            "{target.name}: 저는 현재 <strong>{targetLocation.nation} {targetLocation.city}</strong>에 머무르고 있습니다."
                                        </div>
                                    </div>

                                    {/* 1. 약속 장소 정하기 */}
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
                                            <span>약속 장소 정하기</span>
                                            <span className="text-[11px] text-pink-400 font-normal">
                                                {isSameLocation ? '동일 위치 상주 중 (보너스 없음)' : '위치에 따른 배려 보너스'}
                                            </span>
                                        </label>
                                        <div className="space-y-2">
                                            {/* 옵션 A: 인연의 현재 위치 */}
                                            <button
                                                type="button"
                                                onClick={() => setSelectedLocationType('inyeon')}
                                                className={`w-full p-3 rounded-2xl border text-left transition-all flex items-start gap-3 active:scale-98 cursor-pointer ${
                                                    selectedLocationType === 'inyeon'
                                                        ? 'bg-pink-950/40 border-pink-500 text-white shadow-lg shadow-pink-950/30'
                                                        : 'bg-slate-950/50 border-slate-800 text-slate-400 hover:border-slate-700'
                                                }`}
                                            >
                                                <div className={`p-2 rounded-xl mt-0.5 shrink-0 ${selectedLocationType === 'inyeon' ? 'bg-pink-500 text-slate-950' : 'bg-slate-900 text-slate-400'}`}>
                                                    <MapPin size={16} />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center justify-between gap-1 mb-0.5">
                                                        <h5 className="text-xs font-black text-slate-100 truncate">인연의 현재 위치</h5>
                                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${
                                                            isSameLocation 
                                                                ? 'text-slate-400 bg-slate-900 border-slate-800' 
                                                                : 'text-pink-400 bg-pink-950/80 border-pink-800/60'
                                                        }`}>
                                                            {isSameLocation ? '호감도 보너스 없음 (+0)' : '호감도 보너스 (+8)'}
                                                        </span>
                                                    </div>
                                                    <p className="text-[11px] text-slate-300 font-medium">
                                                        {targetLocation.nation} {targetLocation.city}
                                                    </p>
                                                    <p className="text-[10px] text-slate-400 leading-tight mt-0.5">
                                                        {isSameLocation ? '같은 도시에 상주하므로 호감도 보너스가 부여되지 않습니다.' : '상대방의 위치로 직접 방문하여 세심하게 배려합니다.'}
                                                    </p>
                                                </div>
                                            </button>

                                            {/* 옵션 B: 중간 지점 */}
                                            <button
                                                type="button"
                                                onClick={() => setSelectedLocationType('midpoint')}
                                                className={`w-full p-3 rounded-2xl border text-left transition-all flex items-start gap-3 active:scale-98 cursor-pointer ${
                                                    selectedLocationType === 'midpoint'
                                                        ? 'bg-indigo-950/40 border-indigo-500 text-white shadow-lg shadow-indigo-950/30'
                                                        : 'bg-slate-950/50 border-slate-800 text-slate-400 hover:border-slate-700'
                                                }`}
                                            >
                                                <div className={`p-2 rounded-xl mt-0.5 shrink-0 ${selectedLocationType === 'midpoint' ? 'bg-indigo-500 text-slate-950' : 'bg-slate-900 text-slate-400'}`}>
                                                    <MapPin size={16} />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center justify-between gap-1 mb-0.5">
                                                        <h5 className="text-xs font-black text-slate-100 truncate">중간 지점</h5>
                                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${
                                                            isSameLocation 
                                                                ? 'text-slate-400 bg-slate-900 border-slate-800' 
                                                                : 'text-indigo-400 bg-indigo-950/80 border-indigo-800/60'
                                                        }`}>
                                                            {isSameLocation ? '호감도 보너스 없음 (+0)' : '호감도 보너스 (+5)'}
                                                        </span>
                                                    </div>
                                                    <p className="text-[11px] text-slate-300 font-medium">
                                                        {midpointLocation.nation} {midpointLocation.city}
                                                    </p>
                                                    <p className="text-[10px] text-slate-400 leading-tight mt-0.5">
                                                        서로 부담 없는 중간 교차 지점에서 만납니다.
                                                    </p>
                                                </div>
                                            </button>

                                            {/* 옵션 C: 자신의 현재 위치 */}
                                            <button
                                                type="button"
                                                onClick={() => setSelectedLocationType('player')}
                                                className={`w-full p-3 rounded-2xl border text-left transition-all flex items-start gap-3 active:scale-98 cursor-pointer ${
                                                    selectedLocationType === 'player'
                                                        ? 'bg-amber-950/40 border-amber-500 text-white shadow-lg shadow-amber-950/30'
                                                        : 'bg-slate-950/50 border-slate-800 text-slate-400 hover:border-slate-700'
                                                }`}
                                            >
                                                <div className={`p-2 rounded-xl mt-0.5 shrink-0 ${selectedLocationType === 'player' ? 'bg-amber-500 text-slate-950' : 'bg-slate-900 text-slate-400'}`}>
                                                    <MapPin size={16} />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center justify-between gap-1 mb-0.5">
                                                        <h5 className="text-xs font-black text-slate-100 truncate">자신의 현재 위치</h5>
                                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${
                                                            isSameLocation 
                                                                ? 'text-slate-400 bg-slate-900 border-slate-800' 
                                                                : 'text-amber-400 bg-amber-950/80 border-amber-800/60'
                                                        }`}>
                                                            {isSameLocation ? '호감도 보너스 없음 (+0)' : '호감도 보너스 (+2)'}
                                                        </span>
                                                    </div>
                                                    <p className="text-[11px] text-slate-300 font-medium">
                                                        {playerLocation.nation} {playerLocation.city}
                                                    </p>
                                                    <p className="text-[10px] text-slate-400 leading-tight mt-0.5">
                                                        상대방을 나의 머무는 장소로 초대합니다.
                                                    </p>
                                                </div>
                                            </button>
                                        </div>
                                    </div>

                                    {/* 2. 약속 날짜 지정 (프리셋 + 직접 지정 날짜) */}
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <label className="text-xs font-bold text-slate-300">약속 날짜 지정</label>
                                            <span className="text-xs font-black text-indigo-300 flex items-center gap-1">
                                                <Clock size={12} /> 약속일: {scheduledDate}
                                            </span>
                                        </div>
                                        <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
                                            {[
                                                { label: '오늘', days: 0 },
                                                { label: '3일 뒤', days: 3 },
                                                { label: '7일 뒤', days: 7 },
                                                { label: '14일 뒤', days: 14 },
                                                { label: '30일 뒤', days: 30 }
                                            ].map(item => (
                                                <button
                                                    key={item.days}
                                                    type="button"
                                                    onClick={() => {
                                                        setSelectedDaysOffset(item.days);
                                                        setCustomDateInput('');
                                                    }}
                                                    className={`py-2 px-1.5 rounded-xl border text-center transition-all text-xs font-bold active:scale-95 cursor-pointer ${
                                                        !customDateInput && selectedDaysOffset === item.days
                                                            ? 'bg-indigo-600 border-indigo-400 text-white shadow-md'
                                                            : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
                                                    }`}
                                                >
                                                    {item.label}
                                                </button>
                                            ))}
                                        </div>

                                        {/* 직접 날짜 입력 선택기 */}
                                        <div className="pt-1">
                                            <div className="flex items-center gap-2 bg-slate-950/80 p-2.5 rounded-xl border border-slate-800">
                                                <span className="text-[11px] text-slate-400 font-bold shrink-0">날짜 직접 지정:</span>
                                                <input
                                                    type="date"
                                                    value={customDateInput}
                                                    onChange={(e) => setCustomDateInput(e.target.value)}
                                                    className="bg-slate-900 border border-slate-700 text-white text-xs rounded-lg px-2.5 py-1 flex-1 focus:outline-none focus:border-indigo-500"
                                                />
                                            </div>
                                        </div>

                                        {/* 먼 거리 당일 약속 패널티 경고 메세지 */}
                                        {isFarDistance && scheduledDate === currentDateStr && (
                                            <div className="p-2.5 rounded-xl bg-amber-950/40 border border-amber-500/50 flex items-start gap-2 text-amber-300 text-[11px] leading-tight">
                                                <AlertTriangle size={14} className="shrink-0 text-amber-400 mt-0.5" />
                                                <span>
                                                    상대방이 타국/타지역에 상주 중입니다. 오늘 당장 오라고 요청하면 무례하게 느껴져 거절당하거나 호감도가 하락할 수 있습니다.
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    {/* 2-1. 약속 시간대 지정 */}
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
                                            <span>약속 시간대 지정</span>
                                            <span className="text-[11px] text-indigo-400 font-normal">지정된 시간 전후 1시간 내에 데이트가 가능합니다.</span>
                                        </label>
                                        <div className="grid grid-cols-3 gap-2">
                                            {[
                                                { label: appointmentType === 'meet' ? '🥣 점심 식사' : '⚔️ 낮 대련', time: '12:00' },
                                                { label: appointmentType === 'meet' ? '🌅 노을 산책' : '🌅 해질녘 대련', time: '17:00' },
                                                { label: appointmentType === 'meet' ? '🌙 저녁 데이트' : '🌌 밤의 혈투', time: '20:00' }
                                            ].map(item => (
                                                <button
                                                    key={item.time}
                                                    type="button"
                                                    onClick={() => setSelectedTime(item.time)}
                                                    className={`py-3 px-2 rounded-2xl border text-center transition-all text-xs font-bold active:scale-95 cursor-pointer ${
                                                        selectedTime === item.time
                                                            ? 'bg-indigo-600 border-indigo-400 text-white shadow-md'
                                                            : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
                                                    }`}
                                                >
                                                    <div className="text-[11px]">{item.label}</div>
                                                    <div className="text-[10px] text-slate-400 font-mono mt-0.5">{item.time}</div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* 3. 약속 목적 선택 */}
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-300">약속 목적 선택</label>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                            <button
                                                type="button"
                                                onClick={() => setAppointmentType('meet')}
                                                className={`p-3 rounded-2xl border text-left transition-all flex items-start gap-3 active:scale-98 cursor-pointer ${
                                                    appointmentType === 'meet'
                                                        ? 'bg-amber-950/40 border-amber-500 text-white shadow-lg shadow-amber-950/40'
                                                        : 'bg-slate-950/50 border-slate-800 text-slate-400 hover:border-slate-700'
                                                }`}
                                            >
                                                <div className={`p-2 rounded-xl mt-0.5 shrink-0 ${appointmentType === 'meet' ? 'bg-amber-500 text-slate-950' : 'bg-slate-900 text-slate-400'}`}>
                                                    <Coffee size={16} />
                                                </div>
                                                <div>
                                                    <h5 className="text-xs font-black text-slate-100 mb-0.5">차와 담소</h5>
                                                    <p className="text-[10px] text-slate-400 leading-tight">친밀한 대화를 나눕니다.</p>
                                                </div>
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => setAppointmentType('duel')}
                                                className={`p-3 rounded-2xl border text-left transition-all flex items-start gap-3 active:scale-98 cursor-pointer ${
                                                    appointmentType === 'duel'
                                                        ? 'bg-rose-950/40 border-rose-500 text-white shadow-lg shadow-rose-950/40'
                                                        : 'bg-slate-950/50 border-slate-800 text-slate-400 hover:border-slate-700'
                                                }`}
                                            >
                                                <div className={`p-2 rounded-xl mt-0.5 shrink-0 ${appointmentType === 'duel' ? 'bg-rose-500 text-slate-950' : 'bg-slate-900 text-slate-400'}`}>
                                                    <Swords size={16} />
                                                </div>
                                                <div>
                                                    <h5 className="text-xs font-black text-slate-100 mb-0.5">실력 겨루기 (결투)</h5>
                                                    <p className="text-[10px] text-slate-400 leading-tight">1대1 대련을 펼칩니다.</p>
                                                </div>
                                            </button>
                                        </div>
                                    </div>

                                    {/* 안내 및 주의사항 */}
                                    <div className="bg-slate-950/50 border border-slate-800/80 p-3.5 rounded-2xl flex items-start gap-2.5 text-xs text-slate-400">
                                        <AlertCircle size={16} className="text-amber-400 flex-shrink-0 mt-0.5" />
                                        <div className="space-y-1 leading-relaxed text-[11px]">
                                            <p>지정한 날짜까지 해당 장소에 방문하지 않으면 <strong>약속이 파기되어 호감도가 하락</strong>합니다.</p>
                                            <p className="text-slate-500">인연당 한 달에 한 번만 신청할 수 있습니다.</p>
                                        </div>
                                    </div>

                                    {/* 신청 버튼 */}
                                    <button
                                        onClick={handleRequestAppointment}
                                        className="w-full py-3.5 px-4 rounded-2xl font-black text-sm text-white bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 active:scale-98 shadow-xl shadow-indigo-950/60 transition-all flex items-center justify-center gap-2 cursor-pointer"
                                    >
                                        <Calendar size={16} /> 약속 신청하기
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : (
                        /* 결과 화면 (성공 or 거절) */
                        <div className={`p-5 rounded-2xl border text-center space-y-4 animate-in zoom-in-95 duration-200 ${
                            resultState.status === 'success'
                                ? 'bg-emerald-950/30 border-emerald-500/50'
                                : 'bg-rose-950/30 border-rose-500/50'
                        }`}>
                            <div className="flex justify-center">
                                {resultState.status === 'success' ? (
                                    <div className="w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-500 flex items-center justify-center text-emerald-400">
                                        <CheckCircle2 size={28} />
                                    </div>
                                ) : (
                                    <div className="w-12 h-12 rounded-full bg-rose-500/20 border border-rose-500 flex items-center justify-center text-rose-400">
                                        <XCircle size={28} />
                                    </div>
                                )}
                            </div>

                            <div>
                                <h4 className={`text-lg font-black mb-1 ${resultState.status === 'success' ? 'text-emerald-300' : 'text-rose-300'}`}>
                                    {resultState.status === 'success' ? '약속 성사 완료' : '약속 신청 거절'}
                                </h4>
                                <p className="text-xs text-slate-300 leading-relaxed font-medium">
                                    {resultState.message}
                                </p>
                            </div>

                            {resultState.reactionQuote && (
                                <div className="bg-black/40 border border-white/10 p-3.5 rounded-xl text-xs text-slate-200 italic font-serif">
                                    {resultState.reactionQuote}
                                </div>
                            )}

                            {resultState.status === 'success' && (
                                <div className="bg-emerald-950/50 border border-emerald-800/60 p-3 rounded-xl text-xs text-emerald-300 space-y-1 text-left">
                                    <p className="font-bold flex items-center gap-1">
                                        <MapPin size={13} /> 만남 정보
                                    </p>
                                    <p className="text-[11px] text-slate-300">
                                        날짜: <strong>{scheduledDate}</strong><br />
                                        장소: <strong>{chosenLocation.nation} {chosenLocation.city}</strong> 거주구역<br />
                                        호감도 보너스: <strong>+{locationAffectionBonus}</strong>
                                    </p>
                                </div>
                            )}

                            <button
                                onClick={onClose}
                                className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-colors cursor-pointer"
                            >
                                확인
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
