import assert from 'node:assert/strict'
import {spawn} from 'node:child_process'
import fs from 'node:fs'
import net from 'node:net'
import os from 'node:os'
import path from 'node:path'

interface Team {id:string;characters:Array<{id:string}>}
interface HttpResult<T=any>{status:number;body:T;headers:Headers}

const raw=JSON.parse(fs.readFileSync(path.resolve('config/teams.json'),'utf8')) as {teams:Team[]}
assert.equal(raw.teams.length,20)
if(!fs.existsSync(path.resolve('dist/index.html')))throw new Error('Run npm run build before black-box tests.')

const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'bti-blackbox-'))
const photoDir=path.join(tmp,'photos');fs.mkdirSync(photoDir,{recursive:true})
const seniorConfig={seniors:raw.teams.map((t,i)=>({
  teamId:t.id,characterId:t.characters[0]!.id,displayName:`Senior ${i+1}`,
  inviteToken:`blackbox-senior-${String(i+1).padStart(2,'0')}-0123456789abcdef`,
  clue:`Black-box clue ${i+1}`,photoFile:`${t.id}.jpg`,
}))}
const seniorPath=path.join(tmp,'seniors.json');fs.writeFileSync(seniorPath,JSON.stringify(seniorConfig))
for(const s of seniorConfig.seniors)fs.writeFileSync(path.join(photoDir,s.photoFile),Buffer.from([0xff,0xd8,0xff,0xd9]))

async function freePort(){return await new Promise<number>((resolve,reject)=>{const s=net.createServer();s.once('error',reject);s.listen(0,'127.0.0.1',()=>{const a=s.address();if(!a||typeof a==='string')return reject(new Error('No port'));const p=a.port;s.close((e)=>e?reject(e):resolve(p))})})}
const port=await freePort();const base=`http://127.0.0.1:${port}`;const adminPin='blackbox-987654321'
const child=spawn(path.resolve('node_modules/.bin/tsx'),['server/index.ts'],{
  cwd:process.cwd(),env:{...process.env,PORT:String(port),DB_PATH:path.join(tmp,'event.sqlite'),SENIOR_CONFIG_PATH:seniorPath,PRIVATE_CONTENT_DIR:photoDir,ADMIN_PIN:adminPin,PUBLIC_BASE_URL:base},stdio:['ignore','pipe','pipe'],
})
let serverLog='';child.stdout.on('data',(d)=>serverLog+=d);child.stderr.on('data',(d)=>serverLog+=d)

async function request<T=any>(url:string,init:RequestInit={}):Promise<HttpResult<T>>{
  const res=await fetch(base+url,init);const type=res.headers.get('content-type')||'';let body:any
  if(type.includes('application/json'))body=await res.json();else body=await res.arrayBuffer()
  return {status:res.status,body,headers:res.headers}
}
function post(body:unknown,headers:Record<string,string>={}){return {method:'POST',headers:{'content-type':'application/json',...headers},body:JSON.stringify(body)}}
function playerHeaders(token:string){return {'x-player-token':token}}
function auth(token:string){return {authorization:`Bearer ${token}`}}
function assertNoRoleLeak(value:unknown){const text=JSON.stringify(value).toLowerCase();for(const bad of ['issenior','isimposter','"role"'])assert.equal(text.includes(bad),false,`public payload leaked ${bad}`)}
let passes=0;function ok(name:string){passes++;console.log(`✓ ${name}`)}

try{
  for(let i=0;i<80;i++){try{const h=await request('/api/health');if(h.status===200)break}catch{}await new Promise(r=>setTimeout(r,100));if(i===79)throw new Error(`Server did not start:\n${serverLog}`)}
  assert.equal((await request('/api/health')).status,200);ok('production health endpoint responds')
  const spa=await request(`/s/${seniorConfig.seniors[0]!.inviteToken}`);assert.equal(spa.status,200);assert.ok(spa.headers.get('content-type')?.includes('text/html'));ok('secret senior route serves the same SPA')

  const badJoin=await request('/api/join',post({clientToken:'short',name:'A'}));assert.equal(badJoin.status,400);ok('invalid public join input is rejected')
  const wrongSenior=await request('/api/join',post({clientToken:'wrong-senior-token-abcdefgh',name:'Wrong Senior',inviteToken:'not-a-real-invite-token'}));assert.equal(wrongSenior.status,400);ok('invalid senior invite is rejected')

  const juniorStates:any[]=[]
  const batch=40
  for(let start=0;start<420;start+=batch){
    const results=await Promise.all(Array.from({length:Math.min(batch,420-start)},async(_,offset)=>{
      const i=start+offset;const token=`blackbox-junior-${String(i).padStart(4,'0')}-abcdefgh`
      const r=await request('/api/join',post({clientToken:token,name:`Junior ${i+1}`}));if(r.status!==200)throw new Error(`join ${i} failed HTTP ${r.status}: ${JSON.stringify(r.body)}`);assertNoRoleLeak(r.body);return {token,...r.body}
    }))
    juniorStates.push(...results)
  }
  const grouped=new Map<string,any[]>();for(const p of juniorStates){const list=grouped.get(p.team.id)||[];list.push(p);grouped.set(p.team.id,list)}
  assert.equal(grouped.size,20);assert.ok([...grouped.values()].every((list)=>list.length===21));ok('420 HTTP joins balance to exactly 21 juniors across all 20 teams')

  const seniorStates:any[]=[]
  for(let i=0;i<20;i++){
    const token=`blackbox-senior-browser-${String(i).padStart(2,'0')}-abcdefgh`
    const r=await request('/api/join',post({clientToken:token,name:`Senior ${i+1}`,inviteToken:seniorConfig.seniors[i]!.inviteToken}));assert.equal(r.status,200);assertNoRoleLeak(r.body);assert.equal(r.body.team.id,seniorConfig.seniors[i]!.teamId);seniorStates.push({token,...r.body})
  }
  ok('all 20 secret senior links join reserved teams without role leakage')
  const reused=await request('/api/join',post({clientToken:'second-device-senior-abcdefgh',name:'Replay',inviteToken:seniorConfig.seniors[0]!.inviteToken}));assert.equal(reused.status,400);ok('used senior invite cannot be replayed from another device')

  const publicState=await request('/api/public-state');assert.equal(publicState.status,200);assert.equal(publicState.body.stats.juniors,420);assert.equal('seniors' in publicState.body.stats,false);assertNoRoleLeak(publicState.body);ok('projector/public state hides senior counts and roles')
  const noPlayerSse=await request('/api/events');assert.equal(noPlayerSse.status,401);ok('participant SSE requires a valid participant session')
  const controller=new AbortController();const publicSse=await fetch(`${base}/api/events?scope=public`,{signal:controller.signal});assert.equal(publicSse.status,200);assert.ok(publicSse.headers.get('content-type')?.includes('text/event-stream'));controller.abort();ok('public SSE stream is available for projector realtime updates')

  const wrongAdmin=await request('/api/admin/login',post({pin:'wrong-pin'}));assert.equal(wrongAdmin.status,400);ok('wrong admin PIN is rejected')
  const login=await request('/api/admin/login',post({pin:adminPin}));assert.equal(login.status,200);const adminToken=login.body.token as string;assert.ok(adminToken);ok('admin authentication succeeds with configured PIN')
  const admin=await request('/api/admin/state',{headers:auth(adminToken)});assert.equal(admin.status,200);assert.equal(admin.body.stats.juniors,420);assert.equal(admin.body.stats.seniors,20);assert.equal(admin.body.stats.totalParticipants,440);assert.equal(admin.body.seniorReadiness.length,20);assert.ok(admin.body.seniorReadiness.every((x:any)=>x.configured&&x.joined&&x.photoPresent));ok('admin sees 420 juniors + 20 seniors and complete readiness')

  const firstTeam=raw.teams[0]!.id;const same=grouped.get(firstTeam)!;const a=same[0]!,b=same[1]!,c=same[2]!;const other=[...grouped.entries()].find(([id])=>id!==firstTeam)![1][0]!
  let r=await request('/api/pair-requests',post({targetCode:a.pairCode},playerHeaders(a.token)));assert.equal(r.status,400);ok('HTTP self-pairing is rejected')
  r=await request('/api/pair-requests',post({targetCode:other.pairCode},playerHeaders(a.token)));assert.equal(r.status,400);ok('HTTP cross-team pairing is rejected')
  const pair=await request('/api/pair-requests',post({targetCode:b.pairCode},playerHeaders(a.token)));assert.equal(pair.status,201);const requestId=pair.body.id as string
  const reciprocal=await request('/api/pair-requests',post({targetCode:a.pairCode},playerHeaders(b.token)));assert.equal(reciprocal.status,200);assert.equal(reciprocal.body.id,requestId);ok('reciprocal HTTP pair requests collapse to one request')
  const accepted=await request(`/api/pair-requests/${requestId}/respond`,post({accept:true},playerHeaders(b.token)));assert.equal(accepted.status,200);assert.equal(accepted.body.alliance.members.length,2);ok('mutual HTTP acceptance creates a two-person alliance')
  assert.equal((await request(`/api/pair-requests/${requestId}/respond`,post({accept:true},playerHeaders(b.token)))).status,400);ok('duplicate HTTP acceptance is rejected')
  assert.equal((await request('/api/pair-requests',post({targetCode:a.pairCode},playerHeaders(c.token)))).status,400);ok('third person cannot hijack an existing alliance while joining is open')

  assert.equal((await request('/api/me/clue-photo',{headers:playerHeaders(a.token)})).status,403);ok('private childhood photo is phase-gated before hunt-photo phase')
  const beforeClue=await request('/api/me',{headers:playerHeaders(a.token)});assert.equal(beforeClue.body.clue,null);ok('clue text is hidden before clue phase')

  const phase=async(phaseName:string,extra:any={})=>request('/api/admin/phase',post({phase:phaseName,...extra},auth(adminToken)))
  assert.equal((await phase('PAIRING')).status,200)
  assert.equal((await request('/api/join',post({clientToken:'late-blackbox-junior-abcdefgh',name:'Late Junior'}))).status,400);ok('late junior join is rejected after pairing starts')
  assert.equal((await phase('IMPOSTER_ALERT')).status,200)
  assert.equal((await phase('HUNT_CLUE_1',{huntMinutes:15})).status,200)
  const withClue=await request('/api/me',{headers:playerHeaders(a.token)});assert.equal(withClue.body.clue,'Black-box clue 1');ok('team clue appears only after clue phase starts')
  assert.equal((await phase('HUNT_PHOTO')).status,200)
  const photo=await request('/api/me/clue-photo',{headers:playerHeaders(a.token)});assert.equal(photo.status,200);assert.ok((photo.body as ArrayBuffer).byteLength>=4);ok('team childhood photo becomes available in photo phase')
  assert.equal((await phase('VOTING')).status,200)

  const choices=await request('/api/team-members',{headers:playerHeaders(a.token)});assert.equal(choices.status,200);assert.equal(choices.body.length,22);assertNoRoleLeak(choices.body);const target=choices.body.find((x:any)=>x.id!==a.id);assert.ok(target)
  assert.equal((await request('/api/vote',{method:'PUT',headers:{'content-type':'application/json',...playerHeaders(a.token)},body:JSON.stringify({targetParticipantId:a.id})})).status,400);ok('HTTP self-vote is rejected')
  const otherTarget=(await request('/api/team-members',{headers:playerHeaders(other.token)})).body.find((x:any)=>x.id!==other.id)
  assert.equal((await request('/api/vote',{method:'PUT',headers:{'content-type':'application/json',...playerHeaders(a.token)},body:JSON.stringify({targetParticipantId:otherTarget.id})})).status,400);ok('HTTP cross-team vote is rejected')
  assert.equal((await request('/api/vote',{method:'PUT',headers:{'content-type':'application/json',...playerHeaders(a.token)},body:JSON.stringify({targetParticipantId:target.id})})).status,200);ok('valid team vote is accepted')

  assert.equal((await phase('VOTES_LOCKED')).status,200);assert.equal((await request('/api/vote',{method:'PUT',headers:{'content-type':'application/json',...playerHeaders(a.token)},body:JSON.stringify({targetParticipantId:target.id})})).status,400);ok('vote changes are rejected after lock')
  assert.equal((await phase('TEAM_REVEALS')).status,200)
  let reveal=await request('/api/admin/reveal',post({teamId:firstTeam,step:'VOTE'},auth(adminToken)));assert.equal(reveal.status,200)
  let projection=await request('/api/public-state');assert.equal(projection.body.reveal.answer,null);assertNoRoleLeak(projection.body.reveal);ok('public VOTE reveal does not disclose senior answer')
  reveal=await request('/api/admin/reveal',post({teamId:firstTeam,step:'ANSWER'},auth(adminToken)));assert.equal(reveal.status,200)
  projection=await request('/api/public-state');assert.ok(projection.body.reveal.answer);ok('public answer is disclosed only at explicit ANSWER reveal step')
  assert.equal((await phase('FINISHED')).status,200)

  const reset=await request('/api/admin/reset',{method:'POST',headers:auth(adminToken)});assert.equal(reset.status,200)
  const afterReset=await request('/api/admin/state',{headers:auth(adminToken)});assert.equal(afterReset.body.stats.totalParticipants,0);assert.equal(afterReset.body.seniorReadiness.length,20);assert.ok(afterReset.body.seniorReadiness.every((x:any)=>x.configured&&!x.joined));ok('admin reset clears live state while preserving 20 senior configs')
  assert.equal((await request('/api/me',{headers:playerHeaders(a.token)})).status,404);ok('old participant sessions disappear after explicit reset')
  const seniorRejoin=await request('/api/join',post({clientToken:'rejoin-senior-browser-abcdefgh',name:'Senior 1',inviteToken:seniorConfig.seniors[0]!.inviteToken}));assert.equal(seniorRejoin.status,200);ok('senior invite is reusable after explicit event reset')

  console.log(`\n${passes} black-box checks passed.`)
} finally {
  child.kill('SIGTERM')
  await new Promise<void>((resolve)=>{const timer=setTimeout(resolve,1500);child.once('exit',()=>{clearTimeout(timer);resolve()})})
  fs.rmSync(tmp,{recursive:true,force:true})
}
