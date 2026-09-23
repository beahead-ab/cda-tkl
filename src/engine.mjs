import { EventEmitter } from 'node:events';
import { randomUUID, createHash } from 'node:crypto';
import { decode, hex, switchOrder } from './protocol.mjs';
import { RoutePolicy } from './route-policy.mjs';
import { OperatingControls } from './operating-controls.mjs';

export class Engine extends EventEmitter {
  constructor(profile, { send = () => {}, storage, now = Date.now } = {}) {
    super(); this.profile = profile; this.send = send; this.storage = storage; this.now = now;
    this.policy = profile.sourcePolicy ? new RoutePolicy({mainRoutePolicies:profile.sourcePolicy}) : null;
    this.fingerprint = createHash('sha256').update(JSON.stringify(profile)).digest('hex');
    this.connected = false; this.connectionAt = 0; this.storageFault = null; this.revision = 0; this.events = []; this.reportSequence=0;
    this.turnouts = Object.fromEntries(Object.keys(profile.turnouts).map(n => [n, { position: 'unknown', desired: null, updatedAt: 0 }]));
    this.blocks = Object.fromEntries(Object.keys(profile.blocks).map(n => [n, { occupied: null, updatedAt: 0 }]));
    this.signals = Object.fromEntries(Object.keys(profile.signals).map(n => [n, { aspect: 'unknown', code: null, desired: 'STOP', updatedAt: 0, commandAt: 0 }]));
    const saved = storage?.load('routes.json', { fingerprint: this.fingerprint, routes: [] });
    if (saved?.routes.length && saved.fingerprint !== this.fingerprint) throw Error('Profilen har ändrats medan lås finns kvar. Återställ profilen före start.');
    this.routes = (saved?.routes || []).map(r => ({ ...r, state: 'held', cancelRequested: false, reason: 'Återställd efter omstart. Kontrollera återrapporter och återta vägen.', nextSignal: -1 }));
    const controls=storage?.load('controls.json', {version:2,stopAll:false,blocked:[],mode:'local',emergency:null}) || {version:2,stopAll:false,blocked:[],mode:'local',emergency:null};
    if (![1,2,3].includes(controls.version) || typeof controls.stopAll !== 'boolean' || !Array.isArray(controls.blocked) || controls.blocked.some(n => !profile.blocks[n])) throw Error('Sparade manöverspärrar stämmer inte med profilen. Kontrollera före start.');
    this.controls=controls.version===1?{...controls,version:2,mode:'local',emergency:null}:controls;
    if(this.controls.version===2)this.controls={...this.controls,version:3,lines:[],programming:{reserved:false,desired:false}};
    if(!Array.isArray(this.controls.lines)||this.controls.lines.some(id=>!profile.operatingControls?.lines[id])||!this.controls.programming||typeof this.controls.programming.reserved!=='boolean'||typeof this.controls.programming.desired!=='boolean'||(this.controls.programming.desired&&!this.controls.programming.reserved)||(!profile.operatingControls?.programming&&this.controls.programming.reserved))throw Error('Sparade linje- eller programmeringsspärrar är ogiltiga för profilen.');
    if(this.controls.programming.reserved&&this.controls.programming.fingerprint!==this.fingerprint)throw Error('Profilen har ändrats medan programmeringsspärr finns kvar. Återställ profilen före start.');
    const emergency=this.controls.emergency;
    if(!['local','remote'].includes(this.controls.mode) || (emergency!==null && (!emergency || !Number.isFinite(emergency.requestedAt) || !Array.isArray(emergency.routeIds) || emergency.routeIds.some(id=>typeof id!=='string') || (emergency.completedAt!==null&&!Number.isFinite(emergency.completedAt))))) throw Error('Sparat manöverläge eller nödåtertagning är ogiltig. Kontrollera före start.');
    this.operating=new OperatingControls(this);
    this.log('startup', this.routes.length ? `${this.routes.length} tågvägslås återställda; inget körmedgivande återupptas.` : 'TKL startad. Väntar på återrapporter.');
  }
  log(kind, message, details) {
    const event = { id: ++this.revision, at: this.now(), kind, message, ...(details ? { details } : {}) };
    this.events.unshift(event); this.events.length = Math.min(this.events.length, 150);
    try { this.storage?.event(event); } catch (e) { this.storageFault = e.message; }
    this.emit('change');
  }
  persist() {
    try { this.storage?.save('routes.json', { fingerprint: this.fingerprint, routes: this.routes }); }
    catch (e) { this.storageFault = e.message; for (const name of Object.keys(this.signals)) this.permission(name, 'STOP'); throw Error('Kunde inte spara lås. Manövrering spärrad.'); }
  }
  connection(connected) {
    this.connected = connected; this.connectionAt = this.now();
    this.operating.connection();
    this.invalidate();
    for (const r of this.routes) { r.state = r.cancelRequested ? 'cancelling' : 'held'; r.reason = connected ? 'Återansluten. Inväntar nya återrapporter.' : 'Anslutningen bruten; låsen ligger kvar.'; }
    this.log(connected ? 'connected' : 'disconnected', connected ? 'LocoNet ansluten. Synkroniserar rapporter.' : 'LocoNet frånkopplad. Alla fälttillstånd är okända.');
    if (connected) for (const name of Object.keys(this.signals)) this.permission(name, 'STOP');
    this.persist();
  }
  invalidate() {
    for (const s of Object.values(this.turnouts)) { s.position = 'unknown'; s.updatedAt = 0; }
    for (const s of Object.values(this.blocks)) { s.occupied = null; s.updatedAt = 0; }
    for (const s of Object.values(this.signals)) { s.aspect = 'unknown'; s.desired = 'STOP'; s.code = null; s.updatedAt = 0; }
  }
  fresh(s) { return this.connected && s.updatedAt >= this.connectionAt && this.now() - s.updatedAt <= this.profile.staleMs && s.updatedAt > 0; }
  guardSignals(route) {
    if (route.guardSignals) return route.guardSignals;
    return [...new Set(this.profile.routes.filter(r => r.blocks.some(b => route.blocks.includes(b))).flatMap(r => r.signals))].filter(n => !route.signals.includes(n));
  }
  receive(bytes) {
    let d; try { d = decode(bytes); } catch (e) { this.log('bad-frame', e.message, { frame: hex(bytes) }); return; }
    // B0 echo and SENT OK are not field feedback.
    if (d.kind === 'order' || d.kind === 'unsupported') return;
    const now = this.now(); const sequence=++this.reportSequence; let changed = false;
    this.operating.receive(d,sequence);
    if (d.kind === 'turnout') for (const [name, binding] of Object.entries(this.profile.turnouts)) {
      if (binding.address !== d.address) continue;
      const pos = d.position === 'unknown' ? 'unknown' : binding.inverted ? (d.position === 'C' ? 'T' : 'C') : d.position;
      const state = this.turnouts[name]; changed ||= state.position !== pos;
      state.position = pos; state.updatedAt = now; state.reportSequence=sequence;
    }
    if (d.kind === 'sensor') for (const [name, binding] of Object.entries(this.profile.blocks)) {
      if (binding.address !== d.address) continue;
      const occupied = binding.activeMeansOccupied ? d.active : !d.active;
      const state = this.blocks[name]; changed ||= state.occupied !== occupied;
      state.occupied = occupied; state.updatedAt = now; state.reportSequence=sequence;
    }
    if (d.kind === 'signal') for (const [name, binding] of Object.entries(this.profile.signals)) {
      if (binding.reportAddress !== d.address) continue;
      const aspect = binding.stopCodes.includes(d.code) ? 'stop' : binding.goCodes.includes(d.code) ? 'go' : 'unknown';
      const state = this.signals[name]; changed ||= state.aspect !== aspect || state.code !== d.code;
      const unexpected = aspect === 'go' && state.desired === 'STOP';
      state.aspect = aspect; state.updatedAt = now; state.code = d.code; state.reportSequence=sequence;
      if (unexpected) for (const route of this.routes) {
        // A GO received before this route's permission must never be consumed
        // as its acknowledgement, even when both occur in one clock tick.
        if (route.signals.includes(name) && ['setting','establishing','clearing'].includes(route.state)) this.hold(route, `Signal ${name} rapporterade kör innan medgivande. Kontrollera och återta vägen.`);
      }
      if (unexpected && now - state.commandAt > 200) {
        this.log('unexpected-go', `Signal ${name} rapporterar kör utan medgivande. Begär stopp.`);
        this.permission(name, 'STOP');
      }
    }
    if(d.kind==='sensor') this.observePassage(d);
    if (changed) this.log('report', describe(d), { frame: hex(bytes) });
    this.tick(); this.emit('change');
  }
  permission(name, desired) {
    if (desired === 'GO' && (!this.connected || this.storageFault || this.controls.stopAll || this.controls.mode!=='local')) throw Error('Körmedgivande spärrat.');
    const s = this.signals[name]; s.desired = desired; s.commandAt = this.now(); s.commandSequence=this.reportSequence;
    if (this.connected) this.send(switchOrder(this.profile.signals[name].address, desired === 'GO' ? 'C' : 'T'));
    this.log('permission', `Signal ${name}: begär ${desired === 'GO' ? 'körmedgivande' : 'stopp'}.`);
  }
  turnoutOrder(name, position) {
    const b = this.profile.turnouts[name], s = this.turnouts[name];
    s.desired = position; s.commandAt = this.now(); s.commandSequence=this.reportSequence;s.position = 'unknown'; s.updatedAt = 0;
    const physical = b.inverted ? (position === 'C' ? 'T' : 'C') : position;
    this.send(switchOrder(b.address, physical));
    this.log('order', `${name}: begär ${position === 'C' ? 'rakt' : 'avvikande'}.`, { address: b.address });
  }
  request(from, to) {
    const existing = this.routes.find(r => r.from === from && r.to === to);
    if (existing) return this.cancel(existing.id);
    if (!this.connected || this.storageFault) throw Error(this.storageFault ? 'Lagringsfel; manövrering spärrad.' : 'Ingen LocoNet-anslutning.');
    if(this.controls.mode!=='local') throw Error('Fjärrläge: lokal tågvägsläggning är spärrad. Inget fjärrsystem är anslutet ännu.');
    if (this.controls.stopAll) throw Error('Alla signaler i stopp är aktiverat. Återställ AIS före ny tågväg.');
    if(this.policy) {const decision=this.policy.inspect(from,to); if(!decision.allowed) throw Error(decision.reason);}
    const def = this.profile.routes.find(r => r.from === from && r.to === to);
    if (!def) throw Error('Tågvägens fullständiga koppling är ännu inte verifierad i den aktiva profilen.');
    if(def.adminDisabled)throw Error('Tågvägen är avstängd i driftinställningarna.');
    const operatingReason=this.operating.routeReason(def);if(operatingReason)throw Error(operatingReason);
    const blocked = def.blocks.find(b => this.trackBlocked(b));
    if (blocked) throw Error(`${blocked} är administrativt spärrat.`);
    for (const b of def.blocks) if (!this.fresh(this.blocks[b]) || this.blocks[b].occupied !== false) throw Error(`${b} är belagt eller saknar aktuell återrapport.`);
    for (const name of [...def.signals, ...this.guardSignals(def)]) if (!this.fresh(this.signals[name]) || this.signals[name].aspect !== 'stop') throw Error(`Signal ${name} är inte bekräftat i stopp.`);
    for (const route of this.routes) {
      const occupiedResources = new Set(route.blocks.map(b => this.profile.blocks[b].address));
      const hit = def.blocks.find(b => occupiedResources.has(this.profile.blocks[b].address));
      if (hit || def.crossings.some(x => route.crossings.includes(x))) throw Error('Tågvägen korsar en reserverad väg. Ingen godkänd alternativ väg finns i denna profil.');
      if (def.signals.some(s => route.signals.includes(s))) throw Error('Signal används av en annan tågväg.');
      if (Object.entries(def.turnouts).some(([n, p]) => route.turnouts[n] && route.turnouts[n] !== p)) throw Error('En kopplad växel är låst i motsatt läge.');
    }
    const r = { ...structuredClone(def), definitionId: def.id, id: randomUUID(), state: 'setting', createdAt: this.now(), cancelRequested: false, nextSignal: def.signals.length - 1, reason: 'Inväntar växlarnas återrapporter.' };
    if(r.autoRelease) r.passage=[...new Set(r.blocks.map(b=>this.profile.blocks[b].address))].map(address=>({address,state:'pending'}));
    this.routes.push(r); this.persist(); // Locks are durable BEFORE any field commands.
    this.log('route-request', `${r.label}: resurser reserverade.`);
    for (const [n, p] of Object.entries(r.turnouts)) {
      const shared = this.routes.some(other => other.id !== r.id && other.turnouts[n] === p);
      if (!(shared && this.fresh(this.turnouts[n]) && this.turnouts[n].position === p)) this.turnoutOrder(n, p);
    }
    return r;
  }
  cancel(id) {
    const r = this.routes.find(r => r.id === id); if (!r) throw Error('Tågvägen finns inte.');
    if (!r.cancelRequested) {
      r.cancelRequested = true; r.cancelAt = this.now(); r.cancelSequence=this.reportSequence; r.state = 'cancelling'; r.reason = 'Begärt stopp. Inväntar fria avsnitt och stoppåterrapport.';
      this.persist();
      for (const n of r.signals) this.permission(n, 'STOP');
      this.log('cancel', `${r.label}: återtagning begärd. Låsen ligger kvar tills villkoren är uppfyllda.`);
    }
    this.tick(); return r;
  }
  manual(name, position) {
    if (!this.profile.turnouts[name] || !['C', 'T'].includes(position)) throw Error('Okänd växel eller manöver.');
    const condition=this.manualStatus(name); if(!condition.allowed) throw Error(condition.reason);
    for (const n of condition.names) this.turnoutOrder(n, position);
  }
  manualStatus(name) {
    const refuse=reason=>({allowed:false,reason});
    if(!this.profile.turnouts[name]) return refuse('Okänd växel.');
    const names=this.profile.coupled?.[name]||[name];
    if(names.some(n=>this.profile.manualDisabled?.includes(n)))return refuse('Direktmanövern är avstängd i driftinställningarna.');
    const programReason=this.operating.manualReason(names,this.profile.manualPolicies?.byTurnout[name]?.blocks);if(programReason)return refuse(programReason);
    if(!this.connected||this.storageFault||this.controls.stopAll) return refuse('Manövrering spärrad: anslutning, lagring eller AIS.');
    if(this.controls.mode!=='local') return refuse('Fjärrläge: lokal växelmanöver är spärrad.');
    if(this.routes.some(r=>names.some(n=>r.turnouts[n]))) return refuse(`${name} är låst av tågväg — manöver vägras.`);
    const policy=this.profile.manualPolicies?.byTurnout[name];
    if(this.profile.manualPolicies) {
      if(policy?.status!=='ready') return refuse(policy?.reason||'Ingen manöverregel är ansluten.');
      const addresses=new Set(policy.blocks.map(n=>this.profile.blocks[n].address));
      if(this.routes.some(r=>r.blocks.some(n=>addresses.has(this.profile.blocks[n].address)) || r.nxIds?.some(id=>policy.inactiveNX.includes(id)))) return refuse('En skyddande tågväg eller ett berört spåravsnitt är fortfarande låst.');
      for(const n of policy.blocks) {
        if(this.trackBlocked(n)) return refuse(`${n} är administrativt spärrat.`);
        if(!this.fresh(this.blocks[n])||this.blocks[n].occupied!==false) return refuse(`${n} är belagt eller saknar aktuell återrapport.`);
      }
      for(const n of policy.signals) if(!this.fresh(this.signals[n])||this.signals[n].aspect!=='stop'||this.signals[n].desired!=='STOP') return refuse(`Skyddande signal ${n} är inte bekräftat i stopp.`);
      for(const n of names) if(!this.fresh(this.turnouts[n])||this.turnouts[n].position==='unknown') return refuse(`${n} saknar aktuellt växelläge eller håller på att läggas om.`);
      return {allowed:true,names,rule:policy.rule,reason:'Lokala spårledningar fria, skyddande signaler i stopp och inga berörda tågvägslås.'};
    }
    // The small legacy test profile retains its conservative commissioning rule.
    if(names.some(n=>this.trackBlocked(this.profile.turnouts[n].block))) return refuse('Växelns spårledning är administrativt spärrad.');
    if(Object.values(this.blocks).some(s=>!this.fresh(s)||s.occupied!==false)||Object.values(this.signals).some(s=>!this.fresh(s)||s.aspect!=='stop')) return refuse('Provområdet måste vara fritt med bekräftat stopp före manuell omläggning.');
    return {allowed:true,names,reason:'Provområdet fritt och stopp.'};
  }
  trackBlocked(name) {
    const address = this.profile.blocks[name]?.address;
    return address != null && this.controls.blocked.some(n => this.profile.blocks[n].address === address);
  }
  persistControls() {
    try { this.storage?.save('controls.json', this.controls); }
    catch (e) { this.storageFault = e.message; for (const n of Object.keys(this.signals)) this.permission(n, 'STOP'); throw Error('Kunde inte spara manöverspärr. All manövrering spärrad.'); }
  }
  blockTrack(name, blocked) {
    if (!this.profile.blocks[name] || typeof blocked !== 'boolean') throw Error('Okänd spårledning eller spärrmanöver.');
    if (this.storageFault) throw Error('Lagringsfel; manövrering spärrad.');
    if(!blocked && this.controls.mode!=='local') throw Error('Återgå till lokal manövrering innan en spårspärr tas bort.');
    const address = this.profile.blocks[name].address;
    this.controls.blocked = this.controls.blocked.filter(n => this.profile.blocks[n].address !== address);
    if (blocked) this.controls.blocked.push(name);
    this.persistControls();
    if (blocked) for (const route of this.routes) if (route.blocks.some(n => this.profile.blocks[n].address === address)) this.hold(route, `${name} har spärrats av operatören.`);
    this.log('track-block', `${name}: administrativ spärr ${blocked ? 'lagd' : 'borttagen'}. Detektorns återrapport är oförändrad.`);
  }
  allStop(enabled) {
    if (typeof enabled !== 'boolean') throw Error('Ogiltig AIS-manöver.');
    if (!enabled) {
      const condition=this.allStopResetStatus();if(!condition.allowed) throw Error(condition.reason);
      this.controls.stopAll = false; this.persistControls();
      this.log('all-stop', 'AIS återställd. Tidigare tågvägar behåller sina lås och återupptas inte.'); return;
    }
    this.controls.stopAll = true;
    try {
      this.persistControls();
      for (const route of this.routes) this.hold(route, 'Alla signaler i stopp begärt av operatören.');
    } finally { for (const name of Object.keys(this.signals)) this.permission(name, 'STOP'); }
    this.log('all-stop', 'Alla signaler i stopp begärt. Tågvägslås behålls.');
  }
  allStopResetStatus() {
    if(this.emergencyRemaining().length) return {allowed:false,reason:'Nödåtertagning pågår. Kvarvarande tågvägslås måste frigivas innan AIS återställs.'};
    if(this.storageFault||!this.connected||Object.values(this.signals).some(s=>!this.fresh(s)||s.aspect!=='stop'||s.desired!=='STOP'||s.reportSequence<=(s.commandSequence??-1))) return {allowed:false,reason:'Alla signaler måste återrapportera stopp innan AIS kan återställas.'};
    return {allowed:true,reason:'Alla signaler har aktuella stoppbesked. Återställning återupptar inga tågvägar.'};
  }
  emergencyRemaining() {
    return this.controls.emergency ? this.routes.filter(r=>this.controls.emergency.routeIds.includes(r.id)) : [];
  }
  emergencyCancelAll() {
    const now=this.now(), routeIds=this.routes.map(r=>r.id);
    this.controls.stopAll=true;
    this.controls.emergency={requestedAt:now,routeIds,completedAt:routeIds.length?null:now};
    try {
      this.persistControls();
      // Reserve the complete cancellation intent durably before STOP orders.
      for(const route of this.routes) {
        route.cancelRequested=true;route.cancelAt=now;route.cancelSequence=this.reportSequence;
        route.state='cancelling';route.nextSignal=-1;
        route.reason='Nödåtertagning begärd. Lås kvar tills spåren är fria och stopp har återrapporterats.';
      }
      this.persist();
    } finally { for(const name of Object.keys(this.signals)) this.permission(name,'STOP'); }
    this.log('emergency',`Nödåtertagning begärd för ${routeIds.length} tågvägar. AIS kvarstår; inga lås tvångsfrigivs.`);
    this.tick();
  }
  modeStatus() {
    if(this.controls.programming.reserved)return {allowed:false,reason:'Återgå till bekräftad normaldrift innan manöverläge byts.'};
    if(this.storageFault||!this.connected) return {allowed:false,reason:'Lägesbyte kräver fungerande anslutning och lagring.'};
    if(this.routes.length) return {allowed:false,reason:'Återta alla tågvägslås före byte mellan lokal- och fjärrläge.'};
    if(Object.values(this.signals).some(s=>!this.fresh(s)||s.aspect!=='stop'||s.desired!=='STOP'||s.reportSequence<=(s.commandSequence??-1))) return {allowed:false,reason:'Alla signaler måste ha aktuella stoppbesked före lägesbyte.'};
    if(Object.values(this.turnouts).some(s=>!this.fresh(s)||s.position==='unknown'||(s.desired&&s.position!==s.desired))) return {allowed:false,reason:'Invänta aktuella växellägen och pågående omläggningar före lägesbyte.'};
    return {allowed:true,reason:'Inga tågvägslås finns och anläggningen har aktuella stopp- och växelbesked.'};
  }
  setMode(mode) {
    if(!['local','remote'].includes(mode)) throw Error('Okänt manöverläge.');
    if(mode===this.controls.mode) return;
    const condition=this.modeStatus();if(!condition.allowed) throw Error(condition.reason);
    const previous=this.controls.mode;this.controls.mode=mode;
    try {this.persistControls();} catch(e) {this.controls.mode=previous;throw e;}
    this.log('control-mode',mode==='local'?'Lokal manövrering vald. Inga tidigare medgivanden återupptas.':'Fjärrläge valt. Lokal tågvägsläggning och växelmanöver spärrade. Fjärrsystem är ännu inte anslutet.');
  }
  hold(r, reason, state = 'held') {
    r.state = state; r.reason = reason; r.nextSignal = -1;
    for (const name of r.signals) this.permission(name, 'STOP'); this.persist();
    this.log('route-held', `${r.label}: ${reason} Låsen ligger kvar.`);
  }
  observePassage(report) {
    for(const r of this.routes) {
      if(!r.autoRelease || r.cancelRequested || ['held','occupied','cancelling'].includes(r.state)) continue;
      const index=r.passage.findIndex(p=>p.address===report.address);
      if(index<0) continue;
      const part=r.passage[index], name=r.blocks.find(b=>this.profile.blocks[b].address===report.address);
      const occupied=this.profile.blocks[name].activeMeansOccupied?report.active:!report.active;
      if(occupied && part.state==='pending') {
        const canEnter=r.state==='active' || r.state==='traversing' || (r.state==='clearing' && r.nextSignal<=0 && this.signals[r.signals[0]].aspect==='go');
        if(!canEnter || r.passage.slice(0,index).some(p=>p.state==='pending')) {this.hold(r,'Beläggning kom utanför den förväntade tågpassagen.');continue;}
        part.state='occupied'; part.enteredAt=this.now();
        if(r.state!=='traversing') {
          r.state='traversing';r.enteredAt=this.now();r.nextSignal=-1;r.reason='Tåg i tågvägen. Passerade signaler återtas; låsen ligger kvar under passagen.';
          this.log('train-entered',`${r.label}: ordnad tågpassage påbörjad.`);
        }
        const passed = r.signalEntries ? r.signalEntries.filter(e => e.index <= index).map(e => e.signal) : r.signals;
        for (const name of passed) if (this.signals[name].desired !== 'STOP') this.permission(name, 'STOP');
        this.persist();
      } else if(!occupied && part.state==='occupied') {
        if(r.passage.slice(0,index).some(p=>p.state!=='clear')) {this.hold(r,'Spårledningar blev fria i oväntad ordning.');continue;}
        part.state='clear';part.clearedAt=this.now();this.persist();
      } else if(occupied && part.state==='clear') this.hold(r,'Ett passerat avsnitt blev belagt igen.');
    }
  }
  tick() {
    const now = this.now();
    this.operating.tick();
    for (const s of Object.values(this.turnouts)) if (!this.fresh(s)) s.position = 'unknown';
    for (const s of Object.values(this.blocks)) if (!this.fresh(s)) s.occupied = null;
    for (const s of Object.values(this.signals)) if (!this.fresh(s)) s.aspect = 'unknown';
    for (const r of [...this.routes]) {
      const free = r.blocks.every(b => this.fresh(this.blocks[b]) && this.blocks[b].occupied === false);
      const known = Object.keys(r.turnouts).every(n => this.fresh(this.turnouts[n]) && this.turnouts[n].position !== 'unknown' && this.turnouts[n].updatedAt >= (this.turnouts[n].commandAt || 0));
      const correct = known && Object.entries(r.turnouts).every(([n, p]) => this.turnouts[n].position === p);
      const protectedSignals = this.guardSignals(r).every(n => this.fresh(this.signals[n]) && this.signals[n].aspect === 'stop');
      if (r.cancelRequested) {
        const stopped = r.signals.every(n => this.fresh(this.signals[n]) && this.signals[n].aspect === 'stop' && this.signals[n].updatedAt >= r.cancelAt && this.signals[n].reportSequence > (r.cancelSequence ?? -1));
        if (free && known && stopped && protectedSignals && !this.storageFault) {
          const previous = this.routes; this.routes = this.routes.filter(x => x.id !== r.id);
          try { this.persist(); } catch (e) { this.routes = previous; throw e; }
          this.log('released', `${r.label}: stopp bekräftat, vägen fri, lås frigivna.`);
        }
        continue;
      }
      if (['held', 'occupied'].includes(r.state)) continue;
      const operatingReason=this.operating.routeReason(r);if(operatingReason){this.hold(r,operatingReason);continue;}
      if(r.state==='traversing') {
        if(!this.connected || this.storageFault || !correct || !protectedSignals || r.blocks.some(b=>!this.fresh(this.blocks[b]))) {this.hold(r,'Återrapport eller skyddsvillkor saknas under tågpassage.');continue;}
        const lostSignal = r.signals.some(n => {
          const s = this.signals[n];
          if (s.desired === 'GO') return !this.fresh(s) || s.aspect !== 'go';
          return (!this.fresh(s) || s.aspect !== 'stop') && now-s.commandAt > this.profile.commandTimeoutMs;
        });
        if(lostSignal) {this.hold(r,'Signalbesked under tågpassagen stämmer inte med medgivandet.');continue;}
        if(free && r.passage.every(p=>p.state==='clear')) this.cancel(r.id);
        continue;
      }
      if (!protectedSignals && this.connected) { this.hold(r, 'En annan signal till samma provområde saknar bekräftat stopp.'); continue; }
      if (this.storageFault || !this.connected || !free) {
        this.hold(r, this.storageFault ? 'Lagringsfel.' : !this.connected ? 'Ingen anslutning.' : 'Beläggning eller okänd detektor.', free ? 'held' : 'occupied'); continue;
      }
      if (r.state === 'setting') {
        if (correct) { r.state = 'establishing'; r.establishedAt = now; r.reason = 'Växellägen bekräftade. Tågvägen etableras.'; this.persist(); this.log('established', `${r.label}: växlarna återrapporterar rätt läge.`); }
        else if (now - r.createdAt > this.profile.commandTimeoutMs) this.hold(r, 'Växelåterrapport uteblev eller visar fel läge.');
        continue;
      }
      if (!correct) { this.hold(r, 'Växelläge ändrat eller återrapport för gammal.'); continue; }
      if (r.state === 'establishing') {
        if (now - r.establishedAt < 1200) continue; // presentation dwell; field checks above remain authoritative
        r.state = 'clearing'; r.reason = 'Signalerna klarsätts bakifrån.'; r.signalSentAt = 0;
      }
      if (r.state === 'clearing') {
        if (r.signals.slice(r.nextSignal + 1).some(n => !this.fresh(this.signals[n]) || this.signals[n].aspect !== 'go')) {
          this.hold(r, 'En redan klarsatt signal har återgått till stopp eller tappat återrapport.'); continue;
        }
        if (r.nextSignal < 0) { r.state = 'active'; r.reason = 'Tågväg klar. Körbesked återrapporterat.'; this.persist(); this.log('route-active', `${r.label}: körbesked återrapporterat.`); continue; }
        const name = r.signals[r.nextSignal], s = this.signals[name];
        if (!r.signalSentAt) { this.permission(name, 'GO'); r.signalSentAt = now; this.persist(); }
        else if (this.fresh(s) && s.desired === 'GO' && s.aspect === 'go' && s.reportSequence > s.commandSequence && s.updatedAt >= r.signalSentAt && now - r.signalSentAt >= this.profile.signalStepMs) {
          r.nextSignal--; r.signalSentAt = 0;
        } else if (now - r.signalSentAt > this.profile.commandTimeoutMs) this.hold(r, `Signal ${name} har inte rapporterat kör.`);
      }
      if (r.state === 'active' && r.signals.some(n => !this.fresh(this.signals[n]) || this.signals[n].aspect !== 'go')) this.hold(r, 'Körbesked saknas eller har återkallats av fältutrustningen.');
    }
    if(this.controls.emergency && this.controls.emergency.completedAt===null && !this.emergencyRemaining().length && !this.storageFault) {
      this.controls.emergency.completedAt=now;this.persistControls();
      this.log('emergency-complete','Nödåtertagningen är färdig. Alla berörda lås har frigivits efter återrapport. AIS kvarstår tills operatören återställer.');
    }
    this.emit('change');
  }
  snapshot() {
    return { serverTime: this.now(), revision: this.revision, connection: this.connected ? 'connected' : 'disconnected', storageFault: this.storageFault,
      profile: { id: this.profile.id, title: this.profile.title, commissioned: this.profile.commissioned, description: this.profile.description },
      turnouts: this.turnouts, blocks: this.blocks, signals: this.signals, routes: this.routes, controls:this.controls, events: this.events,
      operating:this.operating.snapshot(),
      manual:Object.fromEntries(Object.keys(this.turnouts).map(n=>[n,this.manualStatus(n)])),
      modeChange:this.modeStatus(),allStopReset:this.allStopResetStatus(),emergencyRemaining:this.emergencyRemaining().map(r=>r.id),
      catalog: this.profile.routes.map(r => ({ id: r.id, from: r.from, to: r.to, label: r.label })) };
  }
}
function describe(d) {
  if (d.kind === 'sensor') return `Sensor ${d.address}: ${d.active ? 'aktiv' : 'inaktiv'}.`;
  if (d.kind === 'turnout') return `Växelrapport ${d.address}: ${d.position}.`;
  return `Signalrapport ${d.address}: kod ${d.code}.`;
}
