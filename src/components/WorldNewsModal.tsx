import React, { useState } from 'react';
import { WorldNewsItem } from '../types';
import { 
  X, Globe, Swords, Sparkles, MapPin, ArrowRight, ShieldAlert, ScrollText, Compass, ShoppingBag, Coins, TrendingUp
} from 'lucide-react';

interface WorldNewsModalProps {
  newsList: WorldNewsItem[];
  onClose: () => void;
  onOpenDungeon?: () => void;
  onOpenMap?: () => void;
}

export const WorldNewsModal: React.FC<WorldNewsModalProps> = ({
  newsList,
  onClose,
  onOpenDungeon,
  onOpenMap
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'war' | 'economy' | 'diplomacy' | 'dungeon'>('all');

  const filteredList = newsList.filter(item => {
    if (activeTab === 'all') return true;
    if (activeTab === 'war') return item.category === 'war';
    if (activeTab === 'economy') return item.category === 'economy';
    if (activeTab === 'diplomacy') return item.category === 'diplomacy' || item.category === 'world';
    if (activeTab === 'dungeon') return item.category === 'dungeon';
    return true;
  });

  const hasWarNews = newsList.some(n => n.category === 'war');
  const hasEconomyNews = newsList.some(n => n.category === 'economy');
  const hasDungeonNews = newsList.some(n => n.category === 'dungeon');
  const hasDiplomacyNews = newsList.some(n => n.category === 'diplomacy' || n.category === 'world');

  return (
    <div 
      id="world-news-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-fade-in font-sans"
    >
      <div 
        id="world-news-modal-container"
        className="w-full max-w-lg sm:max-w-xl max-h-[88vh] sm:max-h-[82vh] flex flex-col rounded-2xl sm:rounded-3xl border border-amber-500/50 bg-slate-950/95 text-slate-100 shadow-2xl shadow-amber-950/50 overflow-hidden transition-all"
      >
        {/* 상단 럭셔리 헤더 */}
        <div className="px-4 py-3.5 sm:px-5 sm:py-4 bg-gradient-to-r from-amber-950/80 via-slate-900 to-slate-950 border-b border-amber-500/30 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-amber-500/10 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0 shadow-inner">
              <ScrollText size={20} className="animate-pulse" />
            </div>
            <div className="truncate">
              <h3 className="text-sm sm:text-base font-bold text-amber-200 tracking-tight flex items-center gap-1.5 truncate">
                <span>세계 정세 & 인스턴스 던전 소식</span>
                <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-full font-mono">
                  {newsList.length}건
                </span>
              </h3>
              <p className="text-[11px] text-slate-400 truncate">시간 경과로 인한 세계 곳곳의 정세 변화 리포트입니다.</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors shrink-0 active:scale-95"
            aria-label="닫기"
          >
            <X size={20} />
          </button>
        </div>

        {/* 모바일 최적화 카테고리 필터 탭 */}
        <div className="px-3 py-2 bg-slate-900/90 border-b border-slate-800/80 flex items-center gap-1.5 shrink-0 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap min-h-[36px] flex items-center gap-1 ${
              activeTab === 'all'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Compass size={14} />
            <span>전체 소식 ({newsList.length})</span>
          </button>

          {hasWarNews && (
            <button
              onClick={() => setActiveTab('war')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap min-h-[36px] flex items-center gap-1 ${
                activeTab === 'war'
                  ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                  : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <ShieldAlert size={14} />
              <span>전쟁/전선</span>
            </button>
          )}

          {hasEconomyNews && (
            <button
              onClick={() => setActiveTab('economy')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap min-h-[36px] flex items-center gap-1 ${
                activeTab === 'economy'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <Coins size={14} />
              <span>시장/물가</span>
            </button>
          )}

          {hasDiplomacyNews && (
            <button
              onClick={() => setActiveTab('diplomacy')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap min-h-[36px] flex items-center gap-1 ${
                activeTab === 'diplomacy'
                  ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                  : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <Globe size={14} />
              <span>세계 정세/외교</span>
            </button>
          )}

          {hasDungeonNews && (
            <button
              onClick={() => setActiveTab('dungeon')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap min-h-[36px] flex items-center gap-1 ${
                activeTab === 'dungeon'
                  ? 'bg-purple-500 text-white shadow-md shadow-purple-500/20'
                  : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <Swords size={14} />
              <span>던전/소문</span>
            </button>
          )}
        </div>

        {/* 모바일 스크롤 영역 (뉴스 피드) */}
        <div className="flex-1 p-3 sm:p-4 overflow-y-auto space-y-2.5 custom-scrollbar">
          {filteredList.length > 0 ? (
            filteredList.map((item) => {
              const isWar = item.category === 'war';
              const isEconomy = item.category === 'economy';
              const isDungeon = item.category === 'dungeon';
              const isBlackMarket = /특별상점|암시장/i.test(item.title) || /특별상점|암시장/i.test(item.message);

              const cardStyle = isWar 
                ? 'bg-rose-950/30 border-rose-500/40 hover:border-rose-500/70 shadow-sm shadow-rose-950/20'
                : isEconomy
                ? 'bg-amber-950/30 border-amber-500/40 hover:border-amber-500/70 shadow-sm shadow-amber-950/20'
                : isBlackMarket
                ? 'bg-gradient-to-r from-purple-950/40 via-violet-950/30 to-slate-900/80 border-violet-500/50 hover:border-violet-400'
                : isDungeon
                ? 'bg-purple-950/30 border-purple-500/40 hover:border-purple-500/60'
                : 'bg-slate-900/80 border-slate-800 hover:border-slate-700';

              const badgeConfig = isWar
                ? { icon: <ShieldAlert size={11} />, text: '전쟁 속보', style: 'bg-rose-500/20 border-rose-500/40 text-rose-300' }
                : isEconomy
                ? { icon: <Coins size={11} />, text: '시장/물가 특보', style: 'bg-amber-500/20 border-amber-500/40 text-amber-300' }
                : isBlackMarket
                ? { icon: <ShoppingBag size={11} />, text: '특별상점 소문', style: 'bg-violet-500/25 border-violet-400/50 text-violet-200 shadow-sm' }
                : isDungeon
                ? { icon: <Swords size={11} />, text: '던전 소식', style: 'bg-purple-500/20 border-purple-500/40 text-purple-300' }
                : { icon: <Globe size={11} />, text: '외교 정세', style: 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300' };

              return (
                <div
                  key={item.id}
                  className={`p-3 sm:p-4 rounded-xl sm:rounded-2xl border transition-all ${cardStyle}`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border flex items-center gap-1 ${badgeConfig.style}`}>
                      {badgeConfig.icon}
                      {badgeConfig.text}
                    </span>
                    {item.date && (
                      <span className="text-[10px] text-slate-400 font-mono">
                        {item.date}
                      </span>
                    )}
                  </div>

                  <h4 className="text-xs sm:text-sm font-bold text-amber-300 mb-1 leading-snug">
                    {item.title}
                  </h4>

                  <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-line break-words">
                    {item.message}
                  </p>
                </div>
              );
            })
          ) : (
            <div className="p-8 text-center text-xs text-slate-500 italic">
              해당 카테고리의 새로운 소식이 없습니다.
            </div>
          )}
        </div>

        {/* 모바일 최적화 하단 액션 버튼 바 */}
        <div className="p-3 sm:p-4 bg-slate-900/90 border-t border-slate-800 flex flex-col sm:flex-row items-center gap-2 shrink-0">
          <div className="w-full flex items-center gap-2">
            {hasDungeonNews && onOpenDungeon && (
              <button
                onClick={() => {
                  onClose();
                  onOpenDungeon();
                }}
                className="flex-1 py-3 px-3 rounded-xl bg-purple-600/90 hover:bg-purple-500 border border-purple-400/50 text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 active:scale-95 shadow-md min-h-[44px]"
              >
                <Swords size={15} />
                <span>던전 탐험 바로가기</span>
              </button>
            )}

            {hasDiplomacyNews && onOpenMap && (
              <button
                onClick={() => {
                  onClose();
                  onOpenMap();
                }}
                className="flex-1 py-3 px-3 rounded-xl bg-cyan-600/90 hover:bg-cyan-500 border border-cyan-400/50 text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 active:scale-95 shadow-md min-h-[44px]"
              >
                <Globe size={15} />
                <span>세계 지도 바로가기</span>
              </button>
            )}
          </div>

          <button
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-colors min-h-[44px] shrink-0"
          >
            확인 및 닫기
          </button>
        </div>
      </div>
    </div>
  );
};
