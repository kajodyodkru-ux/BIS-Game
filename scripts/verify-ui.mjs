import assert from 'node:assert/strict';
import {editAllocation} from '../public/allocation-ui.mjs';
import {allocationSummary,renderPlayer} from '../public/player-view.mjs';
import {newRoom,addTeam,hostAction,teamView} from '../game/live.mjs';
for(const count of [5,7]){
 const allCash=Array(count).fill(0);allCash[0]=100;
 let w=editAllocation(allCash,1,30);assert.equal(w[0],70);assert.equal(w[1],30);assert.equal(allocationSummary(w,100000).valid,true);
 w=editAllocation(w,2,80);assert.equal(w[0],0);assert.equal(allocationSummary(w,100000).valid,false);
 w=editAllocation(w,2,35.5);assert.equal(w[0],34.5);assert.equal(w.reduce((a,b)=>a+b),100);
 assert.equal(editAllocation(w,2,-1)[2],0);assert.equal(editAllocation(w,2,500)[2],100);
 assert.deepEqual(allCash,[100,...Array(count-1).fill(0)]);
}
assert.deepEqual(editAllocation([20,20,15,15,10,10,10],1,30),[10,30,15,15,10,10,10]);
const g=newRoom();addTeam(g,'QA','token');hostAction(g,{action:'begin'});hostAction(g,{action:'start'});
const s=teamView({code:'123456',state:JSON.stringify(g),revision:1},0),markup=renderPlayer(s);
assert.match(markup,/Calculated automatically/);assert.match(markup,/Confirm portfolio/);assert.match(markup,/Round progress/);assert.doesNotMatch(markup,/id="weight-0"/);assert.match(markup,/Undo changes/);assert.equal((markup.match(/id="submit-allocation"/g)||[]).length,1);
console.log('PASS: automatic cash for 5 and 7 assets, overspending, decimal weights, clamping, immutable inputs, hidden-year editor, one submission control.');
// A partial roster must show proportional progress, not only all-or-nothing.
const {hostView}=await import('../game/live.mjs');
const hostGame=newRoom('practice');hostAction(hostGame,{action:'begin'});hostAction(hostGame,{action:'start'});hostGame.mode='live';hostGame.teams[0].submittedRound=0;
const payload=hostView({code:'123456',state:JSON.stringify(hostGame),revision:1});
const nodes=Object.fromEntries(['#app','#modal','#toast'].map(k=>[k,{innerHTML:'',classList:{add(){},remove(){},toggle(){}},showModal(){},close(){}}]));
globalThis.document={querySelector:s=>nodes[s],body:{classList:{toggle(){},remove(){}}},addEventListener(){}};
globalThis.location={search:'?room=123456',origin:'https://example.test'};globalThis.setInterval=()=>0;
globalThis.fetch=async()=>({ok:true,status:200,json:async()=>structuredClone(payload)});
await import('../public/host.mjs?ui-test');
assert.match(nodes['#app'].innerHTML,/aria-valuenow="1"/);assert.match(nodes['#app'].innerHTML,/width:12.5%/);assert.match(nodes['#app'].innerHTML,/✓ Submitted/);assert.match(nodes['#app'].innerHTML,/Waiting/);
console.log('PASS: host partial-submission progress and individual team statuses.');
