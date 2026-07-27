import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { TEAMS } from '../server/catalog'

const outPath=path.resolve(process.env.SENIOR_CONFIG_PATH||'./private/seniors.json')
fs.mkdirSync(path.dirname(outPath),{recursive:true})
if(fs.existsSync(outPath)){
  console.error(`${outPath} already exists. Delete/move it deliberately before regenerating.`)
  process.exit(1)
}
const base=(process.env.PUBLIC_BASE_URL||'http://localhost:5173').replace(/\/$/,'')
const seniors=TEAMS.map((team,index)=>{
  const character=team.characters[crypto.randomInt(team.characters.length)]!
  const inviteToken=crypto.randomBytes(24).toString('base64url')
  return {teamId:team.id,characterId:character.id,displayName:`Senior ${String(index+1).padStart(2,'0')}`,inviteToken,clue:'One person in your team is not a junior. Talk to everyone and look for inconsistencies.',photoFile:`${team.id}.jpg`}
})
fs.writeFileSync(outPath,JSON.stringify({seniors},null,2)+'\n',{mode:0o600})
console.log(`Created ${outPath}\n`)
for(const s of seniors) console.log(`${s.teamId.padEnd(22)} ${base}/s/${s.inviteToken}`)
console.log('\nEdit display names, clues, reserved characters and photo filenames before the event.')
