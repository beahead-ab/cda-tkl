import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const css=fs.readFileSync(new URL('../public/panel-fixed.css',import.meta.url),'utf8');
const events=fs.readFileSync(new URL('../public/panel-events.js',import.meta.url),'utf8');
const console_=fs.readFileSync(new URL('../public/panel-console.js',import.meta.url),'utf8');

test('0.45: the console row is gone and the push buttons are chips in the status bar',()=>{
  assert.doesNotMatch(css,/--console-h:54px/);
  assert.match(css,/body\.panel-app #panel-console\{display:none\}/);
  assert.match(css,/#plan-head-right #panel-quick-actions\{display:contents\}/);
  assert.doesNotMatch(css,/reset-switch|console-ind/);
  assert.match(console_,/class="chip" id="panel-reset"/);
});

test('0.45: the right column has a Spårbeläggning tab that widens the column on wide screens',()=>{
  assert.match(events,/data-view="occupancy"/);
  assert.match(css,/#panel-bottom\[data-right=occupancy\] :is\(#ev-content,\.ev-filters\)\{display:none\}/);
  assert.match(css,/@media\(min-width:1800px\)[^{]*\{#panel-bottom\[data-right=occupancy\]\{grid-template-columns:minmax\(0,1fr\) 820px\}\}/);
  assert.match(css,/\.occ-bar\.occ-now\{color:#f5d76e\}/);
});

test('0.45.1: short chip words, one simulation chip, Styra RBG struck through while delegated',()=>{
  const head=fs.readFileSync(new URL('../public/panel-head.js',import.meta.url),'utf8');
  assert.match(console_,/id="panel-reset-label">Återställ</);
  assert.match(console_,/textContent='Styra RBG'/);
  assert.match(console_,/classList\.toggle\('chip-off',delegated\)/);
  assert.match(css,/\.chip\.chip-off>span\{text-decoration:line-through/);
  assert.doesNotMatch(head,/plan-head-sim/);
});

test('0.45.2: a focus ring only after Tab, and a reload chip for a new release',()=>{
  const app=fs.readFileSync(new URL('../public/app.css',import.meta.url),'utf8');
  const head=fs.readFileSync(new URL('../public/panel-head.js',import.meta.url),'utf8');
  const server=fs.readFileSync(new URL('../src/server.mjs',import.meta.url),'utf8');
  assert.match(app,/body:not\(\[data-nav-keyboard\]\) :is\(button,a,input,select,textarea,summary,\[role=button\],\[role=tab\],\[tabindex\]\):is\(:focus,:focus-visible\)\{outline:none!important\}/);
  assert.match(app,/body\[data-nav-keyboard\] :is\([^)]*\):focus-visible\{outline:2px solid #aeb6be!important/);
  assert.match(head,/id="plan-head-release"/);
  assert.match(server,/return \{ \.\.\.state,release,/);
  assert.match(server,/\.\.\.panelProfile,release,/);
});

test('0.50.0: CHARLOTTENDAL in its own status row, no zoom, no simulation chip, notices beside the name',()=>{
  const head=fs.readFileSync(new URL('../public/panel-head.js',import.meta.url),'utf8');
  const app=fs.readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
  assert.match(head,/<span class="plan-head-title">Charlottendal<\/span><span class="chip chip-status" id="plan-head-status"/);
  assert.doesNotMatch(head,/plan-head-zoom|plan-head-gateway|plan-head-sub/);
  // One method per name: a duplicate key silently replaced the update notice in 0.49.0.
  const keys=[...head.matchAll(/^    ([a-zA-Z]+)\(/gm)].map(m=>m[1]);assert.deepEqual(keys,[...new Set(keys)]);
  assert.match(app,/panelHead\?\.updateNotice\(state\.update\)/);
  assert.match(app,/Ingen kontakt med anläggningen/);
  assert.doesNotMatch(app,/panel-zoom|zoomDialog/);
  assert.match(css,/--plan-inset-top:32px;--plan-fit:contain/);
  assert.ok(!fs.existsSync(new URL('../public/panel-zoom.js',import.meta.url)));
});

