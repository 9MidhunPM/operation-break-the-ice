import type { PlayerSession } from '@/types/game'

/**
 * Browser-local persistence for the participant's resolved assignment.
 *
 * Uses localStorage (not sessionStorage) so the assignment survives a tab or
 * browser close — the team/character must NOT change once assigned. The slot
 * itself is also reserved server-side (token → slot), so this local copy is a
 * cache of the authoritative server reservation.
 */

export const SESSION_STORAGE_KEY = 'ieee-orientation-player-v1'
export const SESSION_VERSION = 1

/** Read & parse the player session. Returns null when absent or corrupted. */
export function loadSession(): PlayerSession | null {
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<PlayerSession>

    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      typeof parsed.name !== 'string' ||
      typeof parsed.slotId !== 'string' ||
      typeof parsed.teamId !== 'string' ||
      typeof parsed.characterId !== 'string' ||
      typeof parsed.pairCode !== 'string' ||
      typeof parsed.locked !== 'boolean'
    ) {
      return null
    }

    return {
      version: SESSION_VERSION,
      name: parsed.name,
      slotId: parsed.slotId,
      teamId: parsed.teamId,
      characterId: parsed.characterId,
      pairCode: parsed.pairCode,
      pairedWithCharacterId: parsed.pairedWithCharacterId,
      pairedWithCode: parsed.pairedWithCode,
      locked: parsed.locked,
      createdAt:
        typeof parsed.createdAt === 'string'
          ? parsed.createdAt
          : new Date().toISOString(),
    }
  } catch {
    return null
  }
}

/** Persist the player session. Silently no-ops if storage is unavailable. */
export function saveSession(session: PlayerSession): void {
  try {
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session))
  } catch {
    /* no-op */
  }
}

/** Remove the player session entirely. */
export function clearSession(): void {
  try {
    localStorage.removeItem(SESSION_STORAGE_KEY)
  } catch {
    /* no-op */
  }
}

/** Build a fresh, unlocked session from a claimed slot + name. */
export function createSession(input: {
  name: string
  slotId: string
  teamId: string
  teamName: string
  teamImage: string
  teamColor: string
  characterId: string
  characterName: string
  characterImage: string
  pairCode: string
}): PlayerSession {
  return {
    version: SESSION_VERSION,
    name: input.name.trim(),
    slotId: input.slotId,
    teamId: input.teamId,
    characterId: input.characterId,
    pairCode: input.pairCode,
    locked: false,
    createdAt: new Date().toISOString(),
  }
}

/** Update only the name (team/character never change after assignment). */
export function setName(session: PlayerSession, name: string): PlayerSession {
  return { ...session, name: name.trim() }
}
