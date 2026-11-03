// [AI-GENERATED][REFACTOR] Canonical proofing completion/overtime side-effect owner.
// Keeps alarm, haptics, gamification, notification, and user feedback out of app-core.js.
import { ProofingAlarmService } from './proofing-alarm-service.js';
import { ProofingNotificationService } from './proofing-notification-service.js';
import { NotifSystem } from './notification-service.js'; // [AI-GENERATED][ES6 MODULE][V272]

let completionTriggered = false;

// [AI-GENERATED][ROBUSTNESS][V119] Own the fallback alert timer so a stale
// completion callback cannot fire after a new proofing lifecycle has reset.
let completionEpoch = 0;
let fallbackAlertTimer = null;

function reset() {
    completionEpoch += 1;
    completionTriggered = false;
    if (fallbackAlertTimer !== null) {
        clearTimeout(fallbackAlertTimer);
        fallbackAlertTimer = null;
    }
}

function markTriggered() {
    completionTriggered = true;
}

function isTriggered() {
    return completionTriggered;
}

// [AI-GENERATED][ROBUSTNESS][V166] Storage access must never gate the timer's
// completion alarm. If storage is blocked or throws, keep the safe default ON.
function readCompletionPreference(key, fallback = 'true') {
    try {
        const value = window.localStorage?.getItem(key);
        return value === null || value === undefined ? fallback : value;
    } catch (error) {
        console.warn(`[ProofingCompletionService] Preferensi ${key} tidak dapat dibaca; memakai nilai default.`, error);
        return fallback;
    }
}

function triggerOvertime(remainingSeconds) {
    if (completionTriggered) return false;
    completionTriggered = true;
    const scheduledEpoch = completionEpoch;

    // [AI-GENERATED][ROBUSTNESS][V131] Once the canonical timer deadline has
    // been reached, its native alarm is no longer needed. Cancel through the
    // canonical notification boundary so an obsolete queued schedule cannot
    // leave a second/stale notification while the overtime counter continues.
    void ProofingNotificationService.cancel();

    const overtimeSeconds = Math.abs(Number(remainingSeconds) || 0);
    const overMins = Math.floor(overtimeSeconds / 60);
    const overSecs = overtimeSeconds % 60;

    // [AI-GENERATED][BUG FIX][V166] Resolve preferences before invoking the
    // side effects; a storage exception must not skip the completion sound.
    if (readCompletionPreference('app_sound', 'true') !== 'false') {
        try {
            ProofingAlarmService.playSound();
        } catch (error) {
            console.warn('[ProofingCompletionService] Audio completion gagal:', error);
        }
    }

    if (readCompletionPreference('app_vib', 'true') !== 'false') {
        try {
            // [AI-GENERATED][ROBUSTNESS][V166] The API is async; explicitly
            // observe rejection so native haptics failure cannot be unhandled.
            Promise.resolve(ProofingAlarmService.vibrate()).catch((error) => {
                console.warn('[ProofingCompletionService] Haptics completion gagal:', error);
            });
        } catch (error) {
            console.warn('[ProofingCompletionService] Haptics completion gagal:', error);
        }
    }

    try {
        if (typeof window.ProgressionSystem !== 'undefined' && typeof window.ProgressionSystem.addProofing === 'function') {
            window.ProgressionSystem.addProofing();
        }
    } catch (error) {
        console.warn('[ProofingCompletionService] Gamification completion gagal:', error);
    }

    try {
        if (typeof NotifSystem !== 'undefined' && typeof NotifSystem.tambah === 'function') {
            NotifSystem.tambah(
                'timer',
                '⚠️ Peringatan Over-Proofing!',
                'Waktu proofing telah habis! Segera proses adonan sebelum rusak.',
                '🚨'
            );
        }
    } catch (error) {
        console.warn('[ProofingCompletionService] Notification completion gagal:', error);
    }

    const message = `⏰ Waktu proofing selesai! Kelebihan ${overMins} menit ${overSecs} detik — segera proses adonan!`;
    try {
        if (typeof window.tampilkanToastOvertime === 'function') {
            window.tampilkanToastOvertime(message);
        } else if (typeof window.showToast === 'function') {
            window.showToast(message, 5000);
        } else {
            if (fallbackAlertTimer !== null) clearTimeout(fallbackAlertTimer);
            fallbackAlertTimer = setTimeout(() => {
                fallbackAlertTimer = null;
                if (scheduledEpoch !== completionEpoch || !completionTriggered) return;
                alert('Waktu proofing telah selesai! Adonan terancam OVER-PROOFING jika dibiarkan!');
            }, 50);
        }
    } catch (error) {
        console.warn('[ProofingCompletionService] Feedback completion gagal:', error);
    }

    return true;
}

export const ProofingCompletionService = Object.freeze({
    reset,
    markTriggered,
    isTriggered,
    triggerOvertime
});

