import type { Response } from 'express'

type Scope = 'participant' | 'public'
interface Listener { res: Response; participantId: string | null; scope: Scope }
const listeners = new Set<Listener>()

function write(res: Response, event: string, data: unknown) {
  res.write(`event: ${event}\n`)
  res.write(`data: ${JSON.stringify(data)}\n\n`)
}

export function addListener(res: Response, participantId: string | null, scope: Scope) {
  const listener = { res, participantId, scope }
  listeners.add(listener)
  write(res, 'connected', { ok: true })
  const keepAlive = setInterval(() => res.write(': ping\n\n'), 20_000)
  const cleanup = () => { clearInterval(keepAlive); listeners.delete(listener) }
  res.on('close', cleanup)
  res.on('error', cleanup)
}

export function broadcastAll(event: string, data: unknown) {
  for (const l of listeners) write(l.res, event, data)
}

export function broadcastPublic(event: string, data: unknown) {
  for (const l of listeners) if (l.scope === 'public') write(l.res, event, data)
}

export function sendToParticipant(participantId: string, event: string, data: unknown) {
  for (const l of listeners) if (l.participantId === participantId) write(l.res, event, data)
}
