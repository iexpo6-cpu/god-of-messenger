import React, { useState, useEffect } from 'react';
import { LogOut, Save, AlertTriangle, X, ArrowLeft, CheckCircle, Clock, ShieldAlert, Loader2, HardDrive } from 'lucide-react';
import { Character } from '../types';
import { GameStorage } from '../storage';
import { getSaveSlotKey } from '../utils';

interface SaveSlotSummary {
  slotNum: number;
  timestamp?: string;
  charName?: string;
  level?: number;
  location?: string;
  isEmpty: boolean;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onExitWithoutSave: () => void;
  onExitWithSave: (slotNum: number) => Promise<void>;
  character: Character;
}

type ModalStep = 'select' | 'save_confirm' | 'no_save_confirm';

const ExitGameModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onExitWithoutSave,
  onExitWithSave,
  character
}) => {
  const [step, setStep] = useState<ModalStep>('select');
  const [selectedSlot, setSelectedSlot] = useState<number>(1);
  const [slotsSummary, setSlotsSummary] = useState<SaveSlotSummary[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setStep('select');
      setSelectedSlot(1);
      setIsProcessing(false);
      loadSlotsSummary();
    }
  }, [isOpen]);

  const loadSlotsSummary = async () => {
    setIsLoadingSlots(true);
    try {
      const summaries: SaveSlotSummary[] = await Promise.all(
        [1, 2, 3, 4, 5].map(async (num) => {
          const key = getSaveSlotKey(num);
          const data = await GameStorage.get(key);
          if (data && data.character) {
            return {
              slotNum: num,
              timestamp: data.timestamp ? new Date(data.timestamp).toLocaleString('ko-KR', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
              }) : undefined,
              charName: data.character.name || '알 수 없음',
              level: data.character.level || 1,
              location: data.character.currentLocation?.city || data.character.nation || '모험지',
              isEmpty: false
            };
          }
          return {
            slotNum: num,
            isEmpty: true
          };
        })
      );
      setSlotsSummary(summaries);
    } catch (e) {
      console.error('Failed to load slots summary in ExitGameModal', e);
    }
    setIsLoadingSlots(false);
  };

  const handleConfirmSaveAndExit = async () => {
    setIsProcessing(true);
    try {
      await onExitWithSave(selectedSlot);
    } catch (e) {
      console.error('Save and exit error', e);
      setIsProcessing(false);
    }
  };

  const handleConfirmNoSaveExit = () => {
    setIsProcessing(true);
    onExitWithoutSave();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div 
        className="w-full max-w-md bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col text-slate-100 relative"
        onClick={e => e.stopPropagation()}
      >
        {/* 상단 닫기 버튼 */}
        <button
          onClick={onClose}
          disabled={isProcessing}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1.5 rounded-full hover:bg-slate-800 transition-colors disabled:opacity-50 z-10"
          title="취소하고 게임으로 돌아가기"
        >
          <X size={20} />
        </button>

        {/* 1단계: 기본 선택 화면 */}
        {step === 'select' && (
          <div className="p-6 flex flex-col items-center text-center">
            <div className="w-14 h-14 rounded-2xl bg-amber-950/40 border border-amber-600/40 flex items-center justify-center text-amber-400 mb-4 shadow-lg shadow-amber-950/20">
              <LogOut size={28} />
            </div>

            <h3 className="text-xl font-bold text-white mb-1.5">게임 종료</h3>
            <p className="text-sm text-slate-400 mb-6 leading-relaxed">
              게임을 종료하고 타이틀 화면으로 돌아가시겠습니까?<br />
              종료 방식을 선택해 주십시오.
            </p>

            <div className="w-full space-y-3">
              {/* 옵션 1: 저장하고 종료 */}
              <button
                type="button"
                onClick={() => setStep('save_confirm')}
                className="w-full p-4 bg-gradient-to-r from-emerald-950/40 to-slate-800/80 hover:from-emerald-900/50 hover:to-slate-800 border border-emerald-600/40 hover:border-emerald-500 rounded-2xl flex items-center justify-between group transition-all text-left shadow-sm active:scale-[0.99]"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-emerald-900/50 border border-emerald-600/60 flex items-center justify-center text-emerald-300 group-hover:scale-105 transition-transform shrink-0">
                    <Save size={20} />
                  </div>
                  <div>
                    <div className="font-bold text-sm sm:text-base text-emerald-200 group-hover:text-emerald-100 flex items-center gap-1.5">
                      저장하고 종료
                      <span className="text-[10px] bg-emerald-900/80 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-700/60 font-medium">권장</span>
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      슬롯을 선택하여 진행 상황을 안전하게 저장 후 종료합니다.
                    </div>
                  </div>
                </div>
              </button>

              {/* 옵션 2: 저장하지 않고 종료 */}
              <button
                type="button"
                onClick={() => setStep('no_save_confirm')}
                className="w-full p-4 bg-gradient-to-r from-rose-950/30 to-slate-800/60 hover:from-rose-950/50 hover:to-slate-800 border border-rose-800/40 hover:border-rose-600 rounded-2xl flex items-center justify-between group transition-all text-left shadow-sm active:scale-[0.99]"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-rose-950/60 border border-rose-800/60 flex items-center justify-center text-rose-400 group-hover:scale-105 transition-transform shrink-0">
                    <AlertTriangle size={20} />
                  </div>
                  <div>
                    <div className="font-bold text-sm sm:text-base text-rose-300 group-hover:text-rose-200">
                      저장하지 않고 종료
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      마지막 저장 이후의 변경사항을 버리고 타이틀로 나갑니다.
                    </div>
                  </div>
                </div>
              </button>

              {/* 옵션 3: 계속 플레이 (취소) */}
              <button
                type="button"
                onClick={onClose}
                className="w-full py-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-slate-600 rounded-2xl text-xs sm:text-sm font-semibold text-slate-300 transition-colors mt-2"
              >
                계속 플레이 (취소)
              </button>
            </div>
          </div>
        )}

        {/* 2단계 (재확인): 저장하고 종료 */}
        {step === 'save_confirm' && (
          <div className="p-6 flex flex-col">
            <div className="flex items-center gap-2 mb-3">
              <button
                onClick={() => setStep('select')}
                disabled={isProcessing}
                className="p-1.5 -ml-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50"
              >
                <ArrowLeft size={18} />
              </button>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Save size={20} className="text-emerald-400" />
                저장 후 타이틀 이동 (재확인)
              </h3>
            </div>

            <p className="text-xs text-slate-400 mb-4">
              현재 캐릭터 <strong className="text-amber-300 font-bold">Lv.{character.level} {character.name}</strong>의 데이터를 저장할 슬롯을 선택해 주십시오.
            </p>

            {/* 슬롯 선택 목록 */}
            <div className="space-y-2 mb-5 max-h-[260px] overflow-y-auto pr-1">
              {isLoadingSlots ? (
                <div className="py-8 flex flex-col items-center justify-center text-slate-400 text-xs gap-2">
                  <Loader2 size={24} className="animate-spin text-emerald-400" />
                  <span>저장 슬롯 정보를 확인하는 중...</span>
                </div>
              ) : (
                slotsSummary.map((slot) => {
                  const isSelected = selectedSlot === slot.slotNum;
                  return (
                    <div
                      key={slot.slotNum}
                      onClick={() => !isProcessing && setSelectedSlot(slot.slotNum)}
                      className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between text-xs ${
                        isSelected
                          ? 'bg-emerald-950/40 border-emerald-500 shadow-md shadow-emerald-950/20'
                          : 'bg-slate-950/50 border-slate-800 hover:border-slate-700 hover:bg-slate-800/40'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold font-mono text-xs ${
                          isSelected ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400 border border-slate-700'
                        }`}>
                          {slot.slotNum}
                        </div>
                        <div>
                          {slot.isEmpty ? (
                            <span className="text-slate-500 italic">빈 저장 슬롯 (새로 저장)</span>
                          ) : (
                            <div>
                              <div className="font-bold text-slate-200 flex items-center gap-1.5">
                                <span>Lv.{slot.level} {slot.charName}</span>
                                <span className="text-[10px] text-slate-400 font-normal">({slot.location})</span>
                              </div>
                              {slot.timestamp && (
                                <div className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5 font-mono">
                                  <Clock size={10} />
                                  {slot.timestamp}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center">
                        {isSelected ? (
                          <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center text-slate-950">
                            <CheckCircle size={14} className="stroke-[3]" />
                          </div>
                        ) : (
                          <div className="w-5 h-5 rounded-full border border-slate-700" />
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* 재확인 안내 상자 */}
            <div className="bg-emerald-950/20 border border-emerald-700/40 rounded-xl p-3 mb-5 text-xs text-emerald-300/90 leading-relaxed flex items-start gap-2">
              <HardDrive size={16} className="text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <strong>[슬롯 {selectedSlot}]</strong>에 현재 진행 상태를 저장하고 타이틀 화면으로 복귀합니다.
                <span className="text-slate-400 block text-[11px] mt-0.5">기존 슬롯에 데이터가 있다면 현재 데이터로 덮어씌워집니다.</span>
              </div>
            </div>

            {/* 하단 액션 버튼 */}
            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={() => setStep('select')}
                disabled={isProcessing}
                className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs transition-colors disabled:opacity-50"
              >
                이전으로
              </button>
              <button
                type="button"
                onClick={handleConfirmSaveAndExit}
                disabled={isProcessing}
                className="flex-[2] py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/30 transition-all active:scale-[0.98] disabled:opacity-50"
              >
                {isProcessing ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    저장 및 타이틀 이동 중...
                  </>
                ) : (
                  <>
                    <Save size={16} />
                    슬롯 {selectedSlot}에 저장하고 종료
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* 3단계 (재확인): 저장하지 않고 종료 */}
        {step === 'no_save_confirm' && (
          <div className="p-6 flex flex-col items-center text-center">
            <div className="w-14 h-14 rounded-2xl bg-rose-950/40 border border-rose-600/40 flex items-center justify-center text-rose-400 mb-4 shadow-lg shadow-rose-950/30 animate-pulse">
              <ShieldAlert size={30} />
            </div>

            <h3 className="text-xl font-bold text-white mb-2">저장하지 않고 종료하시겠습니까?</h3>
            
            <div className="w-full bg-rose-950/30 border border-rose-800/50 rounded-2xl p-4 mb-6 text-left space-y-2">
              <div className="flex items-start gap-2.5 text-rose-200 text-xs leading-relaxed">
                <AlertTriangle size={16} className="text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="font-bold text-rose-100">주의: 마지막 저장 이후의 모든 데이터가 소실됩니다.</strong>
                  <p className="text-slate-300 text-[11px] mt-1">
                    경험치, 획득한 장비, 골드, 퀘스트 달성도 등 저장되지 않은 모든 진행 상황이 즉시 삭제되며 복구할 수 없습니다.
                  </p>
                </div>
              </div>
            </div>

            <div className="w-full flex gap-3">
              <button
                type="button"
                onClick={() => setStep('select')}
                disabled={isProcessing}
                className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs transition-colors disabled:opacity-50"
              >
                돌아가기
              </button>
              <button
                type="button"
                onClick={handleConfirmNoSaveExit}
                disabled={isProcessing}
                className="flex-[1.5] py-3 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-rose-900/40 transition-all active:scale-[0.98] disabled:opacity-50"
              >
                {isProcessing ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    종료 처리 중...
                  </>
                ) : (
                  <>
                    <LogOut size={16} />
                    저장 없이 즉시 종료
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExitGameModal;
