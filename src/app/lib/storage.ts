import {AppData, Goal, Session, Settings, Subtopic, Topic, TimerState} from "./types";

export const STORAGE_KEY = "learn-it:data";
const STORAGE_VERSION = 2;
const MINUTE_MS = 60_000;

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

export function createId(): string {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

export function newGoal(name: string, dueDate: string | null): Goal {
    return {id: createId(), name, dueDate, createdAt: Date.now()};
}

function createDefaultGoal(): Goal {
    return newGoal("AP2 – Prüfungsvorbereitung", null);
}

function createDefaultTopics(goalId: string): Topic[] {
    const topicNames = [
        "Planen eines Softwareproduktes",
        "Entwicklung und Umsetzung von Algorithmen",
        "Datenbanken & SQL",
        "Wirtschafts- und Sozialkunde",
    ];
    return topicNames.map((name, index) => ({
        id: createId(),
        goalId,
        name,
        color: TOPIC_COLORS[index],
        targetMinutes: 0,
        subtopics: [],
    }));
}

export function createIdleFocusTimer(settings: Settings, topicId: string | null, subtopicId: string | null = null): TimerState {
    return {
        phase: "focus",
        status: "idle",
        durationMs: settings.focusMinutes * MINUTE_MS,
        elapsedBeforeMs: 0,
        runningSince: null,
        startedAt: null,
        topicId,
        subtopicId,
    };
}

export function createIdleBreakTimer(settings: Settings, topicId: string | null, subtopicId: string | null): TimerState {
    return {
        ...createIdleFocusTimer(settings, topicId, subtopicId),
        phase: "break",
        durationMs: settings.breakMinutes * MINUTE_MS,
    };
}

export function defaultData(): AppData {
    const goal = createDefaultGoal();
    const topics = createDefaultTopics(goal.id);
    return {
        goals: [goal],
        activeGoalId: goal.id,
        topics,
        sessions: [],
        settings: DEFAULT_SETTINGS,
        timer: createIdleFocusTimer(DEFAULT_SETTINGS, topics[0].id),
    };
}

const isDateKey = (value: unknown): value is string =>
    typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);

function parseGoals(rawGoals: unknown): Goal[] {
    const goalList: Goal[] = Array.isArray(rawGoals) ? rawGoals : [];
    const goals = goalList
        .filter(goal => goal && typeof goal.id === "string" && typeof goal.name === "string")
        .map(goal => ({
            ...goal,
            dueDate: isDateKey(goal.dueDate) ? goal.dueDate : null,
            createdAt: Number.isFinite(goal.createdAt) ? goal.createdAt : Date.now(),
        }));
    if (goals.length === 0) goals.push(createDefaultGoal());
    return goals;
}

function parseSubtopics(rawSubtopics: unknown): Subtopic[] {
    const subtopicList: Subtopic[] = Array.isArray(rawSubtopics) ? rawSubtopics : [];
    return subtopicList.filter(subtopic => subtopic && typeof subtopic.id === "string" && typeof subtopic.name === "string");
}

function parseTopics(rawTopics: Topic[], goals: Goal[]): Topic[] {
    const goalIds = new Set(goals.map(goal => goal.id));
    return rawTopics
        .filter(topic => topic && typeof topic.id === "string" && typeof topic.name === "string")
        .map(topic => ({
            ...topic,
            goalId: goalIds.has(topic.goalId) ? topic.goalId : goals[0].id,
            targetMinutes: Number(topic.targetMinutes) || 0,
            color: topic.color || TOPIC_COLORS[0],
            subtopics: parseSubtopics(topic.subtopics),
        }));
}

function parseSessions(rawSessions: Session[]): Session[] {
    return rawSessions
        .filter(session => session
            && typeof session.id === "string"
            && typeof session.topicId === "string"
            && Number.isFinite(session.startedAt)
            && Number.isFinite(session.durationSec))
        .map(session => ({
            ...session,
            subtopicId: typeof session.subtopicId === "string" ? session.subtopicId : null,
        }));
}

function parseTimer(rawTimer: TimerState | undefined, settings: Settings, topics: Topic[]): TimerState {
    const fallbackTopicId = topics[0]?.id ?? null;
    const timer = rawTimer && typeof rawTimer.phase === "string"
        ? {...rawTimer}
        : createIdleFocusTimer(settings, fallbackTopicId);

    const topicExists = topics.some(topic => topic.id === timer.topicId);
    if (timer.topicId && !topicExists) timer.topicId = fallbackTopicId;

    const timerTopic = topics.find(topic => topic.id === timer.topicId);
    const subtopicExists = timerTopic?.subtopics.some(subtopic => subtopic.id === timer.subtopicId);
    if (!subtopicExists) timer.subtopicId = null;

    return timer;
}

export function parseData(raw: unknown): AppData | null {
    if (!raw || typeof raw !== "object") return null;
    const data = raw as Partial<AppData>;
    if (!Array.isArray(data.topics) || !Array.isArray(data.sessions)) return null;

    const settings = {...DEFAULT_SETTINGS, ...data.settings};
    const goals = parseGoals(data.goals);
    const topics = parseTopics(data.topics, goals);
    const sessions = parseSessions(data.sessions);
    const timer = parseTimer(data.timer, settings, topics);
    const activeGoalExists = goals.some(goal => goal.id === data.activeGoalId);
    const activeGoalId = data.activeGoalId && activeGoalExists ? data.activeGoalId : goals[0].id;

    return {goals, activeGoalId, topics, sessions, settings, timer};
}

export function loadData(): AppData {
    try {
        const storedJson = localStorage.getItem(STORAGE_KEY);
        if (storedJson) {
            const parsedData = parseData(JSON.parse(storedJson).data);
            if (parsedData) return parsedData;
        }
    } catch (error) {
        console.error("Gespeicherte Daten konnten nicht gelesen werden", error);
    }
    return defaultData();
}

export function saveData(data: AppData) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({version: STORAGE_VERSION, data}));
    } catch (error) {
        console.error("Daten konnten nicht gespeichert werden", error);
    }
}
