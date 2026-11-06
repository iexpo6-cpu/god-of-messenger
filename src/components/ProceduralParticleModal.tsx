import React, { useState, useEffect, useRef } from 'react';
import { 
    Sparkles, Flame, Zap, Shield, Wand2, Play, Check, X, RefreshCw, Sliders, RotateCcw
} from 'lucide-react';
import { SkillAnimationFrame } from '../types';

interface ProceduralParticleModalProps {
    isOpen: boolean;
    onClose: () => void;
    onApplyFrames: (frames: SkillAnimationFrame[]) => void;
    showToast: (msg: string, type?: 'success' | 'warning' | 'info') => void;
}

// 8가지 속성 정의
export type ParticleElement = 'fire' | 'ice' | 'lightning' | 'holy' | 'dark' | 'wind' | 'earth' | 'arcane';

// 7가지 형태 정의
export type ParticleShape = 'slash' | 'burst' | 'beam' | 'vortex' | 'projectile' | 'quake' | 'cross';

const ELEMENT_COLORS: Record<ParticleElement, { name: string; primary: string; secondary: string; glow: string; text: string }> = {
    fire: { name: '화염', primary: '#f97316', secondary: '#ef4444', glow: '#fbbf24', text: 'text-orange-400' },
    ice: { name: '빙결', primary: '#38bdf8', secondary: '#0284c7', glow: '#e0f2fe', text: 'text-cyan-400' },
    lightning: { name: '전격', primary: '#fbbf24', secondary: '#38bdf8', glow: '#ffffff', text: 'text-yellow-400' },
    holy: { name: '신성', primary: '#fde047', secondary: '#eab308', glow: '#ffffff', text: 'text-amber-300' },
    dark: { name: '암흑', primary: '#a855f7', secondary: '#6b21a8', glow: '#c084fc', text: 'text-purple-400' },
    wind: { name: '질풍', primary: '#34d399', secondary: '#059669', glow: '#a7f3d0', text: 'text-emerald-400' },
    earth: { name: '대지', primary: '#d97706', secondary: '#78350f', glow: '#fbbf24', text: 'text-amber-500' },
    arcane: { name: '비전', primary: '#ec4899', secondary: '#8b5cf6', glow: '#f472b6', text: 'text-pink-400' }
};

const SHAPE_NAMES: Record<ParticleShape, { name: string; desc: string }> = {
    slash: { name: '궤적 참격', desc: '날카로운 호를 그리며 적을 베어 가르는 검기' },
    burst: { name: '방사 폭발', desc: '중심에서 바깥으로 터져 나오는 충격파와 파편' },
    beam: { name: '관통 광선', desc: '상공이나 전방에서 꽂히는 강력한 레이저/낙뢰' },
    vortex: { name: '소용돌이', desc: '대상을 휘감으며 회전하는 원형 마력 폭풍' },
    projectile: { name: '유도 탄환', desc: '적에게 궤적을 그리며 쇄도하는 에너지 탄' },
    quake: { name: '대지 분출', desc: '바닥에서 솟구쳐 오르는 파편과 충격파' },
    cross: { name: '십자 섬광', desc: '가로/세로로 교차하며 폭발하는 십자 형태의 빛' }
};

export const ProceduralParticleModal: React.FC<ProceduralParticleModalProps> = ({
    isOpen,
    onClose,
    onApplyFrames,
    showToast
}) => {
    const [selectedElement, setSelectedElement] = useState<ParticleElement>('holy');
    const [selectedShape, setSelectedShape] = useState<ParticleShape>('slash');
    const [frameCount, setFrameCount] = useState<number>(7);
    const [frameDuration, setFrameDuration] = useState<number>(70);
    const [intensity, setIntensity] = useState<number>(1.2);
    const [particleDensity, setParticleDensity] = useState<number>(30);
    const [scale, setScale] = useState<number>(1.2);

    // 생성된 프레임
    const [generatedFrames, setGeneratedFrames] = useState<string[]>([]);
    const [previewIndex, setPreviewIndex] = useState<number>(0);
    const [isPlaying, setIsPlaying] = useState<boolean>(true);
    const [isGenerating, setIsGenerating] = useState<boolean>(false);

    // 캔버스 기반 프로시저럴 프레임 생성 로직
    const generateProceduralFrames = () => {
        setIsGenerating(true);
        const w = 240;
        const h = 240;
        const cx = w / 2;
        const cy = h / 2;
        const color = ELEMENT_COLORS[selectedElement];
        const frames: string[] = [];

        for (let f = 0; f < frameCount; f++) {
            const progress = f / Math.max(1, frameCount - 1); // 0.0 ~ 1.0
            const canvas = document.createElement('canvas');
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext('2d');
            if (!ctx) continue;

            ctx.clearRect(0, 0, w, h);

            // Shape별 캔버스 드로잉 알고리즘
            if (selectedShape === 'slash') {
                // 참격 검기
                const startAngle = -Math.PI * 0.75 + progress * Math.PI * 0.3;
                const endAngle = startAngle + (0.3 + progress * 0.7) * Math.PI * 0.8;
                const radius = 60 + progress * 20;

                ctx.save();
                ctx.translate(cx, cy);
                ctx.rotate((progress - 0.5) * 0.2);

                // Glow arc
                ctx.beginPath();
                ctx.arc(0, 0, radius, startAngle, endAngle);
                ctx.strokeStyle = color.primary;
                ctx.lineWidth = 14 * intensity * (1 - progress * 0.4);
                ctx.lineCap = 'round';
                ctx.shadowColor = color.glow;
                ctx.shadowBlur = 18 * intensity;
                ctx.stroke();

                // Core arc
                ctx.beginPath();
                ctx.arc(0, 0, radius, startAngle + 0.1, endAngle - 0.05);
                ctx.strokeStyle = color.glow;
                ctx.lineWidth = 5 * intensity;
                ctx.lineCap = 'round';
                ctx.stroke();

                // Slashing sparks
                const sparkCount = Math.floor(particleDensity * (1 - Math.abs(progress - 0.5) * 0.8));
                for (let i = 0; i < sparkCount; i++) {
                    const angle = startAngle + Math.random() * (endAngle - startAngle);
                    const dist = radius + (Math.random() - 0.5) * 40 * intensity;
                    const px = Math.cos(angle) * dist;
                    const py = Math.sin(angle) * dist;
                    const size = Math.random() * 3.5 * intensity + 1;

                    ctx.fillStyle = Math.random() > 0.4 ? color.glow : color.secondary;
                    ctx.beginPath();
                    ctx.arc(px, py, size, 0, Math.PI * 2);
                    ctx.fill();
                }
                ctx.restore();
            } else if (selectedShape === 'burst') {
                // 폭발
                const currentRadius = (progress * 90 + 10) * intensity;
                const alpha = progress < 0.2 ? progress * 5 : 1 - (progress - 0.2) * 1.25;

                ctx.save();
                ctx.translate(cx, cy);
                ctx.globalAlpha = Math.max(0, Math.min(1, alpha));

                // Core flash
                const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, currentRadius);
                grad.addColorStop(0, color.glow);
                grad.addColorStop(0.4, color.primary);
                grad.addColorStop(0.8, color.secondary);
                grad.addColorStop(1, 'transparent');

                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.arc(0, 0, currentRadius, 0, Math.PI * 2);
                ctx.fill();

                // Explosion shockwave ring
                ctx.beginPath();
                ctx.arc(0, 0, currentRadius * 0.9, 0, Math.PI * 2);
                ctx.strokeStyle = color.glow;
                ctx.lineWidth = 4 * (1 - progress);
                ctx.shadowColor = color.primary;
                ctx.shadowBlur = 10;
                ctx.stroke();

                // Flying particles
                const count = particleDensity * 2;
                for (let i = 0; i < count; i++) {
                    const angle = (i / count) * Math.PI * 2 + (Math.sin(i * 99) * 0.3);
                    const speed = (60 + Math.sin(i * 33) * 40) * progress * intensity;
                    const px = Math.cos(angle) * speed;
                    const py = Math.sin(angle) * speed;
                    const size = (3.5 - progress * 2.5) * intensity;

                    ctx.fillStyle = i % 2 === 0 ? color.glow : color.primary;
                    ctx.beginPath();
                    ctx.arc(px, py, Math.max(0.5, size), 0, Math.PI * 2);
                    ctx.fill();
                }
                ctx.restore();
            } else if (selectedShape === 'beam') {
                // 관통 레이저 / 낙뢰
                const alpha = progress < 0.2 ? progress * 5 : (1 - progress);
                const beamWidth = (18 + Math.sin(progress * Math.PI) * 22) * intensity;

                ctx.save();
                ctx.translate(cx, cy);
                ctx.globalAlpha = Math.max(0, Math.min(1, alpha));

                // Main vertical beam
                const grad = ctx.createLinearGradient(-beamWidth, 0, beamWidth, 0);
                grad.addColorStop(0, 'transparent');
                grad.addColorStop(0.2, color.secondary);
                grad.addColorStop(0.5, color.glow);
                grad.addColorStop(0.8, color.secondary);
                grad.addColorStop(1, 'transparent');

                ctx.fillStyle = grad;
                ctx.fillRect(-beamWidth, -h / 2, beamWidth * 2, h);

                // Ground impact circle
                ctx.beginPath();
                ctx.ellipse(0, h * 0.35, beamWidth * 1.8, beamWidth * 0.6, 0, 0, Math.PI * 2);
                ctx.fillStyle = color.glow;
                ctx.shadowColor = color.primary;
                ctx.shadowBlur = 15;
                ctx.fill();

                // Electric zigzags / sparks
                const count = Math.floor(particleDensity);
                for (let i = 0; i < count; i++) {
                    const py = -h * 0.45 + (i / count) * h * 0.9;
                    const px = (Math.random() - 0.5) * beamWidth * 2.2;
                    ctx.fillStyle = color.glow;
                    ctx.fillRect(px, py, Math.random() * 3 + 1, Math.random() * 8 + 2);
                }
                ctx.restore();
            } else if (selectedShape === 'vortex') {
                // 소용돌이
                const baseAngle = progress * Math.PI * 3;
                const alpha = 1 - Math.pow(progress - 0.4, 2) * 2.5;

                ctx.save();
                ctx.translate(cx, cy);
                ctx.globalAlpha = Math.max(0, Math.min(1, alpha));

                // 4 spiral arms
                for (let arm = 0; arm < 4; arm++) {
                    const armOffset = (arm * Math.PI) / 2;
                    ctx.beginPath();
                    for (let step = 0; step < 25; step++) {
                        const t = step / 25;
                        const r = (15 + t * 80) * intensity;
                        const theta = baseAngle + armOffset + t * Math.PI * 1.5;
                        const x = Math.cos(theta) * r;
                        const y = Math.sin(theta) * r;
                        if (step === 0) ctx.moveTo(x, y);
                        else ctx.lineTo(x, y);
                    }
                    ctx.strokeStyle = arm % 2 === 0 ? color.primary : color.secondary;
                    ctx.lineWidth = (8 - progress * 4) * intensity;
                    ctx.lineCap = 'round';
                    ctx.shadowColor = color.glow;
                    ctx.shadowBlur = 12;
                    ctx.stroke();
                }

                // Swirling particles
                for (let i = 0; i < particleDensity; i++) {
                    const r = (Math.random() * 80 + 10) * intensity;
                    const theta = baseAngle * 1.5 + (i / particleDensity) * Math.PI * 2;
                    const px = Math.cos(theta) * r;
                    const py = Math.sin(theta) * r;
                    ctx.fillStyle = color.glow;
                    ctx.beginPath();
                    ctx.arc(px, py, Math.random() * 2.5 + 1, 0, Math.PI * 2);
                    ctx.fill();
                }
                ctx.restore();
            } else if (selectedShape === 'projectile') {
                // 투사체 에너지 탄환
                const xPos = -w * 0.35 + progress * w * 0.7;
                const yPos = 0 + Math.sin(progress * Math.PI * 2) * 15;
                const alpha = progress < 0.1 ? progress * 10 : progress > 0.85 ? (1 - progress) * 6.6 : 1;

                ctx.save();
                ctx.translate(cx + xPos, cy + yPos);
                ctx.globalAlpha = Math.max(0, Math.min(1, alpha));

                // Tail trail
                for (let t = 1; t <= 6; t++) {
                    ctx.beginPath();
                    ctx.arc(-t * 12 * intensity, 0, Math.max(1, (16 - t * 2.5) * intensity), 0, Math.PI * 2);
                    ctx.fillStyle = t % 2 === 0 ? color.secondary : color.primary;
                    ctx.globalAlpha = Math.max(0, 0.7 - t * 0.1);
                    ctx.fill();
                }

                // Core orb
                ctx.globalAlpha = 1;
                ctx.beginPath();
                ctx.arc(0, 0, 18 * intensity, 0, Math.PI * 2);
                ctx.fillStyle = color.primary;
                ctx.shadowColor = color.glow;
                ctx.shadowBlur = 15;
                ctx.fill();

                ctx.beginPath();
                ctx.arc(0, 0, 9 * intensity, 0, Math.PI * 2);
                ctx.fillStyle = color.glow;
                ctx.fill();
                ctx.restore();
            } else if (selectedShape === 'quake') {
                // 대지 분출
                const alpha = 1 - progress * 0.8;
                ctx.save();
                ctx.translate(cx, cy + 40);
                ctx.globalAlpha = Math.max(0, Math.min(1, alpha));

                // Spikes shooting up
                const spikeCount = 5;
                for (let i = 0; i < spikeCount; i++) {
                    const offset = (i - 2) * 25 * intensity;
                    const height = (50 + Math.sin(i * 12) * 30) * Math.sin(progress * Math.PI) * 1.5 * intensity;
                    const wHalf = 12 * intensity;

                    ctx.beginPath();
                    ctx.moveTo(offset - wHalf, 0);
                    ctx.lineTo(offset, -height);
                    ctx.lineTo(offset + wHalf, 0);
                    ctx.closePath();

                    const grad = ctx.createLinearGradient(offset, 0, offset, -height);
                    grad.addColorStop(0, color.secondary);
                    grad.addColorStop(0.6, color.primary);
                    grad.addColorStop(1, color.glow);

                    ctx.fillStyle = grad;
                    ctx.shadowColor = color.glow;
                    ctx.shadowBlur = 10;
                    ctx.fill();
                }
                ctx.restore();
            } else if (selectedShape === 'cross') {
                // 십자 섬광
                const length = (20 + progress * 90) * intensity;
                const thick = (18 - progress * 12) * intensity;
                const alpha = progress < 0.2 ? progress * 5 : 1 - (progress - 0.2) * 1.25;

                ctx.save();
                ctx.translate(cx, cy);
                ctx.globalAlpha = Math.max(0, Math.min(1, alpha));

                // Horizontal & Vertical rays
                ctx.fillStyle = color.primary;
                ctx.shadowColor = color.glow;
                ctx.shadowBlur = 16;
                ctx.fillRect(-length, -thick / 2, length * 2, thick);
                ctx.fillRect(-thick / 2, -length, thick, length * 2);

                // Core bright cross
                ctx.fillStyle = color.glow;
                ctx.fillRect(-length * 0.8, -thick / 4, length * 1.6, thick / 2);
                ctx.fillRect(-thick / 4, -length * 0.8, thick / 2, length * 1.6);
                ctx.restore();
            }

            frames.push(canvas.toDataURL('image/png'));
        }

        setGeneratedFrames(frames);
        setPreviewIndex(0);
        setIsGenerating(false);
    };

    // 설정 변경 시 자동 재합성
    useEffect(() => {
        if (isOpen) {
            generateProceduralFrames();
        }
    }, [isOpen, selectedElement, selectedShape, frameCount, intensity, particleDensity]);

    // 애니메이션 미리보기 루프
    useEffect(() => {
        if (!isOpen || generatedFrames.length === 0 || !isPlaying) return;
        const timer = setInterval(() => {
            setPreviewIndex((prev) => (prev + 1) % generatedFrames.length);
        }, Math.max(30, frameDuration));

        return () => clearInterval(timer);
    }, [isOpen, generatedFrames, frameDuration, isPlaying]);

    // 프레임 적용
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
            blendMode: 'screen'
        }));

        onApplyFrames(newFrames);
        onClose();
        showToast(`[${ELEMENT_COLORS[selectedElement].name} ${SHAPE_NAMES[selectedShape].name}] 프로시저럴 파티클(${newFrames.length}프레임)이 적용되었습니다!`, 'success');
    };

    if (!isOpen) return null;

    const currentElem = ELEMENT_COLORS[selectedElement];

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
                                <span>프로시저럴 캔버스 파티클 엔진</span>
                                <span className="px-1.5 py-0.5 rounded bg-purple-950 text-purple-300 text-[10px] font-bold border border-purple-800">이미지 없이 원클릭 생성</span>
                            </h4>
                            <p className="text-[11px] text-slate-400">
                                속성과 형태를 조합하여 고품질 파티클 애니메이션 프레임을 실시간으로 즉시 연산·생성합니다.
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

                {/* 1. Element Selector (8가지 속성) */}
                <div className="space-y-1.5">
                    <span className="text-xs font-bold text-slate-300 flex items-center gap-1">
                        <Sparkles size={13} className="text-purple-400" />
                        <span>1단계: 속성 원소 선택 (Element)</span>
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

                {/* 2. Shape Selector (7가지 형태) */}
                <div className="space-y-1.5">
                    <span className="text-xs font-bold text-slate-300 flex items-center gap-1">
                        <Zap size={13} className="text-amber-400" />
                        <span>2단계: 이펙트 형태 선택 (Shape)</span>
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

                {/* 3. Sliders & Fine Tuning */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 bg-slate-950/70 p-3 rounded-xl border border-slate-800/80 text-xs">
                    <div className="space-y-1">
                        <div className="flex justify-between text-slate-300 font-bold">
                            <span>프레임 수</span>
                            <span className="text-purple-300">{frameCount}프레임</span>
                        </div>
                        <input
                            type="range"
                            min={4}
                            max={12}
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
                            min={30}
                            max={150}
                            step={10}
                            value={frameDuration}
                            onChange={(e) => setFrameDuration(Number(e.target.value))}
                            className="w-full accent-amber-500 h-1.5 bg-slate-800 rounded-lg"
                        />
                    </div>

                    <div className="space-y-1">
                        <div className="flex justify-between text-slate-300 font-bold">
                            <span>광원 / 파티클 강도</span>
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
                            <span>실시간 파티클 렌더링 미리보기 (#{previewIndex + 1}/{generatedFrames.length})</span>
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

                    {/* Stage Preview */}
                    <div className="w-full h-44 rounded-xl border border-purple-500/40 bg-slate-950 flex items-center justify-center relative overflow-hidden shadow-inner">
                        {/* Checkerboard subtle overlay */}
                        <div className="absolute inset-0 bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:12px_12px] opacity-30 pointer-events-none" />
                        
                        {generatedFrames[previewIndex] && (
                            <img
                                src={generatedFrames[previewIndex]}
                                alt="프로시저럴 파티클 미리보기"
                                className="max-h-40 max-w-40 object-contain"
                                style={{ mixBlendMode: 'screen' }}
                            />
                        )}
                    </div>

                    {/* Frame Strip */}
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
                        className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 text-white text-xs font-bold shadow-lg flex items-center gap-1.5"
                    >
                        <Check size={14} />
                        <span>생성된 파티클 프레임 적용</span>
                    </button>
                </div>
            </div>
        </div>
    );
};
