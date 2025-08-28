import React, { useState } from 'react'
import { api } from '../../api'

export default function Login({ onLogin }){
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState('')

  const submit = async (e) => {
    e.preventDefault()
    try { await api.auth.login(username, password); onLogin?.() } 
    catch (e) { setErr('Échec de connexion') }
  }

  return (
    <form onSubmit={submit} style={{ maxWidth: 320, margin: '80px auto', display:'grid', gap:8 }}>
      <h3>Connexion</h3>
      <input placeholder="Nom d’utilisateur" value={username} onChange={e=>setUsername(e.target.value)} />
      <input type="password" placeholder="Mot de passe" value={password} onChange={e=>setPassword(e.target.value)} />
      <button type="submit">Se connecter</button>
      {err && <div>{err}</div>}
    </form>
  )
}
