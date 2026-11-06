import React, { useState, useEffect } from 'react';
import { Character, Item, ItemRarity } from '../types';
import { X, Package, Zap, Coins, Sparkles, Loader2, Copy, CheckCircle, ClipboardPaste, Send, Minus, Plus, FileText, ChevronDown, ChevronUp, Link } from 'lucide-react';
import { SELL_PRICES } from '../constants';
import { publishDimensionShare, resolveDimensionCode } from '../services/dimensionShareService';
import { compressDataSync, decompressDataSync } from '../utils';
import ActionResultModal, { ResultData } from './ActionResultModal';
import { GoogleDriveAuthPanel } from './GoogleDriveAuthPanel';
import { findOrCreateAppFolder, uploadTextFileToFolder, shareFileWithAnyone, getFileWebViewLink, fetchFileContentFromUrl, getCachedAccessToken } from '../services/googleDriveService';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    character: Character;
    onUpdateCharacter: (newChar: Character, logMsg: string) => void;
}

interface SelectedItem {
    item: Item;
    quantity: number;
    originalIndices: number[];
}

const CommunicationItemModal: React.FC<Props> = ({ isOpen, onClose, character, onUpdateCharacter }) => {
    const [activeTab, setActiveTab] = useState<'export' | 'import'>('export');
    const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
    const [itemCode, setItemCode] = useState('');
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

    const [previewItems, setPreviewItems] = useState<Item[]>([]);
    const [previewId, setPreviewId] = useState<string | null>(null);

    if (!isOpen) return null;

    const getSellValue = (item: Item) => SELL_PRICES[item.rarity] || 0;

    const calculateCosts = (items: SelectedItem[]) => {
        const totalQty = items.reduce((sum, si) => sum + si.quantity, 0);
        const groupCount = items.length;
        const crystalPerUnit = groupCount > 1 ? 10 : 5;
        const crystalCost = totalQty * crystalPerUnit;
        const totalGoldValue = items.reduce((sum, si) => sum + (getSellValue(si.item) * si.quantity), 0);
        return { crystalCost, totalGoldValue };
    };

    const calculateImportCosts = (items: Item[]) => {
        const totalQty = items.length;
        const groupNames = new Set(items.map(i => i.name));
        const crystalPerUnit = groupNames.size > 1 ? 20 : 10;
        const crystalCost = totalQty * crystalPerUnit;
        const totalGoldCost = items.reduce((sum, i) => sum + (getSellValue(i) * 2), 0);
        return { crystalCost, totalGoldCost };
    };

    const getGroupedInventory = () => {
        const grouped: Record<string, { item: Item, indices: number[] }> = {};
        character.inventory.forEach((item, idx) => {
            const key = `${item.name}-${item.rarity}`;
            if (!grouped[key]) grouped[key] = { item, indices: [] };
            grouped[key].indices.push(idx);
        });
        return Object.values(grouped);
    };

    const handleToggleItem = (item: Item, indices: number[]) => {
        const existing = selectedItems.find(si => si.item.name === item.name && si.item.rarity === item.rarity);
        if (existing) {
            setSelectedItems(prev => prev.filter(si => !(si.item.name === item.name && si.item.rarity === item.rarity)));
        } else {
            setSelectedItems(prev => [...prev, { item, quantity: 1, originalIndices: indices }]);
        }
    };

    const handleUpdateQuantity = (name: string, rarity: ItemRarity, delta: number) => {
        setSelectedItems(prev => prev.map(si => {
            if (si.item.name === name && si.item.rarity === rarity) {
                const newQty = Math.max(1, Math.min(si.originalIndices.length, si.quantity + delta));
                return { ...si, quantity: newQty };
            }
            return si;
        }));
    };

    // --- EXPORT logic: 숏코드 및 원본 코드 발급 ---
    const handleGenerateCode = async () => {
        if (selectedItems.length === 0) return;
        const { crystalCost, totalGoldValue } = calculateCosts(selectedItems);
        const currentCrystals = character.base?.resources.manaCrystal || 0;

        if (currentCrystals < crystalCost) {
            alert(`마정석이 부족합니다. (필요: ${crystalCost}개)`);
            return;
        }

        setIsProcessing(true);
        setLoadingMessage('차원 데이터 생성 중...');
        setDriveShareLink('');

        try {
            const codeId = `items_${Date.now()}_${Math.random().toString(36).substring(7)}`;
            const itemsToPack = selectedItems.flatMap(si => Array(si.quantity).fill(si.item));
            const data = { v: 2, id: codeId, items: itemsToPack };
            const rawBase64 = compressDataSync(data);
            setRawFullCode(rawBase64);
            
            let shortCode = '';
            try {
                setLoadingMessage('차원 숏코드 등록 중...');
                shortCode = await publishDimensionShare('item', rawBase64);
            } catch (err) {
                console.warn('[ItemModal] Firestore 숏코드 등록 실패, 원본 코드로 fallback:', err);
                shortCode = '';
            }

            // 구글 드라이브 연동 활성화 상태인 경우 업로드 및 공유링크 획득
            let driveLink = '';
            if (driveToken) {
                try {
                    setLoadingMessage('구글 드라이브 폴더 확인 중...');
                    const folderId = await findOrCreateAppFolder(driveToken);
                    
                    setLoadingMessage('아이템 데이터 파일 업로드 중...');
                    const dateStr = character.currentDate || new Date().toISOString().split('T')[0];
                    const fileName = `${character.name}_아이템코드_${dateStr}.txt`;
                    const fileId = await uploadTextFileToFolder(driveToken, folderId, fileName, rawBase64);
                    
                    setLoadingMessage('누구나 읽기 권한 공유 설정 중...');
                    await shareFileWithAnyone(driveToken, fileId);
                    
                    setLoadingMessage('공유 링크 생성 중...');
                    driveLink = await getFileWebViewLink(driveToken, fileId);
                    setDriveShareLink(driveLink);
                } catch (driveErr: any) {
                    console.error('[ItemModal] 구글 드라이브 처리 실패:', driveErr);
                    alert(`구글 드라이브 업로드 중 오류가 발생했으나 아이템코드는 정상 발급되었습니다.\n사유: ${driveErr.message}`);
                }
            }

            const displayCode = shortCode || rawBase64;
            setItemCode(displayCode);

            const newChar = { ...character };
            newChar.money += totalGoldValue;
            if (newChar.base) {
                newChar.base.resources.manaCrystal -= crystalCost;
            }

            newChar.usedDimensionCodes = [...(newChar.usedDimensionCodes || []), codeId];

            // 인벤토리에서 제거
            const indicesToRemove: number[] = [];
            selectedItems.forEach(si => {
                indicesToRemove.push(...si.originalIndices.slice(0, si.quantity));
            });
            newChar.inventory = newChar.inventory.filter((_, idx) => !indicesToRemove.includes(idx));

            let logMsg = `[차원 전송] 아이템 ${itemsToPack.length}개를 전송 코드(${shortCode ? shortCode : '전체코드'})로 변환했습니다. (+${totalGoldValue.toLocaleString()} G)`;
            if (driveLink) {
                logMsg += ` (구글 드라이브 공유 전송 완료)`;
            }

            onUpdateCharacter(newChar, logMsg);
            
            setResultData({
                type: 'success',
                title: '전송 코드 발급',
                message: '아이템이 차원의 너머로 보내졌습니다. 생성된 공유 링크 또는 숏코드를 공유하십시오.',
                items: [
                    { label: '발급 코드', after: shortCode || '전체코드 발급됨' },
                    { label: '획득 골드', after: `+${totalGoldValue.toLocaleString()} G` },
                    { label: '소모 마정석', after: `-${crystalCost}` }
                ]
            });
            setSelectedItems([]);
        } catch (e: any) {
            console.error(e);
            alert("아이템 코드 발급 중 오류가 발생했습니다.");
        } finally {
            setIsProcessing(false);
        }
    };

    // --- IMPORT logic: 숏코드 또는 전체 코드 수령 ---
    const handlePreviewCode = async () => {
        const rawInput = importInput.trim();
        if (!rawInput) return;

        setIsProcessing(true);
        setLoadingMessage('아이템 데이터 분석 중...');

        try {
            let resolvedBase64 = '';

            // 구글 드라이브 주소 검출
            if (rawInput.includes('drive.google.com') || rawInput.includes('docs.google.com')) {
                setLoadingMessage('구글 드라이브에서 아이템 데이터 로드 중...');
                resolvedBase64 = await fetchFileContentFromUrl(driveToken || '', rawInput);
            } else {
                resolvedBase64 = await resolveDimensionCode(rawInput);
            }

            const data = decompressDataSync(resolvedBase64);
            
            if (character.usedDimensionCodes?.includes(data.id)) {
                alert("이미 사용되었거나 본인이 발급한 아이템 코드입니다.");
                setIsProcessing(false);
                return;
            }

            setPreviewItems(data.items || []);
            setPreviewId(data.id || null);
        } catch (e) {
            alert("유효하지 않은 링크 또는 코드입니다.");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleSummonItems = () => {
        if (previewItems.length === 0 || !previewId) return;
        const { crystalCost, totalGoldCost } = calculateImportCosts(previewItems);
        const currentCrystals = character.base?.resources.manaCrystal || 0;

        if (currentCrystals < crystalCost || character.money < totalGoldCost) {
            alert(`자원이 부족합니다. (필요: ${totalGoldCost.toLocaleString()} G, 마정석 ${crystalCost}개)`);
            return;
        }

        if (character.inventory.length + previewItems.length > 100) {
            alert("인벤토리 공간이 부족합니다.");
            return;
        }

        setIsProcessing(true);
        setLoadingMessage('아이템 소환 중...');
        setTimeout(() => {
            const newChar = { ...character };
            newChar.money -= totalGoldCost;
            if (newChar.base) {
                newChar.base.resources.manaCrystal -= crystalCost;
            }
            newChar.inventory = [...newChar.inventory, ...previewItems];

            newChar.usedDimensionCodes = [...(newChar.usedDimensionCodes || []), previewId];

            onUpdateCharacter(newChar, `[차원 소환] 코드를 분석하여 아이템 ${previewItems.length}개를 소환했습니다.`);
            setResultData({
                type: 'levelup',
                title: '차원 소환 완료',
                message: '차원의 틈새에서 요청하신 물건들을 성공적으로 가져왔습니다.',
                items: [
                    { label: '소모 골드', after: `-${totalGoldCost.toLocaleString()} G` },
                    { label: '소모 마정석', after: `-${crystalCost}` }
                ]
            });
            setIsProcessing(false);
            setPreviewItems([]);
            setPreviewId(null);
            setImportInput('');
        }, 1000);
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(itemCode);
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

    const exportInfo = calculateCosts(selectedItems);
    const isShortCode = itemCode && itemCode.startsWith('IT-');

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/90 backdrop-blur-md p-2 sm:p-4 animate-in fade-in">
            {resultData && <ActionResultModal data={resultData} onClose={() => setResultData(null)} />}

            <div className="bg-slate-900 border-2 border-amber-500 w-full max-w-lg rounded-2xl sm:rounded-[2rem] shadow-[0_0_80px_rgba(245,158,11,0.2)] flex flex-col overflow-hidden relative max-h-[92vh]">
                
                {/* Header */}
                <div className="p-3 sm:p-5 border-b border-amber-900/50 bg-amber-950/20 flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-2.5 sm:gap-3">
                        <div className="p-2 bg-amber-600 rounded-xl text-white shadow-lg shrink-0">
                            <Package size={18} className="animate-pulse sm:w-5 sm:h-5" />
                        </div>
                        <div>
                            <h2 className="text-base sm:text-lg font-bold text-white font-cinzel tracking-wider">DIMENSION VAULT</h2>
                            <p className="text-[9px] sm:text-[10px] text-amber-400 font-bold uppercase tracking-widest">차원 드라이브 & 금고</p>
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
                        onClick={() => { setActiveTab('export'); setItemCode(''); setRawFullCode(''); setDriveShareLink(''); }} 
                        className={`flex-1 py-3 sm:py-3.5 text-xs font-bold transition-all border-b-2 flex items-center justify-center gap-1.5 ${activeTab === 'export' ? 'text-amber-400 border-amber-500 bg-slate-900' : 'text-slate-500 border-transparent hover:text-slate-300'}`}
                    >
                        <Sparkles size={14}/> 아이템 코드 발급
                    </button>
                    <button 
                        onClick={() => { setActiveTab('import'); setPreviewItems([]); }} 
                        className={`flex-1 py-3 sm:py-3.5 text-xs font-bold transition-all border-b-2 flex items-center justify-center gap-1.5 ${activeTab === 'import' ? 'text-amber-400 border-amber-500 bg-slate-900' : 'text-slate-500 border-transparent hover:text-slate-300'}`}
                    >
                        <Zap size={14}/> 아이템 소환
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-3.5 sm:p-6 space-y-4">
                    {activeTab === 'export' ? (
                        <div className="space-y-4 animate-in slide-in-from-left-2">
                            {!itemCode ? (
                                <>
                                    {/* Item Selector */}
                                    <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-800 space-y-2">
                                        <span className="text-xs font-bold text-slate-400 uppercase">보유 아이템 선택</span>
                                        <div className="space-y-1.5 max-h-36 overflow-y-auto custom-scrollbar pr-1">
                                            {getGroupedInventory().map((group, idx) => {
                                                const isSelected = selectedItems.some(si => si.item.name === group.item.name && si.item.rarity === group.item.rarity);
                                                return (
                                                    <button
                                                        key={idx}
                                                        onClick={() => handleToggleItem(group.item, group.indices)}
                                                        className={`w-full p-2 rounded-xl border text-left transition-all flex justify-between items-center ${isSelected ? 'bg-amber-900/30 border-amber-500 shadow-sm' : 'bg-slate-900 border-slate-800 hover:border-slate-700'}`}
                                                    >
                                                        <div className="min-w-0">
                                                            <div className="font-bold text-white truncate text-xs">{group.item.name}</div>
                                                            <div className="text-[9px] text-slate-400 uppercase">{group.item.rarity} | x{group.indices.length}</div>
                                                        </div>
                                                        {isSelected && <CheckCircle size={14} className="text-amber-400 shrink-0"/>}
                                                    </button>
                                                );
                                            })}
                                            {getGroupedInventory().length === 0 && (
                                                <div className="text-center py-4 text-slate-500 text-xs">보유한 아이템이 없습니다.</div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Selected Qty Controls */}
                                    {selectedItems.length > 0 && (
                                        <div className="space-y-2">
                                            <span className="text-xs font-bold text-slate-400 uppercase">선택된 아이템 수량</span>
                                            <div className="space-y-1.5 max-h-28 overflow-y-auto custom-scrollbar">
                                                {selectedItems.map((si, idx) => (
                                                    <div key={idx} className="bg-slate-950 p-2 rounded-xl border border-slate-800 flex justify-between items-center">
                                                        <div className="min-w-0 pr-2">
                                                            <div className="font-bold text-white text-xs truncate">{si.item.name}</div>
                                                            <div className="text-[9px] text-amber-500">{getSellValue(si.item).toLocaleString()} G</div>
                                                        </div>
                                                        <div className="flex items-center gap-2 bg-slate-900 rounded-lg px-2 py-0.5 border border-slate-800 shrink-0">
                                                            <button onClick={() => handleUpdateQuantity(si.item.name, si.item.rarity, -1)} className="text-slate-400 hover:text-white"><Minus size={11}/></button>
                                                            <span className="text-xs font-bold font-mono text-amber-400 w-4 text-center">{si.quantity}</span>
                                                            <button onClick={() => handleUpdateQuantity(si.item.name, si.item.rarity, 1)} className="text-slate-400 hover:text-white"><Plus size={11}/></button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>

                                            <div className="bg-slate-950 p-3 rounded-xl border border-amber-900/30 flex justify-between items-center text-xs">
                                                <span className="text-slate-400">마정석 소모: <b className="text-purple-400">{exportInfo.crystalCost}</b></span>
                                                <span className="text-slate-400">골드 획득: <b className="text-amber-400">+{exportInfo.totalGoldValue.toLocaleString()} G</b></span>
                                            </div>

                                            <button 
                                                onClick={handleGenerateCode}
                                                disabled={isProcessing}
                                                className="w-full py-3.5 bg-amber-700 hover:bg-amber-600 active:scale-[0.98] text-white font-bold rounded-xl shadow-xl flex items-center justify-center gap-2 transition-all text-xs sm:text-sm cursor-pointer"
                                            >
                                                {isProcessing ? <Loader2 size={16} className="animate-spin" /> : <Send size={16}/>}
                                                구글 드라이브에 등록
                                            </button>
                                        </div>
                                    )}
                                </>
                             ) : (
                                <div className="space-y-3 animate-in zoom-in-95">
                                    {/* 구글 드라이브 공유 링크 영역 */}
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

                                    {/* 숏코드 박스 */}
                                    {isShortCode && (
                                        <div className="bg-slate-950 p-4 rounded-2xl border border-amber-500/50 text-center space-y-2">
                                            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">발급된 아이템 숏코드</span>
                                            <div className="text-2xl sm:text-3xl font-mono font-bold text-amber-400 tracking-widest select-all py-1">
                                                {itemCode}
                                            </div>
                                            <p className="text-[10px] text-slate-500">다른 사자에게 전달하면 물건을 소환하여 수령할 수 있습니다.</p>
                                        </div>
                                    )}

                                    {/* 복사 버튼 */}
                                    {isShortCode && (
                                        <button 
                                            onClick={handleCopy} 
                                            className="w-full py-3 bg-amber-700 hover:bg-amber-600 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg transition-all"
                                        >
                                            {copyFeedback ? <CheckCircle size={16} className="text-green-400"/> : <Copy size={16}/>}
                                            <span className="text-xs">{copyFeedback ? '숏코드가 복사되었습니다!' : '간편 숏코드 복사하기'}</span>
                                        </button>
                                    )}

                                    {/* 기존 전체 코드 토글 아코디언 */}
                                    {rawFullCode && (
                                        <div className="bg-slate-950/80 rounded-xl border border-slate-800 p-3 space-y-2">
                                            <button 
                                                onClick={() => setShowFullCode(!showFullCode)} 
                                                className="w-full flex justify-between items-center text-xs font-bold text-slate-300 hover:text-white"
                                            >
                                                <span className="flex items-center gap-1.5"><FileText size={13} className="text-amber-400"/> 기존 전체 코드 (Base64 원본)</span>
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
                                        onClick={() => { setItemCode(''); setRawFullCode(''); setDriveShareLink(''); setShowFullCode(false); }} 
                                        className="w-full py-1.5 text-[11px] text-slate-500 hover:text-slate-300 underline text-center"
                                    >
                                        새로 발급하기
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-4 animate-in slide-in-from-right-2">
                            {!previewItems.length ? (
                                <div className="space-y-3">
                                    <div className="relative">
                                        <input 
                                            type="text"
                                            value={importInput} 
                                            onChange={(e) => setImportInput(e.target.value)} 
                                            placeholder="상대방의 구글드라이브 공유 링크, 아이템 숏코드, 또는 전체 코드를 입력..." 
                                            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-3 text-xs sm:text-sm text-amber-300 font-mono focus:border-amber-500 outline-none transition-all shadow-inner" 
                                        />
                                        <ClipboardPaste size={16} className="absolute right-3.5 top-3.5 text-slate-600" />
                                    </div>
                                    <button 
                                        onClick={handlePreviewCode} 
                                        disabled={isProcessing}
                                        className="w-full py-3.5 bg-amber-700 hover:bg-amber-600 text-white font-bold rounded-xl shadow-xl flex items-center justify-center gap-2 transition-all text-xs sm:text-sm cursor-pointer"
                                    >
                                        {isProcessing ? <Loader2 size={16} className="animate-spin" /> : <Package size={16}/>}
                                        아이템 목록 확인
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-3.5 animate-in zoom-in-95">
                                    <div className="bg-slate-950 p-3 rounded-xl border border-amber-500/30">
                                        <span className="text-xs font-bold text-amber-400 uppercase mb-2 block">소환될 아이템 ({previewItems.length}개)</span>
                                        <div className="space-y-1.5 max-h-36 overflow-y-auto custom-scrollbar">
                                            {previewItems.map((item, i) => (
                                                <div key={i} className="flex justify-between items-center p-2 bg-slate-900 rounded-lg border border-slate-800 text-xs">
                                                    <div>
                                                        <div className="font-bold text-white">{item.name}</div>
                                                        <div className="text-[9px] text-slate-400">{item.rarity} | {item.type}</div>
                                                    </div>
                                                    <span className="text-amber-400 font-bold">{(getSellValue(item) * 2).toLocaleString()} G</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {(() => {
                                        const costs = calculateImportCosts(previewItems);
                                        const currentCrystals = character.base?.resources.manaCrystal || 0;
                                        return (
                                            <div className="bg-slate-950 p-2.5 rounded-xl border border-blue-900/30 grid grid-cols-2 gap-2 text-center">
                                                <div className="bg-slate-900 p-2 rounded-lg">
                                                    <span className="text-[9px] text-slate-500 block">골드 소모</span>
                                                    <span className={`text-xs font-bold ${character.money >= costs.totalGoldCost ? 'text-amber-400' : 'text-red-500'}`}>
                                                        {costs.totalGoldCost.toLocaleString()} G
                                                    </span>
                                                </div>
                                                <div className="bg-slate-900 p-2 rounded-lg">
                                                    <span className="text-[9px] text-slate-500 block">마정석 소모</span>
                                                    <span className={`text-xs font-bold ${currentCrystals >= costs.crystalCost ? 'text-purple-400' : 'text-red-500'}`}>
                                                        {costs.crystalCost}개
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })()}

                                    <div className="flex gap-2">
                                        <button 
                                            onClick={() => { setPreviewItems([]); setPreviewId(null); setImportInput(''); }} 
                                            className="flex-1 py-3 bg-slate-800 text-slate-400 rounded-xl font-bold text-xs"
                                        >
                                            취소
                                        </button>
                                        <button 
                                            onClick={handleSummonItems}
                                            disabled={isProcessing}
                                            className="flex-[2] py-3 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl shadow-xl flex items-center justify-center gap-1.5 text-xs cursor-pointer"
                                        >
                                            {isProcessing ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15}/>}
                                            아이템 소환 완료
                                        </button>
                                    </div>
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
                    <span className="text-amber-400">구글 드라이브 클라우드 금고</span>
                </div>
            </div>
        </div>
    );
};

export default CommunicationItemModal;
