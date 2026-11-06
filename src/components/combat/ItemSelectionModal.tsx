import React, { memo } from 'react';
import { X, Package, Sparkles } from 'lucide-react';
import { ItemTooltip } from '../CharacterSheet';

interface ItemSelectionModalProps {
    items: any[];
    onSelect: (item: any, quantity: number, targetName?: string) => void;
    onClose: () => void;
    partyMembers?: any[];
    enemies?: any[];
}

export const ItemSelectionModal = memo(({ 
    items, 
    onSelect, 
    onClose
}: ItemSelectionModalProps) => {
    // 동일 아이템 이름별 묶음 처리 (목록 정리)
    const groupedItems = items.reduce((acc: any[], item) => {
        const existing = acc.find(i => i.name === item.name);
        if (existing) {
            existing.count += item.count || 1;
            existing.instances.push(item);
        } else {
            acc.push({
                name: item.name,
                count: item.count || 1,
                grade: item.grade || item.itemData?.grade || 'B',
                imageUrl: item.imageUrl || item.itemData?.visualUrl,
                instances: [item],
                itemData: item.itemData || item
            });
        }
        return acc;
    }, []);

    // 아이템 선택 시 중간 화면 없이 즉시 전투 화면 대상 지정 모드로 전환
    const handleSelectItem = (group: any) => {
        const mainItem = group.instances[0];
        onSelect(mainItem, 1);
        onClose();
    };

    const getGradeColor = (grade: string = 'B') => {
        const uGrade = grade.toUpperCase();
        if (uGrade === 'SSS' || uGrade === '신화') return 'border-red-500/50 text-red-400 bg-red-950/30';
        if (uGrade === 'SS' || uGrade === '전설') return 'border-amber-500/50 text-amber-400 bg-amber-950/30';
        if (uGrade === 'S' || uGrade === '영웅') return 'border-purple-500/50 text-purple-400 bg-purple-950/30';
        if (uGrade === 'A' || uGrade === '희귀') return 'border-blue-500/50 text-blue-400 bg-blue-950/30';
        return 'border-slate-700 text-slate-300 bg-slate-950/30';
    };

    const getGradeLabel = (grade: string = 'B') => {
        const uGrade = grade.toUpperCase();
        if (uGrade === 'SSS' || uGrade === '신화') return '신화';
        if (uGrade === 'SS' || uGrade === '전설') return '전설';
        if (uGrade === 'S' || uGrade === '영웅') return '영웅';
        if (uGrade === 'A' || uGrade === '희귀') return '희귀';
        return '일반';
    };

    return (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[100] flex items-center justify-center p-2 sm:p-4 overflow-hidden">
            <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col max-h-[90vh] md:max-h-[85vh] animate-in fade-in zoom-in-95 relative overflow-hidden">
                
                {/* 상단 헤더 */}
                <div className="flex justify-between items-center p-3.5 sm:p-4 border-b border-slate-800 bg-slate-950/60 shrink-0">
                    <div className="flex items-center space-x-2">
                        <Package size={20} className="text-amber-500 shrink-0" />
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="font-extrabold text-slate-100 text-sm sm:text-base">전투 가방</h3>
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-950/80 border border-indigo-700/50 text-indigo-300 font-bold">
                                    전투 중 1개 사용
                                </span>
                            </div>
                        </div>
                    </div>
                    <button 
                        onClick={onClose} 
                        className="text-slate-400 hover:text-white hover:bg-slate-800 p-2 rounded-full transition-all touch-target-action"
                        style={{ minWidth: '44px', minHeight: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        aria-label="닫기"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* 안내 문구 */}
                <div className="px-3.5 py-2 border-b border-slate-800/80 bg-slate-950/40 flex items-center justify-between text-[11px] text-slate-400">
                    <span className="flex items-center gap-1.5 text-slate-300 font-medium">
                        <Sparkles size={13} className="text-amber-400 shrink-0" />
                        아이템을 누르면 전투 화면에서 대상을 즉시 지정합니다.
                    </span>
                    <span className="text-indigo-400 font-bold shrink-0">1개 사용</span>
                </div>

                {/* 아이템 목록 뷰 (모바일 최적화 원터치 선택) */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2 bg-gradient-to-b from-slate-900 to-slate-950/50">
                    {groupedItems.length > 0 ? (
                        groupedItems.map((group, idx) => (
                            <button
                                key={idx}
                                onClick={() => handleSelectItem(group)}
                                className="group relative w-full text-left bg-slate-950/70 border border-slate-800 hover:border-amber-500/70 p-3 rounded-xl flex items-center justify-between gap-3 transition-all hover:bg-slate-950 shadow-sm active:scale-[0.98]"
                                style={{ minHeight: '60px' }}
                            >
                                <ItemTooltip item={group.itemData} />
                                <div className="flex items-center space-x-3 min-w-0 flex-1">
                                    {group.imageUrl ? (
                                        <div className="w-12 h-12 rounded-lg border border-slate-800 overflow-hidden shrink-0 bg-slate-900 relative">
                                            <img src={group.imageUrl} alt={group.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                        </div>
                                    ) : (
                                        <div className="w-12 h-12 rounded-lg border border-slate-800 bg-slate-900 shrink-0 flex items-center justify-center text-slate-500">
                                            <Package size={22} />
                                        </div>
                                    )}
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                            <span className={`text-[9px] px-1.5 py-0.2 rounded border font-bold ${getGradeColor(group.grade)}`}>
                                                {getGradeLabel(group.grade)}
                                            </span>
                                            <h4 className="font-bold text-slate-200 text-xs sm:text-sm truncate">{group.name}</h4>
                                        </div>
                                        <p className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5 line-clamp-1">
                                            {group.itemData?.description || '전투 중에 사용할 수 있는 소모성 아이템입니다.'}
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right shrink-0 flex flex-col items-end gap-1">
                                    <span className="text-[11px] font-mono text-slate-400 bg-slate-900 border border-slate-800 px-2 py-0.5 rounded-md">
                                        보유 {group.count}개
                                    </span>
                                    <span className="text-[11px] font-bold text-amber-300 bg-amber-950/60 border border-amber-800/50 px-2.5 py-1 rounded-lg group-hover:bg-amber-900/60 transition-all">
                                        대상 지정
                                    </span>
                                </div>
                            </button>
                        ))
                    ) : (
                        <div className="flex flex-col items-center justify-center h-48 text-slate-500 space-y-2">
                            <Package size={36} className="opacity-30" />
                            <p className="text-xs">현재 보유 중인 소모품이 없습니다.</p>
                        </div>
                    )}
                </div>

                {/* 하단 닫기 버튼 */}
                <div className="p-3 border-t border-slate-800 bg-slate-950/60 shrink-0">
                    <button
                        onClick={onClose}
                        className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold text-xs sm:text-sm transition-all active:scale-[0.98]"
                        style={{ minHeight: '44px' }}
                    >
                        닫기
                    </button>
                </div>
            </div>
        </div>
    );
});
