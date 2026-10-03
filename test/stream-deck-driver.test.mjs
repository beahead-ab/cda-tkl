// The deck driver with stand-ins for WebHID, the Stream Deck library, the DOM and fetch:
// several decks at once, each with the layout saved for its serial number.
import test from 'node:test';
import assert from 'node:assert/strict';

const posts=[];
const ctx=new Proxy({measureText:t=>({width:String(t).length*5})},{get:(o,k)=>k in o?o[k]:()=>{},set:()=>true});
globalThis.window={isSecureContext:true};
globalThis.location={origin:'http://127.0.0.1:8910'};
globalThis.document={getElementById:()=>null,createElement:()=>({width:0,height:0,getContext:()=>ctx})};
globalThis.localStorage={getItem:()=>null,setItem(){}};
globalThis.fetch=async(url,options)=>{posts.push([url,JSON.parse(options.body)]);return {ok:true,json:async()=>({})};};
let clock=0;performance.now=()=>clock;
const {createStreamDeck,cleanSerial}=await import('../public/stream-deck.js');
const tick=()=>new Promise(r=>setTimeout(r,30));

function fakeDeck(serial,columns,rows){
  const handlers={},fills=[],device={vendorId:4057,opened:false};
  const CONTROLS=[];for(let r=0;r<rows;r++)for(let c=0;c<columns;c++)CONTROLS.push({type:'button',feedbackType:'lcd',index:r*columns+c,row:r,column:c,pixelSize:{width:72,height:72}});
  const deck={CONTROLS,PRODUCT_NAME:'Stream Deck',hid:{device},getSerialNumber:async()=>serial,on:(event,fn)=>{handlers[event]=fn;},clearPanel:async()=>{},setBrightness:async()=>{},fillKeyCanvas:async i=>{fills.push(i);},close:async()=>{}};
  device.deck=deck;
  return {device,deck,fills,async press(index,ms=50){handlers.down({type:'button',index});clock+=ms;handlers.up({type:'button',index});await tick();}};
}

test('several decks run at once, each with the layout saved for its serial number',async t=>{
  const xl=fakeDeck('XL1',8,4),mk=fakeDeck('MK 1!',5,3),listeners={},calls=[],messages=[],chosen=[];let cleared=0;
  const hid={getDevices:async()=>[xl.device,mk.device],requestDevice:async()=>[],addEventListener:(type,fn)=>{listeners[type]=fn;}};
  const library={openDevice:async device=>device.deck};
  const trainMeet={paired:true,sessionId:'s1',revision:3,context:{
    trains:[{id:'t1',train_number:'101',arrival_time:'',departure_time:'10:00',track:'12'},{id:'t2',train_number:'202',arrival_time:'',departure_time:'10:30',track:'11'}],
    directions:{t1:{from:'',to:'lek'},t2:{from:'',to:'lek'}},movements:[],
    lines:[{id:'cda-lek',neighborId:'lek',neighborName:'Lekby',neighborCode:'LEK',state:'free',direction:'',trainNumber:''}]}};
  const view={version:2,revision:1,legacy:null,decks:{XL1:{name:'Huvudställverket',model:'xl',lastSeen:'',activeVersion:1,activatedAt:'',draft:null,active:{model:'xl',pages:[
    {name:'Drift',keys:[{type:'turn',slot:1,filter:'all'},{type:'nav',to:'next'},{type:'system',id:'panel-reset'},{type:'plupp',id:'p1',hold:1000},...Array(28).fill(null)]},
    {name:'Två',keys:[{type:'system',id:'cancel'},...Array(31).fill(null)]}]}}}};
  const sd=createStreamDeck({pluppar:()=>[{id:'p1',kind:'main',label:'Au',node:null},{id:'p2',kind:'main',label:'Bu',node:null}],
    choose:(id,kind)=>chosen.push(id+':'+kind),clearChoice:()=>cleared++,api:(path,data)=>calls.push([path,data]),message:(text)=>messages.push(text),
    state:()=>({controls:{}}),online:()=>true,chosen:()=>null,trainMeet:()=>trainMeet,layout:()=>view,hid,library});
  t.after(()=>sd.detach(false));
  await tick();await tick();
  assert.deepEqual(sd.decks().map(d=>[d.serial,d.model,d.keys]),[['XL1','xl',32],['MK1','mk2',15]],'a serial is cleaned to what the server accepts');
  assert.deepEqual(posts.map(([url,body])=>[url,body.serial,body.model]),[['/api/streamdeck/seen','XL1','xl'],['/api/streamdeck/seen','MK1','mk2']]);
  assert.equal(new Set(xl.fills).size,32);assert.equal(new Set(mk.fills).size,15);
  // A turn key takes its train to the next step.
  await xl.press(0);
  assert.deepEqual(calls.pop(),['trainmeet/movement',{sessionId:'s1',revision:3,movementId:'t1',departure:'positioned'}]);
  // Never act on a train the operator did not see: the key moved on while it was held.
  trainMeet.context={...trainMeet.context,movements:[{id:'t1',departure:'departed'}]};
  await xl.press(0);
  assert.equal(calls.length,0);assert.match(messages.pop(),/bytte tåg/);
  sd.update();await tick();await xl.press(0);
  assert.deepEqual(calls.pop(),['trainmeet/movement',{sessionId:'s1',revision:3,movementId:'t2',departure:'positioned'}],'after a repaint the key shows and moves the next train');
  // A key that requires a hold does nothing on a short press.
  await xl.press(3,300);assert.equal(chosen.length,0);assert.match(messages.pop(),/Håll in Au i en sekund/);
  await xl.press(3,1200);assert.deepEqual(chosen,['p1:main']);
  await xl.press(2,200);assert.match(messages.pop(),/Håll in Återställ panel i en sekund/,'Återställ panel always needs a second');
  // Pages turn per deck.
  await xl.press(1);assert.equal(sd.decks()[0].page,1);assert.equal(sd.decks()[1].page,0);
  await xl.press(0);assert.equal(cleared,1,'page two of the XL has Avbryt val first');
  // The MK.2 has no saved layout and runs the automatic one; the editor can show a draft on it.
  await mk.press(0);assert.equal(sd.decks()[1].page,0,'the automatic layout fits on one page, so its page key stays');
  sd.preview('MK1',{model:'mk2',pages:[{name:'Utkast',keys:[{type:'system',id:'cancel'},...Array(14).fill(null)]}]});await tick();
  assert.equal(sd.previewing('MK1'),true);await mk.press(0);assert.equal(cleared,2);
  sd.preview('MK1',null);assert.equal(sd.previewing('MK1'),false);
  // Unplugging one deck leaves the other running.
  listeners.disconnect({device:xl.device});
  assert.deepEqual(sd.decks().map(d=>d.serial),['MK1']);
  await sd.detach(false);assert.equal(sd.decks().length,0);
  assert.equal(cleanSerial(' AL31-H2.B_05 '),'AL31-H2.B_05');assert.equal(cleanSerial('__x'),'x');assert.equal(cleanSerial(null),'');
});
