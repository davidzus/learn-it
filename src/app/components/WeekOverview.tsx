"use client"

import {useMemo, useState} from "react";
import {EChartsOption} from "echarts";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {faChevronLeft, faChevronRight} from "@fortawesome/free-solid-svg-icons";
import {useActiveGoal} from "./LearnItProvider";
import {useToday} from "../lib/useToday";
import EChart, {useDarkMode} from "./EChart";
import {addDays, secondsPerWeekdayByTopic, sessionsBetween, startOfWeek, totalSeconds} from "../lib/stats";
import {formatDuration, formatShortDate} from "../lib/format";

const WEEKDAY_NAMES = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

const WeekOverview = () => {
    const {topics, sessions} = useActiveGoal();
    const isDarkMode = useDarkMode();
    const currentWeekStart = startOfWeek(useToday());
    const [weekStart, setWeekStart] = useState(currentWeekStart);
    const isCurrentWeek = weekStart >= currentWeekStart;

    const weekSessions = useMemo(
        () => sessionsBetween(sessions, weekStart, addDays(weekStart, 7)),
        [sessions, weekStart],
    );
    const weekTotalSeconds = totalSeconds(weekSessions);

    const option = useMemo<EChartsOption>(() => {
        const topicsWithTime = secondsPerWeekdayByTopic(weekSessions, weekStart, topics)
            .filter(({secondsPerDay}) => secondsPerDay.some(seconds => seconds > 0));
        const axisColor = isDarkMode ? '#a3a3a3' : '#525252';

        return {
            tooltip: {
                trigger: 'axis',
                axisPointer: {type: 'shadow'},
                formatter: (params) => {
                    const barsWithTime = (Array.isArray(params) ? params : [params]).filter(bar => Number(bar.value) > 0);
                    const dayLabel = barsWithTime[0]?.name ?? "";
                    const daySeconds = barsWithTime.reduce((sum, bar) => sum + Number(bar.value) * 60, 0);
                    const topicLines = barsWithTime.map(bar => `${bar.marker}${bar.seriesName}: ${formatDuration(Number(bar.value) * 60)}`);
                    return [`<b>${dayLabel}</b> – ${formatDuration(daySeconds)}`, ...topicLines].join("<br/>");
                },
            },
            grid: {left: 8, right: 8, top: 40, bottom: 8, containLabel: true},
            xAxis: {
                type: 'category',
                data: WEEKDAY_NAMES.map((weekdayName, dayIndex) => `${weekdayName} ${formatShortDate(addDays(weekStart, dayIndex))}`),
                axisLabel: {color: axisColor, formatter: (label: string) => label.split(" ")[0]},
            },
            yAxis: {
                type: 'value',
                name: 'Minuten',
                nameTextStyle: {color: axisColor},
                axisLabel: {color: axisColor},
                splitLine: {lineStyle: {color: isDarkMode ? '#333' : '#e5e5e5'}},
                minInterval: 15,
            },
            series: topicsWithTime.map(({topic, secondsPerDay}) => ({
                name: topic.name,
                type: 'bar',
                stack: 'total',
                itemStyle: {color: topic.color},
                emphasis: {focus: 'series'},
                data: secondsPerDay.map(seconds => Math.round(seconds / 60)),
            })),
        };
    }, [weekSessions, weekStart, topics, isDarkMode]);

    const weekLabel = isCurrentWeek
        ? "Diese Woche"
        : `${formatShortDate(weekStart)} – ${formatShortDate(addDays(weekStart, 6))}`;

    return (
        <div>
            <div className="flex items-center justify-between gap-2">
                <button onClick={() => setWeekStart(shownWeekStart => addDays(shownWeekStart, -7))} title="Vorherige Woche"
                        className="rounded-md px-2 py-1 hover:bg-neutral-100 dark:hover:bg-neutral-800">
                    <FontAwesomeIcon icon={faChevronLeft}/>
                </button>
                <div className="text-center">
                    <div className="text-sm font-semibold">{weekLabel}</div>
                    <div className="text-xs text-neutral-500">{formatDuration(weekTotalSeconds)} gelernt</div>
                </div>
                <button onClick={() => setWeekStart(shownWeekStart => addDays(shownWeekStart, 7))} disabled={isCurrentWeek} title="Nächste Woche"
                        className="rounded-md px-2 py-1 hover:bg-neutral-100 disabled:opacity-30 dark:hover:bg-neutral-800">
                    <FontAwesomeIcon icon={faChevronRight}/>
                </button>
            </div>
            {weekTotalSeconds === 0
                ? <p className="flex h-64 items-center justify-center text-sm text-neutral-500">Keine Sessions in dieser Woche.</p>
                : <EChart option={option}/>}
        </div>
    );
};

export default WeekOverview;
