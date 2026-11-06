

import React, { useState, useRef, useEffect } from 'react';
import { Character, Criminal, Companion, JobType, ClassTier } from '../types';
import { X, Skull, UserPlus, ShieldAlert, MessageCircle, Send, Loader2, Coins, TrendingUp, Gavel, AlertTriangle, ShieldCheck, Heart, Flame, Globe, User } from 'lucide-react';
import { chatWithCriminal } from '../services/geminiService';
import ActionResultModal, { ResultData } from './ActionResultModal';
import { SHINRYOKU_UI_CONFIG, MAX_PARTY_SIZE } from '../constants';
import { assignRandomCombatStyle } from '../utils';

interface Props {
    character: Character;
    criminal: Criminal;
    onClose: () => void;
    onUpdateCharacter: (newChar: Character, logMsg: string) => void;
}

type Phase = 'choice' | 'chat' | 'result';

// 퀘스트 및 블랙리스트 데이터 정리 헬퍼 함수
const cleanupCriminalAndQuests = (char: Character, crim: Criminal): Character => {
    let newChar = { ...char };
    const criminalId = crim.id;
    const criminalName = crim.name;

    // 1. 용병 데이터 정리
    if (newChar.mercenaryData) {
        const mData = { ...newChar.mercenaryData };

        // 활성 퀘스트 목록에서 해당 수배범 퀘스트 제거
        if (mData.activeQuests) {
            mData.activeQuests = mData.activeQuests.filter(q => {
                const matchId = q.id === `bounty_${criminalId}` || (q.id && q.id.includes(criminalId));
                const matchTarget = q.targetName && (
                    q.targetName === criminalName || 
                    q.targetName.includes(criminalName) || 
                    criminalName.includes(q.targetName)
                );
                const matchTitle = q.title && (
                    q.title.includes(criminalName) || 
                    q.title.includes(`[WANTED]`) ||
                    q.title.includes(`대역죄인`)
                ) && q.title.includes(criminalName);
                const matchGoal = q.goal && q.goal.includes(criminalName);
                return !(matchId || matchTarget || matchTitle || matchGoal);
            });
        }

        // 블랙리스트 목록에서 제거
        if (mData.blacklist) {
            mData.blacklist = mData.blacklist.filter(c => c.id !== criminalId && c.name !== criminalName);
        }

        // 확인 목록에 추가하여 재등장 방지
        const currentChecked = mData.checkedBlacklistIds || [];
        if (!currentChecked.includes(criminalId)) {
            mData.checkedBlacklistIds = [...currentChecked, criminalId];
        }

        // 추적 중인 수배범 정보 해제
        if (mData.trackedCriminalId === criminalId) {
            mData.trackedCriminalId = undefined;
            mData.trackedCriminalCity = undefined;
        }

        mData.pendingCriminal = undefined;
        newChar.mercenaryData = mData;
    }

    // 2. 군인 임무 목록 정리
    if (newChar.militaryData && newChar.militaryData.activeMissions) {
        newChar.militaryData = {
            ...newChar.militaryData,
            activeMissions: newChar.militaryData.activeMissions.filter(m => {
                const matchId = m.id && m.id.includes(criminalId);
                const matchTarget = m.targetName && (
                    m.targetName === criminalName || 
                    m.targetName.includes(criminalName) || 
                    criminalName.includes(m.targetName)
                );
                const matchTitle = m.title && m.title.includes(criminalName);
                const matchGoal = m.goal && m.goal.includes(criminalName);
                return !(matchId || matchTarget || matchTitle || matchGoal);
            })
        };
    }

    // 3. 퀘스트 추적 목록에서 제거
    if (newChar.trackedQuestIds) {
        newChar.trackedQuestIds = newChar.trackedQuestIds.filter(id => {
            return !id.includes(criminalId) && id !== `bounty_${criminalId}`;
        });
    }

    return newChar;
};

const CriminalResolutionModal: React.FC<Props> = ({ character, criminal, onClose, onUpdateCharacter }) => {
    const [phase, setPhase] = useState<Phase>('choice');
    const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'model', text: string }[]>([]);
    const [chatInput, setChatInput] = useState('');
    const [isChatting, setIsChatting] = useState(false);
    const [resultData, setResultData] = useState<ResultData | null>(null);
    const [affection, setAffection] = useState(0); // 취조를 통해 쌓는 호감도
    const chatEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (phase === 'chat') {
            chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [chatHistory, phase]);

    // 처단 로직 (보상 포함)
    const handleExecute = () => {
        const infamyGain = Math.min(30, Math.max(0, 500 - criminal.infamy));
        let newChar = { ...character };
        
        newChar.infamy = (newChar.infamy || 0) + infamyGain;
        newChar.money += criminal.rewardGold;
        newChar.currentExp += criminal.rewardExp;
        
        if (newChar.mercenaryData) {
            newChar.mercenaryData.reputation += criminal.rewardReputation;
            newChar.mercenaryData.completedQuests += 1;
        }

        newChar = cleanupCriminalAndQuests(newChar, criminal);

        const logMsg = `[현상수배 처단] ${criminal.name}을(를) 즉결 처형했습니다. (악명 +${infamyGain}, 보상 수령)`;
        onUpdateCharacter(newChar, logMsg);

        setResultData({
            type: 'destroy',
            title: '단죄 완료',
            message: `${criminal.name}의 숨통을 끊어 정의를 실현했습니다.\n비록 범죄자였으나, 사적인 처형으로 인해 세간의 시선이 차가워졌습니다.`,
            items: [
                { label: '악명 상승', after: `+${infamyGain}` },
                { label: '현상금 획득', after: `${criminal.rewardGold.toLocaleString()} G` },
                { label: '획득 경험치', after: `${criminal.rewardExp.toLocaleString()} EXP` },
                { label: '명성치 획득', after: `+${criminal.rewardReputation}` }
            ]
        });
    };

    // 국가 인계 로직
    const handleTurnIn = () => {
        let newChar = { ...character };
        newChar.money += criminal.rewardGold;
        newChar.currentExp += criminal.rewardExp;
        
        if (newChar.mercenaryData) {
            newChar.mercenaryData.reputation += criminal.rewardReputation;
            newChar.mercenaryData.completedQuests += 1;
        }

        newChar = cleanupCriminalAndQuests(newChar, criminal);

        const logMsg = `[현상수배 인계] ${criminal.name}을(를) 관아에 인계했습니다. (보상 수령)`;
        onUpdateCharacter(newChar, logMsg);

        setResultData({
            type: 'success',
            title: '인계 성공',
            message: `${criminal.name}을(를) 국가 치안 본부에 넘겼습니다.\n그는 정당한 법의 심판을 받게 될 것입니다.`,
            items: [
                { label: '획득 골드', after: `${criminal.rewardGold.toLocaleString()} G` },
                { label: '획득 경험치', after: `${criminal.rewardExp.toLocaleString()} EXP` },
                { label: '명성치 획득', after: `+${criminal.rewardReputation}` }
            ]
        });
    };

    // 확률 기반 영입 시도
    const handleRecruit = () => {
        if (character.companions.length >= MAX_PARTY_SIZE) {
            alert("파티원이 가득 찼습니다.");
            return;
        }

        // 성공 확률: 기본 10% + 대화 호감도 보정 (최대 50%)
        const successChance = 10 + (affection * 0.5);
        const roll = Math.random() * 100;
        const isSuccess = roll < successChance;

        if (isSuccess) {
            let newChar = { ...character };
            const infamyGain = 50;
            newChar.infamy = (newChar.infamy || 0) + infamyGain;

            const hired: Companion = {
                id: criminal.id,
                name: criminal.name,
                age: "알 수 없음",
                gender: criminal.gender, 
                race: "인간",
                nation: criminal.nation,
                appearance: criminal.description,
                personality: "악랄함",
                classType: criminal.classType,
                job: JobType.MERCENARY,
                level: criminal.level,
                currentExp: 0,
                maxExp: criminal.level * 100,
                statPoints: 0,
                classTier: ClassTier.SECOND,
                shinryokuType: criminal.shinryokuType,
                infamy: criminal.infamy,
                stats: {
                    hp: criminal.level * 100, maxHp: criminal.level * 100,
                    mp: criminal.level * 50, maxMp: criminal.level * 50,
                    str: Math.floor(criminal.level * 5), int: Math.floor(criminal.level * 5),
                    wis: Math.floor(criminal.level * 3), def: Math.floor(criminal.level * 4),
                    agi: Math.floor(criminal.level * 6), ctrl: Math.floor(criminal.level * 4)
                },
                skills: criminal.skills,
                equipment: {},
                inventory: [],
                affection: 0,
                loyalty: 10
            };

            newChar.companions.push(assignRandomCombatStyle(hired, true, true));
            if (newChar.mercenaryData) newChar.mercenaryData.completedQuests += 1;

            newChar = cleanupCriminalAndQuests(newChar, criminal);

            const logMsg = `[현상수배 포섭] ${criminal.name}을(를) 설득하여 동료로 영입했습니다. (악명 +${infamyGain})`;
            onUpdateCharacter(newChar, logMsg);

            setResultData({
                type: 'levelup',
                title: '포섭 성공',
                message: `${criminal.name}이(가) 당신의 카리스마에 굴복하여 충성을 맹세했습니다.\n범죄자를 거두었다는 소문이 퍼지며 악명이 상승했습니다.`,
                items: [
                    { label: '악명 상승', after: `+${infamyGain}` },
                    { label: '관계', after: '동료 (영입)' },
                    { label: '유지된 악명', after: criminal.infamy }
                ]
            });
        } else {
            // 실패 시
            setChatHistory(prev => [...prev, { role: 'model', text: '"흥, 나를 얕보지 마라! 죽였으면 죽였지 네놈 밑으로 들어가진 않겠다!"' }]);
            setAffection(0); // 호감도 초기화
            setResultData({
                type: 'failure',
                title: '포섭 실패',
                message: `${criminal.name}이(가) 당신의 제안을 비웃으며 거절했습니다.\n이제 다른 처분을 선택해야 합니다.`,
                items: [{ label: '성공 확률', after: `${successChance.toFixed(1)}%` }]
            });
        }
    };

    const handleSendMessage = async () => {
        if (!chatInput.trim() || isChatting) return;
        const msg = chatInput;
        setChatInput('');
        setIsChatting(true);

        const reply = await chatWithCriminal(criminal, msg, character, chatHistory);
        setChatHistory(prev => [...prev, { role: 'user', text: msg }, { role: 'model', text: reply }]);
        
        // 대화에 따라 호감도 소폭 상승 (최대 80)
        setAffection(prev => Math.min(80, prev + 5));
        setIsChatting(false);
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/95 backdrop-blur-md p-4 animate-in fade-in">
            {resultData && <ActionResultModal data={resultData} onClose={() => {
                if (resultData.type === 'failure') {
                    setResultData(null); // 실패 시엔 닫지 않고 다시 선택지로
                } else {
                    onClose();
                }
            }} />}

            <div className="bg-slate-900 border-2 border-red-900 w-full max-w-2xl h-[80vh] rounded-3xl shadow-[0_0_100px_rgba(220,38,38,0.2)] flex flex-col overflow-hidden relative">
                
                {/* Header */}
                <div className="p-6 border-b border-red-900/50 bg-red-950/20 flex justify-between items-center shrink-0">
                    <div className="flex items-center">
                        <Skull size={32} className="text-red-500 mr-4 animate-pulse" />
                        <div>
                            <h2 className="text-2xl font-bold text-white font-cinzel">수배범 처분</h2>
                            <p className="text-xs text-red-400 font-bold uppercase tracking-widest">{criminal.name} - 제압됨</p>
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-hidden flex flex-col">
                    {phase === 'choice' && (
                        <div className="flex-1 p-8 flex flex-col items-center justify-center space-y-10 animate-in zoom-in-95">
                            <div className="text-center space-y-2">
                                <div className="flex justify-center items-center gap-3 mb-2">
                                    {/* [FIX] Property 'gender' access corrected via interface update */}
                                    <span className="text-xs bg-slate-800 text-slate-400 px-2 py-0.5 rounded border border-slate-700">{criminal.gender}</span>
                                    <span className="text-xs bg-red-950 text-red-400 px-2 py-0.5 rounded border border-red-900">악명: {criminal.infamy}</span>
                                </div>
                                <h3 className="text-3xl font-black text-white">{criminal.name}</h3>
                                <p className="text-red-500 font-bold">"{criminal.title}"</p>
                                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 mt-4 max-w-sm mx-auto">
                                    <p className="text-sm text-slate-400 italic">"{criminal.description}"</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-lg">
                                <button 
                                    onClick={() => setPhase('chat')}
                                    className="p-8 bg-slate-800 hover:bg-indigo-900/40 border-2 border-slate-700 hover:border-indigo-500 rounded-3xl flex flex-col items-center gap-4 transition-all group"
                                >
                                    <div className="p-4 bg-slate-950 rounded-full group-hover:scale-110 transition-transform"><MessageCircle size={40} className="text-indigo-400"/></div>
                                    <div className="text-center">
                                        <h4 className="text-xl font-bold text-white">생포 및 취조</h4>
                                        <p className="text-xs text-slate-500 mt-1">대화를 통해 정보를 캐거나 영입을 시도합니다.</p>
                                    </div>
                                </button>

                                <button 
                                    onClick={handleExecute}
                                    className="p-8 bg-slate-800 hover:bg-red-900/40 border-2 border-slate-700 hover:border-red-500 rounded-3xl flex flex-col items-center gap-4 transition-all group"
                                >
                                    <div className="p-4 bg-slate-950 rounded-full group-hover:scale-110 transition-transform"><Flame size={40} className="text-red-500"/></div>
                                    <div className="text-center">
                                        <h4 className="text-xl font-bold text-white">즉결 처단</h4>
                                        <p className="text-xs text-slate-500 mt-1">죄인을 처형하고 현상금을 수령합니다. (악명 상승)</p>
                                    </div>
                                </button>
                            </div>
                        </div>
                    )}

                    {phase === 'chat' && (
                        <div className="flex-1 flex flex-col overflow-hidden animate-in slide-in-from-right-4">
                            <div className="p-4 bg-slate-950/50 border-b border-slate-800 flex justify-between items-center shrink-0">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-full bg-red-950 flex items-center justify-center border border-red-900">
                                        <Skull size={14} className="text-red-500"/>
                                    </div>
                                    <span className="text-sm font-bold text-slate-200">{criminal.name} 취조 중</span>
                                    <div className="ml-4 h-1.5 w-24 bg-slate-800 rounded-full overflow-hidden">
                                        <div className="h-full bg-pink-500 transition-all duration-500" style={{ width: `${(affection/80)*100}%` }}></div>
                                    </div>
                                    <span className="text-[10px] text-pink-400 font-bold">감화도</span>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={handleTurnIn} className="px-4 py-1.5 bg-blue-900/40 hover:bg-blue-800 text-blue-300 border border-blue-700 rounded-lg text-xs font-bold transition-all">관아 인계</button>
                                    <button onClick={handleRecruit} className="px-4 py-1.5 bg-amber-900/40 hover:bg-amber-800 text-amber-300 border border-amber-700 rounded-lg text-xs font-bold transition-all">동료 포섭 시도</button>
                                    <button onClick={handleExecute} className="px-4 py-1.5 bg-red-900/40 hover:bg-red-800 text-red-300 border border-red-700 rounded-lg text-xs font-bold transition-all">즉결 처단</button>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar bg-[url('https://www.transparenttextures.com/patterns/stardust.png')]">
                                {chatHistory.length === 0 && (
                                    <div className="h-full flex flex-col items-center justify-center text-slate-600 opacity-50 italic">
                                        <p className="text-sm">죄인은 밧줄에 묶인 채 침묵하고 있습니다.</p>
                                        <p className="text-xs mt-1">말을 걸어 대화를 시작하십시오. 충분히 대화하면 포섭 확률이 올라갑니다.</p>
                                    </div>
                                )}
                                {chatHistory.map((msg, i) => (
                                    <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                                        <div className={`max-w-[85%] p-4 rounded-2xl text-sm shadow-lg ${msg.role === 'user' ? 'bg-indigo-700 text-white rounded-tr-none' : 'bg-slate-800 text-slate-200 border border-slate-700 rounded-tl-none'}`}>
                                            {msg.text}
                                        </div>
                                        <span className="text-[10px] text-slate-500 mt-1 px-1 font-bold uppercase">
                                            {msg.role === 'user' ? character.name : criminal.name}
                                        </span>
                                    </div>
                                ))}
                                <div ref={chatEndRef} />
                            </div>

                            <div className="p-4 bg-slate-950 border-t border-slate-800">
                                <div className="relative max-w-3xl mx-auto flex gap-2">
                                    <input 
                                        type="text" 
                                        value={chatInput}
                                        onChange={(e) => setChatInput(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                                        disabled={isChatting}
                                        className="w-full bg-slate-900 border border-slate-800 rounded-full py-3 px-6 text-sm text-slate-200 focus:outline-none focus:border-red-900 transition-all shadow-inner"
                                        placeholder={isChatting ? "상대의 반응을 기다리는 중..." : "심문하거나 설득하는 말을 건네세요..."}
                                    />
                                    <button 
                                        onClick={handleSendMessage}
                                        disabled={!chatInput.trim() || isChatting}
                                        className="p-3 bg-red-900 hover:bg-red-800 text-white rounded-full disabled:opacity-50 transition-all shadow-lg"
                                    >
                                        {isChatting ? <Loader2 size={18} className="animate-spin"/> : <Send size={18} />}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Guide */}
                <div className="p-4 bg-slate-950 border-t border-slate-800 flex justify-between items-center text-[10px] text-slate-600 font-bold uppercase tracking-widest px-8">
                    <div className="flex gap-4">
                        <span>처단/인계: 현상금 전액 수령</span>
                        <span>영입: 악명 +50 상승 및 현상금 포기</span>
                        {/* [FIX] Property 'gender' access corrected via interface update */}
                        <span>성별: {criminal.gender}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CriminalResolutionModal;
