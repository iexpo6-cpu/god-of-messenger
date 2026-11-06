import React from 'react';
import { User, Sparkles, X, Heart, Shield } from 'lucide-react';

interface PartyMemberItem {
    id: string;
    name: string;
    entity?: any;
    isPlayer?: boolean;
    stats: {
        hp: number;
        maxHp?: number;
        mp?: number;
        maxMp?: number;
    };
    finalStats?: {
        maxHp: number;
        maxMp?: number;
    };
    visualUrl?: string;
    classType?: string;
}

interface AllyTargetQuickSelectorProps {
    partyMembers: PartyMemberItem[];
    skillName?: string;
    isPureResurrectionPending?: boolean;
    isResurrectionModeActive?: boolean;
    onSelectTarget: (name: string) => void;
    onCancel: () => void;
}

/**
 * 버프 및 회복 스킬 사용 시 아군을 손쉽게 선택할 수 있는 콤팩트 목록 선택창
 * - 모바일/태블릿 화면을 많이 가리지 않는 슬림한 크기
 * - 터치하기 쉬운 반응형 버튼 배치
 * - 기존 진형 카드 터치와 목록 터치 방식 모두 지원
 */
export const AllyTargetQuickSelector: React.FC<AllyTargetQuickSelectorProps> = ({
    partyMembers,
    skillName,
    isPureResurrectionPending = false,
    isResurrectionModeActive = false,
    onSelectTarget,
    onCancel
}) => {
    return (
        <div className="absolute top-12 left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-lg animate-in fade-in slide-in-from-top-2 duration-150">
            <div className="bg-slate-900/95 backdrop-blur-md border border-cyan-500/70 rounded-xl p-2 sm:p-2.5 shadow-2xl shadow-cyan-950/60 ring-1 ring-cyan-500/30">
                {/* 상단 콤팩트 헤더 */}
                <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-slate-800">
                    <div className="flex items-center gap-1.5 min-w-0">
                        <Sparkles size={14} className="text-cyan-400 shrink-0 animate-pulse" />
                        <span className="text-xs font-bold text-cyan-200 truncate">
                            아군 대상 선택
                        </span>
                        {skillName && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-950/80 border border-cyan-500/50 text-cyan-300 font-bold truncate">
                                {skillName}
                            </span>
                        )}
                    </div>
                    <button
                        type="button"
                        onClick={onCancel}
                        className="px-2 py-0.5 text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded border border-slate-700 transition-colors flex items-center gap-1 shrink-0"
                    >
                        <X size={12} />
                        <span>취소</span>
                    </button>
                </div>

                {/* 아군 선택 버튼 목록 (가로 스크롤 및 콤팩트 그리드) */}
                <div className="flex gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                    {partyMembers.map((member) => {
                        const curHp = member.stats?.hp || 0;
                        const maxHp = member.finalStats?.maxHp || member.stats?.maxHp || 1;
                        const hpPercent = Math.max(0, Math.min(100, Math.round((curHp / maxHp) * 100)));
                        const isDead = curHp <= 0;

                        // 선택 가능 여부 판별
                        let isSelectable = true;
                        let disabledReason = '';

                        if (isPureResurrectionPending) {
                            // 순수 부활 스킬: 사망자만 선택 가능
                            if (!isDead) {
                                isSelectable = false;
                                disabledReason = '생존';
                            }
                        } else if (!isResurrectionModeActive) {
                            // 일반 버프/회복: 사망자 선택 불가
                            if (isDead) {
                                isSelectable = false;
                                disabledReason = '행동불능';
                            }
                        }

                        return (
                            <button
                                key={member.id}
                                type="button"
                                disabled={!isSelectable}
                                onClick={() => onSelectTarget(member.name)}
                                className={`flex-1 min-w-[85px] sm:min-w-[95px] max-w-[125px] p-1.5 rounded-lg border text-left transition-all flex flex-col justify-between gap-1 relative overflow-hidden group active:scale-95 ${
                                    !isSelectable
                                        ? 'bg-slate-950/60 border-slate-800/80 opacity-45 cursor-not-allowed'
                                        : 'bg-slate-950 hover:bg-cyan-950/40 border-slate-800 hover:border-cyan-400/80 hover:shadow-[0_0_10px_rgba(6,182,212,0.25)] ring-1 ring-transparent hover:ring-cyan-500/40'
                                }`}
                            >
                                {/* 상단: 이름 및 상태 */}
                                <div className="flex items-center gap-1 min-w-0">
                                    <div className="w-5 h-5 rounded-full overflow-hidden bg-slate-800 shrink-0 border border-slate-700 flex items-center justify-center">
                                        {member.visualUrl ? (
                                            <img
                                                src={member.visualUrl}
                                                alt={member.name}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <User size={12} className="text-slate-400" />
                                        )}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-0.5">
                                            <span className={`text-[11px] font-bold truncate block ${
                                                member.isPlayer ? 'text-amber-300' : 'text-slate-200'
                                            }`}>
                                                {member.name}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* 하단: 체력 정보 및 체력 바 */}
                                <div className="space-y-0.5 w-full">
                                    <div className="flex justify-between items-center text-[9px] font-bold text-slate-400">
                                        <span className="flex items-center gap-0.5">
                                            <Heart size={9} className={isDead ? 'text-slate-500' : 'text-rose-400'} />
                                            <span className={isDead ? 'text-rose-400' : 'text-slate-300'}>
                                                {isDead ? (disabledReason || '행동불능') : `${hpPercent}%`}
                                            </span>
                                        </span>
                                        {member.isPlayer && (
                                            <span className="text-[8px] text-amber-400 px-1 rounded bg-amber-950/60 border border-amber-500/30">
                                                본인
                                            </span>
                                        )}
                                    </div>
                                    <div className="h-1 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                                        <div
                                            className={`h-full transition-all duration-300 ${
                                                isDead
                                                    ? 'bg-slate-700'
                                                    : hpPercent <= 25
                                                    ? 'bg-rose-500'
                                                    : hpPercent <= 50
                                                    ? 'bg-amber-500'
                                                    : 'bg-emerald-500'
                                            }`}
                                            style={{ width: `${hpPercent}%` }}
                                        />
                                    </div>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};
