import express, { type Request, type Response } from 'express'
import fs from 'node:fs'
import path from 'node:path'
import { db } from './db'
import { addListener, broadcastAll, broadcastPublic, sendToParticipant } from './events'
import { joinParticipant, participantRowByToken, participantStateByToken } from './participants'
import { cancelPairRequest, createPairRequest, respondPairRequest } from './pairing'
import { getEventState } from './event-state'
import { projectorStats, recentAlliances, revealState } from './stats'
import { adminSetPhase, adminSetReveal, adminState, login, requireAdmin, resetLiveEvent } from './admin'
import { castParticipantVote, teamMembersForVoting } from './voting'
import type { EventPhase, RevealStep } from '../src/types/game'
import { TEAMS } from './catalog'

export const api = express()
api.use(express.json({ limit: '64kb' }))

function error(res: Response, status: number, message: string) { return res.status(status).json({ error: message }) }
function token(req: Request): string { return req.header('x-player-token') || String(req.query.token || '') }
function player(req: Request, res: Response) {
  const row=participantRowByToken(token(req))
  if (!row) { error(res,401,'Participant session not found.'); return null }
  return row
}
function handler(fn: (req:Request,res:Response)=>unknown) {
  return (req:Request,res:Response)=>{try{void fn(req,res)}catch(e){error(res,400,e instanceof Error?e.message:'Request failed.')}}
}

api.get('/health',(_req,res)=>res.json({ok:true}))

api.post('/join',handler((req,res)=>{
  const {clientToken,name,inviteToken}=req.body as any
  const state=joinParticipant(String(clientToken||''),name,typeof inviteToken==='string'?inviteToken:undefined)
  broadcastPublic('stats-changed',{})
  res.json(state)
}))

api.get('/me',handler((req,res)=>{
  const state=participantStateByToken(token(req))
  if (!state) return error(res,404,'No participant for this browser.')
  res.json(state)
}))

api.get('/events',handler((req,res)=>{
  const scope=String(req.query.scope||'participant')==='public'?'public':'participant'
  const row=scope==='participant'?participantRowByToken(token(req)):null
  if(scope==='participant'&&!row)return error(res,401,'Participant session not found.')
  res.setHeader('Content-Type','text/event-stream')
  res.setHeader('Cache-Control','no-cache, no-transform')
  res.setHeader('Connection','keep-alive')
  res.setHeader('X-Accel-Buffering','no')
  res.flushHeaders?.()
  addListener(res,row?.id??null,scope)
}))

api.post('/pair-requests',handler((req,res)=>{
  const p=player(req,res); if(!p)return
  const result=createPairRequest(p,String((req.body as any).targetCode||''))
  if(result.created)sendToParticipant(result.targetId,'pair-request',{})
  else sendToParticipant(p.id,'snapshot-invalidated',{})
  res.status(result.created?201:200).json({ok:true,id:result.id,existingIncoming:!result.created})
}))

api.delete('/pair-requests/:id',handler((req,res)=>{
  const p=player(req,res); if(!p)return
  const requestId=String(req.params.id)
  const pending=db.prepare(`SELECT to_participant_id FROM pair_requests WHERE id=? AND from_participant_id=? AND status='PENDING'`).get(requestId,p.id) as {to_participant_id:string}|undefined
  cancelPairRequest(p,requestId)
  sendToParticipant(p.id,'snapshot-invalidated',{})
  if(pending)sendToParticipant(pending.to_participant_id,'snapshot-invalidated',{})
  res.json({ok:true})
}))

api.post('/pair-requests/:id/respond',handler((req,res)=>{
  const p=player(req,res); if(!p)return
  const requestId=String(req.params.id)
  const pending=db.prepare(`SELECT from_participant_id FROM pair_requests WHERE id=? AND to_participant_id=?`).get(requestId,p.id) as {from_participant_id:string}|undefined
  const accept=(req.body as any).accept
  if(typeof accept!=='boolean')return error(res,400,'accept must be true or false.')
  const alliance=respondPairRequest(p,requestId,accept)
  if(alliance){
    for(const m of alliance.members) sendToParticipant(m.id,'snapshot-invalidated',{})
    broadcastPublic('alliance-formed',alliance)
    broadcastPublic('stats-changed',{})
  } else {
    sendToParticipant(p.id,'snapshot-invalidated',{})
    if(pending)sendToParticipant(pending.from_participant_id,'snapshot-invalidated',{})
  }
  res.json({ok:true,alliance})
}))

api.get('/team-members',handler((req,res)=>{
  const p=player(req,res); if(!p)return
  res.json(teamMembersForVoting(p))
}))

api.put('/vote',handler((req,res)=>{
  const p=player(req,res); if(!p)return
  castParticipantVote(p,String((req.body as any).targetParticipantId||''))
  broadcastPublic('vote-changed',{})
  res.json({ok:true})
}))

api.get('/me/clue-photo',handler((req,res)=>{
  const p=player(req,res); if(!p)return
  const phase=getEventState().phase
  if(!['HUNT_PHOTO','VOTING','VOTES_LOCKED','TEAM_REVEALS','FINISHED'].includes(phase))return error(res,403,'Photo clue is not available yet.')
  const invite=db.prepare('SELECT photo_file FROM senior_invites WHERE team_id=?').get(p.team_id) as {photo_file:string|null}|undefined
  if(!invite?.photo_file)return error(res,404,'Photo clue is not configured for this team.')
  const base=path.resolve(process.env.PRIVATE_CONTENT_DIR||'./private/photos')
  const file=path.resolve(base,invite.photo_file)
  if(!file.startsWith(base+path.sep))return error(res,400,'Invalid private photo path.')
  if(!fs.existsSync(file))return error(res,404,'Photo clue file is missing.')
  res.sendFile(file)
}))

api.get('/public-state',handler((_req,res)=>{
  const event=getEventState()
  const reveal=event.phase==='TEAM_REVEALS'&&event.revealTeamId?revealState(event.revealTeamId,event.revealStep):null
  const base=(process.env.PUBLIC_BASE_URL||'').replace(/\/$/,'')
  res.json({teamCount:TEAMS.length,event,stats:projectorStats(),recentAlliances:recentAlliances(),joinUrl:base||'/',reveal})
}))

api.post('/admin/login',handler((req,res)=>res.json({token:login(String((req.body as any).pin||''))})))
api.get('/admin/state',requireAdmin,handler((_req,res)=>res.json(adminState())))
api.post('/admin/phase',requireAdmin,handler((req,res)=>{
  const state=adminSetPhase(String((req.body as any).phase) as EventPhase,Number((req.body as any).huntMinutes)||undefined)
  broadcastAll('phase-changed',state);broadcastPublic('stats-changed',{});res.json(state)
}))
api.post('/admin/reveal',requireAdmin,handler((req,res)=>{
  const state=adminSetReveal(String((req.body as any).teamId),String((req.body as any).step) as RevealStep)
  broadcastAll('reveal-changed',state);res.json(state)
}))
api.post('/admin/reset',requireAdmin,handler((_req,res)=>{resetLiveEvent();broadcastAll('phase-changed',getEventState());broadcastPublic('stats-changed',{});res.json({ok:true})}))
