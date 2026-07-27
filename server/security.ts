import crypto from 'node:crypto'

export function sha256(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex')
}

export function id(prefix: string): string {
  return `${prefix}_${crypto.randomBytes(10).toString('hex')}`
}

const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
export function pairCode(): string {
  let out = ''
  for (let i = 0; i < 5; i++) out += CODE_ALPHABET[crypto.randomInt(CODE_ALPHABET.length)]
  return out
}

export function safeEqual(a: string, b: string): boolean {
  const aa = Buffer.from(a)
  const bb = Buffer.from(b)
  return aa.length === bb.length && crypto.timingSafeEqual(aa, bb)
}
