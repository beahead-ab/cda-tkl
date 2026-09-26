// The same navigation stays mounted while overview and editing workspaces change.
export function createAdminNavigation({account=false}={}) {
  const sidebar=document.getElementById('admin-sidebar'),button=document.getElementById('admin-nav-toggle');
  const prefix=account?'/':'';
  sidebar.innerHTML=`<a class="admin-panel-link" href="${prefix}#panel"><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M16 10H4m5-5-5 5 5 5"/></svg>Ställverket</a><span class="admin-nav-label">Administration</span><div class="admin-nav-items"></div><div class="admin-nav-footer"><a data-account href="/account" hidden>Byt lösenord</a><div id="admin-nav-status"></div></div>`;
  const sections=[
    ['#import','Tidtabeller',[['upload','Importera'],['edit','Redigera utkast']]],
    ['#trainmeet','TrainMeet',[]],
    ['#register','Anläggningsregister',[['presentation','Visningsinställningar'],['bindings','Driftinställningar']]],
    ['#tools/appearance','Utseende och ljud',[]],
    ['#tools/journal','Händelser',[]],
    ['#advanced','Avancerat',[['xml','XML-granskning'],['migration','Införandestatus'],['protocol','Protokollinspelning']]]
  ];
  for(const [hash,label,children] of sections){
    const group=document.createElement('div');group.className='admin-nav-group';group.dataset.section=hash;
    const link=document.createElement('a');link.href=prefix+hash;link.textContent=label;link.dataset.navHash=hash;group.append(link);
    if(children.length){const sub=document.createElement('div');sub.className='admin-nav-children';sub.hidden=true;
      for(const [suffix,title] of children){const a=document.createElement('a');a.href=prefix+hash+'/'+suffix;a.textContent=title;a.dataset.navHash=hash+'/'+suffix;sub.append(a);}group.append(sub);}
    sidebar.querySelector('.admin-nav-items').append(group);
  }
  const connection=document.getElementById('connection');if(connection){connection.hidden=false;sidebar.querySelector('#admin-nav-status').append(connection);}
  const shade=document.createElement('div');shade.id='admin-nav-shade';shade.hidden=true;document.body.append(shade);
  const compact=matchMedia('(max-width:539px)');
  function close(restore=false){document.body.removeAttribute('data-admin-nav-open');shade.hidden=true;button.setAttribute('aria-expanded','false');button.setAttribute('aria-label','Öppna sidomenyn');if(restore)button.focus();}
  function open(){document.body.dataset.adminNavOpen='true';shade.hidden=false;button.setAttribute('aria-expanded','true');button.setAttribute('aria-label','Stäng sidomenyn');(sidebar.querySelector('a[aria-current=page]')||sidebar.querySelector('a')).focus();}
  button.onclick=()=>document.body.dataset.adminNavOpen?close(true):open();shade.onclick=()=>close(true);
  sidebar.addEventListener('click',e=>{if(e.target.closest('a'))close();});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&document.body.dataset.adminNavOpen&&!document.querySelector('dialog[open]')){e.preventDefault();e.stopImmediatePropagation();close(true);}},true);
  document.addEventListener('focusin',e=>{if(document.body.dataset.adminNavOpen&&!sidebar.contains(e.target)&&!button.contains(e.target)&&!document.querySelector('dialog[open]'))close();});
  compact.addEventListener('change',()=>close());
  function sync(){
    close();const current=account?'account':location.hash.split('?')[0]||'#panel';
    for(const group of sidebar.querySelectorAll('.admin-nav-group')){
      const hash=group.dataset.section,active=current===hash||current.startsWith(hash+'/');group.classList.toggle('active-group',active);
      const sub=group.querySelector('.admin-nav-children');if(sub)sub.hidden=!active;
    }
    for(const a of sidebar.querySelectorAll('[data-nav-hash]')){if(a.dataset.navHash==='#import/edit')a.hidden=current==='#import/upload'||current==='#import';if(a.dataset.navHash===current)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');}
    const accountLink=sidebar.querySelector('[data-account]');if(account)accountLink.setAttribute('aria-current','page');
    for(const a of document.querySelectorAll('#app-menu a[href^="#"]')){
      const href=a.getAttribute('href'),active=(current===href||current.startsWith(href+'/'))&&(!a.dataset.toolsSection||href!=='#panel')&&a.id!=='open-panel-zoom';
      a.classList.toggle('selected',active);if(active)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');
    }
  }
  function setAccount(enabled){sidebar.querySelector('[data-account]').hidden=!enabled;}
  setAccount(account);sync();return {sync,setAccount};
}
