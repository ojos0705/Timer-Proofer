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
        window.bakeryIngredients = await dbManager.getAllIngredients();
        console.log("Data bahan berhasil dimuat:", window.bakeryIngredients);
        
        // 4. Trigger render tabel resep utama
        if (typeof window.renderRecipeTable === 'function') {
            window.renderRecipeTable();
        }
        
        // 5. Trigger render awal opsi bahan pada form dinamis
        updateAllIngredientSelects();
        console.log("Render aplikasi selesai!");

    } catch (error) {
        console.error("Gagal melakukan inisialisasi database utama:", error);
    }
});

// Helper untuk memperbarui seluruh dropdown bahan yang sedang aktif di UI
function updateAllIngredientSelects() {
    const selects = document.querySelectorAll('.select-bahan-bakery');
    selects.forEach(select => {
        const selectedValue = select.value; // Simpan nilai terpilih sementara
        isiOpsiBahan(select);
        select.value = selectedValue; // Kembalikan nilai terpilih setelah dropdown di-refresh
    });
}

// Fungsi pembantu untuk mengisi elemen <select> (SUDAH DIPERBAIKI PROPERTINYA: name, category, ratio)
function isiOpsiBahan(selectElement) {
    if (!selectElement) return;
    
    // Simpan placeholder default jika ada
    selectElement.innerHTML = '<option value="" disabled selected>-- Pilih Bahan --</option>';
    
    if (window.bakeryIngredients && window.bakeryIngredients.length > 0) {
        window.bakeryIngredients.forEach(bahan => {
            const option = document.createElement('option');
            // Menyesuaikan properti objek agar sesuai database (id, name, category, ratio)
            option.value = bahan.id || bahan.name;
            option.textContent = `${bahan.name || 'Tanpa Nama'} (${bahan.category || 'Bahan'})`;
            option.setAttribute('data-persentase-default', bahan.ratio || 0);
            selectElement.appendChild(option);
        });
    } else {
        const option = document.createElement('option');
        option.disabled = true;
        option.textContent = "Tidak ada data bahan (Gunakan Manual)";
        selectElement.appendChild(option);
    }
}

// ==========================================
// BAGIAN BAWAH: LOGIKA UI & FORM (Tetap Aman)
// ==========================================
window.tambahBahanBakeryDinamis = function(tambahLagi = true) {
    const container = document.getElementById('container-bahan-dinamis');
    if (!container) return;

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
    const newSelect = newRow.querySelector('.select-bahan-bakery');
    isiOpsiBahan(newSelect);
};

// Handler ketika salah satu opsi bahan dipilih untuk auto-fill parameter (opsional)
window.handlePilihanBahanSelesai = function(selectElement) {
    const selectedOption = selectElement.options[selectElement.selectedIndex];
    const defaultPersentase = selectedOption.getAttribute('data-persentase-default');
    
    console.log(`Bahan dipilih: ${selectElement.value}, Persentase Baker Default: ${defaultPersentase}%`);
};