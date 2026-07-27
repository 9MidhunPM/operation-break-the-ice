import express from 'express'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { api } from './api'
import { assertSeniorConfigurationReady, syncSeniorConfig } from './seniors'

const adminPin=process.env.ADMIN_PIN||''
if (!adminPin || adminPin === 'change-me-now' || adminPin.length < 8) {
  throw new Error('ADMIN_PIN must be set to a strong value of at least 8 characters before starting the production server.')
}
const publicBaseUrl=process.env.PUBLIC_BASE_URL||''
try {
  const parsed=new URL(publicBaseUrl)
  if (!['http:','https:'].includes(parsed.protocol)) throw new Error()
} catch {
  throw new Error('PUBLIC_BASE_URL must be set to the real http(s) URL students will scan.')
}

syncSeniorConfig()
assertSeniorConfigurationReady()
const __dirname=path.dirname(fileURLToPath(import.meta.url))
const app=express()
app.use('/api',api)
app.use(express.static(path.resolve(__dirname,'..','dist'),{maxAge:'1h'}))
app.use((_req,res)=>res.sendFile(path.resolve(__dirname,'..','dist','index.html')))
const port=Number(process.env.PORT)||8080
app.listen(port,()=>console.log(`Operation: Break the Ice listening on :${port}`))
