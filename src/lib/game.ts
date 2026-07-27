import type { CodeCheckResult, Slot } from '@/types/game'
import { CODE_INDEX, SLOT_MAP, TEAMS } from '@/data/teams'

/**
 * Pure helpers that turn the static dataset into answers for the UI.
 * No React, no storage — just data in, answers out. Easy to unit-test.
 *
 * Note: slot assignment is no longer URL-driven (no ?slot=). Slots are claimed
 * from the server; the helpers below operate on already-resolved data.
 */

/** Normalise a teammate code (trim + uppercase) for lookup & display. */
export function normalizeCode(input: string): string {
  return input.trim().toUpperCase()
}

/** Find a slot by its public pair code (case-insensitive). */
export function findSlotByCode(code: string): Slot | null {
  const normalized = normalizeCode(code)
  if (!normalized) return null
  return CODE_INDEX[normalized] ?? null
}

/**
 * Validate a teammate code entered by `player`.
 *
 * Rules:
 *  1. code must exist
 *  2. code must not be the player's own
 *  3. target must belong to the SAME team
 *  4. (the caller checks `locked` separately)
 *
 * Never leaks the *other* team's identity on `wrong-team`.
 */
export function checkTeammateCode(
  player: { teamId: string; pairCode: string },
  rawCode: string,
): CodeCheckResult {
  const normalized = normalizeCode(rawCode)
  if (!normalized) return { status: 'invalid' }

  const target = CODE_INDEX[normalized]
  if (!target) return { status: 'invalid' }

  if (target.pairCode.toUpperCase() === player.pairCode.toUpperCase()) {
    return { status: 'self' }
  }

  if (target.teamId !== player.teamId) {
    // Intentionally do NOT expose the target team name here.
    return { status: 'wrong-team' }
  }

  return {
    status: 'match',
    characterId: target.characterId,
    characterName: target.characterName,
    characterImage: target.characterImage,
    pairCode: target.pairCode,
    teamId: target.teamId,
    teamName: target.teamName,
    teamColor: target.teamColor,
  }
}

/** Look up the player's own Slot from a stored session. */
export function slotFromSessionLike(input: { slotId: string }): Slot | null {
  return SLOT_MAP[input.slotId.toUpperCase()] ?? null
}

/** Total number of slots in the dataset (sanity helper). */
export function totalSlotCount(): number {
  return TEAMS.reduce((sum, t) => sum + t.characters.length, 0)
}
