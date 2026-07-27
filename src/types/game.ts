/**
 * Core data model for the IEEE Orientation Game.
 *
 * NOTE: There is intentionally NO `isImposter`, `isSenior`, or similar field
 * anywhere in this model. The frontend must not know whether a participant
 * is a junior or a senior. Imposter reveals are a stage experience owned by
 * Agent 2 (`/screen`), not a property of client-side data.
 */

/** A single playable character slot within a team. */
export interface Character {
  /** Stable id, unique within its team, e.g. "C01". */
  id: string
  /** Display name, e.g. "Iron Man". */
  name: string
  /** Image src (URL or imported asset). Falls back gracefully if missing. */
  image: string
  /** Short tagline shown under the character name (optional). */
  tagline?: string
  /** Unique public pair code across the entire dataset, e.g. "AX7KD". */
  pairCode: string
}

/** A themed team containing multiple characters. */
export interface Team {
  /** Stable id, e.g. "T01". */
  id: string
  /** Display name, e.g. "Team Thanos". */
  name: string
  /** Image src for team artwork. */
  image: string
  /** Accent color (hex) used for team theming. */
  color: string
  /** The characters that belong to this team. */
  characters: Character[]
}

/**
 * A fully-resolved participant slot reference.
 * `slotId` is the canonical form like "T01-C01".
 */
export interface Slot {
  slotId: string
  teamId: string
  teamName: string
  teamImage: string
  teamColor: string
  characterId: string
  characterName: string
  characterImage: string
  characterTagline?: string
  pairCode: string
}

/** The local-only player state persisted to sessionStorage. */
export interface PlayerSession {
  /** Schema version, bumped when shape changes. */
  version: number
  /** Player's display name. */
  name: string
  /** Canonical slot id, e.g. "T01-C01". */
  slotId: string
  teamId: string
  characterId: string
  /** Resolved pair code for this player. */
  pairCode: string
  /** Id of the character this player paired with, if any. */
  pairedWithCharacterId?: string
  /** Pair code of the teammate, if any. */
  pairedWithCode?: string
  /** Whether the pair has been locally locked. */
  locked: boolean
  /** ISO timestamp of creation. */
  createdAt: string
}

/** Result of validating a teammate code. */
export type CodeCheckResult =
  | { status: 'invalid' }
  | { status: 'self' }
  | { status: 'wrong-team'; teamName?: string }
  | {
      status: 'match'
      characterId: string
      characterName: string
      characterImage: string
      pairCode: string
      teamId: string
      teamName: string
      teamColor: string
    }

/** The high-level screen the participant is currently on. */
export type GameStage = 'entry' | 'reveal' | 'playing' | 'locked'
