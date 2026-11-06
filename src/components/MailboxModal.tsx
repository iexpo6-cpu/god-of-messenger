import React, { useState, useEffect } from 'react';
import { Mail, MailOpen, X, ChevronRight, Calendar, Trash2, CheckCheck } from 'lucide-react';
import { Character } from '../types';
import { WORLD_GEOGRAPHY } from '../constants';
import { isMailCategoryAllowed } from '../services/mailboxService';

const ALL_LOCATION_NAMES = (() => {
    const names = new Set<string>();
    if (!WORLD_GEOGRAPHY) return [];
    for (const [rName, rNations] of Object.entries(WORLD_GEOGRAPHY)) {
        if (rName && rName.length >= 2) names.add(rName);
        if (rNations && typeof rNations === 'object') {
            for (const [nName, nInfo] of Object.entries(rNations as Record<string, any>)) {
                if (nName && nName.length >= 2) names.add(nName);
                if (Array.isArray(nInfo)) {
                    for (const cName of nInfo) {
                        if (typeof cName === 'string' && cName.length >= 2) names.add(cName);
                    }
                } else if (nInfo && typeof nInfo === 'object') {
                    if (nInfo.capital && typeof nInfo.capital === 'string' && nInfo.capital.length >= 2) {
                        names.add(nInfo.capital);
                    }
                    if (Array.isArray(nInfo.cities)) {
                        for (const cName of nInfo.cities) {
                            if (typeof cName === 'string' && cName.length >= 2) names.add(cName);
                        }
                    }
                }
            }
        }
    }
    return Array.from(names).sort((a, b) => b.length - a.length);
})();

interface Message {
    id?: string;
    role: string;
    text: string;
    timestamp?: number;
    date?: string;
}

interface MailboxModalProps {
    isOpen: boolean;
    onClose: () => void;
    messages: Message[];
    currentDate?: string;
    character?: Character;
    onSelectCompanion?: (companionId: string) => void;
    onOpenSocial?: (targetPersonId?: string) => void;
    onOpenMap?: (locationName: string) => void;
}

const MailboxModal: React.FC<MailboxModalProps> = ({ 
    isOpen, 
    onClose, 
    messages, 
    currentDate,
    character,
    onSelectCompanion,
    onOpenSocial,
    onOpenMap
}) => {
    const [selectedLetter, setSelectedLetter] = useState<Message | null>(null);
    const [activeTab, setActiveTab] = useState<'all' | 'unread' | 'read'>('all');

    // Load read message IDs from local storage
    const [readMessageIds, setReadMessageIds] = useState<string[]>(() => {
        try {
            const saved = localStorage.getItem('mailbox_read_ids');
            return saved ? JSON.parse(saved) : [];
        } catch {
            return [];
        }
    });

    // Load deleted message IDs from local storage
    const [deletedMessageIds, setDeletedMessageIds] = useState<string[]>(() => {
        try {
            const saved = localStorage.getItem('mailbox_deleted_ids');
            return saved ? JSON.parse(saved) : [];
        } catch {
            return [];
        }
    });

    // Persist read/deleted states
    useEffect(() => {
        localStorage.setItem('mailbox_read_ids', JSON.stringify(readMessageIds));
    }, [readMessageIds]);

    useEffect(() => {
        localStorage.setItem('mailbox_deleted_ids', JSON.stringify(deletedMessageIds));
    }, [deletedMessageIds]);

    if (!isOpen) return null;

    const charAny = character as any;

    // Helper to get a unique key for any message
    const getMessageKey = (msg: Message) => {
        return msg.id || `${msg.text}_${msg.timestamp || 0}`;
    };

    // Helper to check if a letter's category is allowed based on GameSettingsModal preferences
    const isCategoryAllowed = (text: string) => isMailCategoryAllowed(text);

    // Filter messages that have bracket tags (e.g., [소식], [경사], [동료]), match filter preferences, and are not deleted
    const combinedMessagesList = [
        ...(messages || []),
        ...((character?.messages as Message[]) || [])
    ];
    const seenMsgKeys = new Set<string>();
    const uniqueCombinedList: Message[] = [];
    for (const msg of combinedMessagesList) {
        if (!msg || !msg.text) continue;
        const k = getMessageKey(msg);
        if (!seenMsgKeys.has(k)) {
            seenMsgKeys.add(k);
            uniqueCombinedList.push(msg);
        }
    }

    const letters = uniqueCombinedList
        .filter(msg => {
            if (!msg || !msg.text) return false;
            const isSystemOrAi = msg.role === 'ai';
            const hasBracket = msg.text.includes('[') && msg.text.includes(']');
            if (!isSystemOrAi || !hasBracket) return false;
            if (msg.text.startsWith('[전투 훈련소]') || msg.text.startsWith('[전투훈련소]')) return false;
            return isCategoryAllowed(msg.text);
        })
        .reverse(); // Newest first

    // Exclude deleted letters
    const activeLetters = letters.filter(letMsg => {
        return !deletedMessageIds.includes(getMessageKey(letMsg));
    });

    // Filter by Tab
    const displayedLetters = activeLetters.filter(letMsg => {
        const key = getMessageKey(letMsg);
        const isRead = readMessageIds.includes(key);
        if (activeTab === 'unread') return !isRead;
        if (activeTab === 'read') return isRead;
        return true;
    });

    // Mark a letter as read
    const handleReadLetter = (letMsg: Message) => {
        const key = getMessageKey(letMsg);
        if (!readMessageIds.includes(key)) {
            setReadMessageIds(prev => [...prev, key]);
        }
        setSelectedLetter(letMsg);
    };

    // Mark all active letters as read
    const handleReadAll = () => {
        const allKeys = activeLetters.map(l => getMessageKey(l));
        if (allKeys.length > 0) {
            setReadMessageIds(prev => {
                const updated = new Set([...prev, ...allKeys]);
                return Array.from(updated);
            });
        }
    };

    // Helper to handle person click in letters
    const handlePersonClick = (personName: string) => {
        const nameClean = personName.trim();
        if (!nameClean) return;

        // 1. Check active companions -> open companion status modal
        const activeCompanions = character?.companions || [];
        const matchedActive = activeCompanions.find(
            c => c.name === nameClean || c.name.replace(/\s+/g, '') === nameClean.replace(/\s+/g, '')
        );

        if (matchedActive) {
            if (onSelectCompanion) {
                onSelectCompanion(matchedActive.id);
            }
            return;
        }

        // 2. Check inactive companions (base companions) -> open social network modal with selected ID
        const inactiveCompanions = character?.inactiveCompanions || [];
        const matchedInactive = inactiveCompanions.find(
            c => c.name === nameClean || c.name.replace(/\s+/g, '') === nameClean.replace(/\s+/g, '')
        );

        if (matchedInactive) {
            if (onOpenSocial) {
                onOpenSocial(matchedInactive.id);
            }
            return;
        }

        // 3. Check social network (past relations, friends, etc.)
        const socialList = character?.socialNetwork || [];
        const matchedSocial = socialList.find(
            s => s.name === nameClean || s.name.replace(/\s+/g, '') === nameClean.replace(/\s+/g, '')
        );

        if (matchedSocial) {
            if (onOpenSocial) {
                onOpenSocial(matchedSocial.id);
            }
            return;
        }

        // 4. Check children / spouse / lovers
        const charAny = character as any;
        const otherFamily = [
            ...(charAny?.children || []),
            ...(charAny?.lovers || []),
            ...(charAny?.spouse ? [charAny.spouse] : [])
        ];
        const matchedFamily = otherFamily.find(
            f => f.name === nameClean || f.name.replace(/\s+/g, '') === nameClean.replace(/\s+/g, '')
        );

        if (matchedFamily) {
            if (onOpenSocial) {
                onOpenSocial(matchedFamily.id);
            }
            return;
        }

        // Fallback open social network
        if (onOpenSocial) {
            onOpenSocial();
        }
    };

    // Render interactive text with clickable character names and location names
    const renderInteractiveText = (text: string) => {
        if (!text) return null;

        const companionNames = new Set<string>();
        const allCompanions = [
            ...(character?.companions || []),
            ...(character?.inactiveCompanions || [])
        ];
        allCompanions.forEach(c => {
            if (c.name && c.name.trim().length >= 2) companionNames.add(c.name.trim());
        });

        const socialNames = new Set<string>();
        (character?.socialNetwork || []).forEach(s => {
            if (s.name && s.name.trim().length >= 2) socialNames.add(s.name.trim());
        });

        if (charAny?.children) {
            (charAny.children as any[]).forEach((ch: any) => {
                if (ch.name && ch.name.trim().length >= 2) socialNames.add(ch.name.trim());
            });
        }

        if (charAny?.spouse && charAny.spouse.name && charAny.spouse.name.trim().length >= 2) {
            socialNames.add(charAny.spouse.name.trim());
        }

        if (charAny?.lovers) {
            (charAny.lovers as any[]).forEach((l: any) => {
                if (l.name && l.name.trim().length >= 2) socialNames.add(l.name.trim());
            });
        }

        // Find location names present in text
        const matchedLocations = ALL_LOCATION_NAMES.filter(loc => text.includes(loc));

        const knownPersonNames = Array.from(new Set([...companionNames, ...socialNames]));
        const allKeywords = Array.from(new Set([...knownPersonNames, ...matchedLocations])).sort((a, b) => b.length - a.length);

        if (allKeywords.length === 0) {
            return <span>{text}</span>;
        }

        const escapedKeywords = allKeywords.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
        const regex = new RegExp(`(${escapedKeywords.join('|')})`, 'g');

        const parts = text.split(regex);

        return (
            <span>
                {parts.map((part, idx) => {
                    if (allKeywords.includes(part)) {
                        const isCompanion = Array.from(companionNames).some(
                            cn => cn === part || cn.replace(/\s+/g, '') === part.replace(/\s+/g, '')
                        );
                        const isSocial = Array.from(socialNames).some(
                            sn => sn === part || sn.replace(/\s+/g, '') === part.replace(/\s+/g, '')
                        );
                        const isLocation = matchedLocations.includes(part);

                        if (isCompanion || isSocial) {
                            return (
                                <button
                                    key={idx}
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handlePersonClick(part);
                                    }}
                                    className={`inline-block font-bold underline underline-offset-2 px-1.5 py-0.5 mx-0.5 rounded transition-all cursor-pointer ${
                                        isCompanion
                                            ? 'text-amber-950 bg-amber-200 hover:bg-amber-300 border border-amber-400/80 shadow-sm'
                                            : 'text-indigo-950 bg-indigo-200 hover:bg-indigo-300 border border-indigo-400/80 shadow-sm'
                                    }`}
                                    title={isCompanion ? `${part} (동료 정보 확인)` : `${part} (관계망 확인)`}
                                >
                                    {part}
                                </button>
                            );
                        } else if (isLocation) {
                            return (
                                <button
                                    key={idx}
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (onOpenMap) {
                                            onOpenMap(part);
                                        }
                                    }}
                                    className="inline-flex items-center gap-0.5 font-bold underline underline-offset-2 px-1.5 py-0.5 mx-0.5 rounded transition-all cursor-pointer text-emerald-950 bg-emerald-200 hover:bg-emerald-300 border border-emerald-400/80 shadow-sm"
                                    title={`${part} (지도 위치 확인)`}
                                >
                                    <span>📍</span>
                                    <span>{part}</span>
                                </button>
                            );
                        }
                    }
                    return <React.Fragment key={idx}>{part}</React.Fragment>;
                })}
            </span>
        );
    };

    // Delete single letter
    const handleDeleteOne = (letMsg: Message) => {
        const key = getMessageKey(letMsg);
        if (!deletedMessageIds.includes(key)) {
            setDeletedMessageIds(prev => [...prev, key]);
        }
    };

    // Delete all read letters
    const handleDeleteRead = () => {
        const readKeys = activeLetters
            .filter(l => readMessageIds.includes(getMessageKey(l)))
            .map(l => getMessageKey(l));
        
        if (readKeys.length > 0) {
            setDeletedMessageIds(prev => {
                const updated = [...prev];
                readKeys.forEach(k => {
                    if (!updated.includes(k)) updated.push(k);
                });
                return updated;
            });
        }
    };

    // Delete all letters
    const handleDeleteAll = () => {
        const allKeys = activeLetters.map(l => getMessageKey(l));
        if (allKeys.length > 0) {
            setDeletedMessageIds(prev => {
                const updated = [...prev];
                allKeys.forEach(k => {
                    if (!updated.includes(k)) updated.push(k);
                });
                return updated;
            });
        }
    };

    // Helper to extract prefix tag (e.g. "[소식]") and rest of the text
    const parseLetter = (text: string) => {
        const match = text.match(/^\[(.*?)\](.*)$/);
        if (match) {
            return {
                tag: match[1],
                content: match[2].trim()
            };
        }
        return {
            tag: '서신',
            content: text
        };
    };

    const getTagStyles = (tag: string) => {
        switch (tag) {
            case '소식':
            case '시스템':
                return 'bg-blue-950 text-blue-400 border border-blue-800/60';
            case '경사':
            case '결혼':
            case '출산':
                return 'bg-amber-950 text-amber-400 border border-amber-800/60';
            case '아쉬움':
            case '이별':
                return 'bg-red-950 text-red-400 border border-red-800/60';
            case '사육사 서신':
            case '특훈 서신':
            case '전담 훈련':
                return 'bg-emerald-950 text-emerald-400 border border-emerald-800/60';
            case '전투':
                return 'bg-slate-900 text-rose-400 border border-rose-950';
            default:
                return 'bg-slate-900 text-slate-400 border border-slate-800';
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
            {/* Outer Container */}
            <div className="relative w-full max-w-lg h-[80vh] bg-slate-950 border border-slate-850 rounded-2xl flex flex-col overflow-hidden shadow-2xl">
                {/* Header */}
                <div className="px-5 py-4 bg-slate-900 border-b border-slate-850 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-2">
                        <Mail className="w-5 h-5 text-amber-500" />
                        <h2 className="text-sm sm:text-base font-extrabold text-slate-100 font-sans">서신함</h2>
                        <span className="text-[10px] bg-amber-950 border border-amber-800 text-amber-400 px-2 py-0.5 rounded-full font-bold">
                            {activeLetters.length}통 수신
                        </span>
                    </div>
                    <button 
                        onClick={onClose} 
                        className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Tabs & Bulk Actions */}
                {!selectedLetter && activeLetters.length > 0 && (
                    <div className="px-4 py-2.5 bg-slate-900/80 border-b border-slate-850 flex flex-col gap-2.5 shrink-0">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            {/* Tab Selectors */}
                            <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-850">
                                {(['all', 'unread', 'read'] as const).map(tab => {
                                    const label = tab === 'all' ? '전체' : tab === 'unread' ? '안읽음' : '읽음';
                                    const count = tab === 'all' 
                                        ? activeLetters.length 
                                        : tab === 'unread' 
                                            ? activeLetters.filter(l => !readMessageIds.includes(getMessageKey(l))).length
                                            : activeLetters.filter(l => readMessageIds.includes(getMessageKey(l))).length;
                                    return (
                                        <button
                                            key={tab}
                                            onClick={() => setActiveTab(tab)}
                                            className={`px-3 py-1 rounded-lg text-[11px] font-black transition-all cursor-pointer ${activeTab === tab ? 'bg-amber-600 text-slate-950' : 'text-slate-400 hover:text-slate-200'}`}
                                        >
                                            {label} ({count})
                                        </button>
                                    );
                                })}
                            </div>
                            
                            {/* Bulk Actions */}
                            <div className="flex items-center gap-1.5 flex-wrap">
                                <button
                                    onClick={handleReadAll}
                                    className="px-2 py-1 bg-amber-950/80 hover:bg-amber-900 text-amber-300 border border-amber-700/60 rounded-lg text-[10px] font-black transition-all cursor-pointer flex items-center gap-1"
                                >
                                    <CheckCheck size={12} />
                                    <span>전체 읽음</span>
                                </button>
                                <button
                                    onClick={handleDeleteRead}
                                    className="px-2 py-1 bg-red-950/40 hover:bg-red-900 text-red-400 hover:text-white border border-red-900/35 rounded-lg text-[10px] font-black transition-all cursor-pointer"
                                >
                                    읽은 메일 삭제
                                </button>
                                <button
                                    onClick={handleDeleteAll}
                                    className="px-2 py-1 bg-red-950/80 hover:bg-red-850 text-white border border-red-700/50 rounded-lg text-[10px] font-black transition-all cursor-pointer"
                                >
                                    전체 삭제
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto p-4 flex flex-col min-h-0 bg-slate-950/45">
                    {selectedLetter ? (() => {
                        const currentIndex = displayedLetters.findIndex(l => getMessageKey(l) === getMessageKey(selectedLetter));
                        const prevLetter = currentIndex > 0 ? displayedLetters[currentIndex - 1] : null;
                        const nextLetter = currentIndex >= 0 && currentIndex < displayedLetters.length - 1 ? displayedLetters[currentIndex + 1] : null;

                        return (
                            /* Parchment Letter Detail View */
                            <div className="flex-1 flex flex-col h-full animate-in zoom-in-95 duration-150">
                                <div className="mb-3 flex items-center justify-between gap-2 w-full">
                                    <button 
                                        onClick={() => setSelectedLetter(null)}
                                        className="px-3 py-1.5 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-300 hover:text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-all active:scale-95"
                                    >
                                        ← 뒤로가기
                                    </button>
                                    <div className="flex items-center gap-1.5">
                                        <button
                                            disabled={!prevLetter}
                                            onClick={() => prevLetter && handleReadLetter(prevLetter)}
                                            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 border transition-all ${
                                                prevLetter
                                                    ? 'bg-slate-900 hover:bg-slate-800 text-amber-300 border-slate-700 cursor-pointer active:scale-95'
                                                    : 'bg-slate-950 text-slate-600 border-slate-900 opacity-40 cursor-not-allowed'
                                            }`}
                                        >
                                            ← 이전 서신
                                        </button>
                                        <button
                                            disabled={!nextLetter}
                                            onClick={() => nextLetter && handleReadLetter(nextLetter)}
                                            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 border transition-all ${
                                                nextLetter
                                                    ? 'bg-slate-900 hover:bg-slate-800 text-amber-300 border-slate-700 cursor-pointer active:scale-95'
                                                    : 'bg-slate-950 text-slate-600 border-slate-900 opacity-40 cursor-not-allowed'
                                            }`}
                                        >
                                            다음 서신 →
                                        </button>
                                    </div>
                                </div>
                                
                                {/* Parchment Styled Paper */}
                                <div className="flex-1 bg-amber-50 text-slate-900 border-2 border-amber-200/80 rounded-2xl p-5 sm:p-6 shadow-inner flex flex-col relative overflow-y-auto">
                                    {/* Letter Seal Accent */}
                                    <div className="absolute top-4 right-4 opacity-10">
                                        <MailOpen size={72} className="text-amber-900" />
                                    </div>

                                    {/* Letter Header */}
                                    <div className="border-b border-amber-200 pb-3 mb-4 shrink-0 flex items-center justify-between gap-2">
                                        <div>
                                            <span className="text-[10px] bg-amber-900 text-amber-100 px-2 py-0.5 rounded-md font-bold uppercase tracking-wider">
                                                {parseLetter(selectedLetter.text).tag}
                                            </span>
                                            <h3 className="text-[10px] sm:text-xs text-amber-800 font-bold mt-2 flex items-center gap-1.5 font-mono">
                                                <Calendar size={12} />
                                                <span>수신 날짜: {selectedLetter.date || (selectedLetter.timestamp ? new Date(selectedLetter.timestamp).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' }) : (currentDate || '제국력 1024년 3월 1일'))}</span>
                                            </h3>
                                        </div>
                                        <button
                                            onClick={() => {
                                                handleDeleteOne(selectedLetter);
                                                setSelectedLetter(null);
                                            }}
                                            className="px-3 py-1.5 bg-red-900 hover:bg-red-850 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all shadow-md active:scale-95 shrink-0"
                                        >
                                            <Trash2 size={12} />
                                            <span>삭제</span>
                                        </button>
                                    </div>

                                    {/* Letter Body */}
                                    <div className="flex-1 text-sm leading-relaxed font-semibold whitespace-pre-line text-slate-800 font-serif">
                                        {renderInteractiveText(parseLetter(selectedLetter.text).content)}
                                    </div>

                                    {/* Letter Footer */}
                                    <div className="border-t border-amber-200 pt-4 mt-4 text-right text-xs font-bold text-amber-800 shrink-0">
                                        전령으로부터
                                    </div>
                                </div>
                            </div>
                        );
                    })() : (
                        /* Letter List View */
                        <div className="flex-1 flex flex-col min-h-0">
                            {displayedLetters.length === 0 ? (
                                <div className="flex-1 flex flex-col items-center justify-center text-slate-500 py-12">
                                    <Mail className="w-12 h-12 text-slate-700 stroke-[1.5] mb-2 animate-pulse" />
                                    <p className="text-xs font-medium">수신된 서신이 없습니다.</p>
                                    <p className="text-[10px] text-slate-600 mt-1">사냥, 휴식, 또는 교류 활동을 통해 새로운 소식을 받아보세요.</p>
                                </div>
                            ) : (
                                <div className="space-y-2 pb-4">
                                    {displayedLetters.map((letMsg, idx) => {
                                        const parsed = parseLetter(letMsg.text);
                                        const key = getMessageKey(letMsg);
                                        const isRead = readMessageIds.includes(key);
                                        return (
                                            <div
                                                key={letMsg.id || idx}
                                                className="w-full bg-slate-900/40 hover:bg-slate-900/90 border border-slate-900 hover:border-slate-800 rounded-xl p-3 flex items-center justify-between gap-3 transition-all duration-150 group"
                                            >
                                                <div
                                                    onClick={() => handleReadLetter(letMsg)}
                                                    className="flex-1 text-left flex items-center gap-3 min-w-0 cursor-pointer"
                                                >
                                                    <div className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 transition-colors ${isRead ? 'bg-slate-950 border-slate-850' : 'bg-amber-950/40 border-amber-800/45'}`}>
                                                        {isRead ? (
                                                            <MailOpen className="w-4 h-4 text-slate-500 group-hover:text-slate-400" />
                                                        ) : (
                                                            <Mail className="w-4 h-4 text-amber-400 group-hover:text-amber-300 animate-pulse" />
                                                        )}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                                                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md ${getTagStyles(parsed.tag)}`}>
                                                                {parsed.tag}
                                                            </span>
                                                            {!isRead && (
                                                                <span className="text-[8px] bg-red-600 text-white font-extrabold px-1.5 py-0.5 rounded-full uppercase scale-90">NEW</span>
                                                            )}
                                                            {letMsg.timestamp && (
                                                                <span className="text-[9px] text-slate-500 font-mono">
                                                                    {new Date(letMsg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className={`text-xs font-black truncate ${isRead ? 'text-slate-400' : 'text-slate-100 group-hover:text-white'}`}>
                                                            {parsed.content}
                                                        </p>
                                                    </div>
                                                </div>

                                                {/* Actions block */}
                                                <div className="flex items-center gap-2 shrink-0">
                                                    <button
                                                        onClick={() => handleReadLetter(letMsg)}
                                                        className="p-1 hover:bg-slate-800 rounded-lg text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
                                                        title="읽기"
                                                    >
                                                        <ChevronRight size={14} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteOne(letMsg)}
                                                        className="p-1.5 bg-red-950/20 hover:bg-red-900/40 border border-red-900/35 hover:border-red-500/50 rounded-lg text-red-400 hover:text-white transition-all cursor-pointer"
                                                        title="삭제"
                                                    >
                                                        <Trash2 size={12} />
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default React.memo(MailboxModal);
