import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { tierRequestList, tierRequestReview } from '../lib/authApi'
import PageTopBar from '../components/PageTopBar'

interface TierRequest {
  id:            number
  account_id:    string
  username:      string
  request_type:  string
  note:          string | null
  contact_email: string | null
  contact_phone: string | null
  status:        'pending' | 'approved' | 'disapproved'
  created_at:    string
  reviewed_at:   string | null
  reviewed_by:   string | null
}

const REQUEST_LABELS: Record<string, string> = {
  verification_volunteer:     'Verification Volunteer (Tier 3v)',
  broadcast_verifier:         'Broadcast Verifier (Tier 3b)',
  elected_official_local:     'Elected Official — Local (Tier 3)',
  elected_official_state:     'Elected Official — State (Tier 3)',
  elected_official_national:  'Elected Official — National (Tier 3)',
  verified_account_tier4:     'Verified Account (Tier 4)',
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

const wrap: React.CSSProperties = {
  maxWidth: 680,
  margin: '0 auto',
  padding: '0 20px 64px',
}

const h1: React.CSSProperties = {
  fontFamily: "'Quicksand', sans-serif",
  fontSize: 24,
  fontWeight: 700,
  color: '#4f4262',
  marginBottom: 4,
}

const sectionTitle: React.CSSProperties = {
  fontFamily: "'Quicksand', sans-serif",
  fontSize: 13,
  fontWeight: 700,
  color: 'var(--color-text-tertiary)',
  textTransform: 'uppercase',
  letterSpacing: '.8px',
  margin: '24px 0 10px',
}

const TIER_COLORS: Record<string, string> = {
  verification_volunteer:     '#1a7a72',
  broadcast_verifier:         '#1a7a72',
  elected_official_local:     '#1a7a72',
  elected_official_state:     '#1a7a72',
  elected_official_national:  '#1a7a72',
  verified_account_tier4:     '#4f4262',
}

export default function TierRequests() {
  const navigate         = useNavigate()
  const { user }         = useAuth()
  const [requests, setRequests] = useState<TierRequest[]>([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState('')
  const [busy, setBusy]         = useState<number | null>(null)

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
    tierRequestList().then(res => {
      if (res.ok) setRequests(res.requests ?? [])
      else setError(res.error ?? 'Failed to load requests')
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
      setRequests(prev => prev.map(r => r.id === id ? { ...r, status, reviewed_by: user!.username, reviewed_at: new Date().toISOString() } : r))
    }
    setBusy(null)
  }

  const pending     = requests.filter(r => r.status === 'pending')
  const approved    = requests.filter(r => r.status === 'approved')
  const disapproved = requests.filter(r => r.status === 'disapproved')

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--color-bg-secondary)', color: 'var(--color-text-primary)', padding: '54px 0 64px' }}>
      <PageTopBar />
      <div style={wrap}>
        <h1 style={h1}>Tier Upgrade Requests</h1>
        <p style={{ fontFamily: "'Nunito', sans-serif", fontSize: 13, color: 'var(--color-text-tertiary)', marginBottom: 8 }}>
          {requests.length} total · {pending.length} pending
        </p>

        {loading && <p style={{ fontFamily: "'Nunito', sans-serif", fontSize: 14, color: 'var(--color-text-secondary)', marginTop: 24 }}>Loading…</p>}
        {error   && <p style={{ fontFamily: "'Nunito', sans-serif", fontSize: 14, color: '#E97132', marginTop: 24 }}>{error}</p>}

        {!loading && !error && requests.length === 0 && (
          <p style={{ fontFamily: "'Nunito', sans-serif", fontSize: 14, color: 'var(--color-text-tertiary)', marginTop: 32 }}>No requests yet.</p>
        )}

        {pending.length > 0 && (
          <>
            <div style={sectionTitle}>Pending ({pending.length})</div>
            {pending.map(r => <RequestCard key={r.id} req={r} onReview={handleReview} busy={busy === r.id} />)}
          </>
        )}

        {approved.length > 0 && (
          <>
            <div style={sectionTitle}>Approved ({approved.length})</div>
            {approved.map(r => <RequestCard key={r.id} req={r} onReview={handleReview} busy={busy === r.id} />)}
          </>
        )}

        {disapproved.length > 0 && (
          <>
            <div style={sectionTitle}>Disapproved ({disapproved.length})</div>
            {disapproved.map(r => <RequestCard key={r.id} req={r} onReview={handleReview} busy={busy === r.id} />)}
          </>
        )}
      </div>
    </div>
  )
}

function RequestCard({
  req,
  onReview,
  busy,
}: {
  req: TierRequest
  onReview: (id: number, status: 'approved' | 'disapproved' | 'pending') => void
  busy: boolean
}) {
  const color     = TIER_COLORS[req.request_type] ?? '#4f4262'
  const label     = REQUEST_LABELS[req.request_type] ?? req.request_type
  const subdued   = req.status === 'disapproved'

  return (
    <div style={{
      border: `1.5px solid ${req.status === 'pending' ? color : 'var(--color-border-light)'}`,
      borderRadius: 10,
      padding: '14px 16px',
      marginBottom: 10,
      background: 'var(--color-bg-primary)',
      opacity: subdued ? 0.5 : 1,
      transition: 'opacity .2s',
    }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 8 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontFamily: "'Quicksand', sans-serif", fontSize: 15, fontWeight: 700, color: 'var(--color-text-primary)' }}>
              {req.username}
            </span>
            <span style={{
              fontFamily: "'Quicksand', sans-serif", fontSize: 11, fontWeight: 700,
              color: color, border: `1px solid ${color}`, borderRadius: 20, padding: '1px 8px',
            }}>{label}</span>
            <StatusBadge status={req.status} />
          </div>
          <div style={{ fontFamily: "'Nunito', sans-serif", fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 3 }}>
            {fmtDate(req.created_at)}
            {req.reviewed_by && ` · reviewed by ${req.reviewed_by}`}
          </div>
        </div>
      </div>

      {/* Contact info */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: req.note ? 8 : 12 }}>
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
      </div>

      {/* Note */}
      {req.note && (
        <p style={{ fontFamily: "'Nunito', sans-serif", fontSize: 13, color: 'var(--color-text-secondary)', margin: '0 0 12px', lineHeight: 1.6, borderLeft: `3px solid var(--color-border-light)`, paddingLeft: 10 }}>
          {req.note}
        </p>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {req.status !== 'approved' && (
          <ActionBtn
            label="Approve"
            color="#00B050"
            disabled={busy}
            onClick={() => onReview(req.id, 'approved')}
          />
        )}
        {req.status !== 'disapproved' && (
          <ActionBtn
            label="Disapprove"
            color="#E97132"
            disabled={busy}
            onClick={() => onReview(req.id, 'disapproved')}
          />
        )}
        {req.status !== 'pending' && (
          <ActionBtn
            label="Reset to pending"
            color="var(--color-text-tertiary)"
            disabled={busy}
            onClick={() => onReview(req.id, 'pending')}
          />
        )}
      </div>
    </div>
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
        opacity: disabled ? 0.6 : 1,
        transition: 'opacity .15s',
      }}
    >
      {label}
    </button>
  )
}
