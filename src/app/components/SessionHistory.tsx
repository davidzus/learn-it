"use client"

import {useMemo} from "react";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {faTrash} from "@fortawesome/free-solid-svg-icons";
import {useActiveGoal, useStore} from "./LearnItProvider";
import Card from "./Card";
import {startOfDay, totalSec} from "../lib/stats";
import {formatDate, formatDuration, formatTime} from "../lib/format";
import {Session} from "../lib/types";

const SessionHistory = () => {
    const {update} = useStore();
    const {topics, sessions} = useActiveGoal();
    const topicsById = useMemo(() => new Map(topics.map(t => [t.id, t])), [topics]);

    const days = useMemo(() => {
        const groups = new Map<number, Session[]>();
        for (const s of [...sessions].sort((a, b) => b.startedAt - a.startedAt)) {
            const day = startOfDay(s.startedAt);
            groups.set(day, [...(groups.get(day) ?? []), s]);
        }
        return [...groups.entries()];
    }, [sessions]);

    const remove = (session: Session) => {
        if (!confirm("Diese Session wirklich löschen?")) return;
        update(d => ({...d, sessions: d.sessions.filter(s => s.id !== session.id)}));
    };

    return (
        <Card title="Verlauf">
            {days.length === 0 && (
                <p className="text-sm text-neutral-500">
                    Noch keine Sessions. Starte den Timer – abgeschlossene Fokus-Intervalle erscheinen hier.
                </p>
            )}
            <div className="flex max-h-[70vh] flex-col gap-4 overflow-y-auto pr-1">
                {days.map(([day, sessions]) => (
                    <div key={day}>
                        <div className="mb-1 flex justify-between text-xs font-semibold text-neutral-500">
                            <span>{formatDate(day)}</span>
                            <span>{formatDuration(totalSec(sessions))}</span>
                        </div>
                        <ul className="flex flex-col gap-1">
                            {sessions.map(s => {
                                const topic = topicsById.get(s.topicId);
                                const subtopic = topic?.subtopics.find(st => st.id === s.subtopicId);
                                return (
                                    <li key={s.id} className="group flex items-center gap-2 rounded-md p-1.5 text-sm hover:bg-neutral-50 dark:hover:bg-neutral-800">
                                        <span className="h-3 w-3 shrink-0 rounded-full" style={{background: topic?.color ?? "#a3a3a3"}}/>
                                        <div className="min-w-0 flex-1">
                                            <div className="truncate font-medium">{topic?.name ?? "Unbekanntes Thema"}</div>
                                            {subtopic && <div className="truncate text-xs">↳ {subtopic.name}</div>}
                                            <div className="text-xs text-neutral-500">
                                                {formatTime(s.startedAt)} – {formatTime(s.endedAt)}
                                                {!s.completed && " · vorzeitig beendet"}
                                            </div>
                                        </div>
                                        <span className="tabular-nums">{formatDuration(s.durationSec)}</span>
                                        <button onClick={() => remove(s)} title="Session löschen"
                                                className="text-neutral-400 opacity-0 hover:text-red-600 focus:opacity-100 group-hover:opacity-100">
                                            <FontAwesomeIcon icon={faTrash}/>
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                ))}
            </div>
        </Card>
    );
};

export default SessionHistory;
