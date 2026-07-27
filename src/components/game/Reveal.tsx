import { useEffect, useState } from 'react'
import type { Slot } from '@/types/game'
import { ArtImage } from '@/components/shared/ArtImage'
import { Button } from '@/components/shared/Button'
import { Screen } from '@/components/shared/Screen'
import { BrandHeader } from '@/components/shared/BrandHeader'
import { useReducedMotion } from '@/lib/useReducedMotion'

export interface RevealProps {
  player: Slot
  playerName: string
  onDone: () => void
}

type Phase = 'intro' | 'team' | 'character' | 'ready'

const TEAM_DELAY = 900
const CHAR_DELAY = 900
const READY_DELAY = 700

/** Sequential, exciting team → character reveal. Respects reduced-motion. */
export function Reveal({ player, playerName, onDone }: RevealProps) {
  const reduced = useReducedMotion()
  const [phase, setPhase] = useState<Phase>('intro')

  useEffect(() => {
    // Reduced-motion users skip the staged waits; they still see the content,
    // just without the dramatic pacing.
    const delay = reduced ? 0 : TEAM_DELAY
    const t = setTimeout(() => setPhase('team'), delay)
    return () => clearTimeout(t)
  }, [reduced])

  useEffect(() => {
    if (phase !== 'team') return
    const delay = reduced ? 0 : CHAR_DELAY
    const t = setTimeout(() => setPhase('character'), delay)
    return () => clearTimeout(t)
  }, [phase, reduced])

  useEffect(() => {
    if (phase !== 'character') return
    const delay = reduced ? 0 : READY_DELAY
    const t = setTimeout(() => setPhase('ready'), delay)
    return () => clearTimeout(t)
  }, [phase, reduced])

  return (
    <Screen center>
      <div className="flex flex-col items-center gap-6">
        {phase === 'intro' ? (
          <div className="text-center animate-fade-in">
            <BrandHeader />
            <h1 className="mt-8 font-display text-4xl sm:text-5xl tracking-wide text-white">
              WELCOME,
              <br />
              <span style={{ color: player.teamColor }}>{playerName.toUpperCase()}</span>
            </h1>
            <p className="mt-4 text-sm text-white/60">Your team is...</p>
          </div>
        ) : null}

        {phase === 'team' || phase === 'character' || phase === 'ready' ? (
          <div className="w-full text-center animate-rise-in">
            <p className="text-[0.7rem] uppercase tracking-[0.4em] text-white/50">
              Your Team
            </p>
            <div
              className="relative mx-auto mt-4 h-40 w-40 sm:h-52 sm:w-52 overflow-hidden rounded-3xl border"
              style={{ borderColor: `${player.teamColor}80` }}
            >
              <ArtImage
                src={player.teamImage}
                alt={player.teamName}
                accent={player.teamColor}
                label={player.teamName}
                className="h-full w-full object-cover"
              />
              <div
                className="pointer-events-none absolute inset-0"
                style={{
                  boxShadow: `inset 0 0 60px ${player.teamColor}55`,
                }}
              />
            </div>
            <h2
              className="mt-4 font-display text-4xl sm:text-5xl tracking-wide"
              style={{ color: player.teamColor }}
            >
              {player.teamName.toUpperCase()}
            </h2>
          </div>
        ) : null}

        {phase === 'character' || phase === 'ready' ? (
          <div
            className="w-full text-center animate-pop-in"
            style={{ animationDelay: '0.05s' }}
          >
            <p className="mt-2 text-[0.7rem] uppercase tracking-[0.4em] text-white/50">
              Your Character
            </p>
            <div className="relative mx-auto mt-4 h-44 w-44 sm:h-56 sm:w-56 overflow-hidden rounded-full border-2 border-white/15">
              <ArtImage
                src={player.characterImage}
                alt={player.characterName}
                accent={player.teamColor}
                label={player.characterName}
                className="h-full w-full object-cover"
              />
            </div>
            <h3 className="mt-4 font-display text-3xl sm:text-4xl tracking-wide text-white">
              {player.characterName.toUpperCase()}
            </h3>
            {player.characterTagline ? (
              <p className="mt-1 text-xs uppercase tracking-[0.3em] text-white/40">
                {player.characterTagline}
              </p>
            ) : null}
          </div>
        ) : null}

        {phase === 'ready' ? (
          <div className="w-full animate-fade-in" style={{ animationDelay: '0.1s' }}>
            <Button variant="primary" fullWidth onClick={onDone}>
              Start Playing
            </Button>
          </div>
        ) : null}
      </div>
    </Screen>
  )
}
