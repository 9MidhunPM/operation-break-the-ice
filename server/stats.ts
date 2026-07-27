import { db } from './db'
import { TEAMS, publicTeam, character } from './catalog'
import type { AllianceSummary, PublicStats, RevealPublicState } from '../src/types/game'

export function stats(): PublicStats {
  const total = db.prepare('SELECT COUNT(*) c FROM participants').get() as {c:number}
  const juniors = db.prepare('SELECT COUNT(*) c FROM participants WHERE is_senior=0').get() as {c:number}
  const seniors = db.prepare('SELECT COUNT(*) c FROM participants WHERE is_senior=1').get() as {c:number}
  const alliances = db.prepare('SELECT COUNT(*) c FROM alliances').get() as {c:number}
  const pairedPeople = db.prepare('SELECT COUNT(*) c FROM alliance_members').get() as {c:number}
  const perTeam = TEAMS.map((t) => {
    const j=(db.prepare('SELECT COUNT(*) c FROM participants WHERE team_id=? AND is_senior=0').get(t.id) as {c:number}).c
    const s=(db.prepare('SELECT COUNT(*) c FROM participants WHERE team_id=? AND is_senior=1').get(t.id) as {c:number}).c
    const a=(db.prepare('SELECT COUNT(*) c FROM alliances WHERE team_id=?').get(t.id) as {c:number}).c
    const p=(db.prepare(`SELECT COUNT(*) c FROM alliance_members am JOIN participants p ON p.id=am.participant_id WHERE p.team_id=?`).get(t.id) as {c:number}).c
    return { teamId:t.id,teamName:t.name,juniors:j,seniors:s,total:j+s,alliances:a,pairedPeople:p,unpairedPeople:j+s-p }
  })
  return { juniors:juniors.c,seniors:seniors.c,totalParticipants:total.c,alliances:alliances.c,pairedPeople:pairedPeople.c,unpairedPeople:total.c-pairedPeople.c,perTeam }
}

export function recentAlliances(limit=8): AllianceSummary[] {
  const rows=db.prepare('SELECT * FROM alliances ORDER BY created_at DESC LIMIT ?').all(limit) as any[]
  return rows.map((a)=>{
    const members=db.prepare(`SELECT p.id,p.name,p.team_id,p.character_id FROM participants p JOIN alliance_members am ON am.participant_id=p.id WHERE am.alliance_id=? ORDER BY p.joined_at`).all(a.id) as any[]
    return {id:a.id,teamId:a.team_id,teamName:publicTeam(a.team_id).name,createdAt:a.created_at,members:members.map((m)=>({id:m.id,name:m.name,characterId:m.character_id,characterName:character(m.team_id,m.character_id).name}))}
  })
}

export function revealState(teamId: string, step: 'VOTE'|'ANSWER'): RevealPublicState {
  const team=publicTeam(teamId)
  const top=db.prepare(`SELECT p.id,p.name,p.character_id,COUNT(v.voter_id) votes FROM participants p LEFT JOIN votes v ON v.target_id=p.id WHERE p.team_id=? GROUP BY p.id ORDER BY votes DESC,p.joined_at ASC LIMIT 1`).get(teamId) as any
  const senior=db.prepare(`SELECT p.id,p.name,p.character_id FROM participants p WHERE p.team_id=? AND p.is_senior=1`).get(teamId) as any
  const topVote=top&&top.votes>0?{id:top.id,name:top.name,characterName:character(teamId,top.character_id).name,votes:top.votes}:null
  const answer=step==='ANSWER'&&senior?{id:senior.id,name:senior.name,characterName:character(teamId,senior.character_id).name,correct:!!top&&top.id===senior.id}:null
  return {teamId,teamName:team.name,revealStep:step,topVote,answer}
}
