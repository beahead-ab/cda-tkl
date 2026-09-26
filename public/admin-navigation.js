// One mounted menu serves the panel drawer and every administration workspace.
export function createAdminNavigation({account=false}={}) {
  const sidebar=document.getElementById('admin-sidebar'),button=document.getElementById('admin-nav-toggle'),panelButton=document.getElementById('menu-toggle');
  const prefix=account?'/':'';
  const popup=document.getElementById('app-menu')||document.createElement('div');popup.id='app-menu';popup.className='shared-menu';popup.hidden=false;
  popup.innerHTML=`<div class="admin-nav-items"></div><div class="admin-nav-footer"><a id="open-panel-zoom" href="${prefix}#tools/zoom">Zoom <span id="menu-zoom-value"></span></a><button id="toggle-fullscreen" type="button" aria-pressed="false"><svg viewBox="0 0 20 20" aria-hidden="true"><path class="fullscreen-expand" d="M7 3H3v4m10-4h4v4M3 13v4h4m10-4v4h-4"/><path class="fullscreen-contract" d="M3 7h4V3m6 0v4h4M7 17v-4H3m10 4v-4h4"/></svg><span>Fullskärm</span></button><a id="field-link" hidden target="_blank" rel="noopener">Anläggningssimulator ↗</a><a id="account-link" href="/account" hidden>Byt lösenord</a><div id="admin-nav-status"></div><span id="panel-connection" hidden></span></div>`;
  sidebar.replaceChildren(popup);
  const sections=[
    ['#panel','Ställverket','panel-tab',[]],
    ['#tools/operations','Driftverktyg','operations-tab',[['routes','Tågvägar'],['blocks','Spårspärrar'],['lines','Linjer och programmeringsspår'],['trains','Tågnummer'],['clock','Modellklocka'],['authority','Lokal- och fjärrläge']]],
    ['#trainmeet','TrainMeet','trainmeet-tab',[]],
    ['#import','Tidtabeller','import-tab',[['upload','Importera'],['edit','Redigera utkast']]],
    ['#tools/appearance','Utseende och ljud','tools-tab',[]],
    ['#register','Anläggningsregister','admin-tab',[['presentation','Visningsinställningar'],['bindings','Driftinställningar']]],
    ['#tools/journal','Händelser','journal-tab',[]],
    ['#advanced','Avancerat','advanced-tab',[['xml','XML-granskning'],['migration','Införandestatus'],['protocol','Protokollinspelning']]]
  ];
  for(const [hash,label,id,children] of sections){
    const group=document.createElement('div');group.className='admin-nav-group';group.dataset.section=hash;
    const link=document.createElement('a');link.href=prefix+hash;link.textContent=label;link.id=id;link.dataset.navHash=hash;group.append(link);
    if(hash==='#panel')link.className='admin-panel-link';
    if(hash==='#trainmeet'){const status=document.createElement('span');status.id='menu-trainmeet-status';link.append(status);}
    if(children.length){const sub=document.createElement('div');sub.className='admin-nav-children';sub.hidden=true;
      for(const [suffix,title] of children){const a=document.createElement('a');a.href=prefix+hash+'/'+suffix;a.textContent=title;a.dataset.navHash=hash+'/'+suffix;sub.append(a);}group.append(sub);}
    popup.querySelector('.admin-nav-items').append(group);
  }
  const connection=document.getElementById('connection');if(connection){connection.hidden=false;popup.querySelector('#admin-nav-status').append(connection);}
  const shade=document.createElement('div');shade.id='admin-nav-shade';shade.hidden=true;document.body.append(shade);
  const compact=matchMedia('(max-width:539px)');
  const drawer=()=>document.body.dataset.page==='panel'||compact.matches;
  const trigger=()=>document.body.dataset.page==='panel'?panelButton:button;
  function close(restore=false){const wasOpen=!!document.body.dataset.adminNavOpen;document.body.removeAttribute('data-admin-nav-open');shade.hidden=true;for(const b of [button,panelButton].filter(Boolean)){b.setAttribute('aria-expanded','false');b.setAttribute('aria-label','Öppna meny');}if(restore&&wasOpen)trigger()?.focus({preventScroll:true});return wasOpen;}
  function open(){document.body.dataset.adminNavOpen='true';shade.hidden=false;trigger()?.setAttribute('aria-expanded','true');trigger()?.setAttribute('aria-label','Stäng meny');(sidebar.querySelector('a[aria-current=page]')||sidebar.querySelector('a')).focus();}
  for(const b of [button,panelButton].filter(Boolean)){b.setAttribute('aria-controls','admin-sidebar');b.onclick=()=>document.body.dataset.adminNavOpen?close(true):open();b.addEventListener('keydown',e=>{if(e.key==='ArrowDown'){e.preventDefault();open();}});}
  shade.onclick=()=>close(true);sidebar.addEventListener('click',e=>{if(e.target.closest('a,button')&&drawer())close();});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&document.body.dataset.adminNavOpen&&!document.querySelector('dialog[open]')){e.preventDefault();e.stopImmediatePropagation();close(true);}},true);
  document.addEventListener('focusin',e=>{if(document.body.dataset.adminNavOpen&&!sidebar.contains(e.target)&&![button,panelButton].some(b=>b?.contains(e.target))&&!document.querySelector('dialog[open]'))close();});
  compact.addEventListener('change',()=>close());
  function sync(){
    close();const current=account?'account':location.hash.split('?')[0]||'#panel';
    for(const group of sidebar.querySelectorAll('.admin-nav-group')){const hash=group.dataset.section,active=current===hash||current.startsWith(hash+'/');group.classList.toggle('active-group',active);const sub=group.querySelector('.admin-nav-children');if(sub)sub.hidden=!active;}
    for(const a of sidebar.querySelectorAll('[data-nav-hash]')){if(a.dataset.navHash==='#import/edit')a.hidden=current!=='#import/edit';if(a.dataset.navHash===current)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');}
    if(account)popup.querySelector('#account-link').setAttribute('aria-current','page');
  }
  function setAccount(enabled){popup.querySelector('#account-link').hidden=!enabled;}
  setAccount(account);sync();return {sync,setAccount,close};
}
