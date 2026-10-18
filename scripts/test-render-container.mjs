// Provar Charlottendals riktiga Render-avbildning med en ny, syntetisk datavolym.
// Kräver Docker, OpenSSL och Playwright (TKL_PLAYWRIGHT_MODULE); använder aldrig driftdata.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { randomBytes, createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { containerProv } from './container-prov.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const prov = containerProv({ root, artifacts: process.env.TKL_RENDER_ARTIFACTS || path.join(os.tmpdir(), 'tkl-render-container') });
const { artifacts, docker, mark, request, json } = prov;
const image = prov.id + ':prov';
const username = 'render-prov@example.test', password = randomBytes(24).toString('hex');
const release = JSON.parse(fs.readFileSync(path.join(root, 'package.json'))).version;
const profile = JSON.parse(fs.readFileSync(path.join(root, 'profiles/charlottendal-network.json')));
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const sourceHash = digest(fs.readFileSync(path.join(root, 'public/data/source/Cda60.xml')));

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
  const page = await prov.openBrowser();
  await page.goto(prov.origin + '/login', { waitUntil: 'domcontentloaded' });
  await page.locator('#login:not([hidden])').waitFor();
  await page.locator('#username').fill(username); await page.locator('#password').fill(password);
  await page.locator('#login button[type="submit"]').click();
  await page.waitForFunction(() => document.querySelector('#track-plan')?.querySelectorAll('*').length > 100);
  assert.match(await page.locator('footer').filter({ hasText: 'Charlottendal TKL · version ' + release }).textContent(), new RegExp(release.replaceAll('.', '\\.')));
  await page.screenshot({ path: path.join(artifacts, '01-panel.png'), fullPage: true });
  mark('Webbläsarinloggning och panel med renderad spårplan');

  await page.goto(prov.origin + '/studio.html#konfigurera', { waitUntil: 'domcontentloaded' });
  await page.locator('#st-plan-host .st-plan-scroll > svg').waitFor();
  assert.equal(await page.locator('.st-error').count(), 0);
  assert.match(await page.locator('.st-brand').innerText(), /CHARLOTTENDAL/);
  await page.screenshot({ path: path.join(artifacts, '02-studio.png'), fullPage: true });
  mark('Studio läser källorna och renderar stationsplanen');

  await page.goto(prov.origin + '/#advanced/update', { waitUntil: 'domcontentloaded' });
  await page.locator('#advanced-update:not([hidden])').waitFor();
  await page.waitForFunction(() => document.querySelector('#advanced-update-content')?.textContent.includes('Render'));
  await page.screenshot({ path: path.join(artifacts, '03-uppdatering.png'), fullPage: true });
  mark('Uppdatering visar Render utan att starta något bygge');

  await page.goto(prov.origin + '/#advanced/station', { waitUntil: 'domcontentloaded' });
  await page.locator('#advanced-station:not([hidden])').waitFor();
  await page.waitForFunction(() => document.querySelector('#station-settings')?.textContent.includes('Charlottendal') && !document.querySelector('#station-settings')?.textContent.includes('Läser stationerna'));
  await page.screenshot({ path: path.join(artifacts, '04-fast-station.png'), fullPage: true });
  mark('Stationsinställningarna visar Charlottendal som fast Render-installation');
  await prov.closeBrowser();
}

try {
  await prov.startProxy();
  prov.buildImage(image);
  mark('Dockerfile.render bygger den riktiga avbildningen');
  prov.createVolumeAndNetwork();
  prov.run(image);
  await prov.until('Återställningsspärren', async () => (await json('/healthz')).status === 'waiting-for-restore');
  assert.equal((await request('/login')).status, 503);
  assert.equal((await request('/api/state')).status, 503);
  assert.equal((await request('/login', { headers: { Host: 'fel.example.test' } })).status, 400);
  mark('Tom datavolym väntar på återställning och fel Host nekas');
  docker(['stop', '--time', '10', prov.id]);
  // Avbildningens egen UserStore skriver ett nytt konto. Inga befintliga auth-/state-filer kopieras.
  const seed = `import fs from 'node:fs'; import {UserStore} from './src/users.mjs';
    fs.mkdirSync('/data/auth',{recursive:true}); fs.mkdirSync('/data/state',{recursive:true});
    await new UserStore('/data/auth/users.json').createOwner({username:process.env.PROV_USER,password:process.env.PROV_PASSWORD});
    fs.writeFileSync('/data/state/notes.json',JSON.stringify({'render-prov':'Syntetisk anteckning före omstart'}));
    fs.writeFileSync('/data/.restored','Enbart syntetisk provdata\\n');`;
  docker(['run', '--rm', '--network', prov.network, '--entrypoint', 'node', '--mount', `type=volume,source=${prov.volume},target=/data`,
    '--env', 'PROV_USER=' + username, '--env', 'PROV_PASSWORD=' + password, image, '--input-type=module', '-e', seed]);
  // entrypoint.sh ändrar ägaren till node; även innehållet måste ha samma provägare.
  docker(['run', '--rm', '--network', prov.network, '--entrypoint', 'chown', '--mount', `type=volume,source=${prov.volume},target=/data`, image, '-R', 'node:node', '/data']);
  docker(['start', prov.id]); prov.containerAddress(); await prov.applicationReady();
  assert.equal((await request('/')).headers.location, '/login');
  assert.equal((await request('/studio.html')).headers.location, '/login?next=%2Fstudio.html');
  assert.equal((await request('/data/source/Cda60.xml')).headers.location, '/login');
  mark('Återställd syntetisk installation kräver inloggning, även för data och simulator');
  const login = await request('/api/auth/login', { data: { username, password } });
  assert.equal(login.status, 200, login.text); const user = JSON.parse(login.text).user;
  const setCookie = login.headers['set-cookie'][0], cookie = setCookie.split(';')[0];
  assert.match(setCookie, /^__Host-cda_session=/); assert.match(setCookie, /HttpOnly; Secure; SameSite=Strict/);
  assert.equal(user.role, 'owner');
  const config = await json('/api/config', { cookie }), state = await prov.authenticatedState(cookie);
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
  docker(['restart', '--time', '10', prov.id]); prov.containerAddress(); await prov.applicationReady();
  const after = await prov.authenticatedState(cookie), afterConfig = await json('/api/config', { cookie }); assertIdentity(afterConfig, after);
  const session = await json('/api/auth/session', { cookie }); assert.equal(session.authenticated, true); assert.equal(session.user.id, user.id);
  assert.deepEqual(after.destinations, destinations); assert.equal(after.clock.rate, clock.rate); assert.equal(after.clock.timeMs, clock.timeMs); assert.equal(after.clock.running, false);
  assert.equal(afterConfig.notes['render-prov'], config.notes['render-prov']);
  assert.equal((await json('/anlaggning/api/state', { cookie })).clients > 0, true);
  mark('Samma volym bevarar användare, session, ortsinställning, anteckning, modellklocka och profil efter riktig containeromstart');
  prov.result({ ok: true, release, profileId: profile.id, sourceHash: profile.sourceHash,
    scope: 'Isolerad Render-avbildning med syntetiska data. Ingen verklig bana, TrainMeet-parkoppling, driftsbackup eller Render-driftsättning.' });
} catch (error) {
  await prov.saveFailure(error, { release });
  process.exitCode = 1;
} finally {
  await prov.cleanup();
}
