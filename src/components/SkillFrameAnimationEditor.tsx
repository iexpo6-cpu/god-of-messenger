import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
    Skill, SkillAnimationFrame, SkillFrameAnimation, Character 
} from '../types';
import { 
    Play, Pause, SkipBack, SkipForward, RotateCcw, Plus, Trash2, 
    Copy, ArrowLeft, ArrowRight, Upload, Image as ImageIcon, 
    Layers, Move, Maximize2, Clock, Sparkles, Check, Eye, 
    Sliders, Film, Zap, Flame, FolderPlus, HelpCircle, Shield, CheckCircle2,
    Download, FolderOpen, Wand2, Scissors, Share2, FileText, X, RefreshCw, Grid, CloudUpload
} from 'lucide-react';
import { SkillFrameAnimationRenderer } from './CombatVFX';
import { SpriteSheetModal } from './SpriteSheetModal';
import { ProceduralParticleModal } from './ProceduralParticleModal';
import { uploadImageToWeb } from '../services/imageCacheService';

// 이미지 배경 투명화 (크로마키 / 컬러키 제휴 처리) 헬퍼 함수
export const processImageTransparency = (
    base64Url: string,
    targetMode: 'black' | 'white' | 'auto' | 'green' | 'custom',
    customHex: string,
    tolerancePercent: number,
    removeBorder?: boolean,
    borderColorHex?: string,
    borderTolerancePercent?: number
): Promise<string> => {
    return new Promise((resolve) => {
        if (!base64Url) return resolve(base64Url);
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const w = img.naturalWidth || img.width || 200;
            const h = img.naturalHeight || img.height || 200;
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext('2d');
            if (!ctx) return resolve(base64Url);

            ctx.drawImage(img, 0, 0);
            const imgData = ctx.getImageData(0, 0, w, h);
            const data = imgData.data;

            let rKey = 0, gKey = 0, bKey = 0;
            if (targetMode === 'black') {
                rKey = 0; gKey = 0; bKey = 0;
            } else if (targetMode === 'white') {
                rKey = 255; gKey = 255; bKey = 255;
            } else if (targetMode === 'green') {
                rKey = 0; gKey = 255; bKey = 0;
            } else if (targetMode === 'auto') {
                rKey = data[0]; gKey = data[1]; bKey = data[2];
            } else if (targetMode === 'custom' && customHex) {
                const cleanHex = customHex.replace('#', '');
                rKey = parseInt(cleanHex.substring(0, 2), 16) || 0;
                gKey = parseInt(cleanHex.substring(2, 4), 16) || 0;
                bKey = parseInt(cleanHex.substring(4, 6), 16) || 0;
            }

            const maxDist = 441.67;
            const threshold = (tolerancePercent / 100) * maxDist;

            // 테두리 감지 및 투명화 설정
            const isRemoveBorder = !!removeBorder;
            let rBorder = 0, gBorder = 0, bBorder = 0;
            let borderThreshold = 0;
            if (isRemoveBorder && borderColorHex) {
                const cleanBorderHex = borderColorHex.replace('#', '');
                rBorder = parseInt(cleanBorderHex.substring(0, 2), 16) || 0;
                gBorder = parseInt(cleanBorderHex.substring(2, 4), 16) || 0;
                bBorder = parseInt(cleanBorderHex.substring(4, 6), 16) || 0;
                borderThreshold = ((borderTolerancePercent || 20) / 100) * maxDist;
            }

            for (let i = 0; i < data.length; i += 4) {
                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];
                const dist = Math.sqrt(
                    Math.pow(r - rKey, 2) + 
                    Math.pow(g - gKey, 2) + 
                    Math.pow(b - bKey, 2)
                );

                if (dist <= threshold) {
                    data[i + 3] = 0; // 알파 채널 0으로 처리 (투명화)
                    continue;
                }

                // 테두리 색상 제거 처리
                if (isRemoveBorder) {
                    const borderDist = Math.sqrt(
                        Math.pow(r - rBorder, 2) + 
                        Math.pow(g - gBorder, 2) + 
                        Math.pow(b - bBorder, 2)
                    );
                    if (borderDist <= borderThreshold) {
                        data[i + 3] = 0; // 알파 채널 0으로 처리
                    }
                }
            }

            ctx.putImageData(imgData, 0, 0);
            resolve(canvas.toDataURL('image/png'));
        };
        img.onerror = () => resolve(base64Url);
        img.src = base64Url;
    });
};

/**
 * 프레임 이미지 자동 경량화 및 리사이징 압축 유틸리티
 * - 최대 360px 크기로 가로세로 비율 유지 다운샘플링
 * - WebP 또는 최적화 PNG로 변환하여 80~95% 용량 절감
 * - 투명도 알파 채널 완벽 보존
 */
export const optimizeFrameImage = (
    imageUrl: string,
    maxDim: number = 360,
    quality: number = 0.85
): Promise<{ optimizedUrl: string; originalBytes: number; optimizedBytes: number }> => {
    return new Promise((resolve) => {
        if (!imageUrl) {
            return resolve({ optimizedUrl: imageUrl, originalBytes: 0, optimizedBytes: 0 });
        }
        // SVG 데이터는 벡터이므로 압축 불필요
        if (imageUrl.startsWith('data:image/svg+xml')) {
            const bytes = imageUrl.length;
            return resolve({ optimizedUrl: imageUrl, originalBytes: bytes, optimizedBytes: bytes });
        }

        const originalBytes = imageUrl.length;
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.referrerPolicy = 'no-referrer';
        img.onload = () => {
            try {
                let w = img.naturalWidth || img.width || 200;
                let h = img.naturalHeight || img.height || 200;

                // 이미 가로세로가 360 이하이고 용량이 작다면 원본 유지
                if (w <= maxDim && h <= maxDim && originalBytes < 35000) {
                    return resolve({ optimizedUrl: imageUrl, originalBytes, optimizedBytes: originalBytes });
                }

                // 종횡비 유지 리사이징
                if (w > maxDim || h > maxDim) {
                    if (w > h) {
                        h = Math.round((h * maxDim) / w);
                        w = maxDim;
                    } else {
                        w = Math.round((w * maxDim) / h);
                        h = maxDim;
                    }
                }

                const canvas = document.createElement('canvas');
                canvas.width = Math.max(1, w);
                canvas.height = Math.max(1, h);
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    return resolve({ optimizedUrl: imageUrl, originalBytes, optimizedBytes: originalBytes });
                }

                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'high';
                ctx.drawImage(img, 0, 0, w, h);

                let optimizedUrl = canvas.toDataURL('image/webp', quality);
                if (!optimizedUrl.startsWith('data:image/webp')) {
                    optimizedUrl = canvas.toDataURL('image/png');
                }

                // 압축 후 용량이 원본보다 작을 때만 채택
                if (optimizedUrl.length < originalBytes || originalBytes > 100000) {
                    return resolve({
                        optimizedUrl,
                        originalBytes,
                        optimizedBytes: optimizedUrl.length
                    });
                }

                return resolve({ optimizedUrl: imageUrl, originalBytes, optimizedBytes: originalBytes });
            } catch (err) {
                console.warn('프레임 압축 처리 예외:', err);
                resolve({ optimizedUrl: imageUrl, originalBytes, optimizedBytes: originalBytes });
            }
        };
        img.onerror = () => {
            resolve({ optimizedUrl: imageUrl, originalBytes, optimizedBytes: originalBytes });
        };
        img.src = imageUrl;
    });
};

// 내장 추천 이펙트 스프라이트 프리셋 (SVG Data URI)
export const PRESET_FRAME_EFFECTS: { name: string; icon: string; frames: Omit<SkillAnimationFrame, 'id'>[] }[] = [
    {
        name: '신성 참격',
        icon: '⚔️',
        frames: [
            {
                imageUrl: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><defs><radialGradient id="g1" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="%23fff" /><stop offset="60%" stop-color="%23fde047" /><stop offset="100%" stop-color="%23ca8a04" stop-opacity="0" /></radialGradient></defs><circle cx="60" cy="140" r="30" fill="url(%23g1)" /><path d="M 40 160 Q 70 120 100 90" stroke="%23ffffff" stroke-width="4" stroke-linecap="round" fill="none" /></svg>`,
                x: -30,
                y: 20,
                width: 220,
                height: 220,
                scale: 0.8,
                rotation: -15,
                opacity: 0.9,
                duration: 70,
                blendMode: 'screen'
            },
            {
                imageUrl: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><defs><linearGradient id="g2" x1="0%" y1="100%" x2="100%" y2="0%"><stop offset="0%" stop-color="%23eab308" /><stop offset="40%" stop-color="%23fef08a" /><stop offset="70%" stop-color="%23ffffff" /><stop offset="100%" stop-color="%23facc15" /></linearGradient></defs><path d="M 20 180 Q 90 70 185 25" stroke="url(%23g2)" stroke-width="14" stroke-linecap="round" fill="none" style="filter:drop-shadow(0 0 12px %23fde047)" /><path d="M 25 175 Q 90 75 180 30" stroke="%23ffffff" stroke-width="5" stroke-linecap="round" fill="none" /><line x1="120" y1="50" x2="160" y2="20" stroke="%23ffffff" stroke-width="2" /><line x1="80" y1="90" x2="110" y2="70" stroke="%23ffffff" stroke-width="2" /></svg>`,
                x: 0,
                y: -5,
                width: 260,
                height: 260,
                scale: 1.25,
                rotation: 0,
                opacity: 1,
                duration: 90,
                blendMode: 'screen'
            },
            {
                imageUrl: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><defs><radialGradient id="g3"><stop offset="0%" stop-color="%23ffffff" /><stop offset="30%" stop-color="%23fef08a" /><stop offset="70%" stop-color="%23ca8a04" stop-opacity="0.8" /><stop offset="100%" stop-color="%23713f12" stop-opacity="0" /></radialGradient></defs><path d="M 40 160 Q 100 80 170 40" stroke="%23facc15" stroke-width="8" stroke-linecap="round" fill="none" opacity="0.6" /><circle cx="120" cy="70" r="45" fill="url(%23g3)" /><polygon points="120,20 128,62 170,70 128,78 120,120 112,78 70,70 112,62" fill="%23ffffff" opacity="0.9" /><circle cx="150" cy="50" r="4" fill="%23ffffff" /><circle cx="90" cy="100" r="5" fill="%23fef08a" /></svg>`,
                x: 15,
                y: -15,
                width: 280,
                height: 280,
                scale: 1.4,
                rotation: 10,
                opacity: 0.95,
                duration: 100,
                blendMode: 'screen'
            },
            {
                imageUrl: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><circle cx="130" cy="65" r="25" fill="%23fef08a" opacity="0.4" style="filter:blur(4px)" /><polygon points="130,45 133,62 150,65 133,68 130,85 127,68 110,65 127,62" fill="%23ffffff" opacity="0.7" /><circle cx="155" cy="40" r="2.5" fill="%23ffffff" /><circle cx="105" cy="90" r="3" fill="%23fde047" /><circle cx="160" cy="85" r="2" fill="%23ffffff" /></svg>`,
                x: 25,
                y: -20,
                width: 240,
                height: 240,
                scale: 1.1,
                rotation: 15,
                opacity: 0.6,
                duration: 80,
                blendMode: 'screen'
            }
        ]
    },
    {
        name: '폭렬 화염',
        icon: '🔥',
        frames: [
            {
                imageUrl: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><defs><radialGradient id="f1"><stop offset="0%" stop-color="%23fff" /><stop offset="60%" stop-color="%23f97316" /><stop offset="100%" stop-color="%23b91c1c" stop-opacity="0" /></radialGradient></defs><circle cx="100" cy="100" r="25" fill="url(%23f1)" /></svg>`,
                x: 0,
                y: 10,
                width: 160,
                height: 160,
                scale: 0.7,
                rotation: 0,
                opacity: 0.9,
                duration: 60,
                blendMode: 'screen'
            },
            {
                imageUrl: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><defs><radialGradient id="f2"><stop offset="0%" stop-color="%23fef08a" /><stop offset="40%" stop-color="%23ea580c" /><stop offset="80%" stop-color="%23dc2626" /><stop offset="100%" stop-color="%237f1d1d" stop-opacity="0" /></radialGradient></defs><circle cx="100" cy="100" r="50" fill="url(%23f2)" /><circle cx="100" cy="95" r="25" fill="%23ffffff" opacity="0.8" /></svg>`,
                x: 0,
                y: 5,
                width: 220,
                height: 220,
                scale: 1.1,
                rotation: 15,
                opacity: 1,
                duration: 80,
                blendMode: 'screen'
            },
            {
                imageUrl: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><defs><radialGradient id="f3"><stop offset="0%" stop-color="%23ffffff" /><stop offset="25%" stop-color="%23fef08a" /><stop offset="55%" stop-color="%23ea580c" /><stop offset="85%" stop-color="%23991b1b" /><stop offset="100%" stop-color="%23000" stop-opacity="0" /></radialGradient></defs><circle cx="100" cy="95" r="75" fill="url(%23f3)" /><circle cx="65" cy="75" r="30" fill="%23ea580c" opacity="0.8" /><circle cx="135" cy="70" r="32" fill="%23ea580c" opacity="0.8" /><circle cx="100" cy="55" r="28" fill="%23f97316" opacity="0.9" /><circle cx="100" cy="90" r="35" fill="%23ffffff" opacity="0.85" /></svg>`,
                x: 0,
                y: -10,
                width: 280,
                height: 280,
                scale: 1.5,
                rotation: -10,
                opacity: 1,
                duration: 100,
                blendMode: 'screen'
            },
            {
                imageUrl: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><defs><radialGradient id="f4"><stop offset="0%" stop-color="%23fef08a" /><stop offset="40%" stop-color="%23f97316" /><stop offset="70%" stop-color="%237f1d1d" /><stop offset="100%" stop-color="%23000" stop-opacity="0" /></radialGradient></defs><circle cx="100" cy="90" r="85" fill="url(%23f4)" opacity="0.75" /><circle cx="50" cy="60" r="18" fill="%23fbbf24" /><circle cx="150" cy="55" r="20" fill="%23fbbf24" /><circle cx="100" cy="30" r="16" fill="%23ea580c" /><circle cx="40" cy="120" r="12" fill="%23f87171" /><circle cx="160" cy="115" r="14" fill="%23f87171" /></svg>`,
                x: 0,
                y: -15,
                width: 300,
                height: 300,
                scale: 1.65,
                rotation: 20,
                opacity: 0.85,
                duration: 90,
                blendMode: 'screen'
            },
            {
                imageUrl: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><circle cx="100" cy="85" r="50" fill="%237f1d1d" opacity="0.3" style="filter:blur(6px)" /><circle cx="60" cy="50" r="5" fill="%23fbbf24" opacity="0.7" /><circle cx="140" cy="45" r="4" fill="%23fbbf24" opacity="0.8" /><circle cx="100" cy="35" r="4" fill="%23f87171" opacity="0.6" /><circle cx="80" cy="110" r="3" fill="%23ea580c" opacity="0.5" /></svg>`,
                x: 0,
                y: -20,
                width: 260,
                height: 260,
                scale: 1.3,
                rotation: 0,
                opacity: 0.5,
                duration: 80,
                blendMode: 'screen'
            }
        ]
    },
    {
        name: '청뢰 낙뢰',
        icon: '⚡',
        frames: [
            {
                imageUrl: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><ellipse cx="100" cy="160" rx="40" ry="15" fill="%230284c7" opacity="0.6" style="filter:blur(4px)" /><path d="M 90 160 L 110 160" stroke="%2338bdf8" stroke-width="4" /></svg>`,
                x: 0,
                y: 40,
                width: 180,
                height: 180,
                scale: 0.8,
                rotation: 0,
                opacity: 0.85,
                duration: 50,
                blendMode: 'screen'
            },
            {
                imageUrl: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><path d="M 105 10 L 95 65 L 115 80 L 90 135 L 105 140 L 95 185" stroke="%2338bdf8" stroke-width="12" stroke-linejoin="bevel" fill="none" style="filter:drop-shadow(0 0 10px %230ea5e9)" /><path d="M 105 10 L 95 65 L 115 80 L 90 135 L 105 140 L 95 185" stroke="%23ffffff" stroke-width="4" stroke-linejoin="bevel" fill="none" /><ellipse cx="95" cy="185" rx="55" ry="18" fill="%23bae6fd" opacity="0.8" /></svg>`,
                x: 0,
                y: -10,
                width: 250,
                height: 250,
                scale: 1.35,
                rotation: 0,
                opacity: 1,
                duration: 80,
                blendMode: 'screen'
            },
            {
                imageUrl: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><path d="M 100 15 L 90 70 L 115 85 L 85 140 L 100 145 L 95 185" stroke="%230284c7" stroke-width="8" fill="none" opacity="0.7" /><path d="M 95 185 L 50 160 M 95 185 L 140 165 M 95 185 L 80 195 M 95 185 L 115 195" stroke="%237dd3fc" stroke-width="4" stroke-linecap="round" fill="none" /><circle cx="95" cy="185" r="30" fill="%23ffffff" opacity="0.8" style="filter:blur(3px)" /></svg>`,
                x: 0,
                y: -5,
                width: 270,
                height: 270,
                scale: 1.45,
                rotation: 5,
                opacity: 0.95,
                duration: 90,
                blendMode: 'screen'
            },
            {
                imageUrl: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><circle cx="70" cy="165" r="3" fill="%2338bdf8" /><circle cx="125" cy="170" r="3.5" fill="%2338bdf8" /><circle cx="95" cy="150" r="2.5" fill="%23ffffff" /><circle cx="95" cy="185" r="15" fill="%230369a1" opacity="0.4" style="filter:blur(4px)" /></svg>`,
                x: 0,
                y: 10,
                width: 220,
                height: 220,
                scale: 1.1,
                rotation: 0,
                opacity: 0.6,
                duration: 70,
                blendMode: 'screen'
            }
        ]
    },
    {
        name: '암흑 심연',
        icon: '🌌',
        frames: [
            {
                imageUrl: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><defs><radialGradient id="d1"><stop offset="0%" stop-color="%231e1b4b" /><stop offset="60%" stop-color="%237c3aed" stop-opacity="0.8" /><stop offset="100%" stop-color="%23000" stop-opacity="0" /></radialGradient></defs><circle cx="100" cy="100" r="35" fill="url(%23d1)" /></svg>`,
                x: 0,
                y: 0,
                width: 180,
                height: 180,
                scale: 0.8,
                rotation: 0,
                opacity: 0.8,
                duration: 70,
                blendMode: 'screen'
            },
            {
                imageUrl: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><defs><radialGradient id="d2"><stop offset="0%" stop-color="%230f172a" /><stop offset="40%" stop-color="%23581c87" /><stop offset="80%" stop-color="%23c084fc" /><stop offset="100%" stop-color="%23000" stop-opacity="0" /></radialGradient></defs><circle cx="100" cy="100" r="65" fill="url(%23d2)" /><path d="M 60 100 Q 100 60 140 100 Q 100 140 60 100" fill="%23f3e8ff" opacity="0.7" /></svg>`,
                x: 0,
                y: 0,
                width: 240,
                height: 240,
                scale: 1.2,
                rotation: 30,
                opacity: 0.95,
                duration: 90,
                blendMode: 'screen'
            },
            {
                imageUrl: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><defs><radialGradient id="d3"><stop offset="0%" stop-color="%23000000" /><stop offset="30%" stop-color="%233b0764" /><stop offset="70%" stop-color="%239333ea" /><stop offset="90%" stop-color="%23e9d5ff" /><stop offset="100%" stop-color="%23000" stop-opacity="0" /></radialGradient></defs><circle cx="100" cy="100" r="85" fill="url(%23d3)" /><line x1="20" y1="100" x2="180" y2="100" stroke="%23ffffff" stroke-width="4" stroke-linecap="round" style="filter:drop-shadow(0 0 8px %23c084fc)" /><line x1="100" y1="20" x2="100" y2="180" stroke="%23c084fc" stroke-width="3" stroke-linecap="round" /></svg>`,
                x: 0,
                y: 0,
                width: 290,
                height: 290,
                scale: 1.5,
                rotation: -15,
                opacity: 1,
                duration: 110,
                blendMode: 'screen'
            },
            {
                imageUrl: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><circle cx="100" cy="100" r="60" fill="%23581c87" opacity="0.4" style="filter:blur(8px)" /><circle cx="70" cy="80" r="4" fill="%23c084fc" /><circle cx="130" cy="120" r="4" fill="%23e9d5ff" /><circle cx="120" cy="70" r="3" fill="%23c084fc" /><circle cx="80" cy="130" r="3" fill="%23e9d5ff" /></svg>`,
                x: 0,
                y: 0,
                width: 250,
                height: 250,
                scale: 1.25,
                rotation: 45,
                opacity: 0.6,
                duration: 80,
                blendMode: 'screen'
            }
        ]
    }
];

interface SkillFrameAnimationEditorProps {
    skill: Skill;
    character: Character;
    isAllowedToCustomize: boolean;
    onSaveAnimation: (updatedAnimation: SkillFrameAnimation) => void;
    showToast: (text: string, type?: 'success' | 'warning' | 'info') => void;
    onBeforeReduceBackupToDrive?: (overrideCurrentAnim?: SkillFrameAnimation, targetSingleSkillName?: string) => Promise<boolean>;
    onBatchReduceAllEffects?: (overrideCurrentAnim?: SkillFrameAnimation) => Promise<SkillFrameAnimation | null>;
    isBatchReducing?: boolean;
}

export const SkillFrameAnimationEditor: React.FC<SkillFrameAnimationEditorProps> = ({
    skill,
    character,
    isAllowedToCustomize,
    onSaveAnimation,
    showToast,
    onBeforeReduceBackupToDrive,
    onBatchReduceAllEffects,
    isBatchReducing = false
}) => {
    // Initial animation state from skill or default
    const [isEnabled, setIsEnabled] = useState<boolean>(() => {
        return skill.frameAnimation?.enabled ?? false;
    });

    const [frames, setFrames] = useState<SkillAnimationFrame[]>(() => {
        if (skill.frameAnimation?.frames && skill.frameAnimation.frames.length > 0) {
            return JSON.parse(JSON.stringify(skill.frameAnimation.frames));
        }
        // Default to holy slash preset frames
        return PRESET_FRAME_EFFECTS[0].frames.map((f, i) => ({
            ...f,
            id: `frame_${Date.now()}_${i}`
        }));
    });

    const [loopCount, setLoopCount] = useState<number>(() => {
        return skill.frameAnimation?.loopCount ?? 1;
    });

    const [playbackSpeed, setPlaybackSpeed] = useState<number>(() => {
        return skill.frameAnimation?.playbackSpeed ?? 1;
    });

    const [renderMode, setRenderMode] = useState<'both' | 'frame_only' | 'vfx_only'>(() => {
        return skill.frameAnimation?.renderMode ?? 'both';
    });

    // Editor UI State
    const [selectedFrameIndex, setSelectedFrameIndex] = useState<number>(0);
    const [playheadIndex, setPlayheadIndex] = useState<number>(0);
    const [isPlaying, setIsPlaying] = useState<boolean>(true);
    const [showCrosshair, setShowCrosshair] = useState<boolean>(true);
    const [lockAspectRatio, setLockAspectRatio] = useState<boolean>(true);
    const [batchDuration, setBatchDuration] = useState<number>(100);
    const [imageUrlInput, setImageUrlInput] = useState<string>('');
    const [showPresetDropdown, setShowPresetDropdown] = useState<boolean>(false);
    // 전체 프레임 동시 수정 모드 (체크 시 슬라이더 조절 시 모든 프레임에 실시간 일괄 반영)
    const [isBatchEditMode, setIsBatchEditMode] = useState<boolean>(false);

    const singleFileInputRef = useRef<HTMLInputElement | null>(null);
    const multiFileInputRef = useRef<HTMLInputElement | null>(null);
    const projectFileInputRef = useRef<HTMLInputElement | null>(null);

    // 배경 투명화 모달 및 관련 상태
    const [showBgTransparentModal, setShowBgTransparentModal] = useState<boolean>(false);
    const [bgTargetMode, setBgTargetMode] = useState<'black' | 'white' | 'auto' | 'green' | 'custom'>('black');
    const [bgCustomHex, setBgCustomHex] = useState<string>('#000000');
    const [bgTolerance, setBgTolerance] = useState<number>(30);
    const [bgPreviewUrl, setBgPreviewUrl] = useState<string>('');
    const [isProcessingBg, setIsProcessingBg] = useState<boolean>(false);

    // 프로젝트 공유 코드 모달 상태
    const [showProjectCodeModal, setShowProjectCodeModal] = useState<boolean>(false);
    const [projectCodeInput, setProjectCodeInput] = useState<string>('');

    // 스프라이트 시트 모달 & 프로시저럴 파티클 모달 상태
    const [showSpriteSheetModal, setShowSpriteSheetModal] = useState<boolean>(false);
    const [showProceduralModal, setShowProceduralModal] = useState<boolean>(false);

    // 이미지 자동 압축 상태
    const [isCompressing, setIsCompressing] = useState<boolean>(false);
    const [isUploadingToWeb, setIsUploadingToWeb] = useState<boolean>(false);

    // 등록된 모든 프레임 이미지 일괄 자동 압축 (크기 최적화 및 용량 절감)
    const handleCompressAllFrames = async (silent: boolean = false): Promise<SkillAnimationFrame[]> => {
        if (!frames || frames.length === 0) return frames;
        setIsCompressing(true);
        let totalOriginal = 0;
        let totalOptimized = 0;
        let compressedCount = 0;

        try {
            const newFrames = await Promise.all(
                frames.map(async (frame) => {
                    if (!frame.imageUrl || frame.imageUrl.startsWith('data:image/svg+xml')) {
                        return frame;
                    }
                    const res = await optimizeFrameImage(frame.imageUrl, 360, 0.85);
                    totalOriginal += res.originalBytes;
                    totalOptimized += res.optimizedBytes;
                    if (res.optimizedBytes < res.originalBytes) {
                        compressedCount++;
                    }
                    return {
                        ...frame,
                        imageUrl: res.optimizedUrl
                    };
                })
            );

            setFrames(newFrames);

            if (compressedCount > 0) {
                const origKB = Math.round(totalOriginal / 1024);
                const optKB = Math.round(totalOptimized / 1024);
                const savedPercent = totalOriginal > 0 ? Math.round(((totalOriginal - totalOptimized) / totalOriginal) * 100) : 0;
                showToast(
                    `프레임 ${compressedCount}개 자동 압축 완료 (${origKB}KB → ${optKB}KB, ${savedPercent}% 절감)`,
                    'success'
                );
            } else if (!silent) {
                showToast('모든 프레임 이미지가 이미 최적화된 상태입니다.', 'info');
            }
            return newFrames;
        } catch {
            if (!silent) {
                showToast('이미지 압축 중 일부 오류가 발생했습니다.', 'warning');
            }
            return frames;
        } finally {
            setIsCompressing(false);
        }
    };

    // 스프라이트 시트 및 파티클 프레임 일괄 교체/적용 핸들러
    const handleApplyGeneratedFrames = (newFrames: SkillAnimationFrame[]) => {
        if (!newFrames || newFrames.length === 0) return;
        setFrames(newFrames);
        setSelectedFrameIndex(0);
        setPlayheadIndex(0);
        setIsEnabled(true);
    };

    // Ensure selected frame index stays in bounds when frame list length changes
    useEffect(() => {
        if (frames.length > 0 && selectedFrameIndex >= frames.length) {
            setSelectedFrameIndex(frames.length - 1);
        }
    }, [frames.length]);

    const activeFrame: SkillAnimationFrame | undefined = frames[selectedFrameIndex];

    // 배경 투명화 라이브 미리보기 업데이트
    useEffect(() => {
        if (!showBgTransparentModal || !activeFrame?.imageUrl) return;
        let isMounted = true;
        setIsProcessingBg(true);
        processImageTransparency(activeFrame.imageUrl, bgTargetMode, bgCustomHex, bgTolerance)
            .then(result => {
                if (isMounted) {
                    setBgPreviewUrl(result);
                    setIsProcessingBg(false);
                }
            })
            .catch(() => {
                if (isMounted) setIsProcessingBg(false);
            });
        return () => { isMounted = false; };
    }, [showBgTransparentModal, activeFrame?.imageUrl, bgTargetMode, bgCustomHex, bgTolerance]);

    // 현재 선택 프레임에 배경 투명화 적용
    const handleApplyBgToCurrentFrame = () => {
        if (!bgPreviewUrl) return;
        updateActiveFrame({ imageUrl: bgPreviewUrl });
        setShowBgTransparentModal(false);
        showToast('현재 프레임 이미지의 배경이 투명하게 처리되었습니다.', 'success');
    };

    // 전체 프레임 일괄 배경 투명화 처리
    const handleApplyBgToAllFrames = async () => {
        if (frames.length === 0) return;
        setIsProcessingBg(true);
        showToast(`${frames.length}개 프레임 배경 투명화 일괄 처리 시작...`, 'info');

        const promises = frames.map(async (frame) => {
            if (!frame.imageUrl) return frame;
            const newUrl = await processImageTransparency(frame.imageUrl, bgTargetMode, bgCustomHex, bgTolerance);
            return { ...frame, imageUrl: newUrl };
        });

        const updatedFrames = await Promise.all(promises);
        setFrames(updatedFrames);
        setIsProcessingBg(false);
        setShowBgTransparentModal(false);
        showToast(`모든 프레임(${frames.length}개)의 배경 투명 처리가 완료되었습니다!`, 'success');
    };

    // 프로젝트 저장 (JSON 파일 저장 및 다운로드)
    const handleSaveProject = () => {
        if (frames.length === 0) {
            showToast('저장할 프레임 애니메이션 데이터가 없습니다.', 'warning');
            return;
        }

        const projectData = {
            version: '1.0',
            type: 'SkillFrameAnimationProject',
            skillName: skill.name,
            createdAt: new Date().toISOString(),
            animation: {
                enabled: isEnabled,
                loopCount: loopCount,
                playbackSpeed: playbackSpeed,
                renderMode: renderMode,
                frames: frames
            }
        };

        const jsonStr = JSON.stringify(projectData, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        const fileName = `skill_effect_${skill.name.replace(/\s+/g, '_')}_${Date.now()}.json`;
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        showToast(`[${skill.name}] 애니메이션 프로젝트 파일이 저장되었습니다.`, 'success');
    };

    // 프로젝트 파일 불러오기 (JSON 파일 로드)
    const handleLoadProjectFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const content = event.target?.result as string;
                if (!content) return;
                const parsed = JSON.parse(content);

                let loadedFrames: SkillAnimationFrame[] = [];
                let loadedEnabled = isEnabled;
                let loadedLoop = loopCount;
                let loadedSpeed = playbackSpeed;
                let loadedRenderMode = renderMode;

                if (parsed.animation && Array.isArray(parsed.animation.frames)) {
                    loadedFrames = parsed.animation.frames;
                    if (typeof parsed.animation.enabled === 'boolean') loadedEnabled = parsed.animation.enabled;
                    if (typeof parsed.animation.loopCount === 'number') loadedLoop = parsed.animation.loopCount;
                    if (typeof parsed.animation.playbackSpeed === 'number') loadedSpeed = parsed.animation.playbackSpeed;
                    if (typeof parsed.animation.renderMode === 'string') loadedRenderMode = parsed.animation.renderMode;
                } else if (parsed.type === 'AllSkillEffectsProject' && Array.isArray(parsed.effects)) {
                    const matched = parsed.effects.find((e: any) => e.skillName === skill.name && e.frameAnimation);
                    if (matched && matched.frameAnimation && Array.isArray(matched.frameAnimation.frames)) {
                        loadedFrames = matched.frameAnimation.frames;
                        if (typeof matched.frameAnimation.enabled === 'boolean') loadedEnabled = matched.frameAnimation.enabled;
                        if (typeof matched.frameAnimation.loopCount === 'number') loadedLoop = matched.frameAnimation.loopCount;
                        if (typeof matched.frameAnimation.playbackSpeed === 'number') loadedSpeed = matched.frameAnimation.playbackSpeed;
                        if (typeof matched.frameAnimation.renderMode === 'string') loadedRenderMode = matched.frameAnimation.renderMode;
                    } else {
                        const firstWithFrame = parsed.effects.find((e: any) => e.frameAnimation && Array.isArray(e.frameAnimation.frames));
                        if (firstWithFrame && firstWithFrame.frameAnimation) {
                            loadedFrames = firstWithFrame.frameAnimation.frames;
                        }
                    }
                } else if (Array.isArray(parsed.frames)) {
                    loadedFrames = parsed.frames;
                } else if (Array.isArray(parsed)) {
                    loadedFrames = parsed;
                } else {
                    showToast('올바른 스킬 프로젝트 파일 형식이 아닙니다.', 'warning');
                    return;
                }

                if (loadedFrames.length === 0) {
                    showToast('불러온 프로젝트에 유효한 프레임이 없습니다.', 'warning');
                    return;
                }

                setFrames(loadedFrames);
                setIsEnabled(loadedEnabled);
                setLoopCount(loadedLoop);
                setPlaybackSpeed(loadedSpeed);
                setRenderMode(loadedRenderMode);
                setSelectedFrameIndex(0);
                showToast(`프로젝트를 성공적으로 불러왔습니다! (${loadedFrames.length}개 프레임)`, 'success');

                const hasLargeFrame = loadedFrames.some(
                    (f) => f.imageUrl && !f.imageUrl.startsWith('data:image/svg+xml') && f.imageUrl.length > 50000
                );
                if (hasLargeFrame) {
                    setTimeout(() => {
                        handleCompressAllFrames(true);
                    }, 100);
                }
            } catch (err) {
                showToast('파일을 읽는 중 오류가 발생했습니다. 유효한 JSON 파일인지 확인하세요.', 'warning');
            }
            if (projectFileInputRef.current) projectFileInputRef.current.value = '';
        };
        reader.readAsText(file);
    };

    // 프로젝트 코드 클립보드 복사
    const handleCopyProjectCode = () => {
        const projectData = {
            version: '1.0',
            type: 'SkillFrameAnimationProject',
            skillName: skill.name,
            animation: {
                enabled: isEnabled,
                loopCount: loopCount,
                playbackSpeed: playbackSpeed,
                renderMode: renderMode,
                frames: frames
            }
        };
        const jsonStr = JSON.stringify(projectData);
        navigator.clipboard.writeText(jsonStr)
            .then(() => showToast('프로젝트 공유 코드가 클립보드에 복사되었습니다.', 'success'))
            .catch(() => showToast('클립보드 복사에 실패했습니다.', 'warning'));
    };

    // 프로젝트 코드 직접 입력해서 불러오기
    const handleImportProjectCode = () => {
        if (!projectCodeInput.trim()) {
            showToast('공유 코드를 입력해 주세요.', 'warning');
            return;
        }

        try {
            const parsed = JSON.parse(projectCodeInput.trim());
            let loadedFrames: SkillAnimationFrame[] = [];
            let loadedEnabled = isEnabled;
            let loadedLoop = loopCount;
            let loadedSpeed = playbackSpeed;
            let loadedRenderMode = renderMode;

            if (parsed.animation && Array.isArray(parsed.animation.frames)) {
                loadedFrames = parsed.animation.frames;
                if (typeof parsed.animation.enabled === 'boolean') loadedEnabled = parsed.animation.enabled;
                if (typeof parsed.animation.loopCount === 'number') loadedLoop = parsed.animation.loopCount;
                if (typeof parsed.animation.playbackSpeed === 'number') loadedSpeed = parsed.animation.playbackSpeed;
                if (typeof parsed.animation.renderMode === 'string') loadedRenderMode = parsed.animation.renderMode as any;
            } else if (Array.isArray(parsed.frames)) {
                loadedFrames = parsed.frames;
            } else if (Array.isArray(parsed)) {
                loadedFrames = parsed;
            }

            if (loadedFrames.length === 0) {
                showToast('유효하지 않은 프로젝트 공유 코드입니다.', 'warning');
                return;
            }

            setFrames(loadedFrames);
            setIsEnabled(loadedEnabled);
            setLoopCount(loadedLoop);
            setPlaybackSpeed(loadedSpeed);
            setRenderMode(loadedRenderMode);
            setSelectedFrameIndex(0);
            setShowProjectCodeModal(false);
            setProjectCodeInput('');
            showToast(`공유 코드로 프로젝트를 불러왔습니다! (${loadedFrames.length}개 프레임)`, 'success');
        } catch (e) {
            showToast('공유 코드 구문 분석 오류! 올바른 JSON 코드인지 확인하세요.', 'warning');
        }
    };

    // Current constructed animation object for renderer
    const currentAnimationObject: SkillFrameAnimation = useMemo(() => ({
        enabled: isEnabled,
        frames: frames,
        loopCount: loopCount,
        playbackSpeed: playbackSpeed,
        playMode: 'target',
        renderMode: renderMode
    }), [isEnabled, frames, loopCount, playbackSpeed, renderMode]);

    // Total animation duration in ms
    const totalDurationMs = useMemo(() => {
        const sum = frames.reduce((acc, f) => acc + (f.duration || 100), 0);
        const loops = loopCount === 0 ? 1 : Math.max(1, loopCount);
        return Math.round((sum * loops) / Math.max(0.1, playbackSpeed));
    }, [frames, loopCount, playbackSpeed]);

    // Update single property of active frame (전체 동시 수정 모드일 때는 모든 프레임에 일괄 반영)
    const updateActiveFrame = (updates: Partial<SkillAnimationFrame>) => {
        if (!activeFrame) return;
        setFrames(prev => {
            if (isBatchEditMode) {
                return prev.map(f => ({
                    ...f,
                    ...updates,
                    id: f.id,
                    imageUrl: (updates.imageUrl !== undefined && f.id === activeFrame.id) ? updates.imageUrl : f.imageUrl
                }));
            }
            const next = [...prev];
            next[selectedFrameIndex] = { ...next[selectedFrameIndex], ...updates };
            return next;
        });
    };

    // 타격 위치(X, Y) 전체 프레임 일괄 적용
    const handleBatchApplyPosition = () => {
        if (!activeFrame) return;
        const targetX = activeFrame.x || 0;
        const targetY = activeFrame.y || 0;
        setFrames(prev => prev.map(f => ({
            ...f,
            x: targetX,
            y: targetY
        })));
        showToast(`모든 프레임의 타격 위치를 가로 ${targetX}px, 세로 ${targetY}px로 일괄 적용했습니다.`, 'success');
    };

    // 크기, 각도, 배율 전체 프레임 일괄 적용
    const handleBatchApplyTransform = () => {
        if (!activeFrame) return;
        const targetWidth = activeFrame.width || 200;
        const targetHeight = activeFrame.height || 200;
        const targetScale = activeFrame.scale || 1;
        const targetRotation = activeFrame.rotation || 0;
        setFrames(prev => prev.map(f => ({
            ...f,
            width: targetWidth,
            height: targetHeight,
            scale: targetScale,
            rotation: targetRotation
        })));
        showToast(`모든 프레임에 크기(${targetWidth}x${targetHeight}px), 배율(${targetScale}배), 각도(${targetRotation}°)를 일괄 적용했습니다.`, 'success');
    };

    // 프레임 시간 및 합성 모드 전체 프레임 일괄 적용
    const handleBatchApplyTiming = () => {
        if (!activeFrame) return;
        const targetDuration = activeFrame.duration || 100;
        const targetBlend = activeFrame.blendMode || 'normal';
        setFrames(prev => prev.map(f => ({
            ...f,
            duration: targetDuration,
            blendMode: targetBlend
        })));
        showToast(`모든 프레임의 재생 시간(${targetDuration}ms) 및 합성 방식을 일괄 적용했습니다.`, 'success');
    };

    // 현재 프레임의 모든 형태/위치 속성 전체 일괄 복사 적용
    const handleBatchApplyAllProps = () => {
        if (!activeFrame) return;
        setFrames(prev => prev.map(f => ({
            ...f,
            x: activeFrame.x || 0,
            y: activeFrame.y || 0,
            width: activeFrame.width || 200,
            height: activeFrame.height || 200,
            scale: activeFrame.scale || 1,
            rotation: activeFrame.rotation || 0,
            duration: activeFrame.duration || 100,
            blendMode: activeFrame.blendMode || 'normal',
            opacity: activeFrame.opacity ?? 1
        })));
        showToast('현재 프레임의 위치, 크기, 각도, 배율, 시간, 합성 속성을 모든 프레임에 일괄 적용했습니다.', 'success');
    };

    // Add a new blank or duplicate frame
    const handleAddFrame = () => {
        const newFrame: SkillAnimationFrame = activeFrame
            ? {
                ...activeFrame,
                id: `frame_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
                duration: activeFrame.duration || 100
            }
            : {
                id: `frame_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
                imageUrl: PRESET_FRAME_EFFECTS[0].frames[0].imageUrl,
                x: 0,
                y: 0,
                width: 200,
                height: 200,
                scale: 1,
                rotation: 0,
                opacity: 1,
                duration: 100,
                blendMode: 'screen'
            };

        setFrames(prev => [...prev, newFrame]);
        setSelectedFrameIndex(frames.length);
        showToast('새 프레임이 추가되었습니다.', 'info');
    };

    // Delete active frame
    const handleDeleteFrame = (index: number) => {
        if (frames.length <= 1) {
            showToast('최소 1개의 프레임이 유지되어야 합니다.', 'warning');
            return;
        }
        setFrames(prev => prev.filter((_, i) => i !== index));
        setSelectedFrameIndex(prev => Math.max(0, Math.min(prev, frames.length - 2)));
        showToast('프레임이 삭제되었습니다.', 'info');
    };

    // Move frame left or right
    const handleMoveFrame = (index: number, direction: 'left' | 'right') => {
        const targetIndex = direction === 'left' ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= frames.length) return;

        setFrames(prev => {
            const next = [...prev];
            const temp = next[index];
            next[index] = next[targetIndex];
            next[targetIndex] = temp;
            return next;
        });
        setSelectedFrameIndex(targetIndex);
    };

    // Duplicate active frame
    const handleDuplicateFrame = (index: number) => {
        const source = frames[index];
        if (!source) return;
        const copy: SkillAnimationFrame = {
            ...source,
            id: `frame_${Date.now()}_${Math.floor(Math.random() * 1000)}`
        };
        setFrames(prev => {
            const next = [...prev];
            next.splice(index + 1, 0, copy);
            return next;
        });
        setSelectedFrameIndex(index + 1);
        showToast('프레임이 복제되었습니다.', 'info');
    };

    // Load a preset effect
    const handleLoadPreset = (presetIndex: number) => {
        const preset = PRESET_FRAME_EFFECTS[presetIndex];
        if (!preset) return;

        const newFrames: SkillAnimationFrame[] = preset.frames.map((f, i) => ({
            ...f,
            id: `frame_${Date.now()}_${i}`
        }));

        setFrames(newFrames);
        setSelectedFrameIndex(0);
        setIsEnabled(true);
        setShowPresetDropdown(false);
        showToast(`[${preset.name}] 프리셋 이펙트를 불러왔습니다.`, 'success');
    };

    // Batch apply duration to all frames
    const handleBatchApplyDuration = () => {
        if (batchDuration < 1) return;
        setFrames(prev => prev.map(f => ({ ...f, duration: batchDuration })));
        showToast(`모든 프레임 재생 시간을 ${batchDuration}ms로 일괄 설정했습니다.`, 'success');
    };

    // Single File upload handler (for active frame)
    const handleSingleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            showToast('이미지 파일만 업로드할 수 있습니다.', 'warning');
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            const base64 = event.target?.result as string;
            if (base64) {
                updateActiveFrame({ imageUrl: base64 });
                showToast('프레임 이미지가 원본 그대로 변경되었습니다.', 'success');
            }
        };
        reader.readAsDataURL(file);
    };

    // Batch Multi-image file upload handler
    const handleMultiFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const fileList = e.target.files;
        if (!fileList || fileList.length === 0) return;

        const files = Array.from(fileList).filter(f => f.type.startsWith('image/'));
        if (files.length === 0) {
            showToast('선택된 파일 중 유효한 이미지가 없습니다.', 'warning');
            return;
        }

        // 파일명 자연 정렬
        files.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));

        showToast(`${files.length}개 프레임 이미지 로딩 중...`, 'info');

        const readPromises = files.map((file, idx) => {
            return new Promise<SkillAnimationFrame>((resolve) => {
                const reader = new FileReader();
                reader.onload = (event) => {
                    const rawBase64 = event.target?.result as string;
                    resolve({
                        id: `frame_${Date.now()}_${idx}`,
                        imageUrl: rawBase64,
                        x: 0,
                        y: 0,
                        width: 200,
                        height: 200,
                        scale: 1,
                        rotation: 0,
                        opacity: 1,
                        duration: batchDuration || 100,
                        blendMode: 'normal'
                    });
                };
                reader.readAsDataURL(file);
            });
        });

        const loadedFrames = await Promise.all(readPromises);
        setFrames(loadedFrames);
        setSelectedFrameIndex(0);
        setIsEnabled(true);
        showToast(`${loadedFrames.length}개의 프레임이 원본 데이터로 등록되었습니다.`, 'success');
    };

    // 애니메이션 적용 및 저장 (즉시 저장)
    const handleSave = () => {
        if (!isAllowedToCustomize) {
            showToast('스킬 이펙트 수정 권한이 없습니다 (플레이어 또는 커스텀 동료 전용).', 'warning');
            return;
        }
        if (frames.length === 0) {
            showToast('최소 1개 이상의 프레임이 필요합니다.', 'warning');
            return;
        }

        const finalAnimation: SkillFrameAnimation = {
            enabled: isEnabled,
            frames: frames,
            loopCount: loopCount,
            playbackSpeed: playbackSpeed,
            playMode: 'target',
            renderMode: renderMode
        };

        onSaveAnimation(finalAnimation);
        showToast('애니메이션이 적용 및 저장되었습니다.', 'success');
    };

    // 세이브파일 용량 절감 처리 (구글 로그인 확인 -> 구글 드라이브 기존 데이터 백업 -> Base64 프레임 이미지를 초경량 웹 주소로 변환)
    const handleReduceSaveFileSize = async () => {
        if (!isAllowedToCustomize) {
            showToast('스킬 이펙트 수정 권한이 없습니다 (플레이어 또는 커스텀 동료 전용).', 'warning');
            return;
        }
        if (frames.length === 0) {
            showToast('절감할 프레임 애니메이션 데이터가 없습니다.', 'warning');
            return;
        }

        const hasBase64Frames = frames.some(
            (f) => f.imageUrl && f.imageUrl.startsWith('data:') && !f.imageUrl.startsWith('data:image/svg+xml')
        );

        if (!hasBase64Frames) {
            showToast('이미 모든 프레임 이미지가 경량 웹 주소로 변환되어 세이브파일이 최적화된 상태입니다.', 'info');
            return;
        }

        setIsUploadingToWeb(true);
        try {
            const currentAnimSnapshot: SkillFrameAnimation = {
                enabled: isEnabled,
                frames: frames,
                loopCount: loopCount,
                playbackSpeed: playbackSpeed,
                playMode: 'target',
                renderMode: renderMode
            };

            // 1. 구글 로그인 확인 및 구글 드라이브에 기존 원본 데이터 우선 백업
            if (onBeforeReduceBackupToDrive) {
                const backupOk = await onBeforeReduceBackupToDrive(currentAnimSnapshot, skill.name);
                if (!backupOk) {
                    setIsUploadingToWeb(false);
                    return;
                }
            }

            showToast('구글 드라이브 백업 완료! 커스텀 프레임 이미지를 경량화하여 세이브파일 용량을 절감 중입니다...', 'info');

            let convertedCount = 0;
            const saveFrames = await Promise.all(
                frames.map(async (frame) => {
                    if (frame.imageUrl && frame.imageUrl.startsWith('data:') && !frame.imageUrl.startsWith('data:image/svg+xml')) {
                        try {
                            let webUrl = await uploadImageToWeb(frame.imageUrl);
                            if (!webUrl || webUrl === frame.imageUrl) {
                                const opt = await optimizeFrameImage(frame.imageUrl, 280, 0.8);
                                webUrl = opt.optimizedUrl;
                            }
                            if (webUrl && webUrl !== frame.imageUrl) {
                                convertedCount++;
                            }
                            return { ...frame, imageUrl: webUrl };
                        } catch (err) {
                            console.error('프레임 웹 업로드 에러:', err);
                            return frame;
                        }
                    }
                    return frame;
                })
            );

            setFrames(saveFrames);

            const finalAnimation: SkillFrameAnimation = {
                enabled: isEnabled,
                frames: saveFrames,
                loopCount: loopCount,
                playbackSpeed: playbackSpeed,
                playMode: 'target',
                renderMode: renderMode
            };

            onSaveAnimation(finalAnimation);

            if (convertedCount > 0) {
                showToast(`구글 드라이브 백업 및 프레임 ${convertedCount}개 용량 절감 완료!`, 'success');
            } else {
                showToast('구글 드라이브 백업 및 세이브파일 용량 절감 처리가 완료되었습니다.', 'success');
            }
        } catch (err) {
            console.warn('일부 이미지 서버 업로드 중 지연이 발생하여 기존 데이터로 보존합니다.', err);
            showToast('일부 이미지 변환 중 지연이 발생했습니다. 다시 시도해 주세요.', 'warning');
        } finally {
            setIsUploadingToWeb(false);
        }
    };

    // 모든 업로드한 스킬 이펙트 일괄 세이브파일 용량 절감 (구글 로그인 우선 -> 구글 드라이브 전체 백업 -> 전체 이펙트 일괄 경량화)
    const handleBatchReduceAllSaveFileSize = async () => {
        if (!onBatchReduceAllEffects) return;
        const hasValidFrames = frames.some(f => f.imageUrl && !f.imageUrl.startsWith('data:image/svg+xml'));
        const currentAnimSnapshot: SkillFrameAnimation | undefined = hasValidFrames
            ? {
                enabled: isEnabled,
                frames: frames,
                loopCount: loopCount,
                playbackSpeed: playbackSpeed,
                playMode: 'target',
                renderMode: renderMode
            }
            : undefined;

        const updatedCurrentAnim = await onBatchReduceAllEffects(currentAnimSnapshot);
        if (updatedCurrentAnim && Array.isArray(updatedCurrentAnim.frames) && updatedCurrentAnim.frames.length > 0) {
            setFrames(updatedCurrentAnim.frames);
        }
    };

    return (
        <div className="flex-1 flex flex-col space-y-4 overflow-y-auto custom-scrollbar pr-1 pb-4">
            {/* Top Control Banner */}
            <div className="p-3.5 bg-slate-900/90 rounded-2xl border border-indigo-500/40 flex flex-wrap items-center justify-between gap-3 shadow-xl backdrop-blur-md">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-950/80 border border-indigo-500/50 flex items-center justify-center text-indigo-400 shadow-inner">
                        <Film size={20} />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h4 className="text-sm sm:text-base font-black text-white flex items-center gap-1.5">
                                <span>[{skill.name}]</span>
                                <span className="text-indigo-300">프레임 애니메이션 이펙트</span>
                            </h4>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                isEnabled 
                                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-700/60 animate-pulse' 
                                    : 'bg-slate-800 text-slate-400 border border-slate-700'
                            }`}>
                                {isEnabled ? '전투 활성화됨' : '미활성'}
                            </span>
                        </div>
                        <p className="text-[11px] text-slate-400">
                            프레임별로 이미지를 추가하고 위치(X,Y), 크기, 각도, 재생 시간을 설정하여 독창적인 스킬 이펙트를 제작합니다.
                        </p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    {/* Hidden Project JSON File Input */}
                    <input
                        type="file"
                        ref={projectFileInputRef}
                        accept=".json,application/json"
                        onChange={handleLoadProjectFile}
                        className="hidden"
                    />

                    {/* Project Load Button */}
                    <button
                        onClick={() => projectFileInputRef.current?.click()}
                        className="px-3 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 flex items-center gap-1.5 transition-all"
                        title="프로젝트 파일(.json)을 불러와서 애니메이션 복원"
                    >
                        <FolderOpen size={14} className="text-amber-400" />
                        <span className="hidden sm:inline">프로젝트 불러오기</span>
                        <span className="sm:hidden">불러오기</span>
                    </button>

                    {/* Project Save Button */}
                    <button
                        onClick={handleSaveProject}
                        className="px-3 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 flex items-center gap-1.5 transition-all"
                        title="현재 애니메이션 세트를 프로젝트 파일(.json)로 내보내기"
                    >
                        <Download size={14} className="text-cyan-400" />
                        <span className="hidden sm:inline">프로젝트 저장</span>
                        <span className="sm:hidden">저장</span>
                    </button>

                    {/* Manual Image Compression Button */}
                    <button
                        onClick={() => handleCompressAllFrames(false)}
                        disabled={isCompressing}
                        className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 ${
                            isCompressing 
                                ? 'bg-slate-800 text-slate-500 border-slate-700 cursor-not-allowed'
                                : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200'
                        }`}
                        title="등록된 모든 프레임 이미지를 최적화 크기로 수동 압축하여 용량을 최소화합니다."
                    >
                        {isCompressing ? (
                            <RefreshCw size={14} className="animate-spin text-purple-400" />
                        ) : (
                            <Sliders size={14} className="text-purple-400" />
                        )}
                        <span className="hidden sm:inline">{isCompressing ? '이미지 압축 중' : '이미지 압축'}</span>
                        <span className="sm:hidden">압축</span>
                    </button>

                    {/* Sprite Sheet Slicing Generator Button */}
                    <button
                        onClick={() => setShowSpriteSheetModal(true)}
                        className="px-3 py-2 rounded-xl text-xs font-bold bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-500/60 text-indigo-200 flex items-center gap-1.5 transition-all shadow-md"
                        title="스프라이트 시트 1장으로 다중 프레임 자동 슬라이싱 및 생성"
                    >
                        <Grid size={14} className="text-indigo-400" />
                        <span className="hidden sm:inline">스프라이트 분할</span>
                        <span className="sm:hidden">스프라이트</span>
                    </button>

                    {/* Procedural Particle Generator Button */}
                    <button
                        onClick={() => setShowProceduralModal(true)}
                        className="px-3 py-2 rounded-xl text-xs font-bold bg-purple-950/80 hover:bg-purple-900 border border-purple-500/60 text-purple-200 flex items-center gap-1.5 transition-all shadow-md"
                        title="원클릭 속성/형태 조합 캔버스 파티클 자동 생성"
                    >
                        <Wand2 size={14} className="text-purple-400" />
                        <span className="hidden sm:inline">파티클 자동생성</span>
                        <span className="sm:hidden">자동생성</span>
                    </button>

                    {/* Share Code Modal Button */}
                    <button
                        onClick={() => setShowProjectCodeModal(true)}
                        className="px-3 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 flex items-center gap-1.5 transition-all"
                        title="텍스트 코드 복사/붙여넣기를 통한 프로젝트 빠른 공유"
                    >
                        <Share2 size={14} className="text-pink-400" />
                        <span className="hidden sm:inline">공유 코드</span>
                    </button>

                    {/* Save File Size Reduction Button (Single Skill) */}
                    <button
                        onClick={handleReduceSaveFileSize}
                        disabled={!isAllowedToCustomize || isUploadingToWeb || isBatchReducing}
                        className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 shadow-md active:scale-95 ${
                            isUploadingToWeb
                                ? 'bg-cyan-950/40 text-cyan-400 border-cyan-800 cursor-not-allowed'
                                : 'bg-cyan-950/80 hover:bg-cyan-900 border-cyan-500/60 text-cyan-200'
                        }`}
                        title="구글 드라이브에 기존 데이터를 먼저 백업한 뒤, 현재 스킬의 프레임 이미지를 경량화하여 세이브파일 용량을 절감합니다."
                    >
                        {isUploadingToWeb ? (
                            <RefreshCw size={14} className="animate-spin text-cyan-400" />
                        ) : (
                            <CloudUpload size={14} className="text-cyan-400" />
                        )}
                        <span className="hidden sm:inline">{isUploadingToWeb ? '용량 절감 중' : '세이브파일 용량 절감'}</span>
                        <span className="sm:hidden">{isUploadingToWeb ? '절감 중' : '용량 절감'}</span>
                    </button>

                    {/* Batch Save File Size Reduction Button (All Uploaded Effects) */}
                    {onBatchReduceAllEffects && (
                        <button
                            onClick={handleBatchReduceAllSaveFileSize}
                            disabled={isUploadingToWeb || isBatchReducing}
                            className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 shadow-md active:scale-95 ${
                                isBatchReducing
                                    ? 'bg-teal-950/40 text-teal-400 border-teal-800 cursor-not-allowed'
                                    : 'bg-gradient-to-r from-teal-900/90 to-emerald-900/90 hover:from-teal-800 hover:to-emerald-800 border-teal-400/70 text-teal-100'
                            }`}
                            title="구글 로그인 확인 및 구글 드라이브에 전체 기존 이펙트 데이터를 먼저 백업한 후, 업로드된 모든 스킬 이펙트들의 세이브파일 용량을 일괄 절감합니다."
                        >
                            {isBatchReducing ? (
                                <RefreshCw size={14} className="animate-spin text-teal-300" />
                            ) : (
                                <Layers size={14} className="text-teal-300" />
                            )}
                            <span className="hidden sm:inline">{isBatchReducing ? '일괄 백업·절감 중...' : '일괄 세이브파일 용량 절감'}</span>
                            <span className="sm:hidden">{isBatchReducing ? '일괄 절감 중' : '일괄 용량 절감'}</span>
                        </button>
                    )}

                    {/* Enable Toggle Button */}
                    <button
                        onClick={() => {
                            setIsEnabled(!isEnabled);
                            showToast(isEnabled ? '프레임 애니메이션이 비활성화되었습니다.' : '프레임 애니메이션이 활성화되었습니다.', 'info');
                        }}
                        className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all ${
                            isEnabled
                                ? 'bg-emerald-950/80 hover:bg-emerald-900 border-emerald-500 text-emerald-200'
                                : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300'
                        }`}
                    >
                        {isEnabled ? <Check size={14} className="text-emerald-400" /> : <Eye size={14} />}
                        <span>{isEnabled ? '이펙트 켜짐' : '이펙트 켜기'}</span>
                    </button>

                    {/* Final Save Button */}
                    <button
                        onClick={handleSave}
                        disabled={!isAllowedToCustomize}
                        className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-lg active:scale-95 transition-all ${
                            isAllowedToCustomize
                                ? 'bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 text-white shadow-indigo-950/60' 
                                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                        }`}
                    >
                        <CheckCircle2 size={15} />
                        <span>애니메이션 적용 및 저장</span>
                    </button>
                </div>
            </div>

            {/* 이펙트 출력 모드 선택 바 (동시 출력 / 프레임만 / 기본 이펙트만) */}
            <div className="p-3 bg-slate-900/90 rounded-2xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shadow-md">
                <div className="flex items-center gap-2">
                    <Zap size={15} className="text-amber-400 shrink-0" />
                    <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-200">이펙트 출력 방식 선택</span>
                        <span className="text-[10px] text-slate-400 font-normal">
                            전투 시 스킬 프레임과 기본 이펙트의 동시 출력 여부를 설정합니다.
                        </span>
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-1 p-1 bg-slate-950 rounded-xl border border-slate-800/80 text-xs font-bold">
                    <button
                        onClick={() => {
                            setRenderMode('both');
                            showToast('동시 출력: 프레임 애니메이션과 기본 스킬 이펙트가 함께 연출됩니다.', 'info');
                        }}
                        className={`px-2.5 py-1.5 rounded-lg transition-all flex items-center justify-center gap-1 text-[11px] sm:text-xs ${
                            renderMode === 'both'
                                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md font-black'
                                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                        }`}
                        title="프레임 애니메이션과 기본 스킬 이펙트를 동시에 출력합니다"
                    >
                        <Sparkles size={12} className="shrink-0" />
                        <span>동시 출력</span>
                    </button>

                    <button
                        onClick={() => {
                            setRenderMode('frame_only');
                            showToast('프레임만 출력: 커스텀 프레임 애니메이션만 연출됩니다.', 'info');
                        }}
                        className={`px-2.5 py-1.5 rounded-lg transition-all flex items-center justify-center gap-1 text-[11px] sm:text-xs ${
                            renderMode === 'frame_only'
                                ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md font-black'
                                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                        }`}
                        title="기본 스킬 이펙트를 숨기고 커스텀 프레임 애니메이션만 출력합니다"
                    >
                        <Film size={12} className="shrink-0" />
                        <span>프레임만</span>
                    </button>

                    <button
                        onClick={() => {
                            setRenderMode('vfx_only');
                            showToast('기본 이펙트만 출력: 기본 스킬 이펙트만 연출됩니다.', 'info');
                        }}
                        className={`px-2.5 py-1.5 rounded-lg transition-all flex items-center justify-center gap-1 text-[11px] sm:text-xs ${
                            renderMode === 'vfx_only'
                                ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-md font-black'
                                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                        }`}
                        title="프레임 애니메이션을 숨기고 기본 스킬 이펙트만 출력합니다"
                    >
                        <Flame size={12} className="shrink-0" />
                        <span>기본 이펙트만</span>
                    </button>
                </div>
            </div>

            {/* Main Stage Grid: Interactive Preview on Left/Top, Timeline & Inspector on Right/Bottom */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                {/* 1. Live Interactive Preview Canvas (아레나 뷰어) */}
                <div className="lg:col-span-6 flex flex-col space-y-2">
                    <div className="relative min-h-[340px] sm:min-h-[400px] rounded-2xl bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 border border-indigo-500/40 overflow-hidden flex flex-col justify-between p-3.5 shadow-2xl">
                        {/* Background Arena Target Indicator */}
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
                            {/* Dummy Target Outline */}
                            <div className="w-24 h-36 rounded-2xl border-2 border-dashed border-slate-400 flex flex-col items-center justify-center text-slate-500 text-[10px] font-mono">
                                <span>타격 대상</span>
                                <span>(TARGET)</span>
                            </div>
                        </div>

                        {/* Top Stage Header: Status & Quick Controls */}
                        <div className="flex items-center justify-between z-10">
                            <div className="flex items-center gap-1.5 bg-slate-950/80 px-2.5 py-1 rounded-lg border border-slate-800 text-[11px] font-mono text-indigo-300 backdrop-blur-sm">
                                <Sparkles size={12} className="text-indigo-400 animate-pulse" />
                                <span>{isPlaying ? `재생 중: #${playheadIndex + 1}` : `선택 편집: #${selectedFrameIndex + 1}`} / {frames.length}</span>
                                <span className="text-slate-500">|</span>
                                <span>총 {totalDurationMs}ms</span>
                            </div>

                            <div className="flex items-center gap-1.5">
                                {/* Crosshair toggle */}
                                <button
                                    onClick={() => setShowCrosshair(!showCrosshair)}
                                    title="중앙 십자선 가이드 토글"
                                    className={`p-1.5 rounded-lg border text-xs transition-colors ${
                                        showCrosshair ? 'bg-cyan-950 border-cyan-500 text-cyan-300' : 'bg-slate-900 border-slate-800 text-slate-500'
                                    }`}
                                >
                                    <Move size={13} />
                                </button>

                                {/* Playback Speed Selector */}
                                <div className="flex items-center bg-slate-950/80 rounded-lg border border-slate-800 p-0.5 text-[10px] font-bold">
                                    {[0.5, 1, 1.5, 2, 3, 4].map(speed => (
                                        <button
                                            key={speed}
                                            onClick={() => setPlaybackSpeed(speed)}
                                            className={`px-1.5 py-0.5 rounded transition-colors ${
                                                playbackSpeed === speed ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
                                            }`}
                                        >
                                            {speed}x
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Center Stage: SkillFrameAnimationRenderer */}
                        <div className="relative w-full flex-1 flex items-center justify-center my-2 overflow-hidden">
                            <SkillFrameAnimationRenderer
                                anim={currentAnimationObject}
                                isPlaying={isPlaying}
                                currentFrameIndex={isPlaying ? undefined : selectedFrameIndex}
                                onFrameChange={(idx) => {
                                    setPlayheadIndex(idx);
                                }}
                                playbackSpeed={playbackSpeed}
                                loop={true}
                                showCrosshair={showCrosshair}
                                className="w-full h-full min-h-[260px]"
                            />
                        </div>

                        {/* Bottom Playback Controls Bar */}
                        <div className="flex flex-wrap items-center justify-between gap-2 z-10 bg-slate-950/90 p-2 rounded-xl border border-slate-800/80 backdrop-blur-md">
                            {/* Prev / Play / Pause / Next / Reset */}
                            <div className="flex items-center gap-1.5">
                                <button
                                    onClick={() => {
                                        setIsPlaying(false);
                                        const prevIdx = (selectedFrameIndex - 1 + frames.length) % frames.length;
                                        setSelectedFrameIndex(prevIdx);
                                        setPlayheadIndex(prevIdx);
                                    }}
                                    className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800"
                                    title="이전 프레임"
                                >
                                    <SkipBack size={14} />
                                </button>

                                <button
                                    onClick={() => {
                                        if (!isPlaying) {
                                            setPlayheadIndex(selectedFrameIndex);
                                        }
                                        setIsPlaying(!isPlaying);
                                    }}
                                    className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-indigo-950/60"
                                >
                                    {isPlaying ? <Pause size={14} /> : <Play size={14} />}
                                    <span>{isPlaying ? '일시정지' : '재생'}</span>
                                </button>

                                <button
                                    onClick={() => {
                                        setIsPlaying(false);
                                        const nextIdx = (selectedFrameIndex + 1) % frames.length;
                                        setSelectedFrameIndex(nextIdx);
                                        setPlayheadIndex(nextIdx);
                                    }}
                                    className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800"
                                    title="다음 프레임"
                                >
                                    <SkipForward size={14} />
                                </button>

                                <button
                                    onClick={() => {
                                        setIsPlaying(false);
                                        setSelectedFrameIndex(0);
                                        setPlayheadIndex(0);
                                    }}
                                    className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 border border-slate-800"
                                    title="첫 프레임으로 이동"
                                >
                                    <RotateCcw size={13} />
                                </button>
                            </div>

                            {/* Loop count setting */}
                            <div className="flex items-center gap-1.5 text-xs text-slate-300">
                                <span className="text-[11px] text-slate-400">전투 반복:</span>
                                <select
                                    value={loopCount}
                                    onChange={(e) => setLoopCount(Number(e.target.value))}
                                    className="bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-xs text-indigo-300 font-bold focus:outline-none focus:border-indigo-500"
                                >
                                    <option value={1}>1회 재생</option>
                                    <option value={2}>2회 반복</option>
                                    <option value={3}>3회 반복</option>
                                    <option value={0}>무한 루프</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Quick Presets Bar */}
                    <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300">
                            <Sparkles size={14} className="text-amber-400" />
                            <span>추천 이펙트 프리셋:</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                            {PRESET_FRAME_EFFECTS.map((preset, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => handleLoadPreset(idx)}
                                    className="px-2 py-1 rounded-lg bg-slate-950 hover:bg-indigo-950 border border-slate-800 hover:border-indigo-500/60 text-[11px] text-slate-300 hover:text-indigo-200 transition-colors flex items-center gap-1"
                                >
                                    <span>{preset.icon}</span>
                                    <span>{preset.name.split(' ')[0]}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* 2. Right: Frame Timeline & Active Frame Property Inspector */}
                <div className="lg:col-span-6 flex flex-col space-y-3.5">
                    {/* Timeline Strip */}
                    <div className="p-3.5 bg-slate-900 rounded-2xl border border-slate-800 flex flex-col space-y-2.5 shadow-lg">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Layers size={15} className="text-indigo-400" />
                                <span className="text-xs font-bold text-white uppercase tracking-wider">프레임 타임라인</span>
                                <span className="text-[10px] text-slate-400 font-mono">({frames.length} 프레임)</span>
                            </div>

                            <div className="flex items-center gap-1.5 flex-wrap">
                                {/* Quick Sprite Sheet button in timeline */}
                                <button
                                    onClick={() => setShowSpriteSheetModal(true)}
                                    className="px-2.5 py-1 rounded-lg bg-indigo-950/70 hover:bg-indigo-900 border border-indigo-700/60 text-[11px] font-bold text-indigo-300 flex items-center gap-1 transition-colors"
                                    title="스프라이트 시트 1장으로 다중 프레임 자동 슬라이싱 및 생성"
                                >
                                    <Grid size={13} />
                                    <span>스프라이트 분할</span>
                                </button>

                                {/* Quick Procedural Particle button in timeline */}
                                <button
                                    onClick={() => setShowProceduralModal(true)}
                                    className="px-2.5 py-1 rounded-lg bg-purple-950/70 hover:bg-purple-900 border border-purple-700/60 text-[11px] font-bold text-purple-300 flex items-center gap-1 transition-colors"
                                    title="원클릭 속성/형태 조합 캔버스 파티클 자동 생성"
                                >
                                    <Wand2 size={13} />
                                    <span>파티클 자동생성</span>
                                </button>

                                {/* Optimize All Frames (자동 압축) */}
                                <button
                                    onClick={() => handleCompressAllFrames(false)}
                                    disabled={isCompressing || frames.length === 0}
                                    className="px-2.5 py-1 rounded-lg bg-amber-950/70 hover:bg-amber-900 border border-amber-700/60 text-[11px] font-bold text-amber-300 flex items-center gap-1 transition-colors disabled:opacity-50"
                                    title="이미 등록된 이미지를 포함하여 모든 프레임을 최적 크기로 자동 압축하여 렉을 방지합니다"
                                >
                                    <Zap size={13} className={isCompressing ? 'animate-spin' : ''} />
                                    <span>{isCompressing ? '압축 중...' : '이미지 자동 압축'}</span>
                                </button>

                                {/* Batch Multi-file Upload */}
                                <input
                                    type="file"
                                    ref={multiFileInputRef}
                                    multiple
                                    accept="image/*"
                                    onChange={handleMultiFileUpload}
                                    className="hidden"
                                />
                                <button
                                    onClick={() => multiFileInputRef.current?.click()}
                                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[11px] font-bold text-slate-300 flex items-center gap-1 transition-colors"
                                    title="여러 이미지 파일을 한 번에 선택하여 순서대로 프레임 생성"
                                >
                                    <FolderPlus size={13} />
                                    <span>이미지 일괄</span>
                                </button>

                                {/* Add New Single Frame */}
                                <button
                                    onClick={handleAddFrame}
                                    className="px-2.5 py-1 rounded-lg bg-emerald-950/70 hover:bg-emerald-900 border border-emerald-700/60 text-[11px] font-bold text-emerald-300 flex items-center gap-1 transition-colors"
                                >
                                    <Plus size={13} />
                                    <span>프레임 추가</span>
                                </button>
                            </div>
                        </div>

                        {/* Horizontal Frame Thumbnails Carousel */}
                        <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar py-1.5 px-0.5">
                            {frames.map((frame, index) => {
                                const isSelected = selectedFrameIndex === index;
                                const isPlayingHead = isPlaying && playheadIndex === index;
                                return (
                                    <div
                                        key={frame.id || index}
                                        onClick={() => {
                                            setSelectedFrameIndex(index);
                                            setPlayheadIndex(index);
                                            setIsPlaying(false);
                                        }}
                                        className={`relative shrink-0 w-16 sm:w-20 rounded-xl border p-1.5 cursor-pointer transition-all flex flex-col items-center gap-1 ${
                                            isSelected
                                                ? 'bg-indigo-950/90 border-indigo-400 shadow-[0_0_12px_rgba(99,102,241,0.5)] ring-1 ring-indigo-400'
                                                : isPlayingHead
                                                    ? 'bg-cyan-950/80 border-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.4)] ring-1 ring-cyan-400'
                                                    : 'bg-slate-950/70 border-slate-800 hover:border-slate-700 text-slate-400'
                                        }`}
                                    >
                                        {/* Frame Number Badge */}
                                        <div className="w-full flex items-center justify-between text-[9px] font-mono px-0.5">
                                            <span className={isSelected ? 'text-indigo-300 font-bold' : (isPlayingHead ? 'text-cyan-300 font-bold' : 'text-slate-500')}>
                                                #{index + 1}
                                                {isPlayingHead && ' ▶'}
                                            </span>
                                            <span className="text-slate-500">{frame.duration || 100}ms</span>
                                        </div>

                                        {/* Thumbnail Box */}
                                        <div className="w-full h-12 rounded-lg bg-slate-900 border border-slate-800 overflow-hidden flex items-center justify-center relative shadow-inner">
                                            {frame.imageUrl ? (
                                                <img
                                                    src={frame.imageUrl}
                                                    alt={`frame-${index}`}
                                                    className="w-full h-full object-contain p-0.5"
                                                    referrerPolicy="no-referrer"
                                                />
                                            ) : (
                                                <ImageIcon size={16} className="text-slate-600" />
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Batch Duration Setting Row */}
                        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-800 text-[11px] text-slate-400">
                            <div className="flex items-center gap-1.5 flex-wrap">
                                <Clock size={12} className="text-indigo-400 shrink-0" />
                                <span>일괄 시간(ms):</span>
                                <input
                                    type="number"
                                    min="1"
                                    max="2000"
                                    step="1"
                                    value={batchDuration}
                                    onChange={(e) => setBatchDuration(Math.max(1, Number(e.target.value)))}
                                    className="w-14 px-1 py-0.5 bg-slate-950 border border-slate-800 rounded text-center text-white text-xs font-mono focus:border-indigo-500 outline-none"
                                />
                                <button
                                    onClick={handleBatchApplyDuration}
                                    className="px-2 py-0.5 rounded bg-indigo-950/80 hover:bg-indigo-900 text-indigo-300 text-[10px] font-bold border border-indigo-700/60"
                                >
                                    전체 적용
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        const optimalMs = frames.length >= 36 ? 18 : frames.length >= 16 ? 30 : 50;
                                        setBatchDuration(optimalMs);
                                        setFrames(prev => prev.map(f => ({
                                            ...f,
                                            x: 0,
                                            y: 0,
                                            duration: optimalMs
                                        })));
                                        showToast(`모든 프레임의 중심축 흔들림(X/Y 오프셋)을 0으로 정렬하고 ${optimalMs}ms(60FPS) 부드러운 속도로 보정했습니다! (아래 저장 버튼을 눌러 확정하세요)`, 'success');
                                    }}
                                    className="px-2.5 py-0.5 rounded bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white text-[10px] font-bold shadow flex items-center gap-1"
                                    title="기존 8x8 등 프레임 이펙트의 중심축 흔들림과 느린 재생 속도를 원클릭으로 부드럽게 교정합니다"
                                >
                                    <Zap size={11} />
                                    <span>끊김·흔들림 60FPS 자동 보정</span>
                                </button>
                                {/* 초고속 빠른 선택 칩 */}
                                <div className="hidden sm:flex items-center gap-1 ml-1">
                                    {[5, 10, 16, 30, 50].map((ms) => (
                                        <button
                                            key={ms}
                                            type="button"
                                            onClick={() => {
                                                setBatchDuration(ms);
                                                setFrames(prev => prev.map(f => ({ ...f, duration: ms })));
                                                showToast(`모든 프레임 재생 시간을 ${ms}ms로 일괄 설정했습니다.`, 'success');
                                            }}
                                            className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[9px] font-mono border border-slate-700"
                                            title={`모든 프레임을 ${ms}ms로 즉시 일괄 설정`}
                                        >
                                            {ms}ms
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Frame reorder / duplicate / delete for active frame */}
                            {activeFrame && (
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={() => handleMoveFrame(selectedFrameIndex, 'left')}
                                        disabled={selectedFrameIndex === 0}
                                        className="p-1 rounded bg-slate-950 hover:bg-slate-800 disabled:opacity-30 border border-slate-800 text-slate-300"
                                        title="앞으로 이동"
                                    >
                                        <ArrowLeft size={12} />
                                    </button>
                                    <button
                                        onClick={() => handleMoveFrame(selectedFrameIndex, 'right')}
                                        disabled={selectedFrameIndex === frames.length - 1}
                                        className="p-1 rounded bg-slate-950 hover:bg-slate-800 disabled:opacity-30 border border-slate-800 text-slate-300"
                                        title="뒤로 이동"
                                    >
                                        <ArrowRight size={12} />
                                    </button>
                                    <button
                                        onClick={() => handleDuplicateFrame(selectedFrameIndex)}
                                        className="p-1 rounded bg-slate-950 hover:bg-slate-800 border border-slate-800 text-cyan-300"
                                        title="현재 프레임 복제"
                                    >
                                        <Copy size={12} />
                                    </button>
                                    <button
                                        onClick={() => handleDeleteFrame(selectedFrameIndex)}
                                        className="p-1 rounded bg-slate-950 hover:bg-red-950/80 border border-slate-800 text-red-400"
                                        title="현재 프레임 삭제"
                                    >
                                        <Trash2 size={12} />
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Active Frame Detailed Inspector */}
                    {activeFrame ? (
                        <div className="p-4 bg-slate-900/95 rounded-2xl border border-slate-800 flex flex-col space-y-3.5 shadow-xl">
                            {/* Inspector Header & Batch Edit Controls */}
                            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
                                <div className="flex items-center gap-2">
                                    <Sliders size={16} className="text-indigo-400" />
                                    <h5 className="text-sm font-bold text-white flex items-center gap-1.5">
                                        <span>프레임 #{selectedFrameIndex + 1} 속성 편집</span>
                                    </h5>
                                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-950 text-indigo-300 border border-slate-800">
                                        프레임 식별: {activeFrame.id.slice(-8)}
                                    </span>
                                </div>

                                <div className="flex items-center gap-2 flex-wrap">
                                    {/* Real-time Bulk Edit Mode Toggle */}
                                    <label className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-bold cursor-pointer transition-all ${
                                        isBatchEditMode
                                            ? 'bg-purple-950 border-purple-400 text-purple-200 shadow-[0_0_10px_rgba(168,85,247,0.3)] ring-1 ring-purple-400'
                                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                                    }`}>
                                        <input
                                            type="checkbox"
                                            checked={isBatchEditMode}
                                            onChange={(e) => {
                                                setIsBatchEditMode(e.target.checked);
                                                if (e.target.checked) {
                                                    showToast('전체 프레임 동시 수정 모드가 활성화되었습니다. 슬라이더 조절 시 모든 프레임에 실시간 반영됩니다.', 'info');
                                                }
                                            }}
                                            className="rounded border-slate-700 bg-slate-900 accent-purple-500"
                                        />
                                        <span>전체 프레임 동시 수정</span>
                                    </label>

                                    {/* One-click Apply All Properties to all frames */}
                                    <button
                                        onClick={handleBatchApplyAllProps}
                                        className="px-2.5 py-1 rounded-lg bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-600/70 text-indigo-200 text-xs font-bold flex items-center gap-1 transition-all active:scale-95 shadow-sm"
                                        title="현재 프레임의 위치, 크기, 각도, 배율, 시간, 합성 등 모든 형태 속성을 전체 프레임에 한 번에 복사 적용합니다."
                                    >
                                        <Sparkles size={12} className="text-indigo-400" />
                                        <span>모든 프레임에 일괄 복사</span>
                                    </button>
                                </div>
                            </div>

                            {/* Batch Edit Mode Banner (when active) */}
                            {isBatchEditMode && (
                                <div className="p-2 rounded-xl bg-purple-950/50 border border-purple-700/60 text-purple-200 text-xs flex items-center justify-between gap-2">
                                    <span className="flex items-center gap-1.5 font-bold text-[11px]">
                                        <Sparkles size={13} className="text-purple-400 animate-pulse" />
                                        <span>전체 프레임 동시 수정 중: 아래에서 변경하는 위치, 크기, 각도, 배율, 시간이 모든 프레임에 함께 적용됩니다.</span>
                                    </span>
                                    <button
                                        onClick={() => setIsBatchEditMode(false)}
                                        className="text-[10px] text-purple-300 hover:text-white underline shrink-0 font-bold"
                                    >
                                        모드 해제
                                    </button>
                                </div>
                            )}

                            {/* 1. Image File & URL Setup */}
                            <div className="space-y-1.5">
                                <span className="text-xs font-bold text-slate-300 flex items-center gap-1">
                                    <ImageIcon size={13} className="text-indigo-400" />
                                    <span>프레임 이미지 등록</span>
                                </span>
                                <div className="flex flex-wrap items-center gap-2">
                                    {/* Upload local image file */}
                                    <input
                                        type="file"
                                        ref={singleFileInputRef}
                                        accept="image/*"
                                        onChange={handleSingleFileUpload}
                                        className="hidden"
                                    />
                                    <button
                                        onClick={() => singleFileInputRef.current?.click()}
                                        className="px-3 py-1.5 rounded-xl bg-indigo-950 hover:bg-indigo-900 border border-indigo-700/70 text-xs font-bold text-indigo-200 flex items-center gap-1.5 transition-colors"
                                    >
                                        <Upload size={13} />
                                        <span>기기에서 이미지 업로드</span>
                                    </button>

                                    {/* Background Transparency Trigger Button */}
                                    <button
                                        onClick={() => {
                                            if (!activeFrame?.imageUrl) {
                                                showToast('먼저 프레임 이미지를 등록해 주세요.', 'warning');
                                                return;
                                            }
                                            setShowBgTransparentModal(true);
                                        }}
                                        className="px-3 py-1.5 rounded-xl bg-purple-950/80 hover:bg-purple-900 border border-purple-500/60 text-xs font-bold text-purple-200 flex items-center gap-1.5 shadow-md shadow-purple-950/40 transition-all active:scale-95"
                                        title="불러온 이미지의 검은색/흰색 등 단색 배경을 투명하게 제거"
                                    >
                                        <Wand2 size={13} className="text-purple-300 animate-pulse" />
                                        <span>배경 투명화</span>
                                    </button>

                                    {/* Or Image URL Input */}
                                    <div className="flex-1 min-w-[180px] flex items-center gap-1 bg-slate-950 rounded-xl border border-slate-800 px-2 py-1">
                                        <input
                                            type="text"
                                            placeholder="이미지 주소 직접 입력"
                                            value={imageUrlInput}
                                            onChange={(e) => setImageUrlInput(e.target.value)}
                                            className="bg-transparent text-xs text-white placeholder:text-slate-600 outline-none flex-1 min-w-0 font-mono"
                                        />
                                        <button
                                            onClick={() => {
                                                if (imageUrlInput.trim()) {
                                                    updateActiveFrame({ imageUrl: imageUrlInput.trim() });
                                                    setImageUrlInput('');
                                                    showToast('이미지 주소가 적용되었습니다.', 'info');
                                                }
                                            }}
                                            className="px-2 py-0.5 rounded bg-indigo-700 hover:bg-indigo-600 text-white text-[10px] font-bold"
                                        >
                                            적용
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* 2. Position (X, Y Offset) */}
                            <div className="space-y-2 p-3 bg-slate-950/80 rounded-xl border border-slate-800/80">
                                <div className="flex items-center justify-between flex-wrap gap-1.5">
                                    <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                                        <Move size={13} className="text-cyan-400" />
                                        <span>타격 위치 (가로 X, 세로 Y)</span>
                                    </span>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => updateActiveFrame({ x: 0, y: 0 })}
                                            className="text-[10px] text-cyan-400 hover:text-cyan-300 font-bold underline"
                                        >
                                            중앙 정렬
                                        </button>
                                        <button
                                            onClick={handleBatchApplyPosition}
                                            className="px-2 py-0.5 rounded-lg bg-cyan-950 hover:bg-cyan-900 border border-cyan-700/70 text-cyan-200 text-[10px] font-bold transition-all active:scale-95"
                                            title="현재 프레임의 타격 위치(X, Y)를 모든 프레임에 일괄 적용합니다."
                                        >
                                            모든 프레임에 위치 일괄 적용
                                        </button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    {/* X Slider */}
                                    <div className="space-y-1">
                                        <div className="flex justify-between text-[11px] font-mono text-slate-400">
                                            <span>가로 위치:</span>
                                            <span className="text-cyan-300 font-bold">{activeFrame.x || 0}px</span>
                                        </div>
                                        <input
                                            type="range"
                                            min="-300"
                                            max="300"
                                            step="5"
                                            value={activeFrame.x || 0}
                                            onChange={(e) => updateActiveFrame({ x: Number(e.target.value) })}
                                            className="w-full accent-cyan-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                                        />
                                    </div>

                                    {/* Y Slider */}
                                    <div className="space-y-1">
                                        <div className="flex justify-between text-[11px] font-mono text-slate-400">
                                            <span>세로 위치:</span>
                                            <span className="text-cyan-300 font-bold">{activeFrame.y || 0}px</span>
                                        </div>
                                        <input
                                            type="range"
                                            min="-300"
                                            max="300"
                                            step="5"
                                            value={activeFrame.y || 0}
                                            onChange={(e) => updateActiveFrame({ y: Number(e.target.value) })}
                                            className="w-full accent-cyan-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                                        />
                                    </div>
                                </div>

                                {/* Position Quick Presets */}
                                <div className="flex items-center gap-1.5 pt-1 text-[10px] text-slate-400 flex-wrap">
                                    <span>위치 프리셋:</span>
                                    {[
                                        { label: '중앙', x: 0, y: 0 },
                                        { label: '상단 타격', x: 0, y: -80 },
                                        { label: '지면 폭발', x: 0, y: 60 },
                                        { label: '좌측', x: -60, y: 0 },
                                        { label: '우측', x: 60, y: 0 },
                                    ].map((preset, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => updateActiveFrame({ x: preset.x, y: preset.y })}
                                            className="px-1.5 py-0.5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 font-medium"
                                        >
                                            {preset.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* 3. Size, Scale & Rotation */}
                            <div className="space-y-2 p-3 bg-slate-950/80 rounded-xl border border-slate-800/80">
                                <div className="flex items-center justify-between flex-wrap gap-1.5">
                                    <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                                        <Maximize2 size={13} className="text-purple-400" />
                                        <span>크기 & 각도 & 배율</span>
                                    </span>
                                    <div className="flex items-center gap-2">
                                        <div className="flex items-center gap-1 text-[10px] text-slate-400">
                                            <input
                                                type="checkbox"
                                                id="lock_aspect"
                                                checked={lockAspectRatio}
                                                onChange={(e) => setLockAspectRatio(e.target.checked)}
                                                className="rounded border-slate-700 bg-slate-900 accent-purple-500"
                                            />
                                            <label htmlFor="lock_aspect" className="cursor-pointer">비율 유지</label>
                                        </div>
                                        <button
                                            onClick={handleBatchApplyTransform}
                                            className="px-2 py-0.5 rounded-lg bg-purple-950 hover:bg-purple-900 border border-purple-700/70 text-purple-200 text-[10px] font-bold transition-all active:scale-95"
                                            title="현재 프레임의 크기(가로/세로), 각도, 배율을 모든 프레임에 일괄 적용합니다."
                                        >
                                            모든 프레임에 크기·각도·배율 일괄 적용
                                        </button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    {/* Width Slider */}
                                    <div className="space-y-1">
                                        <div className="flex justify-between text-[11px] font-mono text-slate-400">
                                            <span>가로 크기:</span>
                                            <span className="text-purple-300 font-bold">{activeFrame.width || 200}px</span>
                                        </div>
                                        <input
                                            type="range"
                                            min="40"
                                            max="1200"
                                            step="10"
                                            value={activeFrame.width || 200}
                                            onChange={(e) => {
                                                const val = Number(e.target.value);
                                                if (lockAspectRatio) {
                                                    const ratio = (activeFrame.height || 200) / (activeFrame.width || 200);
                                                    updateActiveFrame({ width: val, height: Math.round(val * ratio) });
                                                } else {
                                                    updateActiveFrame({ width: val });
                                                }
                                            }}
                                            className="w-full accent-purple-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                                        />
                                    </div>

                                    {/* Height Slider */}
                                    <div className="space-y-1">
                                        <div className="flex justify-between text-[11px] font-mono text-slate-400">
                                            <span>세로 크기:</span>
                                            <span className="text-purple-300 font-bold">{activeFrame.height || 200}px</span>
                                        </div>
                                        <input
                                            type="range"
                                            min="40"
                                            max="1200"
                                            step="10"
                                            value={activeFrame.height || 200}
                                            onChange={(e) => {
                                                const val = Number(e.target.value);
                                                if (lockAspectRatio) {
                                                    const ratio = (activeFrame.width || 200) / (activeFrame.height || 200);
                                                    updateActiveFrame({ height: val, width: Math.round(val * ratio) });
                                                } else {
                                                    updateActiveFrame({ height: val });
                                                }
                                            }}
                                            className="w-full accent-purple-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                                        />
                                    </div>

                                    {/* Scale Multiplier Slider */}
                                    <div className="space-y-1">
                                        <div className="flex justify-between text-[11px] font-mono text-slate-400">
                                            <span>크기 배율:</span>
                                            <span className="text-purple-300 font-bold">{activeFrame.scale || 1}배</span>
                                        </div>
                                        <input
                                            type="range"
                                            min="0.2"
                                            max="15.0"
                                            step="0.1"
                                            value={activeFrame.scale || 1}
                                            onChange={(e) => updateActiveFrame({ scale: Number(e.target.value) })}
                                            className="w-full accent-purple-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                                        />
                                    </div>

                                    {/* Rotation Slider */}
                                    <div className="space-y-1">
                                        <div className="flex justify-between text-[11px] font-mono text-slate-400">
                                            <span>회전 각도:</span>
                                            <span className="text-purple-300 font-bold">{activeFrame.rotation || 0}°</span>
                                        </div>
                                        <input
                                            type="range"
                                            min="-180"
                                            max="180"
                                            step="5"
                                            value={activeFrame.rotation || 0}
                                            onChange={(e) => updateActiveFrame({ rotation: Number(e.target.value) })}
                                            className="w-full accent-purple-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* 4. Frame Duration & Blending Mode */}
                            <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800/80 space-y-2">
                                <div className="flex items-center justify-between flex-wrap gap-1.5">
                                    <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                                        <Clock size={13} className="text-amber-400" />
                                        <span>재생 시간 & 합성 방식</span>
                                    </span>
                                    <button
                                        onClick={handleBatchApplyTiming}
                                        className="px-2 py-0.5 rounded-lg bg-amber-950 hover:bg-amber-900 border border-amber-700/70 text-amber-200 text-[10px] font-bold transition-all active:scale-95"
                                        title="현재 프레임의 재생 시간과 합성 방식을 모든 프레임에 일괄 적용합니다."
                                    >
                                        모든 프레임에 시간·합성 일괄 적용
                                    </button>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    {/* Frame Duration Slider & Direct Input */}
                                    <div className="space-y-1">
                                        <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                                            <span>프레임 시간:</span>
                                            <div className="flex items-center gap-1">
                                                <input
                                                    type="number"
                                                    min="1"
                                                    max="2000"
                                                    step="1"
                                                    value={activeFrame.duration || 100}
                                                    onChange={(e) => updateActiveFrame({ duration: Math.max(1, Number(e.target.value) || 1) })}
                                                    className="w-14 px-1 py-0.5 bg-slate-950 border border-slate-700 rounded text-center text-amber-300 font-bold text-xs outline-none focus:border-amber-500"
                                                />
                                                <span className="text-amber-300 font-bold text-[10px]">ms</span>
                                            </div>
                                        </div>
                                        <input
                                            type="range"
                                            min="1"
                                            max="600"
                                            step="5"
                                            value={activeFrame.duration || 100}
                                            onChange={(e) => updateActiveFrame({ duration: Number(e.target.value) })}
                                            className="w-full accent-amber-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                                        />
                                        <div className="flex items-center justify-between text-[9px] font-mono text-slate-500">
                                            <span>1ms(초고속)</span>
                                            <span>600ms</span>
                                        </div>
                                    </div>

                                    {/* Blend Mode Selection */}
                                    <div className="space-y-1">
                                        <div className="flex justify-between text-[11px] font-mono text-slate-400">
                                            <span>합성 방식:</span>
                                            <span className="text-indigo-300 font-bold">
                                                {activeFrame.blendMode === 'screen' ? '스크린 빛남' : activeFrame.blendMode === 'lighten' ? '밝게' : activeFrame.blendMode === 'overlay' ? '오버레이' : '기본'}
                                            </span>
                                        </div>
                                        <select
                                            value={activeFrame.blendMode || 'normal'}
                                            onChange={(e) => updateActiveFrame({ blendMode: e.target.value as any })}
                                            className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-xs text-white focus:border-indigo-500 outline-none font-medium"
                                        >
                                            <option value="normal">기본</option>
                                            <option value="screen">스크린 빛남</option>
                                            <option value="lighten">밝게</option>
                                            <option value="overlay">오버레이</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : null}
                </div>
            </div>

            {/* 배경 투명화 모달 (모바일 최적화) */}
            {showBgTransparentModal && (
                <div className="fixed inset-0 z-[300] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
                    <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-indigo-500/50 p-4 sm:p-5 shadow-2xl space-y-4 my-auto">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                            <div className="flex items-center gap-2">
                                <Wand2 size={18} className="text-purple-400 animate-pulse" />
                                <h4 className="text-base sm:text-lg font-bold text-white">이미지 배경 투명화</h4>
                            </div>
                            <button
                                onClick={() => setShowBgTransparentModal(false)}
                                className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        <p className="text-xs text-slate-400 leading-relaxed">
                            선택한 단색 배경(검은색, 흰색, 크로마키 등)을 투명 알파 채널로 변경합니다. 허용 오차 슬라이더를 조정하여 깔끔하게 정돈할 수 있습니다.
                        </p>

                        {/* Removal Mode Options */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-300">제거할 배경 종류 선택</label>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                                {[
                                    { id: 'black', label: '검은색 배경 제거' },
                                    { id: 'white', label: '흰색 배경 제거' },
                                    { id: 'auto', label: '모서리 색상 자동 제거' },
                                    { id: 'green', label: '초록색 크로마키' },
                                    { id: 'custom', label: '직접 색상 지정' },
                                ].map((mode) => (
                                    <button
                                        key={mode.id}
                                        onClick={() => setBgTargetMode(mode.id as any)}
                                        className={`px-2.5 py-2 rounded-xl border text-xs font-bold transition-all text-left truncate ${
                                            bgTargetMode === mode.id
                                                ? 'bg-purple-950/80 border-purple-400 text-purple-200 shadow-md ring-1 ring-purple-400'
                                                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                                        }`}
                                    >
                                        {mode.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Custom Hex Color Picker */}
                        {bgTargetMode === 'custom' && (
                            <div className="flex items-center gap-2 bg-slate-950 p-2 rounded-xl border border-slate-800">
                                <span className="text-xs text-slate-300 font-bold">제거할 색상:</span>
                                <input
                                    type="color"
                                    value={bgCustomHex}
                                    onChange={(e) => setBgCustomHex(e.target.value)}
                                    className="w-8 h-8 rounded cursor-pointer bg-transparent border-0"
                                />
                                <span className="text-xs font-mono text-purple-300">{bgCustomHex}</span>
                            </div>
                        )}

                        {/* Tolerance Slider */}
                        <div className="space-y-1.5 bg-slate-950 p-3 rounded-xl border border-slate-800">
                            <div className="flex justify-between text-xs font-mono">
                                <span className="text-slate-300 font-bold">허용 오차 (민감도):</span>
                                <span className="text-purple-300 font-bold">{bgTolerance}%</span>
                            </div>
                            <input
                                type="range"
                                min="1"
                                max="100"
                                step="1"
                                value={bgTolerance}
                                onChange={(e) => setBgTolerance(Number(e.target.value))}
                                className="w-full accent-purple-500 h-2 bg-slate-800 rounded-lg cursor-pointer"
                            />
                            <div className="flex justify-between text-[10px] text-slate-500">
                                <span>정밀 (좁은 범위)</span>
                                <span>넓게 (유사 색상 포함)</span>
                            </div>
                        </div>

                        {/* Real-time Preview Area with Checkerboard Background */}
                        <div className="space-y-1.5">
                            <span className="text-xs font-bold text-slate-300">투명화 처리 미리보기</span>
                            <div className="w-full h-40 rounded-xl border border-slate-800 bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:12px_12px] bg-slate-950 flex items-center justify-center relative overflow-hidden">
                                {isProcessingBg ? (
                                    <div className="flex items-center gap-2 text-xs text-purple-300">
                                        <RefreshCw size={16} className="animate-spin" />
                                        <span>배경투명 처리 중...</span>
                                    </div>
                                ) : bgPreviewUrl ? (
                                    <img
                                        src={bgPreviewUrl}
                                        alt="미리보기"
                                        className="max-w-full max-h-full object-contain p-2"
                                    />
                                ) : (
                                    <span className="text-xs text-slate-500">이미지가 없습니다.</span>
                                )}
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-slate-800">
                            <button
                                onClick={() => setShowBgTransparentModal(false)}
                                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold"
                            >
                                취소
                            </button>
                            <button
                                onClick={handleApplyBgToCurrentFrame}
                                disabled={!bgPreviewUrl || isProcessingBg}
                                className="px-3.5 py-2 rounded-xl bg-purple-700 hover:bg-purple-600 disabled:opacity-50 text-white text-xs font-bold shadow-lg"
                            >
                                현재 프레임 적용
                            </button>
                            <button
                                onClick={handleApplyBgToAllFrames}
                                disabled={frames.length === 0 || isProcessingBg}
                                className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold shadow-lg flex items-center gap-1"
                            >
                                <Sparkles size={13} />
                                <span>모든 프레임 일괄 적용</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 프로젝트 공유 코드 모달 (모바일 최적화) */}
            {showProjectCodeModal && (
                <div className="fixed inset-0 z-[300] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
                    <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-pink-500/50 p-4 sm:p-5 shadow-2xl space-y-4 my-auto">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                            <div className="flex items-center gap-2">
                                <Share2 size={18} className="text-pink-400" />
                                <h4 className="text-base sm:text-lg font-bold text-white">프로젝트 공유 코드</h4>
                            </div>
                            <button
                                onClick={() => setShowProjectCodeModal(false)}
                                className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        <p className="text-xs text-slate-400 leading-relaxed">
                            애니메이션 프로젝트 세트를 텍스트 코드로 즉시 복사하거나 타인의 공유 코드를 붙여넣어 효과를 복원할 수 있습니다.
                        </p>

                        <div className="space-y-2">
                            <div className="flex justify-between items-center">
                                <span className="text-xs font-bold text-slate-300">내 현재 프로젝트 코드 복사</span>
                                <button
                                    onClick={handleCopyProjectCode}
                                    className="px-3 py-1 rounded-lg bg-pink-950/80 hover:bg-pink-900 border border-pink-500/60 text-xs text-pink-200 font-bold flex items-center gap-1"
                                >
                                    <Copy size={12} />
                                    <span>클립보드 복사</span>
                                </button>
                            </div>

                            <div className="space-y-1.5 pt-2 border-t border-slate-800">
                                <span className="text-xs font-bold text-slate-300">공유 코드 붙여넣어 불러오기</span>
                                <textarea
                                    rows={4}
                                    placeholder="타인에게 전달받은 프로젝트 코드(JSON)를 여기에 붙여넣으세요..."
                                    value={projectCodeInput}
                                    onChange={(e) => setProjectCodeInput(e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white font-mono placeholder:text-slate-600 focus:outline-none focus:border-pink-500"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                            <button
                                onClick={() => setShowProjectCodeModal(false)}
                                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold"
                            >
                                닫기
                            </button>
                            <button
                                onClick={handleImportProjectCode}
                                disabled={!projectCodeInput.trim()}
                                className="px-4 py-2 rounded-xl bg-pink-600 hover:bg-pink-500 disabled:opacity-50 text-white text-xs font-bold shadow-lg"
                            >
                                코드 적용 불러오기
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 1. 스프라이트 시트 일괄 슬라이싱 모달 */}
            <SpriteSheetModal
                isOpen={showSpriteSheetModal}
                onClose={() => setShowSpriteSheetModal(false)}
                onApplyFrames={handleApplyGeneratedFrames}
                showToast={showToast}
            />

            {/* 2. 프로시저럴 파티클 캔버스 생성 모달 */}
            <ProceduralParticleModal
                isOpen={showProceduralModal}
                onClose={() => setShowProceduralModal(false)}
                onApplyFrames={handleApplyGeneratedFrames}
                showToast={showToast}
            />
        </div>
    );
};

export default SkillFrameAnimationEditor;
