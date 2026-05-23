import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { tierRequestSubmit } from '../lib/authApi'
import { userKey } from '../lib/userKey'
import PageTopBar from '../components/PageTopBar'

// ── Profile / reps snapshot from localStorage ────────────────────────────────

interface ProfileSnapshot {
  street: string; zip: string; state: string; city: string
  congressional_district: string; state_senate_district: string; state_house_district: string
}

function loadProfile(): ProfileSnapshot {
  try {
    const raw = localStorage.getItem(userKey('wsp-profile'))
    if (raw) return JSON.parse(raw)
  } catch { /* ignore */ }
  return { street: '', zip: '', state: '', city: '', congressional_district: '', state_senate_district: '', state_house_district: '' }
}

function hasRepData(): boolean {
  try {
    const raw = localStorage.getItem(userKey('wsp-local-forms'))
    if (!raw) return false
    const forms: Record<string, { name: string }> = JSON.parse(raw)
    return Object.values(forms).some(f => f.name?.trim())
  } catch { return false }
}

function districtFilled(v: string): boolean {
  return v.trim() !== '' // "none" also counts
}

// ── Styles ───────────────────────────────────────────────────────────────────

const wrap: React.CSSProperties = { maxWidth: 640, margin: '0 auto', padding: '0 20px 72px' }

const h1: React.CSSProperties = {
  fontFamily: "'Quicksand', sans-serif", fontSize: 24, fontWeight: 700, color: '#4f4262', marginBottom: 6,
}

const sectionCard: React.CSSProperties = {
  border: '1.5px solid var(--color-border-light)', borderRadius: 12,
  padding: '16px', marginBottom: 16, background: 'var(--color-bg-primary)',
}

const sectionTitle: React.CSSProperties = {
  fontFamily: "'Quicksand', sans-serif", fontSize: 14, fontWeight: 700,
  color: 'var(--color-text-primary)', marginBottom: 12,
}

const body: React.CSSProperties = {
  fontFamily: "'Nunito', sans-serif", fontSize: 13, lineHeight: 1.65, color: 'var(--color-text-secondary)',
}

const CHECK_OK  = { color: '#00B050', marginRight: 6 }
const CHECK_NO  = { color: '#E97132', marginRight: 6 }

function CheckRow({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, marginBottom: 5 }}>
      <span style={ok ? CHECK_OK : CHECK_NO} aria-hidden="true">{ok ? '✓' : '✗'}</span>
      <span style={{ fontFamily: "'Nunito', sans-serif", fontSize: 13, color: ok ? 'var(--color-text-primary)' : '#E97132' }}>{label}</span>
    </div>
  )
}

// ── Tier options ─────────────────────────────────────────────────────────────

const TIER_INFO = [
  {
    tier: 3,
    label: 'Tier 3 — W4SP Verified Identity',
    color: '#1a7a72',
    text: 'Identity verified by W4SP off-platform. Provides access to vetted verification agent tools. Covers W4SP Administration, Elected Officials, Partners, volunteers, and broadcast agents.',
    options: [
      { type: 'verification_volunteer',    label: 'Verification Volunteer',        badge: 'Tier 3v', desc: 'Volunteer to verify bill cards as a trusted community member.' },
      { type: 'broadcast_verifier',        label: 'Broadcast Verifier',            badge: 'Tier 3b', desc: 'Authorized to push verified civic information on behalf of W4SP.' },
      { type: 'elected_official_local',    label: 'Elected Official — Local',      badge: 'Tier 3',  desc: 'Currently serving in a local elected position (city council, county board, etc.).' },
      { type: 'elected_official_state',    label: 'Elected Official — State',      badge: 'Tier 3',  desc: 'Currently serving in a state-level elected or appointed office.' },
      { type: 'elected_official_national', label: 'Elected Official — National',   badge: 'Tier 3',  desc: 'Currently serving in a federal elected or appointed office.' },
    ],
  },
  {
    tier: 4,
    label: 'Tier 4 — Opt-in Data Sharer',
    color: '#4f4262',
    text: 'Requires personal information and at least one opt-in to data sharing. If aggregate opt-in data generates revenue, contributors share in it.',
    options: [
      { type: 'verified_account_tier4', label: 'Verified Account', badge: 'Tier 4', desc: 'Opt in to data sharing to support civic research and unlock full Tier 4 access.' },
    ],
  },
]

const REQUEST_LABELS: Record<string, string> = {
  verification_volunteer:     'Verification Volunteer (Tier 3v)',
  broadcast_verifier:         'Broadcast Verifier (Tier 3b)',
  elected_official_local:     'Elected Official — Local (Tier 3)',
  elected_official_state:     'Elected Official — State (Tier 3)',
  elected_official_national:  'Elected Official — National (Tier 3)',
  verified_account_tier4:     'Verified Account (Tier 4)',
}

function wordCount(text: string) { return text.split(/\s+/).filter(Boolean).length }

// ── Component ─────────────────────────────────────────────────────────────────

export default function AccountTier() {
  const navigate = useNavigate()
  const { user } = useAuth()

  const [profile, setProfile]     = useState<ProfileSnapshot>(() => loadProfile())
  const [hasReps, setHasReps]     = useState(() => hasRepData())

  // Contact info
  const [email,       setEmail]       = useState(() => '')
  const [phone,       setPhone]       = useState('')
  const [libraryCard, setLibraryCard] = useState('')

  // Attestation
  const [attested, setAttested]   = useState(false)

  // Tier selection
  const [expanded, setExpanded]   = useState<number | null>(null)
  const [selected, setSelected]   = useState<string | null>(null)
  const [note, setNote]           = useState('')

  // Submit state
  const [busy, setBusy]           = useState(false)
  const [result, setResult]       = useState<{ ok: boolean; msg: string } | null>(null)
  const [submitted, setSubmitted] = useState<Set<string>>(() => new Set())

  useEffect(() => {
    const theme = localStorage.getItem('wsp-theme') ?? 'dark'
    document.documentElement.setAttribute('data-theme', theme)
    document.documentElement.setAttribute('data-page', 'content')
    return () => {
      document.documentElement.removeAttribute('data-theme')
      document.documentElement.removeAttribute('data-page')
    }
  }, [])

  // Re-read profile when page becomes visible (user may have gone to Profile and come back)
  useEffect(() => {
    function onVisible() {
      if (document.visibilityState === 'visible') {
        setProfile(loadProfile())
        setHasReps(hasRepData())
      }
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [])

  if (!user) {
    return (
      <div style={{ minHeight: '100dvh', background: 'var(--color-bg-secondary)', padding: '60px 20px', textAlign: 'center' }}>
        <PageTopBar />
        <p style={{ ...body, marginTop: 40, color: 'var(--color-text-secondary)' }}>Sign in to request a tier upgrade.</p>
        <button onClick={() => navigate('/login')} style={btnStyle('#4F4262')}>Sign in</button>
      </div>
    )
  }

  // ── Profile completeness checks ──────────────────────────────────────────────
  const checks = useMemo(() => ({
    address:     !!(profile.street.trim() && profile.zip.trim() && profile.state.trim() && profile.city.trim()),
    congDistrict: districtFilled(profile.congressional_district),
    senDistrict:  districtFilled(profile.state_senate_district),
    houseDistrict: districtFilled(profile.state_house_district),
    reps:         hasReps,
  }), [profile, hasReps])

  const profileComplete = Object.values(checks).every(Boolean)
  const contactComplete = email.trim() !== '' || phone.trim() !== '' || libraryCard.trim() !== ''
  const canShowTiers    = profileComplete && contactComplete && attested

  function handleTierClick(tierNum: number) {
    setExpanded(prev => prev === tierNum ? null : tierNum)
    setSelected(null)
    setNote('')
    setResult(null)
  }

  function handleOptionClick(type: string) {
    setSelected(prev => prev === type ? null : type)
    setNote('')
    setResult(null)
  }

  async function handleSubmit() {
    if (!selected || !canShowTiers) return
    setBusy(true)
    setResult(null)
    const res = await tierRequestSubmit(selected, note, email.trim(), phone.trim(), libraryCard.trim() || undefined)
    setBusy(false)
    if (res.ok) {
      setSubmitted(prev => new Set([...prev, selected!]))
      setResult({ ok: true, msg: `Request for "${REQUEST_LABELS[selected]}" submitted. W4SP will review and follow up.` })
      setSelected(null)
      setNote('')
    } else {
      setResult({ ok: false, msg: res.error ?? 'Submission failed.' })
    }
  }

  const words = wordCount(note)

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--color-bg-secondary)', color: 'var(--color-text-primary)', padding: '54px 0 64px' }}>
      <PageTopBar />
      <div style={wrap}>
        <h1 style={h1}>Account Tier</h1>
        <p style={{ ...body, color: 'var(--color-text-tertiary)', marginBottom: 24 }}>
          Current tier: <strong>Tier {user.tier}</strong>.
          Complete the steps below before submitting an upgrade request.
        </p>

        {/* ── Step 1: Profile completeness ── */}
        <div style={{ ...sectionCard, borderColor: profileComplete ? '#00B050' : 'var(--color-border-light)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ ...sectionTitle, marginBottom: 0 }}>
              <span style={{ marginRight: 8, color: profileComplete ? '#00B050' : 'var(--color-text-tertiary)' }}>
                {profileComplete ? '①' : '①'}
              </span>
              Profile &amp; district information
            </div>
            {!profileComplete && (
              <button onClick={() => navigate('/profile')} style={linkBtn}>Fill out profile →</button>
            )}
          </div>

          <div style={{ marginBottom: 10 }}>
            <CheckRow ok={checks.address}      label="Home address (street, city, state, zip)" />
            <CheckRow ok={checks.congDistrict} label="Congressional district (enter 'none' if not applicable)" />
            <CheckRow ok={checks.senDistrict}  label="State senate district (enter 'none' if not applicable)" />
            <CheckRow ok={checks.houseDistrict} label="State house district (enter 'none' if not applicable)" />
          </div>
          <div style={{ marginBottom: 10 }}>
            <CheckRow ok={checks.reps} label="At least one representative entered under Your Representatives" />
            {!checks.reps && (
              <button onClick={() => navigate('/')} style={{ ...linkBtn, marginLeft: 20 }}>Go to Your Representatives →</button>
            )}
          </div>

          {!profileComplete && (
            <p style={{ ...body, color: '#E97132', marginTop: 8, marginBottom: 0 }}>
              Complete all profile fields before proceeding. For district boxes that don't apply to your state, enter <strong>none</strong>.
            </p>
          )}
          {profileComplete && (
            <p style={{ ...body, color: '#00B050', marginTop: 8, marginBottom: 0 }}>Profile and district information complete.</p>
          )}
        </div>

        {/* ── Step 2: Contact verification ── */}
        <div style={{
          ...sectionCard,
          opacity: profileComplete ? 1 : 0.45,
          pointerEvents: profileComplete ? 'auto' : 'none',
          borderColor: contactComplete ? '#00B050' : 'var(--color-border-light)',
        }}>
          <div style={{ ...sectionTitle }}>
            <span style={{ marginRight: 8 }}>②</span>
            Contact information
          </div>
          <p style={{ ...body, marginBottom: 14 }}>
            Provide at least one way W4SP can reach you about your request. This information is self-verified — you are attesting to its accuracy.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div>
              <label style={{ fontFamily: "'Nunito', sans-serif", fontSize: 12, color: 'var(--color-text-tertiary)', display: 'block', marginBottom: 4 }}>
                Email address
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="your@email.com"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={{ fontFamily: "'Nunito', sans-serif", fontSize: 12, color: 'var(--color-text-tertiary)', display: 'block', marginBottom: 4 }}>
                Phone number
              </label>
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="(555) 555-5555"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={{ fontFamily: "'Nunito', sans-serif", fontSize: 12, color: 'var(--color-text-tertiary)', display: 'block', marginBottom: 4 }}>
                Library card number
              </label>
              <input
                value={libraryCard}
                onChange={e => setLibraryCard(e.target.value)}
                placeholder="Optional — provide one of the three"
                style={inputStyle}
              />
            </div>
          </div>
        </div>

        {/* ── Step 3: Self-attestation ── */}
        <div style={{
          ...sectionCard,
          opacity: contactComplete && profileComplete ? 1 : 0.45,
          pointerEvents: contactComplete && profileComplete ? 'auto' : 'none',
          borderColor: attested ? '#00B050' : 'var(--color-border-light)',
        }}>
          <div style={sectionTitle}>
            <span style={{ marginRight: 8 }}>③</span>
            Self-verification
          </div>
          <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', userSelect: 'none' }}>
            <span style={{
              flexShrink: 0, marginTop: 2,
              width: 18, height: 18, borderRadius: 4,
              border: `2px solid ${attested ? '#1a7a72' : 'var(--color-border-light)'}`,
              background: attested ? '#1a7a72' : 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all .15s',
            }}>
              {attested && <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="1.5 6 4.5 9 10.5 3" /></svg>}
            </span>
            <input type="checkbox" checked={attested} onChange={e => setAttested(e.target.checked)} style={{ position: 'absolute', opacity: 0, width: 0 }} />
            <p style={{ ...body, margin: 0 }}>
              I confirm that my home address, district information, and representative entries are complete and accurate to the best of my knowledge.
              I understand this information is self-verified.
            </p>
          </label>
        </div>

        {/* ── Step 4: Tier selection ── */}
        <div style={{ opacity: canShowTiers ? 1 : 0.4, pointerEvents: canShowTiers ? 'auto' : 'none' }}>
          <div style={{ fontFamily: "'Quicksand', sans-serif", fontSize: 14, fontWeight: 700, color: 'var(--color-text-tertiary)', margin: '4px 0 12px' }}>
            <span style={{ marginRight: 8 }}>④</span>
            Select upgrade type
          </div>

          {TIER_INFO.map(info => {
            const isOpen = expanded === info.tier
            return (
              <div key={info.tier} style={{
                border: `1.5px solid ${isOpen ? info.color : 'var(--color-border-light)'}`,
                borderRadius: 12, marginBottom: 14, overflow: 'hidden', transition: 'border-color .2s',
              }}>
                <button
                  onClick={() => handleTierClick(info.tier)}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '14px 16px', background: 'transparent', border: 'none', cursor: 'pointer',
                    textAlign: 'left', gap: 12,
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: "'Quicksand', sans-serif", fontSize: 15, fontWeight: 700, color: info.color, marginBottom: 4 }}>
                      {info.label}
                    </div>
                    <p style={{ ...body, margin: 0 }}>{info.text}</p>
                  </div>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={info.color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                    style={{ flexShrink: 0, transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }}>
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>

                {isOpen && (
                  <div style={{ borderTop: '1px solid var(--color-border-light)', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <p style={{ ...body, fontSize: 12, color: 'var(--color-text-tertiary)', margin: '0 0 2px' }}>Select the role that best describes your request:</p>

                    {info.options.map(opt => {
                      const isDone = submitted.has(opt.type)
                      const isSel  = selected === opt.type
                      return (
                        <div key={opt.type}>
                          <button
                            onClick={() => !isDone && handleOptionClick(opt.type)}
                            disabled={isDone}
                            style={{
                              width: '100%', display: 'flex', alignItems: 'flex-start', gap: 12,
                              padding: '10px 12px', borderRadius: 8,
                              border: `1.5px solid ${isSel ? info.color : 'var(--color-border-light)'}`,
                              background: isSel ? `${info.color}14` : 'var(--color-bg-secondary)',
                              cursor: isDone ? 'default' : 'pointer',
                              opacity: isDone ? 0.5 : 1,
                              textAlign: 'left', transition: 'all .15s',
                            }}
                          >
                            <div style={{
                              width: 18, height: 18, borderRadius: '50%', flexShrink: 0, marginTop: 1,
                              border: `2px solid ${isSel ? info.color : 'var(--color-border-light)'}`,
                              background: isSel ? info.color : 'transparent',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                              {isSel && <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'white' }} />}
                            </div>
                            <div style={{ flex: 1 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2, flexWrap: 'wrap' }}>
                                <span style={{ fontFamily: "'Nunito', sans-serif", fontSize: 14, fontWeight: 700, color: 'var(--color-text-primary)' }}>
                                  {opt.label}
                                </span>
                                <span style={{
                                  fontFamily: "'Quicksand', sans-serif", fontSize: 11, fontWeight: 700,
                                  color: info.color, border: `1px solid ${info.color}`, borderRadius: 20, padding: '1px 7px',
                                }}>{opt.badge}</span>
                                {isDone && <span style={{ fontFamily: "'Nunito', sans-serif", fontSize: 11, color: '#00B050' }}>✓ Submitted</span>}
                              </div>
                              <div style={{ fontFamily: "'Nunito', sans-serif", fontSize: 12, color: 'var(--color-text-tertiary)', lineHeight: 1.5 }}>
                                {opt.desc}
                              </div>
                            </div>
                          </button>

                          {isSel && (
                            <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8, paddingLeft: 2 }}>
                              <div style={{ fontFamily: "'Nunito', sans-serif", fontSize: 12, color: 'var(--color-text-secondary)' }}>
                                Note <span style={{ color: 'var(--color-text-tertiary)' }}>(optional — 50 words max)</span>
                              </div>
                              <textarea
                                value={note}
                                onChange={e => { setNote(e.target.value); setResult(null) }}
                                rows={3}
                                placeholder="Brief context for your request…"
                                style={{
                                  width: '100%', boxSizing: 'border-box',
                                  fontFamily: "'Nunito', sans-serif", fontSize: 13,
                                  padding: '8px 10px', borderRadius: 8,
                                  border: `1.5px solid ${words > 50 ? '#E97132' : 'var(--color-border-light)'}`,
                                  background: 'var(--color-bg-primary)',
                                  color: 'var(--color-text-primary)',
                                  resize: 'vertical', outline: 'none',
                                }}
                              />
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <span style={{ fontFamily: "'Nunito', sans-serif", fontSize: 11, color: words > 50 ? '#E97132' : 'var(--color-text-tertiary)' }}>
                                  {words}/50 words
                                </span>
                                <button
                                  onClick={handleSubmit}
                                  disabled={busy || words > 50}
                                  style={{
                                    ...btnStyle(info.color),
                                    opacity: busy || words > 50 ? 0.6 : 1,
                                    cursor: busy || words > 50 ? 'default' : 'pointer',
                                    marginTop: 0, padding: '7px 20px', fontSize: 13,
                                  }}
                                >
                                  {busy ? 'Submitting…' : 'Submit Request'}
                                </button>
                              </div>
                              {result && (
                                <p style={{ fontFamily: "'Nunito', sans-serif", fontSize: 13, margin: 0, color: result.ok ? '#00B050' : '#E97132' }}>
                                  {result.msg}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })}

                    {result && !selected && (
                      <p style={{ fontFamily: "'Nunito', sans-serif", fontSize: 13, margin: '4px 0 0', color: result.ok ? '#00B050' : '#E97132' }}>
                        {result.msg}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {!canShowTiers && (
          <p style={{ ...body, fontSize: 12, color: 'var(--color-text-tertiary)', marginTop: 4 }}>
            Complete steps ①–③ above to unlock tier selection.
          </p>
        )}

        <p style={{ ...body, fontSize: 12, color: 'var(--color-text-tertiary)', marginTop: 16 }}>
          Requests are reviewed by W4SP administrators. You will be contacted via the email provided above.
        </p>
      </div>
    </div>
  )
}

const linkBtn: React.CSSProperties = {
  fontFamily: "'Nunito', sans-serif", fontSize: 12, fontWeight: 700,
  color: '#4F4262', background: 'none', border: 'none', cursor: 'pointer',
  padding: '2px 0', textDecoration: 'underline',
}

const inputStyle: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box',
  fontFamily: "'Nunito', sans-serif", fontSize: 13,
  padding: '8px 12px', borderRadius: 8,
  border: '1.5px solid var(--color-border-light)',
  background: 'var(--color-bg-secondary)',
  color: 'var(--color-text-primary)',
  outline: 'none',
}

function btnStyle(bg: string): React.CSSProperties {
  return {
    display: 'inline-flex', alignItems: 'center',
    fontFamily: "'Quicksand', sans-serif", fontSize: 14, fontWeight: 700,
    padding: '9px 22px', borderRadius: 20, border: 'none',
    background: bg, color: '#fff',
    cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,.2)',
    marginTop: 8, transition: 'opacity .15s',
  }
}
