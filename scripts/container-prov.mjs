// Gemensamma delar för containerproven av Render-avbildningarna: Charlottendals flyttade webbdrift
// (scripts/test-render-container.mjs) och en annan stations nya installation (scripts/test-station-container.mjs).
// Kräver Docker och OpenSSL. Allt körs på ett internt Docker-nät med syntetiska data; aldrig driftdata.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import https from 'node:https';
import { isIP } from 'node:net';
import { randomBytes } from 'node:crypto';
import { spawnSync } from 'node:child_process';

export function containerProv({ root, artifacts: directory, hostname = 'cda-render.example.test' }) {
  const artifacts = path.resolve(directory);
  fs.mkdirSync(artifacts, { recursive: true });
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'tkl-render-cert-'));
  const id = 'tkl-render-prov-' + randomBytes(6).toString('hex');
  const prov = {
    artifacts, temporary, id, network: id + '-nat', volume: id + '-data',
    checks: [], browserErrors: [], responseErrors: [],
    upstreamHost: null, port: null, origin: null, host: null,
    proxy: null, browser: null, context: null,
    images: [], volumeCreated: false, networkCreated: false, containerCreated: false,
  };
  let commandNumber = 0;

  prov.command = function (program, args, { input, timeout = 60000, optional = false, cwd = root, env } = {}) {
    const result = spawnSync(program, args, { cwd, env, encoding: 'utf8', input, timeout, maxBuffer: 32 * 1024 * 1024 });
    const output = (result.stdout || '') + (result.stderr || '');
    fs.writeFileSync(path.join(artifacts, `${String(++commandNumber).padStart(2, '0')}-${program}.log`), output);
    if (!optional && (result.error || result.status !== 0)) throw Error(`${program} misslyckades: ${result.error?.message || output.slice(-6000)}`);
    return (result.stdout || '').trim();
  };
  prov.docker = (args, options) => prov.command('docker', args, options);
  prov.mark = text => { prov.checks.push(text); console.log('OK: ' + text); };
  prov.pause = ms => new Promise(resolve => setTimeout(resolve, ms));

  // En intern Docker-brygga publicerar inga portar. Linux-värden når dess IP direkt,
  // medan avbildningen fortfarande saknar väg ut till internet eller TrainMeet.
  prov.containerAddress = function () {
    const networks = JSON.parse(prov.docker(['inspect', '--format', '{{json .NetworkSettings.Networks}}', prov.id]));
    const address = networks[prov.network]?.IPAddress;
    assert.equal(isIP(address || ''), 4, `Containern saknar IPv4 på provnätet ${prov.network}: ${JSON.stringify(networks)}`);
    prov.upstreamHost = address; prov.port = 10000;
    console.log(`Provets interna gateway: ${prov.upstreamHost}:${prov.port}`);
  };

  prov.request = function (resource, { data, cookie, headers = {}, method = data === undefined ? 'GET' : 'POST' } = {}) {
    return new Promise((resolve, reject) => {
      const req = http.request({ hostname: prov.upstreamHost, port: prov.port, path: resource, method,
        headers: { Host: prov.host, ...(cookie ? { Cookie: cookie } : {}),
          ...(data === undefined ? {} : { 'Content-Type': 'application/json', Origin: prov.origin }), ...headers } }, res => {
        const chunks = [];
        res.on('data', chunk => chunks.push(chunk));
        res.on('end', () => { const bytes = Buffer.concat(chunks); resolve({ status: res.statusCode, headers: res.headers, bytes, text: bytes.toString('utf8') }); });
        res.on('error', reject);
      });
      req.on('error', reject); req.setTimeout(10000, () => req.destroy(Error('HTTP-anropet tog för lång tid')));
      req.end(data === undefined ? undefined : JSON.stringify(data));
    });
  };
  prov.json = async function (resource, options = {}) {
    const result = await prov.request(resource, options);
    assert.equal(result.status, 200, `${resource}: ${result.status} ${result.text.slice(0, 500)}`);
    return JSON.parse(result.text);
  };
  prov.until = async function (label, check, timeout = 60000) {
    const deadline = Date.now() + timeout; let failure;
    while (Date.now() < deadline) {
      try { const value = await check(); if (value) return value; } catch (error) { failure = error; }
      await prov.pause(250);
    }
    throw Error(`${label} blev inte klart${failure ? ': ' + failure.message : ''}`);
  };
  // /healthz kan svara running innan någon barnprocess är redo. Kontrollera båda API:erna.
  prov.applicationReady = () => prov.until('Inloggning i båda processerna', async () => {
    const session = await prov.json('/api/auth/session');
    return session.mode === 'external' && session.setup.needed === false &&
      (await prov.request('/api/state')).status === 401 && (await prov.request('/anlaggning/api/state')).status === 401;
  });
  prov.authenticatedState = cookie => prov.until('TKL:s riktiga förbindelse med simulatorn', async () => {
    const state = await prov.json('/api/state', { cookie });
    return state.connection === 'connected' ? state : false;
  });

  prov.startProxy = async function () {
    prov.command('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-subj', '/CN=' + hostname,
      '-days', '1', '-keyout', path.join(temporary, 'key.pem'), '-out', path.join(temporary, 'cert.pem')]);
    prov.proxy = https.createServer({ key: fs.readFileSync(path.join(temporary, 'key.pem')), cert: fs.readFileSync(path.join(temporary, 'cert.pem')) }, (req, res) => {
      if (!prov.port) { res.writeHead(503); res.end(); return; }
      const upstream = http.request({ hostname: prov.upstreamHost, port: prov.port, method: req.method, path: req.url, headers: req.headers }, response => {
        res.writeHead(response.statusCode, response.headers); response.pipe(res);
      });
      upstream.on('error', () => { if (!res.headersSent) res.writeHead(502); res.end(); });
      req.on('aborted', () => upstream.destroy()); res.on('close', () => upstream.destroy()); req.pipe(upstream);
    });
    await new Promise((resolve, reject) => { prov.proxy.once('error', reject); prov.proxy.listen(0, '127.0.0.1', resolve); });
    prov.host = hostname + ':' + prov.proxy.address().port; prov.origin = 'https://' + prov.host;
  };

  prov.buildImage = function (tag, { context: buildContext = root, file = 'Dockerfile.render' } = {}) {
    prov.docker(['build', '--file', file, '--tag', tag, '.'], { timeout: 900000, cwd: buildContext });
    prov.images.push(tag);
  };
  prov.createVolumeAndNetwork = function () {
    prov.docker(['volume', 'create', prov.volume]); prov.volumeCreated = true;
    prov.docker(['network', 'create', '--internal', prov.network]); prov.networkCreated = true;
  };
  prov.run = function (image, { env = {} } = {}) {
    const variables = Object.entries({ CHARLOTTENDAL_PUBLIC_ORIGIN: prov.origin, ...env }).flatMap(([key, value]) => ['--env', `${key}=${value}`]);
    prov.docker(['run', '--detach', '--name', prov.id, '--network', prov.network,
      '--mount', `type=volume,source=${prov.volume},target=/data`, ...variables, image]);
    prov.containerCreated = true;
    prov.containerAddress();
  };
  // Återgång och omstart använder samma volym: containern tas bort och ersätts av den valda avbildningen.
  prov.replaceContainer = function (image, options) {
    prov.docker(['logs', prov.id], { optional: true });
    prov.docker(['rm', '--force', prov.id], { optional: true });
    prov.containerCreated = false;
    prov.run(image, options);
  };

  prov.openBrowser = async function () {
    assert.ok(process.env.TKL_PLAYWRIGHT_MODULE, 'TKL_PLAYWRIGHT_MODULE måste peka på Playwright-modulen');
    const { chromium } = await import(process.env.TKL_PLAYWRIGHT_MODULE);
    prov.browser = await chromium.launch({ args: [`--host-resolver-rules=MAP ${hostname} 127.0.0.1`, '--no-proxy-server'] });
    prov.context = await prov.browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: 1600, height: 1000 }, serviceWorkers: 'block' });
    // Bara provets HTTPS-gateway får nås; inte TrainMeet eller andra externa tjänster.
    await prov.context.route('**/*', route => new URL(route.request().url()).origin === prov.origin ? route.continue() : route.abort('blockedbyclient'));
    const page = await prov.context.newPage();
    page.on('pageerror', error => prov.browserErrors.push(error.message));
    page.on('response', response => {
      const resource = new URL(response.url()).pathname;
      // Chromium kan själv fråga efter en favicon som programmet inte tillhandahåller.
      if (response.status() >= 400 && resource !== '/favicon.ico') prov.responseErrors.push(`${response.status()} ${resource}`);
    });
    return page;
  };
  prov.closeBrowser = async function () {
    assert.deepEqual(prov.browserErrors, [], 'JavaScript-fel i webbläsaren');
    assert.deepEqual(prov.responseErrors, [], 'Misslyckade HTTP-svar i webbläsaren');
    if (prov.context) { await prov.context.close(); prov.context = null; }
    if (prov.browser) { await prov.browser.close(); prov.browser = null; }
  };

  prov.saveFailure = async function (error, extra = {}) {
    if (prov.context) {
      for (const [index, page] of prov.context.pages().entries()) {
        await page.screenshot({ path: path.join(artifacts, `fel-${index}.png`), fullPage: true }).catch(() => {});
        await page.content().then(html => fs.writeFileSync(path.join(artifacts, `fel-${index}.html`), html)).catch(() => {});
        await page.locator('body').ariaSnapshot().then(dom => fs.writeFileSync(path.join(artifacts, `fel-${index}-dom.txt`), page.url() + '\n' + dom)).catch(() => {});
      }
    }
    prov.result({ ok: false, ...extra, error: error.stack, browserErrors: prov.browserErrors, responseErrors: prov.responseErrors });
    console.error(error.stack);
  };
  prov.result = content => fs.writeFileSync(path.join(artifacts, 'resultat.json'), JSON.stringify({ checks: prov.checks, ...content }, null, 2) + '\n');

  prov.cleanup = async function () {
    if (prov.context) await prov.context.close().catch(() => {});
    if (prov.browser) await prov.browser.close().catch(() => {});
    if (prov.proxy) { prov.proxy.closeAllConnections(); await new Promise(resolve => prov.proxy.close(resolve)); }
    if (prov.containerCreated) {
      prov.docker(['logs', prov.id], { optional: true });
      prov.docker(['rm', '--force', prov.id], { optional: true });
    }
    if (prov.volumeCreated) prov.docker(['volume', 'rm', prov.volume], { optional: true });
    if (prov.networkCreated) prov.docker(['network', 'rm', prov.network], { optional: true });
    for (const image of prov.images) prov.docker(['image', 'rm', image], { optional: true });
    fs.rmSync(temporary, { recursive: true, force: true });
  };
  return prov;
}
