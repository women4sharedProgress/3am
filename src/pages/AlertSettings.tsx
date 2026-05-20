import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ThemeToggle from '../components/ThemeToggle'
import { ISSUE_LABELS } from '../lib/constants'
import { useAuth } from '../contexts/AuthContext'
import { syncAlertSettings, subscribeToPush, unsubscribeFromPush } from '../lib/notificationClient'
import { userKey } from '../lib/userKey'

// ── Types ──────────────────────────────────────────────────────────────
interface AlertConfig {
  enabled:     boolean
  channels:    { inApp: boolean; email: boolean; push: boolean }
  timing:      'morning' | 'evening' | 'both'
  issues:      string[]
  keywords:    string[]
  movement:    { anyBill: boolean; watching: boolean; alerting: boolean }
  actNow:      { urgent: boolean; movingSoon: boolean }
  civicDates:  {
    voterReg:         boolean
    voterRegLeadDays: 7 | 14 | 30
    election:         boolean
    electionLeadDays: 0 | 1 | 7
  }
  visualStyle: 'subtle' | 'standard' | 'bold'
  sound:       'off' | 'soft' | 'standard'
}

const DEFAULT: AlertConfig = {
  enabled:     true,
  channels:    { inApp: true, email: false, push: false },
  timing:      'morning',
  issues:      [],
  keywords:    [],
  movement:    { anyBill: false, watching: true, alerting: true },
  actNow:      { urgent: true, movingSoon: false },
  civicDates:  { voterReg: true, voterRegLeadDays: 14, election: true, electionLeadDays: 1 },
  visualStyle: 'standard',
  sound:       'soft',
}

type PushPermission = 'unsupported' | 'default' | 'granted' | 'denied'

function getPushStatus(): PushPermission {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported'
  return Notification.permission as PushPermission
}

function load(): AlertConfig {
  try {
    const raw = localStorage.getItem(userKey('wsp-alert-settings'))
    if (!raw) return DEFAULT
    const parsed = JSON.parse(raw)
    // migrate old delivery field to channels
    if (parsed.delivery && !parsed.channels) {
      parsed.channels = {
        inApp: parsed.delivery !== 'email',
        email: parsed.delivery === 'email' || parsed.delivery === 'both',
        push:  false,
      }
      delete parsed.delivery
    }
    return { ...DEFAULT, ...parsed }
  } catch { /* ignore */ }
  return DEFAULT
}

// ── Sound preview via Web Audio API ────────────────────────────────────
function playPreview(type: 'soft' | 'standard') {
  try {
    const ctx = new AudioContext()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    if (type === 'soft') {
      osc.type = 'sine'
      osc.frequency.setValueAtTime(880, ctx.currentTime)
      osc.frequency.exponentialRampToValueAtTime(660, ctx.currentTime + 0.3)
      gain.gain.setValueAtTime(0, ctx.currentTime)
      gain.gain.linearRampToValueAtTime(0.18, ctx.currentTime + 0.04)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5)
      osc.start(); osc.stop(ctx.currentTime + 0.5)
    } else {
      osc.type = 'triangle'
      osc.frequency.setValueAtTime(660, ctx.currentTime)
      gain.gain.setValueAtTime(0, ctx.currentTime)
      gain.gain.linearRampToValueAtTime(0.22, ctx.currentTime + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4)
      osc.start(); osc.stop(ctx.currentTime + 0.4)
    }
  } catch { /* AudioContext unavailable */ }
}

// ── Shared sub-components ───────────────────────────────────────────────
function Section({ title, children, dim }: { title: string; children: React.ReactNode; dim?: boolean }) {
  return (
    <div style={{
      background: 'var(--color-card, #2a2840)',
      border: '1px solid var(--color-border-light)',
      borderRadius: 14,
      padding: '18px 18px 20px',
      opacity: dim ? 0.45 : 1,
      pointerEvents: dim ? 'none' : undefined,
      transition: 'opacity .2s',
    }}>
      <div style={{
        fontFamily: "'Quicksand', sans-serif",
        fontSize: 13, fontWeight: 700,
        color: 'var(--color-text-secondary)',
        textTransform: 'uppercase',
        letterSpacing: '.08em',
        marginBottom: 14,
      }}>{title}</div>
      {children}
    </div>
  )
}

function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', userSelect: 'none' }}>
      <span style={{
        display: 'inline-flex', width: 40, height: 22, borderRadius: 11,
        background: on ? '#00B0F0' : 'var(--color-border-light)',
        transition: 'background .18s',
        position: 'relative', flexShrink: 0,
      }}>
        <span style={{
          position: 'absolute', top: 3, left: on ? 21 : 3,
          width: 16, height: 16, borderRadius: '50%',
          background: 'white', transition: 'left .18s',
          boxShadow: '0 1px 4px rgba(0,0,0,.3)',
        }} />
        <input type="checkbox" checked={on} onChange={e => onChange(e.target.checked)}
          style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }} />
      </span>
      <span style={{ fontFamily: "'Nunito', sans-serif", fontSize: 14, color: 'var(--color-text-primary)' }}>{label}</span>
    </label>
  )
}

function RadioGroup<T extends string>({
  options, value, onChange,
}: {
  options: { value: T; label: string; desc?: string }[]
  value: T
  onChange: (v: T) => void
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {options.map(o => (
        <label key={o.value} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', userSelect: 'none' }}>
          <span style={{
            width: 18, height: 18, borderRadius: '50%', flexShrink: 0, marginTop: 1,
            border: `2px solid ${value === o.value ? '#00B0F0' : 'var(--color-border-light)'}`,
            background: value === o.value ? '#00B0F0' : 'transparent',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all .15s',
          }}>
            {value === o.value && <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'white' }} />}
          </span>
          <input type="radio" name={o.value} checked={value === o.value} onChange={() => onChange(o.value)}
            style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }} />
          <div>
            <div style={{ fontFamily: "'Nunito', sans-serif", fontSize: 14, color: 'var(--color-text-primary)' }}>{o.label}</div>
            {o.desc && <div style={{ fontFamily: "'Nunito', sans-serif", fontSize: 12, color: 'var(--color-text-tertiary)', marginTop: 1 }}>{o.desc}</div>}
          </div>
        </label>
      ))}
    </div>
  )
}

function LeadDayPicker<T extends number>({
  label, options, value, onChange,
}: {
  label: string
  options: { value: T; label: string }[]
  value: T
  onChange: (v: T) => void
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
      <span style={{ fontFamily: "'Nunito', sans-serif", fontSize: 13, color: 'var(--color-text-secondary)' }}>{label}</span>
      {options.map(o => (
        <button key={o.value} onClick={() => onChange(o.value)} style={{
          fontFamily: "'Nunito', sans-serif", fontSize: 12, fontWeight: 600,
          padding: '3px 10px', borderRadius: 20,
          border: `1.5px solid ${value === o.value ? '#00B0F0' : 'var(--color-border-light)'}`,
          background: value === o.value ? 'rgba(0,176,240,.15)' : 'transparent',
          color: value === o.value ? '#00B0F0' : 'var(--color-text-tertiary)',
          cursor: 'pointer', transition: 'all .15s',
        }}>{o.label}</button>
      ))}
    </div>
  )
}

// ── Visual preview mocks ────────────────────────────────────────────────
function NotifPreview({ style: visualStyle }: { style: 'subtle' | 'standard' | 'bold' }) {
  if (visualStyle === 'subtle') return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#00B0F0', flexShrink: 0 }} />
      <span style={{ fontFamily: "'Nunito', sans-serif", fontSize: 11, color: 'var(--color-text-secondary)' }}>HB 1234 moved to Committee</span>
    </div>
  )
  if (visualStyle === 'standard') return (
    <div style={{
      background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-light)',
      borderLeft: '3px solid #00B0F0', borderRadius: 7, padding: '6px 10px',
    }}>
      <div style={{ fontFamily: "'Quicksand', sans-serif", fontSize: 11, fontWeight: 700, color: '#00B0F0' }}>Bill update</div>
      <div style={{ fontFamily: "'Nunito', sans-serif", fontSize: 11, color: 'var(--color-text-primary)' }}>HB 1234 moved to Committee</div>
    </div>
  )
  return (
    <div style={{
      background: 'linear-gradient(135deg, #1a2a4a, #0c1844)',
      border: '1px solid #00B0F0', borderRadius: 10, padding: '10px 12px',
    }}>
      <div style={{ fontFamily: "'Quicksand', sans-serif", fontSize: 12, fontWeight: 700, color: '#00B0F0', marginBottom: 2 }}>Bill update · Federal</div>
      <div style={{ fontFamily: "'Nunito', sans-serif", fontSize: 12, color: 'white', fontWeight: 600 }}>HB 1234 moved to Committee</div>
      <div style={{ fontFamily: "'Nunito', sans-serif", fontSize: 11, color: '#b0c0e0', marginTop: 3 }}>Healthcare · Time-sensitive</div>
    </div>
  )
}

// ── Main page ───────────────────────────────────────────────────────────
export default function AlertSettings() {
  const navigate  = useNavigate()
  const { user }  = useAuth()
  const [cfg, setCfg]           = useState<AlertConfig>(load)
  const [kwInput, setKwInput]   = useState('')
  const [pushStatus, setPushStatus] = useState<PushPermission>(getPushStatus)
  const kwRef = useRef<HTMLInputElement>(null)

  const VAPID_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined

  async function handlePushToggle(on: boolean) {
    if (!on) {
      await unsubscribeFromPush()
      patch({ channels: { ...cfg.channels, push: false } })
      return
    }
    if (pushStatus === 'unsupported') return
    if (pushStatus === 'denied') return
    if (pushStatus === 'granted') {
      if (VAPID_KEY) await subscribeToPush(VAPID_KEY)
      patch({ channels: { ...cfg.channels, push: true } })
      return
    }
    // 'default' — request permission
    const result = await Notification.requestPermission()
    setPushStatus(result as PushPermission)
    if (result === 'granted') {
      if (VAPID_KEY) await subscribeToPush(VAPID_KEY)
      patch({ channels: { ...cfg.channels, push: true } })
    }
  }

  useEffect(() => {
    const theme = localStorage.getItem('wsp-theme') ?? 'dark'
    document.documentElement.setAttribute('data-theme', theme)
    document.documentElement.setAttribute('data-page', 'content')
    return () => {
      document.documentElement.removeAttribute('data-theme')
      document.documentElement.removeAttribute('data-page')
    }
  }, [])

  useEffect(() => {
    localStorage.setItem(userKey('wsp-alert-settings'), JSON.stringify(cfg))
    if (user) syncAlertSettings(cfg).catch(() => {})
  }, [cfg, user])

  function patch(partial: Partial<AlertConfig>) {
    setCfg(prev => ({ ...prev, ...partial }))
  }

  function toggleIssue(key: string) {
    setCfg(prev => ({
      ...prev,
      issues: prev.issues.includes(key)
        ? prev.issues.filter(k => k !== key)
        : [...prev.issues, key],
    }))
  }

  function addKeyword() {
    const kw = kwInput.trim()
    if (!kw || cfg.keywords.includes(kw) || cfg.keywords.length >= 10) return
    patch({ keywords: [...cfg.keywords, kw] })
    setKwInput('')
    kwRef.current?.focus()
  }

  function removeKeyword(kw: string) {
    patch({ keywords: cfg.keywords.filter(k => k !== kw) })
  }

  const dim = !cfg.enabled

  return (
    <div style={{
      minHeight: '100dvh',
      background: 'var(--color-bg-secondary)',
      padding: '50px 16px 90px',
      color: 'var(--color-text-primary)',
      fontFamily: "'Nunito', sans-serif",
    }}>

      {/* ── Top bar ── */}
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '8px 12px',
        background: 'var(--color-bg-secondary)',
        borderBottom: '1px solid var(--color-border-light)',
      }}>
        <button onClick={() => navigate('/')} style={{
          background: '#4F4262', color: '#fff', border: 'none', borderRadius: 20,
          padding: '5px 9px', display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,.25)',
        }} aria-label="Go to home">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
            <polyline points="9 22 9 12 15 12 15 22"/>
          </svg>
        </button>
        <ThemeToggle />
      </div>

      <div style={{ maxWidth: 560, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* ── Header ── */}
        <div style={{ marginBottom: 4 }}>
          <h1 style={{ fontFamily: "'Quicksand', sans-serif", fontSize: 28, fontWeight: 700, margin: '0 0 4px', color: 'var(--page-title)' }}>
            Alert Settings
          </h1>
          <p style={{ fontSize: 13, color: 'var(--page-subtitle)', margin: 0, lineHeight: 1.5 }}>
            Control what you get notified about, when, and how.
          </p>
        </div>

        {/* ── Master toggle ── */}
        <div style={{
          background: 'var(--color-card, #2a2840)',
          border: `2px solid ${cfg.enabled ? '#00B0F0' : 'var(--color-border-light)'}`,
          borderRadius: 14, padding: '16px 18px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          transition: 'border-color .2s',
        }}>
          <div>
            <div style={{ fontFamily: "'Quicksand', sans-serif", fontSize: 15, fontWeight: 700, color: 'var(--color-text-primary)' }}>
              Alerts {cfg.enabled ? 'on' : 'off'}
            </div>
            <div style={{ fontFamily: "'Nunito', sans-serif", fontSize: 12, color: 'var(--color-text-tertiary)', marginTop: 2 }}>
              {cfg.enabled ? 'You are receiving alerts based on your settings below.' : 'All alerts are paused. Toggle to resume.'}
            </div>
          </div>
          <Toggle on={cfg.enabled} onChange={v => patch({ enabled: v })} label="" />
        </div>

        {/* ── Delivery ── */}
        <Section title="Delivery" dim={dim}>
          <p style={{ fontFamily: "'Nunito', sans-serif", fontSize: 13, color: 'var(--color-text-secondary)', margin: '0 0 14px', lineHeight: 1.5 }}>
            Choose where your alerts are delivered. You can enable multiple channels at once.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

            <Toggle on={cfg.channels.inApp} label="In-app" onChange={v => patch({ channels: { ...cfg.channels, inApp: v } })} />

            <Toggle on={cfg.channels.email} label="Email" onChange={v => patch({ channels: { ...cfg.channels, email: v } })} />

            {/* Push / phone */}
            <div>
              <Toggle
                on={cfg.channels.push && pushStatus === 'granted'}
                label="Push to phone"
                onChange={handlePushToggle}
              />
              {/* Status feedback */}
              {cfg.channels.push && pushStatus === 'granted' && (
                <div style={{
                  fontFamily: "'Nunito', sans-serif", fontSize: 12,
                  color: '#00B050', marginTop: 6, marginLeft: 50,
                  display: 'flex', alignItems: 'center', gap: 5,
                }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                  Notifications enabled on this device
                </div>
              )}
              {pushStatus === 'denied' && (
                <div style={{
                  fontFamily: "'Nunito', sans-serif", fontSize: 12,
                  color: '#E97132', marginTop: 6, marginLeft: 50, lineHeight: 1.5,
                }}>
                  Notifications are blocked. Open your browser settings and allow notifications for this site, then try again.
                </div>
              )}
              {pushStatus === 'unsupported' && (
                <div style={{
                  fontFamily: "'Nunito', sans-serif", fontSize: 12,
                  color: 'var(--color-text-tertiary)', marginTop: 6, marginLeft: 50,
                }}>
                  Push notifications are not supported on this browser.
                </div>
              )}
              {pushStatus === 'default' && !cfg.channels.push && (
                <div style={{
                  fontFamily: "'Nunito', sans-serif", fontSize: 12,
                  color: 'var(--color-text-tertiary)', marginTop: 6, marginLeft: 50,
                }}>
                  Works on any browser — laptop, phone, or tablet.
                </div>
              )}
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--color-border-light)', paddingTop: 14, marginTop: 16 }}>
            <div style={{ fontFamily: "'Nunito', sans-serif", fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 10 }}>
              Digest timing
            </div>
            <RadioGroup
              value={cfg.timing}
              onChange={v => patch({ timing: v })}
              options={[
                { value: 'morning', label: 'Morning digest', desc: '8:00 AM — start your day informed.' },
                { value: 'evening', label: 'Evening digest', desc: '6:00 PM — review what moved today.' },
                { value: 'both',    label: 'Morning + Evening' },
              ]}
            />
          </div>
        </Section>

        {/* ── Subject matter ── */}
        <Section title="Subject matter" dim={dim}>
          <p style={{ fontFamily: "'Nunito', sans-serif", fontSize: 13, color: 'var(--color-text-secondary)', margin: '0 0 12px', lineHeight: 1.5 }}>
            Get alerts for bills tagged with these topics. Leave all unselected to follow all subjects.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
            {Object.entries(ISSUE_LABELS).map(([key, label]) => {
              const on = cfg.issues.includes(key)
              return (
                <button key={key} onClick={() => toggleIssue(key)} style={{
                  fontFamily: "'Nunito', sans-serif", fontSize: 12, fontWeight: 600,
                  padding: '5px 12px', borderRadius: 20,
                  border: `1.5px solid ${on ? '#00B0F0' : 'var(--color-border-light)'}`,
                  background: on ? 'rgba(0,176,240,.15)' : 'transparent',
                  color: on ? '#00B0F0' : 'var(--color-text-secondary)',
                  cursor: 'pointer', transition: 'all .15s',
                }}>{label}</button>
              )
            })}
          </div>
          {cfg.issues.length === 0 && (
            <p style={{ fontFamily: "'Nunito', sans-serif", fontSize: 12, color: 'var(--color-text-tertiary)', marginTop: 10 }}>
              No topics selected — all subjects included.
            </p>
          )}
        </Section>

        {/* ── Keywords ── */}
        <Section title="Keywords" dim={dim}>
          <p style={{ fontFamily: "'Nunito', sans-serif", fontSize: 13, color: 'var(--color-text-secondary)', margin: '0 0 12px', lineHeight: 1.5 }}>
            Alert when any bill title or description contains these words. Up to 10 keywords.
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              ref={kwRef}
              type="text"
              value={kwInput}
              onChange={e => setKwInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addKeyword()}
              placeholder="Add a keyword…"
              maxLength={40}
              style={{
                flex: 1, fontFamily: "'Nunito', sans-serif", fontSize: 13,
                padding: '7px 12px', borderRadius: 20,
                border: '1.5px solid var(--color-border-light)',
                background: 'var(--color-bg-secondary)',
                color: 'var(--color-text-primary)',
                outline: 'none',
              }}
            />
            <button onClick={addKeyword} disabled={cfg.keywords.length >= 10 || !kwInput.trim()} style={{
              fontFamily: "'Nunito', sans-serif", fontSize: 13, fontWeight: 700,
              padding: '7px 16px', borderRadius: 20,
              border: 'none', background: '#4F4262', color: 'white',
              cursor: cfg.keywords.length >= 10 || !kwInput.trim() ? 'default' : 'pointer',
              opacity: cfg.keywords.length >= 10 || !kwInput.trim() ? 0.5 : 1,
              transition: 'opacity .15s',
            }}>Add</button>
          </div>
          {cfg.keywords.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
              {cfg.keywords.map(kw => (
                <span key={kw} style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  fontFamily: "'Nunito', sans-serif", fontSize: 12, fontWeight: 600,
                  padding: '4px 10px', borderRadius: 20,
                  background: 'var(--color-bg-secondary)',
                  border: '1.5px solid var(--color-border-light)',
                  color: 'var(--color-text-primary)',
                }}>
                  {kw}
                  <button onClick={() => removeKeyword(kw)} style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--color-text-tertiary)', fontSize: 14, lineHeight: 1,
                    padding: 0, display: 'flex', alignItems: 'center',
                  }} aria-label={`Remove keyword ${kw}`}>×</button>
                </span>
              ))}
            </div>
          )}
          <p style={{ fontFamily: "'Nunito', sans-serif", fontSize: 12, color: 'var(--color-text-tertiary)', marginTop: 8, marginBottom: 0 }}>
            {cfg.keywords.length}/10 used
          </p>
        </Section>

        {/* ── Bill movement ── */}
        <Section title="Bill movement" dim={dim}>
          <p style={{ fontFamily: "'Nunito', sans-serif", fontSize: 13, color: 'var(--color-text-secondary)', margin: '0 0 14px', lineHeight: 1.5 }}>
            Get notified when a bill advances to a new stage in the legislative process.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Toggle on={cfg.movement.alerting} label="Bills you've set to Alert"
              onChange={v => patch({ movement: { ...cfg.movement, alerting: v } })} />
            <Toggle on={cfg.movement.watching} label="Bills you're watching"
              onChange={v => patch({ movement: { ...cfg.movement, watching: v } })} />
            <Toggle on={cfg.movement.anyBill} label="Any bill in the tracker"
              onChange={v => patch({ movement: { ...cfg.movement, anyBill: v } })} />
          </div>
        </Section>

        {/* ── Act Now ── */}
        <Section title="Act Now" dim={dim}>
          <p style={{ fontFamily: "'Nunito', sans-serif", fontSize: 13, color: 'var(--color-text-secondary)', margin: '0 0 14px', lineHeight: 1.5 }}>
            Alert when bills hit an urgency threshold — useful for contacting your rep before a vote.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Toggle on={cfg.actNow.urgent} label="Time-sensitive — vote or deadline is imminent"
              onChange={v => patch({ actNow: { ...cfg.actNow, urgent: v } })} />
            <Toggle on={cfg.actNow.movingSoon} label="Moving soon — expected to advance within weeks"
              onChange={v => patch({ actNow: { ...cfg.actNow, movingSoon: v } })} />
          </div>
          <p style={{ fontFamily: "'Nunito', sans-serif", fontSize: 12, color: 'var(--color-text-tertiary)', marginTop: 12, marginBottom: 0, lineHeight: 1.5 }}>
            To snooze or dismiss a specific bill's alerts, open that bill's card and use the Dismiss Until option.
          </p>
        </Section>

        {/* ── Civic dates ── */}
        <Section title="Civic dates" dim={dim}>
          <p style={{ fontFamily: "'Nunito', sans-serif", fontSize: 13, color: 'var(--color-text-secondary)', margin: '0 0 16px', lineHeight: 1.5 }}>
            Stay on top of registration deadlines and election days so you never miss your window to participate.
          </p>

          {/* Voter registration */}
          <div style={{ marginBottom: 16 }}>
            <Toggle on={cfg.civicDates.voterReg} label="Voter registration deadline"
              onChange={v => patch({ civicDates: { ...cfg.civicDates, voterReg: v } })} />
            {cfg.civicDates.voterReg && (
              <LeadDayPicker
                label="Remind me"
                value={cfg.civicDates.voterRegLeadDays}
                onChange={v => patch({ civicDates: { ...cfg.civicDates, voterRegLeadDays: v } })}
                options={[
                  { value: 7,  label: '7 days before' },
                  { value: 14, label: '14 days before' },
                  { value: 30, label: '30 days before' },
                ]}
              />
            )}
          </div>

          {/* Election day */}
          <div>
            <Toggle on={cfg.civicDates.election} label="Election day"
              onChange={v => patch({ civicDates: { ...cfg.civicDates, election: v } })} />
            {cfg.civicDates.election && (
              <LeadDayPicker
                label="Remind me"
                value={cfg.civicDates.electionLeadDays}
                onChange={v => patch({ civicDates: { ...cfg.civicDates, electionLeadDays: v } })}
                options={[
                  { value: 7, label: '1 week before' },
                  { value: 1, label: '1 day before' },
                  { value: 0, label: 'Day of' },
                ]}
              />
            )}
          </div>
        </Section>

        {/* ── Alert style ── */}
        <Section title="Alert style" dim={dim}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Visual style */}
            <div>
              <div style={{ fontFamily: "'Nunito', sans-serif", fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 10 }}>
                How alerts look
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {(['subtle', 'standard', 'bold'] as const).map(s => (
                  <button key={s} onClick={() => patch({ visualStyle: s })} style={{
                    display: 'flex', flexDirection: 'column', gap: 8,
                    background: cfg.visualStyle === s ? 'rgba(0,176,240,.08)' : 'transparent',
                    border: `1.5px solid ${cfg.visualStyle === s ? '#00B0F0' : 'var(--color-border-light)'}`,
                    borderRadius: 10, padding: '10px 12px', cursor: 'pointer', textAlign: 'left',
                    transition: 'all .15s',
                  }}>
                    <div style={{ fontFamily: "'Nunito', sans-serif", fontSize: 13, fontWeight: 700,
                      color: cfg.visualStyle === s ? '#00B0F0' : 'var(--color-text-primary)',
                      textTransform: 'capitalize',
                    }}>{s}</div>
                    <NotifPreview style={s} />
                  </button>
                ))}
              </div>
            </div>

            {/* Sound */}
            <div style={{ borderTop: '1px solid var(--color-border-light)', paddingTop: 14 }}>
              <div style={{ fontFamily: "'Nunito', sans-serif", fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 10 }}>
                Sound
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {([
                  { value: 'off',      label: 'Off',           desc: 'Silent — visual only.' },
                  { value: 'soft',     label: 'Soft chime',    desc: 'Gentle tone, good for quiet environments.' },
                  { value: 'standard', label: 'Standard',      desc: 'Distinct alert sound.' },
                ] as const).map(o => (
                  <div key={o.value} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <label style={{ flex: 1, display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', userSelect: 'none' }}>
                      <span style={{
                        width: 18, height: 18, borderRadius: '50%', flexShrink: 0, marginTop: 1,
                        border: `2px solid ${cfg.sound === o.value ? '#00B0F0' : 'var(--color-border-light)'}`,
                        background: cfg.sound === o.value ? '#00B0F0' : 'transparent',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all .15s',
                      }}>
                        {cfg.sound === o.value && <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'white' }} />}
                      </span>
                      <input type="radio" checked={cfg.sound === o.value} onChange={() => patch({ sound: o.value })}
                        style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }} />
                      <div>
                        <div style={{ fontFamily: "'Nunito', sans-serif", fontSize: 14, color: 'var(--color-text-primary)' }}>{o.label}</div>
                        <div style={{ fontFamily: "'Nunito', sans-serif", fontSize: 12, color: 'var(--color-text-tertiary)', marginTop: 1 }}>{o.desc}</div>
                      </div>
                    </label>
                    {o.value !== 'off' && (
                      <button onClick={() => playPreview(o.value)} style={{
                        fontFamily: "'Nunito', sans-serif", fontSize: 11, fontWeight: 600,
                        padding: '4px 10px', borderRadius: 20,
                        border: '1.5px solid var(--color-border-light)',
                        background: 'transparent', color: 'var(--color-text-tertiary)',
                        cursor: 'pointer',
                      }}>▶ Preview</button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Section>

        {/* ── Save confirmation ── */}
        <p style={{ fontFamily: "'Nunito', sans-serif", fontSize: 12, color: 'var(--color-text-tertiary)', textAlign: 'center', margin: '4px 0' }}>
          Settings save automatically.
        </p>

      </div>
    </div>
  )
}
