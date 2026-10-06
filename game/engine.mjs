export const ASSETS=['Cash','Bitcoin','Gold','Gov. bonds','U.S. stocks','China stocks','Thai stocks'];
import {ROUNDS} from './scenarios.mjs';
import {legacyRound} from './legacy-round.mjs';
export const assetsFor=s=>ASSETS.slice(0,s.scenarioVersion>=3?7:5);
export const roundsFor=s=>s.scenarioVersion>=3?ROUNDS:ROUNDS.map((r,i)=>i===2&&s.scenarioVersion!==2?legacyRound:{...r,recap:r.recap.split(' China stocks (MCHI)')[0],path:r.path.map(p=>p.slice(0,5)),baselineDates:r.baselineDates.slice(0,5)});
export {ROUNDS} from './scenarios.mjs';
export const NAMES=['Northstar','Black Swan','Alpha Collective','The Contrarians','Capital Crew','Redline','Long Horizon','Apex Partners','Value Seekers','Momentum'];
const STRATEGIES=[[10,30,15,15,30],[35,5,25,25,10],[5,45,10,5,35],[20,10,35,25,10],[10,10,10,30,40],[0,65,5,5,25],[10,10,20,35,25],[15,20,20,20,25],[25,5,25,25,20],[5,40,5,10,40]];
export function createGame(count=8){if(!Number.isInteger(count)||count<6||count>10)throw Error('Choose 6–10 teams.');return {scenarioVersion:3,round:0,phase:'ready',submitted:false,teams:NAMES.slice(0,count).map((name,id)=>({id,name,value:100000,peak:100000,drawdown:0,holdings:[100000,0,0,0,0,0,0],history:[100000],pnl:0,contributions:[0,0,0,0,0,0,0],weights:[100,0,0,0,0,0,0]})),snapshots:[]};}
export function prepareNextRound(s){if(s.phase!=='recap'||s.round>=6)throw Error('There is no next briefing.');s.phase='ready';s.submitted=false;return s;}
export function startRound(s){if(s.phase!=='ready'||s.round>=6)throw Error('No round can be opened.');s.phase='trading';s.submitted=false;return s;}
export function submitTeams(s){if(s.phase!=='trading')throw Error('Trading is not open.');s.teams.forEach(t=>{t.weights=[...STRATEGIES[t.id]];if(s.scenarioVersion>=3){const stock=t.weights[4];t.weights[4]=stock/2;t.weights.push(stock/4,stock/4);}if(s.round%2){const shift=Math.min(5,t.weights[1]);t.weights[0]+=shift;t.weights[1]-=shift;}});s.submitted=true;return s;}
export function revealRound(s){if(s.phase!=='trading'||!s.submitted)throw Error('Simulate team submissions first.');const r=roundsFor(s)[s.round];s.teams.forEach(t=>{const prev=t.value,base=t.weights.map(w=>prev*w/100);r.path.forEach(step=>{const value=base.reduce((sum,v,i)=>sum+v*(1+step[i]/100),0);t.peak=Math.max(t.peak,value);t.drawdown=Math.max(t.drawdown,(t.peak-value)/t.peak*100);t.history.push(value);});t.holdings=base.map((v,i)=>v*(1+r.path.at(-1)[i]/100));t.value=t.holdings.reduce((a,b)=>a+b,0);t.pnl=t.value-prev;t.contributions=base.map((v,i)=>v*r.path.at(-1)[i]/100);t.previous=prev;});s.round++;s.phase='recap';s.snapshots.push(structuredClone(s.teams));return s;}
export function standings(teams){return [...teams].sort((a,b)=>b.value-a.value||a.id-b.id);}
export function riskEligible(teams){const sorted=standings(teams),cut=sorted[Math.ceil(sorted.length/2)-1].value;return sorted.filter(t=>t.value>=cut-1e-8).sort((a,b)=>a.drawdown-b.drawdown||b.value-a.value);}
export function awardWinners(teams){const sorted=standings(teams),risk=riskEligible(teams);return {returns:sorted.filter(t=>Math.abs(t.value-sorted[0].value)<1e-8),risk:risk.filter(t=>Math.abs(t.drawdown-risk[0].drawdown)<1e-8)};}
