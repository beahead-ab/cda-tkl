import test from 'node:test';
import assert from 'node:assert/strict';
import {UpdateCheck,newer} from '../src/update-check.mjs';

test('versions compare by number, not by text',()=>{
  assert.equal(newer('0.48.1','0.48.0'),true);assert.equal(newer('0.49.0','0.48.9'),true);assert.equal(newer('0.10.0','0.9.9'),true);
  assert.equal(newer('0.48.0','0.48.0'),false);assert.equal(newer('0.47.9','0.48.0'),false);
});

test('a newer release in cda-tkl-install is offered; the same or an older one is not',async()=>{
  let version='0.49.0';const urls=[];
  const check=new UpdateCheck({current:'0.48.0',kind:'raspberry-pi',now:()=>1000,fetcher:async url=>{urls.push(url);return new Response(JSON.stringify({version}));}});
  assert.deepEqual(await check.check(),{kind:'raspberry-pi',current:'0.48.0',latest:'0.49.0',available:true,newReleases:[],checkedAt:1000,error:'',canStart:true,run:null});
  assert.equal(urls[0],'https://raw.githubusercontent.com/beahead-ab/cda-tkl-install/main/package.json');
  version='0.48.0';assert.equal((await check.check()).available,false);
});

test('a failed check keeps the last answer and says why; a Mac or PC cannot start the update itself',async()=>{
  let fail=false;
  const check=new UpdateCheck({current:'0.48.0',kind:'mac',fetcher:async()=>{if(fail)throw Error('offline');return new Response('{"version":"0.48.2"}');}});
  await check.check();fail=true;const v=await check.check();
  assert.equal(v.available,true);assert.equal(v.latest,'0.48.2');assert.match(v.error,/offline/);assert.equal(v.canStart,false);
  await assert.rejects(async()=>new UpdateCheck({current:'1',kind:'linux'}),/Okänd installationstyp/);
});

test('what a newer release brings comes from its releases.json, newer entries only',async()=>{
  const releases=[{version:'0.58.0',date:'2026-10-05',notes:['Vad är nytt']},{version:'0.57.1',date:'2026-10-04',notes:['Äldre']}];
  const check=new UpdateCheck({current:'0.57.1',kind:'mac',fetcher:async url=>new Response(JSON.stringify(url.endsWith('releases.json')?releases:{version:'0.58.0'}))});
  assert.deepEqual((await check.check()).newReleases,[{version:'0.58.0',date:'2026-10-05',notes:['Vad är nytt']}]);
  const offline=new UpdateCheck({current:'0.57.1',kind:'mac',fetcher:async url=>{if(url.endsWith('releases.json'))throw Error('offline');return new Response('{"version":"0.58.0"}');}});
  const view=await offline.check();assert.equal(view.available,true);assert.deepEqual(view.newReleases,[]);assert.equal(view.error,'');
});

test('the web deployment can start its own update and reports the last run',async()=>{
  let text='{"phase":"failed","message":"0.58.0 startade inte. 0.57.1 är återställd.","at":"2026-10-05T18:00:00Z","from":"0.57.1","to":"0.58.0"}';
  const check=new UpdateCheck({current:'0.57.1',kind:'web',statusFile:'/state/update.json',readFile:()=>{if(text===null)throw Error('ENOENT');return text;},fetcher:async()=>new Response('{"version":"0.58.0"}')});
  const view=await check.check();
  assert.equal(view.canStart,true);
  assert.deepEqual(view.run,{phase:'failed',message:'0.58.0 startade inte. 0.57.1 är återställd.',at:'2026-10-05T18:00:00Z',from:'0.57.1',to:'0.58.0'});
  text=null;assert.equal(check.view().run,null,'no file, no last run');
  text='inte json';assert.equal(check.view().run,null);
  assert.equal(new UpdateCheck({current:'1.0.0',kind:'mac'}).view().canStart,false,'a Mac runs the line in Terminal');
});
