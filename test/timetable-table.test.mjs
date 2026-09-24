import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {zipSync,unzipSync,strToU8,strFromU8} from 'fflate';
import {tableUpload,readTable} from '../src/timetable-table.mjs';
import {TimetableImport,ROW_FIELDS} from '../src/timetable-import.mjs';
import {Storage} from '../src/storage.mjs';
import {TIMETABLE_COLUMNS,TEMPLATE_ROWS} from '../public/timetable-format.js';
const template=ext=>fs.readFileSync(new URL('../public/templates/cda-tkl-tidtabell.'+ext,import.meta.url));
const upload=(bytes,ext='csv')=>({name:'Provträff.'+ext,data:Buffer.from(bytes).toString('base64')});
const read=(bytes,ext='csv')=>readTable(tableUpload(upload(bytes,ext)));
const csv=(rows=TEMPLATE_ROWS,delimiter=';')=>[TIMETABLE_COLUMNS.map(([label])=>label),...rows].map(r=>r.map(v=>'"'+v.replaceAll('"','""')+'"').join(delimiter)).join('\r\n');
function xlsx(edit){const files=unzipSync(template('xlsx'));edit(files);return zipSync(files);}
const changeXML=(files,name,change)=>{files[name]=strToU8(change(strFromU8(files[name])));};
const sheetChange=change=>xlsx(files=>changeXML(files,'xl/worksheets/sheet1.xml',change));
const rev=s=>({sessionId:s.sessionId,revision:s.data.revision});

test('both downloadable templates round trip exact values, leading zeroes, time serials and source rows',async()=>{
  for(const ext of ['csv','xlsx']){
    const rows=await read(template(ext),ext);assert.equal(rows.length,2);
    for(let i=0;i<2;i++)for(const [j,[,key]] of TIMETABLE_COLUMNS.entries())assert.equal(rows[i][key],key==='noStop'?TEMPLATE_ROWS[i][j]==='Ja':TEMPLATE_ROWS[i][j]);
    assert.equal(rows[0].sources[0].row,2);assert.equal(rows[1].sources[0].row,3);
    assert.equal(rows[0].sources[0].sheet,ext==='xlsx'?'Tidtabell':undefined);
  }
});
test('CSV handles BOM, both separators, quotes, multiline notes, blanks and after-midnight times',async()=>{
  for(const delimiter of [';',',']){
    const rows=structuredClone(TEMPLATE_ROWS);rows[0][9]='Möte; byte, "spår"\nÖvrigt';rows[1][4]='25:10';
    const parsed=await read('\ufeff'+csv(rows,delimiter)+'\r\n');assert.equal(parsed[0].note,rows[0][9]);assert.equal(parsed[1].departure,'25:10');assert.equal(parsed[1].sources[0].row,4);
  }
  assert.equal((await read(csv([TEMPLATE_ROWS[0],Array(10).fill(''),TEMPLATE_ROWS[1]])))[1].sources[0].row,4);
});
test('strict CSV errors identify bad data and never silently drop malformed rows or columns',async()=>{
  for(const bad of [csv().replace('Tågnummer','Tåg'),csv().replace('"Station"','"Tågnummer"'),csv().replace('"Ankomst";"Avgång"','"Avgång";"Ankomst"'),csv().split('\r\n')[0]])await assert.rejects(read(bad));
  for(const [index,value,expected] of [[0,'',/Rad 2, Tågnummer/],[2,'',/Rad 2, Trafikdag/],[3,'9:77',/Rad 2, Ankomst/],[8,'True',/Rad 2, Passerar/],[9,'=SUM(A1)',/formel/],[9,'a'.repeat(2001),/många tecken/]]){
    const row=[...TEMPLATE_ROWS[0]];row[index]=value;await assert.rejects(read(csv([row])),expected);
  }
  await assert.rejects(read(csv([TEMPLATE_ROWS[0].slice(0,9)])),/exakt 10/);
  await assert.rejects(read(csv([Array(11).fill('text')])),/exakt 10/);
  await assert.rejects(read(csv().replace('"09:05"','"09:05')),/citattecken/);
  await assert.rejects(read(Buffer.from([255,254,0,97])),/UTF-8/);
  await assert.rejects(read(csv(Array(301).fill(TEMPLATE_ROWS[0]))),/300/);
});
test('Excel supports text or numeric times including 00:00 and 25:10, date1904, row gaps and padded number formats',async()=>{
  const original=strFromU8(unzipSync(template('xlsx'))['xl/worksheets/sheet1.xml']);
  const time=original.match(/<x:c r="D2".*?<x:v>(.*?)<\/x:v>/)[1];
  const midnight=await read(sheetChange(s=>s.replace('<x:v>'+time+'</x:v>','<x:v>0</x:v>')),'xlsx');assert.equal(midnight[0].arrival,'00:00');
  const late=await read(sheetChange(s=>s.replace('<x:v>'+time+'</x:v>','<x:v>'+((25*60+10)/1440)+'</x:v>')),'xlsx');assert.equal(late[0].arrival,'25:10');
  const legacy=await read(xlsx(files=>changeXML(files,'xl/workbook.xml',s=>s.replace('<x:sheets>','<x:workbookPr date1904="1"/><x:sheets>'))),'xlsx');assert.equal(legacy[0].arrival,'09:05');
  const gap=await read(sheetChange(s=>s.replace(/<x:row r="4"[\s\S]*?<\/x:row>/,'').replace(/<x:row r="3"[\s\S]*?<\/x:row>/,row=>row.replace('r="3"','r="4"').replace(/r="([A-J])3"/g,'r="$14"'))),'xlsx');assert.equal(gap[1].sources[0].row,4);
  const noPrefix=await read(xlsx(files=>{for(const name of Object.keys(files).filter(n=>n.endsWith('.xml')))changeXML(files,name,s=>s.replaceAll('xmlns:x=','xmlns=').replaceAll('<x:','<').replaceAll('</x:','</'));}),'xlsx');assert.equal(noPrefix[1].trainNumber,'00402');
  const padded=await read(xlsx(files=>{
    changeXML(files,'xl/styles.xml',s=>s.replace('formatCode="@"','formatCode="00000"'));
    changeXML(files,'xl/worksheets/sheet1.xml',s=>s.replace(/<x:c r="A3"[^>]*><x:v>00402<\/x:v>/,'<x:c r="A3" s="8" t="n"><x:v>402</x:v>'));
  }),'xlsx');assert.equal(padded[1].trainNumber,'00402');
});
test('Excel rejects formulas even with cached results, hidden rows, extra cells/sheets, errors and merges',async()=>{
  for(const [change,expected] of [
    [s=>s.replace('<x:v>P401</x:v>','<x:f>"P401"</x:f><x:v>P401</x:v>'),/A2.*formeln/],
    [s=>s.replace('<x:row r="2"','<x:row hidden="1" r="2"'),/Rad 2.*dolda/],
    [s=>s.replace('r="J3"','r="K3"'),/10 kolumner/],
    [s=>s.replace('<x:sheetData>','<x:mergeCells><x:mergeCell ref="A2:B2"/></x:mergeCells><x:sheetData>'),/sammanslagna/],
    [s=>s.replace(/<x:c r="A2"[^>]*>/,'<x:c r="A2" t="e">'),/A2.*felvärdet/]
  ])await assert.rejects(read(sheetChange(change),'xlsx'),expected);
  await assert.rejects(read(xlsx(files=>changeXML(files,'xl/workbook.xml',s=>s.replace('name="Läs mig"','name="Fler tåg"'))),'xlsx'),/Andra blad/);
});
test('uploads and ZIP expansion are bounded and invalid contents cannot masquerade as Excel',async()=>{
  for(const f of [upload('abc','xls'),{name:'a.csv',data:'!!!!'},upload(Buffer.alloc(2*1024*1024+1)),{name:'a\n.csv',data:'YQ=='}])assert.throws(()=>tableUpload(f));
  await assert.rejects(read('Tågnummer;Station','xlsx'),/skadad|format/);
  await assert.rejects(read(zipSync({'xl/workbook.xml':new Uint8Array(13*1024*1024)}),'xlsx'),/packas upp/);
  await assert.rejects(read(xlsx(files=>{files['xl/vbaProject.bin']=strToU8('fake');}),'xlsx'),/makron/);
});
test('structured import requires no AI, preserves active data until reviewed, provenance and restart',async t=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'cda-table-test-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
  const storage=new Storage(dir),reader={configured:false,provider:'OpenAI',read(){assert.fail('AI must not be called');}},s=new TimetableImport({storage,reader});
  await s.table({...rev(s),file:upload(template('csv'))});assert.equal(s.data.active,null);assert.equal(s.data.draft.kind,'csv');
  assert.throws(()=>s.activate({...rev(s),reviewed:false}),/Granska/);s.activate({...rev(s),reviewed:true});const active=structuredClone(s.data.active);
  await assert.rejects(s.table({...rev(s),file:upload('fel;rubriker')}));assert.deepEqual(s.data.active,active);assert.equal(s.data.draft,null);
  await s.table({...rev(s),file:upload(template('xlsx'),'xlsx')});assert.deepEqual(s.data.active,active);
  const d=structuredClone(s.data.draft);d.rows[0].track='3b';d.rows[0].sources=[{file:99,row:99}];s.save({...rev(s),title:'Granskad',rows:d.rows});assert.equal(s.data.draft.rows[0].sources[0].row,2);
  const source=s.sourceFile(d.id,'1');assert.deepEqual(fs.readFileSync(source.path),template('xlsx'));assert.equal(fs.statSync(source.path).mode&0o777,0o600);
  s.activate({...rev(s),reviewed:true});const next=new TimetableImport({storage,reader});assert.equal(next.data.active.kind,'xlsx');assert.equal(next.data.active.rows[0].track,'3b');
  assert.ok(ROW_FIELDS.every(k=>typeof next.data.active.rows[0][k]==='string'));
});
test('concurrent state changes win over a file still being parsed; duplicates cannot activate',async t=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'cda-table-race-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
  const s=new TimetableImport({storage:new Storage(dir),reader:{configured:false}});
  const pending=s.table({...rev(s),file:upload(template('xlsx'),'xlsx')});s.manual(rev(s));await assert.rejects(pending,/ändrats/);assert.equal(s.data.draft.kind,'manual');
  s.discard(rev(s));await s.table({...rev(s),file:upload(csv([TEMPLATE_ROWS[0],TEMPLATE_ROWS[0]]))});assert.throws(()=>s.activate({...rev(s),reviewed:true}),/flera gånger/);
  const rows=structuredClone(s.data.draft.rows);rows[1].included=false;s.save({...rev(s),title:'Utan dubblett',rows});assert.deepEqual(s.data.draft.warnings,[]);s.activate({...rev(s),reviewed:true});assert.equal(s.data.active.rows.length,1);
});
