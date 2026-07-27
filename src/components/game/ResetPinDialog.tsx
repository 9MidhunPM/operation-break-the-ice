import { useEffect, useState } from 'react'
import { Button } from '@/components/shared/Button'
import { ApiError } from '@/lib/api'

export interface ResetPinDialogProps {
  open: boolean
  onCancel: () => void
  /** Verify PIN + release server-side. Throw on wrong PIN / network error. */
  onConfirm: (pin: string) => Promise<void>
}

/**
 * Reset gate: organiser enters the PIN; on submit the parent verifies it
 * server-side and releases the reservation atomically. Wrong PIN keeps the
 * dialog open with an error.
 */
export function ResetPinDialog({ open, onCancel, onConfirm }: ResetPinDialogProps) {
  const [pin, setPin] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setPin('')
      setError(null)
      setBusy(false)
    }
  }, [open])

  if (!open) return null

  const submit = async () => {
    setBusy(true)
    setError(null)
    try {
      await onConfirm(pin)
    } catch (e) {
      setError(
        e instanceof ApiError && e.status === 403
          ? 'Wrong PIN.'
          : e instanceof ApiError
            ? e.message
            : 'Could not verify PIN.',
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Organiser PIN required"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-fade-in"
        onClick={onCancel}
      />
      <div className="glass-card relative z-10 w-full max-w-sm p-6 animate-rise-in">
        <h2 className="font-display text-2xl tracking-wide text-white">
          Reset Game
        </h2>
        <p className="mt-2 text-sm text-white/70">
          This releases your slot and clears your pairing. Enter the organiser
          PIN to continue.
        </p>
        <form
          className="mt-4 flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault()
            void submit()
          }}
        >
          <label htmlFor="org-pin" className="sr-only">
            Organiser PIN
          </label>
          <input
            id="org-pin"
            type="password"
            inputMode="numeric"
            autoComplete="off"
            placeholder="PIN"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? 'pin-error' : undefined}
            autoFocus
            className="w-full rounded-2xl bg-white/8 border border-white/15 px-5 py-4 text-lg text-white placeholder-white/40 focus-ring text-center tracking-[0.3em]"
          />
          {error ? (
            <p id="pin-error" role="alert" className="text-sm text-rose-400 text-center">
              {error}
            </p>
          ) : null}
          <Button type="submit" variant="danger" fullWidth disabled={busy || pin.length === 0}>
            {busy ? 'Checking…' : 'Reset Game'}
          </Button>
          <Button variant="ghost" fullWidth onClick={onCancel} disabled={busy}>
            Cancel
          </Button>
        </form>
      </div>
    </div>
  )
}
