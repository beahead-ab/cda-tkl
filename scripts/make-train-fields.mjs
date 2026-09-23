import fs from 'node:fs';
const root=new URL('../',import.meta.url);
const read=file=>JSON.parse(fs.readFileSync(new URL(file,root),'utf8'));
const tree=read('public/data/source/tree.json'), index=read('public/data/source/index.json');
const value=(node,tag)=>node.children.find(n=>n.tag===tag)?.text;
const all=node=>[node,...node.children.flatMap(all)];
const nodes=all(tree), memories=new Map(nodes.filter(n=>n.tag==='memory').map(n=>[value(n,'userName'),n]));
const blockNodes=nodes.filter(n=>n.tag==='block');
const anchors=nodes.filter(n=>n.tag==='BlockContentsIcon').map((n,i)=>({id:'block-icon-'+i,key:'block:'+n.attrs.blockcontents,
  block:n.attrs.blockcontents,x:Number(n.attrs.x),y:Number(n.attrs.y),sourceHidden:n.attrs.hidden==='yes',sourcePath:n.path}));
const fields=nodes.filter(n=>n.tag==='layoutblock' && value(n,'userName')!=='frame').map(n=>{
  const name=value(n,'userName')||n.attrs.userName, memory=memories.get(name);
  const blocks=blockNodes.filter(b=>value(b,'userName')===name);
  return {key:'block:'+name,kind:'block',name,label:blocks.map(b=>value(b,'comment')).find(Boolean)||name,
    sourceSystem:blocks.map(b=>value(b,'systemName')||b.attrs.systemName).find(Boolean)||null,
    memorySystem:memory?value(memory,'systemName'):null,sourcePath:n.path,
    blockPaths:blocks.map(b=>b.path),memoryPath:memory?.path||null,anchors:anchors.filter(a=>a.block===name).map(a=>a.id)};
});
for(const n of nodes.filter(n=>n.tag==='memoryicon')) {
  const name=n.attrs.memory,memory=memories.get(name);
  if(!memory) throw Error('Minnesreferens saknas: '+name);
  fields.push({key:'incoming:'+name,kind:'incoming',name,label:name.replace(/(upp|ned)In$/,' · $1').replace(/In$/,''),
    sourceSystem:value(memory,'systemName'),sourcePath:n.path,memoryPath:memory.path,
    initialValue:memory.attrs.value??'',x:Number(n.attrs.x),y:Number(n.attrs.y),sourceHidden:n.attrs.hidden==='yes'});
}
for(const a of anchors) a.duplicate=anchors.filter(b=>b.key===a.key).length>1;
const output={sourceHash:index.meta.sha256,fields,anchors};
if(new Set(fields.map(f=>f.key)).size!==fields.length || fields.some(f=>!f.name)) throw Error('Ogiltiga eller dubbla informationsfält');
const file=new URL('public/data/train-fields.json',root),content=JSON.stringify(output,null,2)+'\n';
if(process.argv.includes('--check')) {if(fs.readFileSync(file,'utf8')!==content) throw Error('Inaktuellt tågnummerunderlag');}
else fs.writeFileSync(file,content);
console.log(`${fields.filter(f=>f.kind==='block').length} blockfält, ${fields.filter(f=>f.kind==='incoming').length} inkommande fält, ${anchors.length} källankare.`);
