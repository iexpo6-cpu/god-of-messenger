
import React, { useState, useEffect } from 'react';
import { Character, Companion, Item, ClassTier, Stats, ItemRarity } from '../types';
import { X, Sparkles, Heart, Package, Gem, TrendingUp, CheckCircle, Clock, AlertTriangle, Flame, Zap, Shield, Target, Star, FlaskConical, Sun, Users } from 'lucide-react';
import { DIVINE_MESSENGER_CONFIG } from '../awakening';
import { TEMPLE_MESSENGER_MAP, SHINRYOKU_TYPES_LIST } from '../constants';
import { SEASONAL_BOSSES } from '../mythicbossmonsters';
import ActionResultModal, { ResultData } from './ActionResultModal';

interface Props {
    character: Character;
    templeCity: string;
    onClose: () => void;
    onUpdateCharacter: (newChar: Character, logMsg: string) => void;
}

const DivineResourceModal: React.FC<Props> = ({ character, templeCity, onClose, onUpdateCharacter }) => {
    const [resultData, setResultData] = useState<ResultData | null>(null);

    const currentDate = character.currentDate || '2000-03-02';
    const currentMonth = currentDate.substring(0, 7); // YYYY-MM
    const lastCollect = character.base?.lastTempleResourceDate || '';
    const isReady = lastCollect !== currentMonth;

    const templeKey = `${character.currentLocation?.nation}_${templeCity}`;
    const personnel = character.base?.templePersonnel?.[templeKey];
    
    // 시설 레벨 정보 가져오기
    const altarLevel = character.base?.facilityLevels?.[`temple_altar_${templeKey}`] || 1;
    const labLevel = character.base?.facilityLevels?.[`temple_lab_${templeKey}`] || 1;

    const requiredMessengerJob = TEMPLE_MESSENGER_MAP[templeCity];
    const messengerConfig = Object.values(DIVINE_MESSENGER_CONFIG).find(c => c.jobType === requiredMessengerJob);
    
    // 성전 속성 파악
    const templeElement = SHINRYOKU_TYPES_LIST.find(type => templeCity.includes(type.replace('계',''))) || "광휘계";

    const getMythicMaterialInfo = () => {
        if (!messengerConfig) return { name: "신의 정수", desc: "신비로운 기운이 담긴 정수입니다.", imageUrl: "" };
        const targetMaterialName = messengerConfig.material;
        for (const [bossKey, boss] of Object.entries(SEASONAL_BOSSES)) {
            const lootList = Array.isArray(boss.detailedLoot) ? boss.detailedLoot : [boss.detailedLoot];
            const foundMaterial = lootList.find(l => l.name === targetMaterialName);
            if (foundMaterial) return { name: foundMaterial.name, desc: foundMaterial.description, imageUrl: foundMaterial.imageUrl };
        }
        return { name: targetMaterialName, desc: `${templeCity}에서 정제된 성스러운 정수입니다.`, imageUrl: "" };
    };

    const materialInfo = getMythicMaterialInfo();
    const allComps = [...character.companions, ...(character.inactiveCompanions || [])];

    // 생산량 및 확률 계산 로직
    const calculateProduction = () => {
        let totalFaithGain = 0;
        let totalResourceChance = 0;
        let totalStatsSum = 0; 
        let maxCtrlForShards = 0;
        let shardSourceLabel = "";
        const details: { role: string, name: string, faith: number, chance: number, ctrl?: number }[] = [];

        if (!personnel) return { faith: 0, chance: 0, primordialChance: 0, altarMult: 1, labQty: 1, shardGain: 0, shardSource: "", details: [], isBlessed: false };

        const processMember = (id: string, role: string, statKey: keyof Stats, faithFactor: number, chanceFactor: number) => {
            const m = allComps.find(c => c.id === id);
            if (m) {
                const statVal = Number(m.stats[statKey]) || 0;
                const f = Math.floor(statVal * faithFactor);
                const c = statVal * chanceFactor;
                totalFaithGain += f;
                totalResourceChance += c;
                totalStatsSum += (m.stats.str + m.stats.int + m.stats.wis + m.stats.def + m.stats.agi + m.stats.ctrl);
                details.push({ role, name: m.name, faith: f, chance: c });
            }
        };

        const processSupporters = (ids: string[], role: string) => {
            ids.forEach(id => {
                const m = allComps.find(c => c.id === id);
                if (m) {
                    if (m.stats.ctrl > maxCtrlForShards) {
                        maxCtrlForShards = m.stats.ctrl;
                        shardSourceLabel = `${m.name} (${role})`;
                    }
                    details.push({ role, name: m.name, faith: 0, chance: 0, ctrl: m.stats.ctrl });
                }
            });
        };

        if (personnel.priestId) processMember(personnel.priestId, '신관', 'ctrl', 0.01, 0.01);
        if (personnel.subPriestId) processMember(personnel.subPriestId, '부사제', 'wis', 0.01, 0.005);
        personnel.knightIds.forEach(id => processMember(id, '기사', 'str', 0.01, 0.002));
        
        // 메이드와 집사 중 최고 CTRL 자 확인
        processSupporters(personnel.butlerIds || [], '집사');
        processSupporters(personnel.maidIds || [], '메이드');

        // 제단 레벨 배율 적용
        const altarMult = 1 + (altarLevel - 1) * 0.5;
        totalFaithGain = Math.floor(totalFaithGain * altarMult);

        // [ADDED] 성전 축복 효과 적용 (+50%)
        const isBlessed = character.base?.isTempleBlessed || false;
        if (isBlessed) {
            totalFaithGain = Math.floor(totalFaithGain * 1.5);
            totalResourceChance = totalResourceChance * 1.5;
        }

        const primordialChance = Math.min(5, totalStatsSum * 0.00001) * (isBlessed ? 1.5 : 1);
        const shardGain = Math.floor(maxCtrlForShards * 0.01) * (isBlessed ? 1.5 : 1);

        return {
            faith: totalFaithGain,
            chance: Math.min(100, totalResourceChance),
            primordialChance,
            altarMult,
            labQty: labLevel,
            shardGain: Math.floor(shardGain),
            shardSource: shardSourceLabel,
            details,
            isBlessed
        };
    };

    const production = calculateProduction();

    const handleCollect = () => {
        if (!isReady) return;

        const newChar = { ...character };
        if (!newChar.base) return;

        const roll = Math.random() * 100;
        const success = roll < production.chance;

        const primordialRoll = Math.random() * 100;
        const primordialSuccess = primordialRoll < production.primordialChance;

        newChar.faith = (newChar.faith || 0) + production.faith;
        newChar.base = { ...newChar.base, lastTempleResourceDate: currentMonth };

        // [MODIFIED] 축복 소모
        if (newChar.base.isTempleBlessed) {
            newChar.base.isTempleBlessed = false;
        }

        const gainedItems: Item[] = [];

        // 연구실 레벨에 따른 수량 획득
        if (success) {
            for (let i = 0; i < labLevel; i++) {
                gainedItems.push({
                    name: materialInfo.name,
                    type: 'Etc',
                    rarity: ItemRarity.LEGENDARY,
                    description: materialInfo.desc,
                    imageUrl: materialInfo.imageUrl,
                    enhancement: 0
                });
            }
        }

        if (primordialSuccess) {
            const primordialItem = (SEASONAL_BOSSES["신"].detailedLoot as Item[]).find(l => l.name === "태초의 빛");
            if (primordialItem) gainedItems.push({ ...primordialItem });
        }

        newChar.inventory = [...newChar.inventory, ...gainedItems];

        // 신력 조각 획득 처리
        if (production.shardGain > 0) {
            if (!newChar.base.elementalShards) newChar.base.elementalShards = {};
            newChar.base.elementalShards[templeElement] = (newChar.base.elementalShards[templeElement] || 0) + production.shardGain;
        }

        const logMsg = `[성전 자원 수령] 신앙심 +${production.faith}${production.shardGain > 0 ? `, ${templeElement} 조각 +${production.shardGain}` : ''}${gainedItems.length > 0 ? `, 획득: ${gainedItems.map(i => i.name).join(', ')}` : ''} 획득 완료.`;
        onUpdateCharacter(newChar, logMsg);

        setResultData({
            type: 'success',
            title: '자원 정제 완료',
            message: `성전 인원들의 헌신으로 성스러운 기운이 모였습니다. ${production.isBlessed ? '(축복의 기운이 깃들었습니다!)' : ''}`,
            items: [
                { label: '신앙심 획득', after: `+${production.faith} (${production.altarMult}배)` },
                { label: `${templeElement} 조각`, after: production.shardGain > 0 ? `+${production.shardGain}` : '획득 없음' },
                { label: '전용 재료', after: success ? `+${labLevel} (${materialInfo.name})` : '정제 실패' },
                { label: '태초의 빛', after: primordialSuccess ? '+1 (희귀!)' : '획득 실패' },
                { label: '다음 수령', after: '다음 달 1일 이후' }
            ]
        });
    };

    return (
        <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-in fade-in">
            {resultData && <ActionResultModal data={resultData} onClose={() => { setResultData(null); onClose(); }} />}

            <div className="bg-slate-900 border border-amber-500 w-full max-w-lg rounded-3xl shadow-[0_0_50px_rgba(245,158,11,0.2)] flex flex-col overflow-hidden relative">
                <div className="p-6 border-b border-amber-900/50 bg-amber-950/20 flex justify-between items-center shrink-0">
                    <div className="flex items-center">
                        <Sparkles size={24} className="text-amber-400 mr-2 animate-pulse" />
                        <h2 className="text-xl font-bold text-white font-cinzel">성전 자원 관리</h2>
                    </div>
                    <button onClick={onClose} className="text-slate-500 hover:text-white p-2 rounded-full hover:bg-slate-800 transition-colors"><X size={20} /></button>
                </div>

                <div className="p-6 overflow-y-auto custom-scrollbar space-y-6">
                    {production.isBlessed && (
                        <div className="bg-indigo-900/40 border border-indigo-500 p-4 rounded-2xl flex items-center gap-3 animate-pulse">
                            <Sparkles size={24} className="text-indigo-400"/>
                            <div>
                                <p className="text-sm font-bold text-white">성전 축복 활성화 중</p>
                                <p className="text-[10px] text-indigo-300">의식의 효과로 이번 생산량이 50% 증가합니다.</p>
                            </div>
                        </div>
                    )}

                    <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-4">
                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center">
                            <TrendingUp size={14} className="mr-2"/> 이번 달 예상 기대치 ({currentMonth})
                        </h3>
                        
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 text-center relative overflow-hidden">
                                <div className="absolute top-1 right-1 opacity-20"><Sun size={24} className="text-amber-500"/></div>
                                <Heart size={20} className="text-pink-500 mx-auto mb-1"/>
                                <span className="text-[10px] text-slate-500 block">신앙심 증가</span>
                                <span className="text-xl font-bold text-white">+{production.faith}</span>
                                <span className="text-[8px] text-amber-500 font-bold block">제단 보너스 {production.altarMult}배</span>
                            </div>
                            <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 text-center relative overflow-hidden">
                                <div className="absolute top-1 right-1 opacity-20"><FlaskConical size={24} className="text-purple-500"/></div>
                                <Package size={20} className="text-amber-500 mx-auto mb-1"/>
                                <span className="text-[10px] text-slate-500 block">{materialInfo.name.replace('의 ','')} 확률</span>
                                <span className="text-xl font-bold text-amber-400">{production.chance.toFixed(1)}%</span>
                                <span className="text-[8px] text-purple-400 font-bold block">성공 시 수량 {production.labQty}개</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-3">
                            <div className="bg-slate-900 p-3 rounded-xl border border-indigo-900/50 flex justify-between items-center">
                                <div className="flex items-center text-xs font-bold text-indigo-300">
                                    <Gem size={14} className="mr-2 text-indigo-400"/> {templeElement} 조각 정제
                                </div>
                                <div className="text-right">
                                    <span className="text-sm font-mono font-bold text-indigo-400">+{production.shardGain}</span>
                                    {production.shardSource && <p className="text-[8px] text-slate-500 mt-0.5">from: {production.shardSource}</p>}
                                </div>
                            </div>
                            <div className="bg-slate-900 p-3 rounded-xl border border-indigo-900/50 flex justify-between items-center">
                                <div className="flex items-center text-xs font-bold text-indigo-300">
                                    <Star size={14} className="mr-2 fill-indigo-500/20"/> 태초의 빛 추출 확률
                                </div>
                                <span className="text-sm font-mono font-bold text-indigo-400">{production.primordialChance.toFixed(3)}%</span>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <h4 className="text-xs font-bold text-slate-400 uppercase px-1">배치 인원 기여도</h4>
                        {production.details.length > 0 ? (
                            production.details.map((d, i) => (
                                <div key={i} className="flex justify-between items-center p-3 bg-slate-950/50 rounded-xl border border-slate-800 text-xs">
                                    <div className="flex items-center gap-2">
                                        <span className="bg-indigo-900/30 text-indigo-400 px-1.5 py-0.5 rounded border border-indigo-800 text-[9px] font-bold">{d.role}</span>
                                        <span className="text-slate-200 font-bold">{d.name}</span>
                                    </div>
                                    <div className="flex gap-4 text-slate-500 font-mono">
                                        {d.ctrl !== undefined ? (
                                            <span className="text-indigo-400/70">CTRL:{d.ctrl}</span>
                                        ) : (
                                            <>
                                                <span className="text-pink-400/70">F:+{d.faith}</span>
                                                <span className="text-amber-400/70">P:{d.chance.toFixed(2)}%</span>
                                            </>
                                        )}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className="text-center py-4 text-xs text-slate-600 italic">배치된 전문 인력이 없습니다.</p>
                        )}
                    </div>

                    {!isReady ? (
                        <div className="p-4 bg-blue-900/10 border border-blue-500/30 rounded-2xl flex items-center gap-3">
                            <Clock size={20} className="text-blue-400 shrink-0"/>
                            <p className="text-xs text-blue-300 leading-relaxed">
                                이번 달 자원 수령을 완료했습니다.<br/>
                                <span className="font-bold">다음 수령 가능: {currentDate.split('-')[0]}년 {parseInt(currentDate.split('-')[1]) + 1}월 1일</span>
                            </p>
                        </div>
                    ) : (
                        <div className="p-4 bg-amber-900/10 border border-amber-500/30 rounded-2xl flex items-center gap-3">
                            <CheckCircle size={20} className="text-amber-500 shrink-0"/>
                            <p className="text-xs text-amber-200">
                                현재 자원 수령이 가능합니다. 수령 시 한 달의 시간이 소모되지는 않으며, 자원만 즉시 정산됩니다.
                            </p>
                        </div>
                    )}
                </div>

                <div className="p-6 bg-slate-950 border-t border-slate-800">
                    <button
                        onClick={handleCollect}
                        disabled={!isReady || production.details.length === 0}
                        className={`w-full py-4 rounded-2xl font-bold transition-all shadow-lg flex items-center justify-center gap-2 ${isReady && production.details.length > 0 ? 'bg-amber-600 hover:bg-amber-500 text-white transform hover:scale-[1.02] active:scale-95' : 'bg-slate-800 text-slate-600 cursor-not-allowed border border-slate-700'}`}
                    >
                        <Flame size={18}/>
                        <span>이번 달 자원 수령하기</span>
                    </button>
                    {production.details.length === 0 && <p className="text-[10px] text-red-500 text-center mt-2 font-bold">인력을 먼저 배치해야 자원이 생산됩니다.</p>}
                </div>
            </div>
        </div>
    );
};

export default DivineResourceModal;
