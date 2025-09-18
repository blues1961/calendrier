import React, { useEffect, useState } from 'react';
import AdminLink from './components/AdminLink';
import Login from './components/Auth/Login'
import CalendarBoard from './components/CalendarBoard'
import { api } from './api'

export default function App(){
  const [isAuthed, setAuthed] = useState(!!localStorage.getItem('access'))
  const [isSidebarOpen, setSidebarOpen] = useState(() => (typeof window !== 'undefined' ? window.innerWidth >= 768 : true))
  useEffect(() => {
    const handler = () => setAuthed(!!localStorage.getItem('access'))
    window.addEventListener('storage', handler)
    return () => window.removeEventListener('storage', handler)
  }, [])
  if (!isAuthed) return <Login onLogin={() => setAuthed(true)} />
  return (
    <>
      <nav style={{display:'flex',gap:12,padding:'8px 12px',borderBottom:'1px solid #eee',alignItems:'center'}}>
        <button
          type="button"
          className="btn-secondary"
          onClick={() => setSidebarOpen(prev => !prev)}
          aria-label={isSidebarOpen ? 'Masquer la liste des calendriers' : 'Afficher la liste des calendriers'}
          aria-expanded={isSidebarOpen}
          style={{display:'inline-flex',alignItems:'center',justifyContent:'center',width:36,height:32,padding:0}}
        >
          ☰
        </button>
        <strong style={{marginRight:16}}>Calendrier</strong>
        <div style={{flex:1}} />
        <button className="btn-secondary" onClick={() => api.auth.logout()} style={{marginRight:8}}>Se déconnecter</button>
        <AdminLink />
      </nav>
      <CalendarBoard sidebarOpen={isSidebarOpen} />
    </>
  )
}
