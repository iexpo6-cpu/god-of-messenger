
import React from 'react';
import { Character, Companion, TemplePersonnel } from '../types';
import { X, ShieldCheck, ShieldAlert, AlertTriangle, Info, Users, Sword, Shield, Activity, TrendingUp, Brain } from 'lucide-react';

interface Props {
    character: Character;
    templeCity: string;
    templeLevel: number;
    onClose: () => void;
}

const TempleDefenseModal: React.FC<Props> = ({ character, templeCity, templeLevel, onClose }) => {
    const templeKey = `${character.currentLocation?.nation}_${templeCity}`;
    const personnel: TemplePersonnel = character.base?.templePersonnel?.[templeKey] || { knightIds: [], butlerIds: [], maidIds: [] };
    const allComps = [...character.companions, ...(character.inactiveCompanions || [])];

    // 방어력 계산 상수
    const TARGET_DEF_PER_LV = 500000;
    const targetDefense = templeLevel * TARGET_DEF_PER_LV;

    const contributors: { name: string, role: string, score: number, stats: string }[] = [];
    let currentDefense = 0;

    const calculateContributor = (id: string, role: string, weight: number) => {
        const c = allComps.find(comp => comp.id === id);
        if (c) {
            const sum = c.stats.str + c.stats.int + c.stats.wis + c.stats.def + c.stats.agi + c.stats.ctrl;
            const score = Math.floor(sum * weight);
            currentDefense += score;
            contributors.push({
                name: c.name,
                role: role,
                score: score,
                stats: `종합 능력치: ${sum}`
            });
        }
    };

    personnel.knightIds.forEach(id => calculateContributor(id, "수호기사", 1.5));
    personnel.butlerIds.forEach(id => calculateContributor(id, "집사", 1.0));
    personnel.maidIds.forEach(id => calculateContributor(id, "메이드", 1.0));

    const defenseRate = Math.min(100, (currentDefense / (targetDefense || 1)) * 100);
    const anxiety = Math.max(0, 100 - defenseRate);

    const getStatusInfo = () => {
        if (anxiety <= 10) return { label: "철통 보안", color: "text-emerald-400", bg: "bg-emerald-950/20", border: "border-emerald-500/40", desc: "성전이 매우 안전합니다. 신도들이 평온을 느낍니다." };
        if (anxiety <= 30) return { label: "안정적", color: "text-sky-400", bg: "bg-sky-950/20", border: "border-sky-500/40", desc: "기본적인 방어 체계가 작동 중입니다. 매년 신앙심 유실 위험이 없습니다." };
        if (anxiety <= 60) return { label: "불안정", color: "text-amber-400", bg: "bg-amber-950/20", border: "border-amber-500/40", desc: "보안이 취약합니다. 매년 일정 수준의 신앙심이 유실될 수 있습니다." };
        return { label: "붕괴 위기", color: "text-rose-500", bg: "bg-rose-950/20", border: "border-rose-600/40", desc: "성전이 무법천지입니다! 매년 막대한 신앙심 손실이 발생합니다." };
    };

    const status = getStatusInfo();

    return (
        <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/90 backdrop-blur-sm p-3 sm:p-4 animate-in fade-in">
            <div className="bg-slate-900 border border-sky-500/50 w-full max-w-lg max-h-[92vh] rounded-3xl shadow-[0_0_50px_rgba(14,165,233,0.25)] flex flex-col overflow-hidden relative">
                {/* 헤더 */}
                <div className="p-4 sm:p-5 border-b border-sky-900/40 bg-sky-950/20 flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-2.5">
                        <ShieldCheck size={24} className="text-sky-400" />
                        <div>
                            <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">성전 안보 분석</h2>
                            <p className="text-[11px] text-sky-400/80 font-medium">{templeCity} 방어 체계</p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose} 
                        className="p-2 text-slate-400 hover:text-white rounded-full hover:bg-slate-800 transition-colors"
                    >
                        <X size={20}/>
                    </button>
                </div>

                {/* 본문 */}
                <div className="p-4 sm:p-6 flex-1 overflow-y-auto custom-scrollbar space-y-4 sm:space-y-5 overscroll-contain">
                    {/* 불안감 게이지 */}
                    <div className="text-center space-y-2.5 bg-slate-950/60 p-4 rounded-2xl border border-slate-800">
                        <div className="flex justify-between items-end mb-1">
                            <span className="text-xs text-slate-400 font-bold tracking-wide">성전 불안도</span>
                            <span className={`text-xl font-mono font-bold ${anxiety > 50 ? 'text-rose-500' : anxiety > 20 ? 'text-amber-400' : 'text-emerald-400'}`}>
                                {anxiety.toFixed(1)}%
                            </span>
                        </div>
                        <div className="h-3 w-full bg-slate-900 rounded-full overflow-hidden border border-slate-800 p-0.5">
                            <div 
                                className={`h-full rounded-full transition-all duration-700 ${anxiety > 50 ? 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]' : anxiety > 20 ? 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]' : 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]'}`}
                                style={{ width: `${anxiety}%` }}
                            ></div>
                        </div>
                        <div className={`mt-2 p-3 rounded-xl border ${status.border} ${status.bg} text-left`}>
                            <div className={`text-xs font-bold ${status.color} mb-1 flex items-center`}>
                                <AlertTriangle size={14} className="mr-1.5 shrink-0"/> {status.label} 상태
                            </div>
                            <p className="text-[11px] text-slate-300 leading-relaxed">{status.desc}</p>
                        </div>
                    </div>

                    {/* 방어력 점수 & 기여도 */}
                    <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3.5">
                        <div className="flex justify-between items-center border-b border-slate-800/80 pb-2.5">
                            <span className="text-xs text-slate-400 font-bold">방어력 점수</span>
                            <div className="text-right">
                                <span className="text-base sm:text-lg font-bold text-sky-400 font-mono">{Math.floor(currentDefense).toLocaleString()}</span>
                                <span className="text-slate-500 text-xs ml-1 font-mono">/ {targetDefense.toLocaleString()}</span>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <h4 className="text-xs font-bold text-slate-400">배치 인력 기여도</h4>
                            {contributors.length > 0 ? (
                                <div className="space-y-2">
                                    {contributors.map((c, i) => (
                                        <div key={i} className="flex justify-between items-center p-2.5 bg-slate-900/70 rounded-xl border border-slate-800/80">
                                            <div>
                                                <div className="text-xs font-bold text-slate-200">{c.name}</div>
                                                <div className="text-[10px] text-slate-400 mt-0.5">{c.role} • {c.stats}</div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-xs font-bold text-sky-400 font-mono">+{c.score.toLocaleString()}</div>
                                                <div className="text-[10px] text-slate-500">가중치 {c.role === "수호기사" ? '1.5배' : '1.0배'}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="py-6 text-center text-slate-500 bg-slate-900/40 rounded-xl border border-dashed border-slate-800">
                                    <ShieldAlert size={28} className="mx-auto mb-1.5 text-slate-600"/>
                                    <p className="text-xs">배치된 안보 인력이 없습니다.</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* 안보 시스템 규칙 */}
                    <div className="bg-sky-950/20 border border-sky-500/30 p-3.5 rounded-xl flex gap-2.5 items-start">
                        <Info size={16} className="text-sky-400 shrink-0 mt-0.5"/>
                        <div className="space-y-1">
                            <h5 className="text-xs font-bold text-sky-300">안보 시스템 규칙</h5>
                            <ul className="text-[11px] text-slate-400 space-y-1 leading-relaxed">
                                <li>• 방어도는 수호기사, 집사, 메이드의 <span className="text-slate-200 font-medium">종합 능력치</span>로 결정됩니다.</li>
                                <li>• 집무실 레벨이 높을수록 유지에 필요한 <span className="text-slate-200 font-medium">목표 방어력</span>도 상승합니다.</li>
                                <li>• 매년 3월 2일, 성전의 불안도가 <span className="text-amber-400 font-medium">30%를 초과</span>하면 대규모 신앙심 손실이 발생합니다.</li>
                                <li>• 수호기사는 방어 가중치(1.5배)를 받아 가장 효율적인 안보 수단입니다.</li>
                            </ul>
                        </div>
                    </div>
                </div>

                {/* 하단 바 */}
                <div className="p-3.5 sm:p-4 bg-slate-950 border-t border-slate-800 flex justify-end shrink-0">
                    <button 
                        onClick={onClose} 
                        className="w-full sm:w-auto px-6 py-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl font-bold text-xs shadow-md transition-all active:scale-98 min-h-[40px]"
                    >
                        확인 완료
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TempleDefenseModal;
