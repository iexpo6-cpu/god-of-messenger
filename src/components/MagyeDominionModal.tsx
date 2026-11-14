
import React, { useState, useEffect } from 'react';
import { Character, Companion, DominionData, Stats, JobType, Item, ItemRarity, CapturedMonster } from '../types';
import { X, Skull, Flame, TowerControl, ShieldAlert, Zap, TrendingUp,Info,Coins, Sparkles,ChevronRight,CheckCircle, Hammer, Ghost, AlertTriangle, Gavel, Users, UserMinus, ShieldCheck, Gem, Package, Heart, RefreshCw, Loader2, Crown, ScrollText, Utensils, Mountain, Leaf, Sword } from 'lucide-react';
import ActionResultModal, { ResultData } from './ActionResultModal';
import { calculateFinalStats } from '../utils';
import { MAGYE_DOMINION_MAP } from '../constants';
import MagyePersonnelModal from './MagyePersonnelModal';
import MagyeBeastManagementModal from './MagyeBeastManagementModal';
import MagyeRebellionModal from './MagyeRebellionModal'; 
import MagyeEquipmentModal from './MagyeEquipmentModal'; 


// [NEW] 제너럴 등급지수 매핑
const GENERAL_RANK_COEF: Partial<Record<JobType, number>> = {
    [JobType.MAGYE_GENERAL_11]: 0.5,
    [JobType.MAGYE_GENERAL_10]: 1.0,
    [JobType.MAGYE_GENERAL_9]: 1.5,
    [JobType.MAGYE_GENERAL_8]: 2.0,
    [JobType.MAGYE_GENERAL_7]: 2.5,
    [JobType.MAGYE_GENERAL_6]: 3.0,
    [JobType.MAGYE_GENERAL_5]: 3.5,
    [JobType.MAGYE_GENERAL_4]: 4.0,
    [JobType.MAGYE_GENERAL_3]: 4.5,
    [JobType.MAGYE_GENERAL_2]: 5.0,
    [JobType.MAGYE_GENERAL_1]: 6.0,
    [JobType.DEMON_GOD]: 10.0,
};
interface Props {
    character: Character;
    onClose: () => void;
    onUpdateCharacter: (newChar: Character, logMsg: string) => void;
}

const DECREE_CONFIG = [
    { id: 'soul_harvest', label: '영혼 대수확', costFear: 50, goldGain: 50000, infamyGain: 30, desc: '도시 전체의 영혼을 강제로 정제하여 막대한 자금을 확보합니다.' },
    { id: 'abyss_experiment', label: '심연의 생체실험', costFear: 100, statGain: 10, infamyGain: 100, desc: '대원들의 신체에 심연의 기운을 주입하여 영구적으로 능력을 강화합니다. (All Stats +10)' },
    { id: 'terror_parade', label: '공포의 대행진', costFear: -200, corruptionGain: 50, infamyGain: 50, desc: '공포 정치를 통해 도시의 타락도를 높이고 반란의 싹을 자릅니다.' },
    { id: 'mass_enslavement', label: '대규모 강제징용', costFear: 150, materialGain: 20, infamyGain: 80, desc: '백성들을 노역에 동원하여 대량의 식량, 목재, 석재, 약초 및 마정석을 생산합니다.' },
];

const MagyeDominionModal: React.FC<Props> = ({ character, onClose, onUpdateCharacter }) => {
    const [activeTab, setActiveTab] = useState<'overview' | 'extraction' | 'decree' | 'facility' | 'personnel'| 'beast' | 'equipment' | 'monsterTransform'>('overview');
    const [resultData, setResultData] = useState<ResultData | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isPersonnelOpen, setIsPersonnelOpen] = useState(false);
    const [isBeastModalOpen, setIsBeastModalOpen] = useState(false);
    const [isRebellionOpen, setIsRebellionOpen] = useState(false);
    const [isEquipmentOpen, setIsEquipmentOpen] = useState(false);


    const loc = character.currentLocation || { region: '마계', nation: '임페리얼 제국', city: '임페리얼' };
    const city = loc.city;
    const currentMonth = character.currentDate?.substring(0, 7);
    const currentYear = parseInt(character.currentDate?.split('-')[0] || '2000');

    // 통치 데이터 로드 (없으면 초기화)
    const dominion: DominionData = character.magyeDominions?.[city] || {
        fear: 0,
        corruption: 0,
        facilityLevels: { 'harvester': 1, 'breeder': 1, 'torture': 1 },
        personnel: { overseerIds: [], executionerIds: [] }
    };

    // [NEW] 현재 도시의 지배자 및 등급 지수 계산
    const allComps = [...character.companions, ...(character.inactiveCompanions || [])];
    const requiredDominionJob = MAGYE_DOMINION_MAP[city || ''];
    let activeDominator: any = null;
    if (requiredDominionJob) {
        if (character.job === requiredDominionJob) activeDominator = character;
        else activeDominator = allComps.find(c => c.job === requiredDominionJob) || null;
    }
    
    const rankCoef = activeDominator?.job ? (GENERAL_RANK_COEF[activeDominator.job as JobType] || 0.1) : 0.1;
    
    // [NEW] 감독관 보너스 계산 (공포의 칙령 효율 증대)
    const overseerCount = dominion.personnel?.overseerIds.length || 0;
    const overseerMult = Math.min(5.0, 1.0 + (overseerCount * 0.5));

    // [NEW] 반역 가능 여부 (플레이어가 제1 제너럴일 때)
    const isFirstGeneral = character.job === JobType.MAGYE_GENERAL_1;

    const updateDominion = (updates: Partial<DominionData>, logMsg: string, rewards?: any) => {
        const newChar = { ...character };
        if (!newChar.magyeDominions) newChar.magyeDominions = {};
        
        newChar.magyeDominions[city] = { ...dominion, ...updates };
        
        if (rewards) {
            if (rewards.gold) newChar.money += rewards.gold;
            if (rewards.infamy) {
                newChar.infamy = (newChar.infamy || 0) + rewards.infamy;

                // 해당 도시 지배자가 플레이어가 아닌 동료인 경우 해당 동료의 악명도 함께 상승
                if (activeDominator && activeDominator.id !== character.id) {
                    const targetComp = newChar.companions.find(c => c.id === activeDominator.id) ||
                                       newChar.inactiveCompanions?.find(c => c.id === activeDominator.id);
                    if (targetComp) {
                        targetComp.infamy = (targetComp.infamy || 0) + rewards.infamy;
                    }
                }
            }
            
            // 대규모 강제징용 보상 처리
            if (rewards.massResources && newChar.base) {
                const r = rewards.massResources;
                newChar.base.resources.food += r.food;
                newChar.base.resources.wood += r.wood;
                newChar.base.resources.stone += r.stone;
                newChar.base.resources.herbs += r.herbs;
                newChar.base.resources.manaCrystal += r.manaCrystal;
            }

            if (rewards.materials) {
                for (let i = 0; i < rewards.materials; i++) {
                    newChar.inventory.push({
                        name: "마력의 정수", type: "Etc", rarity: ItemRarity.UNIQUE, description: "정제된 마계의 정수.", enhancement: 0
                    });
                }
            }
            if (rewards.stats) {
                const boost = rewards.stats;
                const apply = (entity: any) => {
                    entity.stats.str += boost; entity.stats.int += boost; entity.stats.def += boost;
                    entity.stats.agi += boost; entity.stats.wis += boost; entity.stats.ctrl += boost;
                };
                apply(newChar);
                newChar.companions.forEach(apply);
                if (newChar.inactiveCompanions) newChar.inactiveCompanions.forEach(apply);
            }
        }

        onUpdateCharacter(newChar, logMsg);
    };

    const handleExtraction = () => {
        if (dominion.lastExtractionDate === currentMonth) {
            alert("이번 달 정제는 이미 완료되었습니다.");
            return;
        }

        setIsProcessing(true);
        setTimeout(() => {
            const harvesterLv = dominion.facilityLevels['harvester'] || 1;
            // [MODIFIED] 감독관 보너스 적용
            const baseGain = Math.floor(harvesterLv * 5 + (dominion.corruption / 100) * 10);
            const crystalGain = Math.floor(baseGain * overseerMult);
            const essenceGain = Math.random() < (dominion.corruption / 1000) ? 1 : 0;

            const newChar = { ...character };
            if (newChar.base) newChar.base.resources.manaCrystal += crystalGain;
            if (essenceGain > 0) {
                newChar.inventory.push({ name: "마력의 정수", type: "Etc", rarity: ItemRarity.UNIQUE, description: "도시의 타락한 기운에서 추출된 정수.", enhancement: 0 });
            }

            // [MODIFIED] 감독관 배치 시 공포도 소폭 하락 리스크
            const fearLoss = overseerCount * 5;

            updateDominion({ 
                lastExtractionDate: currentMonth, 
                corruption: Math.max(0, dominion.corruption - 50),
                fear: Math.max(0, dominion.fear - fearLoss)
            }, `[죄악 정제] ${city}의 기운을 정제하여 마정석 ${crystalGain}개를 획득했습니다. (감독관 보너스 x${overseerMult.toFixed(1)})`);
            
            setResultData({
                type: 'success',
                title: '죄악 정제 완료',
                message: `도시 주민들의 절망과 타락을 마력으로 치환했습니다.\n감독관들의 압박으로 생산량이 ${overseerMult.toFixed(1)}배 증가했습니다.`,
                items: [
                    { label: '획득 마정석', after: `+${crystalGain}` },
                    { label: '마력의 정수', after: essenceGain > 0 ? '+1' : '실패' },
                    { label: '공포도 하락', after: `-${fearLoss} (감독관 리스크)` }
                ]
            });
            setIsProcessing(false);
        }, 1200);
    };

    const handleExecuteDecree = (decree: typeof DECREE_CONFIG[0]) => {
        if (dominion.lastDecreeYear === currentYear) {
            alert("칙령은 1년에 한 번만 공포할 수 있습니다.");
            return;
        }

        if (dominion.fear < decree.costFear && decree.costFear > 0) {
            alert("칙령을 실행하기 위한 공포 수치가 부족합니다.");
            return;
        }

        setIsProcessing(true);
        setTimeout(() => {
            const rewards: any = { infamy: decree.infamyGain };
            const lv = character.level || 1;
      // [MODIFIED] 감독관 보너스(overseerMult) 적용
            const finalCoef = rankCoef * overseerMult;

            if (decree.id === 'soul_harvest') rewards.gold = Math.floor(decree.goldGain * finalCoef);
            if (decree.id === 'abyss_experiment') rewards.stats = Math.floor(decree.statGain * finalCoef);
            
            if (decree.id === 'mass_enslavement') {
                rewards.materials = Math.floor(decree.materialGain * finalCoef);
                rewards.massResources = {
                    food: Math.floor(lv * finalCoef),
                    wood: Math.floor(lv * finalCoef),
                    stone: Math.floor(lv * finalCoef),
                    herbs: Math.floor(lv * finalCoef),
                    manaCrystal: Math.floor(lv * finalCoef)
                };
            }

            let nextFear = Math.max(0,dominion.fear - decree.costFear);
            let nextCorruption = dominion.corruption;
            if (decree.id === 'terror_parade') nextCorruption = nextCorruption + Math.floor(decree.corruptionGain * rankCoef);

            updateDominion({ 
                lastDecreeYear: currentYear, 
                fear: nextFear,
                corruption: nextCorruption 
            }, `[칙령 집행] ${city}에 '${decree.label}'을(를) 공포했습니다. (최종 보정 x${finalCoef.toFixed(1)} 적용)`, rewards);

            const resultItems: any[] = [
                { label: '집행 칙령', after: decree.label },
                { label: '최종 보정', after: `x${finalCoef.toFixed(1)} (서열+감독관)` },
                { label: '악명 상승', after: `+${decree.infamyGain}` }
            ];

            if (rewards.gold) resultItems.push({ label: '국고 환수', after: `${rewards.gold.toLocaleString()} G` });
            if (rewards.stats) resultItems.push({ label: '영구 스탯 보너스', after: `+${rewards.stats}` });
            
            if (rewards.massResources) {
                const r = rewards.massResources;
                resultItems.push({ label: '확보 식량', after: `+${r.food}` });
                resultItems.push({ label: '확보 목재', after: `+${r.wood}` });
                resultItems.push({ label: '확보 석재', after: `+${r.stone}` });
                resultItems.push({ label: '확보 약초', after: `+${r.herbs}` });
                resultItems.push({ label: '확보 마정석', after: `+${r.manaCrystal}` });
            }

            setResultData({
                type: 'levelup',
                title: '칙령 집행 성공',
                message: `지배자의 엄중한 명령이 ${city} 전체에 퍼졌습니다.\n현재 지배자의 서열(${activeDominator?.job})에 따른 보상이 지급되었습니다.`,
                items: resultItems
            });
            setIsProcessing(false);
        }, 1500);
    };

    const handleUpgradeFacility = (fid: string) => {
        const curLv = dominion.facilityLevels[fid] || 1;
        if (curLv >= 5) return;

       
        const goldCost = curLv * 100000;
        const crystalCost = curLv * 100;

        if (character.money < goldCost || (character.base?.resources.manaCrystal || 0) < crystalCost) {
            alert("업그레이드 자원이 부족합니다.");
            return;
        }

        const newChar = { ...character };
        newChar.money -= goldCost;
        if (newChar.base) newChar.base.resources.manaCrystal -= crystalCost;

        const nextLevels = { ...dominion.facilityLevels, [fid]: curLv + 1 };
        updateDominion({ facilityLevels: nextLevels }, `[시설 강화] ${city}의 심연 시설을 Lv.${curLv + 1}(으)로 업그레이드했습니다.`);
        
        setResultData({
            type: 'success',
            title: '시설 업그레이드',
            message: '지배지 내부의 마력 가동 시설이 더욱 견고해졌습니다.',
            items: [
                { label: '시설 레벨', before: `Lv.${curLv}`, after: `Lv.${curLv + 1}` },
                { label: '소모 골드', after: `-${goldCost.toLocaleString()} G` }
            ]
        });
    };

    const [transformSort, setTransformSort] = useState<'levelDesc' | 'levelAsc' | 'nameAsc' | 'powerDesc' | 'element'>('levelDesc');

    const handleTransformToMonster = (comp: Companion) => {
        const crystalCost = 50;
        const fearCost = 20;
        const fragmentCost = 1;

        const currentCrystals = character.base?.resources?.manaCrystal || 0;
        const currentFear = dominion.fear;
        const currentFragments = character.inventory.filter(item => item.name === '종말의 파편').length;

        const missingItems: { label: string; before: string; after: string }[] = [];

        if (currentCrystals < crystalCost) {
            missingItems.push({ label: '마정석', before: `${currentCrystals}개`, after: `필요 ${crystalCost}개` });
        }
        if (currentFear < fearCost) {
            missingItems.push({ label: '공포도', before: `${currentFear}`, after: `필요 ${fearCost}` });
        }
        if (currentFragments < fragmentCost) {
            missingItems.push({ label: '종말의 파편', before: `${currentFragments}개`, after: `필요 ${fragmentCost}개` });
        }

        if (missingItems.length > 0) {
            setResultData({
                type: 'warning',
                title: '개조 재료 부족',
                message: `'${comp.name}' 대원을 마물로 개조하기 위한 의식 재료가 부족합니다.`,
                items: missingItems
            });
            return;
        }

        if (!confirm(`정말로 '${comp.name}' 대원을 마물로 개조하시겠습니까?\n동료 신분이 해제되고 마계 사육소의 수호 마수로 귀속됩니다.`)) {
            return;
        }

        setIsProcessing(true);
        setTimeout(() => {
            const newChar = JSON.parse(JSON.stringify(character)) as Character;

            if (newChar.base?.resources) {
                newChar.base.resources.manaCrystal = Math.max(0, newChar.base.resources.manaCrystal - crystalCost);
            }

            const fragIdx = newChar.inventory.findIndex((item: Item) => item.name === '종말의 파편');
            if (fragIdx !== -1) {
                newChar.inventory.splice(fragIdx, 1);
            }

            newChar.companions = newChar.companions.filter((c: Companion) => c.id !== comp.id);
            if (newChar.inactiveCompanions) {
                newChar.inactiveCompanions = newChar.inactiveCompanions.filter((c: Companion) => c.id !== comp.id);
            }

            let rank: 'C' | 'B' | 'A' | 'S' | 'SS' | 'SSS' = 'B';
            if (comp.level >= 1000) rank = 'SSS';
            else if (comp.level >= 700) rank = 'SS';
            else if (comp.level >= 400) rank = 'S';
            else if (comp.level >= 200) rank = 'A';
            else if (comp.level >= 100) rank = 'B';
            else rank = 'C';

            const newMonster: CapturedMonster = {
                id: `transformed_${comp.id}_${Date.now()}`,
                name: `[개조된 마물] ${comp.name}`,
                level: comp.level || 1,
                rank: rank as any,
                stage: '성체' as any,
                stats: { ...comp.stats },
                shinryokuType: comp.shinryokuType,
                description: `마계의 심연 의식을 통해 인간의 몸을 버리고 완벽한 마수로 거듭난 ${comp.name}입니다.`,
                visualUrl: comp.visualUrl
            };

            if (!newChar.base) newChar.base = {} as any;
            if (!newChar.base.capturedMonsters) newChar.base.capturedMonsters = [];
            newChar.base.capturedMonsters.push(newMonster);

            if (!newChar.magyeDominions) newChar.magyeDominions = {};
            if (newChar.magyeDominions[city]) {
                newChar.magyeDominions[city].fear = Math.max(0, newChar.magyeDominions[city].fear - fearCost);
                newChar.magyeDominions[city].corruption = Math.min(1000, newChar.magyeDominions[city].corruption + 30);
            }

            onUpdateCharacter(newChar, `[심연 개조] 동료 '${comp.name}'을(를) 마물로 성공적으로 개조했습니다.`);

            setResultData({
                type: 'levelup',
                title: '마물 개조 완료',
                message: `'${comp.name}'이(가) 심연의 의식을 받아 완전한 마수로 다시 태어났습니다.\n사육소 및 수호 마수 관리에서 확인하실 수 있습니다.`,
                items: [
                    { label: '마물명', after: newMonster.name },
                    { label: '마물 등급', after: rank },
                    { label: '소모 마정석', after: `-${crystalCost}` },
                    { label: '소모 종말의 파편', after: `-${fragmentCost}` },
                    { label: '타락도 상승', after: '+30' }
                ]
            });

            setIsProcessing(false);
        }, 1200);
    };

    
return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-in fade-in">
            {resultData && <ActionResultModal data={resultData} onClose={() => { setResultData(null); }} />}
            {isPersonnelOpen && <MagyePersonnelModal character={character} city={city} onClose={() => setIsPersonnelOpen(false)} onUpdateCharacter={onUpdateCharacter} />}
            {isBeastModalOpen && <MagyeBeastManagementModal character={character} city={city} onClose={() => setIsBeastModalOpen(false)} onUpdateCharacter={onUpdateCharacter} />}
            {isRebellionOpen && <MagyeRebellionModal character={character} onClose={() => setIsRebellionOpen(false)} onUpdateCharacter={onUpdateCharacter} />}
            {isEquipmentOpen && <MagyeEquipmentModal character={character} onClose={() => setIsEquipmentOpen(false)} onUpdateCharacter={onUpdateCharacter} />}

            <div className="bg-slate-900 border-2 border-purple-600 w-full max-w-4xl h-[85vh] rounded-[2.5rem] shadow-[0_0_80px_rgba(168,85,247,0.3)] flex flex-col overflow-hidden relative">
                
                <div className="absolute inset-0 opacity-10 pointer-events-none">
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/black-scales.png')]"></div>
                    <div className="absolute bottom-0 left-0 w-full h-full bg-[radial-gradient(circle_at_bottom_left,_var(--tw-gradient-stops))] from-purple-600/20 via-transparent to-transparent"></div>
                </div>

                <div className="p-6 border-b border-purple-900/50 bg-slate-950 flex justify-between items-center shrink-0 z-10">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-purple-700 rounded-2xl shadow-lg">
                            <TowerControl size={32} className="text-white animate-pulse" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-white font-cinzel tracking-widest uppercase">DOMINION MANAGEMENT</h2>
                            <div className="flex items-center gap-2 mt-1">
                                <p className="text-xs text-purple-400 font-bold">{city} 지배자: {activeDominator?.name || '미정'}</p>
                                <span className="text-[10px] bg-amber-900/50 text-amber-200 px-2 py-0.5 rounded border border-amber-500/30 font-bold">보정 지수: x{(rankCoef * overseerMult).toFixed(1)}</span>
                            </div>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-slate-500 hover:text-white p-2 rounded-full hover:bg-slate-800 transition-colors"><X size={28}/></button>
                </div>

                <div className="flex border-b border-slate-800 bg-slate-950 shrink-0 overflow-x-auto no-scrollbar z-10">
                    <button onClick={() => setActiveTab('overview')} className={`flex-1 py-4 px-6 text-xs font-bold flex items-center justify-center transition-all border-b-2 whitespace-nowrap ${activeTab === 'overview' ? 'text-purple-400 border-purple-500 bg-slate-900' : 'text-slate-500 border-transparent hover:text-slate-300'}`}>
                        <TrendingUp size={16} className="mr-2"/> 통치 지표
                    </button>
                    <button onClick={() => setIsPersonnelOpen(true)} className={`flex-1 py-4 px-6 text-xs font-bold flex items-center justify-center transition-all border-b-2 whitespace-nowrap text-slate-500 border-transparent hover:text-slate-300`}>
                        <Users size={16} className="mr-2"/> 인사 관리
                    </button>
                    <button onClick={() => setIsBeastModalOpen(true)} className={`flex-1 py-4 px-6 text-xs font-bold flex items-center justify-center transition-all border-b-2 whitespace-nowrap text-slate-500 border-transparent hover:text-slate-300`}>
                        <Ghost size={16} className="mr-2"/> 마수 관리
                    </button>
                    <button onClick={() => setActiveTab('monsterTransform')} className={`flex-1 py-4 px-6 text-xs font-bold flex items-center justify-center transition-all border-b-2 whitespace-nowrap ${activeTab === 'monsterTransform' ? 'text-purple-400 border-purple-500 bg-slate-900' : 'text-slate-500 border-transparent hover:text-slate-300'}`}>
                        <Skull size={16} className="mr-2"/> 마물 개조
                    </button>
                    <button onClick={() => setActiveTab('extraction')} className={`flex-1 py-4 px-6 text-xs font-bold flex items-center justify-center transition-all border-b-2 whitespace-nowrap ${activeTab === 'extraction' ? 'text-purple-400 border-purple-500 bg-slate-900' : 'text-slate-500 border-transparent hover:text-slate-300'}`}>
                        <RefreshCw size={16} className="mr-2"/> 죄악 정제
                    </button>
                    <button onClick={() => setActiveTab('decree')} className={`flex-1 py-4 px-6 text-xs font-bold flex items-center justify-center transition-all border-b-2 whitespace-nowrap ${activeTab === 'decree' ? 'text-purple-400 border-purple-500 bg-slate-900' : 'text-slate-500 border-transparent hover:text-slate-300'}`}>
                        <Gavel size={16} className="mr-2"/> 공포의 칙령
                    </button>
                    <button onClick={() => setActiveTab('facility')} className={`flex-1 py-4 px-6 text-xs font-bold flex items-center justify-center transition-all border-b-2 whitespace-nowrap ${activeTab === 'facility' ? 'text-purple-400 border-purple-500 bg-slate-900' : 'text-slate-500 border-transparent hover:text-slate-300'}`}>
                        <Hammer size={16} className="mr-2"/> 심연 시설
                    </button>
                    <button onClick={() => setIsEquipmentOpen(true)} className={`flex-1 py-4 px-6 text-xs font-bold flex items-center justify-center transition-all border-b-2 whitespace-nowrap text-slate-500 border-transparent hover:text-slate-300`}>
                        <Sword size={16} className="mr-2"/> 마계 장비 강화
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-8 bg-slate-900 custom-scrollbar z-10 space-y-8">
                    
                    {activeTab === 'overview' && (
                        <div className="max-w-3xl mx-auto space-y-10 animate-in slide-in-from-bottom-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="bg-slate-950 p-6 rounded-[2rem] border border-red-900/30 flex flex-col items-center text-center space-y-4 shadow-xl">
                                    <ShieldAlert size={48} className="text-red-500 animate-pulse" />
                                    <div>
                                        <h4 className="text-sm font-bold text-red-400 uppercase tracking-widest">Fear Level (공포도)</h4>
                                        <div className="text-3xl font-black text-white font-mono mt-1">{dominion.fear}</div>
                                    </div>
                                    <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                                        <div className="h-full bg-red-600" style={{ width: `${dominion.fear / 10}%` }}></div>
                                    </div>
                                    <p className="text-[10px] text-slate-500">높을수록 칙령 집행 가능성이 커지지만 반란 확률이 상승합니다.</p>
                                </div>
                                <div className="bg-slate-950 p-6 rounded-[2rem] border border-purple-900/30 flex flex-col items-center text-center space-y-4 shadow-xl">
                                    <Flame size={48} className="text-purple-500" />
                                    <div>
                                        <h4 className="text-sm font-bold text-purple-400 uppercase tracking-widest">Corruption (타락도)</h4>
                                        <div className="text-3xl font-black text-white font-mono mt-1">{dominion.corruption}</div>
                                    </div>
                                    <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                                        <div className="h-full bg-purple-600" style={{ width: `${dominion.corruption / 10}%` }}></div>
                                    </div>
                                    <p className="text-[10px] text-slate-500">높을수록 마정석 및 정제물 획득 확률이 상승합니다.</p>
                                </div>
                            </div>

                            {/* [NEW] 제1제너럴 전용 반역 버튼 */}
                            {isFirstGeneral && (
                                <button 
                                    onClick={() => setIsRebellionOpen(true)}
                                    className="w-full p-8 bg-gradient-to-r from-red-950 via-red-900 to-slate-950 border-2 border-amber-500 rounded-[2.5rem] flex items-center justify-between group shadow-[0_0_50px_rgba(239,68,68,0.4)] animate-pulse"
                                >
                                    <div className="flex items-center gap-6">
                                        <div className="p-4 bg-red-800 rounded-2xl border border-red-500 shadow-xl group-hover:scale-110 transition-transform">
                                            <Sword size={40} className="text-white"/>
                                        </div>
                                        <div className="text-left">
                                            <h4 className="text-2xl font-black text-white font-cinzel tracking-widest">SUPREME REBELLION</h4>
                                            <p className="text-sm text-amber-400 font-bold">마신 임페리얼에 도전하여 옥좌를 찬탈하십시오.</p>
                                        </div>
                                    </div>
                                    <ChevronRight size={40} className="text-amber-500 group-hover:translate-x-2 transition-transform" />
                                </button>
                            )}

                            <div className="bg-black/30 p-6 rounded-3xl border border-white/5 space-y-4">
                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2"><Info size={16} className="text-indigo-400"/> 지배자 권한 안내</h4>
                                <ul className="text-[11px] text-slate-500 space-y-2 list-disc list-inside leading-relaxed">
                                    <li>칙령 보상은 지배자의 서열(제11제너럴~마신)에 따라 <span className="text-amber-400 font-bold">x0.5 ~ x10.0</span>배 차등 지급됩니다.</li>
                                    <li>노예 감독관을 배치하면 생산 효율과 칙령 보상을 <span className="text-amber-400 font-bold">최대 5배</span>까지 증폭할 수 있습니다.</li>
                                    <li>공포도는 매년 점검하며, 타락도가 500 이하일 경우 낮은 만큼 하락합니다. 처형인을 배치하여 이를 막으십시오.</li>
                                    <li>고문관은 매달 지배자의 CTRL/INT 능력치에 비례하여 공포도를 자동으로 생성합니다.</li>
                                </ul>
                            </div>
                        </div>
                    )}

                    {activeTab === 'monsterTransform' && (() => {
                        const sortedTransformComps = [...allComps].sort((a, b) => {
                            if (transformSort === 'levelDesc') return (b.level || 0) - (a.level || 0);
                            if (transformSort === 'levelAsc') return (a.level || 0) - (b.level || 0);
                            if (transformSort === 'nameAsc') return a.name.localeCompare(b.name, 'ko');
                            if (transformSort === 'powerDesc') {
                                const pA = (a.stats?.str || 0) + (a.stats?.int || 0) + (a.stats?.maxHp || 0);
                                const pB = (b.stats?.str || 0) + (b.stats?.int || 0) + (b.stats?.maxHp || 0);
                                return pB - pA;
                            }
                            if (transformSort === 'element') return (a.shinryokuType || '').localeCompare(b.shinryokuType || '', 'ko');
                            return 0;
                        });

                        const fragmentCount = character.inventory.filter(item => item.name === '종말의 파편').length;

                        return (
                            <div className="space-y-6 animate-in slide-in-from-bottom-4">
                                <div className="bg-slate-950/80 p-5 rounded-2xl border border-purple-900/50 shadow-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                    <div className="space-y-1">
                                        <h3 className="text-lg font-bold text-purple-200 flex items-center gap-2">
                                            <Skull className="text-purple-400" size={22} />
                                            <span>심연의 동료 마물 개조</span>
                                        </h3>
                                        <p className="text-xs text-slate-400 leading-relaxed">
                                            마계 지배자의 특수 권능으로 대원의 인간 육체를 개조하여 마수로 변환시킵니다.
                                            개조된 마물은 사육소 및 마수 수호자로 배치할 수 있습니다.
                                        </p>
                                    </div>
                                    <div className="flex flex-wrap gap-2 text-xs font-medium">
                                        <span className="px-3 py-1.5 rounded-xl bg-purple-950/80 border border-purple-700/60 text-purple-300 flex items-center gap-1">
                                            <Gem size={14} className="text-purple-400" /> 소모 마정석: 50개
                                        </span>
                                        <span className="px-3 py-1.5 rounded-xl bg-red-950/80 border border-red-700/60 text-red-300 flex items-center gap-1">
                                            <ShieldAlert size={14} className="text-red-400" /> 필요 공포도: 20
                                        </span>
                                        <span className="px-3 py-1.5 rounded-xl bg-amber-950/80 border border-amber-700/60 text-amber-300 flex items-center gap-1">
                                            <Sparkles size={14} className="text-amber-400" /> 종말의 파편: 1개 (보유: {fragmentCount}개)
                                        </span>
                                    </div>
                                </div>

                                <div className="flex justify-between items-center bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                                    <span className="text-xs font-bold text-slate-300">
                                        개조 가능 동료: <span className="text-purple-400">{allComps.length}명</span>
                                    </span>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-slate-400 font-medium">정렬 기준:</span>
                                        <select
                                            value={transformSort}
                                            onChange={(e) => setTransformSort(e.target.value as any)}
                                            className="bg-slate-900 border border-slate-700 text-xs text-slate-200 rounded-lg px-2.5 py-1.5 focus:border-purple-500 outline-none"
                                        >
                                            <option value="levelDesc">레벨 높은순</option>
                                            <option value="levelAsc">레벨 낮은순</option>
                                            <option value="powerDesc">전투력 높은순</option>
                                            <option value="nameAsc">이름순</option>
                                            <option value="element">신력 속성순</option>
                                        </select>
                                    </div>
                                </div>

                                {sortedTransformComps.length === 0 ? (
                                    <div className="text-center py-16 bg-slate-950/40 rounded-3xl border border-slate-800">
                                        <Ghost size={48} className="mx-auto mb-3 text-slate-600" />
                                        <p className="text-sm font-bold text-slate-400">개조 가능한 동료가 없습니다.</p>
                                        <p className="text-xs text-slate-600 mt-1">새로운 대원을 영입한 후 다시 시도해 주세요.</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {sortedTransformComps.map(comp => {
                                            let rank = 'B';
                                            if (comp.level >= 1000) rank = 'SSS';
                                            else if (comp.level >= 700) rank = 'SS';
                                            else if (comp.level >= 400) rank = 'S';
                                            else if (comp.level >= 200) rank = 'A';
                                            else if (comp.level >= 100) rank = 'B';
                                            else rank = 'C';

                                            return (
                                                <div 
                                                    key={comp.id} 
                                                    className="bg-slate-950 p-5 rounded-2xl border border-slate-800 hover:border-purple-600/70 transition-all flex flex-col justify-between space-y-4 shadow-md group relative overflow-hidden"
                                                >
                                                    <div className="flex items-start gap-3.5">
                                                        {comp.visualUrl ? (
                                                            <img 
                                                                src={comp.visualUrl} 
                                                                alt={comp.name} 
                                                                className="w-14 h-14 rounded-xl object-cover border border-purple-900/60 shrink-0 shadow-md group-hover:scale-105 transition-transform" 
                                                            />
                                                        ) : (
                                                            <div className="w-14 h-14 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0">
                                                                <Users size={24} className="text-slate-600" />
                                                            </div>
                                                        )}

                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center justify-between gap-2">
                                                                <h4 className="font-bold text-white text-base truncate">{comp.name}</h4>
                                                                <span className="text-xs font-black text-amber-400 px-2 py-0.5 rounded bg-amber-950/60 border border-amber-800/80 shrink-0">
                                                                    예상 등급: {rank}
                                                                </span>
                                                            </div>
                                                            <div className="text-xs text-slate-400 mt-1 flex flex-wrap gap-x-2 gap-y-0.5">
                                                                <span>Lv.{comp.level || 1}</span>
                                                                <span>•</span>
                                                                <span>{(comp as any).combatClass || comp.classType || comp.job || '전사'}</span>
                                                                {comp.shinryokuType && (
                                                                    <>
                                                                        <span>•</span>
                                                                        <span className="text-purple-300">{comp.shinryokuType}</span>
                                                                    </>
                                                                )}
                                                            </div>
                                                            <div className="text-[11px] text-slate-500 mt-1 font-mono">
                                                                체력 {comp.stats?.maxHp || 100} / 공격력 {(comp.stats?.str || 10) + (comp.stats?.int || 10)}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="pt-2 border-t border-slate-900 flex justify-between items-center">
                                                        <span className="text-[11px] text-slate-500">
                                                            {comp.isSpouse ? '배우자 (개조 시 인연 소멸)' : comp.isCoreMember ? '핵심 대원' : '일반 대원'}
                                                        </span>
                                                        <button
                                                            onClick={() => handleTransformToMonster(comp)}
                                                            disabled={isProcessing}
                                                            className="px-4 py-2 rounded-xl bg-purple-900/80 hover:bg-purple-700 text-white text-xs font-bold transition-all shadow-md active:scale-95 flex items-center gap-1.5 border border-purple-600/50"
                                                        >
                                                            <Skull size={14} />
                                                            <span>마물로 개조</span>
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        );
                    })()}

                    {activeTab === 'extraction' && (
                        <div className="flex flex-col items-center justify-center py-10 space-y-8 animate-in zoom-in-95 h-full">
                            <div className="relative">
                                <div className="absolute inset-0 bg-purple-500 blur-[80px] opacity-20"></div>
                                <RefreshCw size={120} className={`text-purple-500 relative z-10 ${isProcessing ? 'animate-spin' : 'animate-spin-slow'}`} />
                            </div>
                            <div className="text-center space-y-2 max-w-sm">
                                <h3 className="text-2xl font-bold text-white uppercase tracking-tighter">Soul Refinement</h3>
                                <p className="text-sm text-slate-400">도시의 타락한 기운을 모아 순수한 마력 결정체로 정제합니다.</p>
                                <div className="mt-4 p-4 bg-slate-950 rounded-2xl border border-purple-500/30 flex justify-between text-xs">
                                    <span className="text-slate-500">예상 획득 마정석</span>
                                    <span className="text-purple-400 font-bold font-mono">+{Math.floor((dominion.facilityLevels['harvester'] || 1) * 5 + (dominion.corruption / 100) * 10 * overseerMult)}</span>
                                </div>
                                <p className="text-[9px] text-amber-500 mt-1">감독관 보정 x{overseerMult.toFixed(1)} 적용됨</p>
                            </div>
                            <button 
                                onClick={handleExtraction} 
                                disabled={isProcessing || dominion.lastExtractionDate === currentMonth}
                                className={`px-12 py-5 rounded-full font-bold text-lg shadow-xl transition-all transform active:scale-95 flex items-center gap-3 ${dominion.lastExtractionDate === currentMonth ? 'bg-slate-800 text-slate-600 cursor-not-allowed' : 'bg-purple-700 hover:bg-purple-600 text-white shadow-purple-900/40'}`}
                            >
                                {isProcessing ? <Loader2 className="animate-spin"/> : <Zap size={20}/>}
                                {dominion.lastExtractionDate === currentMonth ? '이번 달 정제 완료' : '정제 프로세스 가동'}
                            </button>
                        </div>
                    )}

                    {activeTab === 'decree' && (
                        <div className="space-y-6 animate-in slide-in-from-right-4">
                            <div className="flex justify-between items-center bg-slate-950/50 p-4 rounded-2xl border border-red-900/30">
                                <div>
                                    <h3 className="text-lg font-bold text-red-100 flex items-center gap-2"><Gavel size={20}/> 지배자의 칙령 (Decrees)</h3>
                                    <p className="text-[10px] text-slate-500">서열 및 감독관 보정 지수 <span className="text-amber-400">x{(rankCoef * overseerMult).toFixed(1)}</span>가 보상에 반영됩니다.</p>
                                </div>
                                <div className={`text-xs font-bold px-3 py-1 rounded-full border ${dominion.lastDecreeYear === currentYear ? 'bg-red-950/40 text-red-500 border-red-900' : 'bg-green-950/40 text-green-500 border-green-900'}`}>
                                    {dominion.lastDecreeYear === currentYear ? '올해 집행 완료' : '집행 가능'}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {DECREE_CONFIG.map(decree => {
                                    const finalCoef = rankCoef * overseerMult;
                                    return (
                                        <button
                                            key={decree.id}
                                            disabled={isProcessing || dominion.lastDecreeYear === currentYear || (decree.costFear > 0 && dominion.fear < decree.costFear)}
                                            onClick={() => handleExecuteDecree(decree)}
                                            className="bg-slate-950 p-6 rounded-3xl border border-slate-800 hover:border-red-600 transition-all text-left group relative overflow-hidden"
                                        >
                                            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><Skull size={60}/></div>
                                            <div className="flex justify-between items-start mb-2">
                                                <h4 className="text-xl font-bold text-white group-hover:text-red-400">{decree.label}</h4>
                                                <span className={`text-[10px] font-bold ${decree.costFear > 0 ? 'text-red-500' : 'text-green-500'}`}>
                                                    {decree.costFear > 0 ? `Fear -${decree.costFear}` : `Corruption +${Math.floor(decree.corruptionGain * rankCoef)}`}
                                                </span>
                                            </div>
                                            <p className="text-xs text-slate-500 leading-relaxed mb-4">"{decree.desc}"</p>
                                            
                                            <div className="space-y-1 mb-4 bg-black/40 p-2 rounded-xl">
                                                <p className="text-[10px] text-slate-500 font-bold uppercase">Expected Rewards</p>
                                                {decree.id === 'soul_harvest' && <p className="text-xs text-amber-400 font-mono">+{Math.floor(decree.goldGain * finalCoef).toLocaleString()} G</p>}
                                                {decree.id === 'abyss_experiment' && <p className="text-xs text-purple-400 font-mono">All Stats +${Math.floor(decree.statGain * finalCoef)}</p>}
                                                {decree.id === 'mass_enslavement' && (
                                                    <div className="text-[9px] text-green-400 font-mono">
                                                        <p>마력의 정수 x{Math.floor(decree.materialGain * finalCoef)}</p>
                                                        <p>대량의 기초 자원 (Level x {finalCoef.toFixed(1)})</p>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 bg-slate-900 p-2 rounded-xl">
                                                <span>악명 상승: +{decree.infamyGain}</span>
                                                <ChevronRight size={14}/>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {activeTab === 'facility' && (
                        <div className="max-w-2xl mx-auto space-y-6 animate-in slide-in-from-left-4">
                            <h3 className="text-lg font-bold text-indigo-400 flex items-center gap-2"><Hammer size={20}/> 시설 고도화</h3>
                            
                            {[
                                { id: 'harvester', label: '영혼 수확기 (Soul Harvester)', desc: '정제 시 획득하는 마정석 수량이 증가합니다.', icon: RefreshCw },
                                { id: 'breeder', label: '마물 배양장 (Beast Breeder)', desc: '도시 방어력 및 마물 포획 확률에 기여합니다.', icon: Ghost },
                                { id: 'torture', label: '공포의 고문실 (Fear Chamber)', desc: '매달 자동 획득하는 공포 수치가 증가합니다.', icon: Skull },
                            ].map(fac => {
                                const lv = dominion.facilityLevels[fac.id] || 1;
                                const costGold = lv * 100000;
                                const costCrystal = lv * 100;
                                const canUpgrade = character.money >= costGold && (character.base?.resources.manaCrystal || 0) >= costCrystal;

                                return (
                                    <div key={fac.id} className="bg-slate-950 p-6 rounded-[2rem] border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-6 group hover:border-indigo-500/50 transition-all">
                                        <div className="flex items-center gap-5">
                                            <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800 group-hover:text-indigo-400 transition-colors">
                                                <fac.icon size={28}/>
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-white text-lg">{fac.label}</h4>
                                                <p className="text-xs text-slate-500 mt-0.5">{fac.desc}</p>
                                                <div className="mt-2 inline-block px-2 py-0.5 bg-indigo-900/30 text-indigo-300 text-[10px] rounded border border-indigo-900/50 font-bold">Level {lv}</div>
                                            </div>
                                        </div>
                                        {lv < 5 ? (
                                            <button 
                                                onClick={() => handleUpgradeFacility(fac.id)}
                                                disabled={!canUpgrade}
                                                className={`px-6 py-3 rounded-xl font-bold text-xs shadow-lg transition-all flex flex-col items-center ${canUpgrade ? 'bg-indigo-600 hover:bg-indigo-500 text-white transform active:scale-95' : 'bg-slate-800 text-slate-600 cursor-not-allowed border border-slate-700'}`}
                                            >
                                                <span>강화 (Upgrade)</span>
                                                <div className="flex gap-2 mt-1 opacity-80 scale-75">
                                                    <span className="flex items-center gap-1"><Coins size={10}/> {costGold.toLocaleString()}</span>
                                                    <span className="flex items-center gap-1"><Zap size={10}/> {costCrystal}</span>
                                                </div>
                                            </button>
                                        ) : (
                                            <span className="text-xs text-indigo-500 font-bold flex items-center gap-1 uppercase tracking-widest"><CheckCircle size={16}/> MAX</span>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    )}

                </div>

                <div className="p-6 bg-slate-950 border-t border-purple-900/50 flex justify-between items-center shrink-0">
                    <div className="flex gap-8">
                        <div className="flex items-center gap-2">
                            <div className="p-2 bg-purple-900/30 rounded-lg"><Zap size={16} className="text-purple-400"/></div>
                            <div>
                                <p className="text-[10px] text-slate-500 uppercase font-bold">Crystals</p>
                                <p className="text-sm font-mono font-bold text-purple-300">{character.base?.resources.manaCrystal || 0}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="p-2 bg-amber-900/30 rounded-lg"><Coins size={16} className="text-amber-400"/></div>
                            <div>
                                <p className="text-[10px] text-slate-500 uppercase font-bold">Imperial Gold</p>
                                <p className="text-sm font-mono font-bold text-purple-300">{character.money.toLocaleString()} G</p>
                            </div>
                        </div>
                    </div>
                    <button onClick={onClose} className="px-10 py-3 bg-purple-700 hover:bg-purple-600 text-white rounded-xl font-bold shadow-lg shadow-purple-955/40 transition-all active:scale-95">관리 종료</button>
                </div>

                {isProcessing && (
                    <div className="absolute inset-0 bg-black/80 z-[180] flex flex-col items-center justify-center">
                        <Loader2 size={48} className="animate-spin text-purple-500 mb-4" />
                        <p className="text-white font-bold tracking-widest animate-pulse">심연의 마력을 정제 중...</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MagyeDominionModal;
