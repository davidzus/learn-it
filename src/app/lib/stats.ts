import {AppData, Session, Topic} from "./types";

const DAY_MS = 86_400_000;

export function startOfDay(timestamp: number): number {
    const date = new Date(timestamp);
    date.setHours(0, 0, 0, 0);
    return date.getTime();
}

export function startOfWeek(timestamp: number): number {
    const date = new Date(startOfDay(timestamp));
    const daysSinceMonday = (date.getDay() + 6) % 7;
    date.setDate(date.getDate() - daysSinceMonday);
    return date.getTime();
}

export function addDays(timestamp: number, days: number): number {
    const date = new Date(timestamp);
    date.setDate(date.getDate() + days);
    return date.getTime();
}

export function daysBetween(from: number, to: number): number {
    return Math.round((to - from) / DAY_MS);
}

export function sessionsBetween(sessions: Session[], from: number, to: number): Session[] {
    return sessions.filter(session => session.startedAt >= from && session.startedAt < to);
}

export function totalSeconds(sessions: Session[]): number {
    return sessions.reduce((sum, session) => sum + session.durationSec, 0);
}

function sumSecondsBy<Key>(sessions: Session[], getKey: (session: Session) => Key): Map<Key, number> {
    const secondsByKey = new Map<Key, number>();
    for (const session of sessions) {
        const key = getKey(session);
        secondsByKey.set(key, (secondsByKey.get(key) ?? 0) + session.durationSec);
    }
    return secondsByKey;
}

export function secondsByTopic(sessions: Session[]): Map<string, number> {
    return sumSecondsBy(sessions, session => session.topicId);
}

export function secondsBySubtopic(sessions: Session[], topicId: string): Map<string | null, number> {
    const topicSessions = sessions.filter(session => session.topicId === topicId);
    return sumSecondsBy(topicSessions, session => session.subtopicId);
}

export function secondsByDay(sessions: Session[]): Map<string, number> {
    return sumSecondsBy(sessions, session => toDateKey(session.startedAt));
}

export function secondsPerWeekdayByTopic(sessions: Session[], weekStart: number, topics: Topic[]) {
    const dayStarts = Array.from({length: 7}, (_, dayIndex) => addDays(weekStart, dayIndex));
    return topics.map(topic => {
        const topicSessions = sessions.filter(session => session.topicId === topic.id);
        const secondsPerDay = dayStarts.map(dayStart =>
            totalSeconds(sessionsBetween(topicSessions, dayStart, addDays(dayStart, 1))));
        return {topic, secondsPerDay};
    });
}

export function countStreakDays(sessions: Session[], now: number): number {
    const learnedDays = new Set(sessions.map(session => startOfDay(session.startedAt)));
    let day = startOfDay(now);
    if (!learnedDays.has(day)) day = addDays(day, -1);

    let streak = 0;
    while (learnedDays.has(day)) {
        streak++;
        day = addDays(day, -1);
    }
    return streak;
}

export function toDateKey(timestamp: number): string {
    const date = new Date(timestamp);
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${date.getFullYear()}-${month}-${day}`;
}

export function fromDateKey(dateKey: string): number {
    const [year, month, day] = dateKey.split("-").map(Number);
    return new Date(year, month - 1, day).getTime();
}

export function getActiveGoalScope(data: AppData) {
    const goal = data.goals.find(candidate => candidate.id === data.activeGoalId) ?? data.goals[0];
    const topics = data.topics.filter(topic => topic.goalId === goal?.id);
    const topicIds = new Set(topics.map(topic => topic.id));
    const sessions = data.sessions.filter(session => topicIds.has(session.topicId));
    return {goal, topics, sessions};
}
