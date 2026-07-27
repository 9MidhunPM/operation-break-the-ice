import { useMemo, useState } from 'react'
import type { CodeCheckResult, PlayerSession, Slot } from '@/types/game'
import type { ClaimResponse } from '@/types/api'
import { slotFromSessionLike } from '@/lib/game'
import { CODE_INDEX } from '@/data/teams'
import { claimSlot, releaseSession, updateName } from '@/lib/api'
import {
  clearSession,
  createSession,
  loadSession,
  saveSession,
  setName as setSessionName,
} from '@/lib/session'
import { Screen } from '@/components/shared/Screen'
import { Button } from '@/components/shared/Button'
import { JoinScreen } from '@/components/game/JoinScreen'
import { NameEntry } from '@/components/game/NameEntry'
import { Reveal } from '@/components/game/Reveal'
import { PlayerCard } from '@/components/game/PlayerCard'
import { LockedScreen } from '@/components/game/LockedScreen'
import { ResetPinDialog } from '@/components/game/ResetPinDialog'
import { NameEditDialog } from '@/components/game/NameEditDialog'

type Stage = 'join' | 'entry' | 'reveal' | 'playing' | 'locked'

/**
 * Top-level participant flow.
 *
 *   join → entry (name) → reveal → playing → (pair) → locked
 *
 * Slot assignment is server-driven (POST /api/claim). Once claimed, the slot is
 * cached in localStorage and team/character never change. Name is editable.
 * Reset is gated behind an organiser PIN (releases the server reservation).
 */
export function GamePage() {
  const [session, setSession] = useState<PlayerSession | null>(() => loadSession())
  const [stage, setStage] = useState<Stage>(() => {
    const existing = loadSession()
    if (!existing) return 'join'
    if (existing.locked) return 'locked'
    return 'playing'
  })

  const [resetOpen, setResetOpen] = useState(false)
  const [editNameOpen, setEditNameOpen] = useState(false)
  const [joinError, setJoinError] = useState<string | null>(null)

  /** Derive the player's Slot from the (cached) session. */
  const slot: Slot | null = useMemo(
    () => (session ? slotFromSessionLike(session) : null),
    [session],
  )

  // ---- JOIN: claim a slot from the server ----------------------------------
  if (stage === 'join' || (!session && stage !== 'entry' && stage !== 'reveal')) {
    return (
      <>
        <JoinScreen
          onJoin={async () => {
            setJoinError(null)
            const claimed: ClaimResponse = await claimSlot()
            // We have a slot but no name yet → go to name entry.
            // Stash a nameless pending slot so NameEntry can complete it.
            const pending = createSession({
              name: '',
              slotId: claimed.slotId,
              teamId: claimed.teamId,
              teamName: claimed.teamName,
              teamImage: claimed.teamImage,
              teamColor: claimed.teamColor,
              characterId: claimed.characterId,
              characterName: claimed.characterName,
              characterImage: claimed.characterImage,
              pairCode: claimed.pairCode,
            })
            // Don't persist until we have a name; keep in state only.
            setSession(pending)
            setStage('entry')
          }}
        />
        {joinError ? (
          <p className="text-center text-sm text-rose-400">{joinError}</p>
        ) : null}
        {/* JoinScreen renders its own errors; this is a safety net */}
      </>
    )
  }

  // ---- Guard: if we somehow have no slot, send back to join ----------------
  if (!slot || !session) {
    return (
      <JoinScreen
        onJoin={async () => {
          const claimed = await claimSlot()
          const pending = createSession({
            name: '',
            slotId: claimed.slotId,
            teamId: claimed.teamId,
            teamName: claimed.teamName,
            teamImage: claimed.teamImage,
            teamColor: claimed.teamColor,
            characterId: claimed.characterId,
            characterName: claimed.characterName,
            characterImage: claimed.characterImage,
            pairCode: claimed.pairCode,
          })
          setSession(pending)
          setStage('entry')
        }}
      />
    )
  }

  // ---- ENTRY: collect name, then persist + reveal --------------------------
  if (stage === 'entry') {
    return (
      <>
        <NameEntry
          onSubmit={(name) => {
            const finalSession = setSessionName(session, name)
            saveSession(finalSession)
            setSession(finalSession)
            // Best-effort: persist name to server too.
            void updateName(name).catch(() => {
              /* non-fatal; local copy is authoritative for the UI */
            })
            setStage('reveal')
          }}
        />
        <ResetFooter onAskReset={() => setResetOpen(true)} />
        <ResetPinDialog
          open={resetOpen}
          onCancel={() => setResetOpen(false)}
          onConfirm={async (pin) => {
            await releaseSession(pin)
            clearSession()
            setSession(null)
            setStage('join')
            setResetOpen(false)
          }}
        />
      </>
    )
  }

  // ---- REVEAL --------------------------------------------------------------
  if (stage === 'reveal') {
    return (
      <>
        <Reveal
          player={slot}
          playerName={session.name}
          onDone={() => setStage('playing')}
        />
        <ResetFooter onAskReset={() => setResetOpen(true)} />
        <ResetPinDialog
          open={resetOpen}
          onCancel={() => setResetOpen(false)}
          onConfirm={async (pin) => {
            await releaseSession(pin)
            clearSession()
            setSession(null)
            setStage('join')
            setResetOpen(false)
          }}
        />
      </>
    )
  }

  // ---- LOCKED --------------------------------------------------------------
  if (stage === 'locked' || session.locked) {
    const teammate = resolveTeammate(session)
    return (
      <>
        <LockedScreen player={slot} session={session} teammate={teammate} />
        <ResetFooter onAskReset={() => setResetOpen(true)} />
        <ResetPinDialog
          open={resetOpen}
          onCancel={() => setResetOpen(false)}
          onConfirm={async (pin) => {
            await releaseSession(pin)
            clearSession()
            setSession(null)
            setStage('join')
            setResetOpen(false)
          }}
        />
      </>
    )
  }

  // ---- PLAYING -------------------------------------------------------------
  return (
    <Screen center={false}>
      <div className="flex flex-col items-stretch gap-4 py-2">
        <PlayerHeader
          name={session.name}
          slot={slot}
          onEditName={() => setEditNameOpen(true)}
        />
        <PlayerCard
          player={slot}
          onLock={(match: Extract<CodeCheckResult, { status: 'match' }>) => {
            const updated: PlayerSession = {
              ...session,
              pairedWithCharacterId: match.characterId,
              pairedWithCode: match.pairCode,
              locked: true,
            }
            saveSession(updated)
            setSession(updated)
            setStage('locked')
          }}
        />
        <ResetFooter onAskReset={() => setResetOpen(true)} centered />

        <NameEditDialog
          open={editNameOpen}
          initialName={session.name}
          onCancel={() => setEditNameOpen(false)}
          onConfirm={async (name) => {
            await updateName(name)
            const updated = setSessionName(session, name)
            saveSession(updated)
            setSession(updated)
            setEditNameOpen(false)
          }}
        />
        <ResetPinDialog
          open={resetOpen}
          onCancel={() => setResetOpen(false)}
          onConfirm={async (pin) => {
            await releaseSession(pin)
            clearSession()
            setSession(null)
            setStage('join')
            setResetOpen(false)
          }}
        />
      </div>
    </Screen>
  )
}

function PlayerHeader({
  name,
  slot,
  onEditName,
}: {
  name: string
  slot: Slot
  onEditName: () => void
}) {
  return (
    <div className="flex items-center justify-between gap-3 animate-fade-in">
      <div className="min-w-0">
        <p className="text-[0.65rem] uppercase tracking-[0.3em] text-white/40">
          Player
        </p>
        <button
          type="button"
          onClick={onEditName}
          className="group flex items-center gap-1.5 focus-ring rounded-md"
          aria-label={`Edit name (${name})`}
        >
          <span className="truncate font-display text-xl tracking-wide text-white">
            {name}
          </span>
          <svg
            viewBox="0 0 24 24"
            className="h-4 w-4 text-white/40 group-hover:text-white/80"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
          </svg>
        </button>
      </div>
      <div className="text-right">
        <p className="text-[0.65rem] uppercase tracking-[0.3em] text-white/40">
          Team
        </p>
        <p
          className="font-display text-sm tracking-wide"
          style={{ color: slot.teamColor }}
        >
          {slot.teamName}
        </p>
      </div>
    </div>
  )
}

function ResetFooter({ onAskReset, centered = false }: { onAskReset: () => void; centered?: boolean }) {
  return (
    <div className={centered ? 'mt-2 flex justify-center' : 'mt-2 flex justify-center'}>
      <Button
        variant="ghost"
        className="!min-h-[40px] !py-2 text-xs"
        onClick={onAskReset}
      >
        Reset my game
      </Button>
    </div>
  )
}

/** Resolve the teammate's display info from a locked session, if possible. */
function resolveTeammate(session: PlayerSession): {
  name: string
  image: string
} | null {
  if (!session.pairedWithCharacterId || !session.pairedWithCode) return null
  const target = CODE_INDEX[session.pairedWithCode.toUpperCase()]
  if (!target) return null
  return {
    name: target.characterName,
    image: target.characterImage,
  }
}
