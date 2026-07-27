import { db } from './db'
import type { EventPhase, EventState, RevealStep } from '../src/types/game'

const PHASES: EventPhase[] = ['JOINING','PAIRING','IMPOSTER_ALERT','HUNT_CLUE_1','HUNT_PHOTO','VOTING','VOTES_LOCKED','TEAM_REVEALS','FINISHED']

export function getEventState(): EventState {
  const row = db.prepare('SELECT phase, hunt_ends_at, reveal_team_id, reveal_step, updated_at FROM event_state WHERE id=1').get() as any
  return {
    phase: row.phase,
    huntEndsAt: row.hunt_ends_at,
    revealTeamId: row.reveal_team_id,
    revealStep: row.reveal_step,
    updatedAt: row.updated_at,
  }
}

export function setPhase(phase: EventPhase, huntMinutes?: number) {
  if (!PHASES.includes(phase)) throw new Error('Invalid phase')
  const current = getEventState()
  if (phase === current.phase) return current
  const currentIndex = PHASES.indexOf(current.phase)
  const nextIndex = PHASES.indexOf(phase)
  if (nextIndex !== currentIndex + 1) throw new Error(`Invalid transition ${current.phase} -> ${phase}`)
  const huntEndsAt = phase === 'HUNT_CLUE_1'
    ? Date.now() + Math.max(1, Math.min(60, huntMinutes ?? 15)) * 60_000
    : current.huntEndsAt
  db.prepare(`UPDATE event_state SET phase=?, hunt_ends_at=?, reveal_team_id=CASE WHEN ?='TEAM_REVEALS' THEN reveal_team_id ELSE NULL END, reveal_step='VOTE', updated_at=? WHERE id=1`)
    .run(phase, huntEndsAt, phase, new Date().toISOString())
  return getEventState()
}

export function setReveal(teamId: string, step: RevealStep) {
  if (!['VOTE','ANSWER'].includes(step)) throw new Error('Invalid reveal step.')
  if (getEventState().phase !== 'TEAM_REVEALS') throw new Error('Team reveal controls are not active yet.')
  db.prepare(`UPDATE event_state SET reveal_team_id=?, reveal_step=?, updated_at=? WHERE id=1`)
    .run(teamId, step, new Date().toISOString())
  return getEventState()
}
