
import React from 'react';
import { Character, DiplomaticStatus, NationRelation, BaseResources } from '../types';
import { X, Gavel, Coins, Zap, Package, TrendingDown, TrendingUp, AlertTriangle, CheckCircle, HandCoins, Skull, Crown } from 'lucide-react';
import { calculateVassalResources, VASSAL_DURATION_YEARS } from '../vassalsystem';
import { getYear } from '../utils';
import ActionResultModal, { ResultData } from './ActionResultModal';

interface Props {
    character: Character;
    targetNation: string;
    onClose: () => void;
    onUpdateCharacter: (newChar: Character, logMsg: string) => void;
}

const VassalManagementModal: React.FC<Props> = ({ character, targetNation, onClose, onUpdateCharacter }) => {
    const [resultData, setResultData] = React.useState<ResultData | null>(null);
    
    const rel = character.militaryData?.diplomacy?.[targetNation];
    if (!rel) return null;

    const currentYear = getYear(character.currentDate || '2000-01-01');
    const isOwner = rel.status === DiplomaticStatus.VASSAL_OWNER;
    const { tax, exploit } = calculateVassalResources(character);
    
    const canInteract = rel.lastVassalInteractionYear !== currentYear;
    
    // 세금 체납액 포함 계산
    const currentDebt = rel.vassalDebt || { gold: 0, manaCrystal: 0, wood: 0, iron: 0 };
    const totalTaxGold = tax.gold + currentDebt.gold;
    const totalTaxMana = tax.manaCrystal + currentDebt.manaCrystal;
    const totalTaxWood = tax.wood + currentDebt.wood;
    const totalTaxIron = tax.iron + currentDebt.iron;

    const handlePayTax = () => {
        const res = character.base?.resources;
        if (!res) return;

        const missing = [];
        if (character.money < totalTaxGold) missing.push(`골드 ${totalTaxGold - character.money}`);
        if (res.manaCrystal < totalTaxMana) missing.push(`마정석 ${totalTaxMana - res.manaCrystal}`);
        if (res.wood < totalTaxWood) missing.push(`목재 ${totalTaxWood - res.wood}`);
        if (res.iron < totalTaxIron) missing.push(`철광석 ${totalTaxIron - res.iron}`);

        if (missing.length > 0) {
            setResultData({
                type: 'warning',
                title: '자원 부족',
                message: '종주국에 바칠 세금이 부족합니다. 체납 시 이자가 발생합니다!',
                items: missing.map(m => ({ label: '부족', after: m }))
            });
            return;
        }

        const newChar = { ...character };
        newChar.money -= totalTaxGold;
        newChar.base!.resources.manaCrystal -= totalTaxMana;
        newChar.base!.resources.wood -= totalTaxWood;
        newChar.base!.resources.iron -= totalTaxIron;

        // 관계 업데이트
        const newRel = { ...newChar.militaryData!.diplomacy![targetNation] };
        newRel.lastVassalInteractionYear = currentYear;
        newRel.vassalDebt = undefined; // 부채 탕감
        newChar.militaryData!.diplomacy![targetNation] = newRel;

        onUpdateCharacter(newChar, `[속국 납세] ${targetNation} 종주국에 ${currentYear}년도 세금을 모두 납부했습니다.`);
        setResultData({
            type: 'success',
            title: '납세 완료',
            message: '조공을 바쳐 종주국의 진노를 피했습니다.',
            items: [{ label: '납부 골드', after: totalTaxGold.toLocaleString() + ' G' }]
        });
    };

    const handleExploit = () => {
        if (!canInteract) return;

        const newChar = { ...character };
        newChar.money += exploit.gold;
        if (newChar.base) {
            newChar.base.resources.manaCrystal += exploit.manaCrystal;
            newChar.base.resources.iron += exploit.iron;
        }

        const newRel = { ...newChar.militaryData!.diplomacy![targetNation] };
        newRel.lastVassalInteractionYear = currentYear;
        newChar.militaryData!.diplomacy![targetNation] = newRel;

        onUpdateCharacter(newChar, `[자원 수탈] 속국 ${targetNation}으로부터 ${currentYear}년도 물자를 강제 징수했습니다.`);
        setResultData({
            type: 'success',
            title: '수탈 성공',
            message: `${targetNation}의 창고를 열어 막대한 자원을 확보했습니다.`,
            items: [
                { label: '획득 골드', after: `+${exploit.gold.toLocaleString()} G` },
                { label: '획득 마정석', after: `+${exploit.manaCrystal}` },
                { label: '획득 철광석', after: `+${exploit.iron}` }
            ]
        });
    };

    return (
        <div className="fixed inset-0 z-[160] flex items-center justify-center bg-black/90 p-4 animate-in fade-in">
            {resultData && <ActionResultModal data={resultData} onClose={() => setResultData(null)} />}
            
            <div className={`bg-slate-900 border-2 w-full max-w-md rounded-3xl shadow-2xl flex flex-col overflow-hidden ${isOwner ? 'border-amber-500' : 'border-red-600'}`}>
                <div className={`p-6 border-b flex justify-between items-center ${isOwner ? 'bg-amber-950/20 border-amber-900/50' : 'bg-red-950/20 border-red-900/50'}`}>
                    <div className="flex items-center gap-3">
                        {isOwner ? <Crown className="text-amber-400"/> : <Skull className="text-red-500"/>}
                        <h2 className="text-xl font-bold text-white font-cinzel">{isOwner ? '자원 수탈 관리' : '조공 및 납세'}</h2>
                    </div>
                    <button onClick={onClose} className="text-slate-500 hover:text-white"><X/></button>
                </div>

                <div className="p-8 space-y-6">
                    <div className="text-center">
                        <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Target Nation</span>
                        <h3 className="text-2xl font-bold text-white mb-1">{targetNation}</h3>
                        <p className={`text-xs font-bold ${isOwner ? 'text-amber-500' : 'text-red-500'}`}>
                            {isOwner ? '우리의 지배를 받는 속국입니다' : '우리의 상위 종주국입니다'}
                        </p>
                    </div>

                    <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-4">
                        <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                            <span className="text-xs text-slate-400 font-bold uppercase">{isOwner ? 'Expected Exploit' : 'Current Tax Due'}</span>
                            <span className="text-[10px] text-slate-500">Year: {currentYear}</span>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3 text-xs">
                            <div className="flex justify-between bg-slate-900 p-2 rounded">
                                <span className="text-slate-500 flex items-center gap-1"><Coins size={12}/> 골드</span>
                                <span className="text-amber-400 font-bold">{(isOwner ? exploit.gold : totalTaxGold).toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between bg-slate-900 p-2 rounded">
                                <span className="text-slate-500 flex items-center gap-1"><Zap size={12}/> 마정석</span>
                                <span className="text-purple-400 font-bold">{(isOwner ? exploit.manaCrystal : totalTaxMana)}</span>
                            </div>
                            <div className="flex justify-between bg-slate-900 p-2 rounded">
                                <span className="text-slate-500 flex items-center gap-1"><Package size={12}/> 철광석</span>
                                <span className="text-blue-400 font-bold">{(isOwner ? exploit.iron : totalTaxIron)}</span>
                            </div>
                            {!isOwner && (
                                <div className="flex justify-between bg-slate-900 p-2 rounded">
                                    <span className="text-slate-500 flex items-center gap-1"><Package size={12}/> 목재</span>
                                    <span className="text-orange-400 font-bold">{totalTaxWood}</span>
                                </div>
                            )}
                        </div>

                        {!isOwner && currentDebt.gold > 0 && (
                            <div className="bg-red-950/20 p-2 rounded border border-red-900/30 flex items-center gap-2">
                                <AlertTriangle size={14} className="text-red-500 animate-pulse"/>
                                <span className="text-[10px] text-red-300">경고: 체납된 세금이 포함되어 있습니다 (이자 20% 적용됨).</span>
                            </div>
                        )}
                    </div>

                    <div className="flex flex-col gap-3">
                        {!canInteract ? (
                            <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 text-center">
                                <CheckCircle size={24} className="text-green-500 mx-auto mb-2"/>
                                <p className="text-xs text-slate-400">올해의 {isOwner ? '수탈' : '납세'}가 이미 완료되었습니다.</p>
                                <p className="text-[9px] text-slate-600 mt-1">다음 정산: {currentYear + 1}년 3월</p>
                            </div>
                        ) : isOwner ? (
                            <button 
                                onClick={handleExploit}
                                className="w-full py-4 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl shadow-lg transition-all transform active:scale-95 flex items-center justify-center gap-2"
                            >
                                <TrendingUp size={20}/> 자원 강제 수탈하기
                            </button>
                        ) : (
                            <button 
                                onClick={handlePayTax}
                                className="w-full py-4 bg-red-700 hover:bg-red-600 text-white font-bold rounded-xl shadow-lg transition-all transform active:scale-95 flex items-center justify-center gap-2"
                            >
                                <HandCoins size={20}/> 세금 및 조공 납부
                            </button>
                        )}
                        
                        <div className="text-center">
                            <span className="text-[10px] text-slate-600">남은 속국 계약 기간: {rel.vassalYearsRemaining}년</span>
                        </div>
                    </div>
                </div>

                <div className="p-4 bg-slate-950 border-t border-slate-800">
                    <button onClick={onClose} className="w-full py-2 text-slate-500 hover:text-white text-xs font-bold transition-colors">창 닫기</button>
                </div>
            </div>
        </div>
    );
};

export default VassalManagementModal;
