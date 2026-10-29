"use client"

import {useEffect, useState} from "react";
import {startOfDay} from "./stats";

export function useToday(): number {
    const [today, setToday] = useState(() => startOfDay(Date.now()));
    useEffect(() => {
        const intervalId = setInterval(() => setToday(startOfDay(Date.now())), 60_000);
        return () => clearInterval(intervalId);
    }, []);
    return today;
}
