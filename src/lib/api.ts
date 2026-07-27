import type {
  ClaimResponse,
  MeResponse,
  ReleaseResponse,
  StatsResponse,
  UpdateNameResponse,
} from '@/types/api'
import { getClientToken } from './clientToken'

/**
 * Thin fetch wrappers around the reservation API. Same origin (`/api/*`) in
 * both dev (Vite plugin) and prod (single Node server), so no base URL config.
 *
 * All methods throw a typed Error with a human-readable message on failure so
 * the UI can surface something friendly.
 */

export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

async function request<T>(
  path: string,
  init: RequestInit & { tokenInBody?: boolean; tokenHeader?: boolean } = {},
): Promise<T> {
  const { tokenInBody, tokenHeader, headers, ...rest } = init
  const token = getClientToken()

  const finalHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(headers as Record<string, string> | undefined),
  }
  if (tokenHeader) finalHeaders['x-token'] = token

  let body: BodyInit | undefined = rest.body ?? undefined
  if (tokenInBody && body && typeof body === 'string') {
    const parsed = JSON.parse(body) as Record<string, unknown>
    body = JSON.stringify({ ...parsed, token })
  }

  let res: Response
  try {
    res = await fetch(path, { ...rest, headers: finalHeaders, body })
  } catch {
    throw new ApiError("Can't reach the game server. Check your Wi-Fi.", 0)
  }

  if (res.status === 204) return undefined as T
  const text = await res.text()
  const data = text ? JSON.parse(text) : undefined

  if (!res.ok) {
    const message =
      (data && typeof data === 'object' && 'error' in data && typeof data.error === 'string'
        ? data.error
        : null) ?? 'Something went wrong.'
    throw new ApiError(message, res.status)
  }
  return data as T
}

/** `POST /api/claim` — reserve a slot for this browser (idempotent). */
export function claimSlot(): Promise<ClaimResponse> {
  return request<ClaimResponse>('/api/claim', {
    method: 'POST',
    body: JSON.stringify({}),
    tokenInBody: true,
  })
}

/** `GET /api/me` — restore/verify this browser's reservation. */
export function getMe(): Promise<MeResponse> {
  return request<MeResponse>('/api/me', { method: 'GET', tokenHeader: true })
}

/** `PATCH /api/me/name` — update the display name only. */
export function updateName(name: string): Promise<UpdateNameResponse> {
  return request<UpdateNameResponse>('/api/me/name', {
    method: 'PATCH',
    body: JSON.stringify({ name }),
    tokenInBody: true,
  })
}

/** `POST /api/release` — PIN-gated reset; frees the slot for someone else. */
export function releaseSession(pin: string): Promise<ReleaseResponse> {
  return request<ReleaseResponse>('/api/release', {
    method: 'POST',
    body: JSON.stringify({ pin }),
    tokenInBody: true,
  })
}

/** `GET /api/stats` — read-only counts (used by /admin). */
export function getStats(): Promise<StatsResponse> {
  return request<StatsResponse>('/api/stats', { method: 'GET' })
}
