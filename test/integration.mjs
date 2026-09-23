import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import net from 'node:net';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('..', import.meta.url));
async function freePort() { const s = net.createServer(); await new Promise((ok, no) => { s.once('error', no); s.listen(0, '127.0.0.1', ok); }); const p = s.address().port; await new Promise(r => s.close(r)); return p; }
async function until(fn, timeout = 10000) { const end = Date.now() + timeout; let error; while (Date.now() < end) { try { const result = await fn(); if (result) return result; } catch (e) { error = e; } await new Promise(r => setTimeout(r, 100)); } throw error || Error('Timed out waiting for state'); }
test('network profile runs parallel trains across separate processes and releases only after passage', { timeout: 45000 }, async () => {
  const [httpPort, simPort, wirePort] = await Promise.all([freePort(), freePort(), freePort()]);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'charlottendal-network-'));
  const env = { ...process.env, CHARLOTTENDAL_PROFILE: 'network', CHARLOTTENDAL_AUTH_MODE: 'cloudflare', CHARLOTTENDAL_PUBLIC_ORIGIN: '',
    CHARLOTTENDAL_PORT: String(httpPort), CHARLOTTENDAL_SIM_PORT: String(simPort), CHARLOTTENDAL_WIRE_PORT: String(wirePort), CHARLOTTENDAL_STATE_DIR: dir };
  let output = ''; const children = [];
  const launch = file => { const child = spawn(process.execPath, [file], { cwd: root, env }); children.push(child); child.stdout.on('data', d => output += d); child.stderr.on('data', d => output += d); return child; };
  const get = async port => (await fetch(`http://127.0.0.1:${port}/api/state`)).json();
  const post = async (port, command, data, expected = 200) => {
    const response = await fetch(`http://127.0.0.1:${port}/api/${command}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    const result = await response.json(); assert.equal(response.status, expected, JSON.stringify(result)); return result;
  };
  try {
    launch('src/simulator.mjs'); launch('src/server.mjs');
    await until(async () => { const s = await get(httpPort); return s.connection === 'connected' && s.blocks.S100.occupied === false; });
    const staged=await post(httpPort,'configuration/save',{revision:0,key:'signals:1/1',name:'Infart Cu',description:'Provad visningsändring'});
    assert.equal(staged.changes.length,2);
    await post(httpPort,'configuration/save',{revision:0,key:'signals:1/1',name:'Föråldrad',description:''},409);
    for (const [from, to] of [['htvCu','htvSpIA'], ['htvAn','htvSpIIA']]) await post(httpPort, 'route', { from, to });
    await until(async () => { const s = await get(httpPort); return s.routes.length === 2 && s.routes.every(r => r.state === 'active'); });
    await post(httpPort,'configuration/activate',{revision:1,reason:'Spärrat aktiveringsförsök'},409);
    await post(httpPort, 'turnout', { name:'Vx102', position:'T' }, 400);
    await post(httpPort, 'turnout', { name:'Vx170', position:'T' });
    await until(async () => (await get(httpPort)).turnouts.Vx170.position==='T');
    await post(httpPort, 'turnout', { name:'Vx114', position:'T' }, 400);
    await post(httpPort, 'route', { from:'htvAn', to:'htvSpIA' }, 400);
    const ready = await get(httpPort);
    for (const r of ready.routes) await post(simPort, 'train', { id:r.definitionId });
    await until(async () => (await get(simPort)).trains.length === 2);
    await until(async () => (await get(httpPort)).routes.every(r => r.state === 'traversing'));
    await until(async () => { const s = await get(httpPort); return !s.routes.length; }, 22000);
    assert.equal((await get(simPort)).trains.length, 0);
    const activated=await post(httpPort,'configuration/activate',{revision:1,reason:'Namn på infart'});
    assert.equal(activated.active.activeVersion,1);
    const presentation=await (await fetch(`http://127.0.0.1:${httpPort}/api/presentation`)).json();
    assert.equal(presentation.overrides['signals:1/1'].name,'Infart Cu');
    assert.equal((await get(httpPort)).configurationVersion,1);
    await post(httpPort,'configuration/restore',{revision:2,version:0});
    await post(httpPort,'configuration/activate',{revision:3,reason:'Återställ original'});
    assert.equal(JSON.parse(fs.readFileSync(path.join(dir,'configuration.json'))).versions.length,3);

    const trainView=await (await fetch(`http://127.0.0.1:${httpPort}/api/train-information`)).json();
    assert.equal(trainView.fields.length,204);assert.equal(trainView.anchors.length,44);
    const bookRequest=(view,keys)=>({revision:view.revision,sessionId:view.sessionId,epochs:Object.fromEntries(keys.map(key=>[key,view.epochs[key]||0]))});
    const oldBook=bookRequest(trainView,['incoming:CuppIn']);
    let book=await post(httpPort,'train-information/save',{...oldBook,key:'incoming:CuppIn',value:'P777'});
    await post(httpPort,'train-information/save',{...oldBook,key:'incoming:CuppIn',value:'Lost edit'},409);
    book=await post(httpPort,'train-information/move',{...bookRequest(book,['incoming:CuppIn','block:SIA']),from:'incoming:CuppIn',to:'block:SIA'});
    assert.equal(book.entries['block:SIA'].source,'manual');assert.equal(book.entries['incoming:CuppIn'],undefined);
    assert.equal((await get(httpPort)).blocks.SIA.occupied,false);assert.equal((await get(httpPort)).routes.length,0);
    await post(simPort,'block',{name:'SIA',occupied:true});
    await until(async ()=>(await get(httpPort)).trainInformation.entries['block:SIA'].needsReview);
    await post(httpPort,'train-information/save',{...bookRequest(book,['block:SIA']),key:'block:SIA',value:'P777'},409);
    await post(simPort,'block',{name:'SIA',occupied:false});
    await until(async ()=>(await get(httpPort)).blocks.SIA.occupied===false);
    book=(await get(httpPort)).trainInformation;
    await post(httpPort,'train-information/save',{...bookRequest(book,['block:SIA']),key:'block:SIA',value:''});

    assert.equal(JSON.parse(fs.readFileSync(path.join(dir,'routes.json'))).routes.length, 0);
    await post(httpPort, 'track-block', { name:'SIA', blocked:true });
    await post(httpPort, 'route', { from:'htvCu', to:'htvSpIA' }, 400);
    assert.equal((await get(httpPort)).blocks.SIA.occupied, false);
    await post(httpPort, 'track-block', { name:'SIA', blocked:false });
    await post(httpPort, 'all-stop', { enabled:true });
    await post(httpPort, 'route', { from:'htvAn', to:'htvSpIIA' }, 400);
    await until(async () => Object.values((await get(httpPort)).signals).every(s => s.aspect === 'stop' && s.reportSequence > s.commandSequence));
    await post(httpPort, 'all-stop', { enabled:false });
    await post(httpPort, 'route', { from:'tvv3/6', to:'tvv3/8' });
    await until(async () => (await get(httpPort)).routes[0]?.state === 'active');
    await post(httpPort, 'route', { from:'tvv3/6', to:'tvv3/8' });
    await until(async () => !(await get(httpPort)).routes.length);
    await post(httpPort,'control-mode',{mode:'remote'});
    assert.equal((await get(httpPort)).controls.mode,'remote');
    await post(httpPort,'route',{from:'htvCu',to:'htvSpIA'},400);
    await post(httpPort,'turnout',{name:'Vx170',position:'C'},400);
    await post(httpPort,'emergency-cancel',{});
    await until(async () => Object.values((await get(httpPort)).signals).every(s=>s.aspect==='stop'&&s.reportSequence>s.commandSequence));
    await post(httpPort,'all-stop',{enabled:false});
    await post(httpPort,'control-mode',{mode:'local'});
    await post(httpPort,'route',{from:'htvCu',to:'htvSpIA'});
    await until(async () => (await get(httpPort)).routes[0]?.state==='active');
    await post(simPort,'block',{name:'SIA',occupied:true});
    await until(async () => (await get(httpPort)).blocks.SIA.occupied===true);
    await post(httpPort,'emergency-cancel',{});
    assert.equal((await get(httpPort)).emergencyRemaining.length,1);
    await post(httpPort,'all-stop',{enabled:false},400);
    await post(simPort,'block',{name:'SIA',occupied:false});
    await until(async () => !(await get(httpPort)).routes.length);
    assert.equal((await get(httpPort)).controls.stopAll,true);
    await until(async () => (await get(httpPort)).allStopReset.allowed);
    await post(httpPort,'all-stop',{enabled:false});
  } catch (e) { e.message += '\nChild output: ' + output; throw e; }
  finally { await Promise.all(children.filter(c => c.exitCode === null).map(c => new Promise(resolve => { c.once('exit', resolve); c.kill('SIGTERM'); }))); fs.rmSync(dir, { recursive:true, force:true }); }
});
test('separate processes exchange LocoNet, reject conflicts, persist locks and recover safely', { timeout: 40000 }, async () => {
  const [httpPort, simPort, wirePort] = await Promise.all([freePort(), freePort(), freePort()]);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'charlottendal-integration-'));
  const children = []; let output = '';
  const env = { ...process.env, CHARLOTTENDAL_PROFILE:'legacy', CHARLOTTENDAL_AUTH_MODE: 'cloudflare', CHARLOTTENDAL_PORT: String(httpPort), CHARLOTTENDAL_SIM_PORT: String(simPort), CHARLOTTENDAL_WIRE_PORT: String(wirePort), CHARLOTTENDAL_STATE_DIR: dir,
    CHARLOTTENDAL_PUBLIC_ORIGIN: '', CHARLOTTENDAL_FIELD_URL: '/anlaggning/', CHARLOTTENDAL_TKL_URL: '/' };
  const launch = file => { const c = spawn(process.execPath, [file], { cwd: root, env }); c.stdout.on('data', d => output += d); c.stderr.on('data', d => output += d); children.push(c); return c; };
  const get = async (port, url = '/api/state') => { const r = await fetch(`http://127.0.0.1:${port}${url}`); assert.equal(r.status, 200); return r.json(); };
  const post = async (port, url, data, expected = 200, headers = {}) => { const r = await fetch(`http://127.0.0.1:${port}/api/${url}`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(data) }); assert.equal(r.status, expected); return r.json(); };
  try {
    launch('src/simulator.mjs'); let backend = launch('src/server.mjs');
    await until(async () => { const s = await get(httpPort); return s.connection === 'connected' && s.blocks.S121.occupied === false; });
    assert.equal((await get(httpPort, '/api/config')).fieldUrl, '/anlaggning/');
    assert.equal((await get(simPort, '/api/config')).tklUrl, '/');
    const head = await fetch(`http://127.0.0.1:${httpPort}/api/events`, { method: 'HEAD', signal: AbortSignal.timeout(1000) });
    assert.equal(head.status, 200);
    await post(httpPort, 'route', { from: 'htvSpIIB', to: 'htvSpIIA' }, 400, { Origin: 'https://untrusted.invalid' });
    await post(httpPort, 'route', { from: 'htvSpIIB', to: 'htvSpIIA' });
    await until(async () => (await get(httpPort)).routes[0]?.state === 'active');
    await post(httpPort, 'turnout', { name: 'Vx121', position: 'T' }, 400);
    await post(httpPort, 'route', { from: 'htvSpIIA', to: 'htvSpIIB' }, 400);
    await post(httpPort, 'note', { key: 'signals:0', note: 'Integrationstest åäö <text>' });
    backend.kill('SIGTERM'); await new Promise(r => backend.once('exit', r)); backend = launch('src/server.mjs');
    await until(async () => { const s = await get(httpPort); return s.connection === 'connected' && s.signals['2/8'].aspect === 'stop' && s.routes[0]?.state === 'held'; });
    assert.equal((await get(httpPort, '/api/config')).notes['signals:0'], 'Integrationstest åäö <text>');
    let s = await get(httpPort); await post(httpPort, 'cancel', { id: s.routes[0].id }); await until(async () => !(await get(httpPort)).routes.length);
    await post(httpPort, 'route', { from: 'htvCu', to: 'htvSpIIB' }); await until(async () => (await get(httpPort)).routes[0]?.state === 'active');
    s = await get(httpPort); const go = s.events.filter(e => e.kind === 'permission' && e.message.includes('körmedgivande')).map(e => e.message);
    assert.ok(go[0].includes('1/5')); assert.ok(go[1].includes('2/7'));
    await post(simPort, 'block', { name: 'S100', occupied: true }); await until(async () => (await get(httpPort)).routes[0]?.state === 'occupied');
    s = await get(httpPort); await post(httpPort, 'cancel', { id: s.routes[0].id }); assert.equal((await get(httpPort)).routes.length, 1);
    await post(simPort, 'block', { name: 'S100', occupied: false }); await until(async () => !(await get(httpPort)).routes.length);
    await post(simPort, 'link', { connected: false }); await until(async () => (await get(httpPort)).connection === 'disconnected');
    assert.equal((await get(httpPort)).blocks.S100.occupied, null);
    await post(simPort, 'link', { connected: true }); await until(async () => (await get(httpPort)).blocks.S100.occupied === false);
  } catch (e) { e.message += '\nChild output: ' + output; throw e; }
  finally { await Promise.all(children.filter(c => c.exitCode === null).map(c => new Promise(r => { c.once('exit', r); c.kill('SIGTERM'); }))); fs.rmSync(dir, { recursive: true, force: true }); }
});

test('both public servers protect pages and controls even when the edge is bypassed', { timeout: 15000 }, async () => {
  const [httpPort, simPort, wirePort] = await Promise.all([freePort(), freePort(), freePort()]);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'charlottendal-auth-'));
  const env = { ...process.env, CHARLOTTENDAL_AUTH_MODE: 'cloudflare', CHARLOTTENDAL_PORT: String(httpPort), CHARLOTTENDAL_SIM_PORT: String(simPort),
    CHARLOTTENDAL_WIRE_PORT: String(wirePort), CHARLOTTENDAL_STATE_DIR: dir,
    CHARLOTTENDAL_PUBLIC_ORIGIN: 'https://cda-tkl.trainmeet.app',
    CHARLOTTENDAL_ACCESS_ISSUER: 'https://test-team.cloudflareaccess.com',
    CHARLOTTENDAL_ACCESS_AUD: 'test-application', CHARLOTTENDAL_ACCESS_EMAIL: 'operator@example.test' };
  let output = '';
  const children = ['src/simulator.mjs', 'src/server.mjs'].map(file => {
    const child = spawn(process.execPath, [file], { cwd: root, env });
    child.stdout.on('data', chunk => output += chunk); child.stderr.on('data', chunk => output += chunk);
    return child;
  });
  // Native HTTP preserves the Host header; fetch may replace it with the URL host.
  const send = (url, options = {}) => new Promise((resolve, reject) => {
    const req = http.request(url, options, res => { res.resume(); res.on('end', () => resolve({ status: res.statusCode })); });
    req.on('error', reject); req.setTimeout(2000, () => req.destroy(Error('Request timeout')));
    req.end(options.body);
  });
  try {
    for (const port of [httpPort, simPort]) {
      const url = `http://127.0.0.1:${port}`;
      const headers = { Host: 'cda-tkl.trainmeet.app' };
      await until(async () => (await send(url, { headers })).status === 403);
      for (const resource of ['/', '/api/config', '/api/state', '/app.css', '/data/source/index.json', '/data/source/Cda60.xml']) {
        assert.equal((await send(url + resource, { headers })).status, 403);
        assert.equal((await send(url + resource, { headers: { ...headers, 'cf-access-jwt-assertion': 'forged' } })).status, 403);
      }
      assert.equal((await send(url + '/api/route', { method: 'POST', headers: { ...headers, Origin: env.CHARLOTTENDAL_PUBLIC_ORIGIN, 'Content-Type': 'application/json' }, body: '{}' })).status, 403);
    }
  } catch (e) { e.message += '\nChild output: ' + output; throw e; } finally {
    await Promise.all(children.filter(c => c.exitCode === null).map(c => new Promise(r => { c.once('exit', r); c.kill('SIGTERM'); })));
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
