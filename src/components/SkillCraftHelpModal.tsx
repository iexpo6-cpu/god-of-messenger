import React, { useState } from 'react';
import { X, HelpCircle, Shield, Sparkles, CheckCircle2, ChevronRight, BookOpen, AlertCircle, Skull } from 'lucide-react';
import { ClassTier } from '../types';

interface SkillCraftHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentLevel?: number;
  currentTier?: string;
}

interface TierCraftInfo {
  tier: ClassTier;
  name: string;
  badgeColor: string;
  borderColor: string;
  bgColor: string;
  textColor: string;
  unlockLevel: number;
  maxSkillsText: string;
  milestones: { level: number; slot: number }[];
  passiveLimitText: string;
  buffLimitText: string;
  maxPowerRatioText: string;
  mpReductionText: string;
  shardCostText: string;
  note?: string;
}

const TIER_CRAFT_DATA: TierCraftInfo[] = [
  {
    tier: ClassTier.NONE,
    name: '기본 (미해방)',
    badgeColor: 'bg-slate-800 text-slate-300 border-slate-700',
    borderColor: 'border-slate-700',
    bgColor: 'bg-slate-900/60',
    textColor: 'text-slate-300',
    unlockLevel: 10,
    maxSkillsText: '최대 2개',
    milestones: [
      { level: 10, slot: 1 },
      { level: 20, slot: 2 }
    ],
    passiveLimitText: '최대 1개',
    buffLimitText: '최대 1종',
    maxPowerRatioText: '100%',
    mpReductionText: '레벨당 -10 MP',
    shardCostText: '5개',
    note: '초기 모험자 단계로 기본적인 물리 및 마법 스킬을 습득할 수 있습니다.'
  },
  {
    tier: ClassTier.FIRST,
    name: '퍼스트 클래스',
    badgeColor: 'bg-amber-950/80 text-amber-300 border-amber-800/60',
    borderColor: 'border-amber-700/50',
    bgColor: 'bg-amber-950/20',
    textColor: 'text-amber-300',
    unlockLevel: 30,
    maxSkillsText: '최대 4개',
    milestones: [
      { level: 30, slot: 1 },
      { level: 50, slot: 2 },
      { level: 70, slot: 3 },
      { level: 90, slot: 4 }
    ],
    passiveLimitText: '최대 2개',
    buffLimitText: '최대 1종',
    maxPowerRatioText: '150%',
    mpReductionText: '레벨당 -10 MP',
    shardCostText: '5개',
    note: '퍼스트 클래스 전직 후 20레벨 간격으로 새 스킬 슬롯이 해금됩니다.'
  },
  {
    tier: ClassTier.SECOND,
    name: '세컨드 클래스',
    badgeColor: 'bg-cyan-950/80 text-cyan-300 border-cyan-800/60',
    borderColor: 'border-cyan-700/50',
    bgColor: 'bg-cyan-950/20',
    textColor: 'text-cyan-300',
    unlockLevel: 100,
    maxSkillsText: '최대 5개',
    milestones: [
      { level: 100, slot: 1 },
      { level: 140, slot: 2 },
      { level: 180, slot: 3 },
      { level: 220, slot: 4 },
      { level: 260, slot: 5 }
    ],
    passiveLimitText: '최대 2개',
    buffLimitText: '최대 2종 복합',
    maxPowerRatioText: '500%',
    mpReductionText: '레벨당 -20 MP',
    shardCostText: '10개',
    note: '세컨드 클래스 전직 후 40레벨 간격으로 새 스킬 슬롯이 해금됩니다.'
  },
  {
    tier: ClassTier.LAST,
    name: '라스트 클래스',
    badgeColor: 'bg-purple-950/80 text-purple-300 border-purple-800/60',
    borderColor: 'border-purple-700/50',
    bgColor: 'bg-purple-950/20',
    textColor: 'text-purple-300',
    unlockLevel: 300,
    maxSkillsText: '최대 7개',
    milestones: [
      { level: 300, slot: 1 },
      { level: 400, slot: 2 },
      { level: 500, slot: 3 },
      { level: 600, slot: 4 },
      { level: 700, slot: 5 },
      { level: 800, slot: 6 },
      { level: 900, slot: 7 }
    ],
    passiveLimitText: '최대 3개',
    buffLimitText: '최대 3종 복합',
    maxPowerRatioText: '2,000%',
    mpReductionText: '레벨당 -50 MP',
    shardCostText: '30개',
    note: '라스트 클래스 전직(기지 잠재력 돌파소 Lv.300) 후 100레벨 간격으로 새 스킬 슬롯이 해금됩니다.'
  },
  {
    tier: ClassTier.FINAL,
    name: '파이널 클래스',
    badgeColor: 'bg-rose-950/80 text-rose-300 border-rose-800/60',
    borderColor: 'border-rose-700/50',
    bgColor: 'bg-rose-950/20',
    textColor: 'text-rose-300',
    unlockLevel: 1000,
    maxSkillsText: '무제한 지속 확장',
    milestones: [
      { level: 1000, slot: 1 },
      { level: 1200, slot: 2 },
      { level: 1400, slot: 3 },
      { level: 1600, slot: 4 }
    ],
    passiveLimitText: '슬롯 내 무제한',
    buffLimitText: '최대 4종 복합',
    maxPowerRatioText: '10,000%',
    mpReductionText: '레벨당 -100 MP',
    shardCostText: '100개',
    note: '1000레벨 해금 후 캐릭터 레벨이 200 상승할 때마다 스킬 슬롯이 계속해서 1개씩 영구 추가됩니다. 1000레벨 단위(2000레벨, 3000레벨 등) 증가 시 6번째 스킬 슬롯부터 최대 비율(버프, 공격, 패시브)이 단계별로 상향됩니다. (디버프는 최대 90% 엄격 제한)'
  }
];

export const SkillCraftHelpModal: React.FC<SkillCraftHelpModalProps> = ({
  isOpen,
  onClose,
  currentLevel = 1,
  currentTier = ClassTier.NONE
}) => {
  const [selectedTier, setSelectedTier] = useState<ClassTier | 'ALL'>('ALL');

  if (!isOpen) return null;

  const displayList = selectedTier === 'ALL'
    ? TIER_CRAFT_DATA
    : TIER_CRAFT_DATA.filter(t => t.tier === selectedTier);

  return (
    <div
      id="skill-craft-help-modal-backdrop"
      className="fixed inset-0 z-[300] flex items-center justify-center bg-black/85 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="skill-craft-help-modal"
        className="bg-slate-900 border border-amber-500/40 rounded-2xl w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
      >
        {/* 모달 상단 헤더 */}
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-950 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
              <BookOpen size={20} />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-100 flex items-center gap-1.5">
                클래스별 스킬 제작 한도 안내
              </h3>
              <p className="text-xs text-slate-400">
                각 클래스 단계와 캐릭터 레벨에 따른 스킬 제작 슬롯 규정
              </p>
            </div>
          </div>
          <button
            type="button"
            id="btn-close-skill-craft-help"
            onClick={onClose}
            className="w-11 h-11 flex items-center justify-center rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
            aria-label="닫기"
          >
            <X size={20} />
          </button>
        </div>

        {/* 현재 내 캐릭터 현황 바 */}
        <div className="px-4 py-2.5 bg-slate-950/70 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 text-slate-300">
            <span className="text-slate-400">현재 캐릭터 레벨:</span>
            <span className="font-bold text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800/40 font-mono">
              Lv.{currentLevel}
            </span>
          </div>
          <span className="text-[11px] text-slate-400">
            각 클래스 시련을 완료하고 요구 레벨을 달성하면 슬롯이 열립니다
          </span>
        </div>

        {/* 탭 필터 (모바일 터치 친화적 가로 스크롤) */}
        <div className="p-2.5 bg-slate-950/40 border-b border-slate-800 flex gap-1.5 overflow-x-auto custom-scrollbar shrink-0">
          <button
            type="button"
            onClick={() => setSelectedTier('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors min-h-[36px] ${
              selectedTier === 'ALL'
                ? 'bg-amber-600 text-white shadow-md'
                : 'bg-slate-800/80 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            }`}
          >
            전체 보기
          </button>
          {TIER_CRAFT_DATA.map((item) => (
            <button
              key={item.tier}
              type="button"
              onClick={() => setSelectedTier(item.tier)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors min-h-[36px] ${
                selectedTier === item.tier
                  ? `${item.badgeColor} ring-1 ring-amber-400`
                  : 'bg-slate-800/80 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              {item.name}
            </button>
          ))}
        </div>

        {/* 본문 스크롤 영역 */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 custom-scrollbar flex-1">
          {displayList.map((tierInfo) => {
            const isUnlocked = currentLevel >= tierInfo.unlockLevel;
            return (
              <div
                key={tierInfo.tier}
                className={`rounded-xl border ${tierInfo.borderColor} ${tierInfo.bgColor} p-3.5 sm:p-4 space-y-3 shadow-md`}
              >
                {/* 카드 헤더 */}
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs sm:text-sm font-bold px-2.5 py-0.5 rounded-md border ${tierInfo.badgeColor}`}>
                      {tierInfo.name}
                    </span>
                    <span className="text-xs text-slate-400">
                      최소 개방: <strong className="text-slate-200">Lv.{tierInfo.unlockLevel}</strong>
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-amber-300 bg-amber-950/80 px-2 py-0.5 rounded border border-amber-800/50">
                      {tierInfo.maxSkillsText}
                    </span>
                  </div>
                </div>

                {/* 슬롯 해금 마일스톤 */}
                <div>
                  <span className="text-[11px] font-bold text-slate-400 mb-1.5 block">
                    레벨별 스킬 슬롯 개방 단계:
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                    {tierInfo.milestones.map((m) => {
                      const reached = currentLevel >= m.level;
                      return (
                        <div
                          key={m.slot}
                          className={`px-2 py-1.5 rounded-lg border text-xs flex items-center justify-between ${
                            reached
                              ? 'bg-emerald-950/50 border-emerald-700/50 text-emerald-300'
                              : 'bg-slate-950/70 border-slate-800 text-slate-400'
                          }`}
                        >
                          <span className="font-mono font-bold text-[11px]">
                            {m.slot}번째 슬롯
                          </span>
                          <span className={`font-mono text-[11px] font-bold ${reached ? 'text-emerald-400' : 'text-slate-400'}`}>
                            Lv.{m.level}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  {tierInfo.tier === ClassTier.FINAL && (
                    <p className="text-[11px] text-rose-300/90 mt-1.5 leading-relaxed">
                      ※ Lv.1600 이후에도 200레벨마다 슬롯이 지속적으로 1개씩 추가 해방됩니다 (Lv.1800, Lv.2000 ...)
                    </p>
                  )}
                </div>

                {/* 제한 및 한도 세부 사항 그리드 */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 bg-slate-950/70 p-2.5 rounded-lg border border-slate-800 text-center">
                  <div>
                    <span className="text-[10px] text-slate-400 block mb-0.5">패시브 제한</span>
                    <span className="text-xs font-bold text-slate-200">{tierInfo.passiveLimitText}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block mb-0.5">버프 복합 효과</span>
                    <span className="text-xs font-bold text-slate-200">{tierInfo.buffLimitText}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block mb-0.5">최대 위력 배율</span>
                    <span className="text-xs font-bold text-amber-400 font-mono">{tierInfo.maxPowerRatioText}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block mb-0.5">레벨업 MP감소</span>
                    <span className="text-xs font-bold text-blue-400 font-mono">{tierInfo.mpReductionText}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block mb-0.5">타속성 조각 비용</span>
                    <span className="text-xs font-bold text-cyan-400 font-mono">{tierInfo.shardCostText}</span>
                  </div>
                </div>

                {/* 설명 노트 */}
                {tierInfo.note && (
                  <p className="text-[11px] text-slate-400 leading-relaxed bg-slate-950/40 px-2.5 py-1.5 rounded border border-slate-800/60">
                    💡 {tierInfo.note}
                  </p>
                )}
              </div>
            );
          })}

          {/* 상태이상 및 버프/디버프 지속시간 규정 안내 */}
          <div className="bg-slate-950/80 border border-purple-800/60 rounded-xl p-3.5 space-y-2 text-xs">
            <h4 className="font-bold text-purple-300 flex items-center gap-1.5 text-xs">
              <Skull size={14} className="text-purple-400" />
              <span>버프 / 디버프 및 상태이상 지속 턴 규정</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
              <div className="bg-slate-900/80 p-2.5 rounded-lg border border-purple-900/50 space-y-1">
                <div className="font-bold text-purple-300 border-b border-purple-900/50 pb-1">
                  버프 및 디버프 전용 스킬 (티어별)
                </div>
                <ul className="space-y-0.5 text-slate-300">
                  <li>• 퍼스트 클래스: <strong className="text-amber-400">3턴</strong></li>
                  <li>• 세컨드 클래스: <strong className="text-cyan-400">4턴</strong></li>
                  <li>• 라스트 클래스: <strong className="text-purple-400">5턴</strong></li>
                  <li>• 파이널 클래스: <strong className="text-rose-400">6턴 (최대)</strong></li>
                </ul>
              </div>

              <div className="bg-slate-900/80 p-2.5 rounded-lg border border-indigo-900/50 space-y-1">
                <div className="font-bold text-indigo-300 border-b border-indigo-900/50 pb-1">
                  공격 스킬 부가 상태이상
                </div>
                <ul className="space-y-0.5 text-slate-300">
                  <li>• 1차~3차 공격 스킬: <strong className="text-indigo-300">2~3턴</strong></li>
                  <li>• 파이널 클래스 공격 스킬: <strong className="text-rose-400">3~4턴</strong></li>
                  <li className="text-[10px] text-slate-400 pt-0.5">※ 제어계 상태이상(빙결, 속박, 감전 등)은 1턴 감소 적용</li>
                </ul>
              </div>
            </div>
          </div>

          {/* 인연 스킬 및 전투계열 부가 설명 */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3.5 space-y-2 text-xs">
            <h4 className="font-bold text-slate-300 flex items-center gap-1.5 text-xs">
              <Sparkles size={14} className="text-pink-400" />
              <span>특수 스킬 제작 규칙</span>
            </h4>
            <ul className="space-y-1.5 text-slate-400 text-[11px] leading-relaxed">
              <li className="flex items-start gap-1.5">
                <span className="text-pink-400 font-bold">•</span>
                <span>
                  <strong className="text-slate-200">인연 스킬:</strong> 인연 스킬북에서 동료와 호감도 90 이상 및 인연 기간을 달성하여 최대 1개(배우자는 최대 2개) 제작 가능합니다.
                </span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-amber-400 font-bold">•</span>
                <span>
                  <strong className="text-slate-200">전투계열 스킬:</strong> 전투계열 훈련 및 장착을 통해 즉시 고유 스킬과 패시브가 부여되며, 스킬북 제작 슬롯을 소모하지 않습니다.
                </span>
              </li>
            </ul>
          </div>

          {/* 파이널 클래스 레벨별 비율 상향 및 악용 방지 규정 안내 */}
          <div className="bg-gradient-to-br from-rose-950/40 via-slate-900/80 to-slate-950/90 border border-rose-700/50 rounded-xl p-3.5 space-y-2.5 text-xs">
            <h4 className="font-bold text-rose-300 flex items-center gap-1.5 text-xs">
              <Shield size={14} className="text-rose-400" />
              <span>파이널 클래스 성장 비율 및 슬롯 규정</span>
            </h4>
            <div className="space-y-2 text-[11px] text-slate-300 leading-relaxed">
              <div className="bg-slate-950/70 p-2.5 rounded-lg border border-rose-900/40 space-y-1">
                <div className="font-bold text-rose-200 flex items-center gap-1">
                  <CheckCircle2 size={12} className="text-rose-400" />
                  <span>1000레벨 단위 비율 상향</span>
                </div>
                <p className="text-slate-400">
                  파이널 클래스 해금(1000레벨) 이후 1000레벨이 증가할 때마다(2000레벨, 3000레벨 등) 새로 제작하는 스킬의 최대 비율 상한(공격 위력, 버프 수치, 패시브 수치)이 단계별로 차근차근 확장됩니다.
                </p>
                <ul className="list-disc list-inside text-slate-300 space-y-0.5 pl-1">
                  <li>공격 스킬: 단일 위력 +1000%, 광역 위력 +500%씩 상향</li>
                  <li>버프 스킬: 기본 상한 및 합산 상한 +10%씩 상향</li>
                  <li>패시브 스킬: 스탯 계열 +3%, 전투 계열 +2%씩 상향</li>
                  <li><strong className="text-rose-400">디버프 절대 상한선:</strong> 디버프 스킬은 레벨이 아무리 높아져도 영구적으로 <strong className="text-rose-300">최대 90%</strong>를 초과할 수 없습니다.</li>
                </ul>
              </div>

              <div className="bg-slate-950/70 p-2.5 rounded-lg border border-amber-900/40 space-y-1">
                <div className="font-bold text-amber-200 flex items-center gap-1">
                  <AlertCircle size={12} className="text-amber-400" />
                  <span>악용 방지 슬롯 규정 (6번째 스킬 슬롯부터 적용)</span>
                </div>
                <p className="text-slate-400">
                  1000레벨 구간에서 제작한 초기 5개 스킬을 스킬 잊기로 삭제한 뒤 고레벨에서 높은 비율로 다시 제작하는 악용을 방지하기 위해:
                </p>
                <ul className="list-disc list-inside text-amber-300/90 space-y-0.5 pl-1">
                  <li>1~5번째 슬롯 스킬: 영구적으로 1000레벨 기본 비율만 적용</li>
                  <li>6번째 이후 슬롯 스킬: 캐릭터 레벨 기준 2000레벨 이상 도달 시부터 단계별 상향 비율 적용 가능</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* 모바일 최적화 하단 확인 버튼 */}
        <div className="p-3 sm:p-4 border-t border-slate-800 bg-slate-950 flex justify-end shrink-0">
          <button
            type="button"
            id="btn-confirm-skill-craft-help"
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs sm:text-sm transition-all shadow-md active:scale-98 min-h-[44px] flex items-center justify-center"
          >
            확인
          </button>
        </div>
      </div>
    </div>
  );
};
