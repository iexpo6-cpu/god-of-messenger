import React, { useState, useMemo } from 'react';
import { Character, Companion, Item, JobType } from '../types';
import { X, Sun, Sparkles, Shield, Sword, Crown, CheckCircle, AlertTriangle, Loader2, Zap, Users, Flame, Snowflake, Mountain, Droplets, Moon, CloudSun, Leaf, Activity, Ghost, Target, ArrowUpDown, Filter } from 'lucide-react';
import { checkDivineMessengerEligibility, performDivineMessengerAwakening, DIVINE_MESSENGER_CONFIG, MessengerConfig } from '../awakening';
import ActionResultModal, { ResultData } from './ActionResultModal';
import AppearanceChoiceModal from './AppearanceChoiceModal';
import { getDivineOrDemonJobVisualUrl } from '../services/visualManager';
import { getRequiredItemBossInfo, checkEquippedItem, getKoreanSlotName } from '../services/divineEquipmentService';

interface Props {
    character: Character;
    onClose: () => void;
    onUpdateCharacter: (newChar: Character, logMsg: string) => void;
}

const ELEMENT_ICONS: Record<string, any> = {
    "태양계": Sun,
    "화염계": Flame,
    "광휘계": Sparkles,
    "월광계": Moon,
    "전격계": Zap,
    "대지계": Mountain,
    "질풍계": CloudSun,
    "빙결계": Snowflake,
    "해수계": Droplets,
    "강철계": Shield,
    "암흑계": Ghost,
    "초화계": Leaf,
    "무기강화계": Sword,
    "신체강화계": Activity
};

type SortOption = 'level' | 'name' | 'shinryoku' | 'eligible';
type FilterOption = 'all' | 'active' | 'inactive';

const DivineAwakeningModal: React.FC<Props> = ({ character, onClose, onUpdateCharacter }) => {
    const [selectedTargetId, setSelectedTargetId] = useState<string>('player');
    const [resultData, setResultData] = useState<ResultData | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [sortOption, setSortOption] = useState<SortOption>('level');
    const [filterOption, setFilterOption] = useState<FilterOption>('all');
    
    const [pendingVisualModal, setPendingVisualModal] = useState<{
        resultChar: Character;
        targetName: string;
        jobTitle: string;
        currentVisualUrl: string;
        newVisualUrl: string;
        origVisual: string;
    } | null>(null);

    /**
     * 신의 사자 직업군인지 확인하는 헬퍼 함수
     */
    const isMessengerJob = (job?: JobType) => {
        if (!job) return false;
        return [
            JobType.SOLAR_MESSENGER, JobType.FIRE_MESSENGER, JobType.RADIANT_MESSENGER,
            JobType.MOONLIGHT_MESSENGER, JobType.ELECTRIC_MESSENGER, JobType.EARTH_MESSENGER,
            JobType.GALE_MESSENGER, JobType.ICE_MESSENGER, JobType.SEA_MESSENGER,
            JobType.STEEL_MESSENGER, JobType.DARK_MESSENGER, JobType.NATURE_MESSENGER,
            JobType.VOID_MESSENGER
        ].includes(job);
    };

    // 일행 전체의 직업 수집
    const allRawPotentials = [
        { id: 'player', name: `${character.name} (나)`, level: character.level, shinryoku: character.shinryokuType, job: character.job, entity: character, isPlayer: true, isActive: true },
        ...character.companions.map(c => ({ id: c.id, name: c.name, level: c.level, shinryoku: c.shinryokuType, job: c.job, entity: c, isPlayer: false, isActive: true })),
        ...(character.inactiveCompanions || []).map(c => ({ id: c.id, name: c.name, level: c.level, shinryoku: c.shinryokuType, job: c.job, entity: c, isPlayer: false, isActive: false }))
    ];

    const existingJobsInGroup = allRawPotentials.map(p => p.job).filter(Boolean) as JobType[];

    // 대상 목록에 자격 및 검증 정보 사전 결합
    const allPotentials = useMemo(() => {
        return allRawPotentials.map(p => {
            const eligibility = checkDivineMessengerEligibility(p.entity as any, character.inventory, existingJobsInGroup);
            return {
                ...p,
                allowed: eligibility.allowed,
                reason: eligibility.reason,
                config: eligibility.config
            };
        });
    }, [character, existingJobsInGroup]);

    // 동료 정렬 및 필터링 적용
    const sortedCompanions = useMemo(() => {
        const playerItem = allPotentials.find(p => p.isPlayer);
        let companions = allPotentials.filter(p => !p.isPlayer);

        // 필터링 적용
        if (filterOption === 'active') {
            companions = companions.filter(c => c.isActive);
        } else if (filterOption === 'inactive') {
            companions = companions.filter(c => !c.isActive);
        }

        // 정렬 적용
        companions.sort((a, b) => {
            if (sortOption === 'level') {
                return (b.level || 0) - (a.level || 0);
            }
            if (sortOption === 'name') {
                return (a.name || '').localeCompare(b.name || '', 'ko');
            }
            if (sortOption === 'shinryoku') {
                return (a.shinryoku || '').localeCompare(b.shinryoku || '', 'ko');
            }
            if (sortOption === 'eligible') {
                const aVal = a.allowed ? 2 : isMessengerJob(a.job) ? 0 : 1;
                const bVal = b.allowed ? 2 : isMessengerJob(b.job) ? 0 : 1;
                if (bVal !== aVal) return bVal - aVal;
                return (b.level || 0) - (a.level || 0);
            }
            return 0;
        });

        return playerItem ? [playerItem, ...companions] : companions;
    }, [allPotentials, sortOption, filterOption]);

    const selectedTarget = allPotentials.find(p => p.id === selectedTargetId);
    
    const { allowed, reason, config } = selectedTarget ? {
        allowed: selectedTarget.allowed,
        reason: selectedTarget.reason,
        config: selectedTarget.config
    } : { allowed: false, reason: "대상을 선택하세요.", config: undefined };

    // 선택된 대상의 장비 장착 현황 분석
    const equipmentAnalysis = useMemo(() => {
        if (!selectedTarget || !config) return { items: [], equippedCount: 0, missingItems: [] };

        const items = config.requiredItems.map(itemName => {
            const equippedInfo = checkEquippedItem(selectedTarget.entity as any, itemName);
            const bossInfo = getRequiredItemBossInfo(itemName, selectedTarget.shinryoku);
            const slotName = getKoreanSlotName(bossInfo.itemType, itemName);
            return {
                itemName,
                isEquipped: equippedInfo.isEquipped,
                equippedItem: equippedInfo.item,
                bossInfo,
                slotName
            };
        });

        const equippedCount = items.filter(i => i.isEquipped).length;
        const missingItems = items.filter(i => !i.isEquipped);

        return { items, equippedCount, missingItems };
    }, [selectedTarget, config]);

    const finalizeAwakening = (newChar: Character, chosenVisualUrl: string, origVisual?: string) => {
        const isPlayer = selectedTargetId === 'player';
        const targetEntity = selectedTarget?.entity as any;
        const baseVisual = origVisual || targetEntity?.visualUrl || targetEntity?.defaultVisualUrl || '';

        if (isPlayer) {
            newChar.visualUrl = chosenVisualUrl;
            newChar.originalVisualUrl = newChar.originalVisualUrl || baseVisual;
        } else {
            const activeIdx = newChar.companions.findIndex(c => c.id === selectedTargetId);
            const inactiveIdx = newChar.inactiveCompanions?.findIndex(c => c.id === selectedTargetId) ?? -1;
            const targetComp = activeIdx !== -1 ? newChar.companions[activeIdx] : (newChar.inactiveCompanions ? newChar.inactiveCompanions[inactiveIdx] : null);
            if (targetComp) {
                targetComp.visualUrl = chosenVisualUrl;
                targetComp.originalVisualUrl = targetComp.originalVisualUrl || baseVisual;
            }
        }

        onUpdateCharacter(newChar, `[신의 사자 임명] ${selectedTarget?.name}가 ${config?.title}로 임명되었습니다.`);
        
        setResultData({
            type: 'levelup',
            title: '신의 사자 강림',
            message: `${selectedTarget?.name}가 ${config?.title}의 권능을 이어받았습니다.\n이제 신의 뜻을 대행하는 사자로서 활동합니다.`,
            items: [
                { label: '변경된 직업', after: config?.title || '신의 사자' },
                { label: '외형 상태', after: chosenVisualUrl === baseVisual ? '기존 외형 유지' : '신의 사자 외형 적용' },
                { label: '능력치 보너스', after: 'HP+5만, STR/INT/CTRL/WIS +1000' }
            ]
        });
    };

    const handleAwaken = () => {
        if (!allowed || !config) return;

        setIsProcessing(true);
        setTimeout(() => {
            const result = performDivineMessengerAwakening(character, selectedTargetId);
            setIsProcessing(false);
            if (!result.success) {
                alert(result.message);
                return;
            }

            const targetEntity = selectedTarget?.entity as any;
            const currentVisual = targetEntity?.visualUrl || targetEntity?.defaultVisualUrl || '';
            const newVisual = getDivineOrDemonJobVisualUrl(config.jobType, targetEntity?.gender || '남성');

            if (newVisual) {
                setPendingVisualModal({
                    resultChar: result.newChar,
                    targetName: selectedTarget?.name || '대상',
                    jobTitle: config.title,
                    currentVisualUrl: currentVisual,
                    newVisualUrl: newVisual,
                    origVisual: targetEntity?.originalVisualUrl || currentVisual
                });
            } else {
                finalizeAwakening(result.newChar, currentVisual);
            }
        }, 1500);
    };

    const TargetIcon = selectedTarget ? (ELEMENT_ICONS[selectedTarget.shinryoku] || Users) : Users;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm p-2 sm:p-4 animate-in fade-in">
            {resultData && <ActionResultModal data={resultData} onClose={() => { setResultData(null); onClose(); }} />}
            {pendingVisualModal && (
                <AppearanceChoiceModal
                    isOpen={true}
                    onClose={() => {
                        finalizeAwakening(pendingVisualModal.resultChar, pendingVisualModal.currentVisualUrl, pendingVisualModal.origVisual);
                        setPendingVisualModal(null);
                    }}
                    targetName={pendingVisualModal.targetName}
                    jobTitle={pendingVisualModal.jobTitle}
                    isDemonGod={false}
                    currentVisualUrl={pendingVisualModal.currentVisualUrl}
                    newVisualUrl={pendingVisualModal.newVisualUrl}
                    onConfirm={(selectedVisual) => {
                        finalizeAwakening(pendingVisualModal.resultChar, selectedVisual, pendingVisualModal.origVisual);
                        setPendingVisualModal(null);
                    }}
                />
            )}
            
            <div className="bg-slate-900 border-2 border-amber-500 w-full max-w-5xl h-[92vh] sm:h-[88vh] rounded-2xl sm:rounded-3xl shadow-[0_0_100px_rgba(245,158,11,0.3)] flex flex-col overflow-hidden relative">
                {/* 배경 조명 효과 */}
                <div className="absolute inset-0 opacity-10 pointer-events-none">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-amber-500 rounded-full blur-[120px] animate-pulse"></div>
                </div>

                {/* 모달 상단 헤더 */}
                <div className="p-4 sm:p-6 border-b border-amber-900/50 bg-amber-950/30 flex justify-between items-center shrink-0 z-10">
                    <div className="flex items-center gap-2 sm:gap-3">
                        <Crown size={28} className="text-amber-400 shrink-0 animate-spin-slow" />
                        <div>
                            <h2 className="text-lg sm:text-2xl font-bold text-white font-cinzel tracking-widest">신의 사자 임명식</h2>
                            <p className="text-[11px] sm:text-xs text-amber-400 font-bold uppercase">신력 세례 및 최고위 전 직업 부여</p>
                        </div>
                    </div>
                    <button 
                        type="button" 
                        onClick={onClose} 
                        className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center"
                    >
                        <X size={22} />
                    </button>
                </div>

                {/* 모달 본문 (좌측 대상 선택 + 우측 요구 조건) */}
                <div className="flex-1 overflow-hidden flex flex-col md:flex-row z-10">
                    
                    {/* 좌측: 대상 선택 및 동료 정렬 controls */}
                    <div className="w-full md:w-80 border-b md:border-b-0 md:border-r border-slate-800 p-3 sm:p-4 overflow-y-auto custom-scrollbar shrink-0 bg-slate-950/40 flex flex-col max-h-[35vh] md:max-h-full">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-xs font-bold text-amber-400 uppercase flex items-center gap-1.5">
                                <Users size={14} /> 대상 선택
                            </h3>
                            <span className="text-[10px] text-slate-500 font-mono">{sortedCompanions.length}명</span>
                        </div>

                        {/* 동료 정렬 및 필터 버턴 */}
                        <div className="space-y-2 mb-3 bg-slate-900/90 p-2 rounded-xl border border-slate-800">
                            {/* 정렬 옵션 */}
                            <div className="flex items-center gap-1 overflow-x-auto custom-scrollbar pb-1">
                                <span className="text-[10px] text-slate-400 font-bold shrink-0 flex items-center gap-0.5">
                                    <ArrowUpDown size={10} /> 정렬:
                                </span>
                                <button
                                    type="button"
                                    onClick={() => setSortOption('level')}
                                    className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all shrink-0 ${sortOption === 'level' ? 'bg-amber-500 text-slate-950 shadow' : 'bg-slate-800 text-slate-400 hover:text-white'}`}
                                >
                                    레벨순
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setSortOption('eligible')}
                                    className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all shrink-0 ${sortOption === 'eligible' ? 'bg-amber-500 text-slate-950 shadow' : 'bg-slate-800 text-slate-400 hover:text-white'}`}
                                >
                                    자격순
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setSortOption('shinryoku')}
                                    className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all shrink-0 ${sortOption === 'shinryoku' ? 'bg-amber-500 text-slate-950 shadow' : 'bg-slate-800 text-slate-400 hover:text-white'}`}
                                >
                                    신력순
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setSortOption('name')}
                                    className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all shrink-0 ${sortOption === 'name' ? 'bg-amber-500 text-slate-950 shadow' : 'bg-slate-800 text-slate-400 hover:text-white'}`}
                                >
                                    이름순
                                </button>
                            </div>

                            {/* 동행/대기 필터 옵션 */}
                            <div className="flex items-center gap-1 pt-1 border-t border-slate-800">
                                <span className="text-[10px] text-slate-400 font-bold shrink-0 flex items-center gap-0.5">
                                    <Filter size={10} /> 상태:
                                </span>
                                <button
                                    type="button"
                                    onClick={() => setFilterOption('all')}
                                    className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${filterOption === 'all' ? 'bg-slate-700 text-amber-300' : 'text-slate-500 hover:text-slate-300'}`}
                                >
                                    전체
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setFilterOption('active')}
                                    className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${filterOption === 'active' ? 'bg-slate-700 text-green-400' : 'text-slate-500 hover:text-slate-300'}`}
                                >
                                    동행
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setFilterOption('inactive')}
                                    className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${filterOption === 'inactive' ? 'bg-slate-700 text-slate-300' : 'text-slate-500 hover:text-slate-300'}`}
                                >
                                    대기
                                </button>
                            </div>
                        </div>

                        {/* 동료 목록 */}
                        <div className="space-y-2 flex-1 overflow-y-auto custom-scrollbar pr-0.5">
                            {sortedCompanions.map(p => {
                                const isSelected = selectedTargetId === p.id;
                                const isMessenger = isMessengerJob(p.job);
                                const ElemIcon = ELEMENT_ICONS[p.shinryoku] || Users;

                                return (
                                    <button
                                        type="button"
                                        key={p.id}
                                        onClick={() => setSelectedTargetId(p.id)}
                                        disabled={isMessenger}
                                        className={`w-full p-2.5 sm:p-3 rounded-xl border text-left transition-all flex flex-col relative ${
                                            isSelected
                                                ? 'bg-amber-900/40 border-amber-500 shadow-lg ring-1 ring-amber-500'
                                                : isMessenger
                                                ? 'opacity-40 bg-slate-950 border-slate-900 grayscale'
                                                : 'bg-slate-900/90 border-slate-800 hover:border-slate-600'
                                        }`}
                                    >
                                        <div className="flex justify-between items-center w-full">
                                            <div className="flex items-center gap-1.5 truncate pr-2">
                                                <span className="font-bold text-xs sm:text-sm text-slate-100 truncate">{p.name}</span>
                                                {p.isPlayer && (
                                                    <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold bg-amber-500/20 text-amber-300 border border-amber-500/30 shrink-0">
                                                        주인공
                                                    </span>
                                                )}
                                                {!p.isPlayer && (
                                                    <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold shrink-0 ${p.isActive ? 'bg-green-500/20 text-green-400' : 'bg-slate-800 text-slate-400'}`}>
                                                        {p.isActive ? '동행' : '대기'}
                                                    </span>
                                                )}
                                            </div>
                                            {isMessenger ? (
                                                <span className="text-[10px] text-green-400 font-bold flex items-center gap-0.5 shrink-0">
                                                    <CheckCircle size={12} /> 완료
                                                </span>
                                            ) : p.allowed ? (
                                                <span className="text-[10px] text-amber-400 font-extrabold bg-amber-500/20 px-1.5 py-0.5 rounded border border-amber-500/40 animate-pulse shrink-0">
                                                    임명 가능
                                                </span>
                                            ) : (
                                                <span className="text-[10px] text-slate-500 font-bold shrink-0">
                                                    조건 미달
                                                </span>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-2 mt-1.5">
                                            <span className="text-[10px] text-amber-400 font-bold font-mono">Lv.{p.level}</span>
                                            <span className="text-[10px] text-slate-400 flex items-center gap-1">
                                                <ElemIcon size={11} className="text-amber-400/80" /> {p.shinryoku}
                                            </span>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* 우측: 상세 조건 및 전리품 장비 검증 */}
                    <div className="flex-1 p-4 sm:p-6 md:p-8 overflow-y-auto custom-scrollbar flex flex-col space-y-6">
                        {selectedTarget ? (
                            <div className="space-y-6">
                                {/* 상단 프로필 헤더 */}
                                <div className="text-center bg-slate-950/60 p-4 sm:p-5 rounded-2xl border border-slate-800/80 shadow-inner">
                                    <TargetIcon size={36} className="mx-auto text-amber-400 mb-2" />
                                    <h3 className="text-xl sm:text-2xl font-bold text-white mb-1">{selectedTarget.name}</h3>
                                    <p className="text-xs sm:text-sm text-slate-400">
                                        {config ? `${config.title} 자격을 검증합니다.` : `${selectedTarget.shinryoku} 계통 사자 임명 사양 분석 중...`}
                                    </p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                                    {/* 1. 레벨 & 신력 & 재료 요건 */}
                                    <div className="bg-slate-950 p-4 sm:p-5 rounded-2xl border border-slate-800 space-y-3 shadow-inner flex flex-col justify-between">
                                        <div>
                                            <h4 className="text-xs font-bold text-amber-400 uppercase flex items-center gap-1.5 mb-3 border-b border-slate-800 pb-2">
                                                <Zap size={14} /> 기본 자격 요건
                                            </h4>
                                            <div className="space-y-2.5 text-xs sm:text-sm">
                                                <div className="flex justify-between items-center">
                                                    <span className="text-slate-400">레벨 1000 이상</span>
                                                    <span className={`font-mono font-bold ${selectedTarget.level >= 1000 ? 'text-green-400' : 'text-red-400'}`}>
                                                        {selectedTarget.level} / 1000 {selectedTarget.level >= 1000 ? '✓' : '✗'}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-slate-400">파이널 클래스 해방</span>
                                                    {(() => {
                                                        const isFinalLiberated =
                                                            selectedTarget.entity.classTier === '파이널 클래스' ||
                                                            (selectedTarget.entity.classTier as any) === 'FINAL' ||
                                                            Boolean((selectedTarget.entity as any).finalClassName);
                                                        return (
                                                            <span className={`font-bold ${isFinalLiberated ? 'text-green-400' : 'text-red-400'}`}>
                                                                {isFinalLiberated ? '해방 완료 ✓' : `미해방 (${selectedTarget.entity.classTier || '미해방'}) ✗`}
                                                            </span>
                                                        );
                                                    })()}
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-slate-400">신력 계통 적합성</span>
                                                    <span className={`font-bold ${config ? 'text-green-400' : 'text-red-400'}`}>
                                                        {selectedTarget.shinryoku} {config ? '✓' : '✗'}
                                                    </span>
                                                </div>
                                                {config && (
                                                    <div className="flex justify-between items-center border-t border-slate-800/80 pt-2.5 mt-2.5">
                                                        <span className="text-slate-400">{config.material} 소모</span>
                                                        <span className={`font-mono font-bold ${character.inventory.filter(i => i.name === config.material).length >= config.materialCount ? 'text-green-400' : 'text-red-400'}`}>
                                                            {character.inventory.filter(i => i.name === config.material).length} / {config.materialCount}개
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {config && (
                                            <div className="text-[11px] text-slate-400 bg-slate-900/80 p-2.5 rounded-xl border border-slate-800/80 leading-relaxed italic mt-3">
                                                "{config.description}"
                                            </div>
                                        )}
                                    </div>

                                    {/* 2. 구체적 전신 신화 장비 세트 장착 여부 및 보스 전리품 출처 */}
                                    <div className="bg-slate-950 p-4 sm:p-5 rounded-2xl border border-slate-800 space-y-3 shadow-inner flex flex-col">
                                        <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                                            <h4 className="text-xs font-bold text-amber-400 uppercase flex items-center gap-1.5">
                                                <Shield size={14} /> 필수 신화 장비 세트
                                            </h4>
                                            {config && (
                                                <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${equipmentAnalysis.equippedCount === equipmentAnalysis.items.length ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-slate-800 text-amber-400'}`}>
                                                    ({equipmentAnalysis.equippedCount} / {equipmentAnalysis.items.length}개 장착)
                                                </span>
                                            )}
                                        </div>

                                        <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar pr-1 flex-1">
                                            {config && equipmentAnalysis.items.length > 0 ? (
                                                equipmentAnalysis.items.map(item => (
                                                    <div 
                                                        key={item.itemName} 
                                                        className={`p-2.5 rounded-xl border transition-all ${
                                                            item.isEquipped 
                                                                ? 'bg-green-950/20 border-green-800/60 text-green-200' 
                                                                : 'bg-slate-900/80 border-slate-800/80 text-slate-300'
                                                        }`}
                                                    >
                                                        <div className="flex justify-between items-start gap-2">
                                                            <div className="flex items-center gap-2 truncate pr-1">
                                                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 shrink-0">
                                                                    {item.slotName}
                                                                </span>
                                                                <span className="font-bold text-xs sm:text-sm text-slate-100 truncate">{item.itemName}</span>
                                                            </div>
                                                            {item.isEquipped ? (
                                                                <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-green-500/20 text-green-400 border border-green-500/40 flex items-center gap-1 shrink-0">
                                                                    <CheckCircle size={10} /> 장착 완료
                                                                </span>
                                                            ) : (
                                                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/10 text-red-400 border border-red-500/30 flex items-center gap-1 shrink-0">
                                                                    <X size={10} /> 미장착
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="mt-1.5 flex items-center gap-1.5 text-[10px] text-amber-400/90 font-medium bg-black/40 px-2 py-1 rounded-lg">
                                                            <Crown size={11} className="text-amber-400 shrink-0" />
                                                            <span className="truncate">획득처: 신의 사자 [{item.bossInfo.bossName}] (Lv.{item.bossInfo.level || 10000}) 처치 전리품</span>
                                                        </div>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="text-xs text-slate-500 italic py-10 text-center">
                                                    해당 계통의 전용 장비 정보가 없습니다.
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* 하단: 결격 사유 경고 또는 임명 실행 버튼 */}
                                {!allowed ? (
                                    <div className="bg-red-950/40 border border-red-500/40 p-4 rounded-2xl space-y-3 animate-in fade-in shadow-lg">
                                        <div className="flex items-center gap-2 text-red-400 font-bold text-xs sm:text-sm">
                                            <AlertTriangle size={18} className="shrink-0" />
                                            <span>임명 불가능: {reason}</span>
                                        </div>

                                        {/* 미착용 장비 목록 상세 안내 */}
                                        {equipmentAnalysis.missingItems.length > 0 && (
                                            <div className="border-t border-red-900/50 pt-2.5 mt-1">
                                                <p className="text-[11px] font-bold text-rose-300 mb-2">
                                                    미착용 필수 신화 장비 목록 ({equipmentAnalysis.missingItems.length}개):
                                                </p>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px]">
                                                    {equipmentAnalysis.missingItems.map(m => (
                                                        <div key={m.itemName} className="bg-black/40 px-2.5 py-1.5 rounded-lg border border-red-900/30 flex items-center justify-between text-slate-300">
                                                            <span className="font-semibold text-rose-200">• {m.itemName}</span>
                                                            <span className="text-[10px] text-amber-400/90 font-mono">[{m.bossInfo.bossName}]</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ) : config && (
                                    <div className="bg-amber-900/20 border border-amber-500/50 p-5 sm:p-6 rounded-2xl text-center space-y-4 animate-in slide-in-from-bottom-2 shadow-xl">
                                        <div className="flex justify-center items-center gap-2">
                                            <Sparkles className="text-amber-400 animate-pulse" size={20}/>
                                            <p className="text-amber-200 text-sm font-bold">모든 자격 요건과 신화 장비 세트가 검증되었습니다!</p>
                                            <Sparkles className="text-amber-400 animate-pulse" size={20}/>
                                        </div>
                                        <button 
                                            type="button"
                                            onClick={handleAwaken}
                                            disabled={isProcessing}
                                            className="w-full py-4 sm:py-5 bg-gradient-to-r from-amber-700 via-amber-500 to-amber-700 hover:from-amber-600 hover:via-amber-400 hover:to-amber-600 text-slate-950 font-extrabold rounded-xl shadow-[0_0_30px_rgba(245,158,11,0.4)] transition-all transform hover:scale-[1.01] active:scale-95 flex items-center justify-center gap-3 text-base sm:text-lg"
                                        >
                                            {isProcessing ? (
                                                <Loader2 size={24} className="animate-spin text-slate-950" />
                                            ) : (
                                                <>
                                                    <Target size={24} className="animate-pulse" />
                                                    <span className="uppercase tracking-tight">{config.title} 임명식 거행</span>
                                                </>
                                            )}
                                        </button>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-slate-500 opacity-60">
                                <Crown size={64} className="mb-4 text-amber-500/50" />
                                <p className="text-sm font-bold">좌측에서 임명할 대상을 선택하십시오.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DivineAwakeningModal;