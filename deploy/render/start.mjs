import http from 'node:http';
import fs from 'node:fs';
import {spawn} from 'node:child_process';
const origin = process.env.CHARLOTTENDAL_PUBLIC_ORIGIN || process.env.RENDER_EXTERNAL_URL;
if (!origin || new URL(origin).protocol !== 'https:' || new URL(origin).origin !== origin) throw Error('En publik HTTPS-adress krävs');
const host = new URL(origin).host;
const data = process.env.CDA_RENDER_DATA_DIR || '/data';
const tklPort=Number(process.env.CDA_RENDER_TKL_PORT || 8910), simPort=Number(process.env.CDA_RENDER_SIM_PORT || 8911);
const wirePort=Number(process.env.CDA_RENDER_WIRE_PORT || 8912);
const env = {...process.env, CHARLOTTENDAL_PUBLIC_ORIGIN:origin, CHARLOTTENDAL_STATE_DIR:data+'/state',
 CHARLOTTENDAL_AUTH_MODE:'password', CHARLOTTENDAL_AUTH_FILE:data+'/auth/auth.json',
 CHARLOTTENDAL_CONNECTION_MODE:'simulator', CHARLOTTENDAL_WIRE_HOST:'127.0.0.1', CHARLOTTENDAL_WIRE_PORT:String(wirePort),
 CHARLOTTENDAL_PORT:String(tklPort), CHARLOTTENDAL_INSTALL_KIND:'render', CHARLOTTENDAL_SIM_PORT:String(simPort), CHARLOTTENDAL_FIELD_URL:'/anlaggning/', CHARLOTTENDAL_TKL_URL:'/'};
let children=[], stopping=false, started=false;
function stop(code=0) {
 if(stopping)return;stopping=true;clearInterval(poll);
 for(const child of children)child.kill('SIGTERM');
 server.close();setTimeout(()=>{for(const child of children)child.kill('SIGKILL');process.exit(code);},1500);
}
function start() {
 if(started || !fs.existsSync(data+'/.restored'))return;
 if(!fs.existsSync(env.CHARLOTTENDAL_AUTH_FILE))throw Error('Återställd autentiseringsfil saknas');
 started=true;
 children=['src/simulator.mjs','src/server.mjs'].map(file=>spawn(process.execPath,[file],{env,stdio:'inherit'}));
 for(const child of children) {child.on('error',()=>stop(1));child.on('exit',code=>{if(!stopping)stop(code || 1);});}
 console.log('CDA-TKL: återställd installation startad');
}
const server=http.createServer((req,res)=>{
 if(req.url==='/healthz'){
  res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'});
  res.end(JSON.stringify({status:started?'running':'waiting-for-restore'}));return;
 }
 if(req.headers.host!==host){res.writeHead(400);res.end('Otillåten värd');return;}
 if(!started){res.writeHead(503,{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store'});res.end('CDA-TKL förbereds för flytt.');return;}
 const simulator=req.url==='/anlaggning' || req.url.startsWith('/anlaggning/');
 if(req.url==='/anlaggning'){res.writeHead(308,{Location:'/anlaggning/'});res.end();return;}
 const upstream=http.request({hostname:'127.0.0.1',port:simulator?simPort:tklPort,
  method:req.method,path:simulator?req.url.slice('/anlaggning'.length):req.url,
  headers:{...req.headers,host,'x-forwarded-proto':'https',connection:'close'}},response=>{
   res.writeHead(response.statusCode,response.headers);response.pipe(res);
  });
 upstream.on('error',()=>{if(!res.headersSent)res.writeHead(502);res.end();});
 req.on('aborted',()=>upstream.destroy());res.on('close',()=>upstream.destroy());req.pipe(upstream);
});
server.listen(Number(process.env.PORT || 10000),process.env.CDA_RENDER_LISTEN || '0.0.0.0',()=>console.log('CDA-TKL: Render-gateway startad'));
server.on('error',()=>stop(1));
const poll=setInterval(start,1000);start();
process.on('SIGTERM',()=>stop());process.on('SIGINT',()=>stop());
