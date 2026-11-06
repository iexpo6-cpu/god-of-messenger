
import React, { useState, useMemo } from 'react';
import { Character, Companion, RelationType } from '../types';
import { X, Heart, Baby, User, GitBranch, Crown, Star, Sparkles, Skull, Users } from 'lucide-react';
import { getYear } from '../utils';
import { areSiblings, isHalfSibling } from '../services/siblingService';
 
interface Props {
    character: Character;
    onClose?: () => void;
    embedded?: boolean;
} 

const FamilyTreeModal: React.FC<Props> = ({ character, onClose, embedded = false }) => {
    const [showSiblings, setShowSiblings] = useState<boolean>(true);
    const currentYear = getYear(character.currentDate || '2000-01-01');

    const allComps = useMemo(() => [
        ...character.companions, 
        ...(character.inactiveCompanions || []),
        ...(character.socialNetwork?.filter(n => n.isPurged) || []) // 묘비명 데이터 포함
    ], [character]);
    
    const spouses = useMemo(() => allComps.filter(c => c.isSpouse), [allComps]);
    const children = useMemo(() => allComps.filter(c => c.classType?.includes('자녀') || c.classType?.includes('Child')), [allComps]);

    // 플레이어의 형제자매 추출
    const playerSiblings = useMemo(() => {
        return allComps.filter(c => 
            c.id !== 'player' &&
            c.name !== character.name &&
            ((c as any).relation === RelationType.SIBLING || areSiblings(character, c, character))
        );
    }, [allComps, character]);

    const getAge = (c: any) => {
        if (c.birthYear !== undefined) return currentYear - c.birthYear;
        return parseInt(c.age?.replace(/[^0-9]/g, '')) || 0;
    };

    // 가족 단위 데이터 구성 (배우자별 자녀 그룹화)
    const families = spouses.map(spouse => ({
        spouse,
        children: children.filter(child => child.childData?.parentNames?.includes(spouse.name))
    }));

    // 부모 정보가 없는 기타 자녀 (호환성용)
    const soloChildren = children.filter(child => 
        !child.childData?.parentNames || 
        !spouses.some(s => child.childData?.parentNames?.includes(s.name))
    );

    const MemberCard = ({ 
        name, role, age, gender, race, visualUrl, 
        isPlayer = false, isSpouse = false, isSibling = false, siblingBadge = '', isPurged = false 
    }: any) => (
        <div className={`p-3 sm:p-4 rounded-2xl border-2 flex flex-col items-center text-center transition-all min-w-[110px] sm:min-w-[130px] max-w-[150px] shadow-lg shrink-0 
            ${isPurged ? 'bg-slate-900 border-slate-700 opacity-60 grayscale' : 
              isPlayer ? 'bg-amber-900/20 border-amber-500 shadow-amber-500/10' : 
              isSpouse ? 'bg-pink-900/20 border-pink-500 shadow-pink-500/10' : 
              isSibling ? 'bg-emerald-900/20 border-emerald-500 shadow-emerald-500/10' :
              'bg-green-900/10 border-green-700/50 shadow-green-900/10'}`}>
            <div className={`w-12 h-12 rounded-full mb-2 flex items-center justify-center border overflow-hidden
                ${isPurged ? 'bg-slate-950 border-slate-800' :
                  isPlayer ? 'bg-amber-950 border-amber-400' : 
                  isSpouse ? 'bg-pink-950 border-pink-400' : 
                  isSibling ? 'bg-emerald-950 border-emerald-400' :
                  'bg-green-950 border-green-600'}`}>
                {visualUrl ? (
                    <img src={visualUrl} alt={name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                    <>
                        {isPurged ? <Skull size={20} className="text-slate-600" /> :
                         isPlayer ? <Crown size={24} className="text-amber-400" /> : 
                         isSpouse ? <Heart size={20} className="text-pink-400 fill-pink-400/20" /> : 
                         isSibling ? <Users size={20} className="text-emerald-400" /> :
                         <Baby size={20} className="text-green-400" />}
                    </>
                )}
            </div>
            <div className={`text-xs sm:text-sm font-bold truncate w-full ${isPurged ? 'text-slate-500' : 'text-white'}`}>{name}</div>
            <div className="text-[10px] text-slate-400 font-bold tracking-tight mt-0.5">{role}</div>
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
            {isPurged && <div className="mt-1 text-[8px] bg-red-950 text-red-500 px-1.5 py-0.5 rounded font-bold">고인</div>}
        </div>
    );

    const renderFamilyContent = () => (
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

            {/* 플레이어(가주)의 형제자매 섹션 (showSiblings 옵션이 ON일 때만 표기) */}
            {showSiblings && playerSiblings.length > 0 && (
                <div className="w-full max-w-4xl mb-8 p-4 bg-emerald-950/20 border border-emerald-800/40 rounded-3xl flex flex-col items-center shadow-lg animate-in fade-in duration-200">
                    <div className="flex items-center gap-2 mb-3 px-3 py-1 bg-emerald-900/40 border border-emerald-700/50 rounded-full text-emerald-300 text-xs font-bold">
                        <Users size={14} />
                        <span>가주({character.name})의 형제자매</span>
                    </div>
                    <div className="flex gap-4 sm:gap-6 flex-wrap justify-center">
                        {playerSiblings.map((sib, sibIdx) => {
                            const isHalf = isHalfSibling(character, sib, character);
                            return (
                                <MemberCard 
                                    key={`${sib.id || sib.name}-${sibIdx}`}
                                    name={sib.name}
                                    role="가주의 형제자매"
                                    age={getAge(sib)}
                                    gender={sib.gender}
                                    race={sib.race}
                                    visualUrl={sib.visualUrl}
                                    isSibling={true}
                                    siblingBadge={isHalf ? '이복/이부 형제' : '친형제자매'}
                                    isPurged={sib.isPurged}
                                />
                            );
                        })}
                    </div>
                </div>
            )}

            {families.length > 0 ? (
                <div className="flex flex-col md:flex-row gap-12 md:gap-16 items-center md:items-start justify-center">
                    {families.map((fam, famIdx) => (
                        <div key={`${fam.spouse.id || fam.spouse.name}-${famIdx}`} className="flex flex-col items-center">
                            {/* 부부 나란히 양옆 배치 */}
                            <div className="flex items-center justify-center gap-3 sm:gap-6 relative mb-12">
                                <div className="relative">
                                    {famIdx === 0 && (
                                        <div className="absolute -top-9 left-1/2 -translate-x-1/2 text-amber-500 animate-pulse">
                                            <Sparkles size={24} />
                                        </div>
                                    )}
                                    <MemberCard 
                                        name={character.name} 
                                        role="가주" 
                                        age={getAge(character)} 
                                        gender={character.gender} 
                                        race={character.race} 
                                        visualUrl={character.visualUrl}
                                        isPlayer={true} 
                                    />
                                </div>

                                {/* 부부 연결 브릿지 & 하트 */}
                                <div className="flex flex-col items-center justify-center px-1 relative">
                                    <div className="flex items-center">
                                        <div className="w-6 sm:w-12 h-0.5 bg-gradient-to-r from-amber-500 to-pink-500"></div>
                                        <div className="w-8 h-8 rounded-full bg-slate-900 border border-pink-500/60 flex items-center justify-center shadow-lg z-10 shrink-0">
                                            <Heart size={14} className="text-pink-400 fill-pink-500/40 animate-pulse" />
                                        </div>
                                        <div className="w-6 sm:w-12 h-0.5 bg-gradient-to-r from-pink-500 to-amber-500"></div>
                                    </div>
                                    <span className="text-[10px] text-pink-400 font-bold mt-1 whitespace-nowrap">
                                        부부 {families.length > 1 ? `(${famIdx + 1})` : ''}
                                    </span>
                                    {fam.children.length > 0 && (
                                        <div className="absolute top-full left-1/2 -translate-x-1/2 w-0.5 h-12 bg-gradient-to-b from-pink-500 to-green-600"></div>
                                    )}
                                </div>

                                {/* 부인 (배우자) 카드 */}
                                <MemberCard 
                                    name={fam.spouse.name} 
                                    role="배우자" 
                                    age={getAge(fam.spouse)} 
                                    gender={fam.spouse.gender} 
                                    race={fam.spouse.race} 
                                    visualUrl={fam.spouse.visualUrl}
                                    isSpouse={true}
                                    isPurged={fam.spouse.isPurged}
                                />
                            </div>

                            {/* 자식들 (부부 아래에 위치) */}
                            {fam.children.length > 0 && (
                                <div className="relative flex flex-col items-center mt-2">
                                    {fam.children.length > 1 && (
                                        <div className="h-0.5 bg-green-600/50" style={{ width: `calc(100% - 80px)` }}></div>
                                    )}
                                    <div className="flex gap-4 sm:gap-6 flex-wrap justify-center pt-5">
                                        {fam.children.map((child, childIdx) => {
                                            let childSiblingBadge = '';
                                            if (showSiblings) {
                                                if (fam.children.length > 1) {
                                                    childSiblingBadge = '친형제자매';
                                                } else if (children.length > 1) {
                                                    const isHalf = isHalfSibling(character, child, character);
                                                    childSiblingBadge = isHalf ? '이복/이부 형제' : '친형제자매';
                                                }
                                            }
                                            return (
                                                <div key={`${child.id || child.name}-${childIdx}`} className="relative">
                                                    <div className="absolute -top-5 left-1/2 -translate-x-1/2 w-0.5 h-5 bg-green-600/50"></div>
                                                    <MemberCard 
                                                        name={child.name} 
                                                        role="자녀" 
                                                        age={getAge(child)} 
                                                        gender={child.gender} 
                                                        race={child.race} 
                                                        visualUrl={child.visualUrl}
                                                        siblingBadge={childSiblingBadge}
                                                        isPurged={child.isPurged}
                                                    />
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            ) : (
                /* 배우자가 없는 경우 (플레이어 단독) */
                <div className="flex flex-col items-center">
                    <div className="relative mb-12">
                        <div className="absolute -top-9 left-1/2 -translate-x-1/2 text-amber-500 animate-pulse">
                            <Sparkles size={24} />
                        </div>
                        <MemberCard 
                            name={character.name} 
                            role="가주" 
                            age={getAge(character)} 
                            gender={character.gender} 
                            race={character.race} 
                            visualUrl={character.visualUrl}
                            isPlayer={true} 
                        />
                        {children.length > 0 && (
                            <div className="absolute top-full left-1/2 -translate-x-1/2 w-0.5 h-12 bg-amber-500"></div>
                        )}
                    </div>
                    {children.length > 0 && (
                        <div className="flex gap-4 sm:gap-6 flex-wrap justify-center pt-5">
                            {children.map((child, childIdx) => {
                                let childSiblingBadge = '';
                                if (showSiblings && children.length > 1) {
                                    const isHalf = isHalfSibling(character, child, character);
                                    childSiblingBadge = isHalf ? '이복/이부 형제' : '친형제자매';
                                }
                                return (
                                    <MemberCard 
                                        key={`${child.id || child.name}-${childIdx}`}
                                        name={child.name} 
                                        role="자녀" 
                                        age={getAge(child)} 
                                        gender={child.gender} 
                                        race={child.race} 
                                        visualUrl={child.visualUrl}
                                        siblingBadge={childSiblingBadge}
                                        isPurged={child.isPurged}
                                    />
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* 부모 정보가 불명확한 기타 자손 (방계) */}
            {soloChildren.length > 0 && families.length > 0 && (
                <div className="flex flex-col items-center mt-12 pt-8 border-t border-slate-800/60 w-full">
                    <div className="mb-6 px-3 py-1.5 rounded-xl border border-dashed border-slate-700 bg-slate-900/50 text-slate-400 text-xs font-bold">
                        기타 자손 (방계)
                    </div>
                    <div className="flex gap-4 sm:gap-6 flex-wrap justify-center">
                        {soloChildren.map((child, childIdx) => {
                            let childSiblingBadge = '';
                            if (showSiblings && children.length > 1) {
                                const isHalf = isHalfSibling(character, child, character);
                                childSiblingBadge = isHalf ? '이복/이부 형제' : '친형제자매';
                            }
                            return (
                                <MemberCard 
                                    key={`${child.id || child.name}-${childIdx}`}
                                    name={child.name} 
                                    role="자녀" 
                                    age={getAge(child)} 
                                    gender={child.gender} 
                                    race={child.race} 
                                    visualUrl={child.visualUrl}
                                    siblingBadge={childSiblingBadge}
                                    isPurged={child.isPurged}
                                />
                            );
                        })}
                    </div>
                </div>
            )}

            {spouses.length === 0 && children.length === 0 && playerSiblings.length === 0 && (
                <div className="text-slate-500 py-12 italic flex flex-col items-center">
                    <Heart size={36} className="mb-3 opacity-30 text-amber-500" />
                    <p className="text-sm font-medium">아직 직계 혈통이나 배우자, 형제자매 기록이 없습니다.</p>
                </div>
            )}
        </div>
    );

    if (embedded) {
        return (
            <div className="w-full h-full flex flex-col bg-slate-950/70 border border-slate-800 rounded-2xl overflow-hidden relative">
                <div className="flex-1 overflow-auto custom-scrollbar p-4 sm:p-8 relative">
                    {renderFamilyContent()}
                </div>

                {/* Footer Info */}
                <div className="p-3 bg-slate-950/80 border-t border-slate-800 text-center shrink-0">
                    <p className="text-[10px] text-slate-400 font-bold tracking-widest">{character.name} 가문의 가계 계보 • 신성력 {currentYear}년</p>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/95 backdrop-blur-md p-3 sm:p-4 animate-in fade-in duration-300">
            <div className="bg-slate-900 border border-amber-500/30 w-full max-w-6xl h-[85vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden relative">
                {/* Header */}
                <div className="p-4 sm:p-6 border-b border-slate-800 bg-slate-950 flex justify-between items-center shrink-0">
                    <div className="flex items-center">
                        <div className="p-2 bg-amber-900/20 rounded-lg border border-amber-500/30 mr-3">
                            <GitBranch size={22} className="text-amber-500" />
                        </div>
                        <div>
                            <h2 className="text-lg sm:text-xl font-bold text-white font-cinzel">가계도</h2>
                            <p className="text-xs text-slate-500">당신의 혈통과 인연이 기록된 가문의 계보입니다.</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-slate-500 hover:text-white p-2 rounded-full hover:bg-slate-800 transition-colors">
                        <X size={22} />
                    </button>
                </div>

                <div className="flex-1 overflow-auto custom-scrollbar p-4 sm:p-10 bg-[url('https://www.transparenttextures.com/patterns/black-scales.png')] relative">
                    {renderFamilyContent()}
                </div>

                {/* Footer Info */}
                <div className="p-3 sm:p-4 bg-slate-950 border-t border-slate-800 text-center shrink-0">
                    <p className="text-[10px] text-slate-500 tracking-widest font-bold">{character.name} 가문의 가계 계보 • 신성력 {currentYear}년</p>
                </div>
            </div>
        </div>
    );
};

export default FamilyTreeModal;
