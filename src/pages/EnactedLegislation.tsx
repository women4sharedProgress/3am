import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { ActiveFilters, Bill } from '../types/bill'
import { useBills } from '../hooks/useBills'
import { filterBills, getEnactedDate } from '../lib/billUtils'
import { generateHtml } from '../lib/generateHtml'
import FilterGroups from '../components/FilterGroups'
import BillCard from '../components/BillCard'
import ThemeToggle from '../components/ThemeToggle'

const SESSIONS = [
  { value: 'this-session', label: 'This Session' },
  { value: 'last-session', label: 'Last Session' },
  { value: 'last-2-years', label: 'Last 2 Years' },
  { value: 'last-5-years', label: 'Last 5 Years' },
]

function sessionRange(s: string): [Date, Date] {
  const now = new Date()
  switch (s) {
    case 'this-session': return [new Date('2025-01-01T00:00:00'), now]
    case 'last-session': return [new Date('2023-01-01T00:00:00'), new Date('2024-12-31T23:59:59')]
    case 'last-2-years': return [new Date(now.getFullYear() - 2, now.getMonth(), now.getDate()), now]
    default:             return [new Date(now.getFullYear() - 5, now.getMonth(), now.getDate()), now]
  }
}

const DEFAULT_FILTERS: ActiveFilters = {
  level: 'all', timing: 'enacted', impact: 'all', issue: 'all',
  policy: 'all', office: 'all', city: 'all', search: '',
}

const BTN: React.CSSProperties = {
  background: '#00B050', color: '#fff',
  border: 'none', borderRadius: 20, padding: '5px 11px',
  display: 'flex', alignItems: 'center', gap: 5,
  cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,.25)',
  fontSize: 12, fontFamily: 'inherit',
}

function csvEscape(v: string) { return `"${v.replace(/"/g, '""')}"` }

function downloadCsv(bills: Bill[]) {
  const headers = ['Bill Number', 'Title', 'Level', 'Stage', 'Introduced', 'Supporters', 'Blockers', 'Urgency', 'Policy Bias']
  const rows = bills.map(b => {
    const idx = b.name.indexOf(' — ')
    const num   = idx >= 0 ? b.name.slice(0, idx) : b.name
    const title = idx >= 0 ? b.name.slice(idx + 3) : ''
    return [num, title, b.level, String(b.stage), b.introduced, b.supporters, b.blockers, b.urgency, String(b.policy_bias)]
      .map(csvEscape).join(',')
  })
  const csv = [headers.join(','), ...rows].join('\n')
  const d = new Date()
  const date = `${String(d.getDate()).padStart(2, '0')}-${d.toLocaleDateString('en-US', { month: 'short' })}-${String(d.getFullYear()).slice(2)}`
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = `enacted-${date}.csv`; a.click()
  URL.revokeObjectURL(url)
}

export default function EnactedLegislation() {
  const navigate = useNavigate()
  const { bills, loading, error } = useBills(['MI', 'US'])
  const [active, setActive] = useState<ActiveFilters>(DEFAULT_FILTERS)
  const [session, setSession] = useState('last-5-years')
  const [copied, setCopied] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const theme = localStorage.getItem('wsp-theme') ?? 'dark'
    document.documentElement.setAttribute('data-theme', theme)
    document.documentElement.setAttribute('data-page', 'enacted')
    return () => {
      document.documentElement.removeAttribute('data-theme')
      document.documentElement.removeAttribute('data-page')
    }
  }, [])

  function handleFilterChange(group: keyof ActiveFilters, value: string) {
    if (group === 'timing') return
    setActive(prev => ({ ...prev, [group]: value }))
  }

  function handleDownloadHtml(bills: Bill[]) {
    const d = new Date()
    const today = d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    const html = generateHtml(bills, 'Enacted', today)
    const blob = new Blob([html], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    const DD = String(d.getDate()).padStart(2, '0')
    const Mon = d.toLocaleDateString('en-US', { month: 'short' })
    const YY = String(d.getFullYear()).slice(2)
    a.download = `Enacted_Legislation_${DD}_${Mon}_${YY}.html`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function handleCopyLink() {
    const url = new URL(window.location.href)
    url.search = ''
    Object.entries(active).forEach(([k, v]) => {
      if (v && v !== 'all' && v !== '' && v !== 'enacted') url.searchParams.set(k, v)
    })
    if (session !== 'last-5-years') url.searchParams.set('session', session)
    await navigator.clipboard.writeText(url.toString())
    setCopied(true)
    setTimeout(() => setCopied(false), 1400)
  }

  const [lo, hi] = sessionRange(session)

  const filtered = filterBills(bills, active).filter(b => {
    const d = getEnactedDate(b)
    if (!d) return true
    return d >= lo && d <= hi
  })

  return (
    <div style={{ paddingTop: 44 }}>
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '8px 12px',
        background: 'var(--color-bg-secondary)',
        borderBottom: '1px solid var(--color-border-light)',
      }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => navigate('/')}
            style={{
              background: '#00B050', color: '#fff',
              border: 'none', borderRadius: 20, padding: '5px 9px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,.25)',
            }}
            aria-label="Go to home"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
              <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
          </button>
          <button onClick={() => handleDownloadHtml(filtered)} style={BTN} aria-label="Download HTML">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Download HTML
          </button>
          <button onClick={() => downloadCsv(filtered)} style={BTN} aria-label="Download CSV">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="3" y="3" width="18" height="18" rx="2"/>
              <line x1="3" y1="9" x2="21" y2="9"/>
              <line x1="3" y1="15" x2="21" y2="15"/>
              <line x1="9" y1="3" x2="9" y2="21"/>
            </svg>
            Download CSV
          </button>
          <button onClick={handleCopyLink} style={BTN} aria-label="Copy share link">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
            </svg>
            {copied ? 'Copied!' : 'Copy Link'}
          </button>
        </div>
        <ThemeToggle />
      </div>

      <div className="page-header">
        <div className="page-header-row">
          <div>
            <div style={{
              fontFamily: "'Quicksand', sans-serif",
              fontSize: 26, fontWeight: 700, color: '#00B050',
              lineHeight: 1.2, marginBottom: 4,
            }}>
              Enacted Legislation
            </div>
            <div className="page-subtitle">
              Bills that have passed all stages and been signed into law
            </div>
          </div>
          <div className="search-wrap">
            <input
              ref={searchRef}
              type="search"
              className="search-input"
              placeholder="Search bills…"
              autoComplete="off"
              onChange={e => handleFilterChange('search', e.target.value.trim())}
            />
          </div>
        </div>
      </div>

      <div className="filter-groups">
        <div className="filter-group">
          <span className="fg-label">Session</span>
          <div className="chips">
            {SESSIONS.map(s => (
              <button
                key={s.value}
                className={'chip' + (session === s.value ? ' active' : '')}
                onClick={() => setSession(s.value)}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <FilterGroups active={active} onChange={handleFilterChange} hideTiming />

      {loading && <div className="loading">Loading bills…</div>}
      {error   && <div className="empty">Error loading bills: {error}</div>}

      {!loading && !error && (
        <>
          <div className="count">
            {filtered.length} item{filtered.length !== 1 ? 's' : ''} shown
          </div>
          {filtered.length === 0
            ? <div className="empty">No enacted bills match these filters.</div>
            : filtered.map(b => <BillCard key={b.id} bill={b} />)
          }
        </>
      )}
    </div>
  )
}
