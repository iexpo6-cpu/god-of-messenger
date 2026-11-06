import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Heart, ChevronDown, ChevronUp, GripHorizontal } from 'lucide-react';
import { Character, Companion, BondSkill } from '../../types';

interface Props {
  activeBondSkills: BondSkill[];
  player: Character;
}

const BondGaugesPanel: React.FC<Props> = ({ activeBondSkills, player }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  if (!activeBondSkills || activeBondSkills.length === 0) return null;

  return (
    <motion.div
      drag
      dragMomentum={false}
      dragElastic={0.1}
      initial={{ x: 0, y: 0 }}
      className="fixed z-[150] bg-slate-950/95 border border-pink-500/50 rounded-2xl shadow-[0_0_20px_rgba(236,72,153,0.3)] pointer-events-auto flex flex-col overflow-hidden max-w-[220px]"
      style={{
        right: '16px',
        top: '20%',
        touchAction: 'none' // 모바일 스크롤과 드래그 충돌 방지
      }}
    >
      {/* 드래그 및 토글 헤더 */}
      <div className="bg-gradient-to-r from-pink-900/60 to-slate-900/80 px-3 py-2 flex items-center justify-between gap-1 border-b border-pink-500/30 select-none cursor-move">
        <div className="flex items-center gap-1.5 min-w-0">
          <GripHorizontal size={14} className="text-pink-400 shrink-0" />
          <Heart size={12} className="text-pink-500 animate-pulse shrink-0" />
          <span className="text-[11px] font-bold text-pink-200 truncate">인연 게이지</span>
        </div>
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1 hover:bg-white/10 rounded-lg text-pink-300 transition-all shrink-0 active:scale-95"
          title="인연 게이지 접기"
        >
          {isCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
        </button>
      </div>

      {/* 게이지 내용물 영역 */}
      {!isCollapsed && (
        <div className="p-3 space-y-3 max-h-[40vh] overflow-y-auto custom-scrollbar">
          {activeBondSkills.map((bs, bsIdx) => {
            const gauge = player.bondGauges?.[bs.id] || 0;
            const sourceComp = bs.sourceId ? player.companions.find(c => c.id === bs.sourceId) : null;
            const targetComp = player.companions.find(c => c.id === bs.companionId);
            const isSourceAlive = bs.sourceId ? (sourceComp && sourceComp.stats.hp > 0 && !sourceComp.isDead) : (player.stats.hp > 0 && !player.isDead);
            const isTargetAlive = targetComp && targetComp.stats.hp > 0 && !targetComp.isDead;
            const isIncapacitated = !isSourceAlive || !isTargetAlive;
            
            const isReady = gauge >= 100 && !isIncapacitated;
            const sourceName = bs.sourceName || player.name;
            const targetName = bs.companionName;

            return (
              <div
                key={`${bs.id || bs.sourceName || 'bond'}-${bs.companionId || ''}-${bsIdx}`}
                className={`bg-slate-900/80 border ${
                  isReady ? 'border-pink-500 shadow-[0_0_10px_rgba(236,72,153,0.4)]' : 'border-slate-800'
                } rounded-xl p-2.5 transition-all duration-300 ${
                  isIncapacitated ? 'opacity-50 grayscale' : ''
                }`}
              >
                <div className="flex justify-between items-center gap-1.5 mb-1.5">
                  <span className="text-[10px] font-bold text-pink-300 truncate max-w-[110px]">
                    {sourceName} - {targetName}
                  </span>
                  <span className="text-[9px] font-bold text-slate-400 shrink-0">
                    {isIncapacitated ? '불가' : `${gauge}%`}
                  </span>
                </div>
                <div className="h-1.5 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                  <div
                    className={`h-full ${
                      isReady ? 'bg-gradient-to-r from-pink-500 to-rose-400 animate-pulse' : 'bg-pink-600/70'
                    } transition-all duration-500`}
                    style={{ width: `${gauge}%` }}
                  ></div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 접혔을 때 요약 정보 표시 */}
      {isCollapsed && (
        <div 
          onClick={() => setIsCollapsed(false)}
          className="p-2 bg-slate-900/40 text-center cursor-pointer hover:bg-slate-900/80 transition-all border-t border-slate-900"
        >
          <p className="text-[10px] font-bold text-pink-400 animate-pulse">
            {activeBondSkills.length}개의 인연 활성화 중
          </p>
        </div>
      )}
    </motion.div>
  );
};

export default BondGaugesPanel;
