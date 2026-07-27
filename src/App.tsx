import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { GamePage } from '@/pages/GamePage'

/**
 * Agent 2 owns the contents of these pages. We import them lazily so the
 * participant bundle isn't blocked by stage/admin code, and so the project
 * still builds even while those files are being authored. If a file is
 * missing, the Suspense fallback renders harmlessly instead of crashing.
 */
const ScreenPage = lazy(() =>
  import('@/pages/ScreenPage')
    .then((m) => ({ default: m.default }))
    .catch(() => ({ default: MissingPage('ScreenPage') })),
)
const AdminPage = lazy(() =>
  import('@/pages/AdminPage')
    .then((m) => ({ default: m.default }))
    .catch(() => ({ default: MissingPage('AdminPage') })),
)

function MissingPage(name: string) {
  return function Missing() {
    return (
      <div className="app-backdrop flex-1 flex items-center justify-center p-8">
        <p className="text-white/60 text-center">
          <span className="font-mono text-white">{name}</span> is not yet
          available. It is owned by Agent 2 and will appear here.
        </p>
      </div>
    )
  }
}

function Fallback() {
  return (
    <div className="app-backdrop flex-1 flex items-center justify-center p-8">
      <p className="text-white/50 text-sm animate-pulse">Loading…</p>
    </div>
  )
}

export default function App() {
  return (
    <Suspense fallback={<Fallback />}>
      <Routes>
        <Route path="/" element={<GamePage />} />
        <Route path="/screen" element={<ScreenPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}
