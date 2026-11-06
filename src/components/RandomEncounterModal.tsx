import React, { useState } from 'react';
import { Character, Companion, Enemy, SimpleStudent } from '../types';
import { X, Heart, MessageCircle, Coffee, UserPlus, Sparkles, MapPin, CheckCircle2, Swords } from 'lucide-react';
import { generateIntroducedFriend } from '../services/randomEncounterService';
import { generateEnemyStats } from '../utils';

interface Props {
    character: Character;
    npc: Companion;
    onClose: () => void;
    onUpdateCharacter: (newChar: Character, logMsg: string) => void;
    onBattle?: (enemy: Enemy | Enemy[], type: string, source: string) => void;
}

const RandomEncounterModal: React.FC<Props> = ({
    character,
    npc,
    onClose,
    onUpdateCharacter,
    onBattle
}) => {
    const currentAffection = npc.affection || 0;
    const isBadRelation = currentAffection < 0 || (npc as any).isRival;

    const [logText, setLogText] = useState<string>(
        isBadRelation
            ? `거주지구 근처를 거닐던 중, 오랫동안 앙금이 남은 ${npc.name}님과 마주쳤습니다. 차가운 공기가 흐르며 서로 기싸움을 벌입니다.`
            : `거주지구 근처를 거닐던 중, 우연히 길가에서 ${npc.name}님을 발견했습니다! 반가운 마음에 서로를 알아보고 가볍게 인사를 나눕니다.`
    );
    const [talkedToday, setTalkedToday] = useState<boolean>(false);
    const [treatedToday, setTreatedToday] = useState<boolean>(false);
    const [askedIntroToday, setAskedIntroToday] = useState<boolean>(false);
    const [resultMessage, setResultMessage] = useState<string | null>(null);

    const currentLocation = character.currentLocation || { region: '아시아', nation: '대한민국', city: '서울' };

    // 1. 일상 대화 나누기
    const handleTalk = () => {
        if (talkedToday) {
            setResultMessage('오늘 이미 안부 대화를 나누었습니다.');
            return;
        }

        const newAffection = currentAffection + 3;
        const updatedNpc = { ...npc, affection: newAffection };

        let newChar = updateNpcInCharacter(character, updatedNpc);

        setTalkedToday(true);
        const dialogues = isBadRelation
            ? [
                `"${character.name}님... 아직 저에게 할 말이 남았나요? 그다지 좋은 감정은 아니군요."`,
                `"굳이 어색하게 아는 척하지 않아도 됩니다. 앙금이 가시려면 시간이 걸릴 것 같네요."`
            ]
            : [
                `"${character.name}님! 여기서 이렇게 우연히 만나다니 정말 반갑네요. 요즘 어떻게 지내셨나요?"`,
                `"${character.name}님도 이 도시에 계셨군요! 따뜻한 온기가 느껴지는 반가운 만남입니다."`,
                `"오랜만에 나누는 이야기라 그런지 시간이 가는 줄 모르겠네요. 호감도가 상승했습니다!"`
            ];
        const selectedDiag = dialogues[Math.floor(Math.random() * dialogues.length)];

        setLogText(selectedDiag);
        setResultMessage(`호감도 +3 상승 (현재: ${newAffection})`);
        onUpdateCharacter(newChar, `[우연한 만남] ${npc.name}님과 근황 대화를 나누었습니다.`);
    };

    // 2. 다과 및 차 대접하기 (10000G)
    const handleTreatCoffee = () => {
        if (treatedToday) {
            setResultMessage('오늘 이미 다과를 대접하며 시간을 보냈습니다.');
            return;
        }

        const currentMoney = character.money || 0;
        if (currentMoney < 10000) {
            setResultMessage('골드가 부족합니다. (필요: 10000골드)');
            return;
        }

        const newMoney = currentMoney - 10000;
        const newAffection = currentAffection + 8;
        const updatedNpc = { ...npc, affection: newAffection };

        let newChar = updateNpcInCharacter({ ...character, money: newMoney }, updatedNpc);

        setTreatedToday(true);
        setLogText(
            isBadRelation
                ? `정성껏 준비한 고급 다과를 권하자, ${npc.name}님이 경계를 조금 누르고 차를 마십니다. 마음의 벽이 약간 완화되었습니다.`
                : `근처 조용한 찻집에서 ${npc.name}님에게 고급 다과를 대접했습니다. 깊은 대화를 나누며 서로 간의 유대감이 더욱 두터워졌습니다.`
        );
        setResultMessage(`10000골드 소모 | 호감도 +8 상승 (현재: ${newAffection})`);
        onUpdateCharacter(newChar, `[우연한 만남] ${npc.name}님에게 다과를 대접하며 정을 쌓았습니다.`);
    };

    // 3. 다른 인연 소개 받기 (10% 확률)
    const handleAskIntroduction = () => {
        if (askedIntroToday) {
            setResultMessage('오늘 이미 인연 소개 요청을 드렸습니다.');
            return;
        }

        setAskedIntroToday(true);

        const isSuccess = Math.random() < 0.10;

        if (isSuccess) {
            const newFriend = generateIntroducedFriend(npc, currentLocation);
            let newChar = { ...character };

            if (!newChar.schoolData) {
                newChar.schoolData = {
                    tier: '초급',
                    schoolName: '사회적 인연 네트워크',
                    grade: 1,
                    classNumber: 1,
                    semester: 1,
                    midtermPassed: false,
                    finalPassed: false,
                    isGraduated: false,
                    rank: 1,
                    reputation: 0,
                    classmates: []
                };
            }
            if (!newChar.schoolData.classmates) {
                newChar.schoolData.classmates = [];
            }

            const studentFriend: SimpleStudent = {
                id: newFriend.id,
                name: newFriend.name,
                age: newFriend.age,
                gender: newFriend.gender,
                race: newFriend.race,
                nation: newFriend.nation || currentLocation.nation || '대한민국',
                level: newFriend.level,
                personality: newFriend.personality || '친근함',
                appearance: newFriend.appearance || '상냥한 인상',
                stats: newFriend.stats,
                affection: newFriend.affection,
                shinryokuType: newFriend.shinryokuType,
                classType: newFriend.classType,
                isPastConnection: true
            };

            newChar.schoolData.classmates = [...newChar.schoolData.classmates, studentFriend];

            setLogText(
                `"${character.name}님, 사실 얼마 전 알게 된 믿음직한 지인이 한 분 생각나네요! 꼭 소개해 드리고 싶어요."\n\n` +
                `${npc.name}님의 소개로 새로운 인연 [${newFriend.name}]님(${newFriend.job})을 알게 되었습니다! 인연 관계망에 등록되었습니다.`
            );
            setResultMessage(`새로운 인연 [${newFriend.name}]님과 인맥 형성 완료!`);
            onUpdateCharacter(newChar, `[인연 소개] ${npc.name}님의 소개로 새로운 지인 ${newFriend.name}님을 소개받았습니다.`);
        } else {
            setLogText(
                `"${character.name}님에게 소개해 드릴 만한 적절한 지인을 떠올려 보았으나, 아쉽게도 지금 당장은 떠오르는 인물이 없는 모양입니다."`
            );
            setResultMessage('이번에는 마땅한 인연을 발견하지 못했습니다.');
        }
    };

    // 4. 결투 진행 (사이가 안 좋은 인연일 때 가능)
    const handleDuel = () => {
        if (!onBattle) return;

        const enemyLevel = npc.level || character.level || 1;
        const enemyStats = generateEnemyStats(enemyLevel, 'normal');

        const duelEnemy: Enemy = {
            id: `duel_${npc.id}_${Date.now()}`,
            name: npc.name,
            level: enemyLevel,
            hp: npc.stats?.hp || enemyStats.hp || 200,
            maxHp: npc.stats?.maxHp || enemyStats.maxHp || 200,
            stats: {
                hp: npc.stats?.hp || enemyStats.hp || 200,
                maxHp: npc.stats?.maxHp || enemyStats.maxHp || 200,
                mp: npc.stats?.mp || enemyStats.mp || 100,
                maxMp: npc.stats?.maxMp || enemyStats.maxMp || 100,
                str: npc.stats?.str || enemyStats.str || 15,
                int: npc.stats?.int || enemyStats.int || 15,
                wis: npc.stats?.wis || enemyStats.wis || 15,
                def: npc.stats?.def || enemyStats.def || 15,
                agi: npc.stats?.agi || enemyStats.agi || 15,
                ctrl: npc.stats?.ctrl || enemyStats.ctrl || 15,
            },
            statusEffects: [],
            description: `${character.name}님과의 불화로 인해 시작된 결투 상대`,
            shinryokuType: npc.shinryokuType,
            skills: npc.skills || [],
            job: npc.job || '숙적',
            gender: npc.gender,
            isBoss: false
        };

        onClose();
        onBattle(duelEnemy, 'Duel', `[결투] ${npc.name}과의 결투`);
    };

    // NPC 정보 업데이트 헬퍼
    const updateNpcInCharacter = (char: Character, updated: Companion): Character => {
        let newChar = { ...char };

        if (newChar.inactiveCompanions) {
            newChar.inactiveCompanions = newChar.inactiveCompanions.map(c => c.id === updated.id ? updated : c);
        }

        if (newChar.schoolData?.classmates) {
            newChar.schoolData.classmates = newChar.schoolData.classmates.map(s => s.id === updated.id ? { ...s, affection: updated.affection } : s);
        }

        if (newChar.clubData?.clubMembers) {
            newChar.clubData.clubMembers = newChar.clubData.clubMembers.map(m => m.id === updated.id ? { ...m, affection: updated.affection } : m);
        }

        return newChar;
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm">
            <div className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in duration-200">
                {/* 헤더 */}
                <div className="p-4 sm:p-5 bg-gradient-to-r from-indigo-950 via-slate-900 to-purple-950 border-b border-slate-800 flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-indigo-500/20 border border-indigo-500/40 rounded-xl text-indigo-400 shrink-0">
                            <Sparkles size={22} />
                        </div>
                        <div>
                            <span className="text-[10px] font-bold text-indigo-400 tracking-wider uppercase">거주지구 우연한 조우</span>
                            <h3 className="text-base sm:text-lg font-black text-white">{npc.name}님과의 만남</h3>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-700 rounded-lg transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* 본문 스크롤 영역 */}
                <div className="p-4 sm:p-6 overflow-y-auto custom-scrollbar space-y-4 sm:space-y-5 flex-1">
                    {/* 프로필 카드 */}
                    <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 sm:p-4 flex items-center gap-4">
                        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full border-2 border-indigo-500 overflow-hidden bg-slate-800 shrink-0 flex items-center justify-center">
                            <span className="text-2xl sm:text-3xl">👤</span>
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <span className="text-xs font-bold text-amber-300 bg-amber-950/60 border border-amber-800 px-2 py-0.5 rounded-md">
                                    {npc.job || '지인'}
                                </span>
                                {isBadRelation && (
                                    <span className="text-xs font-bold text-red-400 bg-red-950/80 border border-red-700 px-2 py-0.5 rounded-md">
                                        사이가 안 좋음
                                    </span>
                                )}
                                <span className="text-xs text-slate-400 flex items-center gap-1">
                                    <MapPin size={12} className="text-indigo-400" />
                                    {currentLocation.city} 거주지구
                                </span>
                            </div>
                            <h4 className="text-base sm:text-lg font-bold text-white truncate">{npc.name}</h4>
                            <div className="flex items-center gap-2 mt-1 text-xs">
                                <span className={`font-bold flex items-center gap-1 ${currentAffection < 0 ? 'text-red-400' : 'text-pink-400'}`}>
                                    <Heart size={12} className="fill-current" /> 호감도: {currentAffection}
                                </span>
                                <span className="text-slate-500">|</span>
                                <span className="text-slate-300">레벨: {npc.level || 1}</span>
                            </div>
                        </div>
                    </div>

                    {/* 대화 및 로그 창 */}
                    <div className="bg-slate-950/90 border border-slate-800/80 rounded-xl p-3.5 sm:p-4 text-xs sm:text-sm text-slate-200 leading-relaxed min-h-[90px] whitespace-pre-line flex flex-col justify-center">
                        {logText}
                    </div>

                    {/* 결과 알림 메시지 */}
                    {resultMessage && (
                        <div className="p-3 bg-indigo-950/50 border border-indigo-700/60 rounded-xl text-xs text-indigo-300 font-bold flex items-center gap-2">
                            <CheckCircle2 size={16} className="text-indigo-400 shrink-0" />
                            <span>{resultMessage}</span>
                        </div>
                    )}

                    {/* 교류 액션 버튼들 */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                        {/* 1. 안부 대화 */}
                        <button
                            onClick={handleTalk}
                            disabled={talkedToday}
                            className={`p-3.5 rounded-xl border text-left transition-all flex items-center gap-3 ${
                                talkedToday 
                                    ? 'bg-slate-900/50 border-slate-800 text-slate-500 cursor-not-allowed'
                                    : 'bg-indigo-950/40 border-indigo-800/80 hover:border-indigo-500 text-indigo-200 hover:bg-indigo-900/50 active:scale-[0.98]'
                            }`}
                        >
                            <div className="p-2 bg-indigo-900/60 rounded-lg text-indigo-400 shrink-0">
                                <MessageCircle size={18} />
                            </div>
                            <div>
                                <div className="font-bold text-xs sm:text-sm">근황 나누기</div>
                                <div className="text-[10px] text-slate-400 mt-0.5">대화를 나누며 호감도 상승</div>
                            </div>
                        </button>

                        {/* 2. 다과 및 차 대접 */}
                        <button
                            onClick={handleTreatCoffee}
                            disabled={treatedToday}
                            className={`p-3.5 rounded-xl border text-left transition-all flex items-center gap-3 ${
                                treatedToday 
                                    ? 'bg-slate-900/50 border-slate-800 text-slate-500 cursor-not-allowed'
                                    : 'bg-purple-950/40 border-purple-800/80 hover:border-purple-500 text-purple-200 hover:bg-purple-900/50 active:scale-[0.98]'
                            }`}
                        >
                            <div className="p-2 bg-purple-900/60 rounded-lg text-purple-400 shrink-0">
                                <Coffee size={18} />
                            </div>
                            <div>
                                <div className="font-bold text-xs sm:text-sm">다과 대접하기</div>
                                <div className="text-[10px] text-slate-400 mt-0.5">10000골드 소모 · 호감도 상승</div>
                            </div>
                        </button>

                        {/* 3. 다른 인연 소개 받기 */}
                        <button
                            onClick={handleAskIntroduction}
                            disabled={askedIntroToday}
                            className={`p-3.5 rounded-xl border text-left transition-all flex items-center gap-3 ${
                                isBadRelation ? 'col-span-1' : 'col-span-1 sm:col-span-2'
                            } ${
                                askedIntroToday 
                                    ? 'bg-slate-900/50 border-slate-800 text-slate-500 cursor-not-allowed'
                                    : 'bg-gradient-to-r from-emerald-950/50 via-slate-900 to-indigo-950/50 border-emerald-800/80 hover:border-emerald-500 text-emerald-200 hover:bg-emerald-900/40 active:scale-[0.98]'
                            }`}
                        >
                            <div className="p-2 bg-emerald-900/60 rounded-lg text-emerald-400 shrink-0">
                                <UserPlus size={18} />
                            </div>
                            <div>
                                <div className="font-bold text-xs sm:text-sm">다른 인연 소개 부탁</div>
                                <div className="text-[10px] text-slate-400 mt-0.5">지인 소개 (10% 확률)</div>
                            </div>
                        </button>

                        {/* 4. 사이가 안 좋은 경우 결투 신청 버튼 */}
                        {isBadRelation && (
                            <button
                                onClick={handleDuel}
                                className="p-3.5 rounded-xl border border-red-700/80 bg-red-950/50 hover:bg-red-900/60 text-red-200 hover:border-red-500 text-left transition-all flex items-center gap-3 col-span-1 active:scale-[0.98]"
                            >
                                <div className="p-2 bg-red-900/60 rounded-lg text-red-400 shrink-0">
                                    <Swords size={18} />
                                </div>
                                <div>
                                    <div className="font-bold text-xs sm:text-sm text-red-300">결투 신청하기</div>
                                    <div className="text-[10px] text-red-400/80 mt-0.5">쌓인 앙금을 털어내기 위해 결투를 시작합니다.</div>
                                </div>
                            </button>
                        )}
                    </div>
                </div>

                {/* 하단 작별 인사 */}
                <div className="p-3 sm:p-4 bg-slate-950 border-t border-slate-800 shrink-0 flex justify-end">
                    <button
                        onClick={onClose}
                        className="w-full sm:w-auto px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-xs sm:text-sm transition-colors"
                    >
                        작별 인사하고 떠나기
                    </button>
                </div>
            </div>
        </div>
    );
};

export default RandomEncounterModal;
