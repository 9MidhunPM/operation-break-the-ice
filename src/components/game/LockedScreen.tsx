import type { PlayerSession, Slot } from '@/types/game'
import { ArtImage } from '@/components/shared/ArtImage'
import { Card } from '@/components/shared/Card'
import { Screen } from '@/components/shared/Screen'

export interface LockedScreenProps {
  player: Slot
  session: PlayerSession
  teammate: {
    name: string
    image: string
  } | null
}

/** The satisfying "ALLIANCE LOCKED" experience after pairing. */
export function LockedScreen({ player, teammate }: LockedScreenProps) {
  return (
    <Screen center>
      <div className="flex flex-col items-center gap-6 animate-rise-in">
        <p className="text-[0.7rem] uppercase tracking-[0.5em] text-emerald-400">
          Alliance Locked
        </p>

        <Card glow className="w-full border-emerald-500/20">
          <div className="flex flex-col items-center text-center">
            <h1 className="font-display text-4xl sm:text-5xl tracking-wide text-white">
              PAIR FORMED
            </h1>

            <div className="mt-6 flex items-center justify-center gap-4 sm:gap-6">
              <Avatar
                name={player.characterName}
                image={player.characterImage}
                accent={player.teamColor}
              />
              <span className="font-display text-3xl sm:text-4xl text-emerald-400">
                +
              </span>
              <Avatar
                name={teammate?.name ?? 'Teammate'}
                image={teammate?.image ?? ''}
                accent={player.teamColor}
              />
            </div>

            <h2 className="mt-6 font-display text-2xl sm:text-3xl tracking-wide text-white">
              {player.characterName.toUpperCase()}
              <span className="text-emerald-400"> + </span>
              {(teammate?.name ?? 'TEAMMATE').toUpperCase()}
            </h2>

            <div className="my-5 h-px w-24 bg-white/10" />

            <p className="text-[0.65rem] uppercase tracking-[0.4em] text-white/50">
              Team
            </p>
            <p
              className="font-display text-2xl tracking-wide"
              style={{ color: player.teamColor }}
            >
              {player.teamName.toUpperCase()}
            </p>
          </div>
        </Card>

        <p className="max-w-sm text-center text-sm text-white/70">
          Your alliance is locked. Stay with your team and wait for the next
          instruction.
        </p>
      </div>
    </Screen>
  )
}

function Avatar({ name, image, accent }: { name: string; image: string; accent: string }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="h-24 w-24 sm:h-28 sm:w-28 overflow-hidden rounded-full border-2 border-emerald-400/40 shadow-lg shadow-emerald-900/30">
        <ArtImage src={image} alt={name} accent={accent} label={name} className="h-full w-full object-cover" />
      </div>
      <span className="max-w-[7rem] truncate text-xs text-white/70">{name}</span>
    </div>
  )
}
