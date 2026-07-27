import { useState } from 'react'
import { Button } from '@/components/shared/Button'
import { BrandHeader } from '@/components/shared/BrandHeader'
import { Screen } from '@/components/shared/Screen'

export interface NameEntryProps {
  onSubmit: (name: string) => void
}

const MAX_NAME = 24

/** "WHAT SHOULD WE CALL YOU?" — the only field a junior ever enters. */
export function NameEntry({ onSubmit }: NameEntryProps) {
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)

  const submit = () => {
    const trimmed = name.trim()
    if (!trimmed) {
      setError('Enter a name to continue.')
      return
    }
    if (trimmed.length > MAX_NAME) {
      setError(`Keep it under ${MAX_NAME} characters.`)
      return
    }
    setError(null)
    onSubmit(trimmed)
  }

  return (
    <Screen center>
      <div className="flex flex-col items-center gap-8">
        <BrandHeader subtitle="Welcome to the game" />

        <div className="w-full text-center animate-rise-in" style={{ animationDelay: '0.1s' }}>
          <h1 className="font-display text-4xl sm:text-5xl tracking-wide text-white">
            WHAT SHOULD WE
            <br />
            CALL YOU?
          </h1>
        </div>

        <form
          className="w-full flex flex-col gap-4 animate-rise-in"
          style={{ animationDelay: '0.2s' }}
          onSubmit={(e) => {
            e.preventDefault()
            submit()
          }}
        >
          <label htmlFor="player-name" className="sr-only">
            Your name
          </label>
          <input
            id="player-name"
            type="text"
            inputMode="text"
            autoComplete="off"
            autoCapitalize="words"
            spellCheck={false}
            maxLength={MAX_NAME}
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? 'name-error' : undefined}
            className="w-full rounded-2xl bg-white/8 border border-white/15 px-5 py-4 text-lg text-white placeholder-white/40 focus-ring text-center"
          />
          {error ? (
            <p id="name-error" role="alert" className="text-sm text-rose-400 text-center">
              {error}
            </p>
          ) : null}

          <Button type="submit" variant="primary" fullWidth>
            Enter Game
          </Button>
        </form>
      </div>
    </Screen>
  )
}
