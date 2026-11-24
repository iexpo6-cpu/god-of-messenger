import React, { useEffect, useRef, useState } from 'react';
import { Character, Enemy, Location } from '../../types';
import { TravelOption } from '../../services/travelCalculationService';
import {
    TravelEncounterEvent,
    TravelEventChoice,
    generateTravelAmbushEnemies,
    rollTravelEvent
} from '../../services/travelEventsService';
import { Compass, FastForward, Sparkles } from 'lucide-react';

interface TravelJourneyOverlayProps {
    origin: Location;
    destination: Location;
    option: TravelOption;
    character: Character;
    onApplyDelta: (delta: {
        goldDelta?: number;
        expDelta?: number;
        hpPctDelta?: number;
        mpPctDelta?: number;
        minutesDelta?: number;
        reputationDelta?: number;
        markRescueDate?: string;
        companionId?: string;
        affectionDelta?: number;
        logMessage?: string;
    }) => void;
    onTriggerAmbushBattle: (enemies: Enemy[], logMsg: string) => void;
    onComplete: (finalMinutes: number) => void;
    onCancel: () => void;
}

const VEHICLE_ICONS: Record<TravelOption['type'], string> = {
    walk: '🚶',
    carriage: '🐎',
    ship: '⛵',
    airship: '🛸',
    portal: '🌀'
};

export const TravelJourneyOverlay: React.FC<TravelJourneyOverlayProps> = ({
    origin,
    destination,
    option,
    character,
    onApplyDelta,
    onTriggerAmbushBattle,
    onComplete,
    onCancel
}) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const [progress, setProgress] = useState(0); // 0..100
    const [activeEvent, setActiveEvent] = useState<TravelEncounterEvent | null>(null);
    const [eventResultMsg, setEventResultMsg] = useState<string | null>(null);
    const [minutesAdjust, setMinutesAdjust] = useState(0);
    const eventTriggeredRef = useRef(false);
    const completedRef = useRef(false);

    // 캔버스 여정 애니메이션 루프
    useEffect(() => {
        let rafId = 0;
        let last = performance.now();

        const tick = (now: number) => {
            const dt = Math.min(0.05, (now - last) / 1000);
            last = now;

            if (!activeEvent && !completedRef.current) {
                setProgress(prev => {
                    const speed = option.type === 'portal' ? 52 : option.type === 'airship' ? 42 : 34;
                    const next = Math.min(100, prev + speed * dt);

                    if (!eventTriggeredRef.current && next >= 46 && prev < 46) {
                        eventTriggeredRef.current = true;
                        const evt = rollTravelEvent(
                            option.type,
                            destination,
                            character,
                            option.ambushChancePct
                        );
                        setActiveEvent(evt);
                        return 46;
                    }

                    if (next >= 100 && !completedRef.current) {
                        completedRef.current = true;
                        const finalMins = Math.max(1, option.totalMinutes + minutesAdjust);
                        setTimeout(() => onComplete(finalMins), 220);
                    }
                    return next;
                });
            }

            // Draw journey canvas
            const canvas = canvasRef.current;
            const ctx = canvas?.getContext('2d');
            if (canvas && ctx) {
                const w = canvas.width;
                const h = canvas.height;

                // Sky/Atmosphere gradient by transport
                const grad = ctx.createLinearGradient(0, 0, 0, h);
                if (option.type === 'ship') {
                    grad.addColorStop(0, '#0f172a');
                    grad.addColorStop(0.55, '#1e3a8a');
                    grad.addColorStop(1, '#0284c7');
                } else if (option.type === 'airship') {
                    grad.addColorStop(0, '#1e1b4b');
                    grad.addColorStop(0.6, '#312e81');
                    grad.addColorStop(1, '#4f46e5');
                } else if (option.type === 'portal') {
                    grad.addColorStop(0, '#2e1065');
                    grad.addColorStop(0.5, '#4c1d95');
                    grad.addColorStop(1, '#0f172a');
                } else {
                    grad.addColorStop(0, '#0f172a');
                    grad.addColorStop(0.6, '#1e293b');
                    grad.addColorStop(1, '#14532d');
                }
                ctx.fillStyle = grad;
                ctx.fillRect(0, 0, w, h);

                // Parallax stars / clouds / waves
                const t = now * 0.001;
                ctx.fillStyle = 'rgba(255,255,255,0.22)';
                for (let i = 0; i < 18; i++) {
                    const sx = ((i * 73 - t * 45) % w + w) % w;
                    const sy = 18 + (i * 29) % Math.floor(h * 0.55);
                    ctx.beginPath();
                    ctx.arc(sx, sy, (i % 3) + 1, 0, Math.PI * 2);
                    ctx.fill();
                }

                // Ground / Sea / Cloud horizon
                const roadY = Math.floor(h * 0.68);
                ctx.fillStyle =
                    option.type === 'ship'
                        ? 'rgba(14, 165, 233, 0.35)'
                        : option.type === 'airship'
                            ? 'rgba(199, 210, 254, 0.22)'
                            : 'rgba(120, 113, 108, 0.45)';
                ctx.fillRect(0, roadY - 6, w, 12);

                // Route line between origin & destination
                const startX = 68;
                const endX = w - 68;
                ctx.strokeStyle = 'rgba(251, 191, 36, 0.35)';
                ctx.setLineDash([8, 6]);
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.moveTo(startX, roadY);
                ctx.lineTo(endX, roadY);
                ctx.stroke();
                ctx.setLineDash([]);

                // Progress filled line
                const curX = startX + ((endX - startX) * progress) / 100;
                ctx.strokeStyle = '#fbbf24';
                ctx.lineWidth = 3.5;
                ctx.beginPath();
                ctx.moveTo(startX, roadY);
                ctx.lineTo(curX, roadY);
                ctx.stroke();

                // Origin & Destination Nodes
                const drawNode = (x: number, label: string, color: string) => {
                    ctx.fillStyle = color;
                    ctx.beginPath();
                    ctx.arc(x, roadY, 10, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.strokeStyle = '#0f172a';
                    ctx.lineWidth = 2;
                    ctx.stroke();
                    ctx.font = 'bold 12px sans-serif';
                    ctx.fillStyle = '#f8fafc';
                    ctx.textAlign = 'center';
                    ctx.fillText(label, x, roadY + 26);
                };
                drawNode(startX, origin.city, '#38bdf8');
                drawNode(endX, destination.city, '#fbbf24');

                // Animated Vehicle
                const bob = Math.sin(t * 7) * 3;
                ctx.font = '30px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText(VEHICLE_ICONS[option.type], curX, roadY - 14 + bob);
            }

            rafId = requestAnimationFrame(tick);
        };

        rafId = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(rafId);
    }, [activeEvent, option, origin, destination, character, progress, minutesAdjust, onComplete]);

    const handleChoice = (choice: TravelEventChoice) => {
        if (choice.triggerBattle) {
            const enemies = choice.customEnemies && choice.customEnemies.length > 0
                ? choice.customEnemies
                : generateTravelAmbushEnemies(destination, character);
            onTriggerAmbushBattle(
                enemies,
                `[여정 조우] ${origin.city} → ${destination.city} 이동 중 적과 조우하여 전투에 돌입합니다!`
            );
            setActiveEvent(null);
            return;
        }
        onApplyDelta({
            goldDelta: choice.goldDelta,
            expDelta: choice.expDelta,
            hpPctDelta: choice.hpPctDelta,
            mpPctDelta: choice.mpPctDelta,
            minutesDelta: choice.minutesDelta,
            reputationDelta: choice.reputationDelta,
            markRescueDate: choice.markRescueDate,
            companionId: choice.companionId,
            affectionDelta: choice.affectionDelta,
            logMessage: `[여정 이벤트] ${choice.resultText}`
        });
        if (choice.minutesDelta) {
            setMinutesAdjust(prev => prev + (choice.minutesDelta || 0));
        }
        setEventResultMsg(choice.resultText);
        setActiveEvent(null);
    };

    return (
        <div className="absolute inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
            <div className="w-full max-w-2xl bg-slate-900 border border-amber-500/40 rounded-2xl shadow-2xl overflow-hidden">
                <div className="px-5 py-3.5 bg-slate-950/90 border-b border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <Compass size={18} className="text-amber-400 animate-spin" style={{ animationDuration: '6s' }} />
                        <div>
                            <h3 className="text-sm font-black text-amber-300">
                                {option.label} 여정 진행 중
                            </h3>
                            <p className="text-[11px] text-slate-400">
                                {origin.city} ➔ {destination.city} ({option.durationText})
                            </p>
                        </div>
                    </div>
                    {!activeEvent && progress < 95 && (
                        <button
                            onClick={() => {
                                if (!completedRef.current) {
                                    completedRef.current = true;
                                    onComplete(Math.max(1, option.totalMinutes + minutesAdjust));
                                }
                            }}
                            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 flex items-center gap-1.5 cursor-pointer"
                        >
                            <FastForward size={14} />
                            빠른 도착
                        </button>
                    )}
                </div>

                <div className="p-4 space-y-4">
                    <canvas
                        ref={canvasRef}
                        width={640}
                        height={210}
                        className="w-full h-44 rounded-xl border border-slate-800 bg-slate-950"
                    />

                    <div>
                        <div className="flex justify-between text-xs font-bold text-slate-300 mb-1.5">
                            <span>여정 진행률</span>
                            <span className="text-amber-300">{Math.round(progress)}%</span>
                        </div>
                        <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-sky-500 via-amber-400 to-emerald-400 transition-all duration-100"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                    </div>

                    {eventResultMsg && !activeEvent && (
                        <div className="px-3.5 py-2.5 rounded-xl bg-emerald-950/50 border border-emerald-500/40 text-xs text-emerald-200 flex items-center gap-2">
                            <Sparkles size={15} className="text-emerald-400 shrink-0" />
                            <span>{eventResultMsg}</span>
                        </div>
                    )}

                    {activeEvent && (
                        <div className="bg-slate-950/90 border border-amber-500/50 rounded-xl p-4 space-y-3">
                            <div className="flex items-start gap-3">
                                <div className="text-3xl leading-none">{activeEvent.icon}</div>
                                <div>
                                    <h4 className="text-sm font-black text-amber-300">{activeEvent.title}</h4>
                                    <p className="text-xs text-slate-300 mt-1 leading-relaxed">{activeEvent.description}</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 gap-2 pt-1">
                                {activeEvent.choices.map(c => {
                                    const cantAfford = c.goldDelta && c.goldDelta < 0 && character.money < Math.abs(c.goldDelta);
                                    return (
                                        <button
                                            key={c.id}
                                            disabled={!!cantAfford}
                                            onClick={() => handleChoice(c)}
                                            className={`w-full text-left px-3.5 py-2.5 rounded-xl border transition-all cursor-pointer ${
                                                cantAfford
                                                    ? 'bg-slate-900/40 border-slate-800 text-slate-600 cursor-not-allowed'
                                                    : c.triggerBattle
                                                        ? 'bg-rose-950/50 hover:bg-rose-900/60 border-rose-500/50 text-rose-100'
                                                        : 'bg-slate-900 hover:bg-slate-800 border-slate-700 hover:border-amber-400/60 text-slate-100'
                                            }`}
                                        >
                                            <div className="text-xs font-black">{c.label}</div>
                                            <div className="text-[11px] text-slate-400 mt-0.5">{c.hint}</div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    <div className="flex justify-end">
                        <button
                            onClick={onCancel}
                            className="px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-xs font-bold text-slate-300 cursor-pointer"
                        >
                            여정 취소
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TravelJourneyOverlay;
