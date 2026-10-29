/**
 * [AI-GENERATED][RECONSTRUCTION] Canonical proofing alarm audio + haptics service.
 * Keeps Web Audio, custom alarm playback, and vibration outside app-core.
 * Preserves the existing global compatibility APIs used by preferences and legacy UI.
 */

import { NativeCapacitorService } from './native-capacitor-service.js';

let audioCtx = null;
let alarmAudioAktif = null;
let alarmOscillatorAktif = [];

function dapatkanAudioContext(isUserGesture = false) {
    if (!audioCtx) {
        if (!isUserGesture) return null;
        const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextCtor) return null;
        audioCtx = new AudioContextCtor();
    }

    if (audioCtx?.state === 'suspended' && isUserGesture) {
        audioCtx.resume().catch(() => {});
    }

    return audioCtx;
}

function hentikanSemuaSuaraAlarm() {
    if (alarmAudioAktif) {
        try {
            alarmAudioAktif.pause();
            alarmAudioAktif.currentTime = 0;
        } catch (_) {}
        alarmAudioAktif = null;
    }

    if (alarmOscillatorAktif.length) {
        alarmOscillatorAktif.forEach(osc => {
            try { osc.stop(); } catch (_) {}
            try { osc.disconnect(); } catch (_) {}
        });
        alarmOscillatorAktif = [];
    }
}

function playAlarmTone() {
    hentikanSemuaSuaraAlarm();

    try {
        const ctx = dapatkanAudioContext(true);
        if (!ctx) return false;

        const startTime = ctx.currentTime;
        for (let i = 0; i < 3; i += 1) {
            const osc = ctx.createOscillator();
            const gainNode = ctx.createGain();
            const startAt = startTime + (i * 0.4);
            const stopAt = startAt + 0.3;

            osc.type = 'sine';
            osc.frequency.setValueAtTime(880, startAt);
            gainNode.gain.setValueAtTime(0.5, startAt);
            gainNode.gain.exponentialRampToValueAtTime(0.01, stopAt);

            osc.connect(gainNode);
            gainNode.connect(ctx.destination);
            osc.start(startAt);
            osc.stop(stopAt);

            alarmOscillatorAktif.push(osc);
            osc.addEventListener('ended', () => {
                alarmOscillatorAktif = alarmOscillatorAktif.filter(item => item !== osc);
            }, { once: true });
        }
        return true;
    } catch (error) {
        console.warn('[ProofingAlarmService] Gagal membunyikan alarm:', error);
        return false;
    }
}

async function triggerVibration() {
    // [AI-GENERATED][ROBUSTNESS][V165] A rejected native Haptics call must not
    // prevent trying the browser vibration API where the WebView exposes it.
    try {
        const haptics = NativeCapacitorService.getPlugin('Haptics');
        if (NativeCapacitorService.isNativePlatform() && typeof haptics?.vibrate === 'function') {
            try {
                await haptics.vibrate({ duration: 1000 });
                return true;
            } catch (nativeError) {
                console.warn('[ProofingAlarmService] Getaran native gagal; mencoba fallback browser:', nativeError);
            }
        }

        if (typeof navigator?.vibrate === 'function') {
            return navigator.vibrate([500, 300, 500]) !== false;
        }
    } catch (error) {
        console.warn('[ProofingAlarmService] Gagal menjalankan getaran:', error);
    }
    return false;
}

// [AI-GENERATED][ROBUSTNESS][V163] Storage can be unavailable in restricted
// browser contexts. Read preferences defensively so storage failures never
// prevent the timer alarm from reaching its sound/beep fallback.
function readAlarmPreference(key, fallback = null) {
    try {
        const value = window.localStorage?.getItem(key);
        return value === null || value === undefined ? fallback : value;
    } catch (error) {
        console.warn(`[ProofingAlarmService] Preferensi ${key} tidak dapat dibaca; memakai nilai default.`, error);
        return fallback;
    }
}

function playAlarmSound(overrideTone, overrideVolume) {
    if (readAlarmPreference('app_sound', 'true') === 'false') return false;

    hentikanSemuaSuaraAlarm();

    const selectedTone = overrideTone || readAlarmPreference('app_alarm_tone', 'default');
    const volumeRaw = overrideVolume !== undefined && overrideVolume !== null
        ? overrideVolume
        : readAlarmPreference('app_alarm_volume', '80');
    const parsedVolume = Number(volumeRaw);
    const volumeValue = Number.isFinite(parsedVolume)
        ? Math.min(1, Math.max(0, parsedVolume / 100))
        : 0.8;

    const audioPaths = Object.freeze({
        custom: 'assets/audio/donat-proofing.mp3',
        'soft-bell': 'assets/audio/soft-bell.mp3',
        'kitchen-timer': 'assets/audio/kitchen-timer.mp3'
    });
    const audioPath = audioPaths[selectedTone] || '';

    if (!audioPath) return playAlarmTone();

    // [AI-GENERATED][ROBUSTNESS][V165] Audio construction/play can fail
    // synchronously in restricted WebViews; always attempt the Web Audio beep.
    let audio;
    try {
        audio = new Audio(audioPath);
        audio.volume = volumeValue;
        alarmAudioAktif = audio;

        audio.addEventListener('ended', () => {
            if (alarmAudioAktif === audio) alarmAudioAktif = null;
        }, { once: true });

        Promise.resolve(audio.play()).then(() => {
            window.DEBUG && console.log('[ProofingAlarmService] Audio alarm berhasil diputar:', audioPath);
        }).catch(error => {
            console.warn('[ProofingAlarmService] Audio file gagal diputar, fallback ke beep:', error);
            if (alarmAudioAktif === audio) alarmAudioAktif = null;
            playAlarmTone();
        });

        return true;
    } catch (error) {
        console.warn('[ProofingAlarmService] Inisialisasi audio gagal, fallback ke beep:', error);
        if (alarmAudioAktif === audio) alarmAudioAktif = null;
        return playAlarmTone();
    }
}

export const ProofingAlarmService = Object.freeze({
    getAudioContext: dapatkanAudioContext,
    stopAll: hentikanSemuaSuaraAlarm,
    playTone: playAlarmTone,
    playSound: playAlarmSound,
    vibrate: triggerVibration
});

window.ProofingAlarmService = ProofingAlarmService;
window.dapatkanAudioContext = dapatkanAudioContext;
window.hentikanSemuaSuaraAlarm = hentikanSemuaSuaraAlarm;
window.playAlarmTone = playAlarmTone;
window.playAlarmSound = playAlarmSound;
window.triggerVibration = triggerVibration;
