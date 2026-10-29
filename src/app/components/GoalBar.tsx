"use client"

import {FormEvent, useState} from "react";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {faCheck, faFlagCheckered, faPen, faPlus, faTrash, faXmark} from "@fortawesome/free-solid-svg-icons";
import {useActiveGoal, useStore} from "./LearnItProvider";
import {newGoal} from "../lib/storage";
import {fromDateKey} from "../lib/stats";
import {useToday} from "../lib/useToday";
import {formatDate} from "../lib/format";
import {Goal} from "../lib/types";

const inputClass = "rounded-md border border-neutral-300 bg-transparent p-2 text-sm dark:border-neutral-600";

const GoalForm = ({goal, onSave, onCancel}: {
    goal: Goal;
    onSave: (goal: Goal) => void;
    onCancel: () => void;
}) => {
    const [name, setName] = useState(goal.name);
    const [dueDate, setDueDate] = useState(goal.dueDate ?? "");

    const submit = (e: FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;
        onSave({...goal, name: name.trim(), dueDate: dueDate || null});
    };

    return (
        <form onSubmit={submit} className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <label className="flex min-w-0 flex-1 flex-col gap-1 text-xs font-semibold text-neutral-500">
                Oberthema
                <input value={name} onChange={e => setName(e.target.value)} autoFocus maxLength={80}
                       placeholder="z. B. AP2 – Prüfungsvorbereitung" className={`${inputClass} text-neutral-900 dark:text-neutral-100`}/>
            </label>
            <label className="flex flex-col gap-1 text-xs font-semibold text-neutral-500">
                Fällig am
                <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
                       className={`${inputClass} text-neutral-900 dark:text-neutral-100`}/>
            </label>
            <div className="flex gap-2">
                <button type="submit" title="Speichern" className="rounded-md bg-[#292929] px-3 py-2 text-white hover:bg-[#3D3D3D]">
                    <FontAwesomeIcon icon={faCheck}/>
                </button>
                <button type="button" onClick={onCancel} title="Abbrechen"
                        className="rounded-md bg-neutral-300 px-3 py-2 hover:bg-neutral-400 dark:bg-neutral-600">
                    <FontAwesomeIcon icon={faXmark}/>
                </button>
            </div>
        </form>
    );
};

function countdownText(dueDate: string, today: number): string {
    const days = Math.round((fromDateKey(dueDate) - today) / 86_400_000);
    if (days > 1) return `noch ${days} Tage`;
    if (days === 1) return "morgen fällig";
    if (days === 0) return "heute fällig";
    return `seit ${-days} ${days === -1 ? "Tag" : "Tagen"} vorbei`;
}

/** Selects the active learning goal ("Oberthema") and manages goals. */
const GoalBar = () => {
    const {data, update} = useStore();
    const today = useToday();
    const {goal, topics, sessions} = useActiveGoal();
    const [mode, setMode] = useState<"view" | "edit" | "new">("view");
    const timerLocked = data.timer.status !== "idle" && data.timer.phase === "focus";

    const select = (goalId: string) => update(d => {
        const firstTopic = d.topics.find(t => t.goalId === goalId)?.id ?? null;
        return {
            ...d,
            activeGoalId: goalId,
            timer: d.timer.status === "idle" || d.timer.phase === "break" ? {...d.timer, topicId: firstTopic, subtopicId: null} : d.timer,
        };
    });

    const save = (saved: Goal) => {
        update(d => {
            const exists = d.goals.some(g => g.id === saved.id);
            return {
                ...d,
                goals: exists ? d.goals.map(g => g.id === saved.id ? saved : g) : [...d.goals, saved],
            };
        });
        if (mode === "new") select(saved.id);
        setMode("view");
    };

    const remove = () => {
        if (!goal || data.goals.length <= 1) return;
        if (!confirm(`Oberthema „${goal.name}“ mit ${topics.length} Themen und ${sessions.length} Sessions wirklich löschen?`)) return;
        const topicIds = new Set(topics.map(t => t.id));
        const nextGoal = data.goals.find(g => g.id !== goal.id)!;
        update(d => ({
            ...d,
            goals: d.goals.filter(g => g.id !== goal.id),
            topics: d.topics.filter(t => !topicIds.has(t.id)),
            sessions: d.sessions.filter(s => !topicIds.has(s.topicId)),
        }));
        select(nextGoal.id);
    };

    const iconButton = "rounded-md px-2.5 py-2 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 disabled:opacity-30 dark:hover:bg-neutral-800 dark:hover:text-white";

    return (
        <section className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
            {mode === "new" && <GoalForm goal={newGoal("", null)} onSave={save} onCancel={() => setMode("view")}/>}
            {mode === "edit" && goal && <GoalForm goal={goal} onSave={save} onCancel={() => setMode("view")}/>}
            {mode === "view" && goal && (
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                    <select value={goal.id} onChange={e => select(e.target.value)} disabled={timerLocked}
                            title={timerLocked ? "Während einer laufenden Fokus-Session nicht wechselbar" : "Oberthema wählen"}
                            className="min-w-0 max-w-full flex-1 cursor-pointer truncate rounded-md bg-transparent py-1 text-xl font-black disabled:cursor-not-allowed">
                        {data.goals.map(g => <option key={g.id} value={g.id} className="text-base text-black">{g.name}</option>)}
                    </select>
                    <div className="flex items-center gap-2 text-sm">
                        <FontAwesomeIcon icon={faFlagCheckered} className="text-red-600"/>
                        {goal.dueDate ? (
                            <span>
                                Fällig am <b>{formatDate(fromDateKey(goal.dueDate))}</b>
                                <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700 dark:bg-red-950 dark:text-red-300">
                                    {countdownText(goal.dueDate, today)}
                                </span>
                            </span>
                        ) : (
                            <button onClick={() => setMode("edit")} className="text-neutral-500 underline">Fälligkeitsdatum festlegen</button>
                        )}
                    </div>
                    <div className="ml-auto flex">
                        <button onClick={() => setMode("edit")} title="Oberthema bearbeiten" className={iconButton}>
                            <FontAwesomeIcon icon={faPen}/>
                        </button>
                        <button onClick={remove} disabled={data.goals.length <= 1 || timerLocked}
                                title={data.goals.length <= 1 ? "Das letzte Oberthema kann nicht gelöscht werden" : "Oberthema löschen"}
                                className={`${iconButton} hover:text-red-600`}>
                            <FontAwesomeIcon icon={faTrash}/>
                        </button>
                        <button onClick={() => setMode("new")} disabled={timerLocked}
                                className="ml-1 flex items-center gap-1 rounded-md bg-neutral-200 px-3 py-1 text-sm font-semibold hover:bg-neutral-300 disabled:opacity-50 dark:bg-neutral-700 dark:hover:bg-neutral-600">
                            <FontAwesomeIcon icon={faPlus}/> Neues Oberthema
                        </button>
                    </div>
                </div>
            )}
        </section>
    );
};

export default GoalBar;
