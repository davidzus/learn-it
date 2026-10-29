"use client"

import {useMemo, useState} from "react";
import {useActiveGoal} from "./LearnItProvider";
import Card from "./Card";
import WeekOverview from "./WeekOverview";
import PieChart, {PieSlice} from "./PieChart";
import {useToday} from "../lib/useToday";
import {addDays, countStreakDays, secondsByTopic, sessionsBetween, startOfWeek, totalSeconds} from "../lib/stats";
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

function formatTotalTime(seconds: number): string {
    return seconds < 3600 ? formatDuration(seconds) : `${formatHours(seconds)} h`;
}

const Statistics = () => {
    const {topics, sessions} = useActiveGoal();
    const [period, setPeriod] = useState<Period>("week");
    const today = useToday();
    const weekStart = startOfWeek(today);

    const todaySeconds = totalSeconds(sessionsBetween(sessions, today, addDays(today, 1)));
    const weekSeconds = totalSeconds(sessionsBetween(sessions, weekStart, addDays(weekStart, 7)));
    const allTimeSeconds = totalSeconds(sessions);
    const streakDays = countStreakDays(sessions, today);

    const periodStart = {today, week: weekStart, all: -Infinity}[period];
    const secondsPerTopicInPeriod = secondsByTopic(sessionsBetween(sessions, periodStart, Infinity));
    const pieSlices: PieSlice[] = topics
        .map(topic => ({name: topic.name, value: secondsPerTopicInPeriod.get(topic.id) ?? 0, color: topic.color}))
        .filter(slice => slice.value > 0)
        .sort((first, second) => second.value - first.value);

    const unfinishedTopics = useMemo(() => {
        const secondsPerTopic = secondsByTopic(sessions);
        return topics
            .filter(topic => topic.targetMinutes > 0)
            .map(topic => ({topic, missingSeconds: topic.targetMinutes * 60 - (secondsPerTopic.get(topic.id) ?? 0)}))
            .filter(({missingSeconds}) => missingSeconds > 0)
            .sort((first, second) => second.missingSeconds - first.missingSeconds);
    }, [sessions, topics]);

    return (
        <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <StatTile label="Heute" value={formatDuration(todaySeconds)}/>
                <StatTile label="Diese Woche" value={formatDuration(weekSeconds)}/>
                <StatTile label="Gesamt" value={formatTotalTime(allTimeSeconds)} hint={`${sessions.length} Sessions`}/>
                <StatTile label="Serie" value={`${streakDays} ${streakDays === 1 ? "Tag" : "Tage"}`} hint="in Folge gelernt"/>
            </div>

            <Card title="Wochenübersicht">
                <WeekOverview/>
            </Card>

            <Card title="Zeit pro Thema" actions={
                <div className="flex gap-1 rounded-lg bg-neutral-100 p-1 dark:bg-neutral-800">
                    {PERIODS.map(periodOption => (
                        <button key={periodOption.id} onClick={() => setPeriod(periodOption.id)}
                                className={`rounded-md px-2 py-0.5 text-xs font-semibold ${period === periodOption.id
                                    ? "bg-white shadow dark:bg-neutral-600" : "text-neutral-500"}`}>
                            {periodOption.label}
                        </button>
                    ))}
                </div>
            }>
                {pieSlices.length === 0
                    ? <p className="flex h-72 items-center justify-center text-sm text-neutral-500">Noch keine Lernzeit in diesem Zeitraum.</p>
                    : <PieChart slices={pieSlices}/>}
            </Card>

            {unfinishedTopics.length > 0 && (
                <Card title="Noch offen">
                    <ul className="flex flex-col gap-1 text-sm">
                        {unfinishedTopics.map(({topic, missingSeconds}) => (
                            <li key={topic.id} className="flex items-center gap-2">
                                <span className="h-3 w-3 shrink-0 rounded-full" style={{background: topic.color}}/>
                                <span className="flex-1 truncate">{topic.name}</span>
                                <span className="tabular-nums text-neutral-500">noch {formatDuration(missingSeconds)}</span>
                            </li>
                        ))}
                    </ul>
                </Card>
            )}
        </div>
    );
};

export default Statistics;
