import React, { useState, useEffect } from 'react';
import { Character, Companion, ItemRarity, JobType } from '../types';
import { X, UserPlus, Zap, Coins, Sparkles, Loader2, Copy, CheckCircle, Users, ClipboardPaste, Crown, User, ShieldCheck, Star, Globe, AlertTriangle, FileText, ChevronDown, ChevronUp, Link } from 'lucide-react';
import { generateSummonCode, parseSummonCode, assignRandomCombatStyle, generateDefaultVisualUrl } from '../utils';
import { publishDimensionShare, resolveDimensionCode } from '../services/dimensionShareService';
import { remapCompanionRelationships } from '../services/playerCompanionSwitchService';
import ActionResultModal, { ResultData } from './ActionResultModal';
import { GoogleDriveAuthPanel } from './GoogleDriveAuthPanel';
import { findOrCreateAppFolder, uploadTextFileToFolder, shareFileWithAnyone, getFileWebViewLink, fetchFileContentFromUrl, getCachedAccessToken } from '../services/googleDriveService';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    character: Character;
    onUpdateCharacter: (newChar: Character, logMsg: string) => void;
}

const CommunicationSummonModal: React.FC<Props> = ({ isOpen, onClose, character, onUpdateCharacter }) => {
    const [activeTab, setActiveTab] = useState<'export' | 'import'>('export');
    const [selectedTargetId, setSelectedTargetId] = useState<string>('player');
    const [successorId, setSuccessorId] = useState<string | null>(null);
    const [summonCode, setSummonCode] = useState('');
    const [rawFullCode, setRawFullCode] = useState('');
    const [showFullCode, setShowFullCode] = useState(false);
    const [importInput, setImportInput] = useState('');
    const [copyFeedback, setCopyFeedback] = useState(false);
    const [fullCopyFeedback, setFullCopyFeedback] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('처리 중...');
    const [resultData, setResultData] = useState<ResultData | null>(null);

    // 구글 드라이브 관련 상태
    const [driveToken, setDriveToken] = useState<string | null>(() => getCachedAccessToken());
    const [driveShareLink, setDriveShareLink] = useState('');
    const [driveCopyFeedback, setDriveCopyFeedback] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setDriveToken(getCachedAccessToken());
        }
    }, [isOpen]);

    // Summon Logic States
    const [previewTarget, setPreviewTarget] = useState<Companion | null>(null);
    const [previewId, setPreviewId] = useState<string | null>(null);
    const [summonedTarget, setSummonedTarget] = useState<Companion | null>(null);

    if (!isOpen) return null;

    const allCompanionsRaw = [
        ...character.companions,
        ...(character.inactiveCompanions || [])
    ].filter(p => !p.name.includes('[수호수]'));

    const allPotentials = [
        { id: 'player', name: `${character.name} (나)`, level: character.level, shinryoku: character.shinryokuType, job: character.job },
        ...allCompanionsRaw.map(c => ({ id: c.id, name: c.name, level: c.level, shinryoku: c.shinryokuType, job: c.job }))
    ];

    const selectedTargetInfo = allPotentials.find(p => p.id === selectedTargetId);
    const targetLevel = selectedTargetInfo?.level || 1;
    const crystalCost = targetLevel * 10;
    const goldCost = targetLevel * 1000;

    const hasResources = (character.base?.resources.manaCrystal || 0) >= crystalCost && character.money >= goldCost;

    // --- EXPORT: 내 캐릭터 차원 데이터 구글 드라이브 등록 및 공유 링크 생성 ---
    const handleGenerate = async () => {
        if (!selectedTargetId) return;
        if (!hasResources) {
            alert("등록에 필요한 자원이 부족합니다.");
            return;
        }

        if (selectedTargetId === 'player') {
            if (allCompanionsRaw.length === 0) {
                alert("플레이어를 구글 드라이브에 등록하려면 플레이어를 대신할 동료가 최소 1명 이상 있어야 합니다.");
                return;
            }
            if (!successorId) {
                alert("플레이어의 뒤를 이을 계승자를 선택해주세요.");
                return;
            }
        }

        if (!driveToken) {
            alert("차원 데이터를 클라우드에 연동하기 위해 상단의 '구글 계정 연결'을 먼저 진행해 주십시오.");
            return;
        }

        setIsProcessing(true);
        setLoadingMessage('차원 데이터 클라우드 업로드 중...');
        setDriveShareLink('');

        try {
            const rawBase64Code = generateSummonCode(character, selectedTargetId);
            setRawFullCode(rawBase64Code);

            // 구글 드라이브 연동을 통해 폴더 및 공유 파일 생성
            let driveLink = '';
            try {
                setLoadingMessage('구글 드라이브 폴더 확인 중...');
                const folderId = await findOrCreateAppFolder(driveToken);
                
                setLoadingMessage('소환 데이터 파일 업로드 중...');
                const dateStr = character.currentDate || new Date().toISOString().split('T')[0];
                const targetName = selectedTargetId === 'player' ? character.name : (allCompanionsRaw.find(c => c.id === selectedTargetId)?.name || '동료');
                const fileName = `${targetName}_차원소환_${dateStr}.txt`;
                const fileId = await uploadTextFileToFolder(driveToken, folderId, fileName, rawBase64Code);
                
                setLoadingMessage('누구나 읽기 권한 공유 설정 중...');
                await shareFileWithAnyone(driveToken, fileId);
                
                setLoadingMessage('공유 링크 생성 중...');
                driveLink = await getFileWebViewLink(driveToken, fileId);
                setDriveShareLink(driveLink);
                setSummonCode(driveLink); // 드라이브 링크 설정
            } catch (driveErr: any) {
                console.error('[SummonModal] 구글 드라이브 처리 실패:', driveErr);
                throw new Error(`구글 클라우드 전송 실패: ${driveErr.message}`);
            }

            const rawData = parseSummonCode(rawBase64Code);
            
            const newChar = { ...character };
            newChar.money += goldCost;
            if (newChar.base) newChar.base.resources.manaCrystal -= crystalCost;

            newChar.usedDimensionCodes = [...(newChar.usedDimensionCodes || []), rawData.id];

            let logMsg = "";

            if (selectedTargetId === 'player') {
                const sComp = allCompanionsRaw.find(c => c.id === successorId)!;
                logMsg = `[차원 전송] 플레이어 '${character.name}'이(가) 차원의 너머로 떠나며 구글 드라이브 링크를 남겼습니다. 이제 '${sComp.name}'이(가) 새로운 가주가 됩니다.`;
                
                newChar.name = sComp.name;
                newChar.age = sComp.age;
                newChar.birthYear = sComp.birthYear;
                newChar.gender = sComp.gender;
                newChar.race = sComp.race;
                newChar.hairStyle = sComp.hairStyle || character.hairStyle;
                newChar.appearance = sComp.appearance;
                newChar.visualUrl = sComp.visualUrl || sComp.defaultVisualUrl || generateDefaultVisualUrl(sComp.name, sComp.nation || character.nation, sComp.race, sComp.gender);
                newChar.bgmUrl = sComp.bgmUrl;
                newChar.nation = sComp.nation || character.nation;
                newChar.personality = sComp.personality || character.personality;
                newChar.motto = sComp.motto;
                newChar.isImmortal = sComp.isImmortal || false;

                newChar.job = sComp.job || JobType.UNEMPLOYED;
                newChar.level = sComp.level;
                newChar.currentExp = sComp.currentExp;
                newChar.maxExp = sComp.maxExp;
                newChar.stats = { ...sComp.stats };
                newChar.statPoints = sComp.statPoints || 0;
                newChar.classTier = sComp.classTier;
                newChar.shinryokuType = sComp.shinryokuType || "미개방";
                newChar.skills = [...sComp.skills];
                newChar.skillShortcuts = sComp.skillShortcuts ? [...sComp.skillShortcuts] : [];
                newChar.equipment = { ...sComp.equipment };
                newChar.weaponMastery = sComp.weaponMastery ? { ...sComp.weaponMastery } : {};
                newChar.firstClassName = sComp.firstClassName || sComp.classType;
                newChar.secondClassName = sComp.secondClassName;
                newChar.lastClassName = sComp.lastClassName;
                newChar.finalClassName = sComp.finalClassName;

                newChar.liberationPotential = sComp.liberationPotential;
                newChar.potentialAppraised = sComp.potentialAppraised;
                newChar.hasClearedFirstTrial = sComp.hasClearedFirstTrial;
                newChar.hasClearedSecondTrial = sComp.hasClearedSecondTrial;
                newChar.hasClearedLastTrial = sComp.hasClearedLastTrial;
                newChar.hasClearedFinalTrial = sComp.hasClearedFinalTrial;
                newChar.firstTrialCleared = sComp.firstTrialCleared;
                newChar.secondTrialCleared = sComp.secondTrialCleared;
                newChar.lastTrialCleared = sComp.lastTrialCleared;
                newChar.finalTrialCleared = sComp.finalTrialCleared;

                newChar.combatStyle = sComp.combatStyle;
                newChar.targetCombatStyle = sComp.targetCombatStyle;
                newChar.combatStyleProgress = sComp.combatStyleProgress ? JSON.parse(JSON.stringify(sComp.combatStyleProgress)) : {};
                newChar.unlockedCombatStyles = sComp.unlockedCombatStyles ? [...sComp.unlockedCombatStyles] : [];

                newChar.professions = sComp.professions ? JSON.parse(JSON.stringify(sComp.professions)) : character.professions;
                newChar.availableTitles = sComp.availableTitles ? [...sComp.availableTitles] : [];
                newChar.equippedTitleId = sComp.equippedTitleId;

                if (sComp.socialNetwork) {
                    newChar.socialNetwork = JSON.parse(JSON.stringify(sComp.socialNetwork));
                }
                if (sComp.memories) {
                    newChar.memories = [...sComp.memories];
                }
                
                const remainingCompanions = (newChar.companions || []).filter(c => c.id !== successorId);
                const remainingInactive = (newChar.inactiveCompanions || []).filter(c => c.id !== successorId);

                const { updatedCompanions, updatedInactiveCompanions } = remapCompanionRelationships(
                    remainingCompanions,
                    remainingInactive,
                    successorId,
                    character.name,
                    sComp.name,
                    undefined,
                    sComp
                );
                newChar.companions = updatedCompanions;
                newChar.inactiveCompanions = updatedInactiveCompanions;
            } else {
                const targetComp = allCompanionsRaw.find(c => c.id === selectedTargetId)!;
                logMsg = `[차원 전송] 동료 '${targetComp.name}'의 소환 공유링크를 구글 드라이브에 등록하고 차원의 틈새로 보냈습니다.`;
                
                newChar.companions = newChar.companions.filter(c => c.id !== selectedTargetId);
                if (newChar.inactiveCompanions) {
                    newChar.inactiveCompanions = newChar.inactiveCompanions.filter(c => c.id !== selectedTargetId);
                }
            }

            onUpdateCharacter(newChar, logMsg);
            setSummonCode(driveLink);
            setSuccessorId(null);
            
            setResultData({
                type: 'success',
                title: '구글 드라이브 연동 완료',
                message: selectedTargetId === 'player' 
                    ? `플레이어 캐릭터가 클라우드를 넘어 차원의 건너편으로 떠났습니다. 이제 새로운 가주와 함께 세계를 탐험하십시오.`
                    : `동료의 소환 파일이 구글 드라이브에 등록되었습니다. 공유 링크를 복사하여 공유하십시오.`,
                items: [
                    { label: '구글 공유 링크', after: '발급 완료' },
                    { label: '소모 마정석', after: `-${crystalCost}` },
                    { label: '획득 골드', after: `+${goldCost.toLocaleString()} G` }
                ]
            });
        } catch (e: any) {
            console.error(e);
            alert("구글 드라이브 등록 중 오류가 발생했습니다.");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleCopy = () => {
        if (!summonCode) return;
        navigator.clipboard.writeText(summonCode);
        setCopyFeedback(true);
        setTimeout(() => setCopyFeedback(false), 2000);
    };

    const handleCopyFull = () => {
        if (!rawFullCode) return;
        navigator.clipboard.writeText(rawFullCode);
        setFullCopyFeedback(true);
        setTimeout(() => setFullCopyFeedback(false), 2000);
    };

    const handleCopyDriveLink = () => {
        if (!driveShareLink) return;
        navigator.clipboard.writeText(driveShareLink);
        setDriveCopyFeedback(true);
        setTimeout(() => setDriveCopyFeedback(false), 2000);
    };

    // --- IMPORT: 타인의 숏코드 또는 전체 코드로 소환 및 영입 ---
    const handlePreview = async () => {
        const rawInput = importInput.trim();
        if (!rawInput) return;

        setIsProcessing(true);
        setLoadingMessage('소환 데이터 조회 중...');

        try {
            let resolvedBase64 = '';

            // 구글 드라이브 공유 링크인지 여부 판별
            if (rawInput.includes('drive.google.com') || rawInput.includes('docs.google.com')) {
                setLoadingMessage('구글 드라이브에서 소환 데이터 로드 중...');
                resolvedBase64 = await fetchFileContentFromUrl(driveToken || '', rawInput);
            } else {
                resolvedBase64 = await resolveDimensionCode(rawInput);
            }

            const result = parseSummonCode(resolvedBase64);
            
            if (character.usedDimensionCodes?.includes(result.id)) {
                alert("이미 사용되었거나 본인이 발급한 소환코드입니다.");
                setIsProcessing(false);
                return;
            }

            setPreviewTarget(result.companion);
            setPreviewId(result.id);
            setSummonedTarget(null);
        } catch (e: any) {
            alert(e.message || "유효하지 않은 링크 또는 코드입니다.");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleSummonAttempt = () => {
        if (!previewTarget || !previewId) return;

        const level = previewTarget.level;
        const crystalCostSummon = 10 * level;
        const goldCostSummon = 2000 * level;
        
        const hasCrystal = (character.base?.resources.manaCrystal || 0) >= crystalCostSummon;
        const hasGold = character.money >= goldCostSummon;

        if (!hasCrystal || !hasGold ) {
            setResultData({
                type: 'warning',
                title: '소환 자원 부족',
                message: '차원의 문을 열기 위한 자원이 부족합니다.',
                items: [
                    { label: '필요 마정석', after: `${crystalCostSummon.toLocaleString()} (보유: ${character.base?.resources.manaCrystal || 0})` },
                    { label: '필요 골드', after: `${goldCostSummon.toLocaleString()} G` },
                ]
            });
            return;
        }

        setIsProcessing(true);
        setLoadingMessage('차원의 균열 개방 중...');
        setTimeout(() => {
            const newChar = { ...character };
            newChar.money -= goldCostSummon;
            if (newChar.base) newChar.base.resources.manaCrystal -= crystalCostSummon;

            newChar.usedDimensionCodes = [...(newChar.usedDimensionCodes || []), previewId];

            onUpdateCharacter(newChar, `[차원 소환] 차원의 균열을 열어 '${previewTarget.name}'을(를) 현신시켰습니다!`);
            setSummonedTarget(previewTarget);
            setResultData({
                type: 'success',
                title: '소환 성공!',
                message: `${previewTarget.name}이(가) 차원을 넘어 현신했습니다.\n이제 추가 비용을 지불하고 정식 대원으로 영입할 수 있습니다.`,
                items: [
                    { label: '소환 대상', after: previewTarget.name },
                    { label: '레벨', after: `Lv.${previewTarget.level}` }
                ]
            });
            setIsProcessing(false);
        }, 1200);
    };

    const handleRecruitFinal = () => {
        if (!summonedTarget) return;
        const recruitCost = 2000 * summonedTarget.level;
        
        const lightRequired = summonedTarget.level >= 1000 ? 3 : summonedTarget.level >= 500 ? 1 : 0;
        const lightOwned = character.inventory.filter(
            i => i.name === "태초의 빛" && i.rarity === ItemRarity.MYTHTIC
        ).length;

        if (character.money < recruitCost || lightOwned < lightRequired) {
            setResultData({
                type: 'warning',
                title: '영입 자원 부족',
                message: lightRequired > 0
                    ? `Lv.${summonedTarget.level} 이상의 차원 영웅은 태초의 빛 ${lightRequired}개가 추가로 필요합니다.`
                    : '차원 영웅을 정식으로 영입하기 위한 계약금이 부족합니다.',
                items: [
                    { label: '필요 골드', after: `${recruitCost.toLocaleString()} G` },
                    ...(lightRequired > 0 ? [{ label: '태초의 빛', after: `${lightRequired}개 (보유: ${lightOwned})` }] : [])
                ]
            });
            return;
        }

        const newChar = { ...character };
        newChar.money -= recruitCost;
        if (lightRequired > 0) {
            let removed = 0;
            newChar.inventory = newChar.inventory.filter(i => {
                if (
                    removed < lightRequired &&
                    i.name === "태초의 빛" &&
                    i.rarity === ItemRarity.MYTHTIC
                ) {
                    removed++;
                    return false;
                }
                return true;
            });
        }
        const finalComp = assignRandomCombatStyle({ ...summonedTarget });
        
        if (newChar.companions.length < 5) {
            newChar.companions.push(finalComp);
        } else {
            if (!newChar.inactiveCompanions) newChar.inactiveCompanions = [];
            newChar.inactiveCompanions.push(finalComp);
        }

        onUpdateCharacter(newChar, `[차원 합류] '${finalComp.name}'을(를) 정식 대원으로 영입했습니다. (-${recruitCost.toLocaleString()} G)`);
        setResultData({
            type: 'levelup',
            title: '차원 영웅 영입 완료',
            message: `${finalComp.name}이(가) 당신의 파티에 합류했습니다.`,
            items: [{ label: '영입 비용', after: `${recruitCost.toLocaleString()} G` }]
        });
        setSummonedTarget(null);
        setPreviewTarget(null);
        setPreviewId(null);
        setImportInput('');
    };

    const isShortCode = summonCode && summonCode.startsWith('SM-');

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/90 backdrop-blur-sm p-2 sm:p-4 animate-in fade-in">
            {resultData && <ActionResultModal data={resultData} onClose={() => setResultData(null)} />}
            
            <div className="bg-slate-900 border-2 border-indigo-500 w-full max-w-lg rounded-2xl sm:rounded-[2rem] shadow-[0_0_80px_rgba(99,102,241,0.3)] flex flex-col overflow-hidden relative max-h-[92vh]">
                
                {/* Header */}
                <div className="p-3 sm:p-5 border-b border-indigo-900/50 bg-indigo-950/20 flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-2.5 sm:gap-3">
                        <div className="p-2 bg-indigo-600 rounded-xl text-white shadow-lg shrink-0">
                            <UserPlus size={18} className="animate-pulse sm:w-5 sm:h-5" />
                        </div>
                        <div>
                            <h2 className="text-base sm:text-lg font-bold text-white font-cinzel tracking-wider">SUMMON CENTER</h2>
                            <p className="text-[9px] sm:text-[10px] text-indigo-400 font-bold uppercase tracking-widest">차원 드라이브 & 영웅 소환</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-slate-500 hover:text-white p-1.5 rounded-full hover:bg-slate-800 transition-colors">
                        <X size={18} className="sm:w-5 sm:h-5"/>
                    </button>
                </div>

                {/* Google Drive Control Panel */}
                <div className="p-3 bg-slate-950 border-b border-slate-850 shrink-0">
                    <GoogleDriveAuthPanel onAuthChange={(token) => setDriveToken(token)} />
                </div>

                {/* Tabs */}
                <div className="flex bg-slate-950 border-b border-slate-800 shrink-0">
                    <button 
                        onClick={() => setActiveTab('export')} 
                        className={`flex-1 py-3 sm:py-3.5 text-xs font-bold transition-all border-b-2 flex items-center justify-center gap-1.5 ${activeTab === 'export' ? 'text-amber-400 border-amber-500 bg-slate-900' : 'text-slate-500 border-transparent hover:text-slate-300'}`}
                    >
                        <Sparkles size={14}/> 구글 드라이브에 등록
                    </button>
                    <button 
                        onClick={() => setActiveTab('import')} 
                        className={`flex-1 py-3 sm:py-3.5 text-xs font-bold transition-all border-b-2 flex items-center justify-center gap-1.5 ${activeTab === 'import' ? 'text-indigo-400 border-indigo-500 bg-slate-900' : 'text-slate-500 border-transparent hover:text-slate-300'}`}
                    >
                        <Globe size={14}/> 차원 소환
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-3.5 sm:p-6 space-y-4">
                    {activeTab === 'export' ? (
                        <div className="space-y-4 animate-in slide-in-from-left-2">
                            <div className="bg-slate-950/50 p-3 sm:p-4 rounded-xl border border-slate-800">
                                <h3 className="text-xs font-bold text-slate-400 uppercase mb-2.5 flex items-center gap-1.5">
                                    <Users size={14}/> 소환 대상 캐릭터 선택
                                </h3>
                                <div className="space-y-1.5 max-h-36 overflow-y-auto custom-scrollbar pr-1">
                                    {allPotentials.map(p => (
                                        <button 
                                            key={p.id}
                                            onClick={() => { setSelectedTargetId(p.id); setSummonCode(''); setRawFullCode(''); setDriveShareLink(''); setSuccessorId(null); }}
                                            className={`w-full p-2.5 rounded-xl border text-left flex justify-between items-center transition-all ${selectedTargetId === p.id ? 'bg-amber-900/40 border-amber-500 shadow-md' : 'bg-slate-900 border-slate-800 hover:border-slate-700'}`}
                                        >
                                            <div className="min-w-0">
                                                <div className="font-bold text-white truncate text-xs sm:text-sm">{p.name}</div>
                                                <div className="text-[10px] text-slate-400">{p.shinryoku} | Lv.{p.level}</div>
                                            </div>
                                            {selectedTargetId === p.id && <CheckCircle size={15} className="text-amber-400 shrink-0"/>}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {selectedTargetId === 'player' && !summonCode && (
                                <div className="bg-red-900/10 p-3 sm:p-4 rounded-xl border border-red-500/30 animate-in slide-in-from-top-2">
                                    <h3 className="text-xs font-bold text-red-400 uppercase mb-1.5 flex items-center gap-1.5">
                                        <Crown size={14}/> 계승자 선택 (플레이어 대행)
                                    </h3>
                                    <p className="text-[10px] text-slate-400 mb-2">플레이어가 차원을 떠난 후 이 동료가 새로운 가주가 됩니다.</p>
                                    <div className="space-y-1.5 max-h-32 overflow-y-auto custom-scrollbar pr-1">
                                        {allCompanionsRaw.map(c => (
                                            <button 
                                                key={`successor-${c.id}`}
                                                onClick={() => setSuccessorId(c.id)}
                                                className={`w-full p-2.5 rounded-xl border text-left flex justify-between items-center transition-all ${successorId === c.id ? 'bg-red-900/30 border-red-500 shadow-md' : 'bg-slate-950 border-slate-800 hover:border-slate-700'}`}
                                            >
                                                <div className="min-w-0">
                                                    <div className="font-bold text-white truncate text-xs">{c.name}</div>
                                                    <div className="text-[9px] text-slate-400 uppercase">{c.classType} | Lv.{c.level}</div>
                                                </div>
                                                {successorId === c.id && <ShieldCheck size={15} className="text-red-400 shrink-0"/>}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {!summonCode ? (
                                <div className="space-y-3">
                                    <div className="bg-slate-950 p-3 rounded-xl border border-amber-900/30">
                                        <div className="flex justify-between text-xs">
                                            <span className="text-slate-400">마정석 (Lv * 10)</span>
                                            <span className={(character.base?.resources.manaCrystal || 0) >= crystalCost ? 'text-purple-400 font-bold' : 'text-red-500 font-bold'}>
                                                {crystalCost} / {character.base?.resources.manaCrystal || 0}
                                            </span>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={handleGenerate} 
                                        disabled={isProcessing || !hasResources || (selectedTargetId === 'player' && !successorId)}
                                        className="w-full py-4 bg-slate-800 hover:bg-amber-900/30 border border-slate-700 hover:border-amber-500 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg disabled:opacity-30 cursor-pointer"
                                    >
                                        {isProcessing ? <Loader2 size={18} className="animate-spin text-amber-400" /> : <Sparkles size={18} className="text-amber-400"/>}
                                        <span className="font-bold text-xs sm:text-sm text-slate-200">
                                            {isProcessing ? loadingMessage : '구글 드라이브에 등록'}
                                        </span>
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-3 animate-in zoom-in-95">
                                    {/* 구글 드라이브 링크 출력 영역 */}
                                    {driveShareLink && (
                                        <div className="bg-slate-950 p-4 rounded-2xl border border-indigo-500/50 text-center space-y-2">
                                            <div className="flex items-center justify-center gap-1.5 text-[10px] text-indigo-400 font-black">
                                                <Link size={12} /> 구글 드라이브 공유 링크
                                            </div>
                                            <div className="text-xs font-mono text-indigo-300 break-all select-all py-1.5 px-2 bg-slate-900 rounded-lg border border-slate-800">
                                                {driveShareLink}
                                            </div>
                                            <button 
                                                onClick={handleCopyDriveLink}
                                                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl flex items-center justify-center gap-1.5 text-xs transition-colors"
                                            >
                                                {driveCopyFeedback ? <CheckCircle size={14} className="text-green-300"/> : <Copy size={14}/>}
                                                <span>{driveCopyFeedback ? '공유 링크 복사 완료!' : '구글 드라이브 공유링크 복사'}</span>
                                            </button>
                                        </div>
                                    )}

                                    {/* 기존 전체 코드 토글 아코디언 */}
                                    {rawFullCode && (
                                        <div className="bg-slate-950/80 rounded-xl border border-slate-800 p-3 space-y-2">
                                            <button 
                                                onClick={() => setShowFullCode(!showFullCode)} 
                                                className="w-full flex justify-between items-center text-xs font-bold text-slate-300 hover:text-white"
                                            >
                                                <span className="flex items-center gap-1.5"><FileText size={13} className="text-indigo-400"/> 기존 전체 코드 (Base64 원본)</span>
                                                {showFullCode ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
                                            </button>
                                            {showFullCode && (
                                                <div className="space-y-2 animate-in fade-in pt-1">
                                                    <textarea 
                                                        readOnly 
                                                        value={rawFullCode} 
                                                        className="w-full h-20 bg-slate-900 border border-slate-800 rounded-lg p-2 text-[10px] text-slate-400 font-mono resize-none focus:outline-none"
                                                    />
                                                    <button 
                                                        onClick={handleCopyFull} 
                                                        className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all"
                                                    >
                                                        {fullCopyFeedback ? <CheckCircle size={14} className="text-green-400"/> : <Copy size={14}/>}
                                                        {fullCopyFeedback ? '전체 코드 복사 완료!' : '기존 전체 코드 복사'}
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    <button 
                                        onClick={() => { setSummonCode(''); setRawFullCode(''); setDriveShareLink(''); setShowFullCode(false); }} 
                                        className="w-full py-1.5 text-[11px] text-slate-500 hover:text-slate-300 underline text-center"
                                    >
                                        새로 발급하기
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-4 animate-in slide-in-from-right-2">
                            {!previewTarget ? (
                                <div className="space-y-3">
                                    <div className="relative">
                                        <input 
                                            type="text"
                                            value={importInput} 
                                            onChange={(e) => setImportInput(e.target.value)} 
                                            placeholder="상대방의 구글 드라이브 공유 링크를 입력..." 
                                            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-3 text-xs sm:text-sm text-indigo-300 font-mono focus:border-indigo-500 outline-none transition-all shadow-inner" 
                                        />
                                        <ClipboardPaste size={16} className="absolute right-3.5 top-3.5 text-slate-600" />
                                    </div>
                                    <button 
                                        onClick={handlePreview} 
                                        disabled={isProcessing}
                                        className="w-full py-3.5 bg-indigo-700 hover:bg-indigo-600 text-white font-bold rounded-xl shadow-xl flex items-center justify-center gap-2 transition-all cursor-pointer"
                                    >
                                        {isProcessing ? <Loader2 size={16} className="animate-spin" /> : <Globe size={16}/>}
                                        <span className="text-xs sm:text-sm">{isProcessing ? loadingMessage : '소환 영웅 확인하기'}</span>
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-4 animate-in zoom-in-95">
                                    <div className="bg-slate-950 p-4 rounded-2xl border border-indigo-500/40">
                                        <div className="flex items-center gap-3">
                                            <div className="w-12 h-12 rounded-xl bg-slate-900 border border-indigo-500/50 flex items-center justify-center shrink-0">
                                                <User size={24} className="text-indigo-400"/>
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <div className="text-base font-bold text-white flex items-center gap-1.5 truncate">
                                                    {previewTarget.name}
                                                    <span className="text-xs text-amber-400 font-normal">Lv.{previewTarget.level}</span>
                                                </div>
                                                <div className="text-xs text-indigo-300 font-bold">{previewTarget.classType} | {previewTarget.shinryokuType || '미개방'}</div>
                                            </div>
                                        </div>

                                        {/* Status preview */}
                                        <div className="grid grid-cols-3 gap-1.5 mt-3 pt-3 border-t border-slate-800/80 text-center">
                                            <div className="bg-slate-900/60 p-1.5 rounded-lg border border-slate-800">
                                                <span className="text-[9px] text-slate-500 block">근력</span>
                                                <span className="text-xs font-bold text-slate-200">{previewTarget.stats?.str || 10}</span>
                                            </div>
                                            <div className="bg-slate-900/60 p-1.5 rounded-lg border border-slate-800">
                                                <span className="text-[9px] text-slate-500 block">민첩</span>
                                                <span className="text-xs font-bold text-slate-200">{previewTarget.stats?.agi || 10}</span>
                                            </div>
                                            <div className="bg-slate-900/60 p-1.5 rounded-lg border border-slate-800">
                                                <span className="text-[9px] text-slate-500 block">지능</span>
                                                <span className="text-xs font-bold text-slate-200">{previewTarget.stats?.wis || 10}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {!summonedTarget ? (
                                        <div className="space-y-3">
                                            <div className="bg-slate-950 p-3 rounded-xl border border-indigo-900/40 text-xs flex justify-between items-center">
                                                <span className="text-slate-400">소환 소모 자원</span>
                                                <span className="font-bold text-amber-400">
                                                    {(2000 * previewTarget.level).toLocaleString()} G / 마정석 {10 * previewTarget.level}개
                                                </span>
                                            </div>
                                            <div className="flex gap-2">
                                                <button 
                                                    onClick={() => { setPreviewTarget(null); setPreviewId(null); }}
                                                    className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs transition-all"
                                                >
                                                    취소
                                                </button>
                                                <button 
                                                    onClick={handleSummonAttempt}
                                                    disabled={isProcessing}
                                                    className="flex-[2] py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs shadow-lg flex items-center justify-center gap-1.5 transition-all"
                                                >
                                                    {isProcessing ? <Loader2 size={15} className="animate-spin"/> : <Sparkles size={15}/>}
                                                    <span>차원의 균열 열기</span>
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            <div className="bg-emerald-950/40 p-3 rounded-xl border border-emerald-500/40 text-center">
                                                <span className="text-xs font-bold text-emerald-400 block mb-1">현신 완료!</span>
                                                <span className="text-[11px] text-slate-300">정식 계약을 체결하여 아군 파티에 합류시키십시오.</span>
                                            </div>
                                            <button 
                                                onClick={handleRecruitFinal}
                                                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all cursor-pointer"
                                            >
                                                <ShieldCheck size={16}/>
                                                <span className="text-xs sm:text-sm">정식 대원으로 영입하기</span>
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-2.5 sm:p-3 bg-slate-950 border-t border-slate-800 flex justify-between items-center text-[10px] text-slate-500 font-bold px-4 shrink-0">
                    <div className="flex gap-3">
                        <span className="flex items-center gap-1"><Coins size={11} className="text-amber-500"/> {character.money.toLocaleString()} G</span>
                        <span className="flex items-center gap-1"><Zap size={11} className="text-purple-500"/> {character.base?.resources.manaCrystal || 0}개</span>
                    </div>
                    <span className="text-indigo-400">구글 드라이브 클라우드 영웅 소환</span>
                </div>
            </div>
        </div>
    );
};

export default CommunicationSummonModal;
