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
    <details id="train-editor" class="card"><summary>Tåginformation · manuell registrering</summary>
    <p class="muted">Ange eller flytta tågnummer efter egen kontroll. Beläggning rapporteras separat. Uppgifterna flyttas inte automatiskt med tåget.</p>
    <div class="train-editor-grid"><div><label>Plats eller inkommande fält<select id="train-field"></select></label>
    <label>Tågnummer<input id="train-value" maxlength="24" autocomplete="off" placeholder="Till exempel P421"></label>
    <div class="train-actions"><button id="train-save" class="primary">Spara / bekräfta</button><button id="train-clear">Töm fält</button><button id="train-reload">Läs in senaste</button></div>
    <div id="train-message" role="status"></div></div><div><p id="train-detail"></p><p id="train-condition" class="muted"></p>
    <button id="train-source" class="source-inspect">Visa källuppgifter →</button>
    <label>Flytta numret till<select id="train-target"></select></label><button id="train-move">Flytta tågnummer</button></div></div>
    <details class="train-history"><summary>Senaste ändringar</summary><div id="train-history"></div></details>
    <details class="train-source-note"><summary>Källavvikelse i originalet</summary><p class="muted">Två visningsplatser pekar på SN2A och markeras med ?; SU2A saknar egen visningsplats. Båda blocken finns i listan.</p></details><p class="muted train-source-note">TrainMeet är ännu inte anslutet.</p></details>`;
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
    $('train-detail').textContent=entry?`${entry.value} · manuellt registrerat ${stamp(entry.updatedAt)}${entry.needsReview?' · behöver kontrolleras':''}${entry.duplicate?' · numret finns på flera platser':''}`:'Inget tågnummer registrerat här.';
    const occupied=online&&state?.connection==='connected'?state?.blocks[f.name]?.occupied:null;
    $('train-condition').textContent=f.kind==='incoming'?'Planeringsuppgift · ingen beläggningskoppling.':`${occupied===true?'Spårledningen är belagd':occupied===false?'Spårledningen är fri':'Beläggningen är okänd'} · ${f.name}. Ett registrerat nummer är inte en detektorkvittens.`;
    if(stale()&&dirty) $('train-message').textContent='Uppgifterna eller beläggningen har ändrats. Din text finns kvar; läs in senaste innan du sparar.';
    $('train-save').disabled=!online||busy||stale()||!$('train-value').value.trim();
    $('train-clear').disabled=!online||busy||stale()||!entry;
    $('train-reload').disabled=!online||busy;
    $('train-move').disabled=!online||busy||dirty||stale()||!entry||!target||target===key||!!info?.entries[target];
    $('train-field').disabled=busy;$('train-value').disabled=busy;$('train-target').disabled=busy;
  }
  function paint() {
    if(!info)return;
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
      const description=`${a.block}: ${label||'inget tågnummer'} · manuellt${a.duplicate?' · dubblerad blockreferens i originalet':''}${e?.needsReview?' · placeringen behöver kontrolleras':''}`;
      group.setAttribute('aria-label',description);hint.textContent=description;
    }
    if(!dirty&&!busy)loadEditor();else paintEditor();
    const describeKey=key=>fields.has(key)?title(fields.get(key)):key;
    $('train-history').textContent=info.history.map(e=>`${stamp(e.at)} · ${e.kind==='move'?`${e.before}: ${describeKey(e.from)} → ${describeKey(e.to)}`:`${describeKey(e.key)}: ${e.before||'—'} → ${e.after||'—'}${e.kind==='confirm'?' · kontrollerat':''}`}`).join('\n')||'Inga ändringar ännu.';
  }
  async function send(command,data) {
    if(!base||busy||!online)return;busy=true;$('train-message').textContent='Sparar…';paintEditor();
    const keys=command==='move'?[data.from,data.to]:[data.key];
    try {
      const response=await fetch('/api/train-information/'+command,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...data,revision:base.revision,sessionId:base.sessionId,epochs:Object.fromEntries(keys.map(key=>[key,base.epochs[key]||0]))})});
      const result=await response.json();if(!response.ok)throw Error(result.error);
      // Ignore an older HTTP reply after a newer event or a server restart.
      if(info.sessionId===result.sessionId&&result.revision>=info.revision)info=result;
      dirty=false;$('train-message').textContent=command==='move'?'Tågnumret har flyttats.':'Uppgiften har sparats.';
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
  $('train-source').onclick=()=>{const f=fields.get($('train-field').value);openSource(f.kind==='incoming'?'memories':'blocks',f.name);};
  paintEditor();
  return {update(next,connected){state=next;online=connected;const value=next?.trainInformation;if(value&&(!info||value.sessionId!==info.sessionId||value.revision>=info.revision))info=value;paint();},
    presentationChanged(){for(const id of ['train-field','train-target'])for(const option of $(id).options)if(fields.has(option.value))option.textContent=title(fields.get(option.value));paint();}};
}
