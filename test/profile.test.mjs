import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { loadProfile } from '../src/profile.mjs';
const withDir = (dir, fn) => { const before = process.env.CHARLOTTENDAL_STATE_DIR; process.env.CHARLOTTENDAL_STATE_DIR = dir; try { return fn(); } finally { if (before === undefined) delete process.env.CHARLOTTENDAL_STATE_DIR; else process.env.CHARLOTTENDAL_STATE_DIR = before; } };
const base = loadProfile('field', { activated: false });

test('simulatorn följer den aktiverade fältprofilen bara när den finns, hör till samma anläggning och går att läsa', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'profile-'));
  assert.equal(withDir(dir, () => loadProfile('field')).id, base.id, 'ingen aktiverad profil: grundprofilen');
  fs.writeFileSync(path.join(dir, 'studio-field-profile.json'), JSON.stringify({ ...base, coupled: { Vx140: ['Vx140', 'Vx143'] } }));
  assert.deepEqual(withDir(dir, () => loadProfile('field')).coupled.Vx140, ['Vx140', 'Vx143']);
  assert.equal(withDir(dir, () => loadProfile('field', { activated: false })).coupled.Vx140[1], 'Vx142', 'utan aktivering: grundprofilen');
  fs.writeFileSync(path.join(dir, 'studio-field-profile.json'), JSON.stringify({ ...base, id: 'annan-anlaggning' }));
  assert.equal(withDir(dir, () => loadProfile('field')).id, base.id, 'annan anläggning: grundprofilen');
  // Katalogen går inte att läsa (i webbdriften kör simulatorn som en annan användare): grundprofilen, ingen krasch.
  const file = path.join(dir, 'not-a-directory'); fs.writeFileSync(file, 'x');
  const errors = []; const original = console.error; console.error = m => errors.push(m);
  try { assert.equal(withDir(file, () => loadProfile('field')).id, base.id); } finally { console.error = original; }
  assert.equal(errors.length, 1); assert.match(errors[0], /ENOTDIR/);
  fs.writeFileSync(path.join(dir, 'studio-field-profile.json'), '{not json');
  assert.throws(() => withDir(dir, () => loadProfile('field')), SyntaxError, 'en oläsbar aktiverad profil stoppar starten');
});
