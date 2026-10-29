import {Session, Settings, TimerState} from "./types";
import {createId, createIdleBreakTimer, createIdleFocusTimer} from "./storage";

export const MIN_SESSION_MS = 60_000;

type PhaseEndResult = { timer: TimerState; session: Session | null };

export function isFocusSessionActive(timer: TimerState): boolean {
    return timer.phase === "focus" && timer.status !== "idle";
}

export function getElapsedMs(timer: TimerState, now: number): number {
    const currentRunMs = timer.runningSince !== null ? Math.max(0, now - timer.runningSince) : 0;
    return Math.min(timer.durationMs, timer.elapsedBeforeMs + currentRunMs);
}

export function getRemainingMs(timer: TimerState, now: number): number {
    return Math.max(0, timer.durationMs - getElapsedMs(timer, now));
}

export function getPhaseEndTime(timer: TimerState): number | null {
    if (timer.runningSince === null) return null;
    return timer.runningSince + timer.durationMs - timer.elapsedBeforeMs;
}

export function startTimer(timer: TimerState, now: number): TimerState {
    if (timer.status === "running") return timer;
    return {...timer, status: "running", runningSince: now, startedAt: timer.startedAt ?? now};
}

export function pauseTimer(timer: TimerState, now: number): TimerState {
    if (timer.status !== "running") return timer;
    return {...timer, status: "paused", elapsedBeforeMs: getElapsedMs(timer, now), runningSince: null};
}

function createSession(timer: TimerState, endedAt: number, focusedMs: number, completed: boolean): Session | null {
    if (timer.phase !== "focus" || !timer.topicId || timer.startedAt === null) return null;
    return {
        id: createId(),
        topicId: timer.topicId,
        subtopicId: timer.subtopicId,
        startedAt: timer.startedAt,
        endedAt,
        durationSec: Math.round(focusedMs / 1000),
        completed,
    };
}

function createSessionIfLongEnough(timer: TimerState, now: number): Session | null {
    const focusedMs = getElapsedMs(timer, now);
    if (focusedMs < MIN_SESSION_MS) return null;
    return createSession(timer, now, focusedMs, false);
}

export function stopTimer(timer: TimerState, settings: Settings, now: number): PhaseEndResult {
    return {
        timer: createIdleFocusTimer(settings, timer.topicId, timer.subtopicId),
        session: createSessionIfLongEnough(timer, now),
    };
}

export function skipPhase(timer: TimerState, settings: Settings, now: number): PhaseEndResult {
    const nextTimer = timer.phase === "focus"
        ? createIdleBreakTimer(settings, timer.topicId, timer.subtopicId)
        : createIdleFocusTimer(settings, timer.topicId, timer.subtopicId);
    return {timer: nextTimer, session: createSessionIfLongEnough(timer, now)};
}

export function completeFinishedPhases(timer: TimerState, settings: Settings, now: number): {
    timer: TimerState;
    sessions: Session[];
    phaseEnded: boolean;
} {
    const completedSessions: Session[] = [];
    let phaseEnded = false;
    let currentTimer = timer;

    while (currentTimer.status === "running") {
        const phaseEndTime = getPhaseEndTime(currentTimer);
        if (phaseEndTime === null || now < phaseEndTime) break;
        phaseEnded = true;

        if (currentTimer.phase === "focus") {
            const session = createSession(currentTimer, phaseEndTime, currentTimer.durationMs, true);
            if (session) completedSessions.push(session);
            const breakTimer = createIdleBreakTimer(settings, currentTimer.topicId, currentTimer.subtopicId);
            currentTimer = settings.autoStartBreak ? startTimer(breakTimer, phaseEndTime) : breakTimer;
        } else {
            const focusTimer = createIdleFocusTimer(settings, currentTimer.topicId, currentTimer.subtopicId);
            currentTimer = settings.autoStartFocus ? startTimer(focusTimer, phaseEndTime) : focusTimer;
        }
    }

    return {timer: currentTimer, sessions: completedSessions, phaseEnded};
}
