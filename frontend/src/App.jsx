import React, { useEffect, useState } from 'react'
import Login from './components/Auth/Login'
import CalendarBoard from './components/CalendarBoard'

export default function App(){
  const [isAuthed, setAuthed] = useState(!!localStorage.getItem('access'))
  useEffect(() => {
    const handler = () => setAuthed(!!localStorage.getItem('access'))
    window.addEventListener('storage', handler)
    return () => window.removeEventListener('storage', handler)
  }, [])
  return isAuthed ? <CalendarBoard/> : <Login onLogin={() => setAuthed(true)} />
}
