import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { adminFeedbackList, adminFeedbackComplete, tierRequestList, tierRequestReview, verifierNotesSummary } from '../lib/authApi'
import PageTopBar from '../components/PageTopBar'

// ── Types ─────────────────────────────────────────────────────────────────────
interface FeedbackRow {
  id:             number
  timestamp:      string
  page_route:     string | null
  account_tier:   number | null
  user_role:      string | null
  username:       string | null
  feedback_text:  string
  browser:        string | null
  os:             string | null
  screen_size:    string | null
  active_filters: string | null
  bills_shown:    number | null
  app_version:    string | null
  completed:      boolean
}

interface TierRequest {
  id:                   number
  account_id:           string
  username:             string
  request_type:         string
  note:                 string | null
  contact_email:        string | null
  contact_phone:        string | null
  contact_library_card: string | null
  status:               'pending' | 'approved' | 'disapproved'
  created_at:           string
  reviewed_at:          string | null
  reviewed_by:          string | null
}

// ── Constants ─────────────────────────────────────────────────────────────────
const REQUEST_LABELS: Record<string, string> = {
  verification_volunteer:    'Verification Volunteer (Tier 3v)',
  broadcast_verifier:        'Broadcast Verifier (Tier 3b)',
  elected_official_local:    'Elected Official — Local (Tier 3)',
  elected_official_state:    'Elected Official — State (Tier 3)',
  elected_official_national: 'Elected Official — National (Tier 3)',
  verified_account_tier4:    'Verified Account (Tier 4)',
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
function fmtTime(iso: string) {
  return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

// ── Styles ────────────────────────────────────────────────────────────────────
const wrap: React.CSSProperties      = { maxWidth: 720, margin: '0 auto', padding: '0 20px 80px' }
const pageH1: React.CSSProperties    = { fontFamily: "'Quicksand', sans-serif", fontSize: 24, fontWeight: 700, color: '#4f4262', margin: '0 0 4px' }
const sectionH2: React.CSSProperties = { fontFamily: "'Quicksand', sans-serif", fontSize: 16, fontWeight: 700, color: '#4f4262', margin: '32px 0 10px' }
const divider: React.CSSProperties   = { borderTop: '1px solid var(--color-border-light)', margin: '28px 0 0' }

// ── Component ─────────────────────────────────────────────────────────────────
export default function AdminPanel() {
  const navigate = useNavigate()
  const { user }  = useAuth()

  const [feedback,      setFeedback]      = useState<FeedbackRow[]>([])
  const [requests,      setRequests]      = useState<TierRequest[]>([])
  const [verifierNotes, setVerifierNotes] = useState<Record<number, { username: string; note: string; updated_at: string }[]>>({})
  const [loading,       setLoading]       = useState(true)
  const [error,         setError]         = useState('')
  const [busy,          setBusy]          = useState<number | null>(null)
  const [completing,    setCompleting]    = useState<number | null>(null)
  const [expanded,      setExpanded]      = useState<Set<number>>(new Set())
  const [vnoteCopied,   setVnoteCopied]   = useState<number | null>(null)

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
    if (!user || user.role !== 'admin') return
    Promise.all([adminFeedbackList(), tierRequestList(), verifierNotesSummary()]).then(([fb, tr, vn]) => {
      if (fb.ok) setFeedback(fb.feedback ?? [])
      if (tr.ok) setRequests(tr.requests ?? [])
      if (vn.ok) setVerifierNotes(vn.summary ?? {})
      if (!fb.ok && !tr.ok) setError(fb.error ?? tr.error ?? 'Failed to load')
      setLoading(false)
    })
  }, [user])

  if (!user || user.role !== 'admin') {
    return (
      <div style={{ minHeight: '100dvh', background: 'var(--color-bg-secondary)', padding: '60px 20px', textAlign: 'center' }}>
        <PageTopBar />
        <p style={{ fontFamily: "'Nunito', sans-serif", fontSize: 14, color: 'var(--color-text-secondary)', marginTop: 40 }}>
          Access restricted to administrators.
        </p>
        <button
          onClick={() => navigate('/')}
          style={{ fontFamily: "'Quicksand', sans-serif", fontSize: 14, fontWeight: 700, padding: '9px 22px', borderRadius: 20, border: 'none', background: '#4F4262', color: '#fff', cursor: 'pointer', marginTop: 16 }}
        >Go home</button>
      </div>
    )
  }

  async function handleReview(id: number, status: 'approved' | 'disapproved' | 'pending') {
    setBusy(id)
    const res = await tierRequestReview(id, status)
    if (res.ok) {
      setRequests(prev => prev.map(r => r.id === id
        ? { ...r, status, reviewed_by: user!.username, reviewed_at: new Date().toISOString() }
        : r))
    }
    setBusy(null)
  }

  async function handleComplete(id: number, completed: boolean) {
    setCompleting(id)
    const res = await adminFeedbackComplete(id, completed)
    if (res.ok) {
      setFeedback(prev => prev.map(f => f.id === id ? { ...f, completed } : f))
    }
    setCompleting(null)
  }

  function toggleExpand(id: number) {
    setExpanded(s => {
      const next = new Set(s)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const pending     = requests.filter(r => r.status === 'pending')
  const approved    = requests.filter(r => r.status === 'approved')
  const disapproved = requests.filter(r => r.status === 'disapproved')

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--color-bg-secondary)', color: 'var(--color-text-primary)', padding: '54px 0 64px' }}>
      <PageTopBar />
      <div style={wrap}>

        {/* Page header */}
        <h1 style={pageH1}>Admin Panel</h1>
        <p style={{ fontFamily: "'Nunito', sans-serif", fontSize: 13, color: 'var(--color-text-tertiary)', margin: '0 0 4px' }}>
          {feedback.length} feedback submissions · {requests.length} upgrade requests ({pending.length} pending)
        </p>

        {loading && <p style={{ fontFamily: "'Nunito', sans-serif", fontSize: 14, color: 'var(--color-text-secondary)', marginTop: 28 }}>Loading…</p>}
        {error   && <p style={{ fontFamily: "'Nunito', sans-serif", fontSize: 14, color: '#E97132', marginTop: 28 }}>{error}</p>}

        {/* ── Tier Upgrade Requests ─────────────────────────────────────── */}
        {!loading && (
          <>
            <div style={divider} />
            <h2 style={sectionH2}>Tier Upgrade Requests</h2>

            {requests.length === 0 && (
              <p style={{ fontFamily: "'Nunito', sans-serif", fontSize: 13, color: 'var(--color-text-tertiary)' }}>No requests yet.</p>
            )}

            {pending.length > 0 && (
              <>
                <SectionLabel>Pending ({pending.length})</SectionLabel>
                {pending.map(r => (
                  <RequestCard key={r.id} req={r} onReview={handleReview} busy={busy === r.id} />
                ))}
              </>
            )}
            {approved.length > 0 && (
              <>
                <SectionLabel>Approved ({approved.length})</SectionLabel>
                {approved.map(r => (
                  <RequestCard key={r.id} req={r} onReview={handleReview} busy={busy === r.id} />
                ))}
              </>
            )}
            {disapproved.length > 0 && (
              <>
                <SectionLabel>Disapproved ({disapproved.length})</SectionLabel>
                {disapproved.map(r => (
                  <RequestCard key={r.id} req={r} onReview={handleReview} busy={busy === r.id} />
                ))}
              </>
            )}
          </>
        )}

        {/* ── Feedback ─────────────────────────────────────────────────── */}
        {!loading && (
          <>
            <div style={divider} />
            <h2 style={sectionH2}>User Feedback</h2>

            {feedback.length === 0 && (
              <p style={{ fontFamily: "'Nunito', sans-serif", fontSize: 13, color: 'var(--color-text-tertiary)' }}>No feedback yet.</p>
            )}

            {feedback.map(fb => {
              const open = expanded.has(fb.id)
              return (
                <div key={fb.id} style={{
                  border: `1.5px solid ${fb.completed ? 'var(--color-border-light)' : 'var(--color-border-light)'}`,
                  borderRadius: 10, padding: '12px 14px', marginBottom: 8,
                  background: 'var(--color-bg-primary)',
                  opacity: fb.completed ? 0.5 : 1,
                  transition: 'opacity .2s',
                }}>
                  {/* Top row */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 4 }}>
                        {fb.username && (
                          <span style={{ fontFamily: "'Quicksand', sans-serif", fontSize: 13, fontWeight: 700, color: 'var(--color-text-primary)' }}>
                            {fb.username}
                          </span>
                        )}
                        <span style={{ fontFamily: "'Nunito', sans-serif", fontSize: 11, color: 'var(--color-text-tertiary)' }}>
                          {fmtTime(fb.timestamp)}
                        </span>
                        {fb.page_route && (
                          <span style={{ fontFamily: "'Nunito', sans-serif", fontSize: 11, color: 'var(--color-text-tertiary)', background: 'var(--color-bg-secondary)', padding: '1px 6px', borderRadius: 4 }}>
                            {fb.page_route}
                          </span>
                        )}
                        {fb.account_tier != null && fb.account_tier > 0 && (
                          <span style={{ fontFamily: "'Nunito', sans-serif", fontSize: 11, color: '#4f4262', fontWeight: 700 }}>
                            T{fb.account_tier}
                          </span>
                        )}
                        {fb.completed && (
                          <span style={{ fontFamily: "'Nunito', sans-serif", fontSize: 11, color: '#00B050', fontWeight: 700 }}>
                            ✓ Done
                          </span>
                        )}
                      </div>
                      <p style={{
                        fontFamily: "'Nunito', sans-serif", fontSize: 13,
                        color: 'var(--color-text-primary)', margin: 0, lineHeight: 1.6,
                        display: '-webkit-box', WebkitLineClamp: open ? 'unset' : 3,
                        WebkitBoxOrient: 'vertical', overflow: open ? 'visible' : 'hidden',
                      }}>
                        {fb.feedback_text}
                      </p>
                    </div>
                    <button
                      onClick={() => toggleExpand(fb.id)}
                      style={{ fontFamily: "'Nunito', sans-serif", fontSize: 11, color: 'var(--color-text-tertiary)', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px', flexShrink: 0 }}
                    >
                      {open ? '▲' : '▼'}
                    </button>
                  </div>

                  {/* Actions + meta */}
                  <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                    <button
                      disabled={completing === fb.id}
                      onClick={() => handleComplete(fb.id, !fb.completed)}
                      style={{
                        fontFamily: "'Nunito', sans-serif", fontSize: 12, fontWeight: 700,
                        padding: '4px 12px', borderRadius: 20,
                        border: `1.5px solid ${fb.completed ? 'var(--color-text-tertiary)' : '#00B050'}`,
                        background: 'transparent',
                        color: fb.completed ? 'var(--color-text-tertiary)' : '#00B050',
                        cursor: completing === fb.id ? 'default' : 'pointer',
                        opacity: completing === fb.id ? 0.6 : 1,
                        transition: 'opacity .15s',
                      }}
                    >
                      {fb.completed ? 'Reopen' : 'Mark complete'}
                    </button>

                    {open && (
                      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                        {fb.browser    && <MetaChip label="Browser" value={fb.browser} />}
                        {fb.os         && <MetaChip label="OS" value={fb.os} />}
                        {fb.screen_size && <MetaChip label="Screen" value={fb.screen_size} />}
                        {fb.bills_shown != null && <MetaChip label="Bills" value={String(fb.bills_shown)} />}
                        {fb.app_version && <MetaChip label="Ver" value={fb.app_version} />}
                        {fb.active_filters && <MetaChip label="Filters" value={fb.active_filters} />}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          {/* ── Verifier Notes Summary ─────────────────────────────────── */}
          {Object.keys(verifierNotes).length > 0 && (
            <>
              <div style={divider} />
              <h2 style={sectionH2}>
                Verifier Notes Summary
                <span style={{ fontFamily: "'Nunito', sans-serif", fontSize: 12, fontWeight: 400, color: 'var(--color-text-tertiary)', marginLeft: 8 }}>
                  {Object.values(verifierNotes).reduce((t, ns) => t + ns.length, 0)} notes across {Object.keys(verifierNotes).length} bills
                </span>
              </h2>
              {Object.entries(verifierNotes).map(([billIdStr, notes]) => {
                const billId = Number(billIdStr)
                const isCopied = vnoteCopied === billId
                async function copyBillNotes() {
                  const text = notes.map(n =>
                    `[${n.username} · ${new Date(n.updated_at).toLocaleDateString()}]\n${n.note}`
                  ).join('\n\n───\n\n')
                  await navigator.clipboard.writeText(text)
                  setVnoteCopied(billId)
                  setTimeout(() => setVnoteCopied(null), 1600)
                }
                return (
                  <div key={billId} style={{
                    marginBottom: 16, padding: '10px 14px',
                    border: '1px solid var(--color-border-light)',
                    borderRadius: 10, background: 'var(--color-bg-primary)',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <span style={{ fontFamily: "'Quicksand', sans-serif", fontWeight: 700, fontSize: 13, color: 'var(--color-text-primary)' }}>
                        Bill #{billId} · {notes.length} note{notes.length !== 1 ? 's' : ''}
                      </span>
                      <button
                        onClick={copyBillNotes}
                        style={{
                          fontSize: 11, padding: '3px 10px', borderRadius: 20,
                          border: '1px solid var(--color-border-medium)',
                          background: 'var(--color-bg-secondary)', cursor: 'pointer',
                          color: 'var(--color-text-secondary)',
                          fontFamily: "'Quicksand', sans-serif", fontWeight: 600,
                        }}
                      >
                        {isCopied ? '✓ Copied' : 'Copy'}
                      </button>
                    </div>
                    {notes.map((n, i) => (
                      <div key={i} style={{ marginBottom: 8, fontSize: 12 }}>
                        <div style={{
                          fontFamily: "'Quicksand', sans-serif", fontWeight: 700,
                          fontSize: 11, color: 'var(--color-text-tertiary)',
                          textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 2,
                        }}>
                          {n.username} · {new Date(n.updated_at).toLocaleDateString()}
                        </div>
                        <div style={{
                          color: 'var(--color-text-secondary)',
                          lineHeight: 1.55, whiteSpace: 'pre-wrap',
                          padding: '6px 8px', background: 'var(--color-bg-secondary)',
                          borderRadius: 6,
                        }}>
                          {n.note}
                        </div>
                      </div>
                    ))}
                  </div>
                )
              })}
            </>
          )}
          </>
        )}
      </div>
    </div>
  )
}

// ── Sub-components ─────────────────────────────────────────────────────────────
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontFamily: "'Quicksand', sans-serif", fontSize: 12, fontWeight: 700,
      color: 'var(--color-text-tertiary)', textTransform: 'uppercase',
      letterSpacing: '.7px', margin: '14px 0 8px',
    }}>
      {children}
    </div>
  )
}

function MetaChip({ label, value }: { label: string; value: string }) {
  return (
    <span style={{ fontFamily: "'Nunito', sans-serif", fontSize: 11, color: 'var(--color-text-tertiary)' }}>
      <span style={{ fontWeight: 700 }}>{label}:</span> {value}
    </span>
  )
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; color: string }> = {
    pending:     { label: 'Pending',     color: '#F0A500' },
    approved:    { label: 'Approved',    color: '#00B050' },
    disapproved: { label: 'Disapproved', color: '#E97132' },
  }
  const s = map[status] ?? { label: status, color: 'var(--color-text-tertiary)' }
  return (
    <span style={{ fontFamily: "'Nunito', sans-serif", fontSize: 11, fontWeight: 700, color: s.color }}>
      {s.label}
    </span>
  )
}

function RequestCard({
  req, onReview, busy,
}: {
  req: TierRequest
  onReview: (id: number, status: 'approved' | 'disapproved' | 'pending') => void
  busy: boolean
}) {
  const label   = REQUEST_LABELS[req.request_type] ?? req.request_type
  const subdued = req.status === 'disapproved'

  return (
    <div style={{
      border: `1.5px solid ${req.status === 'pending' ? '#1a7a72' : 'var(--color-border-light)'}`,
      borderRadius: 10, padding: '13px 15px', marginBottom: 9,
      background: 'var(--color-bg-primary)',
      opacity: subdued ? 0.5 : 1, transition: 'opacity .2s',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 8 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontFamily: "'Quicksand', sans-serif", fontSize: 14, fontWeight: 700, color: 'var(--color-text-primary)' }}>
              {req.username}
            </span>
            <span style={{ fontFamily: "'Quicksand', sans-serif", fontSize: 11, fontWeight: 700, color: '#1a7a72', border: '1px solid #1a7a72', borderRadius: 20, padding: '1px 8px' }}>
              {label}
            </span>
            <StatusBadge status={req.status} />
          </div>
          <div style={{ fontFamily: "'Nunito', sans-serif", fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 3 }}>
            {fmtDate(req.created_at)}
            {req.reviewed_by && ` · reviewed by ${req.reviewed_by}`}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: req.note ? 8 : 10 }}>
        {req.contact_email && (
          <span style={{ fontFamily: "'Nunito', sans-serif", fontSize: 12, color: 'var(--color-text-tertiary)' }}>
            ✉ {req.contact_email}
          </span>
        )}
        {req.contact_phone && (
          <span style={{ fontFamily: "'Nunito', sans-serif", fontSize: 12, color: 'var(--color-text-tertiary)' }}>
            ☎ {req.contact_phone}
          </span>
        )}
        {req.contact_library_card && (
          <span style={{ fontFamily: "'Nunito', sans-serif", fontSize: 12, color: 'var(--color-text-tertiary)' }}>
            🏛 {req.contact_library_card}
          </span>
        )}
      </div>

      {req.note && (
        <p style={{ fontFamily: "'Nunito', sans-serif", fontSize: 13, color: 'var(--color-text-secondary)', margin: '0 0 10px', lineHeight: 1.6, borderLeft: '3px solid var(--color-border-light)', paddingLeft: 10 }}>
          {req.note}
        </p>
      )}

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {req.status !== 'approved' && (
          <ActionBtn label="Approve"          color="#00B050"                    disabled={busy} onClick={() => onReview(req.id, 'approved')} />
        )}
        {req.status !== 'disapproved' && (
          <ActionBtn label="Disapprove"       color="#E97132"                    disabled={busy} onClick={() => onReview(req.id, 'disapproved')} />
        )}
        {req.status !== 'pending' && (
          <ActionBtn label="Reset to pending" color="var(--color-text-tertiary)" disabled={busy} onClick={() => onReview(req.id, 'pending')} />
        )}
      </div>
    </div>
  )
}

function ActionBtn({ label, color, disabled, onClick }: { label: string; color: string; disabled: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        fontFamily: "'Nunito', sans-serif", fontSize: 12, fontWeight: 700,
        padding: '5px 14px', borderRadius: 20,
        border: `1.5px solid ${color}`,
        background: 'transparent', color,
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.6 : 1, transition: 'opacity .15s',
      }}
    >
      {label}
    </button>
  )
}
