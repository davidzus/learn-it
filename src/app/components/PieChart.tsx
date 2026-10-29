"use client"

import {useMemo} from "react";
import {EChartsOption} from "echarts";
import EChart, {useDarkMode} from "./EChart";
import {formatDuration} from "../lib/format";

export type PieSlice = { name: string; value: number; color: string };

const PieChart = ({slices}: { slices: PieSlice[] }) => {
    const isDarkMode = useDarkMode();

    const option = useMemo<EChartsOption>(() => ({
        tooltip: {
            trigger: 'item',
            formatter: (params) => {
                const hoveredSlice = Array.isArray(params) ? params[0] : params;
                const duration = formatDuration(Number(hoveredSlice.value));
                return `${hoveredSlice.marker}${hoveredSlice.name}<br/><b>${duration}</b> (${hoveredSlice.percent} %)`;
            },
        },
        legend: {bottom: 0, type: 'scroll', textStyle: {color: isDarkMode ? '#d4d4d4' : '#404040'}},
        series: [
            {
                name: 'Lernzeit',
                type: 'pie',
                radius: ['40%', '70%'],
                center: ['50%', '42%'],
                avoidLabelOverlap: true,
                itemStyle: {
                    borderRadius: 10,
                    borderColor: isDarkMode ? '#171717' : '#fff',
                    borderWidth: 2
                },
                label: {show: false},
                labelLine: {show: false},
                data: slices.map(slice => ({name: slice.name, value: slice.value, itemStyle: {color: slice.color}})),
            }
        ]
    }), [slices, isDarkMode]);

    return <EChart option={option} className="h-72 w-full"/>;
};

export default PieChart;
