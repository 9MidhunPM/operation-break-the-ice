import { db } from './db'
import { character } from './catalog'
import { getEventState } from './event-state'
import type { ParticipantRow } from './participants'
import type { TeamMemberChoice } from '../src/types/game'

export function teamMembersForVoting(participant: ParticipantRow): TeamMemberChoice[] {
  if (getEventState().phase !== 'VOTING') throw new Error('Voting is not open.')
  const rows = db.prepare('SELECT id,name,character_id FROM participants WHERE team_id=? ORDER BY name').all(participant.team_id) as Array<{id:string;name:string;character_id:string}>
  return rows.map((r) => ({ id:r.id, name:r.name, characterId:r.character_id, characterName:character(participant.team_id,r.character_id).name }))
}

export function castParticipantVote(voter: ParticipantRow, targetId: string) {
  if (getEventState().phase !== 'VOTING') throw new Error('Voting is not open.')
  if (targetId === voter.id) throw new Error('Vote for another person in your team.')
  const target = db.prepare('SELECT id,team_id FROM participants WHERE id=?').get(targetId) as {id:string;team_id:string}|undefined
  if (!target || target.team_id !== voter.team_id) throw new Error('You can vote only for someone in your team.')
  const now = new Date().toISOString()
  db.prepare(`INSERT INTO votes (voter_id,target_id,created_at,updated_at) VALUES (?,?,?,?)
    ON CONFLICT(voter_id) DO UPDATE SET target_id=excluded.target_id,updated_at=excluded.updated_at`)
    .run(voter.id,targetId,now,now)
}
