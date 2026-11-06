import React, { useState, useEffect } from 'react';
import { Character, Enemy } from '../types';
import { X, Sword, Copy, ClipboardPaste, ShieldAlert, Loader2, Zap, CheckCircle, Coins, Sparkles, FileText, ChevronDown, ChevronUp, Link } from 'lucide-react';
import { generateBattleCode, parseBattleCode } from '../utils';
import { publishDimensionShare, resolveDimensionCode } from '../services/dimensionShareService';
import { GoogleDriveAuthPanel } from './GoogleDriveAuthPanel';
import { findOrCreateAppFolder, uploadTextFileToFolder, shareFileWithAnyone, getFileWebViewLink, fetchFileContentFromUrl, getCachedAccessToken } from '../services/googleDriveService';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    character: Character;
    onStartBattle: (enemies: Enemy[], code: string) => void;
    onUpdateCharacter: (newChar: Character, logMsg: string) => void;
}

const CommunicationBattleModal: React.FC<Props> = ({ isOpen, onClose, character, onStartBattle, onUpdateCharacter }) => {
    const [activeTab, setActiveTab] = useState<'export' | 'import'>('export');
    const [battleCode, setBattleCode] = useState('');
    const [rawFullCode, setRawFullCode] = useState('');
    const [showFullCode, setShowFullCode] = useState(false);
    const [importInput, setImportInput] = useState('');
    const [copyFeedback, setCopyFeedback] = useState(false);
    const [fullCopyFeedback, setFullCopyFeedback] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('배틀코드 생성 중...');
    
    // 구글 드라이브 관련 상태
    const [driveToken, setDriveToken] = useState<string | null>(() => getCachedAccessToken());
    const [driveShareLink, setDriveShareLink] = useState('');
    const [driveCopyFeedback, setDriveCopyFeedback] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setDriveToken(getCachedAccessToken());
        }
    }, [isOpen]);

    const BATTLE_GOLD_COST = 10000;
    const BATTLE_CRYSTAL_COST = 5;
    const EXPORT_CRYSTAL_COST = Math.max(1, character.level);

    if (!isOpen) return null;

    const handleGenerate = async () => {
        const currentCrystals = character.base?.resources.manaCrystal || 0;
        if (currentCrystals < EXPORT_CRYSTAL_COST) {
            alert(`마정석이 부족합니다. (필요: ${EXPORT_CRYSTAL_COST}개, 보유: ${currentCrystals}개)`);
            return;
        }

        setIsProcessing(true);
        setLoadingMessage('차원 배틀 데이터 생성 중...');
        setDriveShareLink('');

        try {
            // utils.ts의 generateBattleCode로 v3 스냅샷 Base64 생성
            const rawBase64Code = generateBattleCode(character);
            setRawFullCode(rawBase64Code);

            let shortCode = '';
            try {
                // dimensionShareService로 자동 숏코드 발급 (예: BT-XXXXXX)
                setLoadingMessage('차원 숏코드 등록 중...');
                shortCode = await publishDimensionShare('battle', rawBase64Code);
            } catch (err) {
                console.warn('[BattleModal] Firestore 숏코드 등록 실패, 기존 긴 코드로 진행합니다:', err);
                shortCode = '';
            }

            // 구글 드라이브 연동이 켜져 있다면, '신의 사자 RPG' 폴더에 백업 및 공유링크 생성
            let driveLink = '';
            if (driveToken) {
                try {
                    setLoadingMessage('구글 드라이브 폴더 확인 중...');
                    const folderId = await findOrCreateAppFolder(driveToken);
                    
                    setLoadingMessage('배틀 데이터 파일 업로드 중...');
                    const dateStr = character.currentDate || new Date().toISOString().split('T')[0];
                    const fileName = `${character.name}_배틀코드_${dateStr}.txt`;
                    const fileId = await uploadTextFileToFolder(driveToken, folderId, fileName, rawBase64Code);
                    
                    setLoadingMessage('누구나 읽기 권한 공유 설정 중...');
                    await shareFileWithAnyone(driveToken, fileId);
                    
                    setLoadingMessage('공유 링크 생성 중...');
                    driveLink = await getFileWebViewLink(driveToken, fileId);
                    setDriveShareLink(driveLink);
                } catch (driveErr: any) {
                    console.error('[BattleModal] 구글 드라이브 처리 실패:', driveErr);
                    alert(`구글 드라이브 업로드 중 오류가 발생했으나 배틀코드는 정상 발급되었습니다.\n사유: ${driveErr.message}`);
                }
            }

            const newChar = { ...character };
            if (newChar.base) {
                newChar.base.resources.manaCrystal -= EXPORT_CRYSTAL_COST;
            }
            // 발급된 코드 ID를 파싱해서 usedDimensionCodes에 추가하여 본인 코드 결투 방지
            const parsedData = parseBattleCode(rawBase64Code);
            newChar.usedDimensionCodes = [...(newChar.usedDimensionCodes || []), parsedData.id];
            
            const displayCode = shortCode || rawBase64Code;
            
            let logMsg = `[차원 배틀] 마정석 ${EXPORT_CRYSTAL_COST}개를 소모하여 배틀 코드(${shortCode ? shortCode : '기존 전체코드'})를 발급했습니다.`;
            if (driveLink) {
                logMsg += ` (구글 드라이브에도 백업 완료)`;
            }
            onUpdateCharacter(newChar, logMsg);
            setBattleCode(displayCode);
        } catch (e: any) {
            console.error(e);
            alert("배틀코드 생성 중 오류가 발생했습니다.");
        } finally {
            setIsProcessing(false);
            setLoadingMessage('배틀코드 생성 중...');
        }
    };

    const handleCopy = () => {
        if (!battleCode) return;
        navigator.clipboard.writeText(battleCode);
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

    const handleChallenge = async () => {
        const rawInput = importInput.trim();
        if (!rawInput) return alert("상대방의 배틀 숏코드, 전체 코드 또는 구글 드라이브 공유 링크를 입력해주세요.");
        
        const currentCrystals = character.base?.resources.manaCrystal || 0;
        if (character.money < BATTLE_GOLD_COST || currentCrystals < BATTLE_CRYSTAL_COST) {
            alert(`자금이 부족합니다. 차원 결투에는 ${BATTLE_GOLD_COST.toLocaleString()}골드와 마정석 ${BATTLE_CRYSTAL_COST}개가 필요합니다.`);
            return;
        }

        setIsProcessing(true);
        setLoadingMessage('차원 데이터 분석 및 동기화 중...');

        try {
            let targetBase64 = '';

            // 만약 구글 드라이브 주소(drive.google.com 또는 docs.google.com)가 감지되면
            if (rawInput.includes('drive.google.com') || rawInput.includes('docs.google.com')) {
                if (!driveToken) {
                    // 구글 드라이브 공유 파일 다운로드 시 로그인이 되어 있으면 더 정확합니다.
                    // 만약 로그인이 없어도 퍼블릭 API 등으로 시도할 수는 있지만, 드라이브 연동을 통해 토큰을 획득하는 것을 안내합니다.
                    const confirmLogin = window.confirm('입력하신 링크는 구글 드라이브 파일입니다.\n구글 드라이브 연동 데이터 다운로드를 위해 먼저 구글 계정 연결을 진행하시겠습니까?');
                    if (confirmLogin) {
                        setIsProcessing(false);
                        return;
                    }
                }
                setLoadingMessage('구글 드라이브에서 데이터 다운로드 중...');
                targetBase64 = await fetchFileContentFromUrl(driveToken || '', rawInput);
            } else {
                // 숏코드 또는 일반 Base64 코드 분석
                targetBase64 = await resolveDimensionCode(rawInput);
            }

            const result = parseBattleCode(targetBase64);
            
            if (character.usedDimensionCodes?.includes(result.id)) {
                alert("이미 사용되었거나 본인이 발급한 코드입니다. 다른 사자의 코드를 입력하십시오.");
                setIsProcessing(false);
                return;
            }

            const newChar = { ...character };
            newChar.money -= BATTLE_GOLD_COST;
            if (newChar.base) {
                newChar.base.resources.manaCrystal -= BATTLE_CRYSTAL_COST;
            }
            newChar.usedDimensionCodes = [...(newChar.usedDimensionCodes || []), result.id];

            onUpdateCharacter(newChar, `[차원 배틀] 중개료 ${BATTLE_GOLD_COST.toLocaleString()}G와 마정석 ${BATTLE_CRYSTAL_COST}개를 지불하고 차원 결투를 시작합니다.`);
            onStartBattle(result.enemies, targetBase64);
            onClose();
        } catch (e: any) {
            console.error(e);
            alert(e.message || "코드를 분석할 수 없습니다. 올바른 링크 또는 전체 코드가 맞는지 확인하세요.");
        } finally {
            setIsProcessing(false);
        }
    };

    const isShortCode = battleCode && battleCode.startsWith('BT-');

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/90 backdrop-blur-md p-2 sm:p-4 animate-in fade-in">
            <div className="bg-slate-900 border-2 border-red-600 w-full max-w-lg rounded-2xl sm:rounded-[2rem] shadow-[0_0_50px_rgba(220,38,38,0.3)] flex flex-col relative overflow-hidden max-h-[92vh]">
                {/* Header */}
                <div className="p-3 sm:p-5 border-b border-red-900/50 bg-red-950/20 flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-2.5 sm:gap-3">
                        <div className="p-2 bg-red-600 rounded-xl text-white shadow-lg shrink-0">
                            <Sword size={18} className="animate-pulse sm:w-5 sm:h-5" />
                        </div>
                        <div>
                            <h2 className="text-base sm:text-lg font-bold text-white font-cinzel tracking-wider">BATTLE CENTER</h2>
                            <p className="text-[9px] sm:text-[10px] text-red-400 font-bold uppercase tracking-widest">차원 드라이브 & 결투 연동</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-slate-500 hover:text-white p-1.5 rounded-full hover:bg-slate-800 transition-colors">
                        <X size={18} className="sm:w-5 sm:h-5"/>
                    </button>
                </div>

                {/* Google Drive Auth Panel inside modal header area */}
                <div className="p-3 bg-slate-950 border-b border-slate-850 shrink-0">
                    <GoogleDriveAuthPanel onAuthChange={(token) => setDriveToken(token)} />
                </div>

                {/* Tabs */}
                <div className="flex bg-slate-950 border-b border-slate-800 shrink-0">
                    <button 
                        onClick={() => setActiveTab('export')} 
                        className={`flex-1 py-3 sm:py-3.5 text-xs font-bold transition-all border-b-2 flex items-center justify-center gap-1.5 ${activeTab === 'export' ? 'text-amber-400 border-amber-500 bg-slate-900' : 'text-slate-500 border-transparent hover:text-slate-300'}`}
                    >
                        <Zap size={14}/> 내 배틀코드 발급
                    </button>
                    <button 
                        onClick={() => setActiveTab('import')} 
                        className={`flex-1 py-3 sm:py-3.5 text-xs font-bold transition-all border-b-2 flex items-center justify-center gap-1.5 ${activeTab === 'import' ? 'text-red-400 border-red-500 bg-slate-900' : 'text-slate-500 border-transparent hover:text-slate-300'}`}
                    >
                        <Sword size={14}/> 결투 신청
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-3.5 sm:p-6 space-y-4">
                    {activeTab === 'export' ? (
                        <div className="space-y-4 animate-in slide-in-from-left-2">
                            <p className="text-[11px] text-slate-400 text-center leading-relaxed">
                                "구글 드라이브 연결 시 내 배틀 정보가 구글 클라우드에 텍스트 파일로 저장되며 공유 가능한 링크가 생성됩니다."
                            </p>
                            
                            {!battleCode ? (
                                <div className="space-y-3">
                                    <div className="bg-slate-950 p-3 sm:p-4 rounded-xl border border-amber-900/30">
                                        <div className="flex justify-between text-xs">
                                            <span className="text-slate-400">발급 소모 마정석 (Lv * 1)</span>
                                            <span className={(character.base?.resources.manaCrystal || 0) >= EXPORT_CRYSTAL_COST ? 'text-purple-400 font-bold' : 'text-red-500 font-bold'}>
                                                {EXPORT_CRYSTAL_COST} / {character.base?.resources.manaCrystal || 0}
                                            </span>
                                        </div>
                                    </div>

                                    <button 
                                        onClick={handleGenerate} 
                                        disabled={isProcessing} 
                                        className="w-full py-6 sm:py-8 bg-slate-950 border-2 border-dashed border-red-900/50 rounded-2xl flex flex-col items-center justify-center group hover:border-red-500 transition-all cursor-pointer"
                                    >
                                        {isProcessing ? (
                                            <>
                                                <Loader2 size={24} className="animate-spin text-red-500 mb-2"/>
                                                <span className="text-xs font-bold text-red-400 animate-pulse">{loadingMessage}</span>
                                            </>
                                        ) : (
                                            <>
                                                <Zap size={24} className="text-red-500 group-hover:scale-110 transition-transform mb-1.5"/>
                                                <span className="text-xs sm:text-sm font-bold text-slate-200">구글 드라이브에 등록</span>
                                                <span className="text-[10px] text-slate-500 mt-0.5">
                                                    {driveToken ? '구글 클라우드 자동 공유링크가 발급됩니다' : '기본 간편 숏코드가 발급됩니다'}
                                                </span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-3 animate-in zoom-in-95">
                                    {/* 구글 드라이브 링크가 생성된 경우 */}
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
                                                <span>{driveCopyFeedback ? '구글 드라이브 링크가 복사되었습니다!' : '구글 드라이브 링크 복사하기'}</span>
                                            </button>
                                        </div>
                                    )}

                                    {/* 숏코드 박스 */}
                                    {isShortCode && (
                                        <div className="bg-slate-950 p-4 rounded-2xl border border-red-500/50 text-center space-y-2">
                                            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">간편 배틀 숏코드</span>
                                            <div className="text-2xl sm:text-3xl font-mono font-bold text-amber-400 tracking-widest select-all py-1">
                                                {battleCode}
                                            </div>
                                            <p className="text-[10px] text-slate-500">상대방에게 6자리 숏코드를 전달하면 즉시 결투가 가능합니다.</p>
                                        </div>
                                    )}

                                    {/* 버튼들 */}
                                    {isShortCode && (
                                        <button 
                                            onClick={handleCopy} 
                                            className="w-full py-3 bg-red-700 hover:bg-red-600 active:scale-[0.98] text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg transition-all"
                                        >
                                            {copyFeedback ? <CheckCircle size={16} className="text-green-400"/> : <Copy size={16}/>}
                                            <span className="text-xs">{copyFeedback ? '숏코드가 복사되었습니다!' : '간편 숏코드 복사하기'}</span>
                                        </button>
                                    )}

                                    {/* 기존 전체 코드(Base64) 토글 아코디언 */}
                                    {rawFullCode && (
                                        <div className="bg-slate-950/80 rounded-xl border border-slate-800 p-3 space-y-2">
                                            <button 
                                                onClick={() => setShowFullCode(!showFullCode)} 
                                                className="w-full flex justify-between items-center text-xs font-bold text-slate-300 hover:text-white"
                                            >
                                                <span className="flex items-center gap-1.5"><FileText size={13} className="text-red-400"/> 기존 전체 코드 (Base64 원본)</span>
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
                                        onClick={() => { setBattleCode(''); setRawFullCode(''); setDriveShareLink(''); setShowFullCode(false); }} 
                                        className="w-full py-1.5 text-[11px] text-slate-500 hover:text-slate-300 underline text-center"
                                    >
                                        새로 발급하기
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-3.5 animate-in slide-in-from-right-2">
                            <div className="relative">
                                <input 
                                    type="text"
                                    value={importInput} 
                                    onChange={(e) => setImportInput(e.target.value)} 
                                    placeholder="상대방의 구글드라이브 공유 링크, 숏코드, 또는 전체 코드를 입력..." 
                                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-3 text-xs sm:text-sm text-red-300 font-mono focus:border-red-500 outline-none transition-all shadow-inner" 
                                />
                                <ClipboardPaste size={16} className="absolute right-3.5 top-3.5 text-slate-600" />
                            </div>
                            
                            <div className="bg-slate-950 p-3 rounded-xl border border-blue-900/30 shadow-inner">
                                <h4 className="text-[10px] text-blue-400 font-bold uppercase tracking-widest mb-2 flex items-center gap-1.5">
                                    <Zap size={11}/> 결투 입장 비용
                                </h4>
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="bg-slate-900 p-2 rounded-lg border border-slate-800 text-center">
                                        <span className="text-[9px] text-slate-500 block">골드</span>
                                        <span className={`text-xs font-bold ${character.money >= BATTLE_GOLD_COST ? 'text-amber-400' : 'text-red-500'}`}>
                                            {BATTLE_GOLD_COST.toLocaleString()} G
                                        </span>
                                    </div>
                                    <div className="bg-slate-900 p-2 rounded-lg border border-slate-800 text-center">
                                        <span className="text-[9px] text-slate-500 block">마정석</span>
                                        <span className={`text-xs font-bold ${(character.base?.resources.manaCrystal || 0) >= BATTLE_CRYSTAL_COST ? 'text-purple-400' : 'text-red-500'}`}>
                                            {BATTLE_CRYSTAL_COST}개
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-red-900/10 p-2.5 rounded-xl border border-red-900/30 flex items-start gap-2">
                                <ShieldAlert size={15} className="text-red-500 shrink-0 mt-0.5" />
                                <div className="text-[10px] text-red-300/90 leading-tight">
                                    구글 드라이브 공유 링크를 붙여넣으면 클라우드로부터 직접 상대방의 전투 캐릭터 데이터를 연동하여 결투를 개시합니다.
                                </div>
                            </div>

                            <button 
                                onClick={handleChallenge} 
                                disabled={isProcessing} 
                                className="w-full py-3.5 bg-red-700 hover:bg-red-600 active:scale-[0.98] text-white font-bold rounded-xl shadow-xl flex items-center justify-center gap-2 transition-all cursor-pointer"
                            >
                                {isProcessing ? <Loader2 size={16} className="animate-spin"/> : <Sword size={16}/>}
                                <span className="text-xs sm:text-sm">{isProcessing ? loadingMessage : '차원 결투 개시'}</span>
                            </button>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-2.5 sm:p-3 bg-slate-950 border-t border-slate-800 flex justify-between items-center text-[10px] text-slate-500 font-bold px-4 shrink-0">
                    <div className="flex gap-3">
                        <span className="flex items-center gap-1"><Coins size={11} className="text-amber-500"/> {character.money.toLocaleString()} G</span>
                        <span className="flex items-center gap-1"><Zap size={11} className="text-purple-500"/> {character.base?.resources.manaCrystal || 0}개</span>
                    </div>
                    <span className="text-indigo-400">구글 드라이브 클라우드 결투 연동</span>
                </div>
            </div>
        </div>
    );
};

export default CommunicationBattleModal;
