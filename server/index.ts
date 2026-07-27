import http from 'node:http'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import fs from 'node:fs'
import { api } from './api'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DIST_DIR = path.resolve(__dirname, '..', 'dist')
const PORT = Number(process.env.PORT) || 8080

const app = http.createServer((req, res) => {
  // API first.
  if (req.url?.startsWith('/api')) {
    // Strip /api because the Express app's routes are declared without it...
    // Actually we mount express at /api, but plain http doesn't strip. We pass
    // through by rewriting url to what Express expects. Express mounted via
    // .use on a sub-path isn't available here, so handle by prefixing logic:
    return apiHandler(req, res)
  }
  // Static files.
  return serveStatic(req, res)
})

/**
 * Bridge incoming Node request into the Express app. Express is itself a Node
 * request listener, so we can call it directly — but its routes are declared
 * WITHOUT the `/api` prefix (e.g. app.post('/claim')). We therefore strip the
 * `/api` prefix before handing off.
 */
function apiHandler(req: http.IncomingMessage, res: http.ServerResponse) {
  const original = req.url ?? ''
  req.url = original.replace(/^\/api/, '') || '/'
  return api(req as never, res as never, () => {
    res.statusCode = 404
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ error: 'Not found' }))
  })
}

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
}

function serveStatic(req: http.IncomingMessage, res: http.ServerResponse) {
  let urlPath = decodeURIComponent((req.url ?? '/').split('?')[0]!)
  if (urlPath === '/') urlPath = '/index.html'

  // Try the exact file, then SPA fallback to index.html.
  const tryFiles = [urlPath, '/index.html']
  for (const candidate of tryFiles) {
    const filePath = path.join(DIST_DIR, candidate)
    if (!filePath.startsWith(DIST_DIR)) continue // path traversal guard
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      const ext = path.extname(filePath).toLowerCase()
      res.setHeader('Content-Type', MIME[ext] ?? 'application/octet-stream')
      res.statusCode = candidate === '/index.html' && urlPath !== '/index.html' ? 200 : 200
      fs.createReadStream(filePath).pipe(res)
      return
    }
  }

  res.statusCode = 404
  res.setHeader('Content-Type', 'text/plain')
  res.end('Not found')
}

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`\n  IEEE Orientation Game — production server`)
  // eslint-disable-next-line no-console
  console.log(`  ➜  http://localhost:${PORT}/  (serving dist/ + /api)\n`)
})
