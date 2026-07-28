import fs from 'node:fs'
import path from 'node:path'
import { db } from './db'
import { TEAM_MAP, TEAMS } from './catalog'
import { id, sha256 } from './security'

interface SeniorConfig {
  teamId: string
  characterId: string
  displayName?: string
  inviteToken: string
  clue?: string
  photoFile?: string
}
interface SeniorFile { seniors: SeniorConfig[] }

function seniorConfigPath() { return path.resolve(process.env.SENIOR_CONFIG_PATH || './private/seniors.json') }

function validateConfig(items: SeniorConfig[]) {
  if (items.length !== TEAMS.length) throw new Error(`Senior config must contain exactly ${TEAMS.length} entries.`)
  const teamIds=new Set(items.map((s)=>s.teamId))
  if (teamIds.size !== TEAMS.length || TEAMS.some((t)=>!teamIds.has(t.id))) throw new Error('Senior config must contain exactly one entry for every team.')
  const tokenHashes=new Set<string>()
  for (const s of items) {
    const team=TEAM_MAP.get(s.teamId)
    if (!team) throw new Error(`Senior config references unknown team ${s.teamId}`)
    if (!team.characters.some((c)=>c.id===s.characterId)) throw new Error(`Senior config references unknown character ${s.teamId}/${s.characterId}`)
    if (!s.inviteToken || s.inviteToken.length < 16) throw new Error(`Senior invite token too short for ${s.teamId}`)
    const hash=sha256(s.inviteToken)
    if (tokenHashes.has(hash)) throw new Error(`Duplicate senior invite token for ${s.teamId}`)
    tokenHashes.add(hash)
    if (!s.clue?.trim()) throw new Error(`Missing clue for ${s.teamId}`)
    if (!s.photoFile?.trim() || path.isAbsolute(s.photoFile) || s.photoFile.includes('..')) throw new Error(`Invalid photo filename for ${s.teamId}`)
  }
}

export function syncSeniorConfig() {
  const filePath=seniorConfigPath()
  if (!fs.existsSync(filePath)) {
    console.warn(`[server] No private senior config at ${filePath}. Run npm run setup:seniors before the event.`)
    return false
  }
  const parsed=JSON.parse(fs.readFileSync(filePath,'utf8')) as SeniorFile
  validateConfig(parsed.seniors)
  const configuredTeams=new Set(parsed.seniors.map((s)=>s.teamId))
  const participantTeams=db.prepare('SELECT DISTINCT team_id FROM participants').all() as Array<{team_id:string}>
  const retiredParticipantTeams=participantTeams.filter((row)=>!configuredTeams.has(row.team_id)).map((row)=>row.team_id)
  if(retiredParticipantTeams.length){
    throw new Error(`Cannot retire team(s) with joined participants: ${retiredParticipantTeams.join(', ')}. Reset or migrate those participants before starting.`)
  }
  const existingInvites=db.prepare('SELECT team_id,participant_id FROM senior_invites').all() as Array<{team_id:string;participant_id:string|null}>
  const retiredInvites=existingInvites.filter((row)=>!configuredTeams.has(row.team_id))
  const linkedRetired=retiredInvites.filter((row)=>row.participant_id)
  if(linkedRetired.length){
    throw new Error(`Cannot retire team(s) with joined seniors: ${linkedRetired.map((row)=>row.team_id).join(', ')}.`)
  }
  const upsert=db.prepare(`
    INSERT INTO senior_invites (id, token_hash, team_id, character_id, display_name, clue, photo_file, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(team_id) DO UPDATE SET
      token_hash=excluded.token_hash,
      character_id=excluded.character_id,
      display_name=excluded.display_name,
      clue=excluded.clue,
      photo_file=excluded.photo_file
  `)
  db.transaction(()=>{
    for (const row of retiredInvites) db.prepare('DELETE FROM senior_invites WHERE team_id=?').run(row.team_id)
    for (const s of parsed.seniors) upsert.run(id('sinv'),sha256(s.inviteToken),s.teamId,s.characterId,s.displayName??null,s.clue!.trim(),s.photoFile!.trim(),new Date().toISOString())
  })()
  return true
}

export function assertSeniorConfigurationReady() {
  const count=(db.prepare('SELECT COUNT(*) c FROM senior_invites').get() as {c:number}).c
  if (count !== TEAMS.length) throw new Error(`Expected ${TEAMS.length} configured senior invites, found ${count}. Run npm run setup:seniors before opening the event.`)
}
