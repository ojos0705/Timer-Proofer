/** [AI-GENERATED][QA][V193] Regression tests for photo-upload vs IndexedDB-restore races. */
import test from 'node:test';
import assert from 'node:assert/strict';

// Build a small deterministic DOM test double around the existing service API.
class FakeClassList {
    constructor() { this.values = new Set(); }
    add(name) { this.values.add(name); }
    remove(name) { this.values.delete(name); }
    contains(name) { return this.values.has(name); }
}

class FakeElement {
    constructor(id = '') {
        this.id = id;
        this.dataset = {};
        this.style = {};
        this.children = [];
        this.classList = new FakeClassList();
        this.listeners = {};
        this.attributes = {};
        this.value = '';
        this.files = [];
    }
    replaceChildren(...children) { this.children = [...children]; }
    appendChild(child) { this.children.push(child); return child; }
    setAttribute(name, value) { this.attributes[name] = String(value); }
    addEventListener(name, callback) { (this.listeners[name] ||= []).push(callback); }
    removeAttribute(name) { delete this.attributes[name]; }
    querySelector() { return null; }
    click() { this.clicked = true; }
    focus() { this.focused = true; }
}

const slots = Array.from({ length: 5 }, (_, index) => new FakeElement(`recipe-photo-slot-${index}`));
const input = new FakeElement('foto-akhir');
const elements = new Map([['foto-akhir', input], ...slots.map((slot) => [slot.id, slot])]);

globalThis.window = {};
globalThis.document = {
    readyState: 'complete',
    getElementById: (id) => elements.get(id) || null,
    createElement: (tagName) => new FakeElement(tagName),
    addEventListener() {}
};

const { RecipePhotoService, getRecipePhotoMutationEpoch } = await import('../assets/js/recipe-photo-service.js');

function createImage(name) {
    return new File([new Uint8Array([1, 2, 3])], name, { type: 'image/jpeg' });
}

test('a successful user upload increments the restore-invalidating mutation epoch', () => {
    RecipePhotoService.clear();
    const epochBeforeUpload = getRecipePhotoMutationEpoch();
    const file = createImage('fresh-upload.jpg');

    assert.equal(RecipePhotoService.handleFiles([file], 2), true);

    assert.equal(getRecipePhotoMutationEpoch(), epochBeforeUpload + 1);
    assert.equal(RecipePhotoService.getSlotFiles()[2], file);
    // Restore captures a generation before awaiting IndexedDB. Upload now invalidates it.
    assert.notEqual(epochBeforeUpload, getRecipePhotoMutationEpoch());
});

test('uploading into a later slot preserves earlier photos and physical slot positions', () => {
    RecipePhotoService.clear();
    const first = createImage('slot-0.jpg');
    const third = createImage('slot-3.jpg');

    RecipePhotoService.handleFiles([first], 0);
    RecipePhotoService.handleFiles([third], 3);

    const slotFiles = RecipePhotoService.getSlotFiles();
    assert.equal(slotFiles[0], first);
    assert.equal(slotFiles[1], null);
    assert.equal(slotFiles[3], third);
    assert.equal(RecipePhotoService.getState().count, 2);
});

test('empty or invalid upload selections do not create false photo mutations', () => {
    RecipePhotoService.clear();
    const epochBefore = getRecipePhotoMutationEpoch();

    assert.equal(RecipePhotoService.handleFiles([], 0), false);
    assert.equal(RecipePhotoService.handleFiles([new File(['text'], 'notes.txt', { type: 'text/plain' })], 0), false);
    assert.equal(getRecipePhotoMutationEpoch(), epochBefore);
});


test('photo restore and slot reads remain safe when the global File constructor is unavailable', () => {
    RecipePhotoService.clear();
    const originalFile = globalThis.File;
    const blob = new Blob([new Uint8Array([7, 8, 9])], { type: 'image/png' });

    try {
        globalThis.File = undefined;
        assert.doesNotThrow(() => RecipePhotoService.restoreFiles([blob]));
        assert.deepEqual(RecipePhotoService.getFiles(), [blob]);
        assert.equal(RecipePhotoService.getSlotFiles()[0], blob);
        assert.equal(RecipePhotoService.getState().count, 1);
    } finally {
        globalThis.File = originalFile;
        RecipePhotoService.clear();
    }
});


test('photo mutation state is held in the ES6 module, not mutable window globals', () => {
    assert.equal(Object.hasOwn(window, '__recipePhotoMutationEpoch'), false);
    assert.equal(Object.hasOwn(window, '__activeRecipePhotoIndex'), false);
    assert.equal(Number.isInteger(getRecipePhotoMutationEpoch()), true);
});
