import React, { useState, useEffect } from 'react';
import { Character, Item } from '../types';
import { FACILITIES_INFO } from '../constants';
import { Star, X, Plus, Trash2, Home, Package, Shield, Settings, AlertCircle, Sparkles, Check, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  character: Character;
  onOpenBaseWithFacility: (facilityId: string) => void;
  onUseItem: (item: Item, index: number) => void;
  onUpdateCharacter?: (newChar: Character, logMsg: string) => void;
}

interface FavoriteItem {
  id: string; // e.g. "facility_farm" or "item_생명수"
  type: 'facility' | 'item';
  name: string;
  targetId: string; // facility ID or item name
}

const FavoritesWidget: React.FC<Props> = ({
  character,
  onOpenBaseWithFacility,
  onUseItem,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isManageOpen, setIsManageOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'facility' | 'item'>('facility');
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);

  // 캐릭터별 고유 즐겨찾기 키 생성 (주인공 전환 지원)
  const storageKey = `rpg_favorites_${character.name || 'default'}`;

  // 불러오기
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        setFavorites(JSON.parse(saved));
      } else {
        // 기본값 세팅 (예: 창고, 농장, 숙소)
        const defaults: FavoriteItem[] = [
          { id: 'facility_storage', type: 'facility', name: '창고', targetId: 'storage' },
          { id: 'facility_farm', type: 'facility', name: '농장', targetId: 'farm' },
          { id: 'facility_housing', type: 'facility', name: '숙소', targetId: 'housing' }
        ];
        setFavorites(defaults);
        localStorage.setItem(storageKey, JSON.stringify(defaults));
      }
    } catch (e) {
      console.error(e);
    }
  }, [storageKey]);

  // 저장하기
  const saveFavorites = (updated: FavoriteItem[]) => {
    setFavorites(updated);
    try {
      localStorage.setItem(storageKey, JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
  };

  // 즐겨찾기 기지위치 검사
  const baseLoc = character.base?.location;
  const isAtBase = Boolean(
    character.base &&
    baseLoc &&
    character.currentLocation?.city === baseLoc.city &&
    (!baseLoc.nation || !character.currentLocation?.nation || character.currentLocation.nation === baseLoc.nation)
  );

  // 즐겨찾기 추가 / 해제 토글
  const toggleFavorite = (type: 'facility' | 'item', targetId: string, name: string) => {
    const id = `${type}_${targetId}`;
    const exists = favorites.some(f => f.id === id);

    if (exists) {
      const filtered = favorites.filter(f => f.id !== id);
      saveFavorites(filtered);
    } else {
      const newItem: FavoriteItem = { id, type, name, targetId };
      saveFavorites([...favorites, newItem]);
    }
  };

  // 기지 시설 클릭 핸들러
  const handleFacilityClick = (facilityId: string) => {
    if (!isAtBase) {
      alert(`현재 기지 위치가 아닙니다. 기지 시설은 기지가 위치한 도시에서만 이용할 수 있습니다.\n\n현재 위치: ${character.currentLocation?.city || '알 수 없음'}\n기지 위치: ${baseLoc?.city || '미건설'}`);
      return;
    }
    onOpenBaseWithFacility(facilityId);
    setIsOpen(false);
  };

  // 소비 아이템 사용 핸들러
  const handleItemClick = (itemName: string) => {
    // 인벤토리에서 해당 아이템 찾기
    const itemIndex = character.inventory.findIndex(
      i => i && i.name === itemName && (i.type === 'Consumable' || i.type === '소비' as any)
    );

    if (itemIndex === -1) {
      alert(`보유 중인 '${itemName}' 아이템이 없습니다.`);
      return;
    }

    const item = character.inventory[itemIndex];
    onUseItem(item, itemIndex);
  };

  // 기지 레이아웃에 실제 건설된 시설인지 확인
  const isFacilityBuilt = (facilityId: string) => {
    if (facilityId === 'storage' || facilityId === 'housing') return true; // 기본 시설
    return character.base?.layout?.some(f => f.type === facilityId) || false;
  };

  // 소비 아이템 목록 가져오기
  const consumableInventoryItems = (character?.inventory || []).filter(
    (item): item is Item => Boolean(item && (item.type === 'Consumable' || item.type === '소비' as any))
  );

  // 중복 제거된 인벤토리 내 소비 아이템 이름 목록
  const uniqueConsumableNames = Array.from(new Set(consumableInventoryItems.map(i => i.name)));

  return (
    <>
      {/* 화면 우측 하단 즐겨찾기 플로팅 버튼 */}
      <div className="fixed bottom-36 right-4 z-40">
        <button
          onClick={() => setIsOpen(true)}
          className="w-12 h-12 rounded-full bg-slate-900 border border-slate-700 hover:border-amber-500 hover:bg-slate-800 text-amber-400 flex items-center justify-center shadow-lg hover:shadow-amber-500/10 active:scale-95 transition-all group"
          title="단축 즐겨찾기"
        >
          <Star size={22} className="fill-current animate-pulse group-hover:scale-110 transition-transform" />
          <span className="absolute -top-1 -right-1 bg-amber-500 text-slate-950 font-bold text-[9px] w-4 h-4 rounded-full flex items-center justify-center border border-slate-900">
            {favorites.length}
          </span>
        </button>
      </div>

      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
            {/* 메인 팝업 카드 */}
            <div 
              className="bg-slate-950 border border-slate-800 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl flex flex-col max-h-[75vh]"
              onClick={(e) => e.stopPropagation()}
            >
              {/* 헤더 */}
              <div className="p-4 border-b border-slate-800 bg-slate-900/60 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Star size={16} className="text-amber-400 fill-current" />
                  <span className="text-sm font-bold text-slate-100">신속 즐겨찾기</span>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* 기지 상태 퀵 뷰 */}
              <div className="px-4 py-2 border-b border-slate-800 bg-slate-900/20 flex items-center justify-between text-[11px]">
                <span className="text-slate-400">기지 위치 상태</span>
                {isAtBase ? (
                  <span className="text-emerald-400 font-bold flex items-center gap-1">
                    <Check size={12} />
                    <span>기지 체류 중</span>
                  </span>
                ) : (
                  <span className="text-amber-400 font-bold flex items-center gap-1">
                    <AlertCircle size={12} />
                    <span>기지 외부 ({baseLoc?.city || '미건설'})</span>
                  </span>
                )}
              </div>

              {/* 단축 리스트 영역 */}
              <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
                {favorites.length === 0 ? (
                  <div className="py-12 text-center flex flex-col items-center justify-center">
                    <Star size={28} className="text-slate-600 mb-2" />
                    <p className="text-[11px] text-slate-400 px-6 leading-relaxed">
                      즐겨찾기 목록이 비어 있습니다. 아래의 관리 버튼을 눌러 자주 쓰는 시설과 포션을 단축키로 등록해 보세요!
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-2">
                    {favorites.map((fav) => {
                      if (fav.type === 'facility') {
                        const built = isFacilityBuilt(fav.targetId);
                        const disabled = !built || !isAtBase;
                        return (
                          <button
                            key={fav.id}
                            onClick={() => handleFacilityClick(fav.targetId)}
                            className={`w-full p-3 rounded-xl border text-left flex items-center justify-between transition-all ${
                              disabled
                                ? 'bg-slate-950/40 border-slate-900 text-slate-500 cursor-not-allowed opacity-50'
                                : 'bg-slate-900/60 border-slate-800 hover:border-amber-500/50 hover:bg-slate-900 text-slate-200'
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <div className={`p-1.5 rounded-lg border ${
                                disabled ? 'border-slate-800 bg-slate-950 text-slate-600' : 'border-indigo-500/30 bg-indigo-950/40 text-indigo-400'
                              }`}>
                                <Home size={15} />
                              </div>
                              <div>
                                <div className="text-xs font-bold flex items-center gap-1.5">
                                  <span>{fav.name}</span>
                                  {!built && (
                                    <span className="text-[9px] bg-red-950 text-red-400 border border-red-900/50 px-1 rounded">
                                      미건설
                                    </span>
                                  )}
                                </div>
                                <p className="text-[10px] text-slate-400 mt-0.5">
                                  {built ? '기지 전용 이동' : '아직 건설되지 않은 시설'}
                                </p>
                              </div>
                            </div>
                            <span className="text-[10px] text-indigo-400 font-bold shrink-0">이동</span>
                          </button>
                        );
                      } else {
                        // 소비 아이템 수량 조회
                        const count = (character?.inventory || []).filter(
                          i => i && i.name === fav.targetId && (i.type === 'Consumable' || i.type === '소비' as any)
                        ).length;

                        return (
                          <button
                            key={fav.id}
                            onClick={() => handleItemClick(fav.targetId)}
                            className={`w-full p-3 rounded-xl border text-left flex items-center justify-between transition-all ${
                              count === 0
                                ? 'bg-slate-950/40 border-slate-900 text-slate-500 opacity-50'
                                : 'bg-slate-900/60 border-slate-800 hover:border-amber-500/50 hover:bg-slate-900 text-slate-200'
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <div className={`p-1.5 rounded-lg border ${
                                count === 0 ? 'border-slate-800 bg-slate-950 text-slate-600' : 'border-emerald-500/30 bg-emerald-950/40 text-emerald-400'
                              }`}>
                                <Package size={15} />
                              </div>
                              <div>
                                <h4 className="text-xs font-bold">{fav.name}</h4>
                                <p className="text-[10px] text-slate-400 mt-0.5">
                                  {count > 0 ? `인벤토리 보유 수량: ${count}` : '현재 가방에 없음'}
                                </p>
                              </div>
                            </div>
                            <span className={`text-[10px] font-bold shrink-0 ${count > 0 ? 'text-emerald-400' : 'text-slate-500'}`}>
                              {count > 0 ? '사용' : '없음'}
                            </span>
                          </button>
                        );
                      }
                    })}
                  </div>
                )}
              </div>

              {/* 하단 관리자 토글 */}
              <div className="p-3 bg-slate-900/60 border-t border-slate-800 flex gap-2">
                <button
                  onClick={() => setIsManageOpen(true)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-colors text-center"
                >
                  즐겨찾기 관리
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-bold border border-slate-800 transition-colors"
                >
                  닫기
                </button>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* 즐겨찾기 등록/삭제 관리 모달 (모바일 최적화 단일 다이얼로그) */}
      <AnimatePresence>
        {isManageOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm animate-in fade-in duration-250">
            <div 
              className="bg-slate-950 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col max-h-[85vh]"
              onClick={(e) => e.stopPropagation()}
            >
              {/* 관리 헤더 */}
              <div className="p-4 border-b border-slate-800 bg-slate-900/80 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Settings size={16} className="text-indigo-400" />
                  <span className="text-sm font-bold text-slate-100">단축 즐겨찾기 설정</span>
                </div>
                <button
                  onClick={() => setIsManageOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* 서브 탭 뷰 */}
              <div className="flex border-b border-slate-800 bg-slate-900/40">
                <button
                  onClick={() => setActiveTab('facility')}
                  className={`flex-1 py-3 text-xs font-bold text-center border-b-2 transition-all ${
                    activeTab === 'facility'
                      ? 'border-amber-500 text-amber-400 bg-slate-950/20'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  기지 시설 등록
                </button>
                <button
                  onClick={() => setActiveTab('item')}
                  className={`flex-1 py-3 text-xs font-bold text-center border-b-2 transition-all ${
                    activeTab === 'item'
                      ? 'border-amber-500 text-amber-400 bg-slate-950/20'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  소비 아이템 등록
                </button>
              </div>

              {/* 리스트 목록 */}
              <div className="flex-1 overflow-y-auto p-4 space-y-2.5 custom-scrollbar">
                {activeTab === 'facility' ? (
                  <div className="space-y-1.5">
                    <p className="text-[10px] text-slate-400 mb-2 leading-relaxed bg-slate-900/40 p-2 rounded-lg border border-slate-800/60">
                      ※ 기지 내에 건설 완료된 시설들만 등록이 가능하며, 기지 내부 체류 상태일 때만 단축 클릭 이동이 유효합니다.
                    </p>
                    {FACILITIES_INFO.map((fac) => {
                      const id = `facility_${fac.id}`;
                      const isFav = favorites.some(f => f.id === id);
                      const isBuilt = isFacilityBuilt(fac.id);

                      return (
                        <div
                          key={fac.id}
                          className={`p-2.5 rounded-xl border flex items-center justify-between gap-3 ${
                            isBuilt ? 'bg-slate-900/40 border-slate-800' : 'bg-slate-950/50 border-slate-900 opacity-60'
                          }`}
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold text-slate-200">{fac.name}</span>
                              {!isBuilt && (
                                <span className="text-[8px] px-1 bg-slate-900 text-slate-500 rounded border border-slate-800">
                                  미건설
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-slate-400 truncate mt-0.5">{fac.desc}</p>
                          </div>

                          <button
                            onClick={() => isBuilt && toggleFavorite('facility', fac.id, fac.name)}
                            disabled={!isBuilt}
                            className={`p-2 rounded-lg border transition-all ${
                              !isBuilt
                                ? 'bg-slate-950 border-slate-900 text-slate-700 cursor-not-allowed'
                                : isFav
                                  ? 'bg-amber-950 border-amber-500/50 text-amber-400 hover:bg-slate-900 hover:border-slate-800 hover:text-slate-500'
                                  : 'bg-slate-900 border-slate-800 text-slate-500 hover:border-amber-500/50 hover:text-amber-400'
                            }`}
                          >
                            <Star size={15} className={isFav ? 'fill-current' : ''} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <p className="text-[10px] text-slate-400 mb-2 leading-relaxed bg-slate-900/40 p-2 rounded-lg border border-slate-800/60">
                      ※ 인벤토리에 보유 중인 소비 아이템을 골라 즐겨찾기로 등록합니다. 등록 후 수량이 0이 되어도 목록에 유지됩니다.
                    </p>
                    {uniqueConsumableNames.length === 0 ? (
                      <div className="py-12 text-center flex flex-col items-center justify-center border border-dashed border-slate-800 rounded-xl">
                        <Package size={24} className="text-slate-700 mb-1" />
                        <span className="text-[11px] text-slate-500">인벤토리에 보유 중인 소비성 아이템이 없습니다.</span>
                      </div>
                    ) : (
                      uniqueConsumableNames.map((itemName) => {
                        const id = `item_${itemName}`;
                        const isFav = favorites.some(f => f.id === id);

                        return (
                          <div
                            key={itemName}
                            className="p-2.5 rounded-xl border border-slate-800 bg-slate-900/40 flex items-center justify-between gap-3"
                          >
                            <div className="min-w-0">
                              <span className="text-xs font-bold text-slate-200">{itemName}</span>
                              <p className="text-[10px] text-emerald-400 mt-0.5">인벤토리 보유 중</p>
                            </div>

                            <button
                              onClick={() => toggleFavorite('item', itemName, itemName)}
                              className={`p-2 rounded-lg border transition-all ${
                                isFav
                                  ? 'bg-amber-950 border-amber-500/50 text-amber-400 hover:bg-slate-900 hover:border-slate-800 hover:text-slate-500'
                                  : 'bg-slate-900 border-slate-800 text-slate-500 hover:border-amber-500/50 hover:text-amber-400'
                              }`}
                            >
                              <Star size={15} className={isFav ? 'fill-current' : ''} />
                            </button>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>

              {/* 하단 확인 */}
              <div className="p-3 bg-slate-900/80 border-t border-slate-800 flex justify-end">
                <button
                  onClick={() => setIsManageOpen(false)}
                  className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-colors text-center"
                >
                  설정 완료
                </button>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

export default React.memo(FavoritesWidget);
