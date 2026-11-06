import React, { useState, useEffect, useRef } from 'react';
import {
    Sparkles, Zap, Wand2, Play, Check, X, RefreshCw, Image as ImageIcon, Upload, Layers
} from 'lucide-react';
import { SkillAnimationFrame } from '../types';
import { processImageTransparency } from './SkillFrameAnimationEditor';

interface ProceduralParticleModalProps {
    isOpen: boolean;
    onClose: () => void;
    onApplyFrames: (frames: SkillAnimationFrame[]) => void;
    showToast: (msg: string, type?: 'success' | 'warning' | 'info') => void;
}

// 8가지 속성 정의
export type ParticleElement = 'fire' | 'ice' | 'lightning' | 'holy' | 'dark' | 'wind' | 'earth' | 'arcane';

// 7가지 하이퍼 캔버스 형태 정의
export type ParticleShape = 'slash' | 'burst' | 'beam' | 'vortex' | 'projectile' | 'quake' | 'cross';

// 3가지 일러스트/아이콘 합성 모드
export type IllustSynthMode = 'dash_slash' | 'emblem_awakening' | 'giant_descent';

const ELEMENT_COLORS: Record<ParticleElement, { name: string; primary: string; secondary: string; glow: string; text: string }> = {
    fire: { name: '화염', primary: '#f97316', secondary: '#ef4444', glow: '#fef08a', text: 'text-orange-400' },
    ice: { name: '빙결', primary: '#38bdf8', secondary: '#0284c7', glow: '#e0f2fe', text: 'text-cyan-400' },
    lightning: { name: '전격', primary: '#facc15', secondary: '#38bdf8', glow: '#ffffff', text: 'text-yellow-400' },
    holy: { name: '신성', primary: '#fde047', secondary: '#eab308', glow: '#ffffff', text: 'text-amber-300' },
    dark: { name: '암흑', primary: '#a855f7', secondary: '#6b21a8', glow: '#e9d5ff', text: 'text-purple-400' },
    wind: { name: '질풍', primary: '#34d399', secondary: '#059669', glow: '#d1fae5', text: 'text-emerald-400' },
    earth: { name: '대지', primary: '#f59e0b', secondary: '#b45309', glow: '#fef3c7', text: 'text-amber-500' },
    arcane: { name: '비전', primary: '#ec4899', secondary: '#8b5cf6', glow: '#fbcfe8', text: 'text-pink-400' }
};

const SHAPE_NAMES: Record<ParticleShape, { name: string; desc: string }> = {
    slash: { name: '차원 절단 검기', desc: '날카로운 베지어 검기와 유리창처럼 갈라지는 공간 균열' },
    burst: { name: '초신성 중력 폭발', desc: '중력 수축 후 다중 충격파 고리와 다이아몬드 파편 폭열' },
    beam: { name: '천공 프랙탈 낙뢰', desc: '실시간으로 갈라지는 고압 뇌전과 신성 광선 기둥' },
    vortex: { name: '기하학 마법진 폭풍', desc: '역회전하는 6각 성좌 마법진과 나선 마력 소용돌이' },
    projectile: { name: '유성우 / 이기어검', desc: '하늘에서 대각선으로 연속 쏟아지는 빛의 칼날과 운석' },
    quake: { name: '대지 크리스탈 분출', desc: '지면에서 연쇄적으로 솟구치는 날카로운 마력 수정 기둥' },
    cross: { name: '십자 차원 섬광', desc: '공간을 X자와 십자로 동시에 가르는 초고열 프리즘 섬광' }
};

const ILLUST_MODE_NAMES: Record<IllustSynthMode, { name: string; desc: string }> = {
    dash_slash: { name: '분신 잔상 질주 참격', desc: '이미지가 네온 오라 잔상을 남기며 초고속 돌진한 뒤 차원 검기가 폭발합니다.' },
    emblem_awakening: { name: '성좌 마법진 문장 각성', desc: '회전하는 기하학 마법진 중앙에 이미지가 떠올라 빛나다가 초신성 폭발을 일으킵니다.' },
    giant_descent: { name: '천공 거대 강하 타격', desc: '상공에서 거대해진 이미지가 프랙탈 번개와 함께 내리꽂히며 대지를 강타합니다.' }
};

// 날카로운 테이퍼링 검기 드로잉
function drawBladeArc(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    radius: number,
    startAngle: number,
    endAngle: number,
    thickness: number,
    primary: string,
    glow: string
) {
    const steps = 24;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.beginPath();
    for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const a = startAngle + (endAngle - startAngle) * t;
        const w = Math.sin(t * Math.PI) * thickness;
        const r = radius + w * 0.5;
        const x = Math.cos(a) * r;
        const y = Math.sin(a) * r;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    }
    for (let i = steps; i >= 0; i--) {
        const t = i / steps;
        const a = startAngle + (endAngle - startAngle) * t;
        const w = Math.sin(t * Math.PI) * thickness;
        const r = radius - w * 0.5;
        ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    ctx.closePath();
    ctx.fillStyle = primary;
    ctx.shadowColor = glow;
    ctx.shadowBlur = 14;
    ctx.fill();

    // 코어 하이라이트
    ctx.beginPath();
    for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const a = startAngle + (endAngle - startAngle) * t;
        const w = Math.sin(t * Math.PI) * (thickness * 0.36);
        const r = radius + w * 0.5;
        const x = Math.cos(a) * r;
        const y = Math.sin(a) * r;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    }
    for (let i = steps; i >= 0; i--) {
        const t = i / steps;
        const a = startAngle + (endAngle - startAngle) * t;
        const w = Math.sin(t * Math.PI) * (thickness * 0.36);
        const r = radius - w * 0.5;
        ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    ctx.closePath();
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.restore();
}

export const ProceduralParticleModal: React.FC<ProceduralParticleModalProps> = ({
    isOpen,
    onClose,
    onApplyFrames,
    showToast
}) => {
    const [tabMode, setTabMode] = useState<'procedural' | 'illust_synth'>('procedural');
    const [selectedElement, setSelectedElement] = useState<ParticleElement>('holy');
    const [selectedShape, setSelectedShape] = useState<ParticleShape>('slash');
    const [illustMode, setIllustMode] = useState<IllustSynthMode>('dash_slash');
    const [customImageUrl, setCustomImageUrl] = useState<string>('');
    const [removeBg, setRemoveBg] = useState<boolean>(false);

    const [frameCount, setFrameCount] = useState<number>(10);
    const [frameDuration, setFrameDuration] = useState<number>(38);
    const [intensity, setIntensity] = useState<number>(1.3);
    const [particleDensity, setParticleDensity] = useState<number>(36);
    const [scale, setScale] = useState<number>(1.25);

    const [generatedFrames, setGeneratedFrames] = useState<string[]>([]);
    const [previewIndex, setPreviewIndex] = useState<number>(0);
    const [isPlaying, setIsPlaying] = useState<boolean>(true);
    const [isGenerating, setIsGenerating] = useState<boolean>(false);

    const fileInputRef = useRef<HTMLInputElement | null>(null);

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            if (ev.target?.result) {
                setCustomImageUrl(ev.target.result as string);
            }
        };
        reader.readAsDataURL(file);
    };

    // 하이퍼 캔버스 프로시저럴 & 일러스트 합성 프레임 생성
    const generateProceduralFrames = async () => {
        setIsGenerating(true);
        const w = 260;
        const h = 260;
        const cx = w / 2;
        const cy = h / 2;
        const color = ELEMENT_COLORS[selectedElement];
        const frames: string[] = [];

        // 일러스트 합성 모드일 때 원본 이미지 준비
        let loadedIllust: HTMLImageElement | null = null;
        if (tabMode === 'illust_synth' && customImageUrl.trim()) {
            try {
                let targetUrl = customImageUrl.trim();
                if (removeBg) {
                    targetUrl = await processImageTransparency(targetUrl, 'auto', '#000000', 30);
                }
                const img = new Image();
                img.crossOrigin = 'anonymous';
                await new Promise((res) => {
                    img.onload = res;
                    img.onerror = res;
                    img.src = targetUrl;
                });
                if (img.complete && (img.naturalWidth || img.width) > 0) {
                    loadedIllust = img;
                }
            } catch {
                loadedIllust = null;
            }
        }

        for (let f = 0; f < frameCount; f++) {
            const p = f / Math.max(1, frameCount - 1);
            const canvas = document.createElement('canvas');
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext('2d');
            if (!ctx) continue;

            ctx.clearRect(0, 0, w, h);
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';

            if (tabMode === 'illust_synth' && loadedIllust) {
                // ============================================================
                // 모드 2: 내 일러스트 / 무기 / 아이콘 합성 이펙트
                // ============================================================
                const imgSize = 115 * intensity;
                if (illustMode === 'dash_slash') {
                    // 1) 분신 잔상 돌격 + 차원 검기 폭발
                    for (let trail = 3; trail >= 0; trail--) {
                        const tp = Math.max(0, p - trail * 0.08);
                        const tx = -80 + tp * 165;
                        const ty = 15 - tp * 30;
                        const alpha = (1 - trail * 0.25) * (p > 0.8 ? (1 - p) * 5 : 1);
                        if (alpha <= 0.02) continue;

                        ctx.save();
                        ctx.globalCompositeOperation = trail === 0 ? 'source-over' : 'lighter';
                        ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
                        ctx.translate(cx + tx, cy + ty);
                        ctx.rotate(-0.15 + tp * 0.3);
                        ctx.shadowColor = color.primary;
                        ctx.shadowBlur = 18;
                        ctx.drawImage(loadedIllust, -imgSize / 2, -imgSize / 2, imgSize, imgSize);
                        ctx.restore();
                    }
                    // 교차 베지어 검기
                    if (p >= 0.25) {
                        const sp = (p - 0.25) / 0.75;
                        drawBladeArc(
                            ctx,
                            cx,
                            cy,
                            80 + sp * 20,
                            -0.9,
                            -0.9 + sp * Math.PI * 1.3,
                            (1 - sp * 0.6) * 22 * intensity,
                            color.primary,
                            color.glow
                        );
                    }
                } else if (illustMode === 'emblem_awakening') {
                    // 2) 성좌 마법진 문장 각성 -> 초신성 폭발
                    const ringR = (45 + p * 65) * intensity;
                    ctx.save();
                    ctx.translate(cx, cy);
                    ctx.rotate(p * Math.PI * 2);
                    ctx.strokeStyle = color.primary;
                    ctx.lineWidth = 3;
                    ctx.beginPath();
                    ctx.arc(0, 0, ringR, 0, Math.PI * 2);
                    ctx.stroke();

                    // 6각 성좌
                    for (let pass = 0; pass < 2; pass++) {
                        ctx.beginPath();
                        for (let s = 0; s <= 3; s++) {
                            const a = (pass * Math.PI) / 3 + (s / 3) * Math.PI * 2;
                            const px = Math.cos(a) * ringR * 0.88;
                            const py = Math.sin(a) * ringR * 0.88;
                            if (s === 0) ctx.moveTo(px, py);
                            else ctx.lineTo(px, py);
                        }
                        ctx.strokeStyle = pass === 0 ? color.glow : color.secondary;
                        ctx.lineWidth = 2;
                        ctx.stroke();
                    }
                    ctx.restore();

                    // 중앙 일러스트 문장 홀로그램
                    const emblemScale = p < 0.6 ? 0.6 + p * 0.7 : 1.02 + (p - 0.6) * 1.2;
                    const emblemAlpha = p < 0.7 ? 1 : Math.max(0, 1 - (p - 0.7) * 3.3);
                    ctx.save();
                    ctx.globalCompositeOperation = 'source-over';
                    ctx.globalAlpha = emblemAlpha;
                    ctx.translate(cx, cy);
                    ctx.scale(emblemScale, emblemScale);
                    ctx.shadowColor = color.glow;
                    ctx.shadowBlur = 24;
                    ctx.drawImage(loadedIllust, -imgSize / 2, -imgSize / 2, imgSize, imgSize);
                    ctx.restore();
                } else {
                    // 3) 천공 거대 강하 타격
                    const dropP = Math.min(1, p * 1.6);
                    const curY = -90 + dropP * 95;
                    const alpha = p < 0.75 ? 1 : Math.max(0, 1 - (p - 0.75) * 4);
                    ctx.save();
                    ctx.globalCompositeOperation = 'source-over';
                    ctx.globalAlpha = alpha;
                    ctx.translate(cx, cy + curY);
                    ctx.scale(1.25, 1.25);
                    ctx.shadowColor = color.primary;
                    ctx.shadowBlur = 22;
                    ctx.drawImage(loadedIllust, -imgSize / 2, -imgSize / 2, imgSize, imgSize);
                    ctx.restore();

                    if (dropP >= 0.85) {
                        const impP = (p - 0.5) * 2;
                        ctx.save();
                        ctx.strokeStyle = color.glow;
                        ctx.lineWidth = Math.max(1, (1 - impP) * 6);
                        ctx.beginPath();
                        ctx.ellipse(cx, cy + 35, 30 + impP * 85, 12 + impP * 32, 0, 0, Math.PI * 2);
                        ctx.stroke();
                        ctx.restore();
                    }
                }
            } else {
                // ============================================================
                // 모드 1: 하이퍼 캔버스 시그니처 파티클 (7종)
                // ============================================================
                if (selectedShape === 'slash') {
                    // 이중 차원 절단 검기 + 유리 균열
                    const sweep = p * Math.PI * 1.35;
                    drawBladeArc(
                        ctx,
                        cx,
                        cy,
                        68 + p * 24,
                        -Math.PI * 0.85,
                        -Math.PI * 0.85 + sweep,
                        (1 - p * 0.55) * 22 * intensity,
                        color.primary,
                        color.glow
                    );
                    if (p > 0.25) {
                        const sp2 = (p - 0.25) / 0.75;
                        drawBladeArc(
                            ctx,
                            cx,
                            cy,
                            62 + sp2 * 26,
                            Math.PI * 0.15,
                            Math.PI * 0.15 + sp2 * Math.PI * 1.2,
                            (1 - sp2 * 0.6) * 16 * intensity,
                            color.secondary,
                            '#ffffff'
                        );
                    }
                } else if (selectedShape === 'burst') {
                    // 초신성 중력 수축 후 대폭발
                    if (p < 0.3) {
                        const ip = p / 0.3;
                        const r = (1 - ip) * 90 + 12;
                        ctx.strokeStyle = color.primary;
                        ctx.lineWidth = 4;
                        ctx.beginPath();
                        ctx.arc(cx, cy, r, 0, Math.PI * 2);
                        ctx.stroke();
                    } else {
                        const ep = (p - 0.3) / 0.7;
                        const r = (15 + ep * 100) * intensity;
                        const grad = ctx.createRadialGradient(cx, cy, 2, cx, cy, r);
                        grad.addColorStop(0, '#ffffff');
                        grad.addColorStop(0.35, color.glow);
                        grad.addColorStop(0.7, color.primary);
                        grad.addColorStop(1, 'transparent');
                        ctx.globalAlpha = Math.max(0, 1 - ep * 0.85);
                        ctx.fillStyle = grad;
                        ctx.beginPath();
                        ctx.arc(cx, cy, r, 0, Math.PI * 2);
                        ctx.fill();

                        ctx.strokeStyle = '#ffffff';
                        ctx.lineWidth = Math.max(1, (1 - ep) * 6);
                        ctx.beginPath();
                        ctx.arc(cx, cy, r * 0.92, 0, Math.PI * 2);
                        ctx.stroke();
                    }
                } else if (selectedShape === 'beam') {
                    // 천공 프랙탈 뇌전 & 광선
                    const beamW = Math.sin(p * Math.PI) * 32 * intensity;
                    const grad = ctx.createLinearGradient(cx - beamW, 0, cx + beamW, 0);
                    grad.addColorStop(0, 'transparent');
                    grad.addColorStop(0.25, color.primary);
                    grad.addColorStop(0.5, '#ffffff');
                    grad.addColorStop(0.75, color.primary);
                    grad.addColorStop(1, 'transparent');
                    ctx.fillStyle = grad;
                    ctx.fillRect(cx - beamW, 8, beamW * 2, h - 16);

                    // 프랙탈 지그재그 번개 3줄기
                    for (let b = 0; b < 3; b++) {
                        ctx.beginPath();
                        let bx = cx + (b - 1) * 28;
                        ctx.moveTo(bx, 10);
                        for (let seg = 1; seg <= 8; seg++) {
                            const sy = 10 + (seg / 8) * (h - 25);
                            const sx = cx + Math.sin(f * 7 + b * 13 + seg * 19) * 34 * intensity;
                            ctx.lineTo(sx, sy);
                        }
                        ctx.strokeStyle = b === 1 ? '#ffffff' : color.glow;
                        ctx.lineWidth = b === 1 ? 4 : 2.5;
                        ctx.shadowColor = color.primary;
                        ctx.shadowBlur = 12;
                        ctx.stroke();
                    }
                } else if (selectedShape === 'vortex') {
                    // 기하학 6각 마법진 + 소용돌이
                    const r = (35 + Math.sin(p * Math.PI * 0.85) * 68) * intensity;
                    ctx.save();
                    ctx.translate(cx, cy);
                    ctx.rotate(p * Math.PI * 2.5);
                    ctx.strokeStyle = color.primary;
                    ctx.lineWidth = 3;
                    ctx.beginPath();
                    ctx.arc(0, 0, r, 0, Math.PI * 2);
                    ctx.stroke();

                    for (let pass = 0; pass < 2; pass++) {
                        ctx.beginPath();
                        for (let s = 0; s <= 3; s++) {
                            const a = (pass * Math.PI) / 3 + (s / 3) * Math.PI * 2;
                            const px = Math.cos(a) * r * 0.86;
                            const py = Math.sin(a) * r * 0.86;
                            if (s === 0) ctx.moveTo(px, py);
                            else ctx.lineTo(px, py);
                        }
                        ctx.strokeStyle = pass === 0 ? '#ffffff' : color.secondary;
                        ctx.lineWidth = 2;
                        ctx.stroke();
                    }
                    ctx.restore();
                } else if (selectedShape === 'projectile') {
                    // 유성우 / 이기어검 집중 폭격
                    for (let m = 0; m < 5; m++) {
                        const mp = (p - m * 0.1) * 1.6;
                        if (mp <= 0 || mp >= 1) continue;
                        const ox = (m - 2) * 26;
                        const sx = cx + ox - 65;
                        const sy = cy - 95;
                        const ex = cx + ox + 15;
                        const ey = cy + 35;
                        const curX = sx + (ex - sx) * mp;
                        const curY = sy + (ey - sy) * mp;

                        ctx.strokeStyle = m % 2 === 0 ? '#ffffff' : color.primary;
                        ctx.lineWidth = 6 * intensity;
                        ctx.lineCap = 'round';
                        ctx.beginPath();
                        ctx.moveTo(curX - 28, curY - 42);
                        ctx.lineTo(curX, curY);
                        ctx.stroke();

                        ctx.fillStyle = '#ffffff';
                        ctx.beginPath();
                        ctx.arc(curX, curY, 5 * intensity, 0, Math.PI * 2);
                        ctx.fill();
                    }
                } else if (selectedShape === 'quake') {
                    // 대지 수정 기둥 분출
                    const spikeCount = 5;
                    for (let i = 0; i < spikeCount; i++) {
                        const offset = (i - 2) * 26 * intensity;
                        const height = (55 + (i % 2) * 35) * Math.sin(p * Math.PI) * 1.45 * intensity;
                        const wHalf = 13 * intensity;

                        ctx.beginPath();
                        ctx.moveTo(cx + offset - wHalf, cy + 55);
                        ctx.lineTo(cx + offset, cy + 55 - height);
                        ctx.lineTo(cx + offset + wHalf, cy + 55);
                        ctx.closePath();

                        const grad = ctx.createLinearGradient(cx + offset, cy + 55, cx + offset, cy + 55 - height);
                        grad.addColorStop(0, color.secondary);
                        grad.addColorStop(0.6, color.primary);
                        grad.addColorStop(1, '#ffffff');
                        ctx.fillStyle = grad;
                        ctx.fill();
                    }
                } else if (selectedShape === 'cross') {
                    // 십자 차원 섬광
                    const len = (25 + Math.sin(p * Math.PI) * 95) * intensity;
                    const thick = Math.max(2, (1 - p * 0.7) * 22 * intensity);
                    ctx.save();
                    ctx.translate(cx, cy);
                    ctx.rotate(p * 0.35);
                    ctx.fillStyle = color.primary;
                    ctx.shadowColor = color.glow;
                    ctx.shadowBlur = 18;
                    ctx.beginPath();
                    ctx.ellipse(0, 0, len, thick * 0.45, 0, 0, Math.PI * 2);
                    ctx.ellipse(0, 0, thick * 0.45, len, 0, 0, Math.PI * 2);
                    ctx.fill();

                    ctx.fillStyle = '#ffffff';
                    ctx.beginPath();
                    ctx.ellipse(0, 0, len * 0.75, thick * 0.2, 0, 0, Math.PI * 2);
                    ctx.ellipse(0, 0, thick * 0.2, len * 0.75, 0, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.restore();
                }
            }

            // 공통 다이아몬드 빛 파편 & 스파크 파티클
            const pCount = Math.floor(particleDensity * 1.2);
            for (let i = 0; i < pCount; i++) {
                const angle = (i / pCount) * Math.PI * 2 + Math.sin(i * 77) * 0.35;
                const dist = (15 + ((i * 19) % 75) * p * 1.35) * intensity;
                const px = cx + Math.cos(angle) * dist;
                const py = cy + Math.sin(angle) * dist;
                const s = Math.max(0.8, (1 - p * 0.75) * ((i % 3) + 2) * intensity);

                ctx.fillStyle = i % 2 === 0 ? '#ffffff' : color.glow;
                ctx.beginPath();
                ctx.arc(px, py, s, 0, Math.PI * 2);
                ctx.fill();
            }

            ctx.restore();
            frames.push(canvas.toDataURL('image/webp', 0.9));
        }

        setGeneratedFrames(frames);
        setPreviewIndex(0);
        setIsGenerating(false);
    };

    useEffect(() => {
        if (isOpen) {
            generateProceduralFrames();
        }
    }, [isOpen, tabMode, selectedElement, selectedShape, illustMode, customImageUrl, removeBg, frameCount, intensity, particleDensity]);

    useEffect(() => {
        if (!isOpen || generatedFrames.length === 0 || !isPlaying) return;
        const timer = setInterval(() => {
            setPreviewIndex((prev) => (prev + 1) % generatedFrames.length);
        }, Math.max(20, frameDuration));

        return () => clearInterval(timer);
    }, [isOpen, generatedFrames, frameDuration, isPlaying]);

    const handleApply = () => {
        if (generatedFrames.length === 0) return;

        const newFrames: SkillAnimationFrame[] = generatedFrames.map((url, idx) => ({
            id: `frame_proc_${Date.now()}_${idx}`,
            imageUrl: url,
            x: 0,
            y: 0,
            width: 240,
            height: 240,
            scale: scale,
            rotation: 0,
            opacity: 1,
            duration: frameDuration,
            blendMode: tabMode === 'illust_synth' ? 'normal' : 'screen'
        }));

        onApplyFrames(newFrames);
        onClose();
        const label =
            tabMode === 'illust_synth'
                ? `[${ELEMENT_COLORS[selectedElement].name} ${ILLUST_MODE_NAMES[illustMode].name}] 일러스트 합성 이펙트`
                : `[${ELEMENT_COLORS[selectedElement].name} ${SHAPE_NAMES[selectedShape].name}] 하이퍼 캔버스 파티클`;
        showToast(`${label} (${newFrames.length}프레임)이 적용되었습니다!`, 'success');
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[300] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-2.5 sm:p-4 overflow-y-auto">
            <div className="w-full max-w-2xl rounded-2xl bg-slate-900 border border-purple-500/50 p-4 sm:p-5 shadow-2xl space-y-4 my-auto max-h-[95vh] overflow-y-auto custom-scrollbar">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-purple-950/80 border border-purple-500/50 flex items-center justify-center text-purple-400">
                            <Wand2 size={18} />
                        </div>
                        <div>
                            <h4 className="text-sm sm:text-base font-bold text-white flex items-center gap-1.5">
                                <span>안티그래비티 AI 캔버스 & 일러스트 합성 엔진 2.0</span>
                                <span className="px-1.5 py-0.5 rounded bg-purple-950 text-purple-300 text-[10px] font-bold border border-purple-800">60FPS 최적화</span>
                            </h4>
                            <p className="text-[11px] text-slate-400">
                                시그니처 파티클을 생성하거나, 내 일러스트/아이콘 1장을 넣어 화려한 연속 프레임 이펙트로 합성합니다.
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

                {/* Mode Switcher */}
                <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1.5 rounded-xl border border-slate-800">
                    <button
                        type="button"
                        onClick={() => setTabMode('procedural')}
                        className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                            tabMode === 'procedural'
                                ? 'bg-purple-600 text-white shadow'
                                : 'text-slate-400 hover:text-slate-200'
                        }`}
                    >
                        <Sparkles size={14} />
                        <span>⚡ 시그니처 캔버스 파티클 (이미지 불필요)</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setTabMode('illust_synth')}
                        className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                            tabMode === 'illust_synth'
                                ? 'bg-pink-600 text-white shadow'
                                : 'text-slate-400 hover:text-slate-200'
                        }`}
                    >
                        <ImageIcon size={14} />
                        <span>🖼️ 내 일러스트/아이콘으로 이펙트 합성</span>
                    </button>
                </div>

                {/* 1. Element Selector (8가지 속성) */}
                <div className="space-y-1.5">
                    <span className="text-xs font-bold text-slate-300 flex items-center gap-1">
                        <Sparkles size={13} className="text-purple-400" />
                        <span>1단계: 오라 & 파티클 속성 선택</span>
                    </span>
                    <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5">
                        {(Object.keys(ELEMENT_COLORS) as ParticleElement[]).map((elem) => {
                            const conf = ELEMENT_COLORS[elem];
                            const isSel = selectedElement === elem;
                            return (
                                <button
                                    key={elem}
                                    onClick={() => setSelectedElement(elem)}
                                    className={`py-2 rounded-xl text-xs font-bold border transition-all flex flex-col items-center justify-center gap-1 ${
                                        isSel
                                            ? 'bg-slate-800 border-purple-400 shadow-md scale-105'
                                            : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-400'
                                    }`}
                                >
                                    <div
                                        className="w-3.5 h-3.5 rounded-full shadow"
                                        style={{ backgroundColor: conf.primary }}
                                    />
                                    <span className={isSel ? conf.text : 'text-slate-300'}>{conf.name}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* 2. Shape or Illustration Mode Selector */}
                {tabMode === 'procedural' ? (
                    <div className="space-y-1.5">
                        <span className="text-xs font-bold text-slate-300 flex items-center gap-1">
                            <Zap size={13} className="text-amber-400" />
                            <span>2단계: 하이퍼 캔버스 시그니처 형태 선택</span>
                        </span>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                            {(Object.keys(SHAPE_NAMES) as ParticleShape[]).map((sh) => {
                                const info = SHAPE_NAMES[sh];
                                const isSel = selectedShape === sh;
                                return (
                                    <button
                                        key={sh}
                                        onClick={() => setSelectedShape(sh)}
                                        className={`p-2 rounded-xl text-left border transition-all ${
                                            isSel
                                                ? 'bg-purple-950/60 border-purple-400 shadow-md'
                                                : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                                        }`}
                                    >
                                        <div className="text-xs font-bold text-white flex items-center justify-between">
                                            <span>{info.name}</span>
                                            {isSel && <Check size={12} className="text-purple-400" />}
                                        </div>
                                        <p className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">{info.desc}</p>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                ) : (
                    <div className="space-y-3 bg-slate-950/60 p-3 rounded-xl border border-pink-500/30">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <span className="text-xs font-bold text-pink-300 flex items-center gap-1.5">
                                <Layers size={14} />
                                <span>2단계: 합성할 일러스트/무기/아이콘 이미지 (1장)</span>
                            </span>
                            <div className="flex items-center gap-2">
                                <label className="flex items-center gap-1 text-[11px] text-slate-300 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={removeBg}
                                        onChange={(e) => setRemoveBg(e.target.checked)}
                                        className="rounded accent-pink-500"
                                    />
                                    <span>단색 배경 자동 투명화</span>
                                </label>
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="px-2.5 py-1 rounded-lg bg-pink-600 hover:bg-pink-500 text-white text-[11px] font-bold flex items-center gap-1"
                                >
                                    <Upload size={12} />
                                    <span>내 기기 이미지 선택</span>
                                </button>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    onChange={handleFileUpload}
                                    className="hidden"
                                />
                            </div>
                        </div>
                        <input
                            type="text"
                            value={customImageUrl}
                            onChange={(e) => setCustomImageUrl(e.target.value)}
                            placeholder="https://... 캐릭터 일러스트, 무기, 스킬 아이콘 URL을 붙여넣거나 파일을 업로드하세요"
                            className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-pink-500"
                        />
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
                            {(Object.keys(ILLUST_MODE_NAMES) as IllustSynthMode[]).map((m) => {
                                const info = ILLUST_MODE_NAMES[m];
                                const isSel = illustMode === m;
                                return (
                                    <button
                                        key={m}
                                        type="button"
                                        onClick={() => setIllustMode(m)}
                                        className={`p-2 rounded-xl text-left border transition-all ${
                                            isSel
                                                ? 'bg-pink-950/60 border-pink-400 shadow-md'
                                                : 'bg-slate-900/70 border-slate-800 hover:border-slate-700'
                                        }`}
                                    >
                                        <div className="text-xs font-bold text-white flex items-center justify-between">
                                            <span>{info.name}</span>
                                            {isSel && <Check size={12} className="text-pink-400" />}
                                        </div>
                                        <p className="text-[10px] text-slate-400 mt-0.5 leading-snug">{info.desc}</p>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* 3. Sliders & Fine Tuning */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 bg-slate-950/70 p-3 rounded-xl border border-slate-800/80 text-xs">
                    <div className="space-y-1">
                        <div className="flex justify-between text-slate-300 font-bold">
                            <span>프레임 수</span>
                            <span className="text-purple-300">{frameCount}프레임</span>
                        </div>
                        <input
                            type="range"
                            min={6}
                            max={16}
                            value={frameCount}
                            onChange={(e) => setFrameCount(Number(e.target.value))}
                            className="w-full accent-purple-500 h-1.5 bg-slate-800 rounded-lg"
                        />
                    </div>

                    <div className="space-y-1">
                        <div className="flex justify-between text-slate-300 font-bold">
                            <span>재생 속도 (프레임당 ms)</span>
                            <span className="text-amber-300">{frameDuration}ms</span>
                        </div>
                        <input
                            type="range"
                            min={20}
                            max={100}
                            step={5}
                            value={frameDuration}
                            onChange={(e) => setFrameDuration(Number(e.target.value))}
                            className="w-full accent-amber-500 h-1.5 bg-slate-800 rounded-lg"
                        />
                    </div>

                    <div className="space-y-1">
                        <div className="flex justify-between text-slate-300 font-bold">
                            <span>광원 / 스케일 강도</span>
                            <span className="text-cyan-300">{intensity.toFixed(1)}x</span>
                        </div>
                        <input
                            type="range"
                            min={0.8}
                            max={2.0}
                            step={0.1}
                            value={intensity}
                            onChange={(e) => setIntensity(Number(e.target.value))}
                            className="w-full accent-cyan-500 h-1.5 bg-slate-800 rounded-lg"
                        />
                    </div>
                </div>

                {/* 4. Live Preview Area */}
                <div className="space-y-2 pt-1 border-t border-slate-800">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                            <Sparkles size={13} className="text-purple-400" />
                            <span>실시간 렌더링 미리보기 (#{previewIndex + 1}/{generatedFrames.length})</span>
                        </span>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={generateProceduralFrames}
                                className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[11px] text-slate-300 flex items-center gap-1"
                            >
                                <RefreshCw size={11} className={isGenerating ? 'animate-spin' : ''} />
                                <span>재생성</span>
                            </button>
                            <button
                                onClick={() => setIsPlaying(!isPlaying)}
                                className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[11px] text-slate-300 flex items-center gap-1"
                            >
                                <Play size={11} />
                                <span>{isPlaying ? '일시정지' : '재생'}</span>
                            </button>
                        </div>
                    </div>

                    <div className="w-full h-44 rounded-xl border border-purple-500/40 bg-slate-950 flex items-center justify-center relative overflow-hidden shadow-inner">
                        <div className="absolute inset-0 bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:12px_12px] opacity-30 pointer-events-none" />
                        {generatedFrames[previewIndex] && (
                            <img
                                src={generatedFrames[previewIndex]}
                                alt="프로시저럴 파티클 미리보기"
                                className="max-h-40 max-w-40 object-contain"
                                style={{ mixBlendMode: tabMode === 'illust_synth' ? 'normal' : 'screen' }}
                            />
                        )}
                    </div>

                    <div className="flex gap-1.5 overflow-x-auto custom-scrollbar py-1">
                        {generatedFrames.map((url, i) => (
                            <div
                                key={i}
                                onClick={() => {
                                    setPreviewIndex(i);
                                    setIsPlaying(false);
                                }}
                                className={`w-11 h-11 shrink-0 rounded-lg border cursor-pointer p-0.5 bg-slate-950 flex items-center justify-center transition-all ${
                                    previewIndex === i ? 'border-purple-400 bg-purple-950/60 scale-105' : 'border-slate-800 hover:border-slate-600 opacity-70'
                                }`}
                            >
                                <img src={url} alt={`f_${i}`} className="max-w-full max-h-full object-contain" />
                            </div>
                        ))}
                    </div>
                </div>

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
                        disabled={generatedFrames.length === 0}
                        className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:opacity-50 text-white text-xs font-bold shadow-lg flex items-center gap-1.5"
                    >
                        <Check size={14} />
                        <span>이펙트 프레임 적용하기</span>
                    </button>
                </div>
            </div>
        </div>
    );
};
