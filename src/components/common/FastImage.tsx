import React, { useState, useEffect } from 'react';
import { isImagePreloaded, preloadImage } from '../../services/imagePreloadService';

interface FastImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
    src: string;
    alt?: string;
    className?: string;
    fallbackIcon?: React.ReactNode;
    skeletonClassName?: string;
}

/**
 * 렉 없이 0ms 즉시 표시 및 깜빡임 방지용 FastImage 컴포넌트
 * - 이미 메모리/로컬에 캐싱된 이미지는 지연 없이 즉시 렌더링
 * - 미캐싱 이미지의 경우 다크 스켈레톤 펄스 후 0.2초 부드러운 페이드인
 * - 로드 실패 시 에러 아이콘/폴백 대응
 */
export const FastImage: React.FC<FastImageProps> = ({
    src,
    alt = '',
    className = '',
    fallbackIcon,
    skeletonClassName = '',
    ...props
}) => {
    // 로컬 에셋(assets/visuals/...)이거나 이미 프리로드된 경우 즉시 완료 상태로 시작
    const isInstant = src ? (src.startsWith('assets/') || src.startsWith('./assets/') || isImagePreloaded(src)) : false;
    const [isLoaded, setIsLoaded] = useState<boolean>(isInstant);
    const [hasError, setHasError] = useState<boolean>(false);

    useEffect(() => {
        if (!src) {
            setIsLoaded(false);
            setHasError(true);
            return;
        }

        const instant = src.startsWith('assets/') || src.startsWith('./assets/') || isImagePreloaded(src);
        if (instant) {
            setIsLoaded(true);
            setHasError(false);
            return;
        }

        setIsLoaded(false);
        setHasError(false);

        let isMounted = true;
        preloadImage(src).then((success) => {
            if (isMounted) {
                if (success) {
                    setIsLoaded(true);
                } else {
                    setHasError(true);
                }
            }
        });

        return () => {
            isMounted = false;
        };
    }, [src]);

    if (!src || hasError) {
        if (fallbackIcon) {
            return <div className={`flex items-center justify-center ${className}`}>{fallbackIcon}</div>;
        }
        return (
            <div className={`bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-600 text-xs ${className}`}>
                <span>🖼️</span>
            </div>
        );
    }

    return (
        <div className="relative inline-block w-full h-full overflow-hidden">
            {/* 스켈레톤 펄스 (로딩 중일 때만 표시) */}
            {!isLoaded && (
                <div 
                    className={`absolute inset-0 bg-slate-800/80 animate-pulse rounded ${skeletonClassName}`} 
                />
            )}

            {/* 실제 이미지: 로드 시 0.2초 페이드인 */}
            <img
                src={src}
                alt={alt}
                loading="eager"
                decoding="async"
                onLoad={() => setIsLoaded(true)}
                onError={() => setHasError(true)}
                className={`
                    transition-opacity duration-200
                    ${isLoaded ? 'opacity-100' : 'opacity-0'}
                    ${className}
                `}
                {...props}
            />
        </div>
    );
};

export default FastImage;
