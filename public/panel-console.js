// Move occasional operations into one dialog; opening it sends no orders.
export function createPanelConsole({onOpen,onResetComplete}) {
  const $=id=>document.getElementById(id),root=$('panel-console');
  root.innerHTML='<div id="panel-quick-actions"><button type="button" id="panel-reset">Återställ panel</button></div><div class="panel-runtime-info"><span id="panel-reset-status" role="status"></span><span id="panel-mode-status"></span><span id="panel-selection-slot"></span></div>';
  const drawer=document.createElement('dialog');drawer.id='panel-drawer';drawer.setAttribute('aria-labelledby','panel-drawer-title');
  drawer.innerHTML='<div class="panel-drawer-heading"><button type="button" id="panel-drawer-back">← Driftverktyg</button><h2 id="panel-drawer-title"></h2><button type="button" id="close-panel-drawer" aria-label="Stäng driftverktyg">Stäng</button></div><div id="panel-drawer-content"></div>';
  document.body.append(drawer);
  $('all-stop').textContent='Alla signaler i stopp';$('reset-ais').textContent='Återställ stopp';$('reset-ais').hidden=true;
  $('panel-selection-slot').append($('selection-hint'));
  const routes=document.createElement('section');routes.id='panel-route-tools';
  $('panel-drawer-content').append(routes);
  routes.innerHTML='<p class="muted">Välj huvudtågväg för vanlig trafik eller växeltågväg för växling. Använd start- och slutplupparna på panelen eller listvalet här. Samma val återtar vägen.</p>';
  routes.append($('route-activity'),$('route-catalog').closest('.card'));
  const routeActions=document.createElement('div');routeActions.className='admin-actions';routeActions.append($('clear-selection'),$('all-stop'),$('reset-ais'),$('emergency-cancel'));routes.append(routeActions);
  const emergencyHelp=document.createElement('p');emergencyHelp.className='muted';emergencyHelp.textContent='Nödåterta alla begär stopp och återtagning. Låsen ligger kvar tills spåren är fria och stopp samt växellägen är bekräftade.';routes.append(emergencyHelp);
  $('clear-selection').textContent='Avbryt startval';$('clear-selection').hidden=false;$('clear-selection').disabled=true;
  $('emergency-cancel').textContent='Nödåterta alla';$('route-mode').hidden=true;routes.append($('route-mode'));
  const authority=document.createElement('section');authority.id='panel-authority-tools';
  authority.innerHTML='<p class="muted">Fjärrläge spärrar lokal tågvägsläggning och växelmanöver. Ingen fjärrstyrning är ansluten ännu. Stopp och återtagning fungerar fortfarande.</p>';
  authority.append($('control-mode').closest('.authority-bar'));
  const overview=document.createElement('section');overview.id='panel-operations';overview.className='operation-overview';
  const descriptions=[
    ['panel-route-tools','Tågvägar','Välj typ av tågväg, använd listval och återta lagda vägar.'],
    ['track-block-tools','Spårspärrar','Hindra nya tågvägar över ett valt spåravsnitt.'],
    ['operating-controls','Linjer och programmeringsspår','Spärra en linje eller växla Lastspår 3 till programmeringsläge.'],
    ['train-information','Tågnummer','Ange tågidentitet och hantera nummerföljning i spårplanen.'],
    ['model-clock','Modellklocka','Ställ tid och hastighet för TKL:s lokala klocka.'],
    ['panel-authority-tools','Lokal- och fjärrläge','Manöverspärr för lokal drift. Ingen fjärrstyrning är ansluten.']
  ];
  for(const [id,title,description] of descriptions){const button=document.createElement('button');button.type='button';button.dataset.panelTool=id;button.setAttribute('aria-controls',id);button.innerHTML='<strong></strong><span></span>';button.querySelector('strong').textContent=title;button.querySelector('span').textContent=description;overview.append(button);}
  const blocks=$('toggle-block').closest('details');blocks.id='track-block-tools';
  const panes=[overview,routes,blocks,$('operating-controls'),$('train-information'),$('model-clock'),authority];
  for(const pane of panes){pane.hidden=true;$('panel-drawer-content').append(pane);}
  $('inspector-home').hidden=true;document.body.append($('inspector-home'));
  $('traffic-tools').remove();$('operating-tools').remove();
  let active=null,trigger=null,lastReset=null;
  function close(restore=false){if(drawer.open)drawer.close();for(const pane of panes)pane.hidden=true;active=null;if(restore)trigger?.focus({preventScroll:true});}
  function open(id,{toggle=false}={}){
    if(id==='trainmeet-timetable'){onOpen();$('trainmeet-timetable').focus({preventScroll:true});return true;}
    const pane=panes.find(p=>p.id===id);if(!pane)return false;
    const wasOpen=drawer.open;if(!wasOpen)trigger=document.activeElement;
    onOpen();if(toggle&&active===id){close(true);return true;}active=id;
    $('panel-drawer-title').textContent=id==='panel-operations'?'Driftverktyg':descriptions.find(d=>d[0]===id)[1];
    $('panel-drawer-back').hidden=id==='panel-operations';
    for(const p of panes){p.hidden=p!==pane;if(p===pane&&p.tagName==='DETAILS')p.open=true;}
    if(id==='train-information'&&$('train-editor'))$('train-editor').open=true;
    if(!drawer.open)drawer.showModal();$('close-panel-drawer').focus({preventScroll:true});return true;
  }
  drawer.addEventListener('click',e=>{const id=e.target.closest('[data-panel-tool]')?.dataset.panelTool;if(id)open(id);});
  $('panel-drawer-back').onclick=()=>open('panel-operations');$('close-panel-drawer').onclick=()=>close(true);
  drawer.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close(true);}});
  drawer.addEventListener('cancel',e=>{e.preventDefault();close(true);});
  return {open,close,update(state,online){
    const stopped=!!state.controls?.stopAll,remote=state.controls?.mode==='remote',shunt=$('route-mode').value==='shunt';
    const reset=state.panelReset,waiting=reset?.phase==='waiting';
    $('panel-reset').textContent=waiting?'Återställer…':'Återställ panel';
    $('panel-reset').disabled=!online||waiting||!!state.storageFault;
    $('panel-reset').setAttribute('aria-busy',String(waiting));
    $('panel-reset-status').textContent=['waiting','interrupted'].includes(reset?.phase)?reset.reason:'';
    if(reset?.phase==='complete'&&lastReset&&(lastReset.id!==reset.id||lastReset.phase!=='complete'))onResetComplete?.(reset.reason);
    lastReset=reset;
    $('all-stop').setAttribute('aria-pressed',String(stopped));$('reset-ais').hidden=!stopped;
    $('toggle-authority').setAttribute('aria-pressed',String(remote));$('toggle-authority').textContent=remote?'Återgå till lokal manövrering':'Spärra lokal manövrering';
    $('panel-mode-status').textContent=[remote?'Fjärrläge':'',shunt?'Växeltågväg':''].filter(Boolean).join(' · ');
    const routeButton=overview.querySelector('[data-panel-tool="panel-route-tools"] strong');routeButton.textContent=state.routes.length?`Tågvägar (${state.routes.length})`:'Tågvägar';
  }};
}
