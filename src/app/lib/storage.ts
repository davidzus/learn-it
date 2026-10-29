import {AppData, Goal, Settings, Topic, TimerState} from "./types";

const STORAGE_KEY = "learn-it:data";
const VERSION = 2;

export const TOPIC_COLORS = [
    "#2563eb", "#16a34a", "#dc2626", "#d97706", "#9333ea",
    "#0891b2", "#db2777", "#65a30d", "#4f46e5", "#ea580c",
];

export const DEFAULT_SETTINGS: Settings = {
    focusMinutes: 30,
    breakMinutes: 5,
    autoStartBreak: true,
    autoStartFocus: false,
    sound: true,
};

export function newGoal(name: string, dueDate: string | null): Goal {
    return {id: createId(), name, dueDate, createdAt: Date.now()};
}

function defaultGoal(): Goal {
    return newGoal("AP2 – Prüfungsvorbereitung", null);
}

function defaultTopics(goalId: string): Topic[] {
    return [
        "Planen eines Softwareproduktes",
        "Entwicklung und Umsetzung von Algorithmen",
        "Datenbanken & SQL",
        "Wirtschafts- und Sozialkunde",
    ].map((name, i) => ({id: createId(), goalId, name, color: TOPIC_COLORS[i], targetMinutes: 0, subtopics: []}));
}

export function createId(): string {
    return typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

export function idleTimer(settings: Settings, topicId: string | null, subtopicId: string | null = null): TimerState {
    return {
        phase: "focus",
        status: "idle",
        durationMs: settings.focusMinutes * 60_000,
        elapsedBeforeMs: 0,
        runningSince: null,
        startedAt: null,
        topicId,
        subtopicId,
    };
}

export function defaultData(): AppData {
    const goal = defaultGoal();
    const topics = defaultTopics(goal.id);
    return {
        goals: [goal],
        activeGoalId: goal.id,
        topics,
        sessions: [],
        settings: DEFAULT_SETTINGS,
        timer: idleTimer(DEFAULT_SETTINGS, topics[0].id),
    };
}

/** Validates foreign data (localStorage or an imported file) and fills in missing fields. */
export function parseData(raw: unknown): AppData | null {
    if (!raw || typeof raw !== "object") return null;
    const data = raw as Partial<AppData>;
    if (!Array.isArray(data.topics) || !Array.isArray(data.sessions)) return null;

    const settings = {...DEFAULT_SETTINGS, ...data.settings};
    const goals = (Array.isArray(data.goals) ? data.goals : [])
        .filter(g => g && typeof g.id === "string" && typeof g.name === "string")
        .map(g => ({
            ...g,
            dueDate: typeof g.dueDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(g.dueDate) ? g.dueDate : null,
            createdAt: Number.isFinite(g.createdAt) ? g.createdAt : Date.now(),
        }));
    // Data from before goals existed: all topics go into a default goal.
    if (goals.length === 0) goals.push(defaultGoal());
    const goalIds = new Set(goals.map(g => g.id));
    const topics = data.topics.filter(t => t && typeof t.id === "string" && typeof t.name === "string")
        .map(t => ({
            ...t,
            goalId: goalIds.has(t.goalId) ? t.goalId : goals[0].id,
            targetMinutes: Number(t.targetMinutes) || 0,
            color: t.color || TOPIC_COLORS[0],
            subtopics: (Array.isArray(t.subtopics) ? t.subtopics : [])
                .filter(st => st && typeof st.id === "string" && typeof st.name === "string"),
        }));
    const activeGoalId = data.activeGoalId && goalIds.has(data.activeGoalId) ? data.activeGoalId : goals[0].id;
    const sessions = data.sessions.filter(s =>
        s && typeof s.id === "string" && typeof s.topicId === "string"
        && Number.isFinite(s.startedAt) && Number.isFinite(s.durationSec))
        .map(s => ({...s, subtopicId: typeof s.subtopicId === "string" ? s.subtopicId : null}));
    const fallbackTopic = topics[0]?.id ?? null;
    const timer = data.timer && typeof data.timer.phase === "string"
        ? data.timer
        : idleTimer(settings, fallbackTopic);
    if (timer.topicId && !topics.some(t => t.id === timer.topicId)) timer.topicId = fallbackTopic;
    const timerTopic = topics.find(t => t.id === timer.topicId);
    if (!timerTopic?.subtopics.some(st => st.id === timer.subtopicId)) timer.subtopicId = null;

    return {goals, activeGoalId, topics, sessions, settings, timer};
}

export function loadData(): AppData {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            const parsed = parseData(JSON.parse(stored).data);
            if (parsed) return parsed;
        }
    } catch (e) {
        console.error("Gespeicherte Daten konnten nicht gelesen werden", e);
    }
    return defaultData();
}

export function saveData(data: AppData) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({version: VERSION, data}));
    } catch (e) {
        console.error("Daten konnten nicht gespeichert werden", e);
    }
}

export function clearData() {
    try {
        localStorage.removeItem(STORAGE_KEY);
    } catch {
        // ignore
    }
}
