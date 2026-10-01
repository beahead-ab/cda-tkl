// Status bar over the plan's empty top band: STÄLLVERK, the station line, the
// core's latest message as a chip, and on the right the gateway, simulation and
// zoom chips. It is drawn over the plan and takes no height from it. Presentation
// only; app.js hands it the texts, it sends nothing.
const esc=v=>String(v??'');
export function createPanelHead({shell,onZoom}){
  if(!shell)return null;
  const left=document.createElement('div');left.id='plan-head';
  left.innerHTML='<span class="plan-head-title">Ställverk</span><span class="plan-head-sub" id="plan-head-sub"></span><span class="chip chip-status" id="plan-head-status" role="status" hidden><i class="chip-dot" aria-hidden="true"></i><span></span></span>';
  const right=document.createElement('div');right.id='plan-head-right';
  right.innerHTML='<span class="chip" id="plan-head-gateway"><i class="chip-dot" aria-hidden="true"></i><span></span></span><span class="chip chip-sim" id="plan-head-sim" hidden>Simulering</span><button type="button" class="chip" id="plan-head-zoom" title="Zoom på ställverket"></button>';
  shell.append(left,right);
  const status=left.querySelector('#plan-head-status'),gateway=right.querySelector('#plan-head-gateway'),sim=right.querySelector('#plan-head-sim'),zoom=right.querySelector('#plan-head-zoom');
  zoom.onclick=()=>onZoom?.();
  let message=null,timer=0,last=null;
  function chip(node,text,tone){node.hidden=!text;node.dataset.tone=tone||'';node.querySelector('span').textContent=esc(text);node.title=esc(text);}
  function draw(){
    const shown=message||last?.status||null;
    chip(status,shown?.text,shown?.tone);
  }
  return {
    // The core's message while its toast is shown; errors read as alarms.
    message(text,error,duration){clearTimeout(timer);message=text?{text,tone:error?'alarm':'ok'}:null;if(text&&duration)timer=setTimeout(()=>{message=null;draw();},duration);draw();},
    zoom(value){zoom.textContent=value===100?'100 % · hela planen':value+' %';},
    update(data){
      last=data||null;if(!last)return;
      left.querySelector('#plan-head-sub').textContent=esc(last.subtitle);
      chip(gateway,last.gateway?.text,last.gateway?.tone);
      sim.hidden=!last.simulator;
      draw();
    }
  };
}
