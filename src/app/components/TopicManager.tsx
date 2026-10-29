"use client"

import {FormEvent, useState} from "react";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {faCheck, faChevronDown, faChevronRight, faPen, faPlus, faTrash, faXmark} from "@fortawesome/free-solid-svg-icons";
import {useActiveGoal, useStore} from "./LearnItProvider";
import {createId, TOPIC_COLORS} from "../lib/storage";
import {secondsBySubtopic, secondsByTopic} from "../lib/stats";
import {isFocusSessionActive} from "../lib/timer";
import {formatDuration} from "../lib/format";
import {Session, Subtopic, Topic} from "../lib/types";
import Card from "./Card";

const inputClass = "rounded-md border border-neutral-300 bg-transparent p-2 text-sm dark:border-neutral-600";

function parseHours(input: string): number {
    return Math.max(0, Number(input.replace(",", ".")) || 0);
}

const TopicEditor = ({topic, onSave, onCancel}: {
    topic: Topic;
    onSave: (topic: Topic) => void;
    onCancel: () => void;
}) => {
    const [name, setName] = useState(topic.name);
    const [color, setColor] = useState(topic.color);
    const [targetHoursInput, setTargetHoursInput] = useState(topic.targetMinutes ? String(topic.targetMinutes / 60) : "");

    const handleSubmit = (event: FormEvent) => {
        event.preventDefault();
        const trimmedName = name.trim();
        if (!trimmedName) return;
        const targetMinutes = Math.round(parseHours(targetHoursInput) * 60);
        onSave({...topic, name: trimmedName, color, targetMinutes});
    };

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-2 rounded-lg bg-neutral-100 p-2 dark:bg-neutral-800">
            <input value={name} onChange={event => setName(event.target.value)} placeholder="Name des Themas"
                   className={inputClass} autoFocus maxLength={80}/>
            <div className="flex items-center gap-2">
                <input type="color" value={color} onChange={event => setColor(event.target.value)}
                       className="h-9 w-10 cursor-pointer rounded border-0 bg-transparent" title="Farbe"/>
                <input value={targetHoursInput} onChange={event => setTargetHoursInput(event.target.value)} inputMode="decimal"
                       placeholder="Lernziel in Stunden (optional)" className={`${inputClass} min-w-0 flex-1`}/>
                <button type="submit" title="Speichern"
                        className="rounded-md bg-[#292929] px-3 py-2 text-white hover:bg-[#3D3D3D]">
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

const InlineInput = ({initialValue = "", placeholder, onSubmit, onCancel}: {
    initialValue?: string;
    placeholder: string;
    onSubmit: (value: string) => void;
    onCancel?: () => void;
}) => {
    const [value, setValue] = useState(initialValue);
    const trimmedValue = value.trim();
    const isEditingExisting = !!onCancel;

    const handleSubmit = (event: FormEvent) => {
        event.preventDefault();
        if (!trimmedValue) return;
        onSubmit(trimmedValue);
        setValue("");
    };

    return (
        <form onSubmit={handleSubmit} className="flex min-w-0 flex-1 items-center gap-1">
            <input value={value} onChange={event => setValue(event.target.value)} placeholder={placeholder} maxLength={80}
                   autoFocus={isEditingExisting} onKeyDown={event => event.key === "Escape" && onCancel?.()}
                   className="min-w-0 flex-1 rounded-md border border-neutral-300 bg-transparent px-2 py-1 text-sm dark:border-neutral-600"/>
            <button type="submit" title="Speichern" disabled={!trimmedValue}
                    className="rounded-md px-2 py-1 text-neutral-500 hover:bg-neutral-200 hover:text-neutral-900 disabled:opacity-30 dark:hover:bg-neutral-700 dark:hover:text-white">
                <FontAwesomeIcon icon={isEditingExisting ? faCheck : faPlus}/>
            </button>
            {isEditingExisting && (
                <button type="button" onClick={onCancel} title="Abbrechen"
                        className="rounded-md px-2 py-1 text-neutral-500 hover:bg-neutral-200 dark:hover:bg-neutral-700">
                    <FontAwesomeIcon icon={faXmark}/>
                </button>
            )}
        </form>
    );
};

const SubtopicList = ({topic, sessions}: { topic: Topic; sessions: Session[] }) => {
    const {data, update} = useStore();
    const {timer} = data;
    const [renamingSubtopicId, setRenamingSubtopicId] = useState<string | null>(null);
    const secondsPerSubtopic = secondsBySubtopic(sessions, topic.id);
    const generalSeconds = secondsPerSubtopic.get(null) ?? 0;
    const isTimerLocked = isFocusSessionActive(timer);

    const updateSubtopics = (change: (subtopics: Subtopic[]) => Subtopic[]) => update(currentData => ({
        ...currentData,
        topics: currentData.topics.map(existingTopic =>
            existingTopic.id === topic.id ? {...existingTopic, subtopics: change(existingTopic.subtopics)} : existingTopic),
    }));

    const addSubtopic = (name: string) => updateSubtopics(subtopics => [...subtopics, {id: createId(), name}]);

    const renameSubtopic = (subtopicId: string, name: string) => {
        updateSubtopics(subtopics => subtopics.map(subtopic => subtopic.id === subtopicId ? {...subtopic, name} : subtopic));
        setRenamingSubtopicId(null);
    };

    const deleteSubtopic = (subtopicToDelete: Subtopic) => {
        const sessionCount = sessions.filter(session => session.subtopicId === subtopicToDelete.id).length;
        const confirmMessage = sessionCount > 0
            ? `Unterthema „${subtopicToDelete.name}“ löschen? Die Lernzeit aus ${sessionCount} Session(s) bleibt beim Thema „${topic.name}“ erhalten.`
            : `Unterthema „${subtopicToDelete.name}“ löschen?`;
        if (!confirm(confirmMessage)) return;

        const isDeleted = (subtopicId: string | null) => subtopicId === subtopicToDelete.id;
        updateSubtopics(subtopics => subtopics.filter(subtopic => !isDeleted(subtopic.id)));
        update(currentData => ({
            ...currentData,
            sessions: currentData.sessions.map(session => isDeleted(session.subtopicId) ? {...session, subtopicId: null} : session),
            timer: isDeleted(currentData.timer.subtopicId) ? {...currentData.timer, subtopicId: null} : currentData.timer,
        }));
    };

    const selectForTimer = (subtopicId: string) => {
        if (isTimerLocked) return;
        update(currentData => ({...currentData, timer: {...currentData.timer, topicId: topic.id, subtopicId}}));
    };

    const rowClass = (isSelected: boolean) => `group/sub flex items-center gap-2 rounded-md py-0.5 pl-2 pr-1 text-sm ${
        isSelected ? "bg-neutral-100 font-semibold dark:bg-neutral-800" : "hover:bg-neutral-100 dark:hover:bg-neutral-800"}`;

    return (
        <ul className="mt-1 ml-1.5 flex flex-col gap-0.5 border-l-2 pl-2" style={{borderColor: topic.color}}>
            {topic.subtopics.map(subtopic => {
                if (renamingSubtopicId === subtopic.id) {
                    return <li key={subtopic.id}>
                        <InlineInput initialValue={subtopic.name} placeholder="Name des Unterthemas"
                                     onSubmit={name => renameSubtopic(subtopic.id, name)}
                                     onCancel={() => setRenamingSubtopicId(null)}/>
                    </li>;
                }
                const isSelected = timer.topicId === topic.id && timer.subtopicId === subtopic.id;
                return (
                    <li key={subtopic.id} className={rowClass(isSelected)}>
                        <button onClick={() => selectForTimer(subtopic.id)} disabled={isTimerLocked}
                                title={isTimerLocked ? subtopic.name : `„${subtopic.name}“ für den Timer auswählen`}
                                className="min-w-0 flex-1 truncate text-left disabled:cursor-default">
                            {subtopic.name}
                        </button>
                        <span className="text-xs tabular-nums text-neutral-500">{formatDuration(secondsPerSubtopic.get(subtopic.id) ?? 0)}</span>
                        <button onClick={() => setRenamingSubtopicId(subtopic.id)} title="Umbenennen"
                                className="text-xs text-neutral-400 opacity-0 hover:text-neutral-800 focus:opacity-100 group-hover/sub:opacity-100 dark:hover:text-neutral-100">
                            <FontAwesomeIcon icon={faPen}/>
                        </button>
                        <button onClick={() => deleteSubtopic(subtopic)} disabled={isTimerLocked && timer.subtopicId === subtopic.id} title="Löschen"
                                className="text-xs text-neutral-400 opacity-0 hover:text-red-600 focus:opacity-100 disabled:hidden group-hover/sub:opacity-100">
                            <FontAwesomeIcon icon={faTrash}/>
                        </button>
                    </li>
                );
            })}
            {generalSeconds > 0 && topic.subtopics.length > 0 && (
                <li className="flex items-center gap-2 py-0.5 pl-2 pr-1 text-sm italic text-neutral-500">
                    <span className="flex-1">Allgemein</span>
                    <span className="text-xs not-italic tabular-nums">{formatDuration(generalSeconds)}</span>
                </li>
            )}
            <li className="pl-1 pt-0.5">
                <InlineInput placeholder="Unterthema hinzufügen …" onSubmit={addSubtopic}/>
            </li>
        </ul>
    );
};

const TopicManager = () => {
    const {data, update} = useStore();
    const {goal, topics, sessions} = useActiveGoal();
    const [editingTopicId, setEditingTopicId] = useState<string | null>(null);
    const [newTopicDraft, setNewTopicDraft] = useState<Topic | null>(null);
    const [manuallyExpanded, setManuallyExpanded] = useState<Map<string, boolean>>(new Map());
    const secondsPerTopic = secondsByTopic(sessions);
    const isTimerLocked = isFocusSessionActive(data.timer);

    const isExpanded = (topic: Topic) => manuallyExpanded.get(topic.id) ?? topic.subtopics.length > 0;

    const toggleExpanded = (topic: Topic) =>
        setManuallyExpanded(previous => new Map(previous).set(topic.id, !isExpanded(topic)));

    const startNewTopic = () => {
        setEditingTopicId(null);
        setNewTopicDraft({
            id: createId(),
            goalId: goal.id,
            name: "",
            color: TOPIC_COLORS[topics.length % TOPIC_COLORS.length],
            targetMinutes: 0,
            subtopics: [],
        });
    };

    const startEditing = (topicId: string) => {
        setNewTopicDraft(null);
        setEditingTopicId(topicId);
    };

    const saveTopic = (savedTopic: Topic) => {
        update(currentData => {
            const topicExists = currentData.topics.some(topic => topic.id === savedTopic.id);
            const updatedTopics = topicExists
                ? currentData.topics.map(topic => topic.id === savedTopic.id ? savedTopic : topic)
                : [...currentData.topics, savedTopic];
            const timer = currentData.timer.topicId ? currentData.timer : {...currentData.timer, topicId: savedTopic.id};
            return {...currentData, topics: updatedTopics, timer};
        });
        setEditingTopicId(null);
        setNewTopicDraft(null);
    };

    const deleteTopic = (topicToDelete: Topic) => {
        const sessionCount = sessions.filter(session => session.topicId === topicToDelete.id).length;
        const confirmMessage = sessionCount > 0
            ? `Thema „${topicToDelete.name}“ und ${sessionCount} zugehörige Session(s) wirklich löschen?`
            : `Thema „${topicToDelete.name}“ wirklich löschen?`;
        if (!confirm(confirmMessage)) return;

        update(currentData => {
            const remainingTopics = currentData.topics.filter(topic => topic.id !== topicToDelete.id);
            const nextTopicId = remainingTopics.find(topic => topic.goalId === topicToDelete.goalId)?.id ?? null;
            const timer = currentData.timer.topicId === topicToDelete.id
                ? {...currentData.timer, topicId: nextTopicId, subtopicId: null}
                : currentData.timer;
            return {
                ...currentData,
                topics: remainingTopics,
                sessions: currentData.sessions.filter(session => session.topicId !== topicToDelete.id),
                timer,
            };
        });
    };

    return (
        <Card title="Themen" actions={
            <button onClick={startNewTopic} className="flex items-center gap-1 rounded-md bg-neutral-200 px-2 py-1 text-sm font-semibold hover:bg-neutral-300 dark:bg-neutral-700 dark:hover:bg-neutral-600">
                <FontAwesomeIcon icon={faPlus}/> Neu
            </button>
        }>
            <ul className="flex flex-col gap-2">
                {newTopicDraft && <li><TopicEditor topic={newTopicDraft} onSave={saveTopic} onCancel={() => setNewTopicDraft(null)}/></li>}
                {topics.length === 0 && !newTopicDraft && (
                    <li className="text-sm text-neutral-500">Noch keine Themen. Lege dein erstes Prüfungsthema an.</li>
                )}
                {topics.map(topic => {
                    if (editingTopicId === topic.id) {
                        return <li key={topic.id}>
                            <TopicEditor topic={topic} onSave={saveTopic} onCancel={() => setEditingTopicId(null)}/>
                        </li>;
                    }
                    const learnedSeconds = secondsPerTopic.get(topic.id) ?? 0;
                    const hasTarget = topic.targetMinutes > 0;
                    const targetProgressPercent = Math.min(100, (learnedSeconds / 60 / topic.targetMinutes) * 100);
                    const isBeingLearned = isTimerLocked && data.timer.topicId === topic.id;
                    const expanded = isExpanded(topic);
                    return (
                        <li key={topic.id} className="rounded-lg p-2">
                            <div className="flex items-center gap-2">
                                <button onClick={() => toggleExpanded(topic)} title={expanded ? "Unterthemen einklappen" : "Unterthemen anzeigen / hinzufügen"}
                                        className="flex min-w-0 flex-1 items-center gap-2 text-left">
                                    <FontAwesomeIcon icon={expanded ? faChevronDown : faChevronRight} className="w-3 text-xs text-neutral-400"/>
                                    <span className="h-3 w-3 shrink-0 rounded-full" style={{background: topic.color}}/>
                                    <span className="min-w-0 flex-1 truncate text-sm font-bold" title={topic.name}>{topic.name}</span>
                                    {!expanded && topic.subtopics.length > 0 && (
                                        <span className="rounded-full bg-neutral-200 px-1.5 text-xs text-neutral-600 dark:bg-neutral-700 dark:text-neutral-300">
                                            {topic.subtopics.length}
                                        </span>
                                    )}
                                </button>
                                <span className="text-xs tabular-nums text-neutral-500">
                                    {formatDuration(learnedSeconds)}{hasTarget && ` / ${formatDuration(topic.targetMinutes * 60)}`}
                                </span>
                                <button onClick={() => startEditing(topic.id)} title="Bearbeiten"
                                        className="text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-100">
                                    <FontAwesomeIcon icon={faPen}/>
                                </button>
                                <button onClick={() => deleteTopic(topic)} disabled={isBeingLearned}
                                        title={isBeingLearned ? "Thema wird gerade gelernt" : "Löschen"}
                                        className="text-neutral-400 hover:text-red-600 disabled:opacity-30 disabled:hover:text-neutral-400">
                                    <FontAwesomeIcon icon={faTrash}/>
                                </button>
                            </div>
                            {hasTarget && (
                                <div className="mt-1.5 ml-10 h-1.5 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-700"
                                     title={`${Math.round(targetProgressPercent)} % des Lernziels`}>
                                    <div className="h-full rounded-full" style={{width: `${targetProgressPercent}%`, background: topic.color}}/>
                                </div>
                            )}
                            {expanded && <SubtopicList topic={topic} sessions={sessions}/>}
                        </li>
                    );
                })}
            </ul>
        </Card>
    );
};

export default TopicManager;
