const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const status=value=>({none:'',approaching:'Närmar sig',arrived:'Ankommet',positioned:'Uppställt',ready:'Redo',departed:'Avgått'})[value]??value;

export function createTrainMeetTimetable({selectSource}) {
  const root=document.getElementById('trainmeet-timetable');
  root.innerHTML='<div class="timetable-choice"><label>Tidtabellskälla <select id="tt-source"><option value="trainmeet">TrainMeet</option><option value="import">Separat importerad</option></select></label><a href="#import">Importera tidtabell →</a></div><div class="trainmeet-heading"><strong id="tt-station">Tidtabell från TrainMeet</strong><span id="tt-clock"></span></div><p id="tt-status" role="status"></p><div id="tt-content"></div>';
  let last='',importState;
  document.getElementById('tt-source').onchange=e=>selectSource({sessionId:importState.sessionId,revision:importState.revision,source:e.target.value});
  return {update(state,online,imported){
    importState=imported;
    const local=imported?.source==='import',active=local?imported.active:null;
    const source=document.getElementById('tt-source');source.value=local?'import':'trainmeet';source.disabled=!online||!imported;source.options[1].disabled=!imported?.active;
    const c=local?(active?{station:{name:'Importerad tidtabell'},meet:active.title,day:'',tracks:[],operatingPoints:[],movements:[],trains:active.rows.map(r=>({id:r.id,train_number:r.trainNumber,station_name:r.station,day_label:r.day,arrival_time:r.arrival,departure_time:r.departure,arrival_from:r.from,departure_to:r.to,track:r.track,no_stop:r.noStop,note:r.note}))}:null):state?.context,stale=!online||!local&&state?.stale;
    root.classList.toggle('timetable-stale',!!c&&stale);
    document.getElementById('tt-station').textContent=c?[c.station.name,c.meet,c.day].filter(Boolean).join(' · '):(local?'Importerad tidtabell':'Tidtabell från TrainMeet');
    document.getElementById('tt-clock').textContent=c&&!local?'Träffklocka '+c.clock.time+' · '+(c.clock.running?'går':'pausad')+' · '+c.clock.rate+'×':'';
    document.getElementById('tt-status').textContent=c?(stale?'Kontakt saknas – senaste mottagna uppgifter.':(local?'Granskad separat tidtabell · ':'Hämtad från TrainMeet · ')+c.trains.length+(c.trains.length===1?' tågrörelse.':' tågrörelser.')): 'Ingen tidtabell hämtad.';
    let html='<p class="muted">Anslut stationen under <a href="#trainmeet">Meny → TrainMeet</a> för att hämta tidtabellen.</p>';
    if(c){
      const tracks=new Map(c.tracks.map(t=>[t.id,t])),points=new Map(c.operatingPoints.map(p=>[p.id,p.code])),movements=new Map(c.movements.map(m=>[m.id,m]));
      const trackName=id=>{const t=tracks.get(id);return t?[points.get(t.operatingPointId),t.label].filter(Boolean).join(' · '):'Okänt spår ('+id+')';};
      const rows=c.trains.map(t=>{
        const m=movements.get(t.id),changed=!!m?.track&&m.track!==t.track_id;
        const planned=t.track_id?trackName(t.track_id):(t.track||'—'),current=changed?trackName(m.track):planned;
        const stateLabel=local?'Planerad':[m?.arrival,m?.departure].filter(Boolean).map(status).filter(Boolean).join(' · ')||'—';
        return '<tr><th scope="row">'+esc(t.train_number)+(points.has(t.operating_point_id)?'<small>'+esc(points.get(t.operating_point_id))+'</small>':'')+(t.no_stop?'<small>Passerar</small>':'')+'</th>'+(local?'<td>'+esc(t.station_name)+'</td><td>'+esc(t.day_label)+'</td>':'')+'<td>'+esc(t.arrival_time||'—')+'</td><td>'+esc(t.departure_time||'—')+'</td><td>'+esc(t.arrival_from||'—')+'</td><td>'+esc(t.departure_to||'—')+'</td><td>'+esc(current)+(changed?'<small>Planerat: '+esc(planned)+'</small>':'')+'</td><td>'+esc(stateLabel)+'</td><td class="tt-note">'+esc(t.note||'—')+'</td></tr>';
      }).join('');
      html='<div class="timetable-scroll" tabindex="0" role="region" aria-label="Stationens tidtabell"><table class="timetable-table"><caption>'+esc(local?c.meet:'Tidtabell för '+c.day)+'</caption><thead><tr><th scope="col">Tåg</th>'+(local?'<th scope="col">Station</th><th scope="col">Trafikdag</th>':'')+'<th scope="col">Ankomst</th><th scope="col">Avgång</th><th scope="col">Från</th><th scope="col">Till</th><th scope="col">Spår</th><th scope="col">Driftläge</th><th scope="col">Anmärkning</th></tr></thead><tbody>'+(rows||'<tr><td colspan="8">Inga tågrörelser för stationen denna trafikdag.</td></tr>')+'</tbody></table></div>';
    }
    if(html!==last){last=html;document.getElementById('tt-content').innerHTML=html;}
  }};
}
