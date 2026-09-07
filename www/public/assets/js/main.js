// main.js
import { dbManager } from './database-manager.js';

// Ekspos ke window agar bisa diakses oleh fungsi inline HTML/konsol jika diperlukan
window.dbManager = dbManager;
window.bakeryIngredients = []; // Inisialisasi array bahan global

// Menggabungkan logika initApp yang aman dengan fungsi DOMContentLoaded kamu
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // 1. Jalankan inisialisasi database lokal
        await dbManager.init();
        
        // 2. Bungkus penarikan Supabase secara terpisah agar TIDAK menyandera aplikasi jika gantung
        if (navigator.onLine) {
            console.log("Koneksi terdeteksi. Menyinkronkan data dari Supabase...");
            try {
                // Beri batasan waktu atau biarkan error ditangkap di sini jika gagal/mampet
                await dbManager.pullFromSupabase(); 
                console.log("Sinkronisasi Supabase selesai.");
            } catch (cloudErr) {
                console.error("Supabase mampet, langsung pakai data lokal:", cloudErr);
            }
        } else {
            console.log("Aplikasi berjalan dalam mode luring. Menggunakan data lokal.");
        }

        // 3. AMBIL DATA BAHAN (Ini harus tetap jalan meskipun cloud gagal)
        try {
            window.bakeryIngredients = await dbManager.getAllIngredients();
            console.log("Data bahan berhasil dimuat:", window.bakeryIngredients);
        } catch (ingredientsErr) {
            console.error("Gagal memuat data bahan, menggunakan array kosong:", ingredientsErr);
            window.bakeryIngredients = [];
        }
        
        // 4. Trigger render tabel resep utama
        if (typeof window.renderRecipeTable === 'function') {
            try {
                window.renderRecipeTable();
            } catch (renderErr) {
                console.error("Gagal render tabel resep:", renderErr);
            }
        }
        
        // 5. Trigger render awal opsi bahan pada form dinamis
        try {
            updateAllIngredientSelects();
            console.log("Render aplikasi selesai!");
        } catch (selectErr) {
            console.error("Gagal update ingredient selects:", selectErr);
        }

    } catch (error) {
        console.error("Gagal melakukan inisialisasi database utama:", error);
    }
});

// Helper untuk memperbarui seluruh dropdown bahan yang sedang aktif di UI (dengan error handling)
function updateAllIngredientSelects() {
    try {
        const selects = document.querySelectorAll('.select-bahan-bakery');
        if (!selects || selects.length === 0) {
            console.warn("Tidak ada elemen .select-bahan-bakery ditemukan di DOM");
            return;
        }
        selects.forEach(select => {
            try {
                const selectedValue = select.value; // Simpan nilai terpilih sementara
                isiOpsiBahan(select);
                select.value = selectedValue; // Kembalikan nilai terpilih setelah dropdown di-refresh
            } catch (selectErr) {
                console.warn("Gagal update select individual:", selectErr);
            }
        });
    } catch (err) {
        console.error("updateAllIngredientSelects error:", err);
    }
}

// Fungsi pembantu untuk mengisi elemen <select> (SUDAH DIPERBAIKI PROPERTINYA: name, category, ratio)
function isiOpsiBahan(selectElement) {
    if (!selectElement || !(selectElement instanceof HTMLSelectElement)) return;
    
    try {
        // Simpan placeholder default jika ada
        selectElement.innerHTML = '<option value="" disabled selected>-- Pilih Bahan --</option>';
        
        if (window.bakeryIngredients && Array.isArray(window.bakeryIngredients) && window.bakeryIngredients.length > 0) {
            window.bakeryIngredients.forEach(bahan => {
                try {
                    const option = document.createElement('option');
                    // Menyesuaikan properti objek agar sesuai database (id, name, category, ratio)
                    option.value = bahan.id || bahan.name || '';
                    option.textContent = `${bahan.name || 'Tanpa Nama'} (${bahan.category || 'Bahan'})`;
                    option.setAttribute('data-persentase-default', bahan.ratio || 0);
                    selectElement.appendChild(option);
                } catch (optionErr) {
                    console.warn("Gagal buat option untuk bahan:", bahan, optionErr);
                }
            });
        } else {
            const option = document.createElement('option');
            option.disabled = true;
            option.textContent = "Tidak ada data bahan (Gunakan Manual)";
            selectElement.appendChild(option);
        }
    } catch (err) {
        console.error("isiOpsiBahan error:", err);
    }
}

// ==========================================
// BAGIAN BAWAH: LOGIKA UI & FORM (Tetap Aman)
// ==========================================
window.tambahBahanBakeryDinamis = function(tambahLagi = true) {
    try {
        const container = document.getElementById('container-bahan-dinamis');
        if (!container) {
            console.warn("container-bahan-dinamis tidak ditemukan");
            return;
        }

        // Buat row input baru
        const rowId = `row-bahan-${Date.now()}`;
        const rowHtml = `
            <div class="row-bahan-input" id="${rowId}" style="display: flex; gap: 10px; margin-bottom: 10px; align-items: center;">
                <select class="select-bahan-bakery" style="flex: 2;" onchange="handlePilihanBahanSelesai(this)">
                    <!-- Opsi akan diisi oleh isiOpsiBahan() secara dinamis -->
                </select>
                <input type="number" class="input-berat-bahan" placeholder="Berat (g)" style="flex: 1;" step="0.1" required>
                <button type="button" class="btn-hapus-bahan" onclick="document.getElementById('${rowId}').remove()" style="background: #e74c3c; color: white; border: none; padding: 5px 10px; cursor: pointer;">Hapus</button>
            </div>
        `;

        // Sisipkan row ke kontainer
        container.insertAdjacentHTML('beforeend', rowHtml);

        // Dapatkan elemen select yang baru saja dibuat dan isi opsinya langsung
        const newRow = document.getElementById(rowId);
        const newSelect = newRow ? newRow.querySelector('.select-bahan-bakery') : null;
        if (newSelect) {
            isiOpsiBahan(newSelect);
        }
    } catch (err) {
        console.error("tambahBahanBakeryDinamis error:", err);
    }
};

// Handler ketika salah satu opsi bahan dipilih untuk auto-fill parameter (opsional)
window.handlePilihanBahanSelesai = function(selectElement) {
    try {
        if (!selectElement || !(selectElement instanceof HTMLSelectElement)) return;
        const selectedOption = selectElement.options[selectElement.selectedIndex];
        if (!selectedOption) return;
        const defaultPersentase = selectedOption.getAttribute('data-persentase-default');
        
        console.log(`Bahan dipilih: ${selectElement.value}, Persentase Baker Default: ${defaultPersentase}%`);
    } catch (err) {
        console.error("handlePilihanBahanSelesai error:", err);
    }
};