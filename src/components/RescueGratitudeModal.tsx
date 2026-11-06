import React from 'react';
import { Heart, Sparkles, UserCheck, Coins, Gift, CheckCircle2, MapPin, Briefcase, Award } from 'lucide-react';

export interface RescuedPersonInfo {
    name: string;
    gender: string;
    age: string;
    nation: string;
    jobName: string;
    level: number;
    visualUrl: string;
    personality: string;
    appearance: string;
    backgroundStory: string;
    speech: string;
    rewardGold?: number;
    rewardItemName?: string;
    rewardItemDesc?: string;
    rewardItemImageUrl?: string;
    questType: '군대' | '용병';
}

interface RescueGratitudeModalProps {
    rescued: RescuedPersonInfo | null;
    onClose: () => void;
}

export const RescueGratitudeModal: React.FC<RescueGratitudeModalProps> = ({ rescued, onClose }) => {
    if (!rescued) return null;

    return (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-4 overflow-y-auto animate-fadeIn">
            <div className="relative w-full max-w-lg my-auto bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border-2 border-amber-500/50 rounded-2xl shadow-2xl shadow-amber-500/20 overflow-hidden flex flex-col max-h-[92vh]">
                
                {/* 상단 헤더 배너 */}
                <div className="relative bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 px-4 py-3 sm:py-4 text-white flex items-center gap-3 shadow-md">
                    <div className="p-2 sm:p-2.5 bg-black/30 rounded-xl border border-white/20 shadow-inner flex-shrink-0">
                        <Heart className="w-5 h-5 sm:w-6 sm:h-6 text-rose-300 fill-rose-400 animate-pulse" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 text-amber-200 text-xs font-bold tracking-wide">
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>생환의 기적 · 인연의 시작</span>
                        </div>
                        <h3 className="text-base sm:text-lg font-black tracking-tight text-white truncate">
                            던전 실종자 구출 성공
                        </h3>
                    </div>
                </div>

                {/* 본문 스크롤 영역 */}
                <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-slate-200 text-xs sm:text-sm">
                    
                    {/* 인물 프로필 카드 */}
                    <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-3 sm:p-4 flex flex-col sm:flex-row gap-3.5 items-center sm:items-start shadow-inner">
                        <div className="relative flex-shrink-0">
                            <img
                                src={rescued.visualUrl}
                                alt={rescued.name}
                                className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover border-2 border-amber-400 shadow-lg bg-slate-950"
                                onError={(e) => {
                                    // 기본 이미지 폴백
                                    (e.target as HTMLElement).style.display = 'none';
                                }}
                            />
                            <div className="absolute -bottom-2 -right-1 bg-amber-500 text-slate-950 text-[10px] sm:text-xs font-black px-2 py-0.5 rounded-full shadow border border-amber-300">
                                Lv.{rescued.level}
                            </div>
                        </div>

                        <div className="flex-1 min-w-0 text-center sm:text-left space-y-1.5 w-full">
                            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-1.5">
                                <span className="text-base sm:text-lg font-black text-amber-300">
                                    {rescued.name}
                                </span>
                                <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[11px] font-bold px-2 py-0.5 rounded-md">
                                    {rescued.jobName}
                                </span>
                            </div>

                            <div className="grid grid-cols-2 gap-1.5 text-[11px] sm:text-xs text-slate-300 pt-1">
                                <div className="flex items-center gap-1">
                                    <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                                    <span>직업: <strong className="text-white">{rescued.jobName}</strong></span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                                    <span>출신: <strong className="text-white">{rescued.nation}</strong></span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <span className="text-slate-400">나이:</span>
                                    <strong className="text-white">{rescued.age} ({rescued.gender})</strong>
                                </div>
                                <div className="flex items-center gap-1">
                                    <Heart className="w-3.5 h-3.5 text-rose-400" />
                                    <span>관계: <strong className="text-rose-300">은인 (호감도 80)</strong></span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 조난 사연 상자 */}
                    <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 sm:p-3.5 space-y-1">
                        <div className="text-[11px] font-bold text-amber-400/90 flex items-center gap-1">
                            <Award className="w-3.5 h-3.5" />
                            <span>조난 경위</span>
                        </div>
                        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                            {rescued.backgroundStory}
                        </p>
                    </div>

                    {/* 실종자의 눈물의 감사 인사 (따옴표 말풍선) */}
                    <div className="relative bg-gradient-to-br from-amber-950/40 via-slate-900 to-amber-950/20 border-2 border-amber-500/40 rounded-xl p-3.5 sm:p-4 shadow-md">
                        <div className="text-amber-400 font-black text-xs sm:text-sm mb-1.5 flex items-center gap-1.5">
                            <Heart className="w-4 h-4 text-rose-400 fill-rose-400" />
                            <span>{rescued.name}의 감사 인사</span>
                        </div>
                        <blockquote className="text-xs sm:text-sm text-amber-100 font-medium leading-relaxed italic bg-black/30 rounded-lg p-3 border border-amber-500/20">
                            "{rescued.speech}"
                        </blockquote>
                    </div>

                    {/* 은혜의 보답 및 결실 */}
                    <div className="bg-emerald-950/30 border border-emerald-500/30 rounded-xl p-3 sm:p-3.5 space-y-2">
                        <div className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                            <Gift className="w-4 h-4 text-emerald-300" />
                            <span>구출의 보답 및 결실</span>
                        </div>

                        <div className="space-y-1.5 text-xs text-slate-200">
                            {rescued.rewardGold ? (
                                <div className="flex items-center justify-between bg-black/30 px-2.5 py-1.5 rounded-lg border border-emerald-500/20">
                                    <span className="flex items-center gap-1.5 text-amber-300 font-bold">
                                        <Coins className="w-3.5 h-3.5 text-amber-400" />
                                        감사의 사례금
                                    </span>
                                    <span className="text-emerald-300 font-black">
                                        +{rescued.rewardGold.toLocaleString()} 골드
                                    </span>
                                </div>
                            ) : null}

                            {rescued.rewardItemName ? (
                                <div className="flex items-center justify-between bg-black/30 p-2.5 rounded-lg border border-emerald-500/20 gap-2">
                                    <div className="flex items-center gap-2.5 min-w-0">
                                        {rescued.rewardItemImageUrl ? (
                                            <img 
                                                src={rescued.rewardItemImageUrl} 
                                                alt={rescued.rewardItemName} 
                                                className="w-9 h-9 rounded-lg object-cover border border-purple-400/50 bg-slate-900 shrink-0" 
                                            />
                                        ) : (
                                            <div className="w-9 h-9 rounded-lg bg-purple-950/60 border border-purple-500/40 flex items-center justify-center shrink-0">
                                                <Gift className="w-4 h-4 text-purple-400" />
                                            </div>
                                        )}
                                        <div className="min-w-0">
                                            <div className="text-amber-300 font-bold text-xs truncate">
                                                {rescued.rewardItemName}
                                            </div>
                                            {rescued.rewardItemDesc ? (
                                                <div className="text-[11px] text-slate-400 truncate">
                                                    {rescued.rewardItemDesc}
                                                </div>
                                            ) : null}
                                        </div>
                                    </div>
                                    <span className="text-emerald-300 font-bold text-[11px] shrink-0 bg-emerald-950/80 px-2 py-1 rounded-md border border-emerald-500/30">
                                        가방 지급 완료
                                    </span>
                                </div>
                            ) : null}

                            <div className="flex items-center gap-1.5 text-emerald-200 bg-black/20 px-2.5 py-1.5 rounded-lg">
                                <UserCheck className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                                <span>인맥에 <strong>과거의 인연</strong>으로 영구 등록되어 추후 교류할 수 있습니다.</span>
                            </div>

                            <div className="flex items-center gap-1.5 text-amber-200 bg-black/20 px-2.5 py-1.5 rounded-lg">
                                <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                                <span>{rescued.questType === '군대' ? '군대' : '용병 길드'} 실종자 수색 의뢰 목표를 완수했습니다!</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 하단 닫기/확인 버튼 */}
                <div className="p-3 sm:p-4 bg-slate-950 border-t border-slate-800 flex justify-end">
                    <button
                        onClick={onClose}
                        className="w-full py-3 px-4 bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 hover:from-amber-500 hover:to-amber-500 text-slate-950 font-black text-sm sm:text-base rounded-xl shadow-lg shadow-amber-500/30 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                    >
                        <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-slate-950" />
                        <span>생환 확인 및 안도하기</span>
                    </button>
                </div>

            </div>
        </div>
    );
};
