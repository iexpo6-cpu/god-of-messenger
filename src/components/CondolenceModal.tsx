import React, { useState, useMemo } from 'react';
import { Character, Companion, SimpleStudent, RelationType } from '../types';
import { 
    X, Heart, Sparkles, Flower, Flame, Wine, Edit3, MessageCircle, 
    Calendar, MapPin, Skull, Shield, Award, CheckCircle, Search, 
    BookOpen, Trees, PawPrint, Gavel, Landmark, Sun, Moon, Info, ChevronRight
} from 'lucide-react';

interface Props {
    character: Character;
    currentLocation?: { region?: string; nation?: string; city?: string };
    onClose: () => void;
    onUpdateCharacter: (newChar: Character, logMsg: string) => void;
}

interface DeceasedRecord {
    id: string;
    name: string;
    gender?: string;
    race?: string;
    nation?: string;
    origin?: string;
    originName?: string;
    job?: string;
    level?: number;
    militaryRank?: string;
    mercenaryRank?: string;
    affection?: number;
    purgedReason?: string;
    customEpitaph?: string;
    condolenceCount?: number;
    lastCondolenceDate?: string;
    memories?: string[];
    birthYear?: number;
    visualUrl?: string;
    isSpouse?: boolean;
    isLover?: boolean;
    isRival?: boolean;
    isEternalRival?: boolean;
    sourceType: 'companion' | 'socialNetwork' | 'school' | 'club' | 'temple';
}

export const CondolenceModal: React.FC<Props> = ({
    character,
    currentLocation,
    onClose,
    onUpdateCharacter
}) => {
    const loc = currentLocation || character.currentLocation || { region: "아시아", nation: character.nation || "대한민국", city: "서울" };
    const today = character.currentDate || '연도 미상';

    // 1. Gather all deceased records
    const allDeceased = useMemo(() => {
        const list: DeceasedRecord[] = [];
        const seenIds = new Set<string>();

        // 1) Companions (Active & Inactive & Deceased)
        const allComps = [...(character.companions || []), ...(character.inactiveCompanions || []), ...(character.deceasedCompanions || [])];
        allComps.forEach(c => {
            if ((c.isDead || c.isPurged) && !seenIds.has(c.id)) {
                seenIds.add(c.id);
                list.push({
                    id: c.id,
                    name: c.name,
                    gender: c.gender,
                    race: c.race,
                    nation: c.nation || character.nation || '대한민국',
                    origin: 'Companion',
                    originName: '함께했던 동료',
                    job: c.job,
                    level: c.level,
                    militaryRank: c.militaryRank,
                    mercenaryRank: c.mercenaryRank,
                    affection: c.affection,
                    purgedReason: c.purgedReason || '전사 또는 노환으로 영면',
                    customEpitaph: c.customEpitaph,
                    condolenceCount: c.condolenceCount || 0,
                    lastCondolenceDate: c.lastCondolenceDate,
                    memories: c.memories,
                    birthYear: c.birthYear,
                    visualUrl: c.visualUrl,
                    isSpouse: c.isSpouse,
                    isLover: c.isLover,
                    isRival: c.isRival,
                    isEternalRival: c.isEternalRival,
                    sourceType: 'companion'
                });
            }
        });

        // 2) Social Network
        if (character.socialNetwork) {
            character.socialNetwork.forEach(n => {
                if ((n.isDead || n.isPurged) && !seenIds.has(n.id)) {
                    seenIds.add(n.id);
                    list.push({
                        id: n.id,
                        name: n.name,
                        gender: n.gender,
                        race: n.race,
                        nation: n.nation || character.nation || '대한민국',
                        origin: n.origin || 'Social',
                        originName: n.originName || '평생의 인연',
                        job: n.job,
                        level: n.level,
                        militaryRank: n.militaryRank,
                        mercenaryRank: n.mercenaryRank,
                        affection: n.affection,
                        purgedReason: n.purgedReason || '노환 또는 사고로 영면',
                        customEpitaph: n.customEpitaph,
                        condolenceCount: n.condolenceCount || 0,
                        lastCondolenceDate: n.lastCondolenceDate,
                        memories: n.memories,
                        birthYear: n.birthYear,
                        visualUrl: n.visualUrl,
                        isSpouse: n.isSpouse,
                        isRival: n.isRival,
                        isEternalRival: n.isEternalRival,
                        sourceType: 'socialNetwork'
                    });
                }
            });
        }

        // 3) School Classmates
        if (character.schoolData?.classmates) {
            character.schoolData.classmates.forEach(s => {
                if ((s.isDead || s.isPurged) && !seenIds.has(s.id)) {
                    seenIds.add(s.id);
                    list.push({
                        id: s.id,
                        name: s.name,
                        gender: s.gender,
                        race: s.race,
                        nation: s.nation || character.nation || '대한민국',
                        origin: 'School',
                        originName: character.schoolData?.schoolName || '학창 시절 학우',
                        job: s.job,
                        level: s.level,
                        affection: s.affection,
                        purgedReason: s.purgedReason || '사망',
                        customEpitaph: s.customEpitaph,
                        condolenceCount: s.condolenceCount || 0,
                        lastCondolenceDate: s.lastCondolenceDate,
                        memories: s.memories,
                        birthYear: s.birthYear,
                        visualUrl: s.visualUrl,
                        sourceType: 'school'
                    });
                }
            });
        }

        // 4) Club Members
        if (character.clubData?.clubMembers) {
            character.clubData.clubMembers.forEach(m => {
                if ((m.isDead || m.isPurged) && !seenIds.has(m.id)) {
                    seenIds.add(m.id);
                    list.push({
                        id: m.id,
                        name: m.name,
                        gender: m.gender,
                        race: m.race,
                        nation: m.nation || character.nation || '대한민국',
                        origin: 'Club',
                        originName: character.clubData?.joinedClub || '동아리 부원',
                        job: m.job,
                        level: m.level,
                        affection: m.affection,
                        purgedReason: m.purgedReason || '사망',
                        customEpitaph: m.customEpitaph,
                        condolenceCount: m.condolenceCount || 0,
                        lastCondolenceDate: m.lastCondolenceDate,
                        memories: m.memories,
                        birthYear: m.birthYear,
                        visualUrl: m.visualUrl,
                        sourceType: 'club'
                    });
                }
            });
        }

        return list;
    }, [character]);

    // Local deceased matching current city / nation
    const localDeceased = useMemo(() => {
        return (allDeceased || []).filter(d => d && d.nation === loc.nation);
    }, [allDeceased, loc.nation]);

    // UI state
    const [selectedTab, setSelectedTab] = useState<'local' | 'world'>('local');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedId, setSelectedId] = useState<string | null>(
        localDeceased.length > 0 ? localDeceased[0].id : (allDeceased.length > 0 ? allDeceased[0].id : null)
    );

    // Interaction states
    const [actionLog, setActionLog] = useState<{ title: string; desc: string; type: 'flower' | 'incense' | 'wine' | 'whisper' | 'ceremony' } | null>(null);
    const [isEditingEpitaph, setIsEditingEpitaph] = useState(false);
    const [epitaphInput, setEpitaphInput] = useState('');

    const displayList = useMemo(() => {
        const sourceList = selectedTab === 'local' ? localDeceased : allDeceased;
        if (!searchQuery.trim()) return sourceList;
        const q = searchQuery.toLowerCase();
        return sourceList.filter(d => 
            d.name.toLowerCase().includes(q) || 
            (d.nation && d.nation.toLowerCase().includes(q)) ||
            (d.originName && d.originName.toLowerCase().includes(q)) ||
            (d.job && d.job.toLowerCase().includes(q))
        );
    }, [selectedTab, localDeceased, allDeceased, searchQuery]);

    const activeSoul = useMemo(() => {
        if (!selectedId) return null;
        return allDeceased.find(d => d.id === selectedId) || null;
    }, [selectedId, allDeceased]);

    // Facility name by nation
    const facilityTheme = useMemo(() => {
        if (loc.nation === '미르탈 숲연합') {
            return {
                title: '세계수 영혼의 안식원',
                subtitle: '엘프 숲연합 국립 추모림',
                icon: Trees,
                border: 'border-emerald-600/50',
                headerBg: 'from-emerald-950 via-slate-950 to-teal-950',
                accentColor: 'text-emerald-400',
                desc: '피어나는 나뭇잎과 세계수의 품에서 영원한 안식을 얻은 엘프와 숲의 영혼들을 추모합니다.'
            };
        }
        if (loc.nation === '레오니스 투기국') {
            return {
                title: '전사의 영혼 묘원',
                subtitle: '수인 투기국 명예 충혼의 전당',
                icon: PawPrint,
                border: 'border-amber-600/50',
                headerBg: 'from-amber-950 via-slate-950 to-orange-950',
                accentColor: 'text-amber-400',
                desc: '명예로운 투쟁 끝에 영면에 든 긍지 높은 전사들의 영혼을 기립니다.'
            };
        }
        if (loc.nation === '네크로디움 제국') {
            return {
                title: '심연의 영혼 안식처',
                subtitle: '마인 제국 침묵의 묘비각',
                icon: Gavel,
                border: 'border-purple-600/50',
                headerBg: 'from-purple-950 via-slate-950 to-black',
                accentColor: 'text-purple-400',
                desc: '모든 계약과 마도의 굴레를 벗어나 깊은 어둠 속 안식을 맞이한 마인들의 넋을 기립니다.'
            };
        }
        if (loc.region === '신계' || loc.nation === '신의 성소') {
            return {
                title: '성스러운 영혼의 성소',
                subtitle: '신계 사자 충혼 전당',
                icon: Sun,
                border: 'border-yellow-500/50',
                headerBg: 'from-yellow-950 via-slate-950 to-amber-950',
                accentColor: 'text-yellow-400',
                desc: '신성한 사명을 완수하고 빛의 품으로 돌아간 영혼들을 위한 신성한 추모원입니다.'
            };
        }
        return {
            title: `${loc.nation} 국립 추모원`,
            subtitle: `${loc.city} 영혼의 안식처`,
            icon: Landmark,
            border: 'border-slate-700/80',
            headerBg: 'from-slate-900 via-slate-950 to-indigo-950',
            accentColor: 'text-indigo-300',
            desc: `${loc.nation} 출신으로 세상을 떠난 소중한 인연들과 영웅들의 넋을 기리고 조문(헌화, 묵념)을 올립니다.`
        };
    }, [loc]);

    // Handle updating a deceased record's condolence data
    const handleUpdateSoulCondolence = (soulId: string, newEpitaph?: string, countIncrement: number = 1) => {
        const newChar: Character = { ...character };
        let updated = false;

        // 1. In Companions / Inactive
        if (newChar.companions) {
            newChar.companions = newChar.companions.map(c => {
                if (c.id === soulId) {
                    updated = true;
                    return {
                        ...c,
                        condolenceCount: (c.condolenceCount || 0) + countIncrement,
                        lastCondolenceDate: today,
                        customEpitaph: newEpitaph !== undefined ? newEpitaph : c.customEpitaph
                    };
                }
                return c;
            });
        }
        if (newChar.inactiveCompanions) {
            newChar.inactiveCompanions = newChar.inactiveCompanions.map(c => {
                if (c.id === soulId) {
                    updated = true;
                    return {
                        ...c,
                        condolenceCount: (c.condolenceCount || 0) + countIncrement,
                        lastCondolenceDate: today,
                        customEpitaph: newEpitaph !== undefined ? newEpitaph : c.customEpitaph
                    };
                }
                return c;
            });
        }

        // 2. In Social Network
        if (newChar.socialNetwork) {
            newChar.socialNetwork = newChar.socialNetwork.map(n => {
                if (n.id === soulId) {
                    updated = true;
                    return {
                        ...n,
                        condolenceCount: (n.condolenceCount || 0) + countIncrement,
                        lastCondolenceDate: today,
                        customEpitaph: newEpitaph !== undefined ? newEpitaph : n.customEpitaph
                    };
                }
                return n;
            });
        }

        // 3. In School
        if (newChar.schoolData?.classmates) {
            newChar.schoolData.classmates = newChar.schoolData.classmates.map(s => {
                if (s.id === soulId) {
                    updated = true;
                    return {
                        ...s,
                        condolenceCount: (s.condolenceCount || 0) + countIncrement,
                        lastCondolenceDate: today,
                        customEpitaph: newEpitaph !== undefined ? newEpitaph : s.customEpitaph
                    };
                }
                return s;
            });
        }

        // 4. In Club
        if (newChar.clubData?.clubMembers) {
            newChar.clubData.clubMembers = newChar.clubData.clubMembers.map(m => {
                if (m.id === soulId) {
                    updated = true;
                    return {
                        ...m,
                        condolenceCount: (m.condolenceCount || 0) + countIncrement,
                        lastCondolenceDate: today,
                        customEpitaph: newEpitaph !== undefined ? newEpitaph : m.customEpitaph
                    };
                }
                return m;
            });
        }

        return newChar;
    };

    // Actions
    const handleFlowerCondolence = () => {
        if (!activeSoul) return;
        const cost = 50;
        if (character.money < cost) {
            setActionLog({
                title: '골드 부족',
                desc: '하얀 국화 헌화를 위해 50G가 필요합니다.',
                type: 'flower'
            });
            return;
        }

        let updatedChar = handleUpdateSoulCondolence(activeSoul.id, undefined, 1);
        updatedChar.money -= cost;

        const logMsg = `[추모원 조문] ${activeSoul.name}님의 묘비에 하얀 국화를 헌화하고 넋을 기렸습니다. (-50G)`;
        onUpdateCharacter(updatedChar, logMsg);

        setActionLog({
            title: `하얀 국화 헌화 완료`,
            desc: `"${activeSoul.name}님의 영전에 순백의 국화 꽃다발을 바쳤습니다. 은은한 향기와 함께 고인의 평온한 안식을 기립니다."`,
            type: 'flower'
        });
    };

    const handleIncenseCondolence = () => {
        if (!activeSoul) return;

        let updatedChar = handleUpdateSoulCondolence(activeSoul.id, undefined, 1);

        const logMsg = `[추모원 조문] ${activeSoul.name}님의 영전에 향을 피우고 묵념을 올렸습니다.`;
        onUpdateCharacter(updatedChar, logMsg);

        setActionLog({
            title: `향공양 및 묵념`,
            desc: `"피어오르는 연기 속에서 ${activeSoul.name}님과 함께했던 기억들이 스쳐 지나갑니다. 깊은 침묵과 묵념을 통해 고인의 넋을 기리고 안식을 빕니다."`,
            type: 'incense'
        });
    };

    const handleWineCondolence = () => {
        if (!activeSoul) return;
        const cost = 100;
        if (character.money < cost) {
            setActionLog({
                title: '골드 부족',
                desc: '추모주를 올리기 위해 100G가 필요합니다.',
                type: 'wine'
            });
            return;
        }

        let updatedChar = handleUpdateSoulCondolence(activeSoul.id, undefined, 1);
        updatedChar.money -= cost;

        const logMsg = `[추모원 조문] ${activeSoul.name}님의 묘비에 맑은 추모주를 올렸습니다. (-100G)`;
        onUpdateCharacter(updatedChar, logMsg);

        const whisperResponses = [
            `"...나를 잊지 않고 찾아와 주었구나. 고맙다, 나의 영원한 친우여."`,
            `"...그곳에서의 모험은 어떠한가? 부디 나의 몫까지 후회 없이 나아가다오."`,
            `"당신이 따라준 이 잔의 향기... 전장에서 함께 나누던 온기가 느껴집니다."`,
            `"...언제나 당신의 발걸음에 바람과 축복이 깃들기를 기도하고 있겠습니다."`
        ];
        const randomWhisper = whisperResponses[Math.floor(Math.random() * whisperResponses.length)];

        setActionLog({
            title: `추모주 헌주 완료`,
            desc: `"묘비 주변에 정갈하게 술을 따르자, 스치는 바람결 사이로 ${activeSoul.name}님의 영혼이 따뜻한 미소를 짓는 환영이 느껴집니다."\n\n${randomWhisper}`,
            type: 'wine'
        });
    };

    const handleSaveEpitaph = () => {
        if (!activeSoul) return;
        const updatedChar = handleUpdateSoulCondolence(activeSoul.id, epitaphInput.trim(), 0);
        const logMsg = `[추모원 묘비명] ${activeSoul.name}님의 묘비명을 새겼습니다: "${epitaphInput.trim()}"`;
        onUpdateCharacter(updatedChar, logMsg);
        setIsEditingEpitaph(false);
        setActionLog({
            title: `묘비명 각명 완료`,
            desc: `"${activeSoul.name}님의 비석에 당신의 헌정사가 영구히 새겨졌습니다."`,
            type: 'ceremony'
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-fadeIn">
            <div className={`w-full max-w-5xl h-[92vh] max-h-[860px] rounded-3xl border ${facilityTheme.border} bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 shadow-2xl flex flex-col overflow-hidden text-slate-100 relative`}>
                
                {/* TOP HEADER */}
                <div className={`p-5 sm:p-6 border-b border-slate-800 bg-gradient-to-r ${facilityTheme.headerBg} flex items-center justify-between relative`}>
                    <div className="flex items-center gap-4">
                        <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-700 text-indigo-300 shadow-inner">
                            {React.createElement(facilityTheme.icon, { size: 28, className: facilityTheme.accentColor })}
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <span className={`text-[11px] font-black uppercase tracking-widest ${facilityTheme.accentColor} px-2.5 py-0.5 rounded-full bg-slate-950/80 border border-slate-800`}>
                                    {facilityTheme.subtitle}
                                </span>
                                <span className="text-xs text-slate-400 font-mono flex items-center gap-1">
                                    <MapPin size={12} /> {loc.nation} {loc.city}
                                </span>
                            </div>
                            <h2 className="text-xl sm:text-2xl font-black text-white font-cinzel flex items-center gap-2 mt-1">
                                <span>{facilityTheme.title}</span>
                            </h2>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="hidden sm:flex flex-col items-end text-xs text-slate-400">
                            <span>자국 안치: <strong className="text-amber-300 font-bold">{localDeceased.length}위</strong></span>
                            <span>전 세계 고인: <strong className="text-indigo-300 font-bold">{allDeceased.length}위</strong></span>
                        </div>
                        <button 
                            onClick={onClose}
                            className="p-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-700 text-slate-400 hover:text-white transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* TAB SELECTOR & SEARCH BAR */}
                <div className="px-5 py-3 border-b border-slate-800/80 bg-slate-950/60 flex flex-col sm:flex-row items-center justify-between gap-3">
                    {/* Tabs */}
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <button
                            onClick={() => setSelectedTab('local')}
                            className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all border flex items-center justify-center gap-2 ${
                                selectedTab === 'local'
                                    ? 'bg-indigo-950 border-indigo-500 text-indigo-200 shadow-md shadow-indigo-950/50'
                                    : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200'
                            }`}
                        >
                            <Landmark size={15} />
                            <span>{loc.nation} 안치 묘원 ({localDeceased.length})</span>
                        </button>

                        <button
                            onClick={() => setSelectedTab('world')}
                            className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all border flex items-center justify-center gap-2 ${
                                selectedTab === 'world'
                                    ? 'bg-purple-950 border-purple-500 text-purple-200 shadow-md shadow-purple-950/50'
                                    : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200'
                            }`}
                        >
                            <Heart size={15} />
                            <span>전 세계 안치 현황 ({allDeceased.length})</span>
                        </button>
                    </div>

                    {/* Search */}
                    <div className="relative w-full sm:w-64">
                        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                        <input 
                            type="text"
                            placeholder="고인 이름, 국적, 직업 검색..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                        />
                    </div>
                </div>

                {/* MAIN BODY: 2-COLUMN LAYOUT */}
                <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
                    
                    {/* LEFT: DECEASED LIST */}
                    <div className="w-full md:w-80 lg:w-96 border-b md:border-b-0 md:border-r border-slate-800 bg-slate-950/40 p-4 overflow-y-auto custom-scrollbar flex flex-col gap-2.5">
                        <div className="text-[11px] font-bold text-slate-400 px-1 mb-1 flex items-center justify-between">
                            <span>{selectedTab === 'local' ? `${loc.nation} 안치 영혼 목록` : '전 세계 고인 명단'}</span>
                            <span className="font-mono text-slate-500">{displayList.length}명</span>
                        </div>

                        {displayList.length === 0 ? (
                            <div className="py-16 text-center text-slate-500 flex flex-col items-center justify-center gap-3">
                                <Skull size={36} className="opacity-30" />
                                <p className="text-xs leading-relaxed">
                                    {selectedTab === 'local' 
                                        ? `현재 [${loc.nation}] 추모원에 안치된 고인이 없습니다.\n모든 인연과 전사자들이 평온히 살아가고 있거나 타국에 안치되어 있습니다.`
                                        : '기록된 고인 인연이 존재하지 않습니다.'}
                                </p>
                            </div>
                        ) : (
                            displayList.map(soul => {
                                const isSelected = selectedId === soul.id;
                                const isLocal = soul.nation === loc.nation;

                                return (
                                    <button
                                        key={soul.id}
                                        onClick={() => {
                                            setSelectedId(soul.id);
                                            setActionLog(null);
                                            setIsEditingEpitaph(false);
                                        }}
                                        className={`w-full p-3.5 rounded-2xl text-left transition-all border flex items-center gap-3 relative group ${
                                            isSelected 
                                                ? 'bg-gradient-to-r from-slate-900 to-indigo-950/80 border-indigo-500/80 shadow-lg' 
                                                : 'bg-slate-900/60 hover:bg-slate-900 border-slate-800/80 text-slate-400'
                                        }`}
                                    >
                                        {/* Avatar / Portrait */}
                                        <div className="w-11 h-11 rounded-xl bg-slate-950 border border-slate-700 overflow-hidden shrink-0 flex items-center justify-center relative">
                                            {soul.visualUrl ? (
                                                <img src={soul.visualUrl} alt={soul.name} className="w-full h-full object-cover filter grayscale contrast-125" referrerPolicy="no-referrer" />
                                            ) : (
                                                <span className="text-lg opacity-70">👤</span>
                                            )}
                                            {/* Mourning ribbon badge */}
                                            <div className="absolute top-0 right-0 w-3 h-3 bg-black border-l border-b border-slate-600 rotate-45 transform translate-x-1.5 -translate-y-1.5" />
                                        </div>

                                        {/* Info */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-1.5">
                                                <h4 className={`font-black text-sm truncate ${isSelected ? 'text-white' : 'text-slate-200'}`}>
                                                    {soul.name}
                                                </h4>
                                                {soul.isSpouse && <span className="text-[10px] px-1.5 py-0.2 rounded bg-pink-950 border border-pink-700 text-pink-300">배우자</span>}
                                                {soul.isLover && <span className="text-[10px] px-1.5 py-0.2 rounded bg-rose-950 border border-rose-700 text-rose-300">연인</span>}
                                                {soul.isEternalRival && <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-950 border border-amber-700 text-amber-300">라이벌</span>}
                                            </div>

                                            <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5 truncate">
                                                <span>{soul.nation || '국적 미상'}</span>
                                                <span>•</span>
                                                <span className="truncate">{soul.originName}</span>
                                            </div>

                                            <div className="text-[10px] text-slate-500 truncate mt-0.5">
                                                {soul.purgedReason}
                                            </div>
                                        </div>

                                        {/* Condolence count badge */}
                                        {(soul.condolenceCount || 0) > 0 && (
                                            <div className="shrink-0 flex flex-col items-end text-[10px] text-indigo-400 font-mono font-bold">
                                                <span>조문 {soul.condolenceCount}회</span>
                                            </div>
                                        )}
                                    </button>
                                );
                            })
                        )}
                    </div>

                    {/* RIGHT: DETAILED MEMORIAL STELE & CONDOLENCE ACTIONS */}
                    <div className="flex-1 p-5 sm:p-7 overflow-y-auto custom-scrollbar flex flex-col justify-between relative bg-gradient-to-b from-slate-950/80 to-slate-900/40">
                        {activeSoul ? (
                            <div className="space-y-6 max-w-3xl mx-auto w-full">
                                
                                {/* MEMORIAL STELE CARD */}
                                <div className="p-6 sm:p-7 rounded-3xl bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950 border-2 border-slate-700/80 shadow-2xl relative overflow-hidden">
                                    
                                    {/* Ethereal background accent */}
                                    <div className="absolute -top-12 -right-12 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
                                    
                                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 border-b border-slate-800 pb-5">
                                        <div className="flex items-center gap-4">
                                            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-slate-950 border-2 border-slate-600 overflow-hidden shadow-xl shrink-0 flex items-center justify-center relative">
                                                {activeSoul.visualUrl ? (
                                                    <img src={activeSoul.visualUrl} alt={activeSoul.name} className="w-full h-full object-cover filter grayscale contrast-125" referrerPolicy="no-referrer" />
                                                ) : (
                                                    <span className="text-3xl opacity-60">👤</span>
                                                )}
                                                <div className="absolute top-1 right-1 text-[10px] px-1.5 py-0.5 rounded bg-black/80 border border-slate-700 text-slate-300 font-mono">
                                                    故
                                                </div>
                                            </div>

                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-black text-indigo-400 px-2.5 py-0.5 rounded-full bg-indigo-950/80 border border-indigo-700/60">
                                                        {activeSoul.originName}
                                                    </span>
                                                    <span className="text-xs text-slate-400 font-mono">
                                                        안치국: <strong className="text-slate-200">{activeSoul.nation}</strong>
                                                    </span>
                                                </div>

                                                <h3 className="text-2xl sm:text-3xl font-black text-white mt-1 font-cinzel flex items-center gap-2">
                                                    <span>故 {activeSoul.name}</span>
                                                    {activeSoul.race && <span className="text-xs font-normal text-slate-400">({activeSoul.race})</span>}
                                                </h3>

                                                <div className="text-xs text-slate-400 mt-1 flex items-center gap-2 font-mono">
                                                    {activeSoul.job && <span>직업: {activeSoul.job}</span>}
                                                    {activeSoul.level && <span>• Lv.{activeSoul.level}</span>}
                                                    {activeSoul.militaryRank && <span>• {activeSoul.militaryRank}</span>}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Condolence status */}
                                        <div className="flex flex-col items-start sm:items-end text-xs text-slate-400 bg-slate-950/80 p-3 rounded-2xl border border-slate-800">
                                            <span className="text-indigo-300 font-bold">누적 조문: {activeSoul.condolenceCount || 0}회</span>
                                            <span className="text-[11px] text-slate-500 mt-0.5">
                                                마지막 조문: {activeSoul.lastCondolenceDate || '기록 없음'}
                                            </span>
                                        </div>
                                    </div>

                                    {/* EPITAPH & CAUSE OF DEATH */}
                                    <div className="mt-5 space-y-4">
                                        <div className="p-4 rounded-2xl bg-slate-950/90 border border-slate-800">
                                            <div className="text-[11px] font-black text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                                                <Skull size={13} className="text-slate-500" />
                                                <span>별세 사유 및 비문</span>
                                            </div>
                                            <p className="text-sm text-slate-300 leading-relaxed font-serif italic">
                                                "{activeSoul.purgedReason || '전사 또는 노환으로 평온히 영면'}"
                                            </p>
                                        </div>

                                        {/* CUSTOM EPITAPH (PLAYER'S INSCRIPTION) */}
                                        <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-950/40 via-slate-950 to-slate-950 border border-indigo-900/50 relative">
                                            <div className="flex items-center justify-between mb-1.5">
                                                <div className="text-[11px] font-black text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
                                                    <Edit3 size={13} />
                                                    <span>당신이 새긴 묘비명 (헌정사)</span>
                                                </div>
                                                <button
                                                    onClick={() => {
                                                        setEpitaphInput(activeSoul.customEpitaph || '');
                                                        setIsEditingEpitaph(!isEditingEpitaph);
                                                    }}
                                                    className="text-xs text-indigo-400 hover:text-indigo-200 underline font-bold"
                                                >
                                                    {isEditingEpitaph ? '취소' : activeSoul.customEpitaph ? '비문 수정' : '비문 새기기'}
                                                </button>
                                            </div>

                                            {isEditingEpitaph ? (
                                                <div className="mt-2 space-y-2">
                                                    <textarea
                                                        rows={2}
                                                        value={epitaphInput}
                                                        onChange={(e) => setEpitaphInput(e.target.value)}
                                                        placeholder="고인을 향한 마지막 헌정의 글귀를 입력하십시오..."
                                                        className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 resize-none"
                                                        maxLength={120}
                                                    />
                                                    <div className="flex justify-end">
                                                        <button
                                                            onClick={handleSaveEpitaph}
                                                            className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-colors"
                                                        >
                                                            비석에 각명하기
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <p className="text-xs sm:text-sm text-indigo-200 leading-relaxed font-serif">
                                                    {activeSoul.customEpitaph ? (
                                                        `"${activeSoul.customEpitaph}"`
                                                    ) : (
                                                        <span className="text-slate-500 italic">아직 묘비명이 새겨지지 않았습니다. [비문 새기기]를 눌러 고인에게 헌정사를 남기세요.</span>
                                                    )}
                                                </p>
                                            )}
                                        </div>

                                        {/* MEMORIES PREVIEW */}
                                        {activeSoul.memories && activeSoul.memories.length > 0 && (
                                            <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800/80 text-xs text-slate-400">
                                                <div className="font-bold text-slate-300 mb-1 flex items-center gap-1.5">
                                                    <BookOpen size={13} className="text-amber-400" />
                                                    <span>생전의 소중한 기억들</span>
                                                </div>
                                                <ul className="list-disc list-inside space-y-0.5 text-[11px] text-slate-400">
                                                    {activeSoul.memories.slice(0, 3).map((m, idx) => (
                                                        <li key={idx} className="truncate">{m}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* ACTION RESULT LOG NOTIFICATION */}
                                {actionLog && (
                                    <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-950 via-slate-950 to-indigo-950 border border-indigo-500/80 shadow-lg animate-fadeIn flex items-start gap-3">
                                        <div className="p-2 rounded-xl bg-indigo-900 text-indigo-300 shrink-0">
                                            {actionLog.type === 'flower' && <Flower size={20} />}
                                            {actionLog.type === 'incense' && <Flame size={20} />}
                                            {actionLog.type === 'wine' && <Wine size={20} />}
                                            {actionLog.type === 'ceremony' && <Sparkles size={20} />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-bold text-sm text-indigo-200">{actionLog.title}</h4>
                                            <p className="text-xs text-slate-300 mt-1 whitespace-pre-line leading-relaxed">
                                                {actionLog.desc}
                                            </p>
                                        </div>
                                        <button 
                                            onClick={() => setActionLog(null)}
                                            className="text-slate-400 hover:text-white text-xs"
                                        >
                                            <X size={16} />
                                        </button>
                                    </div>
                                )}

                                {/* CONDOLENCE INTERACTION BUTTONS */}
                                <div>
                                    <div className="text-xs font-black text-slate-400 uppercase tracking-wider mb-2.5 flex items-center gap-2">
                                        <span>추모 및 조문 행동</span>
                                        <span className="text-slate-600">•</span>
                                        <span className="text-slate-500 font-normal">보유 골드: {character.money.toLocaleString()}G</span>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                        {/* 1. 하얀 국화 헌화 */}
                                        <button
                                            onClick={handleFlowerCondolence}
                                            className="p-4 rounded-2xl bg-slate-900/90 hover:bg-indigo-950/80 border border-slate-800 hover:border-indigo-500/80 text-left transition-all group shadow-md active:scale-[0.98] flex flex-col justify-between"
                                        >
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 group-hover:scale-105 transition-transform">
                                                    <Flower size={20} />
                                                </div>
                                                <span className="text-[10px] font-black text-indigo-300 px-2 py-0.5 rounded bg-indigo-950 border border-indigo-800">
                                                    50G 소모
                                                </span>
                                            </div>
                                            <div>
                                                <h5 className="font-black text-sm text-white group-hover:text-indigo-200 transition-colors">
                                                    하얀 국화 헌화
                                                </h5>
                                                <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                                                    순백의 국화를 올리고 고인의 넋을 기립니다.
                                                </p>
                                            </div>
                                        </button>

                                        {/* 2. 향 피우고 묵념 */}
                                        <button
                                            onClick={handleIncenseCondolence}
                                            className="p-4 rounded-2xl bg-slate-900/90 hover:bg-amber-950/40 border border-slate-800 hover:border-amber-500/80 text-left transition-all group shadow-md active:scale-[0.98] flex flex-col justify-between"
                                        >
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 group-hover:scale-105 transition-transform">
                                                    <Flame size={20} />
                                                </div>
                                                <span className="text-[10px] font-black text-amber-300 px-2 py-0.5 rounded bg-amber-950 border border-amber-800">
                                                    무료
                                                </span>
                                            </div>
                                            <div>
                                                <h5 className="font-black text-sm text-white group-hover:text-amber-200 transition-colors">
                                                    향공양 및 묵념
                                                </h5>
                                                <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                                                    향을 피우고 묵념을 올리며 안식을 기원합니다.
                                                </p>
                                            </div>
                                        </button>

                                        {/* 3. 추모주 올리기 */}
                                        <button
                                            onClick={handleWineCondolence}
                                            className="p-4 rounded-2xl bg-slate-900/90 hover:bg-rose-950/40 border border-slate-800 hover:border-rose-500/80 text-left transition-all group shadow-md active:scale-[0.98] flex flex-col justify-between"
                                        >
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 group-hover:scale-105 transition-transform">
                                                    <Wine size={20} />
                                                </div>
                                                <span className="text-[10px] font-black text-rose-300 px-2 py-0.5 rounded bg-rose-950 border border-rose-800">
                                                    100G 소모
                                                </span>
                                            </div>
                                            <div>
                                                <h5 className="font-black text-sm text-white group-hover:text-rose-200 transition-colors">
                                                    추모주 올리기
                                                </h5>
                                                <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                                                    맑은 술을 묘비에 붓고 영혼의 따뜻한 환영과 작별을 나눕니다.
                                                </p>
                                            </div>
                                        </button>
                                    </div>
                                </div>

                            </div>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 p-8 space-y-4">
                                <div className="p-5 rounded-full bg-slate-900 border border-slate-800 text-slate-600">
                                    <Heart size={40} />
                                </div>
                                <h4 className="text-lg font-bold text-slate-300 font-cinzel">영혼의 안식처</h4>
                                <p className="text-xs text-slate-400 max-w-md leading-relaxed">
                                    좌측 명단에서 조문할 고인을 선택하십시오. 고인의 묘비명과 생전의 발자취를 기리고 헌화, 향공양, 추모주를 올릴 수 있습니다.
                                </p>
                            </div>
                        )}
                    </div>

                </div>

                {/* BOTTOM FOOTER */}
                <div className="p-4 border-t border-slate-800 bg-slate-950 flex items-center justify-between text-xs text-slate-400">
                    <div className="flex items-center gap-2">
                        <Heart size={14} className="text-pink-400" />
                        <span>생사를 함께했던 모든 인연들의 영원한 평온과 안식을 기원합니다.</span>
                    </div>
                    <button
                        onClick={onClose}
                        className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold transition-colors"
                    >
                        나가기
                    </button>
                </div>

            </div>
        </div>
    );
};

export default CondolenceModal;
