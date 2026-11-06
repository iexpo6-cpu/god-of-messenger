import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Heart, HeartCrack, User } from 'lucide-react';
import { Character, Companion, RelationType } from '../types';

interface Props {
  character: Character;
  companionId: string;
  onRespond: (accepted: boolean) => void;
}

export const ConfessionModal: React.FC<Props> = ({ character, companionId, onRespond }) => {
  const companion = [...character.companions, ...(character.inactiveCompanions || [])].find(c => c.id === companionId);

  if (!companion) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="bg-slate-900 border-2 border-pink-500/50 rounded-2xl p-6 max-w-sm w-full shadow-2xl shadow-pink-900/20 text-center"
        >
          <div className="w-20 h-20 mx-auto rounded-full bg-slate-800 border-2 border-pink-400 overflow-hidden mb-4 shadow-lg flex items-center justify-center relative">
            {companion.visualUrl ? (
                <img src={companion.visualUrl} alt={companion.name} className="w-full h-full object-cover" />
            ) : (
                <User size={32} className="text-slate-400" />
            )}
            <div className="absolute -bottom-1 -right-1 bg-pink-500 text-white rounded-full p-1 animate-bounce">
                <Heart size={14} className="fill-white" />
            </div>
          </div>
          
          <h2 className="text-xl font-bold text-pink-300 mb-2">{companion.name}의 고백</h2>
          <p className="text-slate-300 text-sm leading-relaxed mb-6">
            "{character.name}님... 오랫동안 마음에 담아두었던 말이 있습니다. 저와 연인이 되어 주시겠습니까?"
          </p>

          <div className="flex gap-3">
            <button
              onClick={() => onRespond(true)}
              className="flex-1 py-2 bg-pink-600 hover:bg-pink-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-colors shadow-lg shadow-pink-900/50"
            >
              <Heart size={16} className="fill-white" /> 수락하기
            </button>
            <button
              onClick={() => onRespond(false)}
              className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-medium flex items-center justify-center gap-2 border border-slate-600 transition-colors"
            >
              <HeartCrack size={16} /> 거절하기
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
