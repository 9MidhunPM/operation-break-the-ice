import type { Response } from 'express'

type Scope = 'participant' | 'public'
interface Listener { res: Response; participantId: string | null; scope: Scope }
const listeners = new Set<Listener>()

function remove(listener: Listener) { listeners.delete(listener) }
function write(listener: Listener, event: string, data: unknown) {
  try {
    listener.res.write(`event: ${event}\n`)
    listener.res.write(`data: ${JSON.stringify(data)}\n\n`)
  } catch {
    remove(listener)
  }
}

export function addListener(res: Response, participantId: string | null, scope: Scope) {
  const listener={res,participantId,scope}
  listeners.add(listener)
  write(listener,'connected',{ok:true})
  const keepAlive=setInterval(()=>{try{res.write(': ping\n\n')}catch{remove(listener)}},20_000)
  let cleaned=false
  const cleanup=()=>{if(cleaned)return;cleaned=true;clearInterval(keepAlive);remove(listener)}
  res.on('close',cleanup)
  res.on('error',cleanup)
}

export function broadcastAll(event: string, data: unknown) { for (const l of [...listeners]) write(l,event,data) }
export function broadcastPublic(event: string, data: unknown) { for (const l of [...listeners]) if(l.scope==='public') write(l,event,data) }
export function sendToParticipant(participantId: string, event: string, data: unknown) { for (const l of [...listeners]) if(l.participantId===participantId) write(l,event,data) }
