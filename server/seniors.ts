import fs from 'node:fs'
import path from 'node:path'
import { db } from './db'
import { TEAM_MAP } from './catalog'
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

export function syncSeniorConfig() {
  const filePath = path.resolve(process.env.SENIOR_CONFIG_PATH || './private/seniors.json')
  if (!fs.existsSync(filePath)) {
    console.warn(`[server] No private senior config at ${filePath}. Run npm run setup:seniors before the event.`)
    return
  }
  const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8')) as SeniorFile
  const upsert = db.prepare(`
    INSERT INTO senior_invites (id, token_hash, team_id, character_id, display_name, clue, photo_file, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(team_id) DO UPDATE SET
      token_hash=excluded.token_hash,
      character_id=excluded.character_id,
      display_name=excluded.display_name,
      clue=excluded.clue,
      photo_file=excluded.photo_file
  `)
  const tx = db.transaction(() => {
    for (const s of parsed.seniors) {
      const team = TEAM_MAP.get(s.teamId)
      if (!team) throw new Error(`Senior config references unknown team ${s.teamId}`)
      if (!team.characters.some((c) => c.id === s.characterId)) {
        throw new Error(`Senior config references unknown character ${s.teamId}/${s.characterId}`)
      }
      if (!s.inviteToken || s.inviteToken.length < 16) throw new Error(`Senior invite token too short for ${s.teamId}`)
      upsert.run(id('sinv'), sha256(s.inviteToken), s.teamId, s.characterId, s.displayName ?? null, s.clue ?? null, s.photoFile ?? null, new Date().toISOString())
    }
  })
  tx()
}
