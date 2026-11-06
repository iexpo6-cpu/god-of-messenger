import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Edit2, X, Check } from 'lucide-react';

interface RenameModalProps {
  isOpen: boolean;
  currentName: string;
  onClose: () => void;
  onConfirm: (newName: string) => void;
}

export const RenameModal: React.FC<RenameModalProps> = ({
  isOpen,
  currentName,
  onClose,
  onConfirm,
}) => {
  const [nameInput, setNameInput] = useState(currentName);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setNameInput(currentName);
      setError('');
    }
  }, [isOpen, currentName]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = nameInput.trim();

    if (!trimmed) {
      setError('새 이름을 입력해주세요.');
      return;
    }

    if (trimmed.length > 12) {
      setError('이름은 최대 12자까지 입력할 수 있습니다.');
      return;
    }

    if (trimmed === currentName) {
      onClose();
      return;
    }

    onConfirm(trimmed);
    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-fadeIn">
      <div 
        className="w-full max-w-sm bg-slate-900 border border-amber-500/40 rounded-2xl p-5 shadow-2xl space-y-4 text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Edit2 size={18} />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-amber-300">
                캐릭터 개명
              </h3>
              <p className="text-xs text-slate-400">
                새로운 플레이어 이름을 설정합니다.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-all"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">
              현재 이름: <span className="text-amber-400 font-mono ml-1">{currentName}</span>
            </label>
            <input
              type="text"
              value={nameInput}
              onChange={(e) => {
                setNameInput(e.target.value);
                if (error) setError('');
              }}
              placeholder="새 이름 입력"
              maxLength={12}
              autoFocus
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm font-bold text-slate-100 focus:outline-none focus:border-amber-500 transition-colors placeholder:text-slate-600"
            />
            {error && (
              <p className="text-xs font-semibold text-red-400 mt-1.5">
                {error}
              </p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl border border-slate-700 transition-all active:scale-95"
            >
              취소
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-1"
            >
              <Check size={14} />
              <span>변경</span>
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

export default RenameModal;
