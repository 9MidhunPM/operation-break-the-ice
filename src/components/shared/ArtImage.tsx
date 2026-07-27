import { useEffect, useState } from 'react'

export interface ArtImageProps {
  src: string
  alt: string
  /** Hex accent used for the generated placeholder fallback. */
  accent?: string
  /** Short label rendered inside the placeholder (usually initials/name). */
  label?: string
  className?: string
}

/**
 * Image that degrades gracefully to a generated SVG placeholder when the
 * underlying art file is missing or fails to load. This lets us reference
 * real art paths (`/art/...`) before the files exist, and swap them in later
 * without touching any UI code.
 */
export function ArtImage({
  src,
  alt,
  accent = '#00a9ce',
  label = '',
  className = '',
}: ArtImageProps) {
  const [failed, setFailed] = useState(false)

  // Reset failure state if the src changes (different artwork).
  useEffect(() => {
    setFailed(false)
  }, [src])

  if (failed || !src) {
    const initials = toInitials(label) || '?'
    const placeholder = makePlaceholder(initials, accent)
    return (
      <img
        src={placeholder}
        alt={alt}
        className={className}
        loading="lazy"
        decoding="async"
      />
    )
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
    />
  )
}

function toInitials(label: string): string {
  const clean = label.replace(/[^A-Za-z0-9 ]/g, '').trim()
  if (!clean) return ''
  const parts = clean.split(/\s+/).slice(0, 2)
  return parts.map((p) => p[0]?.toUpperCase() ?? '').join('')
}

/**
 * Build a small inline SVG data-URI placeholder using the team accent color,
 * the initials, and a subtle gradient. Looks intentional, not like a broken
 * image.
 */
function makePlaceholder(initials: string, accent: string): string {
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${accent}" stop-opacity="0.55"/>
      <stop offset="100%" stop-color="#05070f" stop-opacity="0.95"/>
    </linearGradient>
    <radialGradient id="r" cx="50%" cy="35%" r="65%">
      <stop offset="0%" stop-color="${accent}" stop-opacity="0.35"/>
      <stop offset="100%" stop-color="#05070f" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="400" height="400" fill="#0a0e1f"/>
  <rect width="400" height="400" fill="url(#g)"/>
  <rect width="400" height="400" fill="url(#r)"/>
  <circle cx="200" cy="150" r="70" fill="${accent}" fill-opacity="0.18"/>
  <text x="200" y="225" font-family="'Bebas Neue', Impact, sans-serif" font-size="120" font-weight="700"
        fill="#ffffff" text-anchor="middle" letter-spacing="4">${escapeXml(initials)}</text>
</svg>`
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}

function escapeXml(s: string): string {
  return s.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;'
      case '>': return '&gt;'
      case '&': return '&amp;'
      case "'": return '&apos;'
      case '"': return '&quot;'
      default: return c
    }
  })
}
