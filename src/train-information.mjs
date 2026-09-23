import { randomUUID } from 'node:crypto';
const copy=structuredClone;
const record=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const fail=(message,status=400)=>{throw Object.assign(Error(message),{status});};
const validValue=value=>typeof value==='string'&&value.length<=24&&/^[\p{L}\p{N} ._/-]*$/u.test(value);

// Information only. This store has no path to turnout orders, signal permission,
// reservation release or the simulator's internal train model.
export class TrainInformation {
  constructor(catalog,profile,{storage,now=Date.now,sessionId=randomUUID()}={}) {
    this.storage=storage;this.now=now;this.sessionId=sessionId;this.sourceHash=catalog.sourceHash;
    this.fields=catalog.fields.filter(f=>f.kind==='incoming'||profile.blocks[f.name]);
    this.objects=new Map(this.fields.map(f=>[f.key,f]));
    this.anchors=catalog.anchors.filter(a=>this.objects.has(a.key));
    this.observed=new Map();this.epochs={};
    this.data=storage.load('train-information.json',{schema:1,sourceHash:this.sourceHash,revision:0,entries:{},history:[]});
    const d=this.data;
    if(d.schema!==1||d.sourceHash!==this.sourceHash||!Number.isSafeInteger(d.revision)||d.revision<0||!record(d.entries)||!Array.isArray(d.history)||d.history.length>200) throw Error('Sparad tåginformation är ogiltig eller hör till annat källunderlag. Kontrollera före start.');
    for(const [key,e] of Object.entries(d.entries)) if(!this.objects.has(key)||!record(e)||!validValue(e.value)||!e.value.trim()||e.source!=='manual'||!Number.isFinite(e.updatedAt)||typeof e.sessionId!=='string'||!Number.isSafeInteger(e.epoch)||e.epoch<0) throw Error('Sparad tågidentitet är ogiltig: '+key);
    for(const e of d.history) if(!record(e)||!['assign','confirm','clear','move'].includes(e.kind)||!Number.isFinite(e.at)||!Number.isSafeInteger(e.revision)||e.revision<1||e.revision>d.revision||e.source!=='manual'||!validValue(e.before)||!validValue(e.after)||(e.kind==='move'?[e.from,e.to]:[e.key]).some(key=>!this.objects.has(key))) throw Error('Sparad tågnummershistorik är ogiltig.');
  }
  catalog(){return {sourceHash:this.sourceHash,fields:copy(this.fields),anchors:copy(this.anchors)};}
  observe(blocks,connected) {
    for(const f of this.fields.filter(f=>f.kind==='block')) {
      const next=connected?blocks[f.name]?.occupied??null:null;
      if(this.observed.get(f.key)!==next) {this.epochs[f.key]=(this.epochs[f.key]||0)+1;this.observed.set(f.key,next);}
    }
  }
  snapshot() {
    const entries={};
    for(const [key,e] of Object.entries(this.data.entries)) entries[key]={...e,
      needsReview:e.sessionId!==this.sessionId||e.epoch!==(this.epochs[key]||0)||(this.objects.get(key).kind==='block'&&this.observed.get(key)==null),
      duplicate:Object.entries(this.data.entries).some(([other,v])=>other!==key&&v.value===e.value)};
    return {sessionId:this.sessionId,revision:this.data.revision,entries,epochs:{...this.epochs},history:copy(this.data.history.slice(-12).reverse())};
  }
  check({revision,sessionId},keys,epochs) {
    if(revision!==this.data.revision||sessionId!==this.sessionId) fail('Tåginformationen har ändrats eller servern har startat om. Läs in senaste uppgifter före ny ändring.',409);
    if(keys.some(key=>!this.objects.has(key))) fail('Okänt informationsfält.');
    if(!record(epochs)||keys.some(key=>epochs[key]!==(this.epochs[key]||0))) fail('Beläggningen har ändrats under redigeringen. Läs in och kontrollera platsen igen.',409);
  }
  entry(value,key){return {value,source:'manual',updatedAt:this.now(),sessionId:this.sessionId,epoch:this.epochs[key]||0};}
  commit(next,event) {
    next.revision=this.data.revision+1;
    next.history.push({...event,at:this.now(),revision:next.revision,source:'manual'});
    next.history=next.history.slice(-200);
    this.storage.save('train-information.json',next);this.data=next;
    return this.snapshot();
  }
  save({revision,sessionId,key,value,epochs,...extra}) {
    if(Object.keys(extra).length||!validValue(value)) fail('Ange högst 24 tecken: bokstäver, siffror, blanksteg, punkt, bindestreck, snedstreck eller understreck.');
    this.check({revision,sessionId},[key],epochs);value=value.trim();
    const next=copy(this.data),before=next.entries[key]?.value||'';
    if(value) next.entries[key]=this.entry(value,key);else delete next.entries[key];
    return this.commit(next,{kind:before===value?'confirm':value?'assign':'clear',key,before,after:value});
  }
  move({revision,sessionId,from,to,epochs,...extra}) {
    if(Object.keys(extra).length||from===to) fail('Välj två olika informationsfält.');
    this.check({revision,sessionId},[from,to],epochs);
    const value=this.data.entries[from]?.value;
    if(!value) fail('Startfältet saknar tågnummer.');
    if(this.data.entries[to]) fail('Målfältet har redan ett tågnummer. Kontrollera det före flytt.',409);
    const next=copy(this.data);delete next.entries[from];next.entries[to]=this.entry(value,to);
    return this.commit(next,{kind:'move',from,to,before:value,after:value});
  }
}
