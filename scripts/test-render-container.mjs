// Provar Charlottendals riktiga Render-avbildning med en ny, syntetisk datavolym.
// Kräver Docker, OpenSSL och Playwright (TKL_PLAYWRIGHT_MODULE); använder aldrig driftdata.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import https from 'node:https';
import { isIP } from 'node:net';
import { randomBytes, createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const artifacts = path.resolve(process.env.TKL_RENDER_ARTIFACTS || path.join(os.tmpdir(), 'tkl-render-container'));
fs.mkdirSync(artifacts, { recursive: true });
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'tkl-render-cert-'));
const id = 'tkl-render-prov-' + randomBytes(6).toString('hex');
const image = id + ':prov', volume = id + '-data', network = id + '-nat';
const username = 'render-prov@example.test', password = randomBytes(24).toString('hex');
const release = JSON.parse(fs.readFileSync(path.join(root, 'package.json'))).version;
const profile = JSON.parse(fs.readFileSync(path.join(root, 'profiles/charlottendal-network.json')));
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const sourceHash = digest(fs.readFileSync(path.join(root, 'public/data/source/Cda60.xml')));
const checks = [], browserErrors = [], responseErrors = [];
let upstreamHost, port, origin, host, proxy, browser, context;
let imageCreated = false, volumeCreated = false, networkCreated = false, containerCreated = false;
let commandNumber = 0;

function command(program, args, { input, timeout = 60000, optional = false } = {}) {
  const result = spawnSync(program, args, { cwd: root, encoding: 'utf8', input, timeout, maxBuffer: 32 * 1024 * 1024 });
  const output = (result.stdout || '') + (result.stderr || '');
  fs.writeFileSync(path.join(artifacts, `${String(++commandNumber).padStart(2, '0')}-${program}.log`), output);
  if (!optional && (result.error || result.status !== 0)) throw Error(`${program} misslyckades: ${result.error?.message || output.slice(-6000)}`);
  return (result.stdout || '').trim();
}
const docker = (args, options) => command('docker', args, options);
const mark = text => { checks.push(text); console.log('OK: ' + text); };
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
function containerAddress() {
  // En intern Docker-brygga publicerar inga portar. Linux-värden når dess IP direkt,
  // medan avbildningen fortfarande saknar väg ut till internet eller TrainMeet.
  const networks = JSON.parse(docker(['inspect', '--format', '{{json .NetworkSettings.Networks}}', id]));
  const address = networks[network]?.IPAddress;
  assert.equal(isIP(address || ''), 4, `Containern saknar IPv4 på provnätet ${network}: ${JSON.stringify(networks)}`);
  upstreamHost = address; port = 10000;
  console.log(`Provets interna gateway: ${upstreamHost}:${port}`);
}

function request(resource, { data, cookie, headers = {}, method = data === undefined ? 'GET' : 'POST' } = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request({ hostname: upstreamHost, port, path: resource, method,
      headers: { Host: host, ...(cookie ? { Cookie: cookie } : {}),
        ...(data === undefined ? {} : { 'Content-Type': 'application/json', Origin: origin }), ...headers } }, res => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => { const bytes = Buffer.concat(chunks); resolve({ status: res.statusCode, headers: res.headers, bytes, text: bytes.toString('utf8') }); });
      res.on('error', reject);
    });
    req.on('error', reject); req.setTimeout(10000, () => req.destroy(Error('HTTP-anropet tog för lång tid')));
    req.end(data === undefined ? undefined : JSON.stringify(data));
  });
}
async function json(resource, options = {}) {
  const result = await request(resource, options);
  assert.equal(result.status, 200, `${resource}: ${result.status} ${result.text.slice(0, 500)}`);
  return JSON.parse(result.text);
}
async function until(label, check, timeout = 60000) {
  const deadline = Date.now() + timeout; let failure;
  while (Date.now() < deadline) {
    try { const value = await check(); if (value) return value; } catch (error) { failure = error; }
    await pause(250);
  }
  throw Error(`${label} blev inte klart${failure ? ': ' + failure.message : ''}`);
}
async function startProxy() {
  command('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-subj', '/CN=cda-render.example.test',
    '-days', '1', '-keyout', path.join(temporary, 'key.pem'), '-out', path.join(temporary, 'cert.pem')]);
  proxy = https.createServer({ key: fs.readFileSync(path.join(temporary, 'key.pem')), cert: fs.readFileSync(path.join(temporary, 'cert.pem')) }, (req, res) => {
    if (!port) { res.writeHead(503); res.end(); return; }
    const upstream = http.request({ hostname: upstreamHost, port, method: req.method, path: req.url, headers: req.headers }, response => {
      res.writeHead(response.statusCode, response.headers); response.pipe(res);
    });
    upstream.on('error', () => { if (!res.headersSent) res.writeHead(502); res.end(); });
    req.on('aborted', () => upstream.destroy()); res.on('close', () => upstream.destroy()); req.pipe(upstream);
  });
  await new Promise((resolve, reject) => { proxy.once('error', reject); proxy.listen(0, '127.0.0.1', resolve); });
  host = 'cda-render.example.test:' + proxy.address().port; origin = 'https://' + host;
}
async function applicationReady() {
  // /healthz kan svara running innan någon barnprocess är redo. Kontrollera båda API:erna.
  await until('Inloggning i båda processerna', async () => {
    const session = await json('/api/auth/session');
    return session.mode === 'external' && session.setup.needed === false &&
      (await request('/api/state')).status === 401 && (await request('/anlaggning/api/state')).status === 401;
  });
}
async function authenticatedState(cookie) {
  return until('TKL:s riktiga förbindelse med simulatorn', async () => {
    const state = await json('/api/state', { cookie });
    return state.connection === 'connected' ? state : false;
  });
}
function assertIdentity(config, state) {
  assert.equal(config.station.id, 'charlottendal'); assert.equal(config.station.title, 'Charlottendal');
  assert.equal(config.release, release); assert.equal(state.release, release);
  assert.equal(config.id, profile.id); assert.equal(state.profile.id, profile.id);
  assert.equal(config.sourceHash, profile.sourceHash); assert.equal(config.authMode, 'external');
  assert.equal(state.storageFault, null); assert.equal(state.connectionInfo.mode, 'simulator');
  assert.equal(state.connectionMode.mode, 'offline');
  assert.equal(state.installationStation.current, 'charlottendal'); assert.equal(state.installationStation.locked, true);
  assert.deepEqual(state.installationStation.stations.map(s => s.id), ['charlottendal']);
}

async function browserSmoke() {
  assert.ok(process.env.TKL_PLAYWRIGHT_MODULE, 'TKL_PLAYWRIGHT_MODULE måste peka på Playwright-modulen');
  const { chromium } = await import(process.env.TKL_PLAYWRIGHT_MODULE);
  browser = await chromium.launch({ args: ['--host-resolver-rules=MAP cda-render.example.test 127.0.0.1', '--no-proxy-server'] });
  context = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: 1600, height: 1000 }, serviceWorkers: 'block' });
  // Bara provets HTTPS-gateway får nås; inte TrainMeet eller andra externa tjänster.
  await context.route('**/*', route => new URL(route.request().url()).origin === origin ? route.continue() : route.abort('blockedbyclient'));
  const page = await context.newPage();
  page.on('pageerror', error => browserErrors.push(error.message));
  page.on('response', response => {
    const resource = new URL(response.url()).pathname;
    // Chromium kan själv fråga efter en favicon som programmet inte tillhandahåller.
    if (response.status() >= 400 && resource !== '/favicon.ico') responseErrors.push(`${response.status()} ${resource}`);
  });
  await page.goto(origin + '/login', { waitUntil: 'domcontentloaded' });
  await page.locator('#login:not([hidden])').waitFor();
  await page.locator('#username').fill(username); await page.locator('#password').fill(password);
  await page.locator('#login button[type="submit"]').click();
  await page.waitForFunction(() => document.querySelector('#track-plan')?.querySelectorAll('*').length > 100);
  assert.match(await page.locator('footer').filter({ hasText: 'Charlottendal TKL · version ' + release }).textContent(), new RegExp(release.replaceAll('.', '\\.')));
  await page.screenshot({ path: path.join(artifacts, '01-panel.png'), fullPage: true });
  mark('Webbläsarinloggning och panel med renderad spårplan');

  await page.goto(origin + '/studio.html#konfigurera', { waitUntil: 'domcontentloaded' });
  await page.locator('#st-plan-host .st-plan-scroll > svg').waitFor();
  assert.equal(await page.locator('.st-error').count(), 0);
  assert.match(await page.locator('.st-brand').innerText(), /CHARLOTTENDAL/);
  await page.screenshot({ path: path.join(artifacts, '02-studio.png'), fullPage: true });
  mark('Studio läser källorna och renderar stationsplanen');

  await page.goto(origin + '/#advanced/update', { waitUntil: 'domcontentloaded' });
  await page.locator('#advanced-update:not([hidden])').waitFor();
  await page.waitForFunction(() => document.querySelector('#advanced-update-content')?.textContent.includes('Render'));
  await page.screenshot({ path: path.join(artifacts, '03-uppdatering.png'), fullPage: true });
  mark('Uppdatering visar Render utan att starta något bygge');

  await page.goto(origin + '/#advanced/station', { waitUntil: 'domcontentloaded' });
  await page.locator('#advanced-station:not([hidden])').waitFor();
  await page.waitForFunction(() => document.querySelector('#station-settings')?.textContent.includes('Charlottendal') && !document.querySelector('#station-settings')?.textContent.includes('Läser stationerna'));
  await page.screenshot({ path: path.join(artifacts, '04-fast-station.png'), fullPage: true });
  mark('Stationsinställningarna visar Charlottendal som fast Render-installation');
  assert.deepEqual(browserErrors, [], 'JavaScript-fel i webbläsaren');
  assert.deepEqual(responseErrors, [], 'Misslyckade HTTP-svar i webbläsaren');
  await context.close(); context = null; await browser.close(); browser = null;
}

try {
  await startProxy();
  docker(['build', '--file', 'Dockerfile.render', '--tag', image, '.'], { timeout: 600000 }); imageCreated = true;
  mark('Dockerfile.render bygger den riktiga avbildningen');
  docker(['volume', 'create', volume]); volumeCreated = true;
  docker(['network', 'create', '--internal', network]); networkCreated = true;
  docker(['run', '--detach', '--name', id, '--network', network,
    '--mount', `type=volume,source=${volume},target=/data`, '--env', 'CHARLOTTENDAL_PUBLIC_ORIGIN=' + origin, image]); containerCreated = true;
  containerAddress();
  await until('Återställningsspärren', async () => (await json('/healthz')).status === 'waiting-for-restore');
  assert.equal((await request('/login')).status, 503);
  assert.equal((await request('/api/state')).status, 503);
  assert.equal((await request('/login', { headers: { Host: 'fel.example.test' } })).status, 400);
  mark('Tom datavolym väntar på återställning och fel Host nekas');
  docker(['stop', '--time', '10', id]);
  // Avbildningens egen UserStore skriver ett nytt konto. Inga befintliga auth-/state-filer kopieras.
  const seed = `import fs from 'node:fs'; import {UserStore} from './src/users.mjs';
    fs.mkdirSync('/data/auth',{recursive:true}); fs.mkdirSync('/data/state',{recursive:true});
    await new UserStore('/data/auth/users.json').createOwner({username:process.env.PROV_USER,password:process.env.PROV_PASSWORD});
    fs.writeFileSync('/data/state/notes.json',JSON.stringify({'render-prov':'Syntetisk anteckning före omstart'}));
    fs.writeFileSync('/data/.restored','Enbart syntetisk provdata\\n');`;
  docker(['run', '--rm', '--network', network, '--entrypoint', 'node', '--mount', `type=volume,source=${volume},target=/data`,
    '--env', 'PROV_USER=' + username, '--env', 'PROV_PASSWORD=' + password, image, '--input-type=module', '-e', seed]);
  // entrypoint.sh ändrar ägaren till node; även innehållet måste ha samma provägare.
  docker(['run', '--rm', '--network', network, '--entrypoint', 'chown', '--mount', `type=volume,source=${volume},target=/data`, image, '-R', 'node:node', '/data']);
  docker(['start', id]); containerAddress(); await applicationReady();
  assert.equal((await request('/')).headers.location, '/login');
  assert.equal((await request('/studio.html')).headers.location, '/login?next=%2Fstudio.html');
  assert.equal((await request('/data/source/Cda60.xml')).headers.location, '/login');
  mark('Återställd syntetisk installation kräver inloggning, även för data och simulator');
  const login = await request('/api/auth/login', { data: { username, password } });
  assert.equal(login.status, 200, login.text); const user = JSON.parse(login.text).user;
  const setCookie = login.headers['set-cookie'][0], cookie = setCookie.split(';')[0];
  assert.match(setCookie, /^__Host-cda_session=/); assert.match(setCookie, /HttpOnly; Secure; SameSite=Strict/);
  assert.equal(user.role, 'owner');
  const config = await json('/api/config', { cookie }), state = await authenticatedState(cookie);
  assertIdentity(config, state);
  assert.equal(config.notes['render-prov'], 'Syntetisk anteckning före omstart');
  assert.equal((await json('/api/studio', { cookie })).sourceHash, profile.sourceHash);
  const xml = await request('/data/source/Cda60.xml', { cookie }); assert.equal(xml.status, 200); assert.equal(digest(xml.bytes), sourceHash);
  assert.equal((await json('/anlaggning/api/config', { cookie })).station.id, 'charlottendal');
  assert.ok((await json('/anlaggning/api/state', { cookie })).clients > 0);
  const rejectedOrigin = await request('/api/auth/login', { data: { username, password }, headers: { Origin: 'https://fel.example.test' } });
  assert.equal(rejectedOrigin.status, 400); assert.match(rejectedOrigin.text, /Otillåtet ursprung/);
  mark(`Version ${release}, oförändrat profil-id/källhash, Studio, skyddad session och ansluten intern simulator`);

  const entry = { ...state.destinations.entries[0], name: 'Ortsnamn i containerprov', phone: '12345', source: 'local', stationId: '' };
  const destinations = await json('/api/destinations', { cookie, data: { revision: state.destinations.revision, entry } });
  const clock = await json('/api/clock', { cookie, data: { sessionId: state.clock.sessionId, revision: state.clock.revision, rate: 3, running: false, timeMs: 46800000 } });
  await json('/api/onboarding/finish', { cookie, data: { skipped: ['ai', 'trainmeet'] } });
  await browserSmoke();
  docker(['restart', '--time', '10', id]); containerAddress(); await applicationReady();
  const after = await authenticatedState(cookie), afterConfig = await json('/api/config', { cookie }); assertIdentity(afterConfig, after);
  const session = await json('/api/auth/session', { cookie }); assert.equal(session.authenticated, true); assert.equal(session.user.id, user.id);
  assert.deepEqual(after.destinations, destinations); assert.equal(after.clock.rate, clock.rate); assert.equal(after.clock.timeMs, clock.timeMs); assert.equal(after.clock.running, false);
  assert.equal(afterConfig.notes['render-prov'], config.notes['render-prov']);
  assert.equal((await json('/anlaggning/api/state', { cookie })).clients > 0, true);
  mark('Samma volym bevarar användare, session, ortsinställning, anteckning, modellklocka och profil efter riktig containeromstart');
  fs.writeFileSync(path.join(artifacts, 'resultat.json'), JSON.stringify({ ok: true, release, profileId: profile.id, sourceHash: profile.sourceHash, checks,
    scope: 'Isolerad Render-avbildning med syntetiska data. Ingen verklig bana, TrainMeet-parkoppling, driftsbackup eller Render-driftsättning.' }, null, 2) + '\n');
} catch (error) {
  if (context) {
    for (const [index, page] of context.pages().entries()) {
      await page.screenshot({ path: path.join(artifacts, `fel-${index}.png`), fullPage: true }).catch(() => {});
      await page.content().then(html => fs.writeFileSync(path.join(artifacts, `fel-${index}.html`), html)).catch(() => {});
      await page.locator('body').ariaSnapshot().then(dom => fs.writeFileSync(path.join(artifacts, `fel-${index}-dom.txt`), page.url() + '\n' + dom)).catch(() => {});
    }
  }
  fs.writeFileSync(path.join(artifacts, 'resultat.json'), JSON.stringify({ ok: false, release, checks, error: error.stack, browserErrors, responseErrors }, null, 2) + '\n');
  process.exitCode = 1; console.error(error.stack);
} finally {
  if (context) await context.close().catch(() => {}); if (browser) await browser.close().catch(() => {});
  if (proxy) { proxy.closeAllConnections(); await new Promise(resolve => proxy.close(resolve)); }
  if (containerCreated) {
    docker(['logs', id], { optional: true });
    docker(['rm', '--force', id], { optional: true });
  }
  if (volumeCreated) docker(['volume', 'rm', volume], { optional: true });
  if (networkCreated) docker(['network', 'rm', network], { optional: true });
  if (imageCreated) docker(['image', 'rm', image], { optional: true });
  fs.rmSync(temporary, { recursive: true, force: true });
}
