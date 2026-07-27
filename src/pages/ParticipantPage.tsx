import { lazy, Suspense, useCallback, useEffect, useState } from 'react'
import type { ParticipantState } from '@/types/game'
import { activateSeniorBrowserSession, ApiError, cancelPairRequest, createPairRequest, getMe, isSeniorBrowserSession, join, playerEventSource, respondPairRequest } from '@/lib/api'
import { useQr } from '@/lib/useQr'
import { CharacterArt } from '@/components/CharacterArt'
import { Logo } from '@/components/Logo'

const ParticipantTwist=lazy(()=>import('@/pages/ParticipantTwist'))

export default function ParticipantPage(){
  const inviteToken=window.location.pathname.startsWith('/s/') ? decodeURIComponent(window.location.pathname.slice(3)) : undefined
  if(inviteToken)activateSeniorBrowserSession()
  const seniorBrowserSession=isSeniorBrowserSession()
  const search=new URLSearchParams(window.location.search)
  const [state,setState]=useState<ParticipantState|null>(null)
  const [loading,setLoading]=useState(true)
  const [error,setError]=useState('')
  const [fresh,setFresh]=useState(false)

  const refresh=useCallback(async()=>{try{setState(await getMe());setError('')}catch(e){if(e instanceof ApiError&&e.status===404)setState(null);else setError(e instanceof Error?e.message:'Could not load your game.')}finally{setLoading(false)}},[])
  useEffect(()=>{void refresh()},[refresh])
  useEffect(()=>{if(state&&inviteToken)window.history.replaceState(null,'','/')},[state,inviteToken])
  useEffect(()=>{if(!state)return;const es=playerEventSource();const reload=()=>void refresh();['connected','pair-request','snapshot-invalidated','phase-changed','reveal-changed'].forEach(k=>es.addEventListener(k,reload));return()=>es.close()},[state?.id,refresh])
  useEffect(()=>{const on=()=>void refresh();window.addEventListener('focus',on);return()=>window.removeEventListener('focus',on)},[refresh])
  const requestExpiryKey=state?.pairRequests.map((r)=>`${r.id}:${r.expiresAt}`).join('|')||''
  useEffect(()=>{if(!state?.pairRequests.length)return;const next=Math.min(...state.pairRequests.map((r)=>new Date(r.expiresAt).getTime()));const id=window.setTimeout(()=>void refresh(),Math.max(50,next-Date.now()+100));return()=>window.clearTimeout(id)},[requestExpiryKey,refresh,state?.pairRequests.length])

  if(loading)return <Centered><Logo/><p className="muted">Connecting…</p></Centered>
  if(!state&&!inviteToken&&seniorBrowserSession)return <SeniorReconnectScreen/>
  if(!state)return <JoinScreen error={error} onJoin={async(name)=>{setError('');try{const s=await join(name,inviteToken);setState(s);setFresh(true)}catch(e){setError(e instanceof Error?e.message:'Could not join.')}}}/>
  if(fresh)return <RevealScreen state={state} onDone={()=>setFresh(false)}/>
  return <ParticipantExperience state={state} refresh={refresh} initialPairCode={search.get('pair')||''} error={error} setError={setError}/>
}

function SeniorReconnectScreen(){return <Centered><Logo/><div className="status-icon">🔐</div><h1>Senior session needs its private invite.</h1><p className="muted">This device was previously used as an imposter. After an event reset, reopen your private senior link instead of joining through the public QR.</p></Centered>}

function JoinScreen({onJoin,error}:{onJoin:(name:string)=>Promise<void>;error:string}){
  const [name,setName]=useState('');const [busy,setBusy]=useState(false)
  return <main className="join-page"><div className="join-orb"/><section className="join-card"><Logo/><p className="eyebrow">IEEE ORIENTATION</p><h1>Ready to break<br/>the ice?</h1><p className="muted">Enter your name to receive your team and character.</p><form onSubmit={async e=>{e.preventDefault();if(name.trim().length<2)return;setBusy(true);try{await onJoin(name)}finally{setBusy(false)}}}><label>Your name</label><input autoFocus maxLength={40} value={name} onChange={e=>setName(e.target.value)} placeholder="Enter your name"/><button disabled={busy||name.trim().length<2}>{busy?'Joining…':'JOIN THE MISSION'}</button></form>{error&&<p className="error">{error}</p>}</section></main>
}

function RevealScreen({state,onDone}:{state:ParticipantState;onDone:()=>void}){
  const [step,setStep]=useState(0)
  useEffect(()=>{const a=setTimeout(()=>setStep(1),900);const b=setTimeout(()=>setStep(2),2100);const c=setTimeout(onDone,4200);return()=>{clearTimeout(a);clearTimeout(b);clearTimeout(c)}},[onDone])
  return <main className="reveal-page" style={{'--accent':state.team.color} as React.CSSProperties}><CharacterArt image={state.character.image} name={state.character.name} emoji={state.team.emoji} color={state.team.color} className="reveal-bg"/><div className="reveal-shade"/><div className="reveal-copy">{step===0?<><p className="eyebrow">WELCOME</p><h1>{state.name}</h1></>:step===1?<><p className="eyebrow">YOUR TEAM</p><h1>{state.team.name}</h1></>:<><p className="eyebrow">YOU ARE</p><h1>{state.character.name}</h1><p className="team-chip">{state.team.emoji} {state.team.name}</p></>}</div></main>
}

function ParticipantExperience({state,refresh,initialPairCode,error,setError}:{state:ParticipantState;refresh:()=>Promise<void>;initialPairCode:string;error:string;setError:(s:string)=>void}){
  if(!['JOINING','PAIRING'].includes(state.event.phase))return <Suspense fallback={<Centered><Logo/><p className="muted">Updating mission…</p></Centered>}><ParticipantTwist state={state} refresh={refresh}/></Suspense>
  return <PairingScreen state={state} refresh={refresh} initialPairCode={initialPairCode} error={error} setError={setError}/>
}

function PairingScreen({state,refresh,initialPairCode,error,setError}:{state:ParticipantState;refresh:()=>Promise<void>;initialPairCode:string;error:string;setError:(s:string)=>void}){
  const origin=window.location.origin
  const qr=useQr(`${origin}/?pair=${encodeURIComponent(state.pairCode)}`,240)
  const [code,setCode]=useState(initialPairCode.toUpperCase());const [busy,setBusy]=useState(false)
  const incoming=state.pairRequests.find(r=>r.direction==='incoming');const outgoing=state.pairRequests.find(r=>r.direction==='outgoing')
  return <main className="player-page" style={{'--accent':state.team.color} as React.CSSProperties}>
    <div className="player-bg"><CharacterArt image={state.character.image} name={state.character.name} emoji={state.team.emoji} color={state.team.color}/></div><div className="player-shade"/>
    <section className="player-content"><Logo/><div className="identity"><p className="eyebrow">{state.team.emoji} TEAM {state.team.name.toUpperCase()}</p><h1>{state.character.name}</h1><p className="player-name">{state.name}</p></div>
    {state.alliance?<AllianceLocked state={state}/>:<>
      <div className="code-card"><div><span>YOUR CODE</span><strong>{state.pairCode}</strong></div>{qr&&<img src={qr} alt="Your pairing QR"/>}</div>
      <p className="instruction">Find someone from <b>{state.team.name}</b> who is not paired. Enter their code, or let them scan your QR.</p>
      {incoming?<RequestCard title={`${incoming.other.name} wants to team up`} subtitle={incoming.other.characterName} onAccept={async()=>{setBusy(true);try{await respondPairRequest(incoming.id,true);await refresh()}catch(e){setError(e instanceof Error?e.message:'Could not accept.');await refresh()}finally{setBusy(false)}}} onDecline={async()=>{await respondPairRequest(incoming.id,false);await refresh()}} busy={busy}/>:outgoing?<div className="waiting-card"><span className="pulse-dot"/><div><b>Request sent to {outgoing.other.name}</b><p>{outgoing.other.characterName} · waiting for acceptance</p><button className="link-button" disabled={busy} onClick={async()=>{setBusy(true);try{await cancelPairRequest(outgoing.id);await refresh()}catch(e){setError(e instanceof Error?e.message:'Could not cancel request.');await refresh()}finally{setBusy(false)}}}>Cancel request</button></div></div>:<form className="pair-form" onSubmit={async e=>{e.preventDefault();setBusy(true);setError('');try{await createPairRequest(code);setCode('');await refresh()}catch(e){setError(e instanceof Error?e.message:'Could not send request.');await refresh()}finally{setBusy(false)}}}><label>TEAMMATE CODE</label><div><input value={code} onChange={e=>setCode(e.target.value.toUpperCase().replace(/[^A-Z2-9]/g,'').slice(0,5))} placeholder="ABCDE"/><button disabled={busy||code.length!==5}>{busy?'…':'SEND REQUEST'}</button></div></form>}
      {error&&<p className="error">{error}</p>}
    </>}</section>
  </main>
}

function AllianceLocked({state}:{state:ParticipantState}){const others=state.alliance!.members.filter(m=>m.id!==state.id);return <div className="locked-card"><span className="success-ring">✓</span><p className="eyebrow">ALLIANCE LOCKED</p><h2>{state.name} <span>+</span> {others.map(x=>x.name).join(' + ')}</h2><p>{state.character.name} · {others.map(x=>x.characterName).join(' · ')}</p><div className="divider"/><b>Move to the {state.team.name} gathering area.</b><small>Stay with your team and wait for the next instruction.</small></div>}
function RequestCard({title,subtitle,onAccept,onDecline,busy}:{title:string;subtitle:string;onAccept:()=>void;onDecline:()=>void;busy:boolean}){return <div className="request-card"><p className="eyebrow">ALLIANCE REQUEST</p><h2>{title}</h2><p>{subtitle}</p><div><button disabled={busy} onClick={onDecline} className="secondary">DECLINE</button><button disabled={busy} onClick={onAccept}>ACCEPT</button></div></div>}
function Centered({children}:{children:React.ReactNode}){return <main className="centered">{children}</main>}
