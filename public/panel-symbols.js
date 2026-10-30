import {attribute,text} from './panel-rendering.js';

const MAIN=new Set(['hsi_2','hsi_4','hsi_5','hsi_7']);
const COMBINED=new Set(['hsi_3+dvsi','hdvsi_5','hdvsi_8']);
export function modernSignalKind(type){return MAIN.has(type)?'main':COMBINED.has(type)?'combined':type==='dvsi_4'?'dwarf':null;}
// Källans signalbild pekar uppåt före rotation. Samma rotationskonvention används av båda vyerna.
export function signalRotation(degrees){return Number.isFinite(degrees)?degrees-90:null;}
export function modernSignalView({type,signal,connected,connectionAt=0,configured=true,routes=[],name}){
  const kind=modernSignalKind(type);
  const reported=!!(configured&&connected&&signal?.updatedAt>0&&signal.updatedAt>=connectionAt);
  const aspect=reported&&['go','stop'].includes(signal.aspect)?signal.aspect:'unknown';
  const cancelling=routes.some(r=>r.signals?.includes(name)&&r.state==='cancelling');
  const endpoint=routes.some(r=>(r.guardSignals||[]).includes(name));
  // Tvålägesåterrapporten kan inte skilja huvud-/dvärgbesked eller Sh1/Sh2/Sh3.
  // Visa därför inte ett påhittat grönt delbesked. Det samlade körbeskedet beskrivs i text.
  const partial=aspect==='go'&&(kind==='combined'||kind==='dwarf');
  const tone=aspect==='unknown'||partial?'unknown':aspect==='go'?'go':cancelling?'releasing':endpoint?'endpoint':'stop';
  const description=aspect==='unknown'?'Okänt signalbesked':partial?'Kör återrapporterat · exakt dvärgbesked saknas':aspect==='go'?'Kör återrapporterat':cancelling?'Stopp återrapporterat · återtagning pågår':endpoint?'Stopp återrapporterat · skyddar låst tågväg':'Stopp återrapporterat';
  return {kind,aspect,tone,uncertain:aspect==='unknown'||partial,description};
}
export function createModernSignal({parent,type,degrees,scale=1,label,make}){
  const kind=modernSignalKind(type),rotation=signalRotation(degrees);
  // Okända typer och stopplyktor behåller originalbilden, även i den moderna vyn.
  if(!kind||rotation===null)return null;
  parent.classList.add('has-modern-signal');
  const size=Number.isFinite(scale)&&scale>0?scale:1;
  const g=make('g',{class:'modern-signal','aria-hidden':'true'},parent);
  const shape=make('g',{transform:`rotate(${rotation}) scale(${size})`},g);
  make('rect',{x:kind==='combined'?-16:-10,y:-10,width:kind==='combined'?32:20,height:20,class:'modern-signal-back'},shape);
  if(kind==='dwarf'||kind==='combined')make('path',{d:kind==='combined'?'M-13 -7L-5 0L-13 7':'M-5 -7L3 0L-5 7',class:'modern-signal-mark'},shape);
  if(kind!=='dwarf')make('path',{d:kind==='combined'?'M0 -7L9 0L0 7Z':'M-6 -7L6 0L-6 7Z',class:'modern-signal-mark'},shape);
  const question=make('text',{x:kind==='combined'?19:12,y:4,class:'modern-signal-question'},g,'?');
  const title=make('title',{},g,label);
  return {update(view){attribute(g,'data-tone',view.tone);attribute(question,'display',view.uncertain?'':'none');text(title,label+' · '+view.description);}};
}
