"use client"

import * as echarts from 'echarts';
import {EChartsOption, EChartsType} from "echarts";
import {CSSProperties, useEffect, useLayoutEffect, useRef, useSyncExternalStore} from "react";

function subscribeColorScheme(onChange: () => void) {
    const query = window.matchMedia("(prefers-color-scheme: dark)");
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
}

export function useDarkMode(): boolean {
    return useSyncExternalStore(
        subscribeColorScheme,
        () => window.matchMedia("(prefers-color-scheme: dark)").matches,
        () => false,
    );
}

const EChart = ({option, className = "h-64 w-full", style}: {
    option: EChartsOption;
    className?: string;
    style?: CSSProperties;
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const chartInstance = useRef<EChartsType | null>(null);

    useLayoutEffect(() => {
        if (!containerRef.current) return;
        chartInstance.current = echarts.init(containerRef.current);

        const observer = new ResizeObserver(() => chartInstance.current?.resize());
        observer.observe(containerRef.current);

        return () => {
            observer.disconnect();
            chartInstance.current?.dispose();
            chartInstance.current = null;
        };
    }, []);

    useEffect(() => {
        chartInstance.current?.setOption(option, {notMerge: true});
    }, [option]);

    return <div ref={containerRef} className={className} style={style}/>;
};

export default EChart;
