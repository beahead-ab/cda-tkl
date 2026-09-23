import {EventEmitter} from 'node:events';
import {randomUUID} from 'node:crypto';
const fail=(message,status=400)=>{throw Object.assign(Error(message),{status});};
const text=(v,max=200)=>typeof v==='string'&&v.length<=max&&!/[\u0000-\u001f]/.test(v);
const record=v=>v&&typeof v==='object'&&!Array.isArray(v);
const identity=(v)=>text(v,128)&&v.length>0;

// Read-only HTTP-v1 adapter for the locally reviewed TrainMeet contract.
// It deliberately has no reference to Engine, Field or detector state.
export class TrainMeet extends EventEmitter {
  constructor({storage,origin='',fetcher=fetch,now=Date.now}) {
    super();this.storage=storage;this.fetcher=fetcher;this.now=now;this.sessionId=randomUUID();this.revision=0;this.busy=false;this.lastAttempt=0;this.context=null;this.status='unconfigured';this.error='';this.updatedAt=0;
    if(origin){const u=new URL(origin);if(u.username||u.password||u.pathname!=='/'||u.search||u.hash||u.protocol!=='https:'&&!(u.protocol==='http:'&&['127.0.0.1','localhost','[::1]'].includes(u.hostname)))throw Error('TrainMeet kräver HTTPS eller en lokal tunneladress.');this.origin=u.origin;}else this.origin='';
    this.data=storage.load('trainmeet.json',{version:1,clientId:'cda-tkl-'+randomUUID(),stationId:'',token:'',origin:this.origin});
    if(this.data.version!==1||!identity(this.data.clientId)||!text(this.data.stationId,128)||!text(this.data.token,4096)||!text(this.data.origin,512))throw Error('Ogiltig sparad TrainMeet-anslutning.');
    if(this.origin&&this.data.token&&this.data.origin!==this.origin)throw Error('TrainMeet-adressen har ändrats. Flytta inte en gammal parkopplingsnyckel till en annan server.');
    if(this.origin)this.status=this.data.token?'disconnected':'unpaired';
  }
  view(){return {sessionId:this.sessionId,revision:this.revision,origin:this.origin,status:this.status,busy:this.busy,paired:!!this.data.token,stationId:this.data.stationId,error:this.error,updatedAt:this.updatedAt,stale:this.status!=='connected'||this.now()-this.updatedAt>15000,contract:'TrainMeet HTTP v1 · läsande',context:this.context};}
  check(data){if(data.sessionId!==this.sessionId||data.revision!==this.revision)fail('TrainMeet-anslutningen har ändrats. Läs in senaste läget.',409);if(this.busy)fail('En TrainMeet-begäran pågår.',409);}
  async request(path,{token='',payload}={}) {
    if(!this.origin)fail('TrainMeet-server är inte angiven för den här installationen.');
    const response=await this.fetcher(this.origin+path,{method:payload?'POST':'GET',headers:{Accept:'application/json',...(token?{Authorization:'Bearer '+token}:{}),...(payload?{'Content-Type':'application/json'}:{})},body:payload?JSON.stringify(payload):undefined,redirect:'error',signal:AbortSignal.timeout(8000)});
    if(!response.ok)fail(response.status===401||response.status===403?'Parkoppling eller stationsbehörighet saknas hos TrainMeet.':'TrainMeet svarade med fel '+response.status+'.',502);
    if(Number(response.headers.get('content-length'))>2000000)fail('TrainMeet-svaret är för stort.',502);
    let total=0,chunks=[];for await(const part of response.body){total+=part.length;if(total>2000000)fail('TrainMeet-svaret är för stort.',502);chunks.push(part);}
    return JSON.parse(Buffer.concat(chunks).toString());
  }
  async read(token=this.data.token,station=this.data.stationId,allowReset=false) {
    const context=await this.request('/v1/tkl/context?station_id='+encodeURIComponent(station),{token});
    const display=await this.request('/v1/display',{token});
    if(context?.protocol_version!==1||display?.protocol_version!==1||!identity(context.publication_id)||context.publication_id!==display.publication_id||!identity(context.active_day)||context.active_day!==display.active_day||context.station?.id!==station||!Number.isSafeInteger(display.revision)||display.revision<0||!Array.isArray(display.trains)||display.trains.length>5000||!record(context.movements)||Object.keys(context.movements).length>5000||!Array.isArray(context.connection_states))fail('TrainMeet-svaret matchar inte det granskade stationskontraktet.',502);
    if(!allowReset&&this.context?.publicationId===display.publication_id&&this.context.day===display.active_day&&display.revision<this.context.revision)fail('TrainMeet skickade en äldre revision. Kontrollera serverbytet och parkoppla på nytt.',502);
    const clock=display.clock;
    if(!record(clock)||typeof clock.configured!=='boolean'||typeof clock.running!=='boolean'||!/^([01]\d|2[0-3]):[0-5]\d:[0-5]\d$/.test(clock.time)||!Number.isFinite(clock.speed)||clock.speed<=0||clock.speed>1000)fail('TrainMeet-klockan kunde inte verifieras.',502);
    const trains=display.trains.filter(t=>t.station_id===station).map(t=>{if(!identity(t.id))fail('Tågrörelse saknar identitet.',502);const result={id:t.id};for(const k of ['train_number','arrival_time','departure_time','track','train_type','arrival_from','departure_to','track_id'])if(t[k]!=null){const value=String(t[k]);if(!text(value))fail('Ogiltig tåginformation.',502);result[k]=value;}return result;});
    if(new Set(trains.map(t=>t.id)).size!==trains.length)fail('TrainMeet skickade dubbla rörelseidentiteter.',502);
    const movements=Object.entries(context.movements).map(([id,m])=>{if(!identity(id)||!record(m)||!Number.isSafeInteger(m.revision)||m.revision<0)fail('Driftpost saknar identitet eller revision.',502);return {id,revision:m.revision,arrival:text(m.arrival)?m.arrival:'',departure:text(m.departure)?m.departure:'',track:text(m.actualTrack)?m.actualTrack:''};});
    if(!allowReset&&this.context?.publicationId===display.publication_id&&this.context.day===display.active_day)for(const m of movements){const previous=this.context.movements.find(p=>p.id===m.id);if(previous&&m.revision<previous.revision)fail('TrainMeet skickade en äldre tågrörelse.',502);}
    const connections=context.connection_states.map(c=>{if(!identity(c.id)||!text(c.state))fail('Ogiltigt förbindelseläge.',502);return {id:c.id,state:c.state,trainNumber:text(c.train_number)?c.train_number:''};});
    return {publicationId:display.publication_id,revision:display.revision,day:display.active_day,meet:text(display.meet?.name)?display.meet.name:'',station:{id:station,name:text(context.station.name)?context.station.name:station},clock:{time:clock.time,rate:clock.speed,running:clock.running,configured:clock.configured},trains,movements,connections};
  }
  async pair(data) {
    this.check(data);if(!identity(data.stationId)||!text(data.code,128)||!data.code.trim())fail('Ange stations-id och giltig anslutningskod.');
    this.busy=true;this.emit('change');
    try {
      const response=await this.request('/v1/pair',{payload:{pairing_code:data.code,client_id:this.data.clientId,display_name:'Charlottendal TKL',device_kind:'tkl_terminal'}});
      if(response?.protocol_version!==1||response.client_id!==this.data.clientId||!text(response.access_token,4096)||!response.access_token)fail('TrainMeet lämnade ingen giltig parkopplingsnyckel.',502);
      const context=await this.read(response.access_token,data.stationId,true);
      const next={version:1,clientId:this.data.clientId,stationId:data.stationId,token:response.access_token,origin:this.origin};
      this.storage.save('trainmeet.json',next);this.data=next;this.context=context;this.status='connected';this.updatedAt=this.now();this.error='';this.revision++;
    }catch(e){this.status=this.data.token?'disconnected':'unpaired';this.error=e.status?e.message:'TrainMeet kunde inte anslutas. Kontrollera adress, kod och server.';throw Object.assign(Error(this.error),{status:502});}
    finally{this.busy=false;this.emit('change');}
    return this.view();
  }
  async refresh(data) {
    if(data)this.check(data);if(this.busy||!this.origin||!this.data.token)return this.view();this.busy=true;this.lastAttempt=this.now();
    try{const next=await this.read();this.context=next;this.updatedAt=this.now();this.status='connected';this.error='';}
    catch(e){this.status='disconnected';this.error=e.status?e.message:'TrainMeet svarar inte. Senaste uppgifter visas som gamla.';}
    finally{this.busy=false;this.emit('change');}return this.view();
  }
  disconnect(data){this.check(data);const next={...this.data,token:'',stationId:'',origin:this.origin};this.storage.save('trainmeet.json',next);this.data=next;this.context=null;this.updatedAt=0;this.status=this.origin?'unpaired':'unconfigured';this.error='';this.revision++;this.emit('change');return this.view();}
  tick(){if(this.origin&&this.data.token&&!this.busy&&this.now()-this.lastAttempt>=5000)this.refresh();}
}
