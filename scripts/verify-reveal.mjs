import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {mountMarketReplay} from '../public/market-replay.mjs';

// Drive actual playback callbacks with a deterministic animation clock.
let queued, reduced=false;
globalThis.window={matchMedia:()=>({matches:reduced})};
globalThis.requestAnimationFrame=fn=>{queued=fn;return 1;};
globalThis.cancelAnimationFrame=()=>{queued=null;};
function fixture(key){
 const node=()=>({style:{},hidden:false,disabled:false,attributes:{},listeners:{},setAttribute(k,v){this.attributes[k]=v;},addEventListener(k,fn){this.listeners[k]=fn;}});
 const selectors=['clip','cursor','date','toggle','end'];
 const nodes=Object.fromEntries(selectors.map(s=>['[data-playback-'+s+']',node()]));
 const panel={dataset:{marketPlayback:key,days:'365',year:'2021'},isConnected:true,querySelector:s=>nodes[s]};
 const results=node(),status=node();
 const root={querySelectorAll(){},querySelector:s=>s==='[data-market-playback]'?panel:s==='[data-round-results]'?results:status};
 return {root,results,status,nodes};
}
function frame(time){const fn=queued;queued=null;assert.ok(fn,'a playback frame is queued');fn(time);}
let f=fixture('first');mountMarketReplay(f.root);
assert.equal(f.results.hidden,true);
frame(100);frame(3100);
assert.equal(f.results.hidden,true,'totals remain hidden midway');
f.nodes['[data-playback-toggle]'].listeners.click();
assert.equal(queued,null,'pause stops playback');
// A host poll or an asset selection remount must retain progress and pause.
f=fixture('first');mountMarketReplay(f.root);
assert.equal(f.results.hidden,true);assert.equal(queued,null);
f.nodes['[data-playback-toggle]'].listeners.click();frame(4000);frame(7100);
assert.equal(f.results.hidden,false,'completion reveals totals');
assert.equal(f.status.hidden,true);
f=fixture('first');mountMarketReplay(f.root);
assert.equal(f.results.hidden,false,'completed replay stays completed on rerender');
f.nodes['[data-playback-toggle]'].listeners.click();
assert.equal(f.results.hidden,true,'replay conceals results again');
f.nodes['[data-playback-end]'].listeners.click();
assert.equal(f.results.hidden,false,'skip reveals final chart and results');
assert.equal(f.nodes['[data-playback-clip]'].attributes.width,'702');
reduced=true;f=fixture('reduced');mountMarketReplay(f.root);
assert.equal(queued,null);assert.equal(f.results.hidden,true);
assert.equal(f.nodes['[data-playback-clip]'].attributes.width,'702');
assert.equal(f.nodes['[data-playback-end]'].textContent,'Show results');
f.nodes['[data-playback-end]'].listeners.click();assert.equal(f.results.hidden,false);
const host=readFileSync(new URL('../public/host.mjs',import.meta.url),'utf8');
assert.ok(host.includes("${chartMarkup('assets',teams,idx+1,idx)}<div data-round-results hidden>${assetCards(idx)}"),'graph precedes all result cards');
assert.ok(host.includes('data-playback-clip x="59" y="20" width="2"'),'initial markup cannot flash full chart');
console.log('PASS: graph before totals, completion, pause/resume, rerender, replay, skip, and reduced-motion reveal.');
