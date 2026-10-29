"use client"

import {useLayoutEffect, useMemo, useRef, useState} from "react";
import {EChartsOption} from "echarts";
import {useActiveGoal} from "./LearnItProvider";
import EChart, {useDarkMode} from "./EChart";
import Card from "./Card";
import {addDays, daysBetween, fromDateKey, secondsByDay, startOfWeek, toDateKey} from "../lib/stats";
import {useToday} from "../lib/useToday";
import {formatDate, formatDuration} from "../lib/format";

const MONTH_NAMES = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];
const WEEKDAY_NAMES = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];

const LEVEL_UPPER_BOUNDS_MINUTES = [0, 30, 60, 120];
const LEVEL_LABELS = ["0 min", "bis 30 min", "bis 1 h", "bis 2 h", "über 2 h"];
const LEVEL_COLORS = {
    light: ["#ebedf0", "#9be9a8", "#40c463", "#30a14e", "#216e39"],
    dark: ["#262626", "#0e4429", "#006d32", "#26a641", "#39d353"],
};
const TODAY_COLOR = "#2563eb";
const DUE_DATE_COLOR = "#dc2626";

const OUTLOOK_DAYS_WITHOUT_DUE_DATE = 28;
const CELL_GAP = 3;
const MIN_CELL_SIZE = 12;
const MAX_CELL_SIZE = 26;
const CHART_PADDING_RIGHT = 10;
const LABEL_SPACE_X = 40;
const LABEL_SPACE_Y = 50;

function useElementWidth() {
    const elementRef = useRef<HTMLDivElement>(null);
    const [width, setWidth] = useState(0);
    useLayoutEffect(() => {
        if (!elementRef.current) return;
        const resizeObserver = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
        resizeObserver.observe(elementRef.current);
        return () => resizeObserver.disconnect();
    }, []);
    return [elementRef, width] as const;
}

function getLevelPieces(levelColors: string[]) {
    return levelColors.map((color, levelIndex) => ({
        gt: LEVEL_UPPER_BOUNDS_MINUTES[levelIndex - 1],
        lte: LEVEL_UPPER_BOUNDS_MINUTES[levelIndex],
        color,
    }));
}

function isDateKeyBetween(dateKey: string, startKey: string, endKey: string) {
    return dateKey >= startKey && dateKey <= endKey;
}

const LearningCalendar = () => {
    const {goal, sessions} = useActiveGoal();
    const today = useToday();
    const isDarkMode = useDarkMode();
    const [containerRef, containerWidth] = useElementWidth();

    const todayKey = toDateKey(today);
    const dueDateKey = goal?.dueDate ?? null;

    const firstSessionStart = sessions.reduce((earliest, session) => Math.min(earliest, session.startedAt), Infinity);
    const rangeStart = Math.min(goal?.createdAt ?? today, firstSessionStart, today);
    const plannedEnd = dueDateKey ? fromDateKey(dueDateKey) : addDays(today, OUTLOOK_DAYS_WITHOUT_DUE_DATE);
    const rangeEnd = Math.max(plannedEnd, today);
    const startKey = toDateKey(rangeStart);
    const endKey = toDateKey(rangeEnd);

    const weekCount = daysBetween(startOfWeek(rangeStart), startOfWeek(rangeEnd)) / 7 + 1;
    const fittingCellSize = Math.floor((containerWidth - LABEL_SPACE_X - CHART_PADDING_RIGHT) / weekCount);
    const cellSize = Math.max(MIN_CELL_SIZE, Math.min(MAX_CELL_SIZE, fittingCellSize));
    const gridWidth = weekCount * cellSize;
    const chartWidth = Math.max(containerWidth, gridWidth + LABEL_SPACE_X + CHART_PADDING_RIGHT);
    const chartHeight = 7 * cellSize + LABEL_SPACE_Y;

    const secondsPerDay = useMemo(() => secondsByDay(sessions), [sessions]);
    const learnedDayCount = [...secondsPerDay.entries()]
        .filter(([dateKey, seconds]) => isDateKeyBetween(dateKey, startKey, endKey) && seconds > 0)
        .length;
    const totalDayCount = daysBetween(fromDateKey(startKey), fromDateKey(endKey)) + 1;

    const levelColors = isDarkMode ? LEVEL_COLORS.dark : LEVEL_COLORS.light;

    const option = useMemo<EChartsOption>(() => {
        const cellGapColor = isDarkMode ? "#171717" : "#ffffff";
        const labelColor = isDarkMode ? "#a3a3a3" : "#525252";

        const minutesPerDay: [string, number][] = [];
        for (let day = fromDateKey(startKey); day <= fromDateKey(endKey); day = addDays(day, 1)) {
            const dateKey = toDateKey(day);
            const minutes = Math.round((secondsPerDay.get(dateKey) ?? 0) / 60);
            minutesPerDay.push([dateKey, minutes]);
        }

        const outlinedCell = (dateKey: string, color: string) => ({value: [dateKey, 0], itemStyle: {borderColor: color}});
        const highlightedCells = [];
        if (todayKey !== dueDateKey && isDateKeyBetween(todayKey, startKey, endKey)) {
            highlightedCells.push(outlinedCell(todayKey, TODAY_COLOR));
        }
        if (dueDateKey && isDateKeyBetween(dueDateKey, startKey, endKey)) {
            highlightedCells.push(outlinedCell(dueDateKey, DUE_DATE_COLOR));
        }

        return {
            tooltip: {
                formatter: (params) => {
                    const hoveredCell = Array.isArray(params) ? params[0] : params;
                    const [dateKey, minutes] = hoveredCell.value as [string, number];
                    const tags = [];
                    if (dateKey === todayKey) tags.push("Heute");
                    if (dateKey === dueDateKey) tags.push("Fälligkeitsdatum");

                    const title = `<b>${formatDate(fromDateKey(dateKey))}</b>${tags.length > 0 ? ` · ${tags.join(" · ")}` : ""}`;
                    const learnedText = minutes > 0 ? `${formatDuration(minutes * 60)} gelernt` : "Nicht gelernt";
                    return `${title}<br/>${learnedText}`;
                },
            },
            visualMap: {
                type: "piecewise",
                show: false,
                seriesIndex: 0,
                dimension: 1,
                pieces: getLevelPieces(levelColors),
            },
            calendar: {
                range: [startKey, endKey],
                orient: "horizontal",
                left: Math.max(LABEL_SPACE_X, (chartWidth - gridWidth) / 2),
                top: 30,
                cellSize: [cellSize, cellSize],
                splitLine: {show: false},
                itemStyle: {color: "transparent", borderWidth: 0},
                dayLabel: {firstDay: 1, nameMap: WEEKDAY_NAMES, color: labelColor, fontSize: 11},
                monthLabel: {nameMap: MONTH_NAMES, color: labelColor, fontSize: 11},
                yearLabel: {show: false},
            },
            series: [
                {
                    type: "heatmap",
                    coordinateSystem: "calendar",
                    itemStyle: {borderColor: cellGapColor, borderWidth: CELL_GAP, borderRadius: 3},
                    data: minutesPerDay,
                },
                {
                    type: "scatter",
                    coordinateSystem: "calendar",
                    symbol: "roundRect",
                    symbolSize: cellSize - CELL_GAP,
                    itemStyle: {color: "transparent", borderWidth: 2},
                    silent: true,
                    z: 10,
                    data: highlightedCells,
                },
            ],
        };
    }, [isDarkMode, levelColors, startKey, endKey, secondsPerDay, dueDateKey, todayKey, cellSize, chartWidth, gridWidth]);

    return (
        <Card title="Lernkalender">
            <div ref={containerRef} className="overflow-x-auto">
                {containerWidth > 0 && <EChart option={option} className="" style={{width: chartWidth, height: chartHeight}}/>}
            </div>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-xs text-neutral-500">
                <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1">
                        <span className="h-3 w-3 rounded-sm border-2" style={{borderColor: TODAY_COLOR}}/> Heute
                    </span>
                    <span className="flex items-center gap-1">
                        <span className="h-3 w-3 rounded-sm border-2" style={{borderColor: DUE_DATE_COLOR}}/> Fälligkeitsdatum
                    </span>
                    <span>Gelernt an {learnedDayCount} von {totalDayCount} Tagen</span>
                </div>
                <div className="flex items-center gap-1">
                    weniger
                    {levelColors.map((color, levelIndex) => (
                        <span key={color} title={LEVEL_LABELS[levelIndex]} className="h-3 w-3 rounded-sm" style={{background: color}}/>
                    ))}
                    mehr
                </div>
            </div>
        </Card>
    );
};

export default LearningCalendar;
