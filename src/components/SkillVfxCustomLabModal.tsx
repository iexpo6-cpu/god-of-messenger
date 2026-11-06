import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
    X, Sparkles, Film, Image as ImageIcon, Video, Eye, Crown, 
    Upload, Trash2, CheckCircle2, AlertTriangle, Palette, 
    Sliders, Play, RefreshCw, Zap, Shield, Flame, Sword, 
    Check, Lock, ArrowUpDown, UserCheck, Search, Info, Wand2,
    Crosshair, Sun, Moon, Wind, Droplets, Mountain, FolderDown, FolderUp,
    Link, Loader2, Layers, CloudUpload
} from 'lucide-react';
import { 
    Character, Skill, SkillFrameAnimation, ClassTier, Item, SkillType 
} from '../types';
import { 
    SHINRYOKU_THEMES, 
    ShinryokuTheme, 
    RenderCustomVfxShape, 
    ParsedVfxTheme, 
    parseVfxColor,
    VFX_SHAPE_OPTIONS as ALL_COMBAT_VFX_SHAPES,
    CUSTOM_VFX_PRESETS as COMBAT_VFX_PRESETS
} from './CombatVFX';
import { SkillFrameAnimationEditor, optimizeFrameImage } from './SkillFrameAnimationEditor';
import { generateDefaultVisualUrl, optimizeImage } from '../utils';
import { exportAllSkillEffectsToFile, importSkillEffectsFromText, collectAllSkillEffects, AllSkillEffectsProjectFile } from '../services/skillEffectProjectService';
import { GoogleDriveAuthPanel } from './GoogleDriveAuthPanel';
import { findOrCreateAppFolder, uploadTextFileToFolder, shareFileWithAnyone, getFileWebViewLink, fetchFileContentFromUrl, uploadVfxFileToDrive, downloadVfxFileFromDrive, getVfxFileMeta, getCachedAccessToken } from '../services/googleDriveService';
import { signInWithGoogleDrive } from '../services/googleDriveAuthService';
import { uploadImageToWeb } from '../services/imageCacheService';
import {
    RPG_SKILL_ICONS as BASE_ICONS,
    getSkillIconComponent,
    SKILL_EMBLEM_PRESETS,
    buildSkillEmblemDataUri,
    searchOpenSourceGameIcons,
    fetchOpenSourceGameIconAsEmblemDataUri
} from '../services/rpgIconService';

export interface VfxShapeOptionItem {
    id: string;
    name: string;
    desc: string;
    tierLevel: number;
    tierName: string;
    badgeColor?: string;
}

export const VFX_SHAPE_OPTIONS: VfxShapeOptionItem[] = ALL_COMBAT_VFX_SHAPES.map(s => ({
    id: s.id,
    name: s.name,
    desc: s.description,
    tierLevel: s.requiredTierLevel,
    tierName: s.requiredTierName,
    badgeColor: s.badgeColor
}));

const COMBINED_VFX_PRESETS: Record<string, { name: string; primary: string; secondary: string; runes: string[]; icon?: any; description?: string }> = {
    ...COMBAT_VFX_PRESETS,
    'dark_abyss': {
        name: '칠흑의 심연',
        primary: '#a855f7',
        secondary: '#6b21a8',
        runes: ['✦', '☠', '🌑', '❖'],
        icon: Wand2,
        description: '어둠의 심연과 보랏빛 공허의 오라'
    },
    'jade_soul': {
        name: '비취의 영혼',
        primary: '#10b981',
        secondary: '#059669',
        runes: ['🍃', '✧', '◈', '✦'],
        icon: Sparkles,
        description: '맑고 고결한 에메랄드 비취빛 영혼의 불꽃'
    },
    'sky_thunder': {
        name: '천공의 뇌격',
        primary: '#38bdf8',
        secondary: '#6366f1',
        runes: ['⚡', 'ϟ', '✦', '✧'],
        icon: Zap,
        description: '하늘을 가르는 푸른 벼락과 자색 방전 파동'
    },
    'eternal_frost': {
        name: '영겁의 빙화',
        primary: '#67e8f9',
        secondary: '#3b82f6',
        runes: ['❄', '◇', '✧', '❆'],
        icon: Sparkles,
        description: '영하의 냉기와 수정처럼 반짝이는 얼음꽃'
    },
    'void_magic': {
        name: '공허의 마력',
        primary: '#c084fc',
        secondary: '#4c1d95',
        runes: ['❖', '✦', '🔮', '✧'],
        icon: Wand2,
        description: '차원을 비트는 짙은 자주색 비전 공허력'
    },
    'mystic_aurora': {
        name: '환상의 오로라',
        primary: '#2dd4bf',
        secondary: '#a855f7',
        runes: ['🌈', '✧', '✦', '✨'],
        icon: Sparkles,
        description: '밤하늘을 수놓는 영롱한 다색 오로라의 빛'
    },
    'black_flame': {
        name: '흑염의 지옥',
        primary: '#f97316',
        secondary: '#18181b',
        runes: ['🔥', '☠', '✦', '♠'],
        icon: Flame,
        description: '모든 것을 삼키는 칠흑과 오렌지 화염의 소용돌이'
    }
};

const CUSTOM_VFX_PRESETS = COMBINED_VFX_PRESETS;

const parseVfxCustomization = (
    themeKey?: string, 
    customColor?: string, 
    shapeKey?: string, 
    shinryokuType?: string
): ParsedVfxTheme & { primaryColor: string; secondaryColor: string; themeKey?: string; shapeKey?: string } => {
    const baseShinTheme = (CUSTOM_VFX_PRESETS as any)[themeKey || ''] || 
                          (SHINRYOKU_THEMES as any)[themeKey || ''] || 
                          (SHINRYOKU_THEMES as any)[shinryokuType || '화염계'] || 
                          SHINRYOKU_THEMES['화염계'];

    const parsed = parseVfxColor(customColor, baseShinTheme);
    return {
        ...parsed,
        primaryColor: parsed.primary,
        secondaryColor: parsed.secondary,
        themeKey,
        shapeKey
    };
};

interface SkillVfxCustomLabModalProps {
    isOpen: boolean;
    onClose: () => void;
    character: Character;
    onUpdateCharacter: (newChar: Character, logMsg?: string) => void;
    facilityLevel?: number;
    initialTab?: 'vfx' | 'cutin' | 'frame_vfx' | 'video' | 'icon';
}

const isUrlString = (str?: string) => Boolean(str && (str.startsWith('http://') || str.startsWith('https://') || str.startsWith('/') || str.startsWith('data:')));

const isCustomEntity = (entity: any): boolean => {
    if (!entity) return false;
    return Boolean(entity.isCustom || entity.isCustomMonster || entity.isCustomCompanion);
};

const getSkillTierRank = (tier?: ClassTier | string): number => {
    if (!tier) return 1;
    if (tier === ClassTier.FINAL || tier === ClassTier.BOND) return 4;
    if (tier === ClassTier.LAST) return 3;
    if (tier === ClassTier.SECOND) return 2;
    if (tier === ClassTier.FIRST) return 1;
    return 1;
};

const CUSTOM_VFX_MANA_CRYSTAL = 5;
const CUSTOM_VFX_FLOWER = 0;

export const getShinryokuFlowerCount = (char: Character): { base: number; inv: number; total: number } => {
    const base = char.base?.resources?.shinryoku_flower || 0;
    const inv = (char.inventory || []).reduce((sum, item) => {
        const name = (item.name || '').replace(/\s+/g, '');
        if (name.includes('신력의꽃') || name.includes('신력꽃')) {
            return sum + (item.quantity || 1);
        }
        return sum;
    }, 0);
    return { base, inv, total: base + inv };
};

export const SkillVfxCustomLabModal: React.FC<SkillVfxCustomLabModalProps> = ({
    isOpen,
    onClose,
    character,
    onUpdateCharacter,
    facilityLevel = 1,
    initialTab = 'vfx'
}) => {
    // Facility Level Rules:
    // Lv.1: Skill VFX & Icon (스킬 이펙트 변경)
    // Lv.2: Cut-in (스킬 컷신)
    // Lv.3: Frame Effect (프레임 이펙트 제작)
    // Lv.5: Video (이펙트 영상)
    const isVfxUnlocked = facilityLevel >= 1;
    const isCutinUnlocked = facilityLevel >= 2;
    const isFrameVfxUnlocked = facilityLevel >= 3;
    const isVideoUnlocked = facilityLevel >= 5;

    const [activeTab, setActiveTab] = useState<'vfx' | 'icon' | 'cutin' | 'frame_vfx' | 'video'>('vfx');

    // Filter & Selection State
    const [targetId, setTargetId] = useState<string>('player');
    const [targetFilter, setTargetFilter] = useState<'all' | 'custom' | 'companion' | 'monster'>('all');
    const [targetSort, setTargetSort] = useState<'custom' | 'level' | 'name'>('custom');
    const [targetSearch, setTargetSearch] = useState<string>('');
    const [selectedSkillName, setSelectedSkillName] = useState<string>('');

    // VFX Editing States
    const [editVfxTheme, setEditVfxTheme] = useState<string>('default');
    const [editVfxColor, setEditVfxColor] = useState<string>('');
    const [editVfxShape, setEditVfxShape] = useState<string>('DEFAULT');
    const [editVfxScale, setEditVfxScale] = useState<number>(1.0);
    const [shapeTierFilter, setShapeTierFilter] = useState<'all' | '1' | '2' | '3' | '4'>('all');
    const [shapeSearch, setShapeSearch] = useState<string>('');
    const [colorMode, setColorMode] = useState<'solid' | 'gradient'>('solid');
    const [gradColor1, setGradColor1] = useState<string>('#00f5ff');
    const [gradColor2, setGradColor2] = useState<string>('#7000ff');
    const [gradColor3, setGradColor3] = useState<string>('#ff007f');
    const [useGradColor3, setUseGradColor3] = useState<boolean>(false);
    const [gradAngle, setGradAngle] = useState<string>('135deg');
    const [editIcon, setEditIcon] = useState<string>('Sword');
    const [editImageUrl, setEditImageUrl] = useState<string>('');
    const [editIllustrationUrl, setEditIllustrationUrl] = useState<string>('');
    const [editVideoUrl, setEditVideoUrl] = useState<string>('');
    const [vfxLoopKey, setVfxLoopKey] = useState<number>(0);

    // Toast Message
    const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'warning' | 'info' } | null>(null);
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const cutinFileInputRef = useRef<HTMLInputElement | null>(null);
    const videoFileInputRef = useRef<HTMLInputElement | null>(null);
    const allProjectFileInputRef = useRef<HTMLInputElement | null>(null);

    // 구글 드라이브 상태 및 변수들
    const [showDrivePanel, setShowDrivePanel] = useState<boolean>(false);
    const [driveToken, setDriveToken] = useState<string | null>(() => getCachedAccessToken());
    const [isProcessingDrive, setIsProcessingDrive] = useState(false);
    const [driveAllShareLink, setDriveAllShareLink] = useState('');
    const [driveAllCopyFeedback, setDriveAllCopyFeedback] = useState(false);
    const [driveImportInput, setDriveImportInput] = useState('');
    const [driveAllMetaTime, setDriveAllMetaTime] = useState<string | null>(null);
    
    // 개별 스킬 구글 드라이브 상태
    const [driveSkillShareLink, setDriveSkillShareLink] = useState('');
    const [driveSkillCopyFeedback, setDriveSkillCopyFeedback] = useState(false);
    const [driveSkillImportInput, setDriveSkillImportInput] = useState('');
    const [driveSkillMetaTime, setDriveSkillMetaTime] = useState<string | null>(null);
    const [isBatchReducing, setIsBatchReducing] = useState<boolean>(false);

    // 구글 드라이브에 보관된 이펙트 수정 일시 조회
    const refreshDriveMeta = async (token?: string | null) => {
        const t = token !== undefined ? token : driveToken;
        if (!t) return;
        try {
            const allMeta = await getVfxFileMeta('Shinryoku_Cloud_All_Vfx_Project.txt', t);
            setDriveAllMetaTime(allMeta ? allMeta.modifiedTime : null);
            if (selectedSkillName) {
                const skillMeta = await getVfxFileMeta(`Shinryoku_Cloud_Skill_Vfx_${selectedSkillName}.txt`, t);
                setDriveSkillMetaTime(skillMeta ? skillMeta.modifiedTime : null);
            }
        } catch (e) {
            console.warn('이펙트 메타 조회 실패:', e);
        }
    };

    useEffect(() => {
        if (isOpen) {
            const t = getCachedAccessToken();
            setDriveToken(t);
            if (t) refreshDriveMeta(t);
        }
    }, [isOpen]);

    useEffect(() => {
        if (driveToken) {
            refreshDriveMeta(driveToken);
        }
    }, [driveToken, selectedSkillName]);

    // 전체 이펙트 프로젝트 구글 드라이브 등록 (기존 파일 삭제 후 신규 저장하여 용량 최적화)
    const handleUploadAllToDrive = async () => {
        if (!driveToken) {
            alert('구글 계정을 먼저 연결해 주십시오.');
            return;
        }

        const effects = collectAllSkillEffects(character);
        if (effects.length === 0) {
            showToast('등록된 커스텀 스킬 이펙트나 프레임 애니메이션 데이터가 없습니다.', 'warning');
            return;
        }

        const projectData: AllSkillEffectsProjectFile = {
            version: '1.0',
            type: 'AllSkillEffectsProject',
            title: '전체 스킬 이펙트 통합 프로젝트',
            createdAt: new Date().toISOString(),
            characterName: character.name || '주인공',
            totalCount: effects.length,
            effects: effects
        };

        setIsProcessingDrive(true);
        setDriveAllShareLink('');

        try {
            const fileName = 'Shinryoku_Cloud_All_Vfx_Project.txt';
            const rawText = JSON.stringify(projectData, null, 2);
            
            // 기존 파일 삭제 후 신규 업로드 및 공유 링크 생성
            const fileId = await uploadVfxFileToDrive(fileName, rawText, driveToken);
            const link = await getFileWebViewLink(driveToken, fileId);
            
            setDriveAllShareLink(link);
            showToast(`구글 드라이브에 전체 스킬 이펙트(${effects.length}개)를 등록했습니다. (기존 보관본 삭제 후 갱신)`, 'success');
            await refreshDriveMeta(driveToken);
        } catch (err: any) {
            console.error(err);
            alert(`구글 드라이브 등록 중 오류가 발생했습니다: ${err.message}`);
        } finally {
            setIsProcessingDrive(false);
        }
    };

    // 전체 이펙트 프로젝트 구글 드라이브 직접 다운로드 또는 링크로부터 로드
    const handleDownloadAllFromDrive = async (useDirectCloud: boolean = false) => {
        if (!driveToken) {
            alert('구글 계정을 먼저 연결해 주십시오.');
            return;
        }

        const inputUrl = driveImportInput.trim();
        if (!useDirectCloud && !inputUrl) {
            showToast('불러올 전체 프로젝트 공유 링크를 입력해 주십시오.', 'warning');
            return;
        }

        setIsProcessingDrive(true);

        try {
            let rawText = '';
            if (useDirectCloud || !inputUrl) {
                // 내 구글 드라이브 계정의 보관 파일에서 다이렉트 로드 (세이브파일 불러오기 방식)
                const fileName = 'Shinryoku_Cloud_All_Vfx_Project.txt';
                const resText = await downloadVfxFileFromDrive(fileName, driveToken);
                if (!resText) {
                    showToast('구글 드라이브에 저장된 전체 이펙트 보관본이 없습니다.', 'warning');
                    setIsProcessingDrive(false);
                    return;
                }
                rawText = resText;
            } else {
                // 공유 링크를 통해 다운로드
                rawText = await fetchFileContentFromUrl(driveToken, inputUrl);
            }

            const res = importSkillEffectsFromText(character, rawText, selectedSkillName);
            if (res.success) {
                onUpdateCharacter(res.updatedCharacter, `[스킬 이펙트] 클라우드 동기화 프로젝트 일괄 복원 (${res.appliedCount}개 스킬)`);
                showToast(useDirectCloud ? '내 구글 드라이브로부터 전체 이펙트를 성공적으로 불러왔습니다!' : '공유 링크를 통해 전체 이펙트를 성공적으로 복원했습니다!', 'success');
                if (!useDirectCloud) setDriveImportInput('');
                await refreshDriveMeta(driveToken);
            } else {
                showToast(res.message, 'warning');
            }
        } catch (err: any) {
            console.error(err);
            alert(`클라우드 이펙트 복원 실패: ${err.message}`);
        } finally {
            setIsProcessingDrive(false);
        }
    };

    // 현재 선택된 스킬 1개에 대한 구글 드라이브 이펙트 등록 (기존 파일 삭제 후 신규 저장하여 용량 최적화)
    const handleUploadSkillToDrive = async () => {
        if (!driveToken) {
            alert('구글 계정을 먼저 연결해 주십시오.');
            return;
        }
        if (!selectedSkillName) {
            showToast('편집할 스킬을 먼저 선택해 주십시오.', 'warning');
            return;
        }

        const allEffects = collectAllSkillEffects(character);
        let skillEffect = allEffects.find(eff => eff.skillName === selectedSkillName);

        // 캐릭터에 아직 저장되지 않은 경우 현재 편집 창의 설정값으로 구성
        if (!skillEffect) {
            skillEffect = {
                skillName: selectedSkillName,
                ownerName: character.name || '주인공',
                ownerType: 'player',
                vfxTheme: editVfxTheme,
                vfxColor: editVfxColor,
                vfxShape: editVfxShape,
                vfxScale: editVfxScale,
                icon: editIcon,
                imageUrl: editImageUrl,
                illustrationUrl: editIllustrationUrl,
                videoUrl: editVideoUrl,
                frameAnimation: currentSelectedSkill ? (currentSelectedSkill as any).frameAnimation : undefined
            };
        }

        const projectData: AllSkillEffectsProjectFile = {
            version: '1.0',
            type: 'AllSkillEffectsProject',
            title: `단일 스킬 이펙트 - ${selectedSkillName}`,
            createdAt: new Date().toISOString(),
            characterName: character.name || '주인공',
            totalCount: 1,
            effects: [skillEffect]
        };

        setIsProcessingDrive(true);
        setDriveSkillShareLink('');

        try {
            const fileName = `Shinryoku_Cloud_Skill_Vfx_${selectedSkillName}.txt`;
            const rawText = JSON.stringify(projectData, null, 2);
            
            // 기존 파일 삭제 후 신규 업로드 및 공유 링크 생성
            const fileId = await uploadVfxFileToDrive(fileName, rawText, driveToken);
            const link = await getFileWebViewLink(driveToken, fileId);
            
            setDriveSkillShareLink(link);
            showToast(`[${selectedSkillName}] 스킬 이펙트를 구글 드라이브에 등록했습니다. (기존 보관본 삭제 후 갱신)`, 'success');
            await refreshDriveMeta(driveToken);
        } catch (err: any) {
            console.error(err);
            alert(`구글 드라이브 등록 중 오류가 발생했습니다: ${err.message}`);
        } finally {
            setIsProcessingDrive(false);
        }
    };

    // 개별 스킬 이펙트를 구글 드라이브 직접 다운로드 또는 링크로부터 불러와 적용
    const handleDownloadSkillFromDrive = async (useDirectCloud: boolean = false) => {
        if (!driveToken) {
            alert('구글 계정을 먼저 연결해 주십시오.');
            return;
        }
        if (!selectedSkillName) {
            showToast('편집할 스킬을 먼저 선택해 주십시오.', 'warning');
            return;
        }

        const inputUrl = driveSkillImportInput.trim();
        if (!useDirectCloud && !inputUrl) {
            showToast('불러올 개별 이펙트 공유 링크를 입력해 주십시오.', 'warning');
            return;
        }

        setIsProcessingDrive(true);

        try {
            let rawText = '';
            if (useDirectCloud || !inputUrl) {
                // 내 계정 드라이브에서 직접 로드 (세이브파일 불러오기 방식)
                const fileName = `Shinryoku_Cloud_Skill_Vfx_${selectedSkillName}.txt`;
                const resText = await downloadVfxFileFromDrive(fileName, driveToken);
                if (!resText) {
                    showToast(`구글 드라이브에 [${selectedSkillName}] 스킬 이펙트 보관본이 없습니다.`, 'warning');
                    setIsProcessingDrive(false);
                    return;
                }
                rawText = resText;
            } else {
                // 공유 링크를 통해 로드
                rawText = await fetchFileContentFromUrl(driveToken, inputUrl);
            }
            
            let parsed;
            try {
                parsed = JSON.parse(rawText);
            } catch(e) {
                throw new Error('유효한 데이터 포맷이 아닙니다.');
            }

            if (parsed.type === 'AllSkillEffectsProject' && Array.isArray(parsed.effects)) {
                if (selectedSkillName) {
                    parsed.effects = parsed.effects.map((eff: any) => ({
                        ...eff,
                        skillName: selectedSkillName
                    }));
                }
            }

            const processedText = JSON.stringify(parsed);
            const res = importSkillEffectsFromText(character, processedText, selectedSkillName);
            if (res.success) {
                onUpdateCharacter(res.updatedCharacter, `[스킬 이펙트] 클라우드 이식 복원 (${selectedSkillName})`);
                showToast(useDirectCloud ? `내 구글 드라이브로부터 [${selectedSkillName}] 이펙트를 성공적으로 불러왔습니다!` : `공유 링크를 통해 [${selectedSkillName}] 이펙트를 성공적으로 복원했습니다!`, 'success');
                if (!useDirectCloud) setDriveSkillImportInput('');
                await refreshDriveMeta(driveToken);
                
                const updatedSkill = res.updatedCharacter.skills?.find(s => s.name === selectedSkillName) 
                    || res.updatedCharacter.companions?.flatMap(c => c.skills || []).find(s => s.name === selectedSkillName);
                
                if (updatedSkill) {
                    setEditVfxTheme((updatedSkill as any).vfxTheme || 'default');
                    setEditVfxColor((updatedSkill as any).vfxColor || '');
                    setEditVfxShape((updatedSkill as any).vfxShape || 'DEFAULT');
                    setEditVfxScale((updatedSkill as any).vfxScale || 1.0);
                    setEditIcon(updatedSkill.icon || 'Sword');
                    setEditImageUrl(updatedSkill.imageUrl || '');
                    setEditIllustrationUrl(updatedSkill.illustrationUrl || '');
                    setEditVideoUrl((updatedSkill as any).videoUrl || '');
                    setVfxLoopKey(prev => prev + 1);
                }
            } else {
                showToast(res.message, 'warning');
            }
        } catch (err: any) {
            console.error(err);
            alert(`클라우드 이펙트 복원 실패: ${err.message}`);
        } finally {
            setIsProcessingDrive(false);
        }
    };

    // Adjust tab according to level unlock
    useEffect(() => {
        if (isOpen) {
            if (initialTab === 'video' && isVideoUnlocked) setActiveTab('video');
            else if (initialTab === 'frame_vfx' && isFrameVfxUnlocked) setActiveTab('frame_vfx');
            else if (initialTab === 'cutin' && isCutinUnlocked) setActiveTab('cutin');
            else if (initialTab === 'icon') setActiveTab('icon');
            else setActiveTab('vfx');
        }
    }, [isOpen, initialTab, isCutinUnlocked, isFrameVfxUnlocked, isVideoUnlocked]);

    // Auto Caster Illustration Cut-in Mode ('last_and_final' | 'final_only' | 'custom_only' | 'off')
    const [autoCasterCutinMode, setAutoCasterCutinMode] = useState<'last_and_final' | 'final_only' | 'custom_only' | 'off'>(() => {
        try {
            const saved = localStorage.getItem('game_auto_caster_cutin_mode');
            if (saved === 'last_and_final' || saved === 'final_only' || saved === 'custom_only' || saved === 'off') {
                return saved;
            }
        } catch {}
        return 'last_and_final';
    });

    const handleChangeAutoCutinMode = (mode: 'last_and_final' | 'final_only' | 'custom_only' | 'off') => {
        setAutoCasterCutinMode(mode);
        try {
            localStorage.setItem('game_auto_caster_cutin_mode', mode);
        } catch {}
        const labelMap = {
            last_and_final: '3차(라스트) & 4차(파이널/인연) 시전자 일러스트 자동 컷인 활성화',
            final_only: '4차(파이널/인연) 등급만 시전자 일러스트 자동 컷인 활성화',
            custom_only: '직접 등록한 전용 컷신이 있을 때만 컷인 표시',
            off: '전투 중 모든 스킬 일러스트 컷인 끄기',
        };
        showToast(`⚡ [컷인 설정 변경] ${labelMap[mode]}`, 'info');
    };

    // RPG Icon Category & Open-Source Game-Icons Search State
    const [iconCategoryFilter, setIconCategoryFilter] = useState<'all' | 'martial' | 'magic' | 'holy' | 'dark'>('all');
    const [gameIconSearchQuery, setGameIconSearchQuery] = useState<string>('용');
    const [gameIconResults, setGameIconResults] = useState<string[]>([]);
    const [isSearchingGameIcons, setIsSearchingGameIcons] = useState<boolean>(false);
    const [gameIconColor, setGameIconColor] = useState<string>('#fbbf24');
    const [gameIconBg, setGameIconBg] = useState<string>('#0f172a');

    const handleSearchGameIcons = async (qOverride?: string) => {
        const q = (qOverride !== undefined ? qOverride : gameIconSearchQuery).trim();
        if (!q) return;
        setIsSearchingGameIcons(true);
        try {
            const icons = await searchOpenSourceGameIcons(q, 24);
            setGameIconResults(icons);
            if (icons.length === 0) {
                showToast(`'${q}' 검색 결과가 없습니다. (예: 검, 용, 번개, 날개, 해골, 불, 마법)`, 'warning');
            }
        } finally {
            setIsSearchingGameIcons(false);
        }
    };

    const handleSelectOpenSourceGameIcon = async (iconFullName: string) => {
        const dataUri = await fetchOpenSourceGameIconAsEmblemDataUri(iconFullName, gameIconColor, gameIconBg);
        if (dataUri) {
            setEditImageUrl(dataUri);
            showToast('오픈소스 RPG 아이콘 엠블럼이 미리보기에 적용되었습니다! [아이콘 저장]을 눌러 확정하세요.', 'success');
        } else {
            showToast('아이콘 데이터를 불러오지 못했습니다.', 'warning');
        }
    };

    const showToast = (text: string, type: 'success' | 'warning' | 'info' = 'info') => {
        setToastMessage({ text, type });
        setTimeout(() => setToastMessage(null), 3200);
    };

    // Candidate Targets List (Player + Custom Companions + Custom Monsters)
    const allTargets = useMemo(() => [
        { 
            id: 'player', 
            name: character.name, 
            level: character.level, 
            job: character.job || '주인공', 
            isPlayer: true, 
            isCustom: true,
            isMonster: false,
            avatar: character.visualUrl || generateDefaultVisualUrl(character.name, '기타', '인간', '남성'), 
            element: character.shinryokuType || '화염계' 
        },
        ...(character.companions || []).map(c => {
            const isMon = !!(c.isMonster || (c as any).isCustomMonster || (c as any).monsterData || c.race === '몬스터' || c.race === '마수');
            return { 
                id: c.id, 
                name: c.name, 
                level: c.level || 1, 
                job: c.job || c.classType || '동료', 
                isPlayer: false, 
                isCustom: isCustomEntity(c),
                isMonster: isMon,
                avatar: (c as any).avatar || c.visualUrl || (c as any).monsterData?.visualUrl || generateDefaultVisualUrl(c.name, '기타', '인간', '남성'), 
                element: c.shinryokuType || (c as any).element || '무속성' 
            };
        }),
        ...(character.inactiveCompanions || []).map(c => {
            const isMon = !!(c.isMonster || (c as any).isCustomMonster || (c as any).monsterData || c.race === '몬스터' || c.race === '마수');
            return { 
                id: c.id, 
                name: c.name, 
                level: c.level || 1, 
                job: c.job || c.classType || '동료', 
                isPlayer: false, 
                isCustom: isCustomEntity(c),
                isMonster: isMon,
                avatar: (c as any).avatar || c.visualUrl || (c as any).monsterData?.visualUrl || generateDefaultVisualUrl(c.name, '기타', '인간', '남성'), 
                element: c.shinryokuType || (c as any).element || '무속성' 
            };
        }),
        ...(character.base?.capturedMonsters || []).map((m: any, idx: number) => ({
            id: m.id || `captured_${idx}`,
            name: m.name,
            level: m.level || 1,
            job: m.stage || '포획 몬스터',
            isPlayer: false,
            isCustom: isCustomEntity(m),
            isMonster: true,
            avatar: m.visualUrl || m.imageUrl || 'https://i.ibb.co/Kz56VGDS/image.png',
            element: m.shinryokuType || m.element || '무속성'
        }))
    ], [character]);

    const filteredTargets = useMemo(() => {
        let list = [...allTargets];
        if (targetFilter === 'custom') {
            list = list.filter(t => t.isCustom);
        } else if (targetFilter === 'companion') {
            list = list.filter(t => !t.isMonster);
        } else if (targetFilter === 'monster') {
            list = list.filter(t => t.isMonster);
        }

        if (targetSearch.trim()) {
            const q = targetSearch.trim().toLowerCase();
            list = list.filter(t => t.name.toLowerCase().includes(q) || t.job.toLowerCase().includes(q));
        }

        if (targetSort === 'custom') {
            list.sort((a, b) => {
                if (a.isCustom !== b.isCustom) return a.isCustom ? -1 : 1;
                return b.level - a.level;
            });
        } else if (targetSort === 'level') {
            list.sort((a, b) => b.level - a.level);
        } else if (targetSort === 'name') {
            list.sort((a, b) => a.name.localeCompare(b.name, 'ko'));
        }
        return list;
    }, [allTargets, targetFilter, targetSort, targetSearch]);

    const activeTarget = useMemo(() => {
        if (targetId === 'player') return character;
        return character.companions?.find(c => c.id === targetId) || 
               character.inactiveCompanions?.find(c => c.id === targetId) || 
               character.base?.capturedMonsters?.find((m: any) => m.id === targetId) || 
               character;
    }, [character, targetId]);

    const isPlayerTarget = targetId === 'player';
    const isCustomCompanion = !isPlayerTarget && isCustomEntity(activeTarget);
    // ONLY Player and Custom Companions/Monsters are allowed to customize
    const isAllowedToCustomize = isPlayerTarget || isCustomCompanion;

    // Collect all skills for active target (패시브 포함 - 아이콘 탭 등에서 사용)
    const allTargetSkills = useMemo(() => {
        if (!activeTarget) return [];
        const normalSkills = (activeTarget.skills || []).map((s: Skill, idx: number) => ({ ...s, originalIndex: idx, isBond: false }));
        const bondSkills = isPlayerTarget 
            ? (character.bondSkills || []).filter(s => !s.sourceId || s.sourceId === 'player').map((s: Skill, idx: number) => ({ ...s, originalIndex: idx, isBond: true }))
            : (character.bondSkills || []).filter(s => s.sourceId === activeTarget.id || s.companionId === activeTarget.id).map((s: Skill, idx: number) => ({ ...s, originalIndex: idx, isBond: true }));
        return [...normalSkills, ...bondSkills];
    }, [activeTarget, isPlayerTarget, character.bondSkills]);

    // Current tab's target skills list:
    // 스킬 이펙트 변경(vfx), 스킬 컷신(cutin), 이펙트 영상(video), 프레임 이펙트(frame_vfx) 탭에서는 패시브 스킬 제외
    // 스킬 아이콘(icon) 탭에서는 패시브 스킬 포함
    const targetSkills = useMemo(() => {
        if (activeTab === 'icon') {
            return allTargetSkills;
        }
        return allTargetSkills.filter(s => s.type !== SkillType.PASSIVE);
    }, [allTargetSkills, activeTab]);

    // Selected skill
    const currentSelectedSkill = useMemo(() => {
        if (!targetSkills.length) return null;
        if (selectedSkillName) {
            const found = targetSkills.find(s => s.name === selectedSkillName);
            if (found) return found;
        }
        return targetSkills[0];
    }, [targetSkills, selectedSkillName]);

    const skillTierLevel = useMemo(() => {
        if (!currentSelectedSkill) return 1;
        return getSkillTierRank((currentSelectedSkill as any).isBond ? ClassTier.FINAL : currentSelectedSkill.tier);
    }, [currentSelectedSkill]);

    const isCutinEligible = useMemo(() => {
        if (!currentSelectedSkill) return false;
        const tier = currentSelectedSkill.tier;
        return (
            tier === ClassTier.FINAL || 
            tier === ClassTier.BOND || 
            (currentSelectedSkill as any).isBond || 
            currentSelectedSkill.isBondSkill || 
            tier === ClassTier.LAST
        );
    }, [currentSelectedSkill]);

    // Filtered VFX Shapes based on tier filter and search query
    const filteredVfxShapes = useMemo(() => {
        return VFX_SHAPE_OPTIONS.filter(shape => {
            if (shapeTierFilter === '1' && shape.tierLevel < 1) return false;
            if (shapeTierFilter === '2' && shape.tierLevel < 2) return false;
            if (shapeTierFilter === '3' && shape.tierLevel < 3) return false;
            if (shapeTierFilter === '4' && shape.tierLevel < 4) return false;
            if (shapeSearch.trim()) {
                const q = shapeSearch.trim().toLowerCase();
                const nameMatch = shape.name.toLowerCase().includes(q);
                const descMatch = shape.desc ? shape.desc.toLowerCase().includes(q) : false;
                return nameMatch || descMatch;
            }
            return true;
        });
    }, [shapeTierFilter, shapeSearch]);

    // When selecting a skill, synchronize state
    const selectSkillForCustomization = (skill: Skill) => {
        setSelectedSkillName(skill.name);
        setEditVfxTheme((skill as any).vfxTheme || 'default');
        setEditVfxColor((skill as any).vfxColor || '');
        setEditVfxShape((skill as any).vfxShape || 'DEFAULT');
        setEditVfxScale((skill as any).vfxScale || 1.0);
        setEditIcon(skill.icon || 'Sword');
        setEditImageUrl(skill.imageUrl || '');
        setEditIllustrationUrl(skill.illustrationUrl || '');
        setEditVideoUrl((skill as any).videoUrl || '');

        if ((skill as any).vfxColor && (skill as any).vfxColor.includes('gradient')) {
            setColorMode('gradient');
        } else {
            setColorMode('solid');
        }
    };

    // Target or Tab change sync
    useEffect(() => {
        if (targetSkills.length > 0) {
            const isCurrentlySelectedValid = targetSkills.some(s => s.name === selectedSkillName);
            if (!isCurrentlySelectedValid) {
                selectSkillForCustomization(targetSkills[0]);
            }
        } else {
            setSelectedSkillName('');
        }
    }, [targetId, activeTab, targetSkills]);

    // --------------------------------------------------------------------------
    // File Upload Handlers
    // --------------------------------------------------------------------------
    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'icon' | 'cutin') => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            const base64 = event.target?.result as string;
            if (base64) {
                try {
                    const optimized = await optimizeImage(base64);
                    if (type === 'icon') setEditImageUrl(optimized);
                    if (type === 'cutin') setEditIllustrationUrl(optimized);
                    showToast('이미지가 성공적으로 로드되었습니다.', 'success');
                } catch {
                    if (type === 'icon') setEditImageUrl(base64);
                    if (type === 'cutin') setEditIllustrationUrl(base64);
                }
            }
        };
        reader.readAsDataURL(file);
    };

    const handleVideoFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 25 * 1024 * 1024) {
            showToast('비디오 파일 크기는 25MB 이하여야 합니다.', 'warning');
            return;
        }
        const reader = new FileReader();
        reader.onload = (event) => {
            const base64 = event.target?.result as string;
            if (base64) {
                setEditVideoUrl(base64);
                showToast('비디오 파일이 등록되었습니다.', 'success');
            }
        };
        reader.readAsDataURL(file);
    };

    const formatEmbedUrl = (url: string): string => {
        if (!url) return '';
        if (url.includes('youtu.be/')) {
            const id = url.split('youtu.be/')[1]?.split('?')[0];
            return `https://www.youtube.com/embed/${id}?autoplay=1&mute=1&loop=1&playlist=${id}`;
        }
        if (url.includes('youtube.com/watch')) {
            const params = new URLSearchParams(url.split('?')[1]);
            const id = params.get('v');
            return `https://www.youtube.com/embed/${id}?autoplay=1&mute=1&loop=1&playlist=${id}`;
        }
        if (url.includes('youtube.com/shorts/')) {
            const id = url.split('shorts/')[1]?.split('?')[0];
            return `https://www.youtube.com/embed/${id}?autoplay=1&mute=1&loop=1&playlist=${id}`;
        }
        return url;
    };

    // --------------------------------------------------------------------------
    // Save Handlers
    // --------------------------------------------------------------------------
    const updateTargetSkill = (
        updater: (skill: Skill) => Skill, 
        successMsg: string, 
        manaCost: number = 0,
        flowerCost: number = 0
    ) => {
        if (!currentSelectedSkill) return;
        if (!isAllowedToCustomize) {
            alert('커스텀 승격된 동료 및 몬스터만 스킬 이펙트 커스터마이징이 가능합니다.');
            return;
        }

        const currentMana = character.base?.resources?.manaCrystal || 0;
        const flowerInfo = getShinryokuFlowerCount(character);

        if (manaCost > 0 && currentMana < manaCost) {
            alert(`마정석이 부족합니다. (필요: ${manaCost}개, 보유: ${currentMana}개)`);
            return;
        }

        if (flowerCost > 0 && flowerInfo.total < flowerCost) {
            alert(`신력꽃이 부족합니다. (필요: ${flowerCost}송이, 기지 및 소지품 총합: ${flowerInfo.total}송이)`);
            return;
        }

        const newChar = { ...character };
        if (!newChar.base) return;

        if (manaCost > 0) {
            newChar.base.resources.manaCrystal -= manaCost;
        }

        if (flowerCost > 0) {
            let flowerDeducted = 0;
            const currentBaseFlower = newChar.base.resources?.shinryoku_flower || 0;
            if (currentBaseFlower > 0) {
                const useBase = Math.min(currentBaseFlower, flowerCost);
                newChar.base.resources.shinryoku_flower -= useBase;
                flowerDeducted += useBase;
            }

            if (flowerDeducted < flowerCost) {
                const remainingNeed = flowerCost - flowerDeducted;
                let invDeducted = 0;
                const updatedInventory: Item[] = [];
                for (const item of newChar.inventory || []) {
                    const name = (item.name || '').replace(/\s+/g, '');
                    if ((name.includes('신력의꽃') || name.includes('신력꽃')) && invDeducted < remainingNeed) {
                        const itemQty = item.quantity || 1;
                        const need = remainingNeed - invDeducted;
                        if (itemQty <= need) {
                            invDeducted += itemQty;
                        } else {
                            const remain = itemQty - need;
                            invDeducted += need;
                            updatedInventory.push({ ...item, quantity: remain });
                        }
                    } else {
                        updatedInventory.push(item);
                    }
                }
                newChar.inventory = updatedInventory;
            }
        }

        const skillName = currentSelectedSkill.name;

        if (isPlayerTarget) {
            if ((currentSelectedSkill as any).isBond) {
                newChar.bondSkills = (newChar.bondSkills || []).map(s => s.name === skillName ? (updater(s) as any) : s);
            } else {
                newChar.skills = (newChar.skills || []).map(s => s.name === skillName ? updater(s) : s);
            }
        } else {
            const isMon = (activeTarget as any)._isMonster || (activeTarget as any).isCustomMonster;
            if (isMon && (activeTarget as any)._isCapturedMonster) {
                newChar.base!.capturedMonsters = (newChar.base?.capturedMonsters || []).map((m: any) => {
                    if (m.id === targetId) {
                        return {
                            ...m,
                            skills: (m.skills || []).map((s: Skill) => s.name === skillName ? updater(s) : s)
                        };
                    }
                    return m;
                });
            } else {
                newChar.companions = (newChar.companions || []).map(c => {
                    if (c.id === targetId) {
                        return {
                            ...c,
                            skills: (c.skills || []).map((s: Skill) => s.name === skillName ? updater(s) : s)
                        };
                    }
                    return c;
                });
                newChar.inactiveCompanions = (newChar.inactiveCompanions || []).map(c => {
                    if (c.id === targetId) {
                        return {
                            ...c,
                            skills: (c.skills || []).map((s: Skill) => s.name === skillName ? updater(s) : s)
                        };
                    }
                    return c;
                });
            }
        }

        onUpdateCharacter(newChar, `[스킬 이펙트 커스텀 개조실] ${activeTarget.name}의 [${skillName}] ${successMsg}`);
        showToast(`[${skillName}] ${successMsg} 완료되었습니다.`, 'success');
    };

    const handleSaveVfx = () => {
        updateTargetSkill(skill => ({
            ...skill,
            vfxTheme: editVfxTheme !== 'default' ? editVfxTheme : undefined,
            vfxColor: editVfxColor.trim() ? editVfxColor : undefined,
            vfxShape: editVfxShape !== 'DEFAULT' ? editVfxShape : undefined,
            vfxScale: editVfxScale !== 1.0 ? editVfxScale : undefined
        } as any), '이펙트 설정 저장', CUSTOM_VFX_MANA_CRYSTAL, CUSTOM_VFX_FLOWER);
    };

    const handleSaveIcon = () => {
        const trimmedUrl = editImageUrl.trim();
        const isFreeBuiltInEmblem = trimmedUrl.startsWith('data:image/svg+xml');
        const manaCost = trimmedUrl && !isFreeBuiltInEmblem ? 5 : 0;
        updateTargetSkill(skill => ({
            ...skill,
            icon: editIcon,
            imageUrl: trimmedUrl ? trimmedUrl : undefined
        }), '아이콘 설정 저장', manaCost);
    };

    const handleSaveCutin = () => {
        if (!isCutinEligible) {
            alert('스킬 컷신은 라스트 클래스(3차) 또는 파이널 클래스(4차 / 인연 스킬) 등급 이상의 스킬만 등록 가능합니다.');
            return;
        }
        const manaCost = editIllustrationUrl.trim() ? 5 : 0;
        updateTargetSkill(skill => ({
            ...skill,
            illustrationUrl: editIllustrationUrl.trim() ? editIllustrationUrl.trim() : undefined
        }), '컷신 일러스트 저장', manaCost);
    };

    const handleSaveVideo = () => {
        const manaCost = editVideoUrl.trim() ? 5 : 0;
        updateTargetSkill(skill => ({
            ...skill,
            videoUrl: editVideoUrl.trim() ? editVideoUrl.trim() : undefined
        } as any), '이펙트 영상 등록', manaCost);
    };

    const handleSaveFrameAnimation = (anim: SkillFrameAnimation) => {
        updateTargetSkill(skill => ({
            ...skill,
            frameAnimation: anim
        }), '프레임 애니메이션 저장');
    };

    // 전체 스킬 이펙트 통합 프로젝트 파일 저장 (JSON 다운로드)
    const handleExportAllProject = () => {
        const res = exportAllSkillEffectsToFile(character);
        if (!res.success) {
            showToast('등록된 커스텀 스킬 이펙트나 프레임 애니메이션 데이터가 없습니다.', 'warning');
            return;
        }
        showToast(`총 ${res.count}개 스킬의 이펙트를 전체 프로젝트 파일로 저장했습니다!`, 'success');
    };

    // 전체 스킬 이펙트 통합 프로젝트 파일 불러오기 (JSON 로드)
    const handleImportAllProject = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const content = event.target?.result as string;
            if (!content) return;

            const res = importSkillEffectsFromText(character, content, selectedSkillName);
            if (res.success) {
                onUpdateCharacter(res.updatedCharacter, `[스킬 이펙트] 전체 프로젝트 복원 (${res.appliedCount}개 스킬)`);
                showToast(res.message, 'success');
            } else {
                showToast(res.message, 'warning');
            }
            if (allProjectFileInputRef.current) allProjectFileInputRef.current.value = '';
        };
        reader.readAsText(file);
    };

    // 현재 편집 중인 프레임 애니메이션을 캐릭터 스냅샷에 병합하는 헬퍼
    const buildCharacterSnapshotWithOverride = (overrideCurrentAnim?: SkillFrameAnimation): Character => {
        const snap: Character = JSON.parse(JSON.stringify(character));
        if (!overrideCurrentAnim || !currentSelectedSkill) return snap;

        const skillName = currentSelectedSkill.name;
        const applyOverride = (s: Skill): Skill =>
            s.name === skillName ? { ...s, frameAnimation: JSON.parse(JSON.stringify(overrideCurrentAnim)) } : s;

        if (isPlayerTarget) {
            if ((currentSelectedSkill as any).isBond) {
                snap.bondSkills = (snap.bondSkills || []).map(applyOverride as any);
            } else {
                snap.skills = (snap.skills || []).map(applyOverride);
            }
        } else {
            const isMon = (activeTarget as any)._isMonster || (activeTarget as any).isCustomMonster;
            if (isMon && (activeTarget as any)._isCapturedMonster && snap.base?.capturedMonsters) {
                snap.base.capturedMonsters = snap.base.capturedMonsters.map((m: any) =>
                    m.id === targetId ? { ...m, skills: (m.skills || []).map(applyOverride) } : m
                );
            } else {
                snap.companions = (snap.companions || []).map(c =>
                    c.id === targetId ? { ...c, skills: (c.skills || []).map(applyOverride) } : c
                );
                snap.inactiveCompanions = (snap.inactiveCompanions || []).map(c =>
                    c.id === targetId ? { ...c, skills: (c.skills || []).map(applyOverride) } : c
                );
            }
        }
        return snap;
    };

    // [필수 선행 단계] 세이브파일 용량 절감 전 구글 로그인 확인 및 구글 드라이브에 기존 원본 데이터 백업
    const ensureGoogleDriveBackupBeforeReduce = async (
        overrideCurrentAnim?: SkillFrameAnimation,
        targetSingleSkillName?: string
    ): Promise<boolean> => {
        let token = driveToken || getCachedAccessToken();

        // 1. 구글 로그인 우선 확인 (미연동 시 즉시 구글 로그인 진행)
        if (!token) {
            setShowDrivePanel(true);
            showToast('세이브파일 용량 절감 전 안전한 백업을 위해 먼저 구글 드라이브 로그인을 진행합니다...', 'info');
            try {
                const authRes = await signInWithGoogleDrive();
                if (authRes && authRes.accessToken) {
                    token = authRes.accessToken;
                    setDriveToken(token);
                } else {
                    alert('구글 드라이브 로그인이 완료되어야 기존 이펙트 데이터를 백업한 후 용량을 절감할 수 있습니다.');
                    return false;
                }
            } catch (err: any) {
                console.error('구글 로그인 실패:', err);
                alert(err?.message || '구글 계정 로그인 중 오류가 발생하여 용량 절감을 진행할 수 없습니다.');
                return false;
            }
        }

        // 2. 구글 드라이브에 기존 데이터 백업
        setIsProcessingDrive(true);
        try {
            const snapshotChar = buildCharacterSnapshotWithOverride(overrideCurrentAnim);
            const effects = collectAllSkillEffects(snapshotChar);

            if (effects.length > 0) {
                showToast('용량 절감 전 구글 드라이브에 기존 이펙트 원본 데이터를 백업 중입니다...', 'info');
                const projectData: AllSkillEffectsProjectFile = {
                    version: '1.0',
                    type: 'AllSkillEffectsProject',
                    title: '전체 스킬 이펙트 통합 프로젝트 (용량 절감 전 백업)',
                    createdAt: new Date().toISOString(),
                    characterName: snapshotChar.name || '주인공',
                    totalCount: effects.length,
                    effects: effects
                };
                const rawText = JSON.stringify(projectData, null, 2);
                await uploadVfxFileToDrive('Shinryoku_Cloud_All_Vfx_Project.txt', rawText, token);

                if (targetSingleSkillName) {
                    const singleEff = effects.find(e => e.skillName === targetSingleSkillName);
                    if (singleEff) {
                        const singleProject: AllSkillEffectsProjectFile = {
                            version: '1.0',
                            type: 'AllSkillEffectsProject',
                            title: `단일 스킬 이펙트 - ${targetSingleSkillName}`,
                            createdAt: new Date().toISOString(),
                            characterName: snapshotChar.name || '주인공',
                            totalCount: 1,
                            effects: [singleEff]
                        };
                        await uploadVfxFileToDrive(
                            `Shinryoku_Cloud_Skill_Vfx_${targetSingleSkillName}.txt`,
                            JSON.stringify(singleProject, null, 2),
                            token
                        );
                    }
                }

                await refreshDriveMeta(token);
            }
            return true;
        } catch (err: any) {
            console.error('구글 드라이브 사전 백업 실패:', err);
            alert(`구글 드라이브 백업 중 오류가 발생하여 데이터 보호를 위해 용량 절감을 중단했습니다: ${err.message}`);
            return false;
        } finally {
            setIsProcessingDrive(false);
        }
    };

    // 모든 업로드한 스킬 이펙트 일괄 세이브파일 용량 절감 (구글 로그인 우선 -> 구글 드라이브 백업 -> 전체 이펙트 일괄 경량화)
    const handleBatchReduceAllSaveFileSize = async (
        overrideCurrentAnim?: SkillFrameAnimation
    ): Promise<SkillFrameAnimation | null> => {
        if (isBatchReducing || isProcessingDrive) return null;

        const workingChar = buildCharacterSnapshotWithOverride(overrideCurrentAnim);
        const allEffects = collectAllSkillEffects(workingChar);
        if (allEffects.length === 0) {
            showToast('등록된 커스텀 스킬 이펙트나 프레임 애니메이션 데이터가 없습니다.', 'warning');
            return null;
        }

        setIsBatchReducing(true);
        try {
            // 1. 구글 로그인 확인 및 구글 드라이브에 기존 전체 이펙트 데이터 우선 백업
            const backupOk = await ensureGoogleDriveBackupBeforeReduce(overrideCurrentAnim);
            if (!backupOk) {
                return null;
            }

            showToast('구글 드라이브 원본 백업 완료! 모든 업로드된 이펙트들의 세이브파일 용량을 일괄 절감 중입니다...', 'info');

            const isReducibleBase64 = (url?: string) =>
                Boolean(url && url.startsWith('data:') && !url.startsWith('data:image/svg+xml'));

            const urlCache = new Map<string, string>();
            let convertedImageCount = 0;
            let affectedSkillCount = 0;

            const reduceSingleImageUrl = async (rawUrl: string): Promise<string> => {
                if (!isReducibleBase64(rawUrl)) return rawUrl;
                if (urlCache.has(rawUrl)) {
                    const cached = urlCache.get(rawUrl)!;
                    if (cached !== rawUrl) convertedImageCount++;
                    return cached;
                }
                let resultUrl = rawUrl;
                try {
                    const webUrl = await uploadImageToWeb(rawUrl);
                    if (webUrl && webUrl !== rawUrl) {
                        resultUrl = webUrl;
                    } else {
                        const opt = await optimizeFrameImage(rawUrl, 280, 0.8);
                        resultUrl = opt.optimizedUrl;
                    }
                } catch {
                    try {
                        const opt = await optimizeFrameImage(rawUrl, 280, 0.8);
                        resultUrl = opt.optimizedUrl;
                    } catch {
                        resultUrl = rawUrl;
                    }
                }
                urlCache.set(rawUrl, resultUrl);
                if (resultUrl !== rawUrl) convertedImageCount++;
                return resultUrl;
            };

            const reduceSkillMediaAndFrames = async (skill: Skill): Promise<Skill> => {
                if (!skill) return skill;
                let changed = false;
                const nextSkill: Skill = { ...skill };

                if (isReducibleBase64(nextSkill.imageUrl)) {
                    const nextUrl = await reduceSingleImageUrl(nextSkill.imageUrl!);
                    if (nextUrl !== nextSkill.imageUrl) {
                        nextSkill.imageUrl = nextUrl;
                        changed = true;
                    }
                }

                if (isReducibleBase64(nextSkill.illustrationUrl)) {
                    const nextUrl = await reduceSingleImageUrl(nextSkill.illustrationUrl!);
                    if (nextUrl !== nextSkill.illustrationUrl) {
                        nextSkill.illustrationUrl = nextUrl;
                        changed = true;
                    }
                }

                if (nextSkill.frameAnimation && Array.isArray(nextSkill.frameAnimation.frames) && nextSkill.frameAnimation.frames.length > 0) {
                    let frameChanged = false;
                    const nextFrames = [];
                    for (const frame of nextSkill.frameAnimation.frames) {
                        if (isReducibleBase64(frame.imageUrl)) {
                            const nextFrameUrl = await reduceSingleImageUrl(frame.imageUrl);
                            if (nextFrameUrl !== frame.imageUrl) {
                                frameChanged = true;
                            }
                            nextFrames.push({ ...frame, imageUrl: nextFrameUrl });
                        } else {
                            nextFrames.push(frame);
                        }
                    }
                    if (frameChanged) {
                        nextSkill.frameAnimation = {
                            ...nextSkill.frameAnimation,
                            frames: nextFrames
                        };
                        changed = true;
                    }
                }

                if (changed) affectedSkillCount++;
                return nextSkill;
            };

            const reduceSkillArray = async (skills?: Skill[]): Promise<Skill[]> => {
                if (!Array.isArray(skills) || skills.length === 0) return skills || [];
                const out: Skill[] = [];
                for (const s of skills) {
                    out.push(await reduceSkillMediaAndFrames(s));
                }
                return out;
            };

            // 1) 플레이어 스킬 및 인연 스킬
            workingChar.skills = await reduceSkillArray(workingChar.skills);
            if (Array.isArray(workingChar.bondSkills)) {
                workingChar.bondSkills = (await reduceSkillArray(workingChar.bondSkills as any)) as any;
            }

            // 2) 활성 동료 스킬
            if (Array.isArray(workingChar.companions)) {
                const nextCompanions = [];
                for (const comp of workingChar.companions) {
                    nextCompanions.push({
                        ...comp,
                        skills: await reduceSkillArray(comp.skills)
                    });
                }
                workingChar.companions = nextCompanions;
            }

            // 3) 비활성(대기) 동료 스킬
            if (Array.isArray(workingChar.inactiveCompanions)) {
                const nextInactive = [];
                for (const comp of workingChar.inactiveCompanions) {
                    nextInactive.push({
                        ...comp,
                        skills: await reduceSkillArray(comp.skills)
                    });
                }
                workingChar.inactiveCompanions = nextInactive;
            }

            // 4) 포획 몬스터 스킬
            if (workingChar.base?.capturedMonsters && Array.isArray(workingChar.base.capturedMonsters)) {
                const nextMonsters = [];
                for (const mon of workingChar.base.capturedMonsters) {
                    nextMonsters.push({
                        ...mon,
                        skills: await reduceSkillArray(mon.skills)
                    });
                }
                workingChar.base.capturedMonsters = nextMonsters;
            }

            // 5) 전대 가주 객체 스킬
            if ((workingChar as any).formerPlayerCompanion && Array.isArray((workingChar as any).formerPlayerCompanion.skills)) {
                (workingChar as any).formerPlayerCompanion = {
                    ...(workingChar as any).formerPlayerCompanion,
                    skills: await reduceSkillArray((workingChar as any).formerPlayerCompanion.skills)
                };
            }

            onUpdateCharacter(
                workingChar,
                `[스킬 이펙트 개조실] 구글 드라이브 백업 및 전체 이펙트 일괄 용량 절감 완료 (${affectedSkillCount}개 스킬, 이미지 ${convertedImageCount}개 경량화)`
            );

            // 현재 선택된 스킬의 최신 상태 찾기
            let updatedSelectedSkill: Skill | undefined;
            if (currentSelectedSkill) {
                const sName = currentSelectedSkill.name;
                if (isPlayerTarget) {
                    updatedSelectedSkill = (currentSelectedSkill as any).isBond
                        ? (workingChar.bondSkills || []).find(s => s.name === sName)
                        : (workingChar.skills || []).find(s => s.name === sName);
                } else {
                    const targetEntity =
                        workingChar.companions?.find(c => c.id === targetId) ||
                        workingChar.inactiveCompanions?.find(c => c.id === targetId) ||
                        workingChar.base?.capturedMonsters?.find((m: any) => m.id === targetId);
                    updatedSelectedSkill = targetEntity?.skills?.find((s: Skill) => s.name === sName);
                }
            }

            if (updatedSelectedSkill) {
                if (updatedSelectedSkill.imageUrl) setEditImageUrl(updatedSelectedSkill.imageUrl);
                if (updatedSelectedSkill.illustrationUrl) setEditIllustrationUrl(updatedSelectedSkill.illustrationUrl);
            }

            if (convertedImageCount > 0) {
                showToast(
                    `구글 드라이브 백업 완료! 총 ${affectedSkillCount}개 스킬(이미지 ${convertedImageCount}개) 일괄 용량 절감이 완료되었습니다.`,
                    'success'
                );
            } else {
                showToast(
                    '구글 드라이브에 기존 데이터 백업 완료! 모든 스킬 이펙트가 이미 최적화된 경량 상태입니다.',
                    'success'
                );
            }

            return updatedSelectedSkill?.frameAnimation || null;
        } catch (err: any) {
            console.error('일괄 세이브파일 용량 절감 오류:', err);
            showToast('일괄 용량 절감 처리 중 일부 오류가 발생했습니다.', 'warning');
            return null;
        } finally {
            setIsBatchReducing(false);
        }
    };

    if (!isOpen) return null;

    // Parsed VFX for Live Preview
    const parsedVfx = parseVfxCustomization(
        editVfxTheme, 
        editVfxColor, 
        editVfxShape, 
        activeTarget.shinryokuType || '화염계'
    );
    const activePreviewPreset = CUSTOM_VFX_PRESETS[editVfxTheme] || {
        name: '기본 신력',
        primary: parsedVfx.primaryColor,
        secondary: parsedVfx.secondaryColor,
        runes: ['✦', '✧', '◈'],
        bgGlow: 'rgba(6,182,212,0.2)'
    };
    const previewPrimaryColor = parsedVfx.primaryColor;
    const currentMana = character.base?.resources?.manaCrystal || 0;
    const flowerInfo = getShinryokuFlowerCount(character);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
            <div className="bg-slate-900 border border-cyan-500/40 rounded-2xl w-full max-w-6xl h-[92vh] max-h-[920px] flex flex-col shadow-2xl overflow-hidden text-slate-100">
                
                {/* Modal Header */}
                <div className="bg-slate-950/95 px-2.5 sm:px-6 py-2 sm:py-3 border-b border-cyan-500/30 flex items-center justify-between gap-1.5 sm:gap-3 shrink-0">
                    <div className="flex items-center gap-1.5 sm:gap-3 min-w-0 flex-1">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center shadow-[0_0_15px_rgba(6,182,212,0.3)] shrink-0">
                            <Sparkles className="text-cyan-400" size={18} />
                        </div>
                        <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 sm:gap-2">
                                <h2 className="text-xs sm:text-base md:text-lg font-black text-cyan-300 tracking-wide truncate">
                                    스킬 이펙트 커스텀 개조실
                                </h2>
                                <span className="px-1.5 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-extrabold bg-cyan-950/80 text-cyan-400 border border-cyan-500/40 shrink-0">
                                    Lv.{facilityLevel}
                                </span>
                            </div>
                            <p className="text-xs text-slate-400 mt-0.5 hidden md:block truncate">
                                플레이어 및 커스텀 동료의 스킬 이펙트 테마, 컷신, 프레임 애니메이션, 전투 영상을 개조합니다.
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                        {/* 숨겨진 전체 프로젝트 파일 인풋 */}
                        <input
                            type="file"
                            ref={allProjectFileInputRef}
                            accept=".json,application/json"
                            className="hidden"
                            onChange={handleImportAllProject}
                        />

                        {/* 전체 프로젝트 불러오기 버튼 (모바일: 아이콘 콤팩트 버튼) */}
                        <button
                            type="button"
                            onClick={() => allProjectFileInputRef.current?.click()}
                            className="p-1.5 sm:px-3 sm:py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-cyan-500/50 flex items-center gap-1.5 text-xs font-bold transition-all shadow-sm active:scale-95 shrink-0"
                            title="전체 스킬 이펙트 프로젝트 파일(.json) 불러오기"
                        >
                            <FolderUp size={15} className="text-cyan-400 shrink-0" />
                            <span className="hidden sm:inline">불러오기</span>
                        </button>

                        {/* 전체 프로젝트 저장 버튼 (모바일: 아이콘 콤팩트 버튼) */}
                        <button
                            type="button"
                            onClick={handleExportAllProject}
                            className="p-1.5 sm:px-3 sm:py-1.5 rounded-xl bg-cyan-950/90 hover:bg-cyan-900 text-cyan-300 border border-cyan-500/50 hover:border-cyan-400 flex items-center gap-1.5 text-xs font-bold transition-all shadow-sm active:scale-95 shrink-0"
                            title="등록된 모든 스킬 이펙트를 하나의 프로젝트 파일로 일괄 저장"
                        >
                            <FolderDown size={15} className="text-cyan-400 shrink-0" />
                            <span className="hidden sm:inline">전체 저장</span>
                        </button>

                        {/* 일괄 세이브파일 용량 절감 버튼 (구글 로그인 우선 -> 구글 드라이브 백업 -> 전체 이펙트 일괄 경량화) */}
                        <button
                            type="button"
                            onClick={() => handleBatchReduceAllSaveFileSize()}
                            disabled={isBatchReducing || isProcessingDrive}
                            className={`p-1.5 sm:px-3 sm:py-1.5 rounded-xl border flex items-center gap-1.5 text-xs font-bold transition-all shadow-sm active:scale-95 shrink-0 ${
                                isBatchReducing
                                    ? 'bg-teal-950/50 text-teal-400 border-teal-800 cursor-not-allowed'
                                    : 'bg-gradient-to-r from-teal-900/90 to-emerald-900/90 hover:from-teal-800 hover:to-emerald-800 text-teal-100 border-teal-400/60'
                            }`}
                            title="구글 로그인 확인 및 구글 드라이브에 전체 기존 이펙트 데이터를 먼저 백업한 뒤, 업로드된 모든 이펙트의 세이브파일 용량을 일괄 절감합니다"
                        >
                            {isBatchReducing ? (
                                <RefreshCw size={15} className="animate-spin text-teal-300 shrink-0" />
                            ) : (
                                <CloudUpload size={15} className="text-teal-300 shrink-0" />
                            )}
                            <span className="hidden sm:inline">{isBatchReducing ? '일괄 백업·절감 중...' : '일괄 용량 절감'}</span>
                        </button>

                        {/* 닫기 버튼 - 모바일에서도 최우선으로 화면 밖으로 밀리지 않고 선명하게 고정 */}
                        <button
                            type="button"
                            onClick={onClose}
                            className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-xl bg-slate-800/90 hover:bg-rose-950/80 border border-slate-700 hover:border-rose-500/60 text-slate-300 hover:text-rose-300 transition-all active:scale-90 shrink-0 ml-0.5 shadow-md"
                            title="닫기"
                            aria-label="닫기"
                        >
                            <X size={18} className="stroke-[2.5]" />
                        </button>
                    </div>
                </div>

                {/* 구글 드라이브 미니 토글 바 */}
                <div className="bg-slate-950 px-3 sm:px-6 py-2 border-b border-slate-900 flex items-center justify-between gap-2 shrink-0">
                    <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${driveToken ? 'bg-indigo-400 animate-pulse' : 'bg-slate-600'}`} />
                        <span className="text-xs font-black text-slate-300">구글 드라이브 연동</span>
                        {driveToken ? (
                            <span className="text-[9px] text-indigo-400 bg-indigo-950/40 border border-indigo-900/40 px-1.5 py-0.5 rounded-full font-bold">연동 활성화</span>
                        ) : (
                            <span className="text-[9px] text-slate-400 bg-slate-900 px-1.5 py-0.5 rounded-full font-bold">오프라인</span>
                        )}
                    </div>
                    <button
                        type="button"
                        onClick={() => setShowDrivePanel(!showDrivePanel)}
                        className="px-2.5 py-1 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-800 text-[10px] font-black text-slate-300 hover:text-white transition-all active:scale-95 cursor-pointer"
                    >
                        {showDrivePanel ? '설정 숨기기' : '연동 및 동기화 열기'}
                    </button>
                </div>

                {/* 구글 드라이브 연동 및 전체 이펙트 관리 패널 (접이식) */}
                {showDrivePanel && (
                    <div className="bg-slate-950 px-3 sm:px-6 py-2.5 border-b border-slate-850 flex flex-col md:flex-row items-center gap-3 shrink-0">
                        <div className="flex-1 w-full">
                            <GoogleDriveAuthPanel onAuthChange={(token) => setDriveToken(token)} />
                        </div>
                        {driveToken && (
                            <div className="w-full md:w-auto flex flex-col gap-2 bg-slate-900/80 p-2 sm:p-2.5 rounded-xl border border-cyan-500/30 shrink-0">
                                <div className="flex flex-wrap items-center justify-between gap-1.5">
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-[10px] font-black text-cyan-400 whitespace-nowrap">전체 이펙트 구글 드라이브</span>
                                        {driveAllMetaTime && (
                                            <span className="text-[9px] text-slate-400 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">
                                                최근 저장: {driveAllMetaTime}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <button
                                            type="button"
                                            onClick={handleUploadAllToDrive}
                                            disabled={isProcessingDrive}
                                            className="px-2.5 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-[10px] font-bold transition-all flex items-center gap-1 shrink-0 cursor-pointer shadow-sm disabled:opacity-50"
                                            title="기존 파일을 삭제하고 현재 전체 이펙트를 새로 저장합니다"
                                        >
                                            {isProcessingDrive ? <Loader2 size={11} className="animate-spin"/> : <FolderDown size={11}/>}
                                            <span>구글 드라이브에 등록</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleDownloadAllFromDrive(true)}
                                            disabled={isProcessingDrive}
                                            className="px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold transition-all flex items-center gap-1 shrink-0 cursor-pointer shadow-sm disabled:opacity-50"
                                            title="세이브파일처럼 내 구글 드라이브에 보관된 전체 이펙트를 즉시 불러옵니다"
                                        >
                                            {isProcessingDrive ? <Loader2 size={11} className="animate-spin"/> : <FolderUp size={11}/>}
                                            <span>내 드라이브에서 불러오기</span>
                                        </button>
                                    </div>
                                </div>
                                
                                {driveAllShareLink && (
                                    <div className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1.5 rounded-lg border border-cyan-500/40 min-w-0">
                                        <span className="text-[9px] text-cyan-300 font-mono truncate select-all flex-1">{driveAllShareLink}</span>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                navigator.clipboard.writeText(driveAllShareLink);
                                                setDriveAllCopyFeedback(true);
                                                setTimeout(() => setDriveAllCopyFeedback(false), 2000);
                                            }}
                                            className="px-2 py-0.5 bg-cyan-900/60 hover:bg-cyan-800 text-cyan-300 text-[9px] rounded font-bold shrink-0 cursor-pointer"
                                        >
                                            {driveAllCopyFeedback ? '복사 완료!' : '공유 링크 복사'}
                                        </button>
                                    </div>
                                )}

                                <div className="flex items-center gap-1.5">
                                    <input
                                        type="text"
                                        value={driveImportInput}
                                        onChange={(e) => setDriveImportInput(e.target.value)}
                                        placeholder="상대방의 전체 프로젝트 공유 링크 붙여넣기..."
                                        className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-[10px] text-cyan-300 outline-none focus:border-cyan-500/50 flex-1 min-w-0"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => handleDownloadAllFromDrive(false)}
                                        disabled={isProcessingDrive}
                                        className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-[10px] font-bold rounded-lg shrink-0 cursor-pointer disabled:opacity-50"
                                    >
                                        링크로 불러오기
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Target Selector Bar - Filter, Sort, Search & Target Cards */}
                <div className="bg-slate-950 px-3 sm:px-6 py-2.5 border-b border-slate-800 space-y-2 shrink-0">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        {/* Left: Filter Buttons */}
                        <div className="flex items-center gap-1 overflow-x-auto custom-scrollbar">
                            <span className="text-xs font-bold text-slate-400 mr-1 flex items-center gap-1 shrink-0">
                                <UserCheck size={13} className="text-cyan-400" /> 대상:
                            </span>
                            {[
                                { id: 'all', label: '전체' },
                                { id: 'custom', label: '커스텀만' },
                                { id: 'companion', label: '동료' },
                                { id: 'monster', label: '마수' }
                            ].map(f => (
                                <button
                                    key={f.id}
                                    onClick={() => setTargetFilter(f.id as any)}
                                    className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-all whitespace-nowrap ${
                                        targetFilter === f.id
                                            ? 'bg-cyan-600 text-white'
                                            : 'bg-slate-900 text-slate-400 hover:text-slate-200'
                                    }`}
                                >
                                    {f.label}
                                </button>
                            ))}
                        </div>

                        {/* Right: Sort & Search */}
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                            <div className="relative flex-1 sm:w-44">
                                <Search className="absolute left-2.5 top-2 text-slate-500" size={13} />
                                <input
                                    type="text"
                                    value={targetSearch}
                                    onChange={(e) => setTargetSearch(e.target.value)}
                                    placeholder="이름 검색..."
                                    className="w-full pl-8 pr-3 py-1 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                                />
                            </div>

                            <button
                                onClick={() => {
                                    setTargetSort(prev => {
                                        if (prev === 'custom') return 'level';
                                        if (prev === 'level') return 'name';
                                        return 'custom';
                                    });
                                }}
                                className="px-2.5 py-1 bg-slate-900 border border-slate-800 rounded-lg text-[11px] font-bold text-slate-300 hover:text-cyan-300 flex items-center gap-1 whitespace-nowrap shrink-0"
                            >
                                <ArrowUpDown size={12} className="text-cyan-400" />
                                <span>
                                    {targetSort === 'custom' ? '커스텀 우선' : targetSort === 'level' ? '레벨순' : '이름순'}
                                </span>
                            </button>
                        </div>
                    </div>

                    {/* Target Cards Scroll Row */}
                    <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar py-0.5 max-w-full">
                        {filteredTargets.length === 0 ? (
                            <span className="text-xs text-slate-500 py-1">검색 조건에 맞는 대상이 없습니다.</span>
                        ) : (
                            filteredTargets.map(target => {
                                const isSelected = targetId === target.id;
                                return (
                                    <button
                                        key={target.id}
                                        onClick={() => setTargetId(target.id)}
                                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap shrink-0 ${
                                            isSelected 
                                                ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-900/40 ring-1 ring-cyan-400' 
                                                : 'bg-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                                        }`}
                                    >
                                        <img src={target.avatar} alt={target.name} className="w-5 h-5 rounded-full object-cover border border-slate-700 bg-slate-950" />
                                        <span>{target.name}</span>
                                        <span className="text-[10px] opacity-75 font-mono">Lv.{target.level}</span>
                                        {target.isCustom && (
                                            <span className="text-[9px] px-1 py-0.2 rounded bg-pink-950 text-pink-300 border border-pink-500/30">
                                                커스텀
                                            </span>
                                        )}
                                    </button>
                                );
                            })
                        )}
                    </div>

                    {/* Resource Status & Custom Eligibility Banner */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-900 text-[11px]">
                        <div className="flex items-center gap-3 text-slate-400">
                            <span>
                                개조 소모: <strong className="text-purple-300">마정석 5개</strong>
                            </span>
                            <span className="hidden sm:inline text-slate-600">|</span>
                            <span>
                                보유: 마정석 <strong className="text-purple-400 font-mono">{currentMana}개</strong>
                            </span>
                        </div>

                        {!isAllowedToCustomize && (
                            <div className="flex items-center gap-1.5 px-2 py-0.5 bg-amber-950/60 border border-amber-500/50 rounded text-amber-300 text-[11px] font-bold">
                                <AlertTriangle size={12} className="shrink-0" />
                                <span>일반 동료는 커스텀 개조 승격 후 이펙트 편집이 가능합니다.</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Tab Navigation with Facility Level Locks */}
                <div className="bg-slate-950/95 border-b border-slate-800 px-2 sm:px-4 py-2 flex items-center gap-1.5 overflow-x-auto custom-scrollbar shrink-0">
                    {/* Tab 1: Skill Effect Theme (Lv.1) */}
                    <button
                        onClick={() => setActiveTab('vfx')}
                        className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap min-h-[42px] ${
                            activeTab === 'vfx'
                                ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-900/30 ring-1 ring-cyan-400'
                                : 'bg-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                        }`}
                    >
                        <Sparkles size={15} className="text-cyan-400" />
                        <span>스킬 이펙트 변경</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-cyan-300 border border-cyan-500/30">Lv.1</span>
                    </button>

                    {/* Tab 1-2: Skill Icon (Lv.1) */}
                    <button
                        onClick={() => setActiveTab('icon')}
                        className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap min-h-[42px] ${
                            activeTab === 'icon'
                                ? 'bg-amber-600 text-white shadow-lg shadow-amber-900/30 ring-1 ring-amber-400'
                                : 'bg-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                        }`}
                    >
                        <ImageIcon size={15} className="text-amber-400" />
                        <span>스킬 아이콘</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-amber-300 border border-amber-500/30">Lv.1</span>
                    </button>

                    {/* Tab 2: Skill Cut-in (Lv.2) */}
                    <button
                        onClick={() => {
                            if (!isCutinUnlocked) {
                                alert('스킬 컷신 등록은 스킬 이펙트 개조실 시설 레벨 2 이상에서 이용할 수 있습니다.');
                                return;
                            }
                            setActiveTab('cutin');
                        }}
                        className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap min-h-[42px] ${
                            !isCutinUnlocked
                                ? 'bg-slate-950/60 text-slate-600 border border-slate-800/50 cursor-not-allowed opacity-75'
                                : activeTab === 'cutin'
                                    ? 'bg-rose-600 text-white shadow-lg shadow-rose-900/30 ring-1 ring-rose-400'
                                    : 'bg-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                        }`}
                    >
                        {isCutinUnlocked ? <Crown size={15} className="text-rose-400" /> : <Lock size={15} className="text-slate-500" />}
                        <span>스킬 컷신</span>
                        <span className={`text-[10px] px-1.5 py-0.2 rounded ${isCutinUnlocked ? 'bg-slate-800 text-rose-300 border border-rose-500/30' : 'bg-red-950/80 text-red-400 border border-red-800/40'}`}>
                            Lv.2 {isCutinUnlocked ? '해금' : '필요'}
                        </span>
                    </button>

                    {/* Tab 3: Frame Effect (Lv.3) */}
                    <button
                        onClick={() => {
                            if (!isFrameVfxUnlocked) {
                                alert('프레임 이펙트 제작은 스킬 이펙트 개조실 시설 레벨 3 이상에서 이용할 수 있습니다.');
                                return;
                            }
                            setActiveTab('frame_vfx');
                        }}
                        className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap min-h-[42px] ${
                            !isFrameVfxUnlocked
                                ? 'bg-slate-950/60 text-slate-600 border border-slate-800/50 cursor-not-allowed opacity-75'
                                : activeTab === 'frame_vfx'
                                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/30 ring-1 ring-indigo-400'
                                    : 'bg-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                        }`}
                    >
                        {isFrameVfxUnlocked ? <Film size={15} className="text-indigo-400" /> : <Lock size={15} className="text-slate-500" />}
                        <span>프레임 이펙트 제작</span>
                        <span className={`text-[10px] px-1.5 py-0.2 rounded ${isFrameVfxUnlocked ? 'bg-slate-800 text-indigo-300 border border-indigo-500/30' : 'bg-red-950/80 text-red-400 border border-red-800/40'}`}>
                            Lv.3 {isFrameVfxUnlocked ? '해금' : '필요'}
                        </span>
                    </button>

                    {/* Tab 4: Effect Video (Lv.5) */}
                    <button
                        onClick={() => {
                            if (!isVideoUnlocked) {
                                alert('이펙트 영상 탭은 스킬 이펙트 개조실 시설 레벨 5 이상에서 이용할 수 있습니다.');
                                return;
                            }
                            setActiveTab('video');
                        }}
                        className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap min-h-[42px] ${
                            !isVideoUnlocked
                                ? 'bg-slate-950/60 text-slate-600 border border-slate-800/50 cursor-not-allowed opacity-75'
                                : activeTab === 'video'
                                    ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/30 ring-1 ring-purple-400'
                                    : 'bg-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                        }`}
                    >
                        {isVideoUnlocked ? <Video size={15} className="text-purple-400" /> : <Lock size={15} className="text-slate-500" />}
                        <span>이펙트 영상</span>
                        <span className={`text-[10px] px-1.5 py-0.2 rounded ${isVideoUnlocked ? 'bg-slate-800 text-purple-300 border border-purple-500/30' : 'bg-red-950/80 text-red-400 border border-red-800/40'}`}>
                            Lv.5 {isVideoUnlocked ? '해금' : '필요'}
                        </span>
                    </button>
                </div>

                {/* Main Content Area */}
                <div className="p-3 sm:p-5 overflow-y-auto custom-scrollbar flex-1">
                    
                    {/* ================================================================ */}
                    {/* TAB 1: VFX THEME (스킬 이펙트 변경) - Lv.1 */}
                    {/* ================================================================ */}
                    {activeTab === 'vfx' && (
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-full">
                            {/* Left: Skill Selection Column */}
                            <div className="lg:col-span-4 flex flex-col space-y-1.5 max-h-[180px] lg:max-h-[580px] overflow-y-auto custom-scrollbar pr-1 bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                                <span className="text-xs font-bold text-slate-400">스킬 선택 ({targetSkills.length})</span>
                                {targetSkills.map((skill, idx) => {
                                    const isSelected = (currentSelectedSkill?.name === skill.name);
                                    return (
                                        <button
                                            key={idx}
                                            onClick={() => selectSkillForCustomization(skill)}
                                            className={`p-2.5 rounded-xl border text-left flex items-center gap-2.5 transition-all shrink-0 ${
                                                isSelected
                                                    ? 'bg-cyan-950/60 border-cyan-500 text-cyan-100 shadow-[0_0_12px_rgba(6,182,212,0.3)]'
                                                    : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                                            }`}
                                        >
                                            <div className="w-8 h-8 rounded-lg bg-slate-950 border border-slate-700 flex items-center justify-center shrink-0">
                                                {(() => {
                                                    const found = BASE_ICONS.find(b => b.name === skill.icon);
                                                    const IconC = found ? found.icon : Sword;
                                                    return <IconC size={16} className="text-cyan-400" />;
                                                })()}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <div className="text-xs font-bold truncate">{skill.name}</div>
                                                <div className="text-[10px] text-slate-500 font-mono truncate">
                                                    {(skill as any).vfxTheme ? `테마: ${(skill as any).vfxTheme}` : '기본 신력 이펙트'}
                                                </div>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Right: VFX Theme Selector & Live Preview Arena */}
                            <div className="lg:col-span-8 flex flex-col space-y-4 overflow-y-auto custom-scrollbar">
                                {/* Auto Caster Illustration Cut-in Global Setting */}
                                <div className="space-y-2 bg-gradient-to-r from-rose-950/50 via-slate-900/90 to-indigo-950/50 p-3.5 rounded-2xl border border-rose-500/40">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-1.5">
                                            <Crown size={14} className="text-rose-400" />
                                            <span className="text-xs font-bold text-rose-200">⚡ 시전자 일러스트 자동 대각선 컷인 설정 (라스트 이상 기본 적용)</span>
                                        </div>
                                        <span className="text-[10px] text-rose-300/80 font-mono">전용 컷신 미등록 시 시전자 일러스트 자동 활용</span>
                                    </div>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                                        {[
                                            { id: 'last_and_final' as const, label: '3차(라스트) 이상 자동', desc: '추천 · 3차/4차/인연' },
                                            { id: 'final_only' as const, label: '4차(파이널)만 자동', desc: '파이널/인연 스킬만' },
                                            { id: 'custom_only' as const, label: '전용 컷신만 표시', desc: '직접 등록한 컷신만' },
                                            { id: 'off' as const, label: '컷인 모두 끄기', desc: '전투 속도 최우선' },
                                        ].map(opt => (
                                            <button
                                                key={opt.id}
                                                type="button"
                                                onClick={() => handleChangeAutoCutinMode(opt.id)}
                                                className={`p-2 rounded-xl border text-left transition-all ${
                                                    autoCasterCutinMode === opt.id
                                                        ? 'bg-rose-950/80 border-rose-400 text-rose-100 shadow-[0_0_12px_rgba(244,63,94,0.3)]'
                                                        : 'bg-slate-950/70 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                                                }`}
                                            >
                                                <div className="text-[11px] font-bold truncate">{opt.label}</div>
                                                <div className="text-[9px] text-slate-400 truncate mt-0.5">{opt.desc}</div>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {currentSelectedSkill ? (
                                    <>
                                        {/* Skill Target Info Header */}
                                        <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 flex items-center justify-between">
                                            <div>
                                                <span className="text-[10px] text-cyan-400 font-bold">선택된 스킬</span>
                                                <h4 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                                                    {currentSelectedSkill.name}
                                                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-950 text-slate-400 border border-slate-800">
                                                        Lv.{currentSelectedSkill.level}
                                                    </span>
                                                </h4>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={handleSaveVfx}
                                                    disabled={!isAllowedToCustomize}
                                                    className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-lg active:scale-95 ${
                                                        isAllowedToCustomize 
                                                            ? 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white' 
                                                            : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                                                    }`}
                                                >
                                                    <CheckCircle2 size={14} />
                                                    <span>이펙트 적용</span>
                                                </button>
                                            </div>
                                        </div>

                                        {/* Live VFX Animation Preview Arena */}
                                        <div className="relative rounded-2xl bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 border border-cyan-500/40 p-4 sm:p-6 overflow-hidden flex flex-col items-center justify-between min-h-[240px] shadow-2xl">
                                            <div className="absolute top-2 left-3 text-[10px] sm:text-xs text-slate-400 font-mono flex items-center gap-1 z-10">
                                                <Eye size={13} className="text-cyan-400 animate-pulse" /> 
                                                <span>안티그래비티 60FPS 하이퍼 캔버스 시뮬레이션</span>
                                            </div>

                                            <div className="relative w-full h-44 flex items-center justify-center my-auto overflow-hidden">
                                                <div 
                                                    className="w-56 h-56 rounded-full blur-3xl absolute opacity-30 transition-all duration-700 pointer-events-none"
                                                    style={{ backgroundColor: previewPrimaryColor }}
                                                />
                                                 <div 
                                                    key={vfxLoopKey} 
                                                    className="relative z-20 flex items-center justify-center transition-transform duration-300"
                                                    style={{ transform: `scale(${editVfxScale})` }}
                                                 >
                                                    <RenderCustomVfxShape 
                                                        shape={editVfxShape || 'DEFAULT'} 
                                                        theme={parsedVfx} 
                                                        svgGradId="vfx-modal-preview-grad"
                                                        tier={currentSelectedSkill.tier}
                                                        loop={true}
                                                    />
                                                </div>
                                            </div>

                                            <div className="flex justify-center items-center gap-3 text-xs text-slate-400 font-serif opacity-70 z-10">
                                                {activePreviewPreset.runes.map((rune: string, rIdx: number) => (
                                                    <span key={rIdx} className="tracking-widest drop-shadow">{rune}</span>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Effect Scale Multiplier */}
                                        <div className="space-y-2 bg-slate-900/80 p-3.5 rounded-2xl border border-slate-800">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <Sliders size={14} className="text-cyan-400" />
                                                    <span className="text-xs font-bold text-slate-200">이펙트 크기 배율</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-bold text-cyan-300 font-mono">{editVfxScale.toFixed(1)}배</span>
                                                    {editVfxScale !== 1.0 && (
                                                        <button
                                                            onClick={() => { setEditVfxScale(1.0); setVfxLoopKey(prev => prev + 1); }}
                                                            className="text-[10px] text-slate-400 hover:text-slate-200 bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700"
                                                        >
                                                            기본값
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className="text-[10px] text-slate-500 font-mono">0.5배</span>
                                                <input
                                                    type="range"
                                                    min="0.5"
                                                    max="5.0"
                                                    step="0.1"
                                                    value={editVfxScale}
                                                    onChange={(e) => {
                                                        setEditVfxScale(Number(e.target.value));
                                                        setVfxLoopKey(prev => prev + 1);
                                                    }}
                                                    className="flex-1 accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                                                />
                                                <span className="text-[10px] text-cyan-400 font-mono font-bold">5.0배 (초거대)</span>
                                            </div>
                                            <div className="flex flex-wrap gap-1.5 pt-1">
                                                {[0.8, 1.0, 1.5, 2.0, 3.0, 5.0].map(s => (
                                                    <button
                                                        key={s}
                                                        onClick={() => { setEditVfxScale(s); setVfxLoopKey(prev => prev + 1); }}
                                                        className={`flex-1 min-w-[48px] py-1 rounded-lg text-[10px] font-bold border transition-all ${
                                                            editVfxScale === s
                                                                ? 'bg-cyan-950 border-cyan-400 text-cyan-300 shadow-sm'
                                                                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                                                        }`}
                                                    >
                                                        {s}배
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* 개별 스킬 이펙트 구글 드라이브 관리 카드 */}
                                        {driveToken && (
                                            <div className="space-y-3 bg-slate-900/80 p-3.5 rounded-2xl border border-indigo-500/30 animate-in slide-in-from-top-2">
                                                <div className="flex flex-wrap items-center justify-between gap-1.5">
                                                    <div className="flex items-center gap-1.5">
                                                        <Link size={14} className="text-indigo-400" />
                                                        <span className="text-xs font-black text-slate-200">[{selectedSkillName}] 스킬 이펙트 구글 드라이브</span>
                                                    </div>
                                                    {driveSkillMetaTime && (
                                                        <span className="text-[9px] text-indigo-300 bg-indigo-950/60 px-2 py-0.5 rounded-full border border-indigo-800/40 font-bold">
                                                            최근 저장: {driveSkillMetaTime}
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-[10px] text-slate-400 leading-normal">
                                                    현재 편집 중인 [{selectedSkillName}] 스킬의 커스텀 이펙트를 구글 드라이브에 저장(기존 파일 삭제 후 최신본 저장)하거나, 저장된 이펙트를 원터치로 불러올 수 있습니다.
                                                </p>
                                                
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={handleUploadSkillToDrive}
                                                        disabled={isProcessingDrive}
                                                        className="py-2.5 px-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-md"
                                                    >
                                                        {isProcessingDrive ? <Loader2 size={13} className="animate-spin" /> : <FolderDown size={13} />}
                                                        구글 드라이브에 등록
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDownloadSkillFromDrive(true)}
                                                        disabled={isProcessingDrive}
                                                        className="py-2.5 px-3 bg-purple-700 hover:bg-purple-600 disabled:opacity-50 text-white rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-md"
                                                    >
                                                        {isProcessingDrive ? <Loader2 size={13} className="animate-spin" /> : <FolderUp size={13} />}
                                                        내 드라이브에서 불러오기
                                                    </button>
                                                </div>
                                                
                                                {driveSkillShareLink && (
                                                    <div className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1.5 rounded-xl border border-indigo-500/40 min-w-0">
                                                        <span className="text-[9px] text-slate-400 font-mono truncate select-all flex-1">{driveSkillShareLink}</span>
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                navigator.clipboard.writeText(driveSkillShareLink);
                                                                setDriveSkillCopyFeedback(true);
                                                                setTimeout(() => setDriveSkillCopyFeedback(false), 2000);
                                                            }}
                                                            className="px-2 py-1 bg-indigo-950 hover:bg-indigo-900 text-indigo-400 text-[10px] rounded-lg font-bold shrink-0 cursor-pointer"
                                                        >
                                                            {driveSkillCopyFeedback ? '복사 완료!' : '공유 링크 복사'}
                                                        </button>
                                                    </div>
                                                )}

                                                <div className="flex items-center gap-1.5 w-full">
                                                    <input
                                                        type="text"
                                                        value={driveSkillImportInput}
                                                        onChange={(e) => setDriveSkillImportInput(e.target.value)}
                                                        placeholder="상대방의 개별 이펙트 공유 링크 입력..."
                                                        className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-2 text-xs text-indigo-300 outline-none focus:border-indigo-500/50 min-w-0"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDownloadSkillFromDrive(false)}
                                                        disabled={isProcessingDrive}
                                                        className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold rounded-xl shrink-0 cursor-pointer"
                                                    >
                                                        링크로 불러오기
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                        {/* Effect Shape Options Grid */}
                                        <div className="space-y-2.5 bg-slate-900/80 p-3.5 rounded-2xl border border-slate-800">
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                                <div className="flex items-center gap-2">
                                                    <Sparkles size={14} className="text-cyan-400" />
                                                    <span className="text-xs font-bold text-slate-200">이펙트 모양 설정</span>
                                                    <span className="text-[10px] text-slate-500 font-mono">({filteredVfxShapes.length}개)</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] text-amber-300 bg-amber-950/50 border border-amber-800/60 px-2 py-0.5 rounded font-bold">
                                                        스킬 등급({currentSelectedSkill.tier || '1차'}) 이하 이펙트만 선택 가능
                                                    </span>
                                                    <span className="text-[10px] text-cyan-400 font-mono truncate hidden md:inline">
                                                        선택: {VFX_SHAPE_OPTIONS.find(s => s.id === editVfxShape)?.name || '기본 타격'}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Tier Filters & Search Bar */}
                                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
                                                <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 shrink-0">
                                                    {[
                                                        { key: 'all', label: '전체' },
                                                        { key: '1', label: '1차+' },
                                                        { key: '2', label: '2차+' },
                                                        { key: '3', label: '3차+' },
                                                        { key: '4', label: '4차 전용' }
                                                    ].map(tab => (
                                                        <button
                                                            key={tab.key}
                                                            onClick={() => setShapeTierFilter(tab.key as any)}
                                                            className={`px-2 py-0.8 rounded-lg text-[10px] font-bold whitespace-nowrap transition-all border ${
                                                                shapeTierFilter === tab.key
                                                                    ? 'bg-cyan-950 border-cyan-400 text-cyan-300'
                                                                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                                                            }`}
                                                        >
                                                            {tab.label}
                                                        </button>
                                                    ))}
                                                </div>
                                                <div className="relative flex-1">
                                                    <input
                                                        type="text"
                                                        value={shapeSearch}
                                                        onChange={(e) => setShapeSearch(e.target.value)}
                                                        placeholder="이펙트 모양 검색..."
                                                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-[11px] text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500"
                                                    />
                                                    {shapeSearch && (
                                                        <button 
                                                            onClick={() => setShapeSearch('')}
                                                            className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-500 hover:text-slate-300"
                                                        >
                                                            ✕
                                                        </button>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-[220px] overflow-y-auto custom-scrollbar pr-1">
                                                {filteredVfxShapes.map(shape => {
                                                    const isSelected = editVfxShape === shape.id;
                                                    const currentSkillTierRank = getSkillTierRank(currentSelectedSkill?.tier);
                                                    const isTierLocked = shape.tierLevel > currentSkillTierRank;

                                                    return (
                                                        <button
                                                            key={shape.id}
                                                            onClick={() => {
                                                                if (isTierLocked) {
                                                                    alert(`[${currentSelectedSkill.name}]은(는) ${currentSelectedSkill.tier || '2차'} 등급 스킬이므로 ${shape.tierName} 등급의 이펙트를 선택할 수 없습니다.`);
                                                                    return;
                                                                }
                                                                setEditVfxShape(shape.id);
                                                                setVfxLoopKey(prev => prev + 1);
                                                            }}
                                                            className={`p-2.5 rounded-xl border text-left transition-all relative flex flex-col justify-between ${
                                                                isTierLocked
                                                                    ? 'bg-slate-950/80 border-slate-900 text-slate-600 cursor-not-allowed opacity-60'
                                                                    : isSelected
                                                                        ? 'bg-cyan-950/70 border-cyan-400 text-white shadow-[0_0_10px_rgba(6,182,212,0.3)] ring-1 ring-cyan-400/50'
                                                                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                                                            }`}
                                                        >
                                                            <div className="flex items-center justify-between mb-1 gap-1">
                                                                <span className={`text-xs font-bold truncate ${isTierLocked ? 'text-slate-500' : 'text-slate-100'}`}>{shape.name}</span>
                                                                {isTierLocked ? (
                                                                    <span className="text-[9px] px-1 py-0.2 rounded bg-red-950/80 text-red-400 border border-red-900/60 shrink-0 font-bold flex items-center gap-0.5">
                                                                        <Lock size={9} />
                                                                        <span>{shape.tierName}</span>
                                                                    </span>
                                                                ) : isSelected ? (
                                                                    <Check size={12} className="text-cyan-400 shrink-0" />
                                                                ) : shape.tierName ? (
                                                                    <span className="text-[9px] px-1 py-0.2 rounded bg-slate-900 text-slate-500 border border-slate-800 shrink-0 font-mono">
                                                                        {shape.tierName}
                                                                    </span>
                                                                ) : null}
                                                            </div>
                                                            <div className="text-[10px] text-slate-500 line-clamp-1 leading-snug">
                                                                {isTierLocked ? `클래스 등급 부족 (${shape.tierName} 이상)` : shape.desc}
                                                            </div>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        {/* Theme Preset Grid */}
                                        <div className="space-y-2 bg-slate-900/80 p-3.5 rounded-2xl border border-slate-800">
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                                                    <Palette size={14} className="text-cyan-400" /> 이펙트 테마 프리셋
                                                </span>
                                                <span className="text-[10px] text-slate-400">
                                                    신력 원소 및 특수 커스텀 오라
                                                </span>
                                            </div>

                                            {/* Elemental Themes */}
                                            <div className="space-y-1">
                                                <span className="text-[10px] font-bold text-slate-400">14대 신력 원소 계열</span>
                                                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-1.5 max-h-[140px] overflow-y-auto custom-scrollbar pr-1">
                                                    <button
                                                        onClick={() => { setEditVfxTheme('default'); setEditVfxColor(''); setVfxLoopKey(prev => prev + 1); }}
                                                        className={`p-2 rounded-xl border text-left transition-all ${
                                                            editVfxTheme === 'default'
                                                                ? 'bg-slate-800 border-cyan-400 text-white shadow-md ring-1 ring-cyan-400/40'
                                                                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                                                        }`}
                                                    >
                                                        <div className="text-xs font-bold">기본 신력</div>
                                                        <div className="text-[9px] text-slate-500 truncate">{(activeTarget as any).element || activeTarget.shinryokuType || '화염계'}</div>
                                                    </button>

                                                    {Object.entries(SHINRYOKU_THEMES).map(([elemKey, elemTheme]) => {
                                                        const isSelected = editVfxTheme === elemKey;
                                                        const ElemIcon = elemTheme.icon || Sparkles;
                                                        return (
                                                            <button
                                                                key={elemKey}
                                                                onClick={() => {
                                                                    setEditVfxTheme(elemKey);
                                                                    setEditVfxColor('');
                                                                    setVfxLoopKey(prev => prev + 1);
                                                                }}
                                                                className={`p-2 rounded-xl border text-left transition-all relative overflow-hidden flex flex-col justify-between ${
                                                                    isSelected
                                                                        ? 'bg-slate-800 border-cyan-400 text-white shadow-[0_0_10px_rgba(6,182,212,0.3)] ring-1 ring-cyan-400/40'
                                                                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                                                                }`}
                                                            >
                                                                <div className="flex items-center justify-between mb-1">
                                                                    <ElemIcon size={13} style={{ color: elemTheme.primary }} />
                                                                    <div 
                                                                        className="w-2 h-2 rounded-full" 
                                                                        style={{ backgroundColor: elemTheme.primary, boxShadow: `0 0 5px ${elemTheme.primary}` }}
                                                                    />
                                                                </div>
                                                                <div className="text-xs font-bold truncate">{elemTheme.name}</div>
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>

                                            {/* Special Custom Presets */}
                                            <div className="space-y-1 pt-2 border-t border-slate-800">
                                                <span className="text-[10px] font-bold text-slate-400">특수 커스텀 오라 테마</span>
                                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-[150px] overflow-y-auto custom-scrollbar pr-1">
                                                    {Object.entries(CUSTOM_VFX_PRESETS).map(([key, preset]) => {
                                                        const isSelected = editVfxTheme === key;
                                                        const IconC = preset.icon || Sparkles;
                                                        return (
                                                            <button
                                                                key={key}
                                                                onClick={() => {
                                                                    setEditVfxTheme(key);
                                                                    setEditVfxColor('');
                                                                    setVfxLoopKey(prev => prev + 1);
                                                                }}
                                                                className={`p-2 rounded-xl border text-left transition-all relative overflow-hidden flex flex-col justify-between ${
                                                                    isSelected
                                                                        ? 'bg-slate-900 border-cyan-400 text-white shadow-[0_0_12px_rgba(6,182,212,0.3)] scale-[1.01] ring-1 ring-cyan-400/40'
                                                                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                                                                }`}
                                                            >
                                                                <div className="flex items-center justify-between mb-1">
                                                                    <IconC size={13} style={{ color: preset.primary }} />
                                                                    <div 
                                                                        className="w-2.5 h-2.5 rounded-full" 
                                                                        style={{ backgroundColor: preset.primary, boxShadow: `0 0 6px ${preset.primary}` }}
                                                                    />
                                                                </div>
                                                                <div className="text-xs font-bold truncate">{preset.name}</div>
                                                                <div className="text-[9px] text-slate-500 line-clamp-1 mt-0.5">{preset.description}</div>
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Color & Gradient Configurator */}
                                        <div className="p-3.5 bg-slate-900/90 rounded-2xl border border-slate-800 space-y-3 shadow-lg">
                                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5">
                                                <div>
                                                    <h5 className="text-xs sm:text-sm font-bold text-slate-100 flex items-center gap-2">
                                                        <Palette size={15} className="text-cyan-400" /> 커스텀 타격 오라 색상 & 그라데이션
                                                    </h5>
                                                    <p className="text-[10px] text-slate-400">
                                                        단색 타격 오라 또는 다채로운 그라데이션 오라를 직접 지정합니다.
                                                    </p>
                                                </div>

                                                <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
                                                    <button
                                                        onClick={() => {
                                                            setColorMode('solid');
                                                            if (editVfxColor.includes('gradient')) setEditVfxColor('#00f5ff');
                                                        }}
                                                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 ${
                                                            colorMode === 'solid' ? 'bg-cyan-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                                                        }`}
                                                    >
                                                        <Palette size={12} />
                                                        <span>단색</span>
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            setColorMode('gradient');
                                                            if (!editVfxColor.includes('gradient')) {
                                                                const newGrad = `linear-gradient(${gradAngle}, ${gradColor1}${useGradColor3 ? `, ${gradColor3}` : ''}, ${gradColor2})`;
                                                                setEditVfxColor(newGrad);
                                                            }
                                                        }}
                                                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 ${
                                                            colorMode === 'gradient' ? 'bg-gradient-to-r from-purple-600 via-pink-600 to-amber-500 text-white shadow-md' : 'text-slate-400 hover:text-white'
                                                        }`}
                                                    >
                                                        <Sparkles size={12} />
                                                        <span>그라데이션</span>
                                                    </button>
                                                </div>
                                            </div>

                                            {colorMode === 'solid' ? (
                                                <div className="flex items-center justify-between gap-3 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
                                                    <span className="text-xs font-bold text-slate-300">단색 색상:</span>
                                                    <div className="flex items-center gap-2">
                                                        <input 
                                                            type="color" 
                                                            value={editVfxColor.startsWith('#') ? editVfxColor : previewPrimaryColor}
                                                            onChange={(e) => setEditVfxColor(e.target.value)}
                                                            className="w-8 h-8 rounded-lg border border-slate-700 bg-transparent cursor-pointer shrink-0"
                                                        />
                                                        <input 
                                                            type="text" 
                                                            placeholder="#00f5ff"
                                                            value={editVfxColor}
                                                            onChange={(e) => setEditVfxColor(e.target.value)}
                                                            className="px-2.5 py-1 text-xs font-mono bg-slate-950 border border-slate-800 rounded-lg text-slate-200 w-28 focus:outline-none focus:border-cyan-500"
                                                        />
                                                        {editVfxColor && (
                                                            <button
                                                                onClick={() => setEditVfxColor('')}
                                                                className="text-[10px] px-2 py-1 bg-slate-800 text-slate-400 hover:text-white rounded border border-slate-700"
                                                            >
                                                                초기화
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="space-y-3 bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
                                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                                                        <div className="flex items-center gap-2 bg-slate-900 p-2 rounded-lg border border-slate-800">
                                                            <span className="text-[10px] text-slate-400 font-bold">시작:</span>
                                                            <input 
                                                                type="color" 
                                                                value={gradColor1}
                                                                onChange={(e) => {
                                                                    setGradColor1(e.target.value);
                                                                    const newGrad = `linear-gradient(${gradAngle}, ${e.target.value}${useGradColor3 ? `, ${gradColor3}` : ''}, ${gradColor2})`;
                                                                    setEditVfxColor(newGrad);
                                                                }}
                                                                className="w-7 h-7 rounded border border-slate-700 bg-transparent cursor-pointer shrink-0"
                                                            />
                                                        </div>
                                                        <div className="flex items-center gap-2 bg-slate-900 p-2 rounded-lg border border-slate-800">
                                                            <span className="text-[10px] text-slate-400 font-bold">끝:</span>
                                                            <input 
                                                                type="color" 
                                                                value={gradColor2}
                                                                onChange={(e) => {
                                                                    setGradColor2(e.target.value);
                                                                    const newGrad = `linear-gradient(${gradAngle}, ${gradColor1}${useGradColor3 ? `, ${gradColor3}` : ''}, ${e.target.value})`;
                                                                    setEditVfxColor(newGrad);
                                                                }}
                                                                className="w-7 h-7 rounded border border-slate-700 bg-transparent cursor-pointer shrink-0"
                                                            />
                                                        </div>
                                                        <div className="flex items-center gap-2 bg-slate-900 p-2 rounded-lg border border-slate-800">
                                                            <span className="text-[10px] text-slate-400 font-bold">방향:</span>
                                                            <select
                                                                value={gradAngle}
                                                                onChange={(e) => {
                                                                    setGradAngle(e.target.value);
                                                                    const newGrad = `linear-gradient(${e.target.value}, ${gradColor1}${useGradColor3 ? `, ${gradColor3}` : ''}, ${gradColor2})`;
                                                                    setEditVfxColor(newGrad);
                                                                }}
                                                                className="w-full bg-slate-950 text-slate-200 text-[10px] font-bold p-1 rounded border border-slate-800 focus:outline-none"
                                                            >
                                                                <option value="135deg">대각선 (135°)</option>
                                                                <option value="90deg">수평 (90°)</option>
                                                                <option value="180deg">수직 (180°)</option>
                                                                <option value="45deg">역대각선 (45°)</option>
                                                            </select>
                                                        </div>
                                                    </div>

                                                    <div 
                                                        className="w-full h-4 rounded-md border border-white/30 shadow-[0_0_10px_rgba(255,255,255,0.2)]"
                                                        style={{ background: editVfxColor || `linear-gradient(135deg, ${gradColor1}, ${gradColor2})` }}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    </>
                                ) : (
                                    <div className="h-64 flex flex-col items-center justify-center text-slate-500 text-xs italic">
                                        스킬을 선택하세요.
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ================================================================ */}
                    {/* TAB 1-2: ICON (스킬 아이콘) - Lv.1 */}
                    {/* ================================================================ */}
                    {activeTab === 'icon' && (
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-full">
                            <div className="lg:col-span-4 flex flex-col space-y-1.5 max-h-[180px] lg:max-h-[580px] overflow-y-auto custom-scrollbar pr-1 bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                                <span className="text-xs font-bold text-slate-400">스킬 선택 ({targetSkills.length})</span>
                                {targetSkills.map((skill, idx) => {
                                    const isSelected = (currentSelectedSkill?.name === skill.name);
                                    return (
                                        <button
                                            key={idx}
                                            onClick={() => selectSkillForCustomization(skill)}
                                            className={`p-2.5 rounded-xl border text-left flex items-center gap-2.5 transition-all shrink-0 ${
                                                isSelected
                                                    ? 'bg-amber-950/60 border-amber-500 text-amber-100 shadow-[0_0_12px_rgba(245,158,11,0.3)]'
                                                    : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                                            }`}
                                        >
                                            <div className="w-8 h-8 rounded-lg bg-slate-950 border border-slate-700 overflow-hidden flex items-center justify-center shrink-0">
                                                {skill.imageUrl ? (
                                                    <img src={skill.imageUrl} alt={skill.name} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                                                ) : (
                                                    (() => {
                                                        const IconC = getSkillIconComponent(skill);
                                                        return <IconC size={16} className="text-amber-400" />;
                                                    })()
                                                )}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <div className="text-xs font-bold truncate">{skill.name}</div>
                                                <div className="text-[10px] text-slate-500 font-mono truncate">
                                                    {skill.imageUrl ? '커스텀 썸네일' : `아이콘: ${skill.icon || 'Sword'}`}
                                                </div>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>

                            <div className="lg:col-span-8 flex flex-col space-y-4 overflow-y-auto custom-scrollbar">
                                {/* Auto Caster Illustration Cut-in Global Setting */}
                                <div className="space-y-2 bg-gradient-to-r from-rose-950/50 via-slate-900/90 to-indigo-950/50 p-3.5 rounded-2xl border border-rose-500/40">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-1.5">
                                            <Crown size={14} className="text-rose-400" />
                                            <span className="text-xs font-bold text-rose-200">⚡ 시전자 일러스트 자동 대각선 컷인 설정 (라스트 이상 기본 적용)</span>
                                        </div>
                                        <span className="text-[10px] text-rose-300/80 font-mono">전용 컷신 미등록 시 시전자 일러스트 자동 활용</span>
                                    </div>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                                        {[
                                            { id: 'last_and_final' as const, label: '3차(라스트) 이상 자동', desc: '추천 · 3차/4차/인연' },
                                            { id: 'final_only' as const, label: '4차(파이널)만 자동', desc: '파이널/인연 스킬만' },
                                            { id: 'custom_only' as const, label: '전용 컷신만 표시', desc: '직접 등록한 컷신만' },
                                            { id: 'off' as const, label: '컷인 모두 끄기', desc: '전투 속도 최우선' },
                                        ].map(opt => (
                                            <button
                                                key={opt.id}
                                                type="button"
                                                onClick={() => handleChangeAutoCutinMode(opt.id)}
                                                className={`p-2 rounded-xl border text-left transition-all ${
                                                    autoCasterCutinMode === opt.id
                                                        ? 'bg-rose-950/80 border-rose-400 text-rose-100 shadow-[0_0_12px_rgba(244,63,94,0.3)]'
                                                        : 'bg-slate-950/70 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                                                }`}
                                            >
                                                <div className="text-[11px] font-bold truncate">{opt.label}</div>
                                                <div className="text-[9px] text-slate-400 truncate mt-0.5">{opt.desc}</div>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {currentSelectedSkill ? (
                                    <>
                                        <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 flex items-center justify-between">
                                            <div>
                                                <span className="text-[10px] text-amber-400 font-bold">선택된 스킬</span>
                                                <h4 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                                                    {currentSelectedSkill.name}
                                                </h4>
                                            </div>
                                            <button
                                                onClick={handleSaveIcon}
                                                disabled={!isAllowedToCustomize}
                                                className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-lg active:scale-95 ${
                                                    isAllowedToCustomize
                                                        ? 'bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 text-white'
                                                        : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                                                }`}
                                            >
                                                <CheckCircle2 size={14} />
                                                <span>아이콘 저장</span>
                                            </button>
                                        </div>

                                        {/* Thumbnail Preview Card */}
                                        <div className="p-3.5 bg-slate-900/60 rounded-2xl border border-slate-800 flex items-center gap-4">
                                            <div className="w-16 h-16 rounded-xl bg-slate-950 border-2 border-amber-500/60 overflow-hidden flex items-center justify-center shrink-0 shadow-lg relative">
                                                {editImageUrl ? (
                                                    <img src={editImageUrl} alt="Preview" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                                                ) : (
                                                    (() => {
                                                        const found = BASE_ICONS.find(b => b.name === editIcon);
                                                        const IconC = found ? found.icon : Sword;
                                                        return <IconC size={28} className="text-amber-400" />;
                                                    })()
                                                )}
                                            </div>
                                            <div>
                                                <div className="text-xs font-bold text-slate-200">현재 스킬 썸네일 미리보기</div>
                                                <p className="text-[10px] text-slate-400 mt-0.5">
                                                    전투 인터페이스 및 스킬북 목록에서 표시될 썸네일입니다.
                                                </p>
                                                {editImageUrl && (
                                                    <button
                                                        onClick={() => setEditImageUrl('')}
                                                        className="mt-1.5 text-[10px] px-2 py-0.5 bg-red-950/60 border border-red-800 text-red-300 rounded hover:bg-red-900"
                                                    >
                                                        커스텀 이미지 제거 (기본 아이콘 사용)
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        {/* Base Icons (53 Fantasy RPG Vector Icons with Category Filter) */}
                                        <div className="space-y-2 p-3 bg-slate-900/70 rounded-xl border border-slate-800">
                                            <div className="flex flex-wrap items-center justify-between gap-2">
                                                <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                                                    <Sparkles size={13} className="text-amber-400" />
                                                    1. 판타지 RPG 전용 벡터 아이콘 ({BASE_ICONS.length}종 · 무료)
                                                </span>
                                                <div className="flex flex-wrap gap-1">
                                                    {[
                                                        { id: 'all' as const, label: '전체' },
                                                        { id: 'martial' as const, label: '⚔️ 무투/무기' },
                                                        { id: 'magic' as const, label: '🔥 원소/마법' },
                                                        { id: 'holy' as const, label: '✨ 신성/수호' },
                                                        { id: 'dark' as const, label: '🌑 암흑/신수' },
                                                    ].map(cat => (
                                                        <button
                                                            key={cat.id}
                                                            type="button"
                                                            onClick={() => setIconCategoryFilter(cat.id)}
                                                            className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border transition-all ${
                                                                iconCategoryFilter === cat.id
                                                                    ? 'bg-amber-950/80 border-amber-400 text-amber-200'
                                                                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                                                            }`}
                                                        >
                                                            {cat.label}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-6 sm:grid-cols-9 gap-1.5 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                                                {BASE_ICONS.filter(bi => iconCategoryFilter === 'all' || bi.category === iconCategoryFilter).map(bi => {
                                                    const IconC = bi.icon;
                                                    const isSelected = !editImageUrl && editIcon === bi.name;
                                                    return (
                                                        <button
                                                            key={bi.name}
                                                            type="button"
                                                            onClick={() => {
                                                                setEditIcon(bi.name);
                                                                setEditImageUrl('');
                                                            }}
                                                            className={`p-2 rounded-xl border flex flex-col items-center justify-center transition-all ${
                                                                isSelected
                                                                    ? 'bg-amber-950/60 border-amber-500 text-amber-400 shadow-md scale-105'
                                                                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                                                            }`}
                                                            title={bi.label}
                                                        >
                                                            <IconC size={18} />
                                                            <span className="text-[9px] mt-1 truncate max-w-full">{bi.label}</span>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        {/* Full-Color RPG Skill Emblem Presets */}
                                        <div className="space-y-2 p-3 bg-slate-900/70 rounded-xl border border-slate-800">
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                                                    <Palette size={13} className="text-cyan-400" />
                                                    2. 고화질 컬러 RPG 엠블럼 스탬프 (무료 즉시 적용)
                                                </span>
                                                <span className="text-[10px] text-cyan-300/80 font-mono">마정석 소모 없음</span>
                                            </div>
                                            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                                                {SKILL_EMBLEM_PRESETS.map(preset => {
                                                    const uri = buildSkillEmblemDataUri(preset);
                                                    const isSelected = editImageUrl === uri;
                                                    return (
                                                        <button
                                                            key={preset.id}
                                                            type="button"
                                                            onClick={() => setEditImageUrl(uri)}
                                                            className={`p-1.5 rounded-xl border flex flex-col items-center gap-1 transition-all ${
                                                                isSelected
                                                                    ? 'bg-cyan-950/70 border-cyan-400 text-cyan-200 shadow-lg scale-105'
                                                                    : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-600'
                                                            }`}
                                                        >
                                                            <img src={uri} alt={preset.name} className="w-10 h-10 rounded-lg object-cover" />
                                                            <span className="text-[9px] font-bold truncate max-w-full">{preset.name}</span>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        {/* Open-Source Game-Icons.net Search & Emblem Compositor */}
                                        <div className="space-y-2.5 p-3 bg-slate-900/70 rounded-xl border border-indigo-500/30">
                                            <div className="flex flex-wrap items-center justify-between gap-1">
                                                <span className="text-xs font-bold text-indigo-200 flex items-center gap-1.5">
                                                    <Wand2 size={13} className="text-indigo-400" />
                                                    3. 오픈소스 Game-Icons 4,000종 검색 & 엠블럼 합성 (무료)
                                                </span>
                                                <div className="flex items-center gap-2 text-[10px] text-slate-400">
                                                    <label className="flex items-center gap-1 cursor-pointer">
                                                        <span>아이콘색</span>
                                                        <input
                                                            type="color"
                                                            value={gameIconColor}
                                                            onChange={e => setGameIconColor(e.target.value)}
                                                            className="w-5 h-5 rounded bg-transparent border-0 cursor-pointer"
                                                        />
                                                    </label>
                                                    <label className="flex items-center gap-1 cursor-pointer">
                                                        <span>배경색</span>
                                                        <input
                                                            type="color"
                                                            value={gameIconBg}
                                                            onChange={e => setGameIconBg(e.target.value)}
                                                            className="w-5 h-5 rounded bg-transparent border-0 cursor-pointer"
                                                        />
                                                    </label>
                                                </div>
                                            </div>

                                            <div className="flex gap-1.5">
                                                <input
                                                    type="text"
                                                    placeholder="한글/영문 검색 (예: 용, 검, 번개, 날개, 해골, 불, 마법진, 창, 포션)"
                                                    value={gameIconSearchQuery}
                                                    onChange={e => setGameIconSearchQuery(e.target.value)}
                                                    onKeyDown={e => { if (e.key === 'Enter') handleSearchGameIcons(); }}
                                                    className="flex-1 px-3 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-indigo-500"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => handleSearchGameIcons()}
                                                    disabled={isSearchingGameIcons}
                                                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shrink-0"
                                                >
                                                    {isSearchingGameIcons ? '검색 중...' : '아이콘 검색'}
                                                </button>
                                            </div>

                                            <div className="flex flex-wrap gap-1">
                                                {['검', '쌍검', '카타나', '창', '활', '용', '불', '번개', '얼음', '운석', '날개', '신성', '해골', '마법진', '불사조'].map(kw => (
                                                    <button
                                                        key={kw}
                                                        type="button"
                                                        onClick={() => {
                                                            setGameIconSearchQuery(kw);
                                                            handleSearchGameIcons(kw);
                                                        }}
                                                        className="px-2 py-0.5 rounded-md bg-slate-950 border border-slate-800 hover:border-indigo-500/60 text-[10px] text-slate-300"
                                                    >
                                                        #{kw}
                                                    </button>
                                                ))}
                                            </div>

                                            {gameIconResults.length > 0 && (
                                                <div className="grid grid-cols-6 sm:grid-cols-8 gap-1.5 max-h-40 overflow-y-auto custom-scrollbar pt-1">
                                                    {gameIconResults.map(iconName => {
                                                        const clean = iconName.replace(/^game-icons:/, '');
                                                        const previewUrl = `https://api.iconify.design/game-icons/${encodeURIComponent(clean)}.svg?color=${encodeURIComponent(gameIconColor)}`;
                                                        return (
                                                            <button
                                                                key={iconName}
                                                                type="button"
                                                                onClick={() => handleSelectOpenSourceGameIcon(iconName)}
                                                                className="p-1.5 rounded-xl border border-slate-800 hover:border-indigo-400 bg-slate-950 flex flex-col items-center justify-center gap-1 transition-all hover:scale-105"
                                                                title={clean}
                                                            >
                                                                <img src={previewUrl} alt={clean} className="w-7 h-7 object-contain" />
                                                                <span className="text-[8px] text-slate-400 truncate max-w-full">{clean}</span>
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>

                                        {/* Custom Image Upload (Preserved 100%) */}
                                        <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800 space-y-3">
                                            <div className="flex items-center justify-between">
                                                <h5 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                                                    <ImageIcon size={14} className="text-amber-400" /> 4. 내 커스텀 이미지 직접 등록 (마정석 5개)
                                                </h5>
                                                <span className="text-[10px] text-slate-500">
                                                    보유 마정석: <strong className="text-purple-400">{character.base?.resources?.manaCrystal || 0}</strong>개
                                                </span>
                                            </div>

                                            <div className="flex flex-col sm:flex-row gap-2">
                                                <input
                                                    type="text"
                                                    placeholder="https://... 이미지 URL을 입력하세요"
                                                    value={editImageUrl}
                                                    onChange={(e) => setEditImageUrl(e.target.value)}
                                                    className="flex-1 px-3 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-amber-500"
                                                />
                                                <input
                                                    type="file"
                                                    ref={fileInputRef}
                                                    accept="image/*"
                                                    className="hidden"
                                                    onChange={(e) => handleFileUpload(e, 'icon')}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => fileInputRef.current?.click()}
                                                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold border border-slate-700 flex items-center justify-center gap-1 shrink-0"
                                                >
                                                    <Upload size={13} />
                                                    <span>파일 선택</span>
                                                </button>
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <div className="h-64 flex flex-col items-center justify-center text-slate-500 text-xs italic">
                                        스킬을 선택하세요.
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ================================================================ */}
                    {/* TAB 2: CUT-IN (스킬 컷신) - Lv.2 */}
                    {/* ================================================================ */}
                    {activeTab === 'cutin' && (
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-full">
                            <div className="lg:col-span-4 flex flex-col space-y-1.5 max-h-[180px] lg:max-h-[580px] overflow-y-auto custom-scrollbar pr-1 bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                                <span className="text-xs font-bold text-slate-400">스킬 선택 ({targetSkills.length})</span>
                                {targetSkills.map((skill, idx) => {
                                    const isSelected = (currentSelectedSkill?.name === skill.name);
                                    const isEligible = skill.tier === ClassTier.FINAL || skill.tier === ClassTier.BOND || (skill as any).isBond || skill.isBondSkill || skill.tier === ClassTier.LAST;

                                    return (
                                        <button
                                            key={idx}
                                            onClick={() => selectSkillForCustomization(skill)}
                                            className={`p-2.5 rounded-xl border text-left flex items-center gap-2.5 transition-all shrink-0 ${
                                                isSelected
                                                    ? 'bg-rose-950/60 border-rose-500 text-rose-100 shadow-[0_0_12px_rgba(244,63,94,0.3)]'
                                                    : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                                            }`}
                                        >
                                            <div className="w-8 h-8 rounded-lg bg-slate-950 border border-slate-700 flex items-center justify-center shrink-0">
                                                {(() => {
                                                    const found = BASE_ICONS.find(b => b.name === skill.icon);
                                                    const IconC = found ? found.icon : Crown;
                                                    return <IconC size={16} className="text-rose-400" />;
                                                })()}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <div className="text-xs font-bold truncate flex items-center gap-1.5">
                                                    <span>{skill.name}</span>
                                                    {isEligible && <span className="text-[9px] text-amber-400 font-mono">★</span>}
                                                </div>
                                                <div className="text-[10px] text-slate-500 font-mono truncate">
                                                    {skill.illustrationUrl ? '컷신 등록됨' : isEligible ? '컷신 미등록' : '일반 스킬 (등록불가)'}
                                                </div>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>

                            <div className="lg:col-span-8 flex flex-col space-y-4 overflow-y-auto custom-scrollbar">
                                {/* Auto Caster Illustration Cut-in Global Setting */}
                                <div className="space-y-2 bg-gradient-to-r from-rose-950/50 via-slate-900/90 to-indigo-950/50 p-3.5 rounded-2xl border border-rose-500/40">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-1.5">
                                            <Crown size={14} className="text-rose-400" />
                                            <span className="text-xs font-bold text-rose-200">⚡ 시전자 일러스트 자동 대각선 컷인 설정 (라스트 이상 기본 적용)</span>
                                        </div>
                                        <span className="text-[10px] text-rose-300/80 font-mono">전용 컷신 미등록 시 시전자 일러스트 자동 활용</span>
                                    </div>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                                        {[
                                            { id: 'last_and_final' as const, label: '3차(라스트) 이상 자동', desc: '추천 · 3차/4차/인연' },
                                            { id: 'final_only' as const, label: '4차(파이널)만 자동', desc: '파이널/인연 스킬만' },
                                            { id: 'custom_only' as const, label: '전용 컷신만 표시', desc: '직접 등록한 컷신만' },
                                            { id: 'off' as const, label: '컷인 모두 끄기', desc: '전투 속도 최우선' },
                                        ].map(opt => (
                                            <button
                                                key={opt.id}
                                                type="button"
                                                onClick={() => handleChangeAutoCutinMode(opt.id)}
                                                className={`p-2 rounded-xl border text-left transition-all ${
                                                    autoCasterCutinMode === opt.id
                                                        ? 'bg-rose-950/80 border-rose-400 text-rose-100 shadow-[0_0_12px_rgba(244,63,94,0.3)]'
                                                        : 'bg-slate-950/70 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                                                }`}
                                            >
                                                <div className="text-[11px] font-bold truncate">{opt.label}</div>
                                                <div className="text-[9px] text-slate-400 truncate mt-0.5">{opt.desc}</div>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {currentSelectedSkill ? (
                                    <>
                                        {!isCutinEligible && (
                                            <div className="p-3 bg-red-950/50 border border-red-800/60 rounded-xl flex items-center gap-2.5 text-xs text-red-200">
                                                <AlertTriangle size={16} className="text-red-400 shrink-0" />
                                                <div>
                                                    <strong>스킬 등급 제한:</strong> 스킬 컷신은 <strong>라스트 클래스(3차)</strong> 또는 <strong>파이널 클래스(4차 / 인연 스킬)</strong> 등급 이상의 스킬만 등록 가능합니다.
                                                    <span className="block text-[10px] text-red-300/80 mt-0.5">현재 스킬 등급: [{currentSelectedSkill.tier || '기본'}]</span>
                                                </div>
                                            </div>
                                        )}

                                        <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 flex items-center justify-between">
                                            <div>
                                                <span className="text-[10px] text-rose-400 font-bold">선택된 스킬</span>
                                                <h4 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                                                    {currentSelectedSkill.name}
                                                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-950 text-amber-400 border border-slate-800">
                                                        {currentSelectedSkill.tier || '스페셜'}
                                                    </span>
                                                </h4>
                                            </div>
                                            <button
                                                onClick={handleSaveCutin}
                                                disabled={!isAllowedToCustomize || !isCutinEligible}
                                                className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-lg active:scale-95 ${
                                                    isAllowedToCustomize && isCutinEligible
                                                        ? 'bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white'
                                                        : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                                                }`}
                                            >
                                                <CheckCircle2 size={14} />
                                                <span>컷신 저장</span>
                                            </button>
                                        </div>

                                        {/* Cutin Preview Frame */}
                                        {(() => {
                                            const isFinalPreview = currentSelectedSkill.tier === ClassTier.FINAL || currentSelectedSkill.tier === ClassTier.BOND || currentSelectedSkill.isBondSkill;
                                            return (
                                                <div className="p-4 sm:p-6 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 rounded-2xl border border-rose-500/40 relative overflow-hidden flex flex-col justify-center min-h-[220px] shadow-2xl">
                                                    <div className="absolute top-2 left-3 text-[10px] sm:text-xs text-slate-400 font-mono flex items-center gap-1 z-10">
                                                        <Eye size={13} className="text-rose-400" /> 
                                                        <span>전투 발동 컷신 프레임 미리보기 ({isFinalPreview ? '파이널 초대형' : '라스트 대형'})</span>
                                                    </div>

                                                    <div className={`relative rounded-2xl bg-slate-900/95 border-amber-400/90 shadow-2xl flex items-center z-20 backdrop-blur-md ${
                                                        isFinalPreview
                                                            ? 'py-3 sm:py-5 px-4 sm:px-6 border-y-2 gap-3.5 sm:gap-5'
                                                            : 'py-2.5 sm:py-3.5 px-3 sm:px-5 border-y gap-3 sm:gap-4'
                                                    }`}>
                                                        <div className={`rounded-xl overflow-hidden border-amber-300 shadow-2xl shrink-0 bg-slate-950 flex items-center justify-center ${
                                                            isFinalPreview
                                                                ? 'w-24 h-24 sm:w-32 sm:h-32 border-3'
                                                                : 'w-16 h-16 sm:w-20 sm:h-20 border-2'
                                                        }`}>
                                                            {editIllustrationUrl ? (
                                                                <img src={editIllustrationUrl} alt="Cutin" referrerPolicy="no-referrer" className="w-full h-full object-cover scale-105" />
                                                            ) : (
                                                                <Crown size={isFinalPreview ? 36 : 28} className="text-rose-400/40" />
                                                            )}
                                                        </div>

                                                        <div className="flex-1 min-w-0 flex flex-col justify-center">
                                                            <span className="text-[11px] sm:text-xs font-black tracking-wider text-amber-300 uppercase flex items-center gap-1">
                                                                <Sparkles size={12} className="text-amber-400 shrink-0" />
                                                                <span className="truncate">{activeTarget.name}</span>
                                                            </span>
                                                            <h3 className="text-xs sm:text-sm md:text-base font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-rose-200 to-amber-200 py-0.5 leading-snug break-words">
                                                                {currentSelectedSkill.name}
                                                            </h3>
                                                            <span className="text-[10px] sm:text-xs font-mono text-amber-200/90 mt-0.5 inline-block font-bold">
                                                                {isFinalPreview ? `★ ${currentSelectedSkill.tier || '파이널 클래스 오의'} ★` : (currentSelectedSkill.tier || '라스트 클래스 오의')}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })()}

                                        {/* Cutin Input */}
                                        <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800 space-y-3">
                                            <div className="flex items-center justify-between">
                                                <h5 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                                                    <ImageIcon size={14} className="text-rose-400" /> 컷신 일러스트 URL / 파일 등록 (마정석 5개)
                                                </h5>
                                                <span className="text-[10px] text-slate-500">
                                                    보유 마정석: <strong className="text-purple-400">{character.base?.resources?.manaCrystal || 0}</strong>개
                                                </span>
                                            </div>

                                            <div className="flex flex-col sm:flex-row gap-2">
                                                <input
                                                    type="text"
                                                    placeholder="https://... 일러스트/GIF URL을 입력하세요"
                                                    value={editIllustrationUrl}
                                                    onChange={(e) => setEditIllustrationUrl(e.target.value)}
                                                    className="flex-1 px-3 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-rose-500"
                                                />
                                                <input
                                                    type="file"
                                                    ref={cutinFileInputRef}
                                                    accept="image/*"
                                                    className="hidden"
                                                    onChange={(e) => handleFileUpload(e, 'cutin')}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => cutinFileInputRef.current?.click()}
                                                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold border border-slate-700 flex items-center justify-center gap-1 shrink-0"
                                                >
                                                    <Upload size={13} />
                                                    <span>파일 선택</span>
                                                </button>
                                                {editIllustrationUrl && (
                                                    <button
                                                        type="button"
                                                        onClick={() => setEditIllustrationUrl('')}
                                                        className="px-2.5 py-1.5 bg-red-950/60 hover:bg-red-900 text-red-300 rounded-xl text-xs font-bold border border-red-800"
                                                    >
                                                        삭제
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <div className="h-64 flex flex-col items-center justify-center text-slate-500 text-xs italic">
                                        스킬을 선택하세요.
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ================================================================ */}
                    {/* TAB 3: FRAME ANIMATION (프레임 이펙트 제작) - Lv.3 */}
                    {/* ================================================================ */}
                    {activeTab === 'frame_vfx' && (
                        <div className="flex flex-col h-full space-y-2.5">
                            {/* Compact Top Skill Selector Bar */}
                            <div className="flex items-center gap-2 p-2 bg-slate-950/80 rounded-xl border border-slate-800 shrink-0 overflow-x-auto custom-scrollbar">
                                <span className="text-[11px] font-bold text-slate-400 shrink-0 flex items-center gap-1.5 pl-1">
                                    <Film size={13} className="text-emerald-400" />
                                    <span>개조할 스킬 선택:</span>
                                </span>
                                <div className="flex items-center gap-1.5 flex-nowrap">
                                    {targetSkills.map((skill, idx) => {
                                        const isSelected = (currentSelectedSkill?.name === skill.name);
                                        const hasFrameAnim = !!((skill as any).frameAnimation?.frames?.length);

                                        return (
                                            <button
                                                key={idx}
                                                onClick={() => selectSkillForCustomization(skill)}
                                                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0 border ${
                                                    isSelected
                                                        ? 'bg-emerald-950 border-emerald-400 text-emerald-200 shadow-sm ring-1 ring-emerald-400/40'
                                                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                                                }`}
                                            >
                                                <span>{skill.name}</span>
                                                {hasFrameAnim ? (
                                                    <span className="text-[9px] px-1 py-0.2 rounded bg-emerald-900/70 border border-emerald-600/60 text-emerald-300 font-mono">
                                                        {(skill as any).frameAnimation.frames.length}프레임
                                                    </span>
                                                ) : (
                                                    <span className="text-[9px] text-slate-600 font-mono">
                                                        미등록
                                                    </span>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Full-Width Editor Area */}
                            <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar">
                                {currentSelectedSkill ? (
                                    <SkillFrameAnimationEditor
                                        key={currentSelectedSkill.name}
                                        skill={currentSelectedSkill}
                                        character={character}
                                        isAllowedToCustomize={isAllowedToCustomize}
                                        onSaveAnimation={(anim) => handleSaveFrameAnimation(anim)}
                                        showToast={showToast}
                                        onBeforeReduceBackupToDrive={ensureGoogleDriveBackupBeforeReduce}
                                        onBatchReduceAllEffects={handleBatchReduceAllSaveFileSize}
                                        isBatchReducing={isBatchReducing}
                                    />
                                ) : (
                                    <div className="h-64 flex flex-col items-center justify-center text-slate-500 text-xs italic">
                                        스킬을 선택하세요.
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ================================================================ */}
                    {/* TAB 4: VIDEO (이펙트 영상 등록) - Lv.5 */}
                    {/* ================================================================ */}
                    {activeTab === 'video' && (
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-full">
                            <div className="lg:col-span-4 flex flex-col space-y-1.5 max-h-[180px] lg:max-h-[580px] overflow-y-auto custom-scrollbar pr-1 bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                                <span className="text-xs font-bold text-slate-400">스킬 선택 ({targetSkills.length})</span>
                                {targetSkills.map((skill, idx) => {
                                    const isSelected = (currentSelectedSkill?.name === skill.name);
                                    const hasVideo = !!((skill as any).videoUrl);

                                    return (
                                        <button
                                            key={idx}
                                            onClick={() => selectSkillForCustomization(skill)}
                                            className={`p-2.5 rounded-xl border text-left flex items-center gap-2.5 transition-all shrink-0 ${
                                                isSelected
                                                    ? 'bg-purple-950/60 border-purple-500 text-purple-100 shadow-[0_0_12px_rgba(168,85,247,0.3)]'
                                                    : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                                            }`}
                                        >
                                            <div className="w-8 h-8 rounded-lg bg-slate-950 border border-slate-700 flex items-center justify-center shrink-0">
                                                {hasVideo ? (
                                                    <Play size={16} className="text-purple-400 fill-purple-400/40" />
                                                ) : (
                                                    <Film size={16} className="text-slate-500" />
                                                )}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <div className="text-xs font-bold truncate flex items-center gap-1.5">
                                                    <span>{skill.name}</span>
                                                    {hasVideo && (
                                                        <span className="text-[9px] px-1 py-0.2 rounded bg-purple-950 border border-purple-700 text-purple-300 font-mono">
                                                            동영상
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="text-[10px] text-slate-500 font-mono truncate">
                                                    {hasVideo ? '전투 영상 등록됨' : '영상 미등록'}
                                                </div>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>

                            <div className="lg:col-span-8 flex flex-col space-y-4 overflow-y-auto custom-scrollbar">
                                {/* Auto Caster Illustration Cut-in Global Setting */}
                                <div className="space-y-2 bg-gradient-to-r from-rose-950/50 via-slate-900/90 to-indigo-950/50 p-3.5 rounded-2xl border border-rose-500/40">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-1.5">
                                            <Crown size={14} className="text-rose-400" />
                                            <span className="text-xs font-bold text-rose-200">⚡ 시전자 일러스트 자동 대각선 컷인 설정 (라스트 이상 기본 적용)</span>
                                        </div>
                                        <span className="text-[10px] text-rose-300/80 font-mono">전용 컷신 미등록 시 시전자 일러스트 자동 활용</span>
                                    </div>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                                        {[
                                            { id: 'last_and_final' as const, label: '3차(라스트) 이상 자동', desc: '추천 · 3차/4차/인연' },
                                            { id: 'final_only' as const, label: '4차(파이널)만 자동', desc: '파이널/인연 스킬만' },
                                            { id: 'custom_only' as const, label: '전용 컷신만 표시', desc: '직접 등록한 컷신만' },
                                            { id: 'off' as const, label: '컷인 모두 끄기', desc: '전투 속도 최우선' },
                                        ].map(opt => (
                                            <button
                                                key={opt.id}
                                                type="button"
                                                onClick={() => handleChangeAutoCutinMode(opt.id)}
                                                className={`p-2 rounded-xl border text-left transition-all ${
                                                    autoCasterCutinMode === opt.id
                                                        ? 'bg-rose-950/80 border-rose-400 text-rose-100 shadow-[0_0_12px_rgba(244,63,94,0.3)]'
                                                        : 'bg-slate-950/70 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                                                }`}
                                            >
                                                <div className="text-[11px] font-bold truncate">{opt.label}</div>
                                                <div className="text-[9px] text-slate-400 truncate mt-0.5">{opt.desc}</div>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {currentSelectedSkill ? (
                                    <>
                                        <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 flex items-center justify-between">
                                            <div>
                                                <span className="text-[10px] text-purple-400 font-bold">선택된 스킬</span>
                                                <h4 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                                                    {currentSelectedSkill.name}
                                                </h4>
                                            </div>
                                            <button
                                                onClick={handleSaveVideo}
                                                disabled={!isAllowedToCustomize}
                                                className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-lg active:scale-95 ${
                                                    isAllowedToCustomize
                                                        ? 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white'
                                                        : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                                                }`}
                                            >
                                                <CheckCircle2 size={14} />
                                                <span>영상 저장</span>
                                            </button>
                                        </div>

                                        {/* Video Live Preview Arena */}
                                        <div className="relative aspect-video max-h-[220px] sm:max-h-[260px] w-full rounded-2xl bg-black border border-purple-500/40 overflow-hidden flex items-center justify-center shadow-2xl">
                                            <div className="absolute top-2 left-3 text-[10px] text-slate-400 font-mono flex items-center gap-1 z-10 bg-black/60 px-2 py-0.5 rounded backdrop-blur-sm">
                                                <Eye size={12} className="text-purple-400" /> 전투 발동 이펙트 영상 미리보기
                                            </div>

                                            {editVideoUrl ? (
                                                (editVideoUrl.includes('youtube.com') || editVideoUrl.includes('youtu.be')) ? (
                                                    <iframe
                                                        src={formatEmbedUrl(editVideoUrl)}
                                                        className="w-full h-full border-none"
                                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                                        allowFullScreen
                                                    />
                                                ) : (
                                                    <video
                                                        src={editVideoUrl}
                                                        controls
                                                        className="w-full h-full object-contain"
                                                    />
                                                )
                                            ) : (
                                                <div className="flex flex-col items-center justify-center text-slate-500 gap-2 p-4 text-center">
                                                    <Film size={36} className="text-purple-400/40 animate-pulse" />
                                                    <span className="text-xs">등록된 이펙트 영상이 없습니다.</span>
                                                    <span className="text-[10px] text-slate-600">
                                                        유튜브 링크, Shorts, 또는 MP4/WebM 비디오 파일을 등록하세요.
                                                    </span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Video Input */}
                                        <div className="p-3.5 bg-slate-900/80 rounded-xl border border-slate-800 space-y-3">
                                            <div className="flex items-center justify-between">
                                                <h5 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                                                    <Video size={14} className="text-purple-400" /> 이펙트 영상 URL / 파일 등록 (마정석 5개)
                                                </h5>
                                                <span className="text-[10px] text-slate-500">
                                                    보유 마정석: <strong className="text-purple-400">{character.base?.resources?.manaCrystal || 0}</strong>개
                                                </span>
                                            </div>

                                            <div className="flex flex-col sm:flex-row gap-2">
                                                <input
                                                    type="text"
                                                    placeholder="YouTube 링크 / Shorts / MP4 파일 URL을 입력하세요"
                                                    value={editVideoUrl}
                                                    onChange={(e) => setEditVideoUrl(e.target.value)}
                                                    className="flex-1 px-3 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-purple-500"
                                                />
                                                <input
                                                    type="file"
                                                    ref={videoFileInputRef}
                                                    accept="video/mp4,video/webm,video/ogg"
                                                    className="hidden"
                                                    onChange={handleVideoFileUpload}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => videoFileInputRef.current?.click()}
                                                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold border border-slate-700 flex items-center justify-center gap-1 shrink-0"
                                                >
                                                    <Upload size={13} />
                                                    <span>영상 파일 선택</span>
                                                </button>
                                                {editVideoUrl && (
                                                    <button
                                                        type="button"
                                                        onClick={() => setEditVideoUrl('')}
                                                        className="px-2.5 py-1.5 bg-red-950/60 hover:bg-red-900 text-red-300 rounded-xl text-xs font-bold border border-red-800 flex items-center gap-1"
                                                    >
                                                        <Trash2 size={12} />
                                                        <span>제거</span>
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <div className="h-64 flex flex-col items-center justify-center text-slate-500 text-xs italic">
                                        스킬을 선택하세요.
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                </div>

                {/* Mobile Bottom Quick Close Bar */}
                <div className="sm:hidden bg-slate-950 px-3 py-2 border-t border-slate-800 flex items-center justify-between shrink-0">
                    <span className="text-[11px] text-slate-400 font-bold truncate">
                        이펙트 개조실 Lv.{facilityLevel}
                    </span>
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-1.5 rounded-xl bg-rose-950/80 hover:bg-rose-900 text-rose-200 border border-rose-600/60 text-xs font-black flex items-center gap-1.5 shadow-md active:scale-95"
                    >
                        <X size={15} className="stroke-[2.5]" />
                        <span>개조실 닫기</span>
                    </button>
                </div>

                {/* Toast Notification */}
                {toastMessage && (
                    <div className="absolute bottom-4 right-4 z-50 animate-in slide-in-from-bottom-5">
                        <div className={`px-4 py-2.5 rounded-xl border shadow-2xl flex items-center gap-2 text-xs font-bold ${
                            toastMessage.type === 'success' ? 'bg-emerald-950/90 border-emerald-500 text-emerald-200' :
                            toastMessage.type === 'warning' ? 'bg-amber-950/90 border-amber-500 text-amber-200' :
                            'bg-cyan-950/90 border-cyan-500 text-cyan-200'
                        }`}>
                            <Sparkles size={14} />
                            <span>{toastMessage.text}</span>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
};

export default SkillVfxCustomLabModal;
