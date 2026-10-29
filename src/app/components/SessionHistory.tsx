"use client"

import {useMemo} from "react";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {faTrash} from "@fortawesome/free-solid-svg-icons";
import {useActiveGoal, useStore} from "./LearnItProvider";
import Card from "./Card";
import {startOfDay, totalSeconds} from "../lib/stats";
import {formatDate, formatDuration, formatTime} from "../lib/format";
import {Session} from "../lib/types";

function groupSessionsByDay(sessions: Session[]): [number, Session[]][] {
    const newestFirst = [...sessions].sort((first, second) => second.startedAt - first.startedAt);
    const sessionsByDay = new Map<number, Session[]>();
    for (const session of newestFirst) {
        const day = startOfDay(session.startedAt);
        const daySessions = sessionsByDay.get(day) ?? [];
        daySessions.push(session);
        sessionsByDay.set(day, daySessions);
    }
    return [...sessionsByDay.entries()];
}

const SessionHistory = () => {
    const {update} = useStore();
    const {topics, sessions} = useActiveGoal();
    const topicsById = useMemo(() => new Map(topics.map(topic => [topic.id, topic])), [topics]);
    const sessionsByDay = useMemo(() => groupSessionsByDay(sessions), [sessions]);

    const deleteSession = (sessionToDelete: Session) => {
        if (!confirm("Diese Session wirklich löschen?")) return;
        update(data => ({...data, sessions: data.sessions.filter(session => session.id !== sessionToDelete.id)}));
    };

    return (
        <Card title="Verlauf">
            {sessionsByDay.length === 0 && (
                <p className="text-sm text-neutral-500">
                    Noch keine Sessions. Starte den Timer – abgeschlossene Fokus-Intervalle erscheinen hier.
                </p>
            )}
            <div className="flex max-h-[70vh] flex-col gap-4 overflow-y-auto pr-1">
                {sessionsByDay.map(([day, daySessions]) => (
                    <div key={day}>
                        <div className="mb-1 flex justify-between text-xs font-semibold text-neutral-500">
                            <span>{formatDate(day)}</span>
                            <span>{formatDuration(totalSeconds(daySessions))}</span>
                        </div>
                        <ul className="flex flex-col gap-1">
                            {daySessions.map(session => {
                                const topic = topicsById.get(session.topicId);
                                const subtopic = topic?.subtopics.find(candidate => candidate.id === session.subtopicId);
                                return (
                                    <li key={session.id} className="group flex items-center gap-2 rounded-md p-1.5 text-sm hover:bg-neutral-50 dark:hover:bg-neutral-800">
                                        <span className="h-3 w-3 shrink-0 rounded-full" style={{background: topic?.color ?? "#a3a3a3"}}/>
                                        <div className="min-w-0 flex-1">
                                            <div className="truncate font-medium">{topic?.name ?? "Unbekanntes Thema"}</div>
                                            {subtopic && <div className="truncate text-xs">↳ {subtopic.name}</div>}
                                            <div className="text-xs text-neutral-500">
                                                {formatTime(session.startedAt)} – {formatTime(session.endedAt)}
                                                {!session.completed && " · vorzeitig beendet"}
                                            </div>
                                        </div>
                                        <span className="tabular-nums">{formatDuration(session.durationSec)}</span>
                                        <button onClick={() => deleteSession(session)} title="Session löschen"
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
