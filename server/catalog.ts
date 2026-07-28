import fs from 'node:fs'
import path from 'node:path'
import type { PublicCharacter, PublicTeam } from '../src/types/game'

interface TeamConfig extends PublicTeam {
  characters: PublicCharacter[]
}

interface CatalogFile { teams: TeamConfig[] }

const catalogPath = path.resolve(process.cwd(), 'config/teams.json')
const parsed = JSON.parse(fs.readFileSync(catalogPath, 'utf8')) as CatalogFile

function validate(teams: TeamConfig[]) {
  if (teams.length !== 20) throw new Error(`Expected 20 teams, got ${teams.length}`)
  const teamIds = new Set<string>()
  for (const team of teams) {
    if (teamIds.has(team.id)) throw new Error(`Duplicate team id: ${team.id}`)
    teamIds.add(team.id)
    if (team.characters.length < 28) throw new Error(`${team.id} needs at least 28 characters`)
    const ids = new Set<string>()
    for (const c of team.characters) {
      if (ids.has(c.id)) throw new Error(`Duplicate character ${team.id}/${c.id}`)
      ids.add(c.id)
    }
  }
}

validate(parsed.teams)

export const TEAMS = parsed.teams
export const TEAM_MAP = new Map(TEAMS.map((t) => [t.id, t]))

export function publicTeam(teamId: string): PublicTeam {
  const team = TEAM_MAP.get(teamId)
  if (!team) throw new Error(`Unknown team ${teamId}`)
  const { characters: _characters, ...rest } = team
  return rest
}

export function character(teamId: string, characterId: string): PublicCharacter {
  const team = TEAM_MAP.get(teamId)
  const found = team?.characters.find((c) => c.id === characterId)
  if (!found) throw new Error(`Unknown character ${teamId}/${characterId}`)
  return found
}
