"use client"

import {useLayoutEffect, useMemo, useRef, useState} from "react";
import {EChartsOption} from "echarts";
import {useActiveGoal} from "./LearnItProvider";
import EChart, {useDarkMode} from "./EChart";
import Card from "./Card";
import {addDays, fromDateKey, secondsByDay, startOfWeek, toDateKey} from "../lib/stats";
import {useToday} from "../lib/useToday";
import {formatDate, formatDuration} from "../lib/format";

const MONTHS = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];
const DAYS = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];

/** Upper bounds (minutes) of the intensity levels, like GitHub's contribution graph. */
const LEVELS = [0, 30, 60, 120];
const LEVEL_LABELS = ["0 min", "bis 30 min", "bis 1 h", "bis 2 h", "über 2 h"];
const PALETTE = {
    light: ["#ebedf0", "#9be9a8", "#40c463", "#30a14e", "#216e39"],
    dark: ["#262626", "#0e4429", "#006d32", "#26a641", "#39d353"],
};
const TODAY_COLOR = "#2563eb";
const DUE_COLOR = "#dc2626";

/** Space between two calendar cells in px. */
const GAP = 3;
const LABEL_SPACE_X = 40;
const LABEL_SPACE_Y = 50;

function useWidth() {
    const ref = useRef<HTMLDivElement>(null);
    const [width, setWidth] = useState(0);
    useLayoutEffect(() => {
        if (!ref.current) return;
        const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
        observer.observe(ref.current);
        return () => observer.disconnect();
    }, []);
    return [ref, width] as const;
}

/** GitHub-style calendar heatmap from the start of the goal up to its due date. */
const LearningCalendar = () => {
    const {goal, sessions} = useActiveGoal();
    const today = useToday();
    const dark = useDarkMode();
    const [containerRef, width] = useWidth();

    const todayKey = toDateKey(today);
    const dueKey = goal?.dueDate ?? null;

    const firstSession = sessions.reduce((min, s) => Math.min(min, s.startedAt), Infinity);
    const rangeStart = Math.min(goal?.createdAt ?? today, firstSession, today);
    // Without a due date show the next four weeks as an outlook.
    const rangeEnd = Math.max(dueKey ? fromDateKey(dueKey) : addDays(today, 28), today);
    const startKey = toDateKey(rangeStart);
    const endKey = toDateKey(rangeEnd);

    const weeks = Math.round((startOfWeek(rangeEnd) - startOfWeek(rangeStart)) / (7 * 86_400_000)) + 1;
    const cell = Math.max(12, Math.min(26, Math.floor((width - LABEL_SPACE_X - 10) / weeks)));
    const chartWidth = Math.max(width, weeks * cell + LABEL_SPACE_X + 10);
    const chartHeight = 7 * cell + LABEL_SPACE_Y;

    const perDay = useMemo(() => secondsByDay(sessions), [sessions]);
    const learnedDays = [...perDay.entries()].filter(([key, sec]) => key >= startKey && key <= endKey && sec > 0).length;
    const totalDays = Math.round((fromDateKey(endKey) - fromDateKey(startKey)) / 86_400_000) + 1;

    const option = useMemo<EChartsOption>(() => {
        const colors = dark ? PALETTE.dark : PALETTE.light;
        const gap = dark ? "#171717" : "#ffffff";
        const labelColor = dark ? "#a3a3a3" : "#525252";

        const items = [];
        for (let day = fromDateKey(startKey); day <= fromDateKey(endKey); day = addDays(day, 1)) {
            const key = toDateKey(day);
            const minutes = Math.round((perDay.get(key) ?? 0) / 60);
            items.push([key, minutes]);
        }

        // Outlines for today and the due date. They are a separate series drawn above the
        // heatmap; a border on the heatmap cell itself is partly covered by its neighbours.
        const markers = [
            todayKey !== dueKey && todayKey >= startKey && todayKey <= endKey && {value: [todayKey, 0], color: TODAY_COLOR},
            dueKey && dueKey >= startKey && dueKey <= endKey && {value: [dueKey, 0], color: DUE_COLOR},
        ].filter(m => !!m).map(m => ({value: m.value, itemStyle: {borderColor: m.color}}));

        return {
            tooltip: {
                formatter: (p) => {
                    const item = Array.isArray(p) ? p[0] : p;
                    const [key, minutes] = item.value as [string, number];
                    const tags = [key === todayKey && "Heute", key === dueKey && "Fälligkeitsdatum"].filter(Boolean);
                    return `<b>${formatDate(fromDateKey(key))}</b>${tags.length ? ` · ${tags.join(" · ")}` : ""}`
                        + `<br/>${minutes > 0 ? `${formatDuration(minutes * 60)} gelernt` : "Nicht gelernt"}`;
                },
            },
            visualMap: {
                type: "piecewise",
                show: false,
                seriesIndex: 0,
                dimension: 1,
                pieces: [
                    {lte: LEVELS[0], color: colors[0]},
                    {gt: LEVELS[0], lte: LEVELS[1], color: colors[1]},
                    {gt: LEVELS[1], lte: LEVELS[2], color: colors[2]},
                    {gt: LEVELS[2], lte: LEVELS[3], color: colors[3]},
                    {gt: LEVELS[3], color: colors[4]},
                ],
            },
            calendar: {
                range: [startKey, endKey],
                orient: "horizontal",
                // Only left + cellSize: setting right as well would stretch the cells.
                left: Math.max(LABEL_SPACE_X, (chartWidth - weeks * cell) / 2),
                top: 30,
                cellSize: [cell, cell],
                splitLine: {show: false},
                itemStyle: {color: "transparent", borderWidth: 0},
                dayLabel: {firstDay: 1, nameMap: DAYS, color: labelColor, fontSize: 11},
                monthLabel: {nameMap: MONTHS, color: labelColor, fontSize: 11},
                yearLabel: {show: false},
            },
            series: [
                {
                    type: "heatmap",
                    coordinateSystem: "calendar",
                    itemStyle: {borderColor: gap, borderWidth: GAP, borderRadius: 3},
                    data: items,
                },
                {
                    type: "scatter",
                    coordinateSystem: "calendar",
                    symbol: "roundRect",
                    // Exactly the visible part of a cell (the cell minus the gap).
                    symbolSize: cell - GAP,
                    itemStyle: {color: "transparent", borderWidth: 2},
                    silent: true,
                    z: 10,
                    data: markers,
                },
            ],
        };
    }, [dark, startKey, endKey, perDay, dueKey, todayKey, cell, chartWidth, weeks]);

    const colors = dark ? PALETTE.dark : PALETTE.light;

    return (
        <Card title="Lernkalender">
            <div ref={containerRef} className="overflow-x-auto">
                {width > 0 && <EChart option={option} className="" style={{width: chartWidth, height: chartHeight}}/>}
            </div>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-xs text-neutral-500">
                <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1">
                        <span className="h-3 w-3 rounded-sm border-2" style={{borderColor: TODAY_COLOR}}/> Heute
                    </span>
                    <span className="flex items-center gap-1">
                        <span className="h-3 w-3 rounded-sm border-2" style={{borderColor: DUE_COLOR}}/> Fälligkeitsdatum
                    </span>
                    <span>Gelernt an {learnedDays} von {totalDays} Tagen</span>
                </div>
                <div className="flex items-center gap-1">
                    weniger
                    {colors.map((c, i) => <span key={c} title={LEVEL_LABELS[i]} className="h-3 w-3 rounded-sm" style={{background: c}}/>)}
                    mehr
                </div>
            </div>
        </Card>
    );
};

export default LearningCalendar;
