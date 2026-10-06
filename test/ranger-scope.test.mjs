import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {rangerScope} from '../public/ranger-scope.js';
const read=f=>JSON.parse(fs.readFileSync(new URL('../'+f,import.meta.url)));
const panel=read('public/data/panel.json'),config=read('profiles/charlottendal-network.json');
const seg=id=>panel.segs.find(s=>s.id===id);
const blockOf=id=>seg(id)?.b;

test('the ranger sees the own area, spår 11–13 with the request routes, and stubs where TKL\'s track goes on',()=>{
  const scope=rangerScope(panel,config);
  for(const id of config.yardArea.segments)assert.ok(scope.segments.has(id),id);
  const blocks=new Set([...scope.segments].map(blockOf));
  for(const b of ['SIIIA','SIVA','SVA','SG51','SLIII','SVI','SIIID','Slokstall1'])assert.ok(blocks.has(b),b);
  for(const b of ['SIA','SIIB','SIC','SU1A','SN1A'])assert.ok(!blocks.has(b),'TKL\'s '+b+' is not drawn');
  for(const name of ['Vx111','Vx103','Vx112','Vx113','Vx116','Vx123','Vx126','Vx131','Vx132','Vx144','Vx154','Vx153','Vx161','Vx164'])assert.ok(scope.turnouts.has(name),name);
  for(const name of ['Vx100','Vx120','Vx140','Vx170'])assert.ok(!scope.turnouts.has(name),name);
  // A stub is the start of a hidden segment at a visible end, never longer than 28.
  assert.ok(scope.stubs.size>=4);
  for(const [id,stub] of scope.stubs){assert.ok(!scope.segments.has(id));assert.ok(Math.hypot(stub.x2-stub.x1,stub.y2-stub.y1)<=28.01,id);}
  assert.ok([...scope.stubs.keys()].some(id=>blockOf(id)==='S112a'),'112 towards 102 on 2c is a stub');
  assert.ok(scope.showSignal(panel.micons.find(m=>m.mast==='3/10')));assert.ok(scope.showSignal(panel.micons.find(m=>m.mast==='6/6')));
  assert.ok(!scope.showSignal(panel.micons.find(m=>m.mast==='1/5')));
  assert.ok(scope.crop.width<2000&&scope.crop.height<640,'the view is cropped to the ranger\'s part');
  assert.ok(scope.crop.x>0&&scope.crop.y>0);
});
