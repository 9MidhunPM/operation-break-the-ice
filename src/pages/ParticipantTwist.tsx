import { useEffect, useState } from 'react'
import type { ParticipantState, TeamMemberChoice } from '@/types/game'
import { castVote, cluePhotoUrl, getTeamMembers } from '@/lib/api'
import { formatRemaining, useNow } from '@/lib/useClock'
import { Logo } from '@/components/Logo'

export default function ParticipantTwist({state,refresh}:{state:ParticipantState;refresh:()=>Promise<void>}){
  const phase=state.event.phase
  if(phase==='IMPOSTER_ALERT')return <AlertScreen/>
  if(phase==='HUNT_CLUE_1'||phase==='HUNT_PHOTO')return <HuntScreen state={state}/>
  if(phase==='VOTING')return <VotingScreen state={state} refresh={refresh}/>
  if(phase==='VOTES_LOCKED')return <Centered><Logo/><div className="status-icon">🔒</div><h1>Votes locked.</h1><p className="muted">Keep your eyes on the projector.</p></Centered>
  if(phase==='TEAM_REVEALS')return <Centered><Logo/><div className="status-icon">🎭</div><h1>The reveal has begun.</h1><p className="muted">Look at the projector. Keep watching your team.</p></Centered>
  return <Centered><Logo/><div className="status-icon">⚡</div><h1>Mission complete.</h1><p className="muted">Welcome to IEEE.</p></Centered>
}

function AlertScreen(){return <main className="alert-page"><div className="scanlines"/><Logo/><div><p className="alert-kicker">⚠ SIGNAL INTERRUPTED</p><h1>THERE IS AN<br/><em>IMPOSTER</em><br/>IN YOUR TEAM.</h1><p>Look around. One person has been pretending to be a junior.</p></div></main>}
function HuntScreen({state}:{state:ParticipantState}){const now=useNow();const remaining=state.event.huntEndsAt?formatRemaining(state.event.huntEndsAt-now):'--:--';return <Centered><Logo/><p className="eyebrow">TEAM {state.team.name.toUpperCase()}</p><h1 className="hunt-title">FIND THE IMPOSTER</h1><div className="timer">{remaining}</div><div className="clue-card"><span>{state.event.phase==='HUNT_PHOTO'?'FINAL CLUE':'CLUE #1'}</span>{state.event.phase==='HUNT_PHOTO'?<><img className="clue-photo" src={cluePhotoUrl()} alt="Your team childhood photo clue"/><p>One of the people around you grew up to become this person.</p></>:<p>{state.clue}</p>}</div></Centered>}
function VotingScreen({state,refresh}:{state:ParticipantState;refresh:()=>Promise<void>}){const [members,setMembers]=useState<TeamMemberChoice[]>([]);const [busy,setBusy]=useState('');const [err,setErr]=useState('');useEffect(()=>{getTeamMembers().then(setMembers).catch(e=>setErr(e.message))},[]);return <main className="vote-page"><Logo/><p className="eyebrow">TEAM {state.team.name.toUpperCase()}</p><h1>Who is the imposter?</h1><p className="muted">Choose one teammate. You can change your vote until voting closes.</p><div className="vote-grid">{members.filter(m=>m.id!==state.id).map(m=><button key={m.id} className={state.voteTargetId===m.id?'selected':''} disabled={!!busy} onClick={async()=>{setBusy(m.id);try{await castVote(m.id);await refresh()}catch(e){setErr(e instanceof Error?e.message:'Vote failed.')}finally{setBusy('')}}}><b>{m.name}</b><span>{m.characterName}</span>{state.voteTargetId===m.id&&<i>✓ VOTED</i>}</button>)}</div>{err&&<p className="error">{err}</p>}</main>}
function Centered({children}:{children:React.ReactNode}){return <main className="centered">{children}</main>}
