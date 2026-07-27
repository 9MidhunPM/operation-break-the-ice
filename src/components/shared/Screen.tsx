import type { ReactNode } from 'react'

export interface ScreenProps {
  children: ReactNode
  /** When true, vertically center content (good for short screens). */
  center?: boolean
}

/**
 * Standard full-viewport participant screen. Adds the cinematic backdrop and
 * a sensible max-width so the experience looks good on phones and on desktop.
 */
export function Screen({ children, center = true }: ScreenProps) {
  return (
    <div className="app-backdrop flex-1 w-full">
      <div
        className={[
          'mx-auto w-full max-w-xl px-4 sm:px-6',
          center ? 'min-h-dvh flex flex-col justify-center py-8' : 'py-8',
        ].join(' ')}
      >
        {children}
      </div>
    </div>
  )
}
