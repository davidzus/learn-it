"use client"

import {useMemo} from "react";
import {EChartsOption} from "echarts";
import EChart, {useDarkMode} from "./EChart";
import {formatDuration} from "../lib/format";

export type PieSlice = { name: string; value: number; color: string };

/** Donut chart of learned seconds per topic. */
const PieChart = ({data}: { data: PieSlice[] }) => {
    const dark = useDarkMode();

    const option = useMemo<EChartsOption>(() => ({
        tooltip: {
            trigger: 'item',
            formatter: (p) => {
                const item = Array.isArray(p) ? p[0] : p;
                return `${item.marker}${item.name}<br/><b>${formatDuration(Number(item.value))}</b> (${item.percent} %)`;
            },
        },
        legend: {bottom: 0, type: 'scroll', textStyle: {color: dark ? '#d4d4d4' : '#404040'}},
        series: [
            {
                name: 'Lernzeit',
                type: 'pie',
                radius: ['40%', '70%'],
                center: ['50%', '42%'],
                avoidLabelOverlap: true,
                itemStyle: {
                    borderRadius: 10,
                    borderColor: dark ? '#171717' : '#fff',
                    borderWidth: 2
                },
                label: {show: false},
                labelLine: {
                    show: false
                },
                data: data.map(d => ({name: d.name, value: d.value, itemStyle: {color: d.color}})),
            }
        ]
    }), [data, dark]);

    return <EChart option={option} className="h-72 w-full"/>;
};

export default PieChart;
