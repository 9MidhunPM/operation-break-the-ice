import { useState } from 'react'
import type { CodeCheckResult, Slot } from '@/types/game'
import { ArtImage } from '@/components/shared/ArtImage'
import { Button } from '@/components/shared/Button'
import { Card } from '@/components/shared/Card'
import { checkTeammateCode } from '@/lib/game'
import { PairConfirm } from './PairConfirm'

export interface PlayerCardProps {
  player: Slot
  onLock: (result: Extract<CodeCheckResult, { status: 'match' }>) => void
}

/** The main playing surface: identity, code, and "enter teammate code". */
export function PlayerCard({ player, onLock }: PlayerCardProps) {
  const [code, setCode] = useState('')
  const [result, setResult] = useState<CodeCheckResult | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const verify = () => {
    const r = checkTeammateCode(
      { teamId: player.teamId, pairCode: player.pairCode },
      code,
    )
    setResult(r)
    if (r.status === 'match') setConfirmOpen(true)
  }

  const cancelConfirm = () => {
    setConfirmOpen(false)
    setResult(null)
    setCode('')
  }

  return (
    <div className="flex flex-col items-center gap-5 animate-fade-in">
      <Card glow className="w-full">
        <div className="flex flex-col items-center text-center">
          <div
            className="mx-auto h-24 w-24 sm:h-28 sm:w-28 overflow-hidden rounded-2xl border"
            style={{ borderColor: `${player.teamColor}80` }}
          >
            <ArtImage
              src={player.teamImage}
              alt={player.teamName}
              accent={player.teamColor}
              label={player.teamName}
              className="h-full w-full object-cover"
            />
          </div>
          <p className="mt-3 text-[0.65rem] uppercase tracking-[0.4em] text-white/50">
            Team
          </p>
          <h2
            className="font-display text-2xl sm:text-3xl tracking-wide"
            style={{ color: player.teamColor }}
          >
            {player.teamName.toUpperCase()}
          </h2>
        </div>

        <div className="my-5 h-px bg-white/10" />

        <div className="flex items-center gap-4">
          <div className="relative h-20 w-20 sm:h-24 sm:w-24 shrink-0 overflow-hidden rounded-full border-2 border-white/15">
            <ArtImage
              src={player.characterImage}
              alt={player.characterName}
              accent={player.teamColor}
              label={player.characterName}
              className="h-full w-full object-cover"
            />
          </div>
          <div className="min-w-0 text-left">
            <p className="text-[0.65rem] uppercase tracking-[0.4em] text-white/50">
              Your Character
            </p>
            <h3 className="font-display text-2xl tracking-wide text-white truncate">
              {player.characterName.toUpperCase()}
            </h3>
          </div>
        </div>

        <div className="my-5 h-px bg-white/10" />

        <div className="text-center">
          <p className="text-[0.65rem] uppercase tracking-[0.4em] text-ieee-gold">
            Your Code
          </p>
          <div
            className="mx-auto mt-2 inline-block rounded-xl border border-white/15 bg-black/40 px-6 py-3"
            aria-live="polite"
          >
            <span className="font-mono text-3xl sm:text-4xl tracking-[0.4em] text-white">
              {player.pairCode}
            </span>
          </div>
        </div>
      </Card>

      <p className="text-center text-sm text-white/70 max-w-sm">
        Find another member of{' '}
        <span style={{ color: player.teamColor }}>{player.teamName}</span>. Swap
        codes, then enter theirs below.
      </p>

      <Card className="w-full">
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault()
            verify()
          }}
        >
          <label htmlFor="teammate-code" className="text-left text-xs uppercase tracking-[0.3em] text-white/50">
            Enter Teammate Code
          </label>
          <input
            id="teammate-code"
            type="text"
            inputMode="text"
            autoComplete="off"
            spellCheck={false}
            placeholder="5-letter code"
            value={code}
            onChange={(e) => {
              setCode(e.target.value)
              setResult(null)
            }}
            maxLength={8}
            className="w-full rounded-2xl bg-white/8 border border-white/15 px-5 py-4 text-lg text-white placeholder-white/40 focus-ring text-center uppercase tracking-[0.3em] font-mono"
          />
          <Button type="submit" variant="primary" fullWidth disabled={code.trim().length === 0}>
            Verify Teammate
          </Button>
        </form>

        <ResultBanner result={result} teamName={player.teamName} />
      </Card>

      {result && result.status === 'match' ? (
        <PairConfirm
          open={confirmOpen}
          player={player}
          match={result}
          onCancel={cancelConfirm}
          onConfirm={() => {
            setConfirmOpen(false)
            onLock(result)
          }}
        />
      ) : null}
    </div>
  )
}

function ResultBanner({
  result,
  teamName,
}: {
  result: CodeCheckResult | null
  teamName: string
}) {
  if (!result) return null

  if (result.status === 'match') {
    return (
      <div className="mt-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 animate-fade-in">
        <p className="font-display text-lg tracking-wide text-emerald-300">
          TEAMMATE FOUND
        </p>
      </div>
    )
  }
  if (result.status === 'self') {
    return (
      <Banner tone="warn" title="THAT'S YOUR OWN CODE.">
        Find a different teammate.
      </Banner>
    )
  }
  if (result.status === 'wrong-team') {
    return (
      <Banner tone="danger" title="WRONG TEAM">
        This character belongs to another team. Keep searching for{' '}
        <span className="text-white">{teamName}</span>.
      </Banner>
    )
  }
  return (
    <Banner tone="danger" title="WE COULDN'T FIND THAT CHARACTER.">
      Check the code and try again.
    </Banner>
  )
}

function Banner({
  tone,
  title,
  children,
}: {
  tone: 'warn' | 'danger'
  title: string
  children: React.ReactNode
}) {
  const cls =
    tone === 'warn'
      ? 'border-amber-500/30 bg-amber-500/10 text-amber-300'
      : 'border-rose-500/30 bg-rose-500/10 text-rose-300'
  return (
    <div className={`mt-3 rounded-xl border px-4 py-3 animate-fade-in ${cls}`}>
      <p className="font-display text-lg tracking-wide">{title}</p>
      <p className="mt-1 text-sm text-white/70">{children}</p>
    </div>
  )
}
