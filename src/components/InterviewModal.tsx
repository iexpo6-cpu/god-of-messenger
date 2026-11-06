
import React, { useState } from 'react';
import { Character, InterviewData, InterviewQuestion } from '../types';
import { X, Mic2, MessageCircle, Send, Award, TrendingUp, Skull, ShieldAlert, Info, Loader2, Star, Sparkles, CheckCircle, ChevronRight, Coins } from 'lucide-react';
import { evaluateInterviewAnswer } from '../services/geminiService';
import ActionResultModal, { ResultData } from './ActionResultModal';

interface Props {
  character: Character;
  data: InterviewData;
  onClose: () => void;
  onUpdateCharacter: (newChar: Character, logMsg: string) => void;
}

const InterviewModal: React.FC<Props> = ({ character, data, onClose, onUpdateCharacter }) => {
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [answers, setAnswers] = useState<(number | string)[]>([]);
  const [customInput, setCustomInput] = useState('');
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [resultData, setResultData] = useState<ResultData | null>(null);

  // 최종 누적 결과
  const [finalRewards, setFinalRewards] = useState({ merit: 0, rep: 0, infamy: 0 });

  const currentQuestion = data.questions[currentQuestionIdx];

  const handleSelectOption = (idx: number) => {
    const option = currentQuestion.options[idx];
    setFinalRewards(prev => ({
        merit: prev.merit + (option.meritGain || 0),
        rep: prev.rep + (option.repGain || 0),
        infamy: prev.infamy + (option.infamyGain || 0)
    }));

    const newAnswers = [...answers, idx];
    setAnswers(newAnswers);

    proceedToNext(newAnswers);
  };

  const handleCustomSubmit = async () => {
      if (!customInput.trim() || isEvaluating) return;

      setIsEvaluating(true);
      try {
          const evalResult = await evaluateInterviewAnswer(currentQuestion.question, customInput, character, data.interviewer);
          
          setFinalRewards(prev => ({
              merit: prev.merit + evalResult.meritGain,
              rep: prev.rep + evalResult.repGain,
              infamy: prev.infamy + evalResult.infamyGain
          }));

          const newAnswers = [...answers, customInput];
          setAnswers(newAnswers);
          setCustomInput('');
          
          proceedToNext(newAnswers);
      } catch (e) {
          alert("답변을 분석하는 데 실패했습니다.");
      } finally {
          setIsEvaluating(false);
      }
  };

  const proceedToNext = (updatedAnswers: (number | string)[]) => {
      if (currentQuestionIdx < data.questions.length - 1) {
          setCurrentQuestionIdx(prev => prev + 1);
      } else {
          applyFinalResults();
      }
  };

  const applyFinalResults = () => {
    setIsFinished(true);
    
    const newChar = { ...character };
    
    // [NEW] 인터뷰 출연료 계산: Max(RP, Merit) * 100
    const currentHighestValue = Math.max(newChar.mercenaryData?.reputation || 0, newChar.militaryData?.merit || 0);
    const goldReward = currentHighestValue * 100;
    newChar.money += goldReward;

    // 능력치 및 악명 업데이트
    if (newChar.mercenaryData) newChar.mercenaryData.reputation = Math.max(0, newChar.mercenaryData.reputation + finalRewards.rep);
    if (newChar.militaryData) newChar.militaryData.merit = Math.max(0, newChar.militaryData.merit + finalRewards.merit);
    newChar.infamy = Math.max(0, (newChar.infamy || 0) + finalRewards.infamy);
    
    // 인터뷰 목록에서 현재 인터뷰 제거
    newChar.pendingInterviews = (newChar.pendingInterviews || []).filter(i => i.id !== data.id);
    newChar.lastInterviewDate = character.currentDate;

    // 업적 기록
    if (!newChar.memories) newChar.memories = [];
    newChar.memories.push(`[${character.currentDate}] ${data.interviewer}와의 인터뷰 '${data.topic}' 완료. 출연료 ${goldReward.toLocaleString()}G 수령.`);

    onUpdateCharacter(newChar, `[언론 인터뷰] '${data.topic}' 인터뷰를 마치고 출연료 ${goldReward.toLocaleString()}G를 받았습니다.`);
    
    setResultData({
      type: 'levelup',
      title: '인터뷰 종료 및 정산',
      message: '당신의 인터뷰가 세계 곳곳으로 보도됩니다. 출연료와 평판 보너스가 지급되었습니다.',
      items: [
        { label: '인터뷰 출연료', after: `+${goldReward.toLocaleString()} G` },
        ...(finalRewards.rep !== 0 ? [{ label: '명성치(RP) 변동', after: (finalRewards.rep > 0 ? '+' : '') + finalRewards.rep }] : []),
        ...(finalRewards.merit !== 0 ? [{ label: '공적치(Merit) 변동', after: (finalRewards.merit > 0 ? '+' : '') + finalRewards.merit }] : []),
        ...(finalRewards.infamy !== 0 ? [{ label: '악명도(Infamy) 변동', after: (finalRewards.infamy > 0 ? '+' : '') + finalRewards.infamy }] : [])
      ]
    });
  };

  return (
    <div className="fixed inset-0 z-[220] flex items-center justify-center bg-black/95 backdrop-blur-xl p-4 animate-in fade-in duration-300">
      {resultData && <ActionResultModal data={resultData} onClose={onClose} />}

      <div className="bg-slate-900 border-2 border-amber-500 w-full max-w-2xl h-[85vh] rounded-[3rem] shadow-[0_0_100px_rgba(245,158,11,0.3)] flex flex-col overflow-hidden relative">
        
        {/* Background Decor */}
        <div className="absolute inset-0 opacity-10 pointer-events-none">
            <div className="absolute top-0 right-0 p-20"><Mic2 size={200} className="text-amber-500" /></div>
        </div>

        <div className="p-8 border-b border-white/10 bg-slate-950 flex justify-between items-center shrink-0 relative z-10">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-amber-600 rounded-2xl shadow-lg">
              <Mic2 size={32} className="text-white animate-pulse" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white font-cinzel tracking-tight uppercase">Special Interview</h2>
              <p className="text-xs text-amber-400 font-bold uppercase tracking-widest">{data.interviewer} - {data.interviewerTitle}</p>
            </div>
          </div>
          {!isFinished && <button onClick={onClose} className="text-slate-500 hover:text-white p-1"><X size={28}/></button>}
        </div>

        <div className="flex-1 p-8 flex flex-col relative z-10 overflow-y-auto custom-scrollbar">
          {!isFinished ? (
            <div className="flex-1 flex flex-col space-y-8 animate-in slide-in-from-bottom-4">
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-[10px] font-bold text-amber-500/70 uppercase tracking-[0.2em]">
                    <Sparkles size={12}/> Question {currentQuestionIdx + 1} / {data.questions.length}
                </div>
                <h3 className="text-2xl md:text-3xl font-bold text-white leading-tight">
                    "{currentQuestion.question}"
                </h3>
              </div>

              {/* Predefined Options */}
              <div className="grid grid-cols-1 gap-3">
                {currentQuestion.options.map((opt, i) => (
                  <button
                    key={i}
                    disabled={isEvaluating}
                    onClick={() => handleSelectOption(i)}
                    className="w-full p-5 rounded-[1.5rem] bg-slate-950 border border-slate-800 hover:border-amber-500 hover:bg-amber-900/10 text-left transition-all group flex justify-between items-center disabled:opacity-50"
                  >
                    <div className="flex-1 mr-4">
                        <p className="text-sm md:text-base font-bold text-slate-300 group-hover:text-white">
                            {opt.text}
                        </p>
                    </div>
                    <ChevronRight className="text-slate-700 group-hover:text-amber-500 group-hover:translate-x-1 transition-all" size={20}/>
                  </button>
                ))}
              </div>

              {/* Custom Answer Input */}
              <div className="space-y-3 pt-4 border-t border-white/5">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                        <MessageCircle size={14} className="text-indigo-400" /> 직접 답변하기 (Direct Response)
                    </label>
                    <span className="text-[10px] text-slate-600 italic">AI가 답변을 분석합니다.</span>
                  </div>
                  <div className="relative">
                    <textarea 
                        value={customInput}
                        onChange={(e) => setCustomInput(e.target.value)}
                        placeholder="기자의 질문에 대해 당신만의 대답을 적어보세요..."
                        disabled={isEvaluating}
                        className="w-full h-24 bg-slate-950 border border-slate-800 rounded-2xl p-4 text-sm text-slate-200 focus:border-indigo-500 outline-none resize-none transition-all shadow-inner"
                    />
                    <button 
                        onClick={handleCustomSubmit}
                        disabled={!customInput.trim() || isEvaluating}
                        className="absolute bottom-3 right-3 p-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-lg transition-all disabled:opacity-30 disabled:grayscale flex items-center gap-2"
                    >
                        {isEvaluating ? <Loader2 size={16} className="animate-spin"/> : <Send size={16}/>}
                        <span className="text-xs font-bold">전송</span>
                    </button>
                  </div>
              </div>

              <div className="p-4 bg-black/40 rounded-2xl border border-white/5 flex gap-3 items-center mt-auto">
                  <Info size={16} className="text-indigo-400 shrink-0"/>
                  <p className="text-[10px] text-slate-500 leading-relaxed italic">
                      당신의 답변은 전 세계로 보도됩니다. 신중하게 대답하십시오. 
                      각 답변에 따라 당신의 지위와 평판이 크게 요동칠 수 있습니다.
                  </p>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center space-y-6 text-center animate-in zoom-in">
                <div className="p-6 bg-amber-900/20 rounded-full border border-amber-500/50">
                    <CheckCircle size={64} className="text-amber-500 animate-bounce-short" />
                </div>
                <div className="space-y-2">
                    <h3 className="text-3xl font-bold text-white">인터뷰 종료 및 정산 중</h3>
                    <p className="text-slate-400">곧 전 세계 신문과 커뮤니티에 당신의 인터뷰 기사가 실릴 예정입니다.</p>
                </div>
                <div className="flex items-center gap-2 text-amber-400 font-mono text-xl animate-pulse">
                    <Coins size={24}/> 정산 처리 중...
                </div>
                <Loader2 className="animate-spin text-indigo-500" size={32}/>
            </div>
          )}
        </div>

        <div className="p-4 bg-slate-950 border-t border-white/5 text-center shrink-0">
            <p className="text-[9px] text-slate-600 font-bold uppercase tracking-widest">The voice of the hero echo through the dimensions.</p>
        </div>
      </div>
    </div>
  );
};

export default InterviewModal;
