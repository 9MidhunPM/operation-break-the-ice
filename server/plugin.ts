import type { Plugin } from 'vite'

let synced=false
export function eventApiPlugin(): Plugin {
  return {
    name:'operation-break-the-ice-api',
    apply:'serve',
    async configureServer(server){
      const [{ api }, { syncSeniorConfig }] = await Promise.all([
        import('./api'),
        import('./seniors'),
      ])
      if(!synced){syncSeniorConfig();synced=true}
      server.middlewares.use('/api',api)
    }
  }
}
