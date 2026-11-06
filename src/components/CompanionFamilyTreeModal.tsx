
import React, { useState, useMemo } from 'react';
import { Character, Companion, SimpleStudent, RelationType } from '../types';
import { X, Heart, Baby, GitBranch, Crown, Sparkles, Star, User, Users } from 'lucide-react';
import { getYear } from '../utils';
import { areSiblings, isHalfSibling } from '../services/siblingService';

interface Props {
    character: Character;
    companion: Companion | SimpleStudent; // [MODIFIED] NPC도 지원
    onClose: () => void;
}

const CompanionFamilyTreeModal: React.FC<Props> = ({ character, companion, onClose }) => {
    const [showSiblings, setShowSiblings] = useState<boolean>(true);
    const currentYear = getYear(character.currentDate || '2000-01-01');

    const allComps = useMemo(() => [
        ...character.companions, 
        ...(character.inactiveCompanions || []),
        ...(character.socialNetwork || []) // [NEW] 관계망 인물들도 검색 대상에 포함
    ], [character]);
    
    const isPlayerSpouse = (companion as any).isSpouse && (companion as any).partnerId === 'player';
    const companionSpouse = allComps.find(c => 
        c.isSpouse && 
        (c.id === (companion as any).partnerId || (c as any).partnerId === companion.id)
    );

    const spouse = isPlayerSpouse ? {
        id: 'player',
        name: character.name,
        gender: character.gender,
        race: character.race,
        age: character.age,
        birthYear: character.birthYear,
        isPlayer: true
    } : companionSpouse;
    
    const children = useMemo(() => allComps.filter(c => {
        const isChild = c.classType?.includes('자식') || c.classType?.includes('Child') || (c as any).origin === 'NpcChild';
        const isParent = c.childData?.parentNames?.includes(companion.name);
        return isChild && isParent;
    }), [allComps, companion.name]);

    // 해당 동료의 형제자매 추출 (플레이어 포함)
    const companionSiblings = useMemo(() => {
        const list: any[] = allComps.filter(c => 
            c.id !== companion.id &&
            c.name !== companion.name &&
            areSiblings(companion, c, character)
        );

        // 플레이어와의 형제자매 관계 여부 확인
        const isPlayerSib = (companion as any).relation === RelationType.SIBLING ||
                            companion.relations?.['player']?.type === RelationType.SIBLING ||
                            areSiblings(character, companion, character);

        if (isPlayerSib) {
            list.unshift({
                id: 'player',
                name: character.name,
                gender: character.gender,
                race: character.race,
                age: character.age,
                birthYear: character.birthYear,
                isPlayer: true
            });
        }

        return list;
    }, [allComps, companion, character]);

    const getAge = (c: any) => {
        if (c.birthYear !== undefined) return currentYear - c.birthYear;
        return parseInt(c.age?.replace(/[^0-9]/g, '')) || 0;
    };

    const MemberCard = ({ 
        name, role, age, gender, race, visualUrl, 
        isRoot = false, isSpouse = false, isPlayer = false, isSibling = false, siblingBadge = '' 
    }: any) => (
        <div className={`p-3 sm:p-4 rounded-2xl border-2 flex flex-col items-center text-center transition-all min-w-[110px] sm:min-w-[130px] max-w-[150px] shadow-lg shrink-0 
            ${isRoot ? 'bg-indigo-900/20 border-indigo-500 shadow-indigo-500/10' : 
              isPlayer ? 'bg-amber-900/30 border-amber-500 shadow-amber-500/20' :
              isSpouse ? 'bg-pink-900/20 border-pink-500 shadow-pink-500/10' : 
              isSibling ? 'bg-emerald-900/20 border-emerald-500 shadow-emerald-500/10' :
              'bg-green-900/10 border-green-700/50 shadow-green-900/10'}`}>
            
            <div className={`w-12 h-12 rounded-full mb-2 flex items-center justify-center border overflow-hidden
                ${isRoot ? 'bg-indigo-950 border-indigo-400' : 
                  isPlayer ? 'bg-amber-950 border-amber-400' :
                  isSpouse ? 'bg-pink-950 border-pink-400' : 
                  isSibling ? 'bg-emerald-950 border-emerald-400' :
                  'bg-green-950 border-green-600'}`}>
                {visualUrl ? (
                    <img src={visualUrl} alt={name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                    <>
                        {isRoot ? <Crown size={24} className="text-indigo-400" /> : 
                         isPlayer ? <User size={24} className="text-amber-400" /> :
                         isSpouse ? <Heart size={20} className="text-pink-400 fill-pink-400/20" /> : 
                         isSibling ? <Users size={20} className="text-emerald-400" /> :
                         <Baby size={20} className="text-green-400" />}
                    </>
                )}
            </div>
            
            <div className="text-xs sm:text-sm font-bold text-white truncate w-full flex items-center justify-center gap-1">
                {name}
                {isPlayer && <span className="text-[8px] bg-amber-600 text-white px-1 rounded">나</span>}
            </div>
            <div className="text-[10px] text-slate-400 font-bold tracking-tight mt-0.5">
                {isPlayer ? (isSpouse ? '배우자 (가주)' : '형제자매 (가주)') : role}
            </div>
            {siblingBadge && (
                <div className="mt-1 text-[9px] bg-emerald-950/90 border border-emerald-500/50 text-emerald-300 px-1.5 py-0.5 rounded-full font-bold truncate max-w-full shadow-sm">
                    👥 {siblingBadge}
                </div>
            )}
            <div className="mt-1 flex items-center gap-1.5 justify-center">
                <span className="text-[10px] text-slate-400">{age}세</span>
                <span className="text-slate-700">•</span>
                <span className="text-[10px] text-slate-400">{race}</span>
            </div>
        </div>
    );

    return (
        <div className="fixed inset-0 z-[190] flex items-center justify-center bg-black/95 backdrop-blur-sm p-3 sm:p-4 animate-in fade-in duration-300">
            <div className="bg-slate-900 border border-indigo-500/30 w-full max-w-5xl h-[80vh] rounded-3xl shadow-2xl flex flex-col relative overflow-hidden">
                <div className="p-4 sm:p-6 border-b border-slate-800 bg-slate-950 flex justify-between items-center shrink-0">
                    <div className="flex items-center">
                        <div className="p-2 bg-indigo-900/20 rounded-lg border border-indigo-500/30 mr-3">
                            <GitBranch size={22} className="text-indigo-400" />
                        </div>
                        <div>
                            <h2 className="text-lg sm:text-xl font-bold text-white font-cinzel">{companion.name}의 가계도</h2>
                            <p className="text-xs text-slate-500">인물의 혈통과 대물림 정보를 확인합니다.</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-slate-500 hover:text-white p-2 rounded-full hover:bg-slate-800 transition-colors">
                        <X size={22} />
                    </button>
                </div>

                <div className="flex-1 overflow-auto custom-scrollbar p-4 sm:p-10 bg-[url('https://www.transparenttextures.com/patterns/black-scales.png')] relative">
                    <div className="min-w-max flex flex-col items-center py-4">
                        {/* 계보 표시 설정 옵션 스위치 */}
                        <div className="w-full max-w-2xl mx-auto mb-6 bg-slate-900/90 p-3 sm:p-4 rounded-2xl border border-slate-800 flex flex-wrap items-center justify-between gap-3 shadow-md">
                            <div className="flex items-center gap-2">
                                <Users size={18} className="text-emerald-400" />
                                <span className="text-xs sm:text-sm font-bold text-slate-200">계보 표기 옵션</span>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowSiblings(prev => !prev)}
                                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border ${
                                    showSiblings 
                                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-[0_0_10px_rgba(16,185,129,0.2)]' 
                                        : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
                                }`}
                            >
                                <Users size={14} />
                                <span>형제자매 표시: <strong className={showSiblings ? 'text-emerald-300' : 'text-slate-400'}>{showSiblings ? '표시함' : '숨김'}</strong></span>
                            </button>
                        </div>

                        {/* 동료의 형제자매 섹션 (showSiblings 옵션이 ON일 때만 표기) */}
                        {showSiblings && companionSiblings.length > 0 && (
                            <div className="w-full max-w-4xl mb-8 p-4 bg-emerald-950/20 border border-emerald-800/40 rounded-3xl flex flex-col items-center shadow-lg animate-in fade-in duration-200">
                                <div className="flex items-center gap-2 mb-3 px-3 py-1 bg-emerald-900/40 border border-emerald-700/50 rounded-full text-emerald-300 text-xs font-bold">
                                    <Users size={14} />
                                    <span>{companion.name}의 형제자매</span>
                                </div>
                                <div className="flex gap-4 sm:gap-6 flex-wrap justify-center">
                                     {companionSiblings.map((sib, sibIdx) => {
                                        const isHalf = isHalfSibling(companion, sib, character);
                                        return (
                                            <MemberCard 
                                                key={`${sib.id || sib.name}-${sibIdx}`}
                                                name={sib.name}
                                                role="형제자매"
                                                age={getAge(sib)}
                                                gender={sib.gender}
                                                race={sib.race}
                                                visualUrl={sib.visualUrl}
                                                isSibling={true}
                                                isPlayer={sib.isPlayer}
                                                siblingBadge={isHalf ? '이복/이부 형제' : '친형제자매'}
                                            />
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* 부부 영역: 본인과 배우자 나란히 양옆 배치 */}
                        <div className="flex items-center justify-center gap-3 sm:gap-6 relative mb-12">
                            {/* 본인 카드 */}
                            <div className="relative">
                                <div className="absolute -top-9 left-1/2 -translate-x-1/2 text-indigo-500 animate-pulse">
                                    <Sparkles size={24} />
                                </div>
                                <MemberCard 
                                    name={companion.name} 
                                    role="본인" 
                                    age={getAge(companion)} 
                                    gender={companion.gender} 
                                    race={companion.race} 
                                    visualUrl={companion.visualUrl} 
                                    isRoot={true} 
                                />
                            </div>

                            {spouse ? (
                                <>
                                    {/* 부부 연결 브릿지 & 하트 */}
                                    <div className="flex flex-col items-center justify-center px-1 relative">
                                        <div className="flex items-center">
                                            <div className="w-6 sm:w-12 h-0.5 bg-gradient-to-r from-indigo-500 to-pink-500"></div>
                                            <div className="w-8 h-8 rounded-full bg-slate-900 border border-pink-500/60 flex items-center justify-center shadow-lg z-10 shrink-0">
                                                <Heart size={14} className="text-pink-400 fill-pink-500/40 animate-pulse" />
                                            </div>
                                            <div className="w-6 sm:w-12 h-0.5 bg-gradient-to-r from-pink-500 to-indigo-500"></div>
                                        </div>
                                        <span className="text-[10px] text-pink-400 font-bold mt-1 whitespace-nowrap">부부</span>
                                        {children.length > 0 && (
                                            <div className="absolute top-full left-1/2 -translate-x-1/2 w-0.5 h-12 bg-gradient-to-b from-pink-500 to-green-600"></div>
                                        )}
                                    </div>

                                    {/* 배우자 카드 (양옆에 나란히) */}
                                    <MemberCard 
                                        name={spouse.name} 
                                        role="배우자" 
                                        age={getAge(spouse)} 
                                        gender={spouse.gender} 
                                        race={spouse.race} 
                                        visualUrl={(spouse as any).visualUrl} 
                                        isSpouse={true} 
                                        isPlayer={(spouse as any).isPlayer} 
                                    />
                                </>
                            ) : (
                                children.length > 0 && (
                                    <div className="absolute top-full left-1/2 -translate-x-1/2 w-0.5 h-12 bg-indigo-500"></div>
                                )
                            )}
                        </div>

                        {/* 자식들 영역 (부부 아래에 위치) */}
                        {children.length > 0 && (
                            <div className="relative flex flex-col items-center mt-2">
                                {children.length > 1 && (
                                    <div className="h-0.5 bg-green-600/50" style={{ width: `calc(100% - 80px)` }}></div>
                                )}
                                <div className="flex gap-4 sm:gap-6 flex-wrap justify-center pt-5">
                                    {children.map((child, idx) => {
                                        let childSiblingBadge = '';
                                        if (showSiblings && children.length > 1) {
                                            const isHalf = isHalfSibling(companion, child, character);
                                            childSiblingBadge = isHalf ? '이복/이부 형제' : '친형제자매';
                                        }
                                        return (
                                            <div key={child.id || idx} className="relative">
                                                <div className="absolute -top-5 left-1/2 -translate-x-1/2 w-0.5 h-5 bg-green-600/50"></div>
                                                <MemberCard 
                                                    name={child.name} 
                                                    role="자녀" 
                                                    age={getAge(child)} 
                                                    gender={child.gender} 
                                                    race={child.race} 
                                                    visualUrl={child.visualUrl} 
                                                    siblingBadge={childSiblingBadge}
                                                />
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {!spouse && children.length === 0 && companionSiblings.length === 0 && (
                            <div className="text-slate-500 py-12 italic flex flex-col items-center">
                                <Heart size={36} className="mb-3 opacity-30 text-indigo-500" />
                                <p className="text-sm font-medium">기록된 가족 관계가 없습니다.</p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="p-3 sm:p-4 bg-slate-950 border-t border-slate-800 text-center shrink-0">
                    <p className="text-[10px] text-slate-500 tracking-widest font-bold">{companion.name}의 가계 계보 • 신성력 {currentYear}년</p>
                </div>
            </div>
        </div>
    );
};

export default CompanionFamilyTreeModal;

