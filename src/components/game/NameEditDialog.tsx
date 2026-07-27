import { useEffect, useState } from 'react'
import { Button } from '@/components/shared/Button'

export interface NameEditDialogProps {
  open: boolean
  initialName: string
  onCancel: () => void
  onConfirm: (name: string) => Promise<void>
}

const MAX_NAME = 24

/** Edit display name only. Team/character are never editable. */
export function NameEditDialog({
  open,
  initialName,
  onCancel,
  onConfirm,
}: NameEditDialogProps) {
  const [name, setName] = useState(initialName)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setName(initialName)
      setError(null)
      setBusy(false)
    }
  }, [open, initialName])

  if (!open) return null

  const submit = async () => {
    const trimmed = name.trim()
    if (!trimmed) {
      setError('Enter a name.')
      return
    }
    if (trimmed.length > MAX_NAME) {
      setError(`Keep it under ${MAX_NAME} characters.`)
      return
    }
    setBusy(true)
    setError(null)
    try {
      await onConfirm(trimmed)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not update name.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Edit your name"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-fade-in"
        onClick={onCancel}
      />
      <div className="glass-card relative z-10 w-full max-w-sm p-6 animate-rise-in">
        <h2 className="font-display text-2xl tracking-wide text-white">
          Your Name
        </h2>
        <p className="mt-2 text-sm text-white/60">
          You can change how you're called. Your team and character stay locked.
        </p>
        <form
          className="mt-4 flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault()
            void submit()
          }}
        >
          <label htmlFor="edit-name" className="sr-only">
            Name
          </label>
          <input
            id="edit-name"
            type="text"
            inputMode="text"
            autoComplete="off"
            autoCapitalize="words"
            spellCheck={false}
            maxLength={MAX_NAME}
            value={name}
            onChange={(e) => setName(e.target.value)}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? 'edit-name-error' : undefined}
            autoFocus
            className="w-full rounded-2xl bg-white/8 border border-white/15 px-5 py-4 text-lg text-white placeholder-white/40 focus-ring text-center"
          />
          {error ? (
            <p id="edit-name-error" role="alert" className="text-sm text-rose-400 text-center">
              {error}
            </p>
          ) : null}
          <Button type="submit" variant="primary" fullWidth disabled={busy}>
            {busy ? 'Saving…' : 'Save'}
          </Button>
          <Button variant="ghost" fullWidth onClick={onCancel} disabled={busy}>
            Cancel
          </Button>
        </form>
      </div>
    </div>
  )
}
