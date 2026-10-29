"use client"

import {FormEvent, useState} from "react";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {faCheck, faFlagCheckered, faPen, faPlus, faTrash, faXmark} from "@fortawesome/free-solid-svg-icons";
import {useActiveGoal, useStore} from "./LearnItProvider";
import {newGoal} from "../lib/storage";
import {daysBetween, fromDateKey} from "../lib/stats";
import {isFocusSessionActive} from "../lib/timer";
import {useToday} from "../lib/useToday";
import {formatDate} from "../lib/format";
import {Goal} from "../lib/types";

const inputClass = "rounded-md border border-neutral-300 bg-transparent p-2 text-sm dark:border-neutral-600";
const iconButtonClass = "rounded-md px-2.5 py-2 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 disabled:opacity-30 dark:hover:bg-neutral-800 dark:hover:text-white";

const GoalForm = ({goal, onSave, onCancel}: {
    goal: Goal;
    onSave: (goal: Goal) => void;
    onCancel: () => void;
}) => {
    const [name, setName] = useState(goal.name);
    const [dueDate, setDueDate] = useState(goal.dueDate ?? "");

    const handleSubmit = (event: FormEvent) => {
        event.preventDefault();
        const trimmedName = name.trim();
        if (!trimmedName) return;
        onSave({...goal, name: trimmedName, dueDate: dueDate || null});
    };

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <label className="flex min-w-0 flex-1 flex-col gap-1 text-xs font-semibold text-neutral-500">
                Oberthema
                <input value={name} onChange={event => setName(event.target.value)} autoFocus maxLength={80}
                       placeholder="z. B. AP2 – Prüfungsvorbereitung" className={`${inputClass} text-neutral-900 dark:text-neutral-100`}/>
            </label>
            <label className="flex flex-col gap-1 text-xs font-semibold text-neutral-500">
                Fällig am
                <input type="date" value={dueDate} onChange={event => setDueDate(event.target.value)}
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

function getCountdownText(dueDate: string, today: number): string {
    const daysLeft = daysBetween(today, fromDateKey(dueDate));
    if (daysLeft > 1) return `noch ${daysLeft} Tage`;
    if (daysLeft === 1) return "morgen fällig";
    if (daysLeft === 0) return "heute fällig";

    const daysOverdue = -daysLeft;
    return `seit ${daysOverdue} ${daysOverdue === 1 ? "Tag" : "Tagen"} vorbei`;
}

const GoalBar = () => {
    const {data, update} = useStore();
    const today = useToday();
    const {goal, topics, sessions} = useActiveGoal();
    const [mode, setMode] = useState<"view" | "edit" | "new">("view");
    const isTimerLocked = isFocusSessionActive(data.timer);
    const isLastGoal = data.goals.length <= 1;

    const selectGoal = (goalId: string) => update(currentData => {
        const firstTopicId = currentData.topics.find(topic => topic.goalId === goalId)?.id ?? null;
        const timer = isFocusSessionActive(currentData.timer)
            ? currentData.timer
            : {...currentData.timer, topicId: firstTopicId, subtopicId: null};
        return {...currentData, activeGoalId: goalId, timer};
    });

    const saveGoal = (savedGoal: Goal) => {
        update(currentData => {
            const goalExists = currentData.goals.some(existingGoal => existingGoal.id === savedGoal.id);
            const goals = goalExists
                ? currentData.goals.map(existingGoal => existingGoal.id === savedGoal.id ? savedGoal : existingGoal)
                : [...currentData.goals, savedGoal];
            return {...currentData, goals};
        });
        if (mode === "new") selectGoal(savedGoal.id);
        setMode("view");
    };

    const deleteActiveGoal = () => {
        if (!goal || isLastGoal) return;
        const confirmMessage = `Oberthema „${goal.name}“ mit ${topics.length} Themen und ${sessions.length} Sessions wirklich löschen?`;
        if (!confirm(confirmMessage)) return;

        const deletedTopicIds = new Set(topics.map(topic => topic.id));
        const nextGoal = data.goals.find(otherGoal => otherGoal.id !== goal.id)!;
        update(currentData => ({
            ...currentData,
            goals: currentData.goals.filter(existingGoal => existingGoal.id !== goal.id),
            topics: currentData.topics.filter(topic => !deletedTopicIds.has(topic.id)),
            sessions: currentData.sessions.filter(session => !deletedTopicIds.has(session.topicId)),
        }));
        selectGoal(nextGoal.id);
    };

    const closeForm = () => setMode("view");

    return (
        <section className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
            {mode === "new" && <GoalForm goal={newGoal("", null)} onSave={saveGoal} onCancel={closeForm}/>}
            {mode === "edit" && goal && <GoalForm goal={goal} onSave={saveGoal} onCancel={closeForm}/>}
            {mode === "view" && goal && (
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                    <select value={goal.id} onChange={event => selectGoal(event.target.value)} disabled={isTimerLocked}
                            title={isTimerLocked ? "Während einer laufenden Fokus-Session nicht wechselbar" : "Oberthema wählen"}
                            className="min-w-0 max-w-full flex-1 cursor-pointer truncate rounded-md bg-transparent py-1 text-xl font-black disabled:cursor-not-allowed">
                        {data.goals.map(goalOption => (
                            <option key={goalOption.id} value={goalOption.id} className="text-base text-black">{goalOption.name}</option>
                        ))}
                    </select>
                    <div className="flex items-center gap-2 text-sm">
                        <FontAwesomeIcon icon={faFlagCheckered} className="text-red-600"/>
                        {goal.dueDate ? (
                            <span>
                                Fällig am <b>{formatDate(fromDateKey(goal.dueDate))}</b>
                                <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700 dark:bg-red-950 dark:text-red-300">
                                    {getCountdownText(goal.dueDate, today)}
                                </span>
                            </span>
                        ) : (
                            <button onClick={() => setMode("edit")} className="text-neutral-500 underline">Fälligkeitsdatum festlegen</button>
                        )}
                    </div>
                    <div className="ml-auto flex">
                        <button onClick={() => setMode("edit")} title="Oberthema bearbeiten" className={iconButtonClass}>
                            <FontAwesomeIcon icon={faPen}/>
                        </button>
                        <button onClick={deleteActiveGoal} disabled={isLastGoal || isTimerLocked}
                                title={isLastGoal ? "Das letzte Oberthema kann nicht gelöscht werden" : "Oberthema löschen"}
                                className={`${iconButtonClass} hover:text-red-600`}>
                            <FontAwesomeIcon icon={faTrash}/>
                        </button>
                        <button onClick={() => setMode("new")} disabled={isTimerLocked}
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
