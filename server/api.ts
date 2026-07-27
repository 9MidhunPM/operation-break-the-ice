import express, { type Request, type Response } from 'express'
import type {
  ApiError,
  ClaimResponse,
  MeResponse,
  ReleaseResponse,
  StatsResponse,
  UpdateNameResponse,
} from '../src/types/api'
import { SLOT_MAP, TEAMS } from '../src/data/teams'
import { stmt } from './db'
import { claimForToken, capacity, totalSlots, totalClaimed } from './slots'

/**
 * Organiser PIN used to authorise a reset/release. Sourced from env so it is
 * never shipped to the client bundle. Falls back to 220806 in dev.
 */
const ORG_PIN = process.env.ORGANISER_PIN || '220806'
if (!process.env.ORGANISER_PIN) {
  // eslint-disable-next-line no-console
  console.warn(
    `[server] ORGANISER_PIN not set — using default "${ORG_PIN}". Set it in production.`,
  )
}

const MAX_NAME = 24
const TOKEN_RE = /^[A-Za-z0-9_-]{8,64}$/

function sendError(res: Response<ApiError>, status: number, message: string) {
  res.status(status).json({ error: message })
}

function validToken(token: unknown): token is string {
  return typeof token === 'string' && TOKEN_RE.test(token)
}

function rowToClaimed(
  row: { slot_id: string; name: string | null } | undefined,
): {
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
  name?: string
  existing: boolean
} | null {
  if (!row) return null
  const slot = SLOT_MAP[row.slot_id.toUpperCase()]
  if (!slot) return null
  return {
    slotId: slot.slotId,
    teamId: slot.teamId,
    teamName: slot.teamName,
    teamImage: slot.teamImage,
    teamColor: slot.teamColor,
    characterId: slot.characterId,
    characterName: slot.characterName,
    characterImage: slot.characterImage,
    characterTagline: slot.characterTagline,
    pairCode: slot.pairCode,
    name: row.name ?? undefined,
    existing: true,
  }
}

/** The Express app. Mounted under `/api` by both the Vite dev plugin and the
 *  standalone prod server. */
export const api = express()

api.use(express.json())

// ---- POST /api/claim -------------------------------------------------------
api.post('/claim', (req: Request, res: Response<ClaimResponse | ApiError>) => {
  const { token } = req.body as { token?: unknown }
  if (!validToken(token)) {
    return sendError(res, 400, 'Invalid token.')
  }
  const result = claimForToken(token)
  if (!result) {
    return sendError(res, 503, 'All slots have been claimed.')
  }
  const { slot, existing } = result
  const body: ClaimResponse = {
    slotId: slot.slotId,
    teamId: slot.teamId,
    teamName: slot.teamName,
    teamImage: slot.teamImage,
    teamColor: slot.teamColor,
    characterId: slot.characterId,
    characterName: slot.characterName,
    characterImage: slot.characterImage,
    characterTagline: slot.characterTagline,
    pairCode: slot.pairCode,
    existing,
  }
  res.status(200).json(body)
})

// ---- GET /api/me -----------------------------------------------------------
api.get('/me', (req: Request, res: Response<MeResponse | ApiError>) => {
  const token = req.header('x-token')
  if (!validToken(token)) {
    return sendError(res, 400, 'Invalid token.')
  }
  const row = stmt.getByToken.get(token)
  const claimed = rowToClaimed(row)
  if (!claimed) {
    return sendError(res, 404, 'No reservation for this token.')
  }
  const { name, ...slotFields } = claimed
  res.status(200).json({ ...slotFields, name })
})

// ---- PATCH /api/me/name ----------------------------------------------------
api.patch('/me/name', (req: Request, res: Response<UpdateNameResponse | ApiError>) => {
  const { token, name } = req.body as { token?: unknown; name?: unknown }
  if (!validToken(token)) {
    return sendError(res, 400, 'Invalid token.')
  }
  const trimmed = typeof name === 'string' ? name.trim() : ''
  if (!trimmed) {
    return sendError(res, 400, 'Name is required.')
  }
  if (trimmed.length > MAX_NAME) {
    return sendError(res, 400, `Name must be under ${MAX_NAME} characters.`)
  }
  const row = stmt.getByToken.get(token)
  if (!row) {
    return sendError(res, 404, 'No reservation for this token.')
  }
  stmt.setName.run(trimmed, token)
  res.status(200).json({ ok: true })
})

// ---- POST /api/release (PIN-gated reset) ----------------------------------
api.post('/release', (req: Request, res: Response<ReleaseResponse | ApiError>) => {
  const { token, pin } = req.body as { token?: unknown; pin?: unknown }
  if (!validToken(token)) {
    return sendError(res, 400, 'Invalid token.')
  }
  if (typeof pin !== 'string' || pin !== ORG_PIN) {
    return sendError(res, 403, 'Wrong PIN.')
  }
  stmt.deleteByToken.run(token)
  res.status(200).json({ ok: true })
})

// ---- GET /api/stats (read-only, for /admin) -------------------------------
api.get('/stats', (_req: Request, res: Response<StatsResponse>) => {
  const cap = capacity()
  const total = totalSlots()
  const joined = totalClaimed()
  const rows = stmt.teamCounts.all()
  const countsByTeam = new Map(rows.map((r) => [r.team_id, r.c]))
  const perTeam = TEAMS.map((t) => ({
    teamId: t.id,
    teamName: t.name,
    joined: countsByTeam.get(t.id) ?? 0,
    capacity: cap,
  }))
  res.status(200).json({ joined, remaining: total - joined, total, perTeam })
})

// ---- Health check ----------------------------------------------------------
api.get('/health', (_req, res) => {
  res.status(200).json({ ok: true })
})
