import type { HTMLAttributes, ReactNode } from 'react'

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  glow?: boolean
}

export function Card({ children, glow = false, className = '', ...rest }: CardProps) {
  return (
    <div
      className={[
        'glass-card px-5 py-6 sm:px-8 sm:py-8',
        glow ? 'animate-pulse-glow' : '',
        'focus-ring',
        className,
      ].join(' ')}
      {...rest}
    >
      {children}
    </div>
  )
}
