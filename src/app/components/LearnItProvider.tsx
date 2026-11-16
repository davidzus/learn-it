"use client"

import {createContext, ReactNode, use, useCallback, useEffect, useMemo, useState} from "react";
import {browser} from "react-dom";
import {AppData} from "../lib/types";
import {loadStoredData, parseStoredData, saveStoredData, STORAGE_KEY, StoredData} from "../lib/storage";
import {getActiveGoalScope} from "../lib/stats";

type Store = {
    data: AppData;
    update: (updater: (data: AppData) => AppData) => void;
    replace: (data: AppData) => void;
};

const StoreContext = createContext<Store | null>(null);

const DATA_FILE_ENDPOINT = "/api/data";
const FILE_SYNC_DELAY_MS = 500;
const NO_FILE = -1;

export function useStore(): Store {
    const store = use(StoreContext);
    if (!store) throw new Error("useStore must be used inside <LearnItProvider>");
    return store;
}

export function useActiveGoal() {
    const {data} = useStore();
    return useMemo(() => getActiveGoalScope(data), [data]);
}

async function readStoredResponse(response: Response): Promise<StoredData | null> {
    const body = await response.json();
    return parseStoredData(body?.stored);
}

async function fetchDataFile(): Promise<StoredData | null> {
    const response = await fetch(DATA_FILE_ENDPOINT, {cache: "no-store"});
    if (!response.ok) throw new Error(`GET ${DATA_FILE_ENDPOINT} → ${response.status}`);
    return readStoredResponse(response);
}

/** Returns the file's newer copy when the server rejected our write as stale, otherwise null. */
async function pushDataFile(storedData: StoredData): Promise<StoredData | null> {
    const response = await fetch(DATA_FILE_ENDPOINT, {
        method: "PUT",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify(storedData),
    });
    if (response.status === 409) return readStoredResponse(response);
    if (!response.ok) throw new Error(`PUT ${DATA_FILE_ENDPOINT} → ${response.status}`);
    return null;
}

const newerOf = (current: StoredData, candidate: StoredData) =>
    candidate.updatedAt > current.updatedAt ? candidate : current;

export default function LearnItProvider({children}: { children: ReactNode }) {
    use(browser("Learn-IT speichert alle Daten im localStorage des Browsers und in data/learn-it.json."));

    const [stored, setStored] = useState<StoredData>(loadStoredData);
    // `updatedAt` of the copy known to be in data/learn-it.json; null until the first pull succeeded.
    const [fileUpdatedAt, setFileUpdatedAt] = useState<number | null>(null);

    useEffect(() => saveStoredData(stored), [stored]);

    // Pull: adopt the file's copy when it is newer (e.g. first load on a new port),
    // again whenever the tab becomes visible.
    useEffect(() => {
        let active = true;
        const applyFileData = (fileData: StoredData | null) => {
            if (!active) return;
            if (fileData) setStored(current => newerOf(current, fileData));
            setFileUpdatedAt(fileData?.updatedAt ?? NO_FILE);
        };
        const pullFromFile = () => fetchDataFile().then(applyFileData).catch(error =>
            console.warn("Lokale JSON-Datei nicht erreichbar – Daten bleiben nur im Browser gespeichert.", error));
        const pullWhenVisible = () => {
            if (document.visibilityState === "visible") void pullFromFile();
        };

        void pullFromFile();
        document.addEventListener("visibilitychange", pullWhenVisible);
        return () => {
            active = false;
            document.removeEventListener("visibilitychange", pullWhenVisible);
        };
    }, []);

    // Push: write every change to the file (debounced), once the initial pull has finished.
    useEffect(() => {
        if (fileUpdatedAt === null || stored.updatedAt === fileUpdatedAt) return;
        const timeoutId = setTimeout(async () => {
            try {
                const newerFileData = await pushDataFile(stored);
                if (newerFileData) setStored(current => newerOf(current, newerFileData));
                setFileUpdatedAt(newerFileData?.updatedAt ?? stored.updatedAt);
            } catch (error) {
                console.warn("Daten konnten nicht in die lokale JSON-Datei geschrieben werden.", error);
            }
        }, FILE_SYNC_DELAY_MS);
        return () => clearTimeout(timeoutId);
    }, [stored, fileUpdatedAt]);

    useEffect(() => {
        const reloadWhenOtherTabSaves = (event: StorageEvent) => {
            if (event.key === STORAGE_KEY) setStored(loadStoredData());
        };
        window.addEventListener("storage", reloadWhenOtherTabSaves);
        return () => window.removeEventListener("storage", reloadWhenOtherTabSaves);
    }, []);

    const update = useCallback((updater: (data: AppData) => AppData) => {
        setStored(current => {
            const data = updater(current.data);
            return data === current.data ? current : {data, updatedAt: Date.now()};
        });
    }, []);

    const replace = useCallback((data: AppData) => setStored({data, updatedAt: Date.now()}), []);

    const store = useMemo(() => ({data: stored.data, update, replace}), [stored.data, update, replace]);

    return <StoreContext value={store}>{children}</StoreContext>;
}
