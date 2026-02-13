import React, { useState } from 'react'
import { api } from '../../api'
import monSiteSymbol from '../../assets/mon-site-symbol.png'

export default function Login({ onLogin, appName = 'Calendrier' }){
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState('')

  const submit = async (e) => {
    e.preventDefault()
    setErr('')
    try { await api.auth.login(username, password); onLogin?.() }
    catch (e) { setErr('Échec de connexion') }
  }

  return (
    <div className="page login-page">
      <main className="login-card">
        <div className="login-head">
          <img src={monSiteSymbol} alt="mon-site.ca" className="login-logo" />
          {appName && <h1 className="login-title">{appName}</h1>}
          <p className="login-sub">Connexion</p>
        </div>
        <form onSubmit={submit} className="login-form">
          <label className="login-label">
            <span>Nom d’utilisateur</span>
            <input
              className="input"
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="Identifiant"
              required
            />
          </label>
          <label className="login-label">
            <span>Mot de passe</span>
            <input
              className="input"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Mot de passe"
              required
            />
          </label>
          <button type="submit" className="btn btn--light btn--block">
            Se connecter
          </button>
          {err && (
            <div role="alert" className="form-error">
              {err}
            </div>
          )}
        </form>
      </main>
    </div>
  )
}
