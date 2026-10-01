import test from 'node:test';
import assert from 'node:assert/strict';
import {clockAt,groupRows,routeLaid,toMinutes,trainClass} from '../public/timetable-rows.js';

const row=(number,extra={})=>({id:'m'+number,number,slag:'Pt',arrival:'',departure:'',from:'',to:'',track:'1a',planned:'1a',changed:false,noStop:false,note:'',movement:null,sortTime:'',...extra});

test('the meet clock runs locally at the reported speed and wraps at midnight',()=>{
  assert.equal(clockAt({time:'06:12:40',rate:4,running:true},0).text,'06:12:40');
  assert.equal(clockAt({time:'06:12:40',rate:4,running:true},5000).text,'06:13:00');
  assert.equal(clockAt({time:'06:12:40',rate:4,running:false},60000).text,'06:12:40');
  assert.equal(clockAt({time:'23:59:50',rate:1,running:true},15000).short,'00:00');
  assert.equal(clockAt(null,0),null);
});

test('train classes follow TrainMeet types and times parse leniently',()=>{
  assert.deepEqual(['person','goods','freight','work','',null].map(trainClass),['Pt','Gt','Gt','Tjt','','']);
  assert.equal(toMinutes('06:17'),377);assert.equal(toMinutes('6:05:30'),365);assert.equal(toMinutes('—'),null);
});

test('rows are grouped around the clock: done · now · next, with the design wording',()=>{
  const rows=[
    row('104',{arrival:'07:44',departure:'07:46',from:'Vagnsta',to:'Lekby',sortTime:'07:44'}),
    row('3510',{arrival:'06:17',departure:'06:20',from:'Vagnsta',to:'Lekby',note:'Vagnar till Godsspår 53\nAndra raden',movement:{arrival:'approaching',departure:'none'},sortTime:'06:17'}),
    row('101',{arrival:'06:06',departure:'06:08',from:'Lekby',to:'Vagnsta',note:'Postvagn lossas',movement:{arrival:'arrived',departure:'departed'},sortTime:'06:06'}),
    row('4142',{arrival:'06:35',departure:'',from:'Lekby',to:'',track:'RBG 12',note:'växlas till Lastspår 1',sortTime:'06:35'}),
    row('4102',{arrival:'06:56',departure:'06:56',from:'Lekby',to:'Vagnsta',noStop:true,sortTime:'06:56'}),
    row('103',{arrival:'07:23',departure:'07:25',from:'Lekby',to:'Vagnsta',track:'2a',planned:'2b',changed:true,sortTime:'07:23'}),
    row('4152',{arrival:'',departure:'05:30',from:'Kungsfors',to:'Lekby',sortTime:'05:30'}),
  ];
  const g=groupRows(rows,{minutes:toMinutes('06:12'),routes:[{state:'active',label:'Au → Spår 2a'}],announced:new Map([['3510','06:11']])});
  assert.deepEqual(g.done.map(r=>r.number),['4152','101']);
  assert.deepEqual(g.now.map(r=>r.number),['3510']);
  assert.deepEqual(g.next.map(r=>r.number),['4142','4102','103','104']);
  assert.equal(g.done[0].lage,'');assert.equal(g.done[1].lage,'Avgått');assert.equal(g.done[1].la,'Avgått · Postvagn lossas');
  assert.equal(g.now[0].lage,'Närmar sig · anmält 06:11 · tågväg ej lagd');
  assert.equal(g.now[0].la,'Närmar sig · anmält 06:11 · tågväg ej lagd · Vagnar till Godsspår 53');
  assert.equal(g.now[0].noteLine,'Vagnar till Godsspår 53');
  assert.equal(g.next[0].lage,'om 23 min');assert.equal(g.next[0].toText,'slutar');assert.equal(g.next[0].frTill,'Lekby → slutar');
  assert.equal(g.next[1].lage,'Genomfart');assert.equal(g.next[2].lage,'Spår ändrat fr. 2b');assert.equal(g.next[3].lage,'');
  assert.equal(g.done[0].fromText,'Kungsfors');assert.equal(g.done[0].toText,'Lekby');
  assert.deepEqual(g.nextSummary,{number:'3510',from:'Vagnsta',kind:'ank',time:'06:17',minutes:5});
  assert.equal(g.doneKey,'m4152\u0000m101');
});

test('without a clock nothing is done or next-in-minutes; an established route on the track clears the flag',()=>{
  const g=groupRows([row('1',{departure:'05:00'}),row('2',{arrival:'06:00',movement:{arrival:'arrived',departure:'none'}})],{routes:[{state:'active',label:'Lekby → Spår 1a'}]});
  assert.deepEqual(g.done,[]);assert.equal(g.now[0].lage,'Ankommet');assert.equal(g.next[0].lage,'');
  assert.deepEqual(g.nextSummary,{number:'2',from:'',kind:'ank',time:'06:00',minutes:null});
  assert.equal(routeLaid([{state:'released',label:'Au → Spår 1a'}],'1a'),false);
  assert.equal(routeLaid([{state:'traversing',label:'Spår 1a → Bu'}],'1A'),true);
  assert.equal(routeLaid([],''),null);
  const named=groupRows([row('9',{arrival:'06:00',track:'C · 4',trackLabel:'4',movement:{arrival:'arrived',departure:'none'}})],{minutes:360,routes:[{state:'active',label:'Lekby → Spår 4'}]});
  assert.equal(named.now[0].lage,'Ankommet');
});

test('departed trains sort before the NU line even when the server listed them later',()=>{
  const g=groupRows([row('b',{departure:'06:30',sortTime:'06:30',movement:{arrival:'none',departure:'departed'}}),row('a',{departure:'06:40',sortTime:'06:40'})],{minutes:toMinutes('06:35')});
  assert.deepEqual(g.all.map(r=>r.number+':'+r.group),['b:done','a:next']);
  assert.equal(g.next[0].lage,'om 5 min');
});
