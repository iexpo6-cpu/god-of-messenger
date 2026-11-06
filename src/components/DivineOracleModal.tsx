
import React, { useState, useEffect } from 'react';
import { Character, Quest, JobType } from '../types';
import { X, Sparkles, ScrollText, ShieldAlert, Globe, Loader2, Star, CheckCircle, AlertTriangle, Crown, Skull } from 'lucide-react';
import { GoogleGenAI, Type } from "@google/genai";
import { getYear } from '../utils';
import ActionResultModal, { ResultData } from './ActionResultModal';
import { DETAILED_BOSSES, ASIA_BOSSES, EUROPE_BOSSES, AMERICA_BOSSES, AFRICA_BOSSES, DIVINE_REALM_BOSSES, BossData } from '../bossMonsters';
import { SEASONAL_BOSSES } from '../mythicbossmonsters';

interface Props {
    character: Character;
    templeCity: string;
    messengerLevel: number;
    onClose: () => void;
    onAccept: (oracle: Quest) => void;
    onUpdateCharacter: (newChar: Character, logMsg: string) => void;
}

const getAi = () => {
  const manualKey = localStorage.getItem('shinryoku_manual_api_key');
  const apiKey = manualKey || process.env.API_KEY;
  if (!apiKey) throw new Error("API_KEY_MISSING");
  return new GoogleGenAI({ apiKey });
};

const DivineOracleModal: React.FC<Props> = ({ character, templeCity, messengerLevel, onClose, onAccept, onUpdateCharacter }) => {
    const [isGenerating, setIsGenerating] = useState(false);
    const [availableOracle, setAvailableOracle] = useState<Quest | null>(null);
    const [resultData, setResultData] = useState<ResultData | null>(null);

    const currentYear = getYear(character.currentDate || '2000-01-01');
    const lastOracleYear = character.militaryData?.lastOracleYear || 0;
    const isAlreadyTaken = lastOracleYear >= currentYear;
    const isGodDefeated = character.isGodDefeated || false;

    /**
     * 로컬 보스 데이터베이스 통합 및 필터링
     */
    const getFilteredBossPool = (): BossData[] => {
        const bosses: BossData[] = [];
        const sources = [DETAILED_BOSSES, ASIA_BOSSES, EUROPE_BOSSES, AMERICA_BOSSES, AFRICA_BOSSES, DIVINE_REALM_BOSSES];
        
        // 1. 일반 및 지역 보스 통합
        sources.forEach(source => {
            Object.values(source).forEach(nationData => {
                Object.values(nationData).forEach(boss => {
                    if (boss.name) bosses.push(boss);
                });
            });
        });

        // 2. 신화/시즌 보스 통합
        Object.values(SEASONAL_BOSSES).forEach(boss => {
            if (boss.name) bosses.push(boss);
        });

        // 3. '절대신 엘라' 제외 필터링 (이름 기반)
        return bosses.filter(b => 
            !b.name.includes("엘라") && 
            !b.name.includes("절대신") &&
            !b.title.includes("절대신")
        );
    };

    const generateOracle = async () => {
        if (isGodDefeated) return;
        setIsGenerating(true);
        
        // 1. [LOCAL] 보스 선정
        const pool = getFilteredBossPool();
        if (pool.length === 0) {
            alert("가용한 신탁 대상이 없습니다.");
            setIsGenerating(false);
            return;
        }
        const selectedBoss = pool[Math.floor(Math.random() * pool.length)];

        // 2. [LOCAL] 보상 계산 로직
        // 공식: (기본 10 + 신앙심) * 보스 레벨 * 가중치
        const faithPoints = character.faith || 0;
        const rewardFactor = Math.min(10000, Math.floor(faithPoints / 100)); // 신앙심 100당 배율 증가
        
        const rewardGold = Math.floor((50000 + (selectedBoss.level * 1000)) * (1 + rewardFactor * 0.1));
        const rewardExp = Math.floor((25000 + (selectedBoss.level * 500)) * (1 + rewardFactor * 0.1));
        const rewardFaith = 30; // 신탁 완수 시 고정 신앙심 보상

        try {
            // 3. [AI] 서사적인 문구만 생성 요청
            const prompt = `
            당신은 판타지 RPG '신의 사자'의 신성한 서사 엔진입니다. 
            이미 로컬에서 선정된 목표 보스와 보상 정보를 바탕으로, 신의 엄중하고 장엄한 목소리로 전달되는 '신탁'의 배경 내용을 한국어로 작성하십시오.

            [선정된 정보 - 반드시 유지할 것]
            보스 이름: ${selectedBoss.name}
            보스 칭호: ${selectedBoss.title}
            성전 위치: ${templeCity}
            보상: ${rewardGold.toLocaleString()} G, ${rewardExp.toLocaleString()} EXP

            [작성 지침]
            1. title: 신의 위엄이 느껴지는 제목 (예: "[보스칭호]의 종말", "성역을 어지럽히는 [보스이름]의 단죄")
            2. details: 왜 이 보스가 신성한 위협이 되는지, 사자가 왜 이 시련을 겪어야 하는지에 대한 서사적인 배경 설명을 2문장 내외로 작성하십시오. 고풍스럽고 신성한 어조를 사용하십시오.
            
            반드시 아래 JSON 형식을 지켜서 답변하십시오.
            {
                "title": "제목",
                "details": "서사적 설명"
            }
            `;

            const ai = getAi();
            const result = await ai.models.generateContent({
                model: 'gemini-3.8-flash', // 빠른 응답을 위해 플래시 모델 사용
                contents: [{ role: 'user', parts: [{ text: prompt }] }],
                config: { responseMimeType: "application/json" }
            });

            const data = JSON.parse(result.text || '{}');
            
            const oracle: Quest = {
                id: `oracle_${currentYear}_${templeKey}_${Math.random().toString(36).substring(7)}`,
                type: 'DivineOracle',
                rank: 'Divine',
                title: data.title || `${selectedBoss.name} 정벌 신탁`,
                goal: `${selectedBoss.name} 토벌`,
                details: data.details || "신의 뜻에 따라 사명을 다하십시오.",
                danger: 'Extreme',
                rewardGold: rewardGold,
                rewardExp: rewardExp,
                rewardFaith: rewardFaith,
                targetAmount: 1,
                currentAmount: 0,
                targetName: selectedBoss.name,
                templeKey: `${character.currentLocation?.nation}_${templeCity}`
            };
            setAvailableOracle(oracle);
        } catch (e) {
            console.error(e);
            // AI 오류 시 최소한의 데이터로 로컬 생성 강행
            setAvailableOracle({
                id: `oracle_local_${Date.now()}`,
                type: 'DivineOracle', rank: 'Divine',
                title: `${selectedBoss.name}의 단죄`,
                goal: `${selectedBoss.name} 토벌`,
                details: "신의 목소리가 흐릿하지만, 그대의 마음속에 사명이 새겨졌습니다.",
                danger: 'Extreme',
                rewardGold, rewardExp, rewardFaith,
                targetAmount: 1, currentAmount: 0, targetName: selectedBoss.name,
                templeKey: `${character.currentLocation?.nation}_${templeCity}`
            });
        }
        setIsGenerating(false);
    };

    const templeKey = `${character.currentLocation?.nation}_${templeCity}`;

    const handleAccept = () => {
        if (!availableOracle || isGodDefeated) return;

        const newChar = { ...character };
        if (!newChar.militaryData) {
            newChar.militaryData = { 
                rank: character.militaryRank || 'PVT' as any, 
                enlistedDate: character.currentDate || '', 
                merit: 0, completedMissions: 0, 
                assignedCity: character.currentLocation?.city || '',
                availableMissions: [], activeMissions: [] 
            };
        }
        
        if (!newChar.militaryData.activeMissions) newChar.militaryData.activeMissions = [];
        newChar.militaryData.activeMissions.push(availableOracle);
        newChar.militaryData.lastOracleYear = currentYear;

        onUpdateCharacter(newChar, `[신탁 수령] 신의 계시를 받았습니다: ${availableOracle.title}`);
        onAccept(availableOracle);
        
        setResultData({
            type: 'success',
            title: '신탁 수령 완료',
            message: '신의 명령이 영혼에 각인되었습니다. 의뢰 일지에서 확인하십시오.',
            items: [
                { label: '임무 등급', after: '신성' },
                { label: '목표 보스', after: availableOracle.targetName || '불명' },
                { label: '예상 보상', after: `${availableOracle.rewardExp.toLocaleString()} 경험치` }
            ]
        });
    };

    return (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/95 backdrop-blur-sm p-3 sm:p-4 animate-in fade-in">
            {resultData && <ActionResultModal data={resultData} onClose={() => { setResultData(null); onClose(); }} />}
            
            <div className="bg-slate-900 border border-amber-500/50 w-full max-w-lg max-h-[92vh] rounded-3xl shadow-[0_0_50px_rgba(245,158,11,0.25)] flex flex-col overflow-hidden relative">
                {/* 헤더 */}
                <div className="p-4 sm:p-5 border-b border-amber-900/40 bg-amber-950/20 flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-2.5">
                        <Sparkles size={22} className="text-amber-400" />
                        <div>
                            <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">신의 신탁</h2>
                            <p className="text-[11px] text-amber-400/80 font-medium">천상에서 하달되는 신성한 계시</p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose} 
                        className="p-2 text-slate-400 hover:text-white rounded-full hover:bg-slate-800 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* 본문 */}
                <div className="p-4 sm:p-6 flex-1 flex flex-col items-center justify-center text-center space-y-5 overflow-y-auto custom-scrollbar overscroll-contain">
                    {isGodDefeated ? (
                        <div className="space-y-3.5 animate-in zoom-in-95 py-6">
                            <div className="w-16 h-16 rounded-full bg-slate-800 border-2 border-rose-600 flex items-center justify-center mx-auto shadow-[0_0_20px_rgba(225,29,72,0.3)]">
                                <Skull size={32} className="text-rose-500" />
                            </div>
                            <h3 className="text-lg font-bold text-rose-400">끊어진 하늘의 전언</h3>
                            <p className="text-xs text-slate-400 leading-relaxed max-w-xs mx-auto">
                                절대신 엘라가 당신의 손에 쓰러짐으로써,<br/>
                                더 이상 신계로부터 내려오는 지시나 신탁은 존재하지 않습니다.<br/>
                                <span className="text-[11px] text-slate-500 mt-2 block font-medium">이제 당신의 의지가 곧 신의 뜻입니다.</span>
                            </p>
                        </div>
                    ) : isAlreadyTaken ? (
                        <div className="space-y-3.5 py-6">
                            <div className="w-16 h-16 rounded-full bg-slate-800 border-2 border-slate-700 flex items-center justify-center mx-auto opacity-70">
                                <CheckCircle size={32} className="text-slate-400" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-200">올해의 사명 완수</h3>
                            <p className="text-xs text-slate-400 leading-relaxed max-w-xs mx-auto">
                                {currentYear}년도에 하달된 신탁을 이미 수령했거나 완수했습니다.<br/>
                                신의 명령은 매년 3월 2일에 새롭게 갱신됩니다.
                            </p>
                            <div className="inline-block text-xs text-amber-400 font-bold bg-amber-950/40 px-3.5 py-1.5 rounded-full border border-amber-900/50">
                                다음 신탁 가능: {currentYear + 1}년
                            </div>
                        </div>
                    ) : isGenerating ? (
                        <div className="flex flex-col items-center gap-3 py-12">
                            <Loader2 size={40} className="animate-spin text-amber-500" />
                            <p className="text-amber-200 text-sm font-medium animate-pulse">천상의 목소리를 경청하는 중...</p>
                        </div>
                    ) : availableOracle ? (
                        <div className="w-full space-y-4 animate-in zoom-in-95">
                            <div className="bg-slate-950 p-4 sm:p-5 rounded-2xl border border-amber-500/30 text-left relative overflow-hidden">
                                <span className="text-[11px] font-bold text-amber-400 block mb-1">하달된 계시</span>
                                <h3 className="text-lg font-bold text-white mb-1.5">{availableOracle.title}</h3>
                                <p className="text-xs text-slate-300 leading-relaxed mb-3 italic">"{availableOracle.details}"</p>
                                <div className="flex items-center gap-2 text-rose-400 font-bold text-xs bg-rose-950/20 p-2.5 rounded-xl border border-rose-900/30">
                                    <ShieldAlert size={15}/>
                                    <span>토벌 대상: {availableOracle.goal}</span>
                                </div>
                            </div>

                            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2.5">
                                <h4 className="text-xs text-slate-400 font-bold text-left">신성 하사 보상 (성전 대원 전체 배분)</h4>
                                <div className="grid grid-cols-2 gap-2.5">
                                    <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 flex flex-col items-center">
                                        <span className="text-[10px] text-slate-400">경험치</span>
                                        <span className="text-sm font-bold text-indigo-400 font-mono">+{availableOracle.rewardExp.toLocaleString()}</span>
                                    </div>
                                    <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 flex flex-col items-center">
                                        <span className="text-[10px] text-slate-400">신앙심 획득</span>
                                        <span className="text-sm font-bold text-amber-400 font-mono">+{availableOracle.rewardFaith}</span>
                                    </div>
                                    <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 flex flex-col items-center col-span-2">
                                        <span className="text-[10px] text-slate-400">성전 금고 하사금</span>
                                        <span className="text-base font-bold text-amber-300 font-mono">+{availableOracle.rewardGold.toLocaleString()} G</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-2.5 pt-1">
                                <button 
                                    onClick={() => setAvailableOracle(null)} 
                                    className="flex-1 py-3 bg-slate-800 text-slate-300 rounded-xl hover:bg-slate-700 text-xs font-bold transition-colors min-h-[44px]"
                                >
                                    다시 생각하기
                                </button>
                                <button 
                                    onClick={handleAccept} 
                                    className="flex-[2] py-3 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-bold text-xs shadow-md flex items-center justify-center gap-1.5 transition-all active:scale-98 min-h-[44px]"
                                >
                                    <CheckCircle size={16}/> 신탁 수락
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-5 py-4">
                            <div className="p-5 bg-amber-950/20 border border-amber-500/30 rounded-2xl max-w-sm mx-auto">
                                <ScrollText size={40} className="text-amber-400 mx-auto mb-3" />
                                <h3 className="text-base font-bold text-white">신의 계시 기다림</h3>
                                <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
                                    성전의 제단 앞에 무릎을 꿇고 기도를 올리십시오.<br/>
                                    신께서 사자와 동료들에게 내리는 사명을 확인합니다.
                                </p>
                            </div>
                            <button 
                                onClick={generateOracle}
                                className="w-full sm:w-auto px-8 py-3.5 bg-amber-600 hover:bg-amber-500 text-white font-bold text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 mx-auto active:scale-98 min-h-[44px]"
                            >
                                <Globe size={18}/> 기도로 신탁 청하기
                            </button>
                        </div>
                    )}
                </div>

                {/* 하단 바 */}
                <div className="p-3 bg-slate-950 border-t border-slate-800 flex items-center justify-center gap-1.5 shrink-0">
                    <AlertTriangle size={13} className="text-amber-500" />
                    <span className="text-[11px] text-slate-400 font-medium">신탁 수령 제한: 1년에 단 1회 가능</span>
                </div>
            </div>
        </div>
    );
};

export default DivineOracleModal;
