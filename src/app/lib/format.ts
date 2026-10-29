export function formatClock(ms: number): string {
    const totalSeconds = Math.ceil(ms / 1000);
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/** Human readable duration, e.g. "2 h 05 min" or "12 min". */
export function formatDuration(sec: number): string {
    const minutes = Math.round(sec / 60);
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h === 0) return `${m} min`;
    return `${h} h ${String(m).padStart(2, "0")} min`;
}

export function formatHours(sec: number): string {
    return (sec / 3600).toLocaleString("de-DE", {maximumFractionDigits: 1});
}

const dateFormat = new Intl.DateTimeFormat("de-DE", {weekday: "short", day: "2-digit", month: "2-digit", year: "numeric"});
const shortDateFormat = new Intl.DateTimeFormat("de-DE", {day: "2-digit", month: "2-digit"});
const timeFormat = new Intl.DateTimeFormat("de-DE", {hour: "2-digit", minute: "2-digit"});

export const formatDate = (ts: number) => dateFormat.format(ts);
export const formatShortDate = (ts: number) => shortDateFormat.format(ts);
export const formatTime = (ts: number) => timeFormat.format(ts);
