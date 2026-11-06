import React from 'react';
import { createPortal } from 'react-dom';
import { X, AlertTriangle, DollarSign, Trash2 } from 'lucide-react';

interface Props {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onClose: () => void;
  type: 'sell' | 'discard';
  isAlert?: boolean;
}

const ConfirmModal: React.FC<Props> = ({ isOpen, title, message, onConfirm, onClose, type, isAlert = false }) => {
  if (!isOpen) return null;

  const isSell = type === 'sell';
  const theme = isSell 
    ? { color: 'text-blue-400', border: 'border-blue-600', bg: 'bg-blue-950/50', icon: DollarSign }
    : { color: 'text-red-400', border: 'border-red-600', bg: 'bg-red-950/50', icon: Trash2 };

  const Icon = theme.icon;

  return createPortal(
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

        <div className="p-6 text-center">
          <AlertTriangle size={48} className={`mx-auto mb-4 ${theme.color}`} />
          <p className="text-slate-200 text-sm leading-relaxed">{message}</p>
        </div>

        <div className="p-4 border-t flex gap-3 bg-slate-950/20">
          {!isAlert && (
            <button onClick={onClose} className="flex-1 py-3 bg-slate-800 text-slate-300 rounded-lg font-bold transition-colors">취소</button>
          )}
          <button 
            onClick={() => { onConfirm(); onClose(); }} 
            className={`flex-1 py-3 rounded-lg font-bold shadow-lg transition-all text-white ${isSell ? 'bg-blue-700 hover:bg-blue-600' : 'bg-red-700 hover:bg-red-600'}`}
          >
            확인
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ConfirmModal;
