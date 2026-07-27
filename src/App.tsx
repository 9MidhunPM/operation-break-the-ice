import ParticipantPage from '@/pages/ParticipantPage'
import ScreenPage from '@/pages/ScreenPage'
import AdminPage from '@/pages/AdminPage'

export default function App(){
  const path=window.location.pathname.replace(/\/+$/,'') || '/'
  if(path==='/screen')return <ScreenPage/>
  if(path==='/admin')return <AdminPage/>
  if(path==='/'||path.startsWith('/s/'))return <ParticipantPage/>
  window.history.replaceState(null,'','/')
  return <ParticipantPage/>
}
