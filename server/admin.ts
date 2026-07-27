import type { Request, Response, NextFunction } from 'express'
import { db, resetLiveEvent } from './db'
import { id, safeEqual, sha256 } from './security'
import { getEventState, setPhase, setReveal } from './event-state'
import { recentAlliances, stats } from './stats'
import { TEAMS } from './catalog'
import type { EventPhase, RevealStep } from '../src/types/game'

const ADMIN_PIN = process.env.ADMIN_PIN || 'change-me-now'
const TTL = 12 * 60 * 60 * 1000

export function login(pin: string) {
  if (!safeEqual(pin, ADMIN_PIN)) throw new Error('Wrong admin PIN.')
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

export function adminState() {
  const readiness=TEAMS.map((t)=>{
    const row=db.prepare(`SELECT display_name,participant_id FROM senior_invites WHERE team_id=?`).get(t.id) as any
    return {teamId:t.id,teamName:t.name,configured:!!row,joined:!!row?.participant_id,displayName:row?.display_name ?? null}
  })
  const voteResults=TEAMS.map((t)=>({teamId:t.id,teamName:t.name,results:db.prepare(`SELECT p.id,p.name,p.character_id,COUNT(v.voter_id) votes FROM participants p LEFT JOIN votes v ON v.target_id=p.id WHERE p.team_id=? GROUP BY p.id ORDER BY votes DESC,p.name ASC`).all(t.id)}))
  return {event:getEventState(),stats:stats(),recentAlliances:recentAlliances(),seniorReadiness:readiness,voteResults}
}

export function adminSetPhase(phase: EventPhase,huntMinutes?:number){return setPhase(phase,huntMinutes)}
export function adminSetReveal(teamId:string,step:RevealStep){if(!TEAMS.some(t=>t.id===teamId))throw new Error('Unknown team.');return setReveal(teamId,step)}
export { resetLiveEvent }
