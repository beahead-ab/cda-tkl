import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {Topology} from '../src/topology.mjs';
import {RoutePolicy,attachSourceEndpoints} from '../src/route-policy.mjs';
import {selectRoutePaths,compatible} from '../src/route-selection.mjs';
const read=p=>JSON.parse(fs.readFileSync(new URL('../'+p,import.meta.url)));
const source=read('public/data/operations-source.json'),topology=new Topology(read('public/data/panel.json'));
attachSourceEndpoints(topology,source);
const policy=new RoutePolicy(source);
test('capacity preference retains more physical movements, independent of duplicate controls',()=>{
 const requests=policy.allowed().map(p=>policy.inspect(p.from,p.to));
 const a=selectRoutePaths(topology,source,requests),b=selectRoutePaths(topology,source,[...requests,...requests].reverse());
 const key=policy.inspect('htvCu','htvSpIIA').nxButtons.join('\0'),choices=a.get(key);
 assert.equal(choices.length,2);assert.equal(choices[0].path.settings.Vx110,'T');assert.equal(choices[0].path.settings.Vx100,'C');assert.ok(choices[0].preference.blockedMovements<choices[1].preference.blockedMovements);
 for(const [key,list]of a)assert.deepEqual(list.map(c=>c.path.path),b.get(key).map(c=>c.path.path));
});
test('resource compatibility includes detector aliases, companion locks, crossings and stop guards',()=>{
 const base=()=>({blocks:new Set(['sensor1']),turnouts:{A:'C',B:'C'},crossings:new Set(['X']),signals:new Set(['S1']),guards:new Set(['S2'])});
 const other=()=>({blocks:new Set(['sensor2']),turnouts:{B:'C'},crossings:new Set(['Y']),signals:new Set(['S3']),guards:new Set(['S4'])});
 assert.equal(compatible(base(),other()),true);
 for(const change of [o=>o.blocks.add('sensor1'),o=>o.turnouts.B='T',o=>o.crossings.add('X'),o=>o.signals.add('S1'),o=>o.signals.add('S2'),o=>o.guards.add('S1')]){const o=other();change(o);assert.equal(compatible(base(),o),false);assert.equal(compatible(o,base()),false);}
});
test('alternative search obeys locks and excludes occupied detector blocks',()=>{
 const [from,to]=policy.inspect('htvCu','htvSpIIA').nxButtons;
 const choices=topology.searchRoutes(from,to,{locks:{Vx100:'C'}});assert.equal(choices.length,1);assert.equal(choices[0].settings.Vx110,'T');
 assert.deepEqual(topology.searchRoutes(from,to,{blocked:new Set(['S110b']),locks:{Vx100:'C'}}),[]);
 assert.throws(()=>topology.searchRoutes(from,to,{limit:0}),/För många/);
});
