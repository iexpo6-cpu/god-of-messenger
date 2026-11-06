import React, { useState } from 'react';
import { Character, Companion, JobType, ActiveStatus } from '../types';
import { processInnRest } from '../services/timeEngine';
import { 
  DETAILED_BOSSES, 
  EUROPE_BOSSES, 
  ASIA_BOSSES, 
  AMERICA_BOSSES, 
  AFRICA_BOSSES, 
  FANTASY_BOSSES, 
  DIVINE_REALM_BOSSES,
  BossData
} from '../bossMonsters';
import { generateName, generateCompanionStats, generateDefaultVisualUrl, calculateFinalStats } from '../utils';
import { 
  X, BedDouble, Beer, Sparkles, UserPlus, 
  Info, Heart, Wine, UserCheck, MapPin
} from 'lucide-react';

interface InnModalProps {
  character: Character;
  onClose: () => void;
  onUpdateCharacter: (newChar: Character, logMsg?: string | string[], dailyReport?: any) => void;
}

// 대륙별 보스 정보 매핑
const CONTINENT_BOSS_MAP: Record<string, Record<string, Record<string, BossData>>> = {
  '아시아': { ...DETAILED_BOSSES, ...ASIA_BOSSES },
  '유럽': EUROPE_BOSSES,
  '아메리카': AMERICA_BOSSES,
  '아프리카': AFRICA_BOSSES,
  '판타지': FANTASY_BOSSES,
  '신계': DIVINE_REALM_BOSSES,
};

export const InnModal: React.FC<InnModalProps> = ({
  character,
  onClose,
  onUpdateCharacter,
}) => {
  const [activeTab, setActiveTab] = useState<'lodging' | 'boss_rumors' | 'tavern'>('lodging');
  
  // 객실 투숙 옵션
  const [includeCompanions, setIncludeCompanions] = useState<boolean>(true);
  
  // 플레이어의 현재 위치 기반 대륙 결정 (기본값: 아시아)
  const playerRegion = character.currentLocation?.region || '아시아';
  const currentContinentKey = Object.keys(CONTINENT_BOSS_MAP).find(c => playerRegion.includes(c)) || '아시아';
  const currentContinentNations = CONTINENT_BOSS_MAP[currentContinentKey] || CONTINENT_BOSS_MAP['아시아'];
  const availableNations = Object.keys(currentContinentNations);

  // 보스 소문 상태 (같은 대륙 내 국가 및 특정 한 지역 선택)
  const [selectedNation, setSelectedNation] = useState<string>(() => availableNations[0] || '대한민국');
  const availableCities = Object.keys(currentContinentNations[selectedNation] || {});
  const [selectedCity, setSelectedCity] = useState<string>(() => availableCities[0] || '');

  const [unlockedRumors, setUnlockedRumors] = useState<Record<string, boolean>>({});
  
  // 술집 및 정산 상태
  const [selectedCompanionForDrink, setSelectedCompanionForDrink] = useState<string>('');
  const [tavernMessage, setTavernMessage] = useState<string>('');
  const [wanderingRecruited, setWanderingRecruited] = useState<boolean>(false);

  // 술 대접 1회 제한 상태
  const [hasBoughtDrinkForWanderer, setHasBoughtDrinkForWanderer] = useState<boolean>(false);
  const [hasDrunkWithCompanionToday, setHasDrunkWithCompanionToday] = useState<boolean>(false);

  // 결과 안내 모달
  const [modalResult, setModalResult] = useState<{ title: string; message: string; type: 'success' | 'info' | 'warning' } | null>(null);

  const currentYearMonth = character.currentDate ? character.currentDate.substring(0, 7) : '2000-01';
  const hasWandererVisitedThisMonth = (character as any).lastInnWandererDate === currentYearMonth;
  const hasListenedBossRumorToday = (character as any).lastBossRumorDate === character.currentDate;

  // 이달의 방랑 인물 생성 (레벨 1~100)
  const [wanderingNpc, setWanderingNpc] = useState<Companion | null>(() => {
    if (hasWandererVisitedThisMonth) return null;
    const currentYearNum = character.currentDate ? parseInt(character.currentDate.split('-')[0]) : 2000;
    
    // 방랑인 레벨은 1~100 사이
    const level = Math.floor(Math.random() * 100) + 1;
    const gender = Math.random() < 0.5 ? '남성' : '여성';
    const nation = character.currentLocation?.nation || '대한민국';
    const name = generateName(nation, gender === '남성' ? 'male' : 'female');
    const stats = generateCompanionStats(level);
    
    const classes = ['검사', '창술사', '마법사', '궁수', '도적', '권사', '버서커', '거너', '에너지술사'];
    const selectedClass = classes[Math.floor(Math.random() * classes.length)];

    return {
      id: `inn_wanderer_${Date.now()}`,
      name: name,
      age: String(20 + Math.floor(Math.random() * 15)),
      birthYear: currentYearNum - (20 + Math.floor(Math.random() * 15)),
      gender: gender,
      race: '인간',
      nation: nation,
      level: level,
      currentExp: 0,
      maxExp: level * 100,
      job: JobType.UNEMPLOYED,
      classType: selectedClass,
      firstClassName: selectedClass,
      classTier: '1차',
      stats: stats,
      statPoints: 0,
      skills: [],
      equipment: {},
      affection: 20,
      loyalty: 50,
      isCustom: false,
      defaultVisualUrl: generateDefaultVisualUrl(name, nation, '인간', gender),
      metYear: currentYearNum,
      personality: '방랑자',
      appearance: '여관 술집 한구석에서 모험의 열기를 간직한 채 술잔을 기울이는 방랑자.',
    } as unknown as Companion;
  });

  // 국가 변경 핸들러
  const handleNationChange = (nation: string) => {
    setSelectedNation(nation);
    const cities = Object.keys(currentContinentNations[nation] || {});
    if (cities.length > 0) {
      setSelectedCity(cities[0]);
    } else {
      setSelectedCity('');
    }
  };

  // 객실 이용 처리
  const handleRoomStay = (roomType: 'standard' | 'superior' | 'deluxe') => {
    let baseGoldCost = 10000;
    let buffName = '일반 휴식';
    let buffEffect = '체력 및 마력 회복률 증가';
    let boostAmount = 5;

    if (roomType === 'superior') {
      baseGoldCost = 80000;
      buffName = '상급 휴식';
      buffEffect = '경험치 획득량 증가, 공격력 및 마법력 상승';
      boostAmount = 8;
    } else if (roomType === 'deluxe') {
      baseGoldCost = 500000;
      buffName = '귀빈 휴식';
      buffEffect = '경험치 획득량 대폭 증가, 공격력 및 마법력 상승, 치명타율 상승';
      boostAmount = 10;
    }

    // 동료수(ActiveCompanion + 플레이어)만큼 비용 배수로 증가
    const activeCompanionCount = character.companions ? character.companions.length : 0;
    const costMultiplier = includeCompanions ? (1 + activeCompanionCount) : 1;
    const goldCost = baseGoldCost * costMultiplier;

    if ((character.money || 0) < goldCost) {
      setModalResult({ 
        title: '골드 부족', 
        message: `객실 이용에 필요한 골드(${goldCost.toLocaleString()}골드)가 부족합니다.${costMultiplier > 1 ? ` (동료 ${activeCompanionCount}명 포함 ${costMultiplier}배 적용)` : ''}`, 
        type: 'warning' 
      });
      return;
    }

    const updated = { ...character, money: (character.money || 0) - goldCost };

    // 시간 경과 및 완전 회복 처리 (timeEngine 1일 진행)
    const { updatedCharacter, systemLogs, dailyReport } = processInnRest(updated);

    // 버프 적용
    const newStatus: ActiveStatus = {
      name: buffName,
      effect: buffEffect,
      duration: 1,
    };

    const nextStatusEffects = [...(updatedCharacter.statusEffects || []).filter(s => !['일반 휴식', '상급 휴식', '귀빈 휴식'].includes(s.name)), newStatus];

    // 동료 호감도 상승
    let companionMsg = '';
    const allCompanionsList = [...(updatedCharacter.companions || []), ...(updatedCharacter.inactiveCompanions || [])];
    
    if (includeCompanions && allCompanionsList.length > 0) {
      const boostComp = (c: Companion) => ({
        ...c,
        affection: Math.min(100, (c.affection || 0) + boostAmount)
      });

      updatedCharacter.companions = (updatedCharacter.companions || []).map(boostComp);
      if (updatedCharacter.inactiveCompanions) {
        updatedCharacter.inactiveCompanions = updatedCharacter.inactiveCompanions.map(boostComp);
      }

      companionMsg = `\n여관에서 동료들과 따뜻한 시간을 보내며 모두의 호감도가 +${boostAmount} 상승했습니다.`;
    }

    // FinalStat 기준 HP 및 MP 완전 회복
    const { finalStats: playerFinal } = calculateFinalStats(updatedCharacter);

    const finalChar: Character = {
      ...updatedCharacter,
      stats: {
        ...updatedCharacter.stats,
        hp: playerFinal.maxHp,
        mp: playerFinal.maxMp,
      },
      statusEffects: nextStatusEffects,
    };

    if (finalChar.companions) {
      finalChar.companions = finalChar.companions.map(c => {
        const { finalStats: cFinal } = calculateFinalStats(c);
        return {
          ...c,
          stats: {
            ...c.stats,
            hp: cFinal.maxHp,
            mp: cFinal.maxMp,
            maxHp: cFinal.maxHp,
            maxMp: cFinal.maxMp,
          }
        };
      });
    }

    if (finalChar.inactiveCompanions) {
      finalChar.inactiveCompanions = finalChar.inactiveCompanions.map(c => {
        const { finalStats: cFinal } = calculateFinalStats(c);
        return {
          ...c,
          stats: {
            ...c.stats,
            hp: cFinal.maxHp,
            mp: cFinal.maxMp,
            maxHp: cFinal.maxHp,
            maxMp: cFinal.maxMp,
          }
        };
      });
    }

    const innLogs: string[] = [
      `[여관] ${buffName} 투숙(${goldCost.toLocaleString()}골드)을 마치고 체력과 마력을 완전히 회복했습니다.${includeCompanions ? ` (동료 호감도 +${boostAmount} 상승)` : ''}`,
      ...(systemLogs || [])
    ];
    onUpdateCharacter(finalChar, innLogs, dailyReport);
    setModalResult({
      title: `${buffName} 완료`,
      message: `여관에서 하룻밤을 묵으며 체력과 마력을 완전히 회복하고 [${buffName}] 효과를 획득했습니다.${companionMsg}`,
      type: 'success'
    });
  };

  // 특정 한 지역 보스 소문 해금 처리
  const handleUnlockRumor = (costType: 'gold' | 'mana') => {
    if (!selectedNation || !selectedCity) return;

    if (hasListenedBossRumorToday) {
      setModalResult({ title: '이용 제한', message: '보스 소문은 하루에 한 번만 청취할 수 있습니다.', type: 'warning' });
      return;
    }

    const rumorKey = `${currentContinentKey}_${selectedNation}_${selectedCity}`;
    const goldCost = 1000;
    const manaCost = 5;

    if (costType === 'gold' && (character.money || 0) < goldCost) {
      setModalResult({ title: '골드 부족', message: `소문 청취 비용(${goldCost.toLocaleString()}골드)이 부족합니다.`, type: 'warning' });
      return;
    }

    if (costType === 'mana') {
      const currentMana = character.base?.resources?.manaCrystal || 0;
      if (currentMana < manaCost) {
        setModalResult({ title: '마정석 부족', message: `소문 청취 비용(마정석 ${manaCost}개)이 부족합니다.`, type: 'warning' });
        return;
      }
    }

    const newChar = { 
      ...character,
      lastBossRumorDate: character.currentDate
    } as any;

    if (costType === 'gold') {
      newChar.money = (newChar.money || 0) - goldCost;
    } else if (newChar.base?.resources) {
      newChar.base.resources.manaCrystal = (newChar.base.resources.manaCrystal || 0) - manaCost;
    }

    setUnlockedRumors(prev => ({ ...prev, [rumorKey]: true }));
    onUpdateCharacter(newChar, `[여관 소문] 정보상에게 ${selectedNation} ${selectedCity} 지역 보스 소문을 청취했습니다.`);
    setModalResult({
      title: '소문 획득',
      message: `정보상에게 ${selectedNation} ${selectedCity} 지역 보스의 신력 계통, 권장 레벨, 희귀 전리품 정보를 구했습니다.`,
      type: 'success'
    });
  };

  // 방랑인에게 술 대접 (방문 당 1회 제한)
  const handleBuyDrinkForWanderer = () => {
    if (!wanderingNpc || wanderingRecruited) return;
    if (hasBoughtDrinkForWanderer) {
      setModalResult({ title: '이용 제한', message: '술 대접은 이번 방랑 인물 방문 중 1회만 가능합니다.', type: 'warning' });
      return;
    }

    const cost = 1000;

    if ((character.money || 0) < cost) {
      setModalResult({ title: '골드 부족', message: '술 한잔 대접에 필요한 1,000골드가 부족합니다.', type: 'warning' });
      return;
    }

    const boostAmount = 25;
    const newChar = { ...character, money: (character.money || 0) - cost };
    const updatedNpc = { ...wanderingNpc, affection: Math.min(100, (wanderingNpc.affection || 0) + boostAmount) };
    setWanderingNpc(updatedNpc);
    setHasBoughtDrinkForWanderer(true);

    onUpdateCharacter(newChar, `[여관 술집] 방랑 인물 ${wanderingNpc.name}에게 술 한잔을 대접하여 호감도가 +${boostAmount} 상승했습니다.`);
    setTavernMessage(`'${wanderingNpc.name}'에게 고급 술 한 잔을 건넸습니다. 상대방이 기분 좋게 웃으며 마음을 열었습니다. (호감도 +${boostAmount} 상승)`);
  };

  // 방랑인 영입
  const handleRecruitWanderer = () => {
    if (!wanderingNpc || wanderingRecruited) return;

    const newChar = { ...character, lastInnWandererDate: currentYearMonth };
    if (!newChar.inactiveCompanions) newChar.inactiveCompanions = [];
    
    newChar.inactiveCompanions.push({
      ...wanderingNpc,
      affection: 50,
      loyalty: 80,
    });

    setWanderingRecruited(true);
    onUpdateCharacter(newChar, `[여관 영입] 방랑 인물 '${wanderingNpc.name}'(레벨 ${wanderingNpc.level} ${wanderingNpc.classType})을(를) 기지 동료로 영입했습니다.`);
    setModalResult({
      title: '동료 영입 성공',
      message: `'${wanderingNpc.name}'(레벨 ${wanderingNpc.level} ${wanderingNpc.classType})이(가) 당신의 뜻에 동참하여 기지 거주민으로 영입되었습니다.`,
      type: 'success'
    });
  };

  // 동료와 한잔 기울이기 (1일 1회 제한, 하루 경과, timeEngine 연동)
  const handleDrinkWithCompanion = () => {
    if (!selectedCompanionForDrink) return;
    if (hasDrunkWithCompanionToday) {
      setModalResult({ title: '이용 제한', message: '동료와의 술자리는 하루에 한 번만 가능합니다.', type: 'warning' });
      return;
    }

    const cost = 500;

    if ((character.money || 0) < cost) {
      setModalResult({ title: '골드 부족', message: '술자리 비용(500골드)이 부족합니다.', type: 'warning' });
      return;
    }

    const allComps = [...(character.companions || []), ...(character.inactiveCompanions || [])];
    const target = allComps.find(c => c.id === selectedCompanionForDrink);
    if (!target) return;

    const boostAmount = 15;
    const boostAffection = (c: Companion) => {
      if (c.id === selectedCompanionForDrink) {
        return { ...c, affection: Math.min(100, (c.affection || 0) + boostAmount) };
      }
      return c;
    };

    const newChar = { ...character, money: (character.money || 0) - cost };
    newChar.companions = (newChar.companions || []).map(boostAffection);
    if (newChar.inactiveCompanions) {
      newChar.inactiveCompanions = newChar.inactiveCompanions.map(boostAffection);
    }

    // 사기 충천 상태이상 부여
    const moraleStatus: ActiveStatus = {
      name: '사기 충천',
      effect: '공격력 및 마법력 상승, 치명타율 상승',
      duration: 5,
    };
    newChar.statusEffects = [...(newChar.statusEffects || []).filter(s => s.name !== '사기 충천'), moraleStatus];

    // timeEngine으로 하루 경과 처리
    const { updatedCharacter, systemLogs, dailyReport } = processInnRest(newChar);

    setHasDrunkWithCompanionToday(true);

    const drinkLogs: string[] = [
      `[여관 술집] ${target.name}와(과) 여관에서 술잔을 나누며 유대를 다졌습니다. (호감도 +${boostAmount} 상승, 1일 경과)`,
      ...(systemLogs || [])
    ];
    onUpdateCharacter(updatedCharacter, drinkLogs, dailyReport);
    setModalResult({
      title: '술자리 성공',
      message: `'${target.name}'와(과) 여관 술집에서 즐거운 시간을 나누며 하룻밤을 보냈습니다. (호감도 +${boostAmount} 상승, [사기 충천] 효과 발동, 1일 경과)`,
      type: 'success'
    });
  };

  // 현재 선택한 지역의 보스 정보
  const targetBoss: BossData | undefined = currentContinentNations[selectedNation]?.[selectedCity];
  const rumorKey = `${currentContinentKey}_${selectedNation}_${selectedCity}`;
  const isRumorUnlocked = Boolean(unlockedRumors[rumorKey]);

  const allCompanionsForDrink = [...(character.companions || []), ...(character.inactiveCompanions || [])];

  return (
    <div 
      className="fixed inset-0 z-[180] flex items-center justify-center p-2 sm:p-4 bg-slate-950/90 backdrop-blur-md animate-fadeIn"
      onClick={onClose}
    >
      {/* 알림 모달 */}
      {modalResult && (
        <div 
          key="inn-modal-result"
          className="fixed inset-0 z-[220] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm"
          onClick={e => e.stopPropagation()}
        >
          <div className="w-full max-w-sm bg-slate-900 border border-amber-500/40 rounded-2xl p-5 shadow-2xl space-y-4 text-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
              <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                <Sparkles size={18} />
              </div>
              <h3 className="text-base font-extrabold text-amber-300">{modalResult.title}</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-line">{modalResult.message}</p>
            <button
              onClick={() => setModalResult(null)}
              className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-lg transition-all min-h-[40px] cursor-pointer"
            >
              확인
            </button>
          </div>
        </div>
      )}

      {/* 메인 여관 모달 (모바일 최적화) */}
      <div 
        className="w-full max-w-4xl h-[92vh] sm:h-[85vh] bg-slate-900 border border-amber-500/40 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100"
        onClick={e => e.stopPropagation()}
      >
        {/* 상단 헤더 */}
        <div className="p-3 sm:p-4 bg-slate-950/90 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="p-2 sm:p-2.5 bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/30">
              <BedDouble size={20} className="sm:w-5 sm:h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-lg font-black text-amber-300 flex items-center gap-2">
                여관 및 모험가 선술집
                <span className="text-[10px] bg-amber-950 text-amber-400 px-2 py-0.5 rounded border border-amber-700/50">
                  {character.currentLocation?.city || '도시 여관'}
                </span>
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-400">
                지친 몸을 쉬이고 대륙의 소문과 새로운 인연을 만나세요.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-all min-h-[40px] min-w-[40px] flex items-center justify-center cursor-pointer"
            title="닫기"
          >
            <X size={20} />
          </button>
        </div>

        {/* 탭 버튼 */}
        <div className="flex border-b border-slate-800 bg-slate-950/60 p-1.5 gap-1.5 shrink-0 overflow-x-auto">
          <button
            onClick={() => setActiveTab('lodging')}
            className={`flex-1 min-w-[90px] py-2.5 text-xs sm:text-sm font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'lodging'
                ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <BedDouble size={16} />
            <span>객실 투숙</span>
          </button>
          <button
            onClick={() => setActiveTab('boss_rumors')}
            className={`flex-1 min-w-[90px] py-2.5 text-xs sm:text-sm font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'boss_rumors'
                ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Info size={16} />
            <span>보스 소문</span>
          </button>
          <button
            onClick={() => setActiveTab('tavern')}
            className={`flex-1 min-w-[90px] py-2.5 text-xs sm:text-sm font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'tavern'
                ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Beer size={16} />
            <span>여관 술집</span>
          </button>
        </div>

        {/* 컨텐츠 본문 */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-5 custom-scrollbar bg-slate-950/40 space-y-5">
          {/* 탭 1: 객실 투숙 */}
          {activeTab === 'lodging' && (
            <div className="space-y-4">
              {/* 동료 옵션 */}
              <div className="bg-slate-900/80 p-3.5 rounded-xl border border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Heart size={16} className="text-pink-400 shrink-0" />
                  <div>
                    <span className="text-xs font-bold text-slate-200">동료와 함께 휴식</span>
                    <p className="text-[11px] text-slate-400">동료들과 함께 머물며 호감도를 올립니다.</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={includeCompanions}
                  onChange={(e) => setIncludeCompanions(e.target.checked)}
                  className="w-4 h-4 accent-amber-500 cursor-pointer"
                />
              </div>

              {/* 객실 카드리스트 */}
              {(() => {
                const activeCompanionCount = character.companions ? character.companions.length : 0;
                const costMultiplier = includeCompanions ? (1 + activeCompanionCount) : 1;
                const stdCost = 10000 * costMultiplier;
                const supCost = 80000 * costMultiplier;
                const delCost = 500000 * costMultiplier;

                return (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                    {/* 1. 일반실 */}
                    <div className="bg-slate-900 border border-slate-800 hover:border-amber-500/40 rounded-2xl p-4 sm:p-5 flex flex-col justify-between space-y-4 shadow-lg transition-all">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="text-base font-extrabold text-slate-100 flex items-center gap-1.5">
                            <BedDouble size={18} className="text-slate-400" />
                            일반실
                          </h3>
                          <span className="text-xs font-bold text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-700/50">
                            {stdCost.toLocaleString()} 골드
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 leading-relaxed mb-3">
                          기본적이고 깨끗한 침실입니다. 체력과 마력을 완전히 회복합니다.
                        </p>
                        <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-xs space-y-1">
                          <div className="text-[10px] text-slate-500 font-bold">투숙 혜택</div>
                          <div className="text-emerald-400 font-semibold">• 체력 및 마력 완전 회복</div>
                          <div className="text-amber-300 font-semibold">• [일반 휴식] 효과 해금</div>
                          {includeCompanions && <div className="text-pink-300 font-semibold">• 동료 호감도 +5 상승</div>}
                          {costMultiplier > 1 && <div className="text-slate-400 text-[10px]">※ 인원 {costMultiplier}명 동반 적용 ({stdCost.toLocaleString()}골드)</div>}
                        </div>
                      </div>
                      <button
                        onClick={() => handleRoomStay('standard')}
                        className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl border border-slate-700 shadow transition-all active:scale-95 min-h-[44px] cursor-pointer"
                      >
                        일반실 투숙하기
                      </button>
                    </div>

                    {/* 2. 상급실 */}
                    <div className="bg-slate-900 border border-amber-500/40 hover:border-amber-400 rounded-2xl p-4 sm:p-5 flex flex-col justify-between space-y-4 shadow-xl transition-all relative overflow-hidden">
                      <div className="absolute top-0 right-0 bg-amber-500 text-slate-950 text-[9px] font-black px-2 py-0.5 rounded-bl-lg">
                        추천
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="text-base font-extrabold text-amber-300 flex items-center gap-1.5">
                            <BedDouble size={18} className="text-amber-400" />
                            상급실
                          </h3>
                          <span className="text-xs font-bold text-amber-400 bg-amber-950/80 px-2 py-0.5 rounded border border-amber-500/50">
                            {supCost.toLocaleString()} 골드
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 leading-relaxed mb-3">
                          푹신한 고급 침대와 피로 해소 차가 제공되는 우수한 객실입니다.
                        </p>
                        <div className="bg-slate-950 p-2.5 rounded-xl border border-amber-500/20 text-xs space-y-1">
                          <div className="text-[10px] text-amber-500 font-bold">투숙 혜택</div>
                          <div className="text-emerald-400 font-semibold">• 체력 및 마력 완전 회복</div>
                          <div className="text-amber-300 font-semibold">• [상급 휴식] 경험치 및 공격력/마법력 상승</div>
                          {includeCompanions && <div className="text-pink-300 font-semibold">• 동료 호감도 +8 상승</div>}
                          {costMultiplier > 1 && <div className="text-slate-400 text-[10px]">※ 인원 {costMultiplier}명 동반 적용 ({supCost.toLocaleString()}골드)</div>}
                        </div>
                      </div>
                      <button
                        onClick={() => handleRoomStay('superior')}
                        className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-lg transition-all active:scale-95 min-h-[44px] cursor-pointer"
                      >
                        상급실 투숙하기
                      </button>
                    </div>

                    {/* 3. 귀빈실 */}
                    <div className="bg-slate-900 border border-purple-500/50 hover:border-purple-400 rounded-2xl p-4 sm:p-5 flex flex-col justify-between space-y-4 shadow-xl transition-all">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="text-base font-extrabold text-purple-300 flex items-center gap-1.5">
                            <Sparkles size={18} className="text-purple-400" />
                            귀빈실
                          </h3>
                          <span className="text-xs font-bold text-purple-300 bg-purple-950/80 px-2 py-0.5 rounded border border-purple-500/50">
                            {delCost.toLocaleString()} 골드
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 leading-relaxed mb-3">
                          호화로운 만찬과 마법 욕조가 완비된 최상급 스위트룸입니다.
                        </p>
                        <div className="bg-slate-950 p-2.5 rounded-xl border border-purple-500/30 text-xs space-y-1">
                          <div className="text-[10px] text-purple-400 font-bold">투숙 혜택</div>
                          <div className="text-emerald-400 font-semibold">• 체력 및 마력 완전 회복</div>
                          <div className="text-amber-300 font-semibold">• [귀빈 휴식] 경험치/공격력/치명타 대폭 상승</div>
                          {includeCompanions && <div className="text-pink-300 font-semibold">• 동료 호감도 +10 상승</div>}
                          {costMultiplier > 1 && <div className="text-slate-400 text-[10px]">※ 인원 {costMultiplier}명 동반 적용 ({delCost.toLocaleString()}골드)</div>}
                        </div>
                      </div>
                      <button
                        onClick={() => handleRoomStay('deluxe')}
                        className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-xs rounded-xl shadow-lg transition-all active:scale-95 min-h-[44px] cursor-pointer"
                      >
                        귀빈실 투숙하기
                      </button>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* 탭 2: 보스 소문 청취 (같은 대륙 한정 & 특정 한 지역 지정) */}
          {activeTab === 'boss_rumors' && (
            <div className="space-y-4">
              {/* 대륙 안내 및 국가/지역 선택 구역 */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                  <div className="flex items-center gap-2">
                    <MapPin size={16} className="text-amber-400" />
                    <span className="text-xs font-extrabold text-amber-300">
                      현재 대륙 정보: <span className="text-white font-bold">{currentContinentKey}</span>
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                    같은 대륙 내 지역만 소문 청취 가능
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* 국가 선택 */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">국가 선택:</label>
                    <select
                      value={selectedNation}
                      onChange={(e) => handleNationChange(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-bold text-slate-100 focus:outline-none focus:border-amber-500 cursor-pointer"
                    >
                      {availableNations.map(nation => (
                        <option key={nation} value={nation}>{nation}</option>
                      ))}
                    </select>
                  </div>

                  {/* 특정 한 지역 선택 */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">세부 지역 선택:</label>
                    <select
                      value={selectedCity}
                      onChange={(e) => setSelectedCity(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-bold text-slate-100 focus:outline-none focus:border-amber-500 cursor-pointer"
                    >
                      {availableCities.map(city => (
                        <option key={city} value={city}>{city}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* 정보상 소문 청취 / 해금 구역 */}
              {!isRumorUnlocked ? (
                <div className="bg-slate-900 border border-amber-500/40 rounded-2xl p-6 text-center space-y-4 shadow-xl">
                  <div className="w-12 h-12 mx-auto bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-2xl flex items-center justify-center">
                    <Info size={26} />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-amber-300">
                      [{selectedNation} - {selectedCity}] 지역 보스 소문 청취
                    </h3>
                    <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto leading-relaxed">
                      정보상에게 수고비를 지불하고 {selectedNation} {selectedCity} 지역 서식 보스의 신력 계통, 권장 레벨, 희귀 전리품 정보를 확인합니다.
                    </p>
                    {hasListenedBossRumorToday && (
                      <p className="text-xs text-red-400 font-bold mt-2">
                        오늘 이미 보스 소문을 청취했습니다. (하루 1회만 청취 가능)
                      </p>
                    )}
                  </div>
                  <div className="flex justify-center gap-2.5 pt-1">
                    <button
                      onClick={() => handleUnlockRumor('gold')}
                      disabled={hasListenedBossRumorToday}
                      className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 font-extrabold text-xs rounded-xl shadow transition-all active:scale-95 min-h-[40px] cursor-pointer"
                    >
                      {hasListenedBossRumorToday ? '청취 완료' : '1,000 골드 지불하고 소문 듣기'}
                    </button>
                    <button
                      onClick={() => handleUnlockRumor('mana')}
                      disabled={hasListenedBossRumorToday}
                      className="px-4 py-2.5 bg-purple-900 hover:bg-purple-800 disabled:bg-slate-800 disabled:text-slate-500 text-purple-200 border border-purple-700/80 font-extrabold text-xs rounded-xl shadow transition-all active:scale-95 min-h-[40px] cursor-pointer"
                    >
                      {hasListenedBossRumorToday ? '청취 완료' : '마정석 5개 지불하기'}
                    </button>
                  </div>
                </div>
              ) : targetBoss ? (
                <div className="bg-slate-900 border border-amber-500/40 rounded-2xl p-4 sm:p-5 space-y-3 shadow-lg">
                  <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-3">
                      {targetBoss.visualUrl && (
                        <img src={targetBoss.visualUrl} alt={targetBoss.name} className="w-14 h-14 rounded-xl object-cover border border-amber-500/40 shrink-0" />
                      )}
                      <div>
                        <h4 className="text-base font-extrabold text-amber-300 flex items-center gap-2">
                          <span>{targetBoss.name}</span>
                          {targetBoss.title && <span className="text-xs text-slate-400 font-normal">[{targetBoss.title}]</span>}
                        </h4>
                        <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                          <span>권장 레벨: <strong className="text-amber-400 font-mono">{targetBoss.level}</strong></span>
                          <span>·</span>
                          <span>신력 계통: <strong className="text-cyan-400 font-bold">{targetBoss.shinryokuType || '무속성'}</strong></span>
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] bg-emerald-950 text-emerald-400 px-2 py-1 rounded border border-emerald-700/50 font-bold">
                      소문 해금됨
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                    {targetBoss.description}
                  </p>

                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs space-y-1">
                    <div className="text-[10px] text-amber-500 font-bold flex items-center gap-1">
                      <Sparkles size={12} /> 희귀 전리품 정보
                    </div>
                    <p className="text-slate-200 font-semibold">
                      {targetBoss.specialLoot || '특수 보스 전리품'}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-slate-500 text-xs">
                  선택한 지역에 등록된 보스 정보가 없습니다.
                </div>
              )}
            </div>
          )}

          {/* 탭 3: 여관 술집 */}
          {activeTab === 'tavern' && (
            <div className="space-y-5">
              {/* 1. 방랑 인물 만남 (레벨 1~100) */}
              <div className="bg-slate-900 border border-amber-500/40 rounded-2xl p-4 sm:p-5 space-y-4 shadow-xl">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                      <Wine size={18} />
                    </div>
                    <div>
                      <h3 className="text-base font-extrabold text-amber-300">
                        이달의 방랑 인물 만남
                      </h3>
                      <p className="text-xs text-slate-400">
                        술집 테이블에 찾아온 인물에게 한잔 대접하고 영입하세요. (월 1회)
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono bg-slate-950 text-slate-400 px-2.5 py-1 rounded-lg border border-slate-800">
                    {currentYearMonth}
                  </span>
                </div>

                {hasWandererVisitedThisMonth || wanderingRecruited ? (
                  <div className="bg-slate-950/80 p-5 rounded-xl border border-slate-800 text-center space-y-2">
                    <UserCheck size={30} className="mx-auto text-emerald-400" />
                    <p className="text-xs font-bold text-slate-300">
                      이번 달의 방랑 인물 영입이 완료되었거나 방문을 마쳤습니다.
                    </p>
                    <p className="text-[11px] text-slate-500">
                      다음 달에 새로운 방랑 인물이 찾아옵니다.
                    </p>
                  </div>
                ) : wanderingNpc ? (
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-extrabold text-amber-200">{wanderingNpc.name}</span>
                          <span className="text-xs text-slate-400">({wanderingNpc.gender} / {wanderingNpc.race})</span>
                        </div>
                        <p className="text-xs text-slate-400 mt-1">
                          레벨 {wanderingNpc.level} {wanderingNpc.classType} · 호감도: <span className="text-pink-400 font-bold">{wanderingNpc.affection}</span>
                        </p>
                        <p className="text-xs text-slate-300 italic mt-2 bg-slate-900 p-2.5 rounded border border-slate-800">
                          "{wanderingNpc.appearance}"
                        </p>
                      </div>
                    </div>

                    {tavernMessage && (
                      <p className="text-xs text-amber-300 bg-amber-950/50 p-2.5 rounded-xl border border-amber-800/50 font-medium">
                        {tavernMessage}
                      </p>
                    )}

                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={handleBuyDrinkForWanderer}
                        disabled={hasBoughtDrinkForWanderer}
                        className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed text-amber-300 font-bold text-xs rounded-xl border border-slate-700 transition-all active:scale-95 flex items-center justify-center gap-1 min-h-[40px] cursor-pointer"
                      >
                        <Beer size={14} />
                        <span>{hasBoughtDrinkForWanderer ? '술 대접 완료 (월 1회)' : '술 대접하기 (1,000골드 / 호감도 +25)'}</span>
                      </button>
                      <button
                        onClick={handleRecruitWanderer}
                        className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-1 min-h-[40px] cursor-pointer"
                      >
                        <UserPlus size={14} />
                        <span>동료 영입 제안</span>
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>

              {/* 2. 동료와 한잔 기울이기 (하루 경과) */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4 shadow-xl">
                <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                  <Beer size={18} className="text-amber-400" />
                  <div>
                    <h3 className="text-base font-extrabold text-slate-100">
                      동료와 한잔 기울이기
                    </h3>
                    <p className="text-xs text-slate-400">
                      동료에게 술을 대접하여 호감도를 높이고 사기를 충천시킵니다. (1일 1회 제한 / 하루 경과)
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="block text-xs font-bold text-slate-300">
                    함께 술자리를 가질 동료 선택:
                  </label>
                  <select
                    value={selectedCompanionForDrink}
                    onChange={(e) => setSelectedCompanionForDrink(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs font-bold text-slate-100 focus:outline-none focus:border-amber-500 transition-colors cursor-pointer"
                  >
                    <option value="">-- 동료 선택 --</option>
                    {allCompanionsForDrink.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name} (레벨 {c.level} {c.classType || '동료'} · 호감도 {c.affection || 0})
                      </option>
                    ))}
                  </select>

                  <button
                    onClick={handleDrinkWithCompanion}
                    disabled={!selectedCompanionForDrink || hasDrunkWithCompanionToday}
                    className="w-full py-3 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 font-black text-xs rounded-xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-1.5 min-h-[44px] cursor-pointer"
                  >
                    <Beer size={16} />
                    <span>
                      {hasDrunkWithCompanionToday
                        ? '오늘의 술자리 완료 (1일 1회)'
                        : '술잔 기울이기 (500골드 / 호감도 +15 / 1일 경과)'}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InnModal;
