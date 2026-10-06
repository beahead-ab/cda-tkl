import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {UserAuth} from '../src/auth.mjs';
import {ROLES} from '../src/users.mjs';

// A request as the server sees it after the cookie is set; body() is only read on /api/auth/.
const request=(method,url,cookie,origin='https://tkl.example')=>({method,url,headers:{cookie,origin},on(){}});
const response=()=>{const r={status:0,headers:{},writeHead(status,headers){r.status=status;Object.assign(r.headers,headers);},setHeader(k,v){r.headers[k]=v;},end(){}};return r;};

test('a user invited as rangerare logs in and reaches only the ranger\'s view and API',async()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'cda-ranger-'));
  const env={CHARLOTTENDAL_AUTH_MODE:'password',CHARLOTTENDAL_PUBLIC_ORIGIN:'https://tkl.example',CHARLOTTENDAL_USERS_FILE:path.join(dir,'users.json')};
  const auth=new UserAuth({env,root:dir,primary:true,stateDir:dir,mode:'external'});
  assert.deepEqual(ROLES,['owner','admin','ranger']);
  await auth.users.createOwner({username:'casper',password:'hemligt1'});
  const invited=auth.users.invite({username:'rangeraren',role:'ranger'});
  assert.equal(invited.user.role,'ranger');
  assert.throws(()=>auth.users.invite({username:'xyz',role:'chef'}),/ägare, administratör eller rangerare/);
  const user=await auth.users.redeem({username:'rangeraren',code:invited.code,password:'hemligt2'});
  const cookie='__Host-cda_session='+auth.users.issueSession(user.id).token;
  const url=p=>new URL('https://tkl.example'+p);
  // The ranger's own calls pass; TKL's and the administration do not.
  for(const [method,p] of [['POST','/api/ranger/request'],['POST','/api/ranger/turnout'],['GET','/api/state'],['GET','/'],['GET','/api/route-targets?from=x&kind=shunt&operator=ranger']])
    assert.equal(await auth.handle(request(method,p,cookie),response(),url(p)),false,method+' '+p);
  for(const [method,p] of [['POST','/api/turnout'],['POST','/api/route'],['POST','/api/all-stop'],['POST','/api/ranger/answer'.replace('ranger/answer','yard-authority')],['GET','/studio.html'],['GET','/api/users'],['POST','/api/users/invite']])
    await assert.rejects(auth.handle(request(method,p,cookie),response(),url(p)),/bara rangerarens vy/,method+' '+p);
  assert.equal(auth.operator(request('POST','/api/ranger/request',cookie)),'ranger');
  assert.throws(()=>auth.requireRole(request('GET','/api/users',cookie),'admin'),/bara rangerarens vy/);
  // The owner is TKL and reaches everything as before.
  const owner=await auth.users.login({username:'casper',password:'hemligt1'});
  const ownerCookie='__Host-cda_session='+auth.users.issueSession(owner.id).token;
  for(const [method,p] of [['POST','/api/turnout'],['GET','/api/users'],['POST','/api/ranger/answer']])assert.equal(await auth.handle(request(method,p,ownerCookie),response(),url(p)),false,method+' '+p);
  assert.equal(auth.operator(request('POST','/api/turnout',ownerCookie)),'tkl');
  assert.equal(auth.users.summary().users.map(u=>u.role).join(','),'owner,ranger');
  fs.rmSync(dir,{recursive:true,force:true});
});
