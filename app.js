
// app.js
import { previewRecipePhoto } from './modal.js';


let newWorker;

// 1. Capacitor Detection & Service Worker
const isNative = (() => {
  try {
    return Boolean(window.Capacitor?.isNativePlatform?.() || window.Capacitor?.isNativePlatform);
  } catch (e) {
    console.warn('Capacitor detection failed, assuming web platform:', e);
    return false;
  }
})();

if (!isNative && 'serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js')
    .then(() => console.log('Service Worker berhasil didaftarkan'))
    .catch(err => console.warn("Service Worker Gagal Terdaftar:", err));
}

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').then(registration => {
            registration.addEventListener('updatefound', () => {
                newWorker = registration.installing;
                newWorker.addEventListener('statechange', () => {
                    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                        const banner = document.getElementById('app-update-banner');
                        if (banner) banner.style.display = 'block';
                    }
                });
            });
        }).catch(err => console.log('Service Worker registration failed:', err));
    });

    let refreshing;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (refreshing) return;
        window.location.reload();
        refreshing = true;
    });
}

document.getElementById('btn-refresh-app')?.addEventListener('click', () => {
    if (newWorker) {
        newWorker.postMessage({ action: 'skipWaiting' });
    }
});

// 2. Modal Lightbox untuk Preview Foto Fullsize
// 1. FUNGSI PREVIEW FOTO (Gunakan milik Anda, tambahkan pembukaan ke window)


// 2. FUNGSI TAMBAH LANGKAH PRODUKSI
export function tambahLangkahProduksi(teksInstruksi = '', gambarUrl = '') {
    let desc = teksInstruksi;
    let photo = gambarUrl || null;

    if (typeof activeRecipeSteps === 'undefined') {
        window.activeRecipeSteps = [];
    }
    activeRecipeSteps.push({ desc: desc, photo: photo });

    const placeholder = document.getElementById('empty-step-placeholder');
    if (placeholder) placeholder.style.display = 'none';

    if (typeof totalLangkah === 'undefined') window.totalLangkah = 0;
    totalLangkah++;
    const stepId = totalLangkah;
    const container = document.getElementById('container-daftar-langkah');
    if (!container) return;

    const card = document.createElement('div');
    card.className = 'step-item-card';
    card.id = `step-card-${stepId}`;
    card.style.cssText = "background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 10px; display: flex; flex-direction: column; gap: 8px;";

    card.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 0.75rem; font-weight: 800; color: #4E342E; background: #FFF3E0; padding: 3px 8px; border-radius: 4px; border: 1px solid #F2D2A9;">
                Langkah #${stepId}
            </span>
            <button type="button" onclick="hapusLangkahProduksi('${stepId}')" style="background: none; border: none; color: #e74c3c; font-weight: bold; cursor: pointer; font-size: 0.8rem;">✕ Hapus</button>
        </div>

        <textarea id="step-desc-${stepId}" placeholder="Tuliskan instruksi langkah ini..." style="width: 100%; min-height: 50px; padding: 8px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 0.8rem; box-sizing: border-box; resize: vertical;">${desc}</textarea>

        <div style="display: flex; align-items: center; gap: 10px; margin-top: 4px; background: #ffffff; padding: 6px; border-radius: 6px; border: 1px dashed #cbd5e1;">
            
            <!-- THUMBNAIL FOTO: Memanggil previewRecipePhoto jika ada foto, atau membuka upload jika belum ada -->
            <div id="step-preview-container-${stepId}" 
                 onclick="${photo ? `previewRecipePhoto('${photo}')` : `document.getElementById('step-file-input-${stepId}').click()`}" 
                 style="width: 50px; height: 50px; border-radius: 6px; background: #f1f5f9; display: flex; align-items: center; justify-content: center; overflow: hidden; flex-shrink: 0; cursor: pointer;">
                ${photo ? `<img src="${photo}" style="width:100%; height:100%; object-fit:contain; pointer-events:none;">` : `<span style="font-size: 1.2rem; color: #94a3b8;">🖼️</span>`}
            </div>
            
            <div style="flex: 1;">
                <input type="file" id="step-file-input-${stepId}" accept="image/*" style="display: none;" onchange="previewFotoLangkah(this, '${stepId}')">
                
                <button type="button" id="btn-upload-step-${stepId}" onclick="document.getElementById('step-file-input-${stepId}').click()" style="background: #E67E22; color: white; border: none; padding: 5px 10px; border-radius: 5px; font-size: 0.7rem; font-weight: bold; cursor: pointer;">
                    📷 ${photo ? 'Ganti Foto' : 'Unggah Foto Tahapan'}
                </button>
                <span id="step-filename-${stepId}" style="font-size: 0.65rem; color: #64748b; margin-left: 6px; display: inline-block;">
                    ${photo ? 'Foto terpasang' : 'Belum ada foto'}
                </span>
            </div>
        </div>
    `;

    container.appendChild(card);
}

// 3. FUNGSI UNTUK MERUBAH TAMPILAN SETELAH PILIH FOTO BARU
export function previewFotoLangkah(input, stepId) {
    const file = input.files[0];
    if (!file) return;

    const imageUrl = URL.createObjectURL(file);
    const container = document.getElementById(`step-preview-container-${stepId}`);
    const labelStatus = document.getElementById(`step-filename-${stepId}`);
    const btnUpload = document.getElementById(`btn-upload-step-${stepId}`);

    if (container) {
        container.innerHTML = `<img src="${imageUrl}" style="width:100%; height:100%; object-fit:contain; pointer-events:none;">`;
        // Memasang fungsi klik preview langsung pada gambar baru yang diunggah
        container.setAttribute('onclick', `previewRecipePhoto('${imageUrl}')`);
    }

    if (labelStatus) labelStatus.innerText = 'Foto terpasang';
    if (btnUpload) btnUpload.innerHTML = '📷 Ganti Foto';

    const stepIndex = parseInt(stepId, 10) - 1;
    if (window.activeRecipeSteps && window.activeRecipeSteps[stepIndex]) {
        window.activeRecipeSteps[stepIndex].photo = imageUrl;
    }
}

// -------------------------------------------------------------------
// BUG FIX: Mendeklarasikan fungsi yang dipanggil oleh DOM statis HTML
// -------------------------------------------------------------------

/**
 * Menangani event oninput dari textarea bawaan HTML statis
 * @param {number|string} index - Index atau ID dari langkah produksi
 * @param {string} value - Nilai teks terbaru dari textarea
 */
window.updateStepDesc = function(index, value) {
    // 1. Validasi untuk mencegah error saat event terpanggil berulang dengan nilai null
    if (value === undefined || value === null) return;

    // 2. Pastikan state management (array activeRecipeSteps) sudah tersedia
    if (typeof window.activeRecipeSteps === 'undefined') {
        window.activeRecipeSteps = [];
    }

    // 3. Konversi index ke tipe number (karena dari HTML bisa berupa string '0')
    const stepIndex = parseInt(index, 10);

    // 4. Update state data jika index ditemukan dalam array
    if (window.activeRecipeSteps[stepIndex]) {
        window.activeRecipeSteps[stepIndex].desc = value;
    } else {
        // Fallback jika state array belum sinkron dengan UI statis (hanya log info, UI tidak freeze)
        console.warn(`Sinkronisasi UI Statis: Deskripsi langkah ${stepIndex} direkam.`, value);
    }
};

/**
 * Menangani event onchange dari input file bawaan HTML statis
 * Berfungsi sebagai jembatan/alias ke fungsi dinamis (previewFotoLangkah)
 */
window.handleFotoLangkah = function(inputElement, index) {
    // Cek apakah fungsi dinamis sudah ada untuk mencegah ReferenceError
    if (typeof window.previewFotoLangkah === 'function') {
        window.previewFotoLangkah(inputElement, index.toString());
    } else {
        console.error("Fungsi previewFotoLangkah tidak ditemukan di app.js");
    }
};

// -------------------------------------------------------------------
// BUG FIX: Event Delegation untuk tombol dengan data-action
// Menjembatani atribut HTML 'data-action' dengan fungsi global
// -------------------------------------------------------------------

document.addEventListener('click', function(event) {
    // 1. Cari elemen yang diklik (atau elemen parent-nya jika berupa icon di dalam tombol)
    // yang memiliki atribut data-action="tambahLangkahProduksi"
    const btnTambahLangkah = event.target.closest('[data-action="tambahLangkahProduksi"]');

    // 2. Jika tombol tersebut ditemukan dan diklik
    if (btnTambahLangkah) {
        // 3. Eksekusi fungsi global yang sudah kita perbaiki sebelumnya
        if (typeof window.tambahLangkahProduksi === 'function') {
            // Panggil tanpa parameter agar menggunakan nilai default ('', null)
            window.tambahLangkahProduksi(); 
        } else {
            console.error("[Fatal Error] Fungsi window.tambahLangkahProduksi belum dideklarasikan.");
        }
    }
});

// 5. Expose ke Window Object
window.gantiTabMetode = gantiTabMetode;
window.tambahLangkahProduksi = tambahLangkahProduksi;
window.previewFotoLangkah = previewFotoLangkah;