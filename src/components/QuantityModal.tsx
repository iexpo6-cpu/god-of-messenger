
import React, { useState, useEffect } from 'react';
import { X, DollarSign, Package, Trash2, Zap, ArrowRight, ArrowLeft, Plus, Minus } from 'lucide-react';

interface Props {
  isOpen: boolean;
  title: string;
  itemName: string;
  maxQuantity: number;
  pricePerUnit: number;
  onConfirm: (quantity: number) => void;
  onClose: () => void;
  actionType?: 'sell' | 'discard' | 'use' | 'deposit' | 'withdraw'| 'wedding_gift' ;
}

const QuantityModal: React.FC<Props> = ({ isOpen, title, itemName, maxQuantity, pricePerUnit, onConfirm, onClose, actionType = 'sell' }) => {
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    if (isOpen) setQuantity(1);
  }, [isOpen]);

  if (!isOpen) return null;

  const getTheme = () => {
    switch(actionType) {
        case 'discard': return { color: 'text-red-400', border: 'border-red-600', bg: 'bg-red-950/50', accent: 'accent-red-500', icon: Trash2 };
        case 'use': return { color: 'text-green-400', border: 'border-green-600', bg: 'bg-green-950/50', accent: 'accent-green-500', icon: Zap };
        case 'deposit': return { color: 'text-amber-400', border: 'border-amber-600', bg: 'bg-amber-950/50', accent: 'accent-amber-500', icon: ArrowRight };
        case 'withdraw': return { color: 'text-blue-400', border: 'border-blue-600', bg: 'bg-blue-950/50', accent: 'accent-blue-500', icon: ArrowLeft };
        default: return { color: 'text-amber-400', border: 'border-slate-600', bg: 'bg-slate-800', accent: 'accent-amber-500', icon: Package };
    }
  };

  const theme = getTheme();
  const Icon = theme.icon;

  const handleManualInput = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = parseInt(e.target.value);
      if (isNaN(val)) setQuantity(1);
      else setQuantity(Math.min(maxQuantity, Math.max(1, val)));
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 font-sans animate-in fade-in duration-200">
      <div className={`bg-slate-900 border w-full max-w-sm rounded-xl shadow-2xl overflow-hidden ${theme.border}`}>
        <div className={`p-4 border-b flex justify-between items-center ${theme.bg}`}>
          <h3 className={`font-bold flex items-center ${theme.color}`}>
            <Icon size={18} className="mr-2"/> {title}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="text-center">
            <div className={`text-lg font-bold mb-1 ${theme.color.replace('400', '200')}`}>{itemName}</div>
            {actionType === 'sell' && <div className="text-xs text-slate-500">개당 {pricePerUnit.toLocaleString()} G</div>}
            {actionType === 'discard' && <div className="text-xs text-red-400">삭제하면 복구할 수 없습니다.</div>}
            {actionType === 'deposit' && <div className="text-xs text-amber-500">창고로 보관할 수량을 선택하세요.</div>}
            {actionType === 'withdraw' && <div className="text-xs text-blue-400">가방으로 꺼낼 수량을 선택하세요.</div>}
          </div>

          <div className="space-y-4">
            <div className="flex justify-between text-xs text-slate-400 font-bold uppercase">
              <span>수량 (Quantity)</span>
              <span>{quantity} / {maxQuantity}</span>
            </div>
            
            <input 
              type="range" 
              min="1" 
              max={maxQuantity} 
              value={quantity} 
              onChange={(e) => setQuantity(parseInt(e.target.value))}
              className={`w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer ${theme.accent}`}
            />

            <div className="flex items-center justify-center gap-4">
                <button 
                    onClick={() => setQuantity(prev => Math.max(1, prev - 1))}
                    className="p-2 bg-slate-800 border border-slate-700 rounded-full text-slate-400 hover:text-white transition-colors"
                >
                    <Minus size={20} />
                </button>
                
                <input 
                    type="number" 
                    min="1" 
                    max={maxQuantity} 
                    value={quantity} 
                    onChange={handleManualInput}
                    className="w-24 bg-slate-950 border border-slate-700 rounded-lg py-3 text-center font-bold text-xl text-white outline-none focus:border-amber-500 transition-all shadow-inner"
                />

                <button 
                    onClick={() => setQuantity(prev => Math.min(maxQuantity, prev + 1))}
                    className="p-2 bg-slate-800 border border-slate-700 rounded-full text-slate-400 hover:text-white transition-colors"
                >
                    <Plus size={20} />
                </button>
            </div>
          </div>

          {actionType === 'sell' && (
              <div className="bg-slate-950 p-3 rounded border border-slate-800 flex justify-between items-center">
                <span className="text-sm text-slate-400">총 판매 금액</span>
                <span className="text-lg font-bold text-amber-400 font-mono flex items-center">
                  {(quantity * pricePerUnit).toLocaleString()} <DollarSign size={14} className="ml-1" />
                </span>
              </div>
          )}
        </div>

        <div className={`p-4 border-t flex gap-3 bg-slate-950/20`}>
          <button onClick={onClose} className="flex-1 py-3 bg-slate-800 text-slate-300 rounded-lg font-bold transition-colors">취소</button>
          <button 
            onClick={() => onConfirm(quantity)} 
            className={`flex-1 py-3 rounded-lg font-bold shadow-lg transition-all text-white ${
                actionType === 'discard' ? 'bg-red-700 hover:bg-red-600' : 
                actionType === 'use' ? 'bg-green-700 hover:bg-green-600' : 
                actionType === 'withdraw' ? 'bg-blue-700 hover:bg-blue-600' :
                'bg-amber-700 hover:bg-amber-600'
            }`}
          >
            확인
          </button>
        </div>
      </div>
    </div>
  );
};

export default QuantityModal;
