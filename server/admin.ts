import type { Request, Response, NextFunction } from 'express'
import fs from 'node:fs'
import path from 'node:path'
import { db, resetLiveEvent } from './db'
import { id, safeEqual, sha256 } from './security'
import { getEventState, setPhase, setReveal } from './event-state'
import { recentAlliances, stats } from './stats'
import { TEAMS, character } from './catalog'
import type { EventPhase, RevealStep } from '../src/types/game'

const ADMIN_PIN = process.env.ADMIN_PIN || 'change-me-now'
const TTL = 12 * 60 * 60 * 1000

export function login(pin: string) {
  if (!safeEqual(pin, ADMIN_PIN)) throw new Error('Wrong admin PIN.')
  db.prepare('DELETE FROM admin_sessions WHERE expires_at < ?').run(Date.now())
  const raw=id('admin')
  db.prepare('INSERT INTO admin_sessions (token_hash,expires_at) VALUES (?,?)').run(sha256(raw),Date.now()+TTL)
  return raw
}

export function requireAdmin(req: Request,res: Response,next: NextFunction) {
  const raw=req.header('authorization')?.replace(/^Bearer\s+/i,'') || ''
  const row=raw?db.prepare('SELECT expires_at FROM admin_sessions WHERE token_hash=?').get(sha256(raw)) as {expires_at:number}|undefined:undefined
  if (!row || row.expires_at<Date.now()) return res.status(401).json({error:'Admin authentication required.'})
  next()
}

function photoPresent(photoFile: string | null | undefined) {
  if (!photoFile) return false
  const base=path.resolve(process.env.PRIVATE_CONTENT_DIR||'./private/photos')
  const file=path.resolve(base,photoFile)
  return file.startsWith(base+path.sep) && fs.existsSync(file) && fs.statSync(file).isFile()
}

interface AdminRosterRow {
  id: string
  name: string
  character_id: string
  pair_code: string
  is_senior: number
  joined_at: string
  alliance_id: string | null
}

interface SeniorReadinessRow {
  display_name: string | null
  participant_id: string | null
  clue: string | null
  photo_file: string | null
}

export function adminState() {
  const readiness=TEAMS.map((t)=>{
    const row=db.prepare(`SELECT display_name,participant_id,clue,photo_file FROM senior_invites WHERE team_id=?`).get(t.id) as SeniorReadinessRow | undefined
    return {
      teamId:t.id,teamName:t.name,configured:!!row,joined:!!row?.participant_id,displayName:row?.display_name??null,
      clueConfigured:!!row?.clue?.trim(),photoConfigured:!!row?.photo_file,photoPresent:photoPresent(row?.photo_file),
    }
  })
  const voteResults=TEAMS.map((t)=>({teamId:t.id,teamName:t.name,results:db.prepare(`SELECT p.id,p.name,p.character_id,COUNT(v.voter_id) votes FROM participants p LEFT JOIN votes v ON v.target_id=p.id WHERE p.team_id=? GROUP BY p.id ORDER BY votes DESC,p.name ASC`).all(t.id)}))
  const teamRosters=TEAMS.map((t)=>{
    const rows=db.prepare(`
      SELECT p.id,p.name,p.character_id,p.pair_code,p.is_senior,p.joined_at,am.alliance_id
      FROM participants p
      LEFT JOIN alliance_members am ON am.participant_id=p.id
      WHERE p.team_id=?
      ORDER BY p.is_senior DESC,p.name COLLATE NOCASE ASC,p.joined_at ASC
    `).all(t.id) as AdminRosterRow[]
    return {
      teamId:t.id,
      teamName:t.name,
      teamColor:t.color,
      teamEmoji:t.emoji,
      members:rows.map((row)=>{
        const c=character(t.id,row.character_id)
        return {
          id:row.id,
          name:row.name,
          characterId:row.character_id,
          characterName:c.name,
          characterImage:c.image??null,
          pairCode:row.pair_code,
          isSenior:row.is_senior===1,
          allianceId:row.alliance_id,
          joinedAt:row.joined_at,
        }
      }),
    }
  })
  return {event:getEventState(),stats:stats(),recentAlliances:recentAlliances(),seniorReadiness:readiness,voteResults,teamRosters}
}

export function adminSetPhase(phase: EventPhase,huntMinutes?:number){return setPhase(phase,huntMinutes)}
export function adminSetReveal(teamId:string,step:RevealStep){if(!TEAMS.some(t=>t.id===teamId))throw new Error('Unknown team.');return setReveal(teamId,step)}
export { resetLiveEvent }
