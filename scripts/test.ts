import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'break-the-ice-'))
process.env.DB_PATH=path.join(tmp,'event.sqlite')
process.env.SENIOR_CONFIG_PATH=path.join(tmp,'seniors.json')
process.env.PRIVATE_CONTENT_DIR=path.join(tmp,'photos')
fs.mkdirSync(process.env.PRIVATE_CONTENT_DIR,{recursive:true})

interface RawTeam {id:string;characters:Array<{id:string}>}
const raw=JSON.parse(fs.readFileSync(path.resolve('config/teams.json'),'utf8')) as {teams:RawTeam[]}
const seniorConfig={seniors:raw.teams.map((t,i)=>({
  teamId:t.id, characterId:t.characters[0]!.id, displayName:`Senior ${i+1}`,
  inviteToken:`senior-invite-${String(i+1).padStart(2,'0')}-0123456789abcdef`,
  clue:`Clue ${i+1}`, photoFile:`${t.id}.jpg`,
}))}
fs.writeFileSync(process.env.SENIOR_CONFIG_PATH,JSON.stringify(seniorConfig))
for(const s of seniorConfig.seniors)fs.writeFileSync(path.join(process.env.PRIVATE_CONTENT_DIR,s.photoFile),Buffer.from([0xff,0xd8,0xff,0xd9]))

const {assertSeniorConfigurationReady,syncSeniorConfig}=await import('../server/seniors')
const {db,resetLiveEvent}=await import('../server/db')
const {joinParticipant,participantRowByToken,participantStateByToken}=await import('../server/participants')
const {cancelPairRequest,createPairRequest,respondPairRequest}=await import('../server/pairing')
const {setPhase,getEventState}=await import('../server/event-state')
const {projectorStats,revealState,stats}=await import('../server/stats')
const {castParticipantVote,teamMembersForVoting}=await import('../server/voting')

let passes=0
function test(name:string,fn:()=>void){try{fn();passes++;console.log(`✓ ${name}`)}catch(e){console.error(`✗ ${name}`);throw e}}
function mustThrow(fn:()=>unknown,pattern?:RegExp){let error:unknown;try{fn()}catch(e){error=e}assert.ok(error instanceof Error,'Expected function to throw');if(pattern)assert.match(error.message,pattern)}
function joinJuniors(count:number,prefix='junior'){for(let i=0;i<count;i++)joinParticipant(`${prefix}-token-${String(i).padStart(4,'0')}-abcdefgh`,`${prefix} ${i+1}`)}
function juniorCounts(){return stats().perTeam.map((t)=>t.juniors)}
function assertBalanced(count:number){const counts=juniorCounts();assert.equal(counts.reduce((a,b)=>a+b,0),count);assert.ok(Math.max(...counts)-Math.min(...counts)<=1,`unbalanced: ${counts.join(',')}`)}

syncSeniorConfig()
assertSeniorConfigurationReady()

test('catalog has exactly 20 teams with at least 28 characters each',()=>{
  assert.equal(raw.teams.length,20)
  assert.ok(raw.teams.every((t)=>t.characters.length>=28))
  assert.equal(new Set(raw.teams.map((t)=>t.id)).size,20)
})

test('sync removes an unused invite belonging to a retired 21st team',()=>{
  db.prepare(`INSERT INTO senior_invites (id,token_hash,team_id,character_id,display_name,clue,photo_file,participant_id,created_at) VALUES (?,?,?,?,?,?,?,?,?)`)
    .run('ghost-invite','f'.repeat(64),'retired-team','ghost','Ghost','Ghost clue','ghost.jpg',null,new Date().toISOString())
  assert.equal((db.prepare('SELECT COUNT(*) c FROM senior_invites').get() as {c:number}).c,21)
  syncSeniorConfig()
  assert.equal((db.prepare('SELECT COUNT(*) c FROM senior_invites').get() as {c:number}).c,20)
  assert.equal(db.prepare('SELECT 1 FROM senior_invites WHERE team_id=?').get('retired-team'),undefined)
})

test('sync refuses to orphan participants from a retired team',()=>{
  db.prepare(`INSERT INTO participants (id,client_token,name,team_id,character_id,pair_code,is_senior,joined_at) VALUES (?,?,?,?,?,?,0,?)`)
    .run('ghost-player','ghost-player-token-abcdefgh','Ghost Player','retired-team','ghost','GH0ST',new Date().toISOString())
  mustThrow(()=>syncSeniorConfig(),/Cannot retire team\(s\) with joined participants/)
  db.prepare('DELETE FROM participants WHERE id=?').run('ghost-player')
  syncSeniorConfig()
  assertSeniorConfigurationReady()
})

for(const count of [1,19,20,21,399,400,419,420,421,539,540]){
  test(`least-filled allocation stays balanced for ${count} juniors`,()=>{
    resetLiveEvent();joinJuniors(count,`balance-${count}`);assertBalanced(count)
  })
}

test('junior capacity is 540 with one reserved senior character per team',()=>{
  assert.ok(juniorCounts().every((n)=>n===27))
  mustThrow(()=>joinParticipant('over-capacity-token-abcdefgh','Overflow Junior'),/No character slots remain/)
})

test('reserved senior characters are never allocated to juniors',()=>{
  for(const t of raw.teams){
    const reserved=t.characters[0]!.id
    assert.equal(db.prepare('SELECT 1 FROM participants WHERE team_id=? AND character_id=? AND is_senior=0').get(t.id,reserved),undefined)
  }
})

resetLiveEvent()
joinJuniors(420)

test('420 juniors produce exactly 21 juniors per team',()=>{
  const s=stats();assert.equal(s.juniors,420);assert.ok(s.perTeam.every((t)=>t.juniors===21))
})
test('a senior invite cannot silently reuse a junior browser session',()=>{
  mustThrow(()=>joinParticipant('junior-token-0000-abcdefgh','Junior 1',seniorConfig.seniors[0]!.inviteToken),/does not belong/)
})

for(let i=0;i<raw.teams.length;i++)joinParticipant(`senior-browser-${String(i).padStart(2,'0')}-abcdefgh`,`Senior ${i+1}`,seniorConfig.seniors[i]!.inviteToken)

test('one senior joins every team and expected turnout is 22 people per team',()=>{
  const s=stats();assert.equal(s.seniors,20);assert.equal(s.totalParticipants,440);assert.ok(s.perTeam.every((t)=>t.seniors===1&&t.total===22))
})
test('projector stats expose juniors and alliances only',()=>{
  const s=projectorStats();assert.deepEqual(Object.keys(s).sort(),['alliances','juniors']);assert.equal(JSON.stringify(s).includes('senior'),false)
})
test('join is idempotent for the same browser token',()=>{
  const a=joinParticipant('junior-token-0000-abcdefgh','Changed Name');const b=joinParticipant('junior-token-0000-abcdefgh','Other Name');assert.equal(a.id,b.id);assert.equal(a.name,b.name)
})

const teamId=raw.teams[0]!.id
const rows=db.prepare('SELECT * FROM participants WHERE team_id=? ORDER BY joined_at').all(teamId) as any[]
const first=participantRowByToken(rows[0]!.client_token)!
const second=participantRowByToken(rows[1]!.client_token)!
const req=createPairRequest(first,second.pair_code)
const alliance=respondPairRequest(second,req.id,true)!
test('mutual accept creates exactly one two-person alliance',()=>{assert.equal(alliance.members.length,2);assert.equal(new Set(alliance.members.map((m)=>m.id)).size,2)})
test('duplicate accept cannot create another alliance',()=>mustThrow(()=>respondPairRequest(second,req.id,true),/no longer available/))

const otherTeam=db.prepare('SELECT * FROM participants WHERE team_id<>? LIMIT 1').get(teamId) as any
test('cross-team pair request is rejected',()=>mustThrow(()=>createPairRequest(rows[2]!,otherTeam.pair_code),/not in your team/))
test('self-pairing is rejected',()=>mustThrow(()=>createPairRequest(rows[2]!,rows[2]!.pair_code),/own code/))
test('outgoing pair request can be cancelled',()=>{const r=createPairRequest(rows[2]!,rows[3]!.pair_code);cancelPairRequest(rows[2]!,r.id);const status=(db.prepare('SELECT status FROM pair_requests WHERE id=?').get(r.id) as {status:string}).status;assert.equal(status,'DECLINED')})

const reciprocalTeamId=raw.teams[2]!.id
const reciprocalRows=db.prepare('SELECT * FROM participants WHERE team_id=? ORDER BY joined_at').all(reciprocalTeamId) as any[]
const reciprocalFirst=createPairRequest(reciprocalRows[0]!,reciprocalRows[1]!.pair_code)
const reciprocalSecond=createPairRequest(reciprocalRows[1]!,reciprocalRows[0]!.pair_code)
test('simultaneous reciprocal code entry collapses to one request',()=>{
  assert.equal(reciprocalFirst.created,true);assert.equal(reciprocalSecond.created,false);assert.equal(reciprocalSecond.id,reciprocalFirst.id)
  const pending=(db.prepare(`SELECT COUNT(*) c FROM pair_requests WHERE status='PENDING' AND (from_participant_id IN (?,?) OR to_participant_id IN (?,?))`).get(reciprocalRows[0]!.id,reciprocalRows[1]!.id,reciprocalRows[0]!.id,reciprocalRows[1]!.id) as {c:number}).c
  assert.equal(pending,1)
})
test('a third teammate cannot interrupt an active request',()=>mustThrow(()=>createPairRequest(reciprocalRows[2]!,reciprocalRows[0]!.pair_code),/pending alliance request/))
respondPairRequest(reciprocalRows[1]!,reciprocalFirst.id,false)
test('declining immediately frees both people',()=>{const next=createPairRequest(reciprocalRows[0]!,reciprocalRows[1]!.pair_code);assert.equal(next.created,true);cancelPairRequest(reciprocalRows[0]!,next.id)})
const expiring=createPairRequest(reciprocalRows[0]!,reciprocalRows[1]!.pair_code)
db.prepare('UPDATE pair_requests SET expires_at=? WHERE id=?').run(new Date(Date.now()-5_000).toISOString(),expiring.id)
test('expired requests persist EXPIRED and can be replaced',()=>{
  mustThrow(()=>respondPairRequest(reciprocalRows[1]!,expiring.id,true),/expired/)
  assert.equal((db.prepare('SELECT status FROM pair_requests WHERE id=?').get(expiring.id) as {status:string}).status,'EXPIRED')
  const fresh=createPairRequest(reciprocalRows[0]!,reciprocalRows[1]!.pair_code);assert.equal(fresh.created,true);cancelPairRequest(reciprocalRows[0]!,fresh.id)
})

// Force one team from 22 total people to 21, with its senior still present.
const removedJunior=rows[20]!
assert.equal(removedJunior.is_senior,0)
db.prepare('DELETE FROM participants WHERE id=?').run(removedJunior.id)
for(let i=2;i<20;i+=2){const a=rows[i]!,b=rows[i+1]!;const r=createPairRequest(a,b.pair_code);respondPairRequest(b,r.id,true)}
const leftoverSenior=rows[21]!
assert.equal(leftoverSenior.is_senior,1)
test('trio cannot form while junior joining is still open',()=>mustThrow(()=>createPairRequest(leftoverSenior,rows[0]!.pair_code),/already has an alliance/))
setPhase('PAIRING')
test('new juniors are rejected once joining closes',()=>mustThrow(()=>joinParticipant('late-junior-abcdefghijkl','Late Junior'),/joining is closed/))
const trioReq=createPairRequest(leftoverSenior,rows[0]!.pair_code)
const trio=respondPairRequest(rows[0]!,trioReq.id,true)!
test('odd team can finish with one explicit trio after joining closes',()=>assert.equal(trio.members.length,3))

const secondTeamId=raw.teams[1]!.id
const secondRows=db.prepare('SELECT * FROM participants WHERE team_id=? ORDER BY joined_at').all(secondTeamId) as any[]
const secondSenior=secondRows.find((r)=>r.is_senior===1)!
db.prepare('UPDATE senior_invites SET participant_id=NULL WHERE team_id=?').run(secondTeamId)
db.prepare('DELETE FROM participants WHERE id=?').run(secondSenior.id)
const secondRemaining=db.prepare('SELECT * FROM participants WHERE team_id=? ORDER BY joined_at').all(secondTeamId) as any[]
for(let i=0;i<20;i+=2){const a=secondRemaining[i]!,b=secondRemaining[i+1]!;const r=createPairRequest(a,b.pair_code);respondPairRequest(b,r.id,true)}
const secondLeftover=secondRemaining[20]!
test('lone junior cannot be folded into trio before that team senior joins',()=>mustThrow(()=>createPairRequest(secondLeftover,secondRemaining[0]!.pair_code),/already has an alliance/))
test('no participant belongs to more than one alliance',()=>assert.equal(db.prepare('SELECT participant_id,COUNT(*) c FROM alliance_members GROUP BY participant_id HAVING c>1').all().length,0))

setPhase('IMPOSTER_ALERT')
setPhase('HUNT_CLUE_1',15)
const originalDeadline=getEventState().huntEndsAt
setPhase('HUNT_CLUE_1',60)
test('repeating same phase is idempotent and cannot restart hunt timer',()=>assert.equal(getEventState().huntEndsAt,originalDeadline))
test('phase skipping is rejected',()=>mustThrow(()=>setPhase('VOTING'),/Invalid transition/))
setPhase('HUNT_PHOTO');setPhase('VOTING')
test('phase sequence reaches voting with hunt deadline preserved',()=>{const e=getEventState();assert.equal(e.phase,'VOTING');assert.ok((e.huntEndsAt??0)>Date.now())})

const voter=rows[2]!
const choices=teamMembersForVoting(voter)
const target=choices.find((x)=>x.id!==voter.id)!
castParticipantVote(voter,target.id)
test('vote is stored once per voter',()=>assert.equal((db.prepare('SELECT COUNT(*) c FROM votes WHERE voter_id=?').get(voter.id) as {c:number}).c,1))
const alternate=choices.find((x)=>x.id!==voter.id&&x.id!==target.id)!
castParticipantVote(voter,alternate.id)
test('vote can be changed while voting is open',()=>assert.equal((db.prepare('SELECT target_id FROM votes WHERE voter_id=?').get(voter.id) as {target_id:string}).target_id,alternate.id))
test('self-vote is rejected',()=>mustThrow(()=>castParticipantVote(voter,voter.id)))
test('cross-team vote is rejected',()=>mustThrow(()=>castParticipantVote(voter,otherTeam.id)))
const secondVoter=rows[4]!
const tiedTarget=choices.find((x)=>x.id!==secondVoter.id&&x.id!==alternate.id)!
castParticipantVote(secondVoter,tiedTarget.id)
test('tied top votes remain a tie',()=>{const reveal=revealState(teamId,'VOTE');assert.equal(reveal.topVotes.length,2);assert.equal(reveal.answer,null)})
setPhase('VOTES_LOCKED')
test('vote writes are rejected after locking',()=>mustThrow(()=>castParticipantVote(voter,target.id)))
setPhase('TEAM_REVEALS')
test('vote reveal does not expose the senior answer',()=>assert.equal(revealState(teamId,'VOTE').answer,null))
test('answer reveal identifies the senior only at ANSWER step',()=>assert.ok(revealState(teamId,'ANSWER').answer))
setPhase('FINISHED')
test('finished event preserves participant identity until reset',()=>{const state=participantStateByToken(first.client_token);assert.ok(state);assert.equal(state.team.id,first.team_id);assert.equal(state.character.id,first.character_id);assert.equal(state.event.phase,'FINISHED')})
test('event reset clears live state but preserves exactly 20 invite configs',()=>{
  resetLiveEvent()
  assert.equal((db.prepare('SELECT COUNT(*) c FROM participants').get() as {c:number}).c,0)
  assert.equal((db.prepare('SELECT COUNT(*) c FROM senior_invites').get() as {c:number}).c,20)
  assert.equal((db.prepare('SELECT COUNT(*) c FROM senior_invites WHERE participant_id IS NOT NULL').get() as {c:number}).c,0)
  assert.equal(getEventState().phase,'JOINING')
})

console.log(`\n${passes} checks passed.`)
db.close();fs.rmSync(tmp,{recursive:true,force:true})
