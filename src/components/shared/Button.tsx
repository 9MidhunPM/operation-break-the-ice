import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  fullWidth?: boolean
  children: ReactNode
}

const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-gradient-to-b from-ieee-accent to-cyan-600 text-white shadow-lg shadow-cyan-900/40 hover:from-cyan-400 hover:to-ieee-accent active:translate-y-px',
  secondary:
    'bg-white/10 text-white border border-white/15 hover:bg-white/15 active:translate-y-px',
  ghost: 'bg-transparent text-white/80 hover:bg-white/10 hover:text-white',
  danger:
    'bg-gradient-to-b from-rose-600 to-rose-700 text-white shadow-lg shadow-rose-900/40 hover:from-rose-500 hover:to-rose-600 active:translate-y-px',
  success:
    'bg-gradient-to-b from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-900/40 hover:from-emerald-400 hover:to-emerald-500 active:translate-y-px',
}

export function Button({
  variant = 'primary',
  fullWidth = false,
  className = '',
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      className={[
        'inline-flex items-center justify-center gap-2 rounded-2xl px-6 py-4',
        'font-semibold tracking-wide text-base sm:text-lg',
        'min-h-[56px] transition-all duration-150',
        'disabled:opacity-40 disabled:cursor-not-allowed disabled:active:translate-y-0',
        'focus-ring',
        VARIANTS[variant],
        fullWidth ? 'w-full' : '',
        className,
      ].join(' ')}
      {...rest}
    >
      {children}
    </button>
  )
}
