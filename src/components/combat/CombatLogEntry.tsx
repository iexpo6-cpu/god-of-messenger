import React from 'react';
import {
    Wind,
    AlertCircle,
    CheckCircle,
    AlertTriangle,
    Sparkles,
    Flame,
    ShieldCheck,
    Skull,
    Heart,
    ArrowUp,
    Swords,
    Zap,
    Crosshair
} from 'lucide-react';
import { formatCompactKorean } from '../../utils';

interface CombatLogEntryProps {
    text: string;
}

/**
 * 텍스트 내의 특수 키워드, 수치, 태그를 분석하여 알맞은 시각적 하이라이트를 입히는 헬퍼 컴포넌트
 */
const HighlightedCombatText: React.FC<{ content: string; isCrit?: boolean }> = ({ content, isCrit }) => {
    // 1. 영어 표기를 깔끔한 한글로 정돈
    let clean = content
        .replace(/\(RESIST\)/g, '(저항)')
        .replace(/\(MISS\)/g, '(빗나감)')
        .replace(/\[시스템: |\[시스템\]\s*|\[시스템\]/g, '')
        .trim();

    // 2. 만 단위 수치 축약 및 가독성 개선
    const parts = clean.split(/(\d+[%％]?|\([가-힣\s!]+\)|\[[^\]]+\])/g);

    return (
        <span className="leading-relaxed break-keep">
            {parts.map((part, i) => {
                if (!part) return null;

                // [태그] 형태
                if (part.startsWith('[') && part.endsWith(']')) {
                    const tagContent = part.slice(1, -1);
                    if (tagContent.includes('인연')) {
                        return (
                            <span key={i} className="inline-flex items-center px-1.5 py-0.5 mx-0.5 rounded bg-fuchsia-900/60 text-fuchsia-300 font-bold border border-fuchsia-500/40 text-[10px] md:text-xs shadow-sm">
                                <Sparkles size={11} className="mr-1 text-fuchsia-300 animate-pulse" />
                                {tagContent}
                            </span>
                        );
                    }
                    if (tagContent.includes('전투') || tagContent.includes('결전') || tagContent.includes('돌파') || tagContent.includes('습격') || tagContent.includes('방어')) {
                        return (
                            <span key={i} className="inline-flex items-center px-1.5 py-0.5 mx-0.5 rounded bg-amber-900/60 text-amber-300 font-bold border border-amber-500/40 text-[10px] md:text-xs">
                                <Swords size={11} className="mr-1 text-amber-300" />
                                {tagContent}
                            </span>
                        );
                    }
                    return (
                        <span key={i} className="inline-flex items-center px-1 py-0.2 mx-0.5 rounded bg-slate-800 text-slate-300 font-semibold border border-slate-600 text-[10px] md:text-xs">
                            {tagContent}
                        </span>
                    );
                }

                // (괄호 특수 이벤트) 형태
                if (part.startsWith('(') && part.endsWith(')')) {
                    const inner = part.slice(1, -1).trim();
                    if (inner.includes('치명타')) {
                        return (
                            <span key={i} className="inline-flex items-center px-1.5 py-0.5 mx-0.5 rounded bg-gradient-to-r from-amber-600/80 to-red-600/80 text-yellow-100 font-black border border-amber-300/60 shadow-sm text-[10px] md:text-xs animate-bounce">
                                <Flame size={12} className="mr-0.5 text-yellow-200 fill-yellow-300" />
                                치명타!
                            </span>
                        );
                    }
                    if (inner.includes('빗나') || inner.includes('회피')) {
                        return (
                            <span key={i} className="inline-flex items-center px-1.5 py-0.5 mx-0.5 rounded bg-cyan-950/70 text-cyan-300 font-bold border border-cyan-500/40 text-[10px] md:text-xs">
                                <Wind size={11} className="mr-1 text-cyan-300" />
                                {inner}
                            </span>
                        );
                    }
                    if (inner.includes('저항')) {
                        return (
                            <span key={i} className="inline-flex items-center px-1.5 py-0.5 mx-0.5 rounded bg-blue-950/80 text-blue-300 font-bold border border-blue-400/50 text-[10px] md:text-xs">
                                <ShieldCheck size={12} className="mr-1 text-blue-300" />
                                {inner}
                            </span>
                        );
                    }
                    return <span key={i} className="text-slate-400 italic mx-0.5 text-[10px] md:text-xs">{part}</span>;
                }

                // 숫자 또는 백분율
                if (/^\d+[%％]?$/.test(part)) {
                    if (part.endsWith('%') || part.endsWith('％')) {
                        return <span key={i} className="font-bold text-sky-400">{part}</span>;
                    }
                    const numVal = parseInt(part, 10);
                    if (!isNaN(numVal) && numVal > 9999) {
                        return (
                            <span key={i} className={`font-black ${isCrit ? 'text-amber-300 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]' : 'text-red-400'}`} title={`${numVal.toLocaleString()}`}>
                                {formatCompactKorean(numVal)}
                            </span>
                        );
                    }
                    return (
                        <span key={i} className={`font-bold ${isCrit ? 'text-amber-300' : 'text-red-400'}`}>
                            {part}
                        </span>
                    );
                }

                return <span key={i}>{part}</span>;
            })}
        </span>
    );
};

export const CombatLogEntry = ({ text }: CombatLogEntryProps) => {
    if (!text || typeof text !== 'string') return null;

    const trimmed = text.trim();
    if (!trimmed) return null;

    // 만약 한 항목 안에 여러 줄(\n)이 포함되어 있다면 분할 렌더링
    const lines = trimmed.split('\n').filter(l => l.trim().length > 0);
    if (lines.length > 1) {
        return (
            <div className="my-1 space-y-0.5">
                {lines.map((line, idx) => (
                    <CombatLogEntry key={idx} text={line} />
                ))}
            </div>
        );
    }

    const currentText = lines[0] || trimmed;

    // 1. 치명타 이벤트 (Critical Hit)
    const isCrit = currentText.includes('(치명타!)') || currentText.includes('치명타!') || currentText.includes('[치명타]');
    if (isCrit) {
        return (
            <div className="bg-gradient-to-r from-amber-950/40 via-orange-950/30 to-red-950/40 border-l-4 border-amber-400 px-2 py-1 rounded my-1 animate-in fade-in slide-in-from-left-2 text-[11px] md:text-xs text-amber-100 shadow-sm flex items-start gap-1.5">
                <Flame size={14} className="mt-0.5 text-amber-400 fill-amber-400 flex-shrink-0 animate-pulse" />
                <div className="flex-1">
                    <HighlightedCombatText content={currentText} isCrit={true} />
                </div>
            </div>
        );
    }

    // 2. 인연스킬 / 인연 융합 / 인연 연계 이벤트
    if (
        currentText.includes('[인연') ||
        currentText.includes('인연 융합') ||
        currentText.includes('인연스킬') ||
        currentText.includes('두 영혼의 가호') ||
        currentText.includes('두 영혼의 제어력') ||
        currentText.includes('인연 저주') ||
        currentText.includes('인연 디버프') ||
        currentText.includes('인연의 힘')
    ) {
        return (
            <div className="bg-gradient-to-r from-purple-950/40 via-fuchsia-950/30 to-indigo-950/40 border-l-4 border-fuchsia-400 px-2 py-1 rounded my-1 animate-in fade-in slide-in-from-left-2 text-[11px] md:text-xs text-fuchsia-100 shadow-sm flex items-start gap-1.5">
                <Sparkles size={14} className="mt-0.5 text-fuchsia-400 flex-shrink-0 animate-pulse" />
                <div className="flex-1">
                    <HighlightedCombatText content={currentText} />
                </div>
            </div>
        );
    }

    // 3. 상태이상 저항 / 효과 저항 / 면역
    if (
        currentText.includes('저항했습니다') ||
        currentText.includes('(RESIST)') ||
        currentText.includes('저항함') ||
        currentText.includes('저주 저항') ||
        currentText.includes('디버프 저항') ||
        currentText.includes('상태이상 저항') ||
        currentText.includes('면역')
    ) {
        return (
            <div className="bg-blue-950/30 border-l-4 border-blue-400 px-2 py-1 rounded my-1 animate-in fade-in slide-in-from-left-2 text-[11px] md:text-xs text-blue-200 shadow-sm flex items-start gap-1.5">
                <ShieldCheck size={14} className="mt-0.5 text-blue-400 flex-shrink-0" />
                <div className="flex-1">
                    <HighlightedCombatText content={currentText} />
                </div>
            </div>
        );
    }

    // 4. 회피 및 빗나감 (Evasion & Miss)
    if (
        currentText.includes('회피') ||
        currentText.includes('MISS') ||
        currentText.includes('빗나갔습니다') ||
        currentText.includes('(빗나감!)') ||
        currentText.includes('빗나감')
    ) {
        return (
            <div className="bg-slate-900/50 border-l-4 border-cyan-500/70 px-2 py-1 rounded my-1 animate-in fade-in slide-in-from-left-2 text-[11px] md:text-xs text-cyan-200 italic flex items-start gap-1.5">
                <Wind size={14} className="mt-0.5 text-cyan-400 flex-shrink-0" />
                <div className="flex-1">
                    <HighlightedCombatText content={currentText} />
                </div>
            </div>
        );
    }

    // 5. 처치 및 사망
    if (
        currentText.includes('처치했습니다') ||
        currentText.includes('사망했습니다') ||
        currentText.includes('쓰러졌습니다') ||
        currentText.includes('패배했습니다')
    ) {
        return (
            <div className="bg-rose-950/40 border-l-4 border-rose-500 px-2 py-1 rounded my-1 animate-in fade-in slide-in-from-left-2 text-[11px] md:text-xs text-rose-200 font-bold flex items-start gap-1.5">
                <Skull size={14} className="mt-0.5 text-rose-400 flex-shrink-0 animate-bounce" />
                <div className="flex-1">
                    <HighlightedCombatText content={currentText} />
                </div>
            </div>
        );
    }

    // 6. 포획 성공
    if (currentText.includes('[포획 성공]')) {
        return (
            <div className="bg-emerald-950/40 border-l-4 border-emerald-400 px-2 py-1 rounded my-1 animate-in fade-in slide-in-from-left-2 text-[11px] md:text-xs text-emerald-200 font-bold flex items-start gap-1.5">
                <CheckCircle size={14} className="mt-0.5 text-emerald-400 flex-shrink-0 animate-pulse" />
                <div className="flex-1">
                    <HighlightedCombatText content={currentText} />
                </div>
            </div>
        );
    }

    // 7. 포획 실패
    if (currentText.includes('[포획 실패]')) {
        return (
            <div className="bg-orange-950/40 border-l-4 border-orange-400 px-2 py-1 rounded my-1 animate-in fade-in slide-in-from-left-2 text-[11px] md:text-xs text-orange-200 font-bold flex items-start gap-1.5">
                <AlertTriangle size={14} className="mt-0.5 text-orange-400 flex-shrink-0" />
                <div className="flex-1">
                    <HighlightedCombatText content={currentText} />
                </div>
            </div>
        );
    }

    // 8. 상태이상 / 약화 효과 부여
    if (
        (currentText.includes('상태이상') && currentText.includes('걸림')) ||
        currentText.includes('디버프 목록:') ||
        currentText.includes('저주가 침투합니다') ||
        currentText.includes('무력화 저주') ||
        currentText.includes('출혈') ||
        currentText.includes('중독') ||
        currentText.includes('화상') ||
        currentText.includes('기절') ||
        currentText.includes('빙결') ||
        currentText.includes('마비') ||
        currentText.includes('침묵')
    ) {
        return (
            <div className="bg-purple-950/30 border-l-4 border-purple-400 px-2 py-1 rounded my-1 animate-in fade-in slide-in-from-left-2 text-[11px] md:text-xs text-purple-200 flex items-start gap-1.5">
                <AlertCircle size={14} className="mt-0.5 text-purple-400 flex-shrink-0" />
                <div className="flex-1">
                    <HighlightedCombatText content={currentText} />
                </div>
            </div>
        );
    }

    // 9. 버프 / 가호 / 치유 / 능력치 상승
    if (
        currentText.includes('부여 효과:') ||
        currentText.includes('가호를 수여합니다') ||
        currentText.includes('버프 적용') ||
        currentText.includes('증가했습니다') ||
        currentText.includes('HP +') ||
        currentText.includes('MP +') ||
        currentText.includes('회복') ||
        currentText.includes('치유')
    ) {
        return (
            <div className="bg-teal-950/30 border-l-4 border-teal-400 px-2 py-1 rounded my-1 animate-in fade-in slide-in-from-left-2 text-[11px] md:text-xs text-teal-200 flex items-start gap-1.5">
                {currentText.includes('HP +') || currentText.includes('회복') || currentText.includes('치유') ? (
                    <Heart size={14} className="mt-0.5 text-teal-400 flex-shrink-0" />
                ) : (
                    <ArrowUp size={14} className="mt-0.5 text-teal-400 flex-shrink-0" />
                )}
                <div className="flex-1">
                    <HighlightedCombatText content={currentText} />
                </div>
            </div>
        );
    }

    // 10. 데미지 및 체력 감소
    if ((currentText.includes('HP -') && (currentText.includes('피해') || currentText.includes('데미지'))) || currentText.includes('열기효과')) {
        return (
            <div className="bg-red-950/20 border-l-4 border-red-500/60 px-2 py-1 rounded my-1 animate-in fade-in text-[11px] md:text-xs text-red-200 flex items-start gap-1.5">
                <Crosshair size={14} className="mt-0.5 text-red-400 flex-shrink-0 opacity-80" />
                <div className="flex-1">
                    <HighlightedCombatText content={currentText} />
                </div>
            </div>
        );
    }

    // 11. 효과 해제 / 만료
    if (currentText.includes('효과가 사라졌습니다') || currentText.includes('해제되었습니다')) {
        return (
            <div className="bg-slate-900/40 border-l-4 border-slate-500 px-2 py-1 rounded my-1 animate-in fade-in text-[10px] md:text-xs text-slate-400 flex items-start gap-1.5">
                <div className="flex-1">
                    <HighlightedCombatText content={currentText} />
                </div>
            </div>
        );
    }

    // 12. 전투 시작 / 단계 개시
    if (
        currentText.includes('[전투 시작]') ||
        currentText.includes('[전선 돌파]') ||
        currentText.includes('[최종 결전]') ||
        currentText.includes('[전선 습격]') ||
        currentText.includes('[거점 방어]')
    ) {
        return (
            <div className="bg-amber-950/30 border-l-4 border-yellow-400 px-2 py-1.5 rounded my-1 animate-in fade-in slide-in-from-left-2 text-[11px] md:text-xs text-amber-200 font-bold flex items-start gap-1.5 shadow-md">
                <Swords size={15} className="mt-0.5 text-yellow-400 flex-shrink-0" />
                <div className="flex-1">
                    <HighlightedCombatText content={currentText} />
                </div>
            </div>
        );
    }

    // 13. 기본 텍스트
    return (
        <div className="text-[11px] md:text-xs text-slate-300 border-l-2 border-slate-600/60 pl-2.5 py-0.5 my-0.5 leading-relaxed animate-in fade-in slide-in-from-left-2">
            <HighlightedCombatText content={currentText} />
        </div>
    );
};
