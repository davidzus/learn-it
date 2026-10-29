"use client"

import {useEffect, useState} from "react";
import {startOfDay} from "./stats";

/** Start of the current day; updates after midnight so day/week statistics roll over. */
export function useToday(): number {
    const [today, setToday] = useState(() => startOfDay(Date.now()));
    useEffect(() => {
        const id = setInterval(() => setToday(startOfDay(Date.now())), 60_000);
        return () => clearInterval(id);
    }, []);
    return today;
}
