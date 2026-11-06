import React, { useState } from 'react';
import { SimpleStudent } from '../types';
import { 
    ADVICE_OPTIONS, 
    PRAISE_OPTIONS, 
    AdviceOption, 
    PraiseOption, 
    InteractionFeedbackResult,
    getStudentProfileAnalysis, 
    executeAdviceInteraction, 
    executePraiseInteraction, 
    executeScoldInteraction,
    StudentProfileAnalysis
} from '../services/studentMentoringService';
import { X, Sparkles, Compass, Award, ShieldAlert, CheckCircle, MessageSquareQuote } from 'lucide-react';

interface Props {
    student: SimpleStudent;
    initialMode: 'advice' | 'praise' | 'scold';
    currentDate?: string;
    onClose: () => void;
    onApplyResult: (result: InteractionFeedbackResult) => void;
}

export const StudentAdviceModal: React.FC<Props> = ({
    student,
    initialMode,
    currentDate,
    onClose,
    onApplyResult
}) => {
    const [mode, setMode] = useState<'advice' | 'praise' | 'scold' | 'feedback'>(initialMode);
    const [feedback, setFeedback] = useState<InteractionFeedbackResult | null>(null);

    const analysis: StudentProfileAnalysis = getStudentProfileAnalysis(student);

    // 훈계 모드로 바로 들어온 경우 즉시 실행
    React.useEffect(() => {
        if (initialMode === 'scold') {
            const res = executeScoldInteraction(student, currentDate);
            setFeedback(res);
            setMode('feedback');
        }
    }, [initialMode, student, currentDate]);

    const handleSelectAdvice = (option: AdviceOption) => {
        const res = executeAdviceInteraction(student, option, currentDate);
        setFeedback(res);
        setMode('feedback');
    };

    const handleSelectPraise = (option: PraiseOption) => {
        const res = executePraiseInteraction(student, option, currentDate);
        setFeedback(res);
        setMode('feedback');
    };

    const handleConfirmFeedback = () => {
        if (feedback) {
            onApplyResult(feedback);
        }
        onClose();
    };

    return (
        <div id="student-advice-overlay" className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
            <div 
                id="student-advice-container"
                className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-md max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
            >
                {/* 헤더 */}
                <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-950/60">
                    <div className="flex items-center space-x-2">
                        {mode === 'advice' && <Compass size={18} className="text-blue-400" />}
                        {mode === 'praise' && <Award size={18} className="text-amber-400" />}
                        {mode === 'feedback' && <CheckCircle size={18} className="text-emerald-400" />}
                        <h3 className="font-bold text-base text-slate-100">
                            {mode === 'advice' && '교관의 맞춤형 조언'}
                            {mode === 'praise' && '따뜻한 칭찬과 격려'}
                            {mode === 'feedback' && (feedback?.reactionTitle || '지도 결과')}
                        </h3>
                    </div>
                    <button
                        id="student-advice-close-btn"
                        onClick={onClose}
                        className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* 본문 스크롤 영역 */}
                <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-slate-300">
                    {/* 상단 학생 요약 바 */}
                    <div className="flex items-center gap-3 bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                        <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 overflow-hidden shrink-0">
                            <img
                                src={student.visualUrl}
                                alt={student.name}
                                className="w-full h-full object-cover"
                                referrerPolicy="no-referrer"
                            />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                                <span className="font-bold text-sm text-white truncate">{student.name}</span>
                                <span className="text-[11px] font-semibold text-amber-400 bg-amber-950/40 px-2 py-0.5 rounded">
                                    {student.age}
                                </span>
                            </div>
                            <p className="text-[11px] text-slate-400 truncate mt-0.5">
                                성격: {student.personality} • 호감도: ♥ {student.affection}
                            </p>
                        </div>
                    </div>

                    {/* 조언 선택 모드 */}
                    {mode === 'advice' && (
                        <div className="space-y-3">
                            {/* 학생의 고민 요약 안내 */}
                            <div className="bg-blue-950/30 border border-blue-800/40 p-3 rounded-xl space-y-1">
                                <div className="flex items-center gap-1.5 text-blue-400 font-bold text-xs">
                                    <Sparkles size={14} />
                                    <span>학생의 현재 훈련 고민</span>
                                </div>
                                <p className="text-xs text-slate-200 font-medium">
                                    "{analysis.worryTitle}"
                                </p>
                                <p className="text-[11px] text-slate-400 leading-normal">
                                    {analysis.worryDetail}
                                </p>
                                <p className="text-[10px] text-blue-300 font-semibold pt-1">
                                    💡 힌트: {analysis.adviceTip}
                                </p>
                            </div>

                            <p className="text-xs font-bold text-slate-300 pt-1">전수할 조언을 선택하세요:</p>

                            <div className="space-y-2">
                                {ADVICE_OPTIONS.map((opt) => (
                                    <button
                                        key={opt.id}
                                        onClick={() => handleSelectAdvice(opt)}
                                        className="w-full text-left p-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-blue-500/60 hover:bg-slate-800/60 transition-all group flex flex-col gap-1.5"
                                    >
                                        <div className="flex items-center justify-between">
                                            <span className="font-bold text-xs text-blue-300 group-hover:text-blue-200 flex items-center">
                                                <Compass size={13} className="mr-1.5 text-blue-400" />
                                                {opt.title}
                                            </span>
                                            <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-900/40">
                                                {opt.statGainDesc}
                                            </span>
                                        </div>
                                        <p className="text-[11px] text-slate-400 group-hover:text-slate-200 italic leading-relaxed">
                                            {opt.quote}
                                        </p>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* 칭찬 선택 모드 */}
                    {mode === 'praise' && (
                        <div className="space-y-3">
                            <p className="text-xs font-bold text-slate-300">건넬 칭찬의 방식을 선택하세요:</p>

                            <div className="space-y-2">
                                {PRAISE_OPTIONS.map((opt) => (
                                    <button
                                        key={opt.id}
                                        onClick={() => handleSelectPraise(opt)}
                                        className="w-full text-left p-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-amber-500/60 hover:bg-slate-800/60 transition-all group flex flex-col gap-1.5"
                                    >
                                        <div className="flex items-center justify-between">
                                            <span className="font-bold text-xs text-amber-300 group-hover:text-amber-200 flex items-center">
                                                <Award size={13} className="mr-1.5 text-amber-400" />
                                                {opt.title}
                                            </span>
                                            <span className="text-[10px] font-semibold text-amber-400 bg-amber-950/40 px-2 py-0.5 rounded border border-amber-900/40">
                                                {opt.statGainDesc}
                                            </span>
                                        </div>
                                        <p className="text-[11px] text-slate-400 group-hover:text-slate-200 italic leading-relaxed">
                                            {opt.quote}
                                        </p>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* 피드백(반응 대사) 모드 */}
                    {mode === 'feedback' && feedback && (
                        <div className="space-y-4">
                            {/* 반응 대사 말풍선 */}
                            <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-2xl relative shadow-inner space-y-2">
                                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400">
                                    <MessageSquareQuote size={15} />
                                    <span>{student.name}의 반응</span>
                                </div>
                                <div className="text-xs sm:text-sm text-slate-100 font-medium leading-relaxed whitespace-pre-line bg-slate-900/90 p-3 rounded-xl border border-slate-800/80">
                                    {feedback.dialogue}
                                </div>
                            </div>

                            {/* 능력치 및 관계 변화 박스 */}
                            <div className="bg-emerald-950/20 border border-emerald-800/40 p-3.5 rounded-xl space-y-2">
                                <div className="flex items-center justify-between text-xs font-bold text-emerald-400">
                                    <span className="flex items-center"><Sparkles size={14} className="mr-1"/> 지도 효과 및 성장</span>
                                    <span className="text-[10px] text-emerald-300">{feedback.summary}</span>
                                </div>
                                <div className="flex flex-wrap gap-1.5 pt-1">
                                    {feedback.statChanges.map((change, idx) => (
                                        <span
                                            key={idx}
                                            className="text-xs font-bold text-emerald-300 bg-emerald-950/70 border border-emerald-700/50 px-2.5 py-1 rounded-lg"
                                        >
                                            {change}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* 하단 버튼 바 */}
                <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex justify-end gap-2 shrink-0">
                    {mode === 'feedback' ? (
                        <button
                            id="student-advice-confirm-btn"
                            onClick={handleConfirmFeedback}
                            className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-sm transition-colors flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-950/50"
                        >
                            <CheckCircle size={16} /> 확인 및 지도 완료
                        </button>
                    ) : (
                        <button
                            id="student-advice-cancel-btn"
                            onClick={onClose}
                            className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs transition-colors"
                        >
                            닫기
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
