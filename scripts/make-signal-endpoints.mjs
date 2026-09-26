import fs from 'node:fs';
const source=JSON.parse(fs.readFileSync(new URL('../public/data/operations-source.json',import.meta.url)));
const endpoints=[];
for(const anchor of source.anchors)for(const direction of ['eastbound','westbound']){
  const sensor=anchor[direction+'sensor'],mast=anchor[direction+'signalmast'];
  if(sensor&&mast)endpoints.push({sensor,mast});
}
for(const {sensor,mast} of source.turnoutEnds)if(sensor&&mast)endpoints.push({sensor,mast});
const content=JSON.stringify({sourceHash:source.sourceHash,endpoints},null,2)+'\n';
const target=new URL('../public/data/signal-endpoints.json',import.meta.url);
if(process.argv.includes('--check')){
  if(fs.readFileSync(target,'utf8')!==content)throw Error('Signal endpoint source mapping is stale.');
}else fs.writeFileSync(target,content);
