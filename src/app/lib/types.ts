export type Goal = {
    id: string;
    name: string;
    dueDate: string | null;
    createdAt: number;
};

export type Subtopic = {
    id: string;
    name: string;
};

export type Topic = {
    id: string;
    goalId: string;
    name: string;
    color: string;
    targetMinutes: number;
    subtopics: Subtopic[];
};

export type Session = {
    id: string;
    topicId: string;
    subtopicId: string | null;
    startedAt: number;
    endedAt: number;
    durationSec: number;
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

export type TimerStatus = "idle" | "running" | "paused";

export type TimerState = {
    phase: Phase;
    status: TimerStatus;
    durationMs: number;
    elapsedBeforeMs: number;
    runningSince: number | null;
    startedAt: number | null;
    topicId: string | null;
    subtopicId: string | null;
};

export type AppData = {
    goals: Goal[];
    activeGoalId: string;
    topics: Topic[];
    sessions: Session[];
    settings: Settings;
    timer: TimerState;
};
