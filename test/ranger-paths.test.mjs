import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {Engine} from '../src/engine.mjs';
import {Field} from '../src/field.mjs';
import {buildRangerPages,rangerSpec,COLORS} from '../public/stream-deck-layout.js';
import {keySpec} from '../public/stream-deck-render.js';
const read=f=>JSON.parse(fs.readFileSync(new URL('../'+f,import.meta.url)));
const profile=read('profiles/charlottendal-network.json'),plant=read('profiles/simulator-network.json');
function memory(){const files=new Map();return {files,load:(n,d)=>structuredClone(files.get(n)||d),save:(n,d)=>files.set(n,structuredClone(d)),event:()=>{}};}
function rig(){
  let now=100000;const queue=[],commands=[];
  const field=new Field(plant,{now:()=>now,movementMs:100});
  const engine=new Engine(profile,{storage:memory(),now:()=>now,send:b=>{commands.push(b);queue.push(['order',b]);}});
  field.on('frame',b=>queue.push(['report',b]));
  const drain=()=>{let guard=20000;while(queue.length&&guard--){const [k,b]=queue.shift();if(k==='order')field.accept(b);else engine.receive(b);}assert.ok(guard>0);};
  const advance=ms=>{for(let i=0;i<ms;i+=50){now+=50;field.tick();if(now%1000===0)field.allReports();drain();engine.tick();drain();}};
  engine.connection(true);field.allReports();drain();return {engine,field,commands,drain,advance};
}
const path=id=>profile.rangerPaths.find(p=>p.id===id);

test('the point chains come out of the track graph exactly as the layout owner described them',()=>{
  assert.deepEqual(profile.rangerPaths.map(p=>[p.id,p.turnouts]),[
    ['left-g51',{Vx103:'T',Vx114:'C',Vx115:'T'}],['left-g52',{Vx103:'T',Vx114:'C',Vx115:'C'}],
    ['left-g53',{Vx103:'T',Vx114:'T',Vx111:'C',Vx118:'C'}],['left-g54',{Vx103:'T',Vx114:'T',Vx111:'T',Vx118:'T'}],
    ['load-1',{Vx119:'T'}],['load-2',{Vx119:'C'}],
    ['right-g52',{Vx132:'C',Vx130:'C',Vx127:'C'}],['right-g53',{Vx132:'C',Vx130:'T',Vx128:'T'}],['right-g54',{Vx132:'C',Vx130:'T',Vx128:'C'}],
    ['load-3',{Vx133:'T'}],
    ['depot-kolgard',{Vx133:'C',Vx144:'C',Vx150:'T'}],['depot-lokstall',{Vx133:'C',Vx144:'C',Vx150:'C'}],['depot-skiva',{Vx133:'C',Vx144:'C',Vx150:'T',Vx155:'C'}]]);
  // Only the ranger's own turnouts and boundaries in their back position: never a request.
  for(const p of profile.rangerPaths)for(const [n,pos] of Object.entries(p.turnouts))assert.ok(profile.yardArea.turnouts.includes(n)||profile.yardBoundaries[n]?.rangerPositions[0]===pos,p.id+' '+n);
});
test('one press lays the chain; a chain over a group lying out or a locked turnout is refused before any order',()=>{
  const r=rig();
  const before=r.commands.length;r.engine.yard.layPath('left-g54');
  assert.equal(r.commands.length,before+4,'103 T, 114 T, 111 T and 118 T are ordered');
  r.drain();r.advance(500);
  for(const [n,p] of Object.entries(path('left-g54').turnouts))assert.equal(r.engine.turnouts[n].position,p,n);
  assert.equal(r.engine.yard.snapshot().paths.find(p=>p.id==='left-g54').laid,true);
  assert.equal(r.engine.journal[0].kind,'ranger-path');assert.match(r.engine.journal[0].message,/Godsspår 54 från vänster/);
  const again=r.commands.length;r.engine.yard.layPath('left-g54');assert.equal(r.commands.length,again,'a chain that lies is not ordered again');
  const request=r.engine.yard.request('left-11');r.engine.yard.answer(request.id,true);r.drain();r.advance(500);
  const status=r.engine.yard.pathStatus('left-g51');assert.equal(status.allowed,false);assert.match(status.reason,/Vänster 11 ligger ute/);
  const locked=r.commands.length;assert.throws(()=>r.engine.yard.layPath('left-g51'),/ligger ute/);assert.equal(r.commands.length,locked);
  assert.throws(()=>r.engine.yard.layPath('nowhere'),/Okänd växelgata/);
  r.engine.yard.return(request.id,'ranger');r.drain();r.advance(500);
  r.engine.yard.layPath('depot-skiva');r.drain();r.advance(500);
  for(const [n,p] of Object.entries(path('depot-skiva').turnouts))assert.equal(r.engine.turnouts[n].position,p,n);
  const route=r.engine.request('tvv6/6','tvv7/10',null,{operator:'ranger'});r.advance(6500);assert.equal(route.state,'active',route.reason);
  assert.match(r.engine.yard.pathStatus('right-g53').reason,/låst av tågväg/);
});
test('the ranger\'s deck: chains and requests first, then the turnouts, every page starting with the page key',()=>{
  const snapshot=rig().engine.snapshot(),yard=snapshot.yard;
  const pages=buildRangerPages(15,{paths:yard.paths,groups:yard.groups,turnouts:[...yard.own,...yard.boundaries]});
  assert.equal(pages.length,3);assert.ok(pages.every(p=>p[0].id==='page'&&p.length<=15));
  const all=pages.flat().filter(k=>k.type!=='system');
  assert.deepEqual(all.slice(0,3).map(k=>k.text),['V 51','V 52','V 53']);
  assert.equal(all.filter(k=>k.type==='ranger-request').length,8);assert.equal(all.filter(k=>k.type==='ranger-turnout').length,19);
  const one=buildRangerPages(32,{paths:yard.paths,groups:yard.groups,turnouts:[]});assert.equal(one.length,1);
  const env={ranger:k=>rangerSpec(k,{yard,manual:snapshot.manualRanger,turnouts:snapshot.turnouts}),system:{page:0,pages:3},online:true};
  const chain=keySpec(all[0],env);assert.equal(chain.kind,'system');assert.deepEqual(chain.lines,['V','51']);assert.equal(chain.dim,false);
  const laidYard={...yard,paths:yard.paths.map(p=>p.id==='left-g51'?{...p,laid:true}:p),groups:yard.groups.map(g=>g.id==='right-11'?{...g,state:'open',request:{id:'x'}}:g)};
  assert.equal(rangerSpec(all[0],{yard:laidYard}).fill,COLORS.route);assert.equal(rangerSpec(all[0],{yard:laidYard}).caption,'ligger');
  const open=rangerSpec({type:'ranger-request',id:'right-11',title:'Höger 11',text:'Höger 11'},{yard:laidYard});
  assert.equal(open.blink,true);assert.equal(open.fill,COLORS.held);assert.match(open.caption,/ångra/);
  const turnout=rangerSpec({type:'ranger-turnout',id:'Vx114',title:'Växel 114',text:'Vx 114'},{yard,manual:snapshot.manualRanger,turnouts:snapshot.turnouts});
  assert.equal(turnout.caption,'rakt');assert.equal(turnout.dim,false);
  assert.equal(keySpec({type:'ranger-path',id:'left-g51',title:'x'},{system:{},online:true}).dim,true,'without the ranger environment the key is dim');
});
