/**
 * Shared request/response shapes for the reservation API.
 *
 * Consumed by BOTH the server (`server/api.ts`) and the client
 * (`src/lib/api.ts`). Keeping them in `src/types` means a single type
 * source of truth and that the client never drifts from the server.
 */

/** Slot info returned to the client after a successful claim/restore. */
export interface ClaimedSlot {
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

/** `POST /api/claim` */
export interface ClaimRequest {
  token: string
}
export interface ClaimResponse extends ClaimedSlot {
  /** True if this token already had a slot (idempotent). */
  existing: boolean
}

/** `GET /api/me` */
export interface MeResponse extends ClaimedSlot {
  name?: string
}

/** `PATCH /api/me/name` */
export interface UpdateNameRequest {
  token: string
  name: string
}
export interface UpdateNameResponse {
  ok: true
}

/** `POST /api/release` */
export interface ReleaseRequest {
  token: string
  pin: string
}
export interface ReleaseResponse {
  ok: true
}

/** `GET /api/stats` — read-only, used by /admin. */
export interface StatsResponse {
  joined: number
  remaining: number
  total: number
  perTeam: Array<{ teamId: string; teamName: string; joined: number; capacity: number }>
}

/** Standard error envelope. */
export interface ApiError {
  error: string
}
