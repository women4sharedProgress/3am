import { type FormEvent, useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { authResetRequest, authResetConfirm } from '../lib/authApi'

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

export default function ResetPassword() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')

  useEffect(() => {
    const theme = localStorage.getItem('wsp-theme') ?? 'dark'
    document.documentElement.setAttribute('data-theme', theme)
    return () => { document.documentElement.removeAttribute('data-theme') }
  }, [])

  // ── Request state (no token in URL) ──────────────────────────────────────
  const [email,          setEmail]          = useState('')
  const [requestLoading, setRequestLoading] = useState(false)
  const [requestError,   setRequestError]   = useState<string | null>(null)
  const [requestSent,    setRequestSent]    = useState(false)

  async function handleRequestSubmit(e: FormEvent) {
    e.preventDefault()
    const addr = email.trim()
    if (!addr) return
    setRequestError(null)
    setRequestLoading(true)
    const res = await authResetRequest(addr)
    setRequestLoading(false)
    if (res?.ok === false) {
      setRequestError(res.error ?? 'Something went wrong. Please try again.')
      return
    }
    setRequestSent(true)
  }

  // ── Confirm state (token present in URL) ─────────────────────────────────
  const [password,        setPassword]        = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword,    setShowPassword]    = useState(false)
  const [confirmLoading,  setConfirmLoading]  = useState(false)
  const [confirmError,    setConfirmError]    = useState<string | null>(null)
  const [confirmDone,     setConfirmDone]     = useState(false)

  async function handleConfirmSubmit(e: FormEvent) {
    e.preventDefault()
    if (!token) return
    if (password.length < 8) {
      setConfirmError('Password must be at least 8 characters.')
      return
    }
    if (password !== confirmPassword) {
      setConfirmError('Passwords do not match.')
      return
    }
    setConfirmError(null)
    setConfirmLoading(true)
    const res = await authResetConfirm(token, password)
    setConfirmLoading(false)
    if (!res?.ok) {
      setConfirmError(res?.error ?? 'Something went wrong. Please try again.')
      return
    }
    setConfirmDone(true)
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

          {token ? (
            /* ── New password form ─────────────────────────────────────── */
            confirmDone ? (
              <>
                <div className="auth-title">Password updated</div>
                <div className="auth-subtitle">
                  Your password has been changed. You can now sign in with your new password.
                </div>
                <Link to="/login" className="auth-btn" style={{ display: 'block', textDecoration: 'none', textAlign: 'center', marginTop: '.5rem' }}>
                  Sign in
                </Link>
              </>
            ) : (
              <>
                <div className="auth-title">Set new password</div>
                <div className="auth-subtitle">Choose a new password for your account.</div>

                <form onSubmit={handleConfirmSubmit}>
                  {confirmError && (
                    <div className="auth-notice auth-notice-error">{confirmError}</div>
                  )}

                  <div className="auth-field">
                    <label className="auth-label" htmlFor="new-password">New password</label>
                    <div className="auth-input-wrap">
                      <input
                        id="new-password"
                        className="auth-input"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                        autoFocus
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        disabled={confirmLoading}
                      />
                      <button
                        type="button"
                        className="auth-eye-btn"
                        onClick={() => setShowPassword(v => !v)}
                        tabIndex={-1}
                        aria-label={showPassword ? 'Hide' : 'Show'}
                      >
                        {showPassword ? <EyeOff /> : <Eye />}
                      </button>
                    </div>
                  </div>

                  <div className="auth-field">
                    <label className="auth-label" htmlFor="confirm-password">Confirm password</label>
                    <div className="auth-input-wrap">
                      <input
                        id="confirm-password"
                        className="auth-input"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                        value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                        disabled={confirmLoading}
                      />
                    </div>
                  </div>

                  <button
                    className="auth-btn"
                    type="submit"
                    disabled={confirmLoading || !password || !confirmPassword}
                  >
                    {confirmLoading ? 'Saving…' : 'Set new password'}
                  </button>
                </form>
              </>
            )
          ) : (
            /* ── Email request form ────────────────────────────────────── */
            requestSent ? (
              <>
                <div className="auth-title">Check your email</div>
                <div className="auth-subtitle">
                  If an account exists for <strong>{email}</strong>, we sent a reset link.
                  It expires in 1 hour. Check your spam folder if you don't see it.
                </div>
                <div className="auth-footer">
                  <button
                    type="button"
                    className="auth-footer-link"
                    onClick={() => { setRequestSent(false); setEmail('') }}
                  >
                    Try a different email
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="auth-title">Reset password</div>
                <div className="auth-subtitle">
                  Enter the email address on your account and we'll send you a reset link.
                </div>

                <form onSubmit={handleRequestSubmit}>
                  {requestError && (
                    <div className="auth-notice auth-notice-error">{requestError}</div>
                  )}

                  <div className="auth-field">
                    <label className="auth-label" htmlFor="email">Email address</label>
                    <input
                      id="email"
                      className="auth-input"
                      type="email"
                      autoComplete="email"
                      autoFocus
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      disabled={requestLoading}
                    />
                  </div>

                  <button
                    className="auth-btn"
                    type="submit"
                    disabled={requestLoading || !email.trim()}
                  >
                    {requestLoading ? 'Sending…' : 'Send reset link'}
                  </button>
                </form>

                <div className="auth-footer">
                  <Link to="/login">Back to sign in</Link>
                </div>
              </>
            )
          )}
        </div>
      </div>
    </>
  )
}
