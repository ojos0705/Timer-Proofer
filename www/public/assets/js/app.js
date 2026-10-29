/**
 * OfflineManager - Single Source of Truth untuk Pengelolaan Status Koneksi
 * Menerapkan prinsip Service/ViewModel Layer
 */
export const OfflineManager = {
    STORAGE_KEY: 'app_force_offline',

    /**
     * Memeriksa apakah aplikasi harus beroperasi dalam mode offline
     * @returns {boolean} true jika paksa offline aktif ATAU koneksi internet terputus
     */
    isOffline() {
        return this.isForced() || !navigator.onLine;
    },

    /**
     * Memeriksa apakah pengguna mengaktifkan "Paksa Mode Luring"
     * @returns {boolean}
     */
    isForced() {
        return localStorage.getItem(this.STORAGE_KEY) === 'true';
    },

    /**
     * Mengubah status Paksa Mode Luring dan menyimpan di localStorage
     * @param {boolean} status 
     */
    setForcedOffline(status) {
        localStorage.setItem(this.STORAGE_KEY, status ? 'true' : 'false');
        this.notifyStateChange();
    },

    /**
     * Inisialisasi Event Listener dan Sync Status UI
     */
    init() {
        const checkbox = document.getElementById('set-offline');
        if (!checkbox) return;

        // Synchronize tampilan awal checkbox dengan localStorage
        checkbox.checked = this.isForced();

        // Event listener perubahan checkbox
        checkbox.addEventListener('change', (e) => {
            this.setForcedOffline(e.target.checked);
        });

        // Tangkap event perubahan koneksi jaringan native
        window.addEventListener('online', () => this.notifyStateChange());
        window.addEventListener('offline', () => this.notifyStateChange());

        // Jalankan sinkronisasi awal saat aplikasi dibuka
        this.notifyStateChange();
    },

    /**
     * Memperbarui UI & Mengirimkan Custom Event ke seluruh modul aplikasi
     */
    notifyStateChange() {
        const isOffline = this.isOffline();
        const isForced = this.isForced();

        // 1. Update status checkbox UI
        const checkbox = document.getElementById('set-offline');
        if (checkbox && checkbox.checked !== isForced) {
            checkbox.checked = isForced;
        }

        // 2. Tampilkan/Sembunyikan Banner Indikator Mode Luring
        const indicator = document.getElementById('offline-mode-indicator');
        if (indicator) {
            indicator.style.display = isForced ? 'block' : 'none';
        }

        // 3. Emit Custom Event agar modul lain (seperti Weather API / Sync Supabase) merespon
        window.dispatchEvent(new CustomEvent('app:offline-status-changed', {
            detail: {
                isOffline: isOffline,
                isForced: isForced
            }
        }));

        console.log(`[OfflineManager] Status updated: forcedOffline=${isForced}, effectiveOffline=${isOffline}`);
    }
};

// Inisialisasi saat DOM telah siap
document.addEventListener('DOMContentLoaded', () => {
    OfflineManager.init();
});