import { lazy, Suspense } from 'react'

const ParticipantPage=lazy(()=>import('@/pages/ParticipantPage'))
const ScreenPage=lazy(()=>import('@/pages/ScreenPage'))
const AdminPage=lazy(()=>import('@/pages/AdminPage'))

function Loading(){return <main style={{minHeight:'100vh',display:'grid',placeItems:'center',background:'#05060a',color:'#9da6bb'}}>Connecting…</main>}

export default function App(){
  const path=window.location.pathname.replace(/\/+$/,'')||'/'
  let page:React.ReactNode
  if(path==='/screen')page=<ScreenPage/>
  else if(path==='/admin')page=<AdminPage/>
  else if(path==='/'||path.startsWith('/s/'))page=<ParticipantPage/>
  else{window.history.replaceState(null,'','/');page=<ParticipantPage/>}
  return <Suspense fallback={<Loading/>}>{page}</Suspense>
}
