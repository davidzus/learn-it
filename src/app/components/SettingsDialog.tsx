"use client"

import {ChangeEvent, useEffect, useRef, useState} from "react";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {faDownload, faTrash, faUpload, faXmark} from "@fortawesome/free-solid-svg-icons";
import {useStore} from "./LearnItProvider";
import {DEFAULT_SETTINGS, defaultData, parseData} from "../lib/storage";
import {Settings} from "../lib/types";

const MIN_INTERVAL_MINUTES = 1;
const MAX_INTERVAL_MINUTES = 180;

const numberInputClass = "w-20 rounded-md border border-neutral-300 bg-transparent p-2 text-right dark:border-neutral-600";
const buttonClass = "flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-semibold";
const secondaryButtonClass = `${buttonClass} bg-neutral-200 hover:bg-neutral-300 dark:bg-neutral-700 dark:hover:bg-neutral-600`;
const sectionHeadingClass = "text-sm font-bold uppercase tracking-wide text-neutral-500";

function toValidMinutes(input: string): number {
    const minutes = Math.round(Number(input) || MIN_INTERVAL_MINUTES);
    return Math.min(MAX_INTERVAL_MINUTES, Math.max(MIN_INTERVAL_MINUTES, minutes));
}

function downloadJson(data: unknown, fileName: string) {
    const blob = new Blob([JSON.stringify(data, null, 2)], {type: "application/json"});
    const url = URL.createObjectURL(blob);
    const downloadLink = document.createElement("a");
    downloadLink.href = url;
    downloadLink.download = fileName;
    downloadLink.click();
    URL.revokeObjectURL(url);
}

const SettingsDialog = ({open, onClose}: { open: boolean; onClose: () => void }) => {
    const {data, update, replace} = useStore();
    const dialogRef = useRef<HTMLDialogElement>(null);
    const importFileInputRef = useRef<HTMLInputElement>(null);
    const [focusMinutesInput, setFocusMinutesInput] = useState(String(data.settings.focusMinutes));
    const [breakMinutesInput, setBreakMinutesInput] = useState(String(data.settings.breakMinutes));

    useEffect(() => {
        const dialog = dialogRef.current;
        if (!dialog) return;
        if (open && !dialog.open) {
            setFocusMinutesInput(String(data.settings.focusMinutes));
            setBreakMinutesInput(String(data.settings.breakMinutes));
            dialog.showModal();
        }
        if (!open && dialog.open) dialog.close();
    }, [open, data.settings.focusMinutes, data.settings.breakMinutes]);

    const changeSettings = (changes: Partial<Settings>) =>
        update(currentData => ({...currentData, settings: {...currentData.settings, ...changes}}));

    const commitFocusMinutes = () => {
        const focusMinutes = toValidMinutes(focusMinutesInput);
        setFocusMinutesInput(String(focusMinutes));
        changeSettings({focusMinutes});
    };

    const commitBreakMinutes = () => {
        const breakMinutes = toValidMinutes(breakMinutesInput);
        setBreakMinutesInput(String(breakMinutes));
        changeSettings({breakMinutes});
    };

    const restoreDefaultIntervals = () => {
        const {focusMinutes, breakMinutes} = DEFAULT_SETTINGS;
        setFocusMinutesInput(String(focusMinutes));
        setBreakMinutesInput(String(breakMinutes));
        changeSettings({focusMinutes, breakMinutes});
    };

    const exportData = () => {
        const today = new Date().toISOString().slice(0, 10);
        downloadJson(data, `learn-it-backup-${today}.json`);
    };

    const importData = async (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        event.target.value = "";
        if (!file) return;
        try {
            const importedData = parseData(JSON.parse(await file.text()));
            if (!importedData) throw new Error("invalid");
            const confirmMessage = `${importedData.topics.length} Themen und ${importedData.sessions.length} Sessions importieren? Die aktuellen Daten werden ersetzt.`;
            if (!confirm(confirmMessage)) return;
            replace({...importedData, timer: {...importedData.timer, status: "idle", runningSince: null}});
        } catch {
            alert("Die Datei konnte nicht gelesen werden. Bitte eine Learn-IT-Sicherung (JSON) auswählen.");
        }
    };

    const resetData = () => {
        if (!confirm("Alle Themen, Sessions und Einstellungen unwiderruflich löschen?")) return;
        replace(defaultData());
    };

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
                    <h3 className={sectionHeadingClass}>Timer-Intervalle</h3>
                    <label className="flex items-center justify-between gap-2">
                        Fokus (Minuten)
                        <input type="number" min={MIN_INTERVAL_MINUTES} max={MAX_INTERVAL_MINUTES} value={focusMinutesInput}
                               className={numberInputClass}
                               onChange={event => setFocusMinutesInput(event.target.value)}
                               onBlur={commitFocusMinutes}/>
                    </label>
                    <label className="flex items-center justify-between gap-2">
                        Pause (Minuten)
                        <input type="number" min={MIN_INTERVAL_MINUTES} max={MAX_INTERVAL_MINUTES} value={breakMinutesInput}
                               className={numberInputClass}
                               onChange={event => setBreakMinutesInput(event.target.value)}
                               onBlur={commitBreakMinutes}/>
                    </label>
                    <button onClick={restoreDefaultIntervals}
                            className="self-start text-sm text-neutral-500 underline hover:text-neutral-900 dark:hover:text-white">
                        Standard wiederherstellen ({DEFAULT_SETTINGS.focusMinutes} / {DEFAULT_SETTINGS.breakMinutes} min)
                    </button>
                    <p className="text-xs text-neutral-500">Änderungen gelten ab dem nächsten Intervall.</p>
                </section>

                <section className="flex flex-col gap-2">
                    <h3 className={sectionHeadingClass}>Ablauf</h3>
                    <label className="flex items-center gap-2">
                        <input type="checkbox" checked={data.settings.autoStartBreak}
                               onChange={event => changeSettings({autoStartBreak: event.target.checked})}/>
                        Pause automatisch starten
                    </label>
                    <label className="flex items-center gap-2">
                        <input type="checkbox" checked={data.settings.autoStartFocus}
                               onChange={event => changeSettings({autoStartFocus: event.target.checked})}/>
                        Nach der Pause automatisch weiterlernen
                    </label>
                    <label className="flex items-center gap-2">
                        <input type="checkbox" checked={data.settings.sound}
                               onChange={event => changeSettings({sound: event.target.checked})}/>
                        Signalton am Ende eines Intervalls
                    </label>
                </section>

                <section className="flex flex-col gap-2">
                    <h3 className={sectionHeadingClass}>Daten</h3>
                    <p className="text-xs text-neutral-500">
                        Alle Daten werden nur lokal im Browser (localStorage) gespeichert. Erstelle eine Sicherung,
                        bevor du den Browserverlauf löschst oder das Gerät wechselst.
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                        <button onClick={exportData} className={secondaryButtonClass}>
                            <FontAwesomeIcon icon={faDownload}/> Exportieren
                        </button>
                        <button onClick={() => importFileInputRef.current?.click()} className={secondaryButtonClass}>
                            <FontAwesomeIcon icon={faUpload}/> Importieren
                        </button>
                    </div>
                    <input ref={importFileInputRef} type="file" accept="application/json,.json" hidden onChange={importData}/>
                    <button onClick={resetData} className={`${buttonClass} text-red-600 hover:bg-red-50 dark:hover:bg-red-950`}>
                        <FontAwesomeIcon icon={faTrash}/> Alle Daten zurücksetzen
                    </button>
                </section>
            </div>
        </dialog>
    );
};

export default SettingsDialog;
