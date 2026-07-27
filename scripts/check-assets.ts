import fs from 'node:fs'
import path from 'node:path'
import { TEAMS } from '../server/catalog'

const missing: Array<{ team: string; character: string; expected: string }> = []
let present = 0

for (const team of TEAMS) {
  for (const character of team.characters) {
    if (!character.image) continue
    const expected = path.resolve('public', character.image.replace(/^\//, ''))
    if (fs.existsSync(expected)) present++
    else missing.push({ team: team.name, character: character.name, expected: path.relative(process.cwd(), expected) })
  }
}

console.log(`Character artwork: ${present} present, ${missing.length} missing, ${present + missing.length} configured.`)
if (missing.length) {
  console.log('\nMissing artwork uses the built-in cinematic fallback, so the app remains functional.')
  console.log('First 25 missing files:')
  for (const item of missing.slice(0, 25)) console.log(`- ${item.team} / ${item.character}: ${item.expected}`)
  if (missing.length > 25) console.log(`…and ${missing.length - 25} more.`)
}
