import assert from 'node:assert/strict';
import {newRoom,addTeam,hostAction,allocate,teamView} from '../game/live.mjs';
import {renderPlayer,allocationSummary} from '../public/player-view.mjs';
const game=newRoom();const a=addTeam(game,'Our Team','secret-a');addTeam(game,'Second Team','secret-b');const view=()=>teamView({code:'123456',state:JSON.stringify(game),revision:1},a.id);
assert.match(renderPlayer(view()),/take your seat/);
assert.equal(allocationSummary([0,40,20,20,20],100000).valid,true);
assert.equal(allocationSummary([50,40,20,20,20],100000).valid,false);
assert.equal(allocationSummary([0,0,0,0,0],100000).valid,false);
for(let i=0;i<6;i++){
 hostAction(game,{action:i===0?'begin':'prepare'});
 let s=view();assert.match(renderPlayer(s),/Get your strategy ready/);assert.equal(s.scenario.year,null);assert.equal(s.scenario.path.length,0);assert.doesNotMatch(JSON.stringify(s),/secret-a|secret-b/);
 hostAction(game,{action:'start'});s=view();assert.match(renderPlayer(s),/Submit allocation/);assert.match(renderPlayer(s),/YEAR HIDDEN/);
 assert.throws(()=>allocate(game,a.id,game.round,[100,50,0,0,0]));
 allocate(game,a.id,game.round,[20,20,10,10,10,15,15]);s=view();assert.match(renderPlayer(s),/Your decision is in/);assert.match(renderPlayer(s,{editing:true}),/Save updated allocation/);
 hostAction(game,{action:'reveal',confirmCarry:true});s=view();assert.match(renderPlayer(s),new RegExp(s.scenario.year+' REVEALED'));assert.match(renderPlayer(s),/Our Team/);assert.match(renderPlayer(s),/Where your return came from/);assert.doesNotMatch(renderPlayer(s),/NaN|undefined/);assert.throws(()=>allocate(game,a.id,game.round-1,[100,0,0,0,0]));
}
assert.match(renderPlayer(view()),/Your final portfolio/);assert.match(renderPlayer(view()),/THE AWARDS/);
hostAction(game,{action:'close'});assert.match(renderPlayer(view()),/ROOM ENDED/);
const x=view();x.team.name='<script>alert(1)</script>';assert.doesNotMatch(renderPlayer(x),/<script>/);
console.log('PASS: player lobby, briefing, allocation validation, submitted/edit states, all six result rounds, final awards, ended room, safe text, and hidden years.');
const full=newRoom();for(let i=0;i<10;i++)addTeam(full,'Team '+i,'token-'+i);
assert.throws(()=>addTeam(full,'Eleventh','new-token'),/10 teams/);
const names=newRoom();addTeam(names,'Alpha','token');assert.throws(()=>addTeam(names,'alpha','another'),/taken/);assert.throws(()=>addTeam(names,'<script>','x'));assert.throws(()=>addTeam(names,'   ','x'));
hostAction(names,{action:'close'});assert.throws(()=>addTeam(names,'Beta','b'));assert.throws(()=>hostAction(names,{action:'begin'}));
console.log('PASS: ten-team capacity, duplicate and invalid names, and closed-room guards.');
