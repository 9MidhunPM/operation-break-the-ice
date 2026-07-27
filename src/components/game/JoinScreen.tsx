import { useState } from 'react'
import { Button } from '@/components/shared/Button'
import { BrandHeader } from '@/components/shared/BrandHeader'
import { Screen } from '@/components/shared/Screen'
import { ApiError } from '@/lib/api'

export interface JoinScreenProps {
  onJoin: () => Promise<void>
}

/** Landing: a single "Join Game" button that claims a slot from the server. */
export function JoinScreen({ onJoin }: JoinScreenProps) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleJoin = async () => {
    setBusy(true)
    setError(null)
    try {
      await onJoin()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not join. Try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Screen center>
      <div className="flex flex-col items-center gap-8">
        <BrandHeader subtitle="Orientation game" />

        <div className="text-center animate-rise-in" style={{ animationDelay: '0.1s' }}>
          <h1 className="font-display text-4xl sm:text-5xl tracking-wide text-white">
            STEP INTO THE
            <br />
            ARENA
          </h1>
          <p className="mt-3 text-sm text-white/60 max-w-xs mx-auto">
            You'll be assigned a team and a character. Find your teammate, swap
            codes, and lock your alliance.
          </p>
        </div>

        <div className="w-full animate-fade-in" style={{ animationDelay: '0.2s' }}>
          <Button
            variant="primary"
            fullWidth
            disabled={busy}
            onClick={handleJoin}
          >
            {busy ? 'Assigning your character…' : 'Join Game'}
          </Button>
          {error ? (
            <p
              role="alert"
              className="mt-3 text-sm text-rose-400 text-center animate-fade-in"
            >
              {error}
            </p>
          ) : null}
        </div>
      </div>
    </Screen>
  )
}
