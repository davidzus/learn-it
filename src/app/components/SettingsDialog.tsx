"use client"

import {ChangeEvent, useEffect, useRef, useState} from "react";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {faDownload, faTrash, faUpload, faXmark} from "@fortawesome/free-solid-svg-icons";
import {useStore} from "./LearnItProvider";
import {defaultData, parseData} from "../lib/storage";
import {Settings} from "../lib/types";

const clampMinutes = (value: string) => Math.min(180, Math.max(1, Math.round(Number(value) || 1)));

const SettingsDialog = ({open, onClose}: { open: boolean; onClose: () => void }) => {
    const {data, update, replace} = useStore();
    const dialogRef = useRef<HTMLDialogElement>(null);
    const fileRef = useRef<HTMLInputElement>(null);
    const [focus, setFocus] = useState(String(data.settings.focusMinutes));
    const [pause, setPause] = useState(String(data.settings.breakMinutes));

    useEffect(() => {
        const dialog = dialogRef.current;
        if (!dialog) return;
        if (open && !dialog.open) {
            setFocus(String(data.settings.focusMinutes));
            setPause(String(data.settings.breakMinutes));
            dialog.showModal();
        }
        if (!open && dialog.open) dialog.close();
    }, [open, data.settings.focusMinutes, data.settings.breakMinutes]);

    const setSetting = (patch: Partial<Settings>) => update(d => ({...d, settings: {...d.settings, ...patch}}));

    const exportData = () => {
        const blob = new Blob([JSON.stringify(data, null, 2)], {type: "application/json"});
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `learn-it-backup-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const importData = async (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        e.target.value = "";
        if (!file) return;
        try {
            const parsed = parseData(JSON.parse(await file.text()));
            if (!parsed) throw new Error("invalid");
            if (!confirm(`${parsed.topics.length} Themen und ${parsed.sessions.length} Sessions importieren? Die aktuellen Daten werden ersetzt.`)) return;
            replace({...parsed, timer: {...parsed.timer, status: "idle", runningSince: null}});
        } catch {
            alert("Die Datei konnte nicht gelesen werden. Bitte eine Learn-IT-Sicherung (JSON) auswählen.");
        }
    };

    const resetData = () => {
        if (!confirm("Alle Themen, Sessions und Einstellungen unwiderruflich löschen?")) return;
        replace(defaultData());
    };

    const numberInput = "w-20 rounded-md border border-neutral-300 bg-transparent p-2 text-right dark:border-neutral-600";
    const button = "flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-semibold";

    return (
        <dialog ref={dialogRef} onClose={onClose}
                className="m-auto w-[min(28rem,calc(100vw-2rem))] rounded-xl bg-white p-0 text-neutral-900 shadow-xl backdrop:bg-black/50 dark:bg-neutral-900 dark:text-neutral-100">
            <div className="flex items-center justify-between border-b border-neutral-200 p-4 dark:border-neutral-800">
                <h2 className="text-lg font-bold">Einstellungen</h2>
                <button onClick={onClose} title="Schließen" className="text-neutral-500 hover:text-neutral-900 dark:hover:text-white">
                    <FontAwesomeIcon icon={faXmark}/>
                </button>
            </div>

            <div className="flex flex-col gap-5 p-4">
                <section className="flex flex-col gap-3">
                    <h3 className="text-sm font-bold uppercase tracking-wide text-neutral-500">Timer-Intervalle</h3>
                    <label className="flex items-center justify-between gap-2">
                        Fokus (Minuten)
                        <input type="number" min={1} max={180} value={focus} className={numberInput}
                               onChange={e => setFocus(e.target.value)}
                               onBlur={() => { const v = clampMinutes(focus); setFocus(String(v)); setSetting({focusMinutes: v}); }}/>
                    </label>
                    <label className="flex items-center justify-between gap-2">
                        Pause (Minuten)
                        <input type="number" min={1} max={180} value={pause} className={numberInput}
                               onChange={e => setPause(e.target.value)}
                               onBlur={() => { const v = clampMinutes(pause); setPause(String(v)); setSetting({breakMinutes: v}); }}/>
                    </label>
                    <button onClick={() => { setFocus("30"); setPause("5"); setSetting({focusMinutes: 30, breakMinutes: 5}); }}
                            className="self-start text-sm text-neutral-500 underline hover:text-neutral-900 dark:hover:text-white">
                        Standard wiederherstellen (30 / 5 min)
                    </button>
                    <p className="text-xs text-neutral-500">Änderungen gelten ab dem nächsten Intervall.</p>
                </section>

                <section className="flex flex-col gap-2">
                    <h3 className="text-sm font-bold uppercase tracking-wide text-neutral-500">Ablauf</h3>
                    <label className="flex items-center gap-2">
                        <input type="checkbox" checked={data.settings.autoStartBreak}
                               onChange={e => setSetting({autoStartBreak: e.target.checked})}/>
                        Pause automatisch starten
                    </label>
                    <label className="flex items-center gap-2">
                        <input type="checkbox" checked={data.settings.autoStartFocus}
                               onChange={e => setSetting({autoStartFocus: e.target.checked})}/>
                        Nach der Pause automatisch weiterlernen
                    </label>
                    <label className="flex items-center gap-2">
                        <input type="checkbox" checked={data.settings.sound}
                               onChange={e => setSetting({sound: e.target.checked})}/>
                        Signalton am Ende eines Intervalls
                    </label>
                </section>

                <section className="flex flex-col gap-2">
                    <h3 className="text-sm font-bold uppercase tracking-wide text-neutral-500">Daten</h3>
                    <p className="text-xs text-neutral-500">
                        Alle Daten werden nur lokal im Browser (localStorage) gespeichert. Erstelle eine Sicherung,
                        bevor du den Browserverlauf löschst oder das Gerät wechselst.
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                        <button onClick={exportData} className={`${button} bg-neutral-200 hover:bg-neutral-300 dark:bg-neutral-700 dark:hover:bg-neutral-600`}>
                            <FontAwesomeIcon icon={faDownload}/> Exportieren
                        </button>
                        <button onClick={() => fileRef.current?.click()} className={`${button} bg-neutral-200 hover:bg-neutral-300 dark:bg-neutral-700 dark:hover:bg-neutral-600`}>
                            <FontAwesomeIcon icon={faUpload}/> Importieren
                        </button>
                    </div>
                    <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={importData}/>
                    <button onClick={resetData} className={`${button} text-red-600 hover:bg-red-50 dark:hover:bg-red-950`}>
                        <FontAwesomeIcon icon={faTrash}/> Alle Daten zurücksetzen
                    </button>
                </section>
            </div>
        </dialog>
    );
};

export default SettingsDialog;
