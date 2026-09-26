// One administration window; the panel ellipsis opens the full workspace directly.
export function createAdminNavigation({account=false}={}) {
  const sidebar=document.getElementById('admin-sidebar'),button=document.getElementById('admin-nav-toggle'),panelButton=document.getElementById('menu-toggle');
  const prefix=account?'/':'';
  // Programmatic return/initial focus must not leave a mouse-operated control lit.
  document.addEventListener('pointerdown',()=>document.body.removeAttribute('data-nav-keyboard'),true);
  document.addEventListener('keydown',e=>{if(e.key==='Tab')document.body.setAttribute('data-nav-keyboard','');},true);
  const popup=document.getElementById('app-menu')||document.createElement('div');popup.id='app-menu';popup.className='shared-menu';popup.hidden=false;
  popup.innerHTML=`<div class="admin-nav-items"></div><div class="admin-nav-footer"><a id="open-panel-zoom" href="${prefix}#tools/zoom">Zoom <span id="menu-zoom-value"></span></a><button id="toggle-fullscreen" type="button" aria-pressed="false"><svg viewBox="0 0 20 20" aria-hidden="true"><path class="fullscreen-expand" d="M7 3H3v4m10-4h4v4M3 13v4h4m10-4v4h-4"/><path class="fullscreen-contract" d="M3 7h4V3m6 0v4h4M7 17v-4H3m10 4v-4h4"/></svg><span>Fullskärm</span></button><a id="field-link" hidden target="_blank" rel="noopener">Anläggningssimulator ↗</a><a id="account-link" href="/account" hidden>Byt lösenord</a><div id="admin-nav-status"></div><span id="panel-connection" hidden></span></div>`;
  sidebar.replaceChildren(popup);
  const sections=[
    ['#tools/operations','Driftverktyg','operations-tab',[['routes','Tågvägar'],['blocks','Spårspärrar'],['lines','Linjer och programmeringsspår'],['trains','Tågnummer'],['clock','Modellklocka'],['authority','Lokal- och fjärrläge']]],
    ['#trainmeet','TrainMeet','trainmeet-tab',[]],
    ['#import','Tidtabeller','import-tab',[['upload','Importera'],['edit','Redigera utkast']]],
    ['#tools/appearance','Utseende och ljud','tools-tab',[]],
    ['#register','Anläggningsregister','admin-tab',[['station','Anläggningsöversikt'],['destinations','Orter och telefonnummer'],['presentation','Visningsinställningar'],['bindings','Driftinställningar']]],
    ['#tools/journal','Händelser','journal-tab',[]],
    ['#advanced','Avancerat','advanced-tab',[['xml','XML-granskning'],['migration','Införandestatus'],['protocol','Protokollinspelning']]]
  ];
  for(const [hash,label,id,children] of sections){
    const group=document.createElement('div');group.className='admin-nav-group';group.dataset.section=hash;
    const link=document.createElement('a');link.href=prefix+hash;link.textContent=label;link.id=id;link.dataset.navHash=hash;
    if(children.length){const heading=document.createElement('h2');heading.className='admin-nav-heading';heading.append(link);group.append(heading);}else group.append(link);
    if(hash==='#trainmeet'){const status=document.createElement('span');status.id='menu-trainmeet-status';link.append(status);}
    if(children.length){const sub=document.createElement('div');sub.className='admin-nav-children';
      for(const [suffix,title] of children){const a=document.createElement('a');a.href=prefix+hash+'/'+suffix;a.textContent=title;a.dataset.navHash=hash+'/'+suffix;sub.append(a);}group.append(sub);}
    popup.querySelector('.admin-nav-items').append(group);
  }
  const connection=document.getElementById('connection');if(connection){connection.hidden=false;popup.querySelector('#admin-nav-status').append(connection);}
  const shell=document.createElement('section');shell.id='admin-shell';shell.hidden=true;shell.setAttribute('role','dialog');shell.setAttribute('aria-modal','true');shell.setAttribute('aria-label','Administration');
  const rail=document.createElement('aside');rail.className='admin-shell-rail';
  const header=document.querySelector('.app-header');if(header)rail.append(header);rail.append(sidebar);
  const content=document.createElement('div');content.id='admin-shell-content';
  for(const node of document.querySelectorAll('body>main:not(#panel-view),body>footer'))content.append(node);
  const exit=document.createElement('a');exit.id='admin-shell-close';exit.href=prefix+'#panel';exit.setAttribute('aria-label','Stäng administration');exit.innerHTML='<svg viewBox="0 0 20 20" aria-hidden="true"><path d="m5 5 10 10M15 5 5 15"/></svg>';
  shell.append(rail,content,exit);document.body.append(shell);document.body.classList.add('admin-shell-app');
  const shade=document.createElement('div');shade.id='admin-shell-shade';shade.hidden=true;document.body.append(shade);
  const panel=document.getElementById('panel-view');let lastAdmin='#tools/operations',wasOpen=false;
  function close(){return false;} // Legacy calls only closed the old small menu.
  function open(){location.hash=lastAdmin;}
  if(panelButton){panelButton.setAttribute('aria-controls','admin-shell');panelButton.setAttribute('aria-haspopup','dialog');panelButton.setAttribute('aria-label','Öppna administration');panelButton.onclick=open;}
  if(button)button.hidden=true;
  document.addEventListener('keydown',e=>{
    if(shell.hidden||document.querySelector('dialog[open]'))return;
    if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();exit.click();return;}
    if(e.key==='Tab'){
      const focusable=[...shell.querySelectorAll('a[href],button,input,select,textarea,[tabindex="0"]')].filter(n=>!n.disabled&&n.getClientRects().length);
      const first=focusable[0],last=focusable.at(-1);
      if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}
      else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}
    }
  },true);
  function sync(){
    const current=account?'account':location.hash.split('?')[0]||'#panel';
    const opened=current!=='#panel';shell.hidden=!opened;shade.hidden=!opened;if(panel)panel.inert=opened;
    document.body.toggleAttribute('data-admin-window',opened);if(panelButton)panelButton.setAttribute('aria-expanded',String(opened));
    if(opened&&!account)lastAdmin=location.hash;
    if(opened&&!wasOpen)queueMicrotask(()=>exit.focus({preventScroll:true}));
    if(!opened&&wasOpen)panelButton?.focus({preventScroll:true});wasOpen=opened;
    for(const group of sidebar.querySelectorAll('.admin-nav-group')){const hash=group.dataset.section,active=current===hash||current.startsWith(hash+'/');group.classList.toggle('active-group',active);}
    for(const a of sidebar.querySelectorAll('[data-nav-hash]')){if(a.dataset.navHash===current)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');}
    if(account)popup.querySelector('#account-link').setAttribute('aria-current','page');
  }
  function setAccount(enabled){popup.querySelector('#account-link').hidden=!enabled;}
  setAccount(account);sync();return {sync,setAccount,close};
}
