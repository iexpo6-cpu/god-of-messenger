
import { InterviewData, Character, InterviewQuestion } from './types';

/**
 * [NEW] AI 생성 실패 시 사용할 로컬 인터뷰 데이터 풀
 */

export const LOCAL_INTERVIEW_TEMPLATES = [
    {
        topic: "보직에 대한 포부",
        questions: [
            {
                question: "현재 맡고 계신 보직에 대해 어떻게 생각하시나요?",
                isDirectAnswer: true,
                options: [
                    { text: "제 천직이라고 생각합니다. 더 높은 곳을 향해 정진하겠습니다.", meritGain: 10, repGain: 5, infamyGain: 0, reaction: "기자가 당신의 눈빛에서 진정성을 읽고 고개를 끄덕이며 기록합니다." },
                    { text: "그저 생계를 위한 수단일 뿐입니다. 큰 의미는 없어요.", meritGain: -5, repGain: -5, infamyGain: 0, reaction: "기자가 조금 실망한 듯한 표정을 지으며 다음 질문으로 넘어갑니다." },
                    { text: "이 자리는 제 야망을 위한 발판일 뿐입니다. 곧 더 큰 일을 낼 겁니다.", meritGain: 0, repGain: 10, infamyGain: 5, reaction: "기자가 당신의 야심 찬 발언에 흥미롭다는 듯 미소를 지으며 펜을 놀립니다." }
                ]
            }
        ]
    },
    {
        topic: "최근 행적과 비하인드",
        questions: [
            {
                question: "최근 여러 사건을 해결하셨는데, 가장 기억에 남는 순간은 언제인가요?",
                isDirectAnswer: true,
                options: [
                    { text: "동료들과 힘을 합쳐 위기를 극복했을 때가 가장 기억에 남습니다.", meritGain: 5, repGain: 10, infamyGain: 0, reaction: "기자가 당신의 동료애에 감명받은 듯 따뜻한 미소를 지으며 기록합니다." },
                    { text: "강력한 적을 쓰러뜨리고 전리품을 챙겼을 때의 쾌감이 잊혀지지 않네요.", meritGain: 0, repGain: 5, infamyGain: 2, reaction: "기자가 당신의 호전적인 태도에 약간 긴장하며 받아적습니다." },
                    { text: "사실 그 모든 일들은 제 계획대로 움직인 결과일 뿐입니다.", meritGain: 5, repGain: 5, infamyGain: 5, reaction: "기자가 당신의 치밀함에 감탄하며 안경을 고쳐 씁니다." }
                ]
            }
        ]
    },
    {
        topic: "동료와의 관계",
        questions: [
            {
                question: "함께 활동하는 동료들에 대해 한 말씀 부탁드립니다.",
                isDirectAnswer: true,
                options: [
                    { text: "제 목숨을 맡길 수 있는 소중한 가족 같은 존재들입니다.", meritGain: 10, repGain: 5, infamyGain: 0, reaction: "기자가 훈훈한 분위기에 미소 지으며 인터뷰지에 별표를 칩니다." },
                    { text: "비즈니스 파트너일 뿐입니다. 각자의 역할만 충실하면 그만이죠.", meritGain: -2, repGain: -2, infamyGain: 0, reaction: "기자가 당신의 냉철한 태도에 펜을 멈추고 잠시 당신을 응시합니다." },
                    { text: "그들이 없었다면 지금의 저도 없었을 겁니다. 항상 감사하고 있어요.", meritGain: 5, repGain: 10, infamyGain: 0, reaction: "기자가 당신의 겸손함에 깊은 인상을 받은 듯 고개를 깊게 끄덕입니다." }
                ]
            }
        ]
    }
];

/**
 * 로컬 인터뷰 데이터 생성기
 */
export const generateLocalInterview = (character: Character, skeleton?: InterviewData): InterviewData => {
    const memories = character.memories || [];
    const companions = character.companions || [];
    
    const randomMemory = memories.length > 0 ? memories[Math.floor(Math.random() * memories.length)] : "수많은 전장을 누비며 쌓아온 경험";
    const randomCompanion = companions.length > 0 ? companions[Math.floor(Math.random() * companions.length)] : null;

    const dynamicTemplates = [
        {
            topic: "과거의 기억과 행적",
            questions: [
                {
                    question: `최근 기록에 따르면 '${randomMemory}'라는 일이 있었다고 들었습니다. 당시 심경은 어떠셨나요?`,
                    isDirectAnswer: true,
                    options: [
                        { text: "정말 힘든 순간이었지만, 그만큼 얻은 것도 많았습니다.", meritGain: 5, repGain: 5, infamyGain: 0, reaction: "기자가 당신의 성숙한 태도에 깊은 인상을 받은 듯 고개를 끄덕입니다." },
                        { text: "그저 해야 할 일을 했을 뿐입니다. 특별한 감정은 없어요.", meritGain: 2, repGain: 2, infamyGain: 0, reaction: "기자가 당신의 담담한 반응을 꼼꼼히 기록합니다." },
                        { text: "다시 돌아가고 싶지 않은 끔찍한 기억일 뿐입니다.", meritGain: -2, repGain: -2, infamyGain: 2, reaction: "기자가 당신의 어두운 표정을 살피며 조심스럽게 다음 질문을 준비합니다." }
                    ]
                }
            ]
        },
        ...(randomCompanion ? [{
            topic: "동료와의 유대",
            questions: [
                {
                    question: `동료인 '${randomCompanion.name}'님과 함께 활동하시면서 특별히 기억에 남는 에피소드가 있나요?`,
                    isDirectAnswer: true,
                    options: [
                        { text: "서로의 등을 맡길 수 있는 사이라는 걸 확인한 순간이 가장 기억에 남네요.", meritGain: 10, repGain: 5, infamyGain: 0, reaction: "기자가 두 분의 끈끈한 우정에 감탄하며 미소 짓습니다." },
                        { text: "가끔 의견 차이로 다투기도 하지만, 결국은 서로를 이해하게 되더군요.", meritGain: 5, repGain: 3, infamyGain: 0, reaction: "기자가 인간적인 면모가 느껴지는 답변이라며 흥미로워합니다." },
                        { text: "그저 비즈니스 관계일 뿐입니다. 공과 사는 확실히 구분해야죠.", meritGain: -5, repGain: -5, infamyGain: 0, reaction: "기자가 당신의 차가운 태도에 조금 당황한 기색을 보입니다." }
                    ]
                }
            ]
        }] : []),
        {
            topic: "미래의 비전",
            questions: [
                {
                    question: `${character.job}로서 앞으로 이 세계에 어떤 발자취를 남기고 싶으신가요?`,
                    isDirectAnswer: true,
                    options: [
                        { text: "약한 자들을 지키고 정의를 실현하는 진정한 영웅으로 기억되고 싶습니다.", meritGain: 15, repGain: 10, infamyGain: -5, reaction: "기자가 당신의 고결한 포부에 경의를 표하며 열정적으로 받아적습니다." },
                        { text: "누구도 넘볼 수 없는 압도적인 힘을 가진 자가 되어 세계를 평정하겠습니다.", meritGain: 5, repGain: 15, infamyGain: 10, reaction: "기자가 당신의 패기 넘치는 발언에 전율을 느끼며 펜을 놀립니다." },
                        { text: "그저 조용히 제 할 일을 하며 평범하게 살아가고 싶을 뿐입니다.", meritGain: 0, repGain: -5, infamyGain: -5, reaction: "기자가 의외라는 듯한 표정을 지으며 당신을 다시 한번 쳐다봅니다." }
                    ]
                }
            ]
        }
    ];

    const selectedTemplate = dynamicTemplates[Math.floor(Math.random() * dynamicTemplates.length)];
    
    return {
        id: skeleton?.id || `local_int_${Date.now()}`,
        interviewer: skeleton?.interviewer || "로컬 기자",
        interviewerTitle: skeleton?.interviewerTitle || "지역 신문",
        topic: selectedTemplate.topic,
        questions: selectedTemplate.questions
    };
};
