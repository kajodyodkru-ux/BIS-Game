import {database} from './db';
import {getChatGPTUser} from '../app/chatgpt-auth';
import {newRoom,addTeam,allocate,hostAction,hostView,teamView} from '../game/live.mjs';
import QRCode from 'qrcode';
type Row={code:string;owner:string;state:string;revision:number;created_at:number;expires_at:number};
const json=(data:unknown,status=200,headers:Record<string,string>={})=>Response.json(data,{status,headers:{'Cache-Control':'no-store',...headers}});
const cookieName=(code:string)=>'bba_team_'+code;
async function digest(value:string){const data=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value));return Array.from(new Uint8Array(data),v=>v.toString(16).padStart(2,'0')).join('');}
function token(request:Request,code:string){return request.headers.get('cookie')?.split(';').map(s=>s.trim()).find(s=>s.startsWith(cookieName(code)+'='))?.split('=').slice(1).join('=')||'';}
async function identify(request:Request,row:Row){const hash=await digest(token(request,row.code));return JSON.parse(row.state).teams.find((t:any)=>t.tokenHash===hash);}
async function owner(){const user=await getChatGPTUser();if(!user)throw Object.assign(Error('Host sign-in required.'),{status:403});return user.userId;}
function fail(message:string,status=400):never{throw Object.assign(Error(message),{status});}
async function read(code:string):Promise<Row>{if(!/^\d{6}$/.test(code))fail('Enter a six-digit room PIN.',400);const row=await database().prepare('SELECT * FROM game_rooms WHERE code = ?').bind(code).first<Row>();if(!row||row.expires_at<Date.now())fail('This room does not exist or has expired.',404);return row;}
async function change(code:string,fn:(state:any,row:Row)=>Promise<void>|void){for(let i=0;i<6;i++){const row=await read(code),state=JSON.parse(row.state);await fn(state,row);const result=await database().prepare('UPDATE game_rooms SET state = ?, revision = revision + 1 WHERE code = ? AND revision = ?').bind(JSON.stringify(state),code,row.revision).run();if(result.meta.changes===1)return {...row,state:JSON.stringify(state),revision:row.revision+1};}fail('The room is busy. Please retry your action.',409);}
async function body(request:Request){const raw=await request.text();if(raw.length>4096)fail('Request is too large.',413);try{return JSON.parse(raw)}catch{fail('Invalid request.',400)}}
export async function gameApi(request:Request){try{
 const url=new URL(request.url),parts=url.pathname.replace('/api/game/','').split('/'),method=request.method;
 if(method==='POST'){const origin=request.headers.get('origin');if(origin&&origin!==url.origin)fail('This request must come from the game website.',403);}
 if(parts[0]==='rooms'){
  const user=await owner();if(method==='GET'){const rows=await database().prepare('SELECT code, state, revision, expires_at FROM game_rooms WHERE owner = ? AND expires_at > ? ORDER BY created_at DESC LIMIT 12').bind(user,Date.now()).all<Row>();return json({rooms:rows.results.map(r=>{const g=JSON.parse(r.state);return {code:r.code,phase:g.phase,round:g.round,mode:g.mode,closed:g.closed,teams:g.teams.length}})});}
  if(method==='POST'){const b=await body(request);if(!['live','practice'].includes(b.mode))fail('Choose live or practice mode.');for(let i=0;i<8;i++){const a=new Uint32Array(1);crypto.getRandomValues(a);const code=String(100000+a[0]%900000);const now=Date.now();try{await database().prepare('INSERT INTO game_rooms (code,owner,state,revision,created_at,expires_at) VALUES (?,?,?,1,?,?)').bind(code,user,JSON.stringify(newRoom(b.mode)),now,now+86400000).run();return json({code},201);}catch(e){if(String(e).includes('UNIQUE'))continue;throw e}}fail('Could not create a room. Try again.',503);}
 }
 if(parts[0]!=='room'||!parts[1])return json({error:'Not found.'},404);const code=parts[1],op=parts[2];
 if(method==='POST'&&op==='join'){
  const b=await body(request),raw=crypto.randomUUID()+crypto.randomUUID(),hash=await digest(raw);let existing=false;
  const row=await change(code,async(g,r)=>{const current=await identify(request,r);if(current){existing=true;return;}addTeam(g,b.name,hash);});
  return json({code},200,existing?{}:{'Set-Cookie':`${cookieName(code)}=${raw}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=86400`});
 }
 const row=await read(code);
 if(method==='GET'&&op==='lobby'){
  const g=JSON.parse(row.state),accepting=g.mode==='live'&&g.phase==='lobby'&&g.joinOpen&&!g.closed&&g.teams.length<10;
  return json({code,accepting,teamCount:g.teams.length,capacity:10,expiresAt:row.expires_at,message:g.closed?'The host has ended this room.':g.phase!=='lobby'?'This game has already started. New teams cannot join.':g.mode!=='live'?'This is a host practice room.':g.teams.length>=10?'This room is full. Ask the host for a new room.':'The lobby is open. Choose your name to join.'});
 }
 if(method==='GET'&&op==='qr'){if(row.owner!==await owner())fail('Not your room.',403);const svg=await QRCode.toString(url.origin+'/join?room='+code,{type:'svg',margin:4,width:300,color:{dark:'#000000',light:'#ffffff'}});return new Response(svg,{headers:{'Content-Type':'image/svg+xml','Cache-Control':'no-store'}});}
 if(method==='POST'&&op==='action'){const user=await owner(),b=await body(request);if(row.owner!==user)fail('Not your room.',403);const updated=await change(code,(g,r)=>{if(r.owner!==user)fail('Not your room.',403);if(b.round!==g.round||b.phase!==g.phase)fail('The room changed. Refresh before trying again.',409);hostAction(g,b);});return json(hostView(updated));}
 if(method==='POST'&&op==='submit'){const b=await body(request);const updated=await change(code,async(g,r)=>{const t=await identify(request,r);if(!t)fail('Join this room before submitting.',401);allocate(g,t.id,b.round,b.weights);});const t=await identify(request,updated);return json(teamView(updated,t.id));}
 if(method==='GET'&&!op){
  if(url.searchParams.get('role')==='host'){if(row.owner!==await owner())fail('Not your room.',403);if(url.searchParams.get('revision')===String(row.revision))return new Response(null,{status:304,headers:{'Cache-Control':'no-store'}});return json(hostView(row));}
  const t=await identify(request,row);if(!t)fail('Join this room to continue.',401);if(url.searchParams.get('revision')===String(row.revision))return new Response(null,{status:304,headers:{'Cache-Control':'no-store'}});return json(teamView(row,t.id));
 }
 return json({error:'Not found.'},404);
 }catch(e:any){console.error('Game request failed:',e?.message);return json({error:e.status?e.message:e.message?.includes('D1')?'Room storage is temporarily unavailable. Your draft is unchanged.':e.message||'Please try again.'},e.status||400);}}
