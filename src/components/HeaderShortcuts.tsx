import React, { useState, useEffect } from 'react';
import { 
    Clock, Mail, Home, Radio, Skull, Flame, ScrollText, Map as MapIcon, 
    Grid, ShieldAlert, Save, Settings, LogOut, Star, X, Check, Pin, User, Target,
    Hammer, Swords, PawPrint, FlaskConical, Sprout, Pickaxe, Utensils, Castle, Crown, 
    Compass, Crosshair, Package, Bed, Dumbbell, Activity, Sword, ShieldCheck, 
    Send, BookOpen, Sparkles, Zap, Coins, Wand2, Film
} from 'lucide-react';
import { FACILITIES_INFO } from '../constants';

export type ShortcutId = 
    | 'character'
    | 'rest' 
    | 'mailbox' 
    | 'base' 
    | 'dimension' 
    | 'bestiary' 
    | 'rival' 
    | 'quest' 
    | 'map' 
    | 'tactics'
    | 'dashboard' 
    // 기지 22개 모든 시설
    | 'facility_storage'
    | 'facility_housing'
    | 'facility_farm'
    | 'facility_training_exp'
    | 'facility_training_stat'
    | 'facility_training_mastery'
    | 'facility_mine'
    | 'facility_workshop'
    | 'facility_defense'
    | 'facility_dispatch'
    | 'facility_alchemy'
    | 'facility_lab'
    | 'facility_monster_farm'
    | 'facility_cooking'
    | 'facility_combat_training'
    | 'facility_tactical_training'
    | 'facility_sparring_arena'
    | 'facility_training_style'
    | 'facility_potential_breakthrough'
    | 'facility_trade_exchange'
    | 'facility_custom_lab'
    | 'facility_skill_vfx_lab'
    // 장소 바로가기
    | 'loc_base'
    | 'loc_capital'
    | 'loc_dungeon'
    | 'loc_hunt'
    // 시스템 메뉴
    | 'operator' 
    | 'saveload' 
    | 'settings' 
    | 'exit';

export type ShortcutCategory = '기능' | '기지 시설' | '장소' | '시스템';

interface ShortcutDefinition {
    id: ShortcutId;
    label: string;
    icon: React.ComponentType<{ size?: number; className?: string }>;
    category: ShortcutCategory;
    colorClass: string;
}

// 각 기지 시설별 어울리는 아이콘 및 색상 매핑
const FACILITY_ICON_MAP: Record<string, { icon: React.ComponentType<{ size?: number; className?: string }>; colorClass: string }> = {
    storage: { icon: Package, colorClass: 'text-amber-300 hover:border-amber-400' },
    housing: { icon: Bed, colorClass: 'text-indigo-300 hover:border-indigo-400' },
    farm: { icon: Sprout, colorClass: 'text-green-400 hover:border-green-500' },
    training_exp: { icon: Dumbbell, colorClass: 'text-red-400 hover:border-red-500' },
    training_stat: { icon: Activity, colorClass: 'text-blue-400 hover:border-blue-500' },
    training_mastery: { icon: Sword, colorClass: 'text-purple-400 hover:border-purple-500' },
    mine: { icon: Pickaxe, colorClass: 'text-stone-300 hover:border-stone-400' },
    workshop: { icon: Hammer, colorClass: 'text-orange-400 hover:border-orange-500' },
    defense: { icon: ShieldCheck, colorClass: 'text-cyan-400 hover:border-cyan-500' },
    dispatch: { icon: Send, colorClass: 'text-sky-400 hover:border-sky-500' },
    alchemy: { icon: FlaskConical, colorClass: 'text-emerald-300 hover:border-emerald-400' },
    lab: { icon: BookOpen, colorClass: 'text-violet-400 hover:border-violet-500' },
    monster_farm: { icon: PawPrint, colorClass: 'text-yellow-400 hover:border-yellow-500' },
    cooking: { icon: Utensils, colorClass: 'text-amber-400 hover:border-amber-500' },
    combat_training: { icon: Swords, colorClass: 'text-rose-400 hover:border-rose-500' },
    tactical_training: { icon: Target, colorClass: 'text-indigo-400 hover:border-indigo-500' },
    sparring_arena: { icon: Flame, colorClass: 'text-amber-500 hover:border-amber-500' },
    training_style: { icon: Sparkles, colorClass: 'text-pink-400 hover:border-pink-500' },
    potential_breakthrough: { icon: Zap, colorClass: 'text-yellow-300 hover:border-yellow-400' },
    trade_exchange: { icon: Coins, colorClass: 'text-emerald-400 hover:border-emerald-500' },
    custom_lab: { icon: Wand2, colorClass: 'text-fuchsia-400 hover:border-fuchsia-500' },
    skill_vfx_lab: { icon: Film, colorClass: 'text-teal-300 hover:border-teal-400' },
};

// constants.ts의 FACILITIES_INFO와 100% 일치하는 기지 시설 목록 생성
const ALL_FACILITY_SHORTCUTS: ShortcutDefinition[] = FACILITIES_INFO.map(fac => {
    const meta = FACILITY_ICON_MAP[fac.id] || { icon: Home, colorClass: 'text-slate-300 hover:border-slate-400' };
    return {
        id: `facility_${fac.id}` as ShortcutId,
        label: fac.name,
        icon: meta.icon,
        category: '기지 시설',
        colorClass: meta.colorClass
    };
});

const ALL_SHORTCUTS: ShortcutDefinition[] = [
    // 1. 주요 기능
    { id: 'character', label: '내 정보', icon: User, category: '기능', colorClass: 'text-amber-300 hover:border-amber-400' },
    { id: 'rest', label: '휴식', icon: Clock, category: '기능', colorClass: 'text-indigo-400 hover:border-indigo-500' },
    { id: 'mailbox', label: '서신함', icon: Mail, category: '기능', colorClass: 'text-amber-400 hover:border-amber-500' },
    { id: 'base', label: '기지', icon: Home, category: '기능', colorClass: 'text-emerald-400 hover:border-emerald-500' },
    { id: 'dimension', label: '차원', icon: Radio, category: '기능', colorClass: 'text-blue-400 hover:border-blue-500' },
    { id: 'bestiary', label: '도감', icon: Skull, category: '기능', colorClass: 'text-red-400 hover:border-red-500' },
    { id: 'rival', label: '라이벌', icon: Flame, category: '기능', colorClass: 'text-rose-400 hover:border-rose-500' },
    { id: 'quest', label: '퀘스트', icon: ScrollText, category: '기능', colorClass: 'text-amber-500 hover:border-amber-500' },
    { id: 'map', label: '지도', icon: MapIcon, category: '기능', colorClass: 'text-teal-400 hover:border-teal-500' },
    { id: 'tactics', label: '전술', icon: Target, category: '기능', colorClass: 'text-purple-400 hover:border-purple-500' },
    { id: 'dashboard', label: '종합관리', icon: Grid, category: '기능', colorClass: 'text-cyan-400 hover:border-cyan-500' },

    // 2. 기지 시설 바로가기 (모든 22개 기지 시설 등록)
    ...ALL_FACILITY_SHORTCUTS,

    // 3. 장소 및 이동 바로가기
    { id: 'loc_base', label: '기지 귀환', icon: Castle, category: '장소', colorClass: 'text-emerald-400 hover:border-emerald-500' },
    { id: 'loc_capital', label: '수도 이동', icon: Crown, category: '장소', colorClass: 'text-yellow-300 hover:border-yellow-400' },
    { id: 'loc_dungeon', label: '던전', icon: Compass, category: '장소', colorClass: 'text-red-400 hover:border-red-500' },
    { id: 'loc_hunt', label: '사냥터', icon: Crosshair, category: '장소', colorClass: 'text-cyan-400 hover:border-cyan-500' },

    // 4. 시스템 메뉴
    { id: 'operator', label: '운영자', icon: ShieldAlert, category: '시스템', colorClass: 'text-red-400 hover:border-red-500' },
    { id: 'saveload', label: '저장/로드', icon: Save, category: '시스템', colorClass: 'text-blue-400 hover:border-blue-500' },
    { id: 'settings', label: '게임 설정', icon: Settings, category: '시스템', colorClass: 'text-amber-400 hover:border-amber-500' },
    { id: 'exit', label: '종료', icon: LogOut, category: '시스템', colorClass: 'text-red-400 hover:border-red-500' }
];

const DEFAULT_PINNED: ShortcutId[] = ['base', 'map', 'mailbox', 'facility_workshop', 'facility_monster_farm'];

interface HeaderShortcutsProps {
    unreadMailCount: number;
    onAction: (id: ShortcutId) => void;
}

export const HeaderShortcuts: React.FC<HeaderShortcutsProps> = ({ unreadMailCount, onAction }) => {
    const [pinnedIds, setPinnedIds] = useState<ShortcutId[]>(() => {
        try {
            const saved = localStorage.getItem('player_pinned_shortcuts');
            if (saved) {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    return parsed.slice(0, 10);
                }
            }
        } catch {
            // fallback
        }
        return DEFAULT_PINNED;
    });

    const [isConfigOpen, setIsConfigOpen] = useState(false);
    const [selectedTab, setSelectedTab] = useState<ShortcutCategory>('기능');

    useEffect(() => {
        try {
            localStorage.setItem('player_pinned_shortcuts', JSON.stringify(pinnedIds));
        } catch {
            // Ignore
        }
    }, [pinnedIds]);

    const toggleShortcut = (id: ShortcutId) => {
        if (pinnedIds.includes(id)) {
            setPinnedIds(prev => prev.filter(item => item !== id));
        } else {
            if (pinnedIds.length >= 10) {
                alert("상단 바로가기는 최대 10개까지 등록할 수 있습니다.");
                return;
            }
            setPinnedIds(prev => [...prev, id]);
        }
    };

    const categories: ShortcutCategory[] = ['기능', '기지 시설', '장소', '시스템'];

    return (
        <div className="flex items-center gap-1.2 sm:gap-2 bg-slate-950/85 p-1 sm:p-2 rounded-xl sm:rounded-2xl border border-slate-800/95 backdrop-blur-md shadow-lg max-w-[210px] xs:max-w-[250px] sm:max-w-md md:max-w-lg lg:max-w-none overflow-x-auto custom-scrollbar select-none shrink-0">
            {/* Pinned Shortcut Action Buttons */}
            {pinnedIds.map(id => {
                const def = ALL_SHORTCUTS.find(s => s.id === id);
                if (!def) return null;
                const IconComponent = def.icon;
                const isMail = id === 'mailbox';

                return (
                    <button
                        key={id}
                        onClick={() => onAction(id)}
                        className={`relative w-8 h-8 sm:w-10 sm:h-10 lg:w-auto lg:h-auto lg:px-3 lg:py-2 bg-slate-900/90 hover:bg-slate-850 border border-slate-700/80 hover:border-slate-600 rounded-xl flex items-center justify-center lg:justify-start gap-1.5 text-xs font-bold transition-all active:scale-95 shadow-sm cursor-pointer select-none shrink-0 ${def.colorClass}`}
                        title={def.label}
                    >
                        <IconComponent size={15} className="shrink-0 sm:size-[18px]" />
                        <span className="hidden lg:inline text-xs text-slate-200">{def.label}</span>
                        
                        {/* Unread Mail Counter Badge on Mailbox Shortcut */}
                        {isMail && unreadMailCount > 0 && (
                            <span className="absolute -top-1.5 -right-1.5 bg-red-600 text-white text-[9px] font-black font-mono w-4 h-4 rounded-full flex items-center justify-center shadow-lg animate-pulse">
                                {unreadMailCount > 99 ? '99+' : unreadMailCount}
                            </span>
                        )}
                    </button>
                );
            })}

            {/* Shortcut Settings (Star / Pin) Button */}
            <button
                onClick={() => setIsConfigOpen(true)}
                className="w-8 h-8 sm:w-10 sm:h-10 bg-slate-900/70 hover:bg-slate-800 border border-slate-800 hover:border-amber-500/50 rounded-xl text-slate-400 hover:text-amber-400 flex items-center justify-center transition-all active:scale-95 shadow-sm cursor-pointer shrink-0"
                title="즐겨찾기 숏컷 설정"
            >
                <Star size={16} className={pinnedIds.length > 0 ? "fill-amber-500/20 text-amber-400" : ""} />
            </button>

            {/* Shortcut Customization Modal (Mobile Optimized) */}
            {isConfigOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
                    <div className="relative w-full max-w-md bg-slate-950 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-850">
                            <div className="flex items-center gap-2">
                                <Pin size={16} className="text-amber-500" />
                                <h3 className="text-sm font-bold text-slate-100">상단 바로가기 숏컷 설정</h3>
                            </div>
                            <button
                                onClick={() => setIsConfigOpen(false)}
                                className="p-1 hover:bg-slate-900 rounded-lg text-slate-400 hover:text-white"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                            <span>원하는 메뉴를 터치해 등록하세요.</span>
                            <span className="font-bold text-amber-400">({pinnedIds.length}/10)</span>
                        </div>

                        {/* Category Tabs */}
                        <div className="flex border-b border-slate-800 mb-3 bg-slate-900/50 rounded-lg p-0.5">
                            {categories.map(cat => (
                                <button
                                    key={cat}
                                    onClick={() => setSelectedTab(cat)}
                                    className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all text-center ${
                                        selectedTab === cat
                                            ? 'bg-amber-600 text-slate-950 shadow-sm'
                                            : 'text-slate-400 hover:text-slate-200'
                                    }`}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>

                        {/* Shortcuts Grid for Selected Tab */}
                        <div className="space-y-2 flex-1 overflow-y-auto pr-1 custom-scrollbar">
                            <div className="grid grid-cols-2 gap-2">
                                {ALL_SHORTCUTS.filter(s => s.category === selectedTab).map(item => {
                                    const isSelected = pinnedIds.includes(item.id);
                                    const IconComponent = item.icon;
                                    return (
                                        <button
                                            key={item.id}
                                            onClick={() => toggleShortcut(item.id)}
                                            className={`p-2.5 rounded-xl border flex items-center justify-between transition-all text-xs font-bold cursor-pointer ${
                                                isSelected 
                                                    ? 'bg-amber-950/40 border-amber-600 text-amber-300 shadow-md' 
                                                    : 'bg-slate-900/60 border-slate-850 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                                            }`}
                                        >
                                            <div className="flex items-center gap-2 truncate">
                                                <IconComponent size={15} className={item.colorClass.split(' ')[0]} />
                                                <span className="truncate">{item.label}</span>
                                            </div>
                                            {isSelected && <Check size={14} className="text-amber-400 shrink-0 ml-1" />}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="mt-3 pt-3 border-t border-slate-850 flex justify-end">
                            <button
                                onClick={() => setIsConfigOpen(false)}
                                className="w-full sm:w-auto px-6 py-2 bg-amber-600 hover:bg-amber-500 text-slate-950 font-extrabold text-xs rounded-xl transition-all shadow-md active:scale-95 cursor-pointer text-center"
                            >
                                설정 완료
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default React.memo(HeaderShortcuts);
