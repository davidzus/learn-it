import {Session, Settings, TimerState} from "./types";
import {createId, idleTimer} from "./storage";

export function elapsedMs(timer: TimerState, now: number): number {
    const running = timer.runningSince !== null ? Math.max(0, now - timer.runningSince) : 0;
    return Math.min(timer.durationMs, timer.elapsedBeforeMs + running);
}

export function remainingMs(timer: TimerState, now: number): number {
    return Math.max(0, timer.durationMs - elapsedMs(timer, now));
}

export function start(timer: TimerState, now: number): TimerState {
    if (timer.status === "running") return timer;
    return {...timer, status: "running", runningSince: now, startedAt: timer.startedAt ?? now};
}

export function pause(timer: TimerState, now: number): TimerState {
    if (timer.status !== "running") return timer;
    return {...timer, status: "paused", elapsedBeforeMs: elapsedMs(timer, now), runningSince: null};
}

function makeSession(timer: TimerState, endedAt: number, focusedMs: number, completed: boolean): Session | null {
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

/** Minimum focus time for a manually stopped session to be recorded. */
export const MIN_SESSION_MS = 60_000;

/** Stops the current phase. A focus phase of at least one minute is recorded as a session. */
export function stop(timer: TimerState, settings: Settings, now: number): { timer: TimerState; session: Session | null } {
    const focused = elapsedMs(timer, now);
    const session = focused >= MIN_SESSION_MS ? makeSession(timer, now, focused, false) : null;
    return {timer: idleTimer(settings, timer.topicId, timer.subtopicId), session};
}

/** Ends the current phase immediately and moves on to the next one (not started). */
export function skip(timer: TimerState, settings: Settings): TimerState {
    if (timer.phase === "focus") {
        return {...idleTimer(settings, timer.topicId, timer.subtopicId), phase: "break", durationMs: settings.breakMinutes * 60_000};
    }
    return idleTimer(settings, timer.topicId, timer.subtopicId);
}

/**
 * Completes every phase whose end lies in the past. This also catches up on phases
 * that ended while the tab was closed or the browser throttled the interval.
 */
export function advance(timer: TimerState, settings: Settings, now: number): {
    timer: TimerState;
    sessions: Session[];
    phaseEnded: boolean;
} {
    const sessions: Session[] = [];
    let phaseEnded = false;
    let current = timer;

    while (current.status === "running" && current.runningSince !== null) {
        const endsAt = current.runningSince + current.durationMs - current.elapsedBeforeMs;
        if (now < endsAt) break;
        phaseEnded = true;

        if (current.phase === "focus") {
            const session = makeSession(current, endsAt, current.durationMs, true);
            if (session) sessions.push(session);
            const next: TimerState = {
                ...idleTimer(settings, current.topicId, current.subtopicId),
                phase: "break",
                durationMs: settings.breakMinutes * 60_000,
            };
            current = settings.autoStartBreak ? start(next, endsAt) : next;
        } else {
            const next = idleTimer(settings, current.topicId, current.subtopicId);
            current = settings.autoStartFocus ? start(next, endsAt) : next;
        }
    }

    return {timer: current, sessions, phaseEnded};
}
