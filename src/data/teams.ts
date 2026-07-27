import type { Character, Slot, Team } from '@/types/game'

/**
 * ============================================================================
 *  HARDCODED GAME DATA — IEEE ORIENTATION
 * ============================================================================
 *
 *  This file is the SINGLE source of truth for teams, characters and pair
 *  codes. There is no backend. Everything a participant sees is derived from
 *  the arrays below.
 *
 *  ── REPLACING THE PLACEHOLDER CONTENT ──────────────────────────────────────
 *  The team names, character names and images below are PLACEHOLDERS so the
 *  app is fully testable today. To use the real Avengers-inspired content from
 *  the organiser's ChatGPT share, edit only this file:
 *
 *    1. Replace the entries in `RAW_TEAMS` with the real 25 teams
 *       (id, name, color, image).
 *    2. Replace the entries in `CHARACTER_NAME_POOL` with the real character
 *       names, or — better — replace the generated `characters` arrays with
 *       hand-authored character lists per team.
 *    3. Drop real artwork into `/public/art/teams/<id>.png` and
 *       `/public/art/characters/<slot>.png`. The `<ArtImage>` component falls
 *       back to a generated placeholder when a file is missing, so missing
 *       art never breaks the UI.
 *
 *  No other file needs to change. The UI, routing, session and pairing logic
 *  are all data-driven.
 *
 *  ── IMPOSTERS / SENIORS ────────────────────────────────────────────────────
 *  There is NO isImposter / isSenior flag anywhere in this data. A senior
 *  receives an ordinary slot/card and plays identically to everyone else.
 *  The imposter reveal is a stage experience owned by Agent 2 (`/screen`).
 * ============================================================================
 */

/** Characters per team. 25 teams × 20 = 500 slots. */
export const CHARACTERS_PER_TEAM = 20

/** Safe alphabet for pair codes (no 0/O, no 1/I/L) — 32 symbols. */
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
const CODE_BASE = CODE_ALPHABET.length // 32
const CODE_LENGTH = 5
const CODE_SPACE = CODE_BASE ** CODE_LENGTH // 33,554,432

/**
 * Odd prime coprime to 2^25, used to map a sequential slot index to a
 * scrambled (but still unique and deterministic) pair code.
 */
const CODE_PRIME = 7919

/**
 * Convert a sequential index into a deterministic, human-friendly 5-char pair
 * code drawn from the safe alphabet. Two different indices can never produce
 * the same code (multiplication by an odd number mod 2^25 is a bijection).
 */
function indexToPairCode(index: number): string {
  const scrambled = (index * CODE_PRIME) % CODE_SPACE
  let n = scrambled
  let out = ''
  for (let i = 0; i < CODE_LENGTH; i++) {
    out = CODE_ALPHABET[n % CODE_BASE] + out
    n = Math.floor(n / CODE_BASE)
  }
  return out
}

/**
 * Raw team definitions. Edit these 25 entries to install real teams.
 * `image` points at an art file; if absent, a placeholder is rendered.
 */
const RAW_TEAMS: Array<{ id: string; name: string; color: string }> = [
  { id: 'T01', name: 'The Avengers', color: '#d9252a' },
  { id: 'T02', name: 'Guardians of the Galaxy', color: '#7b4dff' },
  { id: 'T03', name: 'X-Force', color: '#ffd000' },
  { id: 'T04', name: 'Wakandan Council', color: '#3a3a3a' },
  { id: 'T05', name: 'Asgardian Guard', color: '#1e90ff' },
  { id: 'T06', name: 'Masters of Evil', color: '#8b0000' },
  { id: 'T07', name: 'Hydra Legion', color: '#2e7d32' },
  { id: 'T08', name: 'S.H.I.E.L.D.', color: '#1565c0' },
  { id: 'T09', name: 'The Defenders', color: '#b71c1c' },
  { id: 'T10', name: 'Thunderbolts', color: '#ff6f00' },
  { id: 'T11', name: 'Midnight Suns', color: '#6a1b9a' },
  { id: 'T12', name: 'Fantastic Four', color: '#00838f' },
  { id: 'T13', name: 'Sinister Six', color: '#558b2f' },
  { id: 'T14', name: 'Nova Corps', color: '#0d47a1' },
  { id: 'T15', name: 'Ravager Clan', color: '#ad1457' },
  { id: 'T16', name: 'Stark Industries', color: '#bf360c' },
  { id: 'T17', name: 'Kree Empire', color: '#00695c' },
  { id: 'T18', name: 'Sorcerers Supreme', color: '#4527a0' },
  { id: 'T19', name: 'The Eternals', color: '#c2185b' },
  { id: 'T20', name: 'The Brotherhood', color: '#37474f' },
  { id: 'T21', name: 'The Illuminati', color: '#4e342e' },
  { id: 'T22', name: 'The Hand', color: '#263238' },
  { id: 'T23', name: 'Avengers West', color: '#e65100' },
  { id: 'T24', name: 'Dark Avengers', color: '#4a148c' },
  { id: 'T25', name: 'Young Avengers', color: '#00897b' },
]

/**
 * Placeholder Marvel character name pool. Each team draws CHARACTERS_PER_TEAM
 * unique names from this pool, starting at a team-specific offset so adjacent
 * teams get different (but sometimes overlapping) rosters. Replace with real
 * character names, or hand-author the `characters` arrays below.
 */
const CHARACTER_NAME_POOL: string[] = [
  'Iron Man', 'Captain America', 'Thor', 'Hulk', 'Black Widow',
  'Hawkeye', 'Spider-Man', 'Black Panther', 'Doctor Strange', 'Captain Marvel',
  'Ant-Man', 'Wasp', 'Vision', 'Scarlet Witch', 'Falcon',
  'Winter Soldier', 'War Machine', 'Star-Lord', 'Gamora', 'Drax',
  'Rocket', 'Groot', 'Nebula', 'Mantis', 'Yondu',
  'Wolverine', 'Cyclops', 'Storm', 'Jean Grey', 'Beast',
  'Deadpool', 'Colossus', 'Nightcrawler', 'Rogue', 'Gambit',
  'Magneto', 'Mystique', 'Sabretooth', 'Juggernaut', 'Apocalypse',
  'Loki', 'Ultron', 'Thanos', 'Venom', 'Carnage',
  'Daredevil', 'Luke Cage', 'Jessica Jones', 'Iron Fist', 'Punisher',
  'Nick Fury', 'Maria Hill', 'Ghost Rider', 'Blade', 'Moon Knight',
  'Ms. Marvel', 'America Chavez', 'Wiccan', 'Speed', 'Kate Bishop',
]

/** Expected final team count for the production dataset. */
export const EXPECTED_TEAM_COUNT = 25

/**
 * Build the full dataset deterministically. Pure function — same output every
 * run, no randomness, so pair codes are stable across builds/devices.
 */
function buildTeams(): Team[] {
  return RAW_TEAMS.map((raw, teamIndex) => {
    const characters: Character[] = []
    const nameOffset = (teamIndex * 7) % CHARACTER_NAME_POOL.length
    for (let c = 0; c < CHARACTERS_PER_TEAM; c++) {
      const charNumber = c + 1
      const charId = `C${String(charNumber).padStart(2, '0')}`
      const slotId = `${raw.id}-${charId}`
      const name = CHARACTER_NAME_POOL[(nameOffset + c) % CHARACTER_NAME_POOL.length]
      characters.push({
        id: charId,
        name,
        image: `/art/characters/${slotId}.png`,
        tagline: `Operative ${charNumber}`,
        pairCode: indexToPairCode(teamIndex * CHARACTERS_PER_TEAM + c),
      })
    }
    return {
      id: raw.id,
      name: raw.name,
      color: raw.color,
      image: `/art/teams/${raw.id}.png`,
      characters,
    }
  })
}

/** The authoritative team dataset. */
export const TEAMS: Team[] = buildTeams()

/** Canonical slot id (e.g. "T01-C01") → fully-resolved Slot. */
export const SLOT_MAP: Record<string, Slot> = (() => {
  const map: Record<string, Slot> = {}
  for (const team of TEAMS) {
    for (const character of team.characters) {
      const slotId = `${team.id}-${character.id}`
      map[slotId] = {
        slotId,
        teamId: team.id,
        teamName: team.name,
        teamImage: team.image,
        teamColor: team.color,
        characterId: character.id,
        characterName: character.name,
        characterImage: character.image,
        characterTagline: character.tagline,
        pairCode: character.pairCode,
      }
    }
  }
  return map
})()

/** pair code (UPPERCASE) → Slot, for teammate lookup. */
export const CODE_INDEX: Record<string, Slot> = (() => {
  const index: Record<string, Slot> = {}
  for (const slot of Object.values(SLOT_MAP)) {
    index[slot.pairCode.toUpperCase()] = slot
  }
  return index
})()

// ---------------------------------------------------------------------------
//  DEVELOPMENT-TIME VALIDATION
// ---------------------------------------------------------------------------
//  These run once at module load in dev (and in production builds too — they
//  are cheap and fail fast if data is malformed). Relax the counts via the
//  `RELAX_VALIDATION` flag below while iterating on placeholder content.
// ---------------------------------------------------------------------------

/** Set to `true` while iterating on incomplete placeholder data. */
const RELAX_VALIDATION = false

export interface ValidationResult {
  ok: boolean
  errors: string[]
}

/** Validate the dataset integrity. Pure & side-effect free. */
export function validateDataset(teams: Team[]): ValidationResult {
  const errors: string[] = []

  if (!RELAX_VALIDATION && teams.length !== EXPECTED_TEAM_COUNT) {
    errors.push(
      `Expected exactly ${EXPECTED_TEAM_COUNT} teams, found ${teams.length}.`,
    )
  }

  const teamIds = new Set<string>()
  const slotIds = new Set<string>()
  const codes = new Set<string>()

  for (const team of teams) {
    if (teamIds.has(team.id)) errors.push(`Duplicate team id: ${team.id}`)
    teamIds.add(team.id)

    const charIdsInTeam = new Set<string>()
    for (const character of team.characters) {
      if (charIdsInTeam.has(character.id)) {
        errors.push(
          `Duplicate character id "${character.id}" within team ${team.id}`,
        )
      }
      charIdsInTeam.add(character.id)

      const slotId = `${team.id}-${character.id}`
      if (slotIds.has(slotId)) errors.push(`Duplicate slot id: ${slotId}`)
      slotIds.add(slotId)

      const code = character.pairCode.toUpperCase()
      if (!/^[A-Z2-9]{5}$/.test(code)) {
        errors.push(`Invalid pair code "${character.pairCode}" on ${slotId}`)
      }
      if (codes.has(code)) {
        errors.push(`Duplicate pair code "${code}" on ${slotId}`)
      }
      codes.add(code)
    }
  }

  return { ok: errors.length === 0, errors }
}

const _validation = validateDataset(TEAMS)
if (!_validation.ok) {
  // eslint-disable-next-line no-console
  console.error('[game data] Validation errors:\n' + _validation.errors.join('\n'))
}

/** Exposed for tests / admin diagnostics. */
export const DATASET_VALIDATION = _validation
