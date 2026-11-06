import React, { useState } from 'react';
import { Character, SimpleStudent, TournamentPostMatchData, JobType, Stats, CombatStyle, MercenaryRank } from '../types';
import { MessageSquare, ArrowRight, UserPlus, Heart, Award, Shield, User, Sparkles, Check } from 'lucide-react';
import { generateDefaultVisualUrl } from '../utils';

interface Props {
  data: TournamentPostMatchData;
  character: Character;
  onClose: () => void;
  onUpdateCharacter: (newChar: Character, logMsg: string) => void;
}

const TALK_POSITIVE_QUOTES = [
  "대단한 실력이시군요! 당신과 겨룰 수 있어서 큰 영광이었습니다. 다음에도 꼭 다시 대결하고 싶습니다.",
  "정말 멋진 승부였습니다. 당신의 움직임에서 배울 점이 많았습니다. 앞으로 지켜보겠습니다.",
  "분하지만 인정할 수밖에 없네요. 당신처럼 강한 상대를 만난 건 행운이었습니다.",
  "훌륭한 전투 감각입니다! 다음 대회에서도 멋진 활약을 기대하겠습니다."
];

const TALK_NEGATIVE_QUOTES = [
  "큭... 이번엔 방심했을 뿐입니다. 다음번엔 결코 이런 결과가 나오지 않을 겁니다.",
  "말 걸지 마십시오. 패배자에게 동정이라도 베풀 생각입니까? 다음엔 반드시 이깁니다.",
  "칫, 운이 좋았을 뿐이잖아! 다음 무대에서는 내가 널 반드시 꺾어주겠어.",
  "분하군요... 오늘의 치욕은 잊지 않겠습니다. 각오해 두는 게 좋을 겁니다."
];

export const TournamentPostMatchModal: React.FC<Props> = ({
  data,
  character,
  onClose,
  onUpdateCharacter
}) => {
  const [phase, setPhase] = useState<'choice' | 'talk_result' | 'pass_result'>('choice');
  const [dialogueQuote, setDialogueQuote] = useState<string>('');
  const [affectionDelta, setAffectionDelta] = useState<number>(0);
  const [updatedCharacter, setUpdatedCharacter] = useState<Character | null>(null);

  const rawName = data.opponent.name || '상대 선수';
  const cleanName = rawName.replace(/\[.*?\]\s*/g, '').replace(/^(초급|중급|상급|특급|달인|전설|신화|용병)\s*/g, '').trim();
  
  const rawGender = data.opponent.gender || '';
  const opponentGender = (rawGender === 'female' || rawGender === '여' || rawGender === '여성') ? '여성' : '남성';
  const opponentRace = data.opponent.race || character.race || '인간';
  const opponentNation = data.opponent.nation || character.currentLocation?.nation || character.nation || '대한민국';

  const opponentVisual = data.opponent.visualUrl || generateDefaultVisualUrl(cleanName, opponentNation, opponentRace, opponentGender);

  const currentYear = parseInt((character.currentDate || '2000-01-01').substring(0, 4), 10) || 2000;

  const handleTalk = () => {
    // 호감도 랜덤 결정: 50% 확률로 상승 (+5 ~ +15), 50% 확률로 하락 (-5 ~ -15)
    const isPositive = Math.random() >= 0.5;
    const delta = isPositive
      ? Math.floor(Math.random() * 11) + 5
      : -(Math.floor(Math.random() * 11) + 5);

    const quotes = isPositive ? TALK_POSITIVE_QUOTES : TALK_NEGATIVE_QUOTES;
    const quote = quotes[Math.floor(Math.random() * quotes.length)];

    setAffectionDelta(delta);
    setDialogueQuote(quote);

    // 인연 등록 처리 (socialNetwork에 isPastConnection: true)
    const newChar: Character = JSON.parse(JSON.stringify(character));
    if (!newChar.socialNetwork) newChar.socialNetwork = [];

    const existingIdx = newChar.socialNetwork.findIndex(
      s => s.name === cleanName || (data.opponent.id && s.id === data.opponent.id)
    );

    if (existingIdx !== -1) {
      const target = newChar.socialNetwork[existingIdx];
      target.affection = Math.max(-100, Math.min(100, (target.affection || 0) + delta));
      target.isPastConnection = true;
      if (opponentVisual) target.appearance = opponentVisual;
      newChar.socialNetwork[existingIdx] = target;
    } else {
      const newPastConnection: SimpleStudent = {
        id: data.opponent.id || `past_npc_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        name: cleanName,
        age: `${16 + Math.min(Math.floor(data.opponent.level / 10), 15)}세`,
        gender: opponentGender,
        race: opponentRace,
        nation: opponentNation,
        level: data.opponent.level || 10,
        personality: isPositive ? '호의적' : '경쟁적',
        appearance: opponentVisual,
        visualUrl:opponentVisual,
        stats: data.opponent.stats || {
          str: 20, def: 20, int: 20, agi: 20, wis: 20, ctrl: 20, hp: 200, maxHp: 200, mp: 100, maxMp: 100
        },
        affection: delta,
        shinryokuType: data.opponent.shinryokuType || '무속성',
        isPastConnection: true,
        classType: data.opponent.combatStyle || CombatStyle.SWORDSMAN,
        job: data.opponent.job || (data.tournamentType === 'school' ? JobType.STUDENT : JobType.MERCENARY),
        metYear: currentYear,
        chatHistory: [
          { role: 'model', text: quote }
        ],
        memories: [`${data.tournamentName} ${data.roundLabel}에서 대결 후 대화를 나눔.`]
      };
      newChar.socialNetwork.push(newPastConnection);
    }

    setUpdatedCharacter(newChar);
    setPhase('talk_result');
  };

  const handlePass = () => {
    // 그냥 지나간다: 과거 인연으로 등록하지 않음
    setPhase('pass_result');
  };

  const handleConfirmTalk = () => {
    if (updatedCharacter) {
      const logMsg = `[인연] '${cleanName}'와(과) 대화를 나누었습니다. (호감도 ${affectionDelta > 0 ? `+${affectionDelta}` : affectionDelta}, 인연등록)`;
      onUpdateCharacter(updatedCharacter, logMsg);
    }
    onClose();
  };

  const handleConfirmPass = () => {
    const logMsg = `[토너먼트] 경기를 마치고 '${cleanName}'을(를) 뒤로한 채 경기장을 떠났습니다.`;
    onUpdateCharacter(character, logMsg);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[160] flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-4 animate-in fade-in">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-md p-4 sm:p-6 shadow-2xl flex flex-col relative overflow-hidden">
        {/* 상단 띠 장식 */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-indigo-500 via-amber-500 to-indigo-500" />

        {/* 헤더 */}
        <div className="flex items-center justify-between mb-4 mt-1 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white leading-tight">
                {data.tournamentName} {data.roundLabel} 승리
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-400">경기 후 상황</p>
            </div>
          </div>
          <span className="text-[10px] sm:text-xs px-2.5 py-1 rounded-full bg-indigo-950/80 text-indigo-300 border border-indigo-700/50 font-semibold">
            {data.tournamentType === 'school' ? '학교 토너먼트' : '용병 토너먼트'}
          </span>
        </div>

        {/* 1단계: 선택 화면 */}
        {phase === 'choice' && (
          <div className="flex flex-col gap-4">
            {/* 상대방 프로필 카드 */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 flex items-center gap-3.5">
              <div className="relative shrink-0">
                <img
                  src={opponentVisual}
                  alt={cleanName}
                  referrerPolicy="no-referrer"
                  className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl object-cover border border-slate-700 shadow-md bg-slate-900"
                />
                <span className="absolute -bottom-1 -right-1 text-[9px] px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-amber-300 font-bold">
                  Lv.{data.opponent.level}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm sm:text-base font-bold text-white truncate">{cleanName}</span>
                </div>
                <div className="text-[11px] sm:text-xs text-slate-400 mt-0.5 space-y-0.5">
                  <p className="truncate">
                    {data.opponent.nation || character.nation} · {data.opponent.race || '인간'}
                  </p>
                  <p className="text-indigo-300 truncate">
                    {data.opponent.job || (data.tournamentType === 'school' ? '학생' : '용병')} · {data.opponent.shinryokuType || '무속성'}
                  </p>
                </div>
              </div>
            </div>

            {/* 설명 텍스트 */}
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-3 text-xs sm:text-sm text-slate-300 leading-relaxed">
              <p className="text-slate-200 font-medium mb-1">
                치열한 경기 끝에 승리하였습니다.
              </p>
              <p className="text-slate-400 text-xs">
                패배한 상대 선수가 거친 숨을 몰아쉬며 경기장 출구 쪽으로 향하고 있습니다. 다가가 이야기를 나누시겠습니까, 아니면 그냥 지나가시겠습니까?
              </p>
            </div>

            {/* 선택지 버튼들 (모바일 최적화 48px 이상 터치 영역) */}
            <div className="flex flex-col gap-2.5 mt-1">
              <button
                type="button"
                onClick={handleTalk}
                className="w-full min-h-[48px] py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] text-white font-bold text-sm sm:text-base flex items-center justify-center gap-2 border border-indigo-400/40 shadow-lg shadow-indigo-950/50 transition-all cursor-pointer"
              >
                <MessageSquare className="w-4 h-4" />
                <span>이야기를 나눈다</span>
              </button>
              <button
                type="button"
                onClick={handlePass}
                className="w-full min-h-[48px] py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-[0.98] text-slate-300 hover:text-white font-bold text-sm sm:text-base flex items-center justify-center gap-2 border border-slate-700 transition-all cursor-pointer"
              >
                <ArrowRight className="w-4 h-4" />
                <span>그냥 지나간다</span>
              </button>
            </div>
          </div>
        )}

        {/* 2단계: 대화 결과 화면 */}
        {phase === 'talk_result' && (
          <div className="flex flex-col gap-4">
            {/* 상대방 대사 박스 */}
            <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-4 flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <img
                  src={opponentVisual}
                  alt={cleanName}
                  referrerPolicy="no-referrer"
                  className="w-10 h-10 rounded-full object-cover border border-slate-700"
                />
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-white">{cleanName}</h4>
                  <span className="text-[10px] text-slate-400">경기 후 반응</span>
                </div>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-lg p-3 text-xs sm:text-sm text-slate-200 italic leading-relaxed">
                "{dialogueQuote}"
              </div>
            </div>

            {/* 결과 알림 태그들 */}
            <div className="grid grid-cols-2 gap-2">
              <div className={`p-3 rounded-xl border flex flex-col items-center justify-center text-center ${
                affectionDelta > 0
                  ? 'bg-emerald-950/50 border-emerald-500/50 text-emerald-300'
                  : 'bg-rose-950/50 border-rose-500/50 text-rose-300'
              }`}>
                <span className="text-[10px] text-slate-400 font-semibold mb-0.5">호감도 변동</span>
                <span className="text-sm sm:text-base font-bold">
                  {affectionDelta > 0 ? `+${affectionDelta}` : affectionDelta}
                </span>
              </div>
              <div className="p-3 rounded-xl border border-indigo-500/40 bg-indigo-950/40 flex flex-col items-center justify-center text-center">
                <span className="text-[10px] text-slate-400 font-semibold mb-0.5">인연 상태</span>
                <span className="text-xs sm:text-sm font-bold text-indigo-200 flex items-center gap-1">
                  <UserPlus className="w-3.5 h-3.5 text-indigo-400" />
                  인연 등록
                </span>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 text-center">
              상대방이 인연 목록에 등록되었습니다.
            </p>

            <button
              type="button"
              onClick={handleConfirmTalk}
              className="w-full min-h-[48px] py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] text-white font-bold text-sm sm:text-base flex items-center justify-center gap-2 border border-indigo-400/40 shadow-lg shadow-indigo-950/50 transition-all cursor-pointer mt-1"
            >
              <Check className="w-4 h-4" />
              <span>확인</span>
            </button>
          </div>
        )}

        {/* 3단계: 그냥 지나감 결과 화면 */}
        {phase === 'pass_result' && (
          <div className="flex flex-col gap-4">
            <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-4 text-center">
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed mb-2">
                상대에게 말을 걸지 않고 조용히 경기장을 빠져나왔습니다.
              </p>
              <span className="inline-block text-[11px] sm:text-xs text-slate-500 bg-slate-900 border border-slate-800 px-3 py-1 rounded-full">
                인연 목록에 등록되지 않았습니다.
              </span>
            </div>

            <button
              type="button"
              onClick={handleConfirmPass}
              className="w-full min-h-[48px] py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-[0.98] text-white font-bold text-sm sm:text-base flex items-center justify-center gap-2 border border-slate-700 transition-all cursor-pointer mt-1"
            >
              <Check className="w-4 h-4" />
              <span>확인</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
export default TournamentPostMatchModal;
