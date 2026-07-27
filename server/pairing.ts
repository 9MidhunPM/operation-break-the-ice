import { db } from './db'
import { getEventState } from './event-state'
import { id } from './security'
import { allianceForParticipant, participantRowByCode, participantRowById, type ParticipantRow } from './participants'
import type { AllianceSummary } from '../src/types/game'

function assertPairingOpen() {
  if (!['JOINING','PAIRING'].includes(getEventState().phase)) throw new Error('Pairing is not open right now.')
}

function memberCount(allianceId: string): number {
  return (db.prepare('SELECT COUNT(*) c FROM alliance_members WHERE alliance_id=?').get(allianceId) as {c:number}).c
}

function canJoinExistingAlliance(sender: ParticipantRow, target: ParticipantRow): boolean {
  if (getEventState().phase !== 'PAIRING') return false
  const senderAlliance = allianceForParticipant(sender.id)
  const targetAlliance = allianceForParticipant(target.id)
  if (senderAlliance || !targetAlliance || targetAlliance.members.length !== 2) return false
  const seniorJoined=!!db.prepare('SELECT 1 FROM participants WHERE team_id=? AND is_senior=1').get(sender.team_id)
  if(!seniorJoined)return false
  const total = (db.prepare('SELECT COUNT(*) c FROM participants WHERE team_id=?').get(sender.team_id) as {c:number}).c
  const unpaired = (db.prepare(`SELECT COUNT(*) c FROM participants p WHERE p.team_id=? AND NOT EXISTS (SELECT 1 FROM alliance_members am WHERE am.participant_id=p.id)`).get(sender.team_id) as {c:number}).c
  return total % 2 === 1 && unpaired === 1
}

export function createPairRequest(sender: ParticipantRow, targetCode: string) {
  assertPairingOpen()
  const target = participantRowByCode(targetCode.trim().toUpperCase())
  if (!target) throw new Error('No joined participant has that code.')
  if (sender.id === target.id) throw new Error('That is your own code.')
  if (sender.team_id !== target.team_id) throw new Error('That participant is not in your team.')
  if (allianceForParticipant(sender.id)) throw new Error('You are already in an alliance.')
  if (allianceForParticipant(target.id) && !canJoinExistingAlliance(sender,target)) throw new Error('That participant already has an alliance.')
  const pending = db.prepare(`SELECT 1 FROM pair_requests WHERE status='PENDING' AND (from_participant_id IN (?,?) OR to_participant_id IN (?,?)) AND expires_at > ?`).get(sender.id,target.id,sender.id,target.id,new Date().toISOString())
  if (pending) throw new Error('One of you already has a pending alliance request.')
  const request = { id:id('pr'), from:sender.id, to:target.id, created:new Date(), expires:new Date(Date.now()+120_000) }
  db.prepare(`INSERT INTO pair_requests (id,from_participant_id,to_participant_id,status,created_at,expires_at) VALUES (?,?,?,'PENDING',?,?)`).run(request.id,request.from,request.to,request.created.toISOString(),request.expires.toISOString())
  return { id: request.id, targetId: target.id }
}

export function respondPairRequest(target: ParticipantRow, requestId: string, accept: boolean): AllianceSummary | null {
  assertPairingOpen()
  const tx = db.transaction(() => {
    const req = db.prepare(`SELECT * FROM pair_requests WHERE id=? AND to_participant_id=?`).get(requestId,target.id) as any
    if (!req || req.status !== 'PENDING') throw new Error('Pair request is no longer available.')
    if (new Date(req.expires_at).getTime() < Date.now()) {
      db.prepare(`UPDATE pair_requests SET status='EXPIRED' WHERE id=?`).run(requestId)
      throw new Error('Pair request expired.')
    }
    if (!accept) {
      db.prepare(`UPDATE pair_requests SET status='DECLINED' WHERE id=?`).run(requestId)
      return null
    }
    const sender = participantRowById(req.from_participant_id)
    const freshTarget = participantRowById(target.id)
    if (!sender || !freshTarget) throw new Error('Participant no longer exists.')
    if (sender.team_id !== freshTarget.team_id) throw new Error('Team mismatch.')
    if (allianceForParticipant(sender.id)) throw new Error('Requester is already in an alliance.')
    const targetAlliance = allianceForParticipant(freshTarget.id)
    let allianceId: string
    if (targetAlliance) {
      if (!canJoinExistingAlliance(sender,freshTarget)) throw new Error('Target is already in an alliance.')
      allianceId = targetAlliance.id
      if (memberCount(allianceId) >= 3) throw new Error('Alliance is full.')
      db.prepare('INSERT INTO alliance_members (alliance_id,participant_id) VALUES (?,?)').run(allianceId,sender.id)
    } else {
      allianceId = id('a')
      const created = new Date().toISOString()
      db.prepare('INSERT INTO alliances (id,team_id,created_at) VALUES (?,?,?)').run(allianceId,sender.team_id,created)
      db.prepare('INSERT INTO alliance_members (alliance_id,participant_id) VALUES (?,?),(?,?)').run(allianceId,sender.id,allianceId,freshTarget.id)
    }
    db.prepare(`UPDATE pair_requests SET status=CASE WHEN id=? THEN 'ACCEPTED' ELSE 'EXPIRED' END WHERE status='PENDING' AND (from_participant_id IN (?,?) OR to_participant_id IN (?,?))`).run(requestId,sender.id,freshTarget.id,sender.id,freshTarget.id)
    return allianceForParticipant(sender.id)
  })
  return tx()
}

export function cancelPairRequest(sender: ParticipantRow, requestId: string) {
  const result = db.prepare(`UPDATE pair_requests SET status='DECLINED' WHERE id=? AND from_participant_id=? AND status='PENDING'`).run(requestId,sender.id)
  if (result.changes !== 1) throw new Error('Pair request is no longer available.')
}
