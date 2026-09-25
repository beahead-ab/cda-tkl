import test from 'node:test';
import assert from 'node:assert/strict';
import {blankSheetRow,parseClipboard,clipboardText,applyCells,cellError} from '../public/timetable-sheet-model.js';
test('spreadsheet clipboard preserves leading zeros, quoted multiline notes and CRLF boundaries',()=>{
  const values=[['00402','Charlottendal','Dagl','09:15','09:20','2','A','B','Nej','Första raden\nmed "citat"\toch tabb'],['003','Station','Lör','','25:10']];
  assert.deepEqual(parseClipboard(clipboardText(values)),values);
  assert.deepEqual(parseClipboard('00402\t09:15\r\n003\t25:10\r\n'),[['00402','09:15'],['003','25:10']]);
  assert.throws(()=>parseClipboard('"ofärdig'),/citat/);
});
test('multi-cell paste is atomic, bounded and retains row identity and provenance',()=>{
  const old=[{...blankSheetRow(),id:'old',sources:[{file:1,page:2}]}],copy=structuredClone(old);
  const next=applyCells(old,0,0,[['00402','Station','Dagl','09:15','','2'],['003','Station','Lör','','25:10']]);
  assert.equal(next[0].id,'old');assert.deepEqual(next[0].sources,old[0].sources);assert.equal(next[1].id,null);assert.equal(next[0].trainNumber,'00402');assert.deepEqual(old,copy);
  for(const [row,col,values] of [[300,0,[['x']]],[0,10,[['Ja','x']]],[0,8,[['perhaps']]],[0,0,[['x'.repeat(161)]]]])assert.throws(()=>applyCells(old,row,col,values));
  assert.deepEqual(old,copy);assert.equal(applyCells(old,0,8,[['Ja']])[0].noStop,true);
});
test('cell validation marks required fields and bad minutes while accepting times after midnight',()=>{
  const row=blankSheetRow();assert.ok(cellError(row,'trainNumber'));assert.ok(cellError(row,'arrival'));row.departure='25:10';assert.equal(cellError(row,'departure'),'');row.departure='25:99';assert.ok(cellError(row,'departure'));row.included=false;assert.equal(cellError(row,'departure'),'');
});
