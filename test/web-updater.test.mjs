import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync,spawnSync} from 'node:child_process';
// packaging/web/charlottendal-update, the web deployment's own updater, run in a sandbox:
// a fake /opt/charlottendal with a running release, a local install repository, and
// systemctl/curl stand-ins. It needs root (it refuses otherwise) and git.
const SCRIPT=new URL('../packaging/web/charlottendal-update',import.meta.url).pathname;
const root=process.getuid?.()===0;
function sandbox({answer}){
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'cda-web-update-'));
  const base=path.join(dir,'opt'),state=path.join(dir,'state'),bin=path.join(dir,'bin'),repo=path.join(dir,'install');
  for(const d of [path.join(base,'releases','old','src'),state,bin,path.join(repo,'src')])fs.mkdirSync(d,{recursive:true});
  fs.writeFileSync(path.join(base,'releases','old','package.json'),'{"version":"0.57.1"}');
  fs.symlinkSync(path.join(base,'releases','old'),path.join(base,'current'));
  fs.writeFileSync(path.join(repo,'package.json'),'{"version":"0.58.0"}');fs.writeFileSync(path.join(repo,'src','server.mjs'),'export const ok=1;\n');
  execFileSync('git',['init','-q','-b','main'],{cwd:repo});execFileSync('git',['-c','user.email=t@t','-c','user.name=t','commit','-qam','x','--allow-empty'],{cwd:repo});
  execFileSync('git',['add','-A'],{cwd:repo});execFileSync('git',['-c','user.email=t@t','-c','user.name=t','commit','-qm','0.58.0'],{cwd:repo});
  fs.writeFileSync(path.join(bin,'systemctl'),`#!/bin/sh\necho "$@" >> ${dir}/systemctl.log\n[ "$1" = is-active ] && exit ${answer==='ok'?0:3}\nexit 0\n`,{mode:0o755});
  fs.writeFileSync(path.join(bin,'curl'),`#!/bin/sh\necho ${answer==='ok'?400:502}\n`,{mode:0o755});
  const run=spawnSync('bash',[SCRIPT],{encoding:'utf8',env:{...process.env,PATH:bin+':'+process.env.PATH,CHARLOTTENDAL_UPDATE_SOURCE:repo,CHARLOTTENDAL_BASE:base,CHARLOTTENDAL_STATE:state,
    CHARLOTTENDAL_BACKUPS:path.join(dir,'backups'),CHARLOTTENDAL_NODE:process.execPath,CHARLOTTENDAL_NPM:'true',CHARLOTTENDAL_LOCK:path.join(dir,'lock'),CHARLOTTENDAL_BACKUP_PATHS:path.relative('/',state)}});
  const status=JSON.parse(fs.readFileSync(path.join(state,'update.json'),'utf8'));
  return {run,status,current:fs.readlinkSync(path.join(base,'current')),log:fs.readFileSync(path.join(dir,'systemctl.log'),'utf8'),base,dir};
}
test('a new release is installed, switched to and checked',{skip:!root&&'needs root'},()=>{
  // 400 is what the public deployment answers on 127.0.0.1: TKL is up.
  const {run,status,current,log,dir}=sandbox({answer:'ok'});
  assert.equal(run.status,0,run.stderr);
  assert.equal(status.phase,'done');assert.equal(status.from,'0.57.1');assert.equal(status.to,'0.58.0');
  assert.match(current,/releases\/v0\.58\.0-[0-9a-f]+$/);
  assert.match(log,/restart charlottendal-tkl/);assert.doesNotMatch(log,/simulator/,'the simulator is never touched');
  assert.equal(fs.readdirSync(path.join(dir,'backups')).length,1,'a backup first');
});
test('a release that does not come up is rolled back',{skip:!root&&'needs root'},()=>{
  const {run,status,current,base}=sandbox({answer:'down'});
  assert.notEqual(run.status,0);
  assert.equal(status.phase,'failed');assert.match(status.message,/0\.57\.1 är återställd/);
  assert.equal(current,path.join(base,'releases','old'));
});
