import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const root=fileURLToPath(new URL('..',import.meta.url));
test('complete XML import matches every original field and retains categories and legacy notes',()=>{
  const result=execFileSync('python3',['scripts/verify-source.py'],{cwd:root,encoding:'utf8'});
  assert.match(result,/Verified:/);
});
test('source catalog regeneration is deterministic and current',()=>{
  execFileSync('python3',['scripts/import-source.py','--check'],{cwd:root,stdio:'pipe'});
});
