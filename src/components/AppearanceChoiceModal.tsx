import React, { useState } from 'react';
import { X, Sparkles, Check, Crown, Flame, User, RefreshCw } from 'lucide-react';

export interface AppearanceChoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetName: string;
  jobTitle: string;
  isDemonGod?: boolean;
  currentVisualUrl: string;
  newVisualUrl: string;
  onConfirm: (selectedVisualUrl: string) => void;
}

export const AppearanceChoiceModal: React.FC<AppearanceChoiceModalProps> = ({
  isOpen,
  onClose,
  targetName,
  jobTitle,
  isDemonGod = false,
  currentVisualUrl,
  newVisualUrl,
  onConfirm
}) => {
  // 기본 선택은 사용자가 직접 고를 수 있도록 새 외형을 디폴트 프리뷰로 두거나 현재 외형으로 둠
  const [selectedChoice, setSelectedChoice] = useState<'keep' | 'change'>('keep');
  const [currentImgError, setCurrentImgError] = useState(false);
  const [newImgError, setNewImgError] = useState(false);

  if (!isOpen) return null;

  const handleApply = () => {
    if (selectedChoice === 'keep') {
      onConfirm(currentVisualUrl);
    } else {
      onConfirm(newVisualUrl);
    }
  };

  const themeAccent = isDemonGod
    ? {
        border: 'border-red-500/40',
        glow: 'shadow-[0_0_50px_rgba(220,38,38,0.25)]',
        headerGrad: 'from-slate-950 via-slate-900 to-red-950/40',
        titleColor: 'text-red-400',
        badge: 'bg-red-500/20 text-red-300 border-red-500/30',
        btnGrad: 'from-red-600 to-red-500 hover:from-red-500 hover:to-red-400',
        activeBorder: 'border-red-500 ring-2 ring-red-500/40 bg-red-950/20',
        icon: Flame
      }
    : {
        border: 'border-amber-500/40',
        glow: 'shadow-[0_0_50px_rgba(245,158,11,0.25)]',
        headerGrad: 'from-slate-950 via-slate-900 to-amber-950/40',
        titleColor: 'text-amber-400',
        badge: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
        btnGrad: 'from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400',
        activeBorder: 'border-amber-500 ring-2 ring-amber-500/40 bg-amber-950/20',
        icon: Crown
      };

  const IconComponent = themeAccent.icon;

  return (
    <div className="fixed inset-0 z-[1100] flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className={`w-full max-w-xl bg-slate-900 border ${themeAccent.border} ${themeAccent.glow} rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden text-slate-100`}
        onClick={e => e.stopPropagation()}
      >
        {/* 상단 헤더 */}
        <div className={`px-5 py-4 bg-gradient-to-r ${themeAccent.headerGrad} border-b border-slate-800 flex items-center justify-between shrink-0`}>
          <div className="flex items-center gap-2.5">
            <div className={`w-9 h-9 rounded-2xl ${themeAccent.badge} border flex items-center justify-center shrink-0`}>
              <IconComponent size={20} className={themeAccent.titleColor} />
            </div>
            <div>
              <h3 className={`text-base font-black ${themeAccent.titleColor} tracking-wide flex items-center gap-1.5`}>
                외형 변경 선택
                <Sparkles size={15} />
              </h3>
              <p className="text-[11px] text-slate-400">
                {targetName}님의 {jobTitle} 승급에 따른 외형을 결정합니다.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
            title="닫기"
          >
            <X size={18} />
          </button>
        </div>

        {/* 본문 안내 및 비교 영역 (모바일 최적화) */}
        <div className="p-4 sm:p-5 overflow-y-auto custom-scrollbar space-y-4 text-xs">
          {/* 안내 배너 */}
          <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800/80 text-center space-y-1">
            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${themeAccent.badge}`}>
              <IconComponent size={12} />
              {jobTitle} 달성
            </span>
            <p className="text-xs text-slate-200 font-semibold pt-1">
              기존 외형을 그대로 유지하거나, 새로 개방된 전용 외형으로 교체할 수 있습니다.
            </p>
            <p className="text-[11px] text-slate-400">
              원하는 외형 카드를 터치하여 선택한 후 하단의 적용 버튼을 눌러주세요.
            </p>
          </div>

          {/* 전후 비교 카드 그리드 (모바일 친화형 2열) */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4 pt-1">
            {/* 카드 1: 기존 외형 유지 */}
            <div
              onClick={() => setSelectedChoice('keep')}
              className={`cursor-pointer rounded-2xl p-3 border transition-all flex flex-col items-center text-center relative ${
                selectedChoice === 'keep'
                  ? 'border-emerald-500 ring-2 ring-emerald-500/40 bg-emerald-950/20 shadow-lg scale-[1.01]'
                  : 'border-slate-800 bg-slate-950/50 hover:border-slate-700 opacity-80 hover:opacity-100'
              }`}
            >
              {/* 선택 체크 뱃지 */}
              {selectedChoice === 'keep' && (
                <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center shadow-md animate-in zoom-in-50">
                  <Check size={14} className="stroke-[3]" />
                </div>
              )}

              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700 mb-2">
                기존 외형
              </span>

              {/* 이미지 컨테이너 */}
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden border border-slate-700 bg-slate-900 shadow-inner flex items-center justify-center shrink-0 mb-2 relative">
                {currentVisualUrl && !currentImgError ? (
                  <img
                    src={currentVisualUrl}
                    alt="기존 외형"
                    onError={() => setCurrentImgError(true)}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-slate-500 gap-1">
                    <User size={32} />
                    <span className="text-[9px]">이미지 없음</span>
                  </div>
                )}
              </div>

              <span className="font-black text-slate-100 text-xs">현재 모습 유지</span>
              <p className="text-[10px] text-slate-400 mt-1 leading-tight">
                지금까지 사용하던 익숙한 모습을 그대로 유지합니다.
              </p>
            </div>

            {/* 카드 2: 새로운 전용 외형 적용 */}
            <div
              onClick={() => setSelectedChoice('change')}
              className={`cursor-pointer rounded-2xl p-3 border transition-all flex flex-col items-center text-center relative ${
                selectedChoice === 'change'
                  ? `${themeAccent.activeBorder} shadow-lg scale-[1.01]`
                  : 'border-slate-800 bg-slate-950/50 hover:border-slate-700 opacity-80 hover:opacity-100'
              }`}
            >
              {/* 선택 체크 뱃지 */}
              {selectedChoice === 'change' && (
                <div className={`absolute top-2 right-2 w-6 h-6 rounded-full bg-gradient-to-r ${themeAccent.btnGrad} text-white flex items-center justify-center shadow-md animate-in zoom-in-50`}>
                  <Check size={14} className="stroke-[3]" />
                </div>
              )}

              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border mb-2 ${themeAccent.badge}`}>
                {isDemonGod ? '마신 외형' : '신의 사자 외형'}
              </span>

              {/* 이미지 컨테이너 */}
              <div className={`w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden border ${themeAccent.border} bg-slate-900 shadow-inner flex items-center justify-center shrink-0 mb-2 relative`}>
                {newVisualUrl && !newImgError ? (
                  <img
                    src={newVisualUrl}
                    alt="새로운 외형"
                    onError={() => setNewImgError(true)}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-slate-500 gap-1">
                    <IconComponent size={32} className={themeAccent.titleColor} />
                    <span className="text-[9px]">전용 일러스트</span>
                  </div>
                )}
              </div>

              <span className={`font-black text-xs ${themeAccent.titleColor}`}>
                {isDemonGod ? '마신 모습 적용' : '신의 사자 적용'}
              </span>
              <p className="text-[10px] text-slate-400 mt-1 leading-tight">
                {isDemonGod
                  ? '마계를 호령하는 마신의 전용 외형으로 변환합니다.'
                  : '신성한 권능을 담은 전용 외형으로 변환합니다.'}
              </p>
            </div>
          </div>
        </div>

        {/* 하단 확인 버튼 영역 */}
        <div className="p-3.5 sm:p-4 bg-slate-950 border-t border-slate-800 flex items-center gap-2 shrink-0">
          <button
            onClick={() => {
              onConfirm(currentVisualUrl);
            }}
            className="flex-1 py-2.5 px-3 rounded-2xl font-bold text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 active:scale-98 transition-all flex items-center justify-center gap-1.5"
          >
            기존 외형 유지
          </button>
          <button
            onClick={handleApply}
            className={`flex-1 py-2.5 px-3 rounded-2xl font-bold text-xs bg-gradient-to-r ${themeAccent.btnGrad} text-white shadow-lg active:scale-98 transition-all flex items-center justify-center gap-1.5`}
          >
            <Check size={15} />
            선택 외형 적용
          </button>
        </div>
      </div>
    </div>
  );
};

export default AppearanceChoiceModal;
