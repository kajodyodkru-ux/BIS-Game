// Runs only against an isolated local instance of the production Worker.
import assert from 'node:assert/strict';
import {spawn,execFileSync} from 'node:child_process';
import {mkdirSync,writeFileSync,existsSync} from 'node:fs';
import {createRequire} from 'node:module';
import {ROUNDS} from '../game/engine.mjs';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright':'playwright');
const base='http://127.0.0.1:4173';
const auth={'oai-authenticated-user-id':'qa-host','oai-authenticated-user-email':'host@example.test'};
const server=spawn(process.execPath,['--import','./scripts/sites-env.mjs','./node_modules/wrangler/bin/wrangler.js','dev','--config','dist/server/wrangler.json','--local','--persist-to','.wrangler/state','--ip','127.0.0.1','--port','4173','--inspector-port','0','--var','HOST_EMAIL:host@example.test'],{stdio:['ignore','pipe','pipe']});
let log='';server.stdout.on('data',d=>log+=d);server.stderr.on('data',d=>log+=d);
let browser;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const successes=[];
const check=s=>{successes.push(s);console.log('PASS: '+s)};
mkdirSync('work',{recursive:true});
try{
 for(let i=0;i<90;i++){try{if((await fetch(base+'/join')).ok)break;}catch{}if(i===89)throw Error('Server did not start: '+log.slice(-2000));await sleep(500);}
 browser=await chromium.launch({headless:true,executablePath:process.env.QA_CHROMIUM_EXECUTABLE||(existsSync('.sites-runtime/browser/chromium')?process.cwd()+'/.sites-runtime/browser/chromium':undefined),args:['--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--no-zygote']});
 const hostContext=await browser.newContext({viewport:{width:1440,height:1050},extraHTTPHeaders:auth});
 const aContext=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 const bContext=await browser.newContext({viewport:{width:360,height:800},isMobile:true,hasTouch:true});
 const spareContext=await browser.newContext({viewport:{width:375,height:812},isMobile:true,hasTouch:true});
 const host=await hostContext.newPage(),a=await aContext.newPage(),b=await bContext.newPage(),spare=await spareContext.newPage();
 const errors=[];for(const page of [host,a,b,spare])page.on('pageerror',e=>errors.push(e.message));
 async function call(context,path,data){return context.pages()[0].evaluate(async({path,data})=>{const r=await fetch(path,{method:data?'POST':'GET',headers:data?{'Content-Type':'application/json'}:{},body:data?JSON.stringify(data):undefined});return {status:r.status,text:await r.text()};},{path,data});}
 async function get(context,path){const r=await call(context,path);assert.equal(r.status,200,r.text);return JSON.parse(r.text);}
 async function post(context,path,data,status=200){const r=await call(context,path,data);assert.equal(r.status,status,r.text);return JSON.parse(r.text);}
 const textIs=async(page,selector,text)=>page.waitForFunction(({selector,text})=>document.querySelector(selector)?.textContent.includes(text),{selector,text},{timeout:15000});
 const fits=async(page)=>assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Horizontal overflow on '+page.url());
 await host.goto(base+'/host');await host.locator('[data-create="live"]').click();await host.waitForURL(/room=\d{6}/);
 const code=new URL(host.url()).searchParams.get('room'),room='/api/game/room/'+code;
 await host.locator('.qr-wrap img').waitFor();await host.locator('.qr-wrap img').evaluate(img=>img.decode());
 await host.locator('.qr-wrap img').screenshot({path:'work/qr.png'});
 const decoded=execFileSync('python',['-c',"import sys;sys.path.insert(0,'.sites-runtime/qa-python');import zxingcpp;from PIL import Image;print(zxingcpp.read_barcode(Image.open('work/qr.png')).text)"],{encoding:'utf8'}).trim();
 assert.equal(decoded,base+'/join?room='+code);
 await host.screenshot({path:'work/host-lobby.png',fullPage:true});
 check('Host creates a saved room; rendered QR independently decodes to its join URL');
 await a.goto(decoded);await textIs(a,'#lobby-status','Lobby open');assert.equal(await a.locator('#room-code').inputValue(),code);
 await a.screenshot({path:'work/mobile-join.png',fullPage:true});await fits(a);
 await a.locator('#team-name').fill('ทีม Alpha');await a.locator('button[type="submit"]').click();await a.waitForURL(/\/play\?room=/);await textIs(a,'.p-waiting','take your seat');
 const original=await get(aContext,room);
 await b.goto(decoded);await textIs(b,'#lobby-status','Lobby open');await b.locator('#team-name').fill('ทีม Alpha');await b.locator('button[type="submit"]').click();await textIs(b,'#team-message','taken');
 await b.locator('#team-name').fill('Beta');await b.locator('button[type="submit"]').click();await b.waitForURL(/\/play\?room=/);await textIs(b,'.p-waiting','take your seat');
 await textIs(host,'.roster','Beta');await host.reload();await textIs(host,'.roster','ทีม Alpha');
 await a.reload();await textIs(a,'.p-waiting','take your seat');assert.equal((await get(aContext,room)).team.id,original.team.id);
 await a.goto(decoded);await a.waitForURL(/\/play\?room=/);assert.equal((await get(hostContext,room+'?role=host')).game.teams.length,2);
 await a.screenshot({path:'work/mobile-lobby.png',fullPage:true});await fits(a);
 check('QR-prefilled mobile join, duplicate-name rejection, live roster, reload and reconnect without duplicate teams');
 assert.equal((await aContext.request.get(base+room+'?role=host')).status(),403);
 assert.equal((await aContext.request.get(base+room+'/qr')).status(),403);
 assert.equal((await aContext.request.post(base+room+'/action',{data:{action:'begin',round:0,phase:'lobby'}})).status(),403);
 assert.equal((await spareContext.request.post(base+room+'/submit',{data:{round:0,weights:[100,0,0,0,0,0,0]}})).status(),401);
 check('Player cannot operate host controls, fetch host view or QR, or submit without a team session');
 await host.locator('[data-action="begin"]').click();await textIs(a,'.p-round-heading','Read. Discuss. Decide.');
 const hidden=await get(aContext,room);assert.equal(hidden.scenario.year,null);assert.deepEqual(hidden.scenario.path,[]);assert.equal(hidden.scenario.newsSource,undefined);assert.equal(hidden.scenario.recap,undefined);assert.ok(!JSON.stringify(hidden).includes('tokenHash'));
 const hv=await get(hostContext,room+'?role=host');assert.equal(hv.rounds[0].year,null);assert.deepEqual(hv.rounds.slice(1),Array(5).fill(null));
 await a.screenshot({path:'work/mobile-news.png',fullPage:true});await fits(a);
 await spare.goto(decoded);await textIs(spare,'#lobby-status','already started');assert.equal(await spare.locator('button[type="submit"]').isDisabled(),true);
 check('News arrives before trading; year, dates, returns and future rounds stay server-side; late joins are blocked');
 await host.locator('[data-action="start"]').click();await a.locator('#submit-allocation').waitFor();
 await a.locator('#weight-0').fill('90');assert.equal(await a.locator('#submit-allocation').isDisabled(),true);
 await post(aContext,room+'/submit',{round:0,weights:[-10,110,0,0,0]},400);
 for(let i=0;i<5;i++)await a.locator('#weight-'+i).fill('20');
 await a.screenshot({path:'work/mobile-allocation.png',fullPage:true});await fits(a);
 await a.locator('#submit-allocation').click();await textIs(a,'.p-confirmation','Your decision is in');
 await a.reload();await textIs(a,'.p-confirmation','Your decision is in');
 await a.locator('[data-action="edit"]').click();await a.locator('#weight-0').fill('40');await a.locator('#weight-1').fill('0');await a.locator('#submit-allocation').click();await textIs(a,'.p-confirmation','Your decision is in');
 await textIs(host,'.desk','1 of 2 teams submitted');await host.locator('[data-action="reveal"]').click();await host.locator('[data-action="confirm-reveal"]').click();await textIs(a,'.p-result-hero','2021 REVEALED');await textIs(b,'.p-result-hero','2021 REVEALED');
 const av=await get(aContext,room),bv=await get(bContext,room);assert.equal(bv.team.value,100000);
 const expected=100000*(1+[40,0,20,20,20,0,0].reduce((sum,w,i)=>sum+w/100*ROUNDS[0].path.at(-1)[i]/100,0));assert.ok(Math.abs(av.team.value-expected)<1e-6);
 assert.equal(av.leaderboard.length,2);await post(aContext,room+'/submit',{round:0,weights:[100,0,0,0,0,0,0]},400);
 await a.screenshot({path:'work/mobile-results.png',fullPage:true});await fits(a);
 check('100% validation, submit/edit persistence, host carry-forward confirmation, correct returns and synchronized year reveal');
 for(let round=1;round<6;round++){
  let h=await get(hostContext,room+'?role=host');await post(hostContext,room+'/action',{action:'prepare',round:h.game.round,phase:h.game.phase});
  let s=await get(aContext,room);assert.equal(s.scenario.year,null);assert.deepEqual(s.scenario.dates,[]);
  h=await get(hostContext,room+'?role=host');await post(hostContext,room+'/action',{action:'start',round:h.game.round,phase:h.game.phase});
  const beforeB=(await get(bContext,room)).team.value;
  await Promise.all([post(aContext,room+'/submit',{round,weights:[100,0,0,0,0,0,0]}),post(bContext,room+'/submit',{round,weights:[0,100,0,0,0,0,0]})]);
  h=await get(hostContext,room+'?role=host');assert.equal(h.game.submitted,true);await post(hostContext,room+'/action',{action:'reveal',round:h.game.round,phase:h.game.phase});
  s=await get(bContext,room);assert.equal(s.scenario.year,ROUNDS[round].year);assert.ok(Math.abs(s.team.value-beforeB*(1+ROUNDS[round].path.at(-1)[1]/100))<1e-6);
  if(round===1)assert.ok(s.team.pnl<0,'Bitcoin decline year retained');
 }
 await textIs(a,'.p-result-hero','Your final portfolio');await textIs(b,'.p-result-hero','Your final portfolio');await fits(b);assert.equal((await get(aContext,room)).round,6);
 let h=await get(hostContext,room+'?role=host');await post(hostContext,room+'/action',{action:'close',round:h.game.round,phase:h.game.phase});await textIs(a,'.p-waiting','closing bell');
 await post(spareContext,room+'/join',{name:'Late Team'},400);
 await spare.goto(base+'/join?room=000000');await textIs(spare,'#lobby-status','expired');assert.equal(await spare.locator('button[type="submit"]').isDisabled(),true);
 assert.deepEqual(errors,[]);check('Six complete rounds including the Bitcoin decline, simultaneous submissions, final awards, ended/invalid rooms and no browser exceptions');
 writeFileSync('work/flow-results.json',JSON.stringify({testedAt:new Date().toISOString(),browser:'Chromium',mobileWidths:[360,375,390],backend:'Built production Worker + local D1',checks:successes},null,2));
 console.log('ALL FLOW CHECKS PASSED');
}catch(e){console.error(e);process.exitCode=1;}
finally{await browser?.close();server.kill('SIGTERM');}
