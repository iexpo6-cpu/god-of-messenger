import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, Sun, Moon, Sparkles, Flame, Snowflake, Zap, Leaf, Wind, Mountain, Eclipse, Droplets, Hammer, Activity, Shield, Info, HelpCircle, AlertCircle, ArrowRight
} from 'lucide-react';
import { SHINRYOKU_AFFINITY, SHINRYOKU_STATUS_MAP, SHINRYOKU_UI_CONFIG } from '../constants';

interface ShinryokuInfoModalProps {
  currentType: string;
  onClose: () => void;
}

// Lore and detailed info for each element
const SHINRYOKU_DESCRIPTIONS: Record<string, string> = {
  '태양계': '태양의 뜨겁고 찬란한 빛과 열기를 다루는 최상위 계통. 적의 시야를 멀게 하고, 생명력을 파괴적으로 소멸시키는 화상과 폭발적 마법에 매우 탁월합니다.',
  '월광계': '오묘하고 차가운 달빛과 그림자의 에너지를 부리는 계통. 정신을 혼란하게 하거나 그림자 칼날로 적을 기습하며, 강력한 지속 저주 및 약화 상태 이상을 부여합니다.',
  '암흑계': '어둠과 공허, 혼돈의 힘을 지배하는 기괴한 계통. 적의 영혼을 흡수하고 육체를 옭아매며, 공포와 생명 갈취를 통해 전장을 서서히 잠식해 나갑니다.',
  '광휘계': '신성한 성광과 빛의 파동을 다루는 정화계통. 악한 마성이나 사악한 상태를 완전히 불태우는 극광의 에너지를 발산하여 적을 마비시키거나 정화합니다.',
  '해수계': '끝없는 수압과 휘몰아치는 해류를 지배하는 계통. 적의 힘을 빼앗아 무력화시키고 아군의 생명력을 정화하거나 보호막을 치는 단단하고 물 흐르듯 유연한 기운입니다.',
  '빙결계': '온 세상을 얼려버릴 듯한 절대영도의 서리를 조절하는 계통. 적을 완전히 동결시켜 움직이지 못하게 얼리거나, 치명적인 얼음 송곳으로 극심한 물리/마법 피해를 줍니다.',
  '전격계': '순식간에 대지를 내리치는 고압의 전류와 번개를 호령하는 계통. 타오르는 전기 에너지로 적을 극도로 감전시키고 기절시키는 신속하고 치명적인 속도 중심의 기운입니다.',
  '화염계': '만물을 태우고 정화하는 파괴의 불꽃을 불러일으키는 가장 대중적이면서도 강력한 계통. 극심한 화상을 안겨주며, 누적 데미지와 즉발 폭발 능력이 매우 뛰어납니다.',
  '초화계': '대지 위로 솟아나는 생명력 가득한 초목과 숲의 힘을 조절하는 계통. 덩굴로 적의 움직임을 억제하고 독과 치유력을 지배하며, 생존 유틸리티가 극도로 뛰어납니다.',
  '질풍계': '거센 태풍과 기류를 다뤄 시공간을 가르는 바람의 계통. 아군의 비행 및 이동 속도를 극한으로 가속하고 날카로운 풍압으로 적의 피부와 방어를 갈기갈기 찢어놓습니다.',
  '대지계': '흔들리지 않는 거대한 바위와 중력의 중심을 부리는 견고한 계통. 독보적인 방어 효율과 단단함을 자랑하며 적을 제압해 이동과 저항 능력을 완벽하게 봉쇄합니다.',
  '강철계': '차가운 금속의 질감과 무거운 강도를 지배하는 계통. 아군의 무기와 갑옷을 비약적으로 가공하여 어떠한 타격도 흡수하고 치명적인 상태이상을 무기로 되돌려줍니다.',
  '무기강화계': '오직 전투와 무기 기술을 초자연적 경지로 끌어올리는 살상 계통. 들고 있는 검, 창, 도끼 등에 폭발적인 예리함과 기운을 부여해 출혈과 파열 데미지를 극대화합니다.',
  '신체강화계': '시전자의 근육, 세포, 오감을 초인적인 상태로 개방하는 기혈 계통. 체력 재생력, 방어 가드가 상시 유지되며 폭발적인 완력으로 적의 영혼과 뼈를 골절시킵니다.'
};

const ELEMENT_COLORS: Record<string, { text: string; bg: string; border: string; iconColor: string }> = {
  '화염계': { text: 'text-red-400', bg: 'bg-red-950/30', border: 'border-red-500/30', iconColor: 'text-red-500' },
  '빙결계': { text: 'text-cyan-400', bg: 'bg-cyan-950/30', border: 'border-cyan-500/30', iconColor: 'text-cyan-400' },
  '전격계': { text: 'text-yellow-400', bg: 'bg-yellow-950/30', border: 'border-yellow-500/30', iconColor: 'text-yellow-400' },
  '초화계': { text: 'text-lime-400', bg: 'bg-lime-950/30', border: 'border-lime-500/30', iconColor: 'text-lime-400' },
  '질풍계': { text: 'text-emerald-400', bg: 'bg-emerald-950/30', border: 'border-emerald-500/30', iconColor: 'text-emerald-400' },
  '대지계': { text: 'text-amber-600', bg: 'bg-amber-950/30', border: 'border-amber-500/30', iconColor: 'text-amber-700' },
  '해수계': { text: 'text-blue-400', bg: 'bg-blue-950/30', border: 'border-blue-500/30', iconColor: 'text-blue-400' },
  '암흑계': { text: 'text-purple-400', bg: 'bg-purple-950/30', border: 'border-purple-500/30', iconColor: 'text-purple-400' },
  '광휘계': { text: 'text-yellow-200', bg: 'bg-yellow-950/20', border: 'border-yellow-400/30', iconColor: 'text-yellow-200 animate-pulse' },
  '태양계': { text: 'text-orange-400', bg: 'bg-orange-950/30', border: 'border-orange-500/30', iconColor: 'text-orange-400' },
  '월광계': { text: 'text-indigo-300', bg: 'bg-indigo-950/30', border: 'border-indigo-500/30', iconColor: 'text-indigo-300' },
  '무기강화계': { text: 'text-slate-400', bg: 'bg-slate-900/30', border: 'border-slate-500/30', iconColor: 'text-slate-400' },
  '신체강화계': { text: 'text-rose-400', bg: 'bg-rose-950/30', border: 'border-rose-500/30', iconColor: 'text-rose-400' },
  '강철계': { text: 'text-zinc-400', bg: 'bg-zinc-900/30', border: 'border-zinc-500/30', iconColor: 'text-zinc-400' },
};

export default function ShinryokuInfoModal({ currentType, onClose }: ShinryokuInfoModalProps) {
  const initialSelected = SHINRYOKU_AFFINITY[currentType] ? currentType : '화염계';
  const [selectedType, setSelectedType] = useState<string>(initialSelected);

  const getShinryokuIcon = (type: string, size = 14) => {
    switch (type) {
      case '태양계': return <Sun size={size} className={ELEMENT_COLORS[type]?.iconColor || ''} />;
      case '월광계': return <Moon size={size} className={ELEMENT_COLORS[type]?.iconColor || ''} />;
      case '광휘계': return <Sparkles size={size} className={ELEMENT_COLORS[type]?.iconColor || ''} />;
      case '화염계': return <Flame size={size} className={ELEMENT_COLORS[type]?.iconColor || ''} />;
      case '빙결계': return <Snowflake size={size} className={ELEMENT_COLORS[type]?.iconColor || ''} />;
      case '전격계': return <Zap size={size} className={ELEMENT_COLORS[type]?.iconColor || ''} />;
      case '초화계': return <Leaf size={size} className={ELEMENT_COLORS[type]?.iconColor || ''} />;
      case '질풍계': return <Wind size={size} className={ELEMENT_COLORS[type]?.iconColor || ''} />;
      case '대지계': return <Mountain size={size} className={ELEMENT_COLORS[type]?.iconColor || ''} />;
      case '암흑계': return <Eclipse size={size} className={ELEMENT_COLORS[type]?.iconColor || ''} />;
      case '해수계': return <Droplets size={size} className={ELEMENT_COLORS[type]?.iconColor || ''} />;
      case '무기강화계': return <Hammer size={size} className={ELEMENT_COLORS[type]?.iconColor || ''} />;
      case '신체강화계': return <Activity size={size} className={ELEMENT_COLORS[type]?.iconColor || ''} />;
      case '강철계': return <Shield size={size} className={ELEMENT_COLORS[type]?.iconColor || ''} />;
      default: return <HelpCircle size={size} className="text-slate-500" />;
    }
  };

  const affinity = SHINRYOKU_AFFINITY[selectedType] || { strong: [], weak: [] };
  const statuses = SHINRYOKU_STATUS_MAP[selectedType] || [];
  const lore = SHINRYOKU_DESCRIPTIONS[selectedType] || '아직 밝혀지지 않은 신비한 계통입니다.';

  const elementList = Object.keys(SHINRYOKU_AFFINITY);

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      {/* Container - Mobile-optimized, max height bound, full-width scrolling logic */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-2xl h-[90vh] sm:h-[80vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between p-3.5 border-b border-slate-800 bg-slate-950/80 shrink-0">
          <div className="flex items-center gap-2">
            <Info size={16} className="text-amber-400" />
            <h3 className="text-sm font-bold text-slate-100 font-cinzel">신력 계통 정보 및 상성표</h3>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-100 p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content Area - Scrollable */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-4">
          
          {/* Current Element Indicator */}
          {currentType && currentType !== '미개방' && (
            <div className={`p-2.5 rounded-lg border flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 ${ELEMENT_COLORS[currentType]?.bg || 'bg-slate-950/40'} ${ELEMENT_COLORS[currentType]?.border || 'border-slate-800'}`}>
              <div className="flex items-center gap-2">
                {getShinryokuIcon(currentType, 16)}
                <span className="text-xs font-bold text-slate-300">
                  현재 개방된 신력 계통: <strong className={`ml-1 ${ELEMENT_COLORS[currentType]?.text || 'text-slate-100'}`}>{currentType}</strong>
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedType(currentType)}
                className="text-[10px] text-amber-400 font-bold hover:underline text-left"
              >
                현재 신력 계통 설명 바로 보기 &rarr;
              </button>
            </div>
          )}

          {/* Quick Info Rule Box */}
          <div className="bg-slate-950/50 border border-slate-800/80 p-2.5 rounded-lg text-[11px] leading-relaxed text-slate-400 flex items-start gap-2 select-none">
            <AlertCircle size={13} className="text-amber-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-slate-200 mb-0.5">상성 전투 룰</p>
              <p>
                - 공격 대상에 대해 <span className="text-emerald-400 font-bold">유리한 상성일 경우 최종 피해량 1.5배 증가</span>합니다.<br />
                - 공격 대상에 대해 <span className="text-red-400 font-bold">불리한 상성일 경우 최종 피해량 0.5배로 감소</span>합니다.
              </p>
            </div>
          </div>

          {/* Grid Layout: Left Tabs (All Elements), Right Details */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3.5">
            
            {/* Elements Tabs Selection - Grid for fast tapping */}
            <div className="md:col-span-2 space-y-1">
              <span className="text-[10px] font-bold text-slate-400 block px-1 mb-1.5">계통 선택</span>
              <div className="grid grid-cols-2 xs:grid-cols-3 md:grid-cols-1 gap-1 max-h-[160px] md:max-h-[380px] overflow-y-auto pr-1 no-scrollbar">
                {elementList.map((type) => {
                  const isSelected = selectedType === type;
                  const isCurrent = currentType === type;
                  const colors = ELEMENT_COLORS[type] || { text: 'text-slate-400', bg: 'bg-slate-950/20', border: 'border-slate-800' };

                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setSelectedType(type)}
                      className={`flex items-center gap-1.5 p-2 rounded text-left transition-all min-h-[36px] sm:min-h-[40px] border text-xs ${
                        isSelected 
                          ? `${colors.bg} ${colors.border} font-bold ring-1 ring-slate-700` 
                          : 'bg-slate-950/20 border-slate-800/60 hover:bg-slate-800/40 text-slate-400'
                      }`}
                    >
                      {getShinryokuIcon(type, 11)}
                      <span className={`truncate flex-1 ${isSelected ? colors.text : 'text-slate-300'}`}>
                        {type}
                      </span>
                      {isCurrent && (
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400" title="현재 나의 신력" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Selected Element Detail Panel */}
            <div className="md:col-span-3 bg-slate-950/60 border border-slate-800 rounded-lg p-3 sm:p-4 space-y-4">
              
              {/* Element Header */}
              <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
                {getShinryokuIcon(selectedType, 20)}
                <div>
                  <h4 className={`text-sm font-extrabold ${ELEMENT_COLORS[selectedType]?.text || 'text-slate-100'}`}>
                    {selectedType}
                  </h4>
                  <span className="text-[9px] text-slate-500 font-mono">DIVINE LINEAGE</span>
                </div>
              </div>

              {/* Lore Description */}
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-400 block">계통 설명</span>
                <p className="text-xs text-slate-300 leading-relaxed bg-slate-900/50 p-2.5 rounded border border-slate-800/40">
                  {lore}
                </p>
              </div>

              {/* Associated Status Effects */}
              {statuses.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold text-slate-400 block">핵심 유발 상태이상</span>
                  <div className="flex flex-wrap gap-1">
                    {statuses.map((st) => (
                      <span 
                        key={st}
                        className="text-[9.5px] px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700/80 text-slate-200 font-medium"
                      >
                        {st}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Matchup Graph */}
              <div className="space-y-3 pt-1 border-t border-slate-800/60">
                
                {/* Dealt Strong Against */}
                <div className="space-y-1">
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] font-bold text-emerald-400">유리한 상성</span>
                    <span className="text-[9px] text-slate-500">(피해량 1.5배 증가)</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {affinity.strong.length > 0 ? (
                      affinity.strong.map((strType) => (
                        <button
                          type="button"
                          key={strType}
                          onClick={() => setSelectedType(strType)}
                          className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] border bg-emerald-950/30 border-emerald-500/20 text-emerald-300 hover:bg-emerald-900/20`}
                        >
                          {getShinryokuIcon(strType, 9)}
                          <span>{strType}</span>
                        </button>
                      ))
                    ) : (
                      <span className="text-[10px] text-slate-600 font-mono italic">강점 상성이 존재하지 않습니다.</span>
                    )}
                  </div>
                </div>

                {/* Dealt Weak Against */}
                <div className="space-y-1">
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] font-bold text-red-400">불리한 상성</span>
                    <span className="text-[9px] text-slate-500">(피해량 0.5배 감소)</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {affinity.weak.length > 0 ? (
                      affinity.weak.map((weakType) => (
                        <button
                          type="button"
                          key={weakType}
                          onClick={() => setSelectedType(weakType)}
                          className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] border bg-red-950/30 border-red-500/20 text-red-300 hover:bg-red-900/20`}
                        >
                          {getShinryokuIcon(weakType, 9)}
                          <span>{weakType}</span>
                        </button>
                      ))
                    ) : (
                      <span className="text-[10px] text-slate-600 font-mono italic">약점 상성이 존재하지 않습니다.</span>
                    )}
                  </div>
                </div>

              </div>

            </div>

          </div>

        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/80 text-center shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold text-xs transition-colors"
          >
            확인 및 닫기
          </button>
        </div>

      </div>
    </div>,
    document.body
  );
}
