import { useRef, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { feedbackSubmit } from '../lib/authApi'

function BugIcon() {
  return (
    <svg width="52" height="22" viewBox="0 0 76 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        <radialGradient id="fb-b1" cx="40%" cy="35%" r="60%">
          <stop offset="0%" stopColor="#ff9a9a"/><stop offset="100%" stopColor="#cc0000"/>
        </radialGradient>
        <radialGradient id="fb-b2" cx="40%" cy="35%" r="60%">
          <stop offset="0%" stopColor="#74d4fc"/><stop offset="100%" stopColor="#0070c0"/>
        </radialGradient>
        <radialGradient id="fb-b3" cx="40%" cy="35%" r="60%">
          <stop offset="0%" stopColor="#FFE566"/><stop offset="100%" stopColor="#FFC000"/>
        </radialGradient>
      </defs>
      <line x1="16" y1="13" x2="16" y2="1" stroke="#1a1a1a" strokeWidth="1.2" strokeLinecap="round"/>
      <rect x="16" y="1" width="11" height="7" rx="1" fill="#B597D5"/>
      <polygon points="21.5,2 22.09,3.69 23.88,3.73 22.45,4.81 22.97,6.52 21.5,5.5 20.03,6.52 20.55,4.81 19.12,3.73 20.91,3.69" fill="#FFC000"/>
      <ellipse cx="10" cy="24" rx="6.5" ry="4.5" fill="url(#fb-b1)"/>
      <line x1="10" y1="19.5" x2="10" y2="28.5" stroke="#880000" strokeWidth="0.8"/>
      <circle cx="7.8" cy="22.5" r="1.2" fill="#880000"/>
      <circle cx="12.2" cy="22.5" r="1.2" fill="#880000"/>
      <circle cx="8.5" cy="25.5" r="1" fill="#880000"/>
      <circle cx="11.5" cy="25.5" r="1" fill="#880000"/>
      <circle cx="10" cy="17" r="3.5" fill="#1a1a1a"/>
      <circle cx="8.7" cy="16.2" r="1" fill="white"/>
      <circle cx="11.3" cy="16.2" r="1" fill="white"/>
      <circle cx="8.9" cy="16.4" r="0.5" fill="#333"/>
      <circle cx="11.5" cy="16.4" r="0.5" fill="#333"/>
      <path d="M 8.7 18.4 Q 10 19.8 11.3 18.4" stroke="white" strokeWidth="0.8" fill="none" strokeLinecap="round"/>
      <line x1="8.7" y1="13.8" x2="6.5" y2="11" stroke="#333" strokeWidth="0.9" strokeLinecap="round"/>
      <line x1="11.3" y1="13.8" x2="13.5" y2="11" stroke="#333" strokeWidth="0.9" strokeLinecap="round"/>
      <circle cx="6.2" cy="10.7" r="0.8" fill="#333"/>
      <circle cx="13.8" cy="10.7" r="0.8" fill="#333"/>
      <line x1="4.5" y1="22" x2="1.5" y2="20" stroke="#1a1a1a" strokeWidth="0.7" strokeLinecap="round"/>
      <line x1="4.5" y1="24" x2="1.5" y2="24" stroke="#1a1a1a" strokeWidth="0.7" strokeLinecap="round"/>
      <line x1="4.5" y1="26" x2="1.5" y2="28" stroke="#1a1a1a" strokeWidth="0.7" strokeLinecap="round"/>
      <line x1="15.5" y1="22" x2="18.5" y2="20" stroke="#1a1a1a" strokeWidth="0.7" strokeLinecap="round"/>
      <line x1="15.5" y1="24" x2="18.5" y2="24" stroke="#1a1a1a" strokeWidth="0.7" strokeLinecap="round"/>
      <line x1="15.5" y1="26" x2="18.5" y2="28" stroke="#1a1a1a" strokeWidth="0.7" strokeLinecap="round"/>
      <ellipse cx="37" cy="24" rx="6.5" ry="4.5" fill="url(#fb-b2)"/>
      <line x1="37" y1="19.5" x2="37" y2="28.5" stroke="#004a96" strokeWidth="0.8"/>
      <circle cx="34.8" cy="22.5" r="1.2" fill="#004a96"/>
      <circle cx="39.2" cy="22.5" r="1.2" fill="#004a96"/>
      <circle cx="35.5" cy="25.5" r="1" fill="#004a96"/>
      <circle cx="38.5" cy="25.5" r="1" fill="#004a96"/>
      <circle cx="37" cy="17" r="3.5" fill="#E97132"/>
      <circle cx="35.7" cy="16.2" r="1" fill="white"/>
      <circle cx="38.3" cy="16.2" r="1" fill="white"/>
      <circle cx="35.9" cy="16.4" r="0.5" fill="#333"/>
      <circle cx="38.5" cy="16.4" r="0.5" fill="#333"/>
      <path d="M 35.7 18.4 Q 37 19.8 38.3 18.4" stroke="white" strokeWidth="0.8" fill="none" strokeLinecap="round"/>
      <line x1="35.7" y1="13.8" x2="33.5" y2="11" stroke="#E97132" strokeWidth="0.9" strokeLinecap="round"/>
      <line x1="38.3" y1="13.8" x2="40.5" y2="11" stroke="#E97132" strokeWidth="0.9" strokeLinecap="round"/>
      <circle cx="33.2" cy="10.7" r="0.8" fill="#E97132"/>
      <circle cx="40.8" cy="10.7" r="0.8" fill="#E97132"/>
      <line x1="31.5" y1="22" x2="28.5" y2="20" stroke="#0070c0" strokeWidth="0.7" strokeLinecap="round"/>
      <line x1="31.5" y1="24" x2="28.5" y2="24" stroke="#0070c0" strokeWidth="0.7" strokeLinecap="round"/>
      <line x1="31.5" y1="26" x2="28.5" y2="28" stroke="#0070c0" strokeWidth="0.7" strokeLinecap="round"/>
      <line x1="42.5" y1="22" x2="45.5" y2="20" stroke="#0070c0" strokeWidth="0.7" strokeLinecap="round"/>
      <line x1="42.5" y1="24" x2="45.5" y2="24" stroke="#0070c0" strokeWidth="0.7" strokeLinecap="round"/>
      <line x1="42.5" y1="26" x2="45.5" y2="28" stroke="#0070c0" strokeWidth="0.7" strokeLinecap="round"/>
      <ellipse cx="63" cy="24" rx="6.5" ry="4.5" fill="url(#fb-b3)"/>
      <line x1="63" y1="19.5" x2="63" y2="28.5" stroke="#CC9600" strokeWidth="0.8"/>
      <circle cx="60.8" cy="22.5" r="1.2" fill="#CC9600"/>
      <circle cx="65.2" cy="22.5" r="1.2" fill="#CC9600"/>
      <circle cx="61.5" cy="25.5" r="1" fill="#CC9600"/>
      <circle cx="64.5" cy="25.5" r="1" fill="#CC9600"/>
      <circle cx="63" cy="17" r="3.5" fill="#1a1a1a"/>
      <circle cx="61.7" cy="16.2" r="1" fill="white"/>
      <circle cx="64.3" cy="16.2" r="1" fill="white"/>
      <circle cx="61.9" cy="16.4" r="0.5" fill="#333"/>
      <circle cx="64.5" cy="16.4" r="0.5" fill="#333"/>
      <path d="M 61.7 18.4 Q 63 19.8 64.3 18.4" stroke="white" strokeWidth="0.8" fill="none" strokeLinecap="round"/>
      <line x1="61.7" y1="13.8" x2="59.5" y2="11" stroke="#CC9600" strokeWidth="0.9" strokeLinecap="round"/>
      <line x1="64.3" y1="13.8" x2="66.5" y2="11" stroke="#CC9600" strokeWidth="0.9" strokeLinecap="round"/>
      <circle cx="59.2" cy="10.7" r="0.8" fill="#CC9600"/>
      <circle cx="66.8" cy="10.7" r="0.8" fill="#CC9600"/>
      <line x1="57.5" y1="22" x2="54.5" y2="20" stroke="#1a1a1a" strokeWidth="0.7" strokeLinecap="round"/>
      <line x1="57.5" y1="24" x2="54.5" y2="24" stroke="#1a1a1a" strokeWidth="0.7" strokeLinecap="round"/>
      <line x1="57.5" y1="26" x2="54.5" y2="28" stroke="#1a1a1a" strokeWidth="0.7" strokeLinecap="round"/>
      <line x1="68.5" y1="22" x2="71.5" y2="20" stroke="#1a1a1a" strokeWidth="0.7" strokeLinecap="round"/>
      <line x1="68.5" y1="24" x2="71.5" y2="24" stroke="#1a1a1a" strokeWidth="0.7" strokeLinecap="round"/>
      <line x1="68.5" y1="26" x2="71.5" y2="28" stroke="#1a1a1a" strokeWidth="0.7" strokeLinecap="round"/>
    </svg>
  )
}

function parseBrowser(ua: string): string {
  if (/Edg\/(\d+)/.test(ua))     return `Edge ${ua.match(/Edg\/(\d+)/)?.[1] ?? ''}`
  if (/Chrome\/(\d+)/.test(ua))  return `Chrome ${ua.match(/Chrome\/(\d+)/)?.[1] ?? ''}`
  if (/Firefox\/(\d+)/.test(ua)) return `Firefox ${ua.match(/Firefox\/(\d+)/)?.[1] ?? ''}`
  if (/Version\/(\d+).*Safari/i.test(ua)) return `Safari ${ua.match(/Version\/(\d+)/)?.[1] ?? ''}`
  return 'Unknown'
}

function parseOS(ua: string): string {
  if (ua.includes('Windows NT 10.0')) return 'Windows 10/11'
  if (ua.includes('Windows'))         return 'Windows'
  if (ua.includes('Mac OS X'))        return `macOS ${(ua.match(/Mac OS X ([\d_]+)/)?.[1] ?? '').replace(/_/g, '.')}`
  if (ua.includes('Android'))         return `Android ${ua.match(/Android ([\d.]+)/)?.[1] ?? ''}`
  if (ua.includes('iPhone') || ua.includes('iPad')) return 'iOS'
  if (ua.includes('Linux'))           return 'Linux'
  return 'Unknown'
}

export default function FeedbackButton() {
  const { user }                        = useAuth()
  const [show, setShow]                 = useState(false)
  const [text, setText]                 = useState('')
  const [submitting, setSubmitting]     = useState(false)
  const sessionRef                      = useRef(Date.now())

  function handleCancel() { setShow(false); setText('') }

  async function handleSubmit() {
    if (!text.trim() || submitting) return
    setSubmitting(true)
    const ua = navigator.userAgent
    const payload = {
      timestamp:       new Date().toISOString(),
      app_version:     __APP_VERSION__,
      page_route:      window.location.pathname,
      account_tier:    user ? (user.tier ?? 0) : 0,
      user_role:       user ? user.role : 'none',
      theme:           document.documentElement.getAttribute('data-theme') ?? 'dark',
      browser:         parseBrowser(ua),
      os:              parseOS(ua),
      screen_size:     `${window.innerWidth}x${window.innerHeight}`,
      session_minutes: Math.round((Date.now() - sessionRef.current) / 60000),
      active_filters:  null as string | null,
      bills_shown:     null as number | null,
      feedback_text:   text.slice(0, 1000),
    }
    if (import.meta.env.DEV) {
      fetch('/api/feedback-csv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
        .then(res => { if (!res.ok) console.warn('[feedback] CSV write returned', res.status) })
        .catch(err => console.warn('[feedback] CSV endpoint unreachable:', err))
    }
    try {
      const res = await feedbackSubmit(payload)
      if (!res?.ok) console.warn('[feedback] edge function error:', res)
    } catch (err) {
      console.warn('[feedback] edge function failed:', err)
    } finally {
      setSubmitting(false)
      setShow(false)
      setText('')
    }
  }

  return (
    <>
      {show && (
        <div className="home-feedback-card" role="dialog" aria-label="Send feedback" aria-modal="true">
          <textarea
            className="home-feedback-textarea"
            value={text}
            onChange={e => setText(e.target.value.slice(0, 1000))}
            placeholder="What's on your mind? Bug, suggestion, or general feedback..."
            rows={6}
            maxLength={1000}
            autoFocus
          />
          <div className={`home-feedback-countdown${text.length > 900 ? ' home-feedback-countdown--warn' : ''}`}>
            {1000 - text.length} characters remaining
          </div>
          <div className="home-feedback-actions">
            <button className="home-feedback-cancel" onClick={handleCancel}>Cancel</button>
            <button
              className="home-feedback-submit"
              onClick={() => { void handleSubmit() }}
              disabled={!text.trim() || submitting}
            >
              {submitting ? 'Sending…' : 'Submit'}
            </button>
          </div>
        </div>
      )}
      <button className="feedback-btn-sm" aria-label="Send feedback" onClick={() => setShow(f => !f)}>
        <BugIcon />
      </button>
    </>
  )
}
