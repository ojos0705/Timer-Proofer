// [AI-GENERATED][REFACTOR] Canonical UI helpers for dynamic ingredient selectors.
// Keeps ingredient UI behavior independent from the obsolete main.js bootstrap.

export function isiOpsiBahan(selectElement) {
    if (!selectElement || !(selectElement instanceof HTMLSelectElement)) return;

    try {
        const currentValue = selectElement.value;
        selectElement.innerHTML = '<option value="" disabled>-- Pilih Bahan --</option>';

        const ingredients = Array.isArray(window.bakeryIngredients)
            ? window.bakeryIngredients
            : [];

        if (ingredients.length > 0) {
            ingredients.forEach((bahan) => {
                if (!bahan) return;
                const option = document.createElement('option');
                option.value = bahan.id || bahan.name || '';
                option.textContent = `${bahan.name || 'Tanpa Nama'} (${bahan.category || 'Bahan'})`;
                option.setAttribute('data-persentase-default', String(bahan.ratio || 0));
                selectElement.appendChild(option);
            });
        } else {
            const option = document.createElement('option');
            option.disabled = true;
            option.textContent = 'Tidak ada data bahan (Gunakan Manual)';
            selectElement.appendChild(option);
        }

        if (currentValue) selectElement.value = currentValue;
    } catch (error) {
        console.error('[IngredientUI] isiOpsiBahan error:', error);
    }
}

export function updateAllIngredientSelects() {
    const selects = document.querySelectorAll('.select-bahan-bakery');
    selects.forEach((select) => isiOpsiBahan(select));
}

export function handlePilihanBahanSelesai(selectElement) {
    if (!(selectElement instanceof HTMLSelectElement)) return;

    try {
        const selectedOption = selectElement.options[selectElement.selectedIndex];
        if (!selectedOption) return;

        const defaultPersentase = selectedOption.getAttribute('data-persentase-default');
        selectElement.dataset.defaultRatio = defaultPersentase || '0';
    } catch (error) {
        console.error('[IngredientUI] handlePilihanBahanSelesai error:', error);
    }
}

// [AI-GENERATED][COMPATIBILITY] Preserve legacy window-based callers.
window.isiOpsiBahan = isiOpsiBahan;
window.updateAllIngredientSelects = updateAllIngredientSelects;
window.handlePilihanBahanSelesai = handlePilihanBahanSelesai;
