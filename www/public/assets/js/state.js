// state.js
export let uploadedRecipeFiles = [];

export function addFiles(newFiles) {
    // Batasi maksimal misal 4 foto
    const remainingSlots = 4 - uploadedRecipeFiles.length;
    const filesToAdd = Array.from(newFiles).slice(0, remainingSlots);
    uploadedRecipeFiles.push(...filesToAdd);
    return uploadedRecipeFiles;
}

export function removeFile(index) {
    uploadedRecipeFiles.splice(index, 1);
    return uploadedRecipeFiles;
}

export function clearFiles() {
    uploadedRecipeFiles = [];
    return uploadedRecipeFiles;
}