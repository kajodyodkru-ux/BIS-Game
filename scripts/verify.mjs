import assert from 'node:assert/strict';
import {ASSETS,ROUNDS,createGame,prepareNextRound,startRound,submitTeams,revealRound,riskEligible,awardWinners} from '../game/engine.mjs';
assert.deepEqual(ROUNDS.map(r=>r.year),[2021,2022,2024,2025,2020,2023]);
const expected={2021:[0,59.6679,-4.1489,-3.3278,28.7288,-21.7420,1.8695],2022:[0,-64.2652,-.7721,-15.1552,-18.1754,-22.7635,1.2208],2024:[0,121.0547,26.6569,-.6342,24.8865,17.7330,-2.2105],2025:[0,-6.3367,63.6765,8.032,17.7191,31.0396,2.3567],2020:[0,303.1601,24.8146,10.0068,18.3316,27.7788,-9.8941],2023:[0,155.4174,12.6916,3.6444,26.1758,-11.2916,-12.6263]};
for(const r of ROUNDS){
 assert.ok(r.newsSource.date<r.year+'-01-01');
 assert.equal(r.dates[0],r.year+'-01-01');assert.equal(r.dates.at(-1),r.year+'-12-31');
 assert.equal(r.path.length,r.year%4===0?366:365);
 assert.equal(r.path.length,r.dates.length);
 for(const row of r.path){assert.equal(row.length,7);assert.equal(row[0],0);assert.ok(row.every(v=>Number.isFinite(v)&&v>-100));}
 r.path.at(-1).forEach((v,i)=>assert.ok(Math.abs(v-expected[r.year][i])<.0001));
 assert.ok(r.news.every(n=>!n.join(' ').match(/\b(?:19|20)\d{2}\b/)));
}
for(const count of [6,7,8,9,10]){
 const g=createGame(count);assert.throws(()=>revealRound(g));
 let days=1;
 for(let i=0;i<6;i++){
  if(i)prepareNextRound(g);startRound(g);assert.throws(()=>revealRound(g));submitTeams(g);
  const before=g.teams.map(t=>t.value),weights=g.teams.map(t=>[...t.weights]);revealRound(g);days+=ROUNDS[i].path.length;
  for(const t of g.teams){
   const calculated=before[t.id]*(1+weights[t.id].reduce((sum,w,a)=>sum+w/100*ROUNDS[i].path.at(-1)[a]/100,0));
   assert.ok(Math.abs(t.value-calculated)<1e-6);assert.ok(Math.abs(t.value-t.holdings.reduce((a,b)=>a+b,0))<1e-6);
   assert.ok(Math.abs(t.pnl-t.contributions.reduce((a,b)=>a+b,0))<1e-6);
   let peak=100000,mdd=0;for(const v of t.history){peak=Math.max(peak,v);mdd=Math.max(mdd,(peak-v)/peak*100)}
   assert.ok(Math.abs(t.drawdown-mdd)<1e-10);assert.equal(t.history.length,days);
   assert.ok(t.holdings.every(v=>v>=0));assert.equal(t.weights.reduce((a,b)=>a+b,0),100);
  }
  assert.throws(()=>revealRound(g));assert.throws(()=>startRound(g));
 }
 assert.throws(()=>prepareNextRound(g));assert.equal(g.snapshots.length,6);assert.ok(riskEligible(g.teams).length>=Math.ceil(count/2));assert.ok(awardWinners(g.teams).risk.every(t=>riskEligible(g.teams).includes(t)));
}
// Isolate the 2020 path to ensure a positive final return doesn't erase the crash.
const crash=createGame();crash.round=4;startRound(crash);submitTeams(crash);crash.teams.forEach(t=>t.weights=[0,0,0,0,100,0,0]);revealRound(crash);assert.ok(crash.teams[0].drawdown>30);assert.ok(crash.teams[0].value>100000);
const cash=createGame();startRound(cash);submitTeams(cash);cash.teams.forEach(t=>t.weights=[100,0,0,0,0,0,0]);revealRound(cash);assert.equal(cash.teams[0].value,100000);assert.equal(cash.teams[0].drawdown,0);
console.log('PASS: six historical rounds, price baselines, dated news cutoffs, daily drawdowns, wealth carry-forward, phase guards and awards.');

// Saved older rooms retain their historical scoring rather than relabeling results.
const {roundsFor}=await import('../game/engine.mjs');
const legacy=createGame();delete legacy.scenarioVersion;assert.equal(roundsFor(legacy)[2].year,2017);assert.equal(roundsFor(createGame())[2].year,2024);legacy.round=2;startRound(legacy);submitTeams(legacy);legacy.teams.forEach(t=>t.weights=[0,100,0,0,0]);revealRound(legacy);assert.ok(Math.abs(legacy.teams[0].value/100000-14.688979)<.00001);
console.log('PASS: existing rooms preserve their original scenario; new rooms use 2024.');
