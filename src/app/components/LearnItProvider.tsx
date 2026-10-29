"use client"

import {createContext, ReactNode, use, useCallback, useEffect, useMemo, useState} from "react";
import {browser} from "react-dom";
import {AppData} from "../lib/types";
import {loadData, saveData} from "../lib/storage";
import {activeGoalScope} from "../lib/stats";

type Store = {
    data: AppData;
    update: (fn: (data: AppData) => AppData) => void;
    replace: (data: AppData) => void;
};

const StoreContext = createContext<Store | null>(null);

export function useStore(): Store {
    const store = use(StoreContext);
    if (!store) throw new Error("useStore must be used inside <LearnItProvider>");
    return store;
}

/** The active goal ("Oberthema") with only its topics and sessions. */
export function useActiveGoal() {
    const {data} = useStore();
    return useMemo(() => activeGoalScope(data), [data]);
}

/** Holds all application data and persists every change to the browser's localStorage. */
export default function LearnItProvider({children}: { children: ReactNode }) {
    use(browser("Learn-IT speichert alle Daten im localStorage des Browsers."));

    const [data, setData] = useState<AppData>(loadData);

    useEffect(() => saveData(data), [data]);

    // Keep several open tabs in sync.
    useEffect(() => {
        const onStorage = (e: StorageEvent) => {
            if (e.key === "learn-it:data") setData(loadData());
        };
        window.addEventListener("storage", onStorage);
        return () => window.removeEventListener("storage", onStorage);
    }, []);

    const update = useCallback((fn: (data: AppData) => AppData) => setData(fn), []);
    const replace = useCallback((next: AppData) => setData(next), []);

    return <StoreContext value={{data, update, replace}}>{children}</StoreContext>;
}
