import {EventEmitter} from 'node:events';
import {randomUUID} from 'node:crypto';
import {readTimetable} from './trainmeet-timetable.mjs';
const fail=(message,status=400)=>{throw Object.assign(Error(message),{status});};
const text=(v,max=200)=>typeof v==='string'&&v.length<=max&&!/[\u0000-\u001f]/.test(v);
const record=v=>v&&typeof v==='object'&&!Array.isArray(v);
const identity=(v)=>text(v,128)&&v.length>0;
const validClientId=v=>typeof v==='string'&&/^[A-Za-z0-9._:-]{3,64}$/.test(v);
function serverOrigin(value) {
  if(value==='')return '';
  if(!text(value,512))fail('Ange en giltig TrainMeet-adress.');
  let u;try{u=new URL(value.trim());}catch{fail('Ange hela serveradressen, till exempel https://trainmeet.example.');}
  if(u.username||u.password||u.pathname!=='/'||u.search||u.hash||u.protocol!=='https:'&&!(u.protocol==='http:'&&['127.0.0.1','localhost','[::1]'].includes(u.hostname)))fail('TrainMeet kräver HTTPS eller en lokal tunneladress.');
  return u.origin;
}

const LINE_STATES=new Set(['free','requested','reserved','occupied']);
export const CLEARANCE_ACTIONS=['request','accept','reject','cancel','depart','arrive'];
const CLEARANCE_JOURNAL={request:'begärd',accept:'godkänd',reject:'nekad',cancel:'återtagen',depart:'avgång anmäld',arrive:'mottaget anmält'};
// The clearance steps this station may take for a line, mirroring the server's
// transitions so the panel offers only sensible buttons. The server decides.
export function lineActions(state,direction){
  if(state==='free')return ['request'];
  if(state==='requested')return direction==='out'?['cancel']:direction==='in'?['accept','reject']:[];
  if(state==='reserved')return direction==='out'?['depart','cancel']:[];
  if(state==='occupied')return direction==='in'?['arrive']:[];
  return [];
}
const optional=(v,max)=>v==null?'':text(String(v),max)?String(v):fail('Ogiltigt trafikpass från TrainMeet.',502);
function readShift(value){
  if(value==null)return null;
  if(!record(value)||!identity(value.shift_id)||!text(value.operator_name,80)||!value.operator_name.trim())fail('Ogiltigt trafikpass från TrainMeet.',502);
  return {id:value.shift_id,operatorName:value.operator_name,terminalName:optional(value.terminal_name,80),status:optional(value.status,40),startedAt:optional(value.started_at,64),endedAt:optional(value.ended_at,64),note:optional(value.handover_note,1000)};
}
// Lines of this station: static catalogue from the display joined with the
// live state from the station context. Unknown or missing states stay unknown.
function readLines(display,context,station,names){
  const catalogue=display.connections??[];
  if(!Array.isArray(catalogue)||catalogue.length>5000)fail('Ogiltig sträckkatalog från TrainMeet.',502);
  const live=new Map();
  for(const c of context.connection_states){
    const from=c.from_station_id==null?'':c.from_station_id,to=c.to_station_id==null?'':c.to_station_id;
    if(!text(from,128)||!text(to,128))fail('Ogiltigt förbindelseläge.',502);
    live.set(c.id,{state:LINE_STATES.has(c.state)?c.state:'unknown',from,to,trainNumber:text(c.train_number)?c.train_number:''});
  }
  return catalogue.filter(c=>record(c)&&(c.station_a_id===station||c.station_b_id===station)).map(c=>{
    if(!identity(c.id)||!identity(c.station_a_id)||!identity(c.station_b_id))fail('Ogiltig sträcka från TrainMeet.',502);
    const neighborId=c.station_a_id===station?c.station_b_id:c.station_a_id,s=live.get(c.id);
    const state=s?s.state:'unknown',direction=!s||state==='free'?'':s.from===station?'out':s.to===station?'in':'';
    return {id:c.id,neighborId,neighborName:names.get(neighborId)||neighborId,trackType:text(c.track_type,32)?c.track_type:'',state,direction,from:s?.from||'',to:s?.to||'',trainNumber:s?.trainNumber||'',actions:lineActions(state,direction)};
  });
}

// HTTP-v1 adapter for the reviewed TrainMeet contract: it reads the station
// context and acts as a TKL terminal for shifts and clearances, the same station
// commands a TMBox uses. It deliberately has no reference to Engine, Field or
// detector state: a clearance is never a route, a lock or a signal aspect.
export class TrainMeet extends EventEmitter {
  constructor({storage,origin='',fetcher=fetch,now=Date.now}) {
    super();this.storage=storage;this.fetcher=fetcher;this.now=now;this.sessionId=randomUUID();this.revision=0;this.busy=false;this.current=null;this.lastAttempt=0;this.context=null;this.status='unconfigured';this.error='';this.updatedAt=0;
    this.origin=serverOrigin(origin);this.originLocked=!!origin;
    this.data=storage.load('trainmeet.json',{version:1,clientId:'cda-tkl',stationId:'',token:'',origin:this.origin,autoShift:{enabled:false,operatorName:''}});
    this.autoShiftAt=0;this.autoShiftError='';const auto=this.data.autoShift??{enabled:false,operatorName:''};
    if(!record(auto)||typeof auto.enabled!=='boolean'||!text(auto.operatorName,80))throw Error('Ogiltig sparad TrainMeet-anslutning.');this.data={...this.data,autoShift:{enabled:auto.enabled,operatorName:auto.operatorName}};
    if(this.data.version!==1||!validClientId(this.data.clientId)||!text(this.data.stationId,128)||!text(this.data.token,4096)||!text(this.data.origin,512))throw Error('Ogiltig sparad TrainMeet-anslutning.');
    if(this.origin&&this.data.token&&this.data.origin!==this.origin)throw Error('TrainMeet-adressen har ändrats. Flytta inte en gammal parkopplingsnyckel till en annan server.');
    if(!this.origin)this.origin=serverOrigin(this.data.origin);
    if(this.origin)this.status=this.data.token?'disconnected':'unpaired';
  }
  view(){return {sessionId:this.sessionId,revision:this.revision,origin:this.origin,originLocked:this.originLocked,clientId:this.data.clientId,status:this.status,busy:this.busy,paired:!!this.data.token,stationId:this.data.stationId,error:this.error,updatedAt:this.updatedAt,stale:this.status!=='connected'||this.now()-this.updatedAt>15000,contract:'TrainMeet HTTP v1 · TKL-terminal',autoShift:{enabled:this.data.autoShift.enabled,operatorName:this.data.autoShift.operatorName,error:this.autoShiftError},context:this.context};}
  check(data){if(data.sessionId!==this.sessionId||data.revision!==this.revision)fail('TrainMeet-anslutningen har ändrats. Läs in senaste läget.',409);if(this.busy)fail('En TrainMeet-begäran pågår.',409);}
  configure(data){
    this.check(data);
    if(this.data.token)fail('Koppla från TrainMeet innan anslutningen ändras.',409);
    const origin=serverOrigin(data.origin);
    if(this.originLocked&&origin!==this.origin)fail('Den här installationen använder en fast TrainMeet-adress.',409);
    const clientId=data.clientId===undefined?this.data.clientId:typeof data.clientId==='string'?data.clientId.trim():data.clientId;
    if(!validClientId(clientId))fail('TKL-id ska ha 3–64 tecken: bokstäver a–z, siffror, punkt, bindestreck, understreck eller kolon.');
    const next={...this.data,origin,clientId,stationId:'',token:''};
    try{this.storage.save('trainmeet.json',next);}catch{fail('Anslutningen kunde inte sparas. Den tidigare inställningen är kvar.',507);}
    this.data=next;this.origin=origin;this.context=null;this.updatedAt=0;this.status=origin?'unpaired':'unconfigured';this.error='';this.revision++;this.emit('change');return this.view();
  }
  async request(path,{token='',payload}={}) {
    if(!this.origin)fail('TrainMeet-server är inte angiven för den här installationen.');
    const response=await this.fetcher(this.origin+path,{method:payload?'POST':'GET',headers:{Accept:'application/json',...(token?{Authorization:'Bearer '+token}:{}),...(payload?{'Content-Type':'application/json'}:{})},body:payload?JSON.stringify(payload):undefined,redirect:'error',signal:AbortSignal.timeout(8000)});
    if(Number(response.headers.get('content-length'))>2000000)fail('TrainMeet-svaret är för stort.',502);
    let total=0,chunks=[];for await(const part of response.body){total+=part.length;if(total>2000000)fail('TrainMeet-svaret är för stort.',502);chunks.push(part);}
    const raw=Buffer.concat(chunks).toString();
    if(!response.ok){
      if(response.status===401)fail('Parkoppling eller stationsbehörighet saknas hos TrainMeet.',502);
      // The server explains refused actions in plain language; pass that on
      // unchanged, but never a body that is not a short JSON message.
      let detail='';try{const body=JSON.parse(raw);if(record(body)&&text(body.message,300)&&body.message.trim())detail=body.message;}catch{}
      if(detail&&response.status<500)fail(detail,409);
      fail(response.status===403?'Parkoppling eller stationsbehörighet saknas hos TrainMeet.':'TrainMeet svarade med fel '+response.status+'.',502);
    }
    return JSON.parse(raw);
  }
  async read(token=this.data.token,station=this.data.stationId,allowReset=false,reloadTimetable=false) {
    const context=await this.request('/v1/tkl/context?station_id='+encodeURIComponent(station),{token});
    const display=await this.request('/v1/display',{token});
    if(context?.protocol_version!==1||display?.protocol_version!==1||!identity(context.publication_id)||context.publication_id!==display.publication_id||!identity(context.active_day)||context.active_day!==display.active_day||context.station?.id!==station||!record(context.movements)||!Array.isArray(context.connection_states)||!Array.isArray(display.trains)||!Number.isSafeInteger(display.revision)||display.revision<0)fail('TrainMeet-svaret följer inte det granskade kontraktet.',502);
    if(!allowReset&&this.context?.publicationId===display.publication_id&&this.context.day===display.active_day&&display.revision<this.context.revision)fail('TrainMeet skickade en äldre revision. Kontrollera serverbytet och parkoppla på nytt.',502);
    const stations=display.stations??[];
    if(!Array.isArray(stations)||stations.length>5000||stations.some(s=>!record(s)||!identity(s.id)||!text(s.name,200)||!s.name.trim())||new Set(stations.map(s=>s.id)).size!==stations.length)fail('Ogiltig stationskatalog från TrainMeet.',502);
    const clock=display.clock;
    if(!record(clock)||typeof clock.configured!=='boolean'||typeof clock.running!=='boolean'||!/^([01]\d|2[0-3]):[0-5]\d:[0-5]\d$/.test(clock.time)||!Number.isFinite(clock.speed)||clock.speed<=0||clock.speed>1000)fail('TrainMeet-klockan kunde inte verifieras.',502);
    const trains=display.trains.filter(t=>t.station_id===station).map(t=>{if(!identity(t.id))fail('Tågrörelse saknar identitet.',502);const result={id:t.id};for(const k of ['train_number','arrival_time','departure_time','track','train_type','arrival_from','departure_to','track_id'])if(t[k]!=null){const value=String(t[k]);if(!text(value))fail('Ogiltig tåginformation.',502);result[k]=value;}return result;});
    if(new Set(trains.map(t=>t.id)).size!==trains.length)fail('TrainMeet skickade dubbla rörelseidentiteter.',502);
    const movements=Object.entries(context.movements).map(([id,m])=>{if(!identity(id)||!record(m)||!Number.isSafeInteger(m.revision)||m.revision<0)fail('Driftpost saknar identitet eller revision.',502);return {id,revision:m.revision,arrival:text(m.arrival)?m.arrival:'',departure:text(m.departure)?m.departure:'',track:text(m.actualTrack)?m.actualTrack:'',crewReady:m.crewReady===true,note:text(m.operatorNote)?m.operatorNote:''};});
    if(!allowReset&&this.context?.publicationId===display.publication_id&&this.context.day===display.active_day)for(const m of movements){const previous=this.context.movements.find(p=>p.id===m.id);if(previous&&m.revision<previous.revision)fail('TrainMeet skickade en äldre driftrevision. Kontrollera serverbytet.',502);}
    const connections=context.connection_states.map(c=>{if(!identity(c.id)||!text(c.state))fail('Ogiltigt förbindelseläge.',502);return {id:c.id,state:c.state,trainNumber:text(c.train_number)?c.train_number:''};});
    const lines=readLines(display,context,station,new Map(stations.map(s=>[s.id,s.name])));
    const shift=readShift(context.shift),previousShift=readShift(context.previous_shift);
    // Publications are immutable. Refresh dynamic data every poll and reload the
    // timetable on publication/day/station changes or an explicit refresh.
    const previous=this.context;
    const cached=!allowReset&&!reloadTimetable&&previous?.timetable&&previous.publicationId===display.publication_id&&previous.day===display.active_day&&previous.station.id===station;
    const timetable=cached?{trains:previous.trains,tracks:previous.tracks,operatingPoints:previous.operatingPoints,timetable:previous.timetable}
      :readTimetable(await this.request('/v1/timetable?station_id='+encodeURIComponent(station),{token}),{stationId:station,publicationId:display.publication_id,day:display.active_day,loadedAt:this.now()});
    return {stations:stations.map(s=>({id:s.id,name:s.name})),publicationId:display.publication_id,revision:display.revision,day:display.active_day,meet:text(display.meet?.name)?display.meet.name:'',station:{id:station,name:text(context.station.name)?context.station.name:station},clock:{time:clock.time,rate:clock.speed,running:clock.running,configured:clock.configured},...timetable,movements,connections,lines,shift,previousShift};
  }
  // One TrainMeet exchange at a time, so a poll and an action never interleave
  // their writes to the last good context.
  async exclusive(work){
    while(this.busy){if(!this.current)fail('En TrainMeet-begäran pågår.',409);await this.current.catch(()=>{});}
    this.busy=true;this.emit('change');
    this.current=(async()=>{try{return await work();}finally{this.busy=false;this.current=null;this.emit('change');}})();
    return this.current;
  }
  async pair(data) {
    this.check(data);if(!identity(data.stationId)||!text(data.code,128)||!data.code.trim())fail('Ange stations-id och giltig anslutningskod.');
    await this.exclusive(async()=>{
      try {
        const response=await this.request('/v1/pair',{payload:{pairing_code:data.code,client_id:this.data.clientId,display_name:this.data.clientId,device_kind:'tkl_terminal'}});
        if(response?.protocol_version!==1||response.client_id!==this.data.clientId||!text(response.access_token,4096)||!response.access_token)fail('TrainMeet lämnade ingen giltig parkopplingsnyckel.',502);
        const context=await this.read(response.access_token,data.stationId,true);
        const next={version:1,clientId:this.data.clientId,stationId:data.stationId,token:response.access_token,origin:this.origin,autoShift:this.data.autoShift};
        this.storage.save('trainmeet.json',next);this.data=next;this.context=context;this.status='connected';this.updatedAt=this.now();this.error='';this.revision++;
      }catch(e){this.status=this.data.token?'disconnected':'unpaired';this.error=e.status?e.message:'TrainMeet kunde inte anslutas. Kontrollera adress, kod och server.';throw Object.assign(Error(this.error),{status:502});}
    });
    return this.view();
  }
  async refresh(data) {
    if(data)this.check(data);if(this.busy||!this.origin||!this.data.token)return this.view();this.lastAttempt=this.now();
    await this.exclusive(async()=>{
      try{const next=await this.read(this.data.token,this.data.stationId,false,!!data);this.context=next;this.updatedAt=this.now();this.status='connected';this.error='';}
      catch(e){this.status='disconnected';this.error=e.status?e.message:'TrainMeet svarar inte. Senaste uppgifter visas som gamla.';}
    });
    // TMBox mode: a box is simply in service while it is assigned. Keep a shift
    // active the same way, one attempt per minute at most, never taking over.
    if(this.status==='connected'&&this.data.autoShift.enabled&&this.context&&!this.context.shift&&this.now()>=this.autoShiftAt)await this.autoStart();
    return this.view();
  }
  async autoStart(){
    this.autoShiftAt=this.now()+60000;
    try{await this.startShift({sessionId:this.sessionId,revision:this.revision,operatorName:this.data.autoShift.operatorName,auto:true});this.autoShiftError='';}
    catch(e){this.autoShiftError=e.message;}
    this.emit('change');
  }
  setAutoShift(data){
    if(!record(data)||data.sessionId!==this.sessionId||data.revision!==this.revision)fail('TrainMeet-anslutningen har ändrats. Läs in senaste läget.',409);
    const enabled=data.enabled===true,operatorName=typeof data.operatorName==='string'?data.operatorName.trim():this.data.autoShift.operatorName;
    if(enabled&&(!operatorName||!text(operatorName,80)))fail('Ange operatörens namn, högst 80 tecken.');
    if(!text(operatorName,80))fail('Ange operatörens namn, högst 80 tecken.');
    const next={...this.data,autoShift:{enabled,operatorName}};
    try{this.storage.save('trainmeet.json',next);}catch{fail('Inställningen kunde inte sparas. Den tidigare inställningen är kvar.',507);}
    this.data=next;this.autoShiftAt=0;this.autoShiftError='';this.revision++;this.emit('change');return this.view();
  }
  // A station command: post it, then read the authoritative context back before
  // answering, whether the server accepted it or not. The panel never applies an
  // action locally; it shows what TrainMeet says happened.
  async command(data,build){
    if(!record(data))fail('Ogiltig TrainMeet-begäran.');
    if(data.sessionId!==this.sessionId||data.revision!==this.revision)fail('TrainMeet-anslutningen har ändrats. Läs in senaste läget.',409);
    if(!this.origin||!this.data.token)fail('Parkoppla med TrainMeet innan stationen manövreras.',409);
    return this.exclusive(async()=>{
      // Validate against the freshest context, after any poll in flight has finished.
      const {path,payload,journal}=build(this.context||{});
      let failure=null;
      try{await this.request(path,{token:this.data.token,payload});}
      catch(e){failure=e.status?e:Object.assign(Error('TrainMeet kunde inte nås. Åtgärden är inte utförd.'),{status:502});}
      try{this.context=await this.read(this.data.token,this.data.stationId);this.updatedAt=this.now();this.status='connected';this.error='';}
      catch(e){this.status='disconnected';this.error=e.status?e.message:'TrainMeet svarar inte. Senaste uppgifter visas som gamla.';}
      if(failure)throw failure;
      if(journal)this.emit('journal',journal);
      return this.view();
    });
  }
  async startShift(data){
    const operatorName=typeof data?.operatorName==='string'?data.operatorName.trim():'';
    if(!operatorName||!text(operatorName,80))fail('Ange operatörens namn, högst 80 tecken.');
    return this.command(data,()=>({path:'/v1/tkl/shift/start',payload:{station_id:this.data.stationId,operator_name:operatorName,terminal_name:this.data.clientId,take_over:data.takeOver===true},journal:`Trafikpass ${data.takeOver===true?'övertaget':data.auto===true?'startat automatiskt (TMBox-läge)':'startat'} av ${operatorName} hos TrainMeet.`}));
  }
  async finishShift(data){
    const status=data?.status,note=data?.note==null?'':data.note;
    if(!['closed','handover'].includes(status))fail('Välj Avsluta eller Lämna över.');
    if(typeof note!=='string'||!text(note,1000))fail('Överlämningsanteckningen får ha högst 1000 tecken.');
    return this.command(data,context=>{if(!context.shift)fail('Inget trafikpass är aktivt.',409);return {path:'/v1/tkl/shift/finish',payload:{station_id:this.data.stationId,shift_id:context.shift.id,status,note:note.trim()},journal:status==='closed'?'Trafikpasset avslutat hos TrainMeet.':'Trafikpasset överlämnat hos TrainMeet.'};});
  }
  async clearance(data){
    const action=data?.action,trainNumber=typeof data?.trainNumber==='string'?data.trainNumber.trim():'';
    if(!CLEARANCE_ACTIONS.includes(action))fail('Okänd klareringsåtgärd.');
    if(action==='request'&&!/^\d{1,10}$/.test(trainNumber))fail('Ange tågnumret med siffror.');
    return this.command(data,context=>{
      const line=(context.lines||[]).find(l=>l.id===data.connectionId);
      if(!line)fail('Sträckan hör inte till stationen.',409);
      if(!context.shift)fail('Starta trafikpasset innan en klarering hanteras.',409);
      const number=action==='request'?trainNumber:line.trainNumber;
      return {path:'/v1/tkl/clearance',payload:{station_id:this.data.stationId,connection_id:line.id,action,train_number:action==='request'?trainNumber:''},journal:`Klarering ${CLEARANCE_JOURNAL[action]}${number?' · tåg '+number:''} · ${line.neighborName}.`};
    });
  }
  // Movement declarations, the TMBox steps for one train: uppställt, förare på
  // plats, närmar sig, ankommit and an actual track. Unchanged fields are sent
  // with their current values so neither server path resets them.
  async movement(data){
    const movementId=typeof data?.movementId==='string'?data.movementId:'';
    const departure=data?.departure==null?'':data.departure,arrival=data?.arrival==null?'':data.arrival,track=data?.actualTrack==null?'':data.actualTrack;
    if(!identity(movementId))fail('Ange vilken tågrörelse som avses.');
    if(departure&&!['positioned','ready','departed'].includes(departure))fail('Okänt avgångsläge.');
    if(arrival&&!['approaching','arrived'].includes(arrival))fail('Okänt ankomstläge.');
    if(typeof track!=='string'||!text(track,40))fail('Ogiltig spårbeteckning.');
    if(!departure&&!arrival&&!track.trim())fail('Ingen ändring angiven.');
    return this.command(data,context=>{
      const train=(context.trains||[]).find(t=>t.id===movementId);
      if(!train)fail('Tågrörelsen finns inte på stationen i dag.',409);
      if(!context.shift)fail('Starta trafikpasset innan tågrörelser hanteras.',409);
      const current=(context.movements||[]).find(m=>m.id===movementId)||{};
      const payload={station_id:this.data.stationId,movement_id:movementId,departure:departure||current.departure||'none',arrival:arrival||current.arrival||'none',event_type:'tkl_'+(departure||arrival||'track_changed')};
      const actualTrack=track.trim()||current.track||train.track_id||'';if(actualTrack)payload.actual_track=actualTrack;
      const what=departure==='positioned'?'uppställt':departure==='ready'?'förare på plats':departure==='departed'?'avgått':arrival==='approaching'?'närmar sig':arrival==='arrived'?'ankommit':'spår '+track.trim();
      return {path:'/v1/tkl/movement',payload,journal:`Tåg ${train.train_number}: ${what} anmält hos TrainMeet.`};
    });
  }
  disconnect(data){this.check(data);const next={...this.data,token:'',stationId:'',origin:this.origin};this.storage.save('trainmeet.json',next);this.data=next;this.context=null;this.updatedAt=0;this.status=this.origin?'unpaired':'unconfigured';this.error='';this.revision++;this.emit('change');return this.view();}
  tick(){if(this.origin&&this.data.token&&!this.busy&&this.now()-this.lastAttempt>=5000)this.refresh();}
}
