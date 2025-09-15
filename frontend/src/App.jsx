import React, { useEffect, useState } from 'react';
import AdminLink from './components/AdminLink';
import Login from './components/Auth/Login'
import CalendarBoard from './components/CalendarBoard'
import { api } from './api'

export default function App(){
  const [isAuthed, setAuthed] = useState(!!localStorage.getItem('access'))
  useEffect(() => {
    const handler = () => setAuthed(!!localStorage.getItem('access'))
    window.addEventListener('storage', handler)
    return () => window.removeEventListener('storage', handler)
  }, [])
  if (!isAuthed) return <Login onLogin={() => setAuthed(true)} />
  return (
    <>
      <nav style={{display:'flex',gap:12,padding:'8px 12px',borderBottom:'1px solid #eee',alignItems:'center'}}>
        <strong style={{marginRight:16}}>Calendrier</strong>
        <div style={{flex:1}} />
        <button className="btn-secondary" onClick={() => api.auth.logout()} style={{marginRight:8}}>Se déconnecter</button>
        <AdminLink />
      </nav>
      <CalendarBoard />
    </>
  )
}
