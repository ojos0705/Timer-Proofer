/**
 * [AI-GENERATED][RECONSTRUCTION] Canonical native proofing notification scheduler.
 * Keeps Capacitor LocalNotifications access outside app-core scope/lifecycle.
 */

import { NativeCapacitorService } from './native-capacitor-service.js';
import { createSerializedOperationQueue } from './serialized-operation-queue.js';

/**
 * [AI-GENERATED][QA][V192] Build an isolated scheduler instance so native
 * notification lifecycle behavior can be regression-tested with a test double.
 * The existing singleton export and public method names remain unchanged.
 */
export function createProofingNotificationService(dependencies = {}) {
    const nativeCapacitorService = dependencies.nativeCapacitorService || NativeCapacitorService;
    const logger = dependencies.logger || console;
    const now = dependencies.now || Date.now;
    const debug = dependencies.debug || (() => typeof window !== 'undefined' && Boolean(window.DEBUG));

    // [AI-GENERATED][ROBUSTNESS][V46] Invalidates in-flight notification scheduling
    // when a newer timer state cancels/replaces the previous alarm.
    let notificationGeneration = 0;

    // [AI-GENERATED][ROBUSTNESS][V190] Serialize native notification mutations
    // through a separately tested queue. Generation checks still decide ownership;
    // this queue ensures a failed native operation cannot poison later operations.
    const enqueueNotificationOperation = createSerializedOperationQueue();

    // [AI-GENERATED][ROBUSTNESS][V97] Native LocalNotifications must not resolve
    // to Capacitor's browser proxy. Browser/PWA notifications use the existing web
    // notification path; this service is strictly the native scheduler boundary.
    function getLocalNotificationsPlugin() {
        try {
            if (!nativeCapacitorService.isNativePlatform()) return null;
            return nativeCapacitorService.getPlugin('LocalNotifications');
        } catch (error) {
            // [AI-GENERATED][ROBUSTNESS][V192] Plugin discovery is a bridge boundary
            // too; do not leak synchronous registry failures to fire-and-forget callers.
            logger.warn('[ProofingNotificationService] Plugin LocalNotifications tidak tersedia:', error);
            return null;
        }
    }

    async function requestPermission() {
        const plugin = getLocalNotificationsPlugin();
        if (!plugin || typeof plugin.requestPermissions !== 'function') return false;

        try {
            const permission = await plugin.requestPermissions();
            return permission?.display === 'granted';
        } catch (error) {
            logger.error('[ProofingNotificationService] Gagal meminta izin:', error);
            return false;
        }
    }


    // [AI-GENERATED][ROBUSTNESS][V243] Centralize bounded cancellation retries so
    // replacement, denied-permission cleanup, public cancel, and partial-schedule
    // cleanup use the same bridge-failure policy. `shouldRetry` prevents an obsolete
    // generation from retrying after a newer schedule/cancel request takes ownership.
    async function cancelNativeNotification(plugin, options = {}) {
        if (!plugin || typeof plugin.cancel !== 'function') {
            return { cancelled: false, unavailable: true };
        }

        const shouldRetry = typeof options.shouldRetry === 'function'
            ? options.shouldRetry
            : () => true;
        let lastError = null;

        for (let attempt = 1; attempt <= 2; attempt += 1) {
            try {
                await plugin.cancel({ notifications: [{ id: 1 }] });
                return { cancelled: true, attempts: attempt };
            } catch (error) {
                lastError = error;
                if (attempt === 1 && shouldRetry()) {
                    logger.warn(
                        `[ProofingNotificationService] Pembatalan alarm gagal pada percobaan ${attempt}; mencoba ulang sekali${options.context ? ` (${options.context})` : ''}:`,
                        error
                    );
                    continue;
                }

                const superseded = attempt === 1 && !shouldRetry();
                logger.warn(
                    `[ProofingNotificationService] Pembatalan alarm gagal setelah ${attempt} percobaan${options.context ? ` (${options.context})` : ''}:`,
                    error
                );
                return { cancelled: false, error, superseded, attempts: attempt };
            }
        }

        // Defensive fallback: the bounded loop always returns from inside.
        return { cancelled: false, error: lastError, attempts: 2 };
    }

    // [AI-GENERATED][ROBUSTNESS][V140] When Capacitor/WebView is recreated, the
    // native notification may have survived even though JavaScript state was lost.
    // Prefer reconciling the existing native notification before cancel/reschedule
    // so foreground restoration is idempotent and does not churn the OS alarm.
    async function hasMatchingPendingNotification(plugin, targetEndTime) {
        if (typeof plugin?.getPending !== 'function') return false;

        const target = Number(targetEndTime);
        if (!Number.isFinite(target) || target <= 0) return false;

        try {
            const result = await plugin.getPending();
            const notifications = Array.isArray(result?.notifications) ? result.notifications : [];
            const existing = notifications.find((notification) => Number(notification?.id) === 1);
            if (!existing) return false;

            const scheduledAt = existing?.schedule?.at;
            const existingTarget = scheduledAt instanceof Date
                ? scheduledAt.getTime()
                : Number(scheduledAt);

            // [AI-GENERATED][ROBUSTNESS][V140] Native platforms can serialize Date
            // values as ISO strings. Accept both numeric timestamps and date strings,
            // while requiring a tight tolerance so an obsolete alarm is not accepted.
            const normalizedTarget = Number.isFinite(existingTarget)
                ? existingTarget
                : Date.parse(String(scheduledAt || ''));

            return Number.isFinite(normalizedTarget) && Math.abs(normalizedTarget - target) <= 1500;
        } catch (error) {
            // [AI-GENERATED][ROBUSTNESS][V140] Inspection is advisory; scheduling must
            // remain the fallback when an OS/version does not expose pending alarms.
            logger.warn('[ProofingNotificationService] Pemeriksaan alarm pending gagal:', error);
            return false;
        }
    }

    async function scheduleSecondsInternal(seconds, options = {}, generation) {
        // [AI-GENERATED][BUG FIX][V244] A schedule can become obsolete while waiting
        // in the serialized queue. Reject it before plugin discovery or permission
        // checks so stale queued work cannot prompt users or touch native state.
        if (generation !== notificationGeneration) {
            return { scheduled: false, reason: 'superseded' };
        }

        const plugin = getLocalNotificationsPlugin();
        // [AI-GENERATED][ROBUSTNESS][V183] Track only attempts that crossed the
        // native schedule boundary. Permission/check failures must not cancel a
        // still-valid alarm, but a rejected schedule call may have partially reached
        // the OS and therefore needs best-effort cleanup when this request is current.
        let nativeScheduleAttempted = false;
        const safeSeconds = Number(seconds);
        const requestedTarget = Number(options?.targetEndTime);
        const hasTarget = Number.isFinite(requestedTarget) && requestedTarget > 0;

        if (!plugin || !Number.isFinite(safeSeconds) || safeSeconds <= 0) {
            return { scheduled: false, reason: 'unsupported-or-invalid-duration' };
        }

        try {
            let permission = typeof plugin.checkPermissions === 'function'
                ? await plugin.checkPermissions()
                : null;

            // [AI-GENERATED][BUG FIX][V244] Permission inspection is asynchronous.
            // If a newer timer state supersedes this request while the OS responds,
            // don't open a permission prompt for work that will never be scheduled.
            if (generation !== notificationGeneration) {
                return { scheduled: false, reason: 'superseded' };
            }

            if (permission?.display !== 'granted') {
                permission = await plugin.requestPermissions();
                if (generation !== notificationGeneration) {
                    return { scheduled: false, reason: 'superseded' };
                }
            }

            if (permission?.display !== 'granted') {
                // [AI-GENERATED][BUG FIX][V182] Do not leave an older proofing alarm
                // scheduled when the replacement alarm cannot be authorized. The
                // scheduler uses the same native ID for every proofing session, so
                // retaining that ID could fire at a deadline that no longer matches
                // the timer visible to the user. A newer request owns reconciliation
                // if this operation has already been superseded.
                let cleanupFailed = false;
                if (generation === notificationGeneration && typeof plugin.cancel === 'function') {
                    const cleanup = await cancelNativeNotification(plugin, {
                        context: 'izin ditolak',
                        shouldRetry: () => generation === notificationGeneration
                    });
                    cleanupFailed = !cleanup.cancelled && !cleanup.superseded;
                    if (generation !== notificationGeneration) {
                        return { scheduled: false, reason: 'superseded' };
                    }
                }
                return {
                    scheduled: false,
                    reason: 'permission-denied',
                    ...(cleanupFailed ? { cleanupFailed: true } : {})
                };
            }

            // [AI-GENERATED][ROBUSTNESS][V46] Do not allow an older async request
            // to schedule an alarm after cancel() or a newer schedule has superseded it.
            if (generation !== notificationGeneration) {
                return { scheduled: false, reason: 'superseded' };
            }

            // [AI-GENERATED][ROBUSTNESS][V140] If the OS already retained the exact
            // notification after WebView recreation, keep it instead of cancelling
            // and recreating the alarm. This makes foreground reconciliation idempotent.
            // [AI-GENERATED][ROBUSTNESS][V184] Pending-notification inspection is
            // asynchronous. A newer schedule/cancel request can supersede this one
            // while getPending() is in flight, so re-check ownership before reporting
            // the old alarm as successfully reused.
            const matchingPendingNotification = hasTarget
                ? await hasMatchingPendingNotification(plugin, requestedTarget)
                : false;

            if (generation !== notificationGeneration) {
                return { scheduled: false, reason: 'superseded' };
            }

            if (matchingPendingNotification) {
                return { scheduled: true, reused: true };
            }

            if (typeof plugin.cancel === 'function') {
                // [AI-GENERATED][BUG FIX][V243] Reuse one bounded cancellation policy
                // across all bridge cleanup paths. A replacement is never scheduled
                // unless stale-alarm cancellation succeeds, and obsolete generations
                // do not retry after losing ownership.
                const cancellation = await cancelNativeNotification(plugin, {
                    context: 'penggantian alarm',
                    shouldRetry: () => generation === notificationGeneration
                });
                if (cancellation.superseded || generation !== notificationGeneration) {
                    return { scheduled: false, reason: 'superseded' };
                }
                if (!cancellation.cancelled) {
                    throw cancellation.error || new Error('Native alarm cancellation failed');
                }
            }

            if (generation !== notificationGeneration) {
                return { scheduled: false, reason: 'superseded' };
            }

            const scheduledAt = hasTarget
                ? new Date(requestedTarget)
                : new Date(now() + safeSeconds * 1000);

            // [AI-GENERATED][ROBUSTNESS][V66] When a canonical timer deadline is
            // available, schedule against that absolute deadline rather than
            // recalculating it after permission/cancel async work. This prevents
            // notification drift when permission prompts or native calls take time.
            if (scheduledAt.getTime() <= now()) {
                return { scheduled: false, reason: 'deadline-expired' };
            }

            nativeScheduleAttempted = true;
            await plugin.schedule({
                notifications: [{
                    title: options.title || '⏱️ Proofing Selesai!',
                    body: options.body || 'Adonan donat Anda telah mengembang sempurna. Segera lakukan tindakan!',
                    id: 1,
                    schedule: { at: scheduledAt },
                    ...(options.sound ? { sound: options.sound } : {}),
                    actionTypeId: '',
                    extra: null
                }]
            });

            // [AI-GENERATED][ROBUSTNESS][V47] A native schedule call can still be
            // resolving while cancel() runs. Reconcile the native state after the
            // async boundary so an obsolete request can never leave a stale alarm.
            if (generation !== notificationGeneration) {
                if (typeof plugin.cancel === 'function') {
                    await cancelNativeNotification(plugin, { context: 'cleanup alarm obsolete' });
                }
                return { scheduled: false, reason: 'superseded' };
            }

            if (debug()) logger.log(`✅ Alarm Capacitor berhasil dijadwalkan untuk ${safeSeconds} detik.`);
            return { scheduled: true };
        } catch (error) {
            logger.error('[ProofingNotificationService] Gagal menjadwalkan alarm:', error);

            // [AI-GENERATED][BUG FIX][V183] Some native bridges can reject after the
            // OS-side operation has started. If no newer request superseded this
            // operation, remove any possibly-partial notification rather than leave
            // an alarm with an unknown deadline. Newer queued operations own their
            // own reconciliation, so this cleanup must not race them.
            if (nativeScheduleAttempted && generation === notificationGeneration && typeof plugin.cancel === 'function') {
                await cancelNativeNotification(plugin, {
                    context: 'cleanup setelah kegagalan schedule',
                    shouldRetry: () => generation === notificationGeneration
                });
            }

            return { scheduled: false, reason: 'schedule-error', error };
        }
    }

    function scheduleSeconds(seconds, options = {}) {
        // [AI-GENERATED][BUG FIX][V244] Validate before changing generation. An
        // invalid duration is not a meaningful timer-state transition and must not
        // supersede a valid alarm operation already awaiting the native bridge.
        let safeSeconds;
        try {
            safeSeconds = Number(seconds);
        } catch {
            return Promise.resolve({ scheduled: false, reason: 'unsupported-or-invalid-duration' });
        }
        if (!Number.isFinite(safeSeconds) || safeSeconds <= 0) {
            return Promise.resolve({ scheduled: false, reason: 'unsupported-or-invalid-duration' });
        }

        // [AI-GENERATED][ROBUSTNESS][V76] Advance generation at request time, not
        // when the serialized worker eventually starts. A later valid cancel/schedule
        // must be able to supersede a request that is still waiting in the queue.
        const generation = ++notificationGeneration;
        return enqueueNotificationOperation(() => scheduleSecondsInternal(safeSeconds, options, generation));
    }

    async function schedule(minutes, options = {}) {
        const safeMinutes = Number(minutes);
        if (!Number.isFinite(safeMinutes) || safeMinutes <= 0) {
            return { scheduled: false, reason: 'unsupported-or-invalid-duration' };
        }
        return scheduleSeconds(safeMinutes * 60, options);
    }

    function cancel() {
        // [AI-GENERATED][ROBUSTNESS][V243] Capture the generation so a transient
        // failure can be retried only while this cancellation request remains current.
        const generation = ++notificationGeneration;
        return enqueueNotificationOperation(async () => {
            // [AI-GENERATED][ROBUSTNESS][V166] Include plugin discovery in the
            // failure boundary: callers often intentionally use `void cancel()`.
            try {
                const plugin = getLocalNotificationsPlugin();
                if (!plugin || typeof plugin.cancel !== 'function') return false;
                const result = await cancelNativeNotification(plugin, {
                    context: 'pembatalan eksplisit',
                    shouldRetry: () => generation === notificationGeneration
                });
                return result.cancelled;
            } catch (error) {
                logger.warn('[ProofingNotificationService] Gagal membatalkan alarm:', error);
                return false;
            }
        });
    }

    return Object.freeze({
        requestPermission,
        schedule,
        scheduleSeconds,
        cancel
    });
}

// [AI-GENERATED][COMPATIBILITY][V192] Keep the application-facing singleton API.
export const ProofingNotificationService = createProofingNotificationService();

// [AI-GENERATED][COMPATIBILITY] Preserve the existing global permission API.
if (typeof window !== 'undefined') {
    window.requestNotificationPermission = ProofingNotificationService.requestPermission;
    window.ProofingNotificationService = ProofingNotificationService;
}
