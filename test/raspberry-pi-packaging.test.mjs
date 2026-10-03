import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('the public installer fetches the package and hands it to the Raspberry Pi installer',()=>{
  const install=read('install.sh');
  assert.match(install,/INSTALLER="scripts\/install-raspberry-pi\.sh"/);
  assert.match(install,/github\.com\/\$\{REPOSITORY\}\/archive\/refs\/heads\/\$\{BRANCH\}\.tar\.gz/);
  assert.match(install,/REPOSITORY="beahead-ab\/cda-tkl-install"/,'installs from the public install repository');
  assert.match(install,/CDA_TKL_TOKEN/,'a private fork can be read with a token');
});

test('every folder the server reads at run time is copied into a release',()=>{
  const script=read('scripts/install-raspberry-pi.sh');
  const copied=new Set(/for item in ([^;]+); do/.exec(script)[1].split(/\s+/));
  const used=new Set();
  for(const file of fs.readdirSync(new URL('../src/',import.meta.url)).filter(f=>f.endsWith('.mjs')))
    for(const m of read('src/'+file).matchAll(/new URL\(['`]\.\.\/([a-z-]+)/g))used.add(m[1]);
  used.delete('var');   // the default state folder; the installer points state at /var/lib/cda-tkl
  for(const dir of used)assert.ok(copied.has(dir)||copied.has(dir+'.json'),'release lacks '+dir);
  assert.ok(copied.has('package-lock.json'),'dependencies are installed from the lock file');
});

test('services run our own Node as the cda-tkl user, and settings are never overwritten',()=>{
  for(const unit of ['cda-tkl.service','cda-tkl-simulator.service']){
    const text=read('packaging/raspberry-pi/'+unit);
    assert.match(text,/^User=cda-tkl$/m);assert.match(text,/^ExecStart=\/opt\/cda-tkl\/node\/bin\/node src\//m);
    assert.match(text,/^EnvironmentFile=\/etc\/cda-tkl\/app\.env$/m);
  }
  assert.match(read('scripts/install-raspberry-pi.sh'),/if \[ ! -f "\$CONFIG_DIR\/app\.env" \]; then/);
  assert.match(read('packaging/raspberry-pi/app.env'),/^CHARLOTTENDAL_STATE_DIR=\/var\/lib\/cda-tkl$/m);
});

test('the Stream Deck is allowed for the panel without a dialog',()=>{
  const policy=JSON.parse(read('packaging/raspberry-pi/chromium-policy.json'));
  assert.equal(policy.WebHidAllowDevicesForUrls[0].devices[0].vendor_id,0x0fd9);
  assert.ok(policy.WebHidAllowDevicesForUrls[0].urls.includes('http://127.0.0.1:8910'));
  assert.match(read('packaging/raspberry-pi/50-cda-tkl-streamdeck.rules'),/ATTRS\{idVendor\}=="0fd9", TAG\+="uaccess"/);
  assert.match(read('packaging/raspberry-pi/cda-tkl-browser'),/--kiosk --app="\$URL"/);
});

test('the Mac and Windows installers copy the same folders as the Raspberry Pi installer',()=>{
  const pi=/for item in ([^;]+); do/.exec(read('scripts/install-raspberry-pi.sh'))[1].trim().split(/\s+/).sort();
  const mac=/for item in ([^;]+); do/.exec(read('scripts/install-mac.sh'))[1].trim().split(/\s+/).sort();
  const win=/foreach \(\$Item in ([^)]+)\)/.exec(read('install.ps1'))[1].split(',').map(s=>s.trim().replace(/'/g,'')).sort();
  assert.deepEqual(mac,pi);assert.deepEqual(win,pi);
});

test('install.sh hands a Mac to the per-user installer and refuses sudo there',()=>{
  const install=read('install.sh');
  assert.match(install,/Darwin\)[\s\S]*INSTALLER="scripts\/install-mac\.sh"[\s\S]*Kör installationen utan sudo på Mac/);
  assert.match(read('packaging/mac/launchd.plist'),/<key>KeepAlive<\/key><true\/>/);
  assert.match(read('packaging/mac/run.sh'),/exec "\$APP\/node\/bin\/node" scripts\/start\.mjs/);
});

test('the Windows installer never exits the user\'s PowerShell and starts TKL hidden at login',()=>{
  const ps=read('install.ps1');
  assert.doesNotMatch(ps,/^\s*exit\b/m,'exit would close the window opened for irm | iex');
  assert.match(ps,/GetFolderPath\('Startup'\)/);
  assert.match(ps,/--app=http:\/\/127\.0\.0\.1:8910\/#panel/);
  assert.match(read('packaging/windows/run.ps1'),/scripts\/start\.mjs/);
});

