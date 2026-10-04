// Studio: Konfigurera (stationsplanen), Data (alla mängder med korsfilter) och Genomgång (avvikelserna). Bara läsning.
import {buildStudioModel,SETS,TABS,relationsFor,rowsFor,columnsFor,cellsFor,walkOrder,parseHash,planGeometry,setOf,SHAPE_LABEL} from './studio-model.js';
import {createPlan} from './studio-plan.js';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const $=(s,r=document)=>r.querySelector(s);
const mono=s=>`<span class="mono">${esc(s)}</span>`;
const pill=(t,k='',dashed=false)=>`<span class="st-pill${k?' st-pill-'+k:''}${dashed?' st-pill-dashed':''}">${esc(t)}</span>`;
const kv=rows=>`<dl class="st-kv">${rows.map(([k,v])=>`<div><dt>${esc(k)}</dt><dd>${v}</dd></div>`).join('')}</dl>`;
const card=(title,body,{right='',foot='',id=''}={})=>`<section class="st-card"${id?` id="${id}"`:''}><div class="st-card-head"><h2>${title}</h2><span class="st-grow"></span>${right}</div>${body}${foot?`<div class="st-card-foot">${foot}</div>`:''}</section>`;
const NAV={
  konfigurera:[['Stationsplan','#konfigurera'],['Signaler','#data?set=signaler','66'],['Växlar','#data?set=vaxlar','49'],['Spårledningar','#data?set=sparledningar','197'],['Regler','#konfigurera/regler','53'],['Övriga delar',null,'steg 6'],['Prova i simulatorn',null,'steg 4']],
  data:[['Alla mängder','#data'],['Tågvägar','#data?set=tagvagar','340']],
  genomgang:[['Avvikelser och genomgång','#genomgang']],
  driftsattning:[['Mät objekt',null,'steg 5'],['Lyssna','/#advanced/protocol','i dag'],['Kort och MGP',null,'steg 5'],['Ändringar och aktivering','/#register/bindings','i dag']],
  anslutning:[['TrainMeet','/#trainmeet','i dag'],['Stream Deck','/#tools/streamdeck','i dag']]};
const state={tab:'konfigurera',view:'',sets:new Set(['vaxlar','signaler','sparledningar','tagvagar']),object:null,layers:new Set(['numbers','signalNames','labels','dev']),width:2600,search:{}};
let model,geo,plan,order;
const session={load(){try{return JSON.parse(sessionStorage.getItem('studio-state')||'{}');}catch{return {};}},save(){try{sessionStorage.setItem('studio-state',JSON.stringify({sets:[...state.sets],object:state.object,layers:[...state.layers],width:state.width}));}catch{}}};

async function load(){
  const get=u=>fetch(u).then(r=>{if(!r.ok)throw Error(`${u}: ${r.status}`);return r.json();});
  const [profile,studio,panel]=await Promise.all([get('/api/config'),get('/api/studio'),get('/data/panel.json')]);
  model=buildStudioModel({profile,panel,studio});order=walkOrder(panel);
  const undetected=new Set([...studio.detection.undetected.noSensor,...studio.detection.undetected.noRule]);
  geo=planGeometry(panel,undetected);
  $('#st-mode').textContent=profile.commissioned?'DRIFT':'SIMULERING · ingen hårdvara';
  const saved=session.load(),link=parseHash(location.hash);
  state.tab=link.tab;state.view=link.view;if(link.sets.length)state.sets=new Set(link.sets);else if(saved.sets)state.sets=new Set(saved.sets);
  state.object=link.object&&model.objects.has(link.object)?link.object:(saved.object&&model.objects.has(saved.object)?saved.object:null);
  if(saved.layers)state.layers=new Set(saved.layers);if(saved.width)state.width=saved.width;
  render();
}
function go(tab){state.tab=tab;state.view='';history.replaceState(null,'',`#${tab}`);render();}
function select(id,{center=true}={}){if(!model.objects.has(id))return;state.object=id;session.save();if(state.tab==='konfigurera'){plan?.select(id,{center});renderObjectCard();}else render();}
function render(){
  $('#st-tabs').innerHTML=TABS.map(t=>`<a href="#${t.id}"${t.id===state.tab?' aria-current="page"':''}>${t.label}</a>`).join('');
  const here='#'+state.tab+(state.view?'/'+state.view:'')+(state.tab==='data'&&state.sets.size===1?'?set='+[...state.sets][0]:'');
  $('#st-nav').innerHTML=`<span class="st-nav-title">${esc(TABS.find(t=>t.id===state.tab).label.toUpperCase())}</span>`+NAV[state.tab].map(([label,href,count])=>{
    if(!href)return `<span class="st-nav-item" title="Kommer i ett senare steg">${esc(label)}<span class="st-count">${esc(count||'')}</span></span>`;
    const current=href===here||(href==='#'+state.tab&&!state.view&&!(state.tab==='data'&&state.sets.size===1));
    return `<a href="${href}"${current?' aria-current="page"':''}>${esc(label)}${count?`<span class="st-count">${esc(count)}</span>`:''}</a>`;}).join('')
    +`<div class="st-nav-foot"><strong>Ett utkast för hela stationen</strong><br>Allt här är läst ur källorna. Ingenting är uppmätt och ingenting ändras härifrån.<br><span class="mono">profil ${esc(model.sourceHash.slice(0,12))}</span></div>`;
  const main=$('#st-main');
  if(state.tab==='konfigurera'&&state.view==='regler')renderRegler(main);else if(state.tab==='konfigurera')renderKonfigurera(main);else if(state.tab==='data')renderData(main);else if(state.tab==='genomgang')renderGenomgang(main);else renderLater(main);
}
function stats(){const c=model.counts,d=model.detection;return `<div class="st-stats">
  <div class="st-stat"><small>Växlar</small><b>${c.turnouts}</b><small>Adresser ur JMRI, ej uppmätta</small></div><div class="st-stat"><small>Signaler</small><b>${c.signals}</b><small>Bänkadresser i simulatorn</small></div>
  <div class="st-stat"><small>Spårledningar</small><b>${c.blocks}</b><small>${d.inputs.used} av ${d.inputs.total} ingångar bundna</small></div><div class="st-stat"><small>Tågvägar</small><b>${c.routes}</b><small>210 huvud, 130 växling</small></div>
  <div class="st-stat amber"><small>Avvikelser</small><b>${model.deviations.length}</b><small>${model.blocking} blockerar driftsättning</small></div><div class="st-stat amber"><small>Uppmätt i fält</small><b>0 av ${c.turnouts+c.signals+c.blocks}</b><small>Inga bindningar uppmätta</small></div></div>`;}
// ---------- Konfigurera ----------
function renderKonfigurera(main){
  const layers=[['numbers','Växelnummer'],['signalNames','Signalnamn'],['blockLabels','Spårledningar'],['addresses','Adresser'],['modules','MGP-modul'],['dev','Avvikelser']];
  main.innerHTML=`<div class="st-title"><div><div class="st-eyebrow">KONFIGURERA · STATIONSPLAN</div><h1>Charlottendal</h1><p>Hela stationen i hög upplösning. Rulla i sidled och gå igenom objekten från vänster till höger.</p></div><span class="st-grow"></span>
    <a class="st-btn" href="#genomgang">Avvikelser</a><a class="st-btn st-btn-primary" href="#data">Visa i data</a></div>${stats()}
    ${card('Stationsplan',`<div class="st-toolbar" id="st-walk"></div><div class="st-toolbar"><span class="st-eyebrow">LAGER</span>${layers.map(([k,l])=>`<button type="button" class="st-btn st-toggle" data-layer="${k}" aria-pressed="${state.layers.has(k)}">${l}</button>`).join('')}
      <span class="st-grow"></span><span class="st-eyebrow">ZOOM</span><button type="button" class="st-btn" data-zoom="-">−</button><span class="mono" id="st-zoom"></span><button type="button" class="st-btn" data-zoom="+">+</button><button type="button" class="st-btn" data-zoom="fit">Fyll bredden</button></div>
      <div id="st-plan-host"></div>`,{right:pill('Ingen rapport · ingen hårdvara','',false),foot:`<span class="st-legend"><span><i></i>Spår</span><span><i class="dash"></i>Ingen detektering i källan</span><span>Röd punkt: avvikelse</span><span class="st-grow"></span>Ritad ur panel.json av Studios egen kod.</span>`})}
    <div class="st-two"><div id="st-object"></div>${deviationCard()}</div>`;
  const info=id=>{const o=model.objects.get(id);if(!o)return {};return {address:o.loconet?.order??o.loconet?.report,module:o.kind==='turnout'?o.source?.module?.name:o.kind==='signal'?o.source[0]?.module?.name:null};};
  plan=createPlan($('#st-plan-host'),geo,{onSelect:id=>select(id,{center:false}),info});
  plan.setWidth(state.width);plan.setLayers(state.layers);$('#st-zoom').textContent=Math.round(state.width/ (geo.viewBox[2]) * 100)+' %';
  const badTurnouts=model.companions.filter(c=>!c.ok).flatMap(c=>c.pair),undetected=[...model.detection.undetected.noSensor,...model.detection.undetected.noRule];
  plan.markDeviations({blocks:undetected,turnouts:[...badTurnouts,...model.turnouts.filter(t=>!t.inPlan).map(t=>t.id)]});
  main.onclick=e=>{const b=e.target.closest('[data-layer],[data-zoom],[data-walk],[data-select]');if(!b)return;
    if(b.dataset.layer){const k=b.dataset.layer;state.layers.has(k)?state.layers.delete(k):state.layers.add(k);b.setAttribute('aria-pressed',state.layers.has(k));plan.setLayers(state.layers);session.save();}
    if(b.dataset.zoom){state.width=b.dataset.zoom==='fit'?$('#st-plan-host .st-plan-scroll').clientWidth-2:state.width*(b.dataset.zoom==='+'?1.25:0.8);plan.setWidth(state.width);state.width=plan.width();$('#st-zoom').textContent=Math.round(state.width/geo.viewBox[2]*100)+' %';session.save();}
    if(b.dataset.walk){const i=order.indexOf(state.object),next=i<0?order[0]:order[i+Number(b.dataset.walk)];if(next)select(next);}
    if(b.dataset.select)select(b.dataset.select);};
  if(state.object&&order.includes(state.object))plan.select(state.object,{center:true});else if(state.object)plan.select(state.object);
  renderObjectCard();
}
function renderWalk(){const i=order.indexOf(state.object);const host=$('#st-walk');if(!host)return;
  host.innerHTML=`<span class="st-eyebrow">GÅ IGENOM FRÅN VÄNSTER TILL HÖGER</span><button type="button" class="st-btn" data-walk="-1"${i<=0?' disabled':''}>‹ ${esc(order[i-1]||'')}</button><span class="st-walk">${esc(state.object||'–')}</span><button type="button" class="st-btn" data-walk="1"${i>=order.length-1?' disabled':''}>${esc(i<0?'Börja vid '+order[0]:order[i+1]+' ›')}</button><span class="st-eyebrow">${i>=0?`${i+1} AV ${order.length}`:state.object?'UTANFÖR GÅ IGENOM':`${order.length} VÄXLAR OCH SIGNALER`}</span>`;}
function renderObjectCard(){
  renderWalk();const host=$('#st-object');if(!host)return;const o=model.objects.get(state.object);
  if(!o){host.innerHTML=card('Inget objekt valt','<p class="st-empty">Klicka på en växel, signal eller spårledning i planen.</p>');return;}
  const rel=relationsFor(model,o.id),actions=`<div class="st-toolbar" style="border-top:1px solid var(--kr-line);border-bottom:0"><a class="st-btn" href="#data?objekt=${encodeURIComponent(o.id)}" data-select-data="${esc(o.id)}">Visa i data</a>${rel.deviations.length?`<a class="st-btn" href="#genomgang">${rel.deviations.length} avvikelse${rel.deviations.length>1?'r':''}</a>`:''}</div>`;
  let title='',body='',right='';
  if(o.kind==='turnout'){
    const comp=model.companions.find(c=>c.pair.includes(o.id)),straight=rel.routes.filter(r=>model.objects.get(r).turnouts[o.id]==='C').length;
    title=`${mono(o.id)} · växel`;right=pill(o.inPlan?'Ej uppmätt':'Utan plats i planen','amber');
    body=kv([['LocoNet-adress',mono(o.loconet.order)+' '+pill('Ur JMRI, ej uppmätt','amber')],['JMRI',o.source?mono(o.source.system)+' · kommentar '+mono(o.source.comment):'–'],
      ['Modul och kanal',o.source?.module?mono(o.source.module.name)+(o.source.module.channel?' kanal '+mono(o.source.module.channel):'')+' '+pill('Hypotes'):'Ingen modulreferens'],['Spårledning',mono(o.block||'–')],
      ['Kompis',o.companions.length?o.companions.map(mono).join(', ')+(comp?' · '+(comp.ok?pill('Hel förbindelse','',true):pill('Ingen förbindelse: '+comp.pair[0]+' → '+comp.aLeadsTo+', '+comp.pair[1]+' → '+comp.bLeadsTo,'red')):''):'Ingen'],
      ['Tågvägar',mono(rel.routes.length)+` · ${straight} rakt, ${rel.routes.length-straight} avvikande`],['Status',esc(o.status)]]);
  } else if(o.kind==='signal'){
    const mods=[...new Set(o.source.map(s=>s.module?.name).filter(Boolean))];
    title=`${mono(o.id)} · signal`;right=pill('Bänkadress','amber');
    body=kv([['Masttyp',mono(o.mastType)+(o.aspects.length?` · ${o.aspects.length} besked`:'')],['Adress',mono(o.loconet.order)+' · stopp '+mono(o.loconet.stopCodes.join(', '))+', kör '+mono(o.loconet.goCodes.join(', '))+' <span style="color:var(--kr-mute)">CZ-prov, ej svenskt</span>'],
      ['Utgångar i Cda60.xml',o.source.length?o.source.map(s=>mono(s.system)+' <span style="color:var(--kr-mute)">'+esc(s.comment)+'</span>').join('<br>'):'Ingen'],['Modul',mods.length>1?mods.map(mono).join(' och ')+' '+pill('Två moduler, oklart','amber'):mods.map(mono).join('')||'–'],
      ['Tågvägar','klareras i '+mono(o.routes.length)+', skyddssignal i '+mono(o.guards.length)],['Svenska beskedskoder',pill('Saknas','amber')]]);
  } else if(o.kind==='block'){
    const s=o.section,undet=s&&(s.shape==='noRule'||s.shape==='noSensor')&&s.track;
    title=`${mono(o.id)} · spårledning`;right=undet?pill('Ingen detektering','red'):pill('Ej uppmätt','amber');
    body=kv([['Källsensor i JMRI',o.sourceSensor?mono(o.sourceSensor)+(s?.sharedWith>1?` · delas av ${s.sharedWith} spårledningar`:''):'Ingen'],['Ingångar',s?.inputDetails?.length?s.inputDetails.map(d=>mono(d.system)+(d.module?' <span style="color:var(--kr-mute)">'+esc(d.module)+'</span>':'')).join(', '):'Inga'],
      ['Regelform',s?esc(SHAPE_LABEL[s.shape]||s.shape):'–'],['Bänkadress',mono(o.loconet.report)+' · aktiv betyder '+(o.loconet.activeMeansOccupied?'belagt':'ledigt')],['Tågvägar',mono(rel.routes.length)],['Status',esc(o.status)]]);
  } else {title=mono(o.id);body=`<p class="st-note">${esc(o.title||o.label||'')}</p>`;}
  host.innerHTML=card(title,body+actions,{right});
}
function deviationCard(){
  const rows=model.deviations.slice(0,8).map(d=>`<li><span>${esc(d.title)}</span><span class="st-grow"></span><span class="st-count">${d.count}</span>${d.blocking?pill('Blockerar','red'):''}</li>`).join('');
  return card(`Avvikelser <span class="mono" style="color:var(--kr-red)">${model.deviations.length}</span>`,`<ul class="st-list">${rows}</ul>`,{right:`<a class="st-btn" href="#genomgang">Visa alla</a>`,foot:`Räknas om vid varje läsning. ${model.blocking} blockerar driftsättning.`});
}
// ---------- Regler ----------
function ruleCard(r){
  const st={active:['Gäller',''],unresolved:['Olöst','amber'],proposal:['Förslag · ej uppmätt','amber'],unsupported:['Stöds inte','red']}[r.status]||[r.status,''];
  const objs=r.touches.filter(x=>model.objects.has(x)).slice(0,8).map(x=>`<button type="button" data-select="${esc(x)}" class="mono" style="border:0;background:transparent;color:var(--kr-blue);padding:0;font-weight:700">${esc(x)}</button>`).join(', ');
  const src=[r.source?.jmri,r.source?.button,r.source?.studio&&'Studio '+r.source.studio+(r.source.crossing?' · '+r.source.crossing:'')].filter(Boolean).map(esc).join(' · ');
  return `<div class="st-card" style="border-style:${r.status==='proposal'?'dashed':'solid'}"><div class="st-card-head"><span class="st-eyebrow">${esc(r.typeLabel.toUpperCase())}${r.trigger?' · '+esc({manual:'MANUELL MANÖVER',line:'LINJESPÄRR',programming:'PROGRAMMERINGSSPÅR'}[r.trigger]||r.trigger.toUpperCase()):''}</span><span class="st-grow"></span>${pill('Verkställs i '+r.runsInLabel)}${pill(st[0],st[1],r.status==='proposal')}</div>
    <div style="padding:12px 16px;display:flex;flex-direction:column;gap:8px"><b style="font:700 15px var(--mono)">${esc(r.id.replace(/^(follow|authority|condition):(manual:|line:)?/,''))}</b><span style="font-size:13.5px">${esc(r.explain)}</span>
    <span style="font-size:12.5px;color:var(--kr-ink-2)">Objekt: ${objs||'–'}${r.touches.length>8?` … (${r.touches.length})`:''} · Tågvägar ${mono((r.routes||[]).length)}${src?' · Källa '+src:''}</span>
    ${r.problems?.length?`<span style="font-size:12.5px;color:var(--kr-red)">${r.problems.map(esc).join(' · ')}</span>`:''}${r.replaces?.length?`<span style="font-size:12.5px;color:var(--kr-amber)">Ersätter ${r.replaces.map(x=>esc(x.replace('follow:',''))).join(', ')}</span>`:''}</div></div>`;
}
function renderRegler(main){
  const rules=model.rules.filter(r=>r.status!=='proposal'),props=model.rules.filter(r=>r.status==='proposal'),f=state.ruleType||'alla';
  const types=[['alla','Alla',rules.length],['follow','Följer',rules.filter(r=>r.type==='follow').length],['authority','Manöverrätt',rules.filter(r=>r.type==='authority').length],['condition','Villkor',rules.filter(r=>r.type==='condition').length]];
  const shown=rules.filter(r=>f==='alla'||r.type===f);
  const eff=model.ruleEffects;
  main.innerHTML=`<div class="st-title"><div><div class="st-eyebrow">KONFIGURERA · REGLER</div><h1>Regler</h1><p>Det som gäller i dag uttryckt i regelspråket, kompilerat tillbaka till kärnans fragment utan skillnad. Inget här ändrar driften.</p></div><span class="st-grow"></span>${model.compiledIdentical?pill('Kompilerar identiskt med profilen','',true):pill('Kompileringen skiljer sig från profilen','red')}</div>
    <div class="st-stats">${types.map(([k,l,n])=>`<div class="st-stat"><small>${l}</small><b>${n}</b></div>`).join('')}<div class="st-stat amber"><small>Förslag</small><b>${props.length}</b><small>${eff?eff.routesChanged+' tågvägar ändrar växelläge':''}</small></div></div>
    ${props.length?card('Förslag ur spårgrafen · dubbelkorsväxlarna',`<div style="padding:12px 16px;display:grid;grid-template-columns:repeat(auto-fit,minmax(380px,1fr));gap:12px">${props.map(ruleCard).join('')}</div>`
      +(eff?`<div class="st-note">Med förslaget ändrar ${eff.routesChanged} tågvägar växelläge (${eff.main} huvud, ${eff.shunt} växling). Exempel: ${eff.examples.slice(0,3).map(e=>`<b>${esc(e.label)}</b> ${esc(Object.entries(e.before).map(([k,v])=>k.slice(2)+' '+v).join(' '))} → ${esc(Object.entries(e.after).map(([k,v])=>k.slice(2)+' '+v).join(' '))}`).join('; ')}.</div>`:''),
      {right:pill('Ej uppmätt','amber'),foot:'Förslaget blir ett utkast som provas i simulatorn och aktiveras med skillnadslista i steg 4. Tågvägstabellen är oförändrad tills dess.'}):''}
    <div class="st-chips">${types.map(([k,l,n])=>`<button type="button" class="st-chip-set" data-rule-type="${k}" aria-pressed="${f===k}">${l}<b>${n}</b></button>`).join('')}<span class="st-grow"></span><span class="st-eyebrow">KÄLLA · ${esc(model.ruleSource.toUpperCase())}</span></div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(420px,1fr));gap:12px">${shown.map(ruleCard).join('')}</div>`;
  main.onclick=e=>{const t=e.target.closest('[data-rule-type]');if(t){state.ruleType=t.dataset.ruleType;renderRegler(main);return;}const b=e.target.closest('[data-select]');if(b){state.object=b.dataset.select;session.save();location.hash='#konfigurera?objekt='+encodeURIComponent(b.dataset.select);}};
}
// ---------- Data ----------
function renderData(main){
  const f=state.object&&model.objects.has(state.object)?model.objects.get(state.object):null;
  main.innerHTML=`<div class="st-title"><div><div class="st-eyebrow">DATA · ALLA MÄNGDER</div><h1>Data</h1><p>Varje mängd är en projektion av samma last. Ett valt objekt filtrerar allt genom sina relationer.</p></div><span class="st-grow"></span><a class="st-btn" href="#konfigurera">Visa i planen</a></div>
    <div class="st-chips" id="st-chips">${SETS.map(s=>`<button type="button" class="st-chip-set" data-set="${s.id}" aria-pressed="${state.sets.has(s.id)}">${s.label}<b>${rowsFor(model,s.id,f?.id).length}${f?' / '+rowsFor(model,s.id).length:''}</b></button>`).join('')}
    ${f?`<span class="st-filter">Filter: ${esc(f.label||f.id)}<button type="button" data-clear aria-label="Ta bort filtret">×</button></span>`:'<span class="st-eyebrow">INGET FILTER · klicka en rad för att filtrera på objektet</span>'}</div>
    <div class="st-two"><div id="st-grids" style="display:flex;flex-direction:column;gap:16px"></div><div id="st-rel"></div></div>`;
  renderGrids();renderRelations();
  main.onclick=e=>{
    const chip=e.target.closest('[data-set]');if(chip){const s=chip.dataset.set;state.sets.has(s)?state.sets.delete(s):state.sets.add(s);session.save();renderData(main);return;}
    if(e.target.closest('[data-clear]')){state.object=null;session.save();renderData(main);return;}
    const row=e.target.closest('tr[data-id]');if(row){select(row.dataset.id);return;}
    const rel=e.target.closest('[data-rel-set]');if(rel){state.sets.add(rel.dataset.relSet);session.save();renderData(main);}
    const pick=e.target.closest('[data-pick]');if(pick)select(pick.dataset.pick);};
  main.oninput=e=>{const q=e.target.closest('[data-search-set]');if(q){state.search[q.dataset.searchSet]=q.value;renderGrid(q.dataset.searchSet);}};
}
function renderGrids(){const host=$('#st-grids');host.innerHTML=SETS.filter(s=>state.sets.has(s.id)).map(s=>`<div data-grid="${s.id}"></div>`).join('')||'<p class="st-empty">Tänd en mängd ovanför.</p>';for(const s of SETS)if(state.sets.has(s.id))renderGrid(s.id);}
function renderGrid(setId){
  const host=$(`[data-grid="${setId}"]`);if(!host)return;const set=SETS.find(s=>s.id===setId),cols=columnsFor(setId),q=(state.search[setId]||'').toLocaleLowerCase('sv');
  let rows=rowsFor(model,setId,state.object).map(o=>({o,cells:cellsFor(model,setId,o)}));
  if(q)rows=rows.filter(r=>Object.values(r.cells).join(' ').toLocaleLowerCase('sv').includes(q));
  const shown=rows.slice(0,200);
  const table=`<div class="st-grid-wrap"><table class="st-grid"><thead><tr>${cols.map(c=>`<th${c[2]==='num'?' class="num"':''}>${esc(c[1])}</th>`).join('')}</tr></thead><tbody>${shown.map(({o,cells})=>`<tr data-id="${esc(o.id)}"${o.id===state.object?' aria-selected="true"':''}>${cols.map(c=>`<td${c[2]==='num'?' class="num"':''}>${esc(cells[c[0]])}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  host.innerHTML=card(`${esc(set.label)} <span class="mono" style="color:var(--kr-mute)">${rows.length}</span>`,rows.length?table:'<p class="st-empty">Inga rader med det här filtret.</p>',
    {right:`<input class="st-grid-search" type="search" data-search-set="${setId}" value="${esc(state.search[setId]||'')}" placeholder="Sök i ${esc(set.label.toLowerCase())}" aria-label="Sök i ${esc(set.label)}">`,foot:rows.length>200?`Visar 200 av ${rows.length}. Begränsa med sökningen.`:''});
}
function renderRelations(){
  const host=$('#st-rel'),o=state.object&&model.objects.get(state.object);
  if(!o){host.innerHTML=card('Relationer','<p class="st-empty">Välj ett objekt så visas allt som hör ihop med det här.</p>');return;}
  const rel=relationsFor(model,o.id),groups=[['tagvagar','Tågvägar',rel.routes],['vaxlar','Växlar',rel.turnouts],['signaler','Signaler',rel.signals],['sparledningar','Spårledningar',rel.blocks],['moduler','Moduler',rel.modules],['avvikelser','Avvikelser',rel.deviations]];
  const sample=ids=>ids.slice(0,6).map(id=>`<button type="button" data-pick="${esc(id)}" class="mono" style="border:0;background:transparent;color:var(--kr-blue);padding:0;font-weight:600">${esc(model.objects.get(id)?.label||id)}</button>`).join(', ')+(ids.length>6?` …`:'');
  host.innerHTML=card(`${mono(o.label||o.id)} · ${esc({turnout:'växel',signal:'signal',block:'spårledning',route:'tågväg',module:'modul',deviation:'avvikelse'}[o.kind])}`,
    `<ul class="st-rel">${groups.map(([setId,label,ids])=>`<li><button type="button" data-rel-set="${setId}">${label}</button><span class="st-count">${ids.length}</span></li><li style="min-height:0;padding-bottom:10px;font-size:12.5px;color:var(--kr-ink-2)">${ids.length?sample(ids):'<span style="color:var(--kr-mute)">Inga</span>'}</li>`).join('')}</ul>`,
    {right:`<a class="st-btn" href="#konfigurera" data-plan="${esc(o.id)}">Visa i planen</a>`,foot:'Klicka en grupp för att tända mängden, eller ett namn för att filtrera på det i stället.'});
}
// ---------- Genomgång ----------
function renderGenomgang(main){
  main.innerHTML=`<div class="st-title"><div><div class="st-eyebrow">GENOMGÅNG</div><h1>Avvikelser</h1><p>Det som saknas eller strider i källorna, räknat vid varje läsning. AI-genomgången och regelförslagen kommer i steg 4.</p></div><span class="st-grow"></span>${pill(model.blocking+' blockerar driftsättning','red')}</div>
    ${card(`Avvikelser <span class="mono" style="color:var(--kr-red)">${model.deviations.length}</span>`,`<div class="st-grid-wrap"><table class="st-grid"><thead><tr><th>Avvikelse</th><th class="num">Antal</th><th>Löses av</th><th>Objekt</th><th></th></tr></thead><tbody>
      ${model.deviations.map(d=>`<tr><td style="font-family:var(--font)">${esc(d.title)}${d.blocking?' '+pill('Blockerar','red'):''}</td><td class="num">${d.count}</td><td>${esc(d.resolvedBy)}${d.note?' <span style="color:var(--kr-mute)">· '+esc(d.note)+'</span>':''}</td><td style="font-family:var(--mono);font-size:12px">${esc((d.items||[]).slice(0,8).join(', '))}${(d.items||[]).length>8?' …':''}</td>
      <td style="white-space:nowrap">${d.objects.length?`<a href="#data?objekt=${encodeURIComponent(d.objects[0])}">Visa i data</a> · <a href="#konfigurera?objekt=${encodeURIComponent(d.objects[0])}">Visa i planen</a>`:''}</td></tr>`).join('')}</tbody></table></div>`,
      {foot:'Listan är deterministisk och kommer från src/studio. Samma rader finns på npm run studio.'})}
    ${card('Kompispar enligt spårgrafen',`<ul class="st-list">${model.companions.map(c=>`<li><span class="mono"><b>${esc(c.pair.join(' + '))}</b></span><span class="st-grow"></span>${c.ok?pill('Hel förbindelse','',true):pill(`Ingen förbindelse: ${c.pair[0]} → ${c.aLeadsTo}, ${c.pair[1]} → ${c.bLeadsTo}`,'red')}</li>`).join('')}
      ${model.crossovers.map(x=>`<li><span>${esc(x.crossing)} · förslag</span><span class="st-grow"></span><span class="mono">${esc(x.pairs.map(p=>p.join(' + ')).join(' och '))}</span>${pill('Förslag · ej uppmätt','amber')}</li>`).join('')}</ul>`,{foot:'Förslaget ändrar ingenting. Det blir ett regelutkast när regelspråket finns (steg 3).'})}`;
}
function renderLater(main){
  const text=state.tab==='driftsattning'?'Mätning objekt för objekt, Lyssna, Kort och MGP och aktivering med skillnadslista kommer i steg 5. Tills dess finns Protokollinspelning och Driftinställningar i dagens admin.':'TrainMeet och Stream Deck flyttas in sist. De finns i dagens admin.';
  main.innerHTML=`<div class="st-title"><div><div class="st-eyebrow">${esc(state.tab.toUpperCase())}</div><h1>${esc(TABS.find(t=>t.id===state.tab).label)}</h1><p>${esc(text)}</p></div></div>`;
}
// ---------- händelser ----------
window.addEventListener('hashchange',()=>{const link=parseHash(location.hash);if(link.object&&model?.objects.has(link.object))state.object=link.object;if(link.sets.length)state.sets=new Set(link.sets);state.tab=link.tab;state.view=link.view;session.save();render();});
$('#st-search').addEventListener('keydown',e=>{if(e.key!=='Enter'||!model)return;const q=e.target.value.trim().toLocaleLowerCase('sv');const hit=[...model.objects.keys()].find(id=>id.toLocaleLowerCase('sv')===q)||[...model.objects.values()].find(o=>(o.label||'').toLocaleLowerCase('sv')===q)?.id;if(hit){select(hit);if(state.tab!=='konfigurera'&&state.tab!=='data')go('konfigurera');}});
$('#st-theme').addEventListener('click',e=>{const light=document.documentElement.dataset.theme!=='light';document.documentElement.dataset.theme=light?'light':'';e.currentTarget.textContent=light?'Mörkt':'Ljust';e.currentTarget.setAttribute('aria-pressed',light);try{localStorage.setItem('studio-theme',light?'light':'dark');}catch{}});
try{if(localStorage.getItem('studio-theme')==='light'){document.documentElement.dataset.theme='light';$('#st-theme').textContent='Mörkt';}}catch{}
load().catch(e=>{$('#st-main').innerHTML=`<p class="st-error">Studio kunde inte läsa stationen: ${esc(e.message)}</p>`;});
