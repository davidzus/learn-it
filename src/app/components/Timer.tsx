"use client"

import {useEffect, useState} from "react";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {faForwardStep, faPause, faPlay, faStop} from "@fortawesome/free-solid-svg-icons";
import {useActiveGoal, useStore} from "./LearnItProvider";
import {advance, MIN_SESSION_MS, pause, remainingMs, skip, start, stop, elapsedMs} from "../lib/timer";
import {formatClock} from "../lib/format";
import {idleTimer} from "../lib/storage";
import Card from "./Card";

function playBeep() {
    try {
        const ctx = new AudioContext();
        [0, 0.3, 0.6].forEach(offset => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.frequency.value = 880;
            gain.gain.setValueAtTime(0.2, ctx.currentTime + offset);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + offset + 0.25);
            osc.connect(gain).connect(ctx.destination);
            osc.start(ctx.currentTime + offset);
            osc.stop(ctx.currentTime + offset + 0.25);
        });
        setTimeout(() => ctx.close(), 1500);
    } catch {
        // Audio is optional.
    }
}

const RADIUS = 90;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const Timer = () => {
    const {data, update} = useStore();
    const {timer, settings} = data;
    const {topics} = useActiveGoal();
    const [now, setNow] = useState(() => Date.now());
    const running = timer.status === "running";

    // Tick while running; complete phases once their end time has passed.
    useEffect(() => {
        const tick = () => {
            const t = Date.now();
            setNow(t);
            update(d => {
                const result = advance(d.timer, d.settings, t);
                if (!result.phaseEnded) return d;
                return {...d, timer: result.timer, sessions: [...d.sessions, ...result.sessions]};
            });
        };
        tick();
        if (!running) return;
        const id = setInterval(tick, 250);
        return () => clearInterval(id);
    }, [running, update]);

    // Beep when a phase ends while the app is open (not when catching up after a reload).
    useEffect(() => {
        if (!running || !settings.sound || timer.runningSince === null) return;
        const endsAt = timer.runningSince + timer.durationMs - timer.elapsedBeforeMs;
        const delay = endsAt - Date.now();
        if (delay < 0) return;
        const id = setTimeout(playBeep, delay);
        return () => clearTimeout(id);
    }, [running, settings.sound, timer.runningSince, timer.durationMs, timer.elapsedBeforeMs]);

    // An idle timer follows the configured interval lengths.
    useEffect(() => {
        if (timer.status !== "idle") return;
        const wanted = (timer.phase === "focus" ? settings.focusMinutes : settings.breakMinutes) * 60_000;
        if (wanted !== timer.durationMs) update(d => ({...d, timer: {...d.timer, durationMs: wanted}}));
    }, [timer.status, timer.phase, timer.durationMs, settings.focusMinutes, settings.breakMinutes, update]);

    const remaining = remainingMs(timer, now);
    const progress = timer.durationMs > 0 ? 1 - remaining / timer.durationMs : 0;
    const isFocus = timer.phase === "focus";
    const topic = topics.find(t => t.id === timer.topicId);

    useEffect(() => {
        document.title = timer.status === "idle"
            ? "Learn-IT"
            : `${formatClock(remaining)} · ${isFocus ? "Fokus" : "Pause"} | Learn-IT`;
    }, [remaining, isFocus, timer.status]);

    const canStart = !isFocus || !!topic;
    const onStartPause = () => {
        const t = Date.now();
        update(d => ({...d, timer: d.timer.status === "running" ? pause(d.timer, t) : start(d.timer, t)}));
    };
    const onStop = () => {
        const t = Date.now();
        update(d => {
            const result = stop(d.timer, d.settings, t);
            return {...d, timer: result.timer, sessions: result.session ? [...d.sessions, result.session] : d.sessions};
        });
    };
    const onSkip = () => {
        if (isFocus && elapsedMs(timer, Date.now()) >= MIN_SESSION_MS) {
            // Keep the focused time when skipping to the break.
            const t = Date.now();
            update(d => {
                const result = stop(d.timer, d.settings, t);
                return {
                    ...d,
                    timer: skip(d.timer, d.settings),
                    sessions: result.session ? [...d.sessions, result.session] : d.sessions,
                };
            });
            return;
        }
        update(d => ({...d, timer: skip(d.timer, d.settings)}));
    };
    const switchPhase = (phase: "focus" | "break") => {
        if (phase === timer.phase || timer.status !== "idle") return;
        update(d => {
            const next = idleTimer(d.settings, d.timer.topicId, d.timer.subtopicId);
            return {
                ...d,
                timer: phase === "focus" ? next : {...next, phase, durationMs: d.settings.breakMinutes * 60_000},
            };
        });
    };

    const color = isFocus ? (topic?.color ?? "#2563eb") : "#16a34a";
    const statusText = timer.status === "idle"
        ? (isFocus ? "Bereit zum Lernen" : "Zeit für eine Pause")
        : timer.status === "paused" ? "Pausiert" : (isFocus ? "Fokussiert lernen …" : "Kurz durchatmen …");

    return (
        <Card title="Fokus-Timer">
            <div className="flex justify-center gap-1 rounded-lg bg-neutral-100 p-1 dark:bg-neutral-800">
                {(["focus", "break"] as const).map(p => (
                    <button key={p} onClick={() => switchPhase(p)} disabled={timer.status !== "idle"}
                            className={`flex-1 rounded-md px-3 py-1 text-sm font-semibold transition disabled:cursor-not-allowed ${
                                timer.phase === p
                                    ? "bg-white shadow dark:bg-neutral-600"
                                    : "text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"}`}>
                        {p === "focus" ? `Fokus · ${settings.focusMinutes} min` : `Pause · ${settings.breakMinutes} min`}
                    </button>
                ))}
            </div>

            <div className="relative mx-auto my-4 aspect-square w-full max-w-64">
                <svg viewBox="0 0 200 200" className="h-full w-full -rotate-90">
                    <circle cx="100" cy="100" r={RADIUS} fill="none" strokeWidth="10"
                            className="stroke-neutral-200 dark:stroke-neutral-700"/>
                    <circle cx="100" cy="100" r={RADIUS} fill="none" strokeWidth="10" strokeLinecap="round"
                            stroke={color} strokeDasharray={CIRCUMFERENCE}
                            strokeDashoffset={CIRCUMFERENCE * (1 - progress)}
                            className="transition-[stroke-dashoffset] duration-300"/>
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-5xl font-black tabular-nums">{formatClock(remaining)}</span>
                    <span className="mt-1 text-sm text-neutral-500">{statusText}</span>
                </div>
            </div>

            <label className="mb-1 block text-sm font-semibold" htmlFor="topic">Thema</label>
            <select id="topic" value={timer.topicId ?? ""}
                    disabled={isFocus && timer.status !== "idle"}
                    onChange={e => update(d => ({...d, timer: {...d.timer, topicId: e.target.value || null, subtopicId: null}}))}
                    className="mb-3 w-full rounded-md border border-neutral-300 bg-transparent p-2 disabled:opacity-60 dark:border-neutral-600">
                {topics.length === 0 && <option value="">Bitte zuerst ein Thema anlegen</option>}
                {topics.map(t => <option key={t.id} value={t.id} className="text-black">{t.name}</option>)}
            </select>

            {topic && topic.subtopics.length > 0 && (
                <>
                    <label className="mb-1 block text-sm font-semibold" htmlFor="subtopic">Unterthema</label>
                    <select id="subtopic" value={timer.subtopicId ?? ""}
                            disabled={isFocus && timer.status !== "idle"}
                            onChange={e => update(d => ({...d, timer: {...d.timer, subtopicId: e.target.value || null}}))}
                            className="mb-3 w-full rounded-md border border-neutral-300 bg-transparent p-2 disabled:opacity-60 dark:border-neutral-600">
                        <option value="" className="text-black">Allgemein (kein Unterthema)</option>
                        {topic.subtopics.map(st => <option key={st.id} value={st.id} className="text-black">{st.name}</option>)}
                    </select>
                </>
            )}
            <div className="mb-1"/>

            <div className="flex gap-2">
                <button onClick={onStartPause} disabled={!canStart}
                        className="flex flex-1 items-center justify-center gap-2 rounded-md bg-[#292929] p-3 font-semibold text-white hover:bg-[#3D3D3D] disabled:opacity-50 dark:bg-neutral-200 dark:text-black dark:hover:bg-white">
                    <FontAwesomeIcon icon={running ? faPause : faPlay}/>
                    {running ? "Pause" : timer.status === "paused" ? "Weiter" : "Start"}
                </button>
                <button onClick={onStop} disabled={timer.status === "idle"} title="Stoppen und Session speichern"
                        className="rounded-md bg-neutral-200 px-4 hover:bg-neutral-300 disabled:opacity-50 dark:bg-neutral-700 dark:hover:bg-neutral-600">
                    <FontAwesomeIcon icon={faStop}/>
                </button>
                <button onClick={onSkip} title={isFocus ? "Zur Pause springen" : "Pause überspringen"}
                        className="rounded-md bg-neutral-200 px-4 hover:bg-neutral-300 dark:bg-neutral-700 dark:hover:bg-neutral-600">
                    <FontAwesomeIcon icon={faForwardStep}/>
                </button>
            </div>
            <p className="mt-3 text-xs text-neutral-500">
                Abgeschlossene Fokus-Intervalle werden automatisch gespeichert. Beim vorzeitigen Stoppen wird die
                bisher gelernte Zeit gespeichert (ab 1 Minute).
            </p>
        </Card>
    );
};

export default Timer;
