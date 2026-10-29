const padTwoDigits = (value: number) => String(value).padStart(2, "0");

export function formatClock(milliseconds: number): string {
    const totalSeconds = Math.ceil(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${padTwoDigits(minutes)}:${padTwoDigits(seconds)}`;
}

export function formatDuration(totalSeconds: number): string {
    const totalMinutes = Math.round(totalSeconds / 60);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    if (hours === 0) return `${minutes} min`;
    return `${hours} h ${padTwoDigits(minutes)} min`;
}

export function formatHours(totalSeconds: number): string {
    return (totalSeconds / 3600).toLocaleString("de-DE", {maximumFractionDigits: 1});
}

const dateFormat = new Intl.DateTimeFormat("de-DE", {weekday: "short", day: "2-digit", month: "2-digit", year: "numeric"});
const shortDateFormat = new Intl.DateTimeFormat("de-DE", {day: "2-digit", month: "2-digit"});
const timeFormat = new Intl.DateTimeFormat("de-DE", {hour: "2-digit", minute: "2-digit"});

export const formatDate = (timestamp: number) => dateFormat.format(timestamp);
export const formatShortDate = (timestamp: number) => shortDateFormat.format(timestamp);
export const formatTime = (timestamp: number) => timeFormat.format(timestamp);
