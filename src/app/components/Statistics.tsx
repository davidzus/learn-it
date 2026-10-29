"use client"

import {useMemo, useState} from "react";
import {useActiveGoal} from "./LearnItProvider";
import Card from "./Card";
import WeekOverview from "./WeekOverview";
import PieChart, {PieSlice} from "./PieChart";
import {useToday} from "../lib/useToday";
import {addDays, secondsByTopic, sessionsBetween, startOfWeek, streakDays, totalSec} from "../lib/stats";
import {formatDuration, formatHours} from "../lib/format";

type Period = "today" | "week" | "all";

const PERIODS: { id: Period; label: string }[] = [
    {id: "today", label: "Heute"},
    {id: "week", label: "Woche"},
    {id: "all", label: "Gesamt"},
];

const StatTile = ({label, value, hint}: { label: string; value: string; hint?: string }) => (
    <div className="rounded-lg bg-neutral-100 p-3 dark:bg-neutral-800">
        <div className="text-xs font-semibold uppercase tracking-wide text-neutral-500">{label}</div>
        <div className="text-2xl font-black tabular-nums">{value}</div>
        {hint && <div className="text-xs text-neutral-500">{hint}</div>}
    </div>
);

const Statistics = () => {
    const {topics, sessions} = useActiveGoal();
    const [period, setPeriod] = useState<Period>("week");
    const today = useToday();
    const week = startOfWeek(today);

    const todaySec = totalSec(sessionsBetween(sessions, today, addDays(today, 1)));
    const weekSec = totalSec(sessionsBetween(sessions, week, addDays(week, 7)));
    const allSec = totalSec(sessions);
    const streak = streakDays(sessions, today);

    const pieData: PieSlice[] = (() => {
        const from = period === "today" ? today : period === "week" ? week : -Infinity;
        const totals = secondsByTopic(sessionsBetween(sessions, from, Infinity));
        return topics
            .map(t => ({name: t.name, value: totals.get(t.id) ?? 0, color: t.color}))
            .filter(s => s.value > 0)
            .sort((a, b) => b.value - a.value);
    })();

    // Topics with a target that has not been reached yet, the largest gap first.
    const openTopics = useMemo(() => {
        const totals = secondsByTopic(sessions);
        return topics
            .filter(t => t.targetMinutes > 0)
            .map(t => ({topic: t, missingSec: t.targetMinutes * 60 - (totals.get(t.id) ?? 0)}))
            .filter(t => t.missingSec > 0)
            .sort((a, b) => b.missingSec - a.missingSec);
    }, [sessions, topics]);

    return (
        <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <StatTile label="Heute" value={formatDuration(todaySec)}/>
                <StatTile label="Diese Woche" value={formatDuration(weekSec)}/>
                <StatTile label="Gesamt" value={allSec < 3600 ? formatDuration(allSec) : `${formatHours(allSec)} h`} hint={`${sessions.length} Sessions`}/>
                <StatTile label="Serie" value={`${streak} ${streak === 1 ? "Tag" : "Tage"}`} hint="in Folge gelernt"/>
            </div>

            <Card title="Wochenübersicht">
                <WeekOverview/>
            </Card>

            <Card title="Zeit pro Thema" actions={
                <div className="flex gap-1 rounded-lg bg-neutral-100 p-1 dark:bg-neutral-800">
                    {PERIODS.map(p => (
                        <button key={p.id} onClick={() => setPeriod(p.id)}
                                className={`rounded-md px-2 py-0.5 text-xs font-semibold ${period === p.id
                                    ? "bg-white shadow dark:bg-neutral-600" : "text-neutral-500"}`}>
                            {p.label}
                        </button>
                    ))}
                </div>
            }>
                {pieData.length === 0
                    ? <p className="flex h-72 items-center justify-center text-sm text-neutral-500">Noch keine Lernzeit in diesem Zeitraum.</p>
                    : <PieChart data={pieData}/>}
            </Card>

            {openTopics.length > 0 && (
                <Card title="Noch offen">
                    <ul className="flex flex-col gap-1 text-sm">
                        {openTopics.map(({topic, missingSec}) => (
                            <li key={topic.id} className="flex items-center gap-2">
                                <span className="h-3 w-3 shrink-0 rounded-full" style={{background: topic.color}}/>
                                <span className="flex-1 truncate">{topic.name}</span>
                                <span className="tabular-nums text-neutral-500">noch {formatDuration(missingSec)}</span>
                            </li>
                        ))}
                    </ul>
                </Card>
            )}
        </div>
    );
};

export default Statistics;
