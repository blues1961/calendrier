import React, { useEffect, useState } from 'react'
import AdminLink from './components/AdminLink'
import Login from './components/Auth/Login'
import CalendarBoard from './components/CalendarBoard'
import { api } from './api'
import monSiteSymbol from './assets/mon-site-symbol.png'

const APP_NAME = String(import.meta?.env?.APP_NAME || import.meta?.env?.VITE_APP_NAME || '').trim() || 'Calendrier'

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
    <div className="app-shell">
      <nav className="topbar">
        <div className="topbar__inner">
          <button
            type="button"
            className="btn btn--light topbar__toggle"
            onClick={() => setSidebarOpen(prev => !prev)}
            aria-label={isSidebarOpen ? 'Masquer la liste des calendriers' : 'Afficher la liste des calendriers'}
            aria-expanded={isSidebarOpen}
          >
            ☰
          </button>
          <a
            href="#"
            onClick={e => e.preventDefault()}
            className="brand"
            aria-label={`${APP_NAME} - tableau de bord`}
          >
            <img src={monSiteSymbol} alt="mon-site.ca" className="brand__logo" />
            <span className="brand__name">{APP_NAME}</span>
          </a>
          <div className="topbar__right row">
            <button className="btn btn--light" onClick={() => api.auth.logout()}>Se déconnecter</button>
            <AdminLink />
          </div>
        </div>
      </nav>
      <CalendarBoard sidebarOpen={isSidebarOpen} />
    </div>
  )
}
