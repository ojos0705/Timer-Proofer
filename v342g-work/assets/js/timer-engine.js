// [AI-GENERATED][REFACTOR] Canonical pure timer calculations shared by the Timer/Proofing UI.

export function parseTimerSeconds(text) {
    if (typeof text !== 'string') return 0;

    const trimmed = text.trim();
    if (!trimmed) return 0;

    // [AI-GENERATED][BUG FIX][V208] The plus sign is retained as a visual marker
    // for overtime produced by formatTimerSeconds(); the parser intentionally
    // converts that display to its elapsed magnitude for legacy UI compatibility.
    const normalized = trimmed.startsWith('+') ? trimmed.slice(1) : trimmed;
    const components = normalized.split(':');
    if (components.length !== 2 && components.length !== 3) return 0;
    if (components.some((part) => !/^\d+$/.test(part))) return 0;

    const parts = components.map(Number);
    if (parts.some((part) => !Number.isSafeInteger(part))) return 0;

    const seconds = parts[parts.length - 1];
    if (seconds > 59) return 0;

    let totalSeconds;
    if (parts.length === 3) {
        const [hours, minutes] = parts;
        if (minutes > 59) return 0;
        totalSeconds = (hours * 3600) + (minutes * 60) + seconds;
    } else {
        const [minutes] = parts;
        totalSeconds = (minutes * 60) + seconds;
    }

    return Number.isSafeInteger(totalSeconds) ? totalSeconds : 0;
}

export function formatTimerSeconds(totalSeconds) {
    const safeSeconds = Number.isFinite(totalSeconds) ? Math.trunc(totalSeconds) : 0;
    const sign = safeSeconds < 0 ? '+' : '';
    const absolute = Math.abs(safeSeconds);
    const minutes = Math.floor(absolute / 60);
    const seconds = absolute % 60;

    if (minutes >= 60) {
        const hours = Math.floor(minutes / 60);
        const remainingMinutes = minutes % 60;
        return `${sign}${String(hours).padStart(2, '0')}:${String(remainingMinutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }

    return `${sign}${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function calculateAdaptiveProofingSeconds(baseMinutes, currentTemp, currentHum) {
    const minutes = Number(baseMinutes);
    const temp = Number(currentTemp);
    const humidity = Number(currentHum);
    if (!Number.isFinite(minutes) || minutes <= 0) return 0;

    const safeTemp = Number.isFinite(temp) ? temp : 26;
    const safeHumidity = Number.isFinite(humidity) ? humidity : 70;

    let multiplier = 1;
    multiplier -= (safeTemp - 26) * 0.05;
    multiplier -= (safeHumidity - 70) * 0.002;
    multiplier = Math.min(1.5, Math.max(0.5, multiplier));

    return Math.max(1, Math.round(minutes * 60 * multiplier));
}

export function calculateTimerProgress(totalSeconds, initialSeconds) {
    if (!Number.isFinite(totalSeconds) || !Number.isFinite(initialSeconds) || initialSeconds <= 0) {
        return { ratio: 0, elapsedPercent: 0, overtime: false };
    }

    if (totalSeconds < 0) {
        return { ratio: 0, elapsedPercent: 100, overtime: true };
    }

    const ratio = Math.min(1, Math.max(0, totalSeconds / initialSeconds));
    return {
        ratio,
        elapsedPercent: (1 - ratio) * 100,
        overtime: false
    };
}
