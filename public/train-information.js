const $=id=>document.getElementById(id);
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function createTrainInformation({catalog,plan,displayName,openSource}) {
  const fields=new Map(catalog.fields.map(f=>[f.key,f])),nodes=[],chips=[];
  let info=null,state=null,online=false,dirty=false,busy=false,base=null;
  const title=f=>f.kind==='incoming'?'Inkommande '+f.label:displayName('blocks',f.name)+(f.label!==f.name?' · '+f.label:'');
  const stamp=n=>new Date(n).toLocaleString('sv-SE',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'});
  const option=f=>`<option value="${esc(f.key)}">${esc(title(f))}</option>`;
  const incoming=catalog.fields.filter(f=>f.kind==='incoming').sort((a,b)=>a.sourceSystem.localeCompare(b.sourceSystem));
  const blocks=catalog.fields.filter(f=>f.kind==='block').sort((a,b)=>a.name.localeCompare(b.name,'sv',{numeric:true}));
  $('train-information').innerHTML=`<div class="train-strip"><strong>Inkommande</strong><div id="incoming-trains"></div><button id="open-train-editor">Tågnummer <span id="train-count"></span></button></div>
    <details id="train-editor" class="card"><summary>Tåginformation och nummerföljning</summary>
    <p class="muted">Ange tågnummer efter egen kontroll. Du kan sedan koppla numret till en klar tågväg före första beläggningen. Följningen använder rapporterad passage; detektorerna identifierar inte själva tåget.</p>
    <div class="train-editor-grid"><div><label>Plats eller inkommande fält<select id="train-field"></select></label>
    <label>Tågnummer<input id="train-value" maxlength="24" autocomplete="off" placeholder="Till exempel P421"></label>
    <div class="train-actions"><button id="train-save" class="primary">Spara / bekräfta</button><button id="train-clear">Töm fält</button><button id="train-reload">Läs in senaste</button></div>
    <div id="train-message" role="status"></div></div><div><p id="train-detail"></p><p id="train-condition" class="muted"></p>
    <button id="train-source" class="source-inspect">Visa källuppgifter →</button>
    <label>Flytta numret till<select id="train-target"></select></label><button id="train-move">Flytta tågnummer</button></div></div>
    <div class="train-follow-controls"><label>Följ längs klar tågväg<select id="train-follow-route" aria-label="Följ längs klar tågväg"></select></label><button id="train-follow">Koppla valt tågnummer</button><p class="muted">Numret ska stå i ett inkommande fält eller vid vägens första detektor. Vid avbrott, återtagning eller oklar passage stannar följningen för kontroll. Den fortsätter aldrig själv efter omstart.</p><div id="train-follow-list"></div></div>
    <details class="train-history"><summary>Senaste ändringar</summary><div id="train-history"></div></details>
    <details class="train-source-note"><summary>Källavvikelse i originalet</summary><p class="muted">Två visningsplatser pekar på SN2A och markeras med ?; SU2A saknar egen visningsplats. Båda blocken finns i listan.</p></details><p class="muted train-source-note">TrainMeet visas separat. Nummerföljningen ändrar inga klareringar i TrainMeet.</p></details>`;
  const options=`<optgroup label="Inkommande tåg">${incoming.map(option).join('')}</optgroup><optgroup label="Spårblock">${blocks.map(option).join('')}</optgroup>`;
  $('train-field').innerHTML=options;$('train-target').innerHTML='<option value="">Välj mål…</option>'+options;
  let activeKey=$('train-field').value;
  for(const f of incoming) {
    const button=document.createElement('button');button.className='incoming-train';button.innerHTML=`<span>${esc(f.label)}</span><strong>—</strong>`;
    button.onclick=()=>open(f.key);$('incoming-trains').append(button);chips.push({f,button});
  }
  function svg(tag,attrs,parent,text) {const n=document.createElementNS('http://www.w3.org/2000/svg',tag);for(const [k,v] of Object.entries(attrs))n.setAttribute(k,v);if(text!==undefined)n.textContent=text;parent.append(n);return n;}
  const layer=svg('g',{id:'train-number-layer'},plan);
  for(const a of catalog.anchors) {
    const group=svg('g',{transform:`translate(${a.x},${a.y})`,class:'train-number',visibility:'hidden',role:'button',tabindex:'-1','data-train-field':a.key},layer);
    const rect=svg('rect',{x:-3,y:-3,width:45,height:20,rx:2},group);
    const text=svg('text',{x:0,y:12},group),hint=svg('title',{},group);
    group.addEventListener('click',()=>open(a.key));
    group.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();open(a.key);}});
    nodes.push({a,group,rect,text,hint});
  }
  function capture() {base=info?{revision:info.revision,sessionId:info.sessionId,epochs:{...info.epochs}}:null;}
  function loadEditor() {
    if(!info)return;dirty=false;capture();$('train-value').value=info.entries[$('train-field').value]?.value||'';paintEditor();
  }
  function stale() {return !base||!info||base.revision!==info.revision||base.sessionId!==info.sessionId||
    (base.epochs[$('train-field').value]||0)!==(info.epochs[$('train-field').value]||0);}
  function paintEditor() {
    const key=$('train-field').value,f=fields.get(key),entry=info?.entries[key],target=$('train-target').value;
    $('train-detail').textContent=entry?`${entry.value} · ${entry.source==='follow'?'flyttat efter passage':'manuellt registrerat'} ${stamp(entry.updatedAt)}${entry.needsReview?' · behöver kontrolleras':''}${entry.duplicate?' · numret finns på flera platser':''}`:'Inget tågnummer registrerat här.';
    const occupied=online&&state?.connection==='connected'?state?.blocks[f.name]?.occupied:null;
    $('train-condition').textContent=f.kind==='incoming'?'Planeringsuppgift · ingen beläggningskoppling.':`${occupied===true?'Spårledningen är belagd':occupied===false?'Spårledningen är fri':'Beläggningen är okänd'} · ${f.name}. Ett registrerat nummer är inte en detektorkvittens.`;
    if(stale()&&dirty) $('train-message').textContent='Uppgifterna eller beläggningen har ändrats. Din text finns kvar; läs in senaste innan du sparar.';
    const unavailable=!online||busy||!!info?.fault;
    $('train-follow').disabled=unavailable||dirty||stale()||!entry||entry.needsReview||entry.duplicate||!$('train-follow-route').value||info.follows.some(f=>['active','paused'].includes(f.status)&&f.key===key);
    $('train-save').disabled=unavailable||stale()||!$('train-value').value.trim();
    $('train-clear').disabled=unavailable||stale()||!entry;
    $('train-reload').disabled=!online||busy;
    $('train-move').disabled=unavailable||dirty||stale()||!entry||!target||target===key||!!info?.entries[target];
    $('train-follow-route').disabled=busy;
    if(info?.fault)$('train-message').textContent=info.fault;
    for(const b of $('train-follow-list').querySelectorAll('button'))b.disabled=unavailable;
    $('train-field').disabled=busy;$('train-value').disabled=busy;$('train-target').disabled=busy;
  }
  function paint() {
    if(!info)return;
    const routes=(state?.routes||[]).filter(r=>r.state==='active'&&r.autoRelease&&r.passage?.every(p=>p.state==='pending'));
    const select=$('train-follow-route'),chosen=select.value,options='<option value="">Välj tågväg…</option>'+routes.map(r=>`<option value="${esc(r.id)}">${esc(r.label)}</option>`).join('');
    if(select.innerHTML!==options){select.innerHTML=options;if(routes.some(r=>r.id===chosen))select.value=chosen;}
    const status={active:'Följer',paused:'Pausad · kontrollera',stopped:'Avslutad',complete:'Passerad · kontrollera'};
    const follows=(info.follows||[]).slice().reverse().map(f=>`<div class="follow-row"><strong>${esc(f.value)} · ${esc(f.routeLabel)}</strong><span>${status[f.status]} · senast ${esc(f.key.replace('block:','').replace('incoming:',''))}</span><small>${esc(f.reason)}</small><button data-show-train="${esc(f.key)}">Visa plats för ${esc(f.value)}</button>${['active','paused'].includes(f.status)?`<button data-unfollow="${esc(f.id)}">Avsluta följning för ${esc(f.value)}</button>`:''}</div>`).join('');
    if($('train-follow-list').innerHTML!==follows)$('train-follow-list').innerHTML=follows;
    for(const {f,button} of chips) {
      const e=info.entries[f.key],review=e&&(!online||e.needsReview);
      button.querySelector('strong').textContent=e?e.value+(review?' ?':''):'—';
      button.classList.toggle('needs-review',!!review);button.title=e?`${e.value} · manuellt · ${review?'kontrollera':'registrerat'} · ${stamp(e.updatedAt)}`:'Ange inkommande tåg';
    }
    $('train-count').textContent=Object.keys(info.entries).length||'';
    for(const {a,group,rect,text,hint} of nodes) {
      const e=info.entries[a.key],review=e&&(!online||e.needsReview||a.duplicate);
      group.setAttribute('visibility',e?'visible':'hidden');group.setAttribute('tabindex',e?'0':'-1');group.classList.toggle('needs-review',!!review);
      const label=e?e.value+(review?' ?':''):'';
      text.textContent=label;rect.setAttribute('width',Math.max(34,label.length*8+6));
      const description=`${a.block}: ${label||'inget tågnummer'} · ${e?.source==='follow'?'nummerföljning':'manuellt'}${a.duplicate?' · dubblerad blockreferens i originalet':''}${e?.needsReview?' · placeringen behöver kontrolleras':''}`;
      group.setAttribute('aria-label',description);hint.textContent=description;
    }
    if(!dirty&&!busy)loadEditor();else paintEditor();
    const describeKey=key=>fields.has(key)?title(fields.get(key)):key;
    $('train-history').textContent=info.history.map(e=>`${stamp(e.at)} · ${['move','follow-move'].includes(e.kind)?`${e.before}: ${describeKey(e.from)} → ${describeKey(e.to)}`:`${describeKey(e.key)}: ${e.before||'—'} → ${e.after||'—'}${e.kind==='confirm'?' · kontrollerat':e.kind.startsWith('follow-')?' · '+({'follow-start':'följning startad','follow-stop':'följning avslutad','follow-pause':'följning pausad','follow-complete':'passage färdig'})[e.kind]:''}`}`).join('\n')||'Inga ändringar ännu.';
  }
  async function send(command,data) {
    if(!base||busy||!online)return;const preserveDraft=command==='unfollow'&&dirty;busy=true;$('train-message').textContent='Sparar…';paintEditor();
    const keys=command==='move'?[data.from,data.to]:command==='unfollow'?[]:[data.key];
    try {
      const response=await fetch('/api/train-information/'+command,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...data,revision:base.revision,sessionId:base.sessionId,epochs:Object.fromEntries(keys.map(key=>[key,base.epochs[key]||0]))})});
      const result=await response.json();if(!response.ok)throw Error(result.error);
      // Ignore an older HTTP reply after a newer event or a server restart.
      if(info.sessionId===result.sessionId&&result.revision>=info.revision)info=result;
      dirty=preserveDraft;$('train-message').textContent=({move:'Tågnumret har flyttats.',follow:'Tågnumret är kopplat till tågvägen.',unfollow:'Följningen är avslutad. Kontrollera placeringen.',save:'Uppgiften har sparats.'})[command];
    } catch(e) {dirty=true;$('train-message').textContent=e.message;}
    finally {busy=false;paint();}
  }
  function open(key) {
    $('train-editor').open=true;
    if(dirty) {$('train-field').value=activeKey;$('train-message').textContent='Spara texten eller välj Läs in senaste innan du byter fält.';}
    else {if(fields.has(key))$('train-field').value=key;activeKey=$('train-field').value;$('train-message').textContent='';loadEditor();}
    $('train-editor').scrollIntoView({block:'nearest'});
  }
  $('open-train-editor').onclick=()=>open($('train-field').value);
  $('train-field').onchange=()=>{if(dirty){$('train-field').value=activeKey;$('train-message').textContent='Spara texten eller välj Läs in senaste innan du byter fält.';return;}activeKey=$('train-field').value;$('train-message').textContent='';loadEditor();};
  $('train-target').onchange=()=>{if(!dirty)capture();paintEditor();};
  $('train-value').oninput=()=>{dirty=true;$('train-message').textContent='';paintEditor();};
  $('train-reload').onclick=()=>{$('train-message').textContent='Senaste uppgifter inlästa.';loadEditor();};
  $('train-save').onclick=()=>send('save',{key:$('train-field').value,value:$('train-value').value});
  $('train-clear').onclick=()=>send('save',{key:$('train-field').value,value:''});
  $('train-move').onclick=()=>send('move',{from:$('train-field').value,to:$('train-target').value});
  $('train-follow-route').onchange=paintEditor;
  $('train-follow').onclick=()=>send('follow',{key:$('train-field').value,routeId:$('train-follow-route').value});
  $('train-follow-list').onclick=e=>{const id=e.target.closest('button')?.dataset.unfollow;if(id){capture();send('unfollow',{id});}else{const key=e.target.closest('button')?.dataset.showTrain;if(key)open(key);}};
  $('train-source').onclick=()=>{const f=fields.get($('train-field').value);openSource(f.kind==='incoming'?'memories':'blocks',f.name);};
  paintEditor();
  return {update(next,connected){state=next;online=connected;const value=next?.trainInformation;if(value&&(!info||value.sessionId!==info.sessionId||value.revision>=info.revision))info=value;paint();},
    presentationChanged(){for(const id of ['train-field','train-target'])for(const option of $(id).options)if(fields.has(option.value))option.textContent=title(fields.get(option.value));paint();}};
}
