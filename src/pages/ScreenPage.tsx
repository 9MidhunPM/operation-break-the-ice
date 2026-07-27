import { useCallback, useEffect, useState } from 'react'
import type { PublicEventSnapshot } from '@/types/game'
import { getPublicState, publicEventSource } from '@/lib/api'
import { formatRemaining, useNow } from '@/lib/useClock'
import { useQr } from '@/lib/useQr'
import { Logo } from '@/components/Logo'

export default function ScreenPage(){
  const [data,setData]=useState<PublicEventSnapshot|null>(null)
  const refresh=useCallback(()=>getPublicState().then(setData).catch(()=>{}),[])
  useEffect(()=>{void refresh();const es=publicEventSource();const r=()=>void refresh();['connected','stats-changed','alliance-formed','phase-changed','reveal-changed','vote-changed'].forEach(x=>es.addEventListener(x,r));return()=>es.close()},[refresh])
  if(!data)return <main className="projector"><Logo/><h1>Connecting…</h1></main>
  const {event}=data
  if(event.phase==='JOINING'||event.phase==='PAIRING')return <Lobby data={data}/>
  if(event.phase==='IMPOSTER_ALERT')return <main className="projector projector-alert"><div className="scanlines"/><p>⚠ SYSTEM ALERT</p><h1>21 TEAMS.<br/>21 IMPOSTERS.</h1><h2>THERE IS ONE IMPOSTER INSIDE EVERY TEAM.</h2></main>
  if(event.phase==='HUNT_CLUE_1'||event.phase==='HUNT_PHOTO')return <Hunt data={data}/>
  if(event.phase==='VOTING')return <ProjectorMessage kicker="THE HUNT IS OVER" title="VOTING IS OPEN" subtitle="Choose the person you believe is the imposter on your phone."/>
  if(event.phase==='VOTES_LOCKED')return <ProjectorMessage kicker="DECISION LOCKED" title="VOTES ARE IN." subtitle="Time to discover who survived the mission."/>
  if(event.phase==='TEAM_REVEALS')return <Reveal data={data}/>
  return <ProjectorMessage kicker="MISSION COMPLETE" title="WELCOME TO IEEE." subtitle="You broke the ice. Now build something together."/>
}

function Lobby({data}:{data:PublicEventSnapshot}){const url=data.joinUrl==='/'?window.location.origin:data.joinUrl;const qr=useQr(url,420);const latest=data.recentAlliances[0];return <main className="projector lobby"><header><Logo/><div className="projector-stats"><b>{data.stats.juniors}</b><span>JUNIORS JOINED</span><b>{data.stats.alliances}</b><span>ALLIANCES</span></div></header><div className="lobby-grid"><section><p className="eyebrow">IEEE ORIENTATION</p><h1>OPERATION:<br/><em>BREAK THE ICE</em></h1><p className="projector-copy">Scan. Discover your character. Find your team.</p></section><section className="projector-qr">{qr&&<img src={qr} alt="Join QR code"/>}<b>SCAN TO JOIN</b><span>{url}</span></section></div><div className="alliance-feed"><div className="latest">{latest?<><span>⚡ NEW ALLIANCE</span><strong>{latest.members.map(m=>m.name).join(' + ')}</strong><small>{latest.members.map(m=>m.characterName).join(' × ')} · {latest.teamName}</small></>:<><span>WAITING FOR THE FIRST ALLIANCE</span><strong>Find your people.</strong></>}</div><div className="recent">{data.recentAlliances.slice(1,6).map(a=><div key={a.id}><b>{a.members.map(m=>m.name).join(' + ')}</b><span>{a.teamName}</span></div>)}</div></div></main>}
function Hunt({data}:{data:PublicEventSnapshot}){const now=useNow();const remain=data.event.huntEndsAt?formatRemaining(data.event.huntEndsAt-now):'--:--';return <main className="projector hunt-projector"><Logo/><p className="eyebrow">{data.event.phase==='HUNT_PHOTO'?'FINAL CLUE RELEASED':'THE HUNT HAS BEGUN'}</p><h1>FIND THE IMPOSTER.</h1><div className="projector-timer">{remain}</div><p>{data.event.phase==='HUNT_PHOTO'?'Check your phones. Every team has received a childhood photo.':'Question everyone. Trust nobody too quickly.'}</p></main>}
function Reveal({data}:{data:PublicEventSnapshot}){const r=data.reveal;if(!r)return <ProjectorMessage kicker="THE MOMENT OF TRUTH" title="CHOOSE A TEAM" subtitle="The organiser is preparing the first reveal."/>;if(r.revealStep==='VOTE')return <main className="projector reveal-projector"><p className="eyebrow">TEAM {r.teamName.toUpperCase()}</p><h1>YOU ACCUSED…</h1>{r.topVote?<><h2>{r.topVote.name}</h2><p>{r.topVote.characterName} · {r.topVote.votes} votes</p></>:<h2>NO VOTES</h2>}</main>;return <main className={`projector reveal-projector ${r.answer?.correct?'correct':'escaped'}`}><p className="eyebrow">TEAM {r.teamName.toUpperCase()}</p><h1>THE IMPOSTER IS…</h1>{r.answer?<><h2>{r.answer.name}</h2><p>{r.answer.characterName}</p><strong>{r.answer.correct?'IMPOSTER IDENTIFIED ✓':'THE IMPOSTER SURVIVED'}</strong></>:<h2>NOT JOINED</h2>}</main>}
function ProjectorMessage({kicker,title,subtitle}:{kicker:string;title:string;subtitle:string}){return <main className="projector message-projector"><Logo/><p className="eyebrow">{kicker}</p><h1>{title}</h1><p>{subtitle}</p></main>}
