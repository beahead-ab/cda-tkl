// Provar en annan stations egen Render-avbildning, till exempel Träkvista i tk-tkl: ett riktigt paket ur
// deploy/publish-station.sh, tom datavolym, första ägaren ur miljön med lösenordsbyte, riktig containeromstart
// och återgång till föregående version på samma volym.
//
//   node scripts/test-station-container.mjs [station]
//
// Kräver Docker, OpenSSL och Playwright (TKL_PLAYWRIGHT_MODULE). Allt är syntetiskt: ingen driftdata, ingen
// TrainMeet-kontakt, ingen publicering och ingen Render-tjänst. Charlottendals egen avbildning provas i
// scripts/test-render-container.mjs.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { containerProv } from './container-prov.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const id = process.argv[2] || 'trakvista';
const prov = containerProv({ root, artifacts: process.env.TKL_STATION_ARTIFACTS || path.join(os.tmpdir(), 'tkl-station-container'),
  hostname: 'tk-render.example.test' });
const { artifacts, command, mark, request, json } = prov;
const station = JSON.parse(fs.readFileSync(path.join(root, `stations/${id}/station.json`), 'utf8'));
const profile = JSON.parse(fs.readFileSync(path.join(root, `stations/${id}/profiles/network.json`), 'utf8'));
const release = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).version;
const username = 'station-prov@example.test';
const temporary = randomBytes(18).toString('hex'), chosen = randomBytes(18).toString('hex');
const packages = fs.mkdtempSync(path.join(os.tmpdir(), 'tkl-station-paket-'));
const image = prov.id + ':prov', previousImage = prov.id + ':forra';

// Ett riktigt stationspaket, byggt som vid publicering fast mot ett tomt provförråd och utan push.
function buildPackage(name, commit = 'HEAD') {
  const remote = path.join(packages, name + '.git');
  command('git', ['init', '--bare', '-q', '-b', 'main', remote]);
  const output = command('bash', ['deploy/publish-station.sh', id, commit], {
    timeout: 600000, env: { ...process.env, STATION_REMOTE: remote, STATION_NO_PUSH: '1', STATION_NO_TEST: '1' } });
  const folder = output.match(/^Inte pushat: (.+)$/m)?.[1];
  assert.ok(folder && fs.existsSync(path.join(folder, 'Dockerfile.render')), `Paketet saknar Dockerfile.render: ${output.slice(-500)}`);
  return folder;
}
// Föregående publicerade version i cda-tkl: avbildningen att återgå till. Kräver hela historiken.
function previousRelease() {
  for (const commit of command('git', ['log', '--format=%H', '--', 'package.json']).split('\n').filter(Boolean)) {
    const version = JSON.parse(command('git', ['show', `${commit}:package.json`])).version;
    if (version !== release) return { commit, version };
  }
  return null;
}

// stationLock: stationsvalet finns från 0.82.9. En äldre version i återgångsprovet har inte installationStation.
function assertIdentity(config, state, { version = release, stationLock = true } = {}) {
  assert.equal(config.station.id, id); assert.equal(config.station.title, station.title);
  assert.equal(config.release, version); assert.equal(state.release, version);
  assert.equal(config.id, profile.id); assert.equal(state.profile.id, profile.id);
  assert.equal(config.sourceHash, profile.sourceHash); assert.equal(config.authMode, 'external');
  assert.equal(state.storageFault, null); assert.equal(state.connectionInfo.mode, 'simulator');
  assert.equal(state.connectionMode.mode, 'offline');
  if (!stationLock) return;
  assert.equal(state.installationStation.current, id); assert.equal(state.installationStation.locked, true);
  assert.deepEqual(state.installationStation.stations.map(s => s.id), [id]);
}
async function login(password) {
  const result = await request('/api/auth/login', { data: { username, password } });
  return { status: result.status, text: result.text, body: result.status === 200 ? JSON.parse(result.text) : null,
    cookie: result.headers['set-cookie']?.[0]?.split(';')[0] ?? null };
}

async function browserSmoke(password) {
  const page = await prov.openBrowser();
  await page.goto(prov.origin + '/login', { waitUntil: 'domcontentloaded' });
  await page.locator('#login:not([hidden])').waitFor();
  await page.locator('#username').fill(username); await page.locator('#password').fill(password);
  await page.locator('#login button[type="submit"]').click();
  await page.waitForFunction(() => document.querySelector('#track-plan')?.querySelectorAll('*').length > 100);
  // Sidhuvudet skrivs med versaler och planens rubrik formas av CSS; jämför därför utan skillnad på gemener och versaler.
  assert.equal((await page.locator('.brand span').innerText()).toUpperCase(), station.title.toUpperCase());
  assert.equal((await page.locator('.plan-head-title').innerText()).toUpperCase(), station.title.toUpperCase());
  // Sidfoten är fortfarande produktens statiska text i public/index.html: den säger Charlottendal TKL också här.
  // Rättas i en egen versionshöjning, eftersom public/ då måste publiceras. Versionen i sidfoten ska stämma.
  // Sidomenyn flyttar in sidfoten i sin egen panel, så den söks på sin text och inte på sin plats i dokumentet.
  assert.match(await page.locator('footer').filter({ hasText: 'TKL · version ' + release }).innerText(),
    new RegExp('TKL · version ' + release.replaceAll('.', '\\.')));
  await page.screenshot({ path: path.join(artifacts, '01-panel.png'), fullPage: true });
  mark(`Webbläsarinloggning och ${station.title}s panel med renderad spårplan och stationens namn`);

  await page.goto(prov.origin + '/studio.html#konfigurera', { waitUntil: 'domcontentloaded' });
  await page.locator('#st-plan-host .st-plan-scroll > svg').waitFor();
  assert.equal(await page.locator('.st-error').count(), 0);
  assert.match(await page.locator('.st-brand').innerText(), new RegExp(station.title, 'i'));
  await page.screenshot({ path: path.join(artifacts, '02-studio.png'), fullPage: true });
  mark('Studio läser stationens källor och renderar stationsplanen');

  await page.goto(prov.origin + '/#advanced/station', { waitUntil: 'domcontentloaded' });
  await page.locator('#advanced-station:not([hidden])').waitFor();
  await page.waitForFunction(title => document.querySelector('#station-settings')?.textContent.includes(title) &&
    !document.querySelector('#station-settings')?.textContent.includes('Läser stationerna'), station.title);
  await page.screenshot({ path: path.join(artifacts, '03-fast-station.png'), fullPage: true });
  mark(`Stationsinställningarna visar ${station.title} som fast Render-installation`);
  await prov.closeBrowser();
}

let rollback = null;
try {
  await prov.startProxy();
  const folder = buildPackage('aktuell');
  mark(`Stationspaketet byggt ur ${id} som vid publicering, utan push`);
  prov.buildImage(image, { context: folder });
  mark('Paketets Dockerfile.render bygger stationens riktiga avbildning');
  prov.createVolumeAndNetwork();
  prov.run(image, { env: { CHARLOTTENDAL_STATION: id, TKL_OWNER_EMAIL: username, TKL_OWNER_PASSWORD: temporary } });

  // Tom volym: ingen flytt att vänta på, ägaren skapas ur miljön (TKL_RENDER_NEW i Dockerfile.render).
  await prov.until('Starten av den nya installationen', async () => (await json('/healthz')).status === 'running');
  await prov.applicationReady();
  assert.equal((await request('/login', { headers: { Host: 'fel.example.test' } })).status, 400);
  assert.equal((await request('/')).headers.location, '/login');
  assert.equal((await request('/studio.html')).headers.location, '/login?next=%2Fstudio.html');
  assert.equal((await json('/api/auth/session')).setup.needed, false);
  mark('Tom datavolym ger en ny installation med ägare ur miljön, och fel Host nekas');

  const first = await login(temporary);
  assert.equal(first.status, 200, first.text);
  assert.equal(first.body.mustChange, true); assert.equal(first.body.user.role, 'owner');
  assert.match(first.cookie, /^__Host-cda_session=/);
  const blocked = await request('/api/state', { cookie: first.cookie });
  assert.equal(blocked.status, 428); assert.match(blocked.text, /Byt det tillfälliga lösenordet/);
  const changed = await request('/api/auth/password', { cookie: first.cookie, data: { currentPassword: temporary, newPassword: chosen } });
  assert.equal(changed.status, 200, changed.text); assert.equal(JSON.parse(changed.text).mustChange, false);
  const stale = await login(temporary); assert.ok(stale.status >= 400 && stale.status < 500, `Det tillfälliga lösenordet gäller fortfarande: ${stale.status}`);
  mark('Det tillfälliga lösenordet byts vid första inloggningen och går inte att använda igen');

  const owner = await login(chosen); assert.equal(owner.status, 200, owner.text);
  const cookie = owner.cookie, user = owner.body.user;
  const config = await json('/api/config', { cookie }), state = await prov.authenticatedState(cookie);
  assertIdentity(config, state);
  assert.equal((await json('/api/studio', { cookie })).sourceHash, profile.sourceHash);
  assert.equal((await json('/anlaggning/api/config', { cookie })).station.id, id);
  assert.ok((await json('/anlaggning/api/state', { cookie })).clients > 0);
  const rejectedOrigin = await request('/api/auth/login', { data: { username, password: chosen }, headers: { Origin: 'https://fel.example.test' } });
  assert.equal(rejectedOrigin.status, 400); assert.match(rejectedOrigin.text, /Otillåtet ursprung/);
  mark(`${station.title} TKL ${release} med profil ${profile.id}, Studio, skyddad session och ansluten intern simulator`);

  const entry = { ...state.destinations.entries[0], name: 'Ortsnamn i stationsprov', phone: '12345', source: 'local', stationId: '' };
  const destinations = await json('/api/destinations', { cookie, data: { revision: state.destinations.revision, entry } });
  const clock = await json('/api/clock', { cookie, data: { sessionId: state.clock.sessionId, revision: state.clock.revision, rate: 3, running: false, timeMs: 46800000 } });
  await json('/api/onboarding/finish', { cookie, data: { skipped: ['ai', 'trainmeet'] } });
  await browserSmoke(chosen);

  prov.docker(['restart', '--time', '10', prov.id]); prov.containerAddress(); await prov.applicationReady();
  const after = await prov.authenticatedState(cookie), afterConfig = await json('/api/config', { cookie });
  assertIdentity(afterConfig, after);
  const session = await json('/api/auth/session', { cookie });
  assert.equal(session.authenticated, true); assert.equal(session.user.id, user.id);
  assert.deepEqual(after.destinations, destinations);
  assert.equal(after.clock.rate, clock.rate); assert.equal(after.clock.timeMs, clock.timeMs); assert.equal(after.clock.running, false);
  mark('Samma volym bevarar ägaren, sessionen, ortsinställningen och modellklockan efter riktig containeromstart');

  // Återgång: föregående publicerade version startas på samma volym, som en rollback av en Render-deploy.
  const previous = previousRelease();
  assert.ok(previous, 'Hittade ingen föregående version i historiken; hämta hela historiken (fetch-depth: 0).');
  prov.buildImage(previousImage, { context: buildPackage('forra', previous.commit) });
  prov.replaceContainer(previousImage, { env: { CHARLOTTENDAL_STATION: id, TKL_OWNER_EMAIL: username, TKL_OWNER_PASSWORD: temporary } });
  await prov.until('Starten av föregående version', async () => (await json('/healthz')).status === 'running');
  await prov.applicationReady();
  const back = await login(chosen); assert.equal(back.status, 200, back.text);
  const backState = await prov.authenticatedState(back.cookie), backConfig = await json('/api/config', { cookie: back.cookie });
  assertIdentity(backConfig, backState, { version: previous.version, stationLock: false });
  assert.deepEqual(backState.destinations.entries, destinations.entries);
  assert.equal(backState.clock.timeMs, clock.timeMs);
  rollback = { version: previous.version, commit: previous.commit };
  mark(`Återgång till ${previous.version} startar på samma volym med ägare, ortsinställning och klocka kvar`);

  // Och tillbaka till den nya versionen igen, som efter en återgång som inte behövdes.
  prov.replaceContainer(image, { env: { CHARLOTTENDAL_STATION: id, TKL_OWNER_EMAIL: username, TKL_OWNER_PASSWORD: temporary } });
  await prov.applicationReady();
  const forward = await login(chosen); assert.equal(forward.status, 200, forward.text);
  assertIdentity(await json('/api/config', { cookie: forward.cookie }), await prov.authenticatedState(forward.cookie));
  mark(`Åter till ${release} efter återgången, med samma data`);

  prov.result({ ok: true, station: id, release, rollback, profileId: profile.id, sourceHash: profile.sourceHash,
    scope: 'Isolerad avbildning ur stationspaketet med syntetiska data. Ingen verklig bana, TrainMeet-parkoppling, publicering eller Render-tjänst.' });
} catch (error) {
  await prov.saveFailure(error, { station: id, release, rollback });
  process.exitCode = 1;
} finally {
  await prov.cleanup();
  fs.rmSync(packages, { recursive: true, force: true });
}
