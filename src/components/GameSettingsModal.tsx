import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, 
  Palette, 
  Settings, 
  Check, 
  Sparkles, 
  Moon, 
  Zap, 
  Play, 
  FastForward, 
  Shield, 
  User, 
  Users, 
  Save, 
  Database,
  Volume2,
  VolumeX,
  Volume1,
  Sliders,
  CheckCircle2,
  Layers,
  Activity,
  Mail,
  CheckSquare,
  Square,
  Bell,
  MessageSquare,
  Swords,
  Heart,
  Info
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  uiTheme: 'classic' | 'dark' | 'holy';
  onChangeTheme: (theme: 'classic' | 'dark' | 'holy') => void;
  combatSpeed?: 'fast' | 'normal';
  onChangeCombatSpeed?: (speed: 'fast' | 'normal') => void;
  defaultPlayerAuto?: boolean;
  onChangeDefaultPlayerAuto?: (val: boolean) => void;
  defaultCompanionAuto?: boolean;
  onChangeDefaultCompanionAuto?: (val: boolean) => void;
  autoSaveEnabled?: boolean;
  onChangeAutoSaveEnabled?: (val: boolean) => void;
  disableSkillEffects?: boolean;
  onChangeDisableSkillEffects?: (val: boolean) => void;
  disableBackdropBlur?: boolean;
  onChangeDisableBackdropBlur?: (val: boolean) => void;
  disableScreenShake?: boolean;
  onChangeDisableScreenShake?: (val: boolean) => void;
  disableCommonCompanionInteraction?: boolean;
  onChangeDisableCommonCompanionInteraction?: (val: boolean) => void;
}

export const ALL_MAILBOX_TAGS = [
  '소식', '시스템', '국왕', '영지', '서신',
  '소문', '제보', '풍문',
  '일상', '대화', '방문',
  '경사', '결혼', '출산', '동료', '인연',
  '전투', '습격', '토벌', '사건', '던전', '전투 돌입', '던전 탐색'
] as const;

export type MailboxTag = typeof ALL_MAILBOX_TAGS[number];
export type MailboxFilterSettings = Record<string, boolean>;

const DEFAULT_MAILBOX_SETTINGS: MailboxFilterSettings = ALL_MAILBOX_TAGS.reduce((acc, tag) => {
  acc[tag] = true;
  return acc;
}, {} as MailboxFilterSettings);

const GameSettingsModalComponent: React.FC<Props> = ({
  isOpen,
  onClose,
  uiTheme,
  onChangeTheme,
  combatSpeed = 'normal',
  onChangeCombatSpeed,
  defaultPlayerAuto = false,
  onChangeDefaultPlayerAuto,
  defaultCompanionAuto = true,
  onChangeDefaultCompanionAuto,
  autoSaveEnabled = false,
  onChangeAutoSaveEnabled,
  disableSkillEffects = false,
  onChangeDisableSkillEffects,
  disableBackdropBlur = false,
  onChangeDisableBackdropBlur,
  disableScreenShake = false,
  onChangeDisableScreenShake,
  disableCommonCompanionInteraction = false,
  onChangeDisableCommonCompanionInteraction,
}) => {
  const [activeSettingsTab, setActiveSettingsTab] = useState<'system' | 'mailbox'>('system');

  // Sound (BGM Volume) State
  const [bgmVolume, setBgmVolume] = useState<number>(() => {
    const saved = localStorage.getItem('game_bgm_volume');
    return saved !== null ? parseInt(saved, 10) : 50;
  });
  const [isMuted, setIsMuted] = useState<boolean>(() => {
    const saved = localStorage.getItem('game_bgm_volume');
    return saved !== null && parseInt(saved, 10) === 0;
  });
  const [lastNonZeroVolume, setLastNonZeroVolume] = useState<number>(50);

  // Mailbox Filter Settings State
  const [mailboxSettings, setMailboxSettings] = useState<MailboxFilterSettings>(() => {
    try {
      const saved = localStorage.getItem('game_mailbox_filter_settings');
      return saved ? { ...DEFAULT_MAILBOX_SETTINGS, ...JSON.parse(saved) } : DEFAULT_MAILBOX_SETTINGS;
    } catch {
      return DEFAULT_MAILBOX_SETTINGS;
    }
  });

  const handleToggleTag = (tag: string) => {
    const isCurrentlyChecked = mailboxSettings[tag] !== false;
    const updated = { ...mailboxSettings, [tag]: !isCurrentlyChecked };
    setMailboxSettings(updated);
    localStorage.setItem('game_mailbox_filter_settings', JSON.stringify(updated));
    window.dispatchEvent(new Event('mailbox_filter_changed'));
  };

  const handleToggleGroupTags = (tags: string[], val: boolean) => {
    const updated = { ...mailboxSettings };
    tags.forEach(t => {
      updated[t] = val;
    });
    setMailboxSettings(updated);
    localStorage.setItem('game_mailbox_filter_settings', JSON.stringify(updated));
    window.dispatchEvent(new Event('mailbox_filter_changed'));
  };

  const handleSetAllMailboxSettings = (val: boolean) => {
    const updated: MailboxFilterSettings = {};
    ALL_MAILBOX_TAGS.forEach(t => {
      updated[t] = val;
    });
    setMailboxSettings(updated);
    localStorage.setItem('game_mailbox_filter_settings', JSON.stringify(updated));
    window.dispatchEvent(new Event('mailbox_filter_changed'));
  };

  // Sync BGM volume with localStorage
  const handleVolumeChange = (newVol: number) => {
    const clamped = Math.max(0, Math.min(100, newVol));
    setBgmVolume(clamped);
    setIsMuted(clamped === 0);
    if (clamped > 0) {
      setLastNonZeroVolume(clamped);
    }
    localStorage.setItem('game_bgm_volume', clamped.toString());
  };

  const toggleMute = () => {
    if (isMuted || bgmVolume === 0) {
      const restoreVol = lastNonZeroVolume > 0 ? lastNonZeroVolume : 50;
      handleVolumeChange(restoreVol);
    } else {
      setLastNonZeroVolume(bgmVolume);
      handleVolumeChange(0);
    }
  };

  if (!isOpen) return null;

  const presets = [
    {
      key: 'classic' as const,
      label: '클래식 블루',
      desc: '차분하고 깊이 있는 네이비 블루 테마',
      icon: <Palette size={18} className="text-blue-400" />,
      previewClass: 'bg-slate-900 border-slate-700 text-slate-200',
      badgeClass: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    },
    {
      key: 'dark' as const,
      label: '얼티밋 다크',
      desc: '칠흑 같은 블랙 기반의 고대비 다크 테마',
      icon: <Moon size={18} className="text-neutral-400" />,
      previewClass: 'bg-[#0a0a0a] border-neutral-800 text-neutral-300',
      badgeClass: 'bg-neutral-500/20 text-neutral-300 border-neutral-500/30',
    },
    {
      key: 'holy' as const,
      label: '신성 오라',
      desc: '금빛 광채와 사자의 신전을 품은 골드 테마',
      icon: <Sparkles size={18} className="text-amber-400 animate-pulse" />,
      previewClass: 'bg-[#1a1206] border-[#5c3e15] text-[#fef3c7]',
      badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    },
  ];

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      {/* Backdrop */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Modal Container */}
      <div 
        id="game-settings-modal"
        className="relative w-full max-w-lg bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden max-h-[88vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-800/90 flex justify-between items-center bg-slate-900/60 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-950 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Settings size={18} />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-slate-100 flex items-center gap-1.5">
                게임 시스템 설정
              </h3>
              <p className="text-[10px] sm:text-[11px] text-slate-400">사운드, 서신함, 전투 템포, 자동 저장 및 테마</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition-all"
            title="닫기"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 bg-slate-900/80 shrink-0">
          <button
            type="button"
            onClick={() => setActiveSettingsTab('system')}
            className={`flex-1 py-2.5 sm:py-3 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all border-b-2 ${
              activeSettingsTab === 'system'
                ? 'border-indigo-500 text-indigo-300 bg-indigo-950/40'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <Sliders size={15} />
            <span>기본 설정</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveSettingsTab('mailbox')}
            className={`flex-1 py-2.5 sm:py-3 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all border-b-2 ${
              activeSettingsTab === 'mailbox'
                ? 'border-amber-500 text-amber-300 bg-amber-950/40'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <Mail size={15} />
            <span>서신함 설정</span>
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-5 custom-scrollbar text-slate-200">

          {activeSettingsTab === 'system' ? (
            <>
              {/* 1. 사운드 설정 (BGM 볼륨) */}
              <section className="bg-slate-900/50 border border-slate-800/90 rounded-xl p-3.5 sm:p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Volume2 size={16} className="text-cyan-400" />
                    <span className="text-xs sm:text-sm font-bold text-slate-200">사운드 설정 (BGM 볼륨)</span>
                  </div>
                  <span className="text-xs font-bold text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-500/30">
                    {isMuted || bgmVolume === 0 ? '음소거' : `${bgmVolume}%`}
                  </span>
                </div>

                <p className="text-[11px] text-slate-400 leading-tight">
                  전투 시 플레이어 및 커스텀 동료의 등장 테마 BGM 볼륨을 조절합니다.
                </p>

                {/* Volume Control Row */}
                <div className="flex items-center gap-3 pt-1">
                  <button
                    type="button"
                    onClick={toggleMute}
                    className={`p-2 rounded-lg border transition-all shrink-0 ${
                      isMuted || bgmVolume === 0
                        ? 'bg-red-950/60 border-red-700 text-red-400'
                        : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300'
                    }`}
                    title={isMuted ? '음소거 해제' : '음소거'}
                  >
                    {isMuted || bgmVolume === 0 ? <VolumeX size={18} /> : bgmVolume < 50 ? <Volume1 size={18} /> : <Volume2 size={18} />}
                  </button>

                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={bgmVolume}
                    onChange={(e) => handleVolumeChange(parseInt(e.target.value, 10))}
                    className="flex-1 accent-cyan-500 cursor-pointer h-2 bg-slate-800 rounded-lg"
                  />
                </div>

                {/* Quick Volume Preset Buttons */}
                <div className="grid grid-cols-5 gap-1.5 pt-1">
                  {[0, 25, 50, 75, 100].map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => handleVolumeChange(v)}
                      className={`py-1 text-[10px] font-bold rounded border transition-all ${
                        bgmVolume === v
                          ? 'bg-cyan-900/50 border-cyan-500 text-cyan-200'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {v === 0 ? '0%' : `${v}%`}
                    </button>
                  ))}
                </div>
              </section>

              {/* 2. 전투 속도 및 전환 템포 */}
              <section className="bg-slate-900/50 border border-slate-800/90 rounded-xl p-3.5 sm:p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Zap size={16} className="text-amber-400" />
                    <span className="text-xs sm:text-sm font-bold text-slate-200">전투 진행 템포</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  {/* 일반 전투 모드 */}
                  <button
                    type="button"
                    onClick={() => onChangeCombatSpeed?.('normal')}
                    className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between gap-1.5 ${
                      combatSpeed === 'normal'
                        ? 'bg-amber-500/10 border-amber-500/80 shadow-[0_0_12px_rgba(245,158,11,0.15)] ring-1 ring-amber-500/50'
                        : 'bg-slate-950 border-slate-800/80 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Play size={15} className="text-emerald-400" />
                        <span className="text-xs font-bold text-slate-200">일반 모드</span>
                      </div>
                      {combatSpeed === 'normal' && (
                        <CheckCircle2 size={14} className="text-amber-400 shrink-0" />
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400 leading-tight">
                      모든 이펙트와 타격 연출을 완주 후 결과로 전환 (권장)
                    </p>
                  </button>

                  {/* 빠른 전투 모드 */}
                  <button
                    type="button"
                    onClick={() => onChangeCombatSpeed?.('fast')}
                    className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between gap-1.5 ${
                      combatSpeed === 'fast'
                        ? 'bg-amber-500/10 border-amber-500/80 shadow-[0_0_12px_rgba(245,158,11,0.15)] ring-1 ring-amber-500/50'
                        : 'bg-slate-950 border-slate-800/80 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <FastForward size={15} className="text-amber-400" />
                        <span className="text-xs font-bold text-slate-200">고속 모드</span>
                      </div>
                      {combatSpeed === 'fast' && (
                        <CheckCircle2 size={14} className="text-amber-400 shrink-0" />
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400 leading-tight">
                      적 전멸 시 지연 없이 즉시 탐험·보상으로 복귀 (파밍)
                    </p>
                  </button>
                </div>
              </section>

              {/* 3. 자동 전투 기본값 & 자동 저장 */}
              <section className="bg-slate-900/50 border border-slate-800/90 rounded-xl p-3.5 sm:p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Shield size={16} className="text-rose-400" />
                  <span className="text-xs sm:text-sm font-bold text-slate-200">전투 자동화 & 데이터 보존</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {/* 플레이어 자동 전투 */}
                  <div className="p-2.5 bg-slate-950 border border-slate-800/90 rounded-xl flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <User size={15} className="text-blue-400 shrink-0" />
                      <span className="text-xs font-bold text-slate-300 truncate">플레이어 자동</span>
                    </div>
                    <div className="flex bg-slate-900 rounded-lg p-0.5 border border-slate-800 shrink-0">
                      <button
                        type="button"
                        onClick={() => onChangeDefaultPlayerAuto?.(true)}
                        className={`px-2.5 py-1 text-[10px] font-bold rounded ${
                          defaultPlayerAuto ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-slate-300'
                        }`}
                      >
                        켜기
                      </button>
                      <button
                        type="button"
                        onClick={() => onChangeDefaultPlayerAuto?.(false)}
                        className={`px-2.5 py-1 text-[10px] font-bold rounded ${
                          !defaultPlayerAuto ? 'bg-slate-800 text-slate-200' : 'text-slate-500 hover:text-slate-300'
                        }`}
                      >
                        끄기
                      </button>
                    </div>
                  </div>

                  {/* 동료 자동 지휘 */}
                  <div className="p-2.5 bg-slate-950 border border-slate-800/90 rounded-xl flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <Users size={15} className="text-purple-400 shrink-0" />
                      <span className="text-xs font-bold text-slate-300 truncate">동료 자동지휘</span>
                    </div>
                    <div className="flex bg-slate-900 rounded-lg p-0.5 border border-slate-800 shrink-0">
                      <button
                        type="button"
                        onClick={() => onChangeDefaultCompanionAuto?.(true)}
                        className={`px-2.5 py-1 text-[10px] font-bold rounded ${
                          defaultCompanionAuto ? 'bg-purple-600 text-white' : 'text-slate-500 hover:text-slate-300'
                        }`}
                      >
                        켜기
                      </button>
                      <button
                        type="button"
                        onClick={() => onChangeDefaultCompanionAuto?.(false)}
                        className={`px-2.5 py-1 text-[10px] font-bold rounded ${
                          !defaultCompanionAuto ? 'bg-slate-800 text-slate-200' : 'text-slate-500 hover:text-slate-300'
                        }`}
                      >
                        끄기
                      </button>
                    </div>
                  </div>
                </div>

                {/* 실시간 모험 자동 저장 토글 */}
                <div className="p-2.5 bg-slate-950 border border-slate-800/90 rounded-xl flex items-center justify-between gap-3 pt-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="p-1.5 rounded-lg bg-emerald-950/60 border border-emerald-500/30 text-emerald-400 shrink-0">
                      <Database size={15} />
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-slate-200 block truncate">실시간 모험 자동 저장</span>
                      <span className="text-[10px] text-slate-400 block truncate">행동 완료 시 자동 저장 슬롯에 기록</span>
                    </div>
                  </div>
                  <div className="flex bg-slate-900 rounded-lg p-0.5 border border-slate-800 shrink-0">
                    <button
                      type="button"
                      onClick={() => onChangeAutoSaveEnabled?.(true)}
                      className={`px-3 py-1 text-[10px] font-bold rounded ${
                        autoSaveEnabled ? 'bg-emerald-600 text-white' : 'text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      켜기
                    </button>
                    <button
                      type="button"
                      onClick={() => onChangeAutoSaveEnabled?.(false)}
                      className={`px-3 py-1 text-[10px] font-bold rounded ${
                        !autoSaveEnabled ? 'bg-slate-800 text-slate-200' : 'text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      끄기
                    </button>
                  </div>
                </div>

                {/* 스킬 이펙트 끄기/켜기 설정 토글 */}
                <div className="p-2.5 bg-slate-950 border border-slate-800/90 rounded-xl flex items-center justify-between gap-3 pt-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`p-1.5 rounded-lg border shrink-0 ${
                      disableSkillEffects 
                        ? 'bg-slate-900 border-slate-700 text-slate-500' 
                        : 'bg-amber-950/60 border-amber-500/30 text-amber-400'
                    }`}>
                      <Sparkles size={15} />
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-slate-200 block truncate">전투 스킬 이펙트</span>
                      <span className="text-[10px] text-slate-400 block truncate">
                        {disableSkillEffects ? '스킬 화려한 이펙트 연출 비활성화됨' : '전투 스킬 발동 시 화려한 이펙트 표시'}
                      </span>
                    </div>
                  </div>
                  <div className="flex bg-slate-900 rounded-lg p-0.5 border border-slate-800 shrink-0">
                    <button
                      type="button"
                      onClick={() => onChangeDisableSkillEffects?.(false)}
                      className={`px-3 py-1 text-[10px] font-bold rounded ${
                        !disableSkillEffects ? 'bg-amber-600 text-white' : 'text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      켜기
                    </button>
                    <button
                      type="button"
                      onClick={() => onChangeDisableSkillEffects?.(true)}
                      className={`px-3 py-1 text-[10px] font-bold rounded ${
                        disableSkillEffects ? 'bg-slate-800 text-amber-300' : 'text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      끄기
                    </button>
                  </div>
                </div>

                {/* 일반동료 상호교류 설정 토글 */}
                <div className="p-2.5 bg-slate-950 border border-slate-800/90 rounded-xl flex items-center justify-between gap-3 pt-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`p-1.5 rounded-lg border shrink-0 ${
                      disableCommonCompanionInteraction 
                        ? 'bg-slate-900 border-slate-700 text-slate-500' 
                        : 'bg-cyan-950/60 border-cyan-500/30 text-cyan-400'
                    }`}>
                      <Users size={15} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-200 block truncate">일반동료 상호교류</span>
                        {disableCommonCompanionInteraction && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-900/50 border border-cyan-500/40 text-cyan-300 font-medium shrink-0">
                            연산 최적화
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400 block truncate">
                        {disableCommonCompanionInteraction 
                          ? '일반동료 간의 일상 대화, 연애, 갈등 비활성화' 
                          : '일반동료들도 서로 대화, 연애, 갈등 등 자율 상호교류 수행'}
                      </span>
                    </div>
                  </div>
                  <div className="flex bg-slate-900 rounded-lg p-0.5 border border-slate-800 shrink-0">
                    <button
                      type="button"
                      onClick={() => onChangeDisableCommonCompanionInteraction?.(false)}
                      className={`px-3 py-1 text-[10px] font-bold rounded ${
                        !disableCommonCompanionInteraction ? 'bg-cyan-600 text-white' : 'text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      켜기
                    </button>
                    <button
                      type="button"
                      onClick={() => onChangeDisableCommonCompanionInteraction?.(true)}
                      className={`px-3 py-1 text-[10px] font-bold rounded ${
                        disableCommonCompanionInteraction ? 'bg-slate-800 text-cyan-300' : 'text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      끄기
                    </button>
                  </div>
                </div>

                {/* Backdrop-blur / 모바일 그래픽 최적화 토글 */}
                <div className="p-2.5 bg-slate-950 border border-slate-800/90 rounded-xl flex items-center justify-between gap-3 pt-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`p-1.5 rounded-lg border shrink-0 ${
                      disableBackdropBlur 
                        ? 'bg-emerald-950/60 border-emerald-500/30 text-emerald-400' 
                        : 'bg-slate-900 border-slate-700 text-slate-400'
                    }`}>
                      <Layers size={15} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-200 block truncate">배경 흐림 효과 제거</span>
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-900/50 border border-emerald-500/40 text-emerald-300 font-medium shrink-0">
                          속도 최적화
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 block truncate">
                        {disableBackdropBlur ? '모든 블러 효과를 끄고 고대비 단색으로 전환' : '배경 투명 및 흐림 효과 적용'}
                      </span>
                    </div>
                  </div>
                  <div className="flex bg-slate-900 rounded-lg p-0.5 border border-slate-800 shrink-0">
                    <button
                      type="button"
                      onClick={() => onChangeDisableBackdropBlur?.(true)}
                      className={`px-3 py-1 text-[10px] font-bold rounded ${
                        disableBackdropBlur ? 'bg-emerald-600 text-white' : 'text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      적용
                    </button>
                    <button
                      type="button"
                      onClick={() => onChangeDisableBackdropBlur?.(false)}
                      className={`px-3 py-1 text-[10px] font-bold rounded ${
                        !disableBackdropBlur ? 'bg-slate-800 text-slate-200' : 'text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      기본
                    </button>
                  </div>
                </div>

                {/* 화면/피격 진동(Shake) 효과 제거 토글 */}
                <div className="p-2.5 bg-slate-950 border border-slate-800/90 rounded-xl flex items-center justify-between gap-3 pt-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`p-1.5 rounded-lg border shrink-0 ${
                      disableScreenShake 
                        ? 'bg-rose-950/60 border-rose-500/30 text-rose-400' 
                        : 'bg-slate-900 border-slate-700 text-slate-400'
                    }`}>
                      <Activity size={15} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-200 block truncate">전투 화면 진동 제거</span>
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-rose-900/50 border border-rose-500/40 text-rose-300 font-medium shrink-0">
                          속도 최적화
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 block truncate">
                        {disableScreenShake ? '전투 피격 시 전체 화면 흔들림 및 진동 차단' : '피격 및 타격 시 화면 흔들림 이펙트 적용'}
                      </span>
                    </div>
                  </div>
                  <div className="flex bg-slate-900 rounded-lg p-0.5 border border-slate-800 shrink-0">
                    <button
                      type="button"
                      onClick={() => onChangeDisableScreenShake?.(true)}
                      className={`px-3 py-1 text-[10px] font-bold rounded ${
                        disableScreenShake ? 'bg-rose-600 text-white' : 'text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      차단
                    </button>
                    <button
                      type="button"
                      onClick={() => onChangeDisableScreenShake?.(false)}
                      className={`px-3 py-1 text-[10px] font-bold rounded ${
                        !disableScreenShake ? 'bg-slate-800 text-slate-200' : 'text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      기본
                    </button>
                  </div>
                </div>
              </section>

              {/* 4. UI 테마 프리셋 */}
              <section className="bg-slate-900/50 border border-slate-800/90 rounded-xl p-3.5 sm:p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Palette size={16} className="text-indigo-400" />
                  <span className="text-xs sm:text-sm font-bold text-slate-200">인터페이스 테마</span>
                </div>

                <div className="grid grid-cols-1 gap-2">
                  {presets.map((preset) => {
                    const isSelected = uiTheme === preset.key;
                    return (
                      <button
                        key={preset.key}
                        type="button"
                        onClick={() => onChangeTheme(preset.key)}
                        className={`w-full p-2.5 sm:p-3 rounded-xl border text-left transition-all flex items-center justify-between gap-3 ${
                          isSelected
                            ? 'bg-indigo-600/15 border-indigo-500 shadow-[0_0_12px_rgba(99,102,241,0.2)] ring-1 ring-indigo-500/50'
                            : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 shrink-0">
                            {preset.icon}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold text-slate-200 truncate">{preset.label}</span>
                              {isSelected && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-indigo-900 text-indigo-300 border border-indigo-500/40">
                                  적용중
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-slate-400 mt-0.5 truncate">{preset.desc}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <div className={`w-10 h-6 rounded border text-[9px] font-bold flex items-center justify-center ${preset.previewClass}`}>
                            가나
                          </div>
                          <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                            isSelected ? 'bg-indigo-500 text-white' : 'bg-slate-900 border border-slate-800 text-transparent'
                          }`}>
                            <Check size={12} className="stroke-[3]" />
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>
            </>
          ) : (
            /* 서신함 수신 카테고리 설정 탭 */
            <div className="space-y-4 animate-in fade-in duration-150">
              {/* 서신함 안내 섹션 */}
              <section className="bg-amber-950/20 border border-amber-800/40 rounded-xl p-3.5 sm:p-4 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Mail size={16} className="text-amber-400" />
                    <span className="text-xs sm:text-sm font-bold text-amber-200">서신함 태그별 수신 설정</span>
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleSetAllMailboxSettings(true)}
                      className="px-2 py-1 text-[10px] font-bold bg-amber-900/60 hover:bg-amber-800 border border-amber-600/50 text-amber-200 rounded transition-all"
                    >
                      전체 수신
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSetAllMailboxSettings(false)}
                      className="px-2 py-1 text-[10px] font-bold bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 rounded transition-all"
                    >
                      전체 차단
                    </button>
                  </div>
                </div>
                <p className="text-[11px] text-amber-300/80 leading-relaxed">
                  원치 않는 각 태그별 서신을 직접 개별적으로 켜거나 끌 수 있습니다.
                </p>
              </section>

              {/* 태그 그룹별 개별 체크박스 리스트 */}
              <div className="space-y-4">
                {[
                  {
                    category: '소식 및 시스템 서신',
                    icon: Bell,
                    borderColor: 'border-blue-800/50',
                    bgColor: 'bg-blue-950/20',
                    iconColor: 'text-blue-400',
                    activeCheckColor: 'text-blue-400',
                    activeBadge: 'bg-blue-900/90 border-blue-500 text-blue-200',
                    inactiveBadge: 'bg-slate-900 border-slate-700 text-slate-500',
                    tags: [
                      { tag: '소식', desc: '왕국 및 세간 소식' },
                      { tag: '시스템', desc: '게임 안내 및 공지' },
                      { tag: '국왕', desc: '국왕 칙서 및 하사품' },
                      { tag: '영지', desc: '영지 경영 및 영주 서신' },
                      { tag: '서신', desc: '개인 및 전장 서신' },
                    ],
                  },
                  {
                    category: '소문 및 정보 서신',
                    icon: Info,
                    borderColor: 'border-amber-800/50',
                    bgColor: 'bg-amber-950/20',
                    iconColor: 'text-amber-400',
                    activeCheckColor: 'text-amber-400',
                    activeBadge: 'bg-amber-900/90 border-amber-500 text-amber-200',
                    inactiveBadge: 'bg-slate-900 border-slate-700 text-slate-500',
                    tags: [
                      { tag: '소문', desc: '골목길 및 저잣거리 소문' },
                      { tag: '제보', desc: '주민 및 모험가 제보' },
                      { tag: '풍문', desc: '세간의 떠오는 풍문' },
                    ],
                  },
                  {
                    category: '일상 및 대화 서신',
                    icon: MessageSquare,
                    borderColor: 'border-emerald-800/50',
                    bgColor: 'bg-emerald-950/20',
                    iconColor: 'text-emerald-400',
                    activeCheckColor: 'text-emerald-400',
                    activeBadge: 'bg-emerald-900/90 border-emerald-500 text-emerald-200',
                    inactiveBadge: 'bg-slate-900 border-slate-700 text-slate-500',
                    tags: [
                      { tag: '일상', desc: '주민들의 소소한 일상' },
                      { tag: '대화', desc: '동료 및 주민 대화' },
                      { tag: '방문', desc: '손님 및 동료 방문' },
                    ],
                  },
                  {
                    category: '경사 및 동료 인연 서신',
                    icon: Heart,
                    borderColor: 'border-pink-800/50',
                    bgColor: 'bg-pink-950/20',
                    iconColor: 'text-pink-400',
                    activeCheckColor: 'text-pink-400',
                    activeBadge: 'bg-pink-900/90 border-pink-500 text-pink-200',
                    inactiveBadge: 'bg-slate-900 border-slate-700 text-slate-500',
                    tags: [
                      { tag: '경사', desc: '가문 및 왕국 경사' },
                      { tag: '결혼', desc: '혼인 및 약혼 서신' },
                      { tag: '출산', desc: '자녀 출생 및 가족' },
                      { tag: '동료', desc: '동료들의 인연 소식' },
                      { tag: '인연', desc: '깊어진 관계 및 호감' },
                    ],
                  },
                  {
                    category: '전투 및 사건 서신',
                    icon: Swords,
                    borderColor: 'border-rose-800/50',
                    bgColor: 'bg-rose-950/20',
                    iconColor: 'text-rose-400',
                    activeCheckColor: 'text-rose-400',
                    activeBadge: 'bg-rose-900/90 border-rose-500 text-rose-200',
                    inactiveBadge: 'bg-slate-900 border-slate-700 text-slate-500',
                    tags: [
                      { tag: '전투', desc: '전투 승패 및 전황' },
                      { tag: '습격', desc: '마을 및 영지 습격' },
                      { tag: '토벌', desc: '마물 토벌 및 수배령' },
                      { tag: '사건', desc: '돌발 사건 및 사고' },
                      { tag: '던전', desc: '던전 구역 소탕 및 상태' },
                      { tag: '전투 돌입', desc: '던전 및 몬스터 조우' },
                      { tag: '던전 탐색', desc: '던전 탐색 및 관문 조우' },
                    ],
                  },
                ].map((group) => {
                  const Icon = group.icon;
                  const groupTagList = group.tags.map(t => t.tag);
                  const isAllChecked = groupTagList.every(t => mailboxSettings[t] !== false);
                  const isAnyChecked = groupTagList.some(t => mailboxSettings[t] !== false);

                  return (
                    <div
                      key={group.category}
                      className={`p-3.5 rounded-xl border ${group.borderColor} ${group.bgColor} space-y-2.5`}
                    >
                      {/* 그룹 헤더 */}
                      <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
                        <div className="flex items-center gap-2 min-w-0">
                          <Icon size={16} className={`${group.iconColor} shrink-0`} />
                          <span className="text-xs sm:text-sm font-bold text-slate-100 truncate">
                            {group.category}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleToggleGroupTags(groupTagList, true)}
                            className="px-2 py-0.5 text-[9px] font-bold bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 rounded transition-all"
                          >
                            그룹 켜기
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggleGroupTags(groupTagList, false)}
                            className="px-2 py-0.5 text-[9px] font-bold bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-400 rounded transition-all"
                          >
                            그룹 끄기
                          </button>
                        </div>
                      </div>

                      {/* 개별 태그 목록 체크박스 그리드 */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {group.tags.map(({ tag, desc }) => {
                          const isChecked = mailboxSettings[tag] !== false;
                          return (
                            <button
                              key={tag}
                              type="button"
                              onClick={() => handleToggleTag(tag)}
                              className={`p-2.5 rounded-lg border text-left transition-all flex items-center justify-between gap-2 active:scale-[0.98] ${
                                isChecked
                                  ? 'bg-slate-900/90 border-slate-700 shadow-sm'
                                  : 'bg-slate-950/60 border-slate-800/80 opacity-50'
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <span
                                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded border shrink-0 font-mono ${
                                    isChecked ? group.activeBadge : group.inactiveBadge
                                  }`}
                                >
                                  [{tag}]
                                </span>
                                <span className={`text-xs font-semibold truncate ${isChecked ? 'text-slate-200' : 'text-slate-500'}`}>
                                  {desc}
                                </span>
                              </div>
                              <div className="shrink-0">
                                {isChecked ? (
                                  <CheckSquare size={17} className={group.activeCheckColor} />
                                ) : (
                                  <Square size={17} className="text-slate-600" />
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-900/60 flex items-center justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs sm:text-sm rounded-xl transition-all shadow-md active:scale-95 flex items-center justify-center gap-1.5"
          >
            <Check size={15} />
            <span>설정 완료</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export const GameSettingsModal = React.memo(GameSettingsModalComponent, (prev, next) => {
  if (!prev.isOpen && !next.isOpen) return true;
  return false;
});

