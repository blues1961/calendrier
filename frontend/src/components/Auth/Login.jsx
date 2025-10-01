import React, { useState } from 'react'
import { api } from '../../api'
import monSiteLogo from '../../assets/mon-site-logo.png'

export default function Login({ onLogin, appName = 'Calendrier' }){
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState('')

  const submit = async (e) => {
    e.preventDefault()
    try { await api.auth.login(username, password); onLogin?.() } 
    catch (e) { setErr('Échec de connexion') }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0b1018',
        padding: 24,
      }}
    >
      <form
        onSubmit={submit}
        style={{
          width: '100%',
          maxWidth: 360,
          display: 'grid',
          gap: 16,
          padding: 32,
          borderRadius: 16,
          background: '#151a22',
          color: '#e9edf7',
          border: '1px solid #2c3340',
          boxShadow: '0 16px 48px rgba(0,0,0,.45), inset 0 1px 0 rgba(255,255,255,.03)',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
          <img src={monSiteLogo} alt="mon-site.ca" style={{ height: 54 }} />
          {appName && (
            <h1 style={{ margin: 0, fontSize: 22, textAlign: 'center', color: '#f4f7ff' }}>{appName}</h1>
          )}
          <p style={{ margin: 0, color: '#9aa4ba', fontSize: 14 }}>Connexion</p>
        </div>
        <label style={{ display: 'grid', gap: 6, fontSize: 14 }}>
          <span style={{ color: '#c7d0e2', fontWeight: 600 }}>Nom d’utilisateur</span>
          <input
            type="text"
            value={username}
            onChange={e => setUsername(e.target.value)}
            placeholder="Identifiant"
            required
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: 10,
              border: '1px solid #2f3542',
              background: '#0f1218',
              color: '#e9edf7',
            }}
          />
        </label>
        <label style={{ display: 'grid', gap: 6, fontSize: 14 }}>
          <span style={{ color: '#c7d0e2', fontWeight: 600 }}>Mot de passe</span>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Mot de passe"
            required
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: 10,
              border: '1px solid #2f3542',
              background: '#0f1218',
              color: '#e9edf7',
            }}
          />
        </label>
        <button
          type="submit"
          style={{
            padding: '10px 12px',
            borderRadius: 10,
            border: '1px solid #3a7bff',
            background: '#3f82ff',
            color: '#fff',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Se connecter
        </button>
        {err && (
          <div
            role="alert"
            style={{
              background: 'rgba(200,65,88,.15)',
              border: '1px solid rgba(200,65,88,.4)',
              color: '#ffb3c3',
              borderRadius: 10,
              padding: '8px 10px',
              fontSize: 13,
            }}
          >
            {err}
          </div>
        )}
      </form>
    </div>
  )
}
