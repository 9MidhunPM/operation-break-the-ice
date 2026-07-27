import type { Plugin } from 'vite'
import type { PreviewServer } from 'vite'
import type { ViteDevServer } from 'vite'
import { api } from './api'

/**
 * Vite plugin that mounts the reservation API onto the dev server at `/api/*`.
 *
 * This is what makes `npm run dev` serve BOTH the React app (with HMR) and the
 * backend on a single port — no second process, no CORS, same origin.
 */
export function reservationApiPlugin(): Plugin {
  return {
    name: 'ieee-reservation-api',
    configureServer(server: ViteDevServer) {
      server.middlewares.use('/api', api)
    },
    configurePreviewServer(server: PreviewServer) {
      server.middlewares.use('/api', api)
    },
  }
}
