import React, { useState } from 'react';
import { Stats, SimpleStudent, Quest } from '../types';
import { BookOpen, Check, HelpCircle } from 'lucide-react';

interface Props {
    instructorQuest: Quest;
    onComplete: (questId: string, statGains: Partial<Stats>) => void;
    onClose: () => void;
}

interface Question {
    text: string;
    options: {
        text: string;
        stat: keyof Stats;
        value: number;
    }[];
}

const QUESTIONS: Question[] = [
    {
        text: "전투 중 가장 중요한 가치는 무엇인가요?",
        options: [
            { text: "압도적인 파괴력", stat: "str", value: 2 },
            { text: "철벽같은 방어", stat: "def", value: 2 },
            { text: "번개같은 신속함", stat: "agi", value: 2 },
            { text: "치밀한 전략", stat: "int", value: 2 },
            { text: "끈질긴 생명력", stat: "hp", value: 10 }
        ]
    },
    {
        text: "적의 약점을 발견했을 때 어떻게 행동해야 할까요?",
        options: [
            { text: "즉시 정밀 타격", stat: "agi", value: 2 },
            { text: "강력한 일격으로 분쇄", stat: "str", value: 2 },
            { text: "동료에게 알리고 협공", stat: "int", value: 2 },
            { text: "반격을 대비하며 신중히", stat: "def", value: 2 },
            { text: "약점을 파고들어 소모전", stat: "hp", value: 10 }
        ]
    },
    {
        text: "동료가 위기에 처했을 때 당신의 선택은?",
        options: [
            { text: "방패가 되어 대신 맞는다", stat: "hp", value: 10 },
            { text: "적의 주의를 끌어 도발", stat: "def", value: 2 },
            { text: "적을 빠르게 처치해 구출", stat: "str", value: 2 },
            { text: "후방에서 지원 마법/전술", stat: "int", value: 2 },
            { text: "빠르게 접근해 안전지대로", stat: "agi", value: 2 }
        ]
    },
    {
        text: "강력한 보스를 상대할 때 가장 필요한 것은?",
        options: [
            { text: "패턴 분석과 지략", stat: "int", value: 2 },
            { text: "지치지 않는 체력", stat: "hp", value: 10 },
            { text: "빈틈을 노리는 속도", stat: "agi", value: 2 },
            { text: "공격을 버텨내는 맷집", stat: "def", value: 2 },
            { text: "한 방에 끝내는 위력", stat: "str", value: 2 }
        ]
    },
    {
        text: "수련 중 가장 집중해야 할 부분은?",
        options: [
            { text: "근력 강화 훈련", stat: "str", value: 2 },
            { text: "명상과 이론 공부", stat: "int", value: 2 },
            { text: "반사 신경 훈련", stat: "agi", value: 2 },
            { text: "방어 기술 연마", stat: "def", value: 2 },
            { text: "기초 체력 증진", stat: "hp", value: 10 }
        ]
    },
    {
        text: "전투 불능 직전의 상황에서 어떻게 하시겠습니까?",
        options: [
            { text: "최후의 일격을 가한다", stat: "str", value: 2 },
            { text: "정신력으로 버틴다", stat: "hp", value: 10 },
            { text: "회피하며 기회를 엿본다", stat: "agi", value: 2 },
            { text: "방어 태세로 전환", stat: "def", value: 2 },
            { text: "탈출 경로를 계산한다", stat: "int", value: 2 }
        ]
    },
    {
        text: "무기를 선택할 때 가장 중요하게 보는 것은?",
        options: [
            { text: "무게와 타격감", stat: "str", value: 2 },
            { text: "마력 전도율", stat: "int", value: 2 },
            { text: "균형과 속도", stat: "agi", value: 2 },
            { text: "내구성과 방어력", stat: "def", value: 2 },
            { text: "사용자의 부담 경감", stat: "hp", value: 10 }
        ]
    },
    {
        text: "함정에 빠졌을 때 첫 번째 조치는?",
        options: [
            { text: "힘으로 파괴하고 탈출", stat: "str", value: 2 },
            { text: "구조를 파악해 해제", stat: "int", value: 2 },
            { text: "민첩하게 회피", stat: "agi", value: 2 },
            { text: "피해를 최소화하며 버팀", stat: "def", value: 2 },
            { text: "충격을 온몸으로 견딤", stat: "hp", value: 10 }
        ]
    },
    {
        text: "승리 후 가장 먼저 해야 할 일은?",
        options: [
            { text: "전리품 챙기기", stat: "str", value: 2 },
            { text: "전투 복기 및 분석", stat: "int", value: 2 },
            { text: "주변 경계 및 정찰", stat: "agi", value: 2 },
            { text: "장비 점검 및 수리", stat: "def", value: 2 },
            { text: "부상 치료 및 휴식", stat: "hp", value: 10 }
        ]
    },
    {
        text: "진정한 강함이란 무엇이라고 생각하나요?",
        options: [
            { text: "누구도 꺾지 못하는 힘", stat: "str", value: 2 },
            { text: "세상을 꿰뚫는 지혜", stat: "int", value: 2 },
            { text: "누구보다 빠른 행동", stat: "agi", value: 2 },
            { text: "모두를 지키는 방패", stat: "def", value: 2 },
            { text: "결코 쓰러지지 않는 의지", stat: "hp", value: 10 }
        ]
    }
];

const LectureModal: React.FC<Props> = ({ instructorQuest, onComplete, onClose }) => {
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [accumulatedGains, setAccumulatedGains] = useState<Partial<Stats>>({
        str: 0, int: 0, def: 0, agi: 0, hp: 0
    });

    const handleOptionSelect = (stat: keyof Stats, value: number) => {
        const newGains = { ...accumulatedGains };
        newGains[stat] = (newGains[stat] || 0) + value;
        setAccumulatedGains(newGains);

        if (currentQuestionIndex < QUESTIONS.length - 1) {
            setCurrentQuestionIndex(currentQuestionIndex + 1);
        } else {
            // All questions answered
            finishLecture(newGains);
        }
    };

    const finishLecture = (finalGains: Partial<Stats>) => {
        // Return the accumulated gains from the quiz choices
        onComplete(instructorQuest.id, finalGains);
    };

    const currentQuestion = QUESTIONS[currentQuestionIndex];

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-amber-500/50 rounded-2xl max-w-lg w-full p-6 shadow-2xl shadow-amber-500/20">
                <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center text-amber-400">
                        <BookOpen size={24} className="mr-2"/>
                        <h3 className="text-xl font-bold">강의 진행: 질문 {currentQuestionIndex + 1}/10</h3>
                    </div>
                    <div className="text-xs text-slate-500 font-mono">
                        {Math.round(((currentQuestionIndex) / QUESTIONS.length) * 100)}% 완료
                    </div>
                </div>

                <div className="mb-8">
                    <div className="flex items-start gap-3 p-4 bg-slate-800/50 rounded-xl border border-slate-700">
                        <HelpCircle size={20} className="text-amber-500 mt-1 shrink-0"/>
                        <p className="text-lg text-slate-200 font-medium leading-relaxed">
                            {currentQuestion.text}
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-3">
                    {currentQuestion.options.map((option, idx) => (
                        <button
                            key={idx}
                            onClick={() => handleOptionSelect(option.stat, option.value)}
                            className="w-full p-4 text-left bg-slate-800 hover:bg-amber-900/30 border border-slate-700 hover:border-amber-500/50 rounded-xl text-slate-300 hover:text-amber-200 transition-all group flex items-center"
                        >
                            <span className="w-8 h-8 rounded-full bg-slate-700 group-hover:bg-amber-700 flex items-center justify-center text-xs font-bold mr-4 shrink-0 transition-colors">
                                {idx + 1}
                            </span>
                            <span className="text-sm font-medium">{option.text}</span>
                        </button>
                    ))}
                </div>

                <div className="mt-8 pt-6 border-t border-slate-800">
                    <p className="text-xs text-slate-500 text-center italic">
                        당신의 답변은 학생들의 성장 방향에 직접적인 영향을 미칩니다.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default LectureModal;
