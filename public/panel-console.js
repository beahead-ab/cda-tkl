// Reuse the existing controls and their handlers: opening a tray sends no orders.
export function createPanelConsole({onOpen}) {
  const $ = id => document.getElementById(id), root = $('panel-console');
  root.innerHTML = `<div class="panel-keyboard" aria-label="Ställverkets manöverknappar">
    <div class="panel-key-group" id="signal-keys"><h2>Signaler</h2></div>
    <div class="panel-key-group" id="route-keys"><h2>Tågvägar</h2><button type="button" class="panel-key" data-route-mode="main" aria-pressed="true">Huvudtågväg</button><button type="button" class="panel-key" data-route-mode="shunt" aria-pressed="false">Växeltågväg</button><button type="button" class="panel-key" data-panel-tool="panel-route-tools" aria-expanded="false" aria-controls="panel-route-tools">Tågvägar</button></div>
    <div class="panel-key-group" id="operation-keys"><h2>Drift</h2><button type="button" class="panel-key" data-panel-tool="track-block-tools" aria-expanded="false" aria-controls="track-block-tools">Spårspärrar</button><button type="button" class="panel-key" data-panel-tool="operating-controls" aria-expanded="false" aria-controls="operating-controls">Linjer / prog.</button><button type="button" class="panel-key" data-panel-tool="train-information" aria-expanded="false" aria-controls="train-information">Tågnummer</button><button type="button" class="panel-key" data-panel-tool="model-clock" aria-expanded="false" aria-controls="model-clock">Modellklocka</button></div>
    </div><div class="panel-control-status"><span id="panel-mode-status"></span><span id="panel-selection-slot"></span><span id="panel-mode-reason" class="muted"></span></div>
    <dialog id="panel-drawer" aria-labelledby="panel-drawer-title"><div class="panel-drawer-heading"><h2 id="panel-drawer-title"></h2><button type="button" id="close-panel-drawer" aria-label="Stäng manöverfält">Stäng</button></div><div id="panel-drawer-content"></div></dialog>`;
  for (const [target, ids] of [['signal-keys',['all-stop','reset-ais']],['route-keys',['clear-selection','emergency-cancel']],['operation-keys',['toggle-authority']]]) {
    for (const id of ids) {const button=$(id);button.classList.add('panel-key');$(target).append(button);}
  }
  $('all-stop').textContent='Alla signaler i stopp';$('reset-ais').textContent='Återställ stopp';
  $('clear-selection').textContent='Avbryt val';$('clear-selection').hidden=false;$('clear-selection').disabled=true;
  $('emergency-cancel').textContent='Nödåterta alla';$('toggle-authority').textContent='Fjärrmanövrering';
  $('route-mode').hidden=true;$('route-keys').append($('route-mode'));
  $('panel-selection-slot').append($('selection-hint'));
  $('panel-mode-status').append($('control-mode'));$('panel-mode-reason').append($('mode-reason'));
  const routes=document.createElement('section');routes.id='panel-route-tools';
  routes.append($('route-activity'),$('route-catalog').closest('.card'));
  const blocks=$('toggle-block').closest('details');blocks.id='track-block-tools';
  const panes=[routes,blocks,$('operating-controls'),$('train-information'),$('model-clock')];
  for (const pane of panes) {pane.hidden=true;$('panel-drawer-content').append(pane);}
  // The same object card is moved into the right-click modal when requested.
  $('inspector-home').hidden=true;document.body.append($('inspector-home'));
  $('traffic-tools').remove();$('operating-tools').remove();
  let active=null,trigger=null;
  function close(restore=false) {
    if($('panel-drawer').open)$('panel-drawer').close();for(const pane of panes)pane.hidden=true;
    for(const b of root.querySelectorAll('[data-panel-tool]'))b.setAttribute('aria-expanded','false');
    active=null;if(restore)trigger?.focus({preventScroll:true});
  }
  function open(id,{toggle=false}={}) {
    if(id==='trainmeet-timetable'){onOpen();$('trainmeet-timetable').scrollIntoView({block:'nearest'});$('trainmeet-timetable').focus({preventScroll:true});return true;}
    const pane=panes.find(p=>p.id===id);if(!pane)return false;
    onOpen();
    if(toggle&&active===id){close();return true;}
    active=id;trigger=root.querySelector(`[data-panel-tool="${id}"]`);
    $('panel-drawer-title').textContent=({ 'panel-route-tools':'Tågvägar och återtagning','track-block-tools':'Spårspärrar','operating-controls':'Linjespärrar och programmeringsspår','train-information':'Tågnummer och nummerföljning','model-clock':'Modellklocka','trainmeet-timetable':'Tidtabell' })[id];
    if(!$('panel-drawer').open)$('panel-drawer').showModal();
    for(const p of panes){p.hidden=p!==pane;if(p===pane&&p.tagName==='DETAILS')p.open=true;}
    for(const b of root.querySelectorAll('[data-panel-tool]'))b.setAttribute('aria-expanded',String(b===trigger));
    if(id==='train-information'&&$('train-editor'))$('train-editor').open=true;
    $('close-panel-drawer').focus({preventScroll:true});return true;
  }
  root.addEventListener('click',e=>{const id=e.target.closest('[data-panel-tool]')?.dataset.panelTool;if(id)open(id,{toggle:true});});
  $('close-panel-drawer').onclick=()=>close(true);
  $('panel-drawer').addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close(true);}});
  $('panel-drawer').addEventListener('cancel',e=>{e.preventDefault();close(true);});
  return {open,close,update(state) {
    $('all-stop').setAttribute('aria-pressed',String(!!state.controls?.stopAll));
    $('toggle-authority').setAttribute('aria-pressed',String(state.controls?.mode==='remote'));
    const routeButton=root.querySelector('[data-panel-tool="panel-route-tools"]');
    routeButton.textContent=state.routes.length?`Tågvägar (${state.routes.length})`:'Tågvägar';
    for(const b of root.querySelectorAll('[data-route-mode]'))b.setAttribute('aria-pressed',String(b.dataset.routeMode===$('route-mode').value));
  }};
}
