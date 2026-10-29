/** A learning goal ("Oberthema"), e.g. "AP2 – Prüfungsvorbereitung", that groups topics. */
export type Goal = {
    id: string;
    name: string;
    /** Due date as YYYY-MM-DD (local date), null when not set yet. */
    dueDate: string | null;
    /** Epoch ms of creation, start of the learning calendar. */
    createdAt: number;
};

/** A more specific entry below a topic, e.g. "Normalisierung" below "Datenbanken & SQL". */
export type Subtopic = {
    id: string;
    name: string;
};

/** A topic ("Thema") is the umbrella term for its subtopics. */
export type Topic = {
    id: string;
    goalId: string;
    name: string;
    color: string;
    /** Optional learning target in minutes (0 = no target). */
    targetMinutes: number;
    subtopics: Subtopic[];
};

export type Session = {
    id: string;
    topicId: string;
    /** null when the session was learned for the topic in general. */
    subtopicId: string | null;
    /** Epoch ms of the first start of the focus interval. */
    startedAt: number;
    /** Epoch ms at which the focus interval ended. */
    endedAt: number;
    /** Effectively focused time in seconds (pauses excluded). */
    durationSec: number;
    /** false when the session was stopped before the interval was over. */
    completed: boolean;
};

export type Settings = {
    focusMinutes: number;
    breakMinutes: number;
    autoStartBreak: boolean;
    autoStartFocus: boolean;
    sound: boolean;
};

export type Phase = "focus" | "break";

export type TimerState = {
    phase: Phase;
    status: "idle" | "running" | "paused";
    /** Length of the current phase in ms, fixed when the phase starts. */
    durationMs: number;
    /** Elapsed time collected before the current run (pauses split runs). */
    elapsedBeforeMs: number;
    /** Epoch ms at which the current run started, null when not running. */
    runningSince: number | null;
    /** Epoch ms of the first start of the current phase. */
    startedAt: number | null;
    topicId: string | null;
    subtopicId: string | null;
};

export type AppData = {
    goals: Goal[];
    /** The goal whose topics, statistics and history are shown. */
    activeGoalId: string;
    topics: Topic[];
    sessions: Session[];
    settings: Settings;
    timer: TimerState;
};
