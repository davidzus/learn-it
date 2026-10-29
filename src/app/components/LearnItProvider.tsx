"use client"

import {createContext, ReactNode, use, useEffect, useMemo, useState} from "react";
import {browser} from "react-dom";
import {AppData} from "../lib/types";
import {loadData, saveData, STORAGE_KEY} from "../lib/storage";
import {getActiveGoalScope} from "../lib/stats";

type Store = {
    data: AppData;
    update: (updater: (data: AppData) => AppData) => void;
    replace: (data: AppData) => void;
};

const StoreContext = createContext<Store | null>(null);

export function useStore(): Store {
    const store = use(StoreContext);
    if (!store) throw new Error("useStore must be used inside <LearnItProvider>");
    return store;
}

export function useActiveGoal() {
    const {data} = useStore();
    return useMemo(() => getActiveGoalScope(data), [data]);
}

export default function LearnItProvider({children}: { children: ReactNode }) {
    use(browser("Learn-IT speichert alle Daten im localStorage des Browsers."));

    const [data, setData] = useState<AppData>(loadData);

    useEffect(() => saveData(data), [data]);

    useEffect(() => {
        const reloadWhenOtherTabSaves = (event: StorageEvent) => {
            if (event.key === STORAGE_KEY) setData(loadData());
        };
        window.addEventListener("storage", reloadWhenOtherTabSaves);
        return () => window.removeEventListener("storage", reloadWhenOtherTabSaves);
    }, []);

    return <StoreContext value={{data, update: setData, replace: setData}}>{children}</StoreContext>;
}
