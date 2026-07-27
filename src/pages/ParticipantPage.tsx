import { useCallback, useEffect, useState } from 'react'
import type { ParticipantState, TeamMemberChoice } from '@/types/game'
import { ApiError, cancelPairRequest, castVote, cluePhotoUrl, createPairRequest, getMe, getTeamMembers, join, playerEventSource, respondPairRequest } from '@/lib/api'
import { formatRemaining, useNow } from '@/lib/useClock'
import { useQr } from '@/lib/useQr'
import { CharacterArt } from '@/components/CharacterArt'
import { Logo } from '@/components/Logo'

export default function ParticipantPage(){
  const inviteToken=window.location.pathname.startsWith('/s/') ? decodeURIComponent(window.location.pathname.slice(3)) : undefined
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

  if(loading)return <Centered><Logo/><p className="muted">Connecting…</p></Centered>
  if(!state)return <JoinScreen error={error} onJoin={async(name)=>{setError('');try{const s=await join(name,inviteToken);setState(s);setFresh(true)}catch(e){setError(e instanceof Error?e.message:'Could not join.')}}}/>
  if(fresh)return <RevealScreen state={state} onDone={()=>setFresh(false)}/>
  return <ParticipantExperience state={state} refresh={refresh} initialPairCode={search.get('pair')||''} error={error} setError={setError}/>
}

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
  const phase=state.event.phase
  if(phase==='IMPOSTER_ALERT')return <AlertScreen/>
  if(phase==='HUNT_CLUE_1'||phase==='HUNT_PHOTO')return <HuntScreen state={state}/>
  if(phase==='VOTING')return <VotingScreen state={state} refresh={refresh}/>
  if(phase==='VOTES_LOCKED')return <Centered><Logo/><div className="status-icon">🔒</div><h1>Votes locked.</h1><p className="muted">Keep your eyes on the projector.</p></Centered>
  if(phase==='TEAM_REVEALS')return <Centered><Logo/><div className="status-icon">🎭</div><h1>The reveal has begun.</h1><p className="muted">Look at the projector. Imposters, keep a straight face.</p></Centered>
  if(phase==='FINISHED')return <Centered><Logo/><div className="status-icon">⚡</div><h1>Mission complete.</h1><p className="muted">Welcome to IEEE.</p></Centered>
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
function AlertScreen(){return <main className="alert-page"><div className="scanlines"/><Logo/><div><p className="alert-kicker">⚠ SIGNAL INTERRUPTED</p><h1>THERE IS AN<br/><em>IMPOSTER</em><br/>IN YOUR TEAM.</h1><p>Look around. One person has been pretending to be a junior.</p></div></main>}
function HuntScreen({state}:{state:ParticipantState}){const now=useNow();const remaining=state.event.huntEndsAt?formatRemaining(state.event.huntEndsAt-now):'--:--';return <Centered><Logo/><p className="eyebrow">TEAM {state.team.name.toUpperCase()}</p><h1 className="hunt-title">FIND THE IMPOSTER</h1><div className="timer">{remaining}</div><div className="clue-card"><span>{state.event.phase==='HUNT_PHOTO'?'FINAL CLUE':'CLUE #1'}</span>{state.event.phase==='HUNT_PHOTO'?<><img className="clue-photo" src={cluePhotoUrl()} alt="Your team imposter childhood clue"/><p>One of the people around you grew up to become this person.</p></>:<p>{state.clue}</p>}</div></Centered>}
function VotingScreen({state,refresh}:{state:ParticipantState;refresh:()=>Promise<void>}){const [members,setMembers]=useState<TeamMemberChoice[]>([]);const [busy,setBusy]=useState('');const [err,setErr]=useState('');useEffect(()=>{getTeamMembers().then(setMembers).catch(e=>setErr(e.message))},[]);return <main className="vote-page"><Logo/><p className="eyebrow">TEAM {state.team.name.toUpperCase()}</p><h1>Who is the imposter?</h1><p className="muted">Choose one teammate. You can change your vote until voting closes.</p><div className="vote-grid">{members.filter(m=>m.id!==state.id).map(m=><button key={m.id} className={state.voteTargetId===m.id?'selected':''} disabled={!!busy} onClick={async()=>{setBusy(m.id);try{await castVote(m.id);await refresh()}catch(e){setErr(e instanceof Error?e.message:'Vote failed.')}finally{setBusy('')}}}><b>{m.name}</b><span>{m.characterName}</span>{state.voteTargetId===m.id&&<i>✓ VOTED</i>}</button>)}</div>{err&&<p className="error">{err}</p>}</main>}
function Centered({children}:{children:React.ReactNode}){return <main className="centered">{children}</main>}
