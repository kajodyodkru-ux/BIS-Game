// Exercise the real API with two simulated identities and an isolated SQLite database.
// Only the platform identity provider and the D1 transport are substituted.
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import ts from 'typescript';

const sqlite=new DatabaseSync(':memory:');
sqlite.exec(readFileSync(new URL('../drizzle/0000_goofy_amazoness.sql',import.meta.url),'utf8'));
let user=null;
const database={prepare(sql){return {bind(...args){const stmt=sqlite.prepare(sql);return {
 async first(){return stmt.get(...args)??null;},
 async all(){return {results:stmt.all(...args)};},
 async run(){return {meta:{changes:Number(stmt.run(...args).changes)}};}
};}};}};
globalThis.__hostAccessTest={database,getUser:()=>user};
const dataModule=code=>'data:text/javascript;base64,'+Buffer.from(code).toString('base64');
const dbModule=dataModule('export function database(){return globalThis.__hostAccessTest.database;}');
const authModule=dataModule('export async function getChatGPTUser(){return globalThis.__hostAccessTest.getUser();}');
let source=readFileSync(new URL('../lib/game-api.ts',import.meta.url),'utf8');
source=source.replace("'./db'",JSON.stringify(dbModule))
 .replace("'../app/chatgpt-auth'",JSON.stringify(authModule))
 .replace("'../game/live.mjs'",JSON.stringify(new URL('../game/live.mjs',import.meta.url).href))
 .replace("'qrcode'",JSON.stringify(import.meta.resolve('qrcode')));
const compiled=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;
const {gameApi}=await import(dataModule(compiled));
const hostA={userId:'test-host-a',email:'a@example.test'},hostB={userId:'test-host-b',email:'b@example.test'};
async function call(identity,path,body,status=200,cookie=''){
 user=identity;
 const response=await gameApi(new Request('https://example.test/api/game/'+path,{
  method:body?'POST':'GET',headers:{'Content-Type':'application/json',origin:'https://example.test',cookie},body:body?JSON.stringify(body):undefined
 }));
 const text=await response.text();assert.equal(response.status,status,text);
 return {data:response.headers.get('content-type')?.includes('json')?JSON.parse(text):text,cookie:response.headers.get('set-cookie')?.split(';')[0]??''};
}
try{
 await call(null,'rooms',undefined,403);
 await call(null,'rooms',{mode:'live',userId:hostA.userId,email:hostA.email},403);
 const a=(await call(hostA,'rooms',{mode:'live'},201)).data.code;
 const b=(await call(hostB,'rooms',{mode:'live'},201)).data.code;
 assert.notEqual(a,b);
 assert.deepEqual((await call(hostA,'rooms')).data.rooms.map(r=>r.code),[a]);
 assert.deepEqual((await call(hostB,'rooms')).data.rooms.map(r=>r.code),[b]);
 for(const [other,code] of [[hostB,a],[hostA,b]]){
  await call(other,`room/${code}?role=host`,undefined,403);
  await call(other,`room/${code}/qr`,undefined,403);
  await call(other,`room/${code}/action`,{action:'begin',round:0,phase:'lobby'},403);
 }
 const joined=await call(null,`room/${a}/join`,{name:'Anonymous players'});
 assert.ok(joined.cookie);
 await call(null,`room/${a}?role=host`,undefined,403,joined.cookie);
 await call(null,`room/${a}/action`,{action:'begin',round:0,phase:'lobby'},403,joined.cookie);
 assert.match((await call(hostA,`room/${a}/qr`)).data,/<svg/);
 await call(hostA,`room/${a}/action`,{action:'begin',round:0,phase:'lobby'});
 await call(hostA,`room/${a}/action`,{action:'start',round:0,phase:'ready'});
 await call(null,`room/${a}/submit`,{round:0,weights:[100,0,0,0,0,0,0]},200,joined.cookie);
 await call(hostB,`room/${a}/submit`,{round:0,weights:[100,0,0,0,0,0,0]},401);
 assert.equal((await call(hostB,`room/${b}?role=host`)).data.game.phase,'lobby');
 assert.equal((await call({...hostA,email:'changed@example.test'},`room/${a}?role=host`)).data.game.phase,'trading');
 assert.equal((await call(null,`room/${a}`,undefined,200,joined.cookie)).data.team.name,'Anonymous players');
 console.log('PASS: two independent hosts can create/list their own rooms; cross-host reads, QR and actions denied; identity is user ID; anonymous players can join and submit but cannot host.');
}finally{sqlite.close();delete globalThis.__hostAccessTest;}
