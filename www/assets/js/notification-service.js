import { registerNotificationModalHooks, syncModalBodyScrollLock } from './modal-bootstrap.js?v=20261030-v322'; // [AI-GENERATED][ES6 MODULE IDENTITY][V272]
/**
 * Timer Proofer notification service.
 * [AI-GENERATED][RECONSTRUCTION] Canonical owner for notification state, rendering,
 * filtering, read/delete actions, and compatibility globals.
 */

export const NotifSystem = (() => {
    let notifs = [];

    // [AI-GENERATED][ROBUSTNESS][V56] Treat persisted notification data as untrusted.
    // A malformed/corrupted item must never prevent the notification module from booting.
    function normalizeNotification(item) {
        if (!item || typeof item !== 'object' || Array.isArray(item)) return null;
        const id = Number(item.id);
        if (!Number.isFinite(id)) return null;
        return {
            id,
            kategori: String(item.kategori ?? item.category ?? 'sistem'),
            judul: String(item.judul ?? item.title ?? 'Notifikasi'),
            deskripsi: String(item.deskripsi ?? item.description ?? ''),
            ikon: String(item.ikon ?? item.icon ?? '🔔'),
            waktu: String(item.waktu ?? item.time ?? ''),
            dibaca: item.dibaca === true || item.read === true
        };
    }

    try {
        const parsed = JSON.parse(localStorage.getItem('tp_notifs') || '[]');
        notifs = Array.isArray(parsed)
            ? parsed.map(normalizeNotification).filter(Boolean).slice(0, 50)
            : [];
    } catch (error) {
        console.warn('[NotifSystem] Gagal membaca cache notifikasi:', error);
        notifs = [];
    }

    let filterAktif = 'semua';

    // [AI-GENERATED][SECURITY] Notification data is persisted locally and may be tampered with.
    // Escape text before placing it into innerHTML.
    function escapeNotificationText(value) {
        return String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function simpan() {
        notifs = notifs.map(normalizeNotification).filter(Boolean).slice(0, 50);
        try {
            localStorage.setItem('tp_notifs', JSON.stringify(notifs));
            return true;
        } catch (error) {
            // [AI-GENERATED][ROBUSTNESS][V56] Storage quota/privacy-mode failures
            // must not break notification actions or the rest of the application.
            console.warn('[NotifSystem] Gagal menyimpan notifikasi:', error);
            return false;
        }
    }

    function waktuSekarang() {
        return new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    }

    function buatIdNotifikasi() {
        const now = Date.now();
        const lastId = Number(notifs[0]?.id) || 0;
        return now <= lastId ? lastId + 1 : now;
    }

    function tambah(kategori, judul, deskripsi, ikon) {
        const n = {
            id: buatIdNotifikasi(),
            kategori: String(kategori || 'sistem'),
            judul: String(judul || 'Notifikasi'),
            deskripsi: String(deskripsi || ''),
            ikon: String(ikon || '🔔'),
            waktu: waktuSekarang(),
            dibaca: false
        };

        notifs.unshift(n);
        simpan();
        renderList();
        updateBadge();
        return n.id;
    }

    function updateBadge() {
        const badge = document.getElementById('global-notif-badge');
        if (!badge) return;
        const unread = notifs.filter(n => !n.dibaca).length;
        badge.textContent = unread;
        badge.style.display = unread > 0 ? 'flex' : 'none';
    }

    function renderList() {
        const container = document.getElementById('notif-list-container');
        const empty = document.getElementById('notif-empty-msg');
        if (!container) return;

        container.innerHTML = '';

        const tampil = filterAktif === 'semua'
            ? notifs
            : notifs.filter(n => {
                const kat = n.kategori || n.category || '';
                return kat.toLowerCase() === filterAktif.toLowerCase();
            });

        if (tampil.length === 0) {
            if (empty) empty.style.display = 'block';
            return;
        }

        if (empty) empty.style.display = 'none';

        tampil.forEach(n => {
            const div = document.createElement('div');
            div.className = 'notif-item' + (n.dibaca ? '' : ' unread');
            div.id = `notif-${n.id}`;
            div.dataset.id = n.id;

            const safeIcon = escapeNotificationText(n.ikon || '🔔');
            const safeTitle = escapeNotificationText(n.judul || '');
            const safeDescription = escapeNotificationText(n.deskripsi || '');
            const safeTime = escapeNotificationText(n.waktu || '');

            div.innerHTML = `
                <div class="notif-icon-box" style="cursor:default">${safeIcon}</div>
                <div class="notif-body" style="cursor:pointer" data-action="notifBaca" data-arg="${encodeURIComponent(String(n.id))}">
                    <div class="notif-title">${safeTitle}</div>
                    <div class="notif-desc">${safeDescription}</div>
                    <div class="notif-time">${safeTime}</div>
                </div>
                <button class="btn-hapus-notif-cepat" data-action="notifHapus" data-arg="${encodeURIComponent(String(n.id))}" data-stop-propagation="true" title="Hapus notifikasi ini"
                    style="background:none;border:none;font-size:1rem;color:#bbb;cursor:pointer;padding:4px 6px;align-self:flex-start;flex-shrink:0;line-height:1;"
                    data-onmouseover="this.style.color='#e74c3c'" data-onmouseout="this.style.color='#bbb'">✕</button>
            `;
            container.appendChild(div);
        });
    }

    function filter(kat, btnEl) {
        filterAktif = String(kat || 'semua');
        document.querySelectorAll('.notif-tab-btn').forEach(button => button.classList.remove('active'));
        if (btnEl) btnEl.classList.add('active');
        renderList();
    }

    function bacaSemua() {
        notifs.forEach(n => { n.dibaca = true; });
        simpan();
        renderList();
        updateBadge();
    }

    function baca(id) {
        const targetId = Number(id);
        const n = notifs.find(item => item.id === targetId || item.id === id);
        if (!n) return;
        n.dibaca = true;
        simpan();
        renderList();
        updateBadge();
    }

    function hapus(id) {
        const targetId = Number(id);
        notifs = notifs.filter(n => n.id !== targetId && n.id !== id);
        simpan();
        renderList();
        updateBadge();
    }

    function hapusSemua() {
        notifs = [];
        filterAktif = 'semua';
        simpan();
        renderList();
        updateBadge();
        document.querySelectorAll('.notif-tab-btn').forEach((button, index) => {
            button.classList.toggle('active', index === 0);
        });
    }

    return Object.freeze({
        tambah,
        renderList,
        updateBadge,
        filter,
        bacaSemua,
        baca,
        hapus,
        hapusSemua
    });
})();

// [AI-GENERATED][ROBUSTNESS][V118] Own the delayed notification-modal hide.
// If the modal is reopened during the 50ms transition window, an older callback
// must never hide the newly opened modal.
let notifModalCloseTimer = null;

function closeNotifModal() {
    const modal = document.getElementById('notif-modal');
    if (!modal) return;

    if (document.activeElement && modal.contains(document.activeElement)) {
        document.activeElement.blur();
    }

    clearTimeout(notifModalCloseTimer);
    modal.classList.remove('active');
    // [AI-GENERATED][REFACTOR][V199] Scroll state is centralized in modal-bootstrap.js.
    syncModalBodyScrollLock();
    notifModalCloseTimer = setTimeout(() => {
        notifModalCloseTimer = null;
        // [AI-GENERATED][ROBUSTNESS][V118] Do not apply stale close work to a
        // modal that has already been reopened by the user.
        if (modal.classList.contains('active')) return;
        modal.style.display = 'none';
        modal.setAttribute('inert', '');
        modal.setAttribute('aria-hidden', 'true');
        // [AI-GENERATED][ROBUSTNESS][V199] Resync after the delayed hide completes.
        syncModalBodyScrollLock();
    }, 50);
}

// [AI-GENERATED][REFACTOR][V299] Notification controls are bound by the module
// that owns their state, rather than by the legacy app-core initializer.
function initializeNotificationControls() {
    const readButton = document.getElementById('btn-notif-baca');
    if (readButton && readButton.dataset.notificationReadBound !== 'true') {
        readButton.addEventListener('click', () => NotifSystem.bacaSemua());
        readButton.dataset.notificationReadBound = 'true';
    }

    const deleteButton = document.getElementById('btn-notif-hapus');
    if (deleteButton && deleteButton.dataset.notificationDeleteBound !== 'true') {
        deleteButton.addEventListener('click', () => {
            const confirmDelete = typeof window.confirm === 'function'
                ? window.confirm.bind(window)
                : globalThis.confirm;
            if (typeof confirmDelete === 'function' && confirmDelete('Apakah Anda yakin ingin menghapus semua notifikasi?')) {
                NotifSystem.hapusSemua();
            }
        });
        deleteButton.dataset.notificationDeleteBound = 'true';
    }
}

function filterNotif(kat, btn) {
    NotifSystem.filter(kat, btn);
}

// [AI-GENERATED][REFACTOR][V43] Legacy entrypoints are named distinctly from
// the canonical store method to avoid duplicate function declarations.
function bacaSemuaNotifikasiLegacy() {
    NotifSystem.bacaSemua();
}

// [AI-GENERATED][REFACTOR] Legacy notification entrypoint now uses the canonical store.
function tambahNotifikasi(pesan, kategori, icon) {
    return NotifSystem.tambah(kategori || 'sistem', 'Informasi', pesan, icon || '🔔');
}

// [AI-GENERATED][ES6 MODULE][V272] Register canonical callbacks for the modal bootstrap.
// The global below remains only as a backward-compatibility bridge.
registerNotificationModalHooks({
    renderList: () => NotifSystem.renderList(),
    updateBadge: () => NotifSystem.updateBadge()
});

window.NotifSystem = NotifSystem;
window.filterNotif = filterNotif;
window.bacaSemua = bacaSemuaNotifikasiLegacy;
window.closeNotifModal = closeNotifModal;
window.tambahNotifikasi = tambahNotifikasi;

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        NotifSystem.renderList();
        NotifSystem.updateBadge();
        initializeNotificationControls();
    }, { once: true });
} else {
    NotifSystem.renderList();
    NotifSystem.updateBadge();
    initializeNotificationControls();
}

console.info('[NotifSystem] v2.0.0 aktif — satu sumber data notifikasi.');
