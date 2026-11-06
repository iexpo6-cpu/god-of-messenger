import React from 'react';
import { X, GraduationCap, Compass, BookOpen, MapPin, Swords, Heart, Shield, Sparkles, School } from 'lucide-react';
import { Character, JobType } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  character: Character;
  onOpenCity?: () => void;
}

export const TutorialGuideModal: React.FC<Props> = ({
  isOpen,
  onClose,
  character,
  onOpenCity
}) => {
  if (!isOpen || !character) return null;

  const isStudent = character.job === JobType.STUDENT || (character.age && parseInt(character.age, 10) < 20);

  const handleCityAction = () => {
    onClose();
    if (onOpenCity) {
      onOpenCity();
    }
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="w-full max-w-lg bg-slate-900 border border-amber-500/40 rounded-3xl shadow-2xl flex flex-col max-h-[88vh] overflow-hidden text-slate-100"
        onClick={e => e.stopPropagation()}
      >
        {/* 상단 헤더 */}
        <div className="px-5 py-4 bg-gradient-to-r from-slate-950 via-slate-900 to-amber-950/40 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
              <Compass size={18} />
            </div>
            <div>
              <h3 className="text-base font-black text-amber-300 tracking-wide flex items-center gap-1.5">
                모험 시작 길잡이
                <Sparkles size={14} className="text-amber-400" />
              </h3>
              <p className="text-[11px] text-slate-400">
                {character.name}님의 첫 여정을 돕는 안내서입니다.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
            title="닫기"
          >
            <X size={18} />
          </button>
        </div>

        {/* 본문 스크롤 영역 (모바일 최적화) */}
        <div className="p-4 sm:p-5 overflow-y-auto custom-scrollbar space-y-4 text-xs">
          {/* 캐릭터 맞춤 신분 배너 */}
          <div className={`p-4 rounded-2xl border ${isStudent ? 'bg-indigo-950/40 border-indigo-500/40' : 'bg-emerald-950/40 border-emerald-500/40'} flex flex-col gap-2`}>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400">현재 신분 상태</span>
              <span className={`px-2.5 py-0.5 rounded-full font-bold text-[11px] flex items-center gap-1.5 ${isStudent ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-400/30' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30'}`}>
                {isStudent ? <GraduationCap size={13} /> : <Swords size={13} />}
                {isStudent ? '학생 신분' : '자유 모험가'}
              </span>
            </div>
            <p className="text-sm font-black text-white">
              {isStudent ? '학업과 수련을 병행하는 학생의 삶이 시작됩니다!' : '대륙의 부름을 받은 당당한 모험가로서 발을 내딛습니다!'}
            </p>
            <p className="text-slate-300 leading-relaxed text-[11px]">
              {isStudent
                ? `현재 나이 ${character.age}세로 학교에 적을 두고 있습니다. 일과의 기본 중심은 학교 활동이며, 방과 후에는 마을 탐험이나 모험을 병행할 수 있습니다.`
                : `성인 모험가로서 어느 곳에 얽매이지 않고 자유롭게 의뢰를 수행하거나 던전 탐험, 세력 확장을 도모할 수 있습니다.`}
            </p>
          </div>

          {/* 신분별 행동 요령 안내 */}
          {isStudent ? (
            <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 space-y-2.5">
              <div className="flex items-center gap-2 font-bold text-amber-400 text-xs">
                <School size={15} />
                <span>학생 신분 추천 행동 강령</span>
              </div>
              <ul className="space-y-2 text-slate-300 text-[11px] leading-relaxed">
                <li className="flex items-start gap-2">
                  <span className="text-amber-400 font-bold shrink-0">1.</span>
                  <div>
                    <strong className="text-white">학교 방문 및 출석:</strong> 화면 하단의 <strong className="text-amber-300">[도시]</strong> 메뉴를 누른 후 <strong className="text-indigo-300">[학교]</strong>로 들어가 등교할 수 있습니다.
                  </div>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-400 font-bold shrink-0">2.</span>
                  <div>
                    <strong className="text-white">수업 및 훈련:</strong> 교실에서 수업을 듣고 지식을 쌓거나, 연무장에서 기초 신체 스탯을 단련하여 다가올 시험과 전투에 대비하세요.
                  </div>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-400 font-bold shrink-0">3.</span>
                  <div>
                    <strong className="text-white">교우 관계와 동아리:</strong> 같은 반 친구들과 대화하며 인연을 맺고, 관심 있는 동아리에 가입해 특별한 시너지와 추억을 쌓을 수 있습니다.
                  </div>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-400 font-bold shrink-0">4.</span>
                  <div>
                    <strong className="text-white">방과 후 모험:</strong> 학업 후 남는 시간엔 도시 주점, 아르바이트, 인근 던전 사냥터를 돌아보며 용돈과 실전 경험치를 벌 수 있습니다.
                  </div>
                </li>
              </ul>
            </div>
          ) : (
            <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 space-y-2.5">
              <div className="flex items-center gap-2 font-bold text-amber-400 text-xs">
                <Compass size={15} />
                <span>모험가 추천 첫걸음 강령</span>
              </div>
              <ul className="space-y-2 text-slate-300 text-[11px] leading-relaxed">
                <li className="flex items-start gap-2">
                  <span className="text-amber-400 font-bold shrink-0">1.</span>
                  <div>
                    <strong className="text-white">도시 탐색과 용병 길드:</strong> 화면 하단의 <strong className="text-amber-300">[도시]</strong>로 이동하여 용병 길드에서 첫 의뢰를 확인하고 금화와 보상을 얻으세요.
                  </div>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-400 font-bold shrink-0">2.</span>
                  <div>
                    <strong className="text-white">던전 및 사냥:</strong> <strong className="text-emerald-300">[던전]</strong> 메뉴를 통해 초보자용 던전에서 몬스터를 토벌하고 귀중한 장비와 전리품을 파밍하세요.
                  </div>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-400 font-bold shrink-0">3.</span>
                  <div>
                    <strong className="text-white">상점 및 장비 장착:</strong> 상점에서 기본 물약과 방어구를 구비하고, 가방에서 착용하여 전투력을 끌어올리세요.
                  </div>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-400 font-bold shrink-0">4.</span>
                  <div>
                    <strong className="text-white">거점과 세력 구축:</strong> 자금을 모아 거점과 농장, 연구소를 세워 대륙 전역에 영향을 미치는 군주로 발돋움할 수 있습니다.
                  </div>
                </li>
              </ul>
            </div>
          )}

          {/* 공통 모험 팁 */}
          <div className="bg-slate-950/50 border border-slate-800/80 rounded-2xl p-4 space-y-2 text-slate-300">
            <h4 className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
              <BookOpen size={14} />
              <span>핵심 모험 편의 팁</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-[11px]">
              <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                <div className="font-bold text-slate-200 mb-1 flex items-center gap-1">
                  <Shield size={12} className="text-blue-400" /> 휴식과 회복
                </div>
                <p className="text-slate-400 leading-normal">
                  체력이나 마력이 소진되면 [휴식] 버튼으로 안전하게 회복하고 시간을 진행할 수 있습니다.
                </p>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                <div className="font-bold text-slate-200 mb-1 flex items-center gap-1">
                  <Heart size={12} className="text-pink-400" /> 인연과 동료
                </div>
                <p className="text-slate-400 leading-normal">
                  호감도를 쌓아 동료로 영입하면 파티 전투에서 함께 싸우며 강력한 인연 스킬을 발동합니다.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 하단 액션 버튼 */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center gap-2 shrink-0">
          <button
            onClick={handleCityAction}
            className="flex-1 py-3 px-3 rounded-2xl font-bold text-xs bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 flex items-center justify-center gap-1.5 active:scale-98 transition-all"
          >
            <MapPin size={14} />
            {isStudent ? '도시로 가기' : '도시 둘러보기'}
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-3 px-3 rounded-2xl font-bold text-xs bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white shadow-lg active:scale-98 transition-all flex items-center justify-center gap-1.5"
          >
            <Sparkles size={14} />
            모험 시작하기
          </button>
        </div>
      </div>
    </div>
  );
};

export default TutorialGuideModal;
