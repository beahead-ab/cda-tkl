import fs from 'node:fs';
// Only known on-disk profiles can be selected; callers cannot supply paths.
export function loadProfile(side='tkl',{activated=true}={}) {
  const selected=process.env.CHARLOTTENDAL_PROFILE || 'network';
  if(!['network','legacy'].includes(selected)) throw Error('Okänd anläggningsprofil.');
  const file=side==='field'?'simulator':'charlottendal';
  const base=JSON.parse(fs.readFileSync(new URL(`../profiles/${file}${selected==='network'?'-network':''}.json`,import.meta.url)));
  if(side!=='field'||!activated)return base;
  // Studio skriver den aktiverade fältprofilen till tillståndskatalogen; simulatorn följer den vid start.
  const dir=process.env.CHARLOTTENDAL_STATE_DIR||new URL('../var',import.meta.url).pathname;
  try{const active=JSON.parse(fs.readFileSync(dir+'/studio-field-profile.json','utf8'));if(active?.id===base.id)return active;}catch(e){if(e.code!=='ENOENT')throw e;}
  return base;
}
