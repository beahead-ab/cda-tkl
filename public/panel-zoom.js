import {createAdminDialog} from './admin-ui.js';
import {normalizeZoom,zoomGeometry} from './panel-layout.js';

export const ZOOM_KEY='charlottendal-panel-zoom-v1';
export const zoomLabel=value=>value===100?'100 % · Visa hela':`${value} %`;

// Local presentation only. Never subscribe to telemetry or send operating orders.
export function createPanelZoom({plan,viewport,stage}){
  let saved=100;try{saved=normalizeZoom(localStorage.getItem(ZOOM_KEY));}catch{}
  let value=saved,previous=null,frame=null,preview=null,restoreScroll=null;
  const listeners=new Set();
  function render(){
    frame=null;
    const w=viewport.clientWidth,h=viewport.clientHeight,box=plan.viewBox.baseVal;
    const next=zoomGeometry(w,h,box.width,box.height,value);if(!next)return;
    const offsetX=(next.stageWidth-next.width)/2,offsetY=(next.stageHeight-next.height)/2;
    if(previous&&['width','height','stageWidth','stageHeight'].every(k=>Math.abs(next[k]-previous[k])<.01)){restorePosition();return;}
    // Keep the viewed location in place while resizing. At 100% the whole plan fits.
    const x=previous?(viewport.scrollLeft+previous.viewportWidth/2-(previous.stageWidth-previous.width)/2)/previous.width:.5;
    const y=previous?(viewport.scrollTop+previous.viewportHeight/2-(previous.stageHeight-previous.height)/2)/previous.height:.5;
    stage.style.width=next.stageWidth+'px';stage.style.height=next.stageHeight+'px';
    plan.style.width=next.width+'px';plan.style.height=next.height+'px';
    viewport.scrollLeft=Math.max(0,offsetX+x*next.width-w/2);viewport.scrollTop=Math.max(0,offsetY+y*next.height-h/2);
    previous={...next,viewportWidth:w,viewportHeight:h};
    restorePosition();
  }
  function restorePosition(){if(restoreScroll){viewport.scrollLeft=restoreScroll.left;viewport.scrollTop=restoreScroll.top;restoreScroll=null;}}
  function schedule(){if(frame===null)frame=requestAnimationFrame(render);}
  function notify(){for(const fn of listeners)fn(saved);}
  new ResizeObserver(schedule).observe(viewport);
  render();
  window.addEventListener('storage',e=>{
    if(e.key!==ZOOM_KEY&&e.key!==null)return;
    saved=normalizeZoom(e.newValue);if(!preview){value=saved;schedule();}notify();
  });
  return {
    get value(){return saved;},
    subscribe(fn){listeners.add(fn);fn(saved);return ()=>listeners.delete(fn);},
    set(next){
      const n=normalizeZoom(next);
      try{localStorage.setItem(ZOOM_KEY,String(n));}catch{throw Error('Webbläsaren kunde inte spara zoomen. Kontrollera att lokal lagring är tillåten.');}
      saved=value=n;preview=restoreScroll=null;schedule();notify();
    },
    beginPreview(){restoreScroll=null;preview={left:viewport.scrollLeft,top:viewport.scrollTop};},
    preview(next){value=normalizeZoom(next);schedule();},
    cancelPreview(){value=saved;restoreScroll=preview;preview=null;schedule();},
  };
}

export function createZoomControl({id,onInput=()=>{}}){
  const element=document.createElement('div');element.className='panel-zoom-control';
  element.innerHTML=`<div class="zoom-value-row"><label for="${id}">Zoom</label><output for="${id}"></output></div><input id="${id}" type="range" min="50" max="300" step="5" aria-describedby="${id}-help"><div class="zoom-scale" aria-hidden="true"><span>50 %</span><span>300 %</span></div><button type="button" class="zoom-fit">Visa hela</button><p id="${id}-help" class="muted">100 % visar hela ställverket. Vid större zoom kan du rulla i spårplanen.</p>`;
  const input=element.querySelector('input'),output=element.querySelector('output');
  function set(n){input.value=normalizeZoom(n);output.value=zoomLabel(Number(input.value));input.setAttribute('aria-valuetext',output.value);}
  input.oninput=()=>{set(input.value);onInput(Number(input.value));};
  element.querySelector('button').onclick=()=>{set(100);onInput(100);};set(100);
  return {element,set,get value(){return Number(input.value);}};
}

export function createZoomDialog(zoom){
  const form=document.createElement('form');form.id='panel-zoom-form';
  const control=createZoomControl({id:'panel-zoom-range',onInput:value=>zoom.preview(value)});
  form.append(control.element);
  const note=document.createElement('p');note.className='muted';note.textContent='Förhandsvisning. Spara behåller zoomen i den här webbläsaren på enheten.';form.append(note);
  const save=document.createElement('button');save.type='submit';save.textContent='Spara';form.append(save);
  let initial;
  const modal=createAdminDialog({title:'Zoom på ställverket',body:form,saveButton:save,dirty:()=>control.value!==initial,onCancel:()=>zoom.cancelPreview()});
  modal.element.classList.add('panel-zoom-dialog');
  form.onsubmit=e=>{e.preventDefault();try{zoom.set(control.value);modal.close(true);}catch(error){modal.message(error.message);}};
  return {open(){initial=zoom.value;control.set(initial);if(modal.open())zoom.beginPreview();}};
}
