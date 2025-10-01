import React, { useEffect, useState } from 'react';
import AdminLink from './components/AdminLink';
import Login from './components/Auth/Login'
import CalendarBoard from './components/CalendarBoard'
import { api } from './api'
import monSiteLogo from './assets/mon-site-logo.png'

const APP_NAME = String(import.meta?.env?.APP_NAME || import.meta?.env?.VITE_APP_NAME || '').trim() || 'Calendrier';

export default function App(){
  const [isAuthed, setAuthed] = useState(!!localStorage.getItem('access'))
  const [isSidebarOpen, setSidebarOpen] = useState(() => (typeof window !== 'undefined' ? window.innerWidth >= 768 : true))
  useEffect(() => {
    const handler = () => setAuthed(!!localStorage.getItem('access'))
    window.addEventListener('storage', handler)
    return () => window.removeEventListener('storage', handler)
  }, [])
  if (!isAuthed) return <Login appName={APP_NAME} onLogin={() => setAuthed(true)} />
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
        <a
          href="#"
          onClick={e => { e.preventDefault(); }}
          style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', color: '#111', fontWeight: 700, marginRight: 16 }}
          aria-label={`${APP_NAME} - tableau de bord`}
        >
          <img src={monSiteLogo} alt="mon-site.ca" style={{ height: 28 }} />
          <span>{APP_NAME}</span>
        </a>
        <div style={{flex:1}} />
        <button className="btn-secondary" onClick={() => api.auth.logout()} style={{marginRight:8}}>Se déconnecter</button>
        <AdminLink />
      </nav>
      <CalendarBoard sidebarOpen={isSidebarOpen} />
    </>
  )
}
