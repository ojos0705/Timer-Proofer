// modal.js
export function previewRecipePhoto(url) {
    const modal = document.getElementById('recipe-photo-preview-modal');
    const modalImage = document.getElementById('recipe-preview-image');
    
    if (modal && modalImage) {
        modalImage.src = url;
        // Gunakan method bawaan modal (misal Bootstrap modal atau class toggle)
        modal.classList.remove('hidden'); 
    }
}

export function closePreviewModal() {
    const modal = document.getElementById('recipe-photo-preview-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
}