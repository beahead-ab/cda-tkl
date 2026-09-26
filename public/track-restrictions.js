// Display reservations by detector address, including every visual alias.
// This does not change occupancy or grant any movement authority.
export function trackRestrictions(config,state) {
  const result=new Map();
  const add=(names,reason)=>{for(const name of names||[]){const address=config.blocks[name]?.address;if(address==null)continue;const reasons=result.get(address)||[];if(!reasons.includes(reason))reasons.push(reason);result.set(address,reasons);}};
  add(state?.controls?.blocked,'Administrativ spårspärr');
  for(const line of state?.operating?.lines||[])if(line.blocked)add(line.blocks,'Linjespärr · '+line.label);
  if(state?.operating?.programming?.reserved){const p=config.operatingControls?.programming;add([...(p?.blocks||[]),config.turnouts[p?.turnout]?.block],'Programmeringsspärr');}
  return result;
}

// One fixed marker per detector on its longest visible piece avoids clutter
// from the many short XML segments. Prefer plain rail over a turnout leg.
export function restrictionMarkers(panel,config) {
  const candidates=new Map();
  const add=(block,x1,y1,x2,y2,turnout=false)=>{
    const address=config.blocks[block]?.address,length=Math.hypot(x2-x1,y2-y1);
    if(address==null||length<12)return;
    const score=length+(turnout?0:10000),old=candidates.get(address);
    if(old&&old.score>=score)return;
    candidates.set(address,{address,block,x:(x1+x2)/2,y:(y1+y2)/2,angle:Math.atan2(y2-y1,x2-x1)*180/Math.PI,score});
  };
  for(const s of panel.segs)if(!s.hide&&s.b!=='frame'&&Math.min(s.y1,s.y2)<850)add(s.b,s.x1,s.y1,s.x2,s.y2);
  for(const t of Object.values(panel.turnouts))if(t.cy<=850)for(const [x,y] of [[t.ax,t.ay],[t.bx,t.by],[t.ccx,t.ccy]])add(t.block,t.cx,t.cy,x,y,true);
  return [...candidates.values()];
}
