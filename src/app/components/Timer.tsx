"use client"

import {useEffect, useState} from "react";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {faForwardStep, faPause, faPlay, faStop} from "@fortawesome/free-solid-svg-icons";
import {useActiveGoal, useStore} from "./LearnItProvider";
import {
    completeFinishedPhases,
    getPhaseEndTime,
    getRemainingMs,
    isFocusSessionActive,
    pauseTimer,
    skipPhase,
    startTimer,
    stopTimer,
} from "../lib/timer";
import {formatClock} from "../lib/format";
import {createIdleBreakTimer, createIdleFocusTimer} from "../lib/storage";
import {Phase, TimerStatus} from "../lib/types";
import Card from "./Card";

const TICK_INTERVAL_MS = 250;
const BEEP_FREQUENCY_HZ = 880;
const BEEP_VOLUME = 0.2;
const BEEP_LENGTH_SECONDS = 0.25;
const BEEP_START_OFFSETS_SECONDS = [0, 0.3, 0.6];

const RING_RADIUS = 90;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;
const DEFAULT_FOCUS_COLOR = "#2563eb";
const BREAK_COLOR = "#16a34a";

function playBeep() {
    try {
        const audioContext = new AudioContext();
        for (const startOffset of BEEP_START_OFFSETS_SECONDS) {
            const beepStart = audioContext.currentTime + startOffset;
            const beepEnd = beepStart + BEEP_LENGTH_SECONDS;
            const oscillator = audioContext.createOscillator();
            const volume = audioContext.createGain();
            oscillator.frequency.value = BEEP_FREQUENCY_HZ;
            volume.gain.setValueAtTime(BEEP_VOLUME, beepStart);
            volume.gain.exponentialRampToValueAtTime(0.001, beepEnd);
            oscillator.connect(volume).connect(audioContext.destination);
            oscillator.start(beepStart);
            oscillator.stop(beepEnd);
        }
        setTimeout(() => audioContext.close(), 1500);
    } catch (error) {
        console.warn("Signalton konnte nicht abgespielt werden", error);
    }
}

function getStatusText(status: TimerStatus, isFocus: boolean): string {
    if (status === "paused") return "Pausiert";
    if (status === "idle") return isFocus ? "Bereit zum Lernen" : "Zeit für eine Pause";
    return isFocus ? "Fokussiert lernen …" : "Kurz durchatmen …";
}

function getStartButtonLabel(status: TimerStatus): string {
    if (status === "running") return "Pause";
    if (status === "paused") return "Weiter";
    return "Start";
}

const Timer = () => {
    const {data, update} = useStore();
    const {timer, settings} = data;
    const {topics} = useActiveGoal();
    const [now, setNow] = useState(() => Date.now());
    const isRunning = timer.status === "running";
    const isIdle = timer.status === "idle";
    const isFocus = timer.phase === "focus";
    const isSelectionLocked = isFocusSessionActive(timer);
    const selectedTopic = topics.find(topic => topic.id === timer.topicId);
    const remainingMs = getRemainingMs(timer, now);
    const phaseEndTime = getPhaseEndTime(timer);
    const progress = timer.durationMs > 0 ? 1 - remainingMs / timer.durationMs : 0;

    useEffect(() => {
        const tick = () => {
            const tickTime = Date.now();
            setNow(tickTime);
            update(currentData => {
                const result = completeFinishedPhases(currentData.timer, currentData.settings, tickTime);
                if (!result.phaseEnded) return currentData;
                return {...currentData, timer: result.timer, sessions: [...currentData.sessions, ...result.sessions]};
            });
        };
        tick();
        if (!isRunning) return;
        const intervalId = setInterval(tick, TICK_INTERVAL_MS);
        return () => clearInterval(intervalId);
    }, [isRunning, update]);

    useEffect(() => {
        if (!isRunning || !settings.sound || phaseEndTime === null) return;
        const delayMs = phaseEndTime - Date.now();
        if (delayMs < 0) return;
        const timeoutId = setTimeout(playBeep, delayMs);
        return () => clearTimeout(timeoutId);
    }, [isRunning, settings.sound, phaseEndTime]);

    useEffect(() => {
        if (!isIdle) return;
        const configuredMinutes = isFocus ? settings.focusMinutes : settings.breakMinutes;
        const configuredDurationMs = configuredMinutes * 60_000;
        if (configuredDurationMs !== timer.durationMs) {
            update(currentData => ({...currentData, timer: {...currentData.timer, durationMs: configuredDurationMs}}));
        }
    }, [isIdle, isFocus, timer.durationMs, settings.focusMinutes, settings.breakMinutes, update]);

    useEffect(() => {
        document.title = isIdle
            ? "Learn-IT"
            : `${formatClock(remainingMs)} · ${isFocus ? "Fokus" : "Pause"} | Learn-IT`;
    }, [remainingMs, isFocus, isIdle]);

    const toggleStartPause = () => {
        const clickTime = Date.now();
        update(currentData => {
            const currentTimer = currentData.timer;
            const nextTimer = currentTimer.status === "running"
                ? pauseTimer(currentTimer, clickTime)
                : startTimer(currentTimer, clickTime);
            return {...currentData, timer: nextTimer};
        });
    };

    const endPhase = (endPhaseAction: typeof stopTimer | typeof skipPhase) => {
        const clickTime = Date.now();
        update(currentData => {
            const {timer: nextTimer, session} = endPhaseAction(currentData.timer, currentData.settings, clickTime);
            const sessions = session ? [...currentData.sessions, session] : currentData.sessions;
            return {...currentData, timer: nextTimer, sessions};
        });
    };

    const switchPhase = (phase: Phase) => {
        if (phase === timer.phase || !isIdle) return;
        update(currentData => {
            const {topicId, subtopicId} = currentData.timer;
            const nextTimer = phase === "focus"
                ? createIdleFocusTimer(currentData.settings, topicId, subtopicId)
                : createIdleBreakTimer(currentData.settings, topicId, subtopicId);
            return {...currentData, timer: nextTimer};
        });
    };

    const selectTopic = (topicId: string) =>
        update(currentData => ({...currentData, timer: {...currentData.timer, topicId: topicId || null, subtopicId: null}}));

    const selectSubtopic = (subtopicId: string) =>
        update(currentData => ({...currentData, timer: {...currentData.timer, subtopicId: subtopicId || null}}));

    const canStart = !isFocus || !!selectedTopic;
    const ringColor = isFocus ? (selectedTopic?.color ?? DEFAULT_FOCUS_COLOR) : BREAK_COLOR;

    return (
        <Card title="Fokus-Timer">
            <div className="flex justify-center gap-1 rounded-lg bg-neutral-100 p-1 dark:bg-neutral-800">
                {(["focus", "break"] as const).map(phase => (
                    <button key={phase} onClick={() => switchPhase(phase)} disabled={!isIdle}
                            className={`flex-1 rounded-md px-3 py-1 text-sm font-semibold transition disabled:cursor-not-allowed ${
                                timer.phase === phase
                                    ? "bg-white shadow dark:bg-neutral-600"
                                    : "text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"}`}>
                        {phase === "focus" ? `Fokus · ${settings.focusMinutes} min` : `Pause · ${settings.breakMinutes} min`}
                    </button>
                ))}
            </div>

            <div className="relative mx-auto my-4 aspect-square w-full max-w-64">
                <svg viewBox="0 0 200 200" className="h-full w-full -rotate-90">
                    <circle cx="100" cy="100" r={RING_RADIUS} fill="none" strokeWidth="10"
                            className="stroke-neutral-200 dark:stroke-neutral-700"/>
                    <circle cx="100" cy="100" r={RING_RADIUS} fill="none" strokeWidth="10" strokeLinecap="round"
                            stroke={ringColor} strokeDasharray={RING_CIRCUMFERENCE}
                            strokeDashoffset={RING_CIRCUMFERENCE * (1 - progress)}
                            className="transition-[stroke-dashoffset] duration-300"/>
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-5xl font-black tabular-nums">{formatClock(remainingMs)}</span>
                    <span className="mt-1 text-sm text-neutral-500">{getStatusText(timer.status, isFocus)}</span>
                </div>
            </div>

            <label className="mb-1 block text-sm font-semibold" htmlFor="topic">Thema</label>
            <select id="topic" value={timer.topicId ?? ""}
                    disabled={isSelectionLocked}
                    onChange={event => selectTopic(event.target.value)}
                    className="mb-3 w-full rounded-md border border-neutral-300 bg-transparent p-2 disabled:opacity-60 dark:border-neutral-600">
                {topics.length === 0 && <option value="">Bitte zuerst ein Thema anlegen</option>}
                {topics.map(topic => <option key={topic.id} value={topic.id} className="text-black">{topic.name}</option>)}
            </select>

            {selectedTopic && selectedTopic.subtopics.length > 0 && (
                <>
                    <label className="mb-1 block text-sm font-semibold" htmlFor="subtopic">Unterthema</label>
                    <select id="subtopic" value={timer.subtopicId ?? ""}
                            disabled={isSelectionLocked}
                            onChange={event => selectSubtopic(event.target.value)}
                            className="mb-3 w-full rounded-md border border-neutral-300 bg-transparent p-2 disabled:opacity-60 dark:border-neutral-600">
                        <option value="" className="text-black">Allgemein (kein Unterthema)</option>
                        {selectedTopic.subtopics.map(subtopic => (
                            <option key={subtopic.id} value={subtopic.id} className="text-black">{subtopic.name}</option>
                        ))}
                    </select>
                </>
            )}
            <div className="mb-1"/>

            <div className="flex gap-2">
                <button onClick={toggleStartPause} disabled={!canStart}
                        className="flex flex-1 items-center justify-center gap-2 rounded-md bg-[#292929] p-3 font-semibold text-white hover:bg-[#3D3D3D] disabled:opacity-50 dark:bg-neutral-200 dark:text-black dark:hover:bg-white">
                    <FontAwesomeIcon icon={isRunning ? faPause : faPlay}/>
                    {getStartButtonLabel(timer.status)}
                </button>
                <button onClick={() => endPhase(stopTimer)} disabled={isIdle} title="Stoppen und Session speichern"
                        className="rounded-md bg-neutral-200 px-4 hover:bg-neutral-300 disabled:opacity-50 dark:bg-neutral-700 dark:hover:bg-neutral-600">
                    <FontAwesomeIcon icon={faStop}/>
                </button>
                <button onClick={() => endPhase(skipPhase)} title={isFocus ? "Zur Pause springen" : "Pause überspringen"}
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
