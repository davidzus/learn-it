import {AppData, Session, Topic} from "./types";

export const DAY_MS = 86_400_000;

export function startOfDay(ts: number): number {
    const d = new Date(ts);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
}

/** Monday 00:00 of the week containing ts. */
export function startOfWeek(ts: number): number {
    const d = new Date(startOfDay(ts));
    const offset = (d.getDay() + 6) % 7;
    d.setDate(d.getDate() - offset);
    return d.getTime();
}

export function addDays(ts: number, days: number): number {
    const d = new Date(ts);
    d.setDate(d.getDate() + days);
    return d.getTime();
}

export function sessionsBetween(sessions: Session[], from: number, to: number): Session[] {
    return sessions.filter(s => s.startedAt >= from && s.startedAt < to);
}

export function totalSec(sessions: Session[]): number {
    return sessions.reduce((sum, s) => sum + s.durationSec, 0);
}

export function secondsByTopic(sessions: Session[]): Map<string, number> {
    const map = new Map<string, number>();
    for (const s of sessions) map.set(s.topicId, (map.get(s.topicId) ?? 0) + s.durationSec);
    return map;
}

/** Seconds per topic for each of the seven days of the week starting at weekStart. */
export function weekByTopic(sessions: Session[], weekStart: number, topics: Topic[]) {
    const days = Array.from({length: 7}, (_, i) => addDays(weekStart, i));
    return topics.map(topic => ({
        topic,
        values: days.map((day, i) => {
            const next = i < 6 ? days[i + 1] : addDays(weekStart, 7);
            return totalSec(sessionsBetween(sessions, day, next).filter(s => s.topicId === topic.id));
        }),
    }));
}

/** Number of consecutive days with at least one session, ending today (or yesterday). */
export function streakDays(sessions: Session[], now: number): number {
    const days = new Set(sessions.map(s => startOfDay(s.startedAt)));
    let day = startOfDay(now);
    if (!days.has(day)) day = addDays(day, -1);
    let streak = 0;
    while (days.has(day)) {
        streak++;
        day = addDays(day, -1);
    }
    return streak;
}

/** Learned seconds per subtopic; sessions without a subtopic are counted under null. */
export function secondsBySubtopic(sessions: Session[], topicId: string): Map<string | null, number> {
    const map = new Map<string | null, number>();
    for (const s of sessions) {
        if (s.topicId !== topicId) continue;
        map.set(s.subtopicId, (map.get(s.subtopicId) ?? 0) + s.durationSec);
    }
    return map;
}

/** Local calendar date as YYYY-MM-DD. */
export function toDateKey(ts: number): string {
    const d = new Date(ts);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Start of the local day for a YYYY-MM-DD key. */
export function fromDateKey(key: string): number {
    const [y, m, d] = key.split("-").map(Number);
    return new Date(y, m - 1, d).getTime();
}

/** Learned seconds per local calendar day (YYYY-MM-DD). */
export function secondsByDay(sessions: Session[]): Map<string, number> {
    const map = new Map<string, number>();
    for (const s of sessions) {
        const key = toDateKey(s.startedAt);
        map.set(key, (map.get(key) ?? 0) + s.durationSec);
    }
    return map;
}

/** The active goal together with only its topics and sessions. */
export function activeGoalScope(data: AppData) {
    const goal = data.goals.find(g => g.id === data.activeGoalId) ?? data.goals[0];
    const topics = data.topics.filter(t => t.goalId === goal?.id);
    const topicIds = new Set(topics.map(t => t.id));
    const sessions = data.sessions.filter(s => topicIds.has(s.topicId));
    return {goal, topics, sessions};
}
