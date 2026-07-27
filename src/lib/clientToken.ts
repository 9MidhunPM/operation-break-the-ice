/**
 * Per-browser identity token. NOT auth — it's just a stable client id so the
 * reservation server can recognise "this browser" across refreshes and return
 * the same slot. Stored in localStorage so it survives tab/browser close.
 */
const TOKEN_KEY = 'ieee-orientation-client-token'

/** Generate a RFC-4122-ish v4 UUID without external deps. */
function uuid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  // Fallback for very old browsers.
  return 'xxxxxxxxxxxx4xxxyxxxxxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

/** Return the existing token, or create+persist a fresh one. */
export function getClientToken(): string {
  try {
    let t = localStorage.getItem(TOKEN_KEY)
    if (!t) {
      t = uuid()
      localStorage.setItem(TOKEN_KEY, t)
    }
    return t
  } catch {
    // localStorage unavailable — fall back to an ephemeral in-memory token.
    return (ephemeral ??= uuid())
  }
}

let ephemeral: string | undefined
