import { useCallback, useEffect, useState } from 'react'
import type { PublicEventSnapshot } from '@/types/game'
import { getPublicState, publicEventSource } from '@/lib/api'
import { formatRemaining, useNow } from '@/lib/useClock'
import { useQr } from '@/lib/useQr'

export default function ScreenPage() {
  const [data, setData] = useState<PublicEventSnapshot | null>(null)
  const refresh = useCallback(() => getPublicState().then(setData).catch(() => {}), [])

  useEffect(() => {
    void refresh()
    const es = publicEventSource()
    const onChange = () => void refresh()
    ;['connected', 'stats-changed', 'alliance-formed', 'phase-changed', 'reveal-changed', 'vote-changed'].forEach((event) =>
      es.addEventListener(event, onChange),
    )
    return () => es.close()
  }, [refresh])

  if (!data) return <main className="projector"><ProjectorLogo /><h1 className="projector-connecting">Connecting…</h1></main>
  const { event } = data
  if (event.phase === 'JOINING') return <Lobby data={data} joiningOpen />
  if (event.phase === 'PAIRING') return <Lobby data={data} joiningOpen={false} />
  if (event.phase === 'IMPOSTER_ALERT') return <main className="projector projector-alert">
    <ProjectorLogo /><div className="scanlines" /><p>⚠ SYSTEM ALERT</p>
    <h1>{data.teamCount} TEAMS.<br />{data.teamCount} IMPOSTERS.</h1>
    <h2>THERE IS ONE IMPOSTER INSIDE EVERY TEAM.</h2>
  </main>
  if (event.phase === 'HUNT_CLUE_1' || event.phase === 'HUNT_PHOTO') return <Hunt data={data} />
  if (event.phase === 'VOTING') return <ProjectorMessage kicker="THE HUNT IS OVER" title="VOTING IS OPEN" subtitle="Choose the person you believe is the imposter on your phone." />
  if (event.phase === 'VOTES_LOCKED') return <ProjectorMessage kicker="DECISION LOCKED" title="VOTES ARE IN." subtitle="Time to discover who survived the mission." />
  if (event.phase === 'TEAM_REVEALS') return <Reveal data={data} />
  return <ProjectorMessage kicker="MISSION COMPLETE" title="WELCOME TO IEEE." subtitle="You broke the ice. Now build something together." />
}

function ProjectorLogo() {
  return <div className="projector-ieee-logo"><img src="/ieee-sahrdaya.png" alt="IEEE Sahrdaya Student Branch" /></div>
}

function Lobby({ data, joiningOpen }: { data: PublicEventSnapshot; joiningOpen: boolean }) {
  const url = data.joinUrl === '/' ? window.location.origin : data.joinUrl
  const qr = useQr(url, 420)
  const latest = data.recentAlliances[0]
  return <main className="projector lobby">
    <header><ProjectorLogo /><div className="projector-stats"><b>{data.stats.juniors}</b><span>JUNIORS JOINED</span><b>{data.stats.alliances}</b><span>ALLIANCES</span></div></header>
    <div className="lobby-grid">
      <section><p className="eyebrow">IEEE ORIENTATION</p><h1>OPERATION:<br /><em>BREAK THE ICE</em></h1><p className="projector-copy">{joiningOpen ? 'Scan. Discover your character. Find your team.' : 'Joining is closed. Find an unpaired teammate from your team and lock your alliance.'}</p></section>
      <section className="projector-qr">{joiningOpen ? <>{qr && <img src={qr} alt="Join QR code" />}<b>SCAN TO JOIN</b><span>{url}</span></> : <><div className="status-icon">🤝</div><b>PAIRING IN PROGRESS</b><span>Find your teammate. Exchange a code or scan their QR.</span></>}</section>
    </div>
    <div className="alliance-feed">
      <div className="latest">{latest ? <><span>⚡ NEW ALLIANCE</span><strong>{latest.members.map((member) => member.name).join(' + ')}</strong><small>{latest.members.map((member) => member.characterName).join(' × ')} · {latest.teamName}</small></> : <><span>WAITING FOR THE FIRST ALLIANCE</span><strong>Find your people.</strong></>}</div>
      <div className="recent">{data.recentAlliances.slice(1, 6).map((alliance) => <div key={alliance.id}><b>{alliance.members.map((member) => member.name).join(' + ')}</b><span>{alliance.teamName}</span></div>)}</div>
    </div>
  </main>
}

function Hunt({ data }: { data: PublicEventSnapshot }) {
  const now = useNow()
  const remain = data.event.huntEndsAt ? formatRemaining(data.event.huntEndsAt - now) : '--:--'
  return <main className="projector hunt-projector"><ProjectorLogo /><p className="eyebrow">{data.event.phase === 'HUNT_PHOTO' ? 'FINAL CLUE RELEASED' : 'THE HUNT HAS BEGUN'}</p><h1>FIND THE IMPOSTER.</h1><div className="projector-timer">{remain}</div><p>{data.event.phase === 'HUNT_PHOTO' ? 'Check your phones. Every team has received a childhood photo.' : 'Question everyone. Trust nobody too quickly.'}</p></main>
}

function Reveal({ data }: { data: PublicEventSnapshot }) {
  const reveal = data.reveal
  if (!reveal) return <ProjectorMessage kicker="THE MOMENT OF TRUTH" title="CHOOSE A TEAM" subtitle="The organiser is preparing the first reveal." />
  if (reveal.revealStep === 'VOTE') {
    if (reveal.topVotes.length === 0) return <main className="projector reveal-projector"><ProjectorLogo /><p className="eyebrow">TEAM {reveal.teamName.toUpperCase()}</p><h1>NO VOTES.</h1></main>
    if (reveal.topVotes.length === 1) {
      const top = reveal.topVotes[0]!
      return <main className="projector reveal-projector"><ProjectorLogo /><p className="eyebrow">TEAM {reveal.teamName.toUpperCase()}</p><h1>YOU ACCUSED…</h1><h2>{top.name}</h2><p>{top.characterName} · {top.votes} votes</p></main>
    }
    return <main className="projector reveal-projector"><ProjectorLogo /><p className="eyebrow">TEAM {reveal.teamName.toUpperCase()}</p><h1>YOUR VOTE WAS TIED.</h1><h2>{reveal.topVotes.map((vote) => vote.name).join(' × ')}</h2><p>{reveal.topVotes[0]!.votes} votes each</p></main>
  }
  return <main className={`projector reveal-projector ${reveal.answer?.correct ? 'correct' : 'escaped'}`}><ProjectorLogo /><p className="eyebrow">TEAM {reveal.teamName.toUpperCase()}</p><h1>THE IMPOSTER IS…</h1>{reveal.answer ? <><h2>{reveal.answer.name}</h2><p>{reveal.answer.characterName}</p><strong>{reveal.answer.correct ? 'IMPOSTER IDENTIFIED ✓' : 'THE IMPOSTER SURVIVED'}</strong></> : <h2>NOT JOINED</h2>}</main>
}

function ProjectorMessage({ kicker, title, subtitle }: { kicker: string; title: string; subtitle: string }) {
  return <main className="projector message-projector"><ProjectorLogo /><p className="eyebrow">{kicker}</p><h1>{title}</h1><p>{subtitle}</p></main>
}
