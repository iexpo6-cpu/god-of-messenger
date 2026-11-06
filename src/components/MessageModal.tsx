
import React, { useState, useRef, useEffect } from 'react';
import { Character, Companion, SimpleStudent, TempleVisitor, JobType, ClassTier, DispatchMission, Stats } from '../types';
import { X, Send, Loader2, UserPlus, Shield, Heart, MapPin, Info, ArrowRight, MessageSquare, PhoneCall, Zap, Home, Clock, Lock, AlertTriangle, Skull, Award, Medal, Users } from 'lucide-react';
import { chatWithStudent, chatWithVisitor, chatWithSocialBond } from '../services/geminiService';
import { addDays, getTierByLevel, generateCompanionStats,getYear, calculateAgeFromYear, assignRandomCombatStyle } from '../utils';
import { MAX_PARTY_SIZE, getHumanoidClassByTier, SHINRYOKU_TYPES_LIST } from '../constants';
import ActionResultModal, { ResultData } from './ActionResultModal';

interface Props {
    character: Character;
    npc: any; 
    onClose: () => void;
    onUpdateCharacter: (newChar: Character, logMsg: string) => void;
}

const MessageModal: React.FC<Props> = ({ character, npc, onClose, onUpdateCharacter }) => {
    const [chatHistory, setChatHistory] = useState<any[]>([]);
    const [chatInput, setChatInput] = useState('');
    const [isChatting, setIsChatting] = useState(false);
    const [resultData, setResultData] = useState<ResultData | null>(null);
    const chatEndRef = useRef<HTMLDivElement>(null);

    const currentMonth = character.currentDate?.substring(0, 7) || '2000-01';

    useEffect(() => {
        // Load initial chat history if available
        const history = npc.chatHistory || npc.templeChatHistory || [];
        setChatHistory(history);
        setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }, [npc]);

    const handleSendMessage = async () => {
        if (!chatInput.trim() || isChatting) return;
        const userMsg = chatInput;
        setChatInput('');
        setIsChatting(true);

        try {
            let reply = "";
            
            // [NEW] NPC 출처에 따른 대화 로직 분기
            if (character.socialNetwork?.some(n => n.id === npc.id)) {
                // 과거 인연과의 대화
                reply = await chatWithSocialBond(npc, userMsg, character);
            } else if (npc.origin === 'Temple') {
                // 성전 방문객과의 대화
                reply = await chatWithVisitor(npc, userMsg, character, character.currentLocation?.city);
            } else {
                // 일반 학생/동료 후보와의 대화
                reply = await chatWithStudent(npc, userMsg, character);
            }

            const cleanReply = reply.replace(/\[(AFF|RES|TEN|SET_DISPOSITION)[+-].+?\]/g, '').trim();
            const newHistory = [...chatHistory, { role: 'user', text: userMsg }, { role: npc.origin === 'Temple' ? 'visitor' : 'model', text: cleanReply }];
            setChatHistory(newHistory);
            

            // Update NPC data in global character state
            const newChar = { ...character };
            updateNpcInState(newChar, npc.id, (target: any) => {
                if (npc.origin === 'Temple') target.templeChatHistory = newHistory;
                else target.chatHistory = newHistory;
                                // [NEW] 마지막 교류일 갱신 (유대 수치 감소 초기화)
                target.lastInteractionDate = character.currentDate;

                // Parse tags for affection
                const affMatch = reply.match(/\[AFF([+-]\d+)\]/);
                if (affMatch) target.affection = Math.min(100, Math.max(-100, target.affection + parseInt(affMatch[1])));
            });
            onUpdateCharacter(newChar, "");
        } finally {
            setIsChatting(false);
            setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
        }
    };

    const updateNpcInState = (char: Character, id: string, updater: (target: any) => void) => {
        if (char.schoolData?.classmates) {
            const idx = char.schoolData.classmates.findIndex(s => s.id === id);
            if (idx !== -1) updater(char.schoolData.classmates[idx]);
        }
        if (char.clubData?.clubMembers) {
            const idx = char.clubData.clubMembers.findIndex(m => m.id === id);
            if (idx !== -1) updater(char.clubData.clubMembers[idx]);
        }
        if (char.base?.templeVisitors) {
            Object.values(char.base.templeVisitors).forEach((list: any) => {
                const idx = list.findIndex((v: any) => v.id === id);
                if (idx !== -1) updater(list[idx]);
            });
        }
        if (char.socialNetwork) {
            const idx = char.socialNetwork.findIndex(n => n.id === id);
            if (idx !== -1) updater(char.socialNetwork[idx]);
        }
    };
  /**
     * [NEW] 인연 NPC를 Companion 객체로 변환하는 내부 헬퍼
     */
    const convertToCompanion = (target: any, cYear: number): Companion => {
        const level = target.level || 1;
        const baseGeneratedStats = generateCompanionStats(level);
        const finalStats: Stats = {
            ...baseGeneratedStats,
            ...(target.stats || {})
        };
        finalStats.hp = finalStats.maxHp;
        finalStats.mp = finalStats.maxMp;
        const tier = getTierByLevel(level);
        const birthYear = target.birthYear || (cYear - (parseInt(target.age?.replace(/[^0-9]/g, '')) || 20));
        const finalAgeStr = (cYear - birthYear) + "세";

        let comp: Companion = {
            ...target,
            birthYear, 
            age: finalAgeStr, 
            classType: target.classType || "동료",
            job: target.job || JobType.UNEMPLOYED,
            stats: finalStats,
            currentExp: target.currentExp || 0,
            maxExp: level * 100,
            classTier: tier,
            statPoints: 0, 
            skills: target.skills || [],
            weaponMastery: target.weaponMastery || {},
            equipment: target.equipment || {},
            inventory: target.inventory || [], 
            loyalty: 50,
            lastInteractionDate: character.currentDate,
            chatHistory: target.chatHistory || []
        };

        comp = assignRandomCombatStyle(comp, false, false);

        if (tier !== ClassTier.NONE) {
            const isValidShinryoku = comp.shinryokuType && 
                comp.shinryokuType !== '미개방' && 
                comp.shinryokuType !== '무속성' && 
                comp.shinryokuType !== '없음' && 
                comp.shinryokuType !== 'None' && 
                comp.shinryokuType !== '일반' && 
                comp.shinryokuType !== '무' &&
                SHINRYOKU_TYPES_LIST.includes(comp.shinryokuType);

            if (!isValidShinryoku) {
                comp.shinryokuType = SHINRYOKU_TYPES_LIST[Math.floor(Math.random() * SHINRYOKU_TYPES_LIST.length)];
            }
        }

        const type = comp.shinryokuType;
        if (type && tier !== ClassTier.NONE) {
            const currentTierClass = getHumanoidClassByTier(type, tier, comp.combatStyle);
            comp.classType = currentTierClass;

            if (tier === ClassTier.FIRST || tier === ClassTier.SECOND || tier === ClassTier.LAST || tier === ClassTier.FINAL) {
                comp.firstClassName = (tier === ClassTier.FIRST) ? currentTierClass : getHumanoidClassByTier(type, ClassTier.FIRST, comp.combatStyle);
                comp.firstClassDescription = `${type || '무'} 계통의 1차 클래스 각성`;
            }
            if (tier === ClassTier.SECOND || tier === ClassTier.LAST || tier === ClassTier.FINAL) {
                comp.secondClassName = (tier === ClassTier.SECOND) ? currentTierClass : getHumanoidClassByTier(type, ClassTier.SECOND, comp.combatStyle);
                comp.secondClassDescription = `${type || '무'} 계통의 2차 클래스 심화`;
            }
            if (tier === ClassTier.LAST || tier === ClassTier.FINAL) {
                comp.lastClassName = (tier === ClassTier.LAST) ? currentTierClass : getHumanoidClassByTier(type, ClassTier.LAST, comp.combatStyle);
                comp.lastClassDescription = `${type || '무'} 계통의 3차 클래스 극의`;
            }
            if (tier === ClassTier.FINAL) {
                comp.finalClassName = currentTierClass;
                comp.finalClassDescription = `${type || '무'} 계통의 궁극 클래스 도달`;
            }
        }

        return comp;
    };
    const handleRecruit = () => {
        if (npc.isEternalRival) {
            alert(`${npc.name}: "우린 영원히 부딪치며 서로를 뛰어넘을 라이벌이다. 내가 네 밑으로 들어가는 일은 결코 없을 것이다!"\n(영원의 라이벌은 영입이 불가능합니다.)`);
            return;
        }

        // [NEW] 1달 쿨다운 체크
        if (npc.lastRecruitAttemptMonth === currentMonth) {
            alert(`${npc.name}: "아직은 때가 아닌 것 같습니다. 나중에 다시 물어봐 주시겠어요?"\n(이번 달에는 이미 영입 제안을 거절당했습니다. 다음 달에 다시 시도하십시오.)`);
            return;
        }

        const newChar = { ...character };
   const cYear = getYear(newChar.currentDate || '2000-03-02');
        // [NEW] 호감도가 마이너스인 경우 매우 부정적인 거절 처리
        if (npc.affection < 0) {
            const rejectionLines = [
                `"이봐, 제정신이야? 너 같은 놈이랑 같이 다니느니 차라리 마물 밥이 되겠어!"`,
                `"입 닥쳐. 네 얼굴만 봐도 구역질이 나니까 당장 내 눈앞에서 사라져."`,
                `"어디서 그 더러운 입으로 동료라는 말을 내뱉는 거지? 역겨워 죽겠군."`,
                `"하! 너랑 나랑? 꿈 깨시지. 다음번에 만나면 그땐 무기로 대화하게 될 거다."`
            ];
            const selectedLine = rejectionLines[Math.floor(Math.random() * rejectionLines.length)];

            updateNpcInState(newChar, npc.id, (target: any) => {
                target.lastRecruitAttemptMonth = currentMonth;
                // 제안에 대한 불쾌감으로 호감도 추가 하락
                target.affection = Math.max(-100, target.affection - 10);
                                // [NEW] 마지막 교류일 갱신 (유대 수치 감소 초기화)
                target.lastInteractionDate = character.currentDate;

            });

            onUpdateCharacter(newChar, `[영입 모욕] ${npc.name}에게 심한 모욕과 거절을 당했습니다. (호감도 추가 하락)`);
            
            setResultData({
                type: 'failure',
                title: '처참한 거절',
                message: `${npc.name}: ${selectedLine}`,
                items: [
                    { label: '현재 호감도', after: `${npc.affection} (마이너스)` },
                    { label: '결과', after: '심한 모욕을 당함' }
                ]
            }); 
            return;
        }

        // [NEW] 명성치/공훈치 비교 로직 추가
        const playerRep = character.mercenaryData?.reputation || 0;
        const playerMerit = character.militaryData?.merit || 0;
        const npcRep = npc.reputation || 0;
        const npcMerit = npc.merit || 0;

        // 상대방이 용병이면서 명성이 플레이어보다 높거나, 군인이면서 공훈이 높으면 거절
        if ((npc.job === JobType.MERCENARY && npcRep > playerRep) || 
            (npc.job === JobType.SOLDIER && npcMerit > playerMerit)) {
            alert(`${npc.name}: "당신은 아직 나를 이끌 자격이 부족한 것 같군요. 당신보다 나의 이름이 더 널리 알려져 있으니까요."\n(명성/공적치가 부족하여 영입을 거절당했습니다.)`);
            return;
        }

        // [NEW] 레벨 비교 로직 추가: 과거 인연이 플레이어보다 레벨이 높으면 영입 불가
        if (character.socialNetwork?.some(n => n.id === npc.id) && npc.level > character.level) {
             alert(`${npc.name}: "아직은 당신의 그릇이 저를 담기엔 부족해 보이는군요. 더 강해져서 돌아오십시오."\n(대상보다 레벨이 낮아 영입할 수 없습니다.)`);
             return;
        }

        // [MODIFIED] 호감도 80 제한 삭제 및 확률 기반 영입 시도
        // 성공 확률 = 호감도 % (최소 5% 보정)
        const successChance = Math.max(5, npc.affection);
        const roll = Math.random() * 100;
        const isSuccess = roll < successChance;
 
        if (!isSuccess) {
            // [NEW] 실패 시 쿨다운 설정
            updateNpcInState(newChar, npc.id, (target: any) => {
                target.lastRecruitAttemptMonth = currentMonth;
                target.lastInteractionDate = character.currentDate;
            });
            onUpdateCharacter(newChar, `[영입 거절] ${npc.name}이(가) 제안을 정중히 거절했습니다. (다음 달 재시도 가능)`);
            
            setResultData({
                type: 'failure',
                title: '영입 실패',
                message: `${npc.name}: "제안은 감사하지만, 아직은 때가 아닌 것 같습니다. 조금 더 지켜보도록 하죠."`,
                items: [{ label: '성공 확률', after: `${successChance.toFixed(1)}%` }]
            });
            return;
        }
// --- 영입 성공 시: 가족 동반 영입 로직 ---
        const recruitedCompanions: Companion[] = [];
        const familyLogs: string[] = [];

        // 1. 대상 본인 변환
        const mainHired = convertToCompanion(npc, cYear);
        recruitedCompanions.push(mainHired);

        // 2. 가족 찾기 (사회적 관계망 전수 조사)
        if (newChar.socialNetwork) {
            // 배우자 찾기
            if (mainHired.partnerId) {
                const spouse = newChar.socialNetwork.find(n => n.id === mainHired.partnerId);
                if (spouse) {
                    recruitedCompanions.push(convertToCompanion(spouse, cYear));
                    familyLogs.push(`배우자 '${spouse.name}'`);
                    newChar.socialNetwork = newChar.socialNetwork.filter(n => n.id !== spouse.id);
                }
            }
            // 자녀 찾기
            const children = newChar.socialNetwork.filter(n => n.childData?.parentNames?.includes(mainHired.name));
            children.forEach(child => {
                recruitedCompanions.push(convertToCompanion(child, cYear));
                familyLogs.push(`자녀 '${child.name}'`);
                newChar.socialNetwork = newChar.socialNetwork.filter(n => n.id !== child.id);
            });
        }

        // NPC 목록에서 제거
        // --- 이하 성공 로직 ---
      

        // Remove from original NPC list
        if (newChar.schoolData) newChar.schoolData.classmates = newChar.schoolData.classmates.filter(s => s.id !== npc.id);
        if (newChar.clubData) newChar.clubData.clubMembers = newChar.clubData.clubMembers?.filter(m => m.id !== npc.id);
        if (newChar.base?.templeVisitors) {
            Object.keys(newChar.base.templeVisitors).forEach(key => {
                newChar.base!.templeVisitors![key] = newChar.base!.templeVisitors![key].filter(v => v.id !== npc.id);
            });
        }
        if (newChar.socialNetwork) newChar.socialNetwork = newChar.socialNetwork.filter(n => n.id !== npc.id);

       // --- [NEW] 파견소 존재 시 본진 합류 이동 로직 ---
        const hasDispatchFacility = newChar.base && (newChar.base.facilities.includes('dispatch') || newChar.base.facilityLevels['dispatch'] > 0);
        let isRecruitTravelTriggered = false;
        let avgTravelDays = 0;

        recruitedCompanions.forEach(comp => {
            const preppedComp = { ...comp };
            preppedComp.weaponMastery = { ...(comp.weaponMastery || (npc as any).weaponMastery || {}) };

            if (hasDispatchFacility) {
                isRecruitTravelTriggered = true;
                // 민첩(AGI)에 반비례하여 소요 시간 결정 (1~14일)
                const travelDays = Math.max(1, Math.min(14, 15 - Math.floor((comp.stats.agi || 10) / 100)));
                avgTravelDays = Math.max(avgTravelDays, travelDays);
                const returnDate = addDays(newChar.currentDate!, travelDays);
                
                const travelMission: DispatchMission = {
                    id: `recruit_travel_${comp.id}_${Date.now()}`,
                    companionId: comp.id,
                    destination: newChar.base!.location || newChar.currentLocation!,
                    startTime: newChar.currentDate!,
                    durationMonths: 0,
                    expectedReturnDate: returnDate,
                    status: 'Normal',
                    dangerCounter: 0,
                    successRate: 100,
                    missionType: 'RecruitTravel'
                };

                if (!newChar.base!.dispatched) newChar.base!.dispatched = [];
                newChar.base!.dispatched.push(travelMission);
                
                if (!newChar.base!.assignments) newChar.base!.assignments = {};
                newChar.base!.assignments[`recruit_travel_${comp.id}`] = comp.id;

                if (!newChar.inactiveCompanions) newChar.inactiveCompanions = [];
                newChar.inactiveCompanions.push(preppedComp);
            } else {
                if (newChar.companions.length < MAX_PARTY_SIZE && !comp.childData) {
                    newChar.companions.push(preppedComp);
                } else {
                    if (!newChar.inactiveCompanions) newChar.inactiveCompanions = [];
                    newChar.inactiveCompanions.push(preppedComp);
                }
            }
        });

        const familySuffix = familyLogs.length > 0 ? ` 및 가족(${familyLogs.join(', ')})` : "";
        const travelSuffix = isRecruitTravelTriggered ? ` (기지로 합류 이동 개시: 약 ${avgTravelDays}일 소요)` : "";
        
        onUpdateCharacter(newChar, `[인연 포섭] '${npc.name}'${familySuffix}이(가) 합류했습니다.${travelSuffix}`);
        
        setResultData({
            type: 'success',
            title: isRecruitTravelTriggered ? '본진 합류 이동 개시' : '영입 성공!',
            message: `${npc.name}이(가) 당신의 제안을 수락했습니다.${isRecruitTravelTriggered ? `\n파견소의 지침에 따라 대원들이 기지로 먼저 이동합니다.` : ''}`,
            items: [
                { label: '주요 인물', after: npc.name },
                { label: '합류 형태', after: isRecruitTravelTriggered ? '본진 이동 파견' : '즉시 합류' },
                ...(isRecruitTravelTriggered ? [{ label: '예상 소요', after: `${avgTravelDays}일` }] : [])
            ]
        });
    };
    return (
        <div className="fixed inset-0 z-[170] flex items-center justify-center bg-black/90 p-4 animate-in fade-in">
            {resultData && <ActionResultModal data={resultData} onClose={() => { setResultData(null); if (resultData.type !== 'failure') onClose(); }} />}
            
            <div className="bg-slate-900 border border-indigo-500 rounded-3xl w-full max-md h-[80vh] shadow-2xl flex flex-col overflow-hidden">
                {/* Header */}
                <div className="p-4 border-b border-indigo-900/50 bg-indigo-950/20 flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-500 rounded-xl text-white shadow-lg shadow-indigo-500/20">
                            <MessageSquare size={20} />
                        </div>
                        <div>
                            <div className="font-bold text-white text-sm flex items-center gap-2">
                                {npc.name} 
                                <span className="text-[10px] bg-indigo-900 text-indigo-300 px-1.5 rounded">접속 중</span>
                                {npc.partnerName && (
                                    <span className="text-[10px] bg-pink-950/70 text-pink-300 border border-pink-800/50 px-1.5 rounded flex items-center gap-1">
                                        <Heart size={9} className="fill-pink-400 text-pink-400" />
                                        {npc.partnerName}의 {npc.isSpouse ? '배우자' : '연인'}
                                    </span>
                                )}
                            </div>
                            <div className="text-[10px] text-slate-500 font-bold">{npc.originName || '인물 관계망'}</div>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-slate-500 hover:text-white p-2 transition-colors"><X/></button>
                </div>

                {/* Chat Display */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-[url('https://www.transparenttextures.com/patterns/stardust.png')]">
                    <div className="text-center py-4">
                        <div className="inline-block px-3 py-1 bg-slate-800/50 rounded-full text-[10px] text-slate-500 border border-slate-700">
                            {npc.originName}에서 맺은 인연과 대화를 시작합니다.
                        </div>
                    </div>
                    
                    {chatHistory.map((msg: any, i: number) => {
                        const isUser = msg.role === 'user';
                        return (
                            <div key={i} className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
                                <div className={`max-w-[85%] p-3 rounded-2xl text-sm shadow-md ${isUser ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-slate-800 text-slate-200 border border-slate-700 rounded-tl-none'}`}>
                                    {msg.text}
                                </div>
                            </div>
                        );
                    })}
                    <div ref={chatEndRef} />
                </div>

                {/* Actions & Input */}
                <div className="p-4 bg-slate-950 border-t border-slate-800 space-y-3">
                    <div className="flex justify-between items-center px-1">
                        <div className="flex items-center gap-4">
                            <div className={`flex items-center ${npc.affection < 0 ? 'text-red-500' : 'text-pink-400'} font-bold text-xs`}>
                                {npc.affection < 0 ? <Skull size={12} className="mr-1"/> : <Heart size={12} className="mr-1 fill-pink-400"/>} 
                                {npc.affection}
                            </div>
                              {npc.partnerId && <div className="flex items-center text-amber-500 font-bold text-[10px] bg-amber-950/20 px-2 py-0.5 rounded border border-amber-900/50"><Users size={10} className="mr-1"/> 기혼</div>}
                            <div className="flex items-center text-blue-400 font-bold text-xs"><Zap size={12} className="mr-1"/> Lv.{npc.level}</div>
                            {npc.job && (
                                <div className="flex items-center text-indigo-300 font-bold text-xs">
                                    {npc.job === JobType.SOLDIER ? <Medal size={12} className="mr-1"/> : <Award size={12} className="mr-1"/>}
                                    {npc.militaryRank || npc.mercenaryRank || npc.job}
                                </div>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                             {npc.lastRecruitAttemptMonth === currentMonth && !npc.isEternalRival && (
                                <span className="text-[9px] text-red-500 font-bold flex items-center gap-1 animate-pulse">
                                    <AlertTriangle size={10}/> 쿨다운 중
                                </span>
                            )}
                            {npc.isEternalRival ? (
                                <span className="px-3 py-1 bg-red-950/40 border border-red-800/50 text-red-400 rounded-full text-[10px] font-bold">
                                    ⚔️ 영원의 라이벌 (영입 불가)
                                </span>
                            ) : (
                                <button 
                                    onClick={handleRecruit}
                                    className={`px-4 py-1.5 ${npc.affection < 0 ? 'bg-red-900/50 hover:bg-red-800 text-red-300' : 'bg-amber-600 hover:bg-amber-500 text-white'} rounded-full text-[10px] font-bold transition-all shadow-lg active:scale-95 flex items-center gap-1.5`}
                                >
                                    <UserPlus size={12}/> {npc.lastRecruitAttemptMonth === currentMonth ? '제안 불가' : '동료 영입 제안'}
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="relative flex gap-2">
                        <input 
                            type="text" 
                            value={chatInput}
                            onChange={e => setChatInput(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                            placeholder={isChatting ? "반응을 살피는 중..." : "답장을 입력하세요..."}
                            disabled={isChatting}
                            className="flex-1 bg-slate-900 border border-slate-700 rounded-full py-3 px-6 text-sm text-white outline-none focus:border-indigo-500 shadow-inner"
                        />
                        <button 
                            onClick={handleSendMessage}
                            disabled={!chatInput.trim() || isChatting}
                            className="p-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full transition-all disabled:opacity-30 shadow-lg active:scale-95"
                        >
                            {isChatting ? <Loader2 size={18} className="animate-spin"/> : <Send size={18}/>}
                        </button>
                    </div>
                    <p className={`text-[9px] ${npc.affection < 0 ? 'text-red-500 font-bold' : 'text-slate-600'} text-center italic`}>
                        {npc.affection < 0 
                            ? "상태: 적대적. 지금 말을 걸면 심한 욕설을 들을 수도 있습니다."
                            : npc.lastRecruitAttemptMonth === currentMonth 
                                ? "이번 달에는 영입 제안에 거절당했습니다. 다음 달에 다시 제안할 수 있습니다."
                                : `성공 확률은 호감도(${npc.affection}%)에 비례합니다.`}
                    </p>
                </div>
            </div>
        </div>
    );
};

export default MessageModal;
