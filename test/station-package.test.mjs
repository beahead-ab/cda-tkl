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

test('stationspaketet behåller källimporten och publiceringen stoppar gamla genererade filer', { timeout: 120000 }, () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tkl-paketprov-'));
  const source = path.join(dir, 'source'), remote = path.join(dir, 'remote.git'), bin = path.join(dir, 'bin');
  const packages = [];
  try {
    fs.mkdirSync(source); fs.mkdirSync(bin);
    // Läs arbetsträdets filer så att även en ännu inte committad rättelse provas. Driftdata och beroenden följer inte med.
    for (const name of git(root, 'ls-files', '-z').split('\0').filter(Boolean)) {
      const from = path.join(root, name), to = path.join(source, name);
      if (!fs.existsSync(from)) continue;
      fs.mkdirSync(path.dirname(to), { recursive: true }); fs.copyFileSync(from, to);
      fs.chmodSync(to, fs.statSync(from).mode);
    }
    git(source, 'init', '-q', '-b', 'main');
    git(source, 'config', 'user.name', 'TKL paketprov'); git(source, 'config', 'user.email', 'paketprov@example.test');
    git(source, 'add', '-A'); git(source, 'commit', '-qm', 'Underlag för paketprovet');
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
    for (const name of ['profiles', 'public/data', 'docs/arbetsjournal.md', 'deploy/publish-station.sh', 'scripts/test-render-container.mjs']) {
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
