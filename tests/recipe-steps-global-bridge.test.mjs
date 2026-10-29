import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');

test('production-step state has one canonical module binding and a legacy accessor bridge', () => {
  const source = read('assets/js/app-core.js');
  assert.match(source, /let activeRecipeSteps = Array\.isArray\(window\.activeRecipeSteps\)[\s\S]*?defaultRecipeSteps/);
  assert.match(source, /Object\.defineProperty\(window,\s*'activeRecipeSteps',[\s\S]*?get\(\)\s*\{\s*return activeRecipeSteps;\s*\}[\s\S]*?set\(nextSteps\)\s*\{\s*activeRecipeSteps = Array\.isArray\(nextSteps\) \? nextSteps : \[\];/);
  assert.match(source, /window\.activeRecipeSteps\.push\(/);
  assert.match(source, /activeRecipeSteps\.splice\(/);
  assert.match(source, /window\.activeRecipeSteps = \[\];/);
});

test('production-step compatibility bridge handles non-configurable legacy descriptors without crashing startup', () => {
  const source = read('assets/js/app-core.js');
  assert.match(source, /if \(!activeRecipeStepsDescriptor \|\| activeRecipeStepsDescriptor\.configurable\)/);
  assert.match(source, /window\.activeRecipeSteps sudah non-configurable/);
  assert.match(source, /catch \(error\)\s*\{\s*console\.warn\('\[RecipeSteps\] Gagal memasang bridge state langkah produksi:'/);
});
