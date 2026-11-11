import React, { useState, useEffect } from 'react';
import { preloadEssentialGameAssets } from '../services/imagePreloadService';
import { Sparkles, Zap } from 'lucide-react';

interface Props {
    onComplete?: () => void;
}

export const InitialAssetPreloader: React.FC<Props> = ({ onComplete }) => {
    const [progress, setProgress] = useState<number>(0);
    const [statusMessage, setStatusMessage] = useState<string>("초고속 그래픽 캐시 초기화 중...");
    const [isVisible, setIsVisible] = useState<boolean>(true);
    const [isFadingOut, setIsFadingOut] = useState<boolean>(false);

    useEffect(() => {
        // 이미 이번 세션에서 프리로드가 끝났다면 초고속 스킵
        if (typeof window !== 'undefined' && sessionStorage.getItem('INITIAL_ASSETS_PRELOADED') === 'true') {
            setIsVisible(false);
            onComplete?.();
            return;
        }

        let isMounted = true;

        preloadEssentialGameAssets((percent, msg) => {
            if (isMounted) {
                setProgress(percent);
                setStatusMessage(msg);
            }
        }).then(() => {
            if (isMounted) {
                if (typeof window !== 'undefined') {
                    sessionStorage.setItem('INITIAL_ASSETS_PRELOADED', 'true');
                }
                // 완료 후 0.3초 대기 후 페이드아웃
                setTimeout(() => {
                    setIsFadingOut(true);
                    setTimeout(() => {
                        setIsVisible(false);
                        onComplete?.();
                    }, 400);
                }, 300);
            }
        });

        return () => {
            isMounted = false;
        };
    }, []);

    if (!isVisible) return null;

    return (
        <div 
            className={`
                fixed inset-0 z-[9999] flex flex-col items-center justify-center 
                bg-slate-950/95 backdrop-blur-md transition-opacity duration-400
                ${isFadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'}
            `}
        >
            <div className="w-80 sm:w-96 p-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col items-center text-center space-y-4">
                <div className="relative">
                    <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-amber-400 animate-pulse">
                        <Zap size={32} />
                    </div>
                    <Sparkles size={16} className="absolute -top-1 -right-1 text-yellow-300 animate-bounce" />
                </div>

                <div className="space-y-1">
                    <h3 className="text-base font-bold text-slate-100 flex items-center justify-center gap-1.5">
                        비주얼 에셋 최적화 가속 중
                    </h3>
                    <p className="text-xs text-slate-400 font-medium">
                        {statusMessage}
                    </p>
                </div>

                {/* 프로그레스 바 */}
                <div className="w-full space-y-1.5">
                    <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800 p-0.5">
                        <div 
                            className="h-full bg-gradient-to-r from-amber-500 to-yellow-300 rounded-full transition-all duration-200 shadow-[0_0_12px_rgba(245,158,11,0.6)]"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                    <div className="flex justify-between items-center text-[11px] font-bold text-slate-500">
                        <span>0ms 즉시 로딩 최적화</span>
                        <span className="text-amber-400">{progress}%</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default InitialAssetPreloader;
