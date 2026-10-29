"use client"

import * as echarts from 'echarts';
import {EChartsOption, EChartsType} from "echarts";
import {CSSProperties, useEffect, useLayoutEffect, useRef, useSyncExternalStore} from "react";

const DARK_MODE_QUERY = "(prefers-color-scheme: dark)";

function subscribeToColorScheme(onChange: () => void) {
    const mediaQuery = window.matchMedia(DARK_MODE_QUERY);
    mediaQuery.addEventListener("change", onChange);
    return () => mediaQuery.removeEventListener("change", onChange);
}

export function useDarkMode(): boolean {
    return useSyncExternalStore(
        subscribeToColorScheme,
        () => window.matchMedia(DARK_MODE_QUERY).matches,
        () => false,
    );
}

const EChart = ({option, className = "h-64 w-full", style}: {
    option: EChartsOption;
    className?: string;
    style?: CSSProperties;
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<EChartsType | null>(null);

    useLayoutEffect(() => {
        if (!containerRef.current) return;
        chartRef.current = echarts.init(containerRef.current);

        const resizeObserver = new ResizeObserver(() => chartRef.current?.resize());
        resizeObserver.observe(containerRef.current);

        return () => {
            resizeObserver.disconnect();
            chartRef.current?.dispose();
            chartRef.current = null;
        };
    }, []);

    useEffect(() => {
        chartRef.current?.setOption(option, {notMerge: true});
    }, [option]);

    return <div ref={containerRef} className={className} style={style}/>;
};

export default EChart;
