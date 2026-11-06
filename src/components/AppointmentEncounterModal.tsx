import React, { useState } from 'react';
import { Character, Companion, SocialAppointment, Enemy, Stats, SkillType, ClassTier } from '../types';
import { X, Heart, Swords, Coffee, Gift, UserPlus, CheckCircle2, MessageSquare, Sparkles, AlertCircle, Clock } from 'lucide-react';
import { scaleNpcEnemyStats } from '../services/npcCombatScaling';

interface AppointmentEncounterModalProps {
    character: Character;
    appointment: SocialAppointment;
    isOpen?: boolean;
    onClose: () => void;
    onUpdateCharacter: (updater: (prev: Character) => Character) => void;
    onBattle?: (enemy: Enemy, battleType?: string, targetId?: string) => void;
}

export const AppointmentEncounterModal: React.FC<AppointmentEncounterModalProps> = ({
    character,
    appointment,
    isOpen = true,
    onClose,
    onUpdateCharacter,
    onBattle
}) => {
    const [activeTab, setActiveTab] = useState<'main' | 'talk' | 'gift'>('main');
    const [dialogueLog, setDialogueLog] = useState<string[]>([]);
    const [actionFeedback, setActionFeedback] = useState<string | null>(null);
    const [hasTalked, setHasTalked] = useState(false);
    const [hasGifted, setHasGifted] = useState(false);

    if (!isOpen || !appointment) return null;

    const currentTimeStr = character.currentTime || '08:00';
    const apptTimeStr = appointment.appointmentTime || '12:00';

    const getMinutes = (t: string) => {
        const [h, m] = t.split(':').map(Number);
        return (h || 0) * 60 + (m || 0);
    };

    const curMin = getMinutes(currentTimeStr);
    const apptMin = getMinutes(apptTimeStr);
    const minDiff = Math.abs(curMin - apptMin);

    // 아직 시간이 많이 이른 경우 (60분 초과하여 일찍 도착)
    const isTooEarly = curMin < apptMin && minDiff > 60;
    // 이미 시간이 많이 지나버린 경우 (60분 초과하여 지각)
    const isTooLate = curMin > apptMin && minDiff > 60;

    // 인물 원본 찾기 (socialNetwork, companions, inactiveCompanions 등에서)
    const findOriginalNpc = () => {
        const fromSocial = (character.socialNetwork || []).find(n => n.id === appointment.targetId);
        if (fromSocial) return fromSocial;
        const fromActive = (character.companions || []).find(c => c.id === appointment.targetId);
        if (fromActive) return fromActive;
        const fromInactive = (character.inactiveCompanions || []).find(c => c.id === appointment.targetId);
        if (fromInactive) return fromInactive;
        const fromSchool = (character.schoolData?.classmates || []).find(s => s.id === appointment.targetId);
        if (fromSchool) return fromSchool;
        const fromClub = (character.clubData?.clubMembers || []).find(m => m.id === appointment.targetId);
        if (fromClub) return fromClub;
        if (character.base?.templeVisitors) {
            for (const key of Object.keys(character.base.templeVisitors)) {
                const found = character.base.templeVisitors[key]?.find((v: any) => v.id === appointment.targetId);
                if (found) return found;
            }
        }
        return null;
    };

    const targetNpc = findOriginalNpc() || {
        id: appointment.targetId,
        name: appointment.targetName,
        visualUrl: appointment.targetVisualUrl,
        level: 10,
        job: appointment.targetJob,
        classType: appointment.targetClassType,
        affection: 10,
        personality: '온화함',
        stats: { hp: 150, maxHp: 150, mp: 80, maxMp: 80, str: 15, int: 15, wis: 15, def: 15, agi: 15, ctrl: 15 }
    };

    const affection = Math.min(100, Math.max(-100, (targetNpc as any).affection ?? 10));
    const isAlreadyCompanion = (character.companions || []).some(c => c.id === targetNpc.id) ||
                               (character.inactiveCompanions || []).some(c => c.id === targetNpc.id);

    // 약속 완료 처리
    const completeAppointment = () => {
        onUpdateCharacter(prev => ({
            ...prev,
            socialAppointments: (prev.socialAppointments || []).map(a => 
                a.id === appointment.id ? { ...a, status: 'completed' as const } : a
            )
        }));
    };

    // 대화하기 (1회만 가능)
    const handleTalk = () => {
        if (hasTalked) {
            setActionFeedback("이번 만남에서의 대화를 이미 마쳤습니다.");
            return;
        }

        // 시간대별 테마에 맞춘 로맨틱 대사 분기
        let phrases = [
            `"오늘 날씨가 정말 좋네요. 약속 장소에서 이렇게 뵈니 무척 반갑습니다."`,
            `"최근 수련은 어떻게 되어가시나요? 항상 당신의 행보를 관심 있게 지켜보고 있었습니다."`,
            `"이 도시의 거주구역은 조용해서 생각을 정리하기에 참 좋은 곳이지요."`,
            `"함께 이야기를 나누다 보면 시간 가는 줄을 모르겠습니다. 정말 즐거운 시간이네요."`
        ];

        const theme = appointment.themeName || '인연 만남';
        if (theme === '점심 식사 약속') {
            phrases = [
                `"마침 출출하던 참이었는데, 이렇게 맛있는 식사를 함께 나누어 무척 행복합니다."`,
                `"이 가게의 점심 메뉴가 아주 일품이네요. 다음에도 꼭 같이 오고 싶습니다."`,
                `"식사를 하며 마주 보고 이야기를 나누니, 서로의 거리가 한층 더 가깝게 느껴져요."`,
                `"맛있는 음식과 좋은 사람... 오늘 점심은 평생 잊지 못할 즐거운 추억이 될 것 같군요."`
            ];
        } else if (theme === '노을 산책') {
            phrases = [
                `"하늘을 붉게 물들이는 저 노을이 무척이나 아름답네요. 하지만 곁에 있는 당신이 더 아름답습니다."`,
                `"노을 지는 정원을 당신과 발맞추어 나란히 걷는 이 순간이 정말 평화롭고 소중해요."`,
                `"해질녘의 시원한 바람이 불어오니 기분이 한결 상쾌하네요. 함께 걸어주어 고마워요."`,
                `"저무는 노을을 바라보고 있으니 시간이 멈췄으면 좋겠다는 부질없는 생각마저 드는군요."`
            ];
        } else if (theme === '저녁 데이트') {
            phrases = [
                `"밤 하늘에 뜬 은은한 달빛이 우리 두 사람을 아늑하게 보듬어 주는 듯한 기분이 드네요."`,
                `"저녁의 차분한 밤공기 속에서 당신의 깊고 따뜻한 눈빛을 마주하니 가슴이 두근거립니다."`,
                `"오늘 이 조용하고 차분한 밤거리를 함께 거닐 수 있어서 정말 행복한 저녁입니다."`,
                `"하루 일과를 마치고 밤하늘 아래 당신과 단둘이 나누는 대화는 저에게 가장 큰 치유가 됩니다."`
            ];
        } else if (theme === '낮 대련') {
            phrases = [
                `"한낮의 뜨거운 태양 아래에서 겨루는 대련이라니, 가슴이 뜨겁게 타오르는군요! 제대로 겨뤄봅시다!"`,
                `"이 한낮의 맹렬한 대화 속에서 서로의 무도와 결의를 나눌 수 있어 정말 기쁩니다."`
            ];
        } else if (theme === '해질녘 대련') {
            phrases = [
                `"타오르는 노을빛 속에서 마주 선 우리의 그림자가 아주 길게 뻗어있군요. 일격에 결판을 냅시다!"`,
                `"해질녘의 붉은 광채 아래 서로 맞부딪치는 병장기 소리가 아주 웅장하게 고동치는군요."`
            ];
        } else if (theme === '밤의 혈투') {
            phrases = [
                `"칠흑 같은 밤하늘과 고요한 어둠 속에서 겨루는 대련... 오직 서로의 검로와 숨소리에만 집중하게 되는군요."`,
                `"깊은 밤 어둠 속에 섬광처럼 빛나는 서로의 무기를 보며, 진정한 전우로서의 호흡을 느낍니다."`
            ];
        }

        const randomPhrase = phrases[Math.floor(Math.random() * phrases.length)];
        const baseAffectionGain = Math.floor(Math.random() * 4) + 3; // +3 ~ +6
        const locationBonus = appointment.affectionBonus || 0;
        // 시간대 준수 및 테마 보너스 가중치 1.5배!
        const totalAffectionGain = Math.floor((baseAffectionGain + locationBonus) * 1.5);

        onUpdateCharacter(prev => {
            let matched = false;
            const updateNpc = (npcList: any[]) => npcList.map(n => {
                if (n.id === targetNpc.id) {
                    matched = true;
                    return { ...n, affection: Math.min(100, Math.max(-100, (n.affection || 0) + totalAffectionGain)) };
                }
                return n;
            });

            const newSocial = prev.socialNetwork ? updateNpc(prev.socialNetwork) : [];
            const newComps = prev.companions ? updateNpc(prev.companions) : [];
            const newInactive = prev.inactiveCompanions ? updateNpc(prev.inactiveCompanions) : [];
            const newClassmates = prev.schoolData?.classmates ? updateNpc(prev.schoolData.classmates) : undefined;
            const newClub = prev.clubData?.clubMembers ? updateNpc(prev.clubData.clubMembers) : undefined;

            if (!matched) {
                const newEntry = {
                    ...targetNpc,
                    affection: Math.min(100, Math.max(-100, ((targetNpc as any).affection || 10) + totalAffectionGain))
                };
                const existingIdx = (prev.socialNetwork || []).findIndex(n => n.id === targetNpc.id);
                if (existingIdx !== -1) {
                    newSocial[existingIdx] = { ...newSocial[existingIdx], affection: Math.min(100, Math.max(-100, (newSocial[existingIdx].affection || 0) + totalAffectionGain)) };
                } else {
                    newSocial.push(newEntry);
                }
            }

            return {
                ...prev,
                socialNetwork: newSocial,
                companions: newComps,
                inactiveCompanions: newInactive,
                schoolData: prev.schoolData ? { ...prev.schoolData, classmates: newClassmates || prev.schoolData.classmates } : prev.schoolData,
                clubData: prev.clubData ? { ...prev.clubData, clubMembers: newClub || prev.clubData.clubMembers } : prev.clubData,
            };
        });

        setHasTalked(true);
        setDialogueLog(prev => [`[${targetNpc.name}] ${randomPhrase}`, ...prev]);
        const bonusMsg = ` (시간 준수 및 테마 보너스 +${totalAffectionGain} 반영!)`;
        setActionFeedback(`대화를 나누어 호감도가 상승했습니다.${bonusMsg}`);
    };

    // 선물하기 (1회만 가능)
    const handleGiveGift = (goldAmount: number, affectionGain: number) => {
        if (hasGifted) {
            setActionFeedback("이번 만남에서의 선물을 이미 전달했습니다.");
            return;
        }

        if (character.money < goldAmount) {
            setActionFeedback("소지금이 부족합니다.");
            return;
        }

        onUpdateCharacter(prev => {
            let matched = false;
            const updateNpc = (npcList: any[]) => npcList.map(n => {
                if (n.id === targetNpc.id) {
                    matched = true;
                    return { ...n, affection: Math.min(100, Math.max(-100, (n.affection || 0) + affectionGain)) };
                }
                return n;
            });

            const newSocial = prev.socialNetwork ? updateNpc(prev.socialNetwork) : [];
            const newComps = prev.companions ? updateNpc(prev.companions) : [];
            const newInactive = prev.inactiveCompanions ? updateNpc(prev.inactiveCompanions) : [];
            const newClassmates = prev.schoolData?.classmates ? updateNpc(prev.schoolData.classmates) : undefined;
            const newClub = prev.clubData?.clubMembers ? updateNpc(prev.clubData.clubMembers) : undefined;

            if (!matched) {
                const newEntry = {
                    ...targetNpc,
                    affection: Math.min(100, Math.max(-100, ((targetNpc as any).affection || 10) + affectionGain))
                };
                const existingIdx = (prev.socialNetwork || []).findIndex(n => n.id === targetNpc.id);
                if (existingIdx !== -1) {
                    newSocial[existingIdx] = { ...newSocial[existingIdx], affection: Math.min(100, Math.max(-100, (newSocial[existingIdx].affection || 0) + affectionGain)) };
                } else {
                    newSocial.push(newEntry);
                }
            }

            return {
                ...prev,
                money: Math.max(0, prev.money - goldAmount),
                socialNetwork: newSocial,
                companions: newComps,
                inactiveCompanions: newInactive,
                schoolData: prev.schoolData ? { ...prev.schoolData, classmates: newClassmates || prev.schoolData.classmates } : prev.schoolData,
                clubData: prev.clubData ? { ...prev.clubData, clubMembers: newClub || prev.clubData.clubMembers } : prev.clubData,
            };
        });

        setHasGifted(true);
        setActiveTab('main');
        setDialogueLog(prev => [
            `[${targetNpc.name}] "이런 귀한 선물을 주시다니... 정말 감사합니다! 소중히 간직할게요."`,
            ...prev
        ]);
        setActionFeedback(`${goldAmount.toLocaleString()}골드 상당의 선물을 전달하여 호감도가 ${affectionGain} 대폭 상승했습니다! (선물 완료)`);
    };

    // 결투 시작
    const handleStartDuel = () => {
        if (!onBattle) return;

        completeAppointment();

        // 방안 1, 2, 4 스케일링 엔진 적용
        const enemy = scaleNpcEnemyStats(targetNpc as any, false, '[대련 상대]');
        enemy.description = `${targetNpc.name}와의 약속된 진검 대련 결투입니다. 거주구역의 열기 속에서 승리를 쟁취하세요!`;

        onClose();
        onBattle(enemy, 'relation_battle', targetNpc.id);
    };

    // 동료 영입 제안
    const handleRecruitCompanion = () => {
        if (affection < 80) {
            setActionFeedback("호감도가 80 이상이어야 동료 영입을 제안할 수 있습니다.");
            return;
        }

        const newComp: Companion = {
            id: targetNpc.id,
            name: targetNpc.name,
            level: (targetNpc as any).level || 1,
            age: (targetNpc as any).age || '20',
            gender: (targetNpc as any).gender || '미상',
            race: (targetNpc as any).race || '인간',
            appearance: (targetNpc as any).appearance || targetNpc.name,
            classType: (targetNpc as any).classType || '전사',
            firstClassName: (targetNpc as any).firstClassName || '초심자',
            firstClassDescription: '만남을 통해 합류한 동료',
            classTier: (targetNpc as any).classTier || ClassTier.NONE,
            currentExp: 0,
            maxExp: 100,
            statPoints: 0,
            job: (targetNpc as any).job,
            affection: affection,
            loyalty: 50,
            personality: (targetNpc as any).personality || '온화함',
            stats: (targetNpc as any).stats || { hp: 100, maxHp: 100, mp: 50, maxMp: 50, str: 10, int: 10, wis: 10, def: 10, agi: 10, ctrl: 10 },
            skills: (targetNpc as any).skills || [],
            equipment: (targetNpc as any).equipment || {},
            visualUrl: targetNpc.visualUrl
        };

        onUpdateCharacter(prev => ({
            ...prev,
            companions: [...(prev.companions || []), newComp]
        }));

        setActionFeedback(`${targetNpc.name}님이 흔쾌히 동료 제안을 수락하여 파티에 합류했습니다!`);
        setDialogueLog(prev => [
            `[${targetNpc.name}] "당신과 함께라면 어디든 든든합니다. 앞으로 잘 부탁드립니다!"`,
            ...prev
        ]);
    };

    const handleMissedAppointment = () => {
        onUpdateCharacter(prev => {
            let matched = false;
            const updateNpc = (npcList: any[]) => npcList.map(n => {
                if (n.id === targetNpc.id) {
                    matched = true;
                    return { ...n, affection: Math.max(-100, (n.affection || 0) - 5) };
                }
                return n;
            });

            const newSocial = prev.socialNetwork ? updateNpc(prev.socialNetwork) : [];
            const newComps = prev.companions ? updateNpc(prev.companions) : [];
            const newInactive = prev.inactiveCompanions ? updateNpc(prev.inactiveCompanions) : [];

            if (!matched) {
                const newEntry = {
                    ...targetNpc,
                    affection: Math.max(-100, ((targetNpc as any).affection || 10) - 5)
                };
                const existingIdx = (prev.socialNetwork || []).findIndex(n => n.id === targetNpc.id);
                if (existingIdx !== -1) {
                    newSocial[existingIdx] = { ...newSocial[existingIdx], affection: Math.max(-100, (newSocial[existingIdx].affection || 0) - 5) };
                } else {
                    newSocial.push(newEntry);
                }
            }

            return {
                ...prev,
                socialNetwork: newSocial,
                companions: newComps,
                inactiveCompanions: newInactive,
                socialAppointments: (prev.socialAppointments || []).map(a => 
                    a.id === appointment.id ? { ...a, status: 'missed' as const } : a
                )
            };
        });
        onClose();
    };

    const handleTooEarlyLeave = () => {
        onClose();
    };

    const handleLeave = () => {
        completeAppointment();
        onClose();
    };

    if (isTooLate) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                <div className="bg-slate-900 border border-red-500/50 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden flex flex-col p-6 text-center space-y-4">
                    <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto text-red-400">
                        <AlertCircle size={32} />
                    </div>
                    <div>
                        <h3 className="text-lg font-black text-white mb-2">약속 시간 초과 (지각)</h3>
                        <p className="text-sm text-slate-300 leading-relaxed">
                            약속 시각(<span className="text-red-400 font-bold">{apptTimeStr}</span>)으로부터 1시간 이상 경과하여 약속이 자동 취소되었습니다.<br />
                            상대방은 기다리다 지쳐 돌아갔습니다. (현재 시각: <span className="text-slate-400">{currentTimeStr}</span>)
                        </p>
                        <p className="text-xs text-red-400 mt-2 font-medium">
                            ※ 시간 약속 미준수로 인해 {targetNpc.name}님의 호감도가 5 하락합니다.
                        </p>
                    </div>
                    <button
                        onClick={handleMissedAppointment}
                        className="w-full py-3 rounded-2xl bg-red-600 hover:bg-red-500 text-white font-black text-sm transition-all active:scale-98 cursor-pointer shadow-lg"
                    >
                        확인 (약속 취소)
                    </button>
                </div>
            </div>
        );
    }

    if (isTooEarly) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                <div className="bg-slate-900 border border-amber-500/50 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden flex flex-col p-6 text-center space-y-4">
                    <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400">
                        <Clock size={32} />
                    </div>
                    <div>
                        <h3 className="text-lg font-black text-white mb-2">아직 너무 이른 시간입니다</h3>
                        <p className="text-sm text-slate-300 leading-relaxed">
                            {targetNpc.name}님과의 약속 시각은 <span className="text-amber-400 font-bold">{apptTimeStr}</span>입니다.<br />
                            약속 시각의 1시간 전부터만 만남을 시작할 수 있습니다. (현재 시각: <span className="text-slate-400">{currentTimeStr}</span>)
                        </p>
                        <p className="text-xs text-amber-300 mt-2 font-medium">
                            약속 시간에 맞춰 다시 장소를 방문해주세요!
                        </p>
                    </div>
                    <button
                        onClick={handleTooEarlyLeave}
                        className="w-full py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-black text-sm transition-all active:scale-98 cursor-pointer border border-slate-700"
                    >
                        돌아가기
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-slate-900 border border-slate-700 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
                {/* 헤더 */}
                <div className="p-4 sm:p-5 border-b border-slate-800 flex justify-between items-center bg-slate-950/80">
                    <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400">
                            {appointment.type === 'duel' ? <Swords size={20} /> : <Coffee size={20} />}
                        </div>
                        <div>
                            <h3 className="text-base sm:text-lg font-black text-white">
                                {appointment.type === 'duel' ? '결투 약속의 현장' : '약속된 인연과의 만남'}
                            </h3>
                            <p className="text-[11px] text-slate-400">
                                {appointment.location.nation} {appointment.location.city} 거주구역
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* 프로필 요약 카드 */}
                <div className="p-4 sm:p-5 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950/40 border-b border-slate-800 flex items-center gap-4">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden border-2 border-indigo-500/50 bg-slate-950 flex-shrink-0 flex items-center justify-center text-3xl shadow-lg">
                        {targetNpc.visualUrl ? (
                            <img src={targetNpc.visualUrl} alt={targetNpc.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                            '👤'
                        )}
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                            <h4 className="text-lg font-black text-white truncate">{targetNpc.name}</h4>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-950 border border-indigo-700 text-indigo-300">
                                레벨 {(targetNpc as any).level || 10}
                            </span>
                        </div>
                        <p className="text-xs text-indigo-300 mb-2 font-medium">
                            {(targetNpc as any).job || (targetNpc as any).classType || '인연'} · 성격: {(targetNpc as any).personality || '온화함'}
                        </p>
                        <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1.5 bg-pink-950/40 border border-pink-800/50 px-2.5 py-1 rounded-xl text-xs text-pink-300 font-bold">
                                <Heart size={13} className="fill-current text-pink-400" />
                                <span>호감도 {affection}</span>
                            </div>
                            <span className="text-[11px] text-slate-400">
                                약속: {appointment.type === 'duel' ? '결투 대련' : '차와 담소'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* 피드백 알림 */}
                {actionFeedback && (
                    <div className="mx-4 mt-3 p-3 bg-indigo-950/70 border border-indigo-500/50 rounded-2xl text-xs text-indigo-200 flex items-center gap-2 animate-in fade-in">
                        <Sparkles size={14} className="text-amber-400 flex-shrink-0" />
                        <span className="font-medium">{actionFeedback}</span>
                    </div>
                )}

                {/* 본문 스크롤 영역 */}
                <div className="p-4 sm:p-5 overflow-y-auto custom-scrollbar flex-1 space-y-4">
                    {/* 대화 로그 */}
                    {dialogueLog.length > 0 && (
                        <div className="bg-slate-950/80 border border-slate-800 p-3.5 rounded-2xl space-y-2 max-h-36 overflow-y-auto custom-scrollbar">
                            {dialogueLog.map((log, idx) => (
                                <p key={idx} className="text-xs text-slate-200 leading-relaxed font-serif">
                                    {log}
                                </p>
                            ))}
                        </div>
                    )}

                    {/* 상호작용 버튼 그리드 */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {/* 1. 대화하기 (1회 한정) */}
                        <button
                            onClick={handleTalk}
                            disabled={hasTalked}
                            className={`p-3.5 rounded-2xl border text-left transition-all flex items-center gap-3 active:scale-98 ${
                                hasTalked
                                    ? 'bg-slate-950/40 border-slate-800/50 opacity-50 cursor-not-allowed text-slate-500'
                                    : 'bg-slate-950/60 hover:bg-slate-800/80 border-slate-800 hover:border-indigo-500/50 text-white'
                            }`}
                        >
                            <div className={`p-2.5 rounded-xl ${hasTalked ? 'bg-slate-900 text-slate-600' : 'bg-indigo-500/10 text-indigo-400'}`}>
                                <MessageSquare size={18} />
                            </div>
                            <div>
                                <div className="flex items-center gap-1.5">
                                    <h5 className="text-xs sm:text-sm font-black text-white">대화 나누기</h5>
                                    {hasTalked && <span className="text-[10px] text-indigo-400 font-bold">(완료)</span>}
                                </div>
                                <p className="text-[10px] sm:text-[11px] text-slate-400">
                                    {hasTalked ? '오늘의 대화를 마쳤습니다' : '담소를 나누며 호감도 상승 (1회)'}
                                </p>
                            </div>
                        </button>

                        {/* 2. 선물하기 토글/실행 (1회 한정) */}
                        <button
                            onClick={() => {
                                if (hasGifted) {
                                    setActionFeedback("오늘의 선물을 이미 전달했습니다.");
                                    return;
                                }
                                setActiveTab(activeTab === 'gift' ? 'main' : 'gift');
                            }}
                            disabled={hasGifted}
                            className={`p-3.5 rounded-2xl border text-left transition-all flex items-center gap-3 active:scale-98 ${
                                hasGifted
                                    ? 'bg-slate-950/40 border-slate-800/50 opacity-50 cursor-not-allowed text-slate-500'
                                    : activeTab === 'gift'
                                    ? 'bg-pink-950/40 border-pink-500 text-white'
                                    : 'bg-slate-950/60 hover:bg-slate-800/80 border-slate-800 hover:border-pink-500/50 text-white'
                            }`}
                        >
                            <div className={`p-2.5 rounded-xl ${hasGifted ? 'bg-slate-900 text-slate-600' : 'bg-pink-500/10 text-pink-400'}`}>
                                <Gift size={18} />
                            </div>
                            <div>
                                <div className="flex items-center gap-1.5">
                                    <h5 className="text-xs sm:text-sm font-black text-white">선물 전달하기</h5>
                                    {hasGifted && <span className="text-[10px] text-pink-400 font-bold">(완료)</span>}
                                </div>
                                <p className="text-[10px] sm:text-[11px] text-slate-400">
                                    {hasGifted ? '오늘의 선물을 전달했습니다' : '골드를 선물하여 호감도 상승 (1회)'}
                                </p>
                            </div>
                        </button>

                        {/* 3. 결투 신청 / 시작 */}
                        {onBattle && (
                            <button
                                onClick={handleStartDuel}
                                className="p-3.5 rounded-2xl bg-rose-950/30 hover:bg-rose-900/40 border border-rose-500/40 hover:border-rose-400 text-left transition-all flex items-center gap-3 active:scale-98 shadow-lg shadow-rose-950/30"
                            >
                                <div className="p-2.5 rounded-xl bg-rose-500/20 text-rose-300">
                                    <Swords size={18} />
                                </div>
                                <div>
                                    <h5 className="text-xs sm:text-sm font-black text-rose-200">
                                        {appointment.type === 'duel' ? '결투 개시 (약속된 대련)' : '현장 결투 신청'}
                                    </h5>
                                    <p className="text-[10px] sm:text-[11px] text-rose-300/80">1대1 진검승부 시작</p>
                                </div>
                            </button>
                        )}

                        {/* 4. 동료 영입 제안 */}
                        {!isAlreadyCompanion && (
                            <button
                                onClick={handleRecruitCompanion}
                                className={`p-3.5 rounded-2xl border text-left transition-all flex items-center gap-3 active:scale-98 ${
                                    affection >= 80
                                        ? 'bg-emerald-950/40 hover:bg-emerald-900/50 border-emerald-500/50 text-emerald-200'
                                        : 'bg-slate-950/30 border-slate-800/50 opacity-60 text-slate-500 cursor-not-allowed'
                                }`}
                            >
                                <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400">
                                    <UserPlus size={18} />
                                </div>
                                <div>
                                    <h5 className="text-xs sm:text-sm font-black">동료 영입 제안</h5>
                                    <p className="text-[10px] sm:text-[11px]">
                                        {affection >= 80 ? '호감도 충족 (영입 가능)' : '호감도 80 필요'}
                                    </p>
                                </div>
                            </button>
                        )}
                    </div>

                    {/* 선물하기 서브 패널 (5만 골드 +15, 20만 골드 +40, 100만 골드 +100) */}
                    {activeTab === 'gift' && !hasGifted && (
                        <div className="bg-slate-950 border border-pink-900/40 p-3.5 sm:p-4 rounded-2xl space-y-2.5 animate-in fade-in duration-150">
                            <div className="flex justify-between items-center">
                                <h5 className="text-xs font-bold text-pink-300">선물할 골드 선택 (1회 한정)</h5>
                                <span className="text-[11px] text-slate-400">보유: <strong className="text-amber-300">{character.money.toLocaleString()}골드</strong></span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                <button
                                    onClick={() => handleGiveGift(50000, 15)}
                                    disabled={character.money < 50000}
                                    className="py-3 px-2 rounded-xl bg-slate-900 hover:bg-pink-950/60 border border-slate-800 hover:border-pink-500/50 text-xs font-bold text-slate-200 disabled:opacity-40 transition-all text-center active:scale-98"
                                >
                                    <p className="text-amber-400 font-black">50,000골드</p>
                                    <p className="text-[11px] text-pink-400 mt-0.5">+15 호감도</p>
                                </button>
                                <button
                                    onClick={() => handleGiveGift(200000, 40)}
                                    disabled={character.money < 200000}
                                    className="py-3 px-2 rounded-xl bg-slate-900 hover:bg-pink-950/60 border border-slate-800 hover:border-pink-500/50 text-xs font-bold text-slate-200 disabled:opacity-40 transition-all text-center active:scale-98"
                                >
                                    <p className="text-amber-400 font-black">200,000골드</p>
                                    <p className="text-[11px] text-pink-400 mt-0.5">+40 호감도</p>
                                </button>
                                <button
                                    onClick={() => handleGiveGift(1000000, 100)}
                                    disabled={character.money < 1000000}
                                    className="py-3 px-2 rounded-xl bg-slate-900 hover:bg-pink-950/60 border border-slate-800 hover:border-pink-500/50 text-xs font-bold text-slate-200 disabled:opacity-40 transition-all text-center active:scale-98"
                                >
                                    <p className="text-amber-400 font-black">1,000,000골드</p>
                                    <p className="text-[11px] text-pink-400 mt-0.5">+100 호감도</p>
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* 푸터 (약속 마무리 / 작별) */}
                <div className="p-4 border-t border-slate-800 bg-slate-950 flex gap-2">
                    <button
                        onClick={handleLeave}
                        className="w-full py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs sm:text-sm transition-all flex items-center justify-center gap-2 active:scale-98 shadow-lg shadow-indigo-950"
                    >
                        <CheckCircle2 size={16} /> 약속 마무리 및 작별하기
                    </button>
                </div>
            </div>
        </div>
    );
};
