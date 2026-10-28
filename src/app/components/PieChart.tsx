"use client"

import * as echarts from 'echarts';
import {EChartsType} from "echarts";
import {useLayoutEffect, useRef} from "react";

function renderChart(chart: EChartsType | null) {
    if (!chart) return;
    chart.setOption({
        tooltip: {
            trigger: 'item'
        },
        series: [
            {
                name: 'Access From',
                type: 'pie',
                radius: ['40%', '70%'],
                avoidLabelOverlap: true,
                itemStyle: {
                    borderRadius: 10,
                    borderColor: '#fff',
                    borderWidth: 2
                },
                labelLine: {
                    show: false
                },
                data: [
                    { value: 1048, name: 'Search Engine' },
                    { value: 735, name: 'Direct' },
                    { value: 580, name: 'Email' },
                    { value: 484, name: 'Union Ads' },
                    { value: 300, name: 'Video Ads' }
                ]
            }
        ]
    });
}

const PieChart = () => {
    const containerRef = useRef<HTMLDivElement>(null);
    const chartInstance = useRef<EChartsType | null>(null);

    useLayoutEffect(() => {
        if (!containerRef.current) return;
        chartInstance.current = echarts.init(containerRef.current);
        renderChart(chartInstance.current);

        const observer = new ResizeObserver(() => chartInstance.current?.resize());
        observer.observe(containerRef.current);

        return () => {
            observer.disconnect();
            chartInstance.current?.dispose();
            chartInstance.current = null;
        };
    }, []);

    return <div ref={containerRef} className="h-64 w-full" />;
};

export default PieChart;