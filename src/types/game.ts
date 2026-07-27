export type EventPhase =
  | 'JOINING'
  | 'PAIRING'
  | 'IMPOSTER_ALERT'
  | 'HUNT_CLUE_1'
  | 'HUNT_PHOTO'
  | 'VOTING'
  | 'VOTES_LOCKED'
  | 'TEAM_REVEALS'
  | 'FINISHED'

export type RevealStep = 'VOTE' | 'ANSWER'

export interface EventState {
  phase: EventPhase
  huntEndsAt: number | null
  revealTeamId: string | null
  revealStep: RevealStep
  updatedAt: string
}

export interface PublicCharacter {
  id: string
  name: string
  image?: string
}

export interface PublicTeam {
  id: string
  name: string
  color: string
  emoji: string
}

export interface AllianceMember {
  id: string
  name: string
  characterId: string
  characterName: string
}

export interface AllianceSummary {
  id: string
  teamId: string
  teamName: string
  members: AllianceMember[]
  createdAt: string
}

export interface PairRequestSummary {
  id: string
  direction: 'incoming' | 'outgoing'
  other: AllianceMember
  createdAt: string
  expiresAt: string
}

export interface ParticipantState {
  id: string
  name: string
  team: PublicTeam
  character: PublicCharacter
  pairCode: string
  alliance: AllianceSummary | null
  pairRequests: PairRequestSummary[]
  event: EventState
  clue: string | null
  canSeePhoto: boolean
  voteTargetId: string | null
}

export interface TeamMemberChoice {
  id: string
  name: string
  characterName: string
  characterId: string
}

export interface TeamStats {
  teamId: string
  teamName: string
  juniors: number
  seniors: number
  total: number
  alliances: number
  pairedPeople: number
  unpairedPeople: number
}

export interface PublicStats {
  juniors: number
  seniors: number
  totalParticipants: number
  alliances: number
  pairedPeople: number
  unpairedPeople: number
  perTeam: TeamStats[]
}

export interface RevealPublicState {
  teamId: string
  teamName: string
  revealStep: RevealStep
  topVote: { id: string; name: string; characterName: string; votes: number } | null
  answer: { id: string; name: string; characterName: string; correct: boolean } | null
}

export interface PublicEventSnapshot {
  event: EventState
  stats: PublicStats
  recentAlliances: AllianceSummary[]
  joinUrl: string
  reveal: RevealPublicState | null
}
