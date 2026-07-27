import type { ParticipantState, PublicEventSnapshot, TeamMemberChoice } from '@/types/game'

const JUNIOR_TOKEN_KEY='break-the-ice-player-token-v2'
const SENIOR_TOKEN_KEY='break-the-ice-senior-player-token-v2'
const ACTIVE_SESSION_KEY='break-the-ice-active-session-v2'
const ADMIN_TOKEN_KEY='break-the-ice-admin-token-v2'

export class ApiError extends Error { constructor(message:string,readonly status:number){super(message)} }

async function request<T>(url:string,init:RequestInit={}):Promise<T>{
  const res=await fetch(url,init)
  const body=await res.json().catch(()=>null) as {error?:string}|T|null
  if(!res.ok)throw new ApiError((body&&typeof body==='object'&&'error' in body&&body.error)||`Request failed (${res.status})`,res.status)
  return body as T
}

function tokenFor(key:string){
  let token=localStorage.getItem(key)
  if(!token){token=crypto.randomUUID().replace(/-/g,'');localStorage.setItem(key,token)}
  return token
}
export function activateSeniorBrowserSession(){localStorage.setItem(ACTIVE_SESSION_KEY,'senior');return tokenFor(SENIOR_TOKEN_KEY)}
export function isSeniorBrowserSession(){return localStorage.getItem(ACTIVE_SESSION_KEY)==='senior'}
export function getPlayerToken(){return tokenFor(isSeniorBrowserSession()?SENIOR_TOKEN_KEY:JUNIOR_TOKEN_KEY)}
function playerHeaders(json=false):HeadersInit{return{'x-player-token':getPlayerToken(),...(json?{'content-type':'application/json'}:{})}}

export function join(name:string,inviteToken?:string){return request<ParticipantState>('/api/join',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({clientToken:getPlayerToken(),name,inviteToken})})}
export function getMe(){return request<ParticipantState>('/api/me',{headers:playerHeaders()})}
export function createPairRequest(targetCode:string){return request<{ok:true;id:string}>('/api/pair-requests',{method:'POST',headers:playerHeaders(true),body:JSON.stringify({targetCode})})}
export function cancelPairRequest(id:string){return request('/api/pair-requests/'+encodeURIComponent(id),{method:'DELETE',headers:playerHeaders()})}
export function respondPairRequest(id:string,accept:boolean){return request('/api/pair-requests/'+encodeURIComponent(id)+'/respond',{method:'POST',headers:playerHeaders(true),body:JSON.stringify({accept})})}
export function getTeamMembers(){return request<TeamMemberChoice[]>('/api/team-members',{headers:playerHeaders()})}
export function castVote(targetParticipantId:string){return request('/api/vote',{method:'PUT',headers:playerHeaders(true),body:JSON.stringify({targetParticipantId})})}
export function getPublicState(){return request<PublicEventSnapshot>('/api/public-state')}
export function cluePhotoUrl(){return `/api/me/clue-photo?token=${encodeURIComponent(getPlayerToken())}`}
export function playerEventSource(){return new EventSource(`/api/events?token=${encodeURIComponent(getPlayerToken())}`)}
export function publicEventSource(){return new EventSource('/api/events?scope=public')}

export function getAdminToken(){return sessionStorage.getItem(ADMIN_TOKEN_KEY)}
export function clearAdminToken(){sessionStorage.removeItem(ADMIN_TOKEN_KEY)}
export async function adminLogin(pin:string){const r=await request<{token:string}>('/api/admin/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({pin})});sessionStorage.setItem(ADMIN_TOKEN_KEY,r.token);return r.token}
function adminHeaders(json=false):HeadersInit{const token=getAdminToken();return{authorization:`Bearer ${token||''}`,...(json?{'content-type':'application/json'}:{})}}
export function getAdminState<T>(){return request<T>('/api/admin/state',{headers:adminHeaders()})}
export function adminSetPhase(phase:string,huntMinutes?:number){return request('/api/admin/phase',{method:'POST',headers:adminHeaders(true),body:JSON.stringify({phase,huntMinutes})})}
export function adminSetReveal(teamId:string,step:'VOTE'|'ANSWER'){return request('/api/admin/reveal',{method:'POST',headers:adminHeaders(true),body:JSON.stringify({teamId,step})})}
export function adminReset(){return request('/api/admin/reset',{method:'POST',headers:adminHeaders(true)})}
