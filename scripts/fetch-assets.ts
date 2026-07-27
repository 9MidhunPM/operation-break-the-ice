import { execFile } from 'node:child_process'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { promisify } from 'node:util'

const execFileAsync=promisify(execFile)
const manifestPath=path.resolve('config/assets-sources.json')
const outputRoot=path.resolve('public/assets/characters')
const concurrency=Math.max(1,Math.min(8,Number(process.env.ASSET_FETCH_CONCURRENCY)||4))

interface AssetSource {teamId:string;characterId:string;name:string;imageUrl?:string;thumbnailUrl?:string;sourcePage?:string;error?:string}
interface Manifest {assets:AssetSource[]}

async function download(url:string,file:string){
  const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),12_000)
  try{
    const res=await fetch(url,{signal:controller.signal,headers:{'user-agent':'Mozilla/5.0 (IEEE orientation asset cache)','accept':'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8'}})
    if(!res.ok)throw new Error(`HTTP ${res.status}`)
    const type=res.headers.get('content-type')||''
    if(!type.startsWith('image/'))throw new Error(`not an image (${type||'unknown content type'})`)
    const bytes=new Uint8Array(await res.arrayBuffer())
    if(bytes.byteLength<4_000)throw new Error('image response too small')
    if(bytes.byteLength>12_000_000)throw new Error('image response too large')
    await fs.writeFile(file,bytes)
  }finally{clearTimeout(timer)}
}

async function renderWebp(input:string,output:string,tempDir:string){
  const bg=path.join(tempDir,'bg.png'),fg=path.join(tempDir,'fg.png')
  const source=`${input}[0]`
  await execFileAsync('convert',[source,'-auto-orient','-resize','720x1280^','-gravity','center','-extent','720x1280','-blur','0x22',bg])
  await execFileAsync('convert',[source,'-auto-orient','-resize','680x1120>',fg])
  await execFileAsync('convert',[bg,fg,'-gravity','center','-composite','-strip','-quality','76',output])
}

async function fetchOne(asset:AssetSource){
  const output=path.join(outputRoot,asset.teamId,`${asset.characterId}.webp`)
  try{await fs.access(output);return {status:'cached' as const,asset}}catch{}
  await fs.mkdir(path.dirname(output),{recursive:true})
  const tempDir=await fs.mkdtemp(path.join(os.tmpdir(),'bti-art-'))
  const raw=path.join(tempDir,'source')
  try{
    let last='no source URL'
    for(const url of [asset.imageUrl,asset.thumbnailUrl].filter(Boolean) as string[]){
      try{await download(url,raw);await renderWebp(raw,output,tempDir);return {status:'downloaded' as const,asset}}catch(e){last=e instanceof Error?e.message:String(e)}
    }
    return {status:'failed' as const,asset,error:last}
  }finally{await fs.rm(tempDir,{recursive:true,force:true})}
}

const manifest=JSON.parse(await fs.readFile(manifestPath,'utf8')) as Manifest
let cursor=0,downloaded=0,cached=0,failed=0
const failures:string[]=[]
async function worker(){
  while(true){
    const index=cursor++;if(index>=manifest.assets.length)return
    const result=await fetchOne(manifest.assets[index]!)
    if(result.status==='downloaded')downloaded++
    else if(result.status==='cached')cached++
    else{failed++;failures.push(`${result.asset.teamId}/${result.asset.characterId}: ${result.error}`)}
    const done=downloaded+cached+failed
    if(done%25===0||done===manifest.assets.length)console.log(`assets ${done}/${manifest.assets.length} — downloaded ${downloaded}, cached ${cached}, failed ${failed}`)
  }
}
await Promise.all(Array.from({length:concurrency},()=>worker()))
if(failures.length){console.warn('\nFirst failed assets:');for(const f of failures.slice(0,30))console.warn(`- ${f}`);if(failures.length>30)console.warn(`…and ${failures.length-30} more.`)}
console.log(`\nAsset fetch complete: ${downloaded} downloaded, ${cached} cached, ${failed} failed.`)
