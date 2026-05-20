import { type FormEvent, useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { authCheck } from '../lib/authApi'

type Step = 'username' | 'credential'

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

export default function Login() {
  const { user, ready, signIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    const theme = localStorage.getItem('wsp-theme') ?? 'dark'
    document.documentElement.setAttribute('data-theme', theme)
    return () => { document.documentElement.removeAttribute('data-theme') }
  }, [])

  // Redirect if already signed in
  useEffect(() => {
    if (ready && user) navigate('/', { replace: true })
  }, [ready, user, navigate])

  const [step,        setStep]        = useState<Step>('username')
  const [username,    setUsername]    = useState('')
  const [credential,  setCredential]  = useState('')
  const [mode,        setMode]        = useState<'passcode' | 'password'>('password')
  const [locked,      setLocked]      = useState(false)
  const [usePassword, setUsePassword] = useState(false)
  const [remember,    setRemember]    = useState(true)
  const [loading,     setLoading]     = useState(false)
  const [error,       setError]       = useState<string | null>(null)
  const [showCred,    setShowCred]    = useState(false)

  const credentialRef = useRef<HTMLInputElement>(null)

  // Effective mode: locked or "use password" overrides passcode
  const effectiveMode = (locked || usePassword) ? 'password' : mode

  // Check if coming from successful registration
  const justRegistered = (location.state as { registered?: boolean } | null)?.registered

  async function handleUsernameSubmit(e: FormEvent) {
    e.preventDefault()
    const name = username.trim()
    if (!name) return
    setError(null)
    setLoading(true)

    // Cookie is sent automatically by the browser — no token to read from storage
    const res = await authCheck(name)
    setLoading(false)

    if (!res.ok) {
      setError('No account found with that username.')
      return
    }

    setMode(res.mode)
    setLocked(res.locked ?? false)
    setUsePassword(false)
    setCredential('')
    setStep('credential')
    setTimeout(() => credentialRef.current?.focus(), 0)
  }

  async function handleCredentialSubmit(e: FormEvent) {
    e.preventDefault()
    if (!credential) return
    setError(null)
    setLoading(true)

    const result = await signIn(username.trim(), credential, effectiveMode, remember)
    setLoading(false)

    if (!result.ok) {
      if (result.locked) {
        setLocked(true)
        setMode('password')
        setUsePassword(false)
        setError('Account locked after too many wrong passcode attempts. Enter your password to unlock.')
      } else if (result.attempts_remaining !== undefined) {
        setError(`Wrong passcode. ${result.attempts_remaining} attempt${result.attempts_remaining !== 1 ? 's' : ''} remaining before lockout.`)
      } else {
        setError('Incorrect ' + effectiveMode + '. Please try again.')
      }
      setCredential('')
      return
    }

    navigate('/')
  }

  function handleSwitchToPassword() {
    setUsePassword(true)
    setCredential('')
    setTimeout(() => credentialRef.current?.focus(), 0)
  }

  function handleBack() {
    setStep('username')
    setCredential('')
    setError(null)
    setUsePassword(false)
    setLocked(false)
    setShowCred(false)
  }

  if (!ready) return null

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

        {justRegistered && (
          <div className="auth-notice auth-notice-success">
            Account created; sign in below.
          </div>
        )}

        {step === 'username' ? (
          <>
            <div className="auth-title">Sign in</div>
            <div className="auth-subtitle">Enter your username to continue.</div>

            <form onSubmit={handleUsernameSubmit}>
              {error && <div className="auth-notice auth-notice-error">{error}</div>}

              <div className="auth-field">
                <label className="auth-label" htmlFor="username">Username</label>
                <input
                  id="username"
                  className="auth-input"
                  type="text"
                  autoComplete="username"
                  autoFocus
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  disabled={loading}
                />
              </div>

              <button className="auth-btn" type="submit" disabled={loading || !username.trim()} style={{ marginTop: '1.5rem' }}>
                {loading ? 'Checking…' : 'Continue →'}
              </button>
            </form>

            <div className="auth-footer">
              No account?{' '}
              <Link to="/register">Create one</Link>
            </div>
          </>
        ) : (
          <>
            <button className="auth-back" onClick={handleBack} type="button">
              ← Change username
            </button>

            <div className="auth-username-display">
              Signing in as <strong>{username}</strong>
            </div>

            <form onSubmit={handleCredentialSubmit}>
              {locked && !error && (
                <div className="auth-notice auth-notice-warning">
                  Account locked after too many wrong passcode attempts. Enter your password to unlock.
                </div>
              )}
              {error && <div className="auth-notice auth-notice-error">{error}</div>}

              <div className="auth-field">
                <label className="auth-label" htmlFor="credential">
                  {effectiveMode === 'passcode' ? 'Passcode' : 'Password'}
                </label>
                <div className="auth-input-wrap">
                  <input
                    id="credential"
                    ref={credentialRef}
                    className="auth-input"
                    type={showCred ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={credential}
                    onChange={e => setCredential(e.target.value)}
                    disabled={loading}
                  />
                  <button
                    type="button"
                    className="auth-eye-btn"
                    onClick={() => setShowCred(v => !v)}
                    tabIndex={-1}
                    aria-label={showCred ? 'Hide' : 'Show'}
                  >
                    {showCred ? <EyeOff /> : <Eye />}
                  </button>
                </div>
              </div>

              {effectiveMode === 'passcode' && !locked && (
                <div style={{ marginBottom: '.85rem' }}>
                  <button
                    type="button"
                    className="auth-text-link"
                    onClick={handleSwitchToPassword}
                  >
                    Use password instead
                  </button>
                </div>
              )}

              <label className="auth-remember">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={e => setRemember(e.target.checked)}
                />
                Stay signed in for 45 days
              </label>

              <button className="auth-btn" type="submit" disabled={loading || !credential}>
                {loading ? 'Signing in…' : 'Sign in'}
              </button>
            </form>

            <div className="auth-footer">
              No account?{' '}
              <Link to="/register">Create one</Link>
              <br />
              <Link to="/reset-password">Forgot password?</Link>
            </div>
          </>
        )}
      </div>
    </div>
    </>
  )
}
