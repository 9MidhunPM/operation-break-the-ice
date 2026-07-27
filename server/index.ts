import express from 'express'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { api } from './api'
import { assertSeniorConfigurationReady, syncSeniorConfig } from './seniors'

if ((process.env.ADMIN_PIN || 'change-me-now') === 'change-me-now') {
  throw new Error('ADMIN_PIN must be set to a strong non-default value before starting the production server.')
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
