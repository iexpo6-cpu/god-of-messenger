import React, { useEffect, useRef, useState } from 'react';
import { Character } from '../types';
import {
    DIRECTION_ROW_MAP,
    loadRpgSpriteImage,
    normalizeUploadedSpriteFile,
    resolveEntityRpgSprite,
    SpriteDirection
} from '../services/rpgSpriteManifest';
import { X, Copy, Check, Download, Upload, Share2, Sparkles } from 'lucide-react';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    character: Character;
    onUpdateCharacter: (newChar: Character, logMsg: string) => void;
}

const SHARE_PREFIX = 'SPRITE_SHARE_V1:';

const CommunicationSpriteModal: React.FC<Props> = ({ isOpen, onClose, character, onUpdateCharacter }) => {
    const [tab, setTab] = useState<'export' | 'import'>('export');
    const [exportTargetId, setExportTargetId] = useState<string>('player');
    const [importTargetId, setImportTargetId] = useState<string>('player');
    const [shareCode, setShareCode] = useState<string>('');
    const [copied, setCopied] = useState<boolean>(false);

    const [importCodeInput, setImportCodeInput] = useState<string>('');
    const [importPreviewUrl, setImportPreviewUrl] = useState<string>('');
    const [importAuthor, setImportAuthor] = useState<string>('');
    const [removeMagenta, setRemoveMagenta] = useState<boolean>(true);
    const [statusMsg, setStatusMsg] = useState<string>('');
    const [errorMsg, setErrorMsg] = useState<string>('');

    const [previewDir, setPreviewDir] = useState<SpriteDirection>('down');
    const [previewImg, setPreviewImg] = useState<HTMLImageElement | null>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const allCompanions = [
        ...(character.companions || []).map(c => ({ ...c, _group: '파티' })),
        ...(character.inactiveCompanions || []).map(c => ({ ...c, _group: '대기' }))
    ];

    const exportEntity: any =
        exportTargetId === 'player'
            ? character
            : allCompanions.find(c => c.id === exportTargetId) || character;

    const importEntity: any =
        importTargetId === 'player'
            ? character
            : allCompanions.find(c => c.id === importTargetId) || character;

    const activePreviewUrl =
        tab === 'export'
            ? resolveEntityRpgSprite(
                  exportEntity,
                  character.currentLocation?.region,
                  character.currentLocation?.nation
              ).url
            : importPreviewUrl;

    useEffect(() => {
        if (!isOpen || !activePreviewUrl) {
            setPreviewImg(null);
            return;
        }
        let alive = true;
        loadRpgSpriteImage(activePreviewUrl).then(img => {
            if (alive) setPreviewImg(img);
        });
        return () => {
            alive = false;
        };
    }, [isOpen, activePreviewUrl]);

    useEffect(() => {
        if (!isOpen) return;
        let raf = 0;
        const frames = [0, 1, 2, 1];
        const loop = (now: number) => {
            const canvas = canvasRef.current;
            if (canvas) {
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                    ctx.imageSmoothingEnabled = false;
                    ctx.fillStyle = 'rgba(0,0,0,0.4)';
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
    }, [isOpen, previewImg, previewDir]);

    if (!isOpen) return null;

    const bakePreviewToDataUrl = (): string | null => {
        if (!previewImg || !previewImg.complete || previewImg.naturalWidth === 0) return null;
        const c = document.createElement('canvas');
        c.width = 144;
        c.height = 192;
        const ctx = c.getContext('2d');
        if (!ctx) return null;
        ctx.drawImage(previewImg, 0, 0, 144, 192);
        return c.toDataURL('image/png');
    };

    const handleGenerateShareCode = () => {
        setErrorMsg('');
        setStatusMsg('');
        const dataUrl = bakePreviewToDataUrl();
        if (!dataUrl) {
            setErrorMsg('스프라이트 이미지를 불러오는 중입니다. 잠시 후 다시 시도해주세요.');
            return;
        }
        const payload = {
            v: 1,
            name: exportEntity.name,
            owner: character.name,
            dataUrl
        };
        const encoded = SHARE_PREFIX + btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
        setShareCode(encoded);
        setStatusMsg('차원 공유 코드가 발급되었습니다! 코드를 복사해 다른 차원의 유저에게 공유하세요.');
    };

    const handleCopyCode = async () => {
        if (!shareCode) return;
        try {
            await navigator.clipboard.writeText(shareCode);
            setCopied(true);
            setTimeout(() => setCopied(false), 1800);
        } catch {
            setErrorMsg('클립보드 복사에 실패했습니다. 텍스트 박스를 직접 복사해주세요.');
        }
    };

    const handleDownloadPng = () => {
        const dataUrl = bakePreviewToDataUrl();
        if (!dataUrl) return;
        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = `${exportEntity.name}_dimension_sprite.png`;
        a.click();
    };

    const handleParseShareCode = (raw: string) => {
        setImportCodeInput(raw);
        setErrorMsg('');
        setStatusMsg('');
        const trimmed = raw.trim();
        if (!trimmed) {
            setImportPreviewUrl('');
            setImportAuthor('');
            return;
        }
        try {
            if (trimmed.startsWith('data:image/')) {
                setImportPreviewUrl(trimmed);
                setImportAuthor('직접 Data URL');
                return;
            }
            const b64 = trimmed.startsWith(SHARE_PREFIX) ? trimmed.slice(SHARE_PREFIX.length) : trimmed;
            const jsonStr = decodeURIComponent(escape(atob(b64)));
            const parsed = JSON.parse(jsonStr);
            if (!parsed?.dataUrl || !String(parsed.dataUrl).startsWith('data:image/')) {
                throw new Error('유효한 스프라이트 공유 데이터가 아닙니다.');
            }
            setImportPreviewUrl(parsed.dataUrl);
            setImportAuthor(`${parsed.name || '미상'} (공유자: ${parsed.owner || '평행우주'})`);
            setStatusMsg('공유 스프라이트 수신 완료! 적용할 대상을 선택해 적용 버튼을 누르세요.');
        } catch {
            setImportPreviewUrl('');
            setImportAuthor('');
            setErrorMsg('올바른 차원 스프라이트 공유 코드가 아닙니다.');
        }
    };

    const handleImportPngFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setErrorMsg('');
        setStatusMsg('');
        try {
            const dataUrl = await normalizeUploadedSpriteFile(file, removeMagenta);
            setImportPreviewUrl(dataUrl);
            setImportAuthor(`업로드 파일: ${file.name}`);
            setStatusMsg('PNG 스프라이트 파일 로드 완료! 대상을 선택해 적용할 수 있습니다.');
        } catch (err: any) {
            setErrorMsg(err?.message || '파일 처리 중 오류가 발생했습니다.');
        } finally {
            e.target.value = '';
        }
    };

    const handleApplyImportedSprite = () => {
        if (!importPreviewUrl) {
            setErrorMsg('먼저 공유 코드를 입력하거나 PNG 스프라이트 파일을 불러와주세요.');
            return;
        }
        const nextChar: Character = { ...character };
        if (importTargetId === 'player') {
            nextChar.customSpriteUrl = importPreviewUrl;
            nextChar.rpgSpriteKey = undefined;
        } else {
            nextChar.companions = (character.companions || []).map(c =>
                c.id === importTargetId ? { ...c, customSpriteUrl: importPreviewUrl, rpgSpriteKey: undefined } : c
            );
            nextChar.inactiveCompanions = (character.inactiveCompanions || []).map(c =>
                c.id === importTargetId ? { ...c, customSpriteUrl: importPreviewUrl, rpgSpriteKey: undefined } : c
            );
        }
        onUpdateCharacter(
            nextChar,
            `[차원 교신] 공유받은 2D 스프라이트를 [${importEntity.name}]에게 적용했습니다.`
        );
        setStatusMsg(`✓ [${importEntity.name}]에게 공유 스프라이트가 적용되었습니다!`);
    };

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/85 backdrop-blur-sm p-2 sm:p-4">
            <div className="w-full max-w-2xl max-h-[92vh] bg-slate-950 border border-cyan-500/50 rounded-3xl shadow-2xl flex flex-col overflow-hidden">
                {/* 헤더 */}
                <div className="px-5 py-3.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-xl bg-cyan-600/20 border border-cyan-500/40 text-cyan-300">
                            <Share2 size={18} />
                        </div>
                        <div>
                            <h3 className="text-sm sm:text-base font-black text-white">차원 스프라이트 공유실</h3>
                            <p className="text-[10px] text-cyan-300/80 font-bold">
                                2D 쯔꾸르 스프라이트 파일(.png) 및 공유 코드 송수신
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* 탭 전환 */}
                <div className="px-5 pt-3 flex gap-2">
                    <button
                        type="button"
                        onClick={() => { setTab('export'); setErrorMsg(''); setStatusMsg(''); }}
                        className={`flex-1 py-2 rounded-xl text-xs font-black border transition-all ${
                            tab === 'export'
                                ? 'bg-cyan-600 border-cyan-400 text-white shadow'
                                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                        }`}
                    >
                        📤 스프라이트 내보내기 · 공유
                    </button>
                    <button
                        type="button"
                        onClick={() => { setTab('import'); setErrorMsg(''); setStatusMsg(''); }}
                        className={`flex-1 py-2 rounded-xl text-xs font-black border transition-all ${
                            tab === 'import'
                                ? 'bg-indigo-600 border-indigo-400 text-white shadow'
                                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                        }`}
                    >
                        📥 공유 스프라이트 불러오기
                    </button>
                </div>

                {/* 본문 */}
                <div className="p-5 overflow-y-auto space-y-4">
                    {/* 공통 미리보기 */}
                    <div className="flex flex-col sm:flex-row items-center gap-4 bg-slate-900/60 border border-slate-800 rounded-2xl p-3.5">
                        <div className="flex flex-col items-center gap-1.5 shrink-0">
                            <div className="w-24 h-24 rounded-2xl bg-slate-950 border-2 border-cyan-500/50 flex items-center justify-center">
                                <canvas ref={canvasRef} width={96} height={96} className="w-24 h-24" />
                            </div>
                            <div className="flex gap-1">
                                {(['down', 'left', 'right', 'up'] as SpriteDirection[]).map(d => (
                                    <button
                                        key={d}
                                        type="button"
                                        onClick={() => setPreviewDir(d)}
                                        className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                                            previewDir === d
                                                ? 'bg-cyan-600 border-cyan-400 text-white'
                                                : 'bg-slate-900 border-slate-700 text-slate-400'
                                        }`}
                                    >
                                        {d === 'down' ? '앞' : d === 'left' ? '좌' : d === 'right' ? '우' : '뒤'}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="flex-1 w-full space-y-2.5">
                            {tab === 'export' ? (
                                <>
                                    <label className="text-xs font-black text-cyan-300 block">공유할 캐릭터 선택</label>
                                    <select
                                        value={exportTargetId}
                                        onChange={e => { setExportTargetId(e.target.value); setShareCode(''); }}
                                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-white"
                                    >
                                        <option value="player">👤 [플레이어] {character.name}</option>
                                        {allCompanions.map(c => (
                                            <option key={c.id} value={c.id}>
                                                [{c._group}] {c.name} (Lv.{c.level})
                                            </option>
                                        ))}
                                    </select>
                                    <div className="flex flex-wrap gap-2">
                                        <button
                                            type="button"
                                            onClick={handleGenerateShareCode}
                                            className="px-3.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-black flex items-center gap-1.5 shadow"
                                        >
                                            <Sparkles size={13} /> 공유 코드 발급
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleDownloadPng}
                                            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-cyan-200 text-xs font-bold flex items-center gap-1.5"
                                        >
                                            <Download size={13} /> PNG 파일로 저장
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <label className="text-xs font-black text-indigo-300 block">적용할 캐릭터 선택</label>
                                    <select
                                        value={importTargetId}
                                        onChange={e => setImportTargetId(e.target.value)}
                                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-white"
                                    >
                                        <option value="player">👤 [플레이어] {character.name}</option>
                                        {allCompanions.map(c => (
                                            <option key={c.id} value={c.id}>
                                                [{c._group}] {c.name} (Lv.{c.level})
                                            </option>
                                        ))}
                                    </select>
                                    {importAuthor && (
                                        <div className="text-[11px] font-bold text-emerald-300">
                                            ✓ 수신 정보: {importAuthor}
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>

                    {tab === 'export' ? (
                        shareCode && (
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-slate-300">발급된 차원 스프라이트 공유 코드</span>
                                    <button
                                        type="button"
                                        onClick={handleCopyCode}
                                        className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black flex items-center gap-1"
                                    >
                                        {copied ? <Check size={13} /> : <Copy size={13} />}
                                        {copied ? '복사 완료!' : '코드 복사'}
                                    </button>
                                </div>
                                <textarea
                                    readOnly
                                    value={shareCode}
                                    rows={4}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-[10px] font-mono text-cyan-200 break-all"
                                />
                            </div>
                        )
                    ) : (
                        <div className="space-y-3">
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-300 block">
                                    방법 1) 공유받은 코드 붙여넣기
                                </label>
                                <textarea
                                    value={importCodeInput}
                                    onChange={e => handleParseShareCode(e.target.value)}
                                    placeholder="SPRITE_SHARE_V1:... 코드를 여기에 붙여넣으세요"
                                    rows={3}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-[11px] font-mono text-white focus:border-indigo-400 outline-none"
                                />
                            </div>

                            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 flex items-center justify-between flex-wrap gap-2">
                                <div className="flex items-center gap-2">
                                    <label className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black cursor-pointer flex items-center gap-1.5">
                                        <Upload size={13} /> 방법 2) 공유받은 PNG 파일 열기
                                        <input
                                            type="file"
                                            accept="image/png,image/webp,image/gif"
                                            onChange={handleImportPngFile}
                                            className="hidden"
                                        />
                                    </label>
                                </div>
                                <label className="flex items-center gap-1.5 text-[11px] text-slate-300 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={removeMagenta}
                                        onChange={e => setRemoveMagenta(e.target.checked)}
                                        className="accent-indigo-500"
                                    />
                                    마젠타(#FF00FF) 투명화
                                </label>
                            </div>

                            <button
                                type="button"
                                disabled={!importPreviewUrl}
                                onClick={handleApplyImportedSprite}
                                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 hover:brightness-110 disabled:opacity-40 text-white text-xs font-black flex items-center justify-center gap-1.5 shadow-lg"
                            >
                                <Check size={15} /> [{importEntity.name}]에게 공유 스프라이트 적용
                            </button>
                        </div>
                    )}

                    {statusMsg && (
                        <div className="text-xs font-bold text-emerald-300 bg-emerald-950/50 border border-emerald-700/50 rounded-xl px-3 py-2">
                            {statusMsg}
                        </div>
                    )}
                    {errorMsg && (
                        <div className="text-xs font-bold text-rose-300 bg-rose-950/50 border border-rose-700/50 rounded-xl px-3 py-2">
                            {errorMsg}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CommunicationSpriteModal;
