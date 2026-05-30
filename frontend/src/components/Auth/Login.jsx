import React, { useState } from 'react'
import { api } from '../../api'
import monSiteLogo from '../../assets/mon-site-logo.png'
import ThemeToggle from '../ThemeToggle'

export default function Login({ onLogin, appName = 'Calendrier', theme = 'dark', onThemeChange }){
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
    <section className="login-shell">
      <article className="login-card">
        <div className="login-head">
          <img className="login-logo" src={monSiteLogo} alt="mon-site.ca" />
          <ThemeToggle
            theme={theme}
            onChange={onThemeChange}
            className="login-theme-toggle"
          />
        </div>
        <p className="eyebrow">{appName}</p>
        <h1>Connexion</h1>
        <p className="hero-copy">
          Accès privé aux calendriers, événements et anniversaires.
        </p>
        {err ? <div role="alert" className="status-banner error">{err}</div> : null}
        <form onSubmit={submit} className="data-form">
          <label>
            Nom d&apos;utilisateur
            <input
              className="input"
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              autoComplete="username"
              required
            />
          </label>
          <label>
            Mot de passe
            <input
              className="input"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </label>
          <button type="submit" className="primary-button">
            Se connecter
          </button>
        </form>
      </article>
    </section>
  )
}
