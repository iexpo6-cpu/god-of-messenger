import React, { useState, useMemo } from 'react';
import { Character, Item, ItemRarity, Companion, SimpleStudent } from '../types';
import { 
  X, Book, Crown, Package, Users, History, ScrollText, Gem, 
  Ghost, Sparkles, Sword, Heart, Shield, Award, Calendar, Search, Filter,
  Flame, HeartHandshake, Zap, Trophy, UserX, ShieldCheck
} from 'lucide-react';
import { getYear } from '../utils';
import FamilyTreeModal from './FamilyTreeModal';

interface Props {
  character: Character;
  onClose: () => void;
}

type TabType = 'timeline' | 'lineage' | 'romance' | 'rivalry' | 'legacy' | 'gallery';

const FamilyChroniclesModal: React.FC<Props> = ({ character, onClose }) => {
  const [activeTab, setActiveTab] = useState<TabType>('timeline');
  const [timelineFilter, setTimelineFilter] = useState<'all' | 'class_liberation' | 'skill_acquisition' | 'combat' | 'family' | 'growth'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const currentYear = getYear(character.currentDate || '2000-01-01');

  // 역대 가주 추출
  const predecessors = useMemo(() => {
    return (character.socialNetwork || []).filter(n => n.classType?.includes('가주') || n.id.startsWith('predecessor_'));
  }, [character.socialNetwork]);

  // 성물 (Relics) 추출
  const relics = useMemo(() => {
    const allItems = [
      ...character.inventory, 
      ...Object.values(character.equipment).filter(Boolean) as Item[], 
      ...(character.base?.storage || [])
    ];
    return allItems.filter(i => 
      i.rarity === ItemRarity.LEGENDARY || 
      i.rarity === ItemRarity.MYTHTIC || 
      i.rarity === ItemRarity.UNIQUE ||
      i.name.includes('성물') || i.name.includes('핵')
    );
  }, [character.inventory, character.equipment, character.base?.storage]);

  // Grouped Relics
  const groupedRelics = useMemo(() => {
    const groups: Record<string, { item: Item, count: number }> = {};
    relics.forEach(item => {
      if (groups[item.name]) {
        groups[item.name].count += 1;
      } else {
        groups[item.name] = { item, count: 1 };
      }
    });
    return Object.values(groups);
  }, [relics]);

  // 타임라인 데이터 정렬
  const rawTimeline = useMemo(() => {
    return [...(character.memories || [])]
      .filter(event => {
        if (event.includes('처치') || event.includes('격퇴!') || event.includes('처치!') || event.includes('격퇴')) {
          const isImportant = 
            event.includes('[BOSS]') || 
            event.includes('[정벌]') || 
            event.includes('[반역]') ||
            event.includes('지도자') ||
            event.includes('[성전 사자]') ||
            event.includes('제너럴') ||
            event.includes('마신');
          return isImportant;
        }
        return true;
      })
      .reverse();
  }, [character.memories]);

  // 연애 및 혼인 인물과 친한 사람들 구분 추출 (가주 본인과의 관계만 반영)
  const { romanceList, closeFriendsList } = useMemo(() => {
    const romance: Array<{
      id: string;
      name: string;
      relationType: string;
      affection: number;
      job?: string;
      race?: string;
      visualUrl?: string;
      note?: string;
    }> = [];

    const closeFriends: Array<{
      id: string;
      name: string;
      relationType: string;
      affection: number;
      job?: string;
      race?: string;
      visualUrl?: string;
      note?: string;
    }> = [];

    const addedIds = new Set<string>();

    // 1. 가주의 배우자
    const spouseObj = (character as any).spouse;
    if (spouseObj) {
      romance.push({
        id: spouseObj.id || 'spouse_main',
        name: spouseObj.name,
        relationType: '반려자 (혼인 관계)',
        affection: spouseObj.affection || 100,
        job: spouseObj.job || '배우자',
        race: spouseObj.race || '인간',
        visualUrl: spouseObj.visualUrl,
        note: '가문의 명예와 혈통을 함께 잇고 있는 평생의 반려자입니다.'
      });
      addedIds.add(spouseObj.id || 'spouse_main');
    }

    // 헬퍼: 가주(플레이어)와의 정식 연인 또는 배우자인지 판별 (동료간 연애/혼인은 제외)
    const checkIsSpouseOrLoverWithPlayer = (item: any) => {
      // 동료간 연애/혼인 속성 체크
      if (item.isLoverWithCompanion || item.isMarriedToCompanion || item.partnerType === 'companion' || item.spouseType === 'companion') {
        return { isSpouse: false, isLover: false };
      }

      const charId = (character as any).id;
      const pId = item.partnerId || item.spousePartnerId || item.relationshipPartnerId;
      if (pId && pId !== 'player' && pId !== charId && pId !== 'gaju') {
        return { isSpouse: false, isLover: false };
      }

      const pName = item.partnerName || item.spouseName;
      if (pName && pName !== character.name && pId && pId !== 'player' && pId !== charId) {
        return { isSpouse: false, isLover: false };
      }

      const isPlayerSpouseObj = (character as any).spouse?.id === item.id || (character as any).spouse?.name === item.name;

      const isSpouse = Boolean(
        isPlayerSpouseObj || 
        ((item.isSpouse || item.relationshipStatus === 'spouse' || item.isMarried) && (!pId || pId === 'player' || pId === charId))
      );

      const isLover = Boolean(
        !isSpouse && 
        ((item.isLover || item.isPartner || item.relationshipStatus === 'lover') && (!pId || pId === 'player' || pId === charId))
      );

      return { isSpouse, isLover };
    };

    // 2. 동료 파티 및 대기 동료
    const allCompanions = [...(character.companions || []), ...(character.inactiveCompanions || [])];
    allCompanions.forEach(c => {
      if (addedIds.has(c.id)) return;
      const { isSpouse, isLover } = checkIsSpouseOrLoverWithPlayer(c);
      const aff = c.affection || 0;

      if (isSpouse) {
        romance.push({
          id: c.id,
          name: c.name,
          relationType: '반려자 (혼인)',
          affection: aff,
          job: c.job,
          race: c.race,
          visualUrl: c.visualUrl,
          note: '가문의 중대사를 함께 고민하는 소중한 배우자입니다.'
        });
        addedIds.add(c.id);
      } else if (isLover) {
        romance.push({
          id: c.id,
          name: c.name,
          relationType: aff >= 90 ? '운명의 연인' : '깊은 마음을 나눈 연인',
          affection: aff,
          job: c.job,
          race: c.race,
          visualUrl: c.visualUrl,
          note: '서로에게 깊은 연정을 품고 신뢰를 이어가는 연인입니다.'
        });
        addedIds.add(c.id);
      } else if (aff >= 60) {
        closeFriends.push({
          id: c.id,
          name: c.name,
          relationType: aff >= 80 ? '매우 친밀한 동료' : '친한 동료',
          affection: aff,
          job: c.job,
          race: c.race,
          visualUrl: c.visualUrl,
          note: '가주와 우호적인 관계를 유지하며 높은 신뢰를 주고받는 친밀한 동료입니다.'
        });
        addedIds.add(c.id);
      }
    });

    // 3. 사회적 인맥
    (character.socialNetwork || []).forEach(n => {
      if (addedIds.has(n.id)) return;
      const { isSpouse, isLover } = checkIsSpouseOrLoverWithPlayer(n);
      const aff = n.affection || 0;

      if (isSpouse) {
        romance.push({
          id: n.id,
          name: n.name,
          relationType: '반려자 (혼인)',
          affection: aff,
          job: n.job,
          race: n.race,
          visualUrl: n.visualUrl,
          note: '서로의 헌신 속에 법적인 결실을 맺은 배우자입니다.'
        });
        addedIds.add(n.id);
      } else if (isLover) {
        romance.push({
          id: n.id,
          name: n.name,
          relationType: aff >= 90 ? '운명의 연인' : '연정을 품은 연인',
          affection: aff,
          job: n.job,
          race: n.race,
          visualUrl: n.visualUrl,
          note: '바깥 세상의 수많은 인연 중 깊은 사랑의 교감을 나눈 연인입니다.'
        });
        addedIds.add(n.id);
      } else if (aff >= 60) {
        closeFriends.push({
          id: n.id,
          name: n.name,
          relationType: aff >= 80 ? '각별한 지인' : '친한 지인',
          affection: aff,
          job: n.job,
          race: n.race,
          visualUrl: n.visualUrl,
          note: '높은 호감과 연대감으로 가주와 든든한 친분을 나누는 지인입니다.'
        });
        addedIds.add(n.id);
      }
    });

    // 4. 학교 동창
    if (character.schoolData?.classmates) {
      character.schoolData.classmates.forEach(s => {
        if (addedIds.has(s.id)) return;
        const { isSpouse, isLover } = checkIsSpouseOrLoverWithPlayer(s);
        const aff = s.affection || 0;

        if (isSpouse) {
          romance.push({
            id: s.id,
            name: s.name,
            relationType: '반려자 (혼인)',
            affection: aff,
            job: s.classType || '동창 배우자',
            race: s.race,
            note: '학창 시절부터 인연을 맺어 결실을 이룬 반려자입니다.'
          });
          addedIds.add(s.id);
        } else if (isLover) {
          romance.push({
            id: s.id,
            name: s.name,
            relationType: '학창 시절의 첫사랑/연인',
            affection: aff,
            job: s.classType || '동창 연인',
            race: s.race,
            note: '풋풋했던 학창 시절부터 이어져 온 인연과 로맨스의 주인공입니다.'
          });
          addedIds.add(s.id);
        } else if (aff >= 60) {
          closeFriends.push({
            id: s.id,
            name: s.name,
            relationType: '친한 동창',
            affection: aff,
            job: s.classType || '동창',
            race: s.race,
            note: '학창 시절부터 따뜻한 우정을 쌓아 온 마음 맞는 동창 친구입니다.'
          });
          addedIds.add(s.id);
        }
      });
    }

    return { romanceList: romance, closeFriendsList: closeFriends };
  }, [character]);

  // 연애 및 혼인 관련 연표 기록 추출 (가주 관련 로맨스 기록만 남김)
  const romanceMemories = useMemo(() => {
    return (character.memories || []).filter(m => {
      if (m.includes('동료간') || m.includes('동료 끼리') || m.includes('동료끼리') || m.includes('서로 연인') || m.includes('서로 혼인')) {
        return false;
      }
      return (
        m.includes('결혼') || 
        m.includes('혼인') || 
        m.includes('프로포즈') || 
        m.includes('고백') || 
        m.includes('연애') || 
        m.includes('배우자') || 
        m.includes('약혼') || 
        m.includes('데이트') ||
        m.includes('출산') ||
        m.includes('아이')
      );
    }).reverse();
  }, [character.memories]);

  // 라이벌 인물 및 결투/숙적 추출
  const rivalList = useMemo(() => {
    const list: Array<{
      id: string;
      name: string;
      type: string;
      level?: number;
      job?: string;
      race?: string;
      visualUrl?: string;
      wins?: number;
      losses?: number;
      note?: string;
    }> = [];

    const addedIds = new Set<string>();

    // 1. 영원의 라이벌 (rivalData)
    if ((character as any).rivalData) {
      const rd = (character as any).rivalData;
      list.push({
        id: rd.id || 'eternal_rival_main',
        name: rd.name || '영원의 숙적',
        type: '숙명의 주 라이벌',
        level: rd.level || character.level,
        job: rd.job || '라이벌 가주',
        wins: rd.wins || 0,
        losses: rd.losses || 0,
        note: '플레이어 가문과 대대로 명예와 자존심을 건 숙명의 라이벌 경쟁을 벌이는 상대입니다.'
      });
      addedIds.add(rd.id || 'eternal_rival_main');
    }

    // 2. 동료 파티 및 대기 동료 중 라이벌
    const allCompanions = [...(character.companions || []), ...(character.inactiveCompanions || [])];
    allCompanions.forEach(c => {
      if (addedIds.has(c.id)) return;
      const isRival = (c as any).isRival || (c as any).isEternalRival;
      if (isRival) {
        list.push({
          id: c.id,
          name: c.name,
          type: (c as any).isEternalRival ? '영원의 숙적' : '경쟁 상대 (라이벌)',
          level: c.level,
          job: c.job,
          race: c.race,
          visualUrl: c.visualUrl,
          note: '동료이자 가문의 라이벌로서 끊임없이 겨루며 성장을 자극하는 인물입니다.'
        });
        addedIds.add(c.id);
      }
    });

    // 3. 동창 중 라이벌 (classmates)
    if (character.schoolData?.classmates) {
      character.schoolData.classmates.forEach(s => {
        if (addedIds.has(s.id)) return;
        if (s.isRival || s.isEternalRival) {
          list.push({
            id: s.id,
            name: s.name,
            type: s.isEternalRival ? '영원의 라이벌 (동창)' : '학교 경쟁 라이벌',
            level: s.level,
            job: s.classType || '동창 라이벌',
            race: s.race,
            note: '학교 시절부터 1위를 다투며 학업과 무예를 겨루던 라이벌 친구입니다.'
          });
          addedIds.add(s.id);
        }
      });
    }

    // 4. 인맥 중 호감도가 매우 낮거나 라이벌 속성이 있는 인물
    (character.socialNetwork || []).forEach(n => {
      if (addedIds.has(n.id)) return;
      const isRival = (n as any).isRival || (n as any).isEternalRival;
      const aff = n.affection || 0;
      if (isRival || aff <= -20) {
        list.push({
          id: n.id,
          name: n.name,
          type: isRival ? '숙명의 라이벌' : '앙숙 관계',
          level: n.level,
          job: n.job,
          race: n.race,
          visualUrl: n.visualUrl,
          note: '서로간의 이해관계나 자존심 다툼으로 서늘한 대립 구도를 이어가고 있습니다.'
        });
        addedIds.add(n.id);
      }
    });

    return list;
  }, [character]);

  // 라이벌 및 결투 관련 기억 추출
  const rivalMemories = useMemo(() => {
    return (character.memories || []).filter(m => 
      m.includes('라이벌') || 
      m.includes('숙적') || 
      m.includes('결투') || 
      m.includes('대련') || 
      m.includes('겨루') || 
      m.includes('승리') || 
      m.includes('패배') || 
      m.includes('자존심')
    ).reverse();
  }, [character.memories]);

  // 태그 분류 함수
  const getEventCategory = (text: string) => {
    if (text.includes('클래스 해방') || text.includes('해방') || text.includes('각성') || text.includes('전직')) {
      return { id: 'class_liberation', label: '클래스 해방', color: 'bg-emerald-950/80 text-emerald-400 border-emerald-800/60', icon: ShieldCheck };
    }
    if (text.includes('스킬') || text.includes('기술') || text.includes('습득') || text.includes('배우')) {
      return { id: 'skill_acquisition', label: '스킬 습득', color: 'bg-cyan-950/80 text-cyan-400 border-cyan-800/60', icon: Zap };
    }
    if (text.includes('[BOSS]') || text.includes('처치') || text.includes('격퇴') || text.includes('승리') || text.includes('전투') || text.includes('토벌')) {
      return { id: 'combat', label: '전투 토벌', color: 'bg-red-950/80 text-red-400 border-red-800/60', icon: Sword };
    }
    if (text.includes('결혼') || text.includes('출산') || text.includes('배우자') || text.includes('자녀') || text.includes('동료') || text.includes('연애')) {
      return { id: 'family', label: '인연 혈통', color: 'bg-pink-950/80 text-pink-400 border-pink-800/60', icon: Heart };
    }
    if (text.includes('레벨') || text.includes('달성')) {
      return { id: 'growth', label: '성장 달성', color: 'bg-amber-950/80 text-amber-400 border-amber-800/60', icon: Sparkles };
    }
    return { id: 'general', label: '가문 기록', color: 'bg-indigo-950/80 text-indigo-400 border-indigo-800/60', icon: ScrollText };
  };

  const filteredTimeline = useMemo(() => {
    return rawTimeline.filter(event => {
      if (searchQuery.trim()) {
        if (!event.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      }
      if (timelineFilter === 'all') return true;
      const category = getEventCategory(event);
      return category.id === timelineFilter;
    });
  }, [rawTimeline, timelineFilter, searchQuery]);

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-2 md:p-6 animate-in fade-in duration-300">
      <div className="bg-slate-900 border border-amber-600/40 w-full max-w-6xl h-full md:h-[92vh] rounded-2xl md:rounded-3xl shadow-[0_0_80px_rgba(245,158,11,0.15)] flex flex-col overflow-hidden relative">
        
        {/* Subtle Decorative Background */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none"></div>

        {/* Header */}
        <div className="px-5 py-4 md:px-7 md:py-5 border-b border-slate-800 bg-slate-950/80 flex justify-between items-center shrink-0 z-10">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-700/10 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-md shrink-0">
              <History size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg md:text-2xl font-bold text-slate-100 font-cinzel tracking-tight">
                  {character.name.split(' ')[0]} 가문 연대기
                </h2>
                <span className="text-[10px] font-mono font-bold bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded border border-amber-500/30">
                  신성력 {currentYear}년
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">대대로 이어져 온 가문의 명예와 역사의 기록입니다.</p>
            </div>
          </div>

          <button 
            onClick={onClose} 
            className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition-colors shrink-0"
          >
            <X size={22} />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex bg-slate-950/90 border-b border-slate-800/80 overflow-x-auto no-scrollbar shrink-0 z-10 px-2">
          <button 
            onClick={() => setActiveTab('timeline')} 
            className={`px-4 md:px-6 py-3.5 text-xs md:text-sm font-bold transition-all border-b-2 flex items-center gap-2 shrink-0 ${
              activeTab === 'timeline' 
                ? 'text-amber-400 border-amber-500 bg-amber-500/10' 
                : 'text-slate-400 border-transparent hover:text-slate-200 hover:bg-slate-900/50'
            }`}
          >
            <ScrollText size={16} /> 가문 연표 
            <span className="text-[10px] font-mono px-1.5 py-0.2 bg-slate-800 rounded text-slate-300 ml-1">
              {rawTimeline.length}
            </span>
          </button>

          <button 
            onClick={() => setActiveTab('lineage')} 
            className={`px-4 md:px-6 py-3.5 text-xs md:text-sm font-bold transition-all border-b-2 flex items-center gap-2 shrink-0 ${
              activeTab === 'lineage' 
                ? 'text-amber-400 border-amber-500 bg-amber-500/10' 
                : 'text-slate-400 border-transparent hover:text-slate-200 hover:bg-slate-900/50'
            }`}
          >
            <Ghost size={16} /> 혈통 계보
          </button>

          {/* 연애 및 혼인 탭 */}
          <button 
            onClick={() => setActiveTab('romance')} 
            className={`px-4 md:px-6 py-3.5 text-xs md:text-sm font-bold transition-all border-b-2 flex items-center gap-2 shrink-0 ${
              activeTab === 'romance' 
                ? 'text-pink-400 border-pink-500 bg-pink-500/10' 
                : 'text-slate-400 border-transparent hover:text-slate-200 hover:bg-slate-900/50'
            }`}
          >
            <Heart size={16} className="text-pink-400" /> 연애 혼인 기록
            <span className="text-[10px] font-mono px-1.5 py-0.2 bg-pink-950 border border-pink-800 text-pink-300 ml-1 rounded-full">
              {romanceList.length}
            </span>
          </button>

          {/* 라이벌 및 대련 탭 */}
          <button 
            onClick={() => setActiveTab('rivalry')} 
            className={`px-4 md:px-6 py-3.5 text-xs md:text-sm font-bold transition-all border-b-2 flex items-center gap-2 shrink-0 ${
              activeTab === 'rivalry' 
                ? 'text-red-400 border-red-500 bg-red-500/10' 
                : 'text-slate-400 border-transparent hover:text-slate-200 hover:bg-slate-900/50'
            }`}
          >
            <Sword size={16} className="text-red-400" /> 라이벌 대결 스토리
            <span className="text-[10px] font-mono px-1.5 py-0.2 bg-red-950 border border-red-800 text-red-300 ml-1 rounded-full">
              {rivalList.length}
            </span>
          </button>

          <button 
            onClick={() => setActiveTab('legacy')} 
            className={`px-4 md:px-6 py-3.5 text-xs md:text-sm font-bold transition-all border-b-2 flex items-center gap-2 shrink-0 ${
              activeTab === 'legacy' 
                ? 'text-amber-400 border-amber-500 bg-amber-500/10' 
                : 'text-slate-400 border-transparent hover:text-slate-200 hover:bg-slate-900/50'
            }`}
          >
            <Crown size={16} /> 역대 가주
            <span className="text-[10px] font-mono px-1.5 py-0.2 bg-slate-800 rounded text-slate-300 ml-1">
              {predecessors.length + 1}
            </span>
          </button>

          <button 
            onClick={() => setActiveTab('gallery')} 
            className={`px-4 md:px-6 py-3.5 text-xs md:text-sm font-bold transition-all border-b-2 flex items-center gap-2 shrink-0 ${
              activeTab === 'gallery' 
                ? 'text-amber-400 border-amber-500 bg-amber-500/10' 
                : 'text-slate-400 border-transparent hover:text-slate-200 hover:bg-slate-900/50'
            }`}
          >
            <Gem size={16} /> 가문 보물고
            <span className="text-[10px] font-mono px-1.5 py-0.2 bg-slate-800 rounded text-slate-300 ml-1">
              {groupedRelics.length}
            </span>
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-6 relative z-10">
          
          {/* TAB: TIMELINE */}
          {activeTab === 'timeline' && (
            <div className="max-w-4xl mx-auto space-y-5 animate-in fade-in duration-200">
              
              {/* Controls Bar */}
              <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-3">
                {/* Category Filters */}
                <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto no-scrollbar">
                  {[
                    { id: 'all', label: '전체 보기', icon: ScrollText },
                    { id: 'class_liberation', label: '클래스 해방', icon: ShieldCheck },
                    { id: 'skill_acquisition', label: '스킬 습득', icon: Zap },
                    { id: 'combat', label: '전투 토벌', icon: Sword },
                    { id: 'family', label: '인연 혈통', icon: Heart },
                    { id: 'growth', label: '성장 달성', icon: Sparkles },
                  ].map(tab => {
                    const Icon = tab.icon;
                    const isActive = timelineFilter === tab.id;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setTimelineFilter(tab.id as any)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 border ${
                          isActive 
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' 
                            : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                        }`}
                      >
                        <Icon size={13} />
                        {tab.label}
                      </button>
                    );
                  })}
                </div>

                {/* Search Bar */}
                <div className="relative w-full md:w-64">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="기록 검색..."
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500/50"
                  />
                  {searchQuery && (
                    <button onClick={() => setSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                      <X size={12} />
                    </button>
                  )}
                </div>
              </div>

              {/* Timeline Items */}
              <div className="relative border-l-2 border-slate-800 ml-4 md:ml-6 pl-5 md:pl-8 space-y-4 py-2">
                {filteredTimeline.length > 0 ? filteredTimeline.map((event, idx) => {
                  const dateMatch = event.match(/\[(.*?)\]/);
                  const dateStr = dateMatch ? dateMatch[1] : '기록 일자 미상';
                  const content = event.replace(/\[.*?\]/, '').trim();
                  const cat = getEventCategory(event);
                  const CategoryIcon = cat.icon;

                  return (
                    <div key={idx} className="relative group">
                      {/* Timeline Node Dot */}
                      <div className="absolute -left-[27px] md:-left-[39px] top-3.5 w-3.5 h-3.5 rounded-full bg-slate-900 border-2 border-amber-500/80 group-hover:border-amber-400 group-hover:scale-125 transition-all shadow-[0_0_8px_rgba(245,158,11,0.3)]"></div>
                      
                      {/* Event Card */}
                      <div className="bg-slate-950 p-3.5 md:p-4 rounded-xl border border-slate-800 group-hover:border-slate-700 transition-all shadow-md">
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span className="text-[11px] font-mono text-amber-400 font-bold flex items-center gap-1">
                            <Calendar size={12} className="text-amber-500" />
                            {dateStr}
                          </span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded border flex items-center gap-1 ${cat.color}`}>
                            <CategoryIcon size={11} />
                            {cat.label}
                          </span>
                        </div>
                        <p className="text-slate-200 text-xs md:text-sm leading-relaxed font-serif">
                          "{content}"
                        </p>
                      </div>
                    </div>
                  );
                }) : (
                  <div className="text-center py-16 bg-slate-950/40 rounded-xl border border-slate-900 text-slate-500 text-xs">
                    <Book size={36} className="mx-auto mb-2 opacity-30 text-amber-500" />
                    검색 조건에 맞는 가문 기록이 없습니다.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB: LINEAGE (Embedded Family Tree) */}
          {activeTab === 'lineage' && (
            <div className="h-full min-h-[500px]">
              <FamilyTreeModal character={character} embedded={true} />
            </div>
          )}

          {/* TAB: ROMANCE (연애 및 혼인 기록) */}
          {activeTab === 'romance' && (
            <div className="space-y-6 animate-in fade-in duration-200 max-w-5xl mx-auto">
              {/* 안내 헤더 */}
              <div className="bg-gradient-to-r from-pink-950/40 via-purple-950/30 to-slate-950 p-4 rounded-2xl border border-pink-700/40 flex items-center justify-between gap-3 shadow-md">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-pink-500/20 border border-pink-500/40 rounded-xl text-pink-400 shrink-0">
                    <Heart size={24} className="fill-current" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-pink-200">가문 사랑과 혼인 실록</h3>
                    <p className="text-xs text-slate-300">가주의 평생을 함께한 반려자와 연인들의 로맨스 및 혼인 일지입니다.</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs font-bold shrink-0">
                  <span className="text-pink-300 bg-pink-950/80 px-3 py-1.5 rounded-xl border border-pink-700/60">
                    연인/혼인: {romanceList.length}명
                  </span>
                  <span className="text-purple-300 bg-purple-950/80 px-3 py-1.5 rounded-xl border border-purple-700/60">
                    친한 사람들: {closeFriendsList.length}명
                  </span>
                </div>
              </div>

              {/* 1. 주요 연애 및 혼인 인물 카드 목록 */}
              <div>
                <h4 className="text-xs font-bold text-pink-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Heart size={14} className="fill-current" /> 연인 및 혼인 관계 인연들
                </h4>
                {romanceList.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {romanceList.map(item => (
                      <div 
                        key={item.id} 
                        className="bg-slate-950/90 p-4 rounded-2xl border-2 border-pink-900/60 hover:border-pink-500/80 transition-all shadow-lg flex gap-4 items-start relative overflow-hidden group"
                      >
                        <div className="w-16 h-16 rounded-full border-2 border-pink-400 bg-slate-900 flex items-center justify-center shrink-0 overflow-hidden shadow-md">
                          {item.visualUrl ? (
                            <img src={item.visualUrl} alt={item.name} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-2xl">💍</span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="text-[10px] font-bold text-pink-300 bg-pink-950 border border-pink-700 px-2 py-0.5 rounded-md flex items-center gap-1">
                              <HeartHandshake size={11} /> {item.relationType}
                            </span>
                            {item.job && (
                              <span className="text-[10px] text-slate-400 bg-slate-900 border border-slate-800 px-2 py-0.5 rounded-md">
                                {item.job}
                              </span>
                            )}
                          </div>
                          <h5 className="text-base font-bold text-white truncate">{item.name}</h5>
                          <div className="flex items-center gap-2 mt-1 text-xs">
                            <span className="text-pink-400 font-bold flex items-center gap-1">
                              <Heart size={11} className="fill-current" /> 호감도: {item.affection}
                            </span>
                          </div>
                          <p className="text-xs text-slate-300 mt-2 leading-relaxed bg-slate-900/80 p-2.5 rounded-xl border border-slate-800/80 italic font-serif">
                            "{item.note}"
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 bg-slate-950/40 rounded-2xl border border-slate-900 text-slate-500 text-xs">
                    <Heart size={32} className="mx-auto mb-2 opacity-30 text-pink-500" />
                    아직 가문에 기록된 정식 연인이나 혼인 인연이 없습니다.
                  </div>
                )}
              </div>

              {/* 2. 친한 사람들 (호감도 높은 지인 및 동료) 목록 */}
              <div>
                <h4 className="text-xs font-bold text-purple-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Users size={14} className="text-purple-400" /> 친한 사람들 (친밀한 지인 및 동료)
                </h4>
                {closeFriendsList.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {closeFriendsList.map(item => (
                      <div 
                        key={item.id} 
                        className="bg-slate-950/90 p-4 rounded-2xl border border-purple-900/40 hover:border-purple-600/60 transition-all shadow-md flex gap-4 items-start relative overflow-hidden group"
                      >
                        <div className="w-14 h-14 rounded-full border border-purple-500/60 bg-slate-900 flex items-center justify-center shrink-0 overflow-hidden shadow-sm">
                          {item.visualUrl ? (
                            <img src={item.visualUrl} alt={item.name} className="w-full h-full object-cover" />
                          ) : (
                            <Users size={20} className="text-purple-400" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="text-[10px] font-bold text-purple-300 bg-purple-950 border border-purple-800 px-2 py-0.5 rounded-md flex items-center gap-1">
                              {item.relationType}
                            </span>
                            {item.job && (
                              <span className="text-[10px] text-slate-400 bg-slate-900 border border-slate-800 px-2 py-0.5 rounded-md">
                                {item.job}
                              </span>
                            )}
                          </div>
                          <h5 className="text-sm font-bold text-white truncate">{item.name}</h5>
                          <div className="flex items-center gap-2 mt-1 text-xs">
                            <span className="text-purple-300 font-bold flex items-center gap-1 text-[11px]">
                              <Heart size={10} className="fill-current text-purple-400" /> 호감도: {item.affection}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed bg-slate-900/60 p-2 rounded-lg border border-slate-800/60 italic font-serif">
                            "{item.note}"
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 bg-slate-950/40 rounded-2xl border border-slate-900 text-slate-500 text-xs">
                    아직 가문과 친분을 나누는 특별한 지인이 없습니다.
                  </div>
                )}
              </div>

              {/* 2. 연애/혼인 관련 연표 사건 타임라인 */}
              <div>
                <h4 className="text-xs font-bold text-pink-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Sparkles size={14} /> 로맨스 및 혼인 일지 기록
                </h4>
                {romanceMemories.length > 0 ? (
                  <div className="space-y-2.5">
                    {romanceMemories.map((mem, idx) => {
                      const dateMatch = mem.match(/\[(.*?)\]/);
                      const dateStr = dateMatch ? dateMatch[1] : '일자 미상';
                      const text = mem.replace(/\[.*?\]/, '').trim();
                      return (
                        <div key={idx} className="bg-slate-950 p-3.5 rounded-xl border border-pink-950 hover:border-pink-800/60 transition-all flex items-start gap-3">
                          <div className="p-2 bg-pink-950/80 rounded-lg text-pink-400 shrink-0 mt-0.5">
                            <Heart size={14} className="fill-current" />
                          </div>
                          <div className="flex-1">
                            <div className="text-[11px] font-mono text-pink-400 font-bold mb-0.5">
                              [{dateStr}]
                            </div>
                            <p className="text-xs text-slate-200 font-serif leading-relaxed">
                              "{text}"
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 bg-slate-950/40 rounded-xl border border-slate-900 text-slate-500 text-xs">
                    혼인 및 연애에 관련된 연표 기록이 아직 없습니다.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB: RIVALRY (라이벌 및 결투 스토리) */}
          {activeTab === 'rivalry' && (
            <div className="space-y-6 animate-in fade-in duration-200 max-w-5xl mx-auto">
              {/* 안내 헤더 */}
              <div className="bg-gradient-to-r from-red-950/40 via-orange-950/30 to-slate-950 p-4 rounded-2xl border border-red-700/40 flex items-center justify-between gap-3 shadow-md">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-red-500/20 border border-red-500/40 rounded-xl text-red-400 shrink-0">
                    <Sword size={24} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-red-200">라이벌 및 숙적 대결 실록</h3>
                    <p className="text-xs text-slate-300">가주의 자존심과 승부를 겨뤄 온 라이벌 및 대련 숙적들과의 서사입니다.</p>
                  </div>
                </div>
                <div className="text-xs font-bold text-red-300 bg-red-950/80 px-3 py-1.5 rounded-xl border border-red-700/60 shrink-0">
                  경쟁 상대: {rivalList.length}명
                </div>
              </div>

              {/* 1. 라이벌 인물 목록 */}
              <div>
                <h4 className="text-xs font-bold text-red-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Flame size={14} className="text-red-500" /> 숙명의 경쟁 상대들
                </h4>
                {rivalList.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {rivalList.map(item => (
                      <div 
                        key={item.id} 
                        className="bg-slate-950/90 p-4 rounded-2xl border-2 border-red-900/60 hover:border-red-500/80 transition-all shadow-lg flex gap-4 items-start relative overflow-hidden group"
                      >
                        <div className="w-16 h-16 rounded-full border-2 border-red-500 bg-slate-900 flex items-center justify-center shrink-0 overflow-hidden shadow-md">
                          {item.visualUrl ? (
                            <img src={item.visualUrl} alt={item.name} className="w-full h-full object-cover" />
                          ) : (
                            <Sword size={24} className="text-red-400" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="text-[10px] font-bold text-red-300 bg-red-950 border border-red-700 px-2 py-0.5 rounded-md flex items-center gap-1">
                              <Trophy size={11} /> {item.type}
                            </span>
                            {item.job && (
                              <span className="text-[10px] text-slate-400 bg-slate-900 border border-slate-800 px-2 py-0.5 rounded-md">
                                {item.job}
                              </span>
                            )}
                          </div>
                          <h5 className="text-base font-bold text-white truncate">{item.name}</h5>
                          <div className="flex items-center gap-3 mt-1 text-xs text-slate-300">
                            {item.level && <span>레벨: Lv.{item.level}</span>}
                            {item.wins !== undefined && (
                              <span className="text-amber-400 font-bold">
                                전적: {item.wins}승 {item.losses || 0}패
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-300 mt-2 leading-relaxed bg-slate-900/80 p-2.5 rounded-xl border border-slate-800/80 italic font-serif">
                            "{item.note}"
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-10 bg-slate-950/40 rounded-2xl border border-slate-900 text-slate-500 text-xs">
                    <Sword size={32} className="mx-auto mb-2 opacity-30 text-red-500" />
                    아직 가문에 기록된 공식 라이벌 및 숙적이 없습니다.
                  </div>
                )}
              </div>

              {/* 2. 라이벌/결투 연표 일지 */}
              <div>
                <h4 className="text-xs font-bold text-red-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Zap size={14} /> 결투 및 대련 승부 기록
                </h4>
                {rivalMemories.length > 0 ? (
                  <div className="space-y-2.5">
                    {rivalMemories.map((mem, idx) => {
                      const dateMatch = mem.match(/\[(.*?)\]/);
                      const dateStr = dateMatch ? dateMatch[1] : '일자 미상';
                      const text = mem.replace(/\[.*?\]/, '').trim();
                      return (
                        <div key={idx} className="bg-slate-950 p-3.5 rounded-xl border border-red-950 hover:border-red-800/60 transition-all flex items-start gap-3">
                          <div className="p-2 bg-red-950/80 rounded-lg text-red-400 shrink-0 mt-0.5">
                            <Sword size={14} />
                          </div>
                          <div className="flex-1">
                            <div className="text-[11px] font-mono text-red-400 font-bold mb-0.5">
                              [{dateStr}]
                            </div>
                            <p className="text-xs text-slate-200 font-serif leading-relaxed">
                              "{text}"
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 bg-slate-950/40 rounded-xl border border-slate-900 text-slate-500 text-xs">
                    라이벌 및 대현 승부와 관련된 연표 기록이 아직 없습니다.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB: LEGACY HALL */}
          {activeTab === 'legacy' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 flex items-center gap-3">
                <Crown size={22} className="text-amber-400 shrink-0" />
                <div>
                  <h3 className="text-sm font-bold text-slate-100">가문 명예의 전당</h3>
                  <p className="text-xs text-slate-400">가문의 번영을 일구어낸 현재 가주와 역대 가주들의 기록입니다.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Current Head Card */}
                <div className="bg-gradient-to-b from-amber-950/30 to-slate-950 p-5 rounded-2xl border-2 border-amber-500/80 relative overflow-hidden group shadow-lg flex flex-col justify-between">
                  <div className="absolute top-2.5 right-2.5 bg-amber-500 text-slate-950 font-black text-[10px] px-2 py-0.5 rounded shadow font-mono uppercase">
                    현재 가주
                  </div>
                  
                  <div>
                    <div className="w-16 h-16 rounded-full bg-slate-900 border-2 border-amber-400 flex items-center justify-center mx-auto mb-3 overflow-hidden shadow-md">
                      {character.visualUrl ? (
                        <img src={character.visualUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <Crown size={28} className="text-amber-400" />
                      )}
                    </div>

                    <div className="text-center">
                      <h4 className="text-base font-bold text-slate-100">{character.name}</h4>
                      <p className="text-xs font-bold text-amber-400 mt-0.5">{character.job}</p>
                      <p className="text-[11px] text-slate-400 mt-2 italic bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                        "{character.motto || '가문의 영광을 위하여 끝없이 정진하리라.'}"
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-800/80 grid grid-cols-2 gap-2 text-[11px]">
                    <div className="text-slate-400">현재 레벨: <span className="text-amber-300 font-bold font-mono">Lv.{character.level}</span></div>
                    <div className="text-slate-400">소속 국적: <span className="text-slate-200 font-bold">{character.nation || '무소속'}</span></div>
                  </div>
                </div>

                {/* Predecessors Cards */}
                {predecessors.map((pre, idx) => (
                  <div key={idx} className="bg-slate-950 p-5 rounded-2xl border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                          제{idx + 1}대 가주
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {pre.birthYear ? `${pre.birthYear}년생` : ''}
                        </span>
                      </div>

                      <div className="w-14 h-14 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center mx-auto mb-3 overflow-hidden">
                        {pre.visualUrl ? (
                          <img src={pre.visualUrl} alt={pre.name} className="w-full h-full object-cover" />
                        ) : (
                          <Ghost size={24} className="text-slate-500" />
                        )}
                      </div>

                      <div className="text-center">
                        <h4 className="text-sm font-bold text-slate-200">{pre.name}</h4>
                        <p className="text-xs text-slate-400 font-medium mt-0.5">{pre.classType || '전 가주'}</p>
                        {pre.purgedReason && (
                          <p className="text-[11px] text-slate-400 mt-2 italic bg-slate-900/60 p-2 rounded-lg border border-slate-800">
                            "{pre.purgedReason}"
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-800/80 grid grid-cols-2 gap-2 text-[11px]">
                      <div className="text-slate-400">최종 레벨: <span className="text-slate-300 font-bold font-mono">Lv.{pre.level || 1}</span></div>
                      <div className="text-slate-400">상태: <span className="text-slate-300 font-bold">{pre.isPurged ? '은퇴/서거' : '가문 계승'}</span></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB: GALLERY (Relics) */}
          {activeTab === 'gallery' && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Gem size={22} className="text-amber-400 shrink-0" />
                  <div>
                    <h3 className="text-sm font-bold text-slate-100">가문 보물고 (유물)</h3>
                    <p className="text-xs text-slate-400">가문이 모아온 유니크/전설/신화 등급의 귀중한 장비와 성물입니다.</p>
                  </div>
                </div>
                <div className="text-xs font-mono font-bold text-amber-400 bg-amber-500/10 px-3 py-1 rounded-lg border border-amber-500/30">
                  총 {groupedRelics.length}종 수집
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {groupedRelics.length > 0 ? groupedRelics.map((group, idx) => (
                  <div 
                    key={idx} 
                    className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 hover:border-amber-500/40 transition-all flex flex-col justify-between gap-2 relative group"
                  >
                    {group.count > 1 && (
                      <div className="absolute top-2 right-2 bg-amber-500 text-slate-950 font-bold font-mono text-[10px] px-1.5 py-0.2 rounded shadow z-10">
                        x{group.count}
                      </div>
                    )}

                    <div className="flex items-center gap-3">
                      <div className={`w-14 h-14 rounded-lg border flex items-center justify-center overflow-hidden shrink-0 bg-slate-900 ${
                        group.item.rarity === ItemRarity.MYTHTIC ? 'border-red-500/80 bg-red-950/20' : 
                        group.item.rarity === ItemRarity.LEGENDARY ? 'border-amber-500/80 bg-amber-950/20' : 
                        'border-purple-500/80 bg-purple-950/20'
                      }`}>
                        <img 
                          src={group.item.imageUrl || "https://api.dicebear.com/7.x/shapes/svg?seed=relic"} 
                          alt="" 
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform" 
                        />
                      </div>

                      <div className="min-w-0">
                        <span className={`text-[9px] font-bold uppercase font-mono px-1.5 py-0.2 rounded border ${
                          group.item.rarity === ItemRarity.MYTHTIC ? 'text-red-400 border-red-900/60 bg-red-950/40' : 
                          group.item.rarity === ItemRarity.LEGENDARY ? 'text-amber-400 border-amber-900/60 bg-amber-950/40' : 
                          'text-purple-400 border-purple-900/60 bg-purple-950/40'
                        }`}>
                          {group.item.rarity}
                        </span>
                        <h4 className="text-xs font-bold text-slate-200 truncate mt-1" title={group.item.name}>
                          {group.item.name}
                        </h4>
                      </div>
                    </div>

                    <p className="text-[10px] text-slate-400 line-clamp-2 italic bg-slate-900/50 p-2 rounded border border-slate-900 leading-relaxed">
                      "{group.item.description || '가문의 보물고에 간직된 역사적인 유물입니다.'}"
                    </p>
                  </div>
                )) : (
                  <div className="col-span-full py-16 text-center text-slate-500 bg-slate-950/40 rounded-xl border border-slate-900 text-xs">
                    <Package size={40} className="mx-auto mb-2 opacity-20 text-amber-500" />
                    아직 가문 보물고에 등록된 전설적인 유물이 없습니다.
                  </div>
                )}
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 bg-slate-950 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0 z-10 text-xs">
          <div className="flex items-center gap-6 text-slate-400">
            <div className="flex items-center gap-2">
              <ScrollText size={15} className="text-amber-400" />
              <span>기록 수: <strong className="text-slate-200 font-mono">{rawTimeline.length}</strong>개</span>
            </div>
            <div className="flex items-center gap-2">
              <Users size={15} className="text-indigo-400" />
              <span>가문 혈통/인연: <strong className="text-slate-200 font-mono">{(character.socialNetwork?.length || 0) + character.companions.length}</strong>명</span>
            </div>
            <div className="flex items-center gap-2">
              <Gem size={15} className="text-amber-400" />
              <span>가문 보물: <strong className="text-slate-200 font-mono">{relics.length}</strong>개</span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-lg text-xs transition-colors ml-auto"
          >
            닫기
          </button>
        </div>

      </div>
    </div>
  );
};

export default FamilyChroniclesModal;
