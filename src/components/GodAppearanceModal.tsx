import React from 'react';
import { Character, Companion, JobType } from '../types';
import { Sparkles, Check, ArrowRight, ShieldCheck, Flame, Crown } from 'lucide-react';
import { getGodTransformedVisualUrl, isGodJob } from '../services/visualManager';

export interface GodAppearanceTarget {
    id: string; // 'player' 또는 companion.id
    name: string;
    job?: JobType;
    gender: string;
    visualUrl?: string;
    originalVisualUrl?: string;
}

interface Props {
    target: GodAppearanceTarget;
    onSelectChoice: (targetId: string, choice: 'original' | 'transformed') => void;
    onClose?: () => void;
}

/**
 * 신의 사자 또는 마신 직업 도달 시 외형을 유지할지 변환할지 선택하는 전후 비교 모달입니다.
 * 모바일 환경에 최적화되어 있습니다.
 */
export const GodAppearanceModal: React.FC<Props> = ({ target, onSelectChoice, onClose }) => {
    const jobName = target.job ? target.job.toString() : '신성 직업';
    const isDemon = target.job === JobType.DEMON_GOD;

    // 변환 전 외형 (기존 외형)
    const beforeVisual = target.originalVisualUrl || target.visualUrl || 'https://picsum.photos/seed/default_hero/400/600';
    
    // 변환 후 외형 (신의 사자/마신 외형)
    const afterVisual = getGodTransformedVisualUrl(target.job, target.gender) || beforeVisual;

    const accentColor = isDemon ? 'border-red-500 shadow-red-950/50' : 'border-amber-500 shadow-amber-950/50';
    const headerBg = isDemon ? 'bg-gradient-to-r from-red-950/80 via-slate-900 to-red-950/80' : 'bg-gradient-to-r from-amber-950/80 via-slate-900 to-amber-950/80';
    const badgeColor = isDemon ? 'bg-red-500/20 text-red-400 border-red-500/30' : 'bg-amber-500/20 text-amber-400 border-amber-500/30';

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-4 overflow-y-auto">
            <div className={`bg-slate-900 border-2 ${accentColor} w-full max-w-xl rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden my-auto flex flex-col animate-in fade-in zoom-in-95 duration-200`}>
                
                {/* 헤더 영역 */}
                <div className={`${headerBg} p-4 sm:p-5 border-b border-slate-800 text-center relative`}>
                    <div className="flex items-center justify-center gap-2 mb-1">
                        {isDemon ? (
                            <Flame size={22} className="text-red-400 animate-pulse" />
                        ) : (
                            <Crown size={22} className="text-amber-400 animate-bounce" />
                        )}
                        <h2 className="text-lg sm:text-xl font-bold text-white tracking-wide">
                            외형 변환 선택
                        </h2>
                        {isDemon ? (
                            <Flame size={22} className="text-red-400 animate-pulse" />
                        ) : (
                            <Sparkles size={22} className="text-amber-400" />
                        )}
                    </div>
                    
                    <div className="inline-block px-3 py-0.5 rounded-full border text-xs font-semibold mt-1 mb-1.5 ${badgeColor}">
                        {jobName}
                    </div>

                    <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-md mx-auto">
                        <span className="font-bold text-white">{target.name}</span>의 직업이 <span className="font-bold text-amber-300">{jobName}</span>에 도달했습니다.
                        <br />
                        새로운 외형으로 변환할지, 아니면 기존 모습을 그대로 유지할지 선택해 주십시오.
                    </p>
                </div>

                {/* 전후 비교 카드 영역 (모바일 최적화: 가로/세로 유연한 배치) */}
                <div className="p-3.5 sm:p-6 grid grid-cols-2 gap-3 sm:gap-5">
                    
                    {/* 카드 1: 변환 전 (기존 외형 유지) */}
                    <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl sm:rounded-2xl p-2.5 sm:p-4 flex flex-col items-center justify-between text-center hover:border-slate-500 transition-all">
                        <div className="w-full mb-2">
                            <span className="inline-block text-[11px] sm:text-xs font-bold text-slate-300 bg-slate-700/60 px-2 py-0.5 rounded-md mb-1.5">
                                변환 전
                            </span>
                            <h3 className="text-xs sm:text-sm font-bold text-slate-200">
                                기존 외형 유지
                            </h3>
                        </div>

                        {/* 이미지 컨테이너 */}
                        <div className="relative w-full aspect-[3/4] max-h-48 sm:max-h-60 rounded-lg sm:rounded-xl overflow-hidden border border-slate-600/80 bg-slate-950 my-1 shadow-inner">
                            <img
                                src={beforeVisual}
                                alt="기존 외형"
                                className="w-full h-full object-cover object-top"
                                onError={(e) => {
                                    (e.target as HTMLImageElement).src = 'https://picsum.photos/seed/default_hero/400/600';
                                }}
                            />
                        </div>

                        <p className="text-[10px] sm:text-xs text-slate-400 mt-2 mb-3 leading-tight min-h-[2.5rem] flex items-center justify-center">
                            현재의 익숙한 본래 모습을 그대로 간직합니다.
                        </p>

                        <button
                            type="button"
                            onClick={() => onSelectChoice(target.id, 'original')}
                            className="w-full py-2.5 sm:py-3 px-3 rounded-lg sm:rounded-xl font-bold text-xs sm:text-sm bg-slate-700 hover:bg-slate-600 active:scale-95 text-slate-100 border border-slate-600 transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                            <ShieldCheck size={16} className="text-slate-300" />
                            <span>기존 외형 유지</span>
                        </button>
                    </div>

                    {/* 카드 2: 변환 후 (새로운 외형으로 변환) */}
                    <div className={`bg-slate-800/80 border ${isDemon ? 'border-red-500/50 hover:border-red-400' : 'border-amber-500/50 hover:border-amber-400'} rounded-xl sm:rounded-2xl p-2.5 sm:p-4 flex flex-col items-center justify-between text-center transition-all shadow-lg`}>
                        <div className="w-full mb-2">
                            <span className={`inline-block text-[11px] sm:text-xs font-bold px-2 py-0.5 rounded-md mb-1.5 ${isDemon ? 'text-red-300 bg-red-950/80' : 'text-amber-300 bg-amber-950/80'}`}>
                                변환 후
                            </span>
                            <h3 className={`text-xs sm:text-sm font-bold ${isDemon ? 'text-red-200' : 'text-amber-200'}`}>
                                새로운 외형
                            </h3>
                        </div>

                        {/* 이미지 컨테이너 */}
                        <div className={`relative w-full aspect-[3/4] max-h-48 sm:max-h-60 rounded-lg sm:rounded-xl overflow-hidden border-2 ${isDemon ? 'border-red-500/80' : 'border-amber-500/80'} bg-slate-950 my-1 shadow-inner`}>
                            <img
                                src={afterVisual}
                                alt="새로운 외형"
                                className="w-full h-full object-cover object-top"
                                onError={(e) => {
                                    (e.target as HTMLImageElement).src = beforeVisual;
                                }}
                            />
                            <div className="absolute top-1.5 right-1.5">
                                <span className="flex h-2.5 w-2.5 relative">
                                    <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isDemon ? 'bg-red-400' : 'bg-amber-400'}`}></span>
                                    <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isDemon ? 'bg-red-500' : 'bg-amber-500'}`}></span>
                                </span>
                            </div>
                        </div>

                        <p className="text-[10px] sm:text-xs text-slate-400 mt-2 mb-3 leading-tight min-h-[2.5rem] flex items-center justify-center">
                            {isDemon ? '마신의 절대적인 위엄을 품은 모습으로 변환합니다.' : '신의 사자로서의 위엄과 권능을 드러내는 모습으로 변환합니다.'}
                        </p>

                        <button
                            type="button"
                            onClick={() => onSelectChoice(target.id, 'transformed')}
                            className={`w-full py-2.5 sm:py-3 px-3 rounded-lg sm:rounded-xl font-bold text-xs sm:text-sm ${isDemon ? 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white' : 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950'} active:scale-95 transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer`}
                        >
                            <Sparkles size={16} />
                            <span>새로운 외형으로 변환</span>
                        </button>
                    </div>

                </div>

                {/* 안내 문구 푸터 */}
                <div className="px-4 py-3 bg-slate-950/60 border-t border-slate-800/80 text-center">
                    <p className="text-[11px] sm:text-xs text-slate-400">
                        * 선택한 외형은 앞으로도 계속 유지됩니다.
                    </p>
                </div>

            </div>
        </div>
    );
};

export default GodAppearanceModal;
