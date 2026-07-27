import { SLOT_MAP, TEAMS } from '../src/data/teams'
import type { Slot } from '../src/types/game'
import { db, stmt, transaction } from './db'

/** All 500 slot descriptors, flattened from the static dataset. */
const ALL_SLOTS: Slot[] = Object.values(SLOT_MAP)

/** Capacity per team (characters per team) — uniform by construction. */
const CAPACITY = TEAMS[0]?.characters.length ?? 20

/** Claimed slot ids for one team. */
const slotsForTeamStmt = db.prepare<[string], { slot_id: string }>(
  'SELECT slot_id FROM reservations WHERE team_id = ?',
)

export function capacity(): number {
  return CAPACITY
}

export function totalSlots(): number {
  return ALL_SLOTS.length
}

export function totalClaimed(): number {
  return stmt.countAll.get()?.c ?? 0
}

/**
 * Pick the next slot: the team with the FEWEST current members, then a random
 * unclaimed slot in that team. Keeps teams balanced (~equal membership).
 *
 * Returns null only when ALL slots are taken.
 */
export function pickNextSlot(): Slot | null {
  for (const _attempt of TEAMS) {
    // Live team counts.
    const counts = TEAMS.map((t) => ({
      team: t,
      count: stmt.countByTeam.get(t.id)?.c ?? 0,
    }))

    const notFull = counts.filter((c) => c.count < CAPACITY)
    if (notFull.length === 0) return null

    const minCount = Math.min(...notFull.map((c) => c.count))
    const leastFull = notFull.filter((c) => c.count === minCount)
    const chosen = leastFull[Math.floor(Math.random() * leastFull.length)]!

    const claimed = new Set(slotsForTeamStmt.all(chosen.team.id).map((r) => r.slot_id))
    const available = ALL_SLOTS.filter(
      (s) => s.teamId === chosen.team.id && !claimed.has(s.slotId),
    )
    if (available.length > 0) {
      return available[Math.floor(Math.random() * available.length)]!
    }
    // (Race) someone filled this team between count and select — loop again.
  }
  return null
}

/**
 * Atomically reserve a slot for `token`. Idempotent: an existing reservation
 * for the token returns its slot with `existing: true`.
 */
export function claimForToken(
  token: string,
): { slot: Slot; existing: boolean } | null {
  return transaction(() => {
    const existing = stmt.getByToken.get(token)
    if (existing) {
      const slot = SLOT_MAP[existing.slot_id.toUpperCase()]
      if (slot) return { slot, existing: true }
      // Stale row (slot vanished from dataset) — re-assign below.
      stmt.deleteByToken.run(token)
    }

    const picked = pickNextSlot()
    if (!picked) return null

    stmt.insert.run(
      token,
      picked.slotId,
      picked.teamId,
      null,
      new Date().toISOString(),
    )
    return { slot: picked, existing: false }
  })()
}
