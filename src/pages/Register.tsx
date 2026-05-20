import { type FormEvent, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { authRegister } from '../lib/authApi'

function Eye() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
    </svg>
  )
}

function EyeOff() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  )
}

export default function Register() {
  const navigate = useNavigate()

  useEffect(() => {
    const theme = localStorage.getItem('wsp-theme') ?? 'dark'
    document.documentElement.setAttribute('data-theme', theme)
    return () => { document.documentElement.removeAttribute('data-theme') }
  }, [])

  const [username,      setUsername]      = useState('')
  const [password,      setPassword]      = useState('')
  const [passcode,      setPasscode]      = useState('')
  const [email,         setEmail]         = useState('')
  const [loading,       setLoading]       = useState(false)
  const [error,         setError]         = useState<string | null>(null)
  const [showPassword,  setShowPassword]  = useState(false)
  const [showPasscode,  setShowPasscode]  = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const res = await authRegister(
      username.trim(),
      password,
      passcode,
      email.trim() || undefined,
    )
    setLoading(false)

    if (!res.ok) {
      setError(res.error ?? 'Registration failed. Please try again.')
      return
    }

    navigate('/login', { state: { registered: true } })
  }

  return (
    <>
      <button
        onClick={() => navigate('/')}
        style={{
          position: 'fixed', top: 12, left: 12, zIndex: 100,
          background: '#4F4262', color: '#fff',
          border: 'none', borderRadius: 20, padding: '5px 9px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer',
          boxShadow: '0 2px 8px rgba(0,0,0,.25)',
        }}
        aria-label="Go to home"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
          <polyline points="9 22 9 12 15 12 15 22"/>
        </svg>
      </button>
      <div className="auth-page">
      <div className="auth-card">
        <div className="auth-wordmark">Women for Shared Progress</div>
        <div className="auth-title">Create account</div>
        <div className="auth-subtitle">
          Your <strong>passcode</strong> is for everyday sign-in on a recognized device.
          Your <strong>password</strong> is for new devices and sensitive actions.
        </div>

        <form onSubmit={handleSubmit}>
          {error && <div className="auth-notice auth-notice-error">{error}</div>}

          <div className="auth-field">
            <label className="auth-label" htmlFor="reg-username">Username</label>
            <input
              id="reg-username"
              className="auth-input"
              type="text"
              autoComplete="username"
              autoFocus
              placeholder="3–32 characters: letters, numbers, _ -"
              value={username}
              onChange={e => setUsername(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="auth-field">
            <label className="auth-label" htmlFor="reg-password">Password</label>
            <div className="auth-input-wrap">
              <input
                id="reg-password"
                className="auth-input"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                disabled={loading}
              />
              <button
                type="button"
                className="auth-eye-btn"
                onClick={() => setShowPassword(v => !v)}
                tabIndex={-1}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff /> : <Eye />}
              </button>
            </div>
          </div>

          <div className="auth-field">
            <label className="auth-label" htmlFor="reg-passcode">Passcode</label>
            <div className="auth-input-wrap">
              <input
                id="reg-passcode"
                className="auth-input"
                type={showPasscode ? 'text' : 'password'}
                autoComplete="new-password"
                value={passcode}
                onChange={e => setPasscode(e.target.value)}
                disabled={loading}
              />
              <button
                type="button"
                className="auth-eye-btn"
                onClick={() => setShowPasscode(v => !v)}
                tabIndex={-1}
                aria-label={showPasscode ? 'Hide passcode' : 'Show passcode'}
              >
                {showPasscode ? <EyeOff /> : <Eye />}
              </button>
            </div>
          </div>

          <div className="auth-field">
            <label className="auth-label" htmlFor="reg-email">
              Recovery email <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span>
            </label>
            <input
              id="reg-email"
              className="auth-input"
              type="email"
              autoComplete="email"
              placeholder="Used only for account recovery"
              value={email}
              onChange={e => setEmail(e.target.value)}
              disabled={loading}
            />
          </div>

          <button
            className="auth-btn"
            type="submit"
            disabled={loading || !username.trim() || !password || !passcode}
          >
            {loading ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <div className="auth-footer">
          Already have an account?{' '}
          <Link to="/login">Sign in</Link>
        </div>
      </div>
    </div>
    </>
  )
}
