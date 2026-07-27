import { db } from './db'
import { TEAMS, character, publicTeam } from './catalog'
import { id, pairCode, sha256 } from './security'
import { getEventState } from './event-state'
import type { AllianceMember, AllianceSummary, PairRequestSummary, ParticipantState } from '../src/types/game'

interface ParticipantRow {
  id: string; client_token: string; name: string; team_id: string; character_id: string; pair_code: string; is_senior: number; joined_at: string
}

const getByToken = db.prepare('SELECT * FROM participants WHERE client_token=?')
const getById = db.prepare('SELECT * FROM participants WHERE id=?')

function cleanName(value: unknown): string {
  const name = typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : ''
  if (name.length < 2 || name.length > 40) throw new Error('Name must be 2–40 characters.')
  return name
}

function generateUniqueCode(): string {
  for (let i=0; i<30; i++) {
    const code = pairCode()
    if (!db.prepare('SELECT 1 FROM participants WHERE pair_code=?').get(code)) return code
  }
  throw new Error('Could not allocate pairing code')
}

function reservedCharacters(teamId: string): Set<string> {
  const rows = db.prepare('SELECT character_id FROM senior_invites WHERE team_id=?').all(teamId) as Array<{character_id:string}>
  return new Set(rows.map((r) => r.character_id))
}

function usedCharacters(teamId: string): Set<string> {
  const rows = db.prepare('SELECT character_id FROM participants WHERE team_id=?').all(teamId) as Array<{character_id:string}>
  return new Set(rows.map((r) => r.character_id))
}

function joinJunior(clientToken: string, name: string): ParticipantRow {
  const counts = new Map<string, number>()
  const rows = db.prepare('SELECT team_id, COUNT(*) c FROM participants WHERE is_senior=0 GROUP BY team_id').all() as Array<{team_id:string;c:number}>
  for (const t of TEAMS) counts.set(t.id, 0)
  for (const r of rows) counts.set(r.team_id, r.c)

  const candidates = TEAMS.map((team) => {
    const blocked = new Set([...reservedCharacters(team.id), ...usedCharacters(team.id)])
    const available = team.characters.filter((c) => !blocked.has(c.id))
    return { team, count: counts.get(team.id) ?? 0, available }
  }).filter((x) => x.available.length > 0)

  if (!candidates.length) throw new Error('No character slots remain.')
  const min = Math.min(...candidates.map((x) => x.count))
  const balanced = candidates.filter((x) => x.count === min)
  const selected = balanced[Math.floor(Math.random() * balanced.length)]!
  const char = selected.available[Math.floor(Math.random() * selected.available.length)]!
  const row: ParticipantRow = {
    id: id('p'), client_token: clientToken, name, team_id: selected.team.id,
    character_id: char.id, pair_code: generateUniqueCode(), is_senior: 0, joined_at: new Date().toISOString(),
  }
  db.prepare(`INSERT INTO participants (id,client_token,name,team_id,character_id,pair_code,is_senior,joined_at) VALUES (@id,@client_token,@name,@team_id,@character_id,@pair_code,@is_senior,@joined_at)`).run(row)
  return row
}

function joinSenior(clientToken: string, name: string, inviteToken: string): ParticipantRow {
  const invite = db.prepare('SELECT * FROM senior_invites WHERE token_hash=?').get(sha256(inviteToken)) as any
  if (!invite) throw new Error('Invalid senior invite.')
  if (invite.participant_id) {
    const existing = getById.get(invite.participant_id) as ParticipantRow | undefined
    if (existing?.client_token === clientToken) return existing
    throw new Error('This senior invite has already been used.')
  }
  if (db.prepare('SELECT 1 FROM participants WHERE team_id=? AND character_id=?').get(invite.team_id, invite.character_id)) {
    throw new Error('The reserved senior character is already occupied.')
  }
  const row: ParticipantRow = {
    id: id('p'), client_token: clientToken, name, team_id: invite.team_id,
    character_id: invite.character_id, pair_code: generateUniqueCode(), is_senior: 1, joined_at: new Date().toISOString(),
  }
  db.prepare(`INSERT INTO participants (id,client_token,name,team_id,character_id,pair_code,is_senior,joined_at) VALUES (@id,@client_token,@name,@team_id,@character_id,@pair_code,@is_senior,@joined_at)`).run(row)
  db.prepare('UPDATE senior_invites SET participant_id=? WHERE id=?').run(row.id, invite.id)
  return row
}

export function joinParticipant(clientToken: string, rawName: unknown, inviteToken?: string): ParticipantState {
  if (!/^[A-Za-z0-9_-]{16,100}$/.test(clientToken)) throw new Error('Invalid browser token.')
  const existing = getByToken.get(clientToken) as ParticipantRow | undefined
  if (existing) {
    if (inviteToken) {
      const invite=db.prepare('SELECT participant_id FROM senior_invites WHERE token_hash=?').get(sha256(inviteToken)) as {participant_id:string|null}|undefined
      if (existing.is_senior !== 1 || !invite || invite.participant_id !== existing.id) {
        throw new Error('This senior invite does not belong to the active senior session on this device.')
      }
    }
    return participantState(existing)
  }
  const phase=getEventState().phase
  if (inviteToken) {
    if (!['JOINING','PAIRING'].includes(phase)) throw new Error('Senior joining is closed for this event.')
  } else if (phase !== 'JOINING') {
    throw new Error('Junior joining is closed. Please speak to an organiser.')
  }
  const name = cleanName(rawName)
  const tx = db.transaction(() => inviteToken ? joinSenior(clientToken, name, inviteToken) : joinJunior(clientToken, name))
  return participantState(tx())
}


function member(row: ParticipantRow): AllianceMember {
  return { id: row.id, name: row.name, characterId: row.character_id, characterName: character(row.team_id,row.character_id).name }
}

export function allianceForParticipant(participantId: string): AllianceSummary | null {
  const alliance = db.prepare(`SELECT a.* FROM alliances a JOIN alliance_members am ON am.alliance_id=a.id WHERE am.participant_id=?`).get(participantId) as any
  if (!alliance) return null
  const rows = db.prepare(`SELECT p.* FROM participants p JOIN alliance_members am ON am.participant_id=p.id WHERE am.alliance_id=? ORDER BY p.joined_at`).all(alliance.id) as ParticipantRow[]
  return { id: alliance.id, teamId: alliance.team_id, teamName: publicTeam(alliance.team_id).name, members: rows.map(member), createdAt: alliance.created_at }
}

function pairRequests(participantId: string): PairRequestSummary[] {
  const now = new Date().toISOString()
  db.prepare(`UPDATE pair_requests SET status='EXPIRED' WHERE status='PENDING' AND expires_at < ?`).run(now)
  const rows = db.prepare(`SELECT * FROM pair_requests WHERE status='PENDING' AND (from_participant_id=? OR to_participant_id=?) ORDER BY created_at DESC`).all(participantId, participantId) as any[]
  return rows.map((r) => {
    const incoming = r.to_participant_id === participantId
    const other = getById.get(incoming ? r.from_participant_id : r.to_participant_id) as ParticipantRow
    return { id:r.id, direction: incoming ? 'incoming' : 'outgoing', other: member(other), createdAt:r.created_at, expiresAt:r.expires_at }
  })
}

function clueFor(row: ParticipantRow): string | null {
  const phase = getEventState().phase
  if (!['HUNT_CLUE_1','HUNT_PHOTO','VOTING','VOTES_LOCKED','TEAM_REVEALS','FINISHED'].includes(phase)) return null
  const invite = db.prepare('SELECT clue FROM senior_invites WHERE team_id=?').get(row.team_id) as {clue:string|null}|undefined
  return invite?.clue || 'One person in your team is not a junior. Talk to everyone and look for inconsistencies.'
}

export function participantStateByToken(token: string): ParticipantState | null {
  const row = getByToken.get(token) as ParticipantRow | undefined
  return row ? participantState(row) : null
}

export function participantState(row: ParticipantRow): ParticipantState {
  const event = getEventState()
  const vote = db.prepare('SELECT target_id FROM votes WHERE voter_id=?').get(row.id) as {target_id:string}|undefined
  return {
    id: row.id,
    name: row.name,
    team: publicTeam(row.team_id),
    character: character(row.team_id,row.character_id),
    pairCode: row.pair_code,
    alliance: allianceForParticipant(row.id),
    pairRequests: pairRequests(row.id),
    event,
    clue: clueFor(row),
    canSeePhoto: ['HUNT_PHOTO','VOTING','VOTES_LOCKED','TEAM_REVEALS','FINISHED'].includes(event.phase),
    voteTargetId: vote?.target_id ?? null,
  }
}

export function participantRowByToken(token: string): ParticipantRow | null { return (getByToken.get(token) as ParticipantRow|undefined) ?? null }
export function participantRowByCode(code: string): ParticipantRow | null { return (db.prepare('SELECT * FROM participants WHERE pair_code=?').get(code.toUpperCase()) as ParticipantRow|undefined) ?? null }
export function participantRowById(idValue: string): ParticipantRow | null { return (getById.get(idValue) as ParticipantRow|undefined) ?? null }
export type { ParticipantRow }
