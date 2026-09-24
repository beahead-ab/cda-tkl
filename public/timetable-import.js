import {TIMETABLE_COLUMNS,TABLE_FILE_BYTES} from './timetable-format.js';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fields={trainNumber:'Tågnummer',station:'Station / driftplats',day:'Trafikdag',arrival:'Ankomst',departure:'Avgång',track:'Spår',from:'Från',to:'Till',note:'Anmärkning'};
const fileURL=(id,f)=>'/api/timetable-import/source/'+id+'/'+f;
const readFile=file=>new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result).split(',')[1]);reader.onerror=()=>reject(Error('Filen kunde inte läsas: '+file.name));reader.readAsDataURL(file);});
export function createTimetableImport(){
  const root=document.getElementById('timetable-import');let summary,doc,online=false,dirty=false,busy=false,loading=false,shownRevision=-1,shownSession='',loadingVersion='';
  root.innerHTML=`<section class="card"><h2>Skriv in en egen tidtabell</h2><p>Lägg till tågrörelser för hand. Den färdiga tidtabellen visas i samma kolumner som importerade uppgifter och TrainMeet. Ingen AI-anslutning behövs.</p><button id="ti-manual" type="button">Skapa tidtabell manuellt</button></section><section class="card"><h2>Importera Excel eller CSV</h2><p>Fyll i en mall för att läsa in exakta uppgifter. Ingen AI-tolkning eller API-nyckel behövs.</p><div class="import-templates"><a href="/api/timetable-import/template.xlsx" download>Ladda ner Excelmall</a><a href="/api/timetable-import/template.csv" download>Ladda ner CSV-mall</a></div><p class="muted">Mallarna innehåller två exempelrader. Ersätt dem med dina tågrörelser och behåll rubrikraden.</p><details class="import-format"><summary>Visa kolumner och format</summary><p>${TIMETABLE_COLUMNS.map(([label])=>esc(label)).join(" · ")}</p><p>En rad per tågrörelse. Tågnummer, Station och Trafikdag är obligatoriska. Ange minst Ankomst eller Avgång som HH:MM. Tider efter midnatt kan skrivas 25:10. Passerar ska vara Ja eller Nej. Övriga uppgifter får lämnas tomma.</p><p>Excel: använd bladet Tidtabell och klistra in värden, utan formler. Textformat bevarar inledande nollor i tågnummer. CSV: spara som UTF-8 med semikolon eller komma som avskiljare.</p></details><form id="ti-table-upload"><label>Excel- eller CSV-fil<input id="ti-table-file" type="file" accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv" required></label><p class="muted">En fil, högst 2 MB och 300 tågrörelser. Originalet sparas på TKL-servern. Du granskar resultatet innan det används.</p><button id="ti-table-read">Läs in fil</button></form></section><section class="card"><h2>Importera bilder och PDF</h2><p>Välj underlagen som hör till samma tidtabell. AI läser dem tillsammans och skapar ett utkast som du kan rätta.</p><p id="ti-ai" class="muted"></p><form id="ti-upload"><label>Station att leta efter<input id="ti-station" maxlength="160" value="Charlottendal"></label><label>Bilder och PDF-filer<input id="ti-files" type="file" multiple accept="application/pdf,image/png,image/jpeg,image/webp,.pdf,.png,.jpg,.jpeg,.webp" required></label><p class="muted">Högst 8 filer, 8 MB per fil och 16 MB tillsammans. PDF, PNG, JPEG och WebP.</p><p id="ti-files-list"></p><p class="muted" id="ti-disclosure">När du väljer Tolka med AI skickas filerna till OpenAI för tolkning. Originalen sparas på TKL-servern för granskning.</p><button id="ti-analyse">Tolka med AI</button></form></section><p id="ti-message" role="status"></p><button id="ti-reload" type="button" hidden>Läs in senaste utkastet</button><section id="ti-draft"></section><section id="ti-active" class="card"></section>`;
  const $=id=>document.getElementById('ti-'+id),message=v=>{$('message').textContent=v;};
  const revision=()=>({sessionId:doc?.sessionId||summary.sessionId,revision:doc?.revision??summary.revision});
  function controls(){
    $('manual').disabled=!online||busy||!!summary?.draft;
    $('table-read').disabled=!online||busy||!!summary?.draft;
    $('table-file').disabled=busy||!!summary?.draft;
    if($('edit-active'))$('edit-active').disabled=!online||busy||!!summary?.draft;
    $('analyse').disabled=!online||busy||!summary?.aiConfigured||!!summary?.draft;
    $('files').disabled=busy||!!summary?.draft;$('station').disabled=busy||!!summary?.draft;
    $('ai').textContent=summary?.aiConfigured?'AI-tolkning är ansluten.':'AI-tolkning är inte ansluten ännu. Serverns API-nyckel behöver läggas in.';
    for(const id of ['save','discard','activate','append'])if($(id))$(id).disabled=!online||busy||(id==='activate'&&(dirty||!$('reviewed')?.checked));
    if($('append')&&doc?.draft?.rows.length>=300)$('append').disabled=true;
    if($('discard')&&summary?.draft?.status==='reading'&&!summary?.error)$('discard').disabled=true;
    if(summary?.error)message(summary.error);
  }
  function adopt(next){if(summary?.sessionId===next.sessionId&&summary.revision>next.revision)return;if(next.draft?.status==='review'&&doc?.draft?.status==='reading')message('Tolkningen är klar. Granska och rätta utkastet.');if(next.draft?.status==='failed')message(next.draft.error);doc=next;summary=next;shownRevision=next.revision;shownSession=next.sessionId;dirty=false;$('reload').hidden=true;render();controls();}
  async function request(action,data={}){
    busy=true;controls();
    try{
      const response=await fetch('/api/timetable-import/'+action,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...revision(),...data})});
      const result=await response.json();if(!response.ok)throw Error(result.error||'Åtgärden misslyckades.');adopt(result);message(action==='save'?'Utkastet är sparat. Kontrollera uppgifterna innan du använder tidtabellen.':action==='activate'?'Tidtabellen används nu i tidtabellsfältet under spårplanen.':action==='begin'?(summary?.draft?.status==='reading'?'AI läser underlagen. Du kan fortsätta använda ställverket under tiden.':'Tolkningen är klar. Granska och rätta utkastet.'):'');return true;
    }catch(e){message(e.message);return false;}finally{busy=false;controls();}
  }
  async function load(force=false){
    if(loading||!online||!summary)return;
    if(dirty&&!force){$('reload').hidden=false;message('Utkastet har ändrats på servern. Dina osparade ändringar visas fortfarande. Läs in senaste för att ersätta dem.');return;}
    loading=true;loadingVersion=summary.sessionId+':'+summary.revision;
    try{const r=await fetch('/api/timetable-import');if(!r.ok)throw Error('Kunde inte läsa tidtabellsutkastet.');const next=await r.json();if(!dirty||force)adopt(next);}catch(e){message(e.message);$('reload').hidden=false;}finally{loading=false;}
  }
  function rowHTML(r,index){
    return `<article class="import-row"><label class="import-include"><input type="checkbox" data-row="${r.id}" data-field="included" ${r.included?'checked':''}> Ta med rad ${index+1}</label><details ${index===0||!r.trainNumber||r.uncertainties.length?'open':''}><summary>${esc(r.trainNumber||'Tågnummer saknas')} · ${esc(r.station||'Station saknas')} · ${esc(r.arrival||'—')} / ${esc(r.departure||'—')}${r.uncertainties.length?' · Kontrollera':''}</summary>${r.uncertainties.map(u=>`<p class="import-warning">${esc(u)}</p>`).join('')}<div class="import-grid">${Object.entries(fields).map(([key,label])=>`<label>${label}<${key==='note'?'textarea':'input'} data-row="${r.id}" data-field="${key}" maxlength="${key==='note'?2000:160}" ${key==='note'?'':`value="${esc(r[key])}"`}>${key==='note'?esc(r[key])+'</textarea>':''}</label>`).join('')}<label class="import-check"><input type="checkbox" data-row="${r.id}" data-field="noStop" ${r.noStop?'checked':''}> Passerar utan uppehåll</label></div><p class="muted">Underlag: ${r.sources.length?r.sources.map(s=>`<a href="${fileURL(doc.draft.id,s.file)}" target="_blank" rel="noopener">${esc(doc.draft.files[s.file-1].name)}, ${s.row?`${s.sheet?esc(s.sheet)+', ':''}rad ${s.row}`:`sida ${s.page}`}</a>`).join(' · '):'Manuell inmatning'}</p></details></article>`;
  }
  function render(){
    const d=doc.draft,manual=d?.kind==='manual';
    if(!d)$('draft').innerHTML='';
    else {
      const sources=d.files.map(f=>`<li><a href="${fileURL(d.id,f.id)}" target="_blank" rel="noopener">${esc(f.name)}</a> · ${Math.ceil(f.size/1024)} kB${f.mime.startsWith('image/')?`<details><summary>Visa bild</summary><img class="import-preview" loading="lazy" src="${fileURL(d.id,f.id)}" alt="Underlag ${esc(f.name)}"></details>`:''}</li>`).join('');
      $('draft').innerHTML=`<div class="card"><h2>${d.status==='reading'?'Läser underlagen…':d.status==='failed'?'Tolkningen kunde inte slutföras':manual?'Redigera egen tidtabell':'Granska tidtabellen'}</h2>${sources?`<ul class="import-sources">${sources}</ul>`:''}${d.error?`<p class="import-warning">${esc(d.error)}</p>`:''}${d.warnings.map(w=>`<p class="import-warning">${esc(w)}</p>`).join('')}${d.status==='review'?`<form id="ti-edit"><label>Tidtabellens namn<input id="ti-title" value="${esc(d.title)}" maxlength="200" required></label><p class="muted">${manual?'Skriv en rad per tågrörelse. Trafikdag kan exempelvis vara Dagl eller Lör. Avmarkera Ta med rad för rörelser som ska utgå.':'Kontrollera alla rader mot originalen. Rätta tomma eller osäkra uppgifter och uteslut dubbletter.'} En tom ankomst eller avgång betyder att den inte är angiven.</p>${d.rows.map(rowHTML).join('')||'<p>Inga tågrörelser hittades. Prova ett tydligare underlag.</p>'}<div class="actions"><button id="ti-save">Spara utkast</button>${manual?'<button id="ti-append" type="button">Lägg till tågrörelse</button>':''}</div></form><label class="import-check"><input id="ti-reviewed" type="checkbox"> ${manual?'Jag har kontrollerat tågrörelsernas tider, stationer, trafikdagar och spår.':'Jag har jämfört de valda raderna med underlagen och kontrollerat tider, stationer, trafikdagar och spår.'}</label><button id="ti-activate" type="button">Godkänn och använd tidtabellen</button><p class="muted">Ersätter den tidigare separata tidtabellen. TrainMeet-anslutningen behålls och kan väljas igen på den här sidan.</p>`:'<p class="muted">Den tidtabell som redan används påverkas inte.</p>'}<button id="ti-discard" type="button">Kasta utkast</button></div>`;
      if($('edit')){
        $('edit').addEventListener('input',()=>{dirty=true;$('reviewed').checked=false;controls();});
        const saveForm=async()=>{const rows=doc.draft.rows.map(r=>({...r}));for(const input of $('edit').querySelectorAll('[data-row]')){const row=rows.find(r=>r.id===input.dataset.row);row[input.dataset.field]=input.type==='checkbox'?input.checked:input.value;}return request('save',{title:$('title').value,rows});};
        $('edit').onsubmit=async e=>{e.preventDefault();await saveForm();};
        if($('append'))$('append').onclick=async()=>{if(!$('edit').reportValidity()||!await saveForm())return;if(await request('append'))$('edit').querySelectorAll('[data-field=\"trainNumber\"]')[doc.draft.rows.length-1]?.focus();};
        $('reviewed').onchange=controls;$('activate').onclick=()=>request('activate',{reviewed:$('reviewed').checked});
      }
      $('discard').onclick=()=>request('discard');
    }
    $('active').innerHTML=doc.active?`<h2>Sparad egen tidtabell</h2><p>${esc(doc.active.title)} · ${doc.active.rows.length} tågrörelser</p><p>${doc.source==='import'?'Visas i tidtabellsfältet under spårplanen.':'TrainMeet är vald källa. Den separata tidtabellen finns kvar att välja på den här sidan.'}</p><a href="#panel">Till ställverket →</a>${doc.active.kind==='manual'?'<button id="ti-edit-active" type="button">Redigera tidtabellen</button>':''}`:'<h2>Egen tidtabell</h2><p class="muted">Ingen egen tidtabell har godkänts ännu.</p>';
  }
  $('manual').onclick=async()=>{if(await request('manual'))$('title')?.focus();};
  $('table-upload').onsubmit=async e=>{
    e.preventDefault();const file=$('table-file').files[0];
    if(!file||!/\.(xlsx|csv)$/i.test(file.name)||!file.size||file.size>TABLE_FILE_BYTES){message('Välj en .xlsx eller .csv, högst 2 MB.');return;}
    busy=true;controls();message('Läser filen…');
    try{if(await request('table',{file:{name:file.name,data:await readFile(file)}})){$('table-file').value='';message('Filen är inläst. Granska tågrörelserna och godkänn när uppgifterna stämmer.');$('draft').scrollIntoView({behavior:'smooth',block:'start'});}}
    catch(e){message(e.message);}finally{busy=false;controls();}
  };
  $('active').addEventListener('click',async e=>{if(e.target.closest('#ti-edit-active')&&await request('edit'))$('title')?.focus();});
  $('files').onchange=()=>{$('files-list').textContent=[...$('files').files].map(f=>f.name+' ('+Math.ceil(f.size/1024)+' kB)').join(' · ');};
  $('upload').onsubmit=async e=>{
    e.preventDefault();const files=[...$('files').files];if(files.length<1||files.length>8||files.some(f=>f.size>8*1024*1024)||files.reduce((n,f)=>n+f.size,0)>16*1024*1024){message('Välj 1–8 filer, högst 8 MB per fil och 16 MB totalt.');return;}
    busy=true;controls();
    try{const uploaded=await Promise.all(files.map(async f=>({name:f.name,mime:f.type,data:await readFile(f)})));if(await request('begin',{stationHint:$('station').value,files:uploaded})){$('files').value='';$('files-list').textContent='';}}
    catch(e){message(e.message);}finally{busy=false;controls();}
  };
  $('reload').onclick=()=>{dirty=false;load(true);};
  controls();
  return {update(next,connected){online=connected;if(doc?.sessionId===next?.sessionId&&next.revision<doc.revision)return;summary=next;if(!summary)return;controls();if((shownSession!==summary.sessionId||shownRevision!==summary.revision)&&loadingVersion!==summary.sessionId+':'+summary.revision)load();}};
}
