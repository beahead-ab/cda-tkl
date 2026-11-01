// Provar den verkliga paketbyggaren mot lokala provförråd. Ingen anslutning till GitHub och ingen push.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync, spawnSync } from 'node:child_process';

const root = fileURLToPath(new URL('..', import.meta.url));
const git = (cwd, ...args) => execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
// Ett lokalt källförråd med arbetsträdets filer, så att även en ännu inte committad rättelse provas. Driftdata och
// beroenden följer inte med.
function sourceCopy(source) {
  fs.mkdirSync(source);
  for (const name of git(root, 'ls-files', '-z').split('\0').filter(Boolean)) {
    const from = path.join(root, name), to = path.join(source, name);
    if (!fs.existsSync(from)) continue;
    fs.mkdirSync(path.dirname(to), { recursive: true }); fs.copyFileSync(from, to);
    fs.chmodSync(to, fs.statSync(from).mode);
  }
  git(source, 'init', '-q', '-b', 'main');
  git(source, 'config', 'user.name', 'TKL paketprov'); git(source, 'config', 'user.email', 'paketprov@example.test');
  git(source, 'add', '-A'); git(source, 'commit', '-qm', 'Underlag för paketprovet');
}

test('stationspaketet behåller källimporten och publiceringen stoppar gamla genererade filer', { timeout: 120000 }, () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tkl-paketprov-'));
  const source = path.join(dir, 'source'), remote = path.join(dir, 'remote.git'), bin = path.join(dir, 'bin');
  const packages = [];
  try {
    sourceCopy(source); fs.mkdirSync(bin);
    git(dir, 'init', '--bare', '-q', '-b', 'main', remote);
    // Paketprovet isolerar bygg- och verifieringskedjan. De vanliga enhetsproven körs av npm test utanför detta prov.
    // Här behövs inga npm-beroenden; stationens verkliga verifierare använder Python och Nodes standardbibliotek.
    const npm = execFileSync('/bin/sh', ['-c', 'command -v npm'], { encoding: 'utf8' }).trim();
    const quote = s => "'" + s.replaceAll("'", "'\\''") + "'";
    fs.writeFileSync(path.join(bin, 'npm'), `#!/bin/sh\ncase "$1" in\n  ci) exit 0 ;;\n  test) printf '# pass 0\\n# fail 0\\n'; exit 0 ;;\n  run) if [ "$3" = test:station-traffic ] || [ "$3" = test:station-selection ]; then exit 0; fi; exec ${quote(npm)} "$@" ;;\n  *) exec ${quote(npm)} "$@" ;;\nesac\n`, { mode: 0o755 });
    const publish = () => {
      const result = spawnSync('bash', ['deploy/publish-station.sh', 'trakvista'], {
        cwd: source, encoding: 'utf8', timeout: 90000,
        env: { ...process.env, PATH: bin + path.delimiter + process.env.PATH, STATION_REMOTE: remote, STATION_NO_PUSH: '1', STATION_NO_TEST: '' }
      });
      const output = result.stdout + result.stderr;
      const packagePath = /Inte pushat: (.+)\/repo/.exec(output)?.[1] || /Loggen: (.+)\/test\.log/.exec(output)?.[1];
      if (packagePath) packages.push(packagePath);
      return { ...result, output, packagePath };
    };
    const fresh = publish();
    assert.equal(fresh.status, 0, fresh.output);
    const packaged = path.join(fresh.packagePath, 'repo');
    const pkg = JSON.parse(fs.readFileSync(path.join(packaged, 'package.json'), 'utf8'));
    assert.ok(pkg.scripts['test:station-traffic']); assert.ok(pkg.scripts['test:station-selection']); assert.ok(pkg.scripts['verify:trakvista']); assert.ok(pkg.scripts['import:trakvista']);
    assert.ok(fs.existsSync(path.join(packaged, 'scripts/import-source.py')));
    for (const name of ['src/windows-serial.mjs','test/windows-bluetooth.test.mjs','test/connection-ui.mjs','test/windows-install.ps1','docs/benny-windows-bluetooth-prov.md']) assert.ok(fs.existsSync(path.join(packaged, name)), name);
    assert.equal(pkg.optionalDependencies.serialport, '13.0.0');
    for (const name of ['profiles', 'public/data', 'docs/arbetsjournal.md', 'deploy/publish-station.sh', 'scripts/test-render-container.mjs', 'scripts/test-station-container.mjs', 'scripts/container-prov.mjs']) {
      assert.equal(fs.existsSync(path.join(packaged, name)), false, name + ' ska stanna i cda-tkl');
    }
    assert.doesNotMatch(fs.readFileSync(path.join(packaged, '.github/workflows/prov.yml'), 'utf8'), /--if-present/);
    // En ändrad källfil utan ny import ska stoppas före paketets commit, även om enhetsproven skulle vara gröna.
    fs.appendFileSync(path.join(source, 'stations/trakvista/data/source/index.json'), '\n');
    git(source, 'add', '-A'); git(source, 'commit', '-qm', 'Inaktuellt stationsunderlag för negativt prov');
    const stale = publish();
    assert.notEqual(stale.status, 0, stale.output);
    assert.match(stale.output, /Stationens genererade filer stämmer inte; inget är publicerat/);
    assert.match(fs.readFileSync(path.join(stale.packagePath, 'test.log'), 'utf8'), /Stale source import/);
    assert.throws(() => git(path.join(stale.packagePath, 'repo'), 'rev-parse', '--verify', 'HEAD'), 'ett underkänt paket får ingen commit');
    assert.throws(() => git(remote, 'rev-parse', '--verify', 'HEAD'), 'inget får skickas till ens provförrådet');
  } finally {
    for (const packagePath of packages) fs.rmSync(packagePath, { recursive: true, force: true });
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('stationens egna ändringar stoppar publiceringen tills de finns i cda-tkl eller installation.received tar in dem', { timeout: 120000 }, () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tkl-mottaget-'));
  const source = path.join(dir, 'source'), remote = path.join(dir, 'remote.git'), benny = path.join(dir, 'benny');
  try {
    sourceCopy(source);
    git(dir, 'init', '--bare', '-q', '-b', 'main', remote);
    // Bara lokala förråd: publiceringen skickar till provförrådet i den temporära katalogen, aldrig till GitHub.
    const publish = () => {
      const result = spawnSync('bash', ['deploy/publish-station.sh', 'trakvista'], { cwd: source, encoding: 'utf8', timeout: 90000,
        env: { ...process.env, STATION_REMOTE: remote, STATION_NO_TEST: '1', STATION_NO_PUSH: '' } });
      return { ...result, output: result.stdout + result.stderr };
    };
    const commit = (cwd, message) => { git(cwd, 'add', '-A'); git(cwd, 'commit', '-qm', message); return git(cwd, 'rev-parse', 'HEAD').trim(); };
    const station = path.join(source, 'stations/trakvista/station.json');
    const receive = sha => { const s = JSON.parse(fs.readFileSync(station, 'utf8')); s.installation.received = sha; fs.writeFileSync(station, JSON.stringify(s, null, 2) + '\n'); return commit(source, 'installation.received ' + sha); };
    const version = JSON.parse(fs.readFileSync(path.join(source, 'package.json'), 'utf8')).version;
    // Paketprovet utgår från en publicering utan tidigare mottagning.
    const s = JSON.parse(fs.readFileSync(station, 'utf8')); delete s.installation.received; delete s.installation.receivedNote;
    fs.writeFileSync(station, JSON.stringify(s, null, 2) + '\n'); commit(source, 'Utan mottagning');
    const first = publish(); assert.equal(first.status, 0, first.output); assert.match(first.output, /Publicerat i /);

    // Benny rättar i stationens förråd: ett dokument och, som i tk-tkl #3 och #5, en egen version.
    git(dir, 'clone', '-q', remote, benny);
    git(benny, 'config', 'user.name', 'Benny'); git(benny, 'config', 'user.email', 'benny@example.test');
    fs.appendFileSync(path.join(benny, 'docs/trakvista.md'), '\nBennys rättelse.\n');
    const pkg = JSON.parse(fs.readFileSync(path.join(benny, 'package.json'), 'utf8'));
    fs.writeFileSync(path.join(benny, 'package.json'), JSON.stringify({ ...pkg, version: '0.0.1-benny' }, null, 2) + '\n');
    const corrected = commit(benny, 'Bennys rättelse'); git(benny, 'push', '-q', 'origin', 'HEAD:main');
    const missing = publish();
    assert.notEqual(missing.status, 0, missing.output);
    assert.match(missing.output, /har ändringar som inte finns i cda-tkl än/); assert.match(missing.output, /^  docs\/trakvista\.md$/m); assert.match(missing.output, /^  package\.json$/m);

    // Dokumentet tas in; versionen kan aldrig bli byte-lika och stoppar fortfarande.
    fs.appendFileSync(path.join(source, 'docs/trakvista.md'), '\nBennys rättelse.\n'); commit(source, 'Ta in Bennys rättelse');
    const versionOnly = publish();
    assert.notEqual(versionOnly.status, 0, versionOnly.output);
    assert.match(versionOnly.output, /^  package\.json$/m); assert.doesNotMatch(versionOnly.output, /^  docs\/trakvista\.md$/m);

    // installation.received: cda-tkl har tagit in stationens förråd till och med Bennys commit.
    receive('0'.repeat(40));
    const unknown = publish(); assert.notEqual(unknown.status, 0); assert.match(unknown.output, /installation\.received \(0{40}\) finns inte/);
    receive(corrected);
    const taken = publish(); assert.equal(taken.status, 0, taken.output);
    const published = JSON.parse(git(remote, 'show', 'main:package.json'));
    assert.equal(published.version, version, 'cda-tkl:s version publiceras');
    assert.match(git(remote, 'show', 'main:docs/trakvista.md'), /Bennys rättelse\./);

    // En senare rättelse efter mottagningen stoppar som vanligt, och bara den listas.
    git(benny, 'pull', '-q', 'origin', 'main');
    fs.appendFileSync(path.join(benny, 'stations/trakvista/README.md'), '\nSenare rättelse.\n');
    commit(benny, 'Senare rättelse'); git(benny, 'push', '-q', 'origin', 'HEAD:main');
    const later = publish();
    assert.notEqual(later.status, 0, later.output);
    assert.match(later.output, /Senare rättelse/); assert.doesNotMatch(later.output, /Bennys rättelse/);
    assert.match(later.output, /^  stations\/trakvista\/README\.md$/m); assert.doesNotMatch(later.output, /^  package\.json$/m);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('alla plattformar tar med hjälparna som gatewayen och servern startar', () => {
  const gateway = fs.readFileSync(path.join(root, 'scripts/locobuffer-gateway.mjs'), 'utf8');
  const started = [...gateway.matchAll(/'([\w-]+\.py)'/g)].map(m => 'scripts/' + m[1]);
  for (const file of fs.readdirSync(path.join(root, 'src')).filter(f => f.endsWith('.mjs')))
    for (const m of fs.readFileSync(path.join(root, 'src', file), 'utf8').matchAll(/scripts\/[\w-]+\.(?:mjs|py)/g)) started.push(m[0]);
  assert.ok(started.includes('scripts/bluetooth-port.py'), 'BTLocoBridge går genom bluetooth-port.py');
  for (const script of new Set(started)) assert.ok(fs.existsSync(path.join(root, script)), script + ' saknas i det publika förrådet');
  // Installationen hämtar hela förrådet och kopierar hela scripts-katalogen, utan separat publiceringslista.
  for (const name of ['scripts/install-raspberry-pi.sh', 'scripts/install-mac.sh'])
    assert.match(fs.readFileSync(path.join(root, name), 'utf8'), /for item in [^;]*\bscripts\b[^;]*; do/);
  assert.match(fs.readFileSync(path.join(root, 'install.ps1'), 'utf8'), /foreach \(\$Item in [^)]*'scripts'/);
});
