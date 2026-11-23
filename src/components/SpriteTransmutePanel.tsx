import React, { useEffect, useRef, useState } from 'react';
import { Character } from '../types';
import {
    DIRECTION_ROW_MAP,
    getRpgSpriteUrlByKey,
    loadRpgSpriteImage,
    processSpriteDataUrlWithChroma,
    readFileAsDataUrl,
    resolveEntityRpgSprite,
    RPG_SPRITE_CATALOG,
    SpriteChromaOptions,
    SpriteDirection
} from '../services/rpgSpriteManifest';
import { Upload, RotateCcw, Check, Sparkles, Users, Download, Pipette } from 'lucide-react';

interface Props {
    character: Character;
    onUpdateCharacter: (newChar: Character, logMsg?: string) => void;
    onSuccessNotice?: (title: string, message: string) => void;
}

const SpriteTransmutePanel: React.FC<Props> = ({ character, onUpdateCharacter, onSuccessNotice }) => {
    const [targetId, setTargetId] = useState<string>('player');
    const [selectedPresetKey, setSelectedPresetKey] = useState<string>(character.rpgSpriteKey || '');
    const [rawUploadedUrl, setRawUploadedUrl] = useState<string>('');
    const [uploadedDataUrl, setUploadedDataUrl] = useState<string>(character.customSpriteUrl || '');
    const [bgMode, setBgMode] = useState<SpriteChromaOptions['mode']>('auto');
    const [bgColorHex, setBgColorHex] = useState<string>('#ff00ff');
    const [bgTolerance, setBgTolerance] = useState<number>(60);
    const [tagFilter, setTagFilter] = useState<string>('전체');
    const [previewDir, setPreviewDir] = useState<SpriteDirection>('down');
    const [previewImg, setPreviewImg] = useState<HTMLImageElement | null>(null);
    const [uploadError, setUploadError] = useState<string>('');
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const pickerCanvasRef = useRef<HTMLCanvasElement>(null);

    const allCompanions = [
        ...(character.companions || []).map(c => ({ ...c, _group: '파티' })),
        ...(character.inactiveCompanions || []).map(c => ({ ...c, _group: '대기' }))
    ];

    const targetEntity: any =
        targetId === 'player'
            ? character
            : allCompanions.find(c => c.id === targetId) || character;

    // Sync selection when switching target
    useEffect(() => {
        setSelectedPresetKey(targetEntity?.rpgSpriteKey || '');
        setUploadedDataUrl(targetEntity?.customSpriteUrl || '');
        setRawUploadedUrl('');
        setUploadError('');
    }, [targetId]);

    // Draw raw uploaded image into eyedropper canvas whenever uploaded
    useEffect(() => {
        if (!rawUploadedUrl || !pickerCanvasRef.current) return;
        const img = new Image();
        img.onload = () => {
            const pc = pickerCanvasRef.current;
            if (!pc) return;
            const pctx = pc.getContext('2d');
            if (!pctx) return;
            pctx.clearRect(0, 0, pc.width, pc.height);
            pctx.drawImage(img, 0, 0, pc.width, pc.height);
        };
        img.src = rawUploadedUrl;
    }, [rawUploadedUrl]);

    // Re-process chroma-key whenever rawUploadedUrl, bgMode, bgColorHex, or bgTolerance changes
    useEffect(() => {
        if (!rawUploadedUrl) return;
        let alive = true;
        processSpriteDataUrlWithChroma(rawUploadedUrl, {
            mode: bgMode,
            colorHex: bgColorHex,
            tolerance: bgTolerance
        })
            .then(({ dataUrl, detectedHex }) => {
                if (!alive) return;
                setUploadedDataUrl(dataUrl);
                if (bgMode === 'auto' && detectedHex) {
                    setBgColorHex(detectedHex);
                }
            })
            .catch(err => {
                if (alive) setUploadError(err?.message || '이미지 처리 중 오류가 발생했습니다.');
            });
        return () => {
            alive = false;
        };
    }, [rawUploadedUrl, bgMode, bgColorHex, bgTolerance]);

    // Compute live preview URL
    const previewUrl = (() => {
        if (uploadedDataUrl) return uploadedDataUrl;
        if (selectedPresetKey) return getRpgSpriteUrlByKey(selectedPresetKey);
        return resolveEntityRpgSprite(
            targetEntity,
            character.currentLocation?.region,
            character.currentLocation?.nation
        ).url;
    })();

    useEffect(() => {
        let alive = true;
        loadRpgSpriteImage(previewUrl).then(img => {
            if (alive) setPreviewImg(img);
        });
        return () => {
            alive = false;
        };
    }, [previewUrl]);

    useEffect(() => {
        let raf = 0;
        const frames = [0, 1, 2, 1];
        const loop = (now: number) => {
            const canvas = canvasRef.current;
            if (canvas) {
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                    ctx.imageSmoothingEnabled = false;
                    ctx.fillStyle = 'rgba(0,0,0,0.42)';
                    ctx.beginPath();
                    ctx.ellipse(48, 84, 20, 7, 0, 0, Math.PI * 2);
                    ctx.fill();
                    if (previewImg && previewImg.complete && previewImg.naturalWidth > 0) {
                        const col = frames[Math.floor(now / 220) % frames.length];
                        const row = DIRECTION_ROW_MAP[previewDir] ?? 0;
                        const fw = previewImg.naturalWidth / 3;
                        const fh = previewImg.naturalHeight / 4;
                        ctx.drawImage(previewImg, col * fw, row * fh, fw, fh, 6, 4, 84, 84);
                    }
                }
            }
            raf = requestAnimationFrame(loop);
        };
        raf = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(raf);
    }, [previewImg, previewDir]);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploadError('');
        try {
            const raw = await readFileAsDataUrl(file);
            setRawUploadedUrl(raw);
            setSelectedPresetKey('');
        } catch (err: any) {
            setUploadError(err?.message || '스프라이트 업로드 중 오류가 발생했습니다.');
        } finally {
            e.target.value = '';
        }
    };

    // 스포이드: 업로드된 원본 캔버스를 클릭한 픽셀 색상을 배경색으로 직접 추출!
    const handleEyedropperClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const pc = pickerCanvasRef.current;
        if (!pc) return;
        const rect = pc.getBoundingClientRect();
        const x = Math.max(0, Math.min(pc.width - 1, Math.floor(((e.clientX - rect.left) / rect.width) * pc.width)));
        const y = Math.max(0, Math.min(pc.height - 1, Math.floor(((e.clientY - rect.top) / rect.height) * pc.height)));
        const pctx = pc.getContext('2d');
        if (!pctx) return;
        const px = pctx.getImageData(x, y, 1, 1).data;
        const toHex = (v: number) => v.toString(16).padStart(2, '0');
        const hex = `#${toHex(px[0])}${toHex(px[1])}${toHex(px[2])}`;
        setBgMode('custom');
        setBgColorHex(hex);
    };

    const handleApplySprite = () => {
        const nextChar: Character = { ...character };
        const patch = {
            rpgSpriteKey: uploadedDataUrl ? undefined : (selectedPresetKey || undefined),
            customSpriteUrl: uploadedDataUrl || undefined
        };

        if (targetId === 'player') {
            nextChar.rpgSpriteKey = patch.rpgSpriteKey;
            nextChar.customSpriteUrl = patch.customSpriteUrl;
        } else {
            nextChar.companions = (character.companions || []).map(c =>
                c.id === targetId ? { ...c, ...patch } : c
            );
            nextChar.inactiveCompanions = (character.inactiveCompanions || []).map(c =>
                c.id === targetId ? { ...c, ...patch } : c
            );
        }

        const label = uploadedDataUrl
            ? '직접 업로드한 커스텀 스프라이트'
            : RPG_SPRITE_CATALOG.find(k => k.key === selectedPresetKey)?.label || '기본 지역 스프라이트';
        const logMsg = `[커스텀 연구소] ${targetEntity.name}의 2D 스프라이트를 [${label}](으)로 변환했습니다.`;
        onUpdateCharacter(nextChar, logMsg);
        onSuccessNotice?.('2D 스프라이트 변환 완료', `${targetEntity.name}의 필드/전장 스프라이트가 [${label}](으)로 적용되었습니다.`);
    };

    const handleDownloadCurrent = () => {
        if (!previewImg || !previewImg.complete || previewImg.naturalWidth === 0) return;
        const c = document.createElement('canvas');
        c.width = 144;
        c.height = 192;
        const ctx = c.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(previewImg, 0, 0, 144, 192);
        const a = document.createElement('a');
        a.href = c.toDataURL('image/png');
        a.download = `${targetEntity.name}_sprite.png`;
        a.click();
    };

    const tags = ['전체', '인간계', '신계', '마계', '이종족', 'NPC'];
    const filtered = tagFilter === '전체' ? RPG_SPRITE_CATALOG : RPG_SPRITE_CATALOG.filter(i => i.tag === tagFilter);

    return (
        <div className="space-y-4">
            {/* 대상 선택 + 실시간 미리보기 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-950/75 border border-purple-500/30 rounded-2xl p-4">
                <div className="flex flex-col items-center justify-center gap-2">
                    <div className="w-24 h-24 rounded-2xl bg-slate-900 border-2 border-purple-400/60 flex items-center justify-center shadow-inner">
                        <canvas ref={canvasRef} width={96} height={96} className="w-24 h-24" />
                    </div>
                    <div className="flex items-center gap-1">
                        {(['down', 'left', 'right', 'up'] as SpriteDirection[]).map(d => (
                            <button
                                key={d}
                                type="button"
                                onClick={() => setPreviewDir(d)}
                                className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                                    previewDir === d
                                        ? 'bg-purple-600 border-purple-400 text-white'
                                        : 'bg-slate-900 border-slate-700 text-slate-400'
                                }`}
                            >
                                {d === 'down' ? '앞' : d === 'left' ? '좌' : d === 'right' ? '우' : '뒤'}
                            </button>
                        ))}
                    </div>
                    <button
                        type="button"
                        onClick={handleDownloadCurrent}
                        className="text-[10px] font-bold text-cyan-300 hover:text-cyan-200 flex items-center gap-1"
                    >
                        <Download size={11} /> 현재 스프라이트 PNG 저장
                    </button>
                </div>

                <div className="md:col-span-2 space-y-3">
                    <div>
                        <label className="text-xs font-black text-purple-300 flex items-center gap-1.5 mb-1.5">
                            <Users size={13} /> 변환 대상 선택 (플레이어 또는 동료)
                        </label>
                        <select
                            value={targetId}
                            onChange={e => setTargetId(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-white focus:border-purple-400 outline-none"
                        >
                            <option value="player">👤 [플레이어] {character.name}</option>
                            {allCompanions.map(c => (
                                <option key={c.id} value={c.id}>
                                    [{c._group}] {c.name} (Lv.{c.level})
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* 직접 스프라이트 PNG 업로드 + 배경색 스포이드/직접 추출 */}
                    <div className="bg-slate-900/90 border border-slate-700/80 rounded-xl p-3 space-y-2.5">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                            <span className="text-xs font-black text-amber-300 flex items-center gap-1.5">
                                <Upload size={13} /> 직접 3×4 쯔꾸르 스프라이트 업로드 (PNG)
                            </span>
                            <div className="flex items-center gap-1.5">
                                <label className="px-3 py-1 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-black cursor-pointer flex items-center gap-1.5 shadow">
                                    <Upload size={12} /> PNG 선택
                                    <input
                                        type="file"
                                        accept="image/png,image/webp,image/gif"
                                        onChange={handleFileUpload}
                                        className="hidden"
                                    />
                                </label>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setRawUploadedUrl('');
                                        setUploadedDataUrl('');
                                        setSelectedPresetKey('');
                                    }}
                                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-bold flex items-center gap-1"
                                >
                                    <RotateCcw size={11} /> 초기화
                                </button>
                            </div>
                        </div>

                        {/* 배경 투명화 옵션 (자동 모서리 / 직접 색추출 스포이드 / 마젠타 / 제거 안 함) */}
                        <div className="space-y-2 pt-1.5 border-t border-slate-800">
                            <div className="flex items-center gap-1.5 flex-wrap text-[11px]">
                                <span className="text-slate-400 font-bold">배경 투명화:</span>
                                {[
                                    { id: 'auto' as const, label: '자동(모서리 색)' },
                                    { id: 'custom' as const, label: '직접 색추출' },
                                    { id: 'magenta' as const, label: '마젠타(#FF00FF)' },
                                    { id: 'none' as const, label: '제거 안 함' }
                                ].map(opt => (
                                    <button
                                        key={opt.id}
                                        type="button"
                                        onClick={() => setBgMode(opt.id)}
                                        className={`px-2 py-0.5 rounded-md font-bold border transition-colors ${
                                            bgMode === opt.id
                                                ? 'bg-amber-600 border-amber-400 text-white'
                                                : 'bg-slate-950 border-slate-700 text-slate-300 hover:text-white'
                                        }`}
                                    >
                                        {opt.label}
                                    </button>
                                ))}
                            </div>

                            {bgMode !== 'none' && (
                                <div className="flex items-center gap-3 flex-wrap text-[11px]">
                                    <label className="flex items-center gap-1.5 text-slate-300 font-bold cursor-pointer">
                                        <Pipette size={12} className="text-amber-300" />
                                        <span>제거 색상:</span>
                                        <input
                                            type="color"
                                            value={bgMode === 'magenta' ? '#ff00ff' : bgColorHex}
                                            onChange={e => {
                                                setBgMode('custom');
                                                setBgColorHex(e.target.value);
                                            }}
                                            className="w-6 h-6 rounded border border-slate-600 bg-transparent cursor-pointer"
                                        />
                                        <span className="font-mono text-[10px] text-amber-200 uppercase">
                                            {bgMode === 'magenta' ? '#FF00FF' : bgColorHex}
                                        </span>
                                    </label>
                                    <label className="flex items-center gap-1.5 text-slate-300 font-bold">
                                        <span>허용 오차:</span>
                                        <input
                                            type="range"
                                            min={15}
                                            max={130}
                                            value={bgTolerance}
                                            onChange={e => setBgTolerance(Number(e.target.value))}
                                            className="w-24 accent-amber-500"
                                        />
                                        <span className="font-mono text-[10px] text-cyan-300 w-6">{bgTolerance}</span>
                                    </label>
                                </div>
                            )}

                            {/* 스포이드 원본 클릭 캔버스 */}
                            {rawUploadedUrl && (
                                <div className="flex items-center gap-3 bg-slate-950/90 border border-amber-500/40 rounded-xl p-2">
                                    <canvas
                                        ref={pickerCanvasRef}
                                        width={96}
                                        height={128}
                                        onClick={handleEyedropperClick}
                                        className="w-20 h-[106px] rounded-lg border border-slate-700 cursor-crosshair shrink-0"
                                        title="클릭한 위치의 배경색을 직접 추출해 투명화합니다!"
                                    />
                                    <div className="text-[11px] text-slate-300 space-y-1">
                                        <div className="font-black text-amber-300 flex items-center gap-1">
                                            <Pipette size={12} /> 스포이드 직접 색추출 활성화됨
                                        </div>
                                        <p className="text-[10px] text-slate-400 leading-relaxed">
                                            좌측 원본 이미지에서 <strong>투명화할 배경 부분을 클릭</strong>하면 해당 색상이 즉시 추출되어 미리보기에 실시간 반영됩니다.
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                        {uploadError && <p className="text-[11px] text-rose-400 font-bold">{uploadError}</p>}
                    </div>
                </div>
            </div>

            {/* 지역별 공식 프리셋 카탈로그 */}
            <div className="bg-slate-950/75 border border-slate-800 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className="text-xs font-black text-slate-200 flex items-center gap-1.5">
                        <Sparkles size={13} className="text-amber-400" /> 지역별 공식 스프라이트 선택 ({RPG_SPRITE_CATALOG.length}종)
                    </span>
                    <div className="flex items-center gap-1 flex-wrap">
                        {tags.map(t => (
                            <button
                                key={t}
                                type="button"
                                onClick={() => setTagFilter(t)}
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border ${
                                    tagFilter === t
                                        ? 'bg-purple-600 border-purple-400 text-white'
                                        : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white'
                                }`}
                            >
                                {t}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 max-h-64 overflow-y-auto pr-1">
                    {filtered.map(item => {
                        const active = !uploadedDataUrl && selectedPresetKey === item.key;
                        return (
                            <button
                                key={item.key}
                                type="button"
                                onClick={() => {
                                    setRawUploadedUrl('');
                                    setUploadedDataUrl('');
                                    setSelectedPresetKey(item.key);
                                }}
                                className={`p-2 rounded-xl border flex flex-col items-center gap-1 transition-all ${
                                    active
                                        ? 'bg-purple-600/25 border-amber-400 shadow-lg'
                                        : 'bg-slate-900/80 border-slate-800 hover:border-slate-600'
                                }`}
                            >
                                <div
                                    className="w-12 h-12 rounded-lg bg-slate-950/70"
                                    style={{
                                        backgroundImage: `url(${getRpgSpriteUrlByKey(item.key)})`,
                                        backgroundPosition: '-48px 0px',
                                        backgroundSize: '144px 192px',
                                        imageRendering: 'pixelated'
                                    }}
                                />
                                <span className="text-[10px] font-bold text-slate-200 truncate w-full text-center">
                                    {item.label}
                                </span>
                            </button>
                        );
                    })}
                </div>

                <div className="flex justify-end pt-2 border-t border-slate-800">
                    <button
                        type="button"
                        onClick={handleApplySprite}
                        className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:brightness-110 text-white text-xs font-black flex items-center gap-1.5 shadow-lg"
                    >
                        <Check size={14} /> {targetEntity.name}에게 스프라이트 적용
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SpriteTransmutePanel;
