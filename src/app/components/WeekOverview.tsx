"use client"

import {useMemo, useState} from "react";
import {EChartsOption} from "echarts";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {faChevronLeft, faChevronRight} from "@fortawesome/free-solid-svg-icons";
import {useActiveGoal} from "./LearnItProvider";
import {useToday} from "../lib/useToday";
import EChart, {useDarkMode} from "./EChart";
import {addDays, sessionsBetween, startOfWeek, totalSec, weekByTopic} from "../lib/stats";
import {formatDuration, formatShortDate} from "../lib/format";

const WEEKDAYS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

/** Stacked bar chart of the learned time per day and topic for one week. */
const WeekOverview = () => {
    const {topics, sessions} = useActiveGoal();
    const dark = useDarkMode();
    const currentWeek = startOfWeek(useToday());
    const [weekStart, setWeekStart] = useState(currentWeek);
    const isCurrentWeek = weekStart >= currentWeek;

    const weekSessions = useMemo(
        () => sessionsBetween(sessions, weekStart, addDays(weekStart, 7)),
        [sessions, weekStart],
    );
    const total = totalSec(weekSessions);

    const option = useMemo<EChartsOption>(() => {
        const series = weekByTopic(weekSessions, weekStart, topics).filter(s => s.values.some(v => v > 0));
        const axisColor = dark ? '#a3a3a3' : '#525252';
        return {
            tooltip: {
                trigger: 'axis',
                axisPointer: {type: 'shadow'},
                formatter: (params) => {
                    const items = (Array.isArray(params) ? params : [params]).filter(p => Number(p.value) > 0);
                    const head = items[0]?.name ?? "";
                    const sum = items.reduce((s, p) => s + Number(p.value) * 60, 0);
                    return [`<b>${head}</b> – ${formatDuration(sum)}`,
                        ...items.map(p => `${p.marker}${p.seriesName}: ${formatDuration(Number(p.value) * 60)}`)].join("<br/>");
                },
            },
            grid: {left: 8, right: 8, top: 40, bottom: 8, containLabel: true},
            xAxis: {
                type: 'category',
                data: WEEKDAYS.map((d, i) => `${d} ${formatShortDate(addDays(weekStart, i))}`),
                axisLabel: {color: axisColor, formatter: (v: string) => v.split(" ")[0]},
            },
            yAxis: {
                type: 'value',
                name: 'Minuten',
                nameTextStyle: {color: axisColor},
                axisLabel: {color: axisColor},
                splitLine: {lineStyle: {color: dark ? '#333' : '#e5e5e5'}},
                minInterval: 15,
            },
            series: series.map(({topic, values}) => ({
                name: topic.name,
                type: 'bar',
                stack: 'total',
                itemStyle: {color: topic.color},
                emphasis: {focus: 'series'},
                data: values.map(v => Math.round(v / 60)),
            })),
        };
    }, [weekSessions, weekStart, topics, dark]);

    return (
        <div>
            <div className="flex items-center justify-between gap-2">
                <button onClick={() => setWeekStart(w => addDays(w, -7))} title="Vorherige Woche"
                        className="rounded-md px-2 py-1 hover:bg-neutral-100 dark:hover:bg-neutral-800">
                    <FontAwesomeIcon icon={faChevronLeft}/>
                </button>
                <div className="text-center">
                    <div className="text-sm font-semibold">
                        {isCurrentWeek ? "Diese Woche" : `${formatShortDate(weekStart)} – ${formatShortDate(addDays(weekStart, 6))}`}
                    </div>
                    <div className="text-xs text-neutral-500">{formatDuration(total)} gelernt</div>
                </div>
                <button onClick={() => setWeekStart(w => addDays(w, 7))} disabled={isCurrentWeek} title="Nächste Woche"
                        className="rounded-md px-2 py-1 hover:bg-neutral-100 disabled:opacity-30 dark:hover:bg-neutral-800">
                    <FontAwesomeIcon icon={faChevronRight}/>
                </button>
            </div>
            {total === 0
                ? <p className="flex h-64 items-center justify-center text-sm text-neutral-500">Keine Sessions in dieser Woche.</p>
                : <EChart option={option}/>}
        </div>
    );
};

export default WeekOverview;
