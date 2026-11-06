import React, { useState, useEffect, useRef } from 'react';
import { 
    Grid, Sparkles, Sliders, Play, Check, X, RefreshCw, Layers, Zap, Eye, Pipette
} from 'lucide-react';
import { SkillAnimationFrame } from '../types';
import { processImageTransparency } from './SkillFrameAnimationEditor';

interface SpriteSheetModalProps {
    isOpen: boolean;
    onClose: () => void;
    onApplyFrames: (frames: SkillAnimationFrame[]) => void;
    showToast: (msg: string, type?: 'success' | 'warning' | 'info') => void;
}

export const SpriteSheetModal: React.FC<SpriteSheetModalProps> = ({
    isOpen,
    onClose,
    onApplyFrames,
    showToast
}) => {
    const [imageUrl, setImageUrl] = useState<string>('');
    const [cols, setCols] = useState<number>(4);
    const [rows, setRows] = useState<number>(4);
    const [totalFrames, setTotalFrames] = useState<number>(16);
    const [frameDuration, setFrameDuration] = useState<number>(35);
    const [scale, setScale] = useState<number>(1.2);
    const [blendMode, setBlendMode] = useState<'screen' | 'lighten' | 'normal' | 'overlay'>('screen');
    
    // 자동 배경 투명화 옵션
    const [autoRemoveBg, setAutoRemoveBg] = useState<boolean>(true);
    const [bgMode, setBgMode] = useState<'black' | 'auto' | 'white' | 'green' | 'custom'>('black');
    const [bgCustomColor, setBgCustomColor] = useState<string>('#000000');
    const [bgTolerance, setBgTolerance] = useState<number>(35);

    // 추가 테두리 색상 제거 옵션
    const [removeBorder, setRemoveBorder] = useState<boolean>(false);
    const [borderColor, setBorderColor] = useState<string>('#000000');
    const [borderTolerance, setBorderTolerance] = useState<number>(20);

    // 스마트 이펙트 그림 감지 및 위치 정렬 모드 옵션
    // 8x8 등 고프레임 시트의 중심축 흔들림(Jitter) 방지를 위해 기본값을 'none'(원본 중심 유지)으로 설정
    const [alignMode, setAlignMode] = useState<'center' | 'right_head' | 'left_head' | 'none'>('none');

    // 스마트 이동 궤적 모드 옵션
    // 제자리 폭발/참격 시트가 끊기지 않도록 기본값을 'fixed'(고정)로 설정
    const [motionMode, setMotionMode] = useState<'auto_forward' | 'sprite_head' | 'fixed'>('fixed');

    // 슬라이싱된 프레임 객체 미리보기 (URL 및 x, y 이동 오프셋 좌표 포함)
    interface SlicedFrameItem {
        url: string;
        offsetX: number;
        offsetY: number;
    }
    const [slicedFrames, setSlicedFrames] = useState<SlicedFrameItem[]>([]);
    const [previewIndex, setPreviewIndex] = useState<number>(0);
    const [isProcessing, setIsProcessing] = useState<boolean>(false);
    const [isPlaying, setIsPlaying] = useState<boolean>(true);

    const fileInputRef = useRef<HTMLInputElement | null>(null);

    const [eyedropperTarget, setEyedropperTarget] = useState<'bg' | 'border' | null>(null);
    const sourceImageRef = useRef<HTMLImageElement | null>(null);

    const handleImageClick = (e: React.MouseEvent<HTMLImageElement>) => {
        if (!eyedropperTarget || !sourceImageRef.current) return;

        const img = sourceImageRef.current;
        const rect = img.getBoundingClientRect();
        
        // 클릭한 상대적 위치 비율 계산
        const clickX = e.clientX - rect.left;
        const clickY = e.clientY - rect.top;
        
        const scaleX = img.naturalWidth / rect.width;
        const scaleY = img.naturalHeight / rect.height;
        
        const originalX = Math.floor(clickX * scaleX);
        const originalY = Math.floor(clickY * scaleY);

        // 가상 캔버스에 이미지를 그려 픽셀값 추출
        try {
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = img.naturalWidth;
            tempCanvas.height = img.naturalHeight;
            const tempCtx = tempCanvas.getContext('2d');
            if (tempCtx) {
                tempCtx.drawImage(img, 0, 0);
                const pixel = tempCtx.getImageData(originalX, originalY, 1, 1).data;
                const r = pixel[0];
                const g = pixel[1];
                const b = pixel[2];
                
                // RGB를 Hex 코드로 변환
                const rgbToHex = (rNum: number, gNum: number, bNum: number) => {
                    const toHex = (c: number) => {
                        const hex = c.toString(16);
                        return hex.length === 1 ? '0' + hex : hex;
                    };
                    return '#' + toHex(rNum) + toHex(gNum) + toHex(bNum);
                };
                
                const hexColor = rgbToHex(r, g, b);
                if (eyedropperTarget === 'bg') {
                    setBgCustomColor(hexColor);
                    setBgMode('custom');
                    showToast(`배경 제거 색상 추출 완료: ${hexColor}`, 'success');
                } else {
                    setBorderColor(hexColor);
                    setRemoveBorder(true);
                    showToast(`테두리 제거 색상 추출 완료: ${hexColor}`, 'success');
                }
                setEyedropperTarget(null); // 추출 완료 후 해제
            }
        } catch (err) {
            console.error('색상 추출 실패:', err);
            showToast('보안 제한(CORS)으로 인해 이 외부 이미지에서 직접 색상을 추출할 수 없습니다. 대신 내 기기에서 업로드한 이미지이거나 색상 코드를 직접 입력해 주세요.', 'warning');
        }
    };

    // 이미지 내 불투명 그림 영역을 감지하여 스마트 정렬 배치해 주는 함수 (캔버스 및 그림 좌표 반환)
    const smartAlignImageCanvas = (
        sourceCtx: CanvasRenderingContext2D,
        width: number,
        height: number,
        mode: 'center' | 'right_head' | 'left_head' | 'none'
    ): { canvas: HTMLCanvasElement; maxX: number; minX: number } => {
        if (mode === 'none') return { canvas: sourceCtx.canvas, maxX: width, minX: 0 };

        const imgData = sourceCtx.getImageData(0, 0, width, height);
        const data = imgData.data;

        let minX = width, maxX = -1, minY = height, maxY = -1;
        let count = 0;

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const alpha = data[(y * width + x) * 4 + 3];
                if (alpha > 15) { // 유효한 불투명 그림 픽셀 감지
                    if (x < minX) minX = x;
                    if (x > maxX) maxX = x;
                    if (y < minY) minY = y;
                    if (y > maxY) maxY = y;
                    count++;
                }
            }
        }

        // 유효한 이펙트 그림이 존재하는 경우 정렬 수행
        if (count > 0 && maxX >= minX && maxY >= minY) {
            const cropW = maxX - minX + 1;
            const cropH = maxY - minY + 1;

            const outCanvas = document.createElement('canvas');
            outCanvas.width = width;
            outCanvas.height = height;
            const outCtx = outCanvas.getContext('2d');
            if (!outCtx) return { canvas: sourceCtx.canvas, maxX, minX };

            let destX = Math.floor((width - cropW) / 2);
            let destY = Math.floor((height - cropH) / 2);

            if (mode === 'right_head') {
                // 오른쪽 창날 선두 기준: 불꽃 꼬리가 길어져도 창날 지점(우측) 고정
                const targetRight = Math.floor(width * 0.82);
                destX = targetRight - cropW;
            } else if (mode === 'left_head') {
                // 왼쪽 창날 선두 기준: 좌측 창날 지점 고정
                const targetLeft = Math.floor(width * 0.18);
                destX = targetLeft;
            }

            outCtx.drawImage(
                sourceCtx.canvas,
                minX, minY, cropW, cropH,
                destX, destY, cropW, cropH
            );
            return { canvas: outCanvas, maxX, minX };
        }

        return { canvas: sourceCtx.canvas, maxX: width, minX: 0 };
    };

    // Cols x Rows 변경 시 총 프레임 수 및 권장 60FPS 재생 속도 자동 동기화
    useEffect(() => {
        const count = cols * rows;
        setTotalFrames(count);
        if (count >= 36) {
            setFrameDuration(20); // 6x6, 8x8(64프레임) 등 고밀도 시트는 20ms(약 50~60fps)로 부드럽게 재생
        } else if (count >= 16) {
            setFrameDuration(32); // 4x4(16프레임) 이상은 32ms 권장
        } else {
            setFrameDuration(60);
        }
    }, [cols, rows]);

    // 스프라이트 시트 분할 슬라이싱
    const handleSliceSpriteSheet = async () => {
        if (!imageUrl.trim()) {
            showToast('스프라이트 시트 이미지 URL을 입력하거나 파일을 업로드하세요.', 'warning');
            return;
        }

        setIsProcessing(true);
        try {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            
            await new Promise((resolve, reject) => {
                img.onload = resolve;
                img.onerror = () => reject(new Error('이미지를 불러올 수 없습니다. URL이나 파일 경로를 확인하세요.'));
                img.src = imageUrl.trim();
            });

            const naturalW = img.naturalWidth || img.width;
            const naturalH = img.naturalHeight || img.height;

            if (!naturalW || !naturalH) {
                throw new Error('이미지 크기 정보를 가져올 수 없습니다.');
            }

            const cellW = naturalW / cols;
            const cellH = naturalH / rows;
            const framesOut: string[] = [];

            const countToExtract = Math.min(totalFrames, cols * rows);
            const rawFramesOut: { url: string; maxX: number; minX: number }[] = [];

            // 고프레임(8x8 등) 시트 메모리 폭주 방지를 위해 개별 셀 최대 해상도를 240px로 경량화
            const maxCellDim = countToExtract >= 32 ? 220 : 280;
            const scaleRatio = Math.min(1, maxCellDim / Math.max(1, cellW, cellH));
            const outW = Math.max(1, Math.floor(cellW * scaleRatio));
            const outH = Math.max(1, Math.floor(cellH * scaleRatio));

            for (let i = 0; i < countToExtract; i++) {
                const c = i % cols;
                const r = Math.floor(i / cols);

                const canvas = document.createElement('canvas');
                canvas.width = outW;
                canvas.height = outH;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.drawImage(
                        img,
                        c * cellW,
                        r * cellH,
                        cellW,
                        cellH,
                        0,
                        0,
                        canvas.width,
                        canvas.height
                    );
                    let frameDataUrl = canvas.toDataURL('image/png');
                    let frameMaxX = canvas.width;
                    let frameMinX = 0;

                    // 배경 투명화 적용 여부
                    if (autoRemoveBg) {
                        frameDataUrl = await processImageTransparency(
                            frameDataUrl, 
                            bgMode, 
                            bgCustomColor, 
                            bgTolerance,
                            removeBorder,
                            borderColor,
                            borderTolerance
                        );
                    }

                    // 스마트 그림 감지 및 위치 정렬 적용
                    if (alignMode !== 'none') {
                        const tempImg = new Image();
                        tempImg.crossOrigin = 'anonymous';
                        await new Promise((res) => {
                            tempImg.onload = res;
                            tempImg.onerror = res;
                            tempImg.src = frameDataUrl;
                        });

                        const centeredCanvas = document.createElement('canvas');
                        centeredCanvas.width = canvas.width;
                        centeredCanvas.height = canvas.height;
                        const centeredCtx = centeredCanvas.getContext('2d');
                        if (centeredCtx) {
                            centeredCtx.drawImage(tempImg, 0, 0);
                            const alignRes = smartAlignImageCanvas(centeredCtx, centeredCanvas.width, centeredCanvas.height, alignMode);
                            frameDataUrl = alignRes.canvas.toDataURL('image/png');
                            frameMaxX = alignRes.maxX;
                            frameMinX = alignRes.minX;
                        }
                    }

                    rawFramesOut.push({ url: frameDataUrl, maxX: frameMaxX, minX: frameMinX });
                }
            }

            // 프레임별 스마트 x, y 이동 오프셋 자동 계산
            const slicedFrameItems: SlicedFrameItem[] = rawFramesOut.map((item, idx) => {
                let offX = 0;
                let offY = 0;

                if (motionMode === 'auto_forward') {
                    // 스마트 투사체 전진: 날아가는 최초 65% 구간 동안 -140px에서 타격점(0px)까지 전진
                    const flyRatio = 0.65;
                    const flyFrames = Math.max(1, Math.floor(countToExtract * flyRatio));

                    if (idx < flyFrames) {
                        const progress = idx / flyFrames; // 0.0 ~ 1.0
                        offX = Math.round(-140 + progress * 140);
                    } else {
                        offX = 0;
                    }
                } else if (motionMode === 'sprite_head') {
                    // 실제 창날/선두 위치 추적 오프셋
                    const firstHeadX = rawFramesOut[0]?.maxX || 0;
                    if (item.maxX > 0 && firstHeadX > 0) {
                        offX = Math.round((item.maxX - firstHeadX) * 0.8);
                    }
                }

                return {
                    url: item.url,
                    offsetX: offX,
                    offsetY: offY
                };
            });

            setSlicedFrames(slicedFrameItems);
            setPreviewIndex(0);
            setIsProcessing(false);
            showToast(`${slicedFrameItems.length}개 프레임이 스마트 이동 오프셋과 함께 성공적으로 추출되었습니다!`, 'success');
        } catch (err: any) {
            setIsProcessing(false);
            showToast(err.message || '스프라이트 시트 분할 중 오류가 발생했습니다.', 'warning');
        }
    };

    // 로컬 파일 업로드
    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            showToast('이미지 파일(PNG, JPG, WebP)만 업로드할 수 있습니다.', 'warning');
            return;
        }

        const reader = new FileReader();
        reader.onload = (ev) => {
            const result = ev.target?.result as string;
            if (result) {
                setImageUrl(result);
            }
        };
        reader.readAsDataURL(file);
    };

    // 애니메이션 미리보기 타이머
    useEffect(() => {
        if (!isOpen || slicedFrames.length === 0 || !isPlaying) return;
        const timer = setInterval(() => {
            setPreviewIndex((prev) => (prev + 1) % slicedFrames.length);
        }, Math.max(1, frameDuration));

        return () => clearInterval(timer);
    }, [isOpen, slicedFrames, frameDuration, isPlaying]);

    // 슬라이싱된 프레임을 실제 에디터에 적용
    const handleApply = () => {
        if (slicedFrames.length === 0) {
            showToast('먼저 [스프라이트 분할 실행]을 클릭하여 프레임을 생성하세요.', 'warning');
            return;
        }

        const newAnimFrames: SkillAnimationFrame[] = slicedFrames.map((item, idx) => ({
            id: `frame_sprite_${Date.now()}_${idx}`,
            imageUrl: item.url,
            x: item.offsetX,
            y: item.offsetY,
            width: 240,
            height: 240,
            scale: scale,
            rotation: 0,
            opacity: 1,
            duration: frameDuration,
            blendMode: blendMode
        }));

        onApplyFrames(newAnimFrames);
        onClose();
        showToast(`스프라이트 시트에서 ${newAnimFrames.length}개의 프레임을 성공적으로 생성했습니다!`, 'success');
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[300] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-2.5 sm:p-4 overflow-y-auto">
            <div className="w-full max-w-2xl rounded-2xl bg-slate-900 border border-indigo-500/50 p-4 sm:p-5 shadow-2xl space-y-4 my-auto max-h-[95vh] overflow-y-auto custom-scrollbar">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-indigo-950/80 border border-indigo-500/50 flex items-center justify-center text-indigo-400">
                            <Grid size={18} />
                        </div>
                        <div>
                            <h4 className="text-sm sm:text-base font-bold text-white flex items-center gap-1.5">
                                <span>스프라이트 시트 일괄 슬라이싱</span>
                                <span className="px-1.5 py-0.5 rounded bg-indigo-950 text-indigo-300 text-[10px] font-bold border border-indigo-800">1장으로 완성</span>
                            </h4>
                            <p className="text-[11px] text-slate-400">
                                1장의 스프라이트 시트 이미지에서 프레임을 자동으로 분할하여 초고속으로 애니메이션을 완성합니다.
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* Input Section */}
                <div className="space-y-3">
                    <div>
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-xs font-bold text-slate-300">스프라이트 이미지 링크 또는 파일</span>
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[11px] font-bold text-indigo-300 border border-slate-700"
                            >
                                내 기기에서 업로드
                            </button>
                            <input
                                type="file"
                                ref={fileInputRef}
                                accept="image/*"
                                onChange={handleFileUpload}
                                className="hidden"
                            />
                        </div>
                        <input
                            type="text"
                            placeholder="https://... 스프라이트 시트 이미지 URL을 입력하세요"
                            value={imageUrl}
                            onChange={(e) => setImageUrl(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 font-mono"
                        />
                    </div>

                    {/* 원본 스프라이트 시트 미리보기 및 색상 추출 */}
                    {imageUrl.trim() && (
                        <div className="space-y-1.5 p-3 rounded-xl bg-slate-950/70 border border-slate-800/80">
                            <div className="flex items-center justify-between">
                                <span className="text-[11px] text-slate-400 font-bold flex items-center gap-1">
                                    <Eye size={12} className="text-indigo-400" />
                                    <span>원본 스프라이트 시트 (클릭하여 색상 추출 가능)</span>
                                </span>
                                <div className="flex items-center gap-1.5">
                                    <button
                                        type="button"
                                        onClick={() => setEyedropperTarget(eyedropperTarget === 'bg' ? null : 'bg')}
                                        className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-all flex items-center gap-1 ${
                                            eyedropperTarget === 'bg'
                                                ? 'bg-emerald-600 border-emerald-400 text-white animate-pulse'
                                                : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300'
                                        }`}
                                    >
                                        <Pipette size={11} className={eyedropperTarget === 'bg' ? 'text-white' : 'text-emerald-400'} />
                                        <span>{eyedropperTarget === 'bg' ? '배경 추출 중' : '배경색 추출'}</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setEyedropperTarget(eyedropperTarget === 'border' ? null : 'border')}
                                        className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-all flex items-center gap-1 ${
                                            eyedropperTarget === 'border'
                                                ? 'bg-indigo-600 border-indigo-400 text-white animate-pulse'
                                                : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300'
                                        }`}
                                    >
                                        <Pipette size={11} className={eyedropperTarget === 'border' ? 'text-white' : 'text-indigo-400'} />
                                        <span>{eyedropperTarget === 'border' ? '테두리 추출 중' : '테두리색 추출'}</span>
                                    </button>
                                </div>
                            </div>
                            
                            <div 
                                className={`relative w-full max-h-40 overflow-auto rounded-lg border bg-slate-950/90 flex items-center justify-center p-2 select-none transition-all ${
                                    eyedropperTarget ? 'border-indigo-500 shadow-[0_0_12px_rgba(99,102,241,0.2)]' : 'border-slate-800'
                                }`}
                                style={{ cursor: eyedropperTarget ? 'crosshair' : 'default' }}
                            >
                                <img
                                    ref={sourceImageRef}
                                    src={imageUrl}
                                    alt="원본 스프라이트"
                                    onClick={handleImageClick}
                                    className={`max-h-32 object-contain transition-all ${
                                        eyedropperTarget ? 'opacity-90 hover:brightness-110' : ''
                                    }`}
                                    referrerPolicy="no-referrer"
                                    crossOrigin="anonymous"
                                />
                            </div>
                            {eyedropperTarget && (
                                <p className="text-[10px] text-indigo-400 font-medium">
                                    💡 이미지 영역 내부에서 추출하고 싶은 {eyedropperTarget === 'bg' ? '배경' : '격자선이나 테두리'} 부분을 클릭하면 색상을 자동 감지합니다.
                                </p>
                            )}
                        </div>
                    )}

                    {/* Grid Slicing Controls */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-950/70 p-3 rounded-xl border border-slate-800/80">
                        <div className="space-y-1">
                            <span className="text-[11px] text-slate-400 font-bold">가로 칸 수 (Cols)</span>
                            <input
                                type="number"
                                min={1}
                                max={32}
                                value={cols}
                                onChange={(e) => setCols(Math.max(1, parseInt(e.target.value) || 1))}
                                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white font-bold"
                            />
                        </div>

                        <div className="space-y-1">
                            <span className="text-[11px] text-slate-400 font-bold">세로 줄 수 (Rows)</span>
                            <input
                                type="number"
                                min={1}
                                max={32}
                                value={rows}
                                onChange={(e) => setRows(Math.max(1, parseInt(e.target.value) || 1))}
                                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white font-bold"
                            />
                        </div>

                        <div className="space-y-1">
                            <span className="text-[11px] text-slate-400 font-bold">총 프레임 수</span>
                            <input
                                type="number"
                                min={1}
                                max={cols * rows}
                                value={totalFrames}
                                onChange={(e) => setTotalFrames(Math.max(1, Math.min(cols * rows, parseInt(e.target.value) || 1)))}
                                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-indigo-300 font-bold"
                            />
                        </div>

                        <div className="space-y-1">
                            <span className="text-[11px] text-slate-400 font-bold">프레임 속도 (ms)</span>
                            <input
                                type="number"
                                min={1}
                                max={1000}
                                step={5}
                                value={frameDuration}
                                onChange={(e) => setFrameDuration(Math.max(1, parseInt(e.target.value) || 1))}
                                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-amber-300 font-bold"
                            />
                        </div>
                    </div>

                    {/* Auto Background Removal & Style Settings */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-slate-950/70 p-3 rounded-xl border border-slate-800/80 text-xs">
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <label className="flex items-center gap-1.5 cursor-pointer font-bold text-slate-300">
                                    <input
                                        type="checkbox"
                                        checked={autoRemoveBg}
                                        onChange={(e) => setAutoRemoveBg(e.target.checked)}
                                        className="rounded bg-slate-800 border-slate-700 text-indigo-600 focus:ring-0"
                                    />
                                    <span>자동 배경 투명화</span>
                                </label>
                                <select
                                    disabled={!autoRemoveBg}
                                    value={bgMode}
                                    onChange={(e) => setBgMode(e.target.value as any)}
                                    className="bg-slate-900 border border-slate-800 rounded px-2 py-1 text-[11px] text-slate-300 disabled:opacity-50 font-medium"
                                >
                                    <option value="black">검은색 배경 제거</option>
                                    <option value="white">흰색 배경 제거</option>
                                    <option value="green">초록색 크로마키</option>
                                    <option value="auto">좌상단 모서리색 자동</option>
                                    <option value="custom">직접 지정색 제거</option>
                                </select>
                            </div>

                            {autoRemoveBg && bgMode === 'custom' && (
                                <div className="flex items-center justify-between p-1.5 rounded bg-slate-900/40 border border-slate-800/50">
                                    <span className="text-[10px] text-slate-400">지정 배경색</span>
                                    <div className="flex items-center gap-1.5">
                                        <input
                                            type="color"
                                            value={bgCustomColor}
                                            onChange={(e) => setBgCustomColor(e.target.value)}
                                            className="w-5 h-5 rounded border border-slate-800 bg-transparent cursor-pointer"
                                        />
                                        <input
                                            type="text"
                                            value={bgCustomColor}
                                            onChange={(e) => setBgCustomColor(e.target.value)}
                                            className="w-16 bg-slate-950 border border-slate-800 rounded px-1 py-0.5 text-[10px] text-slate-300 font-mono"
                                        />
                                    </div>
                                </div>
                            )}
                            
                            {autoRemoveBg && (
                                <div className="space-y-1">
                                    <div className="flex justify-between text-[10px] text-slate-400">
                                        <span>투명화 허용 강도: {bgTolerance}%</span>
                                    </div>
                                    <input
                                        type="range"
                                        min={5}
                                        max={70}
                                        value={bgTolerance}
                                        onChange={(e) => setBgTolerance(Number(e.target.value))}
                                        className="w-full accent-indigo-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                                    />
                                </div>
                            )}

                            {/* 추가 테두리 색상 제거 옵션 */}
                            <div className="pt-2 border-t border-slate-900/80 space-y-2">
                                <div className="flex items-center justify-between">
                                    <label className="flex items-center gap-1.5 cursor-pointer font-bold text-slate-300">
                                        <input
                                            type="checkbox"
                                            checked={removeBorder}
                                            onChange={(e) => setRemoveBorder(e.target.checked)}
                                            className="rounded bg-slate-800 border-slate-700 text-indigo-600 focus:ring-0"
                                        />
                                        <span>추가 테두리 색상 제거</span>
                                    </label>
                                    <div className="flex items-center gap-1">
                                        <input
                                            type="color"
                                            value={borderColor}
                                            onChange={(e) => setBorderColor(e.target.value)}
                                            disabled={!removeBorder}
                                            className="w-5 h-5 rounded border border-slate-800 bg-transparent cursor-pointer disabled:opacity-50"
                                        />
                                        <input
                                            type="text"
                                            value={borderColor}
                                            onChange={(e) => setBorderColor(e.target.value)}
                                            disabled={!removeBorder}
                                            className="w-14 bg-slate-900 border border-slate-800 rounded px-1 py-0.5 text-[10px] text-slate-300 disabled:opacity-50 font-mono"
                                        />
                                    </div>
                                </div>
                                {removeBorder && (
                                    <div className="space-y-1">
                                        <div className="flex justify-between text-[10px] text-slate-400">
                                            <span>테두리 제거 허용 강도: {borderTolerance}%</span>
                                        </div>
                                        <input
                                            type="range"
                                            min={5}
                                            max={70}
                                            value={borderTolerance}
                                            onChange={(e) => setBorderTolerance(Number(e.target.value))}
                                            className="w-full accent-indigo-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                                        />
                                    </div>
                                )}
                            </div>

                            {/* 스마트 위치 정렬 보정 모드 */}
                            <div className="pt-2 border-t border-slate-900/80 space-y-1">
                                <div className="flex items-center justify-between">
                                    <span className="font-bold text-slate-300 text-xs">스마트 위치 정렬 보정</span>
                                    <span className="text-[10px] text-indigo-400 font-mono">자동 위치 보정</span>
                                </div>
                                <select
                                    value={alignMode}
                                    onChange={(e) => setAlignMode(e.target.value as any)}
                                    className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1.5 text-xs text-indigo-200 font-bold focus:outline-none focus:border-indigo-500"
                                >
                                    <option value="right_head">우측 창날 선두 기준 (불꽃창, 화살, 날아가는 투사체)</option>
                                    <option value="left_head">좌측 창날 선두 기준 (왼쪽 이동 투사체)</option>
                                    <option value="center">정중앙 배치 (폭발, 마법진, 구형 이펙트)</option>
                                    <option value="none">원본 위치 유지 (스프라이트 고정 좌표)</option>
                                </select>
                                <p className="text-[10px] text-slate-500 leading-tight">
                                    {alignMode === 'right_head' && '불꽃 꼬리가 길어져도 우측 창날 위치를 일정하게 고정하여 창이 뒤로 물러나지 않습니다.'}
                                    {alignMode === 'left_head' && '좌측 선두 끝부분을 기준으로 고정하여 슬라이스합니다.'}
                                    {alignMode === 'center' && '이펙트 그림의 가로/세로 중앙에 맞춰 캔버스 한가운데로 정렬합니다.'}
                                    {alignMode === 'none' && '스프라이트 시트 원본의 픽셀 위치 좌표를 변경하지 않고 그대로 사용합니다.'}
                                </p>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="font-bold text-slate-300">합성 방식</span>
                                <select
                                    value={blendMode}
                                    onChange={(e) => setBlendMode(e.target.value as any)}
                                    className="bg-slate-900 border border-slate-800 rounded px-2 py-1 text-[11px] text-indigo-300 font-bold"
                                >
                                    <option value="screen">스크린 빛남</option>
                                    <option value="lighten">밝게</option>
                                    <option value="overlay">오버레이</option>
                                    <option value="normal">기본</option>
                                </select>
                            </div>

                            <div className="flex items-center justify-between">
                                <span className="font-bold text-slate-300">기본 배율: {scale}배</span>
                                <input
                                    type="range"
                                    min={0.5}
                                    max={2.5}
                                    step={0.1}
                                    value={scale}
                                    onChange={(e) => setScale(Number(e.target.value))}
                                    className="w-28 accent-indigo-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                                />
                            </div>

                            {/* 스마트 이동 궤적 시스템 */}
                            <div className="pt-2 border-t border-slate-900/80 space-y-1">
                                <div className="flex items-center justify-between">
                                    <span className="font-bold text-slate-300 text-xs">스마트 이동 궤적 모션</span>
                                    <span className="text-[10px] text-amber-400 font-mono">자동 전진 계산</span>
                                </div>
                                <select
                                    value={motionMode}
                                    onChange={(e) => setMotionMode(e.target.value as any)}
                                    className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1.5 text-xs text-amber-200 font-bold focus:outline-none focus:border-amber-500"
                                >
                                    <option value="auto_forward">스마트 투사체 전진 (날아가는 궤적 자동 계산)</option>
                                    <option value="sprite_head">실제 창날 이동 추적 (픽셀 이동량 좌표 계산)</option>
                                    <option value="fixed">제자리 위치 고정 (이동 없이 동일 위치)</option>
                                </select>
                                <p className="text-[10px] text-slate-500 leading-tight">
                                    {motionMode === 'auto_forward' && '프레임 순서에 맞춰 투사체가 출발점에서 타격점까지 부드럽게 날아가도록 프레임별 이동 좌표를 자동 부여합니다.'}
                                    {motionMode === 'sprite_head' && '스프라이트 시트 안에서 이동하는 창날의 실제 픽셀 변화를 추적하여 상대 좌표를 자동 계산합니다.'}
                                    {motionMode === 'fixed' && '모든 프레임이 동일한 화면 중심 위치(0, 0)에서 재생됩니다.'}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Slicing Button */}
                    <button
                        onClick={handleSliceSpriteSheet}
                        disabled={!imageUrl.trim() || isProcessing}
                        className="w-full py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 text-white font-bold text-xs shadow-lg flex items-center justify-center gap-2 transition-all"
                    >
                        {isProcessing ? (
                            <>
                                <RefreshCw size={14} className="animate-spin" />
                                <span>스프라이트 슬라이싱 및 프레임 생성 중...</span>
                            </>
                        ) : (
                            <>
                                <Grid size={14} />
                                <span>스프라이트 분할 및 프레임 추출 실행 ({cols}×{rows} = {totalFrames}개)</span>
                            </>
                        )}
                    </button>
                </div>

                {/* Sliced Frames & Animation Preview */}
                {slicedFrames.length > 0 && (
                    <div className="space-y-2 pt-2 border-t border-slate-800">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                                <Sparkles size={13} />
                                <span>추출된 애니메이션 실시간 재생 (#{previewIndex + 1}/{slicedFrames.length})</span>
                            </span>
                            <button
                                onClick={() => setIsPlaying(!isPlaying)}
                                className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[11px] text-slate-300 flex items-center gap-1"
                            >
                                <Play size={11} />
                                <span>{isPlaying ? '일시정지' : '재생'}</span>
                            </button>
                        </div>

                        {/* Preview Box */}
                        <div className="w-full h-44 rounded-xl border border-indigo-500/40 bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:12px_12px] bg-slate-950 flex items-center justify-center relative overflow-hidden">
                            {slicedFrames[previewIndex] && (
                                <img
                                    src={slicedFrames[previewIndex].url}
                                    alt="프레임 미리보기"
                                    className="max-h-36 max-w-36 object-contain filter drop-shadow-[0_0_8px_rgba(99,102,241,0.5)] transition-transform duration-75"
                                    style={{
                                        mixBlendMode: blendMode,
                                        transform: `translateX(${slicedFrames[previewIndex].offsetX * 0.4}px) translateY(${slicedFrames[previewIndex].offsetY * 0.4}px)`
                                    }}
                                />
                            )}
                        </div>

                        {/* Thumbnail Strip */}
                        <div className="flex gap-1.5 overflow-x-auto custom-scrollbar py-1">
                            {slicedFrames.map((item, i) => (
                                <div
                                    key={i}
                                    onClick={() => {
                                        setPreviewIndex(i);
                                        setIsPlaying(false);
                                    }}
                                    className={`w-11 h-11 shrink-0 rounded-lg border cursor-pointer p-0.5 bg-slate-950 flex flex-col items-center justify-center transition-all relative ${
                                        previewIndex === i ? 'border-indigo-400 bg-indigo-950/60 scale-105' : 'border-slate-800 hover:border-slate-600 opacity-70'
                                    }`}
                                >
                                    <img src={item.url} alt={`f_${i}`} className="max-w-full max-h-full object-contain" />
                                    {item.offsetX !== 0 && (
                                        <span className="absolute bottom-0.5 right-0.5 bg-indigo-900/90 text-[8px] text-indigo-300 font-mono px-0.5 rounded">
                                            {item.offsetX > 0 ? `+${item.offsetX}` : item.offsetX}
                                        </span>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Footer Buttons */}
                <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold"
                    >
                        닫기
                    </button>
                    <button
                        onClick={handleApply}
                        disabled={slicedFrames.length === 0}
                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold shadow-lg flex items-center gap-1.5"
                    >
                        <Check size={14} />
                        <span>에디터에 프레임 애니메이션 적용</span>
                    </button>
                </div>
            </div>
        </div>
    );
};
