// Stream Deck as a keyboard for the panel over WebHID. A key press does exactly
// what a click on the plupp does, through the same choose() and the same API
// calls, so locks, modes and refusals apply unchanged. Key images are drawn
// from the pluppar's own classes each paint. Nothing here talks to the field.
import sd from './vendor/elgato-stream-deck-webhid.js';
import {buildPages,pluppSpec,systemSpec,signature,COLORS} from './stream-deck-layout.js';
const STORAGE='charlottendal-streamdeck';
export function createStreamDeck({pluppar,choose,clearChoice,api,message,state,online,chosen}){
  const $=id=>document.getElementById(id),statusNode=$('streamdeck-status'),connectButton=$('streamdeck-connect'),disconnectButton=$('streamdeck-disconnect');
  const supported=typeof navigator!=='undefined'&&!!navigator.hid&&window.isSecureContext;
  let deck=null,controls=[],size=72,pages=[[]],page=0,shown=new Map(),downAt=new Map(),blinkOn=false,timer=null,rendering=false,again=false;
  const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d');
  function status(text){if(statusNode)statusNode.textContent=text;if(connectButton)connectButton.hidden=!!deck;if(disconnectButton)disconnectButton.hidden=!deck;}
  if(!supported){status('WebHID saknas här. Använd Chrome, Edge eller Chromium på en säker adress (https eller localhost).');if(connectButton)connectButton.disabled=true;}
  else status('Ej ansluten.');
  async function connect(prompt){
    if(!supported)return false;
    try{
      const list=prompt?await sd.requestStreamDecks():await sd.getStreamDecks();
      if(!list.length){if(prompt)message('Ingen Stream Deck valdes.');return false;}
      await attach(list[0]);for(const extra of list.slice(1))extra.close().catch(()=>{});return true;
    }catch(e){message('Stream Deck kunde inte öppnas: '+(e?.message||e));status('Ej ansluten.');return false;}
  }
  async function attach(device){
    deck=device;controls=deck.CONTROLS.filter(c=>c.type==='button'&&c.feedbackType==='lcd');
    if(!controls.length){message('Den här Stream Deck-modellen saknar bildknappar.');await detach(false);return;}
    size=controls[0].pixelSize?.width||72;canvas.width=canvas.height=size;
    deck.on('error',e=>{message('Stream Deck: '+(e?.message||e));});
    deck.on('down',c=>{if(c.type==='button')downAt.set(c.index,performance.now());});
    deck.on('up',c=>{if(c.type==='button')press(c.index,performance.now()-(downAt.get(c.index)||performance.now()));});
    await deck.clearPanel();await deck.setBrightness(80);
    page=0;shown=new Map();try{localStorage.setItem(STORAGE,'auto');}catch{}
    if(!timer)timer=setInterval(()=>{blinkOn=!blinkOn;if([...shown.values()].some(s=>s.blink))update();},600);
    update(true);
  }
  async function detach(forget=true){
    const d=deck;deck=null;controls=[];shown=new Map();if(timer){clearInterval(timer);timer=null;}
    if(forget){try{localStorage.removeItem(STORAGE);}catch{}}
    if(d){try{await d.clearPanel();}catch{}try{await d.close();}catch{}}
    status('Ej ansluten.');
  }
  if(supported)navigator.hid.addEventListener('disconnect',()=>{if(deck){deck=null;controls=[];shown=new Map();if(timer){clearInterval(timer);timer=null;}status('Stream Deck frånkopplad. Anslut den igen så återupptas visningen.');}});
  function keys(){const list=pluppar();if(!pages.length||pages.flat().filter(k=>k.type==='plupp').length!==list.length)pages=buildPages(list,controls.length);return pages;}
  function press(index,held){
    if(!deck)return;const key=keys()[page]?.[index];if(!key)return;
    if(key.type==='plupp')return choose(key.id,key.kind);
    const s=state();
    switch(key.id){
      case 'page':page=(page+1)%keys().length;update(true);return;
      case 'all-stop':return api('all-stop',{enabled:true});
      case 'reset-ais':if(s?.controls?.stopAll)return api('all-stop',{enabled:false});return message('Alla signaler i stopp är inte aktiv.');
      case 'cancel':return clearChoice();
      case 'panel-reset':if(held>=1000)return $('panel-reset')?.click();return message('Håll in knappen i en sekund för Återställ panel.',{error:false});
    }
  }
  function draw(spec){
    const s=size,c=ctx;c.clearRect(0,0,s,s);
    c.fillStyle=spec.kind==='system'&&spec.fill?spec.fill:COLORS.background;c.fillRect(0,0,s,s);
    const alpha=spec.dim?0.38:1;c.globalAlpha=alpha;
    if(spec.kind==='plupp'){
      const r=s*0.17,cx=s/2,cy=s*0.30;
      if(spec.ring){c.beginPath();c.arc(cx,cy,r+s*0.07,0,Math.PI*2);c.strokeStyle=spec.ring;c.lineWidth=Math.max(2,s*0.04);c.stroke();}
      c.beginPath();c.arc(cx,cy,r,0,Math.PI*2);c.fillStyle=spec.blink&&!blinkOn?COLORS.background:spec.blink?COLORS.preparing:spec.fill;c.fill();
      c.strokeStyle=spec.blink?COLORS.preparing:spec.fill;c.lineWidth=Math.max(1.5,s*0.025);c.stroke();
      if(spec.blocked){c.fillStyle=COLORS.held;c.fillRect(0,0,s,Math.max(3,s*0.05));}
    }
    const dark=spec.kind==='system'&&spec.fill;c.fillStyle=dark?'#1a1414':COLORS.text;c.textAlign='center';c.textBaseline='middle';
    const lines=spec.lines,big=spec.kind==='plupp'?s*0.2:s*0.17,top=spec.kind==='plupp'?s*0.62:s*0.42;
    c.font=`600 ${big}px -apple-system, "Helvetica Neue", Arial, sans-serif`;
    lines.forEach((line,i)=>{let text=line;while(c.measureText(text).width>s-6&&text.length>3)text=text.slice(0,-2)+'…';c.fillText(text,s/2,top+i*big*1.15);});
    if(spec.caption){c.font=`${s*0.13}px -apple-system, "Helvetica Neue", Arial, sans-serif`;c.fillStyle=dark?'#1a1414':COLORS.muted;c.fillText(spec.caption,s/2,s*0.9);}
    c.globalAlpha=1;
  }
  async function update(force=false){
    if(!deck)return;if(rendering){again=true;return;}rendering=true;
    try{
      const current=keys();if(page>=current.length)page=0;
      const s=state(),context={stopAll:!!s?.controls?.stopAll,chosen:!!chosen(),page,pages:current.length,remote:s?.controls?.mode==='remote'};
      const nodes=new Map(pluppar().map(p=>[p.id,p.node]));
      for(const control of controls){
        const key=current[page][control.index];
        const spec=!key?{kind:'empty',lines:[],dim:true,blink:false}:key.type==='plupp'?pluppSpec(key,new Set(nodes.get(key.id)?.classList||[]),nodes.get(key.id)?.dataset.routePhase||''):systemSpec(key,context);
        if(!online()&&spec.kind!=='empty')spec.dim=true;
        const sig=signature(spec,blinkOn);
        if(!force&&shown.get(control.index)?.sig===sig)continue;
        draw(spec);await deck.fillKeyCanvas(control.index,canvas);shown.set(control.index,{sig,blink:spec.blink});
      }
      status(`${deck.PRODUCT_NAME} · ${controls.length} knappar · sida ${page+1} av ${current.length}`);
    }catch(e){message('Stream Deck kunde inte uppdateras: '+(e?.message||e));}
    finally{rendering=false;if(again){again=false;update();}}
  }
  if(connectButton)connectButton.onclick=()=>connect(true);
  if(disconnectButton)disconnectButton.onclick=()=>detach(true);
  let auto=false;try{auto=localStorage.getItem(STORAGE)==='auto';}catch{}
  if(auto&&supported)connect(false);
  return {update:()=>update(false),connect,detach};
}
