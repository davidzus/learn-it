"use client"

import {FormEvent, useState} from "react";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {faCheck, faChevronDown, faChevronRight, faPen, faPlus, faTrash, faXmark} from "@fortawesome/free-solid-svg-icons";
import {useActiveGoal, useStore} from "./LearnItProvider";
import {createId, TOPIC_COLORS} from "../lib/storage";
import {secondsBySubtopic, secondsByTopic} from "../lib/stats";
import {formatDuration} from "../lib/format";
import {Session, Subtopic, Topic} from "../lib/types";
import Card from "./Card";

const inputClass = "rounded-md border border-neutral-300 bg-transparent p-2 text-sm dark:border-neutral-600";

const TopicEditor = ({topic, onSave, onCancel}: {
    topic: Topic;
    onSave: (topic: Topic) => void;
    onCancel: () => void;
}) => {
    const [name, setName] = useState(topic.name);
    const [color, setColor] = useState(topic.color);
    const [targetHours, setTargetHours] = useState(topic.targetMinutes ? String(topic.targetMinutes / 60) : "");

    const submit = (e: FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;
        const hours = Math.max(0, Number(targetHours.replace(",", ".")) || 0);
        onSave({...topic, name: name.trim(), color, targetMinutes: Math.round(hours * 60)});
    };

    return (
        <form onSubmit={submit} className="flex flex-col gap-2 rounded-lg bg-neutral-100 p-2 dark:bg-neutral-800">
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Name des Themas"
                   className={inputClass} autoFocus maxLength={80}/>
            <div className="flex items-center gap-2">
                <input type="color" value={color} onChange={e => setColor(e.target.value)}
                       className="h-9 w-10 cursor-pointer rounded border-0 bg-transparent" title="Farbe"/>
                <input value={targetHours} onChange={e => setTargetHours(e.target.value)} inputMode="decimal"
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

/** Inline text field that submits on Enter and cancels on Escape. */
const InlineInput = ({initial = "", placeholder, onSubmit, onCancel}: {
    initial?: string;
    placeholder: string;
    onSubmit: (value: string) => void;
    onCancel?: () => void;
}) => {
    const [value, setValue] = useState(initial);
    const submit = (e: FormEvent) => {
        e.preventDefault();
        if (!value.trim()) return;
        onSubmit(value.trim());
        setValue("");
    };
    return (
        <form onSubmit={submit} className="flex min-w-0 flex-1 items-center gap-1">
            <input value={value} onChange={e => setValue(e.target.value)} placeholder={placeholder} maxLength={80}
                   autoFocus={!!onCancel} onKeyDown={e => e.key === "Escape" && onCancel?.()}
                   className="min-w-0 flex-1 rounded-md border border-neutral-300 bg-transparent px-2 py-1 text-sm dark:border-neutral-600"/>
            <button type="submit" title="Speichern" disabled={!value.trim()}
                    className="rounded-md px-2 py-1 text-neutral-500 hover:bg-neutral-200 hover:text-neutral-900 disabled:opacity-30 dark:hover:bg-neutral-700 dark:hover:text-white">
                <FontAwesomeIcon icon={onCancel ? faCheck : faPlus}/>
            </button>
            {onCancel && (
                <button type="button" onClick={onCancel} title="Abbrechen"
                        className="rounded-md px-2 py-1 text-neutral-500 hover:bg-neutral-200 dark:hover:bg-neutral-700">
                    <FontAwesomeIcon icon={faXmark}/>
                </button>
            )}
        </form>
    );
};

/** The subtopics of one topic, with their learned time and an input for new ones. */
const SubtopicList = ({topic, sessions}: { topic: Topic; sessions: Session[] }) => {
    const {data, update} = useStore();
    const [renaming, setRenaming] = useState<string | null>(null);
    const totals = secondsBySubtopic(sessions, topic.id);
    const generalSec = totals.get(null) ?? 0;
    const {timer} = data;
    const timerLocked = timer.status !== "idle" && timer.phase === "focus";

    const setSubtopics = (fn: (subtopics: Subtopic[]) => Subtopic[]) => update(d => ({
        ...d,
        topics: d.topics.map(t => t.id === topic.id ? {...t, subtopics: fn(t.subtopics)} : t),
    }));

    const add = (name: string) => setSubtopics(list => [...list, {id: createId(), name}]);

    const rename = (id: string, name: string) => {
        setSubtopics(list => list.map(st => st.id === id ? {...st, name} : st));
        setRenaming(null);
    };

    const remove = (subtopic: Subtopic) => {
        const count = sessions.filter(s => s.subtopicId === subtopic.id).length;
        const message = count > 0
            ? `Unterthema „${subtopic.name}“ löschen? Die Lernzeit aus ${count} Session(s) bleibt beim Thema „${topic.name}“ erhalten.`
            : `Unterthema „${subtopic.name}“ löschen?`;
        if (!confirm(message)) return;
        update(d => ({
            ...d,
            topics: d.topics.map(t => t.id === topic.id ? {...t, subtopics: t.subtopics.filter(st => st.id !== subtopic.id)} : t),
            sessions: d.sessions.map(s => s.subtopicId === subtopic.id ? {...s, subtopicId: null} : s),
            timer: d.timer.subtopicId === subtopic.id ? {...d.timer, subtopicId: null} : d.timer,
        }));
    };

    /** Selects topic + subtopic in the timer. */
    const choose = (subtopicId: string | null) => {
        if (timerLocked) return;
        update(d => ({...d, timer: {...d.timer, topicId: topic.id, subtopicId}}));
    };

    const rowClass = (selected: boolean) => `group/sub flex items-center gap-2 rounded-md py-0.5 pl-2 pr-1 text-sm ${
        selected ? "bg-neutral-100 font-semibold dark:bg-neutral-800" : "hover:bg-neutral-100 dark:hover:bg-neutral-800"}`;

    return (
        <ul className="mt-1 ml-1.5 flex flex-col gap-0.5 border-l-2 pl-2" style={{borderColor: topic.color}}>
            {topic.subtopics.map(st => {
                if (renaming === st.id) {
                    return <li key={st.id}>
                        <InlineInput initial={st.name} placeholder="Name des Unterthemas"
                                     onSubmit={name => rename(st.id, name)} onCancel={() => setRenaming(null)}/>
                    </li>;
                }
                const selected = timer.topicId === topic.id && timer.subtopicId === st.id;
                return (
                    <li key={st.id} className={rowClass(selected)}>
                        <button onClick={() => choose(st.id)} disabled={timerLocked}
                                title={timerLocked ? st.name : `„${st.name}“ für den Timer auswählen`}
                                className="min-w-0 flex-1 truncate text-left disabled:cursor-default">
                            {st.name}
                        </button>
                        <span className="text-xs tabular-nums text-neutral-500">{formatDuration(totals.get(st.id) ?? 0)}</span>
                        <button onClick={() => setRenaming(st.id)} title="Umbenennen"
                                className="text-xs text-neutral-400 opacity-0 hover:text-neutral-800 focus:opacity-100 group-hover/sub:opacity-100 dark:hover:text-neutral-100">
                            <FontAwesomeIcon icon={faPen}/>
                        </button>
                        <button onClick={() => remove(st)} disabled={timerLocked && timer.subtopicId === st.id} title="Löschen"
                                className="text-xs text-neutral-400 opacity-0 hover:text-red-600 focus:opacity-100 disabled:hidden group-hover/sub:opacity-100">
                            <FontAwesomeIcon icon={faTrash}/>
                        </button>
                    </li>
                );
            })}
            {generalSec > 0 && topic.subtopics.length > 0 && (
                <li className="flex items-center gap-2 py-0.5 pl-2 pr-1 text-sm italic text-neutral-500">
                    <span className="flex-1">Allgemein</span>
                    <span className="text-xs not-italic tabular-nums">{formatDuration(generalSec)}</span>
                </li>
            )}
            <li className="pl-1 pt-0.5">
                <InlineInput placeholder="Unterthema hinzufügen …" onSubmit={add}/>
            </li>
        </ul>
    );
};

const TopicManager = () => {
    const {data, update} = useStore();
    const [editing, setEditing] = useState<string | null>(null);
    const [draft, setDraft] = useState<Topic | null>(null);
    // Explicitly opened/closed topics; by default a topic is open when it has subtopics.
    const [expanded, setExpanded] = useState<Map<string, boolean>>(new Map());
    const isOpen = (topic: Topic) => expanded.get(topic.id) ?? topic.subtopics.length > 0;
    const {goal, topics, sessions} = useActiveGoal();
    const totals = secondsByTopic(sessions);
    const busy = data.timer.status !== "idle" && data.timer.phase === "focus";

    const startNew = () => {
        setEditing(null);
        setDraft({
            id: createId(),
            goalId: goal.id,
            name: "",
            color: TOPIC_COLORS[topics.length % TOPIC_COLORS.length],
            targetMinutes: 0,
            subtopics: [],
        });
    };

    const save = (topic: Topic) => {
        update(d => {
            const exists = d.topics.some(t => t.id === topic.id);
            const topics = exists ? d.topics.map(t => t.id === topic.id ? topic : t) : [...d.topics, topic];
            return {...d, topics, timer: d.timer.topicId ? d.timer : {...d.timer, topicId: topic.id}};
        });
        setEditing(null);
        setDraft(null);
    };

    const toggle = (topic: Topic) => setExpanded(prev => new Map(prev).set(topic.id, !isOpen(topic)));

    const remove = (topic: Topic) => {
        const count = sessions.filter(s => s.topicId === topic.id).length;
        const message = count > 0
            ? `Thema „${topic.name}“ und ${count} zugehörige Session(s) wirklich löschen?`
            : `Thema „${topic.name}“ wirklich löschen?`;
        if (!confirm(message)) return;
        update(d => {
            const remaining = d.topics.filter(t => t.id !== topic.id);
            return {
                ...d,
                topics: remaining,
                sessions: d.sessions.filter(s => s.topicId !== topic.id),
                timer: d.timer.topicId === topic.id
                    ? {...d.timer, topicId: remaining.find(t => t.goalId === topic.goalId)?.id ?? null, subtopicId: null}
                    : d.timer,
            };
        });
    };

    return (
        <Card title="Themen" actions={
            <button onClick={startNew} className="flex items-center gap-1 rounded-md bg-neutral-200 px-2 py-1 text-sm font-semibold hover:bg-neutral-300 dark:bg-neutral-700 dark:hover:bg-neutral-600">
                <FontAwesomeIcon icon={faPlus}/> Neu
            </button>
        }>
            <ul className="flex flex-col gap-2">
                {draft && <li><TopicEditor topic={draft} onSave={save} onCancel={() => setDraft(null)}/></li>}
                {topics.length === 0 && !draft && (
                    <li className="text-sm text-neutral-500">Noch keine Themen. Lege dein erstes Prüfungsthema an.</li>
                )}
                {topics.map(topic => {
                    if (editing === topic.id) {
                        return <li key={topic.id}>
                            <TopicEditor topic={topic} onSave={save} onCancel={() => setEditing(null)}/>
                        </li>;
                    }
                    const sec = totals.get(topic.id) ?? 0;
                    const pct = topic.targetMinutes > 0 ? Math.min(100, (sec / 60 / topic.targetMinutes) * 100) : null;
                    const locked = busy && data.timer.topicId === topic.id;
                    const open = isOpen(topic);
                    return (
                        <li key={topic.id} className="rounded-lg p-2">
                            <div className="flex items-center gap-2">
                                <button onClick={() => toggle(topic)} title={open ? "Unterthemen einklappen" : "Unterthemen anzeigen / hinzufügen"}
                                        className="flex min-w-0 flex-1 items-center gap-2 text-left">
                                    <FontAwesomeIcon icon={open ? faChevronDown : faChevronRight} className="w-3 text-xs text-neutral-400"/>
                                    <span className="h-3 w-3 shrink-0 rounded-full" style={{background: topic.color}}/>
                                    <span className="min-w-0 flex-1 truncate text-sm font-bold" title={topic.name}>{topic.name}</span>
                                    {!open && topic.subtopics.length > 0 && (
                                        <span className="rounded-full bg-neutral-200 px-1.5 text-xs text-neutral-600 dark:bg-neutral-700 dark:text-neutral-300">
                                            {topic.subtopics.length}
                                        </span>
                                    )}
                                </button>
                                <span className="text-xs tabular-nums text-neutral-500">
                                    {formatDuration(sec)}{topic.targetMinutes > 0 && ` / ${formatDuration(topic.targetMinutes * 60)}`}
                                </span>
                                <button onClick={() => { setDraft(null); setEditing(topic.id); }} title="Bearbeiten"
                                        className="text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-100">
                                    <FontAwesomeIcon icon={faPen}/>
                                </button>
                                <button onClick={() => remove(topic)} disabled={locked}
                                        title={locked ? "Thema wird gerade gelernt" : "Löschen"}
                                        className="text-neutral-400 hover:text-red-600 disabled:opacity-30 disabled:hover:text-neutral-400">
                                    <FontAwesomeIcon icon={faTrash}/>
                                </button>
                            </div>
                            {pct !== null && (
                                <div className="mt-1.5 ml-10 h-1.5 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-700"
                                     title={`${Math.round(pct)} % des Lernziels`}>
                                    <div className="h-full rounded-full" style={{width: `${pct}%`, background: topic.color}}/>
                                </div>
                            )}
                            {open && <SubtopicList topic={topic} sessions={sessions}/>}
                        </li>
                    );
                })}
            </ul>
        </Card>
    );
};

export default TopicManager;
