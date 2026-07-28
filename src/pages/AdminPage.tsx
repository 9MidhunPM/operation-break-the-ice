import { useCallback, useEffect, useMemo, useState } from 'react'
import type { AdminStats, EventPhase } from '@/types/game'
import {
  ApiError,
  adminLogin,
  adminReset,
  adminSetPhase,
  adminSetReveal,
  clearAdminToken,
  getAdminState,
  getAdminToken,
  publicEventSource,
} from '@/lib/api'
import { Logo } from '@/components/Logo'

type SeniorReadiness = {
  teamId: string
  teamName: string
  configured: boolean
  joined: boolean
  displayName: string | null
  clueConfigured: boolean
  photoConfigured: boolean
  photoPresent: boolean
}

type RosterMember = {
  id: string
  name: string
  characterId: string
  characterName: string
  characterImage: string | null
  pairCode: string
  isSenior: boolean
  allianceId: string | null
  joinedAt: string
}

type TeamRoster = {
  teamId: string
  teamName: string
  teamColor: string
  teamEmoji: string
  members: RosterMember[]
}

type VoteResult = {
  teamId: string
  teamName: string
  results: Array<{ id: string; name: string; character_id: string; votes: number }>
}

type AdminState = {
  event: {
    phase: EventPhase
    huntEndsAt: number | null
    revealTeamId: string | null
    revealStep: 'VOTE' | 'ANSWER'
  }
  stats: AdminStats
  recentAlliances: unknown[]
  seniorReadiness: SeniorReadiness[]
  voteResults: VoteResult[]
  teamRosters: TeamRoster[]
}

const phases: EventPhase[] = [
  'JOINING',
  'PAIRING',
  'IMPOSTER_ALERT',
  'HUNT_CLUE_1',
  'HUNT_PHOTO',
  'VOTING',
  'VOTES_LOCKED',
  'TEAM_REVEALS',
  'FINISHED',
]

export default function AdminPage() {
  const [auth, setAuth] = useState(!!getAdminToken())
  const [data, setData] = useState<AdminState | null>(null)
  const [error, setError] = useState('')

  const refresh = useCallback(async () => {
    if (!auth) return
    try {
      setData(await getAdminState<AdminState>())
      setError('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Admin request failed.')
      if (err instanceof ApiError && err.status === 401) {
        clearAdminToken()
        setAuth(false)
      }
    }
  }, [auth])

  useEffect(() => {
    void refresh()
    if (!auth) return
    const es = publicEventSource()
    const onChange = () => void refresh()
    ;['connected', 'stats-changed', 'alliance-formed', 'phase-changed', 'reveal-changed', 'vote-changed'].forEach((event) =>
      es.addEventListener(event, onChange),
    )
    return () => es.close()
  }, [auth, refresh])

  if (!auth) return <AdminLogin onDone={() => setAuth(true)} />
  if (!data) return <main className="admin-page"><Logo /><p>{error || 'Loading control room…'}</p></main>
  return <AdminDashboard data={data} refresh={refresh} error={error} />
}

function AdminLogin({ onDone }: { onDone: () => void }) {
  const [pin, setPin] = useState('')
  const [err, setErr] = useState('')
  return (
    <main className="admin-login">
      <form onSubmit={async (event) => {
        event.preventDefault()
        try {
          await adminLogin(pin)
          onDone()
        } catch (error) {
          setErr(error instanceof Error ? error.message : 'Login failed.')
        }
      }}>
        <Logo />
        <h1>Stage Control</h1>
        <label>Admin PIN</label>
        <input type="password" autoFocus value={pin} onChange={(event) => setPin(event.target.value)} />
        <button>UNLOCK CONTROL ROOM</button>
        {err && <p className="error">{err}</p>}
      </form>
    </main>
  )
}

function AdminDashboard({ data, refresh, error }: { data: AdminState; refresh: () => Promise<void>; error: string }) {
  const [minutes, setMinutes] = useState(15)
  const [tab, setTab] = useState<'control' | 'rosters'>('control')
  const teamCount = data.seniorReadiness.length
  const idx = phases.indexOf(data.event.phase)
  const next = phases[idx + 1]
  const joinedSeniors = data.seniorReadiness.filter((item) => item.joined).length
  const readyPhotos = data.seniorReadiness.filter((item) => item.photoPresent).length
  const voteMap = useMemo(() => new Map(data.voteResults.map((vote) => [vote.teamId, vote])), [data.voteResults])

  return (
    <main className="admin-page">
      <header>
        <div><Logo /><h1>Stage Control</h1><p>Current phase: <b>{data.event.phase}</b></p></div>
        <a href="/screen" target="_blank" rel="noreferrer">OPEN PROJECTOR ↗</a>
      </header>
      {error && <p className="error">{error}</p>}

      <nav className="admin-tabs" aria-label="Admin sections">
        <button className={tab === 'control' ? 'active' : ''} onClick={() => setTab('control')}>CONTROL ROOM</button>
        <button className={tab === 'rosters' ? 'active' : ''} onClick={() => setTab('rosters')}>
          TEAM ROSTERS <span>{data.stats.totalParticipants}</span>
        </button>
      </nav>

      {tab === 'rosters' ? <RosterPanel rosters={data.teamRosters} /> : <>
        <section className="admin-metrics">
          <Metric n={data.stats.juniors} label="Juniors" />
          <Metric n={`${joinedSeniors}/${teamCount}`} label="Seniors ready" />
          <Metric n={data.stats.alliances} label="Alliances" />
          <Metric n={data.stats.unpairedPeople} label="Unpaired people" />
          <Metric n={`${readyPhotos}/${teamCount}`} label="Clue photos ready" />
        </section>

        <section className="admin-section">
          <h2>Event control</h2>
          <div className="admin-actions">
            {data.event.phase === 'HUNT_CLUE_1' && <span>Hunt is running. Advance when you want to release photos.</span>}
            {next && <>
              <button className={next === 'IMPOSTER_ALERT' ? 'danger' : ''} onClick={async () => {
                if (next === 'PAIRING' && !confirm(`Close junior joining now?\n\n${data.stats.juniors} juniors are joined. New juniors will be blocked until RESET LIVE EVENT.`)) return
                if (next === 'IMPOSTER_ALERT') {
                  const warnings = [
                    joinedSeniors !== teamCount ? `Only ${joinedSeniors}/${teamCount} seniors are joined.` : '',
                    data.stats.unpairedPeople > 0 ? `${data.stats.unpairedPeople} people are still unpaired.` : '',
                  ].filter(Boolean)
                  if (!confirm(warnings.length ? `${warnings.join('\n')}\n\nTrigger the imposter alert anyway?` : 'Trigger the imposter alert on every phone and projector?')) return
                }
                if (next === 'HUNT_PHOTO' && readyPhotos < teamCount && !confirm(`Only ${readyPhotos}/${teamCount} childhood photos are present. Release the photo clue anyway?`)) return
                await adminSetPhase(next, next === 'HUNT_CLUE_1' ? minutes : undefined)
                await refresh()
              }}>ADVANCE → {next}</button>
              {next === 'HUNT_CLUE_1' && <label>Hunt minutes <input type="number" min="1" max="60" value={minutes} onChange={(event) => setMinutes(Number(event.target.value) || 15)} /></label>}
            </>}
            <button className="ghost danger" onClick={async () => {
              if (confirm('RESET ALL live participant, alliance and vote data? Senior invite configuration will remain.')) {
                await adminReset()
                await refresh()
              }
            }}>RESET LIVE EVENT</button>
          </div>
        </section>

        {data.event.phase === 'TEAM_REVEALS' && <section className="admin-section">
          <h2>Team reveals</h2>
          <div className="reveal-admin-grid">{data.stats.perTeam.map((team) => <div key={team.teamId} className={data.event.revealTeamId === team.teamId ? 'active' : ''}>
            <b>{team.teamName}</b>
            <span>{voteMap.get(team.teamId)?.results?.[0]?.votes || 0} top votes</span>
            <button onClick={async () => { await adminSetReveal(team.teamId, 'VOTE'); await refresh() }}>SHOW VOTE</button>
            <button className="danger" onClick={async () => { await adminSetReveal(team.teamId, 'ANSWER'); await refresh() }}>REVEAL IMPOSTER</button>
          </div>)}</div>
        </section>}

        <section className="admin-section">
          <h2>Team status</h2>
          <div className="admin-table">
            <div className="admin-row head"><span>Team</span><span>Juniors</span><span>Senior</span><span>Alliances</span><span>Unpaired</span><span>Clue</span><span>Photo</span></div>
            {data.stats.perTeam.map((team) => {
              const senior = data.seniorReadiness.find((item) => item.teamId === team.teamId)
              return <div className="admin-row" key={team.teamId}>
                <b>{team.teamName}</b><span>{team.juniors}</span>
                <span className={senior?.joined ? 'ok' : 'warn'}>{senior?.joined ? 'Ready' : senior?.configured ? 'Waiting' : 'Not configured'}</span>
                <span>{team.alliances}</span><span>{team.unpairedPeople}</span>
                <span className={senior?.clueConfigured ? 'ok' : 'warn'}>{senior?.clueConfigured ? 'Ready' : 'Missing'}</span>
                <span className={senior?.photoPresent ? 'ok' : 'warn'}>{senior?.photoPresent ? 'Ready' : senior?.photoConfigured ? 'File missing' : 'Missing'}</span>
              </div>
            })}
          </div>
        </section>

        {['VOTES_LOCKED', 'TEAM_REVEALS'].includes(data.event.phase) && <section className="admin-section">
          <h2>Vote leaders</h2>
          <div className="vote-leaders">{data.voteResults.map((vote) => <div key={vote.teamId}><b>{vote.teamName}</b>{vote.results.slice(0, 3).map((result, i) => <span key={result.id}>{i + 1}. {result.name} — {result.votes}</span>)}</div>)}</div>
        </section>}
      </>}
    </main>
  )
}

function RosterPanel({ rosters }: { rosters: TeamRoster[] }) {
  const [selectedTeamId, setSelectedTeamId] = useState(rosters[0]?.teamId ?? '')
  const [query, setQuery] = useState('')
  const selected = rosters.find((team) => team.teamId === selectedTeamId) ?? rosters[0]
  const members = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!selected || !needle) return selected?.members ?? []
    return selected.members.filter((member) => `${member.name} ${member.characterName} ${member.pairCode}`.toLowerCase().includes(needle))
  }, [query, selected])

  if (!selected) return <section className="admin-section"><p>No teams configured.</p></section>
  const paired = selected.members.filter((member) => member.allianceId).length

  return <section className="roster-layout">
    <aside className="roster-teams">
      <div className="roster-aside-heading"><span>{rosters.length} TEAMS</span><b>Choose a team</b></div>
      <div className="roster-team-list">{rosters.map((team) => <button
        key={team.teamId}
        className={team.teamId === selected.teamId ? 'active' : ''}
        onClick={() => { setSelectedTeamId(team.teamId); setQuery('') }}
      >
        <i style={{ background: team.teamColor }}>{team.teamEmoji}</i>
        <span><b>{team.teamName}</b><small>{team.members.length} joined</small></span>
        <strong>{team.members.length}</strong>
      </button>)}</div>
    </aside>

    <div className="roster-detail">
      <div className="roster-titlebar">
        <div className="roster-team-title"><i style={{ background: selected.teamColor }}>{selected.teamEmoji}</i><div><span>TEAM ROSTER</span><h2>{selected.teamName}</h2></div></div>
        <div className="roster-summary"><b>{selected.members.length}</b><span>joined</span><b>{paired}</b><span>paired</span></div>
      </div>
      <div className="roster-search"><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name, character or code…" /></div>

      {members.length === 0 ? <div className="roster-empty"><b>{selected.members.length ? 'No matching people' : 'Nobody has joined this team yet'}</b><span>{selected.members.length ? 'Try a different search.' : 'This roster will fill live as participants join.'}</span></div> :
        <div className="roster-member-list">{members.map((member, index) => <article className="roster-member" key={member.id}>
          <span className="roster-index">{String(index + 1).padStart(2, '0')}</span>
          <div className="roster-avatar">{member.characterImage ? <img src={member.characterImage} alt="" /> : <span>{member.characterName.slice(0, 1)}</span>}</div>
          <div className="roster-person"><div><h3>{member.name}</h3>{member.isSenior && <span className="senior-badge">SENIOR</span>}</div><p>{member.characterName}</p></div>
          <div className={`roster-pair ${member.allianceId ? 'paired' : ''}`}><span className="roster-dot" />{member.allianceId ? 'Paired' : 'Unpaired'}</div>
          <div className="roster-code"><span>CODE</span><b>{member.pairCode}</b></div>
        </article>)}</div>}
    </div>
  </section>
}

function Metric({ n, label }: { n: string | number; label: string }) {
  return <div><strong>{n}</strong><span>{label}</span></div>
}
