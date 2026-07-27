import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'break-the-ice-'))
process.env.DB_PATH=path.join(tmp,'event.sqlite')
process.env.SENIOR_CONFIG_PATH=path.join(tmp,'seniors.json')
process.env.PRIVATE_CONTENT_DIR=path.join(tmp,'photos')
fs.mkdirSync(process.env.PRIVATE_CONTENT_DIR,{recursive:true})

const raw=JSON.parse(fs.readFileSync(path.resolve('config/teams.json'),'utf8')) as {teams:Array<{id:string;characters:Array<{id:string}>}>}
const seniorConfig={seniors:raw.teams.map((t,i)=>({teamId:t.id,characterId:t.characters[0]!.id,displayName:`Senior ${i+1}`,inviteToken:`senior-invite-${String(i+1).padStart(2,'0')}-0123456789abcdef`,clue:`Clue ${i+1}`,photoFile:`${t.id}.jpg`}))}
fs.writeFileSync(process.env.SENIOR_CONFIG_PATH,JSON.stringify(seniorConfig))

const {assertSeniorConfigurationReady,syncSeniorConfig}=await import('../server/seniors')
const {db,resetLiveEvent}=await import('../server/db')
const {joinParticipant,participantRowByToken}=await import('../server/participants')
const {cancelPairRequest,createPairRequest,respondPairRequest}=await import('../server/pairing')
const {setPhase,getEventState}=await import('../server/event-state')
const {projectorStats,revealState,stats}=await import('../server/stats')
const {castParticipantVote,teamMembersForVoting}=await import('../server/voting')

syncSeniorConfig()
assertSeniorConfigurationReady()

let passes=0
function test(name:string,fn:()=>void){try{fn();passes++;console.log(`✓ ${name}`)}catch(e){console.error(`✗ ${name}`);throw e}}
function mustThrow(fn:()=>unknown){let threw=false;try{fn()}catch{threw=true}assert.equal(threw,true)}

test('catalog has 21 teams × 28 characters',()=>{assert.equal(raw.teams.length,21);assert.ok(raw.teams.every(t=>t.characters.length===28))})

for(let i=0;i<420;i++) joinParticipant(`junior-token-${String(i).padStart(4,'0')}-abcdefgh`, `Junior ${i+1}`)

test('420 juniors are exactly balanced at 20/team',()=>{const s=stats();assert.equal(s.juniors,420);assert.ok(s.perTeam.every(t=>t.juniors===20))})
test('reserved senior characters were never allocated to juniors',()=>{for(const t of raw.teams){const used=db.prepare('SELECT 1 FROM participants WHERE team_id=? AND character_id=? AND is_senior=0').get(t.id,t.characters[0]!.id);assert.equal(used,undefined)}})
test('a senior invite cannot silently reuse an existing junior browser session',()=>mustThrow(()=>joinParticipant('junior-token-0000-abcdefgh','Junior 1',seniorConfig.seniors[0]!.inviteToken)))

for(let i=0;i<21;i++) joinParticipant(`senior-browser-${String(i).padStart(2,'0')}-abcdefgh`, `Senior ${i+1}`,seniorConfig.seniors[i]!.inviteToken)

test('one senior joins every team',()=>{const s=stats();assert.equal(s.seniors,21);assert.ok(s.perTeam.every(t=>t.seniors===1&&t.total===21))})
test('projector stats do not expose the senior count or total headcount',()=>{const s=projectorStats();assert.deepEqual(Object.keys(s).sort(),['alliances','juniors']);assert.equal(JSON.stringify(s).includes('senior'),false)})
test('join is idempotent for the same browser token',()=>{const a=joinParticipant('junior-token-0000-abcdefgh','Changed Name');const b=joinParticipant('junior-token-0000-abcdefgh','Other Name');assert.equal(a.id,b.id);assert.equal(a.name,b.name)})

const teamId=raw.teams[0]!.id
const rows=db.prepare('SELECT * FROM participants WHERE team_id=? ORDER BY joined_at').all(teamId) as any[]
const first=participantRowByToken(rows[0]!.client_token)!
const second=participantRowByToken(rows[1]!.client_token)!
const req=createPairRequest(first,second.pair_code)
const alliance=respondPairRequest(second,req.id,true)!
test('mutual accept creates one two-person alliance',()=>{assert.equal(alliance.members.length,2);assert.equal(new Set(alliance.members.map(m=>m.id)).size,2)})
test('duplicate accept cannot create another alliance',()=>mustThrow(()=>respondPairRequest(second,req.id,true)))

const otherTeam=db.prepare('SELECT * FROM participants WHERE team_id<>? LIMIT 1').get(teamId) as any
test('cross-team pair request is rejected',()=>mustThrow(()=>createPairRequest(rows[2]!,otherTeam.pair_code)))
test('outgoing pair request can be cancelled',()=>{const r=createPairRequest(rows[2]!,rows[3]!.pair_code);cancelPairRequest(rows[2]!,r.id);const status=(db.prepare('SELECT status FROM pair_requests WHERE id=?').get(r.id) as {status:string}).status;assert.equal(status,'DECLINED')})

// Pair the remaining members of the first 21-person team, leaving exactly one person unpaired.
for(let i=2;i<20;i+=2){const a=rows[i]!,b=rows[i+1]!;const r=createPairRequest(a,b.pair_code);respondPairRequest(b,r.id,true)}
const leftover=rows[20]!
const pairedTarget=rows[0]!
test('a trio cannot form while junior joining is still open',()=>mustThrow(()=>createPairRequest(leftover,pairedTarget.pair_code)))
setPhase('PAIRING')
test('new juniors are rejected once the organiser closes joining',()=>mustThrow(()=>joinParticipant('late-junior-abcdefghijkl','Late Junior')))
const trioReq=createPairRequest(leftover,pairedTarget.pair_code)
const trio=respondPairRequest(pairedTarget,trioReq.id,true)!
test('odd team can finish with one explicit three-person alliance after joining closes',()=>assert.equal(trio.members.length,3))

// A trio must not be used to finish a team until that team's senior is actually present.
const secondTeamId=raw.teams[1]!.id
const secondRows=db.prepare('SELECT * FROM participants WHERE team_id=? ORDER BY joined_at').all(secondTeamId) as any[]
const secondSenior=secondRows.find((r)=>r.is_senior===1)!
const secondJuniors=secondRows.filter((r)=>r.is_senior===0)
db.prepare('UPDATE senior_invites SET participant_id=NULL WHERE team_id=?').run(secondTeamId)
db.prepare('DELETE FROM participants WHERE id=?').run(secondSenior.id)
db.prepare('DELETE FROM participants WHERE id=?').run(secondJuniors.at(-1)!.id)
const secondRemaining=db.prepare('SELECT * FROM participants WHERE team_id=? ORDER BY joined_at').all(secondTeamId) as any[]
for(let i=0;i<18;i+=2){const a=secondRemaining[i]!,b=secondRemaining[i+1]!;const r=createPairRequest(a,b.pair_code);respondPairRequest(b,r.id,true)}
const secondLeftover=secondRemaining[18]!
test('a lone junior cannot be folded into a trio before that team senior has joined',()=>mustThrow(()=>createPairRequest(secondLeftover,secondRemaining[0]!.pair_code)))

test('no participant belongs to more than one alliance',()=>{const dupes=db.prepare('SELECT participant_id,COUNT(*) c FROM alliance_members GROUP BY participant_id HAVING c>1').all();assert.equal(dupes.length,0)})

setPhase('IMPOSTER_ALERT')
setPhase('HUNT_CLUE_1',15)
const originalDeadline=getEventState().huntEndsAt
setPhase('HUNT_CLUE_1',60)
test('repeating the same phase is idempotent and does not restart the hunt timer',()=>assert.equal(getEventState().huntEndsAt,originalDeadline))
setPhase('HUNT_PHOTO')
setPhase('VOTING')
test('phase sequence reaches voting with hunt deadline preserved',()=>{const e=getEventState();assert.equal(e.phase,'VOTING');assert.ok((e.huntEndsAt??0)>Date.now())})

const voter=rows[2]!
const choices=teamMembersForVoting(voter)
const target=choices.find(x=>x.id!==voter.id)!
castParticipantVote(voter,target.id)
test('vote is stored once per voter',()=>{const count=(db.prepare('SELECT COUNT(*) c FROM votes WHERE voter_id=?').get(voter.id) as {c:number}).c;assert.equal(count,1)})
const alternate=choices.find(x=>x.id!==voter.id&&x.id!==target.id)!
castParticipantVote(voter,alternate.id)
test('vote can be changed while voting is open',()=>{const row=db.prepare('SELECT target_id FROM votes WHERE voter_id=?').get(voter.id) as {target_id:string};assert.equal(row.target_id,alternate.id)})
const secondVoter=rows[4]!
const tiedTarget=choices.find(x=>x.id!==secondVoter.id&&x.id!==alternate.id)!
castParticipantVote(secondVoter,tiedTarget.id)
test('tied top votes remain a tie instead of silently selecting one person',()=>{const reveal=revealState(teamId,'VOTE');assert.equal(reveal.topVotes.length,2);assert.equal(reveal.topVotes[0]!.votes,reveal.topVotes[1]!.votes)})
test('cross-team vote is rejected',()=>mustThrow(()=>castParticipantVote(voter,otherTeam.id)))
setPhase('VOTES_LOCKED')
test('vote write is rejected after voting locks',()=>mustThrow(()=>castParticipantVote(voter,target.id)))
test('event reset clears live state but preserves senior invite configuration',()=>{resetLiveEvent();const p=(db.prepare('SELECT COUNT(*) c FROM participants').get() as {c:number}).c;const invites=(db.prepare('SELECT COUNT(*) c FROM senior_invites').get() as {c:number}).c;const linked=(db.prepare('SELECT COUNT(*) c FROM senior_invites WHERE participant_id IS NOT NULL').get() as {c:number}).c;assert.equal(p,0);assert.equal(invites,21);assert.equal(linked,0);assert.equal(getEventState().phase,'JOINING')})

console.log(`\n${passes} checks passed.`)
db.close()
fs.rmSync(tmp,{recursive:true,force:true})
