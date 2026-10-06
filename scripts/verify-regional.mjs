import assert from 'node:assert/strict';
import {createGame,ROUNDS,roundsFor,startRound,submitTeams,revealRound} from '../game/engine.mjs';
import {newRoom,addTeam,allocate,hostAction,hostView,teamView} from '../game/live.mjs';
import {renderPlayer,marketChart} from '../public/player-view.mjs';
for(let r=0;r<6;r++)for(const index of [5,6]){
 const g=newRoom(),t=addTeam(g,'Regional team','secret');g.round=r;hostAction(g,{action:'begin'});hostAction(g,{action:'start'});
 const w=[0,0,0,0,0,0,0];w[index]=100;allocate(g,t.id,r,w);hostAction(g,{action:'reveal'});
 assert.ok(Math.abs(t.value-100000*(1+ROUNDS[r].path.at(-1)[index]/100))<1e-7);
 let peak=100000,drawdown=0;for(const p of ROUNDS[r].path){const v=100000*(1+p[index]/100);peak=Math.max(peak,v);drawdown=Math.max(drawdown,(peak-v)/peak*100)}
 assert.ok(Math.abs(drawdown-t.drawdown)<1e-9);
 const view=teamView({code:'123456',state:JSON.stringify(g),revision:1},t.id);
 assert.doesNotMatch(renderPlayer(view),/NaN|undefined/);assert.doesNotMatch(marketChart(view,index),/NaN|undefined/);
 assert.match(marketChart(view,index),index===5?/China stocks/:/Thai stocks/);
}
for(const version of [1,2,3]){
 const g=newRoom('practice');if(version===1)delete g.scenarioVersion;else g.scenarioVersion=version;
 if(version<3)for(const t of g.teams)for(const k of ['weights','holdings','contributions'])t[k]=t[k].slice(0,5);
 hostAction(g,{action:'begin'});
 const row=()=>({code:'123456',state:JSON.stringify(g),revision:1});
 const hidden=teamView(row(),0);assert.equal(hidden.scenario.year,null);assert.deepEqual(hidden.scenario.path,[]);
 assert.equal(hidden.scenario.newsSource,undefined);assert.doesNotMatch(JSON.stringify(hidden),/China stocks \(MCHI\) returned|tokenHash/);
 hostAction(g,{action:'start'});hostAction(g,{action:'submit'});hostAction(g,{action:'reveal'});
 const payload=hostView(row()),nodes=Object.fromEntries(['#app','#modal','#toast'].map(k=>[k,{innerHTML:'',classList:{add(){},remove(){},toggle(){}},showModal(){},close(){}}]));
 globalThis.document={querySelector:s=>nodes[s],body:{classList:{toggle(){},remove(){}}},addEventListener(){}};
 globalThis.location={search:'?room=123456',origin:'https://example.test'};globalThis.setInterval=()=>0;
 globalThis.fetch=async()=>({ok:true,status:200,json:async()=>structuredClone(payload)});
 await import('../public/host.mjs?regional-test='+version);
 assert.doesNotMatch(nodes['#app'].innerHTML,/NaN|undefined/);
 if(version===3){assert.match(nodes['#app'].innerHTML,/China stocks/);assert.match(nodes['#app'].innerHTML,/Thai stocks/)}
 else {assert.doesNotMatch(nodes['#app'].innerHTML,/China stocks/);assert.equal(roundsFor(g)[0].path[0].length,5)}
 assert.doesNotMatch(renderPlayer(teamView(row(),0)),/NaN|undefined/);
}
console.log('PASS: China/Thai full allocations, all yearly paths and drawdowns, both player charts, hidden data, and host rendering for new and saved rooms.');
