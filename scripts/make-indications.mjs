import fs from 'node:fs';
import assert from 'node:assert/strict';
import {crossingGeometry} from '../src/crossing-indications.mjs';
const read=file=>JSON.parse(fs.readFileSync(new URL('../'+file,import.meta.url)));
const source=read('public/data/operations-source.json'),index=read('public/data/source/index.json');
const panel=read('public/data/panel.json');
assert.equal(source.sourceHash,index.meta.sha256);
const group=source.groups.find(g=>g.id==='IX:AUTO:0012');
assert.equal(group.enabled,true);assert.equal(group.rules.length,4);
const indicators=group.rules.map((id,i)=>{
  const rule=source.rules.find(r=>r.id===id),name='V'+(i+1);
  assert.equal(rule.name,name);assert.equal(rule.attributes.logicType,'2');
  assert.equal(rule.variables.length,[33,35,19,6][i]);
  const conditions=rule.variables.map((v,j)=>{
    assert.ok(['1','35'].includes(v.type));assert.equal(v.negated,'no');
    assert.equal(v.operator,j===0?'4':'5');
    if(v.type==='35') {
      const nx=source.nxPairs.find(n=>n.id===v.systemName);assert.ok(nx);
      return {kind:'nx',id:nx.id,label:nx.fromSensor.replace(/^tvs/,'')+' → '+nx.toSensor.replace(/^tvs/,'')};
    }
    const sensor=source.sensors.find(s=>s.name===v.systemName||s.system===v.systemName);assert.ok(sensor);
    assert.equal(sensor.attributes.inverted,'false');
    return {kind:'sensor',id:v.systemName,label:v.systemName,sourceSystem:sensor.system};
  });
  const expected=[['1','g','2'],['1','r','4'],['2','g','4'],['2','r','2']].map(([option,color,data])=>({option,type:'9',systemName:name+color,data,delay:'0',string:''}));
  assert.deepEqual(rule.actions,expected);
  const lamps=Object.fromEntries(['g','r'].map(color=>{const sensor=source.sensors.find(s=>s.name===name+color);assert.ok(/^IS\d+$/.test(sensor.system));return [color,{name:sensor.name,sourceSystem:sensor.system}];}));
  const record=index.records.find(r=>r.system===id&&r.category==='conditionals');assert.ok(record);
  const crossing=crossingGeometry(panel,name);
  return {name,rule:id,sourceKey:record.key,logic:'any',conditions,lamps,...(crossing?{crossing}:{})};
});
const catalog={sourceHash:source.sourceHash,group:group.id,indicators,note:'Beräknade panelindikeringar. Ingen fysisk bomstyrning eller bomkvittens.'};
const file=new URL('../public/data/indications.json',import.meta.url),content=JSON.stringify(catalog,null,2)+'\n';
if(process.argv.includes('--check'))assert.equal(fs.readFileSync(file,'utf8'),content,'Inaktuellt indikeringsunderlag');else fs.writeFileSync(file,content);
console.log('4 källregler, 80 NX-villkor och 13 sensorvillkor för panelindikeringar.');
