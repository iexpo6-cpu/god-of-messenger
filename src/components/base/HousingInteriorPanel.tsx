import React, { useMemo, useState } from 'react';
import { Character, HouseBuilding, HouseType } from '../../types';
import { CityCultureKey, getHousingBuildingUrl, HousingBuildingPart } from '../../services/cityAssetManifest';
import { calculateTotalHousingCapacity, getHouseEffectiveCapacity } from '../../utils';
import { BedDouble, Building2, Clock, Home, Settings, UserPlus, Users, X } from 'lucide-react';

interface HousingInteriorPanelProps {
    character: Character;
    cultureKey: CityCultureKey;
    activeHouseId: string;
    onSelectHouseId: (houseId: string) => void;
    onOpenHousingModal: () => void;
    onOpenMyHomeModal?: () => void;
    onUpdateCharacter: (updatedChar: Character, logMessage: string) => void;
}

const mapHouseTypeToSpritePart = (type: HouseType): HousingBuildingPart => {
    if (type === HouseType.MY_HOME) return 'house_my_home';
    if (type === HouseType.HOUSE_2F) return 'house_2f';
    if (type === HouseType.VILLA) return 'house_villa';
    if (type === HouseType.APARTMENT) return 'house_apartment';
    if (type === HouseType.LUXURY) return 'house_luxury';
    return 'house_1f';
};

const HousingInteriorPanel: React.FC<HousingInteriorPanelProps> = ({
    character,
    cultureKey,
    activeHouseId,
    onSelectHouseId,
    onOpenHousingModal,
    onOpenMyHomeModal,
    onUpdateCharacter
}) => {
    const base = character.base!;
    const houses: HouseBuilding[] = base.houses || [];
    const houseAssignments = base.houseAssignments || {};
    const allComps = useMemo(
        () => [...character.companions, ...(character.inactiveCompanions || [])].filter(c => !c.isMonster && !c.isDead),
        [character.companions, character.inactiveCompanions]
    );

    const activeHouse = activeHouseId ? houses.find(h => h.id === activeHouseId) : undefined;
    const housekeeper = activeHouse?.assignedHousekeeperId
        ? allComps.find(c => c.id === activeHouse.assignedHousekeeperId)
        : undefined;
    const [showAssignDrawer, setShowAssignDrawer] = useState(false);

    const totalCapacity = useMemo(() => calculateTotalHousingCapacity(base, allComps), [base, allComps]);
    const totalAssigned = Object.keys(houseAssignments).length;

    const curHour = parseInt((character.currentTime || '12:00').split(':')[0], 10) || 12;
    const isWorkHours = curHour >= 9 && curHour < 18;
    const isSleepHours = curHour >= 22 || curHour < 6;

    const workingCompIds = useMemo(() => {
        const set = new Set<string>();
        if (base.assignments) {
            Object.entries(base.assignments).forEach(([k, cid]) => {
                if (cid && k !== 'housing' && !k.startsWith('housing_')) set.add(cid);
            });
        }
        if (base.multiAssignments) {
            Object.entries(base.multiAssignments).forEach(([k, arr]) => {
                if (k !== 'housing' && !k.startsWith('housing_') && Array.isArray(arr)) {
                    arr.forEach(cid => set.add(cid));
                }
            });
        }
        return set;
    }, [base.assignments, base.multiAssignments]);

    const residentsOfActive = activeHouse
        ? allComps.filter(c => houseAssignments[c.id] === activeHouse.id)
        : [];
    const outAtWorkCount = isWorkHours
        ? residentsOfActive.filter(c => workingCompIds.has(c.id) && activeHouse?.assignedHousekeeperId !== c.id).length
        : 0;
    const insideCount = residentsOfActive.length - outAtWorkCount;

    const handleToggleResidentInHouse = (compId: string) => {
        if (!activeHouse) return;
        const nextAssigns = { ...houseAssignments };
        const effCap = getHouseEffectiveCapacity(activeHouse, allComps);
        if (nextAssigns[compId] === activeHouse.id) {
            delete nextAssigns[compId];
        } else {
            if (residentsOfActive.length >= effCap) return;
            nextAssigns[compId] = activeHouse.id;
        }
        onUpdateCharacter(
            {
                ...character,
                base: {
                    ...base,
                    houseAssignments: nextAssigns
                }
            },
            `[숙소 배정] '${activeHouse.name}' 거주자 배치를 변경했습니다.`
        );
    };

    return (
        <>
            {/* Top Housing Switcher & Schedule HUD */}
            <div className="absolute top-16 left-2 right-2 z-20 flex flex-wrap items-center gap-1.5 pointer-events-none">
                <div className="pointer-events-auto flex flex-wrap items-center gap-1.5 bg-slate-950/95 border border-emerald-500/40 rounded-xl px-2.5 py-1.5 shadow-xl max-w-full overflow-x-auto custom-scrollbar">
                    <button
                        type="button"
                        onClick={() => onSelectHouseId('')}
                        className={`px-2.5 py-1 rounded-lg border text-[11px] font-black shrink-0 transition-all ${
                            !activeHouse
                                ? 'bg-emerald-700/90 border-emerald-300 text-white'
                                : 'bg-slate-900 border-slate-700 text-slate-300 hover:border-emerald-500/50'
                        }`}
                    >
                        🏡 숙소 단지 마당
                    </button>
                    {houses.map(h => {
                        const isSel = activeHouse?.id === h.id;
                        const cnt = allComps.filter(c => houseAssignments[c.id] === h.id).length;
                        const effCap = getHouseEffectiveCapacity(h, allComps);
                        const spriteUrl = getHousingBuildingUrl(cultureKey, mapHouseTypeToSpritePart(h.type));
                        return (
                            <button
                                key={h.id}
                                type="button"
                                onClick={() => onSelectHouseId(h.id)}
                                className={`px-2 py-1 rounded-lg border text-left flex items-center gap-1.5 shrink-0 transition-all ${
                                    isSel
                                        ? 'bg-emerald-800/80 border-emerald-400 text-white'
                                        : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-600'
                                }`}
                            >
                                <img src={spriteUrl} alt={h.name} className="w-6 h-6 object-contain rounded bg-slate-950/60" />
                                <div className="leading-tight">
                                    <div className="text-[11px] font-black">{h.name}</div>
                                    <div className="text-[9px] text-emerald-300">
                                        {cnt}/{effCap}명 · 청결 {h.cleanliness ?? 100}%
                                    </div>
                                </div>
                            </button>
                        );
                    })}

                    <div className="h-5 w-px bg-slate-800 mx-0.5" />

                    <span
                        className={`text-[10px] font-black px-2 py-1 rounded-lg border flex items-center gap-1 shrink-0 ${
                            isWorkHours
                                ? 'bg-amber-950/80 border-amber-500/40 text-amber-200'
                                : 'bg-indigo-950/80 border-indigo-500/40 text-indigo-200'
                        }`}
                    >
                        <Clock size={11} />
                        {!activeHouse
                            ? `숙소 ${houses.length}채 · 건물을 클릭해 입장`
                            : isWorkHours
                                ? `업무 시간 (${character.currentTime}) · 거주민 외출 중 (실내 ${insideCount}명)`
                                : isSleepHours
                                    ? `심야 수면 시간 (${character.currentTime}) · 침대 취침 중 (${insideCount}명)`
                                    : `휴식 시간 (${character.currentTime}) · 거주민 귀가 휴식 중 (${insideCount}명)`}
                    </span>

                    {activeHouse && (
                        <span className="text-[10px] font-black px-2 py-1 rounded-lg border bg-emerald-950/70 border-emerald-500/40 text-emerald-200 shrink-0">
                            🧹 {housekeeper ? `하우스키퍼: ${housekeeper.name}` : '하우스키퍼 미배정'}
                        </span>
                    )}

                    {activeHouse?.type === HouseType.MY_HOME && onOpenMyHomeModal && (
                        <button
                            type="button"
                            onClick={onOpenMyHomeModal}
                            className="px-2.5 py-1 rounded-lg bg-rose-700 hover:bg-rose-600 text-white text-[11px] font-black flex items-center gap-1 shrink-0"
                        >
                            💖 나의 집 관리
                        </button>
                    )}

                    {activeHouse && (
                        <button
                            type="button"
                            onClick={() => setShowAssignDrawer(v => !v)}
                            className="px-2.5 py-1 rounded-lg bg-sky-700 hover:bg-sky-600 text-white text-[11px] font-black flex items-center gap-1 shrink-0"
                        >
                            <UserPlus size={12} /> 거주자 배치 ({residentsOfActive.length}/{getHouseEffectiveCapacity(activeHouse, allComps)})
                        </button>
                    )}

                    <button
                        type="button"
                        onClick={onOpenHousingModal}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 text-[11px] font-black flex items-center gap-1 shrink-0"
                    >
                        <Settings size={12} /> 주택 신축·전체 관리 ({totalAssigned}/{totalCapacity}명)
                    </button>
                </div>
            </div>

            {/* Inline Resident Assignment Drawer */}
            {showAssignDrawer && activeHouse && (
                <div className="absolute top-28 left-2 z-30 w-80 max-h-80 bg-slate-950 border border-sky-500/50 rounded-2xl overflow-hidden flex flex-col shadow-2xl">
                    <div className="px-3 py-2 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
                        <span className="text-xs font-black text-sky-300 flex items-center gap-1.5">
                            <Home size={13} /> {activeHouse.name} 거주자 배정 ({residentsOfActive.length}/{activeHouse.capacity})
                        </span>
                        <button type="button" onClick={() => setShowAssignDrawer(false)} className="text-slate-400 hover:text-white">
                            <X size={14} />
                        </button>
                    </div>
                    <div className="p-2 overflow-y-auto space-y-1.5 custom-scrollbar">
                        {allComps.map(c => {
                            const assignedHouseId = houseAssignments[c.id];
                            const inThisHouse = assignedHouseId === activeHouse.id;
                            const otherHouse = assignedHouseId && !inThisHouse ? houses.find(h => h.id === assignedHouseId) : null;
                            const isAtWork = isWorkHours && workingCompIds.has(c.id);
                            return (
                                <button
                                    key={c.id}
                                    type="button"
                                    onClick={() => handleToggleResidentInHouse(c.id)}
                                    disabled={!inThisHouse && residentsOfActive.length >= activeHouse.capacity}
                                    className={`w-full px-2.5 py-1.5 rounded-lg border text-left flex items-center justify-between text-xs ${
                                        inThisHouse
                                            ? 'bg-emerald-950/70 border-emerald-500/60 text-emerald-100'
                                            : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-600 disabled:opacity-40'
                                    }`}
                                >
                                    <div className="min-w-0">
                                        <div className="font-bold truncate">
                                            {c.name}{' '}
                                            <span className="text-[10px] text-slate-400">Lv.{c.level || 1}</span>
                                        </div>
                                        <div className="text-[10px] text-slate-400 truncate">
                                            {inThisHouse
                                                ? isAtWork
                                                    ? '☀️ 현재 시설 근무 외출 중'
                                                    : '🏠 현재 숙소 내 휴식 중'
                                                : otherHouse
                                                ? `다른 숙소 거주: ${otherHouse.name}`
                                                : '미배정 거주민'}
                                        </div>
                                    </div>
                                    <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-black/40">
                                        {inThisHouse ? '해제' : '배정'}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </>
    );
};

export default HousingInteriorPanel;
