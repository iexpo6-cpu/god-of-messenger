import React, { useState } from 'react';
import { X, Sparkles, Shield, Sword, Zap, Info, Star } from 'lucide-react';
import { Item, ItemRarity } from '../types';
import { RARITY_VALUE_RANGE } from '../itemPools';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  item?: Item | null;
}

export const RerollOptionPoolModal: React.FC<Props> = ({ isOpen, onClose, item }) => {
  const [activeTab, setActiveTab] = useState<'all' | 'offensive' | 'defensive' | 'special' | 'rates'>('all');

  if (!isOpen) return null;

  const currentRarity = item?.rarity || ItemRarity.NORMAL;
  const currentRange = RARITY_VALUE_RANGE[currentRarity] || { min: 1, max: 5 };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-slate-900 border border-purple-500/40 rounded-2xl shadow-2xl shadow-purple-950/50 flex flex-col max-h-[90vh] overflow-hidden">
        {/* 모달 상단 헤더 */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-purple-950 border border-purple-500/40 flex items-center justify-center text-purple-300 shrink-0">
              <Sparkles size={18} />
            </div>
            <div className="min-w-0">
              <h3 className="text-base sm:text-lg font-black text-white truncate">
                옵션 재설정 가능 목록
              </h3>
              <p className="text-[11px] text-slate-400 truncate">
                재설정 시 부여될 수 있는 능력치 및 등급별 수치 안내
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors shrink-0"
            aria-label="닫기"
          >
            <X size={20} />
          </button>
        </div>

        {/* 현재 장비 정보 요약 카드 */}
        {item && (
          <div className="mx-4 sm:mx-5 mt-4 p-3 bg-slate-950/90 border border-slate-800 rounded-xl flex items-center justify-between gap-2 text-xs">
            <div className="min-w-0">
              <span className="text-[10px] text-slate-400 block">선택된 장비</span>
              <span className="font-bold text-white truncate block">{item.name}</span>
            </div>
            <div className="text-right shrink-0">
              <span className="text-[10px] text-purple-300 font-bold block">{item.rarity} 등급 수치 범위</span>
              <span className="font-mono font-black text-amber-400 text-sm">
                +{currentRange.min}% ~ +{currentRange.max}%
              </span>
            </div>
          </div>
        )}

        {/* 탭 네비게이션 */}
        <div className="flex items-center gap-1 px-4 sm:px-5 pt-3 pb-2 border-b border-slate-800 overflow-x-auto no-scrollbar text-xs">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 rounded-lg font-bold shrink-0 transition-colors ${
              activeTab === 'all'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'bg-slate-800/80 text-slate-400 hover:text-slate-200'
            }`}
          >
            전체 보기
          </button>
          <button
            onClick={() => setActiveTab('offensive')}
            className={`px-3 py-1.5 rounded-lg font-bold shrink-0 transition-colors flex items-center gap-1 ${
              activeTab === 'offensive'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'bg-slate-800/80 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sword size={12} /> 공격형
          </button>
          <button
            onClick={() => setActiveTab('defensive')}
            className={`px-3 py-1.5 rounded-lg font-bold shrink-0 transition-colors flex items-center gap-1 ${
              activeTab === 'defensive'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'bg-slate-800/80 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Shield size={12} /> 방어형
          </button>
          <button
            onClick={() => setActiveTab('special')}
            className={`px-3 py-1.5 rounded-lg font-bold shrink-0 transition-colors flex items-center gap-1 ${
              activeTab === 'special'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'bg-slate-800/80 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Zap size={12} /> 특수
          </button>
          <button
            onClick={() => setActiveTab('rates')}
            className={`px-3 py-1.5 rounded-lg font-bold shrink-0 transition-colors flex items-center gap-1 ${
              activeTab === 'rates'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'bg-slate-800/80 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Star size={12} /> 등급별 수치
          </button>
        </div>

        {/* 모달 본문 (스크롤) */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs leading-relaxed">
          {/* 1. 기본 능력치 (모든 장비 공통) */}
          {(activeTab === 'all' || activeTab === 'rates') && (
            <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5 space-y-2">
              <div className="flex items-center gap-1.5 text-slate-300 font-bold">
                <Info size={14} className="text-indigo-400" />
                <span>공통 기본 스탯 (정수 증가)</span>
              </div>
              <p className="text-[11px] text-slate-400">
                모든 장비 부위에 공통으로 부여될 수 있는 기본 스탯 옵션입니다.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 pt-1">
                {['STR +수치', 'INT +수치', 'DEF +수치', 'AGI +수치', 'WIS +수치', 'CTRL +수치', '최대 HP +수치', '최대 MP +수치'].map((opt, i) => (
                  <div key={i} className="bg-slate-900 border border-slate-800 px-2 py-1.5 rounded text-center text-slate-200 text-[11px]">
                    {opt}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 2. 공격형 옵션 (무기, 악세사리) */}
          {(activeTab === 'all' || activeTab === 'offensive') && (
            <div className="bg-slate-950/70 border border-amber-900/40 rounded-xl p-3.5 space-y-2">
              <div className="flex items-center gap-1.5 text-amber-300 font-bold">
                <Sword size={14} className="text-amber-400" />
                <span>공격형 옵션 (무기 및 악세사리)</span>
              </div>
              <p className="text-[11px] text-slate-400">
                무기 및 악세사리 부위에 가중치로 부여되는 공격 관련 옵션입니다.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
                {[
                  '물리 공격력 +%',
                  '마법 공격력 +%',
                  '치명타 확률 +%',
                  '치명타 피해량 +%',
                  '물리 명중률 +%',
                  '마법 명중률 +%',
                  '{속성} 속성 피해 +%',
                  'STR +%',
                  'AGI +%',
                  'INT +%',
                  'WIS +%',
                  'CTRL +%'
                ].map((opt, i) => (
                  <div key={i} className="bg-slate-900 border border-slate-800 px-2.5 py-1.5 rounded flex items-center justify-between text-slate-200 text-[11px]">
                    <span>• {opt}</span>
                    <span className="text-[10px] text-amber-400 font-mono">퍼센트</span>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-slate-500 mt-1">
                * 속성 피해: 화염, 빙결, 전격, 신성, 암흑, 자연, 질풍 속성 중 무작위 부여
              </p>
            </div>
          )}

          {/* 3. 방어형 옵션 (방어구, 보조무기, 악세사리) */}
          {(activeTab === 'all' || activeTab === 'defensive') && (
            <div className="bg-slate-950/70 border border-blue-900/40 rounded-xl p-3.5 space-y-2">
              <div className="flex items-center gap-1.5 text-blue-300 font-bold">
                <Shield size={14} className="text-blue-400" />
                <span>방어형 옵션 (방어구, 보조무기, 악세사리)</span>
              </div>
              <p className="text-[11px] text-slate-400">
                방어구, 방패, 보조무기, 악세사리에 주로 부여되는 생존 및 저항 관련 옵션입니다.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
                {[
                  '물리 방어력 +%',
                  '마법 방어력 +%',
                  '물리 회피율 +%',
                  '마법 회피율 +%',
                  'DEF +%',
                  'WIS +%',
                  '상태이상 저항 +%'
                ].map((opt, i) => (
                  <div key={i} className="bg-slate-900 border border-slate-800 px-2.5 py-1.5 rounded flex items-center justify-between text-slate-200 text-[11px]">
                    <span>• {opt}</span>
                    <span className="text-[10px] text-blue-400 font-mono">퍼센트</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 4. 특수 고급 옵션 (에픽, 유니크, 전설, 신화 전용) */}
          {(activeTab === 'all' || activeTab === 'special') && (
            <div className="bg-slate-950/70 border border-purple-900/50 rounded-xl p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-purple-300 font-bold">
                  <Zap size={14} className="text-purple-400" />
                  <span>특수 옵션 (에픽 등급 이상 전용)</span>
                </div>
                <span className="text-[10px] text-purple-400 bg-purple-950/80 px-2 py-0.5 rounded border border-purple-800">
                  고급 룬 옵션
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                에픽, 유니크, 전설, 신화 등급의 고등급 장비에만 특별히 개방되는 강력한 옵션 풀입니다.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
                {[
                  '최종 능력치 +%',
                  '모든 속성 피해 +%',
                  '모든 속성 저항 +%',
                  '{속성} 속성 피해 +%',
                  '{속성} 속성 저항 +%',
                  'CTRL +%',
                  '골드 획득량 +%',
                  '경험치 획득량 +%'
                ].map((opt, i) => (
                  <div key={i} className="bg-slate-900 border border-purple-900/40 px-2.5 py-1.5 rounded flex items-center justify-between text-purple-200 text-[11px]">
                    <span>★ {opt}</span>
                    <span className="text-[10px] text-purple-400 font-mono">특수</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 5. 등급별 퍼센트 수치 범위 표 */}
          {(activeTab === 'all' || activeTab === 'rates') && (
            <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5 space-y-2">
              <div className="flex items-center gap-1.5 text-slate-300 font-bold">
                <Star size={14} className="text-amber-400" />
                <span>장비 등급별 옵션 퍼센트 수치 범위</span>
              </div>
              <p className="text-[11px] text-slate-400">
                장비의 등급이 높을수록 리롤 시 부여되는 옵션의 수치가 월등히 높아집니다.
              </p>
              <div className="space-y-1.5 pt-1">
                {[
                  { rarity: '노말', range: '1% ~ 5%', color: 'text-slate-400', isCur: currentRarity === ItemRarity.NORMAL },
                  { rarity: '마법', range: '5% ~ 10%', color: 'text-blue-400', isCur: currentRarity === ItemRarity.MAGIC },
                  { rarity: '레어', range: '5% ~ 15%', color: 'text-yellow-400', isCur: currentRarity === ItemRarity.RARE },
                  { rarity: '에픽', range: '10% ~ 20%', color: 'text-purple-400', isCur: currentRarity === ItemRarity.EPIC },
                  { rarity: '유니크', range: '15% ~ 25%', color: 'text-pink-400', isCur: currentRarity === ItemRarity.UNIQUE },
                  { rarity: '전설', range: '20% ~ 45%', color: 'text-amber-400', isCur: currentRarity === ItemRarity.LEGENDARY },
                  { rarity: '신화', range: '50% ~ 100%', color: 'text-red-400', isCur: currentRarity === ItemRarity.MYTHTIC }
                ].map((row, i) => (
                  <div
                    key={i}
                    className={`flex items-center justify-between px-3 py-1.5 rounded border text-[11px] ${
                      row.isCur
                        ? 'bg-purple-950/60 border-purple-500 shadow-sm'
                        : 'bg-slate-900 border-slate-800'
                    }`}
                  >
                    <span className={`font-bold ${row.color}`}>
                      {row.rarity} {row.isCur && '(현재 장비 등급)'}
                    </span>
                    <span className="font-mono font-black text-slate-200">
                      +{row.range}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 모달 하단 닫기 버튼 */}
        <div className="p-3 sm:p-4 border-t border-slate-800 bg-slate-950/80">
          <button
            onClick={onClose}
            className="w-full py-2.5 sm:py-3 bg-purple-700 hover:bg-purple-600 active:scale-98 text-white font-bold rounded-xl text-xs sm:text-sm shadow-md transition-all"
          >
            확인
          </button>
        </div>
      </div>
    </div>
  );
};
