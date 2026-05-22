import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { ActiveFilters, Bill } from '../types/bill'
import { useBills } from '../hooks/useBills'
import { filterBills } from '../lib/billUtils'
import { getIdsByStatus } from '../lib/billStatus'
import { supabase } from '../lib/supabase'
import { generateHtml } from '../lib/generateHtml'
import Header from '../components/Header'
import FilterGroups from '../components/FilterGroups'
import BillCard from '../components/BillCard'
import ThemeToggle from '../components/ThemeToggle'

const DEFAULT_FILTERS: ActiveFilters = {
  level: 'all', timing: 'all', impact: 'all', issue: 'all',
  policy: 'all', office: 'all', city: 'all', committee: 'all', search: '',
}

const BTN: React.CSSProperties = {
  background: '#4F4262', color: '#fff',
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
  a.href = url; a.download = `lawtracker-${date}.csv`; a.click()
  URL.revokeObjectURL(url)
}


export default function TrackerPage() {
  const navigate = useNavigate()
  const { bills: rawBills, loading, error } = useBills(['MI', 'US'])
  const [bills, setBills] = useState<Bill[]>(rawBills)
  const [active, setActive]       = useState<ActiveFilters>(DEFAULT_FILTERS)

  useEffect(() => setBills(rawBills), [rawBills])

  function handleBillUpdate(updated: Bill) {
    setBills(prev => prev.map(b => b.id === updated.id ? updated : b))
  }
  const [busy, setBusy]           = useState(false)
  const [copied, setCopied]       = useState(false)
  const [archivedIds, setArchivedIds] = useState<Set<number>>(() => getIdsByStatus('archive'))

  useEffect(() => {
    function sync() { setArchivedIds(getIdsByStatus('archive')) }
    window.addEventListener('bill-status-change', sync)
    return () => window.removeEventListener('bill-status-change', sync)
  }, [])

  useEffect(() => {
    const theme = localStorage.getItem('wsp-theme') ?? 'dark'
    document.documentElement.setAttribute('data-theme', theme)
    document.documentElement.setAttribute('data-page', 'tracker')
    return () => {
      document.documentElement.removeAttribute('data-theme')
      document.documentElement.removeAttribute('data-page')
    }
  }, [])

  function handleFilterChange(group: keyof ActiveFilters, value: string) {
    setActive(prev => ({ ...prev, [group]: value }))
  }

  async function fetchAllBills(): Promise<Bill[]> {
    const { data } = await supabase.from('bills').select('*').in('state', ['MI', 'US']).order('id')
    return (data as Bill[]) ?? []
  }

  async function handleDownload() {
    setBusy(true)
    try {
      const d = new Date()
      const today = d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
      const allBills = await fetchAllBills()
      const html = generateHtml(allBills, 'Michigan', today)
      const blob = new Blob([html], { type: 'text/html' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const DD = String(d.getDate()).padStart(2, '0')
      const Mon = d.toLocaleDateString('en-US', { month: 'short' })
      const YY = String(d.getFullYear()).slice(2)
      a.download = `Michigan_National_Tracker_${DD}_${Mon}_${YY}.html`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setBusy(false)
    }
  }

  async function handleCopyLink() {
    const url = new URL(window.location.href)
    url.search = ''
    Object.entries(active).forEach(([k, v]) => {
      if (v && v !== 'all' && v !== '') url.searchParams.set(k, v)
    })
    await navigator.clipboard.writeText(url.toString())
    setCopied(true)
    setTimeout(() => setCopied(false), 1400)
  }

  const visibleBills = bills.filter(b => !archivedIds.has(b.id))
  const filtered = filterBills(visibleBills, active)
  const committees = [...new Set(
    visibleBills
      .filter(b => b.level === 'federal' || b.level === 'michigan')
      .map(b => b.committee)
      .filter((c): c is string => !!c)
  )].sort()

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
              background: '#4F4262', color: '#fff',
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
          <button
            onClick={handleDownload}
            disabled={busy}
            style={{ ...BTN, opacity: busy ? 0.7 : 1, cursor: busy ? 'default' : 'pointer' }}
            aria-label="Download HTML"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            {busy ? 'Fetching…' : 'Download HTML'}
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
          <a
            href="https://www.legislature.mi.gov/bills"
            target="_blank"
            rel="noopener noreferrer"
            style={{ ...BTN, textDecoration: 'none' }}
            aria-label="Michigan Legislature bills"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
              <polyline points="15 3 21 3 21 9"/>
              <line x1="10" y1="14" x2="21" y2="3"/>
            </svg>
            MI Legislature
          </a>
          <a
            href="https://www.congress.gov/browse-legislation/bills"
            target="_blank"
            rel="noopener noreferrer"
            style={{ ...BTN, textDecoration: 'none' }}
            aria-label="Congress.gov bills"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
              <polyline points="15 3 21 3 21 9"/>
              <line x1="10" y1="14" x2="21" y2="3"/>
            </svg>
            Congress.gov
          </a>
        </div>
        <ThemeToggle />
      </div>

      <Header
        stateName="Michigan"
        bills={visibleBills}
        onSearch={q => handleFilterChange('search', q)}
      />

      <FilterGroups active={active} onChange={handleFilterChange} committees={committees} />

      {loading && <div className="loading">Loading bills…</div>}
      {error   && <div className="empty">Error loading bills: {error}</div>}

      {!loading && !error && (
        <>
          <div className="count">
            {filtered.length} item{filtered.length !== 1 ? 's' : ''} shown
          </div>
          {filtered.length === 0
            ? <div className="empty">No bills match these filters.</div>
            : filtered.map(b => <BillCard key={b.id} bill={b} onUpdate={handleBillUpdate} />)
          }
        </>
      )}
    </div>
  )
}
